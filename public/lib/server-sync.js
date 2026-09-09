/**
 * @module lib/server-sync
 * Write-through sync helper: save to server API first, localStorage as offline cache.
 * Used by settings-deals.js for theme/profile/settings persistence.
 */
const SYNC_API_BASE = window.location.port === '5173'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : window.location.origin;

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
    // Server unavailable — localStorage cache is the fallback
    return false;
  }
}

/**
 * Save settings write-through: PUT /api/v1/me/settings + localStorage.
 * @param {object} serverPayload - goes to server (merged into settings.payload)
 * @param {object} localPayload - goes to localStorage keys
 */
function saveSettingsWriteThrough(serverPayload, localPayload) {
  // Always write localStorage immediately (offline-first)
  for (const [key, val] of Object.entries(localPayload)) {
    if (val === undefined || val === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    }
  }
  // Fire-and-forget server sync (non-blocking)
  serverSync('/api/v1/me/settings', { settings: serverPayload });
}

/**
 * Save profile write-through: PUT /api/v1/me/profile + localStorage.
 */
function saveProfileWriteThrough(serverPayload, localPayload) {
  for (const [key, val] of Object.entries(localPayload)) {
    localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
  }
  serverSync('/api/v1/me/profile', serverPayload);
}
