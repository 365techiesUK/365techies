/* 365 Coast Run - the cabinet, the dashboard and the sounds (rebuilt in 3D, 5 Oct 2026). The rules are engine.js
 * (window.CREngine); the 3D picture is world3d.js (three.js); this file puts the arcade cabinet together
 * (../common/arcade.js), draws the dashboard over the 3D picture (time, score, where you are, speed, boost, the lights,
 * banners and the little labels) and makes the sounds: one-off effects, and the engine, wind and tyres that follow the
 * car, and the music: a track for each place (music/, Settings > Music, on unless switched off). A browser without 3D graphics
 * gets a short note instead of the game. */
import { createWorld } from './world3d.js?v=15';

const E = window.CREngine, ART = window.CRArt, A = window.Arcade365;
let GW = 384; const GH = 224;
function wideGW() {   // the game's width in its own units for the space on the page (the height stays 224): never narrower than 384
  const st = document.getElementById('stage'), pad = document.getElementById('pad'); if (!st) return GW;
  const bw = st.clientWidth - 16, bh = st.clientHeight - 16 - (pad && pad.offsetParent ? pad.offsetHeight + 10 : 0);
  return bw > 50 && bh > 50 ? Math.round(Math.max(384, Math.min(GH * 2.2, GH * bw / bh))) : GW;
}
const reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let world = null, worldTried = false;
window.COAST3D = { get world() { return world; } };   // for the tests (read-only look at the 3D world)
function getWorld() { if (!worldTried) { worldTried = true; try { world = createWorld(); } catch (e) { world = null; if (window.console) console.warn('365 Coast Run: 3D failed', e); } } return world; }

const BEST_KEY = 'coast365.best';
let BEST = {}; try { BEST = JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {}; } catch (e) { BEST = {}; }
function bestOf(W, st) { const d = BEST['d' + W.diff]; return d && d[st] ? d[st] : 0; }
function saveBest(W, st, sec) { const k = 'd' + W.diff; (BEST[k] || (BEST[k] = {}))[st] = sec; try { localStorage.setItem(BEST_KEY, JSON.stringify(BEST)); } catch (e) {} }
const R = { lastT: 0, legN: 0, split: null, demoAcc: 0, W: null, goT: -1, shownScore: 0, lastV: 0, braking: false, boostK: 0, scale: 1, ft: 16.7, took: 4, adj: 0, lowN: 0, plain: false, shakeOn: true };
window.CRgfx = () => ({ GW: GW, scale: R.scale, plain: R.plain, ft: +R.ft.toFixed(1) });   // for checking: the picture's width, resolution step and frame time
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
  const cap = Math.sqrt(4.2e6 / (info.dw * info.dh)), k = Math.min(1, cap) * R.scale;
  wd.setSize(Math.max(64, Math.round(info.dw * k)), Math.max(64, Math.round(info.dh * k)));
  wd.setShake(R.shakeOn);
  const cv = wd.render(W, t, mode);
  g.imageSmoothingEnabled = true; g.drawImage(cv, 0, 0, info.dw, info.dh);
  // a slow PC: the picture a step smaller (and back up when there's room); the plainer look only as a last resort
  const took = performance.now() - t0;
  R.ft = R.ft * 0.92 + Math.max(frameDt * 1000, took) * 0.08; R.took = R.took * 0.92 + took * 0.08;
  if (t > 3000 && t - R.adj > 700) {
    if (R.ft > 20.5 && R.scale > 0.6) { R.scale = Math.max(0.6, +(R.scale - 0.08).toFixed(2)); R.adj = t; }
    else if (R.ft < 18 && R.took < 8 && R.scale < 1) { R.scale = Math.min(1, +(R.scale + 0.04).toFixed(2)); R.adj = t; }
    else if (R.ft > 24 && R.scale <= 0.6 && !R.plain) { if (++R.lowN > 5) { R.plain = true; wd.quality(true); } R.adj = t; }
    else if (R.ft <= 24) R.lowN = 0;
  }
  g.setTransform(K, 0, 0, K, 0, 0);
  { const fast = Math.max(R.boostK, Math.max(0, W.v / E.VMAX - 0.8) * 2.2); if (fast > 0.05 && !W.crash) speedLines(g, t, Math.min(1, fast)); }
  hud(g, W, t, mode);
}
function speedLines(g, t, k) {   // streaks rushing past the sides and bottom of the picture (not the sky ahead, not the dashboard)
  g.save(); g.strokeStyle = '#ffffff'; g.lineWidth = 0.6;
  const r = (t / 16) | 0, cy = GH * 0.48;
  for (let i = 0; i < 22; i++) {
    let a = ((i * 137.5 + r * 23) % 360) * Math.PI / 180;
    if (Math.sin(a) < -0.25) a = Math.PI - a;   // never upwards into the sky
    const r0 = 118 + ((i * 53 + r * 17) % 50), r1 = r0 + 18 + ((i * 29) % 26);
    g.globalAlpha = 0.22 * k * (0.5 + ((i * 7) % 5) / 10);
    g.beginPath(); g.moveTo(GW / 2 + Math.cos(a) * r0 * 1.5, cy + Math.sin(a) * r0 * 0.9); g.lineTo(GW / 2 + Math.cos(a) * r1 * 1.5, cy + Math.sin(a) * r1 * 0.9); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- the dashboard
const HFONT = '"Clash Display", ' + ART.FONT;
if (document.fonts && document.fonts.load) document.fonts.load('600 20px "Clash Display"').catch(() => {});
function hudText(g, s, x, y, size, col, align, stroke) {
  g.save(); g.translate(x, y); g.transform(1, 0, -0.16, 1, 0, 0);   // a forward slant
  g.font = '600 ' + (size * 1.04).toFixed(2) + 'px ' + HFONT; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic';
  if ('letterSpacing' in g) g.letterSpacing = (size < 9 ? size * 0.1 : size * 0.02).toFixed(2) + 'px';
  if (stroke !== false) {
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = size * 0.45 * K; g.shadowOffsetY = size * 0.05 * K;
    g.lineJoin = 'round'; g.lineWidth = Math.max(0.5, size * 0.07); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.strokeText(s, 0, 0);
    g.shadowColor = 'transparent';
  }
  g.fillStyle = col; g.fillText(s, 0, 0);
  g.restore();
}
function stretchOf(W, i) { for (let j = W.stretch.length - 1; j >= 0; j--) if (i >= W.stretch[j].from && i < W.stretch[j].to) return W.stretch[j]; return null; }
const clock = (sec) => { const m = Math.floor(sec / 60), s = sec - m * 60; return m + "'" + (s < 10 ? '0' : '') + s.toFixed(2).replace('.', '"'); };
function hud(g, W, t, mode) {
  const pi = E.segIndex(W.s), tm = Math.ceil(W.time), low = !W.timeUp && W.time <= 10 && W.count <= 0, flash = low && (t / 250 | 0) % 2;
  for (const [x, y] of [[30, 26], [GW - 34, 30]]) { const gr = g.createRadialGradient(x, y, 0, x, y, 52); gr.addColorStop(0, 'rgba(0,8,24,0.5)'); gr.addColorStop(0.6, 'rgba(0,8,24,0.22)'); gr.addColorStop(1, 'rgba(0,8,24,0)'); g.fillStyle = gr; g.fillRect(x - 60, y - 60, 120, 120); }   // a soft shade behind the corner numbers, so they read on a bright sky
  // the clock, and this stretch's own time
  hudText(g, 'TIME', 10, 13, 6.5, '#d8cdb0');
  hudText(g, String(tm), 9, 38, 26, flash ? '#ff4d4d' : low ? '#ff9a3c' : '#ffc23a');
  if (W.count <= 0 && mode !== 'title') hudText(g, 'STAGE ' + clock(Math.max(0, (W.t - W.legT0) / 60)), 10, 49, 6.2, '#e8eef5');
  if (mode !== 'title') clockExtras(g, W, t, pi);
  // the score, your hearts, which stretch of five
  R.shownScore += (W.score - R.shownScore) * 0.2; if (Math.abs(W.score - R.shownScore) < 1) R.shownScore = W.score;
  hudText(g, 'SCORE', GW - 10, 13, 6.5, '#c9d6e6', 'right');
  hudText(g, Math.round(R.shownScore).toLocaleString('en-GB'), GW - 10, 29, 14, '#ffffff', 'right');
  const S0 = E.STAGES[W.stage] || E.STAGES[0];
  hudText(g, 'STAGE ' + S0.level + '/' + E.LEVELS + (W.round > 1 ? '  ·  ROUND ' + W.round : ''), GW - 10, 40, 6.2, '#c9d6e6', 'right');
  if (mode !== 'title') { heart(g, GW - 30, 47.5, 3, '#ff7a9a'); hudText(g, String(W.runHearts || 0), GW - 10, 50.5, 7, '#ffd1df', 'right'); }
  // where you are: the place, and how far along it
  const st = stretchOf(W, pi), S = E.STAGES[(st && st.id) || 0];
  hudText(g, S.name.toUpperCase(), GW / 2, 13, 7.5, '#ffffff', 'center');
  if (st) {
    const p = Math.max(0, Math.min(1, (pi - st.from) / (st.to - st.from))), bw = 96, bx = GW / 2 - bw / 2, by = 18;
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(bx, by + 1, bw, 1.4);   // how far along this stretch: a fine line
    g.fillStyle = '#ffc23a'; g.fillRect(bx, by + 0.6, Math.max(1, bw * p), 2.2);
    g.fillStyle = S.next ? '#ffffff' : '#4ade80'; g.fillRect(bx + bw - 1, by - 1, 2, 5.2);
  }
  routeMap(g, W, 8, GH - 46, t);
  powers(g, W, t);
  speedo(g, W, t);
  if (W.drift) hudText(g, 'DRIFT', GW / 2, GH - 12, 9, '#ffb347', 'center');
  if (W.count > 0 || (R.goT >= 0 && W.t - R.goT < 50)) lights(g, W);
  if (W.count <= 0 && R.goT < 0) R.goT = W.t;
  if (mode !== 'title') request(g, W, t);
  const F = W.fork;
  if (F && !F.s && pi > F.a - 70 && pi < F.split && mode !== 'title') {
    const L = E.STAGES[F.next[0]].name, Rn = E.STAGES[F.next[1]].name, side = W.x < -1 ? -1 : W.x > 1 ? 1 : 0, her = W.reqSide ? W.reqSide.side : 0;
    g.fillStyle = 'rgba(6,10,18,0.6)'; g.fillRect(GW / 2 - 150, 52, 300, 18); g.fillStyle = '#ffc23a'; g.fillRect(GW / 2 - 150, 52, 300, 0.8);
    hudText(g, '◀ ' + L.toUpperCase(), GW / 2 - 8, 64.5, 8, side < 0 ? '#ffc23a' : '#ffffff', 'right', false);
    hudText(g, Rn.toUpperCase() + ' ▶', GW / 2 + 8, 64.5, 8, side > 0 ? '#ffc23a' : '#ffffff', 'left', false);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(GW / 2 - 0.5, 55, 1, 12);
    if (her) heart(g, her < 0 ? GW / 2 - 144 : GW / 2 + 144, 61, 4 + Math.sin(t / 120) * 0.6, '#ff4d7a');
  }
  if (mode === 'play' && W.stageNo === 1 && W.count <= 0 && W.t - R.goT < 300 && R.goT >= 0 && !document.body.classList.contains('touchy')) {
    g.globalAlpha = Math.min(1, (300 - (W.t - R.goT)) / 40);
    hudText(g, '◀ ▶  STEER     SPACE  NITRO     TAP ▼ IN A BEND  DRIFT', GW / 2, GH - 30, 6, '#ffffff', 'center');
    g.globalAlpha = 1;
  }
  banner(g, W, t);
  if (!W.crash) pops(g, W);   // (no score popping up over a crash)
  results(g, W, t);
}
function powers(g, W, t) {   // the bonuses you have on, under the score: an icon each, the time left running round it
  if (!W.pw) return;
  const on = ['magnet', 'shield', 'double'].filter((k) => W.pw[k] > 0); let x = GW - 14;
  for (const k of on) {
    const left = W.pw[k] / E.PW[k], y = 66, flash = W.pw[k] < 120 && (t / 120 | 0) % 2, col = { magnet: '#ff5a5a', shield: '#ffd23f', double: '#c77dff' }[k];
    g.fillStyle = 'rgba(0,8,24,0.55)'; g.beginPath(); g.arc(x, y, 8.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = flash ? '#ffffff' : col; g.lineWidth = 1.8; g.beginPath(); g.arc(x, y, 8.5, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); g.stroke();
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 2.2;
    if (k === 'magnet') { g.beginPath(); g.moveTo(x - 3.4, y - 2.6); g.lineTo(x - 3.4, y); g.arc(x, y, 3.4, Math.PI, 0, true); g.lineTo(x + 3.4, y - 2.6); g.stroke(); g.fillStyle = '#e8eef2'; g.fillRect(x - 4.5, y - 4.6, 2.2, 2.2); g.fillRect(x + 2.3, y - 4.6, 2.2, 2.2); }   // a horseshoe magnet, its silver ends up
    else if (k === 'shield') { g.beginPath(); for (let q = 0; q < 10; q++) { const a = q / 10 * Math.PI * 2 - Math.PI / 2, rr = q % 2 ? 2.2 : 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
    else hudText(g, 'x2', x, y + 3, 7.5, col, 'center', false);
    x -= 21;
  }
}
function clockExtras(g, W, t, pi) {   // the race against the clock: your best for this stage, a warning when you're behind, the last seconds big
  if (W.legs.length < R.legN) R.legN = 0;   // a new round
  if (W.legs.length > R.legN) {   // a checkpoint (or the goal): this stage's time against your best
    const L = W.legs[W.legs.length - 1], prev = bestOf(W, L.st), rec = !prev || L.t < prev;
    if (rec && !W.demo) saveBest(W, L.st, L.t);
    R.split = { t: L.t, prev: prev, rec: rec, at: W.t }; R.legN = W.legs.length;
  }
  const st = stretchOf(W, pi);
  if (st && W.count <= 0) {
    const b = bestOf(W, st.id); if (b) hudText(g, 'BEST ' + clock(b), 10, 58, 6.2, '#ffd98a');
    const el = (W.t - W.legT0) / 60, done = (pi - st.from) * 4, left = (st.to - pi) * 4, pace = el > 12 ? done / el : 0;   // (judged after 12 s: off the line the average pace is slow)
    if (!W.timeUp && pace > 0 && left / Math.max(12, pace) > W.time + 1 && (t / 200 | 0) % 3) hudText(g, 'HURRY!', 10, b ? 69 : 60, 10, '#ff4d4d');
  }
  if (!W.timeUp && W.count <= 0 && W.time > 0 && W.time <= 5) {   // the last five seconds, big in the middle
    const n = Math.ceil(W.time), f = W.time - Math.floor(W.time), s = 1 + (f > 0.75 ? (f - 0.75) * 1.6 : 0);
    g.save(); g.translate(GW / 2, GH * 0.3); g.scale(s, s); g.globalAlpha = 0.35 + 0.65 * Math.min(1, f * 2.2);
    hudText(g, String(n), 0, 14, 40, n <= 2 ? '#ff4d4d' : '#ffd400', 'center'); g.restore(); g.globalAlpha = 1;
  }
  const S = R.split;
  if (S && W.t - S.at < 240 && W.t >= S.at) {   // under the checkpoint banner: STAGE TIME, against your best
    const a = Math.min(1, (240 - (W.t - S.at)) / 30), y = 86;
    g.globalAlpha = a;
    g.fillStyle = 'rgba(0,8,24,0.55)'; roundRect(g, GW / 2 - 70, y - 9, 140, S.prev ? 27 : 19, 8); g.fill();
    hudText(g, 'STAGE TIME ' + clock(S.t), GW / 2, y + 3, 8.5, '#ffffff', 'center');
    if (S.prev) {
      const d = S.t - S.prev, txt = (d < 0 ? '-' : '+') + Math.abs(d).toFixed(2) + 's';
      hudText(g, S.rec ? 'NEW RECORD!  ' + txt : 'BEST ' + clock(S.prev) + '   ' + txt, GW / 2, y + 14, 7.5, S.rec ? ((t / 180 | 0) % 2 ? '#ffd400' : '#fff3a0') : '#ff8a8a', 'center');
    }
    g.globalAlpha = 1;
  }
}
function heart(g, x, y, r, col) {   // a little heart, centred on x, y
  g.fillStyle = col; g.beginPath(); g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.9, y - r * 1.5, x, y - r * 0.55);
  g.bezierCurveTo(x + r * 0.9, y - r * 1.5, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.fill();
}
function request(g, W, t) {   // what she's asking for: her face, the words, how much is done and how long is left; then how you did
  const Q = W.req, done = W.reqDone && W.t - W.reqDone.t < 110 ? W.reqDone : null, side = W.reqSide;
  if (!Q && !done && !side) return;
  const w = 196, x = GW / 2 - w / 2, y = 26, h = 18;
  g.fillStyle = 'rgba(6,10,18,0.58)'; g.fillRect(x, y, w, h);
  g.fillStyle = '#ff7a9a'; g.fillRect(x, y, 1.6, h);   // her colour, down one edge
  heart(g, x + 9, y + 9.5, 3, done && done.n < 2 ? 'rgba(255,255,255,0.4)' : '#ff7a9a');
  if (done && !Q) {
    hudText(g, done.word, x + 17, y + 12.5, 8, done.n >= 2 ? '#ffd1df' : '#ffffff', 'left', false);
    for (let i = 0; i < 3; i++) heart(g, x + w - 30 + i * 9, y + 9.5, 3, i < done.n ? '#ff7a9a' : 'rgba(255,255,255,0.22)');
    return;
  }
  if (Q) {
    hudText(g, Q.txt, x + 17, y + 10, 7, '#ffffff', 'left', false);
    const p = Math.min(1, Q.k === 'clean' ? Q.have : Q.have / Q.goal), left = Math.max(0, 1 - (W.t - Q.t0) / Q.dur), bx = x + 17, bw = w - 52;
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(bx, y + 13, bw, 1.6);
    g.fillStyle = '#ff7a9a'; g.fillRect(bx, y + 12.6, Math.max(1, bw * p), 2.4);
    if (Q.goal > 1 && !Q.secs) hudText(g, Math.floor(Q.have) + '/' + Q.goal, x + w - 8, y + 11.5, 7, '#ffd1df', 'right', false);
    g.fillStyle = left < 0.25 && (t / 200 | 0) % 2 ? '#ff4d4d' : 'rgba(255,209,223,0.7)'; g.fillRect(x, y + h - 1, w * left, 1);   // her patience, running out along the bottom
  } else if (side) {
    hudText(g, (side.side < 0 ? '◀ Go left! ' : 'Go right! ▶ ') + side.name, x + 17, y + 12.5, 7.5, '#ffffff', 'left', false);
  }
}
function routeMap(g, W, x0, y0, t) {   // the pyramid of places: the way you've come in yellow, the place you're in flashing
  const dx = 13, dy = 8.5, route = W.route || [0], here = route[route.length - 1];
  const at = (id) => { const S = E.STAGES[id]; return [x0 + 4 + (S.level - 1) * dx, y0 + 20 + (S.pos - (S.level - 1) / 2) * dy]; };
  g.fillStyle = 'rgba(0,10,30,0.38)'; roundRect(g, x0 - 3, y0 - 0.5, 4 * dx + 14, 41, 6); g.fill();   // a dark plate, so the map reads on grass and sand
  g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.28)';
  E.STAGES.forEach((S) => { if (S.next) S.next.forEach((n) => { const a = at(S.id), b = at(n); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }); });
  g.strokeStyle = '#ffd400'; g.lineWidth = 1.6;
  for (let i = 1; i < route.length; i++) { const a = at(route[i - 1]), b = at(route[i]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  E.STAGES.forEach((S) => {
    const p = at(S.id), on = route.indexOf(S.id) >= 0, cur = S.id === here;
    g.fillStyle = cur ? ((t / 300 | 0) % 2 ? '#ffffff' : '#ffd400') : on ? '#ffd400' : S.next ? 'rgba(255,255,255,0.45)' : 'rgba(120,255,160,0.6)';
    g.beginPath(); g.arc(p[0], p[1], cur ? 2.6 : 1.8, 0, Math.PI * 2); g.fill();
  });
}
function speedo(g, W, t) {   // the speed in big slanted digits, a rev bar that climbs and drops with each gear, the gear, the nitro beneath
  const xr = GW - 10, yb = GH - 9, pct = W.v / E.VMAX;
  let gi = 0; while (gi < 7 && pct > RG[gi + 1]) gi++;
  const rpm = W.count > 0 ? 6200 + (W.rev || 0) * 11500 : gearRpm(pct, gi), rf = Math.max(0, Math.min(1, (rpm - 4000) / 14200));
  const n = 16, sw = 3.2, gap = 1.1, x0 = xr - n * (sw + gap) + gap, y0 = yb - 27, lit = Math.round(rf * n);
  for (let i = 0; i < n; i++) {   // the rev bar: slanted segments, rising, white then amber then red
    const x = x0 + i * (sw + gap), hh = 3.5 + 4 * i / (n - 1);
    g.fillStyle = i < lit ? (i >= n - 3 ? '#ff3b3b' : i >= n - 7 ? '#ffc23a' : '#eef4fa') : 'rgba(255,255,255,0.13)';
    g.beginPath(); g.moveTo(x + 1.3, y0 - hh); g.lineTo(x + sw + 1.3, y0 - hh); g.lineTo(x + sw, y0); g.lineTo(x, y0); g.fill();
  }
  hudText(g, W.count > 0 ? 'N' : String(gi + 1), x0 - 5, y0, 9, '#ffc23a', 'right');
  hudText(g, 'GEAR', x0 - 5, y0 - 9.5, 4.6, '#c9d6e6', 'right', false);
  hudText(g, String(E.mph(W)), xr - 17, yb - 4, 21, W.boosting ? '#8fe3ff' : '#ffffff', 'right');
  hudText(g, 'MPH', xr, yb - 4, 6, '#c9d6e6', 'right');
  const bw2 = n * (sw + gap) - gap, by2 = yb - 0.5;
  g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(x0, by2, bw2, 2);
  g.fillStyle = W.boosting ? '#d8f6ff' : '#4fc3ff'; g.fillRect(x0, by2, bw2 * W.boost, 2);
  hudText(g, 'NITRO', x0 - 5, by2 + 2.4, 5.2, W.boosting ? '#ffffff' : W.boost > 0.25 && ((t / 400 | 0) % 2) ? '#8fe3ff' : '#9fb3c8', 'right');
}
function results(g, W, t) {   // at the goal: each stretch's time and hearts, the bonuses and the rank
  const Rz = W.result; if (!Rz) return;
  const age = W.t - Rz.t; if (age < 40 || age > 600) return;
  const a = Math.min(1, (age - 40) / 20, (600 - age) / 25), x = GW / 2 - 110, y = 46, w = 220, h = 30 + Rz.legs.length * 11 + 30;
  g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(6,10,18,0.8)'; g.fillRect(x, y, w, h);
  g.fillStyle = '#ffc23a'; g.fillRect(x + 10, y, w - 20, 1);
  hudText(g, 'GOAL  ·  ' + Rz.goal.toUpperCase(), x + w / 2, y + 14, 8.5, '#ffc23a', 'center', false);
  Rz.legs.forEach((L, i) => {
    const yy = y + 28 + i * 11, show = age > 60 + i * 12; if (!show) return;
    hudText(g, (i + 1) + '  ' + E.STAGES[L.st].name, x + 12, yy, 7, '#ffffff', 'left', false);
    hudText(g, clock(L.t), x + w - 56, yy, 7, '#bfe6ff', 'right', false);
    for (let k = 0; k < Math.min(6, L.hearts); k++) heart(g, x + w - 48 + k * 7, yy - 2.5, 2.6, '#ff4d7a');
  });
  const yb = y + 28 + Rz.legs.length * 11 + 4;
  if (age > 60 + Rz.legs.length * 12) {
    hudText(g, 'TIME BONUS  ' + Rz.timeBonus.toLocaleString('en-GB'), x + 12, yb, 7, '#ffe9a8', 'left', false);
    hudText(g, 'LOVE BONUS  ' + Rz.love.toLocaleString('en-GB') + '  (' + Rz.hearts + ' ♥)', x + 12, yb + 11, 7, '#ffd1df', 'left', false);
  }
  if (age > 90 + Rz.legs.length * 12) { const s = 1 + Math.max(0, 1 - (age - 90 - Rz.legs.length * 12) / 12) * 0.8; g.save(); g.translate(x + w - 26, yb + 6); g.scale(s, s); hudText(g, Rz.rank, 0, 8, 26, Rz.rank === 'S' ? '#ff4dd2' : Rz.rank === 'A' ? '#ffd400' : '#ffffff', 'center'); g.restore(); hudText(g, 'RANK', x + w - 26, yb - 12, 6, '#bfe6ff', 'center', false); }
  g.restore();
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
function banner(g, W, t) {
  const b = W.banner; if (!b) return;
  const age = W.t - b.t, dur = b.kind === 'go' ? 50 : b.kind === 'red' ? 400 : b.kind === 'stage' ? 200 : 160; if (age > dur || age < 0) return;
  if (b.kind === 'stage') {   // a new place: a sweeping card with its name
    const inK = Math.min(1, age / 14), outK = Math.min(1, (dur - age) / 18), S = E.STAGES.find((q) => q.name === b.txt);
    g.save(); g.globalAlpha = outK;
    const bw = 230 * inK; g.fillStyle = 'rgba(6,16,40,0.7)'; g.fillRect(GW / 2 - bw / 2, 70, bw, 30);
    g.fillStyle = '#ffc23a'; g.fillRect(GW / 2 - bw / 2, 70, bw, 1); g.fillRect(GW / 2 - bw / 2, 99, bw, 1);
    if (inK > 0.6) { hudText(g, S ? 'STAGE ' + S.level + (S.next ? '' : '  ·  THE LAST STRETCH') : '', GW / 2, 79, 6, '#c9d6e6', 'center', false); hudText(g, b.txt.toUpperCase(), GW / 2, 95, 14, '#ffffff', 'center'); }
    g.restore(); return;
  }
  const cols = BANNER_COL[b.kind] || BANNER_COL.stage, inK = Math.min(1, age / 10), outK = Math.min(1, (dur - age) / 16), s = 0.7 + 0.3 * inK + (b.kind === 'goal' ? Math.sin(age / 6) * 0.03 : 0);
  g.save(); g.globalAlpha = outK; g.translate(GW / 2, 86); g.scale(s, s);
  hudText(g, b.txt, 0, 0, b.kind === 'go' ? 34 : 24, cols[0], 'center');
  if (b.sub) hudText(g, b.sub, 0, 16, 10, cols[1], 'center');
  g.restore();
}
const POP_COL = { near: '#7fe8ff', drift: '#ffb347', gold: '#ffd400', nitro: '#7fb8ff', slip: '#c9b8ff', heart: '#ff8fb3', time: '#5dff9a', magnet: '#ff7b7b', shield: '#ffd23f', double: '#d39bff' };
function pops(g, W) {
  for (let i = 0; i < W.pops.length; i++) {
    const p = W.pops[i], age = W.t - p.t; if (age > 70 || age < 0) continue;
    const a = Math.min(1, (70 - age) / 18), y = 94 - age * 0.32, x = GW / 2 + Math.max(-1, Math.min(1, p.x / 5)) * 70;
    g.globalAlpha = a;
    hudText(g, p.txt, x, y, 10, POP_COL[p.kind] || '#ffffff', 'center');
    if (p.sub) hudText(g, p.sub, x, y + 10, 8, '#ffffff', 'center');
    g.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- sounds: one-off effects, and the engine, wind and tyres that follow the car
function pan(e) { return e && e.x != null ? Math.max(-0.8, Math.min(0.8, e.x * 0.12)) : 0; }
// ---- your passenger's voice: one of each line's takes, a touch louder than the music, which dips while she speaks
const VOICE = { go: 2, drift: 2, near: 2, pass: 2, coins: 2, clean: 2, speed: 2, air: 2, slip: 2, left: 2, right: 2, great: 3, good: 2, fail: 2, yay: 2, aww: 2, crash: 2, bump: 2, close: 2, wow: 2, wheee: 2, check: 2, goal: 2, hurry: 1, timeup: 1 };
const VBUF = {}; let vLoaded = false, vOn = true;
function loadVoices(a) {
  if (vLoaded) return; vLoaded = true;
  for (const id in VOICE) for (let n = 0; n < VOICE[id]; n++) fetch('voice/' + id + '-' + n + '.mp3').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then((b) => a.decodeAudioData(b)).then((buf) => { (VBUF[id] || (VBUF[id] = []))[n] = buf; }).catch(() => {});
}
function say(id, S) {
  const a = S.ctx(); if (!a || !vOn) return;
  loadVoices(a);
  const list = (VBUF[id] || []).filter(Boolean); if (!list.length) return;
  const b = list[(Math.random() * list.length) | 0];
  try {
    const src = a.createBufferSource(), g = a.createGain(); src.buffer = b; g.gain.value = 1.05; src.connect(g); g.connect(S.bus() || a.destination); src.start();
    if (MUS.gain) MUS.duck = a.currentTime + b.duration + 0.2;
  } catch (er) {}
}
function sound(name, S, e) {
  const p = pan(e), n = (e && e.n) || 1;
  if (name.charCodeAt(0) === 118 && name[1] === ':') { say(name.slice(2), S); return; }   // 'v:...' - something she says
  switch (name) {
    case 'ask': S.tone(1318, 0.14, 0.035, { type: 'sine', verb: 0.3 }); S.tone(1760, 0.22, 0.03, { type: 'sine', when: 0.09, verb: 0.3 }); break;
    case 'heart': for (let i = 0; i < n; i++) { S.tone(1568 * Math.pow(1.122, i), 0.14, 0.04, { type: 'triangle', when: i * 0.09, verb: 0.4 }); S.tone(3136 * Math.pow(1.122, i), 0.1, 0.015, { type: 'sine', when: i * 0.09 + 0.02, verb: 0.4 }); } break;
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
    case 'power': [660, 880, 1175, 1568].forEach((f, k) => S.tone(f * ({ magnet: 1, shield: 1.12, double: 1.26, time: 0.9 }[e && e.k] || 1), 0.14, 0.05, { type: 'triangle', when: k * 0.05, verb: 0.45 })); S.noise(0.3, 0.06, 2000, { type: 'bandpass', q: 2, to: 8000 }); break;
    case 'powerEnd': [880, 660, 440].forEach((f, k) => S.tone(f, 0.1, 0.035, { type: 'triangle', when: k * 0.07 })); break;
    case 'smash': S.noise(0.5, 0.3, 2200, { verb: 0.4 }); S.tone(70, 0.4, 0.2, { type: 'sine', to: 30 }); [1319, 1760].forEach((f, k) => S.tone(f, 0.18, 0.04, { type: 'square', when: 0.06 + k * 0.06, verb: 0.4 })); break;
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
// the engine: a high-revving flat-plane V8 - exhaust pulses at the firing rate (four a revolution) with a rich, rasping
// harmonic stack, a growl an octave down, pulsed exhaust noise, soft clipping and the pipes' resonances; the throttle opens
// it up, lifting off it goes flat and pops. Built so the same graph can be rendered offline (engineSample, for a listen).
function engineGraph(a, bus) {
  const o = {};
  const harm = 28, re = new Float32Array(harm + 1), im = new Float32Array(harm + 1);
  for (let n = 1; n <= harm; n++) im[n] = (n % 2 ? 1 : 0.62) / Math.pow(n, 0.78) * (n === 3 || n === 5 ? 1.25 : 1);   // a buzzing pulse: odd harmonics a touch louder (the rasp)
  const wave = a.createPeriodicWave(re, im, { disableNormalization: false });
  o.main = a.createOscillator(); o.main.setPeriodicWave(wave);
  o.sub = a.createOscillator(); o.sub.type = 'sawtooth';          // an octave down: the growl
  o.whine = a.createOscillator(); o.whine.type = 'sine';          // two octaves up: the cams and the intake howl
  const gMain = a.createGain(), gSub = a.createGain(), gWhine = a.createGain(); gMain.gain.value = 0.5; gSub.gain.value = 0.2; o.gWhine = gWhine; gWhine.gain.value = 0.05;
  o.main.connect(gMain); o.sub.connect(gSub); o.whine.connect(gWhine);
  // exhaust noise, pulsed at the firing rate
  const len = Math.floor(a.sampleRate * 2), nb = a.createBuffer(1, len, a.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
  o.noise = a.createBufferSource(); o.noise.buffer = nb; o.noise.loop = true;
  const nf = a.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1400; nf.Q.value = 0.7; o.nf = nf;
  o.gNoise = a.createGain(); o.gNoise.gain.value = 0.04;
  o.am = a.createOscillator(); o.am.type = 'sine'; o.gAm = a.createGain(); o.gAm.gain.value = 0.05; o.am.connect(o.gAm); o.gAm.connect(o.gNoise.gain);
  o.noise.connect(nf); nf.connect(o.gNoise);
  // all of it through a drive, a soft clip, the pipes' resonances and a throttle-opened low-pass
  o.drive = a.createGain(); o.drive.gain.value = 1.4;
  gMain.connect(o.drive); gSub.connect(o.drive); gWhine.connect(o.drive); o.gNoise.connect(o.drive);
  const ws = a.createWaveShaper(), cv = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; cv[i] = Math.tanh(x * 2.6) / Math.tanh(2.6); } ws.curve = cv; ws.oversample = '4x';
  const pipe = a.createBiquadFilter(); pipe.type = 'peaking'; pipe.frequency.value = 190; pipe.Q.value = 1.1; pipe.gain.value = 7;
  o.howl = a.createBiquadFilter(); o.howl.type = 'peaking'; o.howl.frequency.value = 1300; o.howl.Q.value = 1.6; o.howl.gain.value = 3;
  o.lp = a.createBiquadFilter(); o.lp.type = 'lowpass'; o.lp.frequency.value = 1200; o.lp.Q.value = 0.9;
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 45;
  o.g = a.createGain(); o.g.gain.value = 0;
  o.drive.connect(ws); ws.connect(pipe); pipe.connect(o.howl); o.howl.connect(o.lp); o.lp.connect(hp); hp.connect(o.g); o.g.connect(bus);
  [o.main, o.sub, o.whine, o.noise, o.am].forEach((n) => n.start());
  return o;
}
// rpm 0..1 (idle to the limiter), throttle 0..1, nitro 0..1, at time t
function engineSet(o, t, rpm, thr, nitro, crash) {
  const RPM = 1100 + rpm * 7900, F = RPM / 60 * 4, T = 0.022;   // flat-plane V8: four firings a revolution
  o.main.frequency.setTargetAtTime(F, t, T); o.sub.frequency.setTargetAtTime(F / 2, t, T); o.whine.frequency.setTargetAtTime(F * 4.01, t, T); o.am.frequency.setTargetAtTime(F, t, T);
  o.nf.frequency.setTargetAtTime(900 + rpm * 2600, t, 0.05);
  o.gNoise.gain.setTargetAtTime(0.02 + thr * 0.04 + nitro * 0.03, t, 0.05); o.gAm.gain.setTargetAtTime(0.03 + thr * 0.05, t, 0.05);
  o.gWhine.gain.setTargetAtTime(0.03 + rpm * rpm * 0.08 + nitro * 0.06, t, 0.05);
  o.drive.gain.setTargetAtTime(0.9 + thr * 1.1 + rpm * 0.6 + nitro * 0.5, t, 0.04);
  o.lp.frequency.setTargetAtTime(500 + thr * (900 + rpm * 4200) + nitro * 1500, t, 0.04);
  o.howl.frequency.setTargetAtTime(900 + rpm * 1400, t, 0.05); o.howl.gain.setTargetAtTime(2 + rpm * 5 + nitro * 3, t, 0.05);
  o.g.gain.setTargetAtTime(crash ? 0.012 : (0.06 + rpm * 0.05) * (0.55 + thr * 0.45), t, 0.04);
}
// the race engine is made sample by sample in engine-worklet.js (a ten-cylinder screamer); where a browser can't run that,
// the oscillator engine above stands in
const WORKLET = 'engine-worklet.js?v=3';
let WL = null, WLok = false, WLdone = false;
function loadWorklet(a) { if (WL || !a) return; WL = a.audioWorklet ? a.audioWorklet.addModule(WORKLET).then(() => { WLok = true; WLdone = true; }, () => { WLdone = true; }) : Promise.resolve().then(() => { WLdone = true; }); }
function raceEngine(a, bus) {   // the worklet, then a touch of body and air round it
  const node = new AudioWorkletNode(a, 'race-engine', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
  const body = a.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 260; body.Q.value = 0.9; body.gain.value = 3;
  const top = a.createBiquadFilter(); top.type = 'lowpass'; top.frequency.value = 7000; top.Q.value = 0.5;
  node.connect(body); body.connect(top); top.connect(bus);
  const P = (n) => node.parameters.get(n);
  return { node: node, rpm: P('rpm'), throttle: P('throttle'), gain: P('gain'), nitro: P('nitro') };
}
function makeAudio(a, bus) {
  let o;
  if (WLok) { o = raceEngine(a, bus); o.race = true; } else o = engineGraph(a, bus);
  const len = Math.floor(a.sampleRate * 2), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const loop = (type, freq, q) => { const s = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain(); s.buffer = buf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; gn.gain.value = 0; s.connect(f); f.connect(gn); gn.connect(bus); s.start(); return { f: f, g: gn }; };
  o.wind = loop('bandpass', 900, 0.6); o.skid = loop('bandpass', 2400, 7); o.rumble = loop('lowpass', 160, 1);
  return o;
}
// rpm in real revs a minute, throttle 0-1: an F1-style screamer, quiet enough to sit under the music and her voice
function raceSet(o, t, rpm, thr, nitro, crash) {
  o.rpm.setTargetAtTime(rpm, t, 0.012); o.throttle.setTargetAtTime(thr, t, 0.015); o.nitro.setTargetAtTime(nitro, t, 0.05);
  o.gain.setTargetAtTime(crash ? 0.02 : 0.145 + Math.min(1, (rpm - 6000) / 12000) * 0.085, t, 0.06);
}
// a racing car's run through the gears, rendered offline with the same engine: window.CRengineSample(seconds) -> WAV bytes
window.CRengineSample = function (sec) {
  const SR = 44100, a = new OfflineAudioContext(1, Math.floor(SR * sec), SR), bus = a.createGain(); bus.gain.value = 2.6; bus.connect(a.destination);
  return a.audioWorklet.addModule(WORKLET).then(() => {
    const o = raceEngine(a, bus); let gear = 0, sp = 0;
    for (let t = 0; t < sec; t += 1 / 60) {
      let rpm, thr = 1;
      if (t < 1.6) { rpm = 6200 + (t > 0.4 && t < 0.75 ? 9000 * Math.sin((t - 0.4) / 0.35 * Math.PI) : 0) + (t > 0.95 && t < 1.25 ? 7000 * Math.sin((t - 0.95) / 0.3 * Math.PI) : 0); thr = (t > 0.4 && t < 0.75) || (t > 0.95 && t < 1.25) ? 1 : 0.15; }   // revving on the line
      else if (t < sec - 1.6) { sp = Math.min(1.05, sp + (0.36 - sp * 0.28) / 60); while (gear < 7 && sp > RG[gear + 1]) gear++; rpm = gearRpm(sp, gear); const sh = o.lastGear !== undefined && gear > o.lastGear; if (sh) o.cut = t + 0.05; o.lastGear = gear; if (o.cut && t < o.cut) thr = 0.05; }
      else { sp = Math.max(0.3, sp - 0.4 / 60); while (gear > 0 && sp < RG[gear]) gear--; rpm = gearRpm(sp, gear); thr = 0.1; }   // braking, changing down
      raceSet(o, t, rpm, thr, 0, false);
    }
    return a.startRendering();
  }).then((b) => { const d = b.getChannelData(0), n = d.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (p, s2) => { for (let i = 0; i < s2.length; i++) v.setUint8(p + i, s2.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
    return Array.from(new Uint8Array(buf)); });
};
// seven close racing gears: first from the line, then each change drops the revs by about a sixth (17,800 -> ~14,800)
const RG = [0, 0.3, 0.37, 0.45, 0.55, 0.67, 0.81, 0.99, 1.6];
function gearRpm(pct, g) {
  if (g === 0) return 6500 + 11300 * Math.min(1, pct / RG[1]);
  return Math.min(18200, 17800 * pct / RG[g + 1]);
}
const GEARS = [0, 0.17, 0.33, 0.5, 0.68, 0.86, 1.05, 1.5];
// the music: a track for each place (made with ACE-Step, tools/coastrun/gen_music.py), fading from one to the next at the
// checkpoints, a jingle at the goal and a sting when time runs out. Files in music/; loaded as they're needed.
const LOOPS = { title: 1, bournemouth: 1, sandbanks: 1, christchurch: 1, purbeck: 1, swanage: 1, forest: 1, jurassic: 1, weymouth: 1, harbour: 1, lymington: 1, lyme: 1, portland: 1, goldencap: 1, hengistbury: 1, needles: 1 };
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
    else { MUS.sting = null; want = mode === 'title' || mode === 'over' || demo ? 'title' : SET.radio && SET.radio !== 'place' ? SET.radio : placeTrack(W); }
    if (mode === 'paused' && MUS.cur) want = MUS.cur.name;
  }
  vOn = SET.voice !== false;
  MUS.gain.gain.setTargetAtTime(want ? (mode === 'paused' ? 0.12 : MUS.duck > now ? 0.26 : 0.42) : 0.0001, now, MUS.duck > now ? 0.08 : 0.35);
  if (want) loadMusic(a, want);
  if (MUS.on && W && !demo && W.fork && W.fork.next) W.fork.next.forEach((st) => loadMusic(a, ART.PAL[st] && ART.PAL[st].key));   // the next places, ready for the checkpoint
  if (MUS.on) { loadMusic(a, 'goal'); loadMusic(a, 'timeup'); }
  if (SET.sound && SET.voice !== false) loadVoices(a);
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
window.CRengineOn = () => (AU ? (AU.race ? 'race engine' : 'oscillator engine') : WL ? (WLdone ? 'loaded, not started' : 'loading') : 'not loaded');   // which engine is running (for checking)
function frameAudio(W, S, mode, SET) {
  music(W, S, mode, SET);
  { const a0 = S.existing && S.existing(); if (a0) loadWorklet(a0); }
  const playing = !!(W && !W.demo && mode === 'play' && SET.sound);
  const a = playing ? S.ctx() : S.existing();
  if (!a) return;
  if (!AU) { if (!playing) return; loadWorklet(a); if (!WLdone) return; AU = makeAudio(a, S.bus() || a.destination); }   // (a moment while the engine loads)
  const now = a.currentTime, T = 0.06;
  if (!playing) { if (AU.race) AU.gain.setTargetAtTime(0, now, 0.05); else { AU.g.gain.setTargetAtTime(0, now, 0.05); AU.gNoise.gain.setTargetAtTime(0, now, 0.05); } AU.wind.g.gain.setTargetAtTime(0, now, 0.05); AU.skid.g.gain.setTargetAtTime(0, now, 0.05); AU.rumble.g.gain.setTargetAtTime(0, now, 0.05); return; }
  const pct = W.v / E.VMAX; let gi = 0; while (gi < 6 && pct > GEARS[gi + 1]) gi++;
  let rpm = W.count > 0 ? 0.06 + (W.rev || 0) * 0.85 : Math.min(1.02, 0.5 + 0.5 * (pct - GEARS[gi]) / (GEARS[gi + 1] - GEARS[gi]));
  if (W.count <= 0 && gi === 0) rpm = Math.max(0.12, Math.min(1, 0.12 + pct / GEARS[1] * 0.85));
  if (W.timeUp) rpm *= 0.6;
  if (W.air) rpm = Math.min(1.05, rpm + 0.12);   // the wheels off the ground: it flares
  const lift = (R.braking || W.drift) && pct > 0.4 && !W.crash;
  const shifting = AU.shiftT && now < AU.shiftT;   // a moment off the throttle as the gear goes in
  const thr = W.crash || W.timeUp ? 0.2 : shifting ? 0.05 : lift ? 0.25 : 1;
  if (AU.race) {   // the racing gearbox: seven close gears, revs in real numbers
    let rg = 0; while (rg < 7 && pct > RG[rg + 1]) rg++;
    let r2 = W.count > 0 ? 6200 + (W.rev || 0) * 11500 : gearRpm(pct, rg);
    if (W.timeUp) r2 = Math.max(5500, r2 * 0.6);
    if (W.air) r2 = Math.min(18600, r2 + 1500);
    const down = AU.rg != null && rg < AU.rg && !W.crash; if (down) AU.blipT = now + 0.11;   // changing down: a blip of throttle
    const up = AU.rg != null && rg > AU.rg && !W.crash && W.count <= 0; if (up) AU.cutT = now + 0.045;   // changing up: the briefest cut
    AU.rg = rg;
    const t2 = W.count > 0 ? ((W.rev || 0) > 0.05 ? 1 : 0.12) : W.crash || W.timeUp ? 0.12 : AU.cutT && now < AU.cutT ? 0.04 : AU.blipT && now < AU.blipT ? 1 : lift ? 0.1 : 1;
    raceSet(AU, now, r2, t2, W.boosting ? 1 : 0, !!W.crash);
  } else engineSet(AU, now, rpm, thr, W.boosting ? 1 : 0, !!W.crash);
  // a gear change: the revs drop with a crisp cut and a crackle from the pipes; lifting off at speed pops and bangs
  if (!AU.race && AU.gi != null && gi > AU.gi && !W.crash && W.count <= 0) { AU.shiftT = now + 0.09; S.noise(0.05, 0.06, 1500, { type: 'bandpass', q: 1.5, when: 0.04 }); S.noise(0.04, 0.045, 2600, { type: 'bandpass', q: 2, when: 0.1 }); }
  AU.gi = gi;
  if (!AU.race && lift && Math.random() < 0.11) S.noise(0.035 + Math.random() * 0.04, 0.04 + Math.random() * 0.035, 800 + Math.random() * 1500, { type: 'bandpass', q: 1.2, pan: (Math.random() - 0.5) * 0.4 });
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
  id: 'coastrun', store: 'coast365', title: '365 Coast Run', get width() { return (GW = wideGW()); }, height: GH, waveWord: 'stage', alt: true,
  pad: [{ act: 'left', label: '◀' }, { act: 'right', label: '▶' }, { act: 'down', label: 'Brake', cls: 'alt' }, { act: 'fire', label: 'Nitro', cls: 'fire' }],
  speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
  settings: [
    { key: 'car', type: 'seg', label: 'Car', small: 'The Roadster is the all-rounder; the GT is the fastest but slides more; the Hot hatch is quick off the mark and grips best. Changes from your next game.', options: [['roadster', 'Roadster'], ['gt', 'GT'], ['hatch', 'Hot hatch']], def: 'roadster' },
    { key: 'pedal', type: 'seg', label: 'Accelerator', small: 'Automatic: the car goes by itself and you just steer (Brake slows you down). Hold: hold the up arrow to go. Tablets always use Automatic.', options: [['auto', 'Automatic'], ['hold', 'Hold ▲ to go']], def: 'auto' },
    { key: 'music', type: 'switch', label: 'Music', small: 'A driving tune for each place along the coast - beachy by the sea, rocking through the hills, smooth at sunset.', def: true },
    { key: 'radio', type: 'seg', label: 'Radio', small: 'Each place has its own tune, or pick one favourite to play all the way.', options: [['place', 'Each place'], ['title', 'Sunny Shore'], ['bournemouth', 'Beach Groove'], ['purbeck', 'Hill Rock'], ['jurassic', 'Sunset Cruise'], ['harbour', 'Night Drive']], def: 'place' },
    { key: 'voice', type: 'switch', label: 'Her voice', small: 'Your passenger says what she would like you to do, and how you did.', def: true },
    { key: 'shake', type: 'switch', label: 'Screen shake', small: 'The picture shakes when you bump or crash.', def: !reducedMotion }
  ],
  picker: { key: 'car', label: 'Choose your car', options: [['roadster', 'Roadster', 'Red · all-rounder'], ['gt', 'GT', 'Silver · fastest'], ['hatch', 'Hot hatch', 'Yellow · grippy']] },
  newWorld: (speed, set) => { set = set || {}; R.shakeOn = set.shake !== false; return E.newWorld(speed, { car: set.car, pedal: touchy() ? 'auto' : set.pedal }); },
  statKey: (W) => 'v' + W.diff,
  hires: () => true,
  step: E.step, hud: E.hud, draw: draw, sound: sound, frameAudio: frameAudio,
  quietSay: () => true,
  overText: (W) => 'Time up – stage ' + W.stageNo + (W.round > 1 ? ', round ' + W.round : ''),
  titleText: 'Race along the Dorset coast with your girlfriend beside you, before the clock runs out. Five stretches make a run: at every <b>fork</b> you choose your road through fifteen places, to one of five goals &mdash; and she asks for things on the way. Do them for <b>hearts</b>.',
  keysText: '<b>&larr; &rarr;</b> steer &middot; <b>Space</b> boost &middot; <b>&darr;</b> brake &mdash; tap it while turning to <b>drift</b> &middot; <b>P</b> pause',
  touchText: '<b>&#9664; &#9654;</b> steer &middot; <b>Boost</b> &middot; <b>Brake</b> (tap it while turning to drift) &mdash; the car goes by itself',
  help: [
    '<b>The aim:</b> drive as far as you can before the clock runs out. Each stretch of road ends at a <b>checkpoint</b> that adds time. Five stretches make a run: reach one of the five <b>goals</b> for a time bonus, a love bonus and a rank, then go round again &mdash; busier and quicker.',
    '<b>Beat the clock:</b> the clock never stops &mdash; if it reaches zero it&rsquo;s game over and you start again from Bournemouth. Every stage keeps your <b>best time</b> on this device: it shows under the stage clock, and at each checkpoint you see how you did against it &mdash; beat it for a <b>NEW RECORD</b>. <b>HURRY!</b> flashes when you&rsquo;re not on pace to make the next checkpoint.',
    '<b>Your passenger</b> asks for things as you go: a drift, a near miss, overtaking, coins, a jump, a slipstream, keeping clean or going flat out. Do it before her timer runs out for up to three <b>hearts</b>. Coming up to a fork she says which way she would like to go &mdash; take her road for two more. Hearts are worth points now and again at the goal, and they count towards your rank.',
    '<b>Steer</b> with the <b>&larr; &rarr;</b> arrow keys (or A and D). The car accelerates by itself; press <b>&darr;</b> (or S) to brake. In Settings you can choose to hold <b>&uarr;</b> to go instead.',
    '<b>Bends</b> pull the car outwards &mdash; steer into them, and ease off (brake) for the sharp ones the black and white arrows warn you about. On <b>Gentle</b> the car helps you round.',
    '<b>Drifting:</b> while turning at speed, <b>tap &darr;</b> &mdash; the back of the car slides out and you go round the bend sideways, scoring points and filling your nitro. Keep steering to hold the slide; straighten up to stop.',
    '<b>Forks:</b> at the end of each stretch the road splits &mdash; keep to the <b>left</b> (west) or <b>right</b> (east) half to choose where you go next. The map in the bottom corner shows your way through the fifteen places. Don&rsquo;t hit the sign in the middle!',
    '<b>Nitro:</b> hold <b>Space</b> (or Shift, B or X, or the mouse button, or the <b>Nitro</b> button) and flames shoot from the pipes &mdash; well past full speed while the blue bar lasts. Fill it with <b>near misses</b> (passing cars closely), <b>slipstreams</b>, drifting, coins and the blue <b>nitro bottles</b>.',
    '<b>Bonuses</b> on the road: a red <b>magnet</b> pulls in coins from every lane; a gold <b>star</b> puts a shield round the car &mdash; smash through traffic and signs without crashing; a purple <b>gem</b> doubles every point you score; a green <b>clock</b> adds five seconds. The ones you have on show under the score, running down.',
    '<b>Jumps:</b> go over a crest fast and the car flies &mdash; points for every bit of air. <b>Coins</b> lie on the road in lines; get every coin in a line for a bonus.',
    '<b>Bumps:</b> running into the back of a car slows you right down; hitting a lamp post, palm tree or sign at speed spins you off (on Gentle you just bounce off). Bushes and beach umbrellas only slow you a little.',
    '<b>Start:</b> hold nitro as the lights turn green for a flying start. <b>Gentle</b> gives a little more time, less traffic and help round the bends, and only big crashes stop you. <b>P</b> pauses; the game also pauses itself if you click away.'
  ]
});
