const ADMIN_EMAIL = 'certlab.team@gmail.com';
// 집계·목록에서 제외할 테스트/관리자 계정 (소문자)
const EXCLUDED_EMAILS = ['certlab.team@gmail.com','f45dodam@gmail.com','makeshiness@gmail.com'];
function isExcludedMember(m){ return EXCLUDED_EMAILS.includes((m && m.email || '').toLowerCase()); }
function isExcludedPay(p){ return EXCLUDED_EMAILS.includes((p && p.email || '').toLowerCase()); }
function _testBadge(email){ return EXCLUDED_EMAILS.includes((email||'').toLowerCase()) ? ' <span class="badge" style="background:#EEE;color:#888;font-size:10px">TEST</span>' : ''; }
const firebaseConfig = {
  apiKey: "AIzaSyCSQlow8xzRsv0EMtIYJ6_WDRAFUECrw2Q",
  authDomain: "certlab-c3bcb.firebaseapp.com",
  projectId: "certlab-c3bcb",
  storageBucket: "certlab-c3bcb.firebasestorage.app",
  messagingSenderId: "698827699707",
  appId: "1:698827699707:web:b08d492f408ac444fa875e"
};
let auth = null, db = null, googleProvider = null, firebaseReady = false;
try {
  firebase.initializeApp(firebaseConfig);
  firebase.appCheck().activate(
    new firebase.appCheck.ReCaptchaV3Provider('6LeSfSQtAAAAAAycXeNoC1nMdIjMAdkh61qT_Dh2'),
    true
  );
  auth = firebase.auth();
  db = firebase.firestore();
  googleProvider = new firebase.auth.GoogleAuthProvider();
  firebaseReady = true;
} catch (e) {
  console.warn('Firebase를 불러오지 못했습니다. 로그인·동기화 없이 학습 기능만 동작합니다.', e);
}


// 결제 상태 헬퍼 — 앱은 즉시구매를 'auto_approved'로 저장한다
const CERT_NAMES = { bodybuilding:'스포츠지도사 2급 실기·구술', appraiser:'감평사', realestate1:'중개사1차', realestate2:'중개사2차', koreanhistory:'한국사', housing:'주택관리사' };
const isPaid = s => s === 'approved' || s === 'auto_approved';
const statusBadge = s => isPaid(s) ? 'badge-approved' : (s === 'pending' ? 'badge-pending' : 'badge-revoked');
const statusLabel = s => s === 'auto_approved' ? '자동승인' : s === 'approved' ? '승인' : s === 'pending' ? '승인대기' : s === 'revoked' ? '철회' : '거절';
const certNameOf = p => p.certName || (typeof _certNameMap!=='undefined'&&_certNameMap&&_certNameMap[p.certType]) || CERT_NAMES[p.certType] || p.certType || '스포츠지도사 2급 실기·구술';

// ===== 가입 시험 + 시험별 풀이 =====
const CERT_SHORT = { bodybuilding:'실기·구술', appraiser:'감평사', realestate1:'중개1', realestate2:'중개2', koreanhistory:'한국사', housing:'주택관리사' };
const CERT_CHIP = { appraiser:'background:#E6F1FB;color:#185FA5', koreanhistory:'background:#FFF1E0;color:#A8650A', bodybuilding:'background:#E9F7EF;color:#1D7A4D', realestate1:'background:#F4EEF9;color:#5B50C0', realestate2:'background:#FBEAF1;color:#B23A76', housing:'background:#EAF3EC;color:#2E7D46', _etc:'background:#F0ECE6;color:#9B9082' };
function certLabel(c){ return CERT_NAMES[c]||c||'기타'; }
function certShort(c){ return CERT_SHORT[c]||CERT_NAMES[c]||c||'기타'; }
function signupCertHTML(m){
  if(!m.signupCert) return '<span style="color:#C9BFB2;font-size:12px">기록 없음</span>';
  return '<span class="joincert">'+certLabel(m.signupCert)+'</span>';
}
function perCertChips(per, max){
  if(!per) return '';
  const arr=Object.keys(per).map(c=>({c, solve:per[c].solve, studied:per[c].studied})).filter(x=>x.solve>0||x.studied>0);
  arr.sort((a,b)=>b.solve-a.solve);
  const top=arr.slice(0, max||2);
  return top.map(x=>'<span class="cchip" style="'+(CERT_CHIP[x.c]||CERT_CHIP._etc)+'">'+certShort(x.c==='_etc'?'_etc':x.c)+' '+x.solve.toLocaleString()+'</span>').join('')
    + (arr.length>top.length?'<span class="cchip" style="'+CERT_CHIP._etc+'">+'+(arr.length-top.length)+'</span>':'');
}

async function adminLogin() {
  var P = (firebase.auth && firebase.auth.Auth && firebase.auth.Auth.Persistence) || {};
  var STORAGE_ERRS = ['auth/operation-not-supported-in-this-environment','auth/popup-blocked','auth/cancelled-popup-request','auth/web-storage-unsupported'];
  // 1차: 기본(LOCAL) 팝업
  try { await auth.signInWithPopup(googleProvider); return; }
  catch(e) {
    if (e.code === 'auth/popup-closed-by-user') return;
    if (STORAGE_ERRS.indexOf(e.code) < 0) { alert('로그인 오류: ' + e.message); return; }
  }
  // 2차: SESSION persistence로 낮춰 리다이렉트 (localStorage만 막힌 경우 대응)
  try { if (P.SESSION) await auth.setPersistence(P.SESSION); await auth.signInWithRedirect(googleProvider); return; } catch(_){}
  // 3차: 기본 persistence로 리다이렉트
  try { await auth.signInWithRedirect(googleProvider); return; } catch(_){}
  alert('이 브라우저에서는 로그인 저장소(쿠키·사이트 데이터)가 막혀 있어 로그인할 수 없어요.\n\n해결 방법:\n• 광고차단·프라이버시 확장프로그램을 이 사이트에서 끄기\n• 시크릿 모드면 일반 창에서 열기\n• 다른 브라우저(엣지)나 휴대폰에서 로그인 (휴대폰은 정상 작동)');
}
function adminLogout() { if(confirm('로그아웃 하시겠어요?')) auth.signOut(); }

// ===== 탭 =====
// ===== 📑 암기코드 마스터 (Firestore mnemonics CRUD) =====
var _mnemAll={}, _mnemLoaded=false, _mnemImpData=null, _mnemImpBound=false;
function mnemEsc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function mnemChantLetters(code){ var m=String(code||'').match(/<span class=['"]k['"]>[\s\S]*?<\/span>|<k>[\s\S]*?<\/k>/g); if(!m||m.length<2) return ''; return m.map(function(x){return x.replace(/<[^>]+>/g,'');}).join(''); }
function _mnPlainStripped(code){ return String(code||'').replace(/<[^>]+>/g,'').replace(/[\s·ㆍ・•∙\/,，、~–—()①②③④⑤⑥⑦⑧⑨⑩]/g,''); }
function mnemChantHTML(code){ var l=mnemChantLetters(code); if(!l) return ''; if(l===_mnPlainStripped(code)) return ''; return '<div class="chant">'+l+'</div>'; }
var MNEM_CIRCLED=['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
function mnemNorm(o){ if(o&&Array.isArray(o.boxes)&&o.boxes.length) return o.boxes.map(function(b){return {code:(b&&b.code)||'',desc:(b&&b.desc)||''};}); return [{code:(o&&o.code)||'',desc:(o&&o.desc)||''}]; }
function mnemBoxesAppHTML(m){
  var bx=mnemNorm(m).filter(function(b){return b.code||b.desc;});
  if(!bx.length) return '<div class="code" style="color:#94A3B8">(코드 없음)</div>';
  var multi=bx.length>1;
  return bx.map(function(b,i){
    var num='';
    var sep=i>0?'<div class="mnem-box-sep"></div>':'';
    return sep+num+mnemChantHTML(b.code)+'<div class="code">'+(b.code||'')+'</div>'+(b.desc?'<div class="desc'+((b.desc&&b.desc.indexOf('↓')>=0)?' mn-flow':'')+'">'+b.desc+'</div>':'');
  }).join('');
}
function mnemInit(){
  if(!_mnemLoaded) mnemLoad();
  if(!_mnemImpBound){ _mnemImpBound=true;
    var drop=document.getElementById('mnemImpDrop'), file=document.getElementById('mnemImpFile');
    if(drop) drop.onclick=function(){ file&&file.click(); };
    if(file) file.addEventListener('change', function(e){ mnemImpHandle(e.target.files); });
    if(drop){
      ['dragover','dragenter'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#185FA5';}); });
      ['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#CBD5E1';}); });
      drop.addEventListener('drop', function(e){ mnemImpHandle(e.dataTransfer.files); });
    }
  }
}
async function mnemLoad(){
  var st=document.getElementById('mnemStatus'); if(st){ st.style.color='#7F77DD'; st.textContent='불러오는 중…'; }
  try{
    var snap=await db.collection('mnemonics').get();
    _mnemAll={}; snap.forEach(function(d){ _mnemAll[d.id]=d.data()||{}; });
    _mnemLoaded=true;
    if(st) st.textContent='등록 '+Object.keys(_mnemAll).length+'개';
    mnemRenderList();
  }catch(e){ if(st){ st.style.color='#A32D2D'; st.textContent='로드 실패: '+e.message; } }
}
/* ===== 마스터 시험·과목 필터/그룹 (4개 탭 공용) ===== */
var _mfState={mnem:{cert:'',subj:'',sort:'recent'},tblm:{cert:'',subj:'',sort:'recent'},cptm:{cert:'',subj:'',sort:'recent'},grpm:{cert:'',subj:'',sort:'recent'},itvm:{cert:'',subj:'',sort:'recent'}};
var _mfShow={mnem:60,tblm:60,cptm:60,grpm:60,itvm:60};   // 지연 렌더: 한 번에 그리는 최대 개수(더보기로 증가)
function mfMore(ns){ _mfShow[ns]=(_mfShow[ns]||60)+120; if(_mfRender[ns]) _mfRender[ns](); }
var _mfRender={};   // ns -> RenderList (아래 함수들 hoist됨)
var MF_SUBJ={acct:'회계',econ:'경제',law:'법규',real:'부동산',civil:'민법',theory:'이론',tax:'세법',hist:'역사',bb:'보디빌딩'};
function mfEsc(x){return String(x==null?'':x).replace(/[&<>"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];});}
function mfSubj(id){ var p=String(id||'').split('_'); return p.length>=2?p[1]:''; }
function mfSubjOf(id, item){ return (item&&item.subj)||mfSubj(id); }   // 항목에 subj 있으면 우선(접두사와 분리)
function mfSubjLabel(c){ return MF_SUBJ[c]||c||'기타'; }
function mfSet(ns,which,val){ if(_mfState[ns]){ _mfState[ns][which]=val; _mfShow[ns]=60; if(_mfRender[ns]) _mfRender[ns](); } }
// ===== 업로드 안전 레이어 (마스터/기출/레벨업 공통) =====
function _impTs(v){ if(v==null) return null; if(typeof v==='object'){ if(v.toDate){try{return v.toDate().getTime();}catch(e){}} if(typeof v.seconds==='number') return v.seconds*1000; return null;} var t=Date.parse(v); return isNaN(t)?null:t; }
// 날짜 정규화 — 항상 KST(+09:00) ISO 문자열로 직렬화. (serverTimestamp 센티넬·해석된 Timestamp·{seconds}·문자열·누락 전부 흡수)
function _kstISO(d){ d=(d instanceof Date)?d:new Date(); if(isNaN(d.getTime())) d=new Date(); return new Date(d.getTime()+9*3600*1000).toISOString().replace(/\.\d{3}Z$/,'+09:00'); }
function _uaISO(v, fb){ if(typeof v==='string'){ var t=Date.parse(v); if(!isNaN(t)) return _kstISO(new Date(t)); } else if(v && typeof v.toDate==='function'){ try{ return _kstISO(v.toDate()); }catch(e){} } else if(v && typeof v.seconds==='number'){ return _kstISO(new Date(v.seconds*1000)); } return _kstISO(fb||new Date()); }
// 저장/임포트 직후 캐시에는 센티넬 대신 KST ISO 문자열을 박아 export 라운드트립을 깨끗하게 유지
function _cacheRec(rec){ return Object.assign({}, rec, { updatedAt:_kstISO(new Date()) }); }
// [부분로드] 올린 id들의 기존 문서만 골라 읽기 — 전체 컬렉션 read 회피(업로드 속도가 올린 개수에만 비례). 병렬 get, 청크 60.
async function _loadExistingByIds(col, ids){
  var out={}, uniq=[], seen={};
  (ids||[]).forEach(function(x){ x=String(x||''); if(x&&!seen[x]){ seen[x]=1; uniq.push(x); } });
  // 대량 업로드(전체 세트 등): 개별 수천 get은 컬렉션 1회 읽기보다 훨씬 느림 → 통째 1회 읽고 필요한 것만
  if(uniq.length>400){
    var need={}; uniq.forEach(function(x){ need[x]=1; });
    try{ var snap=await db.collection(col).get(); snap.forEach(function(d){ if(need[d.id]) out[d.id]=d.data()||{}; }); }catch(e){}
    return out;
  }
  var CH=60;
  for(var i=0;i<uniq.length;i+=CH){
    var chunk=uniq.slice(i,i+CH);
    var snaps=await Promise.all(chunk.map(function(id){ return db.collection(col).doc(id).get().catch(function(){return null;}); }));
    snaps.forEach(function(sn){ if(sn&&sn.exists) out[sn.id]=sn.data()||{}; });
  }
  return out;
}
// [배치] 여러 문서 쓰기를 writeBatch로 묶어 커밋(왕복 최소화). ops=[{ref,data[,after]}] set / {ref,del:true[,after]} delete. 청크 450.
async function _qbWrite(ops, onProg){
  var ok=0, fail=0, CH=450, _err='';
  for(var _i=0;_i<ops.length;_i+=CH){
    var _sl=ops.slice(_i,_i+CH), _b=db.batch();
    _sl.forEach(function(o){ if(o.del) _b.delete(o.ref); else _b.set(o.ref, o.data); });
    try{ await _b.commit(); ok+=_sl.length; _sl.forEach(function(o){ if(o.after){ try{ o.after(); }catch(_){} } }); }
    catch(e){ fail+=_sl.length; _err=(e&&(e.message||e.code))||String(e); try{ console.error('[batch commit]', e); }catch(__){} }
    if(onProg){ try{ onProg(Math.min(_i+CH,ops.length), ops.length); }catch(_){} }
  }
  if(ok>0){ try{ _qcCptCards=null; _mlaCache=null; }catch(_){} }   // 개념/마스터 쓰면 검수 캐시 무효화 → 게이트가 방금 올린 데이터로 검사(새로고침 불필요)
  return {ok:ok, fail:fail, err:_err};
}
// 마스터 업로드 실패 시 사유를 상태에 표시(공통) — "처리중…"에서 멈추지 않게
function _impFail(id, e){ var s=document.getElementById(id); if(s){ s.style.color='#A32D2D'; s.innerHTML='❌ 업로드 실패: '+((e&&(e.message||e.code))||String(e)||'알 수 없는 오류'); } try{ console.error('[master upload]', e); }catch(_){} }
function _grpParams(p){ return (p && typeof p==='object' && Object.keys(p).length) ? p : null; }
function _impLen(v){ return Array.isArray(v)?v.length:(v?String(v).length:0); }
// 적재 전 프리뷰/게이트. 누락 id 보존(병합) 전제 → 삭제 0. 신규0·축소·과거날짜 경고. confirm 반환.
function _impPreviewConfirm(label, existingMap, incoming, idKey, fields, idValid){
  var exTotal=Object.keys(existingMap||{}).length, neu=0, ov=0, skip=0, shrink=[], stale=[];
  (incoming||[]).forEach(function(it){
    var id=(it&&it[idKey]!=null)?String(it[idKey]):'';
    if(!id || (idValid && !idValid.test(id))){ skip++; return; }
    var ex=existingMap[id];
    if(!ex){ neu++; return; } ov++;
    (fields||[]).forEach(function(f){ if((f in it) && _impLen(it[f])<_impLen(ex[f]) && _impLen(ex[f])>0) shrink.push(id+'·'+f); });
    var its=_impTs(it.updatedAt), exs=_impTs(ex.updatedAt);
    if(its!=null && exs!=null && its<exs) stale.push(id);
  });
  var after=exTotal+neu;
  var msg=label+'\n\n기존 '+exTotal+'개 → 적재 후 '+after+'개\n• 신규 추가: '+neu+'\n• 덮어쓰기: '+ov+(skip?('\n• 건너뜀(무효 id/형식): '+skip):'')+'\n• 삭제: 0 (누락 id 보존)';
  var warn=[];
  if(neu===0 && ov>0) warn.push('⚠️ 신규 0개 — 새로 추가된 항목이 없습니다(전부 덮어쓰기). 추가가 목적이었다면 id·형식을 확인하세요.');
  if(shrink.length) warn.push('⚠️ 내용 축소 '+shrink.length+'건(기존보다 비거나 짧아짐): '+shrink.slice(0,6).join(', ')+(shrink.length>6?(' 외 '+(shrink.length-6)):''));
  if(stale.length) warn.push('⚠️ 과거 날짜 덮어쓰기 의심 '+stale.length+'건(업로드 updatedAt이 기존보다 과거): '+stale.slice(0,6).join(', ')+(stale.length>6?(' 외 '+(stale.length-6)):''));
  if(warn.length) msg+='\n\n'+warn.join('\n');
  return confirm(msg+'\n\n계속할까요?');
}
// 누락=보존 / 명시=적용: 업로드에 키 없으면 기존 값 유지(메타·링크 필드만 — 본문은 rec 그대로)
function _impPreserve(rec, it, existing, keys){
  var ex=existing||{};
  if('subj' in it) rec.subj=it.subj; else if('subj' in ex) rec.subj=ex.subj;
  keys.forEach(function(f){ if(!(f in it) && (f in ex)) rec[f]=ex[f]; });
  return rec;
}
function _impFileDate(o){ if(!o) return null; var m=o._meta||{}; var c=[m.generatedAt,m.exportedAt,o.generatedAt,o.exportedAt]; for(var i=0;i<c.length;i++){ var t=_impTs(c[i]); if(t!=null) return t; } return null; }
// 하드 게이트: 날짜 없으면 업로드 차단(true=통과). 마스터는 레코드별 updatedAt도 필수.
function _impDateGate(label, fileObj, records, idKey, perRecord){
  var missing=[];
  if(_impFileDate(fileObj)==null) missing.push('파일 _meta.generatedAt(또는 exportedAt)');
  if(perRecord){ (records||[]).forEach(function(it){ if(_impTs(it&&it.updatedAt)==null) missing.push(((it&&it[idKey])||'?')+'.updatedAt'); }); }
  if(missing.length){ alert('❌ 업로드 차단 — 날짜·시간 누락 ['+label+']\n\n규칙: 모든 파일에 _meta.generatedAt 필수'+(perRecord?', 마스터는 레코드마다 updatedAt 필수':'')+'.\n\n누락 '+missing.length+'건:\n'+missing.slice(0,15).join('\n')+(missing.length>15?('\n…외 '+(missing.length-15)+'건'):'')); return false; }
  return true;
}

/* ===== 마스터 → 문항 역링크 (기출 banks + 레벨업 variantq 전수 스캔) ===== */
var _mfQCache=null, _mfQLoading=false;
async function _mfLoadAllQuestions(){
  if(_mfQCache) return _mfQCache;
  if(_mfQLoading){ await new Promise(function(r){var t=setInterval(function(){ if(!_mfQLoading){clearInterval(t);r();} },120);}); return _mfQCache||[]; }
  _mfQLoading=true; var out=[];
  try{
    var snap=await db.collection('adaptive').get();
    snap.forEach(function(doc){
      if(!/__variantq$/.test(doc.id)) return;
      var d=doc.data()||{}; var qs=Array.isArray(d.questions)?d.questions:[];
      var pref=doc.id.replace(/__variantq$/,''); var us=pref.split('__'); var cert=us[0]||'', sub=us[1]||'';
      qs.forEach(function(q){ if(q&&q.id) out.push({id:q.id, cert:cert, sub:sub, q:q}); });
    });
    // 기출(banks)도 전수 스캔 — 문항이 exp.cpt 등으로 마스터를 참조하는 경우 포함(1회 로드 후 캐시)
    var bsnap=await db.collection('banks').get();
    bsnap.forEach(function(doc){
      var bd=doc.data()||{}; var bqs=Array.isArray(bd.questions)?bd.questions:[];
      if(!bqs.length) return;   // 샤드 부모 문서(questions 없음)는 건너뜀
      var bcert=bd.cert||'', bsub=bd.subject||'';
      if(!bcert||!bsub){ var bu=String(doc.id).split('__'); bcert=bcert||bu[0]||''; bsub=bsub||bu[1]||''; }  // 샤드 문서는 id에서 cert/과목 파싱
      bqs.forEach(function(q){ if(q&&q.id) out.push({id:q.id, cert:bcert, sub:bsub, q:q, _bank:true}); });
    });
  }catch(e){}
  _mfQCache=out; _mfQLoading=false; return out;
}
// refType: 'mn'|'cpt'|'tbl'|'grp'  → 해당 마스터 id를 참조하는 문항 찾기
function _mfRefMatch(q, refType, mid){
  var exp=(q&&q.exp)||{};
  if(refType==='mn'){ return (exp.mn||[]).some(function(x){ return String(x).replace('mn://','')===mid; }); }
  if(refType==='cpt'){ if((exp.c||[]).some(function(c){ return c && (c._fromMaster===mid); })) return true; var cp=exp.cpt; if(cp!=null){ var arr=Array.isArray(cp)?cp:[cp]; if(arr.some(function(x){ return String(x).replace('cpt://','')===mid; })) return true; } return false; }
  if(refType==='tbl'){ return (exp.tbl||[]).some(function(x){ return String(x).replace('tbl://','')===mid; })
        || (exp.c||[]).some(function(c){ return c && Array.isArray(c.tbl) && c.tbl.some(function(x){return String(x).replace('tbl://','')===mid;}); }); }
  if(refType==='grp'){ return (exp.grp||[]).some(function(x){ return String(x).replace('grp://','')===mid; })
        || (exp.c||[]).some(function(c){ return c && Array.isArray(c.grp) && c.grp.some(function(x){return String(x).replace('grp://','')===mid;}); }); }
  return false;
}
async function mfShowUsage(refType, mid){
  var box=document.getElementById('mfUsageModal'); if(!box){ box=document.createElement('div'); box.id='mfUsageModal';
    box.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    box.onclick=function(e){ if(e.target===box) box.remove(); }; document.body.appendChild(box); }
  box.innerHTML='<div style="background:#fff;border-radius:14px;max-width:520px;width:100%;max-height:80vh;overflow:auto;padding:18px 20px"><div style="font-weight:800;font-size:15px;margin-bottom:4px">이 마스터를 쓰는 문항</div><div style="font-size:12px;color:#94A3B8;margin-bottom:12px">'+mfEsc(refType)+'://'+mfEsc(mid)+' · 스캔 중…</div></div>';
  var all=await _mfLoadAllQuestions();
  var hits=all.filter(function(r){ return _mfRefMatch(r.q, refType, mid); });
  function _qnum(id){ var m=String(id||'').match(/(\d+)\s*$/); return m?parseInt(m[1],10):0; }
  hits.sort(function(a,b){ if(a.cert!==b.cert) return a.cert<b.cert?-1:1; if(a.sub!==b.sub) return a.sub<b.sub?-1:1; return _qnum(a.id)-_qnum(b.id); });  // 시험·과목·문제번호순
  var rows = hits.length? hits.map(function(r){
    var url=r._bank?('https://certlab.ai.kr/#q/'+encodeURIComponent(r.cert)+'/'+encodeURIComponent(r.id)):('https://certlab.ai.kr/?card='+encodeURIComponent(r.id)+'&cert='+encodeURIComponent(r.cert));
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #F1F0EC"><div style="flex:1;font-size:13px;color:#3A352C"><b>'+mfEsc(r.id)+'</b><div style="font-size:11px;color:#A89C8E">'+mfEsc(r.cert)+' · '+mfEsc(r.sub)+'</div></div><a href="'+url+'" target="_blank" rel="noopener" style="flex:0 0 auto;background:#185FA5;color:#fff;text-decoration:none;font-size:12px;font-weight:700;border-radius:8px;padding:6px 10px">문항 열기 →</a></div>';
  }).join('') : '<div style="color:#A89C8E;font-size:13px;padding:14px 0">이 마스터를 참조하는 문항이 없습니다.</div>';
  box.innerHTML='<div style="background:#fff;border-radius:14px;max-width:520px;width:100%;max-height:80vh;overflow:auto;padding:18px 20px"><div style="display:flex;align-items:center;margin-bottom:4px"><div style="font-weight:800;font-size:15px;flex:1">이 마스터를 쓰는 문항 <span style="color:#185FA5">'+hits.length+'</span></div><button onclick="document.getElementById(\'mfUsageModal\').remove()" style="background:#F1F5F9;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:13px">닫기</button></div><div style="font-size:12px;color:#94A3B8;margin-bottom:6px">'+mfEsc(refType)+'://'+mfEsc(mid)+'</div>'+rows+'</div>';
}
function mfUsageBtn(refType, mid){
  return '<button class="btn-sm" onclick="mfShowUsage(\''+refType+'\',\''+mid+'\')" style="background:#E6F1FB;color:#185FA5">이 마스터 쓰는 문항 보기</button>';
}

function masterListHTML(ns, all, emptyMsg, cardFn){
  var st=_mfState[ns]||{cert:'',subj:'',sort:'recent'};
  var allIds=Object.keys(all);
  if(!allIds.length) return '<div style="color:#A89C8E;padding:12px">'+emptyMsg+'</div>';
  var certSet={};
  allIds.forEach(function(id){ (all[id].certs||[]).forEach(function(c){certSet[c]=1;}); });
  var certs=Object.keys(certSet).sort();
  // 과목 드롭다운: 선택 시험에 속한 항목의 과목만(시험 미선택=전체)
  var subjSet={};
  allIds.forEach(function(id){
    var it=all[id]||{};
    if(st.cert && (it.certs||[]).indexOf(st.cert)<0) return;   // 선택 시험 항목만
    var sb=mfSubjOf(id, it); if(sb) subjSet[sb]=1;
  });
  var subjs=Object.keys(subjSet).sort();
  function opt(v,label,sel){ return '<option value="'+mfEsc(v)+'"'+(v===sel?' selected':'')+'>'+mfEsc(label)+'</option>'; }
  var certSel='<select class="mf-sel" onchange="mfSet(\''+ns+'\',\'cert\',this.value)">'+opt('','전체 시험',st.cert)+certs.map(function(c){return opt(c,c,st.cert);}).join('')+'</select>';
  var subjSel='<select class="mf-sel" onchange="mfSet(\''+ns+'\',\'subj\',this.value)">'+opt('','전체 과목',st.subj)+subjs.map(function(c){return opt(c,mfSubjLabel(c),st.subj);}).join('')+'</select>';
  // 정렬: 마스터 목록은 항상 최신순(코드순 의미없음)
  var sortSel='<span class="mf-count" style="margin-left:auto">↓ 최신순</span>';
  var ids=allIds.filter(function(id){
    var it=all[id]||{};
    if(st.cert && (it.certs||[]).indexOf(st.cert)<0) return false;
    if(st.subj && mfSubjOf(id, all[id])!==st.subj) return false;
    if(st.q){ var _q=String(st.q).toLowerCase().trim();
      if(_q){ var hay=((it.name||'')+' '+id+' '+((it.keywords||[]).join(' '))+' '+((it.cards||[]).map(function(c){return (c&&c.t||'')+' '+(c&&c.d||'');}).join(' '))).toLowerCase();
        if(hay.indexOf(_q)<0) return false; } }
    return true;
  });
  function _ts(id){ var t=_impTs(all[id]&&all[id].updatedAt); return t==null?0:t; }
  function sortIds(arr){
    return arr.slice().sort(function(a,b){ var d=_ts(b)-_ts(a); return d!==0?d:(a<b?-1:1); });  // 항상 최신순
  }
  var groups={}; ids.forEach(function(id){ var g=mfSubjOf(id, all[id])||'기타'; (groups[g]=groups[g]||[]).push(id); });
  function _gmax(g){ var mx=0; groups[g].forEach(function(id){ var t=_ts(id); if(t>mx) mx=t; }); return mx; }
  var gkeys=Object.keys(groups).sort(function(a,b){ var d=_gmax(b)-_gmax(a); return d!==0?d:(a<b?-1:1); });   // 그룹(과목)도 최신순 — 최근 만진 과목이 위로
  var CAP=_mfShow[ns]||60, shown=0, truncated=false;   // 지연 렌더: CAP개까지만 실제 렌더
  var body=gkeys.map(function(g){
    if(shown>=CAP){ truncated=true; return ''; }
    var gids=sortIds(groups[g]), take=[];
    for(var i=0;i<gids.length;i++){ if(shown>=CAP){ truncated=true; break; } take.push(gids[i]); shown++; }
    if(!take.length) return '';
    return '<div class="mf-grouphd">'+mfEsc(mfSubjLabel(g))+' <span style="color:#B4AE9F;font-weight:500;font-size:11px">'+groups[g].length+'</span></div>'
      +take.map(cardFn).join('');
  }).join('');
  var moreBtn = truncated ? '<div style="text-align:center;padding:12px 0"><button onclick="mfMore(\''+ns+'\')" style="background:#EEF1F6;color:#3A4A5E;border:1px solid #D9E0EA;border-radius:20px;padding:9px 22px;font-size:13px;font-weight:700;cursor:pointer">더 보기 ('+shown+' / '+ids.length+'개 · +120)</button><div style="font-size:11px;color:#A89C8E;margin-top:6px">시험·과목 필터로 좁히면 원하는 항목만 빠르게 볼 수 있어요</div></div>' : '';
  var bar='<div class="mf-bar">'+certSel+subjSel+'<span class="mf-count">'+ids.length+' / '+allIds.length+'개</span>'+sortSel+'</div>';
  return bar+(body||'<div style="color:#A89C8E;padding:12px">해당 시험·과목 조건의 항목이 없습니다.</div>')+moreBtn;
}_mfRender={mnem:mnemRenderList, tblm:tblmRenderList, cptm:cptmRenderList, grpm:grpmRenderList};

function mnemRenderList(){
  var el=document.getElementById('mnemList'); if(!el) return;
  el.innerHTML=masterListHTML('mnem', _mnemAll, '등록된 코드 없음. "+ 새 코드"로 추가하세요.', function(id){
    var m=_mnemAll[id]||{};
    return '<div style="border:1px solid #EEE;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff">'
      +'<div class="m-meta"><span class="m-meta-tag">🔒 식별용 · 사용자에게 안 보임</span>'
      +'<div class="m-name">'+mnemEsc(m.name||'(이름없음)')+' <span class="m-id">'+mnemEsc(id)+'</span></div>'
      +'<div class="m-meta-sub">'+((m.certs&&m.certs.length)?'시험 '+mnemEsc(m.certs.join(', '))+' · ':'')+'<span class="ref">mn://'+mnemEsc(id)+'</span></div></div>'
      +'<hr class="m-div"><div class="m-userlabel">👁 사용자에게 보이는 화면</div>'
      +'<div class="m-render"><div class="mnem-app">'+mnemBoxesAppHTML(m)+'</div></div>'
      +'<div class="m-foot">'
      +mfUsageBtn('mn', id)
      +'<button class="btn-sm" onclick="mnemEdit(\''+id+'\')" style="background:#EEF;color:#4338CA">편집</button>'
      +'<button class="btn-sm" onclick="mnemDelete(\''+id+'\')" style="background:#FDE2E1;color:#A32D2D">삭제</button></div>'
      +'</div>';
  });
}
function mnemBoxRowHTML(i, code, desc){
  var ta='width:100%;padding:7px 10px;border-radius:7px;border:1.5px solid #E2E2E2;margin:3px 0;box-sizing:border-box;resize:vertical';
  return '<div class="mnem-box-row" style="border:1px dashed #DDD9D2;border-radius:9px;padding:8px 9px;margin:0 0 8px;background:#fff">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'
    +'<span class="mnem-box-lab" style="font-size:11px;font-weight:700;color:#8C8576">박스 '+(i+1)+'</span>'
    +'<button type="button" class="btn-sm" onclick="mnemDelBox(this)" style="background:#FDE2E1;color:#A32D2D;padding:1px 9px;font-size:11px">박스 삭제</button></div>'
    +'<textarea class="mnem-box-code" rows="2" oninput="mnemPreview()" placeholder=\'&lt;span class="k"&gt;점&lt;/span&gt;유 &lt;span class="k"&gt;소&lt;/span&gt;유\' style="'+ta+';font-family:monospace">'+mnemEsc(code||'')+'</textarea>'
    +'<textarea class="mnem-box-desc" rows="2" oninput="mnemPreview()" placeholder="이 코드가 풀어내는 내용(필수)" style="'+ta+'">'+mnemEsc(desc||'')+'</textarea>'
    +'</div>';
}
function mnemRenderBoxes(boxes){
  if(!boxes||!boxes.length) boxes=[{code:'',desc:''}];
  document.getElementById('mnemBoxes').innerHTML=boxes.map(function(b,i){return mnemBoxRowHTML(i,b.code,b.desc);}).join('');
}
function mnemAddBox(){
  var c=document.getElementById('mnemBoxes');
  var i=c.querySelectorAll('.mnem-box-row').length;
  c.insertAdjacentHTML('beforeend', mnemBoxRowHTML(i,'',''));
}
function mnemDelBox(btn){
  var c=document.getElementById('mnemBoxes');
  if(c.querySelectorAll('.mnem-box-row').length<=1){ alert('박스는 최소 1개 필요해요.'); return; }
  btn.closest('.mnem-box-row').remove();
  Array.prototype.forEach.call(c.querySelectorAll('.mnem-box-row .mnem-box-lab'), function(el,idx){ el.textContent='박스 '+(idx+1); });
  mnemPreview();
}
function mnemReadBoxes(){
  var out=[];
  Array.prototype.forEach.call(document.querySelectorAll('#mnemBoxes .mnem-box-row'), function(row){
    var code=row.querySelector('.mnem-box-code').value.trim();
    var desc=row.querySelector('.mnem-box-desc').value.trim();
    if(code||desc) out.push({code:code,desc:desc});
  });
  return out;
}
function mnemFill(m){
  document.getElementById('mnemIdField').value=m.id||'';
  document.getElementById('mnemNameField').value=m.name||'';
  mnemRenderBoxes(mnemNorm(m));
  document.getElementById('mnemKwField').value=(m.keywords||[]).join(', ');
  document.getElementById('mnemCertsField').value=(m.certs||[]).join(', ');
  document.getElementById('mnemNoteField').value=m.note||'';
  mnemPreview(); mnemValidateId();
}
function mnemNew(){ mnemFill({}); document.getElementById('mnemIdField').disabled=false; document.getElementById('mnemEditTi').textContent='새 코드'; document.getElementById('mnemEditor').style.display=''; }
function mnemEdit(id){ mnemFill(Object.assign({id:id},_mnemAll[id]||{})); document.getElementById('mnemIdField').disabled=true; document.getElementById('mnemEditTi').textContent='코드 편집: '+id; document.getElementById('mnemEditor').style.display=''; }
function mnemCancel(){ document.getElementById('mnemEditor').style.display='none'; }
function mnemValidateId(){
  var id=document.getElementById('mnemIdField').value.trim(); var w=document.getElementById('mnemIdWarn');
  if(!id){ if(w){w.style.color='#A32D2D';w.textContent='';} return false; }
  if(!/^mn_[a-z0-9_]+$/.test(id)){ if(w){w.style.color='#A32D2D';w.textContent='✗ mn_ + 영문소문자/숫자/_ 만 (예: mn_property_types)';} return false; }
  if(w){ w.style.color='#15793F'; w.textContent='✓ 형식 OK'; } return true;
}
function mnemPreview(){
  var boxes=mnemReadBoxes();
  var el=document.getElementById('mnemPrev'); if(!el) return;
  if(!boxes.length){ el.innerHTML='<div style="color:#A89C8E;font-size:11px">코드를 입력하면 미리보기가 표시됩니다.</div>'; return; }
  el.innerHTML='<div class="mnem-app">'+mnemBoxesAppHTML({boxes:boxes})+'</div>';
}
async function mnemSave(){
  var id=document.getElementById('mnemIdField').value.trim();
  if(!mnemValidateId()){ alert('id 형식: mn_ + 영문 소문자/숫자/_ (예: mn_property_types)'); return; }
  var boxes=mnemReadBoxes();
  if(!boxes.length){ alert('박스가 최소 1개 필요해요.'); return; }
  for(var bi=0;bi<boxes.length;bi++){
    if(!boxes[bi].code){ alert('박스 '+(bi+1)+'의 code는 필수예요.'); return; }
    if(!boxes[bi].desc){ alert('박스 '+(bi+1)+'의 desc(설명)는 필수예요.'); return; }
  }
  var csv=function(v){ return v.split(',').map(function(x){return x.trim();}).filter(Boolean); };
  var rec={ name:document.getElementById('mnemNameField').value.trim(), boxes:boxes, code:boxes[0].code, desc:boxes[0].desc,
    keywords:csv(document.getElementById('mnemKwField').value), certs:csv(document.getElementById('mnemCertsField').value),
    note:document.getElementById('mnemNoteField').value.trim(), updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
  var _ex=_mnemAll[id]; if(_ex&&_ex.subj) rec.subj=_ex.subj;   // 과목분류(subj) 보존 — 편집해도 안 날아감
  try{ await db.collection('mnemonics').doc(id).set(rec); _mnemAll[id]=_cacheRec(rec); mnemRenderList();
    var st=document.getElementById('mnemStatus'); if(st){ st.style.color='#15793F'; st.textContent='저장됨: '+id+' (총 '+Object.keys(_mnemAll).length+'개)'; }
    mnemCancel();
  }catch(e){ alert('저장 실패: '+e.message); }
}
async function mnemDelete(id){
  if(!confirm(id+' 코드를 삭제할까요?\n(이 코드를 mn:// 참조하는 문항은 암기코드 칸이 빈 채로 렌더됩니다)')) return;
  try{ await db.collection('mnemonics').doc(id).delete(); delete _mnemAll[id]; mnemRenderList();
    var st=document.getElementById('mnemStatus'); if(st){ st.style.color='#A32D2D'; st.textContent='삭제됨: '+id+' (총 '+Object.keys(_mnemAll).length+'개)'; }
  }catch(e){ alert('삭제 실패: '+e.message); }
}
/* 내보내기(백업) 직전 검수 게이트 — 마스터 배열을 auditFn으로 검사, 위반 있으면 확인받고 진행.
   위반 목록은 콘솔에 상세 출력(검수 창과 동일 정보). 반환 true=진행, false=취소.
   [2026-07-14] "내보내기엔 검수 버튼 없음" 구멍 메움 — 검수 창과 export가 같은 규칙을 공유하게. */
function _qcMasterExportGate(kindLabel, arr, auditFn){
  /* [2026-07-15] 내보내기는 막지도 팝업도 띄우지 않는다(비차단). 위반 요약만 콘솔에 남긴다.
     지적서는 각 마스터 탭의 '⬇ 지적서 TXT' 버튼(qcMasterDlReview)으로 받는다. */
  try{
    if(typeof QC==='undefined' || typeof auditFn!=='function') return true;
    var vios=auditFn(arr)||[]; if(!vios.length) return true;
    var block=vios.filter(function(v){ return v.sev==='ERROR'||v.sev==='BLOCKER'; }).length;
    try{ console.group('[검수] '+kindLabel+' 내보내기 — 위반 '+vios.length+'건 (차단급 '+block+') · 지적서는 "⬇ 지적서 TXT"로');
      vios.forEach(function(v){ console.log('· ['+(v.sev||'')+'] '+v.code+' '+(v.id||'')+' — '+(v.msg||'')); }); console.groupEnd(); }catch(_){}
    return true;
  }catch(e){ return true; }
}
/* [2026-07-15] 마스터 검수 지적서 — 기출과 동일한 2버튼 흐름: '지적서 만들기'(textarea 채움) + 'TXT 다운로드'. */
var _qcMasterLabel={ mnem:'암기', table:'표', graph:'그래프', interactive:'인터랙티브', concept:'개념' };
function _qcMasterItems(mtype){
  var map={ mnem:(typeof _mnemImpData!=='undefined'?_mnemImpData:null), table:(typeof _tblmImpData!=='undefined'?_tblmImpData:null),
            graph:(typeof _grpmImpData!=='undefined'?_grpmImpData:null), interactive:(typeof _itvmImpData!=='undefined'?_itvmImpData:null),
            concept:(typeof _cptmImpData!=='undefined'?_cptmImpData:null) };
  return map[mtype];
}
function _qcMasterAuditFn(mtype){
  var fnmap={ mnem:(QC&&QC.mnemAudit), table:(QC&&QC.tableAudit), graph:(QC&&QC.graphAudit), interactive:(QC&&QC.interactiveAudit), concept:(QC&&QC.conceptAudit) };
  return fnmap[mtype];
}
async function qcMasterBuildReview(mtype){
  var coll={mnem:'mnemonics',table:'tables',graph:'graphs',concept:'concepts',interactive:'interactives'}[mtype];
  var auditFn=_qcMasterAuditFn(mtype), kindLabel=_qcMasterLabel[mtype]||mtype;
  var ta=document.getElementById('mNote_'+mtype);
  if(typeof QC==='undefined' || typeof auditFn!=='function'){ alert('qc-core를 불러오지 못했습니다.'); return; }
  if(ta) ta.value='현재 서비스 중인 '+kindLabel+' 마스터를 읽는 중…';
  var items=[];
  try{ var snap=await db.collection(coll).get(); snap.forEach(function(dd){ items.push(Object.assign({id:dd.id}, dd.data()||{})); }); }
  catch(e){ if(ta) ta.value='라이브 데이터 로드 실패: '+((e&&e.message)||e); else alert('라이브 데이터 로드 실패'); return; }
  if(!items.length){ if(ta) ta.value='('+kindLabel+' 라이브 데이터가 비어 있음)'; return; }
  var vios=auditFn(items)||[];
  var byCode={}; vios.forEach(function(v){ byCode[v.code]=(byCode[v.code]||0)+1; });
  var block=vios.filter(function(v){ return v.sev==='ERROR'||v.sev==='BLOCKER'; }).length;
  var byId={}; vios.forEach(function(v){ var k=v.id||'?'; (byId[k]=byId[k]||[]).push(v); });
  var L=['[CertLab 마스터 검수 지적서] '+kindLabel, '생성: '+new Date().toLocaleString(),
         '대상 '+items.length+'개 · 위반 '+vios.length+'건 (차단급 '+block+')',
         '요약: '+(Object.keys(byCode).map(function(k){ return k+' '+byCode[k]; }).join(' · ')||'(없음)'), ''];
  if(!vios.length) L.push('(위반 없음 — 모두 통과)');
  Object.keys(byId).forEach(function(id){ L.push('■ '+id);
    byId[id].forEach(function(v){ L.push('  ['+(v.sev||'')+'] '+v.code+(v.field?(' ('+v.field+')'):'')+' — '+(v.msg||'')); }); });
  L.push('', '■ 크리스 지적 (자유 입력)', '  ');
  if(ta){ ta.value=L.join('\n'); } else { alert(L.join('\n').slice(0,1200)); }
}
function qcMasterDlNote(mtype){
  var kindLabel=_qcMasterLabel[mtype]||mtype; var ta=document.getElementById('mNote_'+mtype);
  if(!ta || !ta.value.trim()){ alert('먼저 "지적서 만들기"를 누르세요.'); return; }
  var blob=new Blob([ta.value],{type:'text/plain;charset=utf-8'}); var a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='검수지적서_'+kindLabel+'_'+new Date().toISOString().slice(0,10)+'.txt';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}
async function mnemExport(){
  if(!Object.keys(_mnemAll).length){ try{ var _s=await db.collection('mnemonics').get(); _mnemAll={}; _s.forEach(function(d){ _mnemAll[d.id]=d.data()||{}; }); }catch(e){ alert('로드 실패: '+e.message); return; } }
  var ids=Object.keys(_mnemAll);
  if(_mexpScope) ids=ids.filter(function(id){ return _mexpKeep(id,_mnemAll[id]); });
  if(!ids.length){ alert('등록된 코드가 없어요.'); return; }
  var _xnow=_kstISO(new Date());
  var arr=ids.map(function(id){ var r=Object.assign({id:id}, _mnemAll[id]); r.updatedAt=_uaISO(r.updatedAt, new Date()); return r; });
  if(!_qcMasterExportGate('암기', arr, (QC&&QC.mnemAudit))) return;   // ← 내보내기 검수 게이트(MN_DUP 등)
  var bundle={ _meta:{ generatedAt:_xnow }, mnemonics:arr, exportedAt:_xnow, count:arr.length };
  var blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob); var a=document.createElement('a');
  a.href=url; a.download='certlab_mnemonics'+_mexpSuffix()+'_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  var st=document.getElementById('mnemStatus'); if(st){ st.style.color='#15793F'; st.textContent='✅ 백업 '+arr.length+'개 다운로드'; }
}
function mnemImpHandle(fileList){
  var f=[].slice.call(fileList).find(function(x){ return /\.json$/i.test(x.name)||x.type==='application/json'; });
  var stt=document.getElementById('mnemImpStatus');
  if(!f){ if(stt){stt.style.color='#A32D2D';stt.textContent='JSON 파일이 아니에요.';} return; }
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var o=JSON.parse(rd.result);
      var arr=Array.isArray(o)?o:(o.mnemonics||[]);
      var valid=arr.filter(function(x){ return x&&x.id&&(x.code||(Array.isArray(x.boxes)&&x.boxes.length)); });
      if(!valid.length){ if(stt){stt.style.color='#A32D2D';stt.textContent='mnemonics 항목 없음 (id·code 또는 boxes 필요)';} return; }
      if(!_impDateGate('암기코드', o, valid, 'id', true)) return;
      _mnemImpData=valid;
      if(stt){ stt.style.color='#475569'; stt.innerHTML='인식: 코드 <b>'+valid.length+'</b>개 — 올리는 중…'; }
      mnemImport().catch(function(e){ _impFail('mnemImpStatus',e); });
    }catch(e){ if(stt){stt.style.color='#A32D2D';stt.textContent='파싱 오류: '+e.message;} }
  };
  rd.readAsText(f);
}
async function mnemImport(){
  if(!_mnemImpData||!_mnemImpData.length) return;
  var _ex=await _loadExistingByIds('mnemonics', _mnemImpData.map(function(x){return String(x.id);}));
  if(!_impPreviewConfirm('암기코드 '+_mnemImpData.length+'개 적재', _ex, _mnemImpData, 'id', ['code','desc','certs','keywords'], /^mn_[a-z0-9_]+$/)) return;
  var run=document.getElementById('mnemImpRun'); if(run) run.disabled=true;
  var ok=0, fail=0;
  var _ops=[];
  for(var i=0;i<_mnemImpData.length;i++){
    var it=_mnemImpData[i]; var id=String(it.id);
    if(!/^mn_[a-z0-9_]+$/.test(id)){ fail++; continue; }
    var _bx=(Array.isArray(it.boxes)&&it.boxes.length)?it.boxes.map(function(b){return {code:(b&&b.code)||'',desc:(b&&b.desc)||''};}):null;
    var rec={ name:it.name||'', code:_bx?(_bx[0].code||''):(it.code||''), desc:_bx?(_bx[0].desc||''):(it.desc||''),
      keywords:Array.isArray(it.keywords)?it.keywords:[], certs:Array.isArray(it.certs)?it.certs:[],
      note:it.note||'', updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
    if(_bx) rec.boxes=_bx;            // 박스형(멀티그룹) 보존
    if(it.kind) rec.kind=it.kind;     // 문장형 등 kind 보존 (kind:"sentence")
    // 박스형이면 code/desc는 boxes[0] 미러라 기존값 복원 금지(옛 flat code 되살아남 방지)
    _impPreserve(rec, it, _ex[id], _bx?['name','note','certs','keywords']:['name','note','certs','keywords','code','desc']);
    (function(_id,_rec){ _ops.push({ref:db.collection('mnemonics').doc(_id), data:_rec, after:function(){ _mnemAll[_id]=_cacheRec(_rec); }}); })(id,rec);
  }
  var _r=await _qbWrite(_ops, function(n,t){var _s=document.getElementById('mnemImpStatus'); if(_s){_s.style.color='#475569';_s.innerHTML='처리 중… <b>'+n+'</b>/'+t;}}); ok+=_r.ok; fail+=_r.fail;
  var stt=document.getElementById('mnemImpStatus'); if(stt){ stt.style.color='#15793F'; stt.innerHTML='✅ 복구: 성공 <b>'+ok+'</b>개'+(fail?(' · 실패 '+fail+'개'+((typeof _r!=='undefined'&&_r&&_r.err)?(' — '+_r.err):'')):'')+'.'; }
  mnemRenderList();
}

// ===== 📊 표 마스터 (Firestore tables CRUD) =====
var _tblmAll={}, _tblmLoaded=false, _tblmImpData=null, _tblmImpBound=false;
function tblmEsc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function tblmYul(s){ return String(s).replace(/\(([^)]*)\)/g,'<span class="tbl-yul">($1)</span>'); }
function tblmCell(v, rich){ var s=tblmEsc(v); s=s.replace(/&lt;br\s*\/?&gt;/gi,'<br>'); s=s.replace(/&lt;span class=[\'"]k[\'"]&gt;/gi,'<span class="k">').replace(/&lt;\/span&gt;/gi,'</span>'); s=s.replace(/&lt;(\/?)(sup|sub)&gt;/gi,'<$1$2>'); return s; }
// 계층 병합 표 렌더 (앱/뷰어 renderTbl 동일 본체)
function tblmSanitizeHtml(html){ var s=String(html||''); s=s.replace(/<script[\s\S]*?<\/script>/gi,''); s=s.replace(/<(iframe|object|embed)[\s\S]*?<\/\1>/gi,'').replace(/<(iframe|object|embed)[^>]*>/gi,''); s=s.replace(/\son\w+\s*=\s*"[^"]*"/gi,'').replace(/\son\w+\s*=\s*'[^']*'/gi,''); s=s.replace(/javascript:/gi,''); return s; }
function tblmRenderTable(t){
  if(!t) return '<div style="color:#A89C8E;font-size:12px">표 내용을 입력하세요.</div>';
  if(t.html && String(t.html).indexOf('<')>=0){ var cap0=t.caption_chant?'<div class="tbl-cap">'+tblmEsc(t.caption_chant)+'</div>':''; return cap0+'<div class="jtbl-html">'+tblmSanitizeHtml(t.html)+'</div>'; }
  if(!Array.isArray(t.headers) || !Array.isArray(t.rows)) return '<div style="color:#A89C8E;font-size:12px">headers/rows 입력 시 표가 여기 떠요.</div>';
  var rows=t.rows.map(function(r){ return r.slice(); });   // 원본 보호(복사)
  var mergeCols=(t.merge||[]).slice().sort(function(a,b){return a-b;}), skip={};
  mergeCols.forEach(function(c, ci){
    var anc=mergeCols.slice(0,ci), r=0;
    while(r<rows.length){
      var span=1;
      while(r+span<rows.length && rows[r+span][c]===rows[r][c] && anc.every(function(a){return rows[r+span][a]===rows[r][a];})) span++;
      for(var k=1;k<span;k++) skip[(r+k)+','+c]=1;
      rows[r]['_rs'+c]=span; r+=span;
    }
  });
  var rich=(t.type==='html');
  var thead='<thead><tr>'+t.headers.map(function(h){return '<th>'+tblmCell(h, rich)+'</th>';}).join('')+'</tr></thead>';
  var tbody='<tbody>'+rows.map(function(row,r){
    var tds='';
    for(var c=0;c<t.headers.length;c++){
      if(skip[r+','+c]) continue;
      var rs=row['_rs'+c], span=(rs&&rs>1)?' rowspan="'+rs+'"':'';
      tds+='<td'+span+'>'+(rich?tblmCell(row[c],true):tblmYul(tblmCell(row[c],false)))+'</td>';
    }
    return '<tr>'+tds+'</tr>';
  }).join('')+'</tbody>';
  var cap=t.caption_chant?'<div class="tbl-cap">'+tblmEsc(t.caption_chant)+'</div>':'';
  return cap+'<div class="tbl-wrap"><table class="jtbl">'+thead+tbody+'</table></div>';
}
function tblmInit(){
  if(!_tblmLoaded) tblmLoad();
  if(!_tblmImpBound){ _tblmImpBound=true;
    var drop=document.getElementById('tblmImpDrop'), file=document.getElementById('tblmImpFile');
    if(drop) drop.onclick=function(){ file&&file.click(); };
    if(file) file.addEventListener('change', function(e){ tblmImpHandle(e.target.files); });
    if(drop){
      ['dragover','dragenter'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#0EA5E9';}); });
      ['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#CBD5E1';}); });
      drop.addEventListener('drop', function(e){ tblmImpHandle(e.dataTransfer.files); });
    }
  }
}
async function tblmLoad(){
  var st=document.getElementById('tblmStatus'); if(st){ st.style.color='#7F77DD'; st.textContent='불러오는 중…'; }
  try{
    var snap=await db.collection('tables').get();
    _tblmAll={}; snap.forEach(function(d){ var t=d.data()||{}; if(typeof t.rows==='string'){ try{ t.rows=JSON.parse(t.rows); }catch(e){ t.rows=[]; } } _tblmAll[d.id]=t; });
    _tblmLoaded=true;
    if(st) st.textContent='등록 '+Object.keys(_tblmAll).length+'개';
    tblmRenderList();
  }catch(e){ if(st){ st.style.color='#A32D2D'; st.textContent='로드 실패: '+e.message; } }
}
function tblmRenderList(){
  var el=document.getElementById('tblmList'); if(!el) return;
  el.innerHTML=masterListHTML('tblm', _tblmAll, '등록된 표 없음. "+ 새 표"로 추가하세요.', function(id){
    var t=_tblmAll[id]||{};
    return '<div style="border:1px solid #EEE;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff">'
      +'<div class="m-meta"><span class="m-meta-tag">🔒 식별용 · 사용자에게 안 보임</span>'
      +'<div class="m-name">'+tblmEsc(t.name||'(이름없음)')+' <span class="m-id">'+tblmEsc(id)+'</span></div>'
      +'<div class="m-meta-sub">'+((t.certs&&t.certs.length)?'시험 '+tblmEsc(t.certs.join(', '))+' · ':'')+'<span class="ref">tbl://'+tblmEsc(id)+'</span></div></div>'
      +'<hr class="m-div"><div class="m-userlabel">👁 사용자에게 보이는 화면</div>'
      +'<div class="m-render">'+tblmRenderTable(t)+'</div>'
      +'<div class="m-foot">'
      +mfUsageBtn('tbl', id)
      +'<button class="btn-sm" onclick="tblmEdit(\''+id+'\')" style="background:#E0F2FE;color:#075985">편집</button>'
      +'<button class="btn-sm" onclick="tblmDelete(\''+id+'\')" style="background:#FDE2E1;color:#A32D2D">삭제</button></div>'
      +'</div>';
  });
}
function tblmFill(t){
  document.getElementById('tblmIdField').value=t.id||'';
  document.getElementById('tblmNameField').value=t.name||'';
  document.getElementById('tblmHeadersField').value=t.headers?JSON.stringify(t.headers):'';
  document.getElementById('tblmRowsField').value=t.rows?JSON.stringify(t.rows):'';
  document.getElementById('tblmMergeField').value=(t.merge&&t.merge.length)?JSON.stringify(t.merge):'';
  document.getElementById('tblmCapField').value=t.caption_chant||'';
  document.getElementById('tblmKwField').value=(t.keywords||[]).join(', ');
  document.getElementById('tblmCertsField').value=(t.certs||[]).join(', ');
  document.getElementById('tblmNoteField').value=t.note||'';
  tblmPreview(); tblmValidateId();
}
function tblmNew(){ tblmFill({}); document.getElementById('tblmIdField').disabled=false; document.getElementById('tblmEditTi').textContent='새 표'; document.getElementById('tblmEditor').style.display=''; }
function tblmEdit(id){ tblmFill(Object.assign({id:id},_tblmAll[id]||{})); document.getElementById('tblmIdField').disabled=true; document.getElementById('tblmEditTi').textContent='표 편집: '+id; document.getElementById('tblmEditor').style.display=''; }
function tblmCancel(){ document.getElementById('tblmEditor').style.display='none'; }
function tblmValidateId(){
  var id=document.getElementById('tblmIdField').value.trim(); var w=document.getElementById('tblmIdWarn');
  if(!id){ if(w){w.style.color='#A32D2D';w.textContent='';} return false; }
  if(!/^tbl_[a-z0-9_]+$/.test(id)){ if(w){w.style.color='#A32D2D';w.textContent='✗ tbl_ + 영문소문자/숫자/_ 만 (예: tbl_law_bcr_far)';} return false; }
  if(w){ w.style.color='#15793F'; w.textContent='✓ 형식 OK'; } return true;
}
// 편집 필드 → 표 객체(파싱). 오류 메시지는 두 번째 반환.
function tblmParse(){
  var err='';
  function J(v,label){ v=v.trim(); if(!v) return null; try{ return JSON.parse(v); }catch(e){ err+=(err?' / ':'')+label+' JSON 오류'; return undefined; } }
  var headers=J(document.getElementById('tblmHeadersField').value,'headers');
  var rows=J(document.getElementById('tblmRowsField').value,'rows');
  var merge=J(document.getElementById('tblmMergeField').value,'merge');
  return [{ headers:headers||[], rows:rows||[], merge:(Array.isArray(merge)?merge:[]),
            caption_chant:document.getElementById('tblmCapField').value.trim() }, err];
}
function tblmPreview(){
  var p=tblmParse(), t=p[0], err=p[1];
  var box=document.getElementById('tblmPrev');
  if(err){ box.innerHTML='<div style="color:#A32D2D;font-size:12px">⚠️ '+err+'</div>'; return; }
  // 행 길이 헤더와 다르면 경고만(렌더는 그대로)
  var warn='';
  if(!t.html && Array.isArray(t.rows)&&Array.isArray(t.headers)&&t.headers.length){ var bad=t.rows.filter(function(r){return !Array.isArray(r)||r.length!==t.headers.length;}).length; if(bad) warn='<div style="color:#9A5B00;font-size:11px;margin-bottom:4px">⚠️ '+bad+'개 행의 칸 수가 headers('+t.headers.length+')와 다름</div>'; }
  box.innerHTML=warn+tblmRenderTable(t);
}
async function tblmSave(){
  var id=document.getElementById('tblmIdField').value.trim();
  if(!tblmValidateId()){ alert('id 형식: tbl_ + 영문 소문자/숫자/_ (예: tbl_law_bcr_far)'); return; }
  var p=tblmParse(), t=p[0], err=p[1];
  if(err){ alert(err); return; }
  if(!t.headers.length){ alert('headers는 필수예요.'); return; }
  if(!t.rows.length){ alert('rows는 필수예요.'); return; }
  var csv=function(v){ return v.split(',').map(function(x){return x.trim();}).filter(Boolean); };
  var rec={ name:document.getElementById('tblmNameField').value.trim(),
    headers:t.headers, rows:t.rows, merge:t.merge, caption_chant:t.caption_chant,
    keywords:csv(document.getElementById('tblmKwField').value), certs:csv(document.getElementById('tblmCertsField').value),
    note:document.getElementById('tblmNoteField').value.trim(), updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
  var _ex=_tblmAll[id]; if(_ex&&_ex.type) rec.type=_ex.type;   // 편집 저장 시 기존 type(html 등) 유지
  try{ await db.collection('tables').doc(id).set(Object.assign({},rec,{rows:JSON.stringify(rec.rows)})); _tblmAll[id]=_cacheRec(rec); tblmRenderList();
    var st=document.getElementById('tblmStatus'); if(st){ st.style.color='#15793F'; st.textContent='저장됨: '+id+' (총 '+Object.keys(_tblmAll).length+'개)'; }
    tblmCancel();
  }catch(e){ alert('저장 실패: '+e.message); }
}
async function tblmDelete(id){
  if(!confirm(id+' 표를 삭제할까요?\n(이 표를 tbl:// 참조하는 문항/개념은 표 칸이 ⚠️로 렌더됩니다)')) return;
  try{ await db.collection('tables').doc(id).delete(); delete _tblmAll[id]; tblmRenderList();
    var st=document.getElementById('tblmStatus'); if(st){ st.style.color='#A32D2D'; st.textContent='삭제됨: '+id+' (총 '+Object.keys(_tblmAll).length+'개)'; }
  }catch(e){ alert('삭제 실패: '+e.message); }
}
async function tblmExport(){
  if(!Object.keys(_tblmAll).length){ try{ var _s=await db.collection('tables').get(); _tblmAll={}; _s.forEach(function(d){ _tblmAll[d.id]=d.data()||{}; }); }catch(e){ alert('로드 실패: '+e.message); return; } }
  var ids=Object.keys(_tblmAll);
  if(_mexpScope) ids=ids.filter(function(id){ return _mexpKeep(id,_tblmAll[id]); });
  if(!ids.length){ alert('등록된 표가 없어요.'); return; }
  var _xnow=_kstISO(new Date());
  var arr=ids.map(function(id){ var r=Object.assign({id:id}, _tblmAll[id]); r.updatedAt=_uaISO(r.updatedAt, new Date()); return r; });
  if(!_qcMasterExportGate('표', arr, (QC&&QC.tableAudit))) return;   // ← 내보내기 검수 게이트(TBL_RAGGED 등)
  var bundle={ _meta:{ generatedAt:_xnow }, tables:arr, exportedAt:_xnow, count:arr.length };
  var blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob); var a=document.createElement('a');
  a.href=url; a.download='certlab_tables'+_mexpSuffix()+'_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  var st=document.getElementById('tblmStatus'); if(st){ st.style.color='#15793F'; st.textContent='✅ 백업 '+arr.length+'개 다운로드'; }
}
function tblmImpHandle(fileList){
  var f=[].slice.call(fileList).find(function(x){ return /\.json$/i.test(x.name)||x.type==='application/json'; });
  var stt=document.getElementById('tblmImpStatus');
  if(!f){ if(stt){stt.style.color='#A32D2D';stt.textContent='JSON 파일이 아니에요.';} return; }
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var o=JSON.parse(rd.result);
      var arr=Array.isArray(o)?o:(o.tables||o.tbl_new||[]);   // tables / tbl_new(데이터방 배치) 둘 다
      var valid=arr.filter(function(x){ return x&&x.id&&((Array.isArray(x.headers)&&Array.isArray(x.rows))||(x.html&&String(x.html).indexOf('<')>=0)); });
      if(!valid.length){ if(stt){stt.style.color='#A32D2D';stt.textContent='tables 항목 없음 (id·headers·rows 필요)';} return; }
      if(!_impDateGate('표', o, valid, 'id', true)) return;
      _tblmImpData=valid;
      if(stt){ stt.style.color='#475569'; stt.innerHTML='인식: 표 <b>'+valid.length+'</b>개 — 올리는 중…'; }
      tblmImport().catch(function(e){ _impFail('tblmImpStatus',e); });
    }catch(e){ if(stt){stt.style.color='#A32D2D';stt.textContent='파싱 오류: '+e.message;} }
  };
  rd.readAsText(f);
}
async function tblmImport(){
  if(!_tblmImpData||!_tblmImpData.length) return;
  var _ex=await _loadExistingByIds('tables', _tblmImpData.map(function(x){return String(x.id);}));
  if(!_impPreviewConfirm('표 '+_tblmImpData.length+'개 적재', _ex, _tblmImpData, 'id', ['certs','keywords','caption_chant'], /^tbl_[a-z0-9_]+$/)) return;
  var ok=0, fail=0;
  var _ops=[];
  for(var i=0;i<_tblmImpData.length;i++){
    var it=_tblmImpData[i]; var id=String(it.id);
    if(!/^tbl_[a-z0-9_]+$/.test(id)){ fail++; continue; }
    var isHtml=!!(it.html&&String(it.html).indexOf('<')>=0);
    var rec={ name:it.name||'',
      keywords:Array.isArray(it.keywords)?it.keywords:[], certs:Array.isArray(it.certs)?it.certs:[],
      caption_chant:it.caption_chant||'', note:it.note||'', updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
    if(it.type) rec.type=it.type;   // type 보존(html 등) — 구조형 표라도 type:"html"이면 rich 렌더(span/sup/sub)
    if(isHtml){ rec.type='html'; rec.html=it.html; }
    else { rec.headers=it.headers; rec.rows=it.rows; rec.merge=Array.isArray(it.merge)?it.merge:[]; }
    var payload=Object.assign({},_impPreserve(rec, it, _ex[id], ['name','note','certs','keywords','caption_chant'])); if(!isHtml) payload.rows=JSON.stringify(rec.rows);  // 구조형만 rows 문자열화
    (function(_id,_pl,_rec){ _ops.push({ref:db.collection('tables').doc(_id), data:_pl, after:function(){ _tblmAll[_id]=_cacheRec(_rec); }}); })(id,payload,rec);
  }
  var _r=await _qbWrite(_ops, function(n,t){var _s=document.getElementById('tblmImpStatus'); if(_s){_s.style.color='#475569';_s.innerHTML='처리 중… <b>'+n+'</b>/'+t;}}); ok+=_r.ok; fail+=_r.fail;
  var stt=document.getElementById('tblmImpStatus'); if(stt){ stt.style.color='#15793F'; stt.innerHTML='✅ 올림: 성공 <b>'+ok+'</b>개'+(fail?(' · 실패 '+fail+'개'+((typeof _r!=='undefined'&&_r&&_r.err)?(' — '+_r.err):'')):'')+'.'; }
  tblmRenderList();
}


// ===== 📖 개념 마스터 (Firestore concepts CRUD · 참조 검증 + 미리보기 풀기) =====
var _cptmAll={}, _cptmLoaded=false, _cptmImpData=null, _cptmImpBound=false;
function cptmEsc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
// 텍스트영역(한 줄에 하나) → 참조 배열. 빈 줄 제거. mn://id 또는 id 둘 다 허용→정규화.
function cptmLines(v, prefix){
  return String(v||'').split('\n').map(function(x){return x.trim();}).filter(Boolean).map(function(x){
    return x.indexOf(prefix+'://')===0 ? x : (prefix+'://'+x.replace(/^.*?:\/\//,''));
  });
}
// 암기코드 박스 (mn 마스터 캐시 _mnemAll 재사용)
function cptmMnBox(ref){
  var id=ref.replace('mn://',''); var m=_mnemAll[id];
  if(!m) return '<div class="cpt-broken">⚠️ 암기코드 mn://'+cptmEsc(id)+' — 마스터에 없음</div>';
  return '<div class="mnem-app">'+mnemBoxesAppHTML(m)+'</div>';
}
// 표 (표 마스터 캐시 _tblmAll 재사용 + tblmRenderTable)
function cptmTblBox(ref){
  var id=ref.replace('tbl://',''); var t=_tblmAll[id];
  if(!t) return '<div class="cpt-broken">⚠️ 표 tbl://'+cptmEsc(id)+' — 마스터에 없음</div>';
  return tblmRenderTable(t);
}
function cptmGrpBox(ref){
  var id=ref.replace('grp://',''); return '<div class="cpt-broken" style="background:#F4F6FB;border-color:#D6E2F5;color:#64748B">📈 그래프 grp://'+cptmEsc(id)+' — 렌더 추후</div>';
}
function cptmInit(){
  // 참조 해석 위해 mn·표 마스터도 로드(없으면)
  if(!_mnemLoaded) mnemLoad();
  if(!_tblmLoaded) tblmLoad();
  cptmScopeInit();
  if(!_cptmImpBound){ _cptmImpBound=true;
    var drop=document.getElementById('cptmImpDrop'), file=document.getElementById('cptmImpFile');
    if(drop) drop.onclick=function(){ file&&file.click(); };
    if(file) file.addEventListener('change', function(e){ cptmImpHandle(e.target.files); });
    if(drop){
      ['dragover','dragenter'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#0C447C';}); });
      ['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#CBD5E1';}); });
      drop.addEventListener('drop', function(e){ cptmImpHandle(e.dataTransfer.files); });
    }
  }
}
async function cptmLoad(cert){
  var st=document.getElementById('cptmStatus'); var scoped=(cert&&cert!==''&&cert!=='__all');
  if(st){ st.style.color='#7F77DD'; st.textContent=(scoped?(certWithId(cert)+' 개념 '):'')+'불러오는 중…'; }
  try{
    var snap = scoped ? await db.collection('concepts').where('certs','array-contains',cert).get() : await db.collection('concepts').get();
    _cptmAll={}; snap.forEach(function(d){ _cptmAll[d.id]=d.data()||{}; });
    _cptmLoaded = !scoped;   // 전체일 때만 완전로드로 표시(내보내기·게이트가 필요 시 전체 재로드)
    if(st) st.textContent=(scoped?(certWithId(cert)+' 개념 '):'등록 ')+Object.keys(_cptmAll).length+'개';
    cptmRenderList();
  }catch(e){ if(st){ st.style.color='#A32D2D'; st.textContent='로드 실패: '+e.message+' (array-contains 인덱스 필요할 수 있음)'; } }
}
async function cptmScopeInit(){
  try{ if(!_expExams){ var m=await db.collection('manifest').doc('exams').get(); _expExams=(m.exists&&m.data().exams)||[]; } }catch(e){ _expExams=_expExams||[]; }
  var sel=document.getElementById('cptmScopeCert');
  if(sel&&sel.options.length<=1){ sel.innerHTML='<option value="">시험 선택…</option>'+(_expExams||[]).map(function(e){return '<option value="'+e.id+'">'+(e.name||e.id)+'</option>';}).join('')+'<option value="__all">⚠ 전체 (무거움)</option>'; }
  var st=document.getElementById('cptmStatus'); if(st && !_cptmLoaded && !Object.keys(_cptmAll).length){ st.style.color='#7F77DD'; st.textContent='시험을 선택하면 그 시험 개념만 빠르게 불러옵니다. (전역 개념은 ⚠전체)'; }
}
// 개념 1개 → 앱 모습 HTML (카드 + 묶인 mn·표·grp 풀어서)
function cptmRenderConcept(c){
  var cards=Array.isArray(c.cards)?c.cards:[];
  var rows=cards.map(function(it){ it=it||{};
    var row='<div class="concept-row"><div style="font-weight:500;color:#0C447C;margin-bottom:6px">'+cptmEsc(it.t||'')+'</div>'+(it.d?'<div>'+tblmCell(it.d,true)+'</div>':'')+'</div>';
    if(it.cx&&String(it.cx).trim()) row+='<div class="cc-ex">'+tblmCell(String(it.cx).trim(),true)+'</div>';
    return row;
  }).join('');
  var box='<div class="concept-box"><div class="ti">개념설명</div>'+(rows||'<div class="concept-row" style="color:#A89C8E">(카드 없음)</div>')+'</div>';
  var mnRefs=Array.isArray(c.mn)?c.mn:[], tblRefs=Array.isArray(c.tbl)?c.tbl:[], grpRefs=Array.isArray(c.grp)?c.grp:[];
  var out=box;
  if(mnRefs.length)  out+='<div class="asset-ti">묶인 암기코드</div>'+mnRefs.map(cptmMnBox).join('');
  if(tblRefs.length) out+='<div class="asset-ti">묶인 표</div>'+tblRefs.map(cptmTblBox).join('');
  if(grpRefs.length) out+='<div class="asset-ti">묶인 그래프</div>'+grpRefs.map(cptmGrpBox).join('');
  return out;
}
function cptmRenderList(){
  var el=document.getElementById('cptmList'); if(!el) return;
  el.innerHTML=masterListHTML('cptm', _cptmAll, '등록된 개념 없음. "+ 새 개념"으로 추가하세요.', function(id){
    var c=_cptmAll[id]||{};
    var n=(Array.isArray(c.mn)?c.mn.length:0)+(Array.isArray(c.tbl)?c.tbl.length:0)+(Array.isArray(c.grp)?c.grp.length:0);
    return '<div style="border:1px solid #EEE;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff">'
      +'<div class="m-meta"><span class="m-meta-tag">🔒 식별용 · 사용자에게 안 보임</span>'
      +'<div class="m-name">'+cptmEsc(c.name||'(이름없음)')+' <span class="m-id">'+cptmEsc(id)+'</span>'+(n?' <span class="m-badge">· 참조 '+n+'</span>':'')+'</div>'
      +'<div class="m-meta-sub">'+((c.certs&&c.certs.length)?'시험 '+cptmEsc(c.certs.join(', '))+' · ':'')+'<span class="ref">cpt://'+cptmEsc(id)+'</span></div></div>'
      +'<hr class="m-div"><div class="m-userlabel">👁 사용자에게 보이는 화면</div>'
      +'<div class="m-render">'+cptmRenderConcept(c)+'</div>'
      +'<div class="m-foot">'
      +mfUsageBtn('cpt', id)
      +'<button class="btn-sm" onclick="cptmEdit(\''+id+'\')" style="background:#EAF2FB;color:#0C447C">편집</button>'
      +'<button class="btn-sm" onclick="cptmDelete(\''+id+'\')" style="background:#FDE2E1;color:#A32D2D">삭제</button></div>'
      +'</div>';
  });
}
function cptmFindDupes(){
  var byName={}, id;
  for(id in _cptmAll){ var nm=String(_cptmAll[id].name||'').replace(/\s+/g,'').trim(); if(!nm) continue; (byName[nm]=byName[nm]||[]).push(id); }
  var groups=Object.keys(byName).filter(function(n){return byName[n].length>1;});
  var el=document.getElementById('cptmList'); if(!el) return;
  if(!groups.length){ el.innerHTML='<div style="color:#15793F;padding:12px">이름 중복 없음 \u2713 (검색창 비우고 새로고침하면 전체 목록)</div>'; return; }
  groups.sort(function(a,b){return byName[b].length-byName[a].length;});
  var tot=groups.reduce(function(a,n){return a+byName[n].length;},0);
  el.innerHTML='<div style="padding:8px 0;font-size:12px;color:#A32D2D">이름 중복 <b>'+groups.length+'</b>종 · <b>'+tot+'</b>개 — 같은 이름 개념(내용은 다를 수 있음). 불필요한 것 삭제하세요.</div>'
    +groups.slice(0,150).map(function(n){ return '<div style="border:1px solid #F1D9A8;border-radius:8px;padding:8px 10px;margin-bottom:6px;background:#FFFDF8"><b>'+cptmEsc(_cptmAll[byName[n][0]].name||n)+'</b> <span style="color:#B4AE9F">('+byName[n].length+')</span><br>'
      +byName[n].map(function(id){return '<span style="font-family:monospace;font-size:11px">'+cptmEsc(id)+'</span> <button class="btn-sm" onclick="cptmEdit(\''+id+'\')" style="background:#EAF2FB;color:#0C447C;padding:1px 7px;font-size:10px">편집</button> <button class="btn-sm" onclick="cptmDelete(\''+id+'\')" style="background:#FDE2E1;color:#A32D2D;padding:1px 7px;font-size:10px">삭제</button>';}).join('<br>')+'</div>'; }).join('')
    +(groups.length>150?'<div style="color:#A89C8E;padding:8px">\u2026외 '+(groups.length-150)+'종</div>':'');
}
function cptmFill(c){
  document.getElementById('cptmIdField').value=c.id||'';
  document.getElementById('cptmNameField').value=c.name||'';
  document.getElementById('cptmCardsField').value=c.cards?JSON.stringify(c.cards,null,1):'';
  document.getElementById('cptmMnField').value=(c.mn||[]).join('\n');
  document.getElementById('cptmTblField').value=(c.tbl||[]).join('\n');
  document.getElementById('cptmGrpField').value=(c.grp||[]).join('\n');
  document.getElementById('cptmKwField').value=(c.keywords||[]).join(', ');
  document.getElementById('cptmCertsField').value=(c.certs||[]).join(', ');
  document.getElementById('cptmNoteField').value=c.note||'';
  cptmPreview(); cptmValidateId();
}
function cptmNew(){ cptmFill({}); document.getElementById('cptmIdField').disabled=false; document.getElementById('cptmEditTi').textContent='새 개념'; document.getElementById('cptmEditor').style.display=''; }
function cptmEdit(id){ cptmFill(Object.assign({id:id},_cptmAll[id]||{})); document.getElementById('cptmIdField').disabled=true; document.getElementById('cptmEditTi').textContent='개념 편집: '+id; document.getElementById('cptmEditor').style.display=''; }
function cptmCancel(){ document.getElementById('cptmEditor').style.display='none'; }
function cptmValidateId(){
  var id=document.getElementById('cptmIdField').value.trim(); var w=document.getElementById('cptmIdWarn');
  if(!id){ if(w){w.style.color='#A32D2D';w.textContent='';} return false; }
  if(!/^cpt_[a-z0-9_]+$/.test(id)){ if(w){w.style.color='#A32D2D';w.textContent='✗ cpt_ + 영문소문자/숫자/_ 만 (예: cpt_law_resident_proposal)';} return false; }
  if(w){ w.style.color='#15793F'; w.textContent='✓ 형식 OK'; } return true;
}
// 편집 필드 → 개념 객체 + 파싱오류
function cptmParse(){
  var err='';
  var cardsRaw=document.getElementById('cptmCardsField').value.trim();
  var cards=[]; if(cardsRaw){ try{ cards=JSON.parse(cardsRaw); }catch(e){ err='cards JSON 오류'; } }
  return [{ cards:Array.isArray(cards)?cards:[],
    mn: cptmLines(document.getElementById('cptmMnField').value,'mn'),
    tbl:cptmLines(document.getElementById('cptmTblField').value,'tbl'),
    grp:cptmLines(document.getElementById('cptmGrpField').value,'grp') }, err];
}
// 참조 검증: 마스터에 실제 있는지. 없는 것 목록 반환.
function cptmCheckRefs(c){
  var miss=[];
  c.mn.forEach(function(r){ if(!_mnemAll[r.replace('mn://','')]) miss.push(r); });
  c.tbl.forEach(function(r){ if(!_tblmAll[r.replace('tbl://','')]) miss.push(r); });
  // grp는 마스터 없음(렌더 추후) → 검증 제외
  return miss;
}
function cptmPreview(){
  var p=cptmParse(), c=p[0], err=p[1];
  var box=document.getElementById('cptmPrev'), w=document.getElementById('cptmRefWarn');
  if(err){ box.innerHTML='<div style="color:#A32D2D;font-size:12px">⚠️ '+err+'</div>'; if(w)w.textContent=''; return; }
  // 참조 검증 표시
  var miss=cptmCheckRefs(c);
  if(w){ if(miss.length){ w.style.color='#A32D2D'; w.innerHTML='⚠️ 마스터에 없는 참조 '+miss.length+'개: '+miss.map(cptmEsc).join(', '); } else { w.style.color='#15793F'; w.textContent=(c.mn.length+c.tbl.length+c.grp.length)?'✓ 참조 모두 확인됨':''; } }
  box.innerHTML=cptmRenderConcept(c);
}
async function cptmSave(){
  var id=document.getElementById('cptmIdField').value.trim();
  if(!cptmValidateId()){ alert('id 형식: cpt_ + 영문 소문자/숫자/_ (예: cpt_law_resident_proposal)'); return; }
  var p=cptmParse(), c=p[0], err=p[1];
  if(err){ alert(err); return; }
  if(!c.cards.length){ alert('cards(개념카드)는 최소 1개 필요해요.'); return; }
  var miss=cptmCheckRefs(c);
  if(miss.length && !confirm('마스터에 없는 참조 '+miss.length+'개가 있습니다:\n'+miss.join(', ')+'\n\n그래도 저장할까요? (앱에선 ⚠️로 뜹니다)')) return;
  var csv=function(v){ return v.split(',').map(function(x){return x.trim();}).filter(Boolean); };
  var rec={ name:document.getElementById('cptmNameField').value.trim(),
    cards:c.cards, mn:c.mn, tbl:c.tbl, grp:c.grp,
    keywords:csv(document.getElementById('cptmKwField').value), certs:csv(document.getElementById('cptmCertsField').value),
    note:document.getElementById('cptmNoteField').value.trim(), updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
  try{ await db.collection('concepts').doc(id).set(rec); _cptmAll[id]=_cacheRec(rec); cptmRenderList();
    var st=document.getElementById('cptmStatus'); if(st){ st.style.color='#15793F'; st.textContent='저장됨: '+id+' (총 '+Object.keys(_cptmAll).length+'개)'; }
    cptmCancel();
  }catch(e){ alert('저장 실패: '+e.message); }
}
async function cptmDelete(id){
  if(!confirm(id+' 개념을 삭제할까요?')) return;
  try{ await db.collection('concepts').doc(id).delete(); delete _cptmAll[id]; cptmRenderList();
    var st=document.getElementById('cptmStatus'); if(st){ st.style.color='#A32D2D'; st.textContent='삭제됨: '+id+' (총 '+Object.keys(_cptmAll).length+'개)'; }
  }catch(e){ alert('삭제 실패: '+e.message); }
}
async function masterExportAll(){
  var st=document.getElementById('cptmStatus');
  var steps=[['개념',cptmExport],['암기',mnemExport],['표',tblmExport],['그래프',grpmExport],['인터랙티브',itvmExport],['OX진술태그',ottagExport]];
  for(var i=0;i<steps.length;i++){
    if(st){ st.style.color='#475569'; st.textContent='⬇ 마스터 일괄 내보내기… '+steps[i][0]+' ('+(i+1)+'/'+steps.length+')'; }
    try{ await steps[i][1](); }catch(e){}
    await new Promise(function(r){ setTimeout(r, 600); });   // 브라우저 다중 다운로드 누락 방지
  }
  if(st){ st.style.color='#15793F'; st.textContent='✅ 마스터 6종(개념·암기·표·그래프·인터랙티브·OX진술태그) 각각 다운로드 완료'; }
}
var _mexpScope=null;
function _mexpKeep(id, rec){ var sc=_mexpScope; if(!sc) return true;
  if(sc.cert && sc.cert!=='__all'){ var cs=(rec&&rec.certs)||[]; if(cs.indexOf(sc.cert)<0) return false; }
  if(sc.sub && sc.sub!=='__all'){ if(mfSubjOf(id, rec)!==sc.sub) return false; }
  return true; }
function _mexpSuffix(){ var sc=_mexpScope; if(!sc) return ''; var s=''; if(sc.cert&&sc.cert!=='__all') s+='_'+sc.cert; if(sc.sub&&sc.sub!=='__all') s+='_'+sc.sub; return s; }
async function mexpInit(){ try{ if(!_expExams){ var m=await db.collection('manifest').doc('exams').get(); _expExams=(m.exists&&m.data().exams)||[]; } }catch(e){ _expExams=_expExams||[]; }
  var c=document.getElementById('mexpCert'); if(c&&c.options.length<=1){ c.innerHTML='<option value="__all">​전체 (모든 시험)</option>'+(_expExams||[]).map(function(e){return '<option value="'+e.id+'">'+(e.name||e.id)+'</option>';}).join(''); } mexpFill(); }
function mexpFill(){ var c=document.getElementById('mexpCert'), sb=document.getElementById('mexpSub'); if(!c||!sb) return;
  if(c.value==='__all'){ sb.innerHTML='<option value="__all">전체 과목</option>'; sb.disabled=true; return; }
  sb.disabled=false; var ex=(_expExams||[]).find(function(e){return e.id===c.value;}); var subs=(ex&&ex.subjects)||[];
  sb.innerHTML='<option value="__all">전체 과목</option>'+subs.map(function(x){return '<option value="'+x.code+'">'+(x.name||x.code)+'</option>';}).join(''); }
async function masterExportScoped(){ var c=(document.getElementById('mexpCert')||{}).value||'__all'; var sb=(document.getElementById('mexpSub')||{}).value||'__all';
  _mexpScope=(c==='__all'&&sb==='__all')?null:{cert:c,sub:sb};
  try{ await masterExportAll(); } finally { _mexpScope=null; } }
if(typeof window!=='undefined'){ (document.readyState==='loading') ? window.addEventListener('DOMContentLoaded',function(){setTimeout(function(){try{mexpInit();}catch(_){}},400);}) : setTimeout(function(){try{mexpInit();}catch(_){}},400); }
async function cptmExport(){
  if(!_cptmLoaded){ try{ var _s=await db.collection('concepts').get(); _cptmAll={}; _s.forEach(function(d){ _cptmAll[d.id]=d.data()||{}; }); _cptmLoaded=true; }catch(e){ alert('로드 실패: '+e.message); return; } }
  var ids=Object.keys(_cptmAll);
  if(_mexpScope) ids=ids.filter(function(id){ return _mexpKeep(id,_cptmAll[id]); });
  if(!ids.length){ alert('등록된 개념이 없어요.'); return; }
  var _xnow=_kstISO(new Date());
  var arr=ids.map(function(id){ var r=Object.assign({id:id}, _cptmAll[id]); r.updatedAt=_uaISO(r.updatedAt, new Date()); return r; });
  if(!_qcMasterExportGate('개념', arr, (QC&&QC.conceptAudit))) return;   // ← 내보내기 검수 게이트(CD_NO_D 등)
  var bundle={ _meta:{ generatedAt:_xnow }, concepts:arr, exportedAt:_xnow, count:arr.length };
  var blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob); var a=document.createElement('a');
  a.href=url; a.download='certlab_concepts'+_mexpSuffix()+'_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  var st=document.getElementById('cptmStatus'); if(st){ st.style.color='#15793F'; st.textContent='✅ 백업 '+arr.length+'개 다운로드'; }
}
function cptmImpHandle(fileList){
  var f=[].slice.call(fileList).find(function(x){ return /\.json$/i.test(x.name)||x.type==='application/json'; });
  var stt=document.getElementById('cptmImpStatus');
  if(!f){ if(stt){stt.style.color='#A32D2D';stt.textContent='JSON 파일이 아니에요.';} return; }
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var o=JSON.parse(rd.result);
      var arr=Array.isArray(o)?o:(o.concepts||o.cpt_new||[]);   // concepts / cpt_new 둘 다
      var valid=arr.filter(function(x){ return x&&x.id&&Array.isArray(x.cards); });
      var dels=(o&&Array.isArray(o._delete))?o._delete.filter(function(x){return typeof x==='string'&&/^cpt_[a-z0-9_]+$/.test(x);}):[];
      if(!valid.length && !dels.length){ if(stt){stt.style.color='#A32D2D';stt.textContent='concepts 항목 없음 (id·cards 필요) · _delete도 없음';} return; }
      if(valid.length && !_impDateGate('개념', o, valid, 'id', true)) return;
      _cptmImpData=valid; _cptmImpDelete=dels;
      if(stt){ stt.style.color='#475569'; stt.innerHTML='인식: 개념 추가 <b>'+valid.length+'</b>개'+(dels.length?(' · 삭제 <b>'+dels.length+'</b>개'):'')+' — 처리 중…'; }
      cptmImport().catch(function(e){ _impFail('cptmImpStatus',e); });
    }catch(e){ if(stt){stt.style.color='#A32D2D';stt.textContent='파싱 오류: '+e.message;} }
  };
  rd.readAsText(f);
}
async function cptmImport(){
  var _hasAdd=_cptmImpData&&_cptmImpData.length, _hasDel=_cptmImpDelete&&_cptmImpDelete.length;
  if(!_hasAdd && !_hasDel) return;
  var _st0=document.getElementById('cptmImpStatus'); if(_st0 && _hasAdd && _cptmImpData.length>400){ _st0.style.color='#475569'; _st0.textContent='기존 개념 불러와 비교 중… (전체 세트라 수 초 걸립니다)'; }
  var _ex=_hasAdd?await _loadExistingByIds('concepts', _cptmImpData.map(function(x){return String(x.id);})):{};
  var _dn=function(a,pfx){ return (Array.isArray(a)?a:[]).map(function(x){ x=String(x).trim(); return x.indexOf(pfx+'://')===0?x:(pfx+'://'+x.replace(/^.*?:\/\//,'')); }).sort(); };
  var _dsig=function(o){ o=o||{}; return JSON.stringify({name:o.name||'',note:o.note||'',cards:o.cards||[],certs:(o.certs||[]).slice().sort(),keywords:(o.keywords||[]).slice().sort(),mn:_dn(o.mn,'mn'),tbl:_dn(o.tbl,'tbl'),grp:_dn(o.grp,'grp')}); };
  if(_hasAdd){ if(!_impPreviewConfirm('개념 '+_cptmImpData.length+'개 적재', _ex, _cptmImpData, 'id', ['cards','mn','tbl','grp','certs','keywords'], /^cpt_[a-z0-9_]+$/)) return; }
  if(_hasDel){ if(!confirm('개념 '+_cptmImpDelete.length+'개 삭제(고아 정리) — 되돌릴 수 없습니다. 계속?')) return; }
  var ok=0, fail=0, del=0, _skip=0;
  var _ops=[];
  for(var i=0;i<_cptmImpData.length;i++){
    var it=_cptmImpData[i]; var id=String(it.id);
    if(!/^cpt_[a-z0-9_]+$/.test(id)){ fail++; continue; }
    if(_ex[id] && _dsig(it)===_dsig(_ex[id])){ _skip++; continue; }
    var norm=function(a,pfx){ return (Array.isArray(a)?a:[]).map(function(x){ x=String(x).trim(); return x.indexOf(pfx+'://')===0?x:(pfx+'://'+x.replace(/^.*?:\/\//,'')); }); };
    var rec={ name:it.name||'', cards:Array.isArray(it.cards)?it.cards:[],
      mn:norm(it.mn,'mn'), tbl:norm(it.tbl,'tbl'), grp:norm(it.grp,'grp'),
      keywords:Array.isArray(it.keywords)?it.keywords:[], certs:Array.isArray(it.certs)?it.certs:[],
      note:it.note||'', updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
    _impPreserve(rec, it, _ex[id], ['name','note','certs','keywords','cards','mn','tbl','grp']);
    // [클로버 방지] 링크 배열을 빈 값으로 명시해도 기존 링크는 지우지 않는다(미지정=보존).
    //  → 표·그래프·인터랙티브 등 종류별 개념파일을 순서 상관없이 층층이 올려도 앞 링크가 안 지워짐.
    //  링크를 실제로 비우려면 편집기(cptmSave)에서 지운다. 대량 업로드로는 빈 배열이 삭제로 처리되지 않음.
    if(_ex[id]){ ['mn','tbl','grp'].forEach(function(f){ if((!rec[f]||!rec[f].length) && Array.isArray(_ex[id][f]) && _ex[id][f].length) rec[f]=_ex[id][f]; }); }
    (function(_id,_rec){ _ops.push({ref:db.collection('concepts').doc(_id), data:_rec, after:function(){ _cptmAll[_id]=_cacheRec(_rec); }}); })(id,rec);
  }
  var _r=await _qbWrite(_ops, function(n,t){var _s=document.getElementById('cptmImpStatus'); if(_s){_s.style.color='#475569';_s.innerHTML='처리 중… <b>'+n+'</b>/'+t;}}); ok+=_r.ok; fail+=_r.fail;
  if(_cptmImpDelete&&_cptmImpDelete.length){
    var _dops=[]; _cptmImpDelete.forEach(function(x){ var did=String(x); if(/^cpt_[a-z0-9_]+$/.test(did)) _dops.push({ref:db.collection('concepts').doc(did), del:true, after:function(){ delete _cptmAll[did]; }}); }); var _rd=await _qbWrite(_dops); del=_rd.ok;
  }
  var stt=document.getElementById('cptmImpStatus'); if(stt){ stt.style.color='#15793F'; stt.innerHTML='✅ 올림: 성공 <b>'+ok+'</b>개'+(_skip?(' · 건너뜀(안 바뀜) <b>'+_skip+'</b>개'):'')+(fail?(' · 실패 '+fail+'개'+((typeof _r!=='undefined'&&_r&&_r.err)?(' — '+_r.err):'')):'')+(del?(' · 삭제 <b>'+del+'</b>개'):'')+'.'; }
  cptmRenderList();
}


// ===== 🏷️ OX진술 태그(ot) 업로드 — exp.o와 1:1, 개념 마스터를 allow-list로 검증 후 exp.ot 병합 =====
var _ottagData=null, _ottagShard=null, _ottagOk=null, _ottagBound=false;
function ottagEsc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function ottagBindImp(){
  if(_ottagBound) return; _ottagBound=true;
  var file=document.getElementById('ottagImpFile'), drop=document.getElementById('ottagImpDrop');
  if(file) file.addEventListener('change', function(e){ ottagHandle(e.target.files); });
  if(drop){
    ['dragover','dragenter'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#0C447C';}); });
    ['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#CBD5E1';}); });
    drop.addEventListener('drop', function(e){ ottagHandle(e.dataTransfer.files); });
  }
}
function ottagHandle(fileList){
  var f=[].slice.call(fileList).find(function(x){ return /\.json$/i.test(x.name)||x.type==='application/json'; });
  var stt=document.getElementById('ottagStatus');
  if(!f){ if(stt){stt.style.color='#A32D2D';stt.textContent='JSON 파일이 아니에요.';} return; }
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var o=JSON.parse(rd.result);
      // ot 평면화 헬퍼(평면 ot / sets[].ot 합침)
      function flatOf(x){ var flat={};
        if(x.ot && typeof x.ot==='object'){ Object.keys(x.ot).forEach(function(k){ flat[k]=x.ot[k]; }); }
        if(Array.isArray(x.sets)){ x.sets.forEach(function(b){ if(b&&b.ot&&typeof b.ot==='object'){ Object.keys(b.ot).forEach(function(k){ flat[k]=b.ot[k]; }); } }); }
        return flat;
      }
      var subjects=[];
      if(Array.isArray(o.subjects)){            // 내보내기(백업) 묶음 — 과목별
        o.subjects.forEach(function(se){ if(se&&se.cert&&se.subject){ subjects.push({cert:se.cert, subject:se.subject, ot:flatOf(se)}); } });
      } else if(o.cert && o.subject){           // 단일 과목 파일
        subjects.push({cert:o.cert, subject:o.subject, ot:flatOf(o)});
      }
      subjects=subjects.filter(function(s){ return Object.keys(s.ot).length; });
      if(!subjects.length){ if(stt){stt.style.color='#A32D2D';stt.textContent='형식 오류: cert·subject·ot 필요 (또는 subjects[] 묶음)';} return; }
      _ottagData={subjects:subjects};
      var tot=subjects.reduce(function(n,s){ return n+Object.keys(s.ot).length; },0);
      if(stt){ stt.style.color='#475569'; stt.innerHTML='인식: '+subjects.map(function(s){return ottagEsc(csKo(s.cert,s.subject));}).join(', ')+' · 문항 '+tot+'개 — 검증 중…'; }
      ottagValidate();
    }catch(e){ if(stt){stt.style.color='#A32D2D';stt.textContent='파싱 오류: '+e.message;} }
  };
  rd.readAsText(f);
}
// 과목 전체 문항을 소속 문서(부모 비샤드 / 각 샤드)와 함께 수집 → byId[qid]={q, home}
async function _ottagCollect(cert, subject){
  var docId=cert+'__'+subject, byId={}, homes={};
  var pd=await db.collection('banks').doc(docId).get();
  var data=pd.exists ? (pd.data()||{}) : null;
  if(data){
    if(Array.isArray(data.questions) && data.questions.length){
      homes[docId]={data:data, questions:data.questions, coll:'banks'};
      data.questions.forEach(function(q){ if(q&&q.id){ byId[q.id]={q:q, home:docId}; } });
    }
    if(Array.isArray(data.shards) && data.shards.length){   // 샤드형: 각 샤드 doc 읽기 (id = 부모__회차)
      for(var i=0;i<data.shards.length;i++){
        var raw=String(data.shards[i]);
        var sid=(raw.indexOf(docId+'__')===0) ? raw : (docId+'__'+raw);   // 회차명만 오면 부모__ 붙임
        var sd=null;
        try{ sd=await db.collection('banks').doc(sid).get(); }catch(_){}
        if((!sd||!sd.exists) && sid!==raw){ try{ sd=await db.collection('banks').doc(raw).get(); if(sd&&sd.exists) sid=raw; }catch(_){} }  // 폴백: raw가 full id인 경우
        if(sd && sd.exists && Array.isArray(sd.data().questions)){
          var sdata=sd.data();
          homes[sid]={data:sdata, questions:sdata.questions, coll:'banks'};
          sdata.questions.forEach(function(q){ if(q&&q.id){ byId[q.id]={q:q, home:sid}; } });
        }
      }
    }
  }
  // 변형(레벨업) 풀: adaptive/{cert}__{subject}__variantq — banks에 없는 id만 채움(A안 자동 분기)
  try{
    var vqId=cert+'__'+subject+'__variantq';
    var vd=await db.collection('adaptive').doc(vqId).get();
    if(vd && vd.exists){
      var vdata=vd.data()||{};
      if(Array.isArray(vdata.questions) && vdata.questions.length){
        homes[vqId]={data:vdata, questions:vdata.questions, coll:'variantq'};
        vdata.questions.forEach(function(q){ if(q&&q.id && !byId[q.id]){ byId[q.id]={q:q, home:vqId}; } });
      }
    }
  }catch(_){}
  if(!data && !Object.keys(byId).length){ return {byId:byId, homes:homes, err:'밴크/변형 문서 없음: '+docId}; }
  return {byId:byId, homes:homes, err:(Object.keys(byId).length?null:'문항을 못 읽음')};
}
async function ottagValidate(){
  var rep=document.getElementById('ottagReport'), btn=document.getElementById('ottagApplyBtn');
  _ottagShard=null; _ottagOk=null; if(btn) btn.style.display='none';
  if(!_cptmLoaded){ await cptmLoad(); }
  var subjects=(_ottagData&&_ottagData.subjects)||[];
  var allHomes={}, allById={}, okMap={}, missCpt={}, errN=0, okN=0, setStat={}, errRows=[], failSubs=[];
  for(var si=0; si<subjects.length; si++){
    var o=subjects[si];
    var col=await _ottagCollect(o.cert, o.subject);
    if(col.err){ failSubs.push(csKo(o.cert,o.subject)+': '+col.err); continue; }
    Object.keys(col.homes).forEach(function(h){ allHomes[h]=col.homes[h]; });
    Object.keys(col.byId).forEach(function(id){ allById[id]=col.byId[id]; });
    var byId=col.byId, subLabel=o.subject;
    Object.keys(o.ot).forEach(function(qid){
      var arr=o.ot[qid], rec=byId[qid], q=rec&&rec.q, errs=[];
      if(!q){ errs.push('문항 없음'); }
      else {
        var oArr=(q.exp&&q.exp.o)||[];
        if(!Array.isArray(arr)) errs.push('ot 배열 아님');
        else if(arr.length!==oArr.length) errs.push('길이 '+arr.length+'≠exp.o '+oArr.length);
        if(Array.isArray(arr)) arr.forEach(function(item){
          if(item&&item.skip) return;
          ((item&&item.cpt)||[]).forEach(function(c){ if(!_cptmAll[c]){ errs.push('cpt 없음: '+c); missCpt[c]=(missCpt[c]||0)+1; } });
        });
      }
      var setKey=subLabel+' · '+((q&&q.set)||'(미상)');
      var ss=setStat[setKey]||(setStat[setKey]={ok:0,err:0});
      if(errs.length){ errN++; ss.err++; errRows.push('<div style="color:#A32D2D">✗ '+ottagEsc(qid)+' — '+ottagEsc(errs.join(' · '))+'</div>'); }
      else { okN++; ss.ok++; okMap[qid]=arr; }
    });
  }
  if(!Object.keys(allById).length && failSubs.length){ rep.innerHTML='<span style="color:#A32D2D">⚠️ '+ottagEsc(failSubs.join(' / '))+'. cert/subject 확인.</span>'; return; }
  var missList=Object.keys(missCpt);
  var head='<div style="margin-bottom:8px"><b>검증 결과:</b> 통과 '+okN+' · 오류 '+errN+(missList.length?(' · <span style="color:#A32D2D">마스터에 없는 개념 '+missList.length+'종</span>'):'')+'</div>';
  if(failSubs.length){ head+='<div style="color:#A32D2D;font-size:12px;margin-bottom:6px">읽기 실패: '+ottagEsc(failSubs.join(' / '))+'</div>'; }
  var setRows=Object.keys(setStat).sort().map(function(k){
    var s=setStat[k]; var c=s.err?'#A32D2D':'#15793F';
    return '<div style="color:'+c+'">'+(s.err?'✗':'✅')+' '+ottagEsc(k)+' — '+s.ok+'/'+(s.ok+s.err)+'</div>';
  });
  head+='<div style="background:#F6F8FB;border:1px solid #E3E8EF;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:12.5px"><b>과목·회차별</b>'+setRows.join('')+'</div>';
  if(missList.length){
    head+='<div style="background:#FBF6F5;border:1px solid #F1D9A8;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:12px"><b>⚠️ 먼저 개념 마스터에 등록해야 하는 cpt</b><br>'+missList.map(ottagEsc).join('<br>')+'</div>';
  }
  rep.innerHTML=head+(errRows.length?('<div style="margin-top:4px"><b>오류 상세</b>'+errRows.join('')+'</div>'):'');
  _ottagShard={homes:allHomes, byId:allById};
  _ottagOk=okMap;
  if(okN>0 && !missList.length){ if(btn){ btn.style.display=''; btn.textContent='검증 통과 '+okN+'문항에 exp.ot 병합 저장'; } }
  else if(missList.length){ if(btn) btn.style.display='none'; }
}
async function ottagExport(){
  var rep=document.getElementById('ottagReport');
  if(rep){ rep.innerHTML='<span style="color:#475569">내보내는 중… banks 읽는 중</span>'; }
  try{
    var snap=await db.collection('banks').get();
    var groups={};   // cert||subject → {cert,subject,ot:{}}
    snap.forEach(function(doc){
      var d=doc.data()||{}; var qs=Array.isArray(d.questions)?d.questions:[];
      if(!qs.length) return;
      var cert=d.cert, subject=d.subject;
      if(!cert||!subject){ var p=doc.id.split('__'); cert=cert||p[0]; subject=subject||p[1]; }
      if(_mexpScope&&((_mexpScope.cert&&_mexpScope.cert!=='__all'&&cert!==_mexpScope.cert)||(_mexpScope.sub&&_mexpScope.sub!=='__all'&&subject!==_mexpScope.sub))) return;
      qs.forEach(function(q){
        if(q&&q.id&&q.exp&&q.exp.ot){
          var key=cert+'||'+subject;
          var g=groups[key]||(groups[key]={cert:cert, subject:subject, ot:{}});
          g.ot[q.id]=q.exp.ot;
        }
      });
    });
    try{   // 변형(레벨업) 풀의 ot도 백업에 포함 — adaptive/{cert}__{subject}__variantq
      if(rep){ rep.innerHTML='<span style="color:#475569">내보내는 중… adaptive(변형) 읽는 중</span>'; }
      var asnap=await db.collection('adaptive').get();
      asnap.forEach(function(doc){
        var d=doc.data()||{}; if(d.kind!=='variantq') return;
        var qs=Array.isArray(d.questions)?d.questions:[]; if(!qs.length) return;
        var p=doc.id.split('__'); var cert=d.cert||p[0]; var subject=d.subject||p[1];
        qs.forEach(function(q){
          if(q&&q.id&&q.exp&&q.exp.ot){
            var key=cert+'||'+subject;
            var g=groups[key]||(groups[key]={cert:cert, subject:subject, ot:{}});
            g.ot[q.id]=q.exp.ot;
          }
        });
      });
    }catch(_){}
    var subjects=Object.keys(groups).map(function(k){ return groups[k]; });
    if(!subjects.length){ if(rep){rep.innerHTML='<span style="color:#A32D2D">내보낼 ot 태그가 없습니다.</span>';} return; }
    var bundle={ _meta:{ kind:'ottag_export', exportedAt:_kstISO(new Date()), subjectCount:subjects.length }, subjects:subjects };
    var blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='certlab_ottag_export_'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    var tot=subjects.reduce(function(n,s){ return n+Object.keys(s.ot).length; },0);
    if(rep){ rep.innerHTML='<div style="color:#15793F;font-weight:700">\u2705 ot 내보내기 완료 — 과목 '+subjects.length+'개 · 태그 문항 '+tot+'개. (이 파일을 다시 드롭하면 복원)</div>'; }
  }catch(e){ if(rep){rep.innerHTML='<span style="color:#A32D2D">내보내기 오류: '+ottagEsc(e.message)+'</span>';} }
}
async function ottagApply(){
  if(!_ottagShard||!_ottagOk){ return; }
  var ids=Object.keys(_ottagOk); if(!ids.length) return;
  if(!confirm(ids.length+'개 문항에 exp.ot를 병합 저장합니다. 계속할까요?')) return;
  var sh=_ottagShard, rep=document.getElementById('ottagReport');
  // 통과 문항에 exp.ot 채우고 소속 문서별로 묶기
  var touched={};   // home docId → true
  ids.forEach(function(qid){
    var rec=sh.byId[qid]; if(!rec||!rec.q) return;
    rec.q.exp=rec.q.exp||{}; rec.q.exp.ot=_ottagOk[qid];
    touched[rec.home]=true;
  });
  try{
    var saved=0, docs=0;
    var homeIds=Object.keys(touched);
    for(var i=0;i<homeIds.length;i++){
      var hid=homeIds[i], h=sh.homes[hid];
      if(!h) continue;
      if(h.coll==='variantq'){   // 변형 풀: adaptive 컬렉션에 variantq 형식으로 저장
        await db.collection('adaptive').doc(hid).set(Object.assign({}, h.data, {kind:'variantq', count:h.questions.length, questions:h.questions}));
      } else {
        await db.collection('banks').doc(hid).set(Object.assign({}, h.data, {questions:h.questions}));
      }
      docs++;
    }
    rep.innerHTML='<div style="color:#15793F;font-weight:700">✅ '+ids.length+'문항에 exp.ot 병합 저장 완료 ('+docs+'개 문서).</div>';
    document.getElementById('ottagApplyBtn').style.display='none';
  }catch(e){ rep.innerHTML='<div style="color:#A32D2D">저장 실패: '+ottagEsc(e.message)+'</div>'; }
}


// ===== 🩹 콘텐츠 패치 (해설·예시·띄어쓰기 부분 병합 · banks/변형 문항에 id로 콕 병합) =====
var _cpatchData=null, _cpatchShard=null, _cpatchOk=null, _cpatchBound=false;
function cpatchEsc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _cpNows(s){ return String(s==null?'':s).replace(/\s+/g,''); }   // 모든 공백 제거(띄어쓰기만 비교용)
function cpatchBindImp(){
  if(_cpatchBound) return; _cpatchBound=true;
  var file=document.getElementById('cpatchImpFile'), drop=document.getElementById('cpatchImpDrop');
  if(file) file.addEventListener('change', function(e){ cpatchHandle(e.target.files); });
  if(drop){
    ['dragover','dragenter'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#0C447C';}); });
    ['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#CBD5E1';}); });
    drop.addEventListener('drop', function(e){ cpatchHandle(e.dataTransfer.files); });
  }
}
function cpatchHandle(fileList){
  var f=[].slice.call(fileList).find(function(x){ return /\.json$/i.test(x.name)||x.type==='application/json'; });
  var stt=document.getElementById('cpatchStatus');
  if(!f){ if(stt){stt.style.color='#A32D2D';stt.textContent='JSON 파일이 아니에요.';} return; }
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var o=JSON.parse(rd.result);
      var edits=Array.isArray(o) ? o : (Array.isArray(o.edits)?o.edits:(Array.isArray(o.patch)?o.patch:null));
      if(!edits){ if(stt){stt.style.color='#A32D2D';stt.textContent='형식 오류: [{docId,id,o?,ex?,q?,opts?}] 배열 또는 {edits:[…]} 필요';} return; }
      // docId별 묶기
      var groups={};
      edits.forEach(function(e){
        if(!e||!e.docId||!e.id) return;
        var p=String(e.docId).split('__'); var cert=p[0], subject=p[1];
        if(!cert||!subject) return;
        var key=e.docId; var g=groups[key]||(groups[key]={docId:e.docId, cert:cert, subject:subject, edits:[]});
        g.edits.push(e);
      });
      var glist=Object.keys(groups).map(function(k){ return groups[k]; });
      if(!glist.length){ if(stt){stt.style.color='#A32D2D';stt.textContent='유효한 {docId,id} 항목이 없습니다.';} return; }
      _cpatchData={groups:glist, total:edits.length};
      if(stt){ stt.style.color='#475569'; stt.innerHTML='인식: 문서 '+glist.length+'개 · 편집 '+edits.length+'건 — 검증 중…'; }
      cpatchValidate();
    }catch(e){ if(stt){stt.style.color='#A32D2D';stt.textContent='파싱 오류: '+e.message;} }
  };
  rd.readAsText(f);
}
async function cpatchValidate(){
  var rep=document.getElementById('cpatchReport'), btn=document.getElementById('cpatchApplyBtn');
  _cpatchShard=null; _cpatchOk=null; if(btn) btn.style.display='none';
  var groups=(_cpatchData&&_cpatchData.groups)||[];
  var allHomes={}, okMap={}, errN=0, okN=0, setStat={}, errRows=[], failSubs=[];
  var cntO=0, cntEx=0, cntSp=0;
  for(var gi=0; gi<groups.length; gi++){
    var G=groups[gi];
    var col=await _ottagCollect(G.cert, G.subject);
    if(col.err){ failSubs.push(csKo(G.cert,G.subject)+': '+col.err); continue; }
    Object.keys(col.homes).forEach(function(h){ allHomes[h]=col.homes[h]; });
    var byId=col.byId;
    G.edits.forEach(function(e){
      var rec=byId[e.id], q=rec&&rec.q, errs=[], hasField=false;
      if(!q){ errs.push('문항 없음'); }
      else {
        if(e.o!=null){ hasField=true;
          if(!Array.isArray(e.o)) errs.push('o 배열 아님');
          else { var oArr=(q.exp&&q.exp.o)||[];
            if(oArr.length && e.o.length!==oArr.length) errs.push('o 길이 '+e.o.length+'≠exp.o '+oArr.length);
            e.o.forEach(function(t,i){
              var emptyNew=(typeof t!=='string'||!String(t).trim());
              var origHad=(oArr[i]!=null && String(oArr[i]).replace(/<[^>]+>/g,'').trim()!=='');
              if(emptyNew && origHad) errs.push('o['+i+'] 기존 해설을 빈값으로 덮음 — 차단');  // 계산형 빈 슬롯(원래도 빈칸)은 허용, 기존 해설 삭제만 차단
            });
          }
        }
        if(e.ex!=null){ hasField=true;
          if(!Array.isArray(e.ex)) errs.push('ex 배열 아님');
          else e.ex.forEach(function(t,i){ if(typeof t!=='string') errs.push('ex['+i+'] 문자열 아님'); });
        }
        if(e.q!=null){ hasField=true;
          if(typeof e.q!=='string') errs.push('q 문자열 아님');
          else if(_cpNows(e.q)!==_cpNows(q.q||'')) errs.push('q 띄어쓰기 외 변경 — 차단');
        }
        if(e.opts!=null){ hasField=true;
          if(!Array.isArray(e.opts)) errs.push('opts 배열 아님');
          else { var cur=q.opts||[];
            if(e.opts.length!==cur.length) errs.push('opts 길이 '+e.opts.length+'≠현재 '+cur.length);
            else e.opts.forEach(function(t,i){ if(_cpNows(String(t))!==_cpNows(String(cur[i]==null?'':cur[i]))) errs.push('opts['+(i+1)+'] 띄어쓰기 외 변경 — 차단'); });
          }
        }
        if(!hasField) errs.push('수정 필드 없음(o·ex·q·opts 중 하나 필요)');
      }
      var setKey=G.subject+' · '+((q&&q.set)||'(미상)');
      var ss=setStat[setKey]||(setStat[setKey]={ok:0,err:0});
      if(errs.length){ errN++; ss.err++; errRows.push('<div style="color:#A32D2D">✗ '+cpatchEsc(G.docId+' / '+e.id)+' — '+cpatchEsc(errs.join(' · '))+'</div>'); }
      else {
        okN++; ss.ok++;
        okMap[rec.home+'||'+e.id]={ rec:rec, o:(e.o!=null?e.o:null), ex:(e.ex!=null?e.ex:null), q:(e.q!=null?e.q:null), opts:(e.opts!=null?e.opts:null) };
        if(e.o!=null) cntO++; if(e.ex!=null) cntEx++; if(e.q!=null||e.opts!=null) cntSp++;
      }
    });
  }
  var head='<div style="margin-bottom:8px"><b>검증 결과:</b> 통과 '+okN+' · 오류 '+errN+' <span style="color:#64748B">(해설 '+cntO+' · 예시 '+cntEx+' · 띄어쓰기 '+cntSp+')</span></div>';
  if(failSubs.length){ head+='<div style="color:#A32D2D;font-size:12px;margin-bottom:6px">읽기 실패: '+cpatchEsc(failSubs.join(' / '))+'</div>'; }
  var setRows=Object.keys(setStat).sort().map(function(k){
    var s=setStat[k]; var c=s.err?'#A32D2D':'#15793F';
    return '<div style="color:'+c+'">'+(s.err?'✗':'✅')+' '+cpatchEsc(k)+' — '+s.ok+'/'+(s.ok+s.err)+'</div>';
  });
  head+='<div style="background:#F6F8FB;border:1px solid #E3E8EF;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:12.5px"><b>과목·회차별</b>'+setRows.join('')+'</div>';
  if(!okN && failSubs.length && !errRows.length){ rep.innerHTML='<span style="color:#A32D2D">⚠️ '+cpatchEsc(failSubs.join(' / '))+'. docId(cert__subject) 확인.</span>'; return; }
  rep.innerHTML=head+(errRows.length?('<div style="margin-top:4px"><b>오류 상세</b>'+errRows.slice(0,300).join('')+(errRows.length>300?('<div style="color:#A89C8E">…외 '+(errRows.length-300)+'건</div>'):'')+'</div>'):'');
  _cpatchShard={homes:allHomes}; _cpatchOk=okMap;
  if(okN>0){ if(btn){ btn.style.display=''; btn.textContent='검증 통과 '+okN+'문항 병합 저장'; } }
}
async function cpatchApply(){
  if(!_cpatchShard||!_cpatchOk){ return; }
  var keys=Object.keys(_cpatchOk); if(!keys.length) return;
  if(!confirm(keys.length+'개 문항에 해설·예시·띄어쓰기 패치를 병합 저장합니다. 계속할까요?\n\n※ 학생앱 배포는 저장 후 [기출 업로드] 탭의 version +1(또는 매니페스트 동기화)로 올려주세요.')) return;
  var sh=_cpatchShard, rep=document.getElementById('cpatchReport');
  var touched={};   // home docId → true
  keys.forEach(function(k){
    var it=_cpatchOk[k]; var rec=it&&it.rec; if(!rec||!rec.q) return;
    var q=rec.q;
    if(it.o!=null){ q.exp=q.exp||{}; q.exp.o=it.o; }
    if(it.ex!=null){ q.exp=q.exp||{}; q.exp.ex=it.ex; }
    if(it.q!=null){ q.q=it.q; }
    if(it.opts!=null){ q.opts=it.opts; }
    touched[rec.home]=true;
  });
  try{
    var docs=0, homeIds=Object.keys(touched);
    for(var i=0;i<homeIds.length;i++){
      var hid=homeIds[i], h=sh.homes[hid];
      if(!h) continue;
      if(h.coll==='variantq'){
        await db.collection('adaptive').doc(hid).set(Object.assign({}, h.data, {kind:'variantq', count:h.questions.length, questions:h.questions}));
      } else {
        await db.collection('banks').doc(hid).set(Object.assign({}, h.data, {questions:h.questions}));
      }
      docs++;
    }
    rep.innerHTML='<div style="color:#15793F;font-weight:700">✅ '+keys.length+'문항 병합 저장 완료 ('+docs+'개 문서).</div><div style="color:#A89C8E;font-size:12px;margin-top:4px">학생앱에 배포하려면 [기출 업로드] 탭의 version +1(또는 매니페스트 동기화)로 버전을 올리세요. 앱에서 Ctrl+Shift+R로 확인.</div>';
    document.getElementById('cpatchApplyBtn').style.display='none';
  }catch(e){ rep.innerHTML='<div style="color:#A32D2D">저장 실패: '+cpatchEsc(e.message)+'</div>'; }
}


// ===== 📈 그래프 마스터 (Firestore graphs CRUD · SVG 기본 + type/params 열어둠) =====
var _grpmAll={}, _grpmLoaded=false, _grpmImpData=null, _grpmImpBound=false;
function grpmEsc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
// SVG sanitize: <script>·on*=·javascript: 제거 (신뢰 입력이지만 안전하게)
function grpmSanitizeSvg(svg){
  var s=String(svg||'');
  if(s.indexOf('<svg')<0) return '';
  s=s.replace(/<script[\s\S]*?<\/script>/gi,'');
  s=s.replace(/\son\w+\s*=\s*"[^"]*"/gi,'').replace(/\son\w+\s*=\s*'[^']*'/gi,'');
  s=s.replace(/javascript:/gi,'');
  s=s.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi,'');
  return s;
}
// 그래프 1개 → 미리보기/표시 HTML
function grpmRender(g){
  if(g.svg && String(g.svg).indexOf('<svg')>=0){
    return '<div style="max-width:100%;overflow:auto">'+grpmSanitizeSvg(g.svg)+'</div>';
  }
  if(g.type){
    return '<div class="cpt-broken" style="background:#F4F6FB;border-color:#D6E2F5;color:#64748B">📈 파라미터형 type="'+grpmEsc(g.type)+'" — 렌더러 추후</div>';
  }
  return '<div style="color:#A89C8E;font-size:12px">svg 또는 type 입력 시 여기 떠요.</div>';
}
function grpmInit(){
  if(!_grpmLoaded) grpmLoad();
  if(!_grpmImpBound){ _grpmImpBound=true;
    var drop=document.getElementById('grpmImpDrop'), file=document.getElementById('grpmImpFile');
    if(drop) drop.onclick=function(){ file&&file.click(); };
    if(file) file.addEventListener('change', function(e){ grpmImpHandle(e.target.files); });
    if(drop){
      ['dragover','dragenter'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#7C3AED';}); });
      ['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#CBD5E1';}); });
      drop.addEventListener('drop', function(e){ grpmImpHandle(e.dataTransfer.files); });
    }
  }
}
async function grpmLoad(){
  var st=document.getElementById('grpmStatus'); if(st){ st.style.color='#7F77DD'; st.textContent='불러오는 중…'; }
  try{
    var snap=await db.collection('graphs').get();
    _grpmAll={}; snap.forEach(function(d){ _grpmAll[d.id]=d.data()||{}; });
    _grpmLoaded=true;
    if(st) st.textContent='등록 '+Object.keys(_grpmAll).length+'개';
    grpmRenderList();
  }catch(e){ if(st){ st.style.color='#A32D2D'; st.textContent='로드 실패: '+e.message; } }
}
function grpmRenderList(){
  var el=document.getElementById('grpmList'); if(!el) return;
  el.innerHTML=masterListHTML('grpm', _grpmAll, '등록된 그래프 없음. "+ 새 그래프"로 추가하세요.', function(id){
    var g=_grpmAll[id]||{};
    var kind=(g.svg&&String(g.svg).indexOf('<svg')>=0)?'SVG':(g.type?('type:'+g.type):'(빈)');
    return '<div style="border:1px solid #EEE;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff">'
      +'<div class="m-meta"><span class="m-meta-tag">🔒 식별용 · 사용자에게 안 보임</span>'
      +'<div class="m-name">'+grpmEsc(g.name||'(이름없음)')+' <span class="m-id">'+grpmEsc(id)+'</span> <span class="m-badge">'+grpmEsc(kind)+'</span></div>'
      +'<div class="m-meta-sub">'+((g.certs&&g.certs.length)?'시험 '+grpmEsc(g.certs.join(', '))+' · ':'')+'<span class="ref">grp://'+grpmEsc(id)+'</span></div></div>'
      +'<hr class="m-div"><div class="m-userlabel">👁 사용자에게 보이는 화면</div>'
      +'<div class="m-render">'+grpmRender(g)+'</div>'
      +'<div class="m-foot">'
      +mfUsageBtn('grp', id)
      +'<button class="btn-sm" onclick="grpmEdit(\''+id+'\')" style="background:#EDE9FE;color:#5B21B6">편집</button>'
      +'<button class="btn-sm" onclick="grpmDelete(\''+id+'\')" style="background:#FDE2E1;color:#A32D2D">삭제</button></div>'
      +'</div>';
  });
}
function grpmFill(g){
  document.getElementById('grpmIdField').value=g.id||'';
  document.getElementById('grpmNameField').value=g.name||'';
  document.getElementById('grpmSvgField').value=g.svg||'';
  document.getElementById('grpmTypeField').value=g.type||'';
  document.getElementById('grpmParamsField').value=g.params?JSON.stringify(g.params):'';
  document.getElementById('grpmKwField').value=(g.keywords||[]).join(', ');
  document.getElementById('grpmCertsField').value=(g.certs||[]).join(', ');
  document.getElementById('grpmNoteField').value=g.note||'';
  grpmPreview(); grpmValidateId();
}
function grpmNew(){ grpmFill({}); document.getElementById('grpmIdField').disabled=false; document.getElementById('grpmEditTi').textContent='새 그래프'; document.getElementById('grpmEditor').style.display=''; }
function grpmEdit(id){ grpmFill(Object.assign({id:id},_grpmAll[id]||{})); document.getElementById('grpmIdField').disabled=true; document.getElementById('grpmEditTi').textContent='그래프 편집: '+id; document.getElementById('grpmEditor').style.display=''; }
function grpmCancel(){ document.getElementById('grpmEditor').style.display='none'; }
function grpmValidateId(){
  var id=document.getElementById('grpmIdField').value.trim(); var w=document.getElementById('grpmIdWarn');
  if(!id){ if(w){w.style.color='#A32D2D';w.textContent='';} return false; }
  if(!/^grp_[a-z0-9_]+$/.test(id)){ if(w){w.style.color='#A32D2D';w.textContent='✗ grp_ + 영문소문자/숫자/_ 만 (예: grp_law_proposal_flow)';} return false; }
  if(w){ w.style.color='#15793F'; w.textContent='✓ 형식 OK'; } return true;
}
function grpmParse(){
  var err='';
  var svg=document.getElementById('grpmSvgField').value.trim();
  var type=document.getElementById('grpmTypeField').value.trim();
  var paramsRaw=document.getElementById('grpmParamsField').value.trim();
  var params=null; if(paramsRaw){ try{ params=JSON.parse(paramsRaw); }catch(e){ err='params JSON 오류'; } }
  return [{ svg:svg, type:type, params:params }, err];
}
function grpmPreview(){
  var p=grpmParse(), g=p[0], err=p[1];
  var box=document.getElementById('grpmPrev');
  if(err){ box.innerHTML='<div style="color:#A32D2D;font-size:12px">⚠️ '+err+'</div>'; return; }
  box.innerHTML=grpmRender(g);
}
async function grpmSave(){
  var id=document.getElementById('grpmIdField').value.trim();
  if(!grpmValidateId()){ alert('id 형식: grp_ + 영문 소문자/숫자/_ (예: grp_law_proposal_flow)'); return; }
  var p=grpmParse(), g=p[0], err=p[1];
  if(err){ alert(err); return; }
  if(!g.svg && !g.type){ alert('svg(다이어그램) 또는 type(곡선형) 중 하나는 입력하세요.'); return; }
  if(g.svg && g.svg.indexOf('<svg')<0){ alert('svg는 <svg…>로 시작해야 해요.'); return; }
  var csv=function(v){ return v.split(',').map(function(x){return x.trim();}).filter(Boolean); };
  var rec={ name:document.getElementById('grpmNameField').value.trim(),
    svg:g.svg||'', type:g.type||'', params:_grpParams(g.params),
    keywords:csv(document.getElementById('grpmKwField').value), certs:csv(document.getElementById('grpmCertsField').value),
    note:document.getElementById('grpmNoteField').value.trim(), updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
  try{ await db.collection('graphs').doc(id).set(rec); _grpmAll[id]=_cacheRec(rec); grpmRenderList();
    var st=document.getElementById('grpmStatus'); if(st){ st.style.color='#15793F'; st.textContent='저장됨: '+id+' (총 '+Object.keys(_grpmAll).length+'개)'; }
    grpmCancel();
  }catch(e){ alert('저장 실패: '+e.message); }
}
async function grpmDelete(id){
  if(!confirm(id+' 그래프를 삭제할까요?')) return;
  try{ await db.collection('graphs').doc(id).delete(); delete _grpmAll[id]; grpmRenderList();
    var st=document.getElementById('grpmStatus'); if(st){ st.style.color='#A32D2D'; st.textContent='삭제됨: '+id+' (총 '+Object.keys(_grpmAll).length+'개)'; }
  }catch(e){ alert('삭제 실패: '+e.message); }
}
async function grpmExport(){
  if(!Object.keys(_grpmAll).length){ try{ var _s=await db.collection('graphs').get(); _grpmAll={}; _s.forEach(function(d){ _grpmAll[d.id]=d.data()||{}; }); }catch(e){ alert('로드 실패: '+e.message); return; } }
  var ids=Object.keys(_grpmAll);
  if(_mexpScope) ids=ids.filter(function(id){ return _mexpKeep(id,_grpmAll[id]); });
  if(!ids.length){ alert('등록된 그래프가 없어요.'); return; }
  var _xnow=_kstISO(new Date());
  var arr=ids.map(function(id){ var r=Object.assign({id:id}, _grpmAll[id]); r.updatedAt=_uaISO(r.updatedAt, new Date()); return r; });
  if(!_qcMasterExportGate('그래프', arr, (QC&&QC.graphAudit))) return;   // ← 내보내기 검수 게이트(GRP_SVG_MALFORMED·GRP_FONT 등)
  var bundle={ _meta:{ generatedAt:_xnow }, graphs:arr, exportedAt:_xnow, count:arr.length };
  var blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob); var a=document.createElement('a');
  a.href=url; a.download='certlab_graphs'+_mexpSuffix()+'_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  var st=document.getElementById('grpmStatus'); if(st){ st.style.color='#15793F'; st.textContent='✅ 백업 '+arr.length+'개 다운로드'; }
}
function grpmImpHandle(fileList){
  var f=[].slice.call(fileList).find(function(x){ return /\.json$/i.test(x.name)||x.type==='application/json'; });
  var stt=document.getElementById('grpmImpStatus');
  if(!f){ if(stt){stt.style.color='#A32D2D';stt.textContent='JSON 파일이 아니에요.';} return; }
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var o=JSON.parse(rd.result);
      var arr=Array.isArray(o)?o:(o.graphs||o.grp_new||[]);
      var valid=arr.filter(function(x){ return x&&x.id&&(x.svg||x.type); });
      if(!valid.length){ if(stt){stt.style.color='#A32D2D';stt.textContent='graphs 항목 없음 (id + svg/type 필요)';} return; }
      if(!_impDateGate('그래프', o, valid, 'id', true)) return;
      _grpmImpData=valid;
      if(stt){ stt.style.color='#475569'; stt.innerHTML='인식: 그래프 <b>'+valid.length+'</b>개 — 올리는 중…'; }
      grpmImport().catch(function(e){ _impFail('grpmImpStatus',e); });
    }catch(e){ if(stt){stt.style.color='#A32D2D';stt.textContent='파싱 오류: '+e.message;} }
  };
  rd.readAsText(f);
}
async function grpmImport(){
  if(!_grpmImpData||!_grpmImpData.length) return;
  var _ex=await _loadExistingByIds('graphs', _grpmImpData.map(function(x){return String(x.id);}));
  if(!_impPreviewConfirm('그래프 '+_grpmImpData.length+'개 적재', _ex, _grpmImpData, 'id', ['svg','certs','keywords'], /^grp_[a-z0-9_]+$/)) return;
  var ok=0, fail=0;
  var _ops=[];
  for(var i=0;i<_grpmImpData.length;i++){
    var it=_grpmImpData[i]; var id=String(it.id);
    if(!/^grp_[a-z0-9_]+$/.test(id)){ fail++; continue; }
    var rec={ name:it.name||'', svg:it.svg||'', type:it.type||'', params:_grpParams(it.params),
      keywords:Array.isArray(it.keywords)?it.keywords:[], certs:Array.isArray(it.certs)?it.certs:[],
      note:it.note||'', updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
    _impPreserve(rec, it, _ex[id], ['name','note','certs','keywords','svg','type','params']);
    (function(_id,_rec){ _ops.push({ref:db.collection('graphs').doc(_id), data:_rec, after:function(){ _grpmAll[_id]=_cacheRec(_rec); }}); })(id,rec);
  }
  var _r=await _qbWrite(_ops, function(n,t){var _s=document.getElementById('grpmImpStatus'); if(_s){_s.style.color='#475569';_s.innerHTML='처리 중… <b>'+n+'</b>/'+t;}}); ok+=_r.ok; fail+=_r.fail;
  var stt=document.getElementById('grpmImpStatus'); if(stt){ stt.style.color='#15793F'; stt.innerHTML='✅ 올림: 성공 <b>'+ok+'</b>개'+(fail?(' · 실패 '+fail+'개'+((typeof _r!=='undefined'&&_r&&_r.err)?(' — '+_r.err):'')):'')+'.'; }
  grpmRenderList();
}


