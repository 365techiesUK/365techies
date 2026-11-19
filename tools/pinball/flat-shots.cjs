/* 365 Pinball Hero - screenshots of the flat look (15 Oct 2026), never deployed. Drives tools/pinball/flat-preview.html
 * in headless Edge through Playwright and saves PNGs of set moments: the title, play, a ball up on the warp ramp, the
 * targets down with lights on, a DMD message - plus the draw cost per frame.
 *   node tools/pinball/flat-shots.cjs <outDir> [port] [scale]
 * Needs the site served on the port first (py -m http.server 8462 from the repo root). Playwright is borrowed from
 * another project on this PC (PLAYWRIGHT env var to point elsewhere). */
'use strict';
const path = require('path');
const fs = require('fs');
const PW = process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright';
const { chromium } = require(PW);
const out = process.argv[2] || '.';
const port = process.argv[3] || '8462';
const scale = process.argv[4] || '2';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage({ viewport: { width: 270 * +scale + 40, height: 480 * +scale + 40 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/tools/pinball/flat-preview.html?still=1&scale=${scale}`);
  await page.waitForFunction(() => window.bench && window.PinFlat);
  const shot = async (name) => { await page.locator('#view').screenshot({ path: path.join(out, name + '.png') }); };

  // 1. the title screen
  await page.evaluate(() => { bench.newWorld(1, 365); bench.W.demo = true; bench.setMode('title'); bench.render(1000); });
  await shot('1-title');

  // 2. play: launch and let the auto-flipper play for a while
  await page.evaluate(() => { bench.newWorld(1, 7); bench.setMode('play'); bench.step(260); bench.render(5000); });
  await shot('2-play');

  // 3. a ball up on the warp ramp (placed there by hand), with lights on
  await page.evaluate(() => {
    const W = bench.W, E = bench.E, b = W.balls[0] || {};
    const r = E.rampAt(E.RAMP.L * 0.42);
    Object.assign(b, { m: 'ramp', s: E.RAMP.L * 0.42, x: r.x, y: r.y, z: r.z });
    W.lit.ramp = 30; W.comboT = 100; W.lanes = [true, false, true]; W.mult = 3; W.saveT = 400;
    bench.render(6000);
  });
  await shot('3-ramp');

  // 4. drop targets down, one just hit, the hangar lit, the kickback lit
  await page.evaluate(() => {
    const W = bench.W;
    W.balls.forEach((b) => { b.m = 'free'; });
    W.drops = [false, true, false, false, true]; W.lit.drop = [0, 0, 12, 0, 0]; W.saucerLit = true; W.kickback = true;
    W.lit.bump = [5, 0, 0]; W.lit.sling = [5, 0]; W.mult = 5; W.saveT = 0; W.skillOpen = true; W.skill = 1;
    W.spin.a = 0.05;
    bench.render(6100);
  });
  await shot('4-targets');

  // 5. a DMD message
  await page.evaluate(() => { const W = bench.W; W.dmd = { big: 'HANGAR JACKPOT', small: 'SHOOT IT FOR 15,000', t: 150, n: 60 }; bench.render(7000); });
  await shot('5-dmd-message');
  await page.evaluate(() => { const W = bench.W; W.dmd = { big: 'TILT', small: '', t: 150, n: 60 }; bench.render(7000); });
  await shot('6-dmd-big');

  // the draw cost: a fresh game played for 1,200 frames, drawing every one
  const cost = await page.evaluate(() => {
    bench.newWorld(1, 11); bench.setMode('play'); bench.costs.length = 0;
    const all = [];
    for (let i = 0; i < 1200; i++) { bench.step(1); const c0 = performance.now(); bench.render(i * 16.7); all.push(performance.now() - c0); }
    all.sort((a, b) => a - b);
    return { frames: all.length, mean: all.reduce((a, b) => a + b, 0) / all.length, p50: all[600], p95: all[1140], max: all[all.length - 1], score: bench.W.score, flips: Object.keys(window.PinFlat).length };
  });
  console.log(JSON.stringify({ cost, errors }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
