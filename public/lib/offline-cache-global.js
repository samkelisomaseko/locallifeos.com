/**
 * @file lib/offline-cache-global.js
 * Classic-script companion to lib/offline-cache.js.
 *
 * lib/offline-cache.js is an ES module (`export ...`) so it CANNOT be loaded
 * via the plain `<script src>` tags used by public/modules/*.js (a top-level
 * `import` there would throw and break the app). This file exposes the exact
 * same synchronous helpers on `window.LLOS_Cache` so legacy classic scripts
 * route ALL persistence through the offline-cache abstraction instead of
 * touching localStorage directly.
 *
 * Semantics are 100% identical to direct localStorage access: same keys
 * (legacy unprefixed keys via raw*), same string/JSON value formats — only
 * the access path changes. No key renames, no value-format changes.
 *
 * Method map: rawGet(k) === localStorage.getItem(k),
 *             rawSet(k,v) === localStorage.setItem(k,v),
 *             rawRemove(k) === localStorage.removeItem(k),
 *             clearAll() === localStorage.clear().
 *
 * Load order: MUST load before any public/modules/* script (see index.html).
 */
(function () {
  'use strict';

  var PREFIX = 'llos.';
  var QUEUE_KEY = 'pendingSyncQueue';

  function store() {
    if (typeof localStorage === 'undefined') {
      // Minimal in-memory fallback (tests / SSR) — mirrors offline-cache.js.
      var mem = new Map();
      return {
        getItem: function (k) { return mem.has(k) ? mem.get(k) : null; },
        setItem: function (k, v) { mem.set(k, String(v)); },
        removeItem: function (k) { mem.delete(k); },
        clear: function () { mem.clear(); }
      };
    }
    return localStorage;
  }

  // ── Raw-key helpers (legacy unprefixed keys) ──────────────────────────
  function rawGet(key) {
    try { return store().getItem(key); } catch (e) { return null; }
  }

  function rawSet(key, val) {
    try { store().setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); } catch (e) { /* ignore */ }
  }

  function rawRemove(key) {
    try { store().removeItem(key); } catch (e) { /* ignore */ }
  }

  // Semantically identical to localStorage.clear(): removes every key
  // (both legacy unprefixed keys and llos.* prefixed offline-cache keys).
  function clearAll() {
    try { store().clear(); } catch (e) { /* ignore */ }
  }

  // ── Prefixed JSON helpers (mirror lib/offline-cache.js) ───────────────
  function cacheGet(key, fallback) {
    if (fallback === undefined) fallback = null;
    try {
      var raw = store().getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function cacheSet(key, value) {
    try { store().setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function cacheRemove(key) {
    try { store().removeItem(PREFIX + key); } catch (e) { /* ignore */ }
  }

  function getSyncQueue() {
    try {
      var legacy = store().getItem(QUEUE_KEY);
      if (legacy) {
        var parsed = JSON.parse(legacy);
        store().removeItem(QUEUE_KEY);
        if (Array.isArray(parsed) && parsed.length) cacheSet(QUEUE_KEY, parsed);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) { /* ignore */ }
    var q = cacheGet(QUEUE_KEY, []);
    return Array.isArray(q) ? q : [];
  }

  function setSyncQueue(queue) {
    cacheSet(QUEUE_KEY, queue);
  }

  function enqueueSyncOp(entry) {
    var q = getSyncQueue();
    var op = {};
    for (var k in entry) { if (Object.prototype.hasOwnProperty.call(entry, k)) op[k] = entry[k]; }
    op.timestamp = Date.now();
    op.retries = 0;
    q.push(op);
    setSyncQueue(q);
  }

  window.LLOS_Cache = {
    QUEUE_KEY: QUEUE_KEY,
    rawGet: rawGet,
    rawSet: rawSet,
    rawRemove: rawRemove,
    clearAll: clearAll,
    cacheGet: cacheGet,
    cacheSet: cacheSet,
    cacheRemove: cacheRemove,
    getSyncQueue: getSyncQueue,
    setSyncQueue: setSyncQueue,
    enqueueSyncOp: enqueueSyncOp
  };
})();
