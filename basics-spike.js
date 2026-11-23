/* [2026-11-24 spike-basics · 견본] 선행학습 안의 「기초」 단계 — 크리스 「선행학습이 이미 있지 않냐」.
   ① 회차 선행학습: 첫 개념 카드 앞에 그 과목 기초 카드를 쉬운 순서로 먼저(경제학원론=그래프 · 민법=관계도) · 「기초 건너뛰기」
   ② 문제 화면 선행학습(e26_9): 원래 개념 카드 위에 「기초」 칸(수요곡선 · 한계수입 · 탄력성 + 빵 값 예시)
   자료는 이 파일에 박은 견본뿐 — Firestore·서버에 아무것도 쓰지 않는다. 생김새는 선행학습 카드(learn-hd · lcard · lsec · lcue) 그대로.
   견본으로 바로 가는 주소: ?basics=econ · ?basics=civil · ?basics=q (로그인 없이) */
(function(){
  var AX='<line x1="34" y1="12" x2="34" y2="150" stroke="#94A3B8" stroke-width="1.5"/><line x1="34" y1="150" x2="250" y2="150" stroke="#94A3B8" stroke-width="1.5"/>'
    +'<text x="10" y="20" font-size="12" fill="#5F6B7A">값</text><text x="232" y="168" font-size="12" fill="#5F6B7A">양</text>';
  function svg(inner, label){ return '<svg class="bs-fig" viewBox="0 0 260 176" role="img" aria-label="'+label+'">'+AX+inner+'</svg>'; }
  var F={
    demand: svg('<line x1="50" y1="30" x2="230" y2="140" stroke="#185FA5" stroke-width="3"/><text x="214" y="128" font-size="13" fill="#185FA5" font-weight="700">수요</text>'
      +'<circle cx="80" cy="48" r="5" fill="#185FA5"/><text x="88" y="44" font-size="12" fill="#334155">1,000원 · 10개</text>'
      +'<circle cx="170" cy="103" r="5" fill="#185FA5"/><text x="120" y="96" font-size="12" fill="#334155">900원 · 12개</text>', '수요곡선'),
    supply: svg('<line x1="50" y1="140" x2="230" y2="30" stroke="#1D9E75" stroke-width="3"/><text x="206" y="28" font-size="13" fill="#1D9E75" font-weight="700">공급</text>'
      +'<circle cx="90" cy="116" r="5" fill="#1D9E75"/><text x="98" y="130" font-size="12" fill="#334155">싸면 조금 판다</text>'
      +'<circle cx="190" cy="55" r="5" fill="#1D9E75"/><text x="100" y="52" font-size="12" fill="#334155">비싸면 많이 판다</text>', '공급곡선'),
    equil: svg('<line x1="50" y1="30" x2="230" y2="140" stroke="#185FA5" stroke-width="3"/><line x1="50" y1="140" x2="230" y2="30" stroke="#1D9E75" stroke-width="3"/>'
      +'<circle cx="140" cy="85" r="6" fill="#A32D2D"/><text x="150" y="90" font-size="13" fill="#A32D2D" font-weight="700">균형</text>'
      +'<line x1="34" y1="85" x2="140" y2="85" stroke="#A32D2D" stroke-dasharray="4 4"/><line x1="140" y1="85" x2="140" y2="150" stroke="#A32D2D" stroke-dasharray="4 4"/>'
      +'<text x="214" y="132" font-size="12" fill="#185FA5">수요</text><text x="206" y="28" font-size="12" fill="#1D9E75">공급</text>', '균형'),
    marginal: svg('<rect x="56" y="60" width="34" height="90" fill="#B5D4F4"/><rect x="110" y="96" width="34" height="54" fill="#B5D4F4"/><rect x="164" y="126" width="34" height="24" fill="#B5D4F4"/>'
      +'<text x="62" y="54" font-size="12" fill="#185FA5" font-weight="700">+5</text><text x="116" y="90" font-size="12" fill="#185FA5" font-weight="700">+3</text><text x="170" y="120" font-size="12" fill="#185FA5" font-weight="700">+1</text>'
      +'<text x="50" y="166" font-size="11" fill="#5F6B7A">1개째</text><text x="104" y="166" font-size="11" fill="#5F6B7A">2개째</text><text x="158" y="166" font-size="11" fill="#5F6B7A">3개째</text>', '한계 — 하나 더 먹을 때 느는 만족'),
    elastic: svg('<line x1="90" y1="20" x2="130" y2="146" stroke="#A32D2D" stroke-width="3"/><text x="44" y="40" font-size="12" fill="#A32D2D" font-weight="700">덜 민감</text>'
      +'<line x1="50" y1="70" x2="236" y2="112" stroke="#185FA5" stroke-width="3"/><text x="170" y="90" font-size="12" fill="#185FA5" font-weight="700">민감</text>', '탄력성 — 가파르면 덜 민감'),
    revenue: svg('<line x1="40" y1="24" x2="236" y2="146" stroke="#185FA5" stroke-width="3"/><text x="200" y="134" font-size="12" fill="#185FA5" font-weight="700">수요</text>'
      +'<line x1="40" y1="24" x2="138" y2="146" stroke="#A32D2D" stroke-width="3"/><text x="104" y="118" font-size="12" fill="#A32D2D" font-weight="700">MR</text>'
      +'<line x1="138" y1="85" x2="138" y2="150" stroke="#94A3B8" stroke-dasharray="4 4"/><text x="142" y="80" font-size="11" fill="#334155">MR=0 · 탄력성 1</text>', '총수입과 한계수입')
  };
  function rel(rows){ return '<div class="bs-rel">'+rows.map(function(r){ return '<div class="bs-rel-row"><span class="bs-p">'+r[0]+'</span><span class="bs-arrow"><small>'+r[1]+'</small></span><span class="bs-p'+(r[3]?' bs-thing':'')+'">'+r[2]+'</span></div>'; }).join('')+'</div>'; }
  var D={
    econ:{ name:'경제학원론', kind:'그래프 읽기', cards:[
      {t:'수요곡선 — 값이 내리면 더 산다', d:['값과 사는 양의 관계를 그린 선이에요.','값이 내리면 사람들이 더 사서 오른쪽 아래로 내려가요.'], fig:F.demand, ex:'빵이 1,000원일 때 10개, 900원으로 내리니 12개가 팔렸다.'},
      {t:'공급곡선 — 값이 오르면 더 판다', d:['값과 파는 양의 관계를 그린 선이에요.','비쌀수록 팔고 싶은 사람이 늘어 오른쪽 위로 올라가요.'], fig:F.supply, ex:'빵값이 1,500원으로 오르면 빵집이 하루 50개 굽던 것을 70개로 늘린다.'},
      {t:'균형 — 두 곡선이 만나는 값', d:['사려는 양과 팔려는 양이 같아지는 값이 균형이에요.','값이 균형보다 높으면 남고, 낮으면 모자라서 다시 균형으로 돌아와요.'], fig:F.equil, ex:'1,200원에서 사려는 사람 40개, 팔려는 빵 40개 — 이 값에서 시장이 멈춘다.'},
      {t:'한계 — 「하나 더」 할 때 늘어나는 것', d:['경제학에서 「한계」는 하나를 더 할 때 늘어나는 양이에요.','보통 하나 더 할수록 늘어나는 양은 줄어들어요.'], fig:F.marginal, ex:'배고플 때 빵 첫 개는 만족 +5, 둘째는 +3, 셋째는 +1.'},
      {t:'탄력성 — 값에 얼마나 민감한가', d:['값이 1% 바뀔 때 사는 양이 몇 % 바뀌는지예요.','1보다 크면 민감(탄력적), 1보다 작으면 덜 민감(비탄력적)이에요.'], fig:F.elastic, ex:'값을 10% 내렸더니 20% 더 팔렸다 → 탄력성 2(민감). 쌀처럼 꼭 사는 것은 덜 민감하다.'},
      {t:'총수입·한계수입 — 판 돈과 하나 더 팔 때 돈', d:['총수입은 값 × 판 양, 한계수입(MR)은 하나 더 팔 때 늘어나는 수입이에요.','더 팔려면 값을 내려야 해서 MR은 값보다 작고, 탄력성 1인 곳에서 0이 돼요.'], fig:F.revenue, ex:'1,000원×10개=10,000원 → 900원×12개=10,800원. 2개 더 팔아 800원 늘었으니 MR은 개당 400원.'},
      {t:'비용 곡선 · 시장 종류 · GDP · 물가', d:['견본에서는 여기까지만 채웠어요. 실제로는 기초 10개가 이어져요.'], fig:'', ex:''}
    ]},
    civil:{ name:'민법', kind:'사람 관계도', cards:[
      {t:'권리와 의무 — 누가 누구에게 무엇을', d:['권리는 남에게 무엇을 요구할 수 있는 힘, 의무는 그 요구에 따라야 하는 것이에요.','한 사람의 권리 맞은편에는 늘 다른 사람의 의무가 있어요.'], fig:rel([['甲 빌려준 사람','100만 원 돌려줘(권리) →','乙 빌린 사람'],['乙','← 돌려줄 의무','甲']]), ex:'甲이 乙에게 100만 원을 빌려줬다. 甲은 돌려받을 권리, 乙은 갚을 의무가 생긴다.'},
      {t:'물권과 채권 — 물건에 대한 권리 vs 사람에게 요구할 권리', d:['물권은 물건을 직접 쓰고 처분하는 권리라 누구에게나 주장할 수 있어요.','채권은 특정한 사람에게만 요구할 수 있는 권리예요.'], fig:rel([['甲','내 집(소유권 · 물권) →','🏠 집',1],['甲','집 비워 줘(채권) →','乙 세입자']]), ex:'집주인 甲은 집에 대해 누구에게나 「내 집」이라 할 수 있지만, 월세는 세입자 乙에게만 달라고 할 수 있다.'},
      {t:'무효와 취소 — 처음부터 없음 vs 나중에 없앰', d:['무효는 처음부터 아무 힘이 없는 계약이에요.','취소는 일단 유효하다가, 취소하면 처음부터 없던 것으로 돌아가요.'], fig:rel([['계약 A','처음부터 ✕ (무효) →','효력 없음'],['계약 B','취소하면 ↺ →','처음부터 없던 것으로']]), ex:'도박 빚 계약은 처음부터 무효, 속아서 한 계약은 취소할 때까지는 유효하다.'}
    ]}
  };
  // 문제 화면 선행학습의 「기초」 칸 — 그 문제에 필요한 기초만
  var Q={ e26_9:{ steps:['수요곡선: 값을 내리면 더 팔린다.','한계수입(MR): 한 개 더 팔 때 늘어나는 수입. 값을 내려야 더 팔리니 MR은 값보다 작다.','탄력성: 1인 곳에서 MR=0이 된다. 독점기업은 MR>0인 곳(탄력성이 1보다 큰 곳)에서만 판다.'],
    ex:'빵을 1,000원에 10개 팔다가 900원으로 내리니 12개가 팔렸다. 수입은 10,000원 → 10,800원으로 800원 늘었다. 이 800원을 2개로 나눈 400원이 한 개 더 팔 때 늘어난 수입(MR)이다.' } };

  function keyOf(cert, sub){ if(cert!=='appraiser') return ''; try{ var n=((curQB()||{})[sub]||{}).name||''; return /경제/.test(n)?'econ':/민법/.test(n)?'civil':''; }catch(_){ return ''; } }
  window.bsDeckFor=function(cert, sub){ var k=keyOf(cert, sub); return k?{key:k, idx:0}:null; };
  window._bsStage=null;
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  /* 기초 카드 한 장 — 선행학습 lcard 안의 lsec · lcue 꼴 그대로 */
  window.bsCardHTML=function(st){
    var deck=D[st.key], c=deck.cards[st.idx], n=deck.cards.length, last=st.idx>=n-1;
    var body='<div class="ltitle">'+esc(c.t)+'</div>'
      +'<div class="lsec"><div class="lsec-t"><span class="lico">🧱</span>쉽게 말하면</div><div class="lsec-d">'+c.d.map(esc).join(' ')+'</div></div>'
      +(c.fig?'<div class="bs-figwrap">'+c.fig+'</div>':'')
      +(c.ex?'<div class="lcue"><span class="lcue-tag">예시</span>'+esc(c.ex)+'</div>':'');
    return body
      +'<button class="solve-btn" onclick="bsNext()">'+(last?'이 회차 개념 카드로 →':'다음 기초 →')+'</button>'
      +'<div class="bs-nav">'+(st.idx>0?'<button type="button" class="bs-ghost" onclick="bsPrev()">← 이전 기초</button>':'<span></span>')
      +'<button type="button" class="bs-ghost" onclick="bsSkip()">기초 건너뛰기</button></div>';
  };
  window.bsStageInfo=function(st){ var deck=D[st.key]; return {name:deck.name, kind:deck.kind, n:deck.cards.length}; };
  window.bsQHTML=function(q){ var b=q&&Q[q.id]; if(!b) return '';
    return '<div class="bs-qbox"><div class="learn-hd"><span class="learn-step">🧱 기초 · 이 문제에 필요한 3가지</span></div>'
      +b.steps.map(function(s,i){ return '<div class="lsec"><div class="lsec-t"><span class="lico">'+(i+1)+'</span>'+esc(s.split(':')[0])+'</div><div class="lsec-d">'+esc(s.indexOf(':')>0?s.slice(s.indexOf(':')+1).trim():s)+'</div></div>'; }).join('')
      +'<div class="lcue"><span class="lcue-tag">예시</span>'+esc(b.ex)+'</div></div>';
  };
  window.bsNext=function(){ var st=window._bsStage; if(!st) return; if(st.idx<D[st.key].cards.length-1) st.idx++; else window._bsStage=null; renderMCQ(); window.scrollTo(0,0); };
  window.bsPrev=function(){ var st=window._bsStage; if(st && st.idx>0){ st.idx--; renderMCQ(); window.scrollTo(0,0); } };
  window.bsSkip=function(){ window._bsStage=null; renderMCQ(); window.scrollTo(0,0); };

  // 견본 바로가기 주소 — ?basics=econ | civil | q (로그인 없이)
  var m=/[?&]basics=(econ|civil|q)\b/.exec(location.search); if(!m) return;
  var want=m[1], tries=0, entered=false;
  function go(){
    tries++;
    try{
      if(typeof enterCert!=='function'){ if(tries<80) setTimeout(go,300); return; }
      if(!entered){ entered=true; enterCert('appraiser'); setTimeout(go,800); return; }   // 시험 화면을 실제로 연다(mqCert 기본값이 이미 appraiser 여도)
      var qb=curQB(); var sub=want==='civil'?'civil':'econ';
      if(!qb || !qb[sub] || !(qb[sub].sets||[]).length){ if(tries<80) setTimeout(go,300); return; }
      var sets=qb[sub].sets, si=0, qi=0;
      if(want==='q'){ for(var i=0;i<sets.length;i++){ var k=(sets[i].questions||[]).findIndex(function(x){ return x.id==='e26_9'; }); if(k>=0){ si=i; qi=k; break; } } }
      else { for(var j=0;j<sets.length;j++){ if(setConceptReady('appraiser',sub,j)){ si=j; break; } } }
      startConceptStudy(sub, si, want==='q'?qi:undefined);
    }catch(e){ if(tries<80) setTimeout(go,300); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(go,800); }); else setTimeout(go,800);
})();
