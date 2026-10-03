// 365 FreeCell rules - run: node --test games/freecell/engine.test.mjs  (*.test.mjs is never deployed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('./engine.js');

const card = (r, s) => s * 13 + (r - 1);   // s: 0 spades, 1 hearts, 2 diamonds, 3 clubs
const NAME = (c) => 'A23456789TJQK'[E.rank(c) - 1] + 'SHDC'[E.suit(c)];
const rows = (seed) => { const o = E.msOrder(seed).map(NAME), r = []; for (let i = 0; i < 52; i += 8) r.push(o.slice(i, i + 8).join(' ')); return r; };
const blank = () => ({ seed: 0, tab: [[], [], [], [], [], [], [], []], cells: [null, null, null, null], found: [[], [], [], []], moves: 0, score: 0, won: false });
const count = (s) => s.tab.reduce((a, c) => a + c.length, 0) + s.cells.filter((c) => c !== null).length + s.found.reduce((a, f) => a + f.length, 0);

test('Deal #1 and Deal #617 are card for card the Microsoft FreeCell games (Rosetta Code)', () => {
  assert.deepEqual(rows(1), ['JD 2D 9H JC 5D 7H 7C 5H', 'KD KC 9S 5S AD QC KH 3H', '2S KS 9D QD JS AS AH 3C', '4C 5C TS QH 4H AC 4D 7S',
    '3S TD 4S TH 8H 2C JH 7D', '6D 8S 8D QS 6C 3D 8C TC', '6S 9C 2H 6H']);
  assert.deepEqual(rows(617), ['7D AD 5C 3S 5S 8C 2D AH', 'TD 7S QD AC 6D 8H AS KH', 'TH QC 3H 9D 6S 8D 3D TC', 'KD 5H 9S 3C 8S 7H 4D JS',
    '4C QS 9C 9H 7C 6H 2C 2S', '4S TS 2H 5D JC 6C JH QH', 'JD KS KC 4H']);
});
test('the deal: 8 columns of 7,7,7,7,6,6,6,6, all 52 cards, empty cells and piles', () => {
  const s = E.deal(1);
  assert.deepEqual(s.tab.map((c) => c.length), [7, 7, 7, 7, 6, 6, 6, 6]);
  assert.equal(new Set(s.tab.flat()).size, 52);
  assert.deepEqual(s.cells, [null, null, null, null]);
  assert.equal(s.tab[0][0], card(11, 2));   // JD at the bottom of column 1
});
test('columns: one lower, other colour; any card into an empty column', () => {
  assert.equal(E.canStack(card(6, 1), [card(7, 0)]), true);
  assert.equal(E.canStack(card(6, 0), [card(7, 3)]), false);
  assert.equal(E.canStack(card(4, 2), []), true);
});
test('free cells: one card each; never a run; never from cell to cell', () => {
  const s = blank();
  s.tab[0] = [card(9, 3), card(8, 1)];
  assert.ok(E.apply(s, { t: 'move', from: { p: 't', i: 0, n: 1 }, to: { p: 'c', i: 0 } }));
  assert.equal(s.cells[0], card(8, 1));
  assert.equal(E.legal(s, { t: 'move', from: { p: 't', i: 0, n: 1 }, to: { p: 'c', i: 0 } }), false, 'cell already full');
  assert.equal(E.legal(s, { t: 'move', from: { p: 'c', i: 0 }, to: { p: 'c', i: 1 } }), false, 'cell to cell');
  s.tab[1] = [card(10, 1), card(9, 0)];
  assert.equal(E.legal(s, { t: 'move', from: { p: 't', i: 1, n: 2 }, to: { p: 'c', i: 1 } }), false, 'a run into a cell');
});
test('a run moves only when there is room: (free cells + 1) x 2^(empty columns)', () => {
  const s = blank();
  s.tab[0] = [card(10, 0), card(9, 1), card(8, 3), card(7, 2), card(6, 0)];   // a 5-card run
  s.tab[1] = [card(11, 1)];
  for (let i = 2; i < 8; i++) s.tab[i] = [card(13, i % 4)];                    // no empty columns
  s.cells = [card(1, 0), card(1, 1), null, null];                              // 2 free cells -> 3 cards at a time
  assert.equal(E.maxMove(s, false), 3);
  assert.equal(E.legal(s, { t: 'move', from: { p: 't', i: 0, n: 5 }, to: { p: 't', i: 1 } }), false);
  s.cells = [null, null, null, null];                                           // 4 free -> 5
  assert.equal(E.legal(s, { t: 'move', from: { p: 't', i: 0, n: 5 }, to: { p: 't', i: 1 } }), true);
  s.tab[7] = [];                                                                // + an empty column -> 10 (but 5 into it)
  assert.equal(E.maxMove(s, false), 10); assert.equal(E.maxMove(s, true), 5);
  assert.ok(E.apply(s, { t: 'move', from: { p: 't', i: 0, n: 5 }, to: { p: 't', i: 1 } }));
  assert.deepEqual(s.tab[1].map(E.rank), [11, 10, 9, 8, 7, 6]);
});
test('piles: Ace first, then the same suit; 10 points each; a card never comes back down', () => {
  const s = blank(); s.tab[0] = [card(2, 1), card(1, 1)];
  const fx = E.apply(s, { t: 'move', from: { p: 't', i: 0, n: 1 }, to: { p: 'f', i: 0 } });
  assert.equal(fx.points, 10); assert.equal(s.score, 10);
  assert.equal(E.legal(s, { t: 'move', from: { p: 'f', i: 0 }, to: { p: 't', i: 1 } }), false);
});
test('safe moves up are automatic; a tap finds the best place, a free cell last', () => {
  const s = blank();
  s.found = [[card(1, 0), card(2, 0)], [card(1, 1)], [card(1, 2)], [card(1, 3)]];
  s.tab[0] = [card(3, 0)];
  assert.equal(E.autoMove(s), null, 'a red 2 might still need the black 3');
  s.found[1].push(card(2, 1)); s.found[2].push(card(2, 2));
  assert.deepEqual(E.autoMove(s).to, { p: 'f', i: 0 });
  const t = blank(); t.tab[0] = [card(5, 3), card(9, 1)]; t.tab[1] = [card(10, 0)]; t.tab[2] = [card(7, 0), card(4, 2)];
  assert.deepEqual(E.smartMove(t, { p: 't', i: 0, n: 1 }).to, { p: 't', i: 1 });
  assert.deepEqual(E.smartMove(t, { p: 't', i: 2, n: 1 }).to.p, 't', 'nowhere to build: an empty column');
  const lone = blank(); lone.tab[0] = [card(4, 2)];
  assert.deepEqual(E.smartMove(lone, { p: 't', i: 0, n: 1 }).to, { p: 'c', i: 0 }, 'a card alone in its column never just moves to another empty one');
  for (let i = 3; i < 8; i++) t.tab[i] = [card(13, 0)];
  t.tab[1] = [card(12, 1)];
  assert.deepEqual(E.smartMove(t, { p: 't', i: 2, n: 1 }).to, { p: 'c', i: 0 }, 'no column at all: a free cell');
});
test('hint, stuck and finishing off', () => {
  const s = E.deal(1), h = E.hint(s);
  assert.ok(h && E.legal(s, h), 'deal 1 has a hint and it is legal');
  const st = blank();   // every cell full, nothing fits anywhere, nothing can go up
  st.cells = [card(13, 0), card(13, 1), card(13, 2), card(13, 3)];
  for (let i = 0; i < 8; i++) st.tab[i] = [card(2 + i % 6, i % 2 ? 0 : 3)];
  st.tab[0] = [card(5, 0)]; st.tab[1] = [card(5, 3)]; st.tab[2] = [card(7, 0)]; st.tab[3] = [card(7, 3)];
  st.tab[4] = [card(9, 0)]; st.tab[5] = [card(9, 3)]; st.tab[6] = [card(11, 0)]; st.tab[7] = [card(11, 3)];
  assert.equal(E.stuck(st), true);
  const f = blank();   // all four suits A-K, each in its own column in order, kings at the bottom
  for (let su = 0; su < 4; su++) for (let r = 13; r >= 1; r--) f.tab[su].push(card(r, su));
  assert.equal(E.finishable(f), true);
  let guard = 0; while (!f.won && guard++ < 60) assert.ok(E.apply(f, E.finishStep(f)));
  assert.equal(f.won, true); assert.equal(count(f), 52);
});
test('cards are never lost or doubled over many random legal moves', () => {
  for (const seed of [1, 2, 617, 11982, 31999]) {
    const s = E.deal(seed); let n = 0;
    for (let k = 0; k < 300 && !s.won; k++) {
      const a = E.allMoves(s); if (!a.length) break;
      const m = a[(k * 7 + seed) % a.length].m;
      assert.ok(E.apply(s, m)); n++;
      assert.equal(count(s), 52);
    }
    assert.ok(n > 0);
  }
});
