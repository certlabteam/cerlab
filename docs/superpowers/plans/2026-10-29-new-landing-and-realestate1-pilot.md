# 새 첫 화면 + 공인중개사 1차 새 화면(시범) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 첫 화면을 시안대로 바꾸고, 공인중개사 1차(realestate1)에서만 새 「시험 안 첫 화면」·「문제 화면」을 켠다.

**Architecture:** 한 벌짜리 엔진(index.html + index-*.js)은 그대로 두고, 첫 화면은 index.html 의 `.lp-*` 구역만 갈아 끼운다. 시험 안·문제 화면은 manifest 시험 칸 `newUi:true` 로 켜는 갈림길을 `renderMcqHome`·`renderMcqExam` 앞에 하나씩 둔다 — 꺼지면 지금 화면 그대로. 「해설은 이렇게 나와요」 예시는 매일 GitHub Actions 가 정적 파일(lp-sample.json)로 구워 방문자마다 파이어스토어를 읽지 않는다.

**Tech Stack:** 정적 HTML·바닐라 JS(GitHub Pages) · Firestore REST(읽기만) · Node 스크립트(scripts/*.mjs) · GitHub Actions(seo-daily.yml).

**Spec:** `C:\Users\WD\Documents\certlab 컨텐츠\_디자인\시안_20261029\_정한것.md` · 시안 `서트랩시안.html`·`서트랩동작시안.html`(같은 폴더)

## Global Constraints
- 숫자 계단(CLAUDE.md): 글자 12·14·16·18·20·24·30·36·48·60 · 여백 0·1·2·4·6·8·10·12·14·16·20·24·28·32·36·40·44·48·56·64·80·96 · 둥글기 2·4·6·8·12·16·24·999. 넣은 뒤 `python scripts/snap_scale.py style.css` 가 「바꿀 것 없음」.
- 글꼴 Pretendard · 색은 style.css 토큰(--pink3 #185FA5 남색 · --accent #1D9E75 민트 · --wrong #E24B4A) · 빨강은 오답에만.
- 한국어는 단어 기준 줄바꿈(`word-break:keep-all`).
- 문항 불변: q·opts·ans·id·set 은 건드리지 않는다(엔진은 그리기만).
- 판정 딱지는 발문 축 그대로(해당함/해당하지 않음 · 옳음/옳지 않음 — 기존 verdictLabel).
- 예시 표시 「예)」 · 문제 글의 줄바꿈 살림 · 로고는 머리줄 한 번 · 슬로건 「오늘의 기출, 내일의 실력」.
- 생활스포츠지도사 실기·구술에만 있는 기능(시험장 인쇄)은 첫 화면 기능 소개에 넣지 않는다.
- AI 말투 금지(닫다·잇다·얹다·꼴·갈래·짚다 · 다양한·해당 ~·또한·~를 통해).
- 고친 JS 는 `node --check` · 자산 버전은 `node scripts/bump-assets.mjs` · 배포 전 9333 크롬 화면을 크리스께 먼저 보여 승인.

## Review Focus
- 로그인 안 한 사람이 첫 화면 → 시험 → 문제를 끝까지 탈 수 있어야 한다(지금처럼 시험마다 50문제 무료). 새 단추가 로그인 창으로 막으면 안 된다.
- `newUi` 가 없는 시험 61개는 화면이 한 글자도 바뀌지 않아야 한다.
- 공유 링크(`?q=realestate1/intro25_2`)로 들어와도 새 문제 화면이 열려야 하고, 다른 시험 링크는 예전대로.
- lp-sample.json 이 없거나 깨져도 첫 화면은 고정 예시(intro25_2)로 정상 표시.
- 글자 크기 「아주 크게」에서도 휴대폰 폭 390px 에서 가로 스크롤이 생기지 않는다.

---

### Task 1: 첫 화면(랜딩) 갈아 끼우기

**Files:**
- Modify: `index.html` 의 `.lp-hero` 부터 랜딩 끝 `.lp-cta`(약 200~260줄)
- Modify: `style.css` 의 `.lp-*` 규칙

**Interfaces:**
- Consumes: 기존 `lpGo(certId)`·`lpGoList(src)`(첫 화면 단추가 쓰는 함수 그대로)
- Produces: `#lpSample` 칸(Task 2 가 채움) · `#lpSearch` 입력칸

- [ ] **Step 1:** 시안 `서트랩시안.html` ① 첫 화면 차례대로 짠다 — 공감 한 줄(「같은 기출, 보기만 바뀌면 또 틀리지 않나요?」) · 캐릭터(lp-char.png) · 제목 「기출을 보기 하나까지 제대로 풀어 드려요」 · 부제 · 큰 단추 「로그인 없이 바로 풀어 보기」(onclick lpGoList('hero')) · 「해설은 이렇게 나와요」 `#lpSample`(고정 예시 intro25_2 를 처음 값으로) · 장점 장면 2개 · 「서트랩에 있는 기능」 5칸(레벨테스트·레벨업·OX·개념 카드·암기 코드 — 암기 코드는 실제 mn_real_land_natural_features 를 앱 규칙대로 빨강 글자) · 「무료로 이만큼」 · 「62개 시험, 로그인 없이 바로 풀어요」 검색칸 `#lpSearch` + 시험이 가까운 순 4개 + 분야별 묶음.
- [ ] **Step 2:** `#lpSearch` 입력 시 이미 그려진 시험 카드 목록을 이름으로 거른다(새 자료 읽기 없음).
- [ ] **Step 3:** 확인 — `node --check` 로 인라인 스크립트 · `python scripts/snap_scale.py style.css` 「바꿀 것 없음」 · 9333 에서 로그인 없는 새 창(Target.createBrowserContext)·폭 390 으로 열어 사진 · 큰 단추 → 시험 목록 → 공인중개사 1차 → 문제 1번이 열리는지.
- [ ] **Step 4:** 크리스께 사진·9333 화면으로 보여 승인 → `node scripts/bump-assets.mjs` → 커밋 「첫 화면 새로 — 장점 장면·기능 소개·시험 검색(시안 10-29)」 → 푸시 → 라이브 반영 확인.

### Task 2: 「해설은 이렇게 나와요」 매일 자동 예시

**Files:**
- Create: `scripts/lp-sample.mjs`
- Create: `lp-closed.json` — 진척판 「완료」 시험 id 목록(헤드방이 _닫은시험.json 에서 옮겨 적음)
- Modify: `.github/workflows/seo-daily.yml`(lp-sample.mjs 한 줄 더)
- Modify: `index.html`(Task 1 의 `#lpSample` 을 lp-sample.json 으로 채우는 짧은 스크립트)

**Interfaces:**
- Produces: `lp-sample.json` = `{date, cert, certName, setLabel, n, id, q, opts[], ans, o[], ex[], s}`

- [ ] **Step 1:** `lp-sample.mjs` — `lp-closed.json` 의 시험 가운데 시험일이 가장 가까운(지나지 않은) 시험을 고른다(시험일은 앱이 쓰는 같은 자료 — `loadExamSchedules` 가 읽는 곳을 REST 로). 그 시험의 가장 최근 회차 은행에서 해설(o·ex·s)이 다 찬 객관식 문항 중 날짜를 씨앗으로 하나 고른다(같은 날엔 같은 문항). 고를 게 없으면 파일을 안 바꾼다.
- [ ] **Step 2:** 첫 화면 스크립트 — `fetch('lp-sample.json')` 성공하면 `#lpSample` 을 그 문항으로, 실패하면 고정 예시 그대로. 예시 표시는 「예)」, 판정 딱지는 발문 축.
- [ ] **Step 3:** 확인 — `node scripts/lp-sample.mjs` 를 로컬에서 돌려 lp-sample.json 이 생기고 cert 가 lp-closed.json 안에 있는지 · lp-sample.json 을 지운 채 첫 화면을 열어 고정 예시가 나오는지.
- [ ] **Step 4:** 커밋 「첫 화면 예시 문항을 매일 우선순위 시험으로(정적 파일)」 → 다음 날 seo-daily 실행 뒤 lp-sample.json 이 바뀌었는지 확인.

### Task 3: 시험별 새 화면 스위치

**Files:**
- Modify: `index-5-shell.js`(manifest 를 읽는 `buildCertRegistry` 근처)
- 자료: manifest/exams 의 realestate1 칸에 `newUi:true`(헤드방이 pushdesc.py 처럼 manifestUpdate 트랜잭션으로 그 칸만)

**Interfaces:**
- Produces: `function uiNew(cert) -> boolean`(manifest 시험 칸 newUi 가 true 인가 · 관리자는 `?newui=1` 로 다른 시험도 미리 보기)

- [ ] **Step 1:** `uiNew` 구현 · `node --check`.
- [ ] **Step 2:** 확인 — 콘솔에서 `uiNew('realestate1')===true`, `uiNew('housing')===false`.

### Task 4: 공인중개사 1차 「시험 안 첫 화면」

**Files:**
- Modify: `index-3-mcq.js` `renderMcqHome(root)`(224줄) 맨 앞에 `if(uiNew(mqCert)) return renderMcqHomeNew(root);`
- Create 함수: `renderMcqHomeNew(root)` 같은 파일

**Interfaces:**
- Consumes: `uiNew` · 지금 `renderMcqHome` 이 쓰는 자료 함수 그대로(이어 풀기 포인터·레벨테스트 여부·복습 대기 수·과목별 기출 회차·레벨업 수) — 새 자료 읽기를 만들지 않는다.

- [ ] **Step 1:** 시안 ② 차례로 그린다 — 맨 위 큰 카드(레벨테스트 전: 「10분 레벨테스트로 내 예상점수부터」+ 시작 / 뒤: 「오늘 할 일 · 예상점수」+ 이어 풀기) · 복습 카드(오늘 복습할 문제 수 · 복습 시작 · 오답노트) · OX 개념 학습 · 과목별 기출 · 과목별 레벨업(5문제 풀기) · 모의고사·암기 코드·개념 카드·커뮤니티 칸. 단추마다 지금 화면의 같은 동작 함수를 부른다.
- [ ] **Step 2:** 확인 — 로그인 없는 새 창과 로그인된 9333 둘 다에서 realestate1 을 열어 사진 · 단추 하나씩 눌러 예전 화면과 같은 곳으로 가는지 · housing 을 열어 예전 화면 그대로인지.
- [ ] **Step 3:** 크리스 승인 → bump → 커밋 「공인중개사 1차 새 시험 안 화면(시범 · newUi)」 → 푸시 → manifest newUi 켜기 → 라이브 확인.

### Task 5: 공인중개사 1차 「문제 화면」 글자 크기·큰 글씨

**Files:**
- Modify: `index-4-learn.js` `renderMcqExam(root)`(1508줄) — 머리줄에 글자 크기 단추
- Modify: `style.css` — `#mcqRoot.fs1`·`.fs2` 계단 값

**Interfaces:**
- Consumes: `uiNew`
- Produces: `mqFontCycle()` · localStorage 「certlab_fs」(0·1·2, 읽고 쓸 때 try/catch)

- [ ] **Step 1:** `uiNew(mqCert)` 일 때만: 머리줄 「가+ 보통/크게/아주 크게」 단추 · 누르면 `#mcqRoot` 에 fs0/fs1/fs2 · 문제 글 18→20→24 · 보기 18→20→24 · 해설 16→18→20(전부 계단 값) · 문제 글 줄바꿈 살림(`white-space:pre-line` 이 기존 문항 그리기와 안 겹치는지 qbul 확인).
- [ ] **Step 2:** 확인 — 9333 폭 390 에서 세 단계 사진 · 가로 스크롤 없음 · 공유 링크 `?q=realestate1/intro25_1` 로 들어와도 단추가 있음 · `?q=housing/...` 엔 없음.
- [ ] **Step 3:** 크리스 승인 → bump → 커밋 「공인중개사 1차 문제 화면 글자 크기 단추(시범)」 → 푸시 → 라이브 확인.

### Task 6: 공인중개사 2차(예전 화면)와 비교 — 빠지거나 바뀐 기능 없는지 (크리스 10-29 「만들고 공인중개사 2차랑 비교해서 기존 기능을 없애거나 변경한 거 없는지 검토해」)

**Files:**
- Create: `C:\Users\WD\Documents\certlab 컨텐츠\_디자인\시안_20261029\기능대조_realestate1_vs_2.md`

- [ ] **Step 1:** 9333 에서 realestate2(예전)와 realestate1(새) 시험 안 첫 화면을 각각 열어, 누를 수 있는 모든 단추·링크(onclick 함수 이름과 글자)를 뽑는다 — 로그인 전·로그인 뒤 두 상태.
- [ ] **Step 2:** 두 목록을 한 표로 맞춘다: 예전에만 있는 것(빠짐) · 이름이나 가는 곳이 바뀐 것(바뀜) · 새로 생긴 것. 빠짐·바뀜이 0 이 될 때까지 Task 4 를 고친다(일부러 뺀 것은 크리스 승인 줄을 적는다).
- [ ] **Step 3:** 문제 화면도 같은 방식 — 한 문항 풀이·정답 해설·신고 의견·찍었어요·OX·개념 카드·암기 코드·이전/다음·타이머까지 두 시험에서 같은지.
- [ ] **Step 4:** 대조표를 크리스께 보여 드린 뒤에 배포.

(하루 목표 · 암기 코드 듣기 단추는 이 계획 밖 — Task 4·5 가 안정된 뒤 따로 계획.)
