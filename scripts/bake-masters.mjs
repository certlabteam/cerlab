/* ===========================================================================
   scripts/bake-masters.mjs — 마스터(개념·표·암기·그래프·인터랙티브)를 시험별 정적 JSON 으로 굽는다.
   실행: node scripts/bake-masters.mjs   (저장소 루트에서 · 매일 22시 bake-masters.yml)

   왜: 학습앱 ensureMasters() 가 시험을 열 때마다 concepts 모음 전체(2026-10-22 26,857장)를
       .get() 해 접속 한 번에 읽기 약 2.9만 — 10월 Firestore 비용이 9월의 6.5배가 됐다
       (크리스 승인 2026-09 「시험별 정적 JSON 으로 구워 GitHub Pages 로」 · 10-22 다시 맡김).
   무엇: masters/<시험>.json = 그 시험 문항(banks·adaptive)이 가리키는 개념 + certs 에 그 시험이 든 개념,
         그 개념·문항이 가리키는 표·암기. masters/_common.json = 그래프·인터랙티브 전부(작다).
         masters/_index.json = 구운 시각·시험별 개수 — 앱이 ?v= 로 쓴다.
   읽기는 공개 REST(웹 키) 하루 한 번 — 모음 전체 ≈ 3.2만 읽기. 굽고 난 뒤 생긴 카드는
   앱이 문항 화면에서 id 로 하나씩 받는다(_mastersFor) — 그래서 굽기가 늦어도 비지 않는다.
   =========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'masters');
const KEY = 'AIzaSyCSQlow8xzRsv0EMtIYJ6_WDRAFUECrw2Q';   // index.html 에 공개된 웹 키
const BASE = 'https://firestore.googleapis.com/v1/projects/certlab-c3bcb/databases/(default)/documents/';

function fv(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fv);
  if ('mapValue' in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = fv(x); return o; }
  return Object.values(v)[0];
}

async function listAll(col) {
  const out = {};
  let tok = '';
  for (;;) {
    const u = BASE + col + '?pageSize=300&key=' + KEY + (tok ? '&pageToken=' + encodeURIComponent(tok) : '');
    let r;
    for (let i = 0; i < 4; i++) {
      r = await fetch(u);
      if (r.ok) break;
      await new Promise(s => setTimeout(s, 2000 * (i + 1)));
    }
    if (!r.ok) throw new Error(col + ' 읽기 실패 ' + r.status);
    const j = await r.json();
    for (const d of j.documents || []) {
      const id = decodeURIComponent(d.name.split('/').pop());
      const o = {}; for (const [k, x] of Object.entries(d.fields || {})) o[k] = fv(x);
      out[id] = o;
    }
    if (!j.nextPageToken) break;
    tok = j.nextPageToken;
  }
  return out;
}

/* 어떤 값이든 훑어 cpt·mn·tbl 참조를 모은다 — 필드(cpt/mn/tbl)와 글 속 cpt:// mn:// tbl:// 둘 다 */
const PFX = { cpt: 'cpt://', mn: 'mn://', tbl: 'tbl://' };
function refsOf(v, acc) {
  if (v == null) return acc;
  if (typeof v === 'string') {
    for (const m of v.matchAll(/(cpt|mn|tbl):\/\/([A-Za-z0-9_\-.]+)/g)) acc[m[1]].add(m[2]);
    return acc;
  }
  if (Array.isArray(v)) { v.forEach(x => refsOf(x, acc)); return acc; }
  if (typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (k in PFX) for (const s of (Array.isArray(x) ? x : [x])) if (typeof s === 'string' && s) acc[k].add(s.startsWith(PFX[k]) ? s.slice(PFX[k].length) : s);
      refsOf(x, acc);
    }
  }
  return acc;
}
const newAcc = () => ({ cpt: new Set(), mn: new Set(), tbl: new Set() });
/* 앱 문서 id 「<시험>__<과목>__…」 의 첫 토막이 시험 id */
const examOf = id => id.split('__')[0];

const t0 = Date.now();
const [concepts, tables, mnemonics, graphs, interactives, banks, adaptive] = await Promise.all(
  ['concepts', 'tables', 'mnemonics', 'graphs', 'interactives', 'banks', 'adaptive'].map(listAll));
console.log('읽음', { concepts: Object.keys(concepts).length, tables: Object.keys(tables).length, mnemonics: Object.keys(mnemonics).length,
  graphs: Object.keys(graphs).length, interactives: Object.keys(interactives).length, banks: Object.keys(banks).length,
  adaptive: Object.keys(adaptive).length, 초: Math.round((Date.now() - t0) / 1000) });

const per = {};
const accOf = ex => (per[ex] = per[ex] || newAcc());
for (const [id, d] of [...Object.entries(banks), ...Object.entries(adaptive)]) refsOf(d.questions || d, accOf(examOf(id)));
for (const [id, c] of Object.entries(concepts)) for (const ex of (Array.isArray(c.certs) ? c.certs : [])) accOf(ex).cpt.add(id);

fs.mkdirSync(OUT, { recursive: true });
const idx = { bakedAt: new Date().toISOString(), exams: {} };
for (const [ex, acc] of Object.entries(per)) {
  if (!/^[A-Za-z0-9_\-]+$/.test(ex)) continue;
  const c = {}, t = {}, m = {};
  for (const id of acc.cpt) if (concepts[id]) { c[id] = concepts[id]; refsOf(concepts[id], acc); }
  for (const id of acc.tbl) if (tables[id]) t[id] = tables[id];
  for (const id of acc.mn) if (mnemonics[id]) m[id] = mnemonics[id];
  if (!Object.keys(c).length && !Object.keys(t).length && !Object.keys(m).length) continue;
  const body = JSON.stringify({ concepts: c, tables: t, mnemonics: m });
  fs.writeFileSync(path.join(OUT, ex + '.json'), body);
  idx.exams[ex] = { concepts: Object.keys(c).length, tables: Object.keys(t).length, mnemonics: Object.keys(m).length, kb: Math.round(body.length / 1024) };
}
fs.writeFileSync(path.join(OUT, '_common.json'), JSON.stringify({ graphs, interactives }));
fs.writeFileSync(path.join(OUT, '_index.json'), JSON.stringify(idx, null, 1));
console.log('구움', Object.keys(idx.exams).length, '시험 ·', Math.round((Date.now() - t0) / 1000), '초');
for (const [ex, n] of Object.entries(idx.exams).sort((a, b) => b[1].kb - a[1].kb).slice(0, 12)) console.log(' ', ex, n);
