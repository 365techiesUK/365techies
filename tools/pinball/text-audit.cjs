/* 365 Pinball Hero - the text audit (wave 3, 5 Nov 2026; ported from the audit's 02-arcade-game-feel and
 * 04-mobile-retention scratch). On a 412 x 915 phone, through the first seconds of an Ember Run round, a round end and
 * the next round's start, and a Classic game, it samples every 100 ms:
 *  - every visible piece of text over the game screen during play (the HUD, the banner, the cards): none under 14 px;
 *  - copies of a message: the same words visible twice at once (the display's message, W.dmd, counts as one copy);
 *  - the banner: how long, without a break, it stays over the playfield (at most 1.2 s).
 * Then, with nothing playing: the buttons a finger presses (the pad, the pick cards, Play again) are at least 44 px.
 *
 *   node tools/pinball/heavy.cjs text node tools/pinball/text-audit.cjs [base url] [out folder]
 * Exit code 1 if any check fails. */
'use strict';
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW_CORE || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core');
const BASE = (process.argv[2] || 'http://127.0.0.1:8705').replace(/\/$/, '');
const OUT = process.argv[3] || path.join(__dirname, 'shots');
const CHROME = process.env.PW_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

function sample() {   // in the page: the visible text over the game screen, the banner's box, the display's message
  const sc = document.getElementById('screenwrap').getBoundingClientRect(), out = { text: [], ban: null, dmd: null };
  const W = ARCADE365.world; if (W && W.dmd) out.dmd = [W.dmd.big, W.dmd.small].filter(Boolean).join(' ').trim();
  document.querySelectorAll('#screenwrap *, #runHud *, #runBan *').forEach(function (el) {
    if (/^(CANVAS|SCRIPT|STYLE|svg|path|circle|rect|ellipse)$/i.test(el.tagName)) return;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    if (r.bottom < sc.top || r.top > sc.bottom || r.right < sc.left || r.left > sc.right) return;
    let op = 1, n = el; while (n && n !== document.body) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return; op *= +cs.opacity; n = n.parentElement; }
    if (op < 0.05 || el.closest('[hidden]')) return;
    const txt = [].filter.call(el.childNodes, function (c) { return c.nodeType === 3 && c.textContent.trim(); }).map(function (c) { return c.textContent.trim(); }).join(' ');
    if (!txt) return;
    out.text.push({ txt: txt.slice(0, 60), fs: parseFloat(getComputedStyle(el).fontSize), id: el.id || el.className || el.tagName });
  });
  const b = document.getElementById('runBan');
  if (b) { const r = b.getBoundingClientRect(), op = +getComputedStyle(b).opacity; if (op > 0.05 && b.textContent.trim() && r.height > 2) out.ban = { top: r.top - sc.top, bottom: r.bottom - sc.top, h: sc.height }; }
  out.mode = ARCADE365.mode; out.picking = !!(window.PinRunPage && PinRunPage.picking);
  return out;
}

(async () => {
  const browser = await pw.chromium.launch({ headless: true, executablePath: CHROME, args: [...require('./gpu2.cjs')(), '--use-angle=d3d11'] });
  const fails = [], R = { small: [], dupes: [], banner: [], buttons: [] };
  try {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await ctx.route(/visitors-live|workers\.dev|games-hof\.php/, (r) => r.abort());
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await page.goto(BASE + '/games/pinball/', { waitUntil: 'load' }); await page.bringToFront();
    await page.waitForFunction(() => !!window.ARCADE365); await sleep(1200);
    let banRun = 0, banMax = 0;
    async function watch(ms, label) {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        const s = await page.evaluate(sample);
        if (s.mode === 'play' && !s.picking) {
          s.text.forEach((t) => { if (t.fs < 14 && R.small.length < 20) R.small.push(label + ': "' + t.txt + '" ' + t.fs + ' px (' + t.id + ')'); });
          const seen = {}, all = s.text.map((t) => t.txt.toUpperCase().replace(/\s+/g, ' ')).concat(s.dmd ? [s.dmd.toUpperCase()] : []);
          all.forEach((t) => { if (t.length > 3) seen[t] = (seen[t] || 0) + 1; });
          Object.keys(seen).forEach((k) => { if (seen[k] > 1 && R.dupes.indexOf(k) < 0) R.dupes.push(k); });
          // the banner over the playfield (below the display's strip): how long without a break
          if (s.ban && s.ban.bottom > s.ban.h * 34 / 480) { banRun += 100; banMax = Math.max(banMax, banRun); } else banRun = 0;
        } else banRun = 0;
        await sleep(100);
      }
    }
    await page.evaluate(() => document.getElementById('tPlay').click());
    await watch(4000, 'round 1 start');
    await page.screenshot({ path: path.join(OUT, 'text-audit-play.png') });
    await page.evaluate(() => PinRunPage.endRound(true)); await sleep(600);
    R.buttons.push(...await page.evaluate(() => [].map.call(document.querySelectorAll('#ov_pick .rp-card'), (b) => ({ id: 'pick card', h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width }))));
    await page.keyboard.press('1');
    await watch(4000, 'round 2 start');
    await page.evaluate(() => PinRunPage.endRound(false)); await sleep(1500);
    R.buttons.push(...await page.evaluate(() => ['oPlay'].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { id, h: r.height, w: r.width }; })));
    await page.evaluate(() => { document.querySelector('#dSet [data-opt="game"][data-val="classic"]').click(); ARCADE365.begin(); });
    await watch(3000, 'classic start');
    if (!(await page.evaluate(() => ARCADE365.immersive))) {
      R.buttons.push(...await page.evaluate(() => [].map.call(document.querySelectorAll('#pad button'), (b) => ({ id: 'pad ' + b.getAttribute('data-pad'), h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width })).filter((b) => b.h > 0)));
    }
    R.buttons.push(...await page.evaluate(() => { const b = document.getElementById('imxPause'); const r = b.getBoundingClientRect(); return r.height ? [{ id: 'full screen pause', h: r.height, w: r.width }] : []; }));
    R.bannerMaxMs = banMax; R.errors = errors.slice(0, 5);
    await ctx.close();
  } catch (e) { fails.push('crash: ' + (e && e.stack || e)); }
  await browser.close();
  if (R.small.length) fails.push('in-play text under 14 px: ' + R.small.join(' | '));
  if (R.dupes.length) fails.push('the same message visible twice: ' + R.dupes.join(' | '));
  if (R.bannerMaxMs > 1250) fails.push('a banner over the playfield for ' + R.bannerMaxMs + ' ms (at most 1,200)');
  const smallB = R.buttons.filter((b) => b.h < 44 || b.w < 44);
  if (smallB.length) fails.push('buttons under 44 px: ' + JSON.stringify(smallB));
  if (R.errors && R.errors.length) fails.push('errors: ' + R.errors.join(' | '));
  console.log(JSON.stringify(R, null, 1));
  fails.forEach((f) => console.log('FAIL ' + f));
  console.log(fails.length ? fails.length + ' checks failed' : 'text audit: all checks pass');
  process.exit(fails.length ? 1 : 0);
})();
