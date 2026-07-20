// ===== OX만 누르고 넘어가는 착각 방지 (매번 막고 7일 끄기) — [2026-07-20] 레벨테스트 한정 → 전체 풀이로 확장 =====
var _oxWarnBypass=false;
function _oxClickedOnly(qid){ try{ return !!(typeof mqOX!=='undefined' && mqOX && mqOX[qid] && Object.keys(mqOX[qid]).length); }catch(_){ return false; } }
function _oxWarnSnoozed(){ try{ var v=parseInt(localStorage.getItem('certlab_ox_warn_snooze')||'0',10); return v>Date.now(); }catch(_){ return false; } }
function _oxWarnShow(){
  var el=document.getElementById('oxWarnPop');
  if(!el){
    el=document.createElement('div'); el.id='oxWarnPop';
    el.innerHTML='<div class="oxw-back" onclick="_oxWarnPick()"></div>'
      +'<div class="oxw-card"><div class="oxw-ic">\uD83D\uDE42</div>'
      +'<div class="oxw-t">\uC815\uB2F5\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694</div>'
      +'<div class="oxw-s">\uBCF4\uAE30 \uC911 \uC815\uB2F5\uC744 \uACE8\uB77C\uC57C \uCC44\uC810\u00B7\uCE21\uC815\uB3FC\uC694.</div>'
      +'<div class="oxw-note"><b>OX \uCCB4\uD06C</b>\uB294 \uBCF4\uAE30 \uBB38\uC7A5\uC774 \uB9DE\uB294\uC9C0(O)\u00B7\uD2C0\uB9B0\uC9C0(X)\uB97C \uC9C1\uC811 \uD310\uB2E8\uD574, \uD2C0\uB9B0 \uC9C4\uC220\uC758 \uAC1C\uB150\uB9CC \uB530\uB85C \uBCF5\uC2B5\uD558\uB294 \uAE30\uB2A5\uC774\uC5D0\uC694. \uC815\uB2F5 \uC120\uD0DD\uACFC\uB294 \uBCC4\uAC1C\uC608\uC694.</div>'
      +'<button class="oxw-b1" onclick="_oxWarnPick()">\uC815\uB2F5 \uC120\uD0DD\uD558\uAE30</button>'
      +'<button class="oxw-b2" onclick="_oxWarnSkip()">\uBAA8\uB974\uACA0\uC5B4\uC694 \u00B7 \uADF8\uB0E5 \uB118\uAE30\uAE30</button>'
      +'<button class="oxw-b3" onclick="_oxWarnSnooze()">7\uC77C\uAC04 \uBCF4\uC9C0 \uC54A\uAE30</button></div>';
    document.body.appendChild(el);
    if(!document.getElementById('oxWarnCss')){
      var st=document.createElement('style'); st.id='oxWarnCss';
      st.textContent='#oxWarnPop{position:fixed;inset:0;z-index:100002;display:flex;align-items:center;justify-content:center;padding:24px}'
        +'#oxWarnPop .oxw-back{position:absolute;inset:0;background:rgba(20,24,31,.5)}'
        +'#oxWarnPop .oxw-card{position:relative;background:#fff;border-radius:18px;padding:24px 22px 18px;max-width:340px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.25)}'
        +'#oxWarnPop .oxw-ic{font-size:32px;margin-bottom:8px}'
        +'#oxWarnPop .oxw-t{font-size:18px;font-weight:900;color:#1F2937;margin-bottom:8px}'
        +'#oxWarnPop .oxw-s{font-size:13.5px;color:#6B7280;line-height:1.6;margin-bottom:10px}'
        +'#oxWarnPop .oxw-note{font-size:12px;color:#94A3B8;line-height:1.55;background:#F7F9FC;border-radius:10px;padding:10px 12px;margin-bottom:16px;text-align:left}'
        +'#oxWarnPop .oxw-note b{color:#475569}'
        +'#oxWarnPop .oxw-b1{width:100%;background:#0C447C;color:#fff;border:none;border-radius:12px;padding:13px;font-size:14.5px;font-weight:800;cursor:pointer;margin-bottom:8px}'
        +'#oxWarnPop .oxw-b2{width:100%;background:#F1F4F8;color:#475569;border:none;border-radius:12px;padding:12px;font-size:13.5px;font-weight:700;cursor:pointer;margin-bottom:6px}'
        +'#oxWarnPop .oxw-b3{width:100%;background:none;color:#9AA1AD;border:none;padding:6px;font-size:12px;font-weight:600;cursor:pointer}';
      document.head.appendChild(st);
    }
  }
  el.style.display='flex';
}
function _oxWarnHide(){ var el=document.getElementById('oxWarnPop'); if(el) el.style.display='none'; }
function _oxWarnPick(){ _oxWarnHide(); }
function _oxWarnSkip(){ _oxWarnHide(); _oxWarnBypass=true; _oxAdvance(); }
function _oxWarnSnooze(){ try{ localStorage.setItem('certlab_ox_warn_snooze', String(Date.now()+7*86400000)); }catch(_){} _oxWarnHide(); _oxWarnBypass=true; _oxAdvance(); }
function _oxAdvance(){ try{ var qs=mqQuestions(); if(qs && qs.length && mqIdx<qs.length-1){ mqIdx++; if(typeof mqSaveProgress==='function') mqSaveProgress(); if(typeof mqDiag!=='undefined'&&mqDiag&&typeof saveDiagProgress==='function') saveDiagProgress(); window.scrollTo(0,0); if(typeof renderMCQ==='function') renderMCQ(); } else if(typeof mqNav==='function'){ mqNav(1); } }catch(_){ try{ if(typeof mqNav==='function') mqNav(1); }catch(__){} } _oxWarnBypass=false; }
function mqNav(d){ const qs=mqQuestions();
  if(d===1 && !mqInReview && !_oxWarnBypass){   // [2026-07-20] 모든 풀이 모드에서 OX만 누르고 정답 미선택 시 안내
    var _cq=qs[mqIdx];
    var _qid=_cq&&_cq.id;
    var _ansEmpty = !_qid || mqAns[_qid]===undefined;                      // 정답 미선택
    var _oxSel=false; try{ _oxSel=!!document.querySelector('.jox.on'); }catch(_){}   // 화면에 OX 선택돼 있나
    var _oxClk = _oxSel || _oxClickedOnly(_qid);                           // OX 눌렀나(DOM 우선, mqOX 폴백)
    try{ if(/[?&]dbg=1/.test(location.search) && typeof clToast==='function') clToast('OX:'+(_oxClk?'Y':'N')+' / \uC815\uB2F5:'+(_ansEmpty?'N':'Y')); }catch(_){}
    if(_ansEmpty && _oxClk && !_oxWarnSnoozed()){ _oxWarnShow(); return; }  // _cq.id 의존 제거 — OX눌렀고 정답없으면 팝업
  }
  _oxWarnBypass=false;
  if(d===1 && mqReview && !mqInReview){ const cq=qs[mqIdx]; if(cq && cq.id && mqAns[cq.id]===undefined && typeof srDueK==='function' && srDueK(mqCert,cq.id)){ srRateK(mqCert,cq.id,1,false,false); if(typeof srSaveDebounced==='function') srSaveDebounced(); } }   // 가: 복습에서 '다음'으로 넘기면 안 푼 문항도 '봤음=애매(3일)'로 1회 차감
  if(d===1&&mqIdx>=qs.length-1){ if(mqInReview){ mqBackToResult(); return; } mqResult(); return; } const ni=mqIdx+d; if(ni<0||ni>=qs.length)return; mqIdx=ni; if(mqConcept) mqConceptPhase='learn'; mqSaveProgress(); if(mqDiag) saveDiagProgress(); window.scrollTo(0,0); renderMCQ(); }
function mqProgStart(e){
  var track=e.currentTarget; var total=mqQuestions().length; if(total<=1) return;
  function idxAt(ev){ var r=track.getBoundingClientRect(); var cx=(ev.touches&&ev.touches[0])?ev.touches[0].clientX:ev.clientX; var f=(cx-r.left)/r.width; if(f<0)f=0; if(f>1)f=1; return Math.round(f*(total-1)); }
  var target=mqIdx;
  function move(ev){ if(ev.cancelable)ev.preventDefault(); target=idxAt(ev); var bar=track.querySelector('.bar'); if(bar) bar.style.width=((target+1)/total*100)+'%'; var lbl=document.getElementById('mqProgNum'); if(lbl) lbl.textContent=(target+1)+' / '+total+' 문항'; }
  function end(){ document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',end); document.removeEventListener('pointercancel',end);
    if(target!==mqIdx){ mqIdx=target; if(mqConcept) mqConceptPhase='learn'; mqSaveProgress(); if(mqDiag) saveDiagProgress(); }
    window.scrollTo(0,0); renderMCQ(); }
  move(e);
  document.addEventListener('pointermove',move); document.addEventListener('pointerup',end); document.addEventListener('pointercancel',end);
}
function mqResult(){
  var _wasLU=mqLevelUp;
  _luReviewReturn=null;
  mqStopTimer(); mqStopOverTimer(); mqClearProgress(mqSub,mqSet);
  try{ localStorage.removeItem('certlab_mcq_active'); }catch(_){}
  if(mqReview) _reviewClear();   // 복습 완료 → 이어풀기 기록 삭제(다음엔 새 due로 시작)
  mqInReview=false; mqConcept=false; mqGather=false;
  const qs=mqQuestions(); let correct=0,answered=0;
  const reflectUnans=(!mqReview && !mqDiag && mqMode==='all');  // 일반 풀이에서만 미응답 복습 반영
  qs.forEach((q,i)=>{ if(mqAns[q.id]!==undefined){ answered++;
    if(mqCorrect(q,mqAns[q.id])){ correct++; delete appWrong[q.id]; }
    else { appWrong[q.id]=true; }
  } else if(reflectUnans && mqHasAnswer(q)){
    // 미응답: 시간종료 전 지나친 문항(보고넘김)=틀림, 종료 후 미도달(시간부족)=애매
    const unseen = mqTimeUp && mqTimeUpIdx>=0 && i>mqTimeUpIdx;
    srRateK(mqCert, q.id, unseen?1:0, false);
    if(!unseen) appWrong[q.id]=true;   // 보고넘김은 오답노트 포함
  }});
  if(currentUser) saveUserData();
  const total=qs.length; const pct=total?Math.round(correct/total*100):0;
  if(mqDiag){ srSaveDiagnostic(mqCert,correct,total); clearDiagProgress(mqCert);
    if(mqLevelTest){ ltFinalize(mqCert, qs, mqAns); } }
  const _wasLevelTest=mqLevelTest; mqLevelTest=false;
  var _luChanges=[]; if(_wasLU){ _luChanges=_luAfterRound(qs, correct); }   // 레벨업: 레벨변동·기록·이어풀기정리
  // 결과 스냅샷 (오답보기·번호그리드·결과 재표시에 사용)
  mqResultQs=qs.slice(); mqResultAns=Object.assign({},mqAns);
  mqResultMeta={correct,answered,total,pct,diag:mqDiag,review:mqReview,mode:mqMode,sub:mqSub,set:mqSet,
    otc:mqOvertimeCount,ots:mqOverElapsed(),levelTest:_wasLevelTest,cert:mqCert,
    lu:_wasLU, luSubName:(_wasLU?_luLastSubName:''), luChanges:_luChanges, luFromHist:false, luCombo:(_wasLU?luRoundMaxCombo:0)};
  mqLevelUp=false;   // 채점화면에선 레벨업 풀이 상태 해제(버튼 분기는 meta.lu)
  var _wasTimeUp=mqTimeUp;
  mqStopTimer(); mqStopOverTimer(); mqScreen='result';   // 결과화면 전용 상태 — 진행 재저장·플러시 방지
  renderMqResultScreen();
  if(_wasLU){ setTimeout(function(){ _eloInfoPopups(mqResultQs, _wasTimeUp); }, 450); }
}
function renderMqResultScreen(){
  const M=mqResultMeta; if(!M){ return; }
  if(M.levelTest && !currentUser){ _ltRenderResultGate(M); return; }   // 게스트: 레벨테스트 결과는 로그인해야 공개
  const {correct,answered,total,pct,diag}=M;
  const em=pct>=80?'🏆':pct>=60?'💪':'📚';
  const modeLbl=diag?' · 레벨':M.review?' · 복습':M.lu?'':M.mode==='wrong'?' · 오답 다시풀기':'';
  const titleTxt=diag?'레벨 테스트':M.review?'오늘의 복습':M.lu?(M.luSubName||'레벨업'):(curQB()[M.sub].name+' · '+curQB()[M.sub].sets[M.set].label);
  // 레벨업 머리말: ⚡태그 + 레벨변동(+기록열람 시 날짜)
  var luHead='';
  if(M.lu){
    luHead='<div style="margin:2px 0 5px"><span style="display:inline-block;background:#E0ECFA;color:#185FA5;font-size:11px;font-weight:800;border-radius:8px;padding:2px 8px">⚡ 레벨업</span>'
      +((!M.luFromHist && M.luCombo>=2)?'<span class="lu-combo-recap">🔥 최고 콤보 '+M.luCombo+'</span>':'')+'</div>';
    if(M.luFromHist && M.ts){ var _d=new Date(M.ts); luHead+='<div style="font-size:11px;color:#94A3B8;margin-bottom:3px">'+(_d.getMonth()+1)+'/'+_d.getDate()+' '+('0'+_d.getHours()).slice(-2)+':'+('0'+_d.getMinutes()).slice(-2)+'</div>'; }
    var _lc=M.luChanges||[]; if(_lc.length){ var _lm=_lc.filter(function(c){return c.up;})[0]||_lc[0];
      if(!M.luFromHist){
        // 게이미피케이션: 레벨 변동 연출 스테이지(XP 바 + Lv 배지 + 컨페티)
        var _scol=_lm.up?'#1E7A45':'#94A3B8', _stitle=_lm.up?'레벨 업! 🎉':'레벨 조정 💪', _sdesc=_lm.up?'약했던 단원이 한 단계 올라갔어요.':'다지면 다시 올라가요.';
        luHead+='<div class="lu-stage'+(_lm.up?'':' down')+'" id="luStage">'
          +'<div class="lu-stage-ti">'+_stitle+'</div>'
          +'<div class="lu-stage-sub">'+mqEsc(_lm.subName||M.luSubName||'')+' · '+mqEsc(_lm.topic)+'</div>'
          +'<div class="lu-lvline"><span class="lu-lvb lu-lvb-from"><small>Lv</small><b>'+_lm.from+'</b></span><span class="lu-arrow">→</span><span class="lu-lvb lu-lvb-to'+(_lm.up?'':' down')+'" id="luLvTo"><small>Lv</small><b>'+_lm.to+'</b></span></div>'
          +'<div class="lu-xpwrap"><div class="lu-xp"><i id="luXp"></i></div></div>'
          +'<div class="lu-stage-desc">'+_sdesc+'</div>'
        +'</div>';
      } else {
        luHead+='<div style="font-size:12.5px;font-weight:800;color:'+(_lm.up?'#2E9B5E':'#946200')+';margin-bottom:4px">'+(_lm.up?'🎉 ':'💪 ')+mqEsc(_lm.topic)+' Lv'+_lm.from+' → Lv'+_lm.to+'</div>';
      }
      if(!M.luFromHist && _lc.length>=2){   // 이번 라운드에 레벨이 바뀐 단원 전부 표시(오름 ▲ / 내림 ▼)
        luHead+='<div style="margin:8px 0 2px"><div style="font-size:11px;font-weight:800;color:#8A7D6E;margin:0 2px 5px">📊 이번 라운드 단원 변동</div>'
          +_lc.map(function(c){ var col=c.up?'#1E7A45':'#946200', bg=c.up?'#E6F4EC':'#FBF0D8', ar=c.up?'▲':'▼';
            return '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:'+bg+';border-radius:9px;margin-bottom:5px"><span style="font-weight:900;font-size:12px;color:'+col+'">'+ar+'</span><span style="flex:1;font-size:12.5px;font-weight:700;color:#3C3C3A">'+mqEsc(c.topic)+'</span><span style="font-size:11.5px;font-weight:800;color:'+col+'">Lv'+c.from+' → Lv'+c.to+'</span></div>';
          }).join('')+'</div>';
      }
    }
  }
  // 문항별 번호 그리드 (정답 초록 / 오답 빨강 / 미응답 회색)
  const grid=mqResultQs.map((q,i)=>{
    const a=mqResultAns[q.id]; let cls='gx-none';
    if(a!==undefined) cls=isCorr(q.ans,a)?'gx-ok':'gx-bad';
    return '<button class="gx '+cls+'" onclick="mqOpenReview(\'all\','+i+')">'+(i+1)+'</button>';
  }).join('');
  const wrongN=mqResultQs.filter(q=>mqResultAns[q.id]!==undefined && !isCorr(q.ans,mqResultAns[q.id])).length;
  const unansN=mqResultQs.filter(q=>mqResultAns[q.id]===undefined).length;
  const gridHTML=
    '<div class="gx-wrap"><div class="gx-ti">문항별 결과 <span>번호를 누르면 해설</span></div>'+
    '<div class="gx-grid'+(M.lu?' gx-grid-lu':'')+'">'+grid+'</div>'+
    '<div class="gx-leg"><span><i class="gx-d gx-ok"></i>정답</span><span><i class="gx-d gx-bad"></i>오답</span><span><i class="gx-d gx-none"></i>미응답</span></div></div>';
  let btns;
  if(M.lu && M.luFromHist){
    btns=(wrongN>0?'<button onclick="mqOpenReview(\'wrong\',0)">❌ 오답 '+wrongN+'</button>':'')+
         (unansN>0?'<button onclick="mqOpenReview(\'unans\',0)">⬜ 미응답 '+unansN+'</button>':'')+
         '<button class="ghost" onclick="luHistGo()">‹ 전체 결과</button>';
  } else if(M.lu){
    btns=(answered<total?'<button onclick="luResumeRound()">▶ 이어풀기</button>':'')+
         (wrongN>0?'<button onclick="mqOpenReview(\'wrong\',0)">❌ 오답 '+wrongN+'</button>':'')+
         (unansN>0?'<button onclick="luResumeUnans()">⬜ 미응답 '+unansN+'</button>':'')+
         '<button onclick="luRetryRound()">🔄 다시풀기</button>'+
         '<button onclick="luContinue()">계속 풀기</button>'+
         '<button class="ghost" onclick="luHistGo()">📊 전체 레벨업 결과</button>';
  } else btns=diag
    ? ((wrongN>0?'<button onclick="mqOpenReview(\'wrong\',0)">❌ 오답 '+wrongN+'</button>':'')+(unansN>0?'<button onclick="mqOpenReview(\'unans\',0)">⬜ 미응답 '+unansN+'</button>':'')+'<button onclick="mqBackHome()">📊 실력 분석</button>')
    : ((answered<total?'<button onclick="mqContinue()">▶ 이어풀기</button>':'')+
       (wrongN>0?'<button onclick="mqOpenReview(\'wrong\',0)">❌ 오답 '+wrongN+'</button>':'')+
       (unansN>0?'<button onclick="mqContinueUnans()">⬜ 미응답 '+unansN+'</button>':'')+
       '<button onclick="mqRetry()">🔄 다시풀기</button><button class="ghost" onclick="mqBackHome()">과목 선택</button>');
  var _navLbl=M.lu?'레벨업 결과':diag?'레벨 테스트 결과':M.review?'복습 결과':((curQB()&&curQB()[M.sub]&&curQB()[M.sub].name)?(curQB()[M.sub].name+' 결과'):'결과');
  var _navHead='<div class="mcq-exam-title"><button class="exam-home-back" onclick="clHandleBack()" aria-label="뒤로">'+BACK_ARROW+'</button>'+mqEsc(_navLbl)+'</div>';
  document.getElementById('mcqRoot').innerHTML=
    _navHead+
    '<div class="mcq-result"><div class="em">'+em+'</div>'+
    luHead+
    '<div class="rt">'+titleTxt+modeLbl+'</div>'+
    '<div class="rs">총 '+total+'문항 중 '+answered+'문항 응답'+(diag?' · 레벨 점수 '+pct+'점':'')+'</div>'+
    ((M.otc>0||M.ots>0)?'<div class="rs" style="color:#C2410C">⏱ 시간종료 후 '+M.otc+'문항 · 추가 +'+mqFmt(M.ots)+' <span style="font-size:11px;color:#A89C8E">(예상점수 미반영)</span></div>':'')+
    '<div class="sc"><div><div class="v ok">'+correct+'</div><div class="l">정답</div></div>'+
    '<div><div class="v bad">'+(answered-correct)+'</div><div class="l">오답</div></div>'+
    '<div><div class="v none">'+(total-answered)+'</div><div class="l">미응답</div></div>'+
    '<div><div class="v">'+pct+'%</div><div class="l">정답률</div></div></div>'+
    gridHTML+
    (M.levelTest?_ltResultHTML(M):'')+
    '<div class="rbtns">'+btns+'</div></div>';
  if(M.lu && !M.luFromHist){ _luResultFx(M); }
  window.scrollTo(0,0);
}
// 게이미피케이션: 결과화면 레벨업 연출(XP 바 채움 → Lv 배지 팝 → 컨페티). Safari/저사양 배려: reduced-motion 즉시표시
function _luReduceMotion(){ try{ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){ return false; } }
function _luResultFx(M){
  try{
    var _lc=(M.luChanges||[]); if(!_lc.length) return;
    var up=(_lc.filter(function(c){return c.up;})[0]||_lc[0]).up;
    var xp=document.getElementById('luXp'), lvTo=document.getElementById('luLvTo'), stage=document.getElementById('luStage');
    if(_luReduceMotion()){   // 모션 최소화: 애니 없이 최종 상태만(컨페티·진동 생략)
      if(xp){ xp.style.transition='none'; xp.style.width=up?'100%':'14%'; }
      if(lvTo){ lvTo.style.transition='none'; lvTo.classList.add('show'); }
      return;
    }
    if(xp){ xp.style.width='28%'; setTimeout(function(){ xp.style.width=up?'100%':'14%'; },140); }
    setTimeout(function(){ if(lvTo) lvTo.classList.add('show'); if(up && stage){ _luConfetti(stage); try{ navigator.vibrate&&navigator.vibrate([20,40,20]); }catch(_){} } else { try{ navigator.vibrate&&navigator.vibrate(15); }catch(_){} } }, 1150);
  }catch(e){}
}
function _luConfetti(host){
  try{
    if(_luReduceMotion()) return;
    var n=(typeof window!=='undefined' && window.innerWidth && window.innerWidth<=480)?12:16;   // 모바일 축소(Safari/저사양 배려)
    var cols=['#FBBF24','#34D399','#60A5FA','#F472B6','#FB923C'];
    for(var i=0;i<n;i++){ (function(k){
      var c=document.createElement('span'); c.className='lu-cfti';
      c.style.left=(Math.random()*100)+'%'; c.style.background=cols[k%cols.length]; c.style.animationDelay=(Math.random()*0.3)+'s';
      host.appendChild(c);
      requestAnimationFrame(function(){ c.classList.add('go'); });
      setTimeout(function(){ if(c.parentNode) c.parentNode.removeChild(c); }, 1700);
    })(i); }
  }catch(e){}
}
// 결과 검토(전체/오답만) — 단일 문항 카드 재활용, 별도 리뷰 리스트 사용
function mqOpenReview(mode,idx){
  mqStopTimer(); mqStopOverTimer();
  let list;
  if(mode==='wrong') list = mqResultQs.filter(q=>mqResultAns[q.id]!==undefined && !isCorr(q.ans,mqResultAns[q.id]));
  else if(mode==='unans') list = mqResultQs.filter(q=>mqResultAns[q.id]===undefined);
  else list = mqResultQs.slice();
  if(!list.length){ alert(mode==='unans'?'미응답 문항이 없습니다. 모두 푸셨어요! 👍':'오답이 없습니다. 모두 맞히셨어요! 🎉'); return; }
  mqReviewList=list; mqReviewMode=mode; mqInReview=true;
  mqAns=Object.assign({},mqResultAns);
  mqShow={}; list.forEach(q=>{ mqShow[q.id]=true; });   // 정답·해설 항상 펼침
  mqIdx=Math.min(idx||0, list.length-1);
  mqScreen='exam'; renderMCQ(); window.scrollTo(0,0);
}
function mqBackToResult(){ if(_luReviewReturn){ var t=_luReviewReturn; _luReviewReturn=null; mqInReview=false; mqScreen=t; renderMCQ(); window.scrollTo(0,0); return; } mqInReview=false; mqScreen='result'; renderMqResultScreen(); }
function mqContinue(){ mqInReview=false; mqTimeUp=true; mqScreen='exam'; renderMCQ(); window.scrollTo(0,0); mqStartOverTimer(); }
function mqContinueUnans(){   // 미응답 → 첫 미응답 문항부터 이어풀기(입력 가능)
  mqInReview=false;
  var qs=(mqList&&mqList.length)?mqList:mqResultQs;
  if(qs&&qs.length){ for(var i=0;i<qs.length;i++){ if(mqAns[qs[i].id]===undefined){ mqIdx=i; break; } } }
  mqTimeUp=true; mqScreen='exam'; renderMCQ(); window.scrollTo(0,0); mqStartOverTimer();
}
function mqRetry(){
  mqInReview=false;
  if(mqReview){ startMcqReview(); return; }
  mqClearProgress(mqSub,mqSet);
  const all=curQB()[mqSub].sets[mqSet].questions;
  mqOXClearList(all);   // 다시 풀기 → O/X 해제(동기화 부활 방지 포함)
  if(mqMode==='wrong') mqList=all.filter(q=>appWrong[q.id]);
  else mqList=all;
  if(!mqList.length){ alert('다시 풀 문항이 없습니다.'); mqBackHome(); return; }
  mqAns={}; mqShow={}; mqIdx=0; mqTimeLeft=_sessionSecs(mqList, mqCert); mqScreen='exam'; renderMCQ(); mqStartTimer(); window.scrollTo(0,0);
}

/* ===== 통합 플랫폼 라우팅: 시험 선택 / 전환 / 마지막 시험 기억 ===== */
let activeCert = null;
function getLastCert(){ try{ return localStorage.getItem('certlab_lastCert'); }catch(e){ return null; } }
function setLastCert(id){ try{ localStorage.setItem('certlab_lastCert', id); }catch(e){} }
function showHome(){ if(typeof ttsStop==='function')ttsStop();
  // 객관식 시험 풀던 중 홈으로 나가도 오답노트·진행상황 반영 (검토·복습·진단 제외)
  if(typeof mqScreen!=='undefined' && mqScreen==='exam' && !mqInReview && !mqReview && !mqDiag){
    if(typeof mqFlushAnsweredToWrong==='function') mqFlushAnsweredToWrong();
    if(typeof mqSaveProgress==='function') mqSaveProgress();
  }
  mqInReview=false; mqConcept=false;
  activeCert = null;
  if(typeof updateEventBadge==='function') updateEventBadge();
  if(typeof mqStopTimer==='function') mqStopTimer();
  if(typeof mqStopOverTimer==='function') mqStopOverTimer();
  document.getElementById('homeView').classList.remove('hidden');
  var _hd=document.querySelector('.header'); if(_hd) _hd.classList.remove('hidden');
  var _ft=document.querySelector('.footer'); if(_ft) _ft.classList.remove('hidden');
  var _cmv=document.getElementById('communityView'); if(_cmv) _cmv.classList.add('hidden');
  var _mpv=document.getElementById('myPageView'); if(_mpv) _mpv.classList.add('hidden');
  document.getElementById('bodybuildingView').classList.add('hidden');
  document.getElementById('mcqView').classList.add('hidden');
  document.getElementById('certSwitch').classList.add('hidden');
  document.getElementById('modePill').style.display = 'none';
  mqScreen='home';
  // [2026-07-20] 홈으로 나가면 시험 해시 제거. 단, 커뮤니티/계정삭제 라우트는 유지.
  try{ var _h=location.hash||''; if(_h && _h.indexOf('#post/')!==0 && _h!=='#account-delete'){ history.replaceState(null, '', location.pathname+location.search); } }catch(_){}
  if(typeof cmLoadNoticeBar==='function') cmLoadNoticeBar();
  if(typeof reorderCertCards==='function') reorderCertCards();                              // 홈 볼 때마다 현재 시험일로 재정렬
  if(typeof _examDateMs!=='undefined' && _examDateMs==null && typeof loadExamSchedules==='function') loadExamSchedules();   // 아직 못 읽었으면 로드
  setTimeout(function(){ if(typeof reorderCertCards==='function') reorderCertCards(); }, 2500);   // 모바일 느린 렌더 대비 늦은 재정렬
  syncPlanMirror(); updateAuthBar();
}
async function enterCert(id, noGate){
  // 객관식 시험 풀던 중 다른 시험으로 전환 시에도 오답노트·진행상황 반영
  if(typeof mqScreen!=='undefined' && mqScreen==='exam' && !mqInReview && !mqReview && !mqDiag){
    if(typeof mqFlushAnsweredToWrong==='function') mqFlushAnsweredToWrong();
    if(typeof mqSaveProgress==='function') mqSaveProgress();
  }
  mqInReview=false; mqConcept=false;
  activeCert = id;
  if(typeof updateEventBadge==='function') updateEventBadge();
  if(typeof mqStopTimer==='function') mqStopTimer();
  if(typeof mqStopOverTimer==='function') mqStopOverTimer();
  setLastCert(id);
  // [2026-07-20] 주소창에 현재 시험 해시 유지 (광고·공유용). 특수 라우트(#post/#account-delete)는 건드리지 않음.
  try{ if(id) history.replaceState(null, '', location.pathname+location.search+'#'+id); }catch(_){}
  document.getElementById('homeView').classList.add('hidden');
  var _hd2=document.querySelector('.header'); if(_hd2) _hd2.classList.add('hidden');
  document.getElementById('certSwitch').classList.remove('hidden');
  // 뷰 전환 먼저(사용자가 로딩을 보게)
  if(id === 'bodybuilding'){
    document.getElementById('bodybuildingView').classList.remove('hidden');
    document.getElementById('mcqView').classList.add('hidden');
    document.getElementById('certSwitchName').textContent = '스포츠지도사 실기·구술';
    document.getElementById('modePill').style.display = '';
  } else if(_isSubjCert(id)){
    // [2026-07-15] 주관식도 객관식과 동일 화면(mcqView)에서 과목→회차 아코디언 공유. 상세만 subjective.js.
    document.getElementById('mcqView').classList.remove('hidden');
    document.getElementById('bodybuildingView').classList.add('hidden');
    document.getElementById('subjectiveView').classList.add('hidden');
    document.getElementById('certSwitchName').textContent = certLabel(id);
    document.getElementById('modePill').style.display = 'none';
    mqCert = id;
  } else if(isMcqCert(id)){
    document.getElementById('mcqView').classList.remove('hidden');
    document.getElementById('bodybuildingView').classList.add('hidden');
    document.getElementById('certSwitchName').textContent = certLabel(id);
    document.getElementById('modePill').style.display = 'none';
    mqCert = id;
  }
  // (2026-07-02) 게스트 후킹 전체화면 강제 제거 — 시험 탭하면 바로 기출/과목 화면(레벨테스트는 대시보드 내 "무료 레벨테스트" 버튼으로). 무료 10문제 한도는 canAccess로 유지.
  // lazy 로드: 이 시험 데이터가 아직 없으면 로딩 표시 후 받음(캐시 있으면 거의 즉시)
  if(!loadedExams[id]){
    var _tgt = (id==='bodybuilding') ? document.getElementById('cardArea') : document.getElementById('mcqRoot');
    if(_tgt) _tgt.innerHTML=(id==='bodybuilding'?'':'<div style="display:flex;align-items:center;gap:6px;max-width:440px;margin:0 auto 10px;padding:2px"><button onclick="goHome()" aria-label="홈" style="border:none;background:none;font-size:22px;color:#0C447C;cursor:pointer;padding:0 6px;line-height:1">←</button><span style="font-size:15px;font-weight:800;color:#1F2937">'+certLabel(id)+'</span></div>')+'<div class="loading" style="padding:48px 16px;text-align:center;color:#0C447C;font-weight:600">문제 불러오는 중…</div>';
    try{ await loadExam(id); }
    catch(e){ if(_tgt) _tgt.innerHTML='<div style="padding:48px 16px;text-align:center;color:#E24B4A">불러오기 실패. 새로고침해 주세요.</div>'; console.error('loadExam 실패',e); return; }
    if(id==='bodybuilding'){ cards=[...D]; filtered=[...cards]; current=0; }
  }
  // 렌더
  if(id === 'bodybuilding'){
    if(typeof shuffleCards==='function' && cards.length){ shuffleCards(); current=0; isFlipped=false; learnOpen=false; }   // 진입 시 매번 새 순서
    refresh();
  } else if(isMcqCert(id) || _isSubjCert(id)){
    if(_isSubjCert(id)){ try{ _subjBuildQB(id); }catch(e){ console.error('subj qb',e); } subjRun=null; }
    mqScreen = 'home'; mqOpen = {}; mqList = null; renderMCQ();
    // (2026-07-02) 게스트 진입 시 _ltGuestGate 후킹/게이트로 콘텐츠 덮던 것 제거 — 시험 탭하면 기출/과목 대시보드 유지(레벨테스트는 대시보드 내 CTA로). 레벨테스트 결과 로그인 게이트는 LT 완료 시(renderMqResultScreen 5298)에만.
  }
  syncPlanMirror(); updateAuthBar();
  // 만료된 시험 진입 시 결제 안내
  if(currentUser && userEnt[id] && userEnt[id].plan === 'EXPIRED'){ setTimeout(()=>showPlanPopup(), 600); }
  window.scrollTo(0,0);
}
function goHome(){ if(typeof _cmReturn!=='undefined') _cmReturn=null; showHome(); }
// 딥링크: 특정 생체 카드로 바로 이동 (?card=EP_72)
async function goToCard(qid, certHint){
  if(!qid) return;
  // 객관식 문항이면 해당 시험·과목·세트·문항으로 이동(진행상황 보존)
  var cs=(typeof MCQ_QID2CS!=='undefined')?MCQ_QID2CS[qid]:null;
  // 맵에 없고 cert 힌트가 MCQ 시험이면, 그 시험을 로드(lazy)한 뒤 다시 찾기
  if(!cs && certHint && typeof isMcqCert==='function' && isMcqCert(certHint)){
    try{ await enterCert(certHint, true); }catch(_){}
    cs=(typeof MCQ_QID2CS!=='undefined')?MCQ_QID2CS[qid]:null;
  }
  if(cs){
    try{ await enterCert(cs.cert, true); }catch(_){}   // mqCert 세팅 + mcqView 표시 + 콘텐츠 로드
    try{
      var qb=qbOf(cs.cert), subObj=qb&&qb[cs.sub];
      if(subObj&&subObj.sets){
        for(var si=0;si<subObj.sets.length;si++){
          var qi=subObj.sets[si].questions.findIndex(function(q){return q&&q.id===qid;});
          if(qi!==-1){ resumeMcqExam(cs.sub,si); mqIdx=qi; mqShow={}; renderMCQ(); window.scrollTo(0,0); return; }
        }
      }
    }catch(_){}
    return;   // 시험엔 진입했으나 문항 못 찾음 — 생체로 떨어뜨리지 않음
  }
  // ★ 레벨업(변형) 문항 딥링크: 변형 풀(variantPool)을 로드해 찾고, 단독 리뷰로 띄움(검수용)
  // isMcqCert 게이트 제거 — sport2 등 manifest 등록 시험이 아직 MCQ로 인식 안 돼도 진입 후 조회하도록.
  if(certHint && certHint!=='bodybuilding'){
    try{ await enterCert(certHint, true); }catch(_){}
    try{
      var _qb=null; try{ _qb=(typeof MCQ_EXAMS!=='undefined' && MCQ_EXAMS[certHint])?MCQ_EXAMS[certHint].qb:null; }catch(_){}
      var _subs=_qb?Object.keys(_qb):[];
      if(!_subs.length){ try{ var _mex=(typeof MANIFEST!=='undefined'&&MANIFEST&&(MANIFEST.exams||[]).find(function(e){return e&&e.id===certHint;})); _subs=((_mex&&_mex.subjects)||[]).map(function(s){return s&&s.code;}).filter(Boolean); }catch(_){} }
      try{ console.info('[레벨업 딥링크] 진입 cert='+certHint+' subs='+JSON.stringify(_subs)+' isMcq='+((typeof isMcqCert==='function')?isMcqCert(certHint):'?')); }catch(_){}
      if(typeof loadAdaptiveSubject==='function'){
        try{ await Promise.all(_subs.map(function(code){ return loadAdaptiveSubject(certHint, code).catch(function(){return null;}); })); }catch(_){}
      }
      // variantPool 전 과목에서 문항 찾기
      var _found=null, _foundSub=null, _poolInfo=[];
      if(typeof AD_DATA!=='undefined'){
        for(var vi=0; vi<_subs.length; vi++){
          var _b=AD_DATA[certHint+'|'+_subs[vi]];
          var _plen=(_b&&Array.isArray(_b.variantPool))?_b.variantPool.length:'(pool없음)';
          var _ids=(_b&&Array.isArray(_b.variantPool))?_b.variantPool.slice(0,3).map(function(q){return q&&q.id;}).join(','):'';
          _poolInfo.push(_subs[vi]+':'+_plen+(_ids?('['+_ids+'…]'):''));
          if(_b && Array.isArray(_b.variantPool)){
            var _hit=_b.variantPool.find(function(q){ return q && q.id===qid; });
            if(_hit){ _found=_hit; _foundSub=_subs[vi]; break; }
          }
        }
      } else { _poolInfo.push('AD_DATA 자체가 undefined'); }
      // ★ 폴백: 캐시된 variantPool에 없으면 Firestore에서 최신 variantq를 직접 읽어 재탐색(6h 캐시·부분로드 우회)
      if(!_found && typeof db!=='undefined' && db){
        for(var fi=0; fi<_subs.length; fi++){
          try{
            var _sc=_subs[fi];
            var _snap=await db.collection('adaptive').doc(certHint+'__'+_sc+'__variantq').get();
            if(_snap && _snap.exists){
              var _dd=(typeof _adParse==='function')?_adParse(_snap.data()):(_snap.data());
              var _qs=(_dd&&_dd.questions)||[];
              var _h2=_qs.find(function(q){ return q && q.id===qid; });
              if(_h2){
                _found=_h2; _foundSub=_sc;
                try{ if(typeof AD_DATA!=='undefined' && AD_DATA[certHint+'|'+_sc]) AD_DATA[certHint+'|'+_sc].variantPool=_qs; }catch(_){}
                try{ console.info('[레벨업 딥링크] 최신본 폴백으로 문항 찾음 qid='+qid+' sub='+_sc); }catch(_){}
                break;
              }
            }
          }catch(_){}
        }
      }
      if(!_found){ try{ console.warn('[레벨업 딥링크] 문항 못찾음 qid='+qid+' cert='+certHint+' subs='+JSON.stringify(_subs)+' pools='+_poolInfo.join(' / ')); }catch(_){} }
      if(_found){   // 단독 1문항 리뷰로 띄움 (채점·레벨변동 없이 문항+해설 확인)
        mqSub=_foundSub; mqSet=0; mqMode='all';
        mqReview=true; mqDiag=false; mqLevelUp=false; mqGather=false; mqConcept=false; mqInReview=true;
        mqList=[_found]; mqReviewList=[_found]; mqReviewMode='all'; mqIdx=0; mqAns={}; mqGuess={}; mqShow={}; mqShow[_found.id]=true;
        mqScreen='exam'; renderMCQ(); window.scrollTo(0,0); return;
      }
      // 혹시 sets(기출)에 있으면 기존 경로로
      var cs2=(typeof MCQ_QID2CS!=='undefined')?MCQ_QID2CS[qid]:null;
      if(cs2){ var qb2=qbOf(cs2.cert), so2=qb2&&qb2[cs2.sub]; if(so2&&so2.sets){ for(var s2=0;s2<so2.sets.length;s2++){ var i2=so2.sets[s2].questions.findIndex(function(q){return q&&q.id===qid;}); if(i2!==-1){ resumeMcqExam(cs2.sub,s2); mqIdx=i2; mqShow={}; renderMCQ(); window.scrollTo(0,0); return; } } } }
    }catch(_){}
    return;   // 시험엔 진입했으나 못 찾음 — 메인 유지
  }
  // cert 힌트가 생체 아닌 다른 시험이면, 생체 폴백 대신 그 시험 화면으로
  if(certHint && certHint!=='bodybuilding'){ try{ await enterCert(certHint, true); }catch(_){} return; }
  // 생체 플래시카드 (cert 힌트 없거나 생체)
  enterCert('bodybuilding');
  try{
    currentSubj='전체'; currentStar=0;
    filtered=[...cards];   // 전체에서 찾도록
    var idx=filtered.findIndex(function(c){return c&&c.id===qid;});
    if(idx!==-1){ current=idx; isFlipped=false; learnOpen=false; refresh(); window.scrollTo(0,0); }
  }catch(_){}
}
function routeAfterAuth(){
  if(currentUser && !activeCert){
    const last = getLastCert();
    if(last === 'bodybuilding' || last === 'appraiser') enterCert(last);
  }
}
// 새로고침 시 풀던 문항 화면으로 자동 복귀 (포인터 + 저장된 진행상황이 있을 때만)
function mqAutoResume(){
  try{
    var raw=localStorage.getItem('certlab_mcq_active'); if(!raw) return false;
    var a=JSON.parse(raw); if(!a||!a.cert||a.sub==null||a.set==null) return false;
    if(typeof isMcqCert==='function' && !isMcqCert(a.cert)) return false;
    if(!localStorage.getItem('certlab_mcq_p_'+a.cert+'_'+a.sub+'_'+a.set)) return false;   // 진행상황 없으면 복원 안 함
    enterCert(a.cert);   // mqCert 세팅 + mcqView
    var qb=(typeof qbOf==='function')?qbOf(a.cert):(typeof curQB==='function'?curQB():null);
    if(!(qb && qb[a.sub] && qb[a.sub].sets && qb[a.sub].sets[a.set])) return false;
    resumeMcqExam(a.sub, a.set);
    return true;
  }catch(_){ return false; }
}

/* ===== Firestore 문제은행 로더 (버전 캐시, 시험별 lazy 로드) ===== */
var MANIFEST=null;          // manifest/exams 1회 캐시
var loadedExams={};         // 시험별 로드 완료 플래그
async function loadManifest(){
  if(MANIFEST) return MANIFEST;
  if(!firebaseReady||!db){ throw new Error('Firestore 미초기화'); }
  const mSnap=await db.collection('manifest').doc('exams').get();
  if(!mSnap.exists){ throw new Error('manifest/exams 문서 없음'); }
  MANIFEST=mSnap.data();
  try{ var _pc=await db.collection('config').doc('pricing').get(); if(_pc.exists) _pricingCfg=_pc.data(); }catch(_){}
  try{ buildCertRegistry(MANIFEST); }catch(e){ console.error('buildCertRegistry 실패', e); }   // 매니페스트 기반 새 시험 동적 등록(기존 7개는 무변경·확장만)
  try{ applyCertIcons(); }catch(_){}   // config/pricing.certIcon(관리자 지정) → 홈 카드 아이콘 반영
  try{ if(typeof reorderCertCards==='function') reorderCertCards(); }catch(_){}
  if(typeof loadExamSchedules==='function') loadExamSchedules();   // 시험일 읽어 D-day 정렬(가까운 순, 없음/지남=맨밑)
  return MANIFEST;
}
// ===== 매니페스트 주도 시험 등록 (1단계: 확장 전용) =====
// 기존 하드코딩 7개(MCQ_EXAMS 등)는 그대로 두고, 매니페스트에만 있는 새 시험을 런타임 생성.
// 호출 멱등 — 같은 cert는 한 번만 등록. additive(기존 이용권·설정 안 건드림).
var _certRegBuilt={};
var SUBJ_EXAMS={};   // [2026-07] 주관식(서술형) 시험 데이터: id → {name, questions:[문제]}
function _isSubjCert(id){ return typeof SUBJ_EXAMS!=='undefined' && !!SUBJ_EXAMS[id]; }
// ===== [2026-07-15] 주관식도 객관식과 동일한 과목→회차 아코디언을 쓰도록 qb 합성 =====
// SUBJ_EXAMS[id].questions(플랫)를 과목(_subj)→회차(set)로 묶어 MCQ_EXAMS와 동일한 {code:{name,sets:[{label,questions}]}} 구조로.
var SUBJ_QB={};
function _subjBuildQB(id){
  var se=SUBJ_EXAMS[id]; if(!se){ SUBJ_QB[id]={}; return SUBJ_QB[id]; }
  var qb={}, order=[], nameToCode={};
  function _ensureSub(name){ if(nameToCode[name]!=null) return nameToCode[name];
    var code='sj'+order.length; nameToCode[name]=code; qb[code]={name:name, sets:[], _byset:{}, _order:[]}; order.push(code); return code; }
  // 1) 매니페스트 과목 골격 먼저 — 데이터 없는 과목도 카드가 뜨고 '0회차·준비 중'으로 노출(객관식과 동일)
  (se.subjects||[]).forEach(function(s){ if(s){ _ensureSub(s.name||s.code); } });
  // 2) 실제 문항을 과목(_subj)→회차(set)로 채움
  (se.questions||[]).forEach(function(q){
    var subName=(q&&q._subj)||se.name||'과목';
    var code=_ensureSub(subName);
    var lab=(q&&(q.set||q.round))||'기출';
    var g=qb[code];
    if(!g._byset[lab]){ g._byset[lab]=[]; g._order.push(lab); }
    g._byset[lab].push(q);
  });
  var setKey=function(lab){ var m=String(lab).match(/\d+/g); return m?Math.max.apply(null,m.map(Number)):-1; };
  order.forEach(function(code){ var g=qb[code];
    g.sets=g._order.map(function(lab){ return {label:lab, questions:g._byset[lab]}; });
    g.sets.sort(function(a,b){ return setKey(b.label)-setKey(a.label); });
    delete g._byset; delete g._order;
  });
  SUBJ_QB[id]=qb; return qb;
}
// ===== 주관식 러너: '풀기' → 상세 문제(자료·물음·답안작성). subjective.js가 상세만 그림 =====
var subjRun=null;   // {cert, sub, si, list, idx}
var AI_OFF=true;   // AI 결제(LLM) 막혀있는 동안 AI 채점/물어보기 숨김. 결제 뚫리면 false로 바꾸면 복구.
function _subjExamOpts(cert){ return {
  canOpen:function(qid){ var ok=canAccessSubjective(cert, qid); if(ok) _subjMarkOpened(cert, qid); return ok; },
  aiSell:(!AI_OFF && SUBJ_EXAMS[cert] && SUBJ_EXAMS[cert].aiSell!==false),
  aiCost:1, explainCost:1,
  creditBalance:function(){ return gradeBal(); },
  explainBalance:function(){ return explainBal(); },
  hasEntitlement:function(){ return gradeBal() >= 1; },
  gradeAi:function(payload){ return callGradeSubjective(payload).then(function(out){ if(out&&typeof out.creditsLeft==='number') _setWallet('grade', out.creditsLeft); return out; }); },
  explainAi:(AI_OFF? null : function(payload){ return callExplainConcept(payload).then(function(out){ if(out&&typeof out.creditsLeft==='number') _setWallet('explain', out.creditsLeft); return out; }); }),
  buyAi:function(){ openAiBuy('grade'); },
  buyExplain:function(){ openAiBuy('explain'); },
  needLogin:function(){ if(typeof showLoginPopup==='function') showLoginPopup(); },
  onGraded:function(rec){ saveGradeLog(cert, rec); },
  onReport:function(q){ try{ openReport(q); }catch(e){} },
  onRate:function(qid,n,r){ try{ if(typeof srRateK==='function') srRateK(cert, qid, r, false, false); }catch(_){} }
}; }
function startSubjExam(sub, si){
  var qb=curQB(); var g=qb&&qb[sub]; if(!g || !g.sets || !g.sets[si]){ return; }
  subjRun={ cert:mqCert, sub:sub, si:si, list:(g.sets[si].questions||[]), idx:0 };
  if(!subjRun.list.length){ alert('문제 준비 중입니다.'); subjRun=null; return; }
  mqScreen='subjexam'; renderMCQ(); window.scrollTo(0,0);
}
function subjGo(delta){ if(!subjRun) return; var ni=subjRun.idx+delta; if(ni<0||ni>=subjRun.list.length) return; subjRun.idx=ni; renderMCQ(); window.scrollTo(0,0); }
function renderSubjExam(root){
  if(!subjRun || subjRun.cert!==mqCert){ subjRun=null; mqScreen='home'; return renderMCQ(); }
  var cert=subjRun.cert, g=(curQB()[subjRun.sub])||{};
  var examName=g.name||certLabel(cert);
  var examSet=(g.sets && g.sets[subjRun.si]) ? g.sets[subjRun.si].label : '';
  var list=subjRun.list, idx=subjRun.idx; if(idx>=list.length)idx=list.length-1; if(idx<0)idx=0; subjRun.idx=idx;
  var n=list.length, pct=Math.round((idx+1)/n*100);
  root.innerHTML='<div class="exam-sticky">'+
    '<div class="exam-hd"><button class="exam-back" onclick="mqBackHome()" aria-label="뒤로">'+BACK_ARROW+'</button>'+
      '<div class="exam-ti"><div class="nm">'+mqEsc(examName)+'</div><div class="st">'+mqEsc(examSet)+'</div></div></div>'+
    '<div class="mq-prog"><div class="row"><span>'+(idx+1)+' / '+n+' 문제</span><span class="subj-credit">🤖 첨삭 '+gradeBal().toLocaleString()+' · 해설 '+explainBal().toLocaleString()+'</span></div><div class="track"><div class="bar" style="width:'+pct+'%"></div></div></div>'+
    '</div>'+
    '<div id="subjRunMount"></div>'+
    '<div class="mcq-foot" style="max-width:760px;margin:16px auto 40px">'+
      '<button class="mbtn mbtn-prev" '+(idx===0?'disabled':'')+' onclick="subjGo(-1)">◀ 이전</button>'+
      '<button class="mbtn mbtn-next" '+(idx>=n-1?'disabled':'')+' onclick="subjGo(1)">'+(idx>=n-1?'마지막 문제':'다음 ▶')+'</button>'+
    '</div>';
  var host=document.getElementById('subjRunMount');
  var exam={ id:cert, name:examName, questions:list };
  var opts=_subjExamOpts(cert); opts.host=host; opts.mountId='subjRunMount'; opts.replace=false;
  if(!(window.CLSubj && CLSubj.openOne)){   // 구버전 subjective.js(=openOne 없음) → 조용히 튕기지 말고 원인 표시
    host.innerHTML='<div style="margin:16px;padding:14px 16px;background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:10px;color:#A32D2D;font-weight:700;font-size:13.5px;line-height:1.7">⚠️ subjective.js 최신본이 필요합니다 (openOne 없음).<br>압축 푼 <b>subjective.js</b>를 올리고 <b>Ctrl+Shift+R</b>로 새로고침해 주세요.</div>';
    return;
  }
  var okOpen;
  try{ okOpen=CLSubj.openOne(host, exam, idx, opts); }
  catch(e){ console.error('subj openOne',e); host.innerHTML='<div style="margin:16px;padding:14px 16px;background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:10px;color:#A32D2D;font-weight:700;font-size:13px;line-height:1.7">문제를 여는 중 오류: '+mqEsc(String(e&&e.message||e))+'</div>'; return; }
  if(okOpen===false){ mqBackHome(); return; }   // 무료 한도 게이트(로그인/결제 안내는 canAccessSubjective가 띄움) → 목록으로
  window.scrollTo(0,0);
}
function buildCertRegistry(man){
  var exams=(man&&man.exams)||[];
  exams.forEach(function(ex){
    var id=ex&&ex.id; if(!id || _certRegBuilt[id]) return;
    var isNew = !MCQ_EXAMS[id] && ALL_CERTS.indexOf(id)<0;   // 기존 7개면 isNew=false → 손 안 댐
    if(!isNew){ _certRegBuilt[id]=1; return; }
    var type=ex.type||'mcq';
    if(typeof CERT_LABELS!=='undefined' && !CERT_LABELS[id]) CERT_LABELS[id]=ex.label||ex.name||id;
    if(typeof PASS_RULE!=='undefined' && ex.pass && !PASS_RULE[id]) PASS_RULE[id]=ex.pass;       // 없으면 _default
    if(typeof PLAN_SETS!=='undefined' && ex.plan && !PLAN_SETS[id]) PLAN_SETS[id]=ex.plan;        // 없으면 _default
    if(type==='subjective'){
      if(!SUBJ_EXAMS[id]) SUBJ_EXAMS[id]={name:ex.name||id, subjects:(ex.subjects||[]).slice(), questions:[]};   // 주관식 컨테이너(applyBank가 채움) + 과목 골격(빈 과목도 '준비 중' 노출)
      else if(!SUBJ_EXAMS[id].subjects) SUBJ_EXAMS[id].subjects=(ex.subjects||[]).slice();
    } else if(type!=='flashcard'){
      if(!MCQ_EXAMS[id]){
        var qb={}; (ex.subjects||[]).forEach(function(s){ if(s&&s.code) qb[s.code]={name:s.name||s.code, sets:[]}; });
        MCQ_EXAMS[id]={name:ex.name||id, qb:qb};
        if(typeof MCQ_CERTS!=='undefined' && MCQ_CERTS.indexOf(id)<0) MCQ_CERTS.push(id);   // isMcqCert 갱신
      }
    }
    if(ALL_CERTS.indexOf(id)<0) ALL_CERTS.push(id);
    try{ if(typeof userEnt!=='undefined' && userEnt && !userEnt[id]) userEnt[id]={plan:'GUEST',trialCount:0,expireAt:null,planDays:null}; }catch(_){}
    try{ if(typeof guestCounts!=='undefined' && guestCounts && guestCounts[id]==null) guestCounts[id]=0; }catch(_){}
    _addCertCard(ex, type);
    _certRegBuilt[id]=1;
  });
}
function _addCertCard(ex, type){
  try{
    var wrap=document.querySelector('.cert-cards'); if(!wrap) return;
    var id=ex.id; if(document.getElementById('certCard-'+id)) return;
    var subN=(ex.subjects||[]).length;
    var hasData=subN>0;
    var icon=_certIcon(id)||ex.icon||(type==='flashcard'?'🃏':(type==='subjective'?'📝':'📘'));
    var desc=ex.desc||((type==='flashcard'?'플래시카드':(type==='subjective'?'주관식 서술형':'객관식 모의고사'))+(subN?(' · '+subN+'과목'):''));
    var tagTxt=hasData?(type==='flashcard'?'플래시카드':(type==='subjective'?'주관식':'모의고사')):'준비 중';
    var tagCls=hasData?'tag':'tag soon';
    var card=document.createElement('div');
    card.className='cert-card'; card.id='certCard-'+id;
    card.setAttribute('onclick', "enterCert('"+id+"')");
    card.innerHTML='<div class="cert-ic">'+icon+'</div>'
      +'<div class="cert-meta"><div class="nm">'+mqEsc(ex.name||id)+'</div><div class="ds">'+mqEsc(desc)+'</div>'
      +'<span class="'+tagCls+'" id="certTag-'+id+'">'+tagTxt+'</span></div>'
      +'<div class="cert-go">›</div>';
    wrap.appendChild(card);
  }catch(e){}
}
// ===== 시험 D-day 자동정렬 (examSchedules = 이메일 D-day 데이터 재사용) =====
var _examDateMs = null;   // {cert: ms} 다음 시험일(미래 회차 우선)
async function loadExamSchedules(_retry){
  if(!firebaseReady || !db){ if((_retry||0)<5){ setTimeout(function(){ loadExamSchedules((_retry||0)+1); }, 500); } return; }
  try{ if(firebase && firebase.appCheck) await firebase.appCheck().getToken(); }catch(_){}   // 모바일: App Check 토큰 발급 기다린 뒤 읽기(토큰 늦으면 permission denied)
  try{
    var snap = await db.collection('examSchedules').get();
    var map = {}, now = Date.now();
    var toMs = function(v){ if(!v) return null; if(v.toDate) return v.toDate().getTime(); if(v.seconds) return v.seconds*1000; var t=new Date(v).getTime(); return isNaN(t)?null:t; };
    snap.forEach(function(d){
      var sx = d.data() || {}, best = null;
      if(Array.isArray(sx.upcoming)) sx.upcoming.forEach(function(u){ var m=toMs(u&&u.date); if(m!=null && m>=now && (best==null||m<best)) best=m; });
      if(best==null){ var nm=toMs(sx.nextExamDate); if(nm!=null) best=nm; }
      if(best!=null) map[d.id]=best;
    });
    _examDateMs = map; window._exErr=null;
    // 즉시 + 지연 재정렬(모바일: 카드 동적추가/늦은 렌더와의 경합 방지)
    if(typeof reorderCertCards==='function'){ reorderCertCards(); setTimeout(reorderCertCards,400); setTimeout(reorderCertCards,1200); setTimeout(reorderCertCards,2500); }
    try{ if(/[?&]dbg=1/.test(location.search) && typeof clToast==='function') clToast('\uC2DC\uD5D8\uC77C '+Object.keys(map).length+'\uAC1C \uB85C\uB4DC\u00B7\uC815\uB82C'); }catch(_){}
  }catch(e){ window._exErr=(e&&e.message)||String(e); try{ if(/[?&]dbg=1/.test(location.search) && typeof clToast==='function') clToast('\uC2DC\uD5D8\uC77C \uC77D\uAE30 \uC2E4\uD328: '+window._exErr); }catch(_){} if((_retry||0)<5){ setTimeout(function(){ loadExamSchedules((_retry||0)+1); }, 1200); } }
}
function reorderCertCards(){
  try{
    var wrap=document.querySelector('.cert-cards'); if(!wrap) return;
    var cards=[].slice.call(wrap.querySelectorAll('.cert-card')); if(!cards.length) return;
    var now=Date.now(), dm=_examDateMs||{};
    function certOf(card){ var id=(card.id||'').replace('certCard-',''); if(id) return id; var m=(card.getAttribute('onclick')||'').match(/enterCert\('([^']+)'\)/); return m?m[1]:''; }
    function key(card){ var ms=dm[certOf(card)]; return (ms!=null && ms>=now) ? ms : Infinity; }   // 미래=가까운순, 없음/지남=맨밑
    cards.map(function(card,i){ return {card:card, k:key(card), i:i}; })
         .sort(function(a,b){ return a.k!==b.k ? a.k-b.k : a.i-b.i; })   // 안정 정렬(동순위 기존순서)
         .forEach(function(o){ wrap.appendChild(o.card); });
    var _sp=document.getElementById('certCard-sport2'), _bb=document.getElementById('certCard-bodybuilding');
    if(_sp&&_bb&&_sp.parentNode){ _sp.parentNode.insertBefore(_bb, _sp.nextSibling); }   // 구술을 필기(sport2) 바로 밑으로
  }catch(e){}
}
// QB 캐시 신선도: 같은 버전 재업로드도 이 시간 안에 자동 반영(버전 미범프 안전망). 0이면 TTL 무시(영구 캐시).
const QB_TTL_MS=6*60*60*1000;   // 6시간
// ===== 큰 문제은행 전용 로더: SDK(WebChannel) 대신 일반 fetch로 Firestore REST 호출 =====
// 이유: Safari 26.4에서 Firestore SDK의 큰 문서 읽기가 비정상적으로 느림(복불복). 일반 fetch는 영향 없음.
function _decodeFsValue(v){
  if(v==null) return null;
  if('stringValue' in v) return v.stringValue;
  if('integerValue' in v) return parseInt(v.integerValue,10);
  if('doubleValue' in v) return (typeof v.doubleValue==='number')?v.doubleValue:parseFloat(v.doubleValue);
  if('booleanValue' in v) return v.booleanValue;
  if('nullValue' in v) return null;
  if('timestampValue' in v) return v.timestampValue;
  if('mapValue' in v) return _decodeFsFields((v.mapValue&&v.mapValue.fields)||{});
  if('arrayValue' in v){ var arr=(v.arrayValue&&v.arrayValue.values)||[]; return arr.map(_decodeFsValue); }
  return null;
}
function _decodeFsFields(fields){ var o={}; for(var k in fields){ o[k]=_decodeFsValue(fields[k]); } return o; }
async function _bankGet(docId){               // REST 우선, 실패 시 SDK 폴백(안전망)
  var _dbg=/[?&]dbg=1/.test(location.search), _t0=Date.now();
  var d=await _bankRestGet(docId);
  if(d){ if(_dbg && typeof clToast==='function') clToast('REST OK '+((Date.now()-_t0)/1000).toFixed(1)+'s'); return d; }
  if(_dbg && typeof clToast==='function') clToast('REST 실패\u2192SDK 폴백');
  try{ var sn=await db.collection('banks').doc(docId).get(); return sn.exists? sn.data() : null; }catch(_){ return null; }
}
async function _bankRestGet(docId){
  try{
    var url='https://firestore.googleapis.com/v1/projects/'+firebaseConfig.projectId+'/databases/(default)/documents/banks/'+encodeURIComponent(docId)+'?key='+firebaseConfig.apiKey;
    var headers={};
    try{ if(firebase && firebase.appCheck){ var t=await firebase.appCheck().getToken(); if(t && t.token) headers['X-Firebase-AppCheck']=t.token; } }catch(_){}
    var res=await fetch(url,{headers:headers});
    if(!res.ok) return null;                 // 404=문서없음 등
    var j=await res.json();
    if(!j || !j.fields) return null;
    return _decodeFsFields(j.fields);
  }catch(e){ return null; }
}
// 과목 1개 로드(캐시→Firestore REST→샤드합치기) 후 applyBank
async function loadOneSubject(ex, sub){
  const ver=(ex.versions&&ex.versions[sub.code])||1;
  const ck='qb:'+ex.id+':'+sub.code+':v'+ver;
  let doc=null;
  try{
    const c=localStorage.getItem(ck);
    if(c){
      const w=JSON.parse(c);
      if(w && w.__qbts){                                       // 신형 캐시 {__qbts, d}
        if(!QB_TTL_MS || (Date.now()-w.__qbts)<=QB_TTL_MS) doc=w.d;   // TTL 이내만 사용
      }
      // 구형(타임스탬프 없는 raw)·TTL초과 → doc=null 유지 → 아래서 1회 갱신·신형 재기록
    }
  }catch(e){}
  if(!doc){
    const meta=await _bankGet(ex.id+'__'+sub.code);   // 일반 fetch 우선, 실패 시 SDK 폴백
    if(meta){
      if(Array.isArray(meta.shards) && meta.shards.length){
        // 회차 샤딩(Option B): banks/{cert}__{sub}__{set} 병렬 로드 후 합치기
        const parts=await Promise.all(meta.shards.map(function(sid){
          return _bankGet(ex.id+'__'+sub.code+'__'+sid);
        }));
        const qs=[];
        parts.forEach(function(pd){ if(pd && Array.isArray(pd.questions)) qs.push.apply(qs,pd.questions); });
        if(!qs.length && Array.isArray(meta.questions)) doc=meta;   // 안전: 샤드 비면 메타 폴백
        else doc={ version:meta.version, cert:meta.cert, subject:meta.subject, name:meta.name, questions:qs };
      } else {
        doc=meta;   // 기존 단일 문서(하위호환 폴백)
      }
      try{
        // 같은 과목의 옛 버전 캐시 키 청소(잔재 누적·용량초과 방지)
        const pfx='qb:'+ex.id+':'+sub.code+':v';
        for(let i=localStorage.length-1;i>=0;i--){ const k=localStorage.key(i); if(k && k!==ck && k.indexOf(pfx)===0) localStorage.removeItem(k); }
        localStorage.setItem(ck,JSON.stringify({__qbts:Date.now(), d:doc}));
      }catch(e){}
    }
  }
  if(doc) applyBank(ex,sub,doc);
}
// 시험 1개의 과목들을 병렬 로드 (idempotent)
var loadingExams={};   // 진행 중인 로드 Promise(동시호출 중복 방지)
var _mastersPromise=null;
// 공유 마스터 4종(개념/표/그래프/암기) 단일 로드 promise. 받았으면 즉시 통과(각 로더가 promise 가드).
function ensureMasters(){
  if(!_mastersPromise) _mastersPromise=Promise.all([loadMnemonics(),loadTables(),loadGraphs(),loadConcepts(),loadInteractives()]);
  return _mastersPromise;
}
/* ===== [임시] 로딩 성능 측정: ?perf=1 접속 시에만 동작 (측정 후 제거) ===== */
var PERF=false; try{ if(/[?&]perf=1/.test(location.search)){ PERF=true; localStorage.setItem('certlab_perf','1'); } else if(localStorage.getItem('certlab_perf')==='1'){ PERF=true; } }catch(e){}
function _perfShow(msg){ try{ var b=document.getElementById('_perfBox'); if(!b){ b=document.createElement('div'); b.id='_perfBox'; b.style.cssText='position:fixed;left:8px;right:8px;bottom:70px;z-index:100001;background:#0C447C;color:#fff;padding:10px 12px;border-radius:10px;font-size:12px;font-weight:700;line-height:1.6;box-shadow:0 4px 16px rgba(0,0,0,.3);white-space:pre-wrap'; b.onclick=function(){ b.remove(); }; document.body.appendChild(b); b._lines=[]; } b._lines.unshift('⏱ '+msg); if(b._lines.length>8) b._lines.length=8; b.textContent=b._lines.join('\n')+'\n(탭하면 닫힘)'; }catch(e){} }
async function loadExam(examId){
  if(loadedExams[examId]) return;
  if(loadingExams[examId]) return loadingExams[examId];   // 이미 로딩 중이면 같은 작업 공유
  loadingExams[examId]=(async()=>{
    await loadManifest();
    // 마스터 4종(개념/표/그래프/암기)은 문제 목록 표시엔 불필요 → 백그라운드 로드(해설·개념 렌더 때만 필요)
    var _mp=ensureMasters();
    const ex=(MANIFEST.exams||[]).find(e=>e.id===examId);
    if(!ex){ loadedExams[examId]=true; return; }
    var _t0=PERF?((window.performance&&performance.now)?performance.now():Date.now()):0;
    await Promise.all((ex.subjects||[]).map(sub=>loadOneSubject(ex,sub)));   // 문제 뱅크 먼저 → 목록 즉시 표시
    loadedExams[examId]=true;
    rebuildQid();
    if(PERF){ try{ var _t1=(window.performance&&performance.now)?performance.now():Date.now(); var _ms=_t1-_t0; var _subs=(ex.subjects||[]).length; var _bytes=0,_qn=0; var _qb=qbOf(examId)||{}; try{ _bytes=JSON.stringify(_qb).length; }catch(e){} Object.keys(_qb).forEach(function(k){ (_qb[k].sets||[]).forEach(function(st){ _qn+=(st.questions||[]).length; }); }); var _ac=(typeof window.__acFail!=='undefined')?('AppCheck실패:'+window.__acFail):(typeof window.__acMs!=='undefined')?('AppCheck '+(window.__acMs/1000).toFixed(1)+'초'):'AppCheck ?'; var _line=certLabel(examId)+': '+(_bytes/1048576).toFixed(2)+'MB / '+(_ms/1000).toFixed(1)+'초 ('+_subs+'과목 '+_qn+'문항) · '+_ac; console.log('[PERF] '+_line); _perfShow(_line); }catch(e){} }
    // 마스터 로드 완료 시 1회 재렌더(선행학습 버튼·cpt/tbl/grp/mn 링크 채움)
    _mp.then(function(){ try{
      if(typeof renderMCQ!=='function' || typeof mqCert==='undefined' || mqCert!==examId || typeof mqScreen==='undefined') return;
      if(mqScreen==='home'){ renderMCQ(); return; }
      // 풀이화면: 해설을 이미 펼쳤거나 선행학습 모드일 때만 재렌더(마스터 링크 필요) — 문제만 읽는 중엔 깜빡임 방지. 위치·응답은 상태에서 복원됨
      if(mqScreen==='exam' && ((typeof mqShow!=='undefined' && Object.keys(mqShow).length>0) || (typeof mqConcept!=='undefined' && mqConcept))){ renderMCQ(); }
    }catch(e){} }).catch(function(){});
    // 적응형 데이터(map/diag/variants/변형풀) — 비차단·실패무시. 미준비 과목은 빈 룩업(Elo훅이 스킵).
    if(typeof loadAdaptiveSubject==='function'){
      Promise.all((ex.subjects||[]).map(function(sub){ try{ return loadAdaptiveSubject(examId, sub.code).catch(function(){return null;}); }catch(e){ return null; } }))
        .then(function(){ try{ if(typeof renderMCQ==='function' && typeof mqCert!=='undefined' && mqCert===examId && typeof mqScreen!=='undefined' && mqScreen==='home') renderMCQ(); }catch(e){} });
    }
  })();
  try{ await loadingExams[examId]; } finally { delete loadingExams[examId]; }
}
// 전체 로드(폴백·관리용; 진입 시엔 안 씀)
async function loadAllBanks(){
  await loadManifest();
  for(const ex of (MANIFEST.exams||[])) await loadExam(ex.id);
  rebuildQid();
}
function applyBank(ex,sub,doc){
  const qs=doc.questions||[];
  if(ex.type==='subjective'){
    const se=SUBJ_EXAMS[ex.id]; if(!se) return;
    const seen=new Set(se.questions.map(x=>x.id));
    qs.forEach(q=>{ if(!seen.has(q.id)){ seen.add(q.id); se.questions.push(Object.assign({_subj:sub.name||sub.code}, q)); } });
    return;
  }
  if(ex.type==='flashcard'){
    const _seen=new Set(D.map(c=>c.id));   // 이미 적재된 id — 중복 push 방지
    qs.forEach(c=>{ if(_seen.has(c.id)) return; _seen.add(c.id); const dispS=(c.cat&&BB_CAT[c.cat])?BB_CAT[c.cat]:sub.name; D.push({id:c.id, s:dispS, q:c.q,a:c.a,img:c.img||null,learn:c.learn||null,mn:c.mn||null,star:c.star||1,since:c.since||null,newType:c.newType||false,w:false,fav:false}); });
  } else {
    const qb=MCQ_EXAMS[ex.id]&&MCQ_EXAMS[ex.id].qb;
    if(!qb||!qb[sub.code]) return;
    const byset={},order=[];
    qs.forEach(q=>{ const lab=q.set||'기출'; if(!byset[lab]){byset[lab]=[];order.push(lab);} const it={id:q.id,q:q.q,opts:q.opts,ans:q.ans,star:q.star,time:q.time,exp:q.exp}; if(q.img)it.img=q.img; if(q.optImg)it.optImg=q.optImg; if(q.mn)it.mn=q.mn; byset[lab].push(it); });
    qb[sub.code].sets=order.map(lab=>({label:lab,questions:byset[lab]}));
    // 최신 회차/연도가 위로 — 라벨 내 가장 큰 숫자 기준 내림차순
    const setKey=lab=>{ const m=String(lab).match(/\d+/g); return m?Math.max.apply(null,m.map(Number)):-1; };
    qb[sub.code].sets.sort((a,b)=>setKey(b.label)-setKey(a.label));
  }
}
function showDataError(err){
  console.error('문제 데이터 로드 실패',err);
  var b=document.createElement('div');
  b.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#b00020;color:#fff;padding:10px;text-align:center;z-index:99999;font-size:14px';
  b.textContent='문제 데이터를 불러오지 못했습니다. 네트워크/Firestore 설정을 확인해 주세요.';
  document.body.appendChild(b);
}
showHome();

/* ===== 폰 백버튼: 앱 안에서 단계적으로 뒤로 (실수 종료 방지) ===== */
var clLastBack=0;
function clOpenOverlay(){
  var ids=['conceptOfferPopup','reportSheet','csSheet','planPopup','refundPopup','loginPopup','inappPopup','milestoneBox','completeOv','userDropdown'];
  for(var i=0;i<ids.length;i++){ var el=document.getElementById(ids[i]); if(el && !el.classList.contains('hidden')) return el; }
  return null;
}
function clToast(msg){
  var t=document.getElementById('clToast');
  if(!t){ t=document.createElement('div'); t.id='clToast'; t.style.cssText='position:fixed;left:50%;bottom:66px;transform:translateX(-50%);background:rgba(20,20,24,.92);color:#fff;padding:10px 16px;border-radius:999px;font-size:13px;font-weight:700;z-index:100000;opacity:0;transition:opacity .2s;pointer-events:none;white-space:nowrap'; document.body.appendChild(t); }
  t.textContent=msg; t.style.opacity='1';
  clearTimeout(t._h); t._h=setTimeout(function(){ t.style.opacity='0'; },1700);
}
// 글/댓글 작성 후 서버(Cloud Function) 적립분을 폴링해 +NP 토스트 + 잔액 캐시 갱신
function clHandleBack(){
  var ov=clOpenOverlay();
  if(ov){ ov.classList.add('hidden'); return true; }
  if(typeof activeCert!=='undefined' && activeCert){
    if(typeof isMcqCert==='function' && isMcqCert(activeCert) && typeof mqScreen!=='undefined'){
      if(mqInReview){ if(typeof mqBackToResult==='function') mqBackToResult(); return true; }
      if(mqScreen==='result'){ if(typeof mqBackHome==='function') mqBackHome(); return true; }
      if(mqScreen==='luhist'){ if(typeof luHistBack==='function'){ luHistBack(); } else if(typeof mqBackHome==='function'){ mqBackHome(); } return true; }
      if(mqScreen==='lusummary'){ if(typeof mqBackHome==='function') mqBackHome(); return true; }
      if(mqScreen==='exam'){ if(typeof mqBackHome==='function') mqBackHome(); return true; }
      if(mqScreen==='subjexam'){ if(typeof mqBackHome==='function') mqBackHome(); return true; }
      if(mqScreen==='home'){ showHome(); return true; }
    }
    showHome(); return true;   // 플래시카드 등 기타 과목 → 메인 홈
  }
  return false;   // 메인 홈 → 종료 단계
}
(function(){ try{
  history.replaceState({cl:'root'},'');
  history.pushState({cl:'app'},'');
  window.addEventListener('popstate', function(){
    if(clHandleBack()){
      history.pushState({cl:'app'},'');                 // 재무장: 앱 안에 머무름
    } else {
      var now=Date.now();
      if(now-clLastBack<2000){ history.back(); }         // 2초 내 두 번째 → 종료
      else { clLastBack=now; clToast('한 번 더 누르면 종료됩니다'); history.pushState({cl:'app'},''); }
    }
  });
}catch(_){ } })();

function refreshCertCards(){
  ['realestate1','realestate2','koreanhistory','housing','housing2'].forEach(cert=>{
    const tag=document.getElementById('certTag-'+cert); if(!tag) return;
    // manifest에 이 시험이 과목과 함께 있으면 데이터 있음(lazy 로드 전이라도). 폴백: 로드된 문항수.
    let has=false;
    try{ const ex=MANIFEST&&(MANIFEST.exams||[]).find(e=>e.id===cert); has=!!(ex&&ex.subjects&&ex.subjects.length); }catch(e){}
    if(!has && typeof certQuestionCount==='function') has=certQuestionCount(cert)>0;
    if(has){ tag.textContent='모의고사'; tag.classList.remove('soon'); }
    else { tag.textContent='준비 중'; tag.classList.add('soon'); }
  });
}
loadManifest().then(async ()=>{
  if(typeof refreshCertCards==='function') refreshCertCards();   // manifest 기반 — 로드 전이라도 정상 표시
  // lazy: 진입 시 전 과목 안 받고 '첫 시험 하나'만 — 이어풀기 대상 → 마지막 본 시험 → 없으면 안 받음
  let firstExam=null;
  try{ const a=JSON.parse(localStorage.getItem('certlab_mcq_active')||'null'); if(a&&a.cert) firstExam=a.cert; }catch(_){}
  if(!firstExam && typeof getLastCert==='function') firstExam=getLastCert();
  if(firstExam && MANIFEST && (MANIFEST.exams||[]).some(e=>e.id===firstExam)){
    try{ await loadExam(firstExam); }catch(e){ console.error('첫 시험 로드 실패',e); }
  }
  rebuildQid();
  // 비동기 로딩 전에 빈 D로 굳은 카드 스냅샷을 실데이터로 재동기화
  if(typeof cards!=='undefined'){ cards=[...D]; filtered=[...cards]; current=0; }
  if(typeof activeCert!=='undefined' && activeCert==='bodybuilding' && typeof shuffleCards==='function' && cards.length){ shuffleCards(); current=0; }   // 로드 완료 시 생체면 새 순서
  if(typeof currentUser!=='undefined' && !currentUser && typeof srLoadLocal==='function') srLoadLocal();
  if(typeof refresh==='function') refresh();
  if(typeof mqOXLoad==='function') mqOXLoad();   // 저장된 O/X 복원(새로고침·오답노트용)
  var _resumed=false; try{ if(typeof mqAutoResume==='function') _resumed=mqAutoResume(); }catch(_){}
  if(!_resumed && typeof renderMCQ==='function' && typeof activeCert!=='undefined' && activeCert && isMcqCert(activeCert)) renderMCQ();
  // ?card= 딥링크 실행 (데이터 로드 완료 후 1회)
  if(typeof pendingLt!=='undefined' && pendingLt && typeof _ltEnterHooking==='function'){ var _lt2=pendingLt; pendingLt=null; pendingCard=null; pendingCardCert=null; setTimeout(function(){ try{ _ltEnterHooking(_lt2); }catch(_){} }, 200); }
  else if(typeof pendingCard!=='undefined' && pendingCard && typeof goToCard==='function'){ var _pc=pendingCard, _cc=(typeof pendingCardCert!=='undefined')?pendingCardCert:null; pendingCard=null; setTimeout(function(){ goToCard(_pc,_cc); }, 200); }
  // ?cert=appraiser 단독 딥링크 → 해당 과목으로 직행 (card 없을 때, D-day 메일 버튼 등)
  else if(typeof pendingCardCert!=='undefined' && pendingCardCert && typeof enterCert==='function'){ var _cc2=pendingCardCert; pendingCardCert=null; setTimeout(function(){ try{ enterCert(_cc2); window.scrollTo(0,0); }catch(_){} }, 200); }
  if(typeof cmLoadNoticeBar==='function') cmLoadNoticeBar();   // 공지 롤링바 — db·community.js 준비된 시점에 로드(첫 goHome이 db 전이라 비는 것 보강)
  if(typeof loadExamSchedules==='function') loadExamSchedules();   // 모든 렌더 후 시험일 정렬 재확인(모바일 경합 보강)
}).catch(showDataError);

/* ===== PWA: 홈 화면에 추가 (service worker 미사용 — 캐시 사고 방지) ===== */
(function(){
  // 캐시 안 하는 최소 SW 등록 → PWA 설치(beforeinstallprompt) 활성화. fetch를 네트워크로 직행시켜 옛 파일 캐시 사고 없음.
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').then(function(reg){ window._swReg=reg; }).catch(()=>{});
  }
})();
// 설치 신호 캡처 (있으면 원터치 설치에 사용)
let pwaPrompt=null;
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); pwaPrompt=e; });
window.addEventListener('appinstalled', ()=>{ pwaPrompt=null; });
// ===== 복습 푸시: 권한 배너 + FCM 토큰 (크롬·안드로이드 / iOS 제외) =====
var _PUSH_VAPID='BK9KllMfvIRa1XUAtvPfl9hYIz7wmcYphIp4_zlvZfbvbPMltpN8jciCwHbho5uxHQUEmX77jDFZDs6LUB_d4zk';
var _pushBannerShown=false, _pushSynced=false;
function _pushIsIOS(){ var ua=navigator.userAgent; var isAnd=/android/i.test(ua); return !isAnd && (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)); }
function _pushSnoozed(){ try{ return Date.now() < (+localStorage.getItem('certlab_push_snooze')||0); }catch(_){ return false; } }
function _pushSnooze(){ try{ localStorage.setItem('certlab_push_snooze', String(Date.now()+7*86400000)); }catch(_){} }
function _pushTick(){
  try{
    if(!_pushSynced && typeof currentUser!=='undefined' && currentUser){ _pushSynced=true; _pushSyncIfGranted(); }
    _pushMaybePrompt();
  }catch(_){}
}
function _pushMaybePrompt(){
  try{
    if(_pushBannerShown) return;
    if(typeof currentUser==='undefined' || !currentUser) return;          // 토큰 대상 uid 필요
    if(typeof totalSolve==='function' && totalSolve()<30) return;          // 누적 30문제(전 시험 통합)
    if(!('Notification' in window) || Notification.permission!=='default') return;
    if(_pushIsIOS() || _pushSnoozed()) return;
    var busy=['loginPopup','planPopup','inappPopup','guestFeatPopup','refundPopup','conceptOfferPopup'].some(function(id){ var e=document.getElementById(id); return e && !e.classList.contains('hidden'); });
    if(busy) return;
    _pushShowBanner();
  }catch(_){}
}
function _pushShowBanner(){
  if(document.getElementById('pushBannerWrap')) return;
  _pushBannerShown=true;
  if(!document.getElementById('pushBannerCss')){
    var st=document.createElement('style'); st.id='pushBannerCss';
    st.textContent='#pushBannerWrap{position:fixed;left:0;right:0;bottom:0;z-index:9998;display:flex;justify-content:center;padding:0 12px calc(14px + env(safe-area-inset-bottom,0px));pointer-events:none}'
      +'#pushBanner{pointer-events:auto;width:100%;max-width:440px;background:#fff;border-radius:18px;box-shadow:0 8px 30px rgba(31,41,55,.18);padding:16px 16px 14px;animation:pbUp .42s cubic-bezier(.22,1,.36,1)}'
      +'@keyframes pbUp{from{transform:translateY(130%);opacity:.3}to{transform:translateY(0);opacity:1}}'
      +'#pushBanner .pb-top{display:flex;gap:12px;align-items:flex-start}'
      +'#pushBanner .pb-ic{flex:0 0 44px;height:44px;border-radius:13px;background:linear-gradient(135deg,#EEF0FF,#E0E4FF);display:flex;align-items:center;justify-content:center;font-size:22px}'
      +'#pushBanner .pb-title{font-size:15px;font-weight:800;color:#1F2937;margin:1px 0 3px}'
      +'#pushBanner .pb-desc{font-size:12.5px;color:#6B7280;line-height:1.5}'
      +'#pushBanner .pb-x{flex:0 0 auto;border:none;background:none;color:#C3C9D4;font-size:20px;cursor:pointer;line-height:1;padding:0 2px}'
      +'#pushBanner .pb-btns{display:flex;gap:8px;margin-top:12px}'
      +'#pushBanner .pb-btns button{flex:1;border:none;border-radius:11px;padding:11px;font-size:13.5px;font-weight:800;cursor:pointer}'
      +'#pushBanner .pb-later{background:#F1F3F7;color:#8A93A3}'
      +'#pushBanner .pb-allow{background:linear-gradient(135deg,#5B6CF0,#4453D6);color:#fff}';
    document.head.appendChild(st);
  }
  var wrap=document.createElement('div'); wrap.id='pushBannerWrap';
  wrap.innerHTML='<div id="pushBanner"><div class="pb-top"><div class="pb-ic">🔁</div>'
    +'<div style="flex:1;min-width:0"><div class="pb-title">복습 알림 받을까요?</div>'
    +'<div class="pb-desc">복습할 문제가 쌓이면 알려드려요. 까먹기 전에 콕 짚어 챙겨드릴게요.</div></div>'
    +'<button class="pb-x" onclick="_pushDismiss()">×</button></div>'
    +'<div class="pb-btns"><button class="pb-later" onclick="_pushDismiss()">나중에</button>'
    +'<button class="pb-allow" onclick="_pushEnable()">알림 받기</button></div></div>';
  document.body.appendChild(wrap);
}
function _pushHideBanner(){
  var w=document.getElementById('pushBannerWrap'); if(!w) return;
  var b=document.getElementById('pushBanner');
  if(b){ b.style.transition='transform .3s ease,opacity .3s ease'; b.style.transform='translateY(140%)'; b.style.opacity='0'; }
  setTimeout(function(){ if(w&&w.parentNode) w.parentNode.removeChild(w); },320);
}
function _pushDismiss(){ _pushSnooze(); _pushHideBanner(); }
async function _pushEnable(){
  _pushHideBanner();
  try{
    var perm=await Notification.requestPermission();
    if(perm==='granted') await _pushRegisterToken();
  }catch(e){ console.error('push enable', e); }
}
async function _pushRegisterToken(){
  try{
    if(!firebase || !firebase.messaging) return;
    if(firebase.messaging.isSupported && !firebase.messaging.isSupported()) return;
    var reg = window._swReg || await navigator.serviceWorker.ready;
    var token = await firebase.messaging().getToken({ vapidKey:_PUSH_VAPID, serviceWorkerRegistration:reg });
    if(token && typeof currentUser!=='undefined' && currentUser && db){
      await db.collection('userData').doc(currentUser.uid).set({
        fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
        pushUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});
    }
  }catch(e){ console.error('fcm token', e); }
}
function _pushSyncIfGranted(){ try{ if(!_pushIsIOS() && ('Notification' in window) && Notification.permission==='granted') _pushRegisterToken(); }catch(_){} }

function pwaStandalone(){ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true; }
// 프로필 메뉴: 홈 화면에 추가
async function addToHome(e){
  if(e){ e.stopPropagation(); }
  const dd=document.getElementById('userDropdown'); if(dd) dd.classList.add('hidden');
  const ua=navigator.userAgent;
  const isAndroid=/android/i.test(ua);
  const isIOS=!isAndroid && (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints>1));
  if(pwaStandalone()){ alert('이미 앱으로 설치되어 실행 중이에요.'); return; }
  if(pwaPrompt){                       // 안드로이드·크롬·엣지: 원터치 설치
    pwaPrompt.prompt();
    try{ await pwaPrompt.userChoice; }catch(_){}
    pwaPrompt=null; return;
  }
  if(isIOS){                           // 아이폰: 사파리 공유 안내 (alert — 무조건 닫힘)
    alert('아이폰에서 홈 화면에 추가하기\n\n1) 사파리 하단 공유 버튼(↑)을 누르세요\n2) "홈 화면에 추가"를 선택하세요\n3) 오른쪽 위 "추가"를 누르면 끝!');
    return;
  }
  // 그 외(설치 신호 없음) — 기기별 안내
  if(isAndroid){
    alert('안드로이드에서 홈 화면에 추가하기\n\n1) 크롬 오른쪽 위 ⋮(점 3개) 메뉴를 누르세요\n2) "앱 설치" 또는 "홈 화면에 추가"를 선택하세요\n\n메뉴에 안 보이면 잠시 후 다시 시도해 주세요.');
    return;
  }
  alert('PC에서 홈 화면(바탕화면)에 추가하기\n\n크롬·엣지 주소창 오른쪽의 설치 아이콘(⊕ 또는 모니터 모양)을 누르세요. 안 보이면 잠시 후 다시 시도해 주세요.');
}

/* ===== 시험장용 인쇄 ===== */
let prScope='all',prSubsSel=null,prMnemonic=true,prFold=false;
function prCardsFor(s){let b=(cards||[]).slice();if(s==='wrong')b=b.filter(c=>srMastery(c)==='weak'||srMastery(c)==='learning');return b;}
function prSubjectsPresent(){let has={},out=[];(cards||[]).forEach(c=>{if(c&&c.s)has[c.s]=true;});(SUBJS||[]).forEach(s=>{if(has[s]){out.push(s);has[s]=false;}});(cards||[]).forEach(c=>{if(c&&c.s&&has[c.s]&&c.s!=='전체'){out.push(c.s);has[c.s]=false;}});return out;}
function prSelectedSubs(){let p=prSubjectsPresent();if(prSubsSel===null)return p.slice();return p.filter(s=>prSubsSel[s]);}
function prJsStr(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\'");}
function prMnHTML(c){let m=c.mn;if(!m)return '';let code=(typeof m==='string')?m:(m.code||'');let desc=(m&&typeof m==='object'&&m.desc)?m.desc:'';if(!code)return '';return '<div class="pa-mn"><span class="lab">암기</span>'+code+(desc?' — '+desc:'')+'</div>';}
function openPrintSheet(){prScope='all';prMnemonic=true;prFold=false;prSubsSel=null;renderPrintSheet();document.getElementById('printSheet').classList.remove('hidden');}
function closePrintSheet(){document.getElementById('printSheet').classList.add('hidden');}
function prSetScope(s){prScope=s;renderPrintSheet();}
function prToggleSub(s){let p=prSubjectsPresent();if(prSubsSel===null){prSubsSel={};p.forEach(x=>{prSubsSel[x]=true;});}prSubsSel[s]=!prSubsSel[s];renderPrintSheet();}
function prToggleOpt(w){if(w==='mn')prMnemonic=!prMnemonic;else if(w==='fold')prFold=!prFold;renderPrintSheet();}
function renderPrintSheet(){let present=prSubjectsPresent();let allCnt=prCardsFor('all').length,wrongCnt=prCardsFor('wrong').length;let subs=prSelectedSubs();let sel=prCardsFor(prScope).filter(c=>subs.indexOf(c.s)>=0);let chips=present.map(s=>{let on=(prSubsSel===null)||prSubsSel[s];return '<span class="pr-chip'+(on?' on':'')+'" onclick="prToggleSub(\''+prJsStr(s)+'\')">' +s+'</span>';}).join('');let html='<h3>🖨️ 시험장용 인쇄</h3><p class="pr-desc">폰 반납 대비, 종이로 들고 갈 자료를 만듭니다.</p>'+'<div class="pr-lbl">범위</div><div class="pr-seg">'+'<button class="'+(prScope==='all'?'on':'')+'" onclick="prSetScope(\'all\')">전체 과목<span class="pr-cnt">'+allCnt+'문항</span></button>'+'<button class="'+(prScope==='wrong'?'on':'')+'" onclick="prSetScope(\'wrong\')">오답 복습<span class="pr-cnt">'+wrongCnt+'문항</span></button></div>'+'<div class="pr-lbl">과목 (탭하여 켜고 끄기)</div><div class="pr-chips">'+chips+'</div>'+'<div class="pr-lbl">옵션</div><div class="pr-opts">'+'<label class="pr-opt"><input type="checkbox" '+(prMnemonic?'checked':'')+' onchange="prToggleOpt(\'mn\')"> 암기코드 포함</label>'+'<label class="pr-opt"><input type="checkbox" '+(prFold?'checked':'')+' onchange="prToggleOpt(\'fold\')"> 접지형(질문↔답, 접어서 셀프테스트)</label></div>';if(sel.length===0){html+='<div class="pr-empty">'+(prScope==='wrong'?'오답(미숙·학습중) 카드가 아직 없습니다. 카드를 풀어 복습 이력이 쌓이면 채워집니다.':'선택한 과목에 카드가 없습니다.')+'</div>'+'<button class="pr-go" disabled style="opacity:.5">인쇄할 카드 없음</button>';}else{html+='<button class="pr-go" onclick="doPrint()">인쇄 / PDF로 저장 ('+sel.length+'문항)</button>';}html+='<button class="pr-cancel" onclick="closePrintSheet()">취소</button>';document.getElementById('printSheetBody').innerHTML=html;}
function doPrint(){let subs=prSelectedSubs();let list=prCardsFor(prScope).filter(c=>subs.indexOf(c.s)>=0);if(!list.length)return;let groups={};subs.forEach(s=>{groups[s]=[];});list.forEach(c=>{if(!groups[c.s])groups[c.s]=[];groups[c.s].push(c);});let scopeLbl=prScope==='wrong'?'오답 복습':'전체 과목';let n=new Date();let ds=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');let body='<div class="pa-h"><span class="t">스포츠지도사 실기·구술 · '+scopeLbl+'</span><span class="m">CertLab · '+ds+'</span></div>';if(prFold)body+='<div class="pa-foldnote">✂ 가운데 점선을 따라 접으면 오른쪽 답이 가려집니다 — 질문을 보고 답해 본 뒤 펴서 확인하세요.</div>';subs.forEach(s=>{let g=groups[s];if(!g||!g.length)return;body+='<div class="pa-sub">'+s+' ('+g.length+')</div><div class="pa-cols">';g.forEach((c,i)=>{let mn=prMnemonic?prMnHTML(c):'';if(prFold){body+='<div class="pa-qa"><div class="pa-qcell"><span class="no">'+(i+1)+'.</span> '+(c.q||'')+'</div>'+'<div class="pa-acell"><div class="pa-a">'+(c.a||'')+'</div>'+mn+'</div></div>';}else{body+='<div class="pa-qa"><p class="pa-q"><span class="no">'+(i+1)+'.</span>'+(c.q||'')+'</p><p class="pa-a">'+(c.a||'')+'</p>'+mn+'</div>';}});body+='</div>';});let pa=document.getElementById('printArea');if(!pa){pa=document.createElement('div');pa.id='printArea';document.body.appendChild(pa);}pa.className=prFold?'pa-fold':'';pa.innerHTML=body;closePrintSheet();setTimeout(()=>{window.print();},60);}


/* ===== 커뮤니티 게시판 (2단계: 목록) ===== */
window._cmUserDoc = window._cmUserDoc || null;
function cmIsAdmin(){ return !!((window._cmUserDoc && window._cmUserDoc.isAdmin) || (currentUser && currentUser.email==='certlab.team@gmail.com')); }
function cmEsc(t){ return (t==null?'':String(t)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function cmTimeAgo(ts){
  if(!ts) return '';
  var d = ts && ts.toDate ? ts.toDate() : new Date(ts);
  var diff = (Date.now()-d.getTime())/1000;
  if(diff<60) return '방금';
  if(diff<3600) return Math.floor(diff/60)+'분 전';
  if(diff<86400) return Math.floor(diff/3600)+'시간 전';
  if(diff<2592000) return Math.floor(diff/86400)+'일 전';
  return (d.getMonth()+1)+'월 '+d.getDate()+'일';
}
async function cmLoadUserDoc(){
  if(!currentUser||!firebaseReady||!db){ window._cmUserDoc=null; return; }
  try{ var d=await db.collection('users').doc(currentUser.uid).get(); window._cmUserDoc=d.exists?d.data():{}; }catch(_){ window._cmUserDoc={}; }
}
function cmGetNick(){
  if(window._cmUserDoc && window._cmUserDoc.boardNick) return window._cmUserDoc.boardNick;
  if(currentUser && currentUser.displayName) return currentUser.displayName;
  return '익명';
}
function clRouteFromHash(){
  var h=location.hash||''; var m=h.match(/^#post\/(.+)$/);
  if(!m||!m[1]) return false;
  var id=decodeURIComponent(m[1]);
  if(typeof openCommunity==='function') openCommunity();
  setTimeout(function(){ if(typeof cmOpenDetail==='function') cmOpenDetail(id); }, 220);
  return true;
}
(function(){
  function tryRoute(n){
    if(typeof firebaseReady!=='undefined' && firebaseReady && typeof openCommunity==='function'){ clRouteFromHash(); return; }
    if(n>0) setTimeout(function(){ tryRoute(n-1); }, 300);
  }
  window.addEventListener('load', function(){ if((location.hash||'').indexOf('#post/')===0) tryRoute(20); });
  window.addEventListener('hashchange', function(){ if((location.hash||'').indexOf('#post/')===0) clRouteFromHash(); });
})();

// ===== [2026-07-20] 시험 딥링크: /#{certId} → 해당 시험 바로 진입 (광고·안내용 고정 URL) =====
// 예: /#appraiser(감평 1차), /#appraiser2(감평 2차), /#realestate1 … 카드가 있는 시험만(certCard-{id}) 유효.
// #post/·#account-delete 등 기존 해시 라우팅은 건드리지 않는다. 진입 후 해시는 지워 백버튼 트랩과 충돌 방지.
(function(){
  function certWanted(){
    var h=location.hash||'';
    if(!h || h==='#' || h.indexOf('#post/')===0 || h==='#account-delete') return null;
    try{ return decodeURIComponent(h.slice(1)); }catch(_){ return null; }
  }
  function go(id){ enterCert(id); }
  function tryCert(n){
    var id=certWanted(); if(!id) return;
    var ready = typeof firebaseReady!=='undefined' && firebaseReady && typeof enterCert==='function';
    if(ready && document.getElementById('certCard-'+id)){ go(id); return; }
    if(n>0) setTimeout(function(){ tryCert(n-1); }, 300);   // 매니페스트 카드·firebase 준비 대기 (최대 6초)
  }
  window.addEventListener('load', function(){ tryCert(20); });
  window.addEventListener('hashchange', function(){ tryCert(6); });
})();


/* 커뮤니티 이미지 업로드 (5단계) */


/* 마이페이지 (6단계) */
function cmHistDate(at){ if(!at) return ''; var d=new Date(at); return (d.getMonth()+1)+'/'+d.getDate(); }
function mpHistLabel(t){
  var m={signup:'가입 축하', ref_signup:'추천 가입 보상', ref_paid:'추천 결제 보상', ref_join:'추천 가입 보너스',
    board_post:'글 작성', board_comment:'댓글 작성', board_post_cancel:'글 삭제 회수',
    board_comment_cancel:'댓글 삭제 회수', purchase:'이용권 결제 사용', use:'이용권 결제 사용', event:'이벤트 보너스', event_refund:'합격 후기 환급'};
  return m[t]||t||'포인트 변동';
}
async function openMyPage(){
  if(!currentUser){ alert('로그인이 필요해요.'); if(typeof showLoginPopup==='function') showLoginPopup(); return; }
  var dd=document.getElementById('userDropdown'); if(dd) dd.classList.add('hidden');
  if(typeof mqStopTimer==='function') mqStopTimer();
  if(typeof mqStopOverTimer==='function') mqStopOverTimer();
  ['homeView','bodybuildingView','mcqView','communityView'].forEach(function(id){var el=document.getElementById(id); if(el) el.classList.add('hidden');});
  document.getElementById('myPageView').classList.remove('hidden');
  var _ft=document.querySelector('.footer'); if(_ft) _ft.classList.add('hidden');
  var cs=document.getElementById('certSwitch'); if(cs) cs.classList.remove('hidden');
  await cmLoadUserDoc();
  mpRenderHome();
}
function mpRenderHome(){
  var box=document.getElementById('mpBody'); if(!box) return;
  var nick=cmGetNick(); var email=(currentUser&&currentUser.email)||'';
  var _lots=(window._cmUserDoc && Array.isArray(window._cmUserDoc.mileageLots))?window._cmUserDoc.mileageLots:myMileageLots;
  var bal=(typeof mileageBalance==='function')?mileageBalance(_lots):0;
  var av=(currentUser&&currentUser.photoURL)?'<img class="mp-av" src="'+cmEsc(currentUser.photoURL)+'" alt="">':'<div class="mp-av"></div>';
  box.innerHTML=
    '<div class="mp-prof">'+av+'<div><div class="mp-nick">'+cmEsc(nick)+'</div><div class="mp-email">'+cmEsc(email)+'</div></div></div>'
    +'<div class="pt-card"><div class="pt-top"><span class="l">💰 보유 포인트</span><span class="pt-detail" onclick="mpShowHistory()">상세내역 \u203a</span></div>'
    +'<div class="pt-v">'+bal.toLocaleString()+' P</div><div class="pt-sub">이용권 결제에 사용 (1P = 1원)</div></div>'
    +'<div class="mp-sec">활동</div>'
    +'<div class="mp-link" onclick="mpShowPayments()"><span class="e">💳</span>결제 내역</div>'
    +'<div class="mp-link" onclick="mpShowMyPosts()"><span class="e">📝</span>내가 쓴 글</div>'
    +'<div class="mp-link" onclick="mpShowMyComments()"><span class="e">💬</span>내가 쓴 댓글</div>'
    +'<div class="mp-sec">회원정보</div>'
    +((window._cmUserDoc && window._cmUserDoc.boardNick) ? '<div class="mp-link" style="opacity:.6;cursor:default"><span class="e">\u270F\ufe0f</span>닉네임 '+cmEsc(window._cmUserDoc.boardNick)+' (변경 불가)</div>' : '<div class="mp-link" onclick="mpChangeNick()"><span class="e">\u270F\ufe0f</span>닉네임 설정</div>');
  box.innerHTML += '<div class="mp-sec">계정</div><div class="mp-link" onclick="showDeletePopup()" style="color:#C0392B"><span class="e">⚠️</span>회원 탈퇴</div>';
}
function mpShowHistory(){
  var box=document.getElementById('mpBody'); if(!box) return;
  var top='<div class="mp-sub-top"><button class="cm-back" onclick="mpRenderHome()">\u2190</button><span>포인트 내역</span></div>';
  var hist=(window._cmUserDoc&&Array.isArray(window._cmUserDoc.mileageHistory))?window._cmUserDoc.mileageHistory.slice():[];
  hist.sort(function(a,b){return (b.at||0)-(a.at||0);});
  var h=top;
  if(!hist.length) h+='<div class="cm-empty">아직 내역이 없어요.</div>';
  hist.forEach(function(x){
    var amt=(x.a==null?0:x.a); var sign=amt>=0?'+':''; var cls=amt>=0?'plus':'minus';
    h+='<div class="hist"><div class="ht">'+cmEsc(mpHistLabel(x.t))+'<div class="hd">'+cmHistDate(x.at)+'</div></div><div class="ha '+cls+'">'+sign+amt.toLocaleString()+'</div></div>';
  });
  box.innerHTML=h;
}
async function mpShowPayments(){
  var box=document.getElementById('mpBody'); if(!box) return;
  var top='<div class="mp-sub-top"><button class="cm-back" onclick="mpRenderHome()">\u2190</button><span>결제 내역</span></div>';
  var accBox='<div class="psucc-acc" style="margin:0 16px 14px">'
    +'<div class="accrow"><span class="accnum">토스뱅크 1000-2406-0293</span><button class="psucc-copy" onclick="copyDepositAcc()">복사</button></div>'
    +'<div>예금주: 박성환</div>'
    +'<div style="font-size:12px;color:#8A6A2A;margin-top:4px">입금자명을 신청자명과 동일하게 보내주세요. 입금 확인은 영업일 기준 처리됩니다.</div></div>';
  box.innerHTML=top+'<div class="cm-loading">불러오는 중\u2026</div>';
  try{
    var snap=await db.collection('payments').where('uid','==',currentUser.uid).get();
    var rows=[]; snap.forEach(function(d){ rows.push(d.data()); });
    rows.sort(function(a,b){ var da=(a.createdAt&&a.createdAt.toDate?a.createdAt.toDate().getTime():0), db2=(b.createdAt&&b.createdAt.toDate?b.createdAt.toDate().getTime():0); return db2-da; });
    var h=top+accBox;
    if(!rows.length){ h+='<div class="cm-empty">결제 내역이 없어요.</div>'; box.innerHTML=h; return; }
    rows.forEach(function(p){
      var isCoupon=(p.paidByCoupon||p.discountCode);
      var cName=p.certName||certFull(p.certType||'')||'-';
      var plan=mpPlanName(p);
      var amt=isCoupon ? '0원 <span style="font-size:11px;color:#0F6E56">🎟 '+cmEsc(p.discountCode||'할인코드')+'</span>'
                       : (p.depositAmount!=null?p.depositAmount:(p.price||0)).toLocaleString()+'원';
      var mil=(!isCoupon&&p.mileageUsed>0)?(' <span style="font-size:11px;color:#C2611B">(+P '+p.mileageUsed.toLocaleString()+')</span>'):'';
      var st=mpPayStatus(p);
      var exp=mpExpiryText(p);
      var dt=(p.createdAt&&p.createdAt.toDate)?mpFmtDate(p.createdAt.toDate()):'';
      h+='<div class="hist" style="align-items:flex-start">'
        +'<div class="ht">'+cmEsc(cName)+' · '+plan
        +'<div class="hd">신청일 '+dt+(exp?(' · 만료 '+exp):'')+'</div></div>'
        +'<div style="text-align:right"><div style="font-weight:700;color:#2C2C2A">'+amt+mil+'</div>'
        +'<div style="margin-top:3px">'+st+'</div></div></div>';
    });
    box.innerHTML=h;
  }catch(e){ console.warn('mpShowPayments',e); box.innerHTML=top+accBox+'<div class="cm-empty">불러오지 못했어요.</div>'; }
}
function mpPlanName(p){
  // PLAN_SETS에서 일수→이름(8주 이용권 등), 없으면 N일
  try{ var set=plansFor(p.certType); if(set){ var f=set.find(function(x){return x.d===p.planDays;}); if(f) return f.name; } }catch(_){}
  if(_LEGACY_PLAN_NAMES[p.planDays]) return _LEGACY_PLAN_NAMES[p.planDays];
  return (p.planDays!=null)?(p.planDays+'일'):'-';
}
function mpExpiryText(p){
  if(p.status==='revoked'||p.status==='rejected'||p.status==='pending') return '';
  // 해당 시험 이용권의 현재 만료일
  var ent=(window._cmUserDoc&&window._cmUserDoc.entitlements&&window._cmUserDoc.entitlements[p.certType])||null;
  if(!ent||!ent.expireAt) return '';
  var d=ent.expireAt.toDate?ent.expireAt.toDate():new Date(ent.expireAt);
  return mpFmtDate(d);
}
function mpPayStatus(p){
  var s=p.status;
  if(s==='revoked') return '<span style="font-size:11px;font-weight:700;color:#A32D2D;background:#FCEBEB;padding:2px 8px;border-radius:10px">철회</span>';
  if(s==='rejected') return '<span style="font-size:11px;font-weight:700;color:#A89C8E;background:#F0F0F0;padding:2px 8px;border-radius:10px">거절</span>';
  if(s==='pending') return '<span style="font-size:11px;font-weight:700;color:#A8650A;background:#FFF4E0;padding:2px 8px;border-radius:10px">승인대기</span>';
  var ent=(window._cmUserDoc&&window._cmUserDoc.entitlements&&window._cmUserDoc.entitlements[p.certType])||null;
  var now=Date.now();
  var exp=ent&&ent.expireAt?(ent.expireAt.toDate?ent.expireAt.toDate().getTime():new Date(ent.expireAt).getTime()):0;
  if(ent&&ent.plan==='ACTIVE'&&exp>now) return '<span style="font-size:11px;font-weight:700;color:#15793F;background:#E7F6EC;padding:2px 8px;border-radius:10px">이용중</span>';
  return '<span style="font-size:11px;font-weight:700;color:#A89C8E;background:#F0F0F0;padding:2px 8px;border-radius:10px">만료</span>';
}
function mpFmtDate(d){ return d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate(); }
async function mpShowMyPosts(){
  var box=document.getElementById('mpBody'); if(!box) return;
  var top='<div class="mp-sub-top"><button class="cm-back" onclick="mpRenderHome()">\u2190</button><span>내가 쓴 글</span></div>';
  box.innerHTML=top+'<div class="cm-loading">불러오는 중\u2026</div>';
  try{
    var snap=await db.collection('posts').where('authorUid','==',currentUser.uid).orderBy('createdAt','desc').limit(50).get();
    var h=top;
    if(snap.empty) h+='<div class="cm-empty">아직 쓴 글이 없어요.</div>';
    snap.forEach(function(doc){ var p=doc.data(); p._id=doc.id; h+=cmCardHTML(p); });
    box.innerHTML=h;
  }catch(e){ console.warn('mpShowMyPosts',e); box.innerHTML=top+'<div class="cm-empty">'+((/index/i.test(e.message||''))?'목록 인덱스가 필요해요. (콘솔에서 생성)':'불러오지 못했어요.')+'</div>'; }
}
async function mpShowMyComments(){
  var box=document.getElementById('mpBody'); if(!box) return;
  var top='<div class="mp-sub-top"><button class="cm-back" onclick="mpRenderHome()">\u2190</button><span>내가 쓴 댓글</span></div>';
  box.innerHTML=top+'<div class="cm-loading">불러오는 중\u2026</div>';
  try{
    var snap=await db.collectionGroup('comments').where('authorUid','==',currentUser.uid).orderBy('createdAt','desc').limit(50).get();
    var h=top;
    if(snap.empty) h+='<div class="cm-empty">아직 쓴 댓글이 없어요.</div>';
    snap.forEach(function(dc){
      var c=dc.data(); var pid=(dc.ref.parent&&dc.ref.parent.parent)?dc.ref.parent.parent.id:'';
      h+='<div class="cm-post" onclick="cmOpenDetail(\''+pid+'\')"><div class="cm-pe" style="-webkit-line-clamp:3">'+cmEsc(c.body||'').replace(/\n/g,'<br>')+'</div><div class="cm-pm"><span>'+cmTimeAgo(c.createdAt)+'</span></div></div>';
    });
    box.innerHTML=h;
  }catch(e){ console.warn('mpShowMyComments',e); box.innerHTML=top+'<div class="cm-empty">'+((/index/i.test(e.message||''))?'목록 인덱스가 필요해요. (콘솔에서 생성)':'불러오지 못했어요.')+'</div>'; }
}
async function mpChangeNick(){
  if(!currentUser) return;
  if(window._cmUserDoc && window._cmUserDoc.boardNick){ alert('닉네임은 한 번 정하면 바꿀 수 없어요.'); return; }
  var cur=cmGetNick(); if(cur==='익명') cur='';
  var nv=prompt('새 닉네임을 입력하세요 (20자 이내)', cur);
  if(nv==null) return; nv=nv.trim();
  if(!nv){ alert('닉네임을 입력해 주세요.'); return; }
  if(nv.length>20){ alert('닉네임은 20자 이내로 해주세요.'); return; }
  try{
    await db.collection('users').doc(currentUser.uid).set({boardNick:nv},{merge:true});
    window._cmUserDoc=window._cmUserDoc||{}; window._cmUserDoc.boardNick=nv;
    mpRenderHome(); alert('닉네임이 변경됐어요.');
  }catch(e){ console.warn('mpChangeNick',e); alert('변경 중 오류가 났어요.'); }
}


/* 메인 공지바 + 오늘의 글 (7단계) */
var _cmNbItems=[], _cmNbIdx=0, _cmNbTimer=null;


/* 게시글 신고 (8a) */

