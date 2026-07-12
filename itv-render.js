/* ============================================================
   CertLab 인터랙티브(itv) 엔진 — index.html · preview.html 공유 모듈
   슬라이더·애니메이션형 인터랙티브 마스터 렌더. 템플릿 화이트리스트만 실행(임의 JS 없음).
   전역 노출: itvBlockHTML(q) · itvResolve · itvRenderOne · itvUpdate(instId,val) · loadInteractives
   등록 템플릿: T1_curve_slider · T5_inventory_flow · T2_timeline · T_risk_return · T_duration
   ============================================================ */
/* ===== 인터랙티브 마스터(interactives / itv) — grp 패턴 복제, 별도 마스터 =====
   - 저장: Firestore 'interactives', id upsert(grp 동형). 삭제는 admin 행별 버튼.
   - 참조: 문항 exp.itv ("itv://id" / 인라인 객체 / 배열). 개념 뒤 블록.
   - 보안: 템플릿 화이트리스트(_itvTemplates)만 렌더, 임의 JS 실행 없음. params=데이터만.
   - 계산: 엔진 고정 로직. 현재 템플릿: T1_curve_slider(경제 곡선), T5_inventory_flow(재고 원가흐름).
*/
var _itvCache={}, _itvPromise=null, _itvLoaded=false;
function loadInteractives(){
  if(_itvPromise) return _itvPromise;
  _itvPromise=(async function(){
    try{ var snap=await db.collection('interactives').get(); snap.forEach(function(d){ _itvCache[d.id]=d.data()||{}; }); }catch(e){}
    _itvLoaded=true;
  })();
  return _itvPromise;
}

/* ---- 자체 CSS 1회 주입 (style.css 비의존) ---- */
function itvEnsureCSS(){
  if(document.getElementById('itv-css')) return;
  var s=document.createElement('style'); s.id='itv-css';
  s.textContent=[
    /* 공통 */
    '.itv-box{border:1px solid #E2E8F0;border-radius:12px;padding:14px;margin:10px 0;font-size:13px;line-height:1.6;color:#0F172A;max-width:100%;min-width:0}',
    '.itv-ti{font-weight:800;font-size:14px;margin-bottom:8px}',
    '.itv-def{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:11px;font-size:12.5px;color:#334155;margin:0 0 10px}',
    '.itv-def b{color:#0F172A}.itv-def .term{display:block;margin:3px 0}',
    '.itv-defd{margin:0 0 10px}.itv-defd summary{font-size:12px;color:#64748B;cursor:pointer;font-weight:700}',
    '.itv-story{font-size:12.5px;margin:0 0 12px;color:#334155}',
    '.itv-ctrl{display:flex;align-items:center;gap:10px;margin:6px 0 2px}',
    '.itv-ctrl label{font-size:13px;font-weight:700;white-space:nowrap}',
    '.itv-ctrl input[type=range]{flex:1;accent-color:#C0392B;height:30px}',
    '.itv-rate{font-size:18px;font-weight:800;color:#C0392B;min-width:54px;text-align:right;font-variant-numeric:tabular-nums}',
    '.itv-hint{font-size:11px;color:#64748B;margin:2px 0 0}',
    '.itv-say{margin:13px 0 6px;padding:13px;border-radius:10px;background:#FFF7F5;border:1px solid #F3D6CF;font-size:14px;line-height:1.65}',
    '.itv-say .h{font-weight:800;margin-bottom:4px}.itv-say .w{color:#334155;font-size:13px}',
    '.itv-k{color:#C0392B;font-weight:700}',
    '.itv-tip{font-size:12px;color:#334155;background:#F8FAFC;border:1px dashed #E2E8F0;border-radius:8px;padding:9px;margin:8px 0 2px;min-height:18px}.itv-tip b{color:#0F172A}',
    /* T1 막대(NPV) */
    '.itv-t1bar{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:12px}',
    '.itv-t1bar .lab{width:86px;flex:none;font-weight:700}',
    '.itv-t1track{flex:1;height:22px;background:#F1F5F9;border-radius:6px;position:relative;overflow:hidden}',
    '.itv-t1track .mid{position:absolute;top:0;bottom:0;left:50%;width:1px;background:#94A3B8}',
    '.itv-t1fill{position:absolute;top:0;bottom:0;border-radius:6px;transition:all .08s linear}.itv-t1fill.neg{opacity:.55}',
    '.itv-bv{width:84px;flex:none;text-align:right;font-weight:800;font-variant-numeric:tabular-nums}',
    '.itv-det{margin-top:12px;border-top:1px solid #E2E8F0;padding-top:10px}.itv-det summary{font-size:12.5px;color:#64748B;cursor:pointer}',
    '.itv-det svg{width:100%;height:auto;display:block;margin-top:8px}',
    '.itv-legend{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;font-size:11px;color:#334155;margin-top:6px}',
    '.itv-legend i{display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:middle;margin-right:5px}',
    /* T5 막대(재고) */
    '.itv-mb{margin:14px 0 4px}.itv-mb .mh{font-size:13px;font-weight:800;margin-bottom:5px}',
    '.itv-mb.fifo .mh{color:#3B82F6}.itv-mb.wavg .mh{color:#10A37F}',
    '.itv-caps{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:3px}',
    '.itv-caps .cl{color:#0F172A}.itv-caps .cr{color:#64748B}.itv-caps .amt{font-weight:800}',
    '.itv-bar{position:relative;height:38px;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;background:#fff;user-select:none}',
    '.itv-seg{position:absolute;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;color:#334155;border-right:1px solid #9AAEC6;cursor:pointer;overflow:hidden;text-align:center;line-height:1.12;padding:0 1px}',
    '.itv-mb .itv-bar .itv-seg:last-of-type{border-right:none}',
    '.itv-bound{position:absolute;top:0;bottom:0;width:0;border-left:1.5px dashed #5B6B82;pointer-events:none;z-index:2}',
    '.itv-seg .sl{font-weight:800;color:#1f2d3d}.itv-seg .sq{font-weight:700}.itv-seg .sp{font-size:9px;color:#64748B;font-weight:600}',
    '.itv-mb.fifo .itv-seg{background:#E7F0FB}.itv-mb.wavg .itv-seg{background:#E6F4EF}',
    '.itv-kept{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(45deg,rgba(148,163,184,.20),rgba(148,163,184,.20) 5px,rgba(148,163,184,.32) 5px,rgba(148,163,184,.32) 10px);transition:left .3s ease,width .3s ease;pointer-events:none}',
    '.itv-div{position:absolute;top:-2px;bottom:-2px;width:2px;background:#C0392B;transition:left .3s ease;pointer-events:none}',
    '.itv-div:after{content:"";position:absolute;left:-4px;top:50%;width:10px;height:10px;margin-top:-5px;background:#C0392B;border-radius:50%}',
    '.itv-cmp{width:100%;border-collapse:collapse;font-size:12.5px;margin:12px 0 4px;table-layout:fixed}',
    '.itv-cmp th,.itv-cmp td{border-bottom:1px solid #E2E8F0;padding:7px 4px;text-align:right;vertical-align:top;word-break:keep-all}',
    '.itv-cmp th:first-child,.itv-cmp td:first-child{text-align:left}',
    '.itv-cmp thead th{color:#64748B;font-weight:700;font-size:11.5px}',
    '.itv-cmp tbody td{color:#0F172A;font-weight:800}.itv-cmp tbody td:first-child{font-weight:600;color:#64748B}',
    '.itv-cmp tbody tr.rfifo td:first-child{box-shadow:inset 3px 0 0 #3B82F6;padding-left:8px}',
    '.itv-cmp tbody tr.rwavg td:first-child{box-shadow:inset 3px 0 0 #10A37F;padding-left:8px}',
    '.itv-cmp .diff td{color:#C0392B;font-weight:700;border-bottom:none;font-size:11.5px}',
    '.itv-mlegend{font-size:11px;color:#64748B;text-align:center;margin:4px 0 0}',
    '.itv-tl-era{font-size:12px;font-weight:700;color:#334155;margin:2px 0 6px}',
    '.itv-tl-scroll{display:block;width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;border:1px solid #F1F5F9;border-radius:8px;background:#fff}',
    '.itv-tl-track{position:relative}',
    '.itv-tl-line{position:absolute;top:14px;left:0;right:0;height:2px;background:#CBD5E1}',
    '.itv-tl-band{position:absolute;top:11px;height:8px;background:#EEF2F7}.itv-tl-band.alt{background:#E2E8F0}',
    '.itv-tl-plab{position:absolute;top:26px;font-size:9px;color:#64748B;transform:translateX(-50%);white-space:nowrap}',
    '.itv-tl-dot{position:absolute;top:9px;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #94A3B8;transform:translateX(-50%);cursor:pointer;z-index:2;transition:all .15s}',
    '.itv-tl-dot.on{background:#C0392B;border-color:#C0392B;width:16px;height:16px;top:7px}',
    '.itv-tl-tip{position:absolute;bottom:150%;left:50%;transform:translateX(-50%);white-space:nowrap;background:#0F172A;color:#fff;font-size:10px;font-weight:600;padding:3px 7px;border-radius:6px;opacity:0;visibility:hidden;transition:opacity .12s;pointer-events:none;z-index:9;box-shadow:0 2px 6px rgba(0,0,0,.18)}',
    '.itv-tl-tip:after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:#0F172A}',
    '.itv-tl-dot:hover .itv-tl-tip{opacity:1;visibility:visible}',
    '.itv-tl-dot:hover{border-color:#C0392B;z-index:8}',
    '.itv-tl-nav{flex:none;width:34px;height:30px;border:1px solid #E2E8F0;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;color:#334155}',
    '.itv-tl-top{position:sticky;top:0;z-index:5;background:#fff;padding:6px 0 5px;border-bottom:1px solid #EEF2F7}',
    '.itv-tl-cur{font-size:11px;color:#C0392B;font-weight:700;margin-top:4px;text-align:center}',
    '.itv-tl-list{margin-top:10px;max-height:60vh;overflow-y:auto;overscroll-behavior:contain;padding-right:2px}',
    '.itv-tl-tip{display:none}',
    '.itv-ev{border:1px solid #E2E8F0;border-left:3px solid #E2E8F0;border-radius:10px;padding:11px 12px;margin:8px 0;background:#fff;scroll-margin-top:100px;transition:border-color .2s,background .2s}',
    '.itv-ev.on{border-left-color:#C0392B;background:#FFF7F5}',
    '.itv-ev .evy{font-size:12px;color:#64748B}.itv-ev .evy b{color:#C0392B;font-size:15px}',
    '.itv-ev .evt{font-size:14px;font-weight:800;margin:3px 0 5px}',
    '.itv-ev .evs{font-size:13px;color:#334155;line-height:1.6}',
    '.itv-ev .evk{font-size:12px;color:#C0392B;font-weight:700;margin-top:6px}',
    '.itv-ev .evr{margin-top:6px}.itv-ev .evr .rftag{font-size:11px;color:#64748B;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:2px 7px}',
    /* T_risk_return · T_duration */
    '.itv-svg{width:100%;height:auto;display:block;margin:6px 0}',
    '.itv-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}',
    '.itv-card{border:1px solid #E2E8F0;border-radius:12px;padding:11px 13px;text-align:center;background:#fff}',
    '.itv-card .t{font-size:12px;color:#64748B}.itv-card .v{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:3px;color:#0F172A}',
    '.itv-btns{display:flex;gap:8px;margin:10px 0}',
    '.itv-btns button{flex:1;padding:8px;border:1px solid #CBD5E1;border-radius:9px;background:#fff;font-size:12.5px;font-weight:700;cursor:pointer;color:#475569}',
    '.itv-btns button.on{background:#0F172A;color:#fff;border-color:#0F172A}',
    '.itv-dur{text-align:center;background:#0F172A;color:#fff;border-radius:12px;padding:9px;font-size:14px;margin:6px 0 12px}.itv-dur b{font-size:19px;font-variant-numeric:tabular-nums}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ---- 공통 helper ---- */
function _itvEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _itvWon(x){ return '\u20A9'+Math.round(x).toLocaleString(); }
function _itvNum(x){ return (x>=0?'+':'\u2212')+Math.abs(x).toLocaleString(undefined,{maximumFractionDigits:0}); }
/* T1 계산 */
function _itvNPV(cf,r){ var s=0; for(var t=0;t<cf.length;t++) s+=cf[t]/Math.pow(1+r,t); return s; }
function _itvIRR(cf){ var lo=-0.9,hi=5,flo=_itvNPV(cf,lo); for(var i=0;i<90;i++){var m=(lo+hi)/2,fm=_itvNPV(cf,m); if(flo*fm<=0)hi=m; else {lo=m;flo=fm;}} return (lo+hi)/2; }
function _itvCross(a,b){ function f(r){return _itvNPV(a,r)-_itvNPV(b,r);} var lo=-0.9,hi=5,flo=f(lo); for(var i=0;i<90;i++){var m=(lo+hi)/2,fm=f(m); if(flo*fm<=0)hi=m; else {lo=m;flo=fm;}} return (lo+hi)/2; }
/* T5 계산 */
function _itvInvAgg(layers){ var Q=0,C=0; layers.forEach(function(l){Q+=l.qty;C+=l.qty*l.cost;}); return {Q:Q,C:C,avg:Q?C/Q:0}; }
function _itvFifoCogs(layers,s){ var rem=s,cg=0; for(var i=0;i<layers.length;i++){ var t=Math.min(layers[i].qty,rem); rem-=t; cg+=t*layers[i].cost; } return cg; }

/* ---- 인스턴스 레지스트리 + 디스패처 ---- */
window._itvReg=window._itvReg||{}; var _itvSeq=0;
function itvUpdate(instId, rawVal){
  var P=window._itvReg[instId]; if(!P) return;
  var fn=_itvUpdaters[P.template]; if(fn){ try{ fn(instId, rawVal, P); }catch(e){} }
}
/* T5 상자 탭 → 해당 인스턴스 tip 갱신 */
function itvTap(instId, qty, cost, label, avg){
  var t=document.getElementById(instId+'_tip'); if(!t) return;
  if(avg) t.innerHTML='<b>가중평균</b>: 전체를 평균단가 <b>'+_itvWon(cost)+'</b>로 섞음. 칸막이 왼쪽 '+qty+'개 \u00D7 '+_itvWon(cost)+' = <b>'+_itvWon(qty*cost)+'</b>.';
  else t.innerHTML='<b>'+_itvEsc(label)+'</b> '+qty+'개 \u00D7 개당 '+_itvWon(cost)+' = <b>'+_itvWon(qty*cost)+'</b>. (선입선출은 싼 것부터 팔린 걸로 침)';
}

/* ================= 업데이터 ================= */
var _itvUpdaters={
  T1_curve_slider:function(instId, rawVal, P){
    var rc=P.rate, div=(rc.divisor||1), r=parseFloat(rawVal)/div;
    var d=document.getElementById(instId); if(!d) return;
    var rv=d.querySelector('.itv-rate>span'); if(rv) rv.textContent=(rawVal*1).toFixed(rc.step<1?1:0);
    var series=P.series, vals=series.map(function(s){return _itvNPV(s.cashflows,r);});
    series.forEach(function(s,i){
      var f=d.querySelector('#'+instId+'_f'+i), bv=d.querySelector('#'+instId+'_v'+i);
      var v=vals[i], pct=Math.max(-48,Math.min(48, v/P.scale*48));
      if(f){ f.classList.toggle('neg', v<0); if(v>=0){ f.style.left='50%'; f.style.width=pct+'%'; } else { f.style.width=(-pct)+'%'; f.style.left=(50-(-pct))+'%'; } }
      if(bv){ bv.textContent=_itvNum(v)+(P.unit||''); bv.style.color=v>=0?'#0F172A':'#C0392B'; }
    });
    var say=d.querySelector('#'+instId+'_say'), why=d.querySelector('#'+instId+'_why');
    if(say && series.length===2){
      var a=vals[0],b=vals[1],A=series[0],B=series[1],rp=(r*100).toFixed(1)+'%';
      if(Math.abs(a-b)<Math.max(1,P.scale*0.002)){ say.innerHTML='지금은 <b>'+_itvEsc(A.name)+'와 '+_itvEsc(B.name)+'가 똑같다</b> (만나는 지점)';
        if(why) why.textContent='요구수익률 '+rp+'에서 둘의 남는 돈이 같아집니다. 이 점을 넘으면 순위가 뒤집혀요.'; }
      else if(a>b){ say.innerHTML='지금은 <b style="color:'+A.color+'">'+_itvEsc(A.name)+'</b>가 더 남는다';
        if(why) why.textContent=(b>=0)?'요구수익률 '+rp+'은 낮은 편 — 늦게 받는 '+A.name+'도 손해가 작아서 '+A.name+'가 더 많이 남습니다(둘 다 이득).':'요구수익률 '+rp+'에선 '+B.name+'는 손해, '+A.name+'는 이득. '+A.name+'가 낫습니다.'; }
      else { say.innerHTML='지금은 <b style="color:'+B.color+'">'+_itvEsc(B.name)+'</b>가 더 남는다';
        if(why){ if(a>=0) why.textContent='요구수익률 '+rp+'로 오르니 늦게 받는 '+A.name+'가 불리해져 '+B.name+'가 더 많이 남습니다(둘 다 이득).';
          else if(b>=0) why.innerHTML='요구수익률 '+rp+'에선 <b class="itv-k">'+A.name+'는 본전도 못 넘어 손해</b>, '+B.name+'는 이득.';
          else why.textContent='요구수익률 '+rp+'은 너무 높아 둘 다 손해. 그래도 '+B.name+'가 덜 손해입니다.'; } }
    }
    var g=P.geo;
    var rl=d.querySelector('#'+instId+'_rline'); if(rl){ rl.setAttribute('x1',g.X(r)); rl.setAttribute('x2',g.X(r)); }
    series.forEach(function(s,i){ var dot=d.querySelector('#'+instId+'_d'+i); if(dot){ dot.setAttribute('cx',g.X(r)); dot.setAttribute('cy',g.Y(vals[i])); } });
  },
  T5_inventory_flow:function(instId, rawVal, P){
    var s=parseInt(rawVal,10), Q=P.Q, C=P.C, avg=P.avg, sale=P.sale, layers=P.layers;
    var d=document.getElementById(instId); if(!d) return;
    var sv=d.querySelector('#'+instId+'_sv'); if(sv) sv.textContent=s;
    var pct=Q?s/Q*100:0;
    ['f','w'].forEach(function(p){
      var kept=d.querySelector('#'+instId+'_'+p+'_kept'), dv=d.querySelector('#'+instId+'_'+p+'_div');
      if(kept){ kept.style.left=pct+'%'; kept.style.width=(100-pct)+'%'; }
      if(dv){ dv.style.left=pct+'%'; }
    });
    var fcg=_itvFifoCogs(layers,s), fen=C-fcg, wcg=s*avg, wen=(Q-s)*avg, fgp=s*sale-fcg, wgp=s*sale-wcg;
    function set(id,v){ var el=d.querySelector('#'+instId+'_'+id); if(el) el.textContent=_itvWon(v); }
    set('f_cg',fcg); set('f_en',fen); set('w_cg',wcg); set('w_en',wen);
    set('t_fcg',fcg); set('t_fen',fen); set('t_fgp',fgp); set('t_wcg',wcg); set('t_wen',wen); set('t_wgp',wgp);
    function diff(id,a,b,word){ var el=d.querySelector('#'+instId+'_'+id); if(el) el.innerHTML=(a===b?'동일':((word(a,b))+'<br>'+_itvWon(Math.abs(a-b))+(id==='t_dcg'?' 적음':' 많음'))); }
    var dcg=d.querySelector('#'+instId+'_t_dcg'); if(dcg) dcg.innerHTML=(fcg<wcg?'선입선출':'가중평균')+'<br>'+_itvWon(Math.abs(fcg-wcg))+' 적음';
    var den=d.querySelector('#'+instId+'_t_den'); if(den) den.innerHTML=(fen>wen?'선입선출':'가중평균')+'<br>'+_itvWon(Math.abs(fen-wen))+' 많음';
    var dgp=d.querySelector('#'+instId+'_t_dgp'); if(dgp) dgp.innerHTML=(fgp>wgp?'선입선출':'가중평균')+'<br>'+_itvWon(Math.abs(fgp-wgp))+' 많음';
    var h=d.querySelector('#'+instId+'_sayH'), w=d.querySelector('#'+instId+'_sayW');
    if(h&&w){ if(s===0){ h.textContent='아직 안 팔았습니다'; w.textContent='판매수량을 올리면 칸막이가 오른쪽으로 가며 기말재고가 줄어듭니다.'; }
      else { h.innerHTML='같은 '+s+'개를 팔아도 — 선입선출 매출원가 '+_itvWon(fcg)+' vs 가중평균 '+_itvWon(wcg);
        w.innerHTML='물건값이 오르는 중이라, 선입선출은 <b>싼 것부터</b> 팔린 걸로 쳐 매출원가가 작고 <b class="itv-k">이익이 '+_itvWon(Math.abs(fgp-wgp))+' 더 큽니다</b>. 대신 비싼 게 남아 기말재고는 선입선출이 더 큽니다.'; } }
  }
};

/* ================= 템플릿(렌더) ================= */
var _itvTemplates={
  T1_curve_slider:function(it, instId){
    var p=it.params||{}; var rc=p.rate||{min:0,max:20,step:0.1,default:8,divisor:100,label:'요구수익률',unit:'%'};
    var series=(p.series||[]).map(function(s){return {key:s.key,name:s.name,color:s.color||'#2563EB',cashflows:s.cashflows||[]};});
    var unit=p.unit||'';
    var rMin=(rc.min||0)/(rc.divisor||1), rMax=(rc.max||20)/(rc.divisor||1);
    var maxAbs=0; series.forEach(function(s){ [rMin,(rMin+rMax)/2,rMax,0].forEach(function(r){ maxAbs=Math.max(maxAbs, Math.abs(_itvNPV(s.cashflows,r))); }); });
    var scale=maxAbs*1.05 || 100;
    var W=520,H=300,L=44,Rr=16,T=12,Bm=34, pw=W-L-Rr, ph=H-T-Bm, yMax=scale, yMin=-scale;
    function X(r){return L+(r-rMin)/(rMax-rMin)*pw;} function Y(v){return T+(yMax-v)/(yMax-yMin)*ph;}
    function curve(cf,col){var dd='',n=80;for(var i=0;i<=n;i++){var r=rMin+(rMax-rMin)*i/n;dd+=(i?'L':'M')+X(r).toFixed(1)+' '+Y(_itvNPV(cf,r)).toFixed(1)+' ';}return '<path d="'+dd.trim()+'" fill="none" stroke="'+col+'" stroke-width="2"/>';}
    window._itvReg[instId]={template:'T1_curve_slider', rate:rc, series:series, unit:unit, scale:scale, geo:{X:X,Y:Y}, defaultVal:rc.default};
    var defHTML=''; if(p.intro) defHTML+='<div class="itv-def">'+p.intro+'</div>';
    if(Array.isArray(p.terms)&&p.terms.length){ defHTML+='<div class="itv-def">'+p.terms.map(function(t){return '<span class="term"><b>'+_itvEsc(t.t)+'</b> — '+_itvEsc(t.d)+'</span>';}).join('')+'</div>'; }
    var storyHTML=(it.story||p.story)?'<div class="itv-story">'+(it.story||p.story)+'</div>':'';
    var ctrl='<div class="itv-ctrl"><label>'+_itvEsc(rc.label||'')+'</label>'
      +'<input type="range" min="'+rc.min+'" max="'+rc.max+'" step="'+rc.step+'" value="'+rc.default+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
      +'<div class="itv-rate"><span>'+Number(rc.default).toFixed(rc.step<1?1:0)+'</span>'+_itvEsc(rc.unit||'')+'</div></div>';
    var hint=rc.hint?'<p class="itv-hint">'+_itvEsc(rc.hint)+'</p>':'';
    var say='<div class="itv-say"><div class="h" id="'+instId+'_say">—</div><div class="w" id="'+instId+'_why">—</div></div>';
    var bars=series.map(function(s,i){ return '<div class="itv-t1bar"><span class="lab" style="color:'+s.color+'">'+_itvEsc(s.name)+'</span>'
      +'<div class="itv-t1track"><div class="mid"></div><div class="itv-t1fill" id="'+instId+'_f'+i+'" style="background:'+s.color+'"></div></div>'
      +'<span class="itv-bv" id="'+instId+'_v'+i+'">—</span></div>'; }).join('');
    var barNote='<p class="itv-hint" style="text-align:center">막대가 가운데 선보다 오른쪽 = 남는 장사 / 왼쪽(연한 색) = 손해</p>';
    var grid='<line x1="'+L+'" y1="'+Y(0)+'" x2="'+(W-Rr)+'" y2="'+Y(0)+'" stroke="#94A3B8"/>'
      +'<text x="'+(L-6)+'" y="'+(Y(0)+3)+'" text-anchor="end" font-size="9" fill="#64748B">0</text>';
    for(var ti=0;ti<=4;ti++){ var rr=rMin+(rMax-rMin)*ti/4; grid+='<text x="'+X(rr)+'" y="'+(H-18)+'" text-anchor="middle" font-size="9" fill="#94A3B8">'+(rr*(rc.divisor||1)).toFixed(0)+_itvEsc(rc.unit||'')+'</text>'; }
    if(!p.markers||p.markers.showIRR!==false){ series.forEach(function(s){ var irr=_itvIRR(s.cashflows); if(irr>=rMin&&irr<=rMax) grid+='<circle cx="'+X(irr)+'" cy="'+Y(0)+'" r="3.5" fill="'+s.color+'"/>'; }); }
    var crossNote='';
    if(series.length===2 && (!p.markers||p.markers.showCrossover!==false)){
      var cr=_itvCross(series[0].cashflows,series[1].cashflows);
      if(cr>=rMin&&cr<=rMax){ var cyv=Y(_itvNPV(series[0].cashflows,cr));
        grid+='<circle cx="'+X(cr)+'" cy="'+cyv+'" r="4" fill="none" stroke="#C0392B" stroke-width="1.5"/>'
          +'<text x="'+X(cr)+'" y="'+(cyv-8)+'" text-anchor="middle" font-size="9" fill="#C0392B">만나는 점 '+(cr*(rc.divisor||1)).toFixed(1)+_itvEsc(rc.unit||'')+'</text>';
        crossNote='<p class="itv-hint">선이 <b>0</b>을 지나는 곳 = 본전 지점(내부수익률). 두 선이 <b>만나는 곳</b>(<span class="itv-k">'+(cr*(rc.divisor||1)).toFixed(1)+_itvEsc(rc.unit||'')+'</span>) = 둘이 똑같아지는 지점, 여기를 넘으면 순위가 뒤집혀요.'; }
    }
    var curves=series.map(function(s){return curve(s.cashflows,s.color);}).join('');
    var dots=series.map(function(s,i){return '<circle id="'+instId+'_d'+i+'" r="3.5" fill="'+s.color+'"/>';}).join('');
    var legend='<div class="itv-legend">'+series.map(function(s){return '<span><i style="background:'+s.color+'"></i>'+_itvEsc(s.name)+'</span>';}).join('')+'<span><i style="background:#C0392B"></i>지금 위치</span></div>';
    var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img">'+grid+curves+'<line id="'+instId+'_rline" stroke="#C0392B" stroke-width="1.5" stroke-dasharray="4 3" y1="'+T+'" y2="'+(H-Bm)+'"/>'+dots+'</svg>';
    var det='<details class="itv-det"><summary>전체 그림으로 보기</summary>'+svg+legend+crossNote+'</details>';
    var ti2=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
    return '<div class="itv-box" id="'+instId+'">'+ti2+defHTML+storyHTML+ctrl+hint+say+bars+barNote+det+'</div>';
  },

  T5_inventory_flow:function(it, instId){
    var p=it.params||{}; var layers=(p.layers||[]).map(function(l){return {label:l.label,qty:l.qty,cost:l.cost};});
    var sc=p.sell||{min:0,max:100,step:5,default:0,label:'판매 수량'}; var sale=p.salePrice||0;
    var agg=_itvInvAgg(layers), Q=agg.Q, C=agg.C, avg=agg.avg;
    window._itvReg[instId]={template:'T5_inventory_flow', layers:layers, Q:Q, C:C, avg:avg, sale:sale, sell:sc, defaultVal:sc.default};
    // 정의/스토리
    var defHTML='';
    if(Array.isArray(p.terms)&&p.terms.length) defHTML='<details class="itv-defd"><summary>용어 먼저 보기 ▾</summary><div class="itv-def" style="margin-top:6px">'+p.terms.map(function(t){return '<span class="term"><b>'+_itvEsc(t.t)+'</b> — '+_itvEsc(t.d)+'</span>';}).join('')+'</div></details>';
    var storyHTML=(it.story||p.story)?'<div class="itv-story">'+(it.story||p.story)+'</div>':'';
    var ctrl='<div class="itv-ctrl"><label>'+_itvEsc(sc.label||'판매 수량')+'</label>'
      +'<input type="range" min="'+sc.min+'" max="'+(sc.max||Q)+'" step="'+(sc.step||1)+'" value="'+(sc.default||0)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
      +'<div class="itv-rate"><span id="'+instId+'_sv">'+(sc.default||0)+'</span>개</div></div>';
    var legend='<p class="itv-mlegend">칸막이 <span style="color:#C0392B;font-weight:800">┃</span> 왼쪽=매출원가 · 오른쪽(빗금)=기말재고</p>';
    // FIFO 막대(레이어 세그먼트)
    function fifoBar(){ var acc=0,h='',bounds=[]; layers.forEach(function(l){ var w=l.qty/Q*100;
      h+='<div class="itv-seg" style="left:'+acc+'%;width:'+w+'%" onclick="itvTap(\''+instId+'\','+l.qty+','+Math.round(l.cost)+',\''+_itvEsc(l.label)+'\',0)"><span class="sl">'+_itvEsc(l.label.replace(' 매입',''))+'</span><span class="sq">'+l.qty+'개</span><span class="sp">'+_itvWon(l.cost)+'</span></div>'; acc+=w; bounds.push(acc); });
      h+='<div class="itv-kept" id="'+instId+'_f_kept"></div>';
      bounds.slice(0,-1).forEach(function(b){ h+='<div class="itv-bound" style="left:'+b+'%"></div>'; });
      h+='<div class="itv-div" id="'+instId+'_f_div"></div>'; return h; }
    // 가중평균 막대(단일 평균)
    function wavgBar(){ return '<div class="itv-seg" style="left:0;width:100%" onclick="itvTap(\''+instId+'\','+Q+','+Math.round(avg)+',\'평균단가\',1)"><span class="sl">평균단가</span><span class="sp">'+_itvWon(avg)+' \u00D7 '+Q+'개</span></div>'
      +'<div class="itv-kept" id="'+instId+'_w_kept"></div><div class="itv-div" id="'+instId+'_w_div"></div>'; }
    var mbF='<div class="itv-mb fifo"><div class="mh">① 선입선출</div>'
      +'<div class="itv-caps"><span class="cl">매출원가 <span class="amt" id="'+instId+'_f_cg">—</span></span><span class="cr">기말재고 <span class="amt" id="'+instId+'_f_en">—</span></span></div>'
      +'<div class="itv-bar">'+fifoBar()+'</div></div>';
    var mbW='<div class="itv-mb wavg"><div class="mh">② 가중평균</div>'
      +'<div class="itv-caps"><span class="cl">매출원가 <span class="amt" id="'+instId+'_w_cg">—</span></span><span class="cr">기말재고 <span class="amt" id="'+instId+'_w_en">—</span></span></div>'
      +'<div class="itv-bar">'+wavgBar()+'</div></div>';
    var tip='<div class="itv-tip" id="'+instId+'_tip">상자를 탭하면 어떤 매입분인지 설명이 나옵니다.</div>';
    var table='<table class="itv-cmp"><colgroup><col style="width:24%"><col style="width:25%"><col style="width:25%"><col style="width:26%"></colgroup>'
      +'<thead><tr><th></th><th>매출<br>원가</th><th>기말<br>재고</th><th>매출<br>총이익</th></tr></thead><tbody>'
      +'<tr class="rfifo"><td>선입<br>선출</td><td id="'+instId+'_t_fcg">—</td><td id="'+instId+'_t_fen">—</td><td id="'+instId+'_t_fgp">—</td></tr>'
      +'<tr class="rwavg"><td>가중<br>평균</td><td id="'+instId+'_t_wcg">—</td><td id="'+instId+'_t_wen">—</td><td id="'+instId+'_t_wgp">—</td></tr>'
      +'<tr class="diff"><td>차이</td><td id="'+instId+'_t_dcg">—</td><td id="'+instId+'_t_den">—</td><td id="'+instId+'_t_dgp">—</td></tr>'
      +'</tbody></table>';
    var say='<div class="itv-say"><div class="h" id="'+instId+'_sayH">—</div><div class="w" id="'+instId+'_sayW">—</div></div>';
    var note=p.lifoNote?'<p class="itv-hint">※ '+_itvEsc(p.lifoNote)+'</p>':'';
    var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
    return '<div class="itv-box" id="'+instId+'">'+ti+defHTML+storyHTML+ctrl+legend+mbF+mbW+tip+table+say+note+'</div>';
  }
};

/* ---- T2 연표(timeline) : 위 sticky 가로 타임라인(nav) + 아래 세로 사건 목록. 점 탭→해당 사건으로 스크롤, 스크롤→점 동기화 ---- */
function setActiveT2(instId, P, i, doScroll){
  i=Math.max(0, Math.min(P.nodes.length-1, i|0));
  var d=document.getElementById(instId); if(!d) return;
  for(var j=0;j<P.nodes.length;j++){
    var dot=d.querySelector('#'+instId+'_d'+j); if(dot) dot.classList.toggle('on', j===i);
    var ev=d.querySelector('#'+instId+'_ev'+j); if(ev) ev.classList.toggle('on', j===i);
  }
  var n=P.nodes[i], cur=d.querySelector('#'+instId+'_cur'); if(cur) cur.textContent=n.year+' \u00B7 '+(n.title||'');
  var sc=d.querySelector('#'+instId+'_scroll'), cd=d.querySelector('#'+instId+'_d'+i);
  if(sc&&cd){ var x=parseFloat(cd.style.left)||0; sc.scrollLeft=Math.max(0, x - sc.clientWidth/2); }
  if(doScroll){ var t=d.querySelector('#'+instId+'_ev'+i), lst=d.querySelector('.itv-tl-list'); if(t&&lst){ var dl=t.getBoundingClientRect().top-lst.getBoundingClientRect().top; lst.scrollTo({top:lst.scrollTop+dl-6,behavior:'smooth'}); } else if(t&&t.scrollIntoView){ t.scrollIntoView({behavior:'smooth',block:'nearest'}); } }
}
function itvTlWire(instId){
  var P=window._itvReg[instId]; if(!P||P.wired) return; P.wired=true;
  var box0=document.getElementById(instId); var tgt=(box0&&box0.querySelector('.itv-tl-list'))||window;
  (function(){ var scr=box0&&box0.querySelector('#'+instId+'_scroll'), cur=box0&&box0.querySelector('#'+instId+'_cur'); if(!scr||!cur)return;
    function _lab(k){ var n=P.nodes[k]; return n?(n.year+' \u00B7 '+(n.title||'')):''; }
    function _act(){ for(var j=0;j<P.nodes.length;j++){ var dt=box0.querySelector('#'+instId+'_d'+j); if(dt&&dt.classList.contains('on'))return j; } return 0; }
    scr.addEventListener('mouseover',function(e){ var d=e.target.closest?e.target.closest('.itv-tl-dot'):null; if(!d)return; var m=d.id.lastIndexOf('_d'); if(m<0)return; cur.textContent=_lab(parseInt(d.id.slice(m+2),10)); });
    scr.addEventListener('mouseout',function(e){ var d=e.target.closest?e.target.closest('.itv-tl-dot'):null; if(!d)return; cur.textContent=_lab(_act()); });
  })();
  var fn=function(){ if(P._raf) return; P._raf=requestAnimationFrame(function(){ P._raf=0;
    var d=document.getElementById(instId); if(!d){ tgt.removeEventListener('scroll',fn); return; }
    var lst=d.querySelector('.itv-tl-list'); var base=lst?lst.getBoundingClientRect().top+14:140;
    var act=0; for(var j=0;j<P.nodes.length;j++){ var c=d.querySelector('#'+instId+'_ev'+j); if(c && c.getBoundingClientRect().top<=base) act=j; }
    setActiveT2(instId,P,act,false);
  }); };
  tgt.addEventListener('scroll',fn,{passive:true});
}
_itvTemplates.T2_timeline=function(it, instId){
  var p=it.params||{}, phases=(p.phases||[]).slice(), era=p.era||{};
  var nodes=(p.nodes||[]).slice().sort(function(a,b){return (a.year||0)-(b.year||0);});
  var byPhase={}; phases.forEach(function(ph,pi){ byPhase[ph]={pi:pi,list:[]}; });
  nodes.forEach(function(n){ if(byPhase[n.phase]) byPhase[n.phase].list.push(n); });
  var counts=phases.map(function(ph){ return byPhase[ph]?byPhase[ph].list.length:0; });
  var bandPx=Math.max.apply(null, counts.map(function(k){return k*30+24;}).concat([90]));
  var totalW=Math.max(1,phases.length)*bandPx;
  nodes.forEach(function(n){ var b=byPhase[n.phase]; if(!b){n._x=0;return;} var j=b.list.indexOf(n),k=b.list.length; n._x=b.pi*bandPx+(j+1)/(k+1)*bandPx; });
  window._itvReg[instId]={template:'T2_timeline', nodes:nodes, phases:phases, defaultVal:0, wired:false};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var eraLab='<div class="itv-tl-era">'+_itvEsc(era.label||'')+' '+_itvEsc(String(era.from||''))+'\u2013'+_itvEsc(String(era.to||''))+'</div>';
  var bands=''; phases.forEach(function(ph,pi){
    bands+='<div class="itv-tl-band'+(pi%2?' alt':'')+'" style="left:'+(pi*bandPx)+'px;width:'+bandPx+'px"></div>';
    bands+='<div class="itv-tl-plab" style="left:'+((pi+0.5)*bandPx)+'px">'+_itvEsc(ph)+'</div>';
  });
  var dots=''; nodes.forEach(function(n,i){ var lab=_itvEsc(n.year+' \u00B7 '+(n.title||'')); dots+='<div class="itv-tl-dot" id="'+instId+'_d'+i+'" style="left:'+n._x+'px" title="'+lab+'" onclick="itvUpdate(\''+instId+'\','+i+')">'+'</div>'; });
  var track='<div class="itv-tl-scroll" id="'+instId+'_scroll"><div class="itv-tl-track" style="width:'+totalW+'px;height:48px"><div class="itv-tl-line"></div>'+bands+dots+'</div></div>';
  var top='<div class="itv-tl-top">'+eraLab+track+'<div class="itv-tl-cur" id="'+instId+'_cur">'+_itvEsc(nodes.length?(nodes[0].year+' \u00B7 '+(nodes[0].title||'')):'')+'</div></div>';
  var hint='<p class="itv-hint" style="text-align:center">위 점을 누르면 아래 그 사건으로 이동합니다.</p>';
  var list=nodes.map(function(n,i){
    var tags=[]; if(n.cpt)tags.push('개념카드'); if(n.tbl)tags.push('표'); if(n.grp)tags.push('그래프');
    return '<div class="itv-ev" id="'+instId+'_ev'+i+'">'
      +'<div class="evy"><b>'+_itvEsc(String(n.year))+'</b> \u00B7 '+_itvEsc(n.phase||'')+'</div>'
      +'<div class="evt">'+_itvEsc(n.title||'')+'</div>'
      +'<div class="evs">'+_itvEsc(n.story||'')+'</div>'
      +(n.key?'<div class="evk">핵심: '+_itvEsc(n.key)+'</div>':'')
      +(tags.length?'<div class="evr"><span class="rftag">\uD83D\uDD17 '+tags.join(' \u00B7 ')+' 연결</span></div>':'')
      +'</div>';
  }).join('');
  return '<div class="itv-box" id="'+instId+'">'+ti+top+hint+'<div class="itv-tl-list">'+list+'</div></div>';
};
_itvUpdaters.T2_timeline=function(instId, rawVal, P){ setActiveT2(instId, P, parseInt(rawVal,10)||0, true); };

/* ---- 렌더 1건 ---- */
function itvRenderOne(it){
  if(!it||typeof it!=='object') return '';
  var fn=_itvTemplates[it.template];
  if(!fn) return _itvLoaded?'<div class="tbl-broken">⚠️ 인터랙티브 템플릿 미지원: '+_itvEsc(it.template||'(없음)')+'</div>':'';
  itvEnsureCSS();
  var instId='itv_inst_'+(++_itvSeq);
  try{ return fn(it, instId); }catch(e){ return '<div class="tbl-broken">⚠️ 인터랙티브 렌더 오류</div>'; }
}
/* ---- "itv://id" / 인라인 객체 → HTML ---- */
function itvResolve(ref){
  if(ref && typeof ref==='object' && ref.template) return itvRenderOne(ref);
  if(typeof ref==='string' && ref.indexOf('itv://')===0){
    var id=ref.slice(6), it=_itvCache[id];
    if(!it) return _itvLoaded?'<div class="tbl-broken">⚠️ 인터랙티브 참조 오류: itv://'+_itvEsc(id)+' (마스터에 없음)</div>':'';
    return itvRenderOne(Object.assign({id:id}, it));
  }
  return '';
}
/* ---- 문항 exp.itv → 블록 (새 인스턴스만 초기화, 재렌더 안전) ---- */
function itvInitPending(){
  var boxes=document.querySelectorAll('.itv-box');
  for(var i=0;i<boxes.length;i++){ var el=boxes[i];
    if(el.getAttribute('data-itv-init')) continue;
    var P=window._itvReg[el.id]; if(!P) continue;
    el.setAttribute('data-itv-init','1');
    try{ if(P.template==='T2_timeline'){ setActiveT2(el.id,P,P.defaultVal||0,false); itvTlWire(el.id); } else { itvUpdate(el.id, P.defaultVal); } }catch(e){}
  }
}
function itvBlockHTML(q){
  var iv=q&&q.exp&&q.exp.itv; if(!iv) return '';
  var list=Array.isArray(iv)?iv:[iv];
  var html=list.map(itvResolve).filter(Boolean).join('');
  if(html) setTimeout(itvInitPending,0);
  return html;
}

/* ================= 추가 템플릿: T_risk_return · T_duration ================= */
/* T_risk_return : 상관계수(ρ) → 포트폴리오 위험·수익. 기대수익률=가중평균(ρ무관), 위험=√(wA²σA²+wB²σB²+2wAwBρσAσB) */
function _itvPortSD(wA,wB,sdA,sdB,rho){ return Math.sqrt(wA*wA*sdA*sdA + wB*wB*sdB*sdB + 2*wA*wB*rho*sdA*sdB); }
_itvTemplates.T_risk_return=function(it, instId){
  var p=it.params||{};
  var A=p.assetA||{name:'자산 A',ret:8,sd:10}, B=p.assetB||{name:'자산 B',ret:12,sd:20};
  var wA=(p.weightA!=null?p.weightA:0.5), wB=1-wA;
  var RH=p.rho||{min:-1,max:1,step:0.05,default:0};
  var ret=wA*A.ret+wB*B.ret;
  var sdMax=_itvPortSD(wA,wB,A.sd,B.sd,1), sdMin=_itvPortSD(wA,wB,A.sd,B.sd,-1);
  var PL=50, PR=520, y=110, axMax=Math.max(sdMax,A.sd,B.sd)*1.1;
  function xOf(v){ return PL+v/axMax*(PR-PL); }
  window._itvReg[instId]={template:'T_risk_return', A:A, B:B, wA:wA, wB:wB, ret:ret, sdMin:sdMin, sdMax:sdMax, geo:{xOf:xOf}, defaultVal:(RH.default!=null?RH.default:0)};
  var svg='<svg class="itv-svg" viewBox="0 0 560 210" role="img">';
  svg+='<line x1="'+PL+'" y1="'+y+'" x2="'+PR+'" y2="'+y+'" stroke="#94A3B8" stroke-width="1.5"/>';
  svg+='<text x="'+PR+'" y="'+(y+22)+'" font-size="11" fill="#64748B" text-anchor="end">위험(표준편차 %) →</text>';
  [[A,'#2563EB'],[B,'#C0392B']].forEach(function(pr){ var x=xOf(pr[0].sd); svg+='<circle cx="'+x+'" cy="'+y+'" r="3" fill="'+pr[1]+'"/><text x="'+x+'" y="'+(y-10)+'" font-size="10" fill="'+pr[1]+'" text-anchor="middle">'+_itvEsc(pr[0].name)+' '+pr[0].sd+'%</text>'; });
  svg+='<line x1="'+xOf(sdMin)+'" y1="'+(y+40)+'" x2="'+xOf(sdMax)+'" y2="'+(y+40)+'" stroke="#CBD5E1" stroke-width="6" stroke-linecap="round"/>';
  svg+='<text x="'+xOf(sdMin)+'" y="'+(y+62)+'" font-size="9.5" fill="#64748B">ρ=−1 ('+sdMin.toFixed(1)+')</text>';
  svg+='<text x="'+xOf(sdMax)+'" y="'+(y+62)+'" font-size="9.5" fill="#64748B" text-anchor="end">ρ=+1 ('+sdMax.toFixed(1)+')</text>';
  svg+='<text id="'+instId+'_lbl" y="'+(y+30)+'" font-size="10.5" fill="#0F172A" text-anchor="middle" font-weight="700"></text>';
  svg+='<circle id="'+instId+'_dot" cy="'+(y+40)+'" r="6" fill="#0F172A"/></svg>';
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var def='<div class="itv-def">'+_itvEsc(A.name)+'(수익 '+A.ret+'%, 위험 '+A.sd+'%)와 '+_itvEsc(B.name)+'(수익 '+B.ret+'%, 위험 '+B.sd+'%)를 '+Math.round(wA*100)+':'+Math.round(wB*100)+'으로 담았다. <b>기대수익률은 상관계수와 무관</b>하게 가중평균으로 일정하고, <b>위험(표준편차)은 상관계수가 작을수록 더 줄어든다</b>.</div>';
  var ctrl='<div class="itv-ctrl"><label>상관계수 ρ</label>'
    +'<input type="range" min="'+RH.min+'" max="'+RH.max+'" step="'+RH.step+'" value="'+(RH.default!=null?RH.default:0)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_rv">'+Number(RH.default!=null?RH.default:0).toFixed(2)+'</span></div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">기대수익률</div><div class="v" id="'+instId+'_ret">'+ret.toFixed(1)+'%</div></div>'
    +'<div class="itv-card"><div class="t">포트폴리오 위험(표준편차)</div><div class="v" id="'+instId+'_sd">—</div></div></div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+svg+ctrl+cards+say+'</div>';
};
_itvUpdaters.T_risk_return=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var rho=parseFloat(rawVal); if(isNaN(rho)) rho=0;
  var s=_itvPortSD(P.wA,P.wB,P.A.sd,P.B.sd,rho);
  var rv=d.querySelector('#'+instId+'_rv'); if(rv) rv.textContent=rho.toFixed(2);
  var rt=d.querySelector('#'+instId+'_ret'); if(rt) rt.textContent=P.ret.toFixed(1)+'%';
  var sv=d.querySelector('#'+instId+'_sd'); if(sv) sv.textContent=s.toFixed(2)+'%';
  var x=P.geo.xOf(s);
  var dot=d.querySelector('#'+instId+'_dot'); if(dot) dot.setAttribute('cx',x);
  var lbl=d.querySelector('#'+instId+'_lbl'); if(lbl){ lbl.setAttribute('x',x); lbl.textContent='포트폴리오 '+s.toFixed(1)+'%'; }
  var nt=d.querySelector('#'+instId+'_note'); if(nt) nt.innerHTML='ρ='+rho.toFixed(2)+'일 때 기대수익률은 <b>'+P.ret.toFixed(1)+'%</b>로 그대로지만, 위험은 <b class="itv-k">'+s.toFixed(2)+'%</b>다. 상관계수가 낮아질수록 분산효과가 커져 위험이 개별 자산보다 작아진다.';
};

/* T_duration : 상환방식(버튼) → 현금흐름과 듀레이션(가중평균 회수기간)=Σ(t·PVt)/Σ(PVt) */
function _itvBondFlows(key,PRIN,N,R){
  var f=[],bal=PRIN,t;
  if(key==='bullet'){ for(t=1;t<=N;t++) f.push(t<N?PRIN*R:PRIN*R+PRIN); }
  else if(key==='level_principal'){ var pr=PRIN/N; for(t=1;t<=N;t++){ f.push(pr+bal*R); bal-=pr; } }
  else { var Amt=PRIN*R/(1-Math.pow(1+R,-N)); for(t=1;t<=N;t++) f.push(Amt); }
  return f;
}
function _itvDuration(f,R){ var num=0,den=0; for(var t=1;t<=f.length;t++){ var pv=f[t-1]/Math.pow(1+R,t); num+=t*pv; den+=pv; } return num/den; }
function _itvDurSVG(f,R){
  var d=_itvDuration(f,R), mx=Math.max.apply(null,f);
  var PL=45,PB=150,PW=500,bw=PW/f.length,s='';
  s+='<line x1="'+PL+'" y1="'+PB+'" x2="'+(PL+PW)+'" y2="'+PB+'" stroke="#94A3B8" stroke-width="1.3"/>';
  f.forEach(function(v,i){ var h=v/mx*110, x=PL+i*bw+bw*0.2, w=bw*0.6;
    s+='<rect x="'+x+'" y="'+(PB-h)+'" width="'+w+'" height="'+h+'" rx="3" fill="#2563EB" opacity="0.85"/>';
    s+='<text x="'+(x+w/2)+'" y="'+(PB+15)+'" font-size="10" fill="#64748B" text-anchor="middle">'+(i+1)+'년</text>';
    s+='<text x="'+(x+w/2)+'" y="'+(PB-h-5)+'" font-size="9" fill="#475569" text-anchor="middle">'+Math.round(v)+'</text>';
  });
  var dx=PL+(d-0.5)*bw;
  s+='<line x1="'+dx+'" y1="25" x2="'+dx+'" y2="'+PB+'" stroke="#C0392B" stroke-width="1.8" stroke-dasharray="5 3"/>';
  s+='<text x="'+dx+'" y="20" font-size="10.5" fill="#C0392B" text-anchor="middle" font-weight="700">듀레이션 '+d.toFixed(2)+'년</text>';
  return s;
}
_itvTemplates.T_duration=function(it, instId){
  var p=it.params||{};
  var PRIN=p.principal||1000, N=p.years||5, R=(p.rate!=null?p.rate:0.1);
  var METHODS=[{key:'bullet',name:'만기일시상환'},{key:'level_principal',name:'원금균등분할'},{key:'level_pay',name:'원리금균등분할'}];
  window._itvReg[instId]={template:'T_duration', PRIN:PRIN, N:N, R:R, methods:METHODS, defaultVal:0};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var def='<div class="itv-def">원금 '+PRIN+', 기간 '+N+'년, 이자율 '+(R*100)+'%. <b>듀레이션(가중평균 회수기간)</b>은 현금을 늦게 회수할수록 길어진다. 그래서 만기에 몰아 갚는 <b>만기일시상환이 가장 길고</b>, 원금을 일찍 갚는 원금균등분할이 가장 짧다.</div>';
  var btns='<div class="itv-btns">'+METHODS.map(function(m,i){ return '<button'+(i===0?' class="on"':'')+' onclick="itvUpdate(\''+instId+'\','+i+')">'+_itvEsc(m.name)+'</button>'; }).join('')+'</div>';
  var svg='<svg class="itv-svg" id="'+instId+'_svg" viewBox="0 0 560 190" role="img"></svg>';
  var dur='<div class="itv-dur">듀레이션 = <b id="'+instId+'_d">—</b> 년</div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+btns+svg+dur+say+'</div>';
};
_itvUpdaters.T_duration=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var idx=parseInt(rawVal,10)||0; if(idx<0)idx=0; if(idx>=P.methods.length)idx=P.methods.length-1;
  var m=P.methods[idx], f=_itvBondFlows(m.key,P.PRIN,P.N,P.R), dur=_itvDuration(f,P.R);
  var sv=d.querySelector('#'+instId+'_svg'); if(sv) sv.innerHTML=_itvDurSVG(f,P.R);
  var dd=d.querySelector('#'+instId+'_d'); if(dd) dd.textContent=dur.toFixed(2);
  var nt=d.querySelector('#'+instId+'_note'); if(nt) nt.innerHTML=_itvEsc(m.name)+'은 현금흐름이 '+(m.key==='bullet'?'만기에 몰려':'매기 나뉘어')+' 듀레이션이 <b class="itv-k">'+dur.toFixed(2)+'년</b>이다. 회수가 늦을수록 듀레이션이 길어지고 금리위험에 더 민감해진다.';
  var bs=d.querySelectorAll('.itv-btns button'); for(var i=0;i<bs.length;i++){ bs[i].className=(i===idx?'on':''); }
};

/* ================= 추가 템플릿: T_cvp (CVP 매출배합·목표이익) ================= */
/* 여러 제품을 매출배합(묶음)으로 묶어 가중평균 공헌이익을 쓰고, 목표이익 달성 수량을 구한다. */
_itvTemplates.T_cvp=function(it, instId){
  var p=it.params||{};
  var prods=(p.products||[]).map(function(x){return {name:x.name,cm:+x.cm,mix:+x.mix};});
  var FC=+(p.fixedCost||0);
  var T=p.target||{min:0,max:200000,step:10000,default:0};
  var bundleCM=0; prods.forEach(function(x){ bundleCM+=x.mix*x.cm; });
  window._itvReg[instId]={template:'T_cvp', prods:prods, FC:FC, bundleCM:bundleCM, defaultVal:(T.default!=null?T.default:0)};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var def='<div class="itv-def">제품을 매출배합(묶음)으로 묶으면 묶음당 공헌이익이 하나로 정해진다. 목표이익을 움직여 필요한 판매량이 어떻게 바뀌는지 보라. <b>목표 묶음수 = (고정비 + 목표이익) ÷ 묶음당 공헌이익</b>.</div>';
  var rows=prods.map(function(x){ return '<tr><td>'+_itvEsc(x.name)+'</td><td>'+x.mix+'</td><td>'+_itvWon(x.cm)+'</td></tr>'; }).join('');
  var tbl='<table class="itv-cmp"><thead><tr><th>제품</th><th>배합(개)</th><th>단위 공헌이익</th></tr></thead><tbody>'+rows
    +'<tr class="diff"><td>묶음당 공헌이익</td><td></td><td>'+_itvWon(bundleCM)+'</td></tr></tbody></table>';
  var ctrl='<div class="itv-ctrl"><label>목표이익</label>'
    +'<input type="range" min="'+T.min+'" max="'+T.max+'" step="'+T.step+'" value="'+(T.default!=null?T.default:0)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_tv">'+_itvWon(T.default!=null?T.default:0)+'</span></div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">필요 묶음수</div><div class="v" id="'+instId+'_bn">—</div></div>'
    +'<div class="itv-card"><div class="t">필요 총판매량</div><div class="v" id="'+instId+'_qty">—</div></div></div>';
  var per='<div class="itv-tip" id="'+instId+'_per">—</div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+tbl+ctrl+cards+per+say+'</div>';
};
_itvUpdaters.T_cvp=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var target=parseFloat(rawVal)||0;
  var bundles=P.bundleCM>0?(P.FC+target)/P.bundleCM:0;
  var totalQty=0, mixSum=0; P.prods.forEach(function(x){ mixSum+=x.mix; });
  var tv=d.querySelector('#'+instId+'_tv'); if(tv) tv.textContent=_itvWon(target);
  var bn=d.querySelector('#'+instId+'_bn'); if(bn) bn.textContent=Math.ceil(bundles).toLocaleString()+'묶음';
  var perParts=P.prods.map(function(x){ var q=Math.ceil(bundles*x.mix); totalQty+=q; return _itvEsc(x.name)+' '+q.toLocaleString()+'개'; });
  var qty=d.querySelector('#'+instId+'_qty'); if(qty) qty.textContent=Math.ceil(bundles*mixSum).toLocaleString()+'개';
  var per=d.querySelector('#'+instId+'_per'); if(per) per.innerHTML='제품별 필요 수량: <b>'+perParts.join(' · ')+'</b>';
  var bep=P.bundleCM>0?P.FC/P.bundleCM:0;
  var nt=d.querySelector('#'+instId+'_note'); if(nt){
    if(target===0) nt.innerHTML='목표이익 0 = 손익분기점(BEP). 고정비 '+_itvWon(P.FC)+'를 묶음당 공헌이익 '+_itvWon(P.bundleCM)+'로 나누면 <b class="itv-k">'+Math.ceil(bep).toLocaleString()+'묶음</b>이 필요하다.';
    else nt.innerHTML='목표이익 '+_itvWon(target)+'를 더하면 (고정비 + 목표이익) '+_itvWon(P.FC+target)+' ÷ 묶음당 공헌이익 '+_itvWon(P.bundleCM)+' = <b class="itv-k">'+Math.ceil(bundles).toLocaleString()+'묶음</b>이 필요하다. 배합이 유지되면 제품 수량도 비례한다.';
  }
};

/* ================= 추가 템플릿: T_eup (공정원가 완성품환산량) ================= */
/* 평균법 vs 선입선출 완성품환산량(가공원가 기준). 두 방법 차이 = 기초재공품 환산량. */
function _eupAvg(comp,end,endConv){ return comp + end*endConv; }
function _eupFifo(comp,end,endConv,beg,begConv){ return comp + end*endConv - beg*begConv; }
_itvTemplates.T_eup=function(it, instId){
  var p=it.params||{};
  var beg=+(p.beginWIP&&p.beginWIP.qty||0), begConv=+(p.beginWIP&&p.beginWIP.conv||0);
  var comp=+(p.completed||0), end=+(p.endWIP&&p.endWIP.qty||0), endConv=+(p.endWIP&&p.endWIP.conv||0);
  var curCost=+(p.curConvCost||0);
  var methods=[{key:'avg',name:'평균법'},{key:'fifo',name:'선입선출'}];
  window._itvReg[instId]={template:'T_eup', beg:beg,begConv:begConv,comp:comp,end:end,endConv:endConv,curCost:curCost, methods:methods, defaultVal:0};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var def='<div class="itv-def">기초재공품 '+beg+'개(가공 '+Math.round(begConv*100)+'%), 당기완성 '+comp+'개, 기말재공품 '+end+'개(가공 '+Math.round(endConv*100)+'%). 방법을 바꿔 가공원가 완성품환산량이 어떻게 달라지는지 보라. <b>평균법 − 선입선출 = 기초재공품 환산량</b>.</div>';
  var btns='<div class="itv-btns">'+methods.map(function(m,i){ return '<button'+(i===0?' class="on"':'')+' onclick="itvUpdate(\''+instId+'\','+i+')">'+_itvEsc(m.name)+'</button>'; }).join('')+'</div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">완성품환산량(가공)</div><div class="v" id="'+instId+'_eup">—</div></div>'
    +'<div class="itv-card"><div class="t">'+(curCost?'선입선출 단가':'평균법과의 차이')+'</div><div class="v" id="'+instId+'_sub">—</div></div></div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+btns+cards+say+'</div>';
};
_itvUpdaters.T_eup=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var idx=parseInt(rawVal,10)||0; if(idx<0)idx=0; if(idx>=P.methods.length)idx=P.methods.length-1;
  var m=P.methods[idx];
  var avg=_eupAvg(P.comp,P.end,P.endConv), fifo=_eupFifo(P.comp,P.end,P.endConv,P.beg,P.begConv);
  var eup=(m.key==='avg')?avg:fifo, begEUP=P.beg*P.begConv;
  var e=d.querySelector('#'+instId+'_eup'); if(e) e.textContent=eup.toLocaleString()+'개';
  var sub=d.querySelector('#'+instId+'_sub');
  if(P.curCost){ var unit=fifo>0?P.curCost/fifo:0; if(sub) sub.textContent=_itvWon(unit); }
  else { if(sub) sub.textContent=(m.key==='avg'?'기준':('−'+begEUP.toLocaleString()+'개')); }
  var nt=d.querySelector('#'+instId+'_note');
  if(nt){ if(m.key==='avg') nt.innerHTML='평균법은 기초재공품의 완성도를 따지지 않고 당기완성 '+P.comp+'개에 기말 '+P.end+'개×'+Math.round(P.endConv*100)+'% = <b class="itv-k">'+avg.toLocaleString()+'개</b>로 본다.';
    else nt.innerHTML='선입선출은 여기서 기초재공품 환산량 '+P.beg+'개×'+Math.round(P.begConv*100)+'% = '+begEUP.toLocaleString()+'개를 뺀 <b class="itv-k">'+fifo.toLocaleString()+'개</b>다. 두 방법 차이('+avg.toLocaleString()+'−'+fifo.toLocaleString()+'='+begEUP.toLocaleString()+')가 바로 기초재공품 환산량이다.'+(P.curCost?' 선입선출 단가는 당기원가 '+_itvWon(P.curCost)+'를 이 환산량으로 나눈 값이다.':''); }
};

/* ================= 추가 템플릿: T_lcnrv (저가법 원가 vs 순실현가능가치) ================= */
/* 재고를 원가와 순실현가능가치(NRV) 중 낮은 값으로. 평가손실과 감모손실은 별개로 계산. */
_itvTemplates.T_lcnrv=function(it, instId){
  var p=it.params||{};
  var cost=+(p.cost||0), book=+(p.bookQty||0), actual=+(p.actualQty!=null?p.actualQty:book);
  var NR=p.nrv||{min:0,max:cost*1.4||140,step:Math.max(1,Math.round((cost||100)/20)),default:Math.round((cost||100)*0.8)};
  window._itvReg[instId]={template:'T_lcnrv', cost:cost, book:book, actual:actual, defaultVal:(NR.default!=null?NR.default:cost)};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var shrink=book-actual;
  var def='<div class="itv-def">단위 원가 '+_itvWon(cost)+', 장부수량 '+book+'개'+(shrink>0?(', 실제수량 '+actual+'개(감모 '+shrink+'개)'):'')+'. 순실현가능가치(NRV)를 움직여 저가법 평가를 보라. <b>재고는 원가와 NRV 중 낮은 값</b>으로 적고, 평가손실과 감모손실은 <b>따로</b> 계산한다.</div>';
  var ctrl='<div class="itv-ctrl"><label>순실현가능가치(NRV)</label>'
    +'<input type="range" min="'+NR.min+'" max="'+NR.max+'" step="'+NR.step+'" value="'+(NR.default!=null?NR.default:cost)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_nv">'+_itvWon(NR.default!=null?NR.default:cost)+'</span></div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">평가손실 (단가 하락)</div><div class="v" id="'+instId+'_val">—</div></div>'
    +'<div class="itv-card"><div class="t">감모손실 (수량 감소)</div><div class="v" id="'+instId+'_shr">'+_itvWon(cost*shrink)+'</div></div></div>';
  var fin='<div class="itv-tip" id="'+instId+'_fin">—</div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+ctrl+cards+fin+say+'</div>';
};
_itvUpdaters.T_lcnrv=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var nrv=parseFloat(rawVal); if(isNaN(nrv)) nrv=P.cost;
  var lower=Math.min(P.cost,nrv);
  var valLoss=Math.max(0,P.cost-nrv)*P.actual;      // 평가손실: 실제수량 기준
  var shrink=P.book-P.actual, shrLoss=P.cost*shrink; // 감모손실: 수량 기준(원가)
  var finalInv=lower*P.actual;                        // 최종 재고평가액
  var nv=d.querySelector('#'+instId+'_nv'); if(nv) nv.textContent=_itvWon(nrv);
  var val=d.querySelector('#'+instId+'_val'); if(val) val.textContent=_itvWon(valLoss);
  var fin=d.querySelector('#'+instId+'_fin'); if(fin) fin.innerHTML='낮은 값 min(원가 '+_itvWon(P.cost)+', NRV '+_itvWon(nrv)+') = <b>'+_itvWon(lower)+'</b> × 실제 '+P.actual+'개 → 재고평가액 <b>'+_itvWon(finalInv)+'</b>.';
  var nt=d.querySelector('#'+instId+'_note');
  if(nt){ if(nrv>=P.cost) nt.innerHTML='NRV가 원가 이상이면 원가 그대로 둔다(평가손실 0). 감모손실 '+_itvWon(shrLoss)+'만 수량 부족분('+shrink+'개)에서 별도로 생긴다.';
    else nt.innerHTML='NRV가 원가보다 낮아 단위당 '+_itvWon(P.cost-nrv)+'씩, 실제 '+P.actual+'개에 대해 평가손실 <b class="itv-k">'+_itvWon(valLoss)+'</b>이 생긴다. 이는 수량이 줄어 생긴 감모손실 '+_itvWon(shrLoss)+'과(와)는 별개다.'; }
};

/* ================= 추가 템플릿: T_eps (가중평균유통주식수·기본주당이익) ================= */
/* 유통 기간만큼 가중. 무상증자는 소급(전기간 ×배수), 자기주식은 취득 시점부터 차감. */
_itvTemplates.T_eps=function(it, instId){
  var p=it.params||{};
  var begin=+(p.begin||0);
  var paidIn=p.paidIn&&+p.paidIn.qty?{month:+p.paidIn.month,qty:+p.paidIn.qty}:null;
  var treasury=p.treasury&&+p.treasury.qty?{month:+p.treasury.month,qty:+p.treasury.qty}:null;
  var bonus=p.bonus&&+p.bonus.factor?{month:+p.bonus.month,factor:+p.bonus.factor}:null;
  var NI=+(p.netIncome||0), PD=+(p.preferredDiv||0);
  window._itvReg[instId]={template:'T_eps', begin:begin,paidIn:paidIn,treasury:treasury,bonus:bonus,NI:NI,PD:PD, defaultVal:0};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var parts=['기초 '+begin.toLocaleString()+'주'];
  if(paidIn) parts.push(paidIn.month+'월 유상증자 +'+paidIn.qty.toLocaleString());
  if(treasury) parts.push(treasury.month+'월 자기주식 −'+treasury.qty.toLocaleString());
  if(bonus) parts.push(bonus.month+'월 무상증자 ×'+bonus.factor);
  var def='<div class="itv-def">'+parts.join(' · ')+'. 순이익 '+_itvWon(NI)+', 우선주배당 '+_itvWon(PD)+'. 무상증자를 <b>소급</b>하면(전 기간 ×배수) 가중평균주식수가 늘어 주당이익이 정확해진다. <b>기본주당이익 = (순이익 − 우선주배당) ÷ 가중평균유통보통주식수</b>.</div>';
  var btns='<div class="itv-btns"><button class="on" onclick="itvUpdate(\''+instId+'\',0)">무상증자 소급(정답)</button><button onclick="itvUpdate(\''+instId+'\',1)">소급 안 함</button></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">가중평균유통주식수</div><div class="v" id="'+instId+'_wa">—</div></div>'
    +'<div class="itv-card"><div class="t">기본주당이익(EPS)</div><div class="v" id="'+instId+'_eps">—</div></div></div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+btns+cards+say+'</div>';
};
_itvUpdaters.T_eps=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var retro=(parseInt(rawVal,10)||0)===0;  // 0=소급 ON(정답), 1=소급 안 함
  // 무상증자 제외한 월별 기본 주식수
  var monthly=[]; for(var m=1;m<=12;m++){ var s=P.begin; if(P.paidIn&&P.paidIn.month<=m) s+=P.paidIn.qty; if(P.treasury&&P.treasury.month<=m) s-=P.treasury.qty; monthly.push(s); }
  var baseAvg=monthly.reduce(function(a,b){return a+b;},0)/12;
  var wa=baseAvg, factor=P.bonus?P.bonus.factor:1;
  if(P.bonus){
    if(retro){ wa=baseAvg*factor; }
    else { var bm=P.bonus.month, atBonus=monthly[bm-1], bonusShares=atBonus*(factor-1), wgt=(12-bm+1)/12; wa=baseAvg+bonusShares*wgt; }
  }
  var eps=wa>0?(P.NI-P.PD)/wa:0;
  var waEl=d.querySelector('#'+instId+'_wa'); if(waEl) waEl.textContent=Math.round(wa).toLocaleString()+'주';
  var epsEl=d.querySelector('#'+instId+'_eps'); if(epsEl) epsEl.textContent=_itvWon(Math.round(eps*100)/100);
  var nt=d.querySelector('#'+instId+'_note');
  if(nt){
    var baseTxt='유통 기간 가중으로 기본 가중평균은 '+Math.round(baseAvg).toLocaleString()+'주다.';
    if(!P.bonus){ nt.innerHTML=baseTxt+' 자기주식은 취득한 달부터 빼고, 유상증자는 납입한 달부터 더해 기간만큼 가중한다.'; return; }
    if(retro) nt.innerHTML=baseTxt+' 무상증자는 <b>소급</b>해 전 기간에 ×'+factor+'를 적용하므로 가중평균이 <b class="itv-k">'+Math.round(wa).toLocaleString()+'주</b>로 늘고, 주당이익은 '+_itvWon(Math.round(eps*100)/100)+'가 된다(정답).';
    else nt.innerHTML=baseTxt+' 소급하지 않고 무상증자 신주를 발행한 달부터만 가중하면 가중평균이 '+Math.round(wa).toLocaleString()+'주에 그쳐 주당이익이 과대계상된다(오답).';
  }
};

/* ================= 추가 템플릿: T_eva (경제적부가가치) ================= */
/* EVA = 세후영업이익 − 투하자본 × 가중평균자본비용(WACC). WACC 슬라이더. */
_itvTemplates.T_eva=function(it, instId){
  var p=it.params||{};
  var nopat=+(p.nopat||0), cap=+(p.capital||0);
  var W=p.wacc||{min:0,max:20,step:0.5,default:10};
  window._itvReg[instId]={template:'T_eva', nopat:nopat, cap:cap, defaultVal:(W.default!=null?W.default:10)};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var def='<div class="itv-def">세후영업이익 '+_itvWon(nopat)+', 투하자본 '+_itvWon(cap)+'. 가중평균자본비용(WACC)을 움직여 경제적부가가치(EVA)를 보라. <b>EVA = 세후영업이익 − 투하자본 × WACC</b>. 세후 기준인 점이 (세전) 잔여이익과 다르다.</div>';
  var ctrl='<div class="itv-ctrl"><label>가중평균자본비용(WACC)</label>'
    +'<input type="range" min="'+W.min+'" max="'+W.max+'" step="'+W.step+'" value="'+(W.default!=null?W.default:10)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_wv">'+Number(W.default!=null?W.default:10).toFixed(1)+'</span>%</div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">자본비용 (투하자본 × WACC)</div><div class="v" id="'+instId+'_cc">—</div></div>'
    +'<div class="itv-card"><div class="t">경제적부가가치(EVA)</div><div class="v" id="'+instId+'_eva">—</div></div></div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+ctrl+cards+say+'</div>';
};
_itvUpdaters.T_eva=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var w=parseFloat(rawVal); if(isNaN(w)) w=10; var wr=w/100;
  var cc=P.cap*wr, eva=P.nopat-cc;
  var wv=d.querySelector('#'+instId+'_wv'); if(wv) wv.textContent=w.toFixed(1);
  var ccEl=d.querySelector('#'+instId+'_cc'); if(ccEl) ccEl.textContent=_itvWon(cc);
  var evaEl=d.querySelector('#'+instId+'_eva'); if(evaEl){ evaEl.textContent=_itvWon(eva); evaEl.style.color=eva>=0?'#15793F':'#C0392B'; }
  var bep=P.cap>0?(P.nopat/P.cap*100):0;
  var nt=d.querySelector('#'+instId+'_note');
  if(nt){ if(eva>=0) nt.innerHTML='WACC '+w.toFixed(1)+'%에서 자본비용 '+_itvWon(cc)+'를 빼고도 <b class="itv-k">EVA '+_itvWon(eva)+'</b>가 남는다. 자본비용을 넘는 이익을 벌었다는 뜻이다.';
    else nt.innerHTML='WACC '+w.toFixed(1)+'%에서는 자본비용 '+_itvWon(cc)+'이 영업이익을 넘어 <b class="itv-k">EVA '+_itvWon(eva)+'</b>로 음수다. WACC가 약 '+bep.toFixed(1)+'%를 넘으면 EVA가 음수가 된다.'; }
};

/* ================= 추가 템플릿: T_capint (자본화 대상 연평균지출) ================= */
/* 연평균지출 = Σ 각 지출 × (지출 시점부터 연말까지 월수 ÷ 12). 자본화율 슬라이더 → 자본화이자. */
_itvTemplates.T_capint=function(it, instId){
  var p=it.params||{};
  var exps=(p.expenditures||[]).map(function(x){return {month:+x.month, amount:+x.amount};});
  var R=p.rate||{min:0,max:12,step:0.5,default:5};
  window._itvReg[instId]={template:'T_capint', exps:exps, defaultVal:(R.default!=null?R.default:5)};
  var wavg=0; exps.forEach(function(x){ wavg+=x.amount*((13-x.month)/12); });
  window._itvReg[instId].wavg=wavg;
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var rows=exps.map(function(x){ var mo=(13-x.month); return '<tr><td>'+x.month+'월</td><td>'+_itvWon(x.amount)+'</td><td>'+mo+'/12</td><td>'+_itvWon(x.amount*mo/12)+'</td></tr>'; }).join('');
  var tbl='<table class="itv-cmp"><thead><tr><th>지출월</th><th>지출액</th><th>가중(월수)</th><th>가중지출</th></tr></thead><tbody>'+rows
    +'<tr class="diff"><td>연평균지출</td><td></td><td></td><td>'+_itvWon(wavg)+'</td></tr></tbody></table>';
  var def='<div class="itv-def">각 공사비를 <b>지출 시점부터 연말까지 묶인 기간만큼 월할</b>로 가중한다(예: 4월 지출은 ×9/12). 자본화율을 움직여 자본화 대상 이자를 보라.</div>';
  var ctrl='<div class="itv-ctrl"><label>자본화율(이자율)</label>'
    +'<input type="range" min="'+R.min+'" max="'+R.max+'" step="'+R.step+'" value="'+(R.default!=null?R.default:5)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_rv">'+Number(R.default!=null?R.default:5).toFixed(1)+'</span>%</div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">연평균지출액</div><div class="v" id="'+instId+'_wa">'+_itvWon(wavg)+'</div></div>'
    +'<div class="itv-card"><div class="t">자본화 대상 이자</div><div class="v" id="'+instId+'_ci">—</div></div></div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+tbl+ctrl+cards+say+'</div>';
};
_itvUpdaters.T_capint=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var r=parseFloat(rawVal); if(isNaN(r)) r=5; var rr=r/100;
  var ci=P.wavg*rr;
  var rv=d.querySelector('#'+instId+'_rv'); if(rv) rv.textContent=r.toFixed(1);
  var ciEl=d.querySelector('#'+instId+'_ci'); if(ciEl) ciEl.textContent=_itvWon(ci);
  var nt=d.querySelector('#'+instId+'_note');
  if(nt) nt.innerHTML='연평균지출 '+_itvWon(P.wavg)+'에 자본화율 '+r.toFixed(1)+'%를 곱하면 자본화 대상 이자는 <b class="itv-k">'+_itvWon(ci)+'</b>다. 실제 발생한 차입원가를 넘지 못하며, 전기에 자본화한 이자 자체는 지출액에 더하지 않는다.';
};

/* ================= 추가 템플릿: T_fvpl (FVPL 취득수수료·무상증자 단가) ================= */
/* FVPL 금융자산: 취득수수료는 당기비용(원가 미산입). 무상증자로 주식수 늘면 총원가 불변, 이동평균 단가 하락. */
_itvTemplates.T_fvpl=function(it, instId){
  var p=it.params||{};
  var shares=+(p.shares||0), price=+(p.price||0), fee=+(p.fee||0);
  var B=p.bonus||{min:0,max:shares||100,step:Math.max(1,Math.round((shares||100)/10)),default:Math.round((shares||100)*0.2)};
  var cost=shares*price;
  window._itvReg[instId]={template:'T_fvpl', shares:shares, price:price, fee:fee, cost:cost, defaultVal:(B.default!=null?B.default:0)};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var def='<div class="itv-def">'+shares+'주를 주당 '+_itvWon(price)+'에 취득(거래수수료 '+_itvWon(fee)+'). FVPL(당기손익-공정가치)은 <b>수수료를 취득원가에 더하지 않고 당기비용</b>으로 턴다. 무상증자를 움직여 이동평균 단가가 어떻게 되는지 보라 — <b>총취득원가는 그대로, 주식수만 늘어 단가가 내려간다</b>.</div>';
  var ctrl='<div class="itv-ctrl"><label>무상증자 수령주식</label>'
    +'<input type="range" min="'+B.min+'" max="'+B.max+'" step="'+B.step+'" value="'+(B.default!=null?B.default:0)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_bv">'+(B.default!=null?B.default:0)+'</span>주</div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">총 보유주식수</div><div class="v" id="'+instId+'_tot">—</div></div>'
    +'<div class="itv-card"><div class="t">이동평균 단가</div><div class="v" id="'+instId+'_unit">—</div></div></div>';
  var fin='<div class="itv-tip" id="'+instId+'_fin">취득원가 '+_itvWon(cost)+'(수수료 '+_itvWon(fee)+'는 당기비용, 원가 제외).</div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+ctrl+cards+fin+say+'</div>';
};
_itvUpdaters.T_fvpl=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var b=parseInt(rawVal,10)||0; var tot=P.shares+b, unit=tot>0?P.cost/tot:0;
  var bv=d.querySelector('#'+instId+'_bv'); if(bv) bv.textContent=b;
  var totEl=d.querySelector('#'+instId+'_tot'); if(totEl) totEl.textContent=tot.toLocaleString()+'주';
  var unitEl=d.querySelector('#'+instId+'_unit'); if(unitEl) unitEl.textContent=_itvWon(Math.round(unit*100)/100);
  var nt=d.querySelector('#'+instId+'_note');
  if(nt){ if(b===0) nt.innerHTML='무상증자 전에는 이동평균 단가가 취득원가 ÷ 주식수 = '+_itvWon(P.price)+'다. 취득수수료 '+_itvWon(P.fee)+'은 원가에 넣지 않고 당기비용으로 처리한다.';
    else nt.innerHTML='무상증자 '+b+'주를 공짜로 받아 총 '+tot.toLocaleString()+'주가 됐지만 총취득원가는 '+_itvWon(P.cost)+' 그대로다. 그래서 이동평균 단가가 '+_itvWon(P.price)+'에서 <b class="itv-k">'+_itvWon(Math.round(unit*100)/100)+'</b>으로 내려간다.'; }
};

/* ================= 추가 템플릿: T_cost_reverse (원가흐름 역산) ================= */
/* 매출원가 → (+기말제품 −기초제품) 당기제품제조원가 → (+기말재공품 −기초재공품) 당기총제조원가. */
_itvTemplates.T_cost_reverse=function(it, instId){
  var p=it.params||{};
  var cogs=+(p.salesCogs||0), begFG=+(p.begFG||0), endFG=+(p.endFG||0), begWIP=+(p.begWIP||0), endWIP=+(p.endWIP||0);
  var S=p.cogsRange||{min:Math.max(0,cogs-40000),max:cogs+40000,step:5000,default:cogs};
  var dv=(S.default!=null?S.default:cogs);
  window._itvReg[instId]={template:'T_cost_reverse', begFG:begFG,endFG:endFG,begWIP:begWIP,endWIP:endWIP, defaultVal:dv};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var def='<div class="itv-def">기초제품 '+_itvWon(begFG)+', 기말제품 '+_itvWon(endFG)+', 기초재공품 '+_itvWon(begWIP)+', 기말재공품 '+_itvWon(endWIP)+'. 매출원가를 움직여 원가흐름을 거꾸로 올라가 보라. <b>매출원가 → (＋기말제품 −기초제품) 당기제품제조원가 → (＋기말재공품 −기초재공품) 당기총제조원가</b>. 직접재료 잔액은 역산에 쓰지 않는다.</div>';
  var ctrl='<div class="itv-ctrl"><label>매출원가</label>'
    +'<input type="range" min="'+S.min+'" max="'+S.max+'" step="'+S.step+'" value="'+dv+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_cv">'+_itvWon(dv)+'</span></div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">당기제품제조원가</div><div class="v" id="'+instId+'_cogm">—</div></div>'
    +'<div class="itv-card"><div class="t">당기총제조원가</div><div class="v" id="'+instId+'_tmc">—</div></div></div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+ctrl+cards+say+'</div>';
};
_itvUpdaters.T_cost_reverse=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var cogs=parseFloat(rawVal); if(isNaN(cogs)) cogs=0;
  var cogm=cogs+P.endFG-P.begFG;      // 당기제품제조원가
  var tmc=cogm+P.endWIP-P.begWIP;     // 당기총제조원가
  var cv=d.querySelector('#'+instId+'_cv'); if(cv) cv.textContent=_itvWon(cogs);
  var a=d.querySelector('#'+instId+'_cogm'); if(a) a.textContent=_itvWon(cogm);
  var b=d.querySelector('#'+instId+'_tmc'); if(b) b.textContent=_itvWon(tmc);
  var nt=d.querySelector('#'+instId+'_note');
  if(nt) nt.innerHTML='매출원가 '+_itvWon(cogs)+'에 기말제품 '+_itvWon(P.endFG)+'을 더하고 기초제품 '+_itvWon(P.begFG)+'을 빼면 당기제품제조원가 <b class="itv-k">'+_itvWon(cogm)+'</b>. 여기에 기말재공품 '+_itvWon(P.endWIP)+'을 더하고 기초재공품 '+_itvWon(P.begWIP)+'을 빼면 당기총제조원가 <b class="itv-k">'+_itvWon(tmc)+'</b>가 된다.';
};

/* ================= 추가 템플릿: T_retail (소매재고법·매가환원법) ================= */
/* 원가율(원가합÷판매가합)을 기말재고 판매가(=판매가합−매출액)에 곱해 기말재고 원가를 구함. */
_itvTemplates.T_retail=function(it, instId){
  var p=it.params||{};
  var cb=+(p.costBeg||0), pb=+(p.priceBeg||0), cp=+(p.costPur||0), pp=+(p.pricePur||0);
  var costSum=cb+cp, priceSum=pb+pp;
  var S=p.salesRange||{min:0,max:priceSum,step:50000,default:+(p.sales||Math.round(priceSum*0.8))};
  var dv=(S.default!=null?S.default:Math.round(priceSum*0.8));
  window._itvReg[instId]={template:'T_retail', costSum:costSum, priceSum:priceSum, defaultVal:dv};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var ratio=priceSum>0?costSum/priceSum:0;
  var def='<div class="itv-def">판매 가능액 — 원가 합계 '+_itvWon(costSum)+', 판매가 합계 '+_itvWon(priceSum)+' (원가율 '+Math.round(ratio*1000)/10+'%). 매출액을 움직여 보라. <b>기말재고 판매가 = 판매가합 − 매출액</b>, <b>기말재고 원가 = 기말재고 판매가 × 원가율</b>.</div>';
  var ctrl='<div class="itv-ctrl"><label>매출액(판매가)</label>'
    +'<input type="range" min="'+S.min+'" max="'+S.max+'" step="'+S.step+'" value="'+dv+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_sv">'+_itvWon(dv)+'</span></div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">원가율</div><div class="v" id="'+instId+'_ratio">'+(Math.round(ratio*1000)/10)+'%</div></div>'
    +'<div class="itv-card"><div class="t">기말재고 원가</div><div class="v" id="'+instId+'_endcost">—</div></div></div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+ctrl+cards+say+'</div>';
};
_itvUpdaters.T_retail=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var sales=parseFloat(rawVal); if(isNaN(sales)) sales=0;
  var ratio=P.priceSum>0?P.costSum/P.priceSum:0;
  var endPrice=Math.max(0,P.priceSum-sales);
  var endCost=endPrice*ratio;
  var sv=d.querySelector('#'+instId+'_sv'); if(sv) sv.textContent=_itvWon(sales);
  var ec=d.querySelector('#'+instId+'_endcost'); if(ec) ec.textContent=_itvWon(endCost);
  var nt=d.querySelector('#'+instId+'_note');
  if(nt) nt.innerHTML='기말재고 판매가 = 판매가합 '+_itvWon(P.priceSum)+' − 매출액 '+_itvWon(sales)+' = '+_itvWon(endPrice)+'. 여기에 원가율 '+(Math.round(ratio*1000)/10)+'%를 곱하면 기말재고 원가 <b class="itv-k">'+_itvWon(endCost)+'</b>가 된다. 매출이 늘면 남는 재고가 줄어 기말재고 원가도 줄어든다.';
};

/* ================= 추가 템플릿: T_moving_avg (가중이동평균 예측) ================= */
/* 직전 n기 실제값에 가중치를 달리 줘 다음 기를 예측. 최근에 큰 가중치(k↑)일수록 최근 추세를 빨리 반영. 가중치 합=1. */
function _itvMAWeights(n,k){ var w=[],s=0,i; for(i=0;i<n;i++){ var v=Math.pow(k,i); w.push(v); s+=v; } for(i=0;i<n;i++) w[i]=w[i]/s; return w; } /* w[i]: 오래된(i=0)→최근(i=n-1) */
function _itvMAForecast(vals,w){ var f=0; for(var i=0;i<w.length;i++) f+=w[i]*vals[i]; return f; }
function _itvMASVG(P,w,f){
  var last=P.last, n=last.length, all=last.concat([f]);
  var mx=Math.max.apply(null,all)*1.12, PL=45,PB=155,PW=500,bw=PW/(n+1), s='';
  s+='<line x1="'+PL+'" y1="'+PB+'" x2="'+(PL+PW)+'" y2="'+PB+'" stroke="#94A3B8" stroke-width="1.3"/>';
  last.forEach(function(v,i){ var h=v/mx*120, x=PL+i*bw+bw*0.2, wd=bw*0.6;
    s+='<rect x="'+x+'" y="'+(PB-h)+'" width="'+wd+'" height="'+h+'" rx="3" fill="#2563EB" opacity="0.85"/>';
    s+='<text x="'+(x+wd/2)+'" y="'+(PB+15)+'" font-size="10" fill="#64748B" text-anchor="middle">'+(P.series.length-n+i+1)+'기</text>';
    s+='<text x="'+(x+wd/2)+'" y="'+(PB-h-5)+'" font-size="9.5" fill="#475569" text-anchor="middle">'+Math.round(v)+'</text>';
    s+='<text x="'+(x+wd/2)+'" y="'+(PB-h-18)+'" font-size="9" fill="#94A3B8" text-anchor="middle">'+(w[i]*100).toFixed(0)+'%</text>';
  });
  var fx=PL+n*bw+bw*0.2, fw=bw*0.6, fh=f/mx*120;
  s+='<rect x="'+fx+'" y="'+(PB-fh)+'" width="'+fw+'" height="'+fh+'" rx="3" fill="#C0392B"/>';
  s+='<text x="'+(fx+fw/2)+'" y="'+(PB+15)+'" font-size="10" fill="#C0392B" text-anchor="middle" font-weight="700">예측</text>';
  s+='<text x="'+(fx+fw/2)+'" y="'+(PB-fh-5)+'" font-size="10" fill="#C0392B" text-anchor="middle" font-weight="700">'+Math.round(f)+'</text>';
  return s;
}
_itvTemplates.T_moving_avg=function(it, instId){
  var p=it.params||{};
  var series=((p.series&&p.series.length)?p.series:[100,120,110,130,150]).map(Number);
  var n=Math.min(p.n||3, series.length);
  var RC=p.recency||{min:1,max:3,step:0.1,default:2};
  var last=series.slice(series.length-n);
  window._itvReg[instId]={template:'T_moving_avg', series:series, n:n, last:last, defaultVal:(RC.default!=null?RC.default:2)};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var def='<div class="itv-def">다음 기 예측에는 <b>직전 '+n+'기</b>의 실제값만 쓴다. 최근 기에 줄 가중치를 키울수록(k↑) 최근 추세를 더 빨리 반영한다. <b>가중치의 합은 1</b>이다.</div>';
  var svg='<svg class="itv-svg" id="'+instId+'_svg" viewBox="0 0 560 195" role="img"></svg>';
  var ctrl='<div class="itv-ctrl"><label>최근 가중 k</label>'
    +'<input type="range" min="'+RC.min+'" max="'+RC.max+'" step="'+RC.step+'" value="'+(RC.default!=null?RC.default:2)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_kv">'+Number(RC.default!=null?RC.default:2).toFixed(1)+'</span></div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">가중치(오래된→최근)</div><div class="v" id="'+instId+'_w" style="font-size:14px">—</div></div>'
    +'<div class="itv-card"><div class="t">다음 기 예측값</div><div class="v" id="'+instId+'_f">—</div></div></div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+svg+ctrl+cards+say+'</div>';
};
_itvUpdaters.T_moving_avg=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var k=parseFloat(rawVal); if(isNaN(k)||k<=0) k=1;
  var w=_itvMAWeights(P.n,k), f=_itvMAForecast(P.last,w);
  var kv=d.querySelector('#'+instId+'_kv'); if(kv) kv.textContent=k.toFixed(1);
  var sv=d.querySelector('#'+instId+'_svg'); if(sv) sv.innerHTML=_itvMASVG(P,w,f);
  var wv=d.querySelector('#'+instId+'_w'); if(wv) wv.textContent=w.map(function(x){return (x*100).toFixed(0)+'%';}).join(' · ');
  var fv=d.querySelector('#'+instId+'_f'); if(fv) fv.textContent=f.toFixed(1);
  var nt=d.querySelector('#'+instId+'_note'); if(nt) nt.innerHTML='k='+k.toFixed(1)+'이면 가중치는 <b>'+w.map(function(x){return (x*100).toFixed(0)+'%';}).join('·')+'</b>(오래된→최근), 예측값은 <b class="itv-k">'+f.toFixed(1)+'</b>이다. k를 키우면 최근 값에 더 쏠려 최근 추세를 빨리 따라간다.';
};

/* ================= 추가 템플릿: T_price_index (가중 물가지수) ================= */
/* 물가지수 = 품목별 소비 비중(가중치)으로 가격변화를 가중평균한 값. 비중 큰 품목의 가격변화가 지수를 더 크게 움직인다. */
function _itvPI(items){ var ws=0,acc=0; items.forEach(function(x){ ws+=x.weight; acc+=x.weight*(1+x.change/100); }); return ws?100*acc/ws:100; }
function _itvPISVG(items,si){
  var PL=45,PB=110,PW=500,bw=PW/items.length,s='',mxW=Math.max.apply(null,items.map(function(x){return x.weight;}));
  s+='<line x1="'+PL+'" y1="'+PB+'" x2="'+(PL+PW)+'" y2="'+PB+'" stroke="#94A3B8" stroke-width="1.3"/>';
  items.forEach(function(x,i){ var h=x.weight/mxW*80, xx=PL+i*bw+bw*0.2, wd=bw*0.6;
    s+='<rect x="'+xx+'" y="'+(PB-h)+'" width="'+wd+'" height="'+h+'" rx="3" fill="'+(i===si?'#C0392B':'#2563EB')+'" opacity="0.85"/>';
    s+='<text x="'+(xx+wd/2)+'" y="'+(PB+15)+'" font-size="10" fill="#64748B" text-anchor="middle">'+_itvEsc(x.name)+'</text>';
    s+='<text x="'+(xx+wd/2)+'" y="'+(PB-h-5)+'" font-size="9" fill="#475569" text-anchor="middle">비중'+x.weight+'% '+(x.change>=0?'+':'')+x.change+'%</text>';
  });
  return s;
}
_itvTemplates.T_price_index=function(it, instId){
  var p=it.params||{};
  var items=((p.items&&p.items.length)?p.items:[{name:'식료품',weight:40,change:5},{name:'주거',weight:35,change:3},{name:'교통',weight:25,change:2}]).map(function(x){return {name:x.name,weight:+x.weight,change:+x.change};});
  var si=(p.sliderItem!=null?p.sliderItem:0); if(si<0||si>=items.length) si=0;
  var SC=p.slider||{min:-10,max:20,step:1,default:items[si].change};
  window._itvReg[instId]={template:'T_price_index', items:items, si:si, defaultVal:(SC.default!=null?SC.default:0)};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var def='<div class="itv-def">물가지수는 품목별 <b>소비 비중(가중치)</b>으로 가격변화를 가중평균한 값이다. 지출이 큰 품목의 가격이 오르면 지수가 더 크게 움직인다. 아래에서 <b>'+_itvEsc(items[si].name)+'</b>의 가격변화를 움직여 보라.</div>';
  var svg='<svg class="itv-svg" id="'+instId+'_svg" viewBox="0 0 560 145" role="img"></svg>';
  var ctrl='<div class="itv-ctrl"><label>'+_itvEsc(items[si].name)+' 가격변화(%)</label>'
    +'<input type="range" min="'+SC.min+'" max="'+SC.max+'" step="'+SC.step+'" value="'+(SC.default!=null?SC.default:0)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_cv">'+(SC.default!=null?SC.default:0)+'%</span></div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">가중 물가지수(기준 100)</div><div class="v" id="'+instId+'_idx">—</div></div></div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+svg+ctrl+cards+say+'</div>';
};
_itvUpdaters.T_price_index=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var c=parseFloat(rawVal); if(isNaN(c)) c=0;
  P.items[P.si].change=c;
  var idx=_itvPI(P.items);
  var cv=d.querySelector('#'+instId+'_cv'); if(cv) cv.textContent=(c>=0?'+':'')+c+'%';
  var sv=d.querySelector('#'+instId+'_svg'); if(sv) sv.innerHTML=_itvPISVG(P.items,P.si);
  var ix=d.querySelector('#'+instId+'_idx'); if(ix) ix.textContent=idx.toFixed(2);
  var nt=d.querySelector('#'+instId+'_note'); if(nt) nt.innerHTML='비중 '+P.items[P.si].weight+'%인 <b>'+_itvEsc(P.items[P.si].name)+'</b>의 가격이 '+(c>=0?'+':'')+c+'%면 지수는 <b class="itv-k">'+idx.toFixed(2)+'</b>다. 같은 가격변화라도 비중이 큰 품목일수록 지수를 더 크게 움직인다.';
};

/* ================= 추가 템플릿: T_pred_value (예측도 PPV·NPV) ================= */
/* 민감도·특이도가 같아도 유병률(사전확률)이 낮으면 양성예측도(PPV)가 크게 떨어진다. 2×2 분할표로 확인. */
function _itvPV(sens,spec,prev,N){
  var dis=N*prev, well=N*(1-prev);
  var TP=dis*sens, FN=dis*(1-sens), TN=well*spec, FP=well*(1-spec);
  var PPV=(TP+FP)?TP/(TP+FP):0, NPV=(TN+FN)?TN/(TN+FN):0;
  return {TP:TP,FN:FN,TN:TN,FP:FP,PPV:PPV,NPV:NPV};
}
function _itvPVSVG(r,si){
  function C(x,y,w,h,fill,lab,val){ return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="4" fill="'+fill+'" opacity="0.88"/>'
    +'<text x="'+(x+w/2)+'" y="'+(y+h/2-4)+'" font-size="11" fill="#fff" text-anchor="middle">'+lab+'</text>'
    +'<text x="'+(x+w/2)+'" y="'+(y+h/2+13)+'" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">'+val+'</text>'; }
  var x0=150,y0=30,cw=170,ch=55,gap=8;
  var s='';
  s+='<text x="'+(x0+cw/2)+'" y="20" font-size="10" fill="#475569" text-anchor="middle">질환 있음</text>';
  s+='<text x="'+(x0+cw+gap+cw/2)+'" y="20" font-size="10" fill="#475569" text-anchor="middle">질환 없음</text>';
  s+='<text x="'+(x0-8)+'" y="'+(y0+ch/2+4)+'" font-size="10" fill="#475569" text-anchor="end">검사 양성</text>';
  s+='<text x="'+(x0-8)+'" y="'+(y0+ch+gap+ch/2+4)+'" font-size="10" fill="#475569" text-anchor="end">검사 음성</text>';
  s+=C(x0,y0,cw,ch,'#2563EB','진양성 TP',Math.round(r.TP));
  s+=C(x0+cw+gap,y0,cw,ch,'#EF4444','가양성 FP',Math.round(r.FP));
  s+=C(x0,y0+ch+gap,cw,ch,'#F59E0B','가음성 FN',Math.round(r.FN));
  s+=C(x0+cw+gap,y0+ch+gap,cw,ch,'#10B981','진음성 TN',Math.round(r.TN));
  return s;
}
_itvTemplates.T_pred_value=function(it, instId){
  var p=it.params||{};
  var sens=(p.sens!=null?p.sens:0.90), spec=(p.spec!=null?p.spec:0.90), N=(p.N||1000);
  var PC=p.prevalence||{min:1,max:50,step:1,default:10};
  var prev0=(PC.default!=null?PC.default:10)/100;
  window._itvReg[instId]={template:'T_pred_value', sens:sens, spec:spec, N:N, defaultVal:(PC.default!=null?PC.default:10)};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var def='<div class="itv-def">민감도 '+Math.round(sens*100)+'%, 특이도 '+Math.round(spec*100)+'%로 고정된 검사다. <b>유병률(질환자 비율)</b>을 움직여 보라. 민감도·특이도가 같아도 유병률이 낮으면 <b>양성예측도(PPV)</b>가 크게 떨어진다.</div>';
  var svg='<svg class="itv-svg" id="'+instId+'_svg" viewBox="0 0 560 165" role="img"></svg>';
  var ctrl='<div class="itv-ctrl"><label>유병률(%)</label>'
    +'<input type="range" min="'+PC.min+'" max="'+PC.max+'" step="'+PC.step+'" value="'+(PC.default!=null?PC.default:10)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_pv">'+(PC.default!=null?PC.default:10)+'%</span></div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">양성예측도 PPV</div><div class="v" id="'+instId+'_ppv">—</div></div>'
    +'<div class="itv-card"><div class="t">음성예측도 NPV</div><div class="v" id="'+instId+'_npv">—</div></div></div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+svg+ctrl+cards+say+'</div>';
};
_itvUpdaters.T_pred_value=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var pr=parseFloat(rawVal); if(isNaN(pr)) pr=10; if(pr<0) pr=0; if(pr>100) pr=100;
  var r=_itvPV(P.sens,P.spec,pr/100,P.N);
  var pv=d.querySelector('#'+instId+'_pv'); if(pv) pv.textContent=pr+'%';
  var sv=d.querySelector('#'+instId+'_svg'); if(sv) sv.innerHTML=_itvPVSVG(r);
  var pp=d.querySelector('#'+instId+'_ppv'); if(pp) pp.textContent=(r.PPV*100).toFixed(1)+'%';
  var np=d.querySelector('#'+instId+'_npv'); if(np) np.textContent=(r.NPV*100).toFixed(1)+'%';
  var nt=d.querySelector('#'+instId+'_note'); if(nt) nt.innerHTML='유병률 '+pr+'%면 PPV는 <b class="itv-k">'+(r.PPV*100).toFixed(1)+'%</b>, NPV는 <b>'+(r.NPV*100).toFixed(1)+'%</b>다. 유병률이 낮을수록 양성이 나와도 실제 환자일 확률(PPV)이 낮아진다.';
};

/* ================= 추가 템플릿: T_weighted_mean (가중평균·평균의 종류) ================= */
/* 가중평균 = Σ(값×사례수) ÷ Σ사례수. 사례수가 많은 집단의 값이 평균을 더 끌어당긴다. */
function _itvWM(groups){ var ws=0,acc=0; groups.forEach(function(g){ ws+=g.count; acc+=g.value*g.count; }); return ws?acc/ws:0; }
function _itvWMSVG(groups,mean,si){
  var PL=45,PB=115,PW=500,bw=PW/groups.length,s='',mxV=Math.max.apply(null,groups.map(function(g){return g.value;}))||1;
  s+='<line x1="'+PL+'" y1="'+PB+'" x2="'+(PL+PW)+'" y2="'+PB+'" stroke="#94A3B8" stroke-width="1.3"/>';
  var my=PB-mean/mxV*90;
  s+='<line x1="'+PL+'" y1="'+my+'" x2="'+(PL+PW)+'" y2="'+my+'" stroke="#C0392B" stroke-width="1.5" stroke-dasharray="5 4"/>';
  s+='<text x="'+(PL+PW)+'" y="'+(my-4)+'" font-size="10" fill="#C0392B" text-anchor="end">가중평균 '+mean.toFixed(1)+'</text>';
  groups.forEach(function(g,i){ var h=g.value/mxV*90, xx=PL+i*bw+bw*0.2, wd=bw*0.6;
    s+='<rect x="'+xx+'" y="'+(PB-h)+'" width="'+wd+'" height="'+h+'" rx="3" fill="'+(i===si?'#C0392B':'#2563EB')+'" opacity="0.85"/>';
    s+='<text x="'+(xx+wd/2)+'" y="'+(PB+14)+'" font-size="10" fill="#64748B" text-anchor="middle">'+_itvEsc(g.name)+'</text>';
    s+='<text x="'+(xx+wd/2)+'" y="'+(PB-h-5)+'" font-size="9" fill="#475569" text-anchor="middle">값'+g.value+' ·n'+g.count+'</text>';
  });
  return s;
}
_itvTemplates.T_weighted_mean=function(it, instId){
  var p=it.params||{};
  var groups=((p.groups&&p.groups.length)?p.groups:[{name:'A집단',value:60,count:20},{name:'B집단',value:75,count:50},{name:'C집단',value:90,count:30}]).map(function(g){return {name:g.name,value:+g.value,count:+g.count};});
  var si=(p.sliderGroup!=null?p.sliderGroup:1); if(si<0||si>=groups.length) si=0;
  var SC=p.slider||{min:0,max:100,step:5,default:groups[si].count};
  window._itvReg[instId]={template:'T_weighted_mean', groups:groups, si:si, defaultVal:(SC.default!=null?SC.default:groups[si].count)};
  var ti=(it.title||it.name)?'<div class="itv-ti">'+_itvEsc(it.title||it.name)+'</div>':'';
  var def='<div class="itv-def">가중평균은 <b>Σ(값×사례수) ÷ Σ사례수</b>다. 사례수(비중)가 큰 집단의 값이 평균을 더 강하게 끌어당긴다. <b>'+_itvEsc(groups[si].name)+'</b>의 사례수를 움직여 보라.</div>';
  var svg='<svg class="itv-svg" id="'+instId+'_svg" viewBox="0 0 560 140" role="img"></svg>';
  var ctrl='<div class="itv-ctrl"><label>'+_itvEsc(groups[si].name)+' 사례수(n)</label>'
    +'<input type="range" min="'+SC.min+'" max="'+SC.max+'" step="'+SC.step+'" value="'+(SC.default!=null?SC.default:groups[si].count)+'" oninput="itvUpdate(\''+instId+'\',this.value)">'
    +'<div class="itv-rate"><span id="'+instId+'_nv">'+(SC.default!=null?SC.default:groups[si].count)+'</span></div></div>';
  var cards='<div class="itv-cards"><div class="itv-card"><div class="t">가중평균</div><div class="v" id="'+instId+'_wm">—</div></div>'
    +'<div class="itv-card"><div class="t">단순평균(비교)</div><div class="v" id="'+instId+'_sm">—</div></div></div>';
  var say='<div class="itv-say"><div class="h" id="'+instId+'_note">—</div></div>';
  return '<div class="itv-box" id="'+instId+'">'+ti+def+svg+ctrl+cards+say+'</div>';
};
_itvUpdaters.T_weighted_mean=function(instId, rawVal, P){
  var d=document.getElementById(instId); if(!d) return;
  var n=parseFloat(rawVal); if(isNaN(n)||n<0) n=0;
  P.groups[P.si].count=n;
  var wm=_itvWM(P.groups);
  var sm=P.groups.reduce(function(a,g){return a+g.value;},0)/P.groups.length;
  var nv=d.querySelector('#'+instId+'_nv'); if(nv) nv.textContent=n;
  var sv=d.querySelector('#'+instId+'_svg'); if(sv) sv.innerHTML=_itvWMSVG(P.groups,wm,P.si);
  var wmv=d.querySelector('#'+instId+'_wm'); if(wmv) wmv.textContent=wm.toFixed(1);
  var smv=d.querySelector('#'+instId+'_sm'); if(smv) smv.textContent=sm.toFixed(1);
  var nt=d.querySelector('#'+instId+'_note'); if(nt) nt.innerHTML='<b>'+_itvEsc(P.groups[P.si].name)+'</b>의 사례수가 '+n+'이면 가중평균은 <b class="itv-k">'+wm.toFixed(1)+'</b>다. 사례수가 큰 집단 쪽으로 평균이 끌려간다(단순평균 '+sm.toFixed(1)+'과 비교).';
};
