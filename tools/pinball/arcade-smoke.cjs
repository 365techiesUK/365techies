/* 365 Games - the other arcade games still load and play (wave 3, 5 Nov 2026: the pinball page lane changed the shared
 * cabinet, games/common/arcade.js, hof.js and keep.js, with opt-in hooks only). For each of batball, coastrun, eclipse
 * and invaders: open the page, press Play, play 10 s with keys (left, right, fire, up), and check the game is running
 * (the world's state changes, the cabinet in play or over), the score chip is the plain number it always was, and the
 * console is clean.
 *
 *   node tools/pinball/heavy.cjs smoke node tools/pinball/arcade-smoke.cjs [base url]
 * Exit code 1 if any game fails. */
'use strict';
const pw = require(process.env.PW_CORE || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core');
const BASE = (process.argv[2] || 'http://127.0.0.1:8705').replace(/\/$/, '');
const CHROME = process.env.PW_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await pw.chromium.launch({ headless: true, executablePath: CHROME, args: [...require('./gpu2.cjs')(), '--use-angle=d3d11'] });
  let fails = 0;
  for (const id of ['batball', 'coastrun', 'eclipse', 'invaders']) {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 850 } });
    await ctx.route(/visitors-live|workers\.dev/, (r) => r.abort());
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/games-(hof|code|acct)\.php|status of (404|501)|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    let res = {};
    try {
      await page.goto(BASE + '/games/' + id + '/', { waitUntil: 'load' }); await page.bringToFront();
      await page.waitForFunction(() => !!window.ARCADE365, null, { timeout: 15000 });
      await sleep(500);
      await page.click('#tPlay');
      await sleep(300);
      const snap = () => page.evaluate(() => { const W = ARCADE365.world; return { mode: ARCADE365.mode, sig: JSON.stringify(W, function (k, v) { return typeof v === 'number' ? Math.round(v) : v; }).length + ':' + JSON.stringify(W).slice(0, 2000).length, frameish: W.frame != null ? W.frame : W.t != null ? W.t : W.tick, score: document.getElementById('vScore').textContent }; });
      const a = await snap();
      const keys = ['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp'];
      const t0 = Date.now(); let k = 0, restarts = 0;
      while (Date.now() - t0 < 10000) {
        const key = keys[k++ % keys.length];
        await page.keyboard.down(key); await sleep(180); await page.keyboard.up(key); await sleep(70);
        if (k % 8 === 0 && (await page.evaluate(() => ARCADE365.mode)) === 'over') { restarts++; await page.keyboard.press('Enter'); }
      }
      const b = await snap();
      const changed = JSON.stringify(a) !== JSON.stringify(b) || restarts > 0;
      res = { a, b, restarts, errors: errors.slice(0, 3) };
      const good = (b.mode === 'play' || b.mode === 'over') && changed && !errors.length && !/,/.test(b.score);
      if (!good) fails++;
      console.log((good ? 'ok   ' : 'FAIL ') + id + ' ' + JSON.stringify(res));
    } catch (e) { fails++; console.log('FAIL ' + id + ' ' + (e && e.message)); }
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? fails + ' games failed' : 'all four arcade games load and play');
  process.exit(fails ? 1 : 0);
})();
