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
  // ── 긴 법률명을 통용 약칭으로(표시용, 데이터 불변). 아는 이름만 치환, 나머지는 원문 유지 ──
  var _LAWABBR=[['공익사업을 위한 토지 등의 취득 및 보상에 관한 법률','토지보상법'],
    ['부동산 가격공시에 관한 법률','부동산공시법'],['부동산가격공시에 관한 법률','부동산공시법'],
    ['국토의 계획 및 이용에 관한 법률','국토계획법'],['감정평가 및 감정평가사에 관한 법률','감정평가법'],
    ['감정평가에 관한 규칙','감정평가규칙'],['행정소송법','행정소송법'],['행정심판법','행정심판법']];
  function _abbrLaw(ref){ var s=String(ref==null?'':ref); for(var i=0;i<_LAWABBR.length;i++){ if(s.indexOf(_LAWABBR[i][0])>=0) s=s.split(_LAWABBR[i][0]).join(_LAWABBR[i][1]); } return s; }
  // ── 문제(자료) 렌더: 탭/파이프 구분 표는 <table>로, 나머지는 개행 유지 ──
  function _subjTableHTML(rows){ var maxc=0; rows.forEach(function(r){ if(r.length>maxc)maxc=r.length; });
    var body=rows.map(function(r,ri){ var cells=''; for(var i=0;i<maxc;i++){ var c=esc(r[i]!=null?String(r[i]).trim():'');
        cells+= (ri===0 ? '<th>'+c+'</th>' : '<td>'+c+'</td>'); } return '<tr>'+cells+'</tr>'; }).join('');
    return '<table class="subj-tbl">'+body+'</table>'; }
  // 지문 가독성: ①②③·㉠㉡·○ㅇ●·▷ 앞에 줄바꿈 삽입(이미 줄머리면 중복 안 됨), 3줄이상 개행은 2줄로
  function _brkMarkers(s){ return String(s==null?'':s)
    .replace(/\s*([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/g,'\n$1')
    .replace(/\s*([㉠㉡㉢㉣㉤㉥])/g,'\n$1')
    .replace(/\s*([○●▷])\s+/g,'\n$1 ')
    .replace(/\n{3,}/g,'\n\n').replace(/^\n+/,''); }
  function _subjJaryoHTML(raw){ var text=_brkMarkers(String(raw==null?'':raw).replace(/\r/g,'')); var lines=text.split('\n');
    function splitRow(l){ if(/\t/.test(l)) return l.split('\t').map(function(s){return s.trim();});
      if((l.match(/\|/g)||[]).length>=2){ return l.replace(/^\s*\|/,'').replace(/\|\s*$/,'').split('|').map(function(s){return s.trim();}); }
      return null; }
    var html='', buf=[];
    function flush(){ if(buf.length>=2){ html+=_subjTableHTML(buf); } else if(buf.length===1){ html+='<div class="jline">'+esc(buf[0].join('  '))+'</div>'; } buf=[]; }
    function lineHTML(l){ var t=l.trim(); if(!t) return '<div class="jgap"></div>';
      // 대불릿(○ ● ▷ ㅇ) → 행잉 인덴트 불릿
      var mb=t.match(/^[○●▷ㅇ]\s*(.*)$/); if(mb) return '<div class="jbul"><span class="jbul-m">•</span><span class="jbul-t">'+esc(mb[1])+'</span></div>';
      // 소항목(①~⑮ · ㉠~㉥ · (1)/1)) → 들여쓴 소블럭(마커 유지)
      var ms=t.match(/^([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮㉠㉡㉢㉣㉤㉥]|\(?\d{1,2}[).])\s*(.*)$/);
      if(ms) return '<div class="jsub"><span class="jsub-m">'+esc(ms[1])+'</span><span class="jsub-t">'+esc(ms[2])+'</span></div>';
      return '<div class="jline">'+esc(t)+'</div>'; }
    lines.forEach(function(l){ if(/\|/.test(l) && /^[\s|:\-]+$/.test(l)){ return; }   // 마크다운 구분선 스킵
      var cells=splitRow(l); if(cells){ buf.push(cells); } else { flush(); html+=lineHTML(l); } });
    flush(); return html; }
  // ── 글씨 크기 통일(.subj-view): 문제(자료·물음)만 크게, 나머지는 한 크기 ──
  function _injectSubjFont(){ if(document.getElementById('subjFontUnify')) return;
    var st=document.createElement('style'); st.id='subjFontUnify';
    st.textContent=
     '.subj-view .jaryo{font-size:15px;line-height:1.78;padding:13px 15px;background:#F8FAFC;border:1px solid #E2E8F0;border-left:3px solid #94A3B8;border-radius:10px;color:#334155;margin:0 0 14px}'
    +'.subj-view .qstem{background:#fff;border-radius:14px;padding:14px 15px;margin-bottom:14px;box-shadow:0 1px 3px rgba(15,23,42,.07)}'
    +'.subj-view .qhead{display:flex;align-items:center;gap:8px;margin-bottom:11px;flex-wrap:wrap}'
    +'.subj-view .qnum{font-size:12px;font-weight:800;color:#fff;background:#0F172A;min-width:25px;height:25px;padding:0 7px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center}'
    +'.subj-view .scard-set-label{font-size:11px;font-weight:600;color:#64748B;background:#F1F5F9;border:1px solid #E2E8F0;padding:2px 9px;border-radius:20px}'
    +'.subj-view .subj-q{background:#EEF4FB;border:1px solid #D6E4F5;border-radius:10px;padding:10px 12px;margin:14px 0 8px}'
    +'.subj-view .subj-q .num{color:#0C447C;margin-right:5px}'
    +'.subj-view .subj-pt{font-size:12px;font-weight:600;color:#185FA5;background:#DCE9F8;padding:1px 8px;border-radius:11px;margin-left:4px}'
    +'.subj-view .subj-btns{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}'
    +'.subj-view .subj-btns button{padding:8px 14px;border-radius:9px;border:1px solid #CBD5E1;background:#fff;font-weight:700;font-size:13px;cursor:pointer;color:#334155}'
    +'.subj-view .subj-model{background:#0C447C!important;color:#fff!important;border-color:#0C447C!important}'
    +'.subj-view .subj-ai{background:#F3ECFB!important;color:#5B3FA0!important;border-color:#D9CBF3!important}'
    +'.subj-view .subj-demo{background:#EAF7F0!important;color:#137a52!important;border-color:#BfE7D4!important}'
    +'.subj-view .jline{white-space:pre-wrap;margin:6px 0}'
    +'.subj-view .jline:first-child{margin-top:0}'
    +'.subj-view .jgap{height:7px}'
    +'.subj-view .jbul{display:flex;gap:8px;margin:6px 0;align-items:flex-start}'
    +'.subj-view .jbul-m{color:#0C447C;font-weight:800;flex-shrink:0}'
    +'.subj-view .jbul-t{white-space:pre-wrap;flex:1}'
    +'.subj-view .jsub{display:flex;gap:7px;margin:4px 0 4px 15px;align-items:flex-start}'
    +'.subj-view .jsub-m{color:#2A5B92;font-weight:700;flex-shrink:0;min-width:20px}'
    +'.subj-view .jsub-t{white-space:pre-wrap;flex:1}'
    +'.subj-view .subj-q{font-size:14px;line-height:1.7}'
    +'.subj-view .subj-tbl{border-collapse:collapse;width:100%;margin:8px 0;font-size:14px}'
    +'.subj-view .subj-tbl th,.subj-view .subj-tbl td{border:1px solid #D9E2EC;padding:6px 9px;text-align:left;vertical-align:top;line-height:1.55}'
    +'.subj-view .subj-tbl th{background:#EEF3F9;font-weight:700;color:#0F172A}'
    +'.subj-view .subj-node .nt,.subj-view .subj-node .nb,'
    +'.subj-view .concept-row,.subj-view .crow-h,.subj-view .crow-d,.subj-view .concept-ti,'
    +'.subj-view .concept-box .tm,.subj-view .subj-refbox,.subj-view .subj-refbox .rt,'
    +'.subj-view .subj-refbox .ri,.subj-view .subj-note,.subj-view .subj-sect,'
    +'.subj-view input.h,.subj-view textarea.d,.subj-view .subj-chk,.subj-view .subj-feed{font-size:14px;line-height:1.7}'
    // ── 모범답안 목차: 계층형 트리 + 배지 ──
    +'.subj-view .subj-sect{font-weight:800;color:#0C447C;margin:16px 2px 8px;padding-left:9px;border-left:3px solid #0C447C}'
    +'.subj-view .subj-node{position:relative;margin:2px 0}'
    +'.subj-view .subj-node.lv1{margin:16px 0 4px}'
    +'.subj-view .subj-node.lv1:first-child{margin-top:2px}'
    +'.subj-view .subj-node.lv2{margin-left:12px;padding-left:12px;border-left:1.5px solid #E5EAF1}'
    +'.subj-view .subj-node.lv3{margin-left:26px;padding-left:12px;border-left:1.5px solid #EAEEF3}'
    +'.subj-view .subj-node.lv4{margin-left:40px;padding-left:12px;border-left:1.5px solid #EEF1F5}'
    +'.subj-view .subj-node .nh{display:flex;flex-wrap:wrap;align-items:center;gap:5px 6px;cursor:pointer}'
    +'.subj-view .subj-node .nnum{font-weight:800;color:#0C447C;flex-shrink:0}'
    +'.subj-view .subj-node .nt{font-weight:700;color:#0F172A}'
    +'.subj-view .subj-node.lv1 .nh{padding-bottom:5px;border-bottom:2px solid #E7EEF6;margin-bottom:3px}'
    +'.subj-view .subj-node.lv1 .nt{font-size:15.5px;color:#0C447C}'
    +'.subj-view .subj-node.lv1 .nnum{font-size:15.5px}'
    +'.subj-view .subj-node.lv2 .nt{font-size:14.5px}'
    +'.subj-view .subj-node .role{font-size:11px;font-weight:700;color:#2A5B92;background:#EAF1FA;border:1px solid #D4E3F5;padding:1px 8px;border-radius:11px;flex-shrink:0}'
    +'.subj-view .subj-node .nref{font-size:11.5px;font-weight:600;color:#5A6B80;background:#F4F6F9;border:1px solid #E4E9F0;padding:1px 8px;border-radius:6px;line-height:1.5}'
    +'.subj-view .subj-node .nref.pan{color:#7A5A2E;background:#FBF6EC;border-color:#EEDFC4}'
    +'.subj-view .subj-node .nb{margin:5px 0 2px;color:#334155;line-height:1.74;white-space:pre-wrap}'
    +'.subj-view .subj-node .subj-copy{border:none;background:#EEF3F9;color:#64748B;border-radius:6px;width:24px;height:24px;cursor:pointer;flex-shrink:0;font-size:12px}'
    +'.subj-view .subj-node.hit{background:#F1FBF6;border-radius:8px;box-shadow:inset 3px 0 0 #57C08A;padding-left:12px;margin-left:0}'
    +'.subj-view .subj-node.hit.lv2,.subj-view .subj-node.hit.lv3,.subj-view .subj-node.hit.lv4{margin-left:12px}'
    +'.subj-view .subj-node.miss{background:#FEF6F5;border-radius:8px;box-shadow:inset 3px 0 0 #E58A82;padding-left:12px}'
    // ── 채점 결과 카드/체크 ──
    +'.subj-view .subj-chk{display:flex;align-items:flex-start;gap:7px;padding:6px 10px;border-radius:8px;margin:4px 0;background:#F8FAFC;border:1px solid #EEF2F6}'
    +'.subj-view .subj-chk.hit{background:#F1FBF6;border-color:#D6F0E3}.subj-view .subj-chk.miss{background:#FEF6F5;border-color:#F6DDD9}'
    +'.subj-view .subj-chk .mk{font-weight:800;flex-shrink:0}.subj-view .subj-chk.hit .mk{color:#1F9D6B}.subj-view .subj-chk.miss .mk{color:#C0503F}'
    +'.subj-view .subj-feed{background:#F8FAFC;border:1px solid #EEF2F6;border-radius:8px;padding:9px 11px;color:#334155;line-height:1.7}'
    // ── 개념설명: 객관식 .concept-box/.cc-ex 스타일을 style.css #mcqView 한 곳에서 공유(여기서 중복 정의 안 함). subj-copy만 유지 ──
    +'.subj-view .concept-box .subj-copy{border:none;background:#EEF3F9;color:#64748B;border-radius:6px;width:24px;height:24px;cursor:pointer;font-size:12px}'
    // ⚡ 시험 포인트 박스
    +'.subj-view .subj-tip{margin:12px 0;border:1px solid #F1DFAE;background:linear-gradient(0deg,#FFFDF7,#FFF9EC);border-left:4px solid #E5A93C;border-radius:12px;padding:11px 13px}'
    +'.subj-view .subj-tip-hd{font-weight:800;color:#A8720F;margin-bottom:5px;font-size:13.5px}'
    +'.subj-view .subj-tip-bd{color:#5B4A28;line-height:1.72;font-size:14px;white-space:pre-wrap}'
    +'.subj-view .subj-lecture{margin:12px 0 4px;border:1px solid #D9CBF3;border-radius:12px;background:#FBF9FF;overflow:hidden}'
    +'.subj-view .subj-lec-hd{padding:11px 13px;font-weight:800;color:#5B3FA0;font-size:13.5px;cursor:pointer;display:flex;align-items:center;gap:6px;background:#F3ECFB}'
    +'.subj-view .subj-lec-tg{margin-left:auto;font-size:11px;font-weight:700;color:#8A73C0}'
    +'.subj-view .subj-lec-bd{padding:12px 13px}'
    +'.subj-view .lec-sec{margin:0 0 11px}'
    +'.subj-view .lec-k{font-size:11.5px;font-weight:800;color:#6D28D9;margin-bottom:4px}'
    +'.subj-view .lec-v{font-size:13.5px;color:#3C3550;line-height:1.72;white-space:pre-wrap}'
    +'.subj-view .lec-steps{margin:2px 0 0;padding-left:20px}'
    +'.subj-view .lec-steps li{font-size:13.5px;color:#3C3550;line-height:1.7;margin:3px 0}'
    +'.subj-view .lec-more{margin:2px 0 0}'
    +'.subj-view .lec-more-hd{font-size:13px;font-weight:800;color:#2563EB;cursor:pointer;padding:7px 0;user-select:none}'
    +'.subj-view .lec-more-bd{margin-top:3px}'
    +'.subj-view .lec-arrow{text-align:center;color:#C0B6DA;font-size:14px;margin:5px 0}'
    +'.subj-view .lec-step{padding:5px 0}'
    +'.subj-view .lec-step-h{font-size:13.5px;font-weight:800;color:#312B4A;line-height:1.6}'
    +'.subj-view .lec-step-txt{font-size:13px;color:#4B4368;line-height:1.75;margin:5px 0 0}'
    +'.subj-view .lec-step-calc{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;color:#0C447C;background:#F6F3FC;border:1px solid #ECE4F8;border-radius:7px;padding:6px 10px;margin:6px 0 0;white-space:pre-wrap;line-height:1.65;word-break:break-all}'
    +'.subj-view .lec-tip .lec-k{color:#A8720F}.subj-view .lec-tip{background:#FFFDF7;border:1px solid #F1DFAE;border-radius:8px;padding:8px 10px}'
    +'.subj-view .lec-recall .lec-k{color:#137a52}.subj-view .lec-recall{background:#EAF7F0;border:1px solid #BfE7D4;border-radius:8px;padding:8px 10px}';
    document.head.appendChild(st); }
  function isLawRef(ref){ return ref && /제\d+조/.test(ref); }
  function userCitesLaw(ansN, ref){ var arts=ref.match(/제\d+조(?:제\d+항)?/g)||[];
    var LAWS=['토지보상법','공익사업을위한','국토계획법','국토의계획','행정소송법','행정심판법','감칙','감정평가에관한규칙','실무기준','부동산가격공시법','부동산가격공시'];
    var lawOK=LAWS.some(function(L){return ansN.indexOf(norm(L))>=0;});
    var artOK=arts.some(function(a){return ansN.indexOf(norm(a))>=0;});
    return lawOK && artOK; }

  // ── 오프라인 채점(논점+법조문) ──
  function gradeOffline(ask, rowsText){
    var ansN=norm(rowsText); var nodes=ask.outline||[];
    // 목차(논점) 맞춤 + 내용 충실도(키워드 커버리지)를 분리 채점.
    // 예전엔 논점 키워드 1개만 스쳐도 만점(hit)이라 '목차만 적어도' 후했음 → 부분점수(cov)로 개선.
    var breadthHit=0, depthSum=0, nodeRes=[];
    nodes.forEach(function(n){
      var kws=(n.kw||[]);
      var mc=kws.filter(function(k){return ansN.indexOf(norm(k))>=0;}).length;
      var cov=kws.length? mc/kws.length : 0;      // 그 논점 내용을 얼마나 채웠나(0~1)
      var touched=cov>0;                           // 논점을 건드리긴 했나
      if(touched) breadthHit++;
      depthSum+=cov;
      nodeRes.push({h:n.h,matched:touched,cov:cov,kw:kws});
    });
    var breadth=nodes.length? breadthHit/nodes.length : 0;   // 목차(논점) 맞춤 비율
    var depth=nodes.length? depthSum/nodes.length : 0;       // 내용 충실도
    var refNodes=nodes.filter(function(n){return isLawRef(n.ref);}); var refHit=0, refRes=[];
    refNodes.forEach(function(n){ var c=userCitesLaw(ansN,n.ref); if(c)refHit++; refRes.push({h:n.h,ref:n.ref,cited:c}); });
    var refRatio=refNodes.length? refHit/refNodes.length : 1;   // 표시용(법조문 없으면 해당없음)
    // 목차 맞춤은 일부만, 내용 충실이 주(主). 법조문 노드가 있을 때만 그 배점을 반영(없는데 공짜 점수 주던 버그 제거).
    var base = refNodes.length ? (breadth*0.30 + depth*0.50 + (refHit/refNodes.length)*0.20)
                               : (breadth*0.40 + depth*0.60);
    var score=Math.round((ask.pt||10)*base);
    return { mode:'offline', score:score, pt:ask.pt||10, nodeHit:breadthHit, nodeTot:nodes.length, refHit:refHit, refTot:refNodes.length,
      ratio:breadth, refRatio:refRatio, nodeRes:nodeRes, refRes:refRes };
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
  // ⚡ 시험포인트(exp.tip) — 출제위원 관점 답안 작성 전략. 물음 아래 강조 박스.
  // 문항 exp.tip → 객관식 tipBlockHTML 그대로 재사용(⚡ 시험 포인트, 빨간 타이틀). 미로드 시에만 자체 폴백.
  function expTipHtml(q){ if(typeof window!=='undefined' && typeof window.tipBlockHTML==='function') return window.tipBlockHTML(q);
    var t=q&&q.exp&&q.exp.tip; if(!t||!String(t).trim()) return '';
    return '<div class="subj-tip"><div class="subj-tip-hd">⚡ 시험 포인트</div><div class="subj-tip-bd">'+esc(String(t))+'</div></div>'; }
  // 문제에 나온 핵심 개념 설명 박스 + 문제-level AI 질문 위젯
  // 객관식 .concept-box 형태 공유 + 주관식만 접고펴기(.cpt-col). 복사→AI 질문칸.
  // 객관식(index.html) 개념설명 마크업/클래스를 그대로 사용 — .concept-box/.concept-ti/.concept-row + .cc-ex(좌측 파란 테두리 예시박스). CSS는 style.css #mcqView 한 곳에서만 관리.
  function conceptHtml(q){ if(!(q.concepts&&q.concepts.length)) return '';
    var rows=q.concepts.map(function(c,i){ if(!c||!c.term) return '';
      var exTxt=c.ex||c.example||c.eg||'';
      var copy=(_opts.explainAi?'<button class="subj-copy" data-cpt="'+i+'" title="이 개념을 AI 질문칸에 복사">📋</button>':'');
      var row='<div class="concept-row"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px"><span style="font-weight:500;color:#0C447C">'+esc(c.term)+'</span>'+copy+'</div>'
        +(c.def?'<div>'+esc(c.def)+'</div>':'')+'</div>';
      if(exTxt) row+='<div class="cc-ex">'+esc(exTxt)+'</div>';
      return row; }).join('');
    return '<div class="concept-box"><div class="concept-ti">개념설명</div>'+rows+'</div>'+_subjAskWidget();
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
  var _opts={}, _rootEl=null, _curSet=null;
  function _setOf(q){ return (q&&(q.set||q.round||q._year||q._round))||null; }
  function _sets(exam){ var out=[],seen={}; (exam.questions||[]).forEach(function(q){ var s=_setOf(q); if(s!=null&&!seen[s]){seen[s]=1;out.push(s);} }); return out; }
  function _localNum(exam,qi){ var s=_setOf(exam.questions[qi]); if(s==null) return qi+1; var n=0; for(var i=0;i<=qi;i++){ if(_setOf(exam.questions[i])===s) n++; } return n; }
  function mount(el, exam, opts){ _opts=opts||{}; if(opts&&opts.endpoint) ENDPOINT=opts.endpoint;
    _rootEl=el; _curSet=null; _renderRoot(exam); }
  function _renderRoot(exam){ _rootEl.innerHTML='';
    if(_curSet==null && _sets(exam).length>1) _rootEl.appendChild(buildSetList(exam));
    else _rootEl.appendChild(buildList(exam,_curSet)); }
  // ── 1차(객관식)와 동일한 카드 스타일 주입 (style.css의 #mcqView 규칙을 #subjMount로 복제) ──
  function _injectSkin(){ if(document.getElementById('subjSkin1cha')) return;
    var st=document.createElement('style'); st.id='subjSkin1cha';
    st.textContent=
    '#subjMount .scard{border-radius:16px;border:1.5px solid #E2E8F0;overflow:hidden;background:#fff;margin-bottom:10px}'
    +'#subjMount .scard-hd{display:flex;align-items:center;gap:10px;padding:14px 15px;cursor:pointer;user-select:none}'
    +'#subjMount .sdot{width:6px;height:6px;border-radius:50%;background:#0C447C;flex-shrink:0}'
    +'#subjMount .snm{font-size:14px;font-weight:800;flex:1;color:#0F172A}'
    +'#subjMount .scard-set-label{font-size:11px;font-weight:600;color:#64748B;background:#F8FAFC;border:1px solid #E2E8F0;padding:2px 9px;border-radius:20px;flex-shrink:0}'
    +'#subjMount .scard-arrow{width:24px;height:24px;border-radius:50%;background:#F1F5F9;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94A3B8;transition:transform .2s;flex-shrink:0}'
    +'#subjMount .scard-arrow.open{transform:rotate(180deg)}'
    +'#subjMount .scard-body{border-top:1px solid #F1F5F9}'
    +'#subjMount .srow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 15px;border-bottom:1px solid #F1F5F9;flex-wrap:wrap}'
    +'#subjMount .srow:last-child{border-bottom:none}'
    +'#subjMount .srow-left{display:flex;flex-direction:column;gap:2px}'
    +'#subjMount .syr{font-size:13px;font-weight:700;color:#1E293B}'
    +'#subjMount .swc{font-size:11px;color:#94A3B8;font-weight:500}'
    +'#subjMount .b-go{background:#0C447C;color:#fff;padding:8px 18px;border-radius:8px;font-size:12px;font-weight:700;border:none;cursor:pointer}'
    +'#subjMount .sec-lbl{font-size:12px;font-weight:700;color:#94A3B8;margin:2px 2px 10px}'
    +'#subjMount .exam-back{background:#F1F5F9;border:none;color:#334155;cursor:pointer;width:36px;height:36px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;padding:0;font-size:18px;margin-bottom:12px}'
    +'#subjMount .s-hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}#subjMount .s-hd .t{font-size:18px;font-weight:800;color:#0C447C}'
    +'#subjMount .qstem{background:#fff;border-radius:14px;padding:14px 15px;margin-bottom:14px;box-shadow:0 1px 3px rgba(15,23,42,.07)}'
    +'#subjMount .qhead{display:flex;align-items:center;gap:8px;margin-bottom:11px}'
    +'#subjMount .qnum{font-size:12px;font-weight:800;color:#fff;background:#0F172A;min-width:25px;height:25px;padding:0 7px;border-radius:8px;display:flex;align-items:center;justify-content:center}'
    +'#subjMount .qsubj{font-size:10.5px;font-weight:800;color:#185FA5;background:#E6F1FB;border:1px solid #B5D4F4;padding:2px 8px;border-radius:6px}'
    +'#subjMount .qtext{font-size:13.5px;font-weight:500;line-height:1.62;color:#0F172A;white-space:pre-wrap}'
    +'#subjMount .jaryo{font-size:13.5px;font-weight:500;line-height:1.6;color:#334155;white-space:pre-wrap;background:#F8FAFC;border:1px solid #E2E8F0;border-left:3px solid #94A3B8;border-radius:8px;padding:11px 13px;margin:0 0 14px}'
    +'#subjMount .mq-report{margin-left:auto;display:inline-flex;align-items:center;gap:3px;font-size:11.5px;font-weight:700;color:#A86A2E;background:#FFF7EF;border:1.5px solid #F1D9A8;padding:4px 10px;border-radius:999px;cursor:pointer;flex-shrink:0}#subjMount .mq-report:active{transform:scale(.96)}';
    document.head.appendChild(st);
  }
  function buildSetList(exam){ _injectSkin(); var wrap=document.createElement('div');
    wrap.innerHTML='<div class="sec-lbl">회차 선택</div>';
    _sets(exam).forEach(function(s){ var cnt=(exam.questions||[]).filter(function(q){return _setOf(q)===s;}).length;
      var c=document.createElement('div'); c.className='scard';
      c.innerHTML='<div class="scard-hd"><span class="sdot"></span><span class="snm">'+esc(String(s))+'</span>'
        +'<span class="scard-set-label">'+cnt+'문제</span><span class="scard-arrow">▸</span></div>';
      c.querySelector('.scard-hd').onclick=function(){ _curSet=s; _renderRoot(exam); };
      wrap.appendChild(c); });
    return wrap; }
  function buildList(exam, setFilter){ _injectSkin(); var wrap=document.createElement('div');
    if(setFilter!=null && _sets(exam).length>1){ var b=document.createElement('button'); b.className='exam-back'; b.setAttribute('data-back','1'); b.textContent='‹'; b.title='회차 목록'; b.onclick=function(){ _curSet=null; _renderRoot(exam); }; wrap.appendChild(b); }
    var card=document.createElement('div'); card.className='scard';
    var hd='<div class="scard-hd"><span class="sdot"></span><span class="snm">'+esc(setFilter!=null?String(setFilter):(exam.name||'문제'))+'</span></div>';
    var body='<div class="scard-body">';
    (exam.questions||[]).forEach(function(q,qi){ if(setFilter!=null && _setOf(q)!==setFilter) return;
      var prev=esc(((q.q&&String(q.q).trim())?q.q:((q.asks&&q.asks[0]&&q.asks[0].q)||'')).slice(0,42));
      body+='<div class="srow" data-qi="'+qi+'"><div class="srow-left"><span class="syr">문제 '+_localNum(exam,qi)+'</span>'
        +'<span class="swc">'+prev+'… · '+(q.pt||'')+'점</span></div>'
        +'<div><button class="b-go">풀기</button></div></div>';
    });
    body+='</div>'; card.innerHTML=hd+body; wrap.appendChild(card);
    card.querySelectorAll('.srow').forEach(function(r){ r.onclick=function(){ openQ(exam, +r.getAttribute('data-qi')); }; });
    return wrap; }
  function openQ(exam,qi){ var host=_opts.host||document.getElementById(_opts.mountId)||document.body;
    var q=exam.questions[qi];
    if(_opts.canOpen && !_opts.canOpen(q&&q.id)){ return; }   // 무료 한도 게이트(있으면 검사, 없으면 스킵)
    var v=document.createElement('div'); v.className='subj-view';
    var refHtml=(q.refs&&q.refs.length)?('<details class="subj-refbox" open><summary class="rt" style="cursor:pointer;list-style:none;font-size:13px">💡 참조문헌 힌트 <span style="font-weight:400;color:#94A3B8">(실제 시험엔 안 나와요)</span></summary>'
      +q.refs.map(function(r){return '<div class="ri"><b>'+esc(r.law)+' '+esc(r.art)+'</b>'+(r.title?' ('+esc(r.title)+')':'')+'</div>';}).join('')+'</details>'):'';
    _injectSkin(); _injectSubjFont();
    v.innerHTML='<button class="exam-back" data-back="1">‹</button>'
      +'<div class="qstem"><div class="qhead"><span class="qnum">'+_localNum(exam,qi)+'</span>'
      +(_setOf(q)?('<span class="qsubj">'+esc(String(_setOf(q)))+'</span>'):'')
      +'<span class="scard-set-label">'+(q.pt||'')+'점</span></div>'
      +((q.q&&String(q.q).trim())?('<div class="jaryo">'+_subjJaryoHTML(q.q)+'</div>'):'')
      +'</div>'
      +'<div id="subj-asks"></div>'
      +expTipHtml(q)
      +refHtml
      +(q.note?'<div class="subj-note">'+esc(q.note)+'</div>':'')
      +conceptHtml(q);
    if(_opts.replace!==false){ host.innerHTML=''; }
    host.appendChild(v);
    v.querySelector('[data-back]').onclick=function(){ if(_rootEl){ _renderRoot(exam); } else { mount(host, exam, _opts); } };
    bindConcepts(v, exam, qi);
    var asksEl=v.querySelector('#subj-asks');
    (q.asks||[]).forEach(function(ask,ai){ asksEl.appendChild(buildAsk(exam,qi,ai)); });
  }
  // ── 상세 문제만 렌더(과목·회차 네비는 index의 객관식 코드가 담당) ──
  // host는 #mcqView 안이라 #mcqView CSS가 그대로 먹음. 내부 '뒤로/목록' 없음 — 이전/다음은 index가 감쌈.
  // 반환: false = 무료 한도 게이트에 막힘, true = 렌더됨.
  function openOne(host, exam, qi, opts){ _opts=opts||{}; if(opts&&opts.endpoint) ENDPOINT=opts.endpoint; _rootEl=null;
    _injectSubjFont();
    var q=exam.questions[qi]; if(!q) return false;
    if(_opts.canOpen && !_opts.canOpen(q&&q.id)){ return false; }
    var _host=host||_opts.host||document.getElementById(_opts.mountId)||document.body;
    var refHtml=(q.refs&&q.refs.length)?('<details class="subj-refbox" open><summary class="rt" style="cursor:pointer;list-style:none;font-size:13px">💡 참조문헌 힌트 <span style="font-weight:400;color:#94A3B8">(실제 시험엔 안 나와요)</span></summary>'
      +q.refs.map(function(r){return '<div class="ri"><b>'+esc(r.law)+' '+esc(r.art)+'</b>'+(r.title?' ('+esc(r.title)+')':'')+'</div>';}).join('')+'</details>'):'';
    var v=document.createElement('div'); v.className='subj-view';
    v.innerHTML='<div class="qstem"><div class="qhead"><div class="qnum">'+_localNum(exam,qi)+'</div>'
      +(_setOf(q)?('<span class="qsubj">'+esc(String(_setOf(q)))+'</span>'):'')
      +'<span class="scard-set-label">'+(q.pt||'')+'점</span>'
      +(_opts.onReport?'<button class="mq-report" data-report="1">⚠️ 신고</button>':'')+'</div>'
      +((q.q&&String(q.q).trim())?('<div class="jaryo">'+_subjJaryoHTML(q.q)+'</div>'):'')
      +'</div>'
      +'<div id="subj-asks"></div>'
      +expTipHtml(q)
      +refHtml
      +(q.note?'<div class="subj-note">'+esc(q.note)+'</div>':'')
      +conceptHtml(q);
    if(_opts.replace!==false){ _host.innerHTML=''; }
    _host.appendChild(v);
    var _rb=v.querySelector('[data-report]'); if(_rb) _rb.onclick=function(){ try{ _opts.onReport(q); }catch(e){} };
    bindConcepts(v, exam, qi);
    var asksEl=v.querySelector('#subj-asks');
    (q.asks||[]).forEach(function(ask,ai){ asksEl.appendChild(buildAsk(exam,qi,ai)); });
    return true;
  }
  function rowHTML(){ return '<div class="subj-arow" data-lv="1"><div class="rh">'
    +'<button class="lvbtn out" title="내어쓰기(상위 목차)">‹</button><button class="lvbtn in" title="들여쓰기(하위 목차)">›</button>'
    +'<span class="idx"></span>'
    +'<input class="h" placeholder="목차 (예: 사업인정의 의의)"><button class="add" title="이 단계에 목차 추가" style="border:none;background:#E6F4EA;color:#166534;width:26px;height:26px;border-radius:7px;font-size:17px;font-weight:700;cursor:pointer;margin-left:4px">+</button><button class="del" title="삭제">−</button></div>'
    +'<textarea class="d" placeholder="상세내용 — 법조문은 「토지보상법 제20조」처럼"></textarea></div>'; }
  // 레벨별 예시 placeholder (대 Ⅰ → 중 1 → 소 (1) → 세 가)
  var _PH_H=['','대목차 (예: 서설)','중목차 (예: 사업인정의 의의)','소목차 (예: 법적 성질)','세목차 (예: 처분성)'];
  var _PH_D=['','상세내용 (예: 이하 의의·성질·효과를 검토한다)','상세내용 — 근거 법조문은 「토지보상법 제20조」처럼','상세내용 — 학설·판례·검토 순으로','상세내용 — 판례 요지·사건번호'];
  // 대 Ⅰ · 중 1 · 소 (1) · 세 가 — 레벨별 자동번호 + 들여쓰기 + 예시 placeholder
  function reindex(box){ var c=[0,0,0,0]; box.querySelectorAll('.subj-arow').forEach(function(r){
    var lv=parseInt(r.getAttribute('data-lv')||'1',10); if(lv<1)lv=1; if(lv>4)lv=4;
    r.querySelector('.idx').textContent=_mokchaNum(lv,c);
    r.style.marginLeft=((lv-1)*18)+'px';
    var hEl=r.querySelector('.h'), dEl=r.querySelector('.d');
    if(hEl) hEl.setAttribute('placeholder',_PH_H[lv]); if(dEl) dEl.setAttribute('placeholder',_PH_D[lv]); }); }
  // 📘 계산 풀이(7단계 강의) 블록 — 실무 계산 물음에서 모범답안 아래 접기/펼치기로 노출
  function _lectureHtml(ask, uid){
    var L=ask&&ask.lecture; if(!L) return '';
    var open='<div class="subj-lecture"><div class="subj-lec-hd" data-open="0">📘 계산 풀이 (7단계 강의) <span class="subj-lec-tg">펼치기 ▾</span></div><div class="subj-lec-bd" style="display:none">';
    // 객관식 계산형 렌더(calc-render.js) 그대로 재사용 — 있으면 사용(별도 CSS 없이 style.css 클래스 공유)
    if(typeof window!=='undefined' && typeof window.certlabCalcHTML==='function'){
      var qLike={ id:'lt_'+String(uid||'x').replace(/[^a-zA-Z0-9_]/g,''), exp:{ approach:L.approach, principle:L.principle, exSum:L.exSum, s:L.s, tip:L.tip, recall:L.recall } };
      var rm=function(s){ return esc(String(s==null?'':s)).replace(/\n/g,'<br>'); };
      var inner=window.certlabCalcHTML(qLike, L.ex||[], rm);
      // ⚡ 시험 포인트 — 객관식 tipBlockHTML 그대로 재사용(빨간 ⚡ 타이틀, style.css #mcqView 공유)
      if(typeof window.tipBlockHTML==='function') inner+=window.tipBlockHTML(qLike);
      else if(L.tip) inner+='<div class="cx-sec"><div class="cx-h">시험 포인트</div><div class="cx-body">'+esc(L.tip)+'</div></div>';
      if(typeof window.certlabRecallHTML==='function') inner+=window.certlabRecallHTML(qLike, rm);
      return open+inner+'</div></div>';
    }
    // 폴백(calc-render.js 미로드 시) — 자체 렌더
    var h=open;
    if(L.approach) h+='<div class="lec-sec"><div class="lec-k">접근</div><div class="lec-v">'+esc(L.approach)+'</div></div>';
    if(L.principle) h+='<div class="lec-sec"><div class="lec-k">원리</div><div class="lec-v">'+esc(L.principle)+'</div></div>';
    if(Array.isArray(L.exSum)&&L.exSum.length){ h+='<div class="lec-sec"><div class="lec-k">요약풀이</div><ol class="lec-steps">'; L.exSum.forEach(function(s){ h+='<li>'+esc(s)+'</li>'; }); h+='</ol></div>'; }
    if(Array.isArray(L.ex)&&L.ex.length){ h+='<div class="lec-more"><div class="lec-more-hd" data-open="0">▶ 상세풀이 보기</div><div class="lec-more-bd" style="display:none">';
      L.ex.forEach(function(s,i){ if(i>0) h+='<div class="lec-arrow">↓</div>'; var lines=String(s==null?'':s).split('\n'); var head=(lines[0]||'').trim();
        h+='<div class="lec-step"><div class="lec-step-h">'+(i+1)+'. '+esc(head)+'</div>';
        lines.slice(1).forEach(function(ln){ ln=ln.trim(); if(!ln) return; var isCalc=/[=×÷≒]/.test(ln);
          h+='<div class="lec-step-'+(isCalc?'calc':'txt')+'">'+esc(ln)+'</div>'; });
        h+='</div>';
      });
      h+='</div></div>'; }
    if(L.s) h+='<div class="lec-sec"><div class="lec-k">최종정리</div><div class="lec-v">'+esc(L.s)+'</div></div>';
    if(L.tip) h+='<div class="lec-sec lec-tip"><div class="lec-k">⚡ 시험 포인트</div><div class="lec-v">'+esc(L.tip)+'</div></div>';
    if(L.recall) h+='<div class="lec-sec lec-recall"><div class="lec-k">🧠 암기 포인트</div><div class="lec-v">'+esc(L.recall)+'</div></div>';
    return h+'</div></div>';
  }
  function buildAsk(exam,qi,ai){ var ask=exam.questions[qi].asks[ai];
    var d=document.createElement('div'); d.className='subj-ask';
    d.innerHTML='<div class="subj-q"><span class="num">물음 '+(ask.n||ai+1)+')</span> '+esc(_brkMarkers(ask.q)).replace(/\n/g,'<br>')+' <span class="subj-pt">'+(ask.pt||'')+'점</span></div>'
      +'<div class="subj-rows">'+rowHTML()+rowHTML()+rowHTML()+'</div>'
      +'<div class="subj-btns"><button class="subj-grade">채점하기</button>'
      +(_sellsAi()?('<button class="subj-ai">🤖 AI 채점(첨삭)'+(_hasEnt()?(' <span class="subj-lock">'+_cost()+'회 차감·잔액 '+_bal()+'</span>'):' <span class="subj-lock">🔒 '+_cost()+'회</span>')+'</button>'):'')
      +'<button class="subj-model">모범답안</button>'
      +(_opts.demo?'<button class="subj-demo">🎬 AI 첨삭 예시</button>':'')+'</div>'
      +((_sellsAi()&&!_hasEnt())?('<div class="subj-aihint">🔒 AI 채점(첨삭)은 감평 채점위원 수준의 서술 첨삭으로, <b>충전 횟수</b>로 이용해요. 회원권과 별도 · 1건당 <b>'+_cost()+'회</b> 차감. 버튼을 누르면 충전 안내가 떠요.</div>'):'')
      +'<div class="subj-res"></div>'
      +_lectureHtml(ask, (exam.questions[qi].id||('q'+qi))+'_'+(ask.n||ai));
    var _lh=d.querySelector('.subj-lec-hd'); if(_lh) _lh.onclick=function(){ var bd=d.querySelector('.subj-lec-bd'), tg=d.querySelector('.subj-lec-tg'); var op=_lh.getAttribute('data-open')==='1'; if(op){ bd.style.display='none'; _lh.setAttribute('data-open','0'); if(tg)tg.textContent='펼치기 ▾'; } else { bd.style.display='block'; _lh.setAttribute('data-open','1'); if(tg)tg.textContent='접기 ▴'; } };
    var _lm=d.querySelector('.lec-more-hd'); if(_lm) _lm.onclick=function(){ var b=d.querySelector('.lec-more-bd'); var op=_lm.getAttribute('data-open')==='1'; b.style.display=op?'none':'block'; _lm.setAttribute('data-open',op?'0':'1'); _lm.textContent=op?'▶ 상세풀이 보기':'▼ 상세풀이 접기'; };
    var box=d.querySelector('.subj-rows'); reindex(box);
    var _addBtn=d.querySelector('.subj-add'); if(_addBtn) _addBtn.onclick=function(){ box.insertAdjacentHTML('beforeend',rowHTML()); bindRow(box); reindex(box); };
    bindRow(box);
    function rows(){ var out=[]; box.querySelectorAll('.subj-arow').forEach(function(r){ out.push({h:r.querySelector('.h').value, d:r.querySelector('.d').value}); }); return out; }
    function text(){ return rows().map(function(r){return r.h+' '+r.d;}).join('  '); }
    d.querySelector('.subj-grade').onclick=function(){ var t=text(); if(norm(t).length<4){ alert('목차/내용을 먼저 적어주세요.'); return; }
      var _r=gradeOffline(ask,t); showResult(d, _r, exam, qi, ai);
      // 레벨테스트 등에서 오프라인 채점 점수도 받도록(opts.reportOffline일 때만) onGraded 호출
      try{ if(_opts.reportOffline && _opts.onGraded){ var q=exam.questions[qi], ak=q.asks[ai];
        _opts.onGraded({ qid:(q.id||('q'+qi))+'#'+(ak.n||ai+1), question:(q.q||'')+' / '+(ak.q||''), answer:t, score:_r.score, pt:_r.pt||ak.pt, mode:'offline' }); } }catch(_e){} };
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
    var _mbtn=d.querySelector('.subj-model');
    _mbtn.onclick=function(){ var R=d.querySelector('.subj-res');
      if(_mbtn.getAttribute('data-open')==='1'){   // 열려 있으면 닫기
        R.className='subj-res'; R.innerHTML=''; _mbtn.removeAttribute('data-open'); _mbtn.textContent='모범답안'; return; }
      showResult(d, null, exam, qi, ai); _mbtn.setAttribute('data-open','1'); _mbtn.textContent='답안 닫기'; };
    var _demoBtn=d.querySelector('.subj-demo');
    if(_demoBtn) _demoBtn.onclick=function(){
      var nodes=ask.outline||[]; if(!nodes.length) return;
      var half=Math.max(1,Math.ceil(nodes.length/2)); var written=nodes.slice(0,half);
      // 절반 정도 쓴 예시답안을 입력행에 채움
      box.innerHTML=''; written.forEach(function(n){ var tmp=document.createElement('div'); tmp.innerHTML=rowHTML();
        var nr=tmp.firstChild; nr.setAttribute('data-lv',n.lv||1); nr.querySelector('.h').value=n.h||''; nr.querySelector('.d').value=String(n.body||'').slice(0,140); box.appendChild(nr); });
      bindRow(box); reindex(box);
      // 모의 AI 첨삭 결과 표시(실제 채점 아님 · 데모)
      showResult(d, _demoAiResult(ask, half), exam, qi, ai);
      d.querySelector('.subj-res').scrollIntoView({behavior:'smooth',block:'nearest'});
    };
    return d;
  }
  // 데모용 모의 AI 첨삭 결과(절반 답안 기준) — 실제 채점 아님
  function _demoAiResult(ask, writtenCount){
    var nodes=ask.outline||[]; var pt=ask.pt||10;
    var perNode=nodes.map(function(n,i){ var w=i<writtenCount;
      var level = w ? (i<writtenCount-1?2:1) : 0;
      var comment = level>=2 ? '논점을 정확히 서술했습니다. 근거와 결론의 연결이 자연스럽습니다.'
        : level===1 ? '방향은 맞으나 근거·구체성이 부족합니다. 법조문·판례를 덧대면 좋습니다.'
        : '이 논점이 답안에 빠졌습니다. 반드시 포함해야 감점을 피할 수 있습니다.';
      return { h:n.h, level:level, comment:comment }; });
    var got=perNode.reduce(function(s,p){ return s+(p.level>=2?1:p.level===1?0.5:0); },0);
    var score=Math.round(pt*got/Math.max(1,nodes.length));
    var nodeRes=nodes.map(function(n,i){ return { h:n.h, matched:i<writtenCount }; });
    var feedback='서두에서 쟁점을 제시하고 앞부분 논점을 잘 전개했습니다. 다만 답안의 뒷부분(결론·일부 논점)이 빠져 있어 완성도가 떨어집니다. 누락된 논점을 채우고 각 논점마다 근거(법조문·판례)를 한 줄씩 명시하면 점수가 크게 오릅니다.';
    return { mode:'llm', score:score, pt:pt, feedback:feedback, perNode:perNode, nodeRes:nodeRes };
  }
  function bindRow(box){ box.querySelectorAll('.subj-arow .del').forEach(function(btn){ btn.onclick=function(){
    if(box.querySelectorAll('.subj-arow').length<=1){ btn.closest('.subj-arow').querySelector('.h').value=''; btn.closest('.subj-arow').querySelector('.d').value=''; return; }
    btn.closest('.subj-arow').remove(); reindex(box); }; });
    box.querySelectorAll('.subj-arow .lvbtn').forEach(function(btn){ btn.onclick=function(){ var row=btn.closest('.subj-arow'); var lv=parseInt(row.getAttribute('data-lv')||'1',10);
      lv = btn.classList.contains('in') ? Math.min(4,lv+1) : Math.max(1,lv-1); row.setAttribute('data-lv',lv); reindex(box); }; });
    box.querySelectorAll('.subj-arow .add').forEach(function(btn){ btn.onclick=function(){ var row=btn.closest('.subj-arow'); var lv=row.getAttribute('data-lv')||'1';
      var tmp=document.createElement('div'); tmp.innerHTML=rowHTML(); var nr=tmp.firstChild; nr.setAttribute('data-lv',lv);   /* [ADD 2026-07-17] 이 단계 목차를 바로 아래 형제로 추가 */
      row.parentNode.insertBefore(nr, row.nextSibling); bindRow(box); reindex(box); nr.querySelector('.h').focus(); }; }); }

  function modelHtml(ask, nodeRes){ var mm={}; (nodeRes||[]).forEach(function(r){ mm[r.h]=r.matched; });
    var c=[0,0,0,0];
    var showCopy=!!_opts.explainAi;
    return (ask.outline||[]).map(function(nd,idx){ var lv=nd.lv||1; if(lv<1)lv=1; if(lv>4)lv=4; var st=(mm[nd.h]===true)?'hit':(mm[nd.h]===false)?'miss':'';
      var num=_mokchaNum(lv,c);
      var isPan=/판례|대법원/.test(String(nd.ref||''));
      return '<div class="subj-node lv'+lv+' '+st+'"><div class="nh"><span class="nnum">'+num+'</span>'
        +'<span class="nt">'+esc(nd.h)+'</span>'
        +(nd.role?'<span class="role role-'+esc(nd.role)+'">'+esc(nd.role)+'</span>':'')
        +(nd.ref?'<span class="nref'+(isPan?' pan':'')+'">'+(isPan?'⚖️ ':'📖 ')+esc(_abbrLaw(nd.ref))+'</span>':'')
        +(showCopy?'<button class="subj-copy" data-i="'+idx+'" title="이 논점을 AI 질문칸에 복사">📋</button>':'')+'</div>'
        +(nd.body?'<div class="nb">'+_subjJaryoHTML(nd.body)+'</div>':'')+'</div>'; }).join(''); }

  function showResult(d, res, exam, qi, ai){ var ask=exam.questions[qi].asks[ai]; var R=d.querySelector('.subj-res'); R.className='subj-res on';
    if(res!=null){ var _mb=d.querySelector('.subj-model'); if(_mb){ _mb.removeAttribute('data-open'); _mb.textContent='모범답안'; } }   // 채점/AI 결과 표시 시 모범답안 버튼 원위치
    if(!res){ R.innerHTML='<div class="subj-sect">모범답안 목차</div>'+modelHtml(ask,null)+rateBar(exam,qi,ai)+_subjAskWidget(); bindNodes(R); bindAsk(R,exam,qi,ai); bindRate(R,exam,qi,ai); return; }
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
    h+='<div class="subj-sect">모범답안 목차 대조</div>'+modelHtml(ask,res.nodeRes)+rateBar(exam,qi,ai)+_subjAskWidget();
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

  window.CLSubj={ mount:mount, openOne:openOne, gradeOffline:gradeOffline, setEndpoint:function(u){ENDPOINT=u;} };
})();
