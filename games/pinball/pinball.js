/* 365 Pinball Hero - the game on the page (15 Oct 2026, milestone 1; 16 Oct 2026, the next-gen fast track: EMBER PEAK,
 * the arcade camera and slow motion): it puts the pinball table into the shared arcade cabinet (../common/arcade.js -
 * the bar, the sheets, the 60 Hz loop, Pause, scores, the Hall of Fame and phone full screen), with the words for the
 * title card and How to play, and the flipper controls the cabinet doesn't have.
 * The rules and physics are engine.js (window.PinEngine), which plays Ember Peak (tables/ember.js) when that file is
 * on the page and the old space table (table.js) otherwise; the flat picture is flat.js (window.PinFlat) and the
 * sounds sound.js (window.PinSound). The game is 270 x 480 game pixels: exactly 9:16, so a
 * 1080 x 1920 Short is a clean four times.
 *
 * Controls on top of the cabinet's own (arrows / A D flip, Space or Down pulls the plunger, Up or W nudges):
 *  - keys: Z and Left Shift work the left flipper; M, / and Right Shift the right one (pinball players' usual keys).
 *  - touch and mouse: while a ball is in play, the cabinet would treat a press on the screen as Fire. Pinball wants two
 *    flippers instead, so a press on the left half of the game screen works the left flipper and the right half the
 *    right one - several fingers at once. While the ball waits in the shooter lane, a press also pulls the plunger and
 *    letting go fires it. Full screen on a phone: a press anywhere counts, by which side of the middle it is.
 * Everything held is let go when the game pauses, the window loses focus or the page is hidden, so a flipper can never
 * stick up. Presses on buttons, links and the title / pause / game-over cards go to the cabinet as before.
 * A button works EVERY flipper on its side (a table may have more than one pair; Ember Peak, one screen since 29 Oct 2026, has one).
 *
 * THE CAMERA (camera.js, window.PinCam; 16 Oct 2026): the 3D picture (world3d.js) asks PinCam.update(W, t, mode) for its
 * shot every frame. This file passes the 3D canvas's real shape (the camera's guarantee depends on it), sets the mode
 * from Settings (Camera: Calm - the default, about six push-ins a minute - Arcade or Classic; Classic when the
 * device asks for reduced motion), keeps the last shot, and on the title screen puts the attract mode's flythroughs
 * (demo.js, PinDemo.shot) in place of the director's chase. SLOW MOTION: the cabinet steps the game 60 times a second;
 * while the camera's shot has timeScale < 1 the game is stepped proportionally less (the fractions add up, so 0.35 is
 * about one step in three) - the engine still sees every step exactly as it would at full speed, so the game stays
 * deterministic, and quick taps stay latched until a step sees them. Only in the 3D look and only in play. Any of
 * camera.js, particles.js and post.js missing: the 3D picture uses its own home framing and the game plays the same. */
(function () {
  'use strict';
  var E = window.PinEngine, A = window.Arcade365;
  if (!E || !A) return;
  var PTS = E.PTS, fmt = E.fmt, SP = E.SPEEDS;

  // ---------------------------------------------------------------- what the flippers and plunger are being held by
  var held = {};               // pointerId -> { side: -1 | 1, pull: true if this press is also pulling the plunger }
  var keysL = {}, keysR = {};  // the flipper keys held down, by e.code
  var stageEl = null, screenEl = null;
  function A3() { return window.ARCADE365 || null; }
  function any(o) { for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) return true; return false; }
  // the engine reads input.pl / input.pr (flippers) and input.pp (the plunger) as well as the cabinet's own keys
  function apply() {
    var a = A3(); if (!a) return;
    var l = any(keysL), r = any(keysR), pp = false;
    for (var id in held) {
      if (!Object.prototype.hasOwnProperty.call(held, id)) continue;
      if (held[id].side < 0) l = true; else r = true;
      if (held[id].pull) pp = true;
    }
    a.input.pl = l; a.input.pr = r; a.input.pp = pp;
  }
  function letGo() {
    if (!any(held) && !any(keysL) && !any(keysR)) { var a = A3(); if (a && (a.input.pl || a.input.pr || a.input.pp)) apply(); return; }
    held = {}; keysL = {}; keysR = {}; apply();
  }

  // which side of the screen a press is on: left of the game screen's middle = the left flipper
  function sideOf(clientX, rect) { return clientX < rect.left + rect.width / 2 ? -1 : 1; }
  // the table a world is playing (Ember Peak, or the old space table)
  function tableOf(W) { return E.table ? E.table(W && W.tableId).T : E.TABLE; }
  // the player's ball is sitting in the shooter lane, waiting to be launched (and no other ball is in play)
  function waiting(W) {
    if (!W || W.over || W.state !== 'play' || !W.balls || W.balls.length !== 1) return false;
    var T = tableOf(W), b = W.balls[0], SH = T.shooter;
    if (!SH) return false;
    return b.m === 'free' && b.x > SH.x0 && b.y > SH.tip - T.BALL - 8 && Math.abs(b.vx) + Math.abs(b.vy) < 60;
  }

  // the cabinet only makes sounds after the player has pressed something (a browser rule) and it notes that on its own
  // key and screen presses. The presses below never reach it, so the first one tells it with a key it ignores.
  var told = false;
  function gesture() {
    if (told) return; told = true;
    try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Unidentified', bubbles: true })); } catch (e) {}
  }

  // ---------------------------------------------------------------- touch and mouse
  function onDown(e) {
    var a = A3();
    if (!a || a.mode !== 'play') return;   // the title, pause and game-over cards: the cabinet's (Play, Carry on)
    var t = e.target;
    if (t && t.closest && t.closest('button, a, input, select, textarea, .ov')) return;   // the pad's buttons, links, cards
    var r = screenEl.getBoundingClientRect();
    var onScreen = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!onScreen && !a.immersive) return;   // beside the game screen on the page: nothing, as before
    e.preventDefault(); e.stopImmediatePropagation();   // ours: the cabinet would take it as Fire
    gesture();
    // the first press while the ball waits is the plunger's too, and letting that finger go fires (a second finger
    // meanwhile is a flipper only)
    var pulling = false;
    for (var id in held) if (Object.prototype.hasOwnProperty.call(held, id) && held[id].pull) pulling = true;
    var h = held[e.pointerId] = { side: sideOf(e.clientX, r), pull: !pulling && waiting(active(a.world)), y0: e.clientY, t0: performance.now(), touch: e.pointerType !== 'mouse', sw: false };
    try { stageEl.setPointerCapture(e.pointerId); } catch (er) {}
    apply();
    // a press can be over before the game's next step (a very quick tap): latched until the game has seen it
    if (h.pull) a.input.ppTap = true;
    if (h.side < 0) a.input.plTap = true; else a.input.prTap = true;
  }
  // a finger swiped up fast (40 CSS px in a third of a second) is a nudge, once a press; its flipper rising is harmless
  function onMove(e) {
    var h = held[e.pointerId];
    if (!h || !h.touch || h.sw || performance.now() - h.t0 > 340 || h.y0 - e.clientY < 40) return;
    h.sw = true; nudgeTap();
  }
  function onUp(e) {
    if (!Object.prototype.hasOwnProperty.call(held, e.pointerId)) return;
    if (e.type === 'lostpointercapture' && e.target !== stageEl) return;   // (only the stage's own capture ending counts)
    delete held[e.pointerId];
    apply();   // (a press that was pulling the plunger: letting go fires the ball)
  }

  // ---------------------------------------------------------------- the extra flipper keys
  function keySide(e) {
    if (e.code === 'ShiftLeft') return -1;
    if (e.code === 'ShiftRight') return 1;
    var k = (e.key || '').toLowerCase();
    if (k === 'z') return -1;
    if (k === 'm' || k === '/') return 1;
    return 0;
  }
  function busy(e) {   // the same checks the cabinet makes: typing initials or feedback, or a sheet open on top
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return true;
    if ((window.GameSocial && GameSocial.isOpen()) || (window.HallOfFame && HallOfFame.isOpen()) || (window.Looks && Looks.isOpen()) || (window.Keep && Keep.isOpen())) return true;
    var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return true;
    return [].some.call(document.querySelectorAll('[aria-modal="true"]'), function (d) { return d.getClientRects().length > 0; });
  }
  document.addEventListener('keydown', function (e) {
    var s = keySide(e), a = A3();
    if (!s || !a || a.mode !== 'play' || busy(e)) return;
    (s < 0 ? keysL : keysR)[e.code || e.key] = true;
    apply(); e.preventDefault();   // (and / never opens the browser's quick find)
  });
  // the nudge (wave 3, 5 Nov 2026): every press of Up or W is counted, so 3 short taps between two steps are 3 nudges
  // (the engine's input.upTap; the engine itself takes at most 3 a step). A swipe up on a touch screen counts as one.
  var upTaps = 0;
  function nudgeTap() { var a = A3(); if (a && a.mode === 'play' && !(PICK && !PICK.hidden)) upTaps++; }
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if ((k === 'arrowup' || k === 'w') && !e.repeat && !busy(e)) nudgeTap();
  }, true);
  document.addEventListener('keyup', function (e) {
    if (!keySide(e)) return;
    var c = e.code || e.key;
    if (keysL[c] || keysR[c]) { delete keysL[c]; delete keysR[c]; apply(); }
  });
  window.addEventListener('blur', letGo);
  document.addEventListener('visibilitychange', function () { if (document.hidden) letGo(); });

  // ---------------------------------------------------------------- the 3D look (world3d.js, window.Pin3D; milestone 2a)
  // The 3D table is a WebGL canvas in #screenwrap, BEHIND the game screen; the game screen (the cabinet's hires drawing,
  // full sharpness) is cleared and keeps only the dot-matrix display - the flat look's top 34 rows, drawn crisp. Settings
  // 'Look' (3D / Flat, 3D first) and the R key switch it at once. No WebGL2, world3d.js not arriving, or the graphics
  // card giving up: the flat look, as before.
  var STRIP = 34, COARSE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  var G3 = { world: null, failed: !gl2(), cv: null, cssW: 0, cssH: 0, deadline: 0, set: null, ms: [], shot: null, shotT: 0, aspect: 0, slow: 0, skipped: 0, force: null };
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function gl2() {
    try { var c = document.createElement('canvas'), x = c.getContext('webgl2'); if (!x) return false; var l = x.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); return true; } catch (e) { return false; }
  }
  var flatCv = document.createElement('canvas'); flatCv.width = 270; flatCv.height = 480;
  var flatG = flatCv.getContext('2d'), midCv = document.createElement('canvas'), midG = midCv.getContext('2d');
  (function () {
    var st = document.createElement('style');
    st.textContent = '.pin3dgl{position:absolute;left:0;top:0;z-index:0;display:block;pointer-events:none;background:#07060c;border-radius:0 0 6px 6px}'
      + 'body.pin3d #screen{position:relative;z-index:1;background:transparent}';
    document.head.appendChild(st);
  })();
  function want3d(set) { return !G3.failed && !(set && set.look === 'flat'); }
  function fail3d(why) {
    if (G3.failed) return; G3.failed = true;
    if (window.console) console.info('365 Pinball Hero: the flat look (' + why + ')');
    if (G3.world) { try { G3.world.dispose(); } catch (e) {} G3.world = null; }
    if (G3.cv && G3.cv.parentNode) G3.cv.parentNode.removeChild(G3.cv);
    document.body.classList.remove('pin3d');
  }
  function hide3d() { if (G3.cv && G3.cv.style.display !== 'none') { G3.cv.style.display = 'none'; document.body.classList.remove('pin3d'); } }
  function world3d() {   // made the first time it's wanted; null while world3d.js is still on its way
    if (G3.world || G3.failed) return G3.world;
    if (!window.Pin3D || typeof Pin3D.create !== 'function') {
      var now = performance.now();
      if (!G3.deadline) G3.deadline = now + 15000;
      if (document.readyState === 'complete') G3.deadline = Math.min(G3.deadline, now + 6000);
      if (now > G3.deadline) fail3d('world3d.js did not arrive');
      return null;
    }
    try {
      var cv = G3.cv = document.createElement('canvas'); cv.className = 'pin3dgl'; cv.setAttribute('aria-hidden', 'true');
      cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fail3d('the graphics card reset'); });
      var wrap = document.getElementById('screenwrap'); wrap.insertBefore(cv, wrap.firstChild);
      // phones: at most 2 screen pixels a CSS pixel, and the ball's reflection every other frame, small
      G3.world = Pin3D.create({ canvas: cv, width: 270, height: 446, pixelRatio: Math.min(2, window.devicePixelRatio || 1), reflectEvery: COARSE ? 2 : 1, reflectSize: COARSE ? 64 : 128 });
    } catch (e) { fail3d((e && e.message) || 'no WebGL'); }
    return G3.world;
  }
  function flatFrame(W, t, mode, info, dmdOnly) {   // the flat look's whole frame (or just its display), at its own size, off screen
    flatG.setTransform(1, 0, 0, 1, 0, 0); flatG.save();
    if (dmdOnly && window.PinFlat && typeof PinFlat.dmd === 'function') PinFlat.dmd(flatG, W, t, mode, { best: info.best, set: info.set });
    else if (window.PinFlat && typeof PinFlat.draw === 'function') PinFlat.draw(flatG, W, t, mode, { best: info.best, set: info.set });
    else { flatG.fillStyle = '#000'; flatG.fillRect(0, 0, 270, 480); }
    flatG.restore();
  }

  // ---------------------------------------------------------------- the camera director (camera.js, window.PinCam)
  // world3d.js calls PinCam.update(W, t, mode) once a frame. Wrapped here (once, the first frame PinCam is there) so the
  // camera always knows the 3D canvas's real shape, the page keeps the shot it gave (its slow motion), and the attract
  // mode's flythroughs replace the director's chase while they run. The camera's own state is updated either way.
  function camHook() {
    var C = window.PinCam;
    if (!C || typeof C.update !== 'function') return null;
    if (!C.update.pinPage) {
      var inner = C.update;
      var f = function (W, t, mode, aspect) {
        var s = inner.call(C, W, t, mode, aspect || G3.aspect || undefined);
        if (mode === 'title' && window.PinDemo && typeof PinDemo.shot === 'function') {
          try { var fly = PinDemo.shot(t, aspect || G3.aspect); if (fly) s = fly; } catch (e) {}
        }
        G3.shot = s; G3.shotT = performance.now();
        return s;
      };
      f.pinPage = true; C.update = f;
    }
    if (typeof C.setMode === 'function') C.setMode(camMode(G3.set));
    return C;
  }
  function camMode(set) { var m = set && set.cam; return m === 'arcade' || m === 'classic' || m === 'calm' ? m : (REDUCED ? 'classic' : 'calm'); }
  // the camera's slow motion, for the game's steps: 1 unless the 3D look is showing and its last shot (fresh) asks for less
  function timeScale(mode) {
    if (mode === 'play' && G3.force != null) return G3.force;   // (the tests' own slow motion: PinSlow.force)
    if (mode !== 'play' || !G3.world || G3.failed || !document.body.classList.contains('pin3d')) return 1;
    var s = G3.shot, ts = s && typeof s.timeScale === 'number' && isFinite(s.timeScale) ? s.timeScale : 1;
    if (performance.now() - G3.shotT > 250) return 1;   // (no fresh shot: the picture isn't being drawn)
    return ts < 0.15 ? 0.15 : ts > 1 ? 1 : ts;
  }
  function crisp(g, rows, dw, dh) {   // the flat frame's top rows onto the screen: square pixels, no column thinner than the next
    var dev = dw / 270;
    g.imageSmoothingEnabled = false;
    if (Math.abs(dev - Math.round(dev)) < 0.02 || dev < 1) { g.drawImage(flatCv, 0, 0, 270, rows, 0, 0, dw, dh); return; }
    var k = Math.ceil(dev);
    if (midCv.width !== 270 * k || midCv.height !== rows * k) { midCv.width = 270 * k; midCv.height = rows * k; }
    midG.imageSmoothingEnabled = false; midG.drawImage(flatCv, 0, 0, 270, rows, 0, 0, midCv.width, midCv.height);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(midCv, 0, 0, dw, dh);
  }
  function draw3d(g, W, t, mode, info) {   // (the cabinet's hires drawing: g is the screen itself, info.dw x info.dh)
    var wd = world3d(), dw = info.dw, dh = info.dh;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    if (!wd && G3.failed) { flatFrame(W, t, mode, info); crisp(g, 480, dw, dh); return; }   // (it just gave up: this frame flat, the cabinet's own from the next)
    flatFrame(W, t, mode, info, true);   // the display only (the 3D table is under it)
    if (!wd) {
      g.fillStyle = '#07060c'; g.fillRect(0, 0, dw, dh);   // still on its way: the display over a dark table
    } else {
      var sc = screenEl || document.getElementById('screen'), cssW = parseFloat(sc.style.width) || sc.clientWidth, cssH = parseFloat(sc.style.height) || sc.clientHeight;
      if (cssW !== G3.cssW || cssH !== G3.cssH) {
        var top = Math.floor(cssH * STRIP / 480);
        G3.cssW = cssW; G3.cssH = cssH; G3.cv.style.top = top + 'px'; G3.cv.style.width = cssW + 'px'; G3.cv.style.height = (cssH - top) + 'px';
        wd.resize(cssW, cssH - top);
        G3.aspect = cssW / Math.max(1, cssH - top);   // (handed to the camera with every update: camHook)
      }
      if (G3.cv.style.display === 'none') G3.cv.style.display = '';
      document.body.classList.add('pin3d');
      camHook();
      var t0 = performance.now();
      try { wd.draw(W, t, mode, info); } catch (e) { fail3d((e && e.message) || 'draw failed'); flatFrame(W, t, mode, info); crisp(g, 480, dw, dh); return; }
      G3.ms.push(performance.now() - t0); if (G3.ms.length > 240) G3.ms.shift();
      g.clearRect(0, 0, dw, dh);
    }
    crisp(g, STRIP, dw, Math.ceil(dh * STRIP / 480) + 1);   // the dot-matrix display (a row over the 3D's top edge: no gap)
  }
  // ---------------------------------------------------------------- render only when needed (wave 3, #26)
  // The cabinet calls draw() every screen frame. The table is drawn again only when something can have changed: never
  // while paused, on the pick card, behind a sheet or on the game-over card (one frame when that starts, so the picture
  // underneath is current, and again if the screen changes size); the attract mode at 30 frames a second, then a still
  // after 60 s with nobody touching anything (a key or a press wakes it); Battery saver: 30 a second in play and the 3D
  // look's low tier. Pinball only: the cabinet itself is unchanged.
  var RD = { last: 0, key: '', title0: 0, sheet: false, sheetN: 0, drawn: 0, skipped: 0, tier: '' };
  function sheetOpen() {   // a sheet or dialog on top (ours, the Hall of Fame, Looks, Keep, Share): checked every 10th frame
    if (++RD.sheetN % 10 === 0) RD.sheet = [].some.call(document.querySelectorAll('[aria-modal="true"]'), function (d) { return d.getClientRects().length > 0; });
    return RD.sheet;
  }
  function wake() { RD.title0 = performance.now(); }
  ['pointerdown', 'keydown'].forEach(function (n) { document.addEventListener(n, wake, true); });
  function needDraw(mode, info) {
    var now = performance.now(), saver = !!(info.set && info.set.saver), sc = screenEl || document.getElementById('screen');
    var quiet = mode === 'paused' || mode === 'over' || (PICK && !PICK.hidden) || sheetOpen();
    var still = mode === 'title' && RD.title0 && now - RD.title0 > 60000;
    var key = (quiet ? 'q' + mode + (PICK && !PICK.hidden ? 'p' : '') : still ? 's' : 'r') + '|' + (sc ? sc.width + 'x' + sc.height : '') + '|' + (info.set && info.set.look);
    if (key !== RD.key) { RD.key = key; RD.last = now; return true; }   // (the frame that starts a quiet spell, a resize, a look change)
    if (quiet || still) return false;
    if ((mode === 'title' || saver) && now - RD.last < 30) return false;   // (30 a second, give or take the screen's beat)
    RD.last = now; return true;
  }
  function setLook(v) {   // R: flat <-> 3D at once, saved as the Settings sheet would
    var s = G3.set; if (!s) return;
    s.look = v;
    try { localStorage.setItem('pin365:settings', JSON.stringify(s)); } catch (e) {}
    [].forEach.call(document.querySelectorAll('[data-opt="look"]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-val') === v)); });
  }
  document.addEventListener('keydown', function (e) {
    if ((e.key || '').toLowerCase() !== 'r' || e.repeat || busy(e) || !G3.set) return;
    setLook(G3.set.look === 'flat' ? '3d' : 'flat'); e.preventDefault();
  });

  // ---------------------------------------------------------------- the words
  // Ember Peak's (the game's table when tables/ember.js is on the page); the old space table's if not
  var EMBER = !!(E.TABLES && E.TABLES.ember && E.DEFAULT === 'ember');
  var TB = E.table ? E.table(E.DEFAULT) : null, PT = TB ? TB.PTS : PTS, XT = TB && TB.T.extra;
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function extraList(n) {
    var x = (XT && XT[n] ? XT[n] : SP[n].extra).map(fmt);
    return x.slice(0, -1).join(', ') + ' and ' + x[x.length - 1] + ' on ' + SP[n].name;
  }
  var CONTROLS = [
    '<b>Launch:</b> hold <b>Space</b> or <b>&darr;</b> (or the Launch button) to pull the plunger back, and let go to fire. The longer you hold, the harder the shot; a quick tap gives a medium one. With a mouse or a finger: while the ball waits in the lane at the bottom right, press anywhere on the game screen, hold, and let go.',
    '<b>Flip:</b> the <b>&larr;</b> and <b>&rarr;</b> arrow keys work the left and right flippers &mdash; or <b>A</b> and <b>D</b>, <b>Z</b> and <b>M</b>, or the left and right <b>Shift</b> keys. With a mouse or a finger, press the left or right half of the game screen (two fingers at once are fine). Hold a flipper up to catch the ball and take aim; hit it near the tip to send it further across.',
    '<b>Nudge:</b> <b>&uarr;</b> or <b>W</b> gives the table a shove to rescue a ball (every tap counts; on a touch screen, swipe a finger up quickly). Too many close together and the screen warns you (DANGER) &mdash; then <b>TILT</b>: the flippers go dead and that ball&rsquo;s bonus is lost.'
  ];
  var ENDS = [
    '<b>Ball save:</b> for the first ' + SP[1].save + ' seconds of each ball on Gentle (' + SP[2].save + ' on Classic, ' + SP[3].save + ' on Fast), a ball that drains comes straight back: <b>BALL SAVED</b>.',
    '<b>Bonus:</b> most shots add to your bonus too. It is paid at the end of each ball, times the multiplier.',
    '<b>Extra balls</b> at ' + extraList(1) + '; ' + extraList(2) + '; ' + extraList(3) + '.',
    '<b>Settings:</b> <b>Speed</b> &mdash; Gentle is a flatter, slower table with ' + SP[1].balls + ' balls and the longest ball save; Classic is ' + SP[2].balls + ' balls; Fast is a steeper, quicker table for experts. <b>Look</b> &mdash; the 3D table or the flat one (<b>R</b>). <b>Camera</b> &mdash; Calm leans in on the ball now and then and dives into the crater the first time; Arcade does it more often, with more zoom and slow motion; Classic keeps the whole table in view and never moves (chosen for you if your device asks for less motion). The camera never moves in the last half second before the ball can reach a flipper. <b>P</b> pauses, and the game pauses itself if you click away to another window.'
  ];
  var HELP = EMBER ? (window.PinRun ? ['<b>Ember Run</b> (the title card, or Settings &gt; Mode): up to 8 rounds. Each round has one <b>mission</b>, shown on the <b>NEXT</b> line under the display, with an arrow on the shot it needs. The balls last the whole run: ' + SP[1].name + ' 3, ' + SP[2].name + ' 2, ' + SP[3].name + ' 1. A ball lost before the mission is done costs one; the mission&rsquo;s progress is kept. Mission done: <b>STAGE CLEAR</b>, then pick <b>1 of 3 upgrades</b> (keys 1 2 3, or tap one) and the table <b>mutates</b>. Rounds 4 and 8: <b>THE VOLCANO</b> fights back in three phases. <b>TODAY&rsquo;S ERUPTION</b> is the same run for everyone today. <b>Classic</b> is the whole game for a high score.'] : []).concat([
    '<b>The aim:</b> Ember Peak is a volcano island waking up. Build up the pressure, shoot the ball into the crater and set off the full eruption &mdash; and score all you can. ' + SP[1].balls + ' balls on Gentle, ' + SP[2].balls + ' on Classic and Fast.',
    '<b>The island:</b> the <b>volcano</b> stands at the top left, the <b>fumaroles</b> and the top lanes at the top right, and the shore with your two flippers at the bottom.'
  ].concat(CONTROLS, [
    '<b>Skill shot:</b> as each ball goes in, one of the three top lanes flashes. Roll through that one before the ball touches anything else for <b>' + fmt(PT.skill) + '</b>.',
    '<b>Top lanes:</b> ' + fmt(PT.lane) + ' a lane. Light all three to raise the bonus multiplier (up to 5 times). The flippers move the lit lanes along, so you can line up the one you need.',
    '<b>Heat ramp</b> (the lane just right of the middle): ' + fmt(PT.ramp) + '. It climbs over the fumaroles and brings the ball back down to the right flipper, slowly enough to catch: hold the flipper up. Too slow and the ball rolls back down.' + (window.PinGoals ? ' Any two big shots (the crater, the ramp, an orbit, a lava lane, the loop or the obsidian) within three seconds make a <b>COMBO</b>; five is a SUPER COMBO.' : ''),
    '<b>Orbits:</b> the long lanes up each side, ' + fmt(PT.orbit) + '. Up one and round and up again within four seconds is a <b>LOOP</b>: ' + fmt(PT.loop) + '. The spinner in the left orbit: ' + fmt(PT.spin) + ' a turn.',
    '<b>Obsidian targets</b> (the three black stones right of the middle, beside the heat ramp): ' + fmt(PT.drop) + ' each. Knock down all three for ' + fmt(PT.drops) + ' and the <b>OBSIDIAN PLUG</b> rises between the flippers for ' + Math.round(((TB && TB.T.plug && TB.T.plug.time) || 1200) / 60) + ' seconds: it saves one ball that falls down the middle. In Classic it also lights <b>MODE</b> at the crater. They come back up two seconds later.',
    '<b>Pressure:</b> nearly every shot builds the volcano&rsquo;s pressure &mdash; the cone rises and the rumble under the table grows. The first eruption needs only a little; each one after needs more. Half way up, <b>LOCK</b> lights at the crater: a crater shot banks a ball for the next multiball. At the top the display says <b>ERUPT NOW</b>.',
    '<b>The crater:</b> best from the right flipper, shoot the ball firmly into the volcano&rsquo;s mouth: ' + fmt(PT.crater) + ', plus up to ' + fmt(PT.pressure) + ' more for the pressure inside. The volcano holds the ball for a moment, then fires it into the sky and down the <b>wire rail</b> into the left inlane (' + fmt(PT.rail) + ').',
    '<b>THE BIG ONE:</b> shoot the crater with ERUPT lit for <b>' + fmt(PT.eruption) + '</b> more, and the volcano erupts into a <b>multiball</b>: 2 balls, or 3 with a lock banked, with a ball save. <b>JACKPOT</b> is lit on both lava lanes and the heat ramp: ' + fmt(PT.jackpot || 5000000) + ', and ' + fmt(PT.jackpotUp || 1000000) + ' more for each one after. Three jackpots light the <b>SUPER JACKPOT</b> at the crater. The steam geyser adds one more ball, once. The multiball ends when one ball is left.',
    '<b>The quake:</b> keep building pressure well past ERUPT without shooting the crater and the volcano overloads &mdash; <b>QUAKE COMING</b>: the island shakes and tips the ball sideways for a moment, the obsidian plug drops and the pressure falls back. The quake waits until no ball is close to a flipper.',
    '<b>Steam geyser</b> (just below the volcano): a slow ball is caught, it puffs, then flings the ball up into the fumaroles: ' + fmt(PT.geyser) + '.',
    '<b>Fumaroles</b> (the pop bumpers under the top lanes): ' + fmt(PT.bumper) + ' a hit. <b>Magma crabs</b> walk about the island: ' + fmt(PT.crab) + ' for a hit, and the crab stops for a moment. <b>Slingshots</b> (the lava-lit triangles above the flippers): ' + fmt(PT.sling) + '.',
    '<b>Kickback:</b> when its light is on, a ball falling down the left outlane is fired straight back up. It is lit at the start of a game; on Gentle at the start of every ball, and again by knocking down all three obsidian targets.',
    '<b>Inlanes</b> (beside the flippers): ' + fmt(PT.inlane) + '. <b>Outlanes</b> (the outside lanes, down to the drain): ' + fmt(PT.outlane) + ', a small comfort.'
  ], ENDS)) : [
    '<b>The aim:</b> you are the hero defending a planet from the invaders of 365 Invaders. Keep the ball in play and score all you can &mdash; ' + SP[1].balls + ' balls on Gentle, ' + SP[2].balls + ' on Classic and Fast.'
  ].concat(CONTROLS, [
    '<b>Skill shot:</b> as each ball goes in, one of the three top lanes flashes. Roll through that one before the ball touches anything else for <b>' + fmt(PTS.skill) + '</b>.',
    '<b>Top lanes:</b> ' + fmt(PTS.lane) + ' a lane. Light all three to raise the bonus multiplier (up to 5 times). The flippers move the lit lanes along, so you can line up the one you need.',
    '<b>Pop bumpers:</b> ' + fmt(PTS.bumper) + ' a hit. <b>Slingshots</b> (the rubber triangles above the flippers): ' + fmt(PTS.sling) + '.',
    '<b>Comet spinner</b> in the left orbit: ' + fmt(PTS.spin) + ' a turn &mdash; the faster the ball, the more it spins.',
    '<b>Orbits:</b> ' + fmt(PTS.orbit) + ' up either side. Up one and round and up the other within four seconds is a <b>LOOP</b>: ' + fmt(PTS.loop) + '.',
    '<b>Warp ramp</b> (the lane in the middle): ' + fmt(PTS.ramp) + '. Too slow and the ball rolls back down. Make it again within four seconds for a <b>COMBO</b>: double, then up to five times.',
    '<b>Invader targets:</b> ' + fmt(PTS.drop) + ' each. Knock down all five for ' + fmt(PTS.drops) + ' and the <b>HANGAR</b> behind them opens for 20 seconds: shoot the ball in for <b>' + fmt(PTS.saucerLit) + '</b> (' + fmt(PTS.saucer) + ' when it isn&rsquo;t open). All five down lights the kickback too.',
    '<b>Kickback:</b> when its light is on, a ball falling down the left outlane is fired straight back up. It is lit at the start of a game (on Gentle, at the start of every ball); after that, knock down all five invader targets to light it again.',
    '<b>Inlanes</b> (beside the flippers): ' + fmt(PTS.inlane) + '. <b>Outlanes</b> (the outside lanes, down to the drain): ' + fmt(PTS.outlane) + ', a small comfort.'
  ], ENDS);

  // ---------------------------------------------------------------- slow motion (the camera's), in the game's steps
  // The cabinet calls step() 60 times a second. While the camera asks for slow motion, only a share of those calls
  // steps the engine: the shares add up (0.35, 0.7, 1.05: a step ...), so the engine itself is stepped exactly as ever.
  // A step that is skipped leaves the quick-tap latches set, so the next real step still sees the tap.
  function stepGame(W, input) {
    if (W.run && RUN && RUN.phase !== 'play') return;   // EMBER RUN: the table waits while the upgrade is picked
    var ts = timeScale(A3() ? A3().mode : 'play');
    if (ts < 1) {
      G3.slow += ts;
      if (G3.slow < 1) { G3.skipped++; return; }
      G3.slow -= 1;
    } else G3.slow = 0;
    var pp = input.pp, pl = input.pl, pr = input.pr;
    if (input.ppTap) input.pp = true; if (input.plTap) input.pl = true; if (input.prTap) input.pr = true;
    input.upTap = upTaps > 0 ? upTaps : undefined; upTaps = 0;
    var Wa = active(W);   // INTO THE VOLCANO: the level the ball is on (the surface itself without descent.js)
    E.step(Wa, input);
    input.pp = pp; input.pl = pl; input.pr = pr; input.ppTap = input.plTap = input.prTap = false; input.upTap = undefined;
    if (DESC) { var cut = null; try { cut = DESC.update(W); } catch (e) { cut = null; } if (cut === 'down' || cut === 'up') hardCut(cut); }
    if (W.run && RUN) runStep(W, Wa);   // EMBER RUN: the mission, the boss, the round's end (on the active world)
    // the effects (fx.js) and the voice see this step's events before the cabinet plays their sounds and clears them
    if (window.PinFX && Wa.events.length) { try { PinFX.events(Wa, Wa.events); } catch (e) {} }
    if (window.PinVoice && typeof PinVoice.events === 'function' && Wa.events.length) { try { PinVoice.events(Wa, Wa.events); } catch (e) {} }
    if (Wa !== W && Wa.events.length) { for (var i = 0; i < Wa.events.length; i++) W.events.push(Wa.events[i]); Wa.events.length = 0; }   // (the cabinet plays the surface's list)
    dmdTidy(W, Wa);
  }
  // the dot-matrix display (wave 3, #9): ROUND, never BALL, in a run; a single score of 1,000,000 or more is shown there
  // (fx.js keeps its floating pops for the smaller ones) unless the display is already saying something
  var lastScore = -1, lastWa = null;
  function dmdTidy(W, Wa) {
    if (W.run && RUN && W.dmd && /^BALL \d+$/.test(String(W.dmd.big))) W.dmd.big = 'ROUND ' + RUN.round;
    var sc = Wa.score || 0;
    if (Wa === lastWa && lastScore >= 0 && sc - lastScore >= 1e6 && !Wa.dmd && Wa.state === 'play') Wa.dmd = { big: '+' + fmt(sc - lastScore), small: '', t: 75, n: 0 };
    lastScore = sc; lastWa = Wa;
  }

  // ---------------------------------------------------------------- INTO THE VOLCANO (descent.js, window.PinDescent; wave 3)
  // The cabinet keeps the surface world; descent.js holds the level below. Every step and every frame use D.active(W),
  // the world the ball is on. A change of level is a hard cut: the screen goes black for a moment (0.25 s), never a
  // camera flight. No descent.js on the page: the surface only, exactly as before. A new descent for every new world
  // (a new game, each Ember Run round); none on the title screen.
  var DESC = null, CUT = null;
  function makeDesc(W, speed, seed) {
    DESC = null;
    var P = window.PinDescent;
    if (!P || typeof P.create !== 'function' || !W || W.demo) return;
    try { DESC = P.create(E, { speed: speed || W.speed, seed: seed != null ? seed : (W.seed || 1) }); } catch (e) { DESC = null; if (window.console) console.info('365 Pinball Hero: no levels (' + ((e && e.message) || e) + ')'); }
  }
  function active(W) {
    if (!DESC || !W || W.demo) return W;
    var A2 = null; try { A2 = DESC.active(W); } catch (e) { A2 = null; }
    return A2 || W;
  }
  function depth() {   // { depth, name, clock, goal, cleared } or null
    if (!DESC || typeof DESC.status !== 'function') return null;
    try { return DESC.status() || null; } catch (e) { return null; }
  }
  function hardCut(dir) {
    G3.slow = 0; letGo();
    if (!CUT) return;
    CUT.className = ''; void CUT.offsetWidth; CUT.className = 'go';
    if (window.PinCam && typeof PinCam.cut === 'function') { try { PinCam.cut(dir); } catch (e) {} }
  }

  // ---------------------------------------------------------------- EMBER RUN (run.js, window.PinRun; 30 Oct 2026, owner: "change how it plays")
  // The title card offers two modes (Settings 'game': EMBER RUN, the default, and CLASSIC, the game as it always was).
  // A run is up to 8 rounds of one ball each, every round a fresh world from PinRun.startRound. The cabinet keeps ONE
  // world object, so a new round is copied into it in place (as demo.js does between its games). At a round's end the
  // engine sets W.over; runStep clears it again when the run goes on (the cabinet's game-over card waits for the run's
  // end) and the table waits (stepGame) while the player picks 1 of 3 upgrades on the pick card. Run over or won: the
  // cabinet's own game-over card, with the run's summary in place of its tiles. PinRun missing: Classic only.
  var PR = window.PinRun, RUN = null, RS = { sel: 0, key: '', flash: 0, hitT: 0, pu: 0 }, HUD = null, BAN = null, PICK = null, OSUM = null, OVER = null;
  function runOn(set) { return !!(PR && EMBER && !(set && set.game === 'classic')); }
  function runWorld(R) { var W = PR.startRound(R); if (W) W.run = true; return W; }
  function swapWorld(W, N) { Object.keys(W).forEach(function (k) { delete W[k]; }); Object.assign(W, N); }
  function runStep(W, Wa) {
    Wa = Wa || W;
    var ph = PR.update(RUN, Wa);
    runNews(W);
    if (ph === 'pick') {
      W.over = false;   // (a round's end, not the game's)
      for (var i = 0; i < Wa.events.length; i++) if (Wa.events[i] === 'over') Wa.events[i] = 'extra';   // a cheer, not the game-over sound
      setTimeout(showPick, 0);
    } else if (ph === 'over' || ph === 'won') setTimeout(showSummary, 0);   // (after the cabinet has shown its card)
  }
  function runNews(W) {   // run.js's announcements: ONE place each (wave 3, #9): a round or boss start and STAGE CLEAR as
    // a banner over the table for 1.2 s at most; everything else on the dot-matrix display only
    var N = RUN.news; if (!N.length) return;
    for (var i = 0; i < N.length; i++) {
      var n = N[i];
      if (n.kind === 'hit') { RS.hitT = performance.now(); continue; }   // the HP bar shakes; the display stays on the game
      if (n.kind === 'mutation' || n.kind === 'over' || n.kind === 'won' || RUN.phase !== 'play') continue;   // (the pick and summary cards say these)
      if (n.kind === 'win' || n.kind === 'stageclear') RS.flash = performance.now();
      var sub = n.small || '', m = RUN.mutNext;
      if (n.kind === 'round' || n.kind === 'boss' || n.kind === 'stageclear') {
        if ((n.kind === 'round' || n.kind === 'boss') && m && RUN.round > 1) sub = 'MUTATION: ' + m.name;
        banner(n.kind === 'round' ? 'ROUND ' + RUN.round + (RUN.target && !(RUN.mission || PR.status(RUN, W).mission) ? ' · TARGET ' + fmt(RUN.target) : '') : n.big, n.kind === 'round' ? sub.replace(/^[^|]*\|/, '') : sub.split('|')[0], n.kind);
      } else W.dmd = { big: n.big, small: n.small || '', t: 150, n: 0 };
    }
    N.length = 0;
  }
  function banner(big, small, kind) {
    if (!BAN) return;
    BAN.className = 'rb-' + kind;
    BAN.innerHTML = '<b>' + esc(big) + '</b>' + (small ? small.split('|').map(function (s) { return '<small>' + esc(s) + '</small>'; }).join('') : '');
    void BAN.offsetWidth; BAN.className = 'rb-' + kind + ' rb-go';   // (restarts the animation)
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // numbers on the HUD the short way: 950,000 / 1.6M / 12M / 2.4B (everywhere else, thousands separators: fmt)
  function short(n) {
    n = +n || 0; var a = Math.abs(n), u = a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : null;
    if (!u) return fmt(Math.round(n));
    var v = n / u[0], t = Math.abs(v) < 10 ? (Math.floor(v * 10) / 10).toFixed(1) : String(Math.floor(v));
    return t.replace(/\.0$/, '') + u[1];
  }
  function clock(sec) { sec = Math.max(0, Math.ceil(+sec || 0)); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }
  var DEPTHS = ['SURFACE', 'MAGMA CHAMBER'];
  // THE HUD (wave 3, #9), under the display, never taking a press: in Ember Run the round, the balls left and the mission
  // clock; THE VOLCANO's HP in a boss round; then ONE NEXT line (W.next, goals.js or descent.js) with a 5-segment gauge;
  // and with descent.js the depth meter (SURFACE, MAGMA CHAMBER, a dim ? below) with the lava clock below the surface.
  // Classic shows the NEXT line and the depth meter. Old run.js (no mission, no W.next): the target bar, as before.
  function runHud(Ws, mode) {
    if (!HUD) return;
    var W = Ws && !Ws.demo ? active(Ws) : Ws, run = !!(Ws && Ws.run && RUN && !Ws.demo && RUN.phase === 'play');
    var nx = W && W.next && W.next.text ? W.next : null, dp = depth();
    var on = !!(Ws && !Ws.demo && (mode === 'play' || mode === 'paused') && (run || nx || dp));
    if (HUD.hidden === on) HUD.hidden = !on;
    if (PICK && !PICK.hidden && (mode === 'title' || mode === 'over' || !RUN || RUN.phase !== 'pick')) PICK.hidden = true;
    // paused over the pick card (wave 3, #18): the cabinet's pause card shows, the pick card steps aside and takes no
    // click or key until the game carries on
    if (PICK) { var pz = mode === 'paused'; if (PICK.classList.contains('pz') !== pz) { PICK.classList.toggle('pz', pz); if (!pz && !PICK.hidden) markSel(true); } }
    var w = screenEl ? screenEl.clientWidth : 0;
    if (w && w !== RS.pu) { RS.pu = w; screenEl.parentNode.style.setProperty('--pu', (w / 270).toFixed(3) + 'px'); }   // one game pixel, for the overlays' type
    if (!on) return;
    var s = run ? PR.status(RUN, Ws) : null, now = performance.now(), fl = now - RS.flash < 1400, sh = now - RS.hitT < 400;
    var B = s && s.boss, bo = B && typeof B === 'object' ? B : null, boss = !!B;
    var balls = s && s.balls != null ? s.balls : (E.hud(Ws).lives), bmax = s && s.ballsMax != null ? s.ballsMax : Math.max(balls, 1);
    var gauge = nx && typeof nx.gauge === 'number' ? Math.max(0, Math.min(5, Math.round(nx.gauge * 5))) : -1;
    var clk = nx && typeof nx.clock === 'number' && isFinite(nx.clock) ? nx.clock : null;
    var legacy = run && !nx && !(s && s.mission);
    var key = [run && s.round, boss, bo ? bo.chunks + '/' + bo.chunksMax + bo.phase : s && Math.ceil(s.hp || 0), balls, bmax, nx && nx.text, nx && nx.small, gauge, clk == null ? '' : Math.ceil(clk),
      legacy ? Math.round(s.progress * 400) + '|' + s.roundScore + '|' + s.hit : '', dp ? dp.depth + '|' + (dp.clock == null ? '' : Math.ceil(dp.clock)) + '|' + dp.cleared : '', fl, sh].join('|');
    if (key === RS.key) return; RS.key = key;
    HUD.className = (boss ? 'boss' : '') + (legacy && s.hit ? ' hit' : '') + (fl ? ' flash' : '') + (sh ? ' shake' : '') + (run ? '' : ' classic');
    var h = '';
    if (run) {
      var pips = ''; for (var k = 0; k < Math.min(5, Math.max(bmax, balls)); k++) pips += '<i class="' + (k < balls ? 'on' : '') + '"></i>';
      h += '<div class="rh-l"><b>' + (boss ? 'THE VOLCANO' : 'ROUND ' + s.round + '/' + s.rounds) + '</b>'
        + '<span class="rh-balls" aria-label="' + balls + (balls === 1 ? ' ball' : ' balls') + ' left">' + pips + '</span>'
        + (clk != null ? '<span class="rh-clk">' + clock(clk) + '</span>' : boss ? '<span>ROUND ' + s.round + '/' + s.rounds + '</span>' : legacy ? '<span>' + (s.hit ? 'TARGET REACHED' : 'TARGET ' + short(s.target)) + '</span>' : '') + '</div>';
      if (boss) {
        var cm = bo ? bo.chunksMax : s.hpMax, cv = bo ? bo.chunks : Math.ceil(s.hp);
        h += '<div class="rh-bar"><i style="width:' + (cm ? 100 * cv / cm : 0).toFixed(2) + '%"></i><em>' + (bo && bo.phaseName ? esc(bo.phaseName) + ' · ' : '') + 'HP ' + cv + ' / ' + cm + '</em></div>';
      } else if (legacy) h += '<div class="rh-bar"><i style="width:' + (100 * s.progress).toFixed(2) + '%"></i><em>' + short(s.roundScore) + ' / ' + short(s.target) + '</em></div>';
    }
    if (nx) {
      var seg = ''; if (gauge >= 0) { for (var g = 0; g < 5; g++) seg += '<u class="' + (g < gauge ? 'on' : '') + '"></u>'; }
      h += '<div class="rh-next"><span class="rh-nt"><b>NEXT</b> ' + esc(nx.text) + (nx.small ? ' <small>' + esc(nx.small) + '</small>' : '') + '</span>' + (seg ? '<span class="rh-g" aria-hidden="true">' + seg + '</span>' : '') + (!run && clk != null ? '<span class="rh-clk">' + clock(clk) + '</span>' : '') + '</div>';
    }
    if (dp) {
      var at = Math.max(0, Math.min(DEPTHS.length - 1, dp.depth | 0));
      h += '<div class="rh-depth">' + DEPTHS.map(function (d, i) { return '<span class="' + (i === at ? 'at' : i < at ? 'up' : '') + '">' + (i === at && dp.name ? esc(String(dp.name).toUpperCase()) : d) + '</span>'; }).join('<i>›</i>')
        + '<i>›</i><span class="q">?</span>' + (dp.clock != null && at > 0 ? '<span class="rh-lava">LAVA ' + clock(dp.clock) + '</span>' : '') + '</div>';
    }
    HUD.innerHTML = h;
  }
  // the upgrades' little pictures (40 x 40, drawn in the card's colour)
  var ICONS = {
    fire: '<path d="M20 4c3 7 10 10 10 19a10 10 0 0 1-20 0c0-6 4-8 5-13 2 3 3 5 5 6 0-5-2-8 0-12z"/>',
    pump: '<path d="M5 29a15 15 0 0 1 30 0"/><path d="M20 29l8-11"/><circle cx="20" cy="29" r="2.5"/>',
    gold: '<path d="M5 34h8l18-24"/><path d="M23 9h9v9"/>',
    crab: '<ellipse cx="20" cy="25" rx="10" ry="7"/><path d="M10 23l-5-7 3-6M30 23l5-7-3-6M12 30l-5 4M28 30l5 4"/>',
    lavakick: '<path d="M20 33V8"/><path d="M11 17l9-9 9 9"/><path d="M8 34h24"/>',
    net: '<path d="M6 10h28M6 20h28M6 30h28M10 6v28M20 6v28M30 6v28"/>',
    bumper: '<circle cx="20" cy="20" r="14"/><circle cx="20" cy="20" r="7"/><circle cx="20" cy="20" r="1.5"/>',
    lanes: '<path d="M10 6v18M20 6v18M30 6v18"/><circle cx="20" cy="32" r="3.5"/>',
    twin: '<circle cx="14" cy="23" r="8"/><circle cx="27" cy="15" r="8"/>',
    wind: '<path d="M4 14h20a5 5 0 1 0-5-5M4 22h27a5 5 0 1 1-5 5M4 30h12"/>',
    interest: '<circle cx="12" cy="12" r="4"/><circle cx="28" cy="28" r="4"/><path d="M30 8L10 32"/>',
    forge: '<path d="M6 25h28l-4 9H10z"/><path d="M12 25c0-6 4-10 8-10s8 4 8 10"/><path d="M20 4v7"/>',
    tamer: '<path d="M4 34l11-20h10l11 20z"/><path d="M15 14l5 6 5-6"/>'
  };
  function icon(id) { return '<svg viewBox="0 0 40 40" aria-hidden="true">' + (ICONS[id] || '<circle cx="20" cy="20" r="12"/>') + '</svg>'; }
  function showPick() {
    if (!RUN || RUN.phase !== 'pick' || !PICK) return;
    letGo(); var a = A3(); if (a) a.input.left = a.input.right = a.input.fire = a.input.up = a.input.down = false;
    var L = RUN.log[RUN.log.length - 1] || {}, m = RUN.mutNext, nx = RUN.round + 1, boss = PR.BOSS && PR.BOSS[nx];
    PICK.querySelector('.rp-h').textContent = L.boss ? 'VOLCANO DEFEATED' : 'ROUND ' + L.round + ' CLEARED';
    PICK.querySelector('.rp-s').textContent = 'You scored ' + fmt(L.score || 0) + (L.boss ? '' : ' (target ' + fmt(L.target || 0) + ')') + ' · next: ' + (boss ? 'BOSS ROUND ' + nx : 'round ' + nx) + ' of ' + RUN.rounds;
    PICK.querySelector('.rp-m').innerHTML = m ? '<small>TABLE MUTATION</small><b>' + esc(m.name) + '</b><span>' + esc(m.text) + '</span>' : '';
    PICK.querySelector('.rp-cards').innerHTML = (RUN.offer || []).map(function (id, i) {
      var u = PR.UP[id], have = RUN.ups[id] || 0;
      return '<button type="button" class="rp-card" data-pick="' + id + '"><span class="rp-k">' + (i + 1) + '</span><span class="rp-ic">' + icon(id) + '</span><span class="rp-t"><b>' + esc(u.name) + (have ? ' <i>x' + (have + 1) + '</i>' : '') + '</b><small>' + esc(u.text) + '</small></span></button>';
    }).join('');
    PICK.hidden = false; RS.sel = 0; markSel(true); if (BAN) BAN.className = '';   // (no banner left fading behind the card)
  }
  function markSel(focus) {
    var c = PICK.querySelectorAll('[data-pick]');
    [].forEach.call(c, function (b, i) { b.classList.toggle('sel', i === RS.sel); });
    if (focus && c[RS.sel]) try { c[RS.sel].focus({ preventScroll: true }); } catch (e) {}
  }
  function choose(id) {   // -> true if the upgrade was taken and the next round is on the table
    var a = A3(); if (!RUN || RUN.phase !== 'pick' || !a || !a.world || a.mode !== 'play' || !PR.pick(RUN, id)) return false;
    var N = runWorld(RUN); if (!N) return false;
    swapWorld(a.world, N); G3.slow = 0; RS.key = ''; PICK.hidden = true; letGo();
    makeDesc(a.world, a.world.speed, (RUN.seed || 1) * 31 + RUN.round);
    try { screenEl.focus({ preventScroll: true }); } catch (e) {}
    return true;
  }
  function showSummary() {
    if (!RUN || !OSUM || (RUN.phase !== 'over' && RUN.phase !== 'won')) return;
    var S = PR.summary(RUN), nb = PR.saveBest(S), B = PR.loadBest();
    var pips = ''; for (var r = 1; r <= RUN.rounds; r++) { var l = S.rounds[r - 1]; pips += '<i class="' + (l ? (l.hit ? 'ok' : 'no') : '') + (PR.BOSS && PR.BOSS[r] ? ' bs' : '') + '" title="Round ' + r + '"></i>'; }
    OSUM.innerHTML = '<p class="rs-k">' + (S.won ? 'THE VOLCANO IS TAMED' : 'EMBER RUN') + '</p><div class="rs-pips" aria-label="Rounds cleared: ' + S.cleared + ' of ' + RUN.rounds + '">' + pips + '</div>'
      + '<div class="tiles rs-tiles"><div class="tile"><b>' + S.cleared + '/' + RUN.rounds + '</b><span>Rounds cleared</span></div><div class="tile"><b>' + fmt(S.score) + '</b><span>Score</span></div></div>'
      + '<div class="rs-ups">' + (S.upgrades.length ? RUN.taken.map(function (id) { return '<span class="rs-chip">' + icon(id) + esc(PR.UP[id].name) + '</span>'; }).join('') : '<span class="rs-none">No upgrades taken</span>') + '</div>'
      + (S.mutations.length ? '<p class="rs-mu">Mutations: ' + esc(S.mutations.join(', ')) + '</p>' : '')
      + '<p class="rs-best">' + (nb ? '<b>NEW BEST RUN!</b>' : B ? 'Best run: ' + (B.won ? 'won' : 'round ' + B.reached) + ' · ' + fmt(B.score) : '') + '</p>';
    OVER.classList.add('runsum'); if (BAN) BAN.className = '';
    endLines(S);
  }
  // THE END CARD (wave 3, #19): the result is the heading (overText); under PLAY AGAIN one true near-miss line and one
  // next goal; everything else folded under "Details". run.js's own summary lines (nearMiss, next) when it has them.
  function txt(v) { return v == null ? '' : typeof v === 'string' ? v : v.text ? String(v.text) : ''; }
  function endLines(S) {
    var el = document.getElementById('oLines'); if (!el) return;
    var near = '', next = '';
    if (S) {   // Ember Run
      near = txt(S.nearMiss); next = txt(S.next);
      var L = S.rounds && S.rounds[S.rounds.length - 1];
      if (!near && L && !L.hit && !S.won) {
        if (L.boss && L.hpMax && L.hp > 0) near = 'THE VOLCANO had ' + Math.ceil(L.hp) + ' of ' + L.hpMax + ' HP left.';
        else if (L.target && L.score < L.target) near = fmt(L.target - L.score) + ' short of round ' + L.round + '\u2019s target.';
      }
      if (!next) next = S.won ? 'Next: tame it again, faster.' : 'Next: ' + (PR.BOSS && PR.BOSS[S.reached] ? 'beat THE VOLCANO in round ' + S.reached : 'clear round ' + S.reached) + '.';
    } else {   // Classic: the distance to this speed's best, and the next thing to set off
      var a = A3(), W = a && a.world, best = +(String(document.getElementById('oBest').textContent).replace(/\D/g, '')) || 0;
      if (W && best > W.score) near = fmt(best - W.score) + ' short of your best.';
      var st = (W && W.stats) || {};
      next = !st.eruptions ? 'Next: fill the pressure and shoot the crater when it says ERUPT NOW.' : !st.multiballs ? 'Next: set off THE BIG ONE multiball.' : !st.jackpots ? 'Next: a JACKPOT during the multiball.' : !st.supers ? 'Next: three jackpots light the SUPER JACKPOT.' : 'Next: beat your best.';
    }
    el.innerHTML = (near ? '<p class="ol-near">' + esc(near) + '</p>' : '') + (next ? '<p class="ol-next">' + esc(next) + '</p>' : '');
  }

  A.start({
    id: 'pinball', store: 'pin365', title: '365 Pinball Hero', width: 270, height: 480, phoneFull: true, waveWord: 'ball',
    speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
    newWorld: function (speed, set) {   // a different game every time; EMBER RUN: a new run, its first round
      G3.slow = 0; RS.key = ''; if (PICK) PICK.hidden = true; if (OVER) OVER.classList.remove('runsum');
      var seed = (Date.now() % 2147483646) + 1;
      var NW;
      if (!runOn(set)) { RUN = null; NW = E.newWorld(speed, set, seed); }
      else { RUN = PR.newRun(seed, speed); NW = runWorld(RUN); }
      makeDesc(NW, speed, seed);
      lastScore = -1; lastWa = null;
      if (NW && NW.run && NW.dmd && /^BALL /.test(String(NW.dmd.big))) NW.dmd = null;   // (the round's banner says it)
      return NW;
    },
    step: stepGame,
    hud: function (W) { var h = E.hud(W); if (W && W.run && RUN && !W.demo) { var st = PR.status(RUN, W); h.wave = RUN.round; h.lives = st && st.balls != null ? st.balls : h.lives + (RUN.wind || 0); } return h; },
    waveLabel: function (W) { return W && W.run ? 'Round' : 'Ball'; },
    // the Hall of Fame's check on a pinball score (api/games-hof.php, $ARCADE['pinball']): the invitation shows only for a
    // score the server will take. KEEP IN STEP WITH THE PHP (rate, base) - these two numbers are the only copy here.
    hofCap: { rate: 20000, base: 300000 },
    num: fmt,   // EMBER RUN: the round in the Ball chip
    // EMBER RUN keeps its own best scores (r1-r3), as Invaders keeps its two styles apart
    statKey: function (W) { return (W && W.run ? 'r' : 'v') + W.speed; },
    statKeyFor: function (set, speed) { return (runOn(set) ? 'r' : 'v') + speed; },
    hofLevels: PR && EMBER ? [['v1', 'Gentle'], ['v2', 'Classic'], ['v3', 'Fast'], ['r1', 'Ember Run Gentle'], ['r2', 'Ember Run Classic'], ['r3', 'Ember Run Fast']] : undefined,
    picker: PR && EMBER ? { key: 'game', label: 'Mode', options: [['run', 'EMBER RUN', '8 rounds, pick upgrades, beat the volcano'], ['classic', 'CLASSIC', 'The whole game: chase a high score']] } : undefined,
    // the look: 3D (the default) or the flat table. The 3D look draws on the screen at full sharpness (hires). The
    // camera: Calm (the default), Arcade or Classic (the default when the device asks for reduced motion)
    settings: [
      { key: 'look', type: 'seg', label: 'Look', small: G3.failed ? 'This browser can only show the flat table' : 'The 3D table or the flat one (R)', options: [['3d', '3D'], ['flat', 'Flat']], def: '3d' },
      PR && EMBER ? { key: 'game', type: 'seg', label: 'Mode', small: 'Ember Run: 8 rounds, an upgrade after each, a volcano boss. Classic: the game as it always was', options: [['run', 'Ember Run'], ['classic', 'Classic']], def: 'run' } : null,
      { key: 'saver', type: 'switch', label: 'Battery saver', small: 'A lighter picture at 30 frames a second: cooler and longer-lasting on a phone', def: false },
      { key: 'cam', type: 'seg', label: 'Camera', small: 'Calm follows the ball now and then; Arcade more, with slow motion; Classic never moves', options: [['arcade', 'Arcade'], ['classic', 'Classic'], ['calm', 'Calm']], def: REDUCED ? 'classic' : 'calm' }
    ].filter(Boolean),
    hires: function (set) { G3.set = set; return want3d(set); },
    draw: function (g, W, t, mode, info) {
      // the title screen: the table plays itself behind the card (demo.js); it may step the title world itself (at the
      // camera director's pace, and not at all during a flythrough)
      if (mode === 'title' && !RD.title0) wake();
      if (mode !== 'title') RD.title0 = 0;
      var go = needDraw(mode, info);
      if (go) RD.drawn++; else RD.skipped++;
      if (window.PinDemo && go) {
        var dts = G3.shot && mode === 'title' && performance.now() - G3.shotT < 250 && typeof G3.shot.timeScale === 'number' ? G3.shot.timeScale : 1;
        try { mode = PinDemo.frame(W, t, mode, dts) || mode; } catch (e) {}
      }
      if (mode !== 'play') letGo();   // paused, game over: nothing stays held
      if (mode === 'over' && !RS.ended) { RS.ended = true; if (!(W && W.run && RUN)) endLines(null); } else if (mode !== 'over') RS.ended = false;
      runHud(W, mode);   // EMBER RUN's round line and bar (hidden otherwise)
      if (mode !== 'title') W = active(W);   // INTO THE VOLCANO: draw the level the ball is on
      if (!go) return;   // (nothing has changed that the picture shows: the last frame stays on the screen)
      var tier = info.set && info.set.saver ? 'low' : 'auto';
      if (G3.world && tier !== RD.tier) { RD.tier = tier; try { G3.world.setTier(tier); } catch (e) {} }
      if (info.dw && want3d(info.set)) return draw3d(g, W, t, mode, info);
      hide3d();
      if (window.PinFlat && typeof PinFlat.draw === 'function') return PinFlat.draw(g, W, t, mode, info);
      g.fillStyle = '#000'; g.fillRect(0, 0, 270, 480);   // (the picture hasn't loaded: a black screen, never an error)
    },
    // the sounds know the world (each table has its own); the rumble under Ember Peak follows the game every frame
    sound: function (name, kit, e) { if (window.PinSound) { var a = A3(); PinSound.sound(name, kit, e, a && a.world); } },
    frameAudio: function (W, kit, mode, set) { if (window.PinSound && typeof PinSound.frame === 'function') PinSound.frame(W, kit, mode, set); },
    quietSay: function () { return true; },   // the dot-matrix display shows the messages; the words are for screen readers
    overText: function (W) {
      if (W && W.run && RUN) return (RUN.won ? 'Run won! ' : 'Run over in round ' + RUN.round + ' · ') + fmt(W.score);
      var s = W.stats || {}, bits = [];
      if (s.eruptions) bits.push(plural(s.eruptions, 'eruption', 'eruptions'));
      if (s.craters) bits.push(plural(s.craters, 'crater', 'craters'));
      if (s.ramps) bits.push(plural(s.ramps, 'ramp', 'ramps'));
      if (s.saucers) bits.push(plural(s.saucers, 'hangar', 'hangars'));
      if (s.loops) bits.push(plural(s.loops, 'loop', 'loops'));
      if (s.skill) bits.push(plural(s.skill, 'skill shot', 'skill shots'));
      return 'Game over' + (bits.length ? ': ' + bits.slice(0, 2).join(', ') : '');
    },
    titleText: EMBER
      ? 'Wake the volcano! Shoot up the <b>heat ramp</b>, round the <b>orbits</b> and through the <b>obsidian</b> to build the <b>pressure</b>, then fire the ball into the <b>crater</b> for a <b>full eruption</b> &mdash; before the <b>quake</b> comes.'
      : 'Defend the planet from the invaders! Flip the ball up the <b>warp ramp</b>, round the <b>orbits</b> and into the <b>hangar</b>, knock down the five <b>invader targets</b>, and light the <b>top lanes</b> for a bigger bonus.',
    keysText: '<b>&larr; &rarr;</b> (or <b>Z</b> and <b>M</b>) to flip &middot; hold <b>Space</b> and let go to launch &middot; <b>&uarr;</b> to nudge &middot; <b>P</b> to pause',
    touchText: 'Tap the left or right half of the screen to flip. To launch, hold a finger down, then let go.',
    help: HELP,
    pad: [{ act: 'left', label: 'Flip' }, { act: 'fire', label: 'Launch', cls: 'fire' }, { act: 'right', label: 'Flip' }]
  });

  // ---------------------------------------------------------------- after the cabinet has built the page
  stageEl = document.getElementById('stage'); screenEl = document.getElementById('screen');
  if (!stageEl || !screenEl) return;
  // (capture: this runs before the cabinet's own screen press, and stops it when the press is a flipper's)
  stageEl.addEventListener('pointerdown', onDown, true);
  (function () {   // INTO THE VOLCANO's hard cut: a black frame over the table for a quarter of a second
    var st = document.createElement('style');
    st.textContent = '#pinCut{position:absolute;inset:0;z-index:3;background:#000;opacity:0;pointer-events:none}#pinCut.go{animation:pinCut .25s steps(1,end)}@keyframes pinCut{0%{opacity:1}100%{opacity:0}}';
    document.head.appendChild(st);
    CUT = document.createElement('div'); CUT.id = 'pinCut'; CUT.setAttribute('aria-hidden', 'true');
    var wr = document.getElementById('screenwrap'); if (wr) wr.appendChild(CUT);
  })();
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { window.addEventListener(n, onUp, true); });
  window.addEventListener('pointermove', onMove, true);
  // the two Flip buttons read the same, so say which is which
  [['left', 'Left flipper'], ['fire', 'Launch the ball (hold, then let go)'], ['right', 'Right flipper']].forEach(function (p) {
    var b = document.querySelector('#pad [data-pad="' + p[0] + '"]'); if (b) b.setAttribute('aria-label', p[1]);
  });

  // EMBER RUN's overlays (30 Oct 2026): the round line and bar, the banner, the pick card, the summary on the game-over card
  if (EMBER) (function () {
    var st = document.createElement('style'), wrap = document.getElementById('screenwrap');
    st.textContent = '#runHud{position:absolute;left:4%;right:4%;top:7.6%;z-index:2;pointer-events:none;font:700 max(15px,calc(var(--pu,1px)*8.5))/1.15 Archivo,sans-serif;letter-spacing:.06em;color:#ffe9c9;text-shadow:0 1px 3px #000,0 0 6px #000}'
      + '#runHud[hidden],#runBan[hidden]{display:none}#runHud .rh-l{display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin-bottom:3px}#runHud .rh-l b{color:#ffb347}#runHud .rh-l span{opacity:.92}'
      + '#runHud .rh-bar{position:relative;height:max(13px,calc(var(--pu,1px)*11));border-radius:99px;background:rgba(20,6,2,.78);border:1px solid rgba(255,140,50,.55);overflow:hidden;box-shadow:0 0 10px rgba(0,0,0,.6)}'
      + '#runHud .rh-bar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#ff3d00,#ff8a1a 70%,#ffc04a);transition:width .25s}'
      + '#runHud .rh-bar em{position:absolute;inset:0;display:grid;place-items:center;font-style:normal;font-size:.92em;color:#fff;text-shadow:0 1px 2px #000}'
      + '#runHud.hit .rh-bar{border-color:#ffd84a}#runHud.hit .rh-bar i{background:linear-gradient(90deg,#ffb000,#ffe066)}#runHud.hit .rh-l span{color:#ffd84a}'
      + '#runHud.flash .rh-bar{animation:rhFlash .35s 4 alternate}@keyframes rhFlash{to{box-shadow:0 0 22px #ffd84a,0 0 4px #fff;border-color:#fff}}'
      + '#runHud.boss .rh-l b{color:#ff5a3c}#runHud.boss .rh-bar{border-color:#ff5a3c}#runHud.boss .rh-bar i{background:linear-gradient(90deg,#8a0d00,#e0261b 60%,#ff6a3c)}'
      + '#runHud.shake .rh-bar{animation:rhShake .1s 4}@keyframes rhShake{50%{transform:translateX(3px)}}'
      + '#runHud .rh-balls{display:inline-flex;gap:3px;margin-left:auto}#runHud .rh-balls i{width:.62em;height:.62em;border-radius:50%;border:2px solid rgba(255,216,74,.6)}#runHud .rh-balls i.on{background:radial-gradient(circle at 35% 30%,#fff,#ffd84a 45%,#c47a10)}'
      + '#runHud .rh-clk{font-variant-numeric:tabular-nums;color:#fff;margin-left:8px}'
      + '#runHud .rh-next{display:flex;align-items:center;gap:8px;margin-top:4px;padding:3px 8px;border-radius:9px;background:rgba(14,5,2,.72);border:1px solid rgba(255,140,50,.45)}#runHud .rh-nt{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}'
      + '#runHud .rh-nt b{color:#ffb347;margin-right:4px}#runHud .rh-nt small{font-size:1em;font-weight:600;color:#ffd9b0}#runHud .rh-g{display:inline-flex;gap:2px;flex:none}#runHud .rh-g u{width:.7em;height:.55em;border-radius:2px;background:rgba(255,255,255,.18)}#runHud .rh-g u.on{background:#ff9a2a;box-shadow:0 0 5px #ff7a1a}'
      + '#runHud .rh-depth{display:flex;align-items:baseline;gap:5px;margin-top:4px;color:rgba(255,233,201,.55)}#runHud .rh-depth .at{color:#ffd84a}#runHud .rh-depth .q{opacity:.5}#runHud .rh-depth i{font-style:normal;opacity:.6}#runHud .rh-lava{margin-left:auto;color:#ff6a3c;font-variant-numeric:tabular-nums}'
      + '#runBan{position:absolute;left:4%;right:4%;top:24%;z-index:2;pointer-events:none;text-align:center;opacity:0}#runBan b{display:block;font:600 max(22px,calc(var(--pu,1px)*21))/1.05 "Clash Display",Archivo,sans-serif;letter-spacing:.03em;color:#ffd84a;text-shadow:0 0 14px rgba(255,106,26,.9),0 2px 3px #000}'
      + '#runBan small{display:block;margin-top:6px;font:700 max(12px,calc(var(--pu,1px)*9))/1.25 Archivo,sans-serif;color:#ffe9c9;text-shadow:0 1px 3px #000,0 0 6px #000}#runBan.rb-boss b{color:#ff5a3c}#runBan.rb-up b{color:#7fe8ff}'
      + '#runBan.rb-go{animation:rbGo 1.2s ease-out forwards}@keyframes rbGo{0%{opacity:0;transform:scale(1.2)}12%{opacity:1;transform:scale(1)}75%{opacity:1}100%{opacity:0}}'
      + '@media (prefers-reduced-motion:reduce){#runBan.rb-go{animation:rbFade 1.2s linear forwards}@keyframes rbFade{0%,75%{opacity:1}100%{opacity:0}}#runHud.flash .rh-bar,#runHud.shake .rh-bar{animation:none}}'
      + '#ov_pick.pz{display:none}#ov_pick .ovbox{border-color:rgba(255,122,40,.75);box-shadow:0 0 30px rgba(255,90,20,.35);background:rgba(18,6,2,.92)}#ov_pick .rp-h{color:#ffd84a}#ov_pick .rp-s{color:#ffd9b0;font-size:14px;margin:4px 0 8px}'
      + '#ov_pick .rp-m{margin:0 0 10px;padding:7px 10px;border-radius:10px;background:rgba(255,60,0,.13);border:1px dashed rgba(255,120,40,.6);text-align:left;font-size:13.5px;line-height:1.3}#ov_pick .rp-m:empty{display:none}'
      + '#ov_pick .rp-m small{display:block;font:700 11px Archivo,sans-serif;letter-spacing:.1em;color:#ff8a3a}#ov_pick .rp-m b{color:#ffb347;margin-right:6px}'
      + '#ov_pick .rp-q{margin:0 0 6px;font:700 13px Archivo,sans-serif;letter-spacing:.12em;color:#ffb347}#ov_pick .rp-cards{display:grid;gap:9px}'
      + '.rp-card{display:grid;grid-template-columns:22px 44px 1fr;align-items:center;gap:10px;width:100%;min-height:68px;padding:8px 12px 8px 8px;border-radius:14px;border:2px solid rgba(255,140,50,.45);background:linear-gradient(180deg,#2d1206,#170804);color:#ffe9c9;text-align:left;cursor:pointer;font:inherit}'
      + '.rp-card:hover,.rp-card.sel,.rp-card:focus-visible{border-color:#ffd84a;box-shadow:0 0 16px rgba(255,170,40,.5);outline:none}.rp-card.sel{background:linear-gradient(180deg,#4a1d08,#231006)}'
      + '.rp-k{display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:rgba(255,216,74,.16);color:#ffd84a;font:700 13px Archivo,sans-serif}'
      + '.rp-ic svg,.rs-chip svg{width:44px;height:44px;fill:none;stroke:#ff9a3a;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.rp-card.sel .rp-ic svg{stroke:#ffd84a}'
      + '.rp-t b{display:block;font:700 16px/1.15 Archivo,sans-serif;letter-spacing:.04em;color:#ffd84a}.rp-t b i{font-style:normal;color:#7fe8ff;font-size:13px}.rp-t small{display:block;margin-top:3px;font:500 13.5px/1.3 Archivo,sans-serif;color:#ffe9c9}'
      + '#oRun{display:none}#oRun .rs-tiles{grid-template-columns:1fr 1fr}#ov_over.runsum #oRun{display:block}#ov_over.runsum .ovbox{border-color:rgba(255,122,40,.75);box-shadow:0 0 30px rgba(255,90,20,.35)}#ov_over.runsum #oMore>.tiles{display:none}'
      + '#ov_over .oAgain{margin:10px 0 6px}#ov_over .oAgain #oPlay{width:100%;min-height:62px;font-size:23px;letter-spacing:.04em}#ov_over .oAgain #oStep{width:100%;margin-top:8px}'
      + '#oLines p{margin:6px 0;font:700 16px/1.3 Archivo,sans-serif}#oLines .ol-near{color:#ffd9b0}#oLines .ol-next{color:#ffd84a}'
      + '#oMore{margin-top:8px;text-align:left}#oMore>summary{cursor:pointer;min-height:44px;display:flex;align-items:center;justify-content:center;font:700 15px Archivo,sans-serif;color:#a9b7d6;list-style:none}#oMore>summary::-webkit-details-marker{display:none}#oMore>summary::after{content:" \\25BE";margin-left:6px}#oMore[open]>summary::after{content:" \\25B4"}#oMore .row{justify-content:center}'
      + '#oRun .rs-k{margin:0 0 6px;font:700 13px Archivo,sans-serif;letter-spacing:.14em;color:#ff8a3a}#oRun .rs-pips{display:flex;justify-content:center;gap:6px;margin:4px 0 8px}'
      + '#oRun .rs-pips i{width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.25)}#oRun .rs-pips i.bs{border-radius:4px}#oRun .rs-pips i.ok{background:#ffb000;border-color:#ffd84a}#oRun .rs-pips i.no{background:#5a0f08;border-color:#ff5a3c}'
      + '#oRun .rs-ups{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:10px 0 4px}#oRun .rs-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px 4px 6px;border-radius:99px;background:rgba(255,106,26,.16);border:1px solid rgba(255,140,50,.5);font:700 12.5px Archivo,sans-serif;color:#ffd9b0}'
      + '#oRun .rs-chip svg{width:18px;height:18px;stroke-width:4}#oRun .rs-none,#oRun .rs-mu{color:#a9b7d6;font-size:13px}#oRun .rs-best{margin:8px 0 0;color:#ffe8a3;font-size:14.5px}#oRun .rs-best b{color:#ffd84a}'
      + '#ov_title .picker button[data-val="run"] b{color:#ffb347}#ov_title .picker button[data-opt="game"][aria-pressed="true"]{border-color:#ff8a2a;background:rgba(255,106,26,.18);box-shadow:0 0 16px rgba(255,106,26,.45)}'
      + '#ov_title .picker button[data-val="run"]::before{content:"NEW";align-self:center;padding:1px 7px;border-radius:99px;background:#ff6a1a;color:#1a0702;font:700 10px Archivo,sans-serif;letter-spacing:.1em}';
    document.head.appendChild(st);
    HUD = document.createElement('div'); HUD.id = 'runHud'; HUD.hidden = true; HUD.setAttribute('aria-hidden', 'true');
    BAN = document.createElement('div'); BAN.id = 'runBan'; BAN.setAttribute('role', 'status'); BAN.setAttribute('aria-live', 'polite');
    PICK = document.createElement('div'); PICK.className = 'ov'; PICK.id = 'ov_pick'; PICK.hidden = true;
    PICK.innerHTML = '<div class="ovbox" role="dialog" aria-label="Choose an upgrade"><h2 class="rp-h">ROUND CLEARED</h2><p class="rp-s"></p><div class="rp-m"></div><p class="rp-q">CHOOSE AN UPGRADE</p><div class="rp-cards"></div><p class="soft">Keys 1, 2, 3 &middot; or the arrows and Enter</p></div>';
    wrap.appendChild(HUD); wrap.appendChild(BAN); wrap.appendChild(PICK);
    OVER = document.getElementById('ov_over');
    var why = document.getElementById('oWhy');
    OSUM = document.createElement('div'); OSUM.id = 'oRun';
    if (why && why.parentNode) (function () {
      var box = why.parentNode, play = document.getElementById('oPlay'), row = play && play.parentNode;
      var top = document.createElement('div'); top.className = 'oAgain';
      var nb = document.createElement('p'); nb.id = 'oNew'; nb.className = 'arc-new'; nb.hidden = true;   // (the cabinet's NEW HIGH SCORE line, made here so it sits under the heading)
      var lines = document.createElement('div'); lines.id = 'oLines';
      var det = document.createElement('details'); det.id = 'oMore'; det.innerHTML = '<summary>Details</summary>';
      box.insertBefore(top, why.nextSibling); box.insertBefore(nb, top); top.appendChild(play);
      box.insertBefore(lines, top.nextSibling);
      var hof = document.getElementById('oHof'); if (hof) box.insertBefore(hof, lines.nextSibling);
      det.appendChild(OSUM);
      ['.tiles', '#oBadges', '#oTro'].forEach(function (q) { var n = box.querySelector(':scope > ' + q); if (n) det.appendChild(n); });
      if (row) det.appendChild(row);
      box.appendChild(det);
    })();
    PICK.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-pick]'); if (b) choose(b.getAttribute('data-pick')); });
    // keys on the pick card: 1 2 3, or the arrows and Enter (before the cabinet's own keys, which would flip the frozen table)
    window.addEventListener('keydown', function (e) {
      var a = A3(); if (PICK.hidden || !a || a.mode !== 'play' || busy(e)) return;
      var k = e.key || '', c = PICK.querySelectorAll('[data-pick]'), n = c.length;
      if (/^(p|escape|f)$/i.test(k) || !n) return;   // (pause and full screen still work)
      if (/^[1-9]$/.test(k) && +k <= n) choose(c[+k - 1].getAttribute('data-pick'));
      else if (/^(arrowleft|arrowup|a|w)$/i.test(k)) { RS.sel = (RS.sel + n - 1) % n; markSel(true); }
      else if (/^(arrowright|arrowdown|d|s)$/i.test(k)) { RS.sel = (RS.sel + 1) % n; markSel(true); }
      else if (k === 'Enter' || k === ' ') choose(c[RS.sel].getAttribute('data-pick'));
      e.preventDefault(); e.stopImmediatePropagation();
    }, true);
  })();

  // for the tests (tools/pinball): the pieces of the controls that can be checked on their own
  // and the look (3D or flat; the last 240 3D draw times in ms, CPU side)
  window.PinLook = { get on() { return !!G3.world && document.body.classList.contains('pin3d'); }, get failed() { return G3.failed; }, get world() { return G3.world; }, ms: G3.ms, set: setLook,
    get shot() { return G3.shot; }, get aspect() { return G3.aspect; }, camMode: function () { return camMode(G3.set); } };
  // slow motion: the scale the game is being stepped at now, and how many of the cabinet's steps it has skipped
  window.PinSlow = { get scale() { return timeScale(A3() ? A3().mode : 'play'); }, get skipped() { return G3.skipped; }, step: stepGame,
    force: function (ts) { G3.force = ts == null ? null : Math.max(0.15, Math.min(1, +ts)); G3.slow = 0; } };
  // EMBER RUN: the run, whether the pick card is up, and a way to end the round now (hit: the target made, or the boss beaten)
  window.PinRunPage = { get run() { return RUN; }, get picking() { return !!PICK && !PICK.hidden; }, choose: choose,
    status: function () { var a = A3(); return RUN && a && a.world ? PR.status(RUN, a.world) : null; },
    endRound: function (hit) {
      var a = A3(), W = a && a.world; if (!RUN || !W || !W.run || RUN.phase !== 'play') return false;
      if (RUN.boss) { if (hit) { RUN.hp = 0; RUN.hit = true; } } else W.score = hit ? Math.max(W.score, RUN.start + RUN.target) : RUN.start;
      W.over = true; W.state = 'over'; return true;
    } };
  window.PinRender = { get drawn() { return RD.drawn; }, get skipped() { return RD.skipped; }, wake: wake };
  window.PinLevels = { get desc() { return DESC; }, active: function () { var a = A3(); return a && a.world ? active(a.world) : null; }, status: depth, cut: hardCut };
  window.PinControls = { sideOf: sideOf, waiting: waiting, letGo: letGo, held: function () { return { pointers: held, left: keysL, right: keysR }; } };
})();
