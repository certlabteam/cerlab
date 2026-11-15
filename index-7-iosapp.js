/* [2026-11-06] 서트랩 아이폰 앱(플러터 WKWebView · UA 끝 「CertlabiOS/1」) 연결 — 27번 아이폰방 연결규칙(Documents\iphone\서트랩앱_연결규칙.md).
 * 크리스 승인 11-06(시안 「ㄱ」) · 요금 「지금 이용권 그대로」 · 「무료 이용자에게만 광고」(결과·목록 화면만).
 * 앱 안이 아니면 아무것도 바꾸지 않는다. 앱이 직접 하는 것: 로그인 · 알림 · App Store 결제 · 광고. */
var CL_IOS_APP = /CertlabiOS\//.test(navigator.userAgent || '');

/* 웹 → 앱: window.CertlabApp.postMessage(JSON) — 없으면 앱이 아니다 */
function clAppCall(o){
  try{ if(window.CertlabApp && window.CertlabApp.postMessage){ window.CertlabApp.postMessage(JSON.stringify(o)); return true; } }
  catch(e){ console.warn('앱 부르기 실패', e); }
  return false;
}

(function(){
  if(!CL_IOS_APP) return;
  try{ document.documentElement.classList.add('ios-app'); }catch(_){}

  /* 로그인 창: [11-15 크리스 「그냥 로그인 방법 다 보여주면 되잖아」] 앱 로그인 화면 하나에 카카오·Apple·구글·이메일을 다 보인다.
   * 웹 창은 열지 않는다. 앱에서 「이메일로 로그인」을 누르면 certlabAppEmailLogin 이 이메일 칸만 있는 웹 창을 연다.
   * 옛 앱(이 연결이 없는 판)이면 clAppCall 이 false 라 웹 창을 그대로 연다. */
  var _login = window.showLoginPopup;
  if(typeof _login === 'function'){
    window.showLoginPopup = function(){ if(clAppCall({ 할일:'로그인필요' })) return; return _login.apply(this, arguments); };
    window.certlabAppEmailLogin = function(){
      _login.call(window);
      try{
        var p = document.getElementById('loginPopup'); if(p) p.classList.add('email-only');
        var box = document.getElementById('emailAuthBox'); if(box) box.classList.remove('hidden');
        var id = document.getElementById('emailAuthId'); if(id) id.focus();
      }catch(_){}
    };
    try{
      var st = document.createElement('style');
      st.textContent = '#loginPopup.email-only .login-row,#loginPopup.email-only #emailAuthToggle{display:none}';
      document.head.appendChild(st);
    }catch(_){}
  }

  /* 이용권: 앱 안에서는 웹 결제(토스·포인트)를 보이지 않고 앱의 App Store 이용권 화면을 연다(애플 규칙) */
  var _plan = window.showPlanPopup;
  if(typeof _plan === 'function'){
    window.showPlanPopup = function(){
      try{
        if(typeof currentUser !== 'undefined' && !currentUser){ window.showLoginPopup(); return; }
        var cert = (typeof activeCertId === 'function') ? activeCertId() : '';
        var 등급 = (typeof _certTier === 'function') ? _certTier(cert) : 'standard';
        var 이름 = (typeof certFull === 'function') ? certFull(cert) : cert;
        try{ localStorage.setItem('cl_ios_pay_exam', cert); }catch(_){}   // 앱을 다시 열어 이어 켤 때 어느 시험인지(R5)
        if(clAppCall({ 할일:'결제열기', 시험:cert, 등급:등급, 시험이름:이름 })) return;
      }catch(e){ console.warn('앱 결제 열기 실패', e); }
      return _plan.apply(this, arguments);
    };
  }

  /* 로그아웃하면 앱 쪽 기억도 지운다 */
  var _out = window.signOut;
  if(typeof _out === 'function'){
    window.signOut = async function(){
      await _out.apply(this, arguments);
      try{ if(typeof auth !== 'undefined' && auth && !auth.currentUser) clAppCall({ 할일:'로그아웃' }); }catch(_){}
    };
  }

  /* 광고: 무료 이용자(이용권 없음)이고, 문제 푸는 화면·모의고사·레벨테스트가 아닐 때만 보인다. 바뀔 때만 앱에 알린다 */
  var _광고 = null;
  function 광고알리기(){
    try{
      var cert = (typeof activeCertId === 'function') ? activeCertId() : '';
      var e = (typeof userEnt !== 'undefined' && userEnt && userEnt[cert]) || {};
      var 유료 = e.plan === 'ACTIVE';
      var 화면 = (typeof mqScreen !== 'undefined') ? mqScreen : '';
      var 푸는중 = ['exam', 'subjexam', 'lt2', 'lu2'].indexOf(화면) >= 0;
      var 보임 = !유료 && !푸는중;
      if(보임 !== _광고){ _광고 = 보임; clAppCall({ 할일:'광고', 보임:보임 }); }
    }catch(_){}
  }
  var _render = window.renderMCQ;
  if(typeof _render === 'function'){
    window.renderMCQ = function(){ var r = _render.apply(this, arguments); 광고알리기(); return r; };
  }
  window.clAppAdSync = 광고알리기;

  /* [11-15 크리스 「다매루틴도 수업 끝나면 큰 광고 하나 띄우잖아 · 한 회차 다 풀거나 테스트 끝나거나」]
   * 무료 이용자가 기출 한 회차를 끝까지 풀었을 때 · 레벨테스트를 끝냈을 때만 앱에 전면 광고를 부탁한다.
   * 레벨업(5문제)·복습·OX·푸는 도중엔 안 부른다. 3분에 한 번 제한은 앱이 한다. 광고는 결과 화면 위에 떴다가 닫히면 결과가 그대로 보인다. */
  var _결과 = window.mqResult;
  if(typeof _결과 === 'function'){
    window.mqResult = function(){
      var r = _결과.apply(this, arguments);
      try{
        var M = (typeof mqResultMeta !== 'undefined') ? mqResultMeta : null;
        if(M){
          var 회차끝 = !M.lu && !M.review && !M.diag && M.mode === 'all';
          var e = (typeof userEnt !== 'undefined' && userEnt && userEnt[M.cert]) || {};
          if((M.levelTest || 회차끝) && e.plan !== 'ACTIVE') clAppCall({ 할일:'전면광고' });
        }
      }catch(_){}
      return r;
    };
  }
  window.certlabAppAdDone = function(){};   // 앱이 광고를 닫으면 부른다 — 지금은 할 일 없음(결과는 이미 그려져 있다)
})();

/* 앱 → 웹: 앱 로그인 결과로 Firebase 로그인. {공급자:'google'|'apple'|'kakao', 토큰, nonce?, 인가코드?} */
window.certlabAppLogin = async function(a){
  a = a || {};
  var 공급자 = a['공급자'] || a.provider, 토큰 = a['토큰'] || a.token;
  try{
    if(typeof auth === 'undefined' || !auth) throw new Error('로그인 준비가 아직 안 됐어요. 잠시 뒤 다시 해 주세요.');
    if(!토큰) throw new Error('로그인 정보가 비어 있어요.');
    if(공급자 === 'google'){
      // 아이폰 앱 구글 토큰엔 nonce 가 들어 있다 — Firebase 가 원문을 요구하면 원문 nonce 를 붙여 다시(전수조사 기기 확인 11-15)
      try{ await auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(토큰)); }
      catch(eG){
        if(!(a.nonce && eG && /nonce/i.test((eG.code || '') + (eG.message || '')))) throw eG;
        await auth.signInWithCredential(new firebase.auth.OAuthProvider('google.com').credential({ idToken:토큰, rawNonce:a.nonce }));
      }
    }else if(공급자 === 'apple'){
      var p = new firebase.auth.OAuthProvider('apple.com');
      await auth.signInWithCredential(p.credential({ idToken:토큰, rawNonce:a.nonce }));
      var 코드 = a['인가코드'] || a.authorizationCode;
      if(코드){ try{ localStorage.setItem('clAppleAuthCode', 코드); }catch(_){} }   // 탈퇴 때 Apple revoke 용
    }else if(공급자 === 'kakao'){
      if(!fbFunctions) throw new Error('카카오 로그인 준비가 아직 안 됐어요.');
      var r = await fbFunctions.httpsCallable('kakaoLogin')({ accessToken:토큰 });
      var 표 = r && r.data && r.data.token;
      if(!표) throw new Error('카카오 로그인 표를 받지 못했어요.');
      await auth.signInWithCustomToken(표);
    }else{
      throw new Error('모르는 로그인 방법이에요: ' + 공급자);
    }
    try{ if(typeof hideLoginPopup === 'function') hideLoginPopup(); }catch(_){}
    return { ok:true };
  }catch(e){
    var msg = (e && e.message) || String(e);
    console.error('앱 로그인 실패', 공급자, e);
    try{ if(typeof clNotice === 'function') clNotice('로그인하지 못했어요. ' + msg); else alert('로그인하지 못했어요. ' + msg); }catch(_){}
    return { ok:false, error:msg };
  }
};

/* 앱 → 웹: FCM 토큰을 지금 웹 푸시 토큰 자리(userData.fcmTokens)에 넣는다. 로그인 전이면 로그인 뒤에 넣는다 */
var _clAppPushPend = null;
async function _clAppPushSave(){
  if(!_clAppPushPend) return;
  try{
    if(typeof currentUser === 'undefined' || !currentUser || typeof db === 'undefined' || !db) return;
    var t = _clAppPushPend;
    await db.collection('userData').doc(currentUser.uid).set({
      fcmTokens: firebase.firestore.FieldValue.arrayUnion(t),
      pushPlatform: 'ios',
      pushUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });
    _clAppPushPend = null;
  }catch(e){ console.error('앱 알림 토큰 저장 실패', e); }
}
window.certlabAppPush = function(a){
  a = a || {};
  var t = a['토큰'] || a.token;
  if(!t) return { ok:false };
  _clAppPushPend = t; _clAppPushSave();
  return { ok:true };
};
try{
  document.addEventListener('DOMContentLoaded', function(){
    try{ if(typeof auth !== 'undefined' && auth) auth.onAuthStateChanged(function(u){ if(u) _clAppPushSave(); if(window.clAppAdSync) setTimeout(window.clAppAdSync, 500); }); }catch(_){}
  });
}catch(_){}

/* 앱 → 웹: App Store 구매 뒤 서버 확인. {jws, 상품, 시험} — 서버 함수 confirmApplePurchase(certlab-pay) */
window.certlabAppPurchased = async function(a){
  a = a || {};
  try{
    if(typeof currentUser === 'undefined' || !currentUser){ window.showLoginPopup(); return { ok:false, error:'로그인 필요' }; }
    if(!fbFunctions) throw new Error('결제 확인 준비가 아직 안 됐어요.');
    var 시험 = a['시험'] || a.examId; if(!시험){ try{ 시험 = localStorage.getItem('cl_ios_pay_exam') || ''; }catch(_){} }
    var r = await fbFunctions.httpsCallable('confirmApplePurchase')({ jws:a.jws, productId:a['상품'] || a.productId, examId:시험 });
    var d = (r && r.data) || {};
    if(d.status === 'PAID' || d.status === 'ALREADY'){
      clAppCall({ 할일:'결제끝', 상품:a['상품'] || a.productId });   // 서버가 켠 뒤에만 앱이 애플 거래를 끝낸다(R5 — 실패하면 다음에 앱을 열 때 애플이 다시 넘겨줘 이어 켬)
      var 이름 = (typeof certFull === 'function') ? certFull(시험) : '';
      try{ if(typeof clNotice === 'function') await clNotice((이름 ? 이름 + ' ' : '') + '이용권을 켰어요.'); }catch(_){}
      location.reload();
    }
    return d;
  }catch(e){
    var msg = (e && e.message) || String(e);
    console.error('앱 결제 확인 실패', e);
    try{ if(typeof clNotice === 'function') clNotice('결제는 됐지만 이용권을 켜지 못했어요. 앱을 다시 열면 이어서 켭니다. (' + msg + ')'); }catch(_){}
    return { ok:false, error:msg };
  }
};
