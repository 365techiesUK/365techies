/* 365 Whist - the rules and the three computer players, with no screen code (5 Oct 2026; owner: "yes do Cribbage and
 * Whist next"). Classic partnership whist: you (player 0) and your partner Jo (2, across) against Sam (1, on your left)
 * and Alex (3, on your right); play goes round to the left, 0 -> 1 -> 2 -> 3. All 52 cards are dealt; the dealer's
 * last card is shown to everyone and its suit is TRUMPS for the hand. The player on the dealer's left leads; follow
 * suit if you can, otherwise play any card - a trump wins the trick unless a higher trump beats it. After 13 tricks the
 * side with more than six (the "book") scores a point for each trick over six. First side to 5 points wins the game;
 * two games win the RUBBER (the match). (Simple scoring: no points for honours.)
 * Levels are how well the computer players play - your partner too: 1 Easy (careless), 3 Normal (the old rules:
 * second hand low, third hand high, cover an honour, return partner's lead, don't trump partner's winner), 5 Hard
 * (they remember every card played and who is out of which suit, lead the winners, draw trumps), 7 Expert (and they
 * count the trumps out and hold back a winner rather than waste it).
 * Everything the computer does is worked out from the state - no hidden randomness - so the same deal number and the
 * same cards from you give the same game on every computer. The page loads this as window.WhistEngine.
 * A card is a number 0-51: suit = card / 13 (0 spades, 1 hearts, 2 diamonds, 3 clubs), rank = card % 13 + 1 (Ace 1,
 * but the Ace is the HIGHEST card in whist - hi() gives 14). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WhistEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LV = { 1: 'Easy', 3: 'Normal', 5: 'Hard', 7: 'Expert' };
  var NAMES = ['You', 'Sam', 'Jo', 'Alex'];
  var SUIT_NAME = ['spades', 'hearts', 'diamonds', 'clubs'];
  var GAME = 5;
  function suit(c) { return (c / 13) | 0; }
  function rank(c) { return (c % 13) + 1; }
  function hi(c) { var r = (c % 13) + 1; return r === 1 ? 14 : r; }
  function team(p) { return p % 2; }   // 0: you and Jo, 1: Sam and Alex
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
  function whim(S, p, k) { return rng((S.seed * 131 + S.hand * 977 + S.tricks * 61 + S.trick.length * 13 + p * 7 + (k || 0) * 104729) >>> 0)(); }
  function sortHand(h, trump) {
    // trumps at the right-hand end, the other suits alternating colour; low to high within a suit
    var order = [[3, 2, 0, 1], [0, 3, 2, 1], [0, 1, 3, 2], [2, 0, 1, 3]][trump];
    return h.slice().sort(function (a, b) { return order.indexOf(suit(a)) - order.indexOf(suit(b)) || hi(a) - hi(b); });
  }

  // ---------------------------------------------------------------- a rubber, and each hand
  function newMatch(seed, lv) {
    var S = { v: 1, seed: (seed >>> 0) || 1, lv: LV[lv] ? lv : 3, hand: -1, dealer: 2, points: [0, 0], games: [0, 0], gameNo: 1, history: [],
              phase: 'play', hands: [[], [], [], []], trump: 0, turnUp: 0, trick: [], won: [0, 0, 0, 0], tricks: 0, leader: 0, turn: 0, played: [],
              voids: [], last: null, winner: -1, lastHand: null };
    startHand(S);
    return S;
  }
  function startHand(S) {
    S.hand++;
    S.dealer = (S.dealer + 1) % 4;   // the deal moves round to the left; Alex deals the first hand, so you lead first
    var r = rng((S.seed * 2654435761 + S.hand * 40503 + 17) >>> 0), d = [], i;
    for (i = 0; i < 52; i++) d.push(i);
    for (i = 51; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = d[i]; d[i] = d[j]; d[j] = t; }
    S.hands = [[], [], [], []];
    for (i = 0; i < 52; i++) S.hands[(S.dealer + 1 + i) % 4].push(d[i]);   // dealt from the dealer's left; the last card is the dealer's
    S.turnUp = d[51]; S.trump = suit(d[51]);
    S.hands = S.hands.map(function (h) { return sortHand(h, S.trump); });
    S.trick = []; S.won = [0, 0, 0, 0]; S.piles = [[], [], [], []]; S.tricks = 0; S.played = []; S.last = null;
    S.voids = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; S.lastLead = [null, null, null, null];   // the suit each last led (to return a partner's lead)
    S.leader = S.turn = (S.dealer + 1) % 4; S.phase = 'play';
  }
  function legal(S, p) {
    var h = S.hands[p];
    if (!S.trick.length) return h.slice();
    var led = suit(S.trick[0].c), f = h.filter(function (c) { return suit(c) === led; });
    return f.length ? f : h.slice();
  }
  function whyNot(S, c) {
    if (S.phase !== 'play' || S.turn !== 0) return 'Wait for your turn';
    if (S.hands[0].indexOf(c) < 0 || legal(S, 0).indexOf(c) >= 0) return '';
    return 'You must follow suit – play one of your ' + SUIT_NAME[suit(S.trick[0].c)];
  }
  function winnerOf(trick, trump) {
    var led = suit(trick[0].c), w = trick[0];
    for (var i = 1; i < trick.length; i++) {
      var c = trick[i].c, wc = w.c;
      if (suit(c) === trump && suit(wc) !== trump) w = trick[i];
      else if (suit(c) === suit(wc) && hi(c) > hi(wc)) w = trick[i];
    }
    return w;
  }

  // ---------------------------------------------------------------- moves: play, collect (the trick), next (hand)
  function apply(S, m) {
    if (!m) return false;
    if (m.t === 'play') {
      if (S.phase !== 'play' || S.trick.length >= 4) return false;
      var p = S.turn;
      if (legal(S, p).indexOf(m.c) < 0) return false;
      if (S.trick.length && suit(m.c) !== suit(S.trick[0].c)) S.voids[p][suit(S.trick[0].c)] = 1;
      if (!S.trick.length) S.lastLead[p] = suit(m.c);
      S.hands[p] = S.hands[p].filter(function (c) { return c !== m.c; });
      S.trick.push({ p: p, c: m.c }); S.played.push(m.c);
      var fx = { t: 'play', p: p, c: m.c, trumped: S.trick.length > 1 && suit(m.c) === S.trump && suit(S.trick[0].c) !== S.trump };
      if (S.trick.length === 4) { S.turn = -1; fx.full = true; fx.w = winnerOf(S.trick, S.trump).p; }
      else S.turn = (p + 1) % 4;
      return fx;
    }
    if (m.t === 'collect') {
      if (S.trick.length !== 4) return false;
      var w = winnerOf(S.trick, S.trump).p;
      S.won[w]++; S.piles[w] = S.piles[w].concat(S.trick.map(function (x) { return x.c; })); S.tricks++; S.last = { cards: S.trick.slice(), w: w }; S.trick = []; S.leader = S.turn = w;
      var out = { t: 'collect', w: w, team: team(w) };
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
    var tt = [S.won[0] + S.won[2], S.won[1] + S.won[3]], side = tt[0] > 6 ? 0 : 1, pts = tt[side] - 6;
    S.points[side] += pts;
    var lh = { tricks: tt, side: side, pts: pts, gameWon: -1 };
    if (S.points[side] >= GAME) {   // a game won; two games win the rubber
      S.games[side]++; lh.gameWon = side; lh.gamePoints = S.points.slice();
      S.history.push({ game: S.gameNo, points: S.points.slice(), to: side });
      S.points = [0, 0]; S.gameNo++;
    }
    S.lastHand = lh; out.handOver = true; out.side = side; out.pts = pts; out.gameWon = lh.gameWon;
    if (S.games[side] >= 2) { S.phase = 'over'; S.winner = side; out.over = true; }
    else S.phase = 'handEnd';
  }
  function auto(S) {
    if (S.phase !== 'play') return null;
    if (S.trick.length === 4) return { t: 'collect' };
    if (S.turn !== 0) return { t: 'play', c: ai(S, S.turn) };
    return null;
  }

  // ---------------------------------------------------------------- the computer players
  function bySuit(L, s) { return L.filter(function (c) { return suit(c) === s; }); }
  function lowest(L) { return L.reduce(function (a, c) { return hi(c) < hi(a) ? c : a; }); }
  function highest(L) { return L.reduce(function (a, c) { return hi(c) > hi(a) ? c : a; }); }
  function gone(S) { var g = {}; S.played.forEach(function (c) { g[c] = 1; }); return g; }
  // is c the highest card left in its suit (counting the cards played and the ones in our own hand)?
  function topLeft(S, p, c) {
    var g = gone(S), s = suit(c);
    for (var r = hi(c) + 1; r <= 14; r++) { var x = s * 13 + (r === 14 ? 0 : r - 1); if (!g[x] && S.hands[p].indexOf(x) < 0) return false; }
    return true;
  }
  function ai(S, p) {
    var L = legal(S, p), lv = S.lv;
    if (L.length === 1) return L[0];
    if (lv === 1 && whim(S, p, 1) < 0.4) return L[Math.floor(whim(S, p, 2) * L.length)];
    if (!S.trick.length) return lead(S, p, L);
    var led = suit(S.trick[0].c);
    return bySuit(L, led).length ? follow(S, p, L) : discard(S, p, L);
  }
  function trumpsOut(S, p) {   // trumps not yet seen by p (in other hands)
    var g = gone(S), n = 0;
    for (var r = 0; r < 13; r++) { var x = S.trump * 13 + r; if (!g[x] && S.hands[p].indexOf(x) < 0) n++; }
    return n;
  }
  function lead(S, p, L) {
    var lv = S.lv, h = S.hands[p], T = S.trump, partner = (p + 2) % 4;
    var trumps = bySuit(h, T), side = L.filter(function (c) { return suit(c) !== T; });
    // Hard and up: cash a sure winner in a side suit (not one an opponent is known to be out of - they'd trump it)
    if (lv >= 5) {
      var opp = [(p + 1) % 4, (p + 3) % 4], tOut = trumpsOut(S, p);
      var sure = side.filter(function (c) { return topLeft(S, p, c) && !(tOut && opp.some(function (o) { return S.voids[o][suit(c)] && !S.voids[o][T]; })); });
      if (sure.length) return highest(sure);
      // draw trumps when holding most of them
      if (trumps.length && trumps.length >= tOut && tOut > 0 && (lv >= 7 ? topLeft(S, p, highest(trumps)) || trumps.length >= tOut + 2 : trumps.length >= 4)) return topLeft(S, p, highest(trumps)) ? highest(trumps) : lowest(trumps);
    } else if (trumps.length >= 5) return highest(trumps);   // Normal: lead trumps from five or more
    // return partner's suit (the suit they led last)
    if (S.lastLead && S.lastLead[partner] != null) { var ps = bySuit(side, S.lastLead[partner]); if (ps.length) return lv >= 3 ? highest(ps) : ps[0]; }
    // top of a sequence of honours (A K, K Q, Q J), else the fourth highest of the longest side suit
    var pool = side.length ? side : L, best = null, bl = -Infinity;
    [0, 1, 2, 3].forEach(function (s) {
      var cs = bySuit(pool, s); if (!cs.length) return;
      var n = cs.length + (s === T ? -3 : 0);
      if (n > bl) { bl = n; best = s; }
    });
    var cs = bySuit(pool, best).sort(function (a, b) { return hi(b) - hi(a); });
    if (cs.length >= 2 && hi(cs[0]) >= 12 && hi(cs[0]) - hi(cs[1]) === 1) return cs[0];
    return cs.length >= 4 ? cs[3] : cs[cs.length - 1];
  }
  function follow(S, p, L) {
    var lv = S.lv, w = winnerOf(S.trick, S.trump), partner = (p + 2) % 4, pos = S.trick.length;
    var partnerWins = w.p === partner, led = suit(S.trick[0].c), trumped = suit(w.c) === S.trump && led !== S.trump;
    var over = L.filter(function (c) { return !trumped && hi(c) > hi(w.c); });
    if (partnerWins) {
      // partner is winning: play low - unless we're last... still low (Hard: unless partner's card can still be beaten)
      if (lv >= 5 && pos < 3 && over.length && !topLeft(S, p, w.c)) { var cheap = lowest(over); if (topLeft(S, p, cheap)) return cheap; }
      return lowest(L);
    }
    if (!over.length) return lowest(L);
    if (pos === 1) {   // second hand low - but cover an honour with an honour, and take it with a sure winner
      if (hi(w.c) >= 11 && lv >= 3) return lowest(over);
      if (lv >= 5) { var top = over.filter(function (c) { return topLeft(S, p, c); }); if (top.length && pos === 1 && S.voids[(p + 1) % 4][led] === 0) return lowest(top); }
      return lowest(L);
    }
    if (pos === 2) {   // third hand high: as high as needed to beat what's there (Hard: a sure winner if we have one)
      if (lv >= 5) { var t2 = over.filter(function (c) { return topLeft(S, p, c); }); if (t2.length) return lowest(t2); }
      return highest(over);
    }
    return lowest(over);   // last to play: win it as cheaply as possible
  }
  function discard(S, p, L) {
    var lv = S.lv, w = winnerOf(S.trick, S.trump), partner = (p + 2) % 4, T = S.trump, pos = S.trick.length;
    var trumps = bySuit(L, T), others = L.filter(function (c) { return suit(c) !== T; });
    var partnerWins = w.p === partner && (lv < 5 || pos === 3 || topLeft(S, p, w.c) || suit(w.c) === T);
    if (!partnerWins && trumps.length) {
      var beat = trumps.filter(function (c) { return suit(w.c) !== T || hi(c) > hi(w.c); });
      if (beat.length) {
        // Expert: don't ruff a trick partner may still win if we're second... trump low enough to hold, over-ruff if needed
        if (lv >= 5 && pos < 3) {   // a later opponent may over-trump: use a higher one if they're known to be out of the suit
          var nextOpp = (p + 1) % 4, led = suit(S.trick[0].c);
          if (S.voids[nextOpp][led] && !S.voids[nextOpp][T]) return highest(beat);
        }
        return lowest(beat);
      }
    }
    // throw away: the lowest card of the weakest side suit (keep the suits with winners)
    var pool = others.length ? others : L, best = null, bs = Infinity;
    pool.forEach(function (c) {
      var n = bySuit(S.hands[p], suit(c)).length, keep = lv >= 5 && topLeft(S, p, c) ? 30 : 0;
      var sc = hi(c) + n * 2 + keep;
      if (sc < bs) { bs = sc; best = c; }
    });
    return best;
  }
  // for the Hint: a good player in your seat
  function hint(S) {
    if (S.phase !== 'play' || S.turn !== 0 || S.trick.length === 4) return null;
    var k = S.lv; S.lv = 5; var c = ai(S, 0); S.lv = k;
    return { t: 'play', c: c };
  }
  // a move as a short code for the Hall of Fame's log (the server replays it: api/games-wh-lib.php)
  function code(m) { return m.t === 'play' ? 'c' + m.c : m.t === 'next' ? 'N' : '?'; }
  function valid(S) {
    return !!(S && S.v === 1 && Array.isArray(S.hands) && S.hands.length === 4 && LV[S.lv] && ['play', 'handEnd', 'over'].indexOf(S.phase) >= 0);
  }
  return {
    LV: LV, NAMES: NAMES, SUIT_NAME: SUIT_NAME, GAME: GAME, suit: suit, rank: rank, hi: hi, team: team, clone: clone, sortHand: sortHand,
    newMatch: newMatch, legal: legal, whyNot: whyNot, winnerOf: winnerOf, apply: apply, auto: auto, ai: ai, hint: hint, valid: valid, code: code
  };
});
