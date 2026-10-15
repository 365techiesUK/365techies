/* 365 Pinball Hero - a test of the page, its controls and its sounds (15 Oct 2026; not deployed: tools/ only).
 * Opens games/pinball/ in headless Edge (playwright-core), checks the page loads without errors, takes screenshots of
 * the title card (desktop and phone), and drives the controls with real mouse, touch and key presses: which half of the
 * screen works which flipper, several fingers at once, the plunger from a press while the ball waits, the extra keys,
 * and that nothing stays held through a pause or the window losing focus. Every sound name is played through a
 * recording kit to check its numbers (an exponential ramp to 0 would silently kill a sound).
 *
 *   py -m http.server 8463   (from the repo root, in another window)
 *   node tools/pinball/page-controls-test.cjs [http://127.0.0.1:8463] [out folder for screenshots]
 * playwright-core: PW_CORE (a path) or D:\claude\tools\playwright-check\node_modules\playwright-core. */
'use strict';
var path = require('path');
var pw = require(process.env.PW_CORE || 'D:/claude/tools/playwright-check/node_modules/playwright-core');
var BASE = (process.argv[2] || 'http://127.0.0.1:8463').replace(/\/$/, '');
var OUT = process.argv[3] || path.join(__dirname, 'shots');
var EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
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
  page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); });
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

(async function main() {
  require('fs').mkdirSync(OUT, { recursive: true });
  var browser = await pw.chromium.launch({ executablePath: EDGE, headless: true });
  try {
    // ------------------------------------------------------------ desktop: load, title card, the parts present
    console.log('desktop 1280 x 900');
    var d = await open(browser, { viewport: { width: 1280, height: 900 } });
    var p = d.page;
    var parts = await p.evaluate(function () {
      return { engine: !!window.PinEngine, sound: !!(window.PinSound && PinSound.sound), controls: !!window.PinControls, flat: !!(window.PinFlat && PinFlat.draw),
        mode: ARCADE365.mode, title: document.title, robots: (document.querySelector('meta[name=robots]') || {}).content,
        canvas: [document.getElementById('screen').width, document.getElementById('screen').height], h1: (document.querySelector('#ov_title h1') || {}).textContent,
        help: document.querySelectorAll('#dHelp .how li').length, pad: [].map.call(document.querySelectorAll('#pad [data-pad]'), function (b) { return b.getAttribute('data-pad') + ':' + b.getAttribute('aria-label'); }) };
    });
    console.log('  ' + JSON.stringify(parts));
    ok(parts.engine && parts.sound && parts.controls, 'PinEngine, PinSound and PinControls are on the page');
    ok(parts.mode === 'title' && parts.h1 === '365 Pinball Hero', 'the title card shows 365 Pinball Hero');
    ok(parts.robots === 'noindex', 'the page is noindex');
    ok(parts.help >= 15, 'How to play has the full list (' + parts.help + ' items)');
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
    var s2 = await p.evaluate(function () { var i = ARCADE365.input, W = ARCADE365.world, b = W.balls[0]; return { pl: i.pl, pp: i.pp, y: b && Math.round(b.y), vy: b && Math.round(b.vy), launched: b && b.launched, on: W.flippers[0].on }; });
    console.log('  ' + JSON.stringify(s2));
    ok(!s2.pl && !s2.pp && !s2.on, 'letting go drops the flipper and lets the plunger go');
    ok(s2.y < 420 || s2.launched, 'and the ball is fired up the lane (y ' + s2.y + ', vy ' + s2.vy + ')');
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
    var errs = realErrors(d.errors);
    ok(errs.length === 0, 'desktop: no errors in the console' + (errs.length ? ': ' + errs.join(' | ') : ''));
    console.log('  (requests that failed, expected without the PHP server: ' + d.bad.length + ') ' + d.bad.slice(0, 4).join(', '));
    await d.ctx.close();

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
    var t1 = await p.evaluate(function () { var i = ARCADE365.input; return { pl: i.pl, pr: i.pr, pp: i.pp, fire: i.fire }; });
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
    await p.screenshot({ path: path.join(OUT, 'play-phone.png') });
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
      var unknown = calls; PinSound.sound('no-such-sound', kit('x')); PinSound.sound('flip', null);
      return { drainAlone: drainAlone, drainSaved: drainSaved, bad: bad, silent: silent, wallCalls: wallCalls, spinCalls: spinCalls, softCalls: softCalls, unknown: calls - unknown, n: names.length + objs.length };
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
    await s.ctx.close();
  } finally {
    await browser.close();
  }
  console.log('\n' + passes + ' passed, ' + fails + ' failed. Screenshots in ' + OUT);
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(2); });
