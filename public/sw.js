// Offline support. The page itself always comes from the network first (so a new version is
// picked up as soon as it's deployed), falling back to the cached copy offline. Built files
// under /assets/ are versioned by name: network first, cached for offline play.
const CACHE = 'gridiron-gm-v2';
const BASE = new URL('./', self.registration.scope).pathname;
const STATIC = [BASE, `${BASE}index.html`, `${BASE}manifest.json`];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

const fresh = (req) => fetch(req)
  .then(r => { if (r.ok) { const rc = r.clone(); caches.open(CACHE).then(c => c.put(req, rc)); } return r; })
  .catch(() => caches.match(req));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === BASE;
  if (isPage || url.pathname.includes('/assets/')) e.respondWith(fresh(e.request));
  else e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
