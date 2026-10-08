// オフライン用：同じサイトの GET を端末に置く（ネットが使えればそちらを優先し、だめなら置いた物を返す）
const CACHE = 'rp-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'cache' && Array.isArray(e.data.urls)) {
    e.waitUntil(caches.open(CACHE).then((c) => Promise.all(e.data.urls.map((u) => c.add(u).catch(() => undefined)))));
  }
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch {
      // Vary: Origin などで一致しないことがあるので、URL だけで探す
      const opt = { ignoreVary: true };
      const hit = (await c.match(req, opt)) || (await c.match(req.url, opt)) || (req.mode === 'navigate' ? await c.match('/', opt) : undefined);
      return hit || Response.error();
    }
  })());
});
