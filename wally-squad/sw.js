// Wally Squad service worker. Browsers (and GitHub Pages) like to keep old copies of the game files, which
// meant players kept seeing the previous version after an update. This asks the server for the newest copy
// of every game file first (a quick "has it changed?" check), and only falls back to the saved copy when
// the device is offline.
const CACHE = 'wally-squad';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // online play, fonts etc. go straight to the network
  e.respondWith((async () => {
    try {
      const res = req.mode === 'navigate'
        ? await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        : await fetch(req, { cache: 'no-cache' });
      if (res.ok && !url.search.includes('check=')) { const c = await caches.open(CACHE); c.put(req, res.clone()).catch(() => {}); }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      throw err;
    }
  })());
});
