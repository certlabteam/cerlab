// ===== 오류 신고 =====
let selectedReportType = '';
let reportTarget = null;

function openReport(mcqQ) {
  // 객관식 문항(mcqQ)이 넘어오면 그걸 신고, 없으면 생체 현재 카드
  if(mcqQ && mcqQ.id){
    var cs = (typeof MCQ_QID2CS!=='undefined' && MCQ_QID2CS[mcqQ.id]) ? MCQ_QID2CS[mcqQ.id] : null;
    var subName = mcqQ._subj || (cs ? ((qbOf(cs.cert)[cs.sub]&&qbOf(cs.cert)[cs.sub].name)||cs.sub) : '');
    reportTarget = { q: mcqQ.q||'', subject: subName, cert: (cs?cs.cert:activeCertId()), qid: mcqQ.id };
  } else {
    var card = filtered[current];
    if (!card) return;
    reportTarget = { q: card.q, subject: card.s, cert: activeCertId(), qid: null, _card: card };
  }
  document.getElementById('reportSubTitle').textContent = reportTarget.q.length > 30 ? reportTarget.q.slice(0,30)+'...' : reportTarget.q;
  selectedReportType = '';
  document.querySelectorAll('.report-type').forEach(t => t.classList.remove('selected'));
  document.getElementById('reportDetail').value = '';
  document.getElementById('reportSheet').classList.remove('hidden');
}

function closeReport() {
  document.getElementById('reportSheet').classList.add('hidden');
}
// 객관식 현재 문항 오류신고 — qid로 현재 문항 객체를 찾아 openReport에 전달
function openReportMcq(qid){
  var q=null;
  try{ if(Array.isArray(mqList)) q=mqList[mqIdx]; }catch(_){}
  if(!q || q.id!==qid){ try{ q=(mqList||[]).find(function(x){return x&&x.id===qid;})||null; }catch(_){} }
  if(!q){ q={id:qid, q:''}; }
  openReport(q);
}

function selectReportType(el, type) {
  selectedReportType = type;
  document.querySelectorAll('.report-type').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
}

async function submitReport() {
  if (!selectedReportType) { alert('오류 유형을 선택해주세요.'); return; }
  const detail = document.getElementById('reportDetail').value.trim();
  const t = reportTarget || {};
  try {
    await db.collection('reports').add({
      question: t.q || '',
      subject: t.subject || '',
      cardIndex: (t._card ? D.findIndex(c => c.q === t._card.q && c.s === t._card.s) : -1),
      questionId: t.qid || '',
      certType: t.cert || activeCertId(),
      errorType: selectedReportType,
      detail: detail || '',
      reporterUid: currentUser ? currentUser.uid : 'guest',
      reporterEmail: currentUser ? currentUser.email : '비회원',
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeReport();
    alert('✅ 신고가 접수되었습니다. 감사합니다!');
  } catch(e) {
    alert('오류가 발생했습니다: ' + e.message);
  }
}

/* ===== 고객센터 (reports 컬렉션 재사용) ===== */
let selectedCSType = '';
function openCS() {
  selectedCSType = '';
  document.querySelectorAll('#csSheet .report-type').forEach(t => t.classList.remove('selected'));
  document.getElementById('csDetail').value = '';
  document.getElementById('csSheet').classList.remove('hidden');
}
function closeCS() { document.getElementById('csSheet').classList.add('hidden'); }
function selectCSType(el, type) {
  selectedCSType = type;
  document.querySelectorAll('#csSheet .report-type').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
}
async function submitCS() {
  if (!selectedCSType) { alert('카테고리를 선택해주세요.'); return; }
  const detail = document.getElementById('csDetail').value.trim();
  if (!detail) { alert('내용을 입력해주세요.'); return; }
  try {
    await db.collection('reports').add({
      question: '[고객센터]',
      subject: '고객센터',
      cardIndex: -1,
      certType: (typeof activeCert!=='undefined' && activeCert) ? activeCert : 'general',
      errorType: selectedCSType,
      detail: detail,
      reporterUid: currentUser ? currentUser.uid : 'guest',
      reporterEmail: currentUser ? currentUser.email : '비회원',
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeCS();
    alert('✅ 접수되었습니다. 소중한 의견 감사합니다!');
  } catch(e) {
    alert('오류가 발생했습니다: ' + e.message);
  }
}

// ===== 접근 권한 체크 (시험별) =====
function canAccess(cert) {
  cert = cert || activeCertId();
  const e = userEnt[cert] || { plan:'GUEST', trialCount:0 };
  const plan = e.plan;
  if (plan === 'GUEST') {
    if (_guestDayCount(cert) >= _guestDaily()) {
      showLoginPopup('guest_limit');
      return false;
    }
    return true;
  }
  if (plan === 'FREE_TRIAL') {
    if (_userDayCount(cert) >= _userDaily()) {
      showPlanPopup();
      return false;
    }
    return true;
  }
  if (plan === 'EXPIRED') {
    showPlanPopup();
    return false;
  }
  return true; // ACTIVE
}

const SUBJS=['보디빌딩규정','스포츠인권·윤리','운동생리학','스포츠영양학','웨이트트레이닝','응급처치','실기'];
const BB_CAT={ se:'스포츠인권·윤리' };
const ALL_SUBJS=['전체',...SUBJS];
const MILESTONES=[
  {n:45,stars:'⭐⭐',msg:'좋은 출발이에요! 계속 달려봐요 🏃\u200d♀️'},
  {n:100,stars:'⭐⭐⭐',msg:'100문제 돌파! 정말 대단해요 🎉'},
  {n:200,stars:'🌟🌟🌟',msg:'200문제! 실력이 쑥쑥 크고 있어요 💪'},
  {n:300,stars:'✨✨✨✨',msg:'300문제! 합격이 보이기 시작했어요 👑'},
  {n:1000,stars:'🏆🏆🏆🏆🏆',msg:'1000문제 완전 정복! 당신은 전설입니다 🥇'},
];
const passedMilestones=new Set();
const D=[];
function q(s,question,answer,star,learn,time){var st=star||3;st=st<=2?1:(st===3?2:3);D.push({s,q:question,a:answer,learn:learn||null,star:st,time:time||0,w:false,fav:false});}

/* ===== 데이터 ===== */

const B='보디빌딩규정';
const EP='운동생리학';
const NU='스포츠영양학';
const WT='웨이트트레이닝';
const FA='응급처치';
let cards=[...D];
let filtered=[...cards];
let current=0;
let reviewMode=false;
let currentSubj='전체';
let isFlipped=false;
let learnOpen=false;
let currentStar=0;
let solveCount=0;                 // 레거시 미러(전체 합계 — admin 호환)
let solveCountByCert={};           // 시험별 푼 횟수 {cert:n}
function solveOf(cert){ return solveCountByCert[cert]||0; }
function totalSolve(){ let s=0; for(const k in solveCountByCert) s+=(solveCountByCert[k]||0); return s; }
function setStatCountUI(){ const el=document.getElementById('statCount'); if(el) el.textContent=solveOf('bodybuilding'); }

/* ===== 자동복습(Spaced Repetition) 코어 ===== */
const SR_CERT='bodybuilding';
const SR_DAY=86400000;
const SR_DAILY_CAP=40;
const REVIEW_MCQ_CAP=40;   // MCQ 복습 하루 상한(급한 순 → 약한 목차 우선으로 선정)
const SR_DEFAULT_EXAM={ bodybuilding:'2026-06-23' };
let srProgress={};        // { 'B_1': {st,nx,lr,res,rc,w} }
let srDiagnostics=[];      // 레벨 테스트 스냅샷 [{cert,at,score,total}]
let srExamOverride={};     // { bodybuilding:'YYYY-MM-DD' }
let srMode='mix';          // 'new' | 'review' | 'mix'
let srSaveTimer=null, srDirtyCount=0;

function srExamDateOf(cert){ const s=srExamOverride[cert]||SR_DEFAULT_EXAM[cert]; return s?new Date(s+'T23:59:59'):null; }
function srDaysLeftOf(cert){ const d=srExamDateOf(cert); return d?Math.ceil((d-Date.now())/SR_DAY):null; }
function srExamDate(){ return srExamDateOf(SR_CERT); }
function srDaysLeft(){ return srDaysLeftOf(SR_CERT); }
function srCorrectInterval(streak,cert){
  const base=[7,14,30,60,90];
  return base[Math.min(streak,5)-1]||90;
}
function srVagueInterval(cert){ return 3; }

/* 코어: (cert,id) 기준 — 구술·객관식 공용 */
function srGetK(cert,id){ return srProgress[cert+'|'+id]; }
function srMasteryK(cert,id){ const p=srGetK(cert,id); if(!p||!p.rc) return 'new'; if(!p.st) return 'weak'; if(p.st>=5) return 'master'; return 'learning'; }
function srDueK(cert,id){ const p=srGetK(cert,id); return !!(p&&p.rc>0&&(p.nx||0)<=Date.now()); }
function srDueCertCount(cert){ let n=0,pre=cert+'|',now=Date.now(); for(const k in srProgress){ if(k.indexOf(pre)===0){ const p=srProgress[k]; if(p&&p.rc>0&&(p.nx||0)<=now) n++; } } return n; }
function srDueReviewable(cert){   // 홈 배너=복습 세션 일치: 지금 로드된 뱅크에 실제 존재하는 복습 due만 셈(삭제·변경된 문항의 고아 진도 제외)
  let n=0, seen={};
  try{ const qb=curQB(); (curOrder()||[]).forEach(function(id){ const sub=qb&&qb[id]; if(!sub||!sub.sets) return; sub.sets.forEach(function(st){ (st.questions||[]).forEach(function(q){ if(q&&!seen[q.id]&&srDueK(cert,q.id)){ seen[q.id]=1; n++; } }); }); }); }catch(_){}
  return n;
}
function srRateK(cert,id,result,overtime,replace){          // 0 틀림 / 1 애매 / 2 정확. replace=직전 평가 덮어쓰기
  if(!id) return;
  const k=cert+'|'+id, now=Date.now();
  let p=srProgress[k]||{st:0,nx:0,lr:0,res:null,rc:0,cor:0,w:false};
  if(replace && p.rc>0){
    // 같은 세션 재평가: 직전 결과의 누적(rc/cor/streak)을 되돌린 뒤 새 결과로 다시 적용
    if(p.res===2){ p.cor=Math.max(0,(p.cor||0)-1); p.st=Math.max(0,(p.st||0)-1); }
    // (직전이 틀림/애매면 streak는 0 또는 반감이라 정확 복원 불가 → rc만 되돌리고 streak는 새 결과로 재설정)
    p.rc=Math.max(0,(p.rc||0)-1);
  }
  p.rc=(p.rc||0)+1; p.lr=now; p.res=result;
  p.ot = !!overtime;                     // 시간종료 후 응답 여부(예상점수 제외용)
  if(result===2) p.cor=(p.cor||0)+1;     // 정답 누계 (과목 정확도·예상점수용)
  if(result===0){ p.st=Math.ceil((p.st||0)/2); p.w=true; p.nx=now+1*SR_DAY; }
  else if(result===1){ p.nx=now+srVagueInterval(cert)*SR_DAY; }
  else { p.st=(p.st||0)+1; p.w=false; p.nx=now+srCorrectInterval(p.st,cert)*SR_DAY; }
  srProgress[k]=p;
  return p;
}

/* 구술(플래시카드) 래퍼 */
function srKey(card){ return card&&card.id?(SR_CERT+'|'+card.id):null; }
function srGet(card){ const k=srKey(card); return k?srProgress[k]:null; }
function srIsNew(card){ const p=srGet(card); return !p||!p.rc; }
function srDue(card){ const p=srGet(card); return !!(p&&p.rc>0&&(p.nx||0)<=Date.now()); }
function srMastery(card){ return card&&card.id?srMasteryK(SR_CERT,card.id):'new'; }
function srTodayCount(){ return cards.filter(srDue).length; }
function srRate(card,result){
  if(!card||!card.id) return;
  const p=srRateK(SR_CERT,card.id,result);
  card.w=!!(p&&p.w);
  const idx=cards.findIndex(c=>c.id===card.id); if(idx!==-1) cards[idx].w=card.w;
}

/* 객관식 채점 → 복습 연결 (정답=정확, 오답=틀림. 애매 없음. ans:0 제외) */
function mqHasAnswer(q){ return q && (isSA(q) ? true : (Array.isArray(q.ans)? q.ans.length>0 : q.ans>0)); }
function srRateMcq(cert,q,selected,overtime,replace){
  if(!mqHasAnswer(q)) return;            // 정답 미확정 문항은 복습 집계 제외
  srRateK(cert, q.id, isCorr(q.ans,selected)?2:0, overtime, replace);
}
const SR_MASTER_LABEL={new:'신규',weak:'미숙',learning:'학습중',master:'숙달'};

let solveCountAfterSR=true; // marker

function getWrongCount(){
  return cards.filter(c=>{
    const p=srProgress[SR_CERT+'|'+c.id];
    return p&&(p.rc||0)>0&&p.cor!==1;  // 시도한 것 중 틀린 것만
  }).length;
}
function getFiltered(){
  let b=cards;
  if(srMode==='new') b=b.filter(srIsNew);
  else if(srMode==='review') b=b.filter(srDue);
  // 'mix' = 전체 (신규+학습한 카드 모두)
  if(currentSubj==='__2026__') b=b.filter(c=>c.since===2026);   // 2026 기출 칩(전 과목 통합)
  else if(currentSubj!=='전체') b=b.filter(c=>c.s===currentSubj);
  if(currentStar!==0) b=b.filter(c=>c.star===currentStar);
  if(srMode==='review'){
    b=b.slice().sort((x,y)=>{ const px=srGet(x)||{},py=srGet(y)||{};
      return (px.nx||0)-(py.nx||0) || (y.star||0)-(x.star||0); });
    if(b.length>SR_DAILY_CAP) b=b.slice(0,SR_DAILY_CAP);   // 하루 복습 상한(복습일 급한 것 우선 선정)
    // 표시는 과목별로 묶어서 — 같은 과목이 연속으로 쫙 나오게(선정은 위 복습일순 유지)
    var _so={}; (ALL_SUBJS||[]).forEach(function(s,i){ _so[s]=i; });
    b=b.slice().sort((x,y)=>((_so[x.s]==null?999:_so[x.s])-(_so[y.s]==null?999:_so[y.s])));
  }
  return b;
}
function isSubjEnd(){return currentSubj!=='전체'&&!reviewMode&&current===filtered.length-1;}

function scrollSubj(dir){
  const bar=document.getElementById('subjectBar');
  bar.scrollBy({left:dir*120,behavior:'smooth'});
  setTimeout(updateSubjArrows,300);
}
function updateSubjArrows(){
  const bar=document.getElementById('subjectBar');
  const l=document.getElementById('arrowL');
  const r=document.getElementById('arrowR');
  if(!l||!r)return;
  l.classList.toggle('hidden',bar.scrollLeft<=2);
  r.classList.toggle('hidden',bar.scrollLeft+bar.clientWidth>=bar.scrollWidth-2);
}
function scrollStar(dir){
  const bar=document.getElementById('starBar');
  bar.scrollBy({left:dir*120,behavior:'smooth'});
  setTimeout(updateStarArrows,300);
}
function updateStarArrows(){
  const bar=document.getElementById('starBar');
  const l=document.getElementById('starArrowL');
  const r=document.getElementById('starArrowR');
  if(!l||!r)return;
  l.classList.toggle('hidden',bar.scrollLeft<=2);
  r.classList.toggle('hidden',bar.scrollLeft+bar.clientWidth>=bar.scrollWidth-2);
}

function buildBar(){
  const bar=document.getElementById('subjectBar');
  bar.innerHTML='';
  // 생체 2026 기출 칩 — 과목 선택과 같은 레벨의 토글(currentSubj='__2026__'). '전체' 다음에 노출, 2026 카드가 있을 때만.
  var has2026 = (typeof activeCert!=='undefined' && activeCert==='bodybuilding') && cards.some(function(c){return c.since===2026;});
  ALL_SUBJS.forEach(s=>{
    const hasW=s==='전체'?cards.some(c=>c.w):cards.filter(c=>c.s===s).some(c=>c.w);
    const btn=document.createElement('button');
    btn.className='subj-btn'+(s===currentSubj?' active':'')+(hasW?' has-wrong':'');
    btn.textContent=s==='전체'?'전체 \u2736':s;
    btn.onclick=()=>{if(typeof ttsStop==='function')ttsStop();currentSubj=s;current=0;isFlipped=false;learnOpen=false;refresh();};
    bar.appendChild(btn);
    if(s==='전체' && has2026){   // '전체' 바로 뒤에 2026 기출 칩
      const b26=document.createElement('button');
      b26.className='subj-btn'+(currentSubj==='__2026__'?' active':'');
      b26.textContent='🔥 2026 기출';
      b26.onclick=()=>{if(typeof ttsStop==='function')ttsStop();currentSubj='__2026__';current=0;isFlipped=false;learnOpen=false;refresh();};
      bar.appendChild(b26);
    }
  });
  setTimeout(()=>{
    const active=bar.querySelector('.active');
    if(active)active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    updateSubjArrows();
  },50);
  bar.addEventListener('scroll',updateSubjArrows,{passive:true});
}

function buildStarBar(){
  const bar=document.getElementById('starBar');
  bar.innerHTML='';
  const stars=[{n:0,label:'전체'},...[3,2,1].map(n=>({n,label:impLabel(n)}))];
  stars.forEach(({n,label})=>{
    const base=srMode==='new'?cards.filter(srIsNew):srMode==='review'?cards.filter(srDue):cards;
    const pool=currentSubj==='__2026__'?base.filter(c=>c.since===2026):currentSubj==='전체'?base:base.filter(c=>c.s===currentSubj);
    const cnt=n===0?pool.length:pool.filter(c=>c.star===n).length;
    const btn=document.createElement('button');
    btn.className='star-btn'+(n===currentStar?' active':'')+(cnt===0?' disabled-star':'');
    if(cnt===0)btn.style.opacity='0.3';
    btn.textContent=label;
    btn.onclick=()=>{if(cnt===0)return;currentStar=n;current=0;isFlipped=false;learnOpen=false;refresh();};
    bar.appendChild(btn);
  });
  setTimeout(()=>{
    const active=bar.querySelector('.active');
    if(active)active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    updateStarArrows();
  },50);
  bar.addEventListener('scroll',updateStarArrows,{passive:true});
}

function updateStats(){
  const t=cards.length;
  // 분모: 시도한 전체 문항 (정답+오답+애매함). 시도 = srProgress 응답기록(rc>0)이 있는 카드.
  const att=cards.filter(c=>{ const p=c&&c.id?srProgress[SR_CERT+'|'+c.id]:null; return p&&(p.rc||0)>0; }).length;
  // 분자: 정답만. 정답률 = 정답 / 전체
  const correctCount=cards.filter(c=>{
    if(!c || !c.id) return false;
    const p=srProgress[SR_CERT+'|'+c.id];
    return p&&(p.rc||0)>0 && p.cor===1; // SR 정답 판정(getWrongCount와 동일 기준)
  }).length;
  const w=getWrongCount();
  
  document.getElementById('statTotal').textContent=t;
  document.getElementById('statWrong').textContent=w;
  document.getElementById('statDone').textContent=att>0?Math.round(correctCount/att*100)+'%':'0%';
  setStatCountUI();
  document.getElementById('wrongCount').textContent='오답 '+w+'개';
}

function newTypeBadge(card){
  if(!card || !card.since) return '';
  if(Number(card.since) !== new Date().getFullYear()) return '';
  return '<span class="ntag">'+card.since+'년 기출'+(card.newType?' 신유형':'')+'</span>';
}
function _mnPlainStripped(code){ return String(code||'').replace(/<[^>]+>/g,'').replace(/\([^)]*\)/g,'').replace(/[\s·ㆍ・•∙\/,，、~–—()①②③④⑤⑥⑦⑧⑨⑩]/g,''); }
function mnChantHTML(code, cls, kind){
  // 암기코드 code 안의 두문자(<span class="k">글자</span> 또는 약식 <k>글자</k>)만 뽑아 이어붙인 '모음' 한 줄. 두문자 2개 미만이면 생략.
  // 문장암기형(kind:"sentence")·운율형(kind:"chant")은 종합본 자동줄 생략(글자가 다 붙어 지저분해짐).
  if(kind==='sentence'||kind==='chant') return '';
  if(!code) return '';
  var m=String(code).match(/<span class=['"]k['"]>[\s\S]*?<\/span>|<k>[\s\S]*?<\/k>/g);
  if(!m || m.length<2) return '';
  var letters=m.map(function(s){ return s.replace(/<[^>]+>/g,''); }).join('');
  if(!letters) return '';
  if(letters===_mnPlainStripped(code)) return '';   // 코드가 두문자 나열뿐 → 코드줄=종합본이라 중복, 숨김
  return '<div class="'+(cls||'mn-chant')+'">'+letters+'</div>';
}
var _mnemCache={}, _mnemPromise=null, _mnemLoaded=false;
// 암기코드 마스터(mnemonics) 1회 로드·캐시. 실패해도 앱 진행(미해석 참조는 빈칸).
function loadMnemonics(){
  if(_mnemPromise) return _mnemPromise;
  _mnemPromise=(async function(){
    try{ var snap=await db.collection('mnemonics').get(); snap.forEach(function(d){ _mnemCache[d.id]=d.data()||{}; }); }catch(e){}
    _mnemLoaded=true;
  })();
  return _mnemPromise;
}
// ===== 표 마스터(tables) — mn 패턴 복제 =====
var _tblCache={}, _tblPromise=null, _tblLoaded=false;
function loadTables(){
  if(_tblPromise) return _tblPromise;
  _tblPromise=(async function(){
    try{ var snap=await db.collection('tables').get(); snap.forEach(function(d){ var t=d.data()||{}; if(typeof t.rows==='string'){ try{ t.rows=JSON.parse(t.rows); }catch(e){ t.rows=[]; } } _tblCache[d.id]=t; }); }catch(e){}
    _tblLoaded=true;
  })();
  return _tblPromise;
}
function tblEsc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
// 셀 화이트리스트: 전부 escape 후 안전 태그만 되살림. <br>·<span class="k">(빨강)·sup/sub는 표 종류 무관 항상 허용.
function tblCell(v, rich){
  var s=tblEsc(v);
  s=s.replace(/&lt;br\s*\/?&gt;/gi,'<br>');
  s=s.replace(/&lt;span class=['"]k['"]&gt;/gi,'<span class="k">').replace(/&lt;\/span&gt;/gi,'</span>');
  s=s.replace(/&lt;(\/?)(sup|sub)&gt;/gi,'<$1$2>');
  return s;
}
function tblYul(s){ return String(s).replace(/\(([^)]*[0-9%][^)]*)\)/g,'<span class="tbl-yul">($1)</span>'); }
// 계층 병합 표 렌더(운율 빨강). merge:[열] = 부모 바뀌면 자식 끊기는 rowspan.
function renderTbl(t){
  if(!t) return '';
  if(t.html && String(t.html).indexOf('<')>=0){ var cap0=t.caption_chant?'<div class="tbl-cap">'+tblEsc(t.caption_chant)+'</div>':''; return cap0+'<div class="jtbl-html">'+tblSanitizeHtml(t.html)+'</div>'; }
  if(!Array.isArray(t.headers) || !Array.isArray(t.rows)) return '';
  var rows=t.rows.map(function(r){ return r.slice(); });
  var mergeCols=(t.merge||[]).slice().sort(function(a,b){return a-b;}), skip={};
  mergeCols.forEach(function(c,ci){
    var anc=mergeCols.slice(0,ci), r=0;
    while(r<rows.length){
      var span=1;
      while(r+span<rows.length && rows[r+span][c]===rows[r][c] && anc.every(function(a){return rows[r+span][a]===rows[r][a];})) span++;
      for(var k=1;k<span;k++) skip[(r+k)+','+c]=1;
      rows[r]['_rs'+c]=span; r+=span;
    }
  });
  var rich=(t.type==='html');
  var thead='<thead><tr>'+t.headers.map(function(h){return '<th>'+tblCell(h, rich)+'</th>';}).join('')+'</tr></thead>';
  var tbody='<tbody>'+rows.map(function(row,r){
    var tds='';
    for(var c=0;c<t.headers.length;c++){
      if(skip[r+','+c]) continue;
      var rs=row['_rs'+c], span=(rs&&rs>1)?' rowspan="'+rs+'"':'';
      tds+='<td'+span+'>'+(rich?tblCell(row[c],true):tblYul(tblCell(row[c],false)))+'</td>';
    }
    return '<tr>'+tds+'</tr>';
  }).join('')+'</tbody>';
  var cap=t.caption_chant?'<div class="tbl-cap">'+tblEsc(t.caption_chant)+'</div>':'';
  return cap+'<div class="tbl-wrap"><table class="jtbl">'+thead+tbody+'</table></div>';
}
// "tbl://id" → 표 HTML. 객체(headers 포함)면 인라인 직접입력. 깨진 참조는 로드 완료 후에만 ⚠️.
function tblResolve(ref){
  if(ref && typeof ref==='object' && (Array.isArray(ref.headers)||ref.html)) return renderTbl(ref);
  if(typeof ref==='string' && ref.indexOf('tbl://')===0){
    var id=ref.slice(6), t=_tblCache[id];
    if(!t) return _tblLoaded ? '<div class="tbl-broken">⚠️ 표 참조 오류: tbl://'+tblEsc(id)+' (마스터에 없음)</div>' : '';
    return renderTbl(t);
  }
  return '';
}
// 문항 exp.tbl(문자열/배열) → 표 블록. 암기코드 뒤·개념설명 앞에 삽입.
// ⚡ 시험 포인트(exp.tip): O/X 판정 직후 함정·풀이요령 한 줄. 없으면 아무것도 안 그림(폴백).
function tipEnsureCSS(){
  if(document.getElementById('tip-css')) return;
  var s=document.createElement('style'); s.id='tip-css';
  s.textContent='.tip-box{border:1px solid #E2E8F0;border-radius:10px;padding:11px 13px;margin:12px 0;background:#fff;font-size:12.5px;line-height:1.62;color:#0F172A}'
    +'.tip-box .tip-ti{font-weight:800;font-size:12.5px;color:#0F172A;margin-bottom:5px;letter-spacing:-.2px}'
    +'.tip-box .tip-body{color:#334155}'
    +'.tip-box .tip-k{color:#C0392B;font-weight:700}';
  document.head.appendChild(s);
}
function tipBlockHTML(q){
  var t=(q&&q.exp&&q.exp.tip!=null)?String(q.exp.tip).trim():'';
  if(!t) return '';
  tipEnsureCSS();
  return '<div class="tip-box"><div class="tip-ti">\u26A1 \uC2DC\uD5D8 \uD3EC\uC778\uD2B8</div><div class="tip-body">'+rm(t,q)+'</div></div>';
}
function tblBlockHTML(q){
  var tb=q&&q.exp&&q.exp.tbl; var list=tb?(Array.isArray(tb)?tb.slice():[tb]):[];
  _conceptChain(q,'tbl').forEach(function(r){ list.push(r); });
  if(!list.length) return '';
  var seen={},uniq=[]; list.forEach(function(r){ var k=(typeof r==='string')?r:JSON.stringify(r); if(!seen[k]){seen[k]=1;uniq.push(r);} });
  return uniq.map(tblResolve).filter(Boolean).join('');
}
// ===== 그래프 마스터(graphs) — SVG 방식. 표 패턴 복제 =====
var _grpCache={}, _grpPromise=null, _grpLoaded=false;
function loadGraphs(){
  if(_grpPromise) return _grpPromise;
  _grpPromise=(async function(){
    try{ var snap=await db.collection('graphs').get(); snap.forEach(function(d){ _grpCache[d.id]=d.data()||{}; }); }catch(e){}
    _grpLoaded=true;
  })();
  return _grpPromise;
}
// ===== 개념 마스터(concepts) — mn 패턴 복제. cpt://id 또는 ot 태그가 이걸 참조 =====
var _cptCache={}, _cptPromise=null, _cptLoaded=false;
function loadConcepts(){
  if(_cptPromise) return _cptPromise;
  _cptPromise=(async function(){
    try{ var snap=await db.collection('concepts').get(); snap.forEach(function(d){ _cptCache[d.id]=d.data()||{}; }); }catch(e){}
    _cptLoaded=true;
  })();
  return _cptPromise;
}
// cpt id(또는 "cpt://id") → 마스터 개념 {id,name,cards,...} | null. 미해석은 null(깨진 참조).
function cptResolve(ref){
  if(!ref) return null;
  var id=(typeof ref==='string' && ref.indexOf('cpt://')===0) ? ref.slice(6) : ref;
  var c=_cptCache[id];
  return c ? Object.assign({id:id}, c) : null;
}
function tblSanitizeHtml(html){
  var s=String(html||'');
  s=s.replace(/<script[\s\S]*?<\/script>/gi,'');
  s=s.replace(/<(iframe|object|embed)[\s\S]*?<\/\1>/gi,'').replace(/<(iframe|object|embed)[^>]*>/gi,'');
  s=s.replace(/\son\w+\s*=\s*"[^"]*"/gi,'').replace(/\son\w+\s*=\s*'[^']*'/gi,'');
  s=s.replace(/javascript:/gi,'');
  return s;
}
// SVG sanitize: <script>·on*=·javascript:·foreignObject 제거 (admin과 동일)
function grpSanitizeSvg(svg){
  var s=String(svg||''); if(s.indexOf('<svg')<0) return '';
  s=s.replace(/<script[\s\S]*?<\/script>/gi,'');
  s=s.replace(/\son\w+\s*=\s*"[^"]*"/gi,'').replace(/\son\w+\s*=\s*'[^']*'/gi,'');
  s=s.replace(/javascript:/gi,'');
  s=s.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi,'');
  return s;
}
function grpRenderOne(g){
  if(g && g.svg && String(g.svg).indexOf('<svg')>=0) return '<div class="grp-box">'+grpSanitizeSvg(g.svg)+'</div>';
  return '';   // 파라미터형(type/params)은 렌더러 추후 — 지금은 표시 안 함
}
// "grp://id" → 그래프 HTML. 객체(svg 포함)면 인라인. 깨진 참조는 로드 완료 후에만 ⚠️.
function grpResolve(ref){
  if(ref && typeof ref==='object' && ref.svg) return grpRenderOne(ref);
  if(typeof ref==='string' && ref.indexOf('grp://')===0){
    var id=ref.slice(6), g=_grpCache[id];
    if(!g) return _grpLoaded ? '<div class="tbl-broken">⚠️ 그래프 참조 오류: grp://'+tblEsc(id)+' (마스터에 없음)</div>' : '';
    return grpRenderOne(g);
  }
  return '';
}
// 문항 exp.grp(문자열/배열) → 그래프 블록. 표 뒤·개념 앞.
function grpBlockHTML(q){
  var gr=q&&q.exp&&q.exp.grp; var list=gr?(Array.isArray(gr)?gr.slice():[gr]):[];
  _conceptChain(q,'grp').forEach(function(r){ list.push(r); });
  if(!list.length) return '';
  var seen={},uniq=[]; list.forEach(function(r){ var k=(typeof r==='string')?r:JSON.stringify(r); if(!seen[k]){seen[k]=1;uniq.push(r);} });
  return uniq.map(grpResolve).filter(Boolean).join('');
}

/* ===== 인터랙티브 마스터(interactives / itv) — grp 패턴 복제, 별도 마스터 =====
   - 저장: Firestore 'interactives', id upsert(grp 동형). 삭제는 admin 행별 버튼.
   - 참조: 문항 exp.itv ("itv://id" / 인라인 객체 / 배열). 개념 뒤 블록.
   - 보안: 템플릿 화이트리스트(_itvTemplates)만 렌더, 임의 JS 실행 없음. params=데이터만.
   - 계산: 엔진 고정 로직. 현재 템플릿: T1_curve_slider(경제 곡선), T5_inventory_flow(재고 원가흐름).
*/
var _itvCache={}, _itvPromise=null, _itvLoaded=false;
function loadInteractives(){
  if(_itvPromise) return _itvPromise;
  _itvPromise=(async function(){
    try{ var snap=await db.collection('interactives').get(); snap.forEach(function(d){ _itvCache[d.id]=d.data()||{}; }); }catch(e){}
    _itvLoaded=true;
  })();
  return _itvPromise;
}

/* ---- 자체 CSS 1회 주입 (style.css 비의존) ---- */
function itvEnsureCSS(){
  if(document.getElementById('itv-css')) return;
  var s=document.createElement('style'); s.id='itv-css';
  s.textContent=[
    /* 공통 */
    '.itv-box{border:1px solid #E2E8F0;border-radius:12px;padding:14px;margin:10px 0;font-size:13px;line-height:1.6;color:#0F172A;max-width:100%;min-width:0}',
    '.itv-ti{font-weight:800;font-size:14px;margin-bottom:8px}',
    '.itv-def{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:11px;font-size:12.5px;color:#334155;margin:0 0 10px}',
    '.itv-def b{color:#0F172A}.itv-def .term{display:block;margin:3px 0}',
    '.itv-defd{margin:0 0 10px}.itv-defd summary{font-size:12px;color:#64748B;cursor:pointer;font-weight:700}',
    '.itv-story{font-size:12.5px;margin:0 0 12px;color:#334155}',
    '.itv-ctrl{display:flex;align-items:center;gap:10px;margin:6px 0 2px}',
    '.itv-ctrl label{font-size:13px;font-weight:700;white-space:nowrap}',
    '.itv-ctrl input[type=range]{flex:1;accent-color:#C0392B;height:30px}',
    '.itv-rate{font-size:18px;font-weight:800;color:#C0392B;min-width:54px;text-align:right;font-variant-numeric:tabular-nums}',
    '.itv-hint{font-size:11px;color:#64748B;margin:2px 0 0}',
    '.itv-say{margin:13px 0 6px;padding:13px;border-radius:10px;background:#FFF7F5;border:1px solid #F3D6CF;font-size:14px;line-height:1.65}',
    '.itv-say .h{font-weight:800;margin-bottom:4px}.itv-say .w{color:#334155;font-size:13px}',
    '.itv-k{color:#C0392B;font-weight:700}',
    '.itv-tip{font-size:12px;color:#334155;background:#F8FAFC;border:1px dashed #E2E8F0;border-radius:8px;padding:9px;margin:8px 0 2px;min-height:18px}.itv-tip b{color:#0F172A}',
    /* T1 막대(NPV) */
    '.itv-t1bar{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:12px}',
    '.itv-t1bar .lab{width:86px;flex:none;font-weight:700}',
    '.itv-t1track{flex:1;height:22px;background:#F1F5F9;border-radius:6px;position:relative;overflow:hidden}',
    '.itv-t1track .mid{position:absolute;top:0;bottom:0;left:50%;width:1px;background:#94A3B8}',
    '.itv-t1fill{position:absolute;top:0;bottom:0;border-radius:6px;transition:all .08s linear}.itv-t1fill.neg{opacity:.55}',
    '.itv-bv{width:84px;flex:none;text-align:right;font-weight:800;font-variant-numeric:tabular-nums}',
    '.itv-det{margin-top:12px;border-top:1px solid #E2E8F0;padding-top:10px}.itv-det summary{font-size:12.5px;color:#64748B;cursor:pointer}',
    '.itv-det svg{width:100%;height:auto;display:block;margin-top:8px}',
    '.itv-legend{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;font-size:11px;color:#334155;margin-top:6px}',
    '.itv-legend i{display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:middle;margin-right:5px}',
    /* T5 막대(재고) */
    '.itv-mb{margin:14px 0 4px}.itv-mb .mh{font-size:13px;font-weight:800;margin-bottom:5px}',
    '.itv-mb.fifo .mh{color:#3B82F6}.itv-mb.wavg .mh{color:#10A37F}',
    '.itv-caps{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:3px}',
    '.itv-caps .cl{color:#0F172A}.itv-caps .cr{color:#64748B}.itv-caps .amt{font-weight:800}',
    '.itv-bar{position:relative;height:38px;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;background:#fff;user-select:none}',
    '.itv-seg{position:absolute;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;color:#334155;border-right:1px solid #9AAEC6;cursor:pointer;overflow:hidden;text-align:center;line-height:1.12;padding:0 1px}',
    '.itv-mb .itv-bar .itv-seg:last-of-type{border-right:none}',
    '.itv-bound{position:absolute;top:0;bottom:0;width:0;border-left:1.5px dashed #5B6B82;pointer-events:none;z-index:2}',
    '.itv-seg .sl{font-weight:800;color:#1f2d3d}.itv-seg .sq{font-weight:700}.itv-seg .sp{font-size:9px;color:#64748B;font-weight:600}',
    '.itv-mb.fifo .itv-seg{background:#E7F0FB}.itv-mb.wavg .itv-seg{background:#E6F4EF}',
    '.itv-kept{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(45deg,rgba(148,163,184,.20),rgba(148,163,184,.20) 5px,rgba(148,163,184,.32) 5px,rgba(148,163,184,.32) 10px);transition:left .3s ease,width .3s ease;pointer-events:none}',
    '.itv-div{position:absolute;top:-2px;bottom:-2px;width:2px;background:#C0392B;transition:left .3s ease;pointer-events:none}',
    '.itv-div:after{content:"";position:absolute;left:-4px;top:50%;width:10px;height:10px;margin-top:-5px;background:#C0392B;border-radius:50%}',
    '.itv-cmp{width:100%;border-collapse:collapse;font-size:12.5px;margin:12px 0 4px;table-layout:fixed}',
    '.itv-cmp th,.itv-cmp td{border-bottom:1px solid #E2E8F0;padding:7px 4px;text-align:right;vertical-align:top;word-break:keep-all}',
    '.itv-cmp th:first-child,.itv-cmp td:first-child{text-align:left}',
    '.itv-cmp thead th{color:#64748B;font-weight:700;font-size:11.5px}',
    '.itv-cmp tbody td{color:#0F172A;font-weight:800}.itv-cmp tbody td:first-child{font-weight:600;color:#64748B}',
    '.itv-cmp tbody tr.rfifo td:first-child{box-shadow:inset 3px 0 0 #3B82F6;padding-left:8px}',
    '.itv-cmp tbody tr.rwavg td:first-child{box-shadow:inset 3px 0 0 #10A37F;padding-left:8px}',
    '.itv-cmp .diff td{color:#C0392B;font-weight:700;border-bottom:none;font-size:11.5px}',
    '.qtbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:10px 0}',
    '.qtbl{border-collapse:collapse;width:100%;font-size:13px;background:#fff;margin:6px 0}',
    '.qtbl caption{caption-side:top;text-align:left;font-size:12px;font-weight:700;color:#475569;padding:4px 2px}',
    '.qtbl th,.qtbl td{border:1px solid #D9E2EC;padding:6px 9px;text-align:center;vertical-align:top;line-height:1.5;word-break:keep-all}',
    '.qtbl th{background:#EEF3F9;font-weight:700;color:#0F172A;white-space:nowrap}',
    '.qtbl td:first-child,.qtbl th:first-child{text-align:left}',
    '.qtbl-wrap .qtbl+.qtbl{margin-top:10px}',
    '.itv-mlegend{font-size:11px;color:#64748B;text-align:center;margin:4px 0 0}',
    '.itv-tl-era{font-size:12px;font-weight:700;color:#334155;margin:2px 0 6px}',
    '.itv-tl-scroll{display:block;width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;border:1px solid #F1F5F9;border-radius:8px;background:#fff}',
    '.itv-tl-track{position:relative}',
    '.itv-tl-line{position:absolute;top:14px;left:0;right:0;height:2px;background:#CBD5E1}',
    '.itv-tl-band{position:absolute;top:11px;height:8px;background:#EEF2F7}.itv-tl-band.alt{background:#E2E8F0}',
    '.itv-tl-plab{position:absolute;top:26px;font-size:9px;color:#64748B;transform:translateX(-50%);white-space:nowrap}',
    '.itv-tl-dot{position:absolute;top:9px;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #94A3B8;transform:translateX(-50%);cursor:pointer;z-index:2;transition:all .15s}',
    '.itv-tl-dot.on{background:#C0392B;border-color:#C0392B;width:16px;height:16px;top:7px}',
    '.itv-tl-tip{position:absolute;bottom:150%;left:50%;transform:translateX(-50%);white-space:nowrap;background:#0F172A;color:#fff;font-size:10px;font-weight:600;padding:3px 7px;border-radius:6px;opacity:0;visibility:hidden;transition:opacity .12s;pointer-events:none;z-index:9;box-shadow:0 2px 6px rgba(0,0,0,.18)}',
    '.itv-tl-tip:after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:#0F172A}',
    '.itv-tl-dot:hover .itv-tl-tip{opacity:1;visibility:visible}',
    '.itv-tl-dot:hover{border-color:#C0392B;z-index:8}',
    '.itv-tl-nav{flex:none;width:34px;height:30px;border:1px solid #E2E8F0;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;color:#334155}',
    '.itv-tl-top{position:sticky;top:0;z-index:5;background:#fff;padding:6px 0 5px;border-bottom:1px solid #EEF2F7}',
    '.itv-tl-cur{font-size:11px;color:#C0392B;font-weight:700;margin-top:4px;text-align:center}',
    '.itv-tl-list{margin-top:10px;max-height:60vh;overflow-y:auto;overscroll-behavior:contain;padding-right:2px}',
    '.itv-tl-tip{display:none}',
    '.itv-ev{border:1px solid #E2E8F0;border-left:3px solid #E2E8F0;border-radius:10px;padding:11px 12px;margin:8px 0;background:#fff;scroll-margin-top:100px;transition:border-color .2s,background .2s}',
    '.itv-ev.on{border-left-color:#C0392B;background:#FFF7F5}',
    '.itv-ev .evy{font-size:12px;color:#64748B}.itv-ev .evy b{color:#C0392B;font-size:15px}',
    '.itv-ev .evt{font-size:14px;font-weight:800;margin:3px 0 5px}',
    '.itv-ev .evs{font-size:13px;color:#334155;line-height:1.6}',
    '.itv-ev .evk{font-size:12px;color:#C0392B;font-weight:700;margin-top:6px}',
    '.itv-ev .evr{margin-top:6px}.itv-ev .evr .rftag{font-size:11px;color:#64748B;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:2px 7px}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ---- 공통 helper ---- */
function _itvEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _itvWon(x){ return '\u20A9'+Math.round(x).toLocaleString(); }
function _itvNum(x){ return (x>=0?'+':'\u2212')+Math.abs(x).toLocaleString(undefined,{maximumFractionDigits:0}); }
/* T1 계산 */
function _itvNPV(cf,r){ var s=0; for(var t=0;t<cf.length;t++) s+=cf[t]/Math.pow(1+r,t); return s; }
function _itvIRR(cf){ var lo=-0.9,hi=5,flo=_itvNPV(cf,lo); for(var i=0;i<90;i++){var m=(lo+hi)/2,fm=_itvNPV(cf,m); if(flo*fm<=0)hi=m; else {lo=m;flo=fm;}} return (lo+hi)/2; }
function _itvCross(a,b){ function f(r){return _itvNPV(a,r)-_itvNPV(b,r);} var lo=-0.9,hi=5,flo=f(lo); for(var i=0;i<90;i++){var m=(lo+hi)/2,fm=f(m); if(flo*fm<=0)hi=m; else {lo=m;flo=fm;}} return (lo+hi)/2; }
/* T5 계산 */
function _itvInvAgg(layers){ var Q=0,C=0; layers.forEach(function(l){Q+=l.qty;C+=l.qty*l.cost;}); return {Q:Q,C:C,avg:Q?C/Q:0}; }
function _itvFifoCogs(layers,s){ var rem=s,cg=0; for(var i=0;i<layers.length;i++){ var t=Math.min(layers[i].qty,rem); rem-=t; cg+=t*layers[i].cost; } return cg; }

/* ---- 인스턴스 레지스트리 + 디스패처 ---- */
window._itvReg=window._itvReg||{}; var _itvSeq=0;
function itvUpdate(instId, rawVal){
  var P=window._itvReg[instId]; if(!P) return;
  var fn=_itvUpdaters[P.template]; if(fn){ try{ fn(instId, rawVal, P); }catch(e){} }
}
/* T5 상자 탭 → 해당 인스턴스 tip 갱신 */
function itvTap(instId, qty, cost, label, avg){
  var t=document.getElementById(instId+'_tip'); if(!t) return;
  if(avg) t.innerHTML='<b>가중평균</b>: 전체를 평균단가 <b>'+_itvWon(cost)+'</b>로 섞음. 칸막이 왼쪽 '+qty+'개 \u00D7 '+_itvWon(cost)+' = <b>'+_itvWon(qty*cost)+'</b>.';
  else t.innerHTML='<b>'+_itvEsc(label)+'</b> '+qty+'개 \u00D7 개당 '+_itvWon(cost)+' = <b>'+_itvWon(qty*cost)+'</b>. (선입선출은 싼 것부터 팔린 걸로 침)';
}

/* ================= 업데이터 ================= */
var _itvUpdaters={
  T1_curve_slider:function(instId, rawVal, P){
    var rc=P.rate, div=(rc.divisor||1), r=parseFloat(rawVal)/div;
    var d=document.getElementById(instId); if(!d) return;
    var rv=d.querySelector('.itv-rate>span'); if(rv) rv.textContent=(rawVal*1).toFixed(rc.step<1?1:0);
    var series=P.series, vals=series.map(function(s){return _itvNPV(s.cashflows,r);});
    series.forEach(function(s,i){
      var f=d.querySelector('#'+instId+'_f'+i), bv=d.querySelector('#'+instId+'_v'+i);
      var v=vals[i], pct=Math.max(-48,Math.min(48, v/P.scale*48));
      if(f){ f.classList.toggle('neg', v<0); if(v>=0){ f.style.left='50%'; f.style.width=pct+'%'; } else { f.style.width=(-pct)+'%'; f.style.left=(50-(-pct))+'%'; } }
      if(bv){ bv.textContent=_itvNum(v)+(P.unit||''); bv.style.color=v>=0?'#0F172A':'#C0392B'; }
    });
    var say=d.querySelector('#'+instId+'_say'), why=d.querySelector('#'+instId+'_why');
    if(say && series.length===2){
      var a=vals[0],b=vals[1],A=series[0],B=series[1],rp=(r*100).toFixed(1)+'%';
      if(Math.abs(a-b)<Math.max(1,P.scale*0.002)){ say.innerHTML='지금은 <b>'+_itvEsc(A.name)+'와 '+_itvEsc(B.name)+'가 똑같다</b> (만나는 지점)';
        if(why) why.textContent='요구수익률 '+rp+'에서 둘의 남는 돈이 같아집니다. 이 점을 넘으면 순위가 뒤집혀요.'; }
      else if(a>b){ say.innerHTML='지금은 <b style="color:'+A.color+'">'+_itvEsc(A.name)+'</b>가 더 남는다';
        if(why) why.textContent=(b>=0)?'요구수익률 '+rp+'은 낮은 편 — 늦게 받는 '+A.name+'도 손해가 작아서 '+A.name+'가 더 많이 남습니다(둘 다 이득).':'요구수익률 '+rp+'에선 '+B.name+'는 손해, '+A.name+'는 이득. '+A.name+'가 낫습니다.'; }
      else { say.innerHTML='지금은 <b style="color:'+B.color+'">'+_itvEsc(B.name)+'</b>가 더 남는다';
        if(why){ if(a>=0) why.textContent='요구수익률 '+rp+'로 오르니 늦게 받는 '+A.name+'가 불리해져 '+B.name+'가 더 많이 남습니다(둘 다 이득).';
          else if(b>=0) why.innerHTML='요구수익률 '+rp+'에선 <b class="itv-k">'+A.name+'는 본전도 못 넘어 손해</b>, '+B.name+'는 이득.';
          else why.textContent='요구수익률 '+rp+'은 너무 높아 둘 다 손해. 그래도 '+B.name+'가 덜 손해입니다.'; } }
    }
    var g=P.geo;
    var rl=d.querySelector('#'+instId+'_rline'); if(rl){ rl.setAttribute('x1',g.X(r)); rl.setAttribute('x2',g.X(r)); }
    series.forEach(function(s,i){ var dot=d.querySelector('#'+instId+'_d'+i); if(dot){ dot.setAttribute('cx',g.X(r)); dot.setAttribute('cy',g.Y(vals[i])); } });
  },
  T5_inventory_flow:function(instId, rawVal, P){
    var s=parseInt(rawVal,10), Q=P.Q, C=P.C, avg=P.avg, sale=P.sale, layers=P.layers;
    var d=document.getElementById(instId); if(!d) return;
    var sv=d.querySelector('#'+instId+'_sv'); if(sv) sv.textContent=s;
    var pct=Q?s/Q*100:0;
    ['f','w'].forEach(function(p){
      var kept=d.querySelector('#'+instId+'_'+p+'_kept'), dv=d.querySelector('#'+instId+'_'+p+'_div');
      if(kept){ kept.style.left=pct+'%'; kept.style.width=(100-pct)+'%'; }
      if(dv){ dv.style.left=pct+'%'; }
    });
    var fcg=_itvFifoCogs(layers,s), fen=C-fcg, wcg=s*avg, wen=(Q-s)*avg, fgp=s*sale-fcg, wgp=s*sale-wcg;
    function set(id,v){ var el=d.querySelector('#'+instId+'_'+id); if(el) el.textContent=_itvWon(v); }
    set('f_cg',fcg); set('f_en',fen); set('w_cg',wcg); set('w_en',wen);
    set('t_fcg',fcg); set('t_fen',fen); set('t_fgp',fgp); set('t_wcg',wcg); set('t_wen',wen); set('t_wgp',wgp);
    function diff(id,a,b,word){ var el=d.querySelector('#'+instId+'_'+id); if(el) el.innerHTML=(a===b?'동일':((word(a,b))+'<br>'+_itvWon(Math.abs(a-b))+(id==='t_dcg'?' 적음':' 많음'))); }
    var dcg=d.querySelector('#'+instId+'_t_dcg'); if(dcg) dcg.innerHTML=(fcg<wcg?'선입선출':'가중평균')+'<br>'+_itvWon(Math.abs(fcg-wcg))+' 적음';
    var den=d.querySelector('#'+instId+'_t_den'); if(den) den.innerHTML=(fen>wen?'선입선출':'가중평균')+'<br>'+_itvWon(Math.abs(fen-wen))+' 많음';
    var dgp=d.querySelector('#'+instId+'_t_dgp'); if(dgp) dgp.innerHTML=(fgp>wgp?'선입선출':'가중평균')+'<br>'+_itvWon(Math.abs(fgp-wgp))+' 많음';
    var h=d.querySelector('#'+instId+'_sayH'), w=d.querySelector('#'+instId+'_sayW');
    if(h&&w){ if(s===0){ h.textContent='아직 안 팔았습니다'; w.textContent='판매수량을 올리면 칸막이가 오른쪽으로 가며 기말재고가 줄어듭니다.'; }
      else { h.innerHTML='같은 '+s+'개를 팔아도 — 선입선출 매출원가 '+_itvWon(fcg)+' vs 가중평균 '+_itvWon(wcg);
        w.innerHTML='물건값이 오르는 중이라, 선입선출은 <b>싼 것부터</b> 팔린 걸로 쳐 매출원가가 작고 <b class="itv-k">이익이 '+_itvWon(Math.abs(fgp-wgp))+' 더 큽니다</b>. 대신 비싼 게 남아 기말재고는 선입선출이 더 큽니다.'; } }
  }
};

/* ================= 템플릿(렌더) ================= */
var _itvTemplates={
  T1_curve_slider:function(it, instId){
    var p=it.params||{}; var rc=p.rate||{min:0,max:20,step:0.1,default:8,divisor:100,label:'요구수익률',unit:'%'};
    var series=(p.series||[]).map(function(s){return {key:s.key,name:s.name,color:s.color||'#2563EB',cashflows:s.cashflows||[]};});
    var unit=p.unit||'';
    var rMin=(rc.min||0)/(rc.divisor||1), rMax=(rc.max||20)/(rc.divisor||1);
    var maxAbs=0; series.forEach(function(s){ [rMin,(rMin+rMax)/2,rMax,0].forEach(function(r){ maxAbs=Math.max(maxAbs, Math.abs(_itvNPV(s.cashflows,r))); }); });
    var scale=maxAbs*1.05 || 100;
    var W=520,H=300,L=44,Rr=16,T=12,Bm=34, pw=W-L-Rr, ph=H-T-Bm, yMax=scale, yMin=-scale;
    function X(r){return L+(r-rMin)/(rMax-rMin)*pw;} function Y(v){return T+(yMax-v)/(yMax-yMin)*ph;}
    function curve(cf,col){var dd='',n=80;for(var i=0;i<=n;i++){var r=rMin+(rMax-rMin)*i/n;dd+=(i?'L':'M')+X(r).toFixed(1)+' '+Y(_itvNPV(cf,r)).toFixed(1)+' ';}return '<path d="'+dd.trim()+'" fill="none" stroke="'+col+'" stroke-width="2"/>';}
    window._itvReg[instId]={template:'T1_curve_slider', rate:rc, series:series, unit:unit, scale:scale, geo:{X:X,Y:Y}, defaultVal:rc.default};
    var defHTML=''; if(p.intro) defHTML+='<div class="itv-def">'+p.intro+'</div>';
    if(Array.isArray(p.terms)&&p.terms.length){ defHTML+='<div class="itv-def">'+p.terms.map(function(t){return '<span class="term"><b>'+_itvEsc(t.t)+'</b> — '+_itvEsc(t.d)+'</span>';}).join('')+'</div>'; }
    var storyHTML=(it.story||p.story)?'<div class="itv-story">'+(it.story||p.story)+'</div>':'';
    var ctrl='<div class="itv-ctrl"><label>'+_itvEsc(rc.label||'')+'</label>'
      +'<input type="range" min="'+rc.min+'" max="'+rc.max+'" step="'+rc.step+'" value="'+rc.default+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
      +'<div class="itv-rate"><span>'+Number(rc.default).toFixed(rc.step<1?1:0)+'</span>'+_itvEsc(rc.unit||'')+'</div></div>';
    var hint=rc.hint?'<p class="itv-hint">'+_itvEsc(rc.hint)+'</p>':'';
    var say='<div class="itv-say"><div class="h" id="'+instId+'_say">—</div><div class="w" id="'+instId+'_why">—</div></div>';
    var bars=series.map(function(s,i){ return '<div class="itv-t1bar"><span class="lab" style="color:'+s.color+'">'+_itvEsc(s.name)+'</span>'
      +'<div class="itv-t1track"><div class="mid"></div><div class="itv-t1fill" id="'+instId+'_f'+i+'" style="background:'+s.color+'"></div></div>'
      +'<span class="itv-bv" id="'+instId+'_v'+i+'">—</span></div>'; }).join('');
    var barNote='<p class="itv-hint" style="text-align:center">막대가 가운데 선보다 오른쪽 = 남는 장사 / 왼쪽(연한 색) = 손해</p>';
    var grid='<line x1="'+L+'" y1="'+Y(0)+'" x2="'+(W-Rr)+'" y2="'+Y(0)+'" stroke="#94A3B8"/>'
      +'<text x="'+(L-6)+'" y="'+(Y(0)+3)+'" text-anchor="end" font-size="9" fill="#64748B">0</text>';
    for(var ti=0;ti<=4;ti++){ var rr=rMin+(rMax-rMin)*ti/4; grid+='<text x="'+X(rr)+'" y="'+(H-18)+'" text-anchor="middle" font-size="9" fill="#94A3B8">'+(rr*(rc.divisor||1)).toFixed(0)+_itvEsc(rc.unit||'')+'</text>'; }
    if(!p.markers||p.markers.showIRR!==false){ series.forEach(function(s){ var irr=_itvIRR(s.cashflows); if(irr>=rMin&&irr<=rMax) grid+='<circle cx="'+X(irr)+'" cy="'+Y(0)+'" r="3.5" fill="'+s.color+'"/>'; }); }
    var crossNote='';
    if(series.length===2 && (!p.markers||p.markers.showCrossover!==false)){
      var cr=_itvCross(series[0].cashflows,series[1].cashflows);
      if(cr>=rMin&&cr<=rMax){ var cyv=Y(_itvNPV(series[0].cashflows,cr));
        grid+='<circle cx="'+X(cr)+'" cy="'+cyv+'" r="4" fill="none" stroke="#C0392B" stroke-width="1.5"/>'
          +'<text x="'+X(cr)+'" y="'+(cyv-8)+'" text-anchor="middle" font-size="9" fill="#C0392B">만나는 점 '+(cr*(rc.divisor||1)).toFixed(1)+_itvEsc(rc.unit||'')+'</text>';
        crossNote='<p class="itv-hint">선이 <b>0</b>을 지나는 곳 = 본전 지점(내부수익률). 두 선이 <b>만나는 곳</b>(<span class="itv-k">'+(cr*(rc.divisor||1)).toFixed(1)+_itvEsc(rc.unit||'')+'</span>) = 둘이 똑같아지는 지점, 여기를 넘으면 순위가 뒤집혀요.'; }
    }
    var curves=series.map(function(s){return curve(s.cashflows,s.color);}).join('');
    var dots=series.map(function(s,i){return '<circle id="'+instId+'_d'+i+'" r="3.5" fill="'+s.color+'"/>';}).join('');
    var legend='<div class="itv-legend">'+series.map(function(s){return '<span><i style="background:'+s.color+'"></i>'+_itvEsc(s.name)+'</span>';}).join('')+'<span><i style="background:#C0392B"></i>지금 위치</span></div>';
    var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img">'+grid+curves+'<line id="'+instId+'_rline" stroke="#C0392B" stroke-width="1.5" stroke-dasharray="4 3" y1="'+T+'" y2="'+(H-Bm)+'"/>'+dots+'</svg>';
    var det='<details class="itv-det"><summary>전체 그림으로 보기</summary>'+svg+legend+crossNote+'</details>';
    var ti2=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
    return '<div class="itv-box" id="'+instId+'">'+ti2+defHTML+storyHTML+ctrl+hint+say+bars+barNote+det+'</div>';
  },

  T5_inventory_flow:function(it, instId){
    var p=it.params||{}; var layers=(p.layers||[]).map(function(l){return {label:l.label,qty:l.qty,cost:l.cost};});
    var sc=p.sell||{min:0,max:100,step:5,default:0,label:'판매 수량'}; var sale=p.salePrice||0;
    var agg=_itvInvAgg(layers), Q=agg.Q, C=agg.C, avg=agg.avg;
    window._itvReg[instId]={template:'T5_inventory_flow', layers:layers, Q:Q, C:C, avg:avg, sale:sale, sell:sc, defaultVal:sc.default};
    // 정의/스토리
    var defHTML='';
    if(Array.isArray(p.terms)&&p.terms.length) defHTML='<details class="itv-defd"><summary>용어 먼저 보기 ▾</summary><div class="itv-def" style="margin-top:6px">'+p.terms.map(function(t){return '<span class="term"><b>'+_itvEsc(t.t)+'</b> — '+_itvEsc(t.d)+'</span>';}).join('')+'</div></details>';
    var storyHTML=(it.story||p.story)?'<div class="itv-story">'+(it.story||p.story)+'</div>':'';
    var ctrl='<div class="itv-ctrl"><label>'+_itvEsc(sc.label||'판매 수량')+'</label>'
      +'<input type="range" min="'+sc.min+'" max="'+(sc.max||Q)+'" step="'+(sc.step||1)+'" value="'+(sc.default||0)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
      +'<div class="itv-rate"><span id="'+instId+'_sv">'+(sc.default||0)+'</span>개</div></div>';
    var legend='<p class="itv-mlegend">칸막이 <span style="color:#C0392B;font-weight:800">┃</span> 왼쪽=매출원가 · 오른쪽(빗금)=기말재고</p>';
    // FIFO 막대(레이어 세그먼트)
    function fifoBar(){ var acc=0,h='',bounds=[]; layers.forEach(function(l){ var w=l.qty/Q*100;
      h+='<div class="itv-seg" style="left:'+acc+'%;width:'+w+'%" onclick="itvTap(\''+instId+'\','+l.qty+','+Math.round(l.cost)+',\''+_itvEsc(l.label)+'\',0)"><span class="sl">'+_itvEsc(l.label.replace(' 매입',''))+'</span><span class="sq">'+l.qty+'개</span><span class="sp">'+_itvWon(l.cost)+'</span></div>'; acc+=w; bounds.push(acc); });
      h+='<div class="itv-kept" id="'+instId+'_f_kept"></div>';
      bounds.slice(0,-1).forEach(function(b){ h+='<div class="itv-bound" style="left:'+b+'%"></div>'; });
      h+='<div class="itv-div" id="'+instId+'_f_div"></div>'; return h; }
    // 가중평균 막대(단일 평균)
    function wavgBar(){ return '<div class="itv-seg" style="left:0;width:100%" onclick="itvTap(\''+instId+'\','+Q+','+Math.round(avg)+',\'평균단가\',1)"><span class="sl">평균단가</span><span class="sp">'+_itvWon(avg)+' \u00D7 '+Q+'개</span></div>'
      +'<div class="itv-kept" id="'+instId+'_w_kept"></div><div class="itv-div" id="'+instId+'_w_div"></div>'; }
    var mbF='<div class="itv-mb fifo"><div class="mh">① 선입선출</div>'
      +'<div class="itv-caps"><span class="cl">매출원가 <span class="amt" id="'+instId+'_f_cg">—</span></span><span class="cr">기말재고 <span class="amt" id="'+instId+'_f_en">—</span></span></div>'
      +'<div class="itv-bar">'+fifoBar()+'</div></div>';
    var mbW='<div class="itv-mb wavg"><div class="mh">② 가중평균</div>'
      +'<div class="itv-caps"><span class="cl">매출원가 <span class="amt" id="'+instId+'_w_cg">—</span></span><span class="cr">기말재고 <span class="amt" id="'+instId+'_w_en">—</span></span></div>'
      +'<div class="itv-bar">'+wavgBar()+'</div></div>';
    var tip='<div class="itv-tip" id="'+instId+'_tip">상자를 탭하면 어떤 매입분인지 설명이 나옵니다.</div>';
    var table='<table class="itv-cmp"><colgroup><col style="width:24%"><col style="width:25%"><col style="width:25%"><col style="width:26%"></colgroup>'
      +'<thead><tr><th></th><th>매출<br>원가</th><th>기말<br>재고</th><th>매출<br>총이익</th></tr></thead><tbody>'
      +'<tr class="rfifo"><td>선입<br>선출</td><td id="'+instId+'_t_fcg">—</td><td id="'+instId+'_t_fen">—</td><td id="'+instId+'_t_fgp">—</td></tr>'
      +'<tr class="rwavg"><td>가중<br>평균</td><td id="'+instId+'_t_wcg">—</td><td id="'+instId+'_t_wen">—</td><td id="'+instId+'_t_wgp">—</td></tr>'
      +'<tr class="diff"><td>차이</td><td id="'+instId+'_t_dcg">—</td><td id="'+instId+'_t_den">—</td><td id="'+instId+'_t_dgp">—</td></tr>'
      +'</tbody></table>';
    var say='<div class="itv-say"><div class="h" id="'+instId+'_sayH">—</div><div class="w" id="'+instId+'_sayW">—</div></div>';
    var note=p.lifoNote?'<p class="itv-hint">※ '+_itvEsc(p.lifoNote)+'</p>':'';
    var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
    return '<div class="itv-box" id="'+instId+'">'+ti+defHTML+storyHTML+ctrl+legend+mbF+mbW+tip+table+say+note+'</div>';
  }
};

/* ---- T2 연표(timeline) : 위 sticky 가로 타임라인(nav) + 아래 세로 사건 목록. 점 탭→해당 사건으로 스크롤, 스크롤→점 동기화 ---- */
function setActiveT2(instId, P, i, doScroll){
  i=Math.max(0, Math.min(P.nodes.length-1, i|0));
  var d=document.getElementById(instId); if(!d) return;
  for(var j=0;j<P.nodes.length;j++){
    var dot=d.querySelector('#'+instId+'_d'+j); if(dot) dot.classList.toggle('on', j===i);
    var ev=d.querySelector('#'+instId+'_ev'+j); if(ev) ev.classList.toggle('on', j===i);
  }
  var n=P.nodes[i], cur=d.querySelector('#'+instId+'_cur'); if(cur) cur.textContent=n.year+' \u00B7 '+(n.title||'');
  var sc=d.querySelector('#'+instId+'_scroll'), cd=d.querySelector('#'+instId+'_d'+i);
  if(sc&&cd){ var x=parseFloat(cd.style.left)||0; sc.scrollLeft=Math.max(0, x - sc.clientWidth/2); }
  if(doScroll){ var t=d.querySelector('#'+instId+'_ev'+i), lst=d.querySelector('.itv-tl-list'); if(t&&lst){ var dl=t.getBoundingClientRect().top-lst.getBoundingClientRect().top; lst.scrollTo({top:lst.scrollTop+dl-6,behavior:'smooth'}); } else if(t&&t.scrollIntoView){ t.scrollIntoView({behavior:'smooth',block:'nearest'}); } }
}
function itvTlWire(instId){
  var P=window._itvReg[instId]; if(!P||P.wired) return; P.wired=true;
  var box0=document.getElementById(instId); var tgt=(box0&&box0.querySelector('.itv-tl-list'))||window;
  (function(){ var scr=box0&&box0.querySelector('#'+instId+'_scroll'), cur=box0&&box0.querySelector('#'+instId+'_cur'); if(!scr||!cur)return;
    function _lab(k){ var n=P.nodes[k]; return n?(n.year+' \u00B7 '+(n.title||'')):''; }
    function _act(){ for(var j=0;j<P.nodes.length;j++){ var dt=box0.querySelector('#'+instId+'_d'+j); if(dt&&dt.classList.contains('on'))return j; } return 0; }
    scr.addEventListener('mouseover',function(e){ var d=e.target.closest?e.target.closest('.itv-tl-dot'):null; if(!d)return; var m=d.id.lastIndexOf('_d'); if(m<0)return; cur.textContent=_lab(parseInt(d.id.slice(m+2),10)); });
    scr.addEventListener('mouseout',function(e){ var d=e.target.closest?e.target.closest('.itv-tl-dot'):null; if(!d)return; cur.textContent=_lab(_act()); });
  })();
  var fn=function(){ if(P._raf) return; P._raf=requestAnimationFrame(function(){ P._raf=0;
    var d=document.getElementById(instId); if(!d){ tgt.removeEventListener('scroll',fn); return; }
    var lst=d.querySelector('.itv-tl-list'); var base=lst?lst.getBoundingClientRect().top+14:140;
    var act=0; for(var j=0;j<P.nodes.length;j++){ var c=d.querySelector('#'+instId+'_ev'+j); if(c && c.getBoundingClientRect().top<=base) act=j; }
    setActiveT2(instId,P,act,false);
  }); };
  tgt.addEventListener('scroll',fn,{passive:true});
}
_itvTemplates.T2_timeline=function(it, instId){
  var p=it.params||{}, phases=(p.phases||[]).slice(), era=p.era||{};
  var nodes=(p.nodes||[]).slice().sort(function(a,b){return (a.year||0)-(b.year||0);});
  var byPhase={}; phases.forEach(function(ph,pi){ byPhase[ph]={pi:pi,list:[]}; });
  nodes.forEach(function(n){ if(byPhase[n.phase]) byPhase[n.phase].list.push(n); });
  var counts=phases.map(function(ph){ return byPhase[ph]?byPhase[ph].list.length:0; });
  var bandPx=Math.max.apply(null, counts.map(function(k){return k*30+24;}).concat([90]));
  var totalW=Math.max(1,phases.length)*bandPx;
  nodes.forEach(function(n){ var b=byPhase[n.phase]; if(!b){n._x=0;return;} var j=b.list.indexOf(n),k=b.list.length; n._x=b.pi*bandPx+(j+1)/(k+1)*bandPx; });
  window._itvReg[instId]={template:'T2_timeline', nodes:nodes, phases:phases, defaultVal:0, wired:false};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var eraLab='<div class="itv-tl-era">'+_itvEsc(era.label||'')+' '+_itvEsc(String(era.from||''))+'\u2013'+_itvEsc(String(era.to||''))+'</div>';
  var bands=''; phases.forEach(function(ph,pi){
    bands+='<div class="itv-tl-band'+(pi%2?' alt':'')+'" style="left:'+(pi*bandPx)+'px;width:'+bandPx+'px"></div>';
    bands+='<div class="itv-tl-plab" style="left:'+((pi+0.5)*bandPx)+'px">'+_itvEsc(ph)+'</div>';
  });
  var dots=''; nodes.forEach(function(n,i){ var lab=_itvEsc(n.year+' \u00B7 '+(n.title||'')); dots+='<div class="itv-tl-dot" id="'+instId+'_d'+i+'" style="left:'+n._x+'px" title="'+lab+'" onclick="itvUpdate(\''+instId+'\','+i+')">'+'</div>'; });
  var track='<div class="itv-tl-scroll" id="'+instId+'_scroll"><div class="itv-tl-track" style="width:'+totalW+'px;height:48px"><div class="itv-tl-line"></div>'+bands+dots+'</div></div>';
  var top='<div class="itv-tl-top">'+eraLab+track+'<div class="itv-tl-cur" id="'+instId+'_cur">'+_itvEsc(nodes.length?(nodes[0].year+' \u00B7 '+(nodes[0].title||'')):'')+'</div></div>';
  var hint='<p class="itv-hint" style="text-align:center">위 점을 누르면 아래 그 사건으로 이동합니다.</p>';
  var list=nodes.map(function(n,i){
    var tags=[]; if(n.cpt)tags.push('개념카드'); if(n.tbl)tags.push('표'); if(n.grp)tags.push('그래프');
    return '<div class="itv-ev" id="'+instId+'_ev'+i+'">'
      +'<div class="evy"><b>'+_itvEsc(String(n.year))+'</b> \u00B7 '+_itvEsc(n.phase||'')+'</div>'
      +'<div class="evt">'+_itvEsc(n.title||'')+'</div>'
      +'<div class="evs">'+_itvEsc(n.story||'')+'</div>'
      +(n.key?'<div class="evk">핵심: '+_itvEsc(n.key)+'</div>':'')
      +(tags.length?'<div class="evr"><span class="rftag">\uD83D\uDD17 '+tags.join(' \u00B7 ')+' 연결</span></div>':'')
      +'</div>';
  }).join('');
  return '<div class="itv-box" id="'+instId+'">'+ti+top+hint+'<div class="itv-tl-list">'+list+'</div></div>';
};
_itvUpdaters.T2_timeline=function(instId, rawVal, P){ setActiveT2(instId, P, parseInt(rawVal,10)||0, true); };

/* ---- 렌더 1건 ---- */
function itvRenderOne(it){
  if(!it||typeof it!=='object') return '';
  var fn=_itvTemplates[it.template];
  if(!fn) return _itvLoaded?'<div class="tbl-broken">⚠️ 인터랙티브 템플릿 미지원: '+_itvEsc(it.template||'(없음)')+'</div>':'';
  itvEnsureCSS();
  var instId='itv_inst_'+(++_itvSeq);
  try{ return fn(it, instId); }catch(e){ return '<div class="tbl-broken">⚠️ 인터랙티브 렌더 오류</div>'; }
}
/* ---- "itv://id" / 인라인 객체 → HTML ---- */
function itvResolve(ref){
  if(ref && typeof ref==='object' && ref.template) return itvRenderOne(ref);
  if(typeof ref==='string' && ref.indexOf('itv://')===0){
    var id=ref.slice(6), it=_itvCache[id];
    if(!it) return _itvLoaded?'<div class="tbl-broken">⚠️ 인터랙티브 참조 오류: itv://'+_itvEsc(id)+' (마스터에 없음)</div>':'';
    return itvRenderOne(Object.assign({id:id}, it));
  }
  return '';
}
/* ---- 문항 exp.itv → 블록 (새 인스턴스만 초기화, 재렌더 안전) ---- */
function itvInitPending(){
  var boxes=document.querySelectorAll('.itv-box');
  for(var i=0;i<boxes.length;i++){ var el=boxes[i];
    if(el.getAttribute('data-itv-init')) continue;
    var P=window._itvReg[el.id]; if(!P) continue;
    el.setAttribute('data-itv-init','1');
    try{ if(P.template==='T2_timeline'){ setActiveT2(el.id,P,P.defaultVal||0,false); itvTlWire(el.id); } else { itvUpdate(el.id, P.defaultVal); } }catch(e){}
  }
}
function itvBlockHTML(q){
  var iv=q&&q.exp&&q.exp.itv; if(!iv) return '';
  var list=Array.isArray(iv)?iv:[iv];
  var html=list.map(itvResolve).filter(Boolean).join('');
  if(html) setTimeout(itvInitPending,0);
  return html;
}
// mn 항목 → {code,desc}. "mn://id"면 마스터에서 치환, 객체/문자열은 그대로(하위호환).
function mnResolve(mn){
  // 반환: {boxes:[{code,desc}], kind, code, desc(첫 박스=하위호환), broken?, ref?}
  function norm(o){
    var bx;
    if(o && Array.isArray(o.boxes) && o.boxes.length) bx=o.boxes.map(function(b){ return {code:(b&&b.code)||'', desc:(b&&b.desc)||''}; });
    else bx=[{code:(o&&o.code)||'', desc:(o&&o.desc)||''}];   // 레거시 단일쌍 → 박스 1개로 승격
    return {boxes:bx, kind:o&&o.kind, code:bx[0].code, desc:bx[0].desc};
  }
  if(typeof mn==='string' && mn.indexOf('mn://')===0){
    var id=mn.slice(5), m=_mnemCache[id];
    if(m) return norm(m);
    return {boxes:[], code:'', desc:'', broken:_mnemLoaded, ref:id};   // 로드 완료 후에도 없으면 깨진 참조
  }
  if(mn && typeof mn==='object') return norm(mn);
  if(typeof mn==='string') return {boxes:[{code:mn,desc:''}], code:mn, desc:''};
  return {boxes:[], code:'', desc:''};
}
var MN_CIRCLED=['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
// 해석된 mn 1건 → 박스별 카드 배열({code,desc,kind,num}). 박스 2개↑면 num=①②…
function mnBoxCards(_r){
  if(_r.broken) return [{broken:true, ref:_r.ref}];
  var boxes=_r.boxes||[]; var multi=boxes.length>1; var cards=[];
  boxes.forEach(function(bx,bi){
    var code=bx.code||'', desc=bx.desc||'';
    if(!code && !desc) return;
    cards.push({code:code, desc:desc, kind:_r.kind, num:''});
  });
  return cards;
}
function buildMnemonic(card){
  const m=card.mn; if(!m) return '';
  // 단일 항목(문자열/객체)을 암기코드 한 박스로 — 배열 지원을 위한 내부 헬퍼
  function oneMn(item){
    const _r=mnResolve(item);
    if(_r.broken){ return '<div class="learn-section mnem-sec"><div class="learn-section-title mnem-ti">암기코드</div><div class="learn-section-body" style="color:#A32D2D;font-size:12.5px">⚠️ 참조 오류: mn://'+_r.ref+' (마스터에 없음)</div></div>'; }
    var cards=mnBoxCards(_r);
    if(!cards.length) return '';
    var inner=cards.map(function(cd,i){
      var num=cd.num?'<span class="mn-num">'+cd.num+'</span> ':'';
      var sep=i>0?'<div class="mnem-box-sep"></div>':'';
      return sep+num+mnChantHTML(cd.code,'mnem-chant',cd.kind)+'<span class="mnem-code">'+cd.code+'</span>'+(cd.desc?'<div class="mnem-desc'+((cd.desc&&(cd.desc.match(/↓/g)||[]).length>=2&&cd.desc.indexOf('↑')<0)?' mn-flow':'')+'">'+cd.desc+'</div>':'');
    }).join('');
    return '<div class="learn-section mnem-sec"><div class="learn-section-title mnem-ti">암기코드</div>'
      +'<div class="learn-section-body">'+inner+'</div></div>';
  }
  if(Array.isArray(m)) return m.map(oneMn).join('');   // 배열이면 박스 여러 개
  return oneMn(m);                                       // 객체/문자열 단일(하위호환)
}
function buildLearnHTML(card){
  const mnHTML=(function(){try{return buildMnemonic(card);}catch(e){return '';}})();
  const L=card.learn;
  const panelInner=((L||card.img)?buildLearnPanel(L||{}, card.img):'')+mnHTML;
  if(!panelInner) return '';
  const btnLabel=learnOpen?'📖 학습 노트 닫기 ▲':'📖 학습 노트 보기 ▼';
  const panelDisplay=learnOpen?'':'display:none';
  return '<div class="learn-btn-wrap"><button class="learn-btn" onclick="toggleLearn()">'+btnLabel+'</button></div>'
    +'<div class="learn-panel" id="learnPanel" style="'+panelDisplay+'">'
    +'<div class="learn-panel-header"><span class="learn-panel-title">📚 학습 노트</span>'
    +'<button class="learn-panel-close" onclick="toggleLearn()">✕</button></div>'
    +'<div class="learn-panel-body">'+panelInner+'</div>'
    +'</div>';
}

function buildLearnPanel(data, imgKey){
  data=data||{};
  let h='';
  // 1) 해설 (새 필드 explanation, 폴백 concept) + 첨부 이미지
  var explain = data.explanation || data.concept || '';
  var imgHTML = imgKey ? '<div class="learn-img">'+imgInner('img://'+imgKey)+'</div>' : '';
  if(explain || imgHTML) h+='<div class="learn-section"><div class="learn-section-title">해설</div><div class="learn-section-body">'+explain+imgHTML+'</div></div>';
  // 2) 개념 (새 필드 concepts[] = {t,d,exd,ex}, 객관식 exp.c와 동일 구조)
  if(Array.isArray(data.concepts) && data.concepts.length){
    var rows=data.concepts.map(function(it){
      if(!it||!it.t) return '';
      var r='<div class="lc-row"><b style="display:block;margin-bottom:2px">'+it.t+'</b>'+(it.d?it.d:'')+'</div>';
      if(activeCert==='bodybuilding' && it.exd && String(it.exd).trim()) r+='<div class="lc-exd">💡 '+String(it.exd).trim()+'</div>';   // 💡(exd)는 생체에서만
      if(it.ex && String(it.ex).trim()) r+='<div class="lc-ex">'+String(it.ex).trim()+'</div>';
      return r;
    }).join('');
    if(rows) h+='<div class="learn-section"><div class="learn-section-title">개념</div><div class="learn-section-body">'+rows+'</div></div>';
  } else {
    // 폴백: 기존 points / extra / keywords (구 데이터 호환)
    var pts=(Array.isArray(data.points)?data.points:[]).map(function(p){return '<li>'+p+'</li>';}).join('');
    if(pts) h+='<div class="learn-section"><div class="learn-section-title">개념</div><div class="learn-section-body"><ul>'+pts+'</ul></div></div>';
    if(data.extra) h+='<div class="learn-section"><div class="learn-section-title">시험관 답변 예시</div><div class="learn-section-body">'+data.extra+'</div></div>';
    var kws=(Array.isArray(data.keywords)?data.keywords:[]).map(function(k){return '<span class="learn-keyword">'+k+'</span>';}).join('');
    if(kws) h+='<div class="learn-section"><div class="learn-section-title">핵심 키워드</div><div class="learn-section-body">'+kws+'</div></div>';
  }
  return h;
}

function toggleLearn(){
  if(!isFlipped){ isFlipped=true; learnOpen=true; renderCard(); return; }  // 앞면이면 뒤집으며 펼침
  learnOpen=!learnOpen;
  const panel=document.getElementById('learnPanel');
  const btns=document.querySelectorAll('.learn-btn');
  if(panel)panel.style.display=learnOpen?'block':'none';
  btns.forEach(b=>{b.textContent=learnOpen?'📖 학습 노트 닫기 ▲':'📖 학습 노트 보기 ▼';});
}

function renderCard(){
  filtered=getFiltered();
  const area=document.getElementById('cardArea');
  const rateRow=document.getElementById('rateRow');
  if(filtered.length===0){
    const msg=srMode==='review'?'<strong>오늘 복습할 카드가 없어요!</strong><br>잘하고 있어요 ✨'
             :srMode==='new'?'<strong>새 카드를 모두 학습했어요!</strong><br>복습 모드로 점검해 보세요'
             :'카드가 없어요.';
    area.innerHTML='<div class="empty"><div class="emoji">'+(srMode==='review'?'🎉':'🌸')+'</div><p>'+msg+'</p></div>';
    document.getElementById('progressText').textContent='0 / 0';
    document.getElementById('progressBar').style.width='0%';
    if(rateRow) rateRow.innerHTML='';
    return;
  }
  if(current>=filtered.length)current=filtered.length-1;
  if(current<0)current=0;
  const card=filtered[current];
  { const st=document.getElementById('subjTag'); if(st) st.textContent=card.s; }
  const pct=Math.round((current+1)/filtered.length*100);
  document.getElementById('progressText').textContent=(current+1)+' / '+filtered.length;
  document.getElementById('progressBar').style.width=pct+'%';

  // 숙달도 색뱃지
  const mst=srMastery(card);
  const dotCls={new:'sr-new',weak:'sr-weak',learning:'sr-learning',master:'sr-master'}[mst];
  const statusDot='<div class="sr-dot '+dotCls+'" title="'+SR_MASTER_LABEL[mst]+'">'+SR_MASTER_LABEL[mst]+'</div>';
  const starCount=card.star||0;
  const starDot=starCount>0?'<div class="star-dot">'+impLabel(starCount)+'</div>':'';
  const learnHTML=(function(){try{return buildLearnHTML(card);}catch(e){console.error('learn 렌더 오류',e);return '';}})();
  const reportBtn=`<button class="report-btn" onclick="openReport()">⚠️ 문제 오류 신고</button>`;
  const hintText=isFlipped?'':'탭해서 답 확인 💫';
  area.innerHTML=
    '<div class="card-navwrap">'
    +'<button class="cardnav cardnav-prev" onclick="navigate(-1)"'+(current<=0?' disabled':'')+' aria-label="이전 카드">‹</button>'
    +'<div class="card-scene">'
    +'<div class="card-inner'+(isFlipped?' flipped':'')+'" id="ci" onclick="flipCard()">'
    +'<div class="card-face card-front">'+statusDot+starDot
    +'<div class="card-label">Question'+newTypeBadge(card)+'</div>'
    +'<div class="card-text">'+card.q+'</div></div>'
    +'<div class="card-face card-back">'
    +'<div class="card-label">Answer</div>'
    +'<div class="card-text">'+card.a+'</div></div>'
    +'</div></div>'
    +'<button class="cardnav cardnav-next" onclick="navigate(1)"'+(current>=filtered.length-1?' disabled':'')+' aria-label="다음 카드">›</button>'
    +'</div>'
    +'<div class="tap-hint">'+hintText+'</div>'
    +learnHTML
    +reportBtn;
  try{ resolveImages(area); }catch(_){}

  // 하단 평가 버튼 (답 확인 후에만 노출)
  if(rateRow){
    if(!isFlipped){
      rateRow.innerHTML=
        '<button class="rb rb-wrong" onclick="flipCard()">❌<span>틀림</span><i>답 보기</i></button>'
        +'<button class="rb rb-vague" onclick="flipCard()">🤔<span>애매함</span><i>답 보기</i></button>'
        +'<button class="rb rb-ok" onclick="rate(2)">✅<span>정확함</span><i>바로 통과</i></button>';
    } else {
      const dl=srCorrectInterval((srGet(card)&&srGet(card).st||0)+1);
      rateRow.innerHTML=
        '<button class="rb rb-wrong" onclick="rate(0)">❌<span>틀림</span><i>내일 다시</i></button>'
        +'<button class="rb rb-vague" onclick="rate(1)">🤔<span>애매함</span><i>'+srVagueInterval()+'일 후</i></button>'
        +'<button class="rb rb-ok" onclick="rate(2)">✅<span>정확함</span><i>'+dl+'일 후</i></button>';
    }
  }
}

function flipCard(){
  isFlipped=!isFlipped;
  if(!isFlipped) learnOpen=false;
  renderCard();
}

function countUp(cert){
  cert = cert || activeCertId();
  solveCountByCert[cert]=(solveCountByCert[cert]||0)+1;
  solveCount=totalSolve();
  setStatCountUI();
  checkMilestone(totalSolve());
  if(typeof _pushTick==='function') _pushTick();
  srSaveDebounced();
}

/* ===== SR 저장(디바운스) ===== */
function srSaveDebounced(force){
  srDirtyCount++;
  if(force||srDirtyCount>=5){ srFlush(); return; }
  if(srSaveTimer) clearTimeout(srSaveTimer);
  srSaveTimer=setTimeout(srFlush,4000);
}
function srFlush(){
  srDirtyCount=0; if(srSaveTimer){clearTimeout(srSaveTimer);srSaveTimer=null;}
  if(currentUser) saveUserData();
  else { try{ localStorage.setItem('sr:'+SR_CERT, JSON.stringify({p:srProgress,e:srExamOverride,c:solveOf('bodybuilding')})); }catch(_){} }
}
window.addEventListener('beforeunload',()=>{ try{ if(typeof mqScreen!=='undefined' && mqScreen==='exam' && !mqInReview && !mqReview && !mqDiag){ if(typeof mqFlushAnsweredToWrong==='function') mqFlushAnsweredToWrong(); if(typeof mqSaveProgress==='function') mqSaveProgress(); } }catch(_){} if(srDirtyCount>0) srFlush(); });

/* ===== SR 평가 (틀림0/애매1/정확2) ===== */
function rate(result){
  filtered=getFiltered();
  if(!filtered.length) return;
  if(!canAccess('bodybuilding')) return;
  const card=filtered[current];
  srRate(card,result);
  countUp('bodybuilding');
  { const e=userEnt.bodybuilding;
    if(e.plan==='GUEST') _guestDayBump('bodybuilding'); if(typeof bumpGuestSolved==='function') bumpGuestSolved();
    if(e.plan==='FREE_TRIAL'){ _userDayBump('bodybuilding'); } }
  isFlipped=false; learnOpen=false;
  if(srMode==='review'){
    filtered=getFiltered();
    if(filtered.length===0){ updateStats();updateSrBanner();buildBar();buildStarBar();updateBbAnalysis(); renderCard(); return; }
    if(current>=filtered.length) current=0;
  } else {
    if(current<filtered.length-1) current++;
    else { updateStats();updateSrBanner();updateBbAnalysis(); showComplete(); return; }
  }
  updateStats();updateSrBanner();buildBar();buildStarBar();updateBbAnalysis();
  renderCard();
}

function setSrMode(m){
  if(typeof ttsStop==='function')ttsStop();
  srMode=m; current=0; isFlipped=false; learnOpen=false;
  refresh();
}
function updateModeButtons(){
  [['modeNew','new'],['modeReview','review'],['modeMix','mix']].forEach(([id,m])=>{
    const b=document.getElementById(id); if(b) b.classList.toggle('mode-on',srMode===m);
  });
}
function bbScoreOf(m){ return m==='master'?100:m==='learning'?60:m==='weak'?20:0; }
function bbScoreStreak(st){ return Math.min(100, 20 + (st||0)*16); }   // 0→20,1→36,2→52,3→68,4→84,5+→100
function bbAnalysis(){
  const per={}; SUBJS.forEach(s=>per[s]={sum:0,n:0});
  let sum=0,n=0; const cnt={master:0,learning:0,weak:0,'new':0};
  cards.forEach(c=>{ const p=srGetK(SR_CERT,c.id); const m=srMasteryK(SR_CERT,c.id); cnt[m]=(cnt[m]||0)+1;
    if(p&&p.rc){ const sc=bbScoreStreak(p.st); sum+=sc; n++; if(per[c.s]){per[c.s].sum+=sc;per[c.s].n++;} } });
  const predicted=n?Math.round(sum/n):null;
  const perArr=SUBJS.map(s=>({name:s, score:per[s].n?Math.round(per[s].sum/per[s].n):null, n:per[s].n}));
  return {predicted,perArr,cnt,studied:n,total:cards.length};
}
function updateBbAnalysis(){
  const el=document.getElementById('bbAnalysis'); if(!el) return;
  const a=bbAnalysis();
  if(!a.studied){
    el.innerHTML='<div class="anal-card"><div class="anal-top"><b>📊 내 실력 분석</b></div>'
      +'<div class="anal-empty">아직 학습 데이터가 없어요. 카드를 풀면 예상점수가 표시됩니다.</div></div>';
    return;
  }
  const lv=mcqLevel(a.predicted,70);
  const weak=a.perArr.filter(p=>p.score!=null).sort((x,y)=>x.score-y.score)[0];
  const bars=a.perArr.map(p=>{
    const sc=p.score, w=sc==null?0:sc;
    const col=sc==null?'#E2D6CC':sc>=80?'#2E9B5E':sc>=70?'#E0A52E':'#E24B4A';
    return '<div class="anal-row"><span class="anal-nm">'+p.name+'</span>'
      +'<div class="anal-bar"><div class="anal-fill" style="width:'+w+'%;background:'+col+'"></div></div>'
      +'<span class="anal-pct">'+(sc==null?'-':sc+'%')+'</span></div>';
  }).join('');
  el.innerHTML='<div class="anal-card"><div class="anal-top"><b>📊 내 실력 분석</b>'
    +'<span style="font-size:11px;color:#B4A99C">숙달 '+a.cnt.master+' · 학습중 '+a.cnt.learning+' · 미숙 '+a.cnt.weak+'</span></div>'
    +'<div class="anal-score"><div class="anal-pred">'+a.predicted+'<small>점</small></div>'
    +'<div class="anal-lv" style="color:'+lv.color+'">'+lv.label+'</div></div>'
    +'<div class="anal-bars">'+bars+'</div>'
    +(weak?'<div class="anal-weak">⚠️ <b>'+weak.name+'</b> 집중 학습이 필요해요 ('+weak.score+'%)</div>':'')
    +(a.studied<10?'<div class="anal-note">더 많이 학습할수록 예상점수가 정확해져요.</div>':'')
    +'</div>';
}
function updateSrBanner(){
  const el=document.getElementById('srBanner'); if(!el) return;
  const due=srTodayCount(); const dl=srDaysLeft();
  const dtxt=dl!=null?(dl>0?'D-'+dl:dl===0?'D-DAY':'시험종료'):'';
  el.innerHTML='<div class="sr-banner-l"><b>'+(dtxt?dtxt+' · ':'')+'오늘 복습 '+due+'개</b>'
    +'<span class="sr-exam" onclick="event.stopPropagation();srEditExam()">시험일 '+(srExamOverride[SR_CERT]||SR_DEFAULT_EXAM[SR_CERT]||'미설정')+' ✎</span></div>'
    +'<div class="sr-banner-go">'+(srMode==='review'?'복습 중':'복습 시작')+' →</div>';
}
function srBannerClick(){ setSrMode('review'); }
function checkMilestone(n){
  const m=MILESTONES.find(m=>m.n===n&&!passedMilestones.has(n));
  if(!m)return;
  passedMilestones.add(n);
  document.getElementById('msStars').textContent=m.stars;
  document.getElementById('msNum').textContent=n.toLocaleString();
  document.getElementById('msMsg').textContent=m.msg;
  document.getElementById('milestoneBox').classList.remove('hidden');
}
function closeMilestone(){document.getElementById('milestoneBox').classList.add('hidden');}
function srEditExam(){
  const cur=srExamOverride[SR_CERT]||SR_DEFAULT_EXAM[SR_CERT]||'';
  const v=prompt('시험일을 입력하세요 (YYYY-MM-DD)',cur);
  if(!v) return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){ alert('날짜 형식이 올바르지 않습니다. 예: 2026-06-23'); return; }
  srExamOverride[SR_CERT]=v; srFlush(); refresh();
}

function navigate(dir){
  if(dir===1&&current<filtered.length-1){ isFlipped=false;learnOpen=false;current++;renderCard(); }
  else if(dir===-1&&current>0){ isFlipped=false;learnOpen=false;current--;renderCard(); }
}

function toggleWrong(){
  if(!currentUser){showLoginPopup();return;}
  filtered=getFiltered();
  if(!filtered.length)return;
  const card=filtered[current];
  const idx=cards.findIndex(c=>c.q===card.q&&c.s===card.s);
  if(idx!==-1)cards[idx].w=true;
  updateStats();buildBar();
  saveUserData();
  // 오답 표시 후 다음 문제로 이동
  if(current<filtered.length-1){
    if(!canAccess('bodybuilding'))return;
    countUp('bodybuilding');
    { const e=userEnt.bodybuilding;
      if(e.plan==='GUEST') _guestDayBump('bodybuilding'); if(typeof bumpGuestSolved==='function') bumpGuestSolved();
      if(e.plan==='FREE_TRIAL'){ _userDayBump('bodybuilding'); } }
    isFlipped=false;learnOpen=false;current++;renderCard();
  } else if(isSubjEnd()){
    showComplete();
  } else {
    renderCard();
  }
}

function showComplete(){
  filtered=getFiltered();
  const total=filtered.length;
  const wrongN=filtered.filter(c=>c.w).length;
  const correct=total-wrongN;
  const pct=Math.round(correct/total*100);
  const emoji=pct>=80?'🏆':pct>=60?'💪':'📚';
  document.getElementById('ovIcon').textContent=emoji;
  document.getElementById('ovTitle').textContent=(currentSubj==='__2026__'?'2026 기출':currentSubj)+' 완료!';
  document.getElementById('ovSub').textContent=total+'문제를 모두 학습했어요 🌸';
  document.getElementById('ovStats').innerHTML=
    '<div class="ov-stat"><div class="v">'+total+'</div><div class="l">전체</div></div>'
    +'<div class="ov-stat w"><div class="v">'+wrongN+'</div><div class="l">오답</div></div>'
    +'<div class="ov-stat d"><div class="v">'+pct+'%</div><div class="l">정답률</div></div>';
  const subjIdx=SUBJS.indexOf(currentSubj);
  const nextSubj=subjIdx>=0&&subjIdx<SUBJS.length-1?SUBJS[subjIdx+1]:null;
  let btns='';
  if(wrongN>0)btns+='<button class="ov-btn ov-wrong" onclick="startWrongReview()">❌ 오답 '+wrongN+'개 복습하기</button>';
  if(nextSubj)btns+='<button class="ov-btn ov-next" onclick="goNext(\''+nextSubj+'\')">다음 과목: '+nextSubj+' →</button>';
  btns+='<button class="ov-btn ov-retry" onclick="retrySubj()">🔄 처음부터 다시</button>';
  document.getElementById('ovBtns').innerHTML=btns;
  document.getElementById('completeOv').classList.remove('hidden');
}

function hideComplete(){document.getElementById('completeOv').classList.add('hidden');}
function startWrongReview(){hideComplete();setSrMode('review');}
function goNext(s){hideComplete();currentSubj=s;current=0;isFlipped=false;learnOpen=false;refresh();}
function retrySubj(){hideComplete();current=0;isFlipped=false;learnOpen=false;renderCard();}

function toggleReview(){
  reviewMode=!reviewMode;current=0;isFlipped=false;learnOpen=false;
  const btn=document.getElementById('btnReview');
  btn.classList.toggle('review-on',reviewMode);
  btn.textContent=reviewMode?'📋 전체보기':'❌ 오답만';
  document.getElementById('modePill').className='mode-pill'+(reviewMode?' wrong':'');
  document.getElementById('modePill').textContent=reviewMode?'오답 모드':'전체';
  refresh();
}
function shuffleCards(){
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
}
function shuffle(){
  shuffleCards();
  current=0;isFlipped=false;learnOpen=false;refresh();
}
function resetWrong(){
  if(!confirm('오답 표시를 모두 초기화할까요?'))return;
  cards.forEach(c=>c.w=false);
  if(reviewMode){reviewMode=false;document.getElementById('btnReview').classList.remove('review-on');document.getElementById('modePill').className='mode-pill';document.getElementById('modePill').textContent='전체';}
  current=0;isFlipped=false;learnOpen=false;refresh();
}
function refresh(){buildBar();buildStarBar();updateStats();updateSrBanner();updateBbAnalysis();updateModeButtons();renderCard();}

/* ===== 음성 듣기 (브라우저 TTS) ===== */
let ttsPlaying=false, ttsRate=1.0, ttsVoiceSel='female', ttsKoVoices=[];
const TTS_RATES=[1.0,1.25,1.5];
function ttsLoadVoices(){
  try{ ttsKoVoices=(speechSynthesis.getVoices()||[]).filter(v=>/ko(-|_)?KR|korean|한국/i.test(v.lang+' '+v.name)); }catch(_){}
}
if('speechSynthesis' in window){
  ttsLoadVoices();
  speechSynthesis.onvoiceschanged=ttsLoadVoices;
}
function ttsPickVoice(){
  if(!ttsKoVoices.length) return null;
  const female=ttsKoVoices.find(v=>/female|여|woman|yuna|sora|heami/i.test(v.name));
  const male=ttsKoVoices.find(v=>/male|남|man/i.test(v.name));
  if(ttsVoiceSel==='male') return male || ttsKoVoices[1] || ttsKoVoices[0];
  return female || ttsKoVoices[0];
}
function ttsSpeak(text, onend){
  if(!text){ onend&&onend(); return; }
  const u=new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g,' '));
  u.lang='ko-KR'; u.rate=ttsRate;
  const v=ttsPickVoice(); if(v) u.voice=v;
  u.onend=()=>{ if(ttsPlaying) onend&&onend(); };
  u.onerror=()=>{ if(ttsPlaying) onend&&onend(); };
  speechSynthesis.speak(u);
}
function ttsToggle(){
  if(!('speechSynthesis' in window)){ alert('이 브라우저는 음성 읽기를 지원하지 않습니다.'); return; }
  if(ttsPlaying){ ttsStop(); return; }
  if(!filtered.length) return;
  ttsPlaying=true; ttsUpdateBtn();
  ttsPlayCurrent();
}
function ttsPlayCurrent(){
  if(!ttsPlaying) return;
  if(current>=filtered.length){ ttsStop(); return; }
  const card=filtered[current];
  // 화면도 답면으로 보여주며 진행
  isFlipped=false; renderCard();
  ttsSpeak(card.q, ()=>{
    if(!ttsPlaying) return;
    setTimeout(()=>{
      if(!ttsPlaying) return;
      isFlipped=true; renderCard();
      ttsSpeak(card.a, ()=>{
        if(!ttsPlaying) return;
        if(current<filtered.length-1){ current++; setTimeout(ttsPlayCurrent, 600); }
        else { ttsStop(); }
      });
    }, 800);   // 질문 후 멈춤
  });
}
function ttsStop(){
  ttsPlaying=false;
  try{ speechSynthesis.cancel(); }catch(_){}
  ttsUpdateBtn();
}
function ttsUpdateBtn(){
  const b=document.getElementById('audioPlay'); if(b) b.innerHTML=ttsPlaying?'⏸ 정지':'🔊 듣기';
  if(b) b.classList.toggle('on',ttsPlaying);
}
function ttsToggleVoice(){
  ttsVoiceSel = ttsVoiceSel==='female'?'male':'female';
  const b=document.getElementById('audioVoice'); if(b) b.innerHTML=ttsVoiceSel==='female'?'👩 여성':'👨 남성';
  if(ttsPlaying){ ttsStop(); }   // 목소리 바꾸면 정지(다시 재생)
}
function ttsCycleRate(){
  const i=TTS_RATES.indexOf(ttsRate); ttsRate=TTS_RATES[(i+1)%TTS_RATES.length];
  const b=document.getElementById('audioRate'); if(b) b.textContent=ttsRate.toFixed(2).replace(/0$/,'')+'×';
  // 재생 중이면 다음 발화부터 속도 적용 (현재 발화는 유지)
}
// 화면 벗어나거나 다른 곳 가면 자동 정지
document.addEventListener('visibilitychange',()=>{ if(document.hidden) ttsStop(); });
window.addEventListener('beforeunload',()=>ttsStop());

let tx=0;
document.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;},{passive:true});
document.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tx;
  if(Math.abs(dx)>55){if(dx<0&&current<filtered.length-1)navigate(1);else if(dx>0&&current>0)navigate(-1);}
},{passive:true});

checkInAppBrowser();

const APP_QB={civil:{name:'민법',sets:[]},law:{name:'감정평가관계법규',sets:[]},econ:{name:'경제학원론',sets:[]},acct:{name:'회계학',sets:[]},real:{name:'부동산학원론',sets:[]}};

