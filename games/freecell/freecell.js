/* 365 FreeCell on the shared card table, games/common/table.js (3 Oct 2026). The rules are in engine.js
 * (window.FcEngine). The deals are Microsoft FreeCell's; every one from 1 to 32000 can be won except #11982, so the
 * "Deals you can always win" list is simply those. This file only says where things sit and how a card is picked up. */
(function () {
  'use strict';
  var E = window.FcEngine, FD = window.FC_DEALS || { c3: [], c2: [] };
  // 4 Oct 2026 - levels: 1 Easy (four cells, Undo + Hint - the game as it always was, so its scores carry on), 3 Normal
  // (four cells, no Hint), 5 Hard (three cells), 7 Expert (two cells, no Undo). Hard and Expert deal only from the deals
  // tools/freecell/solver.cjs has won with that many cells (deals.js).
  var LV = {
    1: { name: 'Easy', stars: 1, stat: 'all', line: 'Four free cells \u00b7 Undo and Hint' },
    3: { name: 'Normal', stars: 2, stat: 'lv3', line: 'Four free cells \u00b7 Undo, no Hint' },
    5: { name: 'Hard', stars: 3, stat: 'lv5', line: 'Only three free cells \u00b7 no Hint' },
    7: { name: 'Expert', stars: 4, stat: 'lv7', line: 'Only two free cells \u00b7 no Undo, no Hint' }
  };
  function lvOf(S) { return LV[S.lv] ? S.lv : 1; }
  var WIN = []; for (var n = 1; n <= 32000; n++) if (n !== 11982) WIN.push(n);

  function colX(L, i) { return L.left + i * (L.cw + L.gap); }
  function layout(W, H) {
    // a phone held upright (6 Oct 2026, Petra: "a bit small ... not clear enough"): narrow gaps, taller cards
    var phone = W < 600 && H > W * 1.3, asp = phone ? 1.5 : 1.4;
    var gap = phone ? 4 : Math.max(6, Math.min(16, Math.round(W * 0.011)));
    var byW = (W - gap * 9) / 8, byH = (H - gap * 3) / 4.5 / asp;
    var cw = Math.max(Math.min(30, Math.floor(byW)), Math.floor(Math.min(byW, byH, 160))), ch = Math.round(cw * asp);   // (never wider than the screen: a phone with big text is zoomed - 6 Oct 2026)
    var L = { cw: cw, ch: ch, gap: gap, W: W, H: H, phone: phone, left: Math.round((W - (8 * cw + 7 * gap)) / 2), top: gap, tabY: gap + ch + Math.round(gap * 1.6) };
    L.slots = [];
    for (var c = 0; c < 4; c++) L.slots.push({ key: 'c' + c, x: colX(L, c), y: L.top, cls: 'cell', text: '' });
    for (var f = 0; f < 4; f++) L.slots.push({ key: 'f' + f, x: colX(L, 4 + f), y: L.top, cls: 'found', text: 'A' });
    for (var t = 0; t < 8; t++) L.slots.push({ key: 't' + t, x: colX(L, t), y: L.tabY, cls: 'tab', text: '' });
    return L;
  }
  function gapFor(L, n) {   // every card face up: far enough apart to read, squeezed if the column gets long
    var tall = L.H > L.W * 1.25, fu = L.ch * (L.phone ? 0.48 : tall ? 0.42 : 0.28), avail = L.H - L.tabY - L.gap;
    if (n > 1 && L.ch + (n - 1) * fu > avail) fu = Math.max(L.ch * 0.14, (avail - L.ch) / (n - 1));
    return fu;
  }
  function positions(S, L) {
    var P = {};
    S.cells.forEach(function (c, i) { if (c !== null) P[c] = { x: colX(L, i), y: L.top, z: 100 + i, up: true, pile: 'c' + i }; });
    S.found.forEach(function (f, fi) { f.forEach(function (c, i) { P[c] = { x: colX(L, 4 + fi), y: L.top, z: 300 + fi * 20 + i, up: true, pile: 'f' + fi }; }); });
    S.tab.forEach(function (col, ci) {
      var g = gapFor(L, col.length);
      col.forEach(function (c, i) { P[c] = { x: colX(L, ci), y: Math.round(L.tabY + i * g), z: 500 + i, up: true, pile: 't' + ci }; });
    });
    return P;
  }
  function where(S, c) {
    for (var i = 0; i < 4; i++) if (S.cells[i] === c) return { p: 'c', i: i };
    for (var t = 0; t < 8; t++) {
      var k = S.tab[t].indexOf(c);
      if (k >= 0) { var n = S.tab[t].length - k; return n <= E.runLen(S.tab[t]) ? { p: 't', i: t, n: n } : null; }
    }
    return null;   // on a pile: in FreeCell a card never comes back down
  }
  function picked(S, from) { return E.picked(S, from); }
  function targets(S, from, L, P) {
    var out = [], i;
    if (picked(S, from).length === 1) {
      for (i = 0; i < (S.ncell || 4); i++) out.push({ to: { p: 'c', i: i }, x: colX(L, i), y: L.top });   // locked cells are never a place to drop
      for (i = 0; i < 4; i++) out.push({ to: { p: 'f', i: i }, x: colX(L, 4 + i), y: L.top });
    }
    for (i = 0; i < 8; i++) { var col = S.tab[i]; out.push({ to: { p: 't', i: i }, x: colX(L, i), y: col.length ? P[col[col.length - 1]].y : L.tabY }); }
    return out;
  }
  function hintLights(S, m) {
    var out = { cards: picked(S, m.from).slice(), slots: [] }, to = m.to;
    if (to.p === 'f') { var fp = S.found[to.i]; if (fp.length) out.cards.push(fp[fp.length - 1]); else out.slots.push('f' + to.i); }
    else if (to.p === 'c') out.slots.push('c' + to.i);
    else { var col = S.tab[to.i]; if (col.length) out.cards.push(col[col.length - 1]); else out.slots.push('t' + to.i); }
    if (to.p === 'c') out.say = 'Put it in a free cell for now';
    return out;
  }
  // when a move is refused, say why in plain words (owner, 3 Oct 2026)
  var WORD = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  var SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
  function whyNot(S, from, to) {
    var cards = picked(S, from); if (!cards.length) return 'No move for that card yet';
    var c = cards[0], r = E.rank(c);
    if (to && to.p === 'c') return cards.length > 1 ? 'A free cell holds just one card' : 'That free cell is full';
    if (to && to.p === 'f') {
      if (cards.length > 1) return 'Only one card at a time goes up to a pile';
      var f = S.found[to.i]; if (!f.length) return 'Each pile starts with an Ace';
      var t = f[f.length - 1];
      return E.rank(t) === 13 ? 'That pile is finished' : 'Each pile goes up in one suit - this one needs the ' + WORD[E.rank(t) + 1] + ' of ' + SUITS[E.suit(t)] + ' next';
    }
    if (to && to.p === 't') {
      var col = S.tab[to.i];
      if (col.length) {
        var tc = col[col.length - 1];
        if (!(E.red(tc) !== E.red(c) && E.rank(tc) === r + 1))
          return r === 13 ? 'A King can only go in an empty column' : 'A ' + (E.red(c) ? 'red ' : 'black ') + WORD[r] + ' goes on a ' + (E.red(c) ? 'black ' : 'red ') + WORD[r + 1];
      }
      var room = E.maxMove(S, !col.length);
      if (cards.length > room) return 'Not enough room to move ' + cards.length + ' cards together - ' + room + ' can move now. Free up a cell or a column first';
    }
    return 'No move for that card yet - a free cell may help';
  }
  function cantPick(S, c) {
    for (var f = 0; f < 4; f++) if (S.found[f].indexOf(c) >= 0) return 'In FreeCell, cards stay on the piles once they are up';
    return 'Only cards on the end of a column that run down in order, red and black, can move - move the cards on top first';
  }
  function valid(s) {
    var seen = {}, n = 0;
    try {
      s.tab.forEach(function (col) { col.forEach(function (c) { seen[c] = 1; n++; }); });
      s.cells.forEach(function (c) { if (c !== null) { seen[c] = 1; n++; } });
      s.found.forEach(function (f) { f.forEach(function (c) { seen[c] = 1; n++; }); });
    } catch (e) { return false; }
    if (!(n === 52 && Object.keys(seen).length === 52 && s.tab.length === 8 && s.cells.length === 4)) return false;
    if (!LV[s.lv]) s.lv = 1;                            // saved before 4 Oct: the four-cell game
    if (typeof s.ncell !== 'number') s.ncell = E.NCELL[s.lv];
    return true;
  }

  Table365.start({
    id: 'freecell', store: 'fc365', title: 'FreeCell', cards: 52, hasStock: false,
    face: function (c) { return { r: E.rank(c), s: E.suit(c) }; },
    E: E, layout: layout, positions: positions, where: where, picked: picked, targets: targets, hintLights: hintLights, valid: valid,
    whyNot: whyNot, cantPick: cantPick,
    autoNext: function (S, keepDown) { return E.autoMove(S, keepDown); },
    variant: { key: 'lv', stateKey: 'lv', label: 'Difficulty', small: 'Changes from your next game.', options: [[1, 'Easy'], [3, 'Normal'], [5, 'Hard'], [7, 'Expert']], def: 1,
               newLabel: function (v) { return LV[v] ? LV[v].name : 'Easy'; }, info: function (v) { return LV[v] ? LV[v].line : ''; },
               stars: function (v) { return LV[v] ? LV[v].stars : 1; },
               statKey: function (v) { return LV[v] ? LV[v].stat : 'all'; }, bestLabel: function (v) { return LV[v] ? LV[v].name : 'easy'; } },
    deals: function (v) { return v === 5 && FD.c3.length ? FD.c3 : v === 7 && FD.c2.length ? FD.c2 : WIN; },
    rules: function (S) { var v = lvOf(S); return { undo: v !== 7, hint: v === 1 }; },
    winBonus: function (S, secs) { return Math.round((100 + Math.max(0, 1200 - secs) / 2) * ({ 1: 1, 3: 1.25, 5: 1.6, 7: 2 }[lvOf(S)] || 1)); },
    describe: function (S) { return LV[lvOf(S)].name + ' level' + (S.ncell < 4 ? ' \u00b7 ' + S.ncell + ' free cells' : ''); },
    slotHtml: function (key, S) { return key.charAt(0) === 'c' ? (+key.charAt(1) >= (S.ncell || 4) ? '<span class="spent" title="Locked at this level">&#128274;</span>' : '') : null; },
    // the Hall of Fame, the 3-minute sprint and the Journey (games/common/hof.js, journey.js; api/games-hof.php replays
    // every win with api/games-fc-lib.php). ⚠ sprintSeed must match fc_sprint_seed there.
    hof: true, sprintLevel: 1,
    sprintSeed: function (n) { return WIN[((n * 104729 + 17) % WIN.length + WIN.length) % WIN.length]; },
    foundCount: function (S) { return S.found[0].length + S.found[1].length + S.found[2].length + S.found[3].length; },
    journey: window.FC_JOURNEY ? Object.assign({ where: 'through inland Dorset to the sea' }, window.FC_JOURNEY) : null,
    journeyLevelName: function (lv) { return LV[lv] ? LV[lv].name + ' \u00b7 ' + LV[lv].line : ''; },
    winnableSmall: 'With four free cells every deal from 1 to 32,000 can be won except #11982 - the same numbers as Windows FreeCell. Hard and Expert use deals our solver has won with three or two cells.',
    anySeed: function () { return 1 + Math.floor(Math.random() * 1000000); },
    dealOrder: function (S) { var o = [], r, c; for (r = 0; r < 7; r++) for (c = 0; c < 8; c++) if (r < S.tab[c].length) o.push(S.tab[c][r]); return o; },
    deckPos: function (L) { return { x: Math.round(L.W / 2 - L.cw / 2), y: L.top }; },
    cascade: function (S, L) { var q = [], r, f; for (r = 13; r >= 1; r--) for (f = 0; f < 4; f++) { var c = S.found[f][r - 1]; if (c != null) q.push({ c: c, x: colX(L, 4 + f), y: L.top }); } return q; },
    stuckText: 'No moves left - every free cell is full and nothing fits.',
    help: [
      '<b>The aim:</b> build the four piles at the top right, one for each suit, from Ace up to King.',
      '<b>Every card is face up</b> from the start, so you can plan ahead &mdash; almost every deal can be won.',
      '<b>In the eight columns</b>, put each card on one a step higher of the other colour &mdash; a red 6 on a black 7.',
      '<b>The four free cells</b> at the top left each hold one card while you get it out of the way.',
      '<b>Pick how hard</b> under <b>New game</b>: <b>Easy</b> has Hint; <b>Normal</b> has none; <b>Hard</b> gives you only three free cells and <b>Expert</b> two, with no Undo. Harder levels score more.',
      '<b>Any card</b> can go in an empty column. Several cards in order move together when there is room to do it.',
      '<b>Tap a card</b> and it goes to the best place for it &mdash; a free cell if nothing else fits. Dragging works too.',
      'Stuck? Press <b>Hint</b> (on Easy). <b>Undo</b> takes back as many moves as you like, on every level but Expert.'
    ]
  });
})();
