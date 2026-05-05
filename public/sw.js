const CACHE = 'bms-ts-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(e.request);
    if (hit) return hit;
    try {
      const res = await fetch(e.request);
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        cache.put(e.request, res.clone());
      }
      return res;
    } catch {
      return hit || Response.error();
    }
  })());
});
