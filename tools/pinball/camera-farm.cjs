/* 365 Pinball Hero - the camera farm (16 Oct 2026, next-gen wave 2): proves the camera director's guarantee on Ember
 * Peak over thousands of balls played by the messy-human bot (messybot.cjs), with camera.js running exactly as in the
 * page (its look-ahead in-line, answering `--latency` updates late, as a worker would).
 *
 *   node tools/pinball/camera-farm.cjs [--balls=1000] [--mode=calm|arcade|classic] [--aspect=0.5] [--speed=2]
 *        [--latency=2] [--workers=24] [--seed=1] [--json=out.json]
 *        [--early=0.5] [--set=key:value,...]   (the active mode's early allowance; any of its MODES knobs, to try them)
 *
 * Each drawn frame (60 a second) the game takes as many steps as the camera's timeScale allows (as the page must), then
 * the camera updates. Checked:
 *  - every APPROACH: when a ball crosses into a storey's approach zone, the 0.5 s of game time before it must all have
 *    been shown at game speed 1.0, with that storey's flipper box fully on screen (camera.js boxes(): the zone and the
 *    flippers, padded for shake and the table's nudge slide) and still (no part of the box moving more than 0.5% of
 *    the screen's height a second);
 *  - every LIVE FLIP: a press of a flipper button while a ball is in that storey's zone: the same three things for the
 *    half second before the press; and every EARLY press, made before the ball enters but within the active mode's
 *    `early` allowance (camera.js timing(): 0.5 s calm and classic, 0.1 s arcade since 29 Oct 2026): the same again
 *    (presses made sooner than that are measured as earlyBeyondPromise, outside the pass);
 *  - emergency cuts (aim: under 1 per 100 balls), and that no "decided" drain was ever saved;
 * and reported: time away from home and zoomed, push-ins a minute, the ball off screen, the time in each state, how
 * often the look-ahead was asked and how far it stepped. */
'use strict';
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const ROOT = path.join(__dirname, '..', '..');
const E = require(path.join(ROOT, 'games', 'pinball', 'engine.js'));
const C = require(path.join(ROOT, 'games', 'pinball', 'camera.js'));
const Messy = require('./messybot.cjs');

function args() {
  const o = { balls: 1000, mode: 'calm', aspect: 0.5, speed: 2, latency: 2, workers: 24, seed: 1, json: '', maxMin: 25 };
  process.argv.slice(2).forEach((a) => { const m = /^--([^=]+)=(.*)$/.exec(a); if (m) o[m[1]] = isNaN(+m[2]) || m[2] === '' ? m[2] : +m[2]; });
  return o;
}

// ------------------------------------------------------------ one game, measured
function playGame(seed, o, acc) {
  // the early-press allowance is the ACTIVE mode's (29 Oct 2026: arcade 0.1 s, calm and classic 0.5 s); --early= overrides it for that mode
  C.configure({ forecaster: 'sync', latency: o.latency, early: o.early !== '' && o.early != null && C.MODES[o.mode].early == null ? o.early : 0.5 });
  if (o.early !== '' && o.early != null && C.MODES[o.mode].early != null) C.MODES[o.mode].early = o.early;
  if (o.set) String(o.set).split(',').forEach((kv) => { const p = kv.split(':'); C.MODES[o.mode][p[0]] = isNaN(+p[1]) ? p[1] : +p[1]; });   // --set=look:12,spare:0.2 tries the mode's knobs
  C.setMode(o.mode); C.setAspect(o.aspect); C.reset();
  const EARLY = Math.round(C.timing(o.mode).early * 60);   // steps: an early press made up to this long before a ball arrives is checked
  const W = E.newWorld(o.speed, null, seed, 'ember'), bot = Messy.create(seed), Bt = E.table(W.tableId), T = Bt.T;
  const boxes = C.boxes(W.tableId), NS = T.storeys.length, home = C.home(o.aspect, W.tableId);
  const ring = [];   // the drawn frames: { g: game frame when drawn, shot, ts, on: [box fully on screen per storey], pts }
  const zoneHist = []; // per game frame: bitmask of storeys with a (live) ball in their zone
  const pendingFlips = [];
  let t = 0, accT = 0, shot = null, prevL = false, prevR = false, lastBalls = 0, decidedId = 0, frames = 0;
  const inZonePrev = {};
  function boxState(s) {
    const on = [], pts = [];
    for (let i = 0; i < NS; i++) {
      let ok = true; const p = [];
      for (const q of boxes[i].pts) { const v = C.project(s, o.aspect, q[0], q[1], q[2]); p.push(v); if (!(v[0] >= 0 && v[0] <= 1 && v[1] >= 0 && v[1] <= 1)) ok = false; }
      on.push(ok); pts.push(p);
    }
    return { on, pts };
  }
  // were the half second of game frames before game frame f shown at speed 1.0, storey s's box on screen and still?
  function check(f, s, early) {
    const win = ring.filter((r) => r.g >= f - 30 && r.g <= f - 1);
    if (!win.length || win[0].g > f - 30 + 1) return { skip: true };
    let ts = true, on = true, still = true, cut = false;
    const states = win.map((r) => r.st + (r.ts !== 1 ? '*' : '')).filter((x, i, a) => i === 0 || x !== a[i - 1]).join('>');
    for (let i = 0; i < win.length; i++) {
      const r = win[i];
      if (r.ts !== 1) ts = false;
      if (!r.on[s]) on = false;
      if (r.cut) cut = true;
      if (i > 0) {
        const a = win[i - 1].pts[s], b = r.pts[s];
        for (let k = 0; k < a.length; k++) if (Math.abs(a[k][0] - b[k][0]) > 0.005 / 60 + 1e-9 || Math.abs(a[k][1] - b[k][1]) > 0.005 / 60 + 1e-9) still = false;
      }
    }
    // the frame before the window too: a cut just before it shows as a jump into the window
    return { ts, on, still, cut: cut || explained(f, early), states };
  }
  function tally(kind, res) {
    if (res.skip) return;
    if ((!res.ts || !res.on || !res.still) && !res.cut && !recentCut() && kind !== 'beyond' && acc.badList.length < 30) acc.badList.push({ kind, seed, frame: W.frame, ts: res.ts, on: res.on, still: res.still, states: res.states });
    acc[kind].n++;
    if (!res.ts) acc[kind].ts++;
    if (!res.on) acc[kind].off++;
    if (!res.still) acc[kind].moving++;
    if (!res.ts || !res.on || !res.still) { acc[kind].bad++; if (res.cut || recentCut()) acc[kind].badAfterCut++; }
  }
  const emergAt = [];
  // an emergency (a cut, or a nudge that left too little still time) in the second before a check explains a miss
  function explained(f, early, upTo) { for (let i = emergAt.length - 1; i >= 0 && emergAt[i][0] >= f - 61; i--) if (emergAt[i][0] <= (upTo || f) && (early || emergAt[i][1] === 'rule')) return true; return false; }
  function recentCut() { return false; }
  function liveMask() {
    let m = 0;
    const lone = W.balls.length === 1;
    W.balls.forEach((b) => { const s = E.inApproach(W, b); if (s >= 0 && !(lone && C.decided(W, b))) m |= 1 << s; });
    return m;
  }
  function stepGame() {
    const inp = bot(W);
    const bIds = W.balls.map((b) => b.id);
    E.step(W, inp);
    frames = W.frame;
    acc.gameFrames++;
    // events
    for (const ev of W.events) {
      const n = typeof ev === 'string' ? ev : ev.sfx;
      if (n === 'drain') acc.balls++;
      if (n === 'crater') acc.craters++;
      if (n === 'nudge') acc.nudges++;
      if (n === 'tilt') acc.tilts++;
    }
    W.events.length = 0;
    // approach entries (live balls only)
    const lone = W.balls.length === 1;
    W.balls.forEach((b) => {
      const s = E.inApproach(W, b), live = s >= 0 && !(lone && C.decided(W, b));
      const was = inZonePrev[b.id];
      if (live && was !== s) { acc.entries++; tally('entry', Object.assign(check(W.frame, s), {})); }
      inZonePrev[b.id] = live ? s : -1;
    });
    // decided drains must never be saved: once called, the ball must never again come within touching distance of a
    // flipper of its storey (it may only leave the table)
    if (lone) {
      const b = W.balls[0];
      if (decidedId !== b.id && C.decided(W, b)) { decidedId = b.id; acc.decidedN++; }
      else if (decidedId === b.id && W.flippers.some((f) => { const tx = f.x + Math.cos(f.a) * f.len, ty = f.y + Math.sin(f.a) * f.len, dx = tx - f.x, dy = ty - f.y; let u = ((b.x - f.x) * dx + (b.y - f.y) * dy) / (dx * dx + dy * dy); u = u < 0 ? 0 : u > 1 ? 1 : u; return Math.hypot(b.x - f.x - dx * u, b.y - f.y - dy * u) < f.r0 + T.BALL + 0.5; })) { acc.decidedSaved++; decidedId = 0; }
    } else decidedId = 0;
    if (W.balls.length > 1) acc.multiFrames++;
    // flips: a rising edge of either button
    const L = !!W.prevL, R = !!W.prevR;
    if ((L && !prevL) || (R && !prevR)) {
      acc.flips++;
      const res = [], res2 = []; for (let s = 0; s < NS; s++) { res.push(check(W.frame, s)); res2.push(check(W.frame, s, true)); }
      pendingFlips.push({ f: W.frame, res, res2 });
    }
    prevL = L; prevR = R;
    zoneHist[W.frame] = liveMask();
    // a flip is live for storey s if a ball is in s's zone at the press or within the next 30 steps
    while (pendingFlips.length && pendingFlips[0].f <= W.frame - 30) {
      const pf = pendingFlips.shift();
      for (let s = 0; s < NS; s++) {
        let lead = -1;
        for (let g = pf.f; g <= pf.f + 30; g++) if (zoneHist[g] & (1 << s)) { lead = g - pf.f; break; }
        if (lead === 0) { acc.liveFlips++; tally('flip', pf.res[s]); }
        else if (lead > 0 && lead <= EARLY) { acc.earlyFlips++; const r = pf.res2[s]; if (!r.skip && explained(pf.f, true, pf.f + lead)) r.cut = true; tally('early', r); }
        else if (lead > 0) { acc.earlyBeyond++; const r = pf.res2[s]; if (!r.skip && explained(pf.f, true, pf.f + lead)) r.cut = true; tally('beyond', r); }   // pressed sooner than the mode promises a still picture for (arcade: more than 0.1 s early): measured, not in the pass
      }
    }
  }
  const maxFrames = o.maxMin * 3600;
  let drawn = 0;
  while (!W.over && drawn < maxFrames * 3) {
    const ts = shot ? shot.timeScale : 1;
    accT += ts;
    while (accT >= 1 - 1e-9 && !W.over) { accT -= 1; stepGame(); }
    if (W.over) break;
    shot = C.update(W, t, 'play', o.aspect);
    t += 1000 / 60; drawn++;
    if (shot.cut) acc.cuts++;
    if (shot.emergency) { if (shot.emergency === 'rule') acc.emerg++; else acc.short++; emergAt.push([W.frame, shot.emergency]); }
    const bs = boxState(shot);
    ring.push({ g: W.frame, ts: shot.timeScale, on: bs.on, pts: bs.pts, cut: shot.cut, st: shot.state });
    if (ring.length > 80) ring.shift();
    // time shares (real time: drawn frames)
    acc.drawn++;
    const away = Math.abs(shot.cx - home.cx) > 1e-6 || Math.abs(shot.cy - home.cy) > 1e-6 || Math.abs(shot.span - home.span) > 1e-6 || Math.abs(shot.tilt - home.tilt) > 1e-6 || Math.abs(shot.yaw) > 1e-6;
    if (away) acc.away++;
    if (shot.zoom >= 1.15) acc.zoomed++;
    if (shot.timeScale < 1) acc.slow++;
    acc.states[shot.state] = (acc.states[shot.state] || 0) + 1;
    if (W.state === 'play' && W.balls.length) {
      acc.ballFrames++;
      const off = W.balls.some((b) => { const v = C.project(shot, o.aspect, b.x, b.y, b.z || 0); return !(v[0] >= 0 && v[0] <= 1 && v[1] >= 0 && v[1] <= 1); });
      if (off) acc.ballOff++;
    }
    if (W.frame > maxFrames) break;
  }
  const st = C.stats();
  acc.pushIns += st.pushIns; acc.asks += st.asks; acc.steps += st.steps; acc.games++;
  acc.scores.push(W.score);
  if (st.cuts !== 0) acc.cutsCam += st.cuts;
}
function blank() {
  const k = () => ({ n: 0, bad: 0, ts: 0, off: 0, moving: 0, badAfterCut: 0 });
  return { games: 0, balls: 0, gameFrames: 0, drawn: 0, away: 0, zoomed: 0, slow: 0, states: {}, ballFrames: 0, ballOff: 0,
    entries: 0, flips: 0, liveFlips: 0, entry: k(), flip: k(), beyond: k(), cuts: 0, emerg: 0, short: 0, cutsCam: 0, pushIns: 0, asks: 0, steps: 0,
    decidedSaved: 0, decidedN: 0, badList: [], earlyFlips: 0, earlyBeyond: 0, early: k(), craters: 0, nudges: 0, tilts: 0, multiFrames: 0, scores: [] };
}
function merge(a, b) {
  for (const k of Object.keys(b)) {
    if (k === 'scores' || k === 'badList') a[k] = a[k].concat(b[k]);
    else if (k === 'states') for (const s of Object.keys(b.states)) a.states[s] = (a.states[s] || 0) + b.states[s];
    else if (typeof b[k] === 'object') for (const j of Object.keys(b[k])) a[k][j] += b[k][j];
    else a[k] += b[k];
  }
  return a;
}

if (!isMainThread) {
  const { o, seeds } = workerData, acc = blank();
  for (const s of seeds) { playGame(s, o, acc); if (acc.balls >= o.quota) break; }
  parentPort.postMessage(acc);
} else {
  const o = args(), t0 = Date.now();
  if (o.set) String(o.set).split(',').forEach((kv) => { const p = kv.split(':'); C.MODES[o.mode][p[0]] = isNaN(+p[1]) ? p[1] : +p[1]; });   // so config.timing reports what the workers ran
  if (o.early !== '' && o.early != null) { if (C.MODES[o.mode].early != null) C.MODES[o.mode].early = o.early; else C.configure({ early: o.early }); }
  // about 4 balls a game (3 and the saves / extras): give each worker enough seeds, stop at its quota of balls
  const nW = Math.max(1, Math.min(o.workers, Math.ceil(o.balls / 20)));
  const quota = Math.ceil(o.balls / nW), jobs = [];
  for (let w = 0; w < nW; w++) {
    const seeds = []; for (let i = 0; i < quota * 2; i++) seeds.push(o.seed * 100000 + w * 1000 + i + 1);
    jobs.push(new Promise((res, rej) => { const wk = new Worker(__filename, { workerData: { o: Object.assign({ quota }, o), seeds } }); wk.on('message', res); wk.on('error', rej); }));
  }
  Promise.all(jobs).then((parts) => {
    const a = parts.reduce(merge, blank()), pct = (x, n) => (100 * x / Math.max(1, n)).toFixed(1) + '%';
    const realMin = a.drawn / 3600, sc = a.scores.sort((x, y) => x - y);
    const out = {
      config: { mode: o.mode, aspect: o.aspect, speed: o.speed, latency: o.latency, set: o.set || '', timing: C.timing(o.mode) },
      games: a.games, balls: a.balls, gameMinutes: +(a.gameFrames / 3600).toFixed(1), realMinutes: +realMin.toFixed(1),
      approaches: a.entry, liveFlips: a.flip, earlyFlips: a.early, earlyBeyondPromise: a.beyond, flips: a.flips,
      cuts: a.cuts, cutsPer100Balls: +(100 * a.cuts / Math.max(1, a.balls)).toFixed(2), emergencies: a.emerg, emergenciesPer100Balls: +(100 * a.emerg / Math.max(1, a.balls)).toFixed(2), shortStills: a.short, shortStillsPer100Balls: +(100 * a.short / Math.max(1, a.balls)).toFixed(2), decidedDrains: a.decidedN, decidedSaved: a.decidedSaved,
      away: pct(a.away, a.drawn), zoomed: pct(a.zoomed, a.drawn), slowMotion: pct(a.slow, a.drawn), pushInsPerMin: +(a.pushIns / Math.max(1e-9, realMin)).toFixed(2),
      ballOffScreen: pct(a.ballOff, a.ballFrames), states: Object.fromEntries(Object.entries(a.states).map(([k, v]) => [k, pct(v, a.drawn)])),
      craters: a.craters, nudgesPerBall: +(a.nudges / Math.max(1, a.balls)).toFixed(1), tilts: a.tilts, multiballShare: pct(a.multiFrames, a.gameFrames),
      lookAhead: { asksPerSec: +(a.asks / Math.max(1, a.gameFrames / 60)).toFixed(2), stepsPerAsk: Math.round(a.steps / Math.max(1, a.asks)) },
      bad: a.badList.slice(0, 12),
      medianScore: sc[sc.length >> 1] || 0, seconds: Math.round((Date.now() - t0) / 1000)
    };
    out.pass = out.approaches.bad - out.approaches.badAfterCut === 0 && out.liveFlips.bad - out.liveFlips.badAfterCut === 0 && out.earlyFlips.bad - out.earlyFlips.badAfterCut === 0 && out.emergenciesPer100Balls < 1 && out.decidedSaved === 0;
    console.log(JSON.stringify(out, null, 1));
    if (o.json) require('fs').writeFileSync(o.json, JSON.stringify(out, null, 1));
  }).catch((e) => { console.error(e); process.exit(1); });
}
