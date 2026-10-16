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
 * A button works EVERY flipper on its side: on Ember Peak the shore's pair at the bottom and the summit's pair halfway up.
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
    var h = held[e.pointerId] = { side: sideOf(e.clientX, r), pull: !pulling && waiting(a.world) };
    try { stageEl.setPointerCapture(e.pointerId); } catch (er) {}
    apply();
    // a press can be over before the game's next step (a very quick tap): latched until the game has seen it
    if (h.pull) a.input.ppTap = true;
    if (h.side < 0) a.input.plTap = true; else a.input.prTap = true;
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
    '<b>Nudge:</b> <b>&uarr;</b> or <b>W</b> gives the table a shove to rescue a ball. Too many close together and the screen warns you (DANGER) &mdash; then <b>TILT</b>: the flippers go dead and that ball&rsquo;s bonus is lost.'
  ];
  var ENDS = [
    '<b>Ball save:</b> for the first ' + SP[1].save + ' seconds of each ball on Gentle (' + SP[2].save + ' on Classic, ' + SP[3].save + ' on Fast), a ball that drains comes straight back: <b>BALL SAVED</b>.',
    '<b>Bonus:</b> most shots add to your bonus too. It is paid at the end of each ball, times the multiplier.',
    '<b>Extra balls</b> at ' + extraList(1) + '; ' + extraList(2) + '; ' + extraList(3) + '.',
    '<b>Settings:</b> <b>Speed</b> &mdash; Gentle is a flatter, slower table with ' + SP[1].balls + ' balls and the longest ball save; Classic is ' + SP[2].balls + ' balls; Fast is a steeper, quicker table for experts. <b>Look</b> &mdash; the 3D table or the flat one (<b>R</b>). <b>Camera</b> &mdash; Calm follows the ball up the table now and then and dives into the crater the first time; Arcade does it more often, with more zoom and slow motion; Classic keeps the whole table in view and never moves (chosen for you if your device asks for less motion). The camera never moves in the last half second before the ball can reach a flipper. <b>P</b> pauses, and the game pauses itself if you click away to another window.'
  ];
  var HELP = EMBER ? [
    '<b>The aim:</b> Ember Peak is a volcano island waking up. Build up the pressure, shoot the ball into the crater and set off the full eruption &mdash; and score all you can. ' + SP[1].balls + ' balls on Gentle, ' + SP[2].balls + ' on Classic and Fast.',
    '<b>Two storeys:</b> the <b>shore</b> at the bottom and the <b>summit</b> halfway up each have their own pair of flippers. Each button works every flipper on its side, both storeys at once. A ball that falls between the summit flippers drops down to the shore.'
  ].concat(CONTROLS, [
    '<b>Skill shot:</b> as each ball goes in, one of the three top lanes flashes. Roll through that one before the ball touches anything else for <b>' + fmt(PT.skill) + '</b>.',
    '<b>Top lanes:</b> ' + fmt(PT.lane) + ' a lane. Light all three to raise the bonus multiplier (up to 5 times). The flippers move the lit lanes along, so you can line up the one you need.',
    '<b>Summit ramp</b> (the lane in the middle of the shore): ' + fmt(PT.ramp) + ', and it carries the ball up to the summit. Too slow and the ball rolls back down. Make it again within four seconds for a <b>COMBO</b>: double, then up to five times.',
    '<b>Orbits:</b> the long lanes up each side, ' + fmt(PT.orbit) + '. Up one and round and up again within four seconds is a <b>LOOP</b>: ' + fmt(PT.loop) + '. The spinner in the left orbit: ' + fmt(PT.spin) + ' a turn.',
    '<b>Obsidian targets</b> (the five black stones on the left of the shore): ' + fmt(PT.drop) + ' each. Knock down all five for ' + fmt(PT.drops) + ' and to light the kickback; they come back up two seconds later.',
    '<b>Pressure:</b> nearly every shot builds the volcano&rsquo;s pressure &mdash; the cone rises and the rumble under the table grows. When it is full the display says <b>ERUPT NOW</b>.',
    '<b>The crater:</b> from the summit flippers, shoot the ball firmly into the volcano&rsquo;s mouth: ' + fmt(PT.crater) + ', plus up to ' + fmt(PT.pressure) + ' more for the pressure inside. The volcano holds the ball for a moment, then fires it into the sky and down the <b>wire rail</b> into the left inlane (' + fmt(PT.rail) + ').',
    '<b>The full eruption:</b> shoot the crater at full pressure for <b>' + fmt(PT.eruption) + '</b> more. The lava gates rise and the two <b>lava lanes</b> at the sides of the summit open for 20 seconds: ' + fmt(PT.lava) + ' a lane.',
    '<b>The quake:</b> keep building pressure without erupting and the volcano overloads &mdash; <b>QUAKE COMING</b>: the island shakes and tips the ball sideways for a moment, the kickback goes off and the pressure drops back. The quake waits until no ball is close to a flipper.',
    '<b>Steam geyser</b> (the middle of the summit): a slow ball is caught, it puffs, then flings the ball up into the fumaroles: ' + fmt(PT.geyser) + '.',
    '<b>Fumaroles</b> (the pop bumpers under the top lanes): ' + fmt(PT.bumper) + ' a hit. <b>Magma crabs</b> walk about the island: ' + fmt(PT.crab) + ' for a hit, and the crab stops for a moment. <b>Slingshots</b> (the rubber triangles above the shore flippers): ' + fmt(PT.sling) + '.',
    '<b>Kickback:</b> when its light is on, a ball falling down the left outlane is fired straight back up. It is lit at the start of a game (on Gentle, at the start of every ball), and again by knocking down all five obsidian targets.',
    '<b>Inlanes</b> (beside the shore flippers): ' + fmt(PT.inlane) + '. <b>Outlanes</b> (the outside lanes, down to the drain): ' + fmt(PT.outlane) + ', a small comfort.'
  ], ENDS) : [
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
    var ts = timeScale(A3() ? A3().mode : 'play');
    if (ts < 1) {
      G3.slow += ts;
      if (G3.slow < 1) { G3.skipped++; return; }
      G3.slow -= 1;
    } else G3.slow = 0;
    var pp = input.pp, pl = input.pl, pr = input.pr;
    if (input.ppTap) input.pp = true; if (input.plTap) input.pl = true; if (input.prTap) input.pr = true;
    E.step(W, input);
    input.pp = pp; input.pl = pl; input.pr = pr; input.ppTap = input.plTap = input.prTap = false;
    // the effects (fx.js) see this step's events before the cabinet plays their sounds and clears them
    if (window.PinFX && W.events.length) { try { PinFX.events(W, W.events); } catch (e) {} }
  }

  A.start({
    id: 'pinball', store: 'pin365', title: '365 Pinball Hero', width: 270, height: 480, phoneFull: true, waveWord: 'ball',
    speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
    newWorld: function (speed, set) { G3.slow = 0; return E.newWorld(speed, set, (Date.now() % 2147483646) + 1); },   // a different game every time
    step: stepGame,
    hud: E.hud,
    // the look: 3D (the default) or the flat table. The 3D look draws on the screen at full sharpness (hires). The
    // camera: Calm (the default), Arcade or Classic (the default when the device asks for reduced motion)
    settings: [
      { key: 'look', type: 'seg', label: 'Look', small: G3.failed ? 'This browser can only show the flat table' : 'The 3D table or the flat one (R)', options: [['3d', '3D'], ['flat', 'Flat']], def: '3d' },
      { key: 'cam', type: 'seg', label: 'Camera', small: 'Calm follows the ball now and then; Arcade more, with slow motion; Classic never moves', options: [['arcade', 'Arcade'], ['classic', 'Classic'], ['calm', 'Calm']], def: REDUCED ? 'classic' : 'calm' }
    ],
    hires: function (set) { G3.set = set; return want3d(set); },
    draw: function (g, W, t, mode, info) {
      // the title screen: the table plays itself behind the card (demo.js); it may step the title world itself (at the
      // camera director's pace, and not at all during a flythrough)
      if (window.PinDemo) {
        var dts = G3.shot && mode === 'title' && performance.now() - G3.shotT < 250 && typeof G3.shot.timeScale === 'number' ? G3.shot.timeScale : 1;
        try { mode = PinDemo.frame(W, t, mode, dts) || mode; } catch (e) {}
      }
      if (mode !== 'play') letGo();   // paused, game over: nothing stays held
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
      ? 'Wake the volcano! Shoot up the <b>summit ramp</b>, round the <b>orbits</b> and through the <b>obsidian</b> to build the <b>pressure</b>, then fire the ball into the <b>crater</b> for a <b>full eruption</b> &mdash; before the <b>quake</b> comes.'
      : 'Defend the planet from the invaders! Flip the ball up the <b>warp ramp</b>, round the <b>orbits</b> and into the <b>hangar</b>, knock down the five <b>invader targets</b>, and light the <b>top lanes</b> for a bigger bonus.',
    keysText: '<b>&larr; &rarr;</b> (or <b>Z</b> and <b>M</b>) to flip &middot; hold <b>Space</b> and let go to launch &middot; <b>&uarr;</b> to nudge &middot; <b>P</b> to pause',
    touchText: 'Tap the left or right half of the screen to flip (each side works its flippers on both storeys). To launch, hold a finger down, then let go.',
    help: HELP,
    pad: [{ act: 'left', label: 'Flip' }, { act: 'fire', label: 'Launch', cls: 'fire' }, { act: 'right', label: 'Flip' }]
  });

  // ---------------------------------------------------------------- after the cabinet has built the page
  stageEl = document.getElementById('stage'); screenEl = document.getElementById('screen');
  if (!stageEl || !screenEl) return;
  // (capture: this runs before the cabinet's own screen press, and stops it when the press is a flipper's)
  stageEl.addEventListener('pointerdown', onDown, true);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { window.addEventListener(n, onUp, true); });
  // the two Flip buttons read the same, so say which is which
  [['left', 'Left flipper'], ['fire', 'Launch the ball (hold, then let go)'], ['right', 'Right flipper']].forEach(function (p) {
    var b = document.querySelector('#pad [data-pad="' + p[0] + '"]'); if (b) b.setAttribute('aria-label', p[1]);
  });

  // for the tests (tools/pinball): the pieces of the controls that can be checked on their own
  // and the look (3D or flat; the last 240 3D draw times in ms, CPU side)
  window.PinLook = { get on() { return !!G3.world && document.body.classList.contains('pin3d'); }, get failed() { return G3.failed; }, get world() { return G3.world; }, ms: G3.ms, set: setLook,
    get shot() { return G3.shot; }, get aspect() { return G3.aspect; }, camMode: function () { return camMode(G3.set); } };
  // slow motion: the scale the game is being stepped at now, and how many of the cabinet's steps it has skipped
  window.PinSlow = { get scale() { return timeScale(A3() ? A3().mode : 'play'); }, get skipped() { return G3.skipped; }, step: stepGame,
    force: function (ts) { G3.force = ts == null ? null : Math.max(0.15, Math.min(1, +ts)); G3.slow = 0; } };
  window.PinControls = { sideOf: sideOf, waiting: waiting, letGo: letGo, held: function () { return { pointers: held, left: keysL, right: keysR }; } };
})();
