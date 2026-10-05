/* 365 Eclipse - the picture and the sound (rebuilt 5 Oct 2026). The rules are in engine.js (window.EclEngine); the 3D
 * land, craft and explosions are world3d.js (three.js); this file puts the cabinet together (../common/arcade.js) and
 * draws, over the 3D picture, everything that must always be crisp and on top: enemy bullets, your shots, the items and
 * medals, the panel, and the labels and banners (../common/arcade-fx.js). Sounds are made on the spot; the music is an
 * optional techno track (Settings > Music, off unless switched on). A PC that can't do WebGL gets a plain flat picture. */
import { createWorld } from './world3d.js?v=2';

const E = window.EclEngine, A = window.Arcade365, F = window.Arcade365FX.create();
const GW = E.WIDTH, GH = E.HEIGHT;
let world = null, worldTried = false;
function getWorld() { if (!worldTried) { worldTried = true; try { world = createWorld(); } catch (e) { world = null; } if (!world && window.console) console.info('365 Eclipse: no WebGL here - the plain picture'); } return world; }

// ---------------------------------------------------------------- small pictures, painted once at the screen's sharpness
let VK = 0, VC = {};
function vec(key, w, h, paint) {
  const k = Math.max(1, Math.ceil(F.scale));
  if (k !== VK) { VK = k; VC = {}; }
  let c = VC[key]; if (c) return c;
  c = F.canvas(Math.ceil(w * k), Math.ceil(h * k)); c.gw = w; c.gh = h;
  const x = c.getContext('2d'); x.scale(k, k); x.translate(w / 2, h / 2); x.lineJoin = 'round';
  paint(x);
  return (VC[key] = c);
}
function put(c, x, y, alpha, rot, sx, sy) {
  const g = F.g, S = F.scale;
  g.globalAlpha = alpha == null ? 1 : alpha; g.imageSmoothingEnabled = true;
  if (rot || sx != null) { g.save(); g.translate(x * S + F.ox, y * S + F.oy); if (rot) g.rotate(rot); if (sx != null) g.scale(sx, sy == null ? 1 : sy); g.drawImage(c, -c.gw * S / 2, -c.gh * S / 2, c.gw * S, c.gh * S); g.restore(); }
  else g.drawImage(c, x * S + F.ox - c.gw * S / 2, y * S + F.oy - c.gh * S / 2, c.gw * S, c.gh * S);
}
// enemy bullets: hot pink and orange, with a dark rim so they read on snow and sand as well as on the sea
function bulletPic(kind) {
  const r = kind === 'big' ? 5 : kind === 'needle' ? 2.6 : 3.4;
  return vec('b|' + kind, r * 4.4, r * 4.4, (x) => {
    if (kind === 'needle') x.scale(0.62, 1.45);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, r * 2.1);
    if (kind === 'big') { g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#ffd0ff'); g.addColorStop(0.48, '#e040ff'); g.addColorStop(0.62, 'rgba(160,20,200,0.7)'); g.addColorStop(1, 'rgba(160,20,200,0)'); }
    else if (kind === 'needle') { g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#fff0c0'); g.addColorStop(0.55, '#ff8a1a'); g.addColorStop(0.75, 'rgba(255,90,0,0.5)'); g.addColorStop(1, 'rgba(255,90,0,0)'); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.32, '#ffd8ec'); g.addColorStop(0.5, '#ff2a8a'); g.addColorStop(0.68, 'rgba(255,30,120,0.55)'); g.addColorStop(1, 'rgba(255,30,120,0)'); }
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, r * 2.1, 0, 6.3); x.fill();
    x.strokeStyle = 'rgba(40,0,20,0.75)'; x.lineWidth = 0.7; x.beginPath(); x.arc(0, 0, r * 1.02, 0, 6.3); x.stroke();
  });
}
// the pods: guns on a square, rockets on a circle, bonuses on a hexagon - each its own colour and letter
const POD = {
  V: ['#fff0a0', '#e8a818', '#6a4400'], S: ['#ffd0a8', '#f06a1e', '#6a2000'], L: ['#bfe4ff', '#2a86f0', '#0a2a6a'], T: ['#e4d0ff', '#8a4af0', '#2e0a6a'],
  R: ['#ffb8b0', '#e02a2a', '#5a0808'], H: ['#b8ffd0', '#22b45a', '#0a4a1e'], C: ['#b8fff4', '#16b4b4', '#064a4a'],
  B: ['#f4f4f4', '#9aa4b4', '#3a4250'], D: ['#d8f4ff', '#4ab8ff', '#0a3a6a'], W: ['#fff8b0', '#e8d020', '#6a5a00'], X: ['#ffe0f0', '#ff4aa0', '#6a0a3a']
};
const LETTER = { D: '+', X: '\u00d72' };
function podPic(kind) {
  const c = POD[kind] || POD.B, shape = 'VSLT'.includes(kind) ? 'sq' : 'RHC'.includes(kind) ? 'ci' : 'hex';
  return vec('i|' + kind, 18, 18, (x) => {
    const g = x.createLinearGradient(-7, -7, 7, 7); g.addColorStop(0, c[0]); g.addColorStop(0.5, c[1]); g.addColorStop(1, c[2]);
    x.fillStyle = g; x.beginPath();
    if (shape === 'ci') x.arc(0, 0, 7, 0, 6.3);
    else if (shape === 'hex') for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; x.lineTo(Math.cos(a) * 7.8, Math.sin(a) * 7.8); }
    else { x.moveTo(-6.5, -3); x.quadraticCurveTo(-6.5, -6.5, -3, -6.5); x.lineTo(3, -6.5); x.quadraticCurveTo(6.5, -6.5, 6.5, -3); x.lineTo(6.5, 3); x.quadraticCurveTo(6.5, 6.5, 3, 6.5); x.lineTo(-3, 6.5); x.quadraticCurveTo(-6.5, 6.5, -6.5, 3); }
    x.closePath(); x.fill(); x.strokeStyle = '#ffffff'; x.lineWidth = 0.9; x.stroke();
    const t = LETTER[kind] || kind;
    x.font = '900 ' + (kind === 'X' ? 7.5 : 9.5) + 'px Archivo, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 1.8; x.strokeStyle = c[2]; x.strokeText(t, 0, 0.7); x.fillStyle = '#ffffff'; x.fillText(t, 0, 0.7);
    x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillRect(-3.5, -5.4, 7, 1.2);
  });
}

// ---------------------------------------------------------------- what happened: 2D labels and sparks (the 3D blasts are world3d's)
let TRAILS = new WeakMap(), lastW = null, hitN = 0, bombRing = null;
function onFx(W, f) {
  switch (f.k) {
    case 'stage': F.banner('STAGE ' + f.n, f.name, '#ffffff', 170); break;
    case 'warn': F.banner('WARNING', f.text, '#ff3a3a', 180, true); break;
    case 'warn6': F.floater('BEHIND YOU!', GW / 2, GH - 70, '#ff6a3a', 1, 60, 'behind'); break;
    case 'boom': F.flash(f.x, f.y, f.size >= 3 ? 40 : f.size === 2 ? 22 : 12, '#ffe0a0', f.size >= 3 ? 22 : 12); F.emit(f.x, f.y, f.size >= 3 ? 30 : f.size === 2 ? 14 : 6, ['#ffd84a', '#ff8a1a', '#ffffff'], f.size >= 2 ? 2.6 : 1.8, f.size >= 2 ? 34 : 22, { spread: 4 }); if (f.size >= 3) { F.shake(5); F.screen('#ffffff', 0.18, 14); } else if (f.size === 2) F.shake(1.6); break;
    case 'hit': hitN++; F.emit(f.x, f.y, 2, ['#ffffff', '#ffe08a'], 1.2, 8, { size: 0.7 }); break;
    case 'pop': F.emit(f.x, f.y, 1, ['#ff8ad8', '#ffffff'], 0.8, 12); break;
    case 'graze': F.emit(f.x, f.y, 2, ['#ffffff', '#9fe8ff'], 0.9, 10, { size: 0.6 }); break;
    case 'quick': F.floater('QUICK +' + f.pts, f.x, f.y - 10, '#7fffd0', 1, 46); break;
    case 'item': F.floater(f.text, f.x, f.y - 8, f.kind === 'M' ? '#ffd84a' : POD[f.kind] ? POD[f.kind][0] : '#ffe86a', 1, f.kind === 'M' ? 48 : 70); F.ring(f.x, f.y, f.kind === 'M' ? 10 : 16, f.kind === 'M' ? '#ffffff' : (POD[f.kind] || POD.B)[1], f.kind === 'M' ? 12 : 18, 1.5); break;
    case 'flight': F.floater('FLIGHT +' + f.pts, f.x, f.y - 14, '#9fffd0', 1, 64); F.ring(f.x, f.y, 20, '#9fffd0', 22, 1.5); break;
    case 'points': F.floater('+' + f.pts, f.x, f.y, '#ffd84a', 1, 70); break;
    case 'shieldhit': F.ring(f.x, f.y, 26, '#9fdcff', 22, 2); F.emit(f.x, f.y, 20, ['#9fdcff', '#ffffff'], 1.8, 22); F.shake(2.5); F.floater(f.left ? 'SHIELD ' + f.left : 'SHIELD GONE', f.x, f.y - 22, '#9fdcff', 1, 60); break;
    case 'die': F.flash(f.x, f.y, 60, '#ffffff', 26); F.shake(6); F.screen('#ff6040', 0.25, 20); break;
    case 'respawn': F.ring(f.x, f.y, 30, '#ffffff', 26, 1.5); break;
    case 'rage': F.ring(f.x, f.y, 70, '#ff3a3a', 36, 2.5); F.screen('#ff2040', 0.14, 30); F.shake(3); break;
    case 'bossdie': F.screen('#ffffff', 0.7, 50); F.shake(8); F.floater('+' + f.pts, f.x, f.y + 20, '#ffd84a', 2, 140); break;
    case 'clear': F.banner('STAGE CLEAR', 'DESTROYED ' + f.rate + '%  MEDALS ' + f.mrate + '%  +' + f.pts, '#5cff8a', 260); break;
    case 'extra': F.floater('EXTRA SHIP', GW / 2, GH - 60, '#5cff8a', 2, 100); break;
    case 'medalmiss': F.floater('MEDAL MISSED', GW - 50, GH - 34, '#c8a040', 1, 50, 'medal'); break;
    case 'bomb': bombRing = { x: f.x, y: f.y, t: 0 }; F.screen('#fff4d0', 0.6, 30); F.shake(7); break;
    case 'surface': F.ring(f.x, f.y, 24, '#e8f6ff', 30, 1.5); break;
  }
  if (world) world.onFx(f);
}

// ---------------------------------------------------------------- the picture
let dispScore = 0, renderScale = 1;
function draw(g, W, t, mode, info) {
  F.begin(g, info, mode);
  if (W !== lastW) { lastW = W; F.reset(); TRAILS = new WeakMap(); dispScore = W.score; bombRing = null; if (world) world.reset(); }
  const wd = getWorld();
  const q = W.fx; if (!W.demo) for (let i = 0; i < q.length; i++) onFx(W, q[i]); q.length = 0;
  const n = F.steps(W.frame);
  for (let i = 0; i < n; i++) { if (bombRing && ++bombRing.t > 60) bombRing = null; }
  const S = F.scale;
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (wd) {
    // the 3D picture: drawn at the screen's size (a little smaller on a slow PC or a huge screen), then put in place
    if (F.low && renderScale === 1) { renderScale = 0.72; wd.quality(true); }
    const cap = Math.sqrt(1.6e6 / (F.dw * F.dh)), k = Math.min(1, cap) * renderScale;
    wd.setSize(Math.max(64, Math.round(F.dw * k)), Math.max(64, Math.round(F.dh * k)));
    const cv = wd.render(W, t, !!W.demo);
    g.imageSmoothingEnabled = true; g.drawImage(cv, F.ox, F.oy, F.dw, F.dh);
  } else flat(W, t);
  if (W.demo) { F.drawFx(); F.end(); return; }
  // beams: a warning line, then the beam
  W.beams.forEach((b) => {
    if (b.warn > 0) { if ((b.warn >> 2) & 1) F.rect(b.x - 0.5, b.y, 1, GH - b.y, '#ff4a4a', 0.6, true); F.light(b.x, b.y, 6 + (60 - b.warn) * 0.2, '#ff4a4a', 0.6); }
    else { const fl = 0.8 + Math.random() * 0.2; F.rect(b.x - b.w / 2 - 3, b.y, b.w + 6, GH - b.y, '#ff3a6a', 0.3 * fl, true); F.rect(b.x - b.w / 2, b.y, b.w, GH - b.y, '#ff6a8a', 0.7 * fl, true); F.rect(b.x - 1.4, b.y, 2.8, GH - b.y, '#ffffff', fl, true); F.light(b.x, b.y, 16, '#ff3a6a', 0.9); }
  });
  drawItems(W, t);
  drawShots(W, t);
  const p = W.p;
  // the true hit point: tiny and white (only that dot can be hit)
  if (!p.dead && !W.over) { F.rect(p.x - 1.6, p.y - 1.6, 3.2, 3.2, '#000000', 0.55); F.rect(p.x - 1, p.y - 1, 2, 2, '#ffffff', 1); if (p.shield > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.16 + 0.06 * Math.sin(t / 200); g.fillStyle = '#9fdcff'; g.beginPath(); g.arc(p.x * S + F.ox, p.y * S + F.oy, 16 * S, 0, 6.3); g.fill(); g.restore(); } }
  // enemy bullets, on top of everything so they are never hidden
  for (const b of W.bullets) { const bp = bulletPic(b.kind); if (b.kind === 'needle') put(bp, b.x, b.y, 1, Math.atan2(b.vy, b.vx) - Math.PI / 2); else put(bp, b.x, b.y); }
  F.drawFx();
  if (bombRing) { const bk = bombRing.t / 60; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - bk) * 0.8; g.strokeStyle = '#ffe8a0'; g.lineWidth = (10 - bk * 8) * S; g.beginPath(); g.arc(bombRing.x * S + F.ox, bombRing.y * S + F.oy, (10 + F.easeOut(bk) * 280) * S, 0, 6.3); g.stroke(); g.restore(); }
  drawBossBar(W);
  drawHud(W, info, t);
  F.drawLabels(GW);
  F.end();
}
function drawShots(W, t) {
  const g = F.g, S = F.scale;
  for (const s of W.shots) {
    const k = s.kind;
    if (k === 'vulcan' || k === 'spread') {   // bolts along their line of flight: gold for the Vulcan, orange for the Spread
      const va = Math.atan2(s.vy, s.vx) + Math.PI / 2, sp = k === 'spread';
      g.save(); g.translate(s.x * S + F.ox, s.y * S + F.oy); g.rotate(va); g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.5; g.fillStyle = sp ? '#ff6a1a' : '#ffb21a'; g.fillRect(-1.8 * S, -4.5 * S, 3.6 * S, 9 * S);
      g.globalAlpha = 1; g.fillStyle = sp ? '#ffe0c0' : '#fff6c8'; g.fillRect(-0.8 * S, -4 * S, 1.6 * S, 7 * S); g.restore();
    } else if (k === 'laser') { const w = s.w || 3; F.rect(s.x - w / 2 - 1.4, s.y - 10, w + 2.8, 22, '#2a8aff', 0.35, true); F.rect(s.x - w / 2, s.y - 9.5, w, 21, '#6ac8ff', 0.8, true); F.rect(s.x - w / 6, s.y - 9, w / 3, 20, '#ffffff', 1, true); }
    else if (k === 'thunder') { trail(s, '#b07aff', 12, 2.6); F.light(s.x, s.y, 5, '#e8d0ff', 0.9); }
    else if (k === 'homing') { trail(s, '#9affc0', 9, 1.5); F.rect(s.x - 0.9, s.y - 2.2, 1.8, 4.4, '#e8fff0', 1); F.light(s.x, s.y + 2, 4, '#5aff9a', 0.7); }
    else if (k === 'rocket') { trail(s, '#ffb060', 8, 2.2); F.rect(s.x - 1.2, s.y - 3.5, 2.4, 6, '#f0f0f4', 1); F.rect(s.x - 1.2, s.y - 3.5, 2.4, 1.6, '#ff3a3a', 1); F.light(s.x, s.y + 3, 5, '#ff9a3d', 0.85); }
    else if (k === 'cluster') { F.light(s.x, s.y, 7, '#5af0e0', 0.8); F.rect(s.x - 2, s.y - 3, 4, 6, '#e8fffc', 1, true); }
  }
}
function trail(s, col, len, wid) {
  const g = F.g, S = F.scale;
  let tr = TRAILS.get(s); if (!tr) { tr = []; TRAILS.set(s, tr); }
  tr.unshift({ x: s.x, y: s.y }); if (tr.length > len) tr.pop();
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.strokeStyle = col;
  for (let j = 1; j < tr.length; j++) { const f2 = 1 - j / tr.length; g.globalAlpha = f2 * 0.8; g.lineWidth = Math.max(1, wid * S * f2); g.beginPath(); g.moveTo(tr[j - 1].x * S + F.ox, tr[j - 1].y * S + F.oy); g.lineTo(tr[j].x * S + F.ox, tr[j].y * S + F.oy); g.stroke(); }
  g.restore();
}
function drawItems(W, t) {
  const g = F.g, S = F.scale;
  for (const it of W.items) {
    if (it.kind === 'M') {   // a gold medal, turning
      const spin = Math.cos(it.t * 0.13), sx = Math.max(0.18, Math.abs(spin));
      F.light(it.x, it.y, 9, '#ffd84a', 0.55);
      g.save(); g.translate(it.x * S + F.ox, it.y * S + F.oy); g.scale(sx, 1);
      const cg = g.createRadialGradient(-1.5 * S, -1.5 * S, 0, 0, 0, 5.5 * S); cg.addColorStop(0, '#fff8d0'); cg.addColorStop(0.55, '#ffc828'); cg.addColorStop(1, '#9a6400');
      g.globalAlpha = 1; g.fillStyle = cg; g.beginPath(); g.arc(0, 0, 5.5 * S, 0, 6.3); g.fill(); g.strokeStyle = '#6a4200'; g.lineWidth = S * 0.6; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? 1.2 : 3; g.lineTo(Math.cos(a) * r * S, Math.sin(a) * r * S); } g.fill();
      g.restore();
    } else {   // a pod, glowing in its own colour and rocking gently
      F.light(it.x, it.y, 12, (POD[it.kind] || POD.B)[1], 0.45 + 0.2 * Math.sin(it.t / 9));
      put(podPic(it.kind), it.x, it.y, 1, Math.sin(it.t / 14) * 0.12);
    }
  }
}
function drawBossBar(W) {
  const B = W.boss; if (!B || B.dead || B.enter > 0) return;
  let tot = 0, left = 0; B.parts.forEach((q) => { if (q.core) { tot += q.max; left += Math.max(0, q.hp); } });
  F.rect(40, 17, 160, 4, '#000000', 0.6); F.rect(41, 18, 158 * left / tot, 2, B.phase === 2 ? '#ff3a3a' : '#ffd84a', 1, true);
  F.text(B.name, GW / 2, 23, '#ffffff', 1, null, 0.3, 0.85);
}
function drawHud(W, info, t) {
  const p = W.p;
  dispScore += Math.max(1, Math.ceil((W.score - dispScore) * 0.2)) * (W.score > dispScore ? 1 : 0); if (dispScore > W.score) dispScore = W.score;
  F.rect(0, 0, GW, 12, '#000000', 0.35);
  F.text(('0000000' + Math.min(99999999, dispScore)).slice(-8), 6, 3, '#ffffff', 1, 'left', 0.4);
  F.text(('0000000' + Math.min(99999999, info ? info.best : W.score)).slice(-8), GW - 6, 3, '#ffd84a', 1, 'right', 0.3);
  F.text('STAGE ' + W.stageNo, GW / 2, 3, '#9fb8e8', 1);
  // ships and bombs bottom left; the gun and the rockets bottom right (name and power); the next medal's value; grazes
  for (let i = 0; i < Math.min(6, W.lives - 1); i++) { const x = 9 + i * 10, y = GH - 9; F.rect(x - 0.8, y - 4, 1.6, 7, '#e8eef4', 1); F.rect(x - 4, y, 8, 1.6, '#e8eef4', 1); F.rect(x - 2, y + 2.6, 4, 1.2, '#e8eef4', 1); }
  for (let i = 0; i < Math.min(7, p.bombs); i++) { F.light(10 + i * 9, GH - 21, 4, '#3aff6a', 0.45); F.text('B', 10 + i * 9, GH - 24.5, '#d8ffd8', 1); }
  const row = (k, name, lv, y) => {
    F.text(name, GW - 30, y - 1, POD[k][0], 1, 'right', 0.5);
    for (let i = 0; i < E.MAXLV; i++) { F.rect(GW - 26 + i * 5, y, 4, 4, i < lv ? POD[k][1] : '#ffffff', i < lv ? 1 : 0.18); if (i < lv) F.rect(GW - 26 + i * 5, y, 4, 1.2, '#ffffff', 0.45); }
  };
  row(p.gun, E.GUNS[p.gun], p.glv, GH - 10);
  if (p.rk) row(p.rk, E.RKTS[p.rk], p.rlv, GH - 21);
  if (p.x2 > 0) F.text('DOUBLE SCORE ' + Math.ceil(p.x2 / 60), GW / 2, 14, '#ff8ad0', 1, null, 0.5, p.x2 < 180 && (W.frame >> 3) & 1 ? 0.35 : 1);
  if (W.medal > 0) F.text(String(E.MEDALS[Math.min(E.MEDALS.length - 1, W.medal)] * (1 + W.loop)), GW - 6, GH - 32, '#ffd84a', 1, 'right', 0.4, 0.9);
  if (W.graze > 0) F.text('GRAZE ' + W.graze, 6, 14, '#9fe8ff', 1, 'left', 0.3, 0.65);
}
// no WebGL: a plain picture - the land's colour, and simple shapes for everything
function flat(W, t) {
  const g = F.g, S = F.scale, id = W.stage ? W.stage.id : 'harbour';
  g.fillStyle = { harbour: '#1b6a84', city: '#2a2a32', desert: '#c8a470', sky: '#4a8ae0', arctic: '#0e3446', canyon: '#9a6a48', orbit: '#04040c' }[id] || '#222'; g.fillRect(0, 0, F.dw, F.dh);
  W.enemies.forEach((e) => { F.rect(e.x - e.r, e.y - e.r * 0.7, e.r * 2, e.r * 1.4, e.ground ? '#6a6e58' : '#8a8f98', e.under ? 0.3 : 1); if (e.flash) F.rect(e.x - e.r, e.y - e.r * 0.7, e.r * 2, e.r * 1.4, '#ffffff', 0.7); });
  if (W.boss) W.boss.parts.forEach((q) => F.rect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2, q.alive ? (q.core ? '#c84040' : '#7a7f88') : '#222', 1));
  const p = W.p;
  if (!p.dead) { g.fillStyle = '#e8eef4'; g.beginPath(); g.moveTo(p.x * S + F.ox, (p.y - 11) * S + F.oy); g.lineTo((p.x + 10) * S + F.ox, (p.y + 8) * S + F.oy); g.lineTo((p.x - 10) * S + F.ox, (p.y + 8) * S + F.oy); g.fill(); }
  p.wing.forEach((w) => F.rect(w.x - 4, w.y - 4, 8, 8, '#c8d8e8', 1));
}

// ---------------------------------------------------------------- sound
let lastMissile = 0, lastGraze = 0, lastShot = 0;
function pan(e) { return e && e.x != null ? Math.max(-0.8, Math.min(0.8, (e.x - GW / 2) / (GW / 2))) : 0; }
function sound(name, A2, e) {
  const p = pan(e), now = performance.now(); let n;
  switch (name) {
    case 'boom': A2.noise(0.32, 0.15, 3800, { pan: p, verb: 0.2 }); A2.tone(120, 0.22, 0.09, { type: 'sine', to: 38, pan: p }); break;
    case 'bigboom': A2.noise(1.0, 0.28, 2800, { pan: p, verb: 0.45 }); A2.tone(80, 0.8, 0.18, { type: 'sine', to: 22, pan: p }); A2.tone(200, 0.3, 0.04, { type: 'sawtooth', to: 45, pan: p }); break;
    case 'quick': A2.tone(1568, 0.08, 0.035, { type: 'square' }); A2.tone(2093, 0.12, 0.03, { type: 'square', when: 0.06 }); break;
    case 'graze': if (now - lastGraze > 60) { lastGraze = now; A2.tone(2600 + Math.random() * 400, 0.025, 0.012, { type: 'triangle' }); } break;
    case 'shot':   // each gun its own sound, kept quiet (it plays a lot)
      if (now - lastShot < 45) break; lastShot = now;
      if (e.g === 'L') A2.tone(1500, 0.07, 0.016, { type: 'sawtooth', to: 500, pan: p });
      else if (e.g === 'T') { A2.noise(0.06, 0.02, 6000, { type: 'highpass', pan: p }); A2.tone(400, 0.06, 0.012, { type: 'square', to: 1400, pan: p }); }
      else if (e.g === 'S') { A2.noise(0.05, 0.022, 2600, { type: 'bandpass', q: 1.5, pan: p }); A2.tone(820, 0.04, 0.012, { type: 'square', to: 420, pan: p }); }
      else A2.tone(1250, 0.045, 0.014, { type: 'square', to: 620, pan: p });
      break;
    case 'rkt': A2.noise(0.25, 0.08, 2600, { pan: p, verb: 0.2 }); A2.tone(140, 0.16, 0.05, { type: 'sine', to: 50, pan: p }); break;
    case 'cluster': A2.noise(0.5, 0.12, 3000, { pan: p, verb: 0.3 }); for (let j = 0; j < 4; j++) A2.noise(0.12, 0.05, 2200, { when: 0.05 + j * 0.05, pan: p }); break;
    case 'flight': [659, 784, 988, 1319].forEach((f, k) => A2.tone(f, 0.09, 0.04, { type: 'square', when: k * 0.05, verb: 0.3 })); break;
    case 'shieldup': A2.tone(600, 0.25, 0.04, { type: 'sine', to: 1400, verb: 0.3 }); A2.tone(900, 0.2, 0.025, { type: 'triangle', when: 0.08, verb: 0.3 }); break;
    case 'launch': A2.noise(0.3, 0.05, 1800, { type: 'bandpass', q: 1, to: 600, pan: p }); break;
    case 'surface': A2.noise(0.9, 0.08, 900, { type: 'lowpass', pan: p, verb: 0.3 }); break;
    case 'medal': n = (e && e.n) || 1; A2.tone(1046 * Math.pow(1.06, Math.min(12, n)), 0.08, 0.04, { type: 'square' }); A2.tone(1568 * Math.pow(1.06, Math.min(12, n)), 0.16, 0.035, { type: 'square', when: 0.06, verb: 0.3 }); break;
    case 'medalmiss': A2.tone(400, 0.2, 0.03, { type: 'triangle', to: 200 }); break;
    case 'power': [392, 523, 659, 784, 1047].forEach((f, k) => A2.tone(f, 0.1, 0.04, { type: 'square', when: k * 0.045, verb: 0.3 })); break;
    case 'bomb': A2.noise(2, 0.36, 2400, { verb: 0.6 }); A2.tone(60, 1.6, 0.24, { type: 'sine', to: 18 }); A2.tone(400, 0.6, 0.05, { type: 'sawtooth', to: 60, verb: 0.4 }); break;
    case 'empty': A2.tone(180, 0.08, 0.03, { type: 'square' }); break;
    case 'missile': if (now - lastMissile > 260) { lastMissile = now; A2.noise(0.2, 0.03, 1500, { type: 'bandpass', q: 1, to: 600, pan: p }); } break;
    case 'shield': A2.tone(1300, 0.3, 0.05, { type: 'sine', to: 400, verb: 0.3 }); A2.noise(0.2, 0.08, 7000, { type: 'bandpass', q: 3 }); break;
    case 'die': A2.noise(1.5, 0.34, 3000, { pan: p, verb: 0.5 }); A2.tone(160, 1.1, 0.14, { type: 'sine', to: 30 }); [392, 330, 262].forEach((f, j) => A2.tone(f, 0.2, 0.04, { type: 'triangle', when: 0.3 + j * 0.16 })); break;
    case 'respawn': [523, 784, 1047].forEach((f, j) => A2.tone(f, 0.12, 0.04, { type: 'triangle', when: j * 0.07, verb: 0.3 })); break;
    case 'warning': for (let j = 0; j < 6; j++) A2.tone(j % 2 ? 494 : 392, 0.24, 0.05, { type: 'square', when: j * 0.26, verb: 0.3 }); break;
    case 'rage': A2.tone(110, 0.8, 0.1, { type: 'sawtooth', to: 220, verb: 0.4 }); A2.tone(116, 0.8, 0.08, { type: 'sawtooth', to: 233, verb: 0.4 }); break;
    case 'beamwarn': A2.tone(200, 0.9, 0.03, { type: 'sawtooth', to: 900, pan: p }); break;
    case 'beam': A2.noise(0.6, 0.08, 1200, { type: 'bandpass', q: 4, pan: p }); A2.tone(110, 0.6, 0.05, { type: 'square', pan: p }); break;
    case 'bossdie': A2.noise(3, 0.38, 3000, { verb: 0.7 }); A2.tone(70, 2.6, 0.24, { type: 'sine', to: 16 }); [784, 659, 523, 392, 523, 659, 784, 1047, 1319].forEach((f, k) => A2.tone(f, 0.15, 0.045, { type: 'square', when: 0.9 + k * 0.09, verb: 0.45 })); break;
    case 'stage': A2.noise(1, 0.05, 300, { type: 'bandpass', q: 2, to: 7000 }); [392, 523, 659, 784].forEach((f, k) => A2.tone(f, 0.14, 0.045, { type: 'triangle', when: 0.5 + k * 0.1, verb: 0.4 })); break;
    case 'clear': [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, k) => A2.tone(f, 0.18, 0.05, { type: 'square', when: k * 0.08, verb: 0.5 })); break;
    case 'extra': [523, 659, 784, 1047, 784, 1047].forEach((f, k) => A2.tone(f, 0.1, 0.05, { type: 'square', when: k * 0.09, verb: 0.3 })); break;
    case 'over': [392, 330, 262, 196].forEach((f, k) => A2.tone(f, 0.32, 0.06, { type: 'triangle', when: k * 0.26, verb: 0.4 })); break;
  }
}
// music (Settings > Music, off unless switched on): a driving techno track - four-on-the-floor kick, off-beat hats,
// a rolling sixteenth bass and a stab on the chords, in a minor key
const BPM = 142, ST16 = 60 / BPM / 4;
const PROG = [[55, [440, 523, 659]], [43.65, [349, 440, 523]], [49, [392, 494, 587]], [41.2, [330, 415, 494]]];
let nextT = 0, stepN = 0, lastTick = 0;
function frameAudio(W, A2, mode, SET) {
  const playing = !!(W && !W.demo && mode === 'play' && SET.sound), hits = hitN; hitN = 0;
  if (playing && hits) { const pt = performance.now(); if (pt - lastTick > 70) { lastTick = pt; A2.tone(1800 + Math.random() * 300, 0.03, 0.012, { type: 'square', to: 900 }); } }
  if (!playing || !SET.music) { nextT = 0; return; }
  const a = A2.ctx(); if (!a) return;
  const now = a.currentTime;
  if (!nextT || nextT < now) { nextT = now + 0.06; stepN = 0; }
  while (nextT < now + 0.2) {
    const bar = Math.floor(stepN / 16) % 4, s = stepN % 16, ch = PROG[bar], when = nextT - now;
    if (s % 4 === 0) A2.tone(150, 0.14, 0.15, { type: 'sine', to: 42, when: when });                                  // kick
    if (s % 4 === 2) A2.noise(0.05, 0.03, 9000, { type: 'highpass', to: 8000, when: when });                           // off-beat hat
    if (s === 4 || s === 12) A2.noise(0.14, 0.07, 2200, { type: 'bandpass', q: 1.1, when: when });                      // clap
    A2.tone(ch[0] * (s % 2 ? 2 : 1), ST16 * 0.8, 0.045, { type: 'sawtooth', when: when, attack: 0.003 });              // rolling bass
    if (s === 0 || s === 6 || s === 10) ch[1].forEach((f) => A2.tone(f, ST16 * 1.4, 0.01, { type: 'sawtooth', when: when, verb: 0.35 }));   // stab
    if (s % 8 === 3 && bar === 3) A2.tone(ch[1][2] * 2, ST16 * 2, 0.012, { type: 'square', when: when, verb: 0.4 });
    nextT += ST16; stepN++;
  }
}

// ---------------------------------------------------------------- the cabinet
A.start({
  id: 'eclipse', store: 'ecl365', title: '365 Eclipse', width: GW, height: GH, waveWord: 'stage', alt: true, touchMove: true,
  pad: [{ act: 'fire', label: 'Fire', cls: 'fire' }, { act: 'alt', label: 'Bomb', cls: 'alt' }],
  speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
  settings: [
    { key: 'ship', type: 'seg', label: 'Fighter', small: 'Swift is the quickest (Vulcan); Striker starts with Spread and Rockets; Titan is slow but shielded (Laser); Wraith has Thunder and Homing. Changes from your next game.', options: [['swift', 'Swift'], ['striker', 'Striker'], ['titan', 'Titan'], ['wraith', 'Wraith']], def: 'striker' },
    { key: 'music', type: 'switch', label: 'Music', small: 'A techno track while you play.', def: false },
    { key: 'shake', type: 'switch', label: 'Screen shake', small: 'The screen shakes when something big blows up.', def: !F.reduced }
  ],
  picker: { key: 'ship', label: 'Choose your fighter', options: [['swift', 'Swift', 'Fast · Vulcan'], ['striker', 'Striker', 'Spread · Rockets'], ['titan', 'Titan', 'Shield · Laser'], ['wraith', 'Wraith', 'Thunder · Homing']] },
  newWorld: (speed, set) => E.newWorld(speed, null, set && set.ship),
  statKey: (W) => 'v' + W.diff,
  hires: () => true,
  step: E.step, hud: E.hud, draw: draw, sound: sound, frameAudio: frameAudio,
  quietSay: () => true,
  overText: (W) => 'Game over – stage ' + W.stageNo,
  titleText: 'Seven stages from the harbour to orbit. Press <b>fire</b> to shoot, catch the lettered <b>pods</b> for new guns, rockets and bonuses, shoot down whole <b>flights</b>, and blast the bosses&rsquo; guns off.',
  keysText: '<b>Arrows</b> or the mouse to fly &middot; <b>Space</b> or the mouse button to fire (quick taps fire faster) &middot; <b>B</b> or right-click: bomb &middot; <b>P</b> pause',
  touchText: 'Drag anywhere to fly &middot; hold <b>Fire</b> to shoot &middot; <b>Bomb</b> clears the screen',
  help: [
    '<b>You fire when you choose.</b> Hold <b>Space</b> or the mouse button (on a tablet, the Fire button) to shoot; tap it quickly and you fire faster still. Fly with the arrow keys (or W A S D), the mouse, or by dragging anywhere on the screen. Only the tiny white dot in the middle of your fighter can be hit.',
    '<b>Gun pods</b> (square): <b>V</b> Vulcan, <b>S</b> Spread, <b>L</b> Laser that goes through everything in its way, <b>T</b> Thunder that bends to its target. The same letter again powers your gun up, to 4. A different letter swaps guns and keeps the power.',
    '<b>Rocket pods</b> (round) fire alongside your gun: <b>R</b> Rockets that blow up where they hit, <b>H</b> Homing missiles, <b>C</b> Cluster shells that burst into a ring of blasts. They power up to 4 too.',
    '<b>Bonus pods</b> (six-sided): <b>B</b> an extra bomb, <b>+</b> a shield that takes a hit for you, <b>W</b> a wingman who flies and fires beside you (up to two), <b>&times;2</b> double points for 20 seconds.',
    '<b>Flights:</b> shoot down every plane in a flight and the last one leaves a pod, with a bonus. Carriers, gunships, hangars, destroyers and the big ones carry pods too. Pods drift down slowly, so you can choose which to catch.',
    '<b>Bombs:</b> press <b>B</b> (or right-click, or Bomb) for a carpet of blasts that clears every bullet. Up to seven.',
    '<b>Medals:</b> tanks, buildings, ships and trains leave gold medals on the ground. Catch them one after another and each is worth more &mdash; up to 10,000. Miss one and the value starts again.',
    '<b>Bonuses:</b> QUICK for shooting something down before it fires, GRAZE for letting a bullet pass close, and at the end of each stage a bonus for the share of enemies destroyed and medals caught.',
    '<b>If you are hit</b> you lose a level of power and your wingmen, and your gun&rsquo;s pod falls where you went down &mdash; catch it to win the level back.',
    '<b>Bosses:</b> shoot off their guns for 5,000 each &mdash; the core takes half damage while its guns stand. Gentle gives you a two-hit shield and five fighters.'
  ]
});
