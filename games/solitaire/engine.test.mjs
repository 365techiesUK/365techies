// 365 Solitaire rules - run: node --test games/solitaire/engine.test.mjs  (*.test.mjs is never deployed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('./engine.js');
const D = require('./deals.js');
const S = require('../../tools/solitaire/solver.cjs');

const card = (r, s) => s * 13 + (r - 1);   // s: 0 spades, 1 hearts, 2 diamonds, 3 clubs
const blank = (draw = 1) => ({ seed: 0, draw, tab: [[], [], [], [], [], [], []], stock: [], waste: [], found: [[], [], [], []], moves: 0, score: 0, passes: 0, undos: 0, won: false });
const count = (s) => s.stock.length + s.waste.length + s.found.reduce((a, f) => a + f.length, 0) + s.tab.reduce((a, c) => a + c.length, 0);

test('a deal: 52 different cards, columns of 1 to 7 with only the top card face up, 24 in the deck', () => {
  const s = E.deal(12345, 1);
  const all = [...s.stock, ...s.tab.flatMap((c) => c.map((x) => x.c))];
  assert.equal(new Set(all).size, 52);
  s.tab.forEach((col, i) => { assert.equal(col.length, i + 1); col.forEach((x, k) => assert.equal(x.up, k === i)); });
  assert.equal(s.stock.length, 24);
});
test('the same deal number gives the same cards every time', () => {
  assert.deepEqual(E.deal(777, 1), E.deal(777, 1));
  assert.notDeepEqual(E.deal(777, 1).stock, E.deal(778, 1).stock);
});
test('columns: one lower, other colour; only a King on an empty column', () => {
  assert.equal(E.canStack(card(6, 1), [{ c: card(7, 0), up: true }]), true);    // red 6 on black 7
  assert.equal(E.canStack(card(6, 0), [{ c: card(7, 3), up: true }]), false);   // black on black
  assert.equal(E.canStack(card(5, 1), [{ c: card(7, 0), up: true }]), false);   // two lower
  assert.equal(E.canStack(card(6, 1), [{ c: card(7, 0), up: false }]), false);  // onto a face-down card
  assert.equal(E.canStack(card(13, 2), []), true);
  assert.equal(E.canStack(card(12, 2), []), false);
});
test('piles: Ace first, then the same suit one higher', () => {
  assert.equal(E.canFound(card(1, 2), []), true);
  assert.equal(E.canFound(card(2, 2), []), false);
  assert.equal(E.canFound(card(2, 2), [card(1, 2)]), true);
  assert.equal(E.canFound(card(2, 1), [card(1, 2)]), false);
});
test('turning the deck: one or three at a time, then over again with as many passes as you like', () => {
  const s = E.deal(5, 3);
  E.apply(s, { t: 'draw' });
  assert.equal(s.waste.length, 3); assert.equal(s.stock.length, 21);
  for (let i = 0; i < 7; i++) E.apply(s, { t: 'draw' });
  assert.equal(s.stock.length, 0);
  const fx = E.apply(s, { t: 'draw' });
  assert.equal(fx.recycled, true); assert.equal(s.stock.length, 24); assert.equal(s.waste.length, 0); assert.equal(s.passes, 1);
  const one = E.deal(5, 1); E.apply(one, { t: 'draw' }); assert.equal(one.waste.length, 1);
});
test('points: +10 up to a pile, +5 deck to column, +5 a card turned over, -15 back down, never below 0', () => {
  const s = blank();
  s.waste = [card(1, 0)];
  s.tab[0] = [{ c: card(9, 3), up: false }, { c: card(8, 1), up: true }];
  s.tab[1] = [{ c: card(10, 1), up: true }];
  let fx = E.apply(s, { t: 'move', from: { p: 'w' }, to: { p: 'f', i: 0 } });
  assert.equal(fx.points, 10); assert.equal(s.score, 10);
  fx = E.apply(s, { t: 'move', from: { p: 't', i: 0, n: 1 }, to: { p: 't', i: 1 } });   // hmm: 8 red onto 10 red is illegal
  assert.equal(fx, null);
  s.tab[1] = [{ c: card(9, 0), up: true }];
  fx = E.apply(s, { t: 'move', from: { p: 't', i: 0, n: 1 }, to: { p: 't', i: 1 } });
  assert.equal(fx.flipped.length, 1); assert.equal(fx.points, 5); assert.equal(s.tab[0][0].up, true);
  assert.equal(s.score, 15);
  s.tab[2] = [{ c: card(2, 1), up: true }];
  fx = E.apply(s, { t: 'move', from: { p: 'f', i: 0 }, to: { p: 't', i: 2 } });   // the black Ace back down onto a red 2
  assert.equal(fx.points, -15); assert.equal(s.score, 0);
  s.waste = [card(13, 3)];
  fx = E.apply(s, { t: 'move', from: { p: 'w' }, to: { p: 't', i: 3 } });
  assert.equal(fx.points, 5); assert.equal(s.score, 5);
  s.found[1] = [card(1, 2)]; s.tab[4] = [{ c: card(2, 0), up: true }];
  E.apply(s, { t: 'move', from: { p: 'f', i: 1 }, to: { p: 't', i: 4 } });   // 5 - 15 stops at 0
  assert.equal(s.score, 0);
});
test('a run of cards moves together; a part-run is fine; a face-down card never moves', () => {
  const s = blank();
  s.tab[0] = [{ c: card(5, 0), up: false }, { c: card(9, 3), up: true }, { c: card(8, 1), up: true }, { c: card(7, 0), up: true }];
  s.tab[1] = [{ c: card(10, 1), up: true }];
  s.tab[2] = [{ c: card(9, 0), up: true }];
  assert.equal(E.apply(s, { t: 'move', from: { p: 't', i: 0, n: 4 }, to: { p: 't', i: 1 } }), null);   // the face-down 5 can't come too
  assert.ok(E.apply(s, { t: 'move', from: { p: 't', i: 0, n: 3 }, to: { p: 't', i: 1 } }));
  assert.equal(s.tab[1].length, 4); assert.equal(s.tab[0][0].up, true);
  assert.equal(E.apply(s, { t: 'move', from: { p: 't', i: 0, n: 1 }, to: { p: 't', i: 2 } }), null);   // a black 5 on a black 9
  assert.ok(E.apply(s, { t: 'move', from: { p: 't', i: 1, n: 2 }, to: { p: 't', i: 2 } }));             // red 8 + black 7 onto the black 9
  assert.deepEqual(s.tab[2].map((x) => x.c), [card(9, 0), card(8, 1), card(7, 0)]);
});
test('a tap finds the best place: up to a pile first, else a column; a King already at the bottom stays put', () => {
  const s = blank();
  s.found[0] = [card(1, 1)];
  s.tab[0] = [{ c: card(2, 1), up: true }];
  s.tab[1] = [{ c: card(3, 0), up: true }];
  assert.deepEqual(E.smartMove(s, { p: 't', i: 0, n: 1 }).to, { p: 'f', i: 0 });
  s.tab[2] = [{ c: card(13, 0), up: true }];
  assert.equal(E.smartMove(s, { p: 't', i: 2, n: 1 }), null);
  s.tab[3] = [{ c: card(4, 3), up: false }, { c: card(13, 1), up: true }];
  assert.deepEqual(E.smartMove(s, { p: 't', i: 3, n: 1 }).to.p, 't');
});
test('moving up for you only when it is plainly safe', () => {
  const s = blank();
  s.found = [[card(1, 0), card(2, 0)], [card(1, 1)], [card(1, 2)], [card(1, 3)]];
  s.tab[0] = [{ c: card(3, 0), up: true }];
  assert.equal(E.safeToFound(s, card(3, 0)), false);   // a red 2 might still need the black 3
  s.found[1].push(card(2, 1)); s.found[2].push(card(2, 2));
  assert.equal(E.safeToFound(s, card(3, 0)), true);
  assert.deepEqual(E.autoMove(s).to, { p: 'f', i: 0 });
});
test('the hint offers a real move, the deck when that helps, and nothing when there is nothing', () => {
  for (const seed of [1, 2, 3, 40, 99]) {
    const s = E.deal(seed, 1), h = E.hint(s);
    if (h && h.t === 'move') assert.ok(E.legal(s, h), 'hint move must be legal for deal ' + seed);
  }
  const s = blank(); s.tab[0] = [{ c: card(5, 0), up: false }, { c: card(9, 1), up: true }]; s.tab[1] = [{ c: card(4, 1), up: true }];
  s.stock = [card(12, 0)];
  assert.equal(E.hint(s), null);
  assert.equal(E.stuck(s), true);
  s.stock = [card(13, 0)];   // a King in the deck, and empty columns for it - worth turning the deck
  assert.deepEqual(E.hint(s), { t: 'draw' });
  assert.equal(E.stuck(s), false);
});
test('finishing off: once every card is face up the rest goes up automatically to a win', () => {
  for (const seed of D.d1.slice(0, 5)) {
    const r = S.solve(seed, 1, 30000);
    assert.ok(r.won);
    const s = E.deal(seed, 1);
    let i = 0;
    while (!E.finishable(s) && i < r.moves.length) E.apply(s, r.moves[i++]);
    let guard = 0;
    while (!s.won && guard++ < 2000) { const m = E.finishStep(s); assert.ok(m); assert.ok(E.apply(s, m)); }
    assert.equal(s.won, true, 'deal ' + seed + ' finished');
    assert.equal(count(s), 52);
  }
});
test('the deal lists: proven winnable (a sample is solved again and replayed), no repeats', () => {
  assert.equal(D.d1.length, 3000); assert.equal(D.d3.length, 1500);
  assert.equal(new Set(D.d1).size, D.d1.length); assert.equal(new Set(D.d3).size, D.d3.length);
  const pick = (list) => [0, 1, 2, 500, 1499, list.length - 1].map((i) => list[i]);
  for (const seed of pick(D.d1)) { const r = S.solve(seed, 1, 30000); assert.ok(r.won && S.replay(seed, 1, r.moves), 'one-card deal ' + seed); }
  for (const seed of pick(D.d3)) { const r = S.solve(seed, 3, 30000); assert.ok(r.won && S.replay(seed, 3, r.moves), 'three-card deal ' + seed); }
});
test('cards are never lost or doubled through a whole solved game', () => {
  const seed = D.d3[7], r = S.solve(seed, 3, 30000), s = E.deal(seed, 3);
  for (const m of r.moves) { assert.ok(E.apply(s, m)); assert.equal(count(s), 52); }
  assert.equal(s.won, true);
});

// 4 Oct 2026: difficulty levels - 1 Easy (turn one), 3 Normal (turn three), 5 Hard (three times through), 7 Expert (once through)
test('levels: Easy and Normal are the old one-card and three-card games, unlimited', () => {
  const e = E.deal(42, 1), n = E.deal(42, 3);
  assert.deepEqual([e.draw, e.lv, e.limit, n.draw, n.lv, n.limit], [1, 1, 0, 3, 3, 0]);
  assert.deepEqual(e.tab, n.tab);   // the same deal number is the same cards at every level
  const old = E.deal(42, 2);        // anything unknown falls back to Easy, as the old code did
  assert.deepEqual([old.draw, old.lv], [1, 1]);
});
const throughOnce = (s) => { let guard = 0; while (s.stock.length && guard++ < 60) E.apply(s, { t: 'draw' }); };
test('Hard: the deck can be turned over twice more (three times through), then no more', () => {
  const s = E.deal(42, 5);
  assert.deepEqual([s.draw, s.limit], [3, 3]);
  for (let pass = 1; pass <= 3; pass++) {
    throughOnce(s);
    assert.equal(s.stock.length, 0);
    if (pass < 3) { assert.ok(E.legal(s, { t: 'draw' }), 'turn over after pass ' + pass); E.apply(s, { t: 'draw' }); }
  }
  assert.equal(s.passes, 2);
  assert.equal(E.legal(s, { t: 'draw' }), false, 'a fourth time through is refused');
  assert.equal(E.apply(s, { t: 'draw' }), null);
  assert.equal(E.canRecycle(s), false);
});
test('Expert: once through the deck, and the hint never suggests turning over a spent deck', () => {
  const s = E.deal(42, 7);
  throughOnce(s);
  assert.equal(E.legal(s, { t: 'draw' }), false);
  const h = E.hint(s);
  assert.ok(h === null || h.t === 'move', 'hint: ' + JSON.stringify(h));
  // only the cards still reachable count: the waste top, nothing from a deck that cannot be turned again
  assert.deepEqual(E.reachable(s), s.waste.length ? [s.waste[s.waste.length - 1]] : []);
});
test('levels survive clone (Undo) and old saved games without a level still work', () => {
  const s = E.deal(9, 5); E.apply(s, { t: 'draw' });
  const c = E.clone(s);
  assert.deepEqual([c.lv, c.limit, c.passes], [5, 3, 0]);
  const legacy = E.deal(9, 3); delete legacy.lv; delete legacy.limit;   // saved before 4 Oct
  const lc = E.clone(legacy);
  assert.deepEqual([lc.lv, lc.limit], [3, 0]);
  throughOnce(legacy); assert.ok(E.legal(legacy, { t: 'draw' }), 'an old game turns over freely');
});
test('finishing off: Easy with cards left in the deck still finishes; Hard does not assume it can', () => {
  const easy = { seed: 0, draw: 1, lv: 1, limit: 0, tab: [[], [], [], [], [], [], []], stock: [1], waste: [], found: [[0], [], [], []], moves: 0, score: 0, passes: 0, undos: 0, won: false };
  assert.equal(E.finishable(easy), true);
  const hard = Object.assign({}, easy, { draw: 3, lv: 5, limit: 3 });
  assert.equal(E.finishable(hard), false);
});
