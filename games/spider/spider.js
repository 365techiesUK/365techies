/* 365 Spider on the shared card table, games/common/table.js (3 Oct 2026). The rules are in engine.js (window.SpEngine).
 * Two packs, 104 cards; the deck sits top left, the eight finished suits along the top. One, two or four suits. This file
 * only says where things sit and how cards are picked up; the table does the rest. */
(function () {
  'use strict';
  var E = window.SpEngine, SD = window.SP_DEALS || { s1: [], s2: [], s4: [] };
  var NAMES = { 1: 'one suit', 2: 'two suits', 4: 'four suits' };
  // 4 Oct 2026 - levels: 1 Easy (one suit), 3 Normal (two suits), 5 Hard (four suits, no Hint), 7 Expert (four suits, no Undo,
  // no Hint). The stat keys are the old s1 / s2 / s4, so everyone's scores from before carry on. Today's deal, the Hall of Fame
  // and the Journey only use deals tools/spider/solver.cjs has won (deals.js).
  var LV = {
    1: { name: 'Easy', stars: 1, stat: 's1', line: 'One suit \u00b7 Undo and Hint' },
    3: { name: 'Normal', stars: 2, stat: 's2', line: 'Two suits \u00b7 Undo and Hint' },
    5: { name: 'Hard', stars: 3, stat: 's4', line: 'All four suits \u00b7 no Hint' },
    7: { name: 'Expert', stars: 4, stat: 'x', line: 'All four suits \u00b7 no Undo, no Hint' }
  };
  function lvOf(S) { return LV[S.lv] ? S.lv : E.lvOf(S.suits); }
  // the suits setting from before 4 Oct (1 / 2 / 4) becomes the matching level, before the table reads it
  try { var st = JSON.parse(localStorage.getItem('sp365:settings') || 'null'); if (st && (st.suits === 2 || st.suits === 4)) { st.suits = E.lvOf(st.suits); localStorage.setItem('sp365:settings', JSON.stringify(st)); } } catch (e) {}

  function colX(L, i) { return L.left + i * (L.cw + L.gap); }
  function layout(W, H) {
    var gap = Math.max(5, Math.min(14, Math.round(W * 0.009)));
    var byW = (W - gap * 11) / 10, byH = (H - gap * 3) / 4.6 / 1.4;
    var cw = Math.max(Math.min(28, Math.floor(byW)), Math.floor(Math.min(byW, byH, 150))), ch = Math.round(cw * 1.4);   // (never wider than the screen)
    var L = { cw: cw, ch: ch, gap: gap, W: W, H: H, left: Math.round((W - (10 * cw + 9 * gap)) / 2), top: gap, tabY: gap + ch + Math.round(gap * 1.8) };
    L.slots = [{ key: 'stock', x: colX(L, 0), y: L.top, cls: 'stock', text: '' }];
    for (var d = 0; d < 8; d++) L.slots.push({ key: 'd' + d, x: colX(L, 2 + d), y: L.top, cls: 'done', text: 'K–A' });
    for (var t = 0; t < 10; t++) L.slots.push({ key: 't' + t, x: colX(L, t), y: L.tabY, cls: 'tab', text: '' });
    return L;
  }
  function colGaps(L, col) {   // face-down cards close together, face-up ones far enough apart to read; squeezed if long
    var tall = L.H > L.W * 1.25, fd = L.ch * (tall ? 0.13 : 0.1), fu = L.ch * (tall ? 0.38 : 0.27), downs = 0, ups = 0, avail = L.H - L.tabY - L.gap;
    col.forEach(function (x) { if (x.up) ups++; else downs++; });
    var need = L.ch + downs * fd + Math.max(0, ups - 1) * fu;
    if (need > avail && ups > 1) { fu = Math.max(L.ch * 0.13, (avail - L.ch - downs * fd) / (ups - 1)); need = L.ch + downs * fd + (ups - 1) * fu; }
    if (need > avail && downs > 0) fd = Math.max(L.ch * 0.04, (avail - L.ch - Math.max(0, ups - 1) * fu) / downs);
    return { fd: fd, fu: fu };
  }
  function positions(S, L) {
    var P = {}, fan = Math.max(4, Math.round(L.cw * 0.12));
    // the deck in its five deals, the next one on the right
    S.stock.forEach(function (c, i) { P[c] = { x: colX(L, 0) + Math.floor(i / 10) * fan, y: L.top, z: 10 + i, up: false, pile: 's' }; });
    S.done.forEach(function (run, k) { run.forEach(function (c, i) { P[c] = { x: colX(L, 2 + k), y: L.top, z: 300 + k * 20 + (13 - i), up: true, pile: 'd' + k }; }); });
    S.tab.forEach(function (col, ci) {
      var g = colGaps(L, col), y = L.tabY;
      col.forEach(function (x, i) { P[x.c] = { x: colX(L, ci), y: Math.round(y), z: 500 + i, up: x.up, pile: 't' + ci }; y += x.up ? g.fu : g.fd; });
    });
    return P;
  }
  function where(S, c) {
    if (S.stock.indexOf(c) >= 0) return { p: 'stock' };
    for (var t = 0; t < 10; t++) {
      var col = S.tab[t];
      for (var k = 0; k < col.length; k++) if (col[k].c === c) {
        var n = col.length - k;
        return col[k].up && n <= E.runLen(S, col) ? { p: 't', i: t, n: n } : null;
      }
    }
    return null;
  }
  function picked(S, from) { return E.picked(S, from); }
  function targets(S, from, L, P) {
    var out = [];
    for (var j = 0; j < 10; j++) { var col = S.tab[j]; out.push({ to: { p: 't', i: j }, x: colX(L, j), y: col.length ? P[col[col.length - 1].c].y : L.tabY }); }
    return out;
  }
  function hintLights(S, m) {
    if (m.t === 'draw') return { cards: S.stock.slice(-10), say: 'Deal more cards from the deck' };
    var out = { cards: picked(S, m.from).slice(), slots: [] }, col = S.tab[m.to.i];
    if (col.length) out.cards.push(col[col.length - 1].c); else out.slots.push('t' + m.to.i);
    return out;
  }
  // when a move is refused, say why in plain words (owner, 3 Oct 2026)
  var WORD = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  function whyNot(S, from, to) {
    var cards = picked(S, from); if (!cards.length) return 'No move for that card yet';
    var r = E.rank(cards[0]);
    if (to && to.p === 't' && S.tab[to.i].length) return r === 13 ? 'A King can only go in an empty column' : 'A ' + WORD[r] + ' goes on any ' + WORD[r + 1] + ', whatever its suit';
    return 'No move for that card yet';
  }
  function cantPick(S, c) {
    for (var t = 0; t < 10; t++) for (var k = 0; k < S.tab[t].length; k++) if (S.tab[t][k].c === c)
      return S.tab[t][k].up ? 'Only cards running down in order in one suit move together - move the cards on top first' : 'This card turns over once the cards on top of it have moved';
    return '';
  }
  function valid(s) {
    var seen = {}, n = 0;
    try {
      s.tab.forEach(function (col) { col.forEach(function (x) { seen[x.c] = 1; n++; }); });
      s.stock.forEach(function (c) { seen[c] = 1; n++; });
      s.done.forEach(function (r) { r.forEach(function (c) { seen[c] = 1; n++; }); });
    } catch (e) { return false; }
    if (!(n === 104 && Object.keys(seen).length === 104 && s.tab.length === 10 && (s.suits === 1 || s.suits === 2 || s.suits === 4))) return false;
    if (!LV[s.lv]) s.lv = E.lvOf(s.suits);                 // saved before 4 Oct: one, two or four suits
    return true;
  }

  Table365.start({
    id: 'spider', store: 'sp365', title: 'Spider', cards: 104, hasStock: true,
    face: function (c, S) { return { r: E.rank(c), s: E.suitOf(c, S ? S.suits : 1) }; },
    faceKey: function (S) { return 'sp' + (S ? S.suits : 1); },
    E: E, layout: layout, positions: positions, where: where, picked: picked, targets: targets, hintLights: hintLights, valid: valid,
    whyNot: whyNot, cantPick: cantPick,
    variant: { key: 'suits', stateKey: 'lv', label: 'Difficulty', small: 'Changes from your next game.', options: [[1, 'Easy'], [3, 'Normal'], [5, 'Hard'], [7, 'Expert']], def: 1,
               newLabel: function (v) { return LV[v] ? LV[v].name : 'Easy'; }, info: function (v) { return LV[v] ? LV[v].line : ''; },
               stars: function (v) { return LV[v] ? LV[v].stars : 1; },
               statKey: function (v) { return LV[v] ? LV[v].stat : 's1'; }, bestLabel: function (v) { return LV[v] ? LV[v].name.toLowerCase() : 'easy'; } },
    deals: function (v) { var l = v === 1 ? SD.s1 : v === 3 ? SD.s2 : SD.s4; return l && l.length ? l : null; },
    rules: function (S) { var v = lvOf(S); return { undo: v !== 7, hint: v <= 3 }; },
    dealOrder: function (S) { var o = [], r, c; for (r = 0; r < 6; r++) for (c = 0; c < 10; c++) if (r < S.tab[c].length) o.push(S.tab[c][r].c); return o; },
    deckPos: function (L) { return { x: colX(L, 0), y: L.top }; },
    cascade: function (S, L) { var q = []; S.done.forEach(function (run, k) { run.slice().reverse().forEach(function (c) { q.push({ c: c, x: colX(L, 2 + k), y: L.top }); }); }); return q; },
    winBonus: function () { return 0; },   // Windows Spider's points: 500, less 1 a move, 100 a suit
    // the Hall of Fame, the 3-minute sprint and the Journey (games/common/hof.js, journey.js; api/games-hof.php replays every
    // win with api/games-sp-lib.php). ⚠ sprintSeed must match sp_sprint_seed there; foundCount must match sp_found_count.
    hof: true, sprintLevel: 1,
    clockMins: function (S) { return { 1: 10, 3: 15, 5: 25, 7: 25 }[lvOf(S)] || 10; },
    clockText: 'Win a fresh deal in 10 minutes (15 with two suits, 25 with four)',
    sprintSeed: function (n) { var l = SD.s1.length ? SD.s1 : [1]; return l[((n * 104729 + 17) % l.length + l.length) % l.length]; },
    foundCount: function (S) { return E.inOrder(S); },
    sprintWords: { pill: 'cards in order', sub: 'in suit order', line: 'As many cards in suit order as you can', board: 'the most cards in suit order in three minutes (13 for each suit cleared)' },
    journey: window.SP_JOURNEY ? Object.assign({ where: 'along the Jurassic Coast to Lyme Regis' }, window.SP_JOURNEY) : null,
    journeyLevelName: function (lv) { return LV[lv] ? LV[lv].name + ' \u00b7 ' + LV[lv].line : ''; },
    winnableSmall: 'Deals our solver has won at that level, checked move by move.',
    noDrawSay: function (S) { return S.stock.length ? 'Every column needs a card before you can deal' : 'There are no more cards to deal'; },
    describe: function (S) { return LV[lvOf(S)].name + ' level \u00b7 ' + NAMES[S.suits]; },
    stuckText: 'No more moves found.',
    help: [
      '<b>The aim:</b> make a run from King down to Ace in one suit. A finished run clears itself off the table &mdash; clear eight to win.',
      '<b>Any card</b> can go on a card one step higher, whatever its suit &mdash; a 6 on any 7.',
      '<b>Cards move together</b> only when they run down in order in one suit.',
      '<b>Tap the deck</b> at the top left to deal a new card onto every column. Every column needs a card first.',
      '<b>Any card</b> can go in an empty column.',
      '<b>Pick how hard</b> under <b>New game</b>: <b>Easy</b> is one suit, <b>Normal</b> two, <b>Hard</b> all four with no Hint, and <b>Expert</b> all four with no Undo.',
      'Stuck? Press <b>Hint</b> (Easy and Normal). <b>Undo</b> takes back as many moves as you like, except at Expert.'
    ]
  });
})();
