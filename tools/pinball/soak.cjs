/* 365 Pinball Hero - the soak (wave 3, 5 Nov 2026; ported from the audit's 05-qa-playtester scratch). A long headless
 * session of real play on the page: the pilot (pilot.js) plays through the cabinet with a human-ish lag and the odd
 * fumble, picks upgrades in Ember Run, pauses and carries on now and then, and starts a new game from the game-over
 * card with Space. It watches for errors, stuck balls (still for 10 s in play), softlocks (the frame frozen in play,
 * the pick card and the run's phase out of step, a ball never launched), NaN or lost balls, and the JS heap.
 *
 *   node tools/pinball/heavy.cjs soak node tools/pinball/soak.cjs <run|classic> <minutes> [phone] [base url] [out folder]
 * e.g. the acceptance pair: run 15 (desktop Ember Run) and classic 10 phone. Exit code 1 if any check fails.
 * Headless Chrome on the second graphics card (gpu2.cjs), focus emulation and bringToFront (or rAF stops). */
'use strict';
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW_CORE || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core');
const MODE = process.argv[2] === 'classic' ? 'classic' : 'run', MIN = +(process.argv[3] || 15), PHONE = process.argv[4] === 'phone';
const BASE = (process.argv[PHONE ? 5 : 4] && /^http/.test(process.argv[PHONE ? 5 : 4]) ? process.argv[PHONE ? 5 : 4] : 'http://127.0.0.1:8705').replace(/\/$/, '');
const OUT = process.argv[PHONE ? 6 : 5] || path.join(__dirname, 'shots', 'soak-' + MODE + (PHONE ? '-phone' : ''));
const CHROME = process.env.PW_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(OUT, { recursive: true });
const T0 = Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function log() { const s = ((Date.now() - T0) / 1000).toFixed(0).padStart(5) + 's ' + [].join.call(arguments, ' '); console.log(s); fs.appendFileSync(path.join(OUT, 'soak.log'), s + '\n'); }

(async () => {
  const browser = await pw.chromium.launch({ headless: true, executablePath: CHROME, args: [...require('./gpu2.cjs')(), '--use-angle=d3d11', '--enable-precise-memory-info'] });
  const ctx = await browser.newContext(PHONE
    ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 headless pinball-soak' }
    : { viewport: { width: 1280, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) headless pinball-soak' });
  await ctx.route(/visitors-live|workers\.dev|games-hof\.php/, (r) => r.abort());
  await ctx.addInitScript((s) => { try { localStorage.setItem('pin365:settings', JSON.stringify(s)); } catch (e) {} }, { speed: 2, sound: true, game: MODE });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/games-hof\.php|status of (404|501)|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await page.goto(BASE + '/games/pinball/', { waitUntil: 'load' });
  await page.bringToFront();
  await page.waitForFunction(() => !!window.ARCADE365 && !!window.PinPilot);
  await sleep(1500);
  await page.evaluate(() => {   // the pilot plays the cabinet's world (or the level below it), with lag and fumbles
    const A = window.ARCADE365, E = window.PinEngine, P = window.PinPilot;
    const Q = window.__soak = { steps: 0, nan: 0, lost: 0, still: [], drains: 0, ev: {} };
    let s = 12345, lag = 0, q = [], fumble = 0, ballNo = -1, track = [];
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const orig = E.step;
    E.step = function (W, input) {
      const mine = A.mode === 'play' && !W.demo && (W === A.world || (window.PinLevels && PinLevels.active() === W));
      if (mine) {
        if (W.ball !== ballNo || W.frame < 2) { ballNo = W.ball; lag = Math.floor(rnd() * 3); q = []; track = []; }
        q.push(P.input(W));
        let o = q.length > lag ? q.shift() : {};
        if (fumble > 0) { fumble--; o = { fire: o.fire }; } else if (rnd() < 1 / 1500) fumble = 3 + Math.floor(rnd() * 4);
        input.left = !!o.left; input.right = !!o.right; input.fire = !!o.fire;
      }
      const res = orig.apply(this, arguments);
      if (!mine) return res;
      Q.steps++;
      W.events.forEach((e) => { const n = typeof e === 'string' ? e : (e && e.sfx) || '?'; Q.ev[n] = (Q.ev[n] || 0) + 1; if (n === 'drain') Q.drains++; });
      W.balls.forEach((b, i) => {
        if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.vx) || !isFinite(b.vy)) Q.nan++;
        if (b.x < -10 || b.x > 290 || b.y < -10 || b.y > 520) Q.lost++;
        const t = track[i] || (track[i] = { x: b.x, y: b.y, f: W.frame });
        if (Math.abs(b.x - t.x) + Math.abs(b.y - t.y) > 3 || b.m !== 'free' || W.state !== 'play') { t.x = b.x; t.y = b.y; t.f = W.frame; }
        else if (W.frame - t.f > 600) { if (Q.still.length < 40) Q.still.push({ x: Math.round(b.x), y: Math.round(b.y), f: W.frame, table: W.tableId }); t.f = W.frame; }
      });
      return res;
    };
    if (window.HallOfFame) { HallOfFame.run = () => null; }
  });
  const st = () => page.evaluate(() => {
    const A = ARCADE365, W = A.world, RP = window.PinRunPage, R = RP && RP.run;
    return { mode: A.mode, frame: W && W.frame, state: W && W.state, score: W && W.score, picking: !!(RP && RP.picking), phase: R && R.phase, round: R && R.round, offer: R && R.offer ? R.offer.slice() : null, run: !!(W && W.run) };
  });
  const heap = async () => { const m = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : null); return m ? +(m / 1048576).toFixed(1) : null; };
  const fails = [];
  if (PHONE) await page.tap('#tPlay'); else await page.click('#tPlay');
  await sleep(800);
  let playMs = 0, lastT = Date.now(), lastFrame = -1, frameT = Date.now(), pickSince = 0, readySince = 0, mismatch = 0, games = 0, picks = 0, nextPause = 120000, nextMin = 60000;
  const heaps = [await heap()];
  while (playMs < MIN * 60000) {
    await sleep(250);
    const now = Date.now(), s = await st();
    if (s.mode === 'play') playMs += now - lastT;
    lastT = now;
    if (s.mode === 'over') {
      games++; log('GAME OVER', games, 'score', s.score, s.run ? 'round ' + s.round : '');
      await sleep(1200); await page.keyboard.press('Space'); await sleep(900);
      if ((await st()).mode !== 'play') { fails.push('Space did not restart from the game-over card'); await page.evaluate(() => ARCADE365.begin()); await sleep(500); }
      lastT = Date.now(); frameT = Date.now(); continue;
    }
    if (s.mode === 'title') { if (PHONE) await page.tap('#tPlay'); else await page.click('#tPlay'); await sleep(800); continue; }
    if (s.mode === 'paused') { await page.keyboard.press('p'); await sleep(300); continue; }
    if (s.picking && s.phase === 'pick') {
      if (!pickSince) pickSince = now;
      else if (now - pickSince > 1000) {
        picks++; await page.keyboard.press(String(1 + (picks % 3))); await sleep(500);
        const a = await st(); if (a.picking || a.phase !== 'play') fails.push('the pick did not take (round ' + s.round + ')');
        pickSince = 0; frameT = Date.now();
      }
      continue;
    }
    pickSince = 0;
    if (s.frame !== lastFrame) { lastFrame = s.frame; frameT = now; }
    else if (now - frameT > 5000) { fails.push('softlock: the frame frozen 5 s in play at ' + JSON.stringify(s)); await page.screenshot({ path: path.join(OUT, 'frozen.png') }).catch(() => {}); frameT = now; }
    if ((s.picking && s.phase !== 'pick') || (s.run && s.phase === 'pick' && !s.picking)) { if (!mismatch) mismatch = now; else if (now - mismatch > 3000) { fails.push('softlock: pick card and phase out of step'); mismatch = 0; } } else mismatch = 0;
    if (s.state === 'ready') { if (!readySince) readySince = now; else if (now - readySince > 25000) { fails.push('softlock: ball not launched for 25 s'); readySince = now + 60000; } } else readySince = 0;
    if (playMs > nextPause) {
      nextPause += 120000;
      await page.keyboard.press('p'); await sleep(500);
      const f1 = await page.evaluate(() => ({ m: ARCADE365.mode, f: ARCADE365.world.frame })); await sleep(600);
      const f2 = await page.evaluate(() => ARCADE365.world.frame);
      await page.keyboard.press('p'); await sleep(300);
      if (f1.m === 'paused' && f2 !== f1.f) fails.push('the game moved while paused');
      lastT = Date.now(); frameT = Date.now();
    }
    if (playMs > nextMin) { nextMin += 60000; heaps.push(await heap()); log('minute', Math.round(playMs / 60000), 'heap MB', heaps[heaps.length - 1], 'games', games, 'picks', picks); }
  }
  // the heap after a forced collection, against the first minute's
  try { await cdp.send('HeapProfiler.collectGarbage'); } catch (e) {}
  await sleep(500); heaps.push(await heap());
  const Q = await page.evaluate(() => window.__soak);
  const h0 = heaps[1] || heaps[0], h1 = heaps[heaps.length - 1], growth = h0 && h1 ? (h1 - h0) / h0 : 0;
  if (errors.length) fails.push(errors.length + ' errors: ' + errors.slice(0, 3).join(' | '));
  if (Q.still.length) fails.push(Q.still.length + ' stuck balls: ' + JSON.stringify(Q.still.slice(0, 3)));
  if (Q.nan || Q.lost) fails.push('NaN ' + Q.nan + ', lost ' + Q.lost);
  if (growth > 0.25) fails.push('heap grew ' + Math.round(growth * 100) + '% (' + h0 + ' -> ' + h1 + ' MB)');
  const sum = { mode: MODE, phone: PHONE, playMin: +(playMs / 60000).toFixed(1), steps: Q.steps, games, picks, drains: Q.drains, heapMB: heaps, heapGrowth: +(growth * 100).toFixed(1) + '%', errors: errors.slice(0, 10), still: Q.still, fails };
  fs.writeFileSync(path.join(OUT, 'soak.json'), JSON.stringify(sum, null, 1));
  log('DONE', JSON.stringify({ playMin: sum.playMin, games, picks, errors: errors.length, stuck: Q.still.length, softlocks: fails.filter((f) => /softlock/.test(f)).length, heapGrowth: sum.heapGrowth }));
  fails.forEach((f) => log('FAIL', f));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { log('CRASH', e && e.stack || e); process.exit(2); });
