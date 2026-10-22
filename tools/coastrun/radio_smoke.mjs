// 365 Coast Run - the Getaway's police radio, in the game (22 Oct 2026): a headless Edge drives a real Getaway race and checks the radio end to end.
//   py -m http.server 8471   (from the site's folder), then   node tools/coastrun/radio_smoke.mjs
// Software rendering only (SwiftShader, no GPU: another job may have the graphics card). It's slow in that - a picture every half second or
// more, and the page stalls for seconds at a time (the green light, a screenshot) while the sound runs on in real time - so the checks read the
// game's own record (window.CRradio: what was said, the captions shown, the duck, the level going out) rather than racing it, and hold the
// audio clock still while a screenshot is taken. Checks: the lines load (four fetches at a time at most) and decode to real sound (not
// silence); the opening exchange plays at the green light with its captions; the music ducks 8 dB, a ramp both ways; a pause, a new game and
// the results each stop it at once; the caption sits clear of the car on a desktop, a phone held upright (375 px) and one held sideways; no
// console errors. Screenshots: SHOTS (default D:/claude/coastrun-revamp/voices)/radio-in-game-*.png. Exit 1 if anything fails.
import { createRequire } from 'module';
const { chromium } = createRequire('D:/claude/tools/playwright-check/')('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8471/games/coastrun/', SHOTS = process.env.SHOTS || 'D:/claude/coastrun-revamp/voices';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const SET = { car: 'getaway', speed: 1, sound: true, music: true, cam: 'near', touch: 'sides', touchfull: false };
const OPENING = ['CONTROL All units, suspect vehicle heading for the coast.', 'SARGE Right, lads. Catch him!', 'DOBBS On it, Sarge!'];
const out = []; let fails = 0;
const check = (ok, what, detail) => { out.push({ ok: !!ok, what, detail }); if (!ok) fails++; console.log((ok ? 'PASS  ' : 'FAIL  ') + what + (detail === undefined ? '' : '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)))); };
const note = (what, detail) => console.log('NOTE  ' + what + (detail === undefined ? '' : '  ' + JSON.stringify(detail)));

async function open(browser, w, h, mobile) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
  await ctx.addInitScript((s) => { try { localStorage.setItem('coast365:settings', JSON.stringify(s)); } catch (e) {} }, SET);
  // (the sound card kept where the test can reach it, to hold its clock during a screenshot; and the longest the page went without a picture)
  await ctx.addInitScript(() => {
    const C = window.AudioContext; if (C) window.AudioContext = class extends C { constructor(o) { super(o); window.__ac = this; } };
    window.__gap = 0; let last = 0; const f = (t) => { if (last) window.__gap = Math.max(window.__gap, t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
  });
  // (the Hall of Fame's ticket and the visitor count post to servers this test has no business with: answered here)
  await ctx.route((u) => /visitors-live|\/api\//.test(u.href), (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const page = await ctx.newPage(), errs = [], fly = { now: 0, max: 0, mp3: 0, bad: [] };
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /radio/i.test(m.text()))) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('request', (q) => { if (/\/radio\/.*\.mp3/.test(q.url())) { fly.now++; fly.max = Math.max(fly.max, fly.now); fly.mp3++; } });
  const done = (q) => { if (/\/radio\/.*\.mp3/.test(q.url())) fly.now--; };
  page.on('requestfinished', done); page.on('requestfailed', (q) => { done(q); if (/\/radio\//.test(q.url())) fly.bad.push(q.url()); });
  page.on('response', (r) => { if (/\/radio\//.test(r.url()) && r.status() !== 200) fly.bad.push(r.status() + ' ' + r.url()); });
  await page.goto(BASE + '?fixedres&nopeople', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  return { ctx, page, errs, fly };
}
const R = (page) => page.evaluate(() => window.CRradio && window.CRradio());
async function until(page, ok, ms, every = 80) { const t0 = Date.now(); for (;;) { const r = await R(page); if (r && ok(r)) return r; if (Date.now() - t0 > ms) return null; await page.waitForTimeout(every); } }
const geo = (page) => page.evaluate(() => { const c = document.getElementById('screen').getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height, b: c.bottom, mode: window.ARCADE365.mode,
  tb: Array.from(document.querySelectorAll('#crTouch .tb')).map((b) => b.getBoundingClientRect()).filter((q) => q.width).map((q) => ({ x: q.left, y: q.top, w: q.width, h: q.height })) }; });
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
// the check and, if a caption is up, the audio clock held there in the same breath (a screenshot here takes ten seconds or more: held, the
// caption stays as it was and no line passes unseen meanwhile; the game won't restart the clock) - then the picture, then the clock let go
const RF = (page) => page.evaluate(() => { const r = window.CRradio(), a = window.__ac; if (r && r.cap && a) { a.__res = a.resume; a.resume = () => Promise.resolve(); a.suspend(); r.held = true; } return r; });
async function shot(page, file) {
  await page.screenshot({ path: SHOTS + '/' + file });
  await page.evaluate(() => { const a = window.__ac; if (a && a.__res) { a.resume = a.__res; a.__res = null; return a.resume(); } });
}
const inject = (page, k) => page.evaluate((k) => { window.ARCADE365.world.events.push({ sfx: k }); }, k);   // (as if the engine had said it: the next step reads it)
// an exchange start to finish, sampled every 20 ms in the page (the sound runs on its own thread, so the page busy sampling it changes nothing)
const sample = (page, ms) => page.evaluate((ms) => { const o = [], t0 = performance.now(); while (performance.now() - t0 < ms) { const r = window.CRradio(); o.push([+r.duck.toFixed(3), r.level]); const t1 = performance.now(); while (performance.now() - t1 < 20) {} } return o; }, ms);
async function exchange(page, k) {   // the channel free, a moment injected, the whole exchange sampled
  if (!await until(page, (r) => r.chanFreeIn !== null && r.chanFreeIn < -0.1, 60000)) return null;
  const n0 = (await R(page)).said.length; await inject(page, k);
  const r = await until(page, (r) => r.said.length > n0 && r.endsIn != null, 30000, 20);
  return r && { said: r.said[r.said.length - 1], s: await sample(page, (r.endsIn + 2) * 1000) };
}
const capsOf = (r, n) => r.caps.slice(-n).map((c) => c[1] + ' ' + c[2]);

async function desktop(browser) {
  console.log('\n--- desktop 1280 x 720, the Close camera');
  const { ctx, page, errs, fly } = await open(browser, 1280, 720, false);
  check(await page.evaluate(() => !!(window.COAST3D && window.COAST3D.world)), '3D running (software rendering)');
  await page.keyboard.press('Space');
  const r0 = await until(page, (r) => r.said.length > 0, 90000);
  check(r0 && r0.said[0].k === 'siren_start' && r0.said[0].v === 1, 'the opening exchange starts at the green light', r0 && r0.said[0]);
  // the opening exchange: a picture with its caption up; through to its end
  let held = null; const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    const r = held ? await R(page) : await RF(page); if (!r) break;
    if (r.held && !held) { held = r; await shot(page, 'radio-in-game-desktop.png'); }
    if (r.endsIn != null && r.endsIn < -1.5 && r.duck > 0.9) break;
    await page.waitForTimeout(60);
  }
  const g = await geo(page), u = g.h / 224, gw = g.w / u, box = held && held.capBox;
  check(held && held.capMode === 'strip' && box.y >= g.y + g.h * 0.835 - 1 && box.y + box.h <= g.b && box.x >= g.x + 77 * u - 1 && box.x + box.w <= g.x + (gw - 158) * u + 1,
    'the caption under the car, between the map and the gauges', held && { mode: held.capMode, box, picture: { x: g.x, y: g.y, w: g.w, h: g.h } });
  check(box && box.fs >= 12, 'legible: ' + (box && box.fs) + ' px');
  const r1 = await R(page), gap1 = await page.evaluate(() => window.__gap);
  note('race 1, the opening exchange\'s captions as shown', { caps: capsOf(r1, 3), longestPageStall: Math.round(gap1) + ' ms' });
  // the music's duck and the sound going out, through a whole exchange (a roadblock warning)
  const ex = await exchange(page, 'alarm');
  if (!ex) check(false, 'an exchange to measure (injected roadblock warning)');
  else {
    const d = ex.s.map((q) => q[0]), lev = Math.max(...ex.s.map((q) => q[1] == null ? -200 : q[1])), lo = Math.min(...d), back = d.slice(d.lastIndexOf(lo));
    const mid = back.filter((x) => x > 0.43 && x < 0.95).length, up = back.every((x, i, a) => !i || x >= a[i - 1] - 0.002);
    check(lo < 0.45 && lo > 0.35, 'the music ducks 8 dB under it', { lowest: lo, dB: +(20 * Math.log10(lo)).toFixed(1), exchange: ex.said });
    check(mid >= 5 && up, 'and comes back up as a ramp, not a jump (every 20 ms)', { onTheWay: mid, every8th: back.filter((x, i) => i % 8 === 0) });
    check(d[d.length - 1] > 0.95, 'all the way', d[d.length - 1]);
    check(lev > -40, 'sound going out of the radio while it speaks', lev + ' dBFS (RMS, 2048 samples)');
  }
  // the lines: all loaded, four at a time at most, every one real sound
  const rl = await until(page, (r) => r.loaded + r.lost >= 100 && r.pending === 0, 150000, 400);
  check(rl && rl.loaded === 100 && !rl.failed.length && !fly.bad.length, 'all 100 lines loaded and decoded', rl && { loaded: rl.loaded, failed: rl.failed, bad: fly.bad });
  check(fly.max <= 4, 'never more than four fetches at once', { most: fly.max, mp3s: fly.mp3 });
  const rms = await page.evaluate(() => window.CRradioRms()), vals = Object.values(rms), qn = Object.keys(rms).find((k) => rms[k] === Math.min(...vals));
  check(vals.length === 100 && Math.min(...vals) > -40, 'every decoded line is sound, not silence', { quietest: qn + ' ' + rms[qn] + ' dB', loudest: Math.max(...vals) + ' dB' });
  // a pause stops it at once; so do a new game and the results
  const stopTest = async (what, act, after) => {
    if (!await until(page, (r) => r.chanFreeIn !== null && r.chanFreeIn < -0.1, 60000)) { check(false, what + ': the channel free to test it'); return; }
    const n0 = (await R(page)).said.length; await inject(page, 'alarm');
    const on = await until(page, (r) => r.said.length > n0 && r.cap, 30000);
    if (!on) { check(false, what + ': an exchange on air to stop (injected roadblock warning)'); return; }
    await act(); await page.waitForTimeout(350);
    const r = await R(page); await page.waitForTimeout(900); const r2 = await R(page);
    check(r.onAir === 0 && !r.cap && r2.level !== null && r2.level < -70, what + ' stops the radio and its caption at once', { onAir: r.onAir, cap: r.cap, levelAfter: r2.level, duck: r2.duck, cutShort: on.said.slice(-1)[0] });
    if (after) await after(r2);
  };
  await stopTest('a pause', () => page.keyboard.press('p'), async () => { await page.keyboard.press('p'); });
  await stopTest('a new game', () => page.evaluate(() => window.ARCADE365.begin()), async () => {   // (what New game does, once you've said yes to it)
    await page.waitForTimeout(1000); const r3 = await R(page);
    check(r3.said.length === 0, 'a new game starts the channel afresh', r3.said);
    const r4 = await until(page, (r) => r.said.length > 0, 90000);
    check(r4 && r4.said[0].k === 'siren_start' && r4.said[0].v === 1, 'and opens with the first opening exchange again', r4 && r4.said[0]);
    const r5 = await until(page, (r) => r.endsIn != null && r.endsIn < -0.5, 40000);
    check(r5 && capsOf(r5, 3).join('|') === OPENING.join('|'), 'its captions: CONTROL, then SARGE, then DOBBS - one at a time, with the words', r5 && capsOf(r5, 3));
  });
  await stopTest('the results', () => page.evaluate(() => { window.ARCADE365.world.over = true; }), async () => {
    check((await geo(page)).mode === 'over', 'the results are up');
    await page.waitForTimeout(3000); const r = await R(page); check(r.onAir === 0 && !r.cap && r.level < -70, 'nothing plays over the results', { onAir: r.onAir, cap: r.cap, level: r.level });
  });
  // the last word (busted, as if the engine had said it) is the one thing that may finish over the results
  await page.evaluate(() => window.ARCADE365.begin());
  if (await until(page, (r) => r.said.length > 0 && r.chanFreeIn !== null && r.chanFreeIn < -0.1, 120000)) {
    await inject(page, 'busted');
    const on = await until(page, (r) => r.said.length > 1 && r.cap, 30000);
    if (!on) check(false, 'the busted exchange on air');
    else {
      await page.evaluate(() => { window.ARCADE365.world.over = true; });
      for (let i = 0; i < 100 && (await geo(page)).mode !== 'over'; i++) await page.waitForTimeout(50);
      const mode = (await geo(page)).mode, s = await sample(page, 1200), r = await R(page);
      check(mode === 'over' && on.said[1].k === 'busted' && Math.max(...s.map((q) => q[1] == null ? -200 : q[1])) > -40 && !r.cap, 'the busted exchange carries on over the results (its caption gone)', { mode, said: on.said[1], levelOverResults: Math.max(...s.map((q) => q[1])), cap: r.cap });
      const r2 = await until(page, (r) => r.endsIn != null && r.endsIn < -0.5, 20000); await page.waitForTimeout(500); const r3 = await R(page);
      check(r2 && r3.level < -70, 'then nothing', { level: r3.level });
    }
  } else check(false, 'a race for the last word');
  check(!errs.length, 'no console errors', errs);
  await ctx.close();
}

async function phone(browser, w, h, name, want) {
  console.log('\n--- phone ' + w + ' x ' + h);
  const { ctx, page, errs } = await open(browser, w, h, true);
  await page.keyboard.press('Space');
  let r1 = null; const t0 = Date.now();
  while (Date.now() - t0 < 120000) { const r = await RF(page); if (r && r.held) { r1 = r; break; } await page.waitForTimeout(80); }
  if (!r1) { check(false, name + ': a caption showed'); await ctx.close(); return; }
  const b = r1.capBox, g = await geo(page);
  await shot(page, 'radio-in-game-' + w + 'x' + h + '.png');
  const car = want === 'below' ? { x: g.x, y: g.y, w: g.w, h: g.h } : { x: g.x + g.w * 0.3, y: g.y + g.h * 0.5, w: g.w * 0.4, h: g.h * 0.335 };   // (upright: the whole picture; sideways: where the car sits, generously)
  check(r1.capMode === want, name + ': the caption ' + (want === 'below' ? 'under the picture' : 'under the car'), r1.capMode);
  check(!hit(b, car), name + ': clear of the car', { caption: b, car });
  check(b.x >= 0 && b.x + b.w <= w && b.y >= 0 && b.y + b.h <= h, name + ': on the screen');
  check(!g.tb.some((q) => hit(b, q)), name + ': clear of the touch buttons', g.tb);
  check(b.fs >= (want === 'below' ? 13 : 12), name + ': legible, ' + b.fs + ' px');
  check(!errs.length, name + ': no console errors', errs);
  await ctx.close();
}

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ARGS });
try {
  await desktop(browser);
  await phone(browser, 375, 812, 'phone upright (375 px)', 'below');
  await phone(browser, 812, 375, 'phone sideways', 'strip');
} finally { await browser.close(); }
console.log('\n' + (out.length - fails) + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
