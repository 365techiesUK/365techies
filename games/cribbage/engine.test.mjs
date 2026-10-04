// 365 Cribbage engine tests (node --test games/cribbage/engine.test.mjs). Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const C = (r, s) => s * 13 + r - 1;   // card from rank (1 Ace .. 13 King) and suit (0 S, 1 H, 2 D, 3 C)
function you(S) {   // a sensible stand-in for you: the engine's Normal player in your seat
  const k = S.lv; S.lv = 3; let m = null;
  if (S.phase === 'discard') m = { t: 'discard', cards: E.aiDiscard(S, 0) };
  else if (S.phase === 'peg' && S.turn === 0) m = { t: 'play', c: E.aiPlay(S, 0) };
  else if (S.phase === 'show') m = { t: 'count' };
  else if (S.phase === 'handEnd') m = { t: 'next' };
  S.lv = k; return m;
}
const total = (cs, st, crib) => E.score(cs, st, !!crib).total;

test('counting hands: fifteens, pairs, runs (double runs), flushes and his nob', () => {
  assert.equal(total([C(5, 0), C(5, 1), C(5, 2), C(11, 3)], C(5, 3)), 29, 'the best hand there is');
  assert.equal(total([C(2, 0), C(4, 1), C(6, 2), C(8, 3)], C(13, 0)), 0, 'nineteen - nothing');
  assert.equal(total([C(3, 0), C(4, 1), C(4, 2), C(5, 3)], C(13, 0)), 10, 'a double run of three (8) and 15 with the King (2)');
  assert.equal(total([C(7, 0), C(8, 0), C(2, 1), C(13, 2)], C(9, 3)), 5, '7+8, and 2+13? no: 7 8 9 run (3) + 7+8 (2)');
  assert.equal(total([C(2, 1), C(4, 1), C(6, 1), C(8, 1)], C(13, 0)), 4, 'four hearts in the hand: a flush of 4');
  assert.equal(total([C(2, 1), C(4, 1), C(6, 1), C(8, 1)], C(13, 0), true), 0, 'but in the crib a flush needs the starter too');
  assert.equal(total([C(2, 1), C(4, 1), C(6, 1), C(8, 1)], C(12, 1), true), 5, 'five hearts in the crib');
  assert.equal(total([C(11, 2), C(1, 0), C(2, 1), C(7, 3)], C(9, 2)), 1, 'his nob: the Jack of the starter’s suit');
});
test('pegging points: 15, 31, pairs, three and four of a kind, runs in any order', () => {
  const pts = (seq) => E.pegPoints(seq, seq.reduce((a, c) => a + E.val(c), 0)).reduce((a, x) => a + x.pts, 0);
  assert.equal(pts([C(7, 0), C(8, 1)]), 2, 'fifteen');
  assert.equal(pts([C(5, 0), C(5, 1)]), 2, 'a pair');
  assert.equal(pts([C(5, 0), C(5, 1), C(5, 2)]), 2 + 6, 'three of a kind, and 15');
  assert.equal(pts([C(3, 0), C(3, 1), C(3, 2), C(3, 3)]), 12, 'four of a kind');
  assert.equal(pts([C(4, 0), C(2, 1), C(3, 2)]), 3, 'a run of three in any order');
  assert.equal(pts([C(10, 0), C(10, 1), C(11, 2), C(1, 3)]), 2, '10 10 J A = 31');
});
test('a deal: six each, two each to the crib, the starter cut; a Jack starter gives the dealer 2', () => {
  const S = E.newMatch(4, 3);
  assert.equal(S.dealer, 1, 'the computer deals first'); assert.equal(S.turn, 0);
  assert.equal(S.hands[0].length, 6); assert.equal(S.hands[1].length, 6);
  assert.equal(E.apply(S, { t: 'discard', cards: [S.hands[0][0]] }), false);
  const fx = E.apply(S, { t: 'discard', cards: S.hands[0].slice(0, 2) });
  assert.ok(fx); assert.equal(S.crib.length, 4); assert.equal(S.held[0].length, 4); assert.equal(S.held[1].length, 4);
  assert.ok(S.starter != null && !S.hands[0].includes(S.starter) && !S.hands[1].includes(S.starter));
  assert.equal(S.phase, 'peg'); assert.equal(S.turn, 0, 'you play first');
  // his heels
  for (let seed = 1; seed < 200; seed++) {
    const T = E.newMatch(seed, 3); E.apply(T, { t: 'discard', cards: T.hands[0].slice(0, 2) });
    if (E.rank(T.starter) === 11) { assert.equal(T.scores[T.dealer], 2); return; }
  }
  assert.fail('no Jack starter in 200 deals');
});
test('the play: never past 31; a Go gives the last player 1; the count starts again; the last card scores 1', () => {
  const S = E.newMatch(6, 3);
  E.apply(S, { t: 'discard', cards: S.hands[0].slice(0, 2) });
  S.scores = [0, 0]; S.inHand = [[C(13, 0), C(12, 1), C(5, 2)], [C(10, 3), C(7, 2)]]; S.turn = 0; S.count = 0; S.seq = []; S.said = [false, false];
  E.apply(S, { t: 'play', c: C(13, 0) });      // 10
  E.apply(S, { t: 'play', c: C(10, 3) });      // 20
  assert.equal(E.apply(S, { t: 'play', c: C(10, 3) }), false, 'not a card you hold');
  E.apply(S, { t: 'play', c: C(5, 2) });       // 25
  assert.deepEqual(E.legal(S, 1), [], 'the 7 would make 32');
  let m = E.auto(S); assert.deepEqual(m, { t: 'go' }); E.apply(S, m);   // Sam: go
  assert.deepEqual(E.legal(S, 0), [], 'the Queen would make 35');
  m = E.auto(S); assert.deepEqual(m, { t: 'go' }); E.apply(S, m);       // you can't play either
  assert.equal(S.scores[0], 1, '1 for the go to you'); assert.equal(S.count, 0, 'the count starts again');
  assert.equal(S.turn, 1, 'Sam leads the new count');
  E.apply(S, { t: 'play', c: C(7, 2) }); E.apply(S, { t: 'play', c: C(12, 1) });
  assert.equal(S.phase, 'show'); assert.equal(S.scores[0], 2, 'and 1 for the last card');
});
test('the show: the non-dealer’s hand first, then the dealer’s, then the crib', () => {
  const S = E.newMatch(8, 3); let n = 0;
  while (S.phase !== 'show' && n++ < 200) E.apply(S, E.auto(S) || you(S));
  const order = [];
  while (S.phase === 'show') { E.apply(S, { t: 'count' }); order.push([S.shown.who, S.shown.crib]); if (S.phase === 'over') break; }
  if (S.phase !== 'over') { assert.deepEqual(order, [[0, false], [1, false], [1, true]]); assert.equal(S.phase, 'handEnd'); }
});
test('every level plays whole matches to 121, every card in its place', () => {
  for (const lv of [1, 3, 5, 7]) for (let seed = 1; seed <= 8; seed++) {
    const S = E.newMatch(seed, lv); let n = 0;
    while (S.phase !== 'over' && n++ < 5000) {
      const m = E.auto(S) || you(S); assert.ok(m);
      assert.ok(E.apply(S, m), 'lv ' + lv + ' seed ' + seed + ': refused ' + JSON.stringify(m));
      if (S.phase === 'peg') assert.ok(S.count <= 31);
    }
    assert.equal(S.phase, 'over'); assert.equal(Math.max(...S.scores), 121);
  }
});
test('the same game plays the same way twice; the hint gives a legal move', () => {
  const run = () => { const S = E.newMatch(55, 7), log = []; let n = 0; while (S.phase !== 'over' && n++ < 5000) { const m = E.auto(S) || you(S); log.push(JSON.stringify(m)); E.apply(S, m); } return log.join(); };
  assert.equal(run(), run());
  const S = E.newMatch(9, 3), h = E.hint(S);
  assert.equal(h.t, 'discard'); assert.equal(h.cards.length, 2); assert.ok(E.apply(S, h));
  if (S.turn === 0) { const p = E.hint(S); assert.ok(E.legal(S, 0).includes(p.c)); }
});
