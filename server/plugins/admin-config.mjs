/**
 * @module server/plugins/admin-config
 * Admin Config CRUD — /admin/v1/flags + /admin/v1/config
 * Feature flags (toggle) and app_config (jsonb). Every mutation is audit-logged.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';
import { featureFlags, appConfig } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.mjs';
import { writeAuditLog } from '../lib/audit.mjs';

const ADMIN_ROLES = ['super_admin', 'admin'];

export default async function adminConfigPlugin(app) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole(...ADMIN_ROLES));

  // ── GET /admin/v1/flags — list all feature flags ────────────────
  app.get('/admin/v1/flags', async (_req, reply) => {
    const rows = await getDb().select().from(featureFlags).orderBy(featureFlags.key);
    return reply.send({ flags: rows });
  });

  // ── PATCH /admin/v1/flags/:key — toggle or update a flag ───────
  app.patch('/admin/v1/flags/:key', async (req, reply) => {
    const db = getDb();
    const { key } = req.params;
    const { enabled, description } = req.body ?? {};

    const rows = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).limit(1);
    const before = rows[0] ?? null;

    if (!before) {
      // Create new flag
      const [created] = await db
        .insert(featureFlags)
        .values({ key, enabled: enabled ?? false, description: description ?? null })
        .returning();

      await writeAuditLog({
        actorId: req.user.id,
        action: 'flag.create',
        entityType: 'feature_flag',
        entityId: key,
        before: null,
        after: { enabled: created.enabled, description: created.description },
        ip: req.ip,
      });
      return reply.code(201).send({ flag: created });
    }

    // Update existing
    const updates = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (description !== undefined) updates.description = description;
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(featureFlags)
      .set(updates)
      .where(eq(featureFlags.key, key))
      .returning();

    await writeAuditLog({
      actorId: req.user.id,
      action: 'flag.update',
      entityType: 'feature_flag',
      entityId: key,
      before: { enabled: before.enabled, description: before.description },
      after: { enabled: updated.enabled, description: updated.description },
      ip: req.ip,
    });

    return reply.send({ flag: updated });
  });

  // ── GET /admin/v1/config — list all app_config entries ──────────
  app.get('/admin/v1/config', async (_req, reply) => {
    const rows = await getDb().select().from(appConfig).orderBy(appConfig.key);
    return reply.send({ config: rows });
  });

  // ── PATCH /admin/v1/config/:key — set a config value ────────────
  app.patch('/admin/v1/config/:key', async (req, reply) => {
    const db = getDb();
    const { key } = req.params;
    const { value, description } = req.body ?? {};

    if (value === undefined) {
      return reply.code(400).send({ error: 'value is required.' });
    }

    const rows = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1);
    const before = rows[0] ?? null;

    if (!before) {
      const [created] = await db
        .insert(appConfig)
        .values({ key, value, description: description ?? null })
        .returning();

      await writeAuditLog({
        actorId: req.user.id,
        action: 'config.create',
        entityType: 'app_config',
        entityId: key,
        before: null,
        after: { value: created.value, description: created.description },
        ip: req.ip,
      });
      return reply.code(201).send({ config: created });
    }

    const updates = { value };
    if (description !== undefined) updates.description = description;
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(appConfig)
      .set(updates)
      .where(eq(appConfig.key, key))
      .returning();

    await writeAuditLog({
      actorId: req.user.id,
      action: 'config.update',
      entityType: 'app_config',
      entityId: key,
      before: { value: before.value, description: before.description },
      after: { value: updated.value, description: updated.description },
      ip: req.ip,
    });

    return reply.send({ config: updated });
  });
}
