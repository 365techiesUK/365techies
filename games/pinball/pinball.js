/* 365 Pinball Hero - the game on the page (15 Oct 2026, milestone 1): it puts the pinball table into the shared arcade
 * cabinet (../common/arcade.js - the bar, the sheets, the 60 Hz loop, Pause, scores, the Hall of Fame and phone full
 * screen), with the words for the title card and How to play, and the flipper controls the cabinet doesn't have.
 * The rules and physics are engine.js (window.PinEngine) on the table in table.js; the flat 8-bit picture is flat.js
 * (window.PinFlat) and the sounds sound.js (window.PinSound). The game is 270 x 480 game pixels: exactly 9:16, so a
 * 1080 x 1920 Short is a clean four times.
 *
 * Controls on top of the cabinet's own (arrows / A D flip, Space or Down pulls the plunger, Up or W nudges):
 *  - keys: Z and Left Shift work the left flipper; M, / and Right Shift the right one (pinball players' usual keys).
 *  - touch and mouse: while a ball is in play, the cabinet would treat a press on the screen as Fire. Pinball wants two
 *    flippers instead, so a press on the left half of the game screen works the left flipper and the right half the
 *    right one - several fingers at once. While the ball waits in the shooter lane, a press also pulls the plunger and
 *    letting go fires it. Full screen on a phone: a press anywhere counts, by which side of the middle it is.
 * Everything held is let go when the game pauses, the window loses focus or the page is hidden, so a flipper can never
 * stick up. Presses on buttons, links and the title / pause / game-over cards go to the cabinet as before. */
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
  // the player's ball is sitting in the shooter lane, waiting to be launched (and no other ball is in play)
  function waiting(W) {
    if (!W || W.over || W.state !== 'play' || !W.balls || W.balls.length !== 1) return false;
    var b = W.balls[0], SH = E.TABLE.shooter;
    return b.m === 'free' && b.x > SH.x0 && b.y > SH.tip - E.BALL - 8 && Math.abs(b.vx) + Math.abs(b.vy) < 60;
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

  // ---------------------------------------------------------------- the words
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function extraList(n) {
    var x = SP[n].extra.map(fmt);
    return x.slice(0, -1).join(', ') + ' and ' + x[x.length - 1] + ' on ' + SP[n].name;
  }
  var HELP = [
    '<b>The aim:</b> you are the hero defending a planet from the invaders of 365 Invaders. Keep the ball in play and score all you can &mdash; ' + SP[1].balls + ' balls on Gentle, ' + SP[2].balls + ' on Classic and Fast.',
    '<b>Launch:</b> hold <b>Space</b> or <b>&darr;</b> (or the Launch button) to pull the plunger back, and let go to fire. The longer you hold, the harder the shot; a quick tap gives a medium one. With a mouse or a finger: while the ball waits in the lane at the bottom right, press anywhere on the game screen, hold, and let go.',
    '<b>Flip:</b> the <b>&larr;</b> and <b>&rarr;</b> arrow keys work the left and right flippers &mdash; or <b>A</b> and <b>D</b>, <b>Z</b> and <b>M</b>, or the left and right <b>Shift</b> keys. With a mouse or a finger, press the left or right half of the game screen (two fingers at once are fine). Hold a flipper up to catch the ball and take aim; hit it near the tip to send it further across.',
    '<b>Nudge:</b> <b>&uarr;</b> or <b>W</b> gives the table a shove to rescue a ball. Too many close together and the screen warns you (DANGER) &mdash; then <b>TILT</b>: the flippers go dead and that ball&rsquo;s bonus is lost.',
    '<b>Skill shot:</b> as each ball goes in, one of the three top lanes flashes. Roll through that one before the ball touches anything else for <b>' + fmt(PTS.skill) + '</b>.',
    '<b>Top lanes:</b> ' + fmt(PTS.lane) + ' a lane. Light all three to raise the bonus multiplier (up to 5 times). The flippers move the lit lanes along, so you can line up the one you need.',
    '<b>Orb bumpers:</b> ' + fmt(PTS.bumper) + ' a hit. <b>Slingshots</b> (the rubber triangles above the flippers): ' + fmt(PTS.sling) + '.',
    '<b>Comet spinner</b> in the left orbit: ' + fmt(PTS.spin) + ' a turn &mdash; the faster the ball, the more it spins.',
    '<b>Orbits:</b> ' + fmt(PTS.orbit) + ' up either side. Up one and round and up the other within three seconds is a <b>LOOP</b>: ' + fmt(PTS.loop) + '.',
    '<b>Warp ramp</b> (the lane in the middle): ' + fmt(PTS.ramp) + '. Too slow and the ball rolls back down. Make it again within four seconds for a <b>COMBO</b>: double, then up to five times.',
    '<b>Invader targets:</b> ' + fmt(PTS.drop) + ' each. Knock down all five for ' + fmt(PTS.drops) + ' and the <b>HANGAR</b> behind them opens for 20 seconds: shoot the ball in for <b>' + fmt(PTS.saucerLit) + '</b> (' + fmt(PTS.saucer) + ' when it isn&rsquo;t open). All five down lights the kickback too.',
    '<b>Kickback:</b> when its light is on, a ball falling down the left outlane is fired straight back up. It is lit at the start of a game (on Gentle, at the start of every ball); after that, knock down all five invader targets to light it again.',
    '<b>Inlanes</b> (beside the flippers): ' + fmt(PTS.inlane) + '. <b>Outlanes</b> (the outside lanes, down to the drain): ' + fmt(PTS.outlane) + ', a small comfort.',
    '<b>Ball save:</b> for the first ' + SP[1].save + ' seconds of each ball on Gentle (' + SP[2].save + ' on Classic, ' + SP[3].save + ' on Fast), a ball that drains comes straight back: <b>BALL SAVED</b>.',
    '<b>Bonus:</b> most shots add to your bonus too. It is paid at the end of each ball, times the multiplier.',
    '<b>Extra balls</b> at ' + extraList(1) + '; ' + extraList(2) + '; ' + extraList(3) + '.',
    '<b>Settings:</b> <b>Speed</b> &mdash; Gentle is a flatter, slower table with ' + SP[1].balls + ' balls and the longest ball save; Classic is ' + SP[2].balls + ' balls; Fast is a steeper, quicker table for experts. <b>P</b> pauses, and the game pauses itself if you click away to another window.'
  ];

  A.start({
    id: 'pinball', store: 'pin365', title: '365 Pinball Hero', width: 270, height: 480, phoneFull: true, waveWord: 'ball',
    speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
    newWorld: function (speed, set) { return E.newWorld(speed, set, (Date.now() % 2147483646) + 1); },   // a different game every time
    step: function (W, input) {   // (with the latched quick taps: each one is seen as held for one step)
      var pp = input.pp, pl = input.pl, pr = input.pr;
      if (input.ppTap) input.pp = true; if (input.plTap) input.pl = true; if (input.prTap) input.pr = true;
      E.step(W, input);
      input.pp = pp; input.pl = pl; input.pr = pr; input.ppTap = input.plTap = input.prTap = false;
    },
    hud: E.hud,
    draw: function (g, W, t, mode, info) {
      if (mode !== 'play') letGo();   // paused, game over: nothing stays held
      if (window.PinFlat && typeof PinFlat.draw === 'function') return PinFlat.draw(g, W, t, mode, info);
      g.fillStyle = '#000'; g.fillRect(0, 0, 270, 480);   // (the picture hasn't loaded: a black screen, never an error)
    },
    sound: function (name, kit, e) { if (window.PinSound) PinSound.sound(name, kit, e); },
    quietSay: function () { return true; },   // the dot-matrix display shows the messages; the words are for screen readers
    overText: function (W) {
      var s = W.stats || {}, bits = [];
      if (s.ramps) bits.push(plural(s.ramps, 'ramp', 'ramps'));
      if (s.saucers) bits.push(plural(s.saucers, 'hangar', 'hangars'));
      if (s.loops) bits.push(plural(s.loops, 'loop', 'loops'));
      if (s.skill) bits.push(plural(s.skill, 'skill shot', 'skill shots'));
      return 'Game over' + (bits.length ? ': ' + bits.slice(0, 2).join(', ') : '');
    },
    titleText: 'Defend the planet from the invaders! Flip the ball up the <b>warp ramp</b>, round the <b>orbits</b> and into the <b>hangar</b>, knock down the five <b>invader targets</b>, and light the <b>top lanes</b> for a bigger bonus.',
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
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { window.addEventListener(n, onUp, true); });
  // the two Flip buttons read the same, so say which is which
  [['left', 'Left flipper'], ['fire', 'Launch the ball (hold, then let go)'], ['right', 'Right flipper']].forEach(function (p) {
    var b = document.querySelector('#pad [data-pad="' + p[0] + '"]'); if (b) b.setAttribute('aria-label', p[1]);
  });

  // for the tests (tools/pinball): the pieces of the controls that can be checked on their own
  window.PinControls = { sideOf: sideOf, waiting: waiting, letGo: letGo, held: function () { return { pointers: held, left: keysL, right: keysR }; } };
})();
