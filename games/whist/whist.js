/* 365 Whist on the shared table for games against the computer, games/common/rivals.js (5 Oct 2026; owner: "yes do
 * Cribbage and Whist next"). The rules and the three computer players are in engine.js (window.WhistEngine).
 * You sit at the bottom with your partner Jo across the table (North); Sam on your left and Alex on your right are
 * the other side. The dealer's last card stays face up beside them until the first trick is over, so everyone knows
 * trumps; a marker in the corner keeps saying what trumps are. The tricks each player wins pile up beside them. */
(function () {
  'use strict';
  var E = window.WhistEngine;
  var NAMES = E.NAMES, SUITCH = ['♠︎', '♥︎', '♦︎', '♣︎'];
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function nameOf(p) { return p === 0 ? 'You' : NAMES[p]; }
  function sideName(t, cap) { return t === 0 ? (cap ? 'You and Jo' : 'you and Jo') : 'Sam and Alex'; }

  // ------------------------------------------------------------ where everything sits (as Hearts)
  function layout(W, H) {
    var tall = H > W * 1.1, gap = clamp(Math.round(Math.min(W, H) * 0.016), 6, 16), stepK = tall ? 0.36 : 0.42, sc = tall ? 0.5 : 0.56;
    var byW = (W - gap * 2) / (1 + 12 * stepK), byH = (H - gap * 6 - 100) / 3.4 / 1.4;
    var cw = Math.floor(clamp(Math.min(byW, byH), 40, 122)), ch = Math.round(cw * 1.4);
    var L = { W: W, H: H, cw: cw, ch: ch, gap: gap, tall: tall, sc: sc, step: Math.round(cw * stepK) };
    L.handY = H - gap - ch;
    L.handX = Math.round((W - (cw + 12 * L.step)) / 2);
    var northBot = gap + ch * sc, youTop = L.handY - (tall ? 40 : 46);
    L.northY = Math.round(gap - ch * (1 - sc) / 2);
    L.cx = Math.round(W / 2); L.cy = Math.round((northBot + 36 + youTop) / 2);
    L.ostep = Math.round(cw * sc * 0.34);
    L.vstep = Math.round(Math.min(cw * sc * 0.34, (L.cy - northBot - 10) / 7));
    L.sideX = Math.round(gap + ch * sc / 2 - cw / 2);
    L.eastX = Math.round(W - gap - ch * sc / 2 - cw / 2);
    L.deck = { x: L.cx - cw / 2, y: L.cy - ch / 2 };
    var pw = Math.min(W - gap * 2, tall ? 360 : 440);
    L.panel = { x: Math.round((W - pw) / 2), y: Math.round(Math.max(northBot + 40, L.cy - ch * 0.95)), w: pw };
    return L;
  }
  var TRICK_AT = [[0, 0.53], [-1.08, 0], [0, -0.53], [1.08, 0]], TRICK_ROT = [2, -5, 3, 6];
  function pileAt(L, p) {
    if (p === 0) return { x: L.W - L.gap - L.cw * 0.7, y: L.handY - L.ch * 0.62 };
    if (p === 1) return { x: L.sideX + L.ch * L.sc * 0.15, y: L.cy + 7 * L.vstep + L.ch * 0.18 };
    if (p === 2) return { x: L.cx + 7 * L.ostep + L.cw * 0.35, y: L.northY };
    return { x: L.eastX - L.ch * L.sc * 0.15, y: L.cy + 7 * L.vstep + L.ch * 0.18 };
  }
  function turnUpShown(S) { return S.phase === 'play' && S.tricks === 0 && S.dealer !== 0 && S.hands[S.dealer].indexOf(S.turnUp) >= 0; }
  function positions(S, L) {
    var P = {}, mine = S.phase === 'play' && S.turn === 0 && S.trick.length < 4, ok = mine ? E.legal(S, 0) : [];
    S.hands[0].forEach(function (c, i) {
      var cls = mine ? (ok.indexOf(c) >= 0 ? 'ok' : 'dim') : '';
      if (c === S.turnUp && S.dealer === 0 && S.tricks === 0) cls += ' got';   // your own turned-up card
      P[c] = { x: L.handX + i * L.step, y: L.handY, z: 100 + i, up: true, cls: cls };
    });
    [1, 2, 3].forEach(function (p) {
      var h = S.hands[p].filter(function (c) { return !(turnUpShown(S) && c === S.turnUp); }), n = h.length;
      h.forEach(function (c, i) {
        var k = i - (n - 1) / 2;
        if (p === 2) P[c] = { x: L.cx - L.cw / 2 + k * L.ostep, y: L.northY, z: 50 + i, up: false, sc: L.sc, rot: 180 };
        else P[c] = { x: p === 1 ? L.sideX : L.eastX, y: L.cy - L.ch / 2 + k * L.vstep, z: 50 + i, up: false, sc: L.sc, rot: p === 1 ? 90 : -90 };
      });
    });
    // the dealer's last card, face up beside them: it shows trumps
    if (turnUpShown(S)) {
      var d = S.dealer, at = d === 2 ? { x: L.cx + 7 * L.ostep + L.cw * 0.2, y: L.northY } : { x: d === 1 ? L.sideX + L.ch * L.sc * 0.55 : L.eastX - L.ch * L.sc * 0.55, y: L.cy + 6 * L.vstep };
      P[S.turnUp] = { x: at.x, y: at.y, z: 80, up: true, sc: 0.62, rot: d === 1 ? 8 : d === 3 ? -8 : 4, cls: 'got' };
    }
    var full = S.trick.length === 4, w = full ? E.winnerOf(S.trick, S.trump) : null;
    S.trick.forEach(function (t, i) {
      var a = TRICK_AT[t.p];
      P[t.c] = { x: L.cx - L.cw / 2 + a[0] * L.cw, y: L.cy - L.ch / 2 + a[1] * L.ch, z: 900 + i, up: true, rot: TRICK_ROT[t.p], cls: w && w.c === t.c ? 'won' : '' };
    });
    for (var p = 0; p < 4; p++) {
      var pa = pileAt(L, p);
      S.piles[p].forEach(function (c, i) { var k = Math.floor(i / 4); P[c] = { x: pa.x + (p === 0 || p === 3 ? -k * 7 : k * 7), y: pa.y, z: 20 + i, up: false, sc: 0.42, rot: (k % 2 ? 4 : -4) + (i % 4) }; });
    }
    return P;
  }
  function plateYs(L) { return { side: Math.round(L.cy - L.ch / 2 - 6 * L.vstep - (L.tall ? 34 : 42)), north: Math.round(L.gap + L.ch * L.sc + 4) }; }
  function plate(p, S) {
    var role = p === 2 ? 'your partner' : p === 0 ? '' : 'other side', tr = S.won[p];
    return '<span class="av">' + nameOf(p).charAt(0) + '</span><span>' + nameOf(p) + (S.dealer === p ? ' &middot; deals' : '') + '<small><b class="pts">' + tr + '</b> trick' + (tr === 1 ? '' : 's') + (role ? ' &middot; ' + role : '') + '</small></span>';
  }
  function plates(S, L) {
    var turn = S.phase === 'play' && S.trick.length < 4 ? S.turn : -1, mini = L.tall ? ' mini' : '', out = [];
    var southY = L.handY - (L.tall ? 38 : 44), Y = plateYs(L);
    out.push({ key: 'p0', x: L.gap, y: southY, html: plate(0, S), cls: 'you' + mini + (turn === 0 ? ' turn' : '') });
    out.push({ key: 'p1', x: L.gap, y: Y.side, html: plate(1, S), cls: mini + (turn === 1 ? ' turn' : '') });
    out.push({ key: 'p2', x: L.cx, y: Y.north, center: true, html: plate(2, S), cls: 'you' + mini + (turn === 2 ? ' turn' : '') });
    out.push({ key: 'p3', x: L.W - L.gap, y: Y.side, right: true, html: plate(3, S), cls: mini + (turn === 3 ? ' turn' : '') });
    var red = S.trump === 1 || S.trump === 2;
    out.push({ key: 'tr', x: L.gap, y: L.gap, html: 'Trumps <b style="color:' + (red ? '#ff6a7a' : '#fff') + ';font-size:1.25em">' + SUITCH[S.trump] + '</b> ' + E.SUIT_NAME[S.trump], cls: 'tag' + mini });
    if (turn === 0) out.push({ key: 'yt', x: L.cx, y: southY, center: true, html: 'Your turn – tap a card', cls: 'tag gold' });
    return out;
  }
  function panel(S) {
    if (S.phase !== 'handEnd' && S.phase !== 'over') return '';
    var lh = S.lastHand, t = lh.tricks;
    var html = '<h3>' + sideName(lh.side, true) + ' took ' + t[lh.side] + ' tricks</h3>'
      + '<p>' + (lh.pts ? 'That&rsquo;s ' + lh.pts + ' over the book of six: <b>' + lh.pts + (lh.pts === 1 ? ' point' : ' points') + '</b>' : 'No points this hand') + ' to ' + sideName(lh.side) + '.</p>';
    var gp = lh.gameWon >= 0 ? lh.gamePoints : S.points;
    html += '<table><thead><tr><th></th><th>This game</th><th>Games</th></tr></thead><tbody>'
      + '<tr class="me"><td>You and Jo</td><td>' + gp[0] + ' / ' + E.GAME + '</td><td>' + S.games[0] + '</td></tr>'
      + '<tr><td>Sam and Alex</td><td>' + gp[1] + ' / ' + E.GAME + '</td><td>' + S.games[1] + '</td></tr></tbody></table>';
    if (lh.gameWon >= 0) html += '<div class="big">' + (lh.gameWon === 0 ? 'You and Jo win the game!' : 'Sam and Alex win the game') + '</div>';
    if (S.phase === 'over') return html + '<p class="soft">' + (S.winner === 0 ? 'Two games &ndash; the rubber is yours!' : 'Sam and Alex take the rubber.') + '</p><div class="acts"><button class="btn gold" type="button" data-act="new">New rubber</button></div>';
    return html + '<p class="soft">First to ' + E.GAME + ' points wins a game; two games win the rubber.</p><div class="acts"><button class="btn gold" type="button" data-act="next">Next hand</button></div>';
  }

  // ------------------------------------------------------------ tapping
  function tap(S, c) {
    if (S.hands[0].indexOf(c) < 0 || S.phase !== 'play') return null;
    if (S.turn !== 0 || S.trick.length === 4) return { say: 'Wait for your turn' };
    if (E.legal(S, 0).indexOf(c) >= 0) return { m: { t: 'play', c: c } };
    return { say: E.whyNot(S, c) };
  }
  function press(S, id) {
    if (id === 'next') return { m: { t: 'next' } };
    if (id === 'new') return { newGame: true };
    return null;
  }
  function wait(S, m) { return m.t === 'collect' ? 1150 : S.trick.length === 0 ? 620 : 700; }
  var RW = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  function fx(f, K, S) {
    if (f.t === 'play') { K.sfx('place'); if (f.trumped) { K.sfx('thud'); K.say(nameOf(f.p) + (f.p === 0 ? ' trump it' : ' trumps it') + (E.team(f.p) === 0 && f.p !== 0 ? ' – your partner' : '')); } return; }
    if (f.t === 'collect') {
      K.sfx('gather');
      if (f.handOver) {
        if (f.over) return;
        if (f.gameWon === 0) { K.sfx('fanfare'); K.say('You and Jo win the game!'); }
        else if (f.gameWon === 1) { K.sfx('thud'); K.say('Sam and Alex win the game'); }
        else K.sfx('chime', f.side === 0 ? 2 : 0);
        return;
      }
      if (f.team === 0) K.sfx('chime', 0);
    }
    if (f.t === 'next' || f.t === 'deal') { var up = S.turnUp; K.say((S.dealer === 0 ? 'You deal' : NAMES[S.dealer] + ' deals') + ' – the ' + RW[E.rank(up)] + ' of ' + E.SUIT_NAME[E.suit(up)] + ' is turned up: ' + E.SUIT_NAME[S.trump] + ' are trumps'); }
  }
  function result(S) {
    var won = S.winner === 0, hands = S.hand + 1;
    return {
      won: won, score: S.games[0],
      title: won ? 'You won the rubber!' : 'Sam and Alex won the rubber',
      sub: 'Whist · ' + E.LV[S.lv] + ' · two games of ' + E.GAME + ' points',
      tiles: [[S.games[0] + '–' + S.games[1], 'Games'], [hands, 'Hands played'], [won ? 'You + Jo' : 'Sam + Alex', 'Rubber']],
      badges: won && S.games[1] === 0 ? ['Two games to nil!'] : [],
      best: won ? [{ k: 'hands', v: hands, low: true, say: 'Your quickest rubber yet: ' + hands + ' hands' }] : null,
      share: won ? 'My partner and I won a rubber of 365 Whist ' + S.games[0] + '–' + S.games[1] : 'I just played 365 Whist'
    };
  }
  function chips(S) { return [['Game', Math.min(3, S.gameNo)], ['Us', S.points[0] + (S.games[0] ? ' · ' + '★'.repeat(S.games[0]) : '')], ['Them', S.points[1] + (S.games[1] ? ' · ' + '★'.repeat(S.games[1]) : '')]]; }
  function dealOrder(S) {
    var o = [];
    for (var i = 0; i < 13; i++) for (var k = 1; k <= 4; k++) { var h = S.hands[(S.dealer + k) % 4]; if (h[i] != null) o.push(h[i]); }
    return o;
  }
  function hintShow(S, m) { return { cards: [m.c], say: 'This one looks like a good card to play' }; }

  Rivals365.start({
    id: 'whist', store: 'wh365', title: 'Whist', cards: 52, E: E,
    face: function (c) { return { r: E.rank(c), s: E.suit(c) }; },
    levels: {
      options: [[1, 'Easy'], [3, 'Normal'], [5, 'Hard'], [7, 'Expert']], def: 3,
      info: function (lv) { return { 1: 'Relaxed players (your partner too) · Hint on', 3: 'Steady players who know the old rules · Hint on', 5: 'They remember every card and draw trumps · no Hint', 7: 'And count the trumps out · no Hint' }[lv]; },
      hint: function (lv) { return lv <= 3; }
    },
    layout: layout, positions: positions, plates: plates, panel: panel, tap: tap, press: press, wait: wait, fx: fx,
    over: function (S) { return S.phase === 'over'; }, result: result, chips: chips, dealOrder: dealOrder, hintShow: hintShow,
    bestTiles: [{ k: 'hands', label: 'Quickest rubber (hands)' }],
    help: [
      '<b>You and your partner Jo</b> (across the table) play against <b>Sam and Alex</b>. Win tricks together.',
      '<b>Trumps:</b> the dealer&rsquo;s last card is shown to everyone, and its suit is trumps for the hand. The marker at the top left always says what trumps are.',
      '<b>Tricks:</b> everyone plays one card. You must <b>follow suit</b> if you can; if you can&rsquo;t, play any card &ndash; a trump wins the trick unless a higher trump beats it. Otherwise the highest card of the suit led wins (Ace is high).',
      '<b>Scoring:</b> after 13 tricks, the side with more than six scores a point for each trick over six. First to <b>5 points</b> wins a game; <b>two games</b> win the rubber.',
      '<b>Old tips:</b> second hand plays low, third hand plays high; don&rsquo;t trump your partner&rsquo;s winning card; lead back the suit your partner led.',
      '<b>Levels</b> (New game) are how good the other three players are &ndash; your partner too. Easy and Normal have a Hint.'
    ]
  });
})();
