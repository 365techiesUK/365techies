/* 365 Pyramid - the rules, with no screen code (4 Oct 2026; owner: "yes build TriPeaks and Pyramid").
 * 28 cards face up in a pyramid of seven rows; the other 24 in the deck. Take away two uncovered cards that add up to
 * 13 - Ace 1, Jack 11, Queen 12 - so a 6 with a 7, a Queen with an Ace; a King (13) goes on its own. Turn cards from
 * the deck onto a pile: its top card pairs too. Clear the whole pyramid to win.
 * Levels: deal(seed, lv) - 1 Easy (through the deck as often as you like, Undo + Hint), 3 Normal (three times through),
 * 5 Hard (twice, no Hint), 7 Expert (once, no Undo, no Hint). s.limit = times through the deck (0 = no limit).
 * The page loads this as window.PyEngine; the tests and tools/pyramid/*.cjs require() it; api/games-py-lib.php is a
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

  // The 28 places, row by row from the top: row r holds r + 1 cards, place = r(r+1)/2 + k. COVER[i] = the two places
  // lying over place i (the row below); ROW[i] its row.
  var COVER = [], ROW = [];
  (function () {
    for (var r = 0; r < 7; r++) for (var k = 0; k <= r; k++) {
      ROW.push(r);
      COVER.push(r < 6 ? [(r + 1) * (r + 2) / 2 + k, (r + 1) * (r + 2) / 2 + k + 1] : []);
    }
  })();
  var LIMIT = { 1: 0, 3: 3, 5: 2, 7: 1 };

  // A game: tab[i] = the card at place i, or null once taken away; stock = the deck (last = next), waste = the pile
  // turned from it (last = top), done = the cards taken away
  function deal(seed, lv) {
    lv = LIMIT.hasOwnProperty(lv) ? lv : 1;
    var d = shuffled(seed);
    return { seed: seed, lv: lv, limit: LIMIT[lv], tab: d.slice(0, 28), stock: d.slice(28), waste: [], done: [], passes: 0, moves: 0, score: 0, won: false };
  }
  function clone(s) {
    return { seed: s.seed, lv: s.lv, limit: s.limit, tab: s.tab.slice(), stock: s.stock.slice(), waste: s.waste.slice(), done: s.done.slice(),
             passes: s.passes, moves: s.moves, score: s.score, won: s.won };
  }
  function top(a) { return a.length ? a[a.length - 1] : undefined; }
  function free(s, i) { var cv = COVER[i]; return s.tab[i] != null && (!cv.length || (s.tab[cv[0]] == null && s.tab[cv[1]] == null)); }
  function canRecycle(s) { return !s.limit || s.passes + 1 < s.limit; }
  // a place a card can be taken from: {p:'t', i} in the pyramid, or {p:'w'} the top of the pile
  function cardAt(s, pos) {
    if (!pos) return null;
    if (pos.p === 'w') return s.waste.length ? top(s.waste) : null;
    if (pos.p === 't' && pos.i >= 0 && pos.i < 28 && free(s, pos.i)) return s.tab[pos.i];
    return null;
  }
  function same(a, b) { return a.p === b.p && (a.p === 'w' || a.i === b.i); }
  function left(s) { var n = 0; for (var i = 0; i < 28; i++) if (s.tab[i] != null) n++; return n; }
  function legal(s, m) {
    if (s.won || !m) return false;
    if (m.t === 'draw') return s.stock.length > 0 || (s.waste.length > 0 && canRecycle(s));
    if (m.t !== 'move' || !m.from || !m.to) return false;
    var a = cardAt(s, m.from); if (a == null) return false;
    if (m.to.p === 'f') return rank(a) === 13;                       // a King on its own, to the cleared pile
    var b = cardAt(s, m.to); if (b == null || same(m.from, m.to)) return false;
    return rank(a) + rank(b) === 13;
  }
  // points: 10 a pair (or a King); a row of the pyramid cleared +50; the whole pyramid +500
  function apply(s, m) {
    if (!legal(s, m)) return null;
    var fx = { t: m.t, cards: [], flipped: [], points: 0, toFound: false, won: false };
    if (m.t === 'draw') {
      if (s.stock.length) { var c = s.stock.pop(); s.waste.push(c); fx.cards = [c]; }
      else { s.stock = s.waste.reverse(); s.waste = []; s.passes++; fx.recycled = true; if (s.limit) fx.left = s.limit - s.passes - 1; }
    } else {
      var rowsBefore = rowsLeft(s), take = [m.from];
      if (m.to.p !== 'f') take.push(m.to);
      take.forEach(function (pos) {
        var card = cardAt(s, pos);
        if (pos.p === 'w') s.waste.pop(); else s.tab[pos.i] = null;
        fx.cards.push(card); s.done.push(card);
      });
      fx.toFound = true; fx.popCards = fx.cards.slice(); fx.points = 10;
      var cleared = rowsBefore - rowsLeft(s);
      if (cleared > 0) { fx.points += 50 * cleared; fx.big = true; }
      if (!left(s)) { s.won = true; fx.won = true; fx.points += 500; }
      s.score += fx.points;
    }
    s.moves++;
    return fx;
  }
  function rowsLeft(s) { var n = 0, r, k; for (r = 0; r < 7; r++) for (k = 0; k <= r; k++) if (s.tab[r * (r + 1) / 2 + k] != null) { n++; break; } return n; }
  function avail(s) {   // every card that can be taken now, with where it is
    var out = [];
    for (var i = 0; i < 28; i++) if (free(s, i)) out.push({ p: 't', i: i });
    if (s.waste.length) out.push({ p: 'w' });
    return out;
  }
  function partners(s, from) {   // the cards that would go with this one
    var a = cardAt(s, from); if (a == null) return [];
    if (rank(a) === 13) return [{ p: 'f' }];
    return avail(s).filter(function (pos) { return !same(pos, from) && rank(cardAt(s, pos)) + rank(a) === 13; });
  }
  function takes(s) {   // every legal take-away: Kings first, then pairs that free the most of the pyramid
    var a = avail(s), out = [], i, j;
    for (i = 0; i < a.length; i++) if (rank(cardAt(s, a[i])) === 13) out.push({ m: { t: 'move', from: a[i], to: { p: 'f' } }, w: 100 });
    for (i = 0; i < a.length; i++) for (j = i + 1; j < a.length; j++) {
      if (rank(cardAt(s, a[i])) + rank(cardAt(s, a[j])) !== 13) continue;
      var w = 10;
      [a[i], a[j]].forEach(function (pos) { if (pos.p === 't') w += 20 + (6 - ROW[pos.i]) * 2; });
      out.push({ m: { t: 'move', from: a[j].p === 'w' ? a[j] : a[i], to: a[j].p === 'w' ? a[i] : a[j] }, w: w });
    }
    out.sort(function (x, y) { return y.w - x.w; });
    return out;
  }
  function hint(s) {
    if (s.won) return null;
    var t = takes(s);
    if (t.length) return t[0].m;
    return legal(s, { t: 'draw' }) ? { t: 'draw' } : null;
  }
  function stuck(s) { return !s.won && !takes(s).length && !legal(s, { t: 'draw' }); }
  function smartMove(s, from) {   // a tap on a King takes it away; any other card waits for its partner (the table asks)
    var a = cardAt(s, from);
    return a != null && rank(a) === 13 ? { t: 'move', from: from, to: { p: 'f' } } : null;
  }
  // a move as a short code, for the Hall of Fame's replay: d = the deck, kt12 / kw = a King, xt3.t9 / xw.t21 = a pair
  function posCode(p) { return p.p === 'w' ? 'w' : 't' + p.i; }
  function code(m) { return m.t === 'draw' ? 'd' : m.to.p === 'f' ? 'k' + posCode(m.from) : 'x' + posCode(m.from) + '.' + posCode(m.to); }
  function posOf(t) { if (t === 'w') return { p: 'w' }; var x = /^t(\d{1,2})$/.exec(t); return x && +x[1] < 28 ? { p: 't', i: +x[1] } : null; }
  function decode(c) {
    c = String(c);
    if (c === 'd') return { t: 'draw' };
    var x = /^k(w|t\d{1,2})$/.exec(c);
    if (x) { var f = posOf(x[1]); return f ? { t: 'move', from: f, to: { p: 'f' } } : null; }
    x = /^x(w|t\d{1,2})\.(w|t\d{1,2})$/.exec(c);
    if (x) { var a = posOf(x[1]), b = posOf(x[2]); return a && b ? { t: 'move', from: a, to: b } : null; }
    return null;
  }

  var api = { deal: deal, clone: clone, legal: legal, apply: apply, avail: avail, partners: partners, takes: takes, hint: hint, stuck: stuck,
              smartMove: smartMove, free: free, cardAt: cardAt, same: same, left: left, canRecycle: canRecycle, code: code, decode: decode,
              shuffled: shuffled, rank: rank, suit: suit, red: red, SUIT_NAME: SUIT_NAME, COVER: COVER, ROW: ROW, LIMIT: LIMIT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PyEngine = api;
})(typeof window !== 'undefined' ? window : this);
