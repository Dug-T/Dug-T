// WallyMan World offline support: cache the game files so it plays without a connection.
const CACHE = 'wallyman-world-v3';
const FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "js/font.js", "js/audio.js", "js/sprites.js", "js/wally.js", "js/levels.js", "js/online-config.js", "js/game.js", "js/maker.js", "js/extra.js", "js/batche.js", "js/batchf.js", "js/batchf2.js", "js/batchg.js", "js/batchh.js", "js/batchh2.js", "js/batchh3.js", "js/batchi.js", "js/batchi2.js", "assets/doug-portrait.png", "assets/gothchick-portrait.png", "assets/wallyman-portrait.png"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // network first so updates arrive straight away, falling back to the cache when offline
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
