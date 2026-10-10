/* LocalLife OS service worker — vanilla app-shell cache (no build step). */
const CACHE = 'llos-v1';
const WEATHER_TTL_MS = 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/index.html', '/manifest.json'])).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isCrossOrigin(url) {
  return new URL(url).origin !== self.location.origin;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never intercept cross-origin traffic (e.g. Google Maps, CDNs).
  if (isCrossOrigin(request.url)) return;

  // Network-first with 60s runtime cache for the weather proxy.
  if (url.pathname === '/api/weather') {
    event.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => {
          const headers = new Headers(copy.headers);
          headers.set('x-llos-cached-at', String(Date.now()));
          copy.blob().then((body) => cache.put(request, new Response(body, { status: copy.status, headers })));
        });
        return res;
      }).catch(() =>
        caches.match(request).then((cached) => {
          if (cached && Date.now() - Number(cached.headers.get('x-llos-cached-at') || 0) < WEATHER_TTL_MS) return cached;
          return cached || Response.error();
        }),
      ),
    );
    return;
  }

  // Cache-first for same-origin static assets (app shell + hashed vite assets).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      });
    }),
  );
});
