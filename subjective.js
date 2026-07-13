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
  // ── LLM 심층채점(서버) ──
  function gradeLLM(exam, qi, ai, rowsText){
    if(!ENDPOINT) return Promise.reject('no-endpoint');
    var q=exam.questions[qi], ask=q.asks[ai];
    return fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ subject:exam.name, jaryo:q.q, refs:q.refs||[], 물음:ask.q, 배점:ask.pt, outline:ask.outline, answer:rowsText })})
      .then(function(r){ if(!r.ok) throw new Error('http'+r.status); return r.json(); })
      .then(function(j){ j.mode='llm'; return j; });   // {score, pt, perNode:[{h,level,comment}], feedback, ...}
  }

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
      +'<div id="subj-asks"></div></div>';
    if(_opts.replace!==false){ host.innerHTML=''; }
    host.appendChild(v);
    v.querySelector('[data-back]').onclick=function(){ mount(host, exam, _opts); };
    var asksEl=v.querySelector('#subj-asks');
    (q.asks||[]).forEach(function(ask,ai){ asksEl.appendChild(buildAsk(exam,qi,ai)); });
  }
  function rowHTML(){ return '<div class="subj-arow"><div class="rh"><span class="idx"></span>'
    +'<input class="h" placeholder="목차 (예: 사업인정의 의의)"><button class="del" title="삭제">−</button></div>'
    +'<textarea class="d" placeholder="상세내용 — 법조문은 「토지보상법 제20조」처럼"></textarea></div>'; }
  function reindex(box){ var lv1=0; box.querySelectorAll('.subj-arow').forEach(function(r,i){ r.querySelector('.idx').textContent=ROMAN[i+1]||(i+1); }); }
  function buildAsk(exam,qi,ai){ var ask=exam.questions[qi].asks[ai];
    var d=document.createElement('div'); d.className='subj-ask';
    d.innerHTML='<div class="subj-q"><span class="num">물음 '+(ask.n||ai+1)+')</span>'+esc(ask.q)+' <span class="subj-pt">'+(ask.pt||'')+'점</span></div>'
      +'<div class="subj-rows">'+rowHTML()+rowHTML()+rowHTML()+'</div>'
      +'<button class="subj-add">+ 목차 추가</button>'
      +'<div class="subj-btns"><button class="subj-grade">채점하기</button>'
      +(ENDPOINT?'<button class="subj-ai">AI 심층채점</button>':'')
      +'<button class="subj-model">모범답안</button></div>'
      +'<div class="subj-res"></div>';
    var box=d.querySelector('.subj-rows'); reindex(box);
    d.querySelector('.subj-add').onclick=function(){ box.insertAdjacentHTML('beforeend',rowHTML()); bindRow(box); reindex(box); };
    bindRow(box);
    function rows(){ var out=[]; box.querySelectorAll('.subj-arow').forEach(function(r){ out.push({h:r.querySelector('.h').value, d:r.querySelector('.d').value}); }); return out; }
    function text(){ return rows().map(function(r){return r.h+' '+r.d;}).join('  '); }
    d.querySelector('.subj-grade').onclick=function(){ var t=text(); if(norm(t).length<4){ alert('목차/내용을 먼저 적어주세요.'); return; }
      showResult(d, gradeOffline(ask,t), exam, qi, ai); };
    if(ENDPOINT){ d.querySelector('.subj-ai').onclick=function(){ var t=text(); if(norm(t).length<4){ alert('목차/내용을 먼저 적어주세요.'); return; }
      var R=d.querySelector('.subj-res'); R.className='subj-res on'; R.innerHTML='<div class="subj-loading">AI 채점 중…</div>';
      gradeLLM(exam,qi,ai,t).then(function(res){ showResult(d,res,exam,qi,ai); })
        .catch(function(){ var res=gradeOffline(ask,t); res._fellback=true; showResult(d,res,exam,qi,ai); }); }; }
    d.querySelector('.subj-model').onclick=function(){ showResult(d, null, exam, qi, ai); };
    return d;
  }
  function bindRow(box){ box.querySelectorAll('.subj-arow .del').forEach(function(btn){ btn.onclick=function(){
    if(box.querySelectorAll('.subj-arow').length<=1){ btn.closest('.subj-arow').querySelector('.h').value=''; btn.closest('.subj-arow').querySelector('.d').value=''; return; }
    btn.closest('.subj-arow').remove(); reindex(box); }; }); }

  function modelHtml(ask, nodeRes){ var mm={}; (nodeRes||[]).forEach(function(r){ mm[r.h]=r.matched; });
    return (ask.outline||[]).map(function(nd){ var st=(mm[nd.h]===true)?'hit':(mm[nd.h]===false)?'miss':'';
      return '<div class="subj-node lv'+(nd.lv||1)+' '+st+'"><div class="nh">▶ '
        +(nd.role?'<span class="role role-'+esc(nd.role)+'">'+esc(nd.role)+'</span>':'')+'<span class="nt">'+esc(nd.h)+'</span>'
        +(nd.ref?'<span class="nref">'+esc(nd.ref)+'</span>':'')+'</div>'
        +(nd.body?'<div class="nb">'+esc(nd.body)+'</div>':'')+'</div>'; }).join(''); }

  function showResult(d, res, exam, qi, ai){ var ask=exam.questions[qi].asks[ai]; var R=d.querySelector('.subj-res'); R.className='subj-res on';
    if(!res){ R.innerHTML='<div class="subj-sect">모범답안 목차</div>'+modelHtml(ask,null)+rateBar(exam,qi,ai); bindNodes(R); bindRate(R,exam,qi,ai); return; }
    var pt=res.pt||ask.pt, pctT=pt?res.score/pt:0, col=pctT>=0.7?'#0F6E56':pctT>=0.4?'#B7791F':'#C0322F', bg=pctT>=0.7?'#E8F8F1':pctT>=0.4?'#FEF6E7':'#FCEBEB';
    var h='<div class="subj-scorebox"><div class="ring" style="background:'+bg+';color:'+col+'">'+res.score+'</div>'
      +'<div class="stx"><b>'+res.score+' / '+pt+'점</b>'+(res.mode==='llm'?' <span class="badge-ai">AI</span>':'')+(res._fellback?' <span class="badge-off">오프라인</span>':'')+'<br>';
    if(res.mode==='llm'){ h+=esc(res.feedback||'')+'</div></div>';
      h+='<div class="subj-sect">논점별 평가</div>'+(res.perNode||[]).map(function(p){ var lv=p.level||0; var mk=lv>=2?'✓':lv===1?'△':'✕'; var cls=lv>=2?'hit':lv===1?'amb':'miss';
        return '<div class="subj-chk '+cls+'"><span class="mk">'+mk+'</span><span>'+esc(p.h)+(p.comment?' <span class="cm">— '+esc(p.comment)+'</span>':'')+'</span></div>'; }).join('');
    } else {
      h+='논점 '+res.nodeHit+'/'+res.nodeTot+' · 법조문 '+res.refHit+'/'+res.refTot+'</div></div>';
      h+='<div class="subj-two"><div><b>논점 커버리지</b><div class="bar"><i style="width:'+Math.round(res.ratio*100)+'%;background:#2E6FBE"></i></div>'+Math.round(res.ratio*100)+'%</div>'
        +'<div><b>법조문 인용</b><div class="bar"><i style="width:'+Math.round(res.refRatio*100)+'%;background:#1D4ED8"></i></div>'+Math.round(res.refRatio*100)+'% · 조문만 맞아도 득점</div></div>';
      h+='<div class="subj-sect">논점 체크</div>'+res.nodeRes.map(function(r){ return '<div class="subj-chk '+(r.matched?'hit':'miss')+'"><span class="mk">'+(r.matched?'✓':'✕')+'</span><span>'+esc(r.h)+(r.matched?'':' <span class="cm">— 필요('+(r.kw||[]).slice(0,2).join('·')+')</span>')+'</span></div>'; }).join('');
      if(res.refRes.length){ h+='<div class="subj-sect">법조문 인용</div>'+res.refRes.map(function(r){ return '<div class="subj-chk '+(r.cited?'hit':'miss')+'"><span class="mk">'+(r.cited?'✓':'✕')+'</span><span>'+esc(r.h)+' <span class="nref">'+esc(r.ref)+'</span>'+(r.cited?'':' <span class="cm">— 이 조문 적으면 가점</span>')+'</span></div>'; }).join(''); }
    }
    h+='<div class="subj-sect">모범답안 목차 대조</div>'+modelHtml(ask,res.nodeRes)+rateBar(exam,qi,ai);
    R.innerHTML=h; bindNodes(R); bindRate(R,exam,qi,ai);
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
