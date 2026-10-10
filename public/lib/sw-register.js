/* LocalLife OS service-worker registration (classic script, no modules/inline). */
(function () {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {
      /* silent fail: app works fully without the service worker */
    });
  });
})();
