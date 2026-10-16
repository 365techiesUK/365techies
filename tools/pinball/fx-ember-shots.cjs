/* 365 Pinball Hero - pictures of Ember Peak's effects (tools/pinball/fx-ember.html) in headless Edge (16 Oct 2026). Never
 * deployed. Serve the repository first (py -m http.server <port> --bind 127.0.0.1 from its root), then:
 *   node tools/pinball/fx-ember-shots.cjs <out.png> [port=8477] [query, e.g. tier=high]
 * Prints the bench's numbers (the reds check for each still, the eruption's frame time on THIS PC's GPU - a guide only,
 * never a phone number) and exits 1 on a page error or a red screen. Playwright is borrowed from another project. */
'use strict';
const PW = process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core';
const { chromium } = require(PW);
const out = process.argv[2] || 'fx-ember.png', port = process.argv[3] || '8477', q = process.argv[4] || '';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1500 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/tools/pinball/fx-ember.html?${q}`);
  await page.waitForFunction(() => window.done, null, { timeout: 90000 });
  const done = await page.evaluate(() => window.done);
  await page.locator('#sheet').screenshot({ path: out });
  const redScreen = done.shots.filter((s) => s.redShare > 0.25 || s.mean[1] < s.mean[0] * 0.4);
  console.log(JSON.stringify({ done, ms: Date.now() - t0, errors, redScreen: redScreen.map((s) => s.name) }, null, 1));
  await browser.close();
  process.exit(errors.some((e) => !/warning/.test(e)) || redScreen.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
