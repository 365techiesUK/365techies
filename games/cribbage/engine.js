/* 365 Cribbage - the rules and the computer player, with no screen code (5 Oct 2026; owner: "yes do Cribbage and
 * Whist next"). Six-card cribbage for two: you (player 0) against the computer (player 1), first to 121.
 * Each deal: six cards each; each player puts two in the CRIB, which belongs to the dealer. The card on top of the
 * rest of the deck is turned up - the STARTER (a Jack there gives the dealer 2, "his heels"). Then THE PLAY: starting
 * with the player who didn't deal, cards are played in turn, counting up the total, which may not go past 31; 15 or 31
 * scores 2, a pair 2 (three of a kind 6, four 12), a run of three or more its length. A player who can't play says
 * "Go": the other plays on as far as they can, and the last to play scores 1 (or 2 for exactly 31); then the count
 * starts again. The last card of all scores 1. THE SHOW: each hand is counted with the starter - the non-dealer's
 * first, then the dealer's, then the crib: every 15 is 2, every pair 2, runs their length, four of a suit 4 (5 with
 * the starter; the crib needs all five), the Jack of the starter's suit 1 ("his nob").
 * Ace is 1 and low; picture cards count 10. The computer deals first, so you play and count first.
 * Levels are how well the computer plays: 1 Easy (careless), 3 Normal, 5 Hard (weighs every possible starter for its
 * discard and plays safely), 7 Expert (and thinks about your reply to each card it plays).
 * Everything the computer does is worked out from the state - the same deal number and the same moves from you give
 * the same game on every computer. The page loads this as window.CribEngine; the tests require() it.
 * A card is a number 0-51: suit = card / 13 (0 spades, 1 hearts, 2 diamonds, 3 clubs), rank = card % 13 + 1 (Ace 1). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CribEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LV = { 1: 'Easy', 3: 'Normal', 5: 'Hard', 7: 'Expert' };
  var GAME = 121;
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
  function whim(S, k) { return rng((S.seed * 131 + S.hand * 977 + S.pegged.length * 61 + (k || 0) * 104729) >>> 0)(); }
  function byRank(a, b) { return rank(a) - rank(b) || a - b; }

  // ---------------------------------------------------------------- counting a hand (the show)
  // cards: the four in the hand (or crib); starter: the turned-up card. parts: what scored, for "fifteen two..."
  function score(cards, starter, crib) {
    var all = cards.concat(starter != null ? [starter] : []), n = all.length, parts = [], total = 0, i, j, m;
    function add(k, cs, pts) { parts.push({ k: k, cards: cs, pts: pts }); total += pts; }
    for (m = 1; m < (1 << n); m++) {   // fifteens: every set of cards that adds up to 15
      var s = 0, cs = []; for (i = 0; i < n; i++) if (m & (1 << i)) { s += val(all[i]); cs.push(all[i]); }
      if (s === 15) add('15', cs, 2);
    }
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) if (rank(all[i]) === rank(all[j])) add('pair', [all[i], all[j]], 2);
    // runs: the longest stretch of ranks in a row, once for every way of picking the cards
    var byR = []; for (i = 1; i <= 13; i++) byR[i] = [];
    all.forEach(function (c) { byR[rank(c)].push(c); });
    for (var lo = 1; lo <= 11; lo++) {
      if (!byR[lo].length || (lo > 1 && byR[lo - 1].length)) continue;
      var hi = lo; while (hi < 13 && byR[hi + 1].length) hi++;
      var len = hi - lo + 1;
      if (len >= 3) {
        var combos = [[]];
        for (var r = lo; r <= hi; r++) { var next = []; combos.forEach(function (cmb) { byR[r].forEach(function (c) { next.push(cmb.concat([c])); }); }); combos = next; }
        combos.forEach(function (cmb) { add('run', cmb, len); });
      }
      lo = hi;
    }
    if (cards.length === 4 && cards.every(function (c) { return suit(c) === suit(cards[0]); })) {
      if (starter != null && suit(starter) === suit(cards[0])) add('flush', all.slice(), 5);
      else if (!crib) add('flush', cards.slice(), 4);
    }
    if (starter != null) cards.forEach(function (c) { if (rank(c) === 11 && suit(c) === suit(starter)) add('nobs', [c], 1); });
    return { total: total, parts: parts };
  }
  // points for the card just played in the play: seq is the cards since the count last started again
  function pegPoints(seq, count) {
    var parts = [], last = seq[seq.length - 1], k = 1, l;
    if (count === 15) parts.push({ k: '15', pts: 2 });
    if (count === 31) parts.push({ k: '31', pts: 2 });
    while (k < seq.length && rank(seq[seq.length - 1 - k]) === rank(last)) k++;
    if (k >= 2) parts.push({ k: ['', '', 'pair', 'three', 'four'][k], pts: [0, 0, 2, 6, 12][k] });
    for (l = seq.length; l >= 3; l--) {
      var rs = seq.slice(-l).map(rank).sort(function (a, b) { return a - b; }), ok = true;
      for (var i = 1; i < l; i++) if (rs[i] !== rs[i - 1] + 1) { ok = false; break; }
      if (ok) { parts.push({ k: 'run', n: l, pts: l }); break; }
    }
    return parts;
  }

  // ---------------------------------------------------------------- a match, and each deal
  function newMatch(seed, lv) {
    var S = { v: 1, seed: (seed >>> 0) || 1, lv: LV[lv] ? lv : 3, hand: -1, dealer: 1, scores: [0, 0], back: [0, 0], phase: 'discard', winner: -1,
              hands: [[], []], deck: [], starter: null, crib: [], held: [[], []], inHand: [[], []], gave: [[], []], count: 0, seq: [], pegged: [], said: [false, false],
              lastBy: -1, turn: 0, run: 0, showStep: 0, shown: null, counts: [], ev: [], best: [0, 0] };
    startHand(S);
    return S;
  }
  function startHand(S) {
    S.hand++;
    S.dealer = S.hand === 0 ? 1 : 1 - S.dealer;
    var r = rng((S.seed * 2654435761 + S.hand * 40503 + 13) >>> 0), d = [], i;
    for (i = 0; i < 52; i++) d.push(i);
    for (i = 51; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = d[i]; d[i] = d[j]; d[j] = t; }
    var nd = 1 - S.dealer;
    S.hands = [[], []];
    for (i = 0; i < 12; i++) S.hands[i % 2 === 0 ? nd : S.dealer].push(d[i]);
    S.hands = S.hands.map(function (h) { return h.sort(byRank); });
    S.deck = d.slice(12); S.cut = Math.floor(r() * 36) + 2;   // where the deck is cut for the starter
    S.starter = null; S.crib = []; S.held = [[], []]; S.inHand = [[], []]; S.gave = [[], []];
    S.count = 0; S.seq = []; S.pegged = []; S.said = [false, false]; S.lastBy = -1; S.run = 0;
    S.showStep = 0; S.shown = null; S.counts = []; S.ev = [];
    S.phase = 'discard'; S.turn = nd;
  }
  function add(S, p, pts, why) {
    if (!pts || S.phase === 'over') return false;
    S.back[p] = S.scores[p]; S.scores[p] = Math.min(GAME, S.scores[p] + pts);
    S.ev.push({ p: p, pts: pts, why: why });
    if (S.scores[p] >= GAME) { S.phase = 'over'; S.winner = p; return true; }
    return false;
  }
  function legal(S, p) { return S.inHand[p].filter(function (c) { return S.count + val(c) <= 31; }); }
  function resetCount(S) { S.count = 0; S.seq = []; S.said = [false, false]; S.run++; }

  // ---------------------------------------------------------------- moves
  function apply(S, m) {
    if (!m) return false;
    if (m.t === 'discard') {
      if (S.phase !== 'discard' || !m.cards || m.cards.length !== 2 || m.cards[0] === m.cards[1]) return false;
      if (!m.cards.every(function (c) { return S.hands[0].indexOf(c) >= 0; })) return false;
      var his = aiDiscard(S, 1);
      S.gave = [m.cards.slice(), his];
      S.crib = m.cards.concat(his);
      for (var p = 0; p < 2; p++) { S.held[p] = S.hands[p].filter(function (c) { return S.gave[p].indexOf(c) < 0; }); S.inHand[p] = S.held[p].slice(); }
      S.starter = S.deck[S.cut];
      S.phase = 'peg'; S.turn = 1 - S.dealer; S.ev = [];
      var fx = { t: 'discard', starter: S.starter };
      if (rank(S.starter) === 11) { fx.heels = true; add(S, S.dealer, 2, 'his heels'); }
      return fx;
    }
    if (m.t === 'play') {
      if (S.phase !== 'peg') return false;
      var pl = S.turn;
      if (legal(S, pl).indexOf(m.c) < 0) return false;
      S.inHand[pl] = S.inHand[pl].filter(function (c) { return c !== m.c; });
      S.count += val(m.c); S.seq.push(m.c); S.pegged.push({ p: pl, c: m.c, r: S.run }); S.lastBy = pl;
      var parts = pegPoints(S.seq, S.count), pts = 0;
      parts.forEach(function (x) { pts += x.pts; });
      var out = { t: 'play', p: pl, c: m.c, count: S.count, parts: parts, pts: pts };
      S.ev = [];
      if (add(S, pl, pts, 'play')) { out.over = true; return out; }
      if (!S.inHand[0].length && !S.inHand[1].length) {   // every card played: the last one scores 1 (unless it made 31)
        if (S.count !== 31) { out.last = true; if (add(S, pl, 1, 'last card')) { out.over = true; return out; } }
        S.phase = 'show'; S.showStep = 0; out.peggedOut = true;
        return out;
      }
      if (S.count === 31) { resetCount(S); S.turn = 1 - pl; return out; }
      S.turn = S.said[1 - pl] ? pl : 1 - pl;
      return out;
    }
    if (m.t === 'go') {
      if (S.phase !== 'peg') return false;
      var gp = S.turn, o = 1 - gp;
      if (legal(S, gp).length) return false;
      S.said[gp] = true; S.ev = [];
      var g = { t: 'go', p: gp };
      if (S.said[o]) {   // neither can play: the last to play scores 1, and the count starts again
        g.to = S.lastBy; g.pts = S.count > 0 ? 1 : 0;
        if (S.lastBy >= 0 && S.count > 0 && add(S, S.lastBy, 1, 'go')) { g.over = true; return g; }
        var lb = S.lastBy; resetCount(S); S.turn = lb >= 0 ? 1 - lb : o;
        g.reset = true;
      } else S.turn = o;
      return g;
    }
    if (m.t === 'count') {
      if (S.phase !== 'show' || S.showStep > 2) return false;
      var who = S.showStep === 0 ? 1 - S.dealer : S.dealer, crib = S.showStep === 2, cards = crib ? S.crib.slice() : S.held[who].slice();
      var r = score(cards, S.starter, crib);
      S.shown = { who: who, crib: crib, cards: cards, total: r.total, parts: r.parts };
      S.counts.push(S.shown); S.showStep++; S.ev = [];
      if (r.total > S.best[who] && !crib) S.best[who] = r.total;
      var c = { t: 'count', who: who, crib: crib, total: r.total };
      if (add(S, who, r.total, crib ? 'crib' : 'hand')) { c.over = true; return c; }
      if (S.showStep === 3) S.phase = 'handEnd';
      return c;
    }
    if (m.t === 'next') {
      if (S.phase !== 'handEnd') return false;
      startHand(S);
      return { t: 'next', hand: S.hand };
    }
    return false;
  }
  // the next thing that happens without you choosing: the computer's card; a "Go" when someone can't play; the
  // first hand counted when the play is over
  function auto(S) {
    if (S.phase === 'peg') {
      if (!legal(S, S.turn).length) return { t: 'go' };
      return S.turn === 1 ? { t: 'play', c: aiPlay(S, 1) } : null;
    }
    if (S.phase === 'show' && S.showStep === 0) return { t: 'count' };
    return null;
  }

  // ---------------------------------------------------------------- the computer player: what to put in the crib
  function unseenFor(S, p, extra) {   // the cards p hasn't seen
    var seen = {}; S.hands[p].forEach(function (c) { seen[c] = 1; }); (extra || []).forEach(function (c) { seen[c] = 1; });
    var out = []; for (var c = 0; c < 52; c++) if (!seen[c]) out.push(c); return out;
  }
  function cribGuess(pair, mine) {   // a rough worth of two cards in a crib (theirs to keep, or given away)
    var a = pair[0], b = pair[1], v = 0;
    if (val(a) + val(b) === 15) v += 2;
    if (rank(a) === rank(b)) v += 2;
    if (Math.abs(rank(a) - rank(b)) === 1) v += 1;
    if (Math.abs(rank(a) - rank(b)) === 2) v += 0.5;
    if (rank(a) === 5) v += 1.5; if (rank(b) === 5) v += 1.5;
    if (suit(a) === suit(b)) v += 0.2;
    return v;
  }
  function aiDiscard(S, p) {
    var h = S.hands[p], lv = S.lv, mine = S.dealer === p, best = null, bs = -Infinity, pairs = [], i, j;
    for (i = 0; i < 6; i++) for (j = i + 1; j < 6; j++) pairs.push([h[i], h[j]]);
    if (lv === 1 && whim(S, 7) < 0.5) return pairs[Math.floor(whim(S, 8) * pairs.length)].slice();   // Easy: often just any two
    var uns = lv >= 5 ? unseenFor(S, p) : null;
    pairs.forEach(function (pr) {
      var keep = h.filter(function (c) { return pr.indexOf(c) < 0; }), v;
      if (lv <= 3) v = score(keep, null, false).total + (mine ? 1 : -1) * cribGuess(pr) * 0.6;
      else {   // every starter it might be: the hand's average, and the crib's (its own counts for it, the other's against it)
        var t = 0; uns.forEach(function (st) { t += score(keep, st, false).total; });
        v = t / uns.length + (mine ? 1 : -1) * cribGuess(pr);
        if (lv >= 7) v += keep.filter(function (c) { return val(c) <= 4; }).length * 0.25 - (mine ? 0 : 0.2 * pr.filter(function (c) { return rank(c) === 5; }).length);
      }
      if (v > bs + 1e-9) { bs = v; best = pr; }
    });
    return best.slice();
  }

  // ---------------------------------------------------------------- the computer player: the play
  function aiPlay(S, p) {
    var L = legal(S, p), lv = S.lv;
    if (L.length === 1) return L[0];
    if (lv === 1 && whim(S, 3) < 0.45) return L[Math.floor(whim(S, 4) * L.length)];
    var o = 1 - p, known = S.held[p].concat(S.gave[p]).concat(S.pegged.map(function (x) { return x.c; })).concat([S.starter]);
    var seen = {}; known.forEach(function (c) { seen[c] = 1; });
    var uns = []; for (var c = 0; c < 52; c++) if (!seen[c]) uns.push(c);
    var oppN = S.inHand[o].length, U = uns.length || 1;
    function pHas(fn) { var n = uns.filter(fn).length; return Math.min(1, n * oppN / U); }   // the chance they hold such a card
    var best = null, bs = -Infinity;
    L.forEach(function (c) {
      var seq = S.seq.concat([c]), cnt = S.count + val(c), gain = 0;
      pegPoints(seq, cnt).forEach(function (x) { gain += x.pts; });
      var v = gain * 10;
      if (lv >= 3) {
        if (cnt === 5 || cnt === 21) v -= 6;                                     // a ten makes 15 or 31 off it
        if (cnt < 15 && cnt > 4) v -= 20 * pHas(function (x) { return val(x) === 15 - cnt; }) * (lv >= 5 ? 1 : 0.6);
        if (cnt < 31 && cnt > 20) v -= 20 * pHas(function (x) { return val(x) === 31 - cnt; }) * (lv >= 5 ? 1 : 0.6);
        if (!S.seq.length && val(c) <= 4) v += 3;                                // a low lead can't be fifteened
        if (!S.seq.length && rank(c) === 5) v -= 5;
        if (lv >= 5 && cnt < 31) {   // a card they may pair - unless we hold another to make three of a kind
          var again = S.inHand[p].filter(function (x) { return x !== c && rank(x) === rank(c); }).length;
          v -= (again ? -6 : 12) * pHas(function (x) { return rank(x) === rank(c); });
        }
        if (lv >= 7 && cnt < 31) {   // Expert: what they could score straight back off this card
          var reply = 0;
          uns.forEach(function (x) {
            if (cnt + val(x) > 31) return;
            var g = 0; pegPoints(seq.concat([x]), cnt + val(x)).forEach(function (y) { g += y.pts; });
            reply += g;
          });
          v -= reply / U * oppN * 6;
        }
        v -= val(c) * 0.3;   // keep the high cards back, other things equal
      }
      if (v > bs + 1e-9) { bs = v; best = c; }
    });
    return best;
  }
  // for the Hint: what a good player would do in your seat (it works only from what you can see)
  function hint(S) {
    var k = S.lv, m = null;
    S.lv = 5;
    if (S.phase === 'discard') m = { t: 'discard', cards: aiDiscard(S, 0) };
    else if (S.phase === 'peg' && S.turn === 0 && legal(S, 0).length) m = { t: 'play', c: aiPlay(S, 0) };
    S.lv = k; return m;
  }
  function valid(S) {
    return !!(S && S.v === 1 && Array.isArray(S.hands) && S.hands.length === 2 && Array.isArray(S.scores) && LV[S.lv] && ['discard', 'peg', 'show', 'handEnd', 'over'].indexOf(S.phase) >= 0);
  }
  return {
    LV: LV, GAME: GAME, suit: suit, rank: rank, val: val, clone: clone, score: score, pegPoints: pegPoints, newMatch: newMatch,
    legal: legal, apply: apply, auto: auto, aiDiscard: aiDiscard, aiPlay: aiPlay, hint: hint, valid: valid
  };
});
