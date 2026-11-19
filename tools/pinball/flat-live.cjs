/* 365 Pinball Hero - the flat look in real moments from the physics (15 Oct 2026), never deployed: a ball fired up
 * the warp ramp and caught on its way round, the hangar's saucer holding a ball, a flipper mid-swing, game over, and
 * the one-off cost of building the layers on the first frame.
 *   node tools/pinball/flat-live.cjs <outDir> [port] */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright');
const out = process.argv[2] || '.', port = process.argv[3] || '8462', S = 2;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 270 * S + 40, height: 480 * S + 40 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/tools/pinball/flat-preview.html?still=1&scale=${S}`);
  await page.waitForFunction(() => window.bench && window.PinFlat);
  const shot = (name) => page.locator('#view').screenshot({ path: path.join(out, name + '.png') });
  const res = {};

  // the first frame builds every layer: how long does that take?
  res.firstFrameMs = await page.evaluate(() => { const c0 = performance.now(); bench.render(0); return [performance.now() - c0, window.PinFlat.buildMs]; });

  // a ball fired up the warp ramp
  res.ramp = await page.evaluate(() => {
    const W = bench.newWorld(1, 5), E = bench.E; bench.setMode('play'); bench.setAuto(false);
    const b = W.balls[0]; b.x = 120; b.y = 236; b.vx = 0; b.vy = -1250; b.launched = true;
    const trace = [];
    for (let i = 0; i < 200; i++) { bench.step(1); const q = W.balls[0]; if (q) trace.push([q.m, Math.round(q.s || 0), +(q.z || 0).toFixed(1)]); }
    return trace.filter((t, i) => i % 10 === 0);
  });
  // replay to set moments and shoot them
  for (const [name, n] of [['r1-climb', 5], ['r2-top', 11], ['r3-down', 17]]) {
    await page.evaluate((n) => {
      const W = bench.newWorld(1, 5); bench.setMode('play'); bench.setAuto(false);
      const b = W.balls[0]; b.x = 120; b.y = 236; b.vx = 0; b.vy = -1250; b.launched = true;
      bench.step(n); bench.render(3000 + n * 16);
    }, n);
    await shot(name);
  }

  // the saucer holding a ball, hangar lit
  await page.evaluate(() => {
    const W = bench.newWorld(1, 5), T = bench.E.TABLE; bench.setMode('play'); bench.setAuto(false);
    W.drops = [false, false, false, false, false]; W.dropsDown = 5; W.saucerLit = true;
    const b = W.balls[0]; b.x = T.saucer.x + 14; b.y = T.saucer.y + 14; b.vx = -200; b.vy = -200; b.launched = true;
    bench.step(12); bench.render(4400);
  });
  res.saucer = await page.evaluate(() => bench.W.balls.map((b) => b.m));
  await shot('s1-saucer');

  // flippers mid-swing
  await page.evaluate(() => {
    const W = bench.newWorld(1, 5); bench.setMode('play'); bench.setAuto(false);
    W.flippers[0].a = (W.flippers[0].rest + W.flippers[0].up) / 2; W.flippers[1].a = W.flippers[1].up;
    bench.render(5000);
  });
  await shot('f1-flippers');

  // game over
  await page.evaluate(() => { const W = bench.W; W.score = 1234560; W.over = true; W.state = 'over'; W.balls.length = 0; bench.setMode('over'); bench.render(2500); });
  await shot('o1-over');
  await page.evaluate(() => { bench.render(100); });
  await shot('o2-over');
  res.errors = errors;
  console.log(JSON.stringify(res));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
