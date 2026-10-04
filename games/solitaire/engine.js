/* 365 Solitaire - the rules, with no screen code (3 Oct 2026). Klondike: 7 columns, 4 piles to build up by suit
 * from Ace to King, turn one card or three from the stock, as many passes as you like.
 * 4 Oct 2026 - difficulty levels (owner: "levels ... so they can pick hardness"): deal(seed, lv) where lv is
 *   1 Easy (turn one), 3 Normal (turn three) - the old draw counts, so saved games and scores carry on - and
 *   5 Hard (turn three, three times through the deck), 7 Expert (turn three, once through). s.limit = how many times
 *   through the deck are allowed (0 = no limit); s.passes counts the turn-overs so far.
 * The page loads this as window.SolEngine; the tests and tools/solitaire/make-deals.cjs require() it.
 * A card is a number 0-51: suit = card / 13 (0 spades, 1 hearts, 2 diamonds, 3 clubs), rank = card % 13 + 1. */
(function (root) {
  'use strict';

  var SUIT_CH = ['♠', '♥', '♦', '♣'];
  var SUIT_NAME = ['spades', 'hearts', 'diamonds', 'clubs'];
  var RANK_CH = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function suit(c) { return (c / 13) | 0; }
  function rank(c) { return (c % 13) + 1; }
  function red(c) { var s = suit(c); return s === 1 || s === 2; }
  function name(c) { return RANK_CH[rank(c)] + SUIT_CH[suit(c)]; }

  // mulberry32: the same deal number gives the same deal on every computer, so "Today's deal" is one deal for everyone
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

  // A game. tab[col] = [{c, up}] bottom to top; stock/waste/found[f] = card numbers, last = top.
  var LIMIT = { 1: 0, 3: 0, 5: 3, 7: 1 };
  function deal(seed, lv) {
    lv = LIMIT.hasOwnProperty(lv) ? lv : (lv === 3 ? 3 : 1);
    var d = shuffled(seed), p = 0, tab = [], row, col;
    for (col = 0; col < 7; col++) tab.push([]);
    for (row = 0; row < 7; row++) for (col = row; col < 7; col++) tab[col].push({ c: d[p++], up: col === row });
    return { seed: seed, draw: lv === 1 ? 1 : 3, lv: lv, limit: LIMIT[lv], tab: tab, stock: d.slice(p), waste: [], found: [[], [], [], []],
             moves: 0, score: 0, passes: 0, undos: 0, won: false };
  }
  function clone(s) {
    return { seed: s.seed, draw: s.draw, lv: s.lv || s.draw, limit: s.limit || 0,
             tab: s.tab.map(function (col) { return col.map(function (x) { return { c: x.c, up: x.up }; }); }),
             stock: s.stock.slice(), waste: s.waste.slice(), found: s.found.map(function (f) { return f.slice(); }),
             moves: s.moves, score: s.score, passes: s.passes, undos: s.undos, won: s.won };
  }

  function top(a) { return a.length ? a[a.length - 1] : undefined; }
  // turning the deck over again: always, unless the level allows only so many times through (Hard 3, Expert 1)
  function canRecycle(s) { return !s.limit || s.passes + 1 < s.limit; }
  function canStack(card, col) {   // onto a tableau column
    if (!col.length) return rank(card) === 13;
    var t = col[col.length - 1];
    return t.up && red(t.c) !== red(card) && rank(t.c) === rank(card) + 1;
  }
  function canFound(card, f) {    // onto a foundation pile
    if (!f.length) return rank(card) === 1;
    var t = f[f.length - 1];
    return suit(t) === suit(card) && rank(card) === rank(t) + 1;
  }
  // the foundation a card would go to: its own suit's pile, else the first empty pile for an Ace
  function foundFor(s, card) {
    var i, empty = -1;
    for (i = 0; i < 4; i++) {
      if (s.found[i].length && suit(s.found[i][0]) === suit(card)) return canFound(card, s.found[i]) ? i : -1;
      if (!s.found[i].length && empty < 0) empty = i;
    }
    return rank(card) === 1 ? empty : -1;
  }
  // how many cards from the top of column i form a face-up run (always a legal sequence in Klondike)
  function runLen(col) { var n = 0; for (var k = col.length - 1; k >= 0 && col[k].up; k--) n++; return n; }

  // the cards a move would pick up: from {p:'w'|'t'|'f', i, n}
  function picked(s, from) {
    if (from.p === 'w') return s.waste.length ? [top(s.waste)] : [];
    if (from.p === 'f') return s.found[from.i] && s.found[from.i].length ? [top(s.found[from.i])] : [];
    var col = s.tab[from.i]; if (!col) return [];
    var n = from.n || 1;
    if (n < 1 || n > runLen(col)) return [];
    return col.slice(col.length - n).map(function (x) { return x.c; });
  }

  function legal(s, m) {
    if (s.won) return false;
    if (m.t === 'draw') return s.stock.length > 0 || (s.waste.length > 0 && canRecycle(s));
    if (m.t !== 'move' || !m.from || !m.to) return false;
    var cards = picked(s, m.from);
    if (!cards.length) return false;
    if (m.to.p === 'f') {
      if (cards.length !== 1 || m.from.p === 'f') return false;
      var f = s.found[m.to.i]; if (!f) return false;
      return canFound(cards[0], f) && (f.length > 0 || foundFor(s, cards[0]) >= 0);
    }
    if (m.to.p === 't') {
      if (m.from.p === 't' && m.from.i === m.to.i) return false;
      var col = s.tab[m.to.i]; if (!col) return false;
      return canStack(cards[0], col);
    }
    return false;
  }

  // Apply a legal move. Returns what happened, for the screen (sounds, flips, points), or null if it was not legal.
  function apply(s, m) {
    if (!legal(s, m)) return null;
    var fx = { t: m.t, cards: [], flipped: [], points: 0, recycled: false, toFound: false, won: false };
    if (m.t === 'draw') {
      if (s.stock.length) {
        var k = Math.min(s.draw, s.stock.length);
        for (var i = 0; i < k; i++) { var c = s.stock.pop(); s.waste.push(c); fx.cards.push(c); }
      } else {
        while (s.waste.length) s.stock.push(s.waste.pop());
        s.passes++; fx.recycled = true;
        if (s.limit) fx.left = s.limit - 1 - s.passes;   // turn-overs still allowed after this one (Hard, Expert)
      }
      s.moves++;
      return fx;
    }
    var cards = picked(s, m.from);
    if (m.from.p === 'w') s.waste.pop();
    else if (m.from.p === 'f') s.found[m.from.i].pop();
    else s.tab[m.from.i].splice(s.tab[m.from.i].length - cards.length, cards.length);
    if (m.to.p === 'f') { s.found[m.to.i].push(cards[0]); fx.toFound = true; fx.points += 10; }
    else {
      for (var j = 0; j < cards.length; j++) s.tab[m.to.i].push({ c: cards[j], up: true });
      if (m.from.p === 'w') fx.points += 5;
      if (m.from.p === 'f') fx.points -= 15;
    }
    if (m.from.p === 't') {   // turn the card that is now on top
      var col = s.tab[m.from.i], t = top(col);
      if (t && !t.up) { t.up = true; fx.flipped.push(t.c); fx.points += 5; }
    }
    fx.cards = cards;
    s.score = Math.max(0, s.score + fx.points);
    s.moves++;
    if (s.found[0].length + s.found[1].length + s.found[2].length + s.found[3].length === 52) { s.won = true; fx.won = true; }
    return fx;
  }

  // A card that can safely go up to its pile: nothing still in play could ever need to sit on it.
  function safeToFound(s, card) {
    var r = rank(card);
    if (r <= 2) return true;
    var need = r - 1, i, other = red(card) ? [0, 3] : [1, 2];
    for (i = 0; i < 2; i++) { if (foundHeight(s, other[i]) < need) return false; }
    return true;
  }
  function foundHeight(s, su) {
    for (var i = 0; i < 4; i++) if (s.found[i].length && suit(s.found[i][0]) === su) return s.found[i].length;
    return 0;
  }
  // the next automatic move up to a pile (safe cards only), or null
  function autoMove(s) {
    var i, c, f;
    if (s.waste.length) { c = top(s.waste); f = foundFor(s, c); if (f >= 0 && safeToFound(s, c)) return { t: 'move', from: { p: 'w' }, to: { p: 'f', i: f } }; }
    for (i = 0; i < 7; i++) {
      var col = s.tab[i]; if (!col.length || !top(col).up) continue;
      c = top(col).c; f = foundFor(s, c);
      if (f >= 0 && safeToFound(s, c)) return { t: 'move', from: { p: 't', i: i, n: 1 }, to: { p: 'f', i: f } };
    }
    return null;
  }

  // Tap a card: the best place for it (and the cards on it). from = {p, i, n}. Returns a move or null.
  function smartMove(s, from) {
    var cards = picked(s, from); if (!cards.length) return null;
    var c = cards[0], i, best = null;
    if (cards.length === 1 && from.p !== 'f') { var f = foundFor(s, c); if (f >= 0) return { t: 'move', from: from, to: { p: 'f', i: f } }; }
    // a non-empty column first; an empty one only for a King that is not already at the bottom of its column
    for (i = 0; i < 7; i++) {
      if (from.p === 't' && from.i === i) continue;
      if (s.tab[i].length && canStack(c, s.tab[i])) return { t: 'move', from: from, to: { p: 't', i: i } };
    }
    if (rank(c) === 13 && !(from.p === 't' && s.tab[from.i].length === cards.length)) {
      for (i = 0; i < 7; i++) if (!s.tab[i].length) { best = { t: 'move', from: from, to: { p: 't', i: i } }; break; }
    }
    return best;
  }

  // Every useful move, best first. Leaves out moves that only shuffle cards about.
  function goodMoves(s) {
    var out = [], i, j, col, n, c, f, base, below;
    // 1. up to the piles
    if (s.waste.length) { c = top(s.waste); f = foundFor(s, c); if (f >= 0) out.push({ m: { t: 'move', from: { p: 'w' }, to: { p: 'f', i: f } }, why: 'found', w: 90 }); }
    for (i = 0; i < 7; i++) {
      col = s.tab[i]; if (!col.length || !top(col).up) continue;
      c = top(col).c; f = foundFor(s, c);
      if (f >= 0) out.push({ m: { t: 'move', from: { p: 't', i: i, n: 1 }, to: { p: 'f', i: f } }, why: 'found', w: 100 + (col.length > 1 && !col[col.length - 2].up ? 20 : 0) });
    }
    // 2. moving a whole face-up run so a hidden card can be turned over, or a column emptied for a King
    for (i = 0; i < 7; i++) {
      col = s.tab[i]; n = runLen(col); if (!n) continue;
      base = col[col.length - n].c; below = col.length - n - 1;
      var reveals = below >= 0;   // a face-down card lies under the run
      for (j = 0; j < 7; j++) {
        if (j === i) continue;
        if (s.tab[j].length ? canStack(base, s.tab[j]) : (rank(base) === 13 && reveals)) {
          if (reveals) out.push({ m: { t: 'move', from: { p: 't', i: i, n: n }, to: { p: 't', i: j } }, why: 'reveal', w: 80 + below });
          else if (s.tab[j].length && kingWaiting(s, i)) out.push({ m: { t: 'move', from: { p: 't', i: i, n: n }, to: { p: 't', i: j } }, why: 'space', w: 40 });
          break;
        }
      }
      // part of a run, when the card it uncovers can go up to a pile straight away
      for (var k = 1; k < n; k++) {
        var under = col[col.length - k - 1].c, mv = col[col.length - k].c;
        if (foundFor(s, under) < 0) continue;
        for (j = 0; j < 7; j++) {
          if (j !== i && s.tab[j].length && canStack(mv, s.tab[j])) { out.push({ m: { t: 'move', from: { p: 't', i: i, n: k }, to: { p: 't', i: j } }, why: 'uncover', w: 60 }); break; }
        }
      }
    }
    // 3. the waste card onto a column
    if (s.waste.length) {
      c = top(s.waste);
      for (i = 0; i < 7; i++) {
        if (s.tab[i].length ? canStack(c, s.tab[i]) : rank(c) === 13) { out.push({ m: { t: 'move', from: { p: 'w' }, to: { p: 't', i: i } }, why: 'waste', w: 50 }); break; }
      }
    }
    out.sort(function (a, b) { return b.w - a.w; });
    return out;
  }
  function kingWaiting(s, notCol) {   // a King that could use an empty column (waste top, or a King run with cards under it)
    if (s.waste.length && rank(top(s.waste)) === 13) return true;
    for (var i = 0; i < 7; i++) {
      if (i === notCol) continue;
      var col = s.tab[i], n = runLen(col);
      if (n && col.length > n && rank(col[col.length - n].c) === 13) return true;
    }
    return false;
  }

  // the cards that could become the waste top by turning the stock over and over (draw 1: all; draw 3: every third)
  function reachable(s) {
    var stock = s.stock.slice(), waste = s.waste.slice(), seen = {}, out = [], guard = 0, total = stock.length + waste.length, passes = s.passes;
    if (!total) return out;
    if (waste.length) { out.push(top(waste)); seen[top(waste)] = 1; }
    while (guard++ < 2 * total + 4) {
      if (stock.length) { var k = Math.min(s.draw, stock.length); for (var i = 0; i < k; i++) waste.push(stock.pop()); }
      else { if (s.limit && passes + 1 >= s.limit) break; passes++; while (waste.length) stock.push(waste.pop()); continue; }
      var t = top(waste); if (!seen[t]) { seen[t] = 1; out.push(t); }
    }
    return out;
  }

  // The hint: a move to make, 'draw' to turn the stock, or null when there is nothing useful left.
  function hint(s) {
    if (s.won) return null;
    var g = goodMoves(s);
    if (g.length) return g[0].m;
    // turning the stock helps only if some card in it can be played somewhere
    var cards = reachable(s);
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c === top(s.waste)) continue;
      if (foundFor(s, c) >= 0) return { t: 'draw' };
      for (var j = 0; j < 7; j++) if (s.tab[j].length ? canStack(c, s.tab[j]) : rank(c) === 13) return { t: 'draw' };
    }
    return null;
  }
  function stuck(s) { return !s.won && hint(s) === null; }

  // Every card is face up and the stock is empty: the rest can be played up to the piles automatically.
  // (Draw-one with stock left also works: every stock card can be reached, and the lowest card left is always playable.)
  function finishable(s) {
    if (s.won) return false;
    for (var i = 0; i < 7; i++) for (var j = 0; j < s.tab[i].length; j++) if (!s.tab[i][j].up) return false;
    return (s.stock.length === 0 && s.waste.length === 0) || (s.draw === 1 && !s.limit);
  }
  // the next move of the automatic finish: any card up to a pile, else turn the stock
  function finishStep(s) {
    var i, c, f;
    if (s.waste.length) { c = top(s.waste); f = foundFor(s, c); if (f >= 0) return { t: 'move', from: { p: 'w' }, to: { p: 'f', i: f } }; }
    var bestI = -1, bestR = 99;
    for (i = 0; i < 7; i++) {
      var col = s.tab[i]; if (!col.length) continue;
      c = top(col).c; f = foundFor(s, c);
      if (f >= 0 && rank(c) < bestR) { bestR = rank(c); bestI = i; }
    }
    if (bestI >= 0) return { t: 'move', from: { p: 't', i: bestI, n: 1 }, to: { p: 'f', i: foundFor(s, top(s.tab[bestI]).c) } };
    if (s.stock.length || (s.waste.length && canRecycle(s))) return { t: 'draw' };
    return null;
  }

  // 4 Oct 2026 - a move as a short string, for the Hall of Fame: the game sends its moves and the server replays them
  // with the same rules (api/games-sol-lib.php) to check the win is real. 'd' turns the deck; otherwise FROM>TO with
  // FROM = w (the waste) | f<pile> | t<column>.<cards> and TO = f<pile> | t<column>, e.g. "t3.2>t5", "w>f0".
  function code(m) {
    if (m.t === 'draw') return 'd';
    var f = m.from.p === 'w' ? 'w' : m.from.p === 'f' ? 'f' + m.from.i : 't' + m.from.i + '.' + (m.from.n || 1);
    return f + '>' + m.to.p + m.to.i;
  }
  function decode(c) {
    if (c === 'd') return { t: 'draw' };
    var x = /^(w|f[0-3]|t[0-6]\.\d{1,2})>([ft])([0-6])$/.exec(String(c)); if (!x) return null;
    var from = x[1] === 'w' ? { p: 'w' } : x[1].charAt(0) === 'f' ? { p: 'f', i: +x[1].charAt(1) } : { p: 't', i: +x[1].charAt(1), n: +x[1].split('.')[1] };
    return { t: 'move', from: from, to: { p: x[2], i: +x[3] } };
  }

  var api = { deal: deal, clone: clone, canRecycle: canRecycle, LIMIT: LIMIT, code: code, decode: decode, shuffled: shuffled, legal: legal, apply: apply, autoMove: autoMove, smartMove: smartMove,
              goodMoves: goodMoves, hint: hint, stuck: stuck, finishable: finishable, finishStep: finishStep, reachable: reachable,
              foundFor: foundFor, canStack: canStack, canFound: canFound, runLen: runLen, safeToFound: safeToFound,
              suit: suit, rank: rank, red: red, name: name, SUIT_CH: SUIT_CH, SUIT_NAME: SUIT_NAME, RANK_CH: RANK_CH };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SolEngine = api;
})(typeof window !== 'undefined' ? window : this);
