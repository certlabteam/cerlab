/* 화면 장식 이모지만 그록 아이콘·작은 점으로 바꾼다. 공유·알림에 보내는 원문과 사용자가 쓴 글은 건드리지 않는다. */
(function(){
  var icons={
    '⚠':'warning','⚠️':'warning','🤖':'robot','⚡':'lightning','🔥':'flame',
    '📋':'clipboard','📊':'barchart','💪':'dumbbell','💡':'bulb','🎯':'target',
    '📘':'book','💬':'chat','🔊':'speaker','📢':'speaker','🏢':'office_key',
    '📚':'books','🎁':'gift','🔒':'shield_lock','🏠':'house','🏆':'trophy',
    '🔄':'repeat','🚨':'siren','📐':'ruler','📜':'scroll','🏅':'medal',
    '⚖️':'scale','🧯':'extinguisher','🏃':'dumbbell','🎓':'school','📖':'book',
    '⚙':'gear','🥇':'medal','🥈':'medal','🥉':'medal','📄':'doc_seal',
    '🏛':'gov','🃏':'flip','📝':'notebook','🧠':'brain','🆕':'new_badge','🖨️':'printer',
    '🔁':'repeat','❤️':'heart_hands','📉':'barchart','✅':'check','❌':'xmark',
    '🎉':'party','👍':'thumb_up','👎':'thumb_down','👁️':'eye','✍️':'writing',
    '✏️':'pencil','🔗':'link','⏱':'stopwatch','⌛':'hourglass','📌':'pin',
    '👏':'clap','✨':'sparkle','🌸':'flower','💫':'star_trail','🏁':'flag',
    '🔎':'search','💰':'moneybag','📲':'phone_out','🔀':'shuffle','✂':'scissors',
    '🎟':'ticket','🎬':'clapper','🤔':'thinking'
  };
  var dots={'🔴':'#DC2626','🟡':'#E0A52E','🟢':'#1D9E75','⬜':'#94A3B8',
            '👩':'#185FA5','👨':'#185FA5','🙋':'#185FA5','🙂':'#185FA5'};
  var keys=Object.keys(icons).concat(Object.keys(dots)).sort(function(a,b){return b.length-a.length;});
  var esc=function(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');};
  var match=new RegExp(keys.map(esc).join('|'),'gu');
  var excluded='script,style,noscript,textarea,option,code,pre,[contenteditable],.cm-pt,.cm-pe,.cm-dtitle,.cm-dtext,.cm-cmt-b,.cm-nb-t,.cm-today-t,.nick,.my-head b,.avatar,.ai-exp-body';
  function decorate(node){
    if(!node || !node.parentElement || !node.nodeValue) return;
    var parent=node.parentElement;
    if(parent.closest(excluded)) return;
    var value=node.nodeValue;
    match.lastIndex=0;
    if(!match.test(value)) return;
    match.lastIndex=0;
    var fragment=document.createDocumentFragment(), at=0, hit, changed=false;
    var size=parseFloat(getComputedStyle(parent).fontSize)||16;
    while((hit=match.exec(value))){
      var emoji=hit[0], start=hit.index;
      if(start>at) fragment.appendChild(document.createTextNode(value.slice(at,start)));
      at=start+emoji.length;
      if((emoji==='✅'||emoji==='❌') && parent.closest('#mcqView .qstem,#mcqView .exp,#lpWrap #sample')){
        fragment.appendChild(document.createTextNode(emoji)); continue;
      }
      var beside=!!(value.slice(0,start).trim() || value.slice(at).trim());
      var color=dots[emoji] || (size<=16 && beside && emoji!=='📋' ? 'currentColor' : '');
      if(color){
        var dot=document.createElement('span');
        dot.className='cl-emoji-dot';dot.style.setProperty('--cl-dot',color);
        dot.setAttribute('aria-hidden','true');fragment.appendChild(dot);
      }else{
        var img=document.createElement('img');
        img.className='cl-emoji-icon';img.src='icons/'+icons[emoji]+'.png';
        img.loading='lazy';img.alt='';img.setAttribute('aria-hidden','true');
        img.width=size>24?32:20;img.height=img.width;
        if(size>24) img.classList.add('cl-emoji-large');
        fragment.appendChild(img);
      }
      changed=true;
    }
    if(!changed) return;
    if(at<value.length) fragment.appendChild(document.createTextNode(value.slice(at)));
    parent.replaceChild(fragment,node);
  }
  function scan(node){
    if(!node) return;
    if(node.nodeType===3){decorate(node);return;}
    if(node.nodeType!==1 || node.matches(excluded)) return;
    var walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT), found=[];
    while(walker.nextNode()) found.push(walker.currentNode);
    found.forEach(decorate);
  }
  function start(){
    scan(document.body);
    new MutationObserver(function(records){
      records.forEach(function(r){
        if(r.type==='characterData') decorate(r.target);
        else r.addedNodes.forEach(scan);
      });
    }).observe(document.body,{subtree:true,childList:true,characterData:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
