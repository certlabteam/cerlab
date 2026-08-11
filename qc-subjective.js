/* qc-subjective.js — 2차 주관식(서술형) 전용 검수 게이트
 *
 * [2026-08-11] qc-core.js / qc-gate-patch.js 는 1차 객관식 전용이다. opts·exp.o 기준으로 짜여 있어
 *   asks·outline 을 아예 안 본다(언급 0건). 그래서 2차는 지금까지 검수를 한 번도 못 받았고,
 *   빈 목차·빈 본문·끊긴 문장이 전부 그냥 통과했다. 이 파일이 그 구멍을 메운다.
 *
 * ── 어떻게 눈금을 맞췄나 ────────────────────────────────────────────────
 * 감평2차에서 크리스가 「이상 없다」고 확인한 노출본 79문항(물음 159 · 블록 1,209)을
 * 프로파일링해서, 거기 걸리는 규칙은 전부 내렸다. 정상본에 있는 건 결함이 아니다.
 *
 *   정상본 실측:  물음 1~6(중앙 2) · 블록 3~20(중앙 7) · 본문 21~391자(중앙 179)
 *                kw 0~4(중앙 3) — kw 없는 블록이 정상본에도 있다
 *                ref  없음 958 · 제N조형식 237 · 기타형식 14 — 기타형식도 정상본에 있다
 *                lv 1·2·3만 사용 · role 13종, 빠진 것 0
 *                배점불일치 0 · pt없음 0 · 물음q빈것 0 · 목차h빈것 0 · id중복 0
 *
 * 그래서 kw·법조문형식·계산최종수치는 **info**(세기만 함)로 내렸다.
 * 2차 채점은 AI 채점(aiPayload 가 outline 전체를 모범답안으로 서버에 넘김)으로 가기로 했고,
 * kw 기반 오프라인 채점은 정본이 아니다. 필요하면 {kw:true} 로 켠다.
 *
 * ── 시험별 분기 ────────────────────────────────────────────────────────
 * 주관식 2차는 시험마다 편차가 크다(물음 수·블록 수·법조문 비중·계산 유무).
 * PROFILES 에 시험 id 로 프로파일을 넣으면 그 시험 눈금으로 돈다. 없으면 _default(느슨).
 * 새 주관식 시험이 들어오면 그 시험 정상본을 프로파일링해서 여기 한 칸 추가하면 된다.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CLSubjQC = api; root.subjectiveGate = api.subjectiveGate; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // 조사·연결어로 끝나면 문장이 잘린 것 (제32회 실무에서 34블록이 '…수치는' 으로 끊겨 있었다)
  var TRUNC = /(수치는|확정은|검토는|판단은|결정은|산정은|반영은|여부는|기준은|처리는|구성은|하여|하며|하고|이며|이고|되어|되며|및|또는|그리고|따라서)$/;
  var OK_END = /(다|음|함|임|것|바|점|요|오|시오|\)|］|%|원|㎡|년|월|일|호|배|개|·)$/;
  var LAW_REF = /제\s?\d+\s?조/;
  var MONEY = /\d{1,3}(,\d{3})+|\d+(\.\d+)?\s*%/;

  /* [2026-08-11] 작업 흔적이 본문에 그대로 남은 것. 사진에서 옮기다 끊긴 자리를 표시해 둔 말들이
   *   학생 화면에 그대로 나간다(제8회 이론 1번 「이후 답안은 이미지 경계에서 잘림」).
   *   ⚠ 「미상」·「채워야」 같은 흔한 말은 넣지 말 것 — 정상본 문장에 그대로 쓰인다.
   *   좁힌 표현으로 정상본 95문항 오탐 0 확인. */
  var WORK_NOTE = /(잘림|잘려|이미지\s*경계|판독\s*불가|원문\s*확인|추후\s*보완|TODO)/;

  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ''); }

  /* 목차 제목에 박힌 수동 번호. 「2013.07.01 기준 기초가액」 같은 날짜를 번호로 오인하면 안 되므로
   * 아라비아 숫자는 1~2자리이고 뒤에 숫자가 이어지지 않을 때만 번호로 본다. */
  /* [2026-08-11] ASCII 로마자(I. II. III.)를 놓치고 있었다. 전각(Ⅰ)만 보고 있었기 때문이다.
   *   실측 37건이 새어 나갔고 그중 5건은 노출본이라 지금 화면에 「Ⅰ. I. 서」로 두 번 찍히고 있다.
   *   ⚠ 한 글자 알파벳(A. B.)까지 넣으면 「A. 감정평가」 같은 정상 제목을 잡을 위험이 있어
   *      로마자로 읽히는 조합(I·V·X)만 본다. */
  var HEAD_NUM = /^\s*(?:[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\s*[.·)]|[IVX]{1,4}\s*[.)]|\(\s*\d{1,2}\s*\)|\d{1,2}\s*[.·)](?!\d)|[가나다라마바사아자차]\s*[.·)])\s*/;
  function stripHeadNum(h) { return String(h == null ? '' : h).replace(HEAD_NUM, '').trim(); }
  // lv 별로 엔진이 붙이는 번호 꼴 — 수동 번호가 이것과 다르면 형식까지 어긋난 것
  var LV_STYLE = { 1: '로마(Ⅰ.)', 2: '아라비아(1.)', 3: '괄호숫자((1))', 4: '한글(가.)' };
  function lastLine(b) { return String(b || '').trim().split(/\n/).pop().trim().replace(/[.)\]]+$/, ''); }
  function J(x) { try { return typeof x === 'string' ? JSON.parse(x) : x; } catch (e) { return x; } }

  /* 규칙 사전 — sev 는 기본값. 프로파일의 sev 로 시험별 조정 가능.
   *   block = 렌더·채점이 불가능하다(학생이 눌러도 아무것도 안 나온다)
   *   warn  = 고쳐야 한다
   *   info  = 세기만 한다 (기본은 경고에 안 올림) */
  var RULES = {
    S_NO_ASKS:       { sev: 'block', msg: '물음(asks)이 없다 — 화면에 아무것도 안 나온다' },
    S_NO_OUTLINE:    { sev: 'block', msg: '물음에 목차(outline)가 없다 — 모범답안을 눌러도 빈 화면' },
    S_DUP_ID:        { sev: 'block', msg: '문항 id 중복' },
    S_EMPTY_Q:       { sev: 'block', msg: '문제(q) 본문이 비었다' },
    S_EMPTY_ASK_Q:   { sev: 'block', msg: '물음 본문이 비었다' },

    // [2026-08-11 크리스 발견] 제34회 실무 1번 — 자료 11개가 한 줄씩으로 뭉개져 격차율표·표준단가표·
    //   현가계수표가 통째로 없었다. 목차·본문은 멀쩡해서 다른 규칙엔 안 걸린다.
    // ⚠ 다만 「(요약)」은 원본 시험지에도 쓰인다 — 제30회 실무 2번 자료1이 원본부터 「의뢰 내역(요약)」이다.
    //   그래서 block 이 아니라 info 다. 걸리면 원본 PDF 와 대조해서 사람이 판정한다.
    S_JARYO_SUMMARY: { sev: 'info',  msg: '자료에 「요약」 표시가 있다 — 원본과 대조 필요(원본 표현일 수도 있음)' },
    S_EMPTY_BODY:    { sev: 'warn',  msg: '목차 블록 본문이 비었다 — 제목만 보이고 답이 없다' },
    S_TRUNC_BODY:    { sev: 'warn',  msg: '본문이 조사·연결어로 끝나 문장이 잘렸다' },
    S_SHORT_BODY:    { sev: 'warn',  msg: '본문이 너무 짧다 — 모범답안 구실을 못 한다' },
    S_EMPTY_HEAD:    { sev: 'warn',  msg: '목차 제목(h)이 비었다' },
    // [2026-08-11 크리스 발견] 「Ⅰ. + Ⅰ. 서」로 번호가 두 번 찍힌다.
    //   번호는 subjective.js _mokchaNum 이 lv 로 자동 생성한다 — lv1 Ⅰ. / lv2 1. / lv3 (1) / lv4 가.
    //   그러니 h 에는 번호를 넣지 않는다. 법규 1,750블록이 전부 번호 없이 돼 있는 게 이 원칙의 증거다.
    S_HEAD_HAS_NUM:  { sev: 'warn',  msg: '목차 제목에 번호가 박혀 있다 — 자동번호와 겹쳐 두 번 찍힌다' },
    S_NO_ROLE:       { sev: 'warn',  msg: '논점 성격(role)이 없다' },
    S_NO_PT:         { sev: 'warn',  msg: '물음 배점(pt)이 없다' },
    S_PT_SUM:        { sev: 'warn',  msg: '물음 배점 합이 문항 배점과 다르다' },
    S_ASKS_RANGE:    { sev: 'warn',  msg: '물음 개수가 이 시험 범위를 벗어난다' },
    S_BLOCKS_RANGE:  { sev: 'warn',  msg: '목차 블록 수가 이 시험 범위를 벗어난다' },
    S_LV_SKIP:       { sev: 'warn',  msg: '목차 레벨이 건너뛴다 — 자동번호가 어긋난다' },
    S_LV_RANGE:      { sev: 'warn',  msg: '목차 레벨이 이 시험 범위를 벗어난다' },
    S_NO_ASRC:       { sev: 'warn',  msg: '답안 출처(asrc: 외부·자체·미상) 표시가 없다' },
    S_HIDDEN_NO_WHY: { sev: 'warn',  msg: '숨김인데 이유(hidWhy)가 없다' },

    // [2026-08-11] 눈으로만 잡히던 두 가지. 정상본 95문항(노출 실무40+이론55) 실측으로 눈금을 맞췄다.
    S_WORK_NOTE:     { sev: 'block', msg: '본문에 작업 흔적이 남아 있다 — 학생 화면에 그대로 나간다' },
    S_THIN_BLOCK:    { sev: 'warn',  msg: '목차만 벌려 놓고 본문이 얇다 — 블록당 글자수가 정상본 최저 미만' },

    // AI 채점이 정본이라 아래 넷은 기본 info — {kw:true} 로 켠다
    S_NO_KW:         { sev: 'info',  msg: '채점 키워드(kw)가 없는 블록 (오프라인 채점 기준)' },
    S_KW_ABSENT:     { sev: 'info',  msg: 'kw 가 모범답안 본문에 없다 (오프라인 채점 기준)' },
    S_BAD_REF:       { sev: 'info',  msg: 'ref 가 「제N조」 형식이 아니다 (오프라인 채점 기준)' },
    S_CALC_NO_ANS:   { sev: 'info',  msg: '계산형인데 마지막 블록에 최종 수치가 없다' }
  };

  /* 시험별 프로파일.
   * 범위는 그 시험 '정상본' 실측에 여유를 준 값이다. 근거 없이 조이지 말 것 —
   * 정상본이 걸리면 그건 규칙이 틀린 것이지 데이터가 틀린 게 아니다. */
  var PROFILES = {
    appraiser2: {
      name: '감정평가사 2차',
      기준: '크리스 확인 노출본 79문항(2026-08-11) 실측: 물음 1~6 · 블록 3~20 · 본문 21~391자 · lv 1~3',
      asks: [1, 8],        // 실측 1~6
      blocks: [2, 26],     // 실측 3~20
      body: [20, 800],     // 실측 21~391
      lv: [1, 4],          // 실측 1~3, 엔진은 4까지 지원
      needRole: true,      // 실측 role 누락 0
      needPt: true,        // 실측 pt 누락 0
      ptSum: true,         // 실측 배점 불일치 0
      // [2026-08-11] 블록당 본문 글자수 하한. 정상본 95문항 실측 최소 51.9 · 5% 88.7 · 중앙 170.1.
      //   자/점으로는 못 가른다 — 정상본 최저가 21.2자/점인데 뼈대만 남은 답안이 22.4자/점이었다.
      //   같은 배점·비슷한 글자수여도 목차를 두 배로 벌리면 블록당 글자수에서 드러난다.
      //   정상본 최소 51.9 를 그대로 쓰면 그 문항(제2회 이론 3번)이 자기 자신에 걸린다 → 45 로 내렸다.
      perBlock: 45,        // 미만이면 S_THIN_BLOCK (정상본 오탐 0 · 숨김본 4문항 적발)
      sev: {}              // 기본 등급 그대로
    },
    // 새 주관식 시험은 정상본을 프로파일링한 뒤 위 형식으로 한 칸 추가한다.
    _default: {
      name: '(프로파일 없음 — 느슨한 기본값)',
      기준: '실측 전. 구조 결함만 본다.',
      asks: [1, 20], blocks: [1, 60], body: [1, 3000], lv: [1, 4],
      needRole: false, needPt: false, ptSum: false, perBlock: 0,
      sev: { S_SHORT_BODY: 'info', S_ASKS_RANGE: 'info', S_BLOCKS_RANGE: 'info', S_LV_RANGE: 'info' }
    }
  };

  function profileFor(exam) { return PROFILES[exam] || PROFILES._default; }

  // 계산형인가 — 자료에 금액이 있거나 kw 에 자릿수 큰 수가 여럿
  function isCalcQ(q) {
    var t = String(q && q.q || '');
    if (/\[자료|〈자료|<자료|자료\s*\d/.test(t) && /\d{1,3}(,\d{3})+/.test(t)) return true;
    var hit = 0;
    (J(q && q.asks) || []).forEach(function (a) {
      (a.outline || []).forEach(function (n) {
        (n.kw || []).forEach(function (k) { if (/\d{1,3}(,\d{3})+/.test(String(k))) hit++; });
      });
    });
    return hit >= 3;
  }

  // 문항 하나 검사 → [{code, where, detail}]
  function checkOne(q, P) {
    P = P || PROFILES._default;
    var v = [];
    function add(code, where, detail) { v.push({ code: code, where: where || '', detail: detail || '' }); }
    if (!q || typeof q !== 'object') return v;

    var stem = String(q.q || '');
    if (!stem.trim()) add('S_EMPTY_Q');
    // 자료를 「(요약)」으로 대신한 곳 — 표가 통째로 빠져 있다
    var sm = stem.match(/\(\s*요약\s*\)/g);
    if (sm) add('S_JARYO_SUMMARY', '', sm.length + '곳');
    if (!q.asrc) add('S_NO_ASRC');
    if (q.hidden && !q.hidWhy) add('S_HIDDEN_NO_WHY');

    var asks = J(q.asks);
    if (!Array.isArray(asks) || !asks.length) { add('S_NO_ASKS'); return v; }
    if (asks.length < P.asks[0] || asks.length > P.asks[1])
      add('S_ASKS_RANGE', '', asks.length + '개 (기준 ' + P.asks[0] + '~' + P.asks[1] + ')');

    var ptSum = 0, calc = isCalcQ(q);
    asks.forEach(function (a, ai) {
      var tag = '물음' + (a.n != null ? a.n : ai + 1);
      ptSum += (+a.pt || 0);
      if (P.needPt && !(+a.pt)) add('S_NO_PT', tag);
      if (!String(a.q || '').trim()) add('S_EMPTY_ASK_Q', tag);

      var nodes = a.outline || [];
      if (!nodes.length) { add('S_NO_OUTLINE', tag); return; }
      if (nodes.length < P.blocks[0] || nodes.length > P.blocks[1])
        add('S_BLOCKS_RANGE', tag, nodes.length + '블록 (기준 ' + P.blocks[0] + '~' + P.blocks[1] + ')');

      var prevLv = 0;
      nodes.forEach(function (n, ni) {
        var where = tag + ' · ' + (n.h || ('블록' + (ni + 1)));
        var body = String(n.body == null ? '' : n.body).trim();
        var lv = +n.lv || 1;

        if (lv < P.lv[0] || lv > P.lv[1]) add('S_LV_RANGE', where, 'lv ' + lv);
        else if (prevLv && lv > prevLv + 1) add('S_LV_SKIP', where, 'lv ' + prevLv + ' → ' + lv);
        prevLv = lv;

        var hh = String(n.h || '');
        if (!hh.trim()) add('S_EMPTY_HEAD', tag + ' · 블록' + (ni + 1));
        else if (HEAD_NUM.test(hh))
          add('S_HEAD_HAS_NUM', tag + ' · 블록' + (ni + 1), '「' + hh.slice(0, 24) + '」 → 「' + stripHeadNum(hh).slice(0, 24) + '」 (lv' + lv + ' 자동번호 ' + (LV_STYLE[lv] || '') + ')');
        if (P.needRole && !String(n.role || '').trim()) add('S_NO_ROLE', where);

        if (!body) add('S_EMPTY_BODY', where);
        else {
          var L = lastLine(body);
          if (!OK_END.test(L) && TRUNC.test(L)) add('S_TRUNC_BODY', where, '…' + L.slice(-16));
          if (body.length < P.body[0]) add('S_SHORT_BODY', where, body.length + '자');
          else if (body.length > P.body[1]) add('S_SHORT_BODY', where, body.length + '자 (너무 김)');
          var wn = body.match(WORK_NOTE);
          if (wn) add('S_WORK_NOTE', where, '「' + wn[0] + '」');
        }

        var kws = n.kw || [];
        if (!kws.length) add('S_NO_KW', where);
        else if (body) {
          var bn = norm(body);
          var miss = kws.filter(function (k) { return bn.indexOf(norm(k)) < 0; });
          if (miss.length && miss.length * 2 > kws.length)
            add('S_KW_ABSENT', where, miss.slice(0, 4).join('·') + (miss.length > 4 ? ' 외 ' + (miss.length - 4) : ''));
        }
        if (n.ref && !LAW_REF.test(String(n.ref))) add('S_BAD_REF', where, String(n.ref).slice(0, 30));
      });

      if (calc && !MONEY.test(String((nodes[nodes.length - 1] || {}).body || ''))) add('S_CALC_NO_ANS', tag);
    });

    if (P.ptSum && q.pt != null && ptSum && +q.pt !== ptSum)
      add('S_PT_SUM', '', q.pt + '점 vs 물음합 ' + ptSum + '점');

    /* 목차만 벌려 놓고 각 칸을 얇게 채운 답안 — 문항 단위로 본다.
     * 블록별 S_SHORT_BODY(20자)로는 안 걸린다. 45자짜리 블록이 열 개면 블록마다는 통과하지만
     * 20점 답안으로는 뼈대뿐이다. 이걸 잡으려고 문항 전체의 블록당 평균으로 잰다. */
    if (P.perBlock) {
      var tb = 0, tc = 0;
      asks.forEach(function (a) {
        (a.outline || []).forEach(function (n) {
          tb++; tc += String(n.body == null ? '' : n.body).trim().length;
        });
      });
      if (tb && tc / tb < P.perBlock)
        add('S_THIN_BLOCK', '', tb + '블록 ' + tc + '자 → 블록당 ' + (tc / tb).toFixed(1) + '자 (기준 ' + P.perBlock + '자)');
    }
    return v;
  }

  /* questions 배열 검수
   *   opts.exam       시험 id (프로파일 선택). 없으면 _default
   *   opts.kw         true 면 info 등급도 경고에 올린다 (오프라인 채점 점검용)
   *   opts.skipHidden true 면 숨김 문항은 건너뛴다
   * → { block:[], warn:[], info:[], rows:[], stat:{}, profile, total } */
  function subjectiveGate(questions, opts) {
    opts = opts || {};
    var P = profileFor(opts.exam);
    var qs = Array.isArray(questions) ? questions : [];
    var block = [], warn = [], info = [], rows = [], stat = {}, seen = {}, n = 0;

    qs.forEach(function (q) {
      if (!q || typeof q !== 'object') return;
      if (opts.skipHidden && q.hidden) return;
      // 객관식은 이 게이트 대상이 아니다 — qc-core 가 본다
      if (!q.asks && (q.opts || q.choices)) return;
      n++;

      var id = q.id || '(id없음)';
      var found = checkOne(q, P);
      if (seen[id]) found.unshift({ code: 'S_DUP_ID', where: '', detail: '' });
      seen[id] = 1;

      found.forEach(function (x) {
        x.id = id;
        rows.push(x);
        stat[x.code] = (stat[x.code] || 0) + 1;
        var base = RULES[x.code] || { sev: 'warn', msg: x.code };
        var sev = (P.sev && P.sev[x.code]) || base.sev;
        var line = id + (x.where ? ' · ' + x.where : '') + ' — ' + base.msg + (x.detail ? ' [' + x.detail + ']' : '');
        if (sev === 'block') block.push(line);
        else if (sev === 'info') { info.push(line); if (opts.kw) warn.push(line); }
        else warn.push(line);
      });
    });

    return { block: block, warn: warn, info: info, rows: rows, stat: stat, total: n, profile: P, RULES: RULES };
  }

  function isSubjectiveExam(examMeta) { return !!(examMeta && examMeta.type === 'subjective'); }
  function examIdOf(docId) { return String(docId || '').split('__')[0]; }

  return {
    subjectiveGate: subjectiveGate, checkOne: checkOne, isSubjectiveExam: isSubjectiveExam,
    examIdOf: examIdOf, RULES: RULES, PROFILES: PROFILES,
    stripHeadNum: stripHeadNum, HEAD_NUM: HEAD_NUM, LV_STYLE: LV_STYLE
  };
});
