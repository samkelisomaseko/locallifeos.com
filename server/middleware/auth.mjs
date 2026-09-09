/**
 * @module server/middleware/auth
 * Fastify preHandler hooks: requireAuth, requireRole.
 * Attaches req.user = { id, role, status } on success.
 */
import { getSessionFromToken, extractToken } from '../lib/session.mjs';

/**
 * PreHandler: require a valid session.  Returns 401 if missing/invalid.
 * Sets req.user = { id, role, status }.
 */
export async function requireAuth(req, reply) {
  const token = extractToken(req);
  const sess = await getSessionFromToken(token);
  if (!sess) {
    reply.code(401).send({ error: 'Authentication required.' });
    return; // stops further handler execution
  }
  req.user = { id: sess.userId, role: sess.role, status: sess.status };
}

/**
 * PreHandler factory: require one of the listed roles.
 * Must be used AFTER requireAuth (depends on req.user).
 * @param  {...string} allowedRoles — e.g. 'admin', 'super_admin'
 */
export function requireRole(...allowedRoles) {
  return async (req, reply) => {
    if (!req.user) {
      reply.code(401).send({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      reply.code(403).send({ error: 'Insufficient permissions.' });
      return;
    }
  };
}
