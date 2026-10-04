/* 365 Gin Rummy - the rules and the computer player, with no screen code (5 Oct 2026; owner: "more ultra popular card
 * games"). Two players, ten cards each: you (player 0) against the computer (player 1). On your turn take a card - the
 * top of the deck or the face-up card on the discard pile - then throw one away (not the one you just took from the
 * pile). Make MELDS: three or four of a kind (7 7 7), or three or more in a row in one suit (4 5 6 of hearts; Ace is
 * low, so A 2 3 is a run but Q K A isn't). Cards in no meld are DEADWOOD: Ace 1, 2-10 their number, picture cards 10.
 * KNOCK when your deadwood is 10 or less: both hands go down, the other player lays off what they can on your melds,
 * and you score the difference. If their deadwood is as low as yours, that's an UNDERCUT: they score the difference
 * and 25 more. GIN - no deadwood at all - scores their deadwood and 25, and nothing can be laid off. If the deck gets
 * down to two cards, the hand is a draw. First to 100 wins the match (with 100 for the match and 25 for every hand won).
 * The first turn of a hand may take the face-up card or draw from the deck (the formal "offer the upcard" step is left
 * out, as most computer games do).
 * Levels are how well the computer plays: 1 Easy (careless, knocks the first chance), 3 Normal, 5 Hard (watches what
 * you pick up and throw, waits for a better knock), 7 Expert (and reads the risk of an undercut).
 * Everything the computer does is worked out from the state - the same deal number and the same moves from you give
 * the same game on every computer. The page loads this as window.GinEngine; the tests require() it.
 * A card is a number 0-51: suit = card / 13 (0 spades, 1 hearts, 2 diamonds, 3 clubs), rank = card % 13 + 1 (Ace 1). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GinEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LV = { 1: 'Easy', 3: 'Normal', 5: 'Hard', 7: 'Expert' };
  var SUIT_NAME = ['spades', 'hearts', 'diamonds', 'clubs'];
  var KNOCK = 10, GIN_BONUS = 25, UNDERCUT = 25, GAME_BONUS = 100, LINE_BONUS = 25;

  function suit(c) { return (c / 13) | 0; }
  function rank(c) { return (c % 13) + 1; }
  function val(c) { var r = (c % 13) + 1; return r > 10 ? 10 : r; }
  function clone(S) { return JSON.parse(JSON.stringify(S)); }
  function rng(seed) {   // mulberry32, as the other card games shuffle
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function whim(S, k) { return rng((S.seed * 131 + S.hand * 977 + S.turnN * 61 + (k || 0) * 104729) >>> 0)(); }

  // ---------------------------------------------------------------- melds: the best way to lay out a hand
  // every meld the cards could make: sets of 3 (and 4) of a kind, runs of 3+ in a suit
  function allMelds(cards) {
    var out = [], byR = {}, byS = [[], [], [], []], i, j, k;
    cards.forEach(function (c) { (byR[rank(c)] = byR[rank(c)] || []).push(c); byS[suit(c)].push(c); });
    for (var r in byR) {
      var g = byR[r];
      if (g.length >= 3) {
        if (g.length === 4) out.push(g.slice());
        for (i = 0; i < g.length; i++) for (j = i + 1; j < g.length; j++) for (k = j + 1; k < g.length; k++) out.push([g[i], g[j], g[k]]);
      }
    }
    byS.forEach(function (l) {
      l.sort(function (a, b) { return rank(a) - rank(b); });
      for (i = 0; i < l.length; i++) {
        var run = [l[i]];
        for (j = i + 1; j < l.length && rank(l[j]) === rank(run[run.length - 1]) + 1; j++) { run.push(l[j]); if (run.length >= 3) out.push(run.slice()); }
      }
    });
    return out;
  }
  // the melds that leave the least deadwood; extra: pieces that may also be used (laying off on the other's melds)
  function best(cards, extra) {
    var melds = allMelds(cards).concat(extra || []), bestD = Infinity, bestPick = null, n = cards.length;
    var idx = {}; cards.forEach(function (c, i) { idx[c] = i; });
    var masks = melds.map(function (m) { var b = 0; m.forEach(function (c) { b |= 1 << idx[c]; }); return b; });
    var total = 0; cards.forEach(function (c) { total += val(c); });
    var mval = melds.map(function (m) { var s = 0; m.forEach(function (c) { s += val(c); }); return s; });
    // depth-first over the melds, each tried once, in order
    (function go(start, used, saved, pick) {
      var d = total - saved;
      if (d < bestD) { bestD = d; bestPick = pick.slice(); }
      for (var i = start; i < melds.length; i++) {
        if (masks[i] & used) continue;
        pick.push(i); go(i + 1, used | masks[i], saved + mval[i], pick); pick.pop();
      }
    })(0, 0, 0, []);
    var used = 0; bestPick.forEach(function (i) { used |= masks[i]; });
    return { dead: bestD, melds: bestPick.map(function (i) { return melds[i].slice(); }), deadwood: cards.filter(function (c, i) { return !(used & (1 << i)); }), n: n };
  }
  function deadwood(cards) { return best(cards).dead; }
  // with 11 cards: each card you might throw, and the deadwood left
  function discards(S, p) {
    var h = S.hands[p];
    return h.map(function (c) { return { c: c, dead: deadwood(h.filter(function (x) { return x !== c; })) }; });
  }
  // the defender's best: their own melds, plus cards laid off on the knocker's melds (runs extended at either end,
  // a fourth card on a set of three)
  function layoffPieces(cards, kMelds) {
    var pieces = [];
    kMelds.forEach(function (m) {
      if (rank(m[0]) === rank(m[1])) {   // a set
        if (m.length === 3) cards.forEach(function (c) { if (rank(c) === rank(m[0])) pieces.push({ cards: [c], on: m }); });
      } else {
        var s = suit(m[0]), lo = Math.min.apply(null, m.map(rank)), top = Math.max.apply(null, m.map(rank)), mine = {};
        cards.forEach(function (c) { if (suit(c) === s) mine[rank(c)] = c; });
        var run = [];
        for (var r = lo - 1; r >= 1 && mine[r] != null; r--) { run.push(mine[r]); pieces.push({ cards: run.slice(), on: m }); }
        run = [];
        for (r = top + 1; r <= 13 && mine[r] != null; r++) { run.push(mine[r]); pieces.push({ cards: run.slice(), on: m }); }
      }
    });
    return pieces;
  }
  function defend(cards, kMelds) {
    var lp = layoffPieces(cards, kMelds), b = best(cards, lp.map(function (x) { return x.cards; }));
    var own = [], laid = [];
    b.melds.forEach(function (m) {
      var isLay = lp.some(function (x) { return x.cards.length === m.length && x.cards.every(function (c, i) { return c === m[i]; }); });
      // a layoff piece that also happens to be a meld of its own counts as the meld
      if (isLay && !(m.length >= 3 && allMelds(m).some(function (q) { return q.length === m.length; }))) laid = laid.concat(m); else own.push(m);
    });
    return { dead: b.dead, melds: own, laid: laid, deadwood: b.deadwood };
  }

  // ---------------------------------------------------------------- a match, and each hand
  function newMatch(seed, lv) {
    var S = { v: 1, seed: (seed >>> 0) || 1, lv: LV[lv] ? lv : 3, target: 100, hand: -1, scores: [0, 0], wins: [0, 0], dealer: 1,
              hands: [[], []], stock: [], pile: [], turn: 0, phase: 'draw', took: null, turnN: 0, picked: [[], []], thrown: [[], []],
              result: null, history: [], winner: -1, first: true, gins: [0, 0] };
    startHand(S);
    return S;
  }
  function startHand(S) {
    S.hand++;
    S.dealer = S.hand === 0 ? 1 : 1 - S.dealer;   // you go first in the first hand; then the dealer changes each hand
    var r = rng((S.seed * 2654435761 + S.hand * 40503 + 11) >>> 0), d = [], i;
    for (i = 0; i < 52; i++) d.push(i);
    for (i = 51; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = d[i]; d[i] = d[j]; d[j] = t; }
    S.hands = [d.slice(0, 10), d.slice(10, 20)];
    S.pile = [d[20]]; S.stock = d.slice(21);
    S.turn = 1 - S.dealer; S.phase = 'draw'; S.took = null; S.turnN = 0; S.picked = [[], []]; S.thrown = [[], []]; S.result = null; S.first = true;
  }
  function canDraw(S, p, from) {
    if (S.phase !== 'draw' || S.turn !== p) return false;
    return from === 'stock' ? S.stock.length > 2 : from === 'pile' ? S.pile.length > 0 : false;
  }
  function canThrow(S, p, c) { return S.phase === 'discard' && S.turn === p && S.hands[p].indexOf(c) >= 0 && c !== (S.took && S.took.from === 'pile' ? S.took.c : -1); }
  function knockable(S, p) {   // the cards you could knock with now (and whether it would be Gin)
    if (S.phase !== 'discard' || S.turn !== p) return [];
    return discards(S, p).filter(function (o) { return o.dead <= KNOCK && canThrow(S, p, o.c); });
  }

  // ---------------------------------------------------------------- moves: draw, discard, knock, next
  function apply(S, m) {
    if (!m) return false;
    var p = S.turn;
    if (m.t === 'draw') {
      if (!canDraw(S, p, m.from)) return false;
      var c = m.from === 'stock' ? S.stock.pop() : S.pile.pop();
      S.hands[p].push(c); S.took = { from: m.from, c: c }; S.phase = 'discard';
      if (m.from === 'pile') S.picked[p].push(c);
      return { t: 'draw', p: p, from: m.from, c: c };
    }
    if (m.t === 'discard' || m.t === 'knock') {
      if (!canThrow(S, p, m.c)) return false;
      var rest = S.hands[p].filter(function (x) { return x !== m.c; });
      if (m.t === 'knock' && deadwood(rest) > KNOCK) return false;
      S.hands[p] = rest; S.pile.push(m.c); S.thrown[p].push(m.c); S.took = null; S.first = false;
      if (m.t === 'knock') return showdown(S, p, m.c);
      S.turnN++; S.turn = 1 - p; S.phase = 'draw';
      var fx = { t: 'discard', p: p, c: m.c };
      if (S.stock.length <= 2) { S.phase = 'handEnd'; S.result = { draw: true }; S.history.push([0, 0]); fx.handOver = true; fx.draw = true; }
      return fx;
    }
    if (m.t === 'next') {
      if (S.phase !== 'handEnd') return false;
      startHand(S);
      return { t: 'next', hand: S.hand };
    }
    return false;
  }
  function showdown(S, k, c) {
    var o = 1 - k, kb = best(S.hands[k]), gin = kb.dead === 0;
    var db = gin ? (function () { var b = best(S.hands[o]); return { dead: b.dead, melds: b.melds, laid: [], deadwood: b.deadwood }; })() : defend(S.hands[o], kb.melds);
    var res = { knocker: k, gin: gin, kMelds: kb.melds, kDead: kb.dead, kDeadwood: kb.deadwood, dMelds: db.melds, laid: db.laid, dDead: db.dead, dDeadwood: db.deadwood, c: c };
    if (gin) { res.to = k; res.pts = db.dead + GIN_BONUS; }
    else if (db.dead <= kb.dead) { res.to = o; res.pts = kb.dead - db.dead + UNDERCUT; res.undercut = true; }
    else { res.to = k; res.pts = db.dead - kb.dead; }
    S.scores[res.to] += res.pts; S.wins[res.to]++; if (gin) S.gins[k]++;
    var add = [0, 0]; add[res.to] = res.pts; S.history.push(add);
    S.result = res;
    var fx = { t: 'knock', p: k, c: c, gin: gin, undercut: !!res.undercut, to: res.to, pts: res.pts, handOver: true };
    if (S.scores[res.to] >= S.target) {
      S.phase = 'over'; S.winner = res.to; fx.over = true;
      // the match bonuses: 100 for the match, 25 for every hand won (a shown total; the winner is the winner)
      S.final = [S.scores[0] + LINE_BONUS * S.wins[0] + (res.to === 0 ? GAME_BONUS : 0), S.scores[1] + LINE_BONUS * S.wins[1] + (res.to === 1 ? GAME_BONUS : 0)];
    } else S.phase = 'handEnd';
    return fx;
  }
  // the next thing that happens without you: the computer's draw, its discard or knock
  function auto(S) {
    if (S.turn !== 1 || (S.phase !== 'draw' && S.phase !== 'discard')) return null;
    return S.phase === 'draw' ? { t: 'draw', from: aiDraw(S, 1) } : aiThrow(S, 1);
  }

  // ---------------------------------------------------------------- the computer player
  // how much a card is worth keeping: in a meld; close to one (a pair, two in a row, a gap of one in a suit)
  function keepValue(S, p, c, hand) {
    var r = rank(c), s = suit(c), v = 0, dead = deadSet(S);
    hand.forEach(function (x) {
      if (x === c) return;
      if (rank(x) === r) v += 3 - (setGone(dead, r) ? 2 : 0);
      if (suit(x) === s && Math.abs(rank(x) - r) === 1) v += 3 - (runGone(dead, s, Math.min(r, rank(x)) - 1) && runGone(dead, s, Math.max(r, rank(x)) + 1) ? 2 : 0);
      if (suit(x) === s && Math.abs(rank(x) - r) === 2) v += 1 - (dead[s * 13 + (Math.min(r, rank(x)))] ? 1 : 0);
    });
    return v;
  }
  function deadSet(S) { var d = {}; S.pile.forEach(function (c) { d[c] = 1; }); return d; }   // cards gone for good (under the top of the pile)
  function setGone(dead, r) { var n = 0; for (var s = 0; s < 4; s++) if (dead[s * 13 + r - 1]) n++; return n >= 2; }
  function runGone(dead, s, r) { return r < 1 || r > 13 || !!dead[s * 13 + r - 1]; }
  // would the other player want this card? (Hard and up: what they picked up, and what they threw away)
  function danger(S, p, c) {
    var o = 1 - p, r = rank(c), s = suit(c), d = 0;
    S.picked[o].forEach(function (x) { if (rank(x) === r) d += 4; if (suit(x) === s && Math.abs(rank(x) - r) <= 2) d += 3; });
    S.thrown[o].forEach(function (x) { if (rank(x) === r) d -= 2; if (suit(x) === s && Math.abs(rank(x) - r) === 1) d -= 1; });
    return d;
  }
  // Hard and up look one draw ahead: the cards they haven't seen (not in their hand, not in the pile, not known to be
  // in the other hand), and for a hand of ten, the deadwood they can expect after the next card from the deck
  function unseen(S, p) {
    var o = 1 - p, known = {}, out = [], c;
    S.hands[p].forEach(function (x) { known[x] = 1; }); S.pile.forEach(function (x) { known[x] = 1; });
    S.picked[o].forEach(function (x) { if (S.pile.indexOf(x) < 0) known[x] = 1; });   // picked up and still held
    for (c = 0; c < 52; c++) if (!known[c]) out.push(c);
    return out;
  }
  function related(c, hand) { return hand.some(function (x) { return rank(x) === rank(c) || (suit(x) === suit(c) && Math.abs(rank(x) - rank(c)) <= 2); }); }
  function bestAfter(hand10, x, d10) {   // take x, throw the best card: the deadwood left
    var h = hand10.concat([x]), m = d10;
    for (var i = 0; i < 10; i++) { var dd = deadwood(h.filter(function (y, j) { return j !== i; })); if (dd < m) m = dd; }
    return m;
  }
  function expectNext(hand10, uns, d10) {
    var tot = 0;
    uns.forEach(function (x) { tot += related(x, hand10) ? bestAfter(hand10, x, d10) : d10; });
    return uns.length ? tot / uns.length : d10;
  }
  function aiDraw(S, p) {
    var top = S.pile[S.pile.length - 1], h = S.hands[p], lv = S.lv;
    if (!canDraw(S, p, 'stock')) return 'pile';
    if (top == null) return 'stock';
    var now = deadwood(h), after = bestAfter(h, top, now);
    if (lv === 1) return after < now - 2 && whim(S, 3) < 0.7 ? 'pile' : 'stock';   // Easy: only an obvious one, and not always
    if (lv <= 3) return after < now ? 'pile' : 'stock';                          // Normal: when it makes or grows a meld
    // Hard and up: the face-up card if it beats what the deck is likely to give
    if (after < now) return after <= expectNext(h, unseen(S, p), now) + 0.5 ? 'pile' : 'stock';
    return 'stock';
  }
  function aiThrow(S, p) {
    var lv = S.lv, h = S.hands[p], opts = discards(S, p).filter(function (o) { return canThrow(S, p, o.c); });
    var minD = Math.min.apply(null, opts.map(function (o) { return o.dead; }));
    // knock?
    var kn = opts.filter(function (o) { return o.dead <= KNOCK; });
    if (kn.length) {
      var kbest = kn.reduce(function (a, o) { return o.dead < a.dead || (o.dead === a.dead && val(o.c) > val(a.c)) ? o : a; });
      if (kbest.dead === 0 || shouldKnock(S, p, kbest.dead)) return { t: 'knock', c: kbest.c };
    }
    if (lv === 1) {   // Easy: throws one of its higher loose cards, not always the best
      var loose = opts.filter(function (o) { return o.dead <= minD + 4; }).sort(function (a, b) { return val(b.c) - val(a.c) || a.c - b.c; });
      return { t: 'discard', c: loose[Math.min(loose.length - 1, Math.floor(whim(S, 5) * Math.min(3, loose.length)))].c };
    }
    var bestO = null, bs = Infinity, uns = lv >= 5 ? unseen(S, p) : null;
    opts.forEach(function (o) {
      var rest = h.filter(function (x) { return x !== o.c; }), sc;
      if (lv <= 3) sc = o.dead * 10 + keepValue(S, p, o.c, rest) * 4 - val(o.c);   // Normal: least deadwood, then the loosest card
      else {   // Hard and up: the hand with the best next draw; Expert also keeps back what the other player wants
        if (o.dead > minD + 12) return;
        sc = expectNext(rest, uns, o.dead) * 10 - val(o.c) * 0.2;
        if (lv >= 7) sc += Math.max(0, danger(S, p, o.c)) * 4;
      }
      if (sc < bs) { bs = sc; bestO = o; }
    });
    return { t: 'discard', c: bestO.c };
  }
  function shouldKnock(S, p, dead) {
    if (S.lv <= 5) return true;   // knock the first chance - in Gin that is nearly always right
    // Expert: holds on for a lower knock only when the other player has been picking up (an undercut is likelier)
    var o = 1 - p;
    return !(S.picked[o].length >= 2 && dead >= 7 && S.stock.length > 16);
  }
  // for the Hint: what a good player would do now
  function hint(S) {
    if (S.turn !== 0) return null;
    var k = S.lv; S.lv = 5;
    var m = S.phase === 'draw' ? { t: 'draw', from: aiDraw(S, 0) } : S.phase === 'discard' ? aiThrow(S, 0) : null;
    S.lv = k; return m;
  }
  // a move as a short code for the Hall of Fame's log (the server replays it: api/games-gr-lib.php)
  function code(m) { return m.t === 'draw' ? (m.from === 'pile' ? 'D' : 'S') : m.t === 'discard' ? 'c' + m.c : m.t === 'knock' ? 'K' + m.c : m.t === 'next' ? 'N' : '?'; }
  function valid(S) {
    return !!(S && S.v === 1 && Array.isArray(S.hands) && S.hands.length === 2 && Array.isArray(S.stock) && Array.isArray(S.pile) && LV[S.lv] && ['draw', 'discard', 'handEnd', 'over'].indexOf(S.phase) >= 0);
  }
  // your hand laid out for the screen: melds first (each together), then the deadwood by suit and rank
  function arrange(cards) {
    var b = best(cards), out = [];
    b.melds.sort(function (a, c) { return rank(a[0]) - rank(c[0]); }).forEach(function (m) { out.push(m.slice().sort(function (a, c) { return rank(a) - rank(c) || a - c; })); });
    var dw = b.deadwood.slice().sort(function (a, c) { return suit(a) - suit(c) || rank(a) - rank(c); });
    return { groups: out, dead: dw, deadwood: b.dead };
  }

  return {
    LV: LV, SUIT_NAME: SUIT_NAME, KNOCK: KNOCK, GIN_BONUS: GIN_BONUS, UNDERCUT: UNDERCUT, GAME_BONUS: GAME_BONUS, LINE_BONUS: LINE_BONUS,
    suit: suit, rank: rank, val: val, clone: clone, allMelds: allMelds, best: best, deadwood: deadwood, defend: defend, discards: discards,
    newMatch: newMatch, canDraw: canDraw, canThrow: canThrow, knockable: knockable, apply: apply, auto: auto, aiDraw: aiDraw, aiThrow: aiThrow,
    hint: hint, valid: valid, arrange: arrange, code: code
  };
});
