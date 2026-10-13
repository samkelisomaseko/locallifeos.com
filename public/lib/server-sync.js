/**
 * @module lib/server-sync
 * Write-through sync helper: save to server API first, offline cache as local copy.
 * Classic script (no imports/exports) — all browser persistence routes through
 * window.LLOS_Cache (lib/offline-cache-global.js). No direct localStorage here.
 */

var SYNC_API_BASE = (typeof window !== 'undefined' && window.location.port === '5173')
  ? window.location.protocol + '//' + window.location.hostname + ':3001'
  : (typeof window !== 'undefined' ? window.location.origin : '');

function serverSync(path, body) {
  return fetch(SYNC_API_BASE + path, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(function (res) {
    if (!res.ok) throw new Error('Server ' + res.status);
    return true;
  }).catch(function () {
    return false;
  });
}

/**
 * Save settings write-through: PUT /api/v1/me/settings + offline cache.
 */
function saveSettingsWriteThrough(serverPayload, localPayload) {
  var cache = window.LLOS_Cache;
  for (var key in localPayload) {
    if (!Object.prototype.hasOwnProperty.call(localPayload, key)) continue;
    var val = localPayload[key];
    if (val === undefined || val === null) {
      if (cache) cache.rawRemove(key); else localStorage.removeItem(key);
    } else {
      if (cache) cache.rawSet(key, val); else localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    }
  }
  serverSync('/api/v1/me/settings', { settings: serverPayload });
}

/**
 * Save profile write-through: PUT /api/v1/me/profile + offline cache.
 */
function saveProfileWriteThrough(serverPayload, localPayload) {
  var cache = window.LLOS_Cache;
  for (var key in localPayload) {
    if (!Object.prototype.hasOwnProperty.call(localPayload, key)) continue;
    if (cache) cache.rawSet(key, localPayload[key]);
    else localStorage.setItem(key, typeof localPayload[key] === 'string' ? localPayload[key] : JSON.stringify(localPayload[key]));
  }
  serverSync('/api/v1/me/profile', serverPayload);
}

if (typeof window !== 'undefined') {
  window.saveSettingsWriteThrough = saveSettingsWriteThrough;
  window.saveProfileWriteThrough = saveProfileWriteThrough;
}
