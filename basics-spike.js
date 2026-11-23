/* [2026-11-24 기초학습 · 라이브] 크리스 「기초학습과 선행학습은 달라야 한다」 「선행학습은 문제에 대한 선행학습」
   ① 기초학습 = 과목 바탕. 선행학습과 따로 — 시험 홈 「암기코드 듣기」 위 띠 → 과목 고르기 → 기초 카드(경제학원론=그래프 · 민법=관계도)
     자료는 과목 기초 묶음(D.civil · D.econ) 단위, 시험마다 MAP 연결표(감평·공인중개사 1차·주택관리사 1차 민법 → civil)
   ② 선행학습 = 그 문제를 풀기 위한 학습 — 「기초」 이름 없이 원래 개념 카드 뒤에 이 문제만의 것만(e26_9 숫자 예시 · e26_2 풀이 순서). 회차 흐름에서도 그 문제 차례에 나온다
   원고는 basics-story-data.js — Firestore 에 쓰지 않는다(본 화 표시는 이 브라우저 localStorage, 레벨은 원래 레벨 저장 흐름). 생김새는 선행학습 카드(learn-hd · lcard · lsec · lcue) 그대로.
   바로가기: ?basics=econ · ?basics=civil(기초학습 화면) · ?basics=q(e26_9) · ?basics=q2(e26_2)(선행학습 그 문제) — 로그인 없이 */
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
  var S_MR=fig('0 0 320 170','매출 10,000원에서 10,800원, 한 개 더 팔 때 400원','<path class="ax" d="M30 140 H305"/>'
    +'<rect x="50" y="40" width="60" height="100" rx="4" fill="#B5D4F4"/><rect x="140" y="32" width="60" height="108" rx="4" fill="#185FA5"/>'
    +'<text x="50" y="30">10,000원</text><text x="140" y="22">10,800원</text><text x="56" y="158" class="muted">1,000원×10</text><text x="148" y="158" class="muted">900원×12</text>'
    +'<text x="222" y="70">+800원</text><text x="222" y="92">÷ 2개</text><text x="222" y="114" style="font-weight:700">= MR 400원</text>');
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
  /* ── 기초학습 그림(원고의 「그래프」 설명대로) ──
     좌표 그림은 plot() 하나로 — 선은 식으로 그리고 점·점선은 그 식의 값으로만 찍는다(눈대중 좌표 금지).
     선 1.5 · 축 1 · 점 3.5. 글씨는 선에서 떼고, 자리가 없으면 그림 밑 설명 줄(legend)로 뺀다. */
  function plot(o){
    var W=o.w||320, H=o.h||200, L=o.L||52, R=W-(o.R||52), T=14, B=H-28;
    var X=function(v){ return +(L+(v-o.x[0])/(o.x[1]-o.x[0])*(R-L)).toFixed(1); };
    var Y=function(v){ return +(B-(v-o.y[0])/(o.y[1]-o.y[0])*(B-T)).toFixed(1); };
    var t=function(x,y,s,anc,cls){ return '<text x="'+x+'" y="'+y+'"'+(anc?' text-anchor="'+anc+'"':'')+(cls?' class="'+cls+'"':'')+'>'+esc(s)+'</text>'; };
    var h=o.noAxis?'':'<path class="ax" d="M'+L+' '+(T-4)+' V'+B+' H'+(R+8)+'"/>'+t(4,10,o.yl||'')+t(W-4,H-4,o.xl||'','end');
    (o.items||[]).forEach(function(it){
      if(it.area) h+='<path d="M'+it.area.map(function(p){ return X(p[0])+' '+Y(p[1]); }).join(' L')+' Z" fill="'+it.fill+'" stroke="none"/>';
      else if(it.f){ var n=it.n||48, d=''; for(var i=0;i<=n;i++){ var q=it.a+(it.b-it.a)*i/n; d+=(i?' L':'M')+X(q)+' '+Y(it.f(q)); }
        h+='<path class="'+(it.cls||'dl')+'" d="'+d+'"'+(it.dashed?' stroke-dasharray="6 4"':'')+'/>';
        if(it.name) h+=t(X(it.b)+5, Y(it.f(it.b))+4+(it.ndy||0), it.name); }
      else if(it.line) h+='<path class="'+(it.cls||'dl')+'" d="M'+it.line.map(function(p){ return X(p[0])+' '+Y(p[1]); }).join(' L')+'"/>';
      else if(it.dash){ var p=it.dash; h+='<path class="dash" d="M'+L+' '+Y(p[1])+' H'+X(p[0])+(it.toX===false?'':' V'+B)+'"/>'; }
      else if(it.vdash){ var v=it.vdash; h+='<path class="dash" d="M'+X(v[0])+' '+Y(v[1])+' V'+B+'"/>'; }
      else if(it.hseg){ var s=it.hseg; h+='<path class="dash" d="M'+X(s[0])+' '+Y(s[2])+' H'+X(s[1])+'"/>'; }
      else if(it.pt){ var c=it.pt; h+='<circle cx="'+X(c[0])+'" cy="'+Y(c[1])+'" r="3.5"'+(it.hollow?' fill="none" stroke="'+(it.color||'#185FA5')+'" stroke-width="1.5"':' fill="'+(it.color||'#185FA5')+'"')+'/>';
        if(it.lab) h+=t(X(c[0])+(it.dx||8), Y(c[1])+(it.dy==null?-8:it.dy), it.lab, it.anc, it.lcls); }
      else if(it.ty) h+=t(L-5, Y(it.ty)+4, it.s, 'end', it.cls);
      else if(it.tx!=null) h+=t(X(it.tx), B+15, it.s, 'middle', it.cls);
      else if(it.txt) h+=t(X(it.txt[0])+(it.dx||0), Y(it.txt[1])+(it.dy||0), it.s, it.anc, it.cls);
    });
    return fig('0 0 '+W+' '+H, o.label||'', h)+(o.legend?'<div class="bs-legend">'+esc(o.legend)+'</div>':'');
  }
  /* 막대 — 값 비율대로 높이, 위에 값, 밑에 이름. gap:true 는 「…」 칸 */
  function bars(o){
    var W=320, H=o.h||190, L=24, B=H-28, T=26, n=o.vals.length, cw=(W-L-12)/n, mx=o.max;
    var h='<path class="ax" d="M'+L+' '+B+' H'+(W-8)+'"/>';
    o.vals.forEach(function(v,i){ var cx=L+cw*i+cw/2;
      if(v.gap){ h+='<text x="'+cx+'" y="'+(B-6)+'" text-anchor="middle" class="muted">…</text>'; return; }
      var bh=Math.max(2,(B-T)*v.v/mx), bw=Math.min(34,cw*0.62);
      h+='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+(B-bh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="3" fill="'+(v.total?'#185FA5':'#B5D4F4')+'"/>'
        +'<text x="'+cx.toFixed(1)+'" y="'+(B-bh-6).toFixed(1)+'" text-anchor="middle"'+(v.total?' style="font-weight:700"':'')+'>'+esc(v.top)+'</text>'
        +'<text x="'+cx.toFixed(1)+'" y="'+(B+15)+'" text-anchor="middle" class="muted">'+esc(v.lab)+'</text>'; });
    return fig('0 0 '+W+' '+H, o.label||'', h)+(o.legend?'<div class="bs-legend">'+esc(o.legend)+'</div>':'');
  }
  /* 관계도 — ① ② … 차례로 「누가 → 누구 : 무엇」, 마지막 「→ 결과」 줄 */
  var CIRC={'①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10};   // 번호는 원 안에 넣지 않는다 — 「1.」 큰 숫자(크리스)
  /* 관계도 — 앱 개념 카드가 쓰는 [dia] 관계도(renderMath → <pre class="cc-dia">, 「甲 ─(무엇)→ 乙」) 그대로(크리스 「개념에서 쓰는 관계도 화살표 형태도 갖다써」).
     번호는 원 없이 「1.」 큰 숫자, 마지막 「→ 결과」 줄 */
  var ARW={'→':['─(',')→'],'↔':['←(',')→'],'⇢':['┄(',')┄→']};
  function rel(rows, result){
    var lines=rows.map(function(r){ var n=(CIRC[r[0]]||r[0])+'.'; var a=ARW[r[2]];
      return a ? n+' '+r[1]+' '+a[0]+r[4]+a[1]+' '+r[3] : n+' '+r[1]+(r[3]?' '+r[3]:'')+' — '+r[4]; });
    [].concat(result||[]).forEach(function(x){ lines.push('→ 결과: '+x); });
    var h=(typeof renderMath==='function') ? renderMath('[dia]\n'+lines.join('\n')+'\n[/dia]') : '<pre class="cc-dia">'+esc(lines.join('\n'))+'</pre>';
    return h.replace(/(<pre class="cc-dia">|<br>)(\d+)\./g, '$1<b class="bs-dnum">$2.</b>').replace(/(<br>)(→ 결과:[^<]*)/g, '$1<b class="bs-dres">$2</b>');
  }
  function tbl(head, rows, note){ return '<table class="bs-tbl"><thead><tr>'+head.map(function(x){ return '<th>'+esc(x)+'</th>'; }).join('')+'</tr></thead><tbody>'
    +rows.map(function(r){ return '<tr>'+r.map(function(x,i){ var hl=(typeof x==='object'&&x); return '<td'+(hl?' class="hl"':'')+'>'+esc(hl?x.v:x)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table>'
    +(note?'<div class="bs-legend">'+esc(note)+'</div>':''); }
  function flow(boxes, note){ return '<div class="bs-flow">'+boxes.map(function(b,i){ return (i?'<span class="bs-fa">→</span>':'')+'<div class="bs-fb"><b>'+esc(b[0])+'</b><span>'+esc(b[1])+'</span></div>'; }).join('')+'</div>'+(note?'<div class="bs-legend">'+esc(note)+'</div>':''); }

  var De=function(q){ return 1500-50*q; }, MRe=function(q){ return 1500-100*q; }, TRe=function(q){ return 1500*q-50*q*q; };
  var D9=function(q){ return 1200-q; }, S9=function(q){ return 150+q/2; };
  var FIG={ econ:{
    1: plot({label:'수요곡선 P=1,500−50Q', yl:'값(원)', xl:'양(개)', x:[0,30], y:[0,1600], items:[
      {f:De, a:0, b:28, name:'수요'},
      {pt:[10,De(10)], lab:'1,000원 · 10개'}, {pt:[12,De(12)], lab:'900원 · 12개', dx:-8, dy:18, anc:'end'}]}),
    2: S_MR,
    3: plot({label:'매출 TR=1,500Q−50Q²', yl:'매출(원)', xl:'양(개)', x:[0,30], y:[0,12000], items:[
      {f:TRe, a:0, b:30, cls:'gl'}, {vdash:[15,TRe(15)]},
      {pt:[10,TRe(10)], color:'#15803D'}, {pt:[12,TRe(12)], color:'#15803D'}, {pt:[20,TRe(20)], color:'#15803D'},
      {pt:[15,TRe(15)], color:'#15803D', lab:'꼭대기 · MR=0 · 탄력성 1', dx:6, dy:-6},
      {ty:10000, s:'10,000'}, {tx:10, s:'10'}, {tx:15, s:'15'}, {tx:20, s:'20'},
      {txt:[9,4480], s:'MR>0', anc:'middle', cls:'muted'}, {txt:[9,4480], dy:16, s:'내리면 늘어남', anc:'middle', cls:'muted'},
      {txt:[21,4480], s:'MR<0', anc:'middle', cls:'muted'}, {txt:[21,4480], dy:16, s:'내리면 줄어듦', anc:'middle', cls:'muted'}]}),
    4: plot({label:'독점: MR=MC에서 양, 수요곡선에서 값', yl:'값(원)', xl:'양(개)', x:[0,16], y:[0,1600], items:[
      {f:De, a:0, b:16, name:'수요'}, {f:MRe, a:0, b:14, cls:'rl', name:'MR'}, {f:function(){ return 500; }, a:0, b:16, cls:'gl', name:'MC'},
      {dash:[10,De(10)]}, {pt:[10,De(10)], lab:'독점가격'}, {pt:[10,MRe(10)], color:'#C2410C', lab:'MR=MC', dx:-8, dy:18, anc:'end'},
      {ty:1000, s:'1,000'}, {ty:500, s:'500'}, {tx:10, s:'10'}]}),
    5: plot({label:'평균비용 AC=2,000/Q+500, 한계비용 MC=500', yl:'비용(원)', xl:'양(개)', x:[0,40], y:[0,1200], items:[
      {f:function(q){ return 2000/q+500; }, a:3, b:40, cls:'rl'}, {f:function(){ return 500; }, a:0, b:40, cls:'gl', name:'MC'},
      {txt:[4,1100], dx:6, s:'AC(평균비용)'},
      {pt:[10,2000/10+500], color:'#C2410C', lab:'10개 · 700원'}, {pt:[20,2000/20+500], color:'#C2410C', lab:'20개 · 600원'},
      {ty:500, s:'500'}]}),
    6: plot({label:'수요가 오른쪽으로 이동', yl:'값(원)', xl:'양(개)', x:[0,32], y:[0,1800], legend:'파랑: 원래 수요 P=1,500−50Q · 주황: 새 수요 P=1,700−50Q (같은 1,000원에 10개 → 14개)', items:[
      {f:De, a:0, b:28}, {f:function(q){ return 1700-50*q; }, a:0, b:32, cls:'rl'}, {hseg:[0,32,1000]},
      {pt:[10,1000], lab:'10개', dx:-6, dy:16, anc:'end'}, {pt:[14,1000], color:'#C2410C', lab:'14개', dx:6, dy:-6},
      {ty:1000, s:'1,000'}]}),
    8: plot({label:'꾸르노 반응곡선', yl:'q乙(개)', xl:'q甲(개)', x:[0,26], y:[0,26], legend:'파랑: 甲의 반응곡선 q甲=12−q乙/2 · 주황: 乙의 반응곡선 q乙=12−q甲/2 · 만나는 (8, 8)이 꾸르노 균형', items:[
      {f:function(x){ return 24-2*x; }, a:0, b:12}, {f:function(x){ return 12-x/2; }, a:0, b:24, cls:'rl'},
      {dash:[8,8]}, {pt:[8,8], color:'#15803D', lab:'(8, 8) 꾸르노 균형'},
      {ty:8, s:'8'}, {ty:12, s:'12'}, {ty:24, s:'24'}, {tx:8, s:'8'}, {tx:12, s:'12'}, {tx:24, s:'24'}]}),
    9: plot({label:'시장균형', yl:'값(원)', xl:'양(개)', x:[0,1000], y:[0,1300], h:240, legend:'균형 700개 · 500원 — 600원이면 수요 600·공급 900(초과공급 300), 400원이면 수요 800·공급 500(초과수요 300)', items:[
      {f:D9, a:0, b:1000, name:'수요'}, {f:S9, a:0, b:1000, cls:'rl', name:'공급'},
      {hseg:[0,900,600]}, {hseg:[0,800,400]}, {dash:[700,500]},
      {pt:[600,D9(600)]}, {pt:[900,S9(900)], color:'#C2410C'}, {pt:[800,D9(800)]}, {pt:[500,S9(500)], color:'#C2410C'}, {pt:[700,D9(700)], color:'#15803D'},
      {ty:600, s:'600'}, {ty:500, s:'500'}, {ty:400, s:'400'}, {tx:700, s:'700'}]}),
    10: plot({label:'완전경쟁: P=MC', yl:'값(원)', xl:'양(개)', x:[0,46], y:[0,700], items:[
      {f:function(){ return 500; }, a:0, b:46, name:'P=500'}, {f:function(q){ return 200+10*q; }, a:0, b:46, cls:'rl', name:'MC'},
      {dash:[30,500]}, {pt:[30,500], color:'#15803D', lab:'30개 · 500원', dx:8, dy:18},
      {ty:500, s:'500'}, {ty:200, s:'200'}, {tx:30, s:'30'}]}),
    11: plot({label:'소비자잉여와 생산자잉여', yl:'값(원)', xl:'양(개)', x:[0,1000], y:[0,1300], h:240, legend:'소비자잉여 245,000원(파란 삼각형) · 생산자잉여 122,500원(노란 삼각형) · 균형 700개 · 500원', items:[
      {area:[[0,1200],[0,500],[700,500]], fill:'#E6F1FB'}, {area:[[0,500],[0,150],[700,500]], fill:'#FFF3D6'},
      {f:D9, a:0, b:1000, name:'수요'}, {f:S9, a:0, b:1000, cls:'rl', name:'공급'},
      {dash:[700,500]}, {pt:[700,500], color:'#15803D'},
      {txt:[200,716], s:'소비자잉여', anc:'middle'}, {txt:[150,380], s:'생산자잉여', anc:'middle'},
      {ty:1200, s:'1,200'}, {ty:500, s:'500'}, {ty:150, s:'150'}, {tx:700, s:'700'}]}),
    12: tbl(['','1개','2개','3개','4개','5개','6개','7개'], [
        ['빵 한계효용','10','8','6',{v:'4'},'2','0','−2'], ['빵 100원당','2','1.6','1.2',{v:'0.8'},'0.4','0','−0.4'],
        ['우유 한계효용','20','16','12',{v:'8'},'4','',''], ['우유 100원당','2','1.6','1.2',{v:'0.8'},'0.4','','']],
        '빵 500원·우유 1,000원 — 둘 다 넷째 칸(100원당 0.8)에서 멈춤: 빵 4개 + 우유 4개 = 6,000원')
      +plot({label:'빵 총효용', yl:'총효용', xl:'빵(개)', x:[0,8], y:[0,34], h:170, items:[
        {line:[[1,10],[2,18],[3,24],[4,28],[5,30],[6,30],[7,28]], cls:'gl'},
        {pt:[1,10], color:'#15803D'}, {pt:[2,18], color:'#15803D'}, {pt:[3,24], color:'#15803D'}, {pt:[4,28], color:'#15803D'}, {pt:[5,30], color:'#15803D'}, {pt:[6,30], color:'#15803D', lab:'꼭대기 30 · 한계효용 0', dx:0, dy:-10, anc:'middle'}, {pt:[7,28], color:'#15803D'},
        {ty:30, s:'30'}, {tx:1, s:'1'}, {tx:4, s:'4'}, {tx:6, s:'6'}, {tx:7, s:'7'}]}),
    13: flow([['농부 · 밀','100원'],['제분소 · 밀가루','300원 (부가가치 200)'],['甲 · 빵','500원 (부가가치 200)']], '부가가치 100 + 200 + 200 = 500 = 최종 재화 빵 500원'),
    14: bars({label:'신용창조: 1,000만 원 → 1억 원', max:10000, legend:'매번 0.9배로 다시 맡겨진다 · 합계 = 1,000만 ÷ 0.1 = 1억 원', vals:[
      {v:1000, top:'1,000만', lab:'1차'}, {v:900, top:'900만', lab:'2차'}, {v:810, top:'810만', lab:'3차'}, {v:729, top:'729만', lab:'4차'}, {gap:1}, {v:10000, top:'1억', lab:'합계', total:1}]}),
    16: '<div class="bs-boxes"><div class="bs-bx-all">15세 이상 인구 100명<div class="bs-bx-row"><div class="bs-bx bs-bx-a">경제활동인구 60<div class="bs-bx-row"><div class="bs-bx">취업자 57</div><div class="bs-bx bs-bx-u">실업자 3</div></div></div><div class="bs-bx bs-bx-n">비경제활동인구 40</div></div></div></div><div class="bs-legend">실업률 = 3 ÷ 60 = 5%</div>',
    17: bars({label:'정부지출 승수: 10억 → 20억', max:20, legend:'매번 0.5배로 다시 쓰인다 · 합계 = 10억 × 2 = 20억 원', vals:[
      {v:10, top:'10억', lab:'1차'}, {v:5, top:'5억', lab:'2차'}, {v:2.5, top:'2.5억', lab:'3차'}, {v:1.25, top:'1.25억', lab:'4차'}, {gap:1}, {v:20, top:'20억', lab:'합계', total:1}]})
  }, civil:{
    2: rel([['①','乙(집주인)','→','甲','먼저 계약 — 채권만 생김'],['②','乙(집주인)','→','丙','또 팔고 丙이 등기 → 물권']], '집은 丙, 甲은 乙에게 손해배상'),
    3: rel([['①','법률','','(성문법)','가장 먼저'],['②','관습법','','(불문법)','법률에 없으면'],['③','조리','','(불문법)','관습법도 없으면']], '관습법과 조리는 불문법'),
    4: rel([['①','乙','→','戊','짜고 한 가짜 매매 — 무효'],['②','戊','→','己','진짜 매매 — 己는 몰랐음(선의)'],['③','甲','⇢','己','무효 주장 못 함']], '甲은 선의의 己에게 무효를 주장 못 함'),
    7: rel([['①','중개사','→','甲','속임(제3자의 사기)'],['②','甲','↔','집주인','매매계약']], ['집주인이 알았거나 알 수 있었음 → 甲은 취소 가능','몰랐고 알 수도 없었음 → 취소 불가']),
    8: tbl(['무효','취소'], [['비진의표시(상대방 악의·과실)','착오(중요부분)'],['통정허위표시','사기'],['','강박']], '취소 → 처음부터 무효(소급) · 추인 → 더는 취소 못 함'),
    10: rel([['①','甲(본인)','→','동생(대리인)','대리권 줌'],['②','동생','→','장학회','甲의 대리인으로 계약']], '효과는 甲에게 직접(장학회 → 甲)'),
    13: tbl(['할 일','예','누가 정하나'], [['보존행위','담 수리·무단 사용자 내보내기','각자 혼자'],['관리행위','주차장 임대','지분 과반수'],['처분·변경','매각·건축','전원 동의']])
      +fig('0 0 320 120','지분: 甲 1/2, 아내 1/4, 동생 1/4','<path d="M60 60 L60 18 A42 42 0 0 1 60 102 Z" fill="#185FA5"/><path d="M60 60 L60 102 A42 42 0 0 1 18 60 Z" fill="#B5D4F4"/><path d="M60 60 L18 60 A42 42 0 0 1 60 18 Z" fill="#FAC775"/>'
        +'<rect x="130" y="30" width="12" height="12" fill="#185FA5"/><text x="148" y="41">甲 1/2</text><rect x="130" y="54" width="12" height="12" fill="#B5D4F4"/><text x="148" y="65">아내 1/4</text><rect x="130" y="78" width="12" height="12" fill="#FAC775"/><text x="148" y="89">동생 1/4</text>'),
    14: tbl(['권리','무엇','특징'], [['지상권','남의 땅에 건물·수목 소유','최단 30/15/5년'],['지역권','내 땅 편익을 위해 남의 땅 이용','통행'],['전세권','전세금 내고 남의 부동산 사용·수익','우선변제']]),
    15: tbl(['권리','어떻게','예'], [['유치권','물건 붙잡아 둠','목수 庚의 창고 열쇠'],['질권','동산을 넘겨받아 점유','맡긴 시계'],['저당권','점유는 그대로, 등기로','집']]),
    16: plot({label:'소멸시효 시간선', noAxis:1, L:16, R:16, x:[0,22], y:[0,10], h:150, legend:'소유권 — 시효 없음', items:[
      {line:[[0,5],[21,5]], cls:'dl'}, {pt:[0,5]}, {pt:[9,5], color:'#C2410C'}, {pt:[10,5], color:'#15803D'}, {pt:[20,5], color:'#15803D'},
      {txt:[0,5], dx:2, dy:-24, s:'권리 행사할 수 있는 때'}, {txt:[0,5], dx:2, dy:-10, s:'시효 시작', cls:'muted'},
      {txt:[9,5], dy:20, s:'지금(9년)', anc:'end'}, {txt:[9,5], dy:34, s:'소송으로 중단', anc:'end', cls:'muted'},
      {txt:[10,5], dx:4, dy:20, s:'10년'}, {txt:[10,5], dx:4, dy:34, s:'채권 시효 완성', cls:'muted'},
      {txt:[20,5], dy:-24, s:'20년', anc:'end'}, {txt:[20,5], dy:-10, s:'지상권 등 기타 재산권 완성', anc:'end', cls:'muted'}]})
  } };

  /* 원고(basics-story-data.js · BS_STORY)를 한 장씩 카드로 — 글은 원고 그대로.
     말풍선: 그림 있는 인물은 그림, 그 밖은 동그라미 안 첫 글자 · 밑에 이름. 주인공 甲은 늘 왼쪽, 다른 사람은 오른쪽 */
  /* 과목마다 그림이 있는 인물 — 그 밖의 사람(동생·은행원·변호사·중개사 등)은 동그라미 안 글자 */
  var PIC={ econ:{'甲':'baker','乙':'baker_eul'}, civil:{'甲':'civ_gap','乙':'civ_eul','丙':'civ_byeong','丁':'civ_jeong','戊':'civ_mu'} };
  function cardsOf(key){ var S=(window.BS_STORY||{})[key]; if(!S) return [];
    return S['화'].map(function(e, i, all){
      var sc=e['장면'].map(function(x){ if(!x['말']) return x['글'];
        var who=x['말'];
        var face=(PIC[key]&&PIC[key][who]) ? '@'+PIC[key][who] : who.charAt(0);
        return [who, x['글'], face, who==='甲'?0:1]; });   // 주인공 甲은 늘 왼쪽, 다른 사람은 오른쪽(크리스)
      var last=(i===all.length-1);
      return { tag:e['화']+'화 · '+e['개념'], t:e['제목'], prev:e['지난이야기']||'', scene:sc,
        learn:[e['개념'], e['개념상자']], next:last?e['다음화']:('다음 화 — '+e['다음화']), quiz:e['문제']||[], fig:(FIG[key]&&FIG[key][e['화']])||'' };
    }); }
  var D={
    econ:{ name:'경제학원론', kind:'빵집 甲 이야기', cards:cardsOf('econ') },
    civil:{ name:'민법', kind:'甲의 첫 집 사기', cards:cardsOf('civil') }
  };
  /* 한 화(또는 문제 이야기) 한 장 — 선행학습 lcard 안에 그린다 */
  /* 말하는 사람 얼굴 — 빵집 사장 甲만 그림(어른 웹툰체), 역할 없는 사람은 동그라미 안에 글자만. 이모지·마스코트 안 씀 */
  var FACE={ baker:'icons/story/baker_gap.png', baker_eul:'icons/story/baker_eul.png',
    civ_gap:'icons/story/civ_gap.png', civ_eul:'icons/story/civ_eul.png', civ_byeong:'icons/story/civ_byeong.png', civ_jeong:'icons/story/civ_jeong.png', civ_mu:'icons/story/civ_mu.png' };
  /* 과목마다 그림이 있는 인물 — 그 밖의 사람(동생·은행원·변호사·중개사 등)은 동그라미 안 글자 */
  var PIC={ econ:{'甲':'baker','乙':'baker_eul'}, civil:{'甲':'civ_gap','乙':'civ_eul','丙':'civ_byeong','丁':'civ_jeong','戊':'civ_mu'} };   // baker_eul(옆 빵집 乙)은 그림이 오면 넣는다 — 파일이 없으면 글자로
  function faceHTML(f, alt){ return (f && f.charAt(0)==='@' && FACE[f.slice(1)]) ? '<b class="pic" aria-hidden="true" data-alt="'+esc(alt||'')+'"><img src="'+FACE[f.slice(1)]+'" alt="" onerror="var b=this.parentNode;b.classList.remove(\'pic\');b.textContent=b.getAttribute(\'data-alt\')"></b>' : '<b aria-hidden="true">'+esc(f||'')+'</b>'; }
  function storyHTML(c, learnLbl){
    return '<span class="bs-tag">'+esc(c.tag)+'</span><div class="ltitle bs-st">'+esc(c.t)+'</div>'
      +(c.prev?'<p class="bs-prev">지난 이야기: '+esc(c.prev)+'</p>':'')
      +'<div class="bs-scene">'+c.scene.map(function(x){ return Array.isArray(x)?'<div class="bs-say'+(x[3]?' r':'')+'"><span class="bs-face">'+faceHTML(x[2], x[0].charAt(0))+'<i>'+esc(x[0])+'</i></span><div><span class="bs-bub">'+esc(x[1])+'</span></div></div>':'<p>'+esc(x)+'</p>'; }).join('')+'</div>'
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
  /* 본 화 표시 — 이 브라우저(localStorage)에만 */
  function seenGet(k){ try{ return JSON.parse(localStorage.getItem('certlab_bs_seen_'+k)||'[]'); }catch(_){ return []; } }
  function seenAdd(k,i){ try{ var a=seenGet(k); if(a.indexOf(i)<0){ a.push(i); localStorage.setItem('certlab_bs_seen_'+k, JSON.stringify(a)); } }catch(_){} }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\u2460-\u2469]/g, function(c){ return (c.charCodeAt(0)-0x245F)+'.'; }); }   // 원 문자 ①② 는 「1.」「2.」로
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
      /* 「🧱 기초학습 · 연재 이름」 칩 줄은 뺐다 — 위 고정 머리줄과 같은 말이고 폰에서 그 밑에 깔려 반쯤 잘렸다(크리스) */
      +'<div class="lcard'+(c.soon?' bs-soon-card':'')+'">'+storyHTML(c)
      /* 이전·다음은 문제 풀이 아래 단추(mbtn-prev · mbtn-next) 꼴 그대로 한 줄에 같은 크기 — 첫 장의 이전은 흐리게 두어 자리를 지킨다(크리스) */
      +'<div class="bs-pn"><button type="button" class="mbtn mbtn-prev" onclick="bsGo(-1)"'+(BS.idx>0?'':' disabled')+'>← 이전</button>'
      +(c.quiz&&c.quiz.length?'<button type="button" class="mbtn mbtn-next" onclick="bsQuizStart()">이 화 문제 '+c.quiz.length+'개 →</button>':last?'<button type="button" class="mbtn mbtn-next" onclick="bsLevelUp()">레벨업 1단계 풀기 →</button>':'<button type="button" class="mbtn mbtn-next" onclick="bsGo(1)">다음 →</button>')+'</div></div>';
  };
  window.bsGo=function(d){ var n=(D[BS.key]||{cards:[]}).cards.length; var i=BS.idx+d; if(i<0||i>=n) return; BS.idx=i; renderMCQ(); window.scrollTo(0,0); };
  window.bsClose=function(){ BS={sub:'', key:'', idx:0}; mqScreen='home'; renderMCQ(); window.scrollTo(0,0); };   // 오른쪽 위 X — 기초학습을 닫고 시험 홈으로
  window.bsDone=function(){ var sub=BS.sub; BS={sub:'', key:'', idx:0}; if(sub) mqOpen[sub]=true; mqScreen='home'; renderMCQ(); window.scrollTo(0,0); };   // 끝 → 그 과목 기출 목록을 펼친 시험 홈
  /* 한 화 끝 → 그 화 개념이 나오는 레벨업 1단계 문제 1~2개(크리스). 문제는 adaptive/…__variantq 의 diff 1(AD_DATA variantPool · 읽기만).
     지금 문제 풀이 화면(renderMcqExam) 그대로 그리고, 보기를 고르면 정답·해설을 편다. 화 문제는 맛보기라 복습 기록·레벨·푼 수는 건드리지 않는다 */
  var BQ=null;   // {key, sub, ep, list, idx}
  function bqFind(cert, ids){ var out=[]; var bank=MAP[cert]?Object.keys(MAP[cert]):[];
    ids.forEach(function(id){ var got=null; ['appraiser|econ','appraiser|civil'].concat(bank.map(function(s){ return cert+'|'+s; })).some(function(k){ var b=(typeof AD_DATA!=='undefined')&&AD_DATA[k]; var v=b&&b.variantPool&&b.variantPool.filter(function(x){ return x&&x.id===id; })[0]; if(v){ got=v; return true; } return false; }); if(got) out.push(got); });
    return out; }
  window.bsQuizStart=function(){ var c=D[BS.key].cards[BS.idx]; var list=bqFind(mqCert, c.quiz||[]);
    if(!list.length){ if(typeof _luToast==='function') _luToast('문제를 불러오지 못해 다음 화로 넘어가요'); bsGo(1); return; }
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
      +'<button class="mbtn mbtn-next" onclick="bsQuizGo(1)"'+(ans?'':' disabled')+'>'+(lastQ?(BQ.ep>=deck.cards.length-1?'레벨업 1단계 풀기 →':'다음 화 →'):'다음 문제 →')+'</button>';
  };
  window.bsQuizGo=function(d){ if(!BQ) return; var i=BQ.idx+d;
    if(i<0){ bsQuizBack(); return; }
    if(i>=BQ.list.length){ var ep=BQ.ep; BQ=null; mqList=null; if(ep>=D[BS.key].cards.length-1){ bsLevelUp(); return; } BS.idx=ep+1; mqScreen='basics'; renderMCQ(); window.scrollTo(0,0); return; }   // 마지막 화 문제 뒤에는 그 과목 레벨업 1단계로
    BQ.idx=i; renderMCQ(); window.scrollTo(0,0); };
  window.bsQuizBack=function(){ BQ=null; mqList=null; mqScreen='basics'; renderMCQ(); window.scrollTo(0,0); };
  /* 기초학습 화 문제 화면에서는 고르기·해설·찍음이 화면만 바꾼다(복습 기록·레벨·푼 수 저장 없음) */
  ['mqPick','mqToggleExp','mqToggleGuess'].forEach(function(fn){ if(typeof window[fn]!=='function') return; var orig=window[fn];
    window[fn]=function(qid,n){ if(mqScreen!=='bsquiz') return orig.apply(this, arguments);
      if(fn==='mqPick'){ mqAns[qid]=n; mqShow[qid]=true; } else if(fn==='mqToggleExp'){ mqShow[qid]=!mqShow[qid]; } else { mqGuess[qid]=!mqGuess[qid]; }
      renderMCQ(); }; });
  /* 기초학습 끝 → 그 과목 레벨업(크리스 「기초학습 끝나면 레벨업 1단계 풀라고 하면 되나」)
     · 이미 레벨이 있으면(레벨테스트 끝) 지금 레벨로 그 과목 레벨업을 이어서
     · 레벨테스트 전이면 그 과목만 Lv1(점수 10)으로 정하고 레벨테스트 관문을 한 번만 건너 바로 그 과목 레벨업. 다른 과목·레벨테스트는 그대로(나중에 볼 수 있음)
     · Lv1 시드는 eloState 에 넣고 저장은 원래 레벨 저장 흐름(로그인이면 saveUserData)을 따른다 */
  var BS_SERVER_OK=true;   // 2026-11-24 크리스 라이브 배포 — 로그인 사용자 Lv1 도 원래 레벨 저장(saveUserData)으로 간다
  window.bsLevelUp=function(){
    var sub=BS.sub, cert=mqCert; if(!sub) return;
    var seeded=(typeof ltDone==='function') && !ltDone(cert);
    if(seeded && typeof currentUser!=='undefined' && currentUser && !BS_SERVER_OK){
      return; }
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
  function hjWrap(el){ if(!el) return; var re=/[\u3400-\u9FFF\uF900-\uFAFF]+/g, w=document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), list=[], t;
    while((t=w.nextNode())){ var pe=t.parentNode; if(!pe || pe.closest('svg,script,style,.hj')) continue; re.lastIndex=0; if(re.test(t.nodeValue)) list.push(t); }
    list.forEach(function(tn){ var f=document.createDocumentFragment(), v=tn.nodeValue, last=0; v.replace(re, function(m, i){ if(i>last) f.appendChild(document.createTextNode(v.slice(last,i))); var sp=document.createElement('span'); sp.className='hj'; sp.textContent=m; f.appendChild(sp); last=i+m.length; return m; });
      if(last<v.length) f.appendChild(document.createTextNode(v.slice(last))); tn.parentNode.replaceChild(f, tn); }); }
  (function(){ var root=document.getElementById('mcqRoot'); if(!root||typeof MutationObserver==='undefined') return; var busy=false;
    new MutationObserver(function(){ if(busy) return; busy=true; requestAnimationFrame(function(){
      try{ if(typeof mqScreen!=='undefined' && (mqScreen==='basics' || mqScreen==='bsquiz')) hjWrap(root); else root.querySelectorAll('.bs-story').forEach(hjWrap); }catch(_){} busy=false; }); }).observe(root,{childList:true,subtree:true}); })();
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


  // 바로가기 주소 — ?basics=econ | civil | q (로그인 없이)
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
