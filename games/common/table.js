/* 365 Games - the card table shared by Solitaire, FreeCell and Spider (3 Oct 2026; Solitaire's screen made general).
 * A game page loads its rules (engine.js), its deal list, its layout file (which calls Table365.start(def)) and this.
 * This file does everything a card game looks and feels like: the bar and buttons, real card elements moved with CSS
 * transforms (dealing, 3D flips, flying to the piles), tap-to-move and drag, Undo, Hint, "No more moves", moving cards
 * up by themselves, the automatic finish, the bouncing-cards win, sounds made on the spot, the pop-up sheets, personal
 * scores, Today's deal and saving the game in this browser. Nothing is sent anywhere.
 *
 * The game's def supplies: id, store (localStorage prefix), title, cards (52/104), face(c, S) -> {r, s}, E (rules:
 * deal, clone, legal, apply, smartMove, hint, stuck, optional finishable/finishStep), layout(W, H, S) -> L {cw, ch,
 * slots: [{key, x, y, cls, text}]}, positions(S, L) -> {card: {x, y, z, up, pile}}, where(S, c) -> {p:'stock'} | from |
 * null, picked(S, from), targets(S, from, L, P) -> [{to, x, y}], dealOrder(S), deckPos(L), cascade(S, L) -> [{c, x, y}],
 * hintLights(S, m) -> {cards, slots}, optional: variant, deals(v), daily(v), autoNext(S, keepDown), slotHtml(key, S),
 * winBonus(S, secs), describe(S), help, valid(s), faceKey(S), noTap(from), bestLabel(v).
 * Every timed step checks `gen` (bumped by a new game, or Undo while cards are still moving) and stops if it changed. */
(function () {
  'use strict';

  var SUIT_CH = ['♠', '♥', '♦', '♣'];
  var RANK_CH = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var TXT = '︎';   // keep the suit signs as plain text, never coloured emoji
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
  var RECYCLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/></svg>';
  var ICON = {
    'new': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="11" height="15" rx="2"/><path d="M9 21h9a2 2 0 0 0 2-2V8"/><path d="M9.5 8v5M7 10.5h5"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    hint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.6-2.8 4.3M12 17.6h.01"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>'
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  function start(D) {
    var E = D.E;
    var $ = function (id) { return document.getElementById(id); };
    var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var V = D.variant || null;   // e.g. Solitaire's one or three cards, Spider's suits

    // ------------------------------------------------------------ what this browser remembers (per game)
    function load(k, d) { try { var v = localStorage.getItem(D.store + ':' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
    function save(k, v) { try { localStorage.setItem(D.store + ':' + k, JSON.stringify(v)); } catch (e) {} }
    var SET = { winnable: true, auto: true, sound: true, timer: true, felt: 'green', seenHelp: false };
    if (V) SET[V.key] = V.def;
    (function () { var s = load('settings', null); if (s && typeof s === 'object') for (var k in SET) if (k in s) SET[k] = s[k]; })();
    if (V && !V.options.some(function (o) { return o[0] === SET[V.key]; })) SET[V.key] = V.def;
    function blankStats() { return { v: 1, played: 0, won: 0, streak: 0, bestStreak: 0, best: {}, daily: {}, recent: [] }; }
    var ST = blankStats();
    (function () { var s = load('stats', null); if (s && s.v === 1) for (var k in ST) if (k in s) ST[k] = s[k]; if (!ST.best || typeof ST.best !== 'object') ST.best = {}; })();
    function vKey(v) { return V ? (V.statKey ? V.statKey(v) : 'v' + v) : 'all'; }
    function vOf(s) { return V ? s[V.stateKey || V.key] : 0; }

    var S = null, G = null, busy = false, gen = 0;
    function newG(mode, day) { return { undo: [], ms: 0, mode: mode || 'deal', day: day || '', started: false, counted: false, undid: 0, keepDown: null }; }

    // ------------------------------------------------------------ the page
    buildUI();
    var board = $('board');
    var cardEl = [], slotEl = {}, faceKey = '';
    function makeCard(c) {
      var f = D.face(c, S), r = f.r, su = SUIT_CH[f.s] + TXT, red = f.s === 1 || f.s === 2, el = cardEl[c] || document.createElement('div'), mid;
      el.className = 'card down ' + (red ? 'red' : 'blk') + ' r' + r;
      el.setAttribute('data-c', c);
      el.setAttribute('aria-hidden', 'true');
      if (r === 1) mid = '<div class="ace">' + su + (f.s === 0 ? '<i>365</i>' : '') + '</div>';
      else if (r > 10) mid = '<div class="court">' + COURT[r] + '<b>' + RANK_CH[r] + '</b><em>' + su + '</em></div>';
      else mid = '<div class="pips">' + PIPS[r].map(function (p) {
        return '<span class="pip' + (p[1] > 50 ? ' dn' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%">' + su + '</span>';
      }).join('') + '</div>';
      el.innerHTML = '<div class="wig"><div class="flip"><div class="face front"><span class="idx' + (r === 10 ? ' ten' : '') + '">' + RANK_CH[r]
        + '</span><span class="sui">' + su + '</span>' + mid + '</div><div class="face back"></div></div></div>';
      return el;
    }
    function faces() {   // (re)draw the faces when the game's card set changes (Spider's one, two or four suits)
      var k = D.faceKey ? D.faceKey(S) : 'x';
      if (k === faceKey && cardEl.length) return;
      faceKey = k; imgCache = {};
      for (var c = 0; c < D.cards; c++) { var el = makeCard(c); if (!el.parentNode) board.appendChild(el); cardEl[c] = el; }
    }

    // ------------------------------------------------------------ where everything sits
    var L = { cw: 90, ch: 126, slots: [] };
    function layout() {
      L = D.layout(board.clientWidth, board.clientHeight, S);
      document.documentElement.style.setProperty('--cw', L.cw + 'px');
      document.documentElement.style.setProperty('--ch', L.ch + 'px');
      var seen = {};
      (L.slots || []).forEach(function (s) {
        var el = slotEl[s.key];
        if (!el) { el = slotEl[s.key] = document.createElement('div'); board.insertBefore(el, board.querySelector('.card')); }   // in order, under the cards
        el.className = 'slot ' + (s.cls || ''); el.setAttribute('data-slot', s.key);
        if (s.text != null && !el.getAttribute('data-html')) el.textContent = s.text;
        el.style.transform = 'translate3d(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px,0)';
        el.style.display = '';
        seen[s.key] = 1;
      });
      for (var k in slotEl) if (!seen[k]) slotEl[k].style.display = 'none';
      imgCache = {};
    }
    var lastP = {};
    function render(instant) {
      var P = D.positions(S, L);
      if (instant) board.classList.add('instant');
      for (var c = 0; c < D.cards; c++) {
        var p = P[c], el = cardEl[c], old = lastP[c];
        if (!p) { el.style.display = 'none'; continue; }
        el.style.display = '';
        if (!el.classList.contains('drag')) el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
        el.classList.toggle('down', !p.up);
        el._z = p.z;
        if (!instant && old && old.pile !== p.pile) {   // flying to another pile: on top of everything until it lands
          el.style.zIndex = 2000 + p.z; clearTimeout(el._zt);
          el._zt = setTimeout((function (e) { return function () { e.style.zIndex = e._z; e._zt = 0; }; })(el), 320);
        } else if (!el._zt) el.style.zIndex = p.z;
      }
      lastP = P;
      if (D.slotHtml) for (var k in slotEl) { var h = D.slotHtml(k, S); if (h != null) { slotEl[k].setAttribute('data-html', '1'); if (slotEl[k]._h !== h) { slotEl[k].innerHTML = h; slotEl[k]._h = h; } } }
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

    // ------------------------------------------------------------ touching the cards
    var drag = null, gestured = false;
    board.addEventListener('pointerdown', function (e) {
      gestured = true;
      if (busy || (e.button && e.button > 0) || openSheet) return;
      var hit = e.target.closest ? e.target.closest('.card, .slot') : null; if (!hit) return;
      unhint();
      if (hit.classList.contains('slot')) { if (hit.getAttribute('data-slot') === 'stock') { e.preventDefault(); act({ t: 'draw' }); } return; }
      var c = +hit.getAttribute('data-c'), from = D.where(S, c);
      if (!from) return;
      e.preventDefault();
      if (from.p === 'stock') { act({ t: 'draw' }); return; }
      var cards = D.picked(S, from);
      if (!cards.length) return;
      drag = { from: from, cards: cards, c: c, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false, id: e.pointerId, base: cards.map(function (k) { return lastP[k]; }) };
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
      if (D.noTap && D.noTap(d.from)) return;   // e.g. cards come down from the piles by dragging only
      var m = E.smartMove(S, d.from);
      if (m) act(m);
      else { nope(cardEl[d.c]); sfx('nope'); say('No move for that card yet'); }
    }
    function dropTarget(d) {   // the legal place the dragged card overlaps most
      var b = d.base[0], x = b.x + d.dx, y = b.y + d.dy, best = null, bestA = 0;
      D.targets(S, d.from, L, lastP).forEach(function (t) {
        var ox = Math.min(x + L.cw, t.x + L.cw) - Math.max(x, t.x), oy = Math.min(y + L.ch, t.y + L.ch) - Math.max(y, t.y);
        if (ox <= 0 || oy <= 0 || ox * oy <= bestA) return;
        var m = { t: 'move', from: d.from, to: t.to };
        if (E.legal(S, m)) { best = m; bestA = ox * oy; }
      });
      return best;
    }
    function nope(el) { if (!el) return; el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); setTimeout(function () { el.classList.remove('nope'); }, 360); }
    function pop(c) { var el = cardEl[c]; if (!el) return; setTimeout(function () { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); setTimeout(function () { el.classList.remove('pop'); }, 380); }, 240); }

    // ------------------------------------------------------------ making moves
    function act(m) {
      if (busy || !S || S.won) return;
      var snap = { s: E.clone(S), ms: G.ms };
      var fx = E.apply(S, m);
      if (!fx) { if (fx === null && m.t === 'draw' && D.noDrawSay) say(D.noDrawSay(S)); sfx('nope'); render(); return; }
      G.undo.push(snap); if (G.undo.length > 400) G.undo.shift();
      G.started = true;
      G.keepDown = m.t === 'move' && m.from && m.from.p === 'f' ? fx.cards[0] : null;   // taken down on purpose: not straight back up
      hideStuck(); unhint();
      effects(fx);
      render();
      after();
    }
    function effects(fx) {
      if (fx.t === 'draw') sfx(fx.recycled ? 'shuffle' : (fx.dealt ? 'deal' : 'flip'));
      else if (fx.toFound) { sfx('found'); (fx.popCards || fx.cards).forEach(pop); }
      else sfx('place');
      if (fx.flipped && fx.flipped.length) setTimeout(function () { sfx('flip'); }, 140);
      if (fx.say) say(fx.say);
    }
    function after() {
      if (S.won) return win();
      if (SET.auto && D.autoNext) {
        var m = D.autoNext(S, G.keepDown);
        if (m) {
          busy = true;
          var my = gen;
          setTimeout(function () { if (my !== gen) return; busy = false; var fx = E.apply(S, m); if (fx) { effects(fx); render(); } after(); }, reduce ? 0 : 170);
          return;
        }
      }
      if (E.finishable && E.finishable(S)) { busy = true; say('Finishing it off for you…'); finSteps = 0; var mg = gen; setTimeout(function () { finish(mg); }, reduce ? 0 : 420); return; }
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
      if (busy) { gen++; busy = false; }   // cards still moving by themselves: stop them; the step comes back whole
      var u = G.undo.pop();
      S = u.s; G.undid++; G.keepDown = null;
      hideStuck(); unhint(); sfx('place');
      render(); persist();
    }

    // ------------------------------------------------------------ the hint
    var hintT = 0;
    function hint() {
      if (busy || !S || S.won) return;
      unhint();
      var m = E.hint(S);
      if (!m) { showStuck(); return; }
      var lit = D.hintLights(S, m);
      (lit.cards || []).forEach(function (c) { if (cardEl[c]) cardEl[c].classList.add('hint'); });
      (lit.slots || []).forEach(function (k) { if (slotEl[k]) slotEl[k].classList.add('hint'); });
      if (lit.say) say(lit.say);
      hintT = setTimeout(unhint, 2800);
    }
    function unhint() { clearTimeout(hintT); Array.prototype.forEach.call(board.querySelectorAll('.hint'), function (e) { e.classList.remove('hint'); }); }
    function showStuck() { $('stuck').hidden = false; }
    function hideStuck() { $('stuck').hidden = true; }

    // ------------------------------------------------------------ new games
    function today(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function dayNumber(d) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5); }
    function dailySeed(v) {   // one deal for everyone today; a prime stride so the days don't run through the list in order
      var list = D.deals ? D.deals(v) : null, n = dayNumber(new Date());
      if (!list || !list.length) return 900000 + ((n % 90000) + 90000) % 90000;
      return list[((n * 7919) % list.length + list.length) % list.length];
    }
    function pickSeed(v) {
      var list = SET.winnable && D.deals ? D.deals(v) : null;
      if (!list || !list.length) return D.anySeed ? D.anySeed(v) : 1 + Math.floor(Math.random() * 999999);
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
      var v = V ? SET[V.key] : 0, seed, day = '';
      if (mode === 'again') { seed = S.seed; v = vOf(S); day = G.mode === 'daily' ? G.day : ''; mode = day ? 'daily' : 'deal'; }
      else if (mode === 'daily') { day = today(); seed = dailySeed(v); }
      else seed = pickSeed(v);
      S = E.deal(seed, v);
      G = newG(mode, day);
      ST.recent.push(seed); if (ST.recent.length > 60) ST.recent.shift();
      save('stats', ST);
      closeSheets(); hideStuck(); unhint();
      faces(); layout();
      dealOut();
      persist();
    }
    function dealOut() {   // every card starts on the deck, then they fly out one by one
      var P = D.positions(S, L), deck = D.deckPos(L), c;
      board.classList.add('instant');
      for (c = 0; c < D.cards; c++) {
        var el = cardEl[c]; clearTimeout(el._zt); el._zt = 0;
        el.style.visibility = ''; el.style.display = P[c] ? '' : 'none';
        el.style.transform = 'translate3d(' + deck.x + 'px,' + deck.y + 'px,0)'; el.classList.add('down'); el.style.zIndex = 10 + c;
      }
      void board.offsetWidth; board.classList.remove('instant');
      lastP = {};
      if (reduce) { render(true); return; }
      busy = true; bar();
      var my = gen, order = D.dealOrder(S), step = order.length > 60 ? 26 : 44;
      order.forEach(function (c, k) {
        setTimeout(function () {
          if (my !== gen) return;
          var p = P[c], el = cardEl[c];
          el.style.zIndex = 600 + k; el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
          if (k % 2 === 0) sfx('deal');
          if (p.up) setTimeout(function () { if (my === gen) el.classList.remove('down'); }, 200);
        }, 80 + k * step);
      });
      setTimeout(function () { if (my !== gen) return; busy = false; render(); }, 80 + order.length * step + 420);
    }

    // ------------------------------------------------------------ winning
    function win() {
      busy = false;
      var secs = Math.max(1, Math.round(G.ms / 1000));
      S.score += D.winBonus ? D.winBonus(S, secs) : 100 + Math.round(Math.max(0, 1200 - secs) / 2);   // more for a quick one
      var rec = recordWin(secs);
      persist(); bar();
      sfx('win');
      cascade(function () { showWin(rec); });
    }
    function recordWin(secs) {
      var key = vKey(vOf(S)), b = ST.best[key] || (ST.best[key] = {}), badges = [];
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
      if (G.mode === 'daily' && G.day) { ST.daily[G.day] = { won: 1, t: secs, m: S.moves, d: vOf(S) }; badges.push('Today’s deal: done!'); }
      save('stats', ST);
      return { secs: secs, badges: badges };
    }
    function showWin(rec) {
      $('dWinSub').textContent = 'Deal #' + S.seed + (D.describe ? ' · ' + D.describe(S) : '') + (G.mode === 'daily' ? ' · today’s deal' : '');
      $('wTime').textContent = clock(rec.secs * 1000); $('wMoves').textContent = S.moves; $('wScore').textContent = S.score;
      $('wBadges').innerHTML = rec.badges.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
      $('wDaily').hidden = !!(ST.daily[today()] && ST.daily[today()].won);
      openD('dWin');
    }
    // the classic finish: the cards leap off the piles and bounce away, leaving trails
    var imgCache = {};
    function cardImg(c) {
      var key = c + ':' + L.cw + ':' + faceKey; if (imgCache[key]) return imgCache[key];
      var f = D.face(c, S), dpr = Math.min(2, window.devicePixelRatio || 1), w = L.cw, h = L.ch, cv = document.createElement('canvas');
      cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
      var x = cv.getContext('2d'); x.scale(dpr, dpr);
      var r = w * 0.08, su = SUIT_CH[f.s] + TXT;
      x.beginPath(); x.moveTo(r, 0.5); x.arcTo(w - 0.5, 0.5, w - 0.5, h - 0.5, r); x.arcTo(w - 0.5, h - 0.5, 0.5, h - 0.5, r); x.arcTo(0.5, h - 0.5, 0.5, 0.5, r); x.arcTo(0.5, 0.5, w - 0.5, 0.5, r); x.closePath();
      x.fillStyle = '#fffdf7'; x.fill(); x.strokeStyle = '#bdb7a6'; x.lineWidth = 1; x.stroke();
      x.fillStyle = (f.s === 1 || f.s === 2) ? '#c6152f' : '#17191f';
      x.textBaseline = 'top'; x.textAlign = 'left';
      x.font = '700 ' + Math.round(w * 0.32) + 'px Archivo, Arial, sans-serif'; x.fillText(RANK_CH[f.r], w * 0.05, h * 0.03);
      x.textAlign = 'right'; x.font = Math.round(w * 0.29) + 'px "Segoe UI Symbol", Arial, sans-serif'; x.fillText(su, w * 0.95, h * 0.03);
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = Math.round(w * 0.56) + 'px "Segoe UI Symbol", Arial, sans-serif'; x.fillText(su, w / 2, h * 0.64);
      return (imgCache[key] = cv);
    }
    function cascade(done) {
      if (reduce) { done(); return; }
      var cv = $('fx'), tip = $('fxhint'), dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
      cv.hidden = false; cv.classList.add('on'); cv.style.opacity = '1'; cv.style.transition = '';
      cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var br = board.getBoundingClientRect(), k = L.cw / 90, q = D.cascade(S, L).slice(), live = [], ended = false, last = 0;
      var every = q.length > 60 ? 115 : 230;   // Spider's 104 cards leave twice as fast
      setTimeout(function () { if (!ended) tip.hidden = false; }, 1200);
      function frame(now) {
        if (ended) return;
        if (q.length && now - last > every) {
          last = now; var n = q.shift();
          if (cardEl[n.c]) cardEl[n.c].style.visibility = 'hidden';
          live.push({ c: n.c, x: br.left + n.x, y: br.top + n.y, vx: (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 5) * k, vy: -(1 + Math.random() * 7) * k });
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
        setTimeout(function () { cv.hidden = true; ctx.clearRect(0, 0, W, H); for (var i = 0; i < D.cards; i++) cardEl[i].style.visibility = ''; done(); }, 460);
        document.removeEventListener('keydown', end);
      }
      cv.onclick = end;
      document.addEventListener('keydown', end);
      setTimeout(end, 30000);
      requestAnimationFrame(frame);
    }

    // ------------------------------------------------------------ sound: soft, made on the spot, nothing downloaded
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

    // ------------------------------------------------------------ pop-up sheets
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
      $('nDealS').textContent = SET.winnable && D.deals ? 'A fresh shuffle you can win' : 'A fresh shuffle';
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
      var dash = function (v, f) { return v == null ? '–' : (f ? f(v) : v); }, sec = function (s) { return clock(s * 1000); }, out = '';
      var opts = V ? V.options : [[0, '']];
      opts.forEach(function (o, n) {
        var b = ST.best[vKey(o[0])] || {}, lab = V ? ', ' + (V.bestLabel ? V.bestLabel(o[0]) : o[1].toLowerCase()) : '';
        if (n > 0 && b.time == null) return;   // the other options only once they have a win
        out += tile(dash(b.time, sec), 'Fastest win' + lab) + tile(dash(b.moves), 'Fewest moves' + lab) + tile(dash(b.score), 'Best score' + lab);
      });
      $('sBest').innerHTML = out;
      openD('dStats');
    }
    function syncControls() {
      if (V) Array.prototype.forEach.call(document.querySelectorAll('[data-var]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-var') === SET[V.key])); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-set]'), function (b) { b.setAttribute('aria-checked', String(!!SET[b.getAttribute('data-set')])); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-felt]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-felt') === SET.felt)); });
      document.body.className = 'felt-' + SET.felt;
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-var],[data-set],[data-felt]') : null; if (!b) return;
      if (b.hasAttribute('data-var')) SET[V.key] = +b.getAttribute('data-var');
      else if (b.hasAttribute('data-set')) { var k = b.getAttribute('data-set'); SET[k] = !SET[k]; if (k === 'timer') bar(); }
      else SET.felt = b.getAttribute('data-felt');
      save('settings', SET); syncControls();
    });

    // ------------------------------------------------------------ buttons and keys
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
    function toggleFull() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {} }
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
      else if ((k === ' ' || k === 'd') && D.hasStock && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); act({ t: 'draw' }); }
    });

    // ------------------------------------------------------------ little messages, the clock, saving
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

    // ------------------------------------------------------------ start
    syncControls();
    var saved = load('game', null);
    if (saved && saved.s && saved.g && !saved.s.won && D.valid(saved.s)) {
      S = saved.s; G = newG(saved.g.mode, saved.g.day);
      G.undo = Array.isArray(saved.g.undo) ? saved.g.undo : []; G.ms = +saved.g.ms || 0; G.started = !!saved.g.started; G.counted = !!saved.g.counted; G.undid = +saved.g.undid || 0;
      faces(); layout(); render(true);
      if (G.started && E.stuck(S)) showStuck();
    } else {
      S = E.deal(1, V ? SET[V.key] : 0); G = newG('deal', '');   // a placeholder for the first layout; replaced straight away
      faces(); layout();
      newGame('deal');
    }
    if (!SET.seenHelp) { SET.seenHelp = true; save('settings', SET); openD('dHelp'); }
    // read-only, for the tests (and later PC Manager): the game as it stands, and whether an automatic run is going
    var hook = { get state() { return E.clone(S); }, get busy() { return busy || !!drag; }, get won() { return !!(S && S.won); } };
    window.GAME365 = hook;
    if (D.id === 'solitaire') window.SOL365 = hook;

    // ------------------------------------------------------------ the page's bar, table and sheets
    function buildUI() {
      var v = V ? V.options.map(function (o) { return '<button type="button" data-var="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('') : '';
      var vNew = V ? V.options.map(function (o) { return '<button type="button" data-var="' + o[0] + '">' + esc(V.newLabel ? V.newLabel(o[0]) : o[1]) + '</button>'; }).join('') : '';
      var tb = function (id, icon, label, title, cls) { return '<button class="tb' + (cls ? ' ' + cls : '') + '" id="' + id + '" type="button" title="' + esc(title) + '">' + ICON[icon] + '<span class="lbl"' + (id === 'bFull' ? ' id="bFullL"' : '') + '>' + esc(label) + '</span></button>'; };
      var html = '<div id="app"><header class="bar"><div class="brand"><b>365</b><span>' + esc(D.title) + '</span></div>'
        + '<div class="info" aria-live="off"><div class="chip" id="chipTime"><small>Time</small><span id="vTime">0:00</span></div><div class="chip"><small>Moves</small><span id="vMoves">0</span></div><div class="chip"><small>Score</small><span id="vScore">0</span></div></div>'
        + '<nav class="tools" aria-label="Game">' + tb('bNew', 'new', 'New game', 'New game (N)', 'main') + tb('bUndo', 'undo', 'Undo', 'Undo (U or Ctrl+Z)') + tb('bHint', 'hint', 'Hint', 'Show me a move (H)')
        + tb('bStats', 'stats', 'My scores', 'My scores') + tb('bSet', 'set', 'Settings', 'Settings') + tb('bHelp', 'help', 'How to play', 'How to play') + tb('bFull', 'full', 'Full screen', 'Full screen (F)') + '</nav></header>'
        + '<main id="board" aria-label="The card table"></main></div>'
        + '<div id="stuck" hidden role="status"><span>' + esc(D.stuckText || 'No more moves found.') + '</span><button class="btn" type="button" id="stUndo">Undo</button><button class="btn go" type="button" id="stNew">New game</button></div>'
        + '<div id="toast" role="status" aria-live="polite"></div><canvas id="fx" hidden></canvas><div id="fxhint" hidden>Tap anywhere to carry on</div>'
        + sheet('dNew', 'New game', '<p class="soft" id="dNewNote"></p>' + (V ? '<div class="seg" role="group" aria-label="' + esc(V.label) + '">' + vNew + '</div>' : '')
          + '<div class="choice"><button class="btn go" type="button" id="nDeal">New deal<small id="nDealS">A fresh shuffle</small></button>'
          + '<button class="btn" type="button" id="nDaily">Today&rsquo;s deal<small id="nDailyS">The same deal for everyone today</small></button>'
          + '<button class="btn" type="button" id="nAgain">Play this deal again<small id="nAgainS">Start the same cards from the beginning</small></button></div>'
          + '<div class="row"><button class="btn wide" type="button" data-close>Keep playing</button></div>')
        + sheet('dWin', 'You won!', '<p class="soft" id="dWinSub"></p><div class="tiles"><div class="tile"><b id="wTime">0:00</b><span>Time</span></div><div class="tile"><b id="wMoves">0</b><span>Moves</span></div><div class="tile"><b id="wScore">0</b><span>Score</span></div></div>'
          + '<ul class="badges" id="wBadges"></ul><div class="row"><button class="btn go wide" type="button" id="wAgain">Play again</button><button class="btn wide" type="button" id="wDaily">Today&rsquo;s deal</button><button class="btn wide" type="button" id="wStats">My scores</button></div>')
        + sheet('dStats', 'My scores', '<p class="soft">Kept on this computer only &mdash; nothing is sent anywhere.</p><div class="tiles" id="sTiles"></div><h3 style="margin:16px 0 0;font-size:18px">Today&rsquo;s deal this week</h3><div class="week" id="sWeek"></div><div class="tiles" id="sBest"></div>'
          + '<div class="row"><button class="btn go wide" type="button" data-close>Close</button><button class="btn" type="button" id="sReset">Clear my scores</button></div>')
        + sheet('dSet', 'Settings', (V ? '<div class="set"><div><label>' + esc(V.label) + '</label><small>' + esc(V.small || 'Changes from your next game.') + '</small></div><div class="seg" role="group" aria-label="' + esc(V.label) + '">' + v + '</div></div>' : '')
          + (D.deals ? sw('winnable', 'Deals you can always win', D.winnableSmall || 'Every deal has been played through to a win.') : '')
          + (D.autoNext ? sw('auto', 'Move cards up to the piles for me', 'When it&rsquo;s plainly safe to.') : '')
          + sw('sound', 'Sounds', 'Soft clicks as the cards move.') + sw('timer', 'Show the clock', 'It still keeps your best time.')
          + '<div class="set"><div><label>Table colour</label></div><div class="felts" role="group" aria-label="Table colour"><button type="button" data-felt="green" style="background:#1f7a45" aria-label="Green"></button><button type="button" data-felt="blue" style="background:#1f5f9c" aria-label="Blue"></button><button type="button" data-felt="red" style="background:#8e2537" aria-label="Red"></button><button type="button" data-felt="slate" style="background:#45526a" aria-label="Grey"></button></div></div>'
          + '<p class="foot">' + esc(D.title) + ' is made by <a href="https://365techies.co.uk/" target="_blank" rel="noopener">365 Techies</a> in Bournemouth. No adverts, no sign-in, nothing to install. Computer playing up? Ring us on <b>01202 775566</b>.</p>'
          + '<div class="row"><button class="btn go wide" type="button" data-close>Done</button></div>')
        + sheet('dHelp', 'How to play', '<ol class="how">' + (D.help || []).map(function (h) { return '<li>' + h + '</li>'; }).join('') + '</ol>'
          + '<p class="soft">Keys, if you like them: N new game, U undo, H hint' + (D.hasStock ? ', space turns the deck' : '') + ', F full screen.</p><div class="row"><button class="btn go wide" type="button" data-close>Let&rsquo;s play</button></div>')
        + sheet('dReset', 'Clear my scores?', '<p>Your games won, streaks and best times for ' + esc(D.title) + ' on this computer go back to nothing. This can&rsquo;t be undone.</p><div class="row"><button class="btn wide" type="button" data-close>Keep them</button><button class="btn go wide" type="button" id="rYes" style="background:#a3242f;border-color:#a3242f">Clear them</button></div>');
      var holder = document.createElement('div'); holder.innerHTML = html;
      var frag = document.createDocumentFragment();
      while (holder.firstChild) frag.appendChild(holder.firstChild);
      document.body.insertBefore(frag, document.body.firstChild);   // the page first, in order; the scripts stay after it
    }
    function sheet(id, title, body) { return '<div class="scrim" id="' + id + '" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="' + id + 'H"><h2 id="' + id + 'H">' + esc(title) + '</h2>' + body + '</div></div>'; }
    function sw(key, label, small) { return '<div class="set"><div><label id="l_' + key + '">' + label + '</label><small>' + small + '</small></div><button class="sw" type="button" role="switch" aria-labelledby="l_' + key + '" data-set="' + key + '"></button></div>'; }
  }

  window.Table365 = { start: start, RECYCLE: RECYCLE };
})();
