/* 365 Coast Run - the cabinet, the dashboard and the sounds (rebuilt in 3D, 5 Oct 2026). The rules are engine.js
 * (window.CREngine); the 3D picture is world3d.js (three.js); this file puts the arcade cabinet together
 * (../common/arcade.js), draws the dashboard over the 3D picture (time, score, where you are, speed, boost, the lights,
 * banners and the little labels) and makes the sounds: one-off effects, and the engine, wind and tyres that follow the
 * car, and the music: a track for each place (music/, Settings > Music, on unless switched off). A browser without 3D graphics
 * gets a short note instead of the game. */
import { createWorld } from './world3d.js?v=2';

const E = window.CREngine, ART = window.CRArt, A = window.Arcade365;
const GW = 384, GH = 224;
const reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let world = null, worldTried = false;
window.COAST3D = { get world() { return world; } };   // for the tests (read-only look at the 3D world)
function getWorld() { if (!worldTried) { worldTried = true; try { world = createWorld(); } catch (e) { world = null; if (window.console) console.warn('365 Coast Run: 3D failed', e); } } return world; }

const R = { lastT: 0, demoAcc: 0, W: null, goT: -1, shownScore: 0, lastV: 0, braking: false, boostK: 0, slow: 0, scale: 1, shakeOn: true };
let K = 3;
function roundRect(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
const GLOW = {};
function glowDot(col) {
  let d = GLOW[col]; if (d) return d;
  d = document.createElement('canvas'); d.width = d.height = 64; const x = d.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return (GLOW[col] = d);
}

// ---------------------------------------------------------------- the picture
function draw(g, W, t, mode, info) {
  K = info.scale;
  const frameDt = R.lastT ? Math.min(0.1, (t - R.lastT) / 1000) : 1 / 60; R.lastT = t;
  if (R.W !== W) { R.W = W; R.goT = -1; R.shownScore = W.score; R.lastV = W.v; }
  // the title screen drives itself along the coast
  if (mode === 'title' && W.demo) {
    if (W.count > 0) { W.count = 0; W.v = E.topSpeed(W) * 0.6; }   // no lights: the demo drives straight away
    R.demoAcc += frameDt; let n = 0;
    while (R.demoAcc > 1 / 60 && n < 4) { W.time = 60; E.step(W, E.autopilot(W)); W.events.length = 0; W.pops.length = 0; W.banner = null; R.demoAcc -= 1 / 60; n++; }
    if (n === 4) R.demoAcc = 0;
  }
  R.braking = (W.v < R.lastV - 0.2) && !W.timeUp && !W.crash; R.lastV = W.v;
  R.boostK += ((W.boosting ? 1 : 0) - R.boostK) * Math.min(1, frameDt * 4);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const wd = getWorld();
  if (!wd) {
    g.fillStyle = '#0b1220'; g.fillRect(0, 0, info.dw, info.dh);
    g.setTransform(K, 0, 0, K, 0, 0);
    hudText(g, '365 Coast Run needs 3D graphics', GW / 2, GH / 2 - 8, 14, '#ffffff', 'center');
    hudText(g, 'This browser has them switched off. Try Chrome or Edge, or ring us on 01202 775566.', GW / 2, GH / 2 + 12, 7.5, '#bfe6ff', 'center');
    return;
  }
  const t0 = performance.now();
  const cap = Math.sqrt(1.8e6 / (info.dw * info.dh)), k = Math.min(1, cap) * R.scale;
  wd.setSize(Math.max(64, Math.round(info.dw * k)), Math.max(64, Math.round(info.dh * k)));
  wd.setShake(R.shakeOn);
  const cv = wd.render(W, t, mode);
  g.imageSmoothingEnabled = true; g.drawImage(cv, 0, 0, info.dw, info.dh);
  // a slow PC: a smaller picture, no shadows, a shorter view
  const took = performance.now() - t0;
  R.slow = R.slow * 0.96 + (took > 18 ? 1 : 0) * 0.04;
  if (R.slow > 0.6 && R.scale === 1 && t > 4000) { R.scale = 0.75; wd.quality(true); }
  g.setTransform(K, 0, 0, K, 0, 0);
  if (R.boostK > 0.05) speedLines(g, t, R.boostK);
  hud(g, W, t, mode);
}
function speedLines(g, t, k) {
  g.save(); g.globalAlpha = 0.3 * k; g.strokeStyle = '#ffffff'; g.lineWidth = 0.7;
  const r = (t / 16) | 0, cy = GH * 0.45;
  for (let i = 0; i < 26; i++) {
    const a = ((i * 137.5 + r * 23) % 360) * Math.PI / 180, r0 = 80 + ((i * 53 + r * 17) % 60), r1 = r0 + 30 + ((i * 29) % 40);
    g.beginPath(); g.moveTo(GW / 2 + Math.cos(a) * r0 * 1.6, cy + Math.sin(a) * r0); g.lineTo(GW / 2 + Math.cos(a) * r1 * 1.6, cy + Math.sin(a) * r1); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- the dashboard
function hudText(g, s, x, y, size, col, align, stroke) {
  g.font = '800 ' + size + 'px ' + ART.FONT; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic';
  if (stroke !== false) { g.lineJoin = 'round'; g.lineWidth = Math.max(1, size * 0.16); g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(s, x, y); }
  g.fillStyle = col; g.fillText(s, x, y);
}
function stretchOf(W, i) { for (let j = W.stretch.length - 1; j >= 0; j--) if (i >= W.stretch[j].from && i < W.stretch[j].to) return W.stretch[j]; return null; }
const STAGE_POS = { 0: [0, 0], 1: [1, 0], 2: [1, 1], 3: [2, 0], 4: [2, 1], 5: [2, 2] };
function hud(g, W, t, mode) {
  const pi = E.segIndex(W.s), tm = Math.ceil(W.time), low = !W.timeUp && W.time <= 10 && W.count <= 0, flash = low && (t / 250 | 0) % 2;
  hudText(g, 'TIME', 10, 13, 7.5, '#ffe9a8');
  hudText(g, String(tm), 9, 38, 26, flash ? '#ff4d4d' : low ? '#ff9a3c' : '#ffd400');
  R.shownScore += (W.score - R.shownScore) * 0.2; if (Math.abs(W.score - R.shownScore) < 1) R.shownScore = W.score;
  hudText(g, 'SCORE', GW - 10, 13, 7.5, '#bfe6ff', 'right');
  hudText(g, Math.round(R.shownScore).toLocaleString('en-GB'), GW - 10, 29, 14, '#ffffff', 'right');
  hudText(g, 'STAGE ' + W.stageNo + (W.round > 1 ? '  ·  ROUND ' + W.round : ''), GW - 10, 40, 7, '#bfe6ff', 'right');
  const st = stretchOf(W, pi), S = E.STAGES[(st && st.id) || 0];
  hudText(g, S.name, GW / 2, 13, 8.5, '#ffffff', 'center');
  if (st) {
    const p = Math.max(0, Math.min(1, (pi - st.from) / (st.to - st.from))), bw = 96, bx = GW / 2 - bw / 2, by = 18;
    g.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(g, bx - 1, by - 1, bw + 2, 6, 3); g.fill();
    g.fillStyle = '#ffd400'; roundRect(g, bx, by, Math.max(2, bw * p), 4, 2); g.fill();
    g.fillStyle = S.next ? '#ffffff' : '#4ade80'; g.beginPath(); g.arc(bx + bw, by + 2, 2.6, 0, Math.PI * 2); g.fill();
  }
  routeMap(g, W, 10, GH - 34, t);
  hudText(g, String(E.mph(W)), GW - 34, GH - 15, 22, W.boosting ? '#7fd8ff' : '#ffffff', 'right');
  hudText(g, 'MPH', GW - 10, GH - 15, 7.5, '#bfe6ff', 'right');
  const bw2 = 64, bx2 = GW - 10 - bw2, by2 = GH - 10;
  g.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(g, bx2 - 1, by2 - 1, bw2 + 2, 6, 3); g.fill();
  const bg2 = g.createLinearGradient(bx2, 0, bx2 + bw2, 0); bg2.addColorStop(0, '#2f7cf6'); bg2.addColorStop(1, '#7fe8ff');
  g.fillStyle = bg2; roundRect(g, bx2, by2, Math.max(1, bw2 * W.boost), 4, 2); g.fill();
  hudText(g, 'BOOST', bx2 - 4, by2 + 5, 6.5, W.boosting ? '#ffffff' : W.boost > 0.25 && ((t / 400 | 0) % 2) ? '#7fe8ff' : '#9fb3c8', 'right');
  if (W.drift) hudText(g, 'DRIFT', GW / 2, GH - 12, 9, '#ffb347', 'center');
  if (W.count > 0 || (R.goT >= 0 && W.t - R.goT < 50)) lights(g, W);
  if (W.count <= 0 && R.goT < 0) R.goT = W.t;
  const F = W.fork;
  if (F && !F.s && pi > F.a - 70 && pi < F.split && mode !== 'title') {
    const L = E.STAGES[F.next[0]].name, Rn = E.STAGES[F.next[1]].name, side = W.x < -1 ? -1 : W.x > 1 ? 1 : 0;
    roundRect(g, GW / 2 - 140, 52, 280, 18, 9); g.fillStyle = 'rgba(0,40,20,0.72)'; g.fill();
    hudText(g, '◀ ' + L, GW / 2 - 8, 65, 9, side < 0 ? '#ffd400' : '#ffffff', 'right', false);
    hudText(g, Rn + ' ▶', GW / 2 + 8, 65, 9, side > 0 ? '#ffd400' : '#ffffff', 'left', false);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(GW / 2 - 0.5, 55, 1, 12);
  }
  if (mode === 'play' && W.stageNo === 1 && W.count <= 0 && W.t - R.goT < 480 && R.goT >= 0 && !document.body.classList.contains('touchy')) {
    hudText(g, '◀ ▶ steer   ·   SPACE boost   ·   tap ▼ while turning to drift', GW / 2, GH - 30, 7.5, '#ffffff', 'center');
  }
  banner(g, W);
  pops(g, W);
}
function routeMap(g, W, x0, y0, t) {
  const dx = 14, dy = 10, route = W.route || [0], here = route[route.length - 1];
  const at = (id) => { const p = STAGE_POS[id]; return [x0 + 4 + p[0] * dx, y0 + 4 + (p[1] - p[0] / 2) * dy + dy]; };
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,0.3)';
  [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5]].forEach((e) => { const a = at(e[0]), b = at(e[1]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); });
  g.strokeStyle = '#ffd400'; g.lineWidth = 1.6;
  for (let i = 1; i < route.length; i++) { const a = at(route[i - 1]), b = at(route[i]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  for (let id = 0; id < 6; id++) {
    const p = at(id), on = route.indexOf(id) >= 0, cur = id === here;
    g.fillStyle = cur ? ((t / 300 | 0) % 2 ? '#ffffff' : '#ffd400') : on ? '#ffd400' : 'rgba(255,255,255,0.45)';
    g.beginPath(); g.arc(p[0], p[1], cur ? 2.8 : 2.1, 0, Math.PI * 2); g.fill();
  }
}
function lights(g, W) {
  const x = GW / 2 - 36, y = 26, lit = W.count > 180 ? 0 : W.count > 120 ? 1 : W.count > 60 ? 2 : W.count > 0 ? 3 : 4;
  g.fillStyle = '#111'; roundRect(g, x, y, 72, 22, 6); g.fill(); g.fillStyle = '#333'; roundRect(g, x + 2, y + 2, 68, 18, 5); g.fill();
  for (let i = 0; i < 3; i++) {
    const on = lit === 4 ? '#3bff6a' : i < lit ? '#ff2b2b' : '#3a1414', cx = x + 14 + i * 22, cy = y + 11;
    g.fillStyle = on; g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fill();
    if (lit === 4 || i < lit) { g.globalCompositeOperation = 'lighter'; g.drawImage(glowDot(lit === 4 ? '#3bff6a' : '#ff2b2b'), cx - 16, cy - 16, 32, 32); g.globalCompositeOperation = 'source-over'; }
  }
}
const BANNER_COL = { check: ['#ffd400', '#ffffff'], stage: ['#ffffff', '#bfe6ff'], goal: ['#4ade80', '#ffd400'], red: ['#ff4d4d', '#ffffff'], go: ['#3bff6a', '#ffffff'], gold: ['#ffd400', '#ffffff'] };
function banner(g, W) {
  const b = W.banner; if (!b) return;
  const age = W.t - b.t, dur = b.kind === 'go' ? 50 : b.kind === 'red' ? 400 : 160; if (age > dur || age < 0) return;
  const cols = BANNER_COL[b.kind] || BANNER_COL.stage, inK = Math.min(1, age / 10), outK = Math.min(1, (dur - age) / 16), s = 0.7 + 0.3 * inK + (b.kind === 'goal' ? Math.sin(age / 6) * 0.03 : 0);
  g.save(); g.globalAlpha = outK; g.translate(GW / 2, 86); g.scale(s, s);
  hudText(g, b.txt, 0, 0, b.kind === 'go' ? 34 : 24, cols[0], 'center');
  if (b.sub) hudText(g, b.sub, 0, 16, 10, cols[1], 'center');
  g.restore();
}
const POP_COL = { near: '#7fe8ff', drift: '#ffb347', gold: '#ffd400', nitro: '#7fb8ff', slip: '#c9b8ff' };
function pops(g, W) {
  for (let i = 0; i < W.pops.length; i++) {
    const p = W.pops[i], age = W.t - p.t; if (age > 70 || age < 0) continue;
    const a = Math.min(1, (70 - age) / 18), y = 140 - age * 0.5, x = GW / 2 + Math.max(-1, Math.min(1, p.x / 5)) * 70;
    g.globalAlpha = a;
    hudText(g, p.txt, x, y, 10, POP_COL[p.kind] || '#ffffff', 'center');
    if (p.sub) hudText(g, p.sub, x, y + 10, 8, '#ffffff', 'center');
    g.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- sounds: one-off effects, and the engine, wind and tyres that follow the car
function pan(e) { return e && e.x != null ? Math.max(-0.8, Math.min(0.8, e.x * 0.12)) : 0; }
function sound(name, S, e) {
  const p = pan(e), n = (e && e.n) || 1;
  switch (name) {
    case 'count': S.tone(523, 0.32, 0.09, { type: 'square', verb: 0.25 }); break;
    case 'go': S.tone(1046, 0.7, 0.1, { type: 'square', verb: 0.4 }); S.tone(1568, 0.6, 0.04, { type: 'triangle', verb: 0.4 }); break;
    case 'perfect': [784, 988, 1175, 1568].forEach((f, k) => S.tone(f, 0.16, 0.05, { type: 'square', when: k * 0.05, verb: 0.4 })); break;
    case 'bump': S.noise(0.3, 0.28, 1400, { pan: p, verb: 0.2 }); S.tone(110, 0.22, 0.16, { type: 'sine', to: 45, pan: p }); S.noise(0.12, 0.08, 6000, { type: 'highpass', to: 3000, pan: p }); break;
    case 'crash':
      S.noise(1.4, 0.4, 2600, { verb: 0.5 }); S.tone(80, 1, 0.24, { type: 'sine', to: 25 }); S.noise(0.6, 0.12, 9000, { type: 'highpass', to: 5000, when: 0.08 });
      for (let i = 0; i < 4; i++) S.noise(0.12, 0.12, 1800, { when: 0.25 + i * 0.22, pan: (i % 2 ? 0.4 : -0.4) });
      break;
    case 'scrape': S.noise(0.16, 0.07, 3800, { type: 'bandpass', q: 3, to: 2400, pan: p }); S.tone(1900 + Math.random() * 600, 0.08, 0.012, { type: 'sawtooth', pan: p }); break;
    case 'near': S.noise(0.42, 0.16, 500, { type: 'bandpass', q: 1.4, to: 3200, pan: p }); S.tone(880 * Math.pow(1.122, Math.min(n, 9) - 1), 0.14, 0.04, { type: 'triangle', when: 0.05, verb: 0.3 }); break;
    case 'coin': { const f0 = 1318 * Math.pow(1.0595, Math.min(n, 12) - 1); S.tone(f0, 0.07, 0.04, { type: 'square', pan: p }); S.tone(f0 * 1.5, 0.16, 0.035, { type: 'square', when: 0.05, pan: p, verb: 0.2 }); break; }
    case 'line': [1047, 1319, 1568, 2093].forEach((f, k) => S.tone(f, 0.12, 0.04, { type: 'square', when: k * 0.06, verb: 0.35 })); break;
    case 'nitro': S.tone(300, 0.4, 0.06, { type: 'sawtooth', to: 1400, verb: 0.3 }); S.noise(0.4, 0.08, 600, { type: 'bandpass', q: 2, to: 5000 }); break;
    case 'boost': S.noise(0.8, 0.14, 300, { type: 'bandpass', q: 1.2, to: 3000, verb: 0.3 }); S.tone(160, 0.6, 0.06, { type: 'sawtooth', to: 320 }); break;
    case 'check': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, k) => S.tone(f, 0.14, 0.055, { type: 'square', when: k * 0.08, verb: 0.4 })); break;
    case 'goal':
      if (sting('goal')) break;
      [523, 659, 784, 1047, 1319, 1568].forEach((f, k) => S.tone(f, 0.2, 0.06, { type: 'square', when: k * 0.09, verb: 0.45 }));
      [1047, 1319, 1568, 2093].forEach((f) => S.tone(f, 1.1, 0.03, { type: 'triangle', when: 0.6, verb: 0.5 }));
      break;
    case 'tick': S.tone(n <= 5 ? 1320 : 990, 0.07, 0.06, { type: 'square' }); break;
    case 'timeup': if (sting('timeup')) break; [523, 440, 349, 262].forEach((f, k) => S.tone(f, 0.3, 0.07, { type: 'triangle', when: k * 0.24, verb: 0.4 })); break;
    case 'fork': S.tone(784, 0.14, 0.05, { type: 'triangle', verb: 0.3 }); S.tone(1175, 0.2, 0.05, { type: 'triangle', when: 0.1, verb: 0.3 }); break;
    case 'skid': S.noise(0.35, 0.07, 2600, { type: 'bandpass', q: 9, to: 2200 }); break;
    case 'driftend': S.tone(988, 0.1, 0.04, { type: 'square', verb: 0.3 }); S.tone(1319, 0.16, 0.04, { type: 'square', when: 0.07, verb: 0.3 }); break;
    case 'slip': S.noise(0.5, 0.06, 900, { type: 'bandpass', q: 2, to: 2400 }); break;
    case 'bush': S.noise(0.28, 0.12, 2200, { type: 'bandpass', q: 0.8, to: 600, pan: p }); break;
    case 'land': S.tone(90, 0.2, 0.08 + 0.04 * n, { type: 'sine', to: 40 }); S.noise(0.18, 0.06 + 0.04 * n, 900, { to: 200 }); break;
    case 'extra': [523, 659, 784, 1047].forEach((f, k) => S.tone(f, 0.1, 0.05, { type: 'square', when: k * 0.08, verb: 0.3 })); break;
  }
}
let AU = null;
function makeAudio(a, bus) {
  const o = {};
  o.g = a.createGain(); o.g.gain.value = 0; o.f = a.createBiquadFilter(); o.f.type = 'lowpass'; o.f.Q.value = 3; o.f.frequency.value = 600;
  o.f.connect(o.g); o.g.connect(bus);
  o.o1 = a.createOscillator(); o.o1.type = 'sawtooth'; o.o2 = a.createOscillator(); o.o2.type = 'square'; o.o3 = a.createOscillator(); o.o3.type = 'triangle';
  const m1 = a.createGain(), m2 = a.createGain(), m3 = a.createGain(); m1.gain.value = 0.5; m2.gain.value = 0.32; m3.gain.value = 0.4;
  o.o1.connect(m1); o.o2.connect(m2); o.o3.connect(m3); m1.connect(o.f); m2.connect(o.f); m3.connect(o.f);
  o.o1.start(); o.o2.start(); o.o3.start();
  const len = Math.floor(a.sampleRate * 2), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const loop = (type, freq, q) => { const s = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain(); s.buffer = buf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; gn.gain.value = 0; s.connect(f); f.connect(gn); gn.connect(bus); s.start(0, Math.random()); return { f: f, g: gn }; };
  o.wind = loop('bandpass', 900, 0.6); o.skid = loop('bandpass', 2400, 7); o.rumble = loop('lowpass', 160, 1);
  return o;
}
const GEARS = [0, 0.19, 0.37, 0.56, 0.76, 0.98, 1.4];
// the music: a track for each place (made with ACE-Step, tools/coastrun/gen_music.py), fading from one to the next at the
// checkpoints, a jingle at the goal and a sting when time runs out. Files in music/; loaded as they're needed.
const LOOPS = { title: 1, bournemouth: 1, purbeck: 1, forest: 1, jurassic: 1, harbour: 1, needles: 1 };
const MBUF = {}, MLOAD = {}, MUS = { cur: null, gain: null, sting: null, stingEnd: 0, on: false };
function loadMusic(a, name) {
  if (!name || MBUF[name] || MLOAD[name]) return; MLOAD[name] = true;
  fetch('music/' + name + '.mp3').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then((b) => a.decodeAudioData(b)).then((buf) => { MBUF[name] = buf; }).catch(() => { MLOAD[name] = false; });
}
function voice(a, name, fadeIn) {
  const src = a.createBufferSource(), g = a.createGain(), b = MBUF[name];
  src.buffer = b; g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(1, a.currentTime + fadeIn);
  src.connect(g); g.connect(MUS.gain); src.start();
  return { name: name, src: src, g: g, t0: a.currentTime, dur: b.duration };
}
function hush(a, v, d) { try { v.g.gain.cancelScheduledValues(a.currentTime); v.g.gain.setValueAtTime(Math.max(0.0001, v.g.gain.value), a.currentTime); v.g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d); v.src.stop(a.currentTime + d + 0.05); } catch (e) {} }
function placeTrack(W) { const g = W && E.segAt(W, E.segIndex(W.s)); return g ? ART.PAL[g.st].key : 'bournemouth'; }
function music(W, S, mode, SET) {
  MUS.on = SET.music !== false && SET.sound;
  const a = SET.sound ? S.ctx() : S.existing();
  if (!a) return;
  if (!MUS.gain) { MUS.gain = a.createGain(); MUS.gain.gain.value = 0.0001; MUS.gain.connect(S.bus() || a.destination); }
  const now = a.currentTime, demo = !W || W.demo;
  let want = null;
  if (MUS.on) {
    if (MUS.sting && now < MUS.stingEnd) want = MUS.sting;
    else { MUS.sting = null; want = mode === 'title' || mode === 'over' || demo ? 'title' : placeTrack(W); }
    if (mode === 'paused' && MUS.cur) want = MUS.cur.name;
  }
  MUS.gain.gain.setTargetAtTime(want ? (mode === 'paused' ? 0.12 : 0.42) : 0.0001, now, 0.35);
  if (want) loadMusic(a, want);
  if (MUS.on && W && !demo && W.fork && W.fork.next) W.fork.next.forEach((st) => loadMusic(a, ART.PAL[st] && ART.PAL[st].key));   // the next places, ready for the checkpoint
  if (MUS.on) { loadMusic(a, 'goal'); loadMusic(a, 'timeup'); }
  if (want !== (MUS.cur ? MUS.cur.name : null) && (!want || MBUF[want])) {
    const sting = want && !LOOPS[want];
    if (MUS.cur) hush(a, MUS.cur, sting ? 0.4 : 2.2);
    MUS.cur = want ? voice(a, want, sting ? 0.05 : 1.8) : null;
  }
  if (MUS.cur && LOOPS[MUS.cur.name] && now > MUS.cur.t0 + MUS.cur.dur - 2.6) {   // round again: the next copy fades in as this one ends
    const old = MUS.cur; MUS.cur = voice(a, old.name, 2.4); hush(a, old, 2.4);
  }
}
function sting(name) {   // the goal jingle / the time-up sting, in place of the little tune made on the spot (true when it will play)
  if (!MUS.on || !MBUF[name] || !MUS.gain) return false;
  MUS.sting = name; MUS.stingEnd = MUS.gain.context.currentTime + MBUF[name].duration - 0.3;
  return true;
}
function frameAudio(W, S, mode, SET) {
  music(W, S, mode, SET);
  const playing = !!(W && !W.demo && mode === 'play' && SET.sound);
  const a = playing ? S.ctx() : S.existing();
  if (!a) return;
  if (!AU) { if (!playing) return; AU = makeAudio(a, S.bus() || a.destination); }
  const now = a.currentTime, T = 0.06;
  if (!playing) { AU.g.gain.setTargetAtTime(0, now, 0.05); AU.wind.g.gain.setTargetAtTime(0, now, 0.05); AU.skid.g.gain.setTargetAtTime(0, now, 0.05); AU.rumble.g.gain.setTargetAtTime(0, now, 0.05); return; }
  const pct = W.v / E.VMAX; let gi = 0; while (gi < 5 && pct > GEARS[gi + 1]) gi++;
  let rpm = W.count > 0 ? 0.18 + (W.rev || 0) * 0.75 : Math.min(1.1, 0.28 + 0.72 * (pct - GEARS[gi]) / (GEARS[gi + 1] - GEARS[gi]));
  if (W.timeUp) rpm *= 0.6;
  if (W.air) rpm = Math.min(1.15, rpm + 0.15);
  const f = 46 + rpm * 112 + gi * 6 + (W.boosting ? 18 : 0);
  AU.o1.frequency.setTargetAtTime(f, now, 0.025); AU.o2.frequency.setTargetAtTime(f * 0.501, now, 0.025); AU.o3.frequency.setTargetAtTime(f * 2.003, now, 0.025);
  AU.f.frequency.setTargetAtTime(380 + rpm * 1500 + (W.boosting ? 900 : 0) + (R.braking ? -200 : 0), now, T);
  AU.g.gain.setTargetAtTime(W.crash ? 0.015 : 0.05 + rpm * 0.045, now, T);
  AU.wind.f.frequency.setTargetAtTime(600 + pct * 1800, now, T);
  AU.wind.g.gain.setTargetAtTime(Math.min(0.09, pct * pct * 0.055 + (W.boosting ? 0.03 : 0)), now, T);
  AU.skid.g.gain.setTargetAtTime(W.drift && !W.air ? 0.05 : 0, now, 0.03);
  AU.rumble.g.gain.setTargetAtTime(W.off && pct > 0.08 ? 0.12 * Math.min(1, pct * 2) : 0, now, 0.04);
}

// ---------------------------------------------------------------- the cabinet
const touchy = () => document.body.classList.contains('touchy');
// a tap of the brake too quick to last a whole game step (a key down and up in under 16 ms) still starts a drift
document.addEventListener('keydown', (e) => { const k = (e.key || '').toLowerCase(); if ((k === 'arrowdown' || k === 's') && !e.repeat && window.ARCADE365 && window.ARCADE365.mode === 'play') window.ARCADE365.input.brakeTap = true; });
document.addEventListener('pointerdown', (e) => { const b = e.target && e.target.closest && e.target.closest('[data-pad="down"]'); if (b && window.ARCADE365 && window.ARCADE365.mode === 'play') window.ARCADE365.input.brakeTap = true; }, true);
A.start({
  id: 'coastrun', store: 'coast365', title: '365 Coast Run', width: GW, height: GH, waveWord: 'stage', alt: true,
  pad: [{ act: 'left', label: '◀' }, { act: 'right', label: '▶' }, { act: 'down', label: 'Brake', cls: 'alt' }, { act: 'fire', label: 'Boost', cls: 'fire' }],
  speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
  settings: [
    { key: 'car', type: 'seg', label: 'Car', small: 'The Roadster is the all-rounder; the GT is the fastest but slides more; the Hot hatch is quick off the mark and grips best. Changes from your next game.', options: [['roadster', 'Roadster'], ['gt', 'GT'], ['hatch', 'Hot hatch']], def: 'roadster' },
    { key: 'pedal', type: 'seg', label: 'Accelerator', small: 'Automatic: the car goes by itself and you just steer (Brake slows you down). Hold: hold the up arrow to go. Tablets always use Automatic.', options: [['auto', 'Automatic'], ['hold', 'Hold ▲ to go']], def: 'auto' },
    { key: 'music', type: 'switch', label: 'Music', small: 'A driving tune for each place along the coast - beachy by the sea, rocking through the hills, smooth at sunset.', def: true },
    { key: 'shake', type: 'switch', label: 'Screen shake', small: 'The picture shakes when you bump or crash.', def: !reducedMotion }
  ],
  picker: { key: 'car', label: 'Choose your car', options: [['roadster', 'Roadster', 'Red · all-rounder'], ['gt', 'GT', 'Silver · fastest'], ['hatch', 'Hot hatch', 'Yellow · grippy']] },
  newWorld: (speed, set) => { set = set || {}; R.shakeOn = set.shake !== false; return E.newWorld(speed, { car: set.car, pedal: touchy() ? 'auto' : set.pedal }); },
  statKey: (W) => 'v' + W.diff,
  hires: () => true,
  step: E.step, hud: E.hud, draw: draw, sound: sound, frameAudio: frameAudio,
  quietSay: () => true,
  overText: (W) => 'Time up – stage ' + W.stageNo + (W.round > 1 ? ', round ' + W.round : ''),
  titleText: 'Race along the coast before the clock runs out. Each <b>checkpoint</b> gives you more time, and at every <b>fork</b> you choose your road &mdash; the Purbeck Hills or the New Forest, then the Jurassic Coast, Poole Harbour by night or the Needles.',
  keysText: '<b>&larr; &rarr;</b> steer &middot; <b>Space</b> boost &middot; <b>&darr;</b> brake &mdash; tap it while turning to <b>drift</b> &middot; <b>P</b> pause',
  touchText: '<b>&#9664; &#9654;</b> steer &middot; <b>Boost</b> &middot; <b>Brake</b> (tap it while turning to drift) &mdash; the car goes by itself',
  help: [
    '<b>The aim:</b> drive as far as you can before the clock runs out. Each stretch of road ends at a <b>checkpoint</b> that adds time. Reach the <b>goal</b> after three stretches for a time bonus, then go round again &mdash; busier and quicker.',
    '<b>Steer</b> with the <b>&larr; &rarr;</b> arrow keys (or A and D). The car accelerates by itself; press <b>&darr;</b> (or S) to brake. In Settings you can choose to hold <b>&uarr;</b> to go instead.',
    '<b>Bends</b> pull the car outwards &mdash; steer into them, and ease off (brake) for the sharp ones the black and white arrows warn you about. On <b>Gentle</b> the car helps you round.',
    '<b>Drifting:</b> while turning at speed, <b>tap &darr;</b> &mdash; the back of the car slides out and you go round the bend sideways, scoring points and filling your boost. Keep steering to hold the slide; straighten up to stop.',
    '<b>Forks:</b> at the end of each stretch the road splits &mdash; keep to the <b>left</b> or <b>right</b> half to choose where you go next. The map in the bottom corner shows your way. Don&rsquo;t hit the sign in the middle!',
    '<b>Boost:</b> hold <b>Space</b> (or Shift, B or X, or the mouse button) for a burst of speed while the blue bar lasts. Fill it with <b>near misses</b> (passing cars closely), <b>slipstreams</b>, drifting, coins and the blue <b>N</b> nitro bottles.',
    '<b>Jumps:</b> go over a crest fast and the car flies &mdash; points for every bit of air. <b>Coins</b> lie on the road in lines; get every coin in a line for a bonus.',
    '<b>Bumps:</b> running into the back of a car slows you right down; hitting a lamp post, palm tree or sign at speed spins you off (on Gentle you just bounce off). Bushes and beach umbrellas only slow you a little.',
    '<b>Start:</b> hold boost as the lights turn green for a flying start. <b>Gentle</b> gives more time, less traffic and help round the bends. <b>P</b> pauses; the game also pauses itself if you click away.'
  ]
});
