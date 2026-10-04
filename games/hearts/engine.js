/* 365 Hearts - the rules and the three computer players, with no screen code (5 Oct 2026; owner: "more ultra popular
 * card games"). Hearts was the fourth card game that came with Windows, after Solitaire, FreeCell and Spider.
 * Four players, 13 cards each; you sit at the bottom (player 0), then West (1), North (2) and East (3) - play goes
 * round to the left, 0 -> 1 -> 2 -> 3. Before each hand everyone passes three cards: left, right, across, then a
 * hand with no passing, and round again. The 2 of clubs leads the first trick. Follow suit if you can. No hearts or
 * Queen of spades on the first trick (unless you have nothing else), and hearts can't be led until one has been
 * played (unless you have only hearts). Each heart taken is 1 point, the Queen of spades 13. Take all 26 - "shoot the
 * moon" - and everyone else gets 26 instead. The match ends when someone reaches 100: the LOWEST score wins.
 * Levels are how well the computer players play: 1 Easy (careless), 3 Normal, 5 Hard (they remember every card,
 * flush out the Queen and stop a moon), 7 Expert (and they try to shoot the moon themselves).
 * Everything the computer does is worked out from the state - no hidden randomness - so the same deal number and the
 * same cards from you give the same game on every computer.
 * The page loads this as window.HeartsEngine; the tests require() it.
 * A card is a number 0-51: suit = card / 13 (0 spades, 1 hearts, 2 diamonds, 3 clubs), rank = card % 13 + 1 (Ace 1,
 * but the Ace is the HIGHEST card in Hearts - hi() gives 14). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HeartsEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SP = 0, HE = 1, DI = 2, CL = 3;
  var QS = 11, AS = 0, KS = 12, TWO_C = 40;   // the Queen, Ace and King of spades; the 2 of clubs
  var LV = { 1: 'Easy', 3: 'Normal', 5: 'Hard', 7: 'Expert' };
  var NAMES = ['You', 'Sam', 'Jo', 'Alex'];
  var DIR = ['left', 'right', 'across', 'none'];
  var SUIT_NAME = ['spades', 'hearts', 'diamonds', 'clubs'];
  var SHOW = [CL, DI, SP, HE];   // the order a hand is laid out in: black, red, black, red

  function suit(c) { return (c / 13) | 0; }
  function rank(c) { return (c % 13) + 1; }
  function hi(c) { var r = (c % 13) + 1; return r === 1 ? 14 : r; }
  function pts(c) { return suit(c) === HE ? 1 : c === QS ? 13 : 0; }
  function clone(S) { return JSON.parse(JSON.stringify(S)); }

  // mulberry32, as the other card games shuffle: the same deal number is the same deal on every computer
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
  // a number from 0 to 1 that depends only on where the game is (the Easy players' carelessness)
  function whim(S, p, k) { return rng((S.seed * 131 + S.hand * 977 + S.tricks * 61 + S.trick.length * 13 + p * 7 + (k || 0) * 104729) >>> 0)(); }

  function sortHand(h) {
    return h.slice().sort(function (a, b) { var sa = SHOW.indexOf(suit(a)), sb = SHOW.indexOf(suit(b)); return sa - sb || hi(a) - hi(b); });
  }

  // ---------------------------------------------------------------- a match, and each hand
  function newMatch(seed, lv) {
    var S = { v: 1, seed: (seed >>> 0) || 1, lv: LV[lv] ? lv : 3, target: 100, hand: -1, scores: [0, 0, 0, 0], history: [], moons: [0, 0, 0, 0],
              phase: 'deal', hands: [[], [], [], []], trick: [], won: [[], [], [], []], taken: [0, 0, 0, 0], played: [], tricks: 0, broken: false,
              leader: 0, turn: 0, dir: 0, got: [], passed: [], voids: [], last: null, moonTry: [0, 0, 0, 0], winner: -1, lastHand: null };
    startHand(S);
    return S;
  }
  function startHand(S) {
    S.hand++;
    var r = rng((S.seed * 2654435761 + S.hand * 40503 + 7) >>> 0), d = [], i;
    for (i = 0; i < 52; i++) d.push(i);
    for (i = 51; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = d[i]; d[i] = d[j]; d[j] = t; }
    S.hands = [[], [], [], []];
    for (i = 0; i < 52; i++) S.hands[i % 4].push(d[i]);
    S.hands = S.hands.map(sortHand);
    S.dir = S.hand % 4; S.trick = []; S.won = [[], [], [], []]; S.taken = [0, 0, 0, 0]; S.played = []; S.tricks = 0; S.broken = false;
    S.got = []; S.passed = [[], [], [], []]; S.voids = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; S.last = null; S.moonTry = [0, 0, 0, 0];
    if (S.dir === 3) beginPlay(S); else S.phase = 'pass';
  }
  function owner(S, c) { for (var p = 0; p < 4; p++) if (S.hands[p].indexOf(c) >= 0) return p; return -1; }
  function beginPlay(S) {
    S.phase = 'play'; S.leader = S.turn = owner(S, TWO_C);
    if (S.lv >= 7) for (var p = 1; p < 4; p++) S.moonTry[p] = moonHand(S.hands[p]) ? 1 : 0;
  }
  function passTo(S, p) { return (p + [1, 3, 2, 0][S.dir]) % 4; }

  // ---------------------------------------------------------------- what may be played
  function legal(S, p) {
    var h = S.hands[p], out;
    if (!S.trick.length) {
      if (S.tricks === 0) return h.indexOf(TWO_C) >= 0 ? [TWO_C] : h.slice();
      if (!S.broken) { out = h.filter(function (c) { return suit(c) !== HE; }); if (out.length) return out; }
      return h.slice();
    }
    var led = suit(S.trick[0].c);
    out = h.filter(function (c) { return suit(c) === led; });
    if (out.length) return out;
    if (S.tricks === 0) { out = h.filter(function (c) { return pts(c) === 0; }); if (out.length) return out; }
    return h.slice();
  }
  // in plain words, why a card can't be played (for the screen)
  function whyNot(S, c) {
    if (S.phase === 'pass') return '';
    if (S.phase !== 'play' || S.turn !== 0) return 'Wait for your turn';
    var h = S.hands[0];
    if (h.indexOf(c) < 0) return '';
    if (legal(S, 0).indexOf(c) >= 0) return '';
    if (!S.trick.length && S.tricks === 0) return 'The 2 of clubs starts the first trick';
    if (!S.trick.length) return 'Hearts can’t be led until a heart has been played';
    var led = suit(S.trick[0].c);
    if (h.some(function (x) { return suit(x) === led; })) return 'You must follow suit – play one of your ' + SUIT_NAME[led];
    return 'No hearts or Queen of spades on the first trick';
  }
  function winnerOf(trick) {
    var led = suit(trick[0].c), w = trick[0];
    for (var i = 1; i < trick.length; i++) if (suit(trick[i].c) === led && hi(trick[i].c) > hi(w.c)) w = trick[i];
    return w;
  }

  // ---------------------------------------------------------------- moves: pass, play, collect (the trick), next (hand)
  function apply(S, m) {
    if (!m) return false;
    if (m.t === 'pass') {
      if (S.phase !== 'pass' || !m.cards || m.cards.length !== 3) return false;
      var mine = m.cards.slice(), seen = {};
      for (var i = 0; i < 3; i++) { if (S.hands[0].indexOf(mine[i]) < 0 || seen[mine[i]]) return false; seen[mine[i]] = 1; }
      var sent = [mine, aiPass(S, 1), aiPass(S, 2), aiPass(S, 3)];
      for (var p = 0; p < 4; p++) S.hands[p] = S.hands[p].filter(function (c) { return sent[p].indexOf(c) < 0; });
      for (p = 0; p < 4; p++) { var to = passTo(S, p); S.hands[to] = sortHand(S.hands[to].concat(sent[p])); }
      S.passed = sent; S.got = sent[(0 + [3, 1, 2, 0][S.dir]) % 4].slice();   // what came to you, from the player who passed to you
      beginPlay(S);
      return { t: 'pass', sent: mine, got: S.got.slice(), from: (0 + [3, 1, 2, 0][S.dir]) % 4, to: passTo(S, 0) };
    }
    if (m.t === 'play') {
      if (S.phase !== 'play' || S.trick.length >= 4) return false;
      var pl = S.turn;
      if (legal(S, pl).indexOf(m.c) < 0) return false;
      var lead = S.trick.length ? suit(S.trick[0].c) : -1, fx = { t: 'play', p: pl, c: m.c };
      if (lead >= 0 && suit(m.c) !== lead) S.voids[pl][lead] = 1;
      S.hands[pl] = S.hands[pl].filter(function (c) { return c !== m.c; });
      S.trick.push({ p: pl, c: m.c }); S.played.push(m.c);
      if (suit(m.c) === HE && !S.broken) { S.broken = true; fx.broke = true; }
      if (m.c === QS) fx.queen = true;
      if (S.trick.length === 4) { S.turn = -1; fx.full = true; fx.w = winnerOf(S.trick).p; }
      else S.turn = (pl + 1) % 4;
      return fx;
    }
    if (m.t === 'collect') {
      if (S.trick.length !== 4) return false;
      var w = winnerOf(S.trick).p, cards = S.trick.map(function (x) { return x.c; }), got = 0;
      cards.forEach(function (c) { got += pts(c); });
      S.won[w] = S.won[w].concat(cards); S.taken[w] += got; S.tricks++;
      S.last = { cards: S.trick.slice(), w: w }; S.trick = []; S.leader = S.turn = w;
      // a moon try is given up as soon as someone else takes a point
      for (var q = 1; q < 4; q++) if (S.moonTry[q] && got && w !== q) S.moonTry[q] = 0;
      var out = { t: 'collect', w: w, pts: got, queen: cards.indexOf(QS) >= 0 };
      if (S.tricks === 13) endHand(S, out);
      return out;
    }
    if (m.t === 'next') {
      if (S.phase !== 'handEnd') return false;
      startHand(S);
      return { t: 'next', hand: S.hand };
    }
    return false;
  }
  function endHand(S, out) {
    var moon = -1, add = S.taken.slice(), p;
    for (p = 0; p < 4; p++) if (S.taken[p] === 26) moon = p;
    if (moon >= 0) { add = [26, 26, 26, 26]; add[moon] = 0; S.moons[moon]++; }
    for (p = 0; p < 4; p++) S.scores[p] += add[p];
    S.history.push(add);
    S.lastHand = { taken: S.taken.slice(), add: add, moon: moon };
    out.handOver = true; out.moon = moon;
    var top = Math.max.apply(null, S.scores);
    if (top >= S.target) {
      var low = Math.min.apply(null, S.scores), at = [];
      for (p = 0; p < 4; p++) if (S.scores[p] === low) at.push(p);
      if (at.length === 1) { S.phase = 'over'; S.winner = at[0]; out.over = true; out.winner = at[0]; return; }
    }
    S.phase = 'handEnd';
  }
  // the next thing that happens without you: a computer player's card, or the trick being taken in
  function auto(S) {
    if (S.phase !== 'play') return null;
    if (S.trick.length === 4) return { t: 'collect' };
    if (S.turn !== 0) return { t: 'play', c: ai(S, S.turn) };
    return null;
  }

  // ---------------------------------------------------------------- the computer players: passing
  function aiPass(S, p) {
    var h = S.hands[p].slice(), lv = S.lv, out = [];
    function take(c) { if (out.length < 3 && out.indexOf(c) < 0 && h.indexOf(c) >= 0) out.push(c); }
    if (lv === 1) {   // Easy: the three highest cards, more or less
      h.slice().sort(function (a, b) { return hi(b) - hi(a) || a - b; }).forEach(function (c, i) { if (whim(S, p, i) < 0.75) take(c); });
      h.slice().sort(function (a, b) { return hi(b) - hi(a) || a - b; }).forEach(take);
      return out;
    }
    if (lv >= 7 && moonHand(h)) {   // keeping a moon hand together: pass the low cards instead
      h.slice().sort(function (a, b) { return hi(a) - hi(b) || a - b; }).forEach(function (c) { if (suit(c) !== HE || hi(c) < 6) take(c); });
      return out;
    }
    var spades = h.filter(function (c) { return suit(c) === SP; }), longSp = spades.length >= 5;
    // the Queen of spades goes - unless enough low spades guard her (Hard and up keep her then)
    if (h.indexOf(QS) >= 0 && !(lv >= 5 && longSp)) take(QS);
    if (!(lv >= 5 && longSp)) { take(AS); take(KS); }
    // Hard and up: empty a short club or diamond suit, so hearts and the Queen can be thrown away early
    if (lv >= 5) {
      [CL, DI].map(function (s) { return h.filter(function (c) { return suit(c) === s && c !== TWO_C; }); })
        .filter(function (l) { return l.length && l.length <= 3 - out.length; })
        .sort(function (a, b) { return a.length - b.length || suit(b[0]) - suit(a[0]); })   // (clubs first on a tie)
        .slice(0, 1).forEach(function (l) { l.forEach(take); });
    }
    // then the highest hearts, then the highest of anything
    h.filter(function (c) { return suit(c) === HE && hi(c) >= 10; }).sort(function (a, b) { return hi(b) - hi(a); }).forEach(take);
    // (every sort here gives one order only - the server replays these choices exactly: api/games-he-lib.php)
    h.slice().sort(function (a, b) { return hi(b) - hi(a) || (suit(a) === SP ? 0 : 1) - (suit(b) === SP ? 0 : 1) || a - b; }).forEach(function (c) { if (!(suit(c) === SP && hi(c) < 12)) take(c); });
    h.slice().sort(function (a, b) { return hi(b) - hi(a) || a - b; }).forEach(take);
    return out;
  }
  // a hand worth trying to take every point with (Expert): long, high hearts and the top spades
  function moonHand(h) {
    var he = h.filter(function (c) { return suit(c) === HE; }), top = he.filter(function (c) { return hi(c) >= 11; }).length;
    var big = h.filter(function (c) { return hi(c) >= 12; }).length;
    return he.length >= 6 && top >= 3 && big >= 6 && h.indexOf(AS) >= 0;
  }

  // ---------------------------------------------------------------- the computer players: playing a card
  function out_(S) {   // the cards not yet seen by everyone (still in someone's hand)
    var seen = {}; S.played.forEach(function (c) { seen[c] = 1; }); S.trick.forEach(function (x) { seen[x.c] = 1; });
    var o = []; for (var c = 0; c < 52; c++) if (!seen[c]) o.push(c); return o;
  }
  function ai(S, p) {
    var L = legal(S, p), lv = S.lv;
    if (L.length === 1) return L[0];
    if (lv === 1 && whim(S, p, 1) < 0.4) return L[Math.floor(whim(S, p, 2) * L.length)];   // Easy: often careless
    if (lv >= 7 && S.moonTry[p]) { var mc = moonPlay(S, p, L); if (mc != null) return mc; }
    return S.trick.length ? (L.every(function (c) { return suit(c) === suit(S.trick[0].c); }) ? follow(S, p, L) : discard(S, p, L)) : lead(S, p, L);
  }
  function lowest(L) { return L.reduce(function (a, c) { return hi(c) < hi(a) ? c : a; }); }
  function highest(L) { return L.reduce(function (a, c) { return hi(c) > hi(a) ? c : a; }); }
  function bySuit(L, s) { return L.filter(function (c) { return suit(c) === s; }); }

  function lead(S, p, L) {
    var lv = S.lv, h = S.hands[p], o = out_(S).filter(function (c) { return h.indexOf(c) < 0; });
    var qsOut = o.indexOf(QS) >= 0, haveQ = h.indexOf(QS) >= 0;
    var opts = L.filter(function (c) { return suit(c) !== HE || L.every(function (x) { return suit(x) === HE; }); });
    if (!opts.length) opts = L;
    // Hard and up: no Queen, Ace or King of spades in hand and the Queen still out - lead spades to flush her
    if (lv >= 5 && qsOut && !haveQ && h.indexOf(AS) < 0 && h.indexOf(KS) < 0) {
      var sp = bySuit(opts, SP).filter(function (c) { return hi(c) < 12; });
      if (sp.length) return highest(sp);
    }
    // never lead the Queen, or a top spade that could pull her onto yourself
    var safe = opts.filter(function (c) { return c !== QS && !(qsOut && (c === AS || c === KS)); });
    if (!safe.length) safe = opts;
    if (lv >= 5) {   // a card nobody can go under: someone else must win it
      var sure = safe.filter(function (c) { return suit(c) !== SP || !haveQ; }).filter(function (c) {
        return !o.some(function (x) { return suit(x) === suit(c) && hi(x) < hi(c); }) && o.some(function (x) { return suit(x) === suit(c); });
      });
      if (sure.length) return lowest(sure);
    }
    // the lowest card of the shortest suit (to empty it); hearts, when they must be led, the lowest
    var best = null, bs = Infinity;
    safe.forEach(function (c) {
      var n = bySuit(h, suit(c)).length + (suit(c) === HE ? 6 : 0) + (suit(c) === SP && haveQ ? 4 : 0);
      var sc = n * 20 + hi(c);
      // Expert: not a suit someone is known to be out of - they would throw their points (or the Queen) on it
      if (lv >= 7) for (var q = 0; q < 4; q++) if (q !== p && S.voids[q][suit(c)] && S.hands[q].length) sc += 120;
      if (sc < bs) { bs = sc; best = c; }
    });
    return best;
  }
  function follow(S, p, L) {
    var lv = S.lv, w = winnerOf(S.trick), led = suit(S.trick[0].c), last = S.trick.length === 3;
    var inTrick = 0; S.trick.forEach(function (x) { inTrick += pts(x.c); });
    var under = L.filter(function (c) { return hi(c) < hi(w.c); });
    // spades with the Queen in hand: drop her under the Ace or King
    if (led === SP && L.indexOf(QS) >= 0 && hi(w.c) > 12) return QS;
    // Hard and up: stop a moon - someone has every point so far, late in the hand: take a point off them if we can
    if (lv >= 5 && moonThreat(S, p) === w.p && inTrick > 0) {
      var over = L.filter(function (c) { return hi(c) > hi(w.c) && c !== QS; });
      if (over.length) return lowest(over);
    }
    if (last && inTrick === 0 && !(led === HE)) {   // last to play and nothing in it: win it with the highest (not the Queen)
      var big = L.filter(function (c) { return c !== QS; });
      if (big.length) {
        var top = highest(big);
        if (!(led === SP && S.played.indexOf(QS) < 0 && hi(top) > 12 && lv >= 3 && under.length)) return top;
      }
    }
    if (under.length) {   // go under the winning card with the highest that still loses
      var u = under.filter(function (c) { return c !== QS || hi(w.c) > 12; });
      if (u.length) return highest(u);
    }
    // must win: the lowest if others still play (they may go over), the highest if last
    var nq = L.filter(function (c) { return c !== QS; });
    if (!nq.length) nq = L;
    return last ? highest(nq) : lowest(nq);
  }
  function discard(S, p, L) {
    var lv = S.lv, h = S.hands[p], w = winnerOf(S.trick);
    var threat = lv >= 5 ? moonThreat(S, p) : -1;
    if (threat >= 0 && threat === w.p) {   // don't feed a moon: throw a plain card
      var plain = L.filter(function (c) { return pts(c) === 0; });
      if (plain.length) return highest(plain);
    }
    if (L.indexOf(QS) >= 0) return QS;   // the Queen goes the first chance she gets
    if (S.played.indexOf(QS) < 0 && h.indexOf(QS) < 0) { if (L.indexOf(AS) >= 0) return AS; if (L.indexOf(KS) >= 0) return KS; }
    var he = bySuit(L, HE);
    if (he.length) return highest(he);
    // otherwise the highest card of the suit we hold fewest of (to empty it)
    var best = null, bs = -Infinity;
    L.forEach(function (c) { var sc = hi(c) * 2 - bySuit(h, suit(c)).length * 3; if (sc > bs) { bs = sc; best = c; } });
    return best;
  }
  // a player who has every point taken so far (with enough of them, past half way): a moon may be on
  function moonThreat(S, me) {
    var who = -1, tot = 0;
    for (var p = 0; p < 4; p++) if (S.taken[p]) { if (who >= 0) return -1; who = p; tot = S.taken[p]; }
    return who >= 0 && who !== me && S.tricks >= 5 && tot >= 6 ? who : -1;
  }
  // Expert, going for the moon: win tricks - lead from the top, take every point
  function moonPlay(S, p, L) {
    if (!S.trick.length) return highest(L);
    var w = winnerOf(S.trick), led = suit(S.trick[0].c);
    var over = L.filter(function (c) { return suit(c) === led && hi(c) > hi(w.c); });
    if (over.length) return highest(over);
    var plain = L.filter(function (c) { return pts(c) === 0; });
    return plain.length ? lowest(plain) : lowest(L);
  }
  // for the Hint: what a good player would do in your seat
  function hint(S) {
    if (S.phase === 'pass') { var keep = S.lv; S.lv = 5; var h = aiPass(S, 0); S.lv = keep; return { t: 'pass', cards: h }; }
    if (S.phase !== 'play' || S.turn !== 0) return null;
    var k = S.lv; S.lv = 5; var c = ai(S, 0); S.lv = k;
    return { t: 'play', c: c };
  }
  // a move as a short code for the Hall of Fame's log (the server replays it: api/games-he-lib.php he_decode)
  function code(m) { return m.t === 'pass' ? 'P' + m.cards.join('.') : m.t === 'play' ? 'c' + m.c : m.t === 'next' ? 'N' : '?'; }
  function valid(S) {
    return !!(S && S.v === 1 && Array.isArray(S.hands) && S.hands.length === 4 && Array.isArray(S.scores) && LV[S.lv] && ['pass', 'play', 'handEnd', 'over'].indexOf(S.phase) >= 0);
  }

  return {
    SP: SP, HE: HE, DI: DI, CL: CL, QS: QS, TWO_C: TWO_C, LV: LV, NAMES: NAMES, DIR: DIR, SUIT_NAME: SUIT_NAME,
    suit: suit, rank: rank, hi: hi, pts: pts, clone: clone, sortHand: sortHand, newMatch: newMatch, legal: legal, whyNot: whyNot,
    apply: apply, auto: auto, ai: ai, aiPass: aiPass, hint: hint, code: code, passTo: passTo, winnerOf: winnerOf, valid: valid, moonHand: moonHand
  };
});
