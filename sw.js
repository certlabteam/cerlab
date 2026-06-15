/* CertLab — PWA 설치 활성화용 최소 서비스워커.
   캐시를 전혀 사용하지 않는다(fetch를 네트워크로 그대로 흘려보냄).
   → 크롬의 PWA 설치 조건(fetch 핸들러 있는 SW)을 충족시켜 "홈 화면에 추가" 원터치 설치를 가능하게 하면서,
     아무것도 캐시하지 않으므로 과거의 '옛 파일이 캐시에 남는' 사고가 원천적으로 발생하지 않는다. */
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
// fetch 핸들러는 존재하지만 respondWith를 호출하지 않음 → 브라우저 기본 동작(네트워크)으로 처리, 캐시 개입 0
self.addEventListener('fetch', function(e){ /* 캐시 안 함: 네트워크 직행 */ });
