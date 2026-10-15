/* 365 Pinball Hero - the 3D look (milestone 2a, 15 Oct 2026; owner: "full 3D, really nice graphics, special effects").
 * The same table as the flat look, as a lit, glossy, real-looking machine: a clear-coated playfield, chrome guide rails
 * and arch, dark wood cabinet sides with chrome trim, pop bumpers with lit caps in 365 Invaders' colours, translucent
 * slingshot plastics on white rubber, white bats with red rubbers, invader drop targets that sink, the spinner, the
 * saucer, the gates, a chrome plunger on its spring, the apron, a clear warp ramp with LED edges, a chrome ball that
 * reflects the table round it, and lit inserts that fade like bulbs. Bloom on the bright parts only.
 *
 * It ONLY READS the world: everything is built from the engine's own table (PinEngine.TABLE, RAMP, DROPS, GATES, POSTS,
 * BUMPERS), so when the physics lane moves a part, the picture follows - flat and 3D are always the same game.
 *
 * Coordinates (shared with the art lane): table x 0..270 left to right, y 0..446 from the arch DOWN to the flippers, heights
 * in the same units (the ball's radius is 7; 1 unit is about 1.9 mm). 3D: X = x - 135, Z = y - 223 (+Z towards the player),
 * Y = height (the playfield is Y = 0). The whole table is pitched 6.5 degrees, far end up, like a real cabinet.
 *
 * The playfield art is window.PinArt.paint({ scale }).color when the art lane's art3d.js is there (else a plain dark
 * stand-in), with the wall shadows and the bumpers' light pools painted on top ONCE at load. The lit inserts are
 * window.PinLamps.list, drawn as one batch of glowing quads from PinArt.lampSprite(), brightness PinLamps.level() with a
 * bulb's fade (a quick warm-up, a slower and slightly orange cool-down).
 *
 * create({ canvas, width, height, pixelRatio?, samples?, preserve?, reflect?, reflectEvery?, reflectSize?, fill?, tilt?, fov? })
 * -> { draw(W, t, mode, info), setView({ tilt, fov, fill }), resize(w, h), dispose(), stats() }. tilt: the camera's angle
 * from straight down onto the playfield, looking up the table from the player's end.
 *  - fill (the default, owner 15 Oct 2026: "the table fills the phone screen"): a close camera at FILL_TILT that puts the
 *    top of the arch at the top of the picture and the front rail at the bottom, keeps both outlanes, the flippers, the
 *    shooter lane and the plunger in view and crops only the outer wood. (At this picture's shape - the table's own,
 *    270 x 446 - a tilted table is too wide to fill top to bottom, so the few units left above the arch show the
 *    cabinet's back rail and the backbox's lit speaker panel - never sky.)
 *  - fill: false - the old framings: the whole cabinet (arch to lockdown bar, both sides) fitted in the portrait view,
 *    any room left over is space sky above the far end. setView({ tilt }) keeps whichever framing is on.
 * Effects: window.PinFX.state (fx.js) is drawn when it is there - gi, flash, shake, score pop-ups, sparks, extra lamp
 * brightness - and PinFX.update(W, t, mode) is called once per drawn frame. A short trail follows a fast ball. */
import * as THREE from 'three';
import { EffectComposer } from '../common/vendor/three-r185/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../common/vendor/three-r185/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../common/vendor/three-r185/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../common/vendor/three-r185/addons/postprocessing/OutputPass.js';

const E = window.PinEngine, T = E.TABLE, BR = E.BALL, TW = E.W, TH = E.H, MID = T.MID;
const DEG = Math.PI / 180, PITCH = 6.5 * DEG;
const ART_SCALE = 4;                                // playfield art: px per table unit (1080 x 1784)
const wx = (x) => x - 135, wz = (y) => y - 223;      // table -> 3D
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// the key light, table-local: from above, in front and a little left. Shadows (baked and live) fall the same way.
const KEY = new THREE.Vector3(-60, 400, 230).normalize();
const SHX = -KEY.x / KEY.y, SHY = -KEY.z / KEY.y;    // where a point's shadow lands, per unit of its height (table x, y)
const COL = { orb: '#ff5cc8', moth: '#3fe0ff', bot: '#ffd84a' };   // 365 Invaders' own colours
const BUMP = [{ c: COL.orb, art: 'orb' }, { c: COL.moth, art: 'moth' }, { c: COL.bot, art: 'bot' }];
// heights (table units) - everything stands up (owner 15 Oct 2026: "everything has height")
const H = { rail: 18, guide: 13, arch: 21, wood: 30, front: 22, bumpCap: 26, drop: 17, apron: 6, sling: 16, rampWall: 16, post: 19 };
// the wood sides reach out this far (cropped by the fill camera; wide enough that no sky shows past them at the far end)
const WOOD_L = -36, WOOD_R = 308;
// the fill camera: its tilt and lens, and what must be in the picture (table x, y, height)
const FILL_TILT = 28, FILL_FOV = 32;
const FILL = {
  top: [[136, 2.5, H.arch + 0.5]],                                     // the top of the arch: at the top edge
  bot: [[136, 448, H.front + 0.5]],                                     // the front rail's top edge: at the bottom edge
  side: [[8, 440, 0], [264, 442, 0], [8, 380, 0], [264, 380, 0], [266, 300, 0]]   // outlanes, shooter lane
};
// 365 Invaders' pixel invaders (ours) for the bumper caps, the drop targets and the stand-in art
const ART = {
  orb: ['....####....', '..########..', '.##..##..##.', '.##########.', '..########..', '...#....#...', '..#..##..#..', '.#........#.'],
  moth: ['##........##', '.##..##..##.', '..########..', '.##.####.##.', '############', '#..######..#', '...#....#...', '..#......#..'],
  bot: ['..#......#..', '...######...', '..#.####.#..', '..########..', '#.##.##.##.#', '#..######..#', '...#....#...', '..##....##..']
};

// ---------------------------------------------------------------- small helpers
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rnd(seed) { let a = seed | 0 || 1; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
function tex(c, o) {
  o = o || {};
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (o.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = o.aniso || 4;
  return t;
}
function invader(g, rows, x, y, k, col) { g.fillStyle = col; for (let r = 0; r < rows.length; r++) for (let q = 0; q < rows[r].length; q++) if (rows[r].charAt(q) === '#') g.fillRect(x + q * k, y + r * k, k, k); }

// one mesh's worth of triangles, built by hand (positions, normals, uvs); tri() orders each triangle so its face agrees
// with its vertex normals, so nothing comes out inside-out
class Geo {
  constructor() { this.p = []; this.n = []; this.u = []; this.i = []; }
  v(x, y, z, nx, ny, nz, u, v) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.u.push(u || 0, v || 0); return this.p.length / 3 - 1; }
  tri(a, b, c) {
    const P = this.p, N = this.n, A = a * 3, B = b * 3, C = c * 3;
    const e1x = P[B] - P[A], e1y = P[B + 1] - P[A + 1], e1z = P[B + 2] - P[A + 2], e2x = P[C] - P[A], e2y = P[C + 1] - P[A + 1], e2z = P[C + 2] - P[A + 2];
    const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
    if (fx * (N[A] + N[B] + N[C]) + fy * (N[A + 1] + N[B + 1] + N[C + 1]) + fz * (N[A + 2] + N[B + 2] + N[C + 2]) < 0) this.i.push(a, c, b); else this.i.push(a, b, c);
  }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  get empty() { return this.i.length === 0; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setIndex(this.i); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
// a rail swept along a path of table points [x, y, (base height)]: half-width w, height h, a round top; flat end caps
function sweep(G, pts, w, h, o) {
  o = o || {};
  const closed = !!o.closed, base = o.base || 0, bot = o.bottom != null ? o.bottom : -1, rr = Math.min(w, h * 0.5), prof = [], ARC = o.arc || 6;
  prof.push([-w, bot, -1, 0]);
  for (let k = 0; k <= ARC; k++) { const a = Math.PI - k * Math.PI / ARC; prof.push([Math.cos(a) * w, h - rr + Math.sin(a) * rr, Math.cos(a), Math.sin(a)]); }
  prof.push([w, bot, 1, 0]);
  const n = pts.length, rings = [], tans = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], q0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], q1 = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let tx = q1[0] - q0[0], ty = q1[1] - q0[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const lx = -ty, ly = tx, y0 = (p[2] || 0) + base, ring = [];
    for (const pr of prof) ring.push(G.v(wx(p[0] + lx * pr[0]), y0 + pr[1], wz(p[1] + ly * pr[0]), lx * pr[2], pr[3], ly * pr[2], i / n, 0));
    rings.push(ring); tans.push([tx, ty]);
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) { const A = rings[i], B = rings[(i + 1) % n]; for (let k = 0; k < prof.length - 1; k++) G.quad(A[k], B[k], B[k + 1], A[k + 1]); }
  if (!closed && o.caps !== false) {
    [[0, -1], [n - 1, 1]].forEach(([i, s]) => {
      const ring = rings[i], tx = tans[i][0] * s, tz = tans[i][1] * s, cap = ring.map((vi) => G.v(G.p[vi * 3], G.p[vi * 3 + 1], G.p[vi * 3 + 2], tx, 0, tz));
      for (let k = 1; k < cap.length - 1; k++) G.tri(cap[0], cap[k], cap[k + 1]);
    });
  }
}
// an upright ribbon (a thin wall) along a path [x, y, z0]: from z0 + y0 to z0 + y1, lateral offset off
function ribbon(G, pts, off, y0, y1) {
  const n = pts.length, A = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], q0 = pts[Math.max(0, i - 1)], q1 = pts[Math.min(n - 1, i + 1)];
    let tx = q1[0] - q0[0], ty = q1[1] - q0[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const lx = -ty, ly = tx, x = p[0] + lx * off, y = p[1] + ly * off, s = Math.sign(off) || 1;
    A.push([G.v(wx(x), p[2] + y0, wz(y), lx * s, 0, ly * s, i / (n - 1), 0), G.v(wx(x), p[2] + y1, wz(y), lx * s, 0, ly * s, i / (n - 1), 1)]);
  }
  for (let i = 0; i < n - 1; i++) G.quad(A[i][0], A[i + 1][0], A[i + 1][1], A[i][1]);
}
// a box with its uvs laid along its longest side (so wood grain runs along the rail)
function box(G, x0, x1, y0, y1, z0, z1, us) {
  us = us || 120;
  const long = Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 'x' : 'z';
  const F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  F.forEach((n) => {
    const c = [];
    const xs = n[0] ? [n[0] > 0 ? x1 : x0] : [x0, x1], ys = n[1] ? [n[1] > 0 ? y1 : y0] : [y0, y1], zs = n[2] ? [n[2] > 0 ? z1 : z0] : [z0, z1];
    xs.forEach((x) => ys.forEach((y) => zs.forEach((z) => c.push([x, y, z]))));
    const idx = c.map((p) => {
      const u = (long === 'x' ? p[0] : p[2]) / us, v = (n[1] ? (long === 'x' ? p[2] : p[0]) : p[1]) / us;
      return G.v(wx(p[0]), p[1], wz(p[2]), n[0], n[1], n[2], u, v);
    });
    G.quad(idx[0], idx[1], idx[3], idx[2]);
  });
}
// a flat shape in table units [[x, y], ...] extruded up from y0 by depth (ExtrudeGeometry, turned so it stands up)
function extrude(pts, y0, depth, bevel, holes) {
  const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], -p[1])));
  (holes || []).forEach((hp) => sh.holes.push(new THREE.Path(hp.map((p) => new THREE.Vector2(p[0], -p[1])))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: depth, bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 2, curveSegments: 16 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
  return g;
}
function planarUV(g, x0, y0, x1, y1) {   // uv from the table position (x0..x1, y0..y1 -> 0..1, v up)
  const P = g.attributes.position, uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { uv[i * 2] = (P.getX(i) + 135 - x0) / (x1 - x0); uv[i * 2 + 1] = 1 - (P.getZ(i) + 223 - y0) / (y1 - y0); }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
function offsetPoly(P, d, arcSteps) {   // a convex polygon grown by d, with round corners
  const n = P.length, cx = P.reduce((s, p) => s + p[0], 0) / n, cy = P.reduce((s, p) => s + p[1], 0) / n, nor = [];
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n]; let nx = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    if (((a[0] + b[0]) / 2 - cx) * nx + ((a[1] + b[1]) / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
    nor.push([nx, ny]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = P[i], n0 = nor[(i - 1 + n) % n], n1 = nor[i];
    let a0 = Math.atan2(n0[1], n0[0]), a1 = Math.atan2(n1[1], n1[0]); let da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const k = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / (arcSteps || 10))));
    for (let j = 0; j <= k; j++) { const a = a0 + da * j / k; out.push([p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d]); }
  }
  return out;
}

// ---------------------------------------------------------------- canvases painted once
function standInArt(S) {   // used only until the art lane's art3d.js is on the page
  const c = cv(TW * S, TH * S), g = c.getContext('2d'), r = rnd(11);
  g.scale(S, S);
  const gr = g.createLinearGradient(0, 0, 0, TH); gr.addColorStop(0, '#070a24'); gr.addColorStop(0.55, '#0d0b2c'); gr.addColorStop(1, '#170a2c');
  g.fillStyle = gr; g.fillRect(0, 0, TW, TH);
  const neb = (x, y, rad, col, a) => { const q = g.createRadialGradient(x, y, 0, x, y, rad); q.addColorStop(0, rgba(col, a)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
  neb(70, 120, 120, '#5a2a9a', 0.35); neb(210, 250, 110, '#1f86c9', 0.25); neb(130, 330, 90, '#ff5cc8', 0.12);
  g.strokeStyle = 'rgba(80,110,220,0.13)'; g.lineWidth = 0.35;
  for (let x = 5; x < TW; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, TH); g.stroke(); }
  for (let y = 5; y < TH; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(TW, y); g.stroke(); }
  for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(220,230,255,' + (0.25 + r() * 0.6) + ')'; const s = r() < 0.08 ? 0.9 : 0.45; g.fillRect(r() * TW, r() * TH, s, s); }
  // the planet the hero defends, low behind the flippers
  const pg = g.createRadialGradient(110, 440, 10, 125, 470, 95); pg.addColorStop(0, '#3fb0ff'); pg.addColorStop(0.6, '#1a4fa8'); pg.addColorStop(1, '#0a1a48');
  g.fillStyle = pg; g.beginPath(); g.arc(125, 478, 92, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(140,220,255,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.arc(125, 478, 92, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  // lane stripes from the table: the inlanes, outlanes and the shooter lane
  g.fillStyle = 'rgba(31,134,201,0.22)'; g.fillRect(T.shooter.x0 + 2, 150, T.shooter.x1 - T.shooter.x0 - 4, TH - 150);
  return c;
}
function woodCanvas() {
  const c = cv(512, 256), g = c.getContext('2d'), r = rnd(5);
  g.fillStyle = '#21120a'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 140; i++) {
    const y = r() * 256, a = 0.04 + r() * 0.12, w = 0.6 + r() * 2.4;
    g.strokeStyle = r() < 0.55 ? 'rgba(0,0,0,' + a + ')' : 'rgba(150,84,44,' + a + ')'; g.lineWidth = w; g.beginPath();
    for (let x = 0; x <= 512; x += 16) { const yy = y + Math.sin(x / 70 + i) * 3 + Math.sin(x / 19 + i * 3) * 0.8; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); }
    g.stroke();
  }
  return c;
}
function skyCanvas(w, h, hy, hx0, hx1) {   // the space beyond the far end of the table; hy: where its far edge is (0 top, 1 bottom), hx0-hx1 its width
  const c = cv(w, h), g = c.getContext('2d'), r = rnd(23), Y = hy * h;
  const gr = g.createLinearGradient(0, 0, 0, Y); gr.addColorStop(0, '#010106'); gr.addColorStop(0.6, '#070618'); gr.addColorStop(1, '#1a0c34');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const blob = (x, y, rx, ry, col, a, op) => { g.save(); g.globalCompositeOperation = op || 'lighter'; g.translate(x, y); g.scale(1, ry / rx); const q = g.createRadialGradient(0, 0, 0, 0, 0, rx); q.addColorStop(0, rgba(col, a)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); };
  // the galaxy's band, across the sky: a haze, its dust, then dense fine stars along it
  const bx0 = -0.15 * w, by0 = Y * 1.05, bx1 = 0.85 * w, by1 = -0.05 * h, bl = Math.hypot(bx1 - bx0, by1 - by0), ux = (bx1 - bx0) / bl, uy = (by1 - by0) / bl;
  for (let i = 0; i < 26; i++) { const t = i / 25, x = bx0 + (bx1 - bx0) * t, y = by0 + (by1 - by0) * t; blob(x, y, w * 0.2, w * 0.1, i % 3 ? '#4a3aa0' : '#7a3a9a', 0.055); }
  for (let i = 0; i < 40; i++) { const t = r(), x = bx0 + (bx1 - bx0) * t + (r() - 0.5) * w * 0.04, y = by0 + (by1 - by0) * t + (r() - 0.5) * w * 0.04; blob(x, y, w * (0.015 + r() * 0.03), w * 0.012, '#000000', 0.22, 'source-over'); }
  for (let i = 0; i < 2600; i++) {
    const t = r(), off = (r() + r() + r() - 1.5) * w * 0.11, x = bx0 + (bx1 - bx0) * t - uy * off, y = by0 + (by1 - by0) * t + ux * off;
    g.fillStyle = 'rgba(220,226,255,' + (0.15 + r() * 0.55) + ')'; const s = r() < 0.05 ? 1.4 : 0.7; g.fillRect(x, y, s, s);
  }
  // nebulae
  blob(w * 0.15, Y * 0.3, w * 0.45, w * 0.3, '#5a2a9a', 0.32); blob(w * 0.88, Y * 0.5, w * 0.4, w * 0.28, '#1f86c9', 0.26); blob(w * 0.6, Y * 0.12, w * 0.3, w * 0.2, '#ff5cc8', 0.14);
  // stars all over, a few bright ones with a soft halo and spikes
  for (let i = 0; i < 900; i++) {
    const x = r() * w, y = r() * h, b = r(), s = b > 0.97 ? 1.8 : b > 0.85 ? 1.2 : 0.7;
    g.fillStyle = 'rgba(' + (200 + (r() * 55 | 0)) + ',' + (210 + (r() * 45 | 0)) + ',255,' + (0.25 + b * 0.75) + ')'; g.fillRect(x, y, s, s);
    if (b > 0.988) { blob(x, y, 9, 9, '#c8dcff', 0.5); g.fillStyle = 'rgba(220,235,255,0.55)'; g.fillRect(x - 10, y, 21, 0.8); g.fillRect(x, y - 10, 0.8, 21); }
  }
  // light rising from behind the far end of the table, the colours of the invaders
  blob((hx0 + hx1) / 2 * w, Y, (hx1 - hx0) * w * 0.75, w * 0.16, '#ff5cc8', 0.30);
  blob((hx0 + hx1) / 2 * w, Y, (hx1 - hx0) * w * 0.45, w * 0.07, '#ffb08a', 0.35);
  blob(hx0 * w, Y, w * 0.16, w * 0.08, '#3fe0ff', 0.25); blob(hx1 * w, Y, w * 0.16, w * 0.08, '#3fe0ff', 0.25);
  return c;
}
function ballSkyCanvas() {   // what a ball sees above the table (equirectangular): the lit cabinet, the glass, the bulbs
  const w = 512, h = 256, c = cv(w, h), g = c.getContext('2d');
  const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, '#d9dce6'); q.addColorStop(0.3, '#8d93a6'); q.addColorStop(0.48, '#3a3550'); q.addColorStop(0.52, '#151020'); q.addColorStop(1, '#080610');
  g.fillStyle = q; g.fillRect(0, 0, w, h);
  const spot = (x, y, rx, ry, col, a) => { g.save(); g.translate(x, y); g.scale(1, ry / rx); const r = g.createRadialGradient(0, 0, 0, 0, 0, rx); r.addColorStop(0, rgba(col, a)); r.addColorStop(1, rgba(col, 0)); g.fillStyle = r; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); };
  g.fillStyle = '#ffffff'; g.fillRect(0, 6, w, 10);                                   // the strip light overhead
  for (let i = 0; i < 8; i++) spot(i * 64 + 32, h * 0.42, 22, 10, '#ffc890', 0.9);     // GI bulbs round the cabinet
  spot(w * 0.25, h * 0.36, 70, 22, '#ff5cc8', 0.45); spot(w * 0.75, h * 0.36, 70, 22, '#3fe0ff', 0.45);
  return c;
}
function blobCanvas(n, a) {   // a soft round shadow
  const c = cv(n, n), g = c.getContext('2d'), q = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  q.addColorStop(0, 'rgba(0,0,0,' + a + ')'); q.addColorStop(0.45, 'rgba(0,0,0,' + a * 0.6 + ')'); q.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = q; g.fillRect(0, 0, n, n); return c;
}
function capCanvas(col, art) {   // a pop bumper's cap: the invader in white on its colour
  const c = cv(128, 128), g = c.getContext('2d'), q = g.createRadialGradient(64, 54, 6, 64, 64, 64);
  q.addColorStop(0, rgba(col, 1)); q.addColorStop(0.7, col); q.addColorStop(1, '#1a0a20');
  g.fillStyle = q; g.fillRect(0, 0, 128, 128);
  g.globalAlpha = 0.92; invader(g, ART[art], 64 - 6 * 6, 64 - 4 * 6, 6, '#14082a'); g.globalAlpha = 1;
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.stroke();
  return c;
}
function dropsAtlas() {   // five target faces side by side, then a plain strip for the blocks' other faces
  const c = cv(64 * 6, 64), g = c.getContext('2d'), order = ['orb', 'moth', 'bot', 'moth', 'orb'];
  for (let i = 0; i < 5; i++) {
    const x = i * 64, col = COL[order[i]];
    const q = g.createLinearGradient(0, 0, 0, 64); q.addColorStop(0, '#2a2350'); q.addColorStop(1, '#100c26');
    g.fillStyle = q; g.fillRect(x, 0, 64, 64);
    g.strokeStyle = '#e8ecff'; g.lineWidth = 3; g.strokeRect(x + 2.5, 2.5, 59, 59);
    invader(g, ART[order[i]], x + 8, 14, 4, col);
  }
  g.fillStyle = '#d8dce8'; g.fillRect(320, 0, 64, 64);
  return c;
}
function cometCanvas() {
  const c = cv(128, 64), g = c.getContext('2d');
  g.fillStyle = '#ffd84a'; g.fillRect(0, 0, 128, 64);
  const q = g.createLinearGradient(10, 0, 100, 0); q.addColorStop(0, 'rgba(255,90,20,0)'); q.addColorStop(1, '#ff6a1a');
  g.fillStyle = q; g.beginPath(); g.moveTo(8, 26); g.lineTo(96, 18); g.lineTo(96, 46); g.lineTo(8, 38); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(98, 32, 13, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2a1a08'; g.lineWidth = 4; g.strokeRect(2, 2, 124, 60);
  return c;
}
function speakerCanvas() {   // the backbox's speaker panel, x WOOD_L..WOOD_R, 0..60 units up, 4 px a unit: the bit above the back rail
  const k = 4, w = (WOOD_R - WOOD_L) * k, h = 60 * k, c = cv(w, h), g = c.getContext('2d'), X = (x) => (x - WOOD_L) * k;
  const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, '#16121f'); q.addColorStop(1, '#0a0812');
  g.fillStyle = q; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.035)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);   // brushed metal
  // two speaker grilles with lit rings, pink left and cyan right
  [[40, COL.orb], [232, COL.moth]].forEach(([x, col]) => {
    const cx = X(x), cy = h * 0.5, r = 21 * k;
    g.save(); g.shadowColor = col; g.shadowBlur = 26; g.strokeStyle = col; g.lineWidth = 9; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.restore();
    g.fillStyle = '#05040a'; g.beginPath(); g.arc(cx, cy, r - 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(160,170,200,0.35)';
    for (let yy = -r; yy < r; yy += 9) for (let xx = -r; xx < r; xx += 9) if (xx * xx + yy * yy < (r - 12) * (r - 12)) g.fillRect(cx + xx, cy + yy, 4, 4);
  });
  // our name between them, glowing
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.shadowColor = '#ffb030'; g.shadowBlur = 30; g.fillStyle = '#ffd84a'; g.font = 'bold ' + (30 * k) + 'px "Arial Black", Arial, sans-serif';
  g.fillText('365', X(136), h * 0.36); g.restore();
  g.save(); g.shadowColor = COL.orb; g.shadowBlur = 22; g.fillStyle = '#ffe6f6'; g.font = 'bold ' + (13 * k) + 'px "Arial Black", Arial, sans-serif';
  g.fillText('PINBALL HERO', X(136), h * 0.77); g.restore();
  invader(g, ART.orb, X(76) - 24, h * 0.5 - 16, 4, COL.orb); invader(g, ART.bot, X(196) - 24, h * 0.5 - 16, 4, COL.bot);
  return c;
}
function plasticCanvas(col, art, x0, y0, x1, y1, poly) {   // a slingshot plastic's glowing print, over its box (8 px a unit)
  const k = 8, c = cv(Math.ceil((x1 - x0) * k), Math.ceil((y1 - y0) * k)), g = c.getContext('2d'), P = (p) => [(p[0] - x0) * k, (p[1] - y0) * k];
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  g.beginPath(); poly.forEach((p, i) => { const q = P(p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath();
  g.save(); g.clip();
  const q = g.createRadialGradient((cx - x0) * k, (cy - y0) * k, 2, (cx - x0) * k, (cy - y0) * k, Math.max(c.width, c.height) * 0.7);
  q.addColorStop(0, '#ffffff'); q.addColorStop(0.18, col); q.addColorStop(1, rgba(col, 0.55));
  g.fillStyle = q; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; for (let i = -c.height; i < c.width; i += 22) { g.beginPath(); g.moveTo(i, c.height); g.lineTo(i + c.height, 0); g.stroke(); }
  invader(g, ART[art], (cx - x0) * k - 24, (cy - y0) * k - 16, 4, '#14082a');
  g.restore();
  g.save(); g.shadowColor = '#ffffff'; g.shadowBlur = 14; g.strokeStyle = '#ffffff'; g.lineWidth = 6;
  g.beginPath(); poly.forEach((p, i) => { const r = P(p); i ? g.lineTo(r[0], r[1]) : g.moveTo(r[0], r[1]); }); g.closePath(); g.stroke(); g.restore();
  return c;
}
function popCanvas(text, col) {   // a score pop-up: bold, outlined, crisp
  const fs = 72, c0 = cv(8, 8), g0 = c0.getContext('2d'); g0.font = '900 ' + fs + 'px "Arial Black", Arial, sans-serif';
  const w = Math.ceil(g0.measureText(text).width + 28), h = fs + 28, c = cv(w, h), g = c.getContext('2d');
  g.font = g0.font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.strokeStyle = '#0a0418'; g.lineWidth = 12; g.strokeText(text, w / 2, h / 2 + 3);
  g.fillStyle = col; g.fillText(text, w / 2, h / 2 + 3);
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.save(); g.beginPath(); g.rect(0, 0, w, h * 0.46); g.clip(); g.fillText(text, w / 2, h / 2 + 3); g.restore();
  return c;
}
function apronCanvas() {   // the apron's print: x 0..270, y 370..446 at 4 px a unit
  const c = cv(1080, 304), g = c.getContext('2d');
  const q = g.createLinearGradient(0, 0, 0, 304); q.addColorStop(0, '#1d1840'); q.addColorStop(1, '#0c0a1e');
  g.fillStyle = q; g.fillRect(0, 0, 1080, 304);
  g.fillStyle = 'rgba(120,110,200,0.12)'; for (let x = 0; x < 1080; x += 12) g.fillRect(x, 0, 2, 304);
  g.font = 'bold 64px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const word = (s, x) => { g.fillStyle = '#5a3a08'; g.fillText(s, x + 3, 244 + 3); const t = g.createLinearGradient(0, 210, 0, 280); t.addColorStop(0, '#fff2b0'); t.addColorStop(0.5, '#ffc94a'); t.addColorStop(1, '#c88a1c'); g.fillStyle = t; g.fillText(s, x, 244); };
  word('365', 4 * 66); word('HERO', 4 * (2 * MID - 66));
  return c;
}
function flipperShadowCanvas(f) {   // a soft shadow of a bat, pointing along +x from its pivot at (pad, n/2)
  const pad = 14, k = 4, n = Math.ceil((f.len + pad * 2) * k), m = Math.ceil(pad * 2 * k), c = cv(n, m), g = c.getContext('2d');
  g.filter = 'none'; g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 3.5 * k; g.shadowOffsetX = 4000;
  g.fillStyle = '#000'; g.beginPath(); g.arc(pad * k - 4000, m / 2, f.r0 * k, 0, Math.PI * 2); g.arc((pad + f.len) * k - 4000, m / 2, f.r1 * k, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(pad * k - 4000, m / 2 - f.r0 * k); g.lineTo((pad + f.len) * k - 4000, m / 2 - f.r1 * k); g.lineTo((pad + f.len) * k - 4000, m / 2 + f.r1 * k); g.lineTo(pad * k - 4000, m / 2 + f.r0 * k); g.fill();
  return { c, pad, w: n / k, h: m / k };
}

// the playfield's printed art with the wall shadows and the bumpers' light pools painted on top (once, at load). Shadows
// are drawn with the canvas's own shadow (works on every phone, iPhones too), each part swept along the key light.
function bakePlayfield(base, parts, own) {   // own: the stand-in art (the art lane's has its own pools and contact shadows)
  const c = cv(base.width, base.height), g = c.getContext('2d'), k = c.width / TW, OFF = 20000;
  g.drawImage(base, 0, 0);
  // light pools round the pop bumpers
  g.globalCompositeOperation = own ? 'lighter' : 'source-over';
  if (own) {
  E.BUMPERS.forEach((B, i) => {
    const q = g.createRadialGradient(B.x * k, B.y * k, B.r * 0.6 * k, B.x * k, B.y * k, B.r * 3.2 * k);
    q.addColorStop(0, rgba(BUMP[i].c, 0.42)); q.addColorStop(1, rgba(BUMP[i].c, 0));
    g.fillStyle = q; g.fillRect((B.x - B.r * 4) * k, (B.y - B.r * 4) * k, B.r * 8 * k, B.r * 8 * k);
  });
  T.slings.forEach((s, i) => {
    const x = (s.a[0] + s.b[0] + s.c[0]) / 3, y = (s.a[1] + s.b[1] + s.c[1]) / 3, col = i ? COL.moth : COL.orb;
    const q = g.createRadialGradient(x * k, y * k, 2 * k, x * k, y * k, 30 * k); q.addColorStop(0, rgba(col, 0.28)); q.addColorStop(1, rgba(col, 0));
    g.fillStyle = q; g.fillRect((x - 32) * k, (y - 32) * k, 64 * k, 64 * k);
  });
  }
  g.globalCompositeOperation = 'source-over';
  function pass(alpha, blur, sweepIt) {
    g.save(); g.shadowColor = 'rgba(0,0,0,' + alpha + ')'; g.shadowBlur = blur * k; g.shadowOffsetX = OFF; g.fillStyle = '#000'; g.strokeStyle = '#000';
    g.lineCap = 'round'; g.lineJoin = 'round';
    const X = (x) => x * k - OFF, Y = (y) => y * k;
    parts.forEach((p) => {
      const h = sweepIt ? p.h : 0, ox = SHX * h, oy = SHY * h;
      if (p.seg) {
        g.lineWidth = p.r * 2 * k; g.beginPath();
        g.moveTo(X(p.seg[0]), Y(p.seg[1])); g.lineTo(X(p.seg[2]), Y(p.seg[3])); g.lineTo(X(p.seg[2] + ox), Y(p.seg[3] + oy)); g.lineTo(X(p.seg[0] + ox), Y(p.seg[1] + oy)); g.closePath();
        g.stroke(); g.fill();
      } else if (p.circle) {
        const [x, y, r] = p.circle; g.lineWidth = r * 2 * k; g.beginPath(); g.moveTo(X(x), Y(y)); g.lineTo(X(x + ox), Y(y + oy)); g.stroke();
      } else if (p.poly) {
        g.beginPath(); p.poly.forEach((q, j) => { j ? g.lineTo(X(q[0] + ox), Y(q[1] + oy)) : g.moveTo(X(q[0] + ox), Y(q[1] + oy)); }); g.closePath(); g.fill();
        g.beginPath(); p.poly.forEach((q, j) => { j ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1])); }); g.closePath(); g.fill();
      }
    });
    g.restore();
  }
  pass(own ? 0.5 : 0.36, 4, true);      // cast shadows, soft, falling away from the key light
  if (own) pass(0.55, 1.6, false);      // contact darkening right at the foot of each part
  // the clear ramp's faint shadow (the higher it is, the further it falls)
  g.save(); g.shadowColor = 'rgba(0,0,10,0.32)'; g.shadowBlur = 5 * k; g.shadowOffsetX = OFF; g.fillStyle = '#000';
  for (let s = 0; s <= E.RAMP.L; s += 3) {
    const r = E.rampAt(s); if (r.z < 2) continue;
    g.beginPath(); g.arc((r.x + SHX * r.z) * k - OFF, (r.y + SHY * r.z) * k, (T.ramp.width / 2) * k, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  return c;
}

// ---------------------------------------------------------------- the environment the shiny things reflect (made once)
function makeEnv(renderer, floorTex) {
  const es = new THREE.Scene(), junk = [];
  const add = (geo, mat, f) => { const m = new THREE.Mesh(geo, mat); f(m); es.add(m); junk.push(geo, mat); return m; };
  add(new THREE.BoxGeometry(1000, 600, 1200), new THREE.MeshBasicMaterial({ color: 0x05050a, side: THREE.BackSide }), (m) => { m.position.y = 250; });
  const lamp = (w, h, col, k, x, y, z, rx, ry) => add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }), (m) => { m.position.set(x, y, z); m.rotation.set(rx, ry, 0); });
  lamp(36, 300, '#fff1e0', 1.5, 0, 360, -60, Math.PI / 2, 0);        // a strip light overhead
  lamp(10, 420, '#ffb36a', 2.2, -150, 40, 0, Math.PI / 2, 0);        // warm GI strips along both sides
  lamp(10, 420, '#ffb36a', 2.2, 150, 40, 0, Math.PI / 2, 0);
  lamp(200, 50, '#3fe0ff', 0.5, 0, 120, -330, 0, 0);                 // a cool glow from the backbox end
  lamp(140, 60, '#ff5cc8', 0.8, -260, 140, 120, 0, Math.PI / 2);     // and coloured accents from the room
  lamp(140, 60, '#5a8cff', 0.8, 260, 140, 120, 0, -Math.PI / 2);
  add(new THREE.PlaneGeometry(TW, TH), new THREE.MeshBasicMaterial({ map: floorTex, color: 0x9a9a9a }), (m) => { m.rotation.x = -Math.PI / 2; m.position.y = -2; });
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(es, 0.025, 1, 3000);
  pm.dispose(); junk.forEach((j) => j.dispose());
  return rt;
}

// ================================================================ the world
export function create(opts) {
  opts = opts || {};
  const t0 = performance.now();
  const canvasEl = opts.canvas || cv(16, 16);
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  const PR = opts.pixelRatio || Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(PR);
  const EXPOSURE = opts.exposure || 1.12;   // high-key (owner 15 Oct 2026: "brightly lit, everything readable at a glance")
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = EXPOSURE;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 0.6, 5, 4000);
  camera.layers.enable(1);
  const table = new THREE.Group(); table.rotation.x = PITCH; scene.add(table);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const R1 = (o) => { o.layers.enable(1); return o; };   // on layer 1: seen in the ball's reflection too

  // ---------------------------------------------------------------- the playfield
  const parts = [];   // what casts a shadow on the playfield: {seg: [ax, ay, bx, by], r, h} | {circle: [x, y, r], h} | {poly, h}
  T.walls.forEach((w) => parts.push({ seg: [w[0], w[1], w[2], w[3]], r: w[4] + (w[6] === 'post' ? 0.3 : 0.6), h: w[6] === 'post' ? H.guide : cabinetSide(w) ? H.wood : H.rail }));
  (function () { const A = T.arch, pts = []; for (let k = 0; k <= 48; k++) { const a = Math.PI + Math.PI * k / 48; pts.push([A.x + A.R * Math.cos(a), A.y + A.R * Math.sin(a)]); } for (let k = 0; k < 48; k++) parts.push({ seg: [pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]], r: 2.2, h: H.arch }); })();
  E.POSTS.forEach((p) => parts.push({ circle: [p.x, p.y, p.r + 0.4], h: H.post }));
  E.BUMPERS.forEach((B) => parts.push({ circle: [B.x, B.y, B.r + 1], h: H.bumpCap }));
  T.slings.forEach((s) => parts.push({ poly: offsetPoly([s.a, s.b, s.c], 3, 6), h: H.sling }));
  E.DROPS.forEach((d) => parts.push({ seg: [d.ax, d.ay, d.bx, d.by], r: 2.2, h: H.drop * 0.5 }));
  function cabinetSide(w) { return w[0] === w[2] && (w[0] <= 6 || w[0] >= 266); }

  let artBase = null, artGlow = null, artSource = 'stand-in', artMs = 0;
  if (window.PinArt && typeof PinArt.paint === 'function') {
    try { const a0 = performance.now(), o = PinArt.paint({ scale: ART_SCALE }); artMs = Math.round(performance.now() - a0); if (o && o.color) { artBase = o.color; artGlow = o.glow || null; artSource = 'PinArt'; } } catch (e) { console.warn('PinArt.paint failed', e); }
  }
  if (!artBase) artBase = standInArt(ART_SCALE);
  const pfTex = keep(tex(bakePlayfield(artBase, parts, artSource !== 'PinArt'), { aniso: ANISO }));
  pfTex.generateMipmaps = true; pfTex.minFilter = THREE.LinearMipmapLinearFilter;
  // a thin, sharp clear coat (strong highlights, no milky haze) and the print lit from within a little, so it reads at a
  // glance and keeps its colour (uLift: the print's own colour added as light; it follows the GI)
  const pfMat = keep(new THREE.MeshPhysicalMaterial({ map: pfTex, roughness: 0.62, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.05, envMapIntensity: 0.1 }));
  if (artGlow) { pfMat.emissiveMap = keep(tex(artGlow, { aniso: ANISO })); pfMat.emissive = new THREE.Color(0xffffff); pfMat.emissiveIntensity = 1.1; }
  const LIFT = opts.lift != null ? opts.lift : 0.34, liftU = { value: LIFT };
  pfMat.onBeforeCompile = (sh) => {
    sh.uniforms.uLift = liftU;
    sh.fragmentShader = 'uniform float uLift;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * uLift;');
  };
  const pfGeo = keep(new THREE.PlaneGeometry(TW, TH)); pfGeo.rotateX(-Math.PI / 2);
  const playfield = R1(new THREE.Mesh(pfGeo, pfMat)); table.add(playfield);

  // the environment, from a little room of light panels with the playfield as its floor
  const envRT = makeEnv(renderer, pfTex); scene.environment = envRT.texture; disposables.push(envRT);
  // the space beyond the far end
  let skyTex = null, skyKey = '';
  function paintSky() {   // (again when the view changes: the glow sits behind the table's far end)
    const v = new THREE.Vector3(), at = (x, y, h) => { v.set(wx(x), h, wz(y)).applyMatrix4(table.matrixWorld).project(camera); return [(v.x + 1) / 2, (1 - v.y) / 2]; };
    const top = at(135, -4, H.wood), l = at(-3, -4, H.wood), rr = at(273, -4, H.wood);
    const key = [top[1], l[0], rr[0]].map((q) => q.toFixed(3)).join();
    if (key === skyKey) return; skyKey = key;
    const old = skyTex; skyTex = tex(skyCanvas(720, Math.round(720 * RH / RW), clamp(top[1], 0.02, 1), l[0], rr[0])); scene.background = skyTex;
    if (old) old.dispose();
  }

  // ---------------------------------------------------------------- materials
  const M = {
    chrome: keep(new THREE.MeshStandardMaterial({ color: 0xe6ebf4, metalness: 1, roughness: 0.17 })),
    darkChrome: keep(new THREE.MeshStandardMaterial({ color: 0x9aa3b4, metalness: 1, roughness: 0.3 })),
    rubberW: keep(new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.55, envMapIntensity: 0.4 })),
    rubberB: keep(new THREE.MeshStandardMaterial({ color: 0x17161c, roughness: 0.5, envMapIntensity: 0.6 })),
    rubberR: keep(new THREE.MeshStandardMaterial({ color: 0xd8182a, roughness: 0.45, envMapIntensity: 0.5 })),
    batW: keep(new THREE.MeshPhysicalMaterial({ color: 0xf6f4ee, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.15 })),
    wood: keep(new THREE.MeshStandardMaterial({ map: keep(tex(woodCanvas(), { repeat: true, aniso: ANISO })), roughness: 0.38, metalness: 0, envMapIntensity: 0.7 })),
    black: keep(new THREE.MeshStandardMaterial({ color: 0x0b0a12, roughness: 0.5, metalness: 0.2 })),
    shadow: keep(new THREE.MeshBasicMaterial({ map: keep(tex(blobCanvas(64, 0.62))), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))
  };

  // ---------------------------------------------------------------- the chrome: guide rails, the arch, lane guides, the ramp's wires, trims
  const chrome = new Geo(), posts = [];   // posts: [x, y, height, radius]
  T.walls.forEach((w) => {
    if (cabinetSide(w)) return;
    const guide = w[6] === 'post', h = guide ? H.guide : H.rail, r = guide ? 1.3 : w[4];
    sweep(chrome, [[w[0], w[1]], [w[2], w[3]]], r, h);
    posts.push([w[0], w[1], h + 1.6, r + 0.5], [w[2], w[3], h + 1.6, r + 0.5]);
  });
  (function () {   // the top arch
    const A = T.arch, pts = [];
    for (let k = 0; k <= 120; k++) { const a = Math.PI + Math.PI * k / 120; pts.push([A.x + A.R * Math.cos(a), A.y + A.R * Math.sin(a)]); }
    sweep(chrome, pts, A.r + 0.2, H.arch, { arc: 8 });
  })();
  // the cabinet's chrome trims along the inside top edge of the wood
  sweep(chrome, [[7.2, -14], [7.2, 446]], 1.4, 2.6, { base: H.wood - 1 });
  sweep(chrome, [[264.8, -14], [264.8, 446]], 1.4, 2.6, { base: H.wood - 1 });

  // ---------------------------------------------------------------- the warp ramp: a clear ribbon with walls, chrome wires, LED edges, supports
  // (drawn along a smooth curve through the physics path's points; the ball still follows the path itself, never more
  // than a unit or two off the curve, well inside the ramp's walls)
  const RP = [], rc = new THREE.CatmullRomCurve3(E.RAMP.P.map((p) => new THREE.Vector3(p[0], p[2], p[1])), false, 'centripetal');
  for (let k = 0, N = Math.ceil(E.RAMP.L / 2.5); k <= N; k++) {
    const v = rc.getPointAt(k / N), tg = rc.getTangentAt(k / N), l = Math.hypot(tg.x, tg.z) || 1;
    RP.push([v.x, v.z, Math.max(0.35, v.y + 0.35), tg.x / l, tg.z / l]);
  }
  const rampHW = T.ramp.width / 2;
  const clear = new Geo(), led = new Geo(), walls = new Geo();
  (function () {
    const n = RP.length, A = [];
    for (let i = 0; i < n; i++) {
      const p = RP[i], lx = -p[4], ly = p[3];
      A.push([clear.v(wx(p[0] + lx * rampHW), p[2], wz(p[1] + ly * rampHW), 0, 1, 0, 0, i / n), clear.v(wx(p[0] - lx * rampHW), p[2], wz(p[1] - ly * rampHW), 0, 1, 0, 1, i / n)]);
    }
    for (let i = 0; i < n - 1; i++) clear.quad(A[i][0], A[i + 1][0], A[i + 1][1], A[i][1]);
    const P3 = RP.map((p) => [p[0], p[1], p[2]]);
    // chunky tinted side walls, inner and outer faces (a thick sheet of coloured plastic)
    ribbon(walls, P3, rampHW + 0.3, 0, H.rampWall); ribbon(walls, P3, -(rampHW + 0.3), 0, H.rampWall);
    ribbon(walls, P3, rampHW + 2.1, -0.5, H.rampWall); ribbon(walls, P3, -(rampHW + 2.1), -0.5, H.rampWall);
    // the wires along the walls' tops (two rails each side), and the LED strips along the floor's edges
    const top = (off, h) => RP.map((p) => [p[0] - p[4] * off, p[1] + p[3] * off, p[2] + h]);
    sweep(chrome, top(rampHW + 1.2, H.rampWall - 0.6), 0.95, 1.9, { bottom: -0.4 }); sweep(chrome, top(-(rampHW + 1.2), H.rampWall - 0.6), 0.95, 1.9, { bottom: -0.4 });
    sweep(chrome, top(rampHW + 1.2, H.rampWall * 0.5), 0.45, 0.9, { bottom: -0.45 }); sweep(chrome, top(-(rampHW + 1.2), H.rampWall * 0.5), 0.45, 0.9, { bottom: -0.45 });
    const edge = (off) => RP.map((p) => [p[0] - p[4] * off, p[1] + p[3] * off, p[2] + 0.15]);
    sweep(led, edge(rampHW - 0.6), 0.55, 1.1, { bottom: 0 }); sweep(led, edge(-(rampHW - 0.6)), 0.55, 1.1, { bottom: 0 });
    // the entrance lip
    const p0 = RP[1]; sweep(chrome, [[p0[0] + p0[4] * rampHW, p0[1] - p0[3] * rampHW, 0], [p0[0] - p0[4] * rampHW, p0[1] + p0[3] * rampHW, 0]], 0.9, 1.4);
    // supports: where an edge of the ramp, high up, is over a wall or off the playfield, a chrome post holds it up
    let last = -99;
    for (let i = 0; i < n; i++) {
      const p = RP[i]; if (p[2] < 12 || i - last < 14) continue;
      for (const s of [1, -1]) {
        const ex = p[0] - p[4] * (rampHW + 1.2) * s, ey = p[1] + p[3] * (rampHW + 1.2) * s;
        const offField = ex < 8 || E.inPocket(ex, ey) || Math.hypot(ex - T.arch.x, ey - T.arch.y) > T.arch.R - 1 && ey < T.arch.y;
        const onWall = T.walls.some((w) => { const dx = w[2] - w[0], dy = w[3] - w[1], l2 = dx * dx + dy * dy || 1, t = clamp(((ex - w[0]) * dx + (ey - w[1]) * dy) / l2, 0, 1); return Math.hypot(ex - w[0] - dx * t, ey - w[1] - dy * t) < 3; });
        if (offField || onWall) { posts.push([ex, ey, p[2] - 0.3, 1.1, true]); last = i; break; }
      }
    }
  })();
  const clearMat = keep(new THREE.MeshPhysicalMaterial({ color: 0x8fd8ff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.9 }));
  const rampClear = new THREE.Mesh(keep(clear.geometry()), clearMat); rampClear.renderOrder = 3; table.add(rampClear);
  const wallMat = keep(new THREE.MeshStandardMaterial({ color: 0x3fe0ff, emissive: new THREE.Color(COL.moth), emissiveIntensity: 0.22, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.36, depthWrite: false, side: THREE.DoubleSide }));
  const rampWalls = new THREE.Mesh(keep(walls.geometry()), wallMat); rampWalls.renderOrder = 4; table.add(rampWalls);
  const ledMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.moth).multiplyScalar(1.4) }));
  const rampLed = R1(new THREE.Mesh(keep(led.geometry()), ledMat)); table.add(rampLed);

  const chromeMesh = R1(new THREE.Mesh(keep(chrome.geometry()), M.chrome)); table.add(chromeMesh);

  // ---------------------------------------------------------------- the cabinet: wood sides and back, the corners outside the arch, the front and lockdown bar
  const wood = new Geo();
  box(wood, WOOD_L, 8, 0, H.wood, -18, 446.5); box(wood, 264, WOOD_R, 0, H.wood, -18, 446.5);
  box(wood, WOOD_L, WOOD_R, 0, H.wood, -18, 3);
  box(wood, WOOD_L, WOOD_R, 0, H.front, 446.5, 470);
  const woodMesh = R1(new THREE.Mesh(keep(wood.geometry()), M.wood)); table.add(woodMesh);
  // the backbox behind the far end: only its lit speaker panel shows, in the strip the fill camera has above the arch
  const backbox = new THREE.Group(); table.add(backbox);
  (function () {
    const bw = WOOD_R - WOOD_L, sp = keep(tex(speakerCanvas(), { aniso: ANISO }));
    const pg = keep(new THREE.PlaneGeometry(bw, 60));
    const panel = new THREE.Mesh(pg, keep(new THREE.MeshStandardMaterial({ map: sp, emissiveMap: sp, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.4, metalness: 0.3 })));
    panel.position.set(wx((WOOD_L + WOOD_R) / 2), H.wood + 30, wz(-18.3)); backbox.add(panel);
    const sides = new Geo(); box(sides, WOOD_L - 6, WOOD_R + 6, 0, H.wood + 64, -46, -18.4);
    backbox.add(new THREE.Mesh(keep(sides.geometry()), M.wood));
  })();
  (function () {   // the dark plates filling the corners outside the arch
    const A = T.arch, Ro = A.R + A.r + 0.5, corner = (side) => {
      const pts = [], xs = side < 0 ? 8 : 264;
      pts.push([xs, 3]);
      for (let k = 0; k <= 60; k++) {
        const a = side < 0 ? -Math.PI / 2 - Math.PI / 2 * k / 60 : -Math.PI / 2 + Math.PI / 2 * k / 60, x = A.x + Ro * Math.cos(a), y = A.y + Ro * Math.sin(a);
        if ((side < 0 && x < xs) || (side > 0 && x > xs)) { pts.push([xs, y]); break; }
        pts.push([x, y]);
      }
      return pts;
    };
    [-1, 1].forEach((s) => { const g = keep(extrude(corner(s), 0, 4, 0)); g.translate(-135, 0, -223); const m = R1(new THREE.Mesh(g, M.black)); table.add(m); });
  })();
  const lockGeo = keep(new THREE.CylinderGeometry(4.5, 4.5, 300, 24)); lockGeo.rotateZ(Math.PI / 2);
  const lock = R1(new THREE.Mesh(lockGeo, keep(new THREE.MeshStandardMaterial({ color: 0x2a2e36, metalness: 1, roughness: 0.42, envMapIntensity: 0.5 })))); lock.position.set(wx(136), H.front + 3, wz(458)); table.add(lock);

  // ---------------------------------------------------------------- the apron (from the flat look's outline: under the inlanes, to the drain)
  (function () {
    const F = T.flippers[0]; let fl = null;
    T.walls.forEach((w) => { if (w[1] < w[3] && w[0] < w[2] && w[2] < MID && w[3] > 360 && Math.abs(w[2] - F.x) < 20) fl = w; });
    if (!fl) fl = [24, 380, 70, 399];
    const gap = 15, tipY = F.y + Math.sin(F.rest) * F.len + 7;
    const left = [[fl[0], fl[1] + 3], [fl[2], fl[3] + 3], [F.x + 2, F.y + 8], [MID - gap - 6, tipY + 3], [MID - gap, tipY + 6], [MID - gap, TH], [fl[0], TH]];
    const right = left.map((p) => [2 * MID - p[0], p[1]]).reverse();
    const own = artSource !== 'PinArt', at = own ? keep(tex(apronCanvas(), { aniso: ANISO })) : pfTex;   // (the art lane prints the apron on the playfield)
    const mat = keep(new THREE.MeshPhysicalMaterial({ map: at, roughness: 0.35, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.1 }));
    [left, right].forEach((P) => {
      const g = keep(extrude(P, 0, H.apron - 0.8, 0.8)); g.translate(-135, 0, -223); if (own) planarUV(g, 0, 370, 270, 446); else planarUV(g, 0, 0, 270, 446);
      table.add(R1(new THREE.Mesh(g, mat)));
    });
    // the gap below the drain is the cabinet's dark inside
    const dg = keep(new THREE.PlaneGeometry(2 * gap, TH - tipY - 6)); dg.rotateX(-Math.PI / 2);
    const drain = new THREE.Mesh(dg, keep(new THREE.MeshBasicMaterial({ color: 0x010103 }))); drain.position.set(wx(MID), 0.08, wz((tipY + 6 + TH) / 2)); table.add(drain);
  })();

  // ---------------------------------------------------------------- slingshots: white rubber round the posts, a coloured plastic on top
  const slings = T.slings.map((s, i) => {
    const col = i ? COL.moth : COL.orb, tri = [s.a, s.b, s.c];
    const rub = new Geo(); sweep(rub, offsetPoly(tri, 1.5, 8), 1.0, 6, { closed: true, base: 3 });
    const rubber = R1(new THREE.Mesh(keep(rub.geometry()), M.rubberW)); table.add(rubber);
    // the plastic's glowing print: the art lane's (PinArt.plastic('slingL' | 'slingR', scale) -> a canvas over the table
    // rectangle canvas.x0, y0, qw x qh), else our own: the invader on a lit gradient
    const outline = offsetPoly(tri, 3.8, 6), xs = outline.map((p) => p[0]), ys = outline.map((p) => p[1]);
    let bx = [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1], art = null;
    if (window.PinArt && typeof PinArt.plastic === 'function') {
      try { const c = PinArt.plastic(i ? 'slingR' : 'slingL', ART_SCALE); if (c && c.width && c.x0 != null) { art = c; bx = [c.x0, c.y0, c.x0 + c.qw, c.y0 + c.qh]; } } catch (e) { art = null; }
    }
    if (!art) art = plasticCanvas(col, i ? 'moth' : 'orb', bx[0], bx[1], bx[2], bx[3], outline);
    const at = keep(tex(art, { aniso: ANISO }));
    const mat = keep(new THREE.MeshStandardMaterial({ map: at, emissiveMap: at, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.16, metalness: 0, transparent: true, opacity: 0.9 }));
    const g = keep(extrude(outline, H.sling, 1.2, 0.4)); g.translate(-135, 0, -223); planarUV(g, bx[0], bx[1], bx[2], bx[3]);
    const plastic = R1(new THREE.Mesh(g, mat)); plastic.renderOrder = 2; table.add(plastic);
    return { mat, rubber, flash: 0 };
  });

  // ---------------------------------------------------------------- pop bumpers
  const cylinder = (rt, rb, h, seg, open) => keep(new THREE.CylinderGeometry(rt, rb, h, seg || 32, 1, !!open));
  const bumpers = E.BUMPERS.map((B, i) => {
    const col = new THREE.Color(BUMP[i].c), grp = new THREE.Group(); grp.position.set(wx(B.x), 0, wz(B.y)); table.add(grp);
    // a mushroom on a post: a flared chrome skirt on the playfield, the lit collar the ball strikes, the chrome ring that
    // snaps down, a white post, and a wide domed cap with the invader on top, standing well above the ball
    const v2 = (a) => a.map((q) => new THREE.Vector2(q[0], q[1]));
    const base = R1(new THREE.Mesh(cylinder(B.r + 2.6, B.r + 2.9, 0.8), M.black)); base.position.y = 0.4; grp.add(base);
    const flare = R1(new THREE.Mesh(keep(new THREE.LatheGeometry(v2([[B.r + 2.6, 0.2], [B.r + 2.3, 0.9], [B.r + 1.0, 2.0], [B.r + 0.1, 3.1], [B.r - 0.3, 3.8]]), 40)), M.chrome)); grp.add(flare);
    const skirtMat = keep(new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, roughness: 0.25, transparent: true, opacity: 0.9 }));
    const skirt = R1(new THREE.Mesh(cylinder(B.r - 0.3, B.r - 0.1, 6.4), skirtMat)); skirt.position.y = 7; grp.add(skirt);
    const body = R1(new THREE.Mesh(cylinder(B.r - 6, B.r - 5.4, 10), M.batW)); body.position.y = 15; grp.add(body);
    const ring = R1(new THREE.Mesh(cylinder(B.r + 0.6, B.r + 0.6, 1.6, 40), M.chrome)); ring.position.y = 11; grp.add(ring);
    const capTex = keep(tex(capCanvas(BUMP[i].c, BUMP[i].art), { aniso: ANISO }));
    const sideMat = keep(new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.2, transparent: true, opacity: 0.94 }));
    const topMat = keep(new THREE.MeshPhysicalMaterial({ map: capTex, emissiveMap: capTex, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }));
    const CR = B.r + 1.2, rimY = H.bumpCap - 5.8;
    const rim = R1(new THREE.Mesh(cylinder(CR, CR - 0.8, 2.6, 40, true), sideMat)); rim.position.y = rimY + 1.3; grp.add(rim);
    const under = R1(new THREE.Mesh(keep(new THREE.RingGeometry(B.r - 5.6, CR - 0.8, 40).rotateX(Math.PI / 2)), sideMat)); under.position.y = rimY; grp.add(under);
    const domeG = keep(new THREE.SphereGeometry(CR, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2)); domeG.scale(1, 3.2 / CR, 1);
    { const P = domeG.attributes.position, uv = domeG.attributes.uv; for (let k = 0; k < P.count; k++) uv.setXY(k, P.getX(k) / (2 * CR) + 0.5, 0.5 - P.getZ(k) / (2 * CR)); }
    const cap = R1(new THREE.Mesh(domeG, topMat)); cap.position.y = rimY + 2.6; grp.add(cap);
    return { grp, ring, skirtMat, sideMat, topMat, col, hit: 0 };
  });

  // ---------------------------------------------------------------- flippers: white bats with red rubbers
  function batShape(r0, r1, len) {
    const al = Math.acos(clamp((r0 - r1) / len, -1, 1)), s = new THREE.Shape();
    s.absarc(0, 0, r0, al, 2 * Math.PI - al, false);
    s.absarc(len, 0, r1, -al, al, false);
    s.closePath();
    return s;
  }
  const flippers = T.flippers.map((f) => {
    const grp = new THREE.Group(); grp.position.set(wx(f.x), 0, wz(f.y)); table.add(grp);
    const rg = keep(new THREE.ExtrudeGeometry(batShape(f.r0, f.r1, f.len), { depth: 4.6, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 2, curveSegments: 24 }));
    rg.rotateX(-Math.PI / 2); rg.translate(0, 1.9, 0);
    const bg = keep(new THREE.ExtrudeGeometry(batShape(f.r0 - 1.3, f.r1 - 1.25, f.len), { depth: 7.2, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.8, bevelSegments: 3, curveSegments: 24 }));
    bg.rotateX(-Math.PI / 2); bg.translate(0, 1.4, 0);
    const bat = new THREE.Group(); grp.add(bat);
    bat.add(R1(new THREE.Mesh(rg, M.rubberR)), R1(new THREE.Mesh(bg, M.batW)));
    const pin = R1(new THREE.Mesh(cylinder(2.4, 2.6, 1.2, 20), M.chrome)); pin.position.y = 10.4; bat.add(pin);
    const sc = flipperShadowCanvas(f), sg = keep(new THREE.PlaneGeometry(sc.w, sc.h)); sg.rotateX(-Math.PI / 2); sg.translate(sc.w / 2 - sc.pad, 0, 0);
    const sh = new THREE.Mesh(sg, keep(new THREE.MeshBasicMaterial({ map: keep(tex(sc.c)), transparent: true, depthWrite: false, opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    sh.position.y = 0.06; grp.add(sh);
    return { grp, bat, sh };
  });

  // ---------------------------------------------------------------- drop targets (invader faces) that sink when hit
  const dAtlas = keep(tex(dropsAtlas(), { aniso: ANISO }));
  const drops = E.DROPS.map((d, i) => {
    const len = Math.hypot(d.bx - d.ax, d.by - d.ay) + 1.6, th = 3.4;
    const g = keep(new THREE.BoxGeometry(len, H.drop, th));
    const uv = g.attributes.uv;
    for (let v = 0; v < uv.count; v++) {
      if (v >= 16 && v < 20) uv.setXY(v, (i * 64 + 1 + uv.getX(v) * 62) / 384, uv.getY(v));   // the front (+z) face: this target's invader
      else uv.setXY(v, (322 + uv.getX(v) * 60) / 384, uv.getY(v));
    }
    const mat = keep(new THREE.MeshStandardMaterial({ map: dAtlas, emissiveMap: dAtlas, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.05 }));
    const grp = new THREE.Group(); grp.position.set(wx((d.ax + d.bx) / 2 - d.fx * 0.4), 0, wz((d.ay + d.by) / 2 - d.fy * 0.4));
    grp.rotation.y = Math.atan2(-(d.by - d.ay), d.bx - d.ax);
    const m = R1(new THREE.Mesh(g, mat)); m.position.y = H.drop / 2; grp.add(m); table.add(grp);
    // the slot it sinks into
    const slot = new THREE.Mesh(keep(new THREE.PlaneGeometry(len + 0.6, th + 0.8)), M.black); slot.rotation.x = -Math.PI / 2; slot.position.y = 0.05; grp.add(slot);
    return { m, mat, down: 0 };
  });

  // ---------------------------------------------------------------- the saucer (the hangar's cup)
  (function () {
    const S = T.saucer, hc = cv(64, 64), g = hc.getContext('2d'), q = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    q.addColorStop(0, '#000000'); q.addColorStop(0.65, '#05030c'); q.addColorStop(0.85, '#2a2050'); q.addColorStop(1, 'rgba(40,30,80,0)');
    g.fillStyle = q; g.fillRect(0, 0, 64, 64);
    const hg = keep(new THREE.PlaneGeometry(22, 22)); hg.rotateX(-Math.PI / 2);
    const hole = new THREE.Mesh(hg, keep(new THREE.MeshBasicMaterial({ map: keep(tex(hc)), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    hole.position.set(wx(S.x), 0.07, wz(S.y)); table.add(hole);
    const rim = R1(new THREE.Mesh(keep(new THREE.TorusGeometry(9, 0.9, 12, 40)), M.chrome)); rim.rotation.x = Math.PI / 2; rim.position.set(wx(S.x), 0.4, wz(S.y)); table.add(rim);
  })();

  // ---------------------------------------------------------------- the spinner (across the left orbit), the gates
  const spinner = (function () {
    const L = T.sensors.lines.find((l) => l[0] === 'spin'); if (!L) return null;
    const y = L[2], x0 = L[1], x1 = L[3], hy = 15.5;
    const wire = new Geo(); sweep(wire, [[x0 - 1, y, hy], [x1 + 1, y, hy]], 0.55, 1.1, { bottom: -0.55 });
    posts.push([x0 - 1, y, hy + 1.2, 1.0], [x1 + 1, y, hy + 1.2, 1.0]);
    const wm = R1(new THREE.Mesh(keep(wire.geometry()), M.chrome)); table.add(wm);
    const grp = new THREE.Group(); grp.position.set(wx((x0 + x1) / 2), hy, wz(y)); table.add(grp);
    const plate = R1(new THREE.Mesh(keep(new THREE.BoxGeometry(x1 - x0 - 3, 10, 0.7)), keep(new THREE.MeshStandardMaterial({ map: keep(tex(cometCanvas())), roughness: 0.3, metalness: 0.4 }))));
    plate.position.y = -5.6; grp.add(plate);
    return grp;
  })();
  (function () {
    const g = new Geo(), f = new Geo();
    E.GATES.forEach((s) => {
      sweep(g, [[s.ax, s.ay, 11.5], [s.bx, s.by, 11.5]], 0.6, 1.2, { bottom: -0.6 });
      const mx = (s.ax + s.bx) / 2, my = (s.ay + s.by) / 2, dx = (s.bx - s.ax) * 0.44, dy = (s.by - s.ay) * 0.44;
      ribbon(f, [[mx - dx, my - dy, 0], [mx + dx, my + dy, 0]], 0, 3.2, 11.2);
    });
    table.add(R1(new THREE.Mesh(keep(g.geometry()), M.chrome)));
    table.add(R1(new THREE.Mesh(keep(f.geometry()), keep(new THREE.MeshStandardMaterial({ color: 0xb8c0d0, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide })))));
  })();

  // ---------------------------------------------------------------- the plunger: a chrome rod, a rubber tip, a spring, the housing
  const plunger = (function () {
    const S = T.shooter, grp = new THREE.Group(); table.add(grp);
    const rodG = cylinder(1.3, 1.3, 40, 16); rodG.rotateX(Math.PI / 2); rodG.translate(0, 0, 20);
    const rod = R1(new THREE.Mesh(rodG, M.chrome)); grp.add(rod);
    const tipG = cylinder(5.2, 5.2, 4.5, 24); tipG.rotateX(Math.PI / 2); tipG.translate(0, 0, 2.25);
    const tip = R1(new THREE.Mesh(tipG, M.rubberB)); grp.add(tip);
    const coil = []; for (let k = 0; k <= 240; k++) { const a = k / 240 * Math.PI * 2 * 9; coil.push(new THREE.Vector3(Math.cos(a) * 3.4, Math.sin(a) * 3.4, k / 240)); }
    const springG = keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 480, 0.55, 6, false));
    const spring = R1(new THREE.Mesh(springG, M.darkChrome)); grp.add(spring);
    const housingG = cylinder(5.5, 5.5, 10, 24); housingG.rotateX(Math.PI / 2);
    const housing = R1(new THREE.Mesh(housingG, M.chrome)); housing.position.set(wx(S.cx), 7, wz(TH - 2)); table.add(housing);
    return { grp, rod, tip, spring };
  })();

  // ---------------------------------------------------------------- posts (chrome, instanced) and the rubber rings on the rubber posts
  const postGeo = keep(new THREE.LatheGeometry([[0, 0], [1, 0], [1, 0.86], [0.8, 0.95], [0.45, 1], [0, 1.02]].map((q) => new THREE.Vector2(q[0], q[1])), 16));
  T.slings.forEach((s) => [s.a, s.b, s.c].forEach((p) => posts.push([p[0], p[1], H.post, 1.6])));
  E.POSTS.forEach((p) => posts.push([p.x, p.y, H.post, 1.3]));
  const postMesh = R1(new THREE.InstancedMesh(postGeo, M.chrome, posts.length));
  { const m = new THREE.Matrix4(); posts.forEach((p, i) => { m.makeScale(p[3], p[2], p[3]); m.setPosition(wx(p[0]), 0, wz(p[1])); postMesh.setMatrixAt(i, m); }); }
  table.add(postMesh);
  const ringGeo = keep(new THREE.TorusGeometry(1, 0.42, 10, 28)); ringGeo.rotateX(Math.PI / 2);
  const rings = R1(new THREE.InstancedMesh(ringGeo, M.rubberB, E.POSTS.length));
  { const m = new THREE.Matrix4(); E.POSTS.forEach((p, i) => { const r = p.r - 0.55; m.makeScale(r, r * 1.6, r); m.setPosition(wx(p.x), 6.5, wz(p.y)); rings.setMatrixAt(i, m); }); }
  table.add(rings);

  // ---------------------------------------------------------------- the balls (a pool), their contact shadows, the reflection camera
  const cubeRT = keep(new THREE.WebGLCubeRenderTarget(opts.reflectSize || 128, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }));
  const cubeCam = new THREE.CubeCamera(2, 2500, cubeRT); scene.add(cubeCam);
  cubeCam.children.forEach((c) => c.layers.set(1));
  const ballSky = keep(tex(ballSkyCanvas())); ballSky.mapping = THREE.EquirectangularReflectionMapping;
  const ballMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.05, envMap: cubeRT.texture, envMapIntensity: 1.3 }));
  const ballGeo = keep(new THREE.SphereGeometry(BR, 48, 32));
  const shGeo = keep(new THREE.PlaneGeometry(1, 1)); shGeo.rotateX(-Math.PI / 2);
  const balls = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(ballGeo, ballMat); m.visible = false; table.add(m);
    const s = new THREE.Mesh(shGeo, M.shadow); s.visible = false; s.renderOrder = 1; table.add(s);
    const s2 = new THREE.Mesh(shGeo, M.shadow); s2.visible = false; s2.renderOrder = 1; table.add(s2);
    balls.push({ m, s, s2 });
  }

  // ---------------------------------------------------------------- lights: high-key - a bright fill, a strong key light, warm GI along the sides, one flash
  const HEMI = 1.05;
  const hemi = R1(new THREE.HemisphereLight(0xe8ecff, 0x40304a, HEMI)); scene.add(hemi);
  const key = R1(new THREE.DirectionalLight(0xfff4e6, 2.6)); key.position.copy(KEY).multiplyScalar(600); table.add(key); table.add(key.target);
  const GI = [];
  [[14, 120], [14, 330], [256, 120], [256, 330], [135, 20], [135, 250]].forEach((p, i) => {
    const l = R1(new THREE.PointLight(i >= 4 ? 0xdde8ff : 0xffcf9a, i === 5 ? 1500 : i === 4 ? 2000 : 2100, 280, 2)); l.position.set(wx(p[0]), i === 5 ? 60 : 19, wz(p[1])); table.add(l); GI.push({ l, base: l.intensity });
  });
  const rim = R1(new THREE.DirectionalLight(0xff8ad8, 0.9)); rim.position.set(0, 90, -420); table.add(rim); table.add(rim.target);
  const flash = R1(new THREE.PointLight(0xffffff, 0, 140, 2)); flash.position.set(0, 18, 0); table.add(flash);
  let flashK = 0;

  // ---------------------------------------------------------------- lit inserts (the art lane's lamps), one batch
  let lamps = null;
  function buildLamps() {
    const PL = window.PinLamps, PA = window.PinArt;
    if (!PL || !PL.list || typeof PL.level !== 'function' || !PA || typeof PA.lampSprite !== 'function') return null;
    const list = PL.list, S = ART_SCALE, sprites = list.map((lp) => { try { return PA.lampSprite(lp, S); } catch (e) { return null; } });
    const AW = 2048; let x = 0, y = 0, rowH = 0; const slots = [];
    sprites.forEach((c) => {
      if (!c || !c.width) { slots.push(null); return; }
      if (x + c.width > AW) { x = 0; y += rowH + 2; rowH = 0; }
      slots.push({ x, y, w: c.width, h: c.height }); x += c.width + 2; rowH = Math.max(rowH, c.height);
    });
    let AH = 64; while (AH < y + rowH) AH *= 2;
    const atlas = cv(AW, AH), g = atlas.getContext('2d');
    sprites.forEach((c, i) => { if (slots[i]) g.drawImage(c, slots[i].x, slots[i].y); });
    const n = list.length, pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), colr = new Float32Array(n * 12), idx = [];
    list.forEach((lp, i) => {
      const sl = slots[i], c = sprites[i]; if (!sl) return;
      // the sprite's own centre (art lane: canvas.cx / cy in px, else the middle), size in table units, rotated with the lamp
      const w = c.width / S, h = c.height / S, cx = (c.cx != null ? c.cx : c.width / 2) / S, cy = (c.cy != null ? c.cy : c.height / 2) / S;
      const rot = c.rotated ? 0 : (lp.rot || 0), cs = Math.cos(rot), sn = Math.sin(rot);
      [[0, 0], [w, 0], [w, h], [0, h]].forEach((q, k) => {
        const u = q[0] - cx, v = q[1] - cy, X = lp.x + u * cs - v * sn, Y = lp.y + u * sn + v * cs;
        pos[i * 12 + k * 3] = wx(X); pos[i * 12 + k * 3 + 1] = 0.12; pos[i * 12 + k * 3 + 2] = wz(Y);
        uv[i * 8 + k * 2] = (sl.x + q[0] * S) / AW; uv[i * 8 + k * 2 + 1] = 1 - (sl.y + q[1] * S) / AH;
      });
      idx.push(i * 4, i * 4 + 2, i * 4 + 1, i * 4, i * 4 + 3, i * 4 + 2);
    });
    const geo = keep(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const ca = new THREE.BufferAttribute(colr, 3); ca.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('color', ca); geo.setIndex(idx);
    const at = keep(tex(atlas, { aniso: ANISO }));
    const mat = keep(new THREE.MeshBasicMaterial({ map: at, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    const mesh = R1(new THREE.Mesh(geo, mat)); mesh.renderOrder = 1; mesh.frustumCulled = false; table.add(mesh);
    return { list, mesh, ca, cur: new Float32Array(n), cool: new Float32Array(n), tg: new Float32Array(n), level: PL.level, byId: PL.byId || null };
  }
  lamps = buildLamps();
  const LAMP_GAIN = opts.lampGain || 2.4;
  function updateLamps(W, t, mode, dt, extra) {
    if (!lamps) { if (window.PinLamps && window.PinArt) lamps = buildLamps(); if (!lamps) return; }
    let lv = null; try { lv = lamps.level(W, t, mode); } catch (e) { lv = null; }
    const n = lamps.list.length, C = lamps.ca.array, snap = dt <= 0 || dt > 0.5, tgt = lamps.tg;
    for (let i = 0; i < n; i++) tgt[i] = lv ? lv[i] || 0 : 0;
    if (extra && lamps.byId) for (const id in extra) { const i = lamps.byId[id]; if (i != null) tgt[i] += +extra[id] || 0; }   // fx.js: on top
    const up = 1 - Math.exp(-dt / 0.028), dn = 1 - Math.exp(-dt / 0.11);
    for (let i = 0; i < n; i++) {
      const v = clamp(tgt[i], 0, 1.25); let c = lamps.cur[i];
      if (snap) { c = v; lamps.cool[i] = 0; }
      else if (v > c) { c += (v - c) * up; lamps.cool[i] = Math.max(0, lamps.cool[i] - dt * 8); }
      else { c += (v - c) * dn; lamps.cool[i] = Math.min(1, lamps.cool[i] + dt * 10); }
      lamps.cur[i] = c;
      const k = c * LAMP_GAIN, warm = lamps.cool[i] * (1 - c);   // a cooling bulb goes a little orange
      const r = k, g = k * (1 - 0.32 * warm), b = k * (1 - 0.6 * warm);
      for (let q = 0; q < 4; q++) { C[i * 12 + q * 3] = r; C[i * 12 + q * 3 + 1] = g; C[i * 12 + q * 3 + 2] = b; }
    }
    lamps.ca.needsUpdate = true;
  }

  // ---------------------------------------------------------------- effects (fx.js): score pop-ups, sparks, the ball trail
  const POP_N = 16, pops = [], popTex = new Map();
  for (let i = 0; i < POP_N; i++) {
    const mat = keep(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
    const sp = new THREE.Sprite(mat); sp.visible = false; sp.renderOrder = 20; table.add(sp); pops.push(sp);
  }
  function popTexture(text, col) {   // crisp text, cached (the most recent last; the oldest go)
    const k = text + '|' + col; let e = popTex.get(k);
    if (e) { popTex.delete(k); popTex.set(k, e); return e; }
    const c = popCanvas(text, col); e = { t: tex(c, { aniso: ANISO }), aspect: c.width / c.height };
    popTex.set(k, e);
    if (popTex.size > 40) { const old = popTex.keys().next().value; popTex.get(old).t.dispose(); popTex.delete(old); }
    return e;
  }
  const PT_N = 640, ptPos = new Float32Array(PT_N * 3), ptCol = new Float32Array(PT_N * 3), ptSize = new Float32Array(PT_N);
  const ptGeo = keep(new THREE.BufferGeometry());
  [['position', ptPos, 3], ['acol', ptCol, 3], ['size', ptSize, 1]].forEach(([k, a, n]) => { const b = new THREE.BufferAttribute(a, n); b.setUsage(THREE.DynamicDrawUsage); ptGeo.setAttribute(k, b); });
  ptGeo.setDrawRange(0, 0);
  const ptMat = keep(new THREE.ShaderMaterial({   // soft round glowing points, sized in table units, added on
    uniforms: { uScale: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float size; attribute vec3 acol; uniform float uScale; varying vec3 vC;\n'
      + 'void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.5, size * uScale / -mv.z); gl_Position = projectionMatrix * mv; vC = acol; }',
    fragmentShader: 'varying vec3 vC;\n'
      + 'void main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vC * exp(-r * 3.0) * (1.0 - r), 1.0); }'
  }));
  const points = new THREE.Points(ptGeo, ptMat); points.frustumCulled = false; points.renderOrder = 15; table.add(points);
  const trails = new Map(), tmpC = new THREE.Color();
  function drawFx(W, st) {
    let n = 0;
    const put = (x, y, z, col, a, size) => {
      if (n >= PT_N || !(a > 0.004)) return;
      tmpC.set(col); ptPos[n * 3] = wx(x); ptPos[n * 3 + 1] = z; ptPos[n * 3 + 2] = wz(y);
      ptCol[n * 3] = tmpC.r * a; ptCol[n * 3 + 1] = tmpC.g * a; ptCol[n * 3 + 2] = tmpC.b * a; ptSize[n] = size; n++;
    };
    // a short trail behind a fast ball (where it was over the last few frames)
    const seen = new Set();
    (W.balls || []).forEach((b) => {
      const z = (b.m === 'ramp' ? (b.z || 0) : 0) + BR + (b.m === 'held' ? -4 : 0);
      let h = trails.get(b.id); if (!h) { h = []; trails.set(b.id, h); } seen.add(b.id);
      h.unshift([b.x, b.y, z]); if (h.length > 8) h.length = 8;
      const sp = b.m === 'ramp' ? Math.abs(b.vs || 0) : Math.hypot(b.vx || 0, b.vy || 0), k = clamp((sp - 430) / 420, 0, 1);
      if (k <= 0 || b.m === 'held') return;
      for (let i = 0; i < h.length - 1; i++) for (let j = 0; j < 3; j++) {
        const A = h[i], B = h[i + 1], u = j / 3, x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u;
        if (Math.hypot(x - b.x, y - b.y) < BR * 1.1) continue;   // (not over the ball itself)
        const f = 1 - (i + u) / (h.length - 1);
        put(x, y, A[2] + (B[2] - A[2]) * u, '#a8ecff', 1.1 * k * f * f, BR * (0.7 + 1.3 * f));
      }
    });
    for (const id of trails.keys()) if (!seen.has(id)) trails.delete(id);
    // sparks: glowing points, bright enough to bloom
    if (st && st.sparks) for (let i = 0; i < st.sparks.length; i++) { const q = st.sparks[i]; if (q) put(q.x, q.y, q.z || 0, q.color || '#ffffff', (q.a == null ? 1 : q.a) * 2.4, q.size || 3); }
    ptGeo.setDrawRange(0, n);
    if (n) { ['position', 'acol', 'size'].forEach((k) => { ptGeo.attributes[k].needsUpdate = true; }); }
    ptMat.uniforms.uScale.value = RH * PR / (2 * Math.tan(camera.fov * DEG / 2));
    // score pop-ups: billboards over the table, never hidden
    let pi = 0;
    if (st && st.pops) for (let i = 0; i < st.pops.length && pi < POP_N; i++) {
      const p = st.pops[i]; if (!p || p.text == null || p.text === '' || (p.a != null && p.a <= 0.01)) continue;
      const sp = pops[pi++], e = popTexture(String(p.text), p.color || COL.bot);
      if (sp.material.map !== e.t) { if (!sp.material.map) sp.material.needsUpdate = true; sp.material.map = e.t; }
      sp.material.opacity = p.a == null ? 1 : clamp(p.a, 0, 1);
      const hh = 13 * (p.s == null ? 1 : p.s);
      sp.scale.set(hh * e.aspect, hh, 1); sp.position.set(wx(p.x), (p.z || 0) + 16, wz(p.y)); sp.visible = true;
    }
    for (; pi < POP_N; pi++) pops[pi].visible = false;
    return n;
  }

  // ---------------------------------------------------------------- the glow (bloom on the bright parts only), the size
  const samples = opts.samples != null ? opts.samples : 4;
  let RW = 0, RH = 0;
  const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(PR);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), opts.bloom != null ? opts.bloom : 0.62, 0.3, opts.threshold != null ? opts.threshold : 1.75);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let view = { tilt: FILL_TILT, fov: FILL_FOV, fill: true };
  const camBase = new THREE.Vector3(), camR = new THREE.Vector3(1, 0, 0), camU = new THREE.Vector3(0, 1, 0), fillBg = new THREE.Color(0x07060c);
  function resize(w, h) {
    RW = Math.max(16, w | 0); RH = Math.max(16, h | 0);
    renderer.setSize(RW, RH, false); composer.setSize(RW, RH);
    bloom.resolution.set(RW * PR / 2, RH * PR / 2);
    fit();
  }

  // ---------------------------------------------------------------- the camera: tilt from straight down, fitted to the whole cabinet
  const fitPts = [];
  [-3, 273].forEach((x) => [-6, 452].forEach((y) => [0, H.wood + 2].forEach((h) => fitPts.push([x, y, h]))));
  for (let s = 0; s <= E.RAMP.L; s += E.RAMP.L / 12) { const r = E.rampAt(s); fitPts.push([r.x, r.y, r.z + H.rampWall + 1]); }
  function fit() {
    const tilt = clamp(view.tilt, 0, 80) * DEG, fov = view.fov;
    camera.fov = fov; camera.aspect = RW / RH; camera.updateProjectionMatrix();
    table.updateMatrixWorld(true);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(table.matrixWorld));
    const F = new THREE.Vector3(0, -Math.cos(tilt), -Math.sin(tilt)).applyQuaternion(q);   // looking down and up the table
    const U = new THREE.Vector3(0, Math.sin(tilt), -Math.cos(tilt)).applyQuaternion(q);    // the far end is at the top
    const Rv = new THREE.Vector3().crossVectors(F, U);
    const margin = opts.margin != null ? opts.margin : 0.985, tV = Math.tan(fov * DEG / 2) * margin, tH = tV * camera.aspect;
    const P = fitPts.map((p) => { const v = new THREE.Vector3(wx(p[0]), p[2], wz(p[1])).applyMatrix4(table.matrixWorld); return [v.dot(Rv), v.dot(U), v.dot(F)]; });
    const fH = (s) => { let m = Infinity; for (const p of P) m = Math.min(m, p[2] - Math.abs(p[0] - s) / tH); return m; };
    const gV = (t) => { let m = Infinity; for (const p of P) m = Math.min(m, p[2] - Math.abs(p[1] - t) / tV); return m; };
    const tern = (f, a, b) => { for (let k = 0; k < 80; k++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (f(m1) < f(m2)) a = m1; else b = m2; } return (a + b) / 2; };
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    let s, t, w, Pn = P;
    if (view.fill) {
      // the fill framing: the top points on the top edge and the bottom points on the bottom edge (two straight-line
      // conditions on the camera's height t and depth w); then, if the must-see sides don't fit, back off until they
      // do, keeping the bottom edge where it is (the spare room goes above the arch)
      const B = (a) => a.map((p) => { const v = new THREE.Vector3(wx(p[0]), p[2], wz(p[1])).applyMatrix4(table.matrixWorld); return [v.dot(Rv), v.dot(U), v.dot(F)]; });
      const top = B(FILL.top), bot = B(FILL.bot), side = B(FILL.side); Pn = top.concat(bot, side);
      const tTop = (d) => Math.max(...top.map((p) => p[1] - tV * (p[2] - d))), tBot = (d) => Math.min(...bot.map((p) => p[1] + tV * (p[2] - d)));
      const sOf = (d) => { let lo = -2000, hi = 2000; for (let k = 0; k < 70; k++) { const m = (lo + hi) / 2, l = Math.max(...side.map((p) => (m - p[0]) / (p[2] - d))), r = Math.max(...side.map((p) => (p[0] - m) / (p[2] - d))); if (l > r) hi = m; else lo = m; } return (lo + hi) / 2; };
      const need = (d) => { const c = sOf(d); return Math.max(...side.map((p) => Math.abs(p[0] - c) / (p[2] - d))) / tH; };
      const wn = Math.min(...Pn.map((p) => p[2])) - 4;
      let a = wn - 8000, b = wn; for (let k = 0; k < 90; k++) { const m = (a + b) / 2; if (tTop(m) > tBot(m)) b = m; else a = m; } w = a;
      if (need(w) > 1) { let c = w - 8000, d = w; for (let k = 0; k < 90; k++) { const m = (c + d) / 2; if (need(m) > 1) d = m; else c = m; } w = c; }
      t = tBot(w); s = sOf(w);
    } else {
      s = tern(fH, Math.min(...xs), Math.max(...xs)); t = tern(gV, Math.min(...ys), Math.max(...ys));
      w = Math.min(fH(s), gV(t));
      // room to spare up and down: keep the table at the bottom (the sky beyond goes above it)
      if (gV(t) > w + 1e-6) { let a = t, b = t + 5000; for (let k = 0; k < 80; k++) { const m = (a + b) / 2; if (gV(m) >= w) a = m; else b = m; } t = a; }
      if (fH(s) > w + 1e-6) {   // spare room at the sides: centre it
        let a = s, b = s + 5000; for (let k = 0; k < 60; k++) { const m = (a + b) / 2; if (fH(m) >= w) a = m; else b = m; }
        let c = s, d = s - 5000; for (let k = 0; k < 60; k++) { const m = (c + d) / 2; if (fH(m) >= w) c = m; else d = m; }
        s = (a + c) / 2;
      }
    }
    const pos = new THREE.Vector3().addScaledVector(Rv, s).addScaledVector(U, t).addScaledVector(F, w);
    camera.position.copy(pos); camera.up.copy(U); camera.lookAt(pos.clone().add(F));
    camBase.copy(pos); camR.copy(Rv); camU.copy(U);
    camera.near = Math.max(1, (Math.min(...Pn.map((p) => p[2])) - w) * 0.5); camera.far = (Math.max(...Pn.map((p) => p[2])) - w) * 3 + 3000;
    camera.updateProjectionMatrix();
    backbox.visible = !!view.fill;
    if (view.fill) { if (skyTex) { skyTex.dispose(); skyTex = null; skyKey = ''; } scene.background = fillBg; }   // (nothing of the sky shows: just in case, the cabinet's dark)
    else paintSky();
  }
  function setView(v) { view = Object.assign({}, view, v || {}); view.fill = !!view.fill; fit(); }

  // ---------------------------------------------------------------- every frame
  let lastT = null, reflectN = 0, giNow = 1, fxPts = 0;
  const tmpV = new THREE.Vector3(), KEY_I = key.intensity;
  function draw(W, t, mode, info) {
    if (!W) return;
    const dt = lastT == null ? 0 : clamp((t - lastT) / 1000, 0, 1); lastT = t;
    const play = mode !== 'title', dark = !!(W.tilted || W.over), lit = W.lit || {};
    // the effects lane (fx.js): its state for this frame
    let st = null;
    if (window.PinFX) { try { if (typeof PinFX.update === 'function') PinFX.update(W, t, mode); st = PinFX.state || null; } catch (e) { st = null; } }
    renderer.info.reset();
    // flippers
    for (let i = 0; i < flippers.length && i < W.flippers.length; i++) flippers[i].grp.rotation.y = -W.flippers[i].a;
    // GI: down when the table is tilted, like a real machine, and as fx.js says (a light show dims it so its flashes
    // stand out); the whole-table flash lifts the fill light and the exposure
    const giT = (dark && play ? 0.25 : 1) * clamp(st && st.gi != null ? +st.gi : 1, 0, 1.5);
    giNow += (giT - giNow) * (dt > 0 ? 1 - Math.exp(-dt / 0.07) : 1);
    GI.forEach((g) => { g.l.intensity = g.base * giNow; });
    const fl = clamp(st && st.flash ? +st.flash : 0, 0, 1);
    hemi.intensity = HEMI * (0.3 + 0.7 * giNow) + 2.4 * fl; key.intensity = KEY_I * (0.4 + 0.6 * giNow);
    liftU.value = LIFT * (0.3 + 0.7 * giNow); renderer.toneMappingExposure = EXPOSURE * (1 + 0.3 * fl);
    // a small shake: the camera moves, never the table
    const sk = st && st.shake, sx = sk ? clamp(+sk.x || 0, -1.5, 1.5) : 0, sy = sk ? clamp(+sk.y || 0, -1.5, 1.5) : 0;
    camera.position.copy(camBase).addScaledVector(camR, sx).addScaledVector(camU, sy);
    // pop bumpers: the ring snaps down, the skirt and cap flash
    E.BUMPERS.forEach((B, i) => {
      const bp = bumpers[i], v = lit.bump ? lit.bump[i] : 0;
      if (v >= 7 && bp.hit < 0.5) { flashK = 1; flash.color.copy(bp.col); flash.position.set(wx(B.x), 24, wz(B.y)); }
      bp.hit = v > 0 ? 1 : Math.max(0, bp.hit - dt * 7);
      const idle = play ? (dark ? 0.15 : 0.75 + 0.25 * Math.sin(t / 300 + i * 2.1)) : 0.6 + 0.6 * Math.max(0, Math.sin(t / 240 - i * 2.1));
      bp.ring.position.y = 11 - 4.4 * (v > 0 ? 1 : bp.hit);
      bp.skirtMat.emissiveIntensity = idle * 0.9 + bp.hit * 5;
      bp.sideMat.emissiveIntensity = idle + bp.hit * 4;
      bp.topMat.emissiveIntensity = 0.45 * idle + bp.hit * 2.2;
    });
    // slingshots
    slings.forEach((s, i) => {
      const v = lit.sling ? lit.sling[i] : 0;
      if (v >= 9 && s.flash < 0.5) { flashK = Math.max(flashK, 0.8); flash.color.set(i ? COL.moth : COL.orb); const sl = T.slings[i]; flash.position.set(wx((sl.a[0] + sl.c[0]) / 2), 18, wz((sl.a[1] + sl.c[1]) / 2)); }
      s.flash = v > 0 ? 1 : Math.max(0, s.flash - dt * 6);
      s.mat.emissiveIntensity = (dark ? 0.12 : 0.55) + s.flash * 2.6;
      s.rubber.scale.setScalar(1);
    });
    flashK = Math.max(0, flashK - dt * 5); flash.intensity = flashK * 9000;
    // drop targets sink fast, rise slower; a hit one flashes
    drops.forEach((d, i) => {
      const down = W.drops && !W.drops[i] ? 1 : 0;
      d.down += (down - d.down) * (dt > 0 ? 1 - Math.exp(-dt / (down ? 0.03 : 0.07)) : 1);
      d.m.position.y = H.drop / 2 - d.down * (H.drop + 0.5);
      d.m.visible = d.down < 0.98;
      d.mat.emissiveIntensity = 0.28 + (lit.drop && lit.drop[i] > 0 ? 2.5 : 0);
    });
    // spinner, plunger
    if (spinner) spinner.rotation.x = -(W.spin ? W.spin.a : 0) * Math.PI * 2;
    const S = T.shooter, tipY = S.tip + (W.plunger ? W.plunger.pull : 0) * S.travel;
    plunger.tip.position.set(wx(S.cx), BR, wz(tipY)); plunger.rod.position.set(wx(S.cx), BR, wz(tipY));
    plunger.spring.position.set(wx(S.cx), BR, wz(tipY + 4.5)); plunger.spring.scale.set(1, 1, Math.max(1, TH - 4 - tipY - 4.5));
    // the ramp's LEDs: brighter when the ramp has just been made, a chase while a combo is open
    const rl = lit.ramp > 0 ? 3.2 : W.comboT > 0 ? 1.6 + Math.sin(t / 60) * 0.8 : !play ? 1.2 + Math.sin(t / 200) * 0.6 : 1.0;
    ledMat.color.set(COL.moth).multiplyScalar(dark ? 0.2 : rl);
    // balls
    let first = null;
    for (let i = 0; i < balls.length; i++) {
      const b = W.balls && W.balls[i], B = balls[i];
      if (!b) { B.m.visible = B.s.visible = B.s2.visible = false; continue; }
      const z = b.m === 'ramp' ? (b.z || 0) : 0, sunk = b.m === 'held' ? -4 : 0, cy = BR + z + sunk;
      B.m.position.set(wx(b.x), cy, wz(b.y)); B.m.visible = true;
      // the shadow where the ball rests (the ramp's floor, or the playfield), and a faint one far below a ball on the ramp
      const sz = 15 + z * 0.05;
      B.s.position.set(wx(b.x + SHX * BR * 0.6), z + 0.45 + (z > 0 ? 0.1 : 0), wz(b.y + SHY * BR * 0.6)); B.s.scale.set(sz, 1, sz * 1.15); B.s.visible = b.m !== 'held';
      if (z > 2) { B.s2.position.set(wx(b.x + SHX * cy), 0.1, wz(b.y + SHY * cy)); B.s2.scale.set(18 + z * 0.3, 1, 18 + z * 0.3); B.s2.material = M.shadow; B.s2.visible = true; } else B.s2.visible = false;
      if (!first) first = B.m;
    }
    updateLamps(W, t, mode, dt, st && st.lamps);
    fxPts = drawFx(W, st);
    // the ball's reflection: the table round it, from where it is
    if (first && opts.reflect !== false && (reflectN++ % Math.max(1, opts.reflectEvery || 1)) === 0) {   // (reflectEvery 2-3 on phones: the costliest pass)
      first.getWorldPosition(tmpV); cubeCam.position.copy(tmpV);
      const bg = scene.background; scene.background = ballSky;   // (the ball sees the lit cabinet above it, not the black of space)
      balls.forEach((B) => { B.m.visible = false; });
      cubeCam.update(renderer, scene);
      scene.background = bg;
      for (let i = 0; i < balls.length; i++) balls[i].m.visible = !!(W.balls && W.balls[i]);
    }
    composer.render();
  }

  // ---------------------------------------------------------------- set up, compile, measure
  resize(opts.width || canvasEl.width || 360, opts.height || canvasEl.height || 640);
  { const fill = opts.fill !== false; setView({ fill, tilt: opts.tilt != null ? opts.tilt : fill ? FILL_TILT : 35, fov: opts.fov || (fill ? FILL_FOV : 34) }); }
  renderer.compile(scene, camera);
  const buildMs = Math.round(performance.now() - t0);

  function stats() {
    return { buildMs, artMs, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, art: artSource, lamps: lamps ? lamps.list.length : 0, size: [RW * PR, RH * PR], view, fx: !!window.PinFX, fxPoints: fxPts, pops: pops.filter((p) => p.visible).length };
  }
  function dispose() {
    disposables.forEach((d) => { try { d.dispose(); } catch (e) {} }); if (skyTex) skyTex.dispose();
    composer.dispose && composer.dispose(); rt.dispose(); renderer.dispose();
  }
  const api = { draw, setView, resize, dispose, stats, debug: { scene, camera, table, renderer, THREE, occluders: () => occluders() } };
  function occluders() {   // what can hide the ball (for the visibility check): everything solid
    const out = [];
    table.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.visible && !(o.material && (o.material.transparent || o.material === M.shadow)) && !balls.some((B) => B.m === o)) out.push(o); });
    return out;
  }
  return api;
}

window.Pin3D = { create };
