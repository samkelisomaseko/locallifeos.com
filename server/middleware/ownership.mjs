/**
 * @module server/middleware/ownership
 * Row-level ownership: every resource belongs to a user.
 * Attaches req.ownershipScope for downstream use.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';

/**
 * PreHandler: verify the authenticated user owns the resource.
 * @param {object} table - Drizzle table with userId column
 * @param {string} paramName - route param name for the resource id (default: 'id')
 */
export function requireOwnership(table, paramName = 'id') {
  return async (req, reply) => {
    if (!req.user) {
      reply.code(401).send({ error: 'Authentication required.' });
      return;
    }
    // Super admin bypasses ownership checks
    if (req.user.role === 'super_admin') return;

    const resourceId = req.params[paramName];
    if (!resourceId) return;

    const db = getDb();
    const rows = await db.select().from(table).where(eq(table.id, resourceId)).limit(1);
    if (!rows.length) {
      reply.code(404).send({ error: 'Resource not found.' });
      return;
    }
    if (rows[0].userId !== req.user.id) {
      reply.code(403).send({ error: 'Not your resource.' });
      return;
    }
  };
}

/**
 * PreHandler: attach userId filter to list queries.
 * Super admin sees all; regular users see only their own.
 */
export function scopeToUser() {
  return async (req, _reply) => {
    if (!req.user) return;
    req.ownershipScope = req.user.role === 'super_admin' ? null : req.user.id;
  };
}
