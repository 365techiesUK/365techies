/* 365 Pinball Hero - pictures of the playfield art (15 Oct 2026), never deployed. Drives tools/pinball/art-preview.html in
 * headless Edge through Playwright and saves PNGs: the painted table at full size (and its top and bottom halves), the
 * phone-sized copy, a rough tilted view, the lamps unlit and lit, the attract show; and prints the paint timings.
 *   node tools/pinball/art-shots.cjs <outDir> [port] [state]
 * Needs the repository served on the port first (py -m http.server 8471 --bind 127.0.0.1 from the repo root).
 * Playwright is borrowed from another project on this PC (PLAYWRIGHT env var to point elsewhere). */
'use strict';
const path = require('path');
const fs = require('fs');
const PW = process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core';
const { chromium } = require(PW);
const out = process.argv[2] || '.';
const port = process.argv[3] || '8471';
const state = process.argv[4] || 'play';
const only = (process.argv[5] || 'full,halves,phone,tilt,lamps,attract,off').split(',');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11'] });
  const errors = [];
  async function open(q, dsf) {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: dsf || 1 });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:${port}/tools/pinball/art-preview.html?${q}`);
    await page.waitForFunction(() => window.bench && window.bench.ready, null, { timeout: 30000 });
    return page;
  }
  const want = (k) => only.includes(k);
  // the full-size painting (2 device pixels per CSS pixel, so the 540-wide canvas shows all 1080 pixels)
  if (want('full') || want('halves')) {
    const p = await open(`view=full&state=${state}&t=3000`, 2);
    console.log(await p.evaluate(() => window.bench.info));
    const el = p.locator('#full');
    if (want('full')) await el.screenshot({ path: path.join(out, 'full.png') });
    if (want('halves')) {
      const b = await el.boundingBox();
      await p.screenshot({ path: path.join(out, 'top.png'), clip: { x: b.x, y: b.y, width: b.width, height: b.height * 0.42 } });
      await p.screenshot({ path: path.join(out, 'mid.png'), clip: { x: b.x, y: b.y + b.height * 0.36, width: b.width, height: b.height * 0.32 } });
      await p.screenshot({ path: path.join(out, 'bottom.png'), clip: { x: b.x, y: b.y + b.height * 0.62, width: b.width, height: b.height * 0.38 } });
    }
    await p.close();
  }
  if (want('phone')) {
    const p = await open(`view=phone&state=${state}&t=3000`, 1);
    await p.locator('#phone').screenshot({ path: path.join(out, 'phone.png') });
    await p.close();
  }
  if (want('off')) {
    const p = await open('view=phone&state=off', 1);
    await p.locator('#phone').screenshot({ path: path.join(out, 'phone-off.png') });
    await p.close();
  }
  if (want('tilt')) {
    const p = await open(`view=tilt&state=${state}&t=3000`, 1);
    await p.locator('#tiltwrap').screenshot({ path: path.join(out, 'tilt.png') });
    await p.close();
  }
  if (want('attract')) {
    const p = await open('view=phone&state=attract&t=0', 1);
    for (const t of [600, 9200, 13000]) {
      await p.evaluate((t) => window.bench.render('attract', t), t);
      await p.locator('#phone').screenshot({ path: path.join(out, 'attract-' + t + '.png') });
    }
    await p.close();
  }
  if (want('glow')) {   // the emissive map, as a picture
    const p = await open('view=phone&state=off', 1);
    const url = await p.evaluate(() => window.bench.art.glow.toDataURL('image/png'));
    fs.writeFileSync(path.join(out, 'glow.png'), Buffer.from(url.split(',')[1], 'base64'));
    await p.close();
  }
  if (want('lamps')) {
    const p = await open('view=lamps&state=off', 1);
    await p.locator('#lamps').screenshot({ path: path.join(out, 'lamps.png') });
    await p.close();
  }
  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
})();
