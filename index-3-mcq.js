/* ===== 객관식(MCQ) 엔진 — 시험별 문제은행 (감정평가사 / 공인중개사 1·2차 …) ===== */
const ansArr=a=>Array.isArray(a)?a:[a];
const isCorr=(qa,sel)=>sel!==undefined&&sel!==null&&ansArr(qa).includes(sel);
const ansLabel=a=>ansArr(a).join(', ');
// 공인중개사 문제은행 골격 (문제는 추후 입력). 차수 라벨은 시험명으로 구분.
const RE1_QB = {
  re1_intro: { name:'부동산학개론', sets:[] },
  re1_civil: { name:'민법 및 민사특별법', sets:[] }
};
const RE2_QB = {
  re2_law:    { name:'공인중개사법령 및 중개실무', sets:[] },
  re2_public: { name:'부동산공법', sets:[] },
  re2_tax:    { name:'부동산공시법령 및 세법', sets:[] }
};
// 한국사능력검정시험 심화 — 과목 구분 없이 회차별 50문항(5지선다). 문제는 추후 입력.
const KSH_QB = {
  ksh: { name:'한국사 심화', sets:[] }
};
// 주택관리사보 1차 — 회계원리/공동주택시설개론/민법 (교시 구분 없이 나열). 문제는 추후 입력.
const HM_QB = {
  hm_acct:  { name:'회계원리', sets:[] },
  hm_fac:   { name:'공동주택시설개론', sets:[] },
  hm_civil: { name:'민법', sets:[] }
};
// 주택관리사보 2차 — 주택관리관계법규/공동주택관리실무 (객관식+주관식 SA).
const HM2_QB = {
  hm2_law:   { name:'주택관리관계법규', sets:[] },
  hm2_mgmt: { name:'공동주택관리실무', sets:[] }
};
// 시험별 문제은행 레지스트리
const MCQ_EXAMS = {
  appraiser:     { name:'감정평가사',     qb: APP_QB },
  realestate1:   { name:'공인중개사 1차', qb: RE1_QB },
  realestate2:   { name:'공인중개사 2차', qb: RE2_QB },
  koreanhistory: { name:'한국사능력검정시험(심화)', qb: KSH_QB },
  housing:       { name:'주택관리사 1차', qb: HM_QB },
  housing2:      { name:'주택관리사 2차', qb: HM2_QB }
};
const MCQ_CERTS = Object.keys(MCQ_EXAMS);
function isMcqCert(c){ return MCQ_CERTS.indexOf(c)!==-1; }
let mqCert='appraiser';                 // 현재 보고 있는 객관식 시험
function qbOf(cert){ if(MCQ_EXAMS[cert]) return MCQ_EXAMS[cert].qb; if(typeof SUBJ_QB!=='undefined' && SUBJ_QB[cert]) return SUBJ_QB[cert]; return {}; }
function curQB(){ return qbOf(mqCert); }
var _sp2SubsMem=null;
function _sp2Get(){ if(_sp2SubsMem && _sp2SubsMem.length===5) return _sp2SubsMem; try{ var raw=localStorage.getItem('certlab_sport2subs'); if(raw){ var a=JSON.parse(raw); if(Array.isArray(a)&&a.length===5){ _sp2SubsMem=a; return a; } } }catch(_){} return null; }
function _sp2Set(arr){ _sp2SubsMem=(arr||[]).slice(); try{ localStorage.setItem('certlab_sport2subs', JSON.stringify(_sp2SubsMem)); }catch(_){} try{ if(currentUser && typeof saveUserData==='function') saveUserData(); }catch(_){} }
function _sp2FilterOrder(cert, ks){ if(cert!=='sport2') return ks; var sel=_sp2Get(); if(!sel) return ks; return ks.filter(function(k){ return sel.indexOf(k)>=0; }); }
function curOrder(){ return _sp2FilterOrder(mqCert, Object.keys(curQB())); }
function _sp2BtnHTML(){ var sel=_sp2Get(); return '<div style="padding:8px 4px 2px"><button onclick="_sp2OpenPicker(function(){renderMCQ();})" style="font-size:12px;font-weight:800;color:#185FA5;background:#EAF2FC;border:1.5px solid #B5D4F4;border-radius:999px;padding:6px 14px;cursor:pointer">\u2699 \uACFC\uBAA9 \uC120\uD0DD'+(sel?' (5\uACFC\uBAA9)':'')+'</button></div>'; }
function _sp2OpenPicker(cb){
  var qb=qbOf('sport2')||{}; var codes=Object.keys(qb); var cur=_sp2Get()||[]; var sel={}; cur.forEach(function(c){ sel[c]=true; });
  var ov=document.getElementById('sp2Pick'); if(ov) ov.remove();
  ov=document.createElement('div'); ov.id='sp2Pick'; ov.className='auth-popup';
  function cnt(){ return Object.keys(sel).filter(function(k){return sel[k];}).length; }
  function render(){
    var n=cnt();
    ov.innerHTML='<div class="auth-sheet" style="max-width:360px;text-align:left">'
      +'<div style="font-size:17px;font-weight:900;color:#0C447C;margin-bottom:3px">\uC2DC\uD5D8 \uBCFC 5\uACFC\uBAA9 \uC120\uD0DD</div>'
      +'<div style="font-size:12.5px;color:#8A7D6E;margin-bottom:14px">7\uACFC\uBAA9 \uC911 <b>5\uACFC\uBAA9</b>\uC744 \uACE8\uB77C \uC751\uC2DC\uD574\uC694. \uB808\uBCA8\uD14C\uC2A4\uD2B8\u00B7\uB808\uBCA8\uC5C5\uC774 \uC120\uD0DD\uD55C 5\uACFC\uBAA9\uC73C\uB85C \uC9C4\uD589\uB3FC\uC694.</div>'
      +'<div>'+codes.map(function(c){ var nm=(qb[c]&&qb[c].name)||c; var on=!!sel[c];
          return '<label style="display:flex;align-items:center;gap:10px;padding:11px 12px;border:1.5px solid '+(on?'#185FA5':'#E8E8E8')+';border-radius:12px;margin-bottom:8px;cursor:pointer;background:'+(on?'#EAF2FC':'#fff')+'"><input type="checkbox" data-c="'+c+'" '+(on?'checked':'')+' style="width:18px;height:18px;accent-color:#185FA5"><span style="font-size:14px;font-weight:700;color:#2C2C2A">'+mqEsc(nm)+'</span></label>';
        }).join('')+'</div>'
      +'<div style="text-align:center;font-size:13px;font-weight:800;color:'+(n===5?'#15793F':'#A32D2D')+';margin:4px 0 12px">'+n+' / 5 \uC120\uD0DD\uB428</div>'
      +'<button id="sp2Go" '+(n===5?'':'disabled')+' style="width:100%;background:'+(n===5?'linear-gradient(135deg,#185FA5,#0C447C)':'#C9C2B8')+';color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:800;cursor:'+(n===5?'pointer':'not-allowed')+'">'+(n===5?'\uC120\uD0DD \uC644\uB8CC':'5\uACFC\uBAA9\uC744 \uC120\uD0DD\uD558\uC138\uC694')+'</button>';
    ov.querySelectorAll('input[type=checkbox]').forEach(function(chk){ chk.onchange=function(){ var c=chk.getAttribute('data-c'); if(chk.checked){ if(cnt()>=5){ chk.checked=false; return; } sel[c]=true; } else { delete sel[c]; } render(); }; });
    var go=document.getElementById('sp2Go'); if(go) go.onclick=function(){ var arr=Object.keys(sel).filter(function(k){return sel[k];}); if(arr.length!==5) return; _sp2Set(arr); ov.remove(); if(typeof cb==='function') cb(); };
  }
  document.body.appendChild(ov); render();
}
// qid → {cert, sub} 전역 인덱스 (네임스페이스 저장용). qid는 시험 간 고유하게 구성.
const MCQ_QID2CS={};
function rebuildQid(){ for(const k in MCQ_QID2CS) delete MCQ_QID2CS[k]; MCQ_CERTS.forEach(cert=>{ const qb=qbOf(cert); Object.keys(qb).forEach(sub=>qb[sub].sets.forEach(st=>{ if(Array.isArray(st.questions)) st.questions=st.questions.filter(function(q){return !(q&&q.hidden);}); st.questions.forEach(q=>{MCQ_QID2CS[q.id]={cert,sub,lab:st.label};}); })); }); }
rebuildQid();
let mqScreen='home', mqOpen={}, mqSub='', mqSet=0, mqIdx=0, mqAns={}, mqShow={}, mqOX={}, mqCurId=null;
let mqOXLearned={}, mqOXTs={};   // OX진술 학습: {qid:{진술키:1}} 완료표시 / {qid:ts} 최근순 정렬용
let mqTimer=null, mqTimeLeft=0, mqTimeUp=false, mqTimeUpIdx=-1;
let mqPaused=false;
const BACK_ARROW='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
let mqOverTimer=null, mqOverStart=0, mqOvertimeSec=0, mqOvertimeCount=0;  // 시간종료 후 경과시간(초)/푼 문항 수
function mqStopOverTimer(){ if(mqOverTimer){ clearInterval(mqOverTimer); mqOverTimer=null; } if(mqOverStart){ mqOvertimeSec+=Math.floor((Date.now()-mqOverStart)/1000); mqOverStart=0; } }
function mqOverElapsed(){ return mqOvertimeSec + (mqOverStart?Math.floor((Date.now()-mqOverStart)/1000):0); }
function mqStartOverTimer(){
  mqStopOverTimer(); mqOverStart=Date.now();
  mqOverTimer=setInterval(()=>{
    if(mqScreen!=='exam'){ mqStopOverTimer(); return; }
    const el=document.getElementById('mqTimer');
    if(el){ el.textContent='+'+mqFmt(mqOverElapsed()); }
    else { mqStopOverTimer(); }
  },1000);
}
let mqMode='all', mqList=null;          // 'all' | 'wrong' | 'review'
let mqReview=false;                       // SR 복습 세션 여부
let mqDiag=false;                          // 레벨 테스트 세션 여부
let appWrong={};                        // 객관식 오답 (qid 기준, 시험 간 고유)
let mqInReview=false, mqReviewMode='all', mqReviewList=[];
let mqGather=false, mqGatherLabel='', mqWeakCache=[], mqWeakOpen=false;
let mqGuess={};   // 문제별 '찍었어요' 상태 {qid:true} — 맞아도 복습은 애매로
let mqConcept=false;        // 개념학습 모드 여부
let mqConceptPhase='learn'; // 'learn'(개념 카드) | 'solve'(문제 풀이)
let mqWrongStreak=0, mqConceptOffered=false;  // 연속 오답 카운트 / 이 세트에서 개념학습 권유 했는지
let mqResultQs=[], mqResultAns={}, mqResultMeta=null;
function mqQuestions(){ if(mqInReview) return mqReviewList||[]; if(mqList && mqList.length) return mqList; try{ var _qb=curQB(); var _su=_qb&&_qb[mqSub]; return (_su&&_su.sets&&_su.sets[mqSet]&&_su.sets[mqSet].questions)||[]; }catch(_){ return []; } }
// 중요도(star 1~3)/소요시간(time 1~3): 값 미지정(0)이면 표시 안 함. 값은 추후 별도 입력.
// 자동 중요도(★): 단원별 기출 빈도(map.mapping) ÷ 회차수 → 등급. 수동 star는 폴백.
var _impAutoCache={};
function _impGrade(pr){ if(pr>=2)return 5; if(pr>=1.2)return 4; if(pr>=0.6)return 3; if(pr>=0.25)return 2; if(pr>0)return 1; return 0; }
function _impAutoStar(cert,sub,topic){ try{
  var key=cert+'|'+sub, cache=_impAutoCache[key];
  if(!cache){
    var b=(typeof AD_DATA!=='undefined')&&AD_DATA[key];
    var mp=(b&&b.map&&b.map.mapping)||null; if(!mp) return 0;   // 태깅 없으면 폴백(캐시 안 함)
    var cnt={}; mp.forEach(function(r){ if(r&&r.topic) cnt[r.topic]=(cnt[r.topic]||0)+1; });
    var qb=(typeof qbOf==='function')&&qbOf(cert), sb=qb&&qb[sub];
    var rounds=(sb&&sb.sets&&sb.sets.length)||1; if(rounds<1) rounds=1;   // 회차수(동적)
    cache={}; for(var t in cnt){ cache[t]=_impGrade(cnt[t]/rounds); }
    _impAutoCache[key]=cache;
  }
  return cache[topic]||0;
}catch(_){ return 0; } }
function _impStarOfQ(q){ try{
  if(!q) return 0;
  var cs=(typeof MCQ_QID2CS!=='undefined'&&MCQ_QID2CS[q.id])||{};
  var cert=cs.cert||(typeof mqCert!=='undefined'&&mqCert)||q._cert;
  var sub=cs.sub||q._subj||(typeof mqSub!=='undefined'&&mqSub);
  var topic=q.topic;
  if(!topic && cert && sub){ var info=(typeof adLookup==='function')&&adLookup(cert,sub,q.id); topic=info&&info.topic; }
  if(cert&&sub&&topic){ var a=_impAutoStar(cert,sub,topic); if(a) return a; }
  return q.star||0;
}catch(_){ return (q&&q.star)||0; } }
function impBadge(q){ const s=impLabel(_impStarOfQ(q)); return s ? '<span class="imp">'+s+'</span>' : ''; }
function timeBadge(q){ const v=q.time||0; if(!v) return ''; const lab={1:'빠름',2:'보통',3:'오래'}[v]||''; return '<span class="tmark t'+v+'">⌛ '+lab+'</span>'; }
// 진행상태 저장(이어서 풀기)
function mqPKey(sub,set){ return 'certlab_mcq_p_'+mqCert+'_'+sub+'_'+set; }
/* [2026-07-14] 오늘의 복습(자동복습) 이어풀기 — 회차 이어풀기와 별개로 복습 세션 위치/답을 저장·복원.
   기존엔 mqMode==='review'가 mqSaveProgress에서 제외돼 위치가 안 남아, 나갔다 오면 1번부터 다시 시작했다. */
function _reviewKey(){ return 'certlab_review_active_'+mqCert; }
function _reviewSaveProg(){ try{ if(!mqReview||!mqList||!mqList.length) return; localStorage.setItem(_reviewKey(), JSON.stringify({ ids: mqList.map(function(q){return q&&q.id;}).filter(Boolean), idx: mqIdx, ans: mqAns, date: _todayKST(), ts: Date.now() })); }catch(_){} }
function _reviewClear(){ try{ localStorage.removeItem(_reviewKey()); }catch(_){} }
function _reviewResolve(ids){ try{ var qb=curQB(); if(!qb) return []; var map={}, _sord={}; (curOrder()||[]).forEach(function(id,i){ _sord[id]=i; }); (curOrder()||[]).forEach(function(id){ var sub=qb[id]; if(!sub||!sub.sets) return; sub.sets.forEach(function(st){ (st.questions||[]).forEach(function(q){ if(q&&q.id){ q._subj=sub.name||id; q._subCode=id; q._grp=(_sord[id]||0); map[q.id]=q; } }); }); }); var out=[]; (ids||[]).forEach(function(id){ if(map[id]) out.push(map[id]); }); return out; }catch(_){ return []; } }
function mqSaveProgress(){ if(mqReview && !mqInReview && !mqConcept){ _reviewSaveProg(); return; } if(mqMode!=='all') return; if(mqInReview||mqConcept) return; if(Object.keys(mqAns).length===0 && mqIdx===0) return; try{ localStorage.setItem(mqPKey(mqSub,mqSet), JSON.stringify({ans:mqAns,idx:mqIdx,t:mqTimeLeft,up:mqTimeUp,os:mqOverElapsed(),oc:mqOvertimeCount})); }catch(e){} try{ localStorage.setItem('certlab_mcq_active', JSON.stringify({cert:mqCert,sub:mqSub,set:mqSet,ts:Date.now()})); }catch(e){} }
function mqLoadProgress(sub,set){ try{ const v=localStorage.getItem(mqPKey(sub,set)); return v?JSON.parse(v):null; }catch(e){ return null; } }
function mqClearProgress(sub,set){ try{ localStorage.removeItem(mqPKey(sub,set)); }catch(e){} }
// O/X 자가체크 영속 저장 — 문항별 {qid:{o0|sㄱ ...:'O'|'X'}}. 새로고침·오답노트에서 재사용
function mqOXSave(){ try{ localStorage.setItem('certlab_mcq_ox', JSON.stringify(mqOX)); localStorage.setItem('certlab_mcq_oxlearned', JSON.stringify(mqOXLearned)); localStorage.setItem('certlab_mcq_oxts', JSON.stringify(mqOXTs)); }catch(e){} }
// 다시 풀기 공통: 목록 문항들의 내 O/X 표시 해제(어디서 재풀이하든 동일 동작). mqOXLearned(학습완료)는 유지.
// 해제 시각을 mqOXTs에 남겨(삭제 표식) Firestore 동기화(srMergeOX)에서 옛 O/X가 되살아나지 않게 한다.
function mqOXClearList(list){ try{ var ch=false, now=Date.now(); (list||[]).forEach(function(q){ var id=q&&(q.id||q); if(id&&mqOX[id]){ delete mqOX[id]; mqOXTs[id]=now; ch=true; } }); if(ch) mqOXSave(); }catch(_){} }
function mqOXLoad(){ try{ var v=localStorage.getItem('certlab_mcq_ox'); if(v){ var o=JSON.parse(v); if(o&&typeof o==='object') mqOX=o; }
  var l=localStorage.getItem('certlab_mcq_oxlearned'); if(l){ var ol=JSON.parse(l); if(ol&&typeof ol==='object') mqOXLearned=ol; }
  var t=localStorage.getItem('certlab_mcq_oxts'); if(t){ var ot=JSON.parse(t); if(ot&&typeof ot==='object') mqOXTs=ot; } }catch(e){} }
var _DIFF_SECS={1:30,2:40,3:60,4:90,5:120};   // 난이도별 배정시간 기본값(admin config/pricing.diffSecs로 덮어씀)
function _diffSecsCfg(){ var d={1:30,2:40,3:60,4:90,5:120};
  try{ var c=(typeof _pricingCfg!=='undefined'&&_pricingCfg&&_pricingCfg.diffSecs); if(c){ for(var k in c){ var v=+c[k]; if(v>0) d[k]=v; } } }catch(_){}
  return d; }
function _calcDelta(isCalc){
  try{ if(typeof _pricingCfg!=='undefined'&&_pricingCfg){ if(isCalc && _pricingCfg.calcDelta!=null) return +_pricingCfg.calcDelta; if(!isCalc && _pricingCfg.nonCalcDelta!=null) return +_pricingCfg.nonCalcDelta; } }catch(_){}
  return isCalc?1:-1; }
function _isCalcQ(q){
  if(!q) return false;
  if(typeof q.id==='string' && q.id.indexOf('calc:')===0) return true;
  var o=(q.exp&&q.exp.o)||[]; var oFilled=o.filter(function(x){return x&&String(x).trim();}).length;
  if(oFilled!==1) return false;
  var hasGraph=q.exp&&q.exp.graph&&String(q.exp.graph).trim();
  var ex=(q.exp&&q.exp.ex)||[]; var hasSteps=ex.filter(function(x){return x&&String(x).trim();}).length>0;
  return !!(hasGraph||hasSteps);
}
function _qLevel(cert, q){
  var d=q&&(q.diff||q.level||q._ltDiff);
  if(!d){ try{ if(typeof adLookup==='function'){ var info=adLookup(cert, (q&&(q._subjCode||q._subCode||q._subj))||(typeof mqSub!=='undefined'?mqSub:''), q&&q.id); d=info&&info.diff; } }catch(_){} }
  d=d|0; if(d<1||d>5) d=3; return d;
}
function _qSeconds(cert, q){ var lv=_qLevel(cert,q)+_calcDelta(_isCalcQ(q)); if(lv<1)lv=1; if(lv>5)lv=5; return _diffSecsCfg()[lv]||60; }
function _sessionSecs(list, cert){ if(!list||!list.length) return 0; var s=0; for(var i=0;i<list.length;i++) s+=_qSeconds(cert,list[i]); return s; }
function mqFmt(s){ s=Math.max(0,s|0); const m=Math.floor(s/60), x=s%60; return (m<10?'0':'')+m+':'+(x<10?'0':'')+x; }
function mqStopTimer(){ if(mqTimer){ clearInterval(mqTimer); mqTimer=null; } }
function mqRunTimer(){
  mqStopTimer();
  mqTimer=setInterval(()=>{
    if(mqScreen!=='exam'){ mqStopTimer(); return; }
    mqTimeLeft--;
    if(mqTimeLeft<=0){ mqTimeLeft=0; mqTimeUp=true; mqTimeUpIdx=mqIdx; mqStopTimer(); if(mqLevelUp) _luTimeoutScoreUnanswered(); mqResult(); return; }
    mqSaveProgress();
    const el=document.getElementById('mqTimer');
    if(el){ el.textContent=mqFmt(mqTimeLeft); if(mqTimeLeft<=300) el.classList.add('red'); }
    else { mqStopTimer(); }
  },1000);
}
function mqStartTimer(){
  try{ clLeadOnce(typeof mqCert!=='undefined'?mqCert:''); }catch(_){}
  mqStopTimer(); mqStopOverTimer(); mqTimeUp=false; mqTimeUpIdx=-1; mqOvertimeSec=0; mqOvertimeCount=0; mqOverStart=0; mqPaused=false;
  mqRunTimer();
}
function mqTogglePause(){
  if(mqScreen!=='exam' || mqInReview) return;
  mqPaused=!mqPaused;
  if(mqPaused){ mqStopTimer(); mqStopOverTimer(); }
  else { if(mqTimeUp) mqStartOverTimer(); else mqRunTimer(); }
  renderMCQ();
}

function renderMCQ(){
  const root=document.getElementById('mcqRoot'); if(!root) return;
  // 새로고침 자동복귀용 '현재 풀이 중' 포인터 — 일반 풀이 화면일 때만 저장, 그 외 화면이면 해제
  try{
    if(mqScreen==='exam' && !mqInReview && !mqReview && !mqDiag && !mqConcept && mqMode==='all'){
      localStorage.setItem('certlab_mcq_active', JSON.stringify({cert:mqCert,sub:mqSub,set:mqSet,ts:Date.now()}));
    } else { localStorage.removeItem('certlab_mcq_active'); }
  }catch(_){}
  if(mqScreen==='subjexam') return renderSubjExam(root);
  if(mqScreen==='lt2') return renderLt2(root);
  if(mqScreen==='lu2') return renderLu2(root);
  if(mqScreen==='exam') return renderMcqExam(root);
  if(mqScreen==='oxlearn') return renderOxLearn(root);
  if(mqScreen==='luhist') return renderLuHist(root);
  return renderMcqHome(root);
}
function renderMcqHome(root){
  let html='';
  const examNm=(MCQ_EXAMS[mqCert]&&MCQ_EXAMS[mqCert].name) || (_isSubjCert(mqCert)?certLabel(mqCert):'') || '';
  if(examNm) html+='<div class="mcq-exam-title"><button class="exam-home-back" onclick="showHome()" aria-label="시험 종류로">'+BACK_ARROW+'</button>'+examNm+'</div>';
  html+=mcqAnalysisCard(mqCert);
  if(adHasData(mqCert) && ltDone(mqCert)){ var _luR=luHasResume(mqCert); var _luTitle=_luR?'레벨업 이어풀기':'레벨업 문제풀기'; var _luSub=_luR?(mqEsc((luResumeAll[mqCert]&&luResumeAll[mqCert].subName)||'')+' · 이어서 풀기'):'약한 단원 5문제씩 · 자동으로 이어서'; html+='<div style="margin:10px 14px 4px;border-radius:16px;border:2px solid #185FA5;background:linear-gradient(135deg,#EAF2FC,#E0ECFA);padding:12px;display:flex;align-items:center;gap:11px"><div onclick="startLevelUp()" style="flex:1;display:flex;align-items:center;gap:11px;cursor:pointer"><div style="width:40px;height:40px;border-radius:12px;background:#185FA5;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">⚡</div><div style="flex:1"><div style="font-size:16px;font-weight:800;color:#0C447C">'+_luTitle+'</div><div style="font-size:12px;color:#3F6FA3;margin-top:2px;font-weight:600">'+_luSub+'</div></div></div><div onclick="luHistGo()" style="flex-shrink:0;background:#fff;color:#0C447C;border:1.5px solid #B9D2EF;border-radius:11px;padding:8px 6px;font-size:11px;font-weight:800;text-align:center;width:52px;line-height:1.3;cursor:pointer">📊<br>결과</div></div>'; }
  if(typeof lt2Has==='function' && lt2Has(mqCert) && ltDone(mqCert)){
    html+='<div style="margin:10px 14px 4px;border-radius:16px;border:2px solid #185FA5;background:linear-gradient(135deg,#EAF2FC,#E0ECFA);padding:12px;display:flex;align-items:center;gap:11px;cursor:pointer" onclick="startLt2LevelUp()"><div style="width:40px;height:40px;border-radius:12px;background:#185FA5;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">\u26A1</div><div style="flex:1"><div style="font-size:16px;font-weight:800;color:#0C447C">\uB808\uBCA8\uC5C5 \uBB38\uC81C\uD480\uAE30</div><div style="font-size:12px;color:#3F6FA3;margin-top:2px;font-weight:600">\uC57D\uD55C \uACFC\uBAA9\uBD80\uD130 \uC790\uB3D9\uC73C\uB85C \uC774\uC5B4\uC11C</div></div><div style="font-size:15px;color:#185FA5">\u2192</div></div>';
  }
  const dueAll=srDueReviewable(mqCert);
  const due=Math.min(dueAll, REVIEW_MCQ_CAP);
  const _dueSub = dueAll>REVIEW_MCQ_CAP ? ('급한 순 '+REVIEW_MCQ_CAP+'개 먼저 · 나머지는 다음에') : '틀렸거나 복습일이 된 문제';
  html+='<div class="sr-banner" onclick="startMcqReview()"><div class="sr-banner-l"><b>오늘 복습 '+due+'개</b><span class="sr-exam">'+_dueSub+'</span></div><div class="sr-banner-go">복습 시작 →</div></div>';
  // ▼ 약점개념카드 보류: exp.c가 문항 단위라 OX(진술 단위)·정답오답으로 집계 시 무관한 개념까지 잡힘.
  //   데이터방이 진술별 개념 태그를 붙인 뒤 재개. 재개 시 아래 false→mqWeakCache.length 로 복원.
  mqWeakCache=[];
  if(false){
    html+='<div class="weak-card"><div class="weak-hd" onclick="mqWeakToggle()">'+
      '<span class="weak-ico">📉</span><span class="weak-nm">약점 개념</span>'+
      '<span class="weak-cnt">'+mqWeakCache.length+'개</span>'+
      '<span class="weak-arrow'+(mqWeakOpen?' open':'')+'">▼</span></div>';
    if(mqWeakOpen){
      html+='<div class="weak-body"><div class="weak-note">틀린 개념 · 모아풀기로 약한 단원 통째 훈련</div>';
      mqWeakCache.forEach(function(c,i){
        html+='<div class="weak-row"><div class="weak-info"><div class="weak-t">'+mqEsc(c.t)+'</div>'+
          '<div class="weak-s">'+c.n+'문항 틀림 · 전체 '+c.total+'문항</div></div>'+
          '<button class="weak-go" onclick="gatherConcept('+i+')">모아풀기</button></div>';
      });
      html+='</div>';
    }
    html+='</div>';
  }
  // OX진술 학습 버튼 — 내가 틀린 OX진술 있을 때만 (주관식은 O/X 체크가 없어 제외)
  if(!_isSubjCert(mqCert)){
  var _oxN=oxLearnCount(mqCert);
  if(_oxN>0){
    html+='<div class="oxl-banner" onclick="oxLearnGo()"><div class="oxl-banner-l"><span class="oxl-banner-ico">🔴</span><div><b>OX개념 학습하기</b><span class="oxl-banner-sub">내가 틀린 OX진술 '+_oxN+'개 · 진술별 개념 복습</span></div></div><div class="oxl-banner-go">'+_oxN+'개 →</div></div>';
  } else {
    html+='<div class="oxl-banner oxl-banner-promo" onclick="oxGuideOpen()"><div class="oxl-banner-l"><span class="oxl-banner-ico">✅</span><div><b>OX진술을 체크해보세요</b><span class="oxl-banner-sub">보기 옆 O/X로 진술을 직접 판단하면, 틀린 진술의 개념을 잡아드려요</span></div></div><div class="oxl-banner-go">알아보기 →</div></div>';
  }
  }
  html+='<div class="sec-lbl">과목 선택</div>';
  curOrder().forEach(id=>{
    const s=curQB()[id]; const open=!!mqOpen[id];
    const total=s.sets.reduce((a,st)=>a+st.questions.length,0);
    html+='<div class="scard"><div class="scard-hd" onclick="mqToggle(\''+id+'\')">'+
      '<span class="sdot"></span><span class="snm">'+s.name+'</span>'+
      '<span class="scard-set-label">'+s.sets.length+'회차 · '+total+'문항</span>'+
      '<span class="scard-arrow'+(open?' open':'')+'">▼</span></div>';
    if(open){
      html+='<div class="scard-body">';
      if(s.sets.length===0){ html+='<div class="srow"><span class="swc" style="padding:4px 0">문제 준비 중입니다.</span></div>'; }
      s.sets.forEach((st,si)=>{
        if(_isSubjCert(mqCert)){   // 주관식: 오답/미응답/선행학습 없음 — 풀기만, 상세는 subjective.js
          html+='<div class="srow"><div class="srow-left"><span class="syr">'+st.label+'</span>'+
            '<span class="swc">'+st.questions.length+'문제</span></div>'+
            '<div class="sact"><button class="b-go" onclick="startSubjExam(\''+id+'\','+si+')">풀기</button></div></div>';
          return;
        }
        const setWrong=st.questions.filter(q=>appWrong[q.id]).length;
        const setUnans=st.questions.filter(q=>srMasteryK(mqCert,q.id)==='new').length;
        const showUnans=setUnans>0 && setUnans<st.questions.length;   // 일부만 안 푼 회차에만 노출
        const hasSave=!!mqLoadProgress(id,si);
        const goBtns = hasSave
          ? '<button class="b-go" onclick="resumeMcqExam(\''+id+'\','+si+')">이어풀기</button><button class="b-fresh" onclick="startMcqExam(\''+id+'\','+si+',\'all\')">처음부터</button>'
          : '<button class="b-go" onclick="startMcqExam(\''+id+'\','+si+',\'all\')">풀기</button>';
        html+='<div class="srow"><div class="srow-left"><span class="syr">'+st.label+'</span>'+
          '<span class="swc">'+st.questions.length+'문항'+(setWrong>0?' · 오답 '+setWrong:'')+(showUnans?' · 미응답 '+setUnans:'')+'</span></div>'+
          '<div class="sact">'+goBtns+(setWrong>0?'<button class="b-wr" onclick="startMcqExam(\''+id+'\','+si+',\'wrong\')">오답</button>':'')+(showUnans?'<button class="b-un" onclick="startMcqExam(\''+id+'\','+si+',\'unans\')">미응답</button>':'')+(setConceptReady(mqCert,id,si)?'<button class="b-learn" onclick="startConceptStudy(\''+id+'\','+si+')">📖 선행학습</button>':'')+'</div></div>';
      });
      html+='</div>';
    }
    html+='</div>';
  });
  root.innerHTML=html;
}
function mqToggle(id){ const wasOpen=!!mqOpen[id]; mqOpen={}; mqWeakOpen=false; if(!wasOpen) mqOpen[id]=true; renderMCQ(); }
function mqWeakToggle(){ mqWeakOpen=!mqWeakOpen; if(mqWeakOpen) mqOpen={}; renderMCQ(); }
function mcqMasteryBadge(q){ const m=srMasteryK(mqCert,q.id); if(m==='new') return ''; const cls={weak:'sr-weak',learning:'sr-learning',master:'sr-master'}[m]; return '<span class="mq-mst '+cls+'">'+SR_MASTER_LABEL[m]+'</span>'; }

/* ===== 실력 분석 / 예상점수 / 진단 ===== */
function mcqSubjectStats(cert){
  const qb=qbOf(cert); let totN=0;
  const per=Object.keys(qb).map(code=>{
    let cor=0,n=0;
    qb[code].sets.forEach(st=>st.questions.forEach(q=>{ const p=srGetK(cert,q.id); if(p&&p.rc>0&&!p.ot){ n++; if(p.res===2) cor++; } }));
    totN+=n;
    return {code,name:qb[code].name,acc:n>0?Math.round(cor/n*100):null,n};
  });
  const valid=per.filter(s=>s.acc!=null);
  const predicted=valid.length?Math.round(valid.reduce((a,s)=>a+s.acc,0)/valid.length):null;
  return {per,valid,predicted,totN};
}
const PASS_RULE = {
  appraiser:    {pass:60, floor:40, label:'평균 60점 · 과목별 40점'},
  realestate1:  {pass:60, floor:40, label:'평균 60점 · 과목별 40점'},
  realestate2:  {pass:60, floor:40, label:'평균 60점 · 과목별 40점'},
  housing:      {pass:60, floor:40, label:'평균 60점 · 과목별 40점'},
  housing2:     {pass:60, floor:40, label:'평균 60점 · 과목별 40점'},
  koreanhistory:{pass:60, floor:0,  grade:true,
                 grades:[{g:'3급',min:60,color:'#D97706'},{g:'2급',min:70,color:'#2563EB'},{g:'1급',min:80,color:'#15803D'}],
                 label:'급수 인증 · 3급 60 / 2급 70 / 1급 80'},
  bodybuilding: {pass:70, floor:0,  label:'평균 70점'},
  _default:     {pass:60, floor:0,  label:'평균 60점'}
};
function passRule(cert){ return PASS_RULE[cert]||PASS_RULE._default; }
// 합격 판정: 측정완료(전 과목 데이터) + 과락 + 평균
function mcqVerdict(cert, s){
  const rule=passRule(cert);
  const notMeasured=s.per.filter(p=>p.acc==null);
  if(s.predicted==null || notMeasured.length>0){
    return {status:'insufficient', color:'#B4A99C', label:'데이터 부족', notMeasured, rule};
  }
  const failFloor = rule.floor>0 ? s.per.filter(p=>p.acc<rule.floor) : [];
  if(failFloor.length){
    return {status:'fail', color:'#E24B4A', label:'🔴 위험권 (과락)', failFloor, rule};
  }
  const safe=Math.max(80,rule.pass+10);
  if(s.predicted>=safe) return {status:'safe', color:'#2E9B5E', label:'🟢 안전권', rule};
  if(s.predicted>=rule.pass) return {status:'pass', color:'#E0A52E', label:'🟡 합격권', rule};
  return {status:'fail', color:'#E24B4A', label:'🔴 위험권', rule};
}
function mcqLevel(pred,pass){
  pass=pass||60; const safe=Math.max(80,pass+10);
  if(pred==null) return {label:'데이터 부족',color:'#B4A99C'};
  if(pred>=safe) return {label:'🟢 안전권',color:'#2E9B5E'};
  if(pred>=pass) return {label:'🟡 합격권',color:'#E0A52E'};
  return {label:'🔴 위험권',color:'#E24B4A'};
}
function _certHasAnsQ(cert){
  try{
    var qb=(typeof qbOf==='function')?qbOf(cert):null; if(!qb) return false;
    var codes=Object.keys(qb);
    for(var i=0;i<codes.length;i++){
      var sets=(qb[codes[i]]&&qb[codes[i]].sets)||[];
      for(var s=0;s<sets.length;s++){
        var qs=sets[s].questions||[];
        for(var q=0;q<qs.length;q++){ if(mqHasAnswer(qs[q])) return true; }
      }
    }
  }catch(e){}
  return false;
}

var LT2_DATA={"appraiser2": {"name": "감정평가사2차", "questions": [{"id": "a2_lt_s2", "set": "레벨테스트", "ltSubject": "s2", "ltSubjectName": "감정평가이론", "pt": 10, "diff": 3, "q": "감정평가에서 지역분석과 개별분석에 관한 물음에 답하시오. (10점)", "refs": [], "note": "2차 레벨테스트 · 이론", "exp": {"tip": "지역분석(선행·표준적 이용)과 개별분석(후행·최유효이용)의 의의와 선후 관계를 균형 있게 서술하는지가 핵심."}, "concepts": [], "asks": [{"n": 1, "pt": 10, "q": "지역분석과 개별분석의 의의를 각각 설명하고, 두 분석의 관계(선후·전제)를 논하시오. (10점)", "outline": [{"lv": 1, "role": "의의", "h": "지역분석의 의의", "ref": "", "kw": ["지역분석", "표준적 이용", "가격수준", "인근지역"], "body": "대상부동산이 속한 지역의 표준적 이용과 그 지역의 가격수준을 판정하는 분석이다. 지역요인을 검토하여 그 지역 부동산의 표준적 사용과 장래 동향을 파악한다."}, {"lv": 1, "role": "의의", "h": "개별분석의 의의", "ref": "", "kw": ["개별분석", "최유효이용", "개별요인", "구체적 가격"], "body": "대상부동산의 개별적 요인을 분석하여 그 부동산의 최유효이용을 판정하고 구체적인 가격을 도출하는 분석이다."}, {"lv": 1, "role": "검토", "h": "양자의 관계", "ref": "", "kw": ["선행", "후행", "전제", "최유효이용", "표준적 이용"], "body": "지역분석은 전체적·표준적 분석으로 선행하고, 개별분석은 개별적·구체적 분석으로 후행한다. 지역분석에서 파악한 표준적 이용이 개별분석에서 최유효이용을 판정하는 전제가 된다."}]}]}, {"id": "a2_lt_s3", "set": "레벨테스트", "ltSubject": "s3", "ltSubjectName": "감정평가 및 보상법규", "pt": 10, "diff": 3, "q": "「공익사업을 위한 토지 등의 취득 및 보상에 관한 법률」상 사업인정에 관한 물음에 답하시오. (10점)", "refs": [], "note": "2차 레벨테스트 · 법규", "exp": {"tip": "사업인정의 법적 성질(형성행위·특허·재량행위)과 효과(수용권 설정·목적물 확정·보전의무)를 정확히 대응시키는지가 핵심."}, "concepts": [], "asks": [{"n": 1, "pt": 10, "q": "사업인정의 법적 성질과 그 효과를 설명하시오. (10점)", "outline": [{"lv": 1, "role": "학설", "h": "법적 성질", "ref": "", "kw": ["형성행위", "설권행위", "특허", "재량행위"], "body": "사업인정은 사업시행자에게 수용권을 설정해 주는 형성행위(설권행위)로서 특허에 해당하며, 공익성 판단을 요하므로 재량행위로 본다."}, {"lv": 1, "role": "검토", "h": "효과", "ref": "", "kw": ["수용권 설정", "목적물 확정", "관계인", "보전의무", "형질변경"], "body": "사업인정이 고시되면 수용권이 설정되고, 수용목적물과 관계인의 범위가 확정되며, 토지소유자 등에게 토지의 형질변경 등을 제한하는 토지보전의무가 발생한다."}]}]}, {"id": "a2_lt_s4", "set": "레벨테스트", "ltSubject": "s4", "ltSubjectName": "감정평가실무", "pt": 10, "diff": 2, "q": "다음 자료를 활용하여 공시지가기준법에 의한 대상토지의 감정평가액을 산정하는 물음에 답하시오. (10점)\n\n[자료]\n1. 비교표준지 공시지가: 1,000,000원/㎡\n2. 시점수정치: 1.050\n3. 지역요인 비교치: 1.000 (대등)\n4. 개별요인 비교치: 0.950 (대상/표준)\n5. 그 밖의 요인 보정치: 1.200", "refs": [], "note": "2차 레벨테스트 · 실무 (자체 구성 자료·자체 계산)", "exp": {"tip": "공시지가기준법 산식(공시지가×시점수정×지역요인×개별요인×그 밖의 요인)을 순서대로 적용하고 최종 단가를 정확히 계산하는지가 핵심."}, "concepts": [], "asks": [{"n": 1, "pt": 10, "q": "공시지가기준법에 의한 대상토지의 감정평가액(원/㎡)을 산식과 함께 산정하시오. (10점)", "outline": [{"lv": 1, "role": "검토", "h": "적용 산식", "ref": "", "kw": ["공시지가기준법", "시점수정", "지역요인", "개별요인", "그 밖의 요인"], "body": "감정평가액 = 비교표준지 공시지가 × 시점수정치 × 지역요인 비교치 × 개별요인 비교치 × 그 밖의 요인 보정치."}, {"lv": 1, "role": "포섭", "h": "수치 대입·계산", "ref": "", "kw": ["1,000,000", "1.050", "0.950", "1.200", "1,197,000"], "body": "1,000,000원/㎡ × 1.050 × 1.000 × 0.950 × 1.200 = 1,197,000원/㎡."}, {"lv": 1, "role": "소결", "h": "결론", "ref": "", "kw": ["1,197,000", "원/㎡"], "body": "대상토지의 감정평가액은 1,197,000원/㎡이다."}]}]}]}};
/* ===== 2차 전용 레벨테스트 (주관식·AI채점 자동 버킷) — 2026-07-18 ===== */
function lt2Has(cert){ try{ return !!(typeof LT2_DATA!=='undefined' && LT2_DATA[cert] && LT2_DATA[cert].questions && LT2_DATA[cert].questions.length); }catch(e){ return false; } }
var lt2State=null;
function startLt2(){ var cert=mqCert; if(!lt2Has(cert)) return; if(!currentUser){ if(typeof showLoginPopup==='function') showLoginPopup(); return; }
  lt2State={ cert:cert, qs:LT2_DATA[cert].questions.slice(), idx:0, scores:{} };
  try{ if(typeof mqStopTimer==='function') mqStopTimer(); if(typeof mqStopOverTimer==='function') mqStopOverTimer(); }catch(e){}
  mqDiag=false; mqReview=false; mqInReview=false; mqConcept=false; mqLevelUp=false;
  mqScreen='lt2'; renderMCQ(); window.scrollTo(0,0); }
function _lt2Bucket(score,pt){ var r=pt?(score/pt):0; if(r>=0.8) return {tier:'right',pts:10}; if(r>=0.4) return {tier:'vague',pts:5}; return {tier:'wrong',pts:0}; }
function _lt2SubScore(bucket,diff){ var base=(bucket==='right')?1.0:((bucket==='vague')?0.5:0.0); var r=Math.max(0,Math.min(1,base+((diff||3)-3)*0.05)); return Math.round(15+r*57); }
function lt2OnGraded(rec){ if(!lt2State) return; var q=lt2State.qs[lt2State.idx]; if(!q) return; var pt=(rec&&rec.pt)||q.pt||10; var b=_lt2Bucket((rec&&rec.score)||0,pt);
  lt2State.scores[q.ltSubject]={ score:(rec&&rec.score)||0, pt:pt, bucket:b.tier, pts:b.pts, diff:q.diff||3, name:q.ltSubjectName };
  var nx=document.getElementById('lt2Next'); if(nx) nx.style.display='block'; }
function lt2Next(){ if(!lt2State) return; if(lt2State.idx<lt2State.qs.length-1){ lt2State.idx++; renderMCQ(); window.scrollTo(0,0); } else { lt2Finalize(); } }
function lt2Finalize(){ var cert=lt2State.cert;
  try{ if(typeof eloState!=='undefined'){ if(!eloState._levelTest) eloState._levelTest={}; var summary={};
    Object.keys(lt2State.scores).forEach(function(sub){ var s=lt2State.scores[sub]; var sc=_lt2SubScore(s.bucket,s.diff);
      summary[sub]={ score:sc, level:(typeof AE!=='undefined'?AE.scoreToLevel(sc):3), bucket:s.bucket, pts:s.pts, raw:s.score, pt:s.pt, name:s.name }; });
    eloState._levelTest[cert]={ at:Date.now(), summary:summary, subjective:true };
    if(currentUser && typeof saveUserData==='function') saveUserData(); } }catch(e){}
  lt2State=null; mqScreen='home'; renderMCQ(); try{ window.scrollTo(0,0); }catch(e){} }   // 홈(시험목록) 말고 이 시험 대시보드로 → 결과 카드 노출
function lt2ResultCard(cert){ var rec=(typeof eloState!=='undefined')&&eloState._levelTest&&eloState._levelTest[cert]; if(!rec||!rec.summary) return '';
  var TIER={right:{t:'맞음',c:'#2E9B5E'},vague:{t:'애매',c:'#E0A52E'},wrong:{t:'틀림',c:'#E24B4A'}};
  var rows=Object.keys(rec.summary).map(function(sub){ var s=rec.summary[sub]; var ti=TIER[s.bucket]||TIER.vague;
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 4px;border-top:1px solid #F1ECE4"><span style="font-weight:700;color:#3C3C3A">'+mqEsc(s.name||sub)+'</span><span><span style="font-size:12px;font-weight:800;color:'+ti.c+';margin-right:8px">'+ti.t+' '+(s.pts!=null?s.pts:'')+'점</span><span style="font-size:11px;color:#8A7D6E">Lv '+(s.level||'')+'</span></span></div>'; }).join('');
  return '<div class="anal-card"><div class="anal-top"><b>📊 내 예상점수 &amp; 레벨</b></div>'
    +'<div style="padding:4px 4px 2px;font-size:12px;color:#6B7280">레벨 테스트 결과 · 과목별 채점(틀림0·애매5·맞음10)</div>'+rows
    +'<div style="padding:8px 4px 2px;font-size:11px;color:#A89C8E">레벨은 시작점이에요. 문제를 풀면 조정됩니다.</div></div>'; }
function renderLt2(root){ if(!lt2State || lt2State.cert!==mqCert){ lt2State=null; mqScreen='home'; return renderMCQ(); }
  var qs=lt2State.qs, idx=lt2State.idx, q=qs[idx]; var n=qs.length, pct=Math.round((idx+1)/n*100); var graded=lt2State.scores[q.ltSubject];
  root.innerHTML='<div class="exam-sticky">'+
    '<div class="exam-hd"><button class="exam-back" onclick="mqBackHome()" aria-label="뒤로">'+BACK_ARROW+'</button>'+
      '<div class="exam-ti"><div class="nm">🎯 레벨 테스트</div><div class="st">'+mqEsc(q.ltSubjectName||'')+'</div></div></div>'+
    '<div class="mq-prog"><div class="row"><span>'+(idx+1)+' / '+n+' 과목</span><span class="subj-credit">🤖 첨삭 '+gradeBal().toLocaleString()+'</span></div><div class="track"><div class="bar" style="width:'+pct+'%"></div></div></div>'+
    '</div>'+
    '<div style="max-width:760px;margin:8px auto 0;padding:0 14px"><div style="background:#EEF4FB;border:1px solid #D6E4F5;border-radius:10px;padding:10px 12px;font-size:13px;color:#334155;line-height:1.6">답안을 작성하고 <b>채점하기</b>를 누르면 자동 채점돼요(무료). 채점 후 아래 <b>다음</b>으로 넘어가세요. (과목당 1문항)</div></div>'+
    '<div id="lt2Mount"></div>'+
    '<div style="max-width:760px;margin:12px auto 40px;padding:0 14px"><button id="lt2Next" onclick="lt2Next()" style="display:'+(graded?'block':'none')+';width:100%;padding:13px;border:none;border-radius:12px;background:#0C447C;color:#fff;font-weight:800;font-size:15px;cursor:pointer">'+(idx>=n-1?'결과 보기 →':'다음 과목 →')+'</button></div>';
  var host=document.getElementById('lt2Mount');
  var exam={ id:mqCert, name:'레벨테스트', questions:qs };
  var opts=_subjExamOpts(mqCert); opts.host=host; opts.mountId='lt2Mount'; opts.replace=false;
  opts.canOpen=function(){ return true; };
  opts.reportOffline=true;   // 무료 자동채점(채점하기)도 점수 캡처 — API 결제 없이 동작
  opts.aiSell=false;   // AI 채점 버튼 잠깐 숨김(결제 뚫리면 이 줄만 제거)
  opts.explainAi=null;   // 'AI에게 더 물어보기' 위젯도 숨김
  opts.onGraded=function(rec){ lt2OnGraded(rec); };
  if(!(window.CLSubj && CLSubj.openOne)){ host.innerHTML='<div style="margin:16px;padding:14px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:10px;color:#A32D2D;font-weight:700">subjective.js 최신본이 필요합니다 (openOne 없음).</div>'; return; }
  try{ CLSubj.openOne(host, exam, idx, opts); }catch(e){ console.error('lt2 openOne',e); host.innerHTML='<div style="margin:16px">문제 여는 중 오류: '+mqEsc(String(e&&e.message||e))+'</div>'; }
  window.scrollTo(0,0); }


/* ===== 2차 레벨업 (레벨테스트 후 · 약한 과목 우선 자동출제) — 2026-07-18 ===== */
var lu2State=null;
function _lt2NameToKey(cert){ var rec=(typeof eloState!=='undefined')&&eloState._levelTest&&eloState._levelTest[cert]; var m={}; if(rec&&rec.summary){ Object.keys(rec.summary).forEach(function(k){ var s=rec.summary[k]; if(s&&s.name) m[s.name]=k; }); } return m; }
function _lt2SubLevels(cert){ var rec=(typeof eloState!=='undefined')&&eloState._levelTest&&eloState._levelTest[cert]; var m={}; if(rec&&rec.summary){ Object.keys(rec.summary).forEach(function(k){ var s=rec.summary[k]; if(s&&s.name) m[s.name]=s.level||3; }); } return m; }
function _lt2SubjPool(cert){ var qb=(typeof qbOf==='function'?qbOf(cert):{})||{}; var pool=[]; Object.keys(qb).forEach(function(code){ var g=qb[code]; (g.sets||[]).forEach(function(st){ (st.questions||[]).forEach(function(q){ if(q&&q.asks&&q.asks.length) pool.push({q:q, subName:g.name||code, diff:(q&&q.diff)||3}); }); }); }); return pool; }
function startLt2LevelUp(){ var cert=mqCert; if(!lt2Has(cert)) return; if(!ltDone(cert)){ startLt2(); return; }
  var pool=_lt2SubjPool(cert); if(!pool.length){ if(typeof _luToast==='function')_luToast('레벨업 문제가 아직 없어요.'); else alert('레벨업 문제가 아직 없어요.'); return; }
  var lv=_lt2SubLevels(cert);
  pool.sort(function(a,b){ var la=lv[a.subName]||3, lb=lv[b.subName]||3; if(la!==lb) return la-lb; return (a.diff||3)-(b.diff||3); });
  lu2State={cert:cert, queue:pool, idx:0, done:0};
  try{ if(typeof mqStopTimer==='function') mqStopTimer(); if(typeof mqStopOverTimer==='function') mqStopOverTimer(); }catch(e){}
  mqDiag=false; mqReview=false; mqInReview=false; mqConcept=false; mqLevelUp=false;
  mqScreen='lu2'; renderMCQ(); window.scrollTo(0,0); }
function lu2OnGraded(rec){ if(!lu2State) return; var it=lu2State.queue[lu2State.idx]; if(!it) return;
  var r=(rec&&rec.pt)? ((rec.score||0)/rec.pt) : 0; r=Math.max(0,Math.min(1,r));
  try{ var key=_lt2NameToKey(lu2State.cert)[it.subName]; var sm=key&&eloState._levelTest[lu2State.cert].summary[key];
    if(sm){ var target=15+r*57; sm.score=Math.round(sm.score*0.7+target*0.3); sm.level=(typeof AE!=='undefined'?AE.scoreToLevel(sm.score):sm.level); }
    if(currentUser&&typeof saveUserData==='function') saveUserData();
  }catch(e){}
  lu2State.done++; var nx=document.getElementById('lu2Next'); if(nx) nx.style.display='block'; }
function lu2Next(){ if(!lu2State) return; if(lu2State.idx<lu2State.queue.length-1){ lu2State.idx++; renderMCQ(); window.scrollTo(0,0); } else { if(typeof _luToast==='function')_luToast('이 과목 문제를 다 풀었어요!'); lu2State=null; mqScreen='home'; renderMCQ(); } }
function renderLu2(root){ if(!lu2State||lu2State.cert!==mqCert){ lu2State=null; mqScreen='home'; return renderMCQ(); }
  var q=lu2State.queue[lu2State.idx]; if(!q){ lu2State=null; mqScreen='home'; return renderMCQ(); }
  var lv=_lt2SubLevels(mqCert); var curLv=lv[q.subName]||3;
  root.innerHTML='<div class="exam-sticky">'+
    '<div class="exam-hd"><button class="exam-back" onclick="mqBackHome()" aria-label="뒤로">'+BACK_ARROW+'</button>'+
      '<div class="exam-ti"><div class="nm">⚡ 레벨업</div><div class="st">'+mqEsc(q.subName||'')+' · Lv '+curLv+'</div></div></div>'+
    '<div class="mq-prog"><div class="row"><span>'+(lu2State.done+1)+'번째 · 약한 과목 우선</span><span class="subj-credit">'+mqEsc(q.subName||'')+'</span></div><div class="track"><div class="bar" style="width:100%"></div></div></div>'+
    '</div>'+
    '<div style="max-width:760px;margin:8px auto 0;padding:0 14px"><div style="background:#EAF2FC;border:1px solid #C7DBF2;border-radius:10px;padding:10px 12px;font-size:13px;color:#334155;line-height:1.6">약한 과목부터 자동으로 출제돼요. 답안 작성 후 <b>채점하기</b> → <b>다음</b>. 점수에 따라 과목 레벨이 조정됩니다.</div></div>'+
    '<div id="lu2Mount"></div>'+
    '<div style="max-width:760px;margin:12px auto 40px;padding:0 14px"><button id="lu2Next" onclick="lu2Next()" style="display:none;width:100%;padding:13px;border:none;border-radius:12px;background:#185FA5;color:#fff;font-weight:800;font-size:15px;cursor:pointer">다음 문제 →</button></div>';
  var host=document.getElementById('lu2Mount');
  var exam={ id:mqCert, name:'레벨업', questions:[q.q] };
  var opts=_subjExamOpts(mqCert); opts.host=host; opts.mountId='lu2Mount'; opts.replace=false;
  opts.reportOffline=true; opts.aiSell=false; opts.explainAi=null;   // canOpen은 기본값(canAccessSubjective) 유지 → 무료 한도 뒤 합격플랜 결제
  opts.onGraded=function(rec){ lu2OnGraded(rec); };
  if(!(window.CLSubj && CLSubj.openOne)){ host.innerHTML='<div style="margin:16px;padding:14px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:10px;color:#A32D2D;font-weight:700">subjective.js 최신본이 필요합니다 (openOne 없음).</div>'; return; }
  var _ok; try{ _ok=CLSubj.openOne(host, exam, 0, opts); }catch(e){ console.error('lu2 openOne',e); host.innerHTML='<div style="margin:16px">문제 여는 중 오류: '+mqEsc(String(e&&e.message||e))+'</div>'; return; }
  if(_ok===false){ lu2State=null; mqScreen='home'; if(typeof mqBackHome==='function') mqBackHome(); else renderMCQ(); return; }   // 무료 한도 초과 → 결제팝업(canAccessSubjective) 뜬 뒤 목록으로
  window.scrollTo(0,0); }

function mcqAnalysisCard(cert){
  if(typeof lt2Has==='function' && lt2Has(cert)){
    if(!ltDone(cert)){
      return '<div class="anal-card" style="text-align:center">'
        +'<div style="font-size:16px;font-weight:800;color:#0C447C;line-height:1.4;margin:2px 0 8px">지금 '+ltCertName(cert)+' 보면 몇 점?</div>'
        +'<div style="font-size:12px;color:#6B7280;margin-bottom:14px">⚡ 과목별 10점 1문항 · 🤖 AI 자동 채점</div>'
        +'<button class="anal-diag" onclick="startLt2()">🎯 레벨 테스트 시작</button></div>';
    }
    return lt2ResultCard(cert);
  }
  if(!adHasData(cert) && !_certHasAnsQ(cert)){   // 적응형 없고 기출(정답)도 없을 때만 준비중
    return '<div class="anal-card"><div class="anal-top"><b>📊 내 예상점수 &amp; 레벨</b></div>'
      +'<div class="anal-empty">이 시험은 <b>레벨업 데이터 준비 중</b>이에요. 곧 레벨 테스트로 약점을 측정할 수 있어요.</div>'
      +'<button class="anal-diag" disabled style="opacity:.5;cursor:not-allowed">🎯 레벨 테스트 준비 중</button></div>';
  }
  const s=mcqSubjectStats(cert);
  if(!ltDone(cert)){
    return '<div class="anal-card" style="text-align:center">'
      +'<div style="font-size:16px;font-weight:800;color:#0C447C;line-height:1.4;margin:2px 0 8px">지금 '+ltCertName(cert)+' 보면 몇 점?</div>'
      +'<div style="font-size:12px;color:#6B7280;margin-bottom:14px">🎁 100% 무료 · ⚡ 레벨테스트 · 📊 예상점수</div>'
      +'<button class="anal-diag" onclick="diagResume()">🎯 무료 레벨테스트 '+(diagHasSave(cert)?'이어풀기':'시작')+'</button></div>';
  }
  const ap=adPredicted(cert);
  const v=(ap.predicted!=null)?adVerdict(cert,ap):null;
  const predHTML=(ap.predicted==null)
    ? '<div class="anal-pred" style="font-size:20px">측정 중</div><div class="anal-lv" style="color:#B4A99C">'+(ap.notMeasured.length?(ap.notMeasured.length+'개 과목 측정 전'):'데이터 준비 중')+'</div>'
    : '<div class="anal-pred">'+ap.predicted+'<small>점</small></div><div class="anal-lv" style="color:'+v.color+'">'+v.label+'</div>';
  const LVC={1:'#E24B4A',2:'#E24B4A',3:'#E0A52E',4:'#2E9B5E',5:'#2E9B5E'};
  const LVBG={1:'#FCEBEB',2:'#FCEBEB',3:'#FBF0D8',4:'#E6F4EC',5:'#E6F4EC'};
  const LVTX={1:'#A32D2D',2:'#A32D2D',3:'#946200',4:'#1E6B41',5:'#1E6B41'};
  const order=(typeof curOrder==='function')?curOrder():Object.keys(qbOf(cert));
  const subsHTML=(cert==='sport2'?_sp2BtnHTML():'')+order.map(function(sub){
    var lv=luSubjectLevel(cert,sub); if(lv==null) return '';
    var nm=(qbOf(cert)[sub]&&qbOf(cert)[sub].name)||sub, open=!!luCardOpen[sub];
    var pill='<span style="font-size:12px;font-weight:800;padding:3px 11px;border-radius:999px;background:'+LVBG[lv]+';color:'+LVTX[lv]+'">Lv '+lv+'</span>';
    var head='<div onclick="luToggleCardSub(\''+sub+'\')" style="display:flex;align-items:center;gap:9px;padding:9px 4px;border-top:1px solid #F1ECE4;cursor:pointer"><span style="flex:1;font-size:13.5px;font-weight:700;color:#3C3C3A">'+mqEsc(nm)+'<span style="font-size:11px;font-weight:600;color:#B4A99C;margin-left:5px">'+_luTierName(lv)+'</span></span><button onclick="event.stopPropagation();luStartSub(\''+sub+'\')" style="flex:0 0 auto;font-size:11px;font-weight:800;color:#185FA5;background:#E6F1FB;border:1px solid #B5D4F4;border-radius:999px;padding:3px 10px;cursor:pointer">레벨업</button>'+pill+'<span style="font-size:10px;color:#B4A99C;display:inline-block;transform:rotate('+(open?'180':'0')+'deg)">▼</span></div>';
    var body='';
    if(open){
      var sc=luTopicScores(cert,sub), tmap=topicNameMap(cert,sub), rows='';
      Object.keys(sc).forEach(function(t){ var tl=AE.scoreToLevel(sc[t]), tn=(tmap[t]&&tmap[t].name)||t;
        rows+='<div onclick="_planTopicGo(\''+sub+'\',\''+t+'\')" style="display:flex;align-items:center;gap:8px;margin:3px 0;padding:5px 7px;border-radius:9px;background:#FBF8F4;cursor:pointer"><span style="font-size:12px;color:#6E6256;width:108px;flex:0 0 108px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+mqEsc(tn)+'</span><div style="flex:1;height:8px;background:#F0E7DE;border-radius:999px;overflow:hidden"><div style="height:100%;border-radius:999px;width:'+(tl/5*100)+'%;background:'+LVC[tl]+'"></div></div><span style="font-size:11px;font-weight:700;color:#8A7D6E;width:30px;text-align:right">Lv'+tl+'</span><span style="font-size:10.5px;font-weight:800;color:#fff;background:#C79A5B;padding:3px 9px;border-radius:999px;flex:0 0 auto">풀기</span></div>';
      });
      var _thint=Object.keys(sc).length?'<div style="font-size:11px;color:#8A7D6E;margin:0 2px 6px">단원을 누르면 그 단원만 5문제씩 풀어요</div>':'';
      if(!rows) rows='<div style="font-size:12px;color:#B4A99C;padding:4px">단원 데이터 준비 중</div>';
      body='<div style="padding:2px 4px 8px">'+_thint+rows+'</div>';
    }
    return head+body;
  }).join('');
  let noteHTML='';
  if(v && v.status==='fail' && v.failFloor && v.failFloor.length) noteHTML='<div class="anal-weak">⚠️ <b>'+v.failFloor.map(p=>p.name).join(', ')+'</b> 과락(40점 미만)이에요.</div>';
  noteHTML+='<div class="anal-note">예상점수 · 합격 기준 '+passRule(cert).label+' · 레벨은 문제 풀면서 자동 조정</div>';
  return '<div class="anal-card"><div class="anal-top"><b>📊 내 예상점수 &amp; 레벨</b></div>'
    +'<div class="anal-score">'+predHTML+'</div>'
    +((v && ap.predicted!=null)?_luGaugeHTML(cert,ap,v):'')
    +((ap.predicted!=null)?_passPlanEntryHTML(cert):'')
    +_analLockWrap(cert,subsHTML)+noteHTML+'</div>';
}

/* ===== 합격 플랜 (1단계) ===== */
function _planIsPaid(cert){ try{ return !!(typeof userEnt!=='undefined' && userEnt[cert] && userEnt[cert].plan==='ACTIVE'); }catch(_){ return false; } }
function _officialExamMs(cert){
  try{ if(typeof _examDateMs!=='undefined' && _examDateMs && _examDateMs[cert]!=null) return _examDateMs[cert]; }catch(_){}
  try{ if(typeof SR_DEFAULT_EXAM!=='undefined' && SR_DEFAULT_EXAM[cert]) return new Date(SR_DEFAULT_EXAM[cert]+'T23:59:59').getTime(); }catch(_){}
  return null;
}
var _crowdVotes = {};   // {cert: {date: count}}
async function loadCrowdExamVotes(cert){
  if(typeof firebaseReady==='undefined' || !firebaseReady || typeof db==='undefined' || !db || !cert) return;
  try{ if(typeof firebase!=='undefined' && firebase.appCheck) await firebase.appCheck().getToken(); }catch(_){}
  try{ var doc=await db.collection('examDateVotes').doc(cert).get(); _crowdVotes[cert]=(doc.exists?(doc.data()||{}):{}); }catch(_){}
}
function _crowdExamMs(cert){
  var votes=_crowdVotes[cert]; if(!votes) return null;
  var cands=Object.keys(votes).filter(function(d){ return (votes[d]||0)>=3 && /^\d{4}-\d{2}-\d{2}$/.test(d); }).sort();
  if(!cands.length) return null;
  var clusters=[], cur=null, anchorMs=null;   // ±1개월 회차 그룹(최초=가장 이른 날짜 기준)
  cands.forEach(function(d){ var ms=new Date(d+'T23:59:59').getTime();
    if(cur && (ms-anchorMs)<=31*86400000){ cur.push(d); } else { cur=[d]; clusters.push(cur); anchorMs=ms; } });
  var now=Date.now(), best=null;   // 회차마다 최다표 날짜, 그 중 가장 가까운 미래
  clusters.forEach(function(cl){ var top=cl[0], tc=votes[cl[0]]||0;
    cl.forEach(function(d){ if((votes[d]||0)>tc){ tc=votes[d]||0; top=d; } });
    var ms=new Date(top+'T23:59:59').getTime(); if(ms>=now && (best==null||ms<best)) best=ms; });
  return best;
}
async function _crowdVote(cert, oldDate, newDate){
  if(typeof firebaseReady==='undefined' || !firebaseReady || typeof db==='undefined' || !db || typeof currentUser==='undefined' || !currentUser || !cert) return;
  if(oldDate===newDate) return;
  try{ var upd={};
    if(newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) upd[newDate]=firebase.firestore.FieldValue.increment(1);
    if(oldDate && /^\d{4}-\d{2}-\d{2}$/.test(oldDate)) upd[oldDate]=firebase.firestore.FieldValue.increment(-1);
    if(Object.keys(upd).length){ await db.collection('examDateVotes').doc(cert).set(upd,{merge:true}); _crowdVotes[cert]=null; loadCrowdExamVotes(cert); }
  }catch(e){ try{ console.error('시험일 집계 오류', e); }catch(_){} }
}
function editExamDate(cert){
  cert = cert || (typeof mqCert!=='undefined'?mqCert:null); if(!cert) return;
  if(_officialExamMs(cert)!=null){ if(typeof clToast==='function') clToast('공식 시험일이 등록된 시험이에요'); return; }
  if(typeof currentUser==='undefined' || !currentUser){ if(typeof showLoginPopup==='function') showLoginPopup('exam_date'); return; }
  var old = (typeof srExamOverride!=='undefined' && srExamOverride[cert]) || '';
  var v = prompt('시험일을 입력하세요 (YYYY-MM-DD)', old);
  if(!v) return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){ alert('날짜 형식이 올바르지 않습니다. 예: 2026-06-23'); return; }
  var ms=new Date(v+'T23:59:59').getTime();
  if(isNaN(ms)){ alert('올바르지 않은 날짜예요.'); return; }
  if(ms < Date.now()-86400000){ if(!confirm('이미 지난 날짜예요. 그래도 저장할까요?')) return; }
  srExamOverride[cert]=v; if(typeof srFlush==='function') srFlush();
  _crowdVote(cert, old, v);
  var el=document.getElementById('passPlanOverlay'); if(el && el.style.display==='block'){ el.innerHTML=passPlanHTML(cert,_planIsPaid(cert)); }
  if(typeof renderMCQ==='function' && typeof mqCert!=='undefined' && mqCert===cert){ try{ renderMCQ(); }catch(_){} }
}
function _planExamMs(cert){
  var o=_officialExamMs(cert); if(o!=null) return o;                                    // ① 우리값(공식) 최우선
  try{ if(typeof srExamOverride!=='undefined' && srExamOverride[cert]) return new Date(srExamOverride[cert]+'T23:59:59').getTime(); }catch(_){}   // ② 개인 입력값(그대로 유지)
  var c=_crowdExamMs(cert); if(c!=null) return c;                                       // ③ 크라우드(3명↑ 회차)
  return null;                                                                          // ④ 없음 → 등록 유도
}
function _planDaysLeft(cert){ var ms=_planExamMs(cert); if(ms==null) return null; return Math.ceil((ms-Date.now())/86400000); }
function _planTopics(cert, sub){
  var sc=luTopicScores(cert,sub), tmap=topicNameMap(cert,sub), out=[];
  var hasMap=false; for(var _k in tmap){ hasMap=true; break; }   // 맵 미로드 시엔 고아 판정 보류(전부 스킵 방지)
  for(var t in sc){
    if(hasMap && !tmap[t]) continue;   // eloState 고아 토픽(현재 토픽맵에 없는 옛 코드) → 합격플랜 표시 제외
    var lv=AE.scoreToLevel(sc[t]), star=0;
    try{ if(typeof _impAutoStar==='function') star=_impAutoStar(cert,sub,t)||0; }catch(_){}
    out.push({tcode:t, name:(tmap[t]&&tmap[t].name)||t, score:sc[t], lv:lv, star:star, lev:(5-lv)*(1+star*0.5)});
  }
  out.sort(function(a,b){ return b.lev-a.lev || a.lv-b.lv; });
  return out;
}
function _planSimSubject(cert, sub, raiseTcodes, targetLv){
  try{
    var sc=luTopicScores(cert,sub), tmap=topicNameMap(cert,sub), wsum=0,w=0, tgt=AE.levelToScore(targetLv||3);
    for(var t in sc){ var s=sc[t]; if(raiseTcodes.indexOf(t)>=0 && s<tgt) s=tgt; var wt=(tmap[t]&&tmap[t].mode==='exam')?2:1; wsum+=s*wt; w+=wt; }
    return w? eloToExamScore(wsum/w) : null;
  }catch(_){ return null; }
}
// 오늘의 1순위 세션 크기: 실제 출제 가능 문항 기준 최대 5문제(라운드가 과목 내 다음 약한 단원으로 채워지므로 과목 단위로 계산)
function _planRoundCount(cert, sub){
  try{
    var n=0, qb=qbOf(cert)[sub];
    if(qb) qb.sets.forEach(function(st){ st.questions.forEach(function(q){ if(!mqHasAnswer(q)) return; var info=(typeof adLookup==='function')&&adLookup(cert,sub,q.id); if(info&&info.topic&&info.diff) n++; }); });
    var b=(typeof AD_DATA!=='undefined')&&AD_DATA[cert+'|'+sub];
    if(!b) return LU_ROUND;   // 변형풀 로드 전이면 기본 5(과소표시 방지)
    n+=((b.variantPool)||[]).length;
    if(((b.calcTemplates)||[]).length) n+=LU_ROUND;   // 계산 자동생성은 매 라운드 새 문제 공급
    return Math.min(LU_ROUND, n||LU_ROUND);
  }catch(_){ return LU_ROUND; }
}
function _planTopicGo(sub, tcode){
  var cert=(typeof mqCert!=='undefined')?mqCert:null;
  if(!_planIsPaid(cert)){ _planUpsell(); return; }   // 무료 → 멤버십 유도 팝업(플랜 유지)
  closePassPlan();
  if(typeof lt2Has==='function' && lt2Has(cert)){ startLt2LevelUp(); return; }   // 주관식: 합격플랜 풀기 → 레벨업(약한 과목)
  luStartTopic(sub, tcode);                           // 객관식: 유료 → 플랜 닫고 풀기
}
var _PLAN_LVC={1:'#E24B4A',2:'#E24B4A',3:'#E0A52E',4:'#2E9B5E',5:'#2E9B5E'};
function _planTopicRow(cert, sub, t, paid){
  var fire = t.star>=3 ? '<span style="font-size:12px;flex:0 0 auto">🔥</span>' : '<span style="font-size:12px;flex:0 0 auto;opacity:.2">🔥</span>';
  var solve = '<span onclick="_planTopicGo(\''+sub+'\',\''+t.tcode+'\')" style="font-size:10.5px;font-weight:800;color:#fff;background:#C79A5B;padding:4px 11px;border-radius:999px;cursor:pointer">풀기</span>';
  return '<div style="display:flex;align-items:center;gap:7px;margin:4px 0;padding:6px 8px;border-radius:9px;background:#FBF8F4">'
    +fire+'<span style="font-size:12px;color:#6E6256;width:78px;flex:0 0 78px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+mqEsc(t.name)+'</span>'
    +'<div style="flex:1;height:8px;background:#F0E7DE;border-radius:999px;overflow:hidden"><div style="height:100%;border-radius:999px;width:'+(t.lv/5*100)+'%;background:'+_PLAN_LVC[t.lv]+'"></div></div>'
    +'<span style="font-size:11px;font-weight:700;color:#8A7D6E;width:24px;text-align:right">Lv'+t.lv+'</span>'+solve+'</div>';
}
function _planSubCard(cert, s, rule, paid){
  var tops=_planTopics(cert, s.code).slice(0,3);
  if(!tops.length) return '';
  var floor=(rule&&rule.floor)||0;
  var isFail = floor>0 && s.score<floor;
  var pill = isFail
    ? '<span style="font-size:11px;font-weight:800;color:#fff;background:#E24B4A;padding:2px 8px;border-radius:999px">🔴 과락 예상 '+s.score+'점</span>'
    : (s.score<((rule&&rule.pass)||60)
       ? '<span style="font-size:11px;font-weight:800;color:#fff;background:#E24B4A;padding:2px 8px;border-radius:999px">🔴 '+s.score+'점</span>'
       : '<span style="font-size:11px;font-weight:800;color:#946200;background:#FBF0D8;padding:2px 8px;border-radius:999px">🟡 '+s.score+'점</span>');
  var raise=tops.map(function(t){return t.tcode;});
  var sim=_planSimSubject(cert, s.code, raise, 3);
  var simLine='';
  if(sim!=null && sim>s.score){ var tail=isFail?'(과락 탈출)':(sim>=((rule&&rule.pass)||60)?'(합격권)':''); simLine='<div style="font-size:11.5px;color:#A38C7A;margin-bottom:8px">이 단원들 Lv3로 올리면 → <b style="color:#1E6B41">약 '+sim+'점 '+tail+'</b></div>'; }
  var rows=tops.map(function(t){return _planTopicRow(cert, s.code, t, paid);}).join('');
  return '<div style="margin:0 14px 12px;background:#fff;border:1px solid '+(isFail?'#F0C9C9':'#E2D6CC')+';border-radius:14px;padding:12px 13px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><span style="font-size:14px;font-weight:800;color:#3C3C3A">'+mqEsc(s.name)+'</span>'+pill+'</div>'
    +simLine+rows+'</div>';
}
function _planDummyCard(color){
  return '<div style="margin:0 14px 12px;background:#fff;border:1px solid '+color+';border-radius:14px;padding:12px 13px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:14px;font-weight:800;color:#3C3C3A">○○○</span><span style="font-size:11px;font-weight:800;color:#fff;background:#E24B4A;padding:2px 8px;border-radius:999px">🔴 과락 예상 ○○점</span></div>'
    +'<div style="display:flex;align-items:center;gap:7px;margin:4px 0;padding:6px 8px;border-radius:9px;background:#FBF8F4"><span style="font-size:12px">🔥</span><span style="font-size:12px;color:#6E6256;width:78px">○○○○</span><div style="flex:1;height:8px;background:#F0E7DE;border-radius:999px;overflow:hidden"><div style="height:100%;width:20%;background:#E24B4A;border-radius:999px"></div></div><span style="font-size:11px;color:#8A7D6E">Lv1</span><span style="font-size:10.5px;font-weight:800;color:#fff;background:#C79A5B;padding:4px 11px;border-radius:999px">풀기</span></div>'
    +'<div style="display:flex;align-items:center;gap:7px;margin:4px 0;padding:6px 8px;border-radius:9px;background:#FBF8F4"><span style="font-size:12px">🔥</span><span style="font-size:12px;color:#6E6256;width:78px">○○○○</span><div style="flex:1;height:8px;background:#F0E7DE;border-radius:999px;overflow:hidden"><div style="height:100%;width:40%;background:#E24B4A;border-radius:999px"></div></div><span style="font-size:11px;color:#8A7D6E">Lv2</span><span style="font-size:10.5px;font-weight:800;color:#fff;background:#C79A5B;padding:4px 11px;border-radius:999px">풀기</span></div></div>';
}
function passPlanHTML(cert, paid){
  var ap=adPredicted(cert), rule=passRule(cert), v=(ap.predicted!=null)?adVerdict(cert,ap):null;
  var dl=_planDaysLeft(cert);
  var vlabel=v?v.label:'', vcolor=v?v.color:'#8A7D6E';
  var safe=Math.max(80,(rule.pass||60)+10);
  var sorted=ap.per.filter(function(p){return p.score!=null;}).sort(function(a,b){return a.score-b.score;});
  var weak=sorted.filter(function(p){return p.score<safe;});
  if(!weak.length) weak=sorted.slice(0,Math.min(2,sorted.length));
  var safeSubs=sorted.filter(function(p){return weak.indexOf(p)<0;});

  var top=null;
  if(weak.length){ var tt=_planTopics(cert, weak[0].code); if(tt.length) top={sub:weak[0].code, subName:weak[0].name, t:tt[0]}; }

  var head='<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border-bottom:1px solid #EDE4D9;position:sticky;top:0;z-index:2">'
    +'<span onclick="closePassPlan()" style="font-size:17px;color:#8A7D6E;cursor:pointer">←</span>'
    +'<span style="font-size:15px;font-weight:800;color:#3C3C3A">🎯 합격 플랜</span></div>';

  var official=_officialExamMs(cert)!=null;
  var ddayChip;
  if(dl!=null){
    ddayChip='<span '+(official?'':'onclick="editExamDate(\''+cert+'\')" ')+'style="margin-left:auto;font-size:12px;font-weight:800;color:#C0392B;background:#FCEBEB;padding:3px 10px;border-radius:999px;cursor:'+(official?'default':'pointer')+'">'+(dl>0?'D-'+dl:dl===0?'D-DAY':'시험종료')+(official?'':' ✎')+'</span>';
  } else {
    ddayChip='<span onclick="editExamDate(\''+cert+'\')" style="margin-left:auto;font-size:11.5px;font-weight:800;color:#185FA5;background:#EAF1FB;padding:4px 11px;border-radius:999px;cursor:pointer">📅 시험일 등록 →</span>';
  }
  var schedLine = (dl!=null && dl>0) ? '시험까지 '+dl+'일 · 하루 20문제씩 합격플랜대로 풀면 <b style="color:#1E6B41">안전권 도달</b> 예상' : '하루 20문제씩 합격플랜대로 풀면 <b style="color:#1E6B41">안전권 도달</b> 예상';
  var summary='<div style="margin:14px 14px 0;background:#fff;border:1px solid #E2D6CC;border-radius:14px;padding:13px 15px">'
    +'<div style="display:flex;align-items:baseline;gap:9px">'
    +'<span style="font-size:30px;font-weight:800;color:#185FA5;line-height:1">'+(ap.predicted!=null?ap.predicted:'--')+'<span style="font-size:14px">점</span></span>'
    +(vlabel?'<span style="font-size:13px;font-weight:800;color:'+vcolor+'">'+vlabel+'</span>':'')+ddayChip+'</div>'
    +'<div style="margin-top:8px;font-size:12px;color:#7A6F62;line-height:1.5">'+schedLine+'</div></div>';

  var todayCard='';
  if(top){
    var nQ=_planRoundCount(cert, top.sub);
    var startBtn = '<span onclick="_planTopicGo(\''+top.sub+'\',\''+top.t.tcode+'\')" style="font-size:12px;font-weight:800;color:#fff;background:#185FA5;padding:8px 16px;border-radius:999px;cursor:pointer">시작 →</span>';
    var previewBadge = '';
    todayCard='<div style="margin:12px 14px 0;background:#EAF1FB;border:1px solid #BFD8F2;border-radius:14px;padding:12px 14px">'
      +'<div style="font-size:11px;font-weight:800;color:#185FA5;margin-bottom:3px">⚡ 오늘의 1순위'+previewBadge+'</div>'
      +'<div style="display:flex;align-items:center;gap:10px"><div style="flex:1">'
      +'<div style="font-size:14px;font-weight:800;color:#0C447C">'+mqEsc(top.subName)+' · '+mqEsc(top.t.name)+' '+nQ+'문제</div>'
      +'<div style="font-size:11px;color:#5B6B7E;margin-top:1px">'+(top.t.star>=3?'🔥 약한데 자주 나옴 · 가장 이득':'가장 이득인 단원')+'</div></div>'+startBtn+'</div></div>';
  }

  var cards=weak.map(function(s){return _planSubCard(cert,s,rule,true);}).join('');
  var safeLine = safeSubs.length ? '<div style="margin:0 14px 16px;padding:10px 13px;background:#EAF3EC;border-radius:12px;font-size:12px;color:#1E6B41">🟢 <b>'+mqEsc(safeSubs[0].name)+(safeSubs.length>1?' 외 '+(safeSubs.length-1)+'과목':'')+'</b>은 양호해요 · 복습만 유지</div>' : '';
  var body='<div style="margin:16px 14px 4px;font-size:11px;font-weight:800;color:#B4A99C">전체 합격 플랜 · 가성비 순</div>'+cards+safeLine;
  return head+summary+todayCard+body+'<div style="height:20px"></div>';
}
function openPassPlan(){
  var cert=mqCert; if(!cert) return;
  if(typeof ltGate==='function' && ltGate(cert)){ if(typeof diagResume==='function') diagResume(); return; }
  var el=document.getElementById('passPlanOverlay');
  if(!el){ el=document.createElement('div'); el.id='passPlanOverlay'; el.style.cssText='position:fixed;inset:0;z-index:9000;background:#FDF7F0;overflow-y:auto;-webkit-overflow-scrolling:touch'; document.body.appendChild(el); }
  el.innerHTML=passPlanHTML(cert, _planIsPaid(cert));
  el.style.display='block'; el.scrollTop=0; document.body.style.overflow='hidden';
  if(_officialExamMs(cert)==null){ loadCrowdExamVotes(cert).then(function(){ var e2=document.getElementById('passPlanOverlay'); if(e2 && e2.style.display==='block'){ e2.innerHTML=passPlanHTML(cert,_planIsPaid(cert)); } }); }
}
function closePassPlan(){ var el=document.getElementById('passPlanOverlay'); if(el){ el.style.display='none'; el.innerHTML=''; } document.body.style.overflow=''; }
function _planUpsell(){
  var w=document.createElement('div'); w.style.cssText='position:fixed;inset:0;z-index:9200;background:rgba(20,14,8,.45);display:flex;align-items:center;justify-content:center;padding:0 26px';
  w.innerHTML='<div style="background:#fff;border-radius:18px;padding:20px;text-align:center;max-width:300px;width:100%">'
    +'<div style="font-size:30px;margin-bottom:8px">🔒</div>'
    +'<div style="font-size:16px;font-weight:800;color:#0C447C;margin-bottom:6px">맞춤 합격 플랜은 멤버십</div>'
    +'<div style="font-size:12.5px;color:#5F5A52;line-height:1.6;margin-bottom:15px">오늘의 1순위 학습, 과목별 약점 전체,<br>무제한 문제풀이까지 — 멤버십으로 합격까지 한 번에.</div>'
    +'<button id="_pupBuy" style="border:none;background:#0C447C;color:#fff;font-size:14px;font-weight:800;padding:13px 0;border-radius:12px;width:100%;cursor:pointer">멤버십 구매하기</button>'
    +'<div id="_pupLater" style="font-size:11.5px;color:#A79C8C;margin-top:11px;cursor:pointer">나중에</div></div>';
  document.body.appendChild(w);
  w.querySelector('#_pupBuy').onclick=function(){ document.body.removeChild(w); if(typeof showPlanPopup==='function') showPlanPopup(true); };
  w.querySelector('#_pupLater').onclick=function(){ document.body.removeChild(w); };
  w.onclick=function(e){ if(e.target===w) document.body.removeChild(w); };
}
function _passPlanEntryHTML(cert){
  return '<div onclick="openPassPlan()" style="margin:10px 0 2px;border-radius:12px;background:#0C447C;color:#fff;padding:11px 14px;display:flex;align-items:center;gap:8px;cursor:pointer"><span style="font-size:16px">🎯</span><span style="flex:1;font-size:14px;font-weight:800">합격 플랜 확인하기</span><span style="font-size:15px">→</span></div>';
}
function _analLockWrap(cert, inner){ return inner; }   // 블러 제거 — 다 보여주고 풀기 버튼(_planTopicGo)에서 게이트

// ===== 4-a 레벨 테스트 (진단 세션 위에 얹음. mqDiag 플밍 재사용) =====
var mqLevelTest=false;                       // 레벨 테스트 세션 여부
var LT_PER_SUBJECT=7;                         // 과목당 고정 문항수(시험 무관)
function _ltPerSubject(cert){ return cert==='koreanhistory' ? 14 : LT_PER_SUBJECT; }   // 한국사는 단일과목이라 예외로 14문항
var LT_SAVE_VER=2;                            // 레벨테스트 저장 포맷 버전(변형 기반). 옛 save(버전 없음/불일치)는 폐기 후 새 출제
function _ltDiff(cert,sub,q){ var info=(typeof adLookup==='function')&&adLookup(cert,sub,q.id); return (info&&info.diff)?info.diff:null; }
function _ltShuf(a){ for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;} return a; }
// 한 과목에서 난이도 분산으로 n문항 추출(diff 있는 것 우선, 부족분은 일반 랜덤 보충)
function _ltSampleSubject(cert,sub,code,qb,n){
  var subName=(qb[code]&&qb[code].name)||code;
  var order=[3,4,2,5,1], picked=[], seen={};
  // 1) 변형(variantq) 풀 우선 — diff(Lv1~5) 보유, 기출 소진 방지
  var vp=[]; try{ var b=(typeof AD_DATA!=='undefined')&&AD_DATA[cert+'|'+sub]; vp=(b&&b.variantPool)||[]; }catch(e){}
  var vD={1:[],2:[],3:[],4:[],5:[]};
  vp.forEach(function(q){ if(!q||!q.id) return; q._subj=subName; q._subjCode=sub; var d=q.diff||q._ltDiff||3; q._ltDiff=d; (vD[d]||vD[3]).push(q); });
  Object.keys(vD).forEach(function(k){ _ltShuf(vD[k]); });
  var guard=0;
  while(picked.length<n && guard++<400){ var got=false; for(var oi=0;oi<order.length;oi++){ var bk=vD[order[oi]]; if(bk.length){ var q=bk.shift(); if(!seen[q.id]){ seen[q.id]=1; picked.push(q); got=true; } if(picked.length>=n) break; } } if(!got) break; }
  if(picked.length>=n) return picked.slice(0,n);
  // 2) 부족분만 기출 보충(기출 최대한 회피 — 변형이 모자랄 때만)
  var kWithDiff=[], kPlain=[];
  qb[code].sets.forEach(function(st){ st.questions.forEach(function(q){ if(seen[q.id]) return; if(mqHasAnswer(q)){ q._subj=subName; q._subjCode=sub; var d=_ltDiff(cert,sub,q); if(d){ q._ltDiff=d; kWithDiff.push(q);} else { q._ltDiff=null; kPlain.push(q);} } }); });
  var kD={1:[],2:[],3:[],4:[],5:[]}; kWithDiff.forEach(function(q){ kD[q._ltDiff].push(q); }); Object.keys(kD).forEach(function(k){ _ltShuf(kD[k]); });
  guard=0;
  while(picked.length<n && guard++<400){ var g2=false; for(var oj=0;oj<order.length;oj++){ var b2=kD[order[oj]]; if(b2.length){ var q2=b2.shift(); if(!seen[q2.id]){ seen[q2.id]=1; picked.push(q2); g2=true; } if(picked.length>=n) break; } } if(!g2) break; }
  if(picked.length<n){ _ltShuf(kPlain); for(var p=0;p<kPlain.length&&picked.length<n;p++){ if(!seen[kPlain[p].id]){ seen[kPlain[p].id]=1; picked.push(kPlain[p]); } } }
  return picked.slice(0,n);
}
async function startDiagnostic(){
  const cert=mqCert, qb=qbOf(cert); let picked=[];
  if(cert==='sport2' && !_sp2Get()){ _sp2OpenPicker(function(){ startDiagnostic(); }); return; }
  if(typeof loadAdaptiveSubject==='function'){            // 변형 풀 로드 보장(비차단 로드 미완료 대비)
    try{ await Promise.all(Object.keys(qb).map(function(code){ return loadAdaptiveSubject(cert, code).catch(function(){return null;}); })); }catch(e){}
  }
  _sp2FilterOrder(cert, Object.keys(qb)).forEach(code=>{        // sport2는 선택 5과목만
    picked=picked.concat(_ltSampleSubject(cert, code, code, qb, _ltPerSubject(cert)));
  });
  if(picked.length<1){ _luToast('레벨 테스트에 사용할 문제가 아직 없어요. (정답이 입력된 문제가 필요해요)'); return; }
  clearDiagProgress(cert);
  mqStopTimer();
  mqDiag=true; mqLevelTest=true; mqReview=false; mqInReview=false; mqConcept=false; mqMode='diag'; mqSub=''; mqSet=0; mqShow={}; mqGuess={}; mqAns={}; mqIdx=0;
  mqList=picked; mqOXClearList(picked);   // 레벨 테스트 출제 문항의 이전 O/X 해제
  mqTimeLeft=_sessionSecs(picked, mqCert);
  mqScreen='exam'; renderMCQ(); mqStartTimer(); window.scrollTo(0,0);
}
// 난이도 가중 점수: 어려운 문항 정답일수록 더 끌어올림(전부 Lv3면 단순비율과 동일)
function _ltSubjectScore(cert, sub, qlist, ans){
  var LS={1:10,2:30,3:50,4:70,5:90};
  var cw=0, tw=0, n=0, cc=0;
  qlist.forEach(function(q){ if(ans[q.id]===undefined) return; n++;
    var ok=mqCorrect(q, ans[q.id]); if(ok) cc++;
    var d=q._ltDiff || _ltDiff(cert,sub,q) || 3; var w=LS[d]||50;
    tw+=w; if(ok) cw+=w;
  });
  if(!n) return null;
  var rw = tw>0 ? cw/tw : cc/n;                 // 난이도 가중 정답비율(폴백: 단순비율)
  var eff = Math.round(rw*n);
  var score = (typeof AE!=='undefined') ? AE.initFromDiagnostic(eff, n) : Math.round(15+rw*57);
  var lv = (typeof AE!=='undefined') ? AE.scoreToLevel(score) : 3;
  return {score:score, level:lv, n:n, correct:cc};
}
// ===== 레벨테스트 결과 로그인 게이트 (게스트가 다 풀면 결과는 로그인해야 공개) =====
var _ltPending=null;   // {cert,qs,ans} — 로그인 후 재계산용
function _ltTotalCount(cert){ try{ return _sp2FilterOrder(cert, Object.keys(qbOf(cert)||{})).length * _ltPerSubject(cert); }catch(_){ return _ltPerSubject(cert); } }
function _ltRenderResultGate(M){
  var cert=M.cert||mqCert;
  if(mqResultQs && mqResultQs.length){
    _ltPending={cert:cert, qs:mqResultQs.slice(), ans:Object.assign({},mqResultAns)};
    try{ localStorage.setItem('certlab_lt_pending', JSON.stringify({cert:cert, ids:mqResultQs.map(function(q){return q.id;}), ans:mqResultAns, at:Date.now()})); }catch(_){}
  }
  var _totN=(mqResultQs&&mqResultQs.length)?mqResultQs.length:(M.total||_ltTotalCount(cert));
  var isGrade=(typeof passRule==='function' && passRule(cert) && passRule(cert).grade);
  var metric=isGrade?'예상 급수':'예상 점수';
  var subs=[]; try{ var qb=qbOf(cert); subs=Object.keys(qb).map(function(c){ return (qb[c].name||c); }); }catch(_){}
  var blurCards=subs.slice(0,4).map(function(nm,i){
    var w=[62,48,55,70][i%4];
    return '<div class="ltg-card"><div class="ltg-nm">'+mqEsc(nm)+'</div><div class="ltg-bar"><div style="width:'+w+'%"></div></div></div>';
  }).join('')+'<div class="ltg-card"><div class="ltg-nm">'+metric+' · 약점 토픽</div><div class="ltg-bar"><div style="width:58%"></div></div></div>';
  var host=document.getElementById('mcqView')||document.body;
  var box=document.getElementById('mcqRoot');
  var html='<div class="lt-nav"><button class="lt-nav-back" onclick="goHome()" aria-label="홈">←</button><span>레벨테스트</span></div>'
    +'<div class="ltg-wrap">'
    +'<div class="ltg-top"><div class="ltg-done">레벨테스트 완료 🎉</div><div class="ltg-h">결과가 준비됐어요</div>'
      +'<div class="ltg-sc">'+_totN+'문제 · '+subs.length+'과목 채점 완료</div></div>'
    +'<div class="ltg-blurwrap"><div class="ltg-blur">'+blurCards+'</div>'
      +'<div class="ltg-gate"><div class="ltg-lock">🔒</div>'
        +'<div class="ltg-gt">로그인하면 결과 공개</div>'
        +'<div class="ltg-gs">'+metric+'를 확인하고,<br>맞춤 레벨업 학습을 무료로 시작하세요.</div>'
        +'<button class="ltg-btn" onclick="_ltGateLogin()"><span class="ltg-g">G</span> 구글로 1초 로그인하고 결과 보기</button>'
        +'<div class="ltg-note">가입하면 약점 집중 문제까지 무료로 풀 수 있어요</div>'
      +'</div></div>'
  +'</div>';
  if(box){ box.innerHTML=html; box.classList.remove('hidden'); }
  else { var d=document.getElementById('mqResultMount'); if(!d){ d=document.createElement('div'); d.id='mqResultMount'; host.appendChild(d); } d.innerHTML=html; }
  if(!document.getElementById('ltgCss')){
    var st=document.createElement('style'); st.id='ltgCss';
    st.textContent='.ltg-wrap{max-width:440px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 6px 22px rgba(31,41,55,.1)}'
      +'.ltg-top{background:linear-gradient(135deg,#185FA5,#0C447C);color:#fff;padding:24px 22px 28px;text-align:center}'
      +'.ltg-done{font-size:12px;opacity:.85;margin-bottom:6px}.ltg-h{font-size:20px;font-weight:900;margin:2px 0 5px}.ltg-sc{font-size:13px;opacity:.9}'
      +'.ltg-blurwrap{position:relative;padding:18px 20px;min-height:230px}'
      +'.ltg-blur{filter:blur(6px);opacity:.55;pointer-events:none}'
      +'.ltg-card{background:#F7F9FC;border:1px solid #E8EEF5;border-radius:12px;padding:13px;margin-bottom:9px}'
      +'.ltg-nm{font-size:13px;font-weight:800;color:#1F2937;margin-bottom:6px}'
      +'.ltg-bar{height:9px;border-radius:99px;background:#E2E8F0;overflow:hidden}.ltg-bar>div{height:100%;background:linear-gradient(90deg,#5B8DEF,#185FA5)}'
      +'.ltg-gate{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:22px;background:linear-gradient(180deg,rgba(255,255,255,.45),rgba(255,255,255,.96) 40%)}'
      +'.ltg-lock{font-size:28px;margin-bottom:9px}.ltg-gt{font-size:17px;font-weight:900;color:#1F2937;margin-bottom:7px}'
      +'.ltg-gs{font-size:13px;color:#6B7280;line-height:1.55;margin-bottom:18px}'
      +'.ltg-btn{width:100%;max-width:330px;display:flex;align-items:center;justify-content:center;gap:9px;background:#fff;border:1.5px solid #DADCE0;border-radius:13px;padding:14px;font-size:14.5px;font-weight:800;color:#3C4043;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.06)}'
      +'.ltg-g{font-size:17px;font-weight:900;color:#4285F4}.ltg-note{font-size:11.5px;color:#9AA1AD;margin-top:11px}'
      +'.lt-nav{display:flex;align-items:center;gap:6px;max-width:440px;margin:0 auto 10px;padding:2px}.lt-nav-back{border:none;background:none;font-size:22px;color:#0C447C;cursor:pointer;padding:0 6px;line-height:1}.lt-nav>span{font-size:15px;font-weight:800;color:#1F2937}';
    document.head.appendChild(st);
  }
  window.scrollTo(0,0);
}
function _ltGateLogin(){ if(typeof signInWithGoogle==='function') signInWithGoogle(); }
// 비로그인 시험 진입: 레벨테스트 안 했으면 후킹, 했으면(같은 브라우저) 결과 게이트
function _ltGuestHasDone(cert){ try{ var raw=localStorage.getItem('certlab_lt_pending'); if(!raw) return false; var j=JSON.parse(raw); return !!(j && j.cert===cert && j.ids && j.ids.length); }catch(_){ return false; } }
function _ltGuestGate(cert){
  try{ mqCert=cert; }catch(_){}
  mqScreen='lthook';
  if(_ltGuestHasDone(cert)){
    var t=0; try{ t=(JSON.parse(localStorage.getItem('certlab_lt_pending')).ids||[]).length; }catch(_){}
    _ltRenderResultGate({cert:cert, total:t});
  } else {
    _ltHookingScreen(cert);
  }
}
// 저장된 문항 id → 문항 객체 복원(로그인 후 재계산용)
async function _ltReconstructQs(cert, ids){
  try{
    if(!ids || !ids.length) return [];
    var qb=qbOf(cert); if(!qb) return [];
    if(typeof loadAdaptiveSubject==='function'){ try{ await Promise.all(Object.keys(qb).map(function(code){ return loadAdaptiveSubject(cert, code).catch(function(){return null;}); })); }catch(e){} }
    var byId={};
    Object.keys(qb).forEach(function(code){ qb[code].sets.forEach(function(st){ st.questions.forEach(function(q){ byId[q.id]={q:q,name:qb[code].name||code,code:code}; }); }); });
    Object.keys(qb).forEach(function(code){ try{ var b=(typeof AD_DATA!=='undefined')&&AD_DATA[cert+'|'+code]; var vp=(b&&b.variantPool)||[]; vp.forEach(function(v){ if(v&&v.id&&!byId[v.id]) byId[v.id]={q:v,name:(qb[code].name||code),code:code}; }); }catch(e){} });
    return ids.map(function(id){ var e=byId[id]; if(e){ e.q._subj=e.name; e.q._subjCode=e.code; return e.q; } return null; }).filter(Boolean);
  }catch(e){ return []; }
}
// ?lt= 광고/SEO 유입: enterCert가 비로그인 후킹/게이트를 처리(로그인 사용자는 일반 진입)
async function _ltEnterHooking(cert){
  try{ if(typeof enterCert==='function') await enterCert(cert); }catch(_){}
}
function _ltHookingScreen(cert){
  var root=document.getElementById('mcqRoot');
  if(!root){ try{ mqCert=cert; }catch(_){} if(typeof diagResume==='function') diagResume(); return; }
  try{ mqCert=cert; }catch(_){}
  var n=_ltTotalCount(cert);
  var nm=(typeof certLabel==='function')?certLabel(cert):cert;
  var isGrade=(typeof passRule==='function' && passRule(cert) && passRule(cert).grade);
  var metric=isGrade?'예상 급수':'예상 점수';
  if(!document.getElementById('lthCss')){
    var st=document.createElement('style'); st.id='lthCss';
    st.textContent='.lth-wrap{max-width:420px;margin:0 auto;text-align:center;padding:38px 26px 30px;background:linear-gradient(165deg,#F4F8FF,#EAF1FB);border-radius:18px}'
      +'.lth-badge{display:inline-block;background:#FFE9B8;color:#9A6800;font-size:12px;font-weight:800;padding:6px 14px;border-radius:999px;margin-bottom:18px}'
      +'.lth-ttl{font-size:23px;font-weight:900;color:#1F2937;line-height:1.32;margin-bottom:12px}.lth-hl{color:#185FA5}'
      +'.lth-desc{font-size:13.5px;color:#6B7280;line-height:1.6;margin-bottom:8px}'
      +'.lth-free{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin:14px 0 26px}'
      +'.lth-free span{background:#fff;border:1px solid #DCE6F2;color:#3E5168;font-size:11.5px;font-weight:700;padding:6px 11px;border-radius:9px}'
      +'.lth-cta{width:100%;background:linear-gradient(135deg,#185FA5,#0C447C);color:#fff;border:none;border-radius:14px;padding:16px;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 6px 18px rgba(24,95,165,.32)}'
      +'.lth-note{font-size:11.5px;color:#9AA1AD;margin-top:12px}'
      +'.lt-nav{display:flex;align-items:center;gap:6px;max-width:420px;margin:0 auto 10px;padding:2px}.lt-nav-back{border:none;background:none;font-size:22px;color:#0C447C;cursor:pointer;padding:0 6px;line-height:1}.lt-nav>span{font-size:15px;font-weight:800;color:#1F2937}';
    document.head.appendChild(st);
  }
  root.innerHTML='<div class="lt-nav"><button class="lt-nav-back" onclick="goHome()" aria-label="홈">←</button><span>레벨테스트</span></div>'
    +'<div class="lth-wrap">'
    +'<div class="lth-badge">🎁 100% 무료 · 가입 없이 바로</div>'
    +'<div class="lth-ttl">'+mqEsc(nm)+'<br><span class="lth-hl">무료 레벨테스트</span></div>'
    +'<div class="lth-desc">'+n+'문제로 내 실력과 <b>'+metric+'</b>을<br>3분 만에 확인해보세요.</div>'
    +'<div class="lth-free"><span>✓ 결제 없음</span><span>✓ 가입 없이 시작</span><span>✓ 예상점수</span></div>'
    +'<button class="lth-cta" onclick="_ltHookStart()">무료로 시작하기 →</button>'
    +'<div class="lth-note">문제를 다 풀면 '+metric+'·약점 결과를 드려요</div>'
  +'</div>';
  window.scrollTo(0,0);
}
async function _ltHookStart(){
  var cert=mqCert;
  // 누르는 즉시 로딩 화면 전환(갇힘 방지) — 로드 완료 여부와 무관하게 항상 표시
  var root=document.getElementById('mcqRoot'); if(root) root.innerHTML='<div class="loading" style="padding:48px 16px;text-align:center;color:#0C447C;font-weight:600">문제 준비 중…</div>';
  if(typeof loadedExams!=='undefined' && cert && !loadedExams[cert]){
    try{ await loadExam(cert); }catch(_){}
  }
  if(typeof diagResume==='function') diagResume(); else if(typeof startDiagnostic==='function') startDiagnostic();
}
async function _ltResumeAfterLogin(){
  try{
    if(!currentUser) return;
    // 게스트가 레벨테스트 도중 10문제에서 막혀 로그인 → 같은 세션 이어풀기(확정 아님)
    if(typeof mqDiag!=='undefined' && mqDiag && typeof mqScreen!=='undefined' && mqScreen==='exam' && typeof mqList!=='undefined' && mqList && mqList.length && (Object.keys(mqAns||{}).length < mqList.length)){
      try{ if(typeof hideLoginPopup==='function') hideLoginPopup(); }catch(_){}
      if(typeof renderMCQ==='function') renderMCQ();
      try{ window.scrollTo(0,0); }catch(_){}
      return;
    }
    var p=_ltPending;
    if(!p || !p.qs || !p.qs.length){
      var raw=null; try{ raw=localStorage.getItem('certlab_lt_pending'); }catch(_){}
      if(raw){ var j=JSON.parse(raw);
        if(j && j.cert && (Date.now()-(j.at||0) < 7*86400000)){
          var qs=(mqResultQs && mqResultQs.length)? mqResultQs.slice() : await _ltReconstructQs(j.cert, j.ids||[]);
          if(qs && qs.length) p={cert:j.cert, qs:qs, ans:j.ans||{}};
        }
      }
    }
    if(!p || !p.qs || !p.qs.length) return;
    if(typeof ltFinalize==='function') ltFinalize(p.cert, p.qs, p.ans);
    if(typeof saveUserData==='function') saveUserData();
    _ltPending=null; try{ localStorage.removeItem('certlab_lt_pending'); }catch(_){}
    if(mqResultMeta && mqResultMeta.levelTest){ mqScreen='result'; renderMqResultScreen(); }   // 방금 푼 직후 → 결과 화면
    else if(typeof enterCert==='function'){ enterCert(p.cert); }                                // 재방문 로그인 → 시험 대시보드(예상점수)
    window.scrollTo(0,0);
  }catch(e){ console.error('lt resume', e); }
}
// 레벨 테스트 완료 처리: 과목별 채점 → 점수 → 그 과목 전 토픽 균일 시드 + 완료 플래그
function ltFinalize(cert, qs, ans){
  try{
    if(typeof eloState==='undefined') return;
    if(!eloState._levelTest) eloState._levelTest={};
    var bySub={};
    qs.forEach(function(q){ var cs=(typeof MCQ_QID2CS!=='undefined')&&MCQ_QID2CS[q.id]; var sub=(cs&&cs.sub)||q._subjCode||q._subj; if(!sub) return; (bySub[sub]=bySub[sub]||[]).push(q); });
    var summary={};
    Object.keys(bySub).forEach(function(sub){
      var r=_ltSubjectScore(cert, sub, bySub[sub], ans); if(!r) return;
      summary[sub]=r;
      var topics=Object.keys(topicNameMap(cert,sub));   // 회계 topics[]·비회계 진단/맵 합성 모두 커버
      if(topics.length){                          // 적응형 데이터 있으면 전 토픽 균일 시드
        var k=cert+'|'+sub; if(!eloState[k]) eloState[k]={};
        topics.forEach(function(tc){ if(!eloState[k][tc]) eloState[k][tc]={score:r.score, attempts:0, seeded:true, ts:Date.now()}; });
      }
    });
    eloState._levelTest[cert]={at:Date.now(), summary:summary};
    if(typeof saveUserData==='function' && currentUser) saveUserData();
  }catch(e){}
}
// B2 게이트: 생체 제외 전 시험, 레벨테스트 미완료면 기출 진입 차단
function ltDone(cert){ return !!(typeof eloState!=='undefined' && eloState._levelTest && eloState._levelTest[cert]); }
// 그 시험에 레벨업(adaptive) 데이터가 실제 로드됐는지 — 없는 시험(공인중개사 등)은 레벨업 UI·게이트 전부 미적용
function adHasData(cert){
  try{
    if(typeof AD_DATA==='undefined') return false;
    var subs=(typeof qbOf==='function')?Object.keys(qbOf(cert)||{}):[];
    for(var i=0;i<subs.length;i++){
      var b=AD_DATA[cert+'|'+subs[i]];
      if(b && ((b.map&&b.map.mapping&&b.map.mapping.length) || (b.variantPool&&b.variantPool.length))) return true;
    }
  }catch(e){}
  return false;
}
function ltGated(cert){ return cert!=='bodybuilding' && adHasData(cert) && !ltDone(cert); }
// 레벨테스트 결과: 과목별 레벨 카드
function _ltResultHTML(M){
  try{
    var rec=(typeof eloState!=='undefined'&&eloState._levelTest&&eloState._levelTest[M.cert]); if(!rec||!rec.summary) return '';
    var qb=(typeof qbOf==='function')?qbOf(M.cert):{};
    var LVC={1:'#E24B4A',2:'#E0813A',3:'#E0A52E',4:'#5AA86B',5:'#2E9B5E'};
    var rows=Object.keys(rec.summary).map(function(sub){
      var r=rec.summary[sub]; var nm=(qb[sub]&&qb[sub].name)||sub; var lv=r.level||3;
      return '<div style="display:flex;align-items:center;gap:8px;padding:7px 12px;border-bottom:1px solid #EFE9E1">'
        +'<span style="flex:1;font-weight:600;color:#4A4036">'+mqEsc(nm)+'</span>'
        +'<span style="font-weight:700;color:'+(LVC[lv]||'#E0A52E')+'">Lv '+lv+'</span>'
        +'<span style="font-size:12px;color:#A89C8E;min-width:34px;text-align:right">'+r.correct+'/'+r.n+'</span></div>';
    }).join('');
    if(!rows) return '';
    var scoreHTML='';
    try{
      var ap=(typeof adPredicted==='function')?adPredicted(M.cert):null;
      if(ap){
        var v=(typeof adVerdict==='function')?adVerdict(M.cert,ap):null;
        var col=(v&&v.color)||'#0C447C';
        var pred=(ap.predicted==null)?'--':ap.predicted;
        var lbl=(v&&v.label)?v.label:'';
        scoreHTML='<div style="text-align:center;padding:14px 12px;background:#F4F8FC;border-bottom:1px solid #E3EDF7">'
          +'<div style="font-size:12.5px;color:#6B7C8F;font-weight:700">예상 점수</div>'
          +'<div style="font-size:40px;font-weight:800;color:'+col+';line-height:1.1;margin:2px 0">'+pred+'<span style="font-size:16px;font-weight:700">점</span></div>'
          +(lbl?'<div style="font-size:13px;font-weight:700;color:'+col+'">'+lbl+'</div>':'')
          +((typeof _luGaugeHTML==='function'&&v&&ap.predicted!=null)?_luGaugeHTML(M.cert,ap,v):'')
          +'</div>';
      }
    }catch(e){}
    return '<div style="margin:14px 0;border:1px solid #EFE9E1;border-radius:12px;overflow:hidden;background:#FCFAF6">'
      +scoreHTML
      +'<div style="padding:8px 12px;font-weight:700;color:#6B5E4F;background:#F5F0E8">과목별 시작 레벨</div>'+rows
      +'<div style="padding:8px 12px;font-size:12px;color:#A89C8E">레벨은 시작점이에요. 문제를 풀면 단원별로 조정됩니다.</div></div>';
  }catch(e){ return ''; }
}
function ltGate(cert){
  if(!ltGated(cert)) return false;
  _ltShowGateModal(cert);
  return true;   // 레벨 테스트 필수 — 미완료면 진입 차단
}
function _ltCloseGate(){ var e=document.getElementById('ltGatePopup'); if(e) e.classList.add('hidden'); }
function _ltGateGo(){ _ltCloseGate(); if(typeof diagResume==='function') diagResume(); }
function _ltShowGateModal(cert){
  var per=(typeof _ltPerSubject!=='undefined')?_ltPerSubject(cert):10;
  var p=document.getElementById('ltGatePopup');
  if(!p){
    p=document.createElement('div');
    p.className='auth-popup hidden'; p.id='ltGatePopup';
    p.innerHTML='<div class="auth-sheet" style="text-align:center;max-width:340px">'
      +'<button class="popup-x" onclick="_ltCloseGate()" aria-label="닫기">✕</button>'
      +'<div style="font-size:36px;line-height:1;margin:6px 0 2px">🎯</div>'
      +'<div class="auth-sheet-title">레벨 테스트가 필요해요</div>'
      +'<div class="auth-sheet-sub">먼저 레벨 테스트로 약점을 측정해야 맞춤 학습이 시작돼요.<br><span style="color:#8A7D6E;font-size:12px">한 번만 · 이어풀기 가능</span></div>'
      +'<button class="btn-google-login" onclick="_ltGateGo()" style="text-decoration:none;justify-content:center;background:linear-gradient(135deg,#185FA5,#0C447C);color:#fff;border:none;width:100%">레벨 테스트 하러가기</button>'
      +'</div>';
    document.body.appendChild(p);
    p.addEventListener('click', function(e){ if(e.target===p) _ltCloseGate(); });
  }
  p.classList.remove('hidden');
}
// ===== 4-b 레벨업 문제풀기 (연속 5문제 라운드 · 약점매칭 · 기출+변형) =====
var mqLevelUp=false, luSubIdx=0, luSeen={}, luPreScores={}, luCurSub='', luLockSub='', luLockTopic='', LU_ROUND=5, luCardOpen={};
var _luRelearn={};   // (C안) 이번 라운드 재출제(전에 푼 적 있는) 문항 id → 🔁 복습 뱃지
var _qCtxTNM={};     // [2026-07-20] 문제 상단 컨텍스트용 topicNameMap 캐시 (cert|sub → map)
function topicNameMap(cert,sub){
  var b=(typeof AD_DATA!=='undefined')&&AD_DATA[cert+'|'+sub], m={};
  if(!b) return m;
  if(b.diag && b.diag.topics){ b.diag.topics.forEach(function(t){ if(t.code) m[t.code]={name:t.name||t.code, mode:t.mode}; }); }   // 회계형
  function add(tc){ if(tc && !m[tc]) m[tc]={name:tc, mode:undefined}; }                                                              // 토픽목록 보강
  if(b.diag && b.diag.diagnostic) b.diag.diagnostic.forEach(function(r){ add(r.topic); });
  if(b.map && b.map.mapping) b.map.mapping.forEach(function(r){ add(r.topic); });
  if(b.lookup){ for(var qid in b.lookup){ add(b.lookup[qid].topic); } }
  if(b.variantPool) b.variantPool.forEach(function(q){ if(q && q.topic && q._topicName && m[q.topic] && m[q.topic].name===q.topic) m[q.topic].name=q._topicName; });   // 이름 보강(변형 _topicName)
  return m;
}
function luRecentSeen(cert,sub){ var seen={}; try{ var qb=qbOf(cert)[sub]; if(qb) qb.sets.forEach(function(st){ st.questions.forEach(function(q){ var p=(typeof srGetK==='function')&&srGetK(cert,q.id); if(p&&p.rc>0) seen[q.id]=true; }); }); }catch(e){} return seen; }
function luBuildPool(cert,sub){ var pool=[], byId={}, seenQ={}; try{
    function _qkey(q){ return String((q&&q.q)||'').replace(/<[^>]+>/g,'').replace(/\s+/g,'').slice(0,200); }  // 내용 기준 중복 판별
    var qb=qbOf(cert)[sub];
    if(qb) qb.sets.forEach(function(st){ st.questions.forEach(function(q){ if(!mqHasAnswer(q)) return; var info=(typeof adLookup==='function')&&adLookup(cert,sub,q.id); if(!info||!info.topic||!info.diff) return; q._subj=sub; pool.push({id:q.id, topic:info.topic, level:info.diff, subtopic:info.subtopic||null, _q:q}); byId[q.id]=true; seenQ[_qkey(q)]=1; }); });
    var b=(typeof AD_DATA!=='undefined')&&AD_DATA[cert+'|'+sub]; var vp=(b&&b.variantPool)||[];
    vp.forEach(function(v){ if(!v||!v.id||byId[v.id]||!v.topic||!v.diff) return; if(seenQ[_qkey(v)]) return; v._subj=sub; pool.push({id:v.id, topic:v.topic, level:v.diff, subtopic:v.subtopic||null, _q:v}); byId[v.id]=true; seenQ[_qkey(v)]=1; });
    var tmpls=(b&&b.calcTemplates)||[];   // 계산형 자동생성: 템플릿×밴드당 fresh seed 인스턴스 편입
    tmpls.forEach(function(tm){ if(!tm||!tm.id||!tm.topic) return; var bands=Array.isArray(tm.diff)?tm.diff:[tm.diff];
      bands.forEach(function(bd){ var made=0, tries=0;
        while(made<CALC_PER_BAND && tries<CALC_PER_BAND*10){ tries++;   // 같은 파라미터(동일 문항)면 다른 seed로 재시도 → 서로 다른 인스턴스만 편입
          var seed=(Math.floor(Math.random()*4294967296))>>>0;
          var inst=genCalcValid(Object.assign({}, tm, {_diff:bd}), seed, 40);
          if(!inst || byId[inst.id]) continue;
          var _ik=_qkey(inst); if(seenQ[_ik]) continue;   // 내용 중복 제거(기출·변형·다른 인스턴스와 동일 문항 방지)
          inst._subj=sub; pool.push({id:inst.id, topic:inst.topic, level:bd, subtopic:inst.subtopic||null, _q:inst}); byId[inst.id]=true; seenQ[_ik]=1; made++;
        } });
    });
  }catch(e){} return pool; }
/* ===== 예상점수 감가상각: 단원을 안 푼 지 오래되면 점수가 서서히 내려간다 =====
   - 마지막 풀이 후 7일(GRACE)은 유지 → 이후 하루 0.5점씩, 최대 15점까지 하락
   - 그 단원을 다시 풀면 감가가 반영된 점수에서 Elo 재수렴(한 문제로 원상복구 안 됨)
   - ts 없는 기존 데이터는 첫 조회 시점부터 감가 시작(배포 직후 점수 급락 방지) */
var ELO_DECAY_GRACE_MS=7*86400000, ELO_DECAY_PER_DAY=0.5, ELO_DECAY_CAP=15;
function _eloDecayAmt(ent){ try{ if(!ent||typeof ent.score!=='number') return 0; if(!ent.ts){ ent.ts=Date.now(); return 0; } var idle=Date.now()-ent.ts-ELO_DECAY_GRACE_MS; if(idle<=0) return 0; return Math.min(ELO_DECAY_CAP, (idle/86400000)*ELO_DECAY_PER_DAY); }catch(_){ return 0; } }
function _eloScoreOf(ent){ if(!ent||typeof ent.score!=='number') return null; return Math.max(0, ent.score-_eloDecayAmt(ent)); }
function luTopicScores(cert,sub){ var k=cert+'|'+sub, st=(typeof eloState!=='undefined'&&eloState[k])||{}, out={}; for(var t in st){ if(t.charAt(0)==='_') continue; var v=_eloScoreOf(st[t]); if(v!=null) out[t]=v; } return out; }
function startLevelUp(){ var cert=mqCert; if(ltGate(cert)) return; if(cert==='sport2' && !_sp2Get()){ _sp2OpenPicker(function(){ startLevelUp(); }); return; } mqStopTimer(); mqStopOverTimer(); mqLevelUp=true; mqReview=false; mqDiag=false; mqInReview=false; mqConcept=false; mqGather=false; mqLevelTest=false; luLockSub=''; luLockTopic=''; if(luHasResume(cert)){ luResumeApply(cert); return; } luSubIdx=0; luSeen={}; luSessTotal=0; luSessCorrect=0; luSessChanges={}; _luEloSA={}; luSessPredStart=_luPredScore(cert); luLoadRound(true); }
function luStartSub(sub){ var cert=mqCert; if(ltGate(cert)) return; if(!sub) return; if(cert==='sport2' && !_sp2Get()){ _sp2OpenPicker(function(){ luStartSub(sub); }); return; } mqStopTimer(); mqStopOverTimer(); mqLevelUp=true; mqReview=false; mqDiag=false; mqInReview=false; mqConcept=false; mqGather=false; mqLevelTest=false; luLockSub=sub; luLockTopic=''; luSubIdx=0; luSeen={}; luSessTotal=0; luSessCorrect=0; luSessChanges={}; _luEloSA={}; luSessPredStart=_luPredScore(cert); luLoadRound(true); }
// 단원(상세 분류) 고정: 그 단원 문제만 5개씩 레벨업
function luStartTopic(sub, tcode){ var cert=mqCert; if(ltGate(cert)) return; if(!sub||!tcode) return; if(cert==='sport2' && !_sp2Get()){ _sp2OpenPicker(function(){ luStartTopic(sub,tcode); }); return; } mqStopTimer(); mqStopOverTimer(); mqLevelUp=true; mqReview=false; mqDiag=false; mqInReview=false; mqConcept=false; mqGather=false; mqLevelTest=false; luLockSub=sub; luLockTopic=tcode; luSubIdx=0; luSeen={}; luSessTotal=0; luSessCorrect=0; luSessChanges={}; _luEloSA={}; luSessPredStart=_luPredScore(cert); luLoadRound(true); }
function luLoadRound(first){
  if(first){ luCombo=0; luComboJustUp=false; }   // 레벨업 세션 시작 시 콤보 리셋(라운드 넘어가도 연속은 이어짐)
  luRoundMaxCombo=luCombo;                        // 이번 라운드 최고 콤보(이월된 콤보부터)
  var cert=mqCert, order=(typeof curOrder==='function')?curOrder():Object.keys(qbOf(cert));
  if(luLockSub){ order=[luLockSub]; }   // 과목 고정 모드: 잠긴 과목만 출제
  if(!order.length){ luFinish('과목이 없습니다.'); return; }
  var picked=null, tries=0, k;
  while(tries<order.length){
    var sub=order[luSubIdx % order.length];
    var poolAll=luBuildPool(cert,sub);
    var pool=poolAll;
    if(luLockTopic){ pool=poolAll.filter(function(p){ return p.topic===luLockTopic; }); }   // 단원 고정: 그 단원 문제 우선
    var seen={}; for(k in luSeen) seen[k]=true; var rec=luRecentSeen(cert,sub); for(k in rec) seen[k]=true;
    var scores=luTopicScores(cert,sub);
    var res={items:[]};
    if(pool.length){
      res=SEL.selectQuestions(scores, pool, LU_ROUND, {seen:seen});
      if(!res.items.length){ var seen2={}; for(k in luSeen) seen2[k]=true; res=SEL.selectQuestions(scores, pool, LU_ROUND, {seen:seen2}); }
    }
    if(luLockTopic && res.items.length<LU_ROUND && poolAll.length){   // 단원 문제 부족 → 같은 과목의 다음 약한 단원 포함해 5문제 채움(약한 단원 우선 선정)
      var got={}; res.items.forEach(function(it){ got[it.id]=true; });
      var sf={}; for(k in seen) sf[k]=true; for(k in got) sf[k]=true;
      var fill=SEL.selectQuestions(scores, poolAll, LU_ROUND-res.items.length, {seen:sf});
      if(!fill.items.length){ var sf2={}; for(k in luSeen) sf2[k]=true; for(k in got) sf2[k]=true; fill=SEL.selectQuestions(scores, poolAll, LU_ROUND-res.items.length, {seen:sf2}); }
      res.items=res.items.concat(fill.items);
    }
    if(res.items.length && res.items.length<LU_ROUND){   // (C안) 새 문제 부족 → 이미 푼 문제 재출제로 5문제 보장(복습 뱃지 표시, Elo는 하루1회 게이트라 중복반영 없음)
      var gotR={}; res.items.forEach(function(it){ gotR[it.id]=true; });
      var seenR={}; for(k in luSeen) seenR[k]=true; for(k in gotR) seenR[k]=true;   // 1차: 이번 세션에 안 나온 문제부터(푼 적 있어도 OK)
      var fillR=SEL.selectQuestions(scores, pool, LU_ROUND-res.items.length, {seen:seenR});
      fillR.items.forEach(function(it){ gotR[it.id]=true; });
      res.items=res.items.concat(fillR.items);
      if(res.items.length<LU_ROUND && poolAll.length>pool.length){   // 단원 고정 풀도 바닥이면 과목 전체에서
        var seenR2={}; for(k in luSeen) seenR2[k]=true; for(k in gotR) seenR2[k]=true;
        var fillR2=SEL.selectQuestions(scores, poolAll, LU_ROUND-res.items.length, {seen:seenR2});
        fillR2.items.forEach(function(it){ gotR[it.id]=true; });
        res.items=res.items.concat(fillR2.items);
      }
      if(res.items.length<LU_ROUND){   // 2차(최후): 이번 세션 재출제까지 허용(이번 라운드 중복만 제외)
        var fillR3=SEL.selectQuestions(scores, (poolAll.length>pool.length?poolAll:pool), LU_ROUND-res.items.length, {seen:gotR});
        res.items=res.items.concat(fillR3.items);
      }
    }
    if(res.items.length){ picked={sub:sub, items:res.items}; break; }
    luSubIdx=(luSubIdx+1)%order.length; tries++;
  }
  if(!picked){ luFinish(luLockSub?'이 과목은 풀 수 있는 문제를 모두 푸셨어요! 👍':'풀 수 있는 문제를 모두 푸셨어요! 👍'); return; }
  _luRoundRecRef=null;   // 새 라운드 → 기록은 새로 생성
  luPreScores={}; var sc=luTopicScores(cert, picked.sub); for(var t in sc) luPreScores[t]=sc[t];
  luCurSub=picked.sub;
  var list=picked.items.map(function(it){ luSeen[it.id]=true; return it._q; });
  _luRelearn={}; try{ list.forEach(function(q){ var p=(typeof srGetK==='function')&&srGetK(cert,q.id); if(p&&p.rc>0) _luRelearn[q.id]=1; }); }catch(_){}   // (C안) 전에 푼 적 있는 문항 → 🔁 복습 뱃지
  mqOXClearList(list);   // 새 라운드에 재출제된 문항의 이전 O/X 해제
  mqSub=picked.sub; mqSet=0; mqMode='levelup'; mqShow={}; mqGuess={}; mqAns={}; mqIdx=0;
  mqList=list; mqTimeLeft=_sessionSecs(list, mqCert);
  mqScreen='exam'; luResumeSave(); renderMCQ(); mqStartTimer(); window.scrollTo(0,0);
}
function luEndRound(){
  mqStopTimer(); mqStopOverTimer();
  if(currentUser && typeof srFlush==='function') srFlush();
  var cert=mqCert, sub=luCurSub, k=cert+'|'+sub, changes=[];
  var qs=(mqList||[]).slice(), correct=0, total=qs.length;
  qs.forEach(function(q){ if(mqAns[q.id]!==undefined && mqCorrect(q,mqAns[q.id])) correct++; });
  try{
    var now=(typeof eloState!=='undefined'&&eloState[k])||{};
    var nm=(qbOf(cert)[sub]&&qbOf(cert)[sub].name)||sub, tmap=topicNameMap(cert,sub);
    for(var t in now){ if(t.charAt(0)==='_') continue; var before=luPreScores[t]; if(before==null) continue; var lb=AE.scoreToLevel(before), la=AE.scoreToLevel(_eloScoreOf(now[t])); if(la!==lb) changes.push({sub:nm, subCode:sub, tcode:t, topic:(tmap[t]&&tmap[t].name)||t, from:lb, to:la, up:la>lb}); }
  }catch(e){}
  // 세션 누적
  luSessTotal+=total; luSessCorrect+=correct;
  changes.forEach(function(c){ var prev=luSessChanges[c.tcode]; luSessChanges[c.tcode]={subName:c.sub, topic:c.topic, from:(prev?prev.from:c.from), to:c.to}; });
  // 기록 1줄
  var subName=(qbOf(cert)[sub]&&qbOf(cert)[sub].name)||sub;
  var chgMain=changes.length?(changes.filter(function(c){return c.up;})[0]||changes[0]):null;
  var topName='';
  try{ var fq=qs[0]; var tp=fq&&fq.topic; if(!tp){ var info=(typeof adLookup==='function')&&adLookup(cert,sub,fq&&fq.id); tp=info&&info.topic; } var tm2=topicNameMap(cert,sub); topName=(tp&&tm2[tp]&&tm2[tp].name)||''; }catch(e){}
  luHistAdd(cert, { ts:Date.now(), sub:sub, subName:subName, topic:(chgMain?chgMain.topic:topName), correct:correct, total:total, qids:qs.map(function(q){return q.id;}), ans:Object.assign({},mqAns), chg:(chgMain?{from:chgMain.from,to:chgMain.to,up:chgMain.up}:null) });
  luSubIdx=(luSubIdx+1);
  _luRound={correct:correct, total:total, changes:changes, qs:qs, ans:Object.assign({},mqAns), subName:subName};
  luResumeSave();
  mqScreen='luround'; renderMCQ(); window.scrollTo(0,0);
}
// 토픽에 개념학습(exp.learn) 보유 문항이 있으면 그 위치 반환 — [개념 다지기] 가드
function _luTopicConceptLoc(cert, sub, tcode){
  try{
    var qb=qbOf(cert)[sub]; if(!qb||!qb.sets) return null;
    for(var si=0; si<qb.sets.length; si++){
      var qs=qb.sets[si].questions||[];
      for(var i=0;i<qs.length;i++){
        var q=qs[i]; var L=q.exp&&q.exp.learn;
        if(!(L&&(L.title||L.sum||(Array.isArray(L.secs)&&L.secs.length)))) continue;
        var tp=q.topic; if(!tp){ var info=(typeof adLookup==='function')&&adLookup(cert,sub,q.id); tp=info&&info.topic; }
        if(tp===tcode) return {si:si, idx:i};
      }
    }
  }catch(e){}
  return null;
}
function _luToConcept(sub,si,idx){ mqLevelUp=false; startConceptStudy(sub,si,idx); }
function luRenderPopup(changes){
  var up=changes.filter(function(c){return c.up;}), main=up.length?up[0]:changes[0];
  var root=document.getElementById('mcqRoot'); if(!root){ luLoadRound(false); return; }
  var col=main.up?'#2E9B5E':'#946200', em=main.up?'🎉':'💪', ti=main.up?'레벨 업!':'아쉬웠어요';
  var chg='<div style="font-size:15px;font-weight:800;color:'+col+';margin:12px 0 4px">'+mqEsc(main.sub)+' · '+mqEsc(main.topic)+'  Lv'+main.from+' → Lv'+main.to+'</div>';
  var more=changes.length-1, extra=more>0?'<div style="font-size:12px;color:#8A7D6E;margin-top:4px">그 외 '+more+'개 단원도 변동됐어요</div>':'';
  var desc=main.up?'약했던 단원이 한 단계 올라갔어요.':'다지면 다시 올라가요.';
  // 보조 버튼: 업=결과보기 / 다운=개념 다지기(그 토픽 개념 데이터 있을 때만)
  var side='';
  if(main.up){
    side='<button onclick="luFinish(\'\')" style="flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:800;border:none;background:#F1F5F9;color:#475569;cursor:pointer">결과 보기</button>';
  } else {
    var loc=_luTopicConceptLoc(mqCert, main.subCode, main.tcode);
    if(loc) side='<button onclick="_luToConcept(\''+main.subCode+'\','+loc.si+','+loc.idx+')" style="flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:800;border:none;background:#FFF4E0;color:#92600C;cursor:pointer">📖 개념 다지기</button>';
  }
  root.innerHTML='<div class="mcq-result" style="text-align:center;padding:30px 20px"><div style="font-size:42px">'+em+'</div><div style="font-size:19px;font-weight:800;margin:8px 0 4px">'+ti+'</div>'+chg+'<div style="font-size:13.5px;color:#5F5E5A">'+desc+'</div>'+extra+'<div style="display:flex;gap:8px;margin-top:20px;max-width:320px;margin-left:auto;margin-right:auto">'+side+'<button onclick="luLoadRound(false)" style="flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:800;border:none;background:#0C447C;color:#fff;cursor:pointer">계속 풀기</button></div></div>';
  window.scrollTo(0,0);
}
function _infoModal(html){
  return new Promise(function(res){
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:24px';
    ov.innerHTML='<div style="background:#fff;border-radius:18px;max-width:340px;width:100%;padding:24px 22px;text-align:center;box-shadow:0 16px 44px rgba(0,0,0,.25)">'+html+'<button style="margin-top:16px;width:100%;padding:13px;background:linear-gradient(135deg,#1D9E75,#0C447C);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">확인</button></div>';
    ov.querySelector('button').onclick=function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); res(); };
    document.body.appendChild(ov);
  });
}
async function _eloInfoPopups(qs, wasTimeUp){
  try{
    var t=_todayKST();
    var sawExp=false;
    (qs||[]).forEach(function(q){ if(q&&q.id&&typeof eloState!=='undefined'&&eloState&&eloState._expSeen&&eloState._expSeen[mqCert+'|'+q.id]===t) sawExp=true; });
    if(sawExp && !localStorage.getItem('certlab_info_expElo')){
      try{ localStorage.setItem('certlab_info_expElo','1'); }catch(_){}
      await _infoModal('<div style="font-size:34px;margin-bottom:8px">📖</div><div style="font-size:15.5px;font-weight:800;color:#0C447C;margin-bottom:8px">해설을 먼저 본 문제예요</div><div style="font-size:13px;color:#3A4A5E;line-height:1.75">정답을 보고 푼 문제는 <b>오답으로 처리</b>돼요.<br>레벨이 내려가고 복습에 다시 나옵니다.<br>먼저 풀고 나서 해설을 보면 정상 반영돼요!</div>');
    }
    var hadUnans=false;
    (qs||[]).forEach(function(q){ if(q&&q.id&&mqResultAns[q.id]===undefined) hadUnans=true; });
    if(wasTimeUp && hadUnans && !localStorage.getItem('certlab_info_timeoutElo')){
      try{ localStorage.setItem('certlab_info_timeoutElo','1'); }catch(_){}
      await _infoModal('<div style="font-size:34px;margin-bottom:8px">⏰</div><div style="font-size:15.5px;font-weight:800;color:#0C447C;margin-bottom:8px">시간 안에 못 푼 문제</div><div style="font-size:13px;color:#3A4A5E;line-height:1.75">시간 안에 못 푼 문제는 <b>오답으로 처리</b>돼요.<br>다음엔 시간 안에 도전해봐요!</div>');
    }
  }catch(_){}
}
function _luToast(msg){
  if(!msg) return;
  var t=document.createElement('div');
  t.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;background:#2C2C2A;color:#fff;padding:15px 22px;border-radius:14px;font-size:14px;font-weight:700;max-width:300px;text-align:center;line-height:1.55;box-shadow:0 10px 34px rgba(0,0,0,.3)';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.style.transition='opacity .4s'; t.style.opacity='0'; setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); },420); }, 2300);
}
function luFinish(msg){ mqLevelUp=false; mqStopTimer(); mqStopOverTimer(); if(currentUser && typeof srFlush==='function') srFlush(); luResumeClear(mqCert); _luRound=null; mqScreen='home'; mqList=null; renderMCQ(); if(msg) setTimeout(function(){ _luToast(msg); },80); }

// ===== 레벨업: 라운드 기록 + 정밀 이어풀기 + 세션 =====
var luHistAll={}, luResumeAll={}, _luHistLoaded=false, LU_HIST_DAYS=30, luHistView='date';
var luSessTotal=0, luSessCorrect=0, luSessChanges={}, luSessPredStart=null, _luRound=null, _luReviewReturn=null, _luEloSA={};
var luCombo=0, luRoundMaxCombo=0, luComboJustUp=false;   // 게이미피케이션: 연속정답 콤보(세션 누적)·라운드 최고콤보
function _luComboPin(){ if(!(typeof mqLevelUp!=='undefined' && mqLevelUp) || luCombo<3) return ''; var p='<span class="lu-combo'+(luComboJustUp?' pop':'')+'">\uD83D\uDD25 '+luCombo+'\uC5F0\uC18D</span>'; luComboJustUp=false; return p; }
function _luTierName(lv){ return ['','\uC785\uBB38','\uCD08\uAE09','\uC911\uAE09','\uC219\uB828','\uACE0\uC218'][lv]||''; }
function luHistEnsure(){ if(_luHistLoaded) return; _luHistLoaded=true; try{ luHistAll=JSON.parse(localStorage.getItem('certlab_luhist')||'{}')||{}; }catch(_){ luHistAll={}; } try{ luResumeAll=JSON.parse(localStorage.getItem('certlab_luresume')||'{}')||{}; }catch(_){ luResumeAll={}; } }
function luHistSaveLocal(){ try{ localStorage.setItem('certlab_luhist', JSON.stringify(luHistAll)); }catch(_){} try{ localStorage.setItem('certlab_luresume', JSON.stringify(luResumeAll)); }catch(_){} }
function luHistPrune(cert){ var arr=luHistAll[cert]||[]; var cut=Date.now()-LU_HIST_DAYS*864e5; luHistAll[cert]=arr.filter(function(r){ return (r&&r.ts||0)>=cut; }); }
function luHistList(cert){ luHistEnsure(); var arr=(luHistAll[cert]||[]).slice(); arr.sort(function(a,b){ return (b.ts||0)-(a.ts||0); }); return arr; }
function luHistAdd(cert, rec){ luHistEnsure(); if(!luHistAll[cert]) luHistAll[cert]=[]; luHistAll[cert].push(rec); luHistPrune(cert); luHistSaveLocal(); if(currentUser && typeof saveUserData==='function') saveUserData(); }
function luHasResume(cert){ luHistEnsure(); var r=luResumeAll[cert]; return !!(r && r.qids && r.qids.length); }
function luResumeClear(cert){ luHistEnsure(); if(luResumeAll[cert]){ delete luResumeAll[cert]; luHistSaveLocal(); if(currentUser && typeof saveUserData==='function') saveUserData(); } }
function _luPredScore(cert){ try{ var ap=adPredicted(cert); return ap?ap.predicted:null; }catch(_){ return null; } }
function _luFindQ(cert, id){
  if(typeof id==='string' && id.indexOf('calc:')===0){ return _calcFromId(cert, id); }
  var qb=qbOf(cert), found=null;
  Object.keys(qb).some(function(sub){ return (qb[sub].sets||[]).some(function(st){ return (st.questions||[]).some(function(q){ if(q&&q.id===id){ found=q; return true;} return false; }); }); });
  if(found) return found;
  Object.keys(qb).some(function(sub){ try{ var b=(typeof AD_DATA!=='undefined')&&AD_DATA[cert+'|'+sub]; var vp=(b&&b.variantPool)||[]; return vp.some(function(v){ if(v&&v.id===id){ found=v; return true;} return false; }); }catch(e){ return false; } });
  return found; }
function _luQLabel(q){ try{ var s=(q&&q.q)?String(q.q).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim():''; return s?(s.length>30?s.slice(0,30)+'…':s):(q&&q.id||''); }catch(_){ return (q&&q.id)||''; } }
function luResumeSave(){ if(!mqLevelUp) return; luHistEnsure();
  try{ var qids=(mqList||[]).map(function(q){ return q&&q.id; }).filter(Boolean);
    if(!qids.length) return;
    luResumeAll[mqCert]={ sub:luCurSub, lockSub:luLockSub, lockTopic:luLockTopic, subName:((qbOf(mqCert)[luCurSub]&&qbOf(mqCert)[luCurSub].name)||luCurSub), qids:qids, ans:Object.assign({},mqAns), guess:Object.assign({},mqGuess), idx:mqIdx, luSubIdx:luSubIdx, luSeen:Object.assign({},luSeen), preScores:Object.assign({},luPreScores), sessTotal:luSessTotal, sessCorrect:luSessCorrect, sessChanges:Object.assign({},luSessChanges), predBefore:luSessPredStart, relearn:Object.keys(_luRelearn||{}), ts:Date.now() };
    luHistSaveLocal(); if(currentUser && typeof saveUserData==='function') saveUserData();
  }catch(_){}
}
function luResumeApply(cert){ var r=luResumeAll[cert];
  if(!r){ luSubIdx=0; luSeen={}; luSessTotal=0; luSessCorrect=0; luSessChanges={}; luSessPredStart=_luPredScore(cert); luLoadRound(true); return; }
  var list=(r.qids||[]).map(function(id){ return _luFindQ(cert,id); }).filter(Boolean);
  luLockSub=r.lockSub||''; luLockTopic=r.lockTopic||''; luSubIdx=r.luSubIdx||0; luSeen=r.luSeen||{}; luSessTotal=r.sessTotal||0; luSessCorrect=r.sessCorrect||0; luSessChanges=r.sessChanges||{}; luSessPredStart=(r.predBefore!=null?r.predBefore:_luPredScore(cert)); luPreScores=r.preScores||{};
  if(list.length!==(r.qids||[]).length || !list.length){ luResumeClear(cert); luLoadRound(false); return; }   // 문항 못 찾으면(데이터 변경 등) 새 라운드로
  luCurSub=r.sub; mqSub=r.sub; mqSet=0; mqMode='levelup';
  _luRelearn={}; (r.relearn||[]).forEach(function(id){ _luRelearn[id]=1; });   // 복습 뱃지 복원
  mqList=list; mqAns=r.ans||{}; mqGuess=r.guess||{}; mqShow={}; mqIdx=Math.min(r.idx||0, list.length-1); mqTimeLeft=_sessionSecs(list, mqCert);
  mqScreen='exam'; renderMCQ(); mqStartTimer(); window.scrollTo(0,0);
}
function luSessionEnd(){ mqStopTimer(); mqStopOverTimer(); if(currentUser && typeof srFlush==='function') srFlush(); luResumeClear(mqCert); mqScreen='lusummary'; renderMCQ(); window.scrollTo(0,0); }
// 라운드 결과 카드
function renderLuRound(root){ var R=_luRound; if(!R){ luLoadRound(false); return; }
  var em=R.correct>=R.total?'🎉':(R.correct>=Math.ceil(R.total*0.6)?'💪':'📚');
  var pct=R.total?Math.round(R.correct/R.total*100):0;
  var chgHTML='';
  if(R.changes && R.changes.length){ var up=R.changes.filter(function(c){return c.up;}); var m=up.length?up[0]:R.changes[0]; var col=m.up?'#2E9B5E':'#946200';
    chgHTML='<div style="background:#fff;border:1px solid #EDE6DD;border-radius:14px;padding:12px 14px;margin:12px 14px 0"><div style="font-size:13.5px;font-weight:800;color:'+col+'">'+(m.up?'🎉 ':'💪 ')+mqEsc(m.topic)+'  Lv'+m.from+' → Lv'+m.to+'</div>'+(R.changes.length>1?'<div style="font-size:12px;color:#8A7D6E;margin-top:3px">그 외 '+(R.changes.length-1)+'개 단원 변동</div>':'')+'<div style="font-size:12px;color:#5F5E5A;margin-top:3px">'+(m.up?'약했던 단원이 한 단계 올라갔어요.':'다지면 다시 올라가요.')+'</div></div>'; }
  var wrong=R.qs.filter(function(q){ return R.ans[q.id]!==undefined && !mqCorrect(q,R.ans[q.id]); });
  var wrongHTML;
  if(wrong.length){ wrongHTML='<div style="background:#fff;border:1px solid #EDE6DD;border-radius:14px;padding:12px 14px;margin:11px 14px 0;text-align:left"><div style="font-size:12.5px;font-weight:800;margin-bottom:6px">틀린 문항 '+wrong.length+'</div>'+wrong.map(function(q){ return '<div style="display:flex;gap:7px;font-size:12.5px;padding:5px 0;border-bottom:1px dashed #EFE7DD"><span style="color:#E24B4A;font-weight:900">✗</span><span>'+mqEsc(_luQLabel(q))+'</span></div>'; }).join('')+'<button onclick="luRoundReview()" style="width:100%;margin-top:9px;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:800;background:#FCEBEA;color:#B5302F;cursor:pointer">틀린 문항 다시보기</button></div>'; }
  else { wrongHTML='<div style="background:#EAF7EF;border:1px solid #BfE6CD;border-radius:14px;padding:14px;margin:11px 14px 0;text-align:center;color:#1E7A45;font-weight:800;font-size:13.5px">모두 맞혔어요! 🎉</div>'; }
  root.innerHTML='<div class="mcq-result" style="padding:24px 0 20px"><div style="text-align:center"><div style="font-size:40px;line-height:1">'+em+'</div>'+
    '<div style="font-size:18px;font-weight:900;margin:6px 0 2px">이번 라운드 '+R.correct+' / '+R.total+'</div>'+
    '<div style="font-size:13px;color:#888780">'+mqEsc(R.subName||'')+' · 정답률 '+pct+'%</div></div>'+
    chgHTML+wrongHTML+
    '<div style="display:flex;flex-direction:column;gap:9px;padding:18px 14px 0"><button onclick="luLoadRound(false)" style="border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:800;background:#0C447C;color:#fff;cursor:pointer">계속 풀기 (다음 5문제)</button>'+
    '<button onclick="luSessionEnd()" style="border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:800;background:#F1F5F9;color:#475569;cursor:pointer">그만하기</button></div></div>';
  window.scrollTo(0,0);
}
function luRoundReview(){ var R=_luRound; if(!R) return; mqResultQs=R.qs.slice(); mqResultAns=Object.assign({},R.ans); _luReviewReturn='luround'; mqOpenReview('wrong',0); }
// 세션 요약
function renderLuSummary(root){ var cert=mqCert;
  var predNow=_luPredScore(cert), predStart=luSessPredStart;
  var pct=luSessTotal?Math.round(luSessCorrect/luSessTotal*100):0;
  var rounds=Math.max(1, Math.round(luSessTotal/LU_ROUND));
  var predHTML='';
  if(predNow!=null){ var arrow=(predStart!=null&&predNow!==predStart)?(' → <span style="color:'+(predNow>predStart?'#2E9B5E':'#946200')+'">'+predNow+'</span>'):''; predHTML='<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #F3EEE7;font-size:14px"><span>예상점수</span><b>'+(predStart!=null?predStart:predNow)+arrow+' 점</b></div>'; }
  var chgKeys=Object.keys(luSessChanges);
  var wrongCnt=Math.max(0, luSessTotal-luSessCorrect);
  var chgHTML='';
  if(chgKeys.length){ chgHTML='<div style="background:#fff;border:1px solid #EDE6DD;border-radius:14px;padding:12px 14px;margin:11px 14px 0;text-align:left"><div style="font-size:12.5px;font-weight:800;margin-bottom:6px">레벨 변동</div>'+
    chgKeys.map(function(k){ var c=luSessChanges[k]; var up=c.to>=c.from; return '<div style="display:flex;gap:7px;font-size:13px;padding:5px 0"><span style="color:'+(up?'#2E9B5E':'#946200')+';font-weight:900">'+(up?'▲':'▼')+'</span><span>'+mqEsc(c.subName||'')+' · '+mqEsc(c.topic||'')+' Lv'+c.from+' → <b>Lv'+c.to+'</b></span></div>'; }).join('')+'</div>'; }
  root.innerHTML='<div class="mcq-result" style="padding:24px 0 20px"><div style="text-align:center"><div style="font-size:40px;line-height:1">🏁</div>'+
    '<div style="font-size:18px;font-weight:900;margin:6px 0 2px">오늘 레벨업 완료</div>'+
    '<div style="font-size:13px;color:#888780;margin-bottom:16px">'+luSessTotal+'문제 풀이</div></div>'+
    '<div class="sc"><div><div class="v ok">'+luSessCorrect+'</div><div class="l">정답</div></div>'+
    '<div><div class="v bad">'+wrongCnt+'</div><div class="l">오답</div></div>'+
    '<div><div class="v">'+pct+'%</div><div class="l">정답률</div></div></div>'+
    '<div style="background:#fff;border:1px solid #EDE6DD;border-radius:14px;padding:6px 14px;margin:0 14px;text-align:left">'+
    '<div style="display:flex;justify-content:space-between;padding:9px 0;'+(predHTML?'border-bottom:1px solid #F3EEE7;':'')+'font-size:14px"><span>푼 문제</span><b>'+luSessTotal+'문제 ('+rounds+'라운드)</b></div>'+
    predHTML+'</div>'+chgHTML+
    '<div style="display:flex;flex-direction:column;gap:9px;padding:18px 14px 0"><button onclick="luLoadRound(false)" style="border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:800;background:#0C447C;color:#fff;cursor:pointer">더 풀기</button>'+
    '<button onclick="luFinish(\'\')" style="border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:800;background:#F1F5F9;color:#475569;cursor:pointer">홈으로</button></div></div>';
  window.scrollTo(0,0);
}
// 기록 페이지
// 레벨업 라운드 후처리: 레벨변동 집계 + 기록 1줄 + 이어풀기 정리 (mqResult에서 호출)
var _luLastSubName='', _luLastChanges=[], _luRoundRecRef=null;
function _luAfterRound(qs, correct){
  var cert=mqCert, sub=luCurSub, k=cert+'|'+sub, changes=[];
  try{
    (qs||[]).forEach(function(q){ try{ if(q && isSA(q) && !_luEloSA[q.id] && mqAns[q.id]!==undefined && saAnswered(q,mqAns[q.id]) && typeof adEloUpdate==='function' && _eloCanApply(mqCert,q)){ adEloUpdate(q, mqCorrect(q,mqAns[q.id])); _eloMarkApplied(mqCert,q); _luEloSA[q.id]=1; } }catch(e){} });   // SA는 mqPick을 안 거치므로 라운드 종료 시 Elo 일괄 반영(중복방지 _luEloSA)
    var now=(typeof eloState!=='undefined'&&eloState[k])||{};
    var tmap=topicNameMap(cert,sub), nm=(qbOf(cert)[sub]&&qbOf(cert)[sub].name)||sub;
    for(var t in now){ if(t.charAt(0)==='_') continue; var before=luPreScores[t]; if(before==null) continue; var lb=AE.scoreToLevel(before), la=AE.scoreToLevel(_eloScoreOf(now[t])); if(la!==lb) changes.push({subName:nm, topic:(tmap[t]&&tmap[t].name)||t, from:lb, to:la, up:la>lb}); }
  }catch(e){}
  var subName=(qbOf(cert)[sub]&&qbOf(cert)[sub].name)||sub;
  _luLastSubName=subName; _luLastChanges=changes;
  var topName=''; try{ var fq=qs[0]; var tp=fq&&fq.topic; if(!tp){ var info=(typeof adLookup==='function')&&adLookup(cert,sub,fq&&fq.id); tp=info&&info.topic; } var tm2=topicNameMap(cert,sub); topName=(tp&&tm2[tp]&&tm2[tp].name)||''; }catch(e){}
  var chgMain=changes.length?(changes.filter(function(c){return c.up;})[0]||changes[0]):null;
  var chgObj=chgMain?{from:chgMain.from,to:chgMain.to,up:chgMain.up}:null;
  var qids=qs.map(function(q){return q.id;});
  if(_luRoundRecRef && (_luRoundRecRef.qids||[]).join('\u0001')===qids.join('\u0001')){
    // 같은 라운드 재완료(이어풀기/미응답 후) → 기존 기록 갱신(중복 방지)
    _luRoundRecRef.correct=correct; _luRoundRecRef.ans=Object.assign({},mqAns); _luRoundRecRef.chg=chgObj; _luRoundRecRef.topic=(chgMain?chgMain.topic:topName); _luRoundRecRef.ts=Date.now();
    luHistSaveLocal(); if(currentUser && typeof saveUserData==='function') saveUserData();
  } else {
    var rec={ ts:Date.now(), sub:sub, subName:subName, topic:(chgMain?chgMain.topic:topName), correct:correct, total:qs.length, qids:qids, ans:Object.assign({},mqAns), chg:chgObj };
    luHistAdd(cert, rec); _luRoundRecRef=rec;
    luSubIdx=(luSubIdx+1);   // 최초 완료 시에만 다음 과목으로
  }
  luResumeClear(cert);   // 라운드 완료 → 이어풀기 정리(다음은 계속 풀기)
  return changes;
}
// 레벨업 라운드 재개(이어풀기/미응답) — mqLevelUp 유지해 같은 라운드로 재완료
function luResumeRound(){ mqLevelUp=true; mqContinue(); }
function luResumeUnans(){ mqLevelUp=true; mqContinueUnans(); }
function luContinue(){ mqLevelUp=true; mqInReview=false; mqReview=false; mqDiag=false; luLoadRound(false); }   // 다음 5문제
function luRetryRound(){   // 방금 5문제 그대로 다시
  var list=mqResultQs.slice(); if(!list.length) return;
  mqLevelUp=true; mqInReview=false;
  _luRelearn={};   // 명시적 다시풀기 → 복습 뱃지 미표시
  mqOXClearList(list);   // 다시 풀기 → O/X 해제(동기화 부활 방지 포함)
  luPreScores={}; var sc=luTopicScores(mqCert, luCurSub); for(var t in sc) luPreScores[t]=sc[t];
  mqSub=luCurSub; mqSet=0; mqMode='levelup'; mqList=list; mqAns={}; mqShow={}; mqGuess={}; mqIdx=0; mqTimeLeft=_sessionSecs(list, mqCert);
  mqScreen='exam'; luResumeSave(); renderMCQ(); mqStartTimer(); window.scrollTo(0,0);
}
function luHistGo(){ luHistEnsure(); mqLevelUp=false; mqScreen='luhist'; renderMCQ(); window.scrollTo(0,0); }
function luHistBack(){ mqScreen='home'; renderMCQ(); window.scrollTo(0,0); }
function luHistToggle(v){ luHistView=v; renderMCQ(); }
function _luHistRow(rec, gIdx){
  var pctClass=(rec.correct>=rec.total)?'#E4F3EA':(rec.correct>=Math.ceil(rec.total*0.6)?'#FBEFCF':'#FBE3E2');
  var pctCol=(rec.correct>=rec.total)?'#1E7A45':(rec.correct>=Math.ceil(rec.total*0.6)?'#8a6510':'#B5302F');
  var d=new Date(rec.ts||0); var hh=('0'+d.getHours()).slice(-2), mm=('0'+d.getMinutes()).slice(-2);
  var chg=rec.chg?('<span style="font-weight:800;color:'+(rec.chg.up?'#2E9B5E':'#946200')+'">'+(rec.chg.up?'▲':'▼')+' Lv'+rec.chg.from+'→'+rec.chg.to+'</span>'):'<span style="color:#888780">변동 없음</span>';
  return '<div onclick="luHistReview('+gIdx+')" style="display:flex;align-items:center;gap:10px;padding:11px 12px;background:#fff;border:1px solid #EDE6DD;border-radius:13px;margin-bottom:8px;cursor:pointer">'+
    '<div style="font-size:12px;font-weight:900;width:42px;text-align:center;border-radius:9px;padding:5px 0;background:'+pctClass+';color:'+pctCol+'">'+rec.correct+'/'+rec.total+'</div>'+
    '<div style="flex:1"><b style="font-size:13.5px">'+mqEsc(rec.subName||'')+(rec.topic?(' · '+mqEsc(rec.topic)):'')+'</b><div style="font-size:11px;color:#888780;margin-top:2px">'+hh+':'+mm+' · '+chg+'</div></div>'+
    '<span style="color:#c9bdac;font-size:18px">›</span></div>'; }
function renderLuHist(root){ var cert=mqCert; var list=luHistList(cert);
  var head='<div class="mcq-exam-title"><button class="exam-home-back" onclick="luHistBack()" aria-label="뒤로">'+BACK_ARROW+'</button>전체 레벨업 결과</div>';
  var body='';
  if(!list.length){ body='<div style="text-align:center;color:#A89C8E;font-size:13px;padding:40px 20px">아직 레벨업 기록이 없어요.<br>레벨업 문제를 풀면 라운드별로 쌓여요.</div>'; }
  else { var groups={}, order=[];
    list.forEach(function(rec,i){ var d=new Date(rec.ts||0); var key=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); if(!groups[key]){ groups[key]=[]; order.push(key); } groups[key].push({rec:rec,gIdx:i}); });
    var today=new Date(); var tkey=today.getFullYear()+'-'+('0'+(today.getMonth()+1)).slice(-2)+'-'+('0'+today.getDate()).slice(-2);
    body='<div style="padding:8px 14px 0">'+order.map(function(key){ var parts=key.split('-'); var lbl=(key===tkey)?('오늘 · '+parseInt(parts[1],10)+'월 '+parseInt(parts[2],10)+'일'):(parseInt(parts[1],10)+'월 '+parseInt(parts[2],10)+'일');
      return '<div style="font-size:12px;font-weight:800;color:#8a8175;margin:14px 2px 7px">'+lbl+'</div>'+groups[key].map(function(o){ return _luHistRow(o.rec,o.gIdx); }).join(''); }).join('')+'</div>'; }
  root.innerHTML=head+body;
}
function luHistReview(gIdx){ var list=luHistList(mqCert); var rec=list[gIdx]; if(!rec) return;
  var qs=(rec.qids||[]).map(function(id){ return _luFindQ(mqCert,id); }).filter(Boolean);
  if(!qs.length){ alert('이 회차 문항을 찾지 못했어요.'); return; }
  mqStopTimer(); mqStopOverTimer();
  mqResultQs=qs; mqResultAns=Object.assign({},rec.ans||{});
  var correct=qs.filter(function(q){ return mqResultAns[q.id]!==undefined && isCorr(q.ans,mqResultAns[q.id]); }).length;
  var answered=qs.filter(function(q){ return mqResultAns[q.id]!==undefined; }).length;
  var total=qs.length, pct=total?Math.round(correct/total*100):0;
  var chg=rec.chg?[{subName:rec.subName, topic:rec.topic, from:rec.chg.from, to:rec.chg.to, up:rec.chg.up}]:[];
  mqInReview=false; mqLevelUp=false;
  mqResultMeta={correct:correct,answered:answered,total:total,pct:pct,diag:false,review:false,mode:'levelup',sub:rec.sub,set:0,otc:0,ots:0,levelTest:false,cert:mqCert, lu:true, luSubName:(rec.subName||'')+(rec.topic?(' · '+rec.topic):''), luChanges:chg, luFromHist:true, ts:rec.ts};
  mqScreen='result'; renderMqResultScreen(); window.scrollTo(0,0); }
// 과목 레벨: 토픽 점수 핵심(exam) 2 : 일반 1 가중평균 → Lv
// 과목 Elo 점수(핵심 2:1 가중) — 0~100, 데이터 없으면 null
function adSubjectScoreRaw(cert,sub){ var sc=luTopicScores(cert,sub), tmap=topicNameMap(cert,sub), wsum=0, w=0; for(var t in sc){ var weight=(tmap[t]&&tmap[t].mode==='exam')?2:1; wsum+=sc[t]*weight; w+=weight; } if(w) return wsum/w; try{ var rec=(typeof eloState!=='undefined')&&eloState._levelTest&&eloState._levelTest[cert]; if(rec&&rec.summary&&rec.summary[sub]&&typeof rec.summary[sub].score==='number') return rec.summary[sub].score; }catch(e){} return null; }
function luSubjectLevel(cert,sub){ var raw=adSubjectScoreRaw(cert,sub); return raw==null?null:AE.scoreToLevel(raw); }
// 환산표 자리(회차 실측 보정 전: 항등). 이후 회차 실점수로 보정 지점.
function eloToExamScore(score){ if(score==null) return null; return Math.round(Math.max(0,Math.min(100,score))); }
// 4-c 예상점수: 토픽 Elo→과목→환산→예상점수
function adPredicted(cert){
  var order=(typeof curOrder==='function')?curOrder():Object.keys(qbOf(cert));
  var per=order.map(function(sub){ var raw=adSubjectScoreRaw(cert,sub); return {code:sub, name:(qbOf(cert)[sub]&&qbOf(cert)[sub].name)||sub, score:(raw==null?null:eloToExamScore(raw)), level:(raw==null?null:AE.scoreToLevel(raw))}; });
  var valid=per.filter(function(p){return p.score!=null;});
  var predicted=valid.length?Math.round(valid.reduce(function(a,p){return a+p.score;},0)/valid.length):null;
  return {per:per, valid:valid, predicted:predicted, notMeasured:per.filter(function(p){return p.score==null;})};
}
function adVerdict(cert, ap){
  var rule=passRule(cert);
  if(ap.predicted==null || ap.notMeasured.length>0) return {status:'insufficient', color:'#B4A99C', label:'측정 중', notMeasured:ap.notMeasured, rule:rule};
  if(rule.grade){   // 한국사 등급제: 과락 없이 점수→급
    var p=ap.predicted, gname=null, gcol='#94A3B8', medal='', nextName='3급', nextGap=60-p;
    if(p>=80){ gname='1급'; gcol='#15803D'; medal='🥇'; nextName=null; nextGap=null; }
    else if(p>=70){ gname='2급'; gcol='#2563EB'; medal='🥈'; nextName='1급'; nextGap=80-p; }
    else if(p>=60){ gname='3급'; gcol='#D97706'; medal='🥉'; nextName='2급'; nextGap=70-p; }
    return {status:'grade', grade:true, color:gcol, label:(gname?(medal+' '+gname+'권'):'미달'), gradeName:gname, gradeColor:gcol, medal:medal, nextName:nextName, nextGap:nextGap, rule:rule};
  }
  var floorFail = rule.floor>0 ? ap.valid.filter(function(p){return p.score<rule.floor;}) : [];
  if(floorFail.length) return {status:'fail', color:'#E24B4A', label:'🔴 위험권 (과락)', failFloor:floorFail, rule:rule};
  var safe=Math.max(80, rule.pass+10);
  if(ap.predicted>=safe) return {status:'safe', color:'#2E9B5E', label:'🟢 안전권', rule:rule};
  if(ap.predicted>=rule.pass) return {status:'pass', color:'#E0A52E', label:'🟡 합격권', rule:rule};
  return {status:'fail', color:'#E24B4A', label:'🔴 위험권', rule:rule};
}
function luToggleCardSub(sub){ luCardOpen[sub]=!luCardOpen[sub]; renderMCQ(); }
// 한국사 등급 게이지: 과락선 없이 등급선 3개(3급60·2급70·1급80), 채움·배지 동→은→금
function _luGradeGaugeHTML(cert, ap, v){
  var p=Math.max(0,Math.min(100,ap.predicted));
  var gradeGrad={'1급':'linear-gradient(90deg,#34A865,#15803D)','2급':'linear-gradient(90deg,#5B8DEF,#2563EB)','3급':'linear-gradient(90deg,#F0A93E,#D97706)'};
  var fillGrad=(v.gradeName&&gradeGrad[v.gradeName])||'linear-gradient(90deg,#B7BFC9,#94A3B8)';
  var pillBg, pillCol, pillTxt;
  if(v.gradeName){
    pillBg=(v.gradeName==='1급')?'#E7F6EC':(v.gradeName==='2급')?'#E8F0FE':'#FEF3E2';
    pillCol=v.gradeColor; pillTxt=v.medal+' '+v.gradeName+'권'+(v.nextName?(' \u00B7 '+v.nextName+'까지 '+v.nextGap+'점'):'');
  } else { pillBg='#F1F5F9'; pillCol='#64748B'; pillTxt=(v.nextName||'3급')+'까지 '+(v.nextGap!=null?v.nextGap:'')+'점'; }
  var marks=((passRule(cert).grades)||[]).map(function(gr){
    return '<span class="lu-g-grade" style="left:'+gr.min+'%;background:'+gr.color+'"></span><span class="lu-g-glab" style="left:'+gr.min+'%;color:'+gr.color+'">'+gr.g+' '+gr.min+'</span>';
  }).join('');
  return '<div class="lu-gauge-wrap">'
    +'<div class="lu-g-cap"><span class="lu-g-pill" style="background:'+pillBg+';color:'+pillCol+'">'+pillTxt+'</span></div>'
    +'<div class="lu-gauge">'
      +'<span class="lu-g-fill" style="width:'+p+'%;background:'+fillGrad+'"></span>'
      +marks
    +'</div>'
    +'<div class="lu-g-foot2"></div>'
  +'</div>';
}
// 게이미피케이션: 예상점수 → 합격선 게이지(0~100, 과락·합격 마커)
function _luGaugeHTML(cert, ap, v){
  if(!ap || ap.predicted==null || !v) return '';
  if(v.grade){ return _luGradeGaugeHTML(cert, ap, v); }   // 한국사 등급제
  var rule=passRule(cert), pass=rule.pass||60, floor=rule.floor||0, p=Math.max(0,Math.min(100,ap.predicted));
  var fillGrad, pillBg, pillCol, pillTxt;
  var isFloorFail = (v.status==='fail' && v.failFloor && v.failFloor.length);
  var gap = ap.predicted - pass;
  if(isFloorFail){ fillGrad='linear-gradient(90deg,#E8635F,#E24B4A)'; pillBg='#FDECEC'; pillCol='#C0392B'; pillTxt='\u26A0\uFE0F '+v.failFloor.map(function(x){return mqEsc(x.name);}).join(', ')+' \uACFC\uB77D \uC704\uD5D8'; }
  else if(gap>=0){ fillGrad=(v.status==='safe')?'linear-gradient(90deg,#3FB873,#2E9B5E)':'linear-gradient(90deg,#F0B43E,#E0A52E)'; pillBg=(v.status==='safe')?'#E9F7EF':'#FFF6E6'; pillCol=(v.status==='safe')?'#1E7A45':'#946200'; pillTxt='\uD569\uACA9\uC120 +'+gap+'\uC810'; }
  else { fillGrad='linear-gradient(90deg,#E8635F,#E24B4A)'; pillBg='#FFF1E0'; pillCol='#C2620C'; pillTxt='\uD569\uACA9\uAE4C\uC9C0 '+Math.abs(gap)+'\uC810'; }
  var floorMk = floor>0 ? '<span class="lu-g-floor" data-l="\uACFC\uB77D '+floor+'" style="left:'+floor+'%"></span>' : '';
  return '<div class="lu-gauge-wrap">'
    +'<div class="lu-g-cap"><span class="lu-g-pill" style="background:'+pillBg+';color:'+pillCol+'">'+pillTxt+'</span></div>'
    +'<div class="lu-gauge">'
      +'<span class="lu-g-fill" style="width:'+p+'%;background:'+fillGrad+'"></span>'
      +floorMk
      +'<span class="lu-g-pass" data-l="\uD569\uACA9 '+pass+'" style="left:'+pass+'%"></span>'
    +'</div>'
    +'<div class="lu-g-foot2"></div>'
  +'</div>';
}
function diagKey(cert){ return 'diagprog:'+cert; }function diagHasSave(cert){ try{ return !!localStorage.getItem(diagKey(cert)); }catch(_){ return false; } }
function clearDiagProgress(cert){ try{ localStorage.removeItem(diagKey(cert)); }catch(_){} }
function saveDiagProgress(){
  if(!mqDiag || !mqList) return;
  try{ localStorage.setItem(diagKey(mqCert), JSON.stringify({v:LT_SAVE_VER, ids:mqList.map(q=>q.id), ans:mqAns, idx:mqIdx, t:mqTimeLeft, at:Date.now()})); }catch(_){}
}
async function diagResume(){
  if(!diagHasSave(mqCert)){ startDiagnostic(); return; }
  let p; try{ p=JSON.parse(localStorage.getItem(diagKey(mqCert))); }catch(_){ p=null; }
  if(!p || !p.ids || !p.ids.length || p.v!==LT_SAVE_VER){ clearDiagProgress(mqCert); startDiagnostic(); return; }   // 옛/불일치 save 폐기 → 새 출제(변형 50)
  const qb=qbOf(mqCert);
  if(typeof loadAdaptiveSubject==='function'){ try{ await Promise.all(Object.keys(qb).map(function(code){ return loadAdaptiveSubject(mqCert, code).catch(function(){return null;}); })); }catch(e){} }
  const byId={};
  Object.keys(qb).forEach(code=>qb[code].sets.forEach(st=>st.questions.forEach(q=>{ byId[q.id]={q,name:qb[code].name||code,code:code}; })));
  Object.keys(qb).forEach(code=>{ try{ var b=(typeof AD_DATA!=='undefined')&&AD_DATA[mqCert+'|'+code]; var vp=(b&&b.variantPool)||[]; vp.forEach(function(v){ if(v&&v.id&&!byId[v.id]) byId[v.id]={q:v,name:(qb[code].name||code),code:code}; }); }catch(e){} });   // 변형 풀도 복원 대상
  const list=p.ids.map(id=>{ const e=byId[id]; if(e){ e.q._subj=e.name; e.q._subjCode=e.code; return e.q; } return null; }).filter(Boolean);
  if(!list.length){ clearDiagProgress(mqCert); startDiagnostic(); return; }
  mqStopTimer();
  mqDiag=true; mqLevelTest=true; mqReview=false; mqInReview=false; mqConcept=false; mqMode='diag'; mqSub=''; mqSet=0; mqShow={}; mqGuess={}; mqAns=p.ans||{}; mqIdx=Math.min(p.idx||0, list.length-1);
  mqList=list; mqTimeLeft=(p.t!=null&&p.t>0?p.t:_sessionSecs(list, mqCert));
  mqScreen='exam'; renderMCQ(); mqStartTimer(); window.scrollTo(0,0);
}
function srSaveDiagnostic(cert,correct,total){
  srDiagnostics.push({cert,at:Date.now(),score:total?Math.round(correct/total*100):0,total});
  srFlush();
}
