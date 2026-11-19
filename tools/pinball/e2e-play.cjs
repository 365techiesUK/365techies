/* 365 Pinball Hero - END TO END in the real page (integrate, wave 3, 19 Nov 2026). Headless Chrome on the second graphics
 * card. The demo pilot (pilot.js) plays the cabinet's world, or the level below it; where a step would take minutes of
 * play, the script lights the thing itself through the game's own calls and says so in the report ("forced").
 *   CLASSIC   a mode (MODE lit -> the pilot sinks the crater), the mode played out, DIVE, THE MAGMA CHAMBER, back up;
 *             then a real eruption (pressure set to the top, the pilot shoots ERUPT) into THE BIG ONE multiball
 *   EMBER RUN round 1's mission played by the pilot, STAGE CLEAR, the dive, back up, the pick card; rounds 2-3 skipped
 *             (PinRunPage.endRound), the boss (a phase still), the kill (PinRun.clear) into the victory multiball, then
 *             round 5 lost for the end card
 * Medium tier draw calls are sampled in surface play, multiball and the chamber. Owner stills go to the out folder.
 *
 *   node tools/pinball/heavy.cjs e2e node tools/pinball/e2e-play.cjs <phone|desktop> [base url] [out folder]
 */
'use strict';
const fs = require('fs'), path = require('path');
const pw = require('D:/claude/365-techies-website-launch-reel/node_modules/playwright-core');
const VP = process.argv[2] === 'phone' ? 'phone' : 'desktop', PHONE = VP === 'phone';
const BASE = (process.argv[3] || 'http://127.0.0.1:8706').replace(/\/$/, '');
const OUT = process.argv[4] || 'D:/claude/retro-rebooted/pinball-ember/wave3';
const CHROME = process.env.PW_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(OUT, { recursive: true });
const T0 = Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = { vp: VP, steps: [], forced: [], errors: [], calls: { surface: 0, multiball: 0, chamber: 0 }, callsWithReflection: { surface: 0, multiball: 0, chamber: 0 }, stills: [] };
function log(s) { console.log(((Date.now() - T0) / 1000).toFixed(0).padStart(4) + 's ' + s); }
function step(name, ok, detail) { R.steps.push({ name, ok: !!ok, detail }); log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? ' - ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }

async function open(browser, game) {
  const ctx = await browser.newContext(PHONE
    ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 headless pinball-e2e' }
    : { viewport: { width: 1280, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) headless pinball-e2e' });
  await ctx.route(/visitors-live|workers\.dev|games-hof\.php/, (r) => r.abort());
  await ctx.addInitScript((s) => { try { localStorage.setItem('pin365:settings', JSON.stringify(s)); localStorage.setItem('pin365:music', '0'); localStorage.setItem('pin365:voice', '0'); } catch (e) {} },
    { speed: 2, sound: false, game, cam: 'calm', look: '3d', music: false, voice: false });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => R.errors.push(game + ' pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/games-hof\.php|status of (404|501)|Failed to load resource|ERR_FAILED/.test(m.text())) R.errors.push(game + ' console: ' + m.text()); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await page.goto(BASE + '/games/pinball/', { waitUntil: 'load' });
  await page.bringToFront();
  await page.waitForFunction(() => !!window.ARCADE365 && !!window.PinPilot && !!window.PinEngine);
  await sleep(1500);
  await page.evaluate(() => {   // the pilot plays whatever world is active (the surface or the level below); events are counted
    const A = window.ARCADE365, E = window.PinEngine, P = window.PinPilot, orig = E.step;
    const Q = window.__e2e = { ev: {}, last: {}, steps: 0, hold: false };
    E.step = function (W, input) {
      const mine = A.mode === 'play' && !W.demo && (W === A.world || (window.PinLevels && PinLevels.active() === W));
      if (mine && !Q.hold) { const o = P.input(W) || {}; input.left = !!o.left; input.right = !!o.right; input.fire = !!o.fire; }
      const res = orig.apply(this, arguments);
      if (mine) { Q.steps++; W.events.forEach((e) => { const n = typeof e === 'string' ? e : (e && e.sfx) || '?'; Q.ev[n] = (Q.ev[n] || 0) + 1; Q.last[n] = Q.steps; }); }
      return res;
    };
    if (window.HallOfFame) HallOfFame.run = () => null;
    if (window.PinLook && PinLook.world) { try { PinLook.world.setTier('medium'); } catch (e) {} }
  });
  return { ctx, page };
}
const S = (page) => page.evaluate(() => {   // a snapshot of the game for the script
  const A = ARCADE365, W = A.world, L = window.PinLevels, a = L ? L.active() : W, d = L ? L.status() : null, RP = window.PinRunPage, st = RP && RP.status ? RP.status() : null;
  const w3 = window.PinLook && PinLook.world, ws = w3 && w3.stats ? w3.stats() : null;
  return { mode: A.mode, state: W && W.state, frame: W && W.frame, score: W && W.score, depth: d ? d.depth : 0, last: d && d.last, tableA: a && a.tableId,
    mb: !!(a && a.mb), balls: a ? a.balls.length : 0, free: a ? a.balls.filter((b) => b.m === 'free').length : 0,
    goals: W && W.goals ? { mode: W.goals.mode && W.goals.mode.id, modesDone: W.goals.modesDone, modeLit: W.goals.modeLit, diveLit: W.goals.diveLit } : null,
    lit: W && W.crater ? W.crater.lit.slice() : [], next: a && a.next ? a.next.text + ' / ' + a.next.small : null,
    hud: (document.getElementById('runHud') || {}).textContent || '', hudOn: !!(document.getElementById('runHud') && !document.getElementById('runHud').hidden),
    ban: (document.getElementById('runBan') || {}).textContent || '', picking: !!(RP && RP.picking), run: st ? { round: st.round, phase: st.phase, cleared: st.cleared, balls: st.balls, boss: st.boss, mission: st.mission && st.mission.text } : null,
    ev: Object.assign({}, window.__e2e.ev), tier: ws && ws.tier, calls: ws && ws.calls, look: !!(window.PinLook && PinLook.on) };
});
async function waitFor(page, fn, ms, every) {   // fn(snapshot) -> truthy; returns the snapshot or null
  const t = Date.now();
  while (Date.now() - t < ms) { const s = await S(page); if (fn(s)) return s; await sleep(every || 400); }
  return null;
}
async function calls(page, kind, ms) {   // the most draw calls a frame at the medium tier, over ms: the picture's own (calls
  // less the ball's cube reflection, drawn every 3rd frame at medium) and the frame with the reflection in
  const t = Date.now(); let mx = 0, mxr = 0;
  while (Date.now() - t < ms) {
    const s = await page.evaluate(() => { const w = window.PinLook && PinLook.world; if (!w) return null; const st = w.stats(); if (st.tier !== 'medium') w.setTier('medium'); return st; });
    if (s && s.tier === 'medium') { mx = Math.max(mx, (s.calls || 0) - (s.reflectCalls || 0)); mxr = Math.max(mxr, s.calls || 0); }
    await sleep(110);
  }
  R.calls[kind] = Math.max(R.calls[kind], mx); R.callsWithReflection[kind] = Math.max(R.callsWithReflection[kind], mxr);
}
async function still(page, name) { const f = path.join(OUT, VP + '-' + name + '.png'); await page.screenshot({ path: f }); R.stills.push(f); log('still ' + f); }
async function play(page) { if (PHONE) await page.tap('#tPlay'); else await page.click('#tPlay'); }
const api = (page, code, arg) => page.evaluate(new Function('arg', 'const A = ARCADE365, W = A.world, E = PinEngine, a = window.PinLevels ? PinLevels.active() : W; ' + code), arg);

async function classic(browser) {
  const { ctx, page } = await open(browser, 'classic');
  await play(page);
  let s = await waitFor(page, (x) => x.mode === 'play' && x.state === 'play', 8000);
  await sleep(1200);
  await still(page, 'home');
  step('Classic starts (goals.js on the world)', s && s.goals, s && { state: s.state, look3d: s.look, next: s.next });
  // a mode: MODE lit at the crater, the pilot sinks it
  let started = null;
  for (let tries = 0; tries < 3 && !started; tries++) {
    await waitFor(page, (x) => x.state === 'play' && x.free === 1 && !x.mb && x.depth === 0, 20000);
    await api(page, 'E.api.craterLit(W, "mode", true);');
    started = await waitFor(page, (x) => x.goals && x.goals.mode, 45000, 300);
    await calls(page, 'surface', 1500);
  }
  if (!started) R.forced.push('classic: no mode started in 3 tries');
  step('Classic: a mode starts from a lit MODE', started, started && { mode: started.goals.mode, next: started.next });
  if (started) { await sleep(1800); const h = await S(page); await still(page, 'next-hud'); step('the NEXT HUD shows the mode', /NEXT/.test(h.hud) && h.hudOn, h.hud.slice(0, 90)); }
  let done = await waitFor(page, (x) => x.goals && (x.goals.modesDone > 0 || !x.goals.mode), 60000, 400);
  const modeDone = !!(done && done.goals.modesDone > 0);
  step('Classic: the mode played out', done, done && { modesDone: done.goals.modesDone, diveLit: done.goals.diveLit, lit: done.lit });
  if (!modeDone || !(done.goals.diveLit || done.lit.indexOf('dive') >= 0)) { R.forced.push('classic: DIVE lit by PinGoals.dive (mode ' + (modeDone ? 'done, DIVE not lit' : 'not done') + ')'); await api(page, 'if (window.PinGoals) PinGoals.dive(W, 1200); else E.api.craterLit(W, "dive", true);'); }
  // DIVE -> the chamber
  let down = await waitFor(page, (x) => x.depth === 1, 40000, 300);
  for (let tries = 0; tries < 2 && !down; tries++) {   // (DIVE is dark during a multiball, and ERUPT, LOCK and MODE come first at the crater)
    R.forced.push('classic: DIVE relit'); await waitFor(page, (x) => x.state === 'play' && !x.mb && x.free === 1, 90000);
    await api(page, 'if (window.PinGoals) PinGoals.dive(W, 2700);'); down = await waitFor(page, (x) => x.depth === 1, 60000, 300);
  }
  step('Classic: DIVE takes the ball into THE MAGMA CHAMBER', down, down && { table: down.tableA, next: down.next, hud: down.hud.slice(0, 120) });
  if (down) {
    await sleep(2500); await still(page, 'chamber');
    await calls(page, 'chamber', 3000);
    const up = await waitFor(page, (x) => x.depth === 0, 80000, 500);
    step('Classic: back up from the chamber', up, up && up.last);
  }
  // THE BIG ONE: the pressure at the top, the pilot shoots ERUPT
  await waitFor(page, (x) => x.state === 'play' && x.free === 1 && !x.mb && x.depth === 0, 90000);
  const mb0 = (await S(page)).ev.mbstart || 0;
  let mb = null;
  for (let tries = 0; tries < 2 && !mb; tries++) {
    await api(page, 'const V = W.toys.volcano; if (V && W.press) V.pressure = W.press.level + 1;');
    mb = await waitFor(page, (x) => (x.ev.mbstart || 0) > mb0, 50000, 250);
  }
  if (!mb) { R.forced.push('classic: multiball started by E.api.multiball'); await api(page, 'E.api.multiball(W, 3, { save: 20 });'); mb = await waitFor(page, (x) => x.mb, 5000, 200); }
  step('Classic: THE BIG ONE multiball', mb, mb && { erupted: (mb.ev.erupt || 0), balls: mb.balls });
  if (mb) { await sleep(1100); await still(page, 'multiball'); await calls(page, 'multiball', 3000); }
  await ctx.close();
}

async function ember(browser) {
  const { ctx, page } = await open(browser, 'run');
  await play(page);
  let s = await waitFor(page, (x) => x.mode === 'play' && x.run && x.run.phase === 'play', 8000);
  step('Ember Run starts', s, s && { mission: s.run.mission, balls: s.run.balls, ban: s.ban });
  // the pilot plays each round's mission to STAGE CLEAR, then DIVE (20 s; a drain first ends the round: then the next round)
  let down = null, cl = null, rounds = 0;
  while (!down && rounds < 3) {
    rounds++;
    cl = await waitFor(page, (x) => x.run && x.run.cleared, 150000, 300);
    if (!cl) { R.forced.push('run: round ' + rounds + ' cleared by PinRun.clear'); await api(page, 'PinRun.clear(PinRunPage.run, W);'); cl = await waitFor(page, (x) => x.run && x.run.cleared, 3000, 100); }
    const banSeen = await waitFor(page, (x) => /STAGE CLEAR/.test(x.ban) || /STAGE CLEAR/.test(x.hud), 2500, 100);
    step('Ember Run: the pilot plays round ' + rounds + ' (its mission) to STAGE CLEAR', cl, cl && { round: cl.run.round, mission: cl.run.mission, banner: banSeen && banSeen.ban });
    down = await waitFor(page, (x) => x.depth === 1 || x.picking, 30000, 300);
    if (down && down.depth !== 1) { log('the ball drained before the DIVE (the round ends at the next drain after STAGE CLEAR): next round'); down = null; await page.evaluate(() => { const c = document.querySelector('#ov_pick [data-pick]'); if (c) PinRunPage.choose(c.getAttribute('data-pick')); }); await sleep(800); }
    else if (!down) break;
  }
  step('Ember Run: the dive after STAGE CLEAR', down, down && { round: down.run && down.run.round, next: down.next, balls: down.run && down.run.balls });
  if (down) { await calls(page, 'chamber', 2500); const up = await waitFor(page, (x) => x.depth === 0, 80000, 500); step('Ember Run: back up from the chamber', up, up && { last: up.last, balls: up.run && up.run.balls, next: up.next }); }
  await api(page, 'PinRunPage.endRound(true);');
  const pk = await waitFor(page, (x) => x.picking, 4000, 200);
  step('Ember Run: the pick card after the round', pk, pk && pk.run);
  for (let guard = 0; guard < 6; guard++) {   // on to round 4 (the boss)
    await page.evaluate(() => { const c = document.querySelector('#ov_pick [data-pick]'); if (c) PinRunPage.choose(c.getAttribute('data-pick')); });
    await sleep(600);
    const s4 = await S(page); if (s4.run && s4.run.round >= 4) break;
    await api(page, 'PinRunPage.endRound(true);'); await waitFor(page, (x) => x.picking, 4000, 200);
  }
  const bo = await waitFor(page, (x) => x.run && x.run.boss && x.state === 'play', 8000, 300);
  if (bo) { await sleep(2600); const b2 = await S(page); await still(page, 'boss'); step('Ember Run: round 4 is THE VOLCANO (a phase on the HUD)', /THE VOLCANO/.test(b2.hud), { boss: b2.run.boss, hud: b2.hud.slice(0, 120) }); }
  else step('Ember Run: round 4 is THE VOLCANO', false);
  await waitFor(page, (x) => x.state === 'play' && x.free >= 1, 20000);
  await api(page, 'PinRun.clear(PinRunPage.run, W);');
  const vm = await waitFor(page, (x) => x.mb && x.run && x.run.cleared, 8000, 200);
  step('Ember Run: the boss beaten -> VOLCANO DEFEATED and the victory multiball', vm, vm && { balls: vm.balls, ban: vm.ban, bossdown: vm.ev.bossdown || 0 });
  if (vm) { await sleep(1200); await still(page, 'victory'); }
  await sleep(3000);
  await api(page, 'PinRunPage.endRound(true);');
  await waitFor(page, (x) => x.picking, 5000, 200);
  await page.evaluate(() => { const c = document.querySelector('#ov_pick [data-pick]'); if (c) PinRunPage.choose(c.getAttribute('data-pick')); });
  await sleep(800);
  await api(page, 'PinRunPage.endRound(false);');
  const end = await waitFor(page, (x) => x.mode === 'over', 6000, 200);
  await sleep(1500);
  const lines = await page.evaluate(() => ({ why: (document.getElementById('oWhy') || {}).textContent, lines: (document.getElementById('oLines') || {}).textContent }));
  await still(page, 'end-card');
  step('Ember Run: run over in round 5, the end card', end, lines);
  await ctx.close();
}

(async () => {
  const browser = await pw.chromium.launch({ headless: true, executablePath: CHROME, args: [...require('./gpu2.cjs')(), '--use-angle=d3d11'] });
  try { await classic(browser); } catch (e) { step('Classic crashed', false, String(e && e.stack || e).slice(0, 300)); }
  try { await ember(browser); } catch (e) { step('Ember Run crashed', false, String(e && e.stack || e).slice(0, 300)); }
  await browser.close();
  R.ok = R.steps.every((x) => x.ok) && !R.errors.length;
  fs.writeFileSync(path.join(OUT, 'e2e-' + VP + '.json'), JSON.stringify(R, null, 1));
  log('draw calls (medium): ' + JSON.stringify(R.calls) + ' | forced: ' + (R.forced.join('; ') || 'none') + ' | errors: ' + R.errors.length);
  R.errors.slice(0, 10).forEach((e) => log('  ' + e));
  log(R.ok ? 'E2E PASS' : 'E2E FAIL');
  process.exit(R.ok ? 0 : 1);
})();
