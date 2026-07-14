/* ============================================================
   CertLab 주관식(서술형) 학습·자동채점 모듈 — index.html 별도 로드(calcrender·itvrender와 동일 패턴)
   전역: window.CLSubj = { mount(el, exam, opts), grade(...), setEndpoint(url) }
   데이터: exam = { id, name, questions:[ 문제 ] }
     문제 = { id, pt, q(자료), refs:[{law,art,title}], note, asks:[ 물음 ] }
       물음 = { n, pt, q, outline:[ { lv, h, role, kw:[], ref, body } ] }
   채점 2축(오프라인·무료): 논점 커버리지(kw) + 법조문 인용(제N조). 판례 사건번호는 안 봄.
   LLM 심층채점(선택): setEndpoint(url) 설정 시 서버(Cloud Function)로 답안·모범답안 보내 서술 정확성까지 평가. 미설정/실패 시 오프라인 채점으로 폴백.
   자가채점 결과(맞음/애매/틀림)는 opts.onRate(qid, ask_n, result 0|1|2)로 콜백 → index의 SR(srRateK)에 연동.
   ============================================================ */
(function(){
  var ENDPOINT = null;                // LLM 심층채점 엔드포인트(Cloud Function). null이면 오프라인만.
  var ROMAN=['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ'];
  var HAN=['','가','나','다','라','마','바','사','아','자','차'];
  // 감평 2차 실제 목차 체계: 대 Ⅰ · 중 1 · 소 (1) · 세 가  (박문각 목차집 확인)
  function _mokchaNum(lv, c){ lv=lv<1?1:(lv>4?4:lv);
    if(lv===1){c[0]++;c[1]=0;c[2]=0;c[3]=0;return (ROMAN[c[0]]||c[0])+'.';}
    if(lv===2){c[1]++;c[2]=0;c[3]=0;return c[1]+'.';}
    if(lv===3){c[2]++;c[3]=0;return '('+c[2]+')';}
    c[3]++;return (HAN[c[3]]||c[3])+'.'; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function norm(s){ return String(s||'').replace(/\s+/g,'').toLowerCase(); }
  function isLawRef(ref){ return ref && /제\d+조/.test(ref); }
  function userCitesLaw(ansN, ref){ var arts=ref.match(/제\d+조(?:제\d+항)?/g)||[];
    var LAWS=['토지보상법','공익사업을위한','국토계획법','국토의계획','행정소송법','행정심판법','감칙','감정평가에관한규칙','실무기준','부동산가격공시법','부동산가격공시'];
    var lawOK=LAWS.some(function(L){return ansN.indexOf(norm(L))>=0;});
    var artOK=arts.some(function(a){return ansN.indexOf(norm(a))>=0;});
    return lawOK && artOK; }

  // ── 오프라인 채점(논점+법조문) ──
  function gradeOffline(ask, rowsText){
    var ansN=norm(rowsText); var nodes=ask.outline||[];
    var hit=0, nodeRes=[]; nodes.forEach(function(n){ var m=(n.kw||[]).some(function(k){return ansN.indexOf(norm(k))>=0;}); if(m)hit++; nodeRes.push({h:n.h,matched:m,kw:n.kw||[]}); });
    var ratio=nodes.length? hit/nodes.length : 0;
    var refNodes=nodes.filter(function(n){return isLawRef(n.ref);}); var refHit=0, refRes=[];
    refNodes.forEach(function(n){ var c=userCitesLaw(ansN,n.ref); if(c)refHit++; refRes.push({h:n.h,ref:n.ref,cited:c}); });
    var refRatio=refNodes.length? refHit/refNodes.length : 1;
    var score=Math.round((ask.pt||10)*(ratio*0.7 + refRatio*0.3));
    return { mode:'offline', score:score, pt:ask.pt||10, nodeHit:hit, nodeTot:nodes.length, refHit:refHit, refTot:refNodes.length,
      ratio:ratio, refRatio:refRatio, nodeRes:nodeRes, refRes:refRes };
  }
  // ── AI 심층채점(유료 애드온) ──
  // Firebase는 index.html가 소유 → 채점 호출은 opts.gradeAi(payload)로 주입받아 씀(onCall callable 래핑).
  // payload는 서버 gradeSubjective가 기대하는 키(cert·answer·outline·subject·jaryo·refs·물음·배점)와 동일.
  function aiPayload(exam, qi, ai, rowsText){
    var q=exam.questions[qi], ask=q.asks[ai];
    return { cert:(exam.id||''), subject:exam.name, jaryo:q.q, refs:q.refs||[],
      '물음':ask.q, '배점':ask.pt, outline:ask.outline, answer:rowsText };
  }
  function gradeAi(exam, qi, ai, rowsText){
    var payload=aiPayload(exam,qi,ai,rowsText);
    if(_opts.gradeAi) return Promise.resolve(_opts.gradeAi(payload)).then(function(j){ j=j||{}; j.mode='llm'; return j; });
    if(ENDPOINT) return fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){ if(!r.ok) throw new Error('http'+r.status); return r.json(); }).then(function(j){ j.mode='llm'; return j; });
    return Promise.reject(new Error('no-grader'));
  }
  function _sellsAi(){ return !!_opts.aiSell; }
  function _hasEnt(){ try{ return _opts.hasEntitlement ? !!_opts.hasEntitlement() : false; }catch(e){ return false; } }
  function _bal(){ try{ return _opts.creditBalance ? (+_opts.creditBalance()||0) : 0; }catch(e){ return 0; } }
  function _cost(){ return (+_opts.aiCost>0)?+_opts.aiCost:1; }
  function _explainCost(){ return (+_opts.explainCost>0)?+_opts.explainCost:1; }
  function _explBal(){ try{ return _opts.explainBalance ? (+_opts.explainBalance()||0) : 0; }catch(e){ return 0; } }
  function _mdLite(md){ var t=esc(md); t=t.replace(/^\s*#{1,6}\s*(.+)$/gm,'<b>$1</b>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/^\s*[-*]\s+(.+)$/gm,'• $1').replace(/\n{2,}/g,'<br><br>').replace(/\n/g,'<br>'); return t; }
  // 🤖 해설 AI 자유질문 위젯(객관식과 동일 형식) — 모범답안 하단
  function _subjAskWidget(){ if(!_opts.explainAi) return '';
    return '<div class="ai-ask-wrap">'
      +'<div class="ai-ask-hd">🤖 AI에게 더 물어보기</div>'
      +'<div class="ai-ask-guide">더 알고 싶은 게 있으면 여기 적으세요. 위 <b>📋복사</b>를 누르면 그 논점이 여기로 들어와요. 답안 전체가 궁금하면 <b>＋문제전체</b>를 누르거나 <b>문제전체</b>라고 적으면 돼요.</div>'
      +'<div class="ai-chip-row"><button type="button" class="ai-chip" data-whole="1">＋ 문제전체</button></div>'
      +'<textarea class="ai-ask" placeholder="예: 이 논점의 학설 대립을 더 쉽게 설명해줘"></textarea>'
      +'<button class="ai-exp-btn ai-exp-whole subj-ask-go">🤖 AI에게 질문 <span class="ai-exp-cost">'+_explainCost()+'회</span></button>'
      +'<div class="ai-exp-box subj-ask-res" style="display:none"></div>'
      +'</div>'; }
  // 공용: 문제전체 칩 + 질문 전송 배선(모범답안 위젯·개념 위젯 공용)
  function _wireAskGo(wrap, exam, qi, ctxFn, qStr){
    var ta=wrap.querySelector('.ai-ask'); if(!ta) return;
    var chip=wrap.querySelector('[data-whole]'); if(chip) chip.onclick=function(){ if(!/문제전체/.test(ta.value)) ta.value=(ta.value?ta.value.replace(/\s+$/,'')+'\n':'')+'문제전체'; ta.focus(); };
    var go=wrap.querySelector('.subj-ask-go'), res=wrap.querySelector('.subj-ask-res'); if(!go||!res) return;
    go.onclick=function(){ var t=(ta.value||'').trim(); if(!t){ alert('물어볼 내용을 적어주세요. (위 📋복사로 넣거나 직접 입력)'); return; }
      if(_explBal() < _explainCost()){ if(_opts.buyExplain) _opts.buyExplain(); else if(_opts.buyAi) _opts.buyAi(); return; }
      var whole=/문제전체/.test(t);
      res.style.display='block'; res.className='ai-exp-box subj-ask-res'; res.innerHTML='<div class="subj-loading">🤖 AI가 설명 중…</div>'; go.disabled=true;
      Promise.resolve(_opts.explainAi({ subject:exam.name, question:qStr, ask:t, context:ctxFn(), mode:(whole?'all':'ask') }))
        .then(function(out){ out=out||{}; res.innerHTML='<div class="ai-exp-hd">🤖 AI 설명'+(typeof out.creditsLeft==='number'?' <span class="ai-exp-left">남은 '+out.creditsLeft+'회</span>':'')+'</div><div class="ai-exp-body">'+_mdLite(out.text||'')+'</div>'; })
        .catch(function(err){ var e=String((err&&err.code)||'')+' '+String((err&&err.message)||'');
          if(/permission-denied|충전/.test(e)){ res.style.display='none'; if(_opts.buyExplain)_opts.buyExplain(); else if(_opts.buyAi)_opts.buyAi(); }
          else if(/unauthenticated|로그인/.test(e)){ res.style.display='none'; if(_opts.needLogin)_opts.needLogin(); }
          else res.innerHTML='<div class="subj-loading">설명을 불러오지 못했어요. 잠시 후 다시.</div>'; })
        .finally(function(){ go.disabled=false; }); };
  }
  // 모범답안 하단 위젯(논점 복사)
  function bindAsk(R, exam, qi, ai){ if(!_opts.explainAi) return; var ask=exam.questions[qi].asks[ai], q=exam.questions[qi];
    var wrap=R.querySelector('.ai-ask-wrap'); if(!wrap) return; var ta=wrap.querySelector('.ai-ask');
    R.querySelectorAll('.subj-copy').forEach(function(btn){ btn.onclick=function(){ var i=+btn.getAttribute('data-i'); var nd=(ask.outline||[])[i]; if(!nd) return;
      var txt=[nd.h,nd.ref,nd.body].filter(function(x){return x&&String(x).trim();}).join('\n');
      ta.value=(ta.value?ta.value.replace(/\s+$/,'')+'\n':'')+txt+'\n'; ta.focus(); }; });
    _wireAskGo(wrap, exam, qi, function(){ return (q.q||'')+'\n'+(ask.q||'')+'\n'+(ask.outline||[]).map(function(n){return n.h+' '+(n.body||'');}).join('\n'); }, (q.q||'')+' / '+(ask.q||''));
  }
  // 문제에 나온 핵심 개념 설명 박스 + 문제-level AI 질문 위젯
  // 객관식 .concept-box 형태 공유 + 주관식만 접고펴기(.cpt-col). 복사→AI 질문칸.
  function conceptHtml(q){ if(!(q.concepts&&q.concepts.length)) return '';
    var rows=q.concepts.map(function(c,i){ if(!c||!c.term) return '';
      return '<div class="concept-row cpt-col"><div class="crow-h" data-i="'+i+'"><span class="arw">▶</span><b class="tm">'+esc(c.term)+'</b>'
        +(_opts.explainAi?'<button class="subj-copy" data-cpt="'+i+'" title="이 개념을 AI 질문칸에 복사">📋</button>':'')+'</div>'
        +(c.def?'<div class="crow-d">'+esc(c.def)+'</div>':'')+'</div>'; }).join('');
    return '<div class="concept-box"><div class="concept-ti">핵심 개념 <span class="cpt-hint">— 눌러서 펼치기</span></div>'+rows+'</div>'+_subjAskWidget();
  }
  function bindConcepts(v, exam, qi){ var q=exam.questions[qi]; if(!(q.concepts&&q.concepts.length)) return;
    v.querySelectorAll('.concept-row.cpt-col .crow-h').forEach(function(h){ h.onclick=function(e){ if(e&&e.target&&e.target.closest&&e.target.closest('.subj-copy')) return; h.parentNode.classList.toggle('open'); }; });
    if(!_opts.explainAi) return;
    var wrap=v.querySelector('.ai-ask-wrap'); if(!wrap) return; var ta=wrap.querySelector('.ai-ask');
    v.querySelectorAll('.concept-box .subj-copy').forEach(function(btn){ btn.onclick=function(ev){ if(ev&&ev.stopPropagation)ev.stopPropagation(); var i=+btn.getAttribute('data-cpt'); var c=(q.concepts||[])[i]; if(!c) return;
      var txt=[c.term,c.def].filter(Boolean).join(' — '); ta.value=(ta.value?ta.value.replace(/\s+$/,'')+'\n':'')+txt+'\n'; ta.focus(); }; });
    _wireAskGo(wrap, exam, qi, function(){ return (q.q||'')+'\n'+(q.concepts||[]).map(function(c){return c.term+': '+(c.def||'');}).join('\n'); }, (q.q||''));
  }
  function _errCode(err){ return String((err&&err.code)||'')+' '+String((err&&err.message)||''); }

  // ── 렌더 ──
  var _opts={};
  function mount(el, exam, opts){ _opts=opts||{}; if(opts&&opts.endpoint) ENDPOINT=opts.endpoint;
    el.innerHTML=''; el.appendChild(buildList(exam)); }
  function buildList(exam){ var wrap=document.createElement('div'); wrap.className='subj-list';
    (exam.questions||[]).forEach(function(q,qi){ var c=document.createElement('div'); c.className='subj-qc';
      c.innerHTML='<div class="subj-qh">📝 문제 '+(qi+1)+' <span class="subj-pt">'+(q.pt||'')+'점</span></div>'
        +'<div class="subj-qprev">'+esc((q.q||'').slice(0,90))+'…</div>';
      c.onclick=function(){ openQ(exam,qi); };
      wrap.appendChild(c); });
    return wrap; }
  function openQ(exam,qi){ var host=_opts.host||document.getElementById(_opts.mountId)||document.body;
    var q=exam.questions[qi]; var v=document.createElement('div'); v.className='subj-view';
    var refHtml=(q.refs&&q.refs.length)?('<div class="subj-refbox"><div class="rt">〈참조 조문〉 — 답안에 인용하면 근거 점수</div>'
      +q.refs.map(function(r){return '<div class="ri"><b>'+esc(r.law)+' '+esc(r.art)+'</b>'+(r.title?' ('+esc(r.title)+')':'')+'</div>';}).join('')+'</div>'):'';
    v.innerHTML='<div class="subj-back" data-back="1">‹ 목록</div>'
      +'<div class="subj-qc"><div class="subj-qh">📝 문제 '+(qi+1)+' <span class="subj-pt">'+(q.pt||'')+'점</span></div>'
      +'<div class="subj-jaryo">'+esc(q.q)+'</div>'+refHtml
      +(q.note?'<div class="subj-note">'+esc(q.note)+'</div>':'')
      +conceptHtml(q)
      +'<div id="subj-asks"></div></div>';
    if(_opts.replace!==false){ host.innerHTML=''; }
    host.appendChild(v);
    v.querySelector('[data-back]').onclick=function(){ mount(host, exam, _opts); };
    bindConcepts(v, exam, qi);
    var asksEl=v.querySelector('#subj-asks');
    (q.asks||[]).forEach(function(ask,ai){ asksEl.appendChild(buildAsk(exam,qi,ai)); });
  }
  function rowHTML(){ return '<div class="subj-arow" data-lv="1"><div class="rh">'
    +'<button class="lvbtn out" title="내어쓰기(상위 목차)">‹</button><button class="lvbtn in" title="들여쓰기(하위 목차)">›</button>'
    +'<span class="idx"></span>'
    +'<input class="h" placeholder="목차 (예: 사업인정의 의의)"><button class="del" title="삭제">−</button></div>'
    +'<textarea class="d" placeholder="상세내용 — 법조문은 「토지보상법 제20조」처럼"></textarea></div>'; }
  // 대 Ⅰ · 중 1 · 소 (1) · 세 가 — 레벨별 자동번호 + 들여쓰기
  function reindex(box){ var c=[0,0,0,0]; box.querySelectorAll('.subj-arow').forEach(function(r){
    var lv=parseInt(r.getAttribute('data-lv')||'1',10); if(lv<1)lv=1; if(lv>4)lv=4;
    r.querySelector('.idx').textContent=_mokchaNum(lv,c);
    r.style.marginLeft=((lv-1)*18)+'px'; }); }
  function buildAsk(exam,qi,ai){ var ask=exam.questions[qi].asks[ai];
    var d=document.createElement('div'); d.className='subj-ask';
    d.innerHTML='<div class="subj-q"><span class="num">물음 '+(ask.n||ai+1)+')</span>'+esc(ask.q)+' <span class="subj-pt">'+(ask.pt||'')+'점</span></div>'
      +'<div class="subj-rows">'+rowHTML()+rowHTML()+rowHTML()+'</div>'
      +'<button class="subj-add">+ 목차 추가</button>'
      +'<div class="subj-btns"><button class="subj-grade">채점하기</button>'
      +(_sellsAi()?('<button class="subj-ai">🤖 AI 심층채점'+(_hasEnt()?(' <span class="subj-lock">'+_cost()+'회 차감·잔액 '+_bal()+'</span>'):' <span class="subj-lock">🔒 '+_cost()+'회</span>')+'</button>'):'')
      +'<button class="subj-model">모범답안</button></div>'
      +((_sellsAi()&&!_hasEnt())?('<div class="subj-aihint">🔒 AI 심층채점(감평 채점위원 수준 서술 첨삭)은 <b>충전 횟수</b>로 이용해요. 회원권과 별도 · 1건당 <b>'+_cost()+'회</b> 차감. 버튼을 누르면 충전 안내가 떠요.</div>'):'')
      +'<div class="subj-res"></div>';
    var box=d.querySelector('.subj-rows'); reindex(box);
    d.querySelector('.subj-add').onclick=function(){ box.insertAdjacentHTML('beforeend',rowHTML()); bindRow(box); reindex(box); };
    bindRow(box);
    function rows(){ var out=[]; box.querySelectorAll('.subj-arow').forEach(function(r){ out.push({h:r.querySelector('.h').value, d:r.querySelector('.d').value}); }); return out; }
    function text(){ return rows().map(function(r){return r.h+' '+r.d;}).join('  '); }
    d.querySelector('.subj-grade').onclick=function(){ var t=text(); if(norm(t).length<4){ alert('목차/내용을 먼저 적어주세요.'); return; }
      showResult(d, gradeOffline(ask,t), exam, qi, ai); };
    if(_sellsAi()){ d.querySelector('.subj-ai').onclick=function(){
      // 크레딧 없으면 채점 안 하고 충전 안내부터
      if(!_hasEnt()){ if(_opts.buyAi){ _opts.buyAi(); } else { alert('AI 첨삭 충전이 필요합니다.'); } return; }
      var t=text(); if(norm(t).length<4){ alert('목차/내용을 먼저 적어주세요.'); return; }
      var R=d.querySelector('.subj-res'); R.className='subj-res on'; R.innerHTML='<div class="subj-loading">🤖 AI 채점 중… (최대 30초)</div>';
      gradeAi(exam,qi,ai,t).then(function(res){ showResult(d,res,exam,qi,ai);
        try{ if(_opts.onGraded && res && res.mode==='llm'){ var q=exam.questions[qi], ak=q.asks[ai];
          _opts.onGraded({ qid:(q.id||('q'+qi))+'#'+(ak.n||ai+1), question:(q.q||'')+' / '+(ak.q||''), answer:t, score:res.score, pt:res.pt||ak.pt, perNode:res.perNode||[], feedback:res.feedback||'' }); } }catch(_e){} })
        .catch(function(err){ var e=_errCode(err);
          if(/permission-denied|충전|이용권/.test(e)){ R.className='subj-res'; R.innerHTML=''; if(_opts.buyAi) _opts.buyAi(); return; }
          if(/unauthenticated|로그인/.test(e)){ R.className='subj-res'; R.innerHTML=''; if(_opts.needLogin) _opts.needLogin(); else alert('로그인이 필요합니다.'); return; }
          // 그 외(네트워크·서버 오류)만 오프라인 채점으로 폴백
          var res=gradeOffline(ask,t); res._fellback=true; showResult(d,res,exam,qi,ai); }); }; }
    d.querySelector('.subj-model').onclick=function(){ showResult(d, null, exam, qi, ai); };
    return d;
  }
  function bindRow(box){ box.querySelectorAll('.subj-arow .del').forEach(function(btn){ btn.onclick=function(){
    if(box.querySelectorAll('.subj-arow').length<=1){ btn.closest('.subj-arow').querySelector('.h').value=''; btn.closest('.subj-arow').querySelector('.d').value=''; return; }
    btn.closest('.subj-arow').remove(); reindex(box); }; });
    box.querySelectorAll('.subj-arow .lvbtn').forEach(function(btn){ btn.onclick=function(){ var row=btn.closest('.subj-arow'); var lv=parseInt(row.getAttribute('data-lv')||'1',10);
      lv = btn.classList.contains('in') ? Math.min(4,lv+1) : Math.max(1,lv-1); row.setAttribute('data-lv',lv); reindex(box); }; }); }

  function modelHtml(ask, nodeRes){ var mm={}; (nodeRes||[]).forEach(function(r){ mm[r.h]=r.matched; });
    var c=[0,0,0,0];
    var showCopy=!!_opts.explainAi;
    return (ask.outline||[]).map(function(nd,idx){ var lv=nd.lv||1; if(lv<1)lv=1; if(lv>4)lv=4; var st=(mm[nd.h]===true)?'hit':(mm[nd.h]===false)?'miss':'';
      var num=_mokchaNum(lv,c);
      return '<div class="subj-node lv'+lv+' '+st+'"><div class="nh"><span class="nnum">'+num+'</span>'
        +(nd.role?'<span class="role role-'+esc(nd.role)+'">'+esc(nd.role)+'</span>':'')+'<span class="nt">'+esc(nd.h)+'</span>'
        +(nd.ref?'<span class="nref">'+esc(nd.ref)+'</span>':'')
        +(showCopy?'<button class="subj-copy" data-i="'+idx+'" title="이 논점을 AI 질문칸에 복사">📋</button>':'')+'</div>'
        +(nd.body?'<div class="nb">'+esc(nd.body)+'</div>':'')+'</div>'; }).join(''); }

  function showResult(d, res, exam, qi, ai){ var ask=exam.questions[qi].asks[ai]; var R=d.querySelector('.subj-res'); R.className='subj-res on';
    if(!res){ R.innerHTML='<div class="subj-sect">모범답안 목차</div>'+modelHtml(ask,null)+_subjAskWidget()+rateBar(exam,qi,ai); bindNodes(R); bindAsk(R,exam,qi,ai); bindRate(R,exam,qi,ai); return; }
    var pt=res.pt||ask.pt, pctT=pt?res.score/pt:0, col=pctT>=0.7?'#0F6E56':pctT>=0.4?'#B7791F':'#C0322F', bg=pctT>=0.7?'#E8F8F1':pctT>=0.4?'#FEF6E7':'#FCEBEB';
    var h='<div class="subj-scorebox"><div class="ring" style="background:'+bg+';color:'+col+'">'+res.score+'</div>'
      +'<div class="stx"><b>'+res.score+' / '+pt+'점</b>'+(res.mode==='llm'?' <span class="badge-ai">AI</span>':'')+(res._fellback?' <span class="badge-off">오프라인</span>':'')+'<br>';
    if(res.mode==='llm'){ h+='AI 채점 · 아래 <b>논점별 채점 근거</b>를 확인하세요.</div></div>';
      if(res.feedback){ h+='<div class="subj-sect">채점 총평</div><div class="subj-feed">'+esc(res.feedback)+'</div>'; }
      h+='<div class="subj-sect">논점별 채점 근거</div>'+(res.perNode||[]).map(function(p){ var lv=p.level||0; var mk=lv>=2?'✓':lv===1?'△':'✕'; var cls=lv>=2?'hit':lv===1?'amb':'miss'; var lb=lv>=2?'충실':lv===1?'부분점수':'미흡';
        return '<div class="subj-chk '+cls+'"><span class="mk">'+mk+'</span><span>'+esc(p.h)+' <span class="subj-lvtag '+cls+'">'+lb+'</span></span></div>'+(p.comment?'<div class="subj-why">'+esc(p.comment)+'</div>':''); }).join('');
    } else {
      h+='논점 '+res.nodeHit+'/'+res.nodeTot+' · 법조문 '+res.refHit+'/'+res.refTot+'</div></div>';
      h+='<div class="subj-two"><div><b>논점 커버리지</b><div class="bar"><i style="width:'+Math.round(res.ratio*100)+'%;background:#2E6FBE"></i></div>'+Math.round(res.ratio*100)+'%</div>'
        +'<div><b>법조문 인용</b><div class="bar"><i style="width:'+Math.round(res.refRatio*100)+'%;background:#1D4ED8"></i></div>'+Math.round(res.refRatio*100)+'% · 조문만 맞아도 득점</div></div>';
      h+='<div class="subj-sect">논점 체크</div>'+res.nodeRes.map(function(r){ return '<div class="subj-chk '+(r.matched?'hit':'miss')+'"><span class="mk">'+(r.matched?'✓':'✕')+'</span><span>'+esc(r.h)+(r.matched?'':' <span class="cm">— 필요('+(r.kw||[]).slice(0,2).join('·')+')</span>')+'</span></div>'; }).join('');
      if(res.refRes.length){ h+='<div class="subj-sect">법조문 인용</div>'+res.refRes.map(function(r){ return '<div class="subj-chk '+(r.cited?'hit':'miss')+'"><span class="mk">'+(r.cited?'✓':'✕')+'</span><span>'+esc(r.h)+' <span class="nref">'+esc(r.ref)+'</span>'+(r.cited?'':' <span class="cm">— 이 조문 적으면 가점</span>')+'</span></div>'; }).join(''); }
    }
    h+='<div class="subj-sect">모범답안 목차 대조</div>'+modelHtml(ask,res.nodeRes)+_subjAskWidget()+rateBar(exam,qi,ai);
    R.innerHTML=h; bindNodes(R); bindAsk(R,exam,qi,ai); bindRate(R,exam,qi,ai);
  }
  function bindNodes(R){ R.querySelectorAll('.subj-node .nh').forEach(function(h){ h.onclick=function(){ h.parentNode.classList.toggle('open'); }; }); }
  function rateBar(exam,qi,ai){ return '<div class="subj-rate"><span>스스로 채점 → 복습(SR):</span>'
    +'<button data-r="0" class="r-no">틀림</button><button data-r="1" class="r-amb">애매</button><button data-r="2" class="r-ok">맞음</button></div><div class="subj-rated"></div>'; }
  function bindRate(R,exam,qi,ai){ var wrap=R.querySelector('.subj-rate'); if(!wrap) return;
    wrap.querySelectorAll('button').forEach(function(b){ b.onclick=function(){ var r=+b.getAttribute('data-r');
      wrap.querySelectorAll('button').forEach(function(x){x.classList.remove('sel');}); b.classList.add('sel');
      var q=exam.questions[qi], ask=q.asks[ai], qid=(q.id||('q'+qi))+'#'+(ask.n||ai+1);
      R.querySelector('.subj-rated').textContent='복습 예약: '+['곧 다시','2일 뒤','5일 뒤'][r]+' (SR 연동)';
      if(_opts.onRate) try{ _opts.onRate(qid, ask.n||ai+1, r); }catch(e){} }; }); }

  window.CLSubj={ mount:mount, gradeOffline:gradeOffline, setEndpoint:function(u){ENDPOINT=u;} };
})();
