// ===== Firebase 초기화 =====
const firebaseConfig = {
  apiKey: "AIzaSyCSQlow8xzRsv0EMtIYJ6_WDRAFUECrw2Q",
  authDomain: "certlab.ai.kr",
  projectId: "certlab-c3bcb",
  storageBucket: "certlab-c3bcb.firebasestorage.app",
  messagingSenderId: "698827699707",
  appId: "1:698827699707:web:b08d492f408ac444fa875e"
};
let auth = null, db = null, storage = null, googleProvider = null, firebaseReady = false, fbFunctions = null;
try {
  firebase.initializeApp(firebaseConfig);
  firebase.appCheck().activate(
    new firebase.appCheck.ReCaptchaV3Provider('6LeSfSQtAAAAAAycXeNoC1nMdIjMAdkh61qT_Dh2'),
    true
  );
  auth = firebase.auth();
  db = firebase.firestore();
  try{ db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); }catch(e){ console.warn('firestore settings', e); }
  storage = firebase.storage();
  try{ fbFunctions = (firebase.app().functions) ? firebase.app().functions('asia-northeast3') : null; }catch(e){ console.warn('functions init', e); fbFunctions=null; }
  googleProvider = new firebase.auth.GoogleAuthProvider();
  firebaseReady = true;
  // 첫 로드 때 goHome이 db 준비 전에 돌아 공지바가 빈 채 끝나는 경우 보강 — 준비되면 홈에서 한 번 더 로드
  try{ if(mqScreen==='home' && typeof cmLoadNoticeBar==='function') cmLoadNoticeBar(); }catch(_){}
  try{ if(/[?&]perf=1/.test(location.search) || localStorage.getItem('certlab_perf')==='1'){ var _ac0=(window.performance&&performance.now)?performance.now():Date.now(); firebase.appCheck().getToken(false).then(function(){ window.__acMs=((window.performance&&performance.now)?performance.now():Date.now())-_ac0; console.log('[PERF] AppCheck 토큰 '+(window.__acMs/1000).toFixed(1)+'초'); }).catch(function(e){ window.__acFail=(e&&e.code)||String(e); console.log('[PERF] AppCheck 실패', e); }); } }catch(e){}
} catch (e) {
  console.warn('Firebase를 불러오지 못했습니다. 로그인·동기화 없이 학습 기능만 동작합니다.', e);
}

// ===== 사용자 상태 =====
let currentUser = null;
// ===== AI 크레딧 지갑(회원권과 별도, 횟수 충전제): users/{uid}.aiCredits =====
// 첨삭(Sonnet)·개념설명(Haiku) 공용. 1회당 1 차감.
// 첨삭(grade)·해설(explain) 지갑 분리
window._aiCredits = { grade:0, explain:0 };
function _walletBal(k){ var w=window._aiCredits; return (w && typeof w==='object' && +w[k]>0) ? +w[k] : 0; }
function gradeBal(){ return _walletBal('grade'); }
function explainBal(){ return _walletBal('explain'); }
function _setWallet(k, n){ if(typeof n==='number' && n>=0){ if(!window._aiCredits||typeof window._aiCredits!=='object') window._aiCredits={grade:0,explain:0}; window._aiCredits[k]=n; try{ if(typeof _refreshAiCreditUI==='function') _refreshAiCreditUI(); }catch(_){} } }
// ===== 추천/마일리지 =====
const MILE_DAY = 86400000;
// ===== 추천 대기정산 (추천인 본인 로그인 시 자기 문서에 적립) =====
async function settleReferralMileage(ref, data){
  if (!myReferralCode) return;
  let lots = Array.isArray(data.mileageLots) ? data.mileageLots.slice() : [];
  let hist = Array.isArray(data.mileageHistory) ? data.mileageHistory.slice() : [];
  let changed = false;
  let earned = 0;
  const now = Date.now();
  try {
    const snap = await db.collection('referrals').where('referrerCode','==',myReferralCode).get();
    for (const d of snap.docs) {
      const r = d.data();
      if (r.refereeUid === currentUser.uid) continue;   // 자기추천 방지
      // 가입 보상 1,000 (1년)
      if (!r.signupSettled) {
        lots.push({a:1000, t:'ref_signup', at:now, exp:now+365*MILE_DAY});
        hist.push({t:'ref_signup', a:1000, at:now, who:r.refereeEmail||null});
        changed = true; earned += 1000;
        try { await d.ref.update({ signupSettled:true }); } catch(_){}
      }
      // 결제 보상은 결제 시점에서 실입금 50%로 직접 적립함(여기서 처리 안 함)
    }
  } catch(_){}
  if (changed) {
    myMileageLots = lots;
    try { await ref.update({ mileageLots: lots, mileageHistory: hist }); } catch(_){}
    updateAuthBar();
    if (earned > 0 && typeof showPtModal === 'function') {
      setTimeout(function(){ showPtModal('referral', earned); }, 800);
    }
  }
}

let myReferralCode = null;
let myMileageLots = [];   // [{a금액, t유형, at적립ms, exp만료ms}]
// ?ref= 캡처 (로그인 팝업/리다이렉트 넘어가도 유지)
try {
  const _ref = new URLSearchParams(location.search).get('ref');
  if (_ref) localStorage.setItem('pendingRef', _ref.trim().toUpperCase());
} catch(_) {}
// ?card=EP_72 딥링크 캡처 (데이터 로드 후 실행)
let pendingCard = null, pendingCardCert = null, pendingLt = null;
try { var _dlp=new URLSearchParams(location.search); pendingCard=_dlp.get('card'); pendingCardCert=_dlp.get('cert'); pendingLt=_dlp.get('lt'); } catch(_) {}
try{ console.log('[CertLab build] 2026-07-01-dl5 (딥링크/이미지캐시 수정본)'); }catch(_){}
function genReferralCode(uid){ return (uid||'').replace(/[^a-zA-Z0-9]/g,'').toUpperCase().slice(0,6) || ('R'+Math.random().toString(36).slice(2,7).toUpperCase()); }
function mileageBalance(lots){
  const now = Date.now(); let s=0;
  (lots||[]).forEach(l=>{ if(l && (!l.exp || l.exp>now) && !l.used) s+=(l.a||0); });
  return s;
}
function myReferralLink(){ return location.origin + location.pathname + '?ref=' + (myReferralCode||''); }

let userPlan = 'GUEST'; // (레거시 미러: 현재 활성 시험의 plan) GUEST | FREE_TRIAL | ACTIVE | EXPIRED
let trialCount = 0;     // (레거시 미러: 현재 활성 시험의 무료 사용 수)
const GUEST_LIMIT = 10;
const TRIAL_LIMIT = 50;
const GUEST_DAILY_DEFAULT = 10, USER_DAILY_DEFAULT = 20;
function _todayKST(){ return new Date(Date.now()+9*3600*1000).toISOString().slice(0,10); }
function _guestDaily(){ return (typeof _pricingCfg!=='undefined'&&_pricingCfg&&+_pricingCfg.guestDaily)||GUEST_DAILY_DEFAULT; }
function _userDaily(){ return (typeof _pricingCfg!=='undefined'&&_pricingCfg&&+_pricingCfg.userDaily)||USER_DAILY_DEFAULT; }
function _guestDayGet(){ try{ var o=JSON.parse(localStorage.getItem('certlab_guest_daily')||'{}'); if(o&&o.date===_todayKST()&&o.counts) return o; }catch(_){} return {date:_todayKST(),counts:{}}; }
function _guestDayCount(cert){ return (_guestDayGet().counts||{})[cert]||0; }
function _guestDayBump(cert){ var o=_guestDayGet(); o.counts=o.counts||{}; o.counts[cert]=(o.counts[cert]||0)+1; o.date=_todayKST(); try{ localStorage.setItem('certlab_guest_daily',JSON.stringify(o)); }catch(_){} }
function _userDayCount(cert){ var e=userEnt[cert]||{}; return (e.dayDate===_todayKST())?(e.dayCount||0):0; }
function _userDayBump(cert){ var e=userEnt[cert]; if(!e) return; if(e.dayDate!==_todayKST()){ e.dayDate=_todayKST(); e.dayCount=0; } e.dayCount=(e.dayCount||0)+1; saveDailyCount(cert); }
async function saveDailyCount(cert){ if(!currentUser||!userEnt[cert]) return; try{ await db.collection('users').doc(currentUser.uid).update({ ['entitlements.'+cert+'.dayDate']:userEnt[cert].dayDate, ['entitlements.'+cert+'.dayCount']:userEnt[cert].dayCount }); }catch(e){ console.error('일일카운트 저장 오류:', e); } }
// ===== Elo 반영 게이트: 문제당 하루 1회만 (해설 먼저 본 문제는 차단이 아니라 '오답'으로 반영 → mqPick에서 처리) =====
function _eloPruneToday(m){ if(!m) return; var t=_todayKST(); for(var k in m){ if(m[k]!==t) delete m[k]; } }
function _eloCanApply(cert,q){ try{ if(typeof eloState==='undefined'||!eloState) return true; var id=q&&q.id; if(!id) return true; var k=cert+'|'+id;
  if(eloState._applied && eloState._applied[k]===_todayKST()) return false;   // 오늘 이미 반영 → 재반영 안 함(하루1회)
  return true; }catch(_){ return true; } }
function _eloMarkApplied(cert,q){ try{ if(typeof eloState==='undefined'||!eloState) return; var id=q&&q.id; if(!id) return; eloState._applied=eloState._applied||{}; _eloPruneToday(eloState._applied); eloState._applied[cert+'|'+id]=_todayKST(); }catch(_){} }
function _eloMarkExpSeen(cert,q){ try{ if(typeof eloState==='undefined'||!eloState) return; var id=q&&q.id; if(!id) return; eloState._expSeen=eloState._expSeen||{}; _eloPruneToday(eloState._expSeen); eloState._expSeen[cert+'|'+id]=_todayKST(); }catch(_){} }
// 단원 코드 개편 자동 마이그레이션: eloState의 옛 topic 키 → 새 코드(분할은 다 복사, 1회만)
function _migrateEloTopics(es){ try{
  if(!es || typeof es!=='object' || es._topicMig) return;
  var MIG={ mi_producer:['mi_perfcomp','mi_production','mi_cost'], mi_welfare:['mi_surplus'], mi_oligopoly:['mi_oligopoly','mi_game'], mi_consumer:['mi_consumer','mi_consumer2'], ma_income:['ma_income','ma_consinv','ma_growth','ma_adas'], ma_inflation:['ma_inflation','ma_unemploy'] };
  Object.keys(es).forEach(function(k){
    if(k.charAt(0)==='_') return;                 // _applied/_expSeen/_levelTest 등 메타 스킵
    var sub=es[k]; if(!sub || typeof sub!=='object') return;
    Object.keys(MIG).forEach(function(oldT){
      var rec=sub[oldT]; if(!rec || typeof rec!=='object' || typeof rec.score!=='number') return;
      MIG[oldT].forEach(function(nt){
        var cur=sub[nt];
        if(cur && typeof cur.score==='number'){    // 이미 새 키 존재 → 높은 점수 유지
          if(rec.score>cur.score) sub[nt]={score:rec.score, attempts:Math.max(cur.attempts||0, rec.attempts||0), seeded:!!(cur.seeded||rec.seeded)};
        } else {
          sub[nt]={score:rec.score, attempts:rec.attempts||0, seeded:!!rec.seeded};
        }
      });
      if(MIG[oldT].indexOf(oldT)===-1) delete sub[oldT];   // 옛 키가 타깃에 없으면 삭제(mi_oligopoly는 유지)
    });
  });
  es._topicMig=1;
}catch(_){} }
function _luTimeoutScoreUnanswered(){ try{ (mqQuestions()||[]).forEach(function(q){ if(!q||!q.id) return; if(mqAns[q.id]!==undefined) return; if(typeof adEloUpdate!=='function') return; if(!_eloCanApply(mqCert,q)) return; adEloUpdate(q, false); _eloMarkApplied(mqCert,q); }); }catch(_){} }
// ===== 시험별 이용권(entitlements) =====
const ALL_CERTS = ['bodybuilding','appraiser','realestate1','realestate2','koreanhistory','housing','housing2'];
const CERT_LABELS = { bodybuilding:'스포츠지도사 실기·구술', appraiser:'감평사', realestate1:'중개사 1차', realestate2:'중개사 2차', koreanhistory:'한국사', housing:'주택관리사', housing2:'주택관리사 2차' };
const CERT_FULLNAMES = { bodybuilding:'스포츠지도사 실기·구술', appraiser:'감정평가사', realestate1:'공인중개사 1차', realestate2:'공인중개사 2차', koreanhistory:'한국사능력검정시험(심화)', housing:'주택관리사 1차', housing2:'주택관리사 2차' };
const CERT_ICONS = { bodybuilding:'💪', appraiser:'📐', realestate1:'🏠', realestate2:'🏢', koreanhistory:'📜', housing:'🏢', housing2:'🏢', sport2:'🏅', laborattorney1:'⚖️', firemanager1:'🧯', hesm:'🏃' };
function _certIcon(cert){ return (typeof _pricingCfg!=='undefined'&&_pricingCfg&&_pricingCfg.certIcon&&_pricingCfg.certIcon[cert]) || CERT_ICONS[cert] || ''; }
function applyCertIcons(){ try{
  var ids=Object.keys(CERT_ICONS);
  if(typeof _pricingCfg!=='undefined'&&_pricingCfg&&_pricingCfg.certIcon) Object.keys(_pricingCfg.certIcon).forEach(function(k){ if(ids.indexOf(k)<0) ids.push(k); });
  ids.forEach(function(id){ var ic=_certIcon(id); if(!ic) return; var card=document.getElementById('certCard-'+id); if(!card) return; var el=card.querySelector('.cert-ic'); if(el) el.textContent=ic; });
}catch(_){}}
const LT_CERT_NAMES = { appraiser:'감정평가사 1차', realestate1:'공인중개사 1차', realestate2:'공인중개사 2차', housing:'주택관리사 1차', housing2:'주택관리사 2차', koreanhistory:'한국사 심화', sport2:'스포츠지도사 2급', laborattorney1:'공인노무사 1차', firemanager1:'소방시설관리사 1차', hesm:'건강운동관리사 1차' };
function ltCertName(c){ return LT_CERT_NAMES[c] || (typeof CERT_FULLNAMES!=='undefined' && CERT_FULLNAMES[c]) || (typeof certLabel==='function'?certLabel(c):c); }
// ===== 환급 이벤트 설정 (단일 관리처) — 시험 추가 시 이 객체에 한 줄만 추가 =====
// 환급 이벤트 — 시험 구분 없이 단일 공통 문구(급수 시험은 최고 급수 달성 시)
const REFUND = {
  page:'#post/LOk5j9wje78LqxRt34SW', badge:'합격 환급',
  bannerLine:'🎉 합격하면 결제금액 전액 환급',
  bannerSub:'CertLab로 공부하고 합격하면, 인증 + 후기 작성 시 결제금액을 100% 돌려드려요. (급수가 있는 시험은 가장 높은 급수 달성 시)',
  popTitle:'100% 환급 이벤트에 당첨되었습니다!',
  popSub:'CertLab로 공부하고 <b>합격하면 100% 환급</b>해 드려요. (급수가 있는 시험은 가장 높은 급수 달성 시) <b>선착순 30명!</b>',
  popSteps:'① 큐넷·한능검 등에서 환불 조건에 맞는 합격·점수(급수) 캡처<br>② CertLab 활용 후기 100자 이상<br>③ 가입 이메일로 캡처+후기+이름+계좌번호를 certlab.team@gmail.com 발송<br>→ 확인 후 전액 환급!'
};
function certLabel(c){ return CERT_LABELS[c]||c; }
function certFull(c){ return CERT_FULLNAMES[c]||c; }
function blankEnt(){ const o={}; ALL_CERTS.forEach(c=>o[c]={plan:'GUEST',trialCount:0,expireAt:null,planDays:null}); return o; }
function blankGuest(){ const o={}; ALL_CERTS.forEach(c=>o[c]=0); return o; }
let userEnt = blankEnt();
let guestCounts = blankGuest();  // 비회원 시험별 푼 수
function activeCertId(){ return (typeof activeCert!=='undefined' && activeCert) ? activeCert : 'bodybuilding'; }
function syncPlanMirror(){
  const e = userEnt[activeCertId()] || userEnt.bodybuilding;
  userPlan = e.plan; trialCount = e.trialCount || 0;
}
// 공용 중요도 별표(압축): 0=숨김, 1→★, 2+→★n
function impLabel(n){ n=n||0; if(!n) return ''; return n===1 ? '★' : '★'+n; }
let selectedPlanDays = 56;
let selectedPlanPrice = 5900;

// ===== Auth 상태 감지 =====
if (firebaseReady) {
  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      await loadUserPlan(user);
    } else {
      userPlan = 'GUEST';
      userEnt = blankEnt();
      guestCounts = blankGuest();
      appWrong={};
      updateAuthBar();
    }
    refresh();
    routeAfterAuth();
    try { var _dp=document.getElementById('delPopup'); if(_dp && !_dp.classList.contains('hidden') && typeof _delSyncView==='function') _delSyncView(); } catch(_){}
    setTimeout(function(){ if(typeof maybeShowRefundPopup==='function') maybeShowRefundPopup(); }, 30000);
  });
} else {
  // Firebase 미연결(미리보기/오프라인): 게스트 모드로 콘텐츠만 동작
  userPlan = 'GUEST';
  userEnt = blankEnt();
  updateAuthBar();
}

// ===== 사용자 플랜 로드 =====
async function loadUserPlan(user) {
  try {
    const ref = db.collection('users').doc(user.uid);
    const doc = await ref.get();
    if (!doc.exists) {
      // 신규 회원: 시험별 무료체험으로 시작
      const ent = {}; ALL_CERTS.forEach(c=>ent[c]={plan:'FREE_TRIAL',trialCount:0,expireAt:null,planDays:null});
      const now = Date.now();
      const refCode = genReferralCode(user.uid);
      let referredBy = null;
      try { const pr = localStorage.getItem('pendingRef'); if (pr && pr !== refCode) referredBy = pr; } catch(_){}
      // 가입 보너스 1,000P(1년). 추천코드로 들어왔으면 추천 가입 보너스 1,000P 추가(=합 2,000P)
      const lots = [ {a:1000, t:'signup', at:now, exp:now+365*MILE_DAY} ];
      const mhist = [ {t:'signup', a:1000, at:now} ];
      if (referredBy) {
        lots.push({a:1000, t:'ref_join', at:now, exp:now+365*MILE_DAY});
        mhist.push({t:'ref_join', a:1000, at:now});
      }
      await ref.set({
        email: user.email, displayName: user.displayName, photoURL: user.photoURL,
        plan: 'FREE_TRIAL', trialCount: 0,        // 레거시 미러(관리자 호환)
        entitlements: ent,
        signupCert: (typeof activeCert!=='undefined' ? (activeCert||null) : null),  // 가입 시점에 보던 시험
        referralCode: refCode,
        referredBy: referredBy || null,
        mileageLots: lots,
        mileageHistory: mhist,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      // 신규 가입 확정 시점(로그인 경로 무관) → Meta CompleteRegistration
      try { clTrack('CompleteRegistration', { content_name:'signup', content_category:(typeof activeCert!=='undefined'?(activeCert||''):''), status:true }); } catch(_){}
      myReferralCode = refCode; myMileageLots = lots;
      // 추천받아 가입했으면 환영 모달로 보너스 안내
      if (referredBy && typeof showPtModal==='function') { setTimeout(function(){ showPtModal('referral', 1000); }, 1200); }
      // 추천 기록(추천인 정산용) — 추천코드로 들어온 경우만
      if (referredBy) {
        try {
          await db.collection('referrals').doc(user.uid).set({
            refereeUid: user.uid, refereeEmail: user.email || null,
            referrerCode: referredBy, paid: false,
            signupSettled: false, paidSettled: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } catch(_){}
      }
      try { localStorage.removeItem('pendingRef'); } catch(_){}
      window._aiCredits = { grade:0, explain:0 };
      userEnt = ent; syncPlanMirror(); updateAuthBar(); showWelcomePopup(); loadUserData();
      if(typeof pwaSignupBanner==='function') pwaSignupBanner();
      return;
    }
    const data = doc.data();
    let ent = data.entitlements;
    if (!ent) {
      // 지연 마이그레이션: 기존 평면 plan → entitlements.bodybuilding (레거시 필드는 보존)
      ent = {};
      ALL_CERTS.forEach(c=>ent[c]={plan:'FREE_TRIAL',trialCount:0,expireAt:null,planDays:null});
      ent.bodybuilding = { plan: data.plan || 'FREE_TRIAL', trialCount: data.trialCount || 0,
                           expireAt: data.expireAt || null, planDays: data.planDays || null };
      try { await ref.update({ entitlements: ent }); } catch(_) {}
    }
    // 시험별 ACTIVE 만료 체크
    const now = new Date();
    for (const k of ALL_CERTS) {
      if (!ent[k]) ent[k] = { plan:'FREE_TRIAL', trialCount:0, expireAt:null, planDays:null };
      const e = ent[k];
      if (e.plan === 'ACTIVE' && e.expireAt) {
        const exp = e.expireAt.toDate ? e.expireAt.toDate() : new Date(e.expireAt);
        if (now > exp) {
          e.plan = 'EXPIRED';
          try {
            const upd = { ['entitlements.'+k+'.plan']: 'EXPIRED' };
            if (k === 'bodybuilding') upd.plan = 'EXPIRED'; // 레거시 미러
            await ref.update(upd);
          } catch(_) {}
        }
      }
    }
    window._aiCredits = (data.aiCredits && typeof data.aiCredits==='object') ? { grade:+(data.aiCredits.grade||0), explain:+(data.aiCredits.explain||0) } : { grade:0, explain:0 };
    userEnt = ent; syncPlanMirror(); updateAuthBar(); loadUserData();
    // 추천코드 없으면 발급(기존 회원 백필) + 마일리지 로드
    myReferralCode = data.referralCode || null;
    myMileageLots = Array.isArray(data.mileageLots) ? data.mileageLots : [];
    if (!myReferralCode) {
      myReferralCode = genReferralCode(user.uid);
      try { await ref.update({ referralCode: myReferralCode }); } catch(_){}
    }
    settleReferralMileage(ref, data).catch(()=>{});
    try { await ref.update({ lastLoginAt: firebase.firestore.FieldValue.serverTimestamp() }); } catch(_){}
  } catch(e) {
    console.error('플랜 로드 오류:', e);
    userEnt = blankEnt(); userEnt.bodybuilding.plan='FREE_TRIAL'; userEnt.appraiser.plan='FREE_TRIAL';
    syncPlanMirror(); updateAuthBar();
  }
}

// ===== Firestore 오답·즐겨찾기 로드 =====
async function loadUserData() {
  if (!currentUser || !db) return;
  try {
    const doc = await db.collection('userData').doc(currentUser.uid).get();
    if (doc.exists) {
      const data = doc.data();
      // 초기화 후 복원
      D.forEach(c=>{ c.w=false; c.fav=false; });
      appWrong={};
      (data.wrongList||[]).forEach(key => applyMark(key,'w',true));
      (data.favoriteList||[]).forEach(key => applyMark(key,'fav',true));
      // 자동복습 진행상황
      srProgress = (data.cardProgress && typeof data.cardProgress==='object') ? data.cardProgress : {};
      srExamOverride = (data.examDates && typeof data.examDates==='object') ? data.examDates : {};
      srDiagnostics = Array.isArray(data.diagnostics) ? data.diagnostics : [];
      try{ if(Array.isArray(data.sport2subs)&&data.sport2subs.length===5) _sp2SubsMem=data.sport2subs; }catch(_){}
      srMigrateIfNeeded();
      var _merged=mergeGuestProgress();   // 비회원 때 기록을 계정에 병합(계정에 없는 것만)
      srApplyToCards();
      if (data.solveCountByCert && typeof data.solveCountByCert==='object') {
        solveCountByCert = data.solveCountByCert;
      } else if (data.solveCount) {
        solveCountByCert = { bodybuilding: data.solveCount };   // 레거시 단일값 → 생체로 이관
      } else {
        solveCountByCert = {};
      }
      solveCount = totalSolve();
      setStatCountUI();
      var _resync=srRestoreResume(data);   // 이어풀기 동기화: Firestore가 더 최신이면 로컬에 복원
      try{ srMergeOX(data); }catch(e){}    // 내 O/X 동기화: Firestore↔로컬 합치기(union, 로컬 우선)
      try{ if(data && data.eloState && typeof eloState!=='undefined') eloState=data.eloState; }catch(e){}   // 적응형 Elo 트랙 복원
      try{ _migrateEloTopics(eloState); }catch(e){}   // 단원 코드 개편: 옛 topic → 새 코드 자동 이관(1회)
      try{ if(data){ luHistEnsure();
        if(data.luHist){ Object.keys(data.luHist).forEach(function(cert){ var rem=data.luHist[cert]||[], loc=luHistAll[cert]||[], seen={}; loc.forEach(function(r){ seen[(r&&r.ts||0)+'_'+(r&&r.sub||'')]=1; }); rem.forEach(function(r){ var key=(r&&r.ts||0)+'_'+(r&&r.sub||''); if(!seen[key]){ loc.push(r); seen[key]=1; } }); luHistAll[cert]=loc; luHistPrune(cert); }); }
        if(data.luResume){ Object.keys(data.luResume).forEach(function(cert){ var rem=data.luResume[cert], loc=luResumeAll[cert]; if(rem && (!loc || (rem.ts||0)>(loc.ts||0))) luResumeAll[cert]=rem; }); }
        luHistSaveLocal();
      } }catch(e){}   // 레벨업 기록·이어풀기 동기화(로컬과 병합)
      if(_merged && typeof saveUserData==='function') saveUserData();   // 병합분 계정에 저장
      refresh();
      if (activeCert === 'appraiser') renderMCQ();
      if (_resync && typeof activeCert!=='undefined' && activeCert && typeof isMcqCert==='function' && isMcqCert(activeCert) && typeof mqScreen!=='undefined' && mqScreen!=='exam' && typeof renderMCQ==='function') renderMCQ();   // 복원분 회차목록에 '이어풀기' 반영
    } else {
      // 신규 회원(userData 문서 없음): 비회원 때 기록을 계정으로 옮김
      var _m2=mergeGuestProgress();
      srApplyToCards();
      solveCount=totalSolve(); setStatCountUI();
      // 게스트 기록은 startup srLoadLocal로 이미 메모리(srProgress)에 올라와 있어 병합이 no-op(added=0)이 되는 경우가 있음 → 메모리에 진행기록이 있으면 병합 성공 여부와 무관하게 신규 계정에 저장
      if(typeof saveUserData==='function' && (_m2 || Object.keys(srProgress).length>0 || Object.keys(appWrong).length>0)) saveUserData();
      refresh();
      if (activeCert === 'appraiser' && typeof renderMCQ==='function') renderMCQ();
    }
    if(typeof _ltResumeAfterLogin==='function') _ltResumeAfterLogin();   // 게스트 레벨테스트 → 로그인 후 결과 재계산·표시
  } catch(e) { console.error('데이터 로드 오류:', e); }
}

// 이어풀기 동기화 복원: Firestore resumeState가 로컬보다 최신이면(또는 로컬 없으면) localStorage에 복원
function srRestoreResume(data){
  try{
    var rs=data&&data.resumeState;
    if(!rs||!rs.active||!rs.prog) return false;
    var a=rs.active; if(!a.cert||a.sub==null||a.set==null) return false;
    if(typeof isMcqCert==='function' && !isMcqCert(a.cert)) return false;
    var localTs=0;
    try{ var lr=localStorage.getItem('certlab_mcq_active'); if(lr){ var la=JSON.parse(lr); localTs=(la&&la.ts)||0; } }catch(_){}
    if(localTs && localTs>=(rs.ts||0)) return false;   // 이 기기가 더 최신 → 로컬 유지
    localStorage.setItem('certlab_mcq_p_'+a.cert+'_'+a.sub+'_'+a.set, JSON.stringify(rs.prog));
    localStorage.setItem('certlab_mcq_active', JSON.stringify({cert:a.cert,sub:a.sub,set:a.set,ts:(rs.ts||Date.now())}));
    return true;
  }catch(_){ return false; }
}

// 내 O/X 동기화: Firestore oxState를 로컬 mqOX에 합친다(union, 로컬 우선) — 기기 간 O/X 보존
function srMergeOX(data){
  try{
    var fx=data&&data.oxState;
    if(!fx||typeof fx!=='object') return false;
    if(typeof mqOX==='undefined'||!mqOX) return false;
    var changed=false;
    var ftAll=(data&&data.oxTs&&typeof data.oxTs==='object')?data.oxTs:{};
    for(var qid in fx){
      if(!fx.hasOwnProperty(qid)) continue;
      var fEntry=fx[qid]; if(!fEntry||typeof fEntry!=='object') continue;
      // 이 기기에서 더 최근에 해제(다시 풀기)한 문항이면 원격 O/X를 다시 채우지 않음(부활 방지)
      if(!mqOX[qid] && mqOXTs[qid] && mqOXTs[qid]>=(ftAll[qid]||0)) continue;
      if(!mqOX[qid]){ mqOX[qid]=Object.assign({},fEntry); changed=true; continue; }
      for(var k in fEntry){
        if(!fEntry.hasOwnProperty(k)) continue;
        if(!(k in mqOX[qid])){ mqOX[qid][k]=fEntry[k]; changed=true; }   // 로컬에 없는 것만 채움(로컬 우선)
      }
    }
    if(changed && typeof mqOXSave==='function') mqOXSave();
    // 학습완료(oxLearned)·최근시각(oxTs)도 합치기: learned는 union, ts는 큰 값 우선
    try{
      var fl=data&&data.oxLearned;
      if(fl&&typeof fl==='object'){ for(var lq in fl){ if(!fl.hasOwnProperty(lq))continue; mqOXLearned[lq]=mqOXLearned[lq]||{}; for(var lk in fl[lq]){ if(!(lk in mqOXLearned[lq])) mqOXLearned[lq][lk]=fl[lq][lk]; } } }
      var ft=data&&data.oxTs;
      if(ft&&typeof ft==='object'){ for(var tq in ft){ if(!ft.hasOwnProperty(tq))continue; if(!mqOXTs[tq]||ft[tq]>mqOXTs[tq]) mqOXTs[tq]=ft[tq]; } }
      if(typeof mqOXSave==='function') mqOXSave();
    }catch(_){}
    return changed;
  }catch(_){ return false; }
}
function srMigrateIfNeeded(){
  if (srProgress && Object.keys(srProgress).length>0) return; // 이미 있음
  const now=Date.now(); let any=false;
  D.forEach(c=>{ if(c.w && c.id){ srProgress[SR_CERT+'|'+c.id]={st:0,nx:now,lr:now,res:0,rc:1,w:true}; any=true; } });
  if(any) srFlush();
}
// cardProgress의 오답상태(w)를 카드 객체에 반영
function srApplyToCards(){
  cards.forEach(c=>{ const p=srProgress[SR_CERT+'|'+c.id]; c.w=!!(p&&p.w); });
}
// 가입/로그인 시: 비회원 때 localStorage에 쌓인 학습기록을 계정으로 병합
// 정책 = '계정에 없는 문제만' 게스트 기록에서 가져옴(겹치면 계정 우선). 1회성, 병합 후 게스트 기록 정리.
function mergeGuestProgress(){
  try{
    var raw=localStorage.getItem('sr:'+SR_CERT); if(!raw) return false;
    var o=JSON.parse(raw); var gp=(o&&o.p&&typeof o.p==='object')?o.p:null;
    if(!gp) return false;
    var added=0;
    for(var k in gp){
      if(!Object.prototype.hasOwnProperty.call(gp,k)) continue;
      if(srProgress[k]===undefined){          // 계정에 없는 문제만
        srProgress[k]=gp[k]; added++;
      }
    }
    // 게스트 오답(w) 중 계정 srProgress에 새로 들어온 것 → 객관식 오답노트(appWrong)에도 반영
    for(var k2 in srProgress){
      var p=srProgress[k2];
      if(p&&p.w){ var qid=k2.split('|').pop(); if(MCQ_QID2CS[qid] && !appWrong[qid]) appWrong[qid]=true; }
    }
    // 병합한 게스트 기록은 정리(다음 로그인 때 중복 병합 방지)
    if(added>0){
      try{ localStorage.removeItem('sr:'+SR_CERT); }catch(_){}
    }
    return added>0;
  }catch(_){ return false; }
}
// 비로그인(게스트) localStorage 복원
function srLoadLocal(){
  try{ const raw=localStorage.getItem('sr:'+SR_CERT); if(!raw) return;
    const o=JSON.parse(raw); srProgress=o.p||{}; srExamOverride=o.e||{};
    if(o.c){ solveCountByCert.bodybuilding=o.c; solveCount=totalSolve(); setStatCountUI(); }
    srApplyToCards();
  }catch(_){}
}
// 네임스페이스 키 적용: "시험종류‖과목‖문제" (신형) / "과목||문제" (구형=생체, 무손실)
function applyMark(key, field, val) {
  if (typeof key !== 'string') return;
  if (key.indexOf('‖') !== -1) {
    const p = key.split('‖'); const cert = p[0];
    if (isMcqCert(cert)) {
      const qid = p[p.length-1];
      if (field==='w') appWrong[qid]=val;   // 객관식 오답 (즐겨찾기 미사용)
    } else { // bodybuilding
      const sub=p[1], q=p.slice(2).join('‖');
      const i=D.findIndex(c=>c.s===sub && c.q===q); if(i!==-1) D[i][field]=val;
    }
  } else { // 구형 생체 키 "과목||문제"
    const i=D.findIndex(c=>(c.s+'||'+c.q)===key); if(i!==-1) D[i][field]=val;
  }
}

// ===== Firestore 저장 =====
async function saveUserData() {
  if (!currentUser || !db) return;
  try {
    const wrongList = [
      ...D.filter(c=>c.w).map(c=>'bodybuilding‖'+c.s+'‖'+c.q),
      ...Object.keys(appWrong).filter(qid=>appWrong[qid]&&MCQ_QID2CS[qid]).map(qid=>MCQ_QID2CS[qid].cert+'‖'+MCQ_QID2CS[qid].sub+'‖'+qid)
    ];
    const favoriteList = D.filter(c=>c.fav).map(c=>'bodybuilding‖'+c.s+'‖'+c.q);
    // 이어풀기 동기화: 진행 중인 회차 포인터+진도를 함께 저장(없으면 null) — 기기 간 이어풀기
    let resumeState=null;
    try{
      const aRaw=localStorage.getItem('certlab_mcq_active');
      if(aRaw){
        const a=JSON.parse(aRaw);
        if(a&&a.cert&&a.sub!=null&&a.set!=null){
          const pRaw=localStorage.getItem('certlab_mcq_p_'+a.cert+'_'+a.sub+'_'+a.set);
          if(pRaw){ resumeState={ active:{cert:a.cert,sub:a.sub,set:a.set}, prog:JSON.parse(pRaw), ts:(a.ts||Date.now()) }; }
        }
      }
    }catch(_){ resumeState=null; }
    await db.collection('userData').doc(currentUser.uid).set({
      wrongList, favoriteList, solveCount: totalSolve(), solveCountByCert,
      cardProgress: srProgress, examDates: srExamOverride, diagnostics: srDiagnostics,
      resumeState: resumeState,
      oxState: (typeof mqOX!=='undefined' && mqOX) ? mqOX : {},
      oxLearned: (typeof mqOXLearned!=='undefined' && mqOXLearned) ? mqOXLearned : {},
      oxTs: (typeof mqOXTs!=='undefined' && mqOXTs) ? mqOXTs : {},
      eloState: (typeof eloState!=='undefined' && eloState) ? eloState : {},
      luHist: (typeof luHistAll!=='undefined' && luHistAll) ? luHistAll : {},
      luResume: (typeof luResumeAll!=='undefined' && luResumeAll) ? luResumeAll : {},
      sport2subs: (_sp2SubsMem && _sp2SubsMem.length===5) ? _sp2SubsMem : null,
      lastStudyAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) { console.error('저장 오류:', e); }
}

// ===== 로그인/로그아웃 =====
// ===== 인앱 브라우저 팝업 =====
function openInChrome() {
  const url = window.location.href;
  // 안드로이드: intent로 크롬 강제 실행
  if (/android/i.test(navigator.userAgent)) {
    window.location.href = 'intent://' + url.replace(/https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
  } else {
    // iOS: 클립보드 복사 안내
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert('주소가 복사되었습니다!\nChrome을 열고 붙여넣기 해주세요.');
    } else {
      alert('Chrome 브라우저에서 certlab.ai.kr 을 입력해 접속해주세요.');
    }
  }
}
function closeInappPopup() {
  document.getElementById('inappPopup').classList.add('hidden');
  sessionStorage.setItem('inappDismissed', '1');
}
function checkInAppBrowser() {
  if (isInAppBrowser() && !sessionStorage.getItem('inappDismissed')) {
    document.getElementById('inappPopup').classList.remove('hidden');
  }
}

function isInAppBrowser() {
  const ua = navigator.userAgent.toLowerCase();
  return /kakaotalk|naver|instagram|fban|fbav|line|wechat|micromessenger/.test(ua)
    || (ua.includes('android') && ua.includes('wv'))
    || (ua.includes('iphone') && !ua.includes('safari'));
}

async function signInWithGoogle() {
  if (!firebaseReady) { alert('로그인은 배포된 사이트(인터넷 연결)에서 동작합니다. 지금은 미리보기 모드예요.'); return; }
  if (isInAppBrowser()) {
    const url = window.location.href;
    // 안드로이드: intent로 크롬 열기
    if (/android/i.test(navigator.userAgent)) {
      window.location.href = 'intent://' + url.replace(/https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
    } else {
      // iOS: 외부 브라우저 안내
      alert('⚠️ 로그인하려면 외부 브라우저에서 열어야 합니다. 우측 하단 메뉴(···) → 기본 브라우저로 열기 를 눌러주세요.');
    }
    return;
  }
  try {
    await auth.signInWithPopup(googleProvider);
    hideLoginPopup();
    // CompleteRegistration은 loadUserPlan 신규회원 분기에서 발사(로그인 경로 무관 보장)
  } catch(e) {
    if (e.code === 'auth/popup-closed-by-user') return;
    // 팝업 미지원(PC 서드파티 쿠키 차단·인앱·storage 제약) → 리다이렉트 폴백
    if (e.code === 'auth/operation-not-supported-in-this-environment' || e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request' || e.code === 'auth/web-storage-unsupported') {
      try { await auth.signInWithRedirect(googleProvider); return; }
      catch(e2) { alert('로그인 오류: ' + (e2 && e2.message || e2)); return; }
    }
    alert('로그인 오류: ' + e.message);
  }
}

function signOut() {
  if (confirm('로그아웃 하시겠어요?')) {
    auth.signOut();
  }
}

// ===== Auth 바 업데이트 =====
function updateAuthBar() {
  const bar = document.getElementById('authBar');
  if (!currentUser) {
    bar.innerHTML = '<button class="btn-login" onclick="showLoginPopup()">로그인</button>';
    return;
  }
  const planLabels = { FREE_TRIAL:'무료체험', ACTIVE:'이용중', EXPIRED:'만료', GUEST:'게스트' };
  const planClasses = { FREE_TRIAL:'plan-free', ACTIVE:'plan-active', EXPIRED:'plan-expired', GUEST:'plan-guest' };
  const img = currentUser.photoURL
    ? `<img class="user-avatar" src="${currentUser.photoURL}" alt="">`
    : `<div style="width:28px;height:28px;border-radius:50%;background:#B5D4F4;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#185FA5">${(currentUser.displayName||'U')[0]}</div>`;
  bar.innerHTML = `
    <div class="user-menu" id="userMenu">
      <button class="avatar-btn" onclick="toggleUserMenu(event)" aria-label="내 메뉴">${img}</button>
      <div class="user-dropdown hidden" id="userDropdown">
        <span class="plan-badge ${planClasses[userPlan]}">${planLabels[userPlan]||userPlan}</span>
        <div class="mile-bal">💰 포인트 <b>${mileageBalance(myMileageLots).toLocaleString()}P</b></div>
        <button class="ref-acc-btn" onclick="openMyPage()">👤 마이페이지</button>
        <button class="ref-acc-btn" onclick="toggleReferralAcc(event)">🎁 추천 링크 ▾</button>
        <div class="ref-acc hidden" id="refAcc">
          <div class="ref-acc-desc">친구가 가입하면 둘 다 1,000원, 친구가 결제하면 +10,000원!</div>
          <div class="ref-link-box"><input id="refLinkInput" readonly value="${myReferralCode?myReferralLink():'-'}"><button onclick="copyReferralLink(event)">복사</button></div>
        </div>
        <button class="ref-acc-btn" onclick="addToHome(event)">📲 홈 화면에 추가</button>
        <button class="btn-logout" onclick="signOut()">로그아웃</button>
      </div>
    </div>`;
}
function toggleUserMenu(e){ if(e){e.stopPropagation();} const d=document.getElementById('userDropdown'); if(d) d.classList.toggle('hidden'); }
function copyReferralLinkW(e){
  if(e){e.stopPropagation();}
  try{ clTrackCustom('InviteLinkCopied', { source:'mypage' }); }catch(_){}
  const inp=document.getElementById('refLinkInputW'); const link=myReferralLink();
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(link).then(()=>alert('추천 링크가 복사되었어요!')).catch(()=>{if(inp){inp.select();document.execCommand('copy');}alert('추천 링크가 복사되었어요!');}); }
  else { if(inp){inp.select(); try{document.execCommand('copy');}catch(_){}} alert('추천 링크가 복사되었어요!'); }
}
function toggleReferralAcc(e){ if(e){e.stopPropagation();} const a=document.getElementById('refAcc'); if(a) a.classList.toggle('hidden'); }
function copyReferralLink(e){
  if(e){e.stopPropagation();}
  try{ clTrackCustom('InviteLinkCopied', { source:'dropdown' }); }catch(_){}
  const inp=document.getElementById('refLinkInput'); if(!inp) return;
  const link=myReferralLink();
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(link).then(()=>alert('추천 링크가 복사되었어요!')).catch(()=>{inp.select();document.execCommand('copy');alert('추천 링크가 복사되었어요!');}); }
  else { inp.select(); try{document.execCommand('copy');}catch(_){} alert('추천 링크가 복사되었어요!'); }
}
document.addEventListener('click',function(e){ const m=document.getElementById('userMenu'); const d=document.getElementById('userDropdown'); if(d&&m&&!m.contains(e.target)) d.classList.add('hidden'); });

// ===== 팝업 =====
function showLoginPopup(mode='default') {
  // 게스트가 방금 푼 문제가 4초 디바운스로 아직 localStorage에 안 써졌을 수 있음 → 로그인 직전 즉시 flush(게스트 분기=localStorage 기록)
  try{ if(typeof currentUser!=='undefined' && !currentUser && typeof srDirtyCount!=='undefined' && srDirtyCount>0 && typeof srFlush==='function') srFlush(); }catch(_){}
  const popup = document.getElementById('loginPopup');
  const title = document.getElementById('loginTitle');
  const sub = document.getElementById('loginSub');
  if (mode === 'guest_limit') {
    title.textContent = '🎯 로그인하면 하루 2배!';
    sub.textContent = '오늘 무료 문제를 다 푸셨어요. 구글 로그인하면 하루 '+(typeof _userDaily==='function'?_userDaily():20)+'문제로 늘고, 학습 기록도 저장돼요!';
  } else {
    title.textContent = '📚 CertLab';
    sub.textContent = '구글 로그인 후 모든 기능을 이용하세요.';
  }
  if(typeof updateEventBanner==='function') updateEventBanner();
  popup.classList.remove('hidden');
  // 기능 안내: 현재 시험명+문제수(위) / 전체 시험·문제수(아래)
  try{
    var cert=(typeof activeCertId==='function')?activeCertId():'bodybuilding';
    var cn=(typeof certQuestionCount==='function')?certQuestionCount(cert):0;
    var nm=(typeof CERT_FULLNAMES!=='undefined'&&CERT_FULLNAMES[cert])?CERT_FULLNAMES[cert]:'';
    var fc=document.getElementById('loginFeatCount');
    if(fc) fc.textContent = cn>0 ? (nm?nm+' ':'')+'전체 '+cn.toLocaleString()+'문제 + 상세 해설' : '전체 기출문제 + 상세 해설';
    var fa=document.getElementById('loginFeatAll');
    if(fa){
      var allN=(typeof totalQuestionCountAll==='function')?totalQuestionCountAll():0;
      var ex=(typeof examCount==='function')?examCount():0;
      fa.textContent = (ex>0&&allN>0) ? '🎓 CertLab 전체 '+ex+'개 시험 · 총 '+allN.toLocaleString()+'문제 수록' : '';
      fa.style.display = fa.textContent ? '' : 'none';
    }
  }catch(_){}
}
function hideLoginPopup() { document.getElementById('loginPopup').classList.add('hidden'); }

// ===== 회원 탈퇴 · 계정 삭제 =====
function showDeletePopup() {
  var p = document.getElementById('delPopup');
  if (!p) return;
  var d = document.getElementById('userDropdown'); if (d) d.classList.add('hidden');
  _delSyncView();
  p.classList.remove('hidden');
}
function hideDeletePopup() {
  var p = document.getElementById('delPopup'); if (p) p.classList.add('hidden');
  // URL 해시 정리(#account-delete로 진입한 경우)
  if ((location.hash || '') === '#account-delete') {
    try { history.replaceState(null, '', location.pathname + location.search); } catch(_){ location.hash=''; }
  }
}
function _delSyncView() {
  var inBox = document.getElementById('delLoggedIn');
  var outBox = document.getElementById('delLoggedOut');
  var sub = document.getElementById('delSub');
  var logged = (typeof currentUser !== 'undefined' && currentUser);
  if (inBox) inBox.style.display = logged ? '' : 'none';
  if (outBox) outBox.style.display = logged ? 'none' : '';
  if (sub) sub.textContent = logged
    ? ((currentUser.email || '내') + ' 계정을 삭제합니다.')
    : '아래 내용을 확인하신 뒤 진행해 주세요.';
  var cb = document.getElementById('delAgree'); if (cb) cb.checked = false;
  var btn = document.getElementById('delGoBtn'); if (btn) btn.disabled = true;
}
async function deleteMyAccount() {
  if (!firebaseReady || !db || !currentUser) { alert('로그인 상태에서만 탈퇴할 수 있어요.'); return; }
  if (!confirm('정말 계정을 영구 삭제할까요?\n삭제된 학습 기록·이용권·마일리지는 되돌릴 수 없습니다.')) return;
  var btn = document.getElementById('delGoBtn');
  if (btn) { btn.disabled = true; btn.textContent = '삭제 중…'; }
  var uid = currentUser.uid;
  try {
    // 1) Firestore 사용자 데이터 삭제 (없는 문서는 무시)
    await Promise.allSettled([
      db.collection('users').doc(uid).delete(),
      db.collection('userData').doc(uid).delete(),
      db.collection('referrals').doc(uid).delete()
    ]);
    // 2) 인증 계정 삭제 (오래된 로그인이면 재인증 후 재시도)
    try {
      await currentUser.delete();
    } catch (e) {
      if (e && e.code === 'auth/requires-recent-login') {
        try { await currentUser.reauthenticateWithPopup(googleProvider); }
        catch (e2) {
          if (e2 && (e2.code === 'auth/operation-not-supported-in-this-environment' || e2.code === 'auth/popup-blocked')) {
            await currentUser.reauthenticateWithRedirect(googleProvider); return;
          }
          throw e2;
        }
        await currentUser.delete();
      } else { throw e; }
    }
    // 3) 로컬 상태 정리
    try { Object.keys(localStorage).forEach(function(k){ if (k.indexOf('certlab_') === 0) localStorage.removeItem(k); }); } catch(_){}
    alert('계정과 관련 데이터가 삭제되었습니다. 그동안 이용해 주셔서 감사합니다.');
    try { history.replaceState(null, '', location.pathname + location.search); } catch(_){ location.hash=''; }
    location.reload();
  } catch (e) {
    console.error('계정 삭제 오류:', e);
    alert('삭제 중 오류가 발생했습니다: ' + (e && e.message || e) + '\n잠시 후 다시 시도하거나 문의해 주세요.');
    if (btn) { btn.disabled = false; btn.textContent = '영구 삭제하기'; }
  }
}
// #account-delete 진입 시 팝업 오픈 (Play Console 삭제 링크용)
(function(){
  function _delRoute(){
    if ((location.hash || '') === '#account-delete') { if (typeof showDeletePopup === 'function') showDeletePopup(); }
  }
  window.addEventListener('load', function(){ setTimeout(_delRoute, 300); });
  window.addEventListener('hashchange', _delRoute);
})();
// 환급 안내 팝업 — 전 사용자(기존 가입자 포함)에게. X=24시간, '7일간 보지 않기'=7일 숨김
// 헤더 이벤트 배지: 홈→공통 환급글, 이벤트 있는 시험→해당 글, 이벤트 없는 시험→숨김
function updateEventBadge(){
  var b=document.getElementById('eventBadge'); if(!b) return;
  var l2=b.querySelector('.eb-l2');
  if(activeCert===null){ b.style.display=''; b.setAttribute('href','#post/LOk5j9wje78LqxRt34SW'); if(l2) l2.textContent='이벤트'; }
  else { b.style.display=''; b.setAttribute('href',REFUND.page); if(l2) l2.textContent=REFUND.badge; }
}
// 로그인/환영 팝업 안의 환급 배너: 이벤트 있는 시험만, 시험별 문구로
function updateEventBanner(){
  var b=document.getElementById('loginRefundBanner'); if(!b) return;
  var ev=REFUND;
  b.style.display='';
  var ti=document.getElementById('loginRbTi'); if(ti) ti.innerHTML=ev.bannerLine+'<span class="rb-tag">선착순 30명</span>';
  var sb=document.getElementById('loginRbSub'); if(sb) sb.innerHTML=ev.bannerSub;
  var dt=document.getElementById('refundDetail'); if(dt) dt.innerHTML=ev.popSteps;
}
function maybeShowRefundPopup(){
  try{
    if(!currentUser) return;   // 로그인 후에만 노출(비로그인 차단)
    var ev=REFUND;   // 시험 구분 없이 단일 공통 문구
    var raw=localStorage.getItem('refundPopupHide');
    if(raw){ var until=parseInt(raw,10); if(until && Date.now()<until) return; }  // 숨김 기간 중
    var p=document.getElementById('refundPopup'); if(!p) return;
    // 다른 팝업(가입유도·환영·이용권)이 떠 있으면 양보
    var busy=['loginPopup','planPopup','inappPopup','guestFeatPopup'].some(function(id){ var e=document.getElementById(id); return e && !e.classList.contains('hidden'); });
    if(busy) return;
    // 장점 줄: 지금 보던 시험 문제수 + 전체 통계
    try{
      var rs=document.getElementById('refundStats');
      if(rs){
        var cert=(typeof activeCert!=='undefined' && activeCert) ? activeCert : '';
        var cn=cert?((typeof certQuestionCount==='function')?certQuestionCount(cert):0):0;
        var nm=cert?((typeof CERT_FULLNAMES!=='undefined'&&CERT_FULLNAMES[cert])?CERT_FULLNAMES[cert]:''):'';
        var allN=(typeof totalQuestionCountAll==='function')?totalQuestionCountAll():0;
        var ex=(typeof examCount==='function')?examCount():0;
        var line1 = (cert && cn>0) ? '📘 지금 보는 '+(nm||'시험')+' <b>'+cn.toLocaleString()+'문제</b>' : '';
        var line2 = (ex>0&&allN>0) ? '🎓 CertLab 전체 '+ex+'개 시험 · 총 <b>'+allN.toLocaleString()+'문제</b>' : '';
        rs.innerHTML = [line1,line2].filter(Boolean).join('<br>');
        rs.style.display = rs.innerHTML ? '' : 'none';
      }
    }catch(_){}
    try{
      var _t=document.getElementById('refundTitle'); if(_t) _t.textContent=ev.popTitle;
      var _s=document.getElementById('refundSub'); if(_s) _s.innerHTML=ev.popSub;
      var _st=document.getElementById('refundSteps'); if(_st) _st.innerHTML=ev.popSteps;
      var _l=document.getElementById('refundLink'); if(_l){ if(ev.page){ _l.setAttribute('href',ev.page); _l.style.display=''; } else { _l.style.display='none'; } }
    }catch(_){}
    p.classList.remove('hidden');
  }catch(_){}
}
function closeRefundPopup(mode){
  try{
    var ms = mode==='week' ? 7*24*60*60*1000 : 24*60*60*1000;   // 7일 / 24시간
    localStorage.setItem('refundPopupHide', String(Date.now()+ms));
  }catch(_){}
  var p=document.getElementById('refundPopup'); if(p) p.classList.add('hidden');
}

// 게스트 5문제 풀이 시 1회 기능 안내(망각곡선·예상점수·약점분석). 닫기/이동 → 30일 숨김(기존 팝업과 동일 방식)
function bumpGuestSolved(){
  if(!currentUser) return;
  if(typeof mqLevelTest!=='undefined' && (mqLevelTest||mqDiag)) return;
  var n; try{ n=(parseInt(localStorage.getItem('clGuestQ')||'0',10)||0)+1; localStorage.setItem('clGuestQ',String(n)); }catch(_){ return; }
  if(n>=5) maybeShowGuestFeatPopup();
}
function maybeShowGuestFeatPopup(){
  if(!currentUser) return;
  try{ var raw=localStorage.getItem('guestFeatPopupHide'); if(raw){ var u=parseInt(raw,10); if(u && Date.now()<u) return; } }catch(_){}
  var p=document.getElementById('guestFeatPopup'); if(!p || !p.classList.contains('hidden')) return;
  var busy=['loginPopup','planPopup','inappPopup','refundPopup','conceptOfferPopup'].some(function(id){ var e=document.getElementById(id); return e && !e.classList.contains('hidden'); });
  if(busy) return;
  p.classList.remove('hidden');
}
function closeGuestFeatPopup(){
  try{ localStorage.setItem('guestFeatPopupHide', String(Date.now()+30*24*60*60*1000)); }catch(_){}
  var p=document.getElementById('guestFeatPopup'); if(p) p.classList.add('hidden');
}
var _cmReturn=null;   // 커뮤니티 진입 전 진행중 시험 상태(돌아올 때 이어풀기)
function goGuestFeatNotice(){
  closeGuestFeatPopup();
  if(typeof mqScreen!=='undefined' && mqScreen==='exam'){
    _cmReturn={cert:mqCert, sub:mqSub, set:mqSet, idx:mqIdx, diag:!!mqDiag, lt:!!mqLevelTest};
  } else { _cmReturn=null; }
  cmBoard='notice';
  if(typeof openCommunity==='function') openCommunity();
  setTimeout(function(){ if(typeof cmOpenDetail==='function') cmOpenDetail('XSVOWwoSkxFanqOqbFJX'); }, 220);
}
function cmBack(){
  if(_cmReturn && _cmReturn.cert){
    var r=_cmReturn; _cmReturn=null;
    try{
      var cmv=document.getElementById('communityView'); if(cmv) cmv.classList.add('hidden');
      var hv=document.getElementById('homeView'); if(hv) hv.classList.add('hidden');
      var hd=document.querySelector('.header'); if(hd) hd.classList.add('hidden');
      var csw=document.getElementById('certSwitch'); if(csw) csw.classList.remove('hidden');
      var mcv=document.getElementById('mcqView'); if(mcv) mcv.classList.remove('hidden');
      mqCert=r.cert;
      if(r.diag||r.lt){ if(typeof diagResume==='function'){ diagResume(); return; } }
      else if(typeof resumeMcqExam==='function' && r.sub!=null && r.sub!==''){ resumeMcqExam(r.sub, r.set||0); mqIdx=r.idx||0; mqShow={}; if(typeof renderMCQ==='function') renderMCQ(); window.scrollTo(0,0); return; }
    }catch(e){ console.error('cmBack', e); }
  }
  goHome();
}
function toggleRefundDetail(){ var d=document.getElementById('refundDetail'); if(!d) return; var btn=event&&event.target; var open=d.classList.toggle('hidden')===false; if(btn) btn.textContent= open?'접기 ▲':'자세히 ▾'; }

function certQuestionCount(cert){
  try{
    if(typeof isMcqCert==='function' && isMcqCert(cert)){
      const qb=qbOf(cert); let n=0;
      Object.keys(qb).forEach(s=>(qb[s].sets||[]).forEach(st=>n+=(st.questions||[]).length));
      return n;
    }
    return (typeof D!=='undefined') ? D.length : 0;   // 플래시카드
  }catch(_){ return 0; }
}
function totalQuestionCountAll(){
  let n=0;
  try{ if(typeof D!=='undefined') n+=D.length; }catch(_){}
  try{ (MCQ_CERTS||[]).forEach(c=>{ n+=certQuestionCount(c); }); }catch(_){}
  return n;
}
function examCount(){
  let c=0;
  try{ if(typeof D!=='undefined' && D.length>0) c++; }catch(_){}      // 플래시카드(생체)
  try{ (MCQ_CERTS||[]).forEach(cert=>{ if(certQuestionCount(cert)>0) c++; }); }catch(_){}
  return c;
}
function featureCompareHTML(totalTxt){
  // 무료/유료 2장 카드. 같은 순서의 줄끼리 같은 기능(아이콘으로 매칭).
  const free=[
    '📄 50문제 체험',
    '📚 기출·해설 <b class="cmp-warn">△ 체험분</b>',
    '📈 예상점수 <b class="cmp-warn">△ 체험분</b>',
    '🧠 복습 <b class="cmp-warn">△ 제한</b>',
    '🔊 음성·암기 <b class="cmp-warn">△ 체험분</b>',
    '💾 학습기록 <b class="cmp-no">✕ 종료</b>'
  ];
  const paid=[
    '📄 전체 '+totalTxt+' <b>✓</b>',
    '📚 전 과목 기출·해설 <b>✓</b>',
    '📈 예상점수 전체 <b>✓</b>',
    '🧠 무제한 복습 <b>✓</b>',
    '🔊 음성·암기 <b>✓</b>',
    '💾 학습기록 계속 <b>✓</b>'
  ];
  return '<div class="cmp2">'
    + '<div class="cmp2-card cmp2-free"><div class="cmp2-h">무료 체험</div>'
      + free.map(t=>'<div class="cmp2-li">'+t+'</div>').join('') + '</div>'
    + '<div class="cmp2-card cmp2-paid"><div class="cmp2-badge">추천</div><div class="cmp2-h">유료 이용권</div>'
      + paid.map(t=>'<div class="cmp2-li">'+t+'</div>').join('') + '</div>'
    + '</div>';
}
function _togglePayUI(show){
  var els=['.plan-cards','.discount-row','.bank-info','#mileUseBox','#depositorName','#btnPayment','.payment-note'];
  els.forEach(function(sel){ document.querySelectorAll(sel).forEach(function(el){ el.style.display=show?'':'none'; }); });
  if(!show){ var m=document.querySelector('.discount-msg'); if(m) m.style.display='none'; }
}
function showAppWebPay(){
  _togglePayUI(false);
  var t=document.getElementById('planSheetTitle'); if(t) t.textContent='🎯 멤버십 이용권';
  var sub=document.getElementById('planSub'); if(sub) sub.textContent='맞춤 합격플랜과 무제한 문제풀이는 멤버십에서 이용할 수 있어요.';
  var st=document.getElementById('planStats');
  if(st) st.innerHTML='<div style="text-align:center;padding:16px 8px;font-size:13.5px;color:#3A4A5E;line-height:1.9">멤버십 이용권은 <b style="color:#0C447C">certlab.ai.kr</b> (웹)에서<br>가입하신 계정으로 시작할 수 있어요.<br><span style="font-size:12px;color:#8A7D6E">웹에서 이용권을 시작하면 앱에서도 바로 열려요.</span></div>'
    +'<button onclick="hidePlanPopup()" style="width:100%;padding:13px;margin-top:6px;background:linear-gradient(135deg,#1D9E75,#0C447C);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">확인</button>';
  _planPopupShow();
}
function showAppDailyDone(){
  _togglePayUI(false);
  var t=document.getElementById('planSheetTitle'); if(t) t.textContent='🌙 오늘 무료 학습 완료!';
  var sub=document.getElementById('planSub'); if(sub) sub.textContent='오늘 준비한 무료 문제를 다 푸셨어요. 내일 다시 오면 새 문제로 이어서 학습할 수 있어요!';
  var st=document.getElementById('planStats'); if(st) st.innerHTML='<div style="text-align:center;padding:20px 8px;font-size:13.5px;color:#3A4A5E;line-height:1.9">💪 매일 꾸준히가 합격의 지름길!<br>오늘도 수고했어요 🙌</div><button onclick="hidePlanPopup()" style="width:100%;padding:13px;margin-top:6px;background:linear-gradient(135deg,#1D9E75,#0C447C);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">확인</button>';
  _planPopupShow();
}
function showPlanPopup(membership) {
  const cert = activeCertId();
  if (typeof pwaStandalone==='function' && pwaStandalone()) {   // 설치앱: Play 정책 — 가격/결제 노출 금지
    if (membership) { showAppWebPay(); } else { showAppDailyDone(); }
    return;
  }
  _togglePayUI(true);
  const titleEl = document.getElementById('planSheetTitle');
  if (titleEl) titleEl.textContent = membership ? `🎯 멤버십 이용권` : `⏰ 오늘 무료 학습 완료!`;
  const subEl = document.getElementById('planSub');
  if (subEl) subEl.textContent = membership ? `이용권을 시작하면 맞춤 합격플랜과 무제한 문제풀이를 이용할 수 있어요.` : `오늘의 무료 문제를 다 푸셨어요. 이용권을 시작하면 문제 수 제한 없이 전체 기출·해설·학습 기록을 이용할 수 있어요.`;
  const n = certQuestionCount(cert);
  const totalTxt = n>0 ? n.toLocaleString()+'문제' : '전체 기출문제';
  const allN = totalQuestionCountAll();
  const exams = examCount();
  const headTxt = (n>0) ? certLabel(cert)+' · '+n.toLocaleString()+'문제 수록' : certLabel(cert)+' · 전체 기출 + 상세해설';
  const stats = document.getElementById('planStats');
  if (stats) {
    stats.innerHTML =
      '<div class="plan-hl">📚 '+headTxt+'</div>'
      + '<div style="margin:10px 0;padding:11px 13px;background:#F5F8FF;border:1px solid #D6E2F5;border-radius:10px;text-align:left">'
        + '<div style="font-size:13px;font-weight:700;color:#0C447C;margin-bottom:7px">서트랩만의 학습법</div>'
        + '<div style="font-size:12.5px;color:#3A4A5E;line-height:1.85">'
          + '🎯 <b style="color:#0C447C;font-weight:500">레벨테스트 + 레벨업</b> — 실력 진단 후 5문제씩, 약점만 집중<br>'
          + '🔁 <b style="color:#0C447C;font-weight:500">변형문제 · OX진술 학습</b> — 같은 유형 반복으로 확실히<br>'
          + '📈 <b style="color:#0C447C;font-weight:500">예상점수 · 약점 분석</b> — 지금 합격선인지 바로 확인<br>'
          + '🧠 <b style="color:#0C447C;font-weight:500">망각곡선 자동복습</b> — 푼 건 안 까먹게'
        + '</div></div>'
      + featureCompareHTML(totalTxt);
  }
  _planPopupShow();
  renderPlanCards(cert);
  mileApplyOn=false; renderMileUse();
}
function _planPopupShow(){ var pp=document.getElementById('planPopup'); if(!pp) return; var ov=document.getElementById('passPlanOverlay'); pp.style.zIndex=(ov && ov.style.display==='block')?'9300':''; pp.classList.remove('hidden'); }  /* [FIX 2026-07] 합격플랜 전체화면(z9000) 위로 결제팝업을 올려 가려짐 방지 */
function hidePlanPopup() { var pp=document.getElementById('planPopup'); if(pp){ pp.classList.add('hidden'); pp.style.zIndex=''; } }

function showWelcomePopup() {
  const popup = document.getElementById('loginPopup');
  document.getElementById('loginTitle').textContent = '🎉 환영합니다!';
  document.getElementById("loginSub").textContent = "50문제 무료 체험이 시작되었습니다. 지금 바로 학습해보세요!";
  document.querySelector('.auth-features').innerHTML = `
    <div class="auth-feature-item">전체 기출문제 + 상세 해설</div>
    <div class="auth-feature-item">자동복습 & 오답노트</div>
    <div class="auth-feature-item">레벨테스트·예상점수 무료</div>
    <div class="auth-feature-item">50문제 무료 체험!</div>
    <div class="welcome-mile">🎁 가입 축하 <b>1,000P</b> 포인트 지급! <span>(3일 안에 사용)</span><br>
      친구를 초대하면 친구도 나도 1,000원, 친구가 결제하면 +10,000원 (1년 유효)
      <div class="ref-link-box"><input id="refLinkInputW" readonly value="${myReferralCode?myReferralLink():'-'}"><button onclick="copyReferralLinkW(event)">링크 복사</button></div>
    </div>`;
  document.querySelector('.btn-google-login').style.display='none';
  document.querySelector('.auth-sheet-close').textContent='학습 시작하기!';
  document.querySelector('.auth-sheet-close').style.background='linear-gradient(135deg,#185FA5,#0C447C)';
  document.querySelector('.auth-sheet-close').style.color='#fff';
  if(typeof updateEventBanner==='function') updateEventBanner();
  popup.classList.remove('hidden');
}

// ===== 이용권 선택 & 신청 =====
const PLAN_SETS={
  _default:[{d:7,p:3900,name:'1주 이용권',desc:'7일 전체 이용'},
            {d:14,p:5900,name:'2주 이용권',desc:'14일 전체 이용'},
            {d:28,p:8900,name:'4주 이용권',desc:'28일 전체 이용'},
            {d:56,p:13900,name:'8주 이용권',desc:'56일 전체 이용',pop:'⭐ 가장 경제적',green:1,sel:1}],
  bodybuilding:[{d:7,p:3900,name:'1주 이용권',desc:'7일 전체 이용'},
            {d:14,p:5900,name:'2주 이용권',desc:'14일 전체 이용'},
            {d:28,p:8900,name:'4주 이용권',desc:'28일 전체 이용'},
            {d:56,p:13900,name:'8주 이용권',desc:'56일 전체 이용',pop:'⭐ 가장 경제적',green:1,sel:1}],
  appraiser:[{d:7,p:4900,name:'1주 이용권',desc:'7일 전체 이용'},
             {d:14,p:7900,name:'2주 이용권',desc:'14일 전체 이용'},
             {d:28,p:11900,name:'4주 이용권',desc:'28일 전체 이용'},
             {d:56,p:17900,name:'8주 이용권',desc:'56일 전체 이용',pop:'⭐ 가장 경제적',green:1,sel:1}],
  koreanhistory:[{d:7,p:3900,name:'1주 이용권',desc:'7일 전체 이용'},
                 {d:14,p:5900,name:'2주 이용권',desc:'14일 전체 이용'},
                 {d:28,p:8900,name:'4주 이용권',desc:'28일 전체 이용'},
                 {d:56,p:13900,name:'8주 이용권',desc:'56일 전체 이용',pop:'⭐ 가장 경제적',green:1,sel:1}],
  realestate1:[{d:7,p:3900,name:'1주 이용권',desc:'7일 전체 이용'},
               {d:14,p:5900,name:'2주 이용권',desc:'14일 전체 이용'},
               {d:28,p:8900,name:'4주 이용권',desc:'28일 전체 이용'},
               {d:56,p:13900,name:'8주 이용권',desc:'56일 전체 이용',pop:'⭐ 가장 경제적',green:1,sel:1}],
  realestate2:[{d:7,p:4900,name:'1주 이용권',desc:'7일 전체 이용'},
               {d:14,p:7900,name:'2주 이용권',desc:'14일 전체 이용'},
               {d:28,p:11900,name:'4주 이용권',desc:'28일 전체 이용'},
               {d:56,p:17900,name:'8주 이용권',desc:'56일 전체 이용',pop:'⭐ 가장 경제적',green:1,sel:1}],
  housing:[{d:7,p:3900,name:'1주 이용권',desc:'7일 전체 이용'},
           {d:14,p:5900,name:'2주 이용권',desc:'14일 전체 이용'},
           {d:28,p:8900,name:'4주 이용권',desc:'28일 전체 이용'},
           {d:56,p:13900,name:'8주 이용권',desc:'56일 전체 이용',pop:'⭐ 가장 경제적',green:1,sel:1}],
  housing2:[{d:7,p:4900,name:'1주 이용권',desc:'7일 전체 이용'},
            {d:14,p:7900,name:'2주 이용권',desc:'14일 전체 이용'},
            {d:28,p:11900,name:'4주 이용권',desc:'28일 전체 이용'},
            {d:56,p:17900,name:'8주 이용권',desc:'56일 전체 이용',pop:'⭐ 가장 경제적',green:1,sel:1}]
};
let _pricingCfg=null;   // config/pricing: {tiers:{premium/standard/light:{m1,m3,m6,m12}}, certTier:{cert:tier}, freeDays}
const _LEGACY_PLAN_NAMES={7:'1주 이용권',14:'2주 이용권',28:'4주 이용권',56:'8주 이용권',30:'1개월 이용권',90:'3개월 이용권',180:'6개월 이용권',365:'1년 이용권'};
function _certTier(cert){ return (_pricingCfg&&_pricingCfg.certTier&&_pricingCfg.certTier[cert]) || 'standard'; }
function _tierPlans(tier){
  var t=(_pricingCfg&&_pricingCfg.tiers&&_pricingCfg.tiers[tier])||null; if(!t) return null;
  return [ {d:30,p:+t.m1||0,name:'1개월 이용권',desc:'30일 전체 이용'},
           {d:90,p:+t.m3||0,name:'3개월 이용권',desc:'90일 전체 이용'},
           {d:180,p:+t.m6||0,name:'6개월 이용권',desc:'180일 전체 이용'},
           {d:365,p:+t.m12||0,name:'1년 이용권',desc:'365일 전체 이용',pop:'⭐ 가장 경제적',green:1,sel:1} ];
}
function plansFor(cert){ if(_pricingCfg){ var tp=_tierPlans(_certTier(cert)); if(tp) return tp; } return PLAN_SETS[cert]||PLAN_SETS._default; }
function planLabelOf(days){ const s=plansFor(activeCertId()).find(x=>x.d===days); return s?s.name:(days+'일 이용권'); }
function renderPlanCards(cert){
  const set=plansFor(cert), box=document.querySelector('.plan-cards'); if(!box) return;
  box.innerHTML=set.map((pl,i)=>{
    const badge=pl.pop?('<div class="plan-badge-pop"'+(pl.green?' style="background:linear-gradient(135deg,#1D9E75,#0C447C)"':'')+'>'+pl.pop+'</div>'):'';
    return '<div class="plan-card" id="plan'+pl.d+'" onclick="selectPlan('+pl.d+','+pl.p+')">'+badge
      +'<div class="plan-card-top"><span class="plan-card-name">'+pl.name+'</span>'
      +'<span class="plan-card-price">'+pl.p.toLocaleString()+'원</span></div>'
      +'<div class="plan-card-desc">'+pl.desc+'</div></div>';
  }).join('');
  const mid=set.find(x=>x.sel)||set[1]||set[0]; selectPlan(mid.d, mid.p);   // 기본 선택 = sel 지정 또는 가운데
}
function selectPlan(days, price) {
  selectedPlanDays = days;
  selectedPlanPrice = price;
  document.querySelectorAll('.plan-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById('plan'+days).classList.add('selected');
  recalcPay();
}
let mileApplyOn = false;
function renderMileUse(){
  const box=document.getElementById('mileUseBox'); if(!box) return;
  const bal=mileageBalance(myMileageLots);
  if(bal<=0){ box.innerHTML=''; mileApplyOn=false; return; }
  box.innerHTML='<label class="mile-use"><input type="checkbox" id="mileChk" '+(mileApplyOn?'checked':'')+' onchange="onMileToggle()"> 💰 보유 포인트 <b>'+bal.toLocaleString()+'P</b> 사용</label>';
}
function onMileToggle(){ const c=document.getElementById('mileChk'); mileApplyOn=!!(c&&c.checked); recalcPay(); }
function recalcPay(){
  const btn=document.getElementById('btnPayment'); if(!btn) return;
  const price=selectedPlanPrice||0;
  const bal=mileageBalance(myMileageLots);
  const applied=mileApplyOn?Math.min(bal,price):0;
  const payable=price-applied;
  if(price<=0){ btn.textContent='이용권을 선택하세요'; return; }
  if(payable<=0) btn.textContent='포인트 '+applied.toLocaleString()+'P로 결제 (즉시 활성화)';
  else if(applied>0) btn.textContent=payable.toLocaleString()+'원 입금 신청 (포인트 '+applied.toLocaleString()+'P 사용)';
  else btn.textContent=price.toLocaleString()+'원 입금 완료 신청';
}

function consumeMileage(lots, amount){
  const now=Date.now();
  const active=lots.filter(l=>l && !l.used && (l.a>0) && (!l.exp||l.exp>now))
    .sort((a,b)=>(a.exp||9e15)-(b.exp||9e15));   // 빨리 만료되는 것부터
  let need=amount;
  for(const l of active){ if(need<=0) break; const take=Math.min(l.a, need); l.a-=take; need-=take; if(l.a<=0) l.used=true; }
  return lots.filter(l=>l && !l.used && (l.a>0));   // 소진된 lot 제거
}
async function submitPayment() {
  if (!currentUser) { showLoginPopup(); return; }
  if (!selectedPlanDays || !selectedPlanPrice) { alert('이용권을 먼저 선택해주세요.'); return; }
  const cert = activeCertId();
  const certName = certFull(cert);
  const price = selectedPlanPrice;
  const bal = mileageBalance(myMileageLots);
  const applied = mileApplyOn ? Math.min(bal, price) : 0;
  const payable = price - applied;
  const depositorName = (document.getElementById('depositorName').value||'').trim();
  if (payable > 0 && !depositorName) { alert('입금자 이름을 입력해주세요.'); return; }

  const confMsg = payable<=0
    ? '['+certName+'] '+planLabelOf(selectedPlanDays)+'\n포인트 '+applied.toLocaleString()+'P로 결제 (입금 없이 즉시 활성화)\n진행할까요?'
    : '['+certName+'] '+planLabelOf(selectedPlanDays)+' - '+price.toLocaleString()+'원\n'+(applied>0?'포인트 '+applied.toLocaleString()+'P 사용 + 입금 '+payable.toLocaleString()+'원\n':'')+'입금자: '+depositorName+'\n신청하시겠어요?';
  if (!confirm(confMsg)) return;

  try {
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + selectedPlanDays);

    if (applied > 0) {
      myMileageLots = consumeMileage(myMileageLots, applied);
      let hist = [];
      try { const ud=await db.collection('users').doc(currentUser.uid).get(); hist=(ud.data()&&Array.isArray(ud.data().mileageHistory))?ud.data().mileageHistory.slice():[]; } catch(_){}
      hist.push({t:'use', a:-applied, at:Date.now(), memo:certName});
      try { await db.collection('users').doc(currentUser.uid).update({ mileageLots: myMileageLots, mileageHistory: hist }); } catch(_){}
    }

    await db.collection('payments').add({
      uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName,
      depositorName: depositorName || (applied>0?'(포인트 결제)':''),
      certType: cert, certName,
      planDays: selectedPlanDays,
      price: price,
      mileageUsed: applied,
      depositAmount: payable,
      status: 'auto_approved', autoApproved: true,
      paidByMileageOnly: payable<=0,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const upd = {
      ['entitlements.'+cert+'.plan']: 'ACTIVE',
      ['entitlements.'+cert+'.expireAt']: firebase.firestore.Timestamp.fromDate(expireAt),
      ['entitlements.'+cert+'.planDays']: selectedPlanDays
    };
    if (cert === 'bodybuilding') { upd.plan = 'ACTIVE'; upd.expireAt = firebase.firestore.Timestamp.fromDate(expireAt); upd.planDays = selectedPlanDays; }
    await db.collection('users').doc(currentUser.uid).update(upd);
    userEnt[cert].plan = 'ACTIVE'; userEnt[cert].expireAt = expireAt; userEnt[cert].planDays = selectedPlanDays;
    try { clTrack('Purchase', { value: price, currency:'KRW', content_name: certName, content_category: cert, content_type:'product', contents:[{id:cert, quantity:1}], num_items:1 }); } catch(_){}

    // 추천 결제 보너스: 추천받아 가입했다면, 이번 실입금액의 50%를 추천인에게 적립(결제할 때마다)
    try {
      var _refReward = Math.floor((payable||0) * 0.5);
      await db.collection('referrals').doc(currentUser.uid).update({ paid:true });
      if (_refReward > 0) {
        var _myRefDoc = await db.collection('referrals').doc(currentUser.uid).get();
        var _refrCode = _myRefDoc.exists ? (_myRefDoc.data().referrerCode||null) : null;
        if (_refrCode) {
          var _refrSnap = await db.collection('users').where('referralCode','==',_refrCode).limit(1).get();
          if (!_refrSnap.empty) {
            var _refrRef = _refrSnap.docs[0].ref, _refrData = _refrSnap.docs[0].data();
            var _rlots = Array.isArray(_refrData.mileageLots) ? _refrData.mileageLots.slice() : [];
            var _rhist = Array.isArray(_refrData.mileageHistory) ? _refrData.mileageHistory.slice() : [];
            var _rnow = Date.now();
            _rlots.push({a:_refReward, t:'ref_paid', at:_rnow, exp:_rnow+365*MILE_DAY});
            _rhist.push({t:'ref_paid', a:_refReward, at:_rnow, who:(currentUser.email||null)});
            await _refrRef.update({ mileageLots:_rlots, mileageHistory:_rhist.slice(-300) });
          }
        }
      }
    } catch(_){}

    syncPlanMirror(); updateAuthBar(); hidePlanPopup();
    showPaySuccess({ certName: certName, planLabel: planLabelOf(selectedPlanDays), expireAt: expireAt, payable: payable, depositorName: depositorName });
    refresh();
  } catch(e) {
    alert('오류가 발생했습니다: ' + e.message);
  }
}

// ===== AI 심층첨삭(주관식 별도 애드온) =====
// onCall 호출: 서버가 로그인·이용권·일일한도 확인 후 Claude(Sonnet) 채점 → {score,perNode,feedback,pt}
async function callGradeSubjective(payload){
  if(!fbFunctions){ var e=new Error('AI 채점 서버에 연결할 수 없어요.'); e.code='unavailable'; throw e; }
  var fn = fbFunctions.httpsCallable('gradeSubjective');
  var res = await fn(payload||{});
  return res.data;   // { score, perNode:[{h,level,comment}], feedback, pt }
}
// 첨삭·해설은 지갑이 분리 → 각 1건당 각자 지갑에서 1회 차감
function _aiCost(){ return 1; }
// ===== AI 개념설명(객관식 해설 심화 · 같은 크레딧 지갑) =====
async function callExplainConcept(payload){
  if(!fbFunctions){ var e=new Error('AI 서버에 연결할 수 없어요.'); e.code='unavailable'; throw e; }
  var fn = fbFunctions.httpsCallable('explainConcept');
  var res = await fn(payload||{});
  return res.data;   // { text, creditsLeft }
}
window._aiExpReg = {};   // qid → { subject, question, whole, cards:[{t,text}] }
function aiExpRegister(qid, data){ if(qid) window._aiExpReg[String(qid)]=data; }
function _aiEsc(s){ return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }
function _aiMd(md){ var t=_aiEsc(md);
  t=t.replace(/^\s*#{1,6}\s*(.+)$/gm,'<b>$1</b>');
  t=t.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
  t=t.replace(/^\s*[-*]\s+(.+)$/gm,'• $1');
  t=t.replace(/\n{2,}/g,'<br><br>').replace(/\n/g,'<br>');
  return t; }
async function _aiRunExplain(payload, boxId, btn){
  if(!currentUser){ if(typeof showLoginPopup==='function') showLoginPopup(); return; }
  if(explainBal() < 1){ openAiBuy('explain'); return; }
  var box=document.getElementById(boxId);
  if(box){ box.style.display='block'; box.innerHTML='<div class="ai-exp-load">🤖 AI가 자세히 설명 중…</div>'; }
  if(btn) btn.disabled=true;
  try{
    var out=await callExplainConcept(payload);
    if(out&&typeof out.creditsLeft==='number') _setWallet('explain', out.creditsLeft);
    if(box) box.innerHTML='<div class="ai-exp-hd">🤖 AI 설명 <span class="ai-exp-left">해설 남은 '+explainBal().toLocaleString()+'회</span></div><div class="ai-exp-body">'+_aiMd(out&&out.text||'')+'</div>';
  }catch(err){ var e=String((err&&err.code)||'')+' '+String((err&&err.message)||'');
    if(/permission-denied|충전/.test(e)){ if(box) box.style.display='none'; openAiBuy('explain'); }
    else if(/unauthenticated|로그인/.test(e)){ if(box) box.style.display='none'; if(typeof showLoginPopup==='function') showLoginPopup(); }
    else if(box) box.innerHTML='<div class="ai-exp-load">설명을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>';
  } finally{ if(btn) btn.disabled=false; }
}
// 맨 아래 자유질문 위젯(객관식·주관식 공용 형식)
function _aiAskWidget(qid){
  if(typeof AI_OFF!=='undefined' && AI_OFF) return '';   // AI 결제 막힌 동안 객관식 '더 물어보기'도 숨김
  return '<div class="ai-ask-wrap">'
    +'<div class="ai-ask-hd">🤖 AI에게 더 물어보기</div>'
    +'<div class="ai-ask-guide">더 알고 싶은 게 있으면 여기 적으세요. 위 <b>📋복사</b>를 누르면 그 항목이 여기로 들어와요. 문제 전체가 궁금하면 아래 <b>＋문제전체</b>를 누르거나 직접 <b>문제전체</b>라고 적으면 돼요.</div>'
    +'<div class="ai-chip-row"><button type="button" class="ai-chip" onclick="aiAskInsertWhole(\''+qid+'\')">＋ 문제전체</button></div>'
    +'<textarea class="ai-ask" id="aiask_'+qid+'" placeholder="예: 이 부분이 왜 그런지 더 자세히 설명해줘"></textarea>'
    +'<button class="ai-exp-btn ai-exp-whole" id="aiaskbtn_'+qid+'" onclick="aiAskSubmit(\''+qid+'\')">🤖 AI에게 질문 <span class="ai-exp-cost">'+_aiCost('explain')+'회</span></button>'
    +'<div class="ai-exp-box" id="aiexp_'+qid+'_ask" style="display:none"></div>'
    +'</div>';
}
function aiAskInsert(qid, i){ var r=window._aiExpReg[String(qid)]; if(!r) return; var c=(r.cards||[])[i]; if(!c) return;
  var ta=document.getElementById('aiask_'+qid); if(!ta) return;
  ta.value=(ta.value?ta.value.replace(/\s+$/,'')+'\n':'')+c.text+'\n'; ta.focus();
  try{ ta.scrollIntoView({block:'center',behavior:'smooth'}); }catch(_){}
}
function aiAskInsertWhole(qid){ var ta=document.getElementById('aiask_'+qid); if(!ta) return;
  if(!/문제전체/.test(ta.value)) ta.value=(ta.value?ta.value.replace(/\s+$/,'')+'\n':'')+'문제전체'; ta.focus();
}
function aiAskSubmit(qid){ var r=window._aiExpReg[String(qid)]||{}; var ta=document.getElementById('aiask_'+qid); var t=(ta&&ta.value||'').trim();
  if(!t){ alert('물어볼 내용을 적어주세요. (위 📋복사로 항목을 넣거나 직접 입력)'); return; }
  var whole=/문제전체/.test(t);
  _aiRunExplain({ subject:r.subject, question:r.question, ask:t, context:(r.whole||''), mode:(whole?'all':'ask') }, 'aiexp_'+qid+'_ask', document.getElementById('aiaskbtn_'+qid));
}

// AI 충전 팩(첨삭·해설 분리) — config/pricing.aiCredits = { grade:[{n,p}...], explain:[{n,p}...] }
var AICREDIT_DEFAULT={ grade:[{n:10,p:29000},{n:30,p:79000},{n:50,p:120000},{n:100,p:220000}], explain:[{n:50,p:900},{n:100,p:1700},{n:300,p:4900},{n:500,p:7900}] };
function _aiPacks(kind){ var c=(_pricingCfg&&_pricingCfg.aiCredits&&_pricingCfg.aiCredits[kind]); var a=Array.isArray(c)?c:AICREDIT_DEFAULT[kind]; a=a.filter(function(x){return x&&+x.n>0;}); return a.length?a:AICREDIT_DEFAULT[kind]; }
var _aiBuyKind='grade', _aiBuyIdx=0;
function openAiBuy(kind){
  if(!currentUser){ if(typeof showLoginPopup==='function') showLoginPopup(); return; }
  _aiBuyKind=(kind==='explain'?'explain':'grade'); _aiBuyIdx=0;
  var isG=_aiBuyKind==='grade', packs=_aiPacks(_aiBuyKind);
  var ti=document.getElementById('aiBuyTitle'); if(ti) ti.textContent=isG?'✍️ AI 첨삭 충전':'💡 AI 개념설명 충전';
  var sub=document.getElementById('aiBuySub'); if(sub) sub.innerHTML=(isG?'주관식 답안을 채점위원 수준으로 첨삭받는 이용권이에요.':'객관식 해설을 AI가 더 자세히 설명해주는 이용권이에요.')+'<br><span style="display:inline-block;margin-top:5px;background:#F5F3FF;color:#6D28D9;font-weight:700;font-size:11.5px;padding:2px 9px;border-radius:8px">⚠️ 회원권과 별개 · 첨삭/해설 충전은 서로 따로예요</span>';
  var bal=document.getElementById('aiBuyBal'); if(bal) bal.innerHTML='현재 '+(isG?'첨삭':'해설')+' 잔액: <b>'+(isG?gradeBal():explainBal()).toLocaleString()+'회</b>';
  var wrap=document.getElementById('aiBuyPacks'); if(wrap){ wrap.innerHTML=packs.map(function(p,i){ var n=+p.n, pr=+p.p||0, per=n?Math.round(pr/n):0;
    return '<label style="display:flex;align-items:center;gap:10px;border:1.5px solid '+(i===_aiBuyIdx?'#6D28D9':'#E8E8E8')+';background:'+(i===_aiBuyIdx?'#FAF7FF':'#fff')+';border-radius:11px;padding:11px 13px;cursor:pointer" onclick="_aiPickPack('+i+')">'
      +'<input type="radio" name="aiPack" '+(i===_aiBuyIdx?'checked':'')+' style="accent-color:#6D28D9">'
      +'<span style="flex:1;text-align:left"><b style="font-size:14px">'+n+'회</b> <span style="font-size:11px;color:#9A8AB8">회당 '+per.toLocaleString()+'원</span></span>'
      +'<b style="font-size:14px;color:#6D28D9">'+pr.toLocaleString()+'원</b></label>';
  }).join(''); }
  var nm=document.getElementById('aiBuyName'); if(nm) nm.value=(currentUser&&currentUser.displayName)||'';
  var ov=document.getElementById('aiBuyOv'); if(ov) ov.classList.remove('hidden');
}
function _aiPickPack(i){ _aiBuyIdx=i; openAiBuy(_aiBuyKind); }
function closeAiGradeBuy(){ var ov=document.getElementById('aiBuyOv'); if(ov) ov.classList.add('hidden'); }
async function submitAiBuy(){
  if(!currentUser){ closeAiGradeBuy(); return; }
  var packs=_aiPacks(_aiBuyKind); var pk=packs[_aiBuyIdx]||packs[0]||{n:0,p:0};
  var packN=+pk.n||0, price=+pk.p||0, kind=_aiBuyKind;
  var depositorName=(document.getElementById('aiBuyName').value||'').trim();
  if(!depositorName){ alert('입금자 이름을 입력해 주세요.'); return; }
  var btn=document.getElementById('aiBuyBtn'); if(btn){ btn.disabled=true; btn.textContent='처리 중…'; }
  try{
    if(!fbFunctions) throw new Error('서버에 연결할 수 없어요.');
    var res=await fbFunctions.httpsCallable('buyAiCredits')({ kind:kind, packIndex:_aiBuyIdx, depositorName:depositorName });
    var out=res.data||{};
    var gotN=out.granted||packN, gotP=(out.price!=null?out.price:price);
    var lb=(kind==='grade'?'AI 첨삭':'AI 개념설명')+' '+gotN+'회 충전 신청';
    try{ clTrack('InitiateCheckout', { value:gotP, currency:'KRW', content_name:lb, content_category:'aigrade_'+kind, content_type:'product', contents:[{id:'aigrade_'+kind+'_'+gotN, quantity:1}], num_items:1 }); }catch(_){}
    closeAiGradeBuy();
    // 즉시 지급이 아니라 1시간 뒤 일괄 승인 → 잔액은 승인 후 반영
    showPaySuccess({ certName: lb, planLabel:'입금 확인 후 약 10분 뒤 승인 → 잔액 반영', expireAt: null, payable: gotP, depositorName: depositorName, sub:'충전 신청이 접수됐어요. 입금 확인 후 약 10분 뒤 승인되며, 승인되면 잔액에 자동 반영됩니다.' });
  }catch(e){ var m=(e&&e.message)||String(e); alert('충전 실패: '+m); }
  finally{ if(btn){ btn.disabled=false; btn.textContent='충전 신청'; } }
}
// 주관식 시험 마운트(재사용 — 진입 시·구매 후 리마운트)
// ===== 주관식 무료 한도 게이트 (A안) — 비로그인 1 / 로그인무료 3 / 유료 무제한 · 문제단위 · 재열람 무료 =====
function _subjDayKey(cert){
  var d=new Date(Date.now()+9*3600*1000).toISOString().slice(0,10);   // KST
  var who=(typeof auth!=='undefined'&&auth&&auth.currentUser)?('u_'+auth.currentUser.uid):'guest';
  return 'subjOpen:'+who+':'+cert+':'+d;
}
function _subjOpenedSet(cert){
  try{ return new Set(JSON.parse(localStorage.getItem(_subjDayKey(cert))||'[]')); }catch(e){ return new Set(); }
}
function _subjMarkOpened(cert,qid){
  if(!qid) return;
  try{ var s=_subjOpenedSet(cert); s.add(qid); localStorage.setItem(_subjDayKey(cert), JSON.stringify([].slice.call(s))); }catch(e){}
}
function _subjGuestLimit(){ return (typeof _pricingCfg!=='undefined'&&_pricingCfg&&+_pricingCfg.subjGuestDaily)||1; }
function _subjFreeLimit(){ return (typeof _pricingCfg!=='undefined'&&_pricingCfg&&+_pricingCfg.subjUserDaily)||2; }
function canAccessSubjective(cert, qid){
  cert = cert || (typeof activeCertId==='function'?activeCertId():cert);
  var e=(userEnt&&userEnt[cert])||{plan:'GUEST'};
  var plan=e.plan;
  if(plan==='ACTIVE') return true;                     // 유료 = 무제한
  var opened=_subjOpenedSet(cert);
  if(qid && opened.has(qid)) return true;              // 재열람 무료
  if(plan==='GUEST'){
    if(opened.size >= _subjGuestLimit()){ showLoginPopup('guest_limit'); return false; }
    return true;
  }
  if(plan==='EXPIRED'){ showPlanPopup(); return false; }
  if(opened.size >= _subjFreeLimit()){ showPlanPopup(); return false; }
  return true;
}
function mountSubjExam(id){
  if(!window.CLSubj || !SUBJ_EXAMS[id]) return;
  CLSubj.mount(document.getElementById('subjMount'), SUBJ_EXAMS[id], {
    mountId:'subjMount',
    canOpen:function(qid){ var ok=canAccessSubjective(id, qid); if(ok) _subjMarkOpened(id, qid); return ok; },
    aiSell:(!AI_OFF && SUBJ_EXAMS[id].aiSell!==false),
    aiCost:1, explainCost:1,
    creditBalance:function(){ return gradeBal(); },
    explainBalance:function(){ return explainBal(); },
    hasEntitlement:function(){ return gradeBal() >= 1; },
    gradeAi:function(payload){ return callGradeSubjective(payload).then(function(out){ if(out&&typeof out.creditsLeft==='number') _setWallet('grade', out.creditsLeft); return out; }); },
    explainAi:(AI_OFF? null : function(payload){ return callExplainConcept(payload).then(function(out){ if(out&&typeof out.creditsLeft==='number') _setWallet('explain', out.creditsLeft); return out; }); }),
    buyAi:function(){ openAiBuy('grade'); },
    buyExplain:function(){ openAiBuy('explain'); },
    needLogin:function(){ if(typeof showLoginPopup==='function') showLoginPopup(); },
    onGraded:function(rec){ saveGradeLog(id, rec); },
    onRate:function(qid,n,r){ try{ if(typeof srRateK==='function') srRateK(id, qid, r, false, false); }catch(_){} }
  });
  renderSubjHeader(id);
}
// 주관식 화면 상단: 크레딧 잔액 + 첨삭 기록 버튼
var _subjHeaderCert=null;
function renderSubjHeader(cert){ _subjHeaderCert=cert; var el=document.getElementById('subjHeader'); if(!el) return;
  el.innerHTML='<div class="subj-hdrbar">'
    +((typeof AI_OFF!=='undefined'&&AI_OFF)?'':'<span class="subj-bal">🤖 첨삭 <b id="subjBalG">'+gradeBal().toLocaleString()+'</b>회 · 해설 <b id="subjBalE">'+explainBal().toLocaleString()+'</b>회</span>')
    +'<span style="flex:1"></span>'
    +'<button class="subj-hbtn" onclick="openAiBuy(\'grade\')">＋첨삭</button>'
    +'<button class="subj-hbtn" onclick="openAiBuy(\'explain\')">＋해설</button>'
    +'<button class="subj-hbtn primary" onclick="openGradeLogs(\''+cert+'\')">📋 기록</button>'
    +'</div>'; }
function _refreshAiCreditUI(){ var g=document.getElementById('subjBalG'); if(g) g.textContent=gradeBal().toLocaleString(); var e=document.getElementById('subjBalE'); if(e) e.textContent=explainBal().toLocaleString(); }
async function saveGradeLog(cert, rec){ if(!currentUser||!db||!rec) return;
  try{ await db.collection('users').doc(currentUser.uid).collection('gradeLogs').add({
    cert:cert, qid:rec.qid||'', question:rec.question||'', answer:rec.answer||'',
    score:(rec.score!=null?rec.score:null), pt:(rec.pt!=null?rec.pt:null),
    perNode:Array.isArray(rec.perNode)?rec.perNode:[], feedback:rec.feedback||'',
    createdAt: firebase.firestore.FieldValue.serverTimestamp() }); }catch(e){ console.warn('gradeLog save', e); }
}
async function openGradeLogs(cert){ if(!currentUser){ if(typeof showLoginPopup==='function') showLoginPopup(); return; }
  var ov=document.getElementById('gradeLogOv'), body=document.getElementById('gradeLogBody'); if(!ov||!body) return;
  ov.classList.remove('hidden'); body.innerHTML='<div style="text-align:center;color:#8A7D6E;padding:20px">불러오는 중…</div>';
  try{
    var snap=await db.collection('users').doc(currentUser.uid).collection('gradeLogs').where('cert','==',cert).get();
    var logs=snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
    logs.sort(function(a,b){ var ta=a.createdAt&&a.createdAt.seconds||0, tb=b.createdAt&&b.createdAt.seconds||0; return tb-ta; });
    if(!logs.length){ body.innerHTML='<div style="text-align:center;color:#8A7D6E;padding:24px">아직 채점 기록이 없어요.<br>답안을 쓰고 AI 심층채점을 받아보세요.</div>'; return; }
    window._gradeLogsCache=logs;
    body.innerHTML=logs.map(function(l,i){ var pct=(l.pt?Math.round((l.score/l.pt)*100):0); var col=pct>=70?'#0F6E56':pct>=40?'#B7791F':'#C0322F';
      var dt=l.createdAt&&l.createdAt.seconds?new Date(l.createdAt.seconds*1000).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
      return '<div class="glog-item" onclick="openGradeLogDetail('+i+')">'
        +'<div class="glog-score" style="color:'+col+'">'+(l.score!=null?l.score:'-')+'<span>/'+(l.pt||'-')+'</span></div>'
        +'<div class="glog-mid"><div class="glog-q">'+cmEsc((l.question||'').slice(0,60))+'…</div><div class="glog-dt">'+dt+'</div></div>'
        +'<span class="glog-arr">›</span></div>'; }).join('');
  }catch(e){ body.innerHTML='<div style="text-align:center;color:#C0322F;padding:20px">불러오기 실패: '+cmEsc(e.message||String(e))+'</div>'; }
}
function openGradeLogDetail(i){ var l=(window._gradeLogsCache||[])[i]; if(!l) return; var body=document.getElementById('gradeLogBody'); if(!body) return;
  var pct=(l.pt?Math.round((l.score/l.pt)*100):0), col=pct>=70?'#0F6E56':pct>=40?'#B7791F':'#C0322F';
  var nodes=(l.perNode||[]).map(function(p){ var lv=p.level||0; var mk=lv>=2?'✓':lv===1?'△':'✕'; var cls=lv>=2?'hit':lv===1?'amb':'miss';
    return '<div class="subj-chk '+cls+'"><span class="mk">'+mk+'</span><span>'+cmEsc(p.h||'')+'</span></div>'+(p.comment?'<div class="subj-why">'+cmEsc(p.comment)+'</div>':''); }).join('');
  body.innerHTML='<button class="subj-hbtn" style="margin-bottom:10px" onclick="openGradeLogs(\''+cmEsc(l.cert||_subjHeaderCert||'')+'\')">‹ 목록</button>'
    +'<div class="subj-scorebox"><div class="ring" style="background:#F6F6F4;color:'+col+'">'+(l.score!=null?l.score:'-')+'</div><div class="stx"><b>'+(l.score!=null?l.score:'-')+' / '+(l.pt||'-')+'점</b><br>'+cmEsc((l.question||'')).slice(0,80)+'</div></div>'
    +(l.feedback?'<div class="subj-sect">채점 총평</div><div class="subj-feed">'+cmEsc(l.feedback)+'</div>':'')
    +(l.answer?'<div class="subj-sect">내가 쓴 답안</div><div class="subj-feed" style="background:#F8FAFC;border-color:#E3EDF7;color:#334155">'+cmEsc(l.answer)+'</div>':'')
    +(nodes?'<div class="subj-sect">논점별 채점 근거</div>'+nodes:'');
}
function closeGradeLogs(){ var ov=document.getElementById('gradeLogOv'); if(ov) ov.classList.add('hidden'); }

// ===== 결제 완료 + 입금 안내 모달 =====
function showPaySuccess(info){
  var ov=document.getElementById('paySuccessOv'); if(!ov) return;
  var pointOnly = !(info.payable>0);
  document.getElementById('psuccSub').textContent = info.sub || (pointOnly ? '포인트로 결제 완료! 즉시 활성화되었습니다.' : '이용권이 즉시 활성화되었습니다.');
  document.getElementById('psuccPlan').innerHTML = '<b>['+cmEsc(info.certName)+'] '+cmEsc(info.planLabel)+'</b>'+(info.expireAt?('<br>만료일: '+info.expireAt.toLocaleDateString('ko-KR')):'');
  var wrap=document.getElementById('psuccDepositWrap');
  if(pointOnly){ wrap.style.display='none'; }
  else {
    wrap.style.display='';
    document.getElementById('psuccAmt').innerHTML = '입금액: <b>'+(info.payable||0).toLocaleString()+'원</b>';
    document.getElementById('psuccName').innerHTML = info.depositorName ? ('입금자명: <b>'+cmEsc(info.depositorName)+'</b>') : '';
  }
  ov.classList.remove('hidden');
}
function closePaySuccess(){ var ov=document.getElementById('paySuccessOv'); if(ov) ov.classList.add('hidden'); }
// 포인트 적립/차감 안내 모달
function showPtModal(kind, points, certLabel){
  var ov=document.getElementById('ptModalOv'); if(!ov) return;
  var ic=document.getElementById('ptModalIc'), ti=document.getElementById('ptModalTi'), sub=document.getElementById('ptModalSub');
  if(kind==='referral'){
    ic.textContent='🎁'; ti.textContent='추천 보상 '+points.toLocaleString()+'포인트!';
    sub.textContent='내 추천으로 친구가 가입·결제했어요. 이용권에 사용할 수 있어요. (유효기간 1년)';
  } else if(kind==='earn'){
    ic.textContent='💰'; ti.textContent=points.toLocaleString()+'포인트 적립되었어요';
    if(certLabel && points>1000){
      sub.textContent='합격 후기 보상! '+certLabel+' 결제금액 '+points.toLocaleString()+'원 전액 환급이에요. (유효기간 1년)';
    } else {
      sub.textContent='이용권 결제에 사용할 수 있어요. (1P = 1원 · 유효기간 1년)';
    }
  } else {
    ic.textContent='↩️'; ti.textContent=points.toLocaleString()+'포인트가 차감되었어요';
    sub.textContent='글을 삭제해서 적립됐던 포인트가 회수됐어요.';
  }
  ov.classList.remove('hidden');
}
function closePtModal(){ var ov=document.getElementById('ptModalOv'); if(ov) ov.classList.add('hidden'); }
var POINT_GUIDE_POST='7fui5XC7CRKXLZqmlx9X';   // 💰 포인트 안내 공지글 (수정 기능으로 ID 유지)
function ptGoGuide(){
  closePtModal();
  if(POINT_GUIDE_POST){
    location.hash='#post/'+POINT_GUIDE_POST;
    if(typeof clRouteFromHash==='function') clRouteFromHash();
    else if(typeof openCommunity==='function'){ openCommunity(); setTimeout(function(){ if(typeof cmOpenDetail==='function') cmOpenDetail(POINT_GUIDE_POST); }, 220); }
  }
}
function copyDepositAcc(){
  var txt='1000-2406-0293';
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(function(){alert('계좌번호가 복사되었어요!');}).catch(function(){alert('계좌번호: '+txt);}); }
  else { alert('계좌번호: '+txt); }
}

// ===== FREE_TRIAL 카운트 저장 =====
async function saveTrialCount(cert) {
  if (!currentUser) return;
  cert = cert || activeCertId();
  try {
    const upd = { ['entitlements.'+cert+'.trialCount']: userEnt[cert].trialCount };
    if (cert === 'bodybuilding') upd.trialCount = userEnt.bodybuilding.trialCount; // 레거시 미러
    await db.collection('users').doc(currentUser.uid).update(upd);
  } catch(e) { console.error('trialCount 저장 오류:', e); }
}

// ===== 할인코드 =====
async function applyDiscount() {
  if (!currentUser) { showLoginPopup(); return; }
  const code = document.getElementById('discountInput').value.trim().toUpperCase();
  const msgEl = document.getElementById('discountMsg');
  if (!code) return;
  msgEl.style.display = 'none';
  try {
    const ref = db.collection('discountCodes').doc(code);
    const doc = await ref.get();
    if (!doc.exists || doc.data().used) {
      msgEl.className = 'discount-msg error';
      msgEl.textContent = '유효하지 않거나 이미 사용된 코드입니다.';
      msgEl.style.display = 'block';
      return;
    }
    const data = doc.data();
    const cert = activeCertId();
    // 코드에 certType이 지정돼 있으면 해당 시험에서만 사용 가능 (없으면 현재 시험에 적용)
    if (data.certType && data.certType !== cert) {
      const need = data.certType === 'appraiser' ? '감정평가사' : '스포츠지도사 실기·구술';
      msgEl.className = 'discount-msg error';
      msgEl.textContent = `이 코드는 ${need} 전용입니다. 해당 시험에서 사용해주세요.`;
      msgEl.style.display = 'block';
      return;
    }
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + (data.days || 7));
    // 코드 사용 처리
    await ref.update({
      used: true,
      usedBy: currentUser.uid,
      usedByEmail: currentUser.email,
      usedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    // 유저 플랜 활성화 (현재 보고 있는 시험에 적용)
    const upd = {
      ['entitlements.'+cert+'.plan']: 'ACTIVE',
      ['entitlements.'+cert+'.expireAt']: firebase.firestore.Timestamp.fromDate(expireAt),
      ['entitlements.'+cert+'.planDays']: data.days || 7
    };
    if (cert === 'bodybuilding') { // 레거시 미러
      upd.plan = 'ACTIVE';
      upd.expireAt = firebase.firestore.Timestamp.fromDate(expireAt);
      upd.planDays = data.days || 7;
    }
    await db.collection('users').doc(currentUser.uid).update(upd);
    userEnt[cert].plan = 'ACTIVE'; userEnt[cert].expireAt = expireAt; userEnt[cert].planDays = data.days || 7;
    // 결제 기록 남기기(회원권 관리·마이페이지 결제내역 표시용) — 쿠폰은 0원
    try {
      await db.collection('payments').add({
        uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName,
        depositorName: '(할인코드)',
        certType: cert, certName: certFull(cert),
        planDays: data.days || 7,
        price: 0,
        mileageUsed: 0,
        depositAmount: 0,
        discountCode: code,
        paidByCoupon: true,
        status: 'auto_approved', autoApproved: true,
        paidByMileageOnly: false,
        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(_) {}
    syncPlanMirror();
    updateAuthBar();
    hidePlanPopup();
    msgEl.style.display = 'none';
    alert('이용권이 적용되었습니다! 만료일: ' + expireAt.toLocaleDateString('ko-KR'));
    refresh();
  } catch(e) {
    msgEl.className = 'discount-msg error';
    msgEl.textContent = '오류가 발생했습니다. 다시 시도해주세요.';
    msgEl.style.display = 'block';
  }
}

