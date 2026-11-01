// まんどぅレジ オフライン用 Service Worker
// index.html などを更新して公開するときは、下の CACHE の番号を上げてください（v2 → v3）。
const CACHE = 'mandu-pos-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// インストール時は、ブラウザの一時保存（HTTPキャッシュ）を使わず、最新のファイルを取りに行く
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ASSETS.map((u) =>
        fetch(new Request(u, { cache: 'reload' })).then((r) => {
          if (!r.ok) throw new Error('fetch failed: ' + u);
          return c.put(u, r);
        })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// キャッシュがあればそれを即返し、裏で最新版を取得して次回に備える（圏外でも起動できる）
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    const net = fetch(new Request(req.url, { cache: 'no-cache' }))
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req.url, copy));
        }
        return res;
      })
      .catch(() => hit);
    if (hit) {
      e.waitUntil(net.catch(() => {}));
      return hit;
    }
    return net;
  })());
});
