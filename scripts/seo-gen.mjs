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
  seoCertOfFname, seoAddNav, seoCertHub, seoCertName, seoEsc
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

/* ★ [2026-09-29] **안 바뀜 파일은 안 쓴다.**
 * 앞서는 날마다 772쪽을 다 덮어써
 * git 이 전부 바뀐 것으로 보았고,
 * sitemap 의 lastmod 도 전부 그날로 바뀌었다.
 * 바뀐 쪽을 여기서 모아 sitemap 에 넘긴다. */
const 바뀐것 = new Set();

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  let 옛 = null;
  // ★ ENOENT(파일 없음)만 삼킨다. 권한·I/O 오류까지 「새 파일」로 보면
  //   내용이 멀쩡한 파일을 덮어쓰고 sitemap 날짜까지 올린다 (GPT 검수 지적).
  try { 옛 = fs.readFileSync(abs, 'utf8'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (옛 === text) return false;          // 그대로면 손대지 않는다
  fs.writeFileSync(abs, text, 'utf8');   // LF 그대로 (저장소의 기존 seo/ 파일과 동일)
  바뀐것.add(rel);
  return true;
}

/* 지금 저장소에 있는 sitemap.xml 에서 주소별 lastmod 를 읽어 둔다.
 * 내용이 안 바뀐 쪽은 이 날짜를 그대로 쓴다. */
function 옛사이트맵날짜() {
  try {
    const x = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    const 맵 = {};
    const re = /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
    let m;
    while ((m = re.exec(x))) 맵[m[1]] = m[2];
    return 맵;
  } catch (e) {
    if (e.code === 'ENOENT') return {};   // 첫 실행 — 사이트맵이 아직 없다
    throw e;                              // 그 밖의 읽기 오류는 숨기지 않는다
  }
}

const MAX_PAGE_SIZE = 40;
const BASE = 'https://certlab.ai.kr/seo/';
const pageName = (fname, part) => part === 0 ? fname : fname.replace(/\.html$/, '-p' + (part + 1) + '.html');
const plain = value => String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
function mdInline(value) {
  const source = String(value);
  const link = /\[([^\]]+)\]\((https:\/\/[^\s)]+|[a-z0-9][a-z0-9./#-]*)\)/g;
  let out = '', from = 0, match;
  while ((match = link.exec(source))) {
    out += seoEsc(source.slice(from, match.index));
    out += '<a href="' + seoEsc(match[2]) + '">' + seoEsc(match[1]) + '</a>';
    from = link.lastIndex;
  }
  return out + seoEsc(source.slice(from));
}

function pageSummary(cert, subject, round, chunk, all, start, part, total) {
  const yearInSet = String(chunk[0]?.set || '').match(/20\d{2}/)?.[0];
  const year = yearInSet || ((cert === 'realestate1' || cert === 'realestate2') && round ? String(1989 + Number(round)) : '');
  const label = [year && year + '년', round && '(' + round + '회)', subject].filter(Boolean).join(' ');
  const withExp = chunk.filter(q => (q.exp?.o || []).some(Boolean) || (q.exp?.c || []).length || (q.exp?.ex || []).some(Boolean)).length;
  const concepts = new Map();
  for (const q of chunk) for (const card of q.exp?.c || []) {
    const name = plain(card?.t);
    if (name) concepts.set(name, (concepts.get(name) || 0) + 1);
  }
  const top = [...concepts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).slice(0, 3).map(([name]) => name);
  const rates = chunk.map((q, i) => ({ n: start + i + 1, rate: q.correctRate ?? q.accuracy ?? q.correct_rate }))
    .filter(x => typeof x.rate === 'number' && Number.isFinite(x.rate) && x.rate >= 0 && x.rate <= 100)
    .sort((a, b) => a.rate - b.rate).slice(0, 5);
  const lines = [label + ' · ' + chunk.length + '문항' + (total > 1 ? ' (전체 ' + all.length + '문항 중 ' + (part + 1) + '/' + total + ')' : ''),
    (start + 1) + '~' + (start + chunk.length) + '번 · 보기별 해설 ' + withExp + '문항'];
  const neg = chunk.filter(q => /옳지 않은|틀린|아닌 것/.test(plain(q.q))).length;
  const combo = chunk.filter(q => /ㄱ[\s\S]*ㄴ/.test(String(q.q || '') + ' ' + String(q.jaryo || ''))).length;
  if (neg || combo) lines.push('틀린 것 고르기 ' + neg + '문항 · ㄱㄴ 조합형 ' + combo + '문항');
  if (top.length) lines.push('자주 나온 개념: ' + top.join(' · '));
  if (rates.length) lines.push('정답률 낮은 문항: ' + rates.map(x => x.n + '번').join(' · '));
  return '<section class="page-summary" aria-label="이 쪽 요약"><h2>이 쪽 요약</h2>'
    + lines.map(x => '<p>' + seoEsc(x) + '</p>').join('') + '</section>';
}

function splitPage(cert, subject, round, sid, chunk, all, start, part, total) {
  const label = total > 1 ? subject + ' ' + (start + 1) + '~' + (start + chunk.length) + '번' : subject;
  const pg = seoPage(cert, label, round, sid, chunk);
  const fname = pageName(pg.fname, part);
  let html = pg.html.replaceAll(BASE + pg.fname, BASE + fname);
  const summary = pageSummary(cert, subject, round, chunk, all, start, part, total);
  const pager = total > 1 ? '<nav class="pager" aria-label="문항 페이지">'
    + (part ? '<a href="' + pageName(pg.fname, part - 1) + '">← 이전 문항</a>' : '')
    + '<span>' + (part + 1) + ' / ' + total + '</span>'
    + (part + 1 < total ? '<a href="' + pageName(pg.fname, part + 1) + '">다음 문항 →</a>' : '')
    + '</nav>' : '';
  html = html.replace('</style>', '.page-summary{margin:8px 0 16px;padding:12px 14px;background:#fff;border:1px solid #dbeafe;border-radius:10px}.page-summary h2{font-size:15px;margin:0 0 5px;color:#0C447C}.page-summary p{font-size:13px;margin:3px 0}.pager{display:flex;justify-content:space-between;gap:8px;margin:18px 0}.pager a{color:#0C447C;font-weight:700}.pager span{color:#64748b}ol.opts{list-style:none;padding-left:0}</style>')
    .replace(/(<p class="sub">[\s\S]*?<\/p>)/, '$1\n' + summary)
    .replace('<footer>', pager + '\n<footer>');
  return { fname, html };
}

function markdownGuide(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const lines = source.split('\n');
  const meta = {};
  for (let i = 0; i < 3; i++) {
    const m = lines[i]?.match(/^(title|description|exam):\s*(.+)$/);
    if (!m || meta[m[1]]) throw new Error('글 머리 3줄은 title·description·exam 순서여야 합니다: ' + file);
    meta[m[1]] = m[2].trim();
  }
  if (!meta.title || !meta.description || !meta.exam || !lines[0].startsWith('title:') || !lines[1].startsWith('description:') || !lines[2].startsWith('exam:')) throw new Error('글 머리 누락: ' + file);
  const slug = path.basename(file, '.md');
  if (!/^[a-z0-9]+-[a-z0-9-]+$/.test(slug) || !slug.startsWith(meta.exam + '-')) throw new Error('글 파일명과 exam 불일치: ' + file);
  const fname = 'guide-' + slug + '.html';
  const url = BASE + fname;
  const body = [];
  let paragraph = [];
  let list = [];
  const flush = () => { if (paragraph.length) { body.push('<p>' + mdInline(paragraph.join(' ')) + '</p>'); paragraph = []; } if (list.length) { body.push('<ul>' + list.map(x => '<li>' + mdInline(x) + '</li>').join('') + '</ul>'); list = []; } };
  for (const raw of lines.slice(3)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { flush(); body.push('<h' + Math.min(heading[1].length + 1, 4) + '>' + mdInline(heading[2]) + '</h' + Math.min(heading[1].length + 1, 4) + '>'); continue; }
    if (line.startsWith('- ')) { if (paragraph.length) flush(); list.push(line.slice(2)); continue; }
    if (list.length) flush();
    paragraph.push(line);
  }
  flush();
  const certName = seoEsc(seoCertName(meta.exam));
  const hubCss = seoCertHub(meta.exam, [], {}).html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const guideCss = '.guide-desc{color:#64748b;font-size:14px;margin:0 0 14px}.guide-body{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:8px}.guide-body h2{font-size:19px;margin:20px 0 8px}.guide-body h3{font-size:17px;margin:18px 0 6px}.guide-body h4{font-size:15px;margin:16px 0 5px}.guide-body h2:first-child{margin-top:0}.guide-body p{margin:8px 0 12px}.guide-body ul{list-style:disc;padding-left:20px}.guide-body li{margin:6px 0}';
  const html = '<!doctype html><html lang="ko"><head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + seoEsc(meta.title) + ' | CertLab</title>\n<meta name="description" content="' + seoEsc(meta.description) + '">\n<link rel="canonical" href="' + url + '">\n<style>' + hubCss + guideCss + '</style>\n</head><body>\n<div class="bc"><a href="index.html">CertLab 기출문제</a> › <a href="index-' + meta.exam + '.html">' + certName + '</a></div>\n<h1>' + seoEsc(meta.title) + '</h1>\n<p class="guide-desc">' + seoEsc(meta.description) + '</p>\n<a class="cta" href="https://certlab.ai.kr/#' + meta.exam + '">▶ CertLab에서 풀어보기</a>\n<article class="guide-body">\n' + body.join('\n') + '\n</article>\n<footer><p>© CertLab(서트랩) · <a href="index-' + meta.exam + '.html">' + certName + ' 기출문제 모음</a> · <a href="index.html">전체 자격증 모음</a></p></footer>\n</body></html>';
  return { fname, html, cert: meta.exam, title: meta.title };
}

function realestateHub(cert, fnames, labels, banks, variantCounts, conceptCounts, guides) {
  const base = seoCertHub(cert, fnames, labels);
  const subjects = banks.filter(b => b.data.cert === cert);
  const rounds = [...new Set(subjects.flatMap(b => (b.data.questions || []).map(q => seoRound(q.set)).filter(Boolean)))].map(Number).sort((a, b) => a - b);
  const years = rounds.map(r => 1989 + r);
  const intro = '공인중개사 ' + (cert === 'realestate1' ? '1차' : '2차') + ' 기출문제 '
    + (years.length ? years[0] + '~' + years.at(-1) + '(' + rounds[0] + '~' + rounds.at(-1) + '회)' : '')
    + ' · 과목당 ' + (subjects[0] ? (subjects[0].data.questions || []).length : 0) + '문항 · 보기별 해설';
  const cards = subjects.map(b => {
    const sid = b.data.subject, name = b.subjName || labels[cert + '-' + rounds[0] + '-' + sid + '.html'] || sid;
    const qs = b.data.questions || [];
    const concepts = new Set(qs.flatMap(q => (q.exp?.c || []).map(c => plain(c?.t)).filter(Boolean)));
    const links = rounds.map(r => ({ r, f: cert + '-' + r + '-' + sid + '.html' })).filter(x => fnames.includes(x.f))
      .map(x => '<a href="' + x.f + '">' + (1989 + x.r) + '년 ' + x.r + '회 기출문제</a>').join(' · ');
    const candidates = qs.filter(q => typeof q.ans === 'number' && q.opts?.[q.ans - 1] && (q.exp?.o?.[q.ans - 1] || q.exp?.s));
    const rated = candidates.filter(q => typeof (q.correctRate ?? q.accuracy ?? q.correct_rate) === 'number');
    const picked = (rated.length >= 3 ? rated.sort((a, b) => (a.correctRate ?? a.accuracy ?? a.correct_rate) - (b.correctRate ?? b.accuracy ?? b.correct_rate)) : candidates).slice(0, 3);
    const preview = picked.map(q => '<li><b>' + seoEsc(plain(q.q).slice(0, 130)) + '</b><br>정답 ' + q.ans + '번 · ' + seoEsc(plain(q.opts[q.ans - 1]).slice(0, 90))
      + '<br><span>' + seoEsc(plain(q.exp?.o?.[q.ans - 1] || q.exp?.s).slice(0, 140)) + '</span> <a href="https://certlab.ai.kr/?q=' + encodeURIComponent(cert + '/' + q.id) + '">서트랩에서 풀어 보기 →</a></li>').join('');
    return '<section class="subject-card"><h2>' + seoEsc(name) + '</h2><p>' + links + '</p><p>개념 ' + (conceptCounts[cert + '|' + sid] || concepts.size) + '개 연결 · 변형문제 ' + (variantCounts[cert + '|' + sid] || 0) + '개</p>'
      + (preview ? '<h3>' + (rated.length >= 3 ? '정답률 낮은 문제 3개' : '미리 보는 문제 3개') + '</h3><ol>' + preview + '</ol>' : '') + '</section>';
  }).join('\n');
  const faqs = [
    ['합격 기준은 어떻게 되나요?', '1·2차 모두 매 과목 40점 이상, 전 과목 평균 60점 이상입니다.'],
    ['시험과목은 몇 개입니까?', '이 ' + (cert === 'realestate1' ? '1차' : '2차') + ' 기출 목록에는 ' + subjects.length + '개 과목이 있습니다.'],
    ['몇 년치 기출문제를 볼 수 있나요?', years.length ? years[0] + '~' + years.at(-1) + '년, ' + rounds.length + '개 회차를 볼 수 있습니다.' : '이 목록의 회차별 기출문제를 볼 수 있습니다.'],
    ['보기별 해설도 있나요?', '문항에 작성된 보기별 해설과 개념을 기출문제 아래에 함께 표시합니다.']
  ];
  const faq = '<section class="faq"><h2>자주 묻는 질문</h2>' + faqs.map(([q, a]) => '<h3>' + seoEsc(q) + '</h3><p>' + seoEsc(a) + '</p>').join('')
    + '<p>자세한 기준은 시행 공고를 확인하세요.</p></section>';
  const guideLinks = guides.length ? '<section><h2>공인중개사 학습 글</h2><ul>' + guides.map(g => '<li><a href="' + g.fname + '">' + seoEsc(g.title) + '</a></li>').join('') + '</ul></section>' : '';
  const css = '.subject-card{background:#fff;border:1px solid #dbeafe;border-radius:12px;padding:15px;margin:15px 0}.subject-card h2{margin:0 0 8px;font-size:18px}.subject-card h3{font-size:15px;margin:14px 0 6px}.subject-card p{margin:7px 0}.subject-card ol{padding-left:20px}.subject-card li{margin:12px 0}.subject-card li span{color:#475569}.faq{margin-top:28px}.faq h3{font-size:15px;margin:15px 0 3px}.faq p{margin:0 0 8px}';
  let html = base.html.replace('</style>', css + '</style>');
  html = html.replace(/<p>회차별·과목별로 [\s\S]*?<\/p>/, '<p>' + seoEsc(intro) + '</p>');
  html = html.replace(/<ul>[\s\S]*?<\/ul>/, cards + guideLinks + faq);
  return { fname: base.fname, html };
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

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10); // 한국 날짜
  const files = [];
  const SEO_LABELS = {};

  const guideDir = path.join(ROOT, 'seo-src', 'guide');
  const guides = fs.existsSync(guideDir) ? fs.readdirSync(guideDir).filter(name => name.endsWith('.md') && !name.startsWith('_')).sort()
    .map(name => markdownGuide(path.join(guideDir, name))) : [];
  const guideByCert = {};
  for (const guide of guides) (guideByCert[guide.cert] ||= []).push(guide);

  const variantCounts = {}, conceptCounts = {};
  for (const b of banks.filter(b => b.data.cert === 'realestate1' || b.data.cert === 'realestate2')) {
    const cert = b.data.cert, sid = b.data.subject;
    const [variantSnap, mapSnap] = await Promise.all(['variantq', 'map'].map(kind => db.collection('adaptive').doc(cert + '__' + sid + '__' + kind).get()));
    const parse = snap => { if (!snap.exists) return {}; const raw = snap.data(); return raw && typeof raw.payload === 'string' ? JSON.parse(raw.payload) : raw; };
    variantCounts[cert + '|' + sid] = (parse(variantSnap).questions || []).filter(q => q && !q.hidden).length;
    conceptCounts[cert + '|' + sid] = new Set((parse(mapSnap).mapping || []).map(x => x.topic).filter(Boolean)).size;
  }

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
      const all = groups[r];
      const total = Math.ceil(all.length / MAX_PAGE_SIZE);
      const chunkSize = Math.ceil(all.length / total);
      for (let part = 0; part < total; part++) {
        const start = part * chunkSize;
        const chunk = all.slice(start, start + chunkSize);
        const pg = splitPage(cert, subjName, rr, sid, chunk, all, start, part, total);
        pages.set(pg.fname, pg.html);
        files.push(pg.fname);
        SEO_LABELS[pg.fname] = subjName + (total > 1 ? ' ' + (start + 1) + '~' + (start + chunk.length) + '번' : '');
      }
    }
  }

  /* 자격증별로 묶어 이웃 링크를 끼우고, 자격증 허브를 만든다. */
  const byCert = {};
  for (const f of files) (byCert[seoCertOfFname(f)] = byCert[seoCertOfFname(f)] || []).push(f);
  const hubFiles = [];
  for (const cert of Object.keys(byCert)) {
    const list = byCert[cert];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      // 전체 목록은 index-시험.html에 두고 문항 쪽에는 가까운 이웃만 둔다.
      const near = list.slice(Math.max(0, i - 3), i + 4);
      write('seo/' + f, seoAddNav(pages.get(f), cert, f, near, SEO_LABELS));
    }
    const ch = cert === 'realestate1' || cert === 'realestate2'
      ? realestateHub(cert, list, SEO_LABELS, banks, variantCounts, conceptCounts, guideByCert[cert] || [])
      : seoCertHub(cert, list, SEO_LABELS);
    if (cert !== 'realestate1' && cert !== 'realestate2' && guideByCert[cert]?.length) {
      const links = guideByCert[cert].map(g => '<li><a href="' + g.fname + '">' + seoEsc(g.title) + '</a></li>').join('');
      ch.html = ch.html.replace('<footer>', '<section><h2>' + seoEsc(seoCertName(cert)) + ' 학습 글</h2><ul>' + links + '</ul></section><footer>');
    }
    write('seo/' + ch.fname, ch.html);
    hubFiles.push(ch.fname);
  }

  for (const guide of guides) {
    if (!byCert[guide.cert]) throw new Error('글 exam에 해당하는 시험이 없습니다: ' + guide.cert);
    write('seo/' + guide.fname, guide.html);
  }

  /* 이전 생성에서 남은 분할·글 쪽은 더 이상 링크되지 않도록 치운다. */
  const expected = new Set(files.concat(hubFiles, ['index.html'], guides.map(g => g.fname)));
  for (const name of fs.readdirSync(path.join(ROOT, 'seo'))) {
    if (/^(?:guide-.*|.*-p\d+)\.html$/.test(name) && !expected.has(name)) {
      fs.unlinkSync(path.join(ROOT, 'seo', name));
    }
  }

  const urls = ['https://certlab.ai.kr/seo/index.html']
    .concat(hubFiles.map(f => 'https://certlab.ai.kr/seo/' + f))
    .concat(files.map(f => 'https://certlab.ai.kr/seo/' + f))
    .concat(guides.map(g => 'https://certlab.ai.kr/seo/' + g.fname));
  /* 허브는 쪽 목록만 보고 자격증을 센다. 자격증 허브 주소는 빼고 넘긴다. */
  write('seo/index.html', seoHub(['https://certlab.ai.kr/seo/index.html'].concat(files.map(f => 'https://certlab.ai.kr/seo/' + f)), SEO_LABELS));
  /* ★ 바뀐 쪽만 오늘 날짜를 준다.
   * 이 줄이 도는 시점에는 seo/*.html 이 다
   * 쓰였으므로 바뀐것 이 채워져 있다. */
  const 옛날짜 = 옛사이트맵날짜();
  for (const rel of 바뀐것) {
    if (rel.startsWith('seo/')) delete 옛날짜['https://certlab.ai.kr/' + rel];
  }
  const 사이트맵 = seoSitemap(urls, today, 옛날짜);
  write('sitemap.xml', 사이트맵);
  const 오늘수 = (사이트맵.match(new RegExp('<lastmod>' + today + '</lastmod>', 'g')) || []).length;
  console.log('  sitemap     : ' + urls.length + '쪽 중 ' + 오늘수 + '쪽만 오늘 날짜 (나머지는 그대로)');
  write('robots.txt', seoRobots());
  write('llms.txt', seoLlms(urls));

  console.log('');
  console.log('✅ 완료');
  console.log('  seo/*.html  : ' + files.length + '장 (+ 자격증 허브 ' + hubFiles.length + ' + 메인 허브 1 + 글 ' + guides.length + ')');
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
