/* manifest-tx.js — manifest/exams 안전 쓰기 (2026-08-11 신설)
 *
 * ── 왜 만들었나 ────────────────────────────────────────────────────────
 * manifest/exams 는 `exams` 배열 하나에 16개 시험이 통째로 들어 있다. 그래서 어느 코드든
 * **배열 전체를 읽어 고쳐서 되쓴다**. 읽고 쓰는 사이에 다른 사람이 쓰면 그 변경이 조용히 날아간다.
 *
 * 실제로 겪었다 — 2차 방이 감평2차 버전을 올리는 동안 1차 방이 가맹거래사 버전을 올렸다.
 * 이번엔 쓰기 직전에 새로 읽어 살아남았지만, 순서가 조금만 어긋났으면 한쪽이 지워졌다.
 * 매니페스트가 지워지면 학생 앱이 그 시험을 아예 못 부른다.
 *
 * ── 어떻게 막나 ────────────────────────────────────────────────────────
 * 트랜잭션 안에서 **다시 읽어** 고친다. 읽은 뒤 쓰기 전에 누가 먼저 쓰면 Firestore 가
 * 충돌을 잡아 콜백을 처음부터 다시 돌린다(SDK 자동 재시도). 잠금이 아니라서 남이 죽어도
 * 잠긴 채로 남는 일이 없다.
 *
 * ── 쓰는 법 ────────────────────────────────────────────────────────────
 * 미리 만들어 둔 배열을 넘기지 말고, **무엇을 고칠지를 함수로** 넘긴다.
 * 함수는 트랜잭션이 방금 읽어 온 최신 exams 를 받는다.
 *
 *   await manifestUpdate(function(exams){
 *     var ex = exams.find(function(e){ return e && e.id === 'appraiser2'; });
 *     if(!ex) throw new Error('manifest 에 appraiser2 가 없다');
 *     ex.versions = ex.versions || {};
 *     ex.versions.s1 = 8;              // 제자리에서 고치거나
 *     return exams;                    // 새 배열을 돌려줘도 된다(안 돌려주면 고친 exams 를 쓴다)
 *   });
 *
 * ⚠ 콜백은 **여러 번 돌 수 있다**(충돌 시 재시도). 그러니 콜백 안에서
 *    confirm·alert·로그 출력·다른 문서 쓰기 같은 부작용을 일으키지 말 것.
 *    무거운 계산과 다른 문서 읽기는 밖에서 미리 끝내고 **결과만** 콜백에서 반영한다.
 *
 * 아무것도 안 쓰고 빠지려면 콜백에서 false 를 돌려준다.
 */
(function (root) {
  'use strict';

  async function manifestUpdate(mutate) {
    if (typeof mutate !== 'function') {
      throw new Error('manifestUpdate: 고칠 내용을 함수로 넘겨야 합니다');
    }
    var ref = db.collection('manifest').doc('exams');
    return await db.runTransaction(async function (tx) {
      var snap = await tx.get(ref);
      var live = (snap.exists && Array.isArray(snap.data().exams)) ? snap.data().exams : [];
      // 콜백이 원본을 건드려도 재시도 때 오염되지 않도록 깊은 복사본을 넘긴다
      var exams = JSON.parse(JSON.stringify(live));
      var out = mutate(exams, snap);
      if (out === false) return null;          // 쓰지 않고 빠진다
      var next = Array.isArray(out) ? out : exams;
      if (snap.exists) tx.update(ref, { exams: next });
      else tx.set(ref, { exams: next });
      return next;
    });
  }

  root.manifestUpdate = manifestUpdate;
})(typeof window !== 'undefined' ? window : this);
