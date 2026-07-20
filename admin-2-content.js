// ===== 🎛 인터랙티브 마스터 (Firestore interactives CRUD · template+params) =====
var _itvmAll={}, _itvmLoaded=false, _itvmImpBound=false, _itvmImpData=null;
var _ITV_TEMPLATES=['T1_curve_slider','T5_inventory_flow','T2_timeline','T_risk_return','T_duration','T_cvp','T_eup','T_lcnrv','T_eps','T_eva','T_capint','T_fvpl','T_moving_avg','T_price_index','T_pred_value','T_weighted_mean'];
function itvmEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function itvmInit(){
  if(!_itvmLoaded) itvmLoad();
  if(!_itvmImpBound){ _itvmImpBound=true;
    var drop=document.getElementById('itvmImpDrop'), file=document.getElementById('itvmImpFile');
    if(drop) drop.onclick=function(){ file&&file.click(); };
    if(file) file.addEventListener('change', function(e){ itvmImpHandle(e.target.files); });
    if(drop){
      ['dragover','dragenter'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#7C3AED';}); });
      ['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#CBD5E1';}); });
      drop.addEventListener('drop', function(e){ itvmImpHandle(e.dataTransfer.files); });
    }
  }
}
async function itvmLoad(){
  var st=document.getElementById('itvmStatus'); if(st){ st.style.color='#7F77DD'; st.textContent='불러오는 중…'; }
  try{
    var snap=await db.collection('interactives').get();
    _itvmAll={}; snap.forEach(function(d){ _itvmAll[d.id]=d.data()||{}; });
    _itvmLoaded=true;
    if(st) st.textContent='등록 '+Object.keys(_itvmAll).length+'개';
    itvmRenderList();
  }catch(e){ if(st){ st.style.color='#A32D2D'; st.textContent='로드 실패: '+e.message; } }
}
function itvmRenderList(){
  var el=document.getElementById('itvmList'); if(!el) return;
  el.innerHTML=masterListHTML('itvm', _itvmAll, '등록된 인터랙티브 없음. "+ 새 인터랙티브"로 추가하세요.', function(id){
    var g=_itvmAll[id]||{};
    var tmpl=g.template||'(템플릿 없음)';
    var pcount=(g.params&&typeof g.params==='object')?Object.keys(g.params).length:0;
    return '<div style="border:1px solid #EEE;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff">'
      +'<div class="m-meta"><span class="m-meta-tag">🔒 식별용 · 사용자에게 안 보임</span>'
      +'<div class="m-name">'+itvmEsc(g.name||'(이름없음)')+' <span class="m-id">'+itvmEsc(id)+'</span> <span class="m-badge">'+itvmEsc(tmpl)+'</span></div>'
      +'<div class="m-meta-sub">'+((g.certs&&g.certs.length)?'시험 '+itvmEsc(g.certs.join(', '))+' · ':'')+'params '+pcount+'개 · <span class="ref">itv://'+itvmEsc(id)+'</span></div></div>'
      +'<hr class="m-div"><div class="m-userlabel">🎛 템플릿 · params</div>'
      +'<div class="m-render" style="font-size:12px;color:#475569"><b>'+itvmEsc(tmpl)+'</b>'
        +((g.concepts&&g.concepts.length)?'<br>개념: '+itvmEsc(g.concepts.join(', ')):'')
        +'<details style="margin-top:6px"><summary style="cursor:pointer;color:#64748B">params 보기</summary><pre style="white-space:pre-wrap;font-size:11px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px;margin:6px 0 0;max-height:220px;overflow:auto">'+itvmEsc(JSON.stringify(g.params||{},null,2))+'</pre></details></div>'
      +'<div class="m-foot">'
      +'<button class="btn-sm" onclick="itvmEdit(\''+id+'\')" style="background:#EDE9FE;color:#5B21B6">편집</button>'
      +'<button class="btn-sm" onclick="itvmDelete(\''+id+'\')" style="background:#FDE2E1;color:#A32D2D">삭제</button></div>'
      +'</div>';
  });
}
function _itvmCsv(id){ return (document.getElementById(id).value||'').split(',').map(function(x){return x.trim();}).filter(Boolean); }
function itvmFill(g){
  document.getElementById('itvmIdField').value=g.id||'';
  document.getElementById('itvmNameField').value=g.name||'';
  document.getElementById('itvmTitleField').value=g.title||'';
  document.getElementById('itvmStoryField').value=g.story||'';
  document.getElementById('itvmTemplateField').value=g.template||'';
  document.getElementById('itvmParamsField').value=g.params?JSON.stringify(g.params,null,2):'';
  document.getElementById('itvmConceptsField').value=(g.concepts||[]).join(', ');
  document.getElementById('itvmCertsField').value=(g.certs||[]).join(', ');
  document.getElementById('itvmKwField').value=(g.keywords||[]).join(', ');
  document.getElementById('itvmNoteField').value=g.note||'';
  itvmValidateId(); itvmPreview();
}
function itvmNew(){ itvmFill({}); document.getElementById('itvmIdField').disabled=false; document.getElementById('itvmEditTi').textContent='새 인터랙티브'; document.getElementById('itvmEditor').style.display=''; }
function itvmEdit(id){ itvmFill(Object.assign({id:id},_itvmAll[id]||{})); document.getElementById('itvmIdField').disabled=true; document.getElementById('itvmEditTi').textContent='인터랙티브 편집: '+id; document.getElementById('itvmEditor').style.display=''; }
function itvmCancel(){ document.getElementById('itvmEditor').style.display='none'; }
function itvmValidateId(){
  var id=document.getElementById('itvmIdField').value.trim(); var w=document.getElementById('itvmIdWarn');
  if(!id){ if(w){w.textContent='';} return false; }
  if(!/^itv_[a-z0-9_]+$/.test(id)){ if(w){w.style.color='#A32D2D';w.textContent='✗ itv_ + 영문소문자/숫자/_ 만 (예: itv_npv_irr)';} return false; }
  if(w){ w.style.color='#15793F'; w.textContent='✓ 형식 OK'; } return true;
}
function itvmParse(){
  var err='';
  var template=document.getElementById('itvmTemplateField').value.trim();
  var paramsRaw=document.getElementById('itvmParamsField').value.trim();
  var params=null; if(paramsRaw){ try{ params=JSON.parse(paramsRaw); }catch(e){ err='params JSON 오류: '+e.message; } }
  return [{ template:template, params:params }, err];
}
function itvmPreview(){
  var p=itvmParse(), g=p[0], err=p[1];
  var box=document.getElementById('itvmPrev'); if(!box) return;
  if(err){ box.innerHTML='<div style="color:#A32D2D;font-size:12px">⚠️ '+itvmEsc(err)+'</div>'; return; }
  var known=_ITV_TEMPLATES.indexOf(g.template)>=0;
  box.innerHTML='<div style="font-size:12px;color:#475569">템플릿: <b>'+itvmEsc(g.template||'(없음)')+'</b> '
    +(known?'<span style="color:#15793F">✓ 지원</span>':'<span style="color:#A32D2D">✗ 미지원</span>')
    +'<pre style="white-space:pre-wrap;font-size:11px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px;margin:6px 0 0;max-height:240px;overflow:auto">'+itvmEsc(JSON.stringify(g.params||{},null,2))+'</pre>'
    +'<div style="color:#94A3B8;margin-top:4px">실제 동작은 앱에서 렌더됩니다(itv://'+itvmEsc(document.getElementById('itvmIdField').value.trim()||'id')+').</div></div>';
}
async function itvmSave(){
  var id=document.getElementById('itvmIdField').value.trim();
  if(!itvmValidateId()){ alert('id 형식: itv_ + 영문 소문자/숫자/_ (예: itv_npv_irr)'); return; }
  var p=itvmParse(), g=p[0], err=p[1];
  if(err){ alert(err); return; }
  if(!g.template){ alert('template을 선택하세요.'); return; }
  if(_ITV_TEMPLATES.indexOf(g.template)<0 && !confirm('미지원 템플릿("'+g.template+'")입니다. 그래도 저장할까요? (앱에서 "템플릿 미지원"으로 표시됨)')) return;
  var rec={ name:document.getElementById('itvmNameField').value.trim(),
    title:document.getElementById('itvmTitleField').value.trim(), story:document.getElementById('itvmStoryField').value.trim(),
    template:g.template, params:(g.params&&typeof g.params==='object')?g.params:null,
    concepts:_itvmCsv('itvmConceptsField'), certs:_itvmCsv('itvmCertsField'),
    keywords:_itvmCsv('itvmKwField'), note:document.getElementById('itvmNoteField').value.trim(),
    updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
  try{ await db.collection('interactives').doc(id).set(rec); _itvmAll[id]=_cacheRec(rec); itvmRenderList();
    var st=document.getElementById('itvmStatus'); if(st){ st.style.color='#15793F'; st.textContent='저장됨: '+id+' (총 '+Object.keys(_itvmAll).length+'개)'; }
    itvmCancel();
  }catch(e){ alert('저장 실패: '+e.message); }
}
async function itvmDelete(id){
  if(!confirm(id+' 인터랙티브를 삭제할까요?')) return;
  try{ await db.collection('interactives').doc(id).delete(); delete _itvmAll[id]; itvmRenderList();
    var st=document.getElementById('itvmStatus'); if(st){ st.style.color='#A32D2D'; st.textContent='삭제됨: '+id+' (총 '+Object.keys(_itvmAll).length+'개)'; }
  }catch(e){ alert('삭제 실패: '+e.message); }
}
async function itvmExport(){
  if(!Object.keys(_itvmAll).length){ try{ var _s=await db.collection('interactives').get(); _itvmAll={}; _s.forEach(function(d){ _itvmAll[d.id]=d.data()||{}; }); }catch(e){ alert('로드 실패: '+e.message); return; } }
  var ids=Object.keys(_itvmAll);
  if(_mexpScope) ids=ids.filter(function(id){ return _mexpKeep(id,_itvmAll[id]); });
  if(!ids.length){ alert('등록된 인터랙티브가 없어요.'); return; }
  var _xnow=_kstISO(new Date());
  var arr=ids.map(function(id){ var r=Object.assign({id:id}, _itvmAll[id]); r.updatedAt=_uaISO(r.updatedAt, new Date()); return r; });
  if(!_qcMasterExportGate('인터랙티브', arr, (QC&&QC.interactiveAudit))) return;   // ← 내보내기 검수 게이트(ITV_NO_PARAMS 등)
  var bundle={ _meta:{ generatedAt:_xnow }, interactives:arr, exportedAt:_xnow, count:arr.length };
  var blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob); var a=document.createElement('a');
  a.href=url; a.download='certlab_interactives'+_mexpSuffix()+'_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  var st=document.getElementById('itvmStatus'); if(st){ st.style.color='#15793F'; st.textContent='✅ 백업 '+arr.length+'개 다운로드'; }
}
function itvmImpHandle(fileList){
  var f=[].slice.call(fileList).find(function(x){ return /\.json$/i.test(x.name)||x.type==='application/json'; });
  var stt=document.getElementById('itvmImpStatus');
  if(!f){ if(stt){stt.style.color='#A32D2D';stt.textContent='JSON 파일이 아니에요.';} return; }
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var o=JSON.parse(rd.result);
      var arr=Array.isArray(o)?o:(o.interactives||[]);
      var valid=arr.filter(function(x){ return x&&x.id&&x.template; });
      if(!valid.length){ if(stt){stt.style.color='#A32D2D';stt.textContent='interactives 항목 없음 (id + template 필요)';} return; }
      if(!_impDateGate('인터랙티브', o, valid, 'id', true)) return;
      _itvmImpData=valid;
      if(stt){ stt.style.color='#475569'; stt.innerHTML='인식: 인터랙티브 <b>'+valid.length+'</b>개 — 올리는 중…'; }
      itvmImport().catch(function(e){ _impFail('itvmImpStatus',e); });
    }catch(e){ if(stt){stt.style.color='#A32D2D';stt.textContent='파싱 오류: '+e.message;} }
  };
  rd.readAsText(f);
}
async function itvmImport(){
  if(!_itvmImpData||!_itvmImpData.length) return;
  var _ex=await _loadExistingByIds('interactives', _itvmImpData.map(function(x){return String(x.id);}));
  if(!_impPreviewConfirm('인터랙티브 '+_itvmImpData.length+'개 적재', _ex, _itvmImpData, 'id', ['template','certs','keywords'], /^itv_[a-z0-9_]+$/)) return;
  var ok=0, fail=0;
  var _ops=[];
  for(var i=0;i<_itvmImpData.length;i++){
    var it=_itvmImpData[i]; var id=String(it.id);
    if(!/^itv_[a-z0-9_]+$/.test(id)){ fail++; continue; }
    var rec={ name:it.name||'', title:it.title||'', story:it.story||'', template:it.template||'', params:(it.params&&typeof it.params==='object')?it.params:null,
      concepts:Array.isArray(it.concepts)?it.concepts:[], certs:Array.isArray(it.certs)?it.certs:[],
      keywords:Array.isArray(it.keywords)?it.keywords:[], note:it.note||'',
      updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
    _impPreserve(rec, it, _ex[id], ['name','title','story','note','certs','keywords','template','params','concepts']);
    (function(_id,_rec){ _ops.push({ref:db.collection('interactives').doc(_id), data:_rec, after:function(){ _itvmAll[_id]=_cacheRec(_rec); }}); })(id,rec);
  }
  var _r=await _qbWrite(_ops, function(n,t){var _s=document.getElementById('itvmImpStatus'); if(_s){_s.style.color='#475569';_s.innerHTML='처리 중… <b>'+n+'</b>/'+t;}}); ok+=_r.ok; fail+=_r.fail;
  var stt=document.getElementById('itvmImpStatus'); if(stt){ stt.style.color='#15793F'; stt.innerHTML='✅ 올림: 성공 <b>'+ok+'</b>개'+(fail?(' · 실패 '+fail+'개'+((typeof _r!=='undefined'&&_r&&_r.err)?(' — '+_r.err):'')):'')+'.'; }
  itvmRenderList();
}

var _lvupData=null; var _lvupQStash=[];
function lvupInit(){
  var drop=document.getElementById('lvupImpDrop'), file=document.getElementById('lvupImpFile');
  if(file) file.onchange=function(){ lvupImpHandle(file.files); };
  if(drop){
    drop.onclick=function(){ file&&file.click(); };
    ['dragover','dragenter'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#185FA5';}); });
    ['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#CBD5E1';}); });
    drop.addEventListener('drop', function(e){ e.preventDefault(); lvupImpHandle(e.dataTransfer.files); });
  }
  lvupPopulateExp();
}
function _lvupDetectSub(p){
  if(p && p._meta && p._meta.subject) return p._meta.subject;
  if(p && p.subject) return p.subject;
  var t=null;
  if(p.mapping&&p.mapping[0]) t=p.mapping[0].topic;
  else if(p.questions&&p.questions[0]) t=p.questions[0].topic;
  else if(p.variants&&p.variants[0]) t=p.variants[0].topic;
  else if(p.diagnostic&&p.diagnostic[0]) t=p.diagnostic[0].topic;
  else if(p.topics&&p.topics[0]) t=(p.topics[0].code||p.topics[0].topic);
  else if(p.templates&&p.templates[0]) t=p.templates[0].topic;
  if(!t) return null;
  var pre=String(t).split('_')[0];
  return ({fa:'acct',ca:'acct',re:'real',ci:'civil',lr:'law',mi:'econ',ma:'econ',in:'econ'})[pre]||null;
}
function _lvupCert(p){ return (p&&p._meta&&p._meta.cert) || (p&&p.cert) || 'appraiser'; }
function _lvupItemsFor(p, cert, sub){
  var items=[];
  if(Array.isArray(p.mapping)) items.push({cert:cert, sub:sub, kind:'map', data:{subject:sub, kind:'map', count:p.mapping.length, mapping:p.mapping}});
  if(Array.isArray(p.diagnostic)) items.push({cert:cert, sub:sub, kind:'diag', data:{subject:sub, kind:'diag', count:p.diagnostic.length, diagnostic:p.diagnostic, _meta:p._meta||null}});
  else if(Array.isArray(p.topics)) items.push({cert:cert, sub:sub, kind:'diag', data:{subject:sub, kind:'diag', count:p.topics.length, topics:p.topics, _meta:p._meta||null}});
  if(Array.isArray(p.variants) && p.variants.length) items.push({cert:cert, sub:sub, kind:'variants', data:{subject:sub, kind:'variants', count:p.variants.length, variants:p.variants}});
  if(Array.isArray(p.questions) && p.questions.length) items.push({cert:cert, sub:sub, kind:'variantq', merge:true, questions:p.questions});
  if(Array.isArray(p.templates) && p.templates.length) items.push({cert:cert, sub:sub, kind:'calctmpl', merge:true, templates:p.templates});
  return items;
}
/* ===== 계산형 자동생성 코어 (CALC_) — index.html과 동일 로직. 업로드 전 검증용 ===== */
function _calcRng(seed){ var s=(seed>>>0)||1; return function(){ s|=0; s=(s+0x6D2B79F5)|0; var t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function _calcEval(expr, vars){
  var src=String(expr), i=0;
  function ws(){ while(i<src.length && /\s/.test(src[i])) i++; }
  function peek(){ ws(); return src[i]; }
  function eat(c){ ws(); if(src[i]!==c) throw new Error('expected '+c); i++; }
  function pExpr(){ var v=pTerm(); for(;;){ var c=peek(); if(c==='+'){i++; v+=pTerm();} else if(c==='-'){i++; v-=pTerm();} else break; } return v; }
  function pTerm(){ var v=pUn(); for(;;){ var c=peek(); if(c==='*'){i++; v*=pUn();} else if(c==='/'){i++; var d=pUn(); if(d===0) throw new Error('div0'); v/=d;} else break; } return v; }
  function pUn(){ var c=peek(); if(c==='-'){i++; return -pUn();} if(c==='+'){i++; return pUn();} return pPrim(); }
  function pPrim(){ var c=peek();
    if(c==='('){ i++; var v=pExpr(); eat(')'); return v; }
    if(/[0-9.]/.test(c)){ var st=i; while(i<src.length && /[0-9.]/.test(src[i])) i++; var n=parseFloat(src.slice(st,i)); if(isNaN(n)) throw new Error('num'); return n; }
    if(/[A-Za-z_]/.test(c)){ var st2=i; while(i<src.length && /[A-Za-z0-9_]/.test(src[i])) i++; var nm=src.slice(st2,i);
      if(peek()==='('){ i++; var a=[]; if(peek()!==')'){ a.push(pExpr()); while(peek()===','){ i++; a.push(pExpr()); } } eat(')'); return _calcFn(nm,a); }
      if(!(nm in vars)) throw new Error('var:'+nm); return Number(vars[nm]); }
    throw new Error('unexpected'); }
  var out=pExpr(); ws(); if(i!==src.length) throw new Error('trailing'); if(!isFinite(out)) throw new Error('nonfinite'); return out;
}
function _calcFn(name,a){ switch(name){
  case 'round': { var d=a.length>1?a[1]:0, f=Math.pow(10,d); return Math.round(a[0]*f)/f; }
  case 'abs': return Math.abs(a[0]); case 'floor': return Math.floor(a[0]); case 'ceil': return Math.ceil(a[0]);
  case 'min': return Math.min.apply(null,a); case 'max': return Math.max.apply(null,a); case 'pow': return Math.pow(a[0],a[1]);
  default: throw new Error('fn:'+name); } }
function _calcFmt(n, round, unit){ var d=round||0, f=Math.pow(10,d), v=Math.round(n*f)/f; var s=v.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:d}); if(unit==='원') return '₩'+s; return s+(unit?(' '+unit):''); }
function genCalc(tmpl, seed){
  try{
    var rng=_calcRng(seed), vars={};
    var pk=Object.keys(tmpl.params||{});
    for(var pi=0; pi<pk.length; pi++){ var p=tmpl.params[pk[pi]], step=p.step||1, span=Math.floor((p.max-p.min)/step); vars[pk[pi]]=p.min+step*Math.floor(rng()*(span+1)); }
    /* [FIX 2026-07] derive는 키 순서가 아니라 의존성 순으로 해석 — 미해결(var:) 예외면 뒤로 미뤄 재시도(고정점).
       (예전엔 나중에 정의될 파생값을 먼저 참조하는 템플릿이 "유효 인스턴스 0개"로 업로드 차단됨) */
    var dk=Object.keys(tmpl.derive||{}), _pend=dk.slice(), _prog=true;
    while(_pend.length && _prog){ _prog=false; var _next=[];
      for(var di=0; di<_pend.length; di++){ try{ vars[_pend[di]]=_calcEval(tmpl.derive[_pend[di]], vars); _prog=true; }catch(_e){ if(String(_e.message||_e).indexOf('var:')===0) _next.push(_pend[di]); else throw _e; } }
      _pend=_next; }
    if(_pend.length) throw new Error('var:'+_pend[0]);  /* 순환 등 진짜 미해결 → 기존대로 실패 */
    var answer=_calcEval(tmpl.answer, vars); vars.answer=answer;
    var rnd=tmpl.round||0, fpow=Math.pow(10,rnd); function rd(x){ return Math.round(x*fpow)/fpow; }
    var ansR=rd(answer), distVals=[];
    (tmpl.distractors||[]).forEach(function(ds){ try{ distVals.push(rd(_calcEval(ds.expr, vars))); }catch(e){} });
    var ok=true;
    (tmpl.guard||[]).forEach(function(g){ try{ var m=String(g).match(/^(.*?)(<=|>=|==|!=|<|>)(.*)$/); if(m){ var l=_calcEval(m[1],vars), r=_calcEval(m[3],vars), op=m[2]; var res=op==='>'?l>r:op==='<'?l<r:op==='>='?l>=r:op==='<='?l<=r:op==='=='?l===r:l!==r; if(!res) ok=false; } }catch(e){ ok=false; } });
    if(!ok) return null;
    var optVals=[ansR], seen={}; seen[ansR]=1;
    for(var k=0;k<distVals.length && optVals.length<4;k++){ var dv=distVals[k]; if(dv==null||!isFinite(dv)||seen[dv]) continue; seen[dv]=1; optVals.push(dv); }
    if(optVals.length<4) return null;
    var idx=[0,1,2,3];
    for(var s2=idx.length-1;s2>0;s2--){ var j=Math.floor(rng()*(s2+1)); var t=idx[s2]; idx[s2]=idx[j]; idx[j]=t; }
    var opts=idx.map(function(oi){ return _calcFmt(optVals[oi], rnd, tmpl.unit); });
    var ansPos=idx.indexOf(0), ans1=ansPos+1;
    function numFmt(key){ if(key==='answer') return _calcFmt(ansR, rnd, tmpl.unit); if(!(key in vars)) return '{'+key+'}'; var val=vars[key], isMoney=(tmpl.money||[]).indexOf(key)>=0, d=isMoney?0:(Number.isInteger(val)?0:rnd); return Number(val).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:d}); }
    function subst(str){ return String(str).replace(/\{(\w+)\}/g, function(_,key){ return numFmt(key); }); }
    var o=[]; for(var oi2=0;oi2<4;oi2++) o.push(oi2===ansPos ? subst(tmpl.concl||'정답: {answer}') : '');
    return { id:'calc:'+tmpl.id+':'+(tmpl._diff||(Array.isArray(tmpl.diff)?tmpl.diff[0]:tmpl.diff))+':'+(seed>>>0),
      q:subst(tmpl.stem), opts:opts, ans:ans1, topic:tmpl.topic, diff:(tmpl._diff||(Array.isArray(tmpl.diff)?tmpl.diff[0]:tmpl.diff)), subtopic:tmpl.subtopic||null,
      exp:{ o:o, ex:(tmpl.exp_ex||[]).map(subst) }, _gen:true };
  }catch(e){ return null; }
}
// 업로드 전 템플릿 검증: 실제 생성으로 식·guard·보기중복 확인. {fatal[], summary, sample}
function _calcValidateTemplates(templates){
  var fatal=[], lines=[], sample='';
  (templates||[]).forEach(function(t){
    if(!t||!t.id){ fatal.push('• id 없는 템플릿'); return; }
    if(/:/.test(t.id)) fatal.push('• '+t.id+': id에 콜론(:) 금지');
    if(!t.topic) fatal.push('• '+t.id+': topic 없음');
    if(!t.answer){ fatal.push('• '+t.id+': answer(정답식) 없음'); return; }
    var bands=Array.isArray(t.diff)?t.diff:[t.diff], okN=0, tot=0, firstQ=null;
    bands.forEach(function(bd){ for(var s=0;s<60;s++){ tot++; var q=genCalc(Object.assign({}, t, {_diff:bd}), (s*2654435761)>>>0); if(q){ okN++; if(!firstQ) firstQ=q; } } });
    if(okN===0){ fatal.push('• '+t.id+': 유효 인스턴스 0개 (식·범위·guard·distractor 4개 미만 확인)'); return; }
    var pct=Math.round(okN/tot*100); lines.push(t.id+' '+pct+'%'+(pct<50?'⚠':''));
    if(!sample && firstQ) sample=firstQ.q+' → 정답 '+firstQ.opts[firstQ.ans-1];
  });
  return { fatal:fatal, summary:lines.join(' · '), sample:sample };
}
function lvupImpHandle(fileList){
  var f=[].slice.call(fileList).find(function(x){ return /\.json$/i.test(x.name)||x.type==='application/json'; });
  var stt=document.getElementById('lvupImpStatus');
  if(!f){ if(stt){stt.style.color='#A32D2D';stt.textContent='JSON 파일이 아니에요.';} return; }
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var p=JSON.parse(rd.result);
      if(!_impDateGate('레벨업', p, null, 'id', false)){ if(stt){stt.style.color='#A32D2D';stt.textContent='날짜 누락으로 차단(_meta.generatedAt 필요)';} return; }
      var items=[], labels=[];
      if(Array.isArray(p.subjects)){          // 내보내기(전체) 형식 — 과목별 루프
        p.subjects.forEach(function(se){
          var sub=_lvupDetectSub(se), cert=_lvupCert(se)||_lvupCert(p);
          if(!sub) return;
          var its=_lvupItemsFor(se, cert, sub);
          if(its.length){ items=items.concat(its); labels.push(csKo(cert,sub)); }
        });
        if(!items.length){ if(stt){stt.style.color='#A32D2D';stt.textContent='subjects[]에서 인식할 데이터 없음';} return; }
      } else {                                 // 단일 과목 파일
        var sub=_lvupDetectSub(p), cert=_lvupCert(p);
        if(!sub){ if(stt){stt.style.color='#A32D2D';stt.textContent='과목 인식 실패 (_meta.subject 또는 topic 접두사 필요)';} return; }
        items=_lvupItemsFor(p, cert, sub);
        if(!items.length){ if(stt){stt.style.color='#A32D2D';stt.textContent='인식할 데이터 없음 (mapping/diagnostic/topics/variants/questions)';} return; }
        labels.push(csKo(cert,sub));
      }
      var _ctItems=items.filter(function(x){return x.kind==='calctmpl';});
      if(_ctItems.length){
        var _allT=[]; _ctItems.forEach(function(x){ _allT=_allT.concat(x.templates); });
        var _vr=_calcValidateTemplates(_allT);
        if(_vr.fatal.length){ if(stt){stt.style.color='#A32D2D'; stt.innerHTML='❌ 계산형 템플릿 오류 — 적재 중단:<br>'+_vr.fatal.join('<br>');} return; }
        if(stt){ stt.style.color='#475569'; stt.innerHTML='✓ 템플릿 검증 OK (생성성공률 '+_vr.summary+')<br><span style="color:#8a8175">샘플: '+(_vr.sample||'')+'</span>'; }
      }
      _lvupData={items:items};
      try{ var _lb=0,_lw=0; _lvupQStash.forEach(function(it){ var g=qualityGate((it.data&&it.data.questions)||[]); _lb+=g.block.length; _lw+=g.warn.length; }); }catch(_){}
      _lvupQStash=(function(){ var byId={}; items.forEach(function(x){ if(x.kind==='variantq'&&Array.isArray(x.questions)){ var did=x.cert+'__'+x.sub; if(!byId[did]) byId[did]={docId:did,data:{cert:x.cert,subject:x.sub,name:csKo(x.cert,x.sub),questions:[]}}; byId[did].data.questions=byId[did].data.questions.concat(x.questions); } }); return Object.keys(byId).map(function(k){return byId[k];}); })();
      if(stt){ stt.style.color='#475569'; stt.innerHTML='인식: <b>'+labels.join(', ')+'</b> · 항목 '+items.length+'개 — 올리는 중…'; }
      try{ var _qb=0,_qw=0; _lvupQStash.forEach(function(it){ var g=qualityGate((it.data&&it.data.questions)||[]); _qb+=g.block.length; _qw+=g.warn.length; }); _qcSetBadge('lvupReviewCount',_qb,_qw); }catch(_){}
      lvupImport();
    }catch(e){ if(stt){stt.style.color='#A32D2D';stt.textContent='파싱 오류: '+e.message;} }
  };
  rd.readAsText(f);
}
async function lvupImport(){
  if(!_lvupData) return;
  var D=_lvupData, stt=document.getElementById('lvupImpStatus');
  var preLines=[];
  for(var pi=0; pi<D.items.length; pi++){ var pit=D.items[pi];
    if(pit.kind==='variantq' || pit.kind==='calctmpl'){
      var pfield=(pit.kind==='calctmpl')?'templates':'questions', parr=pit[pfield]||[];
      var exMap={}; try{ var pcur=await db.collection('adaptive').doc(pit.cert+'__'+pit.sub+'__'+pit.kind).get(); if(pcur.exists && Array.isArray(pcur.data()[pfield])) pcur.data()[pfield].forEach(function(q){ if(q&&q.id) exMap[q.id]=1; }); }catch(_){}
      var exTot=Object.keys(exMap).length, neu=0, ov=0; parr.forEach(function(q){ if(q&&q.id){ if(exMap[q.id]) ov++; else neu++; } });
      preLines.push('• '+pit.sub+'/'+pit.kind+': 기존 '+exTot+' → '+(exTot+neu)+' (신규 +'+neu+' · 덮어쓰기 '+ov+' · 삭제 0)'+((neu===0&&ov>0)?'  ⚠️신규0':''));
    } else { preLines.push('• '+pit.sub+'/'+pit.kind+': 적재'); }
  }
  if(!confirm('레벨업 데이터 적재 — '+D.items.length+'개 항목\n\n'+preLines.join('\n')+'\n\n계속할까요?')) return;
  var done=[], fails=[];
  for(var i=0;i<D.items.length;i++){
    var it=D.items[i];
    var docId=it.cert+'__'+it.sub+'__'+it.kind;
    try{
      if(it.kind==='variantq' || it.kind==='calctmpl'){
        var field=(it.kind==='calctmpl')?'templates':'questions';
        var arr=(it.kind==='calctmpl')?it.templates:it.questions;
        var existing=[];
        try{ var cur=await db.collection('adaptive').doc(docId).get(); if(cur.exists && Array.isArray(cur.data()[field])) existing=cur.data()[field]; }catch(_){}
        var byId={}, order=[], nk=0;
        var _push=function(q){ var k=(q&&q.id)?('id:'+q.id):('__'+(nk++)); if(!(k in byId)) order.push(k); byId[k]=q; };
        existing.forEach(_push); arr.forEach(_push);   // 신규가 같은 id 덮어씀
        var merged=order.map(function(k){ return byId[k]; });
        var _rec={ subject:it.sub, kind:it.kind, count:merged.length, updatedAt:firebase.firestore.FieldValue.serverTimestamp() }; _rec[field]=merged;
        var _bytes=null; try{ _bytes=new Blob([JSON.stringify(_rec)]).size; }catch(_){}
        if(_bytes!==null && _bytes>1000000){ throw new Error('\ubb38\uc11c \ud06c\uae30 '+Math.round(_bytes/1024)+'KB\uac00 Firestore 1MB \ud55c\ub3c4 \ucd08\uacfc \u2014 \uacfc\ubaa9\uc744 \ub098\ub220 \uc62c\ub9ac\uc138\uc694'); }
        await db.collection('adaptive').doc(docId).set(_rec);
        done.push(it.sub+'/'+it.kind+'('+existing.length+'+'+arr.length+'\u2192'+merged.length+')');
      } else {
        await db.collection('adaptive').doc(docId).set(it.data);
        done.push(it.sub+'/'+it.kind+'('+it.data.count+')');
      }
    }catch(e){ var _m=(it.sub||'?')+'/'+it.kind+' \uc2e4\ud328: '+e.message; done.push(_m); fails.push(_m); }
  }
  if(stt){
    if(fails.length){ stt.style.color='#A32D2D'; stt.innerHTML='\u26A0\uFE0F '+fails.length+'\uac1c \uc2e4\ud328 (\ucd1d '+D.items.length+'\uac1c) \u2014 <b>'+fails.join(' \u00b7 ')+'</b>'; }
    else { stt.style.color='#15793F'; stt.innerHTML='\u2705 \uc801\uc7ac \uc644\ub8cc: '+done.join(' \u00b7 '); }
  }
  _lvupData=null;
}
var _lvupExpCache=null;
async function lvupReadGroups(){
  var snap=await db.collection('adaptive').get();
  var groups={};
  snap.forEach(function(doc){
    var id=doc.id, d=doc.data()||{};
    var parts=id.split('__'); if(parts.length<3) return;
    var cert=parts[0], sub=parts[1], kind=parts.slice(2).join('__');
    var key=cert+'||'+sub;
    var g=groups[key]||(groups[key]={ _meta:{cert:cert, subject:sub} });
    if(kind==='map' && Array.isArray(d.mapping)) g.mapping=d.mapping;
    else if(kind==='diag'){ if(Array.isArray(d.diagnostic)) g.diagnostic=d.diagnostic; if(Array.isArray(d.topics)) g.topics=d.topics; }
    else if(kind==='variants' && Array.isArray(d.variants)) g.variants=d.variants;
    else if(kind==='variantq' && Array.isArray(d.questions)) g.questions=d.questions;
    else if(kind==='calctmpl' && Array.isArray(d.templates)) g.templates=d.templates;
  });
  return groups;
}
var _subjNameMap=null, _certNameMap=null;
async function _loadSubjNames(){                 // manifest에서 cert→한글명, cert|과목코드→한글명 맵(1회 캐시)
  if(_subjNameMap) return _subjNameMap;
  var m={}, cm={};
  try{ var snap=await db.collection('manifest').doc('exams').get(); var exams=(snap.exists&&snap.data().exams)||[];
    exams.forEach(function(e){ if(e&&e.id) cm[e.id]=e.name||e.id; (e.subjects||[]).forEach(function(s){ if(s&&s.code) m[e.id+'|'+s.code]=s.name||s.code; }); }); }catch(_){}
  _subjNameMap=m; _certNameMap=cm;
  // manifest 이름을 이메일·D-day 표시에도 반영(짧은 칩 CERT_SHORT은 별도 유지). 시험 관리에서 이름 바꾸면 여기도 따라옴.
  try{ Object.keys(cm).forEach(function(c){ var nm=cm[c]; if(!nm) return;
    if(typeof EM_CERTS!=='undefined' && EM_CERTS[c]) EM_CERTS[c]=nm;
    if(typeof CERT_NAMES!=='undefined' && CERT_NAMES[c]) CERT_NAMES[c]=nm;
    if(typeof DDAY_CERTS!=='undefined'){ var d=DDAY_CERTS.find(function(x){return x.c===c;}); if(d) d.n=nm; }
  }); }catch(_){}
  return m;
}
function subjNameOf(cert, code){ return (_subjNameMap && _subjNameMap[cert+'|'+code]) || code || ''; }
function certKo(cert){ return (_certNameMap && _certNameMap[cert]) || (typeof CERT_NAMES!=='undefined'&&CERT_NAMES[cert]) || cert || ''; }
function certWithId(cert){ var nm=certKo(cert); return nm+(nm!==cert&&cert?(' ('+cert+')'):''); }          // 한글시험명 (영어ID)
function csKo(cert, sub){ var sn=subjNameOf(cert,sub); return certWithId(cert)+' / '+sn+(sn!==sub&&sub?(' ('+sub+')'):''); }
function _lvupExpLabel(g){ var c=(g._meta&&g._meta.cert)||'', s=(g._meta&&g._meta.subject)||''; return csKo(c,s); }
async function lvupPopulateExp(){
  var sel=document.getElementById('lvupExpCert'); if(!sel) return;
  try{
    var groups=await lvupReadGroups(); _lvupExpCache=groups;
    await _loadSubjNames();
    var certs={}; Object.keys(groups).forEach(function(k){ var g=groups[k]; var c=(g._meta&&g._meta.cert)||''; (certs[c]=certs[c]||[]).push(g); });
    sel.innerHTML='<option value="__all">\uC804\uCCB4 (\uBAA8\uB4E0 \uC2DC\uD5D8)</option>'
      + Object.keys(certs).sort().map(function(c){ var subs=certs[c]; var qtot=subs.reduce(function(n,x){return n+((x.questions&&x.questions.length)||0);},0); return '<option value="'+c+'">'+certWithId(c)+' ('+subs.length+'\uACFC\uBAA9 \u00B7 '+qtot+'\uBB38\uD56D)</option>'; }).join('');
    lvupExpFillSub();
  }catch(e){}
}
function lvupExpFillSub(){
  var cert=document.getElementById('lvupExpCert'), sub=document.getElementById('lvupExpSub'); if(!cert||!sub) return;
  var groups=_lvupExpCache||{};
  if(cert.value==='__all'){ sub.innerHTML='<option value="__all">\uC804\uCCB4 \uACFC\uBAA9</option>'; sub.disabled=true; return; }
  sub.disabled=false;
  var subs=Object.keys(groups).map(function(k){return groups[k];}).filter(function(g){return (g._meta&&g._meta.cert)===cert.value;})
    .sort(function(x,y){ return String((x._meta&&x._meta.subject)||'').localeCompare(String((y._meta&&y._meta.subject)||'')); });
  sub.innerHTML='<option value="__all">\uC804\uCCB4 \uACFC\uBAA9</option>'+subs.map(function(g){ var sc=(g._meta&&g._meta.subject)||''; var cnt=(g.questions&&g.questions.length)||0; return '<option value="'+sc+'">'+subjNameOf(cert.value,sc)+' ('+cnt+'\uBB38\uD56D)</option>'; }).join('');
}
function _lvupDownload(subjects, fnameSuffix){
  var bundle={ _meta:{ kind:'levelup_export', exportedAt:_kstISO(new Date()), subjectCount:subjects.length }, subjects:subjects };
  var blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download='certlab_levelup_'+fnameSuffix+'_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
async function lvupExportSel(){
  var certSel=document.getElementById('lvupExpCert'), subSel=document.getElementById('lvupExpSub'), stt=document.getElementById('lvupImpStatus');
  var cert=certSel?certSel.value:'__all'; var sub=subSel?subSel.value:'__all';
  if(stt){ stt.style.color='#475569'; stt.textContent='\uB0B4\uBCF4\uB0B4\uB294 \uC911\u2026 adaptive \uC77D\uB294 \uC911'; }
  try{
    var groups=_lvupExpCache; if(!groups){ groups=await lvupReadGroups(); _lvupExpCache=groups; }
    var all=Object.keys(groups).map(function(k){ return groups[k]; });
    if(cert==='__all'){
      if(!all.length){ if(stt){stt.style.color='#A32D2D';stt.textContent='adaptive\uC5D0 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.';} return; }
      _lvupDownload(all,'all');
      var tot=all.reduce(function(n,s2){ return n+((s2.questions&&s2.questions.length)||0); },0);
      if(stt){ stt.style.color='#15793F'; stt.innerHTML='\u2705 \uC804\uCCB4 \uB0B4\uBCF4\uB0B4\uAE30 \u2014 \uACFC\uBAA9 <b>'+all.length+'</b>\uAC1C \u00B7 \uBCC0\uD615\uBB38\uD56D <b>'+tot+'</b>\uAC1C.'; }
    } else if(sub==='__all'){
      var _subs=all.filter(function(g){ return (g._meta&&g._meta.cert)===cert; });
      if(!_subs.length){ if(stt){stt.style.color='#A32D2D';stt.textContent='\uC120\uD0DD\uD55C \uC2DC\uD5D8 \uB370\uC774\uD130\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.';} return; }
      _lvupDownload(_subs, cert);
      var _tot=_subs.reduce(function(n,x){ return n+((x.questions&&x.questions.length)||0); },0);
      if(stt){ stt.style.color='#15793F'; stt.innerHTML='\u2705 '+certWithId(cert)+' \u2014 \uACFC\uBAA9 <b>'+_subs.length+'</b>\uAC1C \u00B7 \uBCC0\uD615\uBB38\uD56D <b>'+_tot+'</b>\uAC1C.'; }
    } else {
      var g=all.filter(function(x){ return (x._meta&&x._meta.cert)===cert && (x._meta&&x._meta.subject)===sub; })[0];
      if(!g){ if(stt){stt.style.color='#A32D2D';stt.textContent='\uC120\uD0DD\uD55C \uACFC\uBAA9 \uB370\uC774\uD130\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.';} return; }
      _lvupDownload([g], cert+'__'+sub);
      var cnt=(g.questions&&g.questions.length)||0;
      if(stt){ stt.style.color='#15793F'; stt.innerHTML='\u2705 '+_lvupExpLabel(g)+' \u2014 \uBCC0\uD615\uBB38\uD56D <b>'+cnt+'</b>\uAC1C.'; }
    }
  }catch(e){ if(stt){stt.style.color='#A32D2D';stt.textContent='\uB0B4\uBCF4\uB0B4\uAE30 \uC624\uB958: '+e.message;} }
}
// ===== ➕ 시험 추가 (매니페스트 등록) =====
var eaType='mcq', eaSubs=[{n:''}], _eaInit=false;
// ===== 💰 티어 가격 & 시험 배정 (config/pricing) =====
var _tpCfg=null, _tpInited=false;
var CERT_ICONS={ bodybuilding:'💪', appraiser:'📐', realestate1:'🏠', realestate2:'🏢', koreanhistory:'📜', housing:'🏢', housing2:'🏢', sport2:'🏅', laborattorney1:'⚖️', firemanager1:'🧯', hesm:'🏃' };
var TP_DEFAULT={ tiers:{ premiumplus:{m1:24900,m3:64000,m6:110000,m12:190000}, premium:{m1:14900,m3:39000,m6:69000,m12:119000}, standard:{m1:9900,m3:25000,m6:45000,m12:79000}, light:{m1:6900,m3:17000,m6:29000,m12:49000} },
  aiCredits:{ grade:[ {n:10,p:29000}, {n:30,p:79000}, {n:50,p:120000}, {n:100,p:220000} ], explain:[ {n:50,p:900}, {n:100,p:1700}, {n:300,p:4900}, {n:500,p:7900} ] }, aiModel:{ grade:'claude-sonnet-5', explain:'claude-haiku-4-5' },
  certTier:{ appraiser:'premiumplus', laborattorney1:'premium', firemanager1:'premium', hesm:'premium', realestate1:'standard', realestate2:'standard', housing:'standard', housing2:'standard', koreanhistory:'light', sport2:'light' }, freeDays:7, guestDaily:10, userDaily:20 };
var TP_TIERS=['premiumplus','premium','standard','light'];
async function tpInit(){
  if(_tpInited) return; _tpInited=true;
  try{ var d=await db.collection('config').doc('pricing').get(); _tpCfg=d.exists?d.data():null; }catch(_){ _tpCfg=null; }
  if(!_tpCfg||!_tpCfg.tiers){ _tpCfg=JSON.parse(JSON.stringify(TP_DEFAULT)); }
  if(!_tpCfg.certTier) _tpCfg.certTier={};
  TP_TIERS.forEach(function(t){
    var tv=(_tpCfg.tiers&&_tpCfg.tiers[t])||{};
    ['m1','m3','m6','m12'].forEach(function(m){ var el=document.getElementById('tp_'+t+'_'+m); if(el) el.value=tv[m]!=null?tv[m]:''; });
  });
  var _aic=(_tpCfg.aiCredits&&typeof _tpCfg.aiCredits==='object'&&!Array.isArray(_tpCfg.aiCredits))?_tpCfg.aiCredits:TP_DEFAULT.aiCredits;
  var _gp=Array.isArray(_aic.grade)?_aic.grade:TP_DEFAULT.aiCredits.grade;
  var _ep=Array.isArray(_aic.explain)?_aic.explain:TP_DEFAULT.aiCredits.explain;
  [0,1,2,3].forEach(function(i){ var g=_gp[i]||{}, e=_ep[i]||{};
    var gn=document.getElementById('tp_aicg_n'+i), gpv=document.getElementById('tp_aicg_p'+i); if(gn) gn.value=(g.n!=null?g.n:''); if(gpv) gpv.value=(g.p!=null?g.p:'');
    var en=document.getElementById('tp_aice_n'+i), epv=document.getElementById('tp_aice_p'+i); if(en) en.value=(e.n!=null?e.n:''); if(epv) epv.value=(e.p!=null?e.p:''); });
  var _amod=(_tpCfg.aiModel)||TP_DEFAULT.aiModel;
  var _mg=document.getElementById('tp_aimodel_grade'); if(_mg) _mg.value=_amod.grade||'claude-sonnet-5';
  var _me=document.getElementById('tp_aimodel_explain'); if(_me) _me.value=_amod.explain||'claude-haiku-4-5';
  var fd=document.getElementById('tp_freeDays'); if(fd) fd.value=_tpCfg.freeDays!=null?_tpCfg.freeDays:7;
  var gd=document.getElementById('tp_guestDaily'); if(gd) gd.value=_tpCfg.guestDaily!=null?_tpCfg.guestDaily:10;
  var ud=document.getElementById('tp_userDaily'); if(ud) ud.value=_tpCfg.userDaily!=null?_tpCfg.userDaily:20;
  tpRenderCerts();
}
async function tpRenderCerts(){
  var el=document.getElementById('tpCertList'); if(!el) return;
  var exams=[];
  try{ var m=await db.collection('manifest').doc('exams').get(); exams=(m.exists&&m.data().exams)||[]; }catch(_){}
  if(!exams.length){ el.textContent='등록된 시험이 없습니다.'; return; }
  var ct=_tpCfg.certTier||{};
  el.innerHTML=exams.map(function(e){
    var cur=ct[e.id]||'standard';
    var opt=function(v,l){ return '<option value="'+v+'"'+(cur===v?' selected':'')+'>'+l+'</option>'; };
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F4F0E9">'
      +'<input data-cert="'+e.id+'" class="tp-cert-ic" value="'+((_tpCfg.certIcon&&_tpCfg.certIcon[e.id])||CERT_ICONS[e.id]||e.icon||'\uD83D\uDCD8')+'" maxlength="4" title="이모지(홈·티어 반영)" style="width:40px;text-align:center;font-size:16px;padding:4px;border:1.5px solid #E8E8E8;border-radius:8px">'
      +'<span style="flex:1"><b>'+(e.name||e.id)+'</b> <span style="font-family:monospace;font-size:10px;color:#B0A89C">'+e.id+'</span></span>'
      +'<select data-cert="'+e.id+'" class="tp-cert-sel" style="padding:5px 10px;border:1.5px solid #E8E8E8;border-radius:8px;font-size:12px;outline:none">'
      +opt('premiumplus','프리미엄+')+opt('premium','프리미엄')+opt('standard','표준')+opt('light','라이트')+'</select></div>';
  }).join('');
}
async function tpSave(){
  var st=document.getElementById('tpStatus'); if(!st) return;
  st.style.color='#6E6256'; st.textContent='저장 중…';
  try{
    var tiers={};
    TP_TIERS.forEach(function(t){ tiers[t]={}; ['m1','m3','m6','m12'].forEach(function(m){ tiers[t][m]=+((document.getElementById('tp_'+t+'_'+m)||{}).value)||0; }); });
    var _gpk=[], _epk=[]; [0,1,2,3].forEach(function(i){
      var gn=+((document.getElementById('tp_aicg_n'+i)||{}).value)||0, gp=+((document.getElementById('tp_aicg_p'+i)||{}).value)||0; if(gn>0) _gpk.push({n:gn,p:gp});
      var en=+((document.getElementById('tp_aice_n'+i)||{}).value)||0, ep=+((document.getElementById('tp_aice_p'+i)||{}).value)||0; if(en>0) _epk.push({n:en,p:ep}); });
    var aiCredits={ grade:_gpk, explain:_epk };
    var aiModel={ grade:((document.getElementById('tp_aimodel_grade')||{}).value)||'claude-sonnet-5', explain:((document.getElementById('tp_aimodel_explain')||{}).value)||'claude-haiku-4-5' };
    var certTier={};
    [].slice.call(document.querySelectorAll('.tp-cert-sel')).forEach(function(sel){ certTier[sel.getAttribute('data-cert')]=sel.value; });
    var certIcon={};
    [].slice.call(document.querySelectorAll('.tp-cert-ic')).forEach(function(inp){ var v=(inp.value||'').trim(); if(v) certIcon[inp.getAttribute('data-cert')]=v; });
    var freeDays=+((document.getElementById('tp_freeDays')||{}).value)||7;
    var guestDaily=+((document.getElementById('tp_guestDaily')||{}).value)||10;
    var userDaily=+((document.getElementById('tp_userDaily')||{}).value)||20;
    var payload={ tiers:tiers, aiCredits:aiCredits, aiModel:aiModel, certTier:certTier, certIcon:certIcon, freeDays:freeDays, guestDaily:guestDaily, userDaily:userDaily, updatedAt:new Date().toISOString() };
    await db.collection('config').doc('pricing').set(payload, {merge:true});
    _tpCfg=payload;
    st.style.color='#15793F'; st.textContent='저장 완료 — 앱에 반영됨';
  }catch(e){ st.style.color='#C0392B'; st.textContent='저장 오류: '+e.message; }
}
function eaInit(){ if(_eaInit) return; _eaInit=true; eaRenderSubs(); eaRender(); eaLoadList(); tpInit(); tpTimeInit(); }
var _tpTimeInited=false;
async function tpTimeInit(){
  if(_tpTimeInited) return; _tpTimeInited=true;
  var cfg={};
  try{ var d=await db.collection('config').doc('pricing').get(); cfg=d.exists?(d.data()||{}):{}; }catch(_){}
  var ds=(cfg&&cfg.diffSecs)||{}, def={1:30,2:40,3:60,4:90,5:120};
  [1,2,3,4,5].forEach(function(l){ var el=document.getElementById('tp_diff'+l); if(el) el.value=(ds[l]!=null?ds[l]:def[l]); });
  var cd=document.getElementById('tp_calcDelta'); if(cd) cd.value=(cfg.calcDelta!=null?cfg.calcDelta:1);
  var nd=document.getElementById('tp_nonCalcDelta'); if(nd) nd.value=(cfg.nonCalcDelta!=null?cfg.nonCalcDelta:-1);
}
async function tpSaveTime(){
  var st=document.getElementById('tpTimeStatus'); if(!st) return;
  st.style.color='#6E6256'; st.textContent='저장 중…';
  try{
    var diffSecs={};
    [1,2,3,4,5].forEach(function(l){ var v=+((document.getElementById('tp_diff'+l)||{}).value); if(v>0) diffSecs[l]=v; });
    var calcDelta=+((document.getElementById('tp_calcDelta')||{}).value); if(isNaN(calcDelta)) calcDelta=1;
    var nonCalcDelta=+((document.getElementById('tp_nonCalcDelta')||{}).value); if(isNaN(nonCalcDelta)) nonCalcDelta=-1;
    await db.collection('config').doc('pricing').set({ diffSecs:diffSecs, calcDelta:calcDelta, nonCalcDelta:nonCalcDelta, updatedAt:new Date().toISOString() }, {merge:true});
    if(_tpCfg){ _tpCfg.diffSecs=diffSecs; _tpCfg.calcDelta=calcDelta; _tpCfg.nonCalcDelta=nonCalcDelta; }
    st.style.color='#15793F'; st.textContent='저장 완료 — 앱에 반영됨';
  }catch(e){ st.style.color='#C0392B'; st.textContent='저장 오류: '+e.message; }
}
var _eaExams=[], _eaSched={};
function eaToggleAdd(){ var c=document.getElementById('eaAddCard'); if(c) c.style.display=(c.style.display==='none'?'block':'none'); if(c&&c.style.display==='block') c.scrollIntoView({behavior:'smooth',block:'start'}); }
function _eaSchedFmt(s){
  if(!s) return '<span style="color:#B0A89C">시험일 미수집</span>';
  var ms=null; if(s.nextExamDate){ if(s.nextExamDate.toDate) ms=s.nextExamDate.toDate().getTime(); else if(s.nextExamDate.seconds) ms=s.nextExamDate.seconds*1000; }
  var dstr = ms? new Date(ms).toISOString().slice(0,10) : '';
  if(s.source==='qnet'){ return '<span style="color:#185FA5">큐넷 gId '+(s.gId||'?')+(s.qnetTab!=null?(' \u00B7'+(s.qnetTab+1)+'차'):'')+'</span>'+(dstr?(' \u00B7 '+dstr):' \u00B7 <span style="color:#B0A89C">수집대기</span>'); }
  return '<span style="color:#8A7D6E">수동</span>'+(dstr?(' \u00B7 '+dstr):'');
}
function eaEditToggle(id){ var p=document.getElementById('eaE_'+id); if(p) p.style.display=(p.style.display==='none'?'block':'none'); }
function _inp(id,val,ph,extra){ return '<input id="'+id+'" value="'+(val==null?'':String(val).replace(/"/g,'&quot;'))+'" placeholder="'+(ph||'')+'" style="width:100%;padding:8px 10px;border:1.5px solid #E8E8E8;border-radius:8px;font-size:13px;outline:none;'+(extra||'')+'">'; }
function _lbl(t){ return '<div style="font-size:11px;color:#8A7D6E;margin-bottom:3px">'+t+'</div>'; }
// 앱(index.html PLAN_SETS)과 동일한 기본가 — manifest에 가격 없을 때 폼에 표시용(0원 대신 실제가)
const DEFAULT_PLAN = {
  _default:{7:3900,14:5900,28:8900,56:13900},
  appraiser:{7:4900,14:7900,28:11900,56:17900},
  realestate2:{7:4900,14:7900,28:11900,56:17900},
  housing2:{7:4900,14:7900,28:11900,56:17900}
};
function eaEditForm(e,s){
  var pid='eaE_'+e.id, pass=e.pass||{}, isGrade=!!pass.grade, plan=e.plan||[];
  var pget=function(d){ var p=plan.filter(function(x){return x.d===d;})[0]; if(p&&p.p) return p.p; var dm=(typeof DEFAULT_PLAN!=='undefined')?(DEFAULT_PLAN[e.id]||DEFAULT_PLAN._default):null; return (dm&&dm[d])||0; };
  var gid=(s&&s.gId)||'', qtab=(s&&s.qnetTab!=null)?s.qnetTab:0;
  var passHtml;
  if(isGrade){
    var gv=function(g){ var x=(pass.grades||[]).filter(function(y){return y.g===g;})[0]; return x?x.min:''; };
    passHtml='<div style="font-size:11px;color:#8A7D6E;margin-bottom:4px">등급 기준(점수 이상→급)</div><div style="display:flex;gap:8px">'
      +'<div style="flex:1">'+_lbl('3급')+_inp(pid+'_g3',gv('3급'),'60')+'</div>'
      +'<div style="flex:1">'+_lbl('2급')+_inp(pid+'_g2',gv('2급'),'70')+'</div>'
      +'<div style="flex:1">'+_lbl('1급')+_inp(pid+'_g1',gv('1급'),'80')+'</div></div>';
  } else {
    passHtml='<div style="display:flex;gap:8px"><div style="flex:1">'+_lbl('합격 평균')+_inp(pid+'_pass',(pass.pass!=null?pass.pass:60))+'</div>'
      +'<div style="flex:1">'+_lbl('과락(없으면 0)')+_inp(pid+'_floor',(pass.floor!=null?pass.floor:0))+'</div></div>';
  }
  return '<div style="background:#FBFAF7;border:1px solid #EFE9E1;border-radius:10px;padding:12px">'
    +'<div style="font-size:11px;color:#A89C8E;margin-bottom:8px">ID <code>'+e.id+'</code> · 과목 '+((e.subjects||[]).map(function(x){return x.name;}).join(', '))+' (ID·과목은 수정 불가)</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:8px"><div style="flex:1">'+_lbl('시험 이름')+_inp(pid+'_name',e.name)+'</div><div style="flex:0 0 70px">'+_lbl('아이콘')+_inp(pid+'_icon',e.icon||'\uD83D\uDCD8','',"text-align:center;font-size:16px")+'</div></div>'
    +'<div style="margin-bottom:8px">'+_lbl('짧은 이름')+_inp(pid+'_label',e.label||'')+'</div>'
    +'<div style="margin-bottom:8px">'+_lbl('가격(원) — 1주 / 2주 / 4주 / 8주')+'<div style="display:flex;gap:6px">'
      +_inp(pid+'_p1',pget(7),'','text-align:center')+_inp(pid+'_p2',pget(14),'','text-align:center')+_inp(pid+'_p4',pget(28),'','text-align:center')+_inp(pid+'_p8',pget(56),'','text-align:center')+'</div></div>'
    +'<div style="margin-bottom:8px">'+passHtml+'</div>'
    +((e.type==='subjective')?('<div style="margin-bottom:8px;background:#F1ECFB;border:1px solid #D9CBF3;border-radius:9px;padding:9px 10px"><label style="display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:#5B3FA0;cursor:pointer"><input type="checkbox" id="'+pid+'_aisell"'+(((!e.aiGrade)||e.aiGrade.enabled!==false)?' checked':'')+'> 🤖 AI 첨삭 판매</label><div style="font-size:10.5px;color:#8A7CA8;margin-top:4px">가격은 \'AI첨삭 충전 요금\'(횟수 충전제)로 관리 · 회원권과 별도</div></div>'):'')
    +'<div style="display:flex;gap:8px;margin-bottom:10px"><div style="flex:1">'+_lbl('큐넷 gId(비우면 자동수집 안 함)')+_inp(pid+'_gid',gid,'예: 05','font-family:monospace')+'</div>'
      +'<div style="flex:0 0 100px">'+_lbl('차수')+'<select id="'+pid+'_qtab" style="width:100%;padding:8px;border:1.5px solid #E8E8E8;border-radius:8px;font-size:13px;background:#fff">'
      +['1차','2차','3차'].map(function(t,i){return '<option value="'+i+'"'+(i===qtab?' selected':'')+'>'+t+'</option>';}).join('')+'</select></div></div>'
    +'<button type="button" onclick="eaEditSave(\''+e.id+'\')" style="width:100%;background:#185FA5;color:#fff;border:none;border-radius:9px;padding:11px;font-size:13.5px;font-weight:800;cursor:pointer">💾 수정 저장</button>'
    +'<div id="'+pid+'_st" style="font-size:12px;margin-top:8px"></div></div>';
}
async function eaLoadList(){
  var el=document.getElementById('eaList'); if(!el) return;
  el.textContent='불러오는 중…';
  try{
    var mSnap=await db.collection('manifest').doc('exams').get();
    _eaExams=(mSnap.exists && mSnap.data().exams)||[];
    _eaSched={};
    try{ var esnap=await db.collection('examSchedules').get(); esnap.forEach(function(d){ _eaSched[d.id]=d.data()||{}; }); }catch(_){}
    if(!_eaExams.length){ el.textContent='등록된 시험이 없습니다.'; return; }
    el.innerHTML=_eaExams.map(function(e){
      var s=_eaSched[e.id];
      return '<div style="border-bottom:1px solid #F0EBE3">'
        +'<div onclick="eaEditToggle(\''+e.id+'\')" style="display:flex;gap:8px;align-items:baseline;padding:9px 0;cursor:pointer">'
        +'<span style="font-size:15px">'+(e.icon||'\uD83D\uDCD8')+'</span>'
        +'<div style="flex:1"><b>'+(e.name||e.id)+'</b> <span style="font-family:monospace;font-size:11px;color:#A89C8E">'+e.id+'</span>'
        +'<div style="font-size:11px;color:#8A7D6E;margin-top:2px">'+((e.subjects||[]).length)+'과목 \u00B7 '+(e.type||'mcq')+' \u00B7 '+_eaSchedFmt(s)+'</div></div>'
        +'<span style="color:#B0A89C;font-size:12px">수정 \u25BE</span></div>'
        +'<div id="eaE_'+e.id+'" style="display:none;padding:4px 2px 14px">'+eaEditForm(e,s)+'</div></div>';
    }).join('');
  }catch(e){ el.textContent='불러오기 실패: '+e.message; }
}
async function eaEditSave(id){
  var pid='eaE_'+id, st=document.getElementById(pid+'_st'); if(!st) return;
  var e=_eaExams.filter(function(x){return x.id===id;})[0];
  if(!e){ st.style.color='#A32D2D'; st.textContent='시험을 찾을 수 없습니다. 새로고침 해주세요.'; return; }
  var g=function(k){ var el=document.getElementById(pid+'_'+k); return el?el.value:''; };
  var name=(g('name')||'').trim(); if(!name){ st.style.color='#A32D2D'; st.textContent='시험 이름을 입력하세요.'; return; }
  st.style.color='#6E6256'; st.textContent='저장 중...';
  try{
    e.name=name; e.label=(g('label')||'').trim()||name; e.icon=(g('icon')||'\uD83D\uDCD8').trim()||'\uD83D\uDCD8';
    var p1=+g('p1')||0,p2=+g('p2')||0,p4=+g('p4')||0,p8=+g('p8')||0;
    e.plan=[{d:7,p:p1,name:'1주 이용권',desc:'7일 전체 이용'},{d:14,p:p2,name:'2주 이용권',desc:'14일 전체 이용'},{d:28,p:p4,name:'4주 이용권',desc:'28일 전체 이용'},{d:56,p:p8,name:'8주 이용권',desc:'56일 전체 이용',pop:'\u2B50 가장 경제적',green:1,sel:1}];
    if(e.pass && e.pass.grade){
      var gr=[]; [['g3','3급','#D97706'],['g2','2급','#2563EB'],['g1','1급','#15803D']].forEach(function(x){ var raw=g(x[0]); if(raw!=='' && raw!=null && !isNaN(+raw)) gr.push({g:x[1],min:+raw,color:x[2]}); });
      gr.sort(function(a,b){return a.min-b.min;}); e.pass={grade:true,grades:gr,label:'급수 인증'};
    } else {
      var ps=+g('pass')||60, fl=+g('floor')||0;
      e.pass={pass:ps,floor:fl,label:'평균 '+ps+'점'+(fl>0?(' \u00B7 과목별 '+fl+'점'):'')};
    }
    if(e.type==='subjective'){ var _as=document.getElementById(pid+'_aisell'); e.aiGrade={ enabled: _as? !!_as.checked : true }; }
    var idx=_eaExams.findIndex(function(x){return x.id===id;});
    _eaExams[idx]=e;
    await db.collection('manifest').doc('exams').update({ exams: _eaExams });
    var gid=(g('gid')||'').trim(), qmsg='';
    if(gid){
      var qtab=parseInt(g('qtab')||'0',10)||0;
      await db.collection('examSchedules').doc(id).set({ cert:id, source:'qnet', gId:gid, qnetTab:qtab, certName:name, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
      qmsg=' · 큐넷 gId '+gid+' ('+(qtab+1)+'차) 등록';
    }
    st.style.color='#15793F'; st.textContent='✅ 저장됨'+qmsg+'. 잠시 후 목록 갱신…';
    setTimeout(eaLoadList, 700);
  }catch(err){ st.style.color='#A32D2D'; st.textContent='오류: '+err.message; }
}
function eaSetType(t){ eaType=t; var a=document.getElementById('eaTMcq'), b=document.getElementById('eaTFc'), c=document.getElementById('eaTSubj'); if(a)a.classList.toggle('ea-on',t==='mcq'); if(b)b.classList.toggle('ea-on',t==='flashcard'); if(c)c.classList.toggle('ea-on',t==='subjective'); var ai=document.getElementById('eaAiBox'); if(ai)ai.style.display=(t==='subjective'?'block':'none'); eaRender(); }
function eaAddSub(){ eaSubs.push({n:''}); eaRenderSubs(); eaRender(); }
function eaDelSub(i){ eaSubs.splice(i,1); if(!eaSubs.length) eaSubs.push({n:''}); eaRenderSubs(); eaRender(); }
function eaRenderSubs(){
  var el=document.getElementById('eaSubList'); if(!el) return; el.innerHTML='';
  eaSubs.forEach(function(s,i){
    var row=document.createElement('div'); row.style.cssText='display:flex;gap:8px;align-items:center;margin-bottom:8px';
    row.innerHTML='<span style="flex:0 0 60px;background:#F1ECE4;border-radius:8px;padding:8px;text-align:center;font-size:12px;font-weight:800;color:#6B5E4F;font-family:monospace">s'+(i+1)+'</span>'
      +'<input type="text" placeholder="과목 이름 (예: 세법)" style="flex:1;padding:8px 10px;border:1.5px solid #E8E8E8;border-radius:8px;font-size:13px;outline:none">'
      +'<button type="button" style="flex:0 0 auto;border:none;background:#FCEBEA;color:#B5302F;border-radius:8px;width:34px;height:34px;font-size:16px;cursor:pointer">×</button>';
    var inp=row.querySelector('input'); inp.value=s.n||''; inp.oninput=function(e){ eaSubs[i].n=e.target.value; eaRender(); };
    row.querySelector('button').onclick=function(){ eaDelSub(i); };
    el.appendChild(row);
  });
}
function eaToggleGrade(){ var on=document.getElementById('eaGrade').checked; document.getElementById('eaGradeBox').style.display=on?'block':'none'; document.getElementById('eaPassBox').style.display=on?'none':'flex'; eaRender(); }
function _eaVal(id){ var el=document.getElementById(id); return el?el.value:''; }
function eaBuildBlock(){
  var id=(_eaVal('eaId')||'').trim().toLowerCase();
  var name=(_eaVal('eaName')||'').trim();
  var label=(_eaVal('eaLabel')||'').trim()||name;
  var icon=(_eaVal('eaIcon')||'📘').trim()||'📘';
  var grade=document.getElementById('eaGrade') && document.getElementById('eaGrade').checked;
  var subjects=eaSubs.filter(function(s){return s.n&&s.n.trim();}).map(function(s,i){ return {code:'s'+(i+1), name:s.n.trim()}; });
  var versions={}; subjects.forEach(function(s){ versions[s.code]=1; });
  var block={ id:id, name:name, label:label, icon:icon, type:eaType, subjects:subjects, versions:versions };
  if(grade){
    var _gr=[];
    [['eaG3','3급','#D97706'],['eaG2','2급','#2563EB'],['eaG1','1급','#15803D']].forEach(function(g){ var raw=_eaVal(g[0]); if(raw!=='' && raw!=null && !isNaN(+raw)) _gr.push({g:g[1], min:+raw, color:g[2]}); });
    _gr.sort(function(a,b){return a.min-b.min;});
    block.pass={grade:true, grades:_gr, label:'급수 인증'};
  }
  else { block.pass={pass:+_eaVal('eaPass')||60, floor:+_eaVal('eaFloor')||0, label:'평균 '+(+_eaVal('eaPass')||60)+'점'+((+_eaVal('eaFloor')>0)?(' · 과목별 '+(+_eaVal('eaFloor'))+'점'):'')}; }
  block.plan=[{d:7,p:+_eaVal('eaP1')||0,name:'1주 이용권',desc:'7일 전체 이용'},{d:14,p:+_eaVal('eaP2')||0,name:'2주 이용권',desc:'14일 전체 이용'},{d:28,p:+_eaVal('eaP4')||0,name:'4주 이용권',desc:'28일 전체 이용'},{d:56,p:+_eaVal('eaP8')||0,name:'8주 이용권',desc:'56일 전체 이용',pop:'⭐ 가장 경제적',green:1,sel:1}];
  if(eaType==='subjective'){ var _as=document.getElementById('eaAiSell'); block.aiGrade={ enabled: _as? !!_as.checked : true }; }   // AI 첨삭 판매 여부(가격은 config/pricing.aiCredits 횟수충전제).
  return block;
}
function eaRender(){ var pre=document.getElementById('eaJson'); if(pre) pre.textContent=JSON.stringify(eaBuildBlock(),null,2); }
async function eaSave(){
  var st=document.getElementById('eaStatus');
  var b=eaBuildBlock();
  if(!/^[a-z][a-z0-9_]*$/.test(b.id)){ st.style.color='#A32D2D'; st.textContent='시험 ID는 영문 소문자/숫자/밑줄만 (예: taxacct1). Claude가 준 값을 붙여넣으세요.'; return; }
  if(!b.name){ st.style.color='#A32D2D'; st.textContent='시험 이름을 입력하세요.'; return; }
  if(!b.subjects.length){ st.style.color='#A32D2D'; st.textContent='과목을 최소 1개 입력하세요.'; return; }
  st.style.color='#6E6256'; st.textContent='저장 중...';
  try{
    var mSnap=await db.collection('manifest').doc('exams').get();
    if(!mSnap.exists){ st.style.color='#A32D2D'; st.textContent='manifest/exams 문서가 없습니다.'; return; }
    var manifest=mSnap.data(); var exams=manifest.exams||[];
    var idx=exams.findIndex(function(e){return e.id===b.id;});
    if(idx>=0){ if(!confirm('이미 있는 시험 ID "'+b.id+'" ('+(exams[idx].name||'')+')\n\n이 블록을 새 내용으로 덮어쓸까요? (기존 과목·버전이 바뀔 수 있음)')){ st.textContent='취소됨.'; return; } exams[idx]=b; }
    else { exams.push(b); }
    await db.collection('manifest').doc('exams').update({ exams: exams });
    // 큐넷 자동수집 등록: gId 있으면 examSchedules에 source:'qnet' 시드 → 크롤러가 매주 시험일 자동수집
    var _gid=(_eaVal('eaGid')||'').trim(); var _qnetMsg='';
    if(_gid){
      try{
        var _qtab=parseInt(_eaVal('eaQtab')||'0',10)||0;
        await db.collection('examSchedules').doc(b.id).set({
          cert:b.id, source:'qnet', gId:_gid, qnetTab:_qtab, certName:b.name,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge:true });
        _qnetMsg='<br><span style="font-size:11.5px;color:#185FA5">📅 큐넷 자동수집 등록됨 (gId '+_gid+', '+(_qtab+1)+'차) — 다음 크롤(매주 월 03:00) 때 시험일이 채워집니다.</span>';
      }catch(e){ _qnetMsg='<br><span style="font-size:11.5px;color:#A32D2D">⚠️ 자동수집 등록 실패: '+e.message+'</span>'; }
    }
    st.style.color='#15793F';
    st.innerHTML='✅ 등록 완료 — '+(idx>=0?'갱신':'신규 추가')+': <b>'+b.name+'</b> ('+b.id+') · 과목 '+b.subjects.length+'개<br><span style="font-size:11.5px;color:#A89C8E">다음 단계: ① "기출 업로드"로 이 시험의 문항 올리기 ('+b.id+'__s1 …) → ② 업로드 후 "🔄 manifest 버전 동기화" 클릭 → ③ 앱 새로고침하면 홈에 카드가 나타납니다.</span>'+_qnetMsg;
    if(idx<0){ eaSubs=[{n:''}]; ['eaId','eaName','eaLabel','eaGid'].forEach(function(x){var e=document.getElementById(x);if(e)e.value='';}); var _qt=document.getElementById('eaQtab'); if(_qt)_qt.value='0'; eaRenderSubs(); eaRender(); }
    if(typeof eaLoadList==='function') eaLoadList();
  }catch(e){ st.style.color='#A32D2D'; st.textContent='오류: '+e.message; }
}
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.cat-item, .cat-single').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('panel-'+name);
  if(panel) panel.classList.add('active');
  // 활성 메뉴 표시 + 속한 그룹 펼침
  const navEl = document.querySelector('[data-tab="'+name+'"]');
  if(navEl){
    navEl.classList.add('active');
    document.querySelectorAll('.cat.open').forEach(function(c){ c.classList.remove('open'); });  // 겹침 드롭다운: 선택 후 닫기
  }
  if(name==='crm'){ emInit(); }
  if(name==='maillog'){ emLogLoad(); }
  if(name==='stats') renderStats();
  if(name==='entitlements') renderEntMembers();
  if(name==='export'){ openExportTab(); imgImpInit(); }
  if(name==='import') impInit();
  if(name==='imgup'){ iuInit(); openExportTab(); imgImpInit(); }
  if(name==='imglib'){ imgLibInit(); }
  if(name==='imgbank'){ imgBankInit(); }
  if(name==='community') cmaInit();
  if(name==='mnem') mnemInit();
  if(name==='tblmaster') tblmInit();
  if(name==='cptmaster') cptmInit();
  if(name==='ottag'){ ottagBindImp(); if(!_cptmLoaded) cptmLoad(); }
  if(name==='cpatch'){ cpatchBindImp(); }
  if(name==='levelup') lvupInit();
  if(name==='grpmaster') grpmInit();
  if(name==='itvmaster') itvmInit();
  if(name==='examadd'){ eaInit(); }
}
// 카테고리 헤더 접고/펴기 (여러 그룹 동시 펼침 가능)
function catToggle(headEl){ const g = headEl.closest('.cat'); if(!g) return; var wasOpen=g.classList.contains('open'); document.querySelectorAll('.cat.open').forEach(function(c){ if(c!==g) c.classList.remove('open'); }); g.classList.toggle('open', !wasOpen); }
// 메뉴 바깥 클릭 시 모든 드롭다운 닫기
document.addEventListener('click', function(e){ if(!e.target.closest('.cat')) document.querySelectorAll('.cat.open').forEach(function(c){ c.classList.remove('open'); }); });

// ===== 데이터 로드 =====
// ===== 자동 새로고침(폴링): 5분 주기, 화면 보일 때만 =====
let _pollTimer=null, _pollBusy=false;
const POLL_MS=5*60*1000;
async function pollRefresh(silent){
  if(_pollBusy) return; _pollBusy=true;
  const btn=document.getElementById('adminRefreshBtn');
  if(btn){ btn.disabled=true; btn.textContent='⏳ 불러오는 중…'; }
  try{ await loadAll(); }catch(_){}
  if(btn){ btn.disabled=false; btn.textContent='🔄 새로고침'; const t=document.getElementById('adminRefreshTime'); if(t) t.textContent='업데이트 '+new Date().toLocaleTimeString('ko-KR'); }
  _pollBusy=false;
}
function startPolling(){
  stopPolling();
  if(document.visibilityState==='visible') _pollTimer=setInterval(()=>{ if(document.visibilityState==='visible') pollRefresh(true); }, POLL_MS);
}
function stopPolling(){ if(_pollTimer){ clearInterval(_pollTimer); _pollTimer=null; } }
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='visible'){ pollRefresh(true); startPolling(); }
  else stopPolling();
});
async function loadAll() {
  await Promise.all([loadPayments(), loadMembers(), loadReports(), loadCodes(), loadMileage()]);
  renderMembers(allMembers);   // 결제·쿠폰 로드 후 출처 배지 반영해 재렌더
  renderMileage();             // 회원·추천 로드 후 마일리지 재계산
  loadDashboard();
}

let allCodes = [];
async function loadCodes() {
  try {
    const snap = await db.collection('discountCodes').get();
    allCodes = snap.docs.map(d => ({code:d.id, ...d.data()}));
    // 코드명 순 정렬 (TEST01, TEST02 …)
    allCodes.sort((a,b)=> (a.code||'').localeCompare(b.code||'', undefined, {numeric:true}));
    renderCodes(allCodes);
  } catch(e) {
    console.error('[loadCodes]',e);
    document.getElementById('codeList').innerHTML = '<div class="empty">불러오기 실패: '+(e&&e.code?e.code:(e&&e.message?e.message:e))+'</div>';
  }
}
function certNameShort(c){ return c? certWithId(c) : '전체'; }
function renderCodes(list) {
  if (!list.length) { document.getElementById('codeList').innerHTML = '<div class="empty">할인코드가 없습니다.</div>'; return; }
  const usedN = list.filter(c=>c.used).length;
  document.getElementById('codeList').innerHTML = `
    <div style="padding:12px 20px;font-size:13px;color:#6E6256;border-bottom:1px solid #F0F0F0">
      전체 <b>${list.length}</b>개 · 사용 <b style="color:#2E9B5E">${usedN}</b>개 · 미사용 <b style="color:#A89C8E">${list.length-usedN}</b>개</div>
    <table>
      <thead><tr><th>코드</th><th>적용 시험</th><th>기간</th><th>상태</th><th>사용자</th><th>사용일</th></tr></thead>
      <tbody>${list.map(c => `
        <tr>
          <td style="font-weight:700">${c.code}</td>
          <td>${certNameShort(c.certType)}</td>
          <td>${c.days||7}일</td>
          <td><span class="badge ${c.used?'badge-approved':'badge-pending'}">${c.used?'사용됨':'미사용'}</span></td>
          <td>${c.usedByEmail||'-'}</td>
          <td>${c.usedAt?fmtDateShort(c.usedAt):'-'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}
function filterCodes() {
  const q = document.getElementById('searchCode').value.toLowerCase();
  renderCodes(allCodes.filter(c => (c.code||'').toLowerCase().includes(q) || (c.usedByEmail||'').toLowerCase().includes(q)));
}

// ===== 마일리지 / 추천 현황 =====
let allReferrals = [];
async function loadMileage() {
  try {
    const snap = await db.collection('referrals').get();
    allReferrals = snap.docs.map(d => ({id:d.id, ...d.data()}));
  } catch(e) { allReferrals = []; }
  renderMileage();
}
function mileBalanceOf(m){
  const now=Date.now(); let s=0;
  (m.mileageLots||[]).forEach(l=>{ if(l && !l.used && (!l.exp||l.exp>now)) s+=(l.a||0); });
  return s;
}
function mileHistSum(m, neg){
  let s=0; (m.mileageHistory||[]).forEach(h=>{ const a=h.a||0; if(neg){ if(a<0) s+=-a; } else { if(a>0) s+=a; } }); return s;
}
function memberByUid(uid){ return allMembers.find(x=>x.id===uid); }
function memberByEmail(em){ if(!em) return null; em=em.toLowerCase(); return allMembers.find(x=>(x.email||'').toLowerCase()===em); }
function renderMileage(list){
  const box=document.getElementById('mileList'); if(!box) return;
  const members = list || allMembers;
  // 추천인(자기 코드로 가입자가 1명 이상 있는 회원)만 헤더로
  let refers = members.map(m=>{
    const code=m.referralCode||'';
    const refs=allReferrals.filter(r=>r.referrerCode && code && r.referrerCode===code && r.refereeUid!==m.id);
    const paidRefs=refs.filter(r=>r.paid).length;
    const expectedMax = 1000 + refs.length*1000 + paidRefs*10000;
    const earned = mileHistSum(m,false);   // 받은 적립금(이력 기준)
    const used = mileHistSum(m,true);       // 사용 적립금
    const bal = mileBalanceOf(m);
    const selfRef = !!(m.referredBy && code && m.referredBy===code);
    const overMax = bal > expectedMax;
    const suspect = overMax || selfRef;
    return {m,code,refs,paidRefs,earned,used,bal,suspect,overMax,selfRef};
  }).filter(r=> r.refs.length>0);
  refers.sort((a,b)=> (Number(b.suspect)-Number(a.suspect)) || (b.earned-a.earned));
  if(!refers.length){ box.innerHTML='<div class="empty">추천으로 가입한 내역이 없습니다.</div>'; return; }
  const suspectN=refers.filter(r=>r.suspect).length;
  let html='<div style="padding:12px 20px;font-size:13px;color:#6E6256;border-bottom:1px solid #F0F0F0">'
    +'추천인 <b>'+refers.length+'</b>명 · 의심 <b style="color:#A32D2D">'+suspectN+'</b>명</div>'
    +'<table><thead><tr><th>추천인 / 가입자</th><th>결제</th><th>받은 적립금</th><th>사용 적립금</th><th>상태</th></tr></thead><tbody>';
  refers.forEach((r,i)=>{
    // 추천인 헤더 줄
    html+='<tr style="background:#F4F6FA'+(r.suspect?';background:#FFF6F6':'')+';font-weight:700">'
      +'<td>👤 '+(r.m.email||'-')+_testBadge(r.m.email)+' <span style="color:#8A7E70;font-weight:500">('+r.refs.length+'명 추천)</span></td>'
      +'<td>'+r.paidRefs+'결제</td>'
      +'<td style="color:#15793F">+'+r.earned.toLocaleString()+'원</td>'
      +'<td style="color:#A32D2D">-'+r.used.toLocaleString()+'원</td>'
      +'<td>'+(r.suspect?'<span class="badge badge-revoked">⚠ 의심'+(r.overMax?' (잔액초과)':'')+(r.selfRef?' (자기추천)':'')+'</span>':'<span class="badge badge-approved">정상</span>')+'</td></tr>';
    // 가입자 한 명씩
    r.refs.forEach(rf=>{
      const gm = memberByUid(rf.refereeUid) || memberByEmail(rf.refereeEmail);
      const gEarned = gm? mileHistSum(gm,false):0;
      const gUsed = gm? mileHistSum(gm,true):0;
      const joined = gm && gm.createdAt ? (gm.createdAt.toDate?gm.createdAt.toDate():new Date(gm.createdAt)).toLocaleDateString('ko-KR') : '';
      html+='<tr style="font-size:13px">'
        +'<td style="padding-left:28px;color:#4A4036">└ '+(rf.refereeEmail||rf.refereeUid)+(joined?' <span style="color:#B4A99C">'+joined+' 가입</span>':'')+'</td>'
        +'<td>'+(rf.paid?'<span style="color:#15793F">결제함</span>':'<span style="color:#B4A99C">가입만</span>')+'</td>'
        +'<td style="color:#15793F">+'+gEarned.toLocaleString()+'원</td>'
        +'<td style="color:#A32D2D">-'+gUsed.toLocaleString()+'원</td>'
        +'<td></td></tr>';
    });
  });
  html+='</tbody></table>';
  box.innerHTML=html;
}
function filterMile(){
  const q=document.getElementById('searchMile').value.toLowerCase();
  renderMileage(allMembers.filter(m=>(m.email||'').toLowerCase().includes(q)||(m.referralCode||'').toLowerCase().includes(q)||(m.referredBy||'').toLowerCase().includes(q)));
}

async function loadPayments() {
  try {
    const snap = await db.collection('payments').orderBy('createdAt','desc').get();
    allPayments = snap.docs.map(d => ({id:d.id, ...d.data()}));
    renderPayments(allPayments);
    renderRecentPayments();
    updatePendingBadge();
  } catch(e) { console.error('[loadPayments]',e); document.getElementById('paymentList').innerHTML = '<div class="empty">불러오기 실패: '+(e&&e.code?e.code:(e&&e.message?e.message:e))+'</div>'; }
}

async function loadMembers() {
  try {
    const [usnap, csnap] = await Promise.all([
      db.collection('users').orderBy('createdAt','desc').get(),
      db.collection('discountCodes').get().catch(()=>null)
    ]);
    allMembers = usnap.docs.map(d => ({id:d.id, ...d.data()}));
    codeByUid = {};
    if (csnap) csnap.docs.forEach(d => {
      const c = d.data();
      if (c.used && c.usedBy) (codeByUid[c.usedBy] = codeByUid[c.usedBy] || []).push(d.id);
    });
    renderMembers(allMembers);   // 우선 빠르게 표시 (학습량은 '…')
    // 회원별 학습량(userData) 비동기 로드 후 갱신 — cardProgress 키는 'cert|문항id' 형식
    await Promise.all(allMembers.map(async m => {
      try {
        const ud = await db.collection('userData').doc(m.id).get();
        if (ud.exists) {
          const d = ud.data();
          const cp = d.cardProgress && typeof d.cardProgress==='object' ? d.cardProgress : {};
          const keys = Object.keys(cp);
          m._studied = keys.length;
          // 푼 횟수·학습문항은 자동복습 기록(cardProgress) 기준만 사용 (옛 solveCount 폴백 제거)
          let tries = 0, lastLr = 0; const per = {};
          keys.forEach(k => {
            const p=cp[k]; const rc=(p && p.rc) ? p.rc : 0;
            tries += rc; if(p && p.lr && p.lr>lastLr) lastLr=p.lr;
            const bar = k.indexOf('|'); const cert = bar>0 ? k.slice(0,bar) : '_etc';
            (per[cert] = per[cert] || {solve:0, studied:0, lr:0}); per[cert].solve += rc; per[cert].studied++;
            if(p && p.lr && p.lr>per[cert].lr) per[cert].lr=p.lr;
          });
          m._solve = tries; m._lastStudy = lastLr||null; m._perCert = per;
        } else { m._solve = 0; m._studied = 0; m._lastStudy = null; m._perCert = {}; }
      } catch(_) { m._solve = 0; m._studied = 0; m._lastStudy = null; m._perCert = {}; }
    }));
    const q = (document.getElementById('searchMember')||{}).value || '';
    renderMembers(q ? allMembers.filter(m => (m.email||'').toLowerCase().includes(q.toLowerCase())) : allMembers);
  } catch(e) { console.error('[loadMembers]',e); document.getElementById('memberList').innerHTML = '<div class="empty">불러오기 실패: '+(e&&e.code?e.code:(e&&e.message?e.message:e))+'</div>'; }
}

// 회원이 어떤 자격증이든 유효한 이용권을 가졌는지 판정 (top-level + entitlements)
function daysSince(ts){ if(!ts) return null; const d=ts.toDate?ts.toDate():new Date(ts); return Math.floor((Date.now()-d.getTime())/86400000); }
function agoTxt(ts){ const n=daysSince(ts); if(n==null) return ''; return n<=0?'오늘':(n+'일 전'); }
function fmtWithAgo(ts){ if(!ts) return '<span style="color:#C9BFB2">-</span>'; return fmtDateShort(ts)+' <span style="color:#A89C8E;font-size:11px">('+agoTxt(ts)+')</span>'; }
function memberGrade(m){
  const s=memberStatus(m);
  if(s==='ACTIVE') return {label:'유료', cls:'g-paid'};
  if(s!=='FREE_TRIAL') return {label:'-', cls:'g-none'};   // 만료·게스트는 등급 없음
  const n=m._solve||0;
  if(n>=31) return {label:'A', cls:'g-a'};   // 31회 이상
  if(n>=11) return {label:'B', cls:'g-b'};   // 11~30회
  if(n>=1)  return {label:'C', cls:'g-c'};   // 1~10회
  return {label:'D', cls:'g-d'};             // 0회
}
function memberStatus(m) {
  const now = new Date();
  const live = ent => {
    if (!ent || ent.plan !== 'ACTIVE') return false;
    if (!ent.expireAt) return true;
    const d = ent.expireAt.toDate ? ent.expireAt.toDate() : new Date(ent.expireAt);
    return d > now;
  };
  if (m.plan === 'ACTIVE' && live({plan:'ACTIVE', expireAt:m.expireAt})) return 'ACTIVE';
  if (m.entitlements && Object.values(m.entitlements).some(live)) return 'ACTIVE';
  if (m.plan === 'EXPIRED') return 'EXPIRED';
  if (m.plan === 'FREE_TRIAL' || (m.entitlements && Object.values(m.entitlements).some(e=>e&&e.plan==='FREE_TRIAL'))) return 'FREE_TRIAL';
  return m.plan || 'GUEST';
}

function loadDashboard() {
  const now = new Date();
  const realMembers = allMembers.filter(m => !isExcludedMember(m)); // 테스트/관리자 계정 제외
  const total = realMembers.length;
  let free=0, active=0, expired=0;
  realMembers.forEach(m => {
    const s = memberStatus(m);
    if (s === 'ACTIVE') active++;
    else if (s === 'EXPIRED') expired++;
    else if (s === 'FREE_TRIAL') free++;
  });
  const pending = allPayments.filter(p => p.status === 'pending' && !isExcludedPay(p)).length;

  // 이번 달 매출 — 자동승인/승인 건 모두 집계 (철회/거절 제외)
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const revenue = allPayments
    .filter(p => {
      if (!isPaid(p.status)) return false;
      if (isExcludedPay(p)) return false;
      const ref = p.approvedAt || p.createdAt;
      if (!ref) return false;
      const d = ref.toDate ? ref.toDate() : new Date(ref);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, p) => sum + (p.depositAmount!=null ? p.depositAmount : (p.price || 0)), 0);

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statFree').textContent = free;
  document.getElementById('statActive').textContent = active;
  document.getElementById('statExpired').textContent = expired;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statRevenue').textContent = revenue.toLocaleString() + '원';

  // ===== CRM 통계 =====
  const WEEK = 7*86400000; const nowMs = now.getTime();
  const dOf = (t)=> t ? (t.toDate?t.toDate():new Date(t)) : null;
  // 전환율 = 유료 / 전체
  const conv = total>0 ? Math.round(active/total*100) : 0;
  // 최근 7일 가입
  const new7 = realMembers.filter(m=>{ const d=dOf(m.createdAt); return d && (nowMs-d.getTime())<=WEEK; }).length;
  // 최근 7일 결제(결제 건 기준, 철회/거절 제외)
  const pay7 = allPayments.filter(p=>{ if(!isPaid(p.status)) return false; if(isExcludedPay(p)) return false; const d=dOf(p.approvedAt||p.createdAt); return d && (nowMs-d.getTime())<=WEEK; }).length;
  // 학습 20회 이상 무료회원
  const hot = realMembers.filter(m=> memberStatus(m)==='FREE_TRIAL' && (m._solve||0)>=20 ).length;

  const setT=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  setT('statConv', conv+'%');
  setT('statNew7', new7+'명');
  setT('statPay7', pay7+'건');
  setT('statHot', hot+'명');
}

function updatePendingBadge() {
  const pending = allPayments.filter(p => p.status === 'pending' && !isExcludedPay(p)).length;
  ['pendingBadge','grpBadgePayments'].forEach(id => {
    const badge = document.getElementById(id); if(!badge) return;
    if (pending > 0) { badge.textContent = pending; badge.style.display = 'inline-block'; }
    else { badge.style.display = 'none'; }
  });
}

// ===== 렌더링 =====
const planNames = {7:'Basic (7일)', 14:'Standard (14일)', 28:'Premium (28일)'};
const planBadge = p => p === 'FREE_TRIAL' ? 'badge-free' : p === 'ACTIVE' ? 'badge-active' : p === 'EXPIRED' ? 'badge-expired' : 'badge-guest';
const planLabel = p => p === 'FREE_TRIAL' ? '무료체험' : p === 'ACTIVE' ? '이용중' : p === 'EXPIRED' ? '만료' : p;
// 이용 출처 판정 (결제/쿠폰) — payments·discountCodes와 대조
function memberSource(m){
  const em = (m.email||'').toLowerCase();
  const paid = allPayments.some(p => isPaid(p.status) && (p.uid===m.id || (p.email&&em&&p.email.toLowerCase()===em)));
  const coupon = allCodes.some(c => c.used && (c.usedBy===m.id || (c.usedByEmail&&em&&c.usedByEmail.toLowerCase()===em)));
  return {paid, coupon};
}
function memberBadges(m){
  const s = memberStatus(m);
  if(s==='ACTIVE'){
    const src=memberSource(m); const out=[];
    if(src.paid) out.push('<span class="badge badge-active">유료</span>');
    if(src.coupon) out.push('<span class="badge badge-coupon">쿠폰</span>');
    if(!out.length) out.push('<span class="badge badge-active">이용중</span>');
    return out.join(' ');
  }
  return `<span class="badge ${planBadge(s)}">${planLabel(s)}</span>`;
}

function fmtDate(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('ko-KR', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function fmtDateShort(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('ko-KR', {year:'2-digit',month:'2-digit',day:'2-digit'});
}
function daysLeft(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.ceil((d - new Date()) / 86400000);
  return diff > 0 ? diff + '일' : '만료';
}

function renderRecentPayments() {
  const recent = allPayments.slice(0, 5);
  if (!recent.length) { document.getElementById('recentPayments').innerHTML = '<div class="empty">결제 신청이 없습니다.</div>'; return; }
  document.getElementById('recentPayments').innerHTML = `
    <table>
      <thead><tr><th>이메일</th><th>자격증</th><th>플랜</th><th>금액</th><th>상태</th><th>신청일</th></tr></thead>
      <tbody>${recent.map(p => `
        <tr>
          <td>${p.email||'-'}${isExcludedPay(p)?' <span class="badge" style="background:#EEE;color:#888;font-size:10px">TEST</span>':''}</td>
          <td style="font-size:11px">${certNameOf(p)}</td>
          <td>${p.kind==='aigrade'?'<span style="color:#7F4FD8;font-weight:700">🤖 '+(p.wallet==='explain'?'해설':'첨삭')+' '+(p.packSize||0)+'회</span>':(planNames[p.planDays]||p.planDays+'일')}</td>
          <td>${p.mileageUsed>0 ? (p.depositAmount||0).toLocaleString()+'원<div style="font-size:11px;color:#C2611B">+마일리지 '+(p.mileageUsed||0).toLocaleString()+'</div>' : (p.price||0).toLocaleString()+'원'}</td>
          <td><span class="badge ${statusBadge(p.status)}">${statusLabel(p.status)}</span></td>
          <td>${fmtDate(p.createdAt)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderPayments(list) {
  if (!list.length) { document.getElementById('paymentList').innerHTML = '<div class="empty">결제 신청이 없습니다.</div>'; return; }
  document.getElementById('paymentList').innerHTML = `
    <table>
      <thead><tr><th>이메일</th><th>입금자</th><th>자격증</th><th>플랜</th><th>금액</th><th>상태</th><th>신청일</th><th>처리</th></tr></thead>
      <tbody>${list.map(p => `
        <tr>
          <td>${p.email||'-'}${isExcludedPay(p)?' <span class="badge" style="background:#EEE;color:#888;font-size:10px">TEST</span>':''}</td>
          <td><strong>${p.depositorName||'-'}</strong></td>
          <td style="font-size:11px">${certNameOf(p)}</td>
          <td>${p.kind==='aigrade'?'<span style="color:#7F4FD8;font-weight:700">🤖 '+(p.wallet==='explain'?'해설':'첨삭')+' '+(p.packSize||0)+'회</span>':(planNames[p.planDays]||p.planDays+'일')}</td>
          <td>${p.mileageUsed>0 ? (p.depositAmount||0).toLocaleString()+'원<div style="font-size:11px;color:#C2611B">+마일리지 '+(p.mileageUsed||0).toLocaleString()+'</div>' : (p.price||0).toLocaleString()+'원'}</td>
          <td><span class="badge ${statusBadge(p.status)}">${statusLabel(p.status)}</span></td>
          <td>${fmtDate(p.createdAt)}</td>
          <td>${
            p.status==='pending' ? `
              <button class="btn-sm btn-approve" onclick="openApprove('${p.id}')">승인</button>
              <button class="btn-sm btn-reject" onclick="openReject('${p.id}')" style="margin-left:4px">거절</button>`
            : isPaid(p.status) ? `
              <button class="btn-sm btn-reject" onclick="openRevoke('${p.id}')">철회</button>`
            : '-'}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderMembers(list) {
  if (!list.length) { document.getElementById('memberList').innerHTML = '<div class="empty">회원이 없습니다.</div>'; return; }
  document.getElementById('memberList').innerHTML = `
    <table>
      <thead><tr><th>이메일</th><th>등급</th><th>상태</th><th>가입 시험</th><th>학습량</th><th>최근 로그인</th><th>최근 학습</th><th>가입(경과)</th></tr></thead>
      <tbody>${list.map(m => {
        const s = memberStatus(m);
        const g = memberGrade(m);
        const learn = m._solve==null ? '<span style="color:#B4A99C">…</span>'
          : `<div style="display:flex;gap:12px">
               <div style="text-align:center"><div style="font-weight:700;color:#2C2C2A">${(m._solve||0).toLocaleString()}</div><div style="font-size:10px;color:#A89C8E">푼 횟수</div></div>
               <div style="text-align:center"><div style="font-weight:700;color:#2C2C2A">${m._studied||0}</div><div style="font-size:10px;color:#A89C8E">학습문항</div></div>
             </div>${(()=>{ const ch=perCertChips(m._perCert,2); return ch?('<div style="margin-top:3px">'+ch+'</div>'):''; })()}`;
        return `
        <tr style="cursor:pointer" onclick="openMemberDetail('${m.id}')">
          <td>${m.email||'-'}${isExcludedMember(m)?' <span class="badge" style="background:#EEE;color:#888;font-size:10px">TEST</span>':''}</td>
          <td><span class="grade ${g.cls}">${g.label}</span></td>
          <td>${memberBadges(m)}</td>
          <td>${signupCertHTML(m)}</td>
          <td>${learn}</td>
          <td>${fmtWithAgo(m.lastLoginAt)}</td>
          <td>${fmtWithAgo(m._lastStudy)}</td>
          <td>${fmtDateShort(m.createdAt)} <span style="color:#A89C8E;font-size:11px">(${daysSince(m.createdAt)==null?'-':daysSince(m.createdAt)+'일)'}</span></td>
        </tr>`;}).join('')}
      </tbody>
    </table>`;
}

// ===== 검색 =====
function filterPayments() {
  const q = document.getElementById('searchPayment').value.toLowerCase();
  renderPayments(allPayments.filter(p => (p.email||'').toLowerCase().includes(q)));
}
function filterMembers() {
  renderMembers(currentMemberFilter());
}
// 현재 회원관리 탭의 필터(검색어+등급)가 적용된 목록 반환
function currentMemberFilter(){
  const q = (document.getElementById('searchMember').value||'').toLowerCase();
  const g = (document.getElementById('filterGrade')||{}).value || '';
  return allMembers.filter(m => {
    if (q && !((m.email||'').toLowerCase().includes(q))) return false;
    if (g && memberGrade(m).label !== g) return false;
    return true;
  });
}
// 현재 필터된 회원 명단을 CSV로 다운로드 (마케팅용)
function downloadMembersCSV(){
  const list = currentMemberFilter();
  if(!list.length){ alert('다운로드할 회원이 없습니다.'); return; }
  const csvCell = v => {
    var s = (v==null?'':String(v));
    if(/[",\n]/.test(s)) s = '"'+s.replace(/"/g,'""')+'"';
    return s;
  };
  const dOf = d => { if(!d) return ''; try{ var x=d.toDate?d.toDate():new Date(d); return isNaN(x)?'':x.toLocaleDateString('ko-KR'); }catch(_){ return ''; } };
  const headers = ['이메일','등급','상태','가입 시험','푼 횟수','학습 문항','가입일','경과일','최근 로그인','최근 학습','추천코드','추천인'];
  const rows = list.map(m => {
    const g = memberGrade(m), s = memberStatus(m);
    const stTxt = s==='ACTIVE'?'유료':s==='FREE_TRIAL'?'무료체험':s==='EXPIRED'?'만료':s;
    const ds = (typeof daysSince==='function')? daysSince(m.createdAt) : '';
    return [ m.email||'', g.label, stTxt, (m.signupCert?certLabel(m.signupCert):''), (m._solve||0), (m._studied||0),
             dOf(m.createdAt), (ds==null?'':ds), dOf(m.lastLoginAt), dOf(m._lastStudy),
             m.referralCode||'', m.referredBy||'' ].map(csvCell).join(',');
  });
  const csv = '\uFEFF' + headers.map(csvCell).join(',') + '\n' + rows.join('\n');   // BOM = 엑셀 한글 깨짐 방지
  const gradeLabel = (document.getElementById('filterGrade')||{}).value || '전체';
  const today = new Date().toISOString().slice(0,10);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `certlab_회원_${gradeLabel}_${today}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function closeMemberDetail(){ const el=document.getElementById('memberDetailModal'); if(el) el.classList.add('hidden'); }
// ===== 데이터 내보내기 =====
let _expExams = null;
async function openExportTab(){
  if(!_expExams){
    try{ const m=await db.collection('manifest').doc('exams').get(); _expExams=(m.exists && m.data().exams)||[]; }catch(e){ _expExams=[]; }
  }
  // 표시 보정(멱등): 구술(bodybuilding) 이름 통일 + sport2(필기) 바로 밑으로 정렬
  try{
    _expExams=(_expExams||[]).map(function(e){ return (e&&e.id==='bodybuilding')?Object.assign({},e,{name:'스포츠지도사 2급 실기·구술'}):e; });
    var _bbi=_expExams.findIndex(function(e){return e&&e.id==='bodybuilding';});
    var _spi=_expExams.findIndex(function(e){return e&&e.id==='sport2';});
    if(_bbi>-1 && _spi>-1 && _bbi!==_spi+1){ var _bb=_expExams.splice(_bbi,1)[0]; var _at=_expExams.findIndex(function(e){return e&&e.id==='sport2';}); _expExams.splice(_at+1,0,_bb); }
  }catch(_){}
  const sel=document.getElementById('expCert'); if(!sel) return;
  sel.innerHTML='<option value="__all">전체 (모든 자격증)</option>'
    + _expExams.map(e=>'<option value="'+e.id+'">'+(e.name||e.id)+'</option>').join('');
  expFillSub();
  const isel=document.getElementById('imgExpCert');
  if(isel) isel.innerHTML='<option value="__all">전체 (모든 자격증)</option>'
    + _expExams.map(e=>'<option value="'+e.id+'">'+(e.name||e.id)+'</option>').join('');
  imgExpFill();
}
// 기출 내보내기: 시험 선택 시 과목 채우기
function expFillSub(){
  const cert=document.getElementById('expCert'), sub=document.getElementById('expSub'); if(!cert||!sub) return;
  if(cert.value==='__all'){ sub.innerHTML='<option value="__all">전체 과목</option>'; sub.disabled=true; return; }
  sub.disabled=false;
  const ex=(_expExams||[]).find(e=>e.id===cert.value); const subs=(ex&&ex.subjects)||[];
  sub.innerHTML='<option value="__all">전체 과목</option>'+subs.map(s=>'<option value="'+s.code+'">'+(s.name||s.code)+'</option>').join('');
}
// 이미지 내보내기: 자격증 선택 시 과목 채우기
function imgExpFill(){
  const cert=document.getElementById('imgExpCert'); const sub=document.getElementById('imgExpSub'); const set=document.getElementById('imgExpSet');
  if(!cert||!sub) return;
  const pick=cert.value;
  if(pick==='__all'){
    sub.innerHTML='<option value="__all">전체 과목</option>'; sub.disabled=true;
    if(set){ set.innerHTML='<option value="__all">전체 회차</option>'; set.disabled=true; }
    return;
  }
  sub.disabled=false;
  const exam=(_expExams||[]).find(e=>e.id===pick);
  const subs=(exam&&exam.subjects)||[];
  sub.innerHTML='<option value="__all">전체 과목</option>'
    + subs.map(s=>'<option value="'+s.code+'">'+(s.name||s.code)+'</option>').join('');
  imgExpFillSet();
}
// 이미지 내보내기: 자격증+과목의 banks에서 회차(set) 목록 채우기
async function imgExpFillSet(){
  const cert=document.getElementById('imgExpCert'); const sub=document.getElementById('imgExpSub'); const set=document.getElementById('imgExpSet');
  if(!cert||!set) return;
  const pick=cert.value; const subPick=(sub&&sub.value)||'__all';
  const stt=document.getElementById('imgExpStatus');
  if(pick==='__all'){ set.innerHTML='<option value="__all">전체 회차</option>'; set.disabled=true; return; }
  set.disabled=true; set.innerHTML='<option value="__all">회차 읽는 중…</option>';
  if(!_expExams){ try{ const m=await db.collection('manifest').doc('exams').get(); _expExams=(m.exists&&m.data().exams)||[]; }catch(_){ _expExams=[]; } }
  const exam=(_expExams||[]).find(e=>e.id===pick);
  const subs=((exam&&exam.subjects)||[]).filter(s=>subPick==='__all'||s.code===subPick);
  const setList=[]; const dbg=[];
  if(!subs.length) dbg.push('과목 매칭 없음(exam='+(exam?'있음':'없음')+', subPick='+subPick+')');
  for(const s of subs){
    const id=pick+'__'+s.code;
    try{ const bd=await db.collection('banks').doc(id).get();
      if(!bd.exists){ dbg.push(id+': bank 없음'); continue; }
      const data=bd.data()||{};
      if(Array.isArray(data.shards)&&data.shards.length){
        // 샤딩된 bank: shards 배열이 곧 회차 목록
        data.shards.forEach(v=>{ if(v&&setList.indexOf(v)<0) setList.push(v); });
        dbg.push(id+': shards '+data.shards.length);
      } else {
        const qs=data.questions||data.items||[];
        let withSet=0; qs.forEach(q=>{ const v=(q&&q.set)||''; if(v){ withSet++; if(setList.indexOf(v)<0) setList.push(v); } });
        dbg.push(id+': 문항'+qs.length+'·set필드'+withSet);
      }
    }catch(e){ dbg.push(id+': 오류 '+(e&&e.message||e)); }
  }
  set.innerHTML='<option value="__all">전체 회차</option>'+setList.map(v=>'<option value="'+v.replace(/"/g,'&quot;')+'">'+v+'</option>').join('')+'<option value="__levelup">⚡ 레벨업(변형문항)</option>';
  set.disabled=false;
  if(stt) stt.innerHTML=(setList.length?('회차 '+setList.length+'개 로드됨 — '+setList.join(', ')):'<span style="color:#C2410C">⚠ 회차를 못 찾음</span>')
    +' <span style="color:#A89C8E">[진단: '+dbg.join(' / ')+']</span>';
}
