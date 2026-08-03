/* ===========================================================================
   scripts/seo-gen.mjs — CertLab SEO 정적 페이지 CLI 생성기
   실행: npm run seo:gen   (저장소 루트에서)

   admin.html의 'SEO 생성' 버튼과 **완전히 같은 로직**을 쓴다.
   생성 로직은 seo-core.js 단일 출처이며, 이 스크립트는 글루일 뿐이다.
   (admin은 zip으로 내려받고, 이쪽은 저장소에 직접 쓴다는 점만 다르다.)

   firebase config는 index.html/admin.html에 이미 공개된 웹 config를 재사용한다.
   banks·manifest read는 공개이고 App Check도 강제가 아니라 서비스계정 키가 필요 없다.
   =========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* seo-core.js — admin.html과 공유하는 생성 로직 단일 출처 */
const {
  SEO_SUBJ_OVERRIDE, seoRound, seoPage, seoHub, seoSitemap, seoRobots, seoLlms, seoReadAllBanks
} = require(path.join(ROOT, 'seo-core.js'));

/* index.html / admin-1-masters.js 와 동일한 공개 웹 config */
const firebaseConfig = {
  apiKey: "AIzaSyCSQlow8xzRsv0EMtIYJ6_WDRAFUECrw2Q",
  authDomain: "certlab-c3bcb.firebaseapp.com",
  projectId: "certlab-c3bcb",
  storageBucket: "certlab-c3bcb.firebasestorage.app",
  messagingSenderId: "698827699707",
  appId: "1:698827699707:web:b08d492f408ac444fa875e"
};

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, 'utf8');   // LF 그대로 (저장소의 기존 seo/ 파일과 동일)
}

async function main() {
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  console.log('Firestore 읽는 중…');
  const banks = await seoReadAllBanks(db);
  if (!banks.length) throw new Error('bank를 하나도 못 읽었습니다 (네트워크·권한 확인)');
  let qtot = 0;
  banks.forEach(b => qtot += ((b.data.questions || []).length));
  console.log('bank ' + banks.length + '개 · 문항 ' + qtot.toLocaleString() + '개. 페이지 생성 중…');

  const today = new Date().toISOString().slice(0, 10);
  const files = [];
  const SEO_LABELS = {};

  /* --- admin-3-qc.js seoGenerate() 와 동일한 순회 --- */
  for (const b of banks) {
    const data = b.data;
    const cert = data.cert, sid = data.subject;
    const subjName = b.subjName || SEO_SUBJ_OVERRIDE[sid] || data.name || sid;
    const qs = data.questions || [];
    const groups = {};
    for (const q of qs) { const r = seoRound(q.set) || '__none'; (groups[r] = groups[r] || []).push(q); }
    for (const r in groups) {
      const rr = (r === '__none') ? null : r;
      const pg = seoPage(cert, subjName, rr, sid, groups[r]);
      write('seo/' + pg.fname, pg.html);
      files.push(pg.fname);
      SEO_LABELS[pg.fname] = subjName;
    }
  }

  const urls = ['https://certlab.ai.kr/seo/index.html'].concat(files.map(f => 'https://certlab.ai.kr/seo/' + f));
  write('seo/index.html', seoHub(urls, SEO_LABELS));
  write('sitemap.xml', seoSitemap(urls, today));
  write('robots.txt', seoRobots());
  write('llms.txt', seoLlms(urls));

  console.log('');
  console.log('✅ 완료');
  console.log('  seo/*.html  : ' + files.length + '장 (+ 허브 index.html = ' + (files.length + 1) + ')');
  console.log('  문항        : ' + qtot.toLocaleString() + '개');
  console.log('  sitemap URL : ' + urls.length + '개 (lastmod ' + today + ')');
  console.log('  robots.txt · llms.txt 갱신');
  console.log('');
  console.log('git status / git diff 로 변경분을 확인한 뒤 커밋하세요.');
}

main().then(() => process.exit(0)).catch(e => {
  console.error('오류:', (e && e.message) || e);
  process.exit(1);
});
