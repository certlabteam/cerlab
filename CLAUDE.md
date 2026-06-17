# CLAUDE.md — CertLab 엔진 저장소 (certlabteam/cerlab)

이 파일은 Claude Code가 자동으로 읽는 프로젝트 안내서다. CertLab 작업 시 아래 규칙을 따른다.

## 커뮤니케이션
- 한국어 **해요체**로 답한다.
- 약어는 처음 쓸 때 괄호로 한국어 설명: mn(암기코드)·exp.c(개념설명)·exp.o(보기별 해설)·exp.ex(예시/풀이)·cx(예시박스).

## 프로젝트 개요
- **CertLab** = 한국 자격증 기출 학습 PWA. 단일 페이지(`index.html`)에 거대한 인라인 `<script>`로 엔진 전체가 들어 있다(약 330KB).
- 플랫폼: Firebase `certlab-c3bcb` (Firestore·Auth·Storage, Blaze). Cloud Functions는 **별도 저장소**(`certlab-functions`)에 있고 리전은 **asia-northeast3**.
- 호스팅: GitHub Pages (정적). 그래서 서버 라우팅 불가 → URL은 해시(`#post/{id}`) 방식.

## 저장소 파일
- `index.html` — 메인 PWA 엔진(UI·MCQ 풀이·SR 복습·커뮤니티 전부). **대부분의 작업이 여기.**
- `admin.html` — 관리자 도구(회원·결제·포인트·게시판 관리).
- `admin_import.html` — 문항 일괄 업로드(배열 전체 덮어쓰기 방식).
- `preview.html` — 문항 미리보기. index.html의 렌더 로직을 verbatim 이식한 것(직접 재구현 아님 — 드리프트 방지).
- `sw.js`·`manifest.json`·`seo/` — 서비스워커·PWA 매니페스트·정적 SEO 페이지.
- ⚠️ **건드리지 말 것**: `index_old_backup.html`, `index_pre_mcqsr.html`, `index_pre_sr.html` (옛 백업본).

## 안전 수정 절차 (필수)
1. **한 번에 하나씩** 변경한다.
2. index.html은 거대 단일 파일이라, 문자열/정규식 치환 시 **정확히 1곳만 매칭**되는지 먼저 확인(중복 매칭 주의).
3. 수정 후 **검증**:
   - 인라인 `<script>`를 뽑아 `node --check` (문법)
   - 태그 균형(`<div>`/`</div>`, `<script>`/`</script>`, `<button>`/`</button>`)
   - 바꾼 함수가 실제로 동작하는지 핵심 케이스로 따져보기
4. 검증 통과 후 **diff를 보여주고 승인받은 뒤** 커밋·푸시한다.
5. 큰 변경 전엔 백업(예: `git stash` 또는 별도 커밋)으로 되돌릴 수 있게.

## 엔진 주의사항 (수정 시 꼭 기억)
- **이모지 버그**: 생짜 HTML 텍스트 자리에 `\u270D` 같은 escape를 넣으면 화면에 글자 그대로 노출된다 → 반드시 **실제 이모지 문자**(✍️ 등)로. (JS 문자열 리터럴 `'\uXXXX'` 안에서는 런타임 해석되므로 OK.)
- **App Check 켜져 있음**: index/admin/admin_import 세 파일 모두 `firebase.appCheck().activate(new firebase.appCheck.ReCaptchaV3Provider('6Le...'), true)`. Firestore 규칙 강제는 아직 안 함(모니터링 단계). **Cloud Functions에 App Check 강제를 걸지 말 것**(클라이언트 토큰과 안 맞아 막힘).
- **Firestore 보안 규칙**: 현재 `banks`·`manifest` read는 공개(`if true`). 추후 `if request.app != null`로 조일 예정(App Check 모니터링 확인 후).
- **데이터 불변 필드**: 문항의 `q`·`opts`·`ans`·`id`·`set`은 절대 수정 금지. 단, 문항 JSON은 이 저장소에 없다(Firestore에만 있고, 콘텐츠 작업은 별도 '데이터방' 소관). 엔진은 렌더 로직만.
- **커뮤니티 공유 URL**: `#post/{postId}` 해시 라우팅. 글 열 때 `history.replaceState`로 주소만 바꿈(뒤로가기 트랩 안 건드림). 공유는 PC=클립보드 복사, 모바일=네이티브 공유창.
- **SR(복습) 핵심 함수**: `srRateK(cert,id,result,overtime,replace)` — result 0=틀림/1=애매/2=정확. `mqPick(qid,n)`이 객관식 채점 진입점.

## 역할 분담
- **이 저장소(cerlab)** = 엔진·UI·미리보기 = '개발방' 소관.
- **콘텐츠(문항·해설)** = '데이터방' 소관. Firestore에 admin_import로 업로드. 작성 규칙·문항은 여기서 다루지 않는다.
- 설계 누적 문서('엔진 마스터')는 Google Drive에 있다(저장소 밖).

## 커밋 규칙
- 커밋 메시지는 간결하게, "무엇을 왜" 바꿨는지 한 줄. 예: `공지바 중복 아이콘 제거`, `게스트 5문제 기능 안내 팝업 추가`.
- 푸시 후 certlab.ai.kr에서 실제 동작을 확인하는 습관.
