/* 365 TriPeaks on the shared card table, games/common/table.js (4 Oct 2026; owner: "yes build TriPeaks and Pyramid").
 * The rules are in engine.js (window.TpEngine), the proven-winnable deal numbers in deals.js (window.TP_DEALS), the
 * Journey in journey.js (window.TP_JOURNEY). This file only says where the cards sit and how a card is picked up. */
(function () {
  'use strict';
  var E = window.TpEngine, TD = window.TP_DEALS || { k1: [], k5: [] };
  // each row of the peaks sits half a card below the one above; on a phone held upright (tall) the cards overlap
  // sideways a little - the corner still shows - so they come out bigger, and the rows open up

  // place i's column, in card widths: the bottom row 0-9, the rows above in the gaps between
  var COL = [];
  (function () {
    var p, j, k;
    for (p = 0; p < 3; p++) COL.push(3 * p + 1.5);
    for (j = 0; j < 6; j++) COL.push(3 * (j >> 1) + 1 + (j & 1));
    for (k = 0; k < 9; k++) COL.push(k + 0.5);
    for (k = 0; k < 10; k++) COL.push(k);
  })();
  function colX(L, c) { return Math.round(L.left + c * L.unit); }
  function layout(W, H) {
    var tall = H > W * 1.25, gap = Math.max(4, Math.min(14, Math.round(W * 0.009))), rs = tall ? 0.6 : 0.5, step = tall ? 0.8 : 1;
    var byW = tall ? (W - gap * 2) / (1 + 9 * step) : (W - gap * 11) / 10, byH = (H - gap * 4) / (2 + 3 * rs) / 1.4;
    var cw = Math.max(26, Math.floor(Math.min(byW, byH, 150))), ch = Math.round(cw * 1.4), unit = tall ? Math.round(cw * step) : cw + gap;
    var need = ch * (2 + 3 * rs) + gap * 3;
    var L = { cw: cw, ch: ch, gap: gap, W: W, H: H, rs: rs, unit: unit, left: Math.round((W - (cw + 9 * unit)) / 2), top: gap + Math.round(Math.max(0, H - need - gap) * (tall ? 0.45 : 0.3)) };
    L.baseY = L.top + Math.round(ch * (1 + 3 * rs)) + gap * 2;
    L.stockX = colX(L, 3.4); L.wasteX = colX(L, 5.6);
    L.slots = [{ key: 'stock', x: L.stockX, y: L.baseY, cls: 'stock', text: '' }, { key: 'w', x: L.wasteX, y: L.baseY, cls: 'found', text: '' }];
    return L;
  }
  function placeY(L, i) { return Math.round(L.top + E.ROW[i] * L.rs * L.ch); }
  function positions(S, L) {
    var P = {};
    S.stock.forEach(function (c, i) { var k = Math.min(3, Math.floor(i / 6)); P[c] = { x: L.stockX + k, y: L.baseY - k, z: 10 + i, up: false, pile: 's' }; });
    S.waste.forEach(function (c, i) { P[c] = { x: L.wasteX, y: L.baseY, z: 200 + i, up: true, pile: 'w' }; });
    S.tab.forEach(function (x, i) { if (x) P[x.c] = { x: colX(L, COL[i]), y: placeY(L, i), z: 500 + E.ROW[i] * 30 + i, up: x.up, pile: 't' + i }; });
    return P;
  }
  function where(S, c) {
    if (S.stock.indexOf(c) >= 0) return { p: 'stock' };
    for (var i = 0; i < 28; i++) if (S.tab[i] && S.tab[i].c === c) return E.free(S, i) && S.tab[i].up ? { p: 't', i: i } : null;
    return null;
  }
  function picked(S, from) { return from.p === 't' && S.tab[from.i] ? [S.tab[from.i].c] : []; }
  function targets(S, from, L) { return [{ to: { p: 'w' }, x: L.wasteX, y: L.baseY }]; }
  function hintLights(S, m) {
    if (m.t === 'draw') return { cards: [S.stock[S.stock.length - 1]], say: 'Turn a card over from the deck' };
    return { cards: [S.tab[m.from.i].c, S.waste[S.waste.length - 1]] };
  }
  // when a card won't go, say why in plain words
  var WORD = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  function a(r) { return (r === 1 || r === 8 ? 'an ' : 'a ') + WORD[r]; }
  function needs(S) {
    var t = E.rank(S.waste[S.waste.length - 1]), lo = t === 1 ? (S.wrap ? 13 : 0) : t - 1, hi = t === 13 ? (S.wrap ? 1 : 0) : t + 1;
    var opts = [lo, hi].filter(function (r) { return r; }).map(a);
    return 'Only a card one higher or one lower than the ' + WORD[t] + ' on the pile can go' + (opts.length ? ' - ' + opts.join(' or ') : '');
  }
  function whyNot(S, from) { return picked(S, from).length ? needs(S) : 'No move for that card yet'; }
  function cantPick(S, c) {
    if (S.waste.indexOf(c) >= 0) return 'That’s the pile - play a card from the peaks onto it';
    for (var i = 0; i < 28; i++) if (S.tab[i] && S.tab[i].c === c) return S.tab[i].up ? 'This card is still covered - play the two cards on top of it first' : 'This card turns over once both cards on top of it have gone';
    return '';
  }
  function valid(s) {
    var seen = {}, n = 0;
    try {
      s.tab.forEach(function (x) { if (x) { seen[x.c] = 1; n++; } });
      s.stock.concat(s.waste).forEach(function (c) { seen[c] = 1; n++; });
    } catch (e) { return false; }
    return n === 52 && Object.keys(seen).length === 52 && s.tab.length === 28 && !!E.LV[s.lv];
  }

  var LV = {
    1: { name: 'Easy', stars: 1, stat: 'e', line: 'Every card face up · King and Ace join · Undo and Hint' },
    3: { name: 'Normal', stars: 2, stat: 'n', line: 'Face down until uncovered · King and Ace join · Undo and Hint' },
    5: { name: 'Hard', stars: 3, stat: 'h', line: 'King and Ace don’t join · no Hint' },
    7: { name: 'Expert', stars: 4, stat: 'x', line: 'King and Ace don’t join · no Undo, no Hint' }
  };
  function lvOf(S) { return LV[S.lv] ? S.lv : 1; }
  function list(v) { var l = v <= 3 ? TD.k1 : TD.k5; return l && l.length ? l : null; }

  Table365.start({
    id: 'tripeaks', store: 'tp365', title: 'TriPeaks', cards: 52, hasStock: true,
    face: function (c) { return { r: E.rank(c), s: E.suit(c) }; },
    E: E, layout: layout, positions: positions, where: where, picked: picked, targets: targets, hintLights: hintLights, valid: valid,
    whyNot: whyNot, cantPick: cantPick,
    variant: { key: 'lv', stateKey: 'lv', label: 'Difficulty', small: 'Changes from your next game.', options: [[1, 'Easy'], [3, 'Normal'], [5, 'Hard'], [7, 'Expert']], def: 1,
               newLabel: function (v) { return LV[v] ? LV[v].name : 'Easy'; }, info: function (v) { return LV[v] ? LV[v].line : ''; },
               stars: function (v) { return LV[v] ? LV[v].stars : 1; },
               statKey: function (v) { return LV[v] ? LV[v].stat : 'e'; }, bestLabel: function (v) { return LV[v] ? LV[v].name.toLowerCase() : 'easy'; } },
    deals: list,
    rules: function (S) { var v = lvOf(S); return { undo: v !== 7, hint: v <= 3 }; },
    winBonus: function (S, secs) { return Math.round((S.stock.length * 50 + Math.max(0, 600 - secs) / 2) * ({ 1: 1, 3: 1.25, 5: 1.6, 7: 2 }[lvOf(S)] || 1)); },
    describe: function (S) { return LV[lvOf(S)].name + ' level' + (S.bestRun > 4 ? ' · best run ' + S.bestRun : ''); },
    noDrawSay: function () { return 'The deck is empty - that was the last card'; },
    slotHtml: function (key, S) { return key === 'stock' ? (S.stock.length ? '' : '<span class="spent" title="No cards left in the deck">&#10005;</span>') : null; },
    // the Hall of Fame (games/common/hof.js; api/games-hof.php replays every win with api/games-tp-lib.php), the 3-minute
    // sprint and the Journey. ⚠ sprintSeed must match tp_sprint_seed there; foundCount must match tp_found_count.
    hof: true, sprintLevel: 1,
    sprintSeed: function (n) { var l = TD.k1.length ? TD.k1 : [1]; return l[((n * 104729 + 17) % l.length + l.length) % l.length]; },
    foundCount: function (S) { return 28 - E.left(S); },
    sprintWords: { pill: 'cleared', sub: 'cleared from the peaks', line: 'As many cards off the peaks as you can', board: 'the most cards cleared from the peaks in three minutes (all 28 wins it)' },
    journey: window.TP_JOURNEY ? Object.assign({ where: 'up Dorset’s hills to its highest point' }, window.TP_JOURNEY) : null,
    journeyLevelName: function (lv) { return LV[lv] ? LV[lv].name + ' · ' + LV[lv].line : ''; },
    winnableSmall: 'Every deal has been played through to a win by our solver first.',
    dealOrder: function (S) { var o = [], i; for (i = 0; i < 28; i++) o.push(S.tab[i].c); o.push(S.waste[0]); return o; },
    deckPos: function (L) { return { x: L.stockX, y: L.baseY }; },
    cascade: function (S, L) { return S.waste.slice().reverse().map(function (c) { return { c: c, x: L.wasteX, y: L.baseY }; }); },
    help: [
      '<b>The aim:</b> clear all three peaks.',
      '<b>Tap a card</b> that is one higher or one lower than the card on the pile, and it goes on the pile &mdash; a 7 or a 9 on an 8, whatever the suit. Then go again from the new card.',
      'Cards played one after another make a <b>run</b>: each scores more than the last. Clearing the top of a peak scores 250.',
      'A card can only go once <b>both cards on top of it</b> have gone. Face-down cards turn over as they are freed.',
      'Stuck? <b>Tap the deck</b> to turn a new card onto the pile. You go through the deck once, so make each card count.',
      '<b>Pick how hard</b> under <b>New game</b>: <b>Easy</b> shows every card and lets a King and an Ace join round the corner; <b>Normal</b> keeps the peaks face down; <b>Hard</b> doesn&rsquo;t join King and Ace; <b>Expert</b> has no Undo either.',
      'Stuck? Press <b>Hint</b> (Easy and Normal). <b>Undo</b> takes back as many moves as you like, except at Expert.'
    ]
  });
})();
