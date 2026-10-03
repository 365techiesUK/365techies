/* 365 FreeCell on the shared card table, games/common/table.js (3 Oct 2026). The rules are in engine.js
 * (window.FcEngine). The deals are Microsoft FreeCell's; every one from 1 to 32000 can be won except #11982, so the
 * "Deals you can always win" list is simply those. This file only says where things sit and how a card is picked up. */
(function () {
  'use strict';
  var E = window.FcEngine;
  var WIN = []; for (var n = 1; n <= 32000; n++) if (n !== 11982) WIN.push(n);

  function colX(L, i) { return L.left + i * (L.cw + L.gap); }
  function layout(W, H) {
    var gap = Math.max(6, Math.min(16, Math.round(W * 0.011)));
    var byW = (W - gap * 9) / 8, byH = (H - gap * 3) / 4.5 / 1.4;
    var cw = Math.max(30, Math.floor(Math.min(byW, byH, 160))), ch = Math.round(cw * 1.4);
    var L = { cw: cw, ch: ch, gap: gap, W: W, H: H, left: Math.round((W - (8 * cw + 7 * gap)) / 2), top: gap, tabY: gap + ch + Math.round(gap * 1.6) };
    L.slots = [];
    for (var c = 0; c < 4; c++) L.slots.push({ key: 'c' + c, x: colX(L, c), y: L.top, cls: 'cell', text: '' });
    for (var f = 0; f < 4; f++) L.slots.push({ key: 'f' + f, x: colX(L, 4 + f), y: L.top, cls: 'found', text: 'A' });
    for (var t = 0; t < 8; t++) L.slots.push({ key: 't' + t, x: colX(L, t), y: L.tabY, cls: 'tab', text: '' });
    return L;
  }
  function gapFor(L, n) {   // every card face up: far enough apart to read, squeezed if the column gets long
    var tall = L.H > L.W * 1.25, fu = L.ch * (tall ? 0.42 : 0.28), avail = L.H - L.tabY - L.gap;
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
      for (i = 0; i < 4; i++) out.push({ to: { p: 'c', i: i }, x: colX(L, i), y: L.top });
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
  function valid(s) {
    var seen = {}, n = 0;
    try {
      s.tab.forEach(function (col) { col.forEach(function (c) { seen[c] = 1; n++; }); });
      s.cells.forEach(function (c) { if (c !== null) { seen[c] = 1; n++; } });
      s.found.forEach(function (f) { f.forEach(function (c) { seen[c] = 1; n++; }); });
    } catch (e) { return false; }
    return n === 52 && Object.keys(seen).length === 52 && s.tab.length === 8 && s.cells.length === 4;
  }

  Table365.start({
    id: 'freecell', store: 'fc365', title: 'FreeCell', cards: 52, hasStock: false,
    face: function (c) { return { r: E.rank(c), s: E.suit(c) }; },
    E: E, layout: layout, positions: positions, where: where, picked: picked, targets: targets, hintLights: hintLights, valid: valid,
    autoNext: function (S, keepDown) { return E.autoMove(S, keepDown); },
    deals: function () { return WIN; },
    winnableSmall: 'Every deal from 1 to 32,000 except #11982 can be won - the same numbers as Windows FreeCell.',
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
      '<b>Any card</b> can go in an empty column. Several cards in order move together when there is room to do it.',
      '<b>Tap a card</b> and it goes to the best place for it &mdash; a free cell if nothing else fits. Dragging works too.',
      'Stuck? Press <b>Hint</b>. <b>Undo</b> takes back as many moves as you like.'
    ]
  });
})();
