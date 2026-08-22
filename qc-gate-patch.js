/* ===========================================================================
   qc-gate-patch.js — CertLab 검수 게이트 보강분 (2026-07-14)
   qc-core.js 뒤에 <script src>로 추가 로드. window.QC 를 확장한다.

   담는 것 (지금까지 비어 있던 구멍 메움)
   ┌── 마스터(암기) 콘텐츠 검수  ── QC.mnemAudit = 코어판 _qcMnemAudit + 아래 1종 (체이닝)
   │   · MN_SAME_CODE_DESC  코드'와' 설명이 둘 다 완전히 같은 레코드 (코어에 없는 규칙)
   │   [엔진 #14 · 2026-08-01] 예전엔 이 파일이 코어판을 대체하면서 MN_DESC_EMPTY·MN_NO_K·
   │   MN_DESC_NO_RED·MN_DESC_REDUP 을 같은 이름으로 다시 구현했다. 코어에 이미 있는 것들이라
   │   지웠고(중복 발화 방지), 코어의 MN_DESC_SHORT·MN_LETTER_UNEXPLAINED·MN_SLASH·MN_SYMBOL·
   │   MN_QSPECIFIC_TRAP·REC_DATE·id 중복이 다시 보이게 됐다.
   └── 문항 예시 검수        ── EX_MISSING (per-question)
       · 이론형 객관식인데 장면 예시(exp.ex)가 통째로 비어 있음
         "여과과정의 효과다"처럼 해설 한 줄로 끝나고 예시가 없는 문항을 잡는다.
   └── 해설 자리 검수        ── O_WRONG_SLOT (per-question) [2026-08-22 추가]
       · 해설을 한 칸만 채웠는데 그 칸이 정답칸(o[ans-1])이 아님.
         앱은 exp.o[i] 를 i+1 번 보기 아래에 붙이므로(index-4-learn.js) 엉뚱한 보기에 정답 풀이가 뜬다.
         코어에는 계산형용 CALC_WRONG_SLOT 만 있어 CV·ORDER 유형이 통째로 새어 나갔다
         (라이브에서 11문항 발견 — sport2 10 · hesm 1).

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
  function strip(s){ return String(s||'').replace(STRIP,'').trim(); }
  /* [엔진 #14] 빨강 글자 추출기(redLetters)는 지웠다 — 그것을 쓰던 mnem 규칙 4종이
     코어와 겹쳐 제거됐고, 코어의 _qcRedLetters(qc-core.js:961)가 같은 두 관례
     (<span class="k">·<k>)를 이미 지원한다. */

  /* ---- 설정 기본값 병합(있으면 유지) ---- */
  try{
    if (typeof _QC_DEFAULTS!=='undefined' && _QC_DEFAULTS){
      _QC_DEFAULTS.mnem = _QC_DEFAULTS.mnem || {};
      /* [엔진 #14] 이 파일이 실제로 구현하는 mnem 규칙은 MN_SAME_CODE_DESC 하나다.
         나머지 4종은 코어(qc-core.js)에 같은 이름으로 이미 있어 여기서 기본값을 또 심을 이유가 없다. */
      if(!_QC_DEFAULTS.mnem.MN_SAME_CODE_DESC) _QC_DEFAULTS.mnem.MN_SAME_CODE_DESC={on:true};
      _QC_DEFAULTS.gichul = _QC_DEFAULTS.gichul || {};
      if(!_QC_DEFAULTS.gichul.EX_MISSING) _QC_DEFAULTS.gichul.EX_MISSING={on:true};
      if(!_QC_DEFAULTS.gichul.O_SHORT) _QC_DEFAULTS.gichul.O_SHORT={on:true,minChars:30};
      if(!_QC_DEFAULTS.gichul.VERDICT_FILL_EXEMPT) _QC_DEFAULTS.gichul.VERDICT_FILL_EXEMPT={on:true};
      if(!_QC_DEFAULTS.gichul.O_COPY) _QC_DEFAULTS.gichul.O_COPY={on:true,minRun:6};
      if(!_QC_DEFAULTS.gichul.O_WRONG_SLOT) _QC_DEFAULTS.gichul.O_WRONG_SLOT={on:true};
      /* [2026-08-23] 규칙 문서엔 있는데 게이트가 안 보던 것들 — 아래 _qcRuleDoc 참고 */
      if(!_QC_DEFAULTS.gichul.EX_UNDER90)   _QC_DEFAULTS.gichul.EX_UNDER90={on:true,minChars:90};
      if(!_QC_DEFAULTS.gichul.CPT_MISSING)  _QC_DEFAULTS.gichul.CPT_MISSING={on:true};
      if(!_QC_DEFAULTS.gichul.O_NO_ANSMARK) _QC_DEFAULTS.gichul.O_NO_ANSMARK={on:true};
      if(!_QC_DEFAULTS.gichul.OT_SKIP_ON_FILLED) _QC_DEFAULTS.gichul.OT_SKIP_ON_FILLED={on:true};
      if(!_QC_DEFAULTS.gichul.CALC7_LACK)   _QC_DEFAULTS.gichul.CALC7_LACK={on:true};
      if(!_QC_DEFAULTS.gichul.CALC_EX_NOSTEP) _QC_DEFAULTS.gichul.CALC_EX_NOSTEP={on:true};
    }
  }catch(e){}

  /* ==========================================================================
     1) 암기 마스터 콘텐츠 검수 — _qcMnemAudit(mnems)
     mnems: 배열([{id,code,desc,...}]) 또는 {mnemonics:[...]} 둘 다 허용.
     반환: 위반 배열([{kind,code,field,id,msg,text,sev}])
     ========================================================================== */
  /* [엔진 #14 · 2026-08-01] 판정대기 #40 — 이 함수는 원래 코어판 _qcMnemAudit 을 **대체**했다.
     그래서 코어만 가진 검사(MN_DESC_SHORT·MN_LETTER_UNEXPLAINED·MN_SLASH·MN_SYMBOL·
     MN_QSPECIFIC_TRAP·REC_DATE·id 중복)가 admin·preview 검수창에서 통째로 사라졌다.
     이제 **코어를 먼저 돌리고 그 위에 이 파일만 아는 규칙을 얹는다**(GATE-1 과 같은 방식).

     겹치던 4종(MN_DESC_EMPTY·MN_NO_K·MN_DESC_NO_RED·MN_DESC_REDUP)은 코어에 같은 이름으로
     이미 있으므로 여기서 지웠다 — 두 번 발화하는 소음이 될 뿐이고, 코어의 빨강 추출도
     <span class="k">·<k> 두 관례를 모두 지원한다(qc-core.js:961). 한 글자씩 대응을 따지는
     엄격판은 코어의 MN_LETTER_UNEXPLAINED 가 이미 한다.

     남긴 것은 코어에 없는 규칙 하나 — '코드와 설명이 둘 다 완전히 같은 레코드'.
     ⚠ 이름을 MN_DUP → MN_SAME_CODE_DESC 로 바꿨다. 코어의 MN_DUP 은 **id 중복**(ERROR·block)이라
        뜻이 다른데 이름이 같아, 아래 _QC_SEV 등록이 코어의 차단급 id 중복 검사를 조용히
        WARNING 으로 끌어내리고 있었다(GATE-3 에서 CX_EMPTY 를 가른 것과 같은 이름 충돌). */
  function _qcMnemOwn(mnems){
    var list = Array.isArray(mnems) ? mnems : ((mnems&&mnems.mnemonics)||[]);
    var v = [];

    /* MN_SAME_CODE_DESC — 진짜 중복만. [2026-07-14 정정] '같은 코드'는 중복이 아니다:
       같은 두문자(예: 직·간·이)를 서로 다른 개념(정책수단 vs 표준건축비)에 재사용하는 것은 정상.
       코드 '와' 설명(desc)이 '둘 다 완전 동일'할 때만 내용상 중복 후보로 본다. 그마저도 서로
       다른 개념에 걸렸으면 삭제가 아니라 '개념 통합 검토' 대상 → INFO성 경고로만 남긴다. */
    if (_on('mnem','MN_SAME_CODE_DESC')){
      var byCD = {};
      list.forEach(function(m){ var c=strip(m&&m.code), dd=strip(m&&m.desc); if(!c) return; var k=c+''+dd; (byCD[k]=byCD[k]||[]).push(m); });
      Object.keys(byCD).forEach(function(k){
        var g = byCD[k]; if (g.length < 2) return;
        var ids = g.map(function(m){ return m.id; });
        g.forEach(function(m, i){
          if (i === 0) return; /* 대표 1건 외 나머지에만 지적 */
          v.push({ kind:'warn', field:'desc', idx:0, code:'MN_SAME_CODE_DESC', id:m.id,
            msg:'코드·설명이 완전히 같은 암기가 '+g.length+'건('+ids.join(' · ')+') — 서로 다른 개념에 걸렸는지 확인 후, 같은 개념이면 하나로 통합(참조 remap). 단순히 코드만 같은 것은 중복 아님',
            text:ids.join(' · ') });
        });
      });
    }

    _sev(v);
    return v;
  }

  /* 코어판 + 이 파일판을 합친 것이 유일한 mnem 검수 경로다(체이닝 · 대체 아님).
     코어판 참조는 패치가 덮기 **전에** 잡아 둔다. */
  var _mnemBase = (typeof _qcMnemAudit==='function') ? _qcMnemAudit : null;
  function _qcMnemAuditAll(mnems){
    var v = [];
    if(_mnemBase){ try{ v = _mnemBase(mnems) || []; }catch(e){ v = []; } }
    try{ v = v.concat(_qcMnemOwn(mnems)); }catch(e){}
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
     2-2) 해설이 정답칸이 아닌 자리에 있음 — O_WRONG_SLOT (per-question) [2026-08-22]
     앱은 exp.o[i] 를 **i+1 번 보기 아래**에 붙인다(index-4-learn.js 일반형 렌더).
     그러니 해설을 한 칸만 채울 거면 반드시 정답칸 o[ans-1] 에 넣어야 한다.
     코어의 CALC_WRONG_SLOT 은 _isCalcQ 인 문항만 보므로 CV·ORDER 처럼
     '정답 보기 하나만 풀어 주는' 유형이 통째로 새어 나갔다.
     ⚠ 조합형(o 칸이 보기 수가 아니라 지문 수)은 정답칸 개념이 달라 제외한다.
        복수정답(ans 배열)·전항정답(oFilled 0)·빈칸형(blanks)도 제외.
     ========================================================================== */
  function _qcOSlot(q){
    var v=[]; if(!_on('gichul','O_WRONG_SLOT')) return v;
    var exp=(q&&q.exp)||{}, o=exp.o||[];
    var opts=(q&&Array.isArray(q.opts))?q.opts:[];
    if(!opts.length || !o.length) return v;
    if(o.length!==opts.length) return v;                 /* 조합형 지문별 해설 등 */
    if(Array.isArray(q&&q.blanks) && q.blanks.length) return v;
    var ans=(q&&typeof q.ans==='number')?q.ans:0;        /* 복수정답 배열은 제외 */
    if(!ans || ans<1 || ans>o.length) return v;
    var at=-1, cnt=0;
    for(var i=0;i<o.length;i++){ if(o[i]&&String(o[i]).trim()){ cnt++; at=i; } }
    if(cnt!==1) return v;                                /* 여러 칸 = 보기별 해설(정상) */
    if(at===ans-1) return v;
    /* 계산형은 코어의 CALC_WRONG_SLOT 이 같은 자리를 이미 잡는다 — 두 줄로 뜨지 않게 넘긴다 */
    try{ if(typeof _isCalcQ==='function' && _isCalcQ(q)) return v; }catch(e){}
    if(q&&q.calc===true) return v;
    v.push({ kind:'warn', field:'o', idx:at, code:'O_WRONG_SLOT',
      msg:'해설을 한 칸만 채웠는데 정답칸이 아닌 o['+at+']에 있음(정답은 '+ans+'번) → '
          +'앱이 '+(at+1)+'번 보기 아래에 붙여 엉뚱한 보기에 정답 풀이가 뜬다. o['+(ans-1)+']로 옮길 것',
      text:String(o[at]||'').slice(0,120) });
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
     3c) TRAIL_CONN — 문장이 연결어미로 끝나 미완결 (예: "…분할 횟수는 3회 이내로 맞지만.")
     해설(o)·예시(ex) 원소의 마지막 줄이 지만/는데/인데/어서/아서/여서/해서/려면/거나/(하·되·이)며 등
     이어지는 연결어미로 끝나면 뒷말이 잘려 문장이 미완성이다. 끝만 검사(문중 연결어는 정상).
     표/조합(| 다수)·[dia] 관계도·산식은 제외. WARNING(비차단). */
  var _TRAILCONN=/(지만|는데|은데|인데|어서|아서|여서|해서|려면|거나|으며|하며|되며|이며)$/;
  function _qcTrailEnds(s){
    var t=strip(s); if(!t) return null;
    var lines=t.split(/\n/).map(function(x){return x.trim();}).filter(Boolean);
    if(!lines.length) return null;
    var last=lines[lines.length-1];
    last=last.replace(/[)\]"'“”‘’」』〉》\s]+$/,'').replace(/[.。!?…]+$/,'').replace(/[)\]"'“”‘’」』〉》\s]+$/,'').trim();
    var m=last.match(_TRAILCONN);
    return m?m[1]:null;
  }
  function _qcTrailConn(q){
    var v=[], exp=(q&&q.exp)||{}, o=exp.o||[], ex=exp.ex||[];
    if(!_on('gichul','TRAIL_CONN')) return v;
    function scan(arr, field){
      (arr||[]).forEach(function(t,i){
        if(!(t&&String(t).trim())) return;
        var s=String(t);
        if(/\[dia\][\s\S]*?\[\/dia\]/.test(s)) return;              /* 관계도 제외 */
        if((s.match(/\|/g)||[]).length>=2) return;                  /* 표/조합 통짜 제외 */
        if(/[=×÷]|\d\s*[+\-*/]\s*\d/.test(strip(s))) return; /* 산식 제외 */
        var hit=_qcTrailEnds(s);
        if(hit)
          v.push({ kind:'warn', field:field, idx:i, code:'TRAIL_CONN',
            msg:(field==='o'?'해설(o)':'예시(ex)')+'이 연결어 "…'+hit+'"로 끝나 문장이 미완결 — 뒷말이 잘림. 문장을 끝까지 맺을 것', text:strip(s).slice(-40) });
      });
    }
    scan(o,'o'); scan(ex,'ex');
    _sev(v);
    return v;
  }

  /* ==========================================================================
     3-B) 규칙 문서(_해설_마스터_공용.md)에는 있는데 게이트가 안 보던 것들 — 2026-08-23

     원인: 규칙 문서를 안 읽고 게이트 통과만으로 완성을 판정하면 아래가 통째로 새어 나간다.
     실제로 산업보건지도사 150 · 국내여행안내사 48 · 호텔관리사 74 문항이
     개념 미연결·예시 60자·정답표기 없음으로 올라갔고 게이트는 0을 냈다.
     전부 WARNING 이라 새로 차단되는 문항은 없다(배치 판정은 「신규 위반 0」 기준).

       EX_UNDER90   §3-2 예시는 90자 이상의 장면. EX_SHORT(60)는 바닥선이지 기준이 아니다.
                    라이브 실측 28,919칸 중 90자 미만 20,101칸(69.5%) — 기존 부채가 크므로
                    코드를 따로 두어 EX_SHORT 와 섞이지 않게 한다.
       CPT_MISSING  §6-2 개념은 모든 시험이 같이 쓰는 광역 자산. exp.cpt 가 비면 연결이 없는 것.
       O_NO_ANSMARK §2-3 정답 칸에는 (정답). 계산형·전항정답·단일해설은 뺀다.
       OT_SKIP_ON_FILLED  해설이 있는 칸에 ot skip 이 남아 오답노트가 그 보기를 건너뛰는 것.
       CALC7_LACK   §4-4 계산형 7단(접근·원리·요약풀이·상세풀이·최종정리·시험포인트·암기포인트).
                    코어의 CALC_NO_APPROACH·CALC_NO_TIP 는 기본 OFF 라 침묵하고 있었다.  */
  var _CALC7 = ['approach','principle','exSum','ex','s','tip','recall'];
  function _qgFilled(v){ if(!v) return false; return Object.prototype.toString.call(v)==='[object Array]' ? v.filter(Boolean).length>0 : String(v).trim().length>0; }
  function _qgIsCalcQ(q){ return (q&&q.calc===true) || String((q&&q.type)||'').toUpperCase()==='CALC'; }

  function _qcRuleDoc(q){
    var v=[]; var exp=(q&&q.exp)||{};
    var o=(exp.o&&exp.o.length)?exp.o:[], ex=(exp.ex&&exp.ex.length)?exp.ex:[];
    var opts=(q&&q.opts)||[];
    var isCalc=_qgIsCalcQ(q);

    /* ① 예시 90자 — 서술형만. 계산형 ex 는 풀이 단계라 잣대가 다르다. */
    if(!isCalc && _on('gichul','EX_UNDER90')){
      var _min90=_num('gichul','EX_UNDER90','minChars',90);
      for(var i=0;i<ex.length;i++){
        var t=ex[i]; if(!t) continue;
        var L=String(t).replace(/<[^>]+>/g,'').trim().length;
        if(L<_min90) v.push({kind:'warn',field:'ex',idx:i,code:'EX_UNDER90',
          msg:'예시가 '+L+'자 — 규칙은 90자 이상의 장면(§3-2). 정의를 되풀이하지 말고 누가 무엇을 했고 그래서 어떻게 됐는지를 넣을 것',text:String(t).slice(0,60)});
      }
    }

    /* ② 개념 마스터 연결 */
    if(_on('gichul','CPT_MISSING') && !_qgFilled(exp.cpt)){
      v.push({kind:'warn',field:'cpt',idx:0,code:'CPT_MISSING',
        msg:'개념카드(exp.cpt) 연결 없음 — 개념은 모든 시험이 같이 쓰는 광역 자산(§6-2). 있는 카드를 찾아 걸고, 없으면 만들고 나서 해설을 쓴다',text:''});
    }

    /* ③ 정답 칸에 (정답) */
    if(_on('gichul','O_NO_ANSMARK') && !isCalc && opts.length){
      var oFilled=0; for(var k=0;k<o.length;k++){ if(o[k]&&String(o[k]).trim()) oFilled++; }
      var ansArr = Object.prototype.toString.call(q&&q.ans)==='[object Array]' ? q.ans : [(q&&q.ans)];
      var allAns = Object.prototype.toString.call(q&&q.ans)==='[object Array]' && q.ans.length>=opts.length;
      if(oFilled>1 && !allAns){
        for(var a=0;a<ansArr.length;a++){
          var n=ansArr[a]; if(typeof n!=='number'||n<1||n>o.length) continue;
          var tt=o[n-1]; if(!tt||!String(tt).trim()) continue;
          if(!/\(정답\)/.test(String(tt))) v.push({kind:'warn',field:'o',idx:n-1,code:'O_NO_ANSMARK',
            msg:'정답 칸에 (정답) 표기 없음(§2-3) — 판정어 뒤에 (정답)을 붙인다',text:String(tt).slice(-40)});
        }
      }
    }

    /* ④ ot 의 skip 이 해설 있는 칸에 붙어 있는가
       ⚠ 처음엔 「skip 이 있으면 사람이 넣은 것」으로 잡았다가 되물렸다.
          계산형은 `ot:[{skip:'empty'}…{skip:'calc'}]` 가 정착된 방식이고 라이브에 2,347자리 있다.
          실제 결함은 **해설이 있는 칸에 skip 이 남아 있는 것**뿐이다(라이브 816자리). */
    if(_on('gichul','OT_SKIP_ON_FILLED') && Object.prototype.toString.call(exp.ot)==='[object Array]' && exp.ot.length){
      for(var b=0;b<exp.ot.length;b++){
        if(exp.ot[b] && exp.ot[b].skip && o[b] && String(o[b]).trim()){
          v.push({kind:'warn',field:'o',idx:b,code:'OT_SKIP_ON_FILLED',
            msg:'해설이 있는 칸인데 exp.ot 에 skip 이 붙어 있음 — 오답노트가 그 보기를 건너뛴다',text:String(o[b]).slice(0,40)});
        }
      }
    }

    /* ⑤-B 계산형 상세풀이(ex)가 §4-2 꼴인가 — 단계번호 ①·사이줄 ↓·계산줄 →
       필드가 차 있어도 본문이 줄글이면 학생은 어디서 무엇이 바뀌는지 못 짚는다.
       라이브 실측 684문항 중 셋을 다 갖춘 것은 263뿐이었다(감평사 230·공인중개사1차 32).
       ↓ 는 단계가 둘 이상일 때만 센다(한 단계짜리 풀이는 사이줄이 없는 게 맞다). */
    if(_on('gichul','CALC_EX_NOSTEP') && isCalc && ex.length){
      /* 단계 표시는 시험마다 갈린다 — ①②③ 과 「1단계」 두 관례가 모두 쓰인다.
         ⚠ 처음엔 ①②③ 만 보다가 경영지도사 100 · 소방 · 건강운동을 통째로 오탐했다.
            <b>1단계</b> 처럼 마크업이 붙은 것도 있어 태그를 걷고 센다. */
      var _blob=ex.join('\n');
      var _bare=_blob.replace(/<[^>]+>/g,'');
      var _steps=(_bare.match(/[①②③④⑤⑥⑦⑧⑨]/g)||[]).length
               + (_bare.match(/(^|\s)\d+\s*단계/g)||[]).length;
      var _hasDown=/(^|\n)\s*↓\s*(\n|$)/.test(_blob);
      var _hasArrow=/→/.test(_bare);
      var _lack=[];
      if(!_steps) _lack.push('단계 표시(① 또는 1단계)');
      if(_steps>1 && !_hasDown) _lack.push('사이줄 ↓');
      if(!_hasArrow) _lack.push('계산줄 →');
      if(_lack.length) v.push({kind:'warn',field:'ex',idx:0,code:'CALC_EX_NOSTEP',
        msg:'계산형 상세풀이가 단계 꼴이 아님 — 빠진 것: '+_lack.join('·')+' (§4-2). 단계 제목은 ①②③, 계산 줄은 → 로 시작, 단계 사이에 ↓ 한 줄',text:String(ex[0]||'').slice(0,50)});
    }

    /* ⑤ 계산형 7단 */
    if(_on('gichul','CALC7_LACK') && isCalc){
      var lack=[];
      for(var c=0;c<_CALC7.length;c++){ if(!_qgFilled(exp[_CALC7[c]])) lack.push(_CALC7[c]); }
      if(lack.length) v.push({kind:'warn',field:'ex',idx:0,code:'CALC7_LACK',
        msg:'계산형 7단 가운데 빈 칸: '+lack.join('·')+' (§4-4) — 접근·원리·요약풀이·상세풀이·최종정리·시험포인트·암기포인트',text:''});
    }

    _sev(v);
    return v;
  }

  /* ==========================================================================
     4) VERDICT 오발동 예외 — 빈칸채우기·표/조문형 해설
     qc-core의 VERDICT(해설이 옳다/옳지 않다로 안 맺음)는 O/X 판정형 전제인데,
     "( )에 들어갈 …" 빈칸채우기형은 해설이 판정어가 아니라 답(ㄱ:500, ㄴ:…)으로,
     표/조문 매칭형(| 구분)은 여러 진술을 한 칸에 담아 끝나는 게 정상이다.
     이런 형식에서 뜨는 VERDICT block은 콘텐츠 결함이 아니라 게이트 과발동 → 면제한다.
     (좁은 예외: 빈칸형 문두 또는 표 마크업 원소만. 일반 O/X 판정 누락은 그대로 잡음.)

     [엔진 #14 · 2026-08-01] '해설 원소가 두 줄 이상이면 면제' 조건을 뺐다(판정대기 #39 · 선택지 A).
     줄 수는 "여러 진술을 한 칸에 담았다"의 대리지표가 못 된다 — 두 줄로 쓴 평범한 O/X 해설이
     종결어를 빠뜨려도 조용히 통과했다. VERDICT 는 ERROR 라 D(_qcGateBypass=false) 전환 시
     영향이 가장 큰 코드이므로, 구멍을 열어 둔 채 bypass 를 풀면 그 구멍만 커진다.
     ⚠ 요구됐던 적용 전 라이브 전수 실측(work/gate9/v39_measure.js · 7,250문항):
        지적 434 → 434 · 새로생김 0 · block 문항 0 → 0 — **지금 발화는 안 늘고 노출면만 닫힌다.**
        노출면은 해설 칸 24,065 중 줄수>=2 가 146칸, 표 마크업이 아닌 것 128칸,
        빈칸형 문두도 아닌 순수 '줄수만' 면제가 108칸이었다. */
  function _qcVerdictExempt(q, idx){
    if(!_on('gichul','VERDICT_FILL_EXEMPT')) return false;
    var qq=String((q&&q.q)||'');
    var fillStem = /\(\s*[ㄱ-ㅎ가-힣]?\s*\)/.test(qq) && /들어갈|알맞은|순서|나열|바르게/.test(qq);
    if(fillStem) return true;
    var o=(q&&q.exp&&q.exp.o)||[]; var el=String(o[idx]||'');
    return (el.match(/\|/g)||[]).length>=2;   /* 표 마크업만 — 근거 있는 면제 */
  }

  /* ---- per-question 위반 래퍼: EX_MISSING·O_SHORT 합류 + VERDICT 예외 필터(본체 무수정) ---- */
  if (typeof QC.violations === 'function'){
    var _base = QC.violations;
    QC.violations = function(q){
      var v = _base(q) || [];
      try{ v = v.filter(function(x){ return !(x.code==='VERDICT' && _qcVerdictExempt(q, x.idx)); }); }catch(e){}
      /* [dia]…[/dia] 관계도는 여러 줄이 정상 → 그 예시 원소의 EX_MULTILINE·EX_STEPS_NOBR 면제 */
      try{ v = v.filter(function(x){ if(x.code!=='EX_MULTILINE'&&x.code!=='EX_STEPS_NOBR') return true; var ex=(q&&q.exp&&q.exp.ex)||[]; return !/(\[dia\][\s\S]*?\[\/dia\]|\[eq\][\s\S]*?\[\/eq\])/.test(String(ex[x.idx]||'')); }); }catch(e){}
      /* 일상 비유 예시("쉽게 비유하면 …")는 甲乙丙 없이 휴대폰·마트 같은 일상 소재를 쓰므로
         甲乙丙 전제 규칙(EX_NONAME·EX_NO_SUBJECT_FIRST·EX_NOT_GAP_FIRST) 면제 */
      try{ v = v.filter(function(x){ if(x.code!=='EX_NONAME'&&x.code!=='EX_NO_SUBJECT_FIRST'&&x.code!=='EX_NOT_GAP_FIRST') return true; var ex=(q&&q.exp&&q.exp.ex)||[]; return !/비유하(면|자면|건대)/.test(String(ex[x.idx]||'')); }); }catch(e){}
      /* [엔진 #15 · 2026-08-01] 같은 자리에 같은 코드가 두 번 붙는 것을 막는다.
         `EX_MISSING`·`O_SHORT` 는 **코어에도 같은 이름의 구현이 있다**(qc-core.js:586·593).
         스코프가 서로 달라(코어는 _sScene 로 OX형·특정 type 을 빼고, 여기는 계산 신호 휴리스틱을 더 본다)
         한쪽만 남기면 검출이 줄어드는데, 그냥 concat 하면 둘 다 걸리는 자리에서 **한 결함이 두 줄로 뜬다.**
         실증(work/gate10/dup_measure.js · 인공 25자 해설 4칸): O_SHORT 가 **8줄** 발화했다.
         라이브 7,250문항에서는 아직 겹치는 자리가 0이라 건수 변화는 없지만, 겹치는 순간
         지적서 집계와 배치의 '성공 증거'(대상 코드가 사라졌는가) 수치가 조용히 두 배가 된다.
         → (code|field|idx) 가 이미 있으면 더하지 않는다. 코어 쪽 줄이 남는다(진실의 원천은 코어).
         GATE-3(CX_EMPTY)·#40(MN_DUP) 과 같은 이름충돌 계열의 세 번째·네 번째 건이다. */
      function _qgAdd(cur, add){
        if(!add || !add.length) return cur;
        var seen={}; cur.forEach(function(x){ seen[x.code+'|'+x.field+'|'+x.idx]=1; });
        add.forEach(function(x){ var k=x.code+'|'+x.field+'|'+x.idx; if(!seen[k]){ seen[k]=1; cur.push(x); } });
        return cur;
      }
      try{ v = _qgAdd(v, _qcExMissing(q)); }catch(e){}
      try{ v = _qgAdd(v, _qcOShort(q)); }catch(e){}
      try{ v = _qgAdd(v, _qcOCopy(q)); }catch(e){}
      try{ v = _qgAdd(v, _qcTrailConn(q)); }catch(e){}
      try{ v = _qgAdd(v, _qcOSlot(q)); }catch(e){}
      try{ v = _qgAdd(v, _qcRuleDoc(q)); }catch(e){}
      return v;
    };
    /* [GATE-1 2026-08-01] 전역 _qcViolations 도 같이 갈아끼운다.
       qualityGate(qc-core.js)와 지적서(admin-3-qc.js:440)는 QC.violations(프로퍼티)가 아니라
       전역 자유변수 _qcViolations 를 부른다. 프로퍼티만 바꾸면 서로 다른 참조라
       위 면제 3종과 추가규칙 4종(EX_MISSING·O_SHORT·O_COPY·TRAIL_CONN)이 게이트·지적서에 닿지 않았다.
       실측(work/gate8/g1_measure.js · 7,250문항): 지적 156 → 434(O_COPY 275·TRAIL_CONN 2·O_SHORT 1),
       없어지는 지적 0, **block 문항 0 → 0** — 새로 차단되는 문항은 없다(전부 WARNING). */
    try{ if(typeof _qcViolations==='function') _qcViolations = QC.violations; }catch(e){}
  }

  /* ---- 치명도 등록(참고용) ---- */
  try{
    if (typeof _QC_SEV !== 'undefined'){
      /* [엔진 #14 · 판정대기 #40] 여기서 등록하던 mnem 5종은 **전부 코어에 이미 있는 이름**이었고,
         그중 MN_DUP·MN_DESC_EMPTY 는 코어에서 ERROR(차단급)다. 이 줄이 그 둘을 조용히 WARNING 으로
         끌어내리고 있었다 — 특히 MN_DUP 은 코어에서 'id 중복'(레코드가 서로 덮어써 데이터가 사라지는
         상태)이라 강등해선 안 된다. 이제 이 파일이 정말 새로 만드는 이름만 등록한다. */
      _QC_SEV.MN_SAME_CODE_DESC='WARNING';
      /* [엔진 #15] 아래 넷 중 EX_MISSING·O_SHORT 는 **코어에도 있는 이름**이다.
         - EX_MISSING: 코어도 WARNING → 이 줄은 값을 바꾸지 않는다(무해).
         - O_SHORT   : 코어는 **INFO**(qc-core.js:279 "소급 폭증 방지로 INFO 도입 → 베이스라인 후 승격").
           이 줄이 그 INFO 를 WARNING 으로 **승격**시킨다. 코어가 예고한 승격 자체는 맞는 방향이고,
           승격의 전제였던 '베이스라인'도 실측으로 충족된다 — 라이브 7,250문항에서 O_SHORT 발화는 **1건**뿐이라
           승격해도 폭증이 없다(work/gate10/dup_measure.js). 그래서 되돌리지 않고 **근거를 여기 남긴다.**
           되돌리려면 이 줄에서 O_SHORT 만 빼면 코어의 INFO 가 그대로 산다. */
      _QC_SEV.EX_MISSING='WARNING'; _QC_SEV.O_SHORT='WARNING'; _QC_SEV.O_COPY='WARNING'; _QC_SEV.TRAIL_CONN='WARNING';
      _QC_SEV.O_WRONG_SLOT='WARNING';
      _QC_SEV.EX_UNDER90='WARNING'; _QC_SEV.CPT_MISSING='WARNING'; _QC_SEV.O_NO_ANSMARK='WARNING';
      _QC_SEV.OT_SKIP_ON_FILLED='WARNING'; _QC_SEV.CALC7_LACK='WARNING'; _QC_SEV.CALC_EX_NOSTEP='WARNING';
    }
  }catch(e){}

  /* ---- 전역 노출 ---- */
  QC.mnemAudit = _qcMnemAuditAll;
  QC.exMissing = _qcExMissing;
  QC.oShort = _qcOShort;
  QC.trailConn = _qcTrailConn;
  /* [GATE-1 과 같은 배선 · 엔진 #14 · 판정대기 #40]
     QC.mnemAudit(프로퍼티)만 갈아끼우면 코어의 전역 자유변수 _qcMnemAudit 과
     디스패처 _qcMasterAuditFns(=QC.masterRecordAudit 의 실제 경로)는 옛 함수를 계속 부른다.
     그러면 같은 데이터를 두 경로가 서로 다르게 판정한다 — 실제로 라이브 암기 778건에서
     QC.mnemAudit 은 {MN_DUP:5}, masterRecordAudit 은 {MN_DESC_SHORT:1} 로 서로를 놓치고 있었다.
     세 참조를 하나로 모은다. */
  try{ if(typeof _qcMnemAudit==='function') _qcMnemAudit = _qcMnemAuditAll; }catch(e){}
  try{ if(typeof _qcMasterAuditFns!=='undefined' && _qcMasterAuditFns){
    _qcMasterAuditFns.mnem = _qcMnemAuditAll; _qcMasterAuditFns.mnemonic = _qcMnemAuditAll; } }catch(e){}
  try{ if(typeof module!=='undefined'&&module.exports){ module.exports.mnemAudit=_qcMnemAuditAll; module.exports.exMissing=_qcExMissing; } }catch(e){}
})();
