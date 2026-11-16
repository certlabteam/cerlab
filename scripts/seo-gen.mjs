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
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/app-check';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* seo-core.js — admin.html과 공유하는 생성 로직 단일 출처 */
const {
  SEO_SUBJ_OVERRIDE, SEO_BASE_URLS, seoRound, seoPage, seoHub, seoUrlset, seoSitemapIndex, seoRobots, seoLlms, seoReadAllBanks,
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

/* ★ [2026-09-29] **안 바뀐 파일은 안 쓴다.** 앞서는 날마다 772쪽을 다 덮어써
 * git 이 전부 바뀐 것으로 보았다. */
function write(rel, text) {
  if (rel.startsWith('seo/') && rel.endsWith('.html')) {
    const link = '<p style="white-space:nowrap"><a href="https://ilgumi.com/" style="color:inherit;font-size:inherit">일구미 · 사장님 리뷰 답글</a></p>';
    if (!text.includes('</footer>')) throw new Error('SEO 쪽 footer 없음: ' + rel);
    text = text.replace('</footer>', link + '</footer>');
  }
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  let 옛 = null;
  // ★ ENOENT(파일 없음)만 삼킨다. 권한·I/O 오류까지 「새 파일」로 보면
  //   내용이 멀쩡한 파일을 덮어쓰고 sitemap 날짜까지 올린다 (GPT 검수 지적).
  try { 옛 = fs.readFileSync(abs, 'utf8'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (옛 === text) return false;          // 그대로면 손대지 않는다
  fs.writeFileSync(abs, text, 'utf8');   // LF 그대로 (저장소의 기존 seo/ 파일과 동일)
  return true;
}

/* 지금 저장소에 있는 사이트맵(옛 sitemap.xml 또는 나눈 sitemap-*.xml)에서 주소별 lastmod 를 읽는다.
 * 기록 파일(seo-src/lastmod.json)에 없는 주소의 첫 날짜로만 쓴다. */
function 옛사이트맵날짜() {
  const 맵 = {};
  for (const name of ['sitemap.xml', 'sitemap-hubs.xml', 'sitemap-pages.xml']) {
    let x;
    try { x = fs.readFileSync(path.join(ROOT, name), 'utf8'); }
    catch (e) { if (e.code === 'ENOENT') continue; throw e; }   // 없는 파일만 넘긴다
    const re = /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
    let m;
    while ((m = re.exec(x))) 맵[m[1]] = m[2];
  }
  return 맵;
}

/* ★ [2026-11-17] **lastmod 는 그 쪽의 문항 내용이 바뀐 날.**
 * 앞서는 「파일이 바뀐 날」이었다. 그러자 틀(꼬리말 링크·요약 칸)만 고쳐도 1,080쪽이
 * 한날(11-05)로 같이 올라갔다. 이제 쪽마다 문항 자료의 지문(hash)을 seo-src/lastmod.json 에
 * 적어 두고, 지문이 바뀐 쪽만 날짜를 새로 준다. 새 날짜는 그 과목 은행의 updatedAt(문항을
 * 올린 날)을 먼저 쓰고, 그것이 옛 날짜보다 앞서면(올린 날 기록이 안 바뀜) 오늘로 둔다.
 * 정답률처럼 날마다 움직이는 숫자는 지문에서 뺀다. */
const LASTMOD_FILE = path.join(ROOT, 'seo-src', 'lastmod.json');
const 변동키 = new Set(['correctRate', 'accuracy', 'correct_rate']);
function 지문(value) {
  const stable = v => Array.isArray(v) ? v.map(stable)
    : v && typeof v === 'object' ? Object.keys(v).filter(k => !변동키.has(k)).sort().reduce((o, k) => (o[k] = stable(v[k]), o), {})
    : v;
  return crypto.createHash('sha1').update(JSON.stringify(stable(value))).digest('hex').slice(0, 16);
}
function 한국날짜(ts) {
  const sec = ts && (typeof ts.seconds === 'number' ? ts.seconds : null);
  return sec == null ? '' : new Date(sec * 1000 + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/* ★ [2026-11-17] **얇은 쪽·겹치는 쪽은 noindex.** (SEO방 진단: 색인 151 · 크롤링됨-색인 안 됨 598)
 * - 문항 5개 이하인 쪽
 * - 문항(발문+보기)의 80% 이상이 앞서 나온 다른 한 쪽에 그대로 있는 쪽
 *   (9급 공무원 공통과목 국어·영어·한국사가 직렬마다 똑같이 실린다 · 경영/기술지도사 1차 공통과목 등)
 *   먼저 나온 쪽(manifest 순서)을 남기고 뒤 쪽을 뺀다.
 * 사람이 보는 화면은 그대로 — <meta name="robots" content="noindex,follow"> 만 넣고 사이트맵에서 뺀다.
 * 빼는 쪽이 전체의 30% 를 넘으면 기준이 잘못된 것으로 보고 아무것도 안 뺀다(목록만 찍는다). */
const THIN_MAX = 5, DUP_RATIO = 0.8, NOINDEX_CAP = 0.3;
const 문항키 = q => [q.q, (q.opts || []).join('|')].map(s => String(s || '').replace(/<[^>]*>/g, '').replace(/[\s\p{P}\p{S}]/gu, '')).join('|');
function 얇은쪽고르기(metas) {
  const out = new Map();                  // fname → 이유
  const owner = new Map();                // 문항키 → 처음 실린 남긴 쪽
  for (const m of metas) {
    if (m.n <= THIN_MAX) { out.set(m.fname, '문항 ' + m.n + '개'); continue; }
    const cnt = {};
    for (const k of new Set(m.keys)) { const o = owner.get(k); if (o) cnt[o] = (cnt[o] || 0) + 1; }
    let best = '', bn = 0;
    for (const o in cnt) if (cnt[o] > bn) { bn = cnt[o]; best = o; }
    if (m.keys.length && bn / m.keys.length >= DUP_RATIO) { out.set(m.fname, '겹침 ' + Math.round(bn / m.keys.length * 100) + '% ← ' + best); continue; }
    for (const k of m.keys) if (!owner.has(k)) owner.set(k, m.fname);
  }
  return out;
}
const NOINDEX_TAG = '<meta name="robots" content="noindex,follow">';
function noindex붙이기(html) {
  if (html.includes(NOINDEX_TAG)) return html;
  const at = html.indexOf('<meta name="viewport"');
  if (at < 0) throw new Error('viewport 메타가 없어 noindex 를 못 넣습니다');
  const end = html.indexOf('>', at) + 1;
  return html.slice(0, end) + '\n' + NOINDEX_TAG + html.slice(end);
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
  const metas = [];          // 쪽마다 문항 수·문항키·내용 지문·은행 날짜 (lastmod·noindex 용)
  for (const b of banks) {
    const data = b.data;
    const cert = data.cert, sid = data.subject;
    const bankDate = 한국날짜(data.updatedAt);
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
        metas.push({ fname: pg.fname, n: chunk.length, keys: chunk.map(문항키), bankDate,
          hash: 지문({ subjName, rr, start, total, chunk }) });
        SEO_LABELS[pg.fname] = subjName + (total > 1 ? ' ' + (start + 1) + '~' + (start + chunk.length) + '번' : '');
      }
    }
  }

  /* 자격증별로 묶어 이웃 링크를 끼우고, 자격증 허브를 만든다. */
  const byCert = {};
  for (const f of files) (byCert[seoCertOfFname(f)] = byCert[seoCertOfFname(f)] || []).push(f);
  let 뺄쪽 = 얇은쪽고르기(metas);
  console.log('  noindex 후보: ' + 뺄쪽.size + '쪽 / ' + files.length + '쪽 (' + (뺄쪽.size / files.length * 100).toFixed(1) + '%)');
  for (const [f, why] of 뺄쪽) console.log('    - ' + f + ' · ' + why);
  if (뺄쪽.size > files.length * NOINDEX_CAP) {
    console.log('  ⚠ ' + Math.round(NOINDEX_CAP * 100) + '% 를 넘어 noindex 를 넣지 않습니다(목록만).');
    뺄쪽 = new Map();
  }
  const hubFiles = [];
  for (const cert of Object.keys(byCert)) {
    const list = byCert[cert];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      // 전체 목록은 index-시험.html에 두고 문항 쪽에는 가까운 이웃만 둔다.
      const near = list.slice(Math.max(0, i - 3), i + 4);
      const html = seoAddNav(pages.get(f), cert, f, near, SEO_LABELS);
      write('seo/' + f, 뺄쪽.has(f) ? noindex붙이기(html) : html);
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

  const U = f => 'https://certlab.ai.kr/seo/' + f;
  const indexable = files.filter(f => !뺄쪽.has(f));
  /* 허브는 쪽 목록만 보고 자격증을 센다. 자격증 허브 주소는 빼고 넘긴다. */
  write('seo/index.html', seoHub([U('index.html')].concat(files.map(U)), SEO_LABELS));

  /* --- lastmod: 내용 지문이 바뀐 쪽만 새 날짜 (위 LASTMOD_FILE 설명) --- */
  const 옛날짜 = 옛사이트맵날짜();
  let 옛기록 = {};
  try { 옛기록 = JSON.parse(fs.readFileSync(LASTMOD_FILE, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const 기록 = {};
  const 날짜정하기 = (key, hash, bankDate) => {
    const old = 옛기록[key];
    let d;
    if (old && old.h === hash) d = old.d;                                   // 내용 그대로 → 날짜 그대로
    else if (!old) d = bankDate || 옛날짜[U(key)] || today;                  // 처음 적을 때 → 은행 올린 날
    else d = bankDate && bankDate > old.d ? bankDate : today;              // 내용 바뀜 → 올린 날, 없으면 오늘
    기록[key] = { h: hash, d };
    return d;
  };
  const lastmod = {};
  for (const m of metas) lastmod[m.fname] = 날짜정하기(m.fname, m.hash, m.bankDate);
  for (const g of guides) lastmod[g.fname] = 날짜정하기(g.fname, 지문(g.html), '');
  /* 허브는 목록에 실린 쪽(문항 쪽·학습 글) 가운데 가장 늦게 바뀐 날 — 허브 내용이 거기서 나온다. */
  const maxDate = ds => ds.filter(Boolean).sort().at(-1) || today;
  for (const cert of Object.keys(byCert)) {
    lastmod[seoCertHub(cert, [], {}).fname] = maxDate(byCert[cert].map(f => lastmod[f]).concat((guideByCert[cert] || []).map(g => lastmod[g.fname])));
  }
  lastmod['index.html'] = maxDate(Object.values(lastmod));
  for (const n of [...뺄쪽.keys()]) if (기록[n]) 기록[n].noindex = 뺄쪽.get(n);
  write('seo-src/lastmod.json', JSON.stringify(기록, null, 1) + '\n');

  /* --- 사이트맵: 허브(sitemap-hubs.xml) · 그 밖(sitemap-pages.xml) · sitemap.xml 은 인덱스 --- */
  const hubEntries = ['index.html'].concat(hubFiles).map(f => ({ loc: U(f), lastmod: lastmod[f] }));
  const pageEntries = SEO_BASE_URLS.map(loc => ({ loc, lastmod: 옛날짜[loc] || today }))
    .concat(indexable.map(f => ({ loc: U(f), lastmod: lastmod[f] })))
    .concat(guides.map(g => ({ loc: U(g.fname), lastmod: lastmod[g.fname] })));
  write('sitemap-hubs.xml', seoUrlset(hubEntries));
  write('sitemap-pages.xml', seoUrlset(pageEntries));
  write('sitemap.xml', seoSitemapIndex([
    { loc: 'https://certlab.ai.kr/sitemap-hubs.xml', lastmod: maxDate(hubEntries.map(e => e.lastmod)) },
    { loc: 'https://certlab.ai.kr/sitemap-pages.xml', lastmod: maxDate(pageEntries.map(e => e.lastmod)) }
  ]));
  const urls = hubEntries.concat(pageEntries).map(e => e.loc);
  const 오늘수 = hubEntries.concat(pageEntries).filter(e => e.lastmod === today).length;
  console.log('  sitemap     : 허브 ' + hubEntries.length + ' + 쪽 ' + pageEntries.length + ' = ' + urls.length + '개 · noindex 로 뺀 쪽 ' + 뺄쪽.size + ' · 오늘 날짜 ' + 오늘수 + '개');
  write('robots.txt', seoRobots());
  write('llms.txt', seoLlms([U('index.html')].concat(hubFiles.map(U), indexable.map(U), guides.map(g => U(g.fname)))));

  console.log('');
  console.log('✅ 완료');
  console.log('  seo/*.html  : ' + files.length + '장 (+ 자격증 허브 ' + hubFiles.length + ' + 메인 허브 1 + 글 ' + guides.length + ')');
  console.log('  문항        : ' + qtot.toLocaleString() + '개');
  console.log('  robots.txt · llms.txt 갱신');
  console.log('');
  console.log('git status / git diff 로 변경분을 확인한 뒤 커밋하세요.');
}

main().then(() => process.exit(0)).catch(e => {
  console.error('오류:', (e && e.message) || e);
  process.exit(1);
});
