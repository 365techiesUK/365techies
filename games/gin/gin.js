/* 365 Gin Rummy on the shared table for games against the computer, games/common/rivals.js (5 Oct 2026; owner: "more
 * ultra popular card games"). The rules and the computer player (Sam) are in engine.js (window.GinEngine).
 * Sam's cards lie face down along the top; the deck and the discard pile are in the middle; your hand is along the
 * bottom, laid out for you: your melds first (each group together), then the loose cards, with your deadwood counted.
 * When the hand ends both hands are turned up, laid out in melds, and any of your cards laid off on Sam's melds (or
 * Sam's on yours) glow. */
(function () {
  'use strict';
  var E = window.GinEngine, OPP = 'Sam';
  var RW = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function cname(c) { return RW[E.rank(c)] + ' of ' + E.SUIT_NAME[E.suit(c)]; }

  // ------------------------------------------------------------ where everything sits
  function layout(W, H) {
    var tall = H > W * 1.1, gap = clamp(Math.round(Math.min(W, H) * 0.016), 6, 16), stepK = tall ? 0.42 : 0.5, gk = tall ? 0.18 : 0.3;
    var byW = (W - gap * 2) / (1 + 10 * stepK + 3 * gk), byH = (H - gap * 6 - 150) / 3.0 / 1.4;
    var cw = Math.floor(clamp(Math.min(byW, byH), 40, 124)), ch = Math.round(cw * 1.4);
    var L = { W: W, H: H, cw: cw, ch: ch, gap: gap, tall: tall, step: Math.round(cw * stepK), gk: Math.round(cw * gk), osc: tall ? 0.62 : 0.66 };
    L.handY = H - gap - ch;
    L.oppY = Math.round(gap - ch * (1 - L.osc) / 2);
    L.cx = Math.round(W / 2);
    var top = gap + ch * L.osc + 40, bottom = L.handY - 46;
    L.rowY = Math.round(top + (bottom - top - ch) * (tall ? 0.28 : 0.3));
    L.stockX = Math.round(L.cx - cw - gap * 1.5); L.pileX = Math.round(L.cx + gap * 1.5);
    L.deck = { x: L.stockX, y: L.rowY };
    var pw = Math.min(W - gap * 2, tall ? 360 : 460);
    L.panel = { x: Math.round((W - pw) / 2), y: Math.round(L.rowY + ch + 34), w: pw };
    L.panelEnd = { x: L.panel.x, y: Math.round(gap + ch * L.osc + 40), w: pw };
    return L;
  }
  // a row of cards laid out in groups: [[melds...], loose]; returns x for each, centred on cx
  function rowXs(groups, L, step, gk, cw) {
    var xs = [], n = 0, width = cw;
    groups.forEach(function (g, gi) { g.forEach(function (c, i) { if (n > 0) width += step + (i === 0 && gi > 0 ? gk : 0); n++; }); });
    var x = L.cx - width / 2, first = true, out = {};
    groups.forEach(function (g, gi) { g.forEach(function (c, i) { if (!first) x += step + (i === 0 && gi > 0 ? gk : 0); out[c] = x; first = false; }); });
    return out;
  }
  function yourGroups(S) {
    if (S.result && !S.result.draw) {   // the end of a hand: as the showdown laid it out
      var r = S.result, mine = r.knocker === 0 ? r.kMelds : r.dMelds, lay = r.knocker === 0 ? [] : r.laid, dw = r.knocker === 0 ? r.kDeadwood : r.dDeadwood;
      return mine.concat(lay.length ? [lay] : []).concat(dw.length ? [dw] : []);
    }
    var a = E.arrange(S.hands[0]);
    return a.groups.concat(a.dead.length ? [a.dead] : []);
  }
  function oppGroups(S) {
    var r = S.result, mine = r.knocker === 1 ? r.kMelds : r.dMelds, lay = r.knocker === 1 ? [] : r.laid, dw = r.knocker === 1 ? r.kDeadwood : r.dDeadwood;
    return mine.concat(lay.length ? [lay] : []).concat(dw.length ? [dw] : []);
  }
  function positions(S, L, U) {
    var P = {}, shown = !!(S.result && !S.result.draw), mineTurn = S.turn === 0 && !shown && S.phase !== 'handEnd' && S.phase !== 'over';
    var took = S.took && S.turn === 0 ? S.took.c : -1, kn = U && U.knock && S.phase === 'discard' ? E.knockable(S, 0).map(function (o) { return o.c; }) : null;
    var deadSet = {}, laySet = {};
    if (shown) { (S.result.kDeadwood || []).concat(S.result.dDeadwood || []).forEach(function (c) { deadSet[c] = 1; }); (S.result.laid || []).forEach(function (c) { laySet[c] = 1; }); }
    // your hand
    var g = yourGroups(S), xs = rowXs(g, L, L.step, L.gk, L.cw), z = 100;
    g.forEach(function (grp) { grp.forEach(function (c) {
      var cls = '';
      if (mineTurn && S.phase === 'discard') cls = kn ? (kn.indexOf(c) >= 0 ? 'ok knock' : 'dim') : (c === took && S.took.from === 'pile' ? 'dim' : 'ok');
      if (c === took && !kn) cls += ' got';
      if (deadSet[c]) cls += ' dead';
      if (laySet[c]) cls += ' lay';
      P[c] = { x: xs[c], y: L.handY, z: z++, up: true, cls: cls };
    }); });
    // Sam's hand: face down along the top - turned up and laid out at the end of a hand
    if (shown) {
      // turned up at the size they lay face down, so the name plate still fits under them
      var o = L.osc, og = oppGroups(S), ox = rowXs(og, L, Math.round(L.step * o * 1.15), Math.round(L.gk * o), L.cw * o), oz = 50, shift = L.cw * (1 - o) / 2;
      og.forEach(function (grp) { grp.forEach(function (c) { P[c] = { x: ox[c] - shift, y: L.oppY, z: oz++, up: true, sc: o, cls: (deadSet[c] ? 'dead' : '') + (laySet[c] ? ' lay' : '') }; }); });
    } else {
      var h = S.hands[1], n = h.length, os = Math.round(L.cw * L.osc * 0.42);
      h.forEach(function (c, i) { P[c] = { x: L.cx - L.cw / 2 + (i - (n - 1) / 2) * os, y: L.oppY, z: 50 + i, up: false, sc: L.osc, rot: 180 }; });
    }
    // the deck, and the pile (its top card face up)
    var drawNow = mineTurn && S.phase === 'draw';
    if (shown) return P;   // the deck and pile are put away while the hands are shown (the result panel sits there)
    S.stock.forEach(function (c, i) { var k = Math.min(6, Math.floor(i / 5)); P[c] = { x: L.stockX - k, y: L.rowY - k, z: 300 + i, up: false, cls: drawNow && i === S.stock.length - 1 && S.stock.length > 2 ? 'take' : '' }; });
    var pn = S.pile.length;
    S.pile.forEach(function (c, i) {
      var back = pn - 1 - i, show = back < 3;   // the top three show a little, the rest lie under them
      P[c] = { x: L.pileX + (show ? (2 - back) * 0 : 0), y: L.rowY, z: 400 + i, up: true, rot: show ? [0, -4, 5][back] : 0, cls: drawNow && back === 0 ? 'take ok' : '' };
    });
    return P;
  }
  function plates(S, L, U) {
    var shown = !!(S.result && !S.result.draw), playing = S.phase === 'draw' || S.phase === 'discard', mini = L.tall ? ' mini' : '';
    var you = shown ? (S.result.knocker === 0 ? S.result.kDead : S.result.dDead) : E.arrange(S.hands[0]).deadwood;
    var out = [
      { key: 'p0', x: L.gap, y: L.handY - (L.tall ? 38 : 44), html: '<span class="av">Y</span><span>You &middot; ' + S.scores[0] + (S.scores[0] === 1 ? ' point' : ' points') + '<small>Deadwood <b class="pts">' + you + '</b></small></span>', cls: 'you' + mini + (playing && S.turn === 0 ? ' turn' : '') },
      { key: 'p1', x: L.cx, y: Math.round(L.gap + L.ch * L.osc + 4), center: true, html: '<span class="av">S</span><span>' + OPP + ' &middot; ' + S.scores[1] + (S.scores[1] === 1 ? ' point' : ' points') + '<small>' + (shown ? 'Deadwood <b class="pts">' + (S.result.knocker === 1 ? S.result.kDead : S.result.dDead) + '</b>' : S.hands[1].length + ' cards') + '</small></span>', cls: mini + (playing && S.turn === 1 ? ' turn' : '') },
      { key: 'dk', x: L.stockX + L.cw / 2, y: L.rowY + L.ch + 4, center: true, html: 'Deck &middot; ' + S.stock.length, cls: 'tag' + mini },
      { key: 'pl', x: L.pileX + L.cw / 2, y: L.rowY + L.ch + 4, center: true, html: 'Discard pile', cls: 'tag' + mini }
    ];
    return playing ? out : out.slice(0, 2);
  }
  function panel(S, U) {
    if (S.phase === 'draw' && S.turn === 0) return '<h3>Your turn</h3><p>Take a card: tap the <b>deck</b>, or the face-up card on the <b>discard pile</b>.</p>';
    if (S.phase === 'discard' && S.turn === 0) {
      var kn = E.knockable(S, 0), gin = kn.some(function (o) { return o.dead === 0; });
      if (U.knock) return '<p>Tap the glowing card you want to throw away as you ' + (gin ? 'go gin' : 'knock') + '.</p><div class="acts"><button class="btn" type="button" data-act="cancel">Cancel</button></div>';
      var acts = '';
      if (gin) acts += '<button class="btn gold" type="button" data-act="gin">Gin!</button>';
      else if (kn.length) acts += '<button class="btn gold" type="button" data-act="knock">Knock</button>';
      return '<p>Now throw a card away &ndash; tap it.' + (kn.length ? (gin ? ' You can go <b>gin</b>: no deadwood at all!' : ' Or <b>knock</b>: your deadwood can be 10 or less.') : '') + '</p>' + (acts ? '<div class="acts">' + acts + '</div>' : '');
    }
    if (S.phase === 'handEnd' || S.phase === 'over') {
      var r = S.result, head;
      if (r.draw) head = '<h3>A draw</h3><p>The deck ran down to two cards, so nobody scores this hand.</p>';
      else {
        var who = r.knocker === 0 ? 'You' : OPP, to = r.to === 0 ? 'You score' : OPP + ' scores';
        head = '<h3>' + (r.gin ? who + ' went gin!' : who + ' knocked' + (r.undercut ? ' &ndash; and was undercut!' : '')) + '</h3>'
          + '<p><span class="dw">' + (r.knocker === 0 ? 'Your' : OPP + '&rsquo;s') + ' deadwood ' + r.kDead + '</span><span class="dw">' + (r.knocker === 0 ? OPP + '&rsquo;s' : 'Your') + ' deadwood ' + r.dDead + '</span></p>'
          + (r.laid.length ? '<p class="soft">' + r.laid.length + (r.laid.length === 1 ? ' card was' : ' cards were') + ' laid off (they glow).</p>' : '')
          + '<div class="big">' + to + ' ' + r.pts + '</div>'
          + (r.gin ? '<p class="soft">' + r.dDead + ' for the other hand, and 25 for gin.</p>' : r.undercut ? '<p class="soft">The difference, ' + (r.kDead - r.dDead) + ', and 25 for the undercut.</p>' : '<p class="soft">The difference in deadwood.</p>');
      }
      head += '<p>You <b>' + S.scores[0] + '</b> &middot; ' + OPP + ' <b>' + S.scores[1] + '</b> &middot; first to 100</p>';
      if (S.phase === 'over') return head + '<div class="acts"><button class="btn gold" type="button" data-act="new">New match</button></div>';
      return head + '<div class="acts"><button class="btn gold" type="button" data-act="next">Next hand</button></div>';
    }
    return '';
  }

  // ------------------------------------------------------------ tapping
  function tap(S, c, U) {
    if (S.phase !== 'draw' && S.phase !== 'discard') return null;
    var inHand = S.hands[0].indexOf(c) >= 0, inStock = S.stock.indexOf(c) >= 0, onPile = S.pile.length && S.pile[S.pile.length - 1] === c;
    if (S.turn !== 0) return inHand || inStock || onPile ? { say: 'Wait for ' + OPP + ' to finish' } : null;
    if (S.phase === 'draw') {
      if (inStock) return S.stock.length > 2 ? { m: { t: 'draw', from: 'stock' } } : { say: 'The deck is down to its last two cards' };
      if (onPile) return { m: { t: 'draw', from: 'pile' } };
      if (inHand) return { say: 'First take a card – from the deck or the discard pile' };
      return null;
    }
    if (!inHand) return inStock || onPile ? { say: 'You’ve taken a card – now throw one of yours away' } : null;
    if (S.took && S.took.from === 'pile' && c === S.took.c) return { say: 'You can’t throw back the card you just took from the pile' };
    if (U.knock) {
      var ok = E.knockable(S, 0).filter(function (o) { return o.c === c; })[0];
      if (!ok) return { say: 'Knocking with that card leaves more than 10 deadwood – tap a glowing one' };
      U.knock = false; return { m: { t: 'knock', c: c } };
    }
    return { m: { t: 'discard', c: c } };
  }
  function press(S, id, U) {
    if (id === 'knock') { U.knock = true; return { ui: true }; }
    if (id === 'cancel') { U.knock = false; return { ui: true, sfx: 'place' }; }
    if (id === 'gin') { var g = E.knockable(S, 0).filter(function (o) { return o.dead === 0; })[0]; return g ? { m: { t: 'knock', c: g.c } } : null; }
    if (id === 'next') return { m: { t: 'next' } };
    if (id === 'new') return { newGame: true };
    return null;
  }
  function wait(S, m) { return m.t === 'draw' ? 800 : 950; }
  function fx(f, K, S) {
    if (f.t === 'draw') { K.sfx(f.from === 'pile' ? 'slide' : 'flip'); if (f.p === 1 && f.from === 'pile') K.say(OPP + ' took the ' + cname(f.c) + ' from the pile'); return; }
    if (f.t === 'discard') { K.sfx('place'); if (f.draw) { K.sfx('lose'); K.say('The deck ran down – this hand is a draw'); } return; }
    if (f.t === 'knock') {
      K.sfx('place'); K.sfx('flip');
      // (the panel in the middle says what happened)
      if (f.gin) { K.sfx(f.p === 0 ? 'fanfare' : 'thud'); if (f.p === 0) S.hands[0].slice(0, 3).forEach(function (c) { K.burst(c, true); }); }
      else if (f.undercut) K.sfx(f.to === 0 ? 'fanfare' : 'thud');
      if (K.stamp) {   // the moment, stamped on the table (5 Oct 2026)
        var sc = (f.to === 0 ? 'You score ' : OPP + ' scores ') + f.pts;
        if (f.gin) K.stamp(f.p === 0 ? 'GIN!' : OPP + ' goes Gin', { tone: f.p === 0 ? 'gold' : 'dark', big: f.p === 0, sub: sc });
        else if (f.undercut) K.stamp('Undercut!', { tone: f.to === 0 ? 'gold' : 'dark', big: f.to === 0, sub: sc });
        else K.stamp(f.p === 0 ? 'You knock' : OPP + ' knocks', { tone: 'blue', small: true, sub: sc });
      }
      K.sfx('chime', f.to === 0 ? 3 : 0);
    }
  }
  function result(S) {
    var won = S.winner === 0, F = S.final || S.scores, badges = [];
    if (S.gins[0]) badges.push('You went gin ' + (S.gins[0] === 1 ? 'once' : S.gins[0] + ' times') + '!');
    return {
      won: won, score: F[0],
      title: won ? 'You won the match!' : OPP + ' won this one',
      sub: 'Gin Rummy · ' + E.LV[S.lv] + ' · first to 100 (with 100 for the match and 25 for each hand won)',
      tiles: [[F[0], 'Your total'], [F[1], OPP + '’s total'], [S.wins[0] + ' of ' + (S.wins[0] + S.wins[1]), 'Hands you won']],
      badges: badges,
      best: won ? [{ k: 'margin', v: F[0] - F[1], say: 'Your biggest winning margin yet!' }] : null,
      share: won ? 'I beat the computer at 365 Gin Rummy, ' + F[0] + ' to ' + F[1] : 'I just played 365 Gin Rummy'
    };
  }
  function chips(S) { return [['Hand', S.hand + 1], ['You', S.scores[0]], [OPP, S.scores[1]]]; }
  function dealOrder(S) {
    var o = [];
    for (var i = 0; i < 10; i++) { o.push(S.hands[1 - S.dealer][i]); o.push(S.hands[S.dealer][i]); }
    return o.filter(function (c) { return c != null; }).concat(S.pile);
  }
  function hintShow(S, m) {
    if (m.t === 'draw') return m.from === 'pile' ? { cards: [S.pile[S.pile.length - 1]], say: 'Take the ' + cname(S.pile[S.pile.length - 1]) + ' from the pile' } : { cards: [S.stock[S.stock.length - 1]], say: 'Take a card from the deck' };
    if (m.t === 'knock') return { cards: [m.c], say: 'Knock now, throwing away the ' + cname(m.c) };
    return { cards: [m.c], say: 'Throw away the ' + cname(m.c) };
  }

  // The Journey (5 Oct 2026): a level is ONE HAND on a set deal with three targets, one per star - the levels are in
  // journey.js (made, and every target proved reachable, by tools/journeys/make-rival-journeys.cjs). r = this hand's result.
  var JR = {
    result: function (S) { var r = S.result; return { v: r && !r.draw ? (r.to === 0 ? r.pts : -r.pts) : 0, flag: !!(r && r.gin && r.to === 0), draw: !!(r && r.draw) }; },
    got: function (l, r) { return l.t.map(function (t) { return t === 'gin' ? r.flag : r.v >= t; }); },
    goals: function (l) { return l.t.map(function (t) { return t === 'gin' ? 'Go Gin \u2013 all ten cards in melds' : t === 1 ? 'Win the hand' : 'Win the hand by ' + t + ' points or more'; }); },
    better: function (r, b) { return (r.flag && !b.flag) || (r.flag === b.flag && r.v > b.v); },
    bestText: function (b) { return (b.flag ? 'Gin, by ' : 'won by ') + b.v; },
    sayResult: function (r) { return r.draw ? 'The deck ran down \u2013 a draw, so nobody won the hand.' : r.v > 0 ? (r.flag ? 'Gin! ' : '') + 'You won the hand by ' + r.v + (r.v === 1 ? ' point.' : ' points.') : OPP + ' won the hand by ' + (-r.v) + (r.v === -1 ? ' point.' : ' points.'); },
    chips: function (S, l) { var t = l.t; return [['\u2605\u2605', 'by ' + t[1]], ['\u2605\u2605\u2605', t[2] === 'gin' ? 'Gin!' : 'by ' + t[2]]]; }
  };

  Rivals365.start({
    id: 'gin', store: 'gr365', title: 'Gin Rummy', cards: 52, E: E,
    journey: window.GR_JOURNEY || null, jr: JR,   // the Journey: 100 levels, one hand each (5 Oct 2026)
    hof: true, hofWhat: { today: 'Biggest winning margin first (with the match bonuses).', alltime: 'The biggest winning margins ever.', town: 'Biggest winning margin first (with the match bonuses).' },   // the Hall of Fame: Today's match (5 Oct 2026)
    face: function (c) { return { r: E.rank(c), s: E.suit(c) }; },
    levels: {
      options: [[1, 'Easy'], [3, 'Normal'], [5, 'Hard'], [7, 'Expert']], def: 3,
      info: function (lv) { return { 1: 'A relaxed player who misses things · Hint on', 3: 'A steady, sensible player · Hint on', 5: 'Thinks a card ahead · no Hint', 7: 'And watches what you pick up · no Hint' }[lv]; },
      hint: function (lv) { return lv <= 3; }
    },
    layout: layout, positions: positions, plates: plates, panel: panel, tap: tap, press: press, wait: wait, fx: fx,
    commits: function (S) { return S.phase === 'discard'; },   // a tap throws the card away (rivals.js lifts it first on a phone)
    panelAt: function (S, L) { return S.result && (S.phase === 'handEnd' || S.phase === 'over') ? L.panelEnd : L.panel; },
    over: function (S) { return S.phase === 'over'; }, result: result, chips: chips, dealOrder: dealOrder, hintShow: hintShow,
    newHand: function (S, U) { U.knock = false; },
    bestTiles: [{ k: 'margin', label: 'Biggest winning margin' }],
    help: [
      '<b>Make melds:</b> three or four of a kind (7 7 7), or three or more in a row in one suit (4 5 6 of hearts). Ace is low: A 2 3 is a run, Q K A isn&rsquo;t. Your hand is laid out for you &ndash; melds first, then the loose cards.',
      '<b>Your turn:</b> take a card &ndash; tap the <b>deck</b> or the face-up card on the <b>discard pile</b> &ndash; then tap one of yours to throw it away.',
      '<b>Deadwood</b> is the cards in no meld: Ace 1, 2 to 10 their number, picture cards 10. It&rsquo;s counted for you under your name.',
      '<b>Knock</b> when your deadwood is 10 or less (the button appears): both hands go down, the other player lays off what they can on your melds, and you score the difference. If their deadwood is as low as yours, that&rsquo;s an <b>undercut</b> &ndash; they score it, and 25 more.',
      '<b>Gin</b> is no deadwood at all: you score the other hand&rsquo;s deadwood and 25, and nothing can be laid off.',
      'First to <b>100</b> wins the match. If the deck runs down to two cards, the hand is a draw. Levels (New game) are how good ' + OPP + ' is; Easy and Normal have a Hint.'
    ]
  });
})();
