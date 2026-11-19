/* 365 Pinball Hero - a still of Ember Peak's painted playfield with its inserts (tools/pinball/fx-lampmap.html), for placing
 * new inserts on clear art (5 Nov 2026, wave 3 show lane). Never deployed. Serve the repository first, then:
 *   node tools/pinball/heavy.cjs show node tools/pinball/fx-lampmap.cjs <out.png> [port] [query, e.g. ids=lock,mode&grid=1&lit=1]
 * Headless Chrome on the second graphics card. */
'use strict';
const PW = process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core';
const { chromium } = require(PW);
const fs = require('fs');
const out = process.argv[2] || 'lampmap.png', port = process.argv[3] || '8704', q = process.argv[4] || '';
const BIN = process.env.PW_BROWSER || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
(async () => {
  const browser = await chromium.launch({ executablePath: BIN, headless: true, args: [...require('./gpu2.cjs')(), '--use-angle=d3d11'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 1500 } });
  await page.bringToFront();
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/tools/pinball/fx-lampmap.html?${q}`);
  await page.waitForFunction(() => window.done, null, { timeout: 60000 });
  const done = await page.evaluate(() => window.done);
  await page.locator('#c').screenshot({ path: out });
  console.log(JSON.stringify({ done, errors }));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
