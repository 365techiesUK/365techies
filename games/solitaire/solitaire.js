/* 365 Solitaire - the screen (3 Oct 2026). The rules live in engine.js (window.SolEngine) and the deal numbers that
 * have been proven winnable in deals.js (window.SOL_DEALS). Scores, settings and the game in progress are kept in this
 * browser only (localStorage) - nothing is sent anywhere. Every card is a real element moved with CSS transforms, so
 * dealing, flipping and flying up to the piles animate smoothly; the win celebration is drawn on a canvas. */
(function () {
  'use strict';
  var E = window.SolEngine, DEALS = window.SOL_DEALS || null;
  var $ = function (id) { return document.getElementById(id); };
  var board = $('board');
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var TXT = '︎';   // keep the suit signs as plain text, never coloured emoji
  function SU(c) { return E.SUIT_CH[E.suit(c)] + TXT; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  // ---------------------------------------------------------------- what this browser remembers
  function load(k, d) { try { var v = localStorage.getItem('sol365:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('sol365:' + k, JSON.stringify(v)); } catch (e) {} }
  var SET = { draw: 1, winnable: true, auto: true, sound: true, timer: true, felt: 'green', seenHelp: false };
  (function () { var s = load('settings', null); if (s && typeof s === 'object') for (var k in SET) if (k in s) SET[k] = s[k]; })();
  function blankStats() { return { v: 1, played: 0, won: 0, streak: 0, bestStreak: 0, best: { d1: {}, d3: {} }, daily: {}, recent: [] }; }
  var ST = blankStats();
  (function () { var s = load('stats', null); if (s && s.v === 1) { for (var k in ST) if (k in s) ST[k] = s[k]; if (!ST.best.d1) ST.best.d1 = {}; if (!ST.best.d3) ST.best.d3 = {}; } })();

  var S = null;      // the game (engine state)
  var G = null;      // the screen's notes on it: undo list, clock, which kind of game
  var busy = false;  // an automatic run is going (dealing, moving up, finishing): taps wait
  var gen = 0;       // bumped by every new game; a timed step from an older game sees the change and stops
  function newG(mode, day) { return { undo: [], ms: 0, mode: mode || 'deal', day: day || '', started: false, counted: false, undid: 0, keepDown: null }; }

  // ---------------------------------------------------------------- the cards
  var PIPS = {
    2: [[50, 0], [50, 100]], 3: [[50, 0], [50, 50], [50, 100]], 4: [[0, 0], [100, 0], [0, 100], [100, 100]],
    5: [[0, 0], [100, 0], [50, 50], [0, 100], [100, 100]], 6: [[0, 0], [100, 0], [0, 50], [100, 50], [0, 100], [100, 100]],
    7: [[0, 0], [100, 0], [50, 25], [0, 50], [100, 50], [0, 100], [100, 100]],
    8: [[0, 0], [100, 0], [50, 25], [0, 50], [100, 50], [50, 75], [0, 100], [100, 100]],
    9: [[0, 0], [100, 0], [0, 33.3], [100, 33.3], [50, 50], [0, 66.7], [100, 66.7], [0, 100], [100, 100]],
    10: [[0, 0], [100, 0], [50, 16.7], [0, 33.3], [100, 33.3], [0, 66.7], [100, 66.7], [50, 83.3], [0, 100], [100, 100]]
  };
  var COURT = {   // a plume for the Jack, a tiara for the Queen, a crown for the King
    11: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20c1.5-7 6-12.5 15-15-2.5 2.6-3.8 5.2-4.3 8.4L18 14c-5.2.2-9.6 2-14 6z"/><circle cx="19" cy="4.6" r="1.7"/></svg>',
    12: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 5.4 8.6l4 3.9L12 6.5l2.6 6 4-3.9L20 17z"/><circle cx="5.4" cy="7" r="1.5"/><circle cx="12" cy="4.6" r="1.5"/><circle cx="18.6" cy="7" r="1.5"/><rect x="4" y="18.2" width="16" height="2.4" rx="1"/></svg>',
    13: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.2 4.2 6.8l4.6 4.3L12 3.6l3.2 7.5 4.6-4.3L21 17.2z"/><rect x="3" y="18.4" width="18" height="2.8" rx="1"/></svg>'
  };
  var cardEl = [], slotEl = {};
  function makeCard(c) {
    var r = E.rank(c), su = SU(c), el = document.createElement('div'), mid;
    el.className = 'card down ' + (E.red(c) ? 'red' : 'blk') + ' r' + r;
    el.setAttribute('data-c', c);
    el.setAttribute('aria-hidden', 'true');
    if (r === 1) mid = '<div class="ace">' + su + (E.suit(c) === 0 ? '<i>365</i>' : '') + '</div>';
    else if (r > 10) mid = '<div class="court">' + COURT[r] + '<b>' + E.RANK_CH[r] + '</b><em>' + su + '</em></div>';
    else mid = '<div class="pips">' + PIPS[r].map(function (p) {
      return '<span class="pip' + (p[1] > 50 ? ' dn' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%">' + su + '</span>';
    }).join('') + '</div>';
    el.innerHTML = '<div class="wig"><div class="flip"><div class="face front"><span class="idx' + (r === 10 ? ' ten' : '') + '">' + E.RANK_CH[r]
      + '</span><span class="sui">' + su + '</span>' + mid + '</div><div class="face back"></div></div></div>';
    return el;
  }
  function makeSlot(cls, txt) { var s = document.createElement('div'); s.className = 'slot ' + cls; s.textContent = txt || ''; board.appendChild(s); return s; }
  var RECYCLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/></svg>';

  // ---------------------------------------------------------------- where everything sits
  var L = { cw: 90, ch: 126, gap: 12, left: 0, top: 12, tabY: 150, W: 800, H: 600 };
  function layout() {
    var W = board.clientWidth, H = board.clientHeight;
    var gap = Math.max(6, Math.min(18, Math.round(W * 0.012)));
    var byW = (W - gap * 8) / 7, byH = (H - gap * 3) / 4.25 / 1.4;
    var cw = Math.max(32, Math.floor(Math.min(byW, byH, 170))), ch = Math.round(cw * 1.4);
    L = { cw: cw, ch: ch, gap: gap, W: W, H: H, left: Math.round((W - (7 * cw + 6 * gap)) / 2), top: gap, tabY: gap + ch + Math.round(gap * 1.6) };
    document.documentElement.style.setProperty('--cw', cw + 'px');
    document.documentElement.style.setProperty('--ch', ch + 'px');
    place(slotEl.stock, colX(0), L.top);
    for (var f = 0; f < 4; f++) place(slotEl['f' + f], colX(3 + f), L.top);
    for (var t = 0; t < 7; t++) place(slotEl['t' + t], colX(t), L.tabY);
    imgCache = {};
  }
  function colX(i) { return L.left + i * (L.cw + L.gap); }
  function place(el, x, y) { el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)'; }
  function colGaps(col) {   // face-down cards close together, face-up ones far enough apart to read; squeezed if the column is long
    var tall = L.H > L.W * 1.25, fd = L.ch * (tall ? 0.15 : 0.11), fu = L.ch * (tall ? 0.42 : 0.3), downs = 0, ups = 0, avail = L.H - L.tabY - L.gap;
    col.forEach(function (x) { if (x.up) ups++; else downs++; });
    var need = L.ch + downs * fd + Math.max(0, ups - 1) * fu;
    if (need > avail && ups > 1) { fu = Math.max(L.ch * 0.16, (avail - L.ch - downs * fd) / (ups - 1)); need = L.ch + downs * fd + (ups - 1) * fu; }
    if (need > avail && downs > 0) fd = Math.max(L.ch * 0.05, (avail - L.ch - Math.max(0, ups - 1) * fu) / downs);
    return { fd: fd, fu: fu };
  }
  function positions() {
    var P = {};
    S.stock.forEach(function (c, i) { var k = Math.min(3, Math.floor(i / 8)); P[c] = { x: colX(0) + k, y: L.top - k, z: 10 + i, up: false, pile: 's' }; });
    var n = S.waste.length, start = Math.max(0, n - (S.draw === 3 ? 3 : 1)), fan = Math.round(L.cw * 0.28);
    S.waste.forEach(function (c, i) { P[c] = { x: colX(1) + (i >= start ? i - start : 0) * fan, y: L.top, z: 100 + i, up: true, pile: 'w' }; });
    S.found.forEach(function (f, fi) { f.forEach(function (c, i) { P[c] = { x: colX(3 + fi), y: L.top, z: 300 + fi * 20 + i, up: true, pile: 'f' + fi }; }); });
    S.tab.forEach(function (col, ci) {
      var g = colGaps(col), y = L.tabY;
      col.forEach(function (x, i) { P[x.c] = { x: colX(ci), y: Math.round(y), z: 500 + i, up: x.up, pile: 't' + ci }; y += x.up ? g.fu : g.fd; });
    });
    return P;
  }
  var lastP = {};
  function render(instant) {
    var P = positions();
    if (instant) board.classList.add('instant');
    for (var c = 0; c < 52; c++) {
      var p = P[c], el = cardEl[c], old = lastP[c]; if (!p) continue;
      if (!el.classList.contains('drag')) el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
      el.classList.toggle('down', !p.up);
      el._z = p.z;
      if (!instant && old && old.pile !== p.pile) {   // flying to another pile: stay on top of everything until it lands
        el.style.zIndex = 2000 + p.z; clearTimeout(el._zt);
        el._zt = setTimeout((function (e) { return function () { e.style.zIndex = e._z; e._zt = 0; }; })(el), 320);
      } else if (!el._zt) el.style.zIndex = p.z;
    }
    lastP = P;
    var st = slotEl.stock;
    st.innerHTML = !S.stock.length && S.waste.length ? RECYCLE : '';
    st.title = !S.stock.length && S.waste.length ? 'Turn the deck over' : '';
    if (instant) { void board.offsetWidth; board.classList.remove('instant'); }
    bar();
  }
  function bar() {
    $('vMoves').textContent = S.moves;
    $('vScore').textContent = S.score;
    $('vTime').textContent = clock(G.ms);
    $('chipTime').style.display = SET.timer ? '' : 'none';
    $('bUndo').disabled = !G.undo.length;
  }
  function clock(ms) {
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
  }

  // ---------------------------------------------------------------- touching the cards
  function where(c) {   // where a card is, and how it could be picked up ({p, i, n}); null if it can't be
    if (S.stock.indexOf(c) >= 0) return { p: 's' };
    var wi = S.waste.indexOf(c); if (wi >= 0) return wi === S.waste.length - 1 ? { p: 'w' } : null;
    for (var f = 0; f < 4; f++) { var fi = S.found[f].indexOf(c); if (fi >= 0) return fi === S.found[f].length - 1 ? { p: 'f', i: f } : null; }
    for (var t = 0; t < 7; t++) {
      var col = S.tab[t];
      for (var k = 0; k < col.length; k++) if (col[k].c === c) return col[k].up ? { p: 't', i: t, n: col.length - k } : null;
    }
    return null;
  }
  function picked(from) {
    if (from.p === 'w') return S.waste.length ? [S.waste[S.waste.length - 1]] : [];
    if (from.p === 'f') return S.found[from.i].length ? [S.found[from.i][S.found[from.i].length - 1]] : [];
    if (from.p === 't') return S.tab[from.i].slice(S.tab[from.i].length - from.n).map(function (x) { return x.c; });
    return [];
  }
  var drag = null, gestured = false;
  board.addEventListener('pointerdown', function (e) {
    gestured = true;
    if (busy || (e.button && e.button > 0) || openSheet) return;
    var hit = e.target.closest ? e.target.closest('.card, .slot') : null; if (!hit) return;
    unhint();
    if (hit.classList.contains('slot')) { if (hit === slotEl.stock) { e.preventDefault(); act({ t: 'draw' }); } return; }
    var c = +hit.getAttribute('data-c'), from = where(c);
    if (!from) return;
    e.preventDefault();
    if (from.p === 's') { act({ t: 'draw' }); return; }
    var cards = picked(from);
    drag = { from: from, cards: cards, c: c, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false, id: e.pointerId,
             base: cards.map(function (k) { return lastP[k]; }) };
    try { board.setPointerCapture(e.pointerId); } catch (er) {}
  });
  board.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 8) return;
      drag.moved = true;
      drag.cards.forEach(function (k, i) { var el = cardEl[k]; clearTimeout(el._zt); el._zt = 0; el.classList.add('drag'); el.style.zIndex = 3000 + i; });
    }
    drag.dx = dx; drag.dy = dy;
    drag.cards.forEach(function (k, i) { var b = drag.base[i]; cardEl[k].style.transform = 'translate3d(' + (b.x + dx) + 'px,' + (b.y + dy) + 'px,0)'; });
  });
  board.addEventListener('pointerup', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (!d.moved) { tap(d); return; }
    var m = dropTarget(d);
    d.cards.forEach(function (k) { cardEl[k].classList.remove('drag'); });
    if (m) act(m); else { render(); sfx('nope'); }
  });
  board.addEventListener('pointercancel', function () { if (!drag) return; var d = drag; drag = null; d.cards.forEach(function (k) { cardEl[k].classList.remove('drag'); }); render(); });
  board.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  function tap(d) {
    if (d.from.p === 'f') return;   // cards come down from the piles by dragging only, never by an accidental tap
    var m = E.smartMove(S, d.from);
    if (m) act(m);
    else { nope(cardEl[d.c]); sfx('nope'); say('No move for that card yet'); }
  }
  function dropTarget(d) {   // the legal pile the dragged card overlaps most
    var b = d.base[0], x = b.x + d.dx, y = b.y + d.dy, best = null, bestA = 0;
    function consider(to, rx, ry) {
      var ox = Math.min(x + L.cw, rx + L.cw) - Math.max(x, rx), oy = Math.min(y + L.ch, ry + L.ch) - Math.max(y, ry);
      if (ox <= 0 || oy <= 0 || ox * oy <= bestA) return;
      var m = { t: 'move', from: d.from, to: to };
      if (E.legal(S, m)) { best = m; bestA = ox * oy; }
    }
    if (d.cards.length === 1) for (var f = 0; f < 4; f++) consider({ p: 'f', i: f }, colX(3 + f), L.top);
    for (var j = 0; j < 7; j++) {
      var col = S.tab[j], ty = col.length ? lastP[col[col.length - 1].c].y : L.tabY;
      consider({ p: 't', i: j }, colX(j), ty);
    }
    return best;
  }
  function nope(el) { if (!el) return; el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); setTimeout(function () { el.classList.remove('nope'); }, 360); }
  function pop(c) { var el = cardEl[c]; setTimeout(function () { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); setTimeout(function () { el.classList.remove('pop'); }, 380); }, 240); }

  // ---------------------------------------------------------------- making moves
  function act(m) {
    if (busy || !S || S.won) return;
    var snap = { s: E.clone(S), ms: G.ms };
    var fx = E.apply(S, m);
    if (!fx) { sfx('nope'); render(); return; }
    G.undo.push(snap); if (G.undo.length > 400) G.undo.shift();
    G.started = true;
    G.keepDown = m.t === 'move' && m.from.p === 'f' ? fx.cards[0] : null;   // just taken down on purpose: don't send it straight back up
    hideStuck(); unhint();
    effects(fx);
    render();
    after();
  }
  function effects(fx) {
    if (fx.t === 'draw') sfx(fx.recycled ? 'shuffle' : 'flip');
    else if (fx.toFound) { sfx('found'); fx.cards.forEach(pop); }
    else sfx('place');
    if (fx.flipped.length) setTimeout(function () { sfx('flip'); }, 140);
  }
  function autoNext() {   // the next card that can safely go up to its pile
    var cands = [], i, k, x, f;
    if (S.waste.length) cands.push({ c: S.waste[S.waste.length - 1], from: { p: 'w' } });
    for (i = 0; i < 7; i++) { var col = S.tab[i]; if (col.length && col[col.length - 1].up) cands.push({ c: col[col.length - 1].c, from: { p: 't', i: i, n: 1 } }); }
    for (k = 0; k < cands.length; k++) {
      x = cands[k]; if (x.c === G.keepDown) continue;
      f = E.foundFor(S, x.c);
      if (f >= 0 && E.safeToFound(S, x.c)) return { t: 'move', from: x.from, to: { p: 'f', i: f } };
    }
    return null;
  }
  function after() {
    if (S.won) return win();
    if (SET.auto) {
      var m = autoNext();
      if (m) {
        busy = true;
        var my = gen;
        setTimeout(function () { if (my !== gen) return; busy = false; var fx = E.apply(S, m); if (fx) { effects(fx); render(); } after(); }, reduce ? 0 : 170);
        return;
      }
    }
    if (E.finishable(S)) { busy = true; say('Finishing it off for you…'); finSteps = 0; var mg = gen; setTimeout(function () { finish(mg); }, reduce ? 0 : 420); return; }
    persist();
    if (G.started && E.stuck(S)) showStuck();
  }
  var finSteps = 0;
  function finish(my) {
    if (my !== gen) return;
    var m = E.finishStep(S);
    if (!m || ++finSteps > 900) { busy = false; persist(); return; }
    var fx = E.apply(S, m);
    if (fx) { effects(fx); render(); }
    if (S.won) { busy = false; return win(); }
    setTimeout(function () { finish(my); }, reduce ? 0 : (m.t === 'draw' ? 50 : 105));
  }
  function undo() {
    if (!G.undo.length || !S || S.won || drag) return;   // after a win the scores are written: no taking it back
    if (busy) { gen++; busy = false; }   // cards still moving up by themselves: stop them; the step comes back whole
    var u = G.undo.pop();
    S = u.s; G.undid++; G.keepDown = null;
    hideStuck(); unhint(); sfx('place');
    render(); persist();
  }

  // ---------------------------------------------------------------- the hint
  var hintT = 0;
  function hint() {
    if (busy || !S || S.won) return;
    unhint();
    var m = E.hint(S);
    if (!m) { showStuck(); return; }
    var lit = [];
    if (m.t === 'draw') { lit.push(S.stock.length ? cardEl[S.stock[S.stock.length - 1]] : slotEl.stock); say(S.stock.length ? 'Turn over a card from the deck' : 'Turn the deck over'); }
    else {
      picked(m.from).forEach(function (c) { lit.push(cardEl[c]); });
      if (m.to.p === 'f') { var fp = S.found[m.to.i]; lit.push(fp.length ? cardEl[fp[fp.length - 1]] : slotEl['f' + m.to.i]); }
      else { var col = S.tab[m.to.i]; lit.push(col.length ? cardEl[col[col.length - 1].c] : slotEl['t' + m.to.i]); }
    }
    lit.forEach(function (e) { e.classList.add('hint'); });
    hintT = setTimeout(unhint, 2800);
  }
  function unhint() { clearTimeout(hintT); Array.prototype.forEach.call(board.querySelectorAll('.hint'), function (e) { e.classList.remove('hint'); }); }
  function showStuck() { $('stuck').hidden = false; }
  function hideStuck() { $('stuck').hidden = true; }

  // ---------------------------------------------------------------- new games
  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dayNumber(d) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5); }
  function dailySeed(draw) {   // one deal for everyone today; a prime stride so the days don't run through the list in order
    var list = DEALS && DEALS['d' + draw], n = dayNumber(new Date());
    if (!list || !list.length) return 900000 + ((n % 90000) + 90000) % 90000;
    return list[((n * 7919) % list.length + list.length) % list.length];
  }
  function pickSeed(draw) {
    var list = SET.winnable && DEALS ? DEALS['d' + draw] : null;
    if (!list || !list.length) return 1 + Math.floor(Math.random() * 999999);
    for (var tries = 0; tries < 25; tries++) { var s = list[Math.floor(Math.random() * list.length)]; if (ST.recent.indexOf(s) < 0) return s; }
    return list[Math.floor(Math.random() * list.length)];
  }
  function recordLoss() {
    if (!G || !G.started || G.counted || !S || S.won) return;
    ST.played++; ST.streak = 0; G.counted = true;
    save('stats', ST);
  }
  function newGame(mode) {
    gen++; busy = false;   // stop anything still running from the last game
    recordLoss();
    var draw = SET.draw, seed, day = '';
    if (mode === 'again') { seed = S.seed; draw = S.draw; day = G.mode === 'daily' ? G.day : ''; mode = day ? 'daily' : 'deal'; }
    else if (mode === 'daily') { day = today(); seed = dailySeed(draw); }
    else seed = pickSeed(draw);
    S = E.deal(seed, draw);
    G = newG(mode, day);
    ST.recent.push(seed); if (ST.recent.length > 60) ST.recent.shift();
    save('stats', ST);
    closeSheets(); hideStuck(); unhint();
    dealOut();
    persist();
  }
  function dealOut() {   // all the cards start on the deck, then fly out to the columns one by one
    var P = positions();
    board.classList.add('instant');
    for (var c = 0; c < 52; c++) {
      var el = cardEl[c]; clearTimeout(el._zt); el._zt = 0;
      el.style.visibility = '';
      el.style.transform = 'translate3d(' + colX(0) + 'px,' + L.top + 'px,0)'; el.classList.add('down'); el.style.zIndex = 10 + c;
    }
    void board.offsetWidth; board.classList.remove('instant');
    lastP = {};
    if (reduce) { render(true); return; }
    busy = true; bar();
    var my = gen, order = [], row, col;
    for (row = 0; row < 7; row++) for (col = row; col < 7; col++) order.push(S.tab[col][row].c);
    order.forEach(function (c, k) {
      setTimeout(function () {
        if (my !== gen) return;
        var p = P[c], el = cardEl[c];
        el.style.zIndex = 600 + k; el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
        if (k % 2 === 0) sfx('deal');
        if (p.up) setTimeout(function () { if (my === gen) el.classList.remove('down'); }, 200);
      }, 80 + k * 44);
    });
    setTimeout(function () { if (my !== gen) return; busy = false; render(); }, 80 + order.length * 44 + 420);
  }

  // ---------------------------------------------------------------- winning
  function win() {
    busy = false;
    var secs = Math.max(1, Math.round(G.ms / 1000));
    S.score += 100 + Math.round(Math.max(0, 1200 - secs) / 2);   // a win bonus, more for a quick one
    var rec = recordWin(secs);
    persist(); bar();
    sfx('win');
    cascade(function () { showWin(rec); });
  }
  function recordWin(secs) {
    var key = 'd' + S.draw, b = ST.best[key] || (ST.best[key] = {}), badges = [];
    ST.played++; ST.won++; ST.streak++;
    G.counted = true;
    if (ST.won === 1) badges.push('Your first win!');
    if ([10, 25, 50, 100, 250, 500, 1000].indexOf(ST.won) >= 0) badges.push(ST.won + ' games won!');
    if (ST.streak > ST.bestStreak) { ST.bestStreak = ST.streak; if (ST.streak >= 2) badges.push('Your longest winning streak: ' + ST.streak + ' in a row'); }
    else if (ST.streak >= 2) badges.push(ST.streak + ' wins in a row');
    if (b.time == null || secs < b.time) { if (b.time != null) badges.push('Your fastest win yet!'); b.time = secs; }
    if (b.moves == null || S.moves < b.moves) { if (b.moves != null) badges.push('Your fewest moves yet!'); b.moves = S.moves; }
    if (b.score == null || S.score > b.score) { if (b.score != null) badges.push('Your best score yet!'); b.score = S.score; }
    if (!G.undid) badges.push('Won without using Undo');
    if (G.mode === 'daily' && G.day) { ST.daily[G.day] = { won: 1, t: secs, m: S.moves, d: S.draw }; badges.push('Today’s deal: done!'); }
    save('stats', ST);
    return { secs: secs, badges: badges };
  }
  function showWin(rec) {
    $('dWinSub').textContent = 'Deal #' + S.seed + ' · ' + (S.draw === 3 ? 'turning three cards' : 'turning one card') + (G.mode === 'daily' ? ' · today’s deal' : '');
    $('wTime').textContent = clock(rec.secs * 1000); $('wMoves').textContent = S.moves; $('wScore').textContent = S.score;
    $('wBadges').innerHTML = rec.badges.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    $('wDaily').hidden = !!(ST.daily[today()] && ST.daily[today()].won);
    openD('dWin');
  }
  // the classic finish: the cards leap off the piles and bounce away, leaving trails
  var imgCache = {};
  function cardImg(c) {
    var key = c + ':' + L.cw; if (imgCache[key]) return imgCache[key];
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = L.cw, h = L.ch, cv = document.createElement('canvas');
    cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
    var x = cv.getContext('2d'); x.scale(dpr, dpr);
    var r = w * 0.08;
    x.beginPath(); x.moveTo(r, 0.5); x.arcTo(w - 0.5, 0.5, w - 0.5, h - 0.5, r); x.arcTo(w - 0.5, h - 0.5, 0.5, h - 0.5, r); x.arcTo(0.5, h - 0.5, 0.5, 0.5, r); x.arcTo(0.5, 0.5, w - 0.5, 0.5, r); x.closePath();
    x.fillStyle = '#fffdf7'; x.fill(); x.strokeStyle = '#bdb7a6'; x.lineWidth = 1; x.stroke();
    x.fillStyle = E.red(c) ? '#c6152f' : '#17191f';
    x.textBaseline = 'top'; x.textAlign = 'left';
    x.font = '700 ' + Math.round(w * 0.32) + 'px Archivo, Arial, sans-serif'; x.fillText(E.RANK_CH[E.rank(c)], w * 0.05, h * 0.03);
    x.textAlign = 'right'; x.font = Math.round(w * 0.29) + 'px "Segoe UI Symbol", Arial, sans-serif'; x.fillText(SU(c), w * 0.95, h * 0.03);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = Math.round(w * 0.56) + 'px "Segoe UI Symbol", Arial, sans-serif'; x.fillText(SU(c), w / 2, h * 0.64);
    return (imgCache[key] = cv);
  }
  function cascade(done) {
    if (reduce) { done(); return; }
    var cv = $('fx'), tip = $('fxhint'), dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
    cv.hidden = false; cv.classList.add('on'); cv.style.opacity = '1'; cv.style.transition = '';
    cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var br = board.getBoundingClientRect(), k = L.cw / 90, q = [], live = [], ended = false, last = 0, r, f;
    for (r = 13; r >= 1; r--) for (f = 0; f < 4; f++) { var c = S.found[f][r - 1]; if (c != null) q.push({ c: c, f: f }); }
    setTimeout(function () { if (!ended) tip.hidden = false; }, 1200);
    function frame(now) {
      if (ended) return;
      if (q.length && now - last > 230) {
        last = now; var n = q.shift();
        cardEl[n.c].style.visibility = 'hidden';
        live.push({ c: n.c, x: br.left + colX(3 + n.f), y: br.top + L.top, vx: (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 5) * k, vy: -(1 + Math.random() * 7) * k });
      }
      live.forEach(function (p) {
        p.vy += 0.42 * k; p.x += p.vx; p.y += p.vy;
        if (p.y + L.ch > H) { p.y = H - L.ch; p.vy = -p.vy * 0.8; }
        ctx.drawImage(cardImg(p.c), p.x, p.y, L.cw, L.ch);
      });
      live = live.filter(function (p) { return p.x > -L.cw - 4 && p.x < W + 4; });
      if (!q.length && !live.length) { end(); return; }
      requestAnimationFrame(frame);
    }
    function end() {
      if (ended) return; ended = true;
      cv.classList.remove('on'); tip.hidden = true;
      cv.style.transition = 'opacity .45s'; cv.style.opacity = '0';
      setTimeout(function () { cv.hidden = true; ctx.clearRect(0, 0, W, H); for (var i = 0; i < 52; i++) cardEl[i].style.visibility = ''; done(); }, 460);
      document.removeEventListener('keydown', end);
    }
    cv.onclick = end;
    document.addEventListener('keydown', end);
    setTimeout(end, 30000);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- sound: soft, made on the spot, nothing downloaded
  var AC = null, NOISE = null;
  function ac() {
    if (!SET.sound || !gestured) return null;
    try {
      if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); }
      if (AC.state === 'suspended') AC.resume();
    } catch (e) { return null; }
    return AC;
  }
  function tick(freq, dur, gain, q) {
    var a = ac(); if (!a) return;
    try {
      if (!NOISE) { var len = Math.floor(a.sampleRate * 0.3); NOISE = a.createBuffer(1, len, a.sampleRate); var d = NOISE.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
      var t = a.currentTime, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = NOISE; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      s.connect(f); f.connect(g); g.connect(a.destination); s.start(t, Math.random() * 0.2); s.stop(t + dur + 0.03);
    } catch (e) {}
  }
  function tone(freq, dur, gain, when, type) {
    var a = ac(); if (!a) return;
    try {
      var t = a.currentTime + (when || 0), o = a.createOscillator(), g = a.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
    } catch (e) {}
  }
  function sfx(k) {
    if (!SET.sound) return;
    if (k === 'place') tick(1300, 0.07, 0.55, 0.9);
    else if (k === 'flip') tick(2900, 0.05, 0.35, 1.4);
    else if (k === 'deal') tick(2100, 0.045, 0.28, 1.2);
    else if (k === 'shuffle') { for (var i = 0; i < 6; i++) setTimeout(function () { tick(2500, 0.04, 0.22, 1.2); }, i * 32); }
    else if (k === 'found') { tick(1500, 0.05, 0.35, 1); tone(988, 0.16, 0.05, 0.02); tone(1319, 0.24, 0.04, 0.08); }
    else if (k === 'nope') tone(196, 0.13, 0.06, 0, 'triangle');
    else if (k === 'win') [523, 659, 784, 1047, 1319].forEach(function (f, j) { tone(f, 0.38, 0.06, j * 0.1, 'triangle'); });
  }

  // ---------------------------------------------------------------- pop-up sheets
  var openSheet = null, lastFocus = null;
  function openD(id) {
    closeSheets();
    var d = $(id); d.hidden = false; openSheet = d; lastFocus = document.activeElement;
    var f = d.querySelector('.btn.go') || d.querySelector('button'); if (f) f.focus();
  }
  function closeSheets() {
    if (!openSheet) return;
    openSheet.hidden = true; openSheet = null;
    if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) { try { lastFocus.focus(); } catch (e) {} }
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest && t.closest('[data-close]')) { closeSheets(); return; }
    if (t.classList && t.classList.contains('scrim')) closeSheets();
  });
  function openNew() {
    var inPlay = G.started && !S.won, dd = ST.daily[today()];
    $('dNewNote').textContent = inPlay ? 'The game you’re playing will count as not won.' : 'Choose how you’d like to play.';
    $('nDealS').textContent = SET.winnable ? 'A fresh shuffle you can win' : 'A fresh shuffle';
    $('nDailyS').textContent = dd && dd.won ? 'Done today ✔ — play it again if you like' : 'The same deal for everyone today';
    $('nAgainS').textContent = 'Deal #' + S.seed + ', from the beginning';
    syncControls();
    openD('dNew');
  }
  function tile(v, label) { return '<div class="tile"><b>' + esc(v) + '</b><span>' + esc(label) + '</span></div>'; }
  function openStats() {
    var rate = ST.played ? Math.round(100 * ST.won / ST.played) + '%' : '–', days = 0, k;
    for (k in ST.daily) if (ST.daily[k] && ST.daily[k].won) days++;
    $('sTiles').innerHTML = tile(ST.won, 'Games won') + tile(rate, 'Win rate') + tile(ST.played, 'Games played')
      + tile(ST.streak, 'Winning streak') + tile(ST.bestStreak, 'Longest streak') + tile(days, 'Today’s deals done');
    var wk = '', d = new Date(), names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (var i = 6; i >= 0; i--) {
      var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i), key = today(x), won = ST.daily[key] && ST.daily[key].won;
      wk += '<div class="' + (won ? 'won' : '') + (i === 0 ? ' today' : '') + '"><b>' + (won ? '✔' : '•') + '</b>' + names[x.getDay()] + ' ' + x.getDate() + '</div>';
    }
    $('sWeek').innerHTML = wk;
    var dash = function (v, f) { return v == null ? '–' : (f ? f(v) : v); }, sec = function (s) { return clock(s * 1000); };
    var b1 = ST.best.d1 || {}, b3 = ST.best.d3 || {};
    $('sBest').innerHTML = tile(dash(b1.time, sec), 'Fastest win, one card') + tile(dash(b1.moves), 'Fewest moves, one card') + tile(dash(b1.score), 'Best score, one card')
      + (b3.time != null ? tile(dash(b3.time, sec), 'Fastest win, three cards') + tile(dash(b3.moves), 'Fewest moves, three cards') + tile(dash(b3.score), 'Best score, three cards') : '');
    openD('dStats');
  }
  function syncControls() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-draw]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-draw') === SET.draw)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-set]'), function (b) { b.setAttribute('aria-checked', String(!!SET[b.getAttribute('data-set')])); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-felt]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-felt') === SET.felt)); });
    document.body.className = 'felt-' + SET.felt;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-draw],[data-set],[data-felt]') : null; if (!b) return;
    if (b.hasAttribute('data-draw')) SET.draw = +b.getAttribute('data-draw');
    else if (b.hasAttribute('data-set')) { var k = b.getAttribute('data-set'); SET[k] = !SET[k]; if (k === 'timer') bar(); }
    else SET.felt = b.getAttribute('data-felt');
    save('settings', SET); syncControls();
  });

  // ---------------------------------------------------------------- buttons and keys
  $('bNew').onclick = openNew;
  $('bUndo').onclick = undo;
  $('bHint').onclick = hint;
  $('bStats').onclick = openStats;
  $('bSet').onclick = function () { syncControls(); openD('dSet'); };
  $('bHelp').onclick = function () { openD('dHelp'); };
  $('nDeal').onclick = function () { newGame('deal'); };
  $('nDaily').onclick = function () { newGame('daily'); };
  $('nAgain').onclick = function () { newGame('again'); };
  $('wAgain').onclick = function () { newGame('deal'); };
  $('wDaily').onclick = function () { newGame('daily'); };
  $('wStats').onclick = openStats;
  $('stUndo').onclick = undo;
  $('stNew').onclick = openNew;
  $('sReset').onclick = function () { openD('dReset'); };
  $('rYes').onclick = function () { ST = blankStats(); save('stats', ST); G.counted = true; closeSheets(); say('Your scores have been cleared'); };
  function toggleFull() {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {}
  }
  $('bFull').onclick = toggleFull;
  if (!document.fullscreenEnabled) $('bFull').hidden = true;
  document.addEventListener('fullscreenchange', function () { $('bFullL').textContent = document.fullscreenElement ? 'Leave full screen' : 'Full screen'; });
  document.addEventListener('keydown', function (e) {
    gestured = true;
    if (e.key === 'Escape') { if (openSheet) closeSheets(); return; }
    if (openSheet || e.altKey) return;
    var k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); return; }
    if (e.ctrlKey || e.metaKey) return;
    if (k === 'u') undo();
    else if (k === 'h') hint();
    else if (k === 'n') openNew();
    else if (k === 'f') toggleFull();
    else if ((k === ' ' || k === 'd') && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); act({ t: 'draw' }); }
  });

  // ---------------------------------------------------------------- little messages, the clock, saving
  var sayT = 0;
  function say(t) {
    var el = $('toast'); if (!t) return;
    el.textContent = t; el.classList.add('on'); clearTimeout(sayT);
    sayT = setTimeout(function () { el.classList.remove('on'); }, 2300);
  }
  function persist() {
    save('game', { s: S, g: { undo: G.undo.slice(-60), ms: G.ms, mode: G.mode, day: G.day, started: G.started, counted: G.counted, undid: G.undid } });
  }
  var lastTick = Date.now();
  setInterval(function () {
    var now = Date.now(), d = Math.min(2000, now - lastTick); lastTick = now;
    if (!G || !G.started || S.won || document.hidden || openSheet) return;
    G.ms += d;
    $('vTime').textContent = clock(G.ms);
  }, 1000);
  document.addEventListener('visibilitychange', function () { if (document.hidden && S) persist(); });
  window.addEventListener('pagehide', function () { if (S) persist(); });
  var rz = 0;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { layout(); render(true); }, 120); });

  // ---------------------------------------------------------------- start
  slotEl.stock = makeSlot('stock');
  for (var f0 = 0; f0 < 4; f0++) slotEl['f' + f0] = makeSlot('found', 'A');
  for (var t0 = 0; t0 < 7; t0++) slotEl['t' + t0] = makeSlot('tab', 'K');
  for (var c0 = 0; c0 < 52; c0++) { cardEl[c0] = makeCard(c0); board.appendChild(cardEl[c0]); }
  syncControls();
  layout();
  function validSaved(x) {
    if (!x || !x.s || !x.g || x.s.won) return false;
    var s = x.s, n = 0, seen = {};
    try {
      s.stock.concat(s.waste).forEach(function (c) { seen[c] = 1; n++; });
      s.found.forEach(function (f) { f.forEach(function (c) { seen[c] = 1; n++; }); });
      s.tab.forEach(function (col) { col.forEach(function (o) { seen[o.c] = 1; n++; }); });
    } catch (e) { return false; }
    return n === 52 && Object.keys(seen).length === 52 && (s.draw === 1 || s.draw === 3);
  }
  var saved = load('game', null);
  if (validSaved(saved)) {
    S = saved.s; G = newG(saved.g.mode, saved.g.day);
    G.undo = Array.isArray(saved.g.undo) ? saved.g.undo : []; G.ms = +saved.g.ms || 0; G.started = !!saved.g.started; G.counted = !!saved.g.counted; G.undid = +saved.g.undid || 0;
    render(true);
    if (G.started && E.stuck(S)) showStuck();
  } else {
    S = E.deal(1, SET.draw); G = newG('deal', '');   // a placeholder for the first layout; replaced straight away
    newGame('deal');
  }
  if (!SET.seenHelp) { SET.seenHelp = true; save('settings', SET); openD('dHelp'); }
  // read-only, for the tests (and later PC Manager): the game as it stands, and whether an automatic run is going
  window.SOL365 = { get state() { return E.clone(S); }, get busy() { return busy || !!drag; }, get won() { return !!(S && S.won); } };
})();
