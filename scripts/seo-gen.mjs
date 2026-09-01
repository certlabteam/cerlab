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
import 'firebase/compat/app-check';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* seo-core.js — admin.html과 공유하는 생성 로직 단일 출처 */
const {
  SEO_SUBJ_OVERRIDE, seoRound, seoPage, seoHub, seoSitemap, seoRobots, seoLlms, seoReadAllBanks,
  seoCertOfFname, seoAddNav, seoCertHub
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

  /* App Check —— 토큰이 있으면 붙이고, 없으면 지금처럼 그냥 읽는다.
   * 라이브에서 App Check 강제를 켜면 토큰 없는 읽기는 막힌다. 그때 이 봇이 제일 먼저 죽는다.
   * 은행을 통째로 읽어서(한 번에 1,668문서) 지난 이레 「오래된 클라이언트」의 큰 몫이 이 봇이었다.
   * GitHub Secret 에 APPCHECK_DEBUG_TOKEN 을 넣어 두면 워크플로가 환경변수로 넘겨 준다.
   * 토큰이 없으면 아무것도 안 하고 넘어가므로, 강제를 켜기 전에도 그대로 돈다. */
  const 디버그토큰 = process.env.APPCHECK_DEBUG_TOKEN || '';
  if (디버그토큰) {
    /* ⚠ reCAPTCHA 방식(`activate(siteKey)`)은 Node 에서 안 된다.
     *    compat SDK 가 reCAPTCHA <script> 를 넣으려고 document 를 찾다가
     *    `document is not defined` 로 죽는다 (2026-09-02 Actions 로그에서 확인).
     *    그래서 디버그 토큰을 REST 로 직접 바꿔 받아 CustomProvider 로 넘긴다.
     *    CustomProvider 는 DOM 을 하나도 안 쓴다. */
    globalThis.self = globalThis;
    try {
      const 주소 = 'https://firebaseappcheck.googleapis.com/v1/projects/'
        + firebaseConfig.projectId + '/apps/' + firebaseConfig.appId
        + ':exchangeDebugToken?key=' + firebaseConfig.apiKey;
      const 답 = await fetch(주소, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debugToken: 디버그토큰 })
      });
      if (!답.ok) throw new Error('교환 실패 ' + 답.status + ' ' + (await 답.text()).slice(0, 200));
      const 몫 = await 답.json();
      const 남은초 = parseInt(String(몫.ttl || '3600s'), 10) || 3600;
      const 만료 = Date.now() + 남은초 * 1000;
      firebase.appCheck().activate(
        new firebase.appCheck.CustomProvider({
          getToken: () => Promise.resolve({ token: 몫.token, expireTimeMillis: 만료 })
        }), false);
      console.log('App Check 디버그 토큰을 붙였습니다 (' + 남은초 + '초짜리).');
    } catch (e) {
      console.log('App Check 을 못 켰습니다(그냥 읽습니다): ' + (e && e.message));
    }
  } else {
    console.log('App Check 토큰이 없습니다 — 공개 읽기로 돕니다.');
  }
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
  /*
   * 먼저 다 만들어 들고 있다가 나중에 쓴다. 쪽 아래에 붙일 '이웃 쪽 링크' 는
   * 그 자격증에 어떤 쪽들이 있는지 다 알아야 만들 수 있어서다.
   */
  const pages = new Map();   // fname → html
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
      pages.set(pg.fname, pg.html);
      files.push(pg.fname);
      SEO_LABELS[pg.fname] = subjName;
    }
  }

  /* 자격증별로 묶어 이웃 링크를 끼우고, 자격증 허브를 만든다. */
  const byCert = {};
  for (const f of files) (byCert[seoCertOfFname(f)] = byCert[seoCertOfFname(f)] || []).push(f);
  const hubFiles = [];
  for (const cert of Object.keys(byCert)) {
    const list = byCert[cert];
    for (const f of list) write('seo/' + f, seoAddNav(pages.get(f), cert, f, list, SEO_LABELS));
    const ch = seoCertHub(cert, list, SEO_LABELS);
    write('seo/' + ch.fname, ch.html);
    hubFiles.push(ch.fname);
  }

  const urls = ['https://certlab.ai.kr/seo/index.html']
    .concat(hubFiles.map(f => 'https://certlab.ai.kr/seo/' + f))
    .concat(files.map(f => 'https://certlab.ai.kr/seo/' + f));
  /* 허브는 쪽 목록만 보고 자격증을 센다. 자격증 허브 주소는 빼고 넘긴다. */
  write('seo/index.html', seoHub(['https://certlab.ai.kr/seo/index.html'].concat(files.map(f => 'https://certlab.ai.kr/seo/' + f)), SEO_LABELS));
  write('sitemap.xml', seoSitemap(urls, today));
  write('robots.txt', seoRobots());
  write('llms.txt', seoLlms(urls));

  console.log('');
  console.log('✅ 완료');
  console.log('  seo/*.html  : ' + files.length + '장 (+ 자격증 허브 ' + hubFiles.length + ' + 메인 허브 1)');
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
