// CertLab 복습 푸시 — 매일 오전 10시(KST) 1회.
// 조건: 시험별 minSolveCert+ 푼 시험 중 '아직 안 끝난' 게 있고  &&  미해결 오답 1개+  &&
//       마지막 학습 idleDays~dormantDays 경과  &&  FCM 토큰 있음  &&  쿨다운(48h) 통과.
//       시험 다 끝나면 정지. iOS는 토큰이 없어 자연 제외.
// 이메일(email.js)과 완전 별개. 임계값은 config/pushConfig 문서로 조절(없으면 기본값).
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');   // index.js 에서 initializeApp() 이미 호출됨
const REGION = 'asia-northeast3';
function db() { return admin.firestore(); }

const DEFAULTS = {
  minReviewItems: 1,    // 오답(미해결 복습거리) 최소 개수 — 1개라도 있으면
  minSolveCert: 20,     // 시험별 이 개수 이상 푼 시험만 '복습 대상'(자동멈춤 판정 기준)
  idleDays: 1,          // 마지막 학습 후 최소 경과일
  dormantDays: 14,      // 안전망: 이 일수 넘게 휴면이면 정지(시험일 누락 대비)
  cooldownHours: 48,    // 재발송 최소 간격(이틀에 최대 1번)
  title: '복습할 문제가 쌓였어요 🔁',
  body: '잊기 전에 지금 정리해볼까요?',
  url: '/',
};

async function loadCfg() {
  try {
    const s = await db().collection('config').doc('pushConfig').get();
    return Object.assign({}, DEFAULTS, (s.exists ? s.data() : {}));
  } catch (_) { return DEFAULTS; }
}

function tsToMs(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts._seconds) return ts._seconds * 1000;
  return 0;
}
function daysSince(ts) {
  const ms = tsToMs(ts);
  if (!ms) return Infinity;
  return (Date.now() - ms) / 86400000;
}

// examSchedules 전체를 {cert: nextExamMs} 맵으로 로드(1회).
// manual upcoming[] 있으면 가장 가까운 미래 회차로 승계(email.js resolveNextExam과 동일 취지).
async function loadExamDates() {
  const map = {};
  try {
    const snap = await db().collection('examSchedules').get();
    const now = Date.now();
    snap.forEach((d) => {
      const s = d.data() || {};
      let ms = tsToMs(s.nextExamDate);
      if (Array.isArray(s.upcoming) && s.upcoming.length) {
        const fut = s.upcoming
          .map((u) => tsToMs(u && u.date))
          .filter((m) => m && m >= now)
          .sort((a, b) => a - b);
        if (fut.length) ms = fut[0];
      }
      map[d.id] = ms || 0;
    });
  } catch (e) { console.error('[runReviewPush] loadExamDates', e.message); }
  return map;
}

// 30+ 푼 시험 중 '아직 시험일 안 지난' 게 하나라도 있으면 true.
// 30+ 푼 시험이 전부 시험일 지났으면(=다 끝남) false → 푸시 정지.
// 시험일을 못 읽은 시험은 '안 끝남'으로 간주(안전: 무조건 멈추지 않음 → 휴면 안전망이 처리).
function hasOngoingExam(solveByCert, examMap, minSolve) {
  const now = Date.now();
  let anyTarget = false;
  for (const cert in solveByCert) {
    if (!solveByCert.hasOwnProperty(cert)) continue;
    if ((solveByCert[cert] || 0) < minSolve) continue;   // 30+ 푼 시험만 대상
    anyTarget = true;
    const exMs = examMap[cert];
    if (!exMs || exMs >= now) return true;               // 시험일 미상 or 아직 안 지남 → 진행 중
  }
  return anyTarget ? false : false;                       // 대상 시험 없으면 어차피 발송 안 됨
}

exports.runReviewPush = onSchedule(
  { schedule: '0 10 * * *', timeZone: 'Asia/Seoul', region: REGION, timeoutSeconds: 540, memory: '512MiB' },
  async () => {
    const cfg = await loadCfg();
    const examMap = await loadExamDates();
    const snap = await db().collection('userData').get();
    const msg = admin.messaging();
    let sent = 0, targeted = 0, pruned = 0;

    for (const doc of snap.docs) {
      const u = doc.data() || {};
      const tokens = Array.isArray(u.fcmTokens) ? u.fcmTokens.filter(Boolean) : [];
      if (!tokens.length) continue;

      const due = Array.isArray(u.wrongList) ? u.wrongList.length : 0;
      if (due < cfg.minReviewItems) continue;                  // 복습할 오답이 있어야(기본 1개 이상)

      // 30+ 푼 시험 중 아직 안 끝난 게 있어야 발송. 전부 끝났으면 정지.
      const solveByCert = (u.solveCountByCert && typeof u.solveCountByCert === 'object') ? u.solveCountByCert : {};
      if (!hasOngoingExam(solveByCert, examMap, cfg.minSolveCert)) continue;

      const idle = daysSince(u.lastStudyAt);
      if (!(idle >= cfg.idleDays && idle <= cfg.dormantDays)) continue;   // 1일~14일(휴면 안전망/방금학습 제외)

      const last = u.pushState && u.pushState.lastPushAt;       // 쿨다운(하루 1통)
      if (last && (Date.now() - tsToMs(last)) < cfg.cooldownHours * 3600000) continue;

      targeted++;
      const body = String(cfg.body || '').replace('{due}', String(due));
      let res;
      try {
        res = await msg.sendEachForMulticast({
          tokens,
          data: { title: String(cfg.title || 'CertLab'), body: body, url: String(cfg.url || '/') },
        });
      } catch (e) { console.error('[runReviewPush] send fail', doc.id, e.message); continue; }

      sent += res.successCount;
      // 죽은 토큰 정리
      const bad = [];
      res.responses.forEach((r, i) => {
        if (!r.success) {
          const c = r.error && r.error.code;
          if (c === 'messaging/registration-token-not-registered' ||
              c === 'messaging/invalid-registration-token' ||
              c === 'messaging/invalid-argument') bad.push(tokens[i]);
        }
      });
      try {
        await doc.ref.set({ pushState: { lastPushAt: admin.firestore.FieldValue.serverTimestamp(), lastDue: due } }, { merge: true });
        if (bad.length) { await doc.ref.set({ fcmTokens: admin.firestore.FieldValue.arrayRemove(...bad) }, { merge: true }); pruned += bad.length; }
      } catch (e) { console.error('[runReviewPush] state update fail', doc.id, e.message); }
    }
    console.log('[runReviewPush] sent', sent, 'targeted', targeted, 'pruned', pruned);
    return;
  }
);
