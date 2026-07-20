// ===== 이미지 업로드 (리사이즈/압축 → images/{키}) =====
let iuItems=[]; let _iuInited=false;
function iuLog(msg,color){ const el=document.getElementById('iuLog'); if(!el) return; const t=new Date().toLocaleTimeString('ko-KR'); const line=color?('<span style="color:'+color+'">'+msg+'</span>'):msg; el.innerHTML += (el.innerHTML && el.innerHTML!=='대기 중…'?'\n':'')+'['+t+'] '+line; el.scrollTop=el.scrollHeight; }
function iuInit(){
  if(_iuInited) return; _iuInited=true;
  const drop=document.getElementById('iuDrop'), file=document.getElementById('iuFile'); if(!drop||!file) return;
  drop.onclick=()=>file.click();
  ['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor='#185FA5';}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor='#D9CFC4';}));
  drop.addEventListener('drop',e=>iuHandle(e.dataTransfer.files));
  file.addEventListener('change',e=>iuHandle(e.target.files));
}
function iuResize(file, maxW){
  return new Promise((res,rej)=>{
    const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=()=>{
      let w=img.width, h=img.height;
      if(w>maxW){ h=Math.round(h*maxW/w); w=maxW; }
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      // 흑백 도판/사진 모두 무난한 jpeg 0.82 (그래프·선명도 필요시 png로) — 우선 jpeg로 용량 최소화
      let out=c.toDataURL('image/jpeg',0.82);
      // 너무 크면 더 줄임
      res(out);
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error('이미지 디코드 실패')); };
    img.src=url;
  });
}
async function iuHandle(fileList){
  const files=[...fileList];
  if(!files.length){ iuLog('파일이 없습니다.','#f85149'); return; }
  for(const f of files){
    const isJson=/\.json$/i.test(f.name)||/json/i.test(f.type||'');
    if(isJson){
      // 이미지 내보내기 번들 { images:[{key,data}] } → 안의 이미지를 개별 복원
      let parsed=null; try{ parsed=JSON.parse(await f.text()); }catch(_){ parsed=null; }
      const arr = parsed && (Array.isArray(parsed.images)?parsed.images : (Array.isArray(parsed)&&parsed[0]&&parsed[0].key?parsed:null));
      if(arr && arr.length){
        let n=0;
        for(const im of arr){ if(!im||!im.key||!im.data) continue;
          const bytes=Math.round(String(im.data).length*0.75); let status='ready', err='';
          if(bytes>900000){ status='bad'; err='0.9MB 초과'; }
          iuItems=iuItems.filter(it=>it.key!==im.key);
          iuItems.push({name:f.name+' → '+im.key, key:im.key, data:im.data, bytes, status, err, isImg:/^data:image\//.test(im.data||'')});
          n++;
        }
        iuLog(f.name+': 이미지 번들 인식 — '+n+'개 이미지 복원 대기','#15793F');
        continue;   // 번들 처리 끝 — 원본 저장 안 함
      }
      iuLog(f.name+': 이미지 번들 형식이 아니라 원본 파일로 저장합니다.','#B4531E');   // images 배열 없음 → 아래에서 원본 그대로 저장
    }
    const key=f.name.replace(/\.[^.]+$/,'').trim();
    if(!key){ iuLog(f.name+': 키 추출 실패','#f85149'); continue; }
    const isImg=/^image\//.test(f.type)||/\.(png|jpe?g|gif|webp)$/i.test(f.name);
    let data='', status='ready', err='';
    try{
      if(isImg){ data=await iuResize(f,1000); }        // 이미지: 1000px JPEG로 리사이즈
      else { data=await iuReadRaw(f); }                // 그 외: 원본 그대로
    }catch(e){ status='bad'; err=e.message; }
    const bytes=data?Math.round(data.length*0.75):0;
    if(data && bytes>900000){ status='bad'; err='0.9MB 초과 (파일을 더 작게 나눠주세요)'; }
    iuItems=iuItems.filter(it=>it.key!==key);
    iuItems.push({name:f.name, key, data, bytes, status, err, isImg:isImg});
    if(err) iuLog(f.name+': '+err,'#f85149');
  }
  iuRender(); document.getElementById('iuRun').disabled=!iuItems.some(it=>it.status==='ready');
}
function iuReadRaw(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(new Error('파일 읽기 실패')); r.readAsDataURL(file); }); }
function iuRender(){
  const tbl=document.getElementById('iuTbl'); const tb=tbl.querySelector('tbody');
  tbl.style.display=iuItems.length?'table':'none';
  tb.innerHTML=iuItems.map(it=>{
    const st=it.status==='bad'?('오류: '+it.err):it.status==='done'?'완료':'준비됨';
    const col=it.status==='bad'?'#f85149':it.status==='done'?'#15793F':'#185FA5';
    const kb=it.bytes?(Math.round(it.bytes/1024)+'KB'):'-';
    const prev=it.data?(it.isImg?('<img src="'+it.data+'" style="width:54px;height:54px;object-fit:cover;border-radius:6px;border:1px solid #E5E7EB">'):('<span style="display:inline-flex;width:54px;height:54px;align-items:center;justify-content:center;background:#F1EFFB;color:#7F77DD;border-radius:6px;font-size:10px;font-weight:700">'+((it.name.split('.').pop()||'FILE').toUpperCase().slice(0,5))+'</span>')):'-';
    const refLbl=it.isImg?('img://'+it.key):('키 '+it.key);
    return '<tr style="border-bottom:1px solid #EFE9E2">'
      +'<td style="padding:7px 10px">'+prev+'</td>'
      +'<td style="padding:7px 10px"><b>'+it.key+'</b></td>'
      +'<td style="padding:7px 10px;color:#5B50C0">'+refLbl+'</td>'
      +'<td style="padding:7px 10px;text-align:right">'+kb+'</td>'
      +'<td style="padding:7px 10px;color:'+col+'">'+st+'</td></tr>';
  }).join('');
}
async function iuUpload(){
  const ready=iuItems.filter(it=>it.status==='ready');
  if(!ready.length) return;
  if(!confirm(ready.length+'개 이미지를 업로드합니다. 계속할까요?')){ iuLog('취소됨.'); return; }
  document.getElementById('iuRun').disabled=true;
  for(const it of ready){
    try{
      await db.collection('images').doc(it.key).set({ data:it.data, at:firebase.firestore.FieldValue.serverTimestamp() });
      it.status='done';
      iuLog('✓ '+it.key+' 업로드 완료 ('+Math.round(it.bytes/1024)+'KB) → img://'+it.key,'#15793F');
    }catch(e){ it.status='bad'; it.err='업로드 실패: '+(e.message||e); iuLog('✗ '+it.key+' 실패: '+(e.message||e),'#f85149'); }
    iuRender();
  }
  iuLog('— 작업 종료 — 문항 JSON에 img://키 로 연결하세요.','#5B50C0');
}
let impItems=[]; let _impInited=false; let impBundleManifest=null;
function impLog(msg,color){ const el=document.getElementById('impLog'); if(!el) return; const t=new Date().toLocaleTimeString('ko-KR'); const line=color?('<span style="color:'+color+'">'+msg+'</span>'):msg; el.innerHTML += (el.innerHTML && el.innerHTML!=='대기 중…'?'\n':'')+'['+t+'] '+line; el.scrollTop=el.scrollHeight; }
function impInit(){
  if(_impInited) return; _impInited=true;
  // version +1 대상 자격증 드롭다운 채우기
  (async()=>{
    try{
      const m=await db.collection('manifest').doc('exams').get();
      const exams=(m.exists&&m.data().exams)||[];
      const sel=document.getElementById('bumpCert');
      if(sel) sel.innerHTML='<option value="">자격증 선택...</option>'+exams.map(e=>'<option value="'+e.id+'">'+(e.name||e.id)+'</option>').join('');
    }catch(_){}
  })();
  const drop=document.getElementById('impDrop'), file=document.getElementById('impFile');
  if(!drop||!file) return;
  drop.onclick=()=>file.click();
  ['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor='#185FA5';}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor='#D9CFC4';}));
  drop.addEventListener('drop',e=>impHandleFiles(e.dataTransfer.files));
  file.addEventListener('change',e=>impHandleFiles(e.target.files));
  const bump=document.getElementById('impBump'); if(bump) bump.addEventListener('change',impRender);
}
async function impHandleFiles(fileList){
  const files=[...fileList].filter(f=>/\.json$/i.test(f.name));
  if(!files.length){ impLog('JSON 파일이 없습니다.','#f85149'); return; }
  for(const f of files){
    let parsed=null;
    try{ parsed=JSON.parse(await f.text()); }catch(e){ impLog(f.name+': JSON 파싱 실패','#f85149'); continue; }
    // 기출(banks)이 아닌 파일 차단 — 종류 감지해서 올바른 탭으로 안내
    var _wrong='';
    if(parsed && typeof parsed==='object'){
      var _mk=(parsed&&parsed._meta&&String(parsed._meta.kind||''))||'';
      var _pe=Array.isArray(parsed)?parsed[0]:(Array.isArray(parsed.edits)?parsed.edits[0]:(Array.isArray(parsed.patch)?parsed.patch[0]:null));
      if(_pe && _pe.docId && _pe.id && (_pe.o!=null||_pe.ex!=null||_pe.q!=null||_pe.opts!=null) && !Array.isArray(_pe.questions)) _wrong='콘텐츠 패치 → 🩹 콘텐츠 패치 탭';
      else if(/ottag/i.test(_mk) || (Array.isArray(parsed.subjects) && parsed.subjects[0] && parsed.subjects[0].ot)) _wrong='OX진술 태그 → 🏷️ OX진술 태그 탭';
      else if(/levelup|adaptive/i.test(_mk) || Array.isArray(parsed.mapping)||Array.isArray(parsed.variants)||Array.isArray(parsed.diagnostic)||Array.isArray(parsed.topics)||Array.isArray(parsed.subjects)) _wrong='레벨업 데이터 → ⚡ 레벨업 업로드 탭';
      else if(parsed.ot && typeof parsed.ot==='object' && !Array.isArray(parsed.questions)) _wrong='OX진술 태그 → 🏷️ OX진술 태그 탭';
      else if(parsed.concepts || parsed.cpt_new) _wrong='개념 마스터 → 📖 개념 마스터 탭';
      else if(parsed.mnemonics) _wrong='암기코드 마스터 → 📑 암기코드 마스터 탭';
      else if(parsed.tables || parsed.tbl_new) _wrong='표 마스터 → 📊 표 마스터 탭';
      else if(parsed.graphs || parsed.grp_new) _wrong='그래프 마스터 → 📈 그래프 마스터 탭';
      else if(parsed.interactives) _wrong='인터랙티브 마스터 → 🎛 인터랙티브 마스터 탭';
    }
    if(_wrong){ impLog(f.name+': ⚠️ 기출 파일이 아닙니다('+_wrong+'). 기출 업로드엔 적재하지 않습니다.','#f85149'); continue; }
    // (가) 통합 번들: {banks:[{docId,data}]}
    if(parsed && Array.isArray(parsed.banks)){
      var _bdate=(parsed._meta&&parsed._meta.generatedAt)||parsed.generatedAt||parsed.exportedAt||null;   // 번들 최상위 날짜
      parsed.banks.forEach(b=>{
        const docId=b.docId||''; const data=b.data||{};
        if(_bdate && _impFileDate(data)==null){ data._meta=data._meta||{}; if(!data._meta.generatedAt) data._meta.generatedAt=_bdate; }   // 번들 날짜를 bank로 전파(게이트 인식)
        const [cert,subject]=docId.split('__');
        if(!docId||!cert||!subject){ impLog('번들 내 잘못된 docId: '+docId,'#f85149'); return; }
        const count=Array.isArray(data.questions)?data.questions.length:-1;
        impItems=impItems.filter(it=>it.docId!==docId);
        impItems.push({docId,cert,subject,data,count,version:data.version,curVer:'?',status:count<0?'bad':'ready',err:count<0?'questions 배열 아님':''});
      });
      impLog(f.name+': 번들 '+parsed.banks.length+'개 문서 인식');
      if(parsed.manifest && Array.isArray(parsed.manifest.exams)){ impBundleManifest=parsed.manifest; impLog(f.name+': manifest 인식 ('+parsed.manifest.exams.length+'개 시험) — "매니페스트 등록(새 시험)"으로 추가 가능','#5B50C0'); }
    }
    // 과목별 파일: {cert,subject,...,questions:[]}
    else if(parsed && parsed.cert && parsed.subject){
      const docId=parsed.cert+'__'+parsed.subject;
      const count=Array.isArray(parsed.questions)?parsed.questions.length:-1;
      impItems=impItems.filter(it=>it.docId!==docId);
      impItems.push({docId,cert:parsed.cert,subject:parsed.subject,data:parsed,count,version:parsed.version,curVer:'?',status:count<0?'bad':'ready',err:count<0?'questions 배열 아님':''});
    }
    // 독립 manifest 파일: {manifest:{exams:[...]}} (banks 없이 단독)
    else if(parsed && parsed.manifest && Array.isArray(parsed.manifest.exams)){
      impBundleManifest=parsed.manifest;
      impLog(f.name+': manifest 인식 ('+parsed.manifest.exams.length+'개 시험) — "매니페스트 등록(새 시험)"으로 추가 가능','#5B50C0');
    }
    else { impLog(f.name+': 형식 불명 (번들도 과목파일도 아님)','#f85149'); }
  }
  await impLoadVersions(); impRender(); document.getElementById('impRun').disabled=!impItems.some(it=>it.status==='ready');
}
async function impLoadVersions(){
  await _loadSubjNames();
  for(const it of impItems){ if(!it.docId) continue; try{ const snap=await db.collection('banks').doc(it.docId).get(); var _sd=snap.exists?snap.data():null; it.curVer=snap.exists?(_sd.version??'(없음)'):'(신규)'; it.curCount=_sd&&Array.isArray(_sd.questions)?_sd.questions.length:(snap.exists?null:0); }catch(e){ it.curVer='읽기실패'; it.curCount=null; } }
}
function impNewVer(it){
  if(it.status==='bad') return '-';
  const bump=document.getElementById('impBump'); if(bump && !bump.checked) return it.version;
  const base=(typeof it.curVer==='number')?it.curVer:(typeof it.version==='number'?it.version:0);
  return base+1;
}
function impRender(){
  const tbl=document.getElementById('impTbl'); const tb=tbl.querySelector('tbody');
  tbl.style.display=impItems.length?'table':'none';
  tb.innerHTML=impItems.map(it=>{
    const st=it.status==='bad'?('오류: '+it.err):it.status==='done'?'완료':'준비됨';
    const col=it.status==='bad'?'#f85149':it.status==='done'?'#15793F':'#185FA5';
    return '<tr style="border-bottom:1px solid #EFE9E2">'
      +'<td style="padding:7px 10px">'+(it.docId||'-')+'</td>'
      +'<td style="padding:7px 10px">'+(it.cert?csKo(it.cert,it.subject):'-')+'</td>'
      +'<td style="padding:7px 10px;text-align:right;color:#8A7E70">'+it.curVer+'</td>'
      +'<td style="padding:7px 10px;text-align:right;color:#15793F;font-weight:600">'+impNewVer(it)+'</td>'
      +'<td style="padding:7px 10px;text-align:right">'+(it.count>=0?it.count:'-')+'</td>'
      +'<td style="padding:7px 10px;color:'+col+'">'+st+'</td></tr>';
  }).join('');
  try{ qcRefreshBtn(); }catch(_){}
}
async function impRefresh(){ await impLoadVersions(); impRender(); impLog('현재 버전 새로고침 완료'); }
function impClear(){ impItems=[]; impBundleManifest=null; var lg=document.getElementById('impLog'); if(lg) lg.innerHTML='대기 중…'; try{ impRender(); }catch(_){} var r=document.getElementById('impRun'); if(r) r.disabled=true; }
/* 마스터(암기/표/개념/그래프/인터랙티브) 로드 데이터·상태 비우기 — 기출 impClear의 마스터판 */
function mstImpClear(type){
  try{
    if(type==='mnem'){ _mnemImpData=null; }
    else if(type==='tbl'){ _tblmImpData=null; }
    else if(type==='cpt'){ _cptmImpData=null; if(typeof _cptmImpDelete!=='undefined') _cptmImpDelete=null; }
    else if(type==='grp'){ _grpmImpData=null; }
    else if(type==='itv'){ _itvmImpData=null; }
  }catch(e){}
  var sid={mnem:'mnemImpStatus',tbl:'tblmImpStatus',cpt:'cptmImpStatus',grp:'grpmImpStatus',itv:'itvmImpStatus'}[type];
  var stt=document.getElementById(sid); if(stt){ stt.style.color=''; stt.innerHTML='🗑 목록·로그를 비웠습니다.'; }
  var fid={mnem:'mnemImpFile',tbl:'tblmImpFile',cpt:'cptmImpFile',grp:'grpmImpFile',itv:'itvmImpFile'}[type];
  var fl=document.getElementById(fid); if(fl) fl.value='';
}
// ===== 업로드 후 자동: (A) 번들 manifest의 새 시험·과목 등록(비파괴) + (B) 업로드 cert의 버전 동기화 =====
async function _impAutoManifest(uploadedCerts){
  try{
    const mSnap=await db.collection('manifest').doc('exams').get();
    let exams=(mSnap.exists && Array.isArray(mSnap.data().exams))?mSnap.data().exams.slice():[];
    const byId=new Map(exams.map(e=>[e&&e.id,e]));
    let regNew=0, regSubj=0, synced=0;
    // (A) 번들에 manifest 블록이 있으면 신규 시험·과목만 병합(기존 무수정)
    if(impBundleManifest && Array.isArray(impBundleManifest.exams)){
      for(const e of impBundleManifest.exams){
        if(!e||!e.id) continue;
        const exist=byId.get(e.id);
        if(!exist){ exams.push(e); byId.set(e.id,e); regNew++; continue; }
        exist.subjects=Array.isArray(exist.subjects)?exist.subjects:[];
        exist.versions=exist.versions||{};
        const have=new Set(exist.subjects.map(s=>s&&s.code));
        for(const s of (e.subjects||[])){
          if(!s||!s.code||have.has(s.code)) continue;
          let bv=(e.versions&&typeof e.versions[s.code]==='number')?e.versions[s.code]:1;
          try{ const bd=await db.collection('banks').doc(e.id+'__'+s.code).get(); if(bd.exists&&typeof bd.data().version==='number') bv=bd.data().version; }catch(_){}
          exist.subjects.push({code:s.code,name:s.name||s.code}); exist.versions[s.code]=bv; regSubj++;
        }
      }
    }
    // (B) 방금 업로드한 cert들의 manifest version을 bank version과 동기화
    const certs=new Set(uploadedCerts||[]);
    for(const ex of exams){
      if(!ex||!ex.id) continue;
      if(certs.size && !certs.has(ex.id)) continue;
      ex.versions=ex.versions||{};
      for(const sub of (ex.subjects||[])){
        try{
          const bd=await db.collection('banks').doc(ex.id+'__'+sub.code).get();
          if(!bd.exists) continue;
          const bv=bd.data().version;
          if(typeof bv==='number' && ex.versions[sub.code]!==bv){ ex.versions[sub.code]=bv; synced++; }
        }catch(_){}
      }
    }
    if(regNew||regSubj||synced){
      if(mSnap.exists) await db.collection('manifest').doc('exams').update({exams});
      else await db.collection('manifest').doc('exams').set({exams});
      impLog('✓ manifest 자동 반영 — 새 시험 '+regNew+' · 새 과목 '+regSubj+' · 버전 동기화 '+synced+'건','#15793F');
    } else {
      impLog('· manifest 변경 없음(이미 최신)','#8A7D6E');
    }
  }catch(e){ impLog('⚠️ manifest 자동 반영 실패: '+(e.message||e)+' — 필요하면 수동 "🔄 버전 동기화" 클릭','#f85149'); }
}
// ===== 품질 게이트 (기출 업로드 전 전수 검사) =====
// BLOCK(구조): 종결어 없음(O/X 배지 안 뜸)·cx 빈칸·em대시·카드<2 → 업로드 차단
// WARN(품질): ex 명명 인물 없음·ex가 o 되풀이(유사도≥0.6) → 확인 후 우회 가능
/* ===== CertLab 검수 게이트 코어 (admin·preview 공용 · 기계판정 조항만) =====
   V2 규칙 매핑:
     EMDASH   = 대시 규칙(em대시 — 금지, 전 필드)            [05-mn §6·전역]
     VERDICT  = 정오 종결형 옳다./옳지 않다.                  [03-explanation §A-8]
     CX_EMPTY = 개념카드 cx 필수(예시 100%)                   [01-common §1-5·표준규칙]
     CARD_LT2 = MCQ 개념카드 2장 이상                          [표준규칙 ⑥]
     EX_NONAME= 예시가 '장면'(행위동사)인데 명명 인물 없음     [04-concept §A-7 검출기]
     EX_ECHO  = 예시(ex)가 해설(o) 되풀이(종결어 제거 후 비교) [03 §베끼기·04 §C]
   판단 필요 조항(사유→원리 순서·시험형 예시·대비 자리·핵심 함정)은 게이트 밖(사람 검수).
*/
  /* [qc-core.js로 이관] 검수 코어(_qg*·_qcOn/_qcN·_isCalcQ·_qcViolations·qualityGate·_QC_DEFAULTS)는 외부 qc-core.js에 있음. 로더·qcRefreshBtn만 호스트 잔류. */
// 이미지 라이브러리 키 집합(IMG_MISSING 검사용) — 지적서/업로드 게이트 직전에 1회 로드
var _qcImgKeys=null;
async function _qcLoadImgKeys(){
  if(_qcImgKeys) return _qcImgKeys;
  try{ var snap=await db.collection('images').get(); var s=new Set(); snap.forEach(function(d){ s.add(d.id); }); _qcImgKeys=s; }catch(e){ _qcImgKeys=null; }
  return _qcImgKeys;
}
// exp.cpt(참조 개념) 카드 검수용 — concepts 마스터 id → cards[] 맵 (실패 시 null: cpt 링크 문항의 카드 검사만 생략)
var _qcCptCards=null;
async function _qcLoadCptCards(){
  if(_qcCptCards) return _qcCptCards;
  try{ var snap=await db.collection('concepts').get(); var m={}; snap.forEach(function(d){ var r=d.data()||{}; m[d.id]=Array.isArray(r.cards)?r.cards:[]; }); _qcCptCards=m; }catch(e){ _qcCptCards=null; }
  return _qcCptCards;
}

/* 한 문항의 위반 목록(구조화). kind=block(차단)/warn(경고). */

// ===== 검수 지적서 (게이트 위반 + 크리스 지적 → 데이터방 전달) =====
function qcRefreshBtn(){
  var el=document.getElementById('qcBtnCount'); if(!el) return;
  var items=(typeof impItems!=='undefined'?impItems:[]).filter(function(it){return it&&it.data;});
  if(!items.length){ el.textContent=''; return; }
  var b=0,w=0; items.forEach(function(it){ var g=qualityGate((it.data&&it.data.questions)||[]); b+=g.block.length; w+=g.warn.length; });
  el.textContent=' · ⛔'+b+' ⚠'+w;
}

function qcCfgExport(section){
  db.collection('config').doc('qc').get().then(function(d){
    var saved=(d&&d.exists&&d.data()&&d.data()[section])||{};
    var merged=Object.assign({}, _QC_DEFAULTS[section]||{}); for(var k in saved) merged[k]=saved[k];
    var out={kind:'qc_config',section:section}; for(var k2 in merged) out[k2]=merged[k2];
    var blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json;charset=utf-8'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='qc_config_'+section+'.json'; document.body.appendChild(a); a.click(); a.remove();
  }).catch(function(e){ alert('내보내기 실패: '+e.message); });
}
function qcCfgUpload(section){
  var inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
  inp.onchange=function(){ var f=inp.files&&inp.files[0]; if(!f) return;
    var rd=new FileReader();
    rd.onload=function(){ try{
      var o=JSON.parse(rd.result);
      var cfg=(o&&typeof o[section]==='object')?o[section]:o;
      var clean={}; for(var k in cfg){ if(k!=='kind'&&k!=='section'&&k!=='_meta'&&typeof cfg[k]==='object') clean[k]=cfg[k]; }
      if(!Object.keys(clean).length){ alert('인식된 규칙 없음. 형식: {"EX_SHORT":{"on":true,"minLines":4}, ...}'); return; }
      var payload={}; payload[section]=clean;
      db.collection('config').doc('qc').set(payload,{merge:true}).then(function(){
        alert('✅ 검수조건 저장 — ['+section+'] 규칙 '+Object.keys(clean).length+'개. 다음 검수부터 적용됩니다.');
      }).catch(function(e){ alert('저장 실패: '+e.message); });
    }catch(e){ alert('파싱 오류: '+e.message); } };
    rd.readAsText(f);
  };
  inp.click();
}
/* 검수 번들 전달: 같은 출처 opener 메모리로 넘겨 localStorage 5MB 한도를 우회.
   localStorage는 하위호환 폴백(초과해도 조용히 무시 — opener 경로가 커버). */
function liveqcFillSub(){
  var cert=document.getElementById('liveqcCert'), sub=document.getElementById('liveqcSub'); if(!cert||!sub) return;
  if(cert.value==='__all'){ sub.innerHTML='<option value="__all">\uC804\uCCB4 \uACFC\uBAA9</option>'; sub.disabled=true; return; }
  sub.disabled=false;
  var ex=(_expExams||[]).find(function(e){return e.id===cert.value;}); var subs=(ex&&ex.subjects)||[];
  sub.innerHTML='<option value="__all">\uC804\uCCB4 \uACFC\uBAA9</option>'+subs.map(function(s){return '<option value="'+s.code+'">'+(s.name||s.code)+'</option>';}).join('');
}
async function liveqcInit(){
  try{ if(!_expExams){ var m=await db.collection('manifest').doc('exams').get(); _expExams=(m.exists&&m.data().exams)||[]; } }catch(e){ _expExams=_expExams||[]; }
  var c=document.getElementById('liveqcCert'); if(c&&c.options.length<=1){ c.innerHTML='<option value="__all">\uC804\uCCB4 (\uBAA8\uB4E0 \uC2DC\uD5D8)</option>'+(_expExams||[]).map(function(e){return '<option value="'+e.id+'">'+(e.name||e.id)+'</option>';}).join(''); } liveqcFillSub();
}
// 범위별 라이브 문항 읽기 — kind='gichul'(banks) / 'lvup'(adaptive) → [{docId,data:{questions}}]
async function _liveReadItems(kind, cert, sub){
  var items=[];
  if(kind==='lvup'){
    var groups=await lvupReadGroups();
    Object.keys(groups).forEach(function(k){ var g=groups[k]; var c=(g._meta&&g._meta.cert)||'', s=(g._meta&&g._meta.subject)||'';
      if(cert!=='__all'&&c!==cert) return; if(cert!=='__all'&&sub!=='__all'&&s!==sub) return;
      items.push({docId:c+'__'+s, data:{cert:c,subject:s,name:csKo(c,s),questions:(g.questions||[])}}); });
    return items;
  }
  var m=await db.collection('manifest').doc('exams').get();
  var exams=(m.exists&&m.data().exams)||[];
  var target=(cert&&cert!=='__all')?exams.filter(function(e){return e.id===cert;}):exams;
  for(var i=0;i<target.length;i++){ var e=target[i];
    for(var j=0;j<(e.subjects||[]).length;j++){ var scode=e.subjects[j].code;
      if(cert!=='__all'&&sub!=='__all'&&scode!==sub) continue;
      var docId=e.id+'__'+scode;
      try{ var bd=await db.collection('banks').doc(docId).get(); if(bd.exists){ var data=bd.data();
        if(Array.isArray(data.shards)&&data.shards.length){ var qs=[]; for(var k=0;k<data.shards.length;k++){ var sd=await db.collection('banks').doc(docId+'__'+data.shards[k]).get(); if(sd.exists&&Array.isArray(sd.data().questions)) qs=qs.concat(sd.data().questions); } data=Object.assign({},data,{questions:qs}); }
        items.push({docId:docId, data:data}); } }catch(_){}
    }
  }
  return items;
}
// 라이브 통합 검수(시각) — 범위 데이터 읽어 통합 검수 창 열기
async function qcLiveAudit(kind, cert, sub, statusId, badgeId){
  kind=kind||'gichul'; cert=cert||'__all'; sub=sub||'__all';
  var st=document.getElementById(statusId);
  function stx(t,c){ if(st){ st.style.color=c||'#475569'; st.textContent=t; } }
  stx('읽는 중… ' + (kind==='lvup'?'레벨업':'기출'));
  try{
    var bundle={ _meta:{kind:'qc',generatedAt:new Date().toISOString(),source:'live'}, kind:'unified' };
    var items=await _liveReadItems(kind, cert, sub);
    if(kind==='lvup'){ if(items.length) bundle.lvup=items; } else { if(items.length) bundle.banks=items; }
    if(badgeId){ var _b=0,_w=0; items.forEach(function(it){ var g=qualityGate((it.data&&it.data.questions)||[]); _b+=g.block.length; _w+=g.warn.length; }); _qcSetBadge(badgeId,_b,_w); }
    if(cert!=='__all'){ stx('읽는 중… 마스터'); _mexpScope={cert:cert, sub:sub};
      try{ var cols=[['concepts','concepts'],['mnemonics','mnem'],['tables','table'],['graphs','graph'],['interactives','interactive']];
        for(var ci=0;ci<cols.length;ci++){ var col=cols[ci][0], key=cols[ci][1];
          try{ var snap=await db.collection(col).get(); var arr=[]; snap.forEach(function(d){ var rec=Object.assign({id:d.id}, d.data()||{}); if(_mexpKeep(d.id, rec)) arr.push(rec); }); if(arr.length) bundle[key]=arr; }catch(_){} }
      } finally { _mexpScope=null; }
    }
    var nQ=items.reduce(function(n,b){return n+((b.data&&b.data.questions||[]).length);},0);
    if(!items.length && !bundle.concepts){ stx('해당 범위에 데이터가 없습니다.','#A32D2D'); return; }
    _qcStash(bundle);
    if(st){ st.style.color='#15793F'; st.innerHTML='✅ 읽기 완료 — 문항 <b>'+nQ+'</b>개. 통합 검수 창을 엽니다…'; }
    window.open('preview.html?qc=1','_blank');
  }catch(e){ stx('오류: '+e.message,'#A32D2D'); }
}
// 지적서 라인 조립(일반+마스터) — items=[{docId,data:{questions}}]
/* ── 델타검수 베이스라인 (qcBaseline JSON 로드 → 새 위반만 표시) ──
   베이스라인 형태: { 문항id: [위반코드,...] } (admin/node의 qcBaseline() 산출물).
   여러 과목 파일을 합쳐 전역 map에 병합(문항 id는 과목 간 충돌 없음). */
var _qcBaselines = (typeof _qcBaselines!=='undefined') ? _qcBaselines : {};
function _qcBaselineCount(){ return Object.keys(_qcBaselines).length; }
function _qcBaselineStatShow(){ var el=document.getElementById('qcBaselineStat'); if(el) el.textContent = _qcBaselineCount()? (' ('+_qcBaselineCount()+')') : ''; }
function qcBaselineClear(){ _qcBaselines={}; _qcBaselineStatShow(); }
function qcBaselinePick(){
  if(_qcBaselineCount()>0){
    if(!confirm('베이스라인 '+_qcBaselineCount()+'개 문항 로드됨 (델타검수 ON).\n\n[확인] 파일 더 추가    /    [취소] 해제하고 전체검수로 복귀')){ qcBaselineClear(); alert('베이스라인 해제 — 전체 위반 표시로 복귀'); return; }
  }
  var f=document.getElementById('qcBaselineFile'); if(f){ f.value=''; f.click(); }
}
function qcBaselineLoad(files){
  if(!files||!files.length) return;
  var done=0, added=0, bad=[];
  Array.prototype.forEach.call(files, function(file){
    var r=new FileReader();
    r.onload=function(){
      try{ var j=JSON.parse(r.result);
        if(!j||typeof j!=='object'||Array.isArray(j)) throw new Error('형식이 {문항id:[코드]} 아님');
        Object.keys(j).forEach(function(k){ if(Array.isArray(j[k])){ _qcBaselines[k]=j[k]; added++; } });
      }catch(e){ bad.push(file.name+': '+(e.message||e)); }
      done++;
      if(done===files.length){ _qcBaselineStatShow();
        alert('📌 베이스라인 로드 — 문항 '+_qcBaselineCount()+'개 (델타검수 ON)'+(bad.length?('\n\n실패: '+bad.join(' / ')):'')+'\n\n이제 "지적서 만들기"를 누르면 베이스라인에 없던 새 위반만 표시됩니다.');
      }
    };
    r.readAsText(file);
  });
}
async function _buildReviewLines(items){
  await _qcLoadImgKeys(); await _qcLoadCptCards();
  var L=['[CertLab 검수 지적서]','파일: '+items.map(function(it){return it.docId;}).join(', '),'생성: '+new Date().toLocaleString('ko-KR'),'',
    '━━━━━ ① 일반 검수 (문항 게이트) ━━━━━'];
  if(!_qcImgKeys) L.push('  (이미지 라이브러리 로드 실패 — IMG_MISSING 검사 생략)');
  var any=false;
  if(_qcBaselineCount()>0){
    /* 델타검수: 베이스라인에 없던 위반(=이번 편집이 만든 것)만 표시, 기존 backlog는 숨김 */
    L.push('  [델타검수 ON] 베이스라인 대비 새 위반만 표시 (베이스라인 문항 '+_qcBaselineCount()+'개)');
    var _carried=0;
    items.forEach(function(it){ ((it.data&&it.data.questions)||[]).forEach(function(q){
      var base=_qcBaselines[String(q&&q.id)]; var bset={}; if(base) base.forEach(function(c){ bset[c]=1; });
      var vs; try{ vs=_qcViolations(q)||[]; }catch(e){ vs=[]; }
      vs.forEach(function(x){
        if(base && bset[x.code]){ _carried++; return; }   /* 기존 backlog → 숨김 */
        var loc=(x.field==='card'?('card'+x.idx):(x.field+'['+x.idx+']'));
        L.push('  ['+(x.kind==='block'?'차단':'경고')+'] '+it.docId+' · '+(q&&q.id)+' '+loc+' '+x.msg); any=true;
      });
    }); });
    if(!any) L.push('  (새 위반 없음 — 이번 편집이 만든 위반 0건)');
    L.push('  · 기존 backlog '+_carried+'건 숨김 (📌 버튼으로 해제하면 전체 표시)');
  } else {
    items.forEach(function(it){ var g=qualityGate((it.data&&it.data.questions)||[]);
      g.block.forEach(function(m){ L.push('  [차단] '+it.docId+' · '+m); any=true; });
      g.warn.forEach(function(m){ L.push('  [경고] '+it.docId+' · '+m); any=true; }); });
    if(!any) L.push('  (자동 위반 없음 — 구조·예시 게이트 통과)');
  }
  L.push('','━━━━━ ② 마스터 연결 검수 (참조 연결) ━━━━━');
  try{ var M=await _mlaLoadMasters(false); L=L.concat(_mlaAuditLines(items, M)); }
  catch(e){ L.push('  ❌ 마스터 로드 실패: '+(e.message||e)+' (일반 검수만 표시)'); }
  L.push('','━━━━━ ③ 크리스 지적 (자유 입력) ━━━━━','  예) c2021_3 예시가 너무 길다 / 6번 관계도 방향이 반대다','  ','  ','','※ 규칙: 위에 지적된 항목만 수정한다. 통과한 문항·필드는 손대지 않는다.');
  return L;
}
// 라이브 범위 지적서(텍스트) → textarea
async function buildReviewNoteLive(kind, cert, sub, taId, badgeId){
  var ta=document.getElementById(taId); if(!ta) return; ta.value='⏳ 라이브 읽는 중…';
  try{ var items=await _liveReadItems(kind, cert, sub); if(!items.length){ ta.value='해당 범위에 데이터가 없습니다.'; return; }
    ta.value='⏳ 검수 중… (문항 '+items.reduce(function(n,it){return n+((it.data.questions||[]).length);},0)+'개)';
    ta.value=(await _buildReviewLines(items)).join('\n');
    if(badgeId){ _qcSetBadge(badgeId,(ta.value.match(/\[차단\]/g)||[]).length,(ta.value.match(/\[경고\]/g)||[]).length); }
  }catch(e){ ta.value='오류: '+e.message; }
}
// 위반 개수 배지(⛔ 차단 · ⚠ 경고)
function _qcSetBadge(id,b,w){ var el=document.getElementById(id); if(!el) return; el.innerHTML=' · <span style="color:#B91C1C;font-weight:800">⛔ '+b+'</span> <span style="color:#B45309;font-weight:800">⚠ '+w+'</span>'; }
function downloadReviewNoteTa(taId, fnBase){
  var t=document.getElementById(taId); if(!t||!t.value.trim()){ alert('먼저 지적서를 만들어 주세요.'); return; }
  var blob=new Blob([t.value],{type:'text/plain;charset=utf-8'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='검수지적서_'+(fnBase||'live')+'_'+new Date().toISOString().slice(0,10)+'.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}
// 내보내기 화면 검수 래퍼
function _scv(id){ return (document.getElementById(id)||{}).value||'__all'; }
function qcGichulLive(){ qcLiveAudit('gichul', _scv('expCert'), _scv('expSub'), 'expStatus', 'expReviewCount'); }
function reviewGichulLive(){ buildReviewNoteLive('gichul', _scv('expCert'), _scv('expSub'), 'expReviewNote', 'expReviewCount'); }
function dlGichulReview(){ downloadReviewNoteTa('expReviewNote', 'gichul_'+_scv('expCert')+(_scv('expSub')!=='__all'?('_'+_scv('expSub')):'')); }
function qcLvupLive(){ qcLiveAudit('lvup', _scv('lvupExpCert'), _scv('lvupExpSub'), 'lvupImpStatus', 'lvupReviewCount'); }
function reviewLvupLive(){ buildReviewNoteLive('lvup', _scv('lvupExpCert'), _scv('lvupExpSub'), 'lvupReviewNote', 'lvupReviewCount'); }
function _qcStash(bundle){
  try{ window.__certlabQC=bundle; }catch(e){}
  try{ localStorage.setItem('certlab_qc_payload', JSON.stringify(bundle)); }
  catch(e){ try{ localStorage.removeItem('certlab_qc_payload'); }catch(_){} }
  return true;
}
function qcOpenReviewMaster(mtype){
  var map={mnem:(typeof _mnemImpData!=='undefined'?_mnemImpData:null), table:(typeof _tblmImpData!=='undefined'?_tblmImpData:null), graph:(typeof _grpmImpData!=='undefined'?_grpmImpData:null), interactive:(typeof _itvmImpData!=='undefined'?_itvmImpData:null)};
  var items=map[mtype];
  if(!items||!items.length){ alert('먼저 해당 마스터 JSON을 로드하세요.'); return; }
  var bundle={ _meta:{kind:'qc'}, kind:'master', mtype:mtype, items:items };
  _qcStash(bundle);
  window.open('preview.html?qc=1','_blank');
}
function qcOpenReview(){
  var items=(typeof impItems!=='undefined'?impItems:[]).filter(function(it){return it&&it.data;});
  if(!items.length){ alert('먼저 위 드롭존에 기출 JSON을 로드하세요.'); return; }
  var bundle={ _meta:{kind:'qc', generatedAt:new Date().toISOString(), source:'admin'},
    banks: items.map(function(it){ return {docId:it.docId, data:it.data}; }) };
  _qcStash(bundle);
  window.open('preview.html?qc=1','_blank');
}
function qcOpenReviewCpt(){
  if(!_cptmImpData||!_cptmImpData.length){ alert('먼저 개념 JSON을 로드하세요.'); return; }
  var bundle={ _meta:{kind:'qc'}, kind:'cpt', concepts:_cptmImpData };
  _qcStash(bundle);
  window.open('preview.html?qc=1','_blank');
}
function qcOpenReviewLvup(){
  if(!_lvupQStash||!_lvupQStash.length){ alert('먼저 레벨업 JSON을 로드하세요(변형문항 있는 파일).'); return; }
  var bundle={ _meta:{kind:'qc'}, banks:_lvupQStash };
  _qcStash(bundle);
  window.open('preview.html?qc=1','_blank');
}
function qcOpenReviewAll(){
  var bundle={ _meta:{kind:'qc',generatedAt:new Date().toISOString(),source:'admin'}, kind:'unified' }; var any=false;
  var bk=(typeof impItems!=='undefined'?impItems:[]).filter(function(it){return it&&it.data;}).map(function(it){return {docId:it.docId,data:it.data};});
  if(bk.length){ bundle.banks=bk; any=true; }
  if(typeof _lvupQStash!=='undefined'&&_lvupQStash&&_lvupQStash.length){ bundle.lvup=_lvupQStash; any=true; }
  if(typeof _cptmImpData!=='undefined'&&_cptmImpData&&_cptmImpData.length){ bundle.concepts=_cptmImpData; any=true; }
  if(typeof _mnemImpData!=='undefined'&&_mnemImpData&&_mnemImpData.length){ bundle.mnem=_mnemImpData; any=true; }
  if(typeof _tblmImpData!=='undefined'&&_tblmImpData&&_tblmImpData.length){ bundle.table=_tblmImpData; any=true; }
  if(typeof _grpmImpData!=='undefined'&&_grpmImpData&&_grpmImpData.length){ bundle.graph=_grpmImpData; any=true; }
  if(typeof _itvmImpData!=='undefined'&&_itvmImpData&&_itvmImpData.length){ bundle.interactive=_itvmImpData; any=true; }
  if(!any){ alert('먼저 검수할 JSON을 하나 이상 로드하세요 (기출·레벨업·개념·암기·표·그래프·인터랙티브 어느 탭이든).'); return; }
  _qcStash(bundle);
  window.open('preview.html?qc=1','_blank');
}

// ===== 마스터 연결 검수 (개념 미연결·죽은 링크·딸림 mn/tbl/grp·직접 tbl·img/itv·cx빈칸) =====
var _mlaCache=null;
function _mlaClean(u){ return String(u||'').replace(/^(cpt|tbl|mn|grp|img|itv):\/\//,''); }
/* [qc-core.js로 이관] ⑥ 마스터 필요 판정 신호(_CS_GRP/_CS_TBL/_CS_MN/_CS_ITV)는 qc-core.js 단일소스.
   QC.conceptSignals(txt) → {sigGrp,sigTbl,sigMn,sigItv}. (구버전 qc-core 대비 폴백 유지) */
var _qcCS=(typeof QC!=='undefined'&&QC.conceptSignals)?QC.conceptSignals:function(t){t=String(t||'');var G=(QC&&QC.CS&&QC.CS.grp),T=(QC&&QC.CS&&QC.CS.tbl),M=(QC&&QC.CS&&QC.CS.mn),I=(QC&&QC.CS&&QC.CS.itv);return {sigGrp:G?G.test(t):false,sigTbl:T?T.test(t):false,sigMn:M?M.test(t):false,sigItv:I?I.test(t):false};};
async function _mlaLoadMasters(force){
  if(!force && _mlaCache && (Date.now()-_mlaCache.at)<10*60*1000) return _mlaCache;
  var concepts={}, tables={}, mnems={}, graphs={}, images={}, itvs={};
  (await db.collection('concepts').get()).forEach(function(d){ var r=d.data()||{}; var cards=Array.isArray(r.cards)?r.cards:[]; var empty=0, hasSvg=false, hasTbl=false;
    var _txt=(r.name||''); cards.forEach(function(c){ var cx=String((c&&c.cx)||''); if(!cx.trim()) empty++; if(cx.indexOf('<svg')>=0) hasSvg=true; if(cx.indexOf('<table')>=0) hasTbl=true; _txt+=' '+((c&&c.t)||'')+' '+((c&&c.d)||'')+' '+cx; });
    var _sig=_qcCS(_txt);
    concepts[d.id]={ name:r.name||'', cards:cards.length, emptyCx:empty, hasCxSvg:hasSvg, hasCxTbl:hasTbl, cert:(Array.isArray(r.certs)&&r.certs[0])||'',
      sigGrp:_sig.sigGrp, sigTbl:_sig.sigTbl, sigMn:_sig.sigMn, sigItv:_sig.sigItv,
      tbl:(Array.isArray(r.tbl)?r.tbl:[]).map(_mlaClean),
      mn:(Array.isArray(r.mn)?r.mn:[]).map(_mlaClean),
      grp:(Array.isArray(r.grp)?r.grp:[]).map(_mlaClean) }; });
  (await db.collection('tables').get()).forEach(function(d){ tables[d.id]=1; });
  (await db.collection('mnemonics').get()).forEach(function(d){ mnems[d.id]=1; });
  (await db.collection('graphs').get()).forEach(function(d){ graphs[d.id]=1; });
  (await db.collection('images').get()).forEach(function(d){ images[d.id]=1; });
  var itvCov={};
  (await db.collection('interactives').get()).forEach(function(d){ itvs[d.id]=1; var r=d.data()||{};
    (Array.isArray(r.concepts)?r.concepts:[]).forEach(function(c){ if(c) itvCov[_mlaClean(c)]=1; });
    var _nd=(r.params&&(r.params.nodes||r.params.events||r.params.items))||[]; if(Array.isArray(_nd)) _nd.forEach(function(n){ if(n&&n.cpt) itvCov[_mlaClean(n.cpt)]=1; });
  });
  _mlaCache={concepts:concepts,tables:tables,mnems:mnems,graphs:graphs,images:images,interactives:itvs,itvCov:itvCov,at:Date.now()};
  return _mlaCache;
}
function _mlaRefs(q){
  var exp=q&&q.exp||{}; var out={cpt:[],tbl:[],img:[],itv:[]};
  (Array.isArray(exp.cpt)?exp.cpt:[]).forEach(function(id,i){ if(id) out.cpt.push({id:_mlaClean(id),where:'exp.cpt['+i+']'}); });
  (Array.isArray(exp.ot)?exp.ot:[]).forEach(function(o,i){ if(o&&Array.isArray(o.cpt)) o.cpt.forEach(function(id){ if(id) out.cpt.push({id:_mlaClean(id),where:'ot['+i+']'}); }); });
  // 문항 직접 표참조: exp.tbl[] + exp.c[].tbl[]
  (Array.isArray(exp.tbl)?exp.tbl:[]).forEach(function(id){ if(id) out.tbl.push({id:_mlaClean(id),where:'exp.tbl'}); });
  (Array.isArray(exp.c)?exp.c:[]).forEach(function(c,ci){ if(c&&Array.isArray(c.tbl)) c.tbl.forEach(function(id){ if(id) out.tbl.push({id:_mlaClean(id),where:'exp.c['+ci+'].tbl'}); }); });
  var blob=JSON.stringify(q), m;
  var reI=/img:\/\/([A-Za-z0-9_\-]+)/g; while((m=reI.exec(blob))) out.img.push({id:m[1]});
  var reV=/itv:\/\/([A-Za-z0-9_\-]+)/g; while((m=reV.exec(blob))) out.itv.push({id:m[1]});
  return out;
}
function _mlaAuditLines(items, M){
  if(typeof QC!=='undefined' && QC.masterAudit) return QC.masterAudit(items, M);   /* [2026-07-13] ② 감사 단일소스: qc-core. 구버전 qc-core면 아래 인라인 폴백 */
  var L=['마스터: 개념 '+Object.keys(M.concepts).length+' · 표 '+Object.keys(M.tables).length+' · 암기 '+Object.keys(M.mnems).length+' · 그래프 '+Object.keys(M.graphs).length+' · 이미지 '+Object.keys(M.images).length+' · 인터랙티브 '+Object.keys(M.interactives).length,''];
  var noCptL=[], deadL=[], childL=[], mediaL=[], cxL=[], needL=[];
  var nNoCpt=0,nDead=0,nChild=0,nMedia=0,nCx=0,nNeed=0,nNeed7=0, seenCx={}, seenChild={}, _refCpt={}, need7L=[];
  var _VIS_Q=/수요곡선|공급곡선|비용곡선|무차별곡선|필립스곡선|IS-?LM|로렌츠|지니계수|총수요|총공급|탄력성|균형점|한계효용|한계비용|한계수입|평균비용|생산가능곡선|NPV|IRR|순현재가치|내부수익률|손익분기|현재가치법|곡선을?\s*그리|그래프로\s*나타|그림으로\s*(나타|표현)|(?<![가-힣])도해|순서도|흐름도/;  /* '도해'는 앞에 한글음절 있으면 제외(양도해·매도해 오탐 방지) */
  var _IMG_Q=/다음\s*(그림|사진|지도|도표|사진자료)|그림과\s*같은|지도(?:에서|에\s*표시)|위\s*(그림|지도)|아래\s*(그림|지도)|다음\s*\(?[가-바]\)?\s*(유물|지역|시대|인물|건축|나라|사진)|해부도|근육도|골격도|인체도|그림의\s*(동작|자세|근육|부위|관절|뼈|힘줄|장기|구조)|화살표가\s*가리키는|표시된\s*(부위|근육|위치|지점)|그림에서\s*(가리키|나타|표시)/;  /* 과목무관 이미지 지시. [FIX 2026-07-12] '지도의'(코칭 指導의) 오탐 방지 위해 지도의 제거 — 지도에서/지도에 표시/다음 지도만 잡음 */
  var _IMG_ART=/(?<![가-힣])유물(?!사관|론|주의)|(?<![가-힣])유적|(?<![가-힣])문화재(?!단)|다음\s*사진|사진\s*자료|사진을?\s*(보|참고|참조)/;  /* 유물·유적·문화재·사진 = 한국사 등 유물이미지 과목 전용. [FIX 2026-07-12] 유물사관/유물론/청사진·서술 속 '사진을~' 오탐 방지 위해 좁힘(유물 뒤 사관/론/주의 제외, 사진은 '다음 사진·사진 자료·사진을 보고' 지시형만). 감정평가사·공인중개사에선 내용어라 오탐 → appraiser·realestate 제외 */
  var _IMG_EX=/사료|(?:비문|문헌|그림|유물|유적)\s*[·,]|(?:유물|유적|그림|문헌)\s*(?:처럼|같은|등)/;  /* [FIX 2026-07-13] 사료·자료 '예시 나열'(비문·문헌·유물처럼)은 이미지 지시 아님 → _IMG_ART 오탐 제외(스포츠사 등) */
  items.forEach(function(it){
    var qs=(it.data&&it.data.questions)||[];
    qs.forEach(function(q){
      var id=(q&&q.id)||'?', R=_mlaRefs(q);
      // 1) 개념 미연결
      if(R.cpt.length===0 && (typeof _qcCptExemptCerts==='undefined' || _qcCptExemptCerts.indexOf(String(it.docId||'').split('__')[0])<0)){ noCptL.push('  [누락] '+it.docId+' · '+id+' 개념 연결 없음(exp.cpt 비어 있음)'); nNoCpt++; }  // 구술·실기(보디빌딩) 개념 미연결 예외
      // 2) 죽은 링크 + cx
      R.cpt.forEach(function(r){
        var c=M.concepts[r.id];
        if(!c){ deadL.push('  [누락] '+it.docId+' · '+id+' '+r.where+' → 개념 '+r.id+' 마스터에 없음(죽은 링크)'); nDead++; return; }
        _refCpt[r.id]=1;
        if(c.cards===0){ deadL.push('  [누락] '+it.docId+' · '+id+' '+r.where+' → 개념 '+r.id+' 카드 0개'); nDead++; }
        else if(c.emptyCx>0 && !seenCx[r.id]){ seenCx[r.id]=1; cxL.push('  [경고] 개념 '+r.id+' ('+c.name+') 카드 '+c.cards+'개 중 cx 빈칸 '+c.emptyCx+'개'); nCx++; }
        // 3) 개념 딸림 mn/tbl/grp
        [['암기','mn',c.mn,M.mnems],['표','tbl',c.tbl,M.tables],['그래프','grp',c.grp,M.graphs]].forEach(function(k){
          (k[2]||[]).forEach(function(cid){ if(!k[3][cid]){ var key=k[1]+':'+r.id+':'+cid; if(seenChild[key])return; seenChild[key]=1;
            childL.push('  [누락] '+it.docId+' · '+id+' 개념 '+r.id+' → '+k[0]+' '+cid+' 마스터에 없음'); nChild++; } });
        });
      });
      // 4) 문항 직접 tbl
      R.tbl.forEach(function(r){ if(!M.tables[r.id]){ childL.push('  [누락] '+it.docId+' · '+id+' '+r.where+' → 표 '+r.id+' 마스터에 없음'); nChild++; } });
      // 5) img/itv
      R.img.forEach(function(r){ if(!M.images[r.id]){ mediaL.push('  [누락] '+it.docId+' · '+id+' 이미지 img://'+r.id+' 없음'); nMedia++; } });
      R.itv.forEach(function(r){ if(!M.interactives[r.id]){ mediaL.push('  [누락] '+it.docId+' · '+id+' 인터랙티브 itv://'+r.id+' 없음'); nMedia++; } });
      // 7) 문항 자체 시각자료 필요 (과목 무관 — 그 문항 풀이에 그래프/이미지가 필요한데 아무 데도 없음)
      var _qb=''; try{ _qb=JSON.stringify(q); }catch(_){}
      var _lc7=R.cpt.map(function(r){return M.concepts[r.id];}).filter(Boolean);
      var _qVis=(q.exp&&q.exp.graph&&String(q.exp.graph).trim())||/<svg|img:\/\//.test(_qb)||_lc7.some(function(c){return (c.grp||[]).length||c.hasCxSvg;})||(M.itvCov&&R.cpt.some(function(r){return M.itvCov[r.id];}));
      var _hasImg=/img:\/\//.test(_qb)||(q.img&&String(q.img).trim());
      var _stem7=String((q&&q.q)||'');  /* [FIX 2026-07-12] 이미지 지시는 문항 스템에만 있으므로, 해설·보기 전체(_qb) 대신 스템(q.q)에서 판정 → 청사진·유물사관·서술 속 낱말 오탐 방지 */
      if(_VIS_Q.test(_stem7) && !_qVis){ need7L.push('  [경고] '+it.docId+' · '+id+' 문항 자체가 시각 풀이형(곡선·계산곡선·흐름 등)인데 풀이 그래프/이미지 없음 → exp.graph 추가 또는 개념 grp 연결'); nNeed7++; }
      else if((_IMG_Q.test(_stem7) || (!/appraiser|realestate/.test(it.docId||'') && _IMG_ART.test(_stem7) && !_IMG_EX.test(_stem7))) && !_hasImg){ need7L.push('  [경고] '+it.docId+' · '+id+' 이미지 지시(그림·사진·지도·유물·동작·부위 등)인데 이미지 참조 없음 → 이미지(img://) 연결/제작'); nNeed7++; }
    });
  });
  // 6) 마스터 필요한데 없음 — 개념 단위 전수(참조 개념 1회씩·내용 신호 기반)
  Object.keys(_refCpt).forEach(function(cid){ var c=M.concepts[cid]; if(!c) return;
    var hasGrp=(c.grp||[]).length||c.hasCxSvg, hasTbl=(c.tbl||[]).length||c.hasCxTbl, hasMn=(c.mn||[]).length, hasItv=(M.itvCov&&M.itvCov[cid]);
    var miss=[];
    if(c.sigGrp && !hasGrp) miss.push('그래프');
    if(c.sigItv && !hasItv) miss.push('인터랙티브');
    if(c.sigTbl && !hasTbl) miss.push('표');
    if(c.sigMn && !hasMn) miss.push('암기');
    if(miss.length){ needL.push('  [경고] 개념 '+cid+' ('+(c.name||'')+')'+(c.cert?(' ['+c.cert+']'):'')+' → '+miss.join('·')+' 필요한데 없음'); nNeed++; }
  });
  L.push('■ 1) 개념 미연결 (exp.cpt 비어 있음 — 개념카드 통째 안 뜸)');
  L=L.concat(noCptL.length?noCptL:['  (없음 — 모든 문항에 개념 연결됨)']);
  L.push('','■ 2) 죽은 링크 (가리킨 개념이 마스터에 없음/카드 0개)');
  L=L.concat(deadL.length?deadL:['  (없음)']);
  L.push('','■ 3) 딸림 마스터 누락 (개념→표·암기·그래프 + 문항 직접 표참조)');
  L=L.concat(childL.length?childL:['  (없음)']);
  L.push('','■ 4) 이미지·인터랙티브 누락');
  L=L.concat(mediaL.length?mediaL:['  (없음)']);
  L.push('','■ 5) 개념카드 예시(cx) 빈칸 (참조 개념 한정·개념별 1회)');
  L=L.concat(cxL.length?cxL:['  (없음)']);
  L.push('','■ 6) 마스터 필요한데 없음 [개념 단위 전수] (곡선→그래프·조작형→인터랙티브·비교→표·열거→암기)');
  L=L.concat(needL.length?needL:['  (없음)']);
  L.push('','■ 7) 문항 풀이 시각자료 필요 [문항 단위·과목무관] (문항 자체가 그래프/이미지형인데 시각자료 없음 — 경제 곡선·한국사 유물·건운사 해부·스포츠 동작 등)');
  L=L.concat(need7L.length?need7L:['  (없음)']);
  L.push('','요약: 개념미연결 '+nNoCpt+' · 죽은링크 '+nDead+' · 딸림/표 누락 '+nChild+' · 이미지/인터랙티브 '+nMedia+' · cx빈칸 개념 '+nCx+' · 마스터필요(개념) '+nNeed+' · 문항시각필요 '+nNeed7);
  L.push('※ 방향: 문항→개념→(표·암기·그래프). 마스터 고아는 대상 아님. 마스터를 방금 올렸으면 10분 캐시 → 새로고침 후 재실행.');
  return L;
}
async function buildReviewNote(src){
  src=src||'gichul';
  var items=(src==='lvup')?(typeof _lvupQStash!=='undefined'?_lvupQStash:[]).filter(function(it){return it&&it.data;}):(typeof impItems!=='undefined'?impItems:[]).filter(function(it){return it&&it.data;});
  if(!items.length){ alert('먼저 '+(src==='lvup'?'레벨업':'기출')+' JSON을 로드하세요.'); return; }
  var ta=document.getElementById(src==='lvup'?'lvupReviewNote':'reviewNote'); ta.value='⏳ 검수 중… 일반 검수 + 마스터 로드(수 초)';
  ta.value=(await _buildReviewLines(items)).join('\n');
  _qcSetBadge(src==='lvup'?'lvupReviewCount':'qcBtnCount',(ta.value.match(/\[차단\]/g)||[]).length,(ta.value.match(/\[경고\]/g)||[]).length);
}
function copyReviewNote(){ var t=document.getElementById('reviewNote'); if(!t.value.trim()){ alert('먼저 지적서를 만들어 주세요.'); return; } t.select(); var ok=false; try{ if(navigator.clipboard){ navigator.clipboard.writeText(t.value); ok=true; } }catch(_){ } if(!ok){ try{ document.execCommand('copy'); }catch(__){} } alert('복사됐어요. 데이터방에 붙여넣으세요.'); }
function downloadReviewNote(src){ src=src||'gichul'; var taId=(src==='lvup')?'lvupReviewNote':'reviewNote'; var t=document.getElementById(taId); if(!t||!t.value.trim()){ alert('먼저 지적서를 만들어 주세요.'); return; } var arr=(src==='lvup')?(typeof _lvupQStash!=='undefined'?_lvupQStash:[]):(typeof impItems!=='undefined'?impItems:[]); var fn=(arr.length>1)?(src==='lvup'?'레벨업_전체':'기출_전체'):((arr[0]&&arr[0].docId)?arr[0].docId:(src==='lvup'?'levelup':'exam'));  /* [FIX] 여러 과목 묶음이면 첫 과목명 대신 전체로 */ var blob=new Blob([t.value],{type:'text/plain;charset=utf-8'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='검수지적서_'+fn+'_'+new Date().toISOString().slice(0,10)+'.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); }

async function impUpload(){
  const ready=impItems.filter(it=>it.status==='ready');
  if(!ready.length) return;
  const noDate=ready.filter(it=>_impFileDate(it.data)==null).map(it=>it.docId);
  if(noDate.length){ alert('❌ 업로드 차단 — 날짜 누락 [기출]\n\n규칙: 기출 파일에 _meta.generatedAt 필수.\n\n누락: '+noDate.join(', ')); impLog('날짜 누락으로 차단: '+noDate.join(', ')); return; }
  // 품질 게이트(전수): 구조 오류=하드 차단 / 품질 경고=확인 후 우회
  await _qcLoadImgKeys();   // img:// 참조 대조용(실패 시 IMG_MISSING만 생략)
  await _qcLoadCptCards();  // exp.cpt 참조 개념 카드 대조용(실패 시 해당 문항 카드 검사 생략)
  var _gBlock=[], _gWarn=[];
  ready.forEach(function(it){ var g=qualityGate((it.data&&it.data.questions)||[]); g.block.forEach(function(m){ _gBlock.push(it.docId+' · '+m); }); g.warn.forEach(function(m){ _gWarn.push(it.docId+' · '+m); }); });
  if(_gBlock.length){
    await buildReviewNote();
    var _rn=document.getElementById('reviewNote'); if(_rn) _rn.scrollIntoView({behavior:'smooth',block:'center'});
    alert('❌ 업로드 차단 — 구조 위반 '+_gBlock.length+'건\n\n검수 지적서가 자동 작성됐어요. 아래 "■ 크리스 지적"에 본 것을 더해 📋 복사 → 데이터방에 전달하세요.');
    impLog('업로드 차단(구조 '+_gBlock.length+'건) → 지적서 자동 작성'); return;
  }
  if(_gWarn.length){
    if(!confirm('⚠️ 품질 경고 '+_gWarn.length+'건 (ex 명명 인물 없음 / o 되풀이)\n\n[확인] 무시하고 업로드    /    [취소] 지적서 작성해서 데이터방에 전달')){
      await buildReviewNote();
      var _rn2=document.getElementById('reviewNote'); if(_rn2) _rn2.scrollIntoView({behavior:'smooth',block:'center'});
      impLog('품질 경고 '+_gWarn.length+'건 → 지적서 자동 작성'); return;
    }
    impLog('품질 경고 '+_gWarn.length+'건 무시하고 진행');
  }
  const lines=ready.map(it=>'  '+it.docId+': ver '+it.curVer+' → '+impNewVer(it)+' (문항 '+(it.curCount==null?'?':it.curCount)+' → '+it.count+')').join('\n');
  const warns=[];
  ready.forEach(it=>{
    if(typeof it.curCount==='number' && it.count < it.curCount) warns.push('⚠️ '+it.docId+': 문항수 감소 '+it.curCount+' → '+it.count+' (데이터 손실 위험!)');
    if(typeof it.curVer==='number' && typeof it.version==='number' && it.version < it.curVer) warns.push('⚠️ '+it.docId+': 새 version('+it.version+')이 현재('+it.curVer+')보다 낮음 — 과거 파일일 수 있음');
  });
  const wtxt=warns.length?('\n\n'+warns.join('\n')):'';
  if(!confirm('다음 '+ready.length+'개 문서를 덮어씁니다. 계속할까요?\n\n'+lines+wtxt+'\n\n업로드 후 manifest(번들에 새 시험·과목이 있으면 등록 + 버전 동기화)가 자동 반영됩니다.')){ impLog('업로드 취소됨.'); return; }
  document.getElementById('impRun').disabled=true;
  for(const it of ready){
    try{
      const nv=impNewVer(it);
      const data=it.data;
      const qs=Array.isArray(data.questions)?data.questions:[];
      // 회차 키 = q.set 우선, 없으면 id 앞부분(예: c26_1 → c26). 등장 순서 보존.
      const order=[], map={}; let allKey=qs.length>0;
      qs.forEach(function(q){
        var s=q.set;
        if(s==null||s===''){ var m=String(q.id||'').match(/^([A-Za-z]+\d+)_/); s=m?m[1]:null; }
        if(s==null||s===''){ allKey=false; return; }
        if(!map[s]){ map[s]=[]; order.push(s); } map[s].push(q);
      });
      if(allKey && order.length){
        for(const s of order){
          await db.collection('banks').doc(it.docId+'__'+s).set({ set:s, version:nv, questions:map[s] });
        }
        await db.collection('banks').doc(it.docId).set({ version:nv, cert:data.cert, subject:data.subject, name:data.name||'', shards:order.slice(), count:qs.length });
        it.status='done'; it.curVer=nv;
        impLog('✓ '+it.docId+' 샤딩 업로드 — ver '+nv+', 회차 '+order.length+'개·문항 '+qs.length,'#15793F');
      } else {
        const payload=Object.assign({}, data, {version:nv});
        var approxBytes=0; try{ approxBytes=new Blob([JSON.stringify(payload)]).size; }catch(_){ try{ approxBytes=unescape(encodeURIComponent(JSON.stringify(payload))).length; }catch(__){} }
        if(approxBytes>1000000){
          it.status='bad'; it.err='샤딩 불가(문항에 set·id회차 정보 없음) + 1MB 초과 ('+approxBytes.toLocaleString()+'B). set 또는 id(예: c26_1)를 넣어 주세요.';
          impLog('✗ '+it.docId+' 업로드 중단 — 샤딩 불가 + 1MB 초과('+approxBytes.toLocaleString()+'B). 문항 set/id 회차정보 필요','#f85149');
          impRender(); continue;
        }
        await db.collection('banks').doc(it.docId).set(payload);
        it.status='done'; it.curVer=nv;
        impLog('✓ '+it.docId+' 업로드 완료(단일) — ver '+nv+', 문항 '+qs.length,'#15793F');
      }
    }catch(e){ it.status='bad'; it.err='업로드 실패: '+(e.message||e); impLog('✗ '+it.docId+' 실패: '+(e.message||e),'#f85149'); }
    impRender();
  }
  const _upCerts=[...new Set(ready.filter(it=>it.status==='done').map(it=>String(it.docId).split('__')[0]))];
  if(_upCerts.length) await _impAutoManifest(_upCerts);
  impLog('— 작업 종료 — (앱에서 Ctrl+Shift+R로 캐시 갱신)','#5B50C0');
}
// ===== manifest ↔ bank 버전 동기화 =====
// ===== version +1 강제 갱신 (전체 사용자 캐시 갱신) =====
async function forceBump(){
  const cert=(document.getElementById('bumpCert')||{}).value||'';
  const st=document.getElementById('bumpStatus');
  if(!cert){ st.textContent='자격증을 선택하세요.'; return; }
  st.textContent='읽는 중...';
  try{
    const mSnap=await db.collection('manifest').doc('exams').get();
    if(!mSnap.exists){ st.textContent='manifest/exams 문서가 없습니다.'; return; }
    const manifest=mSnap.data(); const exams=manifest.exams||[];
    const ex=exams.find(e=>e.id===cert);
    if(!ex){ st.textContent='해당 자격증을 manifest에서 못 찾음.'; return; }
    ex.versions=ex.versions||{};
    const plan=[];
    for(const sub of (ex.subjects||[])){
      const bd=await db.collection('banks').doc(cert+'__'+sub.code).get();
      const curBank=(bd.exists && typeof bd.data().version==='number')?bd.data().version:(ex.versions[sub.code]||1);
      const nv=curBank+1;
      plan.push({code:sub.code, name:sub.name, from:curBank, to:nv, exists:bd.exists});
    }
    if(!plan.length){ st.textContent='과목이 없습니다.'; return; }
    if(!confirm('['+(ex.name||cert)+'] version +1 (bank·manifest 동시):\n\n'+plan.map(p=>'  '+p.code+': '+p.from+' → '+p.to).join('\n')+'\n\n전체 사용자가 새로 받게 됩니다. 적용할까요?')){ st.textContent='취소됨.'; return; }
    // bank version +1
    for(const p of plan){ if(p.exists){ await db.collection('banks').doc(cert+'__'+p.code).update({version:p.to}); } ex.versions[p.code]=p.to; }
    await db.collection('manifest').doc('exams').update({ exams: exams });
    st.innerHTML='✅ 완료 — '+plan.length+'과목 version +1.<br><span style="font-size:11px;color:#A89C8E">'+plan.map(p=>p.code+': '+p.from+'→'+p.to).join('<br>')+'</span><br>이제 모든 사용자가 새 데이터를 받습니다.';
  }catch(e){ st.textContent='오류: '+e.message; }
}
async function syncManifest(){
  const st=document.getElementById('syncStatus');
  st.textContent='읽는 중...';
  try{
    const mSnap=await db.collection('manifest').doc('exams').get();
    if(!mSnap.exists){ st.textContent='manifest/exams 문서가 없습니다.'; return; }
    const manifest=mSnap.data();
    const exams=manifest.exams||[];
    let changes=[]; 
    for(const ex of exams){
      ex.versions = ex.versions || {};
      for(const sub of (ex.subjects||[])){
        try{
          const bd=await db.collection('banks').doc(ex.id+'__'+sub.code).get();
          if(!bd.exists) continue;
          const bankVer = bd.data().version;
          if(typeof bankVer==='number' && ex.versions[sub.code]!==bankVer){
            changes.push(ex.id+'/'+sub.code+': '+(ex.versions[sub.code]??'-')+' → '+bankVer);
            ex.versions[sub.code]=bankVer;
          }
        }catch(_){}
      }
    }
    if(!changes.length){ st.innerHTML='✅ 이미 모두 일치합니다. 변경 없음.'; return; }
    if(!confirm('manifest version을 bank와 일치시킵니다 ('+changes.length+'건):\n\n'+changes.join('\n')+'\n\n적용할까요?')){ st.textContent='취소됨.'; return; }
    await db.collection('manifest').doc('exams').update({ exams: exams });
    st.innerHTML='✅ 동기화 완료 — '+changes.length+'건 갱신.<br><span style="font-size:11px;color:#A89C8E">'+changes.join('<br>')+'</span><br>앱에서 Ctrl+Shift+R 하면 새 데이터가 보입니다.';
  }catch(e){ st.textContent='오류: '+e.message; }
}
// ===== 매니페스트 등록: 번들의 새 시험을 레지스트리에 merge (추가만, 삭제·덮어쓰기 없음) =====
async function registerManifestExams(){
  const st=document.getElementById('regManifestStatus');
  if(!impBundleManifest || !Array.isArray(impBundleManifest.exams) || !impBundleManifest.exams.length){
    st.innerHTML='먼저 <b>manifest가 포함된 번들 JSON</b>을 위 영역에 올려주세요. (번들에 "manifest" 키가 있어야 합니다)'; return;
  }
  st.textContent='읽는 중...';
  try{
    const mSnap=await db.collection('manifest').doc('exams').get();
    const cur=(mSnap.exists && mSnap.data())||{};
    const exams=Array.isArray(cur.exams)?cur.exams.slice():[];
    const byId=new Map(exams.map(e=>[e&&e.id, e]));
    const toAdd=[], skip=[], subjAdds=[];
    for(const e of impBundleManifest.exams){
      if(!e||!e.id) continue;
      const exist=byId.get(e.id);
      if(!exist){ toAdd.push(e); continue; }
      // 기존 시험: subjects에 없는 새 과목만 병합 (기존 과목 무수정)
      exist.subjects=Array.isArray(exist.subjects)?exist.subjects:[];
      exist.versions=exist.versions||{};
      const haveCodes=new Set(exist.subjects.map(s=>s&&s.code));
      let added=0;
      for(const s of (e.subjects||[])){
        if(!s||!s.code||haveCodes.has(s.code)) continue;
        let bv=(e.versions&&typeof e.versions[s.code]==='number')?e.versions[s.code]:1;
        try{ const bd=await db.collection('banks').doc(e.id+'__'+s.code).get(); if(bd.exists && typeof bd.data().version==='number') bv=bd.data().version; }catch(_){}
        exist.subjects.push({code:s.code, name:s.name||s.code});
        exist.versions[s.code]=bv; added++;
        subjAdds.push(e.id+' / '+s.code+' ('+(s.name||'')+') v'+bv);
      }
      if(!added) skip.push(e.id);
    }
    if(!toAdd.length && !subjAdds.length){
      st.innerHTML='추가할 <b>새 시험·새 과목이 없습니다</b>. (이미 등록됨: '+(skip.join(', ')||'-')+')<br><span style="font-size:11px;color:#A89C8E">※ 기존 과목의 버전만 바꾸려면 "manifest 버전 동기화"를 쓰세요.</span>';
      return;
    }
    const lines=[].concat(
      toAdd.map(e=>'  + 새 시험 '+e.id+' ('+(e.name||'')+') · 과목 '+((e.subjects||[]).map(s=>s.code).join(', '))),
      subjAdds.map(x=>'  + 새 과목 '+x)
    );
    if(!confirm('아래를 매니페스트에 추가합니다.\n기존 시험·과목은 그대로 유지(삭제·덮어쓰기 없음).\n\n'+lines.join('\n')+'\n\n계속할까요?')){ st.textContent='취소됨.'; return; }
    const merged=exams.concat(toAdd);
    if(mSnap.exists) await db.collection('manifest').doc('exams').update({ exams: merged });
    else await db.collection('manifest').doc('exams').set({ exams: merged });
    st.innerHTML='✅ 등록 완료 — 새 시험 <b>'+toAdd.length+'</b>개, 새 과목 <b>'+subjAdds.length+'</b>개.<br>'
      +'<span style="font-size:11px;color:#A89C8E">앱에서 Ctrl+Shift+R(또는 ?v=숫자) 후 노출됩니다. 안 보이면 위 "⬆ 업로드 실행"으로 banks도 올렸는지 확인하세요.</span>'
      +(subjAdds.length?('<br><span style="font-size:11px;color:#0C447C">새 과목: '+subjAdds.join(' · ')+'</span>'):'');
  }catch(e){ st.textContent='오류: '+e.message; }
}
let _renameExams=null;
function _esc(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
async function loadRenameExams(){
  const st=document.getElementById('renameExamStatus'); st.textContent='불러오는 중...';
  try{ const m=await db.collection('manifest').doc('exams').get(); _renameExams=(m.exists && Array.isArray(m.data().exams))?m.data().exams:[]; }
  catch(e){ st.textContent='오류: '+e.message; return; }
  const sel=document.getElementById('renameExamSel');
  sel.innerHTML='<option value="">— 시험 선택 —</option>'+_renameExams.map(e=>'<option value="'+_esc(e.id)+'">'+_esc((e.name||e.id)+' ('+e.id+')')+'</option>').join('');
  document.getElementById('renameExamInput').value='';
  st.textContent=_renameExams.length+'개 시험. 바꿀 시험을 고르세요.';
}
function renameExamPick(){
  const id=document.getElementById('renameExamSel').value;
  const e=(_renameExams||[]).find(x=>x&&x.id===id);
  document.getElementById('renameExamInput').value=e?(e.name||''):'';
}
async function renameExam(){
  const st=document.getElementById('renameExamStatus');
  const id=document.getElementById('renameExamSel').value;
  const nm=(document.getElementById('renameExamInput').value||'').trim();
  if(!id){ st.textContent='시험을 먼저 고르세요.'; return; }
  if(!nm){ st.textContent='새 이름을 입력하세요.'; return; }
  try{
    const m=await db.collection('manifest').doc('exams').get();
    if(!m.exists){ st.textContent='manifest/exams 문서가 없습니다.'; return; }
    const exams=(m.data().exams||[]).slice();
    const idx=exams.findIndex(x=>x&&x.id===id);
    if(idx<0){ st.textContent='해당 시험을 manifest에서 못 찾음.'; return; }
    const old=exams[idx].name||'';
    if(old===nm){ st.textContent='이름이 같습니다. 변경 없음.'; return; }
    if(!confirm('시험 이름을 바꿉니다:\n\n'+id+'\n"'+old+'" → "'+nm+'"\n\n계속할까요?')){ st.textContent='취소됨.'; return; }
    exams[idx]=Object.assign({},exams[idx],{name:nm});
    await db.collection('manifest').doc('exams').update({ exams: exams });
    _renameExams=exams; _expExams=null;
    const sel=document.getElementById('renameExamSel');
    sel.innerHTML='<option value="">— 시험 선택 —</option>'+exams.map(e=>'<option value="'+_esc(e.id)+'"'+(e.id===id?' selected':'')+'>'+_esc((e.name||e.id)+' ('+e.id+')')+'</option>').join('');
    st.innerHTML='✅ 이름 변경 완료 — <b>'+_esc(id)+'</b>: "'+_esc(nm)+'"<br><span style="font-size:11px;color:#A89C8E">내보내기 드롭다운/앱은 탭 다시 열거나 Ctrl+Shift+R 후 반영.</span>';
  }catch(e){ st.textContent='오류: '+e.message; }
}
async function exportData(){
  const sel=document.getElementById('expCert'); const pick=(sel&&sel.value)||'__all';
  const subPick=(document.getElementById('expSub')||{}).value||'__all';
  const st=document.getElementById('expStatus');
  st.textContent='읽는 중... 잠시만요.';
  try{
    const m=await db.collection('manifest').doc('exams').get();
    const exams=(m.exists && m.data().exams)||[];
    const target = pick==='__all' ? exams : exams.filter(e=>e.id===pick);
    if(!target.length){ st.textContent='해당 자격증을 manifest에서 찾지 못했습니다.'; return; }
    const banks=[]; let qcnt=0;
    for(const e of target){
      for(const sub of (e.subjects||[])){
        if(subPick!=='__all' && sub.code!==subPick) continue;
        const docId=e.id+'__'+sub.code;
        try{ const bd=await db.collection('banks').doc(docId).get(); if(bd.exists){ let data=bd.data();
          if(Array.isArray(data.shards)&&data.shards.length){
            const qs=[];
            for(const s of data.shards){ const sd=await db.collection('banks').doc(docId+'__'+s).get(); if(sd.exists&&Array.isArray(sd.data().questions)) qs.push.apply(qs,sd.data().questions); }
            data=Object.assign({},data,{questions:qs}); delete data.shards; delete data.count;
          }
          banks.push({docId, data}); qcnt+=((data.questions||[]).length); } }catch(_){}
      }
    }
    const bundle={ manifest:{ exams: target, updatedAt:(m.exists&&m.data().updatedAt)||null }, banks, exportedAt:_kstISO(new Date()) };
    const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url;
    a.download='certlab_export_'+(pick==='__all'?'all':pick)+(subPick!=='__all'?('__'+subPick):'')+'_'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    st.innerHTML='✅ 내보내기 완료 — 문서 <b>'+banks.length+'</b>개 · 문항 <b>'+qcnt.toLocaleString()+'</b>개. 다운로드된 JSON이 현재 서비스 데이터입니다.';
  }catch(e){ st.textContent='오류: '+e.message; }
}


/* ===== 🌐 SEO 페이지 생성 (마케팅) ===== */
const SEO_CERT_NAME={appraiser:'감정평가사',realestate1:'공인중개사 1차',realestate2:'공인중개사 2차',housing:'주택관리사보',housing2:'주택관리사 2차',koreanhistory:'한국사능력검정시험(심화)',bodybuilding:'보디빌딩'};
const SEO_SUBJ_OVERRIDE={civil:'민법'};
const SEO_CERT_ORDER=['appraiser','realestate1','realestate2','housing','housing2','koreanhistory','bodybuilding'];
const SEO_STOP=new Set('관한 관하여 대한 대하여 설명으로 설명 옳은 옳지 않은 않는 것은 것을 것이 모두 고른 고르면 따름 경우 및 또는 모든 가장 바르게 틀린 맞는 해당하는 아닌 무엇 어느'.split(' '));
const SEO_STYLE=`
body{font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;background:#FDF8F5;color:#1e293b;max-width:760px;margin:0 auto;padding:20px 16px;line-height:1.6}
h1{font-size:22px;color:#0C447C;margin-bottom:6px} .sub{color:#64748b;font-size:14px;margin-bottom:16px}
.cta{display:inline-block;background:#0C447C;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:700;margin:4px 0 18px}
.bc{font-size:13px;color:#94a3b8;margin-bottom:10px} .bc a{color:#0C447C;text-decoration:none}
ul{list-style:none;padding:0;margin:0} .qitem{display:flex;gap:12px;padding:13px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:9px}
.qno{font-weight:800;color:#0C447C;flex-shrink:0;min-width:34px} .qt{margin:0 0 7px;font-weight:600}
.opts{margin:0 0 7px;padding-left:18px} .opts li{margin:2px 0} .o-cor{color:#0F6E56;font-weight:700}
.ans{margin:4px 0;font-size:13px;color:#0F6E56} .kws{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.kw{font-size:12px;color:#0C447C;background:#EAF0F9;border-radius:6px;padding:2px 8px}
footer{margin-top:24px;color:#94a3b8;font-size:13px;border-top:1px solid #e2e8f0;padding-top:14px} footer a{color:#0C447C}
`;
const SEO_STYLE_ADD='.exp{margin:8px 0 2px;border-top:1px dashed #e2e8f0;padding-top:8px}.ex-blk{margin:7px 0}.ex-h{font-size:12px;font-weight:800;color:#0C447C;margin-bottom:3px}.cc{background:#F4F7FB;border:1px solid #e2e8f0;border-radius:9px;padding:8px 10px;margin:4px 0}.cc-t{display:block;color:#0C447C;font-size:13px;margin-bottom:2px}.cc-d{margin:0;font-size:13px}.cc-cx{margin:4px 0 0;font-size:12.5px;color:#475569}.ex-o,.ex-ex{margin:2px 0;padding-left:18px}.ex-o li,.ex-ex li{margin:3px 0;font-size:13px}.ex-s{font-size:13px;color:#0F6E56;margin:5px 0 0}';
function seoEsc(t){if(t==null)return '';return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function seoClean(t){if(t==null)return '';t=String(t).replace(/<[^>]+>/g,'').replace(/\u00a0/g,' ').trim();return seoEsc(t);}
function seoKws(q){const toks=String(q||'').replace(/<[^>]+>/g,'').split(/\s+/);const out=[];for(let w of toks){w=w.replace(/[()\[\]?!.,\u00b7'"\u2018\u2019\u201c\u201d]/g,'').trim();if(w.length<2||SEO_STOP.has(w))continue;out.push(w);if(out.length>=5)break;}return out;}
function seoRound(s){const m=String(s||'').match(/제\s*(\d+)\s*회/);return m?m[1]:null;}
function seoCard(c){if(typeof c!=='object'||c==null)c={d:String(c)};const t=seoClean(c.t||''),d=seoClean(c.d||''),cx=seoClean(c.cx||'');let s='';if(t)s+='<b class="cc-t">'+t+'</b>';if(d)s+='<p class="cc-d">'+d+'</p>';if(cx)s+='<p class="cc-cx">예: '+cx+'</p>';return s?'<div class="cc">'+s+'</div>':'';}
function seoQ(n,q){const opts=q.opts||[];const ans=q.ans;const li=[];for(let i=0;i<opts.length;i++){const cls=(typeof ans==='number'&&(i+1)===ans)?' class="o-cor"':' class=""';li.push('<li'+cls+'>'+(i+1)+'. '+seoClean(opts[i])+'</li>');}const exp=q.exp||{};const parts=[];const cards=(exp.c||[]).map(seoCard).filter(Boolean);if(cards.length)parts.push('<div class="ex-blk"><div class="ex-h">📘 개념</div>'+cards.join('')+'</div>');const os=(exp.o||[]).filter(x=>String(x).trim()).map(seoClean);if(os.length)parts.push('<div class="ex-blk"><div class="ex-h">🔍 보기별 해설</div><ol class="ex-o">'+os.map(x=>'<li>'+x+'</li>').join('')+'</ol></div>');const ex=(exp.ex||[]).filter(x=>String(x).trim()).map(seoClean);if(ex.length)parts.push('<div class="ex-blk"><div class="ex-h">🧮 풀이</div><ol class="ex-ex">'+ex.map(x=>'<li>'+x+'</li>').join('')+'</ol></div>');const sline=seoClean(exp.s||'');if(sline)parts.push('<p class="ex-s">'+sline+'</p>');const exphtml=parts.length?'<div class="exp">'+parts.join('')+'</div>':'';const kws=seoKws(q.q||'').map(w=>'<span class="kw">'+seoClean(w)+'</span>').join('');const ansline=(typeof ans==='number')?'<p class="ans"><b>정답</b> '+ans+'번</p>':'';return '<li class="qitem"><div class="qno">'+n+'</div><div class="qbody"><p class="qt">'+seoClean(q.q||'')+'</p><ol class="opts">'+li.join('')+'</ol>'+ansline+exphtml+'<div class="kws">'+kws+'</div></div></li>';}
function seoPage(cert,subjName,round,subjId,qs){const cname=SEO_CERT_NAME[cert]||cert;const n=qs.length;let title,desc,h1,fname;if(round){title=cname+' '+round+'회 '+subjName+' 기출문제 해설 | CertLab';desc=cname+' '+round+'회 '+subjName+' 기출 '+n+'문항. 문제·정답·해설·개념을 CertLab에서 무료로 학습하세요.';h1=cname+' '+round+'회 '+subjName+' 기출문제';fname=cert+'-'+round+'-'+subjId+'.html';}else{title=cname+' '+subjName+' 기출문제 해설 | CertLab';desc=cname+' '+subjName+' 기출 '+n+'문항. 문제·정답·해설·개념을 CertLab에서 무료로 학습하세요.';h1=cname+' '+subjName+' 기출문제';fname=cert+'-'+subjId+'.html';}const url='https://certlab.ai.kr/seo/'+fname;const ld={'@context':'https://schema.org','@graph':[{'@type':'EducationalOrganization','@id':'https://certlab.ai.kr/#org','name':'CertLab','alternateName':'서트랩','url':'https://certlab.ai.kr/'},{'@type':'LearningResource','name':title,'description':desc,'url':url,'inLanguage':'ko','learningResourceType':'기출문제·해설','educationalUse':'시험대비','about':cname,'isPartOf':{'@id':'https://certlab.ai.kr/#org'},'publisher':{'@id':'https://certlab.ai.kr/#org'},'isAccessibleForFree':true},{'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'CertLab 기출문제','item':'https://certlab.ai.kr/seo/index.html'},{'@type':'ListItem','position':2,'name':cname,'item':url}]}]};const ldjson=JSON.stringify(ld);const qhtml=qs.map((q,i)=>seoQ(i+1,q)).join('\n');const doc='<!doctype html><html lang="ko"><head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+seoEsc(title)+'</title>\n<meta name="description" content="'+seoEsc(desc)+'">\n<link rel="canonical" href="'+url+'">\n<meta property="og:title" content="'+seoEsc(title)+'">\n<meta property="og:description" content="'+seoEsc(desc)+'">\n<meta property="og:url" content="'+url+'">\n<meta property="og:type" content="article">\n<scr'+'ipt type="application/ld+json">'+ldjson+'<\/script>\n<style>'+SEO_STYLE+SEO_STYLE_ADD+'</style>\n</head><body>\n<div class="bc"><a href="https://certlab.ai.kr/seo/index.html">CertLab 기출문제</a> › '+seoEsc(cname)+'</div>\n<h1>'+seoEsc(h1)+'</h1>\n<p class="sub">총 '+n+'문항 · 문제·정답·해설·개념 무료 학습</p>\n<a class="cta" href="https://certlab.ai.kr/#'+cert+'">▶ CertLab에서 풀어보기</a>\n<ul>\n'+qhtml+'\n</ul>\n<footer><p>'+seoEsc(cname)+' 전체 기출을 복습·예상점수·자동채점과 함께 학습하려면 <a href="https://certlab.ai.kr/#'+cert+'">CertLab</a>에서 무료로 이용하세요.</p></footer>\n</body></html>';return {fname:fname,html:doc};}
function seoLog(msg){const el=document.getElementById('seoLog');if(!el)return;const t=new Date().toLocaleTimeString('ko-KR');el.textContent+=(el.textContent&&el.textContent!=='대기 중…'?'\n':'')+'['+t+'] '+msg;el.scrollTop=el.scrollHeight;}
async function seoReadAllBanks(){const m=await db.collection('manifest').doc('exams').get();const exams=(m.exists&&m.data().exams)||[];const banks=[];for(const e of exams){for(const sub of (e.subjects||[])){const docId=e.id+'__'+sub.code;try{const bd=await db.collection('banks').doc(docId).get();if(bd.exists){let data=bd.data();if(Array.isArray(data.shards)&&data.shards.length){const qs=[];for(const s of data.shards){const sd=await db.collection('banks').doc(docId+'__'+s).get();if(sd.exists&&Array.isArray(sd.data().questions))qs.push.apply(qs,sd.data().questions);}data=Object.assign({},data,{questions:qs});}banks.push({docId:docId,data:data,subjName:sub.name||sub.code});}}catch(_){}}}return banks;}
function seoCertOfFname(fn){return fn.split('-')[0];}
function seoSitemap(urls,today){const lines=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];urls.forEach(u=>lines.push('<url><loc>'+u+'</loc><lastmod>'+today+'</lastmod></url>'));lines.push('</urlset>');return lines.join('\n')+'\n';}
function seoLabel(fn){const p=fn.slice(0,-5).split('-');if(p.length===3)return p[1]+'회 '+p[2];if(p.length===2)return p[1];return fn;}
function seoHub(urls,SEO_LBL){const pageUrls=urls.filter(u=>!u.endsWith('/seo/index.html'));const bycert={};pageUrls.forEach(u=>{const fn=u.split('/').pop();(bycert[seoCertOfFname(fn)]=bycert[seoCertOfFname(fn)]||[]).push([fn,u]);});const order=SEO_CERT_ORDER.filter(c=>bycert[c]).concat(Object.keys(bycert).filter(c=>SEO_CERT_ORDER.indexOf(c)<0));const css="body{font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;background:#FDF8F5;color:#1e293b;max-width:760px;margin:0 auto;padding:20px 16px;line-height:1.6}h1{font-size:22px;color:#0C447C}h2{font-size:16px;color:#0C447C;margin:18px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}a{color:#0C447C;text-decoration:none}ul{list-style:none;padding:0}li{margin:5px 0}.cta{display:inline-block;background:#0C447C;color:#fff;padding:10px 18px;border-radius:10px;font-weight:700;margin:8px 0 4px}footer{margin-top:24px;color:#94a3b8;font-size:13px;border-top:1px solid #e2e8f0;padding-top:14px}";const secs=order.map(c=>{const cname=SEO_CERT_NAME[c]||c;const items=bycert[c].map(p=>{var pr=p[0].slice(0,-5).split('-');var sj=(SEO_LBL&&SEO_LBL[p[0]])||(pr.length>=3?pr.slice(2).join('-'):pr[1]);var rn=(pr.length>=3)?(pr[1]+'회 '):'';return '<li><a href="'+p[1]+'">'+seoEsc(cname)+' '+rn+seoEsc(sj)+' 기출문제</a></li>';}).join('');return '<h2>'+seoEsc(cname)+'</h2><ul>'+items+'</ul>';}).join('');return '<!doctype html><html lang="ko"><head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>CertLab 자격증 기출문제 모음 | 감정평가사·공인중개사·주택관리사·한국사·보디빌딩</title>\n<meta name="description" content="감정평가사·공인중개사·주택관리사·한국사·생활스포츠지도사 보디빌딩 기출문제와 원본 해설을 CertLab에서 무료로. 망각곡선 자동복습·예상점수·자동채점.">\n<link rel="canonical" href="https://certlab.ai.kr/seo/index.html">\n<style>'+css+'</style>\n</head><body>\n<h1>CertLab 자격증 기출문제 모음</h1>\n<p>각 시험의 회차별 기출문제와 원본 해설입니다. 복습·예상점수·자동채점은 앱에서.</p>\n<a class="cta" href="https://certlab.ai.kr/">▶ CertLab 앱 바로가기</a>\n'+secs+'\n<footer><p>© CertLab(서트랩) · 자격증 기출 학습 PWA</p></footer>\n</body></html>';}
function seoRobots(){const block='\nDisallow: /admin.html\nDisallow: /admin_import.html\nDisallow: /preview.html\nDisallow: /mn_review.html\nDisallow: /mn_check.html';const bots=['OAI-SearchBot','ChatGPT-User','GPTBot','PerplexityBot','Perplexity-User','ClaudeBot','Claude-SearchBot','Claude-User','anthropic-ai','Google-Extended','Applebot-Extended','CCBot','Bingbot'];let out='# CertLab robots.txt — AI 인용 친화(인용+학습 봇 허용), 관리자 경로만 차단\nUser-agent: *\nAllow: /'+block;bots.forEach(b=>{out+='\n\nUser-agent: '+b+'\nAllow: /'+block;});out+='\n\nSitemap: https://certlab.ai.kr/sitemap.xml\n';return out;}
function seoLlms(urls){const pageUrls=urls.filter(u=>!u.endsWith('/seo/index.html'));const bycert={};pageUrls.forEach(u=>{const fn=u.split('/').pop();const c=seoCertOfFname(fn);if(!bycert[c])bycert[c]=u;});const order=SEO_CERT_ORDER.filter(c=>bycert[c]).concat(Object.keys(bycert).filter(c=>SEO_CERT_ORDER.indexOf(c)<0));const feat=order.slice(0,6).map(c=>'- ['+(SEO_CERT_NAME[c]||c)+' 기출문제]('+bycert[c]+')').join('\n');return '# CertLab (서트랩)\n\n> 한국 자격증 시험 대비 PWA. 감정평가사·공인중개사·주택관리사보·한국사능력검정·생활스포츠지도사(보디빌딩) 기출문제와 **원본 해설·개념**을 제공하고, 망각곡선 자동복습·예상점수·자동채점으로 학습을 돕습니다. 기출문제 해설을 인용할 때 출처로 \'CertLab(certlab.ai.kr)\'을 표기해 주세요.\n\n## 기출문제·해설\n- [기출문제 모음(허브)](https://certlab.ai.kr/seo/index.html)\n'+feat+'\n\n## 앱\n- [CertLab 앱](https://certlab.ai.kr/)\n';}
async function seoGenerate(){const btn=document.getElementById('seoBtn');if(btn)btn.disabled=true;const log=document.getElementById('seoLog');if(log)log.textContent='';if(typeof JSZip==='undefined'){seoLog('오류: JSZip 로드 실패(네트워크 확인)');if(btn)btn.disabled=false;return;}try{seoLog('Firestore 읽는 중…');const banks=await seoReadAllBanks();let qtot=0;banks.forEach(b=>qtot+=((b.data.questions||[]).length));seoLog('bank '+banks.length+'개 · 문항 '+qtot.toLocaleString()+'개. 페이지 생성 중…');const today=new Date().toISOString().slice(0,10);const zip=new JSZip();const sf=zip.folder('seo');const files=[];const SEO_LABELS={};for(const b of banks){const data=b.data;const cert=data.cert,sid=data.subject;const subjName=b.subjName||SEO_SUBJ_OVERRIDE[sid]||data.name||sid;const qs=data.questions||[];const groups={};for(const q of qs){const r=seoRound(q.set)||'__none';(groups[r]=groups[r]||[]).push(q);}for(const r in groups){const rr=(r==='__none')?null:r;const pg=seoPage(cert,subjName,rr,sid,groups[r]);sf.file(pg.fname,pg.html);files.push(pg.fname);SEO_LABELS[pg.fname]=subjName;}}const urls=['https://certlab.ai.kr/seo/index.html'].concat(files.map(f=>'https://certlab.ai.kr/seo/'+f));sf.file('index.html',seoHub(urls,SEO_LABELS));zip.file('sitemap.xml',seoSitemap(urls,today));zip.file('robots.txt',seoRobots());zip.file('llms.txt',seoLlms(urls));seoLog('페이지 '+files.length+'장 + 허브·sitemap·robots·llms 생성. 압축 중…');const blob=await zip.generateAsync({type:'blob'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='certlab_seo.zip';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u);seoLog('✅ 완료 — certlab_seo.zip 다운로드됨. 압축 풀어 GitHub 루트에 업로드(seo/ + sitemap.xml·robots.txt·llms.txt).');}catch(e){seoLog('오류: '+(e&&e.message||e));}if(btn)btn.disabled=false;}

// ===== 이미지 내보내기 (images → JSON) =====
function normKey(v){ if(!v) return null; v=String(v).trim(); return v.indexOf('img://')===0?v.slice(6):v; }
function _qImgKeys(q){ var out=[]; var ik=normKey(q&&q.img); if(ik) out.push(ik); if(q&&Array.isArray(q.optImg)) q.optImg.forEach(function(o){ var ok=normKey(o); if(ok) out.push(ok); }); return out; }
async function exportImages(){
  const st=document.getElementById('imgExpStatus');
  const sel=document.getElementById('imgExpCert'); const pick=(sel&&sel.value)||'__all';
  const subSel=document.getElementById('imgExpSub'); const subPick=(subSel&&subSel.value)||'__all';
  const setSel=document.getElementById('imgExpSet'); const setPick=(setSel&&setSel.value)||'__all';
  st.textContent='읽는 중... 이미지가 많으면 시간이 걸립니다.';
  try{
    let images=[]; let bytes=0;
    if(pick==='__all'){
      const snap=await db.collection('images').get();
      snap.forEach(doc=>{ const d=doc.data()||{}; images.push({key:doc.id, data:d.data||''}); bytes+=(d.data||'').length; });
    } else {
      // 1) 자격증→과목→회차 필터로 참조된 img:// 키 수집 (회차는 문항 단위로 걸러야 해서 문항별 스캔)
      if(!_expExams){ try{ const m=await db.collection('manifest').doc('exams').get(); _expExams=(m.exists&&m.data().exams)||[]; }catch(_){ _expExams=[]; } }
      const exam=(_expExams||[]).find(e=>e.id===pick);
      if(!exam){ st.textContent='해당 자격증을 manifest에서 찾지 못했습니다.'; return; }
      // 과목: 선택값이 이 자격증에 없으면(드롭다운 stale) 무시하고 전체 과목
      let subs=(exam.subjects||[]);
      if(subPick!=='__all'){ const _m=subs.find(s=>s.code===subPick); if(_m) subs=[_m]; }
      const re=/img:\/\/([^\s\"'\\<>\]},]+)/g;
      const setNorm=String(setPick||'').trim();
      const allKeys=new Set();   // 범위(과목) 전체 키
      const filtKeys=new Set();  // 회차 필터 통과 키
      const setsSeen=new Set();  // 데이터에 실제 존재하는 회차(진단용)
      if(setPick==='__levelup'){
        // 레벨업(변형문항) 이미지: adaptive {cert}__{sub}__variantq 스캔
        const re2=/img:\/\/([^\s\"'\\<>\]},]+)/g;
        for(const sub of subs){
          try{ const vd=await db.collection('adaptive').doc(pick+'__'+sub.code+'__variantq').get();
            if(vd.exists){ const t=JSON.stringify((vd.data()||{}).questions||[]); let mm; while((mm=re2.exec(t))!==null){ allKeys.add(mm[1]); filtKeys.add(mm[1]); } ((vd.data()||{}).questions||[]).forEach(function(q){ _qImgKeys(q).forEach(function(kk){ allKeys.add(kk); filtKeys.add(kk); }); }); }
          }catch(_){}
        }
      } else
      for(const sub of subs){
        try{
          const docId=pick+'__'+sub.code;
          const bd=await db.collection('banks').doc(docId).get();
          if(!bd.exists) continue;
          const data=bd.data()||{};
          // 문항 모으기 — 샤딩된 bank는 샤드(=회차) 문서에서 읽음
          let qs=[];
          if(Array.isArray(data.shards)&&data.shards.length){
            data.shards.forEach(v=>{ if(v) setsSeen.add(String(v).trim()); });
            // 특정 회차면 그 샤드만, 전체면 모든 샤드
            const wantShards = (setPick!=='__all') ? data.shards.filter(v=>String(v).trim()===setNorm) : data.shards;
            for(const sh of wantShards){
              try{ const sd=await db.collection('banks').doc(docId+'__'+sh).get(); if(sd.exists&&Array.isArray(sd.data().questions)) qs=qs.concat(sd.data().questions); }catch(_){}
            }
            // 전체 키 집계용으로도 모든 샤드가 필요하면 따로 읽음(폴백 진단용)
            if(setPick!=='__all'){
              for(const sh of data.shards){ try{ const sd=await db.collection('banks').doc(docId+'__'+sh).get(); if(sd.exists&&Array.isArray(sd.data().questions)){ const aqt=JSON.stringify(sd.data().questions); let am; while((am=re.exec(aqt))!==null){ allKeys.add(am[1]); } re.lastIndex=0; sd.data().questions.forEach(function(q){ _qImgKeys(q).forEach(function(kk){ allKeys.add(kk); }); }); } }catch(_){} }
            }
          } else {
            qs=data.questions||[];
          }
          for(const q of qs){
            const qset=String((q&&q.set)||'').trim(); if(qset) setsSeen.add(qset);
            const inSet=(setPick==='__all')||(qset===setNorm)|| (Array.isArray(data.shards)&&data.shards.length>0); // 샤드로 이미 좁혔으면 통과
            const qt=JSON.stringify(q); let m;
            while((m=re.exec(qt))!==null){ allKeys.add(m[1]); if(inSet) filtKeys.add(m[1]); }
            _qImgKeys(q).forEach(function(kk){ allKeys.add(kk); if(inSet) filtKeys.add(kk); });
            re.lastIndex=0;
          }
        }catch(_){}
      }
      let keys; var _setFellBack=false;
      if(setPick!=='__all' && filtKeys.size){ keys=[...filtKeys]; }
      else if(setPick!=='__all' && !filtKeys.size && allKeys.size){ keys=[...allKeys]; _setFellBack=true; }  // 회차 매칭 실패 → 범위 전체로 폴백
      else { keys=[...allKeys]; }
      if(!keys.length){
        const sl=[...setsSeen]; const slTxt=sl.length?(' <span style="color:#A89C8E">· 데이터 회차: '+sl.join(', ')+'</span>'):' <span style="color:#A89C8E">· (문항에 set 필드 없음)</span>';
        st.innerHTML='이 범위 문항에 사용된 이미지가 없습니다.'+slTxt; return;
      }
      // 2) 키별 이미지 문서 fetch
      st.textContent='이미지 '+keys.length+'개 읽는 중...';
      let miss=0;
      for(const k of keys){
        try{ const idoc=await db.collection('images').doc(k).get();
          if(idoc.exists){ const d=idoc.data()||{}; images.push({key:k, data:d.data||''}); bytes+=(d.data||'').length; }
          else miss++;
        }catch(_){ miss++; }
      }
      if(!images.length){ st.textContent='참조된 이미지 키는 있으나 Firestore images에 저장된 이미지가 없습니다. (업로드 필요)'; return; }
      var _miss=miss; var _setsSeen=[...setsSeen];
    }
    if(!images.length){ st.textContent='해당하는 이미지가 없습니다.'; return; }
    const _setTag=(setPick!=='__all')?String(setPick).replace(/[^0-9A-Za-z가-힣]/g,''):'';
    const _fnTail=(pick==='__all'?'all':pick)+(subPick!=='__all'?('_'+subPick):'')+(_setTag?('_'+_setTag):'');
    const bundle={ images, exportedAt:_kstISO(new Date()), cert:(pick==='__all'?null:pick), subject:(subPick==='__all'?null:subPick), set:(setPick==='__all'?null:setPick), count:images.length };
    const blob=new Blob([JSON.stringify(bundle)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url;
    a.download='certlab_images_'+_fnTail+'_'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    st.innerHTML='✅ 이미지 <b>'+images.length+'</b>개 내보내기 완료 (약 '+(Math.round(bytes/1024/1024*10)/10)+'MB)'
      + ((typeof _miss!=='undefined'&&_miss>0)?(' <span style="color:#C2410C">· 미저장 키 '+_miss+'개(업로드 안 된 이미지)</span>'):'')
      + ((typeof _setFellBack!=='undefined'&&_setFellBack)?(' <span style="color:#C2410C">· ⚠ 선택한 회차 "'+setPick+'"에 매칭되는 문항이 없어 <b>과목 전체</b>로 받았습니다. 실제 회차: '+((typeof _setsSeen!=='undefined'&&_setsSeen.length)?_setsSeen.join(', '):'(set 필드 없음)')+'</span>'):'') + '.';
  }catch(e){ st.textContent='오류: '+e.message; }
}

// ===== 🖼️ 이미지 라이브러리 (전체 이미지 보기·다운로드·재사용) =====
let _imgLib=null, _imgLibInited=false, _imgLibUsage=null;
function imgLibInit(){ if(_imgLibInited) return; _imgLibInited=true; imgLibLoad(); }
async function imgLibLoad(){
  const st=document.getElementById('imgLibStatus'); const grid=document.getElementById('imgLibGrid');
  st.textContent='이미지 읽는 중…'; grid.innerHTML='';
  try{
    const snap=await db.collection('images').get();
    _imgLib=[]; let bytes=0;
    snap.forEach(doc=>{ const d=doc.data()||{}; const data=d.data||''; _imgLib.push({key:doc.id, data:data, size:data.length}); bytes+=data.length; });
    _imgLib.sort((a,b)=>a.key<b.key?-1:1);
    st.textContent='사용처 스캔 중… (문항에서 img:// 참조 수집)';
    await _imgLibScan();
    const unused=_imgLib.filter(im=>!_imgLibUsage.has(im.key)).length;
    st.innerHTML='총 <b>'+_imgLib.length+'</b>개 · 사용 중 '+_imgLibUsage.size+' · <b style="color:#B4531E">미사용 '+unused+'</b> · 약 '+(Math.round(bytes/1024/1024*10)/10)+'MB';
    imgLibRender();
  }catch(e){ st.textContent='오류: '+e.message; }
}
// 사용처 스캔: banks(+shards)·adaptive variantq에서 img:// 참조 키 수집
async function _imgLibScan(){
  _imgLibUsage=new Set();
  if(!_expExams){ try{ const m=await db.collection('manifest').doc('exams').get(); _expExams=(m.exists&&m.data().exams)||[]; }catch(_){ _expExams=[]; } }
  const re=/img:\/\/([^\s\"'\\<>\]},]+)/g;
  const collect=(txt)=>{ let m; while((m=re.exec(txt))!==null) _imgLibUsage.add(m[1]); re.lastIndex=0; };
  for(const exam of (_expExams||[])){
    for(const sub of (exam.subjects||[])){
      const docId=exam.id+'__'+sub.code;
      try{ const bd=await db.collection('banks').doc(docId).get();
        if(bd.exists){ const data=bd.data()||{};
          if(Array.isArray(data.shards)&&data.shards.length){
            for(const sh of data.shards){ try{ const sd=await db.collection('banks').doc(docId+'__'+sh).get(); if(sd.exists) collect(JSON.stringify(sd.data().questions||[])); }catch(_){} }
          } else collect(JSON.stringify(data.questions||[]));
        }
      }catch(_){}
      try{ const vd=await db.collection('adaptive').doc(docId+'__variantq').get(); if(vd.exists) collect(JSON.stringify((vd.data()||{}).questions||[])); }catch(_){}
    }
  }
}
function _imgLibFiltered(){
  if(!_imgLib) return [];
  const mode=((document.getElementById('imgLibMode')||{}).value)||'unused';
  const q=((document.getElementById('imgLibSearch')||{}).value||'').trim().toLowerCase();
  return _imgLib.filter(im=>{
    if(q && im.key.toLowerCase().indexOf(q)<0) return false;
    const used=_imgLibUsage?_imgLibUsage.has(im.key):false;
    if(mode==='unused') return !used;
    if(mode==='used') return used;
    return true;
  });
}
function _imgLibExt(dataURL){ const m=/^data:image\/(png|jpeg|jpg|webp|gif);/i.exec(dataURL||''); return m?(m[1]==='jpeg'?'jpg':m[1]):'png'; }
function imgLibRender(){
  const grid=document.getElementById('imgLibGrid'); if(!grid||!_imgLib) return;
  const list=_imgLibFiltered();
  const cnt=document.getElementById('imgLibCount'); if(cnt) cnt.textContent='표시 '+list.length+' / 전체 '+_imgLib.length;
  if(!list.length){ grid.innerHTML='<div style="color:#A89C8E;font-size:13px;padding:10px">표시할 이미지가 없습니다.</div>'; return; }
  grid.innerHTML=list.map(im=>{
    const kb=Math.round(im.size/1024);
    const used=_imgLibUsage?_imgLibUsage.has(im.key):false;
    const chip='<span style="font-size:10.5px;padding:1px 7px;border-radius:10px;'+(used?'background:#E7F5EC;color:#1E7A45':'background:#FCEDE6;color:#B4531E')+'">'+(used?'사용 중':'미사용')+'</span>';
    return '<div class="imglibcard" style="position:relative;border:1px solid #EDE7DF;border-radius:10px;overflow:hidden;background:#fff">'
      + '<input type="checkbox" class="imglibchk" data-k="'+im.key.replace(/"/g,"&quot;")+'" onclick="imgLibChkSync(this)" style="position:absolute;top:7px;left:7px;width:18px;height:18px;z-index:3;accent-color:#185FA5;cursor:pointer">'
      + '<div style="background:#F7F4EF;height:120px;display:flex;align-items:center;justify-content:center;overflow:hidden">'
      + (im.data?('<img src="'+im.data+'" style="max-width:100%;max-height:120px;object-fit:contain">'):'<span style="color:#C4B8AA;font-size:11px">데이터 없음</span>')
      + '</div>'
      + '<div style="padding:8px 10px">'
      + '<div style="font-family:monospace;font-size:11px;color:#3B342C;word-break:break-all;line-height:1.4;cursor:pointer" title="클릭하면 키 복사" onclick="imgLibCopyKey(this,\''+im.key.replace(/'/g,"\\'")+'\')">'+im.key+'</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;gap:6px">'
      + '<span style="font-size:10.5px;color:#A89C8E">'+kb+'KB '+chip+'</span>'
      + '<span style="display:flex;gap:5px">'
      + '<button onclick="imgLibDownload(\''+im.key.replace(/'/g,"\\'")+'\')" style="background:#7F77DD;color:#fff;border:none;border-radius:8px;padding:5px 9px;font-size:11px;cursor:pointer">⬇</button>'
      + '<button onclick="imgLibDelete(\''+im.key.replace(/'/g,"\\'")+'\')" style="background:#FCEBEA;color:#C0392B;border:none;border-radius:8px;padding:5px 9px;font-size:11px;cursor:pointer">🗑</button>'
      + '</span>'
      + '</div></div></div>';
  }).join('');
}
function imgLibCopyKey(el,key){
  try{ navigator.clipboard.writeText('img://'+key); }catch(_){}
  const old=el.textContent; el.textContent='복사됨: img://'+key; el.style.color='#1E7A45';
  setTimeout(()=>{ el.textContent=old; el.style.color='#3B342C'; },1100);
}
function imgLibDownload(key){
  const im=(_imgLib||[]).find(x=>x.key===key); if(!im||!im.data) return;
  const a=document.createElement('a'); a.href=im.data; a.download=key+'.'+_imgLibExt(im.data);
  document.body.appendChild(a); a.click(); a.remove();
}
// 현재 표시 중(기본=미사용) 이미지들을 이미지 내보내기와 동일한 JSON 번들로 저장 → 이미지 업로드로 복원 가능
function imgLibExport(){
  const list=_imgLibFiltered();
  if(!list.length){ alert('내보낼 이미지가 없습니다.'); return; }
  const mode=((document.getElementById('imgLibMode')||{}).value)||'unused';
  const images=list.map(im=>({key:im.key, data:im.data}));
  let bytes=0; images.forEach(im=>bytes+=(im.data||'').length);
  const bundle={ images, exportedAt:(typeof _kstISO==='function'?_kstISO(new Date()):new Date().toISOString()), source:'imglib_'+mode, count:images.length };
  const blob=new Blob([JSON.stringify(bundle)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='certlab_images_'+mode+'_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  const st=document.getElementById('imgLibStatus'); if(st) st.innerHTML='✅ '+images.length+'개 이미지 내보내기 완료 (약 '+(Math.round(bytes/1024/1024*10)/10)+'MB) — 이미지 업로드로 복원 가능';
}
// 개별 삭제 (되돌릴 수 없음)
async function imgLibDelete(key){
  if(!confirm('이미지 "'+key+'" 를 삭제합니다.\n되돌릴 수 없습니다. 계속할까요?')) return;
  if(_imgLibUsage && _imgLibUsage.has(key) && !confirm('⚠ 이 이미지는 문항에서 사용 중입니다.\n삭제하면 그 문항의 그림이 깨집니다. 그래도 삭제할까요?')) return;
  try{
    await db.collection('images').doc(key).delete();
    _imgLib=(_imgLib||[]).filter(im=>im.key!==key);
    if(_imgLibUsage) _imgLibUsage.delete(key);
    imgLibRender();
    const st=document.getElementById('imgLibStatus'); if(st) st.innerHTML='🗑 삭제됨: '+key;
  }catch(e){ alert('삭제 실패: '+(e.message||e)+'\n\n(권한 오류면 Firestore 규칙에서 images 삭제 허용 필요)'); }
}
// 표시된 목록 중 '미사용'만 일괄 삭제 (사용 중은 자동 제외, 되돌릴 수 없음)
async function imgLibDeleteShown(){
  const list=_imgLibFiltered();
  const del=list.filter(im=>!(_imgLibUsage&&_imgLibUsage.has(im.key)));
  const usedSkip=list.length-del.length;
  if(!del.length){ alert('삭제할 미사용 이미지가 없습니다.'+(usedSkip?(' (사용 중 '+usedSkip+'개는 제외)'):'')); return; }
  if(!confirm('미사용 이미지 '+del.length+'개를 삭제합니다.'+(usedSkip?('\n(사용 중 '+usedSkip+'개는 안전을 위해 제외)'):'')+'\n\n되돌릴 수 없습니다. 계속할까요?')) return;
  const st=document.getElementById('imgLibStatus'); let ok=0, fail=0;
  for(const im of del){
    try{ await db.collection('images').doc(im.key).delete(); _imgLib=(_imgLib||[]).filter(x=>x.key!==im.key); ok++; }
    catch(e){ fail++; }
    if(st) st.textContent='삭제 중… '+ok+'/'+del.length;
  }
  imgLibRender();
  if(st) st.innerHTML='🗑 삭제 완료 <b>'+ok+'</b>개'+(fail?(' · <span style="color:#C0392B">실패 '+fail+'</span> (권한 오류면 Firestore 규칙 확인)'):'')+(usedSkip?(' · 사용 중 '+usedSkip+' 제외'):'');
}
// 체크박스 선택 삭제 (사용 중도 경고 후 삭제 가능)
function imgLibChkSync(chk){ var c=chk.closest('.imglibcard'); if(c) c.style.outline=chk.checked?'2.5px solid #185FA5':''; if(c) c.style.outlineOffset=chk.checked?'-2px':''; }
function imgLibToggleAll(m){ Array.prototype.slice.call(document.querySelectorAll('.imglibchk')).forEach(function(c){ c.checked=m.checked; imgLibChkSync(c); }); }
async function imgLibChkDelete(){
  var chks=Array.prototype.slice.call(document.querySelectorAll('.imglibchk:checked'));
  if(!chks.length){ alert('체크된 이미지가 없습니다.'); return; }
  var keys=chks.map(function(c){ return c.getAttribute('data-k'); });
  var usedN=keys.filter(function(k){ return _imgLibUsage&&_imgLibUsage.has(k); }).length;
  if(!confirm('체크한 이미지 '+keys.length+'개를 삭제합니다.'+(usedN?('\n⚠ 이 중 '+usedN+'개는 문항에서 사용 중 — 삭제하면 그림이 깨집니다.'):'')+'\n\n되돌릴 수 없습니다. 계속할까요?')) return;
  var st=document.getElementById('imgLibStatus'); var okN=0, failN=0;
  for(var i=0;i<keys.length;i++){
    try{ await db.collection('images').doc(keys[i]).delete(); _imgLib=(_imgLib||[]).filter(function(x){return x.key!==keys[i];}); if(_imgLibUsage) _imgLibUsage.delete(keys[i]); okN++; }
    catch(e){ failN++; }
    if(st) st.textContent='삭제 중… '+okN+'/'+keys.length;
  }
  var sa=document.getElementById('imgLibSelAll'); if(sa) sa.checked=false;
  imgLibRender();
  if(st) st.innerHTML='🗑 체크 삭제 완료 <b>'+okN+'</b>개'+(failN?(' · <span style="color:#C0392B">실패 '+failN+'</span>'):'');
}
// ===== 🗑️ 마스터 삭제 (문항·개념에서 안 쓰인 미사용 개념·표·암기·그래프 정리) =====
let _mstAll=null, _mstUsed=null, _mstScanStat=null;
function _mstFillCerts(){
  const sel=document.getElementById('mstCert'); if(!sel||!_mstAll) return;
  const cur=sel.value; const set={};
  _mstAll.forEach(m=>{ (m.certs||[]).forEach(c=>{ if(c) set[c]=(set[c]||0)+1; }); });
  const certs=Object.keys(set).sort();
  sel.innerHTML='<option value="">전체 시험</option>'+certs.map(c=>'<option value="'+c.replace(/"/g,'&quot;')+'">'+c+' ('+set[c]+')</option>').join('')+'<option value="__none__">(시험 미지정)</option>';
  if(cur && (cur==='__none__' || certs.indexOf(cur)>=0)) sel.value=cur;
}
function _mstStrip(u){ return String(u||'').replace(/^(cpt|tbl|mn|grp):\/\//,''); }
function _mstSetOf(type){ return _mstUsed[type==='concept'?'cpt':(type==='table'?'tbl':(type==='mnemonic'?'mn':'grp'))]; }
function _mstKo(type){ return type==='concept'?'개념':(type==='table'?'표':(type==='mnemonic'?'암기':'그래프')); }
async function mstLoad(){
  const st=document.getElementById('mstStatus'), box=document.getElementById('mstList');
  st.textContent='마스터 읽는 중…'; if(box) box.innerHTML='';
  try{
    _mstAll=[];
    const load=async(coll,type)=>{ const snap=await db.collection(coll).get(); snap.forEach(doc=>{ const d=doc.data()||{}; _mstAll.push({type:type, coll:coll, id:doc.id, name:d.name||'', certs:(Array.isArray(d.certs)?d.certs:[]), tbl:(Array.isArray(d.tbl)?d.tbl:[]), mn:(Array.isArray(d.mn)?d.mn:[]), grp:(Array.isArray(d.grp)?d.grp:[]), _raw:d }); }); };
    await load('concepts','concept'); await load('tables','table'); await load('mnemonics','mnemonic');
    try{ await load('graphs','graph'); }catch(_){}
    st.textContent='사용처 스캔 중… (문항 exp.cpt·개념 tbl/mn/grp 링크 수집)';
    await _mstScan();
    _mstAll.forEach(m=>{ m.used=_mstSetOf(m.type).has(m.id); });
    _mstFillCerts();
    const by={concept:[0,0],table:[0,0],mnemonic:[0,0],graph:[0,0]};
    _mstAll.forEach(m=>{ by[m.type][0]++; if(!m.used) by[m.type][1]++; });
    const sc=_mstScanStat||{ok:0,fail:0};
    const cov='<span style="color:'+(sc.fail?'#C0392B':'#8A7E70')+'">문항은행 '+sc.ok+'개 읽음'+(sc.fail?(' · <b>실패 '+sc.fail+'개 ⚠ 이 상태로는 미사용 판정을 믿지 마세요</b>'):'')+'</span>';
    st.innerHTML='개념 <b>'+by.concept[0]+'</b>(미사용 <b style="color:#B4531E">'+by.concept[1]+'</b>) · 표 <b>'+by.table[0]+'</b>(미사용 <b style="color:#B4531E">'+by.table[1]+'</b>) · 암기 <b>'+by.mnemonic[0]+'</b>(미사용 <b style="color:#B4531E">'+by.mnemonic[1]+'</b>) · 그래프 <b>'+by.graph[0]+'</b>(미사용 <b style="color:#B4531E">'+by.graph[1]+'</b>)<br>'+cov;
    mstRender();
  }catch(e){ st.textContent='오류: '+(e.message||e); }
}
async function _mstScan(){
  _mstUsed={cpt:new Set(), tbl:new Set(), mn:new Set(), grp:new Set()};
  _mstScanStat={ok:0, fail:0};
  if(typeof _expExams==='undefined' || !_expExams){ try{ const m=await db.collection('manifest').doc('exams').get(); _expExams=(m.exists&&m.data().exams)||[]; }catch(_){ _expExams=[]; } }
  const reT=/tbl:\/\/([^\s"'\\<>\]},]+)/g, reM=/mn:\/\/([^\s"'\\<>\]},]+)/g, reG=/grp:\/\/([^\s"'\\<>\]},]+)/g, reC=/cpt:\/\/([^\s"'\\<>\]},]+)/g;
  // 접두사(://) 없이 exp.cpt·exp.ot[].cpt·기타 필드에 박힌 bare id(cpt_/tbl_/mn_/grp_)도 전부 '사용 중'으로 수집 — 과다수집(안전 방향)
  const reBareC=/cpt_[A-Za-z0-9_]+/g, reBareT=/tbl_[A-Za-z0-9_]+/g, reBareM=/mn_[A-Za-z0-9_]+/g, reBareG=/grp_[A-Za-z0-9_]+/g;
  const grab=(re,set,txt)=>{ let m; re.lastIndex=0; while((m=re.exec(txt))!==null) set.add(m[1]); };
  const grab0=(re,set,txt)=>{ let m; re.lastIndex=0; while((m=re.exec(txt))!==null) set.add(m[0]); };
  const scanQs=(qs)=>{ (qs||[]).forEach(q=>{ const cpt=(q&&q.exp&&q.exp.cpt)||[]; (Array.isArray(cpt)?cpt:[cpt]).forEach(c=>{ if(c) _mstUsed.cpt.add(_mstStrip(c)); }); const txt=JSON.stringify(q||{}); grab(reT,_mstUsed.tbl,txt); grab(reM,_mstUsed.mn,txt); grab(reG,_mstUsed.grp,txt); grab(reC,_mstUsed.cpt,txt); grab0(reBareC,_mstUsed.cpt,txt); grab0(reBareT,_mstUsed.tbl,txt); grab0(reBareM,_mstUsed.mn,txt); grab0(reBareG,_mstUsed.grp,txt); }); };
  for(const exam of (_expExams||[])){
    for(const sub of (exam.subjects||[])){
      const docId=exam.id+'__'+sub.code;
      try{ const bd=await db.collection('banks').doc(docId).get();
        if(bd.exists){ const data=bd.data()||{};
          if(Array.isArray(data.shards)&&data.shards.length){ for(const sh of data.shards){ try{ const sd=await db.collection('banks').doc(docId+'__'+sh).get(); if(sd.exists) scanQs(sd.data().questions||[]); }catch(_){ _mstScanStat.fail++; } } }
          else scanQs(data.questions||[]);
          _mstScanStat.ok++;
        }
      }catch(_){ _mstScanStat.fail++; }
      try{ const vd=await db.collection('adaptive').doc(docId+'__variantq').get(); if(vd.exists) scanQs((vd.data()||{}).questions||[]); }catch(_){}
    }
  }
  // 개념이 물고 있는 표·암기·그래프 링크는 '사용 중'으로 간주(개념을 먼저 지운 뒤 재스캔하면 새 고아가 드러남)
  (_mstAll||[]).forEach(c=>{ if(c.type!=='concept') return; (c.tbl||[]).forEach(r=>_mstUsed.tbl.add(_mstStrip(r))); (c.mn||[]).forEach(r=>_mstUsed.mn.add(_mstStrip(r))); (c.grp||[]).forEach(r=>_mstUsed.grp.add(_mstStrip(r))); });
}
function _mstFiltered(){
  if(!_mstAll) return [];
  const type=((document.getElementById('mstType')||{}).value)||'all';
  const mode=((document.getElementById('mstMode')||{}).value)||'unused';
  const cert=((document.getElementById('mstCert')||{}).value)||'';
  const q=((document.getElementById('mstSearch')||{}).value||'').trim().toLowerCase();
  return _mstAll.filter(m=>{
    if(type!=='all' && m.type!==type) return false;
    if(mode==='unused' && m.used) return false;
    if(mode==='used' && !m.used) return false;
    if(cert==='__none__'){ if((m.certs||[]).length) return false; }
    else if(cert){ if((m.certs||[]).indexOf(cert)<0) return false; }
    if(q && (m.id.toLowerCase().indexOf(q)<0 && (m.name||'').toLowerCase().indexOf(q)<0)) return false;
    return true;
  });
}
function mstRender(){
  const box=document.getElementById('mstList'); if(!box||!_mstAll) return;
  const list=_mstFiltered();
  if(!list.length){ box.innerHTML='<div style="color:#A89C8E;font-size:13px;padding:10px">표시할 마스터가 없습니다.</div>'; return; }
  const tk={concept:['개념','#EAF1FB','#215787'],table:['표','#EAF6EE','#1E7A45'],mnemonic:['암기','#F5EFFB','#6B3FA0'],graph:['그래프','#FBF1E6','#B4531E']};
  const rows=list.map(m=>{
    const t=tk[m.type]||['?','#eee','#555'];
    const chip='<span style="font-size:10.5px;padding:1px 7px;border-radius:10px;'+(m.used?'background:#E7F5EC;color:#1E7A45':'background:#FCEDE6;color:#B4531E')+'">'+(m.used?'사용 중':'미사용')+'</span>';
    const idEsc=m.id.replace(/'/g,"\\'");
    return '<tr style="border-bottom:1px solid #F0ECE5">'
      + '<td style="padding:7px 8px"><input type="checkbox" class="mstchk" data-id="'+m.id.replace(/"/g,"&quot;")+'" data-type="'+m.type+'" style="width:16px;height:16px;accent-color:#185FA5;cursor:pointer"></td>'
      + '<td style="padding:7px 8px"><span style="font-size:11px;padding:2px 8px;border-radius:9px;background:'+t[1]+';color:'+t[2]+';font-weight:700">'+t[0]+'</span></td>'
      + '<td style="padding:7px 8px;font-family:monospace;font-size:11.5px;color:#3B342C;word-break:break-all">'+m.id+'</td>'
      + '<td style="padding:7px 8px;font-size:12.5px;color:#4A4237">'+(m.name||'<span style=\"color:#C4B8AA\">(이름 없음)</span>')+'</td>'
      + '<td style="padding:7px 8px;font-size:11px;color:#A89C8E">'+((m.certs||[]).join(', ')||'-')+'</td>'
      + '<td style="padding:7px 8px">'+chip+'</td>'
      + '<td style="padding:7px 8px"><button onclick="mstDelete(\''+idEsc+'\',\''+m.type+'\')" style="background:#FCEBEA;color:#C0392B;border:none;border-radius:8px;padding:4px 9px;font-size:11px;cursor:pointer">🗑</button></td>'
      + '</tr>';
  }).join('');
  box.innerHTML='<div style="font-size:12px;color:#6E6256;margin-bottom:6px">표시 <b>'+list.length+'</b> / 전체 '+_mstAll.length+'</div>'
    + '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#F7F4EF;text-align:left">'
    + '<th style="padding:7px 8px;width:34px"></th><th style="padding:7px 8px;width:64px">종류</th><th style="padding:7px 8px">id</th><th style="padding:7px 8px">이름</th><th style="padding:7px 8px;width:90px">시험</th><th style="padding:7px 8px;width:64px">상태</th><th style="padding:7px 8px;width:48px"></th>'
    + '</tr></thead><tbody>'+rows+'</tbody></table>';
}
// 표시 중(기본=미사용) 마스터를 종류별로 묶어 복원 가능한 백업 JSON으로 저장
function mstExport(){
  const list=_mstFiltered();
  if(!list.length){ alert('내보낼 마스터가 없습니다.'); return; }
  const bundle={ concepts:[], tables:[], mnemonics:[], graphs:[] };
  list.forEach(m=>{ const raw=Object.assign({id:m.id}, m._raw||{}); if(m.type==='concept') bundle.concepts.push(raw); else if(m.type==='table') bundle.tables.push(raw); else if(m.type==='mnemonic') bundle.mnemonics.push(raw); else bundle.graphs.push(raw); });
  bundle.exportedAt=(typeof _kstISO==='function'?_kstISO(new Date()):new Date().toISOString());
  bundle.source='mstdel_backup'; bundle.count=list.length;
  const blob=new Blob([JSON.stringify(bundle)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='certlab_masters_backup_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  const st=document.getElementById('mstStatus'); if(st) st.innerHTML='✅ '+list.length+'개 마스터 백업 완료 (개념 '+bundle.concepts.length+' · 표 '+bundle.tables.length+' · 암기 '+bundle.mnemonics.length+' · 그래프 '+bundle.graphs.length+')';
}
async function _mstDoDelete(id,type){ const m=(_mstAll||[]).find(x=>x.id===id&&x.type===type); if(!m) return false; await db.collection(m.coll).doc(id).delete(); _mstAll=_mstAll.filter(x=>!(x.id===id&&x.type===type)); const set=_mstSetOf(type); if(set) set.delete(id); return true; }
async function mstDelete(id,type){
  const m=(_mstAll||[]).find(x=>x.id===id&&x.type===type); if(!m) return;
  if(!confirm(_mstKo(type)+' "'+id+'"'+(m.name?(' ('+m.name+')'):'')+' 를 삭제합니다.\n되돌릴 수 없습니다. 계속할까요?')) return;
  if(m.used && !confirm('⚠ 이 '+_mstKo(type)+'는 문항 또는 개념에서 사용 중입니다.\n삭제하면 그 참조가 깨집니다(고아·죽은 링크). 그래도 삭제할까요?')) return;
  const st=document.getElementById('mstStatus');
  try{ await _mstDoDelete(id,type); mstRender(); if(st) st.innerHTML='🗑 삭제됨: '+_mstKo(type)+' '+id; }
  catch(e){ alert('삭제 실패: '+(e.message||e)+'\n\n(권한 오류면 Firestore 규칙에서 해당 컬렉션 삭제 허용 필요)'); }
}
async function mstDeleteShown(){
  const list=_mstFiltered();
  const del=list.filter(m=>!m.used); const usedSkip=list.length-del.length;
  if(!del.length){ alert('삭제할 미사용 마스터가 없습니다.'+(usedSkip?(' (사용 중 '+usedSkip+'개는 제외)'):'')); return; }
  if(!confirm('미사용 마스터 '+del.length+'개를 삭제합니다.'+(usedSkip?('\n(사용 중 '+usedSkip+'개는 안전을 위해 제외)'):'')+'\n\n되돌릴 수 없습니다. 백업(내보내기)했나요? 계속할까요?')) return;
  const st=document.getElementById('mstStatus'); let ok=0, fail=0;
  for(const m of del){ try{ await _mstDoDelete(m.id,m.type); ok++; }catch(e){ fail++; } if(st) st.textContent='삭제 중… '+ok+'/'+del.length; }
  const sa=document.getElementById('mstSelAll'); if(sa) sa.checked=false;
  mstRender();
  if(st) st.innerHTML='🗑 삭제 완료 <b>'+ok+'</b>개'+(fail?(' · <span style="color:#C0392B">실패 '+fail+'</span> (권한 오류면 Firestore 규칙 확인)'):'')+(usedSkip?(' · 사용 중 '+usedSkip+' 제외'):'')+' — 재스캔하려면 다시 불러오기.';
}
function mstToggleAll(m){ Array.prototype.slice.call(document.querySelectorAll('.mstchk')).forEach(function(c){ c.checked=m.checked; }); }
async function mstChkDelete(){
  const chks=Array.prototype.slice.call(document.querySelectorAll('.mstchk:checked'));
  if(!chks.length){ alert('체크된 마스터가 없습니다.'); return; }
  const items=chks.map(c=>({id:c.getAttribute('data-id'), type:c.getAttribute('data-type')}));
  const usedN=items.filter(it=>{ const m=(_mstAll||[]).find(x=>x.id===it.id&&x.type===it.type); return m&&m.used; }).length;
  if(!confirm('체크한 마스터 '+items.length+'개를 삭제합니다.'+(usedN?('\n⚠ 이 중 '+usedN+'개는 사용 중 — 삭제하면 참조가 깨집니다.'):'')+'\n\n되돌릴 수 없습니다. 계속할까요?')) return;
  const st=document.getElementById('mstStatus'); let ok=0, fail=0;
  for(const it of items){ try{ await _mstDoDelete(it.id,it.type); ok++; }catch(e){ fail++; } if(st) st.textContent='삭제 중… '+ok+'/'+items.length; }
  const sa=document.getElementById('mstSelAll'); if(sa) sa.checked=false;
  mstRender();
  if(st) st.innerHTML='🗑 체크 삭제 완료 <b>'+ok+'</b>개'+(fail?(' · <span style="color:#C0392B">실패 '+fail+'</span>'):'');
}
// ===== 🖼️ 이미지 라이브러리 (문제 무관 보관 — imageLibrary 컬렉션, '이미지 삭제'와 완전 분리) =====
let _imgBank=null, _imgBankInited=false, _imgBankPicked=[];
function imgBankPickInfo(){ var el=document.getElementById('imgBankPick'); if(el) el.textContent=_imgBankPicked.length?('선택된 파일 '+_imgBankPicked.length+'장 — 업로드 대기'):''; }
async function imgBankInit(){
  if(_imgBankInited) return; _imgBankInited=true;
  try{ await _loadSubjNames(); }catch(_){}
  var cm=(typeof _certNameMap!=='undefined'&&_certNameMap)||{};
  var upSel=document.getElementById('imgBankCert'), fSel=document.getElementById('imgBankFilter');
  Object.keys(cm).forEach(function(c){
    var o1=document.createElement('option'); o1.value=c; o1.textContent=cm[c]||c; if(upSel) upSel.appendChild(o1);
    var o2=document.createElement('option'); o2.value=c; o2.textContent=cm[c]||c; if(fSel) fSel.appendChild(o2);
  });
  // 드롭존 배선(다른 업로드 탭과 동일 형식)
  var drop=document.getElementById('imgBankDrop'), file=document.getElementById('imgBankFile');
  if(drop&&file){
    drop.onclick=function(){ file.click(); };
    file.onchange=function(){ _imgBankPicked=[].slice.call(file.files||[]); imgBankPickInfo(); };
    ['dragover','dragenter'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#185FA5';}); });
    ['dragleave'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.style.borderColor='#B9D2EF';}); });
    drop.addEventListener('drop',function(e){ e.preventDefault(); drop.style.borderColor='#B9D2EF'; _imgBankPicked=[].slice.call((e.dataTransfer&&e.dataTransfer.files)||[]).filter(function(f){return /image\//.test(f.type);}); imgBankPickInfo(); });
  }
  imgBankLoad();
}
function imgBankResize(file, maxW, q){
  return new Promise(function(res,rej){
    var img=new Image(), url=URL.createObjectURL(file);
    img.onload=function(){ var w=img.width,h=img.height; if(w>maxW){ h=Math.round(h*maxW/w); w=maxW; }
      var c=document.createElement('canvas'); c.width=w; c.height=h; var ctx=c.getContext('2d');
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h); URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', q||0.9)); };
    img.onerror=function(){ URL.revokeObjectURL(url); rej(new Error('디코드 실패')); };
    img.src=url;
  });
}
async function imgBankUpload(){
  var cert=(document.getElementById('imgBankCert')||{}).value||'';
  var files=_imgBankPicked||[];
  var st=document.getElementById('imgBankUpStatus');
  if(!cert){ st.textContent='시험을 먼저 선택하세요.'; st.style.color='#C0392B'; return; }
  if(!files.length){ st.textContent='이미지를 먼저 넣으세요.'; st.style.color='#C0392B'; return; }
  st.style.color='#6E6256';
  var ok=0, fail=0;
  for(var i=0;i<files.length;i++){
    var f=files[i];
    st.textContent='업로드 중… '+(i+1)+'/'+files.length+' ('+f.name+')';
    try{
      var data=await imgBankResize(f, 1600, 0.9);   // 1600px·0.9 (원본 화질 유지)
      var bytes=Math.round(String(data).length*0.75);
      if(bytes>950000){ fail++; continue; }          // Firestore 1MB 문서 한도
      var key=f.name.replace(/\.[^.]+$/,'').trim(); if(!key) key='img_'+Date.now()+'_'+i;
      await db.collection('imageLibrary').doc(key).set({ data:data, cert:cert, at:firebase.firestore.FieldValue.serverTimestamp() });
      try{ await db.collection('images').doc(key).delete(); }catch(_){}   // 같은 키가 images(문제용)에 있으면 제거 → '이미지 삭제' 미사용에서 자동으로 빠짐
      ok++;
    }catch(e){ fail++; }
  }
  st.textContent='완료 — 성공 '+ok+(fail?(' · 실패/건너뜀 '+fail+'(1MB 초과 등)'):'');
  st.style.color=fail?'#B4531E':'#15793F';
  _imgBankPicked=[]; imgBankPickInfo();
  var fi=document.getElementById('imgBankFile'); if(fi) fi.value='';
  imgBankLoad();
}
async function imgBankLoad(){
  var st=document.getElementById('imgBankStatus'), grid=document.getElementById('imgBankGrid');
  if(!st) return; st.textContent='라이브러리 읽는 중…'; if(grid) grid.innerHTML='';
  try{
    var snap=await db.collection('imageLibrary').get();
    _imgBank=[]; var bytes=0;
    snap.forEach(function(doc){ var d=doc.data()||{}; _imgBank.push({key:doc.id, data:d.data||'', cert:d.cert||'', size:(d.data||'').length}); bytes+=(d.data||'').length; });
    _imgBank.sort(function(a,b){ return a.key<b.key?-1:1; });
    st.innerHTML='총 <b>'+_imgBank.length+'</b>개 · 약 '+(Math.round(bytes/1024/1024*10)/10)+'MB';
    imgBankRender();
  }catch(e){ st.textContent='오류: '+e.message; }
}
function imgBankRender(){
  var grid=document.getElementById('imgBankGrid'); if(!grid||!_imgBank) return;
  var fc=(document.getElementById('imgBankFilter')||{}).value||'';
  var q=((document.getElementById('imgBankSearch')||{}).value||'').trim().toLowerCase();
  var list=_imgBank.filter(function(im){ return (!fc||im.cert===fc) && (!q||im.key.toLowerCase().indexOf(q)>=0); });
  var cnt=document.getElementById('imgBankCount'); if(cnt) cnt.textContent='표시 '+list.length+'개';
  grid.innerHTML = list.map(function(im){
    var nm=(typeof certKo==='function'?certKo(im.cert):im.cert)||'(시험없음)';
    var k=im.key.replace(/'/g,"\\'");
    return '<div class="imgbankcard" style="border:1px solid #E8E8E8;border-radius:10px;padding:8px;background:#fff">'
      +'<img src="'+im.data+'" style="width:100%;height:110px;object-fit:contain;background:#F5F5F5;border-radius:6px" loading="lazy">'
      +'<div style="font-size:11px;color:#185FA5;font-weight:700;margin-top:6px">'+nm+'</div>'
      +'<div style="font-size:11px;color:#6E6256;word-break:break-all;margin:2px 0 6px">'+im.key+'</div>'
      +'<div style="display:flex;gap:5px">'
      +'<button onclick="imgBankDownload(\''+k+'\')" style="flex:1;background:#E8F0FB;color:#185FA5;border:none;border-radius:7px;padding:6px;font-size:11px;font-weight:700;cursor:pointer">⬇ 다운</button>'
      +'<button onclick="imgBankDelete(\''+k+'\')" style="flex:1;background:#FCEBEA;color:#C0392B;border:none;border-radius:7px;padding:6px;font-size:11px;font-weight:700;cursor:pointer">🗑 삭제</button>'
      +'</div></div>';
  }).join('') || '<div style="color:#A89C8E;font-size:13px;padding:20px">이미지가 없습니다. 위에서 시험을 고르고 업로드하세요.</div>';
}
function imgBankDownload(key){
  var im=(_imgBank||[]).find(function(x){return x.key===key;}); if(!im) return;
  var a=document.createElement('a'); a.href=im.data; a.download=key+'.jpg'; document.body.appendChild(a); a.click(); a.remove();
}
async function imgBankDelete(key){
  if(!confirm('이 이미지를 라이브러리에서 삭제할까요?\n'+key)) return;
  try{ await db.collection('imageLibrary').doc(key).delete(); _imgBank=(_imgBank||[]).filter(function(x){return x.key!==key;}); imgBankRender(); }
  catch(e){ alert('삭제 오류: '+e.message); }
}
// ===== 이미지 가져오기 (JSON → images 복구) =====
let imgImpData=null; let _imgImpInited=false;
function imgImpLog(msg,color){ const el=document.getElementById('imgImpLog'); if(!el) return; const t=new Date().toLocaleTimeString('ko-KR'); const line=color?('<span style="color:'+color+'">'+msg+'</span>'):msg; el.innerHTML += (el.innerHTML && el.innerHTML!=='대기 중…'?'\n':'')+'['+t+'] '+line; el.scrollTop=el.scrollHeight; }
function imgImpInit(){
  if(_imgImpInited) return; _imgImpInited=true;
  const drop=document.getElementById('imgImpDrop'), file=document.getElementById('imgImpFile'); if(!drop||!file) return;
  drop.onclick=()=>file.click();
  ['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor='#185FA5';}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor='#D9CFC4';}));
  drop.addEventListener('drop',e=>imgImpHandle(e.dataTransfer.files));
  file.addEventListener('change',e=>imgImpHandle(e.target.files));
}
async function imgImpHandle(fileList){
  const f=[...fileList].find(x=>/\.json$/i.test(x.name)||x.type==='application/json');
  if(!f){ imgImpLog('JSON 파일이 아닙니다.','#f85149'); return; }
  try{
    const txt=await f.text(); const o=JSON.parse(txt);
    const arr=Array.isArray(o)?o:(o.images||[]);
    const valid=arr.filter(x=>x&&x.key&&x.data);
    if(!valid.length){ imgImpLog('이미지 항목을 찾지 못했습니다. (images 배열 필요)','#f85149'); return; }
    imgImpData=valid;
    document.getElementById('imgImpStatus').innerHTML='파일 인식: 이미지 <b>'+valid.length+'</b>개. "복구 실행"을 누르면 Firestore에 올립니다(같은 키 덮어쓰기).';
    document.getElementById('imgImpRun').disabled=false;
    imgImpLog('파일 로드: '+f.name+' — 이미지 '+valid.length+'개','#5B50C0');
  }catch(e){ imgImpLog('파싱 오류: '+(e.message||e),'#f85149'); }
}
async function importImages(){
  if(!imgImpData||!imgImpData.length) return;
  if(!confirm(imgImpData.length+'개 이미지를 Firestore에 복구합니다. 같은 키는 덮어씁니다. 계속할까요?')){ imgImpLog('취소됨.'); return; }
  document.getElementById('imgImpRun').disabled=true;
  let ok=0, fail=0;
  for(const it of imgImpData){
    try{
      await db.collection('images').doc(it.key).set({ data:it.data, at:firebase.firestore.FieldValue.serverTimestamp() });
      ok++; if(ok%10===0) imgImpLog('... '+ok+'개 복구','#15793F');
    }catch(e){ fail++; imgImpLog('✗ '+it.key+' 실패: '+(e.message||e),'#f85149'); }
  }
  imgImpLog('— 복구 완료 — 성공 '+ok+'개'+(fail?(' / 실패 '+fail+'개'):''),'#15793F');
  document.getElementById('imgImpStatus').innerHTML='✅ 복구 완료: 성공 <b>'+ok+'</b>개'+(fail?(' · 실패 '+fail+'개'):'')+'.';
}
function crmSegment(seg){
  return allMembers.filter(m=>{
    if(isExcludedMember(m)) return false; // 테스트/관리자 제외
    const s=memberStatus(m);
    if(seg==='all') return true;
    if(seg==='free') return s==='FREE_TRIAL';
    if(seg==='paid') return s==='ACTIVE';
    // A/B/C/D = 무료체험 회원 중 해당 등급
    return s==='FREE_TRIAL' && memberGrade(m).label===seg;
  });
}
function renderCrm(){
  const box=document.getElementById('crmList'); if(!box) return;
  const seg=(document.getElementById('crmSeg')||{}).value||'all';
  const list=crmSegment(seg).slice().sort((a,b)=>(b._solve||0)-(a._solve||0));
  const SEGLBL={all:'전체',free:'무료체험',paid:'유료',A:'등급 A',B:'등급 B',C:'등급 C',D:'등급 D'};
  const segLabel = SEGLBL[seg]||seg;
  if(!list.length){ box.innerHTML='<div class="empty">해당 대상이 없습니다.</div>'; return; }
  box.innerHTML =
    '<div style="padding:14px 20px;border-bottom:1px solid #F0F0F0">'
    +'<div style="font-size:13px;color:#6E6256;margin-bottom:8px">'+segLabel+' · 대상 <b>'+list.length+'</b>명</div>'
    +'<button class="btn-sm btn-extend" onclick="crmCopyEmails(\''+seg+'\')">📋 이메일 전체 복사</button>'
    +'<div style="font-size:11px;color:#A89C8E;margin-top:8px">※ 복사한 이메일을 메일 앱의 받는사람(또는 숨은참조/BCC)에 붙여넣어 발송하세요.</div>'
    +'</div>'
    +'<table><thead><tr><th>이메일</th><th>등급</th><th>학습량</th><th>가입(경과)</th><th>최근 학습</th></tr></thead><tbody>'
    + list.map(m=>{ const g=memberGrade(m); return `
      <tr style="cursor:pointer" onclick="openMemberDetail('${m.id}')">
        <td>${m.email||'-'}${_testBadge(m.email)}</td>
        <td><span class="grade ${g.cls}">${g.label}</span></td>
        <td>${(m._solve||0).toLocaleString()}회</td>
        <td>${fmtDateShort(m.createdAt)} (${daysSince(m.createdAt)==null?'-':daysSince(m.createdAt)+'일)'}</td>
        <td>${m._lastStudy?fmtWithAgo(m._lastStudy):'<span style="color:#C9BFB2">없음</span>'}</td>
      </tr>`;}).join('')
    + '</tbody></table>';
}
function crmCopyEmails(seg){
  const emails=crmSegment(seg).map(m=>m.email).filter(Boolean);
  if(!emails.length){ alert('대상이 없습니다.'); return; }
  navigator.clipboard.writeText(emails.join(', ')).then(()=>alert(emails.length+'명의 이메일을 복사했어요.')).catch(()=>alert('복사 실패'));
}

