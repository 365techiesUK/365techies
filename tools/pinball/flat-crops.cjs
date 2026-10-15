/* 365 Pinball Hero - 4x close-ups of the flat look (15 Oct 2026), never deployed: the same bench as flat-shots.cjs,
 * cut into regions so single pixels can be checked. node tools/pinball/flat-crops.cjs <outDir> [port] */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright');
const out = process.argv[2] || '.', port = process.argv[3] || '8462', S = 4;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 270 * S + 40, height: 480 * S + 40 } });
  await page.goto(`http://127.0.0.1:${port}/tools/pinball/flat-preview.html?still=1&scale=${S}`);
  await page.waitForFunction(() => window.bench && window.PinFlat);
  await page.evaluate(() => {
    bench.newWorld(1, 7); bench.setMode('play'); bench.step(200);
    const W = bench.W; W.lanes = [true, false, false]; W.mult = 2; W.saveT = 400; W.drops = [true, true, false, true, true]; W.saucerLit = true;
    W.lit.bump = [4, 0, 0]; W.flippers[1].a = W.flippers[1].up; bench.render(440);
  });
  const box = await page.locator('#view').boundingBox();
  const crop = async (name, x, y, w, h) => page.screenshot({ path: path.join(out, name + '.png'), clip: { x: box.x + x * S, y: box.y + y * S, width: w * S, height: h * S } });
  await crop('c-top', 0, 0, 270, 150);
  await crop('c-left', 0, 140, 150, 200);
  await crop('c-right', 120, 140, 150, 200);
  await crop('c-bottom', 0, 330, 270, 150);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
