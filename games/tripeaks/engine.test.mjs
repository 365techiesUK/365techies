// 365 TriPeaks rules - run: node --test games/tripeaks/engine.test.mjs  (*.test.mjs is never deployed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('./engine.js');

const card = (r, s) => s * 13 + (r - 1);   // s: 0 spades, 1 hearts, 2 diamonds, 3 clubs
const play = (i) => ({ t: 'move', from: { p: 't', i }, to: { p: 'w' } });

test('the deal: 28 in the peaks, 23 in the deck, one on the pile - all 52 once; bottom row face up', () => {
  for (const lv of [1, 3, 5, 7]) {
    const s = E.deal(42, lv), all = s.tab.map((x) => x.c).concat(s.stock, s.waste);
    assert.equal(s.tab.length, 28); assert.equal(s.stock.length, 23); assert.equal(s.waste.length, 1);
    assert.equal(new Set(all).size, 52);
    assert.ok(s.tab.slice(18).every((x) => x.up));
    assert.equal(s.tab.slice(0, 18).every((x) => x.up), lv === 1, 'Easy: all face up; otherwise face down');
    assert.equal(s.wrap, lv <= 3);
  }
  assert.deepEqual(E.deal(42, 1).tab.map((x) => x.c), E.deal(42, 7).tab.map((x) => x.c), 'the same cards at every level');
});
test('the peaks: the three tops each lie under two cards, and each peak needs its own part of the bottom row', () => {
  assert.deepEqual(E.COVER[0], [3, 4]); assert.deepEqual(E.COVER[2], [7, 8]);
  assert.deepEqual(E.COVER[3], [9, 10]); assert.deepEqual(E.COVER[8], [16, 17]);
  assert.deepEqual(E.COVER[9], [18, 19]); assert.deepEqual(E.COVER[17], [26, 27]);
  assert.deepEqual(E.COVER[27], []);
  assert.deepEqual(E.PEAK[1].slice().sort((a, b) => a - b), [1, 5, 6, 12, 13, 14, 21, 22, 23, 24]);
});
test('one higher or one lower; King and Ace join only on Easy and Normal', () => {
  const s = E.deal(1, 1);
  s.waste = [card(13, 0)];
  assert.ok(E.fits(s, card(12, 1))); assert.ok(E.fits(s, card(1, 2)), 'K then A round the corner');
  assert.ok(!E.fits(s, card(13, 3))); assert.ok(!E.fits(s, card(11, 3)));
  s.wrap = false; assert.ok(!E.fits(s, card(1, 2)), 'no corner at Hard');
});
test('playing a card: it goes on the pile, the cards it freed turn over, a run scores more each time', () => {
  const s = E.deal(7, 3);
  s.tab[18] = { c: card(5, 0), up: true }; s.tab[19] = { c: card(6, 1), up: true }; s.waste = [card(4, 3)];
  const under = s.tab[9].c;
  let fx = E.apply(s, play(18));
  assert.ok(fx && fx.toFound); assert.equal(s.waste[s.waste.length - 1], card(5, 0)); assert.equal(fx.points, 10); assert.equal(s.tab[18], null);
  assert.equal(s.tab[9].up, false, 'one of its two covers is still there');
  fx = E.apply(s, play(19));
  assert.equal(fx.points, 20, 'second in the run'); assert.deepEqual(fx.flipped, [under]); assert.equal(s.tab[9].up, true);
  E.apply(s, { t: 'draw' });
  assert.equal(s.run, 0, 'turning a card from the deck ends the run');
});
test('a covered or face-down card can not be played; nor one that does not fit', () => {
  const s = E.deal(3, 3);
  s.waste = [card(2, 0)]; s.tab[9] = { c: card(3, 1), up: true };
  assert.ok(!E.legal(s, play(9)), 'still covered');
  s.tab[18] = { c: card(9, 0), up: true };
  assert.ok(!E.legal(s, play(18)), 'a 9 on a 2');
  assert.equal(E.decode('p27').from.i, 27); assert.equal(E.decode('p28'), null); assert.equal(E.decode('x'), null);
  assert.equal(E.code(play(12)), 'p12'); assert.equal(E.code({ t: 'draw' }), 'd');
});
test('a peak cleared scores 250, the last card wins; stuck when nothing fits and the deck is empty', () => {
  const s = E.deal(5, 1);
  for (let i = 1; i < 28; i++) s.tab[i] = null;
  s.tab[0] = { c: card(8, 0), up: true }; s.waste = [card(7, 1)]; s.peaks = 2;
  const fx = E.apply(s, play(0));
  assert.ok(fx.won && s.won); assert.equal(fx.points, 10 + 250 + 500);
  const t = E.deal(5, 5); t.stock = []; t.waste = [card(13, 0)];
  for (let i = 18; i < 28; i++) t.tab[i] = { c: card(5, i % 4), up: true };
  assert.ok(E.stuck(t)); assert.equal(E.hint(t), null);
});
test('the hint plays a card that fits, or turns the deck', () => {
  const s = E.deal(11, 1), h = E.hint(s);
  assert.ok(h);
  assert.ok(E.legal(s, h));
});
