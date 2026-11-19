/* 365 Pinball Hero - a picture of the effects sheet (tools/pinball/fx-preview.html) in headless Edge (15 Oct 2026, M2a).
 * Never deployed. Serve the repository first (py -m http.server <port> --bind 127.0.0.1 from its root), then:
 *   node tools/pinball/fx-shots.cjs <out.png> [port=8474] [query, e.g. speed=1&seed=7&cells=8]
 * Playwright is borrowed from another project on this PC (PLAYWRIGHT env var to point elsewhere). */
'use strict';
const PW = process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core';
const { chromium } = require(PW);
const out = process.argv[2] || 'fx-sheet.png', port = process.argv[3] || '8474', q = process.argv[4] || '';
const EDGE = process.env.PW_BROWSER || (require('fs').existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');   // (Chrome: Edge 155 will not start headless here, 5 Nov 2026)
(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: [...require('./gpu2.cjs')(), '--use-angle=d3d11'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1300 } });
  await page.bringToFront(); await (await page.context().newCDPSession(page)).send('Emulation.setFocusEmulationEnabled', { enabled: true });   // (rAF keeps running headless)
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/tools/pinball/fx-preview.html?${q}`);
  await page.waitForFunction(() => window.done, null, { timeout: 60000 });
  const done = await page.evaluate(() => window.done);
  await page.locator('#sheet').screenshot({ path: out });
  console.log(JSON.stringify({ done, ms: Date.now() - t0, errors }));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
