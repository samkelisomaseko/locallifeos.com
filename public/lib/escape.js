/**
 * LLOS shared HTML escaping (feature 30 — client XSS hardening).
 *
 * Classic script: no import/export. Loaded via <script src> BEFORE consumer
 * modules (see index.html). Exposes window.LLOS_Escape.
 *
 * Rule: every interpolation of stored/user/AI-derived strings into
 * innerHTML/insertAdjacentHTML goes through escapeHtml (attributes through
 * escapeAttr). Static markup is untouched. Escaping ONLY neutralizes markup;
 * plain text renders identically (no visual change for benign content).
 */
(function () {
  'use strict';
  var ENTITY_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  };

  // Text context: escapes & < > " ' and backtick.
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"'`]/g, function (ch) {
      return ENTITY_MAP[ch];
    });
  }

  // Double-quoted attribute context: same full entity map (backtick included,
  // so values cannot break out of the attribute under any quoting style).
  function escapeAttr(value) {
    return String(value == null ? '' : value).replace(/[&<>"'`]/g, function (ch) {
      return ENTITY_MAP[ch];
    });
  }

  // Single-quoted JS string nested inside a double-quoted HTML attribute
  // (e.g. onclick="fn('USER')"). Backslash-escape FIRST, then HTML-escape the
  // result with escapeAttr: `\'` survives as `\&#39;`, which HTML-decodes back
  // to `\'` — a valid JS escape. Never interpolate raw user data into inline
  // handlers; prefer data-attributes + delegation for new code.
  function escapeJsSingle(value) {
    return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  // URL allow-list for src/href interpolated from data. Anything not
  // http(s)/data:image/blob is dropped (empty string) — kills
  // javascript:/event-handler URLs even before escaping.
  var SAFE_MEDIA_RE = /^(https?:\/\/|data:image\/|blob:)/i;
  function safeMediaUrl(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!SAFE_MEDIA_RE.test(raw)) return '';
    return escapeAttr(raw);
  }

  window.LLOS_Escape = {
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    escapeJsSingle: escapeJsSingle,
    safeMediaUrl: safeMediaUrl
  };
})();
