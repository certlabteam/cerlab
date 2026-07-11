/* ============================================================================
 * CertLab 인터랙티브 template : T3_income_elasticity
 * ----------------------------------------------------------------------------
 * 두 재화 소득탄력성의 관계 — 소득 슬라이더로 필수재/사치재 분화와
 * "지출가중 소득탄력성 평균 = 1" 항등식을 보여준다.
 *
 * 엔진 연동 규약 (T1_curve_slider·T5_inventory_flow와 동일 계열):
 *   - 데이터방(마스터)은 params(JSON)만 공급한다.
 *   - 화면방(엔진)은 template 이름으로 이 렌더러를 dispatch 한다.
 *   - 호출부:  CertLabITV.T3_income_elasticity(mountEl, params)
 *     · mountEl : 이 인터랙티브를 그려 넣을 빈 DOM 엘리먼트
 *     · params  : 아래 PARAMS 스키마 객체(마스터의 params 필드 그대로)
 *   - 프레임워크 비의존(순수 DOM). 자기 스타일을 scoped class(clx-*)로 주입.
 *   - localStorage 등 브라우저 저장소 미사용.
 *
 * PARAMS 스키마
 * {
 *   "goodX": { "name":"재화 X", "a":20, "b":0.4, "color":"#E08A1E" },  // 지출 E_x = a + b·M (0<b<1, a>0 → 필수재)
 *   "goodY": { "name":"재화 Y", "color":"#1F9D57" },                    // 지출 E_y = M − E_x (나머지 → 사치재)
 *   "income": { "min":40, "max":200, "step":1, "default":120, "label":"소득", "unit":"원" },
 *   "price": 1,                                                          // 두 재화 가격(수요=지출/가격). 표시용.
 *   "intro": "…설명…",
 *   "terms": [ { "t":"필수재 (0 < 소득탄력성 < 1)", "d":"…", "color":"#2563EB" }, … ]
 * }
 *  ※ a>0, 0<b<1, income.min > a/(1-b) 이어야 E_y>0 (엔진에서 가드 권장).
 * ========================================================================== */
(function (root) {
  function T3_income_elasticity(mount, params) {
    var p = params || {};
    var X = p.goodX || { name: '재화 X', a: 20, b: 0.4, color: '#E08A1E' };
    var Y = p.goodY || { name: '재화 Y', color: '#1F9D57' };
    var INC = p.income || { min: 40, max: 200, step: 1, default: 120, label: '소득', unit: '원' };
    var A = +X.a, B = +X.b, PRICE = p.price || 1;
    var CX = X.color || '#E08A1E', CY = Y.color || '#1F9D57';
    var Mmin = +INC.min, Mmax = +INC.max, unit = INC.unit || '';
    var terms = p.terms || [
      { t: '필수재 (0 < 소득탄력성 < 1)', d: '소득이 늘어도 수요는 덜 늘어, 지출 비중이 점점 줄어드는 재화.', color: '#2563EB' },
      { t: '사치재 (소득탄력성 > 1)', d: '소득이 늘면 수요가 더 크게 늘어, 지출 비중이 점점 커지는 재화.', color: '#B91C1C' },
      { t: '열등재 (소득탄력성 < 0)', d: '소득이 늘면 오히려 수요가 주는 재화(이 예시엔 없음, 참고용).', color: '#7C3AED' }
    ];
    var intro = p.intro || ('소득을 두 재화 ' + X.name + '·' + Y.name + '에 모두 쓴다고 하자. 소득이 늘 때 한쪽 지출 비중은 줄고 다른 쪽은 는다. 그래서 지출 비중으로 가중한 두 소득탄력성의 평균은 항상 1이 된다 — 한 재화가 사치재면 다른 하나는 필수재일 수밖에 없다.');

    // ---- 스타일 1회 주입 ----
    var SID = 'clx-t3-style';
    if (!document.getElementById(SID)) {
      var st = document.createElement('style'); st.id = SID;
      st.textContent =
        '.clx-t3{font-family:"Noto Sans KR","Noto Sans CJK KR",system-ui,sans-serif;color:#1E293B;line-height:1.55;max-width:640px}' +
        '.clx-t3 .lead{font-size:13px;color:#64748B;margin:0 0 14px}' +
        '.clx-t3 h3{font-size:19px;margin:0 0 4px}' +
        '.clx-t3 .intro{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;font-size:13px;margin-bottom:16px}' +
        '.clx-t3 .chart{border:1px solid #E2E8F0;border-radius:12px;padding:10px 6px 4px;background:#fff}' +
        '.clx-t3 .ctrl{display:flex;align-items:center;gap:12px;margin:14px 2px 6px}' +
        '.clx-t3 .ctrl label{font-size:13px;font-weight:700;white-space:nowrap}' +
        '.clx-t3 .ctrl input[type=range]{flex:1;accent-color:#334155;height:4px}' +
        '.clx-t3 .mval{font-variant-numeric:tabular-nums;font-weight:700;font-size:14px;min-width:96px;text-align:right}' +
        '.clx-t3 .avg{text-align:center;background:#0F172A;color:#fff;border-radius:12px;padding:10px;font-size:14px;margin:4px 0 14px}' +
        '.clx-t3 .avg b{font-size:18px;font-variant-numeric:tabular-nums}' +
        '.clx-t3 .avg .eq{font-size:12px;opacity:.8;display:block;margin-top:2px}' +
        '.clx-t3 .cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}' +
        '.clx-t3 .card{border:1px solid #E2E8F0;border-radius:12px;padding:11px 13px}' +
        '.clx-t3 .card .nm{font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px}' +
        '.clx-t3 .dot{width:10px;height:10px;border-radius:50%;display:inline-block}' +
        '.clx-t3 .row{display:flex;justify-content:space-between;font-size:12.5px;margin-top:6px;color:#64748B}' +
        '.clx-t3 .row b{color:#1E293B;font-variant-numeric:tabular-nums}' +
        '.clx-t3 .tag{display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;color:#fff;margin-top:8px}' +
        '.clx-t3 .insight{border-left:4px solid #0F172A;background:#F8FAFC;padding:10px 14px;border-radius:0 10px 10px 0;font-size:13px;margin-bottom:14px}' +
        '.clx-t3 .terms{font-size:12.5px}.clx-t3 .terms .t{font-weight:800;margin-top:8px}.clx-t3 .terms .d{color:#64748B}';
      document.head.appendChild(st);
    }

    // ---- 마크업 ----
    mount.innerHTML =
      '<div class="clx-t3">' +
        '<p class="lead">' + (INC.label || '소득') + ' 슬라이더를 움직여 두 재화의 수요·소득탄력성이 어떻게 갈리는지 보세요.</p>' +
        '<div class="intro">' + intro + '</div>' +
        '<div class="chart"><svg class="clx-svg" viewBox="0 0 600 320" width="100%" font-family="Noto Sans KR, sans-serif"></svg></div>' +
        '<div class="ctrl"><label>' + (INC.label || '소득') + '</label>' +
          '<input type="range" class="clx-m" min="' + Mmin + '" max="' + Mmax + '" step="' + (INC.step || 1) + '" value="' + (INC.default || Mmin) + '">' +
          '<span class="mval"><span class="clx-mv"></span>' + unit + '</span></div>' +
        '<div class="avg">지출가중 소득탄력성 평균 = <b class="clx-avg"></b>' +
          '<span class="eq">s<sub>X</sub>·e<sub>X</sub> + s<sub>Y</sub>·e<sub>Y</sub> = 1 (예산을 다 쓰면 성립하는 항등식)</span></div>' +
        '<div class="cards">' +
          '<div class="card"><div class="nm"><span class="dot" style="background:' + CX + '"></span>' + X.name + '</div>' +
            '<div class="row"><span>지출액(수요)</span><b class="clx-ex"></b></div>' +
            '<div class="row"><span>지출 비중 s<sub>X</sub></span><b class="clx-sx"></b></div>' +
            '<div class="row"><span>소득탄력성 e<sub>X</sub></span><b class="clx-exel"></b></div>' +
            '<div><span class="tag clx-xtag"></span></div></div>' +
          '<div class="card"><div class="nm"><span class="dot" style="background:' + CY + '"></span>' + Y.name + '</div>' +
            '<div class="row"><span>지출액(수요)</span><b class="clx-ey"></b></div>' +
            '<div class="row"><span>지출 비중 s<sub>Y</sub></span><b class="clx-sy"></b></div>' +
            '<div class="row"><span>소득탄력성 e<sub>Y</sub></span><b class="clx-eyel"></b></div>' +
            '<div><span class="tag clx-ytag"></span></div></div>' +
        '</div>' +
        '<div class="insight clx-insight"></div>' +
        '<div class="terms">' + terms.map(function (t) {
          return '<div class="t" style="color:' + (t.color || '#1E293B') + '">' + t.t + '</div><div class="d">' + t.d + '</div>';
        }).join('') + '</div>' +
      '</div>';

    var $ = function (c) { return mount.querySelector('.' + c); };
    var svg = $('clx-svg');

    // ---- 좌표계 ----
    var PL = 54, PR = 560, PT = 24, PB = 270;
    var xOf = function (M) { return PL + (M - Mmin) / (Mmax - Mmin) * (PR - PL); };
    var yMaxV = Mmax * 0.7;                 // 지출 상한(대략) — E_x,E_y 최대 근처
    var yOf = function (v) { return PB - Math.max(0, Math.min(yMaxV, v)) / yMaxV * (PB - PT); };

    function calc(M) {
      var Ex = A + B * M, Ey = M - Ex;
      var ex = (B * M) / Ex, ey = ((1 - B) * M) / Ey;
      var sx = Ex / M, sy = Ey / M;
      return { M: M, Ex: Ex, Ey: Ey, ex: ex, ey: ey, sx: sx, sy: sy, avg: sx * ex + sy * ey };
    }
    function curve(fn) { var a = []; for (var M = Mmin; M <= Mmax; M += 2) { a.push(xOf(M).toFixed(1) + ',' + yOf(fn(calc(M))).toFixed(1)); } return a.join(' '); }
    function el(tag, at, tx) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (var k in at) e.setAttribute(k, at[k]); if (tx != null) e.textContent = tx; return e; }
    function cls(e) { if (e < 0) return { t: '열등재', c: '#7C3AED' }; if (e < 1) return { t: '필수재', c: '#2563EB' }; return { t: '사치재', c: '#B91C1C' }; }
    function f2(x) { return x.toFixed(2); }

    var dyn = {};
    (function drawStatic() {
      svg.appendChild(el('line', { x1: PL, y1: PB, x2: PR, y2: PB, stroke: '#94A3B8', 'stroke-width': 1.4 }));
      svg.appendChild(el('line', { x1: PL, y1: PB, x2: PL, y2: PT, stroke: '#94A3B8', 'stroke-width': 1.4 }));
      svg.appendChild(el('text', { x: PR, y: PB + 18, 'font-size': 11, fill: '#64748B', 'text-anchor': 'end' }, (INC.label || '소득') + '(' + unit + ') →'));
      svg.appendChild(el('text', { x: PL - 6, y: PT + 2, 'font-size': 11, fill: '#64748B', 'text-anchor': 'end' }, '지출액'));
      svg.appendChild(el('polyline', { points: curve(function (r) { return r.Ex; }), fill: 'none', stroke: CX, 'stroke-width': 2.4 }));
      svg.appendChild(el('polyline', { points: curve(function (r) { return r.Ey; }), fill: 'none', stroke: CY, 'stroke-width': 2.4 }));
      var lm = Mmin + (Mmax - Mmin) * 0.15;   // 라벨은 곡선 간격이 큰 왼쪽에
      svg.appendChild(el('text', { x: xOf(lm) + 4, y: yOf(calc(lm).Ex) - 8, 'font-size': 11.5, fill: CX, 'text-anchor': 'start', 'font-weight': 700 }, X.name + ' 필수재'));
      svg.appendChild(el('text', { x: xOf(lm) + 4, y: yOf(calc(lm).Ey) + 16, 'font-size': 11.5, fill: CY, 'text-anchor': 'start', 'font-weight': 700 }, Y.name + ' 사치재'));
      dyn.vline = el('line', { stroke: '#1E293B', 'stroke-dasharray': '3 3', 'stroke-width': 1 }); svg.appendChild(dyn.vline);
      dyn.px = el('circle', { r: 5, fill: CX, stroke: '#fff', 'stroke-width': 1.5 }); svg.appendChild(dyn.px);
      dyn.py = el('circle', { r: 5, fill: CY, stroke: '#fff', 'stroke-width': 1.5 }); svg.appendChild(dyn.py);
      dyn.mlab = el('text', { 'font-size': 10.5, fill: '#1E293B', 'text-anchor': 'middle', 'font-weight': 700 }); svg.appendChild(dyn.mlab);
    })();

    function render(M) {
      var r = calc(M);
      $('clx-mv').textContent = M;
      $('clx-ex').textContent = r.Ex.toFixed(0) + unit; $('clx-ey').textContent = r.Ey.toFixed(0) + unit;
      $('clx-sx').textContent = f2(r.sx); $('clx-sy').textContent = f2(r.sy);
      $('clx-exel').textContent = f2(r.ex); $('clx-eyel').textContent = f2(r.ey);
      $('clx-avg').textContent = r.avg.toFixed(2);
      var cx = cls(r.ex), cy = cls(r.ey);
      var xt = $('clx-xtag'); xt.textContent = cx.t; xt.style.background = cx.c;
      var yt = $('clx-ytag'); yt.textContent = cy.t; yt.style.background = cy.c;
      $('clx-insight').innerHTML =
        X.name + '는 소득탄력성 <b>' + f2(r.ex) + '</b>(' + cx.t + '), ' + Y.name + '는 <b>' + f2(r.ey) + '</b>(' + cy.t + '). ' +
        '비중으로 가중하면 <b>' + f2(r.sx) + '×' + f2(r.ex) + ' + ' + f2(r.sy) + '×' + f2(r.ey) + ' = ' + r.avg.toFixed(2) + '</b>. 둘 다 사치재이거나 둘 다 필수재일 수는 없다.';
      var Xp = xOf(M);
      dyn.vline.setAttribute('x1', Xp); dyn.vline.setAttribute('x2', Xp); dyn.vline.setAttribute('y1', PT); dyn.vline.setAttribute('y2', PB);
      dyn.px.setAttribute('cx', Xp); dyn.px.setAttribute('cy', yOf(r.Ex));
      dyn.py.setAttribute('cx', Xp); dyn.py.setAttribute('cy', yOf(r.Ey));
      dyn.mlab.setAttribute('x', Xp); dyn.mlab.setAttribute('y', PB + 18); dyn.mlab.textContent = 'M=' + M;
    }
    var sl = $('clx-m');
    sl.addEventListener('input', function () { render(+sl.value); });
    render(+sl.value);
  }

  // 엔진 레지스트리에 등록 (T1/T2/T5와 같은 네임스페이스라면 여기에 맞춰 조정)
  root.CertLabITV = root.CertLabITV || {};
  root.CertLabITV.T3_income_elasticity = T3_income_elasticity;
  if (typeof module !== 'undefined' && module.exports) module.exports = T3_income_elasticity;
})(typeof window !== 'undefined' ? window : this);
