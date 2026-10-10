/**
 * @module server/plugins/ai-proxy
 * Phase 4 Batch B — User Track AI proxy (Dual-Track, same step as Admin AI console).
 *
 * - POST /api/v1/ai/chat (requireAuth): { messages: [{ role, content }], context? }.
 *   Validation: non-empty array, roles in [user,assistant,system], non-empty
 *   content, cap 20 messages / 4000 chars each → 400 otherwise.
 * - Provider: OpenAI-compatible chat-completions via native fetch (no new deps),
 *   15s timeout. Base URL / model / key from AI_PROVIDER_URL / AI_MODEL /
 *   AI_API_KEY. System prompt built from the caller's settings payload
 *   (`aiPersonality` + `aiLearningPreferences` keys when present).
 * - Fallback (core guarantee): no key, provider error, or timeout →
 *   deterministic keyword-based heuristic reply with `"fallback": true`.
 *   NEVER 500s just because AI is unconfigured — AI always answers.
 * - Quota: per-user daily cap (default 100) tracked in an in-memory Map.
 *   Resets on restart — DB-backed quotas come with the live-DB ticket
 *   (persisted counters in app_config, no schema change). 429 when exceeded
 *   with a `fallbackAvailable: true` hint (the client ships its own offline
 *   heuristic engine, so it can keep answering locally).
 *
 * No audit logging here: chat turns are high-frequency user state, same class
 * as PUT /me/settings and presence/typing (unaudited). Admin mutations live
 * in admin-ai.mjs and ARE audited.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';
import { settings } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.mjs';

export const MAX_MESSAGES = 20;
export const MAX_CONTENT_CHARS = 4000;
export const AI_ROLES = ['user', 'assistant', 'system'];
export const DEFAULT_DAILY_LIMIT = 100;
export const PROVIDER_TIMEOUT_MS = 15_000;

// ── In-memory quota + runtime config (resets on restart; see header) ──
// Key: `${userId}:${yyyy-mm-dd}` → request count for that UTC day.
const quotaStore = new Map();
let runtimeDailyLimit = DEFAULT_DAILY_LIMIT;
let runtimeFreeTierFallback = true;

/** @internal exposed for tests */
export function __resetQuotaForTests() {
  quotaStore.clear();
  runtimeDailyLimit = DEFAULT_DAILY_LIMIT;
  runtimeFreeTierFallback = true;
}

/** @internal exposed for tests */
export function __setDailyLimitForTests(n) {
  runtimeDailyLimit = n;
}

export function getAiRuntimeConfig() {
  return { dailyPerUser: runtimeDailyLimit, freeTierFallback: runtimeFreeTierFallback };
}

/** Runtime override (admin PATCH writes here + best-effort app_config). */
export function setRuntimeConfig({ dailyPerUser, freeTierFallback } = {}) {
  if (dailyPerUser !== undefined) runtimeDailyLimit = dailyPerUser;
  if (freeTierFallback !== undefined) runtimeFreeTierFallback = freeTierFallback;
}

export function getQuotaStats() {
  const users = new Set();
  for (const key of quotaStore.keys()) users.add(key.split(':')[0]);
  return {
    dailyPerUser: runtimeDailyLimit,
    freeTierFallback: runtimeFreeTierFallback,
    inMemoryUsers: users.size,
    entries: quotaStore.size,
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Pure: quota state for a user against a limit (defaults to runtime limit).
 * Does NOT consume — call consumeQuota after the request is accepted.
 */
export function checkQuota(userId, limit = runtimeDailyLimit) {
  const used = quotaStore.get(`${userId}:${todayKey()}`) ?? 0;
  return { allowed: used < limit, used, remaining: Math.max(0, limit - used), limit };
}

/** Record one billable AI request for the user; returns the new used count. */
export function consumeQuota(userId) {
  const key = `${userId}:${todayKey()}`;
  const used = (quotaStore.get(key) ?? 0) + 1;
  quotaStore.set(key, used);
  return used;
}

/** Pure: validate the chat body. Returns { ok, errors }. */
export function validateAiChatBody(body) {
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, errors: ['messages must be a non-empty array.'] };
  }
  const errors = [];
  if (messages.length > MAX_MESSAGES) {
    errors.push(`messages must contain at most ${MAX_MESSAGES} entries.`);
  }
  messages.forEach((m, i) => {
    if (!m || typeof m !== 'object') {
      errors.push(`messages[${i}] must be an object.`);
      return;
    }
    if (!AI_ROLES.includes(m.role)) {
      errors.push(`messages[${i}].role must be one of: ${AI_ROLES.join(', ')}.`);
    }
    if (typeof m.content !== 'string' || m.content.trim().length === 0) {
      errors.push(`messages[${i}].content must be a non-empty string.`);
    } else if (m.content.length > MAX_CONTENT_CHARS) {
      errors.push(`messages[${i}].content must be at most ${MAX_CONTENT_CHARS} characters.`);
    }
  });
  return { ok: errors.length === 0, errors };
}

/** Pure: system prompt, optionally personalized from the settings payload. */
export function buildSystemPrompt(payload = {}) {
  const parts = ['You are the LocalLife OS assistant: concise, practical, and kind.'];
  const personality = typeof payload.aiPersonality === 'string' ? payload.aiPersonality.trim() : '';
  const prefs = typeof payload.aiLearningPreferences === 'string' ? payload.aiLearningPreferences.trim() : '';
  if (personality) parts.push(`User personality preference: ${personality.slice(0, 500)}`);
  if (prefs) parts.push(`User learning preferences: ${prefs.slice(0, 500)}`);
  return parts.join('\n');
}

/**
 * Pure + deterministic: heuristic fallback reply. Keyword branches for
 * greeting / tasks / mood / weather, otherwise echoes the last user message.
 */
export function heuristicReply(messages) {
  const last = [...messages].reverse().find((m) => m && m.role === 'user')?.content ?? '';
  const text = String(last).toLowerCase();
  if (/(^|\b)(hello|hi|hey|good (morning|afternoon|evening))\b/.test(text)) {
    return 'Hello! I am running in offline mode right now, but I can still help with tasks, habits, and moods. What would you like to do?';
  }
  if (/\b(task|todo|remind|habit|streak)\b/.test(text)) {
    return 'Got it — I noted that for your tasks and habits. I am in offline mode, so open the Tasks tab to add it and I will pick it up when the AI service is back.';
  }
  if (/\b(sad|anxious|stressed|worried|down|depress|angry|happy|great|excited|grateful)\b/.test(text)) {
    return 'Thanks for sharing how you feel — that matters. I am in offline mode, so consider logging it in the Mood tab; small notes now make better insights later.';
  }
  if (/\b(weather|rain|sunny|forecast|temperature|storm)\b/.test(text)) {
    return 'I cannot reach live weather data in offline mode — please check the Weather section directly for the latest forecast.';
  }
  const snippet = last.length > 200 ? `${last.slice(0, 200)}…` : last;
  return `You said: "${snippet}". I am running in offline heuristic mode right now (AI provider unreachable), but I heard you — try asking about tasks, mood, or weather.`;
}

/**
 * Provider-or-fallback resolution. NEVER throws for missing/unreachable AI:
 * no key, network error, non-2xx, timeout, or empty reply → heuristic.
 * Response shape: { reply, fallback, model | 'heuristic', usage? }.
 */
export async function resolveAiReply({ messages, settingsPayload = {} }) {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = (process.env.AI_PROVIDER_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.AI_MODEL ?? 'gpt-4o-mini';
  if (!apiKey) {
    return { reply: heuristicReply(messages), fallback: true, model: 'heuristic' };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: buildSystemPrompt(settingsPayload) }, ...messages],
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`provider status ${res.status}`);
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('empty provider reply');
      const out = { reply, fallback: false, model };
      if (data?.usage) out.usage = data.usage;
      return out;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { reply: heuristicReply(messages), fallback: true, model: 'heuristic' };
  }
}

export default async function aiProxyPlugin(app) {
  app.addHook('preHandler', requireAuth);

  // ── POST /api/v1/ai/chat ─────────────────────────────────────────
  app.post('/api/v1/ai/chat', async (req, reply) => {
    const check = validateAiChatBody(req.body);
    if (!check.ok) {
      return reply.code(400).send({ error: check.errors[0], errors: check.errors });
    }
    const quota = checkQuota(req.user.id);
    if (!quota.allowed) {
      return reply.code(429).send({
        error: 'Daily AI quota exceeded. Try again tomorrow.',
        fallbackAvailable: true,
        used: quota.used,
        limit: quota.limit,
      });
    }
    consumeQuota(req.user.id);

    // Personalize from settings payload; degrade gracefully without DB.
    let payload = {};
    try {
      const rows = await getDb()
        .select()
        .from(settings)
        .where(eq(settings.userId, req.user.id))
        .limit(1);
      payload = rows[0]?.payload ?? {};
    } catch {
      payload = {};
    }

    const result = await resolveAiReply({ messages: req.body.messages, settingsPayload: payload });
    return reply.send(result);
  });
}
