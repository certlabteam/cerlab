/* ===========================================================================
   qc-gate-patch.js — CertLab 검수 게이트 보강분 (2026-07-14)
   qc-core.js 뒤에 <script src>로 추가 로드. window.QC 를 확장한다.

   담는 것 (지금까지 비어 있던 구멍 메움)
   ┌── 마스터(암기) 콘텐츠 검수  ── _qcMnemAudit(mnems)
   │   · MN_DUP        같은 코드(빨강 두문자)를 가진 레코드가 2개 이상  ← 신규 핵심
   │   · MN_DESC_EMPTY 설명(desc) 빈칸
   │   · MN_NO_K       코드에 빨강(<span class="k">) 없음
   │   · MN_DESC_NO_RED 설명에 빨강 대응 글자 없음
   │   · MN_DESC_REDUP 설명 빨강 글자가 코드 두문자와 불일치(누락/초과)
   │   (위 4개는 _QC_DEFAULTS.mnem 에 이름만 있고 구현이 없던 것 — 여기서 구현)
   └── 문항 예시 검수        ── EX_MISSING (per-question)
       · 이론형 객관식인데 장면 예시(exp.ex)가 통째로 비어 있음
         "여과과정의 효과다"처럼 해설 한 줄로 끝나고 예시가 없는 문항을 잡는다.

   설계 원칙: 기존 qc-core 규약 그대로 — _qcOn/_qcN 설정 훅, {kind,code,field,msg},
   _qcApplySev 로 치명도 부여. 소급 폭증 방지 위해 전부 WARNING(비차단)으로 도입.
   =========================================================================== */
(function () {
  if (typeof window === 'undefined' || !window.QC) { try{ console.warn('[QC patch] window.QC 없음 — qc-core.js 이후 로드 필요'); }catch(e){} return; }
  var QC = window.QC;
  var _on  = (typeof _qcOn === 'function')  ? _qcOn  : function(){ return true; };
  var _num = (typeof _qcN  === 'function')  ? _qcN   : function(s,c,p,d){ return d; };
  var _sev = (typeof _qcApplySev==='function') ? _qcApplySev : function(v){ return v; };
  var STRIP = /<[^>]+>/g;
  /* 빨강 표기 두 관례 모두 지원: <span class="k">X</span> 와 축약형 <k>X</k> */
  var RED = /<span\s+class=["']k["']\s*>([\s\S]*?)<\/span>|<k>([\s\S]*?)<\/k>/g;

  function strip(s){ return String(s||'').replace(STRIP,'').trim(); }
  /* 빨강 글자 추출. code는 "<span class=k>영·투·재</span>"처럼 통짜 한 span에
     가운뎃점으로 여러 글자가 들어오고, desc는 글자별 span으로 쪼개져 온다.
     양쪽을 같은 기준으로 비교하려면 잡은 조각을 ·,·공백·중점으로 다시 분해해 평탄화한다. */
  function redLetters(s){
    var out=[], m; RED.lastIndex=0;
    while((m=RED.exec(String(s||'')))){
      var chunk = (m[1]!=null?m[1]:m[2]);   /* <span class=k> 또는 <k> 캡처 */
      strip(chunk).split(/[·・,\s/]+/).forEach(function(t){ t=t.trim(); if(t) out.push(t); });
    }
    return out;
  }

  /* ---- 설정 기본값 병합(있으면 유지) ---- */
  try{
    if (typeof _QC_DEFAULTS!=='undefined' && _QC_DEFAULTS){
      _QC_DEFAULTS.mnem = _QC_DEFAULTS.mnem || {};
      var mdef={ MN_DUP:{on:true}, MN_DESC_EMPTY:{on:true}, MN_NO_K:{on:true}, MN_DESC_NO_RED:{on:true}, MN_DESC_REDUP:{on:true} };
      for (var k in mdef){ if(!_QC_DEFAULTS.mnem[k]) _QC_DEFAULTS.mnem[k]=mdef[k]; }
      _QC_DEFAULTS.gichul = _QC_DEFAULTS.gichul || {};
      if(!_QC_DEFAULTS.gichul.EX_MISSING) _QC_DEFAULTS.gichul.EX_MISSING={on:true};
      if(!_QC_DEFAULTS.gichul.O_SHORT) _QC_DEFAULTS.gichul.O_SHORT={on:true,minChars:30};
      if(!_QC_DEFAULTS.gichul.VERDICT_FILL_EXEMPT) _QC_DEFAULTS.gichul.VERDICT_FILL_EXEMPT={on:true};
      if(!_QC_DEFAULTS.gichul.O_COPY) _QC_DEFAULTS.gichul.O_COPY={on:true,minRun:6};
    }
  }catch(e){}

  /* ==========================================================================
     1) 암기 마스터 콘텐츠 검수 — _qcMnemAudit(mnems)
     mnems: 배열([{id,code,desc,...}]) 또는 {mnemonics:[...]} 둘 다 허용.
     반환: 위반 배열([{kind,code,field,id,msg,text,sev}])
     ========================================================================== */
  function _qcMnemAudit(mnems){
    var list = Array.isArray(mnems) ? mnems : ((mnems&&mnems.mnemonics)||[]);
    var v = [];

    /* (A) MN_DUP — 진짜 중복만. [2026-07-14 정정] '같은 코드'는 중복이 아니다:
       같은 두문자(예: 직·간·이)를 서로 다른 개념(정책수단 vs 표준건축비)에 재사용하는 것은 정상.
       코드 '와' 설명(desc)이 '둘 다 완전 동일'할 때만 내용상 중복 후보로 본다. 그마저도 서로
       다른 개념에 걸렸으면 삭제가 아니라 '개념 통합 검토' 대상 → INFO성 경고로만 남긴다. */
    if (_on('mnem','MN_DUP')){
      var byCD = {};
      list.forEach(function(m){ var c=strip(m&&m.code), dd=strip(m&&m.desc); if(!c) return; var k=c+''+dd; (byCD[k]=byCD[k]||[]).push(m); });
      Object.keys(byCD).forEach(function(k){
        var g = byCD[k]; if (g.length < 2) return;
        var c = strip(g[0].code);
        var ids = g.map(function(m){ return m.id; });
        g.forEach(function(m, i){
          if (i === 0) return; /* 대표 1건 외 나머지에만 지적 */
          v.push({ kind:'warn', field:'desc', idx:0, code:'MN_DUP', id:m.id,
            msg:'코드·설명이 완전히 같은 암기가 '+g.length+'건('+ids.join(' · ')+') — 서로 다른 개념에 걸렸는지 확인 후, 같은 개념이면 하나로 통합(참조 remap). 단순히 코드만 같은 것은 중복 아님',
            text:ids.join(' · ') });
        });
      });
    }

    /* (B~E) 레코드별 콘텐츠 검수 */
    list.forEach(function(m){
      if(!m) return;
      var code = String(m.code||''), desc = String(m.desc||'');
      var codeRed = redLetters(code), descRed = redLetters(desc);

      if (_on('mnem','MN_DESC_EMPTY') && !strip(desc))
        v.push({ kind:'warn', field:'desc', idx:0, code:'MN_DESC_EMPTY', id:m.id,
          msg:'암기 설명(desc)이 비어 있음 — 코드 두문자가 각각 무엇인지 desc로 풀어야 함', text:strip(code) });

      if (_on('mnem','MN_NO_K') && !codeRed.length)
        v.push({ kind:'warn', field:'code', idx:0, code:'MN_NO_K', id:m.id,
          msg:'코드에 빨강(<span class="k">) 두문자 표시 없음 — 외울 글자를 <span class="k">글자</span>로', text:strip(code) });

      if (strip(desc)){
        if (_on('mnem','MN_DESC_NO_RED') && codeRed.length && !descRed.length)
          v.push({ kind:'warn', field:'desc', idx:0, code:'MN_DESC_NO_RED', id:m.id,
            msg:'설명(desc)에 빨강 대응 글자가 하나도 없음 — 코드 두문자에 해당하는 글자를 desc에서도 빨강 처리', text:strip(desc).slice(0,60) });

        /* MN_DESC_REDUP: 코드 빨강 두문자가 desc에서도 빨강으로 대응되는지.
           주의 — code는 "<span class=k>테성인IGF</span>"처럼 구분자 없이 한 span에 여러 글자를
           넣기도 해서 토큰 경계가 불안정하다. 그래서 '한글 음절' 단위로만 비교한다
           (영문 약자 IGF 등 ASCII는 경계 모호 → 검사 제외). 코드 한글 두문자 중 desc 빨강에
           없는 것만 '누락'으로 잡는다. 한글이 없으면(순 ASCII 코드) 스킵. */
        if (_on('mnem','MN_DESC_REDUP')){
          var HAN=/[가-힣]/g;
          var codeHan=(codeRed.join('').match(HAN)||[]);
          var descHanSet={}; (descRed.join('').match(HAN)||[]).forEach(function(ch){ descHanSet[ch]=1; });
          if (codeHan.length){
            var missSet={}; codeHan.forEach(function(ch){ if(!descHanSet[ch]) missSet[ch]=1; });
            var miss=Object.keys(missSet);
            if (miss.length)
              v.push({ kind:'warn', field:'desc', idx:0, code:'MN_DESC_REDUP', id:m.id,
                msg:'코드 빨강 두문자 중 설명(desc)에서 빨강 처리 안 된 글자: '+miss.join(',')
                    +' (코드 두문자 = 설명 빨강 전수 일치)', text:strip(desc).slice(0,60) });
          }
        }
      }
    });

    _sev(v);
    return v;
  }

  /* ==========================================================================
     2) 문항 예시 누락 — EX_MISSING (per-question)
     이론형 객관식(isMCQ && !계산형)인데 exp.ex 채워진 원소가 0개 → 예시 없음.
     계산형(ex=풀이단계)·단답/빈칸(SA)·전항형은 제외. WARNING(비차단).
     ========================================================================== */
  function _qcExMissing(q){
    var v=[], exp=(q&&q.exp)||{}, o=exp.o||[], ex=exp.ex||[];
    if(!_on('gichul','EX_MISSING')) return v;
    var opts=(q&&Array.isArray(q.opts))?q.opts:[];
    var isSAq=Array.isArray(q&&q.blanks)&&q.blanks.length;
    var oFilled=o.filter(function(x){return x&&String(x).trim();}).length;
    var isMCQ=opts.length && oFilled>=1 && !isSAq;
    if(!isMCQ) return v;
    /* 계산형 제외 — 계산형은 정답칸 '풀이'가 예시 역할을 하므로 장면 예시를 따로 요구하지 않는다.
       (a) qc-core _isCalcQ(해설 1칸+풀이단계) + (b) 해설 여러 칸이라 태그가 안 붙어도 계산 신호가
       뚜렷한 문항(함수·P=·균형가격·승수·수익률·계산·얼마인가 등)도 계산형으로 보아 제외. */
    var isCalc=(typeof _isCalcQ==='function') ? _isCalcQ(q) : false;
    if(isCalc) return v;
    if(q&&q.calc===true) return v;
    var _qtxt=String((q&&q.q)||'')+' '+((q&&q.opts)||[]).join(' ');
    if(/함수|균형\s*가격|[A-Za-z]\s*=\s*[^=]*[+\-*/]|Q[ds]?\s*=|승수|현재가치|내부수익률|자본환원|환원이율|LTV|DTI|DSR|탄력성.{0,6}(값|계산|=)|계산하면|얼마(인가|나)/.test(_qtxt)) return v;
    var exFilled=ex.filter(function(x){return x&&String(x).trim();}).length;
    if(exFilled===0){
      var cert=(q&&(q.cert||q.docId))||'';
      v.push({ kind:'warn', field:'ex', idx:0, code:'EX_MISSING',
        msg:'이론형 객관식인데 장면 예시(exp.ex)가 통째로 비어 있음 — 예시는 예외 없이 모두 넣는다(개념을 실생활 장면으로 1개)'
            +(cert?(' ['+cert+']'):''), text:'' });
    }
    _sev(v);
    return v;
  }

  /* ==========================================================================
     3) 해설 길이 하한 — O_SHORT (per-question)
     이론형 객관식 해설(exp.o) 원소가 사실+판정만 있고 이유가 없어 너무 짧은 것을 잡는다.
     기본 하한 30자(태그 제외). 계산형·단답/빈칸 제외. 표/조합 통짜 원소(| 2개+ 또는 여러 줄)는
     여러 진술을 한 칸에 몰아넣은 것이라 길이검사 제외. WARNING(비차단)·임계값 조정 가능.
     ========================================================================== */
  function _qcOShort(q){
    var v=[], exp=(q&&q.exp)||{}, o=exp.o||[];
    if(!_on('gichul','O_SHORT')) return v;
    var opts=(q&&Array.isArray(q.opts))?q.opts:[];
    var isSAq=Array.isArray(q&&q.blanks)&&q.blanks.length;
    var oFilled=o.filter(function(x){return x&&String(x).trim();}).length;
    var isMCQ=opts.length && oFilled>=1 && !isSAq;
    if(!isMCQ) return v;
    if((typeof _isCalcQ==='function') && _isCalcQ(q)) return v;
    var min=_num('gichul','O_SHORT','minChars',30);
    o.forEach(function(t,i){
      if(!(t&&String(t).trim())) return;
      var s=String(t);
      if((s.match(/\|/g)||[]).length>=2 || s.split(/\n/).filter(function(l){return l.trim();}).length>=2) return; /* 표/조합 통짜 */
      var L=strip(s).length;
      if(L<min)
        v.push({ kind:'warn', field:'o', idx:i, code:'O_SHORT',
          msg:'해설(o)이 '+L+'자('+min+'자 미만) — 사실·판정만 있고 "왜"가 없음. 근거·이유를 붙여 설명', text:strip(s).slice(0,50) });
    });
    _sev(v);
    return v;
  }

  /* ==========================================================================
     3b) O_COPY — 해설이 보기 문장을 그대로 베낌 (qc-core O_ECHO_OPT의 '설명으로 옳' 과다면제 보완)
     qc-core는 발문에 "설명으로 옳"이 있으면 베끼기 검사를 통째로 건너뛴다 → "~에 관한 설명으로
     옳지 않은 것은?"이라는 가장 흔한 발문이 전부 면제돼 해설=선지 복붙이 안 걸린다.
     여기선 좁은 '식별형'(밑줄·이 인물·(가) 등)만 면제하고, 선지와 연속 N어절 일치 + 덧붙인 근거가
     거의 없을 때(길이비 낮음) 지적한다. WARNING. */
  function _qgStripVd(s){ var p=String(s||'').split(/\.\s+/); while(p.length>1){ var last=p[p.length-1]; if(/(옳다|옳지\s*않다|적절하다|적절하지\s*않다|부적절하다|맞다|틀리다|틀린다|정답)/.test(last)) p.pop(); else break; } return p.join('. '); }
  function _qgWords(s){ return String(s||'').replace(/[.,·]/g,' ').split(/\s+/).filter(Boolean); }
  function _qgRun(a,b){ var A=_qgWords(a),B=_qgWords(b),best=0; for(var i=0;i<A.length;i++)for(var j=0;j<B.length;j++){ var k=0; while(A[i+k]&&A[i+k]===B[j+k])k++; if(k>best)best=k; } return best; }
  function _qcOCopy(q){
    var v=[], exp=(q&&q.exp)||{}, o=exp.o||[], opts=Array.isArray(q&&q.opts)?q.opts:[];
    if(!_on('gichul','O_COPY')) return v;
    var isSAq=Array.isArray(q&&q.blanks)&&q.blanks.length;
    var oFilled=o.filter(function(x){return x&&String(x).trim();}).length;
    if(!(opts.length && oFilled>=1 && !isSAq)) return v;
    if((typeof _isCalcQ==='function') && _isCalcQ(q)) return v;
    /* 좁은 식별형만 면제 — '설명으로 옳'은 제외(그게 과다면제의 원인) */
    var idQ=/밑줄|이\s*인물|이\s*단체|이\s*나라|이\s*왕|활동으로\s*옳|한\s*일로\s*옳/.test(String((q&&q.q)||''));
    if(idQ) return v;
    /* [2026-07-14 수정] '숫자 있으면 통째 면제'는 과소탐이었다(제203조·5년 등 든 복붙 388칸 놓침).
       계산형(수치검증이 정상인 문항)만 면제로 좁힌다. */
    if((typeof _isCalcQ==='function') && _isCalcQ(q)) return v;
    if(q&&q.calc===true) return v;
    var _qtxt=String((q&&q.q)||'')+' '+opts.join(' ');
    if(/함수|균형\s*가격|[A-Za-z]\s*=\s*[^=]*[+\-*/]|승수|현재가치|내부수익률|자본환원|환원이율|LTV|DTI|DSR|계산하면|얼마(인가|나)/.test(_qtxt)) return v;
    var min=_num('gichul','O_COPY','minRun',6);
    o.forEach(function(t,i){
      var op=opts[i]; if(!(t&&String(t).trim())||!op) return;
      var so=strip(t), sop=strip(op); if(sop.length<10) return;
      if(/^[ㄱ-ㅎ]/.test(sop.trim())) return; /* 조합형 마커 보기 스킵 */
      if(/[=×÷]|\d\s*[+\-*/]\s*\d/.test(so)) return; /* 이 칸이 실제 산술이면 베끼기 아님 */
      var core=_qgStripVd(so);
      var run=_qgRun(sop, core);
      if(run>=min && core.length < sop.length*1.6) /* 근거 덧붙임이 거의 없을 때만 */
        v.push({ kind:'warn', field:'o', idx:i, code:'O_COPY',
          msg:'해설이 보기 문장을 그대로 베낌(연속 '+run+'어절 일치, 덧붙인 근거 거의 없음) — 베끼지 말고 "왜" 맞고/틀리는지 근거로 풀 것', text:so.slice(0,50) });
    });
    _sev(v);
    return v;
  }

  /* ==========================================================================
     4) VERDICT 오발동 예외 — 빈칸채우기·표/조문형 해설
     qc-core의 VERDICT(해설이 옳다/옳지 않다로 안 맺음)는 O/X 판정형 전제인데,
     "( )에 들어갈 …" 빈칸채우기형은 해설이 판정어가 아니라 답(ㄱ:500, ㄴ:…)으로,
     표/조문 매칭형(| 구분)은 여러 진술을 한 칸에 담아 끝나는 게 정상이다.
     이런 형식에서 뜨는 VERDICT block은 콘텐츠 결함이 아니라 게이트 과발동 → 면제한다.
     (좁은 예외: 빈칸형 문두 또는 표/여러줄 원소만. 일반 O/X 판정 누락은 그대로 잡음.) */
  function _qcVerdictExempt(q, idx){
    if(!_on('gichul','VERDICT_FILL_EXEMPT')) return false;
    var qq=String((q&&q.q)||'');
    var fillStem = /\(\s*[ㄱ-ㅎ가-힣]?\s*\)/.test(qq) && /들어갈|알맞은|순서|나열|바르게/.test(qq);
    if(fillStem) return true;
    var o=(q&&q.exp&&q.exp.o)||[]; var el=String(o[idx]||'');
    var tabley=(el.match(/\|/g)||[]).length>=2 || el.split(/\n/).filter(function(l){return l.trim();}).length>=2;
    return tabley;
  }

  /* ---- per-question 위반 래퍼: EX_MISSING·O_SHORT 합류 + VERDICT 예외 필터(본체 무수정) ---- */
  if (typeof QC.violations === 'function'){
    var _base = QC.violations;
    QC.violations = function(q){
      var v = _base(q) || [];
      try{ v = v.filter(function(x){ return !(x.code==='VERDICT' && _qcVerdictExempt(q, x.idx)); }); }catch(e){}
      /* [dia]…[/dia] 관계도는 여러 줄이 정상 → 그 예시 원소의 EX_MULTILINE·EX_STEPS_NOBR 면제 */
      try{ v = v.filter(function(x){ if(x.code!=='EX_MULTILINE'&&x.code!=='EX_STEPS_NOBR') return true; var ex=(q&&q.exp&&q.exp.ex)||[]; return !/\[dia\][\s\S]*?\[\/dia\]/.test(String(ex[x.idx]||'')); }); }catch(e){}
      /* 일상 비유 예시("쉽게 비유하면 …")는 甲乙丙 없이 휴대폰·마트 같은 일상 소재를 쓰므로
         甲乙丙 전제 규칙(EX_NONAME·EX_NO_SUBJECT_FIRST·EX_NOT_GAP_FIRST) 면제 */
      try{ v = v.filter(function(x){ if(x.code!=='EX_NONAME'&&x.code!=='EX_NO_SUBJECT_FIRST'&&x.code!=='EX_NOT_GAP_FIRST') return true; var ex=(q&&q.exp&&q.exp.ex)||[]; return !/비유하(면|자면|건대)/.test(String(ex[x.idx]||'')); }); }catch(e){}
      try{ v = v.concat(_qcExMissing(q)); }catch(e){}
      try{ v = v.concat(_qcOShort(q)); }catch(e){}
      try{ v = v.concat(_qcOCopy(q)); }catch(e){}
      return v;
    };
  }

  /* ---- 치명도 등록(참고용) ---- */
  try{
    if (typeof _QC_SEV !== 'undefined'){
      _QC_SEV.MN_DUP='WARNING'; _QC_SEV.MN_DESC_EMPTY='WARNING'; _QC_SEV.MN_NO_K='WARNING';
      _QC_SEV.MN_DESC_NO_RED='WARNING'; _QC_SEV.MN_DESC_REDUP='WARNING'; _QC_SEV.EX_MISSING='WARNING'; _QC_SEV.O_SHORT='WARNING'; _QC_SEV.O_COPY='WARNING';
    }
  }catch(e){}

  /* ---- 전역 노출 ---- */
  QC.mnemAudit = _qcMnemAudit;
  QC.exMissing = _qcExMissing;
  QC.oShort = _qcOShort;
  try{ if(typeof module!=='undefined'&&module.exports){ module.exports.mnemAudit=_qcMnemAudit; module.exports.exMissing=_qcExMissing; } }catch(e){}
})();
