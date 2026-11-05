/* 365 Pinball Hero - a test of the page, its controls and its sounds (15 Oct 2026; Ember Peak, the camera settings and
 * slow motion, 16 Oct 2026; not deployed: tools/ only).
 * Opens games/pinball/ in headless Edge (playwright-core), checks the page loads without errors, takes screenshots of
 * the title card (desktop and phone), and drives the controls with real mouse, touch and key presses: which half of the
 * screen works which flipper, several fingers at once, the plunger from a press while the ball waits, the extra keys,
 * and that nothing stays held through a pause or the window losing focus. Every sound name is played through a
 * recording kit to check its numbers (an exponential ramp to 0 would silently kill a sound), Ember Peak's sounds with
 * an Ember world. Ember Peak (16 Oct 2026; one screen, one pair, 29 Oct 2026): the page plays it; each button works every flipper on its side; the Camera
 * and Look settings; slow motion steps the engine proportionally less (and a quick tap during a skipped step is still
 * seen); the attract mode's flythrough and the director; the flat look draws Ember Peak and scrolls with the ball.
 * EMBER RUN (30 Oct 2026): the mode choice, the round line and banner, the pick card (rounds ended early through
 * PinRunPage.endRound), keys, clicks and taps, the boss, the run summary, Classic untouched, and a 360 px phone.
 *
 *   py -m http.server 8481 --bind 127.0.0.1   (from the repo root, in another window)
 *   node tools/pinball/page-controls-test.cjs [http://127.0.0.1:8481] [out folder for screenshots]
 * playwright-core: PW_CORE (a path) or D:\claude\365-techies-website-launch-reel\node_modules\playwright-core. */
'use strict';
var path = require('path');
var pw = require(process.env.PW_CORE || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core');
var BASE = (process.argv[2] || 'http://127.0.0.1:8481').replace(/\/$/, '');
var OUT = process.argv[3] || path.join(__dirname, 'shots');
// (29 Oct 2026: Edge stopped starting headless on this PC; Chrome is used when it's installed, or set PW_BROWSER)
var EDGE = process.env.PW_BROWSER || (require('fs').existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
var fails = 0, passes = 0;
function ok(cond, what) { if (cond) { passes++; console.log('  ok   ' + what); } else { fails++; console.log('  FAIL ' + what); } }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function open(browser, opts) {
  var ctx = await browser.newContext(Object.assign({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) headless pinball-test' }, opts || {}));
  await ctx.route(/visitors-live|workers\.dev/, function (r) { return r.abort(); });   // never count a test as a visitor
  // count AudioContexts made, to see the cabinet's sound start after a press on the table
  await ctx.addInitScript(function () {
    window.__acs = 0;
    var C = window.AudioContext;
    if (C) window.AudioContext = function () { window.__acs++; return new C(); };
  });
  var page = await ctx.newPage(), errors = [], bad = [];
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); else if (m.type() === 'warning' && /PinCam|PinParticles|PinPost|failed/i.test(m.text())) errors.push('warning: ' + m.text()); });
  page.on('response', function (r) { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', function (r) { if (!/visitors-live|workers\.dev/.test(r.url())) bad.push('failed ' + r.url()); });
  await page.goto(BASE + '/games/pinball/', { waitUntil: 'load' });
  await page.waitForFunction(function () { return !!window.ARCADE365; });
  await sleep(400);
  return { ctx: ctx, page: page, errors: errors, bad: bad };
}
function realErrors(list) {   // the Hall of Fame's server isn't here (a plain file server): those are expected
  return list.filter(function (e) { return !/games-hof\.php|status of (404|501)|Failed to load resource/.test(e); });
}
function missing(list) {   // the spectacle add-ons may not be written yet: said, but not a failure of this page
  return list.filter(function (u) { return /\/(particles|post)\.js/.test(u); });
}

(async function main() {
  require('fs').mkdirSync(OUT, { recursive: true });
  var browser = await pw.chromium.launch({ executablePath: EDGE, headless: true, args: [...require('./gpu2.cjs')(), '--use-angle=d3d11'] });
  try {
    // ------------------------------------------------------------ desktop: load, title card, the parts present
    console.log('desktop 1280 x 900');
    var d = await open(browser, { viewport: { width: 1280, height: 900 } });
    var p = d.page;
    var parts = await p.evaluate(function () {
      return { engine: !!window.PinEngine, sound: !!(window.PinSound && PinSound.sound), controls: !!window.PinControls, flat: !!(window.PinFlat && PinFlat.draw),
        mode: ARCADE365.mode, title: document.title, table: ARCADE365.world.tableId, flippers: ARCADE365.world.flippers.length,
        cam: [].map.call(document.querySelectorAll('[data-opt="cam"]'), function (b) { return b.getAttribute('data-val'); }).join(','), look: [].map.call(document.querySelectorAll('[data-opt="look"]'), function (b) { return b.getAttribute('data-val'); }).join(','),
        camMode: window.PinLook && PinLook.camMode(), titleText: (document.querySelector('#ov_title') || {}).textContent || '', pilot: !!window.PinPilot, demo: !!window.PinDemo, pincam: !!window.PinCam, robots: (document.querySelector('meta[name=robots]') || {}).content,
        canvas: [document.getElementById('screen').width, document.getElementById('screen').height], h1: (document.querySelector('#ov_title h1') || {}).textContent,
        help: document.querySelectorAll('#dHelp .how li').length, pad: [].map.call(document.querySelectorAll('#pad [data-pad]'), function (b) { return b.getAttribute('data-pad') + ':' + b.getAttribute('aria-label'); }) };
    });
    console.log('  ' + JSON.stringify(parts));
    ok(parts.engine && parts.sound && parts.controls, 'PinEngine, PinSound and PinControls are on the page');
    ok(parts.mode === 'title' && parts.h1 === '365 Pinball Hero', 'the title card shows 365 Pinball Hero');
    ok(parts.robots === 'noindex', 'the page is noindex');
    ok(parts.help >= 15, 'How to play has the full list (' + parts.help + ' items)');
    ok(parts.table === 'ember' && parts.flippers === 2, 'the page plays Ember Peak (one screen: one pair of flippers)');
    ok(/volcano/i.test(parts.titleText) && /crater/i.test(parts.titleText), 'the title card speaks of Ember Peak (the volcano, the crater)');
    ok(parts.cam === 'arcade,classic,calm' && parts.look === '3d,flat', 'Settings has Camera (Arcade / Classic / Calm) and Look (3D / Flat)');
    ok(parts.camMode === 'calm', 'the camera starts Calm (' + parts.camMode + ')');
    var helpText = await p.evaluate(function () { return document.getElementById('dHelp').textContent; });
    ok(/crater/.test(helpText) && /wire rail/.test(helpText) && /geyser/i.test(helpText) && /pressure/i.test(helpText) && /eruption/i.test(helpText) && /quake/i.test(helpText), 'How to play explains the crater, wire rail, geyser, pressure, eruption and quake');
    ok(!/\b(fault|the big one|cash it|bank it)\b/i.test(helpText + parts.titleText), 'none of the banned words in the help or the title card');
    ok(parts.pad.length === 3 && /left:Left flipper/.test(parts.pad[0]), 'the pad buttons say which flipper is which');
    await p.screenshot({ path: path.join(OUT, 'title-desktop.png') });

    // ------------------------------------------------------------ the pure parts: which side, is the ball waiting
    var unit = await p.evaluate(function () {
      var C = PinControls, E = PinEngine, r = { left: 100, width: 270 }, out = {};
      out.sides = [C.sideOf(100, r), C.sideOf(234, r), C.sideOf(235, r), C.sideOf(369, r)];
      var W = E.newWorld(1, null, 7); out.fresh = C.waiting(W);
      for (var i = 0; i < 30; i++) E.step(W, {}); out.settled = C.waiting(W);
      var b = W.balls[0]; out.ball = [Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy)];
      for (i = 0; i < 40; i++) E.step(W, { pp: true }); out.pulling = C.waiting(W);
      E.step(W, {}); for (i = 0; i < 3; i++) E.step(W, {}); out.fired = C.waiting(W); out.vy = Math.round(W.balls[0].vy);
      var W2 = E.newWorld(1, null, 7); W2.balls.push({ m: 'free', x: 120, y: 300, vx: 0, vy: 0 }); out.two = C.waiting(W2);
      var W3 = E.newWorld(1, null, 7); W3.balls[0].m = 'ramp'; out.ramp = C.waiting(W3);
      out.none = C.waiting(null);
      return out;
    });
    console.log('  ' + JSON.stringify(unit));
    ok(unit.sides.join() === '-1,-1,1,1', 'sideOf: left of the middle is the left flipper, right is the right');
    ok(unit.fresh && unit.settled && unit.pulling, 'waiting: a served ball, settled, and while the plunger is pulled');
    ok(!unit.fired && unit.vy < -500, 'waiting: not once the ball is launched (vy ' + unit.vy + ')');
    ok(!unit.two && !unit.ramp && !unit.none, 'waiting: not with a second ball in play, a ball on the ramp, or no world');

    // ------------------------------------------------------------ play: mouse presses on each half
    await p.click('#tPlay');
    await sleep(200);
    var box = await p.locator('#screen').boundingBox();
    var midX = box.x + box.width / 2, y = box.y + box.height * 0.7;
    ok(await p.evaluate(function () { return ARCADE365.mode; }) === 'play', 'Play starts a game');
    ok(await p.evaluate(function () { return window.__acs; }) === 0, 'no sound yet (nothing pressed on the table)');
    // the first press, with the ball waiting: the left flipper AND the plunger
    await p.mouse.move(midX - 60, y); await p.mouse.down();
    await sleep(120);
    var s1 = await p.evaluate(function () { var i = ARCADE365.input, W = ARCADE365.world; return { pl: i.pl, pr: i.pr, pp: i.pp, fire: i.fire, on: W.flippers[0].on, pull: W.plunger.pull, acs: window.__acs }; });
    console.log('  ' + JSON.stringify(s1));
    ok(s1.pl && !s1.pr && s1.on, 'a press on the left half: the left flipper');
    ok(s1.pp && s1.pull > 0 && !s1.fire, 'with the ball waiting it also pulls the plunger (and never reaches the cabinet as Fire)');
    ok(s1.acs === 1, 'the press lets the cabinet start its sound');
    await sleep(500);
    await p.mouse.up();
    await sleep(150);
    var s2 = await p.evaluate(function () { var i = ARCADE365.input, W = ARCADE365.world, b = W.balls[0], tip = PinEngine.table(W.tableId).T.shooter.tip; return { pl: i.pl, pp: i.pp, y: b && Math.round(b.y), tip: tip, vy: b && Math.round(b.vy), launched: b && b.launched, on: W.flippers[0].on }; });
    console.log('  ' + JSON.stringify(s2));
    ok(!s2.pl && !s2.pp && !s2.on, 'letting go drops the flipper and lets the plunger go');
    ok(s2.y < s2.tip - 40 || s2.launched, 'and the ball is fired up the lane (y ' + s2.y + ', vy ' + s2.vy + ')');
    await sleep(600);
    // the right half, now the ball is in play: a flipper only
    await p.mouse.move(midX + 60, y); await p.mouse.down(); await sleep(80);
    var s3 = await p.evaluate(function () { var i = ARCADE365.input; return { pl: i.pl, pr: i.pr, pp: i.pp, on: ARCADE365.world.flippers[1].on }; });
    await p.mouse.up(); await sleep(50);
    ok(s3.pr && !s3.pl && !s3.pp && s3.on, 'a press on the right half once the ball is in play: the right flipper only');
    // beside the game screen (not full screen): nothing
    await p.mouse.move(box.x - 40, y); await p.mouse.down(); await sleep(50);
    var s4 = await p.evaluate(function () { var i = ARCADE365.input; return i.pl || i.pr || i.pp || i.fire; });
    await p.mouse.up();
    ok(!s4, 'a press beside the game screen on the page does nothing');

    // ------------------------------------------------------------ the keys
    await p.keyboard.down('z'); await sleep(40);
    var k1 = await p.evaluate(function () { var i = ARCADE365.input; return [i.pl, i.pr]; });
    await p.keyboard.down('ShiftRight'); await sleep(40);
    var k2 = await p.evaluate(function () { var i = ARCADE365.input; return [i.pl, i.pr]; });
    await p.keyboard.up('z'); await sleep(40);
    var k3 = await p.evaluate(function () { var i = ARCADE365.input; return [i.pl, i.pr]; });
    await p.keyboard.up('ShiftRight'); await sleep(40);
    var k4 = await p.evaluate(function () { var i = ARCADE365.input; return [i.pl, i.pr]; });
    ok(k1.join() === 'true,false' && k2.join() === 'true,true' && k3.join() === 'false,true' && k4.join() === 'false,false', 'Z and Right Shift: each flipper, together, let go one at a time');
    // each button works every flipper on its side (and none on the other)
    var sides = await p.evaluate(function () { return PinEngine.table(ARCADE365.world.tableId).T.flippers.map(function (f) { return f.side; }); });
    var wantL = sides.map(function (s) { return s < 0; }).join(), wantR = sides.map(function (s) { return s > 0; }).join();
    await p.keyboard.down('ArrowLeft'); await sleep(60);
    var st1 = await p.evaluate(function () { return ARCADE365.world.flippers.map(function (f) { return f.on; }).join(); });
    await p.keyboard.up('ArrowLeft'); await p.keyboard.down('ArrowRight'); await sleep(60);
    var st2 = await p.evaluate(function () { return ARCADE365.world.flippers.map(function (f) { return f.on; }).join(); });
    await p.keyboard.up('ArrowRight'); await sleep(60);
    ok(st1 === wantL && st2 === wantR, 'the left button raises every left flipper, the right every right one (' + st1 + ' / ' + st2 + ')');
    await p.keyboard.down('ShiftLeft'); await p.keyboard.down('m'); await sleep(40);
    var k5 = await p.evaluate(function () { var i = ARCADE365.input; return [i.pl, i.pr]; });
    await p.keyboard.up('m'); await p.keyboard.up('ShiftLeft');
    await p.keyboard.down('/'); await sleep(40);
    var k6 = await p.evaluate(function () { var i = ARCADE365.input; return [i.pl, i.pr]; });
    await p.keyboard.up('/'); await sleep(40);
    ok(k5.join() === 'true,true' && k6.join() === 'false,true', 'Left Shift + M, and / for the right flipper');

    // ------------------------------------------------------------ nothing stays held through a pause or losing focus
    await p.keyboard.down('z'); await p.mouse.move(midX + 50, y); await p.mouse.down(); await sleep(50);
    await p.keyboard.press('p'); await sleep(120);
    var h1 = await p.evaluate(function () { var i = ARCADE365.input; return { mode: ARCADE365.mode, pl: i.pl, pr: i.pr, pp: i.pp }; });
    await p.mouse.up(); await p.keyboard.up('z');
    ok(h1.mode === 'paused' && !h1.pl && !h1.pr && !h1.pp, 'P pauses and both flippers are let go');
    // paused: a press on the screen (the pause card covers it) is the cabinet's and works no flipper; Carry on resumes
    await p.mouse.move(midX - 50, y); await p.mouse.down(); await sleep(60);
    var h2 = await p.evaluate(function () { var i = ARCADE365.input; return { mode: ARCADE365.mode, pl: i.pl, pp: i.pp }; });
    await p.mouse.up(); await sleep(60);
    console.log('  ' + JSON.stringify(h2));
    ok(h2.mode === 'paused' && !h2.pl && !h2.pp, 'paused: a press on the pause card is not a flip');
    await p.click('#pGo'); await sleep(100);
    ok(await p.evaluate(function () { return ARCADE365.mode; }) === 'play', 'Carry on still works');
    await p.keyboard.down('z'); await sleep(40);
    await p.evaluate(function () { window.dispatchEvent(new Event('blur')); });
    await sleep(60);
    var h3 = await p.evaluate(function () { var i = ARCADE365.input; return { mode: ARCADE365.mode, pl: i.pl }; });
    await p.keyboard.up('z');
    ok(h3.mode === 'paused' && !h3.pl, 'the window losing focus pauses and lets go');
    await p.click('#pGo'); await sleep(100);
    // a sheet open: Z does nothing
    await p.click('#bHelp'); await sleep(100);
    await p.keyboard.down('z'); await sleep(40);
    var h4 = await p.evaluate(function () { return { mode: ARCADE365.mode, pl: ARCADE365.input.pl }; });
    await p.keyboard.up('z'); await p.keyboard.press('Escape'); await sleep(80);
    ok(h4.mode === 'paused' && !h4.pl, 'with How to play open, Z works no flipper');

    // ------------------------------------------------------------ slow motion: the engine stepped proportionally less
    await p.click('#pGo').catch(function () {}); await sleep(150);
    var sl = await p.evaluate(function () {
      var E = PinEngine, out = {};
      // on a world of its own (one evaluate: the page's own loop can't step in between)
      var W = E.newWorld(2, null, 9), inp = {};
      PinSlow.force(0.35);
      var f0 = W.frame;
      for (var i = 0; i < 2; i++) PinSlow.step(W, inp);
      out.skippedTwo = W.frame === f0;
      inp.plTap = true; PinSlow.step(W, inp);   // the third call: 1.05, a real step, which sees the tap
      out.tapSeen = W.flippers.every(function (f, k) { return f.on === (PinEngine.table(W.tableId).T.flippers[k].side < 0); }) && W.frame === f0 + 1 && !inp.plTap;
      f0 = W.frame; for (i = 0; i < 600; i++) PinSlow.step(W, {});
      out.per600 = W.frame - f0;
      // the same engine steps either way: a copy stepped plainly the same number of times is identical
      var A = E.newWorld(2, null, 11), Bw = E.newWorld(2, null, 11);
      PinSlow.force(1); for (i = 0; i < 30; i++) { E.step(A, { fire: true }); PinSlow.step(Bw, { fire: true }); }
      PinSlow.force(0.35);
      var n = 0; while (Bw.frame < 400) { PinSlow.step(Bw, {}); n++; }
      while (A.frame < 400) E.step(A, {});
      out.same = JSON.stringify(A.balls.map(function (b) { return [b.x, b.y]; })) === JSON.stringify(Bw.balls.map(function (b) { return [b.x, b.y]; })) && A.score === Bw.score;
      out.calls = n;
      PinSlow.force(null);
      return out;
    });
    console.log('  ' + JSON.stringify(sl));
    ok(sl.skippedTwo && sl.tapSeen, 'slow motion 0.35: two calls skip the engine, the third steps it - and a quick tap made meanwhile is still seen');
    ok(sl.per600 >= 208 && sl.per600 <= 212, 'slow motion 0.35: 600 of the cabinet\'s steps step the engine ' + sl.per600 + ' times (210)');
    ok(sl.same, 'slow motion changes only the pace: the same engine steps give exactly the same game (' + sl.calls + ' calls for 370 steps)');
    // and in the real loop, for a second each way
    var pace = await p.evaluate(async function () {
      var W = ARCADE365.world, w8 = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      PinSlow.force(0.35); var a = W.frame; await w8(1000); var slow = W.frame - a;
      PinSlow.force(1); a = W.frame; await w8(1000); var full = W.frame - a; PinSlow.force(null);
      return { slow: slow, full: full, mode: ARCADE365.mode };
    });
    console.log('  ' + JSON.stringify(pace));
    ok(pace.mode === 'play' && pace.full > 40 && pace.slow / pace.full > 0.25 && pace.slow / pace.full < 0.45, 'in the game, slow motion 0.35 runs the table at about a third of the pace (' + pace.slow + ' vs ' + pace.full + ' steps a second)');

    // ------------------------------------------------------------ the settings: the camera's mode and the look
    var cams = await p.evaluate(async function () {
      var w8 = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); }, out = {};
      function pick(k, v) { document.querySelector('[data-opt="' + k + '"][data-val="' + v + '"]').click(); }
      if (!window.PinCam) return { none: true };
      pick('cam', 'arcade'); await w8(150); out.arcade = PinCam.info().mode;
      pick('cam', 'classic'); await w8(150); out.classic = PinCam.info().mode;
      pick('cam', 'calm'); await w8(150); out.calm = PinCam.info().mode;
      out.saved = (JSON.parse(localStorage.getItem('pin365:settings') || '{}') || {}).cam;
      out.shot = !!PinLook.shot && typeof PinLook.shot.timeScale === 'number'; out.aspect = Math.round(PinLook.aspect * 1000) / 1000;
      pick('look', 'flat'); await w8(250); out.flatOn = !PinLook.on && typeof PinFlat.view === 'function' && PinFlat.view() >= 0;
      return out;
    });
    console.log('  ' + JSON.stringify(cams));
    if (cams.none) console.log('  (no camera.js on the page: camera checks skipped)');
    else {
      ok(cams.arcade === 'arcade' && cams.classic === 'classic' && cams.calm === 'calm' && cams.saved === 'calm', 'Settings > Camera sets the director\'s mode (Arcade, Classic, Calm) and is saved');
      ok(cams.shot && cams.aspect > 0.4 && cams.aspect < 0.8, 'the page keeps the camera\'s shot and gives it the 3D canvas\'s shape (' + cams.aspect + ')');
    }
    ok(cams.none || cams.flatOn, 'Settings > Look: Flat draws Ember Peak flat (scrolling with the ball)');
    await p.screenshot({ path: path.join(OUT, 'play-flat-desktop.png') });
    await p.evaluate(function () { document.querySelector('[data-opt="look"][data-val="3d"]').click(); });
    await sleep(300);
    ok(await p.evaluate(function () { return PinLook.on || PinLook.failed; }), 'and back to 3D');
    await p.screenshot({ path: path.join(OUT, 'play-desktop.png') });
    var errs = realErrors(d.errors);
    ok(errs.length === 0, 'desktop: no errors in the console' + (errs.length ? ': ' + errs.join(' | ') : ''));
    console.log('  (requests that failed, expected without the PHP server: ' + d.bad.length + ') ' + d.bad.slice(0, 4).join(', '));
    if (missing(d.bad).length) console.log('  NOTE: not on the server yet: ' + missing(d.bad).join(', '));
    await d.ctx.close();

    // ------------------------------------------------------------ EMBER RUN (30 Oct 2026): the modes, a round, the pick card, a boss, the summary, Classic untouched
    console.log('ember run 1280 x 900');
    var er = await open(browser, { viewport: { width: 1280, height: 900 } });
    p = er.page;
    var rt = await p.evaluate(function () {
      var bs = [].map.call(document.querySelectorAll('#ov_title [data-opt="game"]'), function (b) { return b.getAttribute('data-val') + ':' + b.getAttribute('aria-pressed'); });
      return { run: !!window.PinRun, page: !!window.PinRunPage, modes: bs.join(','), set: document.querySelectorAll('#dSet [data-opt="game"]').length };
    });
    console.log('  ' + JSON.stringify(rt));
    ok(rt.run && rt.page && rt.modes === 'run:true,classic:false', 'the title card offers EMBER RUN (picked by default) and CLASSIC');
    ok(rt.set === 2, 'Settings has Mode too (Ember Run / Classic)');
    await p.click('#tPlay'); await sleep(900);
    var r1 = await p.evaluate(function () {
      var W = ARCADE365.world, R = PinRunPage.run, hud = document.getElementById('runHud'), ban = document.getElementById('runBan');
      return { mode: ARCADE365.mode, run: !!W.run, mod: !!W.mod, total: W.total, round: R && R.round, phase: R && R.phase, hud: !hud.hidden && hud.textContent, ban: ban.textContent, pe: getComputedStyle(hud).pointerEvents + ',' + getComputedStyle(ban).pointerEvents, ball: document.getElementById('vWave').textContent };
    });
    console.log('  ' + JSON.stringify(r1));
    ok(r1.mode === 'play' && r1.run && r1.mod && r1.total === 1 && r1.round === 1 && r1.phase === 'play', 'Play starts an Ember Run: round 1, one ball, the run\'s table knobs (W.mod)');
    ok(/ROUND 1\/8/.test(r1.hud) && /TARGET/.test(r1.hud), 'the round line and target bar show (' + r1.hud + ')');
    ok(/ROUND 1 . TARGET/.test(r1.ban), 'the round banner shows (' + r1.ban + ')');
    ok(r1.pe === 'none,none', 'the round line and banner never take a press (the flippers\' screen stays free)');
    await p.screenshot({ path: path.join(OUT, 'run-round1-desktop.png') });
    // the round's end (forced): the pick card, the table waiting
    await p.evaluate(function () { PinRunPage.endRound(true); }); await sleep(400);
    var pk = await p.evaluate(async function () {
      var W = ARCADE365.world, f = W.frame; await new Promise(function (r) { setTimeout(r, 300); });
      var cards = [].map.call(document.querySelectorAll('#ov_pick [data-pick]'), function (b) { return b.getAttribute('data-pick'); });
      return { picking: PinRunPage.picking, mode: ARCADE365.mode, over: !document.getElementById('ov_over').hidden, cards: cards, offer: (PinRunPage.run.offer || []).join(), frozen: W.frame === f, phase: PinRunPage.run.phase,
        named: [].every.call(document.querySelectorAll('#ov_pick .rp-card'), function (b) { return b.querySelector('svg') && b.querySelector('b').textContent.length > 2 && b.querySelector('small').textContent.length > 8; }), mut: document.querySelector('#ov_pick .rp-m').textContent };
    });
    console.log('  ' + JSON.stringify(pk));
    ok(pk.picking && pk.phase === 'pick' && pk.mode === 'play' && !pk.over, 'a round made: the upgrade pick card, not the game-over card');
    ok(pk.cards.length === 3 && pk.cards.join() === pk.offer && pk.named, 'three cards, the run\'s own offer, each with a picture, a name and its effect');
    ok(pk.frozen, 'the table waits while the upgrade is picked');
    ok(/TABLE MUTATION/.test(pk.mut), 'the pick card announces the table\'s mutation (' + pk.mut + ')');
    await p.screenshot({ path: path.join(OUT, 'run-pick-desktop.png') });
    await p.keyboard.press('2'); await sleep(500);
    var r2 = await p.evaluate(function () { var R = PinRunPage.run, W = ARCADE365.world; return { picking: PinRunPage.picking, round: R.round, taken: R.taken.join(), ups: JSON.stringify(R.ups), muts: R.muts.length, frame: W.frame, run: W.run, score: W.score, banked: R.banked, ban: document.getElementById('runBan').textContent, ball: document.getElementById('vWave').textContent }; });
    console.log('  ' + JSON.stringify(r2));
    ok(!r2.picking && r2.round === 2 && r2.taken === pk.cards[1] && r2.muts === 1, 'key 2 takes the second upgrade and round 2 starts (' + r2.taken + ')');
    ok(r2.run && r2.frame > 0 && r2.frame < 120 && r2.score === r2.banked, 'round 2 is a fresh world in the same object, carrying the banked score');
    ok(/MUTATION/.test(r2.ban) && r2.ball === '2', 'round 2\'s banner names the mutation; the Ball chip shows the round');
    // arrows + Enter, then a click
    await p.evaluate(function () { PinRunPage.endRound(true); }); await sleep(400);
    var off3 = await p.evaluate(function () { return PinRunPage.run.offer.slice(); });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await sleep(400);
    var r3 = await p.evaluate(function () { var R = PinRunPage.run; return { round: R.round, last: R.taken[R.taken.length - 1] }; });
    ok(r3.round === 3 && r3.last === off3[2], 'arrows and Enter pick (the third card: ' + r3.last + ')');
    await p.evaluate(function () { PinRunPage.endRound(true); }); await sleep(400);
    var off4 = await p.evaluate(function () { return PinRunPage.run.offer.slice(); });
    await p.click('#ov_pick [data-pick="' + off4[0] + '"]'); await sleep(900);
    var bo = await p.evaluate(function () { var s = PinRunPage.status(), hud = document.getElementById('runHud'); return { round: s.round, boss: s.boss, hp: s.hp, hpMax: s.hpMax, hud: hud.textContent, cls: hud.className, ban: document.getElementById('runBan').textContent, ups: PinRunPage.run.taken.length }; });
    console.log('  ' + JSON.stringify(bo));
    ok(bo.ups === 3 && bo.round === 4, 'a click on a card picks it too');
    ok(bo.boss && bo.hp === bo.hpMax && bo.hpMax > 0 && /THE VOLCANO/.test(bo.hud) && /HP/.test(bo.hud) && /boss/.test(bo.cls), 'round 4 is the boss: THE VOLCANO with its HP bar (' + bo.hud + ')');
    ok(/VOLCANO WAKES/.test(bo.ban), 'the boss banner shows (' + bo.ban + ')');
    await p.screenshot({ path: path.join(OUT, 'run-boss-desktop.png') });
    // the boss not beaten: run over, the summary on the game-over card
    await p.evaluate(function () { PinRunPage.endRound(false); }); await sleep(900);
    var sm = await p.evaluate(function () {
      var o = document.getElementById('ov_over'), s = document.getElementById('oRun');
      return { mode: ARCADE365.mode, shown: !o.hidden, cls: o.classList.contains('runsum'), why: document.getElementById('oWhy').textContent, text: s.textContent, chips: s.querySelectorAll('.rs-chip').length, pips: s.querySelectorAll('.rs-pips i.ok').length,
        best: (function () { try { return JSON.parse(localStorage.getItem('pinball365.emberRun.best')); } catch (e) { return null; } })(), tiles: getComputedStyle(o.querySelector('.ovbox > .tiles')).display, picking: PinRunPage.picking };
    });
    console.log('  ' + JSON.stringify(sm));
    ok(sm.mode === 'over' && sm.shown && sm.cls && !sm.picking && /round 4/.test(sm.why), 'the boss survives: run over, the game-over card (' + sm.why + ')');
    ok(/3\/8/.test(sm.text) && /Rounds cleared/.test(sm.text) && sm.chips === 3 && sm.pips === 3 && sm.tiles === 'none', 'the summary: rounds cleared, the three upgrades as chips, the round pips');
    ok(sm.best && sm.best.cleared === 3 && /NEW BEST RUN/.test(sm.text), 'the best run is saved and said');
    await p.screenshot({ path: path.join(OUT, 'run-summary-desktop.png') });
    await p.click('#oPlay'); await sleep(500);
    var ag = await p.evaluate(function () { var R = PinRunPage.run; return { mode: ARCADE365.mode, round: R && R.round, taken: R && R.taken.length, cls: document.getElementById('ov_over').classList.contains('runsum') }; });
    ok(ag.mode === 'play' && ag.round === 1 && ag.taken === 0 && !ag.cls, 'Play again starts a new run from round 1');
    // CLASSIC: exactly the game it was
    var cl = await p.evaluate(async function () {
      document.querySelector('#dSet [data-opt="game"][data-val="classic"]').click();
      ARCADE365.begin(); await new Promise(function (r) { setTimeout(r, 700); });
      var W = ARCADE365.world, E = PinEngine, F = E.newWorld(W.speed, null, 5);
      return { mode: ARCADE365.mode, run: PinRunPage.run, wrun: !!W.run, mod: W.mod === undefined, total: W.total, balls: E.SPEEDS[W.speed].balls, keys: Object.keys(W).sort().join() === Object.keys(F).sort().join(),
        hud: document.getElementById('runHud').hidden, end: PinRunPage.endRound(true), saved: (JSON.parse(localStorage.getItem('pin365:settings') || '{}') || {}).game, ball: document.getElementById('vWave').textContent };
    });
    console.log('  ' + JSON.stringify(cl));
    ok(cl.mode === 'play' && cl.run === null && !cl.wrun && cl.mod && cl.total === cl.balls && cl.keys, 'CLASSIC: a plain world (no run, no W.mod, all ' + cl.balls + ' balls, the same fields as the engine\'s own)');
    ok(cl.hud && cl.end === false && cl.saved === 'classic' && cl.ball === '1', 'CLASSIC: no round line, nothing to end early, and the choice is saved');
    errs = realErrors(er.errors);
    ok(errs.length === 0, 'ember run: no errors in the console' + (errs.length ? ': ' + errs.join(' | ') : ''));
    await er.ctx.close();

    // ------------------------------------------------------------ EMBER RUN on a 360 px phone: readable, nothing off the screen
    console.log('ember run phone 360 x 780, touch');
    var ep = await open(browser, { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    p = ep.page;
    var tp = await p.evaluate(function () {
      return [].map.call(document.querySelectorAll('#ov_title [data-opt="game"]'), function (b) { var r = b.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), h: Math.round(r.height), vis: r.width > 0 }; });
    });
    console.log('  ' + JSON.stringify(tp));
    ok(tp.length === 2 && tp.every(function (b) { return b.vis && b.l >= 0 && b.r <= 360 && b.h >= 40; }), 'phone: both mode buttons on screen and big enough to tap');
    await p.screenshot({ path: path.join(OUT, 'run-title-phone.png') });
    await p.evaluate(function () { document.getElementById('tPlay').click(); }); await sleep(400);
    await p.evaluate(function () { if (!ARCADE365.immersive) ARCADE365.full(true); }); await sleep(900);
    var ph1 = await p.evaluate(function () { var h = document.getElementById('runHud'), r = h.getBoundingClientRect(), sc = document.getElementById('screen').getBoundingClientRect(); return { shown: !h.hidden, l: r.left, r: r.right, top: r.top - sc.top, bottom: r.bottom - sc.top, sh: sc.height, fs: parseFloat(getComputedStyle(h).fontSize) }; });
    console.log('  ' + JSON.stringify(ph1));
    ok(ph1.shown && ph1.l >= 0 && ph1.r <= 360 && ph1.fs >= 11 && ph1.bottom < ph1.sh * 0.25, 'phone: the round line sits at the top, on screen, at least 11 px (' + ph1.fs + ' px), far from the flippers');
    await p.screenshot({ path: path.join(OUT, 'run-play-phone.png') });
    await p.evaluate(function () { PinRunPage.endRound(true); }); await sleep(500);
    var ph2 = await p.evaluate(function () {
      var c = [].map.call(document.querySelectorAll('#ov_pick .rp-card'), function (b) { var r = b.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, fs: parseFloat(getComputedStyle(b.querySelector('small')).fontSize), sw: b.scrollWidth <= b.clientWidth + 1 }; });
      return { picking: PinRunPage.picking, cards: c, vh: innerHeight };
    });
    console.log('  ' + JSON.stringify(ph2));
    ok(ph2.picking && ph2.cards.length === 3 && ph2.cards.every(function (c) { return c.l >= 0 && c.r <= 360 && c.fs >= 12 && c.sw && c.b <= ph2.vh; }), 'phone: the three upgrade cards fit 360 px across, every word at least 12 px, all on screen');
    await p.screenshot({ path: path.join(OUT, 'run-pick-phone.png') });
    var tb = await p.locator('#ov_pick .rp-card').nth(0).boundingBox();
    var want0 = await p.evaluate(function () { return PinRunPage.run.offer[0]; });
    await p.touchscreen.tap(tb.x + tb.width / 2, tb.y + tb.height / 2); await sleep(500);
    var ph3 = await p.evaluate(function () { var R = PinRunPage.run, i = ARCADE365.input; return { round: R.round, last: R.taken[0], picking: PinRunPage.picking, held: i.pl || i.pr || i.pp }; });
    ok(ph3.round === 2 && ph3.last === want0 && !ph3.picking && !ph3.held, 'phone: a tap on a card picks it, and the tap works no flipper');
    errs = realErrors(ep.errors);
    ok(errs.length === 0, 'ember run phone: no errors in the console' + (errs.length ? ': ' + errs.join(' | ') : ''));
    await ep.ctx.close();

    // ------------------------------------------------------------ a phone: title card, full screen, two fingers
    console.log('phone 412 x 915, touch');
    var m = await open(browser, { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    p = m.page;
    await p.screenshot({ path: path.join(OUT, 'title-phone.png') });
    var cdp = await m.ctx.newCDPSession(p);
    function touch(type, pts) { return cdp.send('Input.dispatchTouchEvent', { type: type, touchPoints: pts }); }
    await p.evaluate(function () { document.getElementById('tPlay').click(); });
    await sleep(300);
    var imm = await p.evaluate(function () { return { mode: ARCADE365.mode, imm: ARCADE365.immersive, padless: document.body.classList.contains('padless') }; });
    console.log('  ' + JSON.stringify(imm));
    if (!imm.imm) await p.evaluate(function () { ARCADE365.full(true); });
    await sleep(300);
    box = await p.locator('#screen').boundingBox();
    var vw = 412, cx = box.x + box.width / 2, ty = box.y + box.height * 0.75;
    // finger 1 on the left with the ball waiting: left flipper + plunger
    await touch('touchStart', [{ x: cx - 80, y: ty, id: 1 }]); await sleep(80);
    var t1 = await p.evaluate(function () { var i = ARCADE365.input, F = ARCADE365.world.flippers; return { pl: i.pl, pr: i.pr, pp: i.pp, fire: i.fire, both: F.every(function (f, k) { return f.on === (PinEngine.table(ARCADE365.world.tableId).T.flippers[k].side < 0); }) }; });
    // finger 2 on the right
    await touch('touchStart', [{ x: cx - 80, y: ty, id: 1 }, { x: cx + 80, y: ty, id: 2 }]); await sleep(80);
    var t2 = await p.evaluate(function () { var i = ARCADE365.input; return { pl: i.pl, pr: i.pr, pp: i.pp, fire: i.fire }; });
    // finger 1 up: the right stays, the plunger fires (CDP: touchEnd lifts the points it lists)
    await touch('touchEnd', [{ x: cx - 80, y: ty, id: 1 }]); await sleep(150);
    var t3 = await p.evaluate(function () { var i = ARCADE365.input, b = ARCADE365.world.balls[0]; return { pl: i.pl, pr: i.pr, pp: i.pp, y: b && Math.round(b.y) }; });
    await touch('touchEnd', []); await sleep(80);
    var t4 = await p.evaluate(function () { var i = ARCADE365.input; return { pl: i.pl, pr: i.pr, pp: i.pp }; });
    console.log('  ' + JSON.stringify([t1, t2, t3, t4]));
    ok(t1.pl && !t1.pr && t1.pp && !t1.fire, 'touch: one finger on the left = left flipper (+ plunger while the ball waits), never Fire');
    ok(t1.both, 'touch: the left finger raises every left flipper and no right one');
    ok(t2.pl && t2.pr && t2.pp, 'touch: two fingers = both flippers (the first still pulling the plunger)');
    ok(!t3.pl && t3.pr && !t3.pp, 'touch: lifting the first finger fires the ball and keeps the second flipper up (y ' + t3.y + ')');
    ok(!t4.pl && !t4.pr && !t4.pp, 'touch: all fingers up, nothing held');
    // full screen: a finger below the picture still counts, by its side of the middle
    var below = Math.min(910, box.y + box.height + 20);
    var stageBox = await p.locator('#stage').boundingBox();
    if (below < stageBox.y + stageBox.height - 2 && below > box.y + box.height) {
      await touch('touchStart', [{ x: vw - 30, y: below, id: 3 }]); await sleep(80);
      var t5 = await p.evaluate(function () { var i = ARCADE365.input; return { pl: i.pl, pr: i.pr }; });
      await touch('touchEnd', []); await sleep(50);
      ok(!t5.pl && t5.pr, 'full screen: a finger under the picture on the right works the right flipper');
    } else console.log('  (no room under the picture at this size to test a press off the picture)');
    await sleep(1500);
    await p.screenshot({ path: path.join(OUT, 'play-phone.png') });
    var ph = await p.evaluate(function () { return { on: PinLook.on, failed: PinLook.failed, dpr: window.devicePixelRatio, shot: PinLook.shot && PinLook.shot.state }; });
    console.log('  ' + JSON.stringify(ph));
    ok(ph.on || ph.failed, 'phone: the 3D look is showing (or fell back to flat cleanly)');
    errs = realErrors(m.errors);
    ok(errs.length === 0, 'phone: no errors in the console' + (errs.length ? ': ' + errs.join(' | ') : ''));
    await m.ctx.close();

    // ------------------------------------------------------------ the sounds: every name through a recording kit
    console.log('sounds');
    var s = await open(browser, { viewport: { width: 800, height: 900 } });
    var snd = await s.page.evaluate(async function () {
      var names = ['extra', 'spin', 'reset', 'search', 'nudge', 'tilt', 'warn', 'drain', 'save', 'ramp', 'rampfail', 'rampin', 'eject', 'drops', 'jackpot',
        'saucer', 'skill', 'lane', 'mult', 'inlane', 'outlane', 'kickback', 'loop', 'orbit', 'ballend', 'tick', 'over', 'newball'];
      var objs = [{ sfx: 'flip', side: -1 }, { sfx: 'flip', side: 1 }, { sfx: 'launch', p: 0 }, { sfx: 'launch', p: 1 }, { sfx: 'launch', p: -1 }, { sfx: 'sling', side: -1 }, { sfx: 'sling', side: 1 },
        { sfx: 'rubber', v: 400 }, { sfx: 'wall', v: 2100 }, { sfx: 'bumper', i: 0 }, { sfx: 'bumper', i: 1 }, { sfx: 'bumper', i: 2 }, { sfx: 'drop', i: 0 }, { sfx: 'drop', i: 4 }, { sfx: 'combo', n: 2 }, { sfx: 'combo', n: 5 }];
      var bad = [], silent = [], calls = 0;
      function num(v) { return typeof v === 'number' && isFinite(v); }
      function kit(name) {
        function chk(kind, a) { calls++; var o = a[3] || {};
          if (kind === 'tone' && !(num(a[0]) && a[0] > 0 && num(a[1]) && a[1] > 0 && num(a[2]) && a[2] > 0 && a[2] <= 0.4)) bad.push(name + ' tone ' + JSON.stringify(a));
          if (kind === 'noise' && !(num(a[0]) && a[0] > 0 && num(a[1]) && a[1] > 0 && a[1] <= 0.4 && num(a[2]) && a[2] > 0)) bad.push(name + ' noise ' + JSON.stringify(a));
          if (o.to != null && !(num(o.to) && o.to > 0)) bad.push(name + ' to ' + o.to);
          if (o.pan != null && !(num(o.pan) && o.pan >= -1 && o.pan <= 1)) bad.push(name + ' pan ' + o.pan);
          if (o.when != null && !(num(o.when) && o.when >= 0)) bad.push(name + ' when ' + o.when);
        }
        return { tone: function () { chk('tone', arguments); }, noise: function () { chk('noise', arguments); } };
      }
      function play(name, e) { var before = calls; PinSound.sound(name, kit(name), e); if (calls === before) silent.push(name); }
      names.forEach(function (n) { if (n !== 'drain') play(n); });
      // the drain waits for the rest of its step: alone it plays; followed by a ball save it doesn't
      var dk = kit('drain'), d0 = calls; PinSound.sound('drain', dk); await new Promise(function (r) { setTimeout(r, 30); });
      var drainAlone = calls - d0;
      d0 = calls; PinSound.sound('drain', dk); var c1 = calls; PinSound.sound('save', kit('save')); var saveCalls = calls - c1;
      await new Promise(function (r) { setTimeout(r, 30); });
      var drainSaved = calls - d0 - saveCalls;
      objs.forEach(function (o) { play(o.sfx, o); });
      // the walls and the spinner: after a pause, 100 in a row play just one
      await new Promise(function (r) { setTimeout(r, 120); });
      var t0 = calls; for (var i = 0; i < 100; i++) PinSound.sound('wall', kit('wall'), { sfx: 'wall', v: 900 });
      var wallCalls = calls - t0;
      t0 = calls; for (i = 0; i < 100; i++) PinSound.sound('spin', kit('spin'), undefined);
      var spinCalls = calls - t0;
      await new Promise(function (r) { setTimeout(r, 120); });
      t0 = calls; PinSound.sound('rubber', kit('rubber'), { sfx: 'rubber', v: 380 }); var softCalls = calls - t0;
      var unknown = calls; PinSound.sound('no-such-sound', kit('x')); PinSound.sound('flip', null); unknown = calls - unknown;
      // Ember Peak's own sounds, with an Ember world (the cabinet passes the world as the fourth argument)
      await new Promise(function (r) { setTimeout(r, 900); });
      var EW = PinEngine.newWorld(2, null, 5, 'ember'), esil = [], en = 0;
      function eplay(name, e) { var before = calls; PinSound.sound(name, kit('ember ' + name), e, EW); en++; if (calls === before) esil.push(name); }
      ['crater', 'lavaopen', 'erupt', 'rail', 'railout', 'puff', 'geyser', 'lava', 'lavaclose', 'quake', 'overload', 'ramp', 'drops', 'orbit', 'loop', 'skill', 'drain', 'save'].forEach(function (n2) { eplay(n2); });
      [{ sfx: 'crab', i: 0 }, { sfx: 'pressure', level: 'full' }, { sfx: 'pressure', level: 'warn' }, { sfx: 'bumper', i: 0 }, { sfx: 'bumper', i: 2 }, { sfx: 'drop', i: 3 }, { sfx: 'flip', side: -1 }, { sfx: 'launch', p: 0.5 }].forEach(function (o) { eplay(o.sfx, o); });
      var qe = calls; PinSound.sound('quakeend', kit('quakeend'), null, EW); var quakeEnd = calls - qe;
      // the rumble: how loud it wants to be, and its frame hook with a kit that has no audio (nothing, no throw)
      var V = EW.toys.volcano, want = [];
      [0, 0.5, 1, 1.4].forEach(function (pr) { V.pressure = pr; want.push(Math.round(PinSound.want(EW, 'play', { sound: true }) * 1000) / 1000); });
      var paused = PinSound.want(EW, 'paused', { sound: true }), off = PinSound.want(EW, 'play', { sound: false }), threw = false;
      try { PinSound.frame(EW, kit('frame'), 'play', { sound: true }); PinSound.frame(EW, null, 'play', {}); } catch (e) { threw = true; }
      return { drainAlone: drainAlone, drainSaved: drainSaved, bad: bad, silent: silent, wallCalls: wallCalls, spinCalls: spinCalls, softCalls: softCalls, unknown: unknown, n: names.length + objs.length,
        emberSilent: esil, emberN: en, quakeEnd: quakeEnd, want: want, paused: paused, off: off, threw: threw };
    });
    console.log('  ' + JSON.stringify(snd));
    ok(snd.bad.length === 0, 'every sound\'s numbers are good (no zero or negative ramps, gains and pans in range)');
    // (the first few of the rubber/wall/spin calls above may fall inside the rate limit, so allow those to be silent)
    ok(snd.silent.filter(function (n) { return !/^(rubber|wall|spin)$/.test(n); }).length === 0, 'every event name makes a sound (' + snd.n + ' tried)' + (snd.silent.length ? ' silent: ' + snd.silent.join(',') : ''));
    ok(snd.wallCalls === 3, 'a burst of 100 wall knocks plays just one (' + snd.wallCalls + ' kit calls)');
    ok(snd.spinCalls === 1, 'a burst of 100 spinner ticks plays just one (' + snd.spinCalls + ' kit calls)');
    ok(snd.softCalls === 2, 'a gentle rubber knock still plays, quietly');
    ok(snd.drainAlone === 3 && snd.drainSaved === 0, 'a drain sounds, but not when ball save brings the ball straight back');
    ok(snd.unknown === 0, 'an unknown name, or no kit, plays nothing and throws nothing');
    ok(snd.emberSilent.filter(function (n) { return n !== 'drain'; }).length === 0 && snd.quakeEnd === 0, 'Ember Peak: every one of its ' + snd.emberN + ' sounds plays (the quake\'s end is the rumble fading)' + (snd.emberSilent.length ? ' silent: ' + snd.emberSilent.join(',') : ''));
    ok(snd.want[0] === 0 && snd.want[1] > 0 && snd.want[2] > snd.want[1] && snd.want[3] > snd.want[2] && snd.want[3] <= 0.45, 'the rumble grows with the pressure (' + snd.want.join(', ') + ')');
    ok(snd.paused === 0 && snd.off === 0 && !snd.threw, 'the rumble is silent when paused or with sound off, and its frame hook never throws');

    // ------------------------------------------------------------ the attract mode: a flythrough, then the bot under the director
    var at0 = await s.page.evaluate(function () { return { mode: ARCADE365.mode, cam: !!window.PinCam, flying: PinDemo.flying, shot: PinLook.shot && PinLook.shot.state, on: PinLook.on }; });
    await sleep(7600);
    var at1 = await s.page.evaluate(async function () {
      var W = ARCADE365.world, f = W.frame; await new Promise(function (r) { setTimeout(r, 1000); });
      return { flying: PinDemo.flying, shot: PinLook.shot && PinLook.shot.state, steps: W.frame - f, tid: W.tableId, demo: W.demo, pilot: PinPilot.version };
    });
    console.log('  ' + JSON.stringify([at0, at1]));
    if (at0.cam && at0.on) {
      ok(at0.flying && at0.shot === 'fly', 'attract: the title screen opens with a flythrough of the table');
      ok(!at1.flying && at1.shot === 'director' && at1.steps > 40, 'attract: then the bot plays Ember Peak under the camera director (' + at1.steps + ' steps a second)');
    } else ok(at1.steps > 40, 'attract: the bot plays the table (' + at1.steps + ' steps a second)');
    await s.page.screenshot({ path: path.join(OUT, 'attract-desktop.png') });
    errs = realErrors(s.errors);
    ok(errs.length === 0, 'sounds and attract: no errors in the console' + (errs.length ? ': ' + errs.join(' | ') : ''));
    await s.ctx.close();
  } finally {
    await browser.close();
  }
  console.log('\n' + passes + ' passed, ' + fails + ' failed. Screenshots in ' + OUT);
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(2); });
