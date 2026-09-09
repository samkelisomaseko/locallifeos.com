/**
 * @module server/plugins/auth
 * Fastify plugin — registers /api/v1/auth/* routes.
 * Signup, login, logout, session restore (GET /me), password reset (dev token).
 */
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';
import { users } from '../db/schema.js';
import { hashPassword, verifyPassword, SESSION_COOKIE } from '../lib/crypto.mjs';
import {
  createSession,
  getSessionFromToken,
  revokeSession,
  revokeAllSessions,
  extractToken,
} from '../lib/session.mjs';

/** Minimal email validation (ASCII only — good enough for Phase 2). */
function validEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export default async function authPlugin(app) {
  // ── POST /api/v1/auth/signup ────────────────────────────────────
  app.post('/api/v1/auth/signup', async (req, reply) => {
    const { email, password, name } = req.body ?? {};
    if (!validEmail(email) || typeof password !== 'string' || password.length < 8) {
      return reply.code(400).send({ error: 'Valid email and password (≥8 chars) required.' });
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      return reply.code(400).send({ error: 'Name is required.' });
    }

    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length) {
      return reply.code(409).send({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email: email.toLowerCase(), passwordHash })
      .returning({ id: users.id, email: users.email, role: users.role });

    // Create session
    const sess = await createSession(user.id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    reply.setCookie(SESSION_COOKIE, sess.token, sess.cookieOptions);
    return reply.code(201).send({
      user: { id: user.id, email: user.email, role: user.role },
    });
  });

  // ── POST /api/v1/auth/login ─────────────────────────────────────
  app.post('/api/v1/auth/login', async (req, reply) => {
    const { email, password } = req.body ?? {};
    if (!validEmail(email) || typeof password !== 'string') {
      return reply.code(400).send({ error: 'Email and password required.' });
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const user = rows[0];
    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials.' });
    }
    if (user.status === 'suspended') {
      return reply.code(403).send({ error: 'Account suspended.' });
    }
    if (user.status === 'deleted') {
      return reply.code(403).send({ error: 'Account not found.' });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: 'Invalid credentials.' });
    }

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const sess = await createSession(user.id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    reply.setCookie(SESSION_COOKIE, sess.token, sess.cookieOptions);
    return reply.send({
      user: { id: user.id, email: user.email, role: user.role },
    });
  });

  // ── POST /api/v1/auth/logout ────────────────────────────────────
  app.post('/api/v1/auth/logout', async (req, reply) => {
    const token = extractToken(req);
    await revokeSession(token);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.send({ ok: true });
  });

  // ── GET /api/v1/auth/me ─────────────────────────────────────────
  app.get('/api/v1/auth/me', async (req, reply) => {
    const token = extractToken(req);
    const sess = await getSessionFromToken(token);
    if (!sess) {
      return reply.code(401).send({ error: 'Not authenticated.' });
    }
    return reply.send({
      user: {
        id: sess.userId,
        role: sess.role,
        status: sess.status,
      },
    });
  });

  // ── POST /api/v1/auth/reset-password (dev: returns token inline) ──
  app.post('/api/v1/auth/reset-password', async (req, reply) => {
    const { email } = req.body ?? {};
    if (!validEmail(email)) {
      return reply.code(400).send({ error: 'Valid email required.' });
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!rows.length) {
      // Don't reveal whether the email exists
      return reply.send({ ok: true, message: 'If an account exists, a reset token has been generated.' });
    }

    const user = rows[0];
    const newPassword = 'reset-' + Date.now().toString(36);
    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
    await revokeAllSessions(user.id);

    // Dev mode: return token in response (production would send email)
    return reply.send({
      ok: true,
      message: 'If an account exists, a reset token has been generated.',
      _dev_token: newPassword, // Only in dev — remove for production email flow
    });
  });
}
