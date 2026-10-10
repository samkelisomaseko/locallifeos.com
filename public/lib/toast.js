/**
 * LocalLife OS — global toast notifications (classic script, no imports).
 * Defines the `showToast(message, type, durationMs, ...rest)` global that
 * ~170 call sites across public/modules/* already invoke. Contract honoured:
 *   - renders into the existing #toastNotification.toast-notification element
 *   - `.show` reveals it (existing CSS transition), `.ai-info-toast` variant
 *     for type "ai_info"; all other types use the default styling
 *   - message is assigned via textContent (XSS-safe by construction)
 *   - extra arguments are accepted and ignored (forward-compatible)
 *   - silent no-op when the element is absent (e.g. unit-test sandboxes
 *     without DOM, admin page) — never throws
 */
(function () {
  var hideTimer = null;
  var DEFAULT_DURATION_MS = 2500;

  function showToast(message, type, durationMs) {
    try {
      var doc = typeof document !== 'undefined' ? document : null;
      if (!doc || typeof doc.getElementById !== 'function') return;
      var el = doc.getElementById('toastNotification');
      if (!el) return;

      var text = message === null || message === undefined ? '' : String(message);
      // textContent where available; innerText fallback for ancient stubs.
      if ('textContent' in el) el.textContent = text;
      else if ('innerText' in el) el.innerText = text;
      else return;

      var cls = 'toast-notification show';
      if (type === 'ai_info') cls += ' ai-info-toast';
      if (typeof el.className === 'string') el.className = cls;
      else if (el.classList && typeof el.classList.add === 'function') {
        el.classList.add('toast-notification');
        el.classList.add('show');
        if (type === 'ai_info') el.classList.add('ai-info-toast');
      }

      var duration = Number(durationMs);
      if (!isFinite(duration) || duration <= 0) duration = DEFAULT_DURATION_MS;

      if (hideTimer !== null && typeof clearTimeout === 'function') {
        try { clearTimeout(hideTimer); } catch (e) { /* ignore */ }
        hideTimer = null;
      }
      var target = el;
      var base = 'toast-notification';
      if (typeof setTimeout === 'function') {
        hideTimer = setTimeout(function () {
          hideTimer = null;
          try {
            if (typeof target.className === 'string') {
              target.className = base + (type === 'ai_info' ? ' ai-info-toast' : '');
            } else if (target.classList && typeof target.classList.remove === 'function') {
              target.classList.remove('show');
            }
          } catch (e) { /* never throw from a timer */ }
        }, duration);
      }
    } catch (e) {
      /* toast must never break the caller */
    }
  }

  if (typeof window !== 'undefined') window.showToast = showToast;
  else if (typeof globalThis !== 'undefined') globalThis.showToast = showToast;
})();
