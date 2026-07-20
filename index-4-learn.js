// ===== 약점 개념(B): 오답노트(appWrong) → 개념(exp.c) 집계 =====
function mqEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function cQTitles(q){ return (((q.exp&&q.exp.c)||[]).map(function(c){return (c&&c.t||'').trim();}).filter(Boolean)); }
function gatherConceptQs(cert, title){      // 그 개념이 든 전 회차 문항 모음
  var qb=qbOf(cert), out=[];
  Object.keys(qb).forEach(function(sub){ qb[sub].sets.forEach(function(st){ st.questions.forEach(function(q){
    if(cQTitles(q).indexOf(title)>=0) out.push(q);
  }); }); });
  return out;
}
function mqWeakConcepts(cert){              // 2번 이상 틀린 개념만, 틀린 수 내림차순 (정답 오답 + OX 자가체크 오답, 독립 집계)
  var qb=qbOf(cert), tally={};
  Object.keys(qb).forEach(function(sub){ qb[sub].sets.forEach(function(st){ st.questions.forEach(function(q){
    var wrongAns = !!appWrong[q.id];
    var wrongOX = false;
    try{ var ox=(typeof mqOX!=='undefined')&&mqOX[q.id]; if(ox && Object.keys(ox).length && typeof oxAllMatch==='function' && !oxAllMatch(q)) wrongOX=true; }catch(_){}
    if(!wrongAns && !wrongOX) return;
    var seen={};
    cQTitles(q).forEach(function(t){ if(seen[t]) return; seen[t]=1; (tally[t]=tally[t]||{t:t,n:0}).n++; });
  }); }); });
  var list=Object.keys(tally).map(function(k){return tally[k];}).filter(function(x){return x.n>=1;});
  list.sort(function(a,b){return b.n-a.n;});
  list.forEach(function(c){ c.total=gatherConceptQs(cert,c.t).length; });
  return list;
}
function gatherConcept(i){
  var c=mqWeakCache[i]; if(!c) return;
  var list=gatherConceptQs(mqCert, c.t);
  if(!list.length){ alert('해당 개념 문항이 없습니다.'); return; }
  startGatherExam(c.t, list);
}
function startGatherExam(label, list){      // 개념 모아풀기 (복습류 커스텀 세션)
  mqStopTimer(); mqStopOverTimer();
  mqReview=true; mqInReview=false; mqDiag=false; mqConcept=false; mqGather=true; mqGatherLabel=label;
  mqMode='review'; mqSub=''; mqSet=0; mqShow={}; mqGuess={}; mqAns={}; mqIdx=0;
  mqList=list.slice(); mqOXClearList(mqList);   // 모아풀기 재풀이: 내 O/X 해제(동기화 부활 방지 포함)
  mqTimeLeft=_sessionSecs(mqList, mqCert);
  mqScreen='exam'; renderMCQ(); mqStartTimer(); window.scrollTo(0,0);
}
function _mcqTopicLevel(cert, subCode, q){   // 문제의 단원(topic) Elo 점수(낮을수록 약함). 목차·점수 없으면 뒤로(9999)
  try{
    var tp = q && q.topic;
    if(!tp && typeof adLookup==='function'){ var info=adLookup(cert, subCode, q&&q.id); tp=info&&info.topic; }
    if(!tp) return 9999;
    var st=(typeof eloState!=='undefined'&&eloState[cert+'|'+subCode])||{};
    var rec=st[tp];
    var dv=(typeof _eloScoreOf==='function')?_eloScoreOf(rec):null;
    return (dv!=null) ? dv : ((rec&&typeof rec.score==='number') ? rec.score : 9999);
  }catch(_){ return 9999; }
}
function startMcqReview(){
  /* [2026-07-14] 이어풀기: 오늘 저장된 미완료 복습 세션이 있으면 그 위치에서 재개(1번부터 새로 시작하지 않음) */
  try{
    var _rv=JSON.parse(localStorage.getItem(_reviewKey())||'null');
    if(_rv && _rv.date===_todayKST() && _rv.ids && _rv.ids.length && (_rv.idx||0)>0 && (_rv.idx||0)<_rv.ids.length){
      var _rl=_reviewResolve(_rv.ids);
      if(_rl.length>=2){
        mqStopTimer();
        mqReview=true; mqInReview=false; mqConcept=false; mqMode='review'; mqSub=''; mqSet=0; mqShow={}; mqGuess={};
        mqList=_rl; mqAns=_rv.ans||{}; mqIdx=Math.min(_rv.idx||0, _rl.length-1);
        mqTimeLeft=_sessionSecs(_rl, mqCert);
        mqScreen='exam'; renderMCQ(); mqStartTimer(); window.scrollTo(0,0); return;
      }
    }
  }catch(_){}
  const qb=curQB(); let due=[];
  const _sord={}; curOrder().forEach((id,i)=>{ _sord[id]=i; });   // 과목 순서 인덱스
  curOrder().forEach(id=>{ qb[id].sets.forEach(st=>st.questions.forEach(q=>{ if(srDueK(mqCert,q.id)){ q._subj=qb[id].name||id; q._subCode=id; q._grp=(_sord[id]||0); due.push(q); } })); });
  // 하루 상한 선정: ①복습일 급한 순 → ②레벨 낮은(약한) 목차 우선 → ③중요도 높은 순
  due.sort(function(a,b){
    var pa=srProgress[mqCert+'|'+a.id]||{}, pb=srProgress[mqCert+'|'+b.id]||{};
    return (pa.nx||0)-(pb.nx||0)
        || _mcqTopicLevel(mqCert,a._subCode,a)-_mcqTopicLevel(mqCert,b._subCode,b)
        || ((typeof _impStarOfQ==='function'?_impStarOfQ(b):(b.star||0))-(typeof _impStarOfQ==='function'?_impStarOfQ(a):(a.star||0)));
  });
  if(due.length>REVIEW_MCQ_CAP){
    // [2026-07-20] 과목 균일 출제: 우선순위(급한순→약한목차→중요도)를 과목 안에서 유지하되,
    // 과목별로 돌아가며 뽑아 상한 40개가 한 과목에 쏠리지 않게 한다.
    var _bySub={}, _subSeq=[];
    due.forEach(function(q){ var k=q._subCode||''; if(!_bySub[k]){ _bySub[k]=[]; _subSeq.push(k); } _bySub[k].push(q); });
    var _picked=[];
    while(_picked.length<REVIEW_MCQ_CAP){
      var _got=false;
      for(var _i=0;_i<_subSeq.length && _picked.length<REVIEW_MCQ_CAP;_i++){
        var _arr=_bySub[_subSeq[_i]]; if(_arr.length){ _picked.push(_arr.shift()); _got=true; }
      }
      if(!_got) break;
    }
    due=_picked;
  }
  due.sort((a,b)=>((a._grp||0)-(b._grp||0)));   // 표시는 과목별로 묶어서(선정은 위 우선순위 유지)
  if(!due.length){
    const root=document.getElementById('mcqRoot');
    if(root) root.innerHTML='<div class="mcq-result"><div class="em">🎉</div>'
      +'<div class="rt">오늘 복습할 문제가 없어요!</div>'
      +'<div class="rs">복습일이 된 문제가 생기면 여기에 모아드려요.<br>새 문제를 더 풀면 복습 일정이 쌓입니다.</div>'
      +'<div class="rbtns"><button onclick="mqBackHome()">과목 선택</button></div></div>';
    return;
  }
  mqStopTimer();
  mqReview=true; mqInReview=false; mqConcept=false; mqMode='review'; mqSub=''; mqSet=0; mqShow={}; mqGuess={}; mqAns={}; mqIdx=0;
  mqList=due; mqOXClearList(due);   // 복습 재풀이: 내 O/X 해제(학습완료 mqOXLearned는 유지, 동기화 부활 방지 포함)
  mqTimeLeft=_sessionSecs(due, mqCert);
  mqScreen='exam'; renderMCQ(); mqStartTimer(); window.scrollTo(0,0);
}
function startMcqExam(id,si,mode){
  // (2026-07-02) 기출은 게스트도 자유 풀이(10문제 한도) — 레벨테스트 강제 제거
  mqReview=false; mqDiag=false; mqInReview=false; mqConcept=false;
  mode=mode||'all';
  mqStopTimer();
  mqSub=id; mqSet=si; mqMode=mode; mqShow={};
  const all=curQB()[id].sets[si].questions;
  if(mode==='wrong') mqList=all.filter(q=>appWrong[q.id]);
  else if(mode==='unans') mqList=all.filter(q=>srMasteryK(mqCert,q.id)==='new');
  else mqList=all;
  if(!mqList.length){ alert(mode==='unans'?'미응답 문항이 없습니다. 모두 푸셨어요! 👍':'오답이 없습니다. 모두 맞히셨어요! 🎉'); mqList=null; return; }
  if(mode==='all'){ mqClearProgress(id,si); }   // 처음부터: 저장 삭제
  mqOXClearList(mqList);   // 다시 풀기(전체·오답·미응답 공통) → 내 O/X 해제
  mqWrongStreak=0; mqConceptOffered=false;
  mqAns={}; mqGuess={}; mqIdx=0; mqTimeLeft=_sessionSecs(mqList, mqCert);
  mqScreen='exam'; renderMCQ(); mqStartTimer(); window.scrollTo(0,0);
}
function resumeMcqExam(id,si){
  // (2026-07-02) 기출은 게스트도 자유 풀이(10문제 한도) — 레벨테스트 강제 제거
  mqReview=false; mqDiag=false; mqInReview=false; mqConcept=false;
  mqStopTimer();
  const saved=mqLoadProgress(id,si);
  if(!saved){ startMcqExam(id,si,'all'); return; }
  mqSub=id; mqSet=si; mqMode='all'; mqShow={}; mqGuess={};
  mqWrongStreak=0; mqConceptOffered=false;
  mqList=curQB()[id].sets[si].questions;
  mqAns=saved.ans||{}; mqIdx=saved.idx||0; mqTimeLeft=(saved.t!=null&&saved.t>0?saved.t:_sessionSecs(mqList, mqCert));
  if(saved.up){   // 시간종료 후 이어풀던 세션 → 오버타임으로 복원
    mqTimeUp=true; mqOvertimeSec=saved.os||0; mqOvertimeCount=saved.oc||0; mqOverStart=0;
    mqScreen='exam'; renderMCQ(); window.scrollTo(0,0); mqStartOverTimer(); return;
  }
  mqScreen='exam'; renderMCQ(); mqStartTimer(); window.scrollTo(0,0);
}
// ===== 개념학습 모드: 개념 카드 → 문제 풀기 → 다음 개념 → ... =====
function startConceptStudy(id,si,startIdx){
  // (2026-07-02) 개념학습도 게스트 자유(10문제 한도) — 레벨테스트 강제 제거
  mqReview=false; mqDiag=false; mqInReview=false;
  mqStopTimer(); mqStopOverTimer();
  mqSub=id; mqSet=si; mqMode='all'; mqShow={}; mqGuess={};
  mqList=curQB()[id].sets[si].questions;
  if(!mqList || !mqList.length){ alert('문제 준비 중입니다.'); mqList=null; return; }
  mqOXClearList(mqList);   // 개념학습 재풀이(mqAns 리셋) → 내 O/X 해제
  mqAns={}; mqIdx=(typeof startIdx==='number'&&startIdx>0&&startIdx<mqList.length)?startIdx:0;
  mqTimeUp=false; mqTimeLeft=_sessionSecs(mqList, mqCert);   // 개념학습은 타이머 미사용(값만 보관)
  mqConcept=true; mqConceptPhase='learn';
  mqScreen='exam'; renderMCQ(); window.scrollTo(0,0);
}
// 개념 카드 → 문제 풀이로
function mqConceptSolve(){ if(mqLevelUp){ mqConcept=false; mqConceptPhase=''; renderMCQ(); window.scrollTo(0,0); return; } mqConceptPhase='solve'; renderMCQ(); window.scrollTo(0,0); }
// 문제 풀이 → 다시 개념 카드(현재 문항)로
function mqConceptBackToLearn(){ mqConceptPhase='learn'; renderMCQ(); window.scrollTo(0,0); }

// ===== 연속 오답 → 개념학습 권유 =====
// 회차(세트)의 모든 문항에 전용 개념학습 데이터(exp.learn)가 있는지
function setConceptReady(cert,sub,si){
  try{
    var qb=MCQ_EXAMS[cert]&&MCQ_EXAMS[cert].qb; if(!qb||!qb[sub]) return false;
    var st=(qb[sub].sets||[])[si]; if(!st) return false;
    var qs=st.questions||[]; if(!qs.length) return false;
    for(var i=0;i<qs.length;i++){
      var e=qs[i].exp||{};
      var L=e.learn;
      var okL=L&&(L.title||L.sum||(Array.isArray(L.secs)&&L.secs.length));
      var okC=_hasConcept(e);           // 전용 학습데이터 없어도 개념카드(exp.c) 있으면 인정
      if(!okL&&!okC) return false;
    }
    return true;
  }catch(_){ return false; }
}
// 일반 풀이 모드(생체·오답재풀이·진단·복습·개념학습 제외)에서 연속 3오답 시 권유. 세트당 1회.
function maybeOfferConcept(q,n,firstTime){
  if(!firstTime) return false;
  if(mqInReview||mqDiag||mqConcept) return false;
  if(mqMode==='wrong') return false;
  if(mqCert==='bodybuilding') return false;
  if(!q||!mqHasAnswer(q)) return false;
  if(isCorr(q.ans,n)){ mqWrongStreak=0; return false; }
  mqWrongStreak++;
  if(mqWrongStreak<3) return false;
  if(mqConceptOffered) return false;
  if(!setConceptReady(mqCert,mqSub,mqSet)) return false;
  mqWrongStreak=0; mqConceptOffered=true;
  var el=document.getElementById('conceptOfferPopup'); if(el) el.classList.remove('hidden');
  return true;
}
function conceptOfferAccept(){
  var el=document.getElementById('conceptOfferPopup'); if(el) el.classList.add('hidden');
  startConceptStudy(mqSub,mqSet);
}
function conceptOfferDismiss(){
  var el=document.getElementById('conceptOfferPopup'); if(el) el.classList.add('hidden');
  var qs=mqQuestions();
  if(mqIdx<qs.length-1){ mqIdx++; mqSaveProgress(); window.scrollTo(0,0); renderMCQ(); }
  else { mqResult(); }
}
// 풀이 화면에서 현재 문항의 개념학습으로 이동 (그 회차에 exp.learn 다 있을 때만)
function _qHasConcept(q){ if(!q||!q.exp) return false; var e=q.exp, L=e.learn;
  return !!((L&&(L.title||L.sum||(Array.isArray(L.secs)&&L.secs.length))) || _hasConcept(e)); }
function goConceptFromQuestion(){
  if(mqInReview||mqDiag||mqConcept) return;
  if(mqLevelUp){                                   // (2026-07-02) 레벨업: 현재 레벨업 문제의 자기 개념(exp.c/learn)만 표시 — 기출 세트 로드 안 함(mqList 유지)
    if(!_qHasConcept(mqQuestions()[mqIdx])) return;
    mqConcept=true; mqConceptPhase='learn'; renderMCQ(); window.scrollTo(0,0); return;
  }
  if(!setConceptReady(mqCert,mqSub,mqSet)) return;
  var cur=mqQuestions()[mqIdx];
  var setQs=((curQB()[mqSub]||{}).sets||[])[mqSet]; setQs=setQs?setQs.questions:[];
  var si=cur?setQs.findIndex(function(x){return x.id===cur.id;}):-1;
  startConceptStudy(mqSub, mqSet, si>0?si:0);
}

// mode==='all'(일반): 맞힘→오답제거, 틀림→오답추가 / mode==='wrong'(오답노트): 맞힘→오답제거만
function mqFlushAnsweredToWrong(){
  if(mqReview||mqDiag) return;                 // 복습·진단 세션은 오답노트 미반영
  const list=(mqList&&mqList.length)?mqList:null; if(!list) return;
  let changed=false;
  list.forEach(q=>{
    const a=mqAns[q.id]; if(a===undefined) return;   // 응답한 것만
    if(mqCorrect(q,a)){ if(appWrong[q.id]){ delete appWrong[q.id]; changed=true; } }
    else if(mqMode==='all'){ if(!appWrong[q.id]){ appWrong[q.id]=true; changed=true; } }
  });
  if(changed && currentUser) saveUserData();
}
function mqBackHome(){ _luReviewReturn=null; const wasReview=mqInReview; var _wasDiag=(mqDiag||mqLevelTest); mqInReview=false; mqStopTimer(); mqStopOverTimer(); if(mqScreen==='exam'&&!mqReview&&!mqDiag&&!mqLevelUp&&!wasReview){ mqFlushAnsweredToWrong(); mqSaveProgress(); if(currentUser && typeof srFlush==='function') srFlush(); } if(mqScreen==='exam'&&mqDiag) saveDiagProgress(); if(mqLevelUp && currentUser && typeof srFlush==='function') srFlush(); mqReview=false; mqDiag=false; mqGather=false; mqLevelUp=false; mqScreen='home'; mqList=null; if(_wasDiag && typeof goHome==='function'){ goHome(); return; } renderMCQ(); window.scrollTo(0,0); }

const IMG_PH='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const imgCache={};
var IMG_TTL_MS = 6*60*60*1000;   // 6h — 이미지 갱신 반영(무기한 캐시 방지). 구 포맷(raw base64)은 파싱 실패로 자동 재요청(1회 마이그레이션)
function imgInner(v){
  if(!v) return '';
  if(v.indexOf('img://')===0) return '<img data-imgkey="'+v.slice(6)+'" alt="" src="'+IMG_PH+'">';
  // 실제 URL·절대경로·데이터/블롭 URI는 그대로 src
  if(/^(https?:)?\/\//.test(v) || v.indexOf('/')===0 || v.indexOf('data:')===0 || v.indexOf('blob:')===0)
    return '<img src="'+v+'" alt="">';
  // 그 외 = Firestore 이미지 키(맨 키, img:// 접두사 누락분 방어) → images/{키} 조회
  return '<img data-imgkey="'+v+'" alt="" src="'+IMG_PH+'">';
}
async function resolveImages(scope){
  const els=(scope||document).querySelectorAll('img[data-imgkey]');
  for(const el of els){
    const k=el.getAttribute('data-imgkey'); if(!k) continue;
    el.removeAttribute('data-imgkey');
    try{
      let b64=imgCache[k];
      if(!b64){ try{ var _raw=localStorage.getItem('img:'+k); if(_raw){ var _w=JSON.parse(_raw); if(_w && _w.d && (!IMG_TTL_MS || (Date.now()-(_w.__ts||0))<=IMG_TTL_MS)) b64=_w.d; } }catch(_){} }   // 구 포맷(raw)·TTL초과·파싱실패 → miss로 처리하여 최신본 재요청
      if(!b64){ const d=await db.collection('images').doc(k).get(); if(d.exists && d.data().data){ b64=d.data().data; try{ localStorage.setItem('img:'+k, JSON.stringify({__ts:Date.now(), d:b64})); }catch(_){} } }
      if(b64){ imgCache[k]=b64; el.src=b64; }
    }catch(_){}
  }
}
// 해설 줄 판정 색 (빨강 우선 → 초록 → 중립). '정답'은 '정답이다'만 초록(결론단일 중립 유지)
function splitVerdict(ex){
  // 해설 끝의 판정어(옳다/옳지 않다 등)를 분리 → {v:판정, vc:색클래스, rest:교정문}
  if(!ex) return {v:'', vc:'', rest:''};
  var m=ex.match(/\s*(옳지\s*않다|옳지않다|적절하지\s*않다|적절하지않다|부적절하다|해당하지\s*않는다|해당되지\s*않는다|옳다|적절하다|맞다|틀리다|틀린다|해당한다|해당된다|아니다|아니라)(\s*\([^)]*\))?\.?\s*$/);
  if(!m) return {v:'', vc:'', rest:ex.trim()};
  var v=m[1].replace(/\s+/g,' ');
  // 판정어가 문장 맨앞(^)이거나 마침표 바로 뒤(=독립 판정문)일 때만 본문에서 제거.
  // 문장에 붙은 판정어("…쓴 이 보기는 옳지 않다")는 본문에 남겨 끊김 방지(배지는 그대로 표시).
  var before=ex.slice(0, m.index);
  var standalone=(before===''||/[.。]\s*$/.test(before));
  var rest=standalone ? before.replace(/[\s.·,]+$/,'').trim() : ex.trim();
  return {v:v, vc:verdictColor(v), rest:rest};
}
// 판정 배지 표시 문구를 표준 축(옳음/옳지 않음)으로 정규화 — 표시 전용(로직 verdictIsO는 원본 v 사용)
function verdictLabel(v){ if(!v) return v; if(/옳지|적절하지|부적절|틀리|틀린/.test(v)) return '옳지 않음'; if(/옳다|적절하다|맞다/.test(v)) return '옳음'; return v; }
// O/X 자가체크 → 실제 정답 판정 비교 (1단계)
function verdictIsO(v){
  if(!v) return null;
  if(/옳지|적절하지|부적절|틀리|해당하지\s*않|해당되지\s*않|아니다|아니라/.test(v)) return false;
  if(/옳다|적절하다|맞다|해당한다|해당된다/.test(v)) return true;
  return null;
}
function oxCompareHTML(q, oArr){
  try{
    var st = (typeof mqOX!=='undefined') && mqOX[q.id]; if(!st) return '';
    var rows=[];
    function cell(isO){ return '<td class="'+(isO?'oxc-o':'oxc-x')+'">'+(isO?'O':'X')+'</td>'; }
    function pushRow(label, key, oraw, optText){
      var mark=st[key]; if(!mark) return;                          // 안 찍은 건 비교 제외
      var sv=splitVerdict(stripRepeatedOpt(oraw, optText));
      var actO=verdictIsO(sv.v); if(actO===null) return;           // 판정 못 뽑으면 제외
      var myO=(mark==='O'), miss=(myO!==actO);
      rows.push('<tr'+(miss?' class="oxc-miss"':'')+'><td class="oxc-k">'+label+'</td>'+cell(myO)+cell(actO)+'</tr>');
    }
    var stmts=comboStmtList(q);
    if(stmts.length){ stmts.forEach(function(s,i){ pushRow(s.k, 's'+s.k, oArr[i]||'', s.t); }); }
    else { (q.opts||[]).forEach(function(opt,i){ pushRow(String(i+1), 'o'+i, oArr[i]||'', opt); }); }
    if(!rows.length) return '';
    return '<div class="oxcmp"><div class="oxcmp-h">🔎 내 O/X vs 정답</div>'+
      '<table class="oxc-tbl"><thead><tr><th>항목</th><th>내 선택</th><th>정답</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
  }catch(_){ return ''; }
}
// 표시한 O/X가 정답(exp.o 판정)과 전부 일치하면 true. 틀린 표시가 하나라도 있으면 false.
// 안 찍은 항목·판정 못 뽑는 항목(계산형 등)은 제외 → O/X를 아예 안 하면 불이익 없음.
function oxAllMatch(q){
  try{
    var st = (typeof mqOX!=='undefined') && mqOX[q.id]; if(!st) return true;
    var oArr = (q.exp && q.exp.o) || [];
    var stmts = comboStmtList(q);
    var items = stmts.length
      ? stmts.map(function(s,i){ return {key:'s'+s.k, oraw:oArr[i]||'', txt:s.t}; })
      : (q.opts||[]).map(function(opt,i){ return {key:'o'+i, oraw:oArr[i]||'', txt:opt}; });
    for(var j=0;j<items.length;j++){
      var mark=st[items[j].key]; if(!mark) continue;
      var sv=splitVerdict(stripRepeatedOpt(items[j].oraw, items[j].txt));
      var actO=verdictIsO(sv.v); if(actO===null) continue;
      if((mark==='O')!==actO) return false;
    }
    return true;
  }catch(_){ return true; }
}
function stripRepeatedOpt(exp, opt){
  if(!exp) return '';
  if(!opt) return exp.trim();
  // 공백 정규화 후, 해설이 보기 문장으로 시작하면 그 반복분을 제거
  var norm=function(s){ return String(s).replace(/\s+/g,' ').trim(); };
  var e=norm(exp), o=norm(opt);
  var orig=e;   // 잘라내기 취소용 원본
  // 보기 끝의 마침표 유무 차이를 흡수
  var oNoDot=o.replace(/[.\s]+$/,'');
  if(e.indexOf(o)===0){ e=e.slice(o.length); }
  else if(e.indexOf(oNoDot)===0){ e=e.slice(oNoDot.length); }
  e=e.replace(/^[\s.·,)\]]+/,'').trim();   // 남은 앞쪽 구두점 정리
  // 잘라낸 결과가 조사로 시작하면(보기+조사로 이어진 문장) 잘라내기 취소 → 주어 보존
  // 예: 보기 '…전입금' + 해설 '…전입금은 재원이다' → '은 재원이다'가 되는 것을 방지
  // 조사 뒤에 공백이 오는 경우만 조사로 판정(‘은 재원’=조사 / ‘은행’=명사 일부 → 제외)
  if(e !== orig && /^(은|는|이|가|을|를|과|와|도|의|에|에서|으로|로|만|뿐|께|까지|부터|이나|나|이라도|라도|이라는|라는|라고|이라고|으로서|로서|으로써|로써|에게|한테)\s/.test(e)){
    return orig;
  }
  return e;
}
function isComboQuestion(opts){
  // 보기들이 ㄱ/ㄴ/ㄷ/ㄹ/ㅁ·가/나/다/라/마 조합(+구분자)으로만 이루어진 문제인지
  if(!Array.isArray(opts) || opts.length<2) return false;
  var markerOnly=/^[ㄱ-ㅎ가나다라마바사아\s,·、ㆍ/]+$/;   // 한글 자모/조합 마커 + 구분자
  var hasJamo=/[ㄱ-ㅎ]/, comboCnt=0, ok=0;
  for(var i=0;i<opts.length;i++){
    var o=String(opts[i]||'').trim();
    if(!o) return false;
    if(o.length>14) return false;                 // 마커 조합은 짧음(일반 서술 보기 배제)
    if(!markerOnly.test(o)) return false;
    if(hasJamo.test(o) || /[가나다라마바사아]/.test(o)) ok++;
    if(o.replace(/[\s,·、ㆍ/]/g,'').length>=2) comboCnt++;  // 2글자 이상 = 조합
  }
  return ok===opts.length && comboCnt>=1;           // 모든 보기가 마커형 + 최소 1개는 조합
}
// 조합 변형형: 보기는 일반형(서술)이나 '옳은 묶음 1개만 고르는' 유형(예 형성권으로만 연결된 것).
// 판별 = exp.ex 내용칸이 정확히 1개 & 그 인덱스 == ans-1. 데이터에 새 필드 안 넣음.
// 계산형 분리: 계산형은 exp.o가 정답 1칸만(oFilled<=1)·그래프 동반 → oFilled>=2 & 그래프없음으로 배제.
function isComboVariant(q){
  if(!q||!q.exp) return false;
  if(Array.isArray(q.ans)) return false;                         // 단일 정답만
  var ans=q.ans|0; if(!ans) return false;
  var ex=Array.isArray(q.exp.ex)?q.exp.ex:[];
  var idx=-1, cnt=0;
  for(var i=0;i<ex.length;i++){ if(ex[i]&&String(ex[i]).trim()){ cnt++; idx=i; } }
  if(cnt!==1 || idx!==ans-1) return false;                       // ex 내용 정확히 1칸 & 정답칸
  if(q.exp.graph && String(q.exp.graph).trim()) return false;    // 그래프 있으면 계산형
  if(String(ex[idx]||'').indexOf('\u2192')<0) return false;      // CV는 정답 예시에 '→' 항목분해가 있어야 함(일반 SC 정답-only 예시 오분류 방지)
  var o=q.exp.o||[];
  return o.filter(Boolean).length>=2;                            // 계산형(oFilled<=1) 배제
}
function verdictColor(t){
  if(!t) return '';
  // 색은 '선지 내용의 참/거짓'만 판정 (정답 여부는 ✅ 아이콘이 따로 표시 — '정답이다'는 색 마커 아님)
  // 거짓(빨강): 옳지 않다/적절하지 않다/틀리다/다르다/아니다(판정)/부적절 등
  const red=['옳지 않다','옳지않다','옳지 못','옳지 않은','옳지않은','적절하지 않다','적절하지않다','적절하지 않은','부적절','틀리다','틀린','맞지 않','일치하지 않','다르다','바르지 않','해당하지 않','해당되지 않'];
  // 참(초록): 옳다/적절하다/맞다/바르다/일치한다 등
  const grn=['옳다','옳은','적절하다','적절한','맞다','맞는','바르다','일치한다','참이다'];
  // '부적절'이 있으면 그 안의 '적절'이 초록으로 잡히지 않도록 제거 후 초록 판정
  const tg=t.replace(/부적절/g,'').replace(/적절하지\s*않/g,'');
  let rPos=-1, gPos=-1;
  for(const m of red){ const i=t.lastIndexOf(m); if(i>rPos) rPos=i; }
  for(const m of grn){ const i=tg.lastIndexOf(m); if(i>gPos) gPos=i; }
  if(rPos<0 && gPos<0) return '';        // 판정어 없으면 중립(색 없음)
  return rPos>=gPos ? 'eo-red' : 'eo-grn';   // 동률이면 빨강 우선(부정 우선)
}
// 경제 수식 렌더링: 표시 직전에만 _아래첨자·^윗첨자·분수로 변환(데이터는 불변)
// allowBareFraction(맨분수 a/b)은 경제(econ)에서만 — 회계 콤마숫자·법규 축척 오변환 방지
function renderMath(text, allowBareFraction){
  if(text==null) return '';
  var s=String(text);
  var _stash=[];
  function _st(m){ _stash.push(m); return '\u0007'+(_stash.length-1)+'\u0008'; }
  // (00) <svg>…</svg> 보호
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, _st);
  // dia relation-diagram -> fixed-width <pre class="cc-dia"> (arrow alignment). stashed whole.
  s = s.replace(/\[dia\]\s*([\s\S]*?)\s*\[\/dia\]/g, function(_m, inner){ var body=String(inner).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\r?\n/g,"<br>"); return _st('<pre class="cc-dia">'+body+'</pre>'); });
  // (0) 절댓값 |…/…| → nowrap span(내부 / 는 \u0004). 통째로 보호(태그 슬래시가 분수로 오인되는 것 방지)
  s = s.replace(/\|([^|]*\/[^|]*)\|/g, function(m, inner){ return _st('<span style="white-space:nowrap">|'+inner.replace(/\//g,'\u0004')+'|</span>'); });
  // (00b) 남은 정상 HTML 태그(표·div·br·b 등) 보호 → 태그 내부 / 가 분수로 안 잡힘
  s = s.replace(/<\/?[A-Za-z][A-Za-z0-9]*(?:\s[^<>]*)?\/?>/g, _st);
  // (00c) 태그 밖 수학 부등호 < > → 엔티티(오파싱 방지)
  s = s.replace(/</g,'&lt;').replace(/>/g,'&gt;');
  s = s.replace(/[\u2460-\u2473]\s*/g, function(m){ return (m.charCodeAt(0)-9311)+'. '; });   // ①②③ 원번호 → 1. 2. 3. (답답함 완화)
  // (1) 괄호 분수 (a/b) 숫자/숫자 [전 과목]
  s = s.replace(/\((\d+)\/(\d+)\)/g, '\u0001$1\u0002$2\u0003');
  if(allowBareFraction){
    // (1b) 괄호 분수(변수·한글단위 분모) (P_X/P_Y),(150/시간) [econ]
    s = s.replace(/\(([^()\/\u0001-\u0003\u0007\u0008]+)\/([^()\/\u0001-\u0003\u0007\u0008]+)\)/g, '\u0001$1\u0002$2\u0003');
    // (1c) 변수/변수 경제 비율 → 분수 [econ]: 양변이 수학변수(문자+선택 _첨자·^첨자), 이미지·날짜·한글분모·∂·√·and/or 제외
    s = s.replace(/(?<![A-Za-z0-9_^:\/\u221A\u2202\uAC00-\uD7A3])([A-Za-z][A-Za-z0-9]{0,3}(?:_[A-Za-z0-9]+)?(?:\^[A-Za-z0-9]+)?)\/([A-Za-z][A-Za-z0-9]{0,3}(?:_[A-Za-z0-9]+)?(?:\^[A-Za-z0-9]+)?)(?![A-Za-z0-9_:\/\u221A\uAC00-\uD7A3])/g, function(m,a,b){ var stop=/^(and|or|per|the|of|to|in|on|km|kg|cm|mm)$/i; if(stop.test(a)||stop.test(b)) return m; return '\u0001'+a+'\u0002'+b+'\u0003'; });
    // (2) 맨 분수 숫자/숫자 [econ]
    s = s.replace(/(?<![\d\/.,])(\d+)\/(\d+)(?![\d\/])/g, '\u0001$1\u0002$2\u0003');
  }
  // (3) 윗첨자
  s = s.replace(/\^(\([^)]*\)|\u0001[^\u0003]*\u0003|[A-Za-z0-9]+)/g, function(m,g){ return '<sup>'+g.replace(/^\(|\)$/g,'')+'</sup>'; });
  // (4) 아래첨자
  s = s.replace(/_([A-Za-z0-9]+)/g, '<sub>$1</sub>');
  // (5) 분수 플레이스홀더 → HTML
  s = s.replace(/\u0001([^\u0002]+)\u0002([^\u0003]+)\u0003/g, '<span class="frac"><span class="fn">$1</span><span class="fd">$2</span></span>');
  // 복원: 보호분(태그·svg·절댓값), \u0004→/
  s = s.replace(/\u0007(\d+)\u0008/g, function(m,i){ return _stash[+i]||''; });
  s = s.replace(/\u0004/g, '/');
  return s;
}
// 문항이 경제(econ)인지 — id 접두 'e' 또는 과목코드 econ
function isEconQ(q){
  if(!q) return false;
  if(q._subj==='경제학원론') return true;
  var id=String(q.id||'');
  return /^e\d/.test(id);   // e22_1, e26_2 …
}
// 문항 텍스트 렌더: renderMath 적용(경제면 맨분수 허용)
function rm(text, q){ return renderMath(text, isEconQ(q)); }
function expNoteHTML(text, q){
  return rm(text, q)
    .replace(/\r\n?/g, '\n')
    .replace(/(^|\n)\s*([↓→])\s*(?=\n|$)/g, '$1<span class="note-arrow">$2</span>')
    .replace(/\n/g, '<br>');
}
// q 본문에서 ○로 시작하는 연속 줄을 문단 불릿으로(원문 텍스트 보존, 보이는 모양만 정리). ○ 없으면 그대로 통과.
function _jaryoDots(html){
  // 자료(선행학습) ○ 마커 → 작은 중앙점(줄 세로 가운데 정렬). 큰 빈 동그라미 대체.
  return String(html==null?'':html).replace(/\u25CB\s*/g,'<span class="jr-dot" style="display:inline-block;color:#94A3B8;font-size:.6em;line-height:1;vertical-align:middle;margin:0 5px 0 2px;position:relative;top:-1px">\u25CF</span>');
}
// [ADD 2026-07] 현가/연금 계수 블록을 표로 렌더 — q(불변)는 그대로 두고 화면만 (기간×이자율) 표로 정리.
//  대괄호 안에 '현가계수/연금현가/할인계수' + 'N기간 R%값' 항목이 있을 때만 변환. 파싱 실패 시 원문 유지(안전).
function _coefParse(inner){
  var rawGroups=String(inner).split(/\s+\/\s+/), groups=[], periodSet={};
  for(var gi=0; gi<rawGroups.length; gi++){
    var part=rawGroups[gi], ci=part.indexOf(':'); if(ci<0) continue;
    var label=part.slice(0,ci).replace(/현가계수[.．]?/,'').replace(/￦?\s*1\b/,'').replace(/[￦\s]+/g,' ').trim(); if(!label) label='계수';
    var body=part.slice(ci+1), rows={}, entries=body.split(/,\s*/);
    for(var ei=0; ei<entries.length; ei++){
      var em=entries[ei].match(/(\d+)\s*기간\s*(.+)/); if(!em) continue;
      var per=em[1], rk=em[2].split('/'), cells={};
      for(var ri=0; ri<rk.length; ri++){ var vm=rk[ri].match(/(\d+(?:\.\d+)?)\s*%\s*([\d.]+)/); if(vm) cells[vm[1]]=vm[2]; }
      if(Object.keys(cells).length){ rows[per]=cells; periodSet[per]=1; }
    }
    if(Object.keys(rows).length) groups.push({label:label, rows:rows});
  }
  return {groups:groups, periods:Object.keys(periodSet).map(Number).sort(function(a,b){return a-b;})};
}
function _coefTable(g){
  g.groups.forEach(function(gr){ var rs={}; g.periods.forEach(function(p){ var c=gr.rows[p]||{}; Object.keys(c).forEach(function(r){rs[r]=1;}); }); gr.rates=Object.keys(rs).map(Number).sort(function(a,b){return a-b;}).map(String); });
  var h='<table class="qcoef"><thead><tr><th rowspan="2">기간</th>';
  g.groups.forEach(function(gr){ h+='<th colspan="'+gr.rates.length+'">'+gr.label+'</th>'; });
  h+='</tr><tr>';
  g.groups.forEach(function(gr){ gr.rates.forEach(function(r){ h+='<th>'+r+'%</th>'; }); });
  h+='</tr></thead><tbody>';
  g.periods.forEach(function(p){ h+='<tr><td>'+p+'</td>'; g.groups.forEach(function(gr){ var c=gr.rows[p]||{}; gr.rates.forEach(function(r){ h+='<td>'+(c[r]!=null?c[r]:'')+'</td>'; }); }); h+='</tr>'; });
  return h+'</tbody></table>';
}
function _coefGridHTML(html){
  if(!html || html.indexOf('기간')<0) return html;
  if(!/현가계수|현재가치계수|연금현가|할인계수|현가율/.test(html)) return html;
  return String(html).replace(/\[([^\[\]]*?(?:현가계수|현재가치계수|연금현가|할인계수)[^\[\]]*?)\]/g, function(whole, inner){
    try{ var g=_coefParse(inner); if(!g||g.groups.length<1||g.periods.length<1) return whole; return _coefTable(g); }catch(e){ return whole; }
  });
}
/* [ADD 2026-07-17] 표 줄글 → HTML 표 렌더(앱 전용 · q 불변 · qid별 숫자검증 완료). */
var TP_MAP={"a2021_19":{"region":"- 벌과금 손금불산입 ₩20,000\n- 접대비한도초과액 15,000\n- 감가상각비한도초과액 15,000","html":"<table class=\"qtbl\"><tr><th>항목</th><th>금액</th></tr><tr><td>벌과금 손금불산입</td><td>₩20,000</td></tr><tr><td>접대비한도초과액</td><td>15,000</td></tr><tr><td>감가상각비한도초과액</td><td>15,000</td></tr></table>"},"a24_18":{"region":"단일금액 ￦1: 3기간 8%0.7938/10%0.7513, 4기간 8%0.7350/10%0.6830 / 정상연금 ￦1: 3기간 8%2.5771/10%2.4868, 4기간 8%3.3120/10%3.1698","html":"<table class=\"qtbl\"><caption>단일금액 ￦1의 현가</caption><tr><th>기간</th><th>8%</th><th>10%</th></tr><tr><td>3기간</td><td>0.7938</td><td>0.7513</td></tr><tr><td>4기간</td><td>0.7350</td><td>0.6830</td></tr></table><table class=\"qtbl\"><caption>정상연금 ￦1의 현가</caption><tr><th>기간</th><th>8%</th><th>10%</th></tr><tr><td>3기간</td><td>2.5771</td><td>2.4868</td></tr><tr><td>4기간</td><td>3.3120</td><td>3.1698</td></tr></table>"},"a26_20":{"region":"○ 연도별 노동시간: 당기투입노동시간 20×1년 1,000시간, 20×2년 2,000시간, 20×3년 3,000시간 / 추가예정노동시간 20×1년 4,000시간, 20×2년 3,000시간\n○ 연도별 계약원가: 당기발생원가 20×1년 ₩200,000, 20×2년 ₩300,000, 20×3년 ₩500,000 / 추가예정원가 20×1년 ₩600,000, 20×2년 ₩500,000","html":"<table class=\"qtbl\"><tr><th>구분</th><th>20×1년</th><th>20×2년</th><th>20×3년</th></tr><tr><td>당기투입노동시간</td><td>1,000시간</td><td>2,000시간</td><td>3,000시간</td></tr><tr><td>추가예정노동시간</td><td>4,000시간</td><td>3,000시간</td><td></td></tr><tr><td>당기발생원가</td><td>₩200,000</td><td>₩300,000</td><td>₩500,000</td></tr><tr><td>추가예정원가</td><td>₩600,000</td><td>₩500,000</td><td></td></tr></table>"},"r26_28":{"region":"연금의 현가계수(8 %, 5년): 3.9927, 연금의 현가계수(8 %, 6년): 4.6229 ○ 연금의 내가계수(8 %, 5년): 5.8666, 연금의 내가계수(8 %, 6년): 7.3359","html":"<table class=\"qtbl\"><caption>연금 현가/내가 계수 (8%)</caption><tr><th>구분</th><th>5년</th><th>6년</th></tr><tr><td>현가계수</td><td>3.9927</td><td>4.6229</td></tr><tr><td>내가계수</td><td>5.8666</td><td>7.3359</td></tr></table>"},"taxreg23_40":{"region":"구분 기준시가 실지거래가액 양도시 18억원 25억원 취득시 13억5천만원 19억5천만원","html":"<table class=\"qtbl\"><tr><th>구분</th><th>기준시가</th><th>실지거래가액</th></tr><tr><td>양도시</td><td>18억원</td><td>25억원</td></tr><tr><td>취득시</td><td>13억5천만원</td><td>19억5천만원</td></tr></table>"},"laborattorney1_mgmt_r33_110":{"region":"구분        1월    2월    3월    4월    5월\n실제 수요   680만  820만  720만  540만  590만","html":"<table class=\"qtbl\"><tr><th>구분</th><th>1월</th><th>2월</th><th>3월</th><th>4월</th><th>5월</th></tr><tr><td>실제 수요</td><td>680만</td><td>820만</td><td>720만</td><td>540만</td><td>590만</td></tr></table>"},"a22_12":{"region":"단일금액 ₩1의 현재가치: 6% 0.83962 / 10% 0.75131, 정상연금 ₩1의 현재가치: 6% 2.67301 / 10% 2.48685","html":"<table class=\"qtbl\"><thead><tr><th>구분</th><th>6%</th><th>10%</th></tr></thead><tbody><tr><td>단일금액 ₩1의 현재가치</td><td>0.83962</td><td>0.75131</td></tr><tr><td>정상연금 ₩1의 현재가치</td><td>2.67301</td><td>2.48685</td></tr></tbody></table>"},"a24_19":{"region":"단일금액 ￦1: 1기간 5%0.9524/6%0.9434, 2기간 5%0.9070/6%0.8900, 3기간 5%0.8638/6%0.8396 / 정상연금 ￦1: 1기간 5%0.9524/6%0.9434, 2기간 5%1.8594/6%1.8334, 3기간 5%2.7232/6%2.6730","html":"<table class=\"qtbl\"><caption>단일금액 ￦1의 현재가치</caption><thead><tr><th>기간</th><th>5%</th><th>6%</th></tr></thead><tbody><tr><td>1기간</td><td>0.9524</td><td>0.9434</td></tr><tr><td>2기간</td><td>0.9070</td><td>0.8900</td></tr><tr><td>3기간</td><td>0.8638</td><td>0.8396</td></tr></tbody></table><table class=\"qtbl\"><caption>정상연금 ￦1의 현재가치</caption><thead><tr><th>기간</th><th>5%</th><th>6%</th></tr></thead><tbody><tr><td>1기간</td><td>0.9524</td><td>0.9434</td></tr><tr><td>2기간</td><td>1.8594</td><td>1.8334</td></tr><tr><td>3기간</td><td>2.7232</td><td>2.6730</td></tr></tbody></table>"},"intro23_11":{"region":"구분 X지역 Y지역 전지역 A산업 30 50 80 B산업 50 40 90 C산업 60 50 110 D산업 100 20 120 E산업 80 60 140 전산업 고용자수 320 220 540","html":"<table class=\"qtbl\"><thead><tr><th>구분</th><th>X지역</th><th>Y지역</th><th>전지역</th></tr></thead><tbody><tr><td>A산업</td><td>30</td><td>50</td><td>80</td></tr><tr><td>B산업</td><td>50</td><td>40</td><td>90</td></tr><tr><td>C산업</td><td>60</td><td>50</td><td>110</td></tr><tr><td>D산업</td><td>100</td><td>20</td><td>120</td></tr><tr><td>E산업</td><td>80</td><td>60</td><td>140</td></tr><tr><td>전산업 고용자수</td><td>320</td><td>220</td><td>540</td></tr></tbody></table>"},"intro25_16":{"region":"매장면적(2022년 기준): A 500㎡, B 2,000㎡, C 1,000㎡ / 거리: A 5km, B 10km, C 5km","html":"<table class=\"qtbl\"><thead><tr><th>구분</th><th>점포 A</th><th>점포 B</th><th>점포 C</th></tr></thead><tbody><tr><td>매장면적(2022년 기준)</td><td>500㎡</td><td>2,000㎡</td><td>1,000㎡</td></tr><tr><td>거리</td><td>5km</td><td>10km</td><td>5km</td></tr></tbody></table>"},"taxreg24_40":{"region":"건물 구분 토지A 토지B (주택아님) 양도차익 15,000,000원 (20,000,000원) 25,000,000원 (차손) 양도일자 2024.3.10. 2024.5.20. 2024.6.25. 보유기간 1년 8개월 4년 3개월 3년 5개월","html":"<table class=\"qtbl\"><thead><tr><th>구분</th><th>토지A</th><th>건물(주택아님)</th><th>토지B</th></tr></thead><tbody><tr><td>양도차익</td><td>15,000,000원</td><td>20,000,000원(차손)</td><td>25,000,000원</td></tr><tr><td>양도일자</td><td>2024.3.10.</td><td>2024.5.20.</td><td>2024.6.25.</td></tr><tr><td>보유기간</td><td>1년 8개월</td><td>4년 3개월</td><td>3년 5개월</td></tr></tbody></table>"},"a22_28":{"region":"구분 / 20×1년 말 / 20×2년 말\n공정가치: ₩18,000 / ₩12,000\n회수가능액: 19,500 / 11,000","html":"<table class=\"qtbl\"><tr><th>구분</th><th>20×1년 말</th><th>20×2년 말</th></tr><tr><td>공정가치</td><td>₩18,000</td><td>₩12,000</td></tr><tr><td>회수가능액</td><td>19,500</td><td>11,000</td></tr></table>"},"a25_18":{"region":"단일 6%0.8396/9%0.7722, 연금 6%2.6730/9%2.5313","html":"<table class=\"qtbl\"><tr><th>구분</th><th>이자율</th><th>현가계수</th></tr><tr><td>단일</td><td>6%</td><td>0.8396</td></tr><tr><td>단일</td><td>9%</td><td>0.7722</td></tr><tr><td>연금</td><td>6%</td><td>2.6730</td></tr><tr><td>연금</td><td>9%</td><td>2.5313</td></tr></table>"},"r22_19":{"region":"연금현가계수(6%, 5): 4.212\nㅇ 연금현가계수(6%, 6): 4.917\nㅇ 연금내가계수(6%, 5): 5.637\nㅇ 연금내가계수(6%, 6): 6.975","html":"<table class=\"qtbl\"><tr><th>구분</th><th>이자율</th><th>기간</th><th>계수</th></tr><tr><td>연금현가계수</td><td>6%</td><td>5</td><td>4.212</td></tr><tr><td>연금현가계수</td><td>6%</td><td>6</td><td>4.917</td></tr><tr><td>연금내가계수</td><td>6%</td><td>5</td><td>5.637</td></tr><tr><td>연금내가계수</td><td>6%</td><td>6</td><td>6.975</td></tr></table>"},"intro23_12":{"region":"구분 점포 A 점포 B 점포 C 면적 750 m2 2,500 m2 500 m2 X지역 거주지 5 km 10 km 5 km 로부터의 거리","html":"<table class=\"qtbl\"><tr><th>구분</th><th>점포 A</th><th>점포 B</th><th>점포 C</th></tr><tr><td>면적</td><td>750 m2</td><td>2,500 m2</td><td>500 m2</td></tr><tr><td>X지역 거주지로부터의 거리</td><td>5 km</td><td>10 km</td><td>5 km</td></tr></table>"},"hm25_acct_40":{"region":"1월 400단위 / 2월 600단위 / 3월 800단위","html":"<table class=\"qtbl\"><tr><th>월</th><th>예상판매량</th></tr><tr><td>1월</td><td>400단위</td></tr><tr><td>2월</td><td>600단위</td></tr><tr><td>3월</td><td>800단위</td></tr></table>"},"a23_24":{"region":"감가상각비한도초과액 ₩55,000\n− 정기예금 미수이자 ₩25,000\n− 접대비한도초과액 ₩10,000\n− 자기주식처분이익 ₩30,000","html":"<table class=\"qtbl\"><tr><th>세무조정사항</th><th>금액</th></tr><tr><td>감가상각비한도초과액</td><td>₩55,000</td></tr><tr><td>정기예금 미수이자</td><td>₩25,000</td></tr><tr><td>접대비한도초과액</td><td>₩10,000</td></tr><tr><td>자기주식처분이익</td><td>₩30,000</td></tr></table>"},"a26_11":{"region":"단일금액: 7% 0.8163, 10% 0.7513 / 정상연금: 7% 2.6243, 10% 2.4868","html":"<table class=\"qtbl\"><caption>단일금액</caption><tr><th>7%</th><th>10%</th></tr><tr><td>0.8163</td><td>0.7513</td></tr></table><table class=\"qtbl\"><caption>정상연금</caption><tr><th>7%</th><th>10%</th></tr><tr><td>2.6243</td><td>2.4868</td></tr></table>"},"r24_39":{"region":"1월 ∼ 7월: 8만원/㎡, 8월 ∼ 12월: 20만원/㎡","html":"<table class=\"qtbl\"><tr><th>기간</th><th>예상매출액</th></tr><tr><td>1월 ∼ 7월</td><td>8만원/㎡</td></tr><tr><td>8월 ∼ 12월</td><td>20만원/㎡</td></tr></table>"},"intro23_35":{"region":"기 공시지가 소재지 용도지역 이용상황 호 (원/m2) 1 C동 110 준주거지역 상업용 6,000,000 2 C동 130 일반상업지역 상업용 8,000,000","html":"<table class=\"qtbl\"><tr><th>기호</th><th>소재지</th><th>용도지역</th><th>이용상황</th><th>공시지가 (원/m2)</th></tr><tr><td>1</td><td>C동 110</td><td>준주거지역</td><td>상업용</td><td>6,000,000</td></tr><tr><td>2</td><td>C동 130</td><td>일반상업지역</td><td>상업용</td><td>8,000,000</td></tr></table>"},"hm26_acct_28":{"region":"10% 2기간 단일금액 0.8264 정상연금 1.7355 / 3기간 단일금액 0.7513 정상연금 2.4868","html":"<table class=\"qtbl\"><caption>10%</caption><tr><th>기간</th><th>단일금액</th><th>정상연금</th></tr><tr><td>2</td><td>0.8264</td><td>1.7355</td></tr><tr><td>3</td><td>0.7513</td><td>2.4868</td></tr></table>"},"a24_12":{"region":"단일금액 ￦1: 1기간 5%0.9524/12%0.8928, 2기간 5%0.9070/12%0.7972, 3기간 5%0.8638/12%0.7118 / 정상연금 ￦1: 1기간 5%0.9524/12%0.8928, 2기간 5%1.8594/12%1.6900, 3기간 5%2.7232/12%2.4018","html":"<table class=\"qtbl\"><caption>단일금액 ￦1의 현가</caption><tr><th>기간</th><th>5%</th><th>12%</th></tr><tr><td>1기간</td><td>0.9524</td><td>0.8928</td></tr><tr><td>2기간</td><td>0.9070</td><td>0.7972</td></tr><tr><td>3기간</td><td>0.8638</td><td>0.7118</td></tr></table><table class=\"qtbl\"><caption>정상연금 ￦1의 현가</caption><tr><th>기간</th><th>5%</th><th>12%</th></tr><tr><td>1기간</td><td>0.9524</td><td>0.8928</td></tr><tr><td>2기간</td><td>1.8594</td><td>1.6900</td></tr><tr><td>3기간</td><td>2.7232</td><td>2.4018</td></tr></table>"},"a26_12":{"region":"연도말 표시이자지급액: 20×1년 ₩10,000, 20×2년 ₩10,000, 20×3년 ₩10,000 / 포괄손익계산서상 이자비용: 20×1년 13,288, 20×2년 13,781, 20×3년 14,348","html":"<table class=\"qtbl\"><tr><th>연도</th><th>표시이자지급액</th><th>이자비용</th></tr><tr><td>20×1년</td><td>₩10,000</td><td>13,288</td></tr><tr><td>20×2년</td><td>₩10,000</td><td>13,781</td></tr><tr><td>20×3년</td><td>₩10,000</td><td>14,348</td></tr></table>"},"hm28_acct_20":{"region":"단일금액 8%=0.7938 10%=0.7513 / 정상연금 8%=2.5771 10%=2.4869","html":"<table class=\"qtbl\"><caption>단일금액 현재가치계수</caption><tr><th>8%</th><th>10%</th></tr><tr><td>0.7938</td><td>0.7513</td></tr></table><table class=\"qtbl\"><caption>정상연금 현재가치계수</caption><tr><th>8%</th><th>10%</th></tr><tr><td>2.5771</td><td>2.4869</td></tr></table>"},"a24_17":{"region":"토지A: 20×1말 ￦1,100 / 20×2말 ￦950 / 20×3말 ￦920, 토지B: 20×1말 1,700 / 20×2말 2,000 / 20×3말 2,100","html":"<table class=\"qtbl\"><tr><th></th><th>20×1말</th><th>20×2말</th><th>20×3말</th></tr><tr><td>토지A</td><td>￦1,100</td><td>￦950</td><td>￦920</td></tr><tr><td>토지B</td><td>1,700</td><td>2,000</td><td>2,100</td></tr></table>"},"a26_13":{"region":"단일금액: 5% 0.8638, 8% 0.7938 / 정상연금: 5% 2.7232, 8% 2.5771","html":"<table class=\"qtbl\"><caption>단일금액 ￦1의 현가</caption><tr><th>5%</th><th>8%</th></tr><tr><td>0.8638</td><td>0.7938</td></tr></table><table class=\"qtbl\"><caption>정상연금 ￦1의 현가</caption><tr><th>5%</th><th>8%</th></tr><tr><td>2.7232</td><td>2.5771</td></tr></table>"},"r26_27":{"region":"연금의 현가계수(2.4 %, 15년): 12.4729, 연금의 현가계수(2.4 %, 20년): 15.7374 ○ 연금의 현가계수(6.0 %, 15년): 9.7122, 연금의 현가계수(6.0 %, 20년): 11.4699","html":"<table class=\"qtbl\"><caption>연금의 현가계수</caption><tr><th>이자율</th><th>15년</th><th>20년</th></tr><tr><td>2.4 %</td><td>12.4729</td><td>15.7374</td></tr><tr><td>6.0 %</td><td>9.7122</td><td>11.4699</td></tr></table>"},"intro24_28":{"region":"1월 ∼ 6월: 매월 10만원/m2 - 7월 ∼ 12월: 매월 19만원/m2","html":"<table class=\"qtbl\"><tr><td>1월 ∼ 6월</td><td>매월 10만원/m2</td></tr><tr><td>7월 ∼ 12월</td><td>매월 19만원/m2</td></tr></table>"},"taxreg23_35":{"region":"구분 보증금 월세1) 기준시가 (주거전용면적) A주택(85 m2) 3억원 5십만원 5억원 B주택(40 m2) 1억원 - 2억원 C주택(109 m2) 5억원 1백만원 7억원","html":"<table class=\"qtbl\"><tr><th>구분(주거전용면적)</th><th>보증금</th><th>월세1)</th><th>기준시가</th></tr><tr><td>A주택(85 m2)</td><td>3억원</td><td>5십만원</td><td>5억원</td></tr><tr><td>B주택(40 m2)</td><td>1억원</td><td>-</td><td>2억원</td></tr><tr><td>C주택(109 m2)</td><td>5억원</td><td>1백만원</td><td>7억원</td></tr></table>"},"laborattorney1_econ_r33_87":{"region":"B국 높은보조금   B국 중간보조금   B국 낮은보조금\nA국 높은보조금  (600, 100)      (400, 200)      (100, 650)\nA국 중간보조금  (300, 300)      (550, 500)      (350, 350)\nA국 낮은보조금  (100, 750)      (300, 350)      (200, 550)","html":"<table class=\"qtbl\"><tr><th></th><th>B국 높은보조금</th><th>B국 중간보조금</th><th>B국 낮은보조금</th></tr><tr><td>A국 높은보조금</td><td>(600, 100)</td><td>(400, 200)</td><td>(100, 650)</td></tr><tr><td>A국 중간보조금</td><td>(300, 300)</td><td>(550, 500)</td><td>(350, 350)</td></tr><tr><td>A국 낮은보조금</td><td>(100, 750)</td><td>(300, 350)</td><td>(200, 550)</td></tr></table>"}};
var _TP_SENT='\u2063\u2063TPTBL\u2063\u2063';
function tpPrepQ(q){ try{ if(!q||!q.id||!TP_MAP[q.id]) return q&&q.q; var m=TP_MAP[q.id], str=(q.q==null?"":String(q.q));
    if(m.region && str.indexOf(m.region)>=0) return str.replace(m.region,_TP_SENT); return str; }catch(e){ return q&&q.q; } }
function tpSwap(html,qid){ try{ if(!qid||!TP_MAP[qid]) return html; var h=String(html==null?"":html);
    if(h.indexOf(_TP_SENT)<0) return html; return h.replace(_TP_SENT, "<div class=\"qtbl-wrap\">"+TP_MAP[qid].html+"</div>"); }catch(e){ return html; } }
function stemHTML(html){
  // 순수 산문 스템만 문장(…다.) 단위로 단락 분리. ○/ㄱㄴㄷ 조합·자료형, 1문장은 기존 그대로.
  if(!html) return html;
  html=_coefGridHTML(html);   // [ADD 2026-07] 계수 블록 → 표(화면 전용)
  // [ADD] 발문 진술형 원문자 마커(㉠~㉭ + 따옴표) 앞 줄바꿈 — 질문머리(㉠~㉣이)·괄호빈칸(( ㉠ ))은 제외
  html=String(html).replace(/\s*([\u3260-\u326D])(\s*["\u201C\u201F\u300C])/g, '<br>$1$2');
  if(html.indexOf('\u25CB')>=0 || /(^|\n)\s*[ㄱ-ㅎ]\s*[.\u00B7)\]]/.test(html)) return bulletStem(html);
  var marked=String(html).replace(/(다[.])\s+/g,'$1\u0001');
  var parts=marked.split('\u0001').filter(function(s){return s.trim();});
  if(parts.length<2) return html;
  return parts.map(function(s){return '<div class="qpara">'+s.trim()+'</div>';}).join('');
}
function bulletStem(html){
  if(!html || html.indexOf('\u25CB')<0) return html;
  var lines=String(html).split('\n'), out='', buf=[], textRun=[];
  function flushText(){ if(textRun.length){ out+=(out?'\n':'')+textRun.join('\n'); textRun=[]; } }
  function flushBul(){
    if(!buf.length) return;
    out+='<div class="qbul-wrap">'+buf.map(function(t){
      return '<div class="qbul"><span class="qbul-m" style="color:#94A3B8;font-size:.6em;line-height:1;vertical-align:middle">\u25CF</span><span class="qbul-t">'+t+'</span></div>';
    }).join('')+'</div>';
    buf=[];
  }
  for(var i=0;i<lines.length;i++){
    var m=lines[i].match(/^\s*\u25CB\s*(.*)$/);
    if(m){ flushText(); buf.push(m[1]); }
    else { flushBul(); textRun.push(lines[i]); }
  }
  flushText(); flushBul();
  return out;
}
// 한 줄짜리 인라인 조합형: "( ㄱ. … ㄴ. … ㄷ. … ㄹ. … )"처럼 괄호 안에 ㄱ.지문이 묶인 그룹을
// 자료(jaryo)로 떼어낸다. 진술 내부 괄호 대비 → 괄호 균형으로 그룹 끝을 잡고,
// 단서 괄호 등 그 외 텍스트(앞+뒤)는 stem으로 합친다.
function extractInlineComboGroup(qt){
  var s=String(qt||'');
  if(!/[ㄱ-ㅎ]\s*[.\u00B7)\]]/.test(s)) return null;       // 진술 마커 자체가 없으면 패스
  for(var i=0;i<s.length;i++){
    if(s[i]!=='(') continue;
    var depth=0, j=i;
    for(; j<s.length; j++){
      if(s[j]==='(') depth++;
      else if(s[j]===')'){ depth--; if(depth===0) break; }
    }
    if(depth!==0) return null;                              // 닫는 괄호 불균형 → 시도 중단
    var inner=s.slice(i+1, j);
    var marks=inner.match(/(^|\s)[ㄱ-ㅎ]\s*[.\u00B7)\]]/g); // 그룹 내 진술 마커들
    if(/(^|\s)ㄱ\s*[.\u00B7)\]]/.test(inner) && marks && marks.length>=2){
      var before=s.slice(0,i).trim();
      var after=s.slice(j+1).trim();                        // 단서 "(단, …)" 등 — stem 유지
      var stem=(before+(after?' '+after:'')).trim();
      return {q:stem, jaryo:inner.trim()};
    }
    i=j;                                                    // 이 괄호 그룹은 자료 아님 → 건너뛰고 계속
  }
  return null;
}
// ===== OX진술 학습: 내가 틀린 OX진술(자가체크 오답) → 문제+진술+개념 카드, 최근순 =====
// 틀린 진술 0개일 때 띄우는 안내 배너가 연결될 게시글 id. ★크리스: 커뮤니티에 안내글 작성 후 그 글 id를 여기에 넣으세요(예: 'AbC123...'). 비우면 커뮤니티 홈으로 이동.
var OX_GUIDE_POST='p0dNwHXmeTus8NNPAxOM';
function oxGuideOpen(){
  try{
    // [2026-07-20] 안내 게시글은 새 탭으로 — 앱 내 이동 시 백버튼 꼬임 방지
    if(OX_GUIDE_POST){ window.open('/#post/'+OX_GUIDE_POST, '_blank'); }
    else if(typeof openCommunity==='function') openCommunity();
  }catch(_){}
}
// 한 문항의 '틀린 + 미완료' OX진술 항목 추출. oxAllMatch와 같은 판정(splitVerdict/verdictIsO).
function oxWrongItems(q){
  var out=[];
  try{
    var st=mqOX[q.id]; if(!st) return out;
    var oArr=(q.exp&&q.exp.o)||[];
    var stmts=comboStmtList(q);
    var items = stmts.length
      ? stmts.map(function(s,i){ return {key:'s'+s.k, idx:i, label:s.k, txt:s.t, oraw:oArr[i]||''}; })
      : (q.opts||[]).map(function(opt,i){ return {key:'o'+i, idx:i, label:String(i+1), txt:opt, oraw:oArr[i]||''}; });
    var learned=mqOXLearned[q.id]||{};
    items.forEach(function(it){
      var mark=st[it.key]; if(!mark) return;          // 안 누른 진술 제외
      if(learned[it.key]) return;                      // 학습 완료된 진술 제외
      var sv=splitVerdict(stripRepeatedOpt(it.oraw, it.txt));
      var actO=verdictIsO(sv.v); if(actO===null) return;
      if((mark==='O')!==actO){
        it.myO=(mark==='O'); it.actO=actO; out.push(it);
      }   // 표시 ≠ 정답 = 틀림 (개념 유무와 무관하게 노출, 개념은 있으면 표시·없으면 '준비 중')
    });
  }catch(_){}
  return out;
}
// ot 태그 → 관련 개념(마스터) 조회
function oxConceptsFor(q, idx){
  var out=[];
  try{
    var ot=(q.exp&&q.exp.ot)||[]; var e=ot[idx]; if(!e||e.skip) return out;
    (e.cpt||[]).forEach(function(c){ var cc=cptResolve(c); if(cc) out.push(cc); });
  }catch(_){}
  return out;
}
// 좁은 OX 카드 안전 렌더: 표/SVG/이미지/figure 등 카드 폭을 깨거나 미닫힘으로 다음 카드를 삼킬 수 있는 마크업이
// 섞이면 텍스트만 추출(개념 비교표 등은 OX 카드엔 부적합). 그 외엔 기존 rm()(분수·첨자) 유지.
// 카드 텍스트 안전 렌더: 표·SVG·이미지가 섞이면 좁은 카드에서 세로로 깨지므로 텍스트만 추출
function oxSafeHTML(t,q){
  var h=rm(t,q);
  try{
    if(/<(table|svg|img|figure|thead|tbody|tr|td|th)\b/i.test(h)){
      var d=document.createElement('div'); d.innerHTML=h;
      h=(d.textContent||d.innerText||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\s+/g,' ').trim();
    }
  }catch(_){}
  return h;
}
function oxLearnCards(cert){
  var qb=qbOf(cert), cards=[], seen={};
  Object.keys(qb).forEach(function(sub){ (qb[sub].sets||[]).forEach(function(stt){ (stt.questions||[]).forEach(function(q){
    var w=oxWrongItems(q); if(w.length){ cards.push({q:q, subName:qb[sub].name||sub, wrong:w, ts:mqOXTs[q.id]||0}); seen[q.id]=1; }
  }); }); });
  Object.keys(qb).forEach(function(sub){   // 변형(레벨업) 풀도 스캔
    try{
      var b=(typeof AD_DATA!=='undefined')&&AD_DATA[cert+'|'+sub]; var vp=(b&&b.variantPool)||[];
      vp.forEach(function(v){ if(!v||!v.id||seen[v.id]) return;
        var w=oxWrongItems(v); if(w.length){ cards.push({q:v, subName:(v._topicName||qb[sub].name||sub), wrong:w, ts:mqOXTs[v.id]||0}); seen[v.id]=1; }
      });
    }catch(e){}
  });
  cards.sort(function(a,b){ return (b.ts||0)-(a.ts||0); });   // 최근순
  return cards;
}
function oxLearnCount(cert){ var n=0; oxLearnCards(cert).forEach(function(c){ n+=c.wrong.length; }); return n; }
function oxLearnGo(){ mqScreen='oxlearn'; renderMCQ(); window.scrollTo(0,0); }
function oxLearnBack(){ mqScreen='home'; renderMCQ(); window.scrollTo(0,0); }
function oxLearnComplete(qid){
  var qb=qbOf(mqCert), q=null;
  Object.keys(qb).some(function(sub){ return (qb[sub].sets||[]).some(function(stt){ return (stt.questions||[]).some(function(x){ if(x.id===qid){q=x;return true;} return false; }); }); });
  if(!q){ Object.keys(qb).some(function(sub){ try{ var b=(typeof AD_DATA!=='undefined')&&AD_DATA[mqCert+'|'+sub]; var vp=(b&&b.variantPool)||[]; return vp.some(function(v){ if(v&&v.id===qid){q=v;return true;} return false; }); }catch(e){ return false; } }); }   // 변형 풀 폴백
  if(!q) return;
  mqOXLearned[qid]=mqOXLearned[qid]||{};
  oxWrongItems(q).forEach(function(it){ mqOXLearned[qid][it.key]=1; });   // 현재 틀린 진술들 완료 처리
  mqOXSave();
  renderOxLearn(document.getElementById('mcqRoot'));
}
function renderOxLearn(root){
  var cards=oxLearnCards(mqCert);
  var html='<div class="oxl-wrap"><div class="oxl-top"><button class="oxl-back" onclick="oxLearnBack()">‹ 홈</button><div class="oxl-title">OX진술 학습</div><div class="oxl-cnt">'+cards.reduce(function(s,c){return s+c.wrong.length;},0)+'개</div></div>';
  if(!cards.length){
    html+='<div class="oxl-empty">틀린 OX진술이 없어요.<br>문제 풀 때 보기 옆 O/X 자가체크에서 틀린 진술이 여기 모여요.</div></div>';
    root.innerHTML=html; return;
  }
  cards.forEach(function(cd){
    var q=cd.q, stem=splitJaryo(q.q, q.jaryo).q || q.q;
    html+='<div class="oxl-card">';
    html+='<div class="oxl-sub">'+mqEsc(cd.subName)+(q.set?(' · '+mqEsc(q.set)):'')+'</div>';
    html+='<div class="oxl-q">'+oxSafeHTML(stem,q)+'</div>';
    cd.wrong.forEach(function(it){
      html+='<div class="oxl-stmt"><div class="oxl-stmt-h"><span class="oxl-k">'+mqEsc(it.label)+'</span>'+
        '<span class="oxl-badge">내 답 '+(it.myO?'O':'X')+' · 정답 '+(it.actO?'O':'X')+'</span></div>';
      var _st=it.txt||'', _ex=it.oraw||'';
      if(_st){
        html+='<div class="oxl-stmt-t">'+oxSafeHTML(_st,q)+'</div>';
        if(_ex && _ex!==_st) html+='<div class="oxl-exp"><span class="oxl-exp-ti">해설</span> '+oxSafeHTML(_ex,q)+'</div>';
      } else if(_ex){
        html+='<div class="oxl-stmt-t">'+oxSafeHTML(_ex,q)+'</div>';
      }
      var cs=oxConceptsFor(q, it.idx);
      if(cs.length){
        html+='<div class="oxl-cpt"><div class="oxl-cpt-ti">관련 개념</div>';
        cs.forEach(function(cc){ (cc.cards||[]).forEach(function(card){
          html+='<div class="oxl-cpt-row"><div style="font-weight:500;color:#0C447C;margin-bottom:6px">'+oxSafeHTML(card.t||cc.name||'',q)+'</div>'+(card.d?('<div>'+oxSafeHTML(card.d,q)+'</div>'):'')+'</div>';
        }); });
        html+='</div>';
      } else {
        html+='<div class="oxl-cpt oxl-cpt-none">관련 개념 태그 준비 중</div>';
      }
      html+='</div>';   // .oxl-stmt 닫기 (누락 시 진술 박스가 중첩되어 좌측 테두리가 쌓임)
    });
    html+='<button class="oxl-done" onclick="oxLearnComplete(\''+q.id+'\')">학습 완료</button>';
    html+='</div>';
  });
  html+='</div>';
  root.innerHTML=html;
}
function splitJaryo(qt, explicitJaryo){
  // 데이터에 jaryo 필드가 명시돼 있으면 추측 파싱을 하지 않고 그대로 쓴다(발문 q는 안 자름).
  // (ㄱ)·○·[ 등을 발문 안에서 추측해 자르던 로직의 오인을 근본 차단. SA가 쓰던 q.jaryo 컨벤션을 MCQ로 확장.
  if(explicitJaryo!=null && String(explicitJaryo).trim()!==''){
    return {q:String(qt||'').trim(), jaryo:String(explicitJaryo).trim()};
  }
  if(!qt) return {q:qt||'', jaryo:''};
  const b=qt.indexOf('[');
  if(b>0) return {q:qt.slice(0,b).trim(), jaryo:qt.slice(b).trim()};
  const nl=qt.indexOf('\n');
  if(nl>0) return {q:qt.slice(0,nl).trim(), jaryo:qt.slice(nl+1).trim()};
  const inl=extractInlineComboGroup(qt);                   // 인라인 조합형 폴백
  if(inl) return inl;
  // 괄호 라벨 빈칸 ( ㄱ )( ㄴ ): 첫 라벨 빈칸부터 자료로 (질문 끝 (단,…) 조건 grab보다 우선)
  // 단, 답 자리표시 (ㄱ)(ㄴ)는 발문 안(물음표 앞)에 오는 인라인 라벨이므로 자료로 떼지 않는다.
  // 예) "균형가격(ㄱ)과 균형거래량(ㄴ)의 변화는? ○ 수요함수…" → (ㄱ)에서 자르면 발문이 잘리고 ○자료가 망가짐.
  // 진짜 빈칸 자료는 물음표 뒤에 온다(예 "…옳은 것은? ( ㄱ ): …"). 물음표 앞 라벨이면 건너뛰고 아래 ? 분리로 처리.
  var _bk=qt.match(/\(\s*[\u3131-\u314E]\s*\)/);
  if(_bk){
    var _qm=qt.indexOf('?');
    var _inlineLabel=(_qm>=0 && _bk.index<_qm);   // 물음표 앞 (ㄱ) = 답 자리표시 → 자료 아님
    if(!_inlineLabel){
      var _h=qt.slice(0,_bk.index).trim(), _r=qt.slice(_bk.index).trim();
      if(_h && _r.length>=6) return {q:_h, jaryo:_r};
    }
  }
  const qm=qt.indexOf('?');
  if(qm>0 && qm<qt.length-1){
    let head=qt.slice(0,qm+1); let rest=qt.slice(qm+1);
    const m=rest.match(/^\s*(\([^)]*\))/);
    if(m){ head+=' '+m[1]; rest=rest.slice(m[0].length); }
    rest=rest.trim();
    if(rest.length>=10) return {q:head.trim(), jaryo:rest};
  }
  return {q:qt, jaryo:''};
}
// ㄱ~ㅁ 지문 마커를 줄바꿈/인라인 모두 인식해 분리 → {intro, stmts:[{k,t}]}
function splitStmtMarkers(text){
  var s=String(text||'').replace(/<br\s*\/?>/gi,'\n');
  var re=/(^|\s)([ㄱ-ㅎ])[.\u00B7)\]]/g, m, hits=[];
  while((m=re.exec(s))){ hits.push({k:m[2], mAt:m.index+m[1].length, tAt:re.lastIndex}); }
  if(!hits.length) return {intro:s.trim(), stmts:[]};
  var intro=s.slice(0, hits[0].mAt).trim();
  var stmts=[];
  for(var i=0;i<hits.length;i++){
    var end=(i+1<hits.length)?hits[i+1].mAt:s.length;
    stmts.push({k:hits[i].k, t:s.slice(hits[i].tAt, end).replace(/\s+/g,' ').trim()});
  }
  return {intro:intro, stmts:stmts};
}
function parseJaryoStmts(qt, explicitJaryo){
  // 자료 영역에서 ㄱ/ㄴ/ㄷ/ㄹ/ㅁ 지문 추출(줄·인라인 모두) → [{k,t}, ...]
  var jaryo=(splitJaryo(qt, explicitJaryo).jaryo)||qt||'';
  var st=splitStmtMarkers(jaryo).stmts;
  // [FIX] 조합형이 표(explicit jaryo)를 함께 가지면 splitJaryo가 표를 자료로 잡아
  //       표 안에서 ㄱㄴㄷ 진술을 못 찾는다(진술은 발문 qt에 있음).
  //       → 자료에 진술 마커가 없고 explicit jaryo가 있을 때만 발문 qt에서 재탐색.
  if(!st.length && explicitJaryo!=null && String(explicitJaryo).trim()!==''){
    st=splitStmtMarkers(String(qt||'')).stmts;
  }
  return st;
}

// 괄호빈칸 짝맞추기형: 질문의 ( ㄱ )( ㄴ ) 빈칸과 그 설명 추출 → [{k,t}]
function parseBlankStmts(qt){
  var s=String(qt||''), re=/\(\s*([\u3131-\u314E])\s*\)/g, m, hits=[];
  while((m=re.exec(s))){ hits.push({k:m[1], at:m.index, end:re.lastIndex}); }
  if(!hits.length) return [];
  var out=[];
  for(var i=0;i<hits.length;i++){
    var st=hits[i].end, en=(i+1<hits.length)?hits[i+1].at:s.length;
    var t=s.slice(st,en).replace(/^[\s:\uFF1A]+/,'').replace(/\s+/g,' ').trim();
    out.push({k:hits[i].k, t:t});
  }
  return out;
}
// 정답 보기("ㄱ: 제외지, ㄴ: 체비지")에서 빈칸별 정답 용어 추출 → {ㄱ:'제외지', ㄴ:'체비지'}
function blankPairTerms(opt){
  var map={};
  String(opt||'').split(/[,\uFF0C\u00B7\/]/).forEach(function(seg){
    var mm=seg.match(/([\u3131-\u314E])\s*[:\uFF1A]\s*(.+)/);
    if(mm) map[mm[1]]=mm[2].trim();
  });
  return map;
}

// ( ㄱ )( ㄴ ) 빈칸 자료를 빈칸마다 줄내림(hanging). 빈칸 2개 미만이면 null.
function jaryoBlanksHTML(jaryoText, q){
  var bs=parseBlankStmts(jaryoText);
  if(bs.length<2) return null;
  return '<div class="jaryo">'+bs.map(function(st){
    return '<div class="jr-stmt"><span class="jr-stmt-t">( '+st.k+' ) '+rm(st.t,q)+'</span></div>';
  }).join('')+'</div>';
}
// 보기("ㄱ, ㄴ" 등)에서 쓰인 ㄱ~ㅁ 글자를 순서대로 추출
function comboLettersFromOpts(opts){
  var order='ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ', seen={};
  (opts||[]).forEach(function(o){ (String(o).match(/[ㄱ-ㅎ]/g)||[]).forEach(function(c){ seen[c]=1; }); });
  return order.split('').filter(function(c){ return seen[c]; });
}
// 조합형 지문 목록: 자료 텍스트에 지문이 있으면 그걸, 없으면(이미지형) 보기 글자로 — exp.o 순서와 1:1
// ===== 배정형(참거짓 ㄱㄴㄷㄹ / 매칭 ㉠㉡㉢㉣) =====
function _assignPairs(q){
  var opts=q.opts||[]; var ans=Array.isArray(q.ans)?q.ans[0]:q.ans; if(!ans) return null;
  var opt=opts[ans-1]; if(!opt) return null;
  if(isComboQuestion(opts)) return null;
  var parts=String(opt).split('/'); if(parts.length<2) return null;
  var out=[];
  for(var i=0;i<parts.length;i++){
    var m=parts[i].trim().match(/^([\u3131-\u314E\u3260-\u326D])\s*(.+)$/);
    if(!m) return null;
    out.push({k:m[1], v:m[2].trim()});
  }
  return out;
}
function _tfAssign(q){ var ap=_assignPairs(q); if(!ap) return null; return ap.every(function(p){ return /^(참|거짓|옳음|옳지\s*않음|옳지않음|맞다|틀리다|틀린다)/.test(p.v); }) ? ap : null; }
function _splitExpByMarker(text, order){
  var s=String(text||''); if(!s||!order||order.length<2) return null;
  var starts=[], from=0;
  for(var i=0;i<order.length;i++){
    var re=new RegExp('(^|[\\s,(\\uFF08])('+order[i]+')(?=[\\s(\\uFF08])','g'); re.lastIndex=from;
    var m=re.exec(s);
    if(m){ var at=m.index+m[1].length; starts.push(at); from=at+1; } else starts.push(-1);
  }
  if(starts.filter(function(x){return x>=0;}).length<2) return null;
  var segs=[];
  for(var j=0;j<order.length;j++){
    if(starts[j]<0) continue;
    var nx=s.length;
    for(var k=j+1;k<order.length;k++){ if(starts[k]>=0){ nx=starts[k]; break; } }
    segs.push({k:order[j], t:s.slice(starts[j], nx).trim().replace(/[,\uFF0C\s]+$/,'')});
  }
  return segs;
}
function comboStmtList(q){
  var st=parseJaryoStmts(q.q, q.jaryo);
  if(st.length) return st;
  if(isComboQuestion(q.opts)) return comboLettersFromOpts(q.opts).map(function(k){ return {k:k, t:''}; });
  return [];
}
function mnBoxHTML(mn){
  if(!mn) return '';
  var cards=mnBoxCards(mnResolve(mn));
  if(!cards.length || cards[0].broken) return '';
  return cards.map(function(cd,i){
    var num=cd.num?'<span class="mn-num">'+cd.num+'</span> ':'';
    return '<div class="mn-box'+(i>0?' mn-box-extra':'')+'">'+(i===0?'<div class="mn-ti">암기코드</div>':'')+num+mnChantHTML(cd.code,null,cd.kind)+'<div class="mn-code">'+cd.code+'</div>'+(cd.desc?'<div class="mn-desc'+((cd.desc&&(cd.desc.match(/↓/g)||[]).length>=2&&cd.desc.indexOf('↑')<0)?' mn-flow':'')+'">'+cd.desc+'</div>':'')+'</div>';
  }).join('');
}
// exp.cpt(참조 개념) → 마스터 카드 펼침. 없으면 exp.c(인라인) 폴백. (개념 마스터 마이그레이션 이중지원)
function _conceptCards(q){
  var e=q&&q.exp; if(!e) return [];
  if(Array.isArray(e.cpt) && e.cpt.length){
    var out=[];
    e.cpt.forEach(function(r){ var c=cptResolve(r); if(c&&Array.isArray(c.cards)) c.cards.forEach(function(cd){ out.push(cd); }); });
    if(out.length) return out;
  }
  return Array.isArray(e.c)?e.c:[];
}
function _hasConcept(e){ return !!(e && ((Array.isArray(e.cpt)&&e.cpt.length) || (Array.isArray(e.c)&&e.c.length))); }
// 개념(exp.cpt)이 묶은 하위 마스터 참조(mn/tbl/grp) 수집 — "개념=마스터의 마스터" 체인
function _conceptChain(q, field){
  var e=q&&q.exp; if(!e || !Array.isArray(e.cpt) || !e.cpt.length) return [];
  var out=[]; e.cpt.forEach(function(r){ var c=cptResolve(r); if(c){ var v=c[field]; if(v){ (Array.isArray(v)?v:[v]).forEach(function(x){ if(x!=null) out.push(x); }); } } }); return out;
}
function conceptBoxHTML(c){
  if(!Array.isArray(c) || !c.length) return '';
  const rows=c.map(it=> (it&&it.t)?('<div class="cc-row"><b style="display:block;margin-bottom:2px">'+it.t+'</b>'+(it.d||'')+'</div>'):'').join('');
  if(!rows) return '';
  return '<div class="concept-box"><div class="concept-ti">개념설명</div>'+rows+'</div>';
}
// 개념 카드 HTML: exp.learn 있으면 그걸로, 없으면 exp.c로 폴백
function conceptCardHTML(q){
  const L=(q.exp&&q.exp.learn)?q.exp.learn:null;
  let body='';
  if(L){
    if(L.title) body+='<div class="ltitle">'+rm(L.title,q)+'</div>';
    if(L.sum)   body+='<div class="lsum">💡 '+rm(L.sum,q)+'</div>';   // v1 호환(신규엔 없음)
    (L.secs||[]).forEach((s,i)=>{
      body+='<div class="lsec"><div class="lsec-t"><span class="lico">'+(i+1)+'</span>'+rm(s.t||'',q)+'</div><div class="lsec-d">'+rm(s.d||'',q)+'</div></div>';
    });
    // 연표 (timeline): {y,e}
    if(Array.isArray(L.timeline)&&L.timeline.length){
      body+='<div class="lblk"><div class="lblk-h">연표</div>';
      L.timeline.forEach(it=>{ body+='<div class="lrow"><span class="lk">'+rm(it.y||'',q)+'</span><span class="ldot">·</span>'+rm(it.e||'',q)+'</div>'; });
      body+='</div>';
    }
    // 인물/장소/조약 (n,d 공통)
    const ndBlock=(arr,label)=>{
      if(!Array.isArray(arr)||!arr.length) return '';
      let h='<div class="lblk"><div class="lblk-h">'+label+'</div>';
      arr.forEach(it=>{ h+='<div class="lrow"><span class="lk">'+rm(it.n||'',q)+'</span><span class="ldot">·</span>'+rm(it.d||'',q)+'</div>'; });
      return h+'</div>';
    };
    body+=ndBlock(L.people,'인물');
    body+=ndBlock(L.places,'장소·유적');
    body+=ndBlock(L.treaties,'조약');
    // 판별 단서 (cue) / 마무리·오답 정리 (wrap)
    if(L.cue)  body+='<div class="lcue"><span class="lcue-tag">이렇게 나오면</span>'+rm(L.cue,q)+'</div>';
    if(L.wrap) body+='<div class="lwrap"><span class="lwrap-tag">정리</span>'+rm(L.wrap,q)+'</div>';
    if(L.trap) body+='<div class="ltrap"><div class="lsec-t"><span class="lico">!</span>함정 포인트</div><div class="lsec-d">'+rm(L.trap,q)+'</div></div>';   // v1 호환
  } else {
    // 폴백: 기존 exp.c(개념) 나열
    const cs=_conceptCards(q);
    if(!cs.length){ body+='<div class="lsum">이 문제의 개념 설명이 아직 준비 중입니다. 바로 문제를 풀어볼까요?</div>'; }
    cs.forEach((c,i)=>{
      var sec='<div class="lsec"><div class="lsec-t"><span class="lico">'+(i+1)+'</span>'+rm(c.t||'',q)+'</div><div class="lsec-d">'+rm(c.d||'',q)+'</div>';
      if(c.cx && String(c.cx).trim()) sec+='<div class="cc-ex">'+rm(String(c.cx).trim(),q)+'</div>';
      else if(mqCert==='bodybuilding' && c.exd && String(c.exd).trim()) sec+='<div class="cc-exd">💡 '+rm(String(c.exd).trim(),q)+'</div>';
      if(c.ex && String(c.ex).trim()) sec+='<div class="cc-ex">'+rm(String(c.ex).trim(),q)+'</div>';
      body+=sec+'</div>';
    });
  }
  return body;
}
// 조합형 ㄱㄴㄷㄹ 텍스트 진술 끝에 O/X 자가체크 버튼(기능 없음·펜 대용). 이미지 진술은 마커 없어 자동 제외.
// 개수형(COUNT): type==="COUNT" 또는 "몇 개"+○진술 2개↑. 채점=일반 SC(①~⑤ 선택), O/X=진술 자가체크.
function isCountType(q){
  if(!q || !Array.isArray(q.opts)) return false;
  if(q.type==='COUNT') return true;
  if(!/몇\s*개/.test(String(q.q||''))) return false;
  return (String(q.q||'').match(/○/g)||[]).length>=2;
}
// q에서 첫 ○부터 ○ 마커로 진술 분리(인라인·줄단위 모두) → {head, stmts[]}. q 글자 불변(렌더타임 파서).
function splitCountStmts(text){
  var s=String(text||''); var i=s.indexOf('○');
  if(i<0) return {head:s.trim(), stmts:[]};
  var head=s.slice(0,i).trim();
  var stmts=s.slice(i).split('○').map(function(t){return t.trim();}).filter(function(t){return t;});
  return {head:head, stmts:stmts};
}
// 개수형 스템: 질문머리 + ○진술 각 줄(withOX면 진술별 O/X data-oxk=b+i). 선지(1개~5개)는 opts에서 답 선택만.
function countStemHTML(rawStem, q, withOX){
  var sp=splitCountStmts(rawStem);
  var head=sp.head ? '<div class="qpara">'+rm(sp.head,q)+'</div>' : '';
  var rows=sp.stmts.map(function(t,i){
    var oxb=withOX?('<span class="jr-ox" data-oxk="b'+i+'"><button type="button" class="jox jox-o" onclick="joxToggle(this)">O</button><button type="button" class="jox jox-x" onclick="joxToggle(this)">X</button></span>'):'';
    return '<div class="qbul"><span class="qbul-m" style="color:#94A3B8;font-size:.6em;line-height:1;vertical-align:middle">●</span><span class="qbul-t">'+rm(t,q)+oxb+'</span></div>';
  }).join('');
  return head+'<div class="qbul-wrap">'+rows+'</div>';
}
function markComboStmts(scope, addOX){
  (scope||document).querySelectorAll('#mcqView .jaryo').forEach(function(el){
    if(el.dataset.oxed) return;
    function stmtHTML(inner, letter){
      var ox = addOX ? ('<span class="jr-ox" data-oxk="s'+letter+'"><button type="button" class="jox jox-o" onclick="joxToggle(this)">O</button>'+
        '<button type="button" class="jox jox-x" onclick="joxToggle(this)">X</button></span>') : '';
      var body=inner, labHTML='';
      if(letter){ var _m=inner.match(new RegExp('^\\s*'+letter+'\\s*[.\\s\u00b7)\\]]+\\s*')); if(_m){ labHTML='<span class="jr-stmt-k">'+letter+'.</span>'; body=inner.slice(_m[0].length); } }
      var _dotFix = labHTML ? '' : ' style="padding-left:2px;text-indent:0"';   // ○ 점 문장: 내어쓰기 제거(점이 박스 밖으로 나가는 것 방지). ㄱㄴㄷ(labHTML)는 기존 유지
      return '<div class="jr-stmt"'+_dotFix+'>'+(labHTML?labHTML+'<span class="jr-stmt-t">'+body+'</span>':'<span class="jr-stmt-t">'+inner+'</span>')+ox+'</div>';
    }
    var html=el.innerHTML;
    var hasTag=/<(?!br\s*\/?>)[a-zA-Z]/.test(html);   // <br> 외 태그(이미지·표 등) 포함 여부
    if(hasTag){
      // 태그 섞인 자료: 기존 줄 기준 처리(안전)
      var mk=/^\s*([\u3131-\u3141])[.\s·)\]]/;
      var lines=html.split(/\r?\n/);
      if(!lines.some(function(l){ return mk.test(l); })){ el.dataset.oxed=1; return; }
      var groups=[], cur=null;
      lines.forEach(function(ln){
        if(mk.test(ln)){ cur={lines:[ln]}; groups.push(cur); }
        else if(cur && ln.trim()){ cur.lines.push(ln); }
        else groups.push({intro:ln});
      });
      el.innerHTML=groups.map(function(g){
        if(g.intro!=null) return g.intro.trim()?'<div class="jr-line">'+g.intro+'</div>':'';
        return stmtHTML(g.lines.join('<br>'), (g.lines[0].match(mk)||[])[1]||'');
      }).join('');
      el.dataset.oxed=1; return;
    }
    // 평문 자료: 인라인·줄 모두 마커 단위로 분리
    var res=splitStmtMarkers(html);
    if(!res.stmts.length){ el.dataset.oxed=1; return; }
    var out='';
    if(res.intro) out+='<div class="jr-line">'+res.intro.replace(/\n/g,'<br>')+'</div>';
    out+=res.stmts.map(function(s){ return stmtHTML(s.k+'. '+s.t, s.k); }).join('');
    el.innerHTML=out; el.dataset.oxed=1;
  });
}
// 이미지형 조합형(지문이 이미지에 있는 경우): 이미지 아래 ㄱㄴㄷㄹ O/X 줄
function imgComboOXRow(q){
  try{
    if(mqInReview) return '';
    if(!isComboQuestion(q.opts)) return '';
    if(parseJaryoStmts(q.q).length) return '';     // 자료 텍스트에 지문 있으면 기존(지문별) 방식
    var letters=comboLettersFromOpts(q.opts);
    if(letters.length<2) return '';
    var groups=letters.map(function(k){
      return '<span class="oxg" data-oxk="s'+k+'"><span class="oxg-k">'+k+'</span>'+
        '<button type="button" class="jox jox-o" onclick="joxToggle(this)">O</button>'+
        '<button type="button" class="jox jox-x" onclick="joxToggle(this)">X</button></span>';
    }).join('');
    return '<div class="oximg"><div class="oximg-hd">내 O/X 체크</div>'+groups+'</div>';
  }catch(_){ return ''; }
}
function joxToggle(btn){
  var on=btn.classList.contains('on');
  var wrap=btn.parentNode;
  wrap.querySelectorAll('.jox').forEach(function(b){ b.classList.remove('on'); });
  if(!on) btn.classList.add('on');   // 켜진 걸 다시 누르면 해제(토글)
  // 문항별 저장(이전/다음 이동 후에도 유지). 키 = data-oxk(대상), 값 = O|X
  try{
    var k=wrap.getAttribute('data-oxk');
    if(k && mqCurId){
      if(!mqOX[mqCurId]) mqOX[mqCurId]={};
      if(on) delete mqOX[mqCurId][k];                                   // 껐으면 제거
      else mqOX[mqCurId][k]= btn.classList.contains('jox-o')?'O':'X';   // 켰으면 O/X 저장
      if(!Object.keys(mqOX[mqCurId]).length) delete mqOX[mqCurId];
      mqOXTs[mqCurId]=Date.now();                                 // 최근 상호작용 시각(OX진술 학습 최근순)
      if(mqOXLearned[mqCurId]) delete mqOXLearned[mqCurId][k];    // 그 진술 다시 건드림 → 완료 해제(다시 틀리면 재등장)
      mqOXSave();
    }
  }catch(_){}
  // OX 자가체크는 복습에 미반영 — O/X 토글은 위에서 표시 저장(mqOX)만 하고, 복습 채점(srRateK)은 트리거하지 않음.
  //  복습 = 오답 + 찍음만. (진술별 개념 태그가 붙으면 OX 정밀 반영 재검토)
}
// 저장된 O/X를 현재 문항 화면에 다시 칠하기
function restoreOX(root){
  if(!mqCurId) return;
  var st=mqOX[mqCurId]; if(!st) return;
  (root||document).querySelectorAll('#mcqView [data-oxk]').forEach(function(wrap){
    var v=st[wrap.getAttribute('data-oxk')]; if(!v) return;
    var b=wrap.querySelector(v==='O'?'.jox-o':'.jox-x'); if(b) b.classList.add('on');
  });
}
// 자료박스(.jaryo): "항목명\t금액" 줄을 flex 2열로 정렬(금액 ₩ 세로 정렬). TAB 없는 줄은 그대로.
function fmtJaryo(scope){
  (scope||document).querySelectorAll('#mcqView .jaryo').forEach(function(el){
    if(el.dataset.aligned) return;
    var html=el.innerHTML;
    if(html.indexOf('\t')<0){ el.dataset.aligned=1; return; }
    var lines=html.split(/\n/);
    var meas=document.createElement('span');
    meas.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font:inherit';
    el.appendChild(meas);
    var maxW=0;
    lines.forEach(function(ln){ var i=ln.indexOf('\t'); if(i>=0){ meas.textContent=ln.slice(0,i); if(meas.offsetWidth>maxW) maxW=meas.offsetWidth; } });
    meas.textContent='   '; var pad3=meas.offsetWidth;   // 공백 3칸
    el.removeChild(meas);
    var labelW=maxW+pad3;
    el.innerHTML=lines.map(function(ln){
      var i=ln.indexOf('\t');
      if(i<0) return '<div class="jr-line">'+ln+'</div>';
      return '<div class="jr-row"><span class="jr-l" style="min-width:'+labelW+'px">'+ln.slice(0,i)+'</span><span class="jr-r">'+ln.slice(i+1)+'</span></div>';
    }).join('');
    el.dataset.aligned=1;
  });
}
// ===== 주관식(SA) 단답형 빈칸 — blanks[] 보유 문항. 객관식 경로와 완전 분리 =====
function isSA(q){ return !!(q && Array.isArray(q.blanks) && q.blanks.length); }
function saNormTerm(s){
  s=String(s==null?'':s).normalize('NFC').trim().replace(/\s+/g,'');
  s=s.replace(/['"\u201C\u201D\u2018\u2019()\u300C\u300D\u300E\u300F\u00B7\u318D]/g,'');
  s=s.replace(/[A-Za-z]+/g,function(m){return m.toLowerCase();});
  return s;
}
function saNumTok(s){ var m=String(s==null?'':s).match(/-?\d+(?:\.\d+)?/); return m?Number(m[0]):null; }
function saBlankOK(b, val){
  if(b==null) return false;
  if(val==null || String(val).trim()==='') return false;
  var acc=(Array.isArray(b.accept)&&b.accept.length)?b.accept:[b.ans];
  var nv=saNormTerm(val);
  for(var i=0;i<acc.length;i++){ if(nv!=='' && saNormTerm(acc[i])===nv) return true; }   // 정규화 문자열 일치(공통)
  if(b.kind==='num'){                                                                       // 수치 비교
    var iv=saNumTok(val); if(iv===null) return false;
    for(var j=0;j<acc.length;j++){ var av=saNumTok(acc[j]); if(av!==null && av===iv) return true; }
  }
  return false;
}
function saGrade(q, ansObj){
  ansObj=(ansObj&&typeof ansObj==='object')?ansObj:{};
  var per=q.blanks.map(function(b){ return saBlankOK(b, ansObj[b.label]); });
  var n=per.filter(Boolean).length;
  return { per:per, n:n, m:q.blanks.length, allOK:(n===q.blanks.length) };
}
function saAnswered(q, ansObj){
  ansObj=(ansObj&&typeof ansObj==='object')?ansObj:{};
  return q.blanks.every(function(b){ var v=ansObj[b.label]; return v!=null && String(v).trim()!==''; });
}
// 중앙 채점 분기: SA면 saGrade(전부 정답일 때만 정답), 아니면 기존 isCorr
function mqCorrect(q, a){ return isSA(q) ? saGrade(q, a).allOK : isCorr(q.ans, a); }
// 빈칸 입력 → mqAns[qid]={label:value}. 재렌더 안 함(입력 포커스 유지)
function saInput(qid, label, val){
  if(!mqAns[qid] || typeof mqAns[qid]!=='object') mqAns[qid]={};
  mqAns[qid][label]=val;
  if(typeof mqSaveProgress==='function') mqSaveProgress();
}
function renderSaExam(root, q, qs, pct, examName, examSet){
  var qid=q.id;
  var ansObj=(mqAns[qid]&&typeof mqAns[qid]==='object')?mqAns[qid]:{};
  var showExp=mqShow[qid];
  var stem=q.q||''; var jaryo=q.jaryo||'';
  var curSubj=(q&&q._subj)?q._subj:'';
  var tags=(mqInReview?mcqMasteryBadge(q):'')+impBadge(q)+timeBadge(q);
  var guessOn=!!mqGuess[qid];
  var guessToggle = mqInReview ? (guessOn?'<span class="guess-tag-r">\uD83C\uDFB2 \uCC0D\uC74C</span>':'')
    : '<button class="guess-toggle'+(guessOn?' on':'')+'" onclick="mqToggleGuess(\''+qid+'\')"><span class="gdot"></span>\uD83C\uDFB2 \uCC0D\uC5C8\uC5B4\uC694</button>';
  var mqReportBtn = mqInReview ? '' : '<button class="mq-report" onclick="openReportMcq(\''+qid+'\')" title="\uBB38\uC81C \uC624\uB958 \uC2E0\uACE0">\u26A0\uFE0F \uC2E0\uACE0</button>';
  var inputs=q.blanks.map(function(b){
    var v=(ansObj[b.label]!=null)?String(ansObj[b.label]):'';
    var ok=showExp?saBlankOK(b,v):null;
    var cls='sa-in'+(showExp?(ok?' cor':' wr'):'');
    var im=(b.kind==='num')?' inputmode="numeric"':'';
    var dis=showExp?' disabled':'';
    var mark=showExp?(ok?'<span class="sa-ok">\u2713</span>':'<span class="sa-no">\u2717</span>'):'';
    var ansShow=showExp?'<div class="sa-ans">\uC815\uB2F5: '+rm(String(b.ans||''),q)+'</div>':'';
    return '<div class="sa-row"><span class="sa-lab">'+b.label+'</span>'+
      '<input class="'+cls+'" type="text"'+im+dis+' value="'+v.replace(/"/g,'&quot;')+'" oninput="saInput(\''+qid+'\',\''+b.label+'\',this.value)" placeholder="\uB2F5 \uC785\uB825">'+
      mark+ansShow+'</div>';
  }).join('');
  var expHTML='';
  if(showExp){
    var g=saGrade(q,ansObj);
    var statusTxt=g.allOK?'\uC815\uB2F5':(saAnswered(q,ansObj)?'\uC624\uB2F5':'\uBBF8\uC751\uB2F5');
    var statusCol=g.allOK?'#0F6E56':'#A32D2D';
    var body='';
    if(q.exp && q.exp.s && !(q.exp.exSum&&q.exp.exSum.length)) body+='<div class="note">'+expNoteHTML(q.exp.s,q)+'</div>';
    var oArr=(q.exp&&q.exp.o)||[];
    if(oArr.length){
      body+='<div class="exp-opts">'+q.blanks.map(function(b,i){
        var ex=oArr[i]||'';
        return '<div class="eo"><div class="eo-q">'+b.label+'. '+rm(String(b.ans||''),q)+'</div>'+(ex?'<div class="eo-a">'+rm(String(ex),q)+'</div>':'')+'</div>';
      }).join('')+'</div>';
    }
    var _cc=_conceptCards(q); if(_cc.length){
      body+=tipBlockHTML(q);   // SA: 개념설명 앞 → ⚡ 시험 포인트
      body+='<div class="concept-box"><div class="concept-ti">\uAC1C\uB150\uC124\uBA85</div>'+_cc.map(function(it){
        if(!it||!it.t) return '';
        var row='<div class="concept-row"><div style="font-weight:500;color:#0C447C;margin-bottom:6px">'+rm(it.t,q)+'</div>'+(it.d?'<div>'+rm(it.d,q)+'</div>':'')+'</div>';
        if(it.cx && String(it.cx).trim()) row+='<div class="cc-ex">'+rm(String(it.cx).trim(),q)+'</div>';
        if(it.ex && String(it.ex).trim()) row+='<div class="cc-ex">'+rm(String(it.ex).trim(),q)+'</div>';
        return row;
      }).join('')+'</div>';
    }
    body+=grpBlockHTML(q);   // 개념 뒤 → 그래프
    body+=itvBlockHTML(q);   // 개념 뒤 → 인터랙티브
    body+=tblBlockHTML(q);   // → 표 (해설 순서: 암기코드→개념→그래프→표)
    expHTML='<div class="exp"><div class="exp-note-hd">\uD559\uC2B5 \uB178\uD2B8</div><div class="exp-hd"><span class="exp-ti">\uD574\uC124</span><span class="exp-st" style="color:'+statusCol+'">'+statusTxt+' \u00B7 '+g.n+'/'+g.m+' \uC815\uB2F5</span></div>'+body+'</div>';
  }
  root.innerHTML=
    '<div class="exam-sticky">'+
    '<div class="exam-hd"><button class="exam-back" onclick="'+(mqInReview?'mqBackToResult()':'mqBackHome()')+'" aria-label="\uB4A4\uB85C">'+BACK_ARROW+'</button>'+
      '<div class="exam-ti"><div class="nm">'+(mqInReview?'\uACB0\uACFC \uAC80\uD1A0':examName)+'</div><div class="st">'+(mqInReview?'\uC804\uCCB4 \uBB38\uD56D':examSet)+(curSubj?' \u00B7 '+curSubj:'')+'</div></div>'+
      (mqInReview?'':('<button class="etim-pause'+(mqPaused?' on':'')+'" onclick="mqTogglePause()" title="'+(mqPaused?'\uACC4\uC18D\uD558\uAE30':'\uC77C\uC2DC\uC815\uC9C0')+'">'+(mqPaused?'\u25B6':'\u23F8')+'</button><span class="etim'+(mqTimeUp?' over':(mqTimeLeft<=300?' red':''))+(mqPaused?' paused':'')+'" id="mqTimer">'+(mqTimeUp?('+'+mqFmt(mqOverElapsed())):mqFmt(mqTimeLeft))+'</span>'))+'</div>'+
    '<div class="mq-prog"><div class="row"><span id="mqProgNum">'+(mqIdx+1)+' / '+qs.length+' \uBB38\uD56D</span><span></span></div><div class="track prog-drag" onpointerdown="mqProgStart(event)"><div class="bar" style="width:'+pct+'%"></div></div></div>'+
    '<div class="qstem"><div class="qhead"><div class="qnum">'+(mqIdx+1)+'</div>'+tags+mqReportBtn+guessToggle+'</div><div class="qtext">'+stemHTML(rm(stem,q))+'</div></div>'+
    '</div>'+
    '<div class="qcard">'+(jaryo?'<div class="jaryo">'+_jaryoDots(rm(jaryo,q).replace(/ \/ /g,'<br>'))+'</div>':'')+(q.img?'<div class="qimg">'+imgInner(q.img)+'</div>':'')+
    '<div class="sa-list">'+inputs+'</div>'+
    '<div class="mcq-foot"><button class="mbtn mbtn-prev" '+(mqIdx===0?'disabled':'')+' onclick="mqNav(-1)">\u25C0 \uC774\uC804</button>'+
    '<button class="mbtn mbtn-exp" onclick="mqToggleExp(\''+qid+'\')">'+(showExp?'\uC815\uB2F5 \uC228\uAE30\uAE30':'\uC815\uB2F5\u00B7\uD574\uC124')+'</button>'+
    '<button class="mbtn mbtn-next" onclick="mqNav(1)">'+(mqIdx>=qs.length-1?(mqInReview?'\uACB0\uACFC\uB85C \u2713':'\uCC44\uC810 \u2713'):'\uB2E4\uC74C \u25B6')+'</button></div>'+
    expHTML+'</div>';
  resolveImages(root); if(typeof fmtJaryo==='function') fmtJaryo(root);
}
function renderMcqExam(root){
  const subObj=(mqReview||mqDiag)?null:curQB()[mqSub];
  const sets=subObj?subObj.sets:[];
  const examName=mqGather?('약점: '+mqGatherLabel):mqDiag?'레벨 테스트':mqReview?'오늘의 복습':subObj.name;
  const examSet=mqGather?(mqList?mqList.length+'문항 모아풀기':'모아풀기'):mqDiag?'실력 측정':mqReview?'자동복습':(sets[mqSet]?sets[mqSet].label:'');
  const qs=mqQuestions(); if(mqIdx>=qs.length)mqIdx=qs.length-1; if(mqIdx<0)mqIdx=0;
  const q=qs[mqIdx]; const pct=Math.round((mqIdx+1)/qs.length*100);
  mqCurId=(q&&q.id)||null;
  // [2026-07-20] 문제 상단 컨텍스트: 몇 회 기출(혼합 모드에서) + 단원명(과목 상세목차) → 헤더 .st 뒤에 덧붙임
  const qCtx=(function(){ if(!q) return ''; var parts=[]; try{
      var cs=(typeof MCQ_QID2CS!=='undefined')&&MCQ_QID2CS[q.id];
      if(cs&&cs.lab&&cs.lab!==examSet) parts.push(cs.lab);                       // 복습·모아풀기 등 혼합 모드에서 원 회차 표시
      var _sc=(q&&q._subj)?q._subj:mqSub;
      var info=(typeof adLookup==='function')&&adLookup(mqCert,_sc,q.id);
      if(info&&info.topic&&typeof topicNameMap==='function'){
        var _k=mqCert+'|'+_sc, _tm=_qCtxTNM[_k];
        if(!_tm||!Object.keys(_tm).length){ _tm=topicNameMap(mqCert,_sc); _qCtxTNM[_k]=_tm; }   // AD_DATA 늦게 로드돼도 다음 렌더에서 갱신
        var _nm=(_tm[info.topic]||{}).name; if(_nm&&_nm!==info.topic) parts.push(_nm);
      }
    }catch(_){}
    return parts.length?(' · '+parts.join(' · ')):''; })();
  // 개념학습 모드 - 개념 카드 단계
  if(mqConcept && mqConceptPhase==='learn'){
    root.innerHTML=
      '<div class="exam-sticky">'+
      '<div class="exam-hd"><button class="exam-back" onclick="mqBackHome()" aria-label="뒤로">'+BACK_ARROW+'</button>'+
        '<div class="exam-ti"><div class="nm">선행학습</div><div class="st">'+(sets[mqSet]?sets[mqSet].label:'')+'</div></div></div>'+
      '<div class="mq-prog"><div class="row"><span>'+(mqIdx+1)+' / '+qs.length+' 개념</span><span></span></div><div class="track"><div class="bar" style="width:'+pct+'%"></div></div></div>'+
      '</div>'+
      '<div class="learn-hd"><span class="learn-step">📖 선행학습</span><span class="learn-num">'+(mqIdx+1)+' / '+qs.length+'</span></div>'+
      '<div class="lcard">'+conceptCardHTML(q)+
        '<button class="solve-btn" onclick="mqConceptSolve()">이 개념으로 문제 풀기 →</button></div>';
    resolveImages(root);
    return;
  }
  if(isSA(q)){ renderSaExam(root,q,qs,pct,examName,examSet+qCtx); return; }
  if(q && q.type==='SA' && !isSA(q)){   // type=SA인데 blanks 유실 → 객관식 오인 방지, 데이터 오류 조기 경고
    root.innerHTML='<div class="exam-sticky"><div class="exam-hd"><button class="exam-back" onclick="mqBackHome()" aria-label="\uB4A4\uB85C">'+BACK_ARROW+'</button><div class="exam-ti"><div class="nm">'+examName+'</div><div class="st">'+examSet+'</div></div></div></div>'+
      '<div style="margin:16px;padding:14px 16px;background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:10px;color:#A32D2D;font-weight:700;font-size:14px;line-height:1.6">\u26A0\uFE0F \uC8FC\uAD00\uC2DD(SA) \uBB38\uD56D\uC778\uB370 blanks\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4 \u2014 \uB370\uC774\uD130 \uD655\uC778 \uD544\uC694 ('+(q.id||'')+')</div>';
    return;
  }
  const sel=mqAns[q.id]; const showExp=mqShow[q.id]; const isMulti=Array.isArray(q.ans);
  const optOX = !mqInReview && !isComboQuestion(q.opts) && !isCountType(q);   // 일반형 보기에 O/X(조합형=자료 ㄱㄴㄷ, 개수형=○ 진술에 부착)
  const optHTML=q.opts.map((o,i)=>{const n=i+1; let cls='opt';
    if(showExp){ if(ansArr(q.ans).includes(n))cls+=' cor'; else if(sel===n)cls+=' wr'; else cls+=' dim'; }
    else if(sel===n)cls+=' sel';
    const oimg=(q.optImg && q.optImg[i])?'<div class="oimg">'+imgInner(q.optImg[i])+'</div>':'';
    const oxBtns=(optOX && o && !showExp)?'<span class="opt-ox" data-oxk="o'+i+'" onclick="event.stopPropagation()"><button type="button" class="jox jox-o" onclick="event.stopPropagation();joxToggle(this)">O</button><button type="button" class="jox jox-x" onclick="event.stopPropagation();joxToggle(this)">X</button></span>':'';
    const otxt=o?('<div class="otxt">'+_jaryoDots(rm(o,q))+oxBtns+'</div>'):'';   // [2026-07-20] 보기 ○→· 일관 적용
    return '<div class="'+cls+(oimg?' opt-img':'')+'" onclick="mqPick(\''+q.id+'\','+n+')"><div class="onum">'+n+'</div>'+otxt+oimg+'</div>';
  }).join('');
  let expHTML='';
  if(showExp){ const okk=isCorr(q.ans,sel);
    const ansN=ansArr(q.ans);
    const statusTxt = okk?'정답':(sel?'오답':'미응답');
    const statusCol = okk?'#0F6E56':'#A32D2D';
    const multiTxt = isMulti?(ansN.length===5?' (전항정답)':' (복수정답)'):'';
    let body='';
    const oArr=(q.exp && q.exp.o)||[];
    const oFilled=oArr.filter(Boolean).length;
    var _isCalc = (q.calc===true) ? (oFilled>=1) : (q.calc===false) ? false : (q.type==='CALC' ? (oFilled>=1) : (oFilled===1));   // calc 축 우선 → 없으면 type=CALC → 없으면 oFilled 폴백(하위호환)
    if(q.exp && q.exp.s && !(q.exp.exSum&&q.exp.exSum.length)) body+='<div class="note">'+expNoteHTML(q.exp.s,q)+'</div>';
    var isCombo=isComboQuestion(q.opts);
    var stmts = isCombo ? parseJaryoStmts(q.q) : [];
    var comboOK = isCombo && stmts.length>0 && stmts.length===oFilled;  // 파싱수=교정문수 일치할 때만
    var exArr=(q.exp && Array.isArray(q.exp.ex))?q.exp.ex:[];
    var isCV=!comboOK && isComboVariant(q);   // 조합 변형형(정답 묶음 1개만)
    var blankStmts=(!comboOK && !isCV)?parseBlankStmts(q.q):[];   // 괄호빈칸 짝맞추기
    var _apairs=(!comboOK && !isCountType(q) && !(blankStmts.length>=2 && oFilled===blankStmts.length)) ? _assignPairs(q) : null;
    var _asegs=_apairs ? _splitExpByMarker(oArr[(ansArr(q.ans)[0]||1)-1]||'', _apairs.map(function(p){return p.k;})) : null;
    if(isCountType(q)){
      var cStmts=splitCountStmts(q.q).stmts;
      body+='<div class="exp-opts">'+cStmts.map(function(t,i){
        var raw=oArr[i]||'';
        var sv=splitVerdict(stripRepeatedOpt(raw, t));
        var verdictTag = sv.v ? ' <span class="eo-verdict '+sv.vc+'">'+verdictLabel(sv.v)+'</span>' : '';
        var q1='<div class="eo-q">○ '+rm(t,q)+verdictTag+'</div>';
        var a1= sv.rest ? ('<div class="eo-a">'+rm(sv.rest,q)+'</div>') : '';
        return '<div class="eo">'+q1+a1+'</div>';
      }).join('')+'</div>';
      var trueCount=cStmts.reduce(function(acc,t,i){ var sv2=splitVerdict(oArr[i]||''); return acc+(verdictIsO(sv2.v)===true?1:0); },0);
      var ansOpt=(q.opts&&q.opts[ansN[0]-1])||'';
      body+='<div class="exp-opts" style="margin-top:4px"><div class="eo" style="padding-top:10px;border-top:1px dashed #E2E8F0"><div class="eo-q">옳은 것 '+trueCount+'개 → 정답 '+(ansN[0])+'번'+(ansOpt?'('+rm(ansOpt,q)+')':'')+'</div></div></div>';
    } else if(comboOK){
      // 콤보: ㄱㄴㄷㄹ 지문별 펼침 (exp.o는 지문 순서). 정답 지문에 ✅, 맨 아래 정답 보기 조합 줄.
      var ansLabels=ansN.map(function(n){ return (q.opts&&q.opts[n-1])?q.opts[n-1]:''; }).join(' ');  // 정답 보기에 포함된 지문 마커
      body+='<div class="exp-opts">'+stmts.map(function(s,i){
        var raw=oArr[i]||'';
        var ex=stripRepeatedOpt(raw, s.t);
        var sv=splitVerdict(ex);
        var verdictTag = sv.v ? ' <span class="eo-verdict '+sv.vc+'">'+verdictLabel(sv.v)+'</span>' : '';
        var inAns = ansLabels.indexOf(s.k)>=0;
        var ansTag = inAns ? ' <span class="eo-badge">✅ 정답</span>' : '';
        var q1='<div class="eo-q">'+s.k+'. '+rm(s.t,q)+verdictTag+ansTag+'</div>';
        var a1= sv.rest ? ('<div class="eo-a">'+rm(sv.rest,q)+'</div>') : '';
        var exTxt = (exArr[i]&&String(exArr[i]).trim()) ? '<div class="eo-ex"><span class="eo-ex-ti">예)</span>'+rm(String(exArr[i]).trim(),q)+'</div>' : '';
        return '<div class="eo">'+q1+a1+exTxt+'</div>';
      }).join('')+'</div>';
      // 정답 보기 조합 줄 — 문제 유형(옳지 않은/적절하지 않은/틀린 계열)에 맞춰 판정 라벨
      var cCirc=['①','②','③','④','⑤'];
      var stemText = String(q.q||'').split(/ㄱ\s*[.\uFF0E]/)[0];   // 첫 지문(ㄱ.) 앞 질문부만 — 지문 속 '않/아닌' 오탐 방지
      var stemNeg = /(옳지\s*않|옳지않|적절하지\s*않|적절하지않|틀린|틀리는|아닌\s*것|해당하지\s*않)/.test(stemText);
      var pickVerdict = stemNeg ? '<span class="eo-verdict eo-red">옳지 않음</span>' : '<span class="eo-verdict eo-grn">옳음</span>';
      var comboLine=ansN.map(function(n){
        var lab=cCirc[n-1]||('('+n+')');
        return '<div class="eo-q">정답 보기 '+lab+'. '+rm((q.opts&&q.opts[n-1])||'',q)+' '+pickVerdict+' <span class="eo-badge">✅ 정답</span></div>';
      }).join('');
      body+='<div class="exp-opts" style="margin-top:4px"><div class="eo" style="padding-top:10px;border-top:1px dashed #E2E8F0">'+comboLine+'<div class="eo-a">'+(stemNeg?'옳지 않은 지문들의 조합이다.':'정답 지문들의 조합이다.')+'</div></div></div>';
    } else if(isCV && !(_apairs && _asegs && _asegs.length>=2)){
      // 조합 변형형: 정답 보기 1칸만. 정답칸 예시를 보기에 나온 항목별로(중복제거) 한 줄씩 풀이.
      var cvIdx=ansN[0]-1;
      var cvSV=splitVerdict(stripRepeatedOpt(oArr[cvIdx]||'', q.opts&&q.opts[cvIdx]));
      var cvOpt='<div class="eo-q">'+(cvIdx+1)+'. '+rm((q.opts&&q.opts[cvIdx])||'',q)+' <span class="eo-badge">✅ 정답</span></div>';
      var cvA=cvSV.rest ? '<div class="eo-a">'+rm(cvSV.rest,q)+'</div>' : '';
      var cvExRaw=String(exArr[cvIdx]||'').trim();
      var cvRows='';
      if(cvExRaw){
        cvExRaw.split(/\n+/).forEach(function(line){
          line=line.trim(); if(!line) return;
          var ai=line.indexOf('\u2192');                              // 첫 화살표(→)
          var nm = ai>0 ? line.slice(0,ai).trim() : '';
          var de = ai>=0 ? line.slice(ai+1).trim() : line;
          if(!nm || /^[\u2460-\u2473]/.test(nm)) return;              // 맺음말(권리명 없음/보기번호 종합)줄은 출력 안 함
          cvRows+='<div class="cv-item"><span class="cv-k">'+rm(nm,q)+'</span><span class="cv-d">\u2192 '+rm(de,q)+'</span></div>';
        });
      }
      var cvList=cvRows ? '<div class="cv-list">'+cvRows+'</div>' : '';
      body+='<div class="exp-opts"><div class="eo">'+cvOpt+cvA+cvList+'</div></div>';
    } else if(blankStmts.length>=2 && oFilled===blankStmts.length){
      // 괄호빈칸 짝맞추기: 빈칸(ㄱ/ㄴ)별로 exp.o 매핑 + 정답 용어 표시
      var bTerms=blankPairTerms((q.opts && q.opts[ansN[0]-1])||'');
      body+='<div class="exp-opts">'+blankStmts.map(function(st,i){
        var term=bTerms[st.k]||'';
        var raw=oArr[i]||'';
        var sv=splitVerdict(stripRepeatedOpt(raw, st.t));
        var termTag = term ? ' <span class="eo-badge">\u2192 '+rm(term,q)+'</span>' : '';
        var head='<div class="eo-q">'+st.k+'. '+rm(st.t,q)+termTag+'</div>';
        var a1=(sv.rest||raw) ? '<div class="eo-a">'+rm(sv.rest||raw,q)+'</div>' : '';
        var exTxt=(exArr[i]&&String(exArr[i]).trim()) ? '<div class="eo-ex"><span class="eo-ex-ti">예)</span>'+rm(String(exArr[i]).trim(),q)+'</div>' : '';
        return '<div class="eo">'+head+a1+exTxt+'</div>';
      }).join('')+'</div>';
      var bCirc=['\u2460','\u2461','\u2462','\u2463','\u2464'];
      body+='<div class="exp-opts" style="margin-top:4px"><div class="eo" style="padding-top:10px;border-top:1px dashed #E2E8F0"><div class="eo-q">\uC815\uB2F5 \uBCF4\uAE30 '+(bCirc[ansN[0]-1]||('('+ansN[0]+')'))+'. '+rm((q.opts&&q.opts[ansN[0]-1])||'',q)+' <span class="eo-badge">\u2705 \uC815\uB2F5</span></div></div></div>';
    } else if(_apairs && _asegs && _asegs.length>=2){
      // 배정형(참거짓/매칭): 정답칸을 마커별로 분리 + 정답 조합. 오답칸 숨김.
      body+='<div class="exp-opts">'+_asegs.map(function(seg){
        var sv=splitVerdict(seg.t);
        var vTag = sv.v ? ' <span class="eo-verdict '+sv.vc+'">'+verdictLabel(sv.v)+'</span>' : '';
        return '<div class="eo"><div class="eo-q">'+rm(sv.rest||seg.t,q)+vTag+'</div></div>';
      }).join('')+'</div>';
      var _aN=ansArr(q.ans)[0];
      var _aOpt=(q.opts&&q.opts[_aN-1])?rm(q.opts[_aN-1],q):'';
      var _aEx=String(exArr[_aN-1]||'').trim();
      body+='<div class="exp-opts" style="margin-top:4px"><div class="eo" style="padding-top:10px;border-top:1px dashed #E2E8F0"><div class="eo-q">'+(_aOpt?_aOpt+' ':'')+'<span class="eo-badge">\u2705 \uC815\uB2F5 '+_aN+'\uBC88</span></div>'+(_aEx?'<div class="eo-ex"><span class="eo-ex-ti">\uC608)</span>'+rm(_aEx,q)+'</div>':'')+'</div></div>';
    } else if(!_isCalc && oFilled>=1){
      // 보기별 해설: 설명이 있는 보기만. (콤보인데 파싱 실패 시 폴백 = 정답 보기만)
      var fbCombo = isCombo && !comboOK;
      body+='<div class="exp-opts">'+oArr.map(function(t,i){
        if(!t) return '';
        var isAns=ansN.includes(i+1);
        if(fbCombo && !isAns) return '';                  // 폴백: 콤보 파싱 실패 → 정답 보기만
        var ex=stripRepeatedOpt(t, q.opts&&q.opts[i]);
        var sv=splitVerdict(ex);
        var verdictTag = sv.v ? ' <span class="eo-verdict '+sv.vc+'">'+verdictLabel(sv.v)+'</span>' : '';
        var ansTag = isAns ? ' <span class="eo-badge">✅ 정답</span>' : '';
        var _hasT = q.opts && q.opts[i];
        var _hasI = q.optImg && q.optImg[i];
        var _ob = _hasT ? rm(q.opts[i],q) : (_hasI ? '<span class="eo-oimg">'+imgInner(q.optImg[i])+'</span>' : '');
        var optTxt = (_hasT || _hasI) ? '<div class="eo-q'+((_hasI && !_hasT)?' eo-q-img':'')+'">'+(i+1)+'. '+_ob+verdictTag+ansTag+'</div>' : '';
        var expTxt= sv.rest ? ('<div class="eo-a">'+rm(sv.rest,q)+'</div>') : '';
        var exTxt = (exArr[i]&&String(exArr[i]).trim()) ? '<div class="eo-ex"><span class="eo-ex-ti">예)</span>'+rm(String(exArr[i]).trim(),q)+'</div>' : '';
        return '<div class="eo">'+optTxt+expTxt+exTxt+'</div>';
      }).join('')+'</div>';
    } else if(_isCalc){
      var concl=oArr.filter(Boolean)[0];
      var hasGraph = q.exp && q.exp.graph && String(q.exp.graph).trim();
      var hasSteps = exArr.filter(Boolean).length>0;
      if(hasGraph || hasSteps){
        // 계산형: 정답 보기만 표시(오답 숨김) + 그래프 + 단계풀이
        var ansIdx = oArr.findIndex(Boolean);
        var sv1=splitVerdict(stripRepeatedOpt(concl, q.opts&&q.opts[ansIdx]));
        var vTag = sv1.v ? ' <span class="eo-verdict '+sv1.vc+'">'+verdictLabel(sv1.v)+'</span>' : '';
        var optLine = (q.opts&&q.opts[ansIdx]!=null) ? '<div class="eo-q">'+(ansIdx+1)+'. '+rm(q.opts[ansIdx],q)+vTag+' <span class="eo-badge">✅ 정답</span></div>' : '';
        var aLine = sv1.rest ? '<div class="eo-a">'+rm(sv1.rest,q)+'</div>' : '';
        body+='<div class="exp-opts"><div class="eo">'+optLine+aLine+'</div></div>';
        body += certlabCalcHTML(q, exArr, rm);
      } else {
        // 결론 한 줄(ㄱㄴㄷ형 등)
        body+='<div class="exp-opts"><div class="eo"><div class="eo-a">'+rm(concl,q)+'</div></div></div>';   // 결론 한 줄: 해설 전체 정오색 제거(일반 해설처럼 검정) — 배지(splitVerdict vc)는 유지
      }
    }
    if(!q.exp || (!q.exp.s && oFilled===0)) body='<div class="note">상세 해설은 추후 업데이트됩니다.</div>';
    // exp.graph: 유형 무관 공통 렌더 → 해설 본문(해설예시) 밑으로 이동(2026-07-17). SVG 그대로(renderMath 미적용).
    if(q.exp && q.exp.graph && String(q.exp.graph).trim() && body.indexOf('calc-graph')===-1)
      body = body + '<div class="calc-graph">'+q.exp.graph+'</div>';
    body += oxCompareHTML(q, oArr);   // 1단계: 내 O/X vs 정답 (텍스트·이미지·일반 통합)
    body += tipBlockHTML(q);          // O/X 다음 → ⚡ 시험 포인트(함정 한 줄)
    body += certlabRecallHTML(q, rm);
    var _mnCh=_conceptChain(q,'mn');
    if(q.mn||(q.exp&&q.exp.mn)||_mnCh.length){ 
      var _mn=q.mn||q.exp.mn; 
      var mnList=Array.isArray(_mn)?_mn:(_mn&&(typeof _mn==='object'||typeof _mn==='string')?[_mn]:[]);
      _mnCh.forEach(function(r){ mnList.push(r); });
      var _cards=[];
      mnList.forEach(function(mn){ _cards=_cards.concat(mnBoxCards(mnResolve(mn))); });
      _cards.forEach(function(cd,i){
        var extra=i>0?' mn-box-extra':''; var ti=i===0?'<div class="mn-ti">암기코드</div>':'';
        if(cd.broken){ body+='<div class="mn-box'+extra+'">'+ti+'<div class="mn-code" style="color:#A32D2D;font-size:12.5px">⚠️ 참조 오류: mn://'+cd.ref+' (마스터에 없음)</div></div>'; return; }
        var num=cd.num?'<span class="mn-num">'+cd.num+'</span> ':'';
        body+='<div class="mn-box'+extra+'">'+ti+num+mnChantHTML(cd.code,null,cd.kind)+'<div class="mn-code">'+cd.code+'</div>'+(cd.desc?'<div class="mn-desc'+((cd.desc&&(cd.desc.match(/↓/g)||[]).length>=2&&cd.desc.indexOf('↑')<0)?' mn-flow':'')+'">'+cd.desc+'</div>':'')+'</div>';
      });
    }
    var _cc=_conceptCards(q); if(_cc.length){
      var _aiCards=[];
      body+='<div class="concept-box"><div class="concept-ti">개념설명</div>'+_cc.map(function(it,ci){
        if(!it||!it.t) return '';
        var _aiOff=(typeof AI_OFF!=='undefined' && AI_OFF);
        var row='<div class="concept-row"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px"><span style="font-weight:500;color:#0C447C">'+rm(it.t,q)+'</span>'+(_aiOff?'':'<button class="ai-copy" onclick="aiAskInsert(\''+q.id+'\','+ci+')" style="flex:none;margin:0;font-size:11px;padding:2px 8px;border:1px solid #C7DBF2;background:#EAF2FB;color:#0C447C;border-radius:6px;cursor:pointer;white-space:nowrap">📋 복사</button>')+'</div>'+(it.d?'<div>'+rm(it.d,q)+'</div>':'')+'</div>';
        // cx 있으면 파란 예시박스. 💡(exd)는 생체(보디빌딩)에서만 표시, 나머지 과목 폐지
        if(it.cx && String(it.cx).trim()) row+='<div class="cc-ex">'+rm(String(it.cx).trim(),q)+'</div>';
        else if(mqCert==='bodybuilding' && it.exd && String(it.exd).trim()) row+='<div class="cc-exd">💡 '+rm(String(it.exd).trim(),q)+'</div>';
        if(it.ex && String(it.ex).trim()) row+='<div class="cc-ex">'+rm(String(it.ex).trim(),q)+'</div>';
        // 🤖 이 개념 AI 심화설명 (같은 크레딧 지갑) — 복사버튼은 타이틀 우측으로 이동(2026-07-17)
        _aiCards.push({ t:String(it.t||''), text:[it.t,it.d,it.cx,it.ex].filter(function(x){return x&&String(x).trim();}).join('\n') });
        return row;
      }).join('')
      +'</div>';
      aiExpRegister(q.id, { subject:(typeof certLabel==='function'?certLabel(mqCert):mqCert), question:(q.q||''), whole:((q.exp&&q.exp.s?String(q.exp.s)+'\n':'')+_aiCards.map(function(c){return c.text;}).join('\n\n')), cards:_aiCards });
    }
    body+=grpBlockHTML(q);   // 개념 뒤 → 그래프
    body+=itvBlockHTML(q);   // 개념 뒤 → 인터랙티브
    body+=tblBlockHTML(q);   // → 표 (해설 순서: 암기코드→개념→그래프→표)
    if(_cc.length) body+=_aiAskWidget(q.id);   /* [MOVE 2026-07-17] AI 해설을 개념·개념해설표 다음 맨 아래로 */
    expHTML='<div class="exp"><div class="exp-note-hd">학습 노트</div><div class="exp-hd"><span class="exp-ti">해설</span><span class="exp-st" style="color:'+statusCol+'">'+statusTxt+' · 정답 '+ansLabel(q.ans)+'번'+multiTxt+'</span></div>'+body+'</div>'; }
  const jr=splitJaryo(tpPrepQ(q), q.jaryo);   /* [ADD] 표줄글: region→센티넬 */
  // [FIX②] 표(explicit jaryo)+조합형: 진술이 발문(jr.q)에 남아 있으면 스템에서 떼어
  //        별도 .jaryo 블록으로 렌더 → markComboStmts가 O/X를 붙인다.
  var _stemQ=jr.q, _comboJaryoHTML='';
  if(isComboQuestion(q.opts) && jr.jaryo){
    var _cs=splitStmtMarkers(jr.q);
    if(_cs.stmts.length>=2){
      _stemQ=_cs.intro;
      _comboJaryoHTML='<div class="jaryo">'+_cs.stmts.map(function(s){return s.k+'. '+s.t;}).join('\n')+'</div>';
    }
  }
  const curSubj=(function(){ var _sc=(q&&q._subj)?q._subj:''; if(!_sc) return ''; try{ var _qb=qbOf(mqCert)[_sc]; return (_qb&&_qb.name)||_sc; }catch(_){ return _sc; } })();   // 혼합과목(복습·진단·SR) 현재 문항 과목명(코드→한글) → 헤더로
  const subjTag='';                         // 카드 안 과목 배지는 제거(헤더로 옮김)
  const relearnBadge=(mqLevelUp && !mqInReview && _luRelearn && _luRelearn[q.id])?'<span class="imp" style="background:#EAF2FB;color:#0C447C;border-color:#C7DBF2">🔁 복습</span>':'';
  const tags=subjTag+(mqInReview?mcqMasteryBadge(q):'')+impBadge(q)+timeBadge(q)+relearnBadge;
  const guessOn=!!mqGuess[q.id];
  const guessToggle = mqInReview
    ? (guessOn?'<span class="guess-tag-r">🎲 찍음</span>':'')
    : '<button class="guess-toggle'+(guessOn?' on':'')+'" onclick="mqToggleGuess(\''+q.id+'\')"><span class="gdot"></span>🎲 찍었어요</button>';
  const guessHint = (!mqInReview && guessOn) ? '<div class="guess-hint">확신이 없거나 <b>찍었을 때</b> 켜세요. 맞아도 <b>복습에 다시 나와요.</b></div>' : '';
  const mqReportBtn = mqInReview ? '' : '<button class="mq-report" onclick="openReportMcq(\''+q.id+'\')" title="문제 오류 신고">⚠️ 신고 의견</button>';
  const conceptGoBtn = (!mqInReview && !mqDiag && !mqConcept && (mqLevelUp ? _qHasConcept(q) : setConceptReady(mqCert,mqSub,mqSet))) ? '<button class="go-concept" onclick="goConceptFromQuestion()">📖 선행학습</button>' : '';
  root.innerHTML=
    '<div class="exam-sticky">'+
    '<div class="exam-hd"><button class="exam-back" onclick="'+(mqInReview?'mqBackToResult()':'mqBackHome()')+'" aria-label="뒤로">'+BACK_ARROW+'</button>'+
      '<div class="exam-ti"><div class="nm">'+(mqInReview?(mqReviewMode==='wrong'?'오답 보기':mqReviewMode==='unans'?'미응답 보기':'결과 검토'):examName)+'</div><div class="st">'+(mqInReview?(mqReviewMode==='wrong'?'틀린 문항만':mqReviewMode==='unans'?'안 푼 문항만':'전체 문항'):examSet)+(curSubj?' · '+curSubj:'')+qCtx+'</div></div>'+
      (mqInReview?'':('<button class="etim-pause'+(mqPaused?' on':'')+'" onclick="mqTogglePause()" title="'+(mqPaused?'계속하기':'일시정지')+'">'+(mqPaused?'▶':'⏸')+'</button><span class="etim'+(mqTimeUp?' over':(mqTimeLeft<=300?' red':''))+(mqPaused?' paused':'')+'" id="mqTimer">'+(mqTimeUp?('+'+mqFmt(mqOverElapsed())):mqFmt(mqTimeLeft))+'</span>'))+'</div>'+
    '<div class="mq-prog"><div class="row"><span id="mqProgNum">'+(mqIdx+1)+' / '+qs.length+' 문항</span><span class="mq-prog-r">'+_luComboPin()+'</span></div><div class="track prog-drag" onpointerdown="mqProgStart(event)"><div class="bar" style="width:'+pct+'%"></div></div></div>'+
    '<div class="qstem"><div class="qhead"><div class="qnum">'+(mqIdx+1)+'</div>'+tags+mqReportBtn+guessToggle+'</div><div class="qtext">'+(isCountType(q)?countStemHTML(q.q,q,!showExp&&!mqInReview):tpSwap(_jaryoDots(stemHTML(rm(_stemQ,q))),q.id))+'</div>'+guessHint+'</div>'+
    '</div>'+conceptGoBtn+
    '<div class="qcard">'+((!isCountType(q)&&jr.jaryo)?tpSwap((jaryoBlanksHTML(jr.jaryo,q)||'<div class="jaryo">'+_jaryoDots(rm(jr.jaryo,q))+'</div>'),q.id):'')+_comboJaryoHTML+(q.img?'<div class="qimg">'+imgInner(q.img)+'</div>':'')+imgComboOXRow(q)+'<div class="opts">'+optHTML+'</div>'+
    '<div class="mcq-foot"><button class="mbtn mbtn-prev" '+(mqIdx===0?'disabled':'')+' onclick="mqNav(-1)">◀ 이전</button>'+
    '<button class="mbtn mbtn-exp" onclick="mqToggleExp(\''+q.id+'\')">'+(showExp?'정답 숨기기':'정답·해설')+'</button>'+
    '<button class="mbtn mbtn-next" onclick="mqNav(1)">'+(mqIdx>=qs.length-1?(mqInReview?'결과로 ✓':'채점 ✓'):'다음 ▶')+'</button></div>'+
    expHTML+'</div>';
  resolveImages(root); fmtJaryo(root); markComboStmts(root, !mqInReview && (isComboQuestion(q.opts) || _tfAssign(q))); restoreOX(root);
  // [2026-07-20] 문제별 단독 URL: 일반 기출 풀이 화면일 때 주소창을 #q/{시험}/{문항id}로 유지(공유·광고용). 복습·모아풀기·진단·검토는 제외.
  try{ if(mqScreen==='exam' && !mqInReview && !mqReview && !mqDiag && !mqGather && q && q.id && typeof mqCert!=='undefined') history.replaceState(null,'',location.pathname+location.search+'#q/'+mqCert+'/'+q.id); }catch(_){}
}
function mqPick(qid,n){
  if(mqInReview) return;
  if(!canAccess(mqCert)) return;   // 레벨테스트 포함 게스트10/체험50 한도 적용(10에서 로그인 유도)
  const firstTime = mqAns[qid]===undefined;
  const changed = !firstTime && mqAns[qid]!==n;   // 답을 다른 보기로 바꾼 경우
  mqAns[qid]=n; mqShow[qid]=false;
  if(firstTime || changed){
    const q=mqQuestions().find(x=>x.id===qid);
    if(q && mqHasAnswer(q)){
      var _sawExp = (typeof eloState!=='undefined'&&eloState&&eloState._expSeen&&eloState._expSeen[mqCert+'|'+q.id]===_todayKST());   // 답 고르기 전에 해설을 먼저 봤나 → 오답 처리(레벨업·복습·기출 공통)
      var _corr = isCorr(q.ans,n);
      if(_sawExp){ srRateK(mqCert, q.id, 0, mqTimeUp, changed); }   // 해설 먼저 봄 = 틀림(복습 재출제)
      else if(mqGuess[qid]){ srRateK(mqCert, q.id, _corr?1:0, mqTimeUp, changed); }   // 찍음: 맞아도 애매(1), 틀리면 틀림(0)
      else {
        // [2026-07-20] OX 자가체크 오답 반영: 정답을 맞혔어도 OX 진술 판단이 틀렸으면 '애매(1)' → 복습에 다시 나옴
        var _oxWrong=false; try{ var _ox=(typeof mqOX!=='undefined')&&mqOX[q.id]; _oxWrong=!!(_ox&&Object.keys(_ox).length&&typeof oxAllMatch==='function'&&!oxAllMatch(q)); }catch(_){}
        srRateK(mqCert, q.id, _corr ? (_oxWrong?1:2) : 0, mqTimeUp, changed);
      }   // 평소: 정답=정확(2)/오답=틀림(0) · OX 틀림 동반 정답=애매(1)
      var _preBlk = !mqLevelTest && !_eloCanApply(mqCert,q);   // 하루1회로 차단됐나(해설은 이제 차단 아님 → 오답 반영)
      if(!mqLevelTest && typeof adEloUpdate==='function' && _eloCanApply(mqCert,q)){ adEloUpdate(q, _sawExp ? false : _corr); _eloMarkApplied(mqCert,q); }   // 해설 먼저 봄 → Elo 강제 오답, 아니면 정답/오답 그대로
      if(_sawExp && _corr && !mqLevelTest && !localStorage.getItem('certlab_info_expElo')){   // 해설 보고 정답 누름 → 오답 처리 안내(최초1회)
        try{ localStorage.setItem('certlab_info_expElo','1'); }catch(_){}
        setTimeout(function(){ _infoModal('<div style="font-size:34px;margin-bottom:8px">📖</div><div style="font-size:15.5px;font-weight:800;color:#0C447C;margin-bottom:8px">해설을 먼저 본 문제예요</div><div style="font-size:13px;color:#3A4A5E;line-height:1.75">정답을 보고 푼 문제는 <b>오답으로 처리</b>돼요.<br>레벨이 내려가고 복습에 다시 나옵니다.<br>먼저 풀고 나서 해설을 보면 정상 반영돼요!</div>'); }, 300);
      }
      if(mqLevelUp && firstTime && _corr && !_sawExp && _preBlk && !localStorage.getItem('certlab_info_reapplyElo')){   // 오늘 이미 채점된 문제(시간초과 포함) 재풀이 정답 → 안내(최초1회)
        try{ localStorage.setItem('certlab_info_reapplyElo','1'); }catch(_){}
        setTimeout(function(){ _infoModal('<div style="font-size:34px;margin-bottom:8px">🔄</div><div style="font-size:15.5px;font-weight:800;color:#0C447C;margin-bottom:8px">오늘 이미 채점된 문제예요</div><div style="font-size:13px;color:#3A4A5E;line-height:1.75">시간초과됐거나 오늘 이미 푼 문제는 <b>다시 풀어도 오늘은 반영되지 않아요.</b><br>내일 다시 풀면 반영됩니다!</div>'); }, 300);
      }
      if(mqLevelUp && firstTime){   // 게이미피케이션 콤보: 레벨업 풀이중·첫 응답만(기출/복습/찍음 제외)
        if(mqGuess[qid]){ /* 🎲 찍음: 콤보 끊지 않고 보류 */ }
        else if(isCorr(q.ans,n)){ luCombo++; if(luCombo>luRoundMaxCombo) luRoundMaxCombo=luCombo; luComboJustUp=true; if(luCombo===5||luCombo===10){ try{ navigator.vibrate&&navigator.vibrate(35); }catch(_){} } }
        else { luCombo=0; luComboJustUp=false; }
      }
      srSaveDebounced();
    }
  }
  if(firstTime){
    if(mqTimeUp) mqOvertimeCount++;
    countUp(mqCert);
    const e=userEnt[mqCert];
    if(e.plan==='GUEST'){ _guestDayBump(mqCert); } if(typeof bumpGuestSolved==='function') bumpGuestSolved();
    if(e.plan==='FREE_TRIAL'){ _userDayBump(mqCert); } }
  mqSaveProgress(); if(mqDiag) saveDiagProgress();
  if(mqLevelUp) luResumeSave();
  renderMCQ();
  const qs=mqQuestions();
  if(maybeOfferConcept(qs.find(x=>x.id===qid), n, firstTime)) return;   // 권유 팝업 뜨면 자동넘김 보류(선택에 맡김)
  if(mqIdx<qs.length-1){ setTimeout(()=>{ if(mqScreen==='exam'){ mqIdx++; mqSaveProgress(); if(mqDiag) saveDiagProgress(); window.scrollTo(0,0); renderMCQ(); } }, 550); }
  else { setTimeout(()=>{ if(mqScreen==='exam'){ mqResult(); } }, 650); }  // 마지막 문제 → 자동 채점
}
function mqToggleExp(qid){ mqShow[qid]=!mqShow[qid];
  if(mqShow[qid] && !mqInReview && !mqLevelTest && !mqConcept){ var _qx=mqQuestions().find(function(x){return x.id===qid;}); if(_qx) _eloMarkExpSeen(mqCert,_qx); }   // 해설을 먼저 열람한 문제 → 그날 오답 처리(레벨업·복습·기출 공통, mqPick에서 반영)
  if(mqShow[qid] && !mqInReview){ var _q=mqQuestions().find(function(x){return x.id===qid;});
    if(_q && isSA(_q) && saAnswered(_q,mqAns[qid]) && !mqGuess[qid]){ srRateK(mqCert, qid, saGrade(_q,mqAns[qid]).allOK?2:0, mqTimeUp, true); if(typeof srSaveDebounced==='function') srSaveDebounced(); } }
  renderMCQ(); }
function mqToggleGuess(qid){
  if(mqInReview) return;
  mqGuess[qid]=!mqGuess[qid];
  // 이미 답을 골랐는데 찍음 상태가 바뀌면, 그 답 기준으로 복습 재반영
  if(mqAns[qid]!==undefined){
    const q=mqQuestions().find(x=>x.id===qid);
    if(q && mqHasAnswer(q)){
      const _ok = mqCorrect(q,mqAns[qid]); const res = mqGuess[qid] ? (_ok?1:0) : (_ok?2:0);
      srRateK(mqCert, q.id, res, mqTimeUp, true);   // replace=true (덮어쓰기)
      srSaveDebounced();
    }
  }
  renderMCQ();
}
