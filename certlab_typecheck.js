/* CertLab 문제 타입 검수기 (question type checker)
 * V2 형식 분류표(00-index) 기준 + 신규 형식(OX/ORDER/MATCH) 확장.
 * 문항 q → {type, pol, calc, fig, autoType, mismatch}
 *
 * [유지보수 원칙] 엔진/qccore 판정을 재사용한다(중복 구현 금지 → 드리프트 방지, V2 §설계원칙).
 *   - isComboQuestion(opts)  : 있으면 COMBO 판정에 재사용
 *   - _isCalcQ(q)            : 있으면 calc 판정에 재사용(엔진 기준 = oFilled===1 & 풀이단계)
 *   없을 때만(standalone) 아래 폴백 로직을 쓴다. 엔진 로직이 바뀌면 검수기가 자동으로 따라간다.
 *
 * type   = 답 고르는 '방식'(단일값). 엔진은 모양 자동판별이라 이 값은 검수용.
 *          q.type(데이터방 의도)이 있으면 자동판별과 비교해 mismatch로 표시(V2 §248).
 * calc   = 엔진 _isCalcQ 기준(해설 있으면 oFilled===1&풀이단계, 없으면 보기모양) — 독립 bool 플래그
 * pol    = 'pos'|'neg' 부정형 극성 — 독립 축(SC/NEG 통합, COMBO도 부정형 가능)
 * fig    = 그림/도표 의존 — 독립 bool 플래그
 */
(function (root) {
  var reCombo = /^[ㄱㄴㄷㄹㅁㅂㅅㅇ㉠㉡㉢㉣㉤](\s*[,·]\s*[ㄱㄴㄷㄹㅁㅂㅅㅇ㉠㉡㉢㉣㉤])+$/;
  var reOX = /[ㄱㄴㄷㄹㅁ]\s*(참|거짓|[○×ⓞ])/;
  var reArrow = /[ㄱㄴㄷㄹㅁA-EＡ-Ｅ가-힣]\s*(→|➝|⟶)\s*[ㄱㄴㄷㄹㅁA-EＡ-Ｅ가-힣]/;
  var rePairLbl = /[ㄱㄴㄷㄹㅁ㉠㉡㉢㉣]\s*[:：]\s*\S/;
  var reNeg = /옳지\s*않은|옳지않은|아닌\s*것|아닌것|틀린|해당[하되]지\s*않|않는\s*것|않은\s*것은|않은\s*경우|없는\s*(것|자|곳|경우|사람|기관|지역|때|내용|명칭|사항|자산|권리|항목)|될\s*수\s*없|할\s*수\s*없는|않아도\s*되는|잘못|연결되지\s*않|바르지\s*않|제외되는/;
  var reFig = /〈?그림〉?|〈?도표〉?|그래프|회로|배선도|계통도/;
  var reCount = /몇\s*개|개수(는|인가)/;
  var reFillMark = /㉠|㉡|들어갈|빈칸|나열한 것|순서대로 나열/;
  var reOrderStem = /크기\s*순서|순서대로\s*나열|순서로\s*나열|작은\s*것부터|큰\s*것부터|오름차순|내림차순|일어난\s*순서|시대\s*순/;
  var reMatch = /(바르게|옳게|옳은).{0,5}(묶|연결|짝)|짝지은|짝지어/;

  function opts(q) { return (q && Array.isArray(q.opts)) ? q.opts : []; }
  function oArr(q) { return (q && q.exp && Array.isArray(q.exp.o)) ? q.exp.o : []; }
  function oFilled(q) { return oArr(q).filter(function (x) { return x && String(x).trim(); }).length; }
  function stem(q) { var s = String((q && q.q) || '').replace(/\n/g, ' '); var m = s.match(/[?？]/); return m ? s.slice(0, m.index + 1) : s; }
  function stmtCount(q) { var m = String((q && q.q) || '').match(/(?:^|[\s\n])[ㄱㄴㄷㄹㅁㅂㅅㅇ][.．]/g); return m ? new Set(m.map(function (x) { return x.trim()[0]; })).size : 0; }
  function blankCount(q) { var m = String((q && q.q) || '').match(/\(\s*[ㄱㄴㄷㄹㅁ]\s*\)/g); return m ? m.length : 0; }

  function isCombo(o) { return o.filter(function (x) { return reCombo.test(String(x).trim()); }).length >= 2; }
  function isOX(o) { return o.filter(function (x) { return reOX.test(String(x).trim()); }).length >= 2; }
  function isOrderSeq(o) {
    return o.filter(function (x) {
      var seps = (String(x).match(/[\-–—→>＞]/g) || []).length;
      var core = String(x).replace(/[()（）\s\-–—→>＞]/g, '');
      return seps >= 2 && core.length <= 8;
    }).length >= 2;
  }
  function isPair(o) { return o.filter(function (x) { return rePairLbl.test(String(x)); }).length >= 2; }
  function sentenceLike(x) { x = String(x); return x.length >= 40 || /(다|음|까|없다|있다)\s*[.]?\s*$/.test(x.trim()); }
  function isFillOpts(o) {
    if (o.filter(function (x) { return (String(x).match(/[㉠㉡㉢㉣㉤]/g) || []).length >= 2; }).length >= 2) return true;
    var listish = o.filter(function (x) { return /[·\/]/.test(x) || /㉠/.test(x); }).length;
    var sents = o.filter(sentenceLike).length;
    return listish >= 2 && sents < 2;
  }
  function numTuple(o) {
    return o.filter(function (x) {
      if (!/\d/.test(x)) return false;
      var kor = (String(x).match(/[가-힣]/g) || []).length;
      var tot = String(x).replace(/\s/g, '').length || 1;
      return kor / tot < 0.45;
    }).length >= 3;
  }

  // 엔진 일치 calc 판정: qccore _isCalcQ 있으면 우선 재사용(단일 출처). 해설 없으면 보기모양 폴백.
  // CALC는 '값 후보 보기(opts)'를 고르는 형식 — 보기 없는 SA/ORAL(기입·구술)은 calc 아님.
  function isCalc(q) {
    if (!opts(q).length) return false;
    if (typeof root._isCalcQ === 'function') { try { if (oArr(q).length) return root._isCalcQ(q); } catch (e) {} }
    if (oArr(q).length) { // 해설 있으면 엔진식: oFilled===1 & (그래프|풀이단계)
      var of = oFilled(q);
      var hg = q.exp && q.exp.graph && String(q.exp.graph).trim();
      var hs = (q.exp && Array.isArray(q.exp.ex) ? q.exp.ex : []).filter(function (x) { return x && String(x).trim(); }).length > 0;
      return of === 1 && !!(hg || hs);
    }
    // fresh(해설 없음): 값 보기 + 계산맥락 (법정 빈칸채우기 제외)
    var qq = String((q && q.q) || '');
    var statFill = /(법령상|법률상|규정|조문|법\s*제\d|시행령|시행규칙).{0,45}(들어갈|쓰시오|숫자를|아라비아)/.test(qq);
    return numTuple(opts(q)) && !statFill;
  }

  // 답 고르는 '방식'(단일값 type). 우선순위: OX>COMBO>ORDER>PAIR>COUNT>FILL>MATCH>SC
  function shape(q) {
    if (!opts(q).length && (q.blanks || q.exp)) return 'SA';
    var o = opts(q), qq = String((q && q.q) || '');
    if (typeof root.isComboQuestion === 'function') { try { if (root.isComboQuestion(o)) return 'COMBO'; } catch (e) {} }
    if (isOX(o)) return 'OX';
    if (isCombo(o)) return 'COMBO';
    if (reArrow.test(o.join('')) || isOrderSeq(o) || (reOrderStem.test(qq) && o.filter(function (x) { return /[>＞<＜→\-–]/.test(x); }).length >= 2)) return 'ORDER';
    if (isPair(o)) return 'PAIR';
    if (reCount.test(qq) && o.filter(function (x) { return /\d/.test(x); }).length >= 2) return 'COUNT';
    if (reFillMark.test(qq) && isFillOpts(o)) return 'FILL';
    if (reMatch.test(qq)) return 'MATCH';
    return 'SC';
  }

  function classify(q) {
    var calc = isCalc(q);
    // SA(보기 없는 기입형)는 방식 자체가 SA — calc(값 보기형)에 앞선다.
    var isSA = !opts(q).length && (q.blanks || q.exp);
    var t = isSA ? 'SA' : (calc ? 'CALC' : shape(q)); // 엔진 관점 형식(자동판별)
    var pol = reNeg.test(stem(q)) ? 'neg' : 'pos';
    var fig = reFig.test(String((q && q.q) || ''));
    // 의도(q.type) vs 자동판별 비교 (V2 §248 미리보기 불일치 경고).
    // 구조(방식)만 비교한다 — NEG는 pol축, CALC는 calc축, CV≈MATCH이므로 정규화 후 비교.
    var intent = q && q.type ? String(q.type).toUpperCase() : null;
    var autoEquiv = (t === 'SC' && pol === 'neg') ? 'NEG' : t;
    function normStruct(x, isCalc) {
      if (isCalc) return 'CALC';
      if (x === 'NEG') return 'SC';   // 극성은 pol축 → 단일선택으로 동일 취급
      if (x === 'CV') return 'MATCH'; // CV(연결/매칭) ≈ MATCH
      return x;
    }
    var intentN = intent ? normStruct(intent, intent === 'CALC') : null;
    var autoN = normStruct(t, calc);
    var mismatch = (intentN && intentN !== autoN) ? { intent: intent, auto: (calc ? 'CALC' : autoEquiv) } : null;
    return {
      type: t, pol: pol, calc: calc, fig: fig, autoType: autoEquiv, mismatch: mismatch,
      _dbg: { oFilled: oFilled(q), stmts: stmtCount(q), blanks: blankCount(q) }
    };
  }

  var API = { classify: classify, isCalc: isCalc, shape: shape, oFilled: oFilled };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.CertLabTypeCheck = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ── CLI: node certlab_typecheck.js <export.json> ──
 * 뱅크별 type 분포 + 의도(q.type) vs 자동판별 불일치 리포트 출력·저장. */
if (typeof require !== 'undefined' && require.main === module) {
  var fs = require('fs');
  var path = process.argv[2];
  if (!path) { console.error('usage: node certlab_typecheck.js <export.json>'); process.exit(1); }
  var d = JSON.parse(fs.readFileSync(path, 'utf8'));
  var dist = {}, calc = 0, fig = 0, neg = 0, n = 0, items = [], mism = [];
  (d.banks || []).forEach(function (b) {
    (b.data.questions || []).forEach(function (q) {
      n++; var r = module.exports.classify(q);
      dist[r.type] = (dist[r.type] || 0) + 1;
      if (r.calc) calc++; if (r.fig) fig++; if (r.pol === 'neg') neg++;
      var rec = { id: q.id, type: r.type, pol: r.pol, calc: r.calc, fig: r.fig };
      if (r.mismatch) { rec.mismatch = r.mismatch; mism.push(rec); }
      items.push(rec);
    });
  });
  console.log('총 ' + n + '문항');
  console.log('type:', JSON.stringify(dist));
  console.log('플래그: calc ' + calc + ' · fig ' + fig + ' · pol(neg) ' + neg);
  console.log('의도(type) vs 자동판별 구조 불일치: ' + mism.length + '건');
  mism.slice(0, 20).forEach(function (m) { console.log('   ' + m.id + ': ' + m.mismatch.intent + ' → ' + m.mismatch.auto); });
  var out = path.replace(/^.*\//, '').replace(/\.json$/, '') + '_타입검수.json';
  fs.writeFileSync(out, JSON.stringify({ dist: dist, flags: { calc: calc, fig: fig, neg: neg }, mismatches: mism, items: items }, null, 1));
  console.log('저장: ' + out);
}
