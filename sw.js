/* CertLab — service worker 비활성화(자기 해제) 버전.
   과거에 SW를 캐싱하던 사용자를 위해, 이 SW는 모든 캐시를 지우고
   스스로 등록 해제한다. (캐시로 옛 파일이 남는 문제 방지) */
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    try {
      const clients = await self.clients.matchAll();
      clients.forEach(c => c.navigate(c.url));
    } catch (_) {}
  })());
});
/* fetch 핸들러 없음 → 모든 요청은 네트워크로 직행(캐시 개입 안 함) */
