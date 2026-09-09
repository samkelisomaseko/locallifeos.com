/**
 * @module lib/store
 * Local-first data layer: single Store interface with two implementations.
 * - LocalStore: IndexedDB-backed, instant reads, offline-capable
 * - ServerStore: REST-backed, write-through with offline queue
 *
 * Conflict policy: last-write-wins (updatedAt + server version).
 * Writes enqueue to pendingSyncQueue when offline; flush on reconnect.
 */

const DB_NAME = 'locallife-store';
const DB_VERSION = 1;

// ── Entity names (matches §5 data model) ────────────────────────
export const ENTITIES = [
  'tasks', 'habits', 'moods', 'sleep', 'places', 'deals',
  'channels', 'messages', 'bulletins', 'notifications',
  'trustedContacts', 'gamification', 'applets', 'integratedApps',
  'profile', 'settings',
];

// ── Pending sync queue ──────────────────────────────────────────
const QUEUE_KEY = 'pendingSyncQueue';

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch { return []; }
}

function setQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function enqueueSync(entity, action, id, data) {
  const queue = getQueue();
  queue.push({ entity, action, id, data, timestamp: Date.now(), retries: 0 });
  setQueue(queue);
}

// ── LocalStore (IndexedDB) ──────────────────────────────────────
class LocalStore {
  constructor() {
    this._db = null;
  }

  async _open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const entity of ENTITIES) {
          if (!db.objectStoreNames.contains(entity)) {
            const store = db.createObjectStore(entity, { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
            store.createIndex('userId', 'userId', { unique: false });
          }
        }
      };
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(entity) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(entity, 'readonly');
      const store = tx.objectStore(entity);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async get(entity, id) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(entity, 'readonly');
      const req = tx.objectStore(entity).get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async put(entity, record) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(entity, 'readwrite');
      tx.objectStore(entity).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(entity, id) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(entity, 'readwrite');
      tx.objectStore(entity).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(entity) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(entity, 'readwrite');
      tx.objectStore(entity).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async count(entity) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(entity, 'readonly');
      const req = tx.objectStore(entity).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

// ── ServerStore (REST) ──────────────────────────────────────────
const API_BASE = window.location.port === '5173'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : window.location.origin;

const RETRY_DELAYS = [2000, 5000, 10000];

class ServerStore {
  constructor() {
    this._local = new LocalStore();
  }

  async _fetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // Read: local first, background refresh from server
  async getAll(entity) {
    const local = await this._local.getAll(entity);
    // Background fetch (non-blocking)
    this._fetch(`/api/v1/${entity}`).then(async (serverData) => {
      const items = serverData[entity] || serverData || [];
      for (const item of items) {
        const existing = await this._local.get(entity, item.id);
        if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
          await this._local.put(entity, item);
        }
      }
    }).catch(() => {});
    return local;
  }

  async get(entity, id) {
    return this._local.get(entity, id);
  }

  // Write: optimistic local + enqueue server sync
  async put(entity, record) {
    const now = new Date().toISOString();
    const enriched = {
      ...record,
      updatedAt: record.updatedAt || now,
      createdAt: record.createdAt || now,
      _syncStatus: 'pending',
    };
    await this._local.put(entity, enriched);

    if (navigator.onLine) {
      try {
        const serverRecord = await this._fetch(`/api/v1/${entity}/${record.id}`, {
          method: 'PUT',
          body: JSON.stringify(enriched),
        });
        await this._local.put(entity, { ...serverRecord, _syncStatus: 'synced' });
        return serverRecord;
      } catch {
        enqueueSync(entity, 'put', record.id, enriched);
      }
    } else {
      enqueueSync(entity, 'put', record.id, enriched);
    }
    return enriched;
  }

  async post(entity, record) {
    const now = new Date().toISOString();
    const enriched = {
      ...record,
      id: record.id || crypto.randomUUID(),
      updatedAt: now,
      createdAt: now,
      _syncStatus: 'pending',
    };
    await this._local.put(entity, enriched);

    if (navigator.onLine) {
      try {
        const serverRecord = await this._fetch(`/api/v1/${entity}`, {
          method: 'POST',
          body: JSON.stringify(enriched),
        });
        await this._local.put(entity, { ...serverRecord, _syncStatus: 'synced' });
        return serverRecord;
      } catch {
        enqueueSync(entity, 'post', enriched.id, enriched);
      }
    } else {
      enqueueSync(entity, 'post', enriched.id, enriched);
    }
    return enriched;
  }

  async delete(entity, id) {
    await this._local.delete(entity, id);
    if (navigator.onLine) {
      try {
        await this._fetch(`/api/v1/${entity}/${id}`, { method: 'DELETE' });
      } catch {
        enqueueSync(entity, 'delete', id, null);
      }
    } else {
      enqueueSync(entity, 'delete', id, null);
    }
  }

  async count(entity) {
    return this._local.count(entity);
  }

  // ── Sync queue flush ──────────────────────────────────────────
  async flushQueue() {
    if (!navigator.onLine) return;
    const queue = getQueue();
    if (!queue.length) return;

    const remaining = [];
    for (const item of queue) {
      try {
        if (item.action === 'delete') {
          await this._fetch(`/api/v1/${item.entity}/${item.id}`, { method: 'DELETE' });
        } else {
          await this._fetch(`/api/v1/${item.entity}/${item.id || ''}`, {
            method: item.action === 'post' ? 'POST' : 'PUT',
            body: JSON.stringify(item.data),
          });
        }
        // Mark as synced locally
        if (item.data) {
          await this._local.put(item.entity, { ...item.data, _syncStatus: 'synced' });
        }
      } catch {
        item.retries = (item.retries || 0) + 1;
        if (item.retries < RETRY_DELAYS.length) {
          remaining.push(item);
        }
        // Drop after max retries
      }
    }
    setQueue(remaining);
  }
}

// ── Singleton ───────────────────────────────────────────────────
let _store = null;

export function getStore() {
  if (!_store) {
    _store = new ServerStore();
    // Flush queue on online
    window.addEventListener('online', () => _store.flushQueue());
    // Try flush on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') _store.flushQueue();
    });
  }
  return _store;
}

export { LocalStore, ServerStore };
