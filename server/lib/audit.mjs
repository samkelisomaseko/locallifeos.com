/**
 * @module server/lib/audit
 * Write an entry to the `audit_logs` table.
 * Every admin mutation MUST call this before returning.
 */
import { getDb } from '../db/client.mjs';
import { auditLogs } from '../db/schema.js';

/**
 * @param {object} params
 * @param {string|null} params.actorId   — userId of the admin performing the action
 * @param {string}      params.action    — e.g. 'user.suspend', 'flag.update'
 * @param {string}      params.entityType — e.g. 'user', 'feature_flag'
 * @param {string}      params.entityId  — id/pk of the affected entity
 * @param {object|null} params.before    — state before mutation (null for creates)
 * @param {object|null} params.after     — state after mutation (null for deletes)
 * @param {string|null} params.ip        — request IP
 */
export async function writeAuditLog({ actorId, action, entityType, entityId, before, after, ip }) {
  try {
    await getDb()
      .insert(auditLogs)
      .values({
        actorId: actorId ?? null,
        action,
        entityType,
        entityId: String(entityId),
        before: before ?? null,
        after: after ?? null,
        ip: ip ?? null,
      });
  } catch (err) {
    // Audit log failure must NOT block the mutation — log and continue.
    console.error('[audit] failed to write audit log:', err.message);
  }
}
