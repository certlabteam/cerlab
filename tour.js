/* ===== 처음 쓰는 사람용 말풍선 사용안내 (2026-10-12) =====
 * 크리스 『앱 처음 들어오면 사용안내 한번 보여주자 · 버튼 어떤 기능인지 알려주는거 말풍선 형태로』
 * 계기 — 9/9 합격후기에 「틀린 문제·새로 올라온 문제를 따로 못 봐서 다 풀어야 했다」고 적혀 있었다.
 *   🆕 신규(새 문제)·🔁 복습(틀린 문제)은 6월부터 있었는데 몰라서 못 쓴 것이다.
 *
 * 화면 종류마다 기기당 한 번 — localStorage 'cltour:<종류>'. 저장이 막힌 브라우저면 그 세션에서 한 번.
 * 비출 버튼이 화면에 없으면 그 단계는 건너뛴다(로그인 전·복습할 것 없음 등).
 * 다른 팝업(환영·결제·로그인 등)이 떠 있으면 닫힐 때까지 기다린다(최대 1분).
 * 다시 보기: 콘솔에서 clTourReset() 후 새로고침.
 */
(function(){
  var 단계들 = {
    oral: [
      { sel:'#modeNew',    t:'🆕 신규 — 아직 안 본 카드만 모아요. 새로 올라온 문제도 여기서 바로 보여요.' },
      { sel:'#modeReview', t:'🔁 복습 — 틀렸거나 복습할 때가 된 카드만 모아요. 틀린 문제는 여기서 다시 봐요.' },
      { sel:'#modeMix',    t:'🔀 혼합 — 전체 카드를 다 봐요.' },
      { sel:'#subjectBar', t:'과목을 골라 그 과목만 볼 수 있어요.' },
      { sel:'#starBar',    t:'★ 는 중요도예요. ★3 만 골라 자주 나오는 것부터 볼 수 있어요.' },
      { sel:'#audioPlay',  t:'🔊 듣기 — 답을 소리로 읽어 줘요. 이동할 때 들으며 외우세요.' }
    ],
    mcq: [
      { sel:'#mcqRoot .anal-diag',   t:'🎯 레벨테스트 — 몇 문제만 풀면 지금 실력·예상점수·약점을 알려 줘요. 처음이면 여기부터!' },
      { sel:'#mcqRoot .sr-banner',  t:'오늘 할 일 — 복습할 문제가 있으면 복습부터, 없으면 이어 풀 곳이나 다음 회차를 바로 열어 줘요.' },
      { sel:'#mcqRoot .oxl-banner', t:'OX개념 — 내가 틀린 보기만 모아 개념을 다시 봐요.' },
      { sel:'#mcqRoot .scard',      t:'과목을 누르면 회차가 펼쳐져요. 회차마다 「오답」「미응답」 버튼으로 틀린 문제·안 푼 문제만 다시 풀 수 있어요.' }
    ]
  };
  var 본것 = {};
  function 열쇠(k){ return 'cltour:' + k; }
  function 봤나(k){ try{ return localStorage.getItem(열쇠(k)) === '1'; }catch(_){ return !!본것[k]; } }
  function 봤다(k){ 본것[k] = 1; try{ localStorage.setItem(열쇠(k), '1'); }catch(_){} }
  function 보이나(el){
    if(!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }
  function 팝업떠있나(){
    var 것들 = document.querySelectorAll('[id$="Popup"],[id$="Ov"],.psucc-ov,.pr-ov,.auth-sheet');
    for(var i = 0; i < 것들.length; i++){
      var e = 것들[i];
      if(e.classList.contains('hidden')) continue;
      if(getComputedStyle(e).display === 'none') continue;
      if(보이나(e)) return true;
    }
    return false;
  }

  var 판 = null;
  function 닫기(){ if(판){ 판.remove(); 판 = null; } window.removeEventListener('resize', 놓기); }
  var 지금 = null;
  function 놓기(){
    if(!판 || !지금) return;
    var el = 지금.el, r = el.getBoundingClientRect(), 빛 = 판.querySelector('.clt-hole'), 풍 = 판.querySelector('.clt-bub');
    var 틈 = 6;
    빛.style.left = (r.left - 틈) + 'px'; 빛.style.top = (r.top - 틈) + 'px';
    빛.style.width = (r.width + 틈 * 2) + 'px'; 빛.style.height = (r.height + 틈 * 2) + 'px';
    var 폭 = Math.min(300, window.innerWidth - 32);
    풍.style.width = 폭 + 'px';
    var x = Math.max(16, Math.min(r.left + r.width / 2 - 폭 / 2, window.innerWidth - 폭 - 16));
    풍.style.left = x + 'px';
    var 아래 = r.bottom + 14, 높이 = 풍.offsetHeight || 120;
    if(아래 + 높이 > window.innerHeight - 8){ 풍.style.top = Math.max(8, r.top - 14 - 높이) + 'px'; 풍.classList.add('up'); }
    else { 풍.style.top = 아래 + 'px'; 풍.classList.remove('up'); }
    var 꼭지 = 풍.querySelector('.clt-tip');
    꼭지.style.left = Math.max(14, Math.min(r.left + r.width / 2 - x - 7, 폭 - 28)) + 'px';
  }
  function 보여주기(k, 줄, i){
    if(i >= 줄.length){ 닫기(); 봤다(k); return; }
    지금 = 줄[i];
    try{ 지금.el.scrollIntoView({ block:'center' }); }catch(_){}
    if(!판){
      판 = document.createElement('div');
      판.className = 'clt-wrap';
      판.innerHTML = '<div class="clt-hole"></div><div class="clt-bub"><div class="clt-tip"></div>'
        + '<div class="clt-t"></div><div class="clt-bot"><span class="clt-n"></span>'
        + '<button class="clt-skip" type="button">건너뛰기</button><button class="clt-next" type="button">다음</button></div></div>';
      document.body.appendChild(판);
      window.addEventListener('resize', 놓기);
    }
    판.querySelector('.clt-t').textContent = 지금.t;
    판.querySelector('.clt-n').textContent = (i + 1) + ' / ' + 줄.length;
    판.querySelector('.clt-next').textContent = (i + 1 === 줄.length) ? '알겠어요' : '다음';
    판.querySelector('.clt-next').onclick = function(){ 보여주기(k, 줄, i + 1); };
    판.querySelector('.clt-skip').onclick = function(){ 닫기(); 봤다(k); };
    setTimeout(놓기, 30);
  }
  function 시작(k, 남은번){
    if(봤나(k) || 판) return;
    if(팝업떠있나()){ if(남은번 > 0) setTimeout(function(){ 시작(k, 남은번 - 1); }, 3000); return; }
    var 줄 = [];
    (단계들[k] || []).forEach(function(s){ var el = document.querySelector(s.sel); if(보이나(el)) 줄.push({ el:el, t:s.t }); });
    if(줄.length < 2){ if(남은번 > 0) setTimeout(function(){ 시작(k, 남은번 - 1); }, 3000); return; }   // 화면이 아직 덜 그려졌다
    보여주기(k, 줄, 0);
  }
  // enterCert 가 화면을 연 뒤 부른다 — 구술(bodybuilding)이면 oral, 객관식이면 mcq. 주관식(2차)은 화면이 달라 안 띄운다
  window.clTourFor = function(certId){
    try{
      var k = certId === 'bodybuilding' ? 'oral'
        : ((typeof _isSubjCert === 'function' && _isSubjCert(certId)) ? null : 'mcq');
      if(k) setTimeout(function(){ 시작(k, 20); }, 1500);
    }catch(_){}
  };
  window.clTourReset = function(){ try{ localStorage.removeItem(열쇠('oral')); localStorage.removeItem(열쇠('mcq')); }catch(_){} 본것 = {}; };
})();
