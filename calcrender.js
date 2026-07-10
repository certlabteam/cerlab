/* ============================================================
   CertLab 계산형(CALC) 해설 렌더 — index.html · preview.html 공유 모듈
   요약풀이(기본) + 상세풀이(토글) + 접근·원리 + 암기 포인트.
   전역 노출: certlabCalcHTML(q, exArr, rm) · certlabRecallHTML(q, rm) · calcToggle(btn,id)
   의존: rm(text,q) = 각 페이지의 renderMath 함수(인자로 받음).
   하위호환: exp.exSum 없으면 기존처럼 단일 풀이 박스.
   ============================================================ */
(function(){
  // ①②③ 마커가 한 항목에 2개 이상 뭉치면 마커·결과문 앞에서 줄 분리(데이터 무수정 교정)
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

  function _renderInner(arr, q, rm){
    var _ex=_splitSteps((arr||[]).filter(Boolean)).map(function(l){ return rm(String(l),q); });
    var _hasNum=_ex.some(function(s){ return /^\s*([①-⑳]|\d+\s*[.)])/.test(s); });
    if(_hasNum){
      return '<div style="font-weight:800;color:#8A5A00">풀이)</div>'+_ex.map(function(s,i){
        return _isArrow(s) ? '<div class="calc-arrow">'+s+'</div>'
             : '<div style="font-weight:400;margin-top:'+(i===0?'5px':'4px')+'">'+s+'</div>';
      }).join('');
    }
    return _ex.map(function(s,i){
      return _isArrow(s) ? '<div class="calc-arrow">'+s+'</div>'
           : '<div style="font-weight:400;margin-top:'+(i===0?'0':'4px')+'">'
             +(i===0?'<b style="font-weight:800;color:#8A5A00">풀이) </b>':'')+s+'</div>';
    }).join('');
  }

  var _BOX='margin:8px 0 0;padding:12px 14px;background:#FFF6E9;border:1px solid #F1D9A8;border-radius:10px;font-size:13px;color:#5E4A2A;line-height:1.8;word-break:keep-all;overflow-wrap:break-word';

  // 계산형 해설 본문(접근·원리 + 요약/상세). 스텝이 없으면 접근·원리만.
  window.certlabCalcHTML=function(q, exArr, rm){
    var h='', e=(q&&q.exp)||{};
    if(e.approach)  h+='<div class="cx-sec"><span class="cx-h">접근</span><div class="cx-body">'+rm(e.approach,q)+'</div></div>';
    if(e.principle) h+='<div class="cx-sec"><span class="cx-h">원리</span><div class="cx-body">'+rm(e.principle,q)+'</div></div>';
    var steps=(exArr||[]).filter(Boolean);
    if(steps.length){
      var sum=Array.isArray(e.exSum)?e.exSum.filter(Boolean):null;
      if(sum&&sum.length){
        var sid='dt_'+String(q.id||'x').replace(/[^a-zA-Z0-9_]/g,'');
        h+='<div class="cx-sec"><span class="cx-h">요약풀이</span><div class="calc-sol" style="'+_BOX+'">'+_renderInner(sum,q,rm)+'</div></div>'
          +'<button class="detail-toggle" onclick="calcToggle(this,\''+sid+'\')"><span>상세풀이 보기</span><span class="chev">▾</span></button>'
          +'<div class="detail-wrap" id="'+sid+'"><div class="cx-sec" style="margin-top:10px"><span class="cx-h">상세풀이</span><div class="calc-sol" style="'+_BOX+'">'+_renderInner(exArr,q,rm)+'</div></div></div>';
      } else {
        h+='<div class="calc-sol" style="'+_BOX+'">'+_renderInner(exArr,q,rm)+'</div>';
      }
    }
    return h;
  };

  // 암기 포인트(핵심 흐름). 암기코드(mn)와 별개.
  window.certlabRecallHTML=function(q, rm){
    var e=(q&&q.exp)||{};
    return e.recall ? '<div class="cx-recall"><div class="cx-recall-ti">암기 포인트</div><div class="cx-recall-flow">'+rm(e.recall,q)+'</div></div>' : '';
  };

  // 상세풀이 토글
  window.calcToggle=function(btn,id){
    var w=document.getElementById(id); if(!w) return;
    var open=w.classList.toggle('open'); btn.classList.toggle('open');
    var sp=btn.querySelector('span'); if(sp) sp.textContent=open?'상세풀이 접기':'상세풀이 보기';
  };
})();
