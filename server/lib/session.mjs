/**
 * @module server/lib/session
 * Create, read, and revoke sessions.  Works with the `sessions` table
 * (SHA-256 of the opaque token stored; raw token set as HttpOnly cookie).
 */
import { eq, and, gt, isNull } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';
import { sessions, users } from '../db/schema.js';
import {
  generateSessionToken,
  sha256,
  sessionExpiresAt,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from './crypto.mjs';

/**
 * Create a new session for the given user id.
 * Returns { token, cookieOptions } — caller sets the cookie.
 */
export async function createSession(userId, { ip, userAgent } = {}) {
  const token = generateSessionToken();
  const tokenHash = sha256(token);
  const expiresAt = sessionExpiresAt();

  await getDb()
    .insert(sessions)
    .values({ userId, tokenHash, ip, userAgent, expiresAt });

  return {
    token,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    },
  };
}

/**
 * Look up a valid (non-revoked, non-expired) session from the raw token.
 * Returns the session row joined with the user row, or null.
 */
export async function getSessionFromToken(token) {
  if (!token) return null;
  const tokenHash = sha256(token);
  const now = new Date();

  const rows = await getDb()
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      role: users.role,
      status: users.status,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, now),
        isNull(sessions.revokedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Revoke a single session (logout).
 */
export async function revokeSession(token) {
  if (!token) return;
  const tokenHash = sha256(token);
  await getDb()
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, tokenHash));
}

/**
 * Revoke ALL sessions for a user (logout-everywhere, password reset).
 */
export async function revokeAllSessions(userId) {
  await getDb()
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.userId, userId));
}

/**
 * Extract the raw session token from the Fastify request cookie header.
 */
export function extractToken(req) {
  return req.cookies?.[SESSION_COOKIE] ?? null;
}
