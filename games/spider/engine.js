/* 365 Spider - the rules, with no screen code (3 Oct 2026). Two packs (104 cards) in 10 columns: the first four get 6
 * cards, the rest 5, only the top card face up; the other 50 wait in the deck, 10 at a time. A card goes on any card a
 * step higher, whatever its suit; cards move together only when they run down in order IN ONE SUIT. A full suit from
 * King down to Ace in one column clears itself off the table; clear all eight to win. Dealing puts one card on every
 * column and needs every column filled first (the classic rule). One suit (all spades) is the easiest, then two
 * (spades and hearts), then four.
 * Points as in Windows Spider: start at 500, lose 1 a move, gain 100 for each suit cleared.
 * A card is 0-103: rank = card % 13 + 1; its suit depends on the game's suits (see suitOf).
 * The page loads this as window.SpEngine; the tests require() it. */
(function (root) {
  'use strict';
  function rank(c) { return (c % 13) + 1; }
  function suitOf(c, suits) { var k = Math.floor(c / 13); return suits === 1 ? 0 : suits === 2 ? (k % 2 === 0 ? 0 : 1) : k % 4; }
  function top(a) { return a.length ? a[a.length - 1] : undefined; }

  function rng(seed) {   // mulberry32, as Solitaire uses
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function deal(seed, suits) {
    suits = suits === 2 || suits === 4 ? suits : 1;
    var d = [], r = rng(seed), i, j, t;
    for (i = 0; i < 104; i++) d.push(i);
    for (i = 103; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = d[i]; d[i] = d[j]; d[j] = t; }
    var tab = [], p = 0, row, col;
    for (col = 0; col < 10; col++) tab.push([]);
    for (row = 0; row < 6; row++) for (col = 0; col < 10; col++) if (row < (col < 4 ? 6 : 5)) tab[col].push({ c: d[p++], up: false });
    for (col = 0; col < 10; col++) tab[col][tab[col].length - 1].up = true;
    return { seed: seed, suits: suits, tab: tab, stock: d.slice(p), done: [], moves: 0, score: 500, won: false };
  }
  function clone(s) {
    return { seed: s.seed, suits: s.suits, tab: s.tab.map(function (col) { return col.map(function (x) { return { c: x.c, up: x.up }; }); }),
             stock: s.stock.slice(), done: s.done.map(function (r) { return r.slice(); }), moves: s.moves, score: s.score, won: s.won };
  }
  // the cards on top that run down in order in one suit (they move together)
  function runLen(s, col) {
    if (!col.length || !top(col).up) return 0;
    var n = 1;
    for (var k = col.length - 1; k > 0; k--) {
      var a = col[k], b = col[k - 1];
      if (b.up && suitOf(a.c, s.suits) === suitOf(b.c, s.suits) && rank(b.c) === rank(a.c) + 1) n++; else break;
    }
    return n;
  }
  function picked(s, from) {
    if (!from || from.p !== 't' || !s.tab[from.i]) return [];
    var col = s.tab[from.i], n = from.n || 1;
    if (n < 1 || n > runLen(s, col)) return [];
    return col.slice(col.length - n).map(function (x) { return x.c; });
  }
  function fits(card, col) { if (!col.length) return true; var t = top(col); return t.up && rank(t.c) === rank(card) + 1; }
  function emptyCols(s) { var n = 0; for (var i = 0; i < 10; i++) if (!s.tab[i].length) n++; return n; }
  function canDeal(s) { return !s.won && s.stock.length > 0 && emptyCols(s) === 0; }
  function legal(s, m) {
    if (s.won || !m) return false;
    if (m.t === 'draw') return canDeal(s);
    if (m.t !== 'move' || !m.from || !m.to || m.to.p !== 't' || m.from.i === m.to.i || !s.tab[m.to.i]) return false;
    var cards = picked(s, m.from);
    return cards.length > 0 && fits(cards[0], s.tab[m.to.i]);
  }
  // a full suit from King to Ace on top of a column clears itself off; the card under it turns over
  function clearRun(s, i, fx) {
    var col = s.tab[i];
    if (col.length < 13 || runLen(s, col) < 13 || rank(top(col).c) !== 1) return;
    var run = col.splice(col.length - 13, 13).map(function (x) { return x.c; });
    s.done.push(run); s.score += 100;
    fx.toFound = true; fx.popCards = [run[0]]; fx.runs = (fx.runs || 0) + 1;
    var t = top(col); if (t && !t.up) { t.up = true; fx.flipped.push(t.c); }
  }
  function apply(s, m) {
    if (!legal(s, m)) return null;
    var fx = { t: m.t, cards: [], flipped: [], points: 0, toFound: false, won: false, dealt: false };
    if (m.t === 'draw') {
      for (var i = 0; i < 10; i++) { var c = s.stock.pop(); s.tab[i].push({ c: c, up: true }); fx.cards.push(c); }
      fx.dealt = true;
      for (var j = 0; j < 10; j++) clearRun(s, j, fx);
    } else {
      var cards = picked(s, m.from), from = s.tab[m.from.i];
      from.splice(from.length - cards.length, cards.length);
      cards.forEach(function (c) { s.tab[m.to.i].push({ c: c, up: true }); });
      fx.cards = cards;
      var t = top(from); if (t && !t.up) { t.up = true; fx.flipped.push(t.c); }
      clearRun(s, m.to.i, fx);
    }
    s.moves++;
    s.score = Math.max(0, s.score - 1);
    if (s.done.length === 8) { s.won = true; fx.won = true; }
    return fx;
  }

  // every useful move, best first: joining a run of the same suit, turning a card over, then the rest
  function goodMoves(s) {
    var out = [], i, j, k;
    for (i = 0; i < 10; i++) {
      var col = s.tab[i], rl = runLen(s, col);
      if (rl) {   // the whole run moves (splitting a run of one suit never helps)
        k = rl;
        var base = col[col.length - k].c, under = col.length - k - 1 >= 0 ? col[col.length - k - 1] : null;
        var properParent = under && under.up && rank(under.c) === rank(base) + 1;   // already sits on a card a step higher
        var sameParent = properParent && suitOf(under.c, s.suits) === suitOf(base, s.suits);
        for (j = 0; j < 10; j++) {
          if (j === i) continue;
          var dst = s.tab[j]; if (!fits(base, dst)) continue;
          var tc = top(dst), w;
          if (!dst.length) { if (!under) continue; w = under.up ? 8 : 40; }                         // into an empty column
          else if (sameParent) continue;                                                              // already joined: pointless
          else if (suitOf(tc.c, s.suits) === suitOf(base, s.suits)) w = 90 + rl;                      // joins its own suit
          else if (under && !under.up) w = 70;                                                        // turns a card over
          else if (!under) w = 55;                                                                    // empties a column
          else if (properParent) continue;                                                            // one step-higher card for another: pointless
          else w = 25;                                                                                // off a dealt card onto its proper place
          out.push({ m: { t: 'move', from: { p: 't', i: i, n: k }, to: { p: 't', i: j } }, w: w });
        }
      }
    }
    out.sort(function (a, b) { return b.w - a.w; });
    return out;
  }
  function hint(s) {
    if (s.won) return null;
    var g = goodMoves(s);
    if (g.length && g[0].w >= 20) return g[0].m;
    if (canDeal(s)) return { t: 'draw' };
    if (s.stock.length && emptyCols(s)) {   // the deck waits for every column to have a card: fill the gap first
      var fill = g.filter(function (x) { return !s.tab[x.m.to.i].length; });
      if (fill.length) return fill[0].m;
    }
    return g.length && g[0].w > 10 ? g[0].m : null;
  }
  function stuck(s) { return !s.won && hint(s) === null; }
  // a tap: onto its own suit, else any card a step higher, else an empty column
  function smartMove(s, from) {
    var cards = picked(s, from); if (!cards.length) return null;
    var c = cards[0], i, best = null, bestW = -1, col = s.tab[from.i];
    for (i = 0; i < 10; i++) {
      if (i === from.i) continue;
      var dst = s.tab[i]; if (!fits(c, dst)) continue;
      var w;
      if (!dst.length) w = cards.length === col.length ? -1 : 1;
      else w = suitOf(top(dst).c, s.suits) === suitOf(c, s.suits) ? 3 : 2;
      if (w > bestW) { bestW = w; best = { t: 'move', from: from, to: { p: 't', i: i } }; }
    }
    return bestW > 0 ? best : null;
  }

  var api = { deal: deal, clone: clone, legal: legal, apply: apply, picked: picked, runLen: runLen, canDeal: canDeal, emptyCols: emptyCols,
              goodMoves: goodMoves, hint: hint, stuck: stuck, smartMove: smartMove, rank: rank, suitOf: suitOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpEngine = api;
})(typeof window !== 'undefined' ? window : this);
