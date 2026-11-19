/* 365 Pinball Hero - a quick 3D still of the art lane's work (15 Oct 2026), never deployed. Opens tools/pinball/stills3d.html
 * (the 3D look with the real engine) in headless Edge and saves one phone-shaped still, so the playfield art and the
 * lamps can be judged as the player will see them.
 *   node tools/pinball/art-3d.cjs <out.png> [port] [query]      e.g. query "tilt=30&seed=7&frame=900&w=540&h=960"
 * Needs the repository served on the port first (py -m http.server <port> --bind 127.0.0.1 from the repo root).
 * Playwright is borrowed from another project on this PC (PLAYWRIGHT env var to point elsewhere). */
'use strict';
const PW = process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core';
const { chromium } = require(PW);
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const out = process.argv[2] || 'still.png', port = process.argv[3] || '8487';
const q = process.argv[4] || 'tilt=30&seed=7&frame=900&w=540&h=960';

(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: [...require('./gpu2.cjs')(), '--use-angle=d3d11'] });
  const w = +(/(?:^|&)w=(\d+)/.exec(q) || [0, 540])[1], h = +(/(?:^|&)h=(\d+)/.exec(q) || [0, 960])[1];
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/tools/pinball/stills3d.html?${q}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out });
  await browser.close();
  if (errors.length) console.log('CONSOLE:\n' + errors.slice(0, 10).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
