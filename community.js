function cmAwardToast(prevBal, mode, certLabel){
  if(!currentUser || !db) return;
  mode = mode || 'earn';
  var ref=db.collection('users').doc(currentUser.uid), tries=0;
  var poll=function(){
    tries++;
    ref.get().then(function(snap){
      var d=(snap&&snap.exists)?snap.data():{};
      var lots=Array.isArray(d.mileageLots)?d.mileageLots:[];
      var bal=(typeof mileageBalance==='function')?mileageBalance(lots):0;
      var delta=bal-prevBal;
      var changed = (mode==='earn') ? (delta>0) : (delta<0);
      if(changed){
        myMileageLots=lots; window._cmUserDoc=d;
        if(typeof updateAuthBar==='function'){ try{ updateAuthBar(); }catch(_){} }
        var amt=Math.abs(delta);
        if(typeof showPtModal==='function') showPtModal(mode, amt, certLabel);
        else if(typeof clToast==='function') clToast('\uD83D\uDCB0 \uD3EC\uC778\uD2B8 '+(mode==='earn'?'+':'-')+amt.toLocaleString()+'P');
        return;
      }
      if(tries<8) setTimeout(poll,2000);
    }).catch(function(){});
  };
  setTimeout(poll,1500);
}
var CM_CERT_LABEL = {bodybuilding:'생체2급 구술', appraiser:'감평사', realestate1:'공인1', realestate2:'공인2', koreanhistory:'한국사', housing:'주택관리사', housing2:'주관2'};
var cmBoard = 'review';
async function openCommunity(){
  if(typeof mqStopTimer==='function') mqStopTimer();
  if(typeof mqStopOverTimer==='function') mqStopOverTimer();
  var ids=['homeView','bodybuildingView','mcqView','myPageView'];
  ids.forEach(function(id){ var el=document.getElementById(id); if(el) el.classList.add('hidden'); });
  document.getElementById('communityView').classList.remove('hidden');
  var _ft=document.querySelector('.footer'); if(_ft) _ft.classList.add('hidden');
  var cs=document.getElementById('certSwitch'); if(cs) cs.classList.remove('hidden');
  cmSwitchTab(cmBoard);                                    // 목록 먼저 즉시 로드
  if(typeof cmLoadUserDoc==='function') cmLoadUserDoc();   // 닉네임용 — 백그라운드(목록과 무관)
}
function cmSwitchTab(board){
  cmBoard = board;
  ['review','sugg','notice'].forEach(function(b){
    var el=document.getElementById('cmTab-'+b); if(el) el.classList.toggle('on', b===board);
  });
  cmLoadList(board);
}
function cmCardHTML(p){
  var badge='';
  if(p.board==='review' && p.cert) badge='<span class="cm-cert">'+cmEsc(CM_CERT_LABEL[p.cert]||p.cert)+'</span>';
  if(p.board==='notice' && p.pinned) badge='<span class="cm-pin">📌 고정</span>';
  var meta='<span class="nick">'+cmEsc(p.authorNick||'익명')+'</span><span>\u00b7</span><span>'+cmTimeAgo(p.createdAt)+'</span>';
  var views='<span>👁️ '+(p.viewCount||0)+'</span>';
  var stat = (p.board==='notice')
    ? '<span class="sp">'+views+'</span>'
    : '<span class="sp"><span>\u2764\ufe0f '+(p.likeCount||0)+'</span><span>💬 '+(p.commentCount||0)+'</span>'+views+'</span>';
  var body = p.body ? '<div class="cm-pe">'+cmEsc(p.body)+'</div>' : '';
  return '<div class="cm-post" onclick="cmOpenDetail(\''+p._id+'\')">'
    +'<div class="cm-pt">'+badge+cmEsc(p.title||'')+'</div>'+body
    +'<div class="cm-pm">'+meta+stat+'</div></div>';
}
var _cmCache={};                 // board -> {posts, at} 메모리 캐시(재진입 즉시 표시)
var _CM_CACHE_TTL=60000;        // 60초 내 재진입은 네트워크 생략
function cmInvalidateCache(board){ if(board) delete _cmCache[board]; else _cmCache={}; }
function cmHeadHTML(board){
  if(board==='notice'){
    var h='<div class="cm-admin-note">📢 공지는 관리자만 작성할 수 있어요.</div>';
    if(cmIsAdmin()) h+='<button class="cm-write" onclick="cmOpenWrite()">\u270F\ufe0f 공지 작성</button>';
    return h;
  }
  return '<button class="cm-write" onclick="cmOpenWrite()">\u270F\ufe0f 글 작성하기</button>';
}
function cmListHTML(board, head, posts){
  if(!posts || !posts.length) return head+'<div class="cm-empty">아직 글이 없어요.<br>첫 글을 남겨보세요!</div>';
  var todayHtml='';
  if(board==='review'){
    var now=Date.now();
    var cand=posts.filter(function(p){ var t=(p.createdAt&&p.createdAt.toDate)?p.createdAt.toDate().getTime():0; return (p.upCount||0)>0 && (now-t)<172800000; });
    cand.sort(function(a,b){ return (b.upCount||0)-(a.upCount||0); });
    if(cand.length) todayHtml=cmTodayHTML(cand[0]);
  }
  var listHtml=''; posts.forEach(function(p){ listHtml+=cmCardHTML(p); });
  return head+todayHtml+listHtml;
}
async function cmLoadList(board){
  var body=document.getElementById('cmBody'); if(!body) return;
  if(!firebaseReady || !db){ body.innerHTML='<div class="cm-empty">서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.</div>'; return; }
  var head=cmHeadHTML(board);
  // 1) 캐시 있으면 즉시 표시(오래됐어도 일단 보여주고 뒤에서 갱신) → 재진입 체감 즉시
  var c=_cmCache[board];
  if(c){ body.innerHTML=cmListHTML(board, head, c.posts); }
  else { body.innerHTML='<div class="cm-loading">불러오는 중\u2026</div>'; }
  // 2) 신선하면(60초 내) 네트워크 생략
  if(c && (Date.now()-c.at < _CM_CACHE_TTL)) return;
  // 3) 네트워크 갱신
  try{
    var snap=await db.collection('posts').where('board','==',board).orderBy('createdAt','desc').limit(30).get();
    var posts=[]; snap.forEach(function(doc){ var p=doc.data(); p._id=doc.id; posts.push(p); });
    _cmCache[board]={posts:posts, at:Date.now()};
    if(cmBoard===board) body.innerHTML=cmListHTML(board, head, posts);   // 그새 탭 바꿨으면 덮어쓰지 않음
  }catch(e){
    console.warn('cmLoadList', e);
    if(!c){   // 캐시로 이미 뭔가 보여줬으면 에러로 덮지 않음
      var msg = (e && /index/i.test(e.message||'')) ? '목록 정렬 인덱스가 필요해요. (콘솔에서 생성)' : '목록을 불러오지 못했어요.';
      body.innerHTML=head+'<div class="cm-empty">'+msg+'</div>';
    }
  }
}
var CM_CERTS=[['bodybuilding','생체2급(보디빌딩) 구술'],['appraiser','감정평가사'],['realestate1','공인중개사 1차'],['realestate2','공인중개사 2차'],['koreanhistory','한국사'],['housing','주택관리사'],['housing2','주택관리사 2차']];
function cmOpenWrite(){
  if(!currentUser){ alert('글을 쓰려면 로그인이 필요해요.'); if(typeof showLoginPopup==='function') showLoginPopup(); return; }
  cmEditId=null;
  var _sb=document.getElementById('cmwSubmit'); if(_sb) _sb.textContent='등록하기';
  document.getElementById('cmListWrap').classList.add('hidden');
  document.getElementById('cmDetail').classList.add('hidden');
  document.getElementById('cmWrite').classList.remove('hidden');
  var bsel=document.getElementById('cmwBoard');
  var opts='<option value="review">🔥 합격 후기</option><option value="sugg">🙋 건의사항</option>';
  if(cmIsAdmin()) opts+='<option value="notice">📢 공지사항</option>';
  bsel.innerHTML=opts;
  bsel.value=(cmBoard==='notice'&&!cmIsAdmin())?'review':cmBoard;
  var csel=document.getElementById('cmwCert');
  csel.innerHTML=CM_CERTS.map(function(c){return '<option value="'+c[0]+'">'+c[1]+'</option>';}).join('');
  var _nkEl=document.getElementById('cmwNick');
  if(window._cmUserDoc && window._cmUserDoc.boardNick){ _nkEl.value=window._cmUserDoc.boardNick; _nkEl.readOnly=true; _nkEl.style.background='#F1EFEC'; }
  else { var nk=cmGetNick(); _nkEl.value=(nk==='익명')?'':nk; _nkEl.readOnly=false; _nkEl.style.background=''; }
  document.getElementById('cmwTitle').value=''; document.getElementById('cmwBody').value='';
  cmFiles=[]; cmRenderImgRow();
  cmwToggleCert();
}
function cmCloseWrite(){
  document.getElementById('cmWrite').classList.add('hidden');
  document.getElementById('cmListWrap').classList.remove('hidden');
}
function cmwToggleCert(){
  var b=document.getElementById('cmwBoard').value;
  document.getElementById('cmwCertField').style.display=(b==='review')?'block':'none';
}
var cmEditId=null;   // 수정 중인 글 id (null이면 새 글)
function cmEditPost(){
  if(!cmCurPost || !cmCurPost._id){ return; }
  var p=cmCurPost;
  cmEditId=p._id;
  // 작성 폼 열기 (cmOpenWrite 재활용 후 값 채움)
  document.getElementById('cmListWrap').classList.add('hidden');
  document.getElementById('cmDetail').classList.add('hidden');
  document.getElementById('cmWrite').classList.remove('hidden');
  var bsel=document.getElementById('cmwBoard');
  var opts='<option value="review">🔥 합격 후기</option><option value="sugg">🙋 건의사항</option>';
  if(cmIsAdmin()) opts+='<option value="notice">📢 공지사항</option>';
  bsel.innerHTML=opts; bsel.value=p.board||'review';
  var csel=document.getElementById('cmwCert');
  csel.innerHTML=CM_CERTS.map(function(c){return '<option value="'+c[0]+'">'+c[1]+'</option>';}).join('');
  if(p.cert) csel.value=p.cert;
  var _nkEl=document.getElementById('cmwNick');
  _nkEl.value=p.authorNick||cmGetNick(); _nkEl.readOnly=true; _nkEl.style.background='#F1EFEC';
  document.getElementById('cmwTitle').value=p.title||'';
  document.getElementById('cmwBody').value=p.body||'';
  cmFiles=[]; cmRenderImgRow();   // 수정 시 이미지 재첨부는 v1 미지원(기존 이미지 유지)
  cmwToggleCert();
  var sb=document.getElementById('cmwSubmit'); if(sb) sb.textContent='수정 완료';
}
async function cmSubmitPost(){
  if(!currentUser){ alert('로그인이 필요해요.'); return; }
  var board=document.getElementById('cmwBoard').value;
  var cert=(board==='review')?document.getElementById('cmwCert').value:null;
  var nick=(document.getElementById('cmwNick').value||'').trim();
  var title=(document.getElementById('cmwTitle').value||'').trim();
  var body=(document.getElementById('cmwBody').value||'').trim();
  if(board==='notice'&&!cmIsAdmin()){ alert('공지는 관리자만 작성할 수 있어요.'); return; }
  if(!nick){ alert('닉네임을 입력해 주세요.'); return; }
  if(nick.length>20){ alert('닉네임은 20자 이내로 해주세요.'); return; }
  if(window._cmUserDoc && window._cmUserDoc.boardNick){ nick=window._cmUserDoc.boardNick; }  // 닉 잠금: 기존 닉 강제
  if(!title){ alert('제목을 입력해 주세요.'); return; }
  if(!body){ alert('내용을 입력해 주세요.'); return; }
  var btn=document.getElementById('cmwSubmit'); btn.disabled=true; btn.textContent='등록 중\u2026';
  // ===== 수정 모드: 기존 글 update (ID 유지, 포인트 재지급 없음) =====
  if(cmEditId){
    btn.textContent='수정 중\u2026';
    try{
      await db.collection('posts').doc(cmEditId).update({
        board:board, cert:cert, title:title, body:body,
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      var _eid=cmEditId; cmEditId=null;
      btn.disabled=false; btn.textContent='등록하기';
      cmInvalidateCache(board); cmBoard=board; cmCloseWrite();
      if(typeof cmOpenDetail==='function') cmOpenDetail(_eid);
      if(typeof clToast==='function') clToast('수정되었어요');
    }catch(e){
      console.warn('cmEditPost',e); btn.disabled=false; btn.textContent='수정 완료';
      alert('수정 중 오류가 났어요.'+((/permission/i.test(e.message||''))?'\n(권한이 없어요)':''));
    }
    return;
  }
  try{
    if(currentUser && (!window._cmUserDoc || !window._cmUserDoc.boardNick)){
      try{ await db.collection('users').doc(currentUser.uid).set({boardNick:nick},{merge:true}); window._cmUserDoc=window._cmUserDoc||{}; window._cmUserDoc.boardNick=nick; }catch(_){}
    }
    var _prevBal=(typeof mileageBalance==='function')?mileageBalance(myMileageLots):0;
    var _pref=db.collection('posts').doc(); var _pid=_pref.id;
    var _imgs=[];
    if(cmFiles && cmFiles.length){ btn.textContent='사진 올리는 중…'; _imgs=await cmUploadImages(_pid, cmFiles); btn.textContent='등록 중…'; }
    await _pref.set({
      board:board, cert:cert, title:title, body:body,
      authorUid:currentUser.uid, authorNick:nick, authorPhoto:(currentUser.photoURL||null),
      images:_imgs, upCount:0, downCount:0, commentCount:0, pinned:false,
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    btn.disabled=false; btn.textContent='등록하기';
    cmInvalidateCache(board); cmBoard=board; cmCloseWrite(); cmSwitchTab(board);
    var _certLbl=(board==='review'&&cert)?(CM_CERT_LABEL[cert]||cert):null;
    cmAwardToast(_prevBal, 'earn', _certLbl);
  }catch(e){
    console.warn('cmSubmitPost',e); btn.disabled=false; btn.textContent='등록하기';
    alert('등록 중 오류가 났어요.'+((/permission/i.test(e.message||''))?'\n(공지는 관리자만 작성할 수 있어요)':''));
  }
}
var cmCurPost=null, cmMyVote=0;
async function cmOpenDetail(id){
  var _cv=document.getElementById('communityView');
  if(_cv && _cv.classList.contains('hidden')){ ['homeView','bodybuildingView','mcqView','myPageView'].forEach(function(x){var el=document.getElementById(x); if(el) el.classList.add('hidden');}); _cv.classList.remove('hidden'); var _cs=document.getElementById('certSwitch'); if(_cs) _cs.classList.remove('hidden'); }
  document.getElementById('cmListWrap').classList.add('hidden');
  var d=document.getElementById('cmDetail'); d.classList.remove('hidden');
  try{ history.replaceState(history.state, '', '#post/'+id); }catch(_){}
  var box=document.getElementById('cmDetailBody'); box.innerHTML='<div class="cm-loading">불러오는 중\u2026</div>';
  if(!firebaseReady||!db){ box.innerHTML='<div class="cm-empty">서버에 연결할 수 없어요.</div>'; return; }
  try{
    var doc=await db.collection('posts').doc(id).get();
    if(!doc.exists){ box.innerHTML='<div class="cm-empty">삭제되었거나 없는 글이에요.</div>'; return; }
    var p=doc.data(); p._id=id; cmCurPost=p; cmMyVote=0;
    p.viewCount=(p.viewCount||0)+1;
    try{ db.collection('posts').doc(id).update({viewCount:firebase.firestore.FieldValue.increment(1)}).catch(function(){}); }catch(_){}
    if(currentUser){
      try{ var vd=await db.collection('posts').doc(id).collection('votes').doc(currentUser.uid).get(); if(vd.exists) cmMyVote=vd.data().v||0; }catch(_){}
    }
    box.innerHTML=cmRenderDetail(p);
    var delBtn=document.getElementById('cmDelBtn');
    var canDel=currentUser && (p.authorUid===currentUser.uid || cmIsAdmin());
    if(delBtn) delBtn.classList.toggle('hidden', !canDel);
    var editBtn=document.getElementById('cmEditBtn');
    if(editBtn) editBtn.classList.toggle('hidden', !canDel);
    var repBtn=document.getElementById('cmRepBtn');
    var canRep=currentUser && p.authorUid!==currentUser.uid;
    if(repBtn) repBtn.classList.toggle('hidden', !canRep);
    cmRefreshVoteUI();
    if(p.board!=='notice') cmLoadComments();
  }catch(e){ console.warn('cmOpenDetail',e); box.innerHTML='<div class="cm-empty">글을 불러오지 못했어요.</div>'; }
}
function cmIsMobileShare(){
  try{
    if(!navigator.share) return false;
    var coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    var mobileUA = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent||'');
    return !!(coarse || mobileUA);
  }catch(_){ return false; }
}
function cmSharePost(){
  var p=(typeof cmCurPost!=='undefined')?cmCurPost:null;
  if(!p||!p._id) return;
  var url=location.origin+location.pathname+'#post/'+p._id;
  var title=p.title||'CertLab';
  // 모바일=네이티브 공유창 / PC=바로 링크 복사
  if(cmIsMobileShare()){ try{ navigator.share({title:title, url:url}).catch(function(){}); return; }catch(_){} }
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(function(){ if(typeof clToast==='function') clToast('링크가 복사되었어요'); }).catch(function(){ cmCopyFallback(url); }); return; } }catch(_){}
  cmCopyFallback(url);
}
function cmCopyFallback(url){
  try{ var i=document.createElement('input'); i.value=url; i.style.position='fixed'; i.style.opacity='0'; document.body.appendChild(i); i.select(); document.execCommand('copy'); document.body.removeChild(i); if(typeof clToast==='function') clToast('링크가 복사되었어요'); }
  catch(_){ try{ prompt('아래 링크를 복사하세요', url); }catch(__){} }
}
function cmCloseDetail(){
  document.getElementById('cmDetail').classList.add('hidden');
  try{ if((location.hash||'').indexOf('#post/')===0) history.replaceState(history.state, '', location.pathname+location.search); }catch(_){}
  document.getElementById('cmListWrap').classList.remove('hidden');
  cmLoadList(cmBoard);
}
function cmRenderDetail(p){
  var badge='';
  if(p.board==='review'&&p.cert) badge='<span class="cm-cert">'+cmEsc(CM_CERT_LABEL[p.cert]||p.cert)+'</span>';
  if(p.board==='notice'&&p.pinned) badge='<span class="cm-pin">📌 고정</span>';
  var imgs='';
  if(Array.isArray(p.images)) p.images.forEach(function(u){ imgs+='<img class="cm-dimg" src="'+cmEsc(u)+'" alt="">'; });
  var votes=(p.board==='notice')?'':
    '<div class="cm-vote-row">'
    +'<button class="cm-vote up" id="cmUpBtn" onclick="cmVote(1)">👍 추천 <b id="cmUpN">'+(p.upCount||0)+'</b></button>'
    +'<button class="cm-vote down" id="cmDownBtn" onclick="cmVote(-1)">👎 비공감 <b id="cmDownN">'+(p.downCount||0)+'</b></button>'
    +'</div>';
  var cmt=(p.board==='notice')?'':
    '<div id="cmComments"></div>'
    +'<div class="cm-cmt-input"><input id="cmCmtInput" maxlength="1000" placeholder="댓글을 입력하세요"><button onclick="cmAddComment()">등록</button></div>';
  return '<div class="cm-dtitle">'+badge+cmEsc(p.title||'')+'</div>'
    +'<div class="cm-dmeta"><span class="nick">'+cmEsc(p.authorNick||'익명')+'</span><span>\u00b7</span><span>'+cmTimeAgo(p.createdAt)+'</span><span>\u00b7</span><span>👁️ '+(p.viewCount||0)+'</span></div>'
    +'<div class="cm-dtext">'+cmEsc(p.body||'').replace(/\n/g,'<br>')+'</div>'+imgs+votes+cmt;
}
function cmRefreshVoteUI(){
  var un=document.getElementById('cmUpN'), dn=document.getElementById('cmDownN');
  if(un&&cmCurPost) un.textContent=cmCurPost.upCount||0;
  if(dn&&cmCurPost) dn.textContent=cmCurPost.downCount||0;
  var ub=document.getElementById('cmUpBtn'), db2=document.getElementById('cmDownBtn');
  if(ub) ub.classList.toggle('on', cmMyVote===1);
  if(db2) db2.classList.toggle('on', cmMyVote===-1);
}
async function cmVote(v){
  if(!currentUser){ alert('추천하려면 로그인이 필요해요.'); return; }
  if(!cmCurPost) return;
  var pref=db.collection('posts').doc(cmCurPost._id);
  var vref=pref.collection('votes').doc(currentUser.uid);
  var nUp,nDown,nV;
  try{
    await db.runTransaction(async function(tx){
      var pd=await tx.get(pref); var vd=await tx.get(vref);
      if(!pd.exists) throw new Error('no post');
      var up=pd.data().upCount||0, down=pd.data().downCount||0;
      var cur=vd.exists?(vd.data().v||0):0;
      nV=(cur===v)?0:v;
      if(cur===1) up--; else if(cur===-1) down--;
      if(nV===1) up++; else if(nV===-1) down++;
      up=Math.max(0,up); down=Math.max(0,down);
      if(nV===0) tx.delete(vref); else tx.set(vref,{v:nV, at:firebase.firestore.FieldValue.serverTimestamp()});
      tx.update(pref,{upCount:up, downCount:down});
      nUp=up; nDown=down;
    });
    cmCurPost.upCount=nUp; cmCurPost.downCount=nDown; cmMyVote=nV;
    cmRefreshVoteUI();
  }catch(e){ console.warn('cmVote',e); alert('처리 중 오류가 났어요.'); }
}
async function cmLoadComments(){
  var box=document.getElementById('cmComments'); if(!box||!cmCurPost) return;
  try{
    var snap=await db.collection('posts').doc(cmCurPost._id).collection('comments').orderBy('createdAt','asc').get();
    var html='<div class="cm-cmt-h">댓글 '+snap.size+'</div>';
    if(snap.empty) html+='<div class="cm-cmt-empty">첫 댓글을 남겨보세요.</div>';
    snap.forEach(function(dc){
      var c=dc.data(); var canDel=currentUser&&(c.authorUid===currentUser.uid||cmIsAdmin());
      html+='<div class="cm-cmt"><div class="cm-cmt-top"><span class="nick">'+cmEsc(c.authorNick||'익명')+'</span><span>'+cmTimeAgo(c.createdAt)+'</span>'
        +(canDel?'<span class="cm-cmt-del" onclick="cmDeleteComment(\''+dc.id+'\')">삭제</span>':'')
        +'</div><div class="cm-cmt-b">'+cmEsc(c.body).replace(/\n/g,'<br>')+'</div></div>';
    });
    box.innerHTML=html;
  }catch(e){ console.warn('cmLoadComments',e); box.innerHTML='<div class="cm-cmt-empty">댓글을 불러오지 못했어요.</div>'; }
}
async function cmAddComment(){
  if(!currentUser){ alert('댓글을 쓰려면 로그인이 필요해요.'); return; }
  if(!cmCurPost) return;
  var inp=document.getElementById('cmCmtInput'); var t=(inp.value||'').trim();
  if(!t) return;
  if(t.length>1000){ alert('댓글이 너무 길어요(1000자 이내).'); return; }
  var pref=db.collection('posts').doc(cmCurPost._id);
  var _prevBal=(typeof mileageBalance==='function')?mileageBalance(myMileageLots):0;
  try{
    await pref.collection('comments').add({ body:t, authorUid:currentUser.uid, authorNick:cmGetNick(), createdAt:firebase.firestore.FieldValue.serverTimestamp() });
    await pref.update({ commentCount:firebase.firestore.FieldValue.increment(1) });
    inp.value=''; cmCurPost.commentCount=(cmCurPost.commentCount||0)+1;
    cmLoadComments();
    cmAwardToast(_prevBal);
  }catch(e){ console.warn('cmAddComment',e); alert('댓글 등록 중 오류가 났어요.'); }
}
async function cmDeleteComment(cid){
  if(!cmCurPost) return;
  if(!confirm('댓글을 삭제할까요?')) return;
  var pref=db.collection('posts').doc(cmCurPost._id);
  try{
    await pref.collection('comments').doc(cid).delete();
    await pref.update({ commentCount:firebase.firestore.FieldValue.increment(-1) });
    cmCurPost.commentCount=Math.max(0,(cmCurPost.commentCount||1)-1);
    cmLoadComments();
  }catch(e){ console.warn('cmDeleteComment',e); alert('삭제 중 오류가 났어요.'); }
}
async function cmDeletePost(){
  if(!cmCurPost) return;
  if(!confirm('이 글을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
  var _prevBal=(typeof mileageBalance==='function')?mileageBalance(myMileageLots):0;
  try{
    await db.collection('posts').doc(cmCurPost._id).delete(); cmInvalidateCache();
    cmCloseDetail();
    cmAwardToast(_prevBal, 'deduct');
  }catch(e){ console.warn('cmDeletePost',e); alert('삭제 중 오류가 났어요.'); }
}
var cmFiles=[];
function cmPickImages(e){
  var fs=e.target.files; if(!fs) return;
  for(var i=0;i<fs.length && cmFiles.length<5;i++){
    if(fs[i].size>10*1024*1024){ alert('10MB 이하 이미지만 올릴 수 있어요.'); continue; }
    if(!/^image\//.test(fs[i].type)) continue;
    cmFiles.push(fs[i]);
  }
  e.target.value=''; cmRenderImgRow();
}
function cmRemoveImg(idx){ cmFiles.splice(idx,1); cmRenderImgRow(); }
function cmRenderImgRow(){
  var row=document.getElementById('cmImgRow'); if(!row) return;
  var h='';
  cmFiles.forEach(function(f,idx){
    var u=URL.createObjectURL(f);
    h+='<div class="cm-imgth" style="background-image:url('+u+')"><span class="cm-imgx" onclick="cmRemoveImg('+idx+')">\u00d7</span></div>';
  });
  if(cmFiles.length<5) h+='<div class="cm-imgadd" onclick="document.getElementById(\'cmImgInput\').click()"><span>+</span>사진</div>';
  row.innerHTML=h;
}
function cmResizeImage(file, maxDim, quality){
  return new Promise(function(resolve,reject){
    var url=URL.createObjectURL(file); var img=new Image();
    img.onload=function(){
      URL.revokeObjectURL(url);
      var w=img.width,h=img.height;
      if(w>=h){ if(w>maxDim){ h=Math.round(h*maxDim/w); w=maxDim; } }
      else { if(h>maxDim){ w=Math.round(w*maxDim/h); h=maxDim; } }
      var c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      c.toBlob(function(b){ b?resolve(b):reject(new Error('blob')); },'image/jpeg',quality);
    };
    img.onerror=function(){ URL.revokeObjectURL(url); reject(new Error('imgload')); };
    img.src=url;
  });
}
async function cmUploadImages(pid, files){
  if(!storage) throw new Error('storage 미초기화');
  var urls=[];
  for(var i=0;i<files.length;i++){
    var blob=await cmResizeImage(files[i],1600,0.82);
    var ref=storage.ref('board/'+pid+'/'+Date.now()+'_'+i+'.jpg');
    await ref.put(blob,{contentType:'image/jpeg'});
    urls.push(await ref.getDownloadURL());
  }
  return urls;
}
async function cmLoadNoticeBar(){
  var bar=document.getElementById('cmNoticeBar'); if(!bar) return;
  if(!firebaseReady||!db){ bar.classList.add('hidden'); return; }
  try{
    // 공지글 최신 5개를 3초마다 회전(공지 외 글 없음)
    _cmNbItems=[];
    try{
      // orderBy 빼서 색인 의존 제거 → 가져온 뒤 createdAt JS 정렬
      var qs=await db.collection('posts').where('board','==','notice').limit(20).get();
      var arr=[]; qs.forEach(function(d){ var p=d.data(); arr.push({id:d.id, t:(p.title||''), at:(p.createdAt&&p.createdAt.seconds)||0}); });
      arr.sort(function(a,b){ return b.at-a.at; });
      arr.slice(0,5).forEach(function(p){ _cmNbItems.push({id:p.id, board:'notice', title:('\uD83D\uDCE2 '+p.t)}); });
    }catch(_){}
    if(!_cmNbItems.length){ bar.classList.add('hidden'); if(_cmNbTimer){clearInterval(_cmNbTimer);_cmNbTimer=null;} return; }
    bar.classList.remove('hidden');
    var roll=document.getElementById('cmNbRoll');
    roll.innerHTML=_cmNbItems.map(function(it,i){ return '<div class="cm-nb-line'+(i===0?' on':'')+'">'+cmEsc(it.title)+'</div>'; }).join('');
    _cmNbIdx=0;
    if(_cmNbTimer){ clearInterval(_cmNbTimer); _cmNbTimer=null; }
    if(_cmNbItems.length>1){
      _cmNbTimer=setInterval(function(){
        var lines=roll.querySelectorAll('.cm-nb-line'); if(lines.length<2) return;
        var cur=lines[_cmNbIdx]; _cmNbIdx=(_cmNbIdx+1)%lines.length; var nx=lines[_cmNbIdx];
        cur.classList.remove('on'); cur.classList.add('out');
        nx.classList.remove('out'); nx.classList.add('on');
        setTimeout(function(){ cur.classList.remove('out'); },500);
      },3000);
    }
  }catch(e){ console.warn('cmLoadNoticeBar',e); bar.classList.add('hidden'); }
}
function cmGotoNotice(){ cmBoard='notice'; openCommunity(); }
function cmNbClick(){
  var it=_cmNbItems&&_cmNbItems[_cmNbIdx]; if(!it){ openCommunity(); return; }
  cmBoard=it.board||'notice'; openCommunity();
  setTimeout(function(){ if(typeof cmOpenDetail==='function') cmOpenDetail(it.id); },60);
}
function cmTodayHTML(p){
  var badge=(p.cert)?'<span class="cm-cert">'+cmEsc(CM_CERT_LABEL[p.cert]||p.cert)+'</span>':'';
  return '<div class="cm-today" onclick="cmOpenDetail(\''+p._id+'\')">'
    +'<div class="cm-today-l">🏆 오늘의 글</div>'
    +'<div class="cm-today-t">'+badge+cmEsc(p.title||'')+'</div>'
    +'<div class="cm-today-m">'+cmEsc(p.authorNick||'익명')+' · 👍 '+(p.upCount||0)+' · 💬 '+(p.commentCount||0)+' · 👁️ '+(p.viewCount||0)+'</div></div>';
}
async function cmReport(){
  if(!currentUser){ alert('신고하려면 로그인이 필요해요.'); return; }
  if(!cmCurPost) return;
  var reason=prompt('신고 사유를 적어주세요 (욕설 · 광고 · 도배 등)');
  if(reason==null) return; reason=(reason||'').trim();
  try{
    await db.collection('reports').add({
      postId:cmCurPost._id, postTitle:(cmCurPost.title||''), board:(cmCurPost.board||''),
      reason:(reason||'(사유 없음)'), reporterUid:currentUser.uid, reporterNick:cmGetNick(),
      status:'open', createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('신고가 접수됐어요. 검토 후 조치할게요.');
  }catch(e){ console.warn('cmReport',e); alert('신고 중 오류가 났어요.'); }
}
