/**
 * @module server/plugins/admin-ai
 * Phase 4 Batch B — Admin Track AI console (Dual-Track, same step as User AI proxy).
 * Follows server/plugins/admin-chat.mjs conventions (requireAuth + requireRole,
 * writeAuditLog for admin mutations only).
 *
 * - GET    /admin/v1/ai/stats            (reads: super_admin/admin/moderator)
 * - GET    /admin/v1/ai/memory/:userId   (reads: super_admin/admin/moderator)
 * - DELETE /admin/v1/ai/memory/:userId   (mutations: super_admin/admin, audited)
 * - PATCH  /admin/v1/ai/config           (mutations: super_admin/admin, audited)
 *
 * Server-side AI memory lives in the existing `settings.payload` bag under
 * the `aiMemory` key (same pattern as Phase 4A `channelRead.<id>`) — no schema
 * change, no migration. Stats NEVER leak the provider key (boolean only).
 * Everything degrades open without DB: empty stats, 404 memory/config.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';
import { settings, appConfig } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.mjs';
import { writeAuditLog } from '../lib/audit.mjs';
import { getQuotaStats, getAiRuntimeConfig, setRuntimeConfig } from './ai-proxy.mjs';

export const READ_ROLES = ['super_admin', 'admin', 'moderator'];
export const MUTATE_ROLES = ['super_admin', 'admin'];
export const AI_MEMORY_KEY = 'aiMemory';
export const AI_CONFIG_KEYS = {
  dailyPerUser: 'ai.dailyPerUser',
  freeTierFallback: 'ai.freeTierFallback',
};

async function upsertAppConfig(key, value, description) {
  const db = getDb();
  const rows = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1);
  if (rows.length) {
    const [updated] = await db
      .update(appConfig)
      .set({ value, updatedAt: new Date() })
      .where(eq(appConfig.key, key))
      .returning();
    return { row: updated, created: false, before: rows[0].value };
  }
  const [created] = await db.insert(appConfig).values({ key, value, description }).returning();
  return { row: created, created: true, before: null };
}

export default async function adminAiPlugin(app) {
  app.addHook('preHandler', requireAuth);

  // ── GET /admin/v1/ai/stats — provider status (key NEVER leaked) + quota ──
  app.get('/admin/v1/ai/stats', { preHandler: requireRole(...READ_ROLES) }, async (_req, reply) => {
    const quotaUsage = getQuotaStats();
    return reply.send({
      providerConfigured: Boolean(process.env.AI_API_KEY),
      model: process.env.AI_MODEL ?? 'gpt-4o-mini',
      quotaUsage,
    });
  });

  // ── GET /admin/v1/ai/memory/:userId — server-side AI memory + prefs ──────
  app.get('/admin/v1/ai/memory/:userId', { preHandler: requireRole(...READ_ROLES) }, async (req, reply) => {
    try {
      const rows = await getDb()
        .select()
        .from(settings)
        .where(eq(settings.userId, req.params.userId))
        .limit(1);
      if (!rows.length) return reply.code(404).send({ error: 'No server-side memory for this user.' });
      const payload = rows[0].payload ?? {};
      return reply.send({
        userId: req.params.userId,
        memory: payload[AI_MEMORY_KEY] ?? [],
        personality: payload.aiPersonality ?? null,
        learningPreferences: payload.aiLearningPreferences ?? null,
      });
    } catch {
      // Degrade open without DB: report absence, never 500.
      return reply.code(404).send({ error: 'No server-side memory for this user.' });
    }
  });

  // ── DELETE /admin/v1/ai/memory/:userId — clear server memory (audited) ───
  app.delete(
    '/admin/v1/ai/memory/:userId',
    { preHandler: requireRole(...MUTATE_ROLES) },
    async (req, reply) => {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(settings)
          .where(eq(settings.userId, req.params.userId))
          .limit(1);
        if (!rows.length || rows[0].payload?.[AI_MEMORY_KEY] === undefined) {
          return reply.code(404).send({ error: 'No server-side memory for this user.' });
        }
        const before = { [AI_MEMORY_KEY]: rows[0].payload[AI_MEMORY_KEY] };
        const next = { ...rows[0].payload };
        delete next[AI_MEMORY_KEY];
        await db
          .update(settings)
          .set({ payload: next, updatedAt: new Date() })
          .where(eq(settings.userId, req.params.userId));
        await writeAuditLog({
          actorId: req.user.id,
          action: 'ai.memory_clear',
          entityType: 'settings',
          entityId: req.params.userId,
          before,
          after: { [AI_MEMORY_KEY]: [] },
          ip: req.ip,
        });
        return reply.send({ ok: true, userId: req.params.userId });
      } catch {
        return reply.code(404).send({ error: 'No server-side memory for this user.' });
      }
    },
  );

  // ── PATCH /admin/v1/ai/config — quota/flag tuning (audited) ──────────────
  app.patch('/admin/v1/ai/config', { preHandler: requireRole(...MUTATE_ROLES) }, async (req, reply) => {
    const { dailyPerUser, freeTierFallback } = req.body ?? {};
    if (dailyPerUser === undefined && freeTierFallback === undefined) {
      return reply.code(400).send({ error: 'dailyPerUser or freeTierFallback required.' });
    }
    if (dailyPerUser !== undefined && (!Number.isInteger(dailyPerUser) || dailyPerUser < 1)) {
      return reply.code(400).send({ error: 'dailyPerUser must be a positive integer.' });
    }
    if (freeTierFallback !== undefined && typeof freeTierFallback !== 'boolean') {
      return reply.code(400).send({ error: 'freeTierFallback must be a boolean.' });
    }

    const before = getAiRuntimeConfig();
    setRuntimeConfig({ dailyPerUser, freeTierFallback });
    const after = getAiRuntimeConfig();

    // Best-effort DB persist; degrade open when the DB is unavailable.
    const persisted = {};
    try {
      if (dailyPerUser !== undefined) {
        const r = await upsertAppConfig(
          AI_CONFIG_KEYS.dailyPerUser,
          { dailyPerUser },
          'Per-user daily AI chat quota',
        );
        persisted.dailyPerUser = r.created ? 'created' : 'updated';
      }
      if (freeTierFallback !== undefined) {
        const r = await upsertAppConfig(
          AI_CONFIG_KEYS.freeTierFallback,
          { freeTierFallback },
          'Whether heuristic fallback stays available on free tier',
        );
        persisted.freeTierFallback = r.created ? 'created' : 'updated';
      }
    } catch {
      persisted.note = 'database unavailable — runtime config applied in-memory only';
    }

    await writeAuditLog({
      actorId: req.user.id,
      action: 'ai.config_update',
      entityType: 'app_config',
      entityId: 'ai',
      before,
      after: { ...after, persisted },
      ip: req.ip,
    });
    return reply.send({ ok: true, config: after, persisted });
  });
}
