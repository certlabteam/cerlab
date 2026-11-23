/* [2026-11-24 spike-basics · 견본] 크리스 「기초학습과 선행학습은 달라야 한다」 「선행학습은 문제에 대한 선행학습」
   ① 기초학습 = 과목 바탕. 선행학습과 따로 — 시험 홈 「암기코드 듣기」 위 띠 → 과목 고르기 → 기초 카드(경제학원론=그래프 · 민법=관계도 견본)
     자료는 과목 기초 묶음(D.civil · D.econ) 단위, 시험마다 MAP 연결표(감평·공인중개사 1차·주택관리사 1차 민법 → civil)
   ② 선행학습 = 그 문제를 풀기 위한 학습 — 선행학습의 그 문제 카드 위에 문제별 기초 칸(e26_9 기초 3가지 · e26_2 계산 6단계). 회차 흐름에서도 그 문제 차례에 나온다
   자료는 이 파일에 박은 견본뿐 — Firestore·서버에 아무것도 쓰지 않는다(본 카드 표시만 이 브라우저에 적어 둔다). 생김새는 선행학습 카드(learn-hd · lcard · lsec · lcue) 그대로.
   견본 바로가기: ?basics=econ · ?basics=civil(기초학습 화면) · ?basics=q(e26_9) · ?basics=q2(e26_2)(선행학습 그 문제) — 로그인 없이 */
(function(){
  var AX='<line x1="34" y1="12" x2="34" y2="150" stroke="#94A3B8" stroke-width="1.5"/><line x1="34" y1="150" x2="250" y2="150" stroke="#94A3B8" stroke-width="1.5"/>'
    +'<text x="10" y="20" font-size="12" fill="#5F6B7A">값</text><text x="232" y="168" font-size="12" fill="#5F6B7A">양</text>';
  function svg(inner, label){ return '<svg class="bs-fig" viewBox="0 0 260 176" role="img" aria-label="'+label+'">'+AX+inner+'</svg>'; }
  var F={
    demand: svg('<line x1="50" y1="30" x2="230" y2="140" stroke="#185FA5" stroke-width="3"/><text x="218" y="114" font-size="13" fill="#185FA5" font-weight="700">수요</text>'
      +'<circle cx="80" cy="48" r="5" fill="#185FA5"/><text x="90" y="40" font-size="12" fill="#334155">1,000원 · 10개</text>'
      +'<circle cx="170" cy="103" r="5" fill="#185FA5"/><text x="162" y="128" font-size="12" fill="#334155" text-anchor="end">900원 · 12개</text>', '수요곡선'),
    supply: svg('<line x1="50" y1="140" x2="230" y2="30" stroke="#1D9E75" stroke-width="3"/><text x="196" y="22" font-size="13" fill="#1D9E75" font-weight="700">공급</text>'
      +'<circle cx="90" cy="116" r="5" fill="#1D9E75"/><text x="98" y="130" font-size="12" fill="#334155">싸면 조금 판다</text>'
      +'<circle cx="190" cy="55" r="5" fill="#1D9E75"/><text x="182" y="44" font-size="12" fill="#334155" text-anchor="end">비싸면 많이 판다</text>', '공급곡선'),
    equil: svg('<line x1="50" y1="30" x2="230" y2="140" stroke="#185FA5" stroke-width="3"/><line x1="50" y1="140" x2="230" y2="30" stroke="#1D9E75" stroke-width="3"/>'
      +'<circle cx="140" cy="85" r="6" fill="#A32D2D"/><text x="140" y="62" font-size="13" fill="#A32D2D" font-weight="700" text-anchor="middle">균형</text>'
      +'<line x1="34" y1="85" x2="140" y2="85" stroke="#A32D2D" stroke-dasharray="4 4"/><line x1="140" y1="85" x2="140" y2="150" stroke="#A32D2D" stroke-dasharray="4 4"/>'
      +'<text x="232" y="128" font-size="12" fill="#185FA5">수요</text><text x="234" y="46" font-size="12" fill="#1D9E75">공급</text>', '균형'),
    marginal: svg('<rect x="56" y="60" width="34" height="90" fill="#B5D4F4"/><rect x="110" y="96" width="34" height="54" fill="#B5D4F4"/><rect x="164" y="126" width="34" height="24" fill="#B5D4F4"/>'
      +'<text x="62" y="54" font-size="12" fill="#185FA5" font-weight="700">+5</text><text x="116" y="90" font-size="12" fill="#185FA5" font-weight="700">+3</text><text x="170" y="120" font-size="12" fill="#185FA5" font-weight="700">+1</text>'
      +'<text x="50" y="166" font-size="11" fill="#5F6B7A">1개째</text><text x="104" y="166" font-size="11" fill="#5F6B7A">2개째</text><text x="158" y="166" font-size="11" fill="#5F6B7A">3개째</text>', '한계 — 하나 더 먹을 때 느는 만족'),
    elastic: svg('<line x1="90" y1="20" x2="130" y2="146" stroke="#A32D2D" stroke-width="3"/><text x="40" y="64" font-size="12" fill="#A32D2D" font-weight="700">덜 민감</text>'
      +'<line x1="50" y1="70" x2="236" y2="112" stroke="#185FA5" stroke-width="3"/><text x="176" y="82" font-size="12" fill="#185FA5" font-weight="700">민감</text>', '탄력성 — 가파르면 덜 민감'),
    revenue: svg('<line x1="40" y1="24" x2="236" y2="146" stroke="#185FA5" stroke-width="3"/><text x="206" y="110" font-size="12" fill="#185FA5" font-weight="700">수요</text>'
      +'<line x1="40" y1="24" x2="138" y2="146" stroke="#A32D2D" stroke-width="3"/><text x="64" y="112" font-size="12" fill="#A32D2D" font-weight="700">MR</text>'
      +'<line x1="138" y1="85" x2="138" y2="150" stroke="#94A3B8" stroke-dasharray="4 4"/><circle cx="138" cy="85" r="4" fill="#185FA5"/><text x="146" y="72" font-size="11" fill="#334155">MR=0 · 탄력성 1</text>', '총수입과 한계수입')
  };
  function rel(rows){ return '<div class="bs-rel">'+rows.map(function(r){ return '<div class="bs-rel-row"><span class="bs-p">'+r[0]+'</span><span class="bs-arrow"><small>'+r[1]+'</small></span><span class="bs-p'+(r[3]?' bs-thing':'')+'">'+r[2]+'</span></div>'; }).join('')+'</div>'; }
  var D={
    econ:{ name:'경제학원론', kind:'그래프 읽기', cards:[
      {t:'수요곡선 — 값이 내리면 더 산다', d:['값과 사는 양의 관계를 그린 선이에요.','값이 내리면 사람들이 더 사서 오른쪽 아래로 내려가요.'], fig:F.demand, ex:'빵이 1,000원일 때 10개, 900원으로 내리니 12개가 팔렸다.'},
      {t:'공급곡선 — 값이 오르면 더 판다', d:['값과 파는 양의 관계를 그린 선이에요.','비쌀수록 팔고 싶은 사람이 늘어 오른쪽 위로 올라가요.'], fig:F.supply, ex:'빵값이 1,500원으로 오르면 빵집이 하루 50개 굽던 것을 70개로 늘린다.'},
      {t:'균형 — 두 곡선이 만나는 값', d:['사려는 양과 팔려는 양이 같아지는 값이 균형이에요.','값이 균형보다 높으면 남고, 낮으면 모자라서 다시 균형으로 돌아와요.'], fig:F.equil, ex:'1,200원에서 사려는 사람 40개, 팔려는 빵 40개 — 이 값에서 시장이 멈춘다.'},
      {t:'한계 — 「하나 더」 할 때 늘어나는 것', d:['경제학에서 「한계」는 하나를 더 할 때 늘어나는 양이에요.','보통 하나 더 할수록 늘어나는 양은 줄어들어요.'], fig:F.marginal, ex:'배고플 때 빵 첫 개는 만족 +5, 둘째는 +3, 셋째는 +1.'},
      {t:'탄력성 — 값에 얼마나 민감한가', d:['값이 1% 바뀔 때 사는 양이 몇 % 바뀌는지예요.','1보다 크면 민감(탄력적), 1보다 작으면 덜 민감(비탄력적)이에요.'], fig:F.elastic, ex:'값을 10% 내렸더니 20% 더 팔렸다 → 탄력성 2(민감). 쌀처럼 꼭 사는 것은 덜 민감하다.'},
      {t:'총수입·한계수입 — 판 돈과 하나 더 팔 때 돈', d:['총수입은 값 × 판 양, 한계수입(MR)은 하나 더 팔 때 늘어나는 수입이에요.','더 팔려면 값을 내려야 해서 MR은 값보다 작고, 탄력성 1인 곳에서 0이 돼요.'], fig:F.revenue, ex:'1,000원×10개=10,000원 → 900원×12개=10,800원. 2개 더 팔아 800원 늘었으니 MR은 개당 400원.'}
    ]},
    civil:{ name:'민법', kind:'사람 관계도', cards:[
      {t:'권리와 의무 — 누가 누구에게 무엇을', d:['권리는 남에게 무엇을 요구할 수 있는 힘, 의무는 그 요구에 따라야 하는 것이에요.','한 사람의 권리 맞은편에는 늘 다른 사람의 의무가 있어요.'], fig:rel([['甲 빌려준 사람','100만 원 돌려줘(권리) →','乙 빌린 사람'],['乙','← 돌려줄 의무','甲']]), ex:'甲이 乙에게 100만 원을 빌려줬다. 甲은 돌려받을 권리, 乙은 갚을 의무가 생긴다.'},
      {t:'물권과 채권 — 물건에 대한 권리 vs 사람에게 요구할 권리', d:['물권은 물건을 직접 쓰고 처분하는 권리라 누구에게나 주장할 수 있어요.','채권은 특정한 사람에게만 요구할 수 있는 권리예요.'], fig:rel([['甲','내 집(소유권 · 물권) →','🏠 집',1],['甲','집 비워 줘(채권) →','乙 세입자']]), ex:'집주인 甲은 집에 대해 누구에게나 「내 집」이라 할 수 있지만, 월세는 세입자 乙에게만 달라고 할 수 있다.'},
      {t:'무효와 취소 — 처음부터 없음 vs 나중에 없앰', d:['무효는 처음부터 아무 힘이 없는 계약이에요.','취소는 일단 유효하다가, 취소하면 처음부터 없던 것으로 돌아가요.'], fig:rel([['계약 A','처음부터 ✕ (무효) →','효력 없음'],['계약 B','취소하면 ↺ →','처음부터 없던 것으로']]), ex:'도박 빚 계약은 처음부터 무효, 속아서 한 계약은 취소할 때까지는 유효하다.'}
    ]}
  };
  // 문제 화면 선행학습의 「기초」 칸 — 그 문제에 필요한 기초만
  /* 계산 문제용 그래프 — 감평 경제 2026 2번(휘발유 종량세). 값 축은 800부터(눈금 생략 표시) */
  var TAX='<svg class="bs-fig" viewBox="0 0 260 176" role="img" aria-label="종량세 500원을 매기기 전후의 수요·공급">'
    +'<line x1="34" y1="12" x2="34" y2="150" stroke="#94A3B8" stroke-width="1.5"/><line x1="34" y1="150" x2="250" y2="150" stroke="#94A3B8" stroke-width="1.5"/>'
    +'<text x="40" y="14" font-size="12" fill="#5F6B7A">값</text><text x="236" y="168" font-size="12" fill="#5F6B7A">양</text>'
    +'<line x1="134" y1="63.6" x2="34" y2="63.6" stroke="#A32D2D" stroke-dasharray="3 3"/><line x1="184" y1="85.2" x2="34" y2="85.2" stroke="#185FA5" stroke-dasharray="3 3"/>'
    +'<line x1="134" y1="117.6" x2="34" y2="117.6" stroke="#1D9E75" stroke-dasharray="3 3"/><line x1="134" y1="63.6" x2="134" y2="150" stroke="#94A3B8" stroke-dasharray="3 3"/><line x1="184" y1="85.2" x2="184" y2="150" stroke="#94A3B8" stroke-dasharray="3 3"/>'
    +'<line x1="34" y1="20.4" x2="234" y2="106.8" stroke="#185FA5" stroke-width="3"/>'
    +'<line x1="84" y1="150" x2="234" y2="52.8" stroke="#1D9E75" stroke-width="3"/>'
    +'<line x1="34" y1="128.4" x2="200.7" y2="20.4" stroke="#A32D2D" stroke-width="3" stroke-dasharray="7 4"/>'
    +'<circle cx="184" cy="85.2" r="5" fill="#185FA5"/><circle cx="134" cy="63.6" r="5" fill="#A32D2D"/><circle cx="134" cy="117.6" r="5" fill="#1D9E75"/>'
    +'<text x="30" y="67" font-size="10" fill="#A32D2D" text-anchor="end">1,600</text><text x="30" y="89" font-size="10" fill="#185FA5" text-anchor="end">1,400</text><text x="30" y="121" font-size="10" fill="#1D9E75" text-anchor="end">1,100</text><text x="30" y="153" font-size="10" fill="#5F6B7A" text-anchor="end">800</text>'
    +'<text x="134" y="164" font-size="10" fill="#5F6B7A" text-anchor="middle">200</text><text x="184" y="164" font-size="10" fill="#5F6B7A" text-anchor="middle">300</text>'
    +'<text x="220" y="124" font-size="12" fill="#185FA5" font-weight="700">수요</text><text x="222" y="44" font-size="12" fill="#1D9E75" font-weight="700">공급</text>'
    +'<text x="196" y="12" font-size="12" fill="#A32D2D" font-weight="700" text-anchor="end">세금 뒤 공급(+500)</text></svg>';
  var Q={ e26_2:{ head:'계산 기초 · 이 문제를 푸는 6단계', fig:TAX,
      legend:'● 파랑 처음 균형 1,400원·300개 · ● 빨강 세금 뒤 소비자가 내는 값 1,600원·200개 · ● 초록 공급자가 받는 값 1,100원',
      steps:[['균형 찾기','수요량=공급량으로 놓는다. 1000−P/2 = P/3−500/3 → 양쪽에 6을 곱하면 6000−3P = 2P−1000 → P=1,400, Q=300.'],
        ['종량세 500원을 공급자에게 매기면','공급자가 실제로 받는 값은 P−500이라, 공급곡선이 위로 500 올라간다. Qs=(P−500)/3−500/3.'],
        ['새 균형','1000−P/2 = (P−500)/3−500/3 → 6000−3P = 2P−2000 → 소비자가 내는 값 P=1,600, 공급자가 받는 값 1,100, Q=200.'],
        ['누가 얼마 무나','소비자 1,600−1,400=200원, 공급자 1,400−1,100=300원 → 공급자만 다 무는 게 아니다(ㄱ ×). 공급이 덜 민감해서(기울기) 공급자가 더 문다.'],
        ['거래량과 소비자잉여','거래량은 300→200으로 준다(ㄴ ○). 값이 오르고 덜 사니 소비자잉여는 준다(ㄷ ×).'],
        ['수요자에게 매기면','같은 세금을 수요자에게 매겨도 수요곡선이 아래로 500 내려갈 뿐, 새 거래량은 똑같이 200이다(ㄹ ○).']] },
    e26_9:{ steps:['수요곡선: 값을 내리면 더 팔린다.','한계수입(MR): 한 개 더 팔 때 늘어나는 수입. 값을 내려야 더 팔리니 MR은 값보다 작다.','탄력성: 1인 곳에서 MR=0이 된다. 독점기업은 MR>0인 곳(탄력성이 1보다 큰 곳)에서만 판다.'],
    ex:'빵을 1,000원에 10개 팔다가 900원으로 내리니 12개가 팔렸다. 수입은 10,000원 → 10,800원으로 800원 늘었다. 이 800원을 2개로 나눈 400원이 한 개 더 팔 때 늘어난 수입(MR)이다.' } };

  /* 기초는 시험이 아니라 과목 기초 묶음(D.civil · D.econ …) 단위 — 시험마다 「과목 → 묶음」 연결표만 둔다(크리스 「시험별로 공통적인 게 많다」) */
  var MAP={ appraiser:{civil:'civil', econ:'econ'}, realestate1:{re1_civil:'civil'}, housing:{hm_civil:'civil'} };
  function keyOf(cert, sub){ var m=MAP[cert]; return (m&&m[sub]&&D[m[sub]])?m[sub]:''; }
  /* 본 카드 표시 — 이 브라우저에만(견본) */
  function seenGet(k){ try{ return JSON.parse(localStorage.getItem('certlab_bs_seen_'+k)||'[]'); }catch(_){ return []; } }
  function seenAdd(k,i){ try{ var a=seenGet(k); if(a.indexOf(i)<0){ a.push(i); localStorage.setItem('certlab_bs_seen_'+k, JSON.stringify(a)); } }catch(_){} }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  var BS={sub:'', key:'', idx:0};
  /* 시험 홈 「암기코드 듣기」 바로 위 띠 — oxl-banner 꼴 그대로. 연결된 과목이 있는 시험에만 */
  window.bsBannerHTML=function(cert){ var m=MAP[cert]; if(!m) return ''; var keys={}; Object.keys(m).forEach(function(s){ if(D[m[s]]) keys[m[s]]=1; });
    var tot=0, done=0; Object.keys(keys).forEach(function(k){ tot+=D[k].cards.length; done+=seenGet(k).length; }); if(!tot) return '';
    return '<div class="oxl-banner bs-banner" onclick="bsPick()"><div class="oxl-banner-l"><span class="oxl-banner-ico">🧱</span><div><b>기초학습</b><span class="oxl-banner-sub">기초가 없으면 여기부터 · 과목 바탕 '+done+'/'+tot+'</span></div></div><div class="oxl-banner-go">열기 →</div></div>'; };
  /* 과목 고르기 — 연결된 과목만 열리고 나머지는 「준비 중」 */
  window.bsPick=function(){ BS={sub:'', key:'', idx:0}; mqScreen='basics'; renderMCQ(); window.scrollTo(0,0); };
  function pickHTML(){
    var qb=curQB()||{};
    return '<div class="mcq-exam-title bs-title">기초학습<button type="button" class="bs-x" onclick="bsClose()" aria-label="닫기">✕</button></div>'
      +'<div class="sec-desc bs-pick-desc">이 과목 기출 전체에 자주 나오는 바탕 개념을 쉬운 순서로 모았어요.</div>'
      +curOrder().map(function(sub){ var k=keyOf(mqCert, sub), nm=(qb[sub]||{}).name||sub;
        if(!k) return '<div class="scard bs-pick bs-soon"><div class="scard-hd"><span class="sdot"></span><span class="snm">'+esc(nm)+'</span><span class="scard-set-label">준비 중</span></div></div>';
        var n=D[k].cards.length, done=seenGet(k).length;
        return '<div class="scard bs-pick"><div class="scard-hd" onclick="bsOpen(\''+sub+'\')"><span class="sdot"></span><span class="snm">'+esc(nm)+'</span><span class="scard-set-label">'+esc(D[k].kind)+' · '+done+'/'+n+'</span><span class="b-go" style="margin-left:8px;flex-shrink:0">'+(done>=n?'다시 보기':done>0?'이어 보기':'시작')+'</span></div></div>'; }).join('');
  }
  window.bsOpen=function(sub, i){ var k=keyOf(mqCert, sub); if(!k) return; var seen=seenGet(k);
    BS={sub:sub, key:k, idx:(typeof i==='number')?i:(seen.length<D[k].cards.length?(function(){ for(var j=0;j<D[k].cards.length;j++){ if(seen.indexOf(j)<0) return j; } return 0; })():0)};
    mqScreen='basics'; renderMCQ(); window.scrollTo(0,0); };
  /* 기초학습 화면 — 머리 · 진행 막대 · 카드 한 장 · 이전/다음 · 마지막에 「기초학습 끝 — 기출 풀러 가기」 */
  window.renderBasics=function(root){
    var deck=D[BS.key]; if(!deck){ root.innerHTML=pickHTML(); return; }
    var n=deck.cards.length, c=deck.cards[BS.idx], last=BS.idx>=n-1; seenAdd(BS.key, BS.idx);
    var done=seenGet(BS.key).length, pct=Math.round(done/n*100);
    root.innerHTML='<div class="exam-sticky"><div class="exam-hd">'
      +'<div class="exam-ti"><div class="nm">기초학습</div><div class="st">'+esc(deck.name)+' · '+esc(deck.kind)+'</div></div><button type="button" class="bs-x" onclick="bsClose()" aria-label="닫기">✕</button></div>'
      +'<div class="mq-prog"><div class="row"><span>'+done+' / '+n+' 봤어요</span><span></span></div><div class="track"><div class="bar" style="width:'+pct+'%"></div></div></div></div>'
      +'<div class="learn-hd"><span class="learn-step">🧱 기초학습</span><span class="learn-num">'+(BS.idx+1)+' / '+n+'</span></div>'
      +'<div class="lcard"><div class="ltitle">'+esc(c.t)+'</div>'
      +'<div class="lsec"><div class="lsec-t"><span class="lico">🧱</span>쉽게 말하면</div><div class="lsec-d">'+c.d.map(esc).join(' ')+'</div></div>'
      +(c.fig?'<div class="bs-figwrap">'+c.fig+'</div>':'')
      +(c.ex?'<div class="lcue"><span class="lcue-tag">예시</span>'+esc(c.ex)+'</div>':'')
      /* 이전·다음은 문제 풀이 아래 단추(mbtn-prev · mbtn-next) 꼴 그대로 한 줄에 같은 크기 — 첫 장의 이전은 흐리게 두어 자리를 지킨다(크리스) */
      +'<div class="bs-pn"><button type="button" class="mbtn mbtn-prev" onclick="bsGo(-1)"'+(BS.idx>0?'':' disabled')+'>← 이전</button>'
      +(last?'<button type="button" class="mbtn mbtn-next" onclick="bsDone()">기초학습 끝 →</button>':'<button type="button" class="mbtn mbtn-next" onclick="bsGo(1)">다음 →</button>')+'</div></div>';
  };
  window.bsGo=function(d){ var n=(D[BS.key]||{cards:[]}).cards.length; var i=BS.idx+d; if(i<0||i>=n) return; BS.idx=i; renderMCQ(); window.scrollTo(0,0); };
  window.bsClose=function(){ BS={sub:'', key:'', idx:0}; mqScreen='home'; renderMCQ(); window.scrollTo(0,0); };   // 오른쪽 위 X — 기초학습을 닫고 시험 홈으로
  window.bsDone=function(){ var sub=BS.sub; BS={sub:'', key:'', idx:0}; if(sub) mqOpen[sub]=true; mqScreen='home'; renderMCQ(); window.scrollTo(0,0); };   // 끝 → 그 과목 기출 목록을 펼친 시험 홈
  window.bsQHTML=function(q){ var b=q&&Q[q.id]; if(!b) return '';
    return '<div class="bs-qbox"><div class="learn-hd"><span class="learn-step">🧱 '+esc(b.head||'기초 · 이 문제에 필요한 3가지')+'</span></div>'
      +(b.fig?'<div class="bs-figwrap">'+b.fig+(b.legend?'<div class="bs-legend">'+esc(b.legend)+'</div>':'')+'</div>':'')
      +b.steps.map(function(s,i){ var t=Array.isArray(s)?s[0]:s.split(':')[0], d=Array.isArray(s)?s[1]:(s.indexOf(':')>0?s.slice(s.indexOf(':')+1).trim():s);
        return '<div class="lsec"><div class="lsec-t"><span class="lico">'+(i+1)+'</span>'+esc(t)+'</div><div class="lsec-d">'+esc(d)+'</div></div>'; }).join('')
      +(b.ex?'<div class="lcue"><span class="lcue-tag">예시</span>'+esc(b.ex)+'</div>':'')+'</div>';
  };

  // 견본 바로가기 주소 — ?basics=econ | civil | q (로그인 없이)
  var m=/[?&]basics=(econ|civil|q2|q)\b/.exec(location.search); if(!m) return;
  var want=m[1], tries=0, entered=false;
  function go(){
    tries++;
    try{
      if(typeof enterCert!=='function'){ if(tries<80) setTimeout(go,300); return; }
      if(!entered){ entered=true; enterCert('appraiser'); setTimeout(go,800); return; }   // 시험 화면을 실제로 연다(mqCert 기본값이 이미 appraiser 여도)
      var qb=curQB(); var sub=want==='civil'?'civil':'econ';
      if(!qb || !qb[sub] || !(qb[sub].sets||[]).length){ if(tries<80) setTimeout(go,300); return; }
      var sets=qb[sub].sets, si=0, qi=0;
      if(want==='q'||want==='q2'){ var qid=want==='q2'?'e26_2':'e26_9'; for(var i=0;i<sets.length;i++){ var k=(sets[i].questions||[]).findIndex(function(x){ return x.id===qid; }); if(k>=0){ si=i; qi=k; break; } } }
      else { bsOpen(sub, 0); return; }   // 기초학습 화면으로
      startConceptStudy(sub, si, qi);
    }catch(e){ if(tries<80) setTimeout(go,300); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(go,800); }); else setTimeout(go,800);
})();
