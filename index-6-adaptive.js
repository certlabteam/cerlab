/* ===== CertLab 적응형 엔진 모듈 (2-a 삽입) ===== */
/* --- eloEngine (AE) --- */
/* =====================================================================
 * CertLab 적응형 학습 — Elo 점수 엔진 (골격 v0.1)
 * ---------------------------------------------------------------------
 * 목적: 사용자의 "토픽별 실력 점수(0~100)"를 매 문제 결과로 갱신.
 *  - 현재 점수보다 어려운 문제 맞히면 → 크게 상승
 *  - 현재 점수보다 쉬운 문제 틀리면   → 크게 하락
 *  - 자기 수준 언저리 문제는 변동 작음 (빠른 수렴)
 *  - K값(학습률): 시도 적을 때 크게 → 쌓이면 작게(안정)
 *
 * 순수 계산 로직만 담음(토픽 태그·UI·저장과 독립). 토픽이 무엇이든
 * 점수·레벨만 넘기면 동작. 나중에 index.html에 통합.
 *
 * 네임스페이스: AE_ (기존 srSave/mcqSubject/mcqVerdict 등과 비충돌)
 * ===================================================================== */
(function (global) {
  'use strict';

  // --- 튜닝 파라미터 (시뮬레이션으로 조정) ---
  var CFG = {
    SCALE: 48,        // 점수차 → 기대정답확률 완만함. 작을수록 레벨차에 민감 (완만B)
    K_MAX: 20,        // 초반(데이터 적음) 학습률 (완만B: 초보 하락폭 완화)
    K_MIN: 7,         // 충분히 쌓인 뒤 학습률
    K_TAU: 12,        // K가 K_MAX→K_MIN으로 감쇠하는 속도(시도 수 기준)
    SCORE_MIN: 0,
    SCORE_MAX: 100,
    DEFAULT_SCORE: 50 // 진단 미실시 토픽 기본값(Lv3)
  };

  // 난이도 레벨(1~5) → 점수 환산(각 구간 중앙값)
  var LEVEL_SCORE = { 1: 10, 2: 30, 3: 50, 4: 70, 5: 90 };

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  // 점수(0~100) → 레벨(1~5)
  function scoreToLevel(score) {
    var s = clamp(score, 0, 100);
    if (s <= 20) return 1;
    if (s <= 40) return 2;
    if (s <= 60) return 3;
    if (s <= 80) return 4;
    return 5;
  }

  // 레벨(1~5) → 환산 점수
  function levelToScore(level) {
    return LEVEL_SCORE[clamp(Math.round(level), 1, 5)] || 50;
  }

  // 기대 정답확률: 사용자 점수 P, 문항 환산점수 D
  //  D>P(나보다 어려움) → 낮음 / D<P(쉬움) → 높음 / D≈P → 0.5
  function expectedProb(playerScore, itemScore, scale) {
    scale = scale || CFG.SCALE;
    return 1 / (1 + Math.pow(10, (itemScore - playerScore) / scale));
  }

  // 학습률 K: 시도 횟수 attempts가 늘수록 K_MAX→K_MIN으로 감쇠
  function kFactor(attempts) {
    var a = attempts < 0 ? 0 : attempts;
    return CFG.K_MIN + (CFG.K_MAX - CFG.K_MIN) * Math.exp(-a / CFG.K_TAU);
  }

  /* 한 문제 결과로 토픽 점수 갱신
   * @param current   현재 토픽 점수(0~100)
   * @param itemLevel 문항 난이도 레벨(1~5)
   * @param correct   맞힘 true / 틀림 false
   * @param attempts  이 토픽에서 지금까지 푼 문제 수(K 감쇠용)
   * @returns {score, delta, expected, k}
   */
  function updateScore(current, itemLevel, correct, attempts) {
    var P = clamp(current == null ? CFG.DEFAULT_SCORE : current, 0, 100);
    var D = levelToScore(itemLevel);
    var E = expectedProb(P, D);
    var S = correct ? 1 : 0;
    var K = kFactor(attempts || 0);
    var next = clamp(P + K * (S - E), CFG.SCORE_MIN, CFG.SCORE_MAX);
    return {
      score: Math.round(next * 10) / 10,
      delta: Math.round((next - P) * 10) / 10,
      expected: Math.round(E * 1000) / 1000,
      k: Math.round(K * 10) / 10
    };
  }

  // 콜드스타트: 진단 정답 개수 → 토픽 초기 점수
  //  설계: 3/3→70대, 2/3→50대, 1/3→35, 0/3→15 (비례 보간)
  function initFromDiagnostic(correctCount, total) {
    if (!total || total <= 0) return CFG.DEFAULT_SCORE;
    var r = clamp(correctCount / total, 0, 1);
    // 0→15, 0.33→35, 0.67→55, 1→72 로 매끄럽게
    return Math.round(15 + r * 57);
  }

  var AE = {
    CFG: CFG,
    scoreToLevel: scoreToLevel,
    levelToScore: levelToScore,
    expectedProb: expectedProb,
    kFactor: kFactor,
    updateScore: updateScore,
    initFromDiagnostic: initFromDiagnostic
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AE;
  global.AE = AE;
})(typeof window !== 'undefined' ? window : this);
/* --- selector 패치본 (SEL) 폴백캡+subtopic라운드로빈 --- */
/* =====================================================================
 * CertLab 적응형 학습 — 출제 선택 로직 (골격 v0.1)
 * ---------------------------------------------------------------------
 * 역할: 사용자 토픽별 점수 + 공용 풀 → 다음에 풀 문항 N개 선택.
 *   원칙:
 *   1) 약점 토픽(점수 낮음) 우선 — 단 한 토픽 편중은 피하고 분산
 *   2) 난이도: 본인 레벨 70% + 한 칸 위 30% (성장 견인)
 *   3) 미출제 문항 우선(중복 회피), 없으면 인접 레벨 폴백
 *   API 호출 없는 순수 선택(접속 즉시 가능). 토픽/레벨 메타만 가정.
 *
 * 의존: scoreToLevel은 AE(eloEngine)와 동일 규칙. 독립 동작 위해 내장.
 * 네임스페이스: SEL_
 * ===================================================================== */
'use strict';
(function (global) {

  var DEFAULT_SCORE = 50;          // 진단 안 한 토픽 기본(Lv3)
  var SELF_LEVEL_RATIO = 0.7;      // 본인 레벨 비율
  var TOPIC_FOCUS = 3;             // 약점 상위 N토픽에 가중 집중(완전 편중 방지)

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  function scoreToLevel(score) {
    var s = clamp(score, 0, 100);
    if (s <= 20) return 1;
    if (s <= 40) return 2;
    if (s <= 60) return 3;
    if (s <= 80) return 4;
    return 5;
  }

  // 약점 가중 토픽 1개 뽑기: 점수 낮을수록 가중 큼. 상위 약점에 집중.
  function pickTopic(topicScores, topicList, rng) {
    var arr = topicList.map(function (t) {
      var sc = (topicScores[t] != null) ? topicScores[t] : DEFAULT_SCORE;
      return { t: t, score: sc };
    });
    arr.sort(function (a, b) { return a.score - b.score; }); // 약점 우선
    // 약점 상위 TOPIC_FOCUS개 위주, 나머지는 작은 꼬리 가중
    var weights = arr.map(function (o, i) {
      var base = (100 - o.score) + 1;          // 점수 낮을수록 큼
      var focus = (i < TOPIC_FOCUS) ? 1.0 : 0.25; // 상위 약점에 집중
      return base * focus;
    });
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);
    var r = rng() * sum;
    for (var i = 0; i < arr.length; i++) {
      r -= weights[i];
      if (r <= 0) return arr[i].t;
    }
    return arr[0].t;
  }

  // 난이도 레벨 결정: 본인 레벨 70% / 한 칸 위 30%
  function pickLevel(score, rng) {
    var lv = scoreToLevel(score);
    if (rng() < SELF_LEVEL_RATIO) return lv;
    return Math.min(lv + 1, 5);
  }

  // 풀에서 (토픽, 레벨, 미출제) 우선으로 1문항. 없으면 인접레벨→토픽내→null 폴백
  // subtopic 분산: 후보 중 이번 세션 노출 적은 subtopic 우선(동일 topic·level 안에서만).
  // subtopic 없으면 모두 동일 버킷 → 기존 무작위 동작과 동일(graceful).
  function chooseBalanced(cands, subCount, rng) {
    var minC = Infinity;
    cands.forEach(function (q) {
      var s = (subCount[q.subtopic || '_'] || 0);
      if (s < minC) minC = s;
    });
    var least = cands.filter(function (q) { return (subCount[q.subtopic || '_'] || 0) === minC; });
    return least[Math.floor(rng() * least.length)];
  }

  function pickQuestion(pool, topic, level, seen, rng, subCount) {
    subCount = subCount || {};
    function candidates(lv) {
      return pool.filter(function (q) {
        return q.topic === topic && q.level === lv && !seen[q.id];
      });
    }
    var tries = [level, level + 1, level - 1, level - 2, level - 3, level - 4]; // 폴백 캡: 위로는 +1까지만
    for (var i = 0; i < tries.length; i++) {
      var lv = tries[i];
      if (lv < 1 || lv > 5) continue;
      var c = candidates(lv);
      if (c.length) return chooseBalanced(c, subCount, rng);
    }
    // 캡 내(요청레벨+1 이하) 토픽 미출제 중 가장 가까운 레벨 → 그 안에서 subtopic 분산
    var capped = pool.filter(function (q) { return q.topic === topic && !seen[q.id] && q.level <= level + 1; });
    if (capped.length) {
      var nearest = Math.min.apply(null, capped.map(function (q) { return Math.abs(q.level - level); }));
      var near = capped.filter(function (q) { return Math.abs(q.level - level) === nearest; });
      return chooseBalanced(near, subCount, rng);
    }
    return null; // 캡 내 없으면 출제 보류(과난도 강제 금지) — 빈 풀은 batch가 채움
  }

  /* 출제 세트 선택
   * @param topicScores {topic: score}
   * @param pool 문항 배열 [{id, topic, level, ...}]
   * @param n 문항 수
   * @param opts {seen:{id:true}, rng}
   * @returns {items:[q...], byTopic:{}, byLevel:{}}
   */
  function selectQuestions(topicScores, pool, n, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var seen = {};
    if (opts.seen) for (var k in opts.seen) seen[k] = true;

    var topicList = {};
    pool.forEach(function (q) { topicList[q.topic] = true; });
    topicList = Object.keys(topicList);

    var items = [], byTopic = {}, byLevel = {}, bySub = {};
    var subCount = {}; // topic별 subtopic 노출수(분산용) — "topic|subtopic" 키
    var guard = 0;
    while (items.length < n && guard < n * 20) {
      guard++;
      var topic = pickTopic(topicScores, topicList, rng);
      var sc = (topicScores[topic] != null) ? topicScores[topic] : DEFAULT_SCORE;
      var lv = pickLevel(sc, rng);
      // 이 topic의 subtopic 노출수만 추려 전달
      var localSub = {};
      for (var key in subCount) { var pr = key.split('|'); if (pr[0] === topic) localSub[pr[1]] = subCount[key]; }
      var q = pickQuestion(pool, topic, lv, seen, rng, localSub);
      if (!q) continue;
      seen[q.id] = true;
      items.push(q);
      byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
      byLevel[q.level] = (byLevel[q.level] || 0) + 1;
      var sub = q.subtopic || '_';
      subCount[topic + '|' + sub] = (subCount[topic + '|' + sub] || 0) + 1;
      bySub[q.topic + '/' + sub] = (bySub[q.topic + '/' + sub] || 0) + 1;
    }
    return { items: items, byTopic: byTopic, byLevel: byLevel, bySub: bySub, exhausted: items.length < n };
  }

  var SEL = {
    selectQuestions: selectQuestions,
    pickTopic: pickTopic,
    pickLevel: pickLevel,
    scoreToLevel: scoreToLevel,
    CFG: { DEFAULT_SCORE: DEFAULT_SCORE, SELF_LEVEL_RATIO: SELF_LEVEL_RATIO, TOPIC_FOCUS: TOPIC_FOCUS }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SEL;
  global.SEL = SEL;
})(typeof window !== 'undefined' ? window : this);
/* ===== 적응형 데이터 로더 (2-b) — Firestore adaptive 컬렉션 ===== */
var AD_DATA = {};                       // "cert|sub" -> {map,diag,variants,lookup,variantsByTopic}
var AD_TTL_MS = 6*60*60*1000;           // 6h, 뱅크 캐시와 동일
function _adParse(d){                    // Firestore가 문자열로 저장된 경우(중첩배열 우회) 관용 파싱
  if(typeof d==='string'){ try{ return JSON.parse(d); }catch(e){ return null; } }
  if(d && typeof d.payload==='string'){ try{ return JSON.parse(d.payload); }catch(e){} }
  return d;
}
/* ===== 계산형 자동생성 코어 (CALC_) — 결정론(같은 template,seed→동일 인스턴스). eval/Function 안 씀 =====
   문항 id = "calc:<템플릿id>:<밴드>:<seed>" → _luFindQ가 id만으로 동일 인스턴스 재생성(이어풀기·기록 안전). */
var CALC_PER_BAND=3;   // 풀빌드 시 템플릿×밴드당 생성 인스턴스 수
function _calcRng(seed){ var s=(seed>>>0)||1; return function(){ s|=0; s=(s+0x6D2B79F5)|0; var t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function _calcEval(expr, vars){
  var src=String(expr), i=0;
  function ws(){ while(i<src.length && /\s/.test(src[i])) i++; }
  function peek(){ ws(); return src[i]; }
  function eat(c){ ws(); if(src[i]!==c) throw new Error('expected '+c); i++; }
  function pExpr(){ var v=pTerm(); for(;;){ var c=peek(); if(c==='+'){i++; v+=pTerm();} else if(c==='-'){i++; v-=pTerm();} else break; } return v; }
  function pTerm(){ var v=pUn(); for(;;){ var c=peek(); if(c==='*'){i++; v*=pUn();} else if(c==='/'){i++; var d=pUn(); if(d===0) throw new Error('div0'); v/=d;} else break; } return v; }
  function pUn(){ var c=peek(); if(c==='-'){i++; return -pUn();} if(c==='+'){i++; return pUn();} return pPrim(); }
  function pPrim(){ var c=peek();
    if(c==='('){ i++; var v=pExpr(); eat(')'); return v; }
    if(/[0-9.]/.test(c)){ var st=i; while(i<src.length && /[0-9.]/.test(src[i])) i++; var n=parseFloat(src.slice(st,i)); if(isNaN(n)) throw new Error('num'); return n; }
    if(/[A-Za-z_]/.test(c)){ var st2=i; while(i<src.length && /[A-Za-z0-9_]/.test(src[i])) i++; var nm=src.slice(st2,i);
      if(peek()==='('){ i++; var a=[]; if(peek()!==')'){ a.push(pExpr()); while(peek()===','){ i++; a.push(pExpr()); } } eat(')'); return _calcFn(nm,a); }
      if(!(nm in vars)) throw new Error('var:'+nm); return Number(vars[nm]); }
    throw new Error('unexpected'); }
  var out=pExpr(); ws(); if(i!==src.length) throw new Error('trailing'); if(!isFinite(out)) throw new Error('nonfinite'); return out;
}
function _calcFn(name,a){ switch(name){
  case 'round': { var d=a.length>1?a[1]:0, f=Math.pow(10,d); return Math.round(a[0]*f)/f; }
  case 'abs': return Math.abs(a[0]); case 'floor': return Math.floor(a[0]); case 'ceil': return Math.ceil(a[0]);
  case 'min': return Math.min.apply(null,a); case 'max': return Math.max.apply(null,a); case 'pow': return Math.pow(a[0],a[1]);
  default: throw new Error('fn:'+name); } }
function _calcFmt(n, round, unit){ var d=round||0, f=Math.pow(10,d), v=Math.round(n*f)/f; var s=v.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:d}); if(unit==='원') return '₩'+s; return s+(unit?(' '+unit):''); }
function genCalc(tmpl, seed){
  try{
    var rng=_calcRng(seed), vars={};
    var pk=Object.keys(tmpl.params||{});
    for(var pi=0; pi<pk.length; pi++){ var p=tmpl.params[pk[pi]], step=p.step||1, span=Math.floor((p.max-p.min)/step); vars[pk[pi]]=p.min+step*Math.floor(rng()*(span+1)); }
    /* [FIX 2026-07-13] derive를 키 순서가 아니라 의존성 순으로 해석 — 미해결(var:) 예외면 뒤로 미뤄 재시도(고정점). admin genCalc와 동일. */
    var dk=Object.keys(tmpl.derive||{}), _pend=dk.slice(), _prog=true;
    while(_pend.length && _prog){ _prog=false; var _next=[];
      for(var di=0; di<_pend.length; di++){ try{ vars[_pend[di]]=_calcEval(tmpl.derive[_pend[di]], vars); _prog=true; }catch(_e){ if(String(_e.message||_e).indexOf('var:')===0) _next.push(_pend[di]); else throw _e; } }
      _pend=_next; }
    if(_pend.length) throw new Error('var:'+_pend[0]);
    var answer=_calcEval(tmpl.answer, vars); vars.answer=answer;
    var rnd=tmpl.round||0, fpow=Math.pow(10,rnd); function rd(x){ return Math.round(x*fpow)/fpow; }
    var ansR=rd(answer), distVals=[];
    (tmpl.distractors||[]).forEach(function(ds){ try{ distVals.push(rd(_calcEval(ds.expr, vars))); }catch(e){} });
    var ok=true;
    (tmpl.guard||[]).forEach(function(g){ try{ var m=String(g).match(/^(.*?)(<=|>=|==|!=|<|>)(.*)$/); if(m){ var l=_calcEval(m[1],vars), r=_calcEval(m[3],vars), op=m[2]; var res=op==='>'?l>r:op==='<'?l<r:op==='>='?l>=r:op==='<='?l<=r:op==='=='?l===r:l!==r; if(!res) ok=false; } }catch(e){ ok=false; } });
    if(!ok) return null;
    var optVals=[ansR], seen={}; seen[ansR]=1;
    for(var k=0;k<distVals.length && optVals.length<5;k++){ var dv=distVals[k]; if(dv==null||!isFinite(dv)||seen[dv]) continue; seen[dv]=1; optVals.push(dv); }
    if(optVals.length<5) return null;
    var idx=[0,1,2,3,4];
    for(var s2=idx.length-1;s2>0;s2--){ var j=Math.floor(rng()*(s2+1)); var t=idx[s2]; idx[s2]=idx[j]; idx[j]=t; }
    var opts=idx.map(function(oi){ return _calcFmt(optVals[oi], rnd, tmpl.unit); });
    var ansPos=idx.indexOf(0), ans1=ansPos+1;
    function numFmt(key){ if(key==='answer') return _calcFmt(ansR, rnd, tmpl.unit); if(!(key in vars)) return '{'+key+'}'; var val=vars[key], isMoney=(tmpl.money||[]).indexOf(key)>=0, d=isMoney?0:(Number.isInteger(val)?0:rnd); return Number(val).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:d}); }
    function subst(str){ return String(str).replace(/\{(\w+)\}/g, function(_,key){ return numFmt(key); }); }
    var o=[]; for(var oi2=0;oi2<5;oi2++) o.push(oi2===ansPos ? subst(tmpl.concl||'정답: {answer}') : '');
    return { id:'calc:'+tmpl.id+':'+(tmpl._diff||(Array.isArray(tmpl.diff)?tmpl.diff[0]:tmpl.diff))+':'+(seed>>>0),
      q:subst(tmpl.stem), opts:opts, ans:ans1, topic:tmpl.topic, diff:(tmpl._diff||(Array.isArray(tmpl.diff)?tmpl.diff[0]:tmpl.diff)), subtopic:tmpl.subtopic||null,
      exp:{ o:o, ex:(tmpl.exp_ex||[]).map(subst) }, _gen:true };
  }catch(e){ return null; }
}
function genCalcValid(tmpl, baseSeed, maxTries){ var tries=maxTries||40; for(var t=0;t<tries;t++){ var seed=(baseSeed+t*2654435761)>>>0; var q=genCalc(tmpl, seed); if(q) return q; } return null; }
function _calcFromId(cert, id){ try{ var p=String(id).split(':'); if(p.length<4) return null; var tmplid=p[1], band=+p[2], seed=(+p[3])>>>0;
  var qb=qbOf(cert), tmpl=null;
  Object.keys(qb).some(function(sub){ var b=(typeof AD_DATA!=='undefined')&&AD_DATA[cert+'|'+sub]; var ts=(b&&b.calcTemplates)||[]; return ts.some(function(tt){ if(tt&&tt.id===tmplid){ tmpl=tt; return true;} return false; }); });
  if(!tmpl) return null;
  return genCalc(Object.assign({}, tmpl, {_diff:band}), seed);
}catch(e){ return null; } }

async function loadAdaptiveSubject(cert, sub){
  var key=cert+'|'+sub;
  if(AD_DATA[key]) return AD_DATA[key];
  if(!firebaseReady||!db){ throw new Error('Firestore 미초기화'); }
  async function fetchDoc(kind){
    var ck='ad:'+cert+':'+sub+':'+kind;
    try{ var c=localStorage.getItem(ck); if(c){ var w=JSON.parse(c); if(!AD_TTL_MS||(Date.now()-w.__ts)<=AD_TTL_MS) return w.d; } }catch(e){}
    var snap=await db.collection('adaptive').doc(cert+'__'+sub+'__'+kind).get();
    if(!snap.exists) return null;
    var d=_adParse(snap.data());
    try{ localStorage.setItem(ck, JSON.stringify({__ts:Date.now(), d:d})); }catch(e){}
    return d;
  }
  var res=await Promise.all([fetchDoc('map'), fetchDoc('diag'), fetchDoc('variants'), fetchDoc('variantq'), fetchDoc('calctmpl')]);
  return AD_BUILD(key, res[0], res[1], res[2], res[3], res[4]);
}
// 룩업·인덱스 빌드(순수). 로드시뮬·테스트에서 재사용.
function AD_BUILD(key, mapDoc, diagDoc, varDoc, varqDoc, calcDoc){
  var lookup={}, variantsByTopic={};
  ((mapDoc&&mapDoc.mapping)||[]).forEach(function(x){
    lookup[x.id]={topic:x.topic, diff:x.diff, subtopic:x.subtopic||null};
  });
  ((varDoc&&varDoc.variants)||[]).forEach(function(r){
    (variantsByTopic[r.topic]=variantsByTopic[r.topic]||[]).push(r);
  });
  var variantPool=(varqDoc&&varqDoc.questions)||[];   // 이론형 변형 문제 풀
  // 변형 풀 문항도 룩업에 추가(Elo·출제에서 topic/diff 조회 가능하게)
  variantPool.forEach(function(q){ if(q&&q.id) lookup[q.id]={topic:q.topic, diff:q.diff, subtopic:q.subtopic||null}; });
  var calcTemplates=(calcDoc&&calcDoc.templates)||[];   // 계산형 자동생성 템플릿(앱이 즉석 인스턴스화)
  var bundle={ map:mapDoc, diag:diagDoc, variants:varDoc, lookup:lookup, variantsByTopic:variantsByTopic, variantPool:variantPool, calcTemplates:calcTemplates };
  AD_DATA[key]=bundle;
  return bundle;
}
// 문항 id → {topic,diff,subtopic} (Elo 훅·출제에서 사용)
function adLookup(cert, sub, qid){ var b=AD_DATA[cert+'|'+sub]; return (b&&b.lookup[qid])||null; }
// ===== 적응형 Elo 트랙 (2-c) — 기존 srProgress/mcqVerdict와 분리 =====
var eloState = {};   // "cert|sub" -> { topic: {score, attempts} }
function adEloUpdate(q, correct){
  try{
    if(!q || !q.id || typeof AE==='undefined') return null;
    var cs = (typeof MCQ_QID2CS!=='undefined') && MCQ_QID2CS[q.id];
    var cert = (typeof mqCert!=='undefined' && mqCert) || (cs && cs.cert);
    var sub  = (cs && cs.sub) || q._subj || q.subject;
    var topic = q.topic, diff = q.diff;
    if((!topic || !diff) && cert && sub){ var info=adLookup(cert, sub, q.id); if(info){ topic=topic||info.topic; diff=diff||info.diff; } }
    if(!cert || !sub || !topic || !diff) return null;   // 식별 불가(맵에 없는 회차기출 등) → 스킵·무시
    var k=cert+'|'+sub;
    if(!eloState[k]) eloState[k]={};
    var cur=eloState[k][topic] || {score:AE.CFG.DEFAULT_SCORE, attempts:0};
    var base=(typeof _eloScoreOf==='function'&&_eloScoreOf(cur)!=null)?_eloScoreOf(cur):cur.score;   // 감가상각 반영된 점수에서 재수렴
    var up=AE.updateScore(base, diff, !!correct, cur.attempts);
    eloState[k][topic]={score:up.score, attempts:cur.attempts+1, ts:Date.now()};
    return {cert:cert, sub:sub, topic:topic, diff:diff, delta:up.delta, score:up.score};
  }catch(e){ return null; }
}
