/**
 * @module server/plugins/entities
 * Generic CRUD scaffold for all §5 entities.
 * Each entity gets: GET /api/v1/:entity, GET /api/v1/:entity/:id,
 * POST /api/v1/:entity, PUT /api/v1/:entity/:id, DELETE /api/v1/:entity/:id
 * All writes are audit-logged. Ownership enforced via middleware.
 */
import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { scopeToUser } from '../middleware/ownership.mjs';
import { writeAuditLog } from '../lib/audit.mjs';
import { validateEntity } from '../lib/validation.mjs';

const ENTITY_TABLES = {
  tasks: () => import('../db/schema.js').then(m => m.tasks),
  habits: () => import('../db/schema.js').then(m => m.habits),
  moods: () => import('../db/schema.js').then(m => m.moods),
  sleep: () => import('../db/schema.js').then(m => m.sleep),
  places: () => import('../db/schema.js').then(m => m.places),
  deals: () => import('../db/schema.js').then(m => m.deals),
  channels: () => import('../db/schema.js').then(m => m.channels),
  messages: () => import('../db/schema.js').then(m => m.messages),
  bulletins: () => import('../db/schema.js').then(m => m.bulletins),
  notifications: () => import('../db/schema.js').then(m => m.notifications),
  trustedContacts: () => import('../db/schema.js').then(m => m.trustedContacts),
  gamification: () => import('../db/schema.js').then(m => m.gamification),
  applets: () => import('../db/schema.js').then(m => m.applets),
  integratedApps: () => import('../db/schema.js').then(m => m.integratedApps),
};

const ENTITY_SINGULAR = {
  tasks: 'task', habits: 'habit', moods: 'mood', sleep: 'sleep',
  places: 'place', deals: 'deal', channels: 'channel', messages: 'message',
  bulletins: 'bulletin', notifications: 'notification', trustedContacts: 'trustedContact',
  gamification: 'gamification', applets: 'applet', integratedApps: 'integratedApp',
};

// Validation lives in server/lib/validation.mjs (JSON-Schema style, Batch B).

export default async function entitiesPlugin(app) {
  // ── Auth for all entity routes ─────────────────────────────────
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', scopeToUser());

  for (const [entityName, tableGetter] of Object.entries(ENTITY_TABLES)) {
    const table = await tableGetter();
    const basePath = `/api/v1/${entityName}`;

    // ── GET /api/v1/:entity — list ───────────────────────────────
    app.get(basePath, async (req, reply) => {
      const db = getDb();
      const { page = '1', limit = '50' } = req.query ?? {};
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      let query = db.select().from(table);
      if (req.ownershipScope) {
        query = query.where(eq(table.userId, req.ownershipScope));
      }
      const rows = await query.orderBy(desc(table.updatedAt)).limit(limitNum).offset(offset);

      const countQuery = db.select({ count: sql`count(*)::int` }).from(table);
      const [{ count }] = req.ownershipScope
        ? await countQuery.where(eq(table.userId, req.ownershipScope))
        : await countQuery;

      return reply.send({ [entityName]: rows, total: count, page: pageNum, limit: limitNum });
    });

    // ── GET /api/v1/:entity/:id — get one ────────────────────────
    app.get(`${basePath}/:id`, async (req, reply) => {
      const db = getDb();
      const rows = await db.select().from(table).where(eq(table.id, req.params.id)).limit(1);
      if (!rows.length) return reply.code(404).send({ error: 'Not found.' });
      const item = rows[0];
      // Ownership check
      if (req.ownershipScope && item.userId && item.userId !== req.ownershipScope) {
        return reply.code(403).send({ error: 'Not your resource.' });
      }
      return reply.send({ [ENTITY_SINGULAR[entityName]]: item });
    });

    // ── POST /api/v1/:entity — create ────────────────────────────
    app.post(basePath, async (req, reply) => {
      const db = getDb();
      const body = req.body ?? {};
      const result = validateEntity(entityName, body);
      if (entityName !== 'gamification' && !result.ok) {
        return reply.code(400).send({ error: 'Validation failed.', details: result.errors });
      }
      const now = new Date();
      const record = {
        ...body,
        id: body.id || crypto.randomUUID(),
        userId: req.ownershipScope || req.user.id,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      const [created] = await db.insert(table).values(record).returning();
      await writeAuditLog({
        actorId: req.user.id,
        action: `${entityName}.create`,
        entityType: entityName,
        entityId: created.id,
        before: null,
        after: created,
        ip: req.ip,
      });
      return reply.code(201).send({ [ENTITY_SINGULAR[entityName]]: created });
    });

    // ── PUT /api/v1/:entity/:id — update (LWW) ──────────────────
    app.put(`${basePath}/:id`, async (req, reply) => {
      const db = getDb();
      const body = req.body ?? {};
      const rows = await db.select().from(table).where(eq(table.id, req.params.id)).limit(1);
      if (!rows.length) return reply.code(404).send({ error: 'Not found.' });

      const before = rows[0];
      if (req.ownershipScope && before.userId && before.userId !== req.ownershipScope) {
        return reply.code(403).send({ error: 'Not your resource.' });
      }

      // LWW: client updatedAt must be >= server updatedAt
      if (body.updatedAt && before.updatedAt) {
        const clientTime = new Date(body.updatedAt).getTime();
        const serverTime = new Date(before.updatedAt).getTime();
        if (clientTime < serverTime) {
          return reply.code(409).send({ error: 'Conflict: server has newer version.', serverVersion: before });
        }
      }

      const updates = { ...body, updatedAt: new Date(), version: (before.version || 0) + 1 };
      delete updates.id;
      delete updates.createdAt;
      delete updates.userId;

      const [updated] = await db.update(table).set(updates).where(eq(table.id, req.params.id)).returning();
      await writeAuditLog({
        actorId: req.user.id,
        action: `${entityName}.update`,
        entityType: entityName,
        entityId: req.params.id,
        before,
        after: updated,
        ip: req.ip,
      });
      return reply.send({ [ENTITY_SINGULAR[entityName]]: updated });
    });

    // ── DELETE /api/v1/:entity/:id — delete ──────────────────────
    app.delete(`${basePath}/:id`, async (req, reply) => {
      const db = getDb();
      const rows = await db.select().from(table).where(eq(table.id, req.params.id)).limit(1);
      if (!rows.length) return reply.code(404).send({ error: 'Not found.' });

      const before = rows[0];
      if (req.ownershipScope && before.userId && before.userId !== req.ownershipScope) {
        return reply.code(403).send({ error: 'Not your resource.' });
      }

      await db.delete(table).where(eq(table.id, req.params.id));
      await writeAuditLog({
        actorId: req.user.id,
        action: `${entityName}.delete`,
        entityType: entityName,
        entityId: req.params.id,
        before,
        after: null,
        ip: req.ip,
      });
      return reply.send({ ok: true });
    });
  }
}
