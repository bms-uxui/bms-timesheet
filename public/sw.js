const CACHE = 'bms-ts-v2';
const SHARED_CACHE = 'bms-ts-shared';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Handle PWA Share Target: when the user shares a PDF to this app, the OS
// POSTs it to <scope>/share. We stash the file in a cache and redirect to
// the app with a flag so the main thread can pick it up on load.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isShare = e.request.method === 'POST' && url.pathname.endsWith('/share');
  if (isShare) {
    e.respondWith((async () => {
      try {
        const form = await e.request.formData();
        const file = form.get('file');
        if (file && typeof file !== 'string') {
          const cache = await caches.open(SHARED_CACHE);
          const headers = new Headers({
            'Content-Type': file.type || 'application/pdf',
            'X-Filename': encodeURIComponent(file.name || 'shared.pdf'),
          });
          await cache.put('shared-file', new Response(file, { headers }));
        }
      } catch {}
      const home = new URL('./?shared=1', self.location).href;
      return Response.redirect(home, 303);
    })());
    return;
  }

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
