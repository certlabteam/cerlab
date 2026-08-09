/* ===========================================================================
   qc-core.js — CertLab 검수 게이트 코어 (admin.html · preview.html 공용 단일 출처)
   생성: 2026-07-08 · 추출 베이스: admin__20(라이브)
   이 파일은 admin.html·preview.html 두 곳에서 <script src> 로 로드된다.
   호스트가 제공(전역, 있으면 사용/없으면 스킵): isComboQuestion, comboStmtList,
   _conceptCards, _qcImgKeys(Set), _qcCptCards(id→cards), 그리고 마스터셋 M(_qcMasterLink 인자).
   =========================================================================== */

/* 호스트 로더가 채우는 공유 상태(없어도 코어가 안전하게 스킵하도록 코어에서 선언) */
var _qcImgKeys=(typeof _qcImgKeys!=='undefined')?_qcImgKeys:null;
var _qcCptCards=(typeof _qcCptCards!=='undefined')?_qcCptCards:null;

/* ---- [추출] 공통 헬퍼·config·_qg* (admin__20 4218-4246) ---- */
var _qgAction=/샀|팔았|팔아|(?<!위|아래|앞|뒷|윗|한)팔(?!꿉|꿈|씨름|다리|목|뚝|찌)|빌려|빌린|맡겨|맡긴|(?<!고)점유(?!율)|배상|청구|지급|처분|넘겨|넘긴|속여|속아|건네|매도|매수|양도|증여|담보|(?<![가-힣])대여|변제|등기|(?<!짝|리\s?)지어|사들|잡아|되찾|취소|(?<![가-힣])해지|(?<!일)반환|(?<![가-힣])인도/;
function _qgNamed(s){ return /[甲乙丙丁戊己庚辛壬癸]|[XYZ](회사|법인|은행|토지|아파트|건물|상가|주택|기계|점포|공장)|매수인|매도인|임차인|임대인|채권자|채무자|수탁자|신탁자|양수인|양도인|저당권자|질권자|보증인|대리인|전득자|점유자/.test(s||''); }
function _qgVerdict(t){ t=String(t||'').trim().replace(/\.+$/,''); var p=t.split(/\.\s+/); var last=(p[p.length-1]||t).replace(/\s*\([^)]*\)\s*$/,''); return /(옳지\s*않다|적절하지\s*않다|부적절하다|해당하지\s*않는다|틀리다|틀린다|옳다|적절하다|맞다|해당한다|아니다)$/.test(last); }
function _qgBg(s){ s=String(s||'').replace(/\s/g,''); var b={}; for(var i=0;i<s.length-1;i++){ var g=s.substr(i,2); b[g]=(b[g]||0)+1; } return b; }
function _qgSim(a,b){ var A=_qgBg(a),B=_qgBg(b),inter=0,na=0,nb=0,k; for(k in A){na+=A[k]; if(B[k])inter+=Math.min(A[k],B[k]);} for(k in B)nb+=B[k]; return (na+nb)?2*inter/(na+nb):0; }
// ===== 검수 조건(config/qc) — 영역별 on/off·임계값. 없으면 기본값 =====
var _qcCfg={};
function _qcOn(sec,code){ try{ var c=_qcCfg[sec]&&_qcCfg[sec][code]; if(c&&typeof c.on==='boolean') return c.on!==false; var d=(typeof _QC_DEFAULTS!=='undefined')&&_QC_DEFAULTS[sec]&&_QC_DEFAULTS[sec][code]; if(d&&typeof d.on==='boolean') return d.on!==false; return true; }catch(e){ return true; } }
function _qcN(sec,code,param,def){ try{ var c=_qcCfg[sec]&&_qcCfg[sec][code]; var val=c&&c[param]; return (typeof val==='number')?val:def; }catch(e){ return def; } }
/* 해설(o) 끝의 판정 꼬리(…옳다./…본 점에서 옳지 않다.)를 떼어 예시와 순수 비교 */
function _qgStripVerdict(o){ var p=String(o||'').split(/\.\s+/); while(p.length>1){ var last=p[p.length-1]; if(/(옳다|옳지\s*않다|적절하다|적절하지\s*않다|부적절하다|맞다|틀리다|틀린다|본\s*점에서|정답)/.test(last)) p.pop(); else break; } return p.join('. '); }
function _qgWords(s){ return String(s||'').replace(/[.,·]/g,' ').split(/\s+/).filter(Boolean); }
/* 연속 일치 어절(문장 복붙 직접 검출) 최대 길이 */
function _qgRunMatch(a,b){ var A=_qgWords(a),B=_qgWords(b),best=0,i,j,k; for(i=0;i<A.length;i++){ for(j=0;j<B.length;j++){ k=0; while(i+k<A.length&&j+k<B.length&&A[i+k]===B[j+k])k++; if(k>best)best=k; } } return best; }
/* 예시 줄 수 추정(2줄≈56자 → 28자/줄, 줄바꿈도 반영) — 장면화 최소 분량 판정 */
function _qgLines(s){ var t=String(s||'').trim(); if(!t)return 0; var n=0; t.split(/\n/).forEach(function(p){ n+=Math.max(1,Math.ceil(p.length/28)); }); return n; }
// 단계 뭉침 검출: 개행 없는 한 덩어리(줄) 안에 단계 마커 2개 이상 → 그 줄 반환(없으면 null)
//  · 원문자 ①②…(뒤에 번/순/째 오면 제외) 서로 다른 것 2개+
//  · 아라비아 "1. "과 "2. "가 같은 줄에 함께(연번 시작 확인 — 소수·조문 오탐 방지)
function _qgCrammedSteps(t){
  var lines=String(t||'').replace(/\[dia\][\s\S]*?\[\/dia\]/g,'').replace(/\[eq\][\s\S]*?\[\/eq\]/g,'').replace(/<br\s*\/?>/gi,'\n').split(/\n/); /* [FIX 2026-07-16] [dia] 도식 내 ①→② 표기·삽화는 단계 나열 아님 */
  for(var li=0; li<lines.length; li++){
    var L=lines[li]; if(!L.trim()) continue;
    var mk=(L.match(/[\u2460-\u2473](?![\ubc88\uc21c\uc9f8\uac00-\ud7a3])/g)||[]); /* [FIX 2026-07-16] ③의·②보다 등 그래프곡선 참조(원문자+한글 직결)는 단계 아님 — 제외 */ var u={}; mk.forEach(function(m){u[m]=1;});
    if(Object.keys(u).length>=2) return L.trim();
    if(/(^|\s)1\.\s/.test(L) && /\s2\.\s/.test(L)) return L.trim();
  }
  return null;
}

/* [ADD 2026-07-20 크리스] 설명 문장과 계산식이 같은 줄에 붙은 경우 탐지(상세풀이 ex·해설 o). 설명 다음엔 개행하고 식을 별도 줄로. */
function _qgProseCalc(t){
  var lines=String(t||'').replace(/<br\s*\/?>/gi,'\n').split('\n');
  var _ENDV=/(만든다|한다|된다|뺀다|더한다|가감해|가감하|산정한|구한다|계산한|더하고|빼고|곱하|나눈|같다고 두면|놓으면|풀면)/;
  function _kl(s){ return (s.match(/[가-힣]/g)||[]).length; }
  function _calc(s,eq){ if(eq && s.indexOf('=')<0) return false; var n=(s.match(/[0-9][0-9,\.]*/g)||[]).length, o=(s.match(/[+\-−×÷*=]/g)||[]).length; return n>=2 && o>=1; }
  for(var i=0;i<lines.length;i++){
    var s=lines[i].replace(/<[^>]+>/g,'').trim();
    var ar=s.indexOf('→');   /* 화살표 → */
    if(ar>=0){ var b=s.slice(0,ar), a=s.slice(ar+1); if(_kl(b)>=12 && _ENDV.test(b) && _calc(a,false)) return s.slice(0,90); }
    var m=/[0-9][0-9,\.]*/.exec(s);
    if(m){ var bb=s.slice(0,m.index); if(_kl(bb)>=18 && _ENDV.test(bb) && _calc(s.slice(m.index),true)) return s.slice(0,90); }
  }
  return null;
}

/* [엔진 #12] 인용 면제 판정 — '부호가 있다'가 아니라 '인용 안에 구체 발화가 있다'를 본다.
   `甲은 "속아서" 계약했다` 처럼 부호만 두른 칸이 빠져나가던 구멍을 큰따옴표·작은따옴표 함께 좁힌다.
   임계 2어절·8자(공백 제외)는 라이브 ex 인용 1,100개 실측 — 정당한 정황 인용의 최소가 4어절·10자였다(work/lvup/quotedist.js). */
function _qgQuotedSpec(s,minW,minC){
  var str=String(s||''), pairs=[['"','"'],['\u201c','\u201d'],["'","'"],['\u2018','\u2019']], p,m,re,inn,w,c;
  for(p=0;p<pairs.length;p++){
    re=new RegExp(pairs[p][0]+'([^'+pairs[p][1]+'\\n]{1,120})'+pairs[p][1],'g');
    while((m=re.exec(str))){
      inn=m[1];
      w=inn.trim().split(/\s+/).filter(function(x){return x;}).length;
      c=inn.replace(/\s/g,'').length;
      if(w>=(minW||2) && c>=(minC||8)) return true;
    }
  }
  return false;
}

/* ---- [추출] _isCalcQ · _qcViolations · qualityGate (admin__20 4263-4374) ---- */
// 엔진 _isCalcQ 이식 — 계산형 = oFilled 1칸 & (그래프 or 풀이단계). 단순 oFilled===1 아님(COMBO 결론 오인 방지)
function _isCalcQ(q){ if(!q) return false; if(typeof q.id==='string'&&q.id.indexOf('calc:')===0) return true; if(q.calc===false) return false; /* [FIX 2026-07-12] 인간이 calc:false로 명시한 문항(SA 단답형 등) 존중 — oFilled=1+장면예시로 자동 계산형 오인되어 CALC_NO_FORMULA/CALC_OLD_FORMAT 등 오탐되던 문제 해결 */ var _tyCalc=String((q&&q.type)||'').toUpperCase(); if(q.calc!==true && (_tyCalc==='PAIR'||_tyCalc==='MATCH'||_tyCalc==='ORDER')) return false; /* [FIX 2026-07-15] 짝짓기/매칭/순서형은 산술이 없어 계산형이 될 수 없음 — oFilled=1+단계형 ex로 계산형 렌더 오인되던 문제(intro23_3 등) 차단. COUNT/COMBO는 LQ 같은 진짜 계산형이 있어 제외 */
  var o=(q.exp&&q.exp.o)||[]; var oF=o.filter(function(x){return x&&String(x).trim();}).length; if(oF!==1) return false;
  var hg=q.exp&&q.exp.graph&&String(q.exp.graph).trim(); var ex=(q.exp&&q.exp.ex)||[]; var hs=ex.filter(function(x){return x&&String(x).trim();}).length>0;
  return !!(hg||hs); }
function _qcViolations(q){
  var v=[], exp=(q&&q.exp)||{}, o=exp.o||[], ex=exp.ex||[], cards=exp.c||[];
  // exp.cpt(마스터 링크) 카드: 개수(CARD_LT2)·화살표(REL_NO_ARROW) 판정에만 반영.
  // 카드 내용검사(CARD_CX_EMPTY 등)는 인라인 exp.c 전용 — 마스터 카드 품질은 masterLinkAudit 소관.
  var _cptSkip=false, _lk=[];
  if(Array.isArray(exp.cpt) && exp.cpt.length){
    if(_qcCptCards){
      exp.cpt.forEach(function(r){
        var cs=_qcCptCards[String(r)];
        if(cs===undefined) v.push({kind:'block',field:'card',idx:0,code:'CPT_MISSING',msg:'exp.cpt 참조 개념이 마스터에 없음: '+r+' → 개념 마스터 먼저 업로드',text:String(r)});
        else cs.forEach(function(cd){ _lk.push(cd); });
      });
    } else { _cptSkip=true; }
  }
  var opts=(q&&Array.isArray(q.opts))?q.opts:[];
  var isSAq=Array.isArray(q&&q.blanks)&&q.blanks.length;
  var oFilled=o.filter(function(x){return x&&String(x).trim();}).length;
  var isCalc=_isCalcQ(q);   /* [FIX] oFilled===1 순진판 → 견고판(_isCalcQ). 미완성 조합형이 계산형으로 오인돼 종결형/카드 검사 건너뛰던 문제 해결 */
  var isMCQ=Array.isArray(q&&q.opts)&&q.opts.length&&oFilled>=1&&!isSAq;
  var _rel=/\uc591\ub3c4|\uc591\uc218|\ub300\uc704|\ubcf4\uc99d|\uc5f0\ub300|\uc9c8\uad8c|\uc800\ub2f9|\uc774\uc911\ub9e4\ub9e4|\uc804\ub4dd|\uba85\uc758\uc2e0\ud0c1|\uc0c1\uc18d|\uc99d\uc5ec|\ubb3c\uc0c1\ub300\uc704|\ucc44\ubb34\uc778\uc218|\uac00\ub4f1\uae30|\uc804\uc138\uad8c|\uc9c0\uc0c1\uad8c|\uc9c0\uc5ed\uad8c|\uad6c\uc0c1/;
  var _arrow=/[\u2192\u25b6\u2193\u27f6\u21d2]/;
  function em(t){ return t&&/\u2014/.test(String(t)); }
  o.forEach(function(t,i){ if(em(t)) v.push({kind:'block',field:'o',idx:i,code:'EMDASH',msg:'\ud574\uc124(o)\uc5d0 em\ub300\uc2dc(\u2014) \uae08\uc9c0',text:t}); });
  ex.forEach(function(t,i){ if(em(t)) v.push({kind:'block',field:'ex',idx:i,code:'EMDASH',msg:'\uc608\uc2dc(ex)\uc5d0 em\ub300\uc2dc(\u2014) \uae08\uc9c0',text:t}); });
  cards.forEach(function(c,j){ var s=((c&&c.d)||'')+' '+((c&&c.cx)||'')+' '+((c&&c.t)||''); if(em(s)) v.push({kind:'block',field:'card',idx:j,code:'EMDASH',msg:'\uac1c\ub150\uce74\ub4dc '+(j+1)+'\uc5d0 em\ub300\uc2dc(\u2014) \uae08\uc9c0',text:(c&&c.t)||''}); });
  if(em(exp.tip)) v.push({kind:'block',field:'tip',idx:0,code:'EMDASH',msg:'tip\uc5d0 em\ub300\uc2dc(\u2014) \uae08\uc9c0',text:exp.tip});
  if(em(exp.s))   v.push({kind:'block',field:'s',idx:0,code:'EMDASH',msg:'\uc694\uc57d(s)\uc5d0 em\ub300\uc2dc(\u2014) \uae08\uc9c0',text:exp.s});
  if(isMCQ && !isCalc && !Array.isArray(q.ans)){ /* 전항·복수정답(ans 배열)은 정오 축 무효 → 종결형 면제 */
    var _isCountQ=String((q&&q.type)||'').toUpperCase()==='COUNT'; /* [FIX 2026-07-16] COUNT(개수형)은 정답칸이 "N개라 정답이다"로 끝나 옳다/옳지않다 종결이 없음 — VERDICT 오탐 제외 */
  o.forEach(function(t,i){ if(t&&String(t).trim()&&!_isCountQ&&!_qgVerdict(t)) v.push({kind:'block',field:'o',idx:i,code:'VERDICT',msg:'\uc885\uacb0\uc5b4 \uc5c6\uc74c(\uc633\ub2e4/\uc633\uc9c0 \uc54a\ub2e4\ub85c \uc548 \ub9fa\uc74c \u2192 O/X \ubc30\uc9c0 \ub204\ub77d)',text:t}); });
  }
  if(cards.length){ cards.forEach(function(c,j){ if(!(c&&c.cx&&String(c.cx).trim())) v.push({kind:'block',field:'card',idx:j,code:'CARD_CX_EMPTY',msg:'\uac1c\ub150\uce74\ub4dc '+(j+1)+' cx(\uc608\uc2dc) \ube48\uce78',text:(c&&c.t)||''}); }); }
  /* [엔진 #14 · 2026-08-01 · 판정대기 #41] 개념카드 1장 지적을 두 코드로 가른다.
     원래 삼항(cards.length?'block':'warn')으로 두 경우를 구분하려 했는데, 평평한 _QC_SEV 가
     한 이름에 한 치명도만 주고 _qcApplySev 가 kind 를 덮어써 늘 한쪽 가지만 살았다
     (엔진 #13 이전엔 ERROR라 늘 block, 이후엔 WARNING이라 늘 warn).
       · CARD_LT2      인라인 카드가 있는데 합계 1장 → 업로더가 카드 한 장 더 넣으면 닫힌다 → ERROR
       · CARD_LT2_LINK 링크만 1장(인라인 0) → 고치는 길이 개념 마스터 쪽이라 업로더 손 밖 → WARNING */
  var _cTot=cards.length+_lk.length;
  if(isMCQ && !isCalc && !_cptSkip && _cTot && _cTot<2){
    if(cards.length) v.push({kind:'block',field:'card',idx:0,code:'CARD_LT2',msg:'\uac1c\ub150\uce74\ub4dc '+_cTot+'\uc7a5(<2, \ub9c1\ud06c \ud3ec\ud568) \u2192 \uce74\ub4dc\ub97c \ud55c \uc7a5 \ub354 \ub123\uc5b4\ub77c',text:''});
    else v.push({kind:'warn',field:'card',idx:0,code:'CARD_LT2_LINK',msg:'\uac1c\ub150\uce74\ub4dc '+_cTot+'\uc7a5(<2, \ub9c1\ud06c\ub9cc) \u2192 \ub9c1\ud06c\ub41c \uac1c\ub150\uc5d0 \uce74\ub4dc \ubcf4\uac15',text:''});
  }
  if(_qcOn('gichul','O_PLACEHOLDER')){ var _PLACE=/\ud574\uc124\s*\ucd94\uac00|\uc218\uc815\s*\uc608\uc815|\uc791\uc131\s*\uc608\uc815|\ucd94\uac00\s*\uc608\uc815|\ubbf8\uc791\uc131|\ucc44\uc6b8\s*\uc608\uc815|\uc900\ube44\s*\uc911|TODO/; o.forEach(function(t,i){ if(_PLACE.test(String(t||''))) v.push({kind:'block',field:'o',idx:i,code:'O_PLACEHOLDER',msg:'\ud574\uc124(o)\uc5d0 \uc784\uc2dc \ubb38\uad6c \u2014 \ube48 \uce78\uc740 \ubc18\ub4dc\uc2dc \ube48 \ubb38\uc790\uc5f4("")\ub85c(\uc784\uc2dc\ubb38\uad6c\ub294 oFilled\ub85c \uc624\uacc4\uc0b0\ub418\uc5b4 \uc9c4\uc220\uc218 \uc5b4\uae0b\ub0a8)',text:t}); }); }
  if(_qcOn('gichul','O_INCOMPLETE') && isMCQ && !isCalc && opts.length>=4 && String((q&&q.type)||'').toUpperCase()!=='COUNT'){ /* [FIX 2026-07-16] COUNT형은 정답칸만 설명(개수 근거)하면 되므로 빈칸 정상 — O_INCOMPLETE 오탐 제외 */ var _mk=opts.some(function(op){return /^[\u3131-\u314e][\s,:\-]/.test(String(op).trim());});
    /* [2026-08-06] \u3260\u3261 \ub098\uc5f4\ud615(\ubcf4\uae30\uac00 \uac19\uc740 \ub0b1\ub9d0\uc744 \uc790\ub9ac\ub9cc \ubc14\uafd4 \ub298\uc5b4\ub193\ub294 \uaf34) \uba74\uc81c.
       \uc624\ub2f5 \ubcf4\uae30\ub294 \uc815\ub2f5 \uc870\ud569\uc744 \ub4a4\uc11e\uc740 \uac83\ubfd0\uc774\ub77c "\u3260\uc740 A\uac00 \uc544\ub2c8\ub77c B\ub2e4"\ub97c \ub124 \ubc88 \ub418\ud480\uc774\ud558\uac8c \ub41c\ub2e4.
       \u3260\u00b7\u3261 \uac01\uac01\uc774 \ubb34\uc5c7\uc778\uc9c0 \ud55c \ubc88 \ubc1d\ud788\uace0 \uc815\ub2f5\uc73c\ub85c \ub9fa\ub294 \ud3b8\uc774 \ud559\uc2b5\uc5d0 \ub0ab\ub2e4 \u2014 \uc815\ub2f5\uce78\ub9cc \ucc44\uc6cc\ub3c4 \ud1b5\uacfc. */
    if(!_mk) _mk=opts.some(function(op){return /[\u3260-\u326d]/.test(String(op));});
    /* [2026-08-06] \uc21c\uc11c\ud615(ORDER)\ub3c4 \uac19\uc740 \uc774\uc720\ub85c \uba74\uc81c. \ubcf4\uae30\uac00 \uac19\uc740 \ud56d\ubaa9\uc744 \uc790\ub9ac\ub9cc \ubc14\uafd4 \ub298\uc5b4\ub193\uc740 \uac83\uc774\ub77c
       \uc624\ub2f5\uce78\ub9c8\ub2e4 "\ubb34\uc5c7\uc774 \uc5b4\ub514\ub85c \uc798\ubabb \uac14\ub2e4"\ub97c \ub418\ud480\uc774\ud558\uac8c \ub41c\ub2e4. \ud06c\ub9ac\uc2a4: "\uc21c\uc11c\ub294 \uc815\ub2f5 \ud558\ub098\ub9cc \ubcf4\uc5ec\uc900\ub2e4". */
    if(!_mk) _mk=String((q&&q.type)||'').toUpperCase()==='ORDER';
    if(!_mk){ var _emp=o.slice(0,opts.length).filter(function(x){return !(x&&String(x).trim());}).length; if(_emp>0) v.push({kind:'warn',field:'o',idx:0,code:'O_INCOMPLETE',msg:'\ubcf4\uae30 '+opts.length+'\uc9c0\uc778\ub370 \ud574\uc124(o) '+_emp+'\uce78 \ube44\uc5b4\uc788\uc74c \u2014 SC\ub294 \ubcf4\uae30 \uc804\ubd80 \ucc44\uc6c0(\uc815\uc758\ud655\uc778 \ubcf4\uae30\ub9cc \uc0dd\ub7b5)',text:''}); } }
  if(_qcOn('gichul','CALC_WRONG_SLOT') && _isCalcQ(q) && q.ans && !Array.isArray(q.ans)){ var _fi=-1; for(var _ci=0;_ci<o.length;_ci++){ if(o[_ci]&&String(o[_ci]).trim()){_fi=_ci;break;} } if(_fi>=0 && _fi!==(q.ans-1)) v.push({kind:'block',field:'o',idx:_fi,code:'CALC_WRONG_SLOT',msg:'\uacc4\uc0b0\ud615 \uacb0\ub860\uc774 \uc815\ub2f5\uce78(o['+(q.ans-1)+'])\uc774 \uc544\ub2cc o['+_fi+']\uc5d0 \uc788\uc74c \u2192 \uc5d4\uc9c4\uc774 '+(_fi+1)+'\ubc88\uc744 \uc815\ub2f5\uc73c\ub85c \uc624\ud45c\uc2dc(\uc815\ub2f5\uce78 o[ans-1]\uc5d0 \uacb0\ub860)',text:o[_fi]}); }
  try{ if(_qcOn('gichul','COMBO_STMT_MISMATCH') && typeof isComboQuestion==='function' && isComboQuestion(q.opts)){ var _st=comboStmtList(q); if(_st&&_st.length>=2 && oFilled>=2 && oFilled!==_st.length) v.push({kind:'warn',field:'o',idx:0,code:'COMBO_STMT_MISMATCH',msg:'\uc870\ud569\ud615 \uc9c4\uc220 '+_st.length+'\uac1c\uc778\ub370 \ud574\uc124(o) '+oFilled+'\uce78 \u2014 \uc9c4\uc220\uc218=\ucc44\uc6b4\uce78\uc218 \uc548 \ub9de\uc73c\uba74 \uc9c4\uc220\ubcc4\ub85c \uc548 \ud3bc\uccd0\uc9d0(\uc77c\ubc18\ud615 \ud3f4\ubc31)',text:''}); } }catch(_){}
  if(_qcOn('gichul','FILL_BLANK_MISMATCH') && Array.isArray(q.blanks) && q.blanks.length && oFilled!==q.blanks.length) v.push({kind:'block',field:'o',idx:0,code:'FILL_BLANK_MISMATCH',msg:'\ube48\uce78 '+q.blanks.length+'\uac1c\uc778\ub370 \ud574\uc124(o) '+oFilled+'\uce78 \u2014 blanks==oFilled\uc774\uc5b4\uc57c \ube48\uce78\ubcc4\ub85c \ud3bc\uce68(\uc548 \ub9de\uc73c\uba74 \uc5c9\ub69c\ud55c \uce78\uc5d0 \ubd99\uc74c)',text:''});
  if(_qcOn('gichul','O_ECHO_D')){ var _cds=(typeof _conceptCards==='function'?_conceptCards(q):(exp.c||[])).map(function(c){return String(c&&c.d||'');}).filter(Boolean); if(_cds.length){ o.forEach(function(t,i){ if(t&&String(t).trim()){ /* [엔진 #29 · 2026-08-03] 보기와 대조하는 절이 있으면 면제 — 정의를 되풀이한 게 아니라 그 정의를 보기에 대어 왜 틀렸는지 말하는 것이라 §337 역할분리에 맞다. 면제는 실측한 모집단만큼만 연다(라이브 310칸 중 지금 걸린 건 오탐 1칸뿐). */ if(/(보기|〈보기〉|지문|문제)(의\s*)?[^.]{0,12}(상황|설명|내용)?[^.]{0,8}(와는|과는|와|과)\s*(다르|맞지\s*않|일치하지\s*않)/.test(String(t))) return; for(var _di=0;_di<_cds.length;_di++){ if(_qgSim(_qgStripVerdict(t),_cds[_di])>=_qcN('gichul','O_ECHO_D','minSim',0.6)){ v.push({kind:'warn',field:'o',idx:i,code:'O_ECHO_D',msg:'\ud574\uc124(o)\uc774 \uac1c\ub150\uce74\ub4dc \uc815\uc758(d) \ub418\ud480\uc774 \u2192 o\ub294 \uadf8 \ubcf4\uae30\uac00 \uc65c \ub9de/\ud2c0\ub9ac\ub294\uc9c0 \uc0ac\uc720\ub85c(\uc5ed\ud560\ubd84\ub9ac \u00a7337)',text:t}); break; } } } }); } }
  /* [신규] 정답칸 판정 정합성 — 문두(부정/긍정)와 정답칸 해설의 판정 방향이 어긋남.
     앱은 exp.o 끝 판정어로 O/X 배지를 만들므로(index-4-learn.js), 어긋나면 정답 보기에 반대 배지가 뜬다. */
  if(_qcOn('gichul','ANS_VERDICT_MISMATCH')){
    var _avStem=String(q.q||''), _avAns=q.ans;
    /* 극성은 괄호 단서(예: "(단, …아닌 것을 전제로 함)")를 뺀 본문으로만 판단한다 */
    var _avBody=_avStem.replace(/\([^)]*\)/g,' ').replace(/\uff08[^\uff09]*\uff09/g,' ');
    var _avNeg=/(옳지\s*않은|틀린|아닌|해당하지\s*않는|적절하지\s*않은|부적절한|가장\s*거리가\s*먼)\s*(것은|것을)/.test(_avBody);
    var _avPos=/(옳은|맞는|적절한|해당하는)\s*(것은|것을)/.test(_avBody)
      || /(옳게|올바르게|바르게)\s*[가-힣]{1,8}\s*(것은|것을)/.test(_avBody);   /* "옳게 연결한 것은?"\u00b7"바르게 짝지은 것은?" */
    var _avCombo=(String(q.type||'').toUpperCase()==='COMBO')
      || /(모두\s*고른|고른\s*것은|몇\s*개인가|모두\s*몇)/.test(_avStem)
      || opts.some(function(x){ return /[\u3131-\u314e\u3260-\u327f]/.test(String(x)); });
    if(typeof _avAns==='number' && _avAns>=1 && _avAns<=o.length && (_avNeg!==_avPos) && !_avCombo){
      var _avT=o[_avAns-1];
      var _avMeta=/('[^']{0,40}(아닌|않는|않은|없는)\s*것'|"[^"]{0,40}(아닌|않는|않은|없는)\s*것"|(아닌|않는|않은|없는)\s*것(은|이)\s*(바로\s*)?(이것|이 보기|이 선지|여기)|정답|문제가\s*(찾는|요구하는|고르라는)|물음의?\s*답|고르라는|골라야|답으로|이 ?선지는)/;
      if(_avT && String(_avT).trim() && _qgVerdict(_avT) && !_avMeta.test(String(_avT))){
        var _avL=String(_avT).trim().replace(/\.+$/,''); var _avP=_avL.split(/\.\s+/);
        _avL=(_avP[_avP.length-1]||_avL).replace(/\s*\([^)]*\)\s*$/,'');
        var _avIsNeg=/(옳지\s*않다|적절하지\s*않다|부적절하다|해당하지\s*않는다|틀리다|틀린다|아니다)$/.test(_avL);
        if(_avNeg!==_avIsNeg) v.push({kind:'warn',field:'o',idx:_avAns-1,code:'ANS_VERDICT_MISMATCH',
          msg:'문두는 '+(_avNeg?'부정형(옳지 않은 것)':'긍정형(옳은 것)')+'인데 정답칸 해설이 '+(_avIsNeg?'부정':'긍정')+' 판정으로 끝남 \u2014 앱 O/X 배지가 정답 보기에 거꾸로 붙는다',text:_avT});
      }
    }
  }
  if(_qcOn('gichul','O_NO_ACTOR')){ var _AC=/[\u7532\u4e59\u4e19\u4e01\u620a\u5df1\u5e9a]/; o.forEach(function(t,i){ var op=opts[i]; if(op&&_AC.test(String(op)) && t&&String(t).trim() && !_AC.test(String(t))) v.push({kind:'warn',field:'o',idx:i,code:'O_NO_ACTOR',msg:'\ubcf4\uae30\uc5d4 \uc778\ubb3c(\u7532\u4e59)\uc774 \uc788\ub294\ub370 \ud574\uc124(o)\uc5d0\uc11c \uc778\ubb3c \uc99d\ubc1c \u2192 \uc0ac\uc2e4\uad00\uacc4 \uadf8\ub300\ub85c \uc0b4\ub824 \uc801\uc6a9(\u00a7467)',text:t}); }); }
  if(_qcOn('gichul','O_STEPS_NOBR')){ o.forEach(function(t,i){ var _cl=_qgCrammedSteps(t); if(_cl) v.push({kind:'warn',field:'o',idx:i,code:'O_STEPS_NOBR',msg:'해설(o)에 단계(①②③/1.2.3.) 나열이 줄바꿈 없이 한 덩어리 → 단계 사이 줄바꿈(\\n) 또는 문장으로 풀기',text:_cl}); }); }
  if(_qcOn('gichul','EX_PROSE_CALC')){ o.forEach(function(t,i){ var _pco=_qgProseCalc(t); if(_pco) v.push({kind:'warn',field:'o',idx:i,code:'EX_PROSE_CALC',msg:'설명 문장과 계산식이 같은 줄에 붙음 — 설명 다음에서 개행해 식을 별도 줄로(긴 식도 중간에서 개행). 상세풀이·해설 가독성',text:_pco}); }); }
  if(_qcOn('gichul','IMG_MISSING') && _qcImgKeys){ var _reI=/img:\/\/([^\s"'\\<>\]},]+)/g, _refs={}, _mI, _blobQ=''; try{ _blobQ=JSON.stringify(q)||''; }catch(_){} while((_mI=_reI.exec(_blobQ))){ _refs[_mI[1]]=1; } for(var _rk in _refs){ if(!_qcImgKeys.has(_rk)) v.push({kind:'warn',field:'q',idx:0,code:'IMG_MISSING',msg:'img://'+_rk+' 참조하는데 이미지 라이브러리에 그 키 없음 → 이미지 업로드 또는 키 수정(앱에서 참조 문자열이 그대로 노출됨)',text:'img://'+_rk}); } }
  /* [ADD 2026-07-20] 작업 중 메모 잔존 — '~~~~'·'데이터방 검수' 류가 화면에 그대로 노출되는 미완성 표기 감지 */
  /* [FIX 2026-08-03 엔진 #27] '채워 넣기' 는 본문 자연어로도 쓰인다("…ATP와 크레아틴인산을 다시 채워 넣기 위해").
     면제는 **'-기 위해/위한/위하여' 목적절 하나만** 열어 준다. 그 밖은 기본적으로 메모로 센다.
     근거: 라이브 9,822문항 전량에서 이 말이 나온 곳이 2곳뿐이고 **둘 다 뒤따르는 말이 "위해"** 였다
     (나머지 메모패턴 4종은 0곳). 면제해야 할 자연어의 실측 모집단이 '위해' 하나라는 뜻이다.
     ⚠ 처음엔 "뒤에 한글이 오면 면제(단 지시어미 11개는 예외)"로 짰다가 **검수 반려**됐다 —
     '채워 넣기 바랍니다'(바람≠바랍)·'채워 넣기 요청'이 목록 밖이라 그대로 샜고, 무엇보다
     기본값이 *봐주는* 쪽이라 목록 밖 표현이 전부 조용히 통과했다. 이 검사기의 존재 이유와 반대다.
     대가: "채워 넣기 시작했다" 류에 경고가 뜬다 — 라이브 0건이고 WARN(비차단)이라 감수한다.
     ⚠ 좁힌 것은 '채워 넣기' 하나뿐 — 나머지 4패턴은 손대지 않았다. */
  if(_qcOn('gichul','WORK_MEMO_LEFT')){ var _blobW=''; try{ _blobW=JSON.stringify(q)||''; }catch(_){}
    var _reW=/(~{3,}|데이터방\s*검수|검수\s*필요|작성\s*예정|채워\s*넣기)/g, _mW=null, _hitW=null;
    while((_mW=_reW.exec(_blobW))){
      if(_mW[1].indexOf('채워')>=0 && /^\s*위(해|한|하)/.test(_blobW.slice(_reW.lastIndex, _reW.lastIndex+12))) continue;
      _hitW=_mW[1]; break;
    }
    if(_hitW) v.push({kind:'warn',field:'q',idx:0,code:'WORK_MEMO_LEFT',msg:"작업 중 메모 흔적('"+_hitW+"') 잔존 — 미완성 표기 확정·정리(사용자 화면에 그대로 노출됨)",text:_hitW}); }
  /* [ADD 2026-07-20] '[표]' 언급인데 표 데이터 없음 — exp.tbl 필드·tbl:// 참조 둘 다 없으면 표 누락 의심 */
  if(_qcOn('gichul','TBL_MENTION_NO_TABLE')){ var _blobT=''; try{ _blobT=JSON.stringify(q)||''; }catch(_){} if(_blobT.indexOf('[표]')!==-1 && _blobT.indexOf('tbl://')===-1 && !(q&&q.exp&&q.exp.tbl)) v.push({kind:'warn',field:'q',idx:0,code:'TBL_MENTION_NO_TABLE',msg:"'[표]' 언급인데 표 데이터 없음(exp.tbl·tbl:// 모두 부재) — 표 누락(데이터방 확인) 또는 문구 정리",text:'[표]'}); }
  o.forEach(function(t,i){ if(t&&/\ubcf4\uae30\s*\d/.test(String(t))) v.push({kind:'warn',field:'o',idx:i,code:'O_SELFREF',msg:'\ud574\uc124(o)\uc5d0 \ubcf4\uae30\ubc88\ud638\u00b7\uc790\uae30\ucc38\uc870(\ubcf4\uae30N/\uc774 \ubcf4\uae30/\u3131:) \u2192 \uc5d4\uc9c4 \uc790\ub3d9\uc774\ub77c \ub123\uc9c0 \uc54a\uc74c',text:t}); });
  if(isMCQ && !isCalc){
    /* \uc2dd\ubcc4\ud615 \ubc1c\ubb38(\ubc11\uc904/\uc774 \uc778\ubb3c/\uc774 \ub2e8\uccb4/(\uac00)/\ud65c\ub3d9\u00b7\uc124\uba85\uc73c\ub85c \uc633\uc740)\uc740 \ubcf4\uae30 \ud65c\ub3d9\uc744 \ub418\ubc1b\uc544 \uc8fc\uccb4 \uc9c0\ubaa9\ud558\ub294 \uad6c\uc870 \u2192 O_ECHO \uba74\uc81c */
    var _idQ=/\ubc11\uc904|\uc774\s*\uc778\ubb3c|\uc774\s*\ub2e8\uccb4|\uc774\s*\ub098\ub77c|\uc774\s*\uc655|[(\uff08]\s*[\uac00-\ud558]\s*[)\uff09]|\ud65c\ub3d9\uc73c\ub85c\s*\uc633|\uc124\uba85\uc73c\ub85c\s*\uc633|\ud55c\s*\uc77c\ub85c\s*\uc633/.test(String(q.q||''));
    o.forEach(function(t,i){ var op=opts[i]; if(!(t&&String(t).trim())||!op||String(op).length<10) return; if(/^[\u3131-\u314e][\s,\u3131-\u314e]*$/.test(String(op).trim())) return; var _ts=String(t);
      /* \u00a7376/1257 \uc608\uc678: \ud2c0\ub9b0 \ubcf4\uae30 \ubc18\ubc15 \uc778\uc6a9(\uc0ac\uc720 \uc788\uc73c\uba74 \ud5c8\uc6a9)\u00b7\uc218\uce58 \uac80\uc99d(\ubcf4\uae30 \uc218\uce58 \uadf8\ub300\ub85c \uacc4\uc0b0 \ud655\uc778)\uc740 \ubca0\ub07c\uae30 \uc544\ub2d8 */
      var _rebut=/\uc633\uc9c0\s*\uc54a|\ud2c0\ub9ac|\ud2c0\ub9b0|\uc544\ub2c8\ub2e4|\uc544\ub2c8\ub77c|\ubc18\ub300|\uc798\ubabb|\ud574\ub2f9\ud558\uc9c0\s*\uc54a|\ub2ec\ub77c|\ub4e4\uc9c0\s*\uc54a|\ub4e4\uc5b4\uac00\uc9c0\s*\uc54a|\ud3ec\ud568\ub418\uc9c0\s*\uc54a|\uac70\uafb8\ub85c/.test(_ts);
      var _hasNum=/[0-9]/.test(_ts);
      var _ident=/(\uac83\uc740|\ub2e8\uccb4\ub294|\uc778\ubb3c\uc740|\ub098\ub77c\ub294|\uc2dc\uae30\ub294|\uc655\uc870\ub294|\uae30\uad6c\ub294)\s/.test(_ts); /* \uc2dd\ubcc4\uadc0\uc18d(\uad6d\uc0ac \uc778\ubb3c/\ud65c\ub3d9 \uc9c0\ubaa9)\uc740 \ubca0\ub07c\uae30 \uc544\ub2d8 */
      if(_rebut||_hasNum||_ident||_idQ) return;
      var run=_qgRunMatch(op,t); if(_qcOn('gichul','O_ECHO_OPT') && run>=_qcN('gichul','O_ECHO_OPT','minRun',4)) v.push({kind:'warn',field:'o',idx:i,code:'O_ECHO_OPT',msg:'\ud574\uc124(o)\uc774 \ubcf4\uae30 \ubb38\uc7a5 \ubca0\ub07c\uae30(\uc5f0\uc18d '+run+'\uc5b4\uc808) \u2192 \ubca0\ub07c\uc9c0 \ub9d0\uace0 \uc65c \uc633\uc740\uc9c0/\ud2c0\ub9b0\uc9c0 \uc0ac\uc720\ub85c',text:t}); });
  }
  cards.forEach(function(c,j){
    if(!c) return; var d=String(c.d||''), cx=String(c.cx||''), t=String(c.t||'');
    if(d&&cx&&_qgSim(d,cx)>=0.5) v.push({kind:'warn',field:'card',idx:j,code:'CX_ECHO_D',msg:'\uac1c\ub150\uce74\ub4dc '+(j+1)+' \uc608\uc2dc(cx)\uac00 \uc815\uc758(d) \ub418\ud480\uc774 \u2192 \ub2e4\ub978 \uc7a5\uba74\u00b7\uc218\uce58\ub85c',text:cx});
    if(/^(\uc774|\uadf8|\uc704|\ud574\ub2f9)\s/.test(d.trim())||/^(\uc774|\uadf8|\uc704|\ud574\ub2f9)\s/.test(cx.trim())) v.push({kind:'warn',field:'card',idx:j,code:'CARD_DEICTIC',msg:'\uac1c\ub150\uce74\ub4dc '+(j+1)+' \uc815\uc758/\uc608\uc2dc\uac00 \uc9c0\uc2dc\uc5b4(\uc774/\uadf8/\uc704)\ub85c \uc2dc\uc791 \u2192 \uc77c\ubc18 \uc815\uc758\ubb38\uc73c\ub85c',text:t});
    if(/\ubcf4\uae30\s*\d|\uc815\ub2f5|\uc2dc\ud5d8\s*\ud3ec\uc778\ud2b8/.test(t+' '+d+' '+cx)) v.push({kind:'warn',field:'card',idx:j,code:'CARD_LABEL',msg:'\uac1c\ub150\uce74\ub4dc '+(j+1)+'\uc5d0 \ubcf4\uae30\u00b7\uc815\ub2f5\u00b7\uc2dc\ud5d8\ud3ec\uc778\ud2b8 \ub77c\ubca8(04 \u00a7A-4 \uae08\uc9c0) \u2192 \ube68\uac15 \uac15\uc870\ub85c\ub9cc',text:t});
  });
  if(isMCQ){
    var _card0=(function(){var _c0=(cards&&cards.length)?cards[0]:((_lk&&_lk.length)?_lk[0]:null);return _c0?((_c0.d||'')+(_c0.cx||'')):'';})(); /* 관계도(REL_NO_ARROW) 판정은 첫 개념카드(card0)만 대상 — 문항 보기의 인물 수로 공유 개념카드 오탐 방지 */
    var _act={}; _card0.replace(/[\u7532\u4e59\u4e19\u4e01\u620a\u5df1\u5e9a]/g,function(x){_act[x]=1;return x;});
    var _relHit=_rel.test((q.q||'')+' '+opts.join(' ')+' '+o.join(' '));
    if(_qcOn('gichul','REL_NO_ARROW') && !_cptSkip && Object.keys(_act).length>=3 && _relHit && !_arrow.test(_card0)) v.push({kind:'warn',field:'card',idx:0,code:'REL_NO_ARROW',msg:'\uc778\ubb3c 3\uba85+ \uad00\uacc4\ud615 \ubb38\ud56d\uc778\ub370 \ud654\uc0b4\ud45c \ud750\ub984\ub3c4 \uc5c6\uc74c \u2192 \uccab \uac1c\ub150\uce74\ub4dc cx\uc5d0 \uad00\uacc4\ub3c4 \ucd94\uac00(04 \u00a7B)',text:''});
  }
  if(isMCQ){
    var _qCalc=_isCalcQ(q); /* A-7 예외(b): CALC 단계풀이 ex는 장면 검사 면제 */
    var _qCast=/[甲乙丙丁戊己庚辛壬癸]/.test(String(q.q||'')+' '+opts.join(' ')+' '+String(q.jaryo||'')); /* 문항이 배역 제공 → 예시는 역할 유지(A-7② 단서) */
    ex.forEach(function(t,i){
      if(!(t&&String(t).trim())) return;
      var isScene=_qgAction.test(t)||_qgNamed(t);
      if(!_qCalc && _qcOn('gichul','EX_NONAME') && _qgAction.test(t) && !_qgNamed(t)) v.push({kind:'warn',field:'ex',idx:i,code:'EX_NONAME',msg:'\uc608\uc2dc\uac00 \uc7a5\uba74(\ud589\uc704)\uc778\ub370 \uba85\uba85 \uc778\ubb3c(\u7532\u4e59\u4e19\u2026) \uc5c6\uc74c',text:t});
      if(!_qCalc && _qcOn('gichul','EX_GENERIC_NOUN') && isScene){ var _egn=String(t).replace(/<[^>]+>/g,'').match(/(\ub2f4\ubcf4\ubb3c(?!\uad8c)|\uc810\uc720\ubb3c(?!\ubc18\ud658|\uc758\s*\ubc18\ud658|\ubc29\ud574\uc81c\uac70|\ubc29\ud574\uc608\ubc29)|\ubaa9\uc801\ubb3c|\ubb3c\ud488(?!\uc138|\ub300\uae08)|\uadf8 \ubb3c\uac74|\ud574\ub2f9 \ubb3c\uac74|\uc5b4\ub5a4 \ubb3c\uac74|\uadf8 \ub3d9\uc0b0)/); if(_egn && !(_egn[1]==='\ubaa9\uc801\ubb3c' && /(\uc800\ub2f9|\uc9c8\uad8c|\uc720\uce58\uad8c|\uc804\uc138\uad8c)/.test(_egn.input))) v.push({kind:'warn',field:'ex',idx:i,code:'EX_GENERIC_NOUN',msg:'\uc608\uc2dc\uc5d0 \ub300\ud45c\uba85\uc0ac('+_egn[1]+') \u2014 \uad6c\uccb4\uba85\uc0ac(\ud734\ub300\ud3f0\u00b7\uc2dc\uacc4\u00b7\uc790\uc804\uac70\u00b7\ub178\ud2b8\ubd81 \ub4f1)\ub85c \uad50\uccb4(\u00a7A-3 \uc608\uc2dc\uaddc\uce59)',text:t}); }
      if(_qcOn('gichul','EX_PROSE_CALC')){ var _pcx=_qgProseCalc(t); if(_pcx) v.push({kind:'warn',field:'ex',idx:i,code:'EX_PROSE_CALC',msg:'\uc124\uba85 \ubb38\uc7a5\uacfc \uacc4\uc0b0\uc2dd\uc774 \uac19\uc740 \uc904\uc5d0 \ubd99\uc74c \u2014 \uc124\uba85 \ub2e4\uc74c\uc5d0\uc11c \uac1c\ud589\ud574 \uc2dd\uc744 \ubcc4\ub3c4 \uc904\ub85c(\uae34 \uc2dd\ub3c4 \uc911\uac04\uc5d0\uc11c \uac1c\ud589). \uc0c1\uc138\ud480\uc774\u00b7\ud574\uc124 \uac00\ub3c5\uc131',text:_pcx}); }
      if(_qcOn('gichul','EX_REP_VERB')){ var _rvs=String(t).replace(/<[^>]+>/g,''); if(/(?<![\uac00-\ud7a3])(\uc18d\uc544\uc11c|\uc18d\uc544|\uc18d\uc5ec|\uc18d\uc740|\uc18d\uc778)/.test(_rvs) && !/(\uc9c4\ud488|\uc911\uace0|\uc2dc\uc138|\uac10\uc815|\ud5c8\uc704|\uac00\uc9dc|\uc704\uc870|\uacc4\uc57d\uc11c|\uac01\uc11c|\ubcf4\uc99d|\uc704\uc7a5|\ud5c8\uc704\ub9e4\ubb3c|\ubc14\uafd4\uce58\uae30)/.test(_rvs) && !_qgQuotedSpec(_rvs,2,8)) v.push({kind:'warn',field:'ex',idx:i,code:'EX_REP_VERB',msg:'\uc608\uc2dc\uac00 \ub300\ud45c\ub3d9\uc0ac(\uc18d\uc544\uc11c \ub4f1)\ub85c \uc0ac\uae30\ub97c \ubb49\ub6b1\uadf8\ub9bc \u2014 \ubb34\uc5c7\uc744 \uc5b4\ub5bb\uac8c \uc18d\uc600\ub294\uc9c0 \uad6c\uccb4 \uc815\ud669\uc73c\ub85c(\uc608: \uc911\uace0 \uc2dc\uacc4\ub97c \uc9c4\ud488\uc774\ub77c \uc18d\uc5ec \ud310\ub9e4)',text:t}); }
      if(/^\uc608\s*\)/.test(String(t).trim())) v.push({kind:'warn',field:'ex',idx:i,code:'EX_PREFIX',msg:"\uc608\uc2dc\uc5d0 '\uc608)' \uc811\ub450 \uae08\uc9c0(\uc571\uc774 \uc608\uc2dc \ub77c\ubca8 \uc790\ub3d9 \ubd80\ucc29)",text:t});
      if(/\uc81c\s*\d+\s*\uc870/.test(t)) v.push({kind:'warn',field:'ex',idx:i,code:'EX_JOMUN',msg:'\uc608\uc2dc\uc5d0 \uc870\ubb38\ubc88\ud638(\uc81cN\uc870) \uae08\uc9c0 \u2014 \uc870\ubb38\uc740 \uac1c\ub150 d\uc5d0\ub9cc',text:t});
      if(/[甲乙丙丁戊己庚辛壬癸]/.test(String(t))){ var _pt=String(t).replace(/<[^>]+>/g,'').trim(); /* A-7 검사범위: 甲乙丙 등장 ex만 ①② 검사 */
        if(!_qCalc && _qcOn('gichul','EX_NO_SUBJECT_FIRST')){ var _okStart=/^([\u7532\u4e59\u4e19\u4e01\u620a]|[XYZ])/.test(_pt) && !/^([\u7532\u4e59\u4e19\u4e01\u620a]|[XYZ][\uac00-\ud7a3]*)\uc758\s/.test(_pt); var _actorSubj=/[\u7532\u4e59\u4e19\u4e01\u620a\u5df1\u5e9a\u8f9b\u58ec\u7678][\uac00-\ud7a3]{0,4}(\uc774|\uac00|\uc740|\ub294|\uc5d0\uac8c|\uaed8\uc11c|\uaed8)/.test(_pt)||/[XYZ][\uac00-\ud7a3]*(\uc774|\uac00|\uc740|\ub294|\uc5d0\uac8c|\uaed8\uc11c)/.test(_pt); if(!_okStart && !_actorSubj) v.push({kind:'warn',field:'ex',idx:i,code:'EX_NO_SUBJECT_FIRST',msg:'\uc7a5\uba74\uc774 \uc778\ubb3c \uc8fc\uc5b4(\u7532\u4e59\u00b7X\ud68c\uc0ac)\ub85c \uc2dc\uc791 \uc548 \ud568(\ubd80\uc0ac\uc808\u00b7\uc18c\uc720\uaca9 \uc55e\uc5d0 \uc634) \u2014 \u00a7A-7\u2460 \u7532 \ubb38\ub450',text:t}); }
        if(!_qCalc && !_qCast && _qcOn('gichul','EX_NOT_GAP_FIRST')){ var _fpm=_pt.match(/[\u7532\u4e59\u4e19\u4e01\u620a]/); if(_fpm && _fpm[0]!=='\u7532') v.push({kind:'warn',field:'ex',idx:i,code:'EX_NOT_GAP_FIRST',msg:'\ucc98\uc74c \ub4f1\uc7a5 \uc778\ubb3c\uc774 \u7532\uc774 \uc544\ub2cc '+_fpm[0]+' \u2014 \u00a7A-7\u2461 \u7532\ubd80\ud130 \uc21c\uc11c\ub300\ub85c',text:t}); }
      }
      var oi=o[i], echo=false;
      if(oi && String(oi).trim()){
        var sim=_qgSim(_qgStripVerdict(oi), t), run=_qgRunMatch(oi,t);
        if(!_qCalc && _qcOn('gichul','EX_ECHO') && (sim>=_qcN('gichul','EX_ECHO','minSim',0.5) || run>=_qcN('gichul','EX_ECHO','minRun',6))){ echo=true; v.push({kind:'warn',field:'ex',idx:i,code:'EX_ECHO',msg:'\uc608\uc2dc\uac00 \ud574\uc124(o) \ub418\ud480\uc774(\uc720\uc0ac\ub3c4 '+Math.round(sim*100)+'%\u00b7\uc5f0\uc18d\uc77c\uce58 '+run+'\uc5b4\uc808) \u2192 \ub2e4\ub978 \uc7a5\uba74\u00b7\uc218\uce58\ub85c',text:t}); }
      }
      if(!_qCalc && _qcOn('gichul','EX_SHORT') && isScene && !echo){ var _L=String(t).replace(/<[^>]+>/g,"").trim().length; if(_L<_qcN('gichul','EX_SHORT','minChars',60)) v.push({kind:'warn',field:'ex',idx:i,code:'EX_SHORT',msg:'\uc608\uc2dc\uac00 \uc7a5\uba74\uc778\ub370 '+_L+'\uc790(60\uc790 \ubbf8\ub9cc) \u2014 \ub2e8\uc21c\ubc18\ubcf5 \uc758\uc2ec, \uc2e4\uc0dd\ud65c \uc7a5\uba74\uc73c\ub85c \uc0b4 \ubd99\uc774\uae30',text:t}); }
      /* [2026-08-05] EX_STUB — 토막 예시 차단.
         위 EX_SHORT 는 isScene(행위 동사·등장인물)이 있어야 길이를 재서,
         정작 가장 짧은 '동일 채권·여러 부동산.' 같은 토막은 장면으로 안 보여
         검사를 통째로 건너뛰었다(라이브 실측: 25자 이하 1,224칸 중 EX_SHORT 가 잡은 건 1칸).
         짧을수록 빠져나가는 구조였다 → isScene 과 무관하게 재고 block 처리.
         [dia] 관계도는 본문이 아니므로 떼고 센다. */
      if(!_qCalc && _qcOn('gichul','EX_STUB')){
        var _sb=String(t).replace(/\[dia\][\s\S]*?\[\/dia\]/g,'').replace(/\[eq\][\s\S]*?\[\/eq\]/g,'').replace(/<[^>]+>/g,'').trim();
        var _SL=_sb.length;
        /* 끝의 괄호 보충설명·마침표를 떼고 평서형 '…다' 로 끝나는지 본다.
           토막은 '불가분성.' '현명 필요.' '계약=합치.' 처럼 체언으로 끝나고,
           짧지만 온전한 설명은 '…한다.' 로 끝난다 — 이 차이가 가장 잘 갈라낸다.
           실측: 감정평가사 레벨업 987칸을 잡고, 다른 자격증에서는 2칸만 걸렸다(둘 다 진짜 결함). */
        var _decl=/다$/.test(_sb.replace(/\([^)]*\)\s*\.?\s*$/,'').replace(/[\s.]+$/,''));
        if(_SL>0 && (_SL<_qcN('gichul','EX_STUB','minChars',15)
                     || (!_decl && _SL<_qcN('gichul','EX_STUB','minDeclChars',25))))
          v.push({kind:'warn',field:'ex',idx:i,code:'EX_STUB',msg:'예시(ex)가 '+_SL+'자 토막'+(_decl?'':'·문장 미완성')+' — 개념 요약이지 예시가 아니다. 누가·무엇을·어떻게 가 드러나는 장면으로 다시 쓸 것',text:t});
      }
    });
    var _fex=[]; ex.forEach(function(t,i){ if(t&&String(t).trim()) _fex.push([i,t]); });
    for(var a=0;a<_fex.length;a++) for(var b=a+1;b<_fex.length;b++){ if(!_qCalc && _qcOn('gichul','EX_EX_ECHO') && _qgSim(_fex[a][1],_fex[b][1])>=_qcN('gichul','EX_EX_ECHO','minSim',0.5)) v.push({kind:'warn',field:'ex',idx:_fex[b][0],code:'EX_EX_ECHO',msg:'\uc608\uc2dc '+_fex[a][0]+'\ubc88\uacfc \uc8fc\uc5b4\u00b7\uc0c1\ud669\uc774 \ubc18\ubcf5 \u2192 \uc11c\ub85c \ub2e4\ub978 \uc7a5\uba74\uc73c\ub85c',text:_fex[b][1]}); }
    ex.forEach(function(t,i){ if(_qcOn('gichul','EX_MULTILINE') && String(t||'').replace(/\[dia\][\s\S]*?\[\/dia\]/g,'').split(/\n/).filter(function(l){return l.trim();}).length>=2) v.push({kind:'warn',field:'ex',idx:i,code:'EX_MULTILINE',msg:'예시/풀이(ex) 한 원소에 여러 줄 \u2014 줄은 배열 원소로 쪼갬(안 그러면 화면서 한 줄로 붙음)',text:t}); });
    if(_qcOn('gichul','EX_STEPS_CRAMMED') && _isCalcQ(q)){ ex.forEach(function(t,i){ var _cl=_qgCrammedSteps(t); if(_cl) v.push({kind:'warn',field:'ex',idx:i,code:'EX_STEPS_CRAMMED',msg:'\ud55c ex \uc6d0\uc18c\uc5d0 \uacc4\uc0b0 \ub2e8\uacc4(\u2460\u2461\u2462/1.2.3.) \uc5ec\ub7ec \uac1c \ubb49\uce68 \u2192 \ub2e8\uacc4=\ubc30\uc5f4 \uc6d0\uc18c \ud558\ub098\ub85c \ucabc\uac2c \u00a7367',text:_cl}); }); }
    if(_qcOn('gichul','EX_STEPS_NOBR') && !_isCalcQ(q)){ ex.forEach(function(t,i){ var _cl=_qgCrammedSteps(t); if(_cl) v.push({kind:'warn',field:'ex',idx:i,code:'EX_STEPS_NOBR',msg:'예시(ex)에 단계(1.2.3./①②③) 나열이 한 덩어리로 붙음(화면에도 그대로 붙어 보임) → 계산 단계면 원문자 ①②③로, 일반 예시면 이어지는 문장·장면으로 재작성',text:_cl}); }); }
    var _exArrLen=ex.length;
    if(_exArrLen>0 && _exArrLen!==o.length && !_isCalcQ(q)) v.push({kind:'warn',field:'ex',idx:0,code:'EX_LEN',msg:'\uc608\uc2dc \ubc30\uc5f4 \uae38\uc774('+_exArrLen+') \u2260 \ud574\uc124 \uae38\uc774('+o.length+') \u2192 \ubcf4\uae30 \uc218\ub9cc\ud07c \ub9de\ucda4(\uc5b5\uc9c0 \uc7a5\uba74\uc740 \ube48\uce78)',text:''});
  }
  if(_qcOn('gichul','BARE_ACRONYM')){ var _allT=[].concat(o||[],ex||[]).map(function(x){return String(x||'');}).join('\n'); var _ACR=/\b(GDP|GNP|GNI|GDI|LTV|DTI|DSR|MRTS|MRTP|MRT|MRS|IRR|NPV|ROE|ROA|EPS|PER|PBR)\b/g, _seen={}, _mm; while((_mm=_ACR.exec(_allT))){ var _ac=_mm[1]; if(_seen[_ac])continue; _seen[_ac]=1; var _re2=new RegExp('(?:'+_ac+'\\s*[(\uff08]|[(\uff08]\\s*'+_ac+'\\s*[)\uff09])'); /* [FIX 2026-07-16] 약자(한글)뿐 아니라 한글(약자) 병기도 인정 */ if(!_re2.test(_allT)) v.push({kind:'warn',field:'o',idx:0,code:'BARE_ACRONYM',msg:'\uc601\uc5b4\uc57d\uc790 '+_ac+' \ud480\uc774 \uc5c6\uc774 \ub178\ucd9c \u2014 \uccab \ub4f1\uc7a5 1\ud68c \ud480\uc5b4\uc4f0\uae30('+_ac+', \ud55c\uae00\ud480\uc774) \u00a72-1',text:_ac}); } }
  return v;
}
/* 검수 게이트 우회 스위치 — [2026-08-03 판 16] 정비가 끝나 false 로 복구했다(판정대기 #37 닫음).
 * true면 qualityGate가 block(필수통과 위반)을 비워 업로드를 강행 허용한다(위반은 warn으로 여전히 표시).
 * 복구 근거 ① GATE-1·2·3 이 판 8에서 닫혔다. ② 라이브 전량 9,822문항(기출 5,979 + 레벨업 3,843)을
 *   이 엔진으로 재측정해 block 줄이 0 이다(warn 977은 그대로) → 켜도 막히는 것이 없다.
 * ③ 음성테스트 7/7 — em대시·플레이스홀더를 심은 문항은 false 에서 실제로 막히고 true 에서는 안 막힌다.
 * 참고: 서버 functions/qcUpload.js 의 structureGate 는 이 스위치를 보지 않고 늘 block 을 차단해 왔다.
 *   즉 이 스위치는 관리자 화면 쪽 선이고, 이번 복구로 두 선의 기준이 같아진다.
 * [엔진 #24 · 2026-08-03] 그 structureGate 가 이제 qualityGate 를 부르므로 스위치를 **보기는 한다.**
 *   다만 서버(node)에는 이 값을 true 로 바꾸는 코드가 없어 늘 false → 실질은 예전처럼 엄격한 쪽 그대로다.
 * 측정 스크립트: certlab-autoqc/work/gate12/D_measure.js · 음성테스트 D_neg.js */
var _qcGateBypass = (typeof _qcGateBypass!=='undefined') ? _qcGateBypass : false;
/* [\uc5d4\uc9c4 #19 \u00b7 2026-08-03] \uc6b0\ud68c \uacbd\uace0\ub97c \ub85c\ub4dc\uc2dc\uc810 \u2192 \uac8c\uc774\ud2b8 \uc2e4\ud589\uc2dc\uc810\uc73c\ub85c \uc62e\uacbc\ub2e4.
 * \uc61b \uc790\ub9ac(\uc774 \uc904)\uc5d0\uc11c\ub294 \ud654\uba74\uc5d0\uc11c \uc808\ub300 \uc548 \uc6b8\ub838\ub2e4 \u2014 \ube0c\ub77c\uc6b0\uc800\uc5d0\uc11c \uc774 \ud30c\uc77c\ubcf4\ub2e4 \uba3c\uc800 \uc2a4\uc704\uce58\ub97c \ucf1c\ub294 \uc2a4\ud06c\ub9bd\ud2b8\uac00
 * \uc5c6\uc73c\ubbc0\ub85c \ub85c\ub4dc\uc2dc\uc810 \uac12\uc740 \ub298 false \uc600\uace0, \ucf58\uc194\uc5d0\uc11c \ub098\uc911\uc5d0 \ucf1c\uba74 \uc774 \uc904\uc740 \uc774\ubbf8 \uc9c0\ub098\uac04 \ub4a4\uc600\ub2e4.
 * \uc774\uc81c qualityGate \uc548\uc5d0\uc11c \uc2e4\uc81c\ub85c \uc6b0\ud68c\uac00 \uc801\uc6a9\ub420 \ub54c 1\ud68c \uc6b8\ub9b0\ub2e4(_qcBypassWarned). */
var _qcBypassWarned = false;
/* \uad6c\uc220\u00b7\uc2e4\uae30 \uacfc\ubaa9(\uac1c\ub150 \ub808\uc774\uc5b4 \uc5c6\uc774 \uc6b4\uc601)\uc740 '\uac1c\ub150 \ubbf8\uc5f0\uacb0(exp.cpt \ube44\uc5b4)' \uc608\uc678. \ud638\uc2a4\ud2b8\uac00 \uc804\uc5ed\uc73c\ub85c \ub36e\uc5b4\uc4f8 \uc218 \uc788\uc74c. */
var _qcCptExemptCerts = (typeof _qcCptExemptCerts!=='undefined') ? _qcCptExemptCerts : ['bodybuilding'];

function qualityGate(questions){
  var block=[], warn=[];
  if(_qcGateBypass && !_qcBypassWarned){ _qcBypassWarned=true;
    try{ if(typeof console!=='undefined') console.warn('[QC] \u26a0\ufe0f _qcGateBypass=true \u2014 \uac80\uc218 \ud544\uc218\ud1b5\uacfc \uc5c6\uc774 \uc5c5\ub85c\ub4dc \uac15\ud589 \uc911. \uc815\ube44 \ud6c4 false \ubcf5\uad6c \ud544\uc694.'); }catch(e){}
  }
  function _push(id,x){
    var line=id+' '+(x.field==='card'?('card'+x.idx):(x.field+'['+x.idx+']'))+' '+x.msg;
    if(x.kind==='block' && !_qcGateBypass) block.push(line); else warn.push(line);  /* \uc6b0\ud68c ON\uc774\uba74 block\u2192warn(\uc5c5\ub85c\ub4dc \uac15\ud589) */
  }
  (questions||[]).forEach(function(q){
    var id=(q&&q.id)||'?';
    _qcViolations(q).forEach(function(x){ _push(id,x); });
  });
  /* [\uc5d4\uc9c4 #18 \u00b7 2026-08-03] \ubc88\ub4e4 \uac80\uc0ac(\ubb38\ud56d \ud558\ub098\ub9cc \ubd10\uc11c\ub294 \ubabb \ubcf4\ub294 \uac83) \ud3b8\uc785 \u2014 \uc9c0\uae08\uc740 DUP_ID \ud558\ub098\ub2e4.
   * \uadf8 \uc804\uc5d0\ub294 _qcBundle \uc774 QC.bundle \ub85c \ub0b4\ubcf4\ub0b4\uc9c0\uae30\ub9cc \ud558\uace0 \uc544\ubb34 \ub370\uc11c\ub3c4 \uc548 \ubd88\ub824, \ubc45\ud06c \uc548\uc5d0 id \uac00 \uacb9\uccd0\ub3c4
   * \uad00\ub9ac\uc790 \ud654\uba74\u00b7\uc5c5\ub85c\ub4dc \uac8c\uc774\ud2b8\uc5d0 \ud55c \uc904\ub3c4 \uc548 \ub5b4\ub2e4(\uc5c5\uc11c\ud2b8\uc5d0\uc11c \uc11c\ub85c \ub36e\uc5b4\uc368 \ubb38\ud56d\uc774 \uc870\uc6a9\ud788 \uc0ac\ub77c\uc9c0\ub294 \uacb0\ud568).
   * \u26a0 questions \ub294 '\ud55c \ubc45\ud06c' \ub2e8\uc704\ub85c \ub4e4\uc5b4\uc640\uc57c \ub73b\uc774 \ub9de\ub2e4(\ud638\ucd9c\ucc98 \uc804\ubd80 \ubc45\ud06c \ub2e8\uc704\uc784\uc744 \ud655\uc778). */
  try{ _qcBundle(questions).forEach(function(x){ _push(x.qid||'?', x); }); }catch(e){}
  return {block:block, warn:warn};
}

/* ---- [2026-08-08] 그래프 색 등록부 ----
   색 실선을 허용하는 대신(GRP_LINE_COLORED 개정) 쓸 수 있는 색을 여기 적힌 것으로 묶는다.
   개수를 정해 두는 게 아니라 **목록**이다 — 새 색이 필요하면 여기 한 줄 더하면 된다.
   그래야 색이 늘어도 "같은 역할에 미묘하게 다른 색"(빨강 두 값·초록 다섯 값)이 안 생긴다. */
var _QC_PALETTE=[
  '#2563EB',                                   /* 파랑 — 수요·주곡선 1 */
  '#C0392B',                                   /* 빨강 — 공급·주곡선 2 */
  '#059669',                                   /* 초록 — 제3곡선 */
  '#7C3AED',                                   /* 보라 — 제4곡선 */
  '#CA8A04',                                   /* 노랑 — 강조·영역 */
  '#0F172A','#1E293B','#334155','#475569','#64748B','#94A3B8','#CBD5E1','#E2E8F0',  /* 회색 계열 */
  '#FFFFFF','#FFF','#NONE'                     /* 흰 채움 */
];

/* ---- [추출·확장] _QC_DEFAULTS (admin__20 4383-4390 → 신규 코드 추가) ---- */
var _QC_DEFAULTS={
  gichul:{ANS_VERDICT_MISMATCH:{on:true},EX_SHORT:{on:true,minChars:60},EX_STUB:{on:true,minChars:15,minDeclChars:25},O_ECHO_OPT:{on:true,minRun:4},EX_ECHO:{on:true,minSim:0.5,minRun:6},EX_NONAME:{on:true},EX_EX_ECHO:{on:true,minSim:0.5},EX_GENERIC_NOUN:{on:true},EX_PROSE_CALC:{on:true},EX_REP_VERB:{on:true},REL_NO_ARROW:{on:true},O_PLACEHOLDER:{on:true},O_INCOMPLETE:{on:true},EX_MULTILINE:{on:true},CALC_WRONG_SLOT:{on:true},COMBO_STMT_MISMATCH:{on:true},FILL_BLANK_MISMATCH:{on:true},O_ECHO_D:{on:true,minSim:0.6},O_NO_ACTOR:{on:true},O_STEPS_NOBR:{on:true},EX_STEPS_NOBR:{on:true},IMG_MISSING:{on:true},OTTAG_LEN:{on:true},EX_VERDICT:{on:true},EX_NOUN_END:{on:true},CALC_NO_FORMULA:{on:true},DUP_ID:{on:true},CONST_NO_BASIS:{on:false},CALC_MECHANICAL:{on:true},CALC_REPEAT_LEAD:{on:true},CALC_NO_APPROACH:{on:false},TYPE_MISMATCH:{on:true},EX_SUM_CRAMMED:{on:true},EX_SUM_MULTILINE:{on:true},CALC_SUM_ANS:{on:true},CALC_NEWFMT_PARTIAL:{on:true},CALC_NO_TIP:{on:false},CALC_FLAG_MISMATCH:{on:true},OX_STMT_MISMATCH:{on:true},OX_DUP_PATTERN:{on:true},CALC_OLD_FORMAT:{on:true},CALC_ARITH_MISMATCH:{on:true},CALC_ANS_NO_MATCH:{on:true},FACTOR_TABLE_PROSE:{on:true,minVals:4},EX_MISSING:{on:true},EX_COVERAGE:{on:true},O_SHORT:{on:true,minChars:60},CALC_HIDDEN_BY_TYPE:{on:true},Q_TABLE_PROSE:{on:true,minNums:8},CALC_FIELDS_ON_NONCALC:{on:true},ALLANS_NO_NOTE:{on:true},CALC_EX_3X:{on:true,ratio:3},WORK_MEMO_LEFT:{on:true},TBL_MENTION_NO_TABLE:{on:true}},
  link:{CPT_UNLINKED:{on:true},CPT_BROKEN:{on:true},CPT_CX_EMPTY:{on:true},CHILD_MISSING:{on:true},TBL_BROKEN:{on:true},GRP_BROKEN:{on:true},MN_BROKEN:{on:true},ITV_BROKEN:{on:true}},
  levelup:{LVUP_ANS_SKEW:{on:true,maxPct:30},LVUP_DUP:{on:true},LVUP_LV_BAND:{on:false},LVUP_COUNT:{on:false,floor:100}},
  concept:{CX_ECHO_D:{on:true,minSim:0.5},CX_SHORT:{on:true,minLines:4,minChars:60},CX_NONAME:{on:true},CX_DEICTIC:{on:true},CD_D_NAMED:{on:true},CD_OLD_FIELD:{on:true},CPT_NO_CARDS:{on:true},CD_NO_D:{on:true},CX_EMPTY:{on:true},CPT_DUP:{on:true},D_SHORT:{on:true,minChars:60}},
  mnem:{MN_LETTER_UNEXPLAINED:{on:true},MN_QSPECIFIC_TRAP:{on:true},MN_DESC_EMPTY:{on:true},MN_NO_K:{on:true},MN_DESC_NO_RED:{on:true},MN_DESC_REDUP:{on:true},MN_SLASH:{on:true},MN_DUP:{on:true},MN_SYMBOL:{on:true},MN_DESC_SHORT:{on:true,minChars:25},MN_DESC_LIST_ONLY:{on:true},MN_DESC_NO_TOPIC:{on:true}},
  table:{TBL_RAGGED:{on:true},TBL_NO_CAPTION:{on:true},TBL_NO_HEADERS:{on:true},TBL_NO_ROWS:{on:true},TBL_HTML_NO_TYPE:{on:true},TBL_DUP:{on:true}},
  graph:{GRP_PARAMS_OBJ:{on:true},GRP_TYPE:{on:true},GRP_NO_SVG:{on:true},GRP_SVG_MALFORMED:{on:true},GRP_RAW_LT:{on:true},GRP_RAW_LT_ATTR:{on:true},GRP_STRAY_SLASH:{on:true},GRP_EXTERNAL:{on:true},GRP_NO_VIEWBOX:{on:true},GRP_FONT:{on:true},GRP_NO_TEXT:{on:true},GRP_EMDASH:{on:true},GRP_DUP:{on:true},GRP_NO_GUIDE:{on:true},GRP_TEXT_CLIP:{on:true},GRP_LINE_COLORED:{on:true,endPx:30,darkLabelChars:8},GRP_PALETTE:{on:true},GRP_ARROW_OVERLAP:{on:true,minPx:3},GRP_COLOR_ORPHAN:{on:true},GRP_LABEL_ON_LINE:{on:true},GRP_GUIDE_ONE_AXIS:{on:true},GRP_DOT_OFF_CURVE:{on:true},GRP_GUIDE_OVER_LINE:{on:true},GRP_GUIDE_NARROW:{on:true,ratio:0.72},GRP_TEXT_OVERLAP:{on:true,minX:0,minY:0},GRP_FLOW_ARROW:{on:true,tolPx:3},GRP_FLOW_GUIDE:{on:true},GRP_FLOW_ALIGN:{on:true}},
  interactive:{ITV_UNKNOWN:{on:true},ITV_NO_PARAMS:{on:true},ITV_DUP:{on:true}}
};

/* ===========================================================================
   [신규] V2 §12 업그레이드 모듈 — 이하 전부 qc-core.js 추가분
   1) 치명도 4등급(BLOCKER/ERROR/WARNING/INFO)  2) 마스터 연결 편입(_qcMasterLink)
   3) 미구현 per-q 규칙(ottag 길이·CALC 흐름·상수 근거)  4) 번들(id중복)  5) 레벨업 전용
   =========================================================================== */

/* ---- 1) 치명도 4등급 매핑 ----
   기존 violation.kind(block/warn)는 게이트 동작 호환을 위해 그대로 두고, x.sev를 추가로 부여한다.
   BLOCKER = 임포터가 실제 차단(생성일/updatedAt·스키마) · ERROR = MUST 위반(반송)
   WARNING = SHOULD 위반(권장 수정) · INFO = NICE(참고). 미등록 코드는 kind로 폴백. */
var _QC_SEV = {
  /* ERROR (MUST — 반송) */
  EMDASH:'ERROR', VERDICT:'ERROR', EX_VERDICT:'ERROR', CARD_CX_EMPTY:'ERROR', O_PLACEHOLDER:'ERROR',
  CALC_WRONG_SLOT:'ERROR', FILL_BLANK_MISMATCH:'ERROR', CPT_MISSING:'ERROR', CPT_BROKEN:'ERROR',
  TBL_BROKEN:'ERROR', GRP_BROKEN:'ERROR', ITV_BROKEN:'ERROR', CHILD_MISSING:'ERROR',
  OTTAG_LEN:'ERROR', DUP_ID:'ERROR',
  /* WARNING (SHOULD — 권장 수정) */
  ANS_VERDICT_MISMATCH:'WARNING',
  O_INCOMPLETE:'WARNING', COMBO_STMT_MISMATCH:'WARNING', O_ECHO_D:'WARNING', O_NO_ACTOR:'WARNING',
  O_STEPS_NOBR:'WARNING', EX_STEPS_NOBR:'WARNING', EX_STEPS_CRAMMED:'WARNING', O_ECHO_OPT:'WARNING',
  O_SELFREF:'WARNING', CX_ECHO_D:'WARNING', CARD_DEICTIC:'WARNING', CARD_LABEL:'WARNING',
  CARD_LT2:'ERROR', CARD_LT2_LINK:'WARNING', REL_NO_ARROW:'WARNING', EX_NONAME:'WARNING', EX_GENERIC_NOUN:'WARNING', EX_PROSE_CALC:'WARNING', EX_REP_VERB:'WARNING', EX_JOMUN:'WARNING', EX_NO_SUBJECT_FIRST:'WARNING',
  EX_NOT_GAP_FIRST:'WARNING', EX_ECHO:'WARNING', EX_SHORT:'WARNING', EX_EX_ECHO:'WARNING',
  /* [2026-08-05] EX_STUB — 경고로만 둔다(크리스 방침).
     차단을 걸어도 결국 같은 사람이 풀고 올리므로 문지기만 된다 — 경고를 보고 제대로 고치는 것이 목적.
     도입 시점 라이브 잔존 989칸/467문항(감정평가사 레벨업 987 + 그 밖 2). */
  EX_STUB:'WARNING',
  EX_MULTILINE:'WARNING', EX_LEN:'WARNING', BARE_ACRONYM:'WARNING', IMG_MISSING:'WARNING',
  WORK_MEMO_LEFT:'WARNING', TBL_MENTION_NO_TABLE:'WARNING',   /* [ADD 2026-07-20] 미완성 메모 잔존·[표] 누락 */
  EX_MISSING:'WARNING', EX_COVERAGE:'INFO', O_SHORT:'INFO',   /* [신규 2026-07-15] 예시전무=경고 / 예시일부·해설얇음=참고(소급 폭증 방지, 베이스라인 후 승격) */
  MN_BROKEN:'WARNING', CPT_UNLINKED:'WARNING', CPT_CX_EMPTY:'WARNING', CALC_NO_FORMULA:'WARNING',
  CALC_MECHANICAL:'INFO', CALC_REPEAT_LEAD:'INFO', TYPE_MISMATCH:'INFO',  /* 소급 폭증 방지: 신규 규칙은 INFO(비차단)로 도입, 베이스라인 정비 후 승격(qcDiff) */
  LVUP_ANS_SKEW:'WARNING', LVUP_COUNT:'INFO',
  EX_SUM_CRAMMED:'WARNING', EX_SUM_MULTILINE:'WARNING', CALC_SUM_ANS:'WARNING', CALC_NEWFMT_PARTIAL:'INFO', CALC_NO_TIP:'INFO', CALC_FLAG_MISMATCH:'INFO', CALC_ARITH_MISMATCH:'WARNING', CALC_ANS_NO_MATCH:'WARNING', FACTOR_TABLE_PROSE:'INFO',   /* [C-1 2026-07-30] 렌더 백로그 — q 불변이라 데이터로 닫을 수 없다 */
  OX_STMT_MISMATCH:'WARNING', OX_DUP_PATTERN:'WARNING',
  /* INFO (NICE — 참고) */
  EX_PREFIX:'INFO', CONST_NO_BASIS:'INFO', CALC_NO_APPROACH:'INFO', LVUP_LV_BAND:'INFO', LVUP_DUP:'ERROR',
  /* [신규 2026-07-15] 계산풀이 가려짐·q 표 줄글 */
  CALC_HIDDEN_BY_TYPE:'WARNING', Q_TABLE_PROSE:'INFO', CALC_FIELDS_ON_NONCALC:'WARNING', ALLANS_NO_NOTE:'WARNING', EX_NOUN_END:'WARNING', CALC_EX_3X:'INFO',   /* [C-1] Q_TABLE_PROSE 렌더 백로그 강등 */
  /* [신규 2026-07-15] 마스터 레코드 검수 — 레코드 날짜 */
  REC_DATE:'BLOCKER',
  /* 그래프 */
  GRP_NO_SVG:'ERROR', GRP_SVG_MALFORMED:'ERROR', GRP_EXTERNAL:'ERROR', GRP_EMDASH:'ERROR', GRP_DUP:'ERROR', GRP_RAW_LT:'ERROR',
  GRP_PARAMS_OBJ:'WARNING', GRP_RAW_LT_ATTR:'WARNING', GRP_TYPE:'WARNING', GRP_NO_VIEWBOX:'WARNING', GRP_FONT:'WARNING', GRP_NO_TEXT:'WARNING', GRP_STRAY_SLASH:'WARNING',
  /* 암기 */
  MN_LETTER_UNEXPLAINED:'WARNING', MN_QSPECIFIC_TRAP:'INFO',
  MN_DESC_EMPTY:'ERROR', MN_DUP:'ERROR', MN_NO_K:'WARNING', MN_DESC_NO_RED:'WARNING', MN_DESC_REDUP:'WARNING', MN_SLASH:'WARNING', MN_SYMBOL:'WARNING', MN_DESC_SHORT:'WARNING', MN_DESC_LIST_ONLY:'WARNING', MN_DESC_NO_TOPIC:'WARNING',
  /* 표 */
  TBL_NO_HEADERS:'ERROR', TBL_NO_ROWS:'ERROR', TBL_RAGGED:'ERROR', TBL_DUP:'ERROR', TBL_NO_CAPTION:'WARNING', TBL_HTML_NO_TYPE:'WARNING',
  /* 개념 */
  CPT_NO_CARDS:'ERROR', CD_NO_D:'ERROR', CPT_DUP:'ERROR', CX_EMPTY:'WARNING', CX_SHORT:'WARNING', CX_NONAME:'WARNING', CX_DEICTIC:'WARNING', CD_D_NAMED:'WARNING', CD_OLD_FIELD:'WARNING', D_SHORT:'WARNING',
  /* 인터랙티브 */
  ITV_NO_PARAMS:'ERROR', ITV_DUP:'ERROR', ITV_UNKNOWN:'WARNING'
};
/* [C-1 2026-07-30] 집계 트랙 — 'render' 는 앱 렌더 개선 대상이라 문항 지적 총계에서 빼고 따로 센다.
   q 가 불변필드라 데이터로는 닫을 수 없는 신호이기 때문이다. kind 는 warn 그대로 두어 게이트 동작은 안 바뀐다. */
var _QC_TRACK = { Q_TABLE_PROSE:'render', FACTOR_TABLE_PROSE:'render' };
function _qcTrackOf(code){ return _QC_TRACK[code] || 'data'; }
function _qcSevOf(code, kind){
  if(_QC_SEV[code]) return _QC_SEV[code];
  return (kind==='block') ? 'ERROR' : 'WARNING';   // 미등록은 kind로 폴백
}
/* 위반 배열에 sev 부여(+kind 정규화). BLOCKER/ERROR→block, WARNING/INFO→warn 로 kind 유지(게이트 호환) */
function _qcApplySev(vios){
  (vios||[]).forEach(function(x){
    x.sev = _qcSevOf(x.code, x.kind);
    x.track = _qcTrackOf(x.code);
    x.kind = (x.sev==='BLOCKER'||x.sev==='ERROR') ? 'block' : 'warn';
  });
  return vios;
}
var _QC_SEV_META = {
  BLOCKER:{label:'차단', icon:'⛔', bg:'#FEE2E2', fg:'#991B1B', bd:'#FCA5A5'},
  ERROR:  {label:'오류', icon:'⛔', bg:'#FEF2F2', fg:'#B91C1C', bd:'#FCA5A5'},
  WARNING:{label:'경고', icon:'⚠',  bg:'#FFFBEB', fg:'#B45309', bd:'#FDE68A'},
  INFO:   {label:'참고', icon:'ℹ️', bg:'#EFF6FF', fg:'#1D4ED8', bd:'#BFDBFE'}
};

/* ---- 참조 추출(개념·표·이미지·인터랙티브·암기·그래프) : masterLinkAudit의 _mlaRefs 이식 ---- */
function _qcCleanRef(u){ return String(u||'').replace(/^(cpt|tbl|mn|grp|img|itv):\/\//,''); }
function _qcRefs(q){
  var exp=q&&q.exp||{}; var out={cpt:[],tbl:[],grp:[],mn:[],img:[],itv:[]};
  (Array.isArray(exp.cpt)?exp.cpt:[]).forEach(function(id,i){ if(id) out.cpt.push({id:_qcCleanRef(id),where:'exp.cpt['+i+']'}); });
  (Array.isArray(exp.ot)?exp.ot:[]).forEach(function(o,i){ if(o&&Array.isArray(o.cpt)) o.cpt.forEach(function(id){ if(id) out.cpt.push({id:_qcCleanRef(id),where:'ot['+i+']'}); }); });
  (Array.isArray(exp.tbl)?exp.tbl:[]).forEach(function(id){ if(id) out.tbl.push({id:_qcCleanRef(id),where:'exp.tbl'}); });
  (Array.isArray(exp.c)?exp.c:[]).forEach(function(c,ci){ if(c&&Array.isArray(c.tbl)) c.tbl.forEach(function(id){ if(id) out.tbl.push({id:_qcCleanRef(id),where:'exp.c['+ci+'].tbl'}); }); });
  var mn=exp.mn; (Array.isArray(mn)?mn:(mn?[mn]:[])).forEach(function(r,i){ if(typeof r==='string'&&r.indexOf('mn://')===0) out.mn.push({id:_qcCleanRef(r),where:'exp.mn['+i+']'}); });
  var blob=''; try{ blob=JSON.stringify(q)||''; }catch(_){}
  var m, reG=/grp:\/\/([A-Za-z0-9_\-]+)/g; while((m=reG.exec(blob))) out.grp.push({id:m[1]});
  var reI=/img:\/\/([A-Za-z0-9_\-]+)/g;    while((m=reI.exec(blob))) out.img.push({id:m[1]});
  var reV=/itv:\/\/([A-Za-z0-9_\-]+)/g;    while((m=reV.exec(blob))) out.itv.push({id:m[1]});
  return out;
}

/* ---- OX(참/거짓 판정형) 보기 파서 ----
   보기 한 줄에서 (진술라벨 ㄱ~ㅇ, 판정 참/거짓/○/×/ⓞ) 쌍을 뽑는다.
   두 표기 모두 지원: "ㄱ○ ㄴ× ㄷ×"(기호 직결) · "ㄱ 거짓 / ㄴ 참"(낱말·슬래시).
   참/○/ⓞ→true, 거짓/×→false. COMBO(ㄱ,ㄴ)엔 판정어가 없어 자동 제외된다. */
function _qcParseOX(opt){
  var s=String(opt||''), re=/([ㄱㄴㄷㄹㅁㅂㅅㅇ])\s*(참|거짓|[○×ⓞ])/g, m, out=[];
  while((m=re.exec(s))){ out.push({k:m[1], v:(m[2]==='참'||m[2]==='○'||m[2]==='ⓞ')}); }
  return out;
}
function _qcIsOXq(q){
  if(q && q.type && String(q.type).toUpperCase()==='OX') return true;
  var opts=(q&&Array.isArray(q.opts))?q.opts:[];
  return opts.filter(function(o){ return _qcParseOX(o).length>=2; }).length>=2;
}

/* ---- 3) 미구현 per-q 규칙 (ottag 길이 · CALC 흐름 · 상수 근거) ---- */
function _qcExtraRules(q){
  var v=[], exp=(q&&q.exp)||{}, o=exp.o||[], ex=exp.ex||[];
  var oFilledArr=o.filter(function(x){return x&&String(x).trim();});
  /* (0) 예시(exp.ex)에 정오 판정(옳다/옳지 않다…) 종결 금지 — 예시는 판정문이 아니라 명명 인물의 장면.
     정오 판정은 해설(exp.o) 끝에만. [해설 o = 정오 판정 / 예시 ex = 별개 장면] */
  if(_qcOn('gichul','EX_VERDICT')){
    var _EXVD=/(옳다|옳지\s*않다|적절하다|적절하지\s*않다|부적절하다|틀리다|틀린다|정답)[.。!\s]*$/;
    ex.forEach(function(t,i){ var s=String(t||''); if(!s.trim()) return;
      var hit=s.split(/\n/).some(function(ln){ return _EXVD.test(ln.trim()); });
      if(hit) v.push({kind:'block',field:'ex',idx:i,code:'EX_VERDICT',msg:'예시(ex)에 정오 판정(옳다/옳지 않다) 종결 — 예시는 명명 인물의 구체적 장면이어야 함. 정오 판정은 해설(o) 끝에만',text:s.slice(0,80)}); });
  }
  /* [신규 2026-07-15] 예시(ex)가 명사종결 조각(…장면./모습./경우./상황.)으로 끝남 — 문장이 아니라 조각이라 어색.
     완결 평서문(~한다/~하고 있다/~된다)으로 끝내되 판정어(옳다/틀리다)는 EX_VERDICT로 여전히 금지. 계산형 단계풀이는 제외. */
  if(_qcOn('gichul','EX_NOUN_END') && !_isCalcQ(q)){
    var _NEND=/(장면|모습|경우|상황|모양|셈|편)[.。!?]*\s*$/;
    ex.forEach(function(t,i){ var s=String(t||''); if(!s.trim()) return;
      var _lastln=(s.split(/\n/).filter(function(ln){return ln.trim();}).pop()||'').trim();
      if(_NEND.test(_lastln)) v.push({kind:'warn',field:'ex',idx:i,code:'EX_NOUN_END',msg:'예시(ex)가 명사종결 조각(…장면/모습/경우/상황)으로 끝남 — 완결 평서문(~한다/~하고 있다)으로 맺기(판정어 옳다/틀리다는 여전히 금지)',text:_lastln.slice(-40)}); });
  }
  /* (a) ottag(exp.ot) 길이 == exp.o 길이  [10-levelup·OX진술 태그] */
  if(_qcOn('gichul','OTTAG_LEN') && Array.isArray(exp.ot) && exp.ot.length && exp.ot.length!==o.length){
    v.push({kind:'block',field:'o',idx:0,code:'OTTAG_LEN',
      msg:'OX진술 태그(exp.ot) 길이 '+exp.ot.length+' ≠ 해설(exp.o) 길이 '+o.length+' — ot는 exp.o와 1:1(길이 같아야 진술별 태그가 맞음)',text:''});
  }
  /* (b) CALC 흐름: 계산형인데 풀이(ex)에 [공식] 표기가 없음  [02 §CALC · 구 #79] */
  if(_qcOn('gichul','CALC_NO_FORMULA') && _isCalcQ(q)){
    var exJoin=ex.filter(function(x){return x&&String(x).trim();}).join('\n');
    var _newFmt=(exp.principle&&String(exp.principle).trim())||(Array.isArray(exp.exSum)&&exp.exSum.filter(Boolean).length);  /* 신 강의형: 원리(principle)/요약풀이(exSum)로 [공식] 대체 인정 */
    if(exJoin && !/\[\s*공식\s*\]/.test(exJoin) && !_newFmt)
      v.push({kind:'warn',field:'ex',idx:0,code:'CALC_NO_FORMULA',
        msg:'계산형 풀이(ex) 첫 줄에 [공식] 표기 없음 — 흐름은 [공식]→대입→계산→검산→최종답 권장',text:exJoin.slice(0,80)});
  }
  /* (b-2) 상세풀이(ex)는 요약풀이(exSum)의 N배 이상 상세하게 — 글자수(HTML·공백 제외) 기준 [2026-07-18] */
  if(_qcOn('gichul','CALC_EX_3X') && _isCalcQ(q) && Array.isArray(exp.exSum) && exp.exSum.filter(Boolean).length){
    var _stripLen=function(a){ return (a||[]).filter(Boolean).map(function(x){return String(x).replace(/<[^>]+>/g,'');}).join('').replace(/\s+/g,'').length; };
    var _sumL=_stripLen(exp.exSum), _exL=_stripLen(ex), _ratio=_qcN('gichul','CALC_EX_3X','ratio',3);
    if(_sumL>0 && _exL>0 && _exL < _sumL*_ratio)
      v.push({kind:'warn',field:'ex',idx:0,code:'CALC_EX_3X',
        msg:'상세풀이('+_exL+'자)가 요약풀이('+_sumL+'자)의 '+_ratio+'배('+(_sumL*_ratio)+'자) 미만 — 상세풀이는 요약의 '+_ratio+'배 이상으로 단계별 상세화',text:''});
  }
  /* (c) 상수·환산계수 근거(보수적·기본 OFF): 계산형 풀이에 매직상수가 근거어 없이 등장
     오탐 많은 영역이라 기본 비활성. 켜면 참고(INFO)로만. */
  if(_qcOn('gichul','CONST_NO_BASIS') && _isCalcQ(q)){
    var _CONST=/\b(0\.163|760|10\.332|22\.4|13\.6|101\.325|1\.35|9\.8|9\.81)\b/;
    var _BASIS=/환산|계수|기준|이므로|에서|비중량|표준|상수/;
    ex.forEach(function(t,i){ var s=String(t||''); if(_CONST.test(s) && !_BASIS.test(s))
      v.push({kind:'warn',field:'ex',idx:i,code:'CONST_NO_BASIS',
        msg:'풀이에 상수·환산계수가 근거 설명 없이 등장 — 최초 등장 시 "왜 그 숫자인지" 1줄 명시 권장(참고)',text:s.slice(0,80)}); });
  }
  /* (d) 계산형 강의화 — 기계적 반복 문구 금지 [계산형 해설 강의형 가이드 2026-07 §작성금지] */
  if(_qcOn('gichul','CALC_MECHANICAL') && _isCalcQ(q)){
    var _MECH=/(먼저|이제|다음으로?|마지막으로)\s*계산(한다|하면|하자|을?\s*진행한다)|앞에서\s*구한\s*값을\s*이용(한다|하면)|그대로\s*대입하면\s*된다|한\s*곳에\s*모은다|기준값이다/;
    ex.forEach(function(t,i){ var s=String(t||''); if(_MECH.test(s))
      v.push({kind:'warn',field:'ex',idx:i,code:'CALC_MECHANICAL',
        msg:'계산형 풀이가 기계적 문구(먼저/이제 계산한다·앞에서 구한 값 이용·그대로 대입·한곳에 모은다 등) — 계산만 하지 말고 왜 이 계산을 하는지 강의하듯 설명(강의형 가이드 §작성금지)',text:s.slice(0,80)}); });
  }
  /* (e) 계산형 강의화 — 같은 문두 연속 반복 금지 [강의형 가이드 §작성금지: 같은 문장구조 반복 금지] */
  if(_qcOn('gichul','CALC_REPEAT_LEAD') && _isCalcQ(q)){
    var _fx=ex.filter(function(x){return x&&String(x).trim();});
    var _lead=function(s){return String(s).replace(/^[\s①-⑩·\-\d.]+/,'').replace(/\s+/g,'').slice(0,6);};
    /* [제안 #8 2026-07-30] 면제 — 계산을 이어 쓴 줄·순수 식 줄·연차 병렬 나열은 반복이 아니다.
       'N단계·N차·N째·N번' 같은 스텝헤더는 어느 조건에도 걸리지 않아 계속 검사된다. */
    var _rlK=function(s){ return (String(s).match(/[가-힣]/g)||[]).length; };
    var _rlEq=function(s){ return /[=≒≈≤≥<>]/.test(String(s)); };
    var _rlTime=/^\s*\d+\s*(년|개월|분기|기)(?![가-힣])/;
    var _rlExempt=function(a,b){
      if(_rlK(a)<=2 && _rlK(b)<=2 && _rlEq(a) && _rlEq(b)) return true;   /* (a) 순수 식 줄 연속 */
      if(/^\s*[=≒≈≤≥<>]/.test(String(b))) return true;                    /* (b) 연산자로 시작하는 이어 쓰기 */
      if(_rlTime.test(String(a)) && _rlTime.test(String(b))) return true;  /* (c) 연차 병렬 나열 */
      return false;
    };
    for(var _k=1;_k<_fx.length;_k++){ var _a=_lead(_fx[_k-1]),_b=_lead(_fx[_k]);
      if(_b&&_b.length>=4&&_b===_a && !_rlExempt(_fx[_k-1],_fx[_k]))
      v.push({kind:'warn',field:'ex',idx:_k,code:'CALC_REPEAT_LEAD',
        msg:'풀이 줄이 앞줄과 같은 문두("'+_b+'…")로 시작 — 같은 문장 구조를 연속 반복하지 않음(강의형 가이드 §작성금지)',text:String(_fx[_k]).slice(0,60)}); }
  }
  /* (g) 형식 태깅 검수 — 의도(q.type) vs 자동판별 불일치 [V2 §248 · 타입 검수기(certlab_typecheck) 연동]
     certlab_typecheck.js가 로드돼 있으면(CertLabTypeCheck) 연동, 없으면 조용히 스킵(하드 의존 X). */
  if(_qcOn('gichul','TYPE_MISMATCH') && q && q.type){
    var _TC=(typeof CertLabTypeCheck!=='undefined')?CertLabTypeCheck:((typeof globalThis!=='undefined'&&globalThis.CertLabTypeCheck)||null);
    if(_TC && typeof _TC.classify==='function'){ try{ var _tc=_TC.classify(q);
      if(_tc && _tc.mismatch) v.push({kind:'warn',field:'type',idx:0,code:'TYPE_MISMATCH',
        msg:'형식 의도(type='+_tc.mismatch.intent+')와 자동판별('+_tc.mismatch.auto+')이 다름 — type 태그 또는 exp.o 구조(oFilled/blanks) 점검(V2 §248)',text:String(q.type)}); }catch(e){} }
  }
  /* (g2) OX(참/거짓 판정형) 구조 정합성 — 진술 수·판정 수·정답 유일성 [OX 전용]
     보기가 각 진술의 참/거짓 조합인 형식. 해설(exp.o)은 보기별(SC경로가 종결형 검사) → 여기선 구조만 본다. */
  if(_qcIsOXq(q)){
    var _oxP=(Array.isArray(q.opts)?q.opts:[]).map(_qcParseOX);
    var _oxF=_oxP.filter(function(p){return p.length;});
    /* OX_STMT_MISMATCH: 보기마다 판정 개수가 다르거나, 문두 진술 수와 보기 판정 수가 어긋남 */
    if(_qcOn('gichul','OX_STMT_MISMATCH') && _oxF.length){
      var _cnts=_oxF.map(function(p){return p.length;});
      var _uni=_cnts.every(function(c){return c===_cnts[0];});
      var _stemN=(String((q&&q.q)||'').match(/(?:^|[\s\n])[ㄱㄴㄷㄹㅁㅂㅅㅇ][.．]/g)||[]).length;
      if(!_uni) v.push({kind:'warn',field:'opts',idx:0,code:'OX_STMT_MISMATCH',msg:'OX 보기마다 참/거짓 판정 개수가 다름('+_cnts.join('/')+') — 모든 보기가 같은 진술 집합을 판정해야 함',text:''});
      else if(_stemN>0 && _cnts[0] && _cnts[0]!==_stemN) v.push({kind:'warn',field:'opts',idx:0,code:'OX_STMT_MISMATCH',msg:'문두 진술 수('+_stemN+')와 보기 판정 수('+_cnts[0]+') 불일치 — 진술 개수와 각 보기 판정 개수가 같아야 함',text:''});
    }
    /* OX_DUP_PATTERN: 두 보기의 참/거짓 배열이 동일 — 정답 유일성 깨짐(중복 = 문항 버그) */
    if(_qcOn('gichul','OX_DUP_PATTERN')){
      var _seen={}, _dup=null;
      _oxP.forEach(function(p,i){ if(!p.length||_dup) return;
        var key=p.slice().sort(function(a,b){return a.k<b.k?-1:(a.k>b.k?1:0);}).map(function(x){return x.k+(x.v?'1':'0');}).join(',');
        if(_seen[key]!=null) _dup=[_seen[key],i]; else _seen[key]=i; });
      if(_dup) v.push({kind:'warn',field:'opts',idx:_dup[1],code:'OX_DUP_PATTERN',msg:'보기 '+(_dup[0]+1)+'·'+(_dup[1]+1)+'의 참/거짓 배열이 동일 — 정답이 유일하지 않음(보기 중복)',text:''});
    }
  }
  /* (f) 계산형 강의화 — 접근(무엇을·왜) 없이 첫 줄이 바로 공식/수치 [강의형 가이드 §1 접근] (기본 OFF·오탐영역) */
  if(_qcOn('gichul','CALC_NO_APPROACH') && _isCalcQ(q)){
    var _f0=(ex.filter(function(x){return x&&String(x).trim();})[0])||'';
    if(_f0 && /^\s*(\[?\s*공식|[A-Za-z]{1,5}\s*=|\d[\d,.]*\s*[=×÷+\-])/.test(_f0))
      v.push({kind:'warn',field:'ex',idx:0,code:'CALC_NO_APPROACH',
        msg:'풀이 첫 줄이 접근 설명 없이 바로 공식/수치 — 먼저 "무엇을 구하는 문제인지·왜 이 값부터 구하는지"를 한 줄로(강의형 가이드 §1 접근·02 §CALC 조건정리)',text:String(_f0).slice(0,60)});
  }
  /* ===== [신규] 업데이트된 풀이 구조 필드 검수 (요약풀이·상세풀이·접근·원리·최종정리·시험/암기 포인트) ===== */
  var _emx=function(t){ return t && /—/.test(String(t)); };
  /* (h) em대시 — 본체 EMDASH가 안 보는 새 필드(approach·principle·recall·exSum)도 검사 */
  ['approach','principle','recall'].forEach(function(f){ if(_emx(exp[f])) v.push({kind:'block',field:f,idx:0,code:'EMDASH',msg:f+'에 em대시(—) 금지(en대시 –·* 설명으로)',text:String(exp[f]||'')}); });
  (Array.isArray(exp.exSum)?exp.exSum:[]).forEach(function(t,i){ if(_emx(t)) v.push({kind:'block',field:'exSum',idx:i,code:'EMDASH',msg:'요약풀이(exSum)에 em대시(—) 금지',text:t}); });
  /* (i) 요약풀이 단계 뭉침·여러 줄 (상세풀이 ex와 동일 기준) */
  (Array.isArray(exp.exSum)?exp.exSum:[]).forEach(function(t,i){
    if(_qcOn('gichul','EX_SUM_CRAMMED')){ var _cl=_qgCrammedSteps(t); if(_cl) v.push({kind:'warn',field:'exSum',idx:i,code:'EX_SUM_CRAMMED',msg:'요약풀이 한 원소에 단계(①②③) 뭉침 — 단계는 배열 원소 하나로',text:_cl}); }
    if(_qcOn('gichul','EX_SUM_MULTILINE') && String(t||'').split(/\n/).filter(function(l){return l.trim();}).length>=2) v.push({kind:'warn',field:'exSum',idx:i,code:'EX_SUM_MULTILINE',msg:'요약풀이 한 원소에 여러 줄 — 줄은 원소로 쪼갬',text:t});
  });
  /* (j) 새 형식 일관성 — 요약풀이 있으면 상세풀이·최종정리도 세트로 (INFO) */
  if(_qcOn('gichul','CALC_NEWFMT_PARTIAL') && Array.isArray(exp.exSum) && exp.exSum.filter(Boolean).length){
    var _miss=[]; if(!(Array.isArray(exp.ex)&&exp.ex.filter(Boolean).length)) _miss.push('상세풀이(ex)'); if(!(exp.s&&String(exp.s).trim())) _miss.push('최종정리(s)');
    if(_miss.length) v.push({kind:'warn',field:'exSum',idx:0,code:'CALC_NEWFMT_PARTIAL',msg:'요약풀이는 있는데 '+_miss.join('·')+' 없음 — 새 풀이 형식은 요약+상세+최종정리 세트',text:''});
  }
  /* (j2) [신규] 옛 형식 계산문항 탐지 — 계산형인데 요약풀이(exSum) 자체가 없음 → 7단 새 형식으로 변환 권장.
     요약풀이·상세풀이 등 새 형식을 검수기가 잡아 옛 형식을 색출한다. */
  /* 빈칸채우기(FILL) 법조문 문항 억제(CALC_FLAG_MISMATCH와 동일 판별): 빈칸 + 들어갈/알맞은/순서/나열
     → oFilled=1·풀이단계라 auto=계산형으로 오인되나 값 계산이 아니므로 7단 변환 대상 아님. */
  var _oldFillLike=/\(\s*[ㄱ-ㅎ가-힣]?\s*\)/.test(String(q.q||'')) && /들어갈|알맞은|순서|나열/.test(String(q.q||''));
  if(_qcOn('gichul','CALC_OLD_FORMAT') && _isCalcQ(q) && !_oldFillLike && !(Array.isArray(exp.exSum) && exp.exSum.filter(Boolean).length))
    v.push({kind:'warn',field:'ex',idx:0,code:'CALC_OLD_FORMAT',msg:'계산형인데 새 풀이 형식(요약풀이·상세풀이) 아님 — 접근·원리·요약풀이·상세풀이·최종정리·시험/암기 포인트 7단으로 변환 권장(§G)',text:''});
  /* (k) 요약↔상세 최종답 일치 — 요약풀이 마지막 <b>값</b>이 상세/정답결론/최종정리에 없으면 경고 */
  if(_qcOn('gichul','CALC_SUM_ANS') && Array.isArray(exp.exSum) && exp.exSum.length){
    var _bd=[]; exp.exSum.forEach(function(t){ (String(t||'').match(/<b>[\s\S]*?<\/b>/g)||[]).forEach(function(x){ var _z=x.replace(/<[^>]+>/g,'').trim(); if(_z) _bd.push(_z); }); });
    var _lastB=_bd[_bd.length-1];
    if(_lastB){ var _hay=((exp.ex||[]).join(' ')+' '+(o||[]).join(' ')+' '+(exp.s||'')).replace(/<[^>]+>/g,''); if(_hay.indexOf(_lastB)<0) v.push({kind:'warn',field:'exSum',idx:0,code:'CALC_SUM_ANS',msg:'요약풀이 최종답("'+_lastB+'")이 상세풀이·정답결론·최종정리에 없음 — 요약·상세 결과 일치 확인',text:_lastB}); }
  }
  /* (l0) [신규 2026-07] 계산형 산술 정합성 — 풀이 줄 등식이 실제 계산과 맞는지(A) · 정답값이 풀이에 등장하는지(B).
     calc_audit 이식. 오탐 방지: 천단위콤마 제거·절 분리·%/²/HTML 정규화·단위(%)세그먼트 제외·2% 여유·2부분답 분리. WARNING(비차단). */
  if((_qcOn('gichul','CALC_ARITH_MISMATCH')||_qcOn('gichul','CALC_ANS_NO_MATCH')) && _isCalcQ(q)){
    var _cnorm=function(seg){ var s=String(seg).replace(/<[^>]+>/g,'').replace(/₩|원|,/g,''); s=s.replace(/[×·]/g,'*').replace(/[÷]/g,'/').replace(/[−–—]/g,'-').replace(/²/g,'**2').replace(/³/g,'**3'); s=s.replace(/(\d+(?:\.\d+)?)\s*%/g,'($1/100)');
      /* [FIX 2026-08-03 엔진 #26] 문장 끝 마침표가 다음 절 앞에 남아 숫자에 붙는 오탐 제거.
         "…배분한다. 500,000 ÷ 10 = 50,000" 은 절이 ". 500000 ÷ 10" 로 끊기는데 공백을 지우면
         ".500000/10" = 0.05 가 되어 맞는 식이 틀렸다고 잡혔다(라이브 3건 전부 이 원인).
         소수점은 뒤에 숫자가 붙으므로("0.5") 안 건드린다 — **세그먼트 맨 앞**의 마침표만 지운다.
         ⚠ 끝 마침표까지 지우면 안 된다: "80%." 가 평가 가능해져 (80/100)=0.8 로 읽히고
         % 세그먼트 제외 장치가 뚫린다(그렇게 했다가 새 오탐 3건이 생겨 되돌렸다). */
      s=s.replace(/^\s*\.(?=\s)/,' ');
      return s.replace(/\s/g,''); };
    var _cpure=function(s){ return /^[\d.+\-*\/()]+$/.test(s) && /\d/.test(s); };
    var _ceval=function(seg){ if(/%\s*$/.test(String(seg).trim())) return null; var s=_cnorm(seg); if(!_cpure(s)) return null; try{ var v=Function('"use strict";return('+s+')')(); return (v!=null&&isFinite(v))?v:null; }catch(e){ return null; } };
    var _clines=[].concat(exp.exSum||[], exp.ex||[]).map(String);
    if(_qcOn('gichul','CALC_ARITH_MISMATCH')){
      for(var _li=0;_li<_clines.length;_li++){ var _ln=String(_clines[_li]).replace(/<[^>]+>/g,''); var _p; do{ _p=_ln; _ln=_ln.replace(/(\d),(\d)/g,'$1$2'); }while(_ln!==_p);
        var _cls=_ln.split(/[,，;、。→]|(?:이고|이며|이다|한다|하면|또는|이므로|이라|라서|므로|따라서|에서|인데)/);
        var _hit=null;
        /* [FIX 2026-07-16] 인접한 두 계산가능 세그먼트만 비교(단위환산 "500 ppm = 0.0005"·다단계식 "24=…을 풀어 X=14" 오탐 제거: 사이에 단위/변수 세그먼트가 오면 _prev=null로 끊겨 비교 안 함) */
        for(var _ci=0;_ci<_cls.length;_ci++){ var _segs=_cls[_ci].split('='), _prev=null;
          for(var _si=0;_si<_segs.length;_si++){ var _vv=_ceval(_segs[_si]);
            if(_vv!=null && _prev!=null && Math.abs(_vv-_prev)>Math.max(1,Math.abs(_vv)*0.02)){ _hit=_cls[_ci].trim(); break; }
            _prev=_vv; }
          if(_hit) break; }
        if(_hit){ v.push({kind:'warn',field:'exSum',idx:0,code:'CALC_ARITH_MISMATCH',msg:'계산형 풀이 줄의 등식이 실제 계산과 어긋남("'+_hit.slice(0,40)+'") — 좌우변 값 확인',text:_hit.slice(0,60)}); break; } }
    }
    if(_qcOn('gichul','CALC_ANS_NO_MATCH') && typeof q.ans==='number' && Array.isArray(q.opts)){
      var _opt=String(q.opts[q.ans-1]||''); var _parts=_opt.split(/,\s+|\s*·\s*|\s*\/\s*/); var _nums=[];
      _parts.forEach(function(pp){ var m=pp.replace(/[,\s₩원]/g,'').match(/\d+(?:\.\d+)?/); if(m)_nums.push(m[0]); });
      if(_nums.length){ var _blob=[].concat(exp.exSum||[],exp.ex||[],[exp.s||'']).join(' ').replace(/<[^>]+>/g,'').replace(/[,\s₩원]/g,'');
        var _seen=_nums.some(function(n){ var a=(n.indexOf('.')>=0)?n.replace(/0+$/,'').replace(/\.$/,''):n; return _blob.indexOf(n)>=0||_blob.indexOf(a)>=0; });
        if(!_seen) v.push({kind:'warn',field:'exSum',idx:0,code:'CALC_ANS_NO_MATCH',msg:'정답 보기 값("'+_opt.slice(0,20)+'")이 풀이(요약·상세·최종정리) 어디에도 안 나옴 — 답↔풀이 불일치 의심',text:_opt.slice(0,30)}); }
    }
  }
  /* (l1) [신규 2026-07] 계수표 줄글 몰림 — 현가/연금 계수처럼 (기간×이자율) 2D 데이터가 본문(q.q)에 표 없이 줄글로 크램.
     q는 불변 필드라 데이터 수정 대상이 아니라 앱 렌더(표) 개선 신호. 4개 이상 소수 계수 + 계수 키워드 + 표 없음이면 WARNING. */
  /* [제안 #11 2026-07-30] 목록 면제 — 마커 나열이면서 '표 줄' 이 하나도 없으면 표 줄글이 아니다.
     조건 불릿 목록 + 표 한 줄이 섞인 문항이 많아 문항이 아니라 줄 단위로 가른다. */
  var _tpMarker=/^\s*(?:[○●◦ㅇ·•▪□◇]|[Oo](?=\s)|[-−–](?=\s))/;
  var _tpAxis=/20\s*[×x]\s*\d|\d+\s*년(?!도)|\d+\s*기간|\d+\s*월(?!일)|\d+\s*분기|\d+(?:\.\d+)?\s*%/g;
  var _tpNums=function(l){ return (String(l).match(/(?:^|[^\d.])\d{1,6}(?![\d.])/g)||[]).length; };
  var _tpTableLine=function(l){
    if(/현가계수|현재가치계수|연금현가|할인계수|현가표|계수표|현가율/.test(l)) return true;
    if((l.match(_tpAxis)||[]).length>=3) return true;
    if(/구분\s|지역\s|산업\s|연도별|월별|구간|계급/.test(l) && _tpNums(l)>=4) return true;
    return false;
  };
  var _tpListExempt=function(qq){
    var _ls=String(qq||'').split(/\n/).map(function(x){return x.trim();}).filter(Boolean);
    var _mk=_ls.filter(function(l){ return _tpMarker.test(l); });
    if(_mk.length<2) return false;
    if(_ls.some(_tpTableLine)) return false;
    return true;
  };
  if(_qcOn('gichul','FACTOR_TABLE_PROSE')){
    var _fq=String(q.q||'');
    if(!/<table|tbl:\/\//.test(_fq) && !_tpListExempt(_fq) && /현가계수|현재가치계수|연금현가|할인계수|현가표|계수표|현가율/.test(_fq)){
      var _fmin=(_QC_DEFAULTS.gichul.FACTOR_TABLE_PROSE&&_QC_DEFAULTS.gichul.FACTOR_TABLE_PROSE.minVals)||4;
      var _fnum=(_fq.match(/\d\.\d{3,4}/g)||[]).length;
      if(_fnum>=_fmin) v.push({kind:'warn',field:'q',idx:0,code:'FACTOR_TABLE_PROSE',msg:'현가/연금 계수표가 본문에 줄글로 몰려 있음('+_fnum+'개 계수) — 기간×이자율 표로 렌더 권장(가독성). q는 불변이라 앱 렌더 개선 대상',text:_fq.slice(0,60)});
    }
  }
  /* (l) 계산형인데 시험 포인트(tip) 없음 — 기본 OFF(권장 항목) */
  if(_qcOn('gichul','CALC_NO_TIP') && _isCalcQ(q) && !(exp.tip&&String(exp.tip).trim())) v.push({kind:'warn',field:'tip',idx:0,code:'CALC_NO_TIP',msg:'계산형인데 시험 포인트(tip) 없음 — 함정·실수 방지 한 줄 권장(참고)',text:''});
  /* (m) calc 플래그 ↔ 자동판별 교차검증 (certlab_typecheck.js 없이도 동작) */
  if(_qcOn('gichul','CALC_FLAG_MISMATCH') && typeof q.calc==='boolean'){ var _autoCalc=_isCalcQ(q);
    if(q.calc!==_autoCalc){
      /* 빈칸채우기(FILL) 법조문 문항 억제: 빈칸 + 들어갈/알맞은/순서 → oFilled=1·풀이단계라 auto=계산형으로 오인되나 값 계산 아님.
         인간 calc=false를 존중(오탐). calc=true인데 auto=false(태그 과다)는 여전히 잡는다. */
      var _fillLike=/\(\s*[ㄱ-ㅎ가-힣]?\s*\)/.test(String(q.q||'')) && /들어갈|알맞은|순서/.test(String(q.q||''));
      if(!(_fillLike && q.calc===false && _autoCalc===true))
        v.push({kind:'warn',field:'calc',idx:0,code:'CALC_FLAG_MISMATCH',msg:'calc 플래그('+q.calc+')와 자동판별('+_autoCalc+') 불일치 — 계산형 태그 또는 exp.o/ex 구조 점검',text:''});
    }
  }
  /* ===== [신규 2026-07-15] 해설 얇음·예시 전무 검수 — 장면예시/사유가 학습 핵심인 이론 MCQ(SC·COMBO·NEG)만.
     OX·단답(SA/blanks)·계산(CALC)·개수형(COUNT)·짝짓기(PAIR)·순서(ORDER) 등은 장면예시·장문사유 비대상이라 면제.
     둘 다 warn 계열(EX_MISSING=WARNING, O_SHORT=INFO). O_SHORT는 소급 폭증 방지로 INFO 도입 → 베이스라인 정비 후 승격(qcDiff). */
  var _exemptTy=['CALC','FILL','PAIR','SA','COUNT','ORDER','ORAL','MATRIX','CV','OX'];
  var _sOpts=(q&&Array.isArray(q.opts))?q.opts:[];
  var _sSA=Array.isArray(q&&q.blanks)&&q.blanks.length;
  var _sMCQ=_sOpts.length&&oFilledArr.length>=1&&!_sSA;
  var _sTy=String((q&&q.type)||'').toUpperCase();
  /* 계산형(CALC)은 접근·원리·요약풀이·상세풀이·최종정리·시험/암기 포인트 7단 구조가 별도라 이 두 검사에서 제외(§G). */
  var _sScene=_sMCQ && !_isCalcQ(q) && !_qcIsOXq(q) && _exemptTy.indexOf(_sTy)<0;
  /* (n) 예시 커버리지 — 해설(o)이 달린 보기/진술마다 장면 예시(exp.ex) 100% 필요(§A-7).
     o·ex는 같은 축(SC/NEG=보기, COMBO=진술)에 정렬되므로 opts가 아니라 '채워진 o 수' 대비 '채워진 ex 수'로 판정(정렬 안전).
     예시 전무=EX_MISSING(경고), 일부만=EX_COVERAGE(참고). */
  if(_sScene){
    var _oF2=0; o.forEach(function(t){ if(t&&String(t).trim()) _oF2++; });
    var _exF2=0; ex.forEach(function(t){ if(t&&String(t).trim()) _exF2++; });
    if(_oF2>0){
      if(_qcOn('gichul','EX_MISSING') && _exF2===0)
        v.push({kind:'warn',field:'ex',idx:0,code:'EX_MISSING',msg:'보기에 예시(장면)가 하나도 없음 — 해설이 달린 모든 보기/진술에 명명 인물의 실생활 장면 예시(exp.ex) 필요(§A-7)',text:''});
      else if(_qcOn('gichul','EX_COVERAGE') && _exF2>0 && _exF2<_oF2)
        v.push({kind:'warn',field:'ex',idx:0,code:'EX_COVERAGE',msg:'예시가 일부 보기에만 있음('+_exF2+'/'+_oF2+') — 해설 달린 보기/진술 전부에 예시 100% 필요(§A-7)',text:''});
    }
  }
  /* (o) 해설(o) 얇음 — 채워진 해설 항목이 minChars(기본 40자) 미만이면 항목별로 지적("40자 미만 전부").
     참고(INFO)로 도입 → 베이스라인 후 승격(qcDiff). */
  if(_qcOn('gichul','O_SHORT') && _sScene){
    var _oMin=_qcN('gichul','O_SHORT','minChars',60);
    o.forEach(function(t,i){ if(!(t&&String(t).trim())) return; var _L=String(t).replace(/<[^>]+>/g,'').trim().length; if(_L<_oMin) v.push({kind:'warn',field:'o',idx:i,code:'O_SHORT',msg:'해설(o)이 '+_L+'자(<'+_oMin+'자)로 얇음 — 왜 옳은지/틀린지 사유를 한 문장 더(역할분리 §337)',text:t}); });
  }
  /* (p) [신규 2026-07-15] 계산풀이가 있으나 특수 타입이라 앱 계산형 렌더에서 가려짐.
     COUNT·PAIR·ORDER·CV·FILL 등은 자체 렌더를 써서 요약풀이(exSum)·상세풀이(ex) 패널을 안 띄운다.
     계산형(q.calc/_isCalcQ)이고 풀이가 데이터에 있는데 이런 타입이면 상세풀이가 화면에서 사라진다(데이터엔 있음). */
  if(_qcOn('gichul','CALC_HIDDEN_BY_TYPE')){
    /* [제안 #9 2026-07-30] 조건3 교체 — 'type 8종 목록' → '실제로 계산 패널이 가려지는가'.
       앱 해설 렌더(index-4-learn.js)는 type 을 보지 않고 else-if 체인으로 갈린다. 계산형(⑦)보다 먼저
       배정형(정답 보기를 '/'로 나눈 마커 쌍 + 정답 해설칸에 같은 마커 2개 이상)이 걸릴 때만 패널이 가려진다.
       ⚠ 아래 _hbKeys·_hbHits 는 index-4-learn.js 의 _assignPairs·_splitExpByMarker 판정을 복제한 것이다.
          그 두 함수를 고치면 이 블록도 함께 봐야 한다(단일 출처 이원화 지점). */
    var _hbTy=String((q&&q.type)||'').toUpperCase();
    var _hbSol=(Array.isArray(exp.exSum)&&exp.exSum.filter(Boolean).length)||(Array.isArray(exp.ex)&&exp.ex.filter(Boolean).length);
    var _hbKeys=function(qq){
      var opts=qq.opts||[]; var an=Array.isArray(qq.ans)?qq.ans[0]:qq.ans; if(!an) return null;
      var opt=opts[an-1]; if(!opt) return null;
      var parts=String(opt).split('/'); if(parts.length<2) return null;
      var out=[];
      for(var i=0;i<parts.length;i++){ var m=parts[i].trim().match(/^([\u3131-\u314E\u3260-\u326D])\s*(.+)$/); if(!m) return null; out.push(m[1]); }
      return out;
    };
    var _hbHits=function(text,order){
      var s=String(text||''); if(!s||!order||order.length<2) return 0;
      var hit=0, from=0;
      for(var i=0;i<order.length;i++){
        var re=new RegExp('(^|[\\s,(\\uFF08])('+order[i]+')(?=[\\s(\\uFF08])','g'); re.lastIndex=from;
        var m=re.exec(s); if(m){ hit++; from=m.index+m[1].length+1; }
      }
      return hit;
    };
    var _hbHidden=function(qq){
      var oo=(qq.exp&&qq.exp.o)||[]; var an=Array.isArray(qq.ans)?qq.ans[0]:qq.ans;
      var ks=_hbKeys(qq); if(!ks) return false;
      return _hbHits(oo[(an||1)-1]||'', ks)>=2;
    };
    if((q.calc===true||_isCalcQ(q)) && _hbSol && _hbHidden(q))
      v.push({kind:'warn',field:'type',idx:0,code:'CALC_HIDDEN_BY_TYPE',msg:'계산풀이(요약·상세풀이)가 데이터엔 있는데 앱 해설이 배정형(마커별 분해) 렌더로 갈려 계산형 풀이 패널이 안 뜸 — 정답 보기 마커 구성 또는 렌더 우선순위 점검',text:_hbTy});
  }
  /* (q) [신규 2026-07-15] 표 데이터가 문항(q)에 줄글로 몰림 — 구분/지역/산업 등 헤더 + 숫자 다수인데 표 마크업 없음.
     q는 불변이라 데이터 수정이 아니라 앱 표 렌더 개선 신호(FACTOR_TABLE_PROSE의 일반형; 계수표는 그쪽서 처리). */
  if(_qcOn('gichul','Q_TABLE_PROSE')){
    var _qtq=String(q.q||'');
    var _qtFactor=/현가계수|현재가치계수|연금현가|할인계수|현가표|계수표|현가율/.test(_qtq);
    if(!_qtFactor && !/<table|tbl:\/\//.test(_qtq) && !_tpListExempt(_qtq) && /구분\s|지역\s|산업\s|연도별|월별|구간|계급/.test(_qtq)){
      var _qtN=(_qtq.match(/(?:^|[^\d.])\d{1,6}(?![\d.])/g)||[]).length;
      var _qtMin=_qcN('gichul','Q_TABLE_PROSE','minNums',8);
      if(_qtN>=_qtMin) v.push({kind:'warn',field:'q',idx:0,code:'Q_TABLE_PROSE',msg:'표 데이터('+_qtN+'개 수치)가 본문에 줄글로 몰려 있음 — 행×열 표로 렌더 권장(가독성). q는 불변이라 앱 렌더 개선 대상',text:_qtq.slice(0,60)});
    }
  }
  /* (r) [신규 2026-07-15] 계산형 아닌데 계산형 7단 필드가 붙음 — PAIR·COMBO·COUNT·ORDER·MATCH 짝짓기/목록형이
     approach·principle·exSum을 달고 있으나 실제 산술이 없으면 계산형 렌더로 가 보기(ㄱ~)별 해설이 안 뜬다. 보기별 해설로 전환 권장. */
  if(_qcOn('gichul','CALC_FIELDS_ON_NONCALC')){
    var _cfTy=String((q&&q.type)||'').toUpperCase();
    var _cfHasFld=(exp.approach&&String(exp.approach).trim())||(exp.principle&&String(exp.principle).trim())||(Array.isArray(exp.exSum)&&exp.exSum.filter(Boolean).length);
    if(['PAIR','COMBO','COUNT','ORDER','MATCH','CV'].indexOf(_cfTy)>=0 && _cfHasFld){
      var _cfBlob=[].concat(exp.exSum||[],exp.ex||[],[exp.s||'',exp.principle||'']).join(' ');
      var _cfArith=/\d\s*[×÷*\/]\s*\d|=\s*[\d(]|\d\s*[+\-]\s*\d/.test(_cfBlob);
      if(!_cfArith) v.push({kind:'warn',field:'type',idx:0,code:'CALC_FIELDS_ON_NONCALC',msg:'계산형 아님(type='+_cfTy+'·산술 없음)인데 계산형 7단 필드(접근·원리·요약풀이)가 붙음 — 보기(ㄱ~)별 해설로 전환',text:_cfTy});
    }
  }
  /* (s) [신규 2026-07-15] 전항정답인데 사유 설명 없음 — ans가 모든 보기를 가리키면 왜 전부 정답인지 최종정리(s)에 명시. */
  if(_qcOn('gichul','ALLANS_NO_NOTE') && Array.isArray(q.ans) && Array.isArray(q.opts) && q.ans.length>=q.opts.length && q.opts.length>=2){
    var _anBlob=String(exp.s||'')+' '+((exp.o||[]).join(' '));
    if(!/전항정답|모두\s*정답|전부\s*정답|전원정답|복수\s*정답|모두\s*옳/.test(_anBlob)) v.push({kind:'warn',field:'s',idx:0,code:'ALLANS_NO_NOTE',msg:'전항정답(모든 보기 정답)인데 왜 전부 정답 처리됐는지 설명이 없음 — 최종정리(s)에 사유 명시',text:''});
  }
  return v;
}

/* ---- _qcViolations 래퍼: [추출 본체] + [확장 규칙] + [치명도 부여] (본체 무수정) ---- */
var _qcViolationsBase = _qcViolations;
_qcViolations = function(q){
  var v = _qcViolationsBase(q);
  try{ v = v.concat(_qcExtraRules(q)); }catch(e){}
  _qcApplySev(v);
  return v;
};

/* ── 베이스라인 diff (소급 위반 폭증 방지) ────────────────────────────────
 * 문제: 규칙 추가·type 태깅·분류기 변경 때마다 과거 통과 문항이 소급 위반으로 튐(backlog 부풀림).
 * 해법: 과목별 현재 위반을 스냅샷(qcBaseline)하고, 재검수 땐 qcDiff로 **이번 편집이 새로 만든 위반만** 본다.
 *   - qcBaseline(questions) → { qid: [code,...] }  (기지 이슈 스냅샷; 파일로 저장해 과목별 보관)
 *   - qcDiff(questions, baseline) → { newViolations, fixed, carried }
 *       newViolations = baseline에 없던 (qid,code) = 이번 편집이 유발/노출한 것 (이것만 손보면 됨)
 *       fixed         = baseline에 있었는데 사라진 것 (편집으로 해소)
 *       carried       = 기존 backlog(숨김) 수
 * 운영: 과목 정비 착수 시 qcBaseline 1회 저장 → 이후 편집마다 qcDiff로 delta만 검수.
 *       backlog는 별도 시간에 계획적으로 소진(편집 흐름을 막지 않음). */
function qcBaseline(questions){
  var snap={};
  (questions||[]).forEach(function(q){
    if(!q||q.id==null) return;
    var codes={}; try{ _qcViolations(q).forEach(function(v){ codes[v.code]=1; }); }catch(e){}
    var arr=Object.keys(codes).sort(); if(arr.length) snap[String(q.id)]=arr;
  });
  return snap;
}
function qcDiff(questions, baseline){
  baseline=baseline||{};
  var neu=[], fixed=[], carried=0;
  (questions||[]).forEach(function(q){
    if(!q||q.id==null) return;
    var id=String(q.id);
    var base={}; (baseline[id]||[]).forEach(function(c){ base[c]=1; });
    var cur={}, list=[]; try{ list=_qcViolations(q); }catch(e){}
    list.forEach(function(v){ cur[v.code]=1;
      if(base[v.code]) carried++;                       /* 기존 backlog → 숨김 */
      else neu.push({id:id, code:v.code, sev:v.sev, kind:v.kind, field:v.field, idx:v.idx, msg:v.msg}); /* 새 위반 */
    });
    Object.keys(base).forEach(function(c){ if(!cur[c]) fixed.push({id:id, code:c}); }); /* 편집으로 해소 */
  });
  /* 새 위반 치명도순 정렬(BLOCKER>ERROR>WARNING>INFO) */
  var _rank={BLOCKER:0,ERROR:1,WARNING:2,INFO:3};
  neu.sort(function(a,b){ return (_rank[a.sev]||9)-(_rank[b.sev]||9); });
  return {newViolations:neu, fixed:fixed, carried:carried};
}
/* ── 마스터 참조 스캔 게이트 (마스터 수정 전후 참조 무결성) ──────────────────
 * 문제: 개념(cpt)·표(tbl)·그래프(grp)·암기(mn)·이미지(img)·인터랙(itv) 마스터를 고치면(개명·삭제·재구성)
 *       그걸 참조하던 문항들이 고아/깨진 참조가 됨(CPT_MISSING BLOCKER 등). 한쪽만 고치면 중간에 깨진 상태.
 * 해법: 마스터 수정 '전'과 '후'에 참조를 스캔(qcRefScan)하고, qcRefGate로 **이 수정이 새로 깨뜨린 참조만** 집어
 *       원자적 업데이트(마스터+참조문항 한 배치)를 강제한다. (베이스라인 diff의 참조 버전.)
 *   - qcRefScan(questions, masters) → { refs:{type:{id:[qid...]}}, broken:[{type,id,qids}] }
 *       masters = {concepts,tables,graphs,mnems,interactives,images} (없는 타입은 판정보류=broken 오판 안 함)
 *       images는 Set/배열/객체 모두 허용. 미제공 시 전역 _qcCptCards·_qcImgKeys 폴백.
 *   - qcRefGate(before, after) → { newBroken, fixed, ok }
 *       newBroken = after에서 새로 깨진 참조(이번 수정이 유발) → 있으면 차단, 그 qids를 같은 배치로 정정.
 * 운영: before=qcRefScan(문항, 수정전 마스터) → [마스터·문항 편집] → after=qcRefScan(문항, 수정후 마스터)
 *       → gate=qcRefGate(before,after); if(!gate.ok) 업로드 보류(gate.newBroken 정정). */
function _qcMasterHas(masters, type, id){
  masters=masters||{};
  if(type==='img'){ var ik=masters.images||((typeof _qcImgKeys!=='undefined')?_qcImgKeys:null);
    if(!ik) return null;
    if(typeof ik.has==='function') return ik.has(id);
    if(Array.isArray(ik)) return ik.indexOf(id)>=0;
    if(typeof ik==='object') return (id in ik);
    return null; }
  var map={cpt:masters.concepts, tbl:masters.tables, grp:masters.graphs, mn:masters.mnems, itv:masters.interactives};
  var m=map[type];
  if(!m && type==='cpt' && typeof _qcCptCards!=='undefined' && _qcCptCards) m=_qcCptCards;
  if(!m || typeof m!=='object') return null;   /* 마스터 미제공 → 판정보류(있다고도 없다고도 안 함) */
  return (id in m);
}
function qcRefScan(questions, masters){
  var refs={cpt:{},tbl:{},grp:{},mn:{},img:{},itv:{}}, broken=[];
  (questions||[]).forEach(function(q){
    if(!q) return; var qid=(q.id!=null)?String(q.id):'?';
    var r; try{ r=_qcRefs(q); }catch(e){ return; }
    ['cpt','tbl','grp','mn','img','itv'].forEach(function(t){
      (r[t]||[]).forEach(function(ref){ var k=ref&&ref.id; if(!k) return; (refs[t][k]=refs[t][k]||[]).push(qid); });
    });
  });
  ['cpt','tbl','grp','mn','img','itv'].forEach(function(t){
    Object.keys(refs[t]).forEach(function(k){ if(_qcMasterHas(masters,t,k)===false) broken.push({type:t,id:k,qids:refs[t][k].slice()}); });
  });
  return {refs:refs, broken:broken};
}
function qcRefGate(before, after){
  before=before||{broken:[]}; after=after||{broken:[]};
  function key(b){ return b.type+'://'+b.id; }
  var bset={}; (before.broken||[]).forEach(function(b){ bset[key(b)]=1; });
  var aset={}; (after.broken||[]).forEach(function(b){ aset[key(b)]=1; });
  var newBroken=(after.broken||[]).filter(function(b){ return !bset[key(b)]; });
  var fixed=(before.broken||[]).filter(function(b){ return !aset[key(b)]; });
  return {newBroken:newBroken, fixed:fixed, ok:newBroken.length===0};
}

/* ── 참조 개명 자동수정 (rename auto-fix) ──────────────────────────────────
 * 마스터 키를 '개명'했을 때(삭제 아님) 참조 문항들의 키를 일괄 갱신 → 개명은 막지 말고 고친다.
 * (삭제/오타는 자동수정 불가 = 사람이 정해야 하므로 게이트가 막는다. rename만 이 함수로 원자적 처리.)
 *   qcRefRemap(questions, renameMap) → { changed, details:[{id,where,from,to}] }
 *     renameMap: { "옛키":"새키" }  (접두 cpt://·mn:// 유무 무관 — 있으면 보존, 없으면 그대로)
 *   커버 필드: exp.cpt · exp.ot[].cpt · exp.tbl · exp.c[].tbl · exp.mn(문자열/배열).
 *   운영: 마스터 개명 → qcRefRemap(문항, {옛:새})로 참조 갱신 → qcRefGate로 새 고아 0 확인 → 마스터+문항 함께 업로드. */
function qcRefRemap(questions, renameMap){
  var norm={};
  Object.keys(renameMap||{}).forEach(function(k){
    var ok=String(k).replace(/^[a-z]+:\/\//,''), nv=String(renameMap[k]).replace(/^[a-z]+:\/\//,'');
    if(ok) norm[ok]=nv;
  });
  var details=[];
  function mp(v){ if(typeof v!=='string') return null;
    var pre=(v.match(/^[a-z]+:\/\//)||[''])[0]; var bare=v.replace(/^[a-z]+:\/\//,'');
    if(norm[bare]!==undefined && norm[bare]!==bare) return pre+norm[bare]; return null; }
  function doArr(arr, where){ if(!Array.isArray(arr)) return;
    for(var i=0;i<arr.length;i++){ var nn=mp(arr[i]); if(nn){ details.push({id:qid, where:where+'['+i+']', from:arr[i], to:nn}); arr[i]=nn; } } }
  var qid;
  (questions||[]).forEach(function(q){
    if(!q||!q.exp) return; qid=q.id; var exp=q.exp;
    doArr(exp.cpt,'exp.cpt'); doArr(exp.tbl,'exp.tbl');
    if(typeof exp.mn==='string'){ var nn=mp(exp.mn); if(nn){ details.push({id:qid,where:'exp.mn',from:exp.mn,to:nn}); exp.mn=nn; } }
    else doArr(exp.mn,'exp.mn');
    (Array.isArray(exp.ot)?exp.ot:[]).forEach(function(o,oi){ if(o&&Array.isArray(o.cpt)) doArr(o.cpt,'exp.ot['+oi+'].cpt'); });
    (Array.isArray(exp.c)?exp.c:[]).forEach(function(c,ci){ if(c&&Array.isArray(c.tbl)) doArr(c.tbl,'exp.c['+ci+'].tbl'); });
  });
  return {changed:details.length, details:details};
}

/* [엔진 #24 · 2026-08-03] qualityGate·_qcBundle 도 내보낸다. 그동안 이 둘이 export 에 없어서
   서버(certlab-functions/qcUpload.js)가 qualityGate 를 **부를 수가 없었고**, 문항별 _qcViolations 를
   직접 도는 별도 구현(structureGate)을 쓸 수밖에 없었다 → #18 이 qualityGate 안에 넣은 번들 검사
   (DUP_ID)가 서버 경로에는 안 걸렸다. 내보내기만 늘리는 것이라 브라우저 쪽 동작은 그대로다. */
if(typeof module!=='undefined'&&module.exports){ module.exports.qcBaseline=qcBaseline; module.exports.qcDiff=qcDiff; module.exports._qcViolations=_qcViolations; module.exports.qcRefScan=qcRefScan; module.exports.qcRefGate=qcRefGate; module.exports.qcRefRemap=qcRefRemap; module.exports.qualityGate=qualityGate; module.exports._qcBundle=_qcBundle; }

/* ---- 2) 마스터 연결 편입: _qcMasterLink(q, M) ----
   M = {concepts, tables, mnems, graphs, images, interactives} 각각 {id:...} 맵(없으면 null=그 타입 스킵).
   concepts[id]는 존재만이면 1, 리치 객체면 {cards,emptyCx,mn[],tbl[],grp[]}(딸림/cx 검사 활성).
   _qcViolations의 CPT_MISSING·IMG_MISSING과 중복되지 않도록 여기선 그 둘을 재발행하지 않는다.  */
function _qcMasterLink(q, M){
  var v=[]; if(!M) return v; var R=_qcRefs(q);
  var hasCpt = M.concepts && typeof M.concepts==='object';
  var hasTbl = M.tables && typeof M.tables==='object';
  var hasGrp = M.graphs && typeof M.graphs==='object';
  var hasMn  = M.mnems  && typeof M.mnems==='object';
  var hasItv = M.interactives && typeof M.interactives==='object';
  // (1) 개념 미연결 — exp.cpt 참조가 하나도 없음(인라인 카드만 씀 → 마스터에서 안 불러옴)
  if(_qcOn('link','CPT_UNLINKED') && R.cpt.length===0)
    v.push({kind:'warn',field:'cpt',idx:0,code:'CPT_UNLINKED',msg:'개념 미연결 — exp.cpt 비어 있음(마스터에서 개념을 불러오지 않음). 공용 개념은 cpt://로 연결 권장',text:''});
  // (2) 개념 죽은 링크 + 딸림/그름/cx (리치 개념맵일 때만)
  R.cpt.forEach(function(r){
    if(!hasCpt) return;
    var c=M.concepts[r.id];
    if(c===undefined){ if(_qcOn('link','CPT_BROKEN')) v.push({kind:'block',field:'cpt',idx:0,code:'CPT_BROKEN',msg:r.where+' → 개념 '+r.id+' 마스터에 없음(죽은 링크) — 개념 마스터 먼저 업로드',text:r.id}); return; }
    if(c && typeof c==='object'){
      if(_qcOn('link','CPT_CX_EMPTY') && c.emptyCx>0) v.push({kind:'warn',field:'cpt',idx:0,code:'CPT_CX_EMPTY',msg:'참조 개념 '+r.id+' 카드 '+ (c.cards||'?') +'개 중 cx(예시) 빈칸 '+c.emptyCx+'개',text:r.id});
      if(_qcOn('link','CHILD_MISSING')){
        [['암기','mn',c.mn,M.mnems],['표','tbl',c.tbl,M.tables],['그래프','grp',c.grp,M.graphs]].forEach(function(k){
          var master=k[3]; if(!master) return;
          (k[2]||[]).forEach(function(cid){ cid=_qcCleanRef(cid); if(master[cid]===undefined) v.push({kind:'block',field:'cpt',idx:0,code:'CHILD_MISSING',msg:'개념 '+r.id+' → 딸림 '+k[0]+' '+cid+' 마스터에 없음',text:cid}); });
        });
      }
    }
  });
  // (3) 문항 직접 표/그래프/암기/인터랙티브 죽은 링크
  if(hasTbl && _qcOn('link','TBL_BROKEN')) R.tbl.forEach(function(r){ if(M.tables[r.id]===undefined) v.push({kind:'block',field:'tbl',idx:0,code:'TBL_BROKEN',msg:(r.where||'표')+' → 표 '+r.id+' 마스터에 없음',text:r.id}); });
  if(hasGrp && _qcOn('link','GRP_BROKEN')) R.grp.forEach(function(r){ if(M.graphs[r.id]===undefined) v.push({kind:'block',field:'grp',idx:0,code:'GRP_BROKEN',msg:'그래프 grp://'+r.id+' 마스터에 없음',text:r.id}); });
  if(hasMn  && _qcOn('link','MN_BROKEN'))  R.mn.forEach(function(r){ if(M.mnems[r.id]===undefined) v.push({kind:'warn',field:'mn',idx:0,code:'MN_BROKEN',msg:(r.where||'암기')+' → 암기코드 '+r.id+' 마스터에 없음',text:r.id}); });
  if(hasItv && _qcOn('link','ITV_BROKEN')) R.itv.forEach(function(r){ if(M.interactives[r.id]===undefined) v.push({kind:'block',field:'itv',idx:0,code:'ITV_BROKEN',msg:'인터랙티브 itv://'+r.id+' 마스터에 없음',text:r.id}); });
  _qcApplySev(v);
  return v;
}

/* ---- 4) 번들 검사: 한 뱅크 내 문항 id 중복 ---- */
function _qcBundle(questions){
  var v=[], seen={}; (questions||[]).forEach(function(q){ var id=q&&q.id; if(id==null||id==='') return;
    if(seen[id]){ if(_qcOn('gichul','DUP_ID')) v.push({kind:'block',field:'id',idx:0,code:'DUP_ID',qid:id,msg:'문항 id 중복: '+id+' — id는 뱅크 내 유일해야 함(업서트에서 서로 덮어씀)',text:String(id)}); }
    else seen[id]=1;
  }); _qcApplySev(v); return v;
}

/* ---- 마스터 레코드 날짜 검사(updatedAt 문자열·sentinel 아님) — 마스터 QC 보조 ---- */
function _qcRecordDate(rec){
  var u=rec&&rec.updatedAt;
  if(typeof u!=='string' || !u.trim() || /serverTimestamp|sentinel/i.test(u))
    return {kind:'block',field:'updatedAt',idx:0,code:'REC_DATE',sev:'BLOCKER',msg:'레코드 updatedAt 누락/비문자열/sentinel — ISO8601(+09:00) 문자열 필요(업로드 차단)',text:String(u==null?'':u)};
  return null;
}

/* ---- 5) 레벨업 전용 검수: _qcLevelup(subjects) ----
   subjects = [{subject, questions:[...]} ...] 또는 {questions:[...]}. 과목별로 판정.
   · LVUP_ANS_SKEW: 정답(ans) 최빈 비율 > maxPct(기본 30%)
   · LVUP_COUNT(기본 OFF): 과목당 문항수 != target
   · LVUP_LV_BAND / LVUP_DUP_GICHUL: 스키마 확정 후 활성(기본 OFF)  */
function _qcLvIsCalc(q){ return q&&(q._kind==='calc'||q._engine==='CALC'||(typeof q.id==='string'&&(q.id.indexOf('calc:')===0||q.id.indexOf('_calc')>=0))); }
function _qcLevelup(subjects){
  var out=[]; var subs = Array.isArray(subjects)?subjects
    : (subjects&&Array.isArray(subjects.subjects))?subjects.subjects
    : (subjects&&Array.isArray(subjects.questions))?[{subject:(subjects.subject||''),questions:subjects.questions}]
    : [];
  subs.forEach(function(sb){
    var sm=(sb&&sb._meta)||{}; var name=sm.subject||sb.subject||sb.name||'';
    var qs=Array.isArray(sb.questions)?sb.questions:(Array.isArray(sb.variants)?sb.variants:[]);
    if(!qs.length) return;
    // (1) 정답 편중 — 계산형 제외(정답 위치가 계산으로 고정돼 재배치 불가 → 오탐 방지)
    if(_qcOn('levelup','LVUP_ANS_SKEW')){
      var theory=qs.filter(function(q){ return !_qcLvIsCalc(q); });
      var cnt={}, tot=0;
      theory.forEach(function(q){ var a=q&&q.ans; if(a==null) return; var key=Array.isArray(a)?a.slice().sort().join(','):String(a); cnt[key]=(cnt[key]||0)+1; tot++; });
      var top=0, topKey=''; for(var k in cnt){ if(cnt[k]>top){top=cnt[k];topKey=k;} }
      var pct = tot? Math.round(top/tot*100) : 0; var maxPct=_qcN('levelup','LVUP_ANS_SKEW','maxPct',30);
      if(tot>=10 && pct>maxPct) out.push({kind:'warn',field:'ans',idx:0,code:'LVUP_ANS_SKEW',subject:name,msg:'['+name+'] 정답 편중 — 이론문항 '+tot+'개(계산형 제외) 중 최빈 정답 "'+topKey+'" '+pct+'% (>'+maxPct+'%). 정답 위치를 분산',text:''});
    }
    // (2) id 중복(레벨업 변형끼리) — 명백한 결함
    if(_qcOn('levelup','LVUP_DUP')){
      var seen={}, dups={}; qs.forEach(function(q){ var id=q&&q.id; if(id==null||id==='')return; if(seen[id])dups[id]=1; else seen[id]=1; });
      var dk=Object.keys(dups); if(dk.length) out.push({kind:'block',field:'id',idx:0,code:'LVUP_DUP',subject:name,msg:'['+name+'] 변형 id 중복 '+dk.length+'건: '+dk.slice(0,5).join(', ')+(dk.length>5?' 외':''),text:''});
    }
    // (3) Lv 밴드 — diff 1~5 중 "빈 밴드(0개)"만 결함으로(문항수는 과목별로 20×5 아님·다름). 기본 OFF(참고)
    if(_qcOn('levelup','LVUP_LV_BAND')){
      var band={}, has=false; qs.forEach(function(q){ var lv=(q&&(q.diff||q.lv||q.level)); if(lv!=null){has=true; band[lv]=(band[lv]||0)+1;} });
      if(has){ [1,2,3,4,5].forEach(function(b){ if(!band[b]) out.push({kind:'warn',field:'diff',idx:0,code:'LVUP_LV_BAND',subject:name,msg:'['+name+'] Lv'+b+' 밴드 문항 0개 — 레벨테스트 밴드 비어 있음',text:''}); }); }
    }
    // (4) 과목당 문항수 하한(기본 OFF) — 고정 100 아님(과목별 상이). 켜면 하한 미달만
    if(_qcOn('levelup','LVUP_COUNT')){ var floor=_qcN('levelup','LVUP_COUNT','floor',100);
      if(qs.length<floor) out.push({kind:'warn',field:'count',idx:0,code:'LVUP_COUNT',subject:name,msg:'['+name+'] 문항수 '+qs.length+' < 하한 '+floor,text:''}); }
  });
  _qcApplySev(out); return out;
}

/* ---- 전역 노출(양 호스트 공용) ---- */
try{
  /* ---- ⑥ 마스터 필요 판정 신호 (masterLinkAudit용) — admin에서 이관, 모든 검수 규칙은 qc-core 단일소스 ----
     개념 카드 텍스트에 아래 신호가 있으면 그 종류의 마스터(그래프/표/암기/인터랙티브)가 필요하다고 본다. */
  var _CS_GRP=/수요곡선|공급곡선|수요·공급|수요와\s*공급|초과수요|초과공급|수요량|공급량|탄력성|균형점|한계효용|무차별곡선|비용곡선|IS-?LM|로렌츠|지니계수|필립스곡선|AD-?AS|총수요|총공급|생산가능곡선|한계비용|한계수입|평균비용/;
  var _CS_TBL=/\bvs\b|비교|차이점|대비|매칭|기준표|종류별|유형별|구분|분류|체계|계층|구성요소|근본적|보강적|세부특성|(로|으로)\s*구성|(로|으로)\s*나뉘|하위\s*(요소|항목|특성)|상위\s*개념/;
  var _CS_MN=/[3-9]\s*(가지|요건|단계|종류|유형|원칙|요소|관점|활동|분류)|[3-9]개\s*(요건|요소|종류|유형|원칙|단계|기능)|[③④⑤⑥⑦⑧⑨].*[③④⑤⑥⑦⑧⑨]/;
  var _CS_ITV=/선입선출|후입선출|가중평균|이동평균|원가흐름|재고자산\s*평가|NPV|IRR|피셔수익률|순현재가치|내부수익률/;
  function _qcConceptSignals(txt){ txt=String(txt||''); return { sigGrp:_CS_GRP.test(txt), sigTbl:_CS_TBL.test(txt), sigMn:_CS_MN.test(txt), sigItv:_CS_ITV.test(txt) }; }
  /* ⑦ 문항시각/이미지 신호 — admin masterLinkAudit에서 이관(2026-07-13). 스템(q.q) 기반 판정만 담당(보유 여부는 admin이 M으로 판단).
     _VIS_Q: 풀이에 그래프/곡선/흐름이 필요한 시각형. _IMG_Q: 과목무관 이미지 지시. _IMG_ART: 유물·유적·사진(한국사 등, 감평·중개는 내용어라 제외). _IMG_EX: 사료·예시나열(이미지 아님 → _IMG_ART 오탐 제외). */
  var _VIS_Q=/수요곡선|공급곡선|비용곡선|무차별곡선|필립스곡선|IS-?LM|로렌츠|지니계수|총수요|총공급|탄력성|균형점|한계효용|한계비용|한계수입|평균비용|생산가능곡선|NPV|IRR|순현재가치|내부수익률|손익분기|현재가치법|곡선을?\s*그리|그래프로\s*나타|그림으로\s*(나타|표현)|(?<![가-힣])도해|순서도|흐름도/;
  var _IMG_Q=/다음\s*(그림|사진|지도|도표|사진자료)|그림과\s*같은|지도(?:에서|에\s*표시)|위\s*(그림|지도)|아래\s*(그림|지도)|다음\s*\(?[가-바]\)?\s*(유물|지역|시대|인물|건축|나라|사진)|해부도|근육도|골격도|인체도|그림의\s*(동작|자세|근육|부위|관절|뼈|힘줄|장기|구조)|화살표가\s*가리키는|표시된\s*(부위|근육|위치|지점)|그림에서\s*(가리키|나타|표시)/;
  var _IMG_ART=/(?<![가-힣])유물(?!사관|론|주의)|(?<![가-힣])유적|(?<![가-힣])문화재(?!단)|다음\s*사진|사진\s*자료|사진을?\s*(보|참고|참조)/;
  var _IMG_EX=/사료|(?:비문|문헌|그림|유물|유적)\s*[·,]|(?:유물|유적|그림|문헌)\s*(?:처럼|같은|등)/;
  function _qcVisualSignals(stem, docId){ stem=String(stem||''); docId=String(docId||'');
    var sigVis=_VIS_Q.test(stem), sigImgQ=_IMG_Q.test(stem), sigImgArt=_IMG_ART.test(stem), sigImgEx=_IMG_EX.test(stem);
    return { sigVis:sigVis, sigImgQ:sigImgQ, sigImgArt:sigImgArt, sigImgEx:sigImgEx,
      needVisStem:sigVis,
      needImgStem:(sigImgQ || (!/appraiser|realestate/.test(docId) && sigImgArt && !sigImgEx)) };
  }
  /* ---- ② 마스터 연결 검수 전체 감사 — admin _mlaAuditLines에서 이관(2026-07-13). 단일소스: admin·오프라인 검증기 공용.
     items=[{docId,data:{questions}}], M={concepts{id→{name,cards,emptyCx,hasCxSvg,hasCxTbl,cert,sigGrp/Tbl/Mn/Itv,mn,tbl,grp}},tables,mnems,graphs,images,interactives,itvCov}.
     반환: 지적서 ② 라인 배열. ⑦은 위 _qcVisualSignals 재사용. */
  function _qcMlaClean(u){ return String(u||'').replace(/^(cpt|tbl|mn|grp|img|itv):\/\//,''); }
  function _qcMlaRefs(q){ var exp=(q&&q.exp)||{}; var out={cpt:[],tbl:[],img:[],itv:[]};
    (Array.isArray(exp.cpt)?exp.cpt:[]).forEach(function(id,i){ if(id) out.cpt.push({id:_qcMlaClean(id),where:'exp.cpt['+i+']'}); });
    (Array.isArray(exp.ot)?exp.ot:[]).forEach(function(o,i){ if(o&&Array.isArray(o.cpt)) o.cpt.forEach(function(id){ if(id) out.cpt.push({id:_qcMlaClean(id),where:'ot['+i+']'}); }); });
    (Array.isArray(exp.tbl)?exp.tbl:[]).forEach(function(id){ if(id) out.tbl.push({id:_qcMlaClean(id),where:'exp.tbl'}); });
    var qb=''; try{ qb=JSON.stringify(q); }catch(_){}
    (qb.match(/img:\/\/([^\s"'\\<>\]},]+)/g)||[]).forEach(function(m){ out.img.push({id:m.replace('img://','')}); });
    (qb.match(/itv:\/\/([^\s"'\\<>\]},]+)/g)||[]).forEach(function(m){ out.itv.push({id:m.replace('itv://','')}); });
    return out;
  }
  function _qcMasterAudit(items, M){
    var L=['마스터: 개념 '+Object.keys(M.concepts).length+' · 표 '+Object.keys(M.tables).length+' · 암기 '+Object.keys(M.mnems).length+' · 그래프 '+Object.keys(M.graphs).length+' · 이미지 '+Object.keys(M.images).length+' · 인터랙티브 '+Object.keys(M.interactives).length,''];
    var noCptL=[],deadL=[],childL=[],mediaL=[],cxL=[],needL=[],need7L=[];
    var nNoCpt=0,nDead=0,nChild=0,nMedia=0,nCx=0,nNeed=0,nNeed7=0, seenCx={},seenChild={},_refCpt={};
    items.forEach(function(it){ ((it.data&&it.data.questions)||[]).forEach(function(q){ var id=(q&&q.id)||'?', R=_qcMlaRefs(q);
      if(R.cpt.length===0 && (_qcCptExemptCerts||[]).indexOf(String(it.docId||'').split('__')[0])<0){ noCptL.push('  [누락] '+it.docId+' · '+id+' 개념 연결 없음(exp.cpt 비어 있음)'); nNoCpt++; }
      R.cpt.forEach(function(r){ var c=M.concepts[r.id];
        if(!c){ deadL.push('  [누락] '+it.docId+' · '+id+' '+r.where+' → 개념 '+r.id+' 마스터에 없음(죽은 링크)'); nDead++; return; }
        _refCpt[r.id]=1;
        if(c.cards===0){ deadL.push('  [누락] '+it.docId+' · '+id+' '+r.where+' → 개념 '+r.id+' 카드 0개'); nDead++; }
        else if(c.emptyCx>0 && !seenCx[r.id]){ seenCx[r.id]=1; cxL.push('  [경고] 개념 '+r.id+' ('+c.name+') 카드 '+c.cards+'개 중 cx 빈칸 '+c.emptyCx+'개'); nCx++; }
        [['암기','mn',c.mn,M.mnems],['표','tbl',c.tbl,M.tables],['그래프','grp',c.grp,M.graphs]].forEach(function(k){
          (k[2]||[]).forEach(function(cid){ if(!k[3][cid]){ var key=k[1]+':'+r.id+':'+cid; if(seenChild[key])return; seenChild[key]=1; childL.push('  [누락] '+it.docId+' · '+id+' 개념 '+r.id+' → '+k[0]+' '+cid+' 마스터에 없음'); nChild++; } });
        });
      });
      R.tbl.forEach(function(r){ if(!M.tables[r.id]){ childL.push('  [누락] '+it.docId+' · '+id+' '+r.where+' → 표 '+r.id+' 마스터에 없음'); nChild++; } });
      R.img.forEach(function(r){ if(!M.images[r.id]){ mediaL.push('  [누락] '+it.docId+' · '+id+' 이미지 img://'+r.id+' 없음'); nMedia++; } });
      R.itv.forEach(function(r){ if(!M.interactives[r.id]){ mediaL.push('  [누락] '+it.docId+' · '+id+' 인터랙티브 itv://'+r.id+' 없음'); nMedia++; } });
      var _qb=''; try{ _qb=JSON.stringify(q); }catch(_){}
      var _lc7=R.cpt.map(function(r){return M.concepts[r.id];}).filter(Boolean);
      var _qVis=(q.exp&&q.exp.graph&&String(q.exp.graph).trim())||/<svg|img:\/\//.test(_qb)||_lc7.some(function(c){return (c.grp||[]).length||c.hasCxSvg;})||(M.itvCov&&R.cpt.some(function(r){return M.itvCov[r.id];}));
      var _hasImg=/img:\/\//.test(_qb)||(q.img&&String(q.img).trim());
      var _sv=_qcVisualSignals(String((q&&q.q)||''), it.docId||'');
      if(_sv.needVisStem && !_qVis){ need7L.push('  [경고] '+it.docId+' · '+id+' 문항 자체가 시각 풀이형(곡선·계산곡선·흐름 등)인데 풀이 그래프/이미지 없음 → exp.graph 추가 또는 개념 grp 연결'); nNeed7++; }
      else if(_sv.needImgStem && !_hasImg){ need7L.push('  [경고] '+it.docId+' · '+id+' 이미지 지시(그림·사진·지도·유물·동작·부위 등)인데 이미지 참조 없음 → 이미지(img://) 연결/제작'); nNeed7++; }
    }); });
    Object.keys(_refCpt).forEach(function(cid){ var c=M.concepts[cid]; if(!c) return;
      var hasGrp=(c.grp||[]).length||c.hasCxSvg, hasTbl=(c.tbl||[]).length||c.hasCxTbl, hasMn=(c.mn||[]).length, hasItv=(M.itvCov&&M.itvCov[cid]);
      var miss=[]; if(c.sigGrp&&!hasGrp)miss.push('그래프'); if(c.sigItv&&!hasItv)miss.push('인터랙티브'); if(c.sigTbl&&!hasTbl)miss.push('표'); if(c.sigMn&&!hasMn)miss.push('암기');
      if(miss.length){ needL.push('  [경고] 개념 '+cid+' ('+(c.name||'')+')'+(c.cert?(' ['+c.cert+']'):'')+' → '+miss.join('·')+' 필요한데 없음'); nNeed++; }
    });
    L.push('■ 1) 개념 미연결 (exp.cpt 비어 있음 — 개념카드 통째 안 뜸)'); L=L.concat(noCptL.length?noCptL:['  (없음 — 모든 문항에 개념 연결됨)']);
    L.push('','■ 2) 죽은 링크 (가리킨 개념이 마스터에 없음/카드 0개)'); L=L.concat(deadL.length?deadL:['  (없음)']);
    L.push('','■ 3) 딸림 마스터 누락 (개념→표·암기·그래프 + 문항 직접 표참조)'); L=L.concat(childL.length?childL:['  (없음)']);
    L.push('','■ 4) 이미지·인터랙티브 누락'); L=L.concat(mediaL.length?mediaL:['  (없음)']);
    L.push('','■ 5) 개념카드 예시(cx) 빈칸 (참조 개념 한정·개념별 1회)'); L=L.concat(cxL.length?cxL:['  (없음)']);
    L.push('','■ 6) 마스터 필요한데 없음 [개념 단위 전수]'); L=L.concat(needL.length?needL:['  (없음)']);
    L.push('','■ 7) 문항 풀이 시각자료 필요 [문항 단위·과목무관]'); L=L.concat(need7L.length?need7L:['  (없음)']);
    L.push('','요약: 개념미연결 '+nNoCpt+' · 죽은링크 '+nDead+' · 딸림/표 누락 '+nChild+' · 이미지/인터랙티브 '+nMedia+' · cx빈칸 개념 '+nCx+' · 마스터필요(개념) '+nNeed+' · 문항시각필요 '+nNeed7);
    L.counts={nNoCpt:nNoCpt,nDead:nDead,nChild:nChild,nMedia:nMedia,nCx:nCx,nNeed:nNeed,nNeed7:nNeed7};
    return L;
  }
  /* ===========================================================================
     [신규 2026-07-15] 마스터 레코드 품질 검수 — graph·mnem·table·concept·interactive.
     각 함수는 마스터 배열(또는 단일 레코드)을 받아 위반 [{id,code,sev,kind,field,idx,msg}]을 반환한다.
     admin의 내보내기 게이트(_qcMasterExportGate)·preview 검수창이 QC.<종류>Audit로 호출한다.
     지금까지 config엔 코드만 있고 구현이 없어 그래프 등 마스터 검수가 비어 있던 구멍을 메운다.
     =========================================================================== */
  function _qcAsArr(a){ return Array.isArray(a)?a:(a?[a]:[]); }
  function _qcRedLetters(s){ var out=[],m,re=/<span\s+class\s*=\s*["']k["']\s*>([\s\S]*?)<\/span>|<k>([\s\S]*?)<\/k>/g; while((m=re.exec(String(s||'')))){ out.push((m[1]!=null?m[1]:m[2]).replace(/\s/g,'')); } return out.join(''); }
  function _qcDupChk(seen,id,sec,code,label,v){ if(seen[id]){ if(_qcOn(sec,code)) v.push({id:id,kind:'block',field:'id',idx:0,code:code,msg:label+' id 중복: '+id}); return true; } seen[id]=1; return false; }
  function _qcRecDate(rec,id,v){ var rd=_qcRecordDate(rec); if(rd){ rd.id=id; v.push(rd); } }

  /* [엔진 #23] SVG 원소 이름 화이트리스트 — GRP_RAW_LT 가 '<' 뒤 이름을 이걸로 대조한다.
     대소문자는 무시한다(HTML 파서가 <clipPath> 류의 대소문자를 보정하므로, 여기서 엄격히 굴면 오탐이 난다).
     [검수 지적 반영] 필터 프리미티브(feGaussianBlur·feDropShadow…)를 통째로 빠뜨려 정상 SVG 가 ERROR 로
     잡히던 구멍을 메웠다 — 'fe' 로 시작하는 이름은 접두로 면제하고, SMIL(animateMotion·mpath·set)과
     hatch·solidcolor 계열을 목록에 더했다. script 는 GRP_EXTERNAL 이 따로 block 하므로 여기선 원소로 인정한다
     (안 그러면 "글자 자리의 날것 '<'" 라는 엉뚱한 문구로 이중 보고된다). */
  var _QC_SVG_EL={}; ('svg g path line rect circle ellipse polygon polyline text tspan textPath defs marker '+
    'linearGradient radialGradient stop clipPath mask pattern use symbol title desc style filter animate '+
    'animateTransform animateMotion mpath set script hatch hatchpath solidcolor '+
    'image foreignObject switch a tref metadata view').split(' ').forEach(function(n){ _QC_SVG_EL[n.toLowerCase()]=1; });
  function _qcIsSvgEl(name){ var n=String(name||'').toLowerCase(); return !!_QC_SVG_EL[n] || /^fe[a-z]/.test(n); }

  // ---- 그래프(SVG) 마스터 검수 ----
  function _qcGraphAudit(arr){ var v=[],seen={};
    _qcAsArr(arr).forEach(function(g){ if(!g) return; var id=(g.id!=null)?String(g.id):'?';
      if(_qcDupChk(seen,id,'graph','GRP_DUP','그래프',v)) return; _qcRecDate(g,id,v);
      if(_qcOn('graph','GRP_TYPE') && String(g.type||'')!=='svg') v.push({id:id,kind:'warn',field:'type',idx:0,code:'GRP_TYPE',msg:'type이 "svg"가 아님(type="'+String(g.type||'')+'") — 그래프 마스터는 type:"svg"'});
      if(_qcOn('graph','GRP_PARAMS_OBJ') && g.params!=null && typeof g.params==='object') v.push({id:id,kind:'warn',field:'params',idx:0,code:'GRP_PARAMS_OBJ',msg:'params가 객체 — SVG 그래프는 params:null 이어야 함(⚠️ {} 아님)'});
      var svg=String(g.svg||'');
      if(!svg.trim()){ if(_qcOn('graph','GRP_NO_SVG')) v.push({id:id,kind:'block',field:'svg',idx:0,code:'GRP_NO_SVG',msg:'svg 내용 없음'}); _qcApplySev(v); return; }
      if(_qcOn('graph','GRP_SVG_MALFORMED')){ var opens=(svg.match(/<svg[\s>]/g)||[]).length, closes=(svg.match(/<\/svg>/g)||[]).length;
        if(!/<svg[\s>]/.test(svg)||!/<\/svg>/.test(svg)||opens!==closes) v.push({id:id,kind:'block',field:'svg',idx:0,code:'GRP_SVG_MALFORMED',msg:'<svg>…</svg> 태그가 안 맞음/누락 — XML 파싱 깨짐 위험'}); }
      /* [엔진 #23 · 2026-08-03] 글자 자리의 날것 '<' — <text>P<Pe → Y↓</text> 처럼 '&lt;' 로 안 감싼 부등호.
       * ⚠ 군더더기 '/'(#20)와 급이 다르다. '/' 는 HTML 파서가 무시해 학생 화면이 멀쩡했지만, 날것 '<' 는
       * HTML 파서도 태그 시작으로 읽어 **뒤 글자를 통째로 삼킨다.** 실측 grp_las5_c8aae7ade 는 지금
       * 학생 화면에 라벨이 'P' 한 글자만 나온다(헤드리스 크롬 실물 확인 · work/gate12/_zz51_broken.png).
       * 그래서 warn 이 아니라 block(ERROR)이다. 마스터 검수는 보고 전용이라 업로드를 막지는 않는다.
       * 판정: '<' 뒤 이름이 SVG 원소 화이트리스트(_QC_SVG_EL)에 없으면 날것. 주석(<!--…-->)·선언(<! <?)은 면제.
       * 라이브 실측 1건·1곳(데이터 수리는 판정대기 #51). 측정·음성 9/9: work/gate12/F_rawlt.js */
      if(_qcOn('graph','GRP_RAW_LT')){
        /* [검수 지적 반영] 태그 **밖 본문**의 '<' 와 **속성값 안**의 '<' 를 갈라 센다. 크롬 실측 결과
         * 따옴표 안의 '<' 는 HTML 파서가 그냥 글자로 읽어 화면이 안 깨진다(aria-label="P<Pe" → 본문 멀쩡).
         * 즉 후자는 XML 에서만 위법이라 #20 군더더기 '/' 와 같은 처지 → 별도 코드로 WARNING.
         * 하나로 묶으면 지적서가 "학생 화면에서 사라짐"이라고 거짓말을 하게 된다.
         * ⚠ 한계: 본문 'x<a b' 처럼 '<' 뒤가 진짜 원소 이름(a·g)이면 못 잡는다. 화이트리스트 방식의
         *   구조적 한계이고, 한 글자 원소가 a·g 둘뿐이라 실무 위험은 낮다고 보고 남겨 둔다. */
        var _rawBody=0, _rawAttr=0, _i=0;
        while(_i<svg.length){
          if(svg.charAt(_i)!=='<'){ _i++; continue; }
          if(svg.substr(_i,4)==='<!--'){ var _e=svg.indexOf('-->',_i); _i=(_e<0?svg.length:_e+3); continue; }
          var _c=svg.charAt(_i+1);
          if(_c==='!'||_c==='?'){ var _e2=svg.indexOf('>',_i); _i=(_e2<0?svg.length:_e2+1); continue; }
          var _m=/^<\/?([a-zA-Z][a-zA-Z0-9]*)/.exec(svg.substr(_i,40));
          if(!_m || !_qcIsSvgEl(_m[1])){ _rawBody++; _i++; continue; }
          var _j=_i+_m[0].length, _q='';            /* 진짜 태그 — 여는 '>' 까지 넘기며 따옴표 안 '<' 를 센다 */
          while(_j<svg.length){
            var _cj=svg.charAt(_j);
            if(_q){ if(_cj===_q) _q=''; else if(_cj==='<') _rawAttr++; }
            else if(_cj==='"'||_cj==="'") _q=_cj;
            else if(_cj==='>'){ _j++; break; }
            _j++;
          }
          _i=_j;
        }
        if(_rawBody) v.push({id:id,kind:'block',field:'svg',idx:0,code:'GRP_RAW_LT',msg:'글자 자리에 날것 \'<\' '+_rawBody+'곳 — HTML 파서가 태그로 읽어 그 뒤 글자가 학생 화면에서 사라짐. \'&lt;\' 로 바꿀 것'});
        if(_rawAttr) v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_RAW_LT_ATTR',msg:'속성값 안에 날것 \'<\' '+_rawAttr+'곳 — 지금 화면은 정상(HTML 파서는 글자로 읽음)이나 XML 파서로는 위법. \'&lt;\' 로 바꿀 것'});
      }
      /* [엔진 #20 · 2026-08-03] 여는 태그 안 군더더기 '/' — <path … stroke-width="1.4"/ stroke-linejoin="round" …>
       * 처럼 닫는 슬래시가 속성 목록 한가운데 낀 것(생성기 흔적). 학생앱은 innerHTML(HTML 파서)로 꽂아
       * 무시하므로 화면은 정상이라 warn 이다. 독립 .svg 파일·image/svg+xml 서빙·DOMParser 로 가면 파싱이 깨진다.
       * 라이브 실측 60/295 그래프 · 133곳(판정대기 #31 — 데이터 수리는 별도 결재). 측정: work/gate12/E_stray.js
       * [엔진 #21 · 검수 지적 반영] 여는 태그를 통째로 잡고 **따옴표 안 속성값을 지운 뒤** '/'+공백을 센다.
       *   옛 식(<[a-zA-Z][^<>]*?\/\s+[^<>]*?>)은 ① 속성값 안의 '/ '(style="font: 12px/ 1.5" ·
       *   aria-label="수요/ 공급" · href="…/ y")를 오탐하고 ② lazy 라 한 태그에 여러 곳이어도 1로 셌다.
       *   라이브 판정은 그대로다(60/295 · 133곳, 갈리는 그래프 0건). 대조: work/gate12/zz_alt.js */
      if(_qcOn('graph','GRP_STRAY_SLASH')){ var _stray=0;
        (svg.match(/<[a-zA-Z][^<>]*>/g)||[]).forEach(function(_tag){
          var _bare=_tag.replace(/"[^"]*"/g,'""').replace(/'[^']*'/g,"''");   /* 속성값 제거 — 그 안의 '/'는 군더더기가 아니다 */
          _stray += (_bare.match(/\/\s/g)||[]).length;                        /* 태그 끝 '/>' 는 뒤가 '>' 라 안 걸린다 */
        });
        if(_stray) v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_STRAY_SLASH',msg:'여는 태그 속성 사이에 군더더기 \'/\' '+_stray+'곳 — 지금 화면은 정상이나 XML 파서(독립 .svg·DOMParser)로는 파싱 실패. 태그 끝의 \'/>\' 하나만 남기고 제거'}); }
      if(_qcOn('graph','GRP_EXTERNAL') && /(<script|<image[\s>]|<foreignObject|(?:xlink:)?href\s*=\s*["']?\s*https?:)/i.test(svg)) v.push({id:id,kind:'block',field:'svg',idx:0,code:'GRP_EXTERNAL',msg:'외부 자원/스크립트(<script>·<image>·http href·foreignObject) 포함 — 순수 벡터만 허용'});
      if(_qcOn('graph','GRP_NO_VIEWBOX') && !/viewBox\s*=/.test(svg)) v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_NO_VIEWBOX',msg:'viewBox 없음 — viewBox="0 -28 360 H" 권장(상단 -28에 제목)'});
      if(_qcOn('graph','GRP_FONT')){ var body=svg.replace(/<!--[\s\S]*?-->/g,''); if(/[가-힣]/.test(body) && !/Noto\s*Sans\s*CJK\s*KR/.test(body)) v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_FONT',msg:'한글이 있는데 font-family="Noto Sans CJK KR" 미지정 — 폰트 깨짐(□□) 위험'}); }
      if(_qcOn('graph','GRP_NO_TEXT') && !/<text[\s>]/.test(svg)) v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_NO_TEXT',msg:'<text> 라벨이 하나도 없음 — 제목·축·설명 텍스트 확인'});
      if(_qcOn('graph','GRP_EMDASH') && /—/.test(svg)) v.push({id:id,kind:'block',field:'svg',idx:0,code:'GRP_EMDASH',msg:'svg에 em대시(—) — en대시(–)·쉼표로'});
      /* [2026-08-06 · 크리스 그래프 규칙] 아래 6개는 "표만 덜렁 있으면 모른다"에서 나온 것.
         기준본: grp_econ_negative_externality. 규칙 — 실선과 그 끝 라벨은 검정,
         색은 점·영역·특별표시에만, 한 덩어리는 한 색, 범위는 빗금, 가리킬 땐 끝에 화살촉,
         읽는 법은 축 폭을 채우고 단어를 안 끊는다. */
      /* [2026-08-07] kind — 'chart'(축 있는 그래프) / 'flow'(축 없는 전개도·흐름도) / 없음(=애매, chart 규칙).
         296개 중 flow 43개는 박스 글자가 이미 설명이라 "읽는 법"이 군더더기다. 분류·근거는 인계 문서. */
      _qcGraphRules(id, svg, v, g.kind, g.layout);
    }); _qcApplySev(v); return v; }

  /* [2026-08-07] path(곡선)를 점으로 풀어 샘플링한다. 브라우저 getPointAtLength 를 못 쓰므로
     M·L·H·V·C·S·Q·T·Z 를 직접 계산한다(A 호는 드물어 건너뜀 — 만나면 그 구간만 직선으로 잇는다).
     곡선이 글자를 뚫어도 게이트가 "통과"를 내주던 구멍을 막기 위한 것. */
  function _qcPathPts(d, n){
    n=n||300; var pts=[], cx=0, cy=0, sx=0, sy=0, px=0, py=0, prevC=null;
    var toks=String(d||'').match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)||[];
    var i=0, cmd=null;
    function num(){ return parseFloat(toks[i++]); }
    function push(x,y){ pts.push([x,y]); }
    function bez3(x0,y0,x1,y1,x2,y2,x3,y3){ for(var t=1;t<=8;t++){ var u=t/8, m=1-u;
      push(m*m*m*x0+3*m*m*u*x1+3*m*u*u*x2+u*u*u*x3, m*m*m*y0+3*m*m*u*y1+3*m*u*u*y2+u*u*u*y3); } }
    function bez2(x0,y0,x1,y1,x2,y2){ for(var t=1;t<=8;t++){ var u=t/8, m=1-u;
      push(m*m*x0+2*m*u*x1+u*u*x2, m*m*y0+2*m*u*y1+u*u*y2); } }
    while(i<toks.length){
      var t0=toks[i];
      if(/^[MmLlHhVvCcSsQqTtAaZz]$/.test(t0)){ cmd=t0; i++; }
      else if(cmd==='M') cmd='L'; else if(cmd==='m') cmd='l';
      var rel=(cmd===cmd.toLowerCase()), C=cmd.toUpperCase();
      if(C==='Z'){ push(sx,sy); cx=sx; cy=sy; prevC=null; continue; }
      if(C==='M'){ var x=num(), y=num(); if(rel){x+=cx;y+=cy;} cx=x; cy=y; sx=x; sy=y; push(x,y); prevC=null; }
      else if(C==='L'){ var x2=num(), y2=num(); if(rel){x2+=cx;y2+=cy;} push(x2,y2); cx=x2; cy=y2; prevC=null; }
      else if(C==='H'){ var xh=num(); if(rel) xh+=cx; push(xh,cy); cx=xh; prevC=null; }
      else if(C==='V'){ var yv=num(); if(rel) yv+=cy; push(cx,yv); cy=yv; prevC=null; }
      else if(C==='C'){ var a1=num(),b1=num(),a2=num(),b2=num(),a3=num(),b3=num();
        if(rel){a1+=cx;b1+=cy;a2+=cx;b2+=cy;a3+=cx;b3+=cy;}
        bez3(cx,cy,a1,b1,a2,b2,a3,b3); prevC=[a2,b2]; cx=a3; cy=b3; }
      else if(C==='S'){ var s2=num(),t2=num(),s3=num(),t3=num(); if(rel){s2+=cx;t2+=cy;s3+=cx;t3+=cy;}
        var r1=prevC?[2*cx-prevC[0],2*cy-prevC[1]]:[cx,cy];
        bez3(cx,cy,r1[0],r1[1],s2,t2,s3,t3); prevC=[s2,t2]; cx=s3; cy=t3; }
      else if(C==='Q'){ var q1=num(),q2=num(),q3=num(),q4=num(); if(rel){q1+=cx;q2+=cy;q3+=cx;q4+=cy;}
        bez2(cx,cy,q1,q2,q3,q4); prevC=[q1,q2]; cx=q3; cy=q4; }
      else if(C==='T'){ var u3=num(),u4=num(); if(rel){u3+=cx;u4+=cy;}
        var rq=prevC?[2*cx-prevC[0],2*cy-prevC[1]]:[cx,cy];
        bez2(cx,cy,rq[0],rq[1],u3,u4); prevC=rq; cx=u3; cy=u4; }
      else if(C==='A'){ num();num();num();num();num(); var ax=num(), ay=num(); if(rel){ax+=cx;ay+=cy;}
        push(ax,ay); cx=ax; cy=ay; prevC=null; }                    /* 호는 끝점만 — 근사 */
      else { i++; }
      if(pts.length>4000) break;
    }
    return pts;
  }
  /* 점 목록이 글자 상자 안을 지나는 길이(px) */
  /* [2026-08-09 고침] 곡선이 글자를 **관통**하면 0 이 나오던 버그.
     _qcPathPts 는 베지에 한 토막을 8점으로만 뜬다(표본 사이가 20~40px 벌어진다).
     그런데 여기서는 "양 끝점 중 하나가 상자 안일 때"만 길이를 세었다. 작은 글자 상자를
     한 표본구간이 가로지르면 두 끝이 다 바깥이라 한 푼도 안 세어졌다.
     라이브 실측: 3px 넘게 파고드는 곡선 12건 중 게이트가 잡던 것은 2건뿐이었다.
     직선용 _qcSegInBox 는 이미 잘게 쪼개 재고 있으니 그것을 그대로 쓴다. */
  function _qcPolyInBox(pts, bx1, by1, bx2, by2){
    var len=0;
    for(var i=1;i<pts.length;i++){
      var a=pts[i-1], b=pts[i];
      if(a[0]==null||b[0]==null||isNaN(a[0])||isNaN(b[0])||isNaN(a[1])||isNaN(b[1])) continue;
      len+=_qcSegInBox({x1:a[0],y1:a[1],x2:b[0],y2:b[1]}, bx1, by1, bx2, by2);
    }
    return len;
  }

  /* 선분이 글자 상자 안을 지나는 길이(px). 0이면 안 닿음. 가장자리를 스치는 정도는 작게 나온다. */
  function _qcSegInBox(l, bx1, by1, bx2, by2){
    if([l.x1,l.y1,l.x2,l.y2].some(function(n){ return n==null||isNaN(n); })) return 0;
    var dx=l.x2-l.x1, dy=l.y2-l.y1, len=Math.sqrt(dx*dx+dy*dy); if(!len) return 0;
    var N=Math.max(24, Math.ceil(len/2)), inN=0;
    for(var i=0;i<=N;i++){ var x=l.x1+dx*i/N, y=l.y1+dy*i/N;
      if(x>=bx1&&x<=bx2&&y>=by1&&y<=by2) inN++; }
    return len*inN/N;
  }

  /* 그래프 읽기 규칙 6종. 좌표를 실제로 재서 판정한다(직선만 — 곡선 path 는 판정보류).
     [2026-08-07] kind 인자 추가. 'flow' 는 축이 없는 전개도·흐름도라
     읽는 법(GRP_NO_GUIDE)·축 폭(GRP_GUIDE_NARROW)을 면제하고 대신 GRP_FLOW_ARROW 를 본다.
     kind 가 비었으면(애매 16개·신규 업로드) 지금까지대로 chart 규칙 — 기본값을 바꾸지 않는다. */
  function _qcGraphRules(id, svg, v, kind, layout){
    var isFlow=(String(kind||'')==='flow');
    /* [2026-08-07] 'diagram' — 축도 순서도 없는 도해. 296개 중 5개.
       공간·입지 모형(베버 입지삼각형·레일리 상권분기점·허프 확률모형) · 눈금 띠(축척과 정밀도) ·
       수식(장기수선충당금 산정식). 축이 없으니 "축·선·약어 뜻"을 적으라는 요구가 성립하지 않는다.
       flow 와 달리 읽는 법을 **금지하지는 않는다**(GRP_FLOW_GUIDE 는 flow 전용) — 필요하면 붙여도 된다.
       화살표·정렬 규칙도 flow 전용이라 걸리지 않는다. */
    var isDiagram=(String(kind||'')==='diagram');
    var _noAxis=(isFlow||isDiagram);          /* 축이 없어 읽는 법·축 폭 규칙이 성립하지 않는 갈래 */
    /* [2026-08-07] layout — flow 안의 생김새 갈래. 정렬 규칙이 여기서 갈린다.
       'vstack'(세로로 쌓인 단순 전개도) · 'table'(박스 안이 2단 이상, 표 성격) ·
       'timeline'(가로 시간축) · 'row'(한 줄 배치·병렬·트리).
       크리스: "단순 시간흐름 전개도 세로형태는 다 가운데 정렬로 가고 나머지는 좌측 정렬 그대로." */
    var _lay=String(layout||'');
    /* [2026-08-07] 속성이 홑따옴표인 SVG 가 16개 있다(viewBox='0 -28 360 300' 꼴).
       쌍따옴표만 보던 정규식 탓에 그 16개는 text·line 을 하나도 못 읽어
       라벨 겹침·색·잘림 검사가 통째로 건너뛰어졌고, 결과가 "읽는 법만 없음"으로 보였다.
       **게이트를 새로 만들면 데이터가 한 가지 표기만 쓴다고 가정하지 말 것.** */
    function attr(tag,k){ var m=tag.match(new RegExp(k+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')'));
      return m?(m[1]!=null?m[1]:m[2]):null; }
    function num(tag,k){ var s=attr(tag,k); return s==null?null:parseFloat(s); }
    var isDark=function(c){ return !c || /^#(0f172a|000|000000|1e293b|334155|475569|64748b|94a3b8|e[0-9a-f]{5}|f[0-9a-f]{5})$/i.test(String(c).replace(/\s/g,'')); };
    var texts=[], lines=[];
    (svg.match(/<text[^>]*>[^<]*<\/text>/g)||[]).forEach(function(t){
      texts.push({x:num(t,'x'), y:num(t,'y'), fs:parseFloat(attr(t,'font-size')||'10'), fill:attr(t,'fill'), anchor:attr(t,'text-anchor'), s:(t.match(/>([^<]*)</)||[])[1]||''});
    });
    (svg.match(/<line[^>]*\/>/g)||[]).forEach(function(t){
      lines.push({x1:num(t,'x1'),y1:num(t,'y1'),x2:num(t,'x2'),y2:num(t,'y2'),
        w:parseFloat(attr(t,'stroke-width')||'1'), c:attr(t,'stroke'), dash:!!attr(t,'stroke-dasharray'), arrow:/marker-end/.test(t)});
    });
    /* 곡선 — <defs>(화살촉 marker) 안은 좌표계가 달라 제외하고, 면으로 칠한 것(fill 있음)도 제외한다.
       칠한 면 위에 글자가 얹히는 건 겹침이 아니라 의도된 배치일 수 있다. */
    var curves=[], _body=String(svg).replace(/<defs[\s\S]*?<\/defs>/gi,'');
    (_body.match(/<path[^>]*\/>/g)||[]).forEach(function(t){
      if(attr(t,'stroke-dasharray')) return;
      var f=attr(t,'fill'); if(f && !/^none$/i.test(f)) return;
      var d=attr(t,'d'); if(!d) return;
      var pts=_qcPathPts(d); if(pts.length>1) curves.push({pts:pts, c:attr(t,'stroke')});
    });
    /* [2026-08-07] 테두리 도형도 글자를 뚫는다 — <circle>·<ellipse>·<polyline>·<polygon>.
       지금껏 <line> 과 fill:none <path> 만 봐서 이것들은 글자를 관통해도 통과였다.
       라이브에 circle/ellipse 369개·polyline 10개가 있다.
       ⚠ **칠해진 것은 뺀다.** r=4 짜리 색 점은 자료 표시(마커)이고, 라벨 옆에 붙는 게 정상이다.
       테두리만 있는 것(fill 없음/none + stroke)만 윤곽을 점으로 풀어 검사한다.
       라벨을 **감싸는** 강조 타원은 윤곽이 글자 바깥을 지나므로 자연히 안 걸린다. */
    function _qcOutlinePts(cx,cy,rx,ry){
      var p=[]; for(var i=0;i<=72;i++){ var a=i/72*Math.PI*2; p.push([cx+rx*Math.cos(a), cy+ry*Math.sin(a)]); }
      return p;
    }
    (_body.match(/<(?:circle|ellipse)[^>]*\/?>/g)||[]).forEach(function(t){
      if(attr(t,'stroke-dasharray')) return;
      var f=attr(t,'fill'); if(f && !/^none$/i.test(f)) return;      /* 칠한 점 = 마커 */
      if(!attr(t,'stroke')) return;                                   /* 선이 없으면 그릴 게 없다 */
      var cx=num(t,'cx'), cy=num(t,'cy');
      var r=num(t,'r'), rx=(r!=null?r:num(t,'rx')), ry=(r!=null?r:num(t,'ry'));
      if([cx,cy,rx,ry].some(function(n){ return n==null||isNaN(n); })) return;
      curves.push({pts:_qcOutlinePts(cx,cy,rx,ry), c:attr(t,'stroke')});
    });
    (_body.match(/<(?:polyline|polygon)[^>]*\/?>/g)||[]).forEach(function(t){
      if(attr(t,'stroke-dasharray')) return;
      var f=attr(t,'fill'); if(f && !/^none$/i.test(f)) return;
      if(!attr(t,'stroke')) return;
      var ns=(String(attr(t,'points')||'').match(/-?[\d.]+/g)||[]).map(parseFloat);
      if(ns.length<6) return;                                          /* 점 3개 미만은 도형이 아니다 */
      var pts=[]; for(var i=0;i+1<ns.length;i+=2) pts.push([ns[i],ns[i+1]]);
      /* [2026-08-09] **작은 것은 화살촉이지 곡선이 아니다.**
         화살촉을 속 채운 삼각형에서 열린 꺾쇠(<polyline fill=none stroke>)로 바꾸자
         축 끝 촉이 곡선으로 세어져 바로 옆 "가격(P)" 같은 축 이름표를 파고든다고 34건이 났다.
         테두리 도형은 라벨을 감싸거나 가로지르는 큰 것이라, 16×16 미만은 촉으로 보고 뺀다. */
      var _pxs=pts.map(function(q){return q[0];}), _pys=pts.map(function(q){return q[1];});
      if(Math.max.apply(null,_pxs)-Math.min.apply(null,_pxs)<16 &&
         Math.max.apply(null,_pys)-Math.min.apply(null,_pys)<16) return;
      if(/<polygon/.test(t)) pts.push(pts[0]);                         /* 다각형은 닫는다 */
      curves.push({pts:pts, c:attr(t,'stroke')});
    });
    /* 글자 폭 어림 — Noto Sans CJK KR 실측 계수(2026-08-06 캔버스 측정):
       한글/전각 0.92em · 대문자 0.62em · 그 밖 ASCII 0.53em · 공백 0.28em. */
    function tw(s,fs){ var w=0; s=String(s);
      for(var i=0;i<s.length;i++){ var c=s[i];
        w+=fs*(/[가-힣ㄱ-ㅎ㉠-㉭ㆍ－-｝]/.test(c)?0.92:(c===' '?0.28:(/[A-Z]/.test(c)?0.62:0.53))); }
      return w; }
    /* text-anchor 를 반영한 좌우 끝 — middle·end 를 왼쪽정렬로 오판하면 폭이 두 배로 잡힌다. */
    function xspan(t){ var w=tw(t.s,t.fs), a=t.anchor;
      if(a==='middle') return [t.x-w/2, t.x+w/2];
      if(a==='end') return [t.x-w, t.x];
      return [t.x, t.x+w]; }

    // ① 읽는 법 블록
    var hasGuide=texts.some(function(t){ return /^읽는\s*법$/.test(String(t.s).trim()); });
    if(_qcOn('graph','GRP_NO_GUIDE') && !hasGuide && !_noAxis)
      v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_NO_GUIDE',msg:'축 아래 "읽는 법" 없음 — 축·선·약어 뜻을 그래프 밑에 적어야 함'});
    /* [2026-08-07] flow 는 면제가 아니라 **있으면 안 된다.** 크리스: "전개도 이런건 읽는 법 필요 없다고!"
       박스 글자가 이미 설명이라 밑에 또 풀어 쓰면 같은 말을 두 번 읽힌다.
       면제로만 두었더니 이미 붙어 있던 3개(고려의 대외 항쟁 등)가 그대로 남았다 — 그래서 경고로 잡는다. */
    if(_qcOn('graph','GRP_FLOW_GUIDE') && hasGuide && isFlow)
      v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_FLOW_GUIDE',msg:'전개도(kind:"flow")에 "읽는 법"이 있음 — 박스 글자가 이미 설명이라 군더더기다. 읽는 법 블록을 지우고 viewBox 높이를 줄일 것'});

    // ② viewBox 밖으로 잘리는 텍스트
    var _vbm=svg.match(/viewBox\s*=\s*(?:"([^"]*)"|'([^']*)')/);
    var vb=_vbm?(_vbm[1]!=null?_vbm[1]:_vbm[2]):undefined;
    if(_qcOn('graph','GRP_TEXT_CLIP') && vb){
      var p=vb.trim().split(/[\s,]+/).map(parseFloat);
      if(p.length===4){ var top=p[1], bot=p[1]+p[3], left=p[0], right=p[0]+p[2], TOL=8;
        texts.forEach(function(t){ if(t.y==null||t.x==null||!String(t.s).trim()) return;
          var sp=xspan(t), why='';
          if(t.y>bot-1) why='아래로 '+Math.round(t.y-bot+1)+'px';
          else if(t.y-t.fs*0.8<top-1) why='위로';
          else if(sp[1]>right+TOL) why='오른쪽으로 '+Math.round(sp[1]-right)+'px';
          else if(sp[0]<left-TOL) why='왼쪽으로 '+Math.round(left-sp[0])+'px';
          if(why) v.push({id:id,kind:'block',field:'svg',idx:0,code:'GRP_TEXT_CLIP',msg:'텍스트가 viewBox 밖으로 '+why+' 벗어남: "'+String(t.s).slice(0,20)+'"'});
        });
      }
    }

    /* ③ [2026-08-08 · 규칙 개정] 색선은 **이름표를 달면** 된다.
       옛 규칙은 "본선은 무조건 검정"이었고, 같은 색 라벨 예외를 길이 120px 미만으로 잘라 두었다.
       그 길이 조건을 넣은 근거는 "안 그러면 색 실선 141개가 통째로 빠져나간다"는 **숫자**였지,
       그 141개가 실제로 결함이냐가 아니었다. 실측해 보니 141개 중 88개는 이미
       선 끝에 이름표가 붙어 있어 **색을 못 봐도 읽힌다**(중복 부호화 — 접근성에서 권장되는 방식이다).
       진짜 결함은 색이 유일한 단서인 53개다. 그래서 재는 것을 "색을 썼는가"에서
       **"색 말고 다른 단서가 있는가"** 로 바꾼다.
       판정: 굵고 긴 실선에 색이 있으면, 그 선의 **양 끝 중 한 곳 가까이에 이름표**가 있어야 한다.
       크리스: "색 4개면 적을수도 있어 색은 더 늘수도 있다" → 색 가짓수는 GRP_PALETTE 가 따로 본다. */
    var labelColors={}; texts.forEach(function(t){ if(t.fill && !isDark(t.fill)) labelColors[String(t.fill).toLowerCase()]=1; });
    /* 선 끝에 **이름표**가 붙어 있나. 캡션이 우연히 선 끝 가까이 있는 것과 갈라야 한다 —
       처음 짰을 때 "대체재 많고 지출비중 클수록 탄력적" 같은 설명문이 선 끝 5px 에 있다고
       이름표로 쳐줘서 12개가 헛통과했다.
       이름표로 인정하는 조건: ① 선과 같은 색이거나(코퍼스 관례 — 226/243)
       ② 검정 계열이면서 8자 이하(고정비·총수익 같은 짧은 이름). 문장은 어느 쪽도 아니다. */
    function _namedEnd(l, near){
      var maxLab=_qcN('graph','GRP_LINE_COLORED','darkLabelChars',8);
      return texts.some(function(t){
        if(t.x==null||t.y==null||!String(t.s).trim()) return false;
        var same = l.c && String(t.fill||'').toLowerCase()===String(l.c).toLowerCase();
        if(!(same || (isDark(t.fill) && String(t.s).trim().length<=maxLab))) return false;
        var sp=xspan(t), cx=(sp[0]+sp[1])/2, cy=t.y-t.fs*0.35;
        return Math.min(Math.hypot(cx-l.x1, cy-l.y1), Math.hypot(cx-l.x2, cy-l.y2)) <= near
            || Math.min(Math.hypot(sp[0]-l.x1, t.y-l.y1), Math.hypot(sp[0]-l.x2, t.y-l.y2)) <= near
            || Math.min(Math.hypot(sp[1]-l.x1, t.y-l.y1), Math.hypot(sp[1]-l.x2, t.y-l.y2)) <= near;
      });
    }
    /* [2026-08-09] 굵기 문턱 1.8 → 1.5.
       크리스가 "곡선 굵기 좀 얇게 해 다" 라고 해서 데이터 곡선을 전부 1.6 으로 내렸는데,
       이 규칙이 1.8 이상만 보고 있어 **색선 28건을 통째로 못 보게 됐다**(게이트가 눈을 감았다).
       축(1.5)은 색이 #94A3B8 이라 isDark 로 걸러지고, 화살대(1.1~1.4)와 짧은 선은 원래 빠진다. */
    if(_qcOn('graph','GRP_LINE_COLORED')) lines.forEach(function(l){
      if(l.dash || l.w<1.5 || l.arrow) return;
      if([l.x1,l.y1,l.x2,l.y2].some(function(n){ return n==null||isNaN(n); })) return;
      var len=Math.sqrt(Math.pow(l.x2-l.x1,2)+Math.pow(l.y2-l.y1,2));
      if(len<60) return;
      if(isDark(l.c)) return;
      if(_namedEnd(l, _qcN('graph','GRP_LINE_COLORED','endPx',30))) return;   /* 이름표가 있으면 통과 */
      v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_LINE_COLORED',msg:'색선(stroke='+l.c+', 길이 '+Math.round(len)+')에 이름표가 없음 — 색이 유일한 단서다. 선 끝에 그 선 이름을 같은 색으로 달 것'});
    });

    /* ③-2 [2026-08-08 신설] 팔레트 등록제.
       색 실선을 허용하기로 하면서(위 ③) 색이 제멋대로 굴러가는 것을 막는다. 실측하니
       빨강이 #C0392B·#DC2626 두 값, 초록이 다섯 값이었다 — 같은 역할에 미묘하게 다른 색.
       크리스: "색 4개면 적을수도 있어 색은 더 늘수도 있다" → 개수를 묶지 말고 **목록**으로 둔다.
       색을 늘릴 일이 생기면 _QC_PALETTE 에 한 줄 더한다(그때 한 번 의식적으로 고르게 된다). */
    if(_qcOn('graph','GRP_PALETTE')){
      var _pal=(typeof _QC_PALETTE!=='undefined')?_QC_PALETTE:null;
      if(_pal){
        /* 잡는 것은 **선 색과 글자 색**뿐이다. 영역 채움(연한 하늘·분홍 같은 tint)까지 묶으면
           음영 색이 다 걸린다 — 그건 GRP_COLOR_ORPHAN 이 "한 덩어리는 한 색"으로 따로 본다. */
        var seen={}, _hits=[];
        (svg.match(/stroke\s*=\s*"(#[0-9a-fA-F]{3,8})"/g)||[]).forEach(function(m){ _hits.push(m); });
        (svg.match(/<text[^>]*fill\s*=\s*"(#[0-9a-fA-F]{3,8})"/g)||[]).forEach(function(m){ _hits.push(m); });
        _hits.forEach(function(m){
          var c=(m.match(/#[0-9a-fA-F]{3,8}(?=")/)||m.match(/#[0-9a-fA-F]{3,8}/)||[])[0].toUpperCase();
          if(_pal.indexOf(c)>=0 || seen[c]) return; seen[c]=1;
          v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_PALETTE',msg:'팔레트 밖 색 '+c+' — 등록된 색만 쓸 것(파랑 #2563EB · 빨강 #C0392B · 초록 #059669 · 보라 #7C3AED · 노랑 #CA8A04 · 회색 계열). 새 색이 필요하면 qc-core 의 _QC_PALETTE 에 등록'});
        });
      }
    }

    /* ③-3 [2026-08-08 신설] 화살표끼리 겹치지 않게.
       크리스: "화살표 끼리도 겹치지 않게 해". 라이브 296개를 재 보니 실제 겹침은 **0건**이라
       고칠 것은 없었다 — 이건 앞으로 새로 그릴 때를 위한 문지기다.
       ⚠ 처음 짠 검출기는 "끝점 가까이 삼각형이 있으면 화살표"로 봤다가 축과
       그 옆을 지나는 예산선까지 화살표로 세어 헛지적 4건을 냈다.
       촉이 **그 선이 뻗은 방향**을 향할 때만 그 선의 촉으로 인정한다. */
    if(_qcOn('graph','GRP_ARROW_OVERLAP')){
      var _hd=[];
      /* [2026-08-09] 화살촉을 **속 채운 삼각형에서 열린 꺾쇠로** 바꾸면서(크리스: "안에 다 채우지
         말고 ---> 이렇게만") <polygon> 만 보던 이 검출기가 눈을 감게 됐다. 점 3개짜리
         <polyline> 도 같이 본다. 둘 다 "촉이 선이 뻗은 방향을 향하는가"로 걸러진다. */
      (svg.match(/<(?:polygon|polyline)[^>]*\/?>/g)||[]).forEach(function(t){
        var p=String(attr(t,'points')||'').trim().split(/\s+/).map(function(s){ return s.split(',').map(parseFloat); }).filter(function(q){ return q.length===2 && !isNaN(q[0]) && !isNaN(q[1]); });
        if(p.length!==3) return;
        var tip=0, best=-1;
        for(var i=0;i<3;i++){ var o=[0,1,2].filter(function(k){return k!==i;});
          var d=Math.sqrt(Math.pow(p[i][0]-(p[o[0]][0]+p[o[1]][0])/2,2)+Math.pow(p[i][1]-(p[o[0]][1]+p[o[1]][1])/2,2));
          if(d>best){ best=d; tip=i; } }
        var oo=[0,1,2].filter(function(k){return k!==tip;});
        var bx=(p[oo[0]][0]+p[oo[1]][0])/2, by=(p[oo[0]][1]+p[oo[1]][1])/2;
        _hd.push({bx:bx, by:by, dx:p[tip][0]-bx, dy:p[tip][1]-by});
      });
      var _claims=function(ex,ey,dx,dy){ return _hd.some(function(h){
        if(Math.sqrt(Math.pow(h.bx-ex,2)+Math.pow(h.by-ey,2))>6) return false;
        var a=Math.sqrt(dx*dx+dy*dy), b=Math.sqrt(h.dx*h.dx+h.dy*h.dy); if(!a||!b) return false;
        return (dx*h.dx+dy*h.dy)/(a*b) > 0.94; }); };
      var _ar=lines.filter(function(l){
        if([l.x1,l.y1,l.x2,l.y2].some(function(n){ return n==null||isNaN(n); })) return false;
        if(Math.sqrt(Math.pow(l.x2-l.x1,2)+Math.pow(l.y2-l.y1,2))<=4) return false;
        return l.arrow || _claims(l.x2,l.y2,l.x2-l.x1,l.y2-l.y1) || _claims(l.x1,l.y1,l.x1-l.x2,l.y1-l.y2); });
      var _p2s=function(px,py,l){ var dx=l.x2-l.x1, dy=l.y2-l.y1, L2=dx*dx+dy*dy;
        var t=L2?((px-l.x1)*dx+(py-l.y1)*dy)/L2:0; t=Math.max(0,Math.min(1,t));
        return Math.sqrt(Math.pow(px-(l.x1+t*dx),2)+Math.pow(py-(l.y1+t*dy),2)); };
      var _cross=function(a,b){ var s=function(px,py,qx,qy,rx,ry){ return (qx-px)*(ry-py)-(qy-py)*(rx-px); };
        var d1=s(a.x1,a.y1,a.x2,a.y2,b.x1,b.y1), d2=s(a.x1,a.y1,a.x2,a.y2,b.x2,b.y2),
            d3=s(b.x1,b.y1,b.x2,b.y2,a.x1,a.y1), d4=s(b.x1,b.y1,b.x2,b.y2,a.x2,a.y2);
        return ((d1>0)!==(d2>0)) && ((d3>0)!==(d4>0)); };
      var _tol=_qcN('graph','GRP_ARROW_OVERLAP','minPx',3);
      for(var ai=0; ai<_ar.length; ai++) for(var aj=ai+1; aj<_ar.length; aj++){
        var A=_ar[ai], B=_ar[aj];
        /* 한 점에서 갈라져 나가는 것은 정상 */
        var shared=[[A.x1,A.y1],[A.x2,A.y2]].some(function(p){ return [[B.x1,B.y1],[B.x2,B.y2]].some(function(q){
          return Math.sqrt(Math.pow(p[0]-q[0],2)+Math.pow(p[1]-q[1],2))<10; }); });
        /* [2026-08-09] **ㅜ 자로 얹힌 것도 정상.** 끝점끼리 맞닿는 경우만 빼 주고 있었는데,
           x축 왼끝이 y축 **중간에** 붙는 그래프(0선이 가로축인 순수출·공공재 등)가 그렇지 않다.
           축 끝 촉을 열린 꺾쇠로 바꾸자 게이트가 두 축을 화살표로 알아보면서 헛지적 4건이 났다.
           한쪽 끝이 다른 선 위에 얹혀 있으면(2px 안) 갈라져 나가는 것으로 본다. */
        if(!shared) shared=[[A.x1,A.y1],[A.x2,A.y2]].some(function(p){ return _p2s(p[0],p[1],B)<2; })
                         || [[B.x1,B.y1],[B.x2,B.y2]].some(function(q){ return _p2s(q[0],q[1],A)<2; });
        if(shared) continue;
        var gap=_cross(A,B)?0:Math.min(_p2s(A.x1,A.y1,B),_p2s(A.x2,A.y2,B),_p2s(B.x1,B.y1,A),_p2s(B.x2,B.y2,A));
        if(gap<_tol) v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_ARROW_OVERLAP',msg:'화살표끼리 '+(gap<0.5?'겹침':Math.round(gap)+'px까지 붙음')+' ('+Math.round(A.x1)+','+Math.round(A.y1)+')→('+Math.round(A.x2)+','+Math.round(A.y2)+') ↔ ('+Math.round(B.x1)+','+Math.round(B.y1)+')→('+Math.round(B.x2)+','+Math.round(B.y2)+') — 한쪽을 옮겨 3px 이상 띄울 것'});
      }
    }

    /* ④ 색 짝 없음 — 라벨 색이 선·점·영역 어디에도 안 쓰임.
       [2026-08-09] **전개도(flow)는 안 본다.** 이 규칙이 재려는 결함은 "색이 유일한 단서인데
       그 색을 가진 선·면이 없어 무엇을 가리키는지 못 읽는 것"이다. 전개도는 상자와 글자로만
       된 그림이라 색이 무언가를 가리키는 단서가 아니라 **강조 어법**이다 — "함정: 같은 구 =
       순위번호", "1953.7 · 휴전", "5년" 처럼 글자가 스스로 뜻을 다 말한다. 걸린 64건 중 42건이
       그런 것이었고, 상자·화살표가 전부 회색이라 애초에 짝을 만들어 줄 대상이 없었다.
       크리스: "345 다 그래프 아니잖아" (2026-08-09).
       그래프(chart)는 그대로 본다 — 파란 곡선 하나를 초록·빨강 두 이름표가 나눠 가리키던
       grp_las5_c5804584f 같은 것이 진짜 결함이고, 거기선 곡선을 잘라 색을 맞춰 주는 게 답이다. */
    if(_qcOn('graph','GRP_COLOR_ORPHAN') && !isFlow){
      var nonText=svg.replace(/<text[^>]*>[^<]*<\/text>/g,'');
      texts.forEach(function(t){
        if(!t.fill || isDark(t.fill)) return;
        if(nonText.indexOf(t.fill)<0)
          v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_COLOR_ORPHAN',msg:'"'+String(t.s).slice(0,14)+'" 글자색 '+t.fill+' 과 같은 색의 선·점·영역이 없음 — 한 덩어리는 한 색'});
      });
    }

    // ⑤ 라벨이 직선 위에 얹힘
    if(_qcOn('graph','GRP_LABEL_ON_LINE')) texts.forEach(function(t){
      if(t.x==null||t.y==null||!String(t.s).trim()) return;
      var _sp=xspan(t), x1=_sp[0], x2=_sp[1], yT=t.y-t.fs*0.8, yB=t.y+t.fs*0.15;
      /* [2026-08-06 정정] 처음엔 "라벨과 같은 색 선은 자기 지시선이니 예외"로 두었는데,
         그 예외가 화살표가 글자를 **관통**하는 경우까지 통과시켰다(η=1 라벨을 파란 화살표가 뚫음).
         지시선이 라벨 가장자리에 닿는 것은 정상이고 **상자 안을 가로지르는 것**이 결함이므로,
         색을 보지 말고 "글자 상자를 3px 넘게 파고드는가"로 판정한다.
         [2026-08-07 2차] 점선을 통째로 빼던 것을 **가로·세로 안내선만** 빼는 것으로 좁혔다.
         원래 뜻은 "축에서 점까지 긋는 좌표 안내선은 라벨 옆을 지나도 정상"이었는데,
         **점선으로 그린 이동 곡선**(수요1·공급1·AS′ 같은 것)까지 통째로 빠져나갔다.
         부동산시장의 균형 변화에서 점선이 라벨을 7.9px·15px 파고드는데 게이트는 0건이었다.
         안내선은 축과 나란하므로 dx 또는 dy 가 0에 가까운 것만 면제한다. */
      lines.forEach(function(l){
        if(l.dash){
          if([l.x1,l.y1,l.x2,l.y2].some(function(n){ return n==null||isNaN(n); })) return;
          if(Math.abs(l.x2-l.x1)<1 || Math.abs(l.y2-l.y1)<1) return;   /* 가로·세로 안내선 */
        }
        var seg=_qcSegInBox(l, x1, yT, x2, yB);
        if(seg>3)
          v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_LABEL_ON_LINE',msg:'"'+String(t.s).slice(0,14)+'" 라벨을 선이 '+Math.round(seg)+'px 파고듦 — 빈 자리로 옮기거나 화살표가 글자 밖에서 끝나게 할 것'});
      });
      curves.forEach(function(c){
        var seg=_qcPolyInBox(c.pts, x1, yT, x2, yB);
        if(seg>3)
          v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_LABEL_ON_LINE',msg:'"'+String(t.s).slice(0,14)+'" 라벨을 곡선이 '+Math.round(seg)+'px 파고듦 — 빈 자리로 옮기거나 화살표가 글자 밖에서 끝나게 할 것'});
      });
    });

    /* ⑤-2 [2026-08-09] 안내선이 한쪽 축으로만 감 — GRP_GUIDE_ONE_AXIS.
       크리스: "항상 선 연결되는 점선은 y x 축 다 표시해."
       점을 찍는 까닭은 그 좌표를 읽으라는 것인데 한쪽 축만 이으면 절반만 읽힌다.
       오탐을 없애려고 세 가지를 챙긴다 —
         ㉠ **칸마다 축을 따로 찾는다.** 다단 그래프는 아래에 예시 표 괘선이 있어서
            맨 아래 가로선을 x축으로 삼으면 엉뚱한 데까지 재게 된다.
            점보다 아래에 있는 **가장 가까운** 가로 실선, 왼쪽의 가장 가까운 세로 실선을 쓴다.
         ㉡ **데이터 선도 안내선 노릇을 한다.** 가로로 누운 기본임대료 선이 이미 세로축까지
            닿아 있으면 그 위에 점선을 또 그을 일이 아니다.
         ㉢ **토막이 이어 붙는 경우**를 본다. 데이터 선(45~205)과 안내선(205~210)이
            맞물려 축까지 가는 그림이 있다. 같은 줄의 토막을 합쳐 3px 넘는 틈이 없는지 잰다.
       안내선을 아예 안 쓴 점은 건드리지 않는다(그런 그림은 좌표를 읽히려는 뜻이 아니다). */
    if(_qcOn('graph','GRP_GUIDE_ONE_AXIS') && !_noAxis){
      var _gl=lines.filter(function(l){ return [l.x1,l.y1,l.x2,l.y2].every(function(n){ return n!=null&&!isNaN(n); }); });
      var _hz=_gl.filter(function(l){ return !l.dash && Math.abs(l.y1-l.y2)<1 && Math.abs(l.x2-l.x1)>120; });
      var _vt=_gl.filter(function(l){ return !l.dash && Math.abs(l.x1-l.x2)<1 && Math.abs(l.y2-l.y1)>80; });
      var _gd=_gl.filter(function(l){ return l.dash && l.w<=1.2; });
      var _da=_gl.filter(function(l){ return l.w>=1.5; });
      if(_hz.length && _vt.length && _gd.length){
        (svg.match(/<circle[^>]*\/?>/g)||[]).forEach(function(t){
          var cx=num(t,'cx'), cy=num(t,'cy');
          if(cx==null||cy==null||isNaN(cx)||isNaN(cy)) return;
          var ax=_hz.filter(function(l){ return l.y1>=cy-1 && Math.min(l.x1,l.x2)-2<=cx && cx<=Math.max(l.x1,l.x2)+2; })
                    .sort(function(a,b){ return a.y1-b.y1; })[0];
          var ay=_vt.filter(function(l){ return l.x1<=cx+1 && Math.min(l.y1,l.y2)-2<=cy && cy<=Math.max(l.y1,l.y2)+2; })
                    .sort(function(a,b){ return b.x1-a.x1; })[0];
          if(!ax||!ay) return;                                   /* 칸 밖의 점(범례 등) */
          function reach(vert){
            var segs=[];
            _gd.concat(_da).forEach(function(l){
              if(vert){ if(!(Math.abs(l.x1-l.x2)<1 && Math.abs(l.x1-cx)<3.5)) return;
                segs.push([Math.min(l.y1,l.y2), Math.max(l.y1,l.y2)]); }
              else { if(!(Math.abs(l.y1-l.y2)<1 && Math.abs(l.y1-cy)<3.5)) return;
                segs.push([Math.min(l.x1,l.x2), Math.max(l.x1,l.x2)]); }
            });
            if(!segs.length) return false;
            var from=vert?cy:ay.x1, to=vert?ax.y1:cx;
            var lo=Math.min(from,to), hi=Math.max(from,to), cur=lo;
            segs.sort(function(a,b){ return a[0]-b[0]; });
            for(var i=0;i<segs.length;i++){ if(segs[i][0]>cur+3) break; if(segs[i][1]>cur) cur=segs[i][1]; }
            return cur>=hi-3;
          }
          var any=false;
          _gd.forEach(function(l){
            if((Math.abs(l.y1-l.y2)<1 && Math.abs(l.y1-cy)<3.5 && Math.min(l.x1,l.x2)-2<=cx && cx<=Math.max(l.x1,l.x2)+2)
             ||(Math.abs(l.x1-l.x2)<1 && Math.abs(l.x1-cx)<3.5 && Math.min(l.y1,l.y2)-2<=cy && cy<=Math.max(l.y1,l.y2)+2)) any=true;
          });
          if(!any) return;
          var toX=reach(true), toY=reach(false);
          if(toX&&toY) return;
          v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_GUIDE_ONE_AXIS',
            msg:'점 ('+Math.round(cx)+','+Math.round(cy)+') 의 안내선이 '+(toY?'세로(x축)':'가로(y축)')+' 쪽만 없음 — 점을 찍었으면 두 축 다 이어 좌표를 읽게 할 것'});
        });
      }
    }

    /* ⑤-3 [2026-08-09] 점이 교점에서 어긋남 — GRP_DOT_OFF_CURVE.
       균형점을 눈대중으로 찍어 실제 교점에서 10~25px 벗어난 그림이 13개 있었다.
       그림이 제 말을 어길 뿐 아니라, 점 색 3단 규칙("교점은 검정")도 같이 어긋난다
       — 교점을 벗어난 점은 "곡선 하나 위"로 읽혀 엉뚱한 색이 입혀진다.
       판정: 곡선 두 개가 실제로 만나는 자리 12px 안에 있으면서, 정작 어느 곡선에도
       2.5px 안으로 붙어 있지 않은 점. 값이 싼 **직선끼리의 교차만** 본다
       (곡선 path 는 표본을 떠야 해서 게이트에서는 보류 — 그건 눈으로 본다). */
    if(_qcOn('graph','GRP_DOT_OFF_CURVE') && !_noAxis){
      var _dl=lines.filter(function(l){
        if(![l.x1,l.y1,l.x2,l.y2].every(function(n){ return n!=null&&!isNaN(n); })) return false;
        if(l.w<1.5) return false;
        return Math.abs(l.x2-l.x1)>=2 && Math.abs(l.y2-l.y1)>=2;      /* 기울어진 관계선만 */
      });
      if(_dl.length>=2){
        var _xs=[];
        for(var a=0;a<_dl.length;a++) for(var b=a+1;b<_dl.length;b++){
          var A=_dl[a], B=_dl[b];
          var d=(A.x2-A.x1)*(B.y2-B.y1)-(A.y2-A.y1)*(B.x2-B.x1);
          if(Math.abs(d)<1e-6) continue;
          var t=((B.x1-A.x1)*(B.y2-B.y1)-(B.y1-A.y1)*(B.x2-B.x1))/d;
          var u=((B.x1-A.x1)*(A.y2-A.y1)-(B.y1-A.y1)*(A.x2-A.x1))/d;
          if(t<0||t>1||u<0||u>1) continue;                            /* 그려진 구간 밖의 만남은 안 본다 */
          _xs.push([A.x1+t*(A.x2-A.x1), A.y1+t*(A.y2-A.y1)]);
        }
        if(_xs.length){
          function _distSeg(l,px,py){
            var dx=l.x2-l.x1, dy=l.y2-l.y1, L2=dx*dx+dy*dy; if(!L2) return 1e9;
            var q=((px-l.x1)*dx+(py-l.y1)*dy)/L2; q=Math.max(0,Math.min(1,q));
            return Math.sqrt(Math.pow(l.x1+q*dx-px,2)+Math.pow(l.y1+q*dy-py,2));
          }
          (svg.match(/<circle[^>]*\/?>/g)||[]).forEach(function(t){
            var cx=num(t,'cx'), cy=num(t,'cy');
            if(cx==null||cy==null||isNaN(cx)||isNaN(cy)) return;
            var on=_dl.filter(function(l){ return _distSeg(l,cx,cy)<2.5; }).length;
            if(on>=2) return;                                          /* 이미 교점 위 */
            var best=null, bd=1e9;
            _xs.forEach(function(z){ var dd=Math.sqrt(Math.pow(z[0]-cx,2)+Math.pow(z[1]-cy,2));
              if(dd<bd){ bd=dd; best=z; } });
            if(best==null || bd<2.5 || bd>12) return;
            v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_DOT_OFF_CURVE',
              msg:'점 ('+Math.round(cx)+','+Math.round(cy)+') 이 실제 교점 ('+Math.round(best[0])+','+Math.round(best[1])+') 에서 '+bd.toFixed(1)+'px 어긋남 — 교점으로 옮길 것(점 색도 따라 바뀐다)'});
          });
        }
      }
    }

    /* ⑤-4 [2026-08-09] 안내 점선이 데이터 선 위에 겹침 — GRP_GUIDE_OVER_LINE.
       가로·세로로 놓인 데이터 선(LRAS·LRPC·기본임대료 같은)이 이미 축까지 닿아 있으면
       그 선이 곧 안내선이다. 그 위에 회색 점선을 또 그으면 굵은 색선 위에 점선이 얹혀 보인다.
       내가 "안내선 두 축" 배치를 돌리다 21군데를 그렇게 만들었다. 겹치는 길이 10px 초과만 본다. */
    if(_qcOn('graph','GRP_GUIDE_OVER_LINE')){
      var _og=lines.filter(function(l){ return l.dash && l.w<=1.2 && [l.x1,l.y1,l.x2,l.y2].every(function(n){ return n!=null&&!isNaN(n); }); });
      var _od=lines.filter(function(l){ return !l.dash && l.w>=1.5 && [l.x1,l.y1,l.x2,l.y2].every(function(n){ return n!=null&&!isNaN(n); }); });
      _og.forEach(function(gd){
        var gHz=Math.abs(gd.y1-gd.y2)<1, gVt=Math.abs(gd.x1-gd.x2)<1;
        if(!gHz&&!gVt) return;
        _od.forEach(function(d){
          var ov=0;
          if(gHz && Math.abs(d.y1-d.y2)<1 && Math.abs(gd.y1-d.y1)<1.5)
            ov=Math.min(Math.max(gd.x1,gd.x2),Math.max(d.x1,d.x2))-Math.max(Math.min(gd.x1,gd.x2),Math.min(d.x1,d.x2));
          else if(gVt && Math.abs(d.x1-d.x2)<1 && Math.abs(gd.x1-d.x1)<1.5)
            ov=Math.min(Math.max(gd.y1,gd.y2),Math.max(d.y1,d.y2))-Math.max(Math.min(gd.y1,gd.y2),Math.min(d.y1,d.y2));
          if(ov>10)
            v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_GUIDE_OVER_LINE',
              msg:(gHz?'가로':'세로')+' 안내 점선이 데이터 선 위에 '+Math.round(ov)+'px 겹침 — 그 선이 이미 축까지 닿으면 점선은 지우고, 모자라는 토막만 남길 것'});
        });
      });
    }

    /* [2026-08-07] 글자끼리 겹침. 읽는 법을 축 아래에 붙이다가 원래 있던 설명 줄 위에 얹어
       두 문장이 포개진 적이 있다(grp_econ_indifference_curve). 선만 보던 게이트는 못 잡았다.
       [2026-08-07 2차] 임계를 가로 3px·세로 2px → **0** 으로 내렸다.
       세로 0.1px 만 겹쳐도 글자는 실제로 붙어 보이는데 그게 통과였다. 라이브 실측 25건 → 46건.
       ⚠ 이 임계는 **자동 수리기가 노리는 과녁**이기도 하다. 2px 로 두었더니 수리기가 딱 그 아래까지만
       밀고 멈춰 "게이트는 0인데 눈에는 붙어 있는" 것들이 생겼다(크리스가 4건을 찍어 냈다).
       고칠 때는 임계가 아니라 **여백**을 목표로 할 것 — 지금 데이터는 3px 여백 기준으로 맞춰 두었다. */
    if(_qcOn('graph','GRP_TEXT_OVERLAP')){
      var _toX=_qcN('graph','GRP_TEXT_OVERLAP','minX',0), _toY=_qcN('graph','GRP_TEXT_OVERLAP','minY',0);
      for(var ti=0; ti<texts.length; ti++){
        for(var tj=ti+1; tj<texts.length; tj++){
          var a=texts[ti], b=texts[tj];
          if(a.x==null||b.x==null||!String(a.s).trim()||!String(b.s).trim()) continue;
          var sa=xspan(a), sb=xspan(b);
          var ay1=a.y-a.fs*0.8, ay2=a.y+a.fs*0.15, by1=b.y-b.fs*0.8, by2=b.y+b.fs*0.15;
          var ox=Math.min(sa[1],sb[1])-Math.max(sa[0],sb[0]);
          var oy=Math.min(ay2,by2)-Math.max(ay1,by1);
          if(ox>_toX && oy>_toY)
            v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_TEXT_OVERLAP',msg:'글자끼리 겹침: "'+String(a.s).slice(0,14)+'" ↔ "'+String(b.s).slice(0,14)+'" (가로 '+Math.round(ox)+'px·세로 '+Math.round(oy)+'px)'});
        }
      }
    }

    // ⑥ 읽는 법이 축 폭을 못 채움(짧게 끊어 씀)
    if(_qcOn('graph','GRP_GUIDE_NARROW') && hasGuide && !_noAxis){
      var gi=-1; texts.forEach(function(t,i){ if(gi<0 && /^읽는\s*법$/.test(String(t.s).trim())) gi=i; });
      /* [2026-08-07] 패널이 여러 개인 그래프(가로축이 2~3개)는 **왼쪽 끝 축부터 오른쪽 끝 축까지**가
         쓸 수 있는 폭이다. 축 하나만 재면 3분의 1만 쓰고도 통과가 나온다(grp_econ_good_types_ic 에서 났다). */
      var xs=lines.filter(function(l){ return Math.abs(l.y2-l.y1)<1 && Math.abs(l.x2-l.x1)>50; });
      var axisW=260;
      if(xs.length){
        var lo=Math.min.apply(null, xs.map(function(l){ return Math.min(l.x1,l.x2); }));
        var hi=Math.max.apply(null, xs.map(function(l){ return Math.max(l.x1,l.x2); }));
        axisW=hi-lo;
      }
      /* [2026-08-08] 읽는 법 밑에 "예시" 블록을 붙이기 시작했다(grp_econ_giffen_effect 가 1호).
         한 덩어리로 재면 머리말 "예시" 두 글자가 축 폭을 못 채운다고 잡힌다.
         이 규칙이 재려는 것은 **접어 쓴 문장이 짧게 끊겼는가**이지 머리말 길이가 아니다.
         그래서 머리말에서 블록을 끊고, 블록마다 마지막 줄을 뺀 나머지를 잰다. */
      var _isHead=function(t){ return /^(읽는\s*법|예시)$/.test(String(t.s).trim()); };
      var body=texts.slice(gi+1).filter(function(t){ return String(t.s).trim(); });
      var _blocks=[[]];
      body.forEach(function(t){ if(_isHead(t)) _blocks.push([]); else _blocks[_blocks.length-1].push(t); });
      /* [2026-08-08] 예시 블록에 작은 표를 넣기 시작했다. 표의 칸은 원래 짧고, 칸마다 x 가 다르다.
         이 규칙이 잡으려는 것은 **왼쪽 여백에서 시작해 접어 내려쓴 산문 줄**이므로
         머리말과 같은 x 에서 시작하는 줄만 잰다. 칸은 들여쓴 자리에 있어 자연히 빠진다. */
      var _gx=texts[gi]?xspan(texts[gi])[0]:null;
      var _isProse=function(t){ return _gx==null || Math.abs(xspan(t)[0]-_gx)<=2; };
      var _ratio=_qcN('graph','GRP_GUIDE_NARROW','ratio',0.72), narrow=[];
      _blocks.forEach(function(bk){ var pr=bk.filter(_isProse);
        pr.slice(0,pr.length-1).forEach(function(t){
          if(tw(t.s,t.fs) < axisW*_ratio) narrow.push(t); }); });
      if(narrow.length)
        v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_GUIDE_NARROW',msg:'읽는 법·예시 '+narrow.length+'줄이 축 폭('+Math.round(axisW)+')을 못 채움 — 단어를 안 끊는 선에서 한 줄을 꽉 채워 줄 수를 줄일 것'});
    }

    /* ⑦ [2026-08-07 · flow 전용] 세로 흐름 화살표.
       크리스 지적: "동학 농민 운동의 전개, 밑으로 화살표가 중앙에 있으면 좋겠다. 고려의 대외 항쟁 이것처럼."
       기준본 grp_hist_goryeo_defense — 위 박스 아래변에서 아래 박스 위변으로, **두 박스 중심 x 의 평균**에
       맞춘 세로선 + 끝에 화살촉. 박스 폭이 다를 때 한쪽 중심에만 맞추면 어긋나 보여 평균으로 잡는다.
       화살촉은 marker-end 든 삼각형 path(기준본이 쓰는 방식)든 둘 다 인정한다 —
       한 쪽만 인정하면 기준본 자신이 위반으로 잡힌다. */
    if(isFlow && _qcOn('graph','GRP_FLOW_ARROW')){
      var _faTol=_qcN('graph','GRP_FLOW_ARROW','tolPx',3);
      /* 박스 — 바탕칠 rect(캔버스를 거의 다 덮는 것)는 뺀다 */
      var _vbp=vb?vb.trim().split(/[\s,]+/).map(parseFloat):null;
      var _vbW=(_vbp&&_vbp.length===4)?_vbp[2]:360, _vbH=(_vbp&&_vbp.length===4)?_vbp[3]:0;
      var boxes=[];
      (svg.match(/<rect[^>]*\/?>/g)||[]).forEach(function(t){
        var x=num(t,'x'), y=num(t,'y'), w=num(t,'width'), h=num(t,'height');
        if([x,y,w,h].some(function(n){ return n==null||isNaN(n); })) return;
        if(w>=_vbW*0.98 && _vbH && h>=_vbH*0.5) return;      /* 바탕칠 */
        boxes.push({x:x,y:y,w:w,h:h,cx:x+w/2,top:y,bot:y+h});
      });
      /* 세로 연결선 — <line> 과 <path d="M x y V y2"> 둘 다. 화살촉 삼각형 자신은 뺀다(fill 있고 Z 로 닫힘). */
      var conns=[];
      lines.forEach(function(l){
        if([l.x1,l.y1,l.x2,l.y2].some(function(n){ return n==null||isNaN(n); })) return;
        if(Math.abs(l.x2-l.x1)>1) return;
        var t0=Math.min(l.y1,l.y2), b0=Math.max(l.y1,l.y2);
        if(b0-t0<3 || b0-t0>90) return;
        conns.push({x:l.x1, top:t0, bot:b0, arrow:l.arrow});
      });
      (String(svg).replace(/<defs[\s\S]*?<\/defs>/gi,'').match(/<path[^>]*\/?>/g)||[]).forEach(function(t){
        var f=attr(t,'fill'); if(f && !/^none$/i.test(f)) return;      /* 칠한 것은 화살촉 삼각형 */
        var d=attr(t,'d')||''; var m=d.match(/^\s*M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*V\s*(-?[\d.]+)\s*$/i);
        if(!m) return;
        var x=parseFloat(m[1]), y1=parseFloat(m[2]), y2=parseFloat(m[3]);
        var t0=Math.min(y1,y2), b0=Math.max(y1,y2);
        if(b0-t0<3 || b0-t0>90) return;
        conns.push({x:x, top:t0, bot:b0, arrow:/marker-end/.test(t)});
      });
      /* 화살촉 — 작은 삼각형의 (중심x, 위·아래 y).
         ⚠ **표기가 세 가지다.** 기준본 grp_hist_goryeo_defense 는 <path d="… Z" fill>,
         감평·정비구역 그래프들은 <polygon points fill>, 그 밖에 marker-end 도 있다.
         path 만 보다가 polygon 화살촉 6건을 "화살촉 없음"으로 잘못 잡았다(2026-08-07 실측).
         게이트를 새로 만들 때 데이터가 한 표기만 쓴다고 가정하지 말 것 — 홑따옴표 때와 같은 실수다. */
      var heads=[], _faBody=String(svg).replace(/<defs[\s\S]*?<\/defs>/gi,'');
      function _faHead(xs,ys){
        if(xs.length<3) return;
        var xlo=Math.min.apply(null,xs), xhi=Math.max.apply(null,xs);
        var ylo=Math.min.apply(null,ys), yhi=Math.max.apply(null,ys);
        if(xhi-xlo>26 || yhi-ylo>26) return;                            /* 화살촉치고 너무 큼 */
        heads.push({cx:(xlo+xhi)/2, top:ylo, bot:yhi});
      }
      function _faPts(ns){ var xs=[], ys=[]; for(var i=0;i+1<ns.length;i+=2){ xs.push(ns[i]); ys.push(ns[i+1]); }
        _faHead(xs,ys); }
      /* [2026-08-09] 네 번째 표기가 늘었다 — **열린 꺾쇠**(fill=none + stroke).
         크리스: "화살표 생김새 안에 다 채우지 말고 ---> 이렇게만." 채운 것만 보다가
         전개도 6건을 "화살촉 없음"으로 잘못 잡았다. 채운 것과 열린 것을 다 본다. */
      (_faBody.match(/<path[^>]*\/?>/g)||[]).forEach(function(t){
        var f=attr(t,'fill'), open=(!f || /^none$/i.test(f));
        if(open && !attr(t,'stroke')) return;
        var d=attr(t,'d')||'';
        if(!open && !/z\s*$/i.test(d)) return;                          /* 채운 것은 닫혀 있어야 촉 */
        var ns=(d.match(/-?[\d.]+/g)||[]).map(parseFloat); if(ns.length<6) return;
        _faPts(ns);
      });
      (_faBody.match(/<(?:polygon|polyline)[^>]*\/?>/g)||[]).forEach(function(t){
        var f=attr(t,'fill'), open=(!f || /^none$/i.test(f));
        if(open && !attr(t,'stroke')) return;
        var ns=(String(attr(t,'points')||'').match(/-?[\d.]+/g)||[]).map(parseFloat); if(ns.length<6) return;
        _faPts(ns);
      });
      /* 연결선마다 위·아래 박스를 붙인다 */
      /* 위·아래 박스는 **세로로 맞닿고 가로로도 그 박스 안**이어야 짝이다.
         y 만 보면 엉뚱하게 물린다 — 붕당의 분화(grp_hist_joseon_factions)는 부모 '사림'이 x 130~230 인데
         세로선은 x 110·250 이라 박스 밖이다. 거기 화살표를 다는 건 허공에 그리는 것이고,
         그 그림의 진짜 연결은 대각선이다(세로선은 다른 배치의 잔재). */
      conns.forEach(function(c){
        var above=null, below=null;
        boxes.forEach(function(b){
          if(!(c.x>=b.x-2 && c.x<=b.x+b.w+2)) return;
          if(Math.abs(b.bot-c.top)<=14 && (above==null||Math.abs(b.bot-c.top)<Math.abs(above.bot-c.top))) above=b;
          if(b.top-c.bot>=-4 && b.top-c.bot<=18 && (below==null||(b.top-c.bot)<(below.top-c.bot))) below=b;
        });
        c.above=above; c.below=below;
      });
      /* 갈래(한 박스가 둘로 갈라지거나 둘이 하나로 모이는 것)는 **중심 정렬을 안 본다.**
         붕당의 분화(grp_hist_joseon_factions)처럼 옆 가지로 뻗는 화살표는 중앙에서 벗어나는 게 맞다.
         화살촉은 갈래에도 그대로 요구한다. */
      function _faCnt(pick){ var m={}; conns.forEach(function(c){ var b=pick(c); if(!b) return;
        var k=b.x+'/'+b.y; m[k]=(m[k]||0)+1; }); return m; }
      var _faOut=_faCnt(function(c){ return c.above; }), _faIn=_faCnt(function(c){ return c.below; });
      conns.forEach(function(c){
        if(!c.above||!c.below) return;                                  /* 박스 사이 연결선이 아니면 판정 안 함 */
        var branch=(_faOut[c.above.x+'/'+c.above.y]>1) || (_faIn[c.below.x+'/'+c.below.y]>1);
        if(!branch){
          var want=(c.above.cx+c.below.cx)/2, off=Math.abs(c.x-want);
          if(off>_faTol)
            v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_FLOW_ARROW',msg:'세로 흐름 화살표 x='+Math.round(c.x*10)/10+' 가 두 박스 중심 평균('+Math.round(want*10)/10+')에서 '+Math.round(off*10)/10+'px 어긋남 — 허용 '+_faTol+'px'});
        }
        var hasHead=c.arrow || heads.some(function(h){ return Math.abs(h.cx-c.x)<=6 && h.bot>=c.bot-6 && h.top<=c.bot+12; });
        if(!hasHead)
          v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_FLOW_ARROW',msg:'세로 흐름 연결선(y '+Math.round(c.top)+'→'+Math.round(c.bot)+')에 화살촉이 없음 — 끝에 ">" 삼각형(marker-end 또는 삼각형 path)을 붙일 것'});
      });
    }

    /* ⑧ [2026-08-07 · layout:"vstack" 전용] 박스 안 글자는 가운데.
       크리스: "네모박스안에 텍스트는 중앙정열해야지" + "단순 시간흐름 전개도 세로형태는 다 가운데 정렬로
       가고 나머지 애들은 좌측 정렬 그대로." 그래서 **vstack 에만** 건다 —
       'table'(왼쪽 이름 / 오른쪽 설명)에 걸면 두 칸을 한 점으로 몰아 글자가 포개진다.
       ⚠ 문서 단위로 재지 말고 **박스 하나씩** 볼 것. 2단 문서 안에 섞인 1단 박스를 놓친 적이 있다. */
    if(isFlow && _lay==='vstack' && _qcOn('graph','GRP_FLOW_ALIGN')){
      var _vbA=vb?vb.trim().split(/[\s,]+/).map(parseFloat):null;
      var _awW=(_vbA&&_vbA.length===4)?_vbA[2]:360, _awH=(_vbA&&_vbA.length===4)?_vbA[3]:0;
      var abox=[];
      (svg.match(/<rect[^>]*\/?>/g)||[]).forEach(function(t){
        var x=num(t,'x'), y=num(t,'y'), w=num(t,'width'), h=num(t,'height');
        if([x,y,w,h].some(function(n){ return n==null||isNaN(n); })) return;
        if(w>=_awW*0.98 && _awH && h>=_awH*0.5) return;
        abox.push({x:x,y:y,w:w,bot:y+h,cx:x+w/2});
      });
      var atag=svg.match(/<text[^>]*>/g)||[], off=[];
      abox.forEach(function(b){
        var mine=[];
        atag.forEach(function(t){ var x=num(t,'x'), y=num(t,'y'); if(x==null||y==null) return;
          if(x>=b.x && x<=b.x+b.w && y>b.y && y<=b.bot+2) mine.push({t:t,x:x}); });
        var xs={}; mine.forEach(function(m){ xs[m.x]=1; });
        if(Object.keys(xs).length>=2) return;                 /* 이 박스만 2단 — 건너뛴다 */
        mine.forEach(function(m){
          var an=attr(m.t,'text-anchor');
          if(an!=='middle' || Math.abs(m.x-b.cx)>0.5) off.push((m.t.match(/>?$/)?'':'')+Math.round(m.x));
        });
      });
      if(off.length)
        v.push({id:id,kind:'warn',field:'svg',idx:0,code:'GRP_FLOW_ALIGN',msg:'세로 전개도(layout:"vstack") 박스 안 글자 '+off.length+'개가 가운데가 아님 — x를 박스 중심으로, text-anchor="middle"로. (표처럼 2단인 박스는 이 규칙에서 빠진다)'});
    }
  }

  // ---- 암기(mnemonic) 마스터 검수 ----
  function _qcMnemAudit(arr){ var v=[],seen={};
    _qcAsArr(arr).forEach(function(mn){ if(!mn) return; var id=(mn.id!=null)?String(mn.id):'?';
      if(_qcDupChk(seen,id,'mnem','MN_DUP','암기',v)) return; _qcRecDate(mn,id,v);
      var code=String(mn.code||''), desc=String(mn.desc||''), cRed=_qcRedLetters(code), dRed=_qcRedLetters(desc);
      if(_qcOn('mnem','MN_DESC_EMPTY') && !desc.trim()) v.push({id:id,kind:'block',field:'desc',idx:0,code:'MN_DESC_EMPTY',msg:'desc(뜻풀이) 비어 있음'});
      if(_qcOn('mnem','MN_NO_K') && !cRed) v.push({id:id,kind:'warn',field:'code',idx:0,code:'MN_NO_K',msg:'code에 빨강 두문자(<span class="k">) 없음'});
      if(_qcOn('mnem','MN_DESC_NO_RED') && desc.trim() && !dRed) v.push({id:id,kind:'warn',field:'desc',idx:0,code:'MN_DESC_NO_RED',msg:'desc에 대응 빨강 글자(<span class="k">) 없음'});
      if(_qcOn('mnem','MN_DESC_REDUP') && cRed && dRed && cRed.length!==dRed.length) v.push({id:id,kind:'warn',field:'desc',idx:0,code:'MN_DESC_REDUP',msg:'code 빨강 글자('+cRed.length+')와 desc 빨강 글자('+dRed.length+') 수 불일치 — 전수 일치 필요'});
      if(_qcOn('mnem','MN_LETTER_UNEXPLAINED') && cRed && dRed){
        var _mlHan=/[\uac00-\ud7a3]/, _mlCs=[], _mlDs=String(dRed).split('').filter(function(ch){ return _mlHan.test(ch); });
        String(cRed).split('').forEach(function(ch){ if(_mlHan.test(ch) && _mlCs.indexOf(ch)<0) _mlCs.push(ch); });
        var _mlMiss=_mlCs.filter(function(ch){ return _mlDs.indexOf(ch)<0; });
        if(_mlCs.length && _mlDs.length && _mlMiss.length) v.push({id:id,kind:'warn',field:'desc',idx:0,code:'MN_LETTER_UNEXPLAINED',
          msg:'code 빨강 글자 ['+_mlMiss.join('')+']가 desc에서 풀이되지 않음 \u2014 글자마다 무엇의 머리글자인지 desc에 빨강으로 대응시켜라'});
      }
      if(_qcOn('mnem','MN_QSPECIFIC_TRAP')){
        var _tp=(code+' '+desc).replace(/<[^>]+>/g,'');
        var _tm=_tp.match(/(\(함정\)|함정이다|함정으로)/);
        if(_tm) v.push({id:id,kind:'warn',field:'desc',idx:0,code:'MN_QSPECIFIC_TRAP',
          msg:'암기코드에 문제특화 함정 서술(\u0022'+_tm[1]+'\u0022) \u2014 암기코드는 여러 문항이 공유하는 전역 마스터라 특정 문항의 함정은 그 문항 해설(exp.o/tip)로 옮겨라'});
      }
      if(_qcOn('mnem','MN_SLASH') && /\//.test(code.replace(/<[^>]+>/g,''))) v.push({id:id,kind:'warn',field:'code',idx:0,code:'MN_SLASH',msg:'code 구분자에 / 사용 — 가운뎃점(·)으로'});
      if(_qcOn('mnem','MN_SYMBOL') && /[∞≥≤±√∑≠÷×²³½¼¾µΩ]/.test(code.replace(/<[^>]+>/g,''))) v.push({id:id,kind:'warn',field:'code',idx:0,code:'MN_SYMBOL',msg:'code에 소리내어 못 읽는 기호(∞·≥·²·√ 등) — 읽히는 두문자·말로 풀어라(예: ∞→"수평/완전탄력")'});
      if(_qcOn('mnem','MN_DESC_SHORT')){ var _dL=desc.replace(/<[^>]+>/g,'').trim().length; if(desc.trim() && _dL<_qcN('mnem','MN_DESC_SHORT','minChars',25)) v.push({id:id,kind:'warn',field:'desc',idx:0,code:'MN_DESC_SHORT',msg:'desc '+_dL+'자로 짧음 — 무엇에 대한 암기인지 맥락 한 문장 필요'}); }
      /* [2026-08-05] 화면에는 code 와 desc 만 나온다(name 은 안 보인다).
         그래서 desc 가 "무엇에 대한 암기인지"를 스스로 밝히지 않으면 학습자는 뭘 외우는지 모른다.
         예) code '단·기·전·사·애' + desc '단순구조, 기계적 관료제, … 5가지이며 매트릭스는 아니다.'
             → 민츠버그의 '조직구조' 라는 말이 어디에도 없다. */
      var _mdPlain=desc.replace(/<[^>]+>/g,'').trim();
      if(_mdPlain){
        // ① 서술어 없이 항목만 나열
        if(_qcOn('mnem','MN_DESC_LIST_ONLY')){
          var _mdPred=/(다|요)[.!?]?$/.test(_mdPlain) || /(한다|이다|된다|본다|따른다|말한다|나눈다|뜻한다|의미한다)/.test(_mdPlain);
          if(!_mdPred) v.push({id:id,kind:'warn',field:'desc',idx:0,code:'MN_DESC_LIST_ONLY',
            msg:'desc가 서술어 없이 항목 나열로만 끝남 — 무엇을 무엇으로 나눈 것인지 한 문장으로 밝힐 것'});
        }
        // ② name 의 주제어가 desc 에 없음(조사 영향을 없애려고 3자 이상 n-gram 으로 대조)
        if(_qcOn('mnem','MN_DESC_NO_TOPIC')){
          /* 데이터는 숫자·영문을 전각(２０·ＡＩＤＡ)으로 쓰는 관례가 있어 반각으로 맞춘 뒤 대조한다. */
          var _mdHw=function(s){ return String(s).replace(/[！-～]/g, function(c){ return String.fromCharCode(c.charCodeAt(0)-0xFEE0); }); };
          var _mdNm=_mdHw(String(mn.name||'').replace(/<[^>]+>/g,'').replace(/\([^)]*\)/g,'')).replace(/[^가-힣A-Za-z0-9]/g,'');
          var _mdDz=_mdHw(_mdPlain).replace(/[^가-힣A-Za-z0-9]/g,''), _mdHit=false;
          for(var _L=Math.min(4,_mdNm.length); _L>=3 && !_mdHit; _L--)
            for(var _i=0; _i+_L<=_mdNm.length; _i++) if(_mdDz.indexOf(_mdNm.slice(_i,_i+_L))>=0){ _mdHit=true; break; }
          if(_mdNm.length>=3 && !_mdHit) v.push({id:id,kind:'warn',field:'desc',idx:0,code:'MN_DESC_NO_TOPIC',
            msg:'desc에 주제("'+String(mn.name||'').replace(/\([^)]*\)/g,'').trim()+'")가 나오지 않음 — 화면에는 name이 안 보이므로 desc 첫 문장이 주제를 말해야 한다'});
        }
      }
      if(/—/.test(code+desc)) v.push({id:id,kind:'block',field:'desc',idx:0,code:'EMDASH',msg:'code/desc에 em대시(—) 금지'});
    }); _qcApplySev(v); return v; }

  // ---- 표(table) 마스터 검수 ----
  function _qcTableAudit(arr){ var v=[],seen={};
    _qcAsArr(arr).forEach(function(t){ if(!t) return; var id=(t.id!=null)?String(t.id):'?';
      if(_qcDupChk(seen,id,'table','TBL_DUP','표',v)) return; _qcRecDate(t,id,v);
      var H=Array.isArray(t.headers)?t.headers:[], R=Array.isArray(t.rows)?t.rows:[];
      if(_qcOn('table','TBL_NO_HEADERS') && !H.length) v.push({id:id,kind:'block',field:'headers',idx:0,code:'TBL_NO_HEADERS',msg:'headers 없음'});
      if(_qcOn('table','TBL_NO_ROWS') && !R.length) v.push({id:id,kind:'block',field:'rows',idx:0,code:'TBL_NO_ROWS',msg:'rows 없음'});
      if(_qcOn('table','TBL_RAGGED') && H.length){ for(var i=0;i<R.length;i++){ if(Array.isArray(R[i]) && R[i].length!==H.length){ v.push({id:id,kind:'block',field:'rows',idx:i,code:'TBL_RAGGED',msg:'행 '+(i+1)+' 열 수('+R[i].length+') ≠ 헤더 열 수('+H.length+')'}); break; } } }
      if(_qcOn('table','TBL_NO_CAPTION') && !(t.caption_chant&&String(t.caption_chant).trim())) v.push({id:id,kind:'warn',field:'caption_chant',idx:0,code:'TBL_NO_CAPTION',msg:'caption_chant(한 줄 요약) 없음'});
      var cells=H.concat.apply(H, R.map(function(r){return Array.isArray(r)?r:[r];})).map(String).join(' ');
      if(_qcOn('table','TBL_HTML_NO_TYPE') && /<span class="k"|<sup|<sub|<br/i.test(cells) && String(t.type||'')!=='html') v.push({id:id,kind:'warn',field:'type',idx:0,code:'TBL_HTML_NO_TYPE',msg:'셀에 태그(<span class="k">/<sup>/<br>)가 있는데 type:"html" 아님 — 태그가 그대로 노출됨'});
      if(/—/.test(cells+String(t.caption_chant||''))) v.push({id:id,kind:'block',field:'rows',idx:0,code:'EMDASH',msg:'표 셀/캡션에 em대시(—) 금지'});
    }); _qcApplySev(v); return v; }

  // ---- 개념(concept) 마스터 검수 ----
  function _qcConceptAudit(arr){ var v=[],seen={};
    _qcAsArr(arr).forEach(function(c){ if(!c) return; var id=(c.id!=null)?String(c.id):'?';
      if(_qcDupChk(seen,id,'concept','CPT_DUP','개념',v)) return; _qcRecDate(c,id,v);
      var cards=Array.isArray(c.cards)?c.cards:[];
      if(_qcOn('concept','CPT_NO_CARDS') && !cards.length) v.push({id:id,kind:'block',field:'cards',idx:0,code:'CPT_NO_CARDS',msg:'cards 없음(개념카드 0개)'});
      cards.forEach(function(cd,j){ if(!cd) return; var d=String(cd.d||''), cx=String(cd.cx||''), t=String(cd.t||'');
        if(_qcOn('concept','CD_OLD_FIELD')) Object.keys(cd).forEach(function(k){ if(k!=='t'&&k!=='d'&&k!=='cx') v.push({id:id,kind:'warn',field:'card',idx:j,code:'CD_OLD_FIELD',msg:'카드 '+(j+1)+'에 t·d·cx 외 필드("'+k+'") — 3필드만 허용'}); });
        if(_qcOn('concept','CD_NO_D') && !d.trim()) v.push({id:id,kind:'block',field:'card',idx:j,code:'CD_NO_D',msg:'카드 '+(j+1)+' 정의(d) 비어 있음'});
        if(_qcOn('concept','D_SHORT') && d.trim()){ var _dL=d.replace(/<[^>]+>/g,'').trim().length; var _dMin=_qcN('concept','D_SHORT','minChars',60); if(_dL<_dMin) v.push({id:id,kind:'warn',field:'card',idx:j,code:'D_SHORT',msg:'카드 '+(j+1)+' 정의(d) '+_dL+'자(<'+_dMin+'자)로 얇음 — 무엇인지·범위/의미·계산까지 쉽게 풀어쓰기'}); }
        if(_qcOn('concept','CX_EMPTY') && !cx.trim()) v.push({id:id,kind:'warn',field:'card',idx:j,code:'CX_EMPTY',msg:'카드 '+(j+1)+' 예시(cx) 비어 있음'});
        if(cx.trim()){
          if(_qcOn('concept','CX_ECHO_D') && d && _qgSim(d,cx)>=_qcN('concept','CX_ECHO_D','minSim',0.5)) v.push({id:id,kind:'warn',field:'card',idx:j,code:'CX_ECHO_D',msg:'카드 '+(j+1)+' 예시(cx)가 정의(d) 되풀이 — 다른 장면·수치로'});
          if(_qcOn('concept','CX_SHORT')){ var L=cx.replace(/<[^>]+>/g,'').trim().length; if(L<_qcN('concept','CX_SHORT','minChars',60)) v.push({id:id,kind:'warn',field:'card',idx:j,code:'CX_SHORT',msg:'카드 '+(j+1)+' 예시(cx) '+L+'자로 짧음'}); }
          if(_qcOn('concept','CX_NONAME') && _qgAction.test(cx) && !_qgNamed(cx)) v.push({id:id,kind:'warn',field:'card',idx:j,code:'CX_NONAME',msg:'카드 '+(j+1)+' 예시(cx)가 장면인데 명명 인물(甲乙…) 없음'});
        }
        if(_qcOn('concept','CX_DEICTIC') && (/^(이|그|위|해당)\s/.test(d.trim())||/^(이|그|위|해당)\s/.test(cx.trim()))) v.push({id:id,kind:'warn',field:'card',idx:j,code:'CX_DEICTIC',msg:'카드 '+(j+1)+' 정의/예시가 지시어(이/그/위/해당)로 시작'});
        if(_qcOn('concept','CD_D_NAMED') && /[甲乙丙丁戊]/.test(d)) v.push({id:id,kind:'warn',field:'card',idx:j,code:'CD_D_NAMED',msg:'카드 '+(j+1)+' 정의(d)에 명명 인물(甲乙) — 정의는 일반 서술, 인물은 예시(cx)에'});
        if(/—/.test(t+d+cx)) v.push({id:id,kind:'block',field:'card',idx:j,code:'EMDASH',msg:'카드 '+(j+1)+'에 em대시(—) 금지'});
      });
    }); _qcApplySev(v); return v; }

  // ---- 인터랙티브(interactive) 마스터 검수 ----
  function _qcInteractiveAudit(arr){ var v=[],seen={};
    _qcAsArr(arr).forEach(function(it){ if(!it) return; var id=(it.id!=null)?String(it.id):'?';
      if(_qcDupChk(seen,id,'interactive','ITV_DUP','인터랙티브',v)) return; _qcRecDate(it,id,v);
      if(_qcOn('interactive','ITV_UNKNOWN') && !String(it.template||'').trim()) v.push({id:id,kind:'warn',field:'template',idx:0,code:'ITV_UNKNOWN',msg:'template 비어 있음/미지정'});
      var p=it.params, empty=(p==null)||(Array.isArray(p)?!p.length:(typeof p==='object'?!Object.keys(p).length:!String(p).trim()));
      if(_qcOn('interactive','ITV_NO_PARAMS') && empty) v.push({id:id,kind:'block',field:'params',idx:0,code:'ITV_NO_PARAMS',msg:'params 비어 있음'});
    }); _qcApplySev(v); return v; }

  // ---- 종류→검수함수 디스패처 ----
  var _qcMasterAuditFns={ graph:_qcGraphAudit, mnem:_qcMnemAudit, mnemonic:_qcMnemAudit, table:_qcTableAudit, concept:_qcConceptAudit, cpt:_qcConceptAudit, interactive:_qcInteractiveAudit, itv:_qcInteractiveAudit };
  function _qcMasterRecordAudit(kind, arr){ var f=_qcMasterAuditFns[String(kind||'').toLowerCase()]; return f?f(arr):[]; }

  // ⚠ node(서버)엔 window 가 없다. 감싸지 않으면 여기서 튕기고 바깥 catch 가 삼켜
  //    바로 아랫줄 module.exports 가 영영 안 돌아간다(마스터 검수 함수가 undefined → 지적 0건으로 조용히 통과).
  if(typeof window!=='undefined') window.QC = {
    violations:_qcViolations, gate:qualityGate, masterLink:_qcMasterLink, bundle:_qcBundle,
    levelup:_qcLevelup, applySev:_qcApplySev, sevOf:_qcSevOf, sevMeta:_QC_SEV_META,
    refs:_qcRefs, recordDate:_qcRecordDate, defaults:_QC_DEFAULTS,
    conceptSignals:_qcConceptSignals, CS:{grp:_CS_GRP, tbl:_CS_TBL, mn:_CS_MN, itv:_CS_ITV},
    visualSignals:_qcVisualSignals, VIS:{q:_VIS_Q, imgQ:_IMG_Q, imgArt:_IMG_ART, imgEx:_IMG_EX},
    masterAudit:_qcMasterAudit, mlaRefs:_qcMlaRefs, cleanRef:_qcMlaClean,
    graphAudit:_qcGraphAudit, mnemAudit:_qcMnemAudit, tableAudit:_qcTableAudit,
    conceptAudit:_qcConceptAudit, interactiveAudit:_qcInteractiveAudit, masterRecordAudit:_qcMasterRecordAudit
  };
  if(typeof module!=='undefined'&&module.exports){ module.exports.graphAudit=_qcGraphAudit; module.exports.mnemAudit=_qcMnemAudit; module.exports.tableAudit=_qcTableAudit; module.exports.conceptAudit=_qcConceptAudit; module.exports.interactiveAudit=_qcInteractiveAudit; module.exports.masterRecordAudit=_qcMasterRecordAudit; }
// 조용히 물러서면 검수가 소리 없이 사라진다(판 19·20 교훈) — 삼키더라도 흔적은 남긴다
}catch(e){ try{ console.warn('[qc-core] 마스터 검수 블록 초기화 실패 — 검수 함수가 안 실릴 수 있음:', e && e.message); }catch(_){} }
