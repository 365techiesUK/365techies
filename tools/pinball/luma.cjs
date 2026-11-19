/* 365 Pinball Hero - the eruption's brightness and the music's cost in the real page (5 Nov 2026, wave 3; the luma
 * measure is ported from the QA audit's soak, pinball-audit/scratch/05-qa-playtester/soak.cjs, and the critic's frame
 * sheets). Never deployed. Serve the repository first (py -m http.server <port> --bind 127.0.0.1 from its root), then:
 *   node tools/pinball/heavy.cjs show node tools/pinball/luma.cjs <outDir> [port=8704] [luma,music]
 * luma:  on the title screen's demo (the pilot playing Ember Peak in the full 3D look, the title card hidden), desktop
 *        1280x900 and phone 412x915: three baseline frames, then the volcano is held at full pressure until the pilot
 *        sinks the crater, and frames are taken just after the eruption. Pass: eruption mean luma <= 1.35x the baseline
 *        and near-white pixels (every channel over 230) <= 3% of the screen. Saves the frames as PNGs.
 * music: on the phone view with the CPU throttled 4x, music.js and voice.js injected into index.html (page.route; the
 *        page itself is integrate's), PinMusic.update called once a frame: the p95 frame time with the music on is within
 *        1 ms of off (two rounds each), the music schedules notes, and there are no AudioContext or page errors.
 * Headless Chrome on the second graphics card (gpu2.cjs, d3d11), brought to the front with focus emulation. */
'use strict';
const fs = require('fs'), path = require('path');
const PW = process.env.PLAYWRIGHT || 'D:/claude/365-techies-website-launch-reel/node_modules/playwright-core';
const { chromium } = require(PW);
const OUT = process.argv[2] || 'D:/claude/retro-rebooted/pinball-build/show/luma', PORT = process.argv[3] || '8704', WHAT = (process.argv[4] || 'luma,music').split(',');
const BASE = 'http://127.0.0.1:' + PORT;
const BIN = process.env.PW_BROWSER || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
let fails = 0, passes = 0;
function ok(c, what) { if (c) { passes++; console.log('  ok   ' + what); } else { fails++; console.log('  FAIL ' + what); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(browser, view, inject) {
  const ctx = await browser.newContext(Object.assign({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) headless pinball-test' }, view));
  await ctx.route(/visitors-live|workers\.dev/, (r) => r.abort());
  if (inject) await ctx.route(/\/games\/pinball\/(index\.html)?(\?.*)?$/, async (r) => {
    const res = await r.fetch(); let body = await res.text();
    body = body.replace('<script src="pinball.js', '<script src="music.js"></script><script src="voice.js"></script><script src="pinball.js');
    await r.fulfill({ response: res, body, headers: Object.assign({}, res.headers(), { 'content-type': 'text/html; charset=utf-8' }) });
  });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/games-hof\.php|status of (404|501)|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.bringToFront();
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await page.goto(BASE + '/games/pinball/', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.ARCADE365 && !!window.PinFX);
  await page.addStyleTag({ content: '#ov_title,#ov,.ov,#runHud,#runBan{visibility:hidden!important}' });
  return { ctx, page, errors, cdp };
}
async function lumOf(page, file) {   // mean luma and the share of near-white pixels of a screenshot
  const buf = await page.screenshot({ path: file });
  return page.evaluate(async (b) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let L = 0, w = 0; const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { L += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; if (Math.min(d[i], d[i + 1], d[i + 2]) > 230) w++; }
    return { mean: +(L / n).toFixed(1), white: +(100 * w / n).toFixed(2) };
  }, buf.toString('base64'));
}

async function luma(browser, name, view) {
  console.log('luma: ' + name);
  const { ctx, page, errors } = await open(browser, view, false);
  await sleep(6000);   // the demo under way
  const base = [];
  for (let k = 0; k < 3; k++) { base.push(await lumOf(page, path.join(OUT, name + '-base' + k + '.png'))); await sleep(1300); }
  // hold the volcano at full pressure (ERUPT lit) until the pilot sinks the crater; note the moment the eruption's show starts
  await page.evaluate(() => {
    window.__er = 0;
    (function hold() {
      const W = window.ARCADE365 && ARCADE365.world, V = W && W.toys && W.toys.volcano;
      if (V && !W.mb && W.press && !V.busy) V.pressure = Math.max(V.pressure || 0, W.press.level);
      try { if (!window.__er && PinFX.debug().shows.indexOf('eruption') >= 0) window.__er = performance.now(); } catch (e) {}
      requestAnimationFrame(hold);
    })();
  });
  let got = false;
  try { await page.waitForFunction(() => window.__er > 0, null, { timeout: 120000, polling: 16 }); got = true; } catch (e) { got = false; }
  ok(got, name + ': an eruption on the demo (the pilot sank the full crater)');
  const er = [];
  if (got) for (let k = 0; k < 4; k++) { er.push(await lumOf(page, path.join(OUT, name + '-erupt' + k + '.png'))); await sleep(k ? 180 : 20); }
  const bm = base.reduce((s, v) => s + v.mean, 0) / base.length, worst = er.reduce((m, v) => Math.max(m, v.mean), 0), white = er.reduce((m, v) => Math.max(m, v.white), 0);
  console.log('  baseline ' + base.map((v) => v.mean + '/' + v.white + '%').join(' ') + ' | eruption ' + er.map((v) => v.mean + '/' + v.white + '%').join(' '));
  if (got) {
    ok(worst <= 1.35 * bm, name + ': eruption mean luma <= 1.35x the baseline (' + worst + ' vs ' + bm.toFixed(1) + ', ' + (worst / bm).toFixed(2) + 'x)');
    ok(white <= 3, name + ': near-white pixels <= 3% (' + white + '%)');
  }
  ok(errors.length === 0, name + ': no page errors (' + errors.slice(0, 3).join(' | ') + ')');
  await ctx.close();
  return { base, er };
}

async function music(browser) {
  console.log('music: phone 412x915, CPU throttled 4x');
  const { ctx, page, errors, cdp } = await open(browser, { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 }, true);
  const have = await page.evaluate(() => !!(window.PinMusic && window.PinVoice));
  ok(have, 'music.js and voice.js load in the page (injected)');
  await page.mouse.click(206, 880);   // a gesture, so the cabinet may start its sound
  await page.evaluate(() => {
    window.__ft = []; let last = 0;
    (function loop(t) {
      if (last) window.__ft.push(t - last); last = t;
      const W = window.ARCADE365 && ARCADE365.world;
      try { PinMusic.update(W, { paused: false }); } catch (e) { window.__merr = String(e); }
      requestAnimationFrame(loop);
    })(0);
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await sleep(4000);
  const p95 = async (on) => {
    await page.evaluate((v) => { PinMusic.enable(v); window.__ft.length = 0; }, on);
    await sleep(10000);
    return page.evaluate(() => { const a = window.__ft.slice().sort((x, y) => x - y); return { p95: +a[Math.floor(a.length * 0.95)].toFixed(2), p50: +a[Math.floor(a.length * 0.5)].toFixed(2), n: a.length }; });
  };
  const r = [];
  for (const on of [false, true, false, true]) r.push(Object.assign({ on }, await p95(on)));
  const st = await page.evaluate(() => ({ m: PinMusic.state(), ac: (function () { try { const k = window.ARCADE365; return null; } catch (e) { return null; } })(), merr: window.__merr || '' }));
  console.log('  frames: ' + r.map((x) => (x.on ? 'on ' : 'off ') + x.p50 + '/' + x.p95 + ' ms (' + x.n + ')').join(', ') + '; music ' + JSON.stringify(st.m));
  const off = (r[0].p95 + r[2].p95) / 2, on = (r[1].p95 + r[3].p95) / 2;
  ok(on <= off + 1, 'p95 frame time with the music on within 1 ms of off (' + on.toFixed(2) + ' vs ' + off.toFixed(2) + ' ms)');
  ok(st.m.notes > 50 && st.m.bar > 4, 'the music plays in the page (' + st.m.notes + ' notes, ' + st.m.bar + ' bars, layer ' + st.m.layer + ')');
  ok(!st.merr && errors.length === 0, 'no AudioContext or page errors (' + (st.merr || errors.slice(0, 3).join(' | ')) + ')');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await ctx.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: BIN, headless: true, args: [...require('./gpu2.cjs')(), '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'] });
  try {
    if (WHAT.includes('luma')) {
      await luma(browser, 'desktop', { viewport: { width: 1280, height: 900 } });
      await luma(browser, 'phone', { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
    }
    if (WHAT.includes('music')) await music(browser);
  } finally { await browser.close(); }
  console.log(passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
