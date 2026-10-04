/* 365 TriPeaks - the rules, with no screen code (4 Oct 2026; owner: "yes build TriPeaks and Pyramid").
 * 28 cards in three overlapping peaks - rows of 3, 6, 9 and 10, the bottom row face up - and the other 24 below: one
 * turned up to start the pile, 23 in the deck. Play any uncovered card one higher or one lower than the top of the
 * pile; it goes on the pile and the card under it is freed. Stuck? Turn a card from the deck onto the pile (once
 * through the deck). Clear all three peaks to win. Cards played one after another make a run: each scores more.
 * Levels: deal(seed, lv) - 1 Easy (every card face up, King and Ace join round the corner, Undo + Hint), 3 Normal (the
 * peaks face down until uncovered, King-Ace joins), 5 Hard (King and Ace don't join, no Hint), 7 Expert (and no Undo).
 * The page loads this as window.TpEngine; the tests and tools/tripeaks/*.cjs require() it; api/games-tp-lib.php is a
 * line-for-line copy for the Hall of Fame (⚠ change one, change both - the parity test pins them together).
 * A card is a number 0-51: suit = card / 13 (0 spades, 1 hearts, 2 diamonds, 3 clubs), rank = card % 13 + 1. */
(function (root) {
  'use strict';

  var SUIT_NAME = ['spades', 'hearts', 'diamonds', 'clubs'];
  function suit(c) { return (c / 13) | 0; }
  function rank(c) { return (c % 13) + 1; }
  function red(c) { var s = suit(c); return s === 1 || s === 2; }

  // mulberry32, as Solitaire shuffles: the same deal number is the same deal on every computer
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(seed) {
    var d = [], r = rng(seed), i, j, t;
    for (i = 0; i < 52; i++) d.push(i);
    for (i = 51; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = d[i]; d[i] = d[j]; d[j] = t; }
    return d;
  }

  // The 28 places: row 0 = 0-2 (the three tops), row 1 = 3-8, row 2 = 9-17, row 3 = 18-27 (the bottom row).
  // COVER[i] = the two places lying over place i; a card is free once both are empty. ROW[i] = its row.
  var COVER = [], ROW = [], PEAK = [[], [], []];
  (function () {
    var p, j, k;
    for (p = 0; p < 3; p++) { COVER.push([3 + 2 * p, 4 + 2 * p]); ROW.push(0); }
    for (j = 0; j < 6; j++) { p = j >> 1; COVER.push([9 + 3 * p + (j & 1), 10 + 3 * p + (j & 1)]); ROW.push(1); }
    for (k = 0; k < 9; k++) { COVER.push([18 + k, 19 + k]); ROW.push(2); }
    for (k = 0; k < 10; k++) { COVER.push([]); ROW.push(3); }
    // which peak a place belongs to (the bottom row's shared cards count for both)
    for (p = 0; p < 3; p++) {
      PEAK[p].push(p, 3 + 2 * p, 4 + 2 * p);
      for (k = 0; k < 3; k++) PEAK[p].push(9 + 3 * p + k);
      for (k = 0; k < 4; k++) PEAK[p].push(18 + 3 * p + k);
    }
  })();
  var LV = { 1: { open: true, wrap: true }, 3: { open: false, wrap: true }, 5: { open: false, wrap: false }, 7: { open: false, wrap: false } };

  // A game: tab[i] = {c, up} or null once played; stock = the deck (last = next), waste = the pile (last = top)
  function deal(seed, lv) {
    lv = LV[lv] ? lv : 1;
    var d = shuffled(seed), tab = [], i;
    for (i = 0; i < 28; i++) tab.push({ c: d[i], up: LV[lv].open || i >= 18 });
    return { seed: seed, lv: lv, wrap: LV[lv].wrap, tab: tab, stock: d.slice(28, 51), waste: [d[51]], moves: 0, score: 0, run: 0, bestRun: 0, peaks: 0, won: false };
  }
  function clone(s) {
    return { seed: s.seed, lv: s.lv, wrap: s.wrap, tab: s.tab.map(function (x) { return x ? { c: x.c, up: x.up } : null; }),
             stock: s.stock.slice(), waste: s.waste.slice(), moves: s.moves, score: s.score, run: s.run, bestRun: s.bestRun, peaks: s.peaks, won: s.won };
  }
  function top(a) { return a.length ? a[a.length - 1] : undefined; }
  function free(s, i) {   // still in the peaks, with nothing lying over it (the bottom row never has anything over it)
    var cv = COVER[i];
    return !!s.tab[i] && (!cv.length || (!s.tab[cv[0]] && !s.tab[cv[1]]));
  }
  // one higher or one lower than the pile's top card; King and Ace join round the corner when the level allows
  function fits(s, c) {
    var w = top(s.waste); if (w == null) return true;
    var d = Math.abs(rank(c) - rank(w));
    return d === 1 || (s.wrap && d === 12);
  }
  function left(s) { var n = 0; for (var i = 0; i < 28; i++) if (s.tab[i]) n++; return n; }
  function legal(s, m) {
    if (s.won || !m) return false;
    if (m.t === 'draw') return s.stock.length > 0;
    if (m.t !== 'move' || !m.from || m.from.p !== 't' || !m.to || m.to.p !== 'w') return false;
    var i = m.from.i;
    return i >= 0 && i < 28 && free(s, i) && s.tab[i].up && fits(s, s.tab[i].c);
  }
  // points: each card in a run scores 10 more than the last (10, 20, 30 ...); a peak cleared +250, all three +500 more
  function apply(s, m) {
    if (!legal(s, m)) return null;
    var fx = { t: m.t, cards: [], flipped: [], points: 0, toFound: false, won: false };
    if (m.t === 'draw') {
      var c = s.stock.pop(); s.waste.push(c); fx.cards = [c]; s.run = 0;
    } else {
      var i = m.from.i, card = s.tab[i].c;
      s.tab[i] = null; s.waste.push(card);
      s.run++; if (s.run > s.bestRun) s.bestRun = s.run;
      fx.points = 10 * s.run; fx.cards = [card]; fx.toFound = true; fx.popCards = [card]; fx.run = s.run;
      // cards freed by it turn face up
      for (var j = 0; j < 18; j++) if (s.tab[j] && !s.tab[j].up && free(s, j)) { s.tab[j].up = true; fx.flipped.push(s.tab[j].c); }
      if (i < 3) { s.peaks++; fx.points += 250; fx.big = true; fx.say = s.peaks === 3 ? 'All three peaks cleared!' : 'Peak cleared! +250'; }
      if (!left(s)) { s.won = true; fx.won = true; fx.points += 500; }
      s.score += fx.points;
    }
    s.moves++;
    return fx;
  }
  function plays(s) {   // every card that can be played now
    var out = [];
    for (var i = 0; i < 28; i++) if (free(s, i) && s.tab[i].up && fits(s, s.tab[i].c)) out.push(i);
    return out;
  }
  // the hint: the play that starts the longest run through the cards you can SEE (never peeking at face-down ones),
  // freeing face-down cards on a tie; otherwise turn a card from the deck
  function hint(s) {
    if (s.won) return null;
    var p = plays(s), best = -1, bestScore = -1;
    for (var k = 0; k < p.length; k++) {
      var t = clone(s); apply(t, { t: 'move', from: { p: 't', i: p[k] }, to: { p: 'w' } });
      var sc = runFrom(t, 6) * 10 + t.tab.filter(function (x) { return x && x.up; }).length - s.tab.filter(function (x) { return x && x.up; }).length + (p[k] < 18 ? 1 : 0);
      if (sc > bestScore) { bestScore = sc; best = p[k]; }
    }
    if (best >= 0) return { t: 'move', from: { p: 't', i: best }, to: { p: 'w' } };
    return s.stock.length ? { t: 'draw' } : null;
  }
  function runFrom(s, depth) {   // the longest run of plays from here, through face-up cards only
    if (!depth) return 0;
    var p = plays(s), best = 0;
    for (var k = 0; k < p.length && k < 6; k++) {
      var t = clone(s); apply(t, { t: 'move', from: { p: 't', i: p[k] }, to: { p: 'w' } });
      var n = 1 + runFrom(t, depth - 1); if (n > best) best = n;
      if (best >= depth) break;
    }
    return best;
  }
  function stuck(s) { return !s.won && !s.stock.length && !plays(s).length; }
  function smartMove(s, from) {   // a tap: the card goes on the pile if it can
    var m = { t: 'move', from: from, to: { p: 'w' } };
    return legal(s, m) ? m : null;
  }
  // a move as a short code, for the Hall of Fame's replay: d = turn a card from the deck, p12 = play place 12
  function code(m) { return m.t === 'draw' ? 'd' : 'p' + m.from.i; }
  function decode(c) {
    if (c === 'd') return { t: 'draw' };
    var x = /^p(\d{1,2})$/.exec(String(c)); if (!x || +x[1] > 27) return null;
    return { t: 'move', from: { p: 't', i: +x[1] }, to: { p: 'w' } };
  }

  var api = { deal: deal, clone: clone, legal: legal, apply: apply, plays: plays, hint: hint, stuck: stuck, smartMove: smartMove,
              free: free, fits: fits, left: left, code: code, decode: decode, shuffled: shuffled,
              rank: rank, suit: suit, red: red, SUIT_NAME: SUIT_NAME, COVER: COVER, ROW: ROW, PEAK: PEAK, LV: LV };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TpEngine = api;
})(typeof window !== 'undefined' ? window : this);
