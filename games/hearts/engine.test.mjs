// 365 Hearts engine tests (node --test games/hearts/engine.test.mjs). Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const C = (r, s) => s * 13 + (r === 14 ? 1 : r) - 1;   // card from rank (2-14, Ace 14) and suit (0 S, 1 H, 2 D, 3 C)
function you(S) {   // a sensible stand-in for you: the engine's Normal player in your seat
  if (S.phase === 'pass') return { t: 'pass', cards: E.aiPass({ ...S, lv: 3 }, 0) };
  if (S.phase === 'handEnd') return { t: 'next' };
  if (S.phase === 'play' && S.turn === 0) { const k = S.lv; S.lv = 3; const c = E.ai(S, 0); S.lv = k; return { t: 'play', c }; }
  return null;
}
function step(S) { const m = E.auto(S) || you(S); return m ? E.apply(S, m) : false; }
function allCards(S) { return [].concat(...S.hands, ...S.won, S.trick.map((x) => x.c)).sort((a, b) => a - b); }

test('a deal: 13 cards each, the same deal number deals the same cards, passing goes left, right, across, none', () => {
  const a = E.newMatch(42, 3), b = E.newMatch(42, 3);
  assert.deepEqual(a.hands, b.hands);
  a.hands.forEach((h) => assert.equal(h.length, 13));
  assert.deepEqual(allCards(a), [...Array(52).keys()]);
  assert.equal(a.phase, 'pass'); assert.equal(E.passTo(a, 0), 1, 'the first hand passes left (to West)');
  a.dir = 1; assert.equal(E.passTo(a, 0), 3); a.dir = 2; assert.equal(E.passTo(a, 0), 2);
});
test('passing: three cards each way; you get the three your neighbour chose; then the 2 of clubs leads', () => {
  const S = E.newMatch(7, 3), mine = S.hands[0].slice(0, 3);
  assert.equal(E.apply(S, { t: 'pass', cards: mine.slice(0, 2) }), false, 'two cards: refused');
  const fx = E.apply(S, { t: 'pass', cards: mine });
  assert.ok(fx); assert.equal(fx.got.length, 3);
  mine.forEach((c) => assert.ok(S.hands[1].includes(c), 'your cards went to West'));
  fx.got.forEach((c) => assert.ok(S.hands[0].includes(c)));
  assert.deepEqual(allCards(S), [...Array(52).keys()]);
  assert.equal(S.phase, 'play'); assert.ok(S.hands[S.turn].includes(E.TWO_C)); assert.deepEqual(E.legal(S, S.turn), [E.TWO_C]);
});
test('the rules of play: follow suit; no points on the first trick; hearts not led until broken', () => {
  const S = E.newMatch(1, 3); S.phase = 'play'; S.tricks = 1; S.trick = []; S.turn = 0; S.broken = false;
  S.hands[0] = [C(5, 1), C(9, 1), C(3, 2)];
  assert.deepEqual(E.legal(S, 0), [C(3, 2)], 'hearts not broken: lead the diamond');
  assert.match(E.whyNot(S, C(5, 1)), /Hearts can/);
  S.hands[0] = [C(5, 1), C(9, 1)]; assert.equal(E.legal(S, 0).length, 2, 'only hearts: any of them');
  S.hands[0] = [C(5, 1), C(4, 3), E.QS]; S.trick = [{ p: 3, c: C(10, 3) }];
  assert.deepEqual(E.legal(S, 0), [C(4, 3)], 'follow suit');
  assert.match(E.whyNot(S, C(5, 1)), /follow suit/);
  S.tricks = 0; S.hands[0] = [C(5, 1), E.QS, C(7, 2)]; S.trick = [{ p: 3, c: C(2, 3) }];
  assert.deepEqual(E.legal(S, 0), [C(7, 2)], 'first trick, no clubs: no points');
  S.hands[0] = [C(5, 1), E.QS]; assert.equal(E.legal(S, 0).length, 2, 'nothing else: points allowed');
});
test('a trick: the highest card of the suit led wins it (Ace high); its points go to the winner', () => {
  const S = E.newMatch(3, 3); S.phase = 'play'; S.tricks = 2; S.broken = true; S.turn = 0; S.trick = [];
  S.hands = [[C(10, 2)], [C(14, 2)], [C(5, 1)], [E.QS]];
  [0, 1, 2, 3].forEach(() => { const p = S.turn; assert.ok(E.apply(S, { t: 'play', c: S.hands[p][0] })); });
  assert.equal(E.winnerOf(S.trick).p, 1, 'the Ace of diamonds');
  const fx = E.apply(S, { t: 'collect' });
  assert.equal(fx.w, 1); assert.equal(S.taken[1], 14, 'a heart and the Queen'); assert.equal(S.turn, 1, 'the winner leads');
});
test('shooting the moon: all 26 to one player gives everyone else 26', () => {
  const S = E.newMatch(5, 3); S.phase = 'play'; S.tricks = 12; S.taken = [0, 25, 0, 0]; S.scores = [10, 20, 30, 40]; S.turn = 1; S.trick = [];
  S.hands = [[C(2, 3)], [C(14, 1)], [C(3, 3)], [C(4, 3)]]; S.broken = true;
  for (let i = 0; i < 4; i++) E.apply(S, { t: 'play', c: S.hands[S.turn][0] });
  const fx = E.apply(S, { t: 'collect' });
  assert.equal(fx.moon, 1); assert.deepEqual(S.lastHand.add, [26, 0, 26, 26]); assert.deepEqual(S.scores, [36, 20, 56, 66]);
});
test('the match ends when someone reaches 100; the lowest score wins', () => {
  const S = E.newMatch(9, 3); S.phase = 'play'; S.tricks = 12; S.taken = [0, 0, 13, 12]; S.scores = [60, 70, 90, 80]; S.turn = 0; S.trick = [];
  S.hands = [[C(2, 3)], [C(3, 3)], [C(4, 3)], [C(5, 1)]]; S.broken = true;
  for (let i = 0; i < 4; i++) E.apply(S, { t: 'play', c: S.hands[S.turn][0] });
  const fx = E.apply(S, { t: 'collect' });
  assert.ok(fx.over); assert.equal(S.phase, 'over'); assert.equal(S.winner, 0);
});
test('every level plays whole matches to the end, with every card accounted for after each trick', () => {
  for (const lv of [1, 3, 5, 7]) for (let seed = 1; seed <= 12; seed++) {
    const S = E.newMatch(seed, lv); let n = 0;
    while (S.phase !== 'over' && n++ < 4000) {
      const fx = step(S); assert.ok(fx, 'lv ' + lv + ' seed ' + seed + ': a move was refused');
      if (fx.t === 'collect' && !fx.handOver) assert.deepEqual(allCards(S), [...Array(52).keys()]);
    }
    assert.equal(S.phase, 'over', 'lv ' + lv + ' seed ' + seed);
    assert.ok(Math.max(...S.scores) >= 100);
  }
});
test('the computer never plays an illegal card, and the same game plays the same way twice', () => {
  const run = () => { const S = E.newMatch(77, 5), log = []; let n = 0; while (S.phase !== 'over' && n++ < 4000) { const m = E.auto(S) || you(S); if (m.t === 'play') assert.ok(E.legal(S, S.turn).includes(m.c)); log.push(JSON.stringify(m)); E.apply(S, m); } return log.join(); };
  assert.equal(run(), run());
});
test('the computer dumps the Queen of spades when it can\'t follow suit, and doesn\'t lead her', () => {
  const S = E.newMatch(11, 3); S.phase = 'play'; S.tricks = 3; S.broken = false; S.turn = 1;
  S.trick = [{ p: 0, c: C(9, 2) }]; S.hands[1] = [E.QS, C(4, 0), C(8, 3)];
  assert.equal(E.ai(S, 1), E.QS);
  S.trick = []; S.hands[1] = [E.QS, C(4, 0), C(8, 3)];
  assert.notEqual(E.ai(S, 1), E.QS);
});
test('the hint suggests a legal card for you', () => {
  const S = E.newMatch(21, 3); E.apply(S, E.hint(S));
  let n = 0; while (S.turn !== 0 && n++ < 10) E.apply(S, E.auto(S));
  const h = E.hint(S); assert.equal(h.t, 'play'); assert.ok(E.legal(S, 0).includes(h.c));
});
