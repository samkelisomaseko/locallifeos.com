/**
 * @module lib/server-sync
 * Write-through sync helper: save to server API first, offline-cache as local copy.
 * All browser persistence routes through lib/offline-cache (no direct localStorage).
 */

function cache() {
  return import('./offline-cache.js');
}

const SYNC_API_BASE = (typeof window !== 'undefined' && window.location.port === '5173')
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : (typeof window !== 'undefined' ? window.location.origin : '');

async function serverSync(path, body) {
  try {
    const res = await fetch(`${SYNC_API_BASE}${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Server ${res.status}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save settings write-through: PUT /api/v1/me/settings + offline cache.
 */
async function saveSettingsWriteThrough(serverPayload, localPayload) {
  const { rawSet, rawRemove } = await cache();
  for (const [key, val] of Object.entries(localPayload)) {
    if (val === undefined || val === null) rawRemove(key);
    else rawSet(key, val);
  }
  serverSync('/api/v1/me/settings', { settings: serverPayload });
}

/**
 * Save profile write-through: PUT /api/v1/me/profile + offline cache.
 */
async function saveProfileWriteThrough(serverPayload, localPayload) {
  const { rawSet } = await cache();
  for (const [key, val] of Object.entries(localPayload)) rawSet(key, val);
  serverSync('/api/v1/me/profile', serverPayload);
}

if (typeof window !== 'undefined') {
  window.saveSettingsWriteThrough = saveSettingsWriteThrough;
  window.saveProfileWriteThrough = saveProfileWriteThrough;
}

export { saveSettingsWriteThrough, saveProfileWriteThrough };
