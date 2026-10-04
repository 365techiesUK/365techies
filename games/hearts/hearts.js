/* 365 Hearts on the shared table for games against the computer, games/common/rivals.js (5 Oct 2026; owner: "more
 * ultra popular card games"). The rules and the three computer players are in engine.js (window.HeartsEngine).
 * You sit at the bottom; Sam on your left (West), Jo across (North), Alex on your right (East). Their cards lie face down
 * along their side of the table; each trick is played into the middle, then flies to whoever took it. */
(function () {
  'use strict';
  var E = window.HeartsEngine;
  var NAMES = E.NAMES, SEAT = ['', 'on your left', 'across', 'on your right'];
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pl(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  // ------------------------------------------------------------ where everything sits
  function layout(W, H) {
    var tall = H > W * 1.1, gap = clamp(Math.round(Math.min(W, H) * 0.016), 6, 16), stepK = tall ? 0.36 : 0.42, sc = tall ? 0.5 : 0.56;
    var byW = (W - gap * 2) / (1 + 12 * stepK), byH = (H - gap * 6 - 100) / 3.4 / 1.4;
    var cw = Math.floor(clamp(Math.min(byW, byH), 40, 122)), ch = Math.round(cw * 1.4);
    var L = { W: W, H: H, cw: cw, ch: ch, gap: gap, tall: tall, sc: sc, step: Math.round(cw * stepK) };
    L.handY = H - gap - ch;
    L.handX = Math.round((W - (cw + 12 * L.step)) / 2);
    var northTop = gap, northBot = gap + ch * sc, youTop = L.handY - (tall ? 40 : 46);
    L.northY = Math.round(northTop - ch * (1 - sc) / 2);
    L.cx = Math.round(W / 2); L.cy = Math.round((northBot + 36 + youTop) / 2);
    L.ostep = Math.round(cw * sc * 0.34);                       // the north fan, sideways
    L.vstep = Math.round(Math.min(cw * sc * 0.34, (L.cy - northBot - 10) / 7));   // the side fans, up and down
    L.sideX = Math.round(gap + ch * sc / 2 - cw / 2);           // West's cards, turned on their side (centre at gap + half their width)
    L.eastX = Math.round(W - gap - ch * sc / 2 - cw / 2);
    L.deck = { x: L.cx - cw / 2, y: L.cy - ch / 2 };
    var pw = Math.min(W - gap * 2, tall ? 360 : 440);
    L.panel = { x: Math.round((W - pw) / 2), y: Math.round(Math.max(northBot + 40, L.cy - ch * 0.95)), w: pw };
    return L;
  }
  var TRICK_AT = [[0, 0.53], [-1.08, 0], [0, -0.53], [1.08, 0]];   // each seat's card in the middle, in card widths / heights
  var TRICK_ROT = [2, -5, 3, 6];
  function pileAt(L, p) {   // where the tricks someone has taken are kept
    if (p === 0) return { x: L.W - L.gap - L.cw * 0.7, y: L.handY - L.ch * 0.62 };
    if (p === 1) return { x: L.sideX + L.ch * L.sc * 0.15, y: L.cy + 7 * L.vstep + L.ch * 0.18 };
    if (p === 2) return { x: L.cx + 7 * L.ostep + L.cw * 0.35, y: L.northY };
    return { x: L.eastX - L.ch * L.sc * 0.15, y: L.cy + 7 * L.vstep + L.ch * 0.18 };
  }
  function positions(S, L, U) {
    var P = {}, mine = S.phase === 'play' && S.turn === 0 && S.trick.length < 4, ok = mine ? E.legal(S, 0) : [];
    var sel = (U && U.pass) || [], fresh = S.phase === 'play' && S.hands[0].length === 13 && S.got.length;
    S.hands[0].forEach(function (c, i) {
      var cls = S.phase === 'pass' ? (sel.indexOf(c) >= 0 ? 'sel ok' : 'ok') : mine ? (ok.indexOf(c) >= 0 ? 'ok' : 'dim') : '';
      if (fresh && S.got.indexOf(c) >= 0) cls += ' got';
      P[c] = { x: L.handX + i * L.step, y: L.handY, z: 100 + i, up: true, cls: cls };
    });
    // the others' cards, face down along their side of the table
    [1, 2, 3].forEach(function (p) {
      var h = S.hands[p], n = h.length;
      h.forEach(function (c, i) {
        var k = i - (n - 1) / 2;
        if (p === 2) P[c] = { x: L.cx - L.cw / 2 + k * L.ostep, y: L.northY, z: 50 + i, up: false, sc: L.sc, rot: 180 };
        else P[c] = { x: p === 1 ? L.sideX : L.eastX, y: L.cy - L.ch / 2 + k * L.vstep, z: 50 + i, up: false, sc: L.sc, rot: p === 1 ? 90 : -90 };
      });
    });
    // the trick in the middle
    var full = S.trick.length === 4, w = full ? E.winnerOf(S.trick) : null;
    S.trick.forEach(function (t, i) {
      var a = TRICK_AT[t.p];
      P[t.c] = { x: L.cx - L.cw / 2 + a[0] * L.cw, y: L.cy - L.ch / 2 + a[1] * L.ch, z: 900 + i, up: true, rot: TRICK_ROT[t.p], cls: w && w.c === t.c ? 'won' : '' };
    });
    // the tricks taken: a little pile by each player
    if (S.phase !== 'handEnd' && S.phase !== 'over') {
      for (var p = 0; p < 4; p++) {
        var at = pileAt(L, p);
        S.won[p].forEach(function (c, i) { P[c] = { x: at.x + Math.floor(i / 4) * 1.2, y: at.y - Math.floor(i / 4) * 1.2, z: 20 + i, up: false, sc: 0.42, rot: (i % 4) * 3 - 4 }; });
      }
      return P;
    }
    // the end of a hand: each player's point cards turned up in a row under their name (yours where your hand was)
    var Y = plateYs(L, S), you = L.tall ? [0, L.gap + 132, L.handY - 34, 'l', 0.46] : [0, L.cx, L.handY + L.ch * 0.08, 'c', 0.62];
    [you, [1, L.gap, Y.side + 40, 'l', 0.5], [2, L.cx, L.gap, 'c', L.sc], [3, L.W - L.gap, Y.side + 40, 'r', 0.5]].forEach(function (a) {
      var pc = S.won[a[0]].filter(function (c) { return E.pts(c) > 0; }).sort(function (x, y) { return x === E.QS ? -1 : y === E.QS ? 1 : E.hi(y) - E.hi(x); });
      var sc = a[4], st = L.cw * sc * 0.36, w = L.cw * sc + Math.max(0, pc.length - 1) * st, left = a[3] === 'c' ? a[1] - w / 2 : a[3] === 'r' ? a[1] - w : a[1];
      pc.forEach(function (c, i) { P[c] = { x: left + i * st - L.cw * (1 - sc) / 2, y: a[2] - L.ch * (1 - sc) / 2, z: 700 + i, up: true, sc: sc }; });
    });
    return P;
  }
  // the name plates' heights; on a phone, at the end of a hand, Sam and Alex move up level with Jo so the scores fit below
  function plateYs(L, S) {
    var north = Math.round(L.gap + L.ch * L.sc + 4), ended = S && (S.phase === 'handEnd' || S.phase === 'over');
    return { side: L.tall && ended ? north : Math.round(L.cy - L.ch / 2 - 6 * L.vstep - (L.tall ? 34 : 42)), north: north };
  }
  function plate(p, S, L) {
    var hand = S.taken[p], tot = S.scores[p];
    var txt = p === 0 ? 'You' : NAMES[p];
    return '<span class="av">' + txt.charAt(0) + '</span><span>' + txt + '<small><b class="pts">' + hand + '</b> this hand &middot; ' + tot + '</small></span>';
  }
  function plates(S, L) {
    var turn = S.phase === 'play' && S.trick.length < 4 ? S.turn : -1, mini = L.tall ? ' mini' : '', out = [];
    var southY = L.handY - (L.tall ? 38 : 44), Y = plateYs(L, S);
    out.push({ key: 'p0', x: L.gap, y: southY, html: plate(0, S, L), cls: 'you' + mini + (turn === 0 ? ' turn' : '') });
    out.push({ key: 'p1', x: L.gap, y: Y.side, html: plate(1, S, L), cls: mini + (turn === 1 ? ' turn' : '') });
    out.push({ key: 'p2', x: L.cx, y: Y.north, center: true, html: plate(2, S, L), cls: mini + (turn === 2 ? ' turn' : '') });
    out.push({ key: 'p3', x: L.W - L.gap, y: Y.side, right: true, html: plate(3, S, L), cls: mini + (turn === 3 ? ' turn' : '') });
    if (turn === 0 && S.trick.length < 4) out.push({ key: 'yt', x: L.cx, y: southY, center: true, html: 'Your turn – tap a card', cls: 'tag gold' });
    return out;
  }
  function panel(S, U) {
    if (S.phase === 'pass') {
      var n = (U.pass || []).length, to = E.passTo(S, 0);
      return '<h3>Pass three cards to ' + NAMES[to] + ' (' + SEAT[to] + ')</h3><p>Tap the three cards you&rsquo;d most like rid of &ndash; high hearts and high spades are good ones to pass.</p>'
        + '<div class="acts"><button class="btn gold" type="button" data-act="pass"' + (n === 3 ? '' : ' disabled') + '>' + (n === 3 ? 'Pass these 3 cards' : 'Choose ' + (3 - n) + ' more') + '</button></div>';
    }
    if (S.phase === 'handEnd' || S.phase === 'over') {
      var lh = S.lastHand, low = Math.min.apply(null, S.scores), rows = '';
      for (var p = 0; p < 4; p++) rows += '<tr class="' + (p === 0 ? 'me' : '') + (S.scores[p] === low ? ' lead' : '') + '"><td>' + (p === 0 ? 'You' : NAMES[p]) + '</td><td>' + (lh.add[p] ? '+' + lh.add[p] : '0') + '</td><td>' + S.scores[p] + '</td></tr>';
      var head = lh.moon === 0 ? '<div class="big">You shot the moon!</div><p>All 26 points &ndash; so everyone else gets 26 instead.</p>'
        : lh.moon > 0 ? '<div class="big">' + NAMES[lh.moon] + ' shot the moon</div><p>They took every point, so everyone else gets 26.</p>'
        : '<h3>Hand ' + (S.hand + 1) + ' done</h3>';
      if (S.phase === 'over') {
        var won = S.winner === 0;
        return head + '<table><thead><tr><th></th><th>Hand</th><th>Total</th></tr></thead><tbody>' + rows + '</tbody></table>'
          + '<p class="soft">' + (won ? 'You have the lowest score &ndash; you win!' : (S.winner ? NAMES[S.winner] : 'You') + ' wins with the lowest score.') + '</p><div class="acts"><button class="btn gold" type="button" data-act="new">New match</button></div>';
      }
      var nd = (S.hand + 1) % 4, next = nd === 3 ? 'no passing' : 'pass ' + E.DIR[nd];
      return head + '<table><thead><tr><th></th><th>Hand</th><th>Total</th></tr></thead><tbody>' + rows + '</tbody></table>'
        + '<p class="soft">First to 100 ends the match &ndash; lowest score wins. Next hand: ' + next + '.</p><div class="acts"><button class="btn gold" type="button" data-act="next">Next hand</button></div>';
    }
    return '';
  }

  // ------------------------------------------------------------ tapping
  function tap(S, c, U) {
    if (S.hands[0].indexOf(c) < 0) return null;
    if (S.phase === 'pass') {
      U.pass = U.pass || [];
      var i = U.pass.indexOf(c);
      if (i >= 0) { U.pass.splice(i, 1); return { ui: true, sfx: 'place' }; }
      if (U.pass.length >= 3) return { say: 'You’ve chosen three – tap one of them again to put it back' };
      U.pass.push(c); return { ui: true };
    }
    if (S.phase !== 'play') return null;
    if (S.turn !== 0 || S.trick.length === 4) return { say: 'Wait for your turn' };
    if (E.legal(S, 0).indexOf(c) >= 0) return { m: { t: 'play', c: c } };
    return { say: E.whyNot(S, c) };
  }
  function press(S, id, U) {
    if (id === 'pass') return (U.pass || []).length === 3 ? { m: { t: 'pass', cards: U.pass.slice() } } : { say: 'Choose three cards to pass' };
    if (id === 'next') return { m: { t: 'next' } };
    if (id === 'new') return { newGame: true };
    return null;
  }
  function wait(S, m) { return m.t === 'collect' ? 1150 : S.trick.length === 0 ? 620 : 700; }
  var SUITW = ['spades', 'hearts', 'diamonds', 'clubs'];
  function fx(f, K, S) {
    if (f.t === 'pass') { K.sfx('slide'); setTimeout(function () { K.sfx('place'); }, 260); K.say(NAMES[f.from] + ' passed you three cards (they glow). The 2 of clubs starts.'); return; }
    if (f.t === 'play') {
      K.sfx('place');
      if (f.queen) { K.sfx('thud'); K.say((f.p ? NAMES[f.p] : 'You') + ' played the Queen of spades!'); }
      else if (f.broke) { K.sfx('chime', 1); K.say('Hearts are broken – they can be led now'); }
      return;
    }
    if (f.t === 'collect') {
      K.sfx('gather');
      if (f.handOver) {
        if (f.moon === 0) { K.sfx('fanfare'); K.say('You shot the moon! Everyone else gets 26.'); S.won[0].slice(-1).forEach(function (c) { K.burst(c, true); }); }
        else if (f.moon > 0) { K.sfx('thud'); K.say(NAMES[f.moon] + ' shot the moon – 26 points each to everyone else'); }
        else K.sfx('chime', 2);
        return;
      }
      if (f.w === 0 && f.pts) { K.say('You took ' + f.pts + (f.pts === 1 ? ' point' : ' points') + (f.queen ? ' – including the Queen!' : '')); if (f.queen) K.sfx('thud'); }
      else if (f.w === 0) K.sfx('chime', 0);
      else if (f.queen) K.say(NAMES[f.w] + ' took the Queen of spades – 13 points!');
    }
  }
  function result(S) {
    var won = S.winner === 0, sorted = S.scores.slice().sort(function (a, b) { return a - b; }), place = sorted.indexOf(S.scores[0]) + 1;
    var badges = [];
    if (S.moons[0]) badges.push('You shot the moon ' + (S.moons[0] === 1 ? 'once' : S.moons[0] + ' times') + '!');
    return {
      won: won, score: S.scores[0],
      title: won ? 'You won!' : (place === 2 ? 'So close – second place' : 'Better luck next time'),
      sub: 'Hearts · ' + E.LV[S.lv] + ' players · lowest score wins',
      tiles: [[S.scores[0], 'Your score'], [['1st', '2nd', '3rd', '4th'][place - 1], 'Place'], [S.hand + 1, 'Hands']],
      badges: badges,
      best: won ? [{ k: 'low', v: S.scores[0], low: true, say: 'Your lowest winning score yet!' }] : null,
      share: won ? 'I won a game of 365 Hearts with just ' + S.scores[0] + ' points' : 'I just played 365 Hearts'
    };
  }
  function chips(S) {
    var d = S.phase === 'pass' || S.tricks === 0 ? (S.dir === 3 ? 'none' : E.DIR[S.dir]) : null;
    return [['Hand', S.hand + 1], ['Your score', S.scores[0]], d ? ['Pass', d] : ['Tricks', S.tricks + '/13']];
  }
  function dealOrder(S) {
    var o = [];
    for (var i = 0; i < 13; i++) for (var p = 1; p <= 4; p++) { var h = S.hands[p % 4]; if (h[i] != null) o.push(h[i]); }
    return o;
  }
  function hintShow(S, m, U) {
    if (m.t === 'pass') return { cards: m.cards, say: 'These three would be good ones to pass' };
    return { cards: [m.c], say: 'This one looks like a good card to play' };
  }

  Rivals365.start({
    id: 'hearts', store: 'he365', title: 'Hearts', cards: 52, E: E,
    face: function (c) { return { r: E.rank(c), s: E.suit(c) }; },
    levels: {
      options: [[1, 'Easy'], [3, 'Normal'], [5, 'Hard'], [7, 'Expert']], def: 3,
      info: function (lv) { return { 1: 'Relaxed players who make mistakes · Hint on', 3: 'Steady, sensible players · Hint on', 5: 'They remember every card and stop a moon · no Hint', 7: 'And they’ll try to shoot the moon themselves · no Hint' }[lv]; },
      hint: function (lv) { return lv <= 3; }
    },
    layout: layout, positions: positions, plates: plates, panel: panel, tap: tap, press: press, wait: wait, fx: fx,
    panelAt: function (S, L) {
      if (!L.tall || (S.phase !== 'handEnd' && S.phase !== 'over')) return L.panel;
      return { x: L.panel.x, y: Math.round(plateYs(L, S).north + 40 + L.ch * 0.5 + 10), w: L.panel.w };
    },
    over: function (S) { return S.phase === 'over'; }, result: result, chips: chips, dealOrder: dealOrder, hintShow: hintShow,
    newHand: function (S, U) { U.pass = []; },
    bestTiles: [{ k: 'low', label: 'Lowest winning score' }],
    help: [
      '<b>Score as few points as you can.</b> Every heart you take is 1 point and the <b>Queen of spades is 13</b>. The match ends when someone reaches 100 &ndash; the <b>lowest</b> score wins.',
      '<b>Pass three cards</b> before each hand: tap three, then <b>Pass</b>. The passing goes left, then right, then across, then a hand with no passing. Cards passed to you glow.',
      '<b>Tricks:</b> the 2 of clubs starts. Everyone plays one card; you must <b>follow suit</b> if you can. The highest card of the suit led takes the trick (Ace is high) and leads the next one.',
      '<b>Hearts</b> can&rsquo;t be led until one has been played on a trick, and no points go on the very first trick. Cards you can&rsquo;t play are dimmed &ndash; tap one and you&rsquo;ll be told why.',
      '<b>Shooting the moon:</b> take ALL the hearts and the Queen and you score nothing &ndash; everyone else gets 26!',
      '<b>Levels</b> (New game): how good the other three players are. Easy and Normal have a Hint. Settings &gt; How fast the others play slows them down if you like to watch.'
    ]
  });
})();
