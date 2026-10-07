/**
 * @module lib/offline-cache
 * Single offline-cache abstraction for all browser persistence.
 * All localStorage access in the app MUST go through this module —
 * nothing else reads localStorage directly (plan.md Phase 3 acceptance).
 * Queue entries, cached payloads, and flags all live under one prefix.
 */

const PREFIX = 'llos.';
export const QUEUE_KEY = 'pendingSyncQueue';

function storage() {
  if (typeof localStorage === 'undefined') {
    // Minimal in-memory fallback (tests / SSR)
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)); },
      removeItem: (k) => { mem.delete(k); },
    };
  }
  return localStorage;
}

export function cacheGet(key, fallback = null) {
  try {
    const raw = storage().getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

export function cacheSet(key, value) {
  storage().setItem(PREFIX + key, JSON.stringify(value));
}

export function cacheRemove(key) {
  storage().removeItem(PREFIX + key);
}

// ── Raw-key helpers (legacy unprefixed keys, routed here so no module
// touches localStorage directly) ───────────────────────────────────
export function rawGet(key) {
  try { return storage().getItem(key); } catch { return null; }
}

export function rawSet(key, val) {
  storage().setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
}

export function rawRemove(key) {
  storage().removeItem(key);
}
export function getSyncQueue() {
  // Back-compat: also read the legacy unprefixed key once, then migrate.
  try {
    const legacy = storage().getItem(QUEUE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      storage().removeItem(QUEUE_KEY);
      if (Array.isArray(parsed) && parsed.length) cacheSet(QUEUE_KEY, parsed);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch { /* ignore */ }
  const q = cacheGet(QUEUE_KEY, []);
  return Array.isArray(q) ? q : [];
}

export function setSyncQueue(queue) {
  cacheSet(QUEUE_KEY, queue);
}

export function enqueueSyncOp(entry) {
  const q = getSyncQueue();
  q.push({ ...entry, timestamp: Date.now(), retries: 0 });
  setSyncQueue(q);
}
