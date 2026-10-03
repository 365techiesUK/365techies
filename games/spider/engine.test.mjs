// 365 Spider rules - run: node --test games/spider/engine.test.mjs  (*.test.mjs is never deployed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('./engine.js');

// card ids for a given rank in a given 13-card block (block k = cards k*13 .. k*13+12; 8 blocks in two packs)
const id = (r, block) => block * 13 + (r - 1);
const up = (c) => ({ c, up: true }), dn = (c) => ({ c, up: false });
const blank = (suits = 1) => ({ seed: 0, suits, tab: Array.from({ length: 10 }, () => []), stock: [], done: [], moves: 0, score: 500, won: false });
const count = (s) => s.tab.reduce((a, c) => a + c.length, 0) + s.stock.length + s.done.length * 13;
const run = (block, from = 13, to = 1) => { const a = []; for (let r = from; r >= to; r--) a.push(up(id(r, block))); return a; };

test('the deal: 10 columns of 6,6,6,6,5,5,5,5,5,5, top cards face up, 50 in the deck, 104 different cards', () => {
  for (const suits of [1, 2, 4]) {
    const s = E.deal(4242, suits);
    assert.deepEqual(s.tab.map((c) => c.length), [6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    s.tab.forEach((col) => col.forEach((x, k) => assert.equal(x.up, k === col.length - 1)));
    assert.equal(s.stock.length, 50);
    assert.equal(new Set([...s.stock, ...s.tab.flat().map((x) => x.c)]).size, 104);
    assert.equal(s.score, 500);
  }
  assert.deepEqual(E.deal(7, 2), E.deal(7, 2), 'the same deal number, the same cards');
});
test('one suit is all spades; two is spades and hearts; four is all four, 26 of each', () => {
  const tally = (suits) => { const t = [0, 0, 0, 0]; for (let c = 0; c < 104; c++) t[E.suitOf(c, suits)]++; return t; };
  assert.deepEqual(tally(1), [104, 0, 0, 0]);
  assert.deepEqual(tally(2), [52, 52, 0, 0]);
  assert.deepEqual(tally(4), [26, 26, 26, 26]);
});
test('a card goes on any card a step higher; cards move together only in one suit', () => {
  const s = blank(4);
  s.tab[0] = [dn(id(2, 0)), up(id(9, 1)), up(id(8, 1)), up(id(7, 0))];   // 9H 8H, then a 7S (other suit)
  s.tab[1] = [up(id(8, 2))];                                             // an 8D
  s.tab[2] = [up(id(10, 3))];                                            // a 10C
  assert.equal(E.runLen(s, s.tab[0]), 1, 'the 7S on the 8H is not a one-suit run');
  assert.ok(E.apply(s, { t: 'move', from: { p: 't', i: 0, n: 1 }, to: { p: 't', i: 1 } }), '7S onto the 8D: any suit');
  assert.equal(E.runLen(s, s.tab[0]), 2);
  assert.ok(E.apply(s, { t: 'move', from: { p: 't', i: 0, n: 2 }, to: { p: 't', i: 2 } }), '9H 8H together onto the 10C');
  assert.equal(s.tab[0][0].up, true, 'the card underneath turned over');
  assert.equal(E.legal(s, { t: 'move', from: { p: 't', i: 1, n: 2 }, to: { p: 't', i: 3 } }), false, '8D 7S is not one suit, so it cannot move together');
  assert.ok(E.apply(s, { t: 'move', from: { p: 't', i: 1, n: 1 }, to: { p: 't', i: 3 } }), 'any card into an empty column');
  assert.equal(s.score, 497); assert.equal(s.moves, 3);
});
test('dealing: one card face up on every column, only when no column is empty', () => {
  const s = E.deal(11, 1);
  const fx = E.apply(s, { t: 'draw' });
  assert.ok(fx && fx.dealt); assert.equal(s.stock.length, 40);
  s.tab.forEach((col) => assert.equal(col[col.length - 1].up, true));
  s.tab[3] = [];
  assert.equal(E.legal(s, { t: 'draw' }), false, 'an empty column: no dealing');
  assert.equal(E.apply(s, { t: 'draw' }), null);
});
test('a full suit, King down to Ace, clears itself: 100 points, the card under it turns over', () => {
  const s = blank(1);
  s.tab[0] = [dn(id(5, 4)), ...run(0, 13, 2)];   // K..2 of spades on a face-down card
  s.tab[1] = [up(id(1, 0))];                     // the Ace of that suit
  const fx = E.apply(s, { t: 'move', from: { p: 't', i: 1, n: 1 }, to: { p: 't', i: 0 } });
  assert.ok(fx.toFound); assert.equal(s.done.length, 1);
  assert.equal(s.tab[0].length, 1); assert.equal(s.tab[0][0].up, true);
  assert.equal(s.score, 500 - 1 + 100);
});
test('two suits: a King-to-Ace run must be one suit to clear', () => {
  const s = blank(2);
  s.tab[0] = [...run(0, 13, 8), ...run(1, 7, 2)];   // spades K..8 then hearts 7..2
  s.tab[1] = [up(id(1, 1))];
  E.apply(s, { t: 'move', from: { p: 't', i: 1, n: 1 }, to: { p: 't', i: 0 } });
  assert.equal(s.done.length, 0, 'mixed suits stay on the table');
});
test('eight suits cleared: won', () => {
  const s = blank(1);
  for (let k = 0; k < 7; k++) s.done.push(run(k).map((x) => x.c));
  s.tab[0] = run(7, 13, 2); s.tab[1] = [up(id(1, 7))];
  const fx = E.apply(s, { t: 'move', from: { p: 't', i: 1, n: 1 }, to: { p: 't', i: 0 } });
  assert.ok(fx.won && s.won);
});
test('hint: same-suit joins first, never a pointless shuffle; deal when nothing else; fill an empty column first', () => {
  const s = blank(2);
  s.tab[0] = [dn(id(4, 3)), up(id(8, 0))];       // 8S over a face-down card
  s.tab[1] = [up(id(9, 0))];                     // 9S: same suit
  s.tab[2] = [up(id(9, 1))];                     // 9H: other suit
  for (let i = 3; i < 10; i++) s.tab[i] = [up(id(2, i % 2))];
  assert.deepEqual(E.hint(s), { t: 'move', from: { p: 't', i: 0, n: 1 }, to: { p: 't', i: 1 } });
  const d = blank(1); for (let i = 0; i < 10; i++) d.tab[i] = [up(id(13, i % 8))]; d.stock = Array.from({ length: 10 }, (_, k) => id(5, k % 8));
  assert.deepEqual(E.hint(d), { t: 'draw' }, 'nothing to move: deal');
  d.tab[9] = []; d.tab[8] = [up(id(13, 0)), up(id(2, 1))];
  const h = E.hint(d);
  assert.ok(h && h.t === 'move' && d.tab[h.to.i].length === 0, 'an empty column blocks the deal: the hint fills it');
  const x = blank(1); for (let i = 0; i < 10; i++) x.tab[i] = [up(id(13, i % 8))];
  assert.equal(E.stuck(x), true, 'kings everywhere, no deck: stuck');
});
test('a tap: onto its own suit first, then any suit, then an empty column', () => {
  const s = blank(2);
  s.tab[0] = [dn(id(3, 2)), up(id(6, 1))];   // 6H
  s.tab[1] = [up(id(7, 0))];                 // 7S
  s.tab[2] = [up(id(7, 1))];                 // 7H - same suit
  assert.deepEqual(E.smartMove(s, { p: 't', i: 0, n: 1 }).to, { p: 't', i: 2 });
  s.tab[2] = [up(id(12, 1))];
  assert.deepEqual(E.smartMove(s, { p: 't', i: 0, n: 1 }).to, { p: 't', i: 1 });
  s.tab[1] = [up(id(12, 0))];
  assert.equal(E.smartMove(s, { p: 't', i: 0, n: 1 }).to.p, 't', 'an empty column');
  const lone = blank(1); lone.tab[0] = [up(id(4, 0))]; for (let i = 1; i < 10; i++) lone.tab[i] = i === 5 ? [] : [up(id(13, 0))];
  assert.equal(E.smartMove(lone, { p: 't', i: 0, n: 1 }), null, 'a lone card never just moves to another empty column');
});
test('104 cards, always: over many moves and deals in every suit mode', () => {
  for (const suits of [1, 2, 4]) for (const seed of [1, 99, 2026]) {
    const s = E.deal(seed, suits);
    for (let k = 0; k < 400 && !s.won; k++) {
      const h = E.hint(s); if (!h) break;
      assert.ok(E.apply(s, h), 'hint moves are legal');
      assert.equal(count(s), 104);
    }
  }
});
