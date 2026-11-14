// WallyMan World offline support: cache the game files so it plays without a connection.
const CACHE = 'wallyman-world-v20';
const FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "js/font.js", "js/audio.js", "js/sprites.js", "js/wally.js", "js/levels.js", "js/online-config.js", "js/game.js", "js/maker.js", "js/extra.js", "js/batche.js", "js/batchf.js", "js/batchf2.js", "js/batchg.js", "js/batchh.js", "js/batchh2.js", "js/batchh3.js", "js/batchi.js", "js/batchi2.js", "js/batchj.js", "js/batchj2.js", "js/batchk.js", "js/batchk2.js", "js/batchl.js", "js/batchl2.js", "js/batchm.js", "js/batchm2.js", "js/batchn.js", "js/batchn2.js", "js/batchn3.js", "js/batcho.js", "js/batchp.js", "js/batchq.js", "js/batchr.js", "js/batchs.js", "js/batchs2.js", "js/batcht.js", "js/batcht2.js", "js/batcht3.js", "js/batchu.js", "js/batchu2.js", "js/batchv.js", "js/batchv2.js", "js/batchw.js", "assets/doug-portrait.png", "assets/gothchick-portrait.png", "assets/wallyman-portrait.png"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // network first (always checking the server for a newer copy) so updates arrive straight away,
  // falling back to the cache when offline
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((res) => { const copy = res.clone(); if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});
