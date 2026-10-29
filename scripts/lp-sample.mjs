#!/usr/bin/env node
/* 첫 화면 「해설은 이렇게 나와요」 예시 문항을 날마다 고른다 — lp-sample.json 을 쓴다.
 *
 * 왜: 크리스 2026-10-29 「요거는 그날 기준 우선순위 높은 걸로 바꾸도록 하자 자동으로」.
 *     방문자마다 파이어스토어를 읽지 않게 하루 한 번 정적 파일로 굽는다(seo-daily 와 같은 때).
 * 고르는 법: lp-closed.json(진척판 「완료」 시험) 가운데 시험일이 가장 가까운(지나지 않은) 시험 →
 *           그 시험 첫 과목의 가장 최근 회차 → 해설(o·ex·s)이 다 찬 객관식 문항 중 날짜를 씨앗으로 하나.
 *           고를 게 없으면 파일을 바꾸지 않는다(첫 화면은 고정 예시를 그대로 보인다).
 * 쓰기: node scripts/lp-sample.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FS = 'https://firestore.googleapis.com/v1/projects/certlab-c3bcb/databases/(default)/documents/';
const get = async (path) => { const r = await fetch(FS + path); if (!r.ok) throw new Error(path + ' ' + r.status); return r.json(); };
const plain = (v) => {
  const k = Object.keys(v)[0], x = v[k];
  if (k === 'mapValue') return Object.fromEntries(Object.entries(x.fields || {}).map(([a, b]) => [a, plain(b)]));
  if (k === 'arrayValue') return (x.values || []).map(plain);
  if (k === 'integerValue') return Number(x);
  return x;
};
const fields = (d) => plain({ mapValue: d });

const closed = JSON.parse(readFileSync('lp-closed.json', 'utf8'));
const now = Date.now();
const today = new Date(now + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜

// 시험일 — 앱의 loadExamSchedules 와 같은 규칙(upcoming 중 가장 가까운 것, 없으면 nextExamDate)
const sched = {};
for (const d of (await get('examSchedules?pageSize=300')).documents || []) {
  const f = fields(d), id = d.name.split('/').pop();
  let best = null;
  for (const u of f.upcoming || []) { const m = Date.parse(u && u.date); if (!isNaN(m) && m >= now && (best == null || m < best)) best = m; }
  if (best == null && f.nextExamDate) { const m = Date.parse(f.nextExamDate); if (!isNaN(m) && m >= now) best = m; }
  if (best != null) sched[id] = best;
}
const order = [...closed].sort((a, b) => (sched[a] ?? Infinity) - (sched[b] ?? Infinity));

const man = fields(await get('manifest/exams'));
let seed = [...today].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

for (const cert of order) {
  const ex = (man.exams || []).find((e) => e.id === cert && (e.type || 'mcq') === 'mcq');
  if (!ex || !(ex.subjects || []).length) continue;
  const sub = ex.subjects[0];
  let head;
  try { head = fields(await get('banks/' + encodeURIComponent(cert + '__' + sub.code))); } catch { continue; }
  const year = (s) => Math.max(0, ...(String(s).match(/\d{4}/g) || ['0']).map(Number));
  const shard = [...(head.shards || [])].sort((a, b) => year(b) - year(a))[0];
  if (!shard) continue;
  let bank;
  try { bank = fields(await get('banks/' + encodeURIComponent(cert + '__' + sub.code + '__' + shard))); } catch { continue; }
  const ok = (bank.questions || []).filter((q) => {
    const e = q && q.exp || {};
    return q && !q.hidden && !q.img && !q.jaryo && !q.calc && typeof q.ans === 'number'
      && Array.isArray(q.opts) && q.opts.length >= 4 && q.opts.length <= 5 && String(q.q).length <= 120
      && q.opts.every((x) => String(x).length <= 30)   // 선지가 길면 첫 화면 카드가 너무 길어진다(크리스 「공간 활용도」)
      && Array.isArray(e.o) && e.o.length === q.opts.length && e.o.every(Boolean)
      && Array.isArray(e.ex) && e.ex.length === q.opts.length && e.ex.every(Boolean) && e.s;
  });
  if (!ok.length) continue;
  const q = ok[seed % ok.length];
  const out = { date: today, cert, certName: ex.name || ex.label || cert, setLabel: shard, n: Number(String(q.id).split('_').pop()) || null,
    id: q.id, q: q.q, opts: q.opts, ans: q.ans, o: q.exp.o, ex: q.exp.ex, s: q.exp.s };
  writeFileSync('lp-sample.json', JSON.stringify(out, null, 1) + '\n');
  console.log('lp-sample:', cert, shard, q.id);
  process.exit(0);
}
console.log('lp-sample: 고를 문항이 없어 그대로 둡니다');
