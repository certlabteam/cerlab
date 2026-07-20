/* ===== 이메일 발송 (Phase 1b) — emailTemplates CRUD + previewSegment/sendBulkEmail ===== */
let emTpls = [], emEditingId = null, emInited = false;
function emFns(){ return firebase.app().functions('asia-northeast3'); }
const EM_CERTS = { appraiser:'감정평가사', realestate1:'공인중개사 1차', realestate2:'공인중개사 2차', housing:'주택관리사 1차', housing2:'주택관리사 2차', koreanhistory:'한국사', bodybuilding:'스포츠지도사 2급 실기·구술' };

async function emInit(){
  if(!emInited){
    const cs=document.getElementById('emCert');
    if(cs && cs.options.length<=1){ Object.keys(EM_CERTS).forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=EM_CERTS[k]; cs.appendChild(o); }); }
    emInited=true;
  }
  await emLoadTpls();
  emArLoad();
  emExLoad();
  emDdayLoad();
  emLogLoad();
}
async function emLoadTpls(){
  const sel=document.getElementById('emTplSelect'); if(!sel) return;
  try{
    const snap=await db.collection('emailTemplates').get();
    emTpls=snap.docs.map(d=>({id:d.id, ...d.data()}));
    emTpls.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const cur=sel.value;
    sel.innerHTML='<option value="">— 템플릿을 선택하세요 —</option>'+
      emTpls.map(t=>`<option value="${t.id}">${cmaEsc(t.name||'(이름없음)')}${t.enabled===false?' (비활성)':''} · ${t.category==='ad'?'광고':'거래'}</option>`).join('');
    if(cur && emTpls.some(t=>t.id===cur)) sel.value=cur;
    emSelectTpl();
  }catch(e){ document.getElementById('emPreview').innerHTML='<div class="empty" style="padding:20px;color:#A32D2D">템플릿 로드 실패: '+(e&&e.message?e.message:e)+'<br><span style="font-size:11px">Firestore 규칙에 emailTemplates 관리자 권한이 필요할 수 있어요.</span></div>'; }
}
function emCurTpl(){ const id=(document.getElementById('emTplSelect')||{}).value; return emTpls.find(t=>t.id===id)||null; }

/* 변수 치환 + 레이아웃 (functions의 layout/substitute와 동일 — 미리보기 정확도) */
function emSubstitute(t,v){ return String(t||'').replace(/\{\{(\w+)\}\}/g,(_,k)=>(v[k]!=null?v[k]:'')); }
function emLayout(inner,cat){
  const sender='CertLab · 발신전용 no-reply@certlab.ai.kr';
  const footer = cat==='ad'
    ? '<p style="font-size:11px;color:#9a9a9a;margin-top:28px;border-top:1px solid #eee;padding-top:12px">본 메일은 광고성 정보입니다. 수신거부는 <a href="https://certlab.ai.kr/#unsub" style="color:#9a9a9a">여기</a>를 눌러주세요.<br>'+sender+'</p>'
    : '<p style="font-size:11px;color:#9a9a9a;margin-top:28px;border-top:1px solid #eee;padding-top:12px">'+sender+'</p>';
  return '<div style="max-width:560px;margin:0 auto;padding:8px;font-family:-apple-system,system-ui,sans-serif;color:#2b2b2b;line-height:1.65;font-size:15px"><div style="font-weight:800;font-size:20px;color:#5B50C0;margin-bottom:18px">CertLab</div>'+inner+footer+'</div>';
}
function emSampleVars(){ return { nick:'홍길동', email:'sample@certlab.ai.kr', cert:'감정평가사', expireDate:'2026.07.01', daysLeft:'3' }; }
function emRenderPreview(subject, html, cat){
  const v=emSampleVars();
  let subj=emSubstitute(subject,v); if(cat==='ad' && !/^\(광고\)/.test(subj)) subj='(광고) '+subj;
  document.getElementById('emPreviewSubject').textContent=subj||'(제목 없음)';
  document.getElementById('emPreview').innerHTML=emLayout(emSubstitute(html,v),cat);
}
function emSelectTpl(){
  const t=emCurTpl();
  if(!t){ document.getElementById('emPreviewSubject').textContent='제목 미리보기'; document.getElementById('emPreview').innerHTML='<div class="empty" style="padding:24px">템플릿을 선택하면 미리보기가 표시됩니다.</div>'; return; }
  emRenderPreview(t.subject, t.html, t.category);
}
function emShowForm(show){ document.getElementById('emEditForm').style.display=show?'block':'none'; document.getElementById('emTplMsg').textContent=''; }
function emNewTpl(){
  emEditingId=null;
  document.getElementById('emName').value=''; document.getElementById('emSubject').value='';
  document.getElementById('emHtml').value=''; document.getElementById('emCatTx').checked=true; document.getElementById('emEnabled').checked=true;
  emShowForm(true);
}
function emEditTpl(){
  const t=emCurTpl(); if(!t){ alert('편집할 템플릿을 먼저 선택하세요.'); return; }
  emEditingId=t.id;
  document.getElementById('emName').value=t.name||''; document.getElementById('emSubject').value=t.subject||'';
  document.getElementById('emHtml').value=t.html||'';
  document.getElementById('emCatTx').checked=(t.category!=='ad'); document.querySelector('input[name="emCat"][value="ad"]').checked=(t.category==='ad');
  document.getElementById('emEnabled').checked=(t.enabled!==false);
  emShowForm(true);
}
function emCancelTpl(){ emShowForm(false); }
async function emSaveTpl(){
  const name=(document.getElementById('emName').value||'').trim();
  const subject=(document.getElementById('emSubject').value||'').trim();
  const html=(document.getElementById('emHtml').value||'').trim();
  const category=document.querySelector('input[name="emCat"]:checked').value;
  const enabled=document.getElementById('emEnabled').checked;
  if(!name||!subject||!html){ alert('이름·제목·본문 HTML은 필수입니다.'); return; }
  const by=(firebase.auth().currentUser&&firebase.auth().currentUser.email)||'';
  const data={ name, subject, html, category, enabled, updatedAt:firebase.firestore.FieldValue.serverTimestamp(), updatedBy:by };
  const msg=document.getElementById('emTplMsg'); msg.style.color='#888'; msg.textContent='저장 중…';
  try{
    if(emEditingId){ await db.collection('emailTemplates').doc(emEditingId).set(data,{merge:true}); }
    else { const ref=await db.collection('emailTemplates').add(data); emEditingId=ref.id; }
    msg.style.color='#15793F'; msg.textContent='✅ 저장됨';
    await emLoadTpls();
    document.getElementById('emTplSelect').value=emEditingId; emSelectTpl();
    setTimeout(()=>emShowForm(false),700);
  }catch(e){ msg.style.color='#A32D2D'; msg.textContent='저장 실패: '+(e&&e.message?e.message:e); }
}
async function emDelTpl(){
  const t=emCurTpl(); if(!t){ alert('삭제할 템플릿을 먼저 선택하세요.'); return; }
  if(!confirm('템플릿 "'+(t.name||t.id)+'" 을(를) 삭제할까요?')) return;
  try{ await db.collection('emailTemplates').doc(t.id).delete(); await emLoadTpls(); emSelectTpl(); }
  catch(e){ alert('삭제 실패: '+(e&&e.message?e.message:e)); }
}

/* 세그먼트 rule */
function emNums(idMin,idMax){
  const a=document.getElementById(idMin).value, b=document.getElementById(idMax).value;
  if(a===''&&b==='') return null;
  return { min:a===''?null:Number(a), max:b===''?null:Number(b) };
}
function emRuleFromUI(){
  const plan=[...document.querySelectorAll('.emPlan:checked')].map(x=>x.value);
  const grade=[...document.querySelectorAll('.emGrade:checked')].map(x=>x.value);
  const cert=(document.getElementById('emCert').value)?[document.getElementById('emCert').value]:[];
  const rule={ certScope:document.getElementById('emScope').value };
  if(plan.length) rule.plan=plan;
  if(grade.length) rule.grade=grade;
  if(cert.length) rule.cert=cert;
  const ina=emNums('emInactMin','emInactMax'); if(ina) rule.inactiveDays=ina;
  const exp=emNums('emExpMin','emExpMax'); if(exp) rule.expireDays=exp;
  const sgn=emNums('emSignMin','emSignMax'); if(sgn) rule.signupDays=sgn;
  return rule;
}
async function emPreviewSeg(){
  const box=document.getElementById('emSegResult'); box.style.display='block'; box.style.color='#5B50C0'; box.textContent='대상 계산 중…';
  try{
    const r=await emFns().httpsCallable('previewSegment')({ rule:emRuleFromUI() });
    const d=r.data||{}; const sample=(d.sample||[]).slice(0,8).join(', ');
    box.innerHTML='대상 <b>'+(d.count||0)+'</b>명'+(sample?' · 예: '+cmaEsc(sample)+(d.count>8?' …':''):'');
  }catch(e){ box.style.color='#A32D2D'; box.textContent='대상 조회 실패: '+(e&&e.message?e.message:e); }
}
/* 발송 중복 클릭 방지 — 발송 도는 동안 다른 발송 버튼 잠금(겹치면 Resend 429) */
function emLockSend(on){
  window._emBusy=on;
  document.querySelectorAll('button').forEach(b=>{ if(/본발송|재발송|테스트 발송/.test(b.textContent)) b.disabled=on; });
}
async function emTest(){
  if(window._emBusy){ alert('다른 발송이 진행 중이에요. 완료 후 다시 시도하세요.'); return; }
  const t=emCurTpl(); if(!t){ alert('발송할 템플릿을 먼저 선택하세요.'); return; }
  const def=(firebase.auth().currentUser&&firebase.auth().currentUser.email)||'certlab.team@gmail.com';
  const to=prompt('테스트 메일을 받을 주소를 입력하세요.', def); if(!to) return;
  const res=document.getElementById('emSendResult'); res.style.color='#888'; res.textContent='테스트 발송 중…';
  emLockSend(true);
  try{
    const r=await emFns().httpsCallable('sendBulkEmail')({ test:true, testTo:to, templateId:t.id });
    const d=r.data||{}; res.style.color=d.sent?'#15793F':'#A32D2D';
    res.innerHTML='테스트: 발송 '+(d.sent||0)+' / 실패 '+(d.failed||0)+(d.skipped?' / 제외 '+d.skipped:'')+'. <span style="color:#888">'+cmaEsc(to)+' 메일함을 확인하세요.</span>';
  }catch(e){ res.style.color='#A32D2D'; res.textContent='테스트 실패: '+(e&&e.message?e.message:e); }
  finally{ emLockSend(false); }
}
async function emSend(){
  if(window._emBusy){ alert('다른 발송이 진행 중이에요. 완료 후 다시 시도하세요.'); return; }
  const t=emCurTpl(); if(!t){ alert('발송할 템플릿을 먼저 선택하세요.'); return; }
  if(t.enabled===false){ alert('비활성 템플릿입니다. 편집에서 활성으로 바꾸세요.'); return; }
  const rule=emRuleFromUI();
  const res=document.getElementById('emSendResult');
  let cnt=0;
  try{ const pr=await emFns().httpsCallable('previewSegment')({ rule }); cnt=(pr.data&&pr.data.count)||0; }catch(e){ alert('대상 조회 실패: '+(e&&e.message?e.message:e)); return; }
  if(!cnt){ alert('대상이 0명입니다. 조건을 확인하세요.'); return; }
  if(!confirm('템플릿 "'+(t.name||t.id)+'"('+(t.category==='ad'?'광고성':'거래성')+')\n대상 '+cnt+'명에게 본발송합니다. 계속할까요?')) return;
  res.style.color='#888'; res.textContent='발송 중… ('+cnt+'명, 잠시 걸릴 수 있어요)';
  emLockSend(true);
  try{
    const cert=(rule.cert&&rule.cert.length===1)?rule.cert[0]:null;
    const r=await emFns().httpsCallable('sendBulkEmail')({ templateId:t.id, rule, targetCert:cert });
    const d=r.data||{}; res.style.color='#15793F';
    res.innerHTML='✅ 본발송 완료 — 발송 <b>'+(d.sent||0)+'</b> / 실패 '+(d.failed||0)+(d.skipped?' / 제외 '+d.skipped:'')+' (대상 '+(d.attempted||0)+'명)';
  }catch(e){ res.style.color='#A32D2D'; res.textContent='발송 실패: '+(e&&e.message?e.message:e); }
  finally{ emLockSend(false); }
}

/* ===== ④ 자동 발송 규칙 (autoRules CRUD·ON/OFF) ===== */
let emArRules = [];
function emArPopulateTpl(){
  const sel=document.getElementById('emArTpl'); if(!sel) return;
  const cur=sel.value;
  sel.innerHTML='<option value="">— 선택 —</option>'+emTpls.map(t=>`<option value="${t.id}">${cmaEsc(t.name||t.id)}${t.enabled===false?' (비활성)':''}</option>`).join('');
  if(cur) sel.value=cur;
}
async function emArLoad(){
  emArPopulateTpl();
  const box=document.getElementById('emArList'); if(!box) return;
  try{
    const snap=await db.collection('autoRules').get();
    emArRules=snap.docs.map(d=>({id:d.id, ...d.data()})).filter(r=>r.type!=='dday');
    if(!emArRules.length){ box.innerHTML='<div class="empty" style="padding:16px">등록된 자동 규칙이 없습니다.</div>'; return; }
    const tName=id=>{ const t=emTpls.find(x=>x.id===id); return t?cmaEsc(t.name||id):'<span style="color:#A32D2D">삭제된 템플릿</span>'; };
    const EVL={signup:'가입 직후', payment_approved:'결제 승인 직후'};
    box.innerHTML='<table><thead><tr><th>상태</th><th>이름</th><th>유형</th><th>템플릿</th><th>조건</th><th>마지막 실행</th><th></th></tr></thead><tbody>'
      + emArRules.map(r=>{
          const on=r.enabled!==false;
          const cond = r.type==='event' ? (EVL[r.event]||r.event) : ('매일 12시 · 쿨다운 '+(r.cooldownDays||0)+'일');
          const last = r.lastRunAt ? (fmtDateShort(r.lastRunAt)+' ('+(r.lastCount!=null?r.lastCount+'건':'-')+')') : '<span style="color:#C9BFB2">없음</span>';
          return `<tr>
            <td><button class="btn-sm" onclick="emArToggle('${r.id}',${!on})" style="background:${on?'#E6F4EA':'#F0ECE6'};color:${on?'#15793F':'#9B9082'};font-weight:700;cursor:pointer">${on?'ON':'OFF'}</button></td>
            <td>${cmaEsc(r.name||'(이름없음)')}</td>
            <td>${r.type==='event'?'이벤트':'스케줄'}</td>
            <td>${tName(r.templateId)}</td>
            <td style="font-size:12px;color:#6E6256">${cond}</td>
            <td style="font-size:12px">${last}</td>
            <td><button class="btn-sm" onclick="emArDel('${r.id}')" style="background:#FCEBEB;color:#A32D2D;cursor:pointer">삭제</button></td>
          </tr>`; }).join('')
      + '</tbody></table>';
  }catch(e){ box.innerHTML='<div class="empty" style="padding:16px;color:#A32D2D">자동 규칙 로드 실패: '+(e&&e.message?e.message:e)+'</div>'; }
}
function emArTypeChange(){
  const t=document.querySelector('input[name="emArType"]:checked').value;
  document.getElementById('emArSchBox').style.display=(t==='schedule')?'block':'none';
  document.getElementById('emArEventBox').style.display=(t==='event')?'block':'none';
}
function emArNew(){
  document.getElementById('emArName').value='';
  document.getElementById('emArTypeSch').checked=true;
  document.getElementById('emArTpl').value='';
  document.getElementById('emArCooldown').value='30';
  document.getElementById('emArEvent').value='signup';
  emArTypeChange();
  document.getElementById('emArMsg').textContent='';
  document.getElementById('emArForm').style.display='block';
}
function emArCancel(){ document.getElementById('emArForm').style.display='none'; }
async function emArSave(){
  const name=(document.getElementById('emArName').value||'').trim();
  const type=document.querySelector('input[name="emArType"]:checked').value;
  const templateId=document.getElementById('emArTpl').value;
  if(!name||!templateId){ alert('이름과 템플릿은 필수입니다.'); return; }
  const data={ name, type, templateId, enabled:true, createdAt:firebase.firestore.FieldValue.serverTimestamp() };
  if(type==='schedule'){ data.rule=emRuleFromUI(); data.cooldownDays=Number(document.getElementById('emArCooldown').value||0); }
  else { data.event=document.getElementById('emArEvent').value; }
  const msg=document.getElementById('emArMsg'); msg.style.color='#888'; msg.textContent='저장 중…';
  try{
    await db.collection('autoRules').add(data);
    msg.style.color='#15793F'; msg.textContent='✅ 저장됨 (기본 OFF가 아니라 ON 상태이니 확인하세요)';
    await emArLoad();
    setTimeout(()=>emArCancel(),900);
  }catch(e){ msg.style.color='#A32D2D'; msg.textContent='저장 실패: '+(e&&e.message?e.message:e); }
}
async function emArToggle(id, on){
  try{ await db.collection('autoRules').doc(id).set({enabled:on},{merge:true}); await emArLoad(); }
  catch(e){ alert('변경 실패: '+(e&&e.message?e.message:e)); }
}
async function emArDel(id){
  const r=emArRules.find(x=>x.id===id);
  if(!confirm('자동 규칙 "'+((r&&r.name)||id)+'" 을(를) 삭제할까요?')) return;
  try{ await db.collection('autoRules').doc(id).delete(); await emArLoad(); }
  catch(e){ alert('삭제 실패: '+(e&&e.message?e.message:e)); }
}

/* ===== ⑤ 시험 D-day (examSchedules 현황·수동입력 + dday 규칙) ===== */
const DDAY_CERTS = [
  {c:'appraiser', n:'감정평가사 1차', src:'qnet'},
  {c:'realestate1', n:'공인중개사 1차', src:'qnet'},
  {c:'realestate2', n:'공인중개사 2차', src:'qnet'},
  {c:'housing', n:'주택관리사 1차', src:'qnet'},
  {c:'housing2', n:'주택관리사 2차', src:'qnet'},
  {c:'koreanhistory', n:'한국사능력검정시험(심화)', src:'manual'},
  {c:'bodybuilding', n:'스포츠지도사 2급 실기·구술', src:'manual'}
];
let emExData = {}, emExEditing = null, emDdayRules = [], emDdayEditing = null;
function emExToDate(v){ if(!v) return null; if(v.toDate) return v.toDate(); if(v.seconds) return new Date(v.seconds*1000); return new Date(v); }
function emExFmt(d){ return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0'); }
function emExFmtInput(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function emExNext(s){   // upcoming 있으면 가장 가까운 미래 회차로 승계
  let name=s.nextExamName||'', date=emExToDate(s.nextExamDate);
  if(Array.isArray(s.upcoming)&&s.upcoming.length){
    const now=Date.now();
    const fut=s.upcoming.map(u=>({name:u.name||'',date:emExToDate(u.date)})).filter(u=>u.date&&u.date.getTime()>=now).sort((a,b)=>a.date-b.date);
    if(fut.length){ name=fut[0].name; date=fut[0].date; }
  }
  return {name,date};
}
function emExDday(date){ if(!date) return null; const t=new Date(); t.setHours(0,0,0,0); return Math.ceil((date.getTime()-t.getTime())/86400000); }

async function emExLoad(){
  const box=document.getElementById('emExList'); if(!box) return;
  try{
    const snap=await db.collection('examSchedules').get();
    emExData={}; snap.docs.forEach(d=>{ emExData[d.id]=d.data(); });
    box.innerHTML='<table><thead><tr><th>자격증</th><th>다음 시험</th><th>시험일</th><th>D-day</th><th>출처</th><th></th></tr></thead><tbody>'
      + DDAY_CERTS.map(ci=>{
          const s=emExData[ci.c];
          const editBtn = ci.src==='manual' ? `<button class="btn-sm" onclick="emExEdit('${ci.c}')" style="background:#EDE9FB;color:#5B50C0">${s?'수정':'입력'}</button>` : '';
          if(!s){ const wait = ci.src==='qnet'?'<span style="color:#A89C8E">자동(대기)</span>':'<span style="color:#A8650A">수동</span>';
            return `<tr><td>${ci.n}</td><td colspan="3" style="color:#C9BFB2">미설정</td><td style="font-size:12px">${wait}</td><td>${editBtn}</td></tr>`; }
          const nx=emExNext(s); const dd=emExDday(nx.date);
          const ddTxt = dd==null?'-':(dd<0?'<span style="color:#C9BFB2">지남</span>':'<b style="color:#5B50C0">D-'+dd+'</b>');
          const srcTxt = s.source==='qnet'?'<span style="color:#15793F">자동</span>':'<span style="color:#A8650A">수동</span>';
          return `<tr><td>${ci.n}</td><td style="font-size:12px">${cmaEsc(nx.name||'-')}</td><td style="font-size:12px">${nx.date?emExFmt(nx.date):'-'}</td><td>${ddTxt}</td><td style="font-size:12px">${srcTxt}</td><td>${editBtn}</td></tr>`;
        }).join('')
      + '</tbody></table>';
  }catch(e){ box.innerHTML='<div class="empty" style="padding:16px;color:#A32D2D">시험일정 로드 실패: '+(e&&e.message?e.message:e)+'<br><span style="font-size:11px">Firestore 규칙에 examSchedules 관리자 권한이 필요할 수 있어요.</span></div>'; }
}
function emExRefresh(){ emExLoad(); }
function emExEdit(cert){
  emExEditing=cert;
  const ci=DDAY_CERTS.find(x=>x.c===cert);
  document.getElementById('emExFormTit').textContent=ci.n+' 시험일 입력';
  const s=emExData[cert]||{};
  let rows=(Array.isArray(s.upcoming)&&s.upcoming.length)?s.upcoming.map(u=>({name:u.name||'',date:emExToDate(u.date)})):[];
  if(!rows.length && s.nextExamDate) rows=[{name:s.nextExamName||'',date:emExToDate(s.nextExamDate)}];
  document.getElementById('emExRows').innerHTML='';
  if(rows.length) rows.forEach(r=>emExAddRow(r.name, r.date?emExFmtInput(r.date):'')); else emExAddRow();
  document.getElementById('emExMsg').textContent='';
  document.getElementById('emExForm').style.display='block';
}
function emExAddRow(name, date){
  const wrap=document.getElementById('emExRows');
  const div=document.createElement('div');
  div.className='emExRow'; div.style.cssText='display:flex;gap:6px;margin-bottom:6px';
  div.innerHTML='<input class="emExN" placeholder="회차명 (예: 제80회)" value="'+cmaEsc(name||'')+'" style="flex:1;padding:8px 10px;border-radius:8px;border:1.5px solid #E8E8E8;font-size:13px;outline:none">'
    +'<input class="emExD" type="date" value="'+(date||'')+'" style="padding:8px 10px;border-radius:8px;border:1.5px solid #E8E8E8;font-size:13px;outline:none">'
    +'<button class="btn-sm" onclick="this.parentNode.remove()" style="background:#FCEBEB;color:#A32D2D">✕</button>';
  wrap.appendChild(div);
}
function emExCancel(){ document.getElementById('emExForm').style.display='none'; emExEditing=null; }
async function emExSave(){
  if(!emExEditing) return;
  const rows=[...document.querySelectorAll('#emExRows .emExRow')].map(r=>({
    name:(r.querySelector('.emExN').value||'').trim(),
    date:(r.querySelector('.emExD').value||'').trim()
  })).filter(r=>r.date);
  if(!rows.length){ alert('시험일을 1개 이상 입력하세요.'); return; }
  const ci=DDAY_CERTS.find(x=>x.c===emExEditing);
  const upcoming=rows.map(r=>({name:r.name||ci.n, date:firebase.firestore.Timestamp.fromDate(new Date(r.date+'T00:00:00'))}));
  const sorted=[...rows].sort((a,b)=>a.date<b.date?-1:1);
  const now=new Date(); now.setHours(0,0,0,0);
  const pick=sorted.find(r=>new Date(r.date+'T00:00:00')>=now)||sorted[0];
  const data={ cert:emExEditing, source:'manual',
    nextExamName:pick.name||ci.n, nextExamDate:firebase.firestore.Timestamp.fromDate(new Date(pick.date+'T00:00:00')),
    upcoming, updatedAt:firebase.firestore.FieldValue.serverTimestamp(), updatedBy:'admin' };
  const msg=document.getElementById('emExMsg'); msg.style.color='#888'; msg.textContent='저장 중…';
  try{ await db.collection('examSchedules').doc(emExEditing).set(data,{merge:true});
    msg.style.color='#15793F'; msg.textContent='✅ 저장됨';
    await emExLoad(); setTimeout(()=>emExCancel(),800);
  }catch(e){ msg.style.color='#A32D2D'; msg.textContent='저장 실패: '+(e&&e.message?e.message:e); }
}

function emDdayPopTpl(){ const sel=document.getElementById('emDdayTpl'); if(!sel) return; const cur=sel.value;
  sel.innerHTML='<option value="">— 선택 —</option>'+emTpls.map(t=>'<option value="'+t.id+'">'+cmaEsc(t.name||t.id)+(t.enabled===false?' (비활성)':'')+'</option>').join('');
  if(cur) sel.value=cur; }
function emDdayPopCerts(sel){ const box=document.getElementById('emDdayCerts'); if(!box) return;
  box.innerHTML=DDAY_CERTS.map(ci=>'<label style="margin-right:12px;cursor:pointer"><input type="checkbox" class="emDdayCert" value="'+ci.c+'" '+(sel&&sel.includes(ci.c)?'checked':'')+'> '+ci.n+'</label>').join(''); }
async function emDdayLoad(){
  emDdayPopTpl();
  const box=document.getElementById('emDdayList'); if(!box) return;
  try{
    const snap=await db.collection('autoRules').where('type','==','dday').get();
    emDdayRules=snap.docs.map(d=>({id:d.id, ...d.data()}));
    if(!emDdayRules.length){ box.innerHTML='<div class="empty" style="padding:16px">등록된 D-day 규칙이 없습니다.</div>'; return; }
    const tName=id=>{ const t=emTpls.find(x=>x.id===id); return t?cmaEsc(t.name||id):'<span style="color:#A32D2D">삭제된 템플릿</span>'; };
    box.innerHTML='<table><thead><tr><th>상태</th><th>이름</th><th>마일스톤</th><th>템플릿</th><th>대상</th><th>마지막</th><th></th></tr></thead><tbody>'
      + emDdayRules.map(r=>{ const on=r.enabled!==false;
          const certs=(r.cert&&r.cert.length)?r.cert.map(c=>{const ci=DDAY_CERTS.find(x=>x.c===c);return ci?ci.n:c;}).join(', '):'전체';
          const last=r.lastRunAt?(fmtDateShort(r.lastRunAt)+' ('+(r.lastCount!=null?r.lastCount+'건':'-')+')'):'<span style="color:#C9BFB2">없음</span>';
          return '<tr>'
            +'<td><button class="btn-sm" onclick="emDdayToggle(\''+r.id+'\','+(!on)+')" style="background:'+(on?'#E6F4EA':'#F0ECE6')+';color:'+(on?'#15793F':'#9B9082')+';font-weight:700;cursor:pointer">'+(on?'ON':'OFF')+'</button></td>'
            +'<td>'+cmaEsc(r.name||'(이름없음)')+'</td><td><b style="color:#5B50C0">D-'+r.dday+'</b></td>'
            +'<td>'+tName(r.templateId)+'</td><td style="font-size:12px;color:#6E6256">'+cmaEsc(certs)+'</td>'
            +'<td style="font-size:12px">'+last+'</td>'
            +'<td><button class="btn-sm" onclick="emDdayEdit(\''+r.id+'\')" style="background:#EDE9FB;color:#5B50C0;cursor:pointer">수정</button> <button class="btn-sm" onclick="emDdayDel(\''+r.id+'\')" style="background:#FCEBEB;color:#A32D2D;cursor:pointer">삭제</button></td></tr>';
        }).join('')
      + '</tbody></table>';
  }catch(e){ box.innerHTML='<div class="empty" style="padding:16px;color:#A32D2D">D-day 규칙 로드 실패: '+(e&&e.message?e.message:e)+'</div>'; }
}
function emDdayNew(){ emDdayEditing=null;
  document.getElementById('emDdayName').value='';
  document.getElementById('emDdayN').value='200';
  emDdayPopTpl(); document.getElementById('emDdayTpl').value=''; emDdayPopCerts([]);
  document.getElementById('emDdayFormTit').textContent='D-day 규칙 추가';
  document.getElementById('emDdayMsg').textContent=''; document.getElementById('emDdayForm').style.display='block'; }
function emDdayEdit(id){ const r=emDdayRules.find(x=>x.id===id); if(!r) return;
  emDdayEditing=id;
  document.getElementById('emDdayName').value=r.name||'';
  document.getElementById('emDdayN').value=(r.dday!=null?r.dday:'');
  emDdayPopTpl(); document.getElementById('emDdayTpl').value=r.templateId||'';
  emDdayPopCerts(r.cert||[]);
  document.getElementById('emDdayFormTit').textContent='D-day 규칙 수정';
  document.getElementById('emDdayMsg').textContent=''; document.getElementById('emDdayForm').style.display='block'; }
function emDdayCancel(){ document.getElementById('emDdayForm').style.display='none'; emDdayEditing=null; }
async function emDdaySave(){
  const name=(document.getElementById('emDdayName').value||'').trim();
  const dday=Number(document.getElementById('emDdayN').value);
  const templateId=document.getElementById('emDdayTpl').value;
  const cert=[...document.querySelectorAll('.emDdayCert:checked')].map(c=>c.value);
  if(!name||!templateId){ alert('이름과 템플릿은 필수입니다.'); return; }
  if(!(dday>=1&&dday<=400)){ alert('D값은 1~400 사이 숫자로 입력하세요.'); return; }
  const msg=document.getElementById('emDdayMsg'); msg.style.color='#888'; msg.textContent='저장 중…';
  try{
    if(emDdayEditing){
      await db.collection('autoRules').doc(emDdayEditing).set({ name, dday, templateId, cert, updatedAt:firebase.firestore.FieldValue.serverTimestamp() },{merge:true});
      msg.style.color='#15793F'; msg.textContent='✅ 수정됨';
    }else{
      await db.collection('autoRules').add({ name, type:'dday', dday, templateId, cert, enabled:true, createdAt:firebase.firestore.FieldValue.serverTimestamp() });
      msg.style.color='#15793F'; msg.textContent='✅ 저장됨 (ON 상태)';
    }
    await emDdayLoad(); setTimeout(()=>emDdayCancel(),900);
  }catch(e){ msg.style.color='#A32D2D'; msg.textContent='저장 실패: '+(e&&e.message?e.message:e); }
}
async function emDdayToggle(id,on){ try{ await db.collection('autoRules').doc(id).set({enabled:on},{merge:true}); await emDdayLoad(); }catch(e){ alert('변경 실패: '+(e&&e.message?e.message:e)); } }
async function emDdayDel(id){ const r=emDdayRules.find(x=>x.id===id); if(!confirm('D-day 규칙 "'+((r&&r.name)||id)+'" 삭제할까요?')) return;
  try{ await db.collection('autoRules').doc(id).delete(); await emDdayLoad(); }catch(e){ alert('삭제 실패: '+(e&&e.message?e.message:e)); } }

/* ===== ⑥ 발송 이력 (mailLog) ===== */
function emLogDT(d){ const p=n=>String(n).padStart(2,'0'); return (d.getMonth()+1)+'/'+d.getDate()+' '+p(d.getHours())+':'+p(d.getMinutes()); }
async function emLogLoad(){
  const box=document.getElementById('emLogList'); if(!box) return;
  try{
    const snap=await db.collection('mailLog').orderBy('at','desc').limit(100).get();
    if(snap.empty){ box.innerHTML='<div class="empty" style="padding:16px">발송 이력이 없습니다.</div>'; return; }
    const todayStr=new Date().toDateString();
    let tSent=0,tFail=0;
    const trMap={manual:'수동',schedule:'스케줄',event:'이벤트',dday:'D-day'};
    const batches={};
    const rows=snap.docs.map(d=>{ const m=d.data();
      const at=(m.at&&m.at.toDate)?m.at.toDate():(m.at?new Date(m.at):null);
      if(at && at.toDateString()===todayStr){ if(m.status==='failed') tFail++; else tSent++; }
      if(m.batchId){ const b=batches[m.batchId]||(batches[m.batchId]={at:at,subject:m.subject||m.templateId||'-',sent:0,failed:0,total:0}); b.total++; if(m.status==='failed') b.failed++; else b.sent++; if(at&&(!b.at||at>b.at)) b.at=at; }
      const sc=m.status==='failed'?'#A32D2D':(m.status==='queued'?'#A8650A':'#15793F');
      const st=m.status==='failed'?'실패':(m.status==='queued'?'예약':'성공');
      return '<tr><td style="font-size:12px;white-space:nowrap">'+(at?emLogDT(at):'-')+'</td>'
        +'<td style="font-size:12px">'+cmaEsc(m.to||'-')+'</td>'
        +'<td style="font-size:12px">'+cmaEsc(m.subject||m.templateId||'-')+'</td>'
        +'<td style="font-size:12px;color:#888">'+(trMap[m.trigger]||m.trigger||'-')+'</td>'
        +'<td><span style="color:'+sc+';font-weight:700;font-size:12px">'+st+'</span>'+(m.error?' <span style="color:#A32D2D;font-size:11px;cursor:help" title="'+cmaEsc(m.error)+'">!</span>':'')+'</td></tr>';
    }).join('');
    const failBatches=Object.entries(batches).filter(e=>e[1].failed>0).sort((a,b)=>(b[1].at||0)-(a[1].at||0));
    let resendBox='';
    if(failBatches.length){
      resendBox='<div style="margin-bottom:12px">'+failBatches.map(e=>{ const id=e[0],b=e[1];
        return '<div style="display:flex;align-items:center;gap:10px;background:#FCEFEF;border:1px solid #F3D2D2;border-radius:10px;padding:10px 14px;margin-bottom:6px;flex-wrap:wrap">'
        +'<span style="font-size:12px;color:#A32D2D;font-weight:700">실패 '+b.failed+'건</span>'
        +'<span style="font-size:12px;color:#666">/ '+b.total+'건 중 (성공 '+b.sent+') · '+cmaEsc(String(b.subject).slice(0,30))+'</span>'
        +'<button class="btn-sm" style="margin-left:auto;background:#A32D2D;color:#fff" onclick="emResendFailed(\''+id+'\')">↻ 실패분 재발송</button></div>';
      }).join('')+'</div>';
    }
    box.innerHTML='<div style="font-size:12px;color:#5B50C0;margin-bottom:8px">오늘 발송 <b>'+tSent+'</b>건'+(tFail?' · 실패 <b style="color:#A32D2D">'+tFail+'</b>건':'')+' <span style="color:#A89C8E">· 최근 100건</span></div>'
      +resendBox
      +'<table><thead><tr><th>시각</th><th>받는사람</th><th>제목</th><th>경로</th><th>상태</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }catch(e){ var msg=(e&&e.message)?e.message:String(e);
    box.innerHTML='<div class="empty" style="padding:16px;color:#A32D2D">발송 이력 로드 실패: '+cmaEsc(msg)+((msg.indexOf('index')>=0)?'<br><span style="font-size:11px">콘솔 에러 링크로 mailLog 인덱스를 생성하세요.</span>':'')+'</div>'; }
}
async function emResendFailed(batchId){
  if(window._emBusy){ alert('다른 발송이 진행 중이에요. 완료 후 다시 시도하세요.'); return; }
  if(!confirm('이 배치의 실패 건을 재발송할까요?\n(성공한 사람은 제외, 실패한 주소에만 다시 보냅니다)')) return;
  emLockSend(true);
  try{
    const r=await emFns().httpsCallable('resendFailures')({ batchId:batchId });
    const d=r.data||{};
    alert('재발송 완료\n성공 '+(d.sent||0)+' / 실패 '+(d.failed||0)+(d.note?('\n'+d.note):''));
    emLogLoad();
  }catch(e){ alert('재발송 실패: '+(e&&e.message?e.message:e)); }
  finally{ emLockSend(false); }
}
function emLogRefresh(){ emLogLoad(); }

function openMemberDetail(uid){
  const m = allMembers.find(x=>x.id===uid); if(!m) return;
  MD_UID = uid; MD_PERSUB = null;
  const g = memberGrade(m); const s = memberStatus(m);
  // 활성 이용권(자격증별 만료)
  const ents = m.entitlements||{};
  const activeCerts = Object.keys(ents).filter(c=>{ const e=ents[c]; if(!e||e.plan!=='ACTIVE') return false; if(!e.expireAt) return true; const d=e.expireAt.toDate?e.expireAt.toDate():new Date(e.expireAt); return d>new Date(); });
  const entHTML = activeCerts.length
    ? activeCerts.map(c=>`<div style="font-size:13px">• ${CERT_NAMES[c]||c} <span style="color:#15793F">~${fmtDateShort(ents[c].expireAt)} (${daysLeft(ents[c].expireAt)})</span></div>`).join('')
    : '<span style="color:#B4A99C">활성 이용권 없음</span>';
  // 쿠폰
  const codes=(codeByUid[uid]||[]);
  const codeHTML = codes.length ? codes.map(c=>`<span class="badge" style="background:#EDE9FB;color:#5B50C0">🎟 ${c}</span>`).join(' ') : '<span style="color:#B4A99C">-</span>';
  // 마일리지 잔액
  const bal = mileBalanceOf(m);
  // 결제 이력
  const pays = allPayments.filter(p=>p.uid===uid).slice().sort((a,b)=>{ const da=(a.createdAt&&a.createdAt.toDate?a.createdAt.toDate():new Date(a.createdAt||0)); const db=(b.createdAt&&b.createdAt.toDate?b.createdAt.toDate():new Date(b.createdAt||0)); return db-da; });
  const payHTML = pays.length
    ? pays.map(p=>{
        const amt = p.mileageUsed>0 ? `${(p.depositAmount||0).toLocaleString()}원+마일${(p.mileageUsed||0).toLocaleString()}` : `${(p.price||0).toLocaleString()}원`;
        return `<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:4px 0;border-bottom:1px solid #F3F0EC">
          <span>${fmtDateShort(p.approvedAt||p.createdAt)} · ${certNameOf(p)} ${planNames[p.planDays]||(p.planDays+'일')}</span>
          <span>${amt} <b style="color:${isPaid(p.status)?'#15793F':'#A32D2D'}">${statusLabel(p.status)}</b></span></div>`;
      }).join('')
    : '<span style="color:#B4A99C">결제 이력 없음</span>';

  const row=(label,val)=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F3F0EC"><span style="color:#8A7E70;font-size:13px">${label}</span><span style="font-weight:600;font-size:13px;text-align:right">${val}</span></div>`;
  document.getElementById('mdBody').innerHTML =
    row('이메일', (m.email||'-')+_testBadge(m.email))
    + row('등급 / 상태', `<span class="grade ${g.cls}">${g.label}</span> ${memberBadges(m)}`)
    + row('가입일', `${fmtDateShort(m.createdAt)} (${daysSince(m.createdAt)==null?'-':daysSince(m.createdAt)+'일 경과'})`)
    + row('최근 로그인', m.lastLoginAt?`${fmtDateShort(m.lastLoginAt)} (${agoTxt(m.lastLoginAt)})`:'<span style="color:#B4A99C">기록 없음</span>')
    + row('최근 학습', m._lastStudy?`${fmtDateShort(m._lastStudy)} (${agoTxt(m._lastStudy)})`:'<span style="color:#B4A99C">기록 없음</span>')
    + row('가입 시험', signupCertHTML(m))
    + row('학습량(전체)', `푼 횟수 <b>${(m._solve||0).toLocaleString()}</b> · 학습문항 <b>${m._studied||0}</b>`)
    + `<div style="margin-top:8px;font-weight:700;font-size:12px;color:#8A7E70">시험별 풀이 <span style="font-weight:400;color:#A89C8E;font-size:11px">— 상세 ▾ 누르면 과목별</span></div>${perCertTableExpandable(m._perCert, uid)}`
    + `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #F3F0EC"><span style="color:#8A7E70;font-size:13px">포인트 잔액</span><span style="font-weight:600;font-size:13px"><b>${bal.toLocaleString()}P</b> <button class="btn-sm" onclick="cmaGrantPointsUid('${uid}','${(m.email||'').replace(/'/g,'')}')" style="background:#EAF5EE;color:#15793F;border:1px solid #B7E0C5;cursor:pointer;margin-left:6px">+ 포인트 지급</button></span></div>`
    + `<div style="margin-top:10px;font-weight:700;font-size:12px;color:#8A7E70">활성 이용권</div>${entHTML}`
    + `<div style="margin-top:8px;font-weight:700;font-size:12px;color:#8A7E70">사용 쿠폰</div>${codeHTML}`
    + `<div style="margin-top:10px;font-weight:700;font-size:12px;color:#8A7E70">결제 이력 (${pays.length})</div><div style="margin-top:4px">${payHTML}</div>`
    + `<div style="margin-top:14px;padding-top:12px;border-top:1px solid #EDE9E5;display:flex;justify-content:space-between;align-items:center">
         <span style="font-weight:700;font-size:12px;color:#8A7E70">관리자 권한 ${m.isAdmin?'<span class="badge" style="background:#FDE8E8;color:#A32D2D">ON</span>':'<span style="color:#B4A99C">없음</span>'}</span>
         <button class="btn-sm" onclick="toggleAdmin('${uid}')" style="background:${m.isAdmin?'#fff':'#7F77DD'};color:${m.isAdmin?'#A32D2D':'#fff'};border:1.5px solid ${m.isAdmin?'#E8A0A0':'#7F77DD'};cursor:pointer;font-weight:600">${m.isAdmin?'관리자 해제':'관리자 지정'}</button>
       </div>`;
  document.getElementById('memberDetailModal').classList.remove('hidden');
}

// 관리자 지정/해제 (users/{uid}.isAdmin 토글) — 커뮤니티 공지 작성·신고 처리 권한
async function toggleAdmin(uid){
  const m = allMembers.find(x=>x.id===uid); if(!m) return;
  const makeAdmin = !m.isAdmin;
  const msg = makeAdmin
    ? (m.email||uid)+' 님을 관리자로 지정할까요?\n(공지 작성·신고 처리 권한이 부여됩니다)'
    : (m.email||uid)+' 님의 관리자 권한을 해제할까요?';
  if(!confirm(msg)) return;
  try {
    await db.collection('users').doc(uid).set({ isAdmin: makeAdmin }, { merge:true });
    m.isAdmin = makeAdmin;
    openMemberDetail(uid);
  } catch(e){ alert('오류: ' + (e&&e.message?e.message:e)); }
}

// ===== 회원 상세: 시험별 → 과목별 펼침 (안 A) =====
let MD_UID=null, MD_PERSUB=null, QID2SUB=null;
// 문항ID→과목 매핑 ('cert|qid' → 과목명). banks 1회 로드, 버전 시그니처로 localStorage 캐시
async function buildQid2Sub(){
  if(QID2SUB) return QID2SUB;
  try{
    const m=await db.collection('manifest').doc('exams').get();
    const exams=(m.exists&&m.data().exams)||[];
    const sig=JSON.stringify(exams.map(e=>[e.id,(e.subjects||[]).map(s=>[s.code,s.name]),e.versions||null]));
    try{ const c=localStorage.getItem('qid2sub_v1'); if(c){ const o=JSON.parse(c); if(o&&o.sig===sig&&o.map){ QID2SUB=o.map; return QID2SUB; } } }catch(_){}
    const map={};
    for(const ex of exams){
      for(const sub of (ex.subjects||[])){
        try{ const bd=await db.collection('banks').doc(ex.id+'__'+sub.code).get();
          if(bd.exists){ const bdata=bd.data();
            let qlist=bdata.questions||[];
            if((!qlist||!qlist.length) && Array.isArray(bdata.shards)){
              qlist=[];
              for(const s of bdata.shards){ try{ const sd=await db.collection('banks').doc(ex.id+'__'+sub.code+'__'+s).get(); if(sd.exists&&Array.isArray(sd.data().questions)) qlist=qlist.concat(sd.data().questions); }catch(_){} }
            }
            qlist.forEach(q=>{ if(q&&q.id!=null) map[ex.id+'|'+q.id]=(sub.name||sub.code); });
          }
        }catch(_){}
      }
    }
    QID2SUB=map;
    try{ localStorage.setItem('qid2sub_v1', JSON.stringify({sig, map})); }catch(_){}
    return QID2SUB;
  }catch(_){ QID2SUB={}; return QID2SUB; }
}
// 한 회원의 cardProgress를 시험·과목별 집계 (상세 첫 클릭 시 1회)
async function prepMemberSubs(uid){
  if(MD_PERSUB && MD_PERSUB._uid===uid) return MD_PERSUB;
  const map=await buildQid2Sub();
  let cp={};
  try{ const ud=await db.collection('userData').doc(uid).get(); if(ud.exists){ const d=ud.data(); cp=(d.cardProgress&&typeof d.cardProgress==='object')?d.cardProgress:{}; } }catch(_){}
  const per={};
  Object.keys(cp).forEach(k=>{
    const p=cp[k]; const rc=(p&&p.rc)?p.rc:0;
    const bar=k.indexOf('|'); const cert=bar>0?k.slice(0,bar):'_etc';
    const sub=map[k]||'기타';
    (per[cert]=per[cert]||{}); (per[cert][sub]=per[cert][sub]||{solve:0,studied:0});
    per[cert][sub].solve+=rc; per[cert][sub].studied++;
  });
  per._uid=uid; MD_PERSUB=per; return per;
}
async function toggleSub(uid, cert){
  const rowEl=document.getElementById('sub_'+cert); const btn=document.getElementById('sbtn_'+cert);
  if(!rowEl) return;
  if(rowEl.style.display!=='none'){ rowEl.style.display='none'; if(btn) btn.textContent='상세 ▾'; return; }
  rowEl.style.display=''; if(btn) btn.textContent='상세 ▴';
  const cell=rowEl.firstElementChild;
  if(rowEl.dataset.loaded==='1') return;
  cell.innerHTML='<div style="padding:8px 4px;color:#A89C8E;font-size:12px">집계 중…</div>';
  try{
    const per=await prepMemberSubs(uid);
    const obj=(per[cert]||{});
    const subs=Object.keys(obj).map(s=>({s,solve:obj[s].solve,studied:obj[s].studied})).sort((a,b)=>b.solve-a.solve);
    if(!subs.length){ cell.innerHTML='<div style="padding:8px 4px;color:#B4A99C;font-size:12px">과목 정보 없음</div>'; }
    else {
      cell.innerHTML='<div style="display:grid;grid-template-columns:1fr auto auto;gap:3px 16px;padding:7px 4px">'
        +'<div style="font-size:10.5px;color:#A89C8E">과목</div><div style="font-size:10.5px;color:#A89C8E;text-align:right">푼 횟수</div><div style="font-size:10.5px;color:#A89C8E;text-align:right">학습문항</div>'
        + subs.map(x=>'<div style="padding-left:12px;color:#6E6256;font-size:12px">└ '+x.s+'</div>'
            +'<div style="text-align:right;font-size:12px;font-weight:600">'+x.solve.toLocaleString()+'</div>'
            +'<div style="text-align:right;font-size:12px;color:#8A7E70">'+x.studied.toLocaleString()+'</div>').join('')
        +'</div>';
    }
    rowEl.dataset.loaded='1';
  }catch(e){ cell.innerHTML='<div style="padding:8px 4px;color:#A32D2D;font-size:12px">불러오기 실패</div>'; }
}
function perCertTableExpandable(per, uid){
  if(!per) return '<span style="color:#B4A99C">기록 없음</span>';
  const arr=Object.keys(per).map(c=>({c,solve:per[c].solve,studied:per[c].studied})).filter(x=>x.solve>0||x.studied>0);
  if(!arr.length) return '<span style="color:#B4A99C">기록 없음</span>';
  arr.sort((a,b)=>b.solve-a.solve);
  const th='padding:4px 8px;font-size:11px;color:#8A7E70;background:#FAFAFA';
  const td='padding:4px 8px;font-size:12.5px;border-bottom:1px solid #F3F0EC';
  let h='<table style="width:100%;border-collapse:collapse;margin-top:4px">'
    +'<thead><tr><th style="text-align:left;'+th+'">시험</th><th style="text-align:right;'+th+'">푼 횟수</th><th style="text-align:right;'+th+'">학습문항</th><th style="'+th+'"></th></tr></thead><tbody>';
  arr.forEach(x=>{
    const label=x.c==='_etc'?'기타':certLabel(x.c);
    h+='<tr><td style="'+td+'">'+label+'</td><td style="text-align:right;'+td+'">'+x.solve.toLocaleString()+'</td><td style="text-align:right;'+td+'">'+x.studied.toLocaleString()+'</td>'
      +'<td style="text-align:right;'+td+'">'+(x.c==='_etc'?'':'<button class="subtgl" id="sbtn_'+x.c+'" onclick="toggleSub(\''+uid+'\',\''+x.c+'\')">상세 ▾</button>')+'</td></tr>';
    if(x.c!=='_etc') h+='<tr id="sub_'+x.c+'" style="display:none"><td colspan="4" style="background:#FBF9F6;padding:0 10px"></td></tr>';
  });
  h+='</tbody></table>';
  return h;
}

// ===== 학습 통계 탭 =====
let STATS=null;
function renderStats(){
  const totals={}, active={}, top={}, signup={}; let signupNone=0;
  const now=Date.now(), D7=7*86400000, D30=30*86400000;
  allMembers.forEach(m=>{
    if(isExcludedMember(m)) return; // 테스트/관리자 계정 통계 제외
    const per=m._perCert||{};
    Object.keys(per).forEach(c=>{
      const v=per[c];
      (totals[c]=totals[c]||{solve:0,studied:0,members:0}); totals[c].solve+=v.solve; totals[c].studied+=v.studied; totals[c].members++;
      (active[c]=active[c]||{a7:0,a30:0,total:0}); active[c].total++;
      const lr=v.lr||0; if(lr&&now-lr<=D7) active[c].a7++; if(lr&&now-lr<=D30) active[c].a30++;
      (top[c]=top[c]||[]).push({email:m.email||'-', solve:v.solve, lr:lr, free:memberStatus(m)==='FREE_TRIAL', m:m});
    });
    if(m.signupCert){ signup[m.signupCert]=(signup[m.signupCert]||0)+1; } else signupNone++;
  });
  Object.keys(top).forEach(c=>top[c].sort((a,b)=>b.solve-a.solve));
  STATS={totals,active,top,signup,signupNone};
  renderStatsTotals(); renderStatsActive(); renderStatsSignup();
  const certs=Object.keys(totals).filter(c=>c!=='_etc').sort((a,b)=>totals[b].solve-totals[a].solve);
  const sel=document.getElementById('statsTopCert');
  if(sel) sel.innerHTML=certs.map(c=>'<option value="'+c+'">'+certLabel(c)+'</option>').join('');
  renderStatsTop();
}
function renderStatsTotals(){
  const t=STATS.totals; const arr=Object.keys(t).map(c=>({c,solve:t[c].solve,studied:t[c].studied,members:t[c].members})).sort((a,b)=>b.solve-a.solve);
  const max=Math.max(1,...arr.map(x=>x.solve));
  const box=document.getElementById('statsTotals');
  if(!arr.length){ box.innerHTML='<div class="empty">학습 기록이 없습니다.</div>'; return; }
  box.innerHTML='<table><thead><tr><th>시험</th><th>총 푼 횟수</th><th style="width:200px">분포</th><th>총 학습문항</th><th>학습 회원 수</th></tr></thead><tbody>'
    + arr.map(x=>'<tr><td><span class="cchip" style="'+(CERT_CHIP[x.c]||CERT_CHIP._etc)+'">'+(x.c==='_etc'?'기타':certShort(x.c))+'</span></td>'
        +'<td style="font-weight:700">'+x.solve.toLocaleString()+'</td>'
        +'<td><div class="sbar"><i style="width:'+Math.round(x.solve/max*100)+'%"></i></div></td>'
        +'<td>'+x.studied.toLocaleString()+'</td><td>'+x.members.toLocaleString()+'명</td></tr>').join('')
    + '</tbody></table>';
}
function renderStatsActive(){
  const a=STATS.active; const arr=Object.keys(a).filter(c=>c!=='_etc').map(c=>({c,a7:a[c].a7,a30:a[c].a30,total:a[c].total})).sort((x,y)=>y.a30-x.a30);
  const box=document.getElementById('statsActive');
  if(!arr.length){ box.innerHTML='<div class="empty">기록이 없습니다.</div>'; return; }
  box.innerHTML='<table><thead><tr><th>시험</th><th>최근 7일</th><th>최근 30일</th><th>전체 학습 회원</th></tr></thead><tbody>'
    + arr.map(x=>'<tr><td><span class="cchip" style="'+(CERT_CHIP[x.c]||CERT_CHIP._etc)+'">'+certShort(x.c)+'</span></td>'
        +'<td style="font-weight:700;color:#15793F">'+x.a7.toLocaleString()+'명</td>'
        +'<td>'+x.a30.toLocaleString()+'명</td><td>'+x.total.toLocaleString()+'명</td></tr>').join('')
    + '</tbody></table>';
}
function renderStatsTop(){
  const sel=document.getElementById('statsTopCert'); const cert=(sel&&sel.value)||'';
  const box=document.getElementById('statsTop'); if(!box) return;
  if(!STATS||!cert||!STATS.top[cert]){ box.innerHTML='<div class="empty">데이터가 없습니다.</div>'; return; }
  const list=STATS.top[cert].slice(0,5);
  box.innerHTML='<table><thead><tr><th>#</th><th>이메일</th><th>등급</th><th>상태</th><th>푼 횟수(이 시험)</th><th>최근 학습</th></tr></thead><tbody>'
    + list.map((x,i)=>{ const g=memberGrade(x.m); return '<tr style="cursor:pointer" onclick="openMemberDetail(\''+x.m.id+'\')">'
        +'<td>'+(i+1)+'</td><td>'+(x.free?'⭐ ':'')+x.email+_testBadge(x.email)+'</td>'
        +'<td><span class="grade '+g.cls+'">'+g.label+'</span></td><td>'+memberBadges(x.m)+'</td>'
        +'<td style="font-weight:700">'+x.solve.toLocaleString()+'</td>'
        +'<td>'+(x.lr?fmtWithAgo(x.lr):'<span style="color:#C9BFB2">-</span>')+'</td></tr>'; }).join('')
    + '</tbody></table>';
}
function renderStatsSignup(){
  const s=STATS.signup; const arr=Object.keys(s).map(c=>({c,n:s[c]})).sort((a,b)=>b.n-a.n);
  const max=Math.max(1,...arr.map(x=>x.n));
  const box=document.getElementById('statsSignup');
  let html='<table><thead><tr><th>가입 시험</th><th>가입자 수</th><th style="width:200px">비중</th></tr></thead><tbody>';
  if(!arr.length){ html+='<tr><td colspan="3" style="color:#B4A99C;padding:14px 16px">아직 가입 시험 기록이 없습니다. (이번 업데이트 이후 가입분부터 집계)</td></tr>'; }
  else { html+=arr.map(x=>'<tr><td><span class="cchip" style="'+(CERT_CHIP[x.c]||CERT_CHIP._etc)+'">'+certShort(x.c)+'</span></td>'
      +'<td style="font-weight:700">'+x.n.toLocaleString()+'</td>'
      +'<td><div class="sbar"><i style="width:'+Math.round(x.n/max*100)+'%"></i></div></td></tr>').join(''); }
  html+='<tr><td><span style="color:#C9BFB2">기록 없음 <small style="color:#C9BFB2">(기존 회원)</small></span></td><td style="font-weight:700;color:#A89C8E">'+STATS.signupNone.toLocaleString()+'</td><td></td></tr></tbody></table>';
  box.innerHTML=html;
}

// ===== 승인/거절 (레거시 pending 건 전용) =====
function openApprove(paymentId) {
  const p = allPayments.find(x => x.id === paymentId);
  if (!p) return;
  pendingPaymentId = paymentId;
  pendingPaymentData = p;
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + (p.planDays || 14));
  document.getElementById('modalEmail').textContent = p.email + (EXCLUDED_EMAILS.includes((p.email||'').toLowerCase())?' (TEST)':'');
  document.getElementById('modalDepositor').textContent = p.depositorName || '-';
  document.getElementById('modalPlan').textContent = planNames[p.planDays] || p.planDays+'일';
  document.getElementById('modalPrice').textContent = p.mileageUsed>0
    ? ((p.depositAmount||0).toLocaleString()+'원 입금 + 마일리지 '+(p.mileageUsed||0).toLocaleString()+'원')
    : (p.price||0).toLocaleString()+'원';
  document.getElementById('modalExpire').textContent = expireDate.toLocaleDateString('ko-KR');
  document.getElementById('approveModal').classList.remove('hidden');
}

function openReject(paymentId) {
  const p = allPayments.find(x => x.id === paymentId);
  if (!p) return;
  pendingPaymentId = paymentId;
  pendingPaymentData = p;
  document.getElementById('rejectEmail').textContent = p.email + (EXCLUDED_EMAILS.includes((p.email||'').toLowerCase())?' (TEST)':'');
  document.getElementById('rejectPlan').textContent = planNames[p.planDays] || p.planDays+'일';
  document.getElementById('rejectModal').classList.remove('hidden');
}

// ===== 철회 (자동승인 건 입금 미확인) =====
function openRevoke(paymentId) {
  const p = allPayments.find(x => x.id === paymentId);
  if (!p) return;
  pendingPaymentId = paymentId;
  pendingPaymentData = p;
  document.getElementById('revokeEmail').textContent = p.email + (EXCLUDED_EMAILS.includes((p.email||'').toLowerCase())?' (TEST)':'');
  document.getElementById('revokeCert').textContent = certNameOf(p);
  document.getElementById('revokePlan').textContent = planNames[p.planDays] || p.planDays+'일';
  document.getElementById('revokeModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('approveModal').classList.add('hidden');
  document.getElementById('rejectModal').classList.add('hidden');
  document.getElementById('revokeModal').classList.add('hidden');
  pendingPaymentId = null;
  pendingPaymentData = null;
}

async function confirmApprove() {
  if (!pendingPaymentId || !pendingPaymentData) return;
  const p = pendingPaymentData;
  const cert = p.certType || 'bodybuilding';
  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + (p.planDays || 14));
  try {
    await db.collection('payments').doc(pendingPaymentId).update({
      status: 'approved',
      approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    if (p.kind === 'aigrade') {
      // AI 충전(횟수): 지갑(첨삭 grade / 해설 explain)에 packSize 가산
      const ps = +p.packSize || 0; const w = (p.wallet === 'explain') ? 'explain' : 'grade';
      await db.collection('users').doc(p.uid).update({ ['aiCredits.'+w]: firebase.firestore.FieldValue.increment(ps) });
      closeModal();
      alert(`✅ ${p.email} ${w==='explain'?'AI 개념설명':'AI 첨삭'} ${ps}회 충전 승인 완료!`);
      await loadAll();
      return;
    }
    const upd = {
      ['entitlements.'+cert+'.plan']: 'ACTIVE',
      ['entitlements.'+cert+'.expireAt']: firebase.firestore.Timestamp.fromDate(expireAt),
      ['entitlements.'+cert+'.planDays']: p.planDays
    };
    if (cert === 'bodybuilding') { upd.plan='ACTIVE'; upd.expireAt=firebase.firestore.Timestamp.fromDate(expireAt); upd.planDays=p.planDays; }
    await db.collection('users').doc(p.uid).update(upd);
    closeModal();
    alert(`✅ ${p.email} 승인 완료!\n만료일: ${expireAt.toLocaleDateString('ko-KR')}`);
    await loadAll();
  } catch(e) { alert('오류: ' + e.message); }
}

async function confirmReject() {
  if (!pendingPaymentId || !pendingPaymentData) return;
  try {
    await db.collection('payments').doc(pendingPaymentId).update({
      status: 'rejected',
      rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeModal();
    alert('거절 처리되었습니다.');
    await loadAll();
  } catch(e) { alert('오류: ' + e.message); }
}

async function confirmRevoke() {
  if (!pendingPaymentId || !pendingPaymentData) return;
  const p = pendingPaymentData;
  const cert = p.certType || 'bodybuilding';
  try {
    await db.collection('payments').doc(pendingPaymentId).update({
      status: 'revoked',
      revokedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    if (p.kind === 'aigrade') {
      // AI 충전 취소: 해당 지갑에서 packSize 회수(음수 방지)
      const ps = +p.packSize || 0; const w = (p.wallet === 'explain') ? 'explain' : 'grade';
      let aref=null;
      if (p.uid) aref=db.collection('users').doc(p.uid);
      else if (p.email) { const qs=await db.collection('users').where('email','==',p.email).limit(1).get(); if(!qs.empty) aref=qs.docs[0].ref; }
      if (aref) {
        await db.runTransaction(async (tx)=>{ const s=await tx.get(aref); const cur=(s.exists&&s.data().aiCredits&&+s.data().aiCredits[w])||0; var nv={}; nv[w]=Math.max(0,cur-ps); tx.set(aref,{ aiCredits:nv },{merge:true}); });
      }
      closeModal();
      alert(`⛔ ${p.email} ${w==='explain'?'AI 개념설명':'AI 첨삭'} 충전 취소 완료. ${ps}회 회수.`);
      await loadAll();
      return;
    }
    // 회원 문서 찾기 (uid 우선, 없으면 이메일로)
    let ref=null, data=null;
    if (p.uid) { ref=db.collection('users').doc(p.uid); const d=await ref.get(); if(d.exists) data=d.data(); }
    if (!data && p.email) {
      const qs=await db.collection('users').where('email','==',p.email).limit(1).get();
      if(!qs.empty){ ref=qs.docs[0].ref; data=qs.docs[0].data(); }
    }
    if (ref) {
      const upd = { ['entitlements.'+cert+'.plan']: 'EXPIRED' };
      // 이번에 만료시키는 것 외에 살아있는 다른 이용권이 있는지 확인
      const ents = (data && data.entitlements) || {};
      const now = Date.now();
      const otherLive = Object.keys(ents).some(k => {
        if (k===cert) return false;
        const e=ents[k]; if(!e || e.plan!=='ACTIVE') return false;
        if(!e.expireAt) return true;
        const t = e.expireAt.toDate ? e.expireAt.toDate().getTime() : new Date(e.expireAt).getTime();
        return t > now;
      });
      // bodybuilding(레거시 top-plan)이거나, 남은 이용권이 없으면 top-level plan도 만료
      if (cert==='bodybuilding' || !otherLive) upd.plan='EXPIRED';
      // 마일리지 사용분 환원 (1년 유효)
      const used = p.mileageUsed || 0;
      if (used > 0) {
        const lots = Array.isArray(data && data.mileageLots) ? data.mileageLots.slice() : [];
        lots.push({a:used, t:'refund', at:now, exp:now+365*86400000});
        const hist = Array.isArray(data && data.mileageHistory) ? data.mileageHistory.slice() : [];
        hist.push({t:'refund', a:used, at:now, memo:'결제 철회 환원'});
        upd.mileageLots = lots;
        upd.mileageHistory = hist;
      }
      await ref.update(upd);
    }
    closeModal();
    alert(`⛔ ${p.email} (${certNameOf(p)}) 철회 완료. 이용권을 만료 처리했습니다.`+((p.mileageUsed||0)>0?`\n사용한 마일리지 ${(p.mileageUsed||0).toLocaleString()}원을 환원했습니다.`:''));
    await loadAll();
  } catch(e) { alert('오류: ' + e.message); }
}

// ===== 오류 신고 =====
let allReports = [];

async function loadReports() {
  try {
    const snap = await db.collection('reports').orderBy('createdAt','desc').get();
    allReports = snap.docs.map(d => ({id:d.id, ...d.data()})).filter(r => !r.postId);  // 글 신고(postId有)는 💬커뮤니티 탭에서 처리
    renderReports(allReports);
    updateReportBadge();
  } catch(e) { console.error('[loadReports]',e); document.getElementById('reportList').innerHTML = '<div class="empty">불러오기 실패: '+(e&&e.code?e.code:(e&&e.message?e.message:e))+'</div>'; }
}

function updateReportBadge() {
  const pending = allReports.filter(r => r.status === 'pending').length;
  const badge = document.getElementById('reportBadge');
  if (pending > 0) { badge.textContent = pending; badge.style.display = 'inline-block'; }
  else { badge.style.display = 'none'; }
}

function renderReports(list) {
  if (!list.length) { document.getElementById('reportList').innerHTML = '<div class="empty">신고 내역이 없습니다.</div>'; return; }
  document.getElementById('reportList').innerHTML = `
    <table>
      <thead><tr><th>신고일시</th><th>시험</th><th>과목</th><th>문항ID</th><th>오류유형</th><th>신고내용</th><th>신고자</th><th>상태</th><th>처리</th></tr></thead>
      <tbody>${list.map((r,i) => `
        <tr>
          <td>${fmtDate(r.createdAt)}</td>
          <td style="font-size:11px">${CERT_NAMES[r.certType]||r.certType||'-'}</td>
          <td style="font-size:11px">${r.subject||'-'}</td>
          <td style="font-size:11px;color:#888780">${r.questionId||'-'}</td>
          <td><span class="badge badge-pending">${r.errorType||'-'}</span></td>
          <td style="max-width:160px">
            <div style="font-size:12px;color:#555;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px" title="${r.question||''}">${(r.question||'').slice(0,20)}${(r.question||'').length>20?'...':''}</div>
            <div style="font-size:11px;color:#888780">${r.detail||'-'}</div>
          </td>
          <td style="font-size:11px">${r.reporterEmail||'-'}</td>
          <td><span class="badge ${r.status==='done'?'badge-approved':'badge-pending'}">${r.status==='done'?'처리완료':'대기'}</span></td>
          <td>${r.status==='pending'
            ? `<button class="btn-sm btn-approve" onclick="markReportDone('${r.id}')">완료</button>`
            : '-'}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function filterReports() {
  const status = document.getElementById('filterStatus').value;
  if (status === 'all') renderReports(allReports);
  else renderReports(allReports.filter(r => r.status === status));
}

async function markReportDone(reportId) {
  try {
    await db.collection('reports').doc(reportId).update({
      status: 'done',
      doneAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await loadReports();
  } catch(e) { alert('오류: ' + e.message); }
}

// ===== 🤖 AI 크레딧 관리 (첨삭 grade · 해설 explain 지갑) =====
var _acmUid=null, _acmEmail=null;
async function acmLookup(){
  var em=((document.getElementById('acmEmail')||{}).value||'').trim().toLowerCase();
  var st=document.getElementById('acmStatus'), res=document.getElementById('acmResult');
  if(!em){ if(st){st.style.color='#A32D2D';st.textContent='이메일을 입력하세요.';} return; }
  if(st){st.style.color='#6E6256';st.textContent='조회 중…';} if(res)res.innerHTML=''; _acmUid=null;
  try{
    var qs=await db.collection('users').where('email','==',em).limit(1).get();
    if(qs.empty){ if(st){st.style.color='#A32D2D';st.textContent='해당 이메일 회원이 없습니다.';} return; }
    var doc=qs.docs[0]; _acmUid=doc.id; _acmEmail=em; var u=doc.data();
    var g=(u.aiCredits&&+u.aiCredits.grade)||0, e=(u.aiCredits&&+u.aiCredits.explain)||0;
    if(st){st.style.color='#15793F';st.textContent=em+' 조회됨';}
    if(res)res.innerHTML=acmCard('grade','✍️ AI 첨삭',g)+acmCard('explain','💡 AI 개념설명',e);
  }catch(err){ if(st){st.style.color='#A32D2D';st.textContent='오류: '+err.message;} }
}
function acmCard(w,label,bal){
  return '<div style="display:inline-block;vertical-align:top;border:1px solid #E7EBF1;border-radius:12px;padding:12px 14px;margin:0 10px 10px 0;min-width:236px">'
    +'<div style="font-size:13px;font-weight:800;color:#2C2C2A">'+label+' 잔액 <b id="acmBal_'+w+'" style="color:#6D28D9">'+bal+'</b>회</div>'
    +'<div style="display:flex;gap:6px;margin-top:9px;align-items:center">'
    +'<input id="acmN_'+w+'" type="number" min="1" placeholder="회수" style="width:76px;padding:6px;border:1.5px solid #E1E6EE;border-radius:8px;text-align:center">'
    +'<button class="btn-sm btn-extend" onclick="acmAdjust(\''+w+'\',1)">＋부여</button>'
    +'<button class="btn-sm" style="background:#FCEBEA;color:#B5302F" onclick="acmAdjust(\''+w+'\',-1)">－차감</button>'
    +'</div></div>';
}
async function acmAdjust(w, sign){
  if(!_acmUid){ alert('먼저 회원을 조회하세요.'); return; }
  var n=+((document.getElementById('acmN_'+w)||{}).value)||0; if(n<=0){ alert('회수를 입력하세요.'); return; }
  var delta=sign>0?n:-n, label=(w==='grade'?'첨삭':'해설');
  if(!confirm(_acmEmail+' · '+label+' 크레딧 '+(delta>0?'+':'')+delta+'회\n진행할까요?')) return;
  try{
    var uref=db.collection('users').doc(_acmUid); var left=0;
    await db.runTransaction(async function(tx){ var s=await tx.get(uref); var cur=(s.exists&&s.data().aiCredits&&+s.data().aiCredits[w])||0; left=Math.max(0,cur+delta); var nv={}; nv[w]=left; tx.set(uref,{aiCredits:nv},{merge:true}); });
    var b=document.getElementById('acmBal_'+w); if(b) b.textContent=left;
    var inp=document.getElementById('acmN_'+w); if(inp) inp.value='';
    try{ await db.collection('users').doc(_acmUid).collection('aiCreditLog').add({ wallet:w, delta:delta, by:((firebase.auth().currentUser&&firebase.auth().currentUser.email)||'admin'), at: firebase.firestore.FieldValue.serverTimestamp() }); }catch(_){}
  }catch(err){ alert('오류: '+err.message); }
}

// ===== 회원권 관리 (시험별 이용권) =====
const ENT_CERTS = ['bodybuilding','appraiser','realestate1','realestate2','koreanhistory'];
const ENT_PERIODS = [{d:7,l:'1주'},{d:14,l:'2주'},{d:28,l:'4주'},{d:56,l:'8주'},{d:90,l:'90일'},{d:365,l:'365일'}];
let grantUid=null, grantEmailVal=null, grantDays=56;
let grantMode='extend';
function toDateInputVal(d){ const x=new Date(d); const y=x.getFullYear(), m=String(x.getMonth()+1).padStart(2,'0'), dd=String(x.getDate()).padStart(2,'0'); return y+'-'+m+'-'+dd; }
function setGrantMode(mode){
  grantMode=mode;
  document.getElementById('grantExtendBox').style.display = (mode==='extend')?'':'none';
  document.getElementById('grantSetBox').style.display = (mode==='set')?'':'none';
  const ex=document.getElementById('gmExtend'), st=document.getElementById('gmSet');
  ex.style.background=(mode==='extend')?'#1D9E75':'#fff'; ex.style.color=(mode==='extend')?'#fff':'#5F5E5A'; ex.style.borderColor=(mode==='extend')?'#1D9E75':'#E8E8E8';
  st.style.background=(mode==='set')?'#1D9E75':'#fff'; st.style.color=(mode==='set')?'#fff':'#5F5E5A'; st.style.borderColor=(mode==='set')?'#1D9E75':'#E8E8E8';
  if(mode==='set'){
    const inp=document.getElementById('grantSetDate');
    if(!inp.value){
      const cert=document.getElementById('grantCert').value;
      const m=allMembers.find(x=>x.id===grantUid); let base=new Date();
      if(m){ const cur=entStatusOf(m,cert); if(cur.plan==='ACTIVE'&&cur.exp) base=new Date(cur.exp); }
      inp.value=toDateInputVal(base);
    }
  }
  grantPreview();
}
function grantCertChanged(){
  if(grantMode==='set'){ document.getElementById('grantSetDate').value=''; setGrantMode('set'); }
  else grantPreview();
}

function entStatusOf(m, cert){
  const e = (m.entitlements && m.entitlements[cert]) || null;
  let plan = e ? e.plan : null;
  let expireAt = e ? e.expireAt : null;
  if(cert==='bodybuilding' && !e && m.plan){ plan=m.plan; expireAt=m.expireAt; }
  if(!plan) return {plan:'GUEST', label:'미사용', cls:'badge-guest', exp:null};
  let live = plan; let expDate = null;
  if(expireAt){ expDate = expireAt.toDate ? expireAt.toDate() : new Date(expireAt); }
  if(plan==='ACTIVE' && expDate && expDate < new Date()) live='EXPIRED';
  const map = {ACTIVE:['이용중','badge-active'], FREE_TRIAL:['무료체험','badge-free'], EXPIRED:['만료','badge-expired'], GUEST:['미사용','badge-guest']};
  const mm = map[live]||['?','badge-guest'];
  return {plan:live, label:mm[0], cls:mm[1], exp:expDate};
}

function renderEntMembers(){
  const q=(document.getElementById('searchEnt')||{}).value||'';
  let list=allMembers;
  if(q) list=allMembers.filter(m=>(m.email||'').toLowerCase().includes(q.toLowerCase()));
  const box=document.getElementById('entMemberList');
  if(!box) return;
  if(!list.length){ box.innerHTML='<div class="empty">회원이 없습니다.</div>'; return; }
  box.innerHTML = '<table><thead><tr><th>이메일</th>'
    + ENT_CERTS.map(c=>'<th style="text-align:center">'+CERT_NAMES[c]+'</th>').join('')
    + '<th>관리</th></tr></thead><tbody>'
    + list.map(m=>{
        const cells = ENT_CERTS.map(c=>{
          const s=entStatusOf(m,c);
          const expTxt = (s.plan==='ACTIVE'&&s.exp) ? '<div style="font-size:10px;color:#A89C8E">~'+fmtDateShort(s.exp)+'</div>' : '';
          return '<td style="text-align:center"><span class="badge '+s.cls+'">'+s.label+'</span>'+expTxt+'</td>';
        }).join('');
        const em=(m.email||'').replace(/'/g,"\\'");
        return '<tr><td>'+(m.email||'-')+_testBadge(m.email)+'</td>'+cells
          +'<td style="white-space:nowrap"><button class="btn-sm btn-extend" onclick="openGrant(\''+m.id+'\',\''+em+'\')">부여/연장</button>'
          +'<button class="btn-sm btn-expire" onclick="expireMemberCert(\''+m.id+'\',\''+em+'\')" style="margin-left:4px">만료</button></td></tr>';
      }).join('')
    + '</tbody></table>';
}

function openGrant(uid, email){
  grantUid=uid; grantEmailVal=email; grantDays=56;
  document.getElementById('grantEmail').textContent=email;
  const sel=document.getElementById('grantCert');
  sel.innerHTML=ENT_CERTS.map(c=>'<option value="'+c+'">'+CERT_NAMES[c]+'</option>').join('');
  document.getElementById('grantPeriods').innerHTML=ENT_PERIODS.map(p=>
    '<button class="btn-sm" data-d="'+p.d+'" onclick="grantPickPeriod('+p.d+')" style="border:1.5px solid #E8E8E8;background:#fff">'+p.l+'</button>').join('');
  document.getElementById('grantDaysCustom').value='';
  document.getElementById('grantSetDate').value='';
  grantPickPeriod(56);
  setGrantMode('extend');
  document.getElementById('grantModal').classList.remove('hidden');
}
function closeGrantModal(){ document.getElementById('grantModal').classList.add('hidden'); grantUid=null; }
function grantPickPeriod(d){
  grantDays=d;
  document.getElementById('grantDaysCustom').value='';
  document.querySelectorAll('#grantPeriods button').forEach(b=>{
    const on=Number(b.dataset.d)===d;
    b.style.background=on?'#1D9E75':'#fff'; b.style.color=on?'#fff':'#5F5E5A'; b.style.borderColor=on?'#1D9E75':'#E8E8E8';
  });
  grantPreview();
}
function grantPickCustom(){
  const v=Number(document.getElementById('grantDaysCustom').value);
  if(v>0){ grantDays=v; document.querySelectorAll('#grantPeriods button').forEach(b=>{ b.style.background='#fff'; b.style.color='#5F5E5A'; b.style.borderColor='#E8E8E8'; }); }
  grantPreview();
}
function grantPreview(){
  const cert=document.getElementById('grantCert').value;
  const m=allMembers.find(x=>x.id===grantUid);
  let cur=null; const today=new Date();
  if(m){ cur=entStatusOf(m,cert); }
  const curTxt=(cur&&cur.plan==='ACTIVE'&&cur.exp)?('현재 만료 '+fmtDateShort(cur.exp)+' → '):'신규 부여 → ';
  if(grantMode==='set'){
    const v=document.getElementById('grantSetDate').value;
    if(!v){ document.getElementById('grantPreviewBox').innerHTML='만료일을 선택하세요.'; return; }
    const chosen=new Date(v+'T23:59:59');
    const past = chosen < today;
    document.getElementById('grantPreviewBox').innerHTML=
      '<b>'+CERT_NAMES[cert]+'</b> · 만료일 지정<br>'+curTxt+
      '<b style="color:'+(past?'#C0392B':'#1D9E75')+'">'+(past?'즉시 만료 ':'만료일 ')+chosen.toLocaleDateString('ko-KR')+'</b>'+
      (past?'<br><span style="color:#C0392B;font-size:12px">⚠️ 과거 날짜 — 이용권이 즉시 종료됩니다</span>':'');
    return;
  }
  let base=new Date();
  if(cur&&cur.plan==='ACTIVE'&&cur.exp&&cur.exp>base) base=new Date(cur.exp);
  const newExp=new Date(base); newExp.setDate(newExp.getDate()+grantDays);
  document.getElementById('grantPreviewBox').innerHTML=
    '<b>'+CERT_NAMES[cert]+'</b> · '+grantDays+'일<br>'+curTxt+'<b style="color:#1D9E75">새 만료일 '+newExp.toLocaleDateString('ko-KR')+'</b>';
}
async function confirmGrant(){
  if(!grantUid) return;
  const cert=document.getElementById('grantCert').value;
  try{
    const doc=await db.collection('users').doc(grantUid).get();
    const data=doc.data()||{};
    const e=(data.entitlements&&data.entitlements[cert])||null;
    let base, msg;
    if(grantMode==='set'){
      const v=document.getElementById('grantSetDate').value;
      if(!v){ alert('만료일을 선택하세요.'); return; }
      base=new Date(v+'T23:59:59');
      msg='['+CERT_NAMES[cert]+'] 만료일 지정 → '+base.toLocaleDateString('ko-KR');
      if(base<new Date() && !confirm('과거 날짜예요. 이 이용권을 즉시 만료시킬까요?')) return;
    } else {
      if(!grantDays||grantDays<=0){ alert('기간을 선택하세요.'); return; }
      base=new Date();
      if(e&&e.plan==='ACTIVE'&&e.expireAt){ const c=e.expireAt.toDate?e.expireAt.toDate():new Date(e.expireAt); if(c>base) base=c; }
      base.setDate(base.getDate()+Number(grantDays));
      msg='['+CERT_NAMES[cert]+'] '+grantDays+'일 부여 → 새 만료일 '+base.toLocaleDateString('ko-KR');
    }
    const ts=firebase.firestore.Timestamp.fromDate(base);
    const upd={};
    upd['entitlements.'+cert+'.plan']='ACTIVE';
    upd['entitlements.'+cert+'.expireAt']=ts;
    if(grantMode==='extend'){ upd['entitlements.'+cert+'.planDays']=Number(grantDays); }
    if(cert==='bodybuilding'){ upd.plan='ACTIVE'; upd.expireAt=ts; if(grantMode==='extend') upd.planDays=Number(grantDays); }
    await db.collection('users').doc(grantUid).update(upd);
    closeGrantModal();
    alert('✅ '+grantEmailVal+'\n'+msg);
    await loadAll();
    renderEntMembers();
  }catch(e){ alert('오류: '+e.message); }
}

async function expireMemberCert(uid, email){
  const m=allMembers.find(x=>x.id===uid);
  const actives = ENT_CERTS.filter(c=>{ const s=m?entStatusOf(m,c):null; return s&&s.plan==='ACTIVE'; });
  if(!actives.length){ alert(email+'\n활성 이용권이 없습니다.'); return; }
  const menu = actives.map((c,i)=>(i+1)+') '+CERT_NAMES[c]).join('\n');
  const pick = prompt(email+'\n만료할 시험 번호를 선택하세요:\n'+menu+'\n\n0) 전체 만료');
  if(pick===null) return;
  const n=Number(pick);
  try{
    if(n===0){
      const doc=await db.collection('users').doc(uid).get(); const data=doc.data()||{};
      const upd={plan:'EXPIRED'};
      if(data.entitlements){ Object.keys(data.entitlements).forEach(c=>{ upd['entitlements.'+c+'.plan']='EXPIRED'; }); }
      else { upd['entitlements.bodybuilding.plan']='EXPIRED'; }
      await db.collection('users').doc(uid).update(upd);
      alert(email+' 전체 만료 처리 완료.');
    } else if(n>=1&&n<=actives.length){
      const cert=actives[n-1];
      const upd={}; upd['entitlements.'+cert+'.plan']='EXPIRED';
      if(cert==='bodybuilding') upd.plan='EXPIRED';
      await db.collection('users').doc(uid).update(upd);
      alert(email+'\n['+CERT_NAMES[cert]+'] 만료 처리 완료.');
    } else { alert('잘못된 번호입니다.'); return; }
    await loadAll();
    renderEntMembers();
  }catch(e){ alert('오류: '+e.message); }
}

async function lookupUserDetail(){
  const input=document.getElementById("userDetailInput").value.trim();
  const result=document.getElementById("userDetailResult");
  if(!input){result.innerHTML='<div style="color:#E24B4A">이메일 또는 UID를 입력하세요.</div>';return;}
  result.innerHTML='<div class="loading">조회 중...</div>';
  try{
    let uid=input;
    if(input.includes('@')){                       // 이메일 입력이면 회원목록에서 UID로 변환
      const m=memberByEmail(input);
      if(!m){result.innerHTML='<div style="color:#E24B4A">가입 회원 목록에 없는 이메일입니다. (미가입이거나 이메일 오타)</div>';return;}
      uid=m.id;
    }
    const appData=await db.collection("userData").doc(uid).get();
    if(!appData.exists){result.innerHTML='<div style="color:#E24B4A">해당 회원은 가입돼 있으나 학습 기록(userData)이 아직 없습니다.</div>';return;}
    const data=appData.data()||{};
    const srProgress=data.srProgress||{};
    const appWrong=data.appWrong||{};
    let wrongCount=0;
    for(let k in appWrong){let qa=appWrong[k];if(qa&&Array.isArray(qa.q))wrongCount+=qa.q.length;else if(qa)wrongCount++;}
    let stats={};
    for(let k in srProgress){if(srProgress[k].rc>0){let cert=k.split("|")[0];if(!stats[cert])stats[cert]={att:0,wrong:0};stats[cert].att++;}}
    for(let k in appWrong){let cert=k.split("|")[0];if(stats[cert]){let qa=appWrong[k];if(qa&&Array.isArray(qa.q))stats[cert].wrong+=qa.q.length;else if(qa)stats[cert].wrong++;}}
    let html='<div style="background:#fff;border-radius:12px;padding:16px;border:1px solid #E8E8E8"><div style="font-size:12px;color:#888780;margin-bottom:12px"><b>UID:</b> '+uid+'</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px"><div style="background:#F5F5F5;padding:12px;border-radius:8px"><div style="font-size:11px;color:#888780">전체 오답</div><div style="font-size:20px;font-weight:700;color:#E24B4A">'+wrongCount+'개</div></div><div style="background:#F5F5F5;padding:12px;border-radius:8px"><div style="font-size:11px;color:#888780">srProgress 항목</div><div style="font-size:20px;font-weight:700;color:#7F77DD">'+Object.keys(srProgress).length+'개</div></div></div><table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="border-bottom:1px solid #E8E8E8"><th style="text-align:left;padding:8px;font-weight:600">시험</th><th style="text-align:right;padding:8px;font-weight:600">시도</th><th style="text-align:right;padding:8px;font-weight:600">오답</th><th style="text-align:right;padding:8px;font-weight:600">정답률</th></tr>';
    for(let cert in stats){let s=stats[cert];let pct=s.att>0?Math.round((s.att-s.wrong)/s.att*100)+'%':'—';html+='<tr style="border-bottom:1px solid #F0F0F0"><td style="padding:8px">'+certWithId(cert)+'</td><td style="text-align:right;padding:8px">'+s.att+'</td><td style="text-align:right;padding:8px;color:#E24B4A;font-weight:600">'+s.wrong+'</td><td style="text-align:right;padding:8px;font-weight:600">'+pct+'</td></tr>';}
    html+='</table></div>';
    result.innerHTML=html;
  }catch(e){result.innerHTML='<div style="color:#E24B4A">오류: '+e.message+'</div>';console.error(e);}
}

// ===== 관리자 인증 게이트 =====
if (firebaseReady && auth) {
  auth.onAuthStateChanged(function(user){
    const loginEl = document.getElementById('loginScreen');
    const wrapEl  = document.getElementById('adminWrap');
    if (user && (user.email||'').toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      if(loginEl) loginEl.style.display = 'none';
      if(wrapEl)  wrapEl.style.display  = 'flex';
      const em = document.getElementById('adminEmail');
      if (em) em.textContent = user.email;
      loadAll();
      _loadSubjNames();
      startPolling();
    } else if (user) {
      alert('관리자 권한이 없는 계정입니다: ' + user.email);
      auth.signOut();
    } else {
      if(loginEl) loginEl.style.display = 'flex';
      if(wrapEl)  wrapEl.style.display  = 'none';
      stopPolling();
    }
  });
}

// ===== 💬 커뮤니티 관리 =====
const CMA_BOARD = {review:'합격후기', sugg:'건의', notice:'공지'};
let cmaPosts = [], cmaReports = [];
function cmaEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

// ===== 포인트 수동 지급 / 이벤트 환급 철회 (Cloud Function 호출, asia-northeast3) =====
function cmaFns(){ return firebase.app().functions('asia-northeast3'); }
async function cmaGrantPointsUid(uid, label){
  if(!uid){ alert('대상 회원 정보(uid)가 없습니다.'); return; }
  const amtStr = prompt((label?label+' 님께\n':'')+'지급할 포인트(원)를 입력하세요. (1P = 1원)');
  if(amtStr===null) return;
  const amount = Math.floor(Number(String(amtStr).replace(/[,\s]/g,'')));
  if(!(amount>0)){ alert('금액이 올바르지 않습니다.'); return; }
  const memo = prompt('지급 사유(메모, 선택)','') || '';
  if(!confirm(amount.toLocaleString()+'P 를 지급할까요?\n사유: '+(memo||'(없음)'))) return;
  try{
    const r = await cmaFns().httpsCallable('grantPointsAdmin')({uid:uid, amount:amount, memo:memo});
    alert('✅ 지급 완료. 현재 잔액 '+(((r.data&&r.data.balance)||0).toLocaleString())+'P');
  }catch(e){ alert('지급 실패: '+(e&&e.message?e.message:e)); }
}
function cmaGrantPost(pid){ const p=cmaPosts.find(x=>x.id===pid); if(!p) return; cmaGrantPointsUid(p.authorUid, p.authorNick||p.authorUid); }
async function cmaTogglePin(pid){
  const p=cmaPosts.find(x=>x.id===pid); if(!p) return;
  const np=!p.pinned;
  if(!confirm(np?'이 글을 게시판 맨 위에 고정할까요?':'고정을 해제할까요?')) return;
  try{
    await db.collection('posts').doc(pid).update({pinned:np});
    p.pinned=np; cmaRenderPosts();
  }catch(e){ alert('고정 변경 실패: '+(e&&e.message?e.message:e)); }
}
async function cmaRevokeEvent(pid){
  const p=cmaPosts.find(x=>x.id===pid); if(!p) return;
  if(!p.authorUid || !p.cert){ alert('이 글은 작성자·자격증 정보가 없어 철회할 수 없습니다.'); return; }
  const cn=(typeof CERT_NAMES!=='undefined'&&CERT_NAMES[p.cert])?CERT_NAMES[p.cert]:p.cert;
  if(!confirm('['+cn+'] 이벤트 환급 포인트를 회수하고,\n이 회원의 해당 자격증 재지급을 영구 차단할까요?\n작성자: '+(p.authorNick||p.authorUid))) return;
  try{
    const r = await cmaFns().httpsCallable('revokeEventRefund')({uid:p.authorUid, cert:p.cert});
    const took=(r.data&&r.data.reclaimed)||0;
    alert(took>0 ? ('✅ '+took.toLocaleString()+'P 회수 완료. 잔액 '+(((r.data&&r.data.balance)||0).toLocaleString())+'P') : '회수할 이벤트 포인트가 없습니다 (이미 회수됐거나 미지급).');
  }catch(e){ alert('철회 실패: '+(e&&e.message?e.message:e)); }
}

function cmaInit(){ cmaLoadReports(); cmaLoadPosts(); }

// --- 공지 작성 ---
async function cmaSubmitNotice(){
  const title=(document.getElementById('cmaNoticeTitle').value||'').trim();
  const body =(document.getElementById('cmaNoticeBody').value||'').trim();
  if(!title||!body){ alert('제목과 내용을 모두 입력하세요.'); return; }
  const u=auth.currentUser; if(!u){ alert('로그인이 필요합니다.'); return; }
  try{
    await db.collection('posts').doc().set({
      board:'notice', cert:null, title, body,
      authorUid:u.uid, authorNick:'운영자', authorPhoto:u.photoURL||'',
      images:[], upCount:0, downCount:0, commentCount:0, pinned:true,
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('cmaNoticeTitle').value='';
    document.getElementById('cmaNoticeBody').value='';
    alert('공지를 등록했습니다.');
    cmaLoadPosts();
  }catch(e){ alert('오류: '+(e&&e.message?e.message:e)); }
}

// --- 글 신고 처리 (postId 있는 것 = 글 신고) ---
async function cmaLoadReports(){
  const box=document.getElementById('cmaReportList');
  try{
    const snap=await db.collection('reports').orderBy('createdAt','desc').get();
    cmaReports=snap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.postId);
    cmaRenderReports();
  }catch(e){ box.innerHTML='<div class="empty">불러오기 실패: '+(e&&e.code?e.code:(e&&e.message?e.message:e))+'</div>'; }
}
function cmaRenderReports(){
  const box=document.getElementById('cmaReportList');
  if(!cmaReports.length){ box.innerHTML='<div class="empty">신고 내역이 없습니다.</div>'; return; }
  box.innerHTML='<table><thead><tr><th>신고일</th><th>게시판</th><th>글 제목</th><th>사유</th><th>신고자</th><th>상태</th><th>처리</th></tr></thead><tbody>'
    + cmaReports.map(r=>`<tr>
        <td style="font-size:11px">${fmtDateShort(r.createdAt)}</td>
        <td style="font-size:11px"><span class="badge">${CMA_BOARD[r.board]||r.board||'-'}</span></td>
        <td style="max-width:200px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${cmaEsc(r.postTitle||'')}">${cmaEsc(r.postTitle||'(제목없음)')}</div></td>
        <td style="font-size:12px;max-width:160px">${cmaEsc(r.reason||'-')}</td>
        <td style="font-size:11px">${cmaEsc(r.reporterNick||'-')}</td>
        <td><span class="badge ${r.status==='done'?'badge-approved':'badge-pending'}">${r.status==='done'?'처리완료':'대기'}</span></td>
        <td>${r.status==='done'?'-':`<button class="btn-sm btn-approve" onclick="cmaResolveReport('${r.id}')">완료</button>`}</td>
      </tr>`).join('')
    + '</tbody></table>';
}
async function cmaResolveReport(rid){
  try{
    await db.collection('reports').doc(rid).update({ status:'done', doneAt:firebase.firestore.FieldValue.serverTimestamp() });
    const r=cmaReports.find(x=>x.id===rid); if(r) r.status='done';
    cmaRenderReports();
  }catch(e){ alert('오류: '+(e&&e.message?e.message:e)); }
}

// --- 글 목록 ---
async function cmaLoadPosts(){
  const board=document.getElementById('cmaBoardFilter').value;
  const box=document.getElementById('cmaPostList');
  try{
    let q=db.collection('posts');
    if(board) q=q.where('board','==',board);
    const snap=await q.orderBy('createdAt','desc').limit(100).get();
    cmaPosts=snap.docs.map(d=>({id:d.id,...d.data()}));
    cmaRenderPosts();
  }catch(e){ box.innerHTML='<div class="empty">불러오기 실패: '+(e&&e.code?e.code:(e&&e.message?e.message:e))+'</div>'; }
}
function cmaRenderPosts(){
  const box=document.getElementById('cmaPostList');
  if(!cmaPosts.length){ box.innerHTML='<div class="empty">글이 없습니다.</div>'; return; }
  box.innerHTML='<table><thead><tr><th>작성일</th><th>게시판</th><th>제목</th><th>작성자</th><th>추천</th><th>댓글</th><th>관리</th></tr></thead><tbody>'
    + cmaPosts.map(p=>`<tr>
        <td style="font-size:11px">${fmtDateShort(p.createdAt)}</td>
        <td style="font-size:11px"><span class="badge">${CMA_BOARD[p.board]||p.board}</span></td>
        <td style="max-width:220px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${cmaEsc(p.title)}">${p.pinned?'📌 ':''}${cmaEsc(p.title)}</div></td>
        <td style="font-size:11px">${cmaEsc(p.authorNick||'-')}</td>
        <td style="font-size:11px">▲${p.upCount||0} ▼${p.downCount||0}</td>
        <td><button class="btn-sm" onclick="cmaToggleComments('${p.id}')" style="background:#F1EFFB;color:#5B50C0;border:none;cursor:pointer">💬 ${p.commentCount||0}</button></td>
        <td style="white-space:nowrap">${p.board==='notice'?`<button class="btn-sm" onclick="cmaTogglePin('${p.id}')" style="background:${p.pinned?'#FDECEC':'#E6F1FB'};color:${p.pinned?'#A32D2D':'#185FA5'};border:1px solid ${p.pinned?'#F0C9C9':'#B5D4F4'};cursor:pointer;margin-right:3px">${p.pinned?'고정 해제':'📌 고정'}</button>`:''}<button class="btn-sm" onclick="cmaGrantPost('${p.id}')" style="background:#EAF5EE;color:#15793F;border:1px solid #B7E0C5;cursor:pointer">💰 지급</button>${p.board==='review'?`<button class="btn-sm" onclick="cmaRevokeEvent('${p.id}')" style="background:#FFF3E0;color:#C2611B;border:1px solid #F0D3A8;cursor:pointer;margin-left:3px">철회</button>`:''}<button class="btn-sm" onclick="cmaDeletePost('${p.id}')" style="background:#FDECEC;color:#A32D2D;border:1px solid #F0C9C9;cursor:pointer;margin-left:3px">삭제</button></td>
      </tr>
      <tr id="cmaCmRow-${p.id}" style="display:none"><td colspan="7" style="background:#FAFAF8;padding:0"><div id="cmaCmBox-${p.id}" style="padding:10px 16px"></div></td></tr>`).join('')
    + '</tbody></table>';
}

// --- 댓글 펼침/삭제 ---
async function cmaToggleComments(pid){
  const row=document.getElementById('cmaCmRow-'+pid);
  if(!row) return;
  if(row.style.display!=='none'){ row.style.display='none'; return; }
  row.style.display='';
  cmaLoadComments(pid);
}
async function cmaLoadComments(pid){
  const boxEl=document.getElementById('cmaCmBox-'+pid);
  if(!boxEl) return;
  boxEl.innerHTML='<div class="loading">로딩 중...</div>';
  try{
    const snap=await db.collection('posts').doc(pid).collection('comments').orderBy('createdAt','asc').get();
    const cs=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(!cs.length){ boxEl.innerHTML='<div style="color:#B4A99C;font-size:12px">댓글 없음</div>'; return; }
    boxEl.innerHTML=cs.map(c=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid #F0EDE9">
        <div style="font-size:12px"><b>${cmaEsc(c.authorNick||'-')}</b> <span style="color:#A89C8E">${fmtDateShort(c.createdAt)}</span><br>${cmaEsc(c.body||'')}</div>
        <button class="btn-sm" onclick="cmaDeleteComment('${pid}','${c.id}')" style="background:#FDECEC;color:#A32D2D;border:1px solid #F0C9C9;cursor:pointer;align-self:flex-start">삭제</button>
      </div>`).join('');
  }catch(e){ boxEl.innerHTML='<div class="empty">불러오기 실패: '+(e&&e.message?e.message:e)+'</div>'; }
}
async function cmaDeleteComment(pid,cid){
  if(!confirm('이 댓글을 삭제할까요?')) return;
  try{
    await db.collection('posts').doc(pid).collection('comments').doc(cid).delete();
    await db.collection('posts').doc(pid).update({ commentCount: firebase.firestore.FieldValue.increment(-1) });
    const p=cmaPosts.find(x=>x.id===pid); if(p) p.commentCount=Math.max(0,(p.commentCount||0)-1);
    cmaRenderPosts();  // 댓글수 배지 갱신 (행 재생성)
    const row=document.getElementById('cmaCmRow-'+pid); if(row){ row.style.display=''; cmaLoadComments(pid); }  // 펼침 상태 유지
  }catch(e){ alert('오류: '+(e&&e.message?e.message:e)); }
}

// --- 글 삭제 (댓글·추천 기록도 함께 정리) ---
async function cmaDeletePost(pid){
  const p=cmaPosts.find(x=>x.id===pid);
  if(!confirm('이 글을 삭제할까요?\n'+(p&&p.title?('"'+p.title+'"\n'):'')+'(댓글·추천 기록도 함께 삭제됩니다)')) return;
  try{
    const postRef=db.collection('posts').doc(pid);
    for(const sub of ['comments','votes']){
      const snap=await postRef.collection(sub).get();
      if(snap.size){ const batch=db.batch(); snap.docs.forEach(d=>batch.delete(d.ref)); await batch.commit(); }
    }
    await postRef.delete();
    cmaPosts=cmaPosts.filter(x=>x.id!==pid);
    cmaRenderPosts();
  }catch(e){ alert('오류: '+(e&&e.message?e.message:e)); }
}

