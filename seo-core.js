/* ===========================================================================
   seo-core.js — CertLab SEO 페이지 생성 코어 (admin.html · scripts/seo-gen.mjs 공용 단일 출처)
   추출: admin-3-qc.js 908~941 블록에서 이동(복제 아님) · 2026-08-03
   admin 쪽에는 글루(seoLog·seoGenerate)만 남는다.
   seoReadAllBanks(db) — db(Firestore compat 인스턴스)를 인자로 받는다.
     브라우저: seoReadAllBanks(db) / Node: compat SDK로 만든 db 전달.
   =========================================================================== */

/*
 * '(심화)' 를 뗐다. 과목명이 '한국사 심화' 라 제목에 '심화' 가 두 번,
 * '한국사' 도 두 번 들어갔다 - 네이버가 제목을 잘라 보여 주는데 앞이 죄다
 * 자격증 이름으로 먹혀 정작 회차가 안 보였다. 노출 1,573에 클릭 58(3.7%).
 */
const SEO_CERT_NAME={appraiser:'감정평가사',appraiser2:'감정평가사 2차',realestate1:'공인중개사 1차',realestate2:'공인중개사 2차',housing:'주택관리사보',housing2:'주택관리사 2차',koreanhistory:'한국사능력검정시험',bodybuilding:'보디빌딩',sport2:'생활스포츠지도사 2급 필기',laborattorney1:'공인노무사 1차',firemanager1:'소방시설관리사 1차',hesm:'건강운동관리사 1차',franchise:'가맹거래사 1차',consultant:'경영지도사 1차',tourguide:'국내여행안내사',hotelmgr:'호텔관리사'};
/*
 * 사람들이 실제로 검색창에 치는 줄임말. 정식 이름에 없는 것만 적는다.
 *
 * '한능검 74회 해설' 은 한 달에 569번 보여졌는데 클릭이 5번이었다(0.9%).
 * 그 말이 페이지 어디에도 없어서다 - 검색결과에서 내가 친 말이 굵게 안 나오면
 * 눈이 그냥 지나간다. 정식 이름이 이미 그 말을 품고 있으면(공인중개사 1차 →
 * 공인중개사) 아래 seoAlias 가 알아서 뺀다.
 */
const SEO_CERT_ALIAS={koreanhistory:'한능검',appraiser:'감평'};
const SEO_SUBJ_OVERRIDE={civil:'민법'};
/**
 * 과목명에서 자격증 이름과 겹치는 말을 뺀다.
 *
 * '한국사능력검정시험' + '한국사 심화' → '심화'.
 * 다 빠지면(과목명이 통째로 자격증 이름 안에 있으면) 빈 값을 준다 - 그대로 두면
 * '보디빌딩 보디빌딩 기출문제' 처럼 같은 말이 두 번 찍힌다.
 */
function seoSubjTrim(cname,subjName){return String(subjName||'').split(/\s+/).filter(w=>w&&String(cname||'').indexOf(w)<0).join(' ');}
/** 정식 이름·과목에 이미 든 줄임말은 넣지 않는다. */
function seoAlias(cert,head){const a=SEO_CERT_ALIAS[cert];return (a&&head.indexOf(a)<0)?a:'';}
const SEO_CERT_ORDER=['appraiser','appraiser2','realestate1','realestate2','housing','housing2','koreanhistory','bodybuilding','sport2','laborattorney1','franchise','consultant','firemanager1','hesm','tourguide','hotelmgr'];
const SEO_STOP=new Set('관한 관하여 대한 대하여 설명으로 설명 옳은 옳지 않은 않는 것은 것을 것이 모두 고른 고르면 따름 경우 및 또는 모든 가장 바르게 틀린 맞는 해당하는 아닌 무엇 어느'.split(' '));
const SEO_STYLE=`
body{font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;background:#FDF8F5;color:#1e293b;max-width:760px;margin:0 auto;padding:20px 16px;line-height:1.6}
h1{font-size:22px;color:#0C447C;margin-bottom:6px} .sub{color:#64748b;font-size:14px;margin-bottom:16px}
.cta{display:inline-block;background:#0C447C;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:700;margin:4px 0 18px}
.bc{font-size:13px;color:#94a3b8;margin-bottom:10px} .bc a{color:#0C447C;text-decoration:none}
ul{list-style:none;padding:0;margin:0} .qitem{display:flex;gap:12px;padding:13px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:9px}
.qno{font-weight:800;color:#0C447C;flex-shrink:0;min-width:34px} .qt{margin:0 0 7px;font-weight:600}
.opts{margin:0 0 7px;padding-left:18px} .opts li{margin:2px 0} .o-cor{color:#0F6E56;font-weight:700}
.ans{margin:4px 0;font-size:13px;color:#0F6E56} .kws{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.kw{font-size:12px;color:#0C447C;background:#EAF0F9;border-radius:6px;padding:2px 8px}
footer{margin-top:24px;color:#94a3b8;font-size:13px;border-top:1px solid #e2e8f0;padding-top:14px} footer a{color:#0C447C}
`;
const SEO_STYLE_ADD='.exp{margin:8px 0 2px;border-top:1px dashed #e2e8f0;padding-top:8px}.ex-blk{margin:7px 0}.ex-h{font-size:12px;font-weight:800;color:#0C447C;margin-bottom:3px}.cc{background:#F4F7FB;border:1px solid #e2e8f0;border-radius:9px;padding:8px 10px;margin:4px 0}.cc-t{display:block;color:#0C447C;font-size:13px;margin-bottom:2px}.cc-d{margin:0;font-size:13px}.cc-cx{margin:4px 0 0;font-size:12.5px;color:#475569}.ex-o,.ex-ex{margin:2px 0;padding-left:18px}.ex-o li,.ex-ex li{margin:3px 0;font-size:13px}.ex-s{font-size:13px;color:#0F6E56;margin:5px 0 0}';
/* GA4 + Google Ads — SEO 정적 페이지 유입·리마케팅 계측. index.html 과 같은 ID 를 쓴다. */
const SEO_GA4_ID='G-RPZRZQ779J', SEO_ADS_ID='AW-18199166773';
const SEO_GTAG='<scr'+'ipt async src="https://www.googletagmanager.com/gtag/js?id='+SEO_GA4_ID+'"><\/script>\n<scr'+'ipt>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","'+SEO_GA4_ID+'");gtag("config","'+SEO_ADS_ID+'");<\/script>\n';
function seoEsc(t){if(t==null)return '';return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function seoClean(t){if(t==null)return '';t=String(t).replace(/<[^>]+>/g,'').replace(/\u00a0/g,' ').trim();return seoEsc(t);}
function seoKws(q){const toks=String(q||'').replace(/<[^>]+>/g,'').split(/\s+/);const out=[];for(let w of toks){w=w.replace(/[()\[\]?!.,\u00b7'"\u2018\u2019\u201c\u201d]/g,'').trim();if(w.length<2||SEO_STOP.has(w))continue;out.push(w);if(out.length>=5)break;}return out;}
function seoRound(s){const m=String(s||'').match(/제\s*(\d+)\s*회/);return m?m[1]:null;}
function seoCard(c){if(typeof c!=='object'||c==null)c={d:String(c)};const t=seoClean(c.t||''),d=seoClean(c.d||''),cx=seoClean(c.cx||'');let s='';if(t)s+='<b class="cc-t">'+t+'</b>';if(d)s+='<p class="cc-d">'+d+'</p>';if(cx)s+='<p class="cc-cx">예: '+cx+'</p>';return s?'<div class="cc">'+s+'</div>':'';}
function seoQ(n,q){const opts=q.opts||[];const ans=q.ans;const li=[];for(let i=0;i<opts.length;i++){const cls=(typeof ans==='number'&&(i+1)===ans)?' class="o-cor"':' class=""';li.push('<li'+cls+'>'+(i+1)+'. '+seoClean(opts[i])+'</li>');}const exp=q.exp||{};const parts=[];const cards=(exp.c||[]).map(seoCard).filter(Boolean);if(cards.length)parts.push('<div class="ex-blk"><div class="ex-h">📘 개념</div>'+cards.join('')+'</div>');const os=(exp.o||[]).filter(x=>String(x).trim()).map(seoClean);if(os.length)parts.push('<div class="ex-blk"><div class="ex-h">🔍 보기별 해설</div><ol class="ex-o">'+os.map(x=>'<li>'+x+'</li>').join('')+'</ol></div>');const ex=(exp.ex||[]).filter(x=>String(x).trim()).map(seoClean);if(ex.length)parts.push('<div class="ex-blk"><div class="ex-h">🧮 풀이</div><ol class="ex-ex">'+ex.map(x=>'<li>'+x+'</li>').join('')+'</ol></div>');const sline=seoClean(exp.s||'');if(sline)parts.push('<p class="ex-s">'+sline+'</p>');const exphtml=parts.length?'<div class="exp">'+parts.join('')+'</div>':'';const kws=seoKws(q.q||'').map(w=>'<span class="kw">'+seoClean(w)+'</span>').join('');const ansline=(typeof ans==='number')?'<p class="ans"><b>정답</b> '+ans+'번</p>':'';return '<li class="qitem"><div class="qno">'+n+'</div><div class="qbody"><p class="qt">'+seoClean(q.q||'')+'</p><ol class="opts">'+li.join('')+'</ol>'+ansline+exphtml+'<div class="kws">'+kws+'</div></div></li>';}
/*
 * 제목과 설명은 '사람이 검색창에 친 말' 로 짓는다.
 *
 * 네이버 검색어를 세어 보면 쓰는 말이 정해져 있다 - 자격증 이름, 회차,
 * 과목, 그리고 '해설·풀이·정답'. 그 말이 제목에 그대로 있으면 굵게 나와
 * 눌리고, 없으면 아무리 보여져도 안 눌린다. 실제로 제목이 검색어와 딱 맞는
 * 쪽은 CTR 12~50%, 어긋난 쪽은 0.6~3.7% 였다.
 *
 * 그래서 세 가지를 넣는다 - 겹말을 빼고(seoSubjTrim), 줄임말을 붙이고
 * (seoAlias), '해설·정답' 을 제목에 둔다. 설명에는 '풀이' 까지 넣는다.
 */
function seoPage(cert,subjName,round,subjId,qs){const cname=SEO_CERT_NAME[cert]||cert;const n=qs.length;const subj=seoSubjTrim(cname,subjName);const head=[cname,round?round+'회':'',subj].filter(Boolean).join(' ');const al=seoAlias(cert,head);const alT=al?' ('+al+')':'';const alD=(al||cname)+' ';let title,desc,h1,fname;if(round){title=head+' 기출문제 해설·정답'+alT+' | CertLab';desc=head+' 기출 '+n+'문항 전체입니다. 문제와 정답, 보기별 해설과 풀이를 한 쪽에 모았습니다. '+alD+'기출문제를 무료로 보세요.';h1=head+' 기출문제 해설';fname=cert+'-'+round+'-'+subjId+'.html';}else{title=head+' 기출문제 해설·정답'+alT+' | CertLab';desc=head+' 기출 '+n+'문항 전체입니다. 문제와 정답, 보기별 해설과 풀이를 한 쪽에 모았습니다. '+alD+'기출문제를 무료로 보세요.';h1=head+' 기출문제 해설';fname=cert+'-'+subjId+'.html';}const url='https://certlab.ai.kr/seo/'+fname;const ld={'@context':'https://schema.org','@graph':[{'@type':'EducationalOrganization','@id':'https://certlab.ai.kr/#org','name':'CertLab','alternateName':'서트랩','url':'https://certlab.ai.kr/'},{'@type':'LearningResource','name':title,'description':desc,'url':url,'inLanguage':'ko','learningResourceType':'기출문제·해설','educationalUse':'시험대비','about':cname,'isPartOf':{'@id':'https://certlab.ai.kr/#org'},'publisher':{'@id':'https://certlab.ai.kr/#org'},'isAccessibleForFree':true},{'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'CertLab 기출문제','item':'https://certlab.ai.kr/seo/index.html'},{'@type':'ListItem','position':2,'name':cname,'item':url}]}]};const ldjson=JSON.stringify(ld);const qhtml=qs.map((q,i)=>seoQ(i+1,q)).join('\n');const doc='<!doctype html><html lang="ko"><head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+seoEsc(title)+'</title>\n<meta name="description" content="'+seoEsc(desc)+'">\n<link rel="canonical" href="'+url+'">\n<meta property="og:title" content="'+seoEsc(title)+'">\n<meta property="og:description" content="'+seoEsc(desc)+'">\n<meta property="og:url" content="'+url+'">\n<meta property="og:type" content="article">\n<scr'+'ipt type="application/ld+json">'+ldjson+'<\/script>\n<style>'+SEO_STYLE+SEO_STYLE_ADD+'</style>\n'+SEO_GTAG+'</head><body>\n<div class="bc"><a href="https://certlab.ai.kr/seo/index.html">CertLab 기출문제</a> › '+seoEsc(cname)+'</div>\n<h1>'+seoEsc(h1)+'</h1>\n<p class="sub">총 '+n+'문항 · 문제·정답·해설·개념 무료 학습</p>\n<a class="cta" href="https://certlab.ai.kr/#'+cert+'">▶ CertLab에서 풀어보기</a>\n<ul>\n'+qhtml+'\n</ul>\n<footer><p>'+seoEsc(cname)+' 전체 기출을 복습·예상점수·자동채점과 함께 학습하려면 <a href="https://certlab.ai.kr/#'+cert+'">CertLab</a>에서 무료로 이용하세요.</p></footer>\n</body></html>';return {fname:fname,html:doc};}
async function seoReadAllBanks(db){const m=await db.collection('manifest').doc('exams').get();const exams=(m.exists&&m.data().exams)||[];const banks=[];for(const e of exams){for(const sub of (e.subjects||[])){const docId=e.id+'__'+sub.code;try{const bd=await db.collection('banks').doc(docId).get();if(bd.exists){let data=bd.data();if(Array.isArray(data.shards)&&data.shards.length){const qs=[];for(const s of data.shards){const sd=await db.collection('banks').doc(docId+'__'+s).get();if(sd.exists&&Array.isArray(sd.data().questions))qs.push.apply(qs,sd.data().questions);}data=Object.assign({},data,{questions:qs});}banks.push({docId:docId,data:data,subjName:sub.name||sub.code});}}catch(_){}}}return banks;}
function seoCertOfFname(fn){return fn.split('-')[0];}
/*
 * 사이트맵에는 앱 홈과 소개 쪽도 넣는다.
 *
 * 여태 /seo/ 쪽만 실려 있었다. 정작 '서트랩' 으로 검색해 들어오는 자리는
 * 홈인데 그걸 안 알린 셈이다. about.html 은 이미 색인돼 클릭이 잡히고 있어
 * (CTR 37.5%) 넣어 두면 손해가 없다.
 */
const SEO_BASE_URLS=['https://certlab.ai.kr/','https://certlab.ai.kr/about.html'];
function seoSitemap(urls,today){const all=SEO_BASE_URLS.concat(urls.filter(u=>SEO_BASE_URLS.indexOf(u)<0));const lines=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];all.forEach(u=>lines.push('<url><loc>'+u+'</loc><lastmod>'+today+'</lastmod></url>'));lines.push('</urlset>');return lines.join('\n')+'\n';}
function seoLabel(fn){const p=fn.slice(0,-5).split('-');if(p.length===3)return p[1]+'회 '+p[2];if(p.length===2)return p[1];return fn;}
function seoHub(urls,SEO_LBL){const pageUrls=urls.filter(u=>!u.endsWith('/seo/index.html'));const bycert={};pageUrls.forEach(u=>{const fn=u.split('/').pop();(bycert[seoCertOfFname(fn)]=bycert[seoCertOfFname(fn)]||[]).push([fn,u]);});const order=SEO_CERT_ORDER.filter(c=>bycert[c]).concat(Object.keys(bycert).filter(c=>SEO_CERT_ORDER.indexOf(c)<0));const css="body{font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;background:#FDF8F5;color:#1e293b;max-width:760px;margin:0 auto;padding:20px 16px;line-height:1.6}h1{font-size:22px;color:#0C447C}h2{font-size:16px;color:#0C447C;margin:18px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}a{color:#0C447C;text-decoration:none}ul{list-style:none;padding:0}li{margin:5px 0}.cta{display:inline-block;background:#0C447C;color:#fff;padding:10px 18px;border-radius:10px;font-weight:700;margin:8px 0 4px}footer{margin-top:24px;color:#94a3b8;font-size:13px;border-top:1px solid #e2e8f0;padding-top:14px}";/*
 * 자격증마다 제 허브로 보낸다. 예전에는 여기에 249개를 통째로 늘어놓았는데,
 * 그러면 구글이 이 한 장만 읽고 가지는 뒤로 미룬다(실제로 194쪽이 '발견됨 -
 * 색인 생성 안 됨' 이었다). 한 겹을 두어 링크를 나눠 준다.
 */
const secs=order.map(c=>{const cname=SEO_CERT_NAME[c]||c;const n=bycert[c].length;const al=seoAlias(c,cname);return '<h2><a href="'+seoCertHubName(c)+'">'+seoEsc(cname)+'</a></h2><ul><li><a href="'+seoCertHubName(c)+'">'+seoEsc(cname+(al?'('+al+')':''))+' 기출문제 '+n+'묶음 보기 →</a></li></ul>';}).join('');return '<!doctype html><html lang="ko"><head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>CertLab 자격증 기출문제 모음 | 감정평가사·공인중개사·주택관리사·한국사·보디빌딩</title>\n<meta name="description" content="감정평가사·공인중개사·주택관리사·한국사·생활스포츠지도사 보디빌딩 기출문제와 원본 해설을 CertLab에서 무료로. 망각곡선 자동복습·예상점수·자동채점.">\n<link rel="canonical" href="https://certlab.ai.kr/seo/index.html">\n<style>'+css+'</style>\n'+SEO_GTAG+'</head><body>\n<h1>CertLab 자격증 기출문제 모음</h1>\n<p>각 시험의 회차별 기출문제와 원본 해설입니다. 복습·예상점수·자동채점은 앱에서.</p>\n<a class="cta" href="https://certlab.ai.kr/">▶ CertLab 앱 바로가기</a>\n'+secs+'\n<footer><p>© CertLab(서트랩) · 자격증 기출 학습 PWA</p></footer>\n</body></html>';}
/* ---- 내부 링크 ------------------------------------------------------------
 * 구글이 249쪽 가운데 9쪽만 색인했다. 나머지 194쪽은 '발견됨 - 현재 색인이
 * 생성되지 않음' 이었다 - 주소는 아는데 크롤링조차 안 한 것이다.
 *
 * 까닭은 생김새다. 쪽마다 나가는 링크가 허브 하나뿐이라, 허브 한 장에 링크
 * 249개가 매달린 납작한 별 모양이었다. 그러면 구글은 허브만 자주 읽고 가지는
 * 뒤로 미룬다.
 *
 * 두 겹으로 편다 - 메인 허브가 자격증 허브를 가리키고, 자격증 허브가 제 쪽들을
 * 가리키고, 쪽끼리도 서로 이어 준다. 어디서 들어와도 이웃으로 걸어갈 수 있다.
 * ------------------------------------------------------------------------- */

/** 파일명을 사람 말로. '74회 한국사 심화' · '운동생리학' */
function seoItemLabel(fn,SEO_LBL){const p=fn.slice(0,-5).split('-');const sj=(SEO_LBL&&SEO_LBL[fn])||(p.length>=3?p.slice(2).join('-'):p[1]);return (p.length>=3?p[1]+'회 ':'')+sj;}
/** 자격증 허브 파일명. seo/ 안에 두어 상대링크가 단순해진다. */
function seoCertHubName(cert){return 'index-'+cert+'.html';}
const SEO_NAV_CSS='.nav{margin-top:22px;border-top:1px solid #e2e8f0;padding-top:14px}.nav h2{font-size:15px;color:#0C447C;margin:0 0 8px}.nav ul{display:flex;flex-wrap:wrap;gap:6px;list-style:none;padding:0;margin:0}.nav li a{display:inline-block;font-size:13px;color:#0C447C;background:#EAF0F9;border-radius:7px;padding:4px 10px;text-decoration:none}.nav li a.on{background:#0C447C;color:#fff}';

/** 쪽 아래에 같은 자격증의 이웃 쪽 링크를 끼운다. footer 바로 앞에 넣는다. */
function seoAddNav(html,cert,fname,fnames,SEO_LBL){
  const cname=SEO_CERT_NAME[cert]||cert;
  const li=fnames.map(f=>'<li><a href="'+f+'"'+(f===fname?' class="on"':'')+'>'+seoEsc(seoItemLabel(f,SEO_LBL))+'</a></li>').join('');
  const nav='<nav class="nav"><h2>'+seoEsc(cname)+' 다른 회차·과목</h2><ul>'+li+'</ul>'
    +'<p style="margin:10px 0 0;font-size:13px"><a href="'+seoCertHubName(cert)+'">'+seoEsc(cname)+' 기출문제 모음</a> · <a href="index.html">전체 자격증 모음</a></p></nav>';
  return html.replace('</style>','</style>').replace(SEO_STYLE_ADD,SEO_STYLE_ADD+SEO_NAV_CSS).replace('<footer>',nav+'\n<footer>');
}

/** 자격증 한 개짜리 허브. 메인 허브와 쪽 사이에 한 겹 둔다. */
function seoCertHub(cert,fnames,SEO_LBL){
  const cname=SEO_CERT_NAME[cert]||cert;
  const al=seoAlias(cert,cname);
  const title=cname+' 기출문제 해설·정답 모음'+(al?' ('+al+')':'')+' | CertLab';
  const desc=cname+' 회차별·과목별 기출문제 '+fnames.length+'묶음입니다. 문제와 정답, 보기별 해설과 풀이를 한 쪽씩 모아 두었습니다.';
  const css="body{font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;background:#FDF8F5;color:#1e293b;max-width:760px;margin:0 auto;padding:20px 16px;line-height:1.6}h1{font-size:22px;color:#0C447C}a{color:#0C447C;text-decoration:none}ul{list-style:none;padding:0}li{margin:5px 0}.cta{display:inline-block;background:#0C447C;color:#fff;padding:10px 18px;border-radius:10px;font-weight:700;margin:8px 0 4px}.bc{font-size:13px;color:#94a3b8;margin-bottom:10px}footer{margin-top:24px;color:#94a3b8;font-size:13px;border-top:1px solid #e2e8f0;padding-top:14px}";
  const items=fnames.map(f=>'<li><a href="'+f+'">'+seoEsc(cname+' '+seoItemLabel(f,SEO_LBL))+' 기출문제 해설</a></li>').join('');
  const url='https://certlab.ai.kr/seo/'+seoCertHubName(cert);
  return {fname:seoCertHubName(cert),html:'<!doctype html><html lang="ko"><head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+seoEsc(title)+'</title>\n<meta name="description" content="'+seoEsc(desc)+'">\n<link rel="canonical" href="'+url+'">\n<meta property="og:title" content="'+seoEsc(title)+'">\n<meta property="og:description" content="'+seoEsc(desc)+'">\n<style>'+css+'</style>\n'+SEO_GTAG+'</head><body>\n<div class="bc"><a href="index.html">CertLab 기출문제</a> › '+seoEsc(cname)+'</div>\n<h1>'+seoEsc(cname)+' 기출문제 해설</h1>\n<p>회차별·과목별로 '+fnames.length+'묶음. 문제·정답·보기별 해설·풀이를 한 쪽에 모았습니다.</p>\n<a class="cta" href="https://certlab.ai.kr/#'+cert+'">▶ CertLab에서 풀어보기</a>\n<ul>'+items+'</ul>\n<footer><p>© CertLab(서트랩) · <a href="index.html">전체 자격증 기출문제 모음</a></p></footer>\n</body></html>'};
}

function seoRobots(){const block='\nDisallow: /admin.html\nDisallow: /admin_import.html\nDisallow: /preview.html\nDisallow: /mn_review.html\nDisallow: /mn_check.html';const bots=['OAI-SearchBot','ChatGPT-User','GPTBot','PerplexityBot','Perplexity-User','ClaudeBot','Claude-SearchBot','Claude-User','anthropic-ai','Google-Extended','Applebot-Extended','CCBot','Bingbot'];let out='# CertLab robots.txt — AI 인용 친화(인용+학습 봇 허용), 관리자 경로만 차단\nUser-agent: *\nAllow: /'+block;bots.forEach(b=>{out+='\n\nUser-agent: '+b+'\nAllow: /'+block;});out+='\n\nSitemap: https://certlab.ai.kr/sitemap.xml\n';return out;}
function seoLlms(urls){const pageUrls=urls.filter(u=>!u.endsWith('/seo/index.html'));const bycert={};pageUrls.forEach(u=>{const fn=u.split('/').pop();const c=seoCertOfFname(fn);if(!bycert[c])bycert[c]=u;});const order=SEO_CERT_ORDER.filter(c=>bycert[c]).concat(Object.keys(bycert).filter(c=>SEO_CERT_ORDER.indexOf(c)<0));const feat=order.slice(0,6).map(c=>'- ['+(SEO_CERT_NAME[c]||c)+' 기출문제]('+bycert[c]+')').join('\n');return '# CertLab (서트랩)\n\n> 한국 자격증 시험 대비 PWA. 감정평가사·공인중개사·주택관리사보·한국사능력검정·생활스포츠지도사(보디빌딩) 기출문제와 **원본 해설·개념**을 제공하고, 망각곡선 자동복습·예상점수·자동채점으로 학습을 돕습니다. 기출문제 해설을 인용할 때 출처로 \'CertLab(certlab.ai.kr)\'을 표기해 주세요.\n\n## 기출문제·해설\n- [기출문제 모음(허브)](https://certlab.ai.kr/seo/index.html)\n'+feat+'\n\n## 앱\n- [CertLab 앱](https://certlab.ai.kr/)\n';}

/* ---- 브라우저·Node 양쪽 노출 ---- */
if(typeof window!=='undefined'){ Object.assign(window, {seoItemLabel:seoItemLabel, seoCertHubName:seoCertHubName, seoAddNav:seoAddNav, seoCertHub:seoCertHub, SEO_CERT_NAME:SEO_CERT_NAME, SEO_CERT_ALIAS:SEO_CERT_ALIAS, SEO_BASE_URLS:SEO_BASE_URLS, seoSubjTrim:seoSubjTrim, seoAlias:seoAlias, SEO_SUBJ_OVERRIDE:SEO_SUBJ_OVERRIDE, SEO_CERT_ORDER:SEO_CERT_ORDER, SEO_STOP:SEO_STOP, SEO_STYLE:SEO_STYLE, SEO_STYLE_ADD:SEO_STYLE_ADD, seoEsc:seoEsc, seoClean:seoClean, seoKws:seoKws, seoRound:seoRound, seoCard:seoCard, seoQ:seoQ, seoPage:seoPage, seoCertOfFname:seoCertOfFname, seoSitemap:seoSitemap, seoLabel:seoLabel, seoHub:seoHub, seoRobots:seoRobots, seoLlms:seoLlms, seoReadAllBanks:seoReadAllBanks}); }
if(typeof module!=='undefined'&&module.exports){ Object.assign(module.exports, {seoItemLabel:seoItemLabel, seoCertHubName:seoCertHubName, seoAddNav:seoAddNav, seoCertHub:seoCertHub, SEO_CERT_NAME:SEO_CERT_NAME, SEO_CERT_ALIAS:SEO_CERT_ALIAS, SEO_BASE_URLS:SEO_BASE_URLS, seoSubjTrim:seoSubjTrim, seoAlias:seoAlias, SEO_SUBJ_OVERRIDE:SEO_SUBJ_OVERRIDE, SEO_CERT_ORDER:SEO_CERT_ORDER, SEO_STOP:SEO_STOP, SEO_STYLE:SEO_STYLE, SEO_STYLE_ADD:SEO_STYLE_ADD, seoEsc:seoEsc, seoClean:seoClean, seoKws:seoKws, seoRound:seoRound, seoCard:seoCard, seoQ:seoQ, seoPage:seoPage, seoCertOfFname:seoCertOfFname, seoSitemap:seoSitemap, seoLabel:seoLabel, seoHub:seoHub, seoRobots:seoRobots, seoLlms:seoLlms, seoReadAllBanks:seoReadAllBanks}); }
