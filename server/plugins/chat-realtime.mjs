/**
 * @module server/plugins/chat-realtime
 * Phase 4 Batch A — REST-first realtime foundations for community chat.
 * This is the polling half of the plan's "WS with REST polling fallback";
 * the WS upgrade is a separate ticket (needs user-approved deps).
 *
 * User Track routes (all requireAuth; channel membership is open to any
 * authed user — NO ownership scoping here):
 * - GET  /api/v1/channels/:id/messages?since=<ISO>&limit=  (poll-friendly delta fetch)
 * - POST /api/v1/channels/:id/read                         (persist lastReadAt in settings payload)
 * - GET  /api/v1/channels/:id/unread                       (count newer than lastReadAt)
 * - POST /api/v1/channels/:id/presence {status}            (ephemeral, in-memory)
 * - POST /api/v1/channels/:id/typing {isTyping}            (ephemeral, in-memory)
 * - GET  /api/v1/channels/:id/presence                     ({online:[userIds], typing:[userIds]})
 *
 * Presence/typing are ephemeral (in-memory Maps with 30s TTL sweep, no DB).
 * Read receipts reuse the existing `settings` payload (key `channelRead.<channelId>`)
 * via the profile-settings pattern — no schema change, no migration.
 * None of these endpoints write audit logs: reads are never audited, and
 * presence/typing/read-receipts are high-frequency ephemeral state (same class
 * as PUT /me/settings, which is also unaudited). Message POSTs stay audited
 * via the entities plugin; admin mutations are audited in admin-chat.mjs.
 */
import { eq, and, gt, asc, sql } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';
import { messages, settings, appConfig } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.mjs';

export const PRESENCE_TTL_MS = 30_000;
export const READ_KEY_PREFIX = 'channelRead.';
export const MUTE_KEY_PREFIX = 'muted.';
export const MODERATED_PLACEHOLDER = '[removed by moderator]';

// ── Ephemeral stores: channelId -> Map(userId -> { status, ts } | ts) ──
const presenceStore = new Map();
const typingStore = new Map();

/** @internal exposed for tests */
export function __resetPresenceForTests() {
  presenceStore.clear();
  typingStore.clear();
}

/**
 * Pure: given [[userId, tsMs], ...] entries, return userIds with age <= ttlMs.
 * @param {Array<[string, number]>} entries
 * @param {number} [now]
 * @param {number} [ttlMs]
 */
export function aliveUserIds(entries, now = Date.now(), ttlMs = PRESENCE_TTL_MS) {
  return entries.filter(([, ts]) => now - ts <= ttlMs).map(([userId]) => userId);
}

/**
 * Pure-ish: drop expired entries from a Map in place; returns the same Map.
 * Values may be raw ts numbers or { status, ts } objects.
 */
export function sweepExpired(innerMap, now = Date.now(), ttlMs = PRESENCE_TTL_MS) {
  for (const [userId, val] of innerMap) {
    const ts = val !== null && typeof val === 'object' ? val.ts : val;
    if (typeof ts !== 'number' || now - ts > ttlMs) innerMap.delete(userId);
  }
  return innerMap;
}

/** Pure: is userId in a mute-list value ({ userIds: [...] } or raw array)? */
export function isUserMuted(muteValue, userId) {
  if (!muteValue || !userId) return false;
  const list = Array.isArray(muteValue) ? muteValue : muteValue.userIds;
  return Array.isArray(list) && list.includes(userId);
}

export function muteKey(channelId) {
  return `${MUTE_KEY_PREFIX}${channelId}`;
}

export function readKey(channelId) {
  return `${READ_KEY_PREFIX}${channelId}`;
}

async function getMuteList(channelId) {
  const rows = await getDb()
    .select()
    .from(appConfig)
    .where(eq(appConfig.key, muteKey(channelId)))
    .limit(1);
  return rows[0]?.value ?? { userIds: [] };
}

/**
 * Mute check for the messages POST path. Degrades OPEN when the DB is
 * unavailable (fail-open: never block chat on an infra outage).
 */
export async function isMutedInChannel(channelId, userId) {
  if (!channelId || !userId) return false;
  try {
    return isUserMuted(await getMuteList(channelId), userId);
  } catch {
    return false;
  }
}

function channelMaps(channelId) {
  if (!presenceStore.has(channelId)) presenceStore.set(channelId, new Map());
  if (!typingStore.has(channelId)) typingStore.set(channelId, new Map());
  return { p: presenceStore.get(channelId), t: typingStore.get(channelId) };
}

export default async function chatRealtimePlugin(app) {
  app.addHook('preHandler', requireAuth);

  // ── GET /api/v1/channels/:id/messages — poll-friendly delta fetch ──
  app.get('/api/v1/channels/:id/messages', async (req, reply) => {
    const db = getDb();
    const { since, limit = '50' } = req.query ?? {};
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const conds = [eq(messages.channelId, req.params.id)];
    if (since) {
      const d = new Date(since);
      if (Number.isNaN(d.getTime())) {
        return reply.code(400).send({ error: 'Invalid since timestamp.' });
      }
      conds.push(gt(messages.createdAt, d));
    }
    const rows = await db
      .select()
      .from(messages)
      .where(and(...conds))
      .orderBy(asc(messages.createdAt))
      .limit(limitNum);
    return reply.send({ channelId: req.params.id, messages: rows });
  });

  // ── POST /api/v1/channels/:id/read — persist lastReadAt ──────────
  app.post('/api/v1/channels/:id/read', async (req, reply) => {
    const db = getDb();
    const key = readKey(req.params.id);
    const stamp = new Date().toISOString();
    const rows = await db.select().from(settings).where(eq(settings.userId, req.user.id)).limit(1);
    if (rows.length) {
      await db
        .update(settings)
        .set({ payload: { ...rows[0].payload, [key]: stamp }, updatedAt: new Date() })
        .where(eq(settings.userId, req.user.id));
    } else {
      await db.insert(settings).values({ userId: req.user.id, payload: { [key]: stamp } });
    }
    return reply.send({ ok: true, channelId: req.params.id, lastReadAt: stamp });
  });

  // ── GET /api/v1/channels/:id/unread — count newer than lastReadAt ─
  app.get('/api/v1/channels/:id/unread', async (req, reply) => {
    const db = getDb();
    const srows = await db.select().from(settings).where(eq(settings.userId, req.user.id)).limit(1);
    const lastReadAt = srows[0]?.payload?.[readKey(req.params.id)] ?? null;
    const conds = [eq(messages.channelId, req.params.id)];
    if (lastReadAt) conds.push(gt(messages.createdAt, new Date(lastReadAt)));
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(messages)
      .where(and(...conds));
    return reply.send({ channelId: req.params.id, unread: count, lastReadAt });
  });

  // ── POST /api/v1/channels/:id/presence {status} ──────────────────
  app.post('/api/v1/channels/:id/presence', async (req, reply) => {
    const { status = 'online' } = req.body ?? {};
    if (!['online', 'away', 'offline'].includes(status)) {
      return reply.code(400).send({ error: 'Invalid status.' });
    }
    const { p } = channelMaps(req.params.id);
    if (status === 'offline') p.delete(req.user.id);
    else p.set(req.user.id, { status, ts: Date.now() });
    return reply.send({ ok: true });
  });

  // ── POST /api/v1/channels/:id/typing {isTyping} ──────────────────
  app.post('/api/v1/channels/:id/typing', async (req, reply) => {
    const { isTyping = false } = req.body ?? {};
    const { t } = channelMaps(req.params.id);
    if (isTyping) t.set(req.user.id, Date.now());
    else t.delete(req.user.id);
    return reply.send({ ok: true });
  });

  // ── GET /api/v1/channels/:id/presence ────────────────────────────
  app.get('/api/v1/channels/:id/presence', async (req, reply) => {
    const { p, t } = channelMaps(req.params.id);
    const now = Date.now();
    sweepExpired(p, now);
    sweepExpired(t, now);
    return reply.send({
      channelId: req.params.id,
      online: [...p.keys()],
      typing: [...t.keys()],
    });
  });
}
