/**
 * @module server/plugins/admin-entities
 * Phase 3 Batch B — Admin CRUD + moderation per entity.
 * - GET /admin/v1/entities/:entity (list+search+filters by user/status)
 * - GET /admin/v1/entities/:entity/:id (inspect + override view)
 * - PATCH /admin/v1/entities/:entity/:id (override edit, before/after audit)
 * - POST /admin/v1/entities/:entity/:id/suspend|restore
 * - POST /admin/v1/deals/:id/approve|reject (review queue)
 * Every mutation is audit-logged with before/after state.
 */
import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';
import { requireAuth, requireRole } from '../middleware/auth.mjs';
import { writeAuditLog } from '../lib/audit.mjs';
import * as schema from '../db/schema.js';

const ADMIN_ROLES = ['super_admin', 'admin', 'moderator'];

const ENTITY_TABLES = {
  tasks: () => schema.tasks,
  habits: () => schema.habits,
  moods: () => schema.moods,
  sleep: () => schema.sleep,
  places: () => schema.places,
  deals: () => schema.deals,
  channels: () => schema.channels,
  messages: () => schema.messages,
  bulletins: () => schema.bulletins,
  notifications: () => schema.notifications,
  trustedContacts: () => schema.trustedContacts,
  gamification: () => schema.gamification,
  applets: () => schema.applets,
  integratedApps: () => schema.integratedApps,
};

// Entities whose rows carry a status-like field moderators can flip.
const STATUS_FIELD = { deals: 'status', bulletins: 'status' };

function tableFor(entity) {
  const getter = ENTITY_TABLES[entity];
  return getter ? getter() : null;
}

export default async function adminEntitiesPlugin(app) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole(...ADMIN_ROLES));

  // ── List + search + filters ────────────────────────────────────
  app.get('/admin/v1/entities/:entity', async (req, reply) => {
    const table = tableFor(req.params.entity);
    if (!table) return reply.code(404).send({ error: 'Unknown entity.' });
    const db = getDb();
    const { q, userId, status, page = '1', limit = '20' } = req.query ?? {};
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const rows = await db.select().from(table).orderBy(desc(table.updatedAt)).limit(limitNum).offset((pageNum - 1) * limitNum);
    let filtered = rows;
    if (userId && 'userId' in table) filtered = filtered.filter((r) => r.userId === userId);
    if (status && STATUS_FIELD[req.params.entity]) {
      filtered = filtered.filter((r) => r[STATUS_FIELD[req.params.entity]] === status);
    }
    if (q) {
      const needle = String(q).toLowerCase();
      filtered = filtered.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
    }
    const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(table);
    return reply.send({ entity: req.params.entity, rows: filtered, total: count, page: pageNum, limit: limitNum });
  });

  // ── Inspect one ────────────────────────────────────────────────
  app.get('/admin/v1/entities/:entity/:id', async (req, reply) => {
    const table = tableFor(req.params.entity);
    if (!table) return reply.code(404).send({ error: 'Unknown entity.' });
    const db = getDb();
    const rows = await db.select().from(table).where(eq(table.id, req.params.id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: 'Not found.' });
    return reply.send({ entity: req.params.entity, record: rows[0] });
  });

  // ── Override edit (any field except id/createdAt) ──────────────
  app.patch('/admin/v1/entities/:entity/:id', async (req, reply) => {
    const table = tableFor(req.params.entity);
    if (!table) return reply.code(404).send({ error: 'Unknown entity.' });
    const db = getDb();
    const rows = await db.select().from(table).where(eq(table.id, req.params.id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: 'Not found.' });
    const before = rows[0];
    const updates = { ...(req.body ?? {}) };
    delete updates.id;
    delete updates.createdAt;
    updates.updatedAt = new Date();
    if ('version' in table) updates.version = (before.version || 0) + 1;
    const [after] = await db.update(table).set(updates).where(eq(table.id, req.params.id)).returning();
    await writeAuditLog({
      actorId: req.user.id, action: `${req.params.entity}.admin_override`,
      entityType: req.params.entity, entityId: req.params.id,
      before, after, ip: req.ip,
    });
    return reply.send({ ok: true, record: after });
  });

  // ── Suspend / restore (status-bearing entities) ─────────────────
  for (const action of ['suspend', 'restore']) {
    app.post(`/admin/v1/entities/:entity/:id/${action}`, async (req, reply) => {
      const table = tableFor(req.params.entity);
      if (!table) return reply.code(404).send({ error: 'Unknown entity.' });
      const statusField = STATUS_FIELD[req.params.entity];
      if (!statusField) return reply.code(400).send({ error: 'Entity has no suspendable status.' });
      const db = getDb();
      const rows = await db.select().from(table).where(eq(table.id, req.params.id)).limit(1);
      if (!rows.length) return reply.code(404).send({ error: 'Not found.' });
      const before = rows[0];
      const next = action === 'suspend' ? 'suspended' : 'active';
      const [after] = await db.update(table).set({ [statusField]: next, updatedAt: new Date() }).where(eq(table.id, req.params.id)).returning();
      await writeAuditLog({
        actorId: req.user.id, action: `${req.params.entity}.${action}`,
        entityType: req.params.entity, entityId: req.params.id,
        before: { [statusField]: before[statusField] }, after: { [statusField]: next }, ip: req.ip,
      });
      return reply.send({ ok: true, record: after });
    });
  }

  // ── Deals review queue: approve / reject ────────────────────────
  for (const decision of ['approve', 'reject']) {
    app.post(`/admin/v1/deals/:id/${decision}`, async (req, reply) => {
      const db = getDb();
      const rows = await db.select().from(schema.deals).where(eq(schema.deals.id, req.params.id)).limit(1);
      if (!rows.length) return reply.code(404).send({ error: 'Deal not found.' });
      const before = rows[0];
      const next = decision === 'approve' ? 'active' : 'rejected';
      const [after] = await db.update(schema.deals).set({ status: next, updatedAt: new Date() }).where(eq(schema.deals.id, req.params.id)).returning();
      await writeAuditLog({
        actorId: req.user.id, action: `deal.${decision}`,
        entityType: 'deals', entityId: req.params.id,
        before: { status: before.status }, after: { status: next }, ip: req.ip,
      });
      return reply.send({ ok: true, record: after });
    });
  }

  // ── Sync/health + live counts ──────────────────────────────────
  app.get('/admin/v1/sync-health', async (_req, reply) => {
    const db = getDb();
    const counts = {};
    for (const [name, getter] of Object.entries(ENTITY_TABLES)) {
      try {
        const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(getter());
        counts[name] = count;
      } catch { counts[name] = -1; }
    }
    return reply.send({ entities: counts, syncQueueDepth: 0, note: 'Sync queue is client-side; depth reported by clients on flush.', uptimeSec: Math.round(process.uptime()) });
  });
}
