// 365 Gin Rummy engine tests (node --test games/gin/engine.test.mjs). Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const C = (r, s) => s * 13 + r - 1;   // card from rank (1 Ace .. 13 King) and suit (0 S, 1 H, 2 D, 3 C)
function you(S) {   // a sensible stand-in for you: the engine's Normal player in your seat
  if (S.phase === 'handEnd') return { t: 'next' };
  if (S.turn !== 0) return null;
  const k = S.lv; S.lv = 3; const m = S.phase === 'draw' ? { t: 'draw', from: E.aiDraw(S, 0) } : E.aiThrow(S, 0); S.lv = k; return m;
}

test('a deal: ten cards each, one face up, 31 in the deck; the same number deals the same cards', () => {
  const a = E.newMatch(5, 3), b = E.newMatch(5, 3);
  assert.deepEqual(a.hands, b.hands); assert.equal(a.hands[0].length, 10); assert.equal(a.hands[1].length, 10);
  assert.equal(a.pile.length, 1); assert.equal(a.stock.length, 31);
  assert.deepEqual([...a.hands[0], ...a.hands[1], ...a.pile, ...a.stock].sort((x, y) => x - y), [...Array(52).keys()]);
  assert.equal(a.turn, 0, 'you go first in the first hand'); assert.equal(a.phase, 'draw');
});
test('melds: sets and runs; Ace is low; the best layout leaves the least deadwood', () => {
  const h = [C(7, 0), C(7, 1), C(7, 2), C(4, 1), C(5, 1), C(6, 1), C(1, 3), C(2, 3), C(3, 3), C(13, 0)];
  const b = E.best(h);
  assert.equal(b.dead, 10, 'only the King is left over'); assert.equal(b.melds.length, 3);
  assert.equal(E.deadwood([C(12, 0), C(13, 0), C(1, 0)]), 21, 'Q K A is not a run');
  // the 7 of hearts can be in the set or the run - the layout that leaves least wins
  assert.equal(E.deadwood([C(7, 0), C(7, 2), C(7, 1), C(5, 1), C(6, 1)]), 11);
  assert.equal(E.deadwood([C(7, 0), C(7, 2), C(7, 3), C(7, 1), C(5, 1), C(6, 1)]), 0, 'three 7s make the set, the 7 of hearts finishes the run');
});
test('a turn: take a card, throw one; not the card you just took from the pile', () => {
  const S = E.newMatch(8, 3), top = S.pile[0];
  assert.equal(E.apply(S, { t: 'discard', c: S.hands[0][0] }), false, 'take a card first');
  assert.ok(E.apply(S, { t: 'draw', from: 'pile' })); assert.ok(S.hands[0].includes(top)); assert.equal(S.hands[0].length, 11);
  assert.equal(E.apply(S, { t: 'discard', c: top }), false, 'not straight back');
  const c = S.hands[0].find((x) => x !== top); assert.ok(E.apply(S, { t: 'discard', c }));
  assert.equal(S.turn, 1); assert.equal(S.pile[S.pile.length - 1], c);
});
test('knocking: 10 or less; the other player lays off; points are the difference; an undercut pays 25 more', () => {
  const S = E.newMatch(1, 3);
  S.hands[0] = [C(2, 0), C(3, 0), C(4, 0), C(9, 1), C(9, 2), C(9, 3), C(5, 2), C(6, 2), C(7, 2), C(3, 1), C(12, 3)];
  S.hands[1] = [C(5, 0), C(6, 0), C(13, 1), C(13, 2), C(13, 0), C(8, 1), C(10, 1), C(11, 3), C(2, 1), C(4, 3)];
  S.turn = 0; S.phase = 'discard'; S.took = { from: 'stock', c: C(12, 3) };
  assert.equal(E.apply(S, { t: 'knock', c: C(9, 1) }), false, 'throwing a meld card leaves too much');
  const fx = E.apply(S, { t: 'knock', c: C(12, 3) });
  assert.ok(fx); assert.equal(S.result.kDead, 3, 'your 3 of hearts');
  assert.deepEqual(S.result.laid.sort((a, b) => a - b), [C(5, 0), C(6, 0)].sort((a, b) => a - b), 'the 5 and 6 of spades go on your run');
  assert.equal(S.result.dDead, 10 + 8 + 10 + 2 + 4, 'their deadwood after laying off');
  assert.equal(fx.to, 0); assert.equal(fx.pts, 34 - 3);
  // an undercut
  const U = E.newMatch(1, 3);
  U.hands[0] = [C(2, 0), C(3, 0), C(4, 0), C(9, 1), C(9, 2), C(9, 3), C(5, 2), C(6, 2), C(7, 2), C(8, 1), C(12, 3)];
  U.hands[1] = [C(10, 0), C(10, 1), C(10, 2), C(11, 1), C(11, 2), C(11, 3), C(1, 0), C(1, 1), C(2, 2), C(3, 3)];
  U.turn = 0; U.phase = 'discard'; U.took = { from: 'stock', c: C(12, 3) };
  const u = E.apply(U, { t: 'knock', c: C(12, 3) });
  assert.ok(u.undercut); assert.equal(u.to, 1); assert.equal(u.pts, 8 - 6 + 25, 'their Ace of spades goes on your 2-3-4: 6 left');
});
test('gin: no deadwood scores the other hand and 25, and nothing is laid off', () => {
  const S = E.newMatch(2, 3);
  S.hands[0] = [C(2, 0), C(3, 0), C(4, 0), C(9, 1), C(9, 2), C(9, 3), C(5, 2), C(6, 2), C(7, 2), C(8, 2), C(13, 3)];
  S.hands[1] = [C(5, 0), C(13, 1), C(13, 2), C(1, 1), C(2, 1), C(4, 3), C(6, 3), C(8, 3), C(10, 3), C(12, 1)];
  S.turn = 0; S.phase = 'discard'; S.took = { from: 'stock', c: C(13, 3) };
  const fx = E.apply(S, { t: 'knock', c: C(13, 3) });
  assert.ok(fx.gin); assert.deepEqual(S.result.laid, []); assert.equal(fx.pts, S.result.dDead + 25);
});
test('the deck running down to two cards makes the hand a draw', () => {
  const S = E.newMatch(3, 3); S.stock = S.stock.slice(0, 3);
  E.apply(S, { t: 'draw', from: 'stock' });
  const c = S.hands[0].find((x) => S.took.c !== x || true);
  const fx = E.apply(S, { t: 'discard', c: S.hands[0][0] });
  assert.ok(fx.draw); assert.equal(S.phase, 'handEnd'); assert.deepEqual(S.history[S.history.length - 1], [0, 0]);
});
test('every level plays whole matches to 100, and the computer only makes legal moves', () => {
  for (const lv of [1, 3, 5, 7]) for (let seed = 1; seed <= 6; seed++) {
    const S = E.newMatch(seed, lv); let n = 0;
    while (S.phase !== 'over' && n++ < 20000) {
      const m = E.auto(S) || you(S);
      assert.ok(m, 'a move');
      const fx = E.apply(S, m); assert.ok(fx, 'lv ' + lv + ' seed ' + seed + ': refused ' + JSON.stringify(m));
      if (S.phase === 'draw' || S.phase === 'discard') assert.equal(S.hands[0].length + S.hands[1].length + S.pile.length + S.stock.length, 52);
    }
    assert.equal(S.phase, 'over'); assert.ok(Math.max(...S.scores) >= 100); assert.ok(S.final[S.winner] > S.final[1 - S.winner]);
  }
});
test('the same game plays the same way twice; your hand is laid out melds first', () => {
  const run = () => { const S = E.newMatch(31, 7), log = []; let n = 0; while (S.phase !== 'over' && n++ < 20000) { const m = E.auto(S) || you(S); log.push(JSON.stringify(m)); E.apply(S, m); } return log.join(); };
  assert.equal(run(), run());
  const a = E.arrange([C(13, 0), C(7, 0), C(7, 1), C(7, 2), C(2, 3)]);
  assert.equal(a.groups.length, 1); assert.deepEqual(a.dead, [C(13, 0), C(2, 3)]); assert.equal(a.deadwood, 12);
});
test('the hint: a sensible draw, then a legal throw', () => {
  const S = E.newMatch(12, 3);
  const d = E.hint(S); assert.equal(d.t, 'draw'); assert.ok(E.apply(S, d));
  const t = E.hint(S); assert.ok(['discard', 'knock'].includes(t.t)); assert.ok(E.canThrow(S, 0, t.c));
});
