/**
 * @module server/plugins/admin-users
 * Admin Users CRUD — /admin/v1/users/*
 * Full CRUD: list+search, inspect, suspend/unsuspend, reset password, soft-delete,
 * override subscriptionTier. Every mutation is audit-logged.
 */
import { eq, like, or, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';
import { users, profiles } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.mjs';
import { writeAuditLog } from '../lib/audit.mjs';
import { hashPassword } from '../lib/crypto.mjs';

const ADMIN_ROLES = ['super_admin', 'admin'];

export default async function adminUsersPlugin(app) {
  // All /admin/v1/users routes require admin role
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole(...ADMIN_ROLES));

  // ── GET /admin/v1/users — list + search ─────────────────────────
  app.get('/admin/v1/users', async (req, reply) => {
    const db = getDb();
    const { q, status, role, page = '1', limit = '20' } = req.query ?? {};
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = db.select().from(users);
    const conditions = [];

    if (q) {
      conditions.push(or(like(users.email, `%${q}%`)));
    }
    if (status && ['active', 'suspended', 'deleted'].includes(status)) {
      conditions.push(eq(users.status, status));
    }
    if (role && ['user', 'moderator', 'admin', 'super_admin'].includes(role)) {
      conditions.push(eq(users.role, role));
    }

    if (conditions.length) {
      query = query.where(and(...conditions));
    }

    const rows = await query.orderBy(desc(users.createdAt)).limit(limitNum).offset(offset);
    const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(users);

    return reply.send({
      users: rows.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        suspendedReason: u.suspendedReason,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
      total: count,
      page: pageNum,
      limit: limitNum,
    });
  });

  // ── GET /admin/v1/users/:id — inspect ──────────────────────────
  app.get('/admin/v1/users/:id', async (req, reply) => {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: 'User not found.' });

    const u = rows[0];
    const profRows = await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1);
    const profile = profRows[0] ?? null;

    return reply.send({
      user: {
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        suspendedReason: u.suspendedReason,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      },
      profile: profile
        ? {
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            bio: profile.bio,
            subscriptionTier: profile.subscriptionTier,
          }
        : null,
    });
  });

  // ── PATCH /admin/v1/users/:id/suspend ──────────────────────────
  app.patch('/admin/v1/users/:id/suspend', async (req, reply) => {
    const db = getDb();
    const { reason } = req.body ?? {};
    const rows = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: 'User not found.' });

    const before = rows[0];
    if (before.status === 'deleted') {
      return reply.code(400).send({ error: 'Cannot modify a deleted user.' });
    }

    await db
      .update(users)
      .set({ status: 'suspended', suspendedReason: reason ?? null, updatedAt: new Date() })
      .where(eq(users.id, req.params.id));

    await writeAuditLog({
      actorId: req.user.id,
      action: 'user.suspend',
      entityType: 'user',
      entityId: req.params.id,
      before: { status: before.status, suspendedReason: before.suspendedReason },
      after: { status: 'suspended', suspendedReason: reason ?? null },
      ip: req.ip,
    });

    return reply.send({ ok: true });
  });

  // ── PATCH /admin/v1/users/:id/unsuspend ────────────────────────
  app.patch('/admin/v1/users/:id/unsuspend', async (req, reply) => {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: 'User not found.' });

    const before = rows[0];
    await db
      .update(users)
      .set({ status: 'active', suspendedReason: null, updatedAt: new Date() })
      .where(eq(users.id, req.params.id));

    await writeAuditLog({
      actorId: req.user.id,
      action: 'user.unsuspend',
      entityType: 'user',
      entityId: req.params.id,
      before: { status: before.status, suspendedReason: before.suspendedReason },
      after: { status: 'active', suspendedReason: null },
      ip: req.ip,
    });

    return reply.send({ ok: true });
  });

  // ── POST /admin/v1/users/:id/reset-password ────────────────────
  app.post('/admin/v1/users/:id/reset-password', async (req, reply) => {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: 'User not found.' });

    const newPassword = 'admin-reset-' + Date.now().toString(36);
    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, req.params.id));

    await writeAuditLog({
      actorId: req.user.id,
      action: 'user.reset_password',
      entityType: 'user',
      entityId: req.params.id,
      before: null,
      after: { passwordReset: true },
      ip: req.ip,
    });

    return reply.send({ ok: true, _dev_new_password: newPassword });
  });

  // ── PATCH /admin/v1/users/:id/subscription-tier ────────────────
  app.patch('/admin/v1/users/:id/subscription-tier', async (req, reply) => {
    const db = getDb();
    const { tier } = req.body ?? {};
    if (!['free', 'pro', 'pro_plus'].includes(tier)) {
      return reply.code(400).send({ error: 'Invalid tier. Must be free, pro, or pro_plus.' });
    }

    const rows = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: 'User not found.' });

    // Upsert profile
    const profRows = await db.select().from(profiles).where(eq(profiles.userId, req.params.id)).limit(1);
    const before = profRows[0]?.subscriptionTier ?? 'free';

    if (profRows.length) {
      await db
        .update(profiles)
        .set({ subscriptionTier: tier, updatedAt: new Date() })
        .where(eq(profiles.userId, req.params.id));
    } else {
      await db.insert(profiles).values({ userId: req.params.id, subscriptionTier: tier });
    }

    await writeAuditLog({
      actorId: req.user.id,
      action: 'user.subscription_override',
      entityType: 'user',
      entityId: req.params.id,
      before: { subscriptionTier: before },
      after: { subscriptionTier: tier },
      ip: req.ip,
    });

    return reply.send({ ok: true });
  });

  // ── PATCH /admin/v1/users/:id/soft-delete ──────────────────────
  app.patch('/admin/v1/users/:id/soft-delete', async (req, reply) => {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: 'User not found.' });

    const before = rows[0];
    if (before.role === 'super_admin') {
      return reply.code(403).send({ error: 'Cannot soft-delete a super_admin.' });
    }

    await db
      .update(users)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(users.id, req.params.id));

    await writeAuditLog({
      actorId: req.user.id,
      action: 'user.soft_delete',
      entityType: 'user',
      entityId: req.params.id,
      before: { status: before.status },
      after: { status: 'deleted' },
      ip: req.ip,
    });

    return reply.send({ ok: true });
  });
}
