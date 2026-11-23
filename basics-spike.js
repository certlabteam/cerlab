/* [2026-11-24 spike-basics · 견본] 크리스 「기초학습과 선행학습은 달라야 한다」 「선행학습은 문제에 대한 선행학습」
   ① 기초학습 = 과목 바탕. 선행학습과 따로 — 시험 홈 「암기코드 듣기」 위 띠 → 과목 고르기 → 기초 카드(경제학원론=그래프 · 민법=관계도 견본)
     자료는 과목 기초 묶음(D.civil · D.econ) 단위, 시험마다 MAP 연결표(감평·공인중개사 1차·주택관리사 1차 민법 → civil)
   ② 선행학습 = 그 문제를 풀기 위한 학습 — 「기초」 이름 없이 원래 개념 카드 뒤에 이 문제만의 것만(e26_9 숫자 예시 · e26_2 풀이 순서). 회차 흐름에서도 그 문제 차례에 나온다
   자료는 이 파일에 박은 견본뿐 — Firestore·서버에 아무것도 쓰지 않는다(본 카드 표시만 이 브라우저에 적어 둔다). 생김새는 선행학습 카드(learn-hd · lcard · lsec · lcue) 그대로.
   견본 바로가기: ?basics=econ · ?basics=civil(기초학습 화면) · ?basics=q(e26_9) · ?basics=q2(e26_2)(선행학습 그 문제) — 로그인 없이 */
/* 미리보기 주소(/preview-basics/…)에서만 맨 위에 「미리보기 — 라이브와 다른 시안」 띠 — 라이브 주소에서는 절대 안 보인다 */
(function(){
  if(location.pathname.indexOf('/preview-basics/')!==0) return;
  function put(){ if(document.getElementById('bsPrevBar')) return; document.documentElement.classList.add('bs-preview');
    var b=document.createElement('div'); b.id='bsPrevBar'; b.className='bs-prev-bar'; b.setAttribute('role','note'); b.textContent='미리보기 — 라이브와 다른 시안'; document.body.appendChild(b); }
  if(document.body) put(); else document.addEventListener('DOMContentLoaded', put);
})();
(function(){
  /* 기초학습 = 과목마다 주인공 한 명이 이어 가는 연재(크리스 「기초학습은 이어진 이야기」). 한 장이 한 화 — 화 표시 → 제목 → 지난 이야기 → 장면·대사 → 이번 화 개념 → 다음 화.
     글은 스토리시안 그대로. 그래프가 있던 화는 장면 아래에 그래프를 둔다 */
  /* 이야기 그래프(스토리시안) — 선 1.5 · 축 1 · 점 3.5. 점과 점선은 선의 식으로 계산한 자리에만 찍는다(눈대중 좌표 금지) */
  function fig(vb, label, inner){ return '<svg class="bs-fig bs-fig2" viewBox="'+vb+'" role="img" aria-label="'+label+'">'+inner+'</svg>'; }
  // 1화 수요선 y=40+0.5(x−60): (120,70) · (168,94)
  var S_DEMAND=fig('0 0 320 190','수요곡선: 1,000원에 10개, 900원에 12개','<path class="ax" d="M40 15 V160 H305"/><text x="16" y="24">값</text><text x="292" y="180">양</text>'
    +'<path class="dl" d="M60 40 L280 150"/><circle cx="120" cy="70" r="3.5" fill="#185FA5"/><circle cx="168" cy="94" r="3.5" fill="#185FA5"/>'
    +'<text x="128" y="56">1,000원 · 10개</text><text x="70" y="118">900원 · 12개</text><text x="285" y="154">수요</text>');
  var S_MR=fig('0 0 320 170','매출 10,000원에서 10,800원, 한 개 더 팔 때 400원','<path class="ax" d="M30 140 H305"/>'
    +'<rect x="50" y="40" width="60" height="100" rx="4" fill="#B5D4F4"/><rect x="140" y="32" width="60" height="108" rx="4" fill="#185FA5"/>'
    +'<text x="50" y="30">10,000원</text><text x="140" y="22">10,800원</text><text x="56" y="158" class="muted">1,000원×10</text><text x="148" y="158" class="muted">900원×12</text>'
    +'<text x="222" y="70">+800원</text><text x="222" y="92">÷ 2개</text><text x="222" y="114" style="font-weight:700">= MR 400원</text>');
  // 3화 매출 산: 2차 곡선 (45,148)~(170,−40)~(295,148), 꼭대기 (170,54). 글씨는 곡선 안쪽 빈 자리
  var S_HILL=fig('0 0 320 180','매출 산: MR이 0인 곳에서 매출이 가장 크다','<path class="ax" d="M40 15 V150 H305"/><text x="10" y="24">매출</text><text x="292" y="170">양</text>'
    +'<path class="gl" d="M45 148 Q170 -40 295 148"/><circle cx="170" cy="54" r="3.5" fill="#15803D"/><path class="dash" d="M170 58 V150"/>'
    +'<text x="180" y="40">꼭대기 · MR=0 · 탄력성 1</text><text x="92" y="118" class="muted">MR&gt;0</text><text x="92" y="134" class="muted">내리면 늘어남</text>'
    +'<text x="258" y="118" class="muted" text-anchor="end">MR&lt;0</text><text x="258" y="134" class="muted" text-anchor="end">내리면 줄어듦</text>');
  var C_TWICE=fig('0 0 320 170','乙이 甲과 丙에게 두 번 팔고 丙이 먼저 등기','<defs><marker id="bsAh" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#185FA5"/></marker><marker id="bsAh2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#15803D"/></marker></defs>'
    +'<text x="160" y="30" style="font-weight:700" text-anchor="middle">乙 (집주인)</text><text x="20" y="150" style="font-weight:700">甲</text><text x="268" y="150" style="font-weight:700">丙</text>'
    +'<path d="M140 40 L45 128" stroke="#185FA5" stroke-width="1.5" fill="none" marker-end="url(#bsAh)"/><path d="M180 40 L270 128" stroke="#15803D" stroke-width="1.5" fill="none" marker-end="url(#bsAh2)"/>'
    +'<text x="4" y="80">① 먼저 계약</text><text x="4" y="96" class="muted">채권만 생김</text><text x="262" y="80">② 또 팔고</text><text x="262" y="96">丙이 등기</text><text x="262" y="112" class="muted">→ 물권</text>'
    +'<text x="160" y="166" class="muted" text-anchor="middle">결과: 집은 丙, 甲은 乙에게 손해배상</text>');
  /* e26_2 주유소 — 문제의 식 그대로 그린다. x=50+0.6Q, y=175−(P−800)×0.1333
     수요 P=2000−2Q · 공급 P=3Q+500 · 세금 붙은 공급 P=3Q+1000
     교점: 처음 (Q300,P1400)=(230,95) · 세금 뒤 (Q200,P1600)=(170,68.3) · 공급자가 받는 값 (Q200,P1100)=(170,135) */
  var S_GAS=fig('0 0 340 210','세금 500원: 소비자 1,600원·200리터, 공급자 1,100원, 원래 1,400원·300리터','<path class="ax" d="M50 15 V175 H330"/><text x="6" y="12">값(원)</text><text x="268" y="204">양(리터)</text>'
    +'<path class="dl" d="M50 15 L290 121.7"/><path class="rl" d="M110 175 L290 55"/><path class="rl" d="M50 148.3 L250 15" stroke-dasharray="6 4"/>'
    +'<path class="dash" d="M50 68.3 H170 V175"/><path class="dash" d="M50 95 H230 V175"/><path class="dash" d="M50 135 H170"/>'
    +'<circle cx="170" cy="68.3" r="3.5" fill="#C2410C"/><circle cx="230" cy="95" r="3.5" fill="#185FA5"/><circle cx="170" cy="135" r="3.5" fill="none" stroke="#C2410C" stroke-width="1.5"/>'
    +'<text x="46" y="72" text-anchor="end">1,600</text><text x="46" y="99" text-anchor="end">1,400</text><text x="46" y="139" text-anchor="end" class="muted">1,100</text>'
    +'<text x="170" y="192" text-anchor="middle">200</text><text x="230" y="192" text-anchor="middle">300</text>'
    +'<text x="294" y="126">수요</text><text x="294" y="59">공급</text><text x="254" y="19">공급+세금 500</text>');
  function soon(n){ return {tag:n+'화', t:'다음 화 준비 중', scene:['다음 이야기를 쓰고 있어요.'], soon:1}; }
  var D={
    econ:{ name:'경제학원론', kind:'빵집 甲 이야기', cards:[
      {tag:'1화 · 수요곡선', t:'값을 내렸더니 손님이 늘었다', fig:S_DEMAND, quiz:['econ_v_supply_demand_301','econ_v_calc_mi_demand_supply_L1'],
       scene:['甲이 동네에 빵집을 열었다. 첫날 빵 하나 1,000원에 10개가 팔렸다.',['甲','100원만 내려 볼까?','@baker'],'900원으로 내리자 12개가 팔렸다. 값이 내려가니 사는 사람이 늘었다.'],
       learn:['수요곡선','값과 사는 양을 이은 선. 값이 내리면 더 사서 오른쪽 아래로 내려간다.'], next:'다음 화 — 그럼 값을 계속 내리면 甲은 돈을 더 벌까?'},
      {tag:'2화 · 한계수입', t:'한 개 더 팔면 얼마가 더 남나', fig:S_MR, quiz:['econ_v_calc_mi_monopoly_L1'], prev:'1,000원에 10개, 900원에 12개가 팔렸다.',
       scene:['甲이 계산기를 두드렸다. 10,000원이던 매출이 10,800원이 됐다.',['甲','2개 더 팔아서 800원 늘었네. 한 개에 400원꼴이구나.','@baker'],'빵값은 900원인데, 한 개 더 팔 때 늘어난 돈은 400원뿐이다. 더 팔려면 앞 손님 값까지 같이 내려야 해서다.'],
       learn:['한계수입(MR)','한 개 더 팔 때 늘어나는 수입. 값을 내려야 더 팔리니 MR은 값보다 작다.'], next:'다음 화 — 계속 내리다 보니 매출이 오히려 줄기 시작했다!'},
      {tag:'3화 · 탄력성', t:'매출이 가장 큰 값은 어디일까', fig:S_HILL, quiz:['econ_v_calc_mi_elasticity_L1','econ_v_elasticity_basic_302'], prev:'한 개 더 팔 때 늘어나는 돈(MR)은 값보다 작았다.',
       scene:['甲이 500원까지 내려 보니 손님은 늘었는데 매출은 줄었다.',['甲','어디까지 내려야 제일 많이 벌지?','@baker'],'MR이 0이 되는 값에서 매출이 꼭대기다. 거기서 더 내리면 MR이 마이너스가 돼 판 만큼 손해다. 이 꼭대기가 손님이 값에 반응하는 정도(탄력성)가 딱 1인 곳이다.'],
       learn:['가격탄력성','값이 1% 바뀔 때 사는 양이 몇 % 바뀌나. 1보다 크면 값 내리기가 매출을 늘리고, 1보다 작으면 줄인다.'], next:'다음 화 — 옆 동네 빵집이 문을 닫아 甲 혼자 남았다(독점).'},
      soon(4), soon(5), soon(6)
    ]},
    civil:{ name:'민법', kind:'甲의 첫 집 사기', cards:[
      {tag:'1화 · 권리와 의무', t:'계약서에 도장을 찍었다', quiz:['civ_v_person_lv1_001'],
       scene:['甲이 乙의 아파트를 3억 원에 사기로 하고 계약서에 도장을 찍었다.',['乙','잔금 주시면 집 넘겨 드릴게요.','乙',1],'이 순간 甲은 「집 넘겨 달라」고 할 수 있고, 乙은 「돈 달라」고 할 수 있다. 서로 받을 것과 줄 것이 동시에 생겼다.'],
       learn:['권리와 의무','권리 = 남에게 요구할 수 있는 힘. 의무 = 남에게 해 줘야 할 것. 계약 하나에 둘이 같이 생긴다.'], next:'다음 화 — 잔금을 다 줬는데 乙이 집을 다른 사람에게 또 팔았다?'},
      {tag:'2화 · 물권과 채권', t:'집이 두 번 팔렸다', fig:C_TWICE, quiz:['civ_v_ownership_lv1_001'], prev:'甲은 乙에게 「집 넘겨 달라」고 할 권리가 생겼다.',
       scene:['乙이 몰래 丙에게도 집을 팔고, 丙이 먼저 등기를 했다.',['甲','내가 먼저 샀는데 왜 丙 집이에요?','甲'],'甲이 가진 건 乙에게만 요구할 수 있는 권리라 丙에게는 못 내민다. 丙은 등기로 집 자체에 대한 권리를 가져서 누구에게나 「내 집」이라고 할 수 있다.'],
       learn:['물권과 채권','채권 = 특정한 사람에게만 요구하는 권리. 물권 = 물건 자체에 대한 권리라 모두에게 주장한다.'], next:'다음 화 — 甲은 乙에게 무엇을 받아 낼 수 있을까(손해배상).'},
      soon(3)
    ]}
  };
  /* 한 화(또는 문제 이야기) 한 장 — 선행학습 lcard 안에 그린다 */
  /* 말하는 사람 얼굴 — 빵집 사장 甲만 그림(어른 웹툰체), 역할 없는 사람은 동그라미 안에 글자만. 이모지·마스코트 안 씀 */
  var FACE={ baker:'icons/story/baker_gap.png' };
  function faceHTML(f){ return (f && f.charAt(0)==='@' && FACE[f.slice(1)]) ? '<b class="pic" aria-hidden="true"><img src="'+FACE[f.slice(1)]+'" alt=""></b>' : '<b aria-hidden="true">'+esc(f||'')+'</b>'; }
  function storyHTML(c, learnLbl){
    return '<span class="bs-tag">'+esc(c.tag)+'</span><div class="ltitle bs-st">'+esc(c.t)+'</div>'
      +(c.prev?'<p class="bs-prev">지난 이야기: '+esc(c.prev)+'</p>':'')
      +'<div class="bs-scene">'+c.scene.map(function(x){ return Array.isArray(x)?'<div class="bs-say'+(x[3]?' r':'')+'"><span class="bs-face">'+faceHTML(x[2])+'<i>'+esc(x[0])+'</i></span><div><span class="bs-bub">'+esc(x[1])+'</span></div></div>':'<p>'+esc(x)+'</p>'; }).join('')+'</div>'
      +(c.fig?'<div class="bs-figwrap">'+c.fig+'</div>':'')
      +(c.learn?'<div class="bs-learn"><strong>'+esc(learnLbl||'이번 화 개념')+' · '+esc(c.learn[0])+'</strong><br>'+esc(c.learn[1])+'</div>':'')
      +(c.next?'<div class="bs-next">'+esc(c.next)+'</div>':'');
  }
  /* 선행학습 = 그 문제를 풀기 위한 학습 — 「기초」라는 이름 없이, 원래 개념 카드 뒤에 이 문제에만 쓰는 것만 붙인다(개념 카드와 같은 말은 빼고) */
  var Q={ e26_2:{ title:'풀이 순서', hideEx:[1],
      story:{tag:'이 문제 이야기', t:'주유소에 세금이 붙었다', fig:S_GAS,
        scene:['주유소 사장 乙은 휘발유를 1리터 1,400원에 하루 300리터 팔았다.',['정부','내일부터 1리터마다 500원씩 세금 내세요. 사장님이요.','정부',1],
          '乙은 값을 1,600원으로 올렸다. 운전자 甲은 덜 넣기 시작해 하루 200리터만 팔렸다. 乙 손에 남는 건 1,600 − 500 = 1,100원.',
          ['甲 (운전자)','세금은 사장님이 낸다면서 왜 내가 200원 더 내요?','甲'],'세금 500원 가운데 甲이 200원, 乙이 300원을 나눠 낸 셈이다. 법은 乙에게 매겼지만 실제로는 둘이 나눴다.'],
        learn:['조세의 귀착','세금을 누가 실제로 내는지는 법이 누구에게 매겼는지가 아니라, 값에 덜 민감한 쪽이 더 낸다.'], next:'이어서 → 풀이 순서(균형 구하기 6단계) → 문제 풀기'},
      steps:[['균형 찾기','수요량=공급량으로 놓는다. 1000−P/2 = P/3−500/3 → 양쪽에 6을 곱하면 6000−3P = 2P−1000 → P=1,400, Q=300.'],
        ['공급자에게 500원','공급식의 P 자리에 공급자가 받는 값 P−500을 넣는다. Qs=(P−500)/3−500/3.'],
        ['새 균형','1000−P/2 = (P−500)/3−500/3 → 6000−3P = 2P−2000 → 소비자가 내는 값 P=1,600, 공급자가 받는 값 1,100, Q=200.'],
        ['누가 얼마 무나','소비자 1,600−1,400=200원, 공급자 1,400−1,100=300원 → 공급자만 다 무는 게 아니다(ㄱ ×).'],
        ['거래량과 소비자잉여','거래량 300 → 200(ㄴ ○). 내는 값이 1,400 → 1,600으로 오르고 덜 사니 소비자잉여는 준다(ㄷ ×).'],
        ['수요자에게 500원','수요식이 1000−(P+500)/2가 된다. P/3−500/3과 같게 놓으면 6000−3P−1500 = 2P−1000 → 공급자가 받는 값 1,100, 거래량 200으로 같다(ㄹ ○).']] },
    e26_9:{ hideEx:[0],
      story:{tag:'이 문제 이야기', t:'마을에 빵집이 甲 하나만 남았다',
        scene:['옆 동네 빵집이 문을 닫아 마을에 빵집은 甲 하나만 남았다. 이제 빵값은 甲이 정한다.',['甲','그럼 2,000원으로 올려도 되겠네?','@baker'],
          '하지만 값을 올리면 손님은 덜 산다. 1,000원이면 10개, 900원이면 12개가 팔린다.',
          '900원으로 내려 2개 더 팔면 매출은 10,000원에서 10,800원으로 800원 늘어, 한 개 더 팔 때 늘어난 돈(MR)은 400원이다.',
          ['甲','빵 만드는 데도 돈이 드니, 한 개 더 팔아 늘어나는 돈이 0보다 클 때만 더 팔아야겠다.','@baker'],
          '그래서 혼자 파는 甲은 MR이 0보다 큰 곳, 곧 손님이 값에 민감한 구간(탄력성이 1보다 큰 곳)에서 값을 정한다.'],
        learn:['한계수입과 탄력성','MR이 0보다 크면 탄력성은 1보다 크고, MR이 0이면 탄력성은 딱 1이다.'], next:'이어서 → 개념 카드 → 문제 풀기'} } };

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
      +'<div class="learn-hd"><span class="learn-step">🧱 기초학습 · '+esc(deck.kind)+'</span><span class="learn-num">'+(BS.idx+1)+' / '+n+'</span></div>'
      +'<div class="lcard'+(c.soon?' bs-soon-card':'')+'">'+storyHTML(c)
      /* 이전·다음은 문제 풀이 아래 단추(mbtn-prev · mbtn-next) 꼴 그대로 한 줄에 같은 크기 — 첫 장의 이전은 흐리게 두어 자리를 지킨다(크리스) */
      +'<div class="bs-pn"><button type="button" class="mbtn mbtn-prev" onclick="bsGo(-1)"'+(BS.idx>0?'':' disabled')+'>← 이전</button>'
      +(c.quiz&&c.quiz.length?'<button type="button" class="mbtn mbtn-next" onclick="bsQuizStart()">이 화 문제 '+c.quiz.length+'개 →</button>':last?'<button type="button" class="mbtn mbtn-next" onclick="bsLevelUp()">레벨업 1단계 풀기 →</button>':'<button type="button" class="mbtn mbtn-next" onclick="bsGo(1)">다음 →</button>')+'</div></div>';
  };
  window.bsGo=function(d){ var n=(D[BS.key]||{cards:[]}).cards.length; var i=BS.idx+d; if(i<0||i>=n) return; BS.idx=i; renderMCQ(); window.scrollTo(0,0); };
  window.bsClose=function(){ BS={sub:'', key:'', idx:0}; mqScreen='home'; renderMCQ(); window.scrollTo(0,0); };   // 오른쪽 위 X — 기초학습을 닫고 시험 홈으로
  window.bsDone=function(){ var sub=BS.sub; BS={sub:'', key:'', idx:0}; if(sub) mqOpen[sub]=true; mqScreen='home'; renderMCQ(); window.scrollTo(0,0); };   // 끝 → 그 과목 기출 목록을 펼친 시험 홈
  /* 한 화 끝 → 그 화 개념이 나오는 레벨업 1단계 문제 1~2개(크리스). 문제는 adaptive/…__variantq 의 diff 1(AD_DATA variantPool · 읽기만).
     지금 문제 풀이 화면(renderMcqExam) 그대로 그리고, 보기를 고르면 정답·해설을 편다. 견본이라 복습 기록·레벨·푼 수는 건드리지 않는다 */
  var BQ=null;   // {key, sub, ep, list, idx}
  function bqFind(cert, ids){ var out=[]; var bank=MAP[cert]?Object.keys(MAP[cert]):[];
    ids.forEach(function(id){ var got=null; ['appraiser|econ','appraiser|civil'].concat(bank.map(function(s){ return cert+'|'+s; })).some(function(k){ var b=(typeof AD_DATA!=='undefined')&&AD_DATA[k]; var v=b&&b.variantPool&&b.variantPool.filter(function(x){ return x&&x.id===id; })[0]; if(v){ got=v; return true; } return false; }); if(got) out.push(got); });
    return out; }
  window.bsQuizStart=function(){ var c=D[BS.key].cards[BS.idx]; var list=bqFind(mqCert, c.quiz||[]);
    if(!list.length){ if(typeof _luToast==='function') _luToast('이 화 문제를 아직 못 불러왔어요 — 다음 화로 넘어가요'); bsGo(1); return; }
    BQ={key:BS.key, sub:BS.sub, ep:BS.idx, list:list, idx:0};
    mqList=list; mqIdx=0; mqAns={}; mqShow={}; mqGuess={}; mqSub=BS.sub; mqSet=0; mqConcept=false; mqLevelUp=false; mqReview=false; mqDiag=false; mqInReview=false; mqGather=false;
    try{ mqStopTimer(); mqStopOverTimer(); }catch(_){}
    mqScreen='bsquiz'; renderMCQ(); window.scrollTo(0,0); };
  window.renderBsQuiz=function(root){
    if(!BQ){ mqScreen='basics'; return renderMCQ(); }
    mqIdx=BQ.idx; renderMcqExam(root);
    var deck=D[BQ.key], c=deck.cards[BQ.ep], n=BQ.list.length, q=BQ.list[BQ.idx], ans=mqAns[q.id]!==undefined;
    root.insertAdjacentHTML('afterbegin','<i class="bs-quiz-mark" hidden></i>');
    var nm=root.querySelector('.exam-ti .nm'), st=root.querySelector('.exam-ti .st');
    if(nm) nm.textContent='기초학습 · '+deck.name; if(st) st.textContent=c.tag.split(' · ')[0]+' 문제 '+(BQ.idx+1)+' / '+n+' · 레벨업 1단계';
    var bk=root.querySelector('.exam-back'); if(bk){ bk.setAttribute('onclick','bsQuizBack()'); bk.setAttribute('aria-label','이야기로'); }
    var lastQ=BQ.idx>=n-1;
    var foot=root.querySelector('.mcq-foot');
    if(foot) foot.innerHTML='<button class="mbtn mbtn-prev" onclick="bsQuizGo(-1)">← '+(BQ.idx>0?'이전 문제':'이야기')+'</button>'
      +'<button class="mbtn mbtn-next" onclick="bsQuizGo(1)"'+(ans?'':' disabled')+'>'+(lastQ?'다음 화 →':'다음 문제 →')+'</button>';
  };
  window.bsQuizGo=function(d){ if(!BQ) return; var i=BQ.idx+d;
    if(i<0){ bsQuizBack(); return; }
    if(i>=BQ.list.length){ var ep=BQ.ep; BQ=null; mqList=null; BS.idx=Math.min(ep+1, D[BS.key].cards.length-1); mqScreen='basics'; renderMCQ(); window.scrollTo(0,0); return; }
    BQ.idx=i; renderMCQ(); window.scrollTo(0,0); };
  window.bsQuizBack=function(){ BQ=null; mqList=null; mqScreen='basics'; renderMCQ(); window.scrollTo(0,0); };
  /* 견본 문제 화면에서는 고르기·해설·찍음이 화면만 바꾼다(복습 기록·레벨·푼 수 저장 없음) */
  ['mqPick','mqToggleExp','mqToggleGuess'].forEach(function(fn){ if(typeof window[fn]!=='function') return; var orig=window[fn];
    window[fn]=function(qid,n){ if(mqScreen!=='bsquiz') return orig.apply(this, arguments);
      if(fn==='mqPick'){ mqAns[qid]=n; mqShow[qid]=true; } else if(fn==='mqToggleExp'){ mqShow[qid]=!mqShow[qid]; } else { mqGuess[qid]=!mqGuess[qid]; }
      renderMCQ(); }; });
  /* 기초학습 끝 → 그 과목 레벨업(크리스 「기초학습 끝나면 레벨업 1단계 풀라고 하면 되나」)
     · 이미 레벨이 있으면(레벨테스트 끝) 지금 레벨로 그 과목 레벨업을 이어서
     · 레벨테스트 전이면 그 과목만 Lv1(점수 10)으로 정하고 레벨테스트 관문을 한 번만 건너 바로 그 과목 레벨업. 다른 과목·레벨테스트는 그대로(나중에 볼 수 있음)
     · 견본이라 Lv1 시드는 이 브라우저 메모리에만 — 로그인 상태에서는 레벨 저장(saveUserData)이 서버로 가므로 헤드 확인 전까지 막아 둔다 */
  var BS_SERVER_OK=false;
  window.bsLevelUp=function(){
    var sub=BS.sub, cert=mqCert; if(!sub) return;
    var seeded=(typeof ltDone==='function') && !ltDone(cert);
    if(seeded && typeof currentUser!=='undefined' && currentUser && !BS_SERVER_OK){
      if(typeof _luToast==='function') _luToast('견본: 로그인 상태에서는 Lv1 저장이 서버로 가서 아직 막아 뒀어요'); return; }
    if(seeded){
      try{ var k=cert+'|'+sub; if(!eloState[k]) eloState[k]={};
        var lv1=(window.AE&&AE.levelToScore)?AE.levelToScore(1):10;
        Object.keys((typeof topicNameMap==='function'&&topicNameMap(cert,sub))||{}).forEach(function(tc){ if(!eloState[k][tc]) eloState[k][tc]={score:lv1, attempts:0, seeded:true, fromBasics:true, ts:Date.now()}; });
      }catch(_){}
      window._bsLuOnce=cert;   // 아래 ltGate 덮개가 한 번만 통과시킨다
    }
    BS={sub:'', key:'', idx:0};
    if(typeof luStartSub==='function') luStartSub(sub);
  };
  /* 레벨테스트 관문 — 기초학습에서 들어온 그 한 번만 건너뛴다(다른 길은 원래대로) */
  if(typeof ltGate==='function'){ var _bsLtGate=ltGate; window.ltGate=function(c){ if(window._bsLuOnce && window._bsLuOnce===c){ window._bsLuOnce=null; return false; } return _bsLtGate.apply(this, arguments); }; }
  window.bsQPreHTML=function(q){ var b=q&&Q[q.id]; return (b&&b.story)?'<div class="lcard bs-story">'+storyHTML(b.story,'이 문제 개념')+'</div>':''; };
  window.bsCardFilter=function(q, html){ var b=q&&Q[q.id]; if(!b||!b.hideEx) return html;   // 이야기와 같은 말을 하는 개념 카드 예시는 뺀다
    var t=document.createElement('div'); t.innerHTML=html; var ex=t.querySelectorAll('.cc-ex'); b.hideEx.forEach(function(i){ if(ex[i]) ex[i].remove(); }); return t.innerHTML; };
  window.bsQHTML=function(q){ var b=q&&Q[q.id]; if(!b) return '';
    var h='';
    if(b.steps) h+='<div class="bs-solve"><div class="ltitle">'+esc(b.title||'풀이 순서')+'</div>'
      +(b.fig?'<div class="bs-figwrap">'+b.fig+(b.legend?'<div class="bs-legend">'+esc(b.legend)+'</div>':'')+'</div>':'')
      +b.steps.map(function(s,i){ return '<div class="lsec"><div class="lsec-t"><span class="lico">'+(i+1)+'</span>'+esc(s[0])+'</div><div class="lsec-d">'+esc(s[1])+'</div></div>'; }).join('')+'</div>';
    if(b.ex) h+='<div class="lcue"><span class="lcue-tag">예시</span>'+esc(b.ex)+'</div>';
    return h;
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
