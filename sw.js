/* CertLab service worker — 설치 가능하게 하는 최소 SW.
   주의: index.html 등은 항상 최신을 받아야 하므로 network-first.
   (오프라인 완전 지원은 아님 — 데이터가 Firestore 실시간이라 의도적으로 가볍게) */
const CACHE = 'certlab-v1';
const ICONS = ['/icon-192.png','/icon-512.png','/icon-maskable-512.png','/apple-touch-icon.png','/manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ICONS).catch(()=>{})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 같은 출처 정적 아이콘만 캐시 우선, 나머지는 항상 네트워크
  if (url.origin === location.origin && ICONS.includes(url.pathname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }
  // 그 외(앱 코드/Firestore/API)는 네트워크 우선 — 최신 보장
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
