const CACHE = 'runit-v5';
const CORE = [
  './app.html',
  './runit-home.html',
  './list.html',
  './detail.html',
  './stats.html',
  './pb.html',
  './input.html',
  './styles.css',
  './transitions.js',
  './ptr.js',
  './grained.js',
  './manifest.json',
  './icon.svg',
  './data/splits.js',
  './data/zones.js',
  './data/store.js',
];

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  // chrome-extension://, data:, blob: 등 비-HTTP 스킴은 SW 처리 안 함 (Cache.put 실패)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const path = url.pathname;

  // HTML / CSS / JS — 네트워크 우선 (pull-to-refresh 시 항상 최신 버전 보장)
  const isFresh =
    path.endsWith('.html') ||
    path.endsWith('.css')  ||
    path.endsWith('.js')   ||
    path === '/' ||
    path.endsWith('/');

  if (isFresh) {
    // no-cache: 브라우저 HTTP 캐시를 서버와 재검증(If-Modified-Since) 후 사용.
    // 서버에 변경이 있으면 새로 받고, 없으면 304로 빠르게 재사용.
    const freshReq = new Request(e.request, { cache: 'no-cache' });
    e.respondWith(
      fetch(freshReq)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 나머지 (SVG, 폰트, 이미지 등) — 캐시 우선, 네트워크 폴백
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
