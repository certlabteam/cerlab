#!/usr/bin/env node
/* ?v= 자동화 — HTML이 부르는 로컬 자산의 내용 해시로 버전 쿼리를 다시 쓴다.
 *
 * 왜: "고쳤는데 안 나간다"가 반복됐다. index-5-shell.js 를 고치고 ?v= 를 안 올려
 *     브라우저가 옛 파일을 계속 썼고, 그 사실을 모른 채 "고쳤다"고 보고했다(2026-08-06, 두 번).
 *     날짜 문자열을 사람이 올리는 방식은 잊어버리고, 파일마다 값이 달라 표류한다
 *     (실제로 qc-core.js 가 20260806d·20260805c 두 벌로 불리고 있었다).
 *
 * 어떻게: 자산 파일 내용의 sha1 앞 8자를 ?v= 에 박는다. 내용이 그대로면 값도 그대로라
 *         쓸데없는 diff 가 안 생기고, 한 글자라도 바뀌면 모든 HTML 에서 한꺼번에 바뀐다.
 *
 * 쓰기: node scripts/bump-assets.mjs          (고치고 결과 출력)
 *       node scripts/bump-assets.mjs --check   (안 고치고 어긋난 것만 보고 · 종료코드 1)
 *       node scripts/bump-assets.mjs --print-changed (고치고, 바뀐 HTML 이름만 한 줄씩 — 훅용)
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* 옛 백업본은 건드리지 않는다 (CLAUDE.md) */
const SKIP_HTML = new Set(['index_old_backup.html', 'index_pre_mcqsr.html', 'index_pre_sr.html']);

const checkOnly = process.argv.includes('--check');
const printChanged = process.argv.includes('--print-changed');
const hashes = new Map();

/*
 * 줄 끝을 LF 로 골라 놓고 센다.
 *
 * 윈도우 작업복사본은 CRLF, 리눅스(깃허브 러너)는 LF 라 같은 파일이 다른 해시가
 * 나왔다. 자동 갱신을 걸었더니 자산은 그대로인데 ?v= 만 26군데 뒤집혔고, 그대로
 * 두면 날마다 오락가락하면서 이용자가 css·js 를 매일 새로 받게 된다.
 *
 * 바이트가 아니라 '내용' 이 바뀌었을 때만 해시가 바뀌어야 맞다.
 */
function assetHash(rel) {
  if (hashes.has(rel)) return hashes.get(rel);
  const p = join(ROOT, rel);
  if (!existsSync(p) || !statSync(p).isFile()) { hashes.set(rel, null); return null; }
  /* 그림·글꼴은 바이트 그대로 센다. 글자로 읽으면 깨져서 서로 다른 파일이 같아 보인다. */
  const buf = readFileSync(p);
  const isText = /\.(css|js|mjs|json|svg|txt|html|xml)$/i.test(rel);
  const h = createHash('sha1')
    .update(isText ? buf.toString('utf8').replace(/\r\n/g, '\n') : buf)
    .digest('hex').slice(0, 8);
  hashes.set(rel, h);
  return h;
}

const htmlFiles = readdirSync(ROOT).filter(f => f.endsWith('.html') && !SKIP_HTML.has(f));
const changes = [];

for (const file of htmlFiles) {
  const p = join(ROOT, file);
  const src = readFileSync(p, 'utf8');
  const out = src.replace(/((?:src|href)=")([^"?#]+)\?v=([^"#]*)(")/g, (m, pre, asset, ver, post) => {
    if (/^(https?:)?\/\//.test(asset)) return m;          // 바깥 자원은 건드리지 않음
    const h = assetHash(asset.replace(/^\.?\//, ''));
    if (!h) return m;                                      // 저장소에 없는 파일은 그대로
    if (h === ver) return m;
    changes.push({ file, asset, from: ver, to: h });
    return pre + asset + '?v=' + h + post;
  });
  if (out !== src && !checkOnly) writeFileSync(p, out);
}

if (printChanged) {                                        // 훅용 — 바뀐 HTML 이름만
  [...new Set(changes.map(c => c.file))].forEach(f => console.log(f));
  process.exit(0);
}

if (!changes.length) {
  console.log('?v= 최신 — 고칠 것 없음');
  process.exit(0);
}

const byAsset = new Map();
for (const c of changes) {
  if (!byAsset.has(c.asset)) byAsset.set(c.asset, { to: c.to, froms: new Set(), files: [] });
  const e = byAsset.get(c.asset);
  e.froms.add(c.from); e.files.push(c.file);
}
console.log(checkOnly ? '?v= 어긋남 (고치지 않음):' : '?v= 갱신:');
for (const [asset, e] of byAsset) {
  console.log(`  ${asset}  ${[...e.froms].join('/')} → ${e.to}   [${e.files.join(', ')}]`);
}
process.exit(checkOnly ? 1 : 0);
