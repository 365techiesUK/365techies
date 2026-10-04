// 365 Whist engine tests (node --test games/whist/engine.test.mjs). Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const C = (r, s) => s * 13 + (r === 14 ? 1 : r) - 1;   // card from rank (2-14, Ace 14) and suit (0 S, 1 H, 2 D, 3 C)
function step(S) {
  if (S.phase === 'handEnd') return E.apply(S, { t: 'next' });
  const m = E.auto(S) || { t: 'play', c: E.ai(S, 0) };
  return E.apply(S, m);
}

test('a deal: 13 each; the dealer’s last card sets trumps; the player on the dealer’s left leads', () => {
  const S = E.newMatch(3, 3), T = E.newMatch(3, 3);
  assert.deepEqual(S.hands, T.hands);
  S.hands.forEach((h) => assert.equal(h.length, 13));
  assert.equal(S.dealer, 3, 'Alex deals first'); assert.equal(S.turn, 0, 'so you lead first');
  assert.ok(S.hands[3].includes(S.turnUp)); assert.equal(S.trump, E.suit(S.turnUp));
});
test('follow suit if you can; a trump beats the suit led; a higher trump beats a trump', () => {
  const S = E.newMatch(1, 3); S.trump = 1; S.turn = 0; S.trick = [];
  S.hands = [[C(10, 0), C(3, 0), C(5, 1)], [C(2, 1), C(9, 2)], [C(14, 0)], [C(4, 1)]];
  E.apply(S, { t: 'play', c: C(10, 0) });
  assert.deepEqual(E.legal(S, 1), [C(2, 1), C(9, 2)], 'Sam has no spades: anything');
  E.apply(S, { t: 'play', c: C(2, 1) });
  E.apply(S, { t: 'play', c: C(14, 0) });
  E.apply(S, { t: 'play', c: C(4, 1) });
  assert.equal(E.winnerOf(S.trick, 1).p, 3, 'the 4 of trumps beats the 2 of trumps and the Ace of spades');
  const f = E.apply(S, { t: 'collect' }); assert.equal(f.w, 3); assert.equal(S.turn, 3);
  S.hands[0] = [C(3, 0), C(5, 1)]; S.trick = [{ p: 3, c: C(8, 0) }]; S.turn = 0;
  assert.match(E.whyNot(S, C(5, 1)), /follow suit/);
});
test('scoring: each trick over six is a point to the side that won it; 5 points is a game; two games the rubber', () => {
  const S = E.newMatch(2, 3); S.won = [5, 1, 4, 0]; S.tricks = 12; S.points = [3, 4]; S.games = [1, 0];
  S.hands = [[C(14, 3)], [C(2, 3)], [C(3, 3)], [C(4, 3)]]; S.turn = 0; S.trick = [];
  for (let i = 0; i < 4; i++) E.apply(S, { t: 'play', c: S.hands[S.turn][0] });
  const f = E.apply(S, { t: 'collect' });
  assert.ok(f.handOver); assert.equal(S.lastHand.tricks[0], 10); assert.equal(f.pts, 4);
  assert.equal(f.gameWon, 0); assert.ok(f.over, 'two games: the rubber'); assert.equal(S.winner, 0);
});
test('every level plays whole rubbers; every trick has four cards and every card is played once', () => {
  for (const lv of [1, 3, 5, 7]) for (let seed = 1; seed <= 10; seed++) {
    const S = E.newMatch(seed, lv); let n = 0;
    while (S.phase !== 'over' && n++ < 20000) {
      const f = step(S); assert.ok(f, 'lv ' + lv + ' seed ' + seed);
      if (f.t === 'collect' && !f.handOver) assert.equal(S.hands.reduce((a, h) => a + h.length, 0), 52 - 4 * S.tricks);
    }
    assert.equal(S.phase, 'over'); assert.equal(Math.max(...S.games), 2);
  }
});
test('the old rules: don’t trump your partner’s winning card; second hand plays low', () => {
  const S = E.newMatch(5, 3); S.trump = 1; S.played = []; S.voids = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  S.trick = [{ p: 1, c: C(9, 0) }, { p: 2, c: C(14, 0) }]; S.turn = 3; S.hands[3] = [C(5, 1), C(7, 2)];
  // Alex (3) is Sam's partner: Sam's 9 is beaten by Jo's Ace - Alex trumps
  assert.equal(E.ai(S, 3), C(5, 1));
  S.trick = [{ p: 1, c: C(9, 0) }, { p: 2, c: C(3, 0) }]; S.hands[3] = [C(5, 1), C(7, 2)];
  assert.equal(E.ai(S, 3), C(7, 2), 'partner Sam is winning: no trumping');
  S.trick = [{ p: 1, c: C(6, 0) }]; S.turn = 2; S.hands[2] = [C(13, 0), C(4, 0), C(8, 3)];
  assert.equal(E.ai(S, 2), C(4, 0), 'second hand low');
});
test('the same game plays the same way twice; the hint plays a legal card', () => {
  const run = () => { const S = E.newMatch(44, 7), log = []; let n = 0; while (S.phase !== 'over' && n++ < 20000) { const m = S.phase === 'handEnd' ? { t: 'next' } : E.auto(S) || { t: 'play', c: E.ai(S, 0) }; log.push(JSON.stringify(m)); E.apply(S, m); } return log.join(); };
  assert.equal(run(), run());
  const S = E.newMatch(8, 3); const h = E.hint(S); assert.ok(E.legal(S, 0).includes(h.c));
});
