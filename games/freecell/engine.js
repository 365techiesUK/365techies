/* 365 FreeCell - the rules, with no screen code (3 Oct 2026). Every card is dealt face up into 8 columns; 4 free cells
 * hold one card each; build the 4 piles by suit from Ace to King. In the columns, a card goes on one a step higher of
 * the other colour; any card may go in an empty column. A run moves together when there is room to do it one card at a
 * time: (free cells + 1) x 2^(empty columns), not counting the column it goes to.
 * The deals are Microsoft FreeCell's - the same shuffle (Rosetta Code, "Deal cards for FreeCell"), so Deal #1 here is
 * Game #1 there. Every deal from 1 to 32000 can be won except #11982.
 * A card is 0-51 in our numbering (suit * 13 + rank - 1, as in Solitaire): suit 0 spades, 1 hearts, 2 diamonds, 3 clubs.
 * The page loads this as window.FcEngine; the tests require() it. */
(function (root) {
  'use strict';
  function suit(c) { return (c / 13) | 0; }
  function rank(c) { return (c % 13) + 1; }
  function red(c) { var s = suit(c); return s === 1 || s === 2; }
  function top(a) { return a.length ? a[a.length - 1] : undefined; }

  // Microsoft numbers a card rank * 4 + suit with suits Clubs, Diamonds, Hearts, Spades
  var MS_SUIT = [3, 2, 1, 0];
  function fromMs(m) { return MS_SUIT[m % 4] * 13 + ((m / 4) | 0); }
  // the 52 cards in dealing order; card k goes to column k % 8
  function msOrder(seed) {
    var cards = [], i, state = seed >>> 0;
    for (i = 0; i < 52; i++) cards.push(51 - i);
    for (i = 0; i < 52; i++) {
      state = (state * 214013 + 2531011) % 2147483648;   // exact in doubles: state < 2^31, x 214013 < 2^49
      var r = Math.floor(state / 65536), j = 51 - (r % (52 - i)), t = cards[i];
      cards[i] = cards[j]; cards[j] = t;
    }
    return cards.map(fromMs);
  }
  function deal(seed) {
    var order = msOrder(seed), tab = [[], [], [], [], [], [], [], []];
    order.forEach(function (c, k) { tab[k % 8].push(c); });
    return { seed: seed, tab: tab, cells: [null, null, null, null], found: [[], [], [], []], moves: 0, score: 0, won: false };
  }
  function clone(s) {
    return { seed: s.seed, tab: s.tab.map(function (c) { return c.slice(); }), cells: s.cells.slice(), found: s.found.map(function (f) { return f.slice(); }),
             moves: s.moves, score: s.score, won: s.won };
  }

  function canStack(card, col) {
    if (!col.length) return true;
    var t = top(col);
    return red(t) !== red(card) && rank(t) === rank(card) + 1;
  }
  function canFound(card, f) {
    if (!f.length) return rank(card) === 1;
    var t = top(f);
    return suit(t) === suit(card) && rank(card) === rank(t) + 1;
  }
  function foundFor(s, card) {   // its own suit's pile, else the first empty pile for an Ace
    var i, empty = -1;
    for (i = 0; i < 4; i++) {
      if (s.found[i].length && suit(s.found[i][0]) === suit(card)) return canFound(card, s.found[i]) ? i : -1;
      if (!s.found[i].length && empty < 0) empty = i;
    }
    return rank(card) === 1 ? empty : -1;
  }
  function foundHeight(s, su) { for (var i = 0; i < 4; i++) if (s.found[i].length && suit(s.found[i][0]) === su) return s.found[i].length; return 0; }
  function safeToFound(s, card) {   // nothing still in play could ever need to sit on it
    var r = rank(card); if (r <= 2) return true;
    var other = red(card) ? [0, 3] : [1, 2];
    return foundHeight(s, other[0]) >= r - 1 && foundHeight(s, other[1]) >= r - 1;
  }
  function runLen(col) {   // the cards on top that already go in order, other colour each time
    if (!col.length) return 0;
    var n = 1;
    for (var k = col.length - 1; k > 0; k--) { var a = col[k], b = col[k - 1]; if (red(a) !== red(b) && rank(b) === rank(a) + 1) n++; else break; }
    return n;
  }
  function freeCells(s) { var n = 0; for (var i = 0; i < 4; i++) if (s.cells[i] === null) n++; return n; }
  function emptyCols(s) { var n = 0; for (var i = 0; i < 8; i++) if (!s.tab[i].length) n++; return n; }
  function maxMove(s, toEmpty) { return (freeCells(s) + 1) * Math.pow(2, Math.max(0, emptyCols(s) - (toEmpty ? 1 : 0))); }

  // the cards a move would pick up: {p:'t', i, n} the top n of a column, {p:'c', i} a free cell
  function picked(s, from) {
    if (from.p === 'c') return s.cells[from.i] !== null && s.cells[from.i] !== undefined ? [s.cells[from.i]] : [];
    if (from.p !== 't' || !s.tab[from.i]) return [];
    var col = s.tab[from.i], n = from.n || 1;
    if (n < 1 || n > runLen(col)) return [];
    return col.slice(col.length - n);
  }
  function legal(s, m) {
    if (s.won || !m || m.t !== 'move' || !m.from || !m.to) return false;
    var cards = picked(s, m.from); if (!cards.length) return false;
    var to = m.to;
    if (to.p === 'c') return cards.length === 1 && to.i >= 0 && to.i < 4 && s.cells[to.i] === null && m.from.p !== 'c';
    if (to.p === 'f') { var f = s.found[to.i]; return !!f && cards.length === 1 && canFound(cards[0], f) && (f.length > 0 || foundFor(s, cards[0]) >= 0); }
    if (to.p === 't') {
      if (m.from.p === 't' && m.from.i === to.i) return false;
      var col = s.tab[to.i]; if (!col) return false;
      return canStack(cards[0], col) && cards.length <= maxMove(s, col.length === 0);
    }
    return false;
  }
  function apply(s, m) {
    if (!legal(s, m)) return null;
    var cards = picked(s, m.from), fx = { t: 'move', cards: cards, flipped: [], points: 0, toFound: false, won: false };
    if (m.from.p === 't') s.tab[m.from.i].splice(s.tab[m.from.i].length - cards.length, cards.length);
    else s.cells[m.from.i] = null;
    if (m.to.p === 't') for (var k = 0; k < cards.length; k++) s.tab[m.to.i].push(cards[k]);
    else if (m.to.p === 'c') s.cells[m.to.i] = cards[0];
    else { s.found[m.to.i].push(cards[0]); fx.toFound = true; fx.points = 10; }
    s.score = Math.max(0, s.score + fx.points);
    s.moves++;
    if (s.found[0].length + s.found[1].length + s.found[2].length + s.found[3].length === 52) { s.won = true; fx.won = true; }
    return fx;
  }

  function tops(s) {   // every card that could move on its own: column tops, then free cells
    var out = [], i;
    for (i = 0; i < 8; i++) if (s.tab[i].length) out.push({ c: top(s.tab[i]), from: { p: 't', i: i, n: 1 } });
    for (i = 0; i < 4; i++) if (s.cells[i] !== null) out.push({ c: s.cells[i], from: { p: 'c', i: i } });
    return out;
  }
  function autoMove(s, keepDown) {   // the next card that can safely go up to its pile
    var t = tops(s);
    for (var k = 0; k < t.length; k++) {
      if (t[k].c === keepDown) continue;
      var f = foundFor(s, t[k].c);
      if (f >= 0 && safeToFound(s, t[k].c)) return { t: 'move', from: t[k].from, to: { p: 'f', i: f } };
    }
    return null;
  }

  // every legal move, each with a rough worth (for the hint), leaving out moves that just shuffle cards about
  function allMoves(s) {
    var out = [], i, j, k;
    tops(s).forEach(function (t) {
      var f = foundFor(s, t.c);
      if (f >= 0) out.push({ m: { t: 'move', from: t.from, to: { p: 'f', i: f } }, w: 100 + (14 - rank(t.c)) });
    });
    for (i = 0; i < 8; i++) {
      var col = s.tab[i], rl = runLen(col);
      for (k = 1; k <= rl; k++) {
        var from = { p: 't', i: i, n: k }, base = col[col.length - k], leaves = col.length - k, under = leaves > 0 ? col[leaves - 1] : null;
        for (j = 0; j < 8; j++) {
          if (j === i) continue;
          var m = { t: 'move', from: from, to: { p: 't', i: j } };
          if (!legal(s, m)) continue;
          var toEmpty = !s.tab[j].length;
          if (toEmpty && !leaves) continue;            // a whole column into an empty one: pointless
          if (toEmpty && k < rl) continue;             // into an empty column, take the whole run
          if (!toEmpty && k < rl && under !== null && red(under) !== red(base) && rank(under) === rank(base) + 1) continue;   // splitting a good run
          var w = toEmpty ? 20 : 50 + k;
          if (!leaves) w += 25;                         // empties a column
          else if (foundFor(s, under) >= 0) w += 30;   // frees a card for the piles
          out.push({ m: m, w: w });
        }
      }
    }
    for (i = 0; i < 4; i++) {
      var c = s.cells[i]; if (c === null) continue;
      for (j = 0; j < 8; j++) { var mc = { t: 'move', from: { p: 'c', i: i }, to: { p: 't', i: j } }; if (legal(s, mc)) out.push({ m: mc, w: s.tab[j].length ? 60 : 15 }); }
    }
    var cell = s.cells.indexOf(null);
    if (cell >= 0) for (i = 0; i < 8; i++) {
      var cl = s.tab[i]; if (!cl.length) continue;
      var u = cl.length > 1 ? cl[cl.length - 2] : null;
      out.push({ m: { t: 'move', from: { p: 't', i: i, n: 1 }, to: { p: 'c', i: cell } }, w: u !== null && foundFor(s, u) >= 0 ? 40 : 5 });
    }
    out.sort(function (a, b) { return b.w - a.w; });
    return out;
  }
  function hint(s) { if (s.won) return null; var a = allMoves(s); return a.length ? a[0].m : null; }
  function stuck(s) { return !s.won && allMoves(s).length === 0; }

  // a tap: up to a pile, else onto a column, else an empty column, else a free cell
  function smartMove(s, from) {
    var cards = picked(s, from); if (!cards.length) return null;
    var c = cards[0], i;
    if (cards.length === 1) { var f = foundFor(s, c); if (f >= 0) return { t: 'move', from: from, to: { p: 'f', i: f } }; }
    for (i = 0; i < 8; i++) { if (from.p === 't' && from.i === i) continue; var m = { t: 'move', from: from, to: { p: 't', i: i } }; if (s.tab[i].length && legal(s, m)) return m; }
    var whole = from.p === 't' && s.tab[from.i].length === cards.length;
    if (!whole) for (i = 0; i < 8; i++) { var me = { t: 'move', from: from, to: { p: 't', i: i } }; if (!s.tab[i].length && legal(s, me)) return me; }
    if (cards.length === 1 && from.p === 't') { var cell = s.cells.indexOf(null); if (cell >= 0) return { t: 'move', from: from, to: { p: 'c', i: cell } }; }
    return null;
  }

  // the rest can go up to the piles one by one, whatever order is needed
  function finishable(s) {
    if (s.won) return false;
    var t = clone(s), guard = 0;
    while (!t.won && guard++ < 60) { var m = finishStep(t); if (!m) return false; apply(t, m); }
    return t.won;
  }
  function finishStep(s) {   // the lowest card that can go up now
    var best = null, br = 99;
    tops(s).forEach(function (t) { var f = foundFor(s, t.c); if (f >= 0 && rank(t.c) < br) { br = rank(t.c); best = { t: 'move', from: t.from, to: { p: 'f', i: f } }; } });
    return best;
  }

  var api = { deal: deal, msOrder: msOrder, clone: clone, legal: legal, apply: apply, picked: picked, runLen: runLen, maxMove: maxMove,
              autoMove: autoMove, safeToFound: safeToFound, foundFor: foundFor, canStack: canStack, canFound: canFound,
              hint: hint, stuck: stuck, smartMove: smartMove, allMoves: allMoves, finishable: finishable, finishStep: finishStep,
              suit: suit, rank: rank, red: red };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FcEngine = api;
})(typeof window !== 'undefined' ? window : this);
