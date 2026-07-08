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
var _qgAction=/샀|팔았|팔아|팔|빌려|빌린|맡겨|맡긴|(?<!고)점유(?!율)|배상|청구|지급|처분|넘겨|넘긴|속여|속아|건네|매도|매수|양도|증여|담보|대여|변제|등기|(?<!짝|리\s?)지어|사들|잡아|되찾|취소|해지|(?<!일)반환|인도/;
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
  var lines=String(t||'').replace(/<br\s*\/?>/gi,'\n').split(/\n/);
  for(var li=0; li<lines.length; li++){
    var L=lines[li]; if(!L.trim()) continue;
    var mk=(L.match(/[\u2460-\u2473](?![\ubc88\uc21c\uc9f8])/g)||[]); var u={}; mk.forEach(function(m){u[m]=1;});
    if(Object.keys(u).length>=2) return L.trim();
    if(/(^|\s)1\.\s/.test(L) && /\s2\.\s/.test(L)) return L.trim();
  }
  return null;
}

/* ---- [추출] _isCalcQ · _qcViolations · qualityGate (admin__20 4263-4374) ---- */
// 엔진 _isCalcQ 이식 — 계산형 = oFilled 1칸 & (그래프 or 풀이단계). 단순 oFilled===1 아님(COMBO 결론 오인 방지)
function _isCalcQ(q){ if(!q) return false; if(typeof q.id==='string'&&q.id.indexOf('calc:')===0) return true;
  var o=(q.exp&&q.exp.o)||[]; var oF=o.filter(function(x){return x&&String(x).trim();}).length; if(oF!==1) return false;
  var hg=q.exp&&q.exp.graph&&String(q.exp.graph).trim(); var ex=(q.exp&&q.exp.ex)||[]; var hs=ex.filter(function(x){return x&&String(x).trim();}).length>0;
  return !!(hg||hs); }
function _qcViolations(q){
  var v=[], exp=(q&&q.exp)||{}, o=exp.o||[], ex=exp.ex||[], cards=exp.c||[];
  // exp.cpt(마스터 링크) 카드: 개수(CARD_LT2)·화살표(REL_NO_ARROW) 판정에만 반영.
  // 카드 내용검사(CX_EMPTY 등)는 인라인 exp.c 전용 — 마스터 카드 품질은 masterLinkAudit 소관.
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
  var isCalc=oFilled===1;
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
    o.forEach(function(t,i){ if(t&&String(t).trim()&&!_qgVerdict(t)) v.push({kind:'block',field:'o',idx:i,code:'VERDICT',msg:'\uc885\uacb0\uc5b4 \uc5c6\uc74c(\uc633\ub2e4/\uc633\uc9c0 \uc54a\ub2e4\ub85c \uc548 \ub9ba\uc74c \u2192 O/X \ubc30\uc9c0 \ub204\ub77d)',text:t}); });
  }
  if(cards.length){ cards.forEach(function(c,j){ if(!(c&&c.cx&&String(c.cx).trim())) v.push({kind:'block',field:'card',idx:j,code:'CX_EMPTY',msg:'\uac1c\ub150\uce74\ub4dc '+(j+1)+' cx(\uc608\uc2dc) \ube48\uce78',text:(c&&c.t)||''}); }); }
  var _cTot=cards.length+_lk.length; if(isMCQ && !isCalc && !_cptSkip && _cTot && _cTot<2) v.push({kind:(cards.length?'block':'warn'),field:'card',idx:0,code:'CARD_LT2',msg:'\uac1c\ub150\uce74\ub4dc '+_cTot+'\uc7a5(<2, \ub9c1\ud06c \ud3ec\ud568)'+(cards.length?'':' \u2192 \ub9c1\ud06c\ub41c \uac1c\ub150\uc5d0 \uce74\ub4dc \ubcf4\uac15'),text:''});
  if(_qcOn('gichul','O_PLACEHOLDER')){ var _PLACE=/\ud574\uc124\s*\ucd94\uac00|\uc218\uc815\s*\uc608\uc815|\uc791\uc131\s*\uc608\uc815|\ucd94\uac00\s*\uc608\uc815|\ubbf8\uc791\uc131|\ucc44\uc6b8\s*\uc608\uc815|\uc900\ube44\s*\uc911|TODO/; o.forEach(function(t,i){ if(_PLACE.test(String(t||''))) v.push({kind:'block',field:'o',idx:i,code:'O_PLACEHOLDER',msg:'\ud574\uc124(o)\uc5d0 \uc784\uc2dc \ubb38\uad6c \u2014 \ube48 \uce78\uc740 \ubc18\ub4dc\uc2dc \ube48 \ubb38\uc790\uc5f4("")\ub85c(\uc784\uc2dc\ubb38\uad6c\ub294 oFilled\ub85c \uc624\uacc4\uc0b0\ub418\uc5b4 \uc9c4\uc220\uc218 \uc5b4\uae4b\ub0a8)',text:t}); }); }
  if(_qcOn('gichul','O_INCOMPLETE') && isMCQ && !isCalc && opts.length>=4){ var _mk=opts.some(function(op){return /^[\u3131-\u314e][\s,:\-]/.test(String(op).trim());}); if(!_mk){ var _emp=o.slice(0,opts.length).filter(function(x){return !(x&&String(x).trim());}).length; if(_emp>0) v.push({kind:'warn',field:'o',idx:0,code:'O_INCOMPLETE',msg:'\ubcf4\uae30 '+opts.length+'\uc9c0\uc778\ub370 \ud574\uc124(o) '+_emp+'\uce78 \ube44\uc5b4\uc788\uc74c \u2014 SC\ub294 \ubcf4\uae30 \uc804\ubd80 \ucc44\uc6c0(\uc815\uc758\ud655\uc778 \ubcf4\uae30\ub9cc \uc0dd\ub7b5)',text:''}); } }
  if(_qcOn('gichul','CALC_WRONG_SLOT') && _isCalcQ(q) && q.ans && !Array.isArray(q.ans)){ var _fi=-1; for(var _ci=0;_ci<o.length;_ci++){ if(o[_ci]&&String(o[_ci]).trim()){_fi=_ci;break;} } if(_fi>=0 && _fi!==(q.ans-1)) v.push({kind:'block',field:'o',idx:_fi,code:'CALC_WRONG_SLOT',msg:'\uacc4\uc0b0\ud615 \uacb0\ub860\uc774 \uc815\ub2f5\uce78(o['+(q.ans-1)+'])\uc774 \uc544\ub2cc o['+_fi+']\uc5d0 \uc788\uc74c \u2192 \uc5d4\uc9c4\uc774 '+(_fi+1)+'\ubc88\uc744 \uc815\ub2f5\uc73c\ub85c \uc624\ud45c\uc2dc(\uc815\ub2f5\uce78 o[ans-1]\uc5d0 \uacb0\ub860)',text:o[_fi]}); }
  try{ if(_qcOn('gichul','COMBO_STMT_MISMATCH') && typeof isComboQuestion==='function' && isComboQuestion(q.opts)){ var _st=comboStmtList(q); if(_st&&_st.length>=2 && oFilled>=2 && oFilled!==_st.length) v.push({kind:'warn',field:'o',idx:0,code:'COMBO_STMT_MISMATCH',msg:'\uc870\ud569\ud615 \uc9c4\uc220 '+_st.length+'\uac1c\uc778\ub370 \ud574\uc124(o) '+oFilled+'\uce78 \u2014 \uc9c4\uc220\uc218=\ucc44\uc6b4\uce78\uc218 \uc548 \ub9de\uc73c\uba74 \uc9c4\uc220\ubcc4\ub85c \uc548 \ud3bc\uccd0\uc9d0(\uc77c\ubc18\ud615 \ud3f4\ubc31)',text:''}); } }catch(_){}
  if(_qcOn('gichul','FILL_BLANK_MISMATCH') && Array.isArray(q.blanks) && q.blanks.length && oFilled!==q.blanks.length) v.push({kind:'block',field:'o',idx:0,code:'FILL_BLANK_MISMATCH',msg:'\ube48\uce78 '+q.blanks.length+'\uac1c\uc778\ub370 \ud574\uc124(o) '+oFilled+'\uce78 \u2014 blanks==oFilled\uc774\uc5b4\uc57c \ube48\uce78\ubcc4\ub85c \ud3bc\uce68(\uc548 \ub9de\uc73c\uba74 \uc5c9\ub69c\ud55c \uce78\uc5d0 \ubd99\uc74c)',text:''});
  if(_qcOn('gichul','O_ECHO_D')){ var _cds=(typeof _conceptCards==='function'?_conceptCards(q):(exp.c||[])).map(function(c){return String(c&&c.d||'');}).filter(Boolean); if(_cds.length){ o.forEach(function(t,i){ if(t&&String(t).trim()){ for(var _di=0;_di<_cds.length;_di++){ if(_qgSim(_qgStripVerdict(t),_cds[_di])>=_qcN('gichul','O_ECHO_D','minSim',0.6)){ v.push({kind:'warn',field:'o',idx:i,code:'O_ECHO_D',msg:'\ud574\uc124(o)\uc774 \uac1c\ub150\uce74\ub4dc \uc815\uc758(d) \ub418\ud480\uc774 \u2192 o\ub294 \uadf8 \ubcf4\uae30\uac00 \uc65c \ub9de/\ud2c0\ub9ac\ub294\uc9c0 \uc0ac\uc720\ub85c(\uc5ed\ud560\ubd84\ub9ac \u00a7337)',text:t}); break; } } } }); } }
  if(_qcOn('gichul','O_NO_ACTOR')){ var _AC=/[\u7532\u4e59\u4e19\u4e01\u620a\u5df1\u5e9a]/; o.forEach(function(t,i){ var op=opts[i]; if(op&&_AC.test(String(op)) && t&&String(t).trim() && !_AC.test(String(t))) v.push({kind:'warn',field:'o',idx:i,code:'O_NO_ACTOR',msg:'\ubcf4\uae30\uc5d4 \uc778\ubb3c(\u7532\u4e59)\uc774 \uc788\ub294\ub370 \ud574\uc124(o)\uc5d0\uc11c \uc778\ubb3c \uc99d\ubc1c \u2192 \uc0ac\uc2e4\uad00\uacc4 \uadf8\ub300\ub85c \uc0b4\ub824 \uc801\uc6a9(\u00a7467)',text:t}); }); }
  if(_qcOn('gichul','O_STEPS_NOBR')){ o.forEach(function(t,i){ var _cl=_qgCrammedSteps(t); if(_cl) v.push({kind:'warn',field:'o',idx:i,code:'O_STEPS_NOBR',msg:'해설(o)에 단계(①②③/1.2.3.) 나열이 줄바꿈 없이 한 덩어리 → 단계 사이 줄바꿈(\\n) 또는 문장으로 풀기',text:_cl}); }); }
  if(_qcOn('gichul','IMG_MISSING') && _qcImgKeys){ var _reI=/img:\/\/([^\s"'\\<>\]},]+)/g, _refs={}, _mI, _blobQ=''; try{ _blobQ=JSON.stringify(q)||''; }catch(_){} while((_mI=_reI.exec(_blobQ))){ _refs[_mI[1]]=1; } for(var _rk in _refs){ if(!_qcImgKeys.has(_rk)) v.push({kind:'warn',field:'q',idx:0,code:'IMG_MISSING',msg:'img://'+_rk+' 참조하는데 이미지 라이브러리에 그 키 없음 → 이미지 업로드 또는 키 수정(앱에서 참조 문자열이 그대로 노출됨)',text:'img://'+_rk}); } }
  o.forEach(function(t,i){ if(t&&/\ubcf4\uae30\s*\d/.test(String(t))) v.push({kind:'warn',field:'o',idx:i,code:'O_SELFREF',msg:'\ud574\uc124(o)\uc5d0 \ubcf4\uae30\ubc88\ud638\u00b7\uc790\uae30\ucc38\uc870(\ubcf4\uae30N/\uc774 \ubcf4\uae30/\u3131:) \u2192 \uc5d4\uc9c4 \uc790\ub3d9\uc774\ub77c \ub123\uc9c0 \uc54a\uc74c',text:t}); });
  if(isMCQ && !isCalc){
    /* \uc2dd\ubcc4\ud615 \ubc1c\ubb38(\ubc11\uc904/\uc774 \uc778\ubb3c/\uc774 \ub2e8\uccb4/(\uac00)/\ud65c\ub3d9\u00b7\uc124\uba85\uc73c\ub85c \uc633\uc740)\uc740 \ubcf4\uae30 \ud65c\ub3d9\uc744 \ub418\ubc1b\uc544 \uc8fc\uccb4 \uc9c0\ubaa9\ud558\ub294 \uad6c\uc870 \u2192 O_ECHO \uba74\uc81c */
    var _idQ=/\ubc11\uc904|\uc774\s*\uc778\ubb3c|\uc774\s*\ub2e8\uccb4|\uc774\s*\ub098\ub77c|\uc774\s*\uc655|[(\uff08]\s*[\uac00-\ud558]\s*[)\uff09]|\ud65c\ub3d9\uc73c\ub85c\s*\uc633|\uc124\uba85\uc73c\ub85c\s*\uc633|\ud55c\s*\uc77c\ub85c\s*\uc633/.test(String(q.q||''));
    o.forEach(function(t,i){ var op=opts[i]; if(!(t&&String(t).trim())||!op||String(op).length<10) return; if(/^[\u3131-\u314e][\s,\u3131-\u314e]*$/.test(String(op).trim())) return; var _ts=String(t);
      /* \u00a7376/1257 \uc608\uc678: \ud2c0\ub9b0 \ubcf4\uae30 \ubc18\ubc15 \uc778\uc6a9(\uc0ac\uc720 \uc788\uc73c\uba74 \ud5c8\uc6a9)\u00b7\uc218\uce58 \uac80\uc99d(\ubcf4\uae30 \uc218\uce58 \uadf8\ub300\ub85c \uacc4\uc0b0 \ud655\uc778)\uc740 \ubca0\ub07c\uae30 \uc544\ub2d8 */
      var _rebut=/\uc633\uc9c0\s*\uc54a|\ud2c0\ub9ac|\ud2c0\ub9b0|\uc544\ub2c8\ub2e4|\uc544\ub2c8\ub77c|\ubc18\ub300|\uc798\ubabb|\ud574\ub2f9\ud558\uc9c0\s*\uc54a|\ub2ec\ub77c|\ub4e4\uc9c0\s*\uc54a|\ub4e4\uc5b4\uac00\uc9c0\s*\uc54a|\ud3ec\ud568\ub418\uc9c0\s*\uc54a|\uac70\uafd2/.test(_ts);
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
    var _big=cards.concat(_lk).map(function(c){return (c&&c.d||'')+(c&&c.cx||'');}).join(' ');
    var _act={}; ((q.q||'')+' '+opts.join(' ')+' '+o.join(' ')+' '+ex.join(' ')+' '+_big).replace(/[\u7532\u4e59\u4e19\u4e01\u620a\u5df1\u5e9a]/g,function(x){_act[x]=1;return x;});
    var _relHit=_rel.test((q.q||'')+' '+opts.join(' ')+' '+o.join(' '));
    if(_qcOn('gichul','REL_NO_ARROW') && !_cptSkip && Object.keys(_act).length>=3 && _relHit && !_arrow.test(_big)) v.push({kind:'warn',field:'card',idx:0,code:'REL_NO_ARROW',msg:'\uc778\ubb3c 3\uba85+ \uad00\uacc4\ud615 \ubb38\ud56d\uc778\ub370 \ud654\uc0b4\ud45c \ud750\ub984\ub3c4 \uc5c6\uc74c \u2192 \uccab \uac1c\ub150\uce74\ub4dc cx\uc5d0 \uad00\uacc4\ub3c4 \ucd94\uac00(04 \u00a7B)',text:''});
  }
  if(isMCQ){
    var _qCalc=_isCalcQ(q); /* A-7 예외(b): CALC 단계풀이 ex는 장면 검사 면제 */
    var _qCast=/[甲乙丙丁戊己庚辛壬癸]/.test(String(q.q||'')+' '+opts.join(' ')+' '+String(q.jaryo||'')); /* 문항이 배역 제공 → 예시는 역할 유지(A-7② 단서) */
    ex.forEach(function(t,i){
      if(!(t&&String(t).trim())) return;
      var isScene=_qgAction.test(t)||_qgNamed(t);
      if(!_qCalc && _qcOn('gichul','EX_NONAME') && _qgAction.test(t) && !_qgNamed(t)) v.push({kind:'warn',field:'ex',idx:i,code:'EX_NONAME',msg:'\uc608\uc2dc\uac00 \uc7a5\uba74(\ud589\uc704)\uc778\ub370 \uba85\uba85 \uc778\ubb3c(\u7532\u4e59\u4e19\u2026) \uc5c6\uc74c',text:t});
      if(/^\uc608\s*\)/.test(String(t).trim())) v.push({kind:'warn',field:'ex',idx:i,code:'EX_PREFIX',msg:"\uc608\uc2dc\uc5d0 '\uc608)' \uc811\ub450 \uae08\uc9c0(\uc571\uc774 \uc608\uc2dc \ub77c\ubca8 \uc790\ub3d9 \ubd80\ucc29)",text:t});
      if(/\uc81c\s*\d+\s*\uc870/.test(t)) v.push({kind:'warn',field:'ex',idx:i,code:'EX_JOMUN',msg:'\uc608\uc2dc\uc5d0 \uc870\ubb38\ubc88\ud638(\uc81cN\uc870) \uae08\uc9c0 \u2014 \uc870\ubb38\uc740 \uac1c\ub150 d\uc5d0\ub9cc',text:t});
      if(/[甲乙丙丁戊己庚辛壬癸]/.test(String(t))){ var _pt=String(t).replace(/<[^>]+>/g,'').trim(); /* A-7 검사범위: 甲乙丙 등장 ex만 ①② 검사 */
        if(!_qCalc && _qcOn('gichul','EX_NO_SUBJECT_FIRST')){ var _okStart=/^([\u7532\u4e59\u4e19\u4e01\u620a]|[XYZ])/.test(_pt) && !/^([\u7532\u4e59\u4e19\u4e01\u620a]|[XYZ][\uac00-\ud7a3]*)\uc758\s/.test(_pt); var _actorSubj=/[\u7532\u4e59\u4e19\u4e01\u620a\u5df1\u5e9a\u8f9b\u58ec\u7678][\uac00-\ud7a3]{0,4}(\uc774|\uac00|\uc740|\ub294|\uc5d0\uac8c|\uaed8\uc11c|\uaed8)/.test(_pt)||/[XYZ][\uac00-\ud7a3]*(\uc774|\uac00|\uc740|\ub294|\uc5d0\uac8c|\uaed8\uc11c)/.test(_pt); if(!_okStart && !_actorSubj) v.push({kind:'warn',field:'ex',idx:i,code:'EX_NO_SUBJECT_FIRST',msg:'\uc7a5\uba74\uc774 \uc778\ubb3c \uc8fc\uc5b4(\u7532\u4e59\u00b7X\ud68c\uc0ac)\ub85c \uc2dc\uc791 \uc548 \ud568(\ubd80\uc0ac\uc808\u00b7\uc18c\uc720\uaca9 \uc555\ub450) \u2014 \u00a7A-7\u2460 \u7532 \ubb38\ub450',text:t}); }
        if(!_qCalc && !_qCast && _qcOn('gichul','EX_NOT_GAP_FIRST')){ var _fpm=_pt.match(/[\u7532\u4e59\u4e19\u4e01\u620a]/); if(_fpm && _fpm[0]!=='\u7532') v.push({kind:'warn',field:'ex',idx:i,code:'EX_NOT_GAP_FIRST',msg:'\ucc98\uc74c \ub4f1\uc7a5 \uc778\ubb3c\uc774 \u7532\uc774 \uc544\ub2cc '+_fpm[0]+' \u2014 \u00a7A-7\u2461 \u7532\ubd80\ud130 \uc21c\uc11c\ub300\ub85c',text:t}); }
      }
      var oi=o[i], echo=false;
      if(oi && String(oi).trim()){
        var sim=_qgSim(_qgStripVerdict(oi), t), run=_qgRunMatch(oi,t);
        if(!_qCalc && _qcOn('gichul','EX_ECHO') && (sim>=_qcN('gichul','EX_ECHO','minSim',0.5) || run>=_qcN('gichul','EX_ECHO','minRun',6))){ echo=true; v.push({kind:'warn',field:'ex',idx:i,code:'EX_ECHO',msg:'\uc608\uc2dc\uac00 \ud574\uc124(o) \ub418\ud480\uc774(\uc720\uc0ac\ub3c4 '+Math.round(sim*100)+'%\u00b7\uc5f0\uc18d\uc77c\uce58 '+run+'\uc5b4\uc808) \u2192 \ub2e4\ub978 \uc7a5\uba74\u00b7\uc218\uce58\ub85c',text:t}); }
      }
      if(!_qCalc && _qcOn('gichul','EX_SHORT') && isScene && !echo){ var _L=_qgLines(t); if(_L<_qcN('gichul','EX_SHORT','minLines',2)) v.push({kind:'warn',field:'ex',idx:i,code:'EX_SHORT',msg:'\uc608\uc2dc\uac00 \uc7a5\uba74\uc778\ub370 '+_L+'\uc904(2\uc904 \ubbf8\ub9cc) \u2014 \ub2e8\uc21c\ubc18\ubcf5 \uc758\uc2ec, \uc2e4\uc0dd\ud65c \uc7a5\uba74\uc73c\ub85c \uc0b4 \ubd99\uc774\uae30',text:t}); }
    });
    var _fex=[]; ex.forEach(function(t,i){ if(t&&String(t).trim()) _fex.push([i,t]); });
    for(var a=0;a<_fex.length;a++) for(var b=a+1;b<_fex.length;b++){ if(!_qCalc && _qcOn('gichul','EX_EX_ECHO') && _qgSim(_fex[a][1],_fex[b][1])>=_qcN('gichul','EX_EX_ECHO','minSim',0.5)) v.push({kind:'warn',field:'ex',idx:_fex[b][0],code:'EX_EX_ECHO',msg:'\uc608\uc2dc '+_fex[a][0]+'\ubc88\uacfc \uc8fc\uc5b4\u00b7\uc0c1\ud669\uc774 \ubc18\ubcf5 \u2192 \uc11c\ub85c \ub2e4\ub978 \uc7a5\uba74\uc73c\ub85c',text:_fex[b][1]}); }
    ex.forEach(function(t,i){ if(_qcOn('gichul','EX_MULTILINE') && String(t||'').split(/\n/).filter(function(l){return l.trim();}).length>=2) v.push({kind:'warn',field:'ex',idx:i,code:'EX_MULTILINE',msg:'예시/풀이(ex) 한 원소에 여러 줄 \u2014 줄은 배열 원소로 쪼갬(안 그러면 화면서 한 줄로 붙음)',text:t}); });
    if(_qcOn('gichul','EX_STEPS_CRAMMED') && _isCalcQ(q)){ ex.forEach(function(t,i){ var _cl=_qgCrammedSteps(t); if(_cl) v.push({kind:'warn',field:'ex',idx:i,code:'EX_STEPS_CRAMMED',msg:'\ud55c ex \uc6d0\uc18c\uc5d0 \uacc4\uc0b0 \ub2e8\uacc4(\u2460\u2461\u2462/1.2.3.) \uc5ec\ub7ec \uac1c \ub6ed\uce68 \u2192 \ub2e8\uacc4=\ubc30\uc5f4 \uc6d0\uc18c \ud558\ub098\ub85c \ucaa8\uac9c \u00a7367',text:_cl}); }); }
    if(_qcOn('gichul','EX_STEPS_NOBR') && !_isCalcQ(q)){ ex.forEach(function(t,i){ var _cl=_qgCrammedSteps(t); if(_cl) v.push({kind:'warn',field:'ex',idx:i,code:'EX_STEPS_NOBR',msg:'예시(ex)에 단계(1.2.3./①②③) 나열이 한 덩어리로 붙음(화면에도 그대로 붙어 보임) → 계산 단계면 원문자 ①②③로, 일반 예시면 이어지는 문장·장면으로 재작성',text:_cl}); }); }
    var _exArrLen=ex.length;
    if(_exArrLen>0 && _exArrLen!==o.length && !_isCalcQ(q)) v.push({kind:'warn',field:'ex',idx:0,code:'EX_LEN',msg:'\uc608\uc2dc \ubc30\uc5f4 \uae38\uc774('+_exArrLen+') \u2260 \ud574\uc124 \uae38\uc774('+o.length+') \u2192 \ubcf4\uae30 \uc218\ub9cc\ud07c \ub9de\ucda4(\uc5b5\uc9c0 \uc7a5\uba74\uc740 \ube48\uce78)',text:''});
  }
  if(_qcOn('gichul','BARE_ACRONYM')){ var _allT=[].concat(o||[],ex||[]).map(function(x){return String(x||'');}).join('\n'); var _ACR=/(GDP|GNP|GNI|GDI|LTV|DTI|DSR|MRS|MRT|MRTS|IRR|NPV|ROE|ROA|EPS|PER|PBR)/g, _seen={}, _mm; while((_mm=_ACR.exec(_allT))){ var _ac=_mm[1]; if(_seen[_ac])continue; _seen[_ac]=1; var _re2=new RegExp(_ac+'\\s*[(\uff08]'); if(!_re2.test(_allT)) v.push({kind:'warn',field:'o',idx:0,code:'BARE_ACRONYM',msg:'\uc601\uc5b4\uc57d\uc790 '+_ac+' \ud480\uc774 \uc5c6\uc774 \ub178\ucd9c \u2014 \uccab \ub4f1\uc7a5 1\ud68c \ud480\uc5b4\uc4f0\uae30('+_ac+', \ud55c\uae00\ud480\uc774) \u00a72-1',text:_ac}); } }
  return v;
}
function qualityGate(questions){
  var block=[], warn=[];
  (questions||[]).forEach(function(q){
    var id=(q&&q.id)||'?';
    _qcViolations(q).forEach(function(x){
      var line=id+' '+(x.field==='card'?('card'+x.idx):(x.field+'['+x.idx+']'))+' '+x.msg;
      if(x.kind==='block') block.push(line); else warn.push(line);
    });
  });
  return {block:block, warn:warn};
}

/* ---- [추출·확장] _QC_DEFAULTS (admin__20 4383-4390 → 신규 코드 추가) ---- */
var _QC_DEFAULTS={
  gichul:{EX_SHORT:{on:true,minLines:4},O_ECHO_OPT:{on:true,minRun:4},EX_ECHO:{on:true,minSim:0.5,minRun:6},EX_NONAME:{on:true},EX_EX_ECHO:{on:true,minSim:0.5},REL_NO_ARROW:{on:true},O_PLACEHOLDER:{on:true},O_INCOMPLETE:{on:true},EX_MULTILINE:{on:true},CALC_WRONG_SLOT:{on:true},COMBO_STMT_MISMATCH:{on:true},FILL_BLANK_MISMATCH:{on:true},O_ECHO_D:{on:true,minSim:0.6},O_NO_ACTOR:{on:true},O_STEPS_NOBR:{on:true},EX_STEPS_NOBR:{on:true},IMG_MISSING:{on:true},OTTAG_LEN:{on:true},EX_VERDICT:{on:true},CALC_NO_FORMULA:{on:true},DUP_ID:{on:true},CONST_NO_BASIS:{on:false}},
  link:{CPT_UNLINKED:{on:true},CPT_BROKEN:{on:true},CPT_CX_EMPTY:{on:true},CHILD_MISSING:{on:true},TBL_BROKEN:{on:true},GRP_BROKEN:{on:true},MN_BROKEN:{on:true},ITV_BROKEN:{on:true}},
  levelup:{LVUP_ANS_SKEW:{on:true,maxPct:30},LVUP_DUP:{on:true},LVUP_LV_BAND:{on:false},LVUP_COUNT:{on:false,floor:100}},
  concept:{CX_ECHO_D:{on:true,minSim:0.5},CX_SHORT:{on:true,minLines:4},CX_NONAME:{on:true},CX_DEICTIC:{on:true},CD_D_NAMED:{on:true},CD_OLD_FIELD:{on:true}},
  mnem:{MN_DESC_EMPTY:{on:true},MN_NO_K:{on:true},MN_DESC_NO_RED:{on:true},MN_DESC_REDUP:{on:true}},
  table:{TBL_RAGGED:{on:true},TBL_NO_CAPTION:{on:true}},
  graph:{GRP_PARAMS_OBJ:{on:true}},
  interactive:{ITV_UNKNOWN:{on:true},ITV_NO_PARAMS:{on:true}}
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
  EMDASH:'ERROR', VERDICT:'ERROR', EX_VERDICT:'ERROR', CX_EMPTY:'ERROR', CARD_LT2:'ERROR', O_PLACEHOLDER:'ERROR',
  CALC_WRONG_SLOT:'ERROR', FILL_BLANK_MISMATCH:'ERROR', CPT_MISSING:'ERROR', CPT_BROKEN:'ERROR',
  TBL_BROKEN:'ERROR', GRP_BROKEN:'ERROR', ITV_BROKEN:'ERROR', CHILD_MISSING:'ERROR',
  OTTAG_LEN:'ERROR', DUP_ID:'ERROR',
  /* WARNING (SHOULD — 권장 수정) */
  O_INCOMPLETE:'WARNING', COMBO_STMT_MISMATCH:'WARNING', O_ECHO_D:'WARNING', O_NO_ACTOR:'WARNING',
  O_STEPS_NOBR:'WARNING', EX_STEPS_NOBR:'WARNING', EX_STEPS_CRAMMED:'WARNING', O_ECHO_OPT:'WARNING',
  O_SELFREF:'WARNING', CX_ECHO_D:'WARNING', CARD_DEICTIC:'WARNING', CARD_LABEL:'WARNING',
  REL_NO_ARROW:'WARNING', EX_NONAME:'WARNING', EX_JOMUN:'WARNING', EX_NO_SUBJECT_FIRST:'WARNING',
  EX_NOT_GAP_FIRST:'WARNING', EX_ECHO:'WARNING', EX_SHORT:'WARNING', EX_EX_ECHO:'WARNING',
  EX_MULTILINE:'WARNING', EX_LEN:'WARNING', BARE_ACRONYM:'WARNING', IMG_MISSING:'WARNING',
  MN_BROKEN:'WARNING', CPT_UNLINKED:'WARNING', CPT_CX_EMPTY:'WARNING', CALC_NO_FORMULA:'WARNING',
  LVUP_ANS_SKEW:'WARNING', LVUP_COUNT:'INFO',
  /* INFO (NICE — 참고) */
  EX_PREFIX:'INFO', CONST_NO_BASIS:'INFO', LVUP_LV_BAND:'INFO', LVUP_DUP:'ERROR'
};
function _qcSevOf(code, kind){
  if(_QC_SEV[code]) return _QC_SEV[code];
  return (kind==='block') ? 'ERROR' : 'WARNING';   // 미등록은 kind로 폴백
}
/* 위반 배열에 sev 부여(+kind 정규화). BLOCKER/ERROR→block, WARNING/INFO→warn 로 kind 유지(게이트 호환) */
function _qcApplySev(vios){
  (vios||[]).forEach(function(x){
    x.sev = _qcSevOf(x.code, x.kind);
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
  /* (a) ottag(exp.ot) 길이 == exp.o 길이  [10-levelup·OX진술 태그] */
  if(_qcOn('gichul','OTTAG_LEN') && Array.isArray(exp.ot) && exp.ot.length && exp.ot.length!==o.length){
    v.push({kind:'block',field:'o',idx:0,code:'OTTAG_LEN',
      msg:'OX진술 태그(exp.ot) 길이 '+exp.ot.length+' ≠ 해설(exp.o) 길이 '+o.length+' — ot는 exp.o와 1:1(길이 같아야 진술별 태그가 맞음)',text:''});
  }
  /* (b) CALC 흐름: 계산형인데 풀이(ex)에 [공식] 표기가 없음  [02 §CALC · 구 #79] */
  if(_qcOn('gichul','CALC_NO_FORMULA') && _isCalcQ(q)){
    var exJoin=ex.filter(function(x){return x&&String(x).trim();}).join('\n');
    if(exJoin && !/\[\s*공식\s*\]/.test(exJoin))
      v.push({kind:'warn',field:'ex',idx:0,code:'CALC_NO_FORMULA',
        msg:'계산형 풀이(ex) 첫 줄에 [공식] 표기 없음 — 흐름은 [공식]→대입→계산→검산→최종답 권장',text:exJoin.slice(0,80)});
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
  window.QC = {
    violations:_qcViolations, gate:qualityGate, masterLink:_qcMasterLink, bundle:_qcBundle,
    levelup:_qcLevelup, applySev:_qcApplySev, sevOf:_qcSevOf, sevMeta:_QC_SEV_META,
    refs:_qcRefs, recordDate:_qcRecordDate, defaults:_QC_DEFAULTS
  };
}catch(e){}
