/**
 * @module server/plugins/admin-chat
 * Phase 4 Batch A — Admin Track for community chat (Dual-Track, same build step).
 * Follows server/plugins/admin-entities.mjs conventions.
 * - DELETE /admin/v1/chat/messages/:id        (soft-hide + before/after audit)
 * - POST   /admin/v1/chat/channels/:id/mute   (body {userId} → app_config `muted.<channelId>`)
 * - POST   /admin/v1/chat/channels/:id/unmute (body {userId} → remove from that list)
 * Roles: super_admin / admin / moderator. Every mutation is audit-logged.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';
import { messages, appConfig } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.mjs';
import { writeAuditLog } from '../lib/audit.mjs';
import { muteKey, MODERATED_PLACEHOLDER } from './chat-realtime.mjs';

const ADMIN_ROLES = ['super_admin', 'admin', 'moderator'];

export default async function adminChatPlugin(app) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole(...ADMIN_ROLES));

  // ── Soft-hide a message ──────────────────────────────────────────
  app.delete('/admin/v1/chat/messages/:id', async (req, reply) => {
    const db = getDb();
    const rows = await db.select().from(messages).where(eq(messages.id, req.params.id)).limit(1);
    if (!rows.length) return reply.code(404).send({ error: 'Not found.' });
    const before = rows[0];
    const [after] = await db
      .update(messages)
      .set({
        content: MODERATED_PLACEHOLDER,
        updatedAt: new Date(),
        version: (before.version || 0) + 1,
      })
      .where(eq(messages.id, req.params.id))
      .returning();
    await writeAuditLog({
      actorId: req.user.id,
      action: 'chat.message_hide',
      entityType: 'messages',
      entityId: req.params.id,
      before: { content: before.content },
      after: { content: after.content },
      ip: req.ip,
    });
    return reply.send({ ok: true, message: after });
  });

  // ── Mute / unmute a user in a channel ────────────────────────────
  for (const action of ['mute', 'unmute']) {
    app.post(`/admin/v1/chat/channels/:id/${action}`, async (req, reply) => {
      const { userId } = req.body ?? {};
      if (!userId) return reply.code(400).send({ error: 'userId required.' });
      const db = getDb();
      const key = muteKey(req.params.id);
      const rows = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1);
      const current = rows[0]?.value?.userIds ?? [];
      const before = { muted: current };
      const next =
        action === 'mute'
          ? [...new Set([...current, userId])]
          : current.filter((u) => u !== userId);
      const after = { muted: next };
      if (rows.length) {
        await db
          .update(appConfig)
          .set({ value: { userIds: next }, updatedAt: new Date() })
          .where(eq(appConfig.key, key));
      } else {
        await db.insert(appConfig).values({
          key,
          value: { userIds: next },
          description: `Channel mute list for ${req.params.id}`,
        });
      }
      await writeAuditLog({
        actorId: req.user.id,
        action: `chat.channel_${action}`,
        entityType: 'channel',
        entityId: req.params.id,
        before,
        after,
        ip: req.ip,
      });
      return reply.send({ ok: true, channelId: req.params.id, muted: next });
    });
  }
}
