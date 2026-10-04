// 365 Pyramid rules - run: node --test games/pyramid/engine.test.mjs  (*.test.mjs is never deployed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('./engine.js');

const card = (r, s) => s * 13 + (r - 1);   // s: 0 spades, 1 hearts, 2 diamonds, 3 clubs
const T = (i) => ({ p: 't', i }), W = { p: 'w' }, F = { p: 'f' };
const pair = (a, b) => ({ t: 'move', from: a, to: b });
const empty = () => { const s = E.deal(1, 1); s.tab = s.tab.map(() => null); s.stock = []; s.waste = []; return s; };

test('the deal: 28 in seven rows, 24 in the deck, all 52 once; the same cards at every level', () => {
  for (const lv of [1, 3, 5, 7]) {
    const s = E.deal(9, lv);
    assert.equal(s.tab.length, 28); assert.equal(s.stock.length, 24); assert.equal(s.waste.length, 0);
    assert.equal(new Set(s.tab.concat(s.stock)).size, 52);
    assert.equal(s.limit, { 1: 0, 3: 3, 5: 2, 7: 1 }[lv]);
  }
  assert.deepEqual(E.deal(9, 1).tab, E.deal(9, 7).tab);
});
test('the rows: place r(r+1)/2+k lies under the two places below it; only the bottom row starts free', () => {
  assert.deepEqual(E.COVER[0], [1, 2]); assert.deepEqual(E.COVER[1], [3, 4]); assert.deepEqual(E.COVER[20], [26, 27]);
  assert.deepEqual(E.COVER[15], [21, 22]); assert.deepEqual(E.COVER[27], []);
  const s = E.deal(4, 1);
  assert.deepEqual(E.avail(s).map((p) => p.i), [21, 22, 23, 24, 25, 26, 27]);
});
test('two free cards adding up to 13 go; a King goes on its own; covered cards and wrong sums do not', () => {
  const s = empty();
  s.tab[21] = card(6, 0); s.tab[22] = card(7, 1); s.tab[23] = card(13, 2); s.tab[24] = card(5, 0); s.tab[15] = card(1, 3);
  assert.ok(E.legal(s, pair(T(21), T(22))));
  assert.ok(!E.legal(s, pair(T(21), T(24))), '6 + 5');
  assert.ok(!E.legal(s, pair(T(15), T(21))), 'place 15 is still under 21 and 22');
  assert.ok(E.legal(s, pair(T(23), F))); assert.ok(!E.legal(s, pair(T(21), F)), 'only a King goes alone');
  const fx = E.apply(s, pair(T(21), T(22)));
  assert.ok(fx.toFound); assert.deepEqual(fx.cards.sort(), [card(6, 0), card(7, 1)].sort()); assert.equal(s.done.length, 2);
  assert.ok(E.free(s, 15), 'place 15 is free once 21 and 22 have gone');
});
test('the pile: its top card pairs with the pyramid; the deck turns over again only as often as the level allows', () => {
  const s = E.deal(5, 5);   // Hard: twice through
  for (let i = 0; i < 24; i++) assert.ok(E.apply(s, { t: 'draw' }));
  assert.equal(s.stock.length, 0); assert.equal(s.waste.length, 24);
  const first = s.waste[0], fx = E.apply(s, { t: 'draw' });
  assert.ok(fx.recycled); assert.equal(fx.left, 0); assert.equal(s.stock[s.stock.length - 1], first, 'the first card turned comes round first');
  for (let i = 0; i < 24; i++) E.apply(s, { t: 'draw' });
  assert.ok(!E.legal(s, { t: 'draw' }), 'Hard: no third time through');
  const e = E.deal(5, 1); for (let k = 0; k < 6 * 25; k++) assert.ok(E.apply(e, { t: 'draw' }), 'Easy: as often as you like');
});
test('the move codes round-trip; nonsense is refused', () => {
  for (const m of [{ t: 'draw' }, pair(T(21), T(27)), pair(W, T(3)), pair(T(12), F), pair(W, F)]) assert.deepEqual(E.decode(E.code(m)), m);
  for (const c of ['x', 'xt28.w', 'kt99', 'xw', 'p1']) assert.equal(E.decode(c), null);
});
test('clearing rows scores, the last card wins; stuck when nothing pairs and the deck is spent', () => {
  const s = empty(); s.tab[0] = card(4, 0); s.waste = [card(9, 1)];
  const fx = E.apply(s, pair(W, T(0)));
  assert.ok(fx.won && s.won); assert.equal(fx.points, 10 + 50 + 500);
  const t = empty(); t.tab[21] = card(2, 0); t.tab[22] = card(3, 0); t.limit = 1; t.passes = 0; t.waste = [card(4, 1)];
  assert.ok(E.stuck(t)); assert.equal(E.hint(t), null);
  t.limit = 0; assert.ok(!E.stuck(t), 'Easy: the pile can always go round again');
});
test('the hint takes a King first, then a pair, then turns the deck', () => {
  const s = empty(); s.tab[21] = card(6, 0); s.tab[22] = card(7, 1); s.tab[23] = card(13, 2); s.tab[24] = card(5, 0); s.stock = [card(2, 2)];
  assert.deepEqual(E.hint(s), pair(T(23), F));
  E.apply(s, E.hint(s)); assert.equal(E.hint(s).to.p, 't');
  E.apply(s, E.hint(s)); assert.deepEqual(E.hint(s), { t: 'draw' });
});
