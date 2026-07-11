/* ============================================================
   CertLab 계산형(CALC) 해설 렌더 — index.html · preview.html 공유 모듈
   접근·원리 + 요약풀이(기본) + 상세풀이(토글) + 최종정리 + 암기 포인트.
   평면(flat) 레이아웃: 타이틀 + 바로 밑 텍스트. 박스/테두리/배경 없음(구분은 타이틀·글자색).
   전역 노출: certlabCalcHTML(q, exArr, rm) · certlabRecallHTML(q, rm) · calcToggle(btn,id)
   하위호환: exp.exSum 없으면 단일 풀이(박스 없이 텍스트).
   ============================================================ */
(function(){
  function _splitSteps(arr){
    var out=[];
    (arr||[]).forEach(function(it){
      var s=String(it==null?'':it);
      var m=s.match(/[①-⑳]/g);
      if(m&&m.length>=2){
        s.replace(/\s*(?=[①-⑳])/g,'\n').replace(/\s*(?=(?:따라서|그러므로)\s)/g,'\n')
         .split('\n').forEach(function(p){ if(p.trim()) out.push(p.trim()); });
      } else { out.push(it); }
    });
    return out;
  }
  function _isArrow(s){ return /^\s*[↓→]\s*$/.test(String(s).replace(/<[^>]+>/g,'')); }
  function _isSubhead(rendered){
    var plain=String(rendered).replace(/<[^>]+>/g,'').trim();
    return /^\s*([①-⑳]|\d+\s*[.)])/.test(plain) && plain.length<22 && !/[=÷×]/.test(plain);
  }
  // 풀이 단계 렌더 — '풀이)' 라벨 없음(섹션 타이틀이 대신함). 박스 없이 줄만.
  function _renderInner(arr, q, rm){
    var _ex=_splitSteps((arr||[]).filter(Boolean)).map(function(l){ return rm(String(l),q); });
    var out='';
    _ex.forEach(function(s,i){
      var mt=(i===0?'0':'4px');
      if(_isArrow(s)) out+='<div class="calc-arrow">'+s+'</div>';
      else if(_isSubhead(s)) out+='<div class="cs-step" style="margin-top:'+mt+'"><span class="cs-key">'+s+'</span></div>';
      else out+='<div class="cs-step" style="margin-top:'+mt+'">'+s+'</div>';
    });
    return out;
  }

  // 계산형 해설: 접근·원리 + 요약/상세 + 최종정리. 모두 타이틀 + 텍스트(평면).
  window.certlabCalcHTML=function(q, exArr, rm){
    var h='', e=(q&&q.exp)||{};
    if(e.approach)  h+='<div class="cx-sec"><div class="cx-h">접근</div><div class="cx-body">'+rm(e.approach,q)+'</div></div>';
    if(e.principle) h+='<div class="cx-sec"><div class="cx-h">원리</div><div class="cx-body">'+rm(e.principle,q)+'</div></div>';
    var steps=(exArr||[]).filter(Boolean);
    if(steps.length){
      var sum=Array.isArray(e.exSum)?e.exSum.filter(Boolean):null;
      if(sum&&sum.length){
        var sid='dt_'+String(q.id||'x').replace(/[^a-zA-Z0-9_]/g,'');
        h+='<div class="cx-sec"><div class="cx-h">요약풀이</div><div class="calc-sol">'+_renderInner(sum,q,rm)+'</div></div>'
          +'<button class="detail-toggle" onclick="calcToggle(this,\''+sid+'\')"><span class="chev">▶</span><span class="dt-label">상세풀이 보기</span></button>'
          +'<div class="detail-wrap" id="'+sid+'"><div class="calc-sol" style="margin-top:6px">'+_renderInner(exArr,q,rm)+'</div></div>';
        // 최종정리(요약풀이 있을 때) — 타이틀 + 텍스트. 상단 note는 caller가 exSum이면 생략.
        if(e.s) h+='<div class="cx-sec"><div class="cx-h cx-h-final">최종정리</div><div class="cx-body cx-final-body">'+rm(e.s,q)+'</div></div>';
      } else {
        h+='<div class="cx-sec"><div class="calc-sol">'+_renderInner(exArr,q,rm)+'</div></div>';
      }
    }
    return h;
  };

  // 암기 포인트(핵심 흐름). 암기코드(mn)와 별개. 타이틀 + 흐름(평면).
  window.certlabRecallHTML=function(q, rm){
    var e=(q&&q.exp)||{};
    return e.recall ? '<div class="cx-recall"><div class="cx-recall-ti">암기 포인트</div><div class="cx-recall-flow">'+rm(e.recall,q)+'</div></div>' : '';
  };

  // 상세풀이 토글 — ▶ 회전 + 라벨(보기/접기)로 클릭 가능함을 표시
  window.calcToggle=function(btn,id){
    var w=document.getElementById(id); if(!w) return;
    var open=w.classList.toggle('open'); btn.classList.toggle('open');
    var lb=btn.querySelector('.dt-label'); if(lb) lb.textContent=open?'상세풀이 접기':'상세풀이 보기';
  };
})();
