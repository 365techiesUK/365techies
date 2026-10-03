/* 365 Solitaire (Klondike) on the shared card table, games/common/table.js (3 Oct 2026). The rules are in engine.js
 * (window.SolEngine), the proven-winnable deal numbers in deals.js (window.SOL_DEALS). This file only says where the
 * piles sit and how a card is picked up; everything else - dealing, dragging, Undo, Hint, the win, scores - is the
 * table's. The storage names (sol365:*) and score keys (best.d1 / best.d3) are the ones Solitaire has always used, so
 * players keep their saved game and scores. */
(function () {
  'use strict';
  var E = window.SolEngine, DEALS = window.SOL_DEALS || null;

  function colX(L, i) { return L.left + i * (L.cw + L.gap); }
  function layout(W, H) {
    var gap = Math.max(6, Math.min(18, Math.round(W * 0.012)));
    var byW = (W - gap * 8) / 7, byH = (H - gap * 3) / 4.25 / 1.4;
    var cw = Math.max(32, Math.floor(Math.min(byW, byH, 170))), ch = Math.round(cw * 1.4);
    var L = { cw: cw, ch: ch, gap: gap, W: W, H: H, left: Math.round((W - (7 * cw + 6 * gap)) / 2), top: gap, tabY: gap + ch + Math.round(gap * 1.6) };
    L.slots = [{ key: 'stock', x: colX(L, 0), y: L.top, cls: 'stock', text: '' }];
    for (var f = 0; f < 4; f++) L.slots.push({ key: 'f' + f, x: colX(L, 3 + f), y: L.top, cls: 'found', text: 'A' });
    for (var t = 0; t < 7; t++) L.slots.push({ key: 't' + t, x: colX(L, t), y: L.tabY, cls: 'tab', text: 'K' });
    return L;
  }
  function colGaps(L, col) {   // face-down cards close together, face-up ones far enough apart to read; squeezed if long
    var tall = L.H > L.W * 1.25, fd = L.ch * (tall ? 0.15 : 0.11), fu = L.ch * (tall ? 0.42 : 0.3), downs = 0, ups = 0, avail = L.H - L.tabY - L.gap;
    col.forEach(function (x) { if (x.up) ups++; else downs++; });
    var need = L.ch + downs * fd + Math.max(0, ups - 1) * fu;
    if (need > avail && ups > 1) { fu = Math.max(L.ch * 0.16, (avail - L.ch - downs * fd) / (ups - 1)); need = L.ch + downs * fd + (ups - 1) * fu; }
    if (need > avail && downs > 0) fd = Math.max(L.ch * 0.05, (avail - L.ch - Math.max(0, ups - 1) * fu) / downs);
    return { fd: fd, fu: fu };
  }
  function positions(S, L) {
    var P = {};
    S.stock.forEach(function (c, i) { var k = Math.min(3, Math.floor(i / 8)); P[c] = { x: colX(L, 0) + k, y: L.top - k, z: 10 + i, up: false, pile: 's' }; });
    var n = S.waste.length, start = Math.max(0, n - (S.draw === 3 ? 3 : 1)), fan = Math.round(L.cw * 0.28);
    S.waste.forEach(function (c, i) { P[c] = { x: colX(L, 1) + (i >= start ? i - start : 0) * fan, y: L.top, z: 100 + i, up: true, pile: 'w' }; });
    S.found.forEach(function (f, fi) { f.forEach(function (c, i) { P[c] = { x: colX(L, 3 + fi), y: L.top, z: 300 + fi * 20 + i, up: true, pile: 'f' + fi }; }); });
    S.tab.forEach(function (col, ci) {
      var g = colGaps(L, col), y = L.tabY;
      col.forEach(function (x, i) { P[x.c] = { x: colX(L, ci), y: Math.round(y), z: 500 + i, up: x.up, pile: 't' + ci }; y += x.up ? g.fu : g.fd; });
    });
    return P;
  }
  function where(S, c) {   // where a card is, and how it could be picked up; null if it can't be
    if (S.stock.indexOf(c) >= 0) return { p: 'stock' };
    var wi = S.waste.indexOf(c); if (wi >= 0) return wi === S.waste.length - 1 ? { p: 'w' } : null;
    for (var f = 0; f < 4; f++) { var fi = S.found[f].indexOf(c); if (fi >= 0) return fi === S.found[f].length - 1 ? { p: 'f', i: f } : null; }
    for (var t = 0; t < 7; t++) {
      var col = S.tab[t];
      for (var k = 0; k < col.length; k++) if (col[k].c === c) return col[k].up ? { p: 't', i: t, n: col.length - k } : null;
    }
    return null;
  }
  function picked(S, from) {
    if (from.p === 'w') return S.waste.length ? [S.waste[S.waste.length - 1]] : [];
    if (from.p === 'f') return S.found[from.i].length ? [S.found[from.i][S.found[from.i].length - 1]] : [];
    if (from.p === 't') return S.tab[from.i].slice(S.tab[from.i].length - from.n).map(function (x) { return x.c; });
    return [];
  }
  function targets(S, from, L, P) {
    var out = [], j;
    if (picked(S, from).length === 1) for (var f = 0; f < 4; f++) out.push({ to: { p: 'f', i: f }, x: colX(L, 3 + f), y: L.top });
    for (j = 0; j < 7; j++) { var col = S.tab[j]; out.push({ to: { p: 't', i: j }, x: colX(L, j), y: col.length ? P[col[col.length - 1].c].y : L.tabY }); }
    return out;
  }
  function autoNext(S, keepDown) {   // the next card that can safely go up to its pile
    var cands = [], i, k, x, f;
    if (S.waste.length) cands.push({ c: S.waste[S.waste.length - 1], from: { p: 'w' } });
    for (i = 0; i < 7; i++) { var col = S.tab[i]; if (col.length && col[col.length - 1].up) cands.push({ c: col[col.length - 1].c, from: { p: 't', i: i, n: 1 } }); }
    for (k = 0; k < cands.length; k++) {
      x = cands[k]; if (x.c === keepDown) continue;
      f = E.foundFor(S, x.c);
      if (f >= 0 && E.safeToFound(S, x.c)) return { t: 'move', from: x.from, to: { p: 'f', i: f } };
    }
    return null;
  }
  function hintLights(S, m) {
    if (m.t === 'draw') return S.stock.length ? { cards: [S.stock[S.stock.length - 1]], say: 'Turn over a card from the deck' } : { slots: ['stock'], say: 'Turn the deck over' };
    var out = { cards: picked(S, m.from).slice(), slots: [] };
    if (m.to.p === 'f') { var fp = S.found[m.to.i]; if (fp.length) out.cards.push(fp[fp.length - 1]); else out.slots.push('f' + m.to.i); }
    else { var col = S.tab[m.to.i]; if (col.length) out.cards.push(col[col.length - 1].c); else out.slots.push('t' + m.to.i); }
    return out;
  }
  function valid(s) {
    var n = 0, seen = {};
    try {
      s.stock.concat(s.waste).forEach(function (c) { seen[c] = 1; n++; });
      s.found.forEach(function (f) { f.forEach(function (c) { seen[c] = 1; n++; }); });
      s.tab.forEach(function (col) { col.forEach(function (o) { seen[o.c] = 1; n++; }); });
    } catch (e) { return false; }
    return n === 52 && Object.keys(seen).length === 52 && (s.draw === 1 || s.draw === 3);
  }

  Table365.start({
    id: 'solitaire', store: 'sol365', title: 'Solitaire', cards: 52, hasStock: true,
    face: function (c) { return { r: E.rank(c), s: E.suit(c) }; },
    E: E, layout: layout, positions: positions, where: where, picked: picked, targets: targets, autoNext: autoNext, hintLights: hintLights, valid: valid,
    variant: { key: 'draw', label: 'Cards to turn over', small: 'One is easier. Changes from your next game.', options: [[1, 'One'], [3, 'Three']], def: 1,
               newLabel: function (v) { return v === 3 ? 'Turn three cards' : 'Turn one card'; }, statKey: function (v) { return 'd' + v; },
               bestLabel: function (v) { return v === 3 ? 'three cards' : 'one card'; } },
    deals: DEALS ? function (v) { return DEALS['d' + v]; } : null,
    dealOrder: function (S) { var o = [], row, col; for (row = 0; row < 7; row++) for (col = row; col < 7; col++) o.push(S.tab[col][row].c); return o; },
    deckPos: function (L) { return { x: colX(L, 0), y: L.top }; },
    cascade: function (S, L) { var q = [], r, f; for (r = 13; r >= 1; r--) for (f = 0; f < 4; f++) { var c = S.found[f][r - 1]; if (c != null) q.push({ c: c, x: colX(L, 3 + f), y: L.top }); } return q; },
    slotHtml: function (key, S) { return key === 'stock' ? (!S.stock.length && S.waste.length ? Table365.RECYCLE : '') : null; },
    noTap: function (from) { return from.p === 'f'; },
    describe: function (S) { return S.draw === 3 ? 'turning three cards' : 'turning one card'; },
    help: [
      '<b>The aim:</b> build the four piles at the top, one for each suit, from Ace up to King.',
      '<b>In the seven columns</b>, put each card on one a step higher of the other colour &mdash; a red 6 on a black 7.',
      '<b>Tap a card</b> and it moves to the best place for it. You can drag cards too, if you prefer.',
      '<b>Tap the deck</b> at the top left to turn over new cards. When it&rsquo;s empty, tap it to start again.',
      '<b>Only a King</b> can go in an empty column.',
      'Stuck? Press <b>Hint</b> and the next move lights up. <b>Undo</b> takes back as many moves as you like.'
    ]
  });
})();
