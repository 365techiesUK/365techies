/* 365 Pinball Hero - the 3D look (milestone 2a, 15 Oct 2026; NG fast track, 16 Oct 2026: any table, Ember Peak's island).
 * ANY TABLE FROM ITS DATA: the table the world is playing (W.tableId: the old space table "orbit", or Ember Peak) is
 * built from PinEngine.table(id) - walls, arch, posts, bumpers, slings, every flipper, drops, gates, the ramp, the
 * plunger - and rebuilt if a world on another table comes along. It ONLY READS the world: flat and 3D are always the
 * same game.
 *
 * EMBER PEAK (tables/ember.js) adds its toys, all read from W.toys: the VOLCANO (a black-rock cone that rises with
 * W.toys.volcano.rise, smokes, glows at the crater, lava veins brightening with pressure; a held ball sits in the
 * crater's lava; at the launch a lava fountain), the chrome WIRE RAIL (from the crater's carry path, from its railAt
 * step to the inlane), the STEAM GEYSER (a hot-spring vent and a column of steam puffs: wisps, a warning puff, the
 * burst), the MAGMA CRABS (jointed parts: a shell with a glowing back, six legs that step as it walks, claws, eye
 * stalks), the LAVA GATES (they rise to open the lava lanes, whose lava flows brighter), FUMAROLE bumpers, OBSIDIAN
 * drop targets and the summit deck. Beyond the cabinet: blue sky, a turquoise sea, the island's rock and a few
 * islands on the horizon (baked, a handful of draw calls), so a moving camera shows a world.
 *
 * Coordinates: table x 0..W left to right, y 0..H from the arch DOWN to the flippers, heights in the same units (the
 * ball's radius is 7). 3D: X = x - W/2, Z = y - H/2 (+Z towards the player), Y = height. The cabinet frame is pitched
 * 6.5 degrees, far end up. Inside it, the table group carries the TABLE MOVEMENT (PinFX.state.table = { pitch, roll,
 * dy, shake }: degrees / table units, picture only, pivoting about the point the camera looks at).
 *
 * THE CAMERA: when window.PinCam exists, each frame PinCam.frame(PinCam.update(W, t, mode), aspect) places it. Accepted
 * results, in table units (x, y down the table, z up off the playfield): { eye: [x, y, z], look: [x, y, z], fov?, roll? }
 * (also eye/pos/position/from and look/at/target/lookAt, arrays or {x, y, z}), or a pose { aim: [x, y, z?], zoom,
 * pitch?, yaw? } (pitch in degrees from straight down; zoom by moving closer, the lens stays). Anything else, or no
 * PinCam: the home framing (the whole table: arch at the top edge, the front rail at the bottom). world.homes() gives
 * the home framings (whole table, and each storey) in the same table units, for a director to start from.
 *
 * EFFECTS: window.PinFX.state is drawn (gi, flash, shake, pops, sparks, lamps; table movement); on Ember Peak a dip
 * of the GI is an ash cloud over the sun. Spectacle add-ons when present: PinParticles.attach(THREE, scene, units,
 * tier) once (units: a group whose LOCAL coordinates are table units - x right, y down the table, z up - inside the
 * moving table) and .update(dt) each frame; PinPost.pass(THREE, renderer) goes into the composer before the output
 * pass, and PinPost.update(t, PinFX.state) each frame.
 *
 * QUALITY TIERS: high (PC default) / medium (phone default: pixel ratio at most 1.5, 2x multisampling, smaller bloom,
 * the ball's reflection every third frame, no clear coat) / low (pixel ratio 1, no multisampling, no bloom, a fixed
 * reflection). 'auto' (the default) steps down when frames run late and back up after a long steady spell, with a
 * lock-out that doubles each time a step up fails. Phones never go above pixel ratio 2.
 *
 * create({ canvas, width, height, pixelRatio? (the cap), tier? ('auto'|'high'|'medium'|'low'), table?, samples?,
 *   preserve?, reflect?, fill?, tilt?, fov?, cam? ('home' to ignore PinCam) })
 * -> { draw(W, t, mode, info), setView(v), setCam(c), setTier(name), homes(), resize(w, h), dispose(), stats(), debug } */
import * as THREE from 'three';
import { EffectComposer } from '../common/vendor/three-r185/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../common/vendor/three-r185/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../common/vendor/three-r185/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../common/vendor/three-r185/addons/postprocessing/OutputPass.js';

const E = window.PinEngine;
const DEG = Math.PI / 180, PITCH = 6.5 * DEG;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// the table being built: its half width and the y at its middle (3D X = x - HW, Z = y - ZC)
let HW = 135, ZC = 223;
const wx = (x) => x - HW, wz = (y) => y - ZC;
// the key light, table-local: from above, in front and a little left. Shadows (baked and live) fall the same way.
const KEY = new THREE.Vector3(-60, 400, 230).normalize();
const SHX = -KEY.x / KEY.y, SHY = -KEY.z / KEY.y;
// heights (table units) - everything stands up
const H = { rail: 18, guide: 13, arch: 21, wood: 30, front: 22, bumpCap: 26, drop: 17, apron: 6, sling: 16, rampWall: 16, post: 19, void: 12, gate: 13 };
const WOOD_L = -36, WOOD_R = 308;
const FOV = 32, HOME_TILT = 28;
// 365 Invaders' pixel invaders (ours), for the old space table
const ART = {
  orb: ['....####....', '..########..', '.##..##..##.', '.##########.', '..########..', '...#....#...', '..#..##..#..', '.#........#.'],
  moth: ['##........##', '.##..##..##.', '..########..', '.##.####.##.', '############', '#..######..#', '...#....#...', '..#......#..'],
  bot: ['..#......#..', '...######...', '..#.####.#..', '..########..', '#.##.##.##.#', '#..######..#', '...#....#...', '..##....##..']
};
// each table's look
const THEMES = {
  orbit: {
    world: 'space', exposure: 1.12, cabinet: 'wood',
    bump: [{ c: '#ff5cc8', art: 'orb' }, { c: '#3fe0ff', art: 'moth' }, { c: '#ffd84a', art: 'bot' }],
    sling: ['#ff5cc8', '#3fe0ff'], slingArt: ['orb', 'moth'], ramp: 0x8fd8ff, rampWall: '#3fe0ff', led: '#3fe0ff',
    drops: { order: ['orb', 'moth', 'bot', 'moth', 'orb'], col: { orb: '#ff5cc8', moth: '#3fe0ff', bot: '#ffd84a' } }
  },
  ember: {
    world: 'island', exposure: 1.04, cabinet: 'lacquer',
    bump: [{ c: '#ff7a1a', art: 'vent' }, { c: '#ffb21a', art: 'vent' }, { c: '#ff5a2a', art: 'vent' }],
    sling: ['#ff8a1a', '#ff8a1a'], slingArt: [null, null], ramp: 0xffc890, rampWall: '#ff9a2e', led: '#ffae3a',
    lava: '#ff6a1a', steam: '#f4f8ff', sea: '#29d3d6'
  }
};

// ---------------------------------------------------------------- small helpers
function cv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function rnd(seed) { let a = seed | 0 || 1; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
function tex(c, o) {
  o = o || {};
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (o.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (o.wrapS) t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = o.aniso || 4;
  return t;
}
function invader(g, rows, x, y, k, col) { g.fillStyle = col; for (let r = 0; r < rows.length; r++) for (let q = 0; q < rows[r].length; q++) if (rows[r].charAt(q) === '#') g.fillRect(x + q * k, y + r * k, k, k); }
function isPhone() { try { return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 1 && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)); } catch (e) { return false; } }
function v3(p) {   // [x, y, z] or {x, y, z} -> [x, y, z]
  if (!p) return null;
  if (Array.isArray(p)) return [+p[0] || 0, +p[1] || 0, +p[2] || 0];
  if (typeof p === 'object' && p.x != null) return [+p.x || 0, +p.y || 0, +p.z || 0];
  return null;
}

// one mesh's worth of triangles, built by hand (positions, normals, uvs); tri() orders each triangle so its face agrees
// with its vertex normals, so nothing comes out inside-out
class Geo {
  constructor() { this.p = []; this.n = []; this.u = []; this.i = []; this.c = null; }
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
    if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
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
// a round wire along a 3D path of table points [x, y, z]: a tube of radius r (sides sides)
function wire(G, pts, r, sides) {
  sides = sides || 6;
  const n = pts.length, rings = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], q0 = pts[Math.max(0, i - 1)], q1 = pts[Math.min(n - 1, i + 1)];
    const t = new THREE.Vector3(wx(q1[0]) - wx(q0[0]), q1[2] - q0[2], wz(q1[1]) - wz(q0[1])).normalize();
    let a = new THREE.Vector3(0, 1, 0); if (Math.abs(t.dot(a)) > 0.9) a.set(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(t, a).normalize(), w = new THREE.Vector3().crossVectors(t, u).normalize(), ring = [];
    for (let k = 0; k < sides; k++) {
      const an = k / sides * Math.PI * 2, nx = u.x * Math.cos(an) + w.x * Math.sin(an), ny = u.y * Math.cos(an) + w.y * Math.sin(an), nz = u.z * Math.cos(an) + w.z * Math.sin(an);
      ring.push(G.v(wx(p[0]) + nx * r, p[2] + ny * r, wz(p[1]) + nz * r, nx, ny, nz, k / sides, i / n));
    }
    rings.push(ring);
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) G.quad(rings[i][k], rings[i + 1][k], rings[i + 1][(k + 1) % sides], rings[i][(k + 1) % sides]);
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
// a flat shape in table units [[x, y], ...] extruded up from y0 by depth (ExtrudeGeometry, turned so it stands up),
// placed in the table (X = x - HW, Z = y - ZC)
function extrude(pts, y0, depth, bevel, holes) {
  const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], -p[1])));
  (holes || []).forEach((hp) => sh.holes.push(new THREE.Path(hp.map((p) => new THREE.Vector2(p[0], -p[1])))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: depth, bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 2, curveSegments: 16 });
  g.rotateX(-Math.PI / 2); g.translate(-HW, y0, -ZC);
  return g;
}
function planarUV(g, x0, y0, x1, y1) {   // uv from the table position (x0..x1, y0..y1 -> 0..1, v up)
  const P = g.attributes.position, uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { uv[i * 2] = (P.getX(i) + HW - x0) / (x1 - x0); uv[i * 2 + 1] = 1 - (P.getZ(i) + ZC - y0) / (y1 - y0); }
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
// a segment's matrix for a unit cylinder (radius 1, from y 0 to y 1): from A to B (3D points), radius r
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function segMatrix(m, ax, ay, az, bx, by, bz, r) {
  _d.set(bx - ax, by - ay, bz - az); const len = _d.length() || 1e-3; _d.multiplyScalar(1 / len);
  _q.setFromUnitVectors(_up, _d); _s.set(r, len, r); _p.set(ax, ay, az);
  return m.compose(_p, _q, _s);
}

// ---------------------------------------------------------------- canvases painted once
function noiseCanvas(w, h, seed, cells) {   // smooth value noise, small, for scaling up
  const c = cv(w, h), g = c.getContext('2d'), d = g.createImageData(w, h), r = rnd(seed), N = cells || 8, grid = [];
  for (let i = 0; i <= N; i++) { grid.push([]); for (let j = 0; j <= N; j++) grid[i].push(r()); }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = i / w * N, y = j / h * N, xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = grid[yi % (N + 1)][xi % (N + 1)], b = grid[yi % (N + 1)][(xi + 1) % (N + 1)], cc = grid[(yi + 1) % (N + 1)][xi % (N + 1)], dd = grid[(yi + 1) % (N + 1)][(xi + 1) % (N + 1)];
    const val = (a + (b - a) * u + (cc - a) * v + (a - b - cc + dd) * u * v) * 255, k = (j * w + i) * 4;
    d.data[k] = d.data[k + 1] = d.data[k + 2] = val; d.data[k + 3] = 255;
  }
  g.putImageData(d, 0, 0); return c;
}
function standInArt(T, S) {   // used only until the art lane's art3d.js is on the page
  const TW = T.W, TH = T.H, c = cv(TW * S, TH * S), g = c.getContext('2d'), r = rnd(11);
  g.scale(S, S);
  const gr = g.createLinearGradient(0, 0, 0, TH); gr.addColorStop(0, '#070a24'); gr.addColorStop(0.55, '#0d0b2c'); gr.addColorStop(1, '#170a2c');
  g.fillStyle = gr; g.fillRect(0, 0, TW, TH);
  for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(220,230,255,' + (0.25 + r() * 0.6) + ')'; const s = r() < 0.08 ? 0.9 : 0.45; g.fillRect(r() * TW, r() * TH, s, s); }
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
function lacquerCanvas() {   // Ember Peak's cabinet: glossy ocean-blue lacquer with waves and a gold pinstripe
  const c = cv(512, 256), g = c.getContext('2d'), r = rnd(9);
  const q = g.createLinearGradient(0, 0, 0, 256); q.addColorStop(0, '#0b3c8c'); q.addColorStop(1, '#082c6c');
  g.fillStyle = q; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 9; i++) {
    const y0 = 20 + i * 27 + r() * 6; g.strokeStyle = i % 3 ? 'rgba(80,190,255,0.14)' : 'rgba(255,255,255,0.1)'; g.lineWidth = 3 + r() * 4; g.beginPath();
    for (let x = 0; x <= 512; x += 8) { const yy = y0 + Math.sin(x / 40 + i * 1.7) * 6; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); }
    g.stroke();
  }
  g.fillStyle = '#ffd36a'; g.fillRect(0, 6, 512, 3); g.fillRect(0, 247, 512, 3);
  return c;
}
function skyCanvas(w, h, hy, hx0, hx1) {   // the old table's space beyond its far end
  const c = cv(w, h), g = c.getContext('2d'), r = rnd(23), Y = hy * h;
  const gr = g.createLinearGradient(0, 0, 0, Y); gr.addColorStop(0, '#010106'); gr.addColorStop(0.6, '#070618'); gr.addColorStop(1, '#1a0c34');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const blob = (x, y, rx, ry, col, a) => { g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.scale(1, ry / rx); const q = g.createRadialGradient(0, 0, 0, 0, 0, rx); q.addColorStop(0, rgba(col, a)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); };
  blob(w * 0.15, Y * 0.3, w * 0.45, w * 0.3, '#5a2a9a', 0.32); blob(w * 0.88, Y * 0.5, w * 0.4, w * 0.28, '#1f86c9', 0.26);
  for (let i = 0; i < 900; i++) { const b = r(); g.fillStyle = 'rgba(220,230,255,' + (0.25 + b * 0.75) + ')'; const s = b > 0.97 ? 1.8 : b > 0.85 ? 1.2 : 0.7; g.fillRect(r() * w, r() * h, s, s); }
  blob((hx0 + hx1) / 2 * w, Y, (hx1 - hx0) * w * 0.75, w * 0.16, '#ff5cc8', 0.30);
  return c;
}
function ballSkyCanvas() {   // what a ball sees above the old table (equirectangular): the lit cabinet, the glass, the bulbs
  const w = 512, h = 256, c = cv(w, h), g = c.getContext('2d');
  const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, '#d9dce6'); q.addColorStop(0.3, '#8d93a6'); q.addColorStop(0.48, '#3a3550'); q.addColorStop(0.52, '#151020'); q.addColorStop(1, '#080610');
  g.fillStyle = q; g.fillRect(0, 0, w, h);
  const spot = (x, y, rx, ry, col, a) => { g.save(); g.translate(x, y); g.scale(1, ry / rx); const r = g.createRadialGradient(0, 0, 0, 0, 0, rx); r.addColorStop(0, rgba(col, a)); r.addColorStop(1, rgba(col, 0)); g.fillStyle = r; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); };
  g.fillStyle = '#ffffff'; g.fillRect(0, 6, w, 10);
  for (let i = 0; i < 8; i++) spot(i * 64 + 32, h * 0.42, 22, 10, '#ffc890', 0.9);
  spot(w * 0.25, h * 0.36, 70, 22, '#ff5cc8', 0.45); spot(w * 0.75, h * 0.36, 70, 22, '#3fe0ff', 0.45);
  return c;
}
// Ember Peak's sky all round (equirectangular, top half sky, bottom half sea): deep blue overhead to a pale horizon,
// the sun, fair-weather clouds, islands on the horizon (one of them a far volcano), the turquoise sea below
function islandSkyCanvas(w, h) {
  const c = cv(w, h), g = c.getContext('2d'), r = rnd(31), HZ = h * 0.5;
  const q = g.createLinearGradient(0, 0, 0, HZ); q.addColorStop(0, '#0d4fd6'); q.addColorStop(0.45, '#2f8cf2'); q.addColorStop(0.85, '#8fd0ff'); q.addColorStop(1, '#e4f6ff');
  g.fillStyle = q; g.fillRect(0, 0, w, HZ);
  const s = g.createLinearGradient(0, HZ, 0, h); s.addColorStop(0, '#bfeef2'); s.addColorStop(0.06, '#35c9d4'); s.addColorStop(0.4, '#0f8fc0'); s.addColorStop(1, '#0a5e96');
  g.fillStyle = s; g.fillRect(0, HZ, w, h - HZ);
  const blob = (x, y, rx, ry, col, a, op) => { g.save(); g.globalCompositeOperation = op || 'source-over'; g.translate(x, y); g.scale(1, ry / rx); const qq = g.createRadialGradient(0, 0, 0, 0, 0, rx); qq.addColorStop(0, rgba(col, a)); qq.addColorStop(1, rgba(col, 0)); g.fillStyle = qq; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); };
  // the sun (high, in front and to the left, where the key light comes from) and its glow
  const sx = w * 0.62, sy = h * 0.16;
  blob(sx, sy, w * 0.12, w * 0.12, '#fff6d8', 0.55, 'lighter'); blob(sx, sy, w * 0.03, w * 0.03, '#ffffff', 1, 'lighter');
  // clouds: soft puffs in rows near the horizon, fewer higher up
  for (let i = 0; i < 70; i++) {
    const x = r() * w, y = HZ - 6 - Math.pow(r(), 1.8) * HZ * 0.55, cw = w * (0.015 + r() * 0.035);
    for (let k = 0; k < 6; k++) blob(x + (r() - 0.5) * cw * 3, y + (r() - 0.5) * cw * 0.5, cw * (0.6 + r() * 0.6), cw * (0.35 + r() * 0.25), '#ffffff', 0.5 + r() * 0.3);
    blob(x, y + cw * 0.35, cw * 2, cw * 0.4, '#9fb8d8', 0.18);
  }
  // islands on the horizon: low green humps, and a far volcano with a wisp of smoke
  const isle = (x, wd, ht, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x - wd, HZ + 1); for (let k = 0; k <= 20; k++) { const u = k / 20, yy = HZ - Math.sin(u * Math.PI) * ht * (0.8 + 0.2 * Math.sin(u * 17 + x)); g.lineTo(x - wd + u * wd * 2, yy); } g.lineTo(x + wd, HZ + 1); g.closePath(); g.fill(); };
  isle(w * 0.18, w * 0.05, h * 0.012, '#5c8f86'); isle(w * 0.35, w * 0.025, h * 0.008, '#6f9e95'); isle(w * 0.84, w * 0.06, h * 0.014, '#58897f');
  g.fillStyle = '#5a6a78'; g.beginPath(); g.moveTo(w * 0.04, HZ + 1); g.lineTo(w * 0.085, HZ - h * 0.035); g.lineTo(w * 0.095, HZ - h * 0.035); g.lineTo(w * 0.14, HZ + 1); g.closePath(); g.fill();
  for (let k = 0; k < 8; k++) blob(w * 0.09 + k * w * 0.006, HZ - h * 0.04 - k * h * 0.012, w * 0.012 + k * w * 0.002, w * 0.008, '#e8eef4', 0.5);
  // the sea's sparkle under the sun and a few wave lines
  for (let i = 0; i < 900; i++) { const y = HZ + Math.pow(r(), 2) * (h - HZ), x = sx + (r() - 0.5) * w * 0.25 * (1 + (y - HZ) / h); g.fillStyle = 'rgba(255,255,255,' + (0.25 + r() * 0.6) + ')'; g.fillRect(x, y, 1 + r() * 2, 1); }
  return c;
}
function seaCanvas(n) {   // the sea under and round the island, seen from above: shallows to deep, a sparkle, then haze
  const c = cv(n, n), g = c.getContext('2d'), r = rnd(37), m = n / 2;
  const q = g.createRadialGradient(m, m, 0, m, m, m);
  q.addColorStop(0, '#5fe8e0'); q.addColorStop(0.06, '#2fd6d8'); q.addColorStop(0.16, '#13b4cf'); q.addColorStop(0.35, '#0b86bd'); q.addColorStop(0.7, '#1a78bf'); q.addColorStop(0.92, '#8ccbea'); q.addColorStop(1, '#d6f0fb');
  g.fillStyle = q; g.fillRect(0, 0, n, n);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2600; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * m * 0.9, x = m + Math.cos(a) * d, y = m + Math.sin(a) * d, l = 2 + r() * 7;
    g.strokeStyle = 'rgba(200,255,255,' + (0.05 + r() * 0.12) * (1 - d / m) + ')'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + l * 0.2); g.stroke();
  }
  return c;
}
function blobCanvas(n, a) {   // a soft round shadow
  const c = cv(n, n), g = c.getContext('2d'), q = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  q.addColorStop(0, 'rgba(0,0,0,' + a + ')'); q.addColorStop(0.45, 'rgba(0,0,0,' + a * 0.6 + ')'); q.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = q; g.fillRect(0, 0, n, n); return c;
}
function capCanvas(col, art) {   // a pop bumper's cap: the invader in white on its colour; or a fumarole's glowing vent
  const c = cv(128, 128), g = c.getContext('2d');
  if (art === 'vent') {
    const q = g.createRadialGradient(64, 64, 4, 64, 64, 64); q.addColorStop(0, '#fff2b0'); q.addColorStop(0.18, '#ffb02a'); q.addColorStop(0.32, col); q.addColorStop(0.5, '#3a1608'); q.addColorStop(1, '#14100e');
    g.fillStyle = q; g.fillRect(0, 0, 128, 128);
    const r = rnd(col.length * 7 + col.charCodeAt(2));
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      let a = i / 9 * Math.PI * 2 + r() * 0.4, x = 64 + Math.cos(a) * 18, y = 64 + Math.sin(a) * 18;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { a += (r() - 0.5) * 0.7; x += Math.cos(a) * 8; y += Math.sin(a) * 8; g.lineTo(x, y); }
      g.strokeStyle = rgba('#ffb02a', 0.85); g.lineWidth = 3.2 - i * 0.1; g.shadowColor = '#ff7a1a'; g.shadowBlur = 8; g.stroke();
    }
    g.shadowBlur = 0; g.strokeStyle = 'rgba(255,220,160,0.6)'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.stroke();
    return c;
  }
  const q = g.createRadialGradient(64, 54, 6, 64, 64, 64);
  q.addColorStop(0, rgba(col, 1)); q.addColorStop(0.7, col); q.addColorStop(1, '#1a0a20');
  g.fillStyle = q; g.fillRect(0, 0, 128, 128);
  g.globalAlpha = 0.92; invader(g, ART[art], 64 - 6 * 6, 64 - 4 * 6, 6, '#14082a'); g.globalAlpha = 1;
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.stroke();
  return c;
}
function dropsAtlas(theme) {   // five target faces side by side, then a plain strip for the blocks' other faces
  const c = cv(64 * 6, 64), g = c.getContext('2d');
  for (let i = 0; i < 5; i++) {
    const x = i * 64;
    if (!theme.drops) {   // obsidian: black glass, a glowing shard, a bright edge
      const q = g.createLinearGradient(x, 0, x + 64, 64); q.addColorStop(0, '#2a2438'); q.addColorStop(0.5, '#0b0910'); q.addColorStop(1, '#1d1828');
      g.fillStyle = q; g.fillRect(x, 0, 64, 64);
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 30, 0); g.lineTo(x, 40); g.closePath(); g.fill();
      g.save(); g.shadowColor = '#ff7a1a'; g.shadowBlur = 10; g.fillStyle = '#ff9a2e';
      g.beginPath(); g.moveTo(x + 32, 10); g.lineTo(x + 44, 40); g.lineTo(x + 32, 54); g.lineTo(x + 20, 40); g.closePath(); g.fill(); g.restore();
      g.fillStyle = '#fff0b8'; g.beginPath(); g.moveTo(x + 32, 20); g.lineTo(x + 37, 38); g.lineTo(x + 32, 45); g.lineTo(x + 27, 38); g.closePath(); g.fill();
      g.strokeStyle = '#ffcf7a'; g.lineWidth = 2.5; g.strokeRect(x + 2.5, 2.5, 59, 59);
      continue;
    }
    const k = theme.drops.order[i], col = theme.drops.col[k];
    const q = g.createLinearGradient(0, 0, 0, 64); q.addColorStop(0, '#2a2350'); q.addColorStop(1, '#100c26');
    g.fillStyle = q; g.fillRect(x, 0, 64, 64);
    g.strokeStyle = '#e8ecff'; g.lineWidth = 3; g.strokeRect(x + 2.5, 2.5, 59, 59);
    invader(g, ART[k], x + 8, 14, 4, col);
  }
  g.fillStyle = theme.drops ? '#d8dce8' : '#16121e'; g.fillRect(320, 0, 64, 64);
  return c;
}
function spinnerCanvas(theme) {
  const c = cv(128, 64), g = c.getContext('2d');
  if (!theme.drops) {   // Ember Peak: a sun over the sea
    const q = g.createLinearGradient(0, 0, 0, 64); q.addColorStop(0, '#ffcf3a'); q.addColorStop(0.55, '#ff7a1a'); q.addColorStop(0.56, '#13b4cf'); q.addColorStop(1, '#0b6fb0');
    g.fillStyle = q; g.fillRect(0, 0, 128, 64);
    g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(64, 35, 15, Math.PI, 0); g.fill();
    g.strokeStyle = '#2a1206'; g.lineWidth = 4; g.strokeRect(2, 2, 124, 60);
    return c;
  }
  g.fillStyle = '#ffd84a'; g.fillRect(0, 0, 128, 64);
  const q = g.createLinearGradient(10, 0, 100, 0); q.addColorStop(0, 'rgba(255,90,20,0)'); q.addColorStop(1, '#ff6a1a');
  g.fillStyle = q; g.beginPath(); g.moveTo(8, 26); g.lineTo(96, 18); g.lineTo(96, 46); g.lineTo(8, 38); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(98, 32, 13, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2a1a08'; g.lineWidth = 4; g.strokeRect(2, 2, 124, 60);
  return c;
}
function speakerCanvas() {   // the old table's backbox speaker panel, x WOOD_L..WOOD_R, 0..60 units up, 4 px a unit
  const k = 4, w = (WOOD_R - WOOD_L) * k, h = 60 * k, c = cv(w, h), g = c.getContext('2d'), X = (x) => (x - WOOD_L) * k;
  const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, '#16121f'); q.addColorStop(1, '#0a0812');
  g.fillStyle = q; g.fillRect(0, 0, w, h);
  [[40, '#ff5cc8'], [232, '#3fe0ff']].forEach(([x, col]) => {
    const cx = X(x), cy = h * 0.5, r = 21 * k;
    g.save(); g.shadowColor = col; g.shadowBlur = 26; g.strokeStyle = col; g.lineWidth = 9; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.restore();
    g.fillStyle = '#05040a'; g.beginPath(); g.arc(cx, cy, r - 6, 0, Math.PI * 2); g.fill();
  });
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.shadowColor = '#ffb030'; g.shadowBlur = 30; g.fillStyle = '#ffd84a'; g.font = 'bold ' + (30 * k) + 'px "Arial Black", Arial, sans-serif'; g.fillText('365', X(136), h * 0.36); g.restore();
  g.save(); g.shadowColor = '#ff5cc8'; g.shadowBlur = 22; g.fillStyle = '#ffe6f6'; g.font = 'bold ' + (13 * k) + 'px "Arial Black", Arial, sans-serif'; g.fillText('PINBALL HERO', X(136), h * 0.77); g.restore();
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
  if (art) invader(g, ART[art], (cx - x0) * k - 24, (cy - y0) * k - 16, 4, '#14082a');
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
function flipperShadowCanvas(f) {   // a soft shadow of a bat, pointing along +x from its pivot at (pad, n/2)
  const pad = 14, k = 4, n = Math.ceil((f.len + pad * 2) * k), m = Math.ceil(pad * 2 * k), c = cv(n, m), g = c.getContext('2d');
  g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 3.5 * k; g.shadowOffsetX = 4000;
  g.fillStyle = '#000'; g.beginPath(); g.arc(pad * k - 4000, m / 2, f.r0 * k, 0, Math.PI * 2); g.arc((pad + f.len) * k - 4000, m / 2, f.r1 * k, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(pad * k - 4000, m / 2 - f.r0 * k); g.lineTo((pad + f.len) * k - 4000, m / 2 - f.r1 * k); g.lineTo((pad + f.len) * k - 4000, m / 2 + f.r1 * k); g.lineTo(pad * k - 4000, m / 2 + f.r0 * k); g.fill();
  return { c, pad, w: n / k, h: m / k };
}
// the volcano's skin, wrapped round the cone (u round it, 0 = facing the player; v up it): black rock, a crusted rim,
// and on the glow canvas lava veins running down from the crater and the glowing mouth at the front, at its foot
function coneCanvases() {
  const w = 512, h = 256, col = cv(w, h), glo = cv(w, h), g = col.getContext('2d'), gg = glo.getContext('2d'), r = rnd(71);
  g.drawImage(noiseCanvas(64, 32, 5, 10), 0, 0, w, h);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = '#3a3036'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(10,8,12,0.55)'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(120,110,120,0.25)' : 'rgba(0,0,0,0.35)'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
  const rim = g.createLinearGradient(0, 0, 0, h * 0.16); rim.addColorStop(0, '#5a2a18'); rim.addColorStop(1, 'rgba(60,30,20,0)');
  g.fillStyle = rim; g.fillRect(0, 0, w, h * 0.16);
  gg.fillStyle = '#000'; gg.fillRect(0, 0, w, h);
  const rg = gg.createLinearGradient(0, 0, 0, h * 0.12); rg.addColorStop(0, '#ff9a2e'); rg.addColorStop(1, 'rgba(255,90,20,0)');
  gg.fillStyle = rg; gg.fillRect(0, 0, w, h * 0.12);
  gg.lineCap = 'round'; gg.lineJoin = 'round';
  const vein = (x0, len, wd) => {
    for (const off of [0, w, -w]) {
      let x = x0 + off, y = h * 0.02, a = Math.PI / 2; const pts = [[x, y]];
      for (let k = 0; k < 14; k++) { a += (r() - 0.5) * 0.6; a = clamp(a, Math.PI * 0.3, Math.PI * 0.7); x += Math.cos(a) * len / 14; y += Math.sin(a) * len / 14; pts.push([x, y]); }
      for (const [lw, c2, blur] of [[wd * 2.2, 'rgba(255,90,20,0.55)', 10], [wd, '#ffb030', 4], [wd * 0.4, '#fff0b0', 0]]) {
        gg.beginPath(); pts.forEach((p, i) => (i ? gg.lineTo(p[0], p[1]) : gg.moveTo(p[0], p[1]))); gg.lineWidth = lw; gg.strokeStyle = c2; gg.shadowColor = '#ff6a1a'; gg.shadowBlur = blur; gg.stroke();
      }
      gg.shadowBlur = 0;
    }
  };
  for (let i = 0; i < 11; i++) vein((i + 0.3 + r() * 0.4) / 11 * w, h * (0.35 + r() * 0.45), 2.2 + r() * 2.5);
  // the mouth at the front foot (u = 0, so at both edges): a glowing arch, dark inside on the colour canvas
  for (const x of [0, w]) {
    const mw = w * 0.075, top = h * 0.62;
    g.fillStyle = '#120806'; g.beginPath(); g.moveTo(x - mw, h); g.quadraticCurveTo(x - mw, top, x, top); g.quadraticCurveTo(x + mw, top, x + mw, h); g.closePath(); g.fill();
    const q = gg.createRadialGradient(x, h, 2, x, h, h * 0.42); q.addColorStop(0, '#fff6c0'); q.addColorStop(0.35, '#ffb030'); q.addColorStop(0.7, '#ff5a10'); q.addColorStop(1, 'rgba(255,60,0,0)');
    gg.fillStyle = q; gg.beginPath(); gg.moveTo(x - mw * 1.25, h); gg.quadraticCurveTo(x - mw * 1.25, top - 6, x, top - 8); gg.quadraticCurveTo(x + mw * 1.25, top - 6, x + mw * 1.25, h); gg.closePath(); gg.fill();
  }
  return { col, glo };
}
function shellCanvases() {   // a magma crab's shell (a sphere's uvs: v = 1 at the top): dark crust, glowing cracks on its back
  const w = 256, h = 128, col = cv(w, h), glo = cv(w, h), g = col.getContext('2d'), gg = glo.getContext('2d'), r = rnd(83);
  const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, '#3a2a26'); q.addColorStop(0.5, '#241a1a'); q.addColorStop(1, '#5a2414');
  g.fillStyle = q; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? 'rgba(90,70,70,0.4)' : 'rgba(0,0,0,0.4)'; g.fillRect(r() * w, r() * h * 0.6, 2 + r() * 4, 1 + r() * 3); }
  gg.fillStyle = '#000'; gg.fillRect(0, 0, w, h);
  gg.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    let x = r() * w, y = r() * h * 0.42; gg.beginPath(); gg.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 30; y += (r() - 0.3) * 12; gg.lineTo(x, Math.min(y, h * 0.48)); }
    gg.strokeStyle = '#ff8a1a'; gg.lineWidth = 2 + r() * 2.5; gg.shadowColor = '#ff5a10'; gg.shadowBlur = 6; gg.stroke();
  }
  const top = gg.createRadialGradient(w / 2, 0, 2, w / 2, 0, h * 0.35); top.addColorStop(0, 'rgba(255,170,60,0.9)'); top.addColorStop(1, 'rgba(255,90,20,0)');
  gg.fillStyle = top; gg.fillRect(0, 0, w, h * 0.4);
  return { col, glo };
}
function lavaFlowCanvas() {   // molten lava for the lava lanes (tiles down the lane)
  const w = 64, h = 256, c = cv(w, h), g = c.getContext('2d'), r = rnd(91);
  const q = g.createLinearGradient(0, 0, w, 0); q.addColorStop(0, '#5a1404'); q.addColorStop(0.5, '#ff6a10'); q.addColorStop(1, '#5a1404');
  g.fillStyle = q; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 60; i++) {
    const x = w * (0.2 + r() * 0.6), y = r() * h, l = 10 + r() * 40;
    for (const off of [0, h, -h]) { g.strokeStyle = rgba(r() < 0.5 ? '#ffd060' : '#ff9a2e', 0.5); g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(x, y + off); g.lineTo(x + (r() - 0.5) * 8, y + l + off); g.stroke(); }
  }
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 25; i++) { const x = r() * w, y = r() * h; g.fillStyle = 'rgba(30,10,6,0.6)'; g.beginPath(); g.ellipse(x, y, 3 + r() * 5, 6 + r() * 10, 0, 0, Math.PI * 2); g.fill(); }
  return c;
}
function softDot(n, inner) {   // a soft white dot (the lava gates' glow, the geyser's pool)
  const c = cv(n, n), g = c.getContext('2d'), q = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(inner || 0.3, 'rgba(255,255,255,0.7)'); q.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = q; g.fillRect(0, 0, n, n); return c;
}

// the playfield's printed art with the wall shadows painted on top (once, at load). Shadows use the canvas's own shadow
// (works on every phone, iPhones too), each part swept along the key light.
function bakePlayfield(B, base, parts, own, theme) {
  const T = B.T, TW = T.W, c = cv(base.width, base.height), g = c.getContext('2d'), k = c.width / TW, OFF = 20000;
  g.drawImage(base, 0, 0);
  if (own && theme.bump) {   // (the stand-in art only) light pools round the pop bumpers
    g.globalCompositeOperation = 'lighter';
    B.BUMPERS.forEach((Bm, i) => {
      const q = g.createRadialGradient(Bm.x * k, Bm.y * k, Bm.r * 0.6 * k, Bm.x * k, Bm.y * k, Bm.r * 3.2 * k);
      q.addColorStop(0, rgba(theme.bump[i % 3].c, 0.42)); q.addColorStop(1, rgba(theme.bump[i % 3].c, 0));
      g.fillStyle = q; g.fillRect((Bm.x - Bm.r * 4) * k, (Bm.y - Bm.r * 4) * k, Bm.r * 8 * k, Bm.r * 8 * k);
    });
    g.globalCompositeOperation = 'source-over';
  }
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
  pass(own ? 0.5 : 0.36, 4, true);
  if (own) pass(0.55, 1.6, false);
  // the clear ramp's and the wire rail's faint shadows (the higher, the further they fall)
  g.save(); g.shadowColor = 'rgba(0,0,10,0.3)'; g.shadowBlur = 5 * k; g.shadowOffsetX = OFF; g.fillStyle = '#000';
  if (B.RAMP) for (let s = 0; s <= B.RAMP.L; s += 3) {
    const r = B.rampAt(s); if (r.z < 2) continue;
    g.beginPath(); g.arc((r.x + SHX * r.z) * k - OFF, (r.y + SHY * r.z) * k, (T.ramp.width / 2) * k, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  return c;
}

// ---------------------------------------------------------------- the environment the shiny things reflect
function makeRoomEnv(renderer, floorTex, TW, TH) {   // the old table: a little room of light panels, the playfield its floor
  const es = new THREE.Scene(), junk = [];
  const add = (geo, mat, f) => { const m = new THREE.Mesh(geo, mat); f(m); es.add(m); junk.push(geo, mat); return m; };
  add(new THREE.BoxGeometry(1000, 600, 1200), new THREE.MeshBasicMaterial({ color: 0x05050a, side: THREE.BackSide }), (m) => { m.position.y = 250; });
  const lamp = (w, h, col, k, x, y, z, rx, ry) => add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }), (m) => { m.position.set(x, y, z); m.rotation.set(rx, ry, 0); });
  lamp(36, 300, '#fff1e0', 1.5, 0, 360, -60, Math.PI / 2, 0);
  lamp(10, 420, '#ffb36a', 2.2, -150, 40, 0, Math.PI / 2, 0);
  lamp(10, 420, '#ffb36a', 2.2, 150, 40, 0, Math.PI / 2, 0);
  lamp(200, 50, '#3fe0ff', 0.5, 0, 120, -330, 0, 0);
  lamp(140, 60, '#ff5cc8', 0.8, -260, 140, 120, 0, Math.PI / 2);
  lamp(140, 60, '#5a8cff', 0.8, 260, 140, 120, 0, -Math.PI / 2);
  add(new THREE.PlaneGeometry(TW, TH), new THREE.MeshBasicMaterial({ map: floorTex, color: 0x9a9a9a }), (m) => { m.rotation.x = -Math.PI / 2; m.position.y = -2; });
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(es, 0.025, 1, 3000);
  pm.dispose(); junk.forEach((j) => j.dispose());
  return rt;
}
function makeSkyEnv(renderer, skyTex) {   // Ember Peak: the sky and the sea all round
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromEquirectangular(skyTex);
  pm.dispose();
  return rt;
}

// ================================================================ the world
export function create(opts) {
  opts = opts || {};
  const t0 = performance.now();
  const canvasEl = opts.canvas || cv(16, 16);
  const PHONE = opts.phone != null ? !!opts.phone : isPhone();
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  const PR_CAP = Math.min(2, opts.pixelRatio || Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 0.6, 5, 9000);
  camera.layers.enable(1);
  // the cabinet's frame (pitched, never moves: the camera is placed in it), and inside it the moving table
  const cab = new THREE.Group(); cab.rotation.x = PITCH; scene.add(cab);
  const mover = new THREE.Group(); mover.matrixAutoUpdate = false; cab.add(mover);
  // a group whose local coordinates are table units (x right, y down the table, z up), for the spectacle add-ons
  const units = new THREE.Group(); units.matrixAutoUpdate = false; mover.add(units);
  // what the ball's reflection shows (layer 1): only the big surfaces - the playfield, the chrome, the cabinet, the lit
  // inserts, the plastics, the volcano - so its six small passes stay cheap; the small parts are left out (R1 = no-op)
  const RF = (o) => { o.layers.enable(1); return o; }, R1 = (o) => o;

  // ---------------------------------------------------------------- quality tiers
  const TIERS = {
    high: { pr: 2, samples: 4, bloom: true, bloomK: 0.5, reflectEvery: 1, clearcoat: true, motes: 1 },
    medium: { pr: 1.5, samples: 2, bloom: true, bloomK: 0.33, reflectEvery: 3, clearcoat: false, motes: 0.55 },
    low: { pr: 1, samples: 0, bloom: false, bloomK: 0.25, reflectEvery: 0, clearcoat: false, motes: 0.25 }
  };
  const ORDER = ['low', 'medium', 'high'];
  let tierName = TIERS[opts.tier] ? opts.tier : (PHONE ? 'medium' : 'high');
  const autoTier = !TIERS[opts.tier] || opts.tier === 'auto';
  let tier = TIERS[tierName], PR = Math.min(PR_CAP, tier.pr);
  renderer.setPixelRatio(PR);
  const perf = { ring: [], last: 0, bad: 0, good: 0, upLock: 0, lockMs: 30000, evalAt: 0, changes: 0, wentUp: false };

  // ---------------------------------------------------------------- the composer: the scene, the glow, (the spectacle's pass), the output
  const samples = opts.samples != null ? opts.samples : tier.samples;
  let RW = 0, RH = 0;
  const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(PR);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), opts.bloom != null ? opts.bloom : 0.62, 0.3, opts.threshold != null ? opts.threshold : 1.75);
  composer.addPass(bloom); bloom.enabled = tier.bloom;
  const outPass = new OutputPass(); composer.addPass(outPass);
  let post = null, particles = null;
  const NOPOST = { update() {} };   // (the spectacle's pass failed to build: nothing to update, and the flash stays whole)

  // ---------------------------------------------------------------- the table being shown (built from its data; rebuilt for another table)
  let TB = null;
  const shared = [];
  const keepS = (x) => { shared.push(x); return x; };
  const shadowMat = keepS(new THREE.MeshBasicMaterial({ map: keepS(tex(blobCanvas(64, 0.62))), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));

  // effects points: soft glowing (added on) and soft puffs (smoke and steam, blended), sized in table units
  const PT_N = 1400, SM_N = 700;
  function pointsSystem(n, additive) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n), geo = keepS(new THREE.BufferGeometry());
    [['position', pos, 3], ['acol', col, 4], ['size', size, 1]].forEach(([k, a, m]) => { const b = new THREE.BufferAttribute(a, m); b.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, b); });
    geo.setDrawRange(0, 0);
    const mat = keepS(new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute float size; attribute vec4 acol; uniform float uScale; varying vec4 vC;\n'
        + 'void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.5, size * uScale / -mv.z); gl_Position = projectionMatrix * mv; vC = acol; }',
      fragmentShader: additive
        ? 'varying vec4 vC;\nvoid main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vC.rgb * vC.a * exp(-r * 3.0) * (1.0 - r), 1.0); }'
        : 'varying vec4 vC;\nvoid main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard; float f = (1.0 - r); gl_FragColor = vec4(vC.rgb, vC.a * f * f); }'
    }));
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = additive ? 15 : 14;
    return { pts, geo, mat, pos, col, size, n, count: 0 };
  }
  const glowPts = pointsSystem(PT_N, true), puffPts = pointsSystem(SM_N, false);
  const motes = [];   // the toys' own particles: {x, y, z, vx, vy, vz, life, max, size, grow, col: [r, g, b], a, kind: 'glow'|'puff', g}
  const mr = rnd(4242);
  function emit(kind, x, y, z, vx, vy, vz, life, size, col, a, grav, grow) {
    const cap = Math.round((kind === 'glow' ? 700 : SM_N) * tier.motes);
    if (motes.length > cap * 1.6) return;
    motes.push({ kind, x, y, z, vx, vy, vz, life: 0, max: life, size, grow: grow || 0, col, a, g: grav || 0 });
  }
  const POP_N = 16, pops = [], popTex = new Map();
  for (let i = 0; i < POP_N; i++) {
    const mat = keepS(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
    const sp = new THREE.Sprite(mat); sp.visible = false; sp.renderOrder = 20; pops.push(sp);
  }
  function popTexture(text, col) {
    const k = text + '|' + col; let e = popTex.get(k);
    if (e) { popTex.delete(k); popTex.set(k, e); return e; }
    const c = popCanvas(text, col); e = { t: tex(c, { aniso: ANISO }), aspect: c.width / c.height };
    popTex.set(k, e);
    if (popTex.size > 40) { const old = popTex.keys().next().value; popTex.get(old).t.dispose(); popTex.delete(old); }
    return e;
  }

  // the ball pool: chrome balls reflecting the table round them
  const BR0 = 7;
  const cubeRT = keepS(new THREE.WebGLCubeRenderTarget(opts.reflectSize || (PHONE ? 64 : 128), { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }));
  const cubeCam = new THREE.CubeCamera(2, 2500, cubeRT); scene.add(cubeCam);
  cubeCam.children.forEach((c) => c.layers.set(1));
  const ballMat = keepS(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.05, envMap: cubeRT.texture, envMapIntensity: 1.3 }));
  const ballGeo = keepS(new THREE.SphereGeometry(BR0, 48, 32));
  const shGeo = keepS(new THREE.PlaneGeometry(1, 1)); shGeo.rotateX(-Math.PI / 2);
  const balls = [];
  // the ball is never lost behind a toy: a slightly larger copy drawn only where something is in front of the ball
  // (its depth test passes only behind what is already drawn), in a bright outline colour
  const xrayMat = keepS(new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8fbff').multiplyScalar(1.2), transparent: true, opacity: 0.6, depthWrite: false, depthFunc: THREE.GreaterDepth }));
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(ballGeo, ballMat); m.visible = false;
    const x = new THREE.Mesh(ballGeo, xrayMat); x.scale.setScalar(1.03); x.position.y = 0.22; x.renderOrder = 30; m.add(x);
    const s = new THREE.Mesh(shGeo, shadowMat); s.visible = false; s.renderOrder = 1;
    const s2 = new THREE.Mesh(shGeo, shadowMat); s2.visible = false; s2.renderOrder = 1;
    balls.push({ m, s, s2 });
  }

  // ---------------------------------------------------------------- build one table
  function buildTable(id) {
    const B = E.table ? E.table(id) : null;
    const T = B ? B.T : E.TABLE, tid = B ? B.id : 'orbit', TW = T.W, TH = T.H, MID = T.MID, BR = T.BALL || 7;
    const TH_ = THEMES[tid] || THEMES.orbit, ISLAND = TH_.world === 'island';
    HW = TW / 2; ZC = TH / 2;
    const RAMP = B ? B.RAMP : E.RAMP, rampAt = B ? B.rampAt : E.rampAt, BUMPERS = B ? B.BUMPERS : E.BUMPERS, POSTS = B ? B.POSTS : E.POSTS;
    const DROPS = B ? B.DROPS : E.DROPS, GATES = B ? B.GATES : E.GATES, inPocket = B ? B.inPocket : E.inPocket;
    const WALLS = T.walls.filter((w) => w[6] !== 'apron');
    const group = new THREE.Group(); group.position.set(0, 0, 0);
    const disposables = [];
    const keep = (x) => { disposables.push(x); return x; };
    const ART_SCALE = opts.artScale || (PHONE ? 3 : 4);
    const parts = [];
    WALLS.forEach((w) => parts.push({ seg: [w[0], w[1], w[2], w[3]], r: w[4] + (w[6] === 'post' ? 0.3 : 0.6), h: w[6] === 'post' ? H.guide : cabinetSide(w) ? H.wood : H.rail }));
    (function () { const A = T.arch, pts = []; for (let k = 0; k <= 48; k++) { const a = Math.PI + Math.PI * k / 48; pts.push([A.x + A.R * Math.cos(a), A.y + A.R * Math.sin(a)]); } for (let k = 0; k < 48; k++) parts.push({ seg: [pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]], r: 2.2, h: H.arch }); })();
    POSTS.forEach((p) => parts.push({ circle: [p.x, p.y, p.r + 0.4], h: H.post }));
    BUMPERS.forEach((Bm) => parts.push({ circle: [Bm.x, Bm.y, Bm.r + 1], h: H.bumpCap }));
    T.slings.forEach((s) => parts.push({ poly: offsetPoly([s.a, s.b, s.c], 3, 6), h: H.sling }));
    DROPS.forEach((d) => parts.push({ seg: [d.ax, d.ay, d.bx, d.by], r: 2.2, h: H.drop * 0.5 }));
    (T.voids || []).forEach((v) => parts.push({ poly: v, h: H.void }));
    if (T.volcano) parts.push({ circle: [T.volcano.x, T.volcano.y, T.volcano.r + 1], h: 26 });
    if (T.lava) T.lava.gates.forEach((g) => parts.push({ seg: [g[0], g[1], g[2], g[3]], r: 2, h: H.gate }));
    function cabinetSide(w) { return w[0] === w[2] && (w[0] <= 6 || w[0] >= 266); }

    // ---- the playfield
    let artBase = null, artGlow = null, artSource = 'stand-in', artMs = 0;
    if (window.PinArt && typeof PinArt.paint === 'function') {
      try {
        const a0 = performance.now(), o = PinArt.paint({ scale: ART_SCALE, table: tid });
        artMs = Math.round(performance.now() - a0);
        if (o && o.color && (o.table === tid || (tid === 'orbit' && !o.table))) { artBase = o.color; artGlow = o.glow || null; artSource = 'PinArt'; }
      } catch (e) { console.warn('PinArt.paint failed', e); }
    }
    if (!artBase) artBase = standInArt(T, ART_SCALE);
    const pfTex = keep(tex(bakePlayfield(B || { T, BUMPERS, RAMP, rampAt }, artBase, parts, artSource !== 'PinArt', TH_), { aniso: ANISO }));
    pfTex.generateMipmaps = true; pfTex.minFilter = THREE.LinearMipmapLinearFilter;
    const LIFT = opts.lift != null ? opts.lift : ISLAND ? 0.3 : 0.34, liftU = { value: LIFT };
    const lift = (m) => { m.onBeforeCompile = (sh) => { sh.uniforms.uLift = liftU; sh.fragmentShader = 'uniform float uLift;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * uLift;'); }; m.customProgramCacheKey = () => 'lift'; return m; };
    const pfMatHi = keep(lift(new THREE.MeshPhysicalMaterial({ map: pfTex, roughness: 0.62, metalness: 0, clearcoat: ISLAND ? 0.3 : 0.45, clearcoatRoughness: ISLAND ? 0.22 : 0.05, envMapIntensity: ISLAND ? 0.035 : 0.1 })));
    const pfMatLo = keep(lift(new THREE.MeshStandardMaterial({ map: pfTex, roughness: 0.5, metalness: 0, envMapIntensity: ISLAND ? 0.05 : 0.18 })));
    let glowTex = null;
    if (artGlow) { glowTex = keep(tex(artGlow, { aniso: ANISO })); [pfMatHi, pfMatLo].forEach((m) => { m.emissiveMap = glowTex; m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = 1.1; }); }
    const pfGeo = keep(new THREE.PlaneGeometry(TW, TH)); pfGeo.rotateX(-Math.PI / 2);
    const playfield = RF(new THREE.Mesh(pfGeo, tier.clearcoat ? pfMatHi : pfMatLo)); group.add(playfield);

    // ---- the world beyond, and what the shiny things reflect
    let envRT, ballSky, skyTex = null, skyKey = '', world = null;
    if (ISLAND) {
      const sc = islandSkyCanvas(PHONE ? 1024 : 2048, PHONE ? 512 : 1024), st = keep(tex(sc, { wrapS: true }));
      st.mapping = THREE.EquirectangularReflectionMapping;
      envRT = makeSkyEnv(renderer, st);
      ballSky = st;
      world = buildIsland(st);
    } else {
      envRT = makeRoomEnv(renderer, pfTex, TW, TH);
      ballSky = keep(tex(ballSkyCanvas())); ballSky.mapping = THREE.EquirectangularReflectionMapping;
    }
    disposables.push(envRT);
    function buildIsland(st) {   // the sky dome, the sea, the island's rock under the cabinet, islands far off
      const w = new THREE.Group();
      const skyGeo = keep(new THREE.SphereGeometry(4200, 32, 16)), skyMat = keep(new THREE.MeshBasicMaterial({ map: st, side: THREE.BackSide, depthWrite: false, fog: false }));
      const skyMesh = new THREE.Mesh(skyGeo, skyMat); skyMesh.renderOrder = -10; skyMesh.rotation.y = Math.PI * 0.62; w.add(skyMesh);
      const seaT = keep(tex(seaCanvas(PHONE ? 1024 : 2048), { aniso: ANISO }));
      const seaGeo = keep(new THREE.PlaneGeometry(9000, 9000)); seaGeo.rotateX(-Math.PI / 2);
      const seaMat = keep(new THREE.MeshBasicMaterial({ map: seaT }));
      const sea = new THREE.Mesh(seaGeo, seaMat); sea.position.y = -95; w.add(sea);
      // the island's rock under the cabinet: rings round the cabinet's footprint, flaring out to a sand beach at the sea
      const G = new Geo(); G.c = [];
      const x0 = WOOD_L - 6, x1 = WOOD_R + 6, y0 = -50, y1 = TH + 34, N = 64, r = rnd(17);
      const rim = []; for (let k = 0; k < N; k++) {
        const a = k / N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), px = Math.sign(ca) * Math.pow(Math.abs(ca), 0.35), py = Math.sign(sa) * Math.pow(Math.abs(sa), 0.35);
        rim.push([HW + px * (x1 - x0) / 2 + (x1 + x0) / 2 - HW, (y0 + y1) / 2 + py * (y1 - y0) / 2, px, py]);
      }
      const rings = [[-14, 0, [0.12, 0.11, 0.13]], [-36, 12, [0.09, 0.08, 0.09]], [-62, 34, [0.14, 0.12, 0.12]], [-92, 62, [0.8, 0.66, 0.4]], [-130, 96, [0.92, 0.8, 0.52]], [-230, 170, [0.85, 0.72, 0.45]]];
      const idx = rings.map(([y, grow, col], ri) => rim.map((p) => {
        const j = ri === 0 ? 0 : (r() - 0.5) * (ri < 3 ? 9 : 4), X = wx(p[0] + p[2] * (grow + j)), Z = wz(p[1] + p[3] * (grow + j));
        const i = G.v(X, y + (ri && ri < 3 ? (r() - 0.5) * 8 : 0), Z, p[2], 0.6, p[3], 0, 0); const sh = 0.85 + r() * 0.3; G.c.push(col[0] * sh, col[1] * sh, col[2] * sh); return i;
      }));
      for (let ri = 0; ri < rings.length - 1; ri++) for (let k = 0; k < N; k++) G.quad(idx[ri][k], idx[ri][(k + 1) % N], idx[ri + 1][(k + 1) % N], idx[ri + 1][k]);
      const skirtMat = keep(new THREE.MeshLambertMaterial({ vertexColors: true }));
      const skirt = new THREE.Mesh(keep(G.geometry()), skirtMat);
      const I = new Geo(); I.c = [];
      // islands far off: a sand ring, a green hump (one a little volcano), vertex coloured
      [[-1500, -2300, 260, 150, 0], [1900, -1600, 180, 90, 1], [-2300, 700, 220, 110, 1], [2400, 900, 140, 70, 1]].forEach(([cx, cz, rad, ht, green]) => {
        const M = 18, base = I.p.length / 3, ringsI = [[1.0, -96, [0.93, 0.83, 0.56]], [0.86, -88, [0.86, 0.76, 0.5]], [0.7, -96 + ht * 0.35, green ? [0.22, 0.55, 0.3] : [0.24, 0.22, 0.24]], [0.32, -96 + ht * 0.85, green ? [0.16, 0.42, 0.24] : [0.2, 0.18, 0.2]], [0.0, -96 + ht, green ? [0.2, 0.45, 0.25] : [0.35, 0.18, 0.12]]];
        ringsI.forEach(([f, y, col]) => { for (let k = 0; k < M; k++) { const a = k / M * Math.PI * 2, jj = 0.85 + r() * 0.3; I.v(cx + Math.cos(a) * rad * f * jj, y, cz + Math.sin(a) * rad * f * jj, Math.cos(a), 0.7, Math.sin(a), 0, 0); I.c.push(col[0], col[1], col[2]); } });
        for (let ri = 0; ri < ringsI.length - 1; ri++) for (let k = 0; k < M; k++) I.quad(base + ri * M + k, base + ri * M + (k + 1) % M, base + (ri + 1) * M + (k + 1) % M, base + (ri + 1) * M + k);
      });
      w.add(new THREE.Mesh(keep(I.geometry()), skirtMat));
      return { group: w, skyMat, seaMat, skirt };
    }

    // ---- materials
    const M = {
      chrome: keep(new THREE.MeshStandardMaterial({ color: 0xe6ebf4, metalness: 1, roughness: 0.17 })),
      darkChrome: keep(new THREE.MeshStandardMaterial({ color: 0x9aa3b4, metalness: 1, roughness: 0.3 })),
      rubberW: keep(new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.55, envMapIntensity: 0.4 })),
      rubberB: keep(new THREE.MeshStandardMaterial({ color: 0x17161c, roughness: 0.5, envMapIntensity: 0.6 })),
      rubberR: keep(new THREE.MeshStandardMaterial({ color: ISLAND ? 0xff6a1a : 0xd8182a, roughness: 0.45, envMapIntensity: 0.5 })),
      batW: keep(new THREE.MeshPhysicalMaterial({ color: 0xf6f4ee, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.15 })),
      wood: keep(new THREE.MeshStandardMaterial({ map: keep(tex(TH_.cabinet === 'lacquer' ? lacquerCanvas() : woodCanvas(), { repeat: true, aniso: ANISO })), roughness: TH_.cabinet === 'lacquer' ? 0.22 : 0.38, metalness: TH_.cabinet === 'lacquer' ? 0.15 : 0, envMapIntensity: TH_.cabinet === 'lacquer' ? 1.0 : 0.7 })),
      black: keep(new THREE.MeshStandardMaterial({ color: ISLAND ? 0x17141a : 0x0b0a12, roughness: ISLAND ? 0.8 : 0.5, metalness: ISLAND ? 0 : 0.2 })),
      rock: keep(new THREE.MeshStandardMaterial({ color: 0x2b2630, roughness: 0.85, metalness: 0, envMapIntensity: 0.5 }))
    };
    // the playfield and its parts reflect the world round them (the sky and sea on Ember Peak)
    [pfMatHi, pfMatLo, ...Object.values(M), ballMat].forEach((m) => { if (m !== ballMat) m.envMap = envRT.texture; });

    // ---- the chrome: guide rails, the arch, lane guides, the ramp's wires, trims
    const chrome = new Geo(), posts = [];
    WALLS.forEach((w) => {
      if (cabinetSide(w)) return;
      const guide = w[6] === 'post', h = guide ? H.guide : H.rail, r = guide ? 1.3 : w[4];
      sweep(chrome, [[w[0], w[1]], [w[2], w[3]]], r, h);
      posts.push([w[0], w[1], h + 1.6, r + 0.5], [w[2], w[3], h + 1.6, r + 0.5]);
    });
    (function () { const A = T.arch, pts = []; for (let k = 0; k <= 120; k++) { const a = Math.PI + Math.PI * k / 120; pts.push([A.x + A.R * Math.cos(a), A.y + A.R * Math.sin(a)]); } sweep(chrome, pts, A.r + 0.2, H.arch, { arc: 8 }); })();
    sweep(chrome, [[7.2, -14], [7.2, TH]], 1.4, 2.6, { base: H.wood - 1 });
    sweep(chrome, [[264.8, -14], [264.8, TH]], 1.4, 2.6, { base: H.wood - 1 });

    // ---- the ramp: a clear ribbon with walls, chrome wires, LED edges, supports
    let ledMat = null;
    if (RAMP) {
      const RP = [], rc = new THREE.CatmullRomCurve3(RAMP.P.map((p) => new THREE.Vector3(p[0], p[2], p[1])), false, 'centripetal');
      for (let k = 0, N = Math.ceil(RAMP.L / 2.5); k <= N; k++) {
        const v = rc.getPointAt(k / N), tg = rc.getTangentAt(k / N), l = Math.hypot(tg.x, tg.z) || 1;
        RP.push([v.x, v.z, Math.max(0.35, v.y + 0.35), tg.x / l, tg.z / l]);
      }
      const rampHW = T.ramp.width / 2, clear = new Geo(), led = new Geo(), walls = new Geo();
      const n = RP.length, A = [];
      for (let i = 0; i < n; i++) {
        const p = RP[i], lx = -p[4], ly = p[3];
        A.push([clear.v(wx(p[0] + lx * rampHW), p[2], wz(p[1] + ly * rampHW), 0, 1, 0, 0, i / n), clear.v(wx(p[0] - lx * rampHW), p[2], wz(p[1] - ly * rampHW), 0, 1, 0, 1, i / n)]);
      }
      for (let i = 0; i < n - 1; i++) clear.quad(A[i][0], A[i + 1][0], A[i + 1][1], A[i][1]);
      const P3 = RP.map((p) => [p[0], p[1], p[2]]);
      ribbon(walls, P3, rampHW + 0.3, 0, H.rampWall); ribbon(walls, P3, -(rampHW + 0.3), 0, H.rampWall);
      ribbon(walls, P3, rampHW + 2.1, -0.5, H.rampWall); ribbon(walls, P3, -(rampHW + 2.1), -0.5, H.rampWall);
      const top = (off, h) => RP.map((p) => [p[0] - p[4] * off, p[1] + p[3] * off, p[2] + h]);
      sweep(chrome, top(rampHW + 1.2, H.rampWall - 0.6), 0.95, 1.9, { bottom: -0.4 }); sweep(chrome, top(-(rampHW + 1.2), H.rampWall - 0.6), 0.95, 1.9, { bottom: -0.4 });
      sweep(chrome, top(rampHW + 1.2, H.rampWall * 0.5), 0.45, 0.9, { bottom: -0.45 }); sweep(chrome, top(-(rampHW + 1.2), H.rampWall * 0.5), 0.45, 0.9, { bottom: -0.45 });
      const edge = (off) => RP.map((p) => [p[0] - p[4] * off, p[1] + p[3] * off, p[2] + 0.15]);
      sweep(led, edge(rampHW - 0.6), 0.55, 1.1, { bottom: 0 }); sweep(led, edge(-(rampHW - 0.6)), 0.55, 1.1, { bottom: 0 });
      const p0 = RP[1]; sweep(chrome, [[p0[0] + p0[4] * rampHW, p0[1] - p0[3] * rampHW, 0], [p0[0] - p0[4] * rampHW, p0[1] + p0[3] * rampHW, 0]], 0.9, 1.4);
      let last = -99;
      for (let i = 0; i < n; i++) {
        const p = RP[i]; if (p[2] < 12 || i - last < 14) continue;
        for (const s of [1, -1]) {
          const ex = p[0] - p[4] * (rampHW + 1.2) * s, ey = p[1] + p[3] * (rampHW + 1.2) * s;
          const offField = ex < 8 || inPocket(ex, ey) || Math.hypot(ex - T.arch.x, ey - T.arch.y) > T.arch.R - 1 && ey < T.arch.y;
          const onWall = WALLS.some((w) => { const dx = w[2] - w[0], dy = w[3] - w[1], l2 = dx * dx + dy * dy || 1, t = clamp(((ex - w[0]) * dx + (ey - w[1]) * dy) / l2, 0, 1); return Math.hypot(ex - w[0] - dx * t, ey - w[1] - dy * t) < 3; })
            || (T.voids || []).some((v) => inPoly(v, ex, ey));
          if (offField || onWall) { posts.push([ex, ey, p[2] - 0.3, 1.1, true]); last = i; break; }
        }
      }
      const clearMat = keep(new THREE.MeshPhysicalMaterial({ color: TH_.ramp, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.9 }));
      const rampClear = new THREE.Mesh(keep(clear.geometry()), clearMat); rampClear.renderOrder = 3; group.add(rampClear);
      const wallMat = keep(new THREE.MeshStandardMaterial({ color: TH_.rampWall, emissive: new THREE.Color(TH_.rampWall), emissiveIntensity: 0.22, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.36, depthWrite: false, side: THREE.DoubleSide }));
      const rampWalls = new THREE.Mesh(keep(walls.geometry()), wallMat); rampWalls.renderOrder = 4; group.add(rampWalls);
      ledMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(TH_.led).multiplyScalar(1.4) }));
      group.add(R1(new THREE.Mesh(keep(led.geometry()), ledMat)));
    }
    function inPoly(p, x, y) { let ins = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) ins = !ins; return ins; }

    // ---- the wire rail (Ember Peak's crater shot lands on it): two chrome wires under the ball, a keel wire, hoops,
    // and posts up from the cabinet's side; it follows the carry's own path exactly, from its railAt step to the end
    const rail = { hoop: null };
    const carry = T.volcano && T.carries ? T.carries[T.volcano.carry] : null;
    if (carry) {
      const pts = carry.pts.filter((p) => p[3] >= carry.railAt), P = [];
      for (let i = 0; i < pts.length - 1; i++) {   // the polyline the ball rides, every 3 units
        const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.ceil(l / 3));
        for (let k = 0; k < n; k++) { const u = k / n; P.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]); }
      }
      P.push(pts[pts.length - 1].slice(0, 3));
      const side = (off, dz) => P.map((p, i) => {
        const q0 = P[Math.max(0, i - 1)], q1 = P[Math.min(P.length - 1, i + 1)]; let tx = q1[0] - q0[0], ty = q1[1] - q0[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        return [p[0] - ty * off, p[1] + tx * off, p[2] + dz];
      });
      const rg = new Geo();
      wire(rg, side(4.6, 0.7), 0.85, 7); wire(rg, side(-4.6, 0.7), 0.85, 7); wire(rg, side(0, -3.2), 0.7, 6);
      for (let i = 4; i < P.length - 2; i += 6) {   // hoops: a U from wire to wire under the ball
        const q = P[i], q1 = P[i + 1]; let tx = q1[0] - q[0], ty = q1[1] - q[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const U = []; for (let k = 0; k <= 8; k++) { const a = Math.PI * k / 8, o = Math.cos(a) * 4.6, dz = 0.7 - Math.sin(a) * 3.9; U.push([q[0] - ty * o, q[1] + tx * o, q[2] + dz]); }
        wire(rg, U, 0.5, 5);
      }
      // posts: from the top of the cabinet's side up to the rail, with an arm across
      let lastY = -999;
      P.forEach((p) => {
        if (p[1] - lastY < 70 || p[2] < H.wood + 3 || p[1] < 140) return;
        lastY = p[1]; const sx = 1.5, top = p[2] - 3.2;
        wire(rg, [[sx, p[1], H.wood], [sx, p[1], top]], 1.1, 8);
        wire(rg, [[sx, p[1], top], [p[0], p[1], top]], 0.8, 6);
      });
      const railMesh = RF(new THREE.Mesh(keep(rg.geometry()), M.chrome)); railMesh.userData.thin = true; railMesh.name = 'wire rail'; group.add(railMesh);
      // the catcher hoop where the ball lands on the rail
      const s0 = P[0], s1 = P[2], hg = keep(new THREE.TorusGeometry(10, 0.9, 8, 28));
      const hoop = R1(new THREE.Mesh(hg, M.chrome)); hoop.userData.thin = true; hoop.position.set(wx(s0[0]), s0[2] + BR, wz(s0[1]));
      hoop.lookAt(new THREE.Vector3(wx(s1[0]), s1[2] + BR, wz(s1[1])));
      group.add(hoop); rail.hoop = hoop; rail.P = P;
    }

    const chromeMesh = RF(new THREE.Mesh(keep(chrome.geometry()), M.chrome)); group.add(chromeMesh);

    // ---- the cabinet: sides and back, the front and lockdown bar; the corners outside the arch
    const wood = new Geo();
    box(wood, WOOD_L, 8, 0, H.wood, -18, TH + 0.5); box(wood, 264, WOOD_R, 0, H.wood, -18, TH + 0.5);
    box(wood, WOOD_L, WOOD_R, 0, H.wood, -18, 3);
    box(wood, WOOD_L, WOOD_R, 0, H.front, TH + 0.5, TH + 24);
    if (ISLAND) { box(wood, WOOD_L, WOOD_R, -14, -1.5, -18, TH + 24); }   // (its underside: seen from the low angles)
    group.add(RF(new THREE.Mesh(keep(wood.geometry()), M.wood)));
    const backbox = new THREE.Group(); group.add(backbox);
    if (!ISLAND) {   // the old table's backbox: only its lit speaker panel shows, in the strip above the arch
      const sp = keep(tex(speakerCanvas(), { aniso: ANISO })), pg = keep(new THREE.PlaneGeometry(WOOD_R - WOOD_L, 60));
      const panel = new THREE.Mesh(pg, keep(new THREE.MeshStandardMaterial({ map: sp, emissiveMap: sp, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.4, metalness: 0.3 })));
      panel.position.set(wx((WOOD_L + WOOD_R) / 2), H.wood + 30, wz(-18.3)); backbox.add(panel);
      const sides = new Geo(); box(sides, WOOD_L - 6, WOOD_R + 6, 0, H.wood + 64, -46, -18.4);
      backbox.add(new THREE.Mesh(keep(sides.geometry()), M.wood));
    }
    (function () {
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
      [-1, 1].forEach((s) => { group.add(R1(new THREE.Mesh(keep(extrude(corner(s), 0, 4, 0)), M.black))); });
    })();
    const lockGeo = keep(new THREE.CylinderGeometry(4.5, 4.5, 300, 24)); lockGeo.rotateZ(Math.PI / 2);
    const lock = R1(new THREE.Mesh(lockGeo, keep(new THREE.MeshStandardMaterial({ color: ISLAND ? 0xd8b25a : 0x2a2e36, metalness: 1, roughness: 0.35, envMapIntensity: 0.6 }))));
    lock.position.set(wx(136), H.front + 3, wz(TH + 12)); group.add(lock);

    // ---- the summit deck and other closed spaces: raised rock blocks
    (T.voids || []).forEach((v) => { const g = keep(extrude(v, 0, H.void - 1, 1)); group.add(R1(new THREE.Mesh(g, M.rock))); });

    // ---- the apron (under the inlanes of the first pair of flippers, to the drain)
    (function () {
      const F = T.flippers[0]; let fl = null;
      WALLS.forEach((w) => { if (w[1] < w[3] && w[0] < w[2] && w[2] < MID && w[3] > F.y - 44 && w[3] < F.y && Math.abs(w[2] - F.x) < 20) fl = w; });
      if (!fl) fl = [24, F.y - 24, 70, F.y - 5];
      const gap = 15, tipY = F.y + Math.sin(F.rest) * F.len + 7;
      const left = [[fl[0], fl[1] + 3], [fl[2], fl[3] + 3], [F.x + 2, F.y + 8], [MID - gap - 6, tipY + 3], [MID - gap, tipY + 6], [MID - gap, TH], [fl[0], TH]];
      const right = left.map((p) => [2 * MID - p[0], p[1]]).reverse();
      const mat = keep(new THREE.MeshPhysicalMaterial({ map: pfTex, roughness: 0.35, metalness: 0.1, clearcoat: ISLAND ? 0.4 : 0.8, clearcoatRoughness: ISLAND ? 0.2 : 0.1, envMap: envRT.texture, envMapIntensity: ISLAND ? 0.25 : 1 }));
      [left, right].forEach((P) => { const g = keep(extrude(P, 0, H.apron - 0.8, 0.8)); planarUV(g, 0, 0, TW, TH); group.add(R1(new THREE.Mesh(g, mat))); });
      const dg = keep(new THREE.PlaneGeometry(2 * gap, TH - tipY - 6)); dg.rotateX(-Math.PI / 2);
      const drain = new THREE.Mesh(dg, keep(new THREE.MeshBasicMaterial({ color: ISLAND ? 0x062a3a : 0x010103 }))); drain.position.set(wx(MID), 0.08, wz((tipY + 6 + TH) / 2)); group.add(drain);
    })();

    // ---- slingshots: white rubber round the posts, a coloured plastic on top
    const slings = T.slings.map((s, i) => {
      const col = TH_.sling[i % 2], tri = [s.a, s.b, s.c];
      const rub = new Geo(); sweep(rub, offsetPoly(tri, 1.5, 8), 1.0, 6, { closed: true, base: 3 });
      group.add(R1(new THREE.Mesh(keep(rub.geometry()), M.rubberW)));
      const outline = offsetPoly(tri, 3.8, 6), xs = outline.map((p) => p[0]), ys = outline.map((p) => p[1]);
      let bx = [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1], art = null;
      if (artSource === 'PinArt' && typeof PinArt.plastic === 'function') {
        try { const c = PinArt.plastic(i ? 'slingR' : 'slingL', ART_SCALE, tid); if (c && c.width && c.x0 != null) { art = c; bx = [c.x0, c.y0, c.x0 + c.qw, c.y0 + c.qh]; } } catch (e) { art = null; }
      }
      if (!art) art = plasticCanvas(col, TH_.slingArt[i % 2], bx[0], bx[1], bx[2], bx[3], outline);
      const at = keep(tex(art, { aniso: ANISO }));
      const mat = keep(new THREE.MeshStandardMaterial({ map: at, emissiveMap: at, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.16, metalness: 0, transparent: true, opacity: 0.9 }));
      const g = keep(extrude(outline, H.sling, 1.2, 0.4)); planarUV(g, bx[0], bx[1], bx[2], bx[3]);
      const plastic = RF(new THREE.Mesh(g, mat)); plastic.renderOrder = 2; group.add(plastic);
      return { mat, flash: 0, col };
    });

    // ---- pop bumpers (Ember Peak: fumaroles - a rock chimney, a glowing collar, a vent cap)
    const cylinder = (rt, rb, h, seg, open) => keep(new THREE.CylinderGeometry(rt, rb, h, seg || 32, 1, !!open));
    const bumpers = BUMPERS.map((Bm, i) => {
      const th = TH_.bump[i % 3], col = new THREE.Color(th.c), grp = new THREE.Group(); grp.position.set(wx(Bm.x), 0, wz(Bm.y)); group.add(grp);
      const v2 = (a) => a.map((q) => new THREE.Vector2(q[0], q[1]));
      const base = R1(new THREE.Mesh(cylinder(Bm.r + 2.6, Bm.r + 2.9, 0.8), M.black)); base.position.y = 0.4; grp.add(base);
      grp.add(R1(new THREE.Mesh(keep(new THREE.LatheGeometry(v2([[Bm.r + 2.6, 0.2], [Bm.r + 2.3, 0.9], [Bm.r + 1.0, 2.0], [Bm.r + 0.1, 3.1], [Bm.r - 0.3, 3.8]]), 40)), ISLAND ? M.rock : M.chrome)));
      const skirtMat = keep(new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, roughness: 0.25, transparent: true, opacity: 0.9 }));
      const skirt = R1(new THREE.Mesh(cylinder(Bm.r - 0.3, Bm.r - 0.1, 6.4), skirtMat)); skirt.position.y = 7; grp.add(skirt);
      const body = R1(new THREE.Mesh(cylinder(Bm.r - 6, Bm.r - 5.4, 10), ISLAND ? M.rock : M.batW)); body.position.y = 15; grp.add(body);
      const ring = R1(new THREE.Mesh(cylinder(Bm.r + 0.6, Bm.r + 0.6, 1.6, 40), M.chrome)); ring.position.y = 11; grp.add(ring);
      const capTex = keep(tex(capCanvas(th.c, th.art), { aniso: ANISO }));
      const sideMat = keep(new THREE.MeshStandardMaterial({ color: ISLAND ? 0x2a2026 : col, emissive: col, emissiveIntensity: 0.9, roughness: ISLAND ? 0.7 : 0.2, transparent: !ISLAND, opacity: ISLAND ? 1 : 0.94 }));
      const topMat = keep(new THREE.MeshPhysicalMaterial({ map: capTex, emissiveMap: capTex, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }));
      const CR = Bm.r + 1.2, rimY = H.bumpCap - 5.8;
      const rim = R1(new THREE.Mesh(cylinder(CR, CR - 0.8, 2.6, 40, true), sideMat)); rim.position.y = rimY + 1.3; grp.add(rim);
      const under = R1(new THREE.Mesh(keep(new THREE.RingGeometry(Bm.r - 5.6, CR - 0.8, 40).rotateX(Math.PI / 2)), sideMat)); under.position.y = rimY; grp.add(under);
      const domeG = keep(new THREE.SphereGeometry(CR, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2)); domeG.scale(1, 3.2 / CR, 1);
      { const P = domeG.attributes.position, uv = domeG.attributes.uv; for (let k = 0; k < P.count; k++) uv.setXY(k, P.getX(k) / (2 * CR) + 0.5, 0.5 - P.getZ(k) / (2 * CR)); }
      const cap = R1(new THREE.Mesh(domeG, topMat)); cap.position.y = rimY + 2.6; cap.name = 'bumper cap'; grp.add(cap);
      return { grp, ring, skirtMat, sideMat, topMat, col, hit: 0, x: Bm.x, y: Bm.y };
    });

    // ---- flippers: white bats with coloured rubbers (every flipper in the table's data)
    function batShape(r0, r1, len) {
      const al = Math.acos(clamp((r0 - r1) / len, -1, 1)), s = new THREE.Shape();
      s.absarc(0, 0, r0, al, 2 * Math.PI - al, false); s.absarc(len, 0, r1, -al, al, false); s.closePath();
      return s;
    }
    const flippers = T.flippers.map((f) => {
      const grp = new THREE.Group(); grp.position.set(wx(f.x), 0, wz(f.y)); group.add(grp);
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

    // ---- drop targets (invader faces; Ember Peak: obsidian glass) that sink when hit
    const dAtlas = keep(tex(dropsAtlas(TH_), { aniso: ANISO }));
    const drops = DROPS.map((d, i) => {
      const len = Math.hypot(d.bx - d.ax, d.by - d.ay) + 1.6, th = 3.4;
      const g = keep(new THREE.BoxGeometry(len, H.drop, th)), uv = g.attributes.uv;
      for (let v = 0; v < uv.count; v++) {
        if (v >= 16 && v < 20) uv.setXY(v, ((i % 5) * 64 + 1 + uv.getX(v) * 62) / 384, uv.getY(v));
        else uv.setXY(v, (322 + uv.getX(v) * 60) / 384, uv.getY(v));
      }
      const mat = keep(ISLAND
        ? new THREE.MeshPhysicalMaterial({ map: dAtlas, emissiveMap: dAtlas, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMap: envRT.texture, envMapIntensity: 1.2 })
        : new THREE.MeshStandardMaterial({ map: dAtlas, emissiveMap: dAtlas, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.05 }));
      const grp = new THREE.Group(); grp.position.set(wx((d.ax + d.bx) / 2 - d.fx * 0.4), 0, wz((d.ay + d.by) / 2 - d.fy * 0.4));
      grp.rotation.y = Math.atan2(-(d.by - d.ay), d.bx - d.ax);
      const m = R1(new THREE.Mesh(g, mat)); m.position.y = H.drop / 2; grp.add(m); group.add(grp);
      const slot = new THREE.Mesh(keep(new THREE.PlaneGeometry(len + 0.6, th + 0.8)), M.black); slot.rotation.x = -Math.PI / 2; slot.position.y = 0.05; grp.add(slot);
      return { m, mat, down: 0, base: mat.emissiveIntensity };
    });

    // ---- the saucer (the old table's hangar cup)
    if (T.saucer) (function () {
      const S = T.saucer, hc = cv(64, 64), g = hc.getContext('2d'), q = g.createRadialGradient(32, 32, 4, 32, 32, 32);
      q.addColorStop(0, '#000000'); q.addColorStop(0.65, '#05030c'); q.addColorStop(0.85, '#2a2050'); q.addColorStop(1, 'rgba(40,30,80,0)');
      g.fillStyle = q; g.fillRect(0, 0, 64, 64);
      const hg = keep(new THREE.PlaneGeometry(22, 22)); hg.rotateX(-Math.PI / 2);
      const hole = new THREE.Mesh(hg, keep(new THREE.MeshBasicMaterial({ map: keep(tex(hc)), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
      hole.position.set(wx(S.x), 0.07, wz(S.y)); group.add(hole);
      const rim = R1(new THREE.Mesh(keep(new THREE.TorusGeometry(9, 0.9, 12, 40)), M.chrome)); rim.rotation.x = Math.PI / 2; rim.position.set(wx(S.x), 0.4, wz(S.y)); group.add(rim);
    })();

    // ---- the spinner, the gates
    const spinner = (function () {
      const L = T.sensors.lines.find((l) => l[0] === 'spin'); if (!L) return null;
      const y = L[2], x0 = L[1], x1 = L[3], hy = 15.5;
      const wg = new Geo(); sweep(wg, [[x0 - 1, y, hy], [x1 + 1, y, hy]], 0.55, 1.1, { bottom: -0.55 });
      posts.push([x0 - 1, y, hy + 1.2, 1.0], [x1 + 1, y, hy + 1.2, 1.0]);
      group.add(R1(new THREE.Mesh(keep(wg.geometry()), M.chrome)));
      const grp = new THREE.Group(); grp.position.set(wx((x0 + x1) / 2), hy, wz(y)); group.add(grp);
      const plate = R1(new THREE.Mesh(keep(new THREE.BoxGeometry(x1 - x0 - 3, 10, 0.7)), keep(new THREE.MeshStandardMaterial({ map: keep(tex(spinnerCanvas(TH_))), roughness: 0.3, metalness: 0.4 }))));
      plate.position.y = -5.6; grp.add(plate);
      return grp;
    })();
    (function () {
      const g = new Geo(), f = new Geo();
      GATES.forEach((s) => {
        sweep(g, [[s.ax, s.ay, 11.5], [s.bx, s.by, 11.5]], 0.6, 1.2, { bottom: -0.6 });
        const mx = (s.ax + s.bx) / 2, my = (s.ay + s.by) / 2, dx = (s.bx - s.ax) * 0.44, dy = (s.by - s.ay) * 0.44;
        ribbon(f, [[mx - dx, my - dy, 0], [mx + dx, my + dy, 0]], 0, 3.2, 11.2);
      });
      if (!g.empty) group.add(R1(new THREE.Mesh(keep(g.geometry()), M.chrome)));
      if (!f.empty) group.add(R1(new THREE.Mesh(keep(f.geometry()), keep(new THREE.MeshStandardMaterial({ color: 0xb8c0d0, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide })))));
    })();

    // ---- the plunger: a chrome rod, a rubber tip, a spring, the housing
    const plunger = (function () {
      const S = T.shooter, grp = new THREE.Group(); group.add(grp);
      const rodG = cylinder(1.3, 1.3, 40, 16); rodG.rotateX(Math.PI / 2); rodG.translate(0, 0, 20);
      const rod = R1(new THREE.Mesh(rodG, M.chrome)); grp.add(rod);
      const tipG = cylinder(5.2, 5.2, 4.5, 24); tipG.rotateX(Math.PI / 2); tipG.translate(0, 0, 2.25);
      const tip = R1(new THREE.Mesh(tipG, M.rubberB)); grp.add(tip);
      const coil = []; for (let k = 0; k <= 240; k++) { const a = k / 240 * Math.PI * 2 * 9; coil.push(new THREE.Vector3(Math.cos(a) * 3.4, Math.sin(a) * 3.4, k / 240)); }
      const spring = R1(new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 480, 0.55, 6, false)), M.darkChrome)); grp.add(spring);
      const housingG = cylinder(5.5, 5.5, 10, 24); housingG.rotateX(Math.PI / 2);
      const housing = R1(new THREE.Mesh(housingG, M.chrome)); housing.position.set(wx(S.cx), 7, wz(TH - 2)); group.add(housing);
      return { rod, tip, spring };
    })();

    // ---- posts (chrome, instanced) and the rubber rings on the rubber posts
    const postGeo = keep(new THREE.LatheGeometry([[0, 0], [1, 0], [1, 0.86], [0.8, 0.95], [0.45, 1], [0, 1.02]].map((q) => new THREE.Vector2(q[0], q[1])), 16));
    T.slings.forEach((s) => [s.a, s.b, s.c].forEach((p) => posts.push([p[0], p[1], H.post, 1.6])));
    POSTS.forEach((p) => posts.push([p.x, p.y, H.post, 1.3]));
    if (T.lava) T.lava.gates.forEach((g) => { posts.push([g[0], g[1], 30, 2.4], [g[2], g[3], 30, 2.4]); });
    const postMesh = R1(new THREE.InstancedMesh(postGeo, M.chrome, posts.length));
    { const m = new THREE.Matrix4(); posts.forEach((p, i) => { m.makeScale(p[3], p[2], p[3]); m.setPosition(wx(p[0]), 0, wz(p[1])); postMesh.setMatrixAt(i, m); }); }
    group.add(postMesh);
    if (POSTS.length) {
      const ringGeo = keep(new THREE.TorusGeometry(1, 0.42, 10, 28)); ringGeo.rotateX(Math.PI / 2);
      const rings = R1(new THREE.InstancedMesh(ringGeo, M.rubberB, POSTS.length));
      { const m = new THREE.Matrix4(); POSTS.forEach((p, i) => { const r = p.r - 0.55; m.makeScale(r, r * 1.6, r); m.setPosition(wx(p.x), 6.5, wz(p.y)); rings.setMatrixAt(i, m); }); }
      group.add(rings);
    }

    // ================================================================ Ember Peak's toys
    const toys = {};
    // ---- the volcano: a cone of black rock that rises with the pressure (scaled up from a squat mound: the ball always
    // meets rock at the crater's collision radius), lava veins and the glowing mouth on its skin, a lava pool in the crater
    if (T.volcano) {
      const V = T.volcano, HV = 56.5, grp = new THREE.Group(); grp.position.set(wx(V.x), 0, wz(V.y)); group.add(grp);
      const prof = [[V.r + 2.2, 0], [V.r + 1.4, 6], [V.r + 0.6, 12], [V.r, 20], [V.r - 0.8, 28], [V.r - 2.4, 35], [V.r - 4.6, 42], [V.r - 6.6, 48], [V.r - 8, 52.5], [V.r - 8.8, 55.4], [V.r - 9.6, 56.4], [V.r - 10.8, 56.2], [V.r - 11.8, 54.5], [V.r - 12.6, 52], [V.r - 13.2, 51.2]];
      const cg = keep(new THREE.LatheGeometry(prof.map((q) => new THREE.Vector2(q[0], q[1])), 56));
      { const P = cg.attributes.position, uv = cg.attributes.uv; for (let k = 0; k < P.count; k++) uv.setY(k, clamp(P.getY(k) / HV, 0, 1)); }
      const cc = coneCanvases(), ct = keep(tex(cc.col, { wrapS: true, aniso: ANISO })), cgt = keep(tex(cc.glo, { wrapS: true }));
      const coneMat = keep(new THREE.MeshStandardMaterial({ map: ct, emissiveMap: cgt, emissive: new THREE.Color(TH_.lava), emissiveIntensity: 0.8, roughness: 0.82, metalness: 0, envMap: envRT.texture, envMapIntensity: 0.5 }));
      const cone = RF(new THREE.Mesh(cg, coneMat)); grp.add(cone);
      const poolG = keep(new THREE.CircleGeometry(V.r - 12.4, 32)); poolG.rotateX(-Math.PI / 2);
      const poolMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a1a').multiplyScalar(3) }));
      const pool = R1(new THREE.Mesh(poolG, poolMat)); pool.position.y = 51.4; cone.add(pool);
      // a collar of rubble on the playfield, where it rises out
      const r = rnd(55);
      const rocks = R1(new THREE.InstancedMesh(keep(new THREE.DodecahedronGeometry(1, 0)), M.rock, 30));
      { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2 + r() * 0.15, d = V.r + 2.2 + r() * 2.8, s = 1.4 + r() * 2.1; e.set(r() * 3, r() * 3, r() * 3); q.setFromEuler(e); m.compose(new THREE.Vector3(Math.sin(a) * d, s * 0.35, Math.cos(a) * d), q, new THREE.Vector3(s, s * 0.7, s)); rocks.setMatrixAt(k, m); } }
      grp.add(rocks);
      const lavaLight = RF(new THREE.PointLight(0xff6a1a, 0, 190, 2)); lavaLight.position.set(0, 64, 10); grp.add(lavaLight);
      toys.volcano = { grp, cone, coneMat, poolMat, lavaLight, HV, k: 0.45, fount: 0, lastCarry: 0, smokeAcc: 0, x: V.x, y: V.y, r: V.r };
    }
    // ---- the steam geyser: a hot-spring vent (rock ring, turquoise pool) and its column of steam
    if (T.geyser) {
      const G = T.geyser, grp = new THREE.Group(); grp.position.set(wx(G.x), 0, wz(G.y)); group.add(grp);
      const ring = R1(new THREE.Mesh(keep(new THREE.TorusGeometry(G.r + 0.5, 1.8, 10, 32)), M.rock)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.9; grp.add(ring);
      const poolG = keep(new THREE.CircleGeometry(G.r - 0.5, 28)); poolG.rotateX(-Math.PI / 2);
      const poolMat = keep(new THREE.MeshBasicMaterial({ map: keep(tex(softDot(64, 0.5))), color: new THREE.Color('#8ff4ff').multiplyScalar(1.2), transparent: true, depthWrite: false }));
      const pool = new THREE.Mesh(poolG, poolMat); pool.position.y = 0.2; grp.add(pool);
      toys.geyser = { grp, poolMat, acc: 0, last: 'ready', burst: 0, x: G.x, y: G.y, r: G.r };
    }
    // ---- the magma crabs: a shell with a glowing back, six legs in two segments, claws, eyes on stalks (all instanced
    // but the shells, which glow each on its own)
    if (T.crabs && T.crabs.length) {
      const n = T.crabs.length, sc = shellCanvases(), st = keep(tex(sc.col)), sg = keep(tex(sc.glo));
      const shellG = keep(new THREE.SphereGeometry(1, 24, 14)); shellG.scale(9.6, 4.2, 7.2);
      const legG = keep(new THREE.CylinderGeometry(1, 0.75, 1, 6, 1)); legG.translate(0, 0.5, 0);
      const legMat = keep(new THREE.MeshStandardMaterial({ color: 0xc8401a, roughness: 0.5, emissive: new THREE.Color('#ff4a10'), emissiveIntensity: 0.35 }));
      const clawG = keep(new THREE.SphereGeometry(1, 12, 8)); clawG.scale(3.4, 2.0, 2.6);
      const eyeG = keep(new THREE.SphereGeometry(1, 10, 8));
      const eyeMat = keep(new THREE.MeshStandardMaterial({ color: 0xfff0a0, emissive: new THREE.Color('#ffd84a'), emissiveIntensity: 1.6, roughness: 0.2 }));
      const legs = R1(new THREE.InstancedMesh(legG, legMat, n * 14)), claws = R1(new THREE.InstancedMesh(clawG, legMat, n * 2)), eyes = R1(new THREE.InstancedMesh(eyeG, eyeMat, n * 2));
      [legs, claws, eyes].forEach((m) => { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; group.add(m); });
      const shadows = new THREE.InstancedMesh(shGeo, shadowMat, n); shadows.renderOrder = 1; shadows.frustumCulled = false; group.add(shadows);
      const shells = [];
      for (let i = 0; i < n; i++) {
        const mat = keep(new THREE.MeshStandardMaterial({ map: st, emissiveMap: sg, emissive: new THREE.Color('#ff7a1a'), emissiveIntensity: 1, roughness: 0.45, metalness: 0.05, envMap: envRT.texture, envMapIntensity: 0.6 }));
        const m = R1(new THREE.Mesh(shellG, mat)); group.add(m); shells.push({ m, mat, phase: i * 1.7, px: null, py: null, flash: 0 });
      }
      toys.crabs = { legs, claws, eyes, shadows, shells, n };
    }
    // ---- the lava gates: dark steel panels with a glowing edge that rise to open the lava lanes; the lanes' lava
    if (T.lava) {
      const flow = keep(tex(lavaFlowCanvas(), { repeat: true }));
      const gates = T.lava.gates.map((g) => {
        const len = Math.hypot(g[2] - g[0], g[3] - g[1]), grp = new THREE.Group();
        grp.position.set(wx((g[0] + g[2]) / 2), 0, wz((g[1] + g[3]) / 2)); grp.rotation.y = Math.atan2(-(g[3] - g[1]), g[2] - g[0]); group.add(grp);
        const mat = keep(new THREE.MeshStandardMaterial({ color: 0x2a2228, roughness: 0.4, metalness: 0.7, emissive: new THREE.Color(TH_.lava), emissiveIntensity: 0.3, envMap: envRT.texture }));
        const panel = R1(new THREE.Mesh(keep(new THREE.BoxGeometry(len - 3, H.gate, 2.6)), mat)); panel.position.y = H.gate / 2; grp.add(panel);
        const edge = R1(new THREE.Mesh(keep(new THREE.BoxGeometry(len - 3, 1.2, 2.8)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff8a1a').multiplyScalar(2.2) })))); edge.position.y = H.gate - 0.6; panel.add(edge);
        return { panel, mat, edge };
      });
      // the lava in each lane (the side away from where the gate's own ball comes in: between the summit's side wall and the gate)
      const lanes = T.lava.gates.map((g) => {
        const left = g[5] > g[0];   // (the lane is on the side away from the point given: the side the gate blocks)
        const xa = left ? 31 : g[0] + 1, xb = left ? g[0] - 1 : 2 * MID - 31;
        const ya = Math.min(g[1], g[3]) - 16, yb = Math.max(g[1], g[3]) - 2, w = Math.abs(xb - xa), h = yb - ya;
        const pg = keep(new THREE.PlaneGeometry(w, h)); pg.rotateX(-Math.PI / 2);
        const mat = keep(new THREE.MeshBasicMaterial({ map: flow, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0.6, 0.6, 0.6) }));
        const m = new THREE.Mesh(pg, mat); m.position.set(wx((xa + xb) / 2), 0.25, wz((ya + yb) / 2)); m.renderOrder = 1; group.add(m);
        return { m, mat };
      });
      toys.lava = { gates, lanes, flow };
    }

    // ---- lights: the old table: high-key fill, a strong key, warm GI along the sides; Ember Peak: the sun and the sky,
    // the lava's own glow at the crater; both: one flash light
    const lights = { gi: [] };
    if (ISLAND) {
      lights.hemi = RF(new THREE.HemisphereLight(0xf4f6ff, 0x8a6a48, 1.2)); group.add(lights.hemi);
      lights.key = RF(new THREE.DirectionalLight(0xfff0d8, 2.9)); lights.key.position.copy(KEY).multiplyScalar(600); group.add(lights.key); group.add(lights.key.target);
      lights.rim = RF(new THREE.DirectionalLight(0x9fd8ff, 0.7)); lights.rim.position.set(0, 120, -420); group.add(lights.rim); group.add(lights.rim.target);
    } else {
      lights.hemi = RF(new THREE.HemisphereLight(0xe8ecff, 0x40304a, 1.05)); group.add(lights.hemi);
      lights.key = RF(new THREE.DirectionalLight(0xfff4e6, 2.6)); lights.key.position.copy(KEY).multiplyScalar(600); group.add(lights.key); group.add(lights.key.target);
      [[14, 120], [14, 330], [256, 120], [256, 330], [135, 20], [135, 250]].forEach((p, i) => {
        const l = RF(new THREE.PointLight(i >= 4 ? 0xdde8ff : 0xffcf9a, i === 5 ? 1500 : i === 4 ? 2000 : 2100, 280, 2)); l.position.set(wx(p[0]), i === 5 ? 60 : 19, wz(p[1])); group.add(l); lights.gi.push({ l, base: l.intensity });
      });
      lights.rim = RF(new THREE.DirectionalLight(0xff8ad8, 0.9)); lights.rim.position.set(0, 90, -420); group.add(lights.rim); group.add(lights.rim.target);
    }
    lights.HEMI = lights.hemi.intensity; lights.KEY = lights.key.intensity;
    const flash = RF(new THREE.PointLight(0xffffff, 0, 140, 2)); flash.position.set(0, 18, 0); group.add(flash);

    // ---- lit inserts: lamps.js's (the old table, or any table it covers), else the art's own inserts for this table
    // lit from the world here (a stand-in until lamps.js covers Ember Peak)
    let lamps = null;
    function buildLamps() {
      const PL = window.PinLamps, PA = window.PinArt;
      if (!PA || typeof PA.lampSprite !== 'function') return null;
      let list = null, level = null, byId = null;
      if (PL && typeof PL.forTable === 'function') { const o = PL.forTable(tid); if (o && o.list && o.list.length && o.id === tid) { list = o.list; level = o.level; byId = o.byId || null; } }
      else if (PL && PL.list && typeof PL.level === 'function' && tid === 'orbit') { list = PL.list; level = PL.level; byId = PL.byId || null; }
      if (!list && typeof PA.inserts === 'function') { list = PA.inserts(tid); if (list && list.length) { level = (W, t, mode) => ownLevels(W, t, mode, list); byId = {}; list.forEach((l, i) => { byId[l.id] = i; }); } }
      if (!list || !list.length) return null;
      const S = ART_SCALE, sprites = list.map((lp) => { try { return PA.lampSprite(lp, S); } catch (e) { return null; } });
      const AW = 2048; let x = 0, y = 0, rowH = 0; const slots = [];
      sprites.forEach((c) => {
        if (!c || !c.width) { slots.push(null); return; }
        if (x + c.width > AW) { x = 0; y += rowH + 2; rowH = 0; }
        slots.push({ x, y }); x += c.width + 2; rowH = Math.max(rowH, c.height);
      });
      let AH = 64; while (AH < y + rowH) AH *= 2;
      const atlas = cv(AW, AH), g = atlas.getContext('2d');
      sprites.forEach((c, i) => { if (slots[i]) g.drawImage(c, slots[i].x, slots[i].y); });
      const n = list.length, pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), colr = new Float32Array(n * 12), idx = [];
      list.forEach((lp, i) => {
        const sl = slots[i], c = sprites[i]; if (!sl) return;
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
      const mesh = RF(new THREE.Mesh(geo, mat)); mesh.renderOrder = 1; mesh.frustumCulled = false; group.add(mesh);
      return { list, mesh, ca, cur: new Float32Array(n), cool: new Float32Array(n), tg: new Float32Array(n), level, byId };
    }
    let ownOut = null;
    function ownLevels(W, t, mode, list) {   // the art's inserts lit from the world alone (ids from PinArt.inserts)
      if (!ownOut || ownOut.length !== list.length) ownOut = new Float32Array(list.length);
      const o = ownOut, blink = (p, ph) => (Math.floor((t + (ph || 0)) / p) % 2 ? 1 : 0.06), breathe = (p, ph) => 0.1 + 0.12 * (0.5 + 0.5 * Math.sin((t + (ph || 0)) / p));
      const title = mode === 'title' || (W && W.demo), dead = !!(W && (W.tilted || W.over)) && !title;
      const V = W && W.toys && W.toys.volcano, Lv = W && W.toys && W.toys.lava, G = W && W.toys && W.toys.geyser, lit = (W && W.lit) || {};
      for (let i = 0; i < list.length; i++) {
        const l = list[i], id = l.id; let v = 0;
        if (dead) { o[i] = 0; continue; }
        if (title) { o[i] = 0.5 + 0.5 * Math.sin(t / 260 - (l.step || i) * 0.7); continue; }
        if (/^press\d/.test(id)) { const k = +id.slice(5), p = V ? V.pressure : 0; v = p >= (k + 1) / 8 ? (p > 1 ? blink(140, k * 30) : 1) : (p >= k / 8 ? 0.35 : 0.06); }
        else if (/^lane\d/.test(id)) { const k = +id.slice(4); v = W.skillOpen && W.skill === k ? blink(160) : W.lanes && W.lanes[k] ? 1 : breathe(500, k * 300); }
        else if (id === 'crater') v = V && V.busy ? 1 : V && V.pressure >= 1 ? blink(120) : blink(420) * 0.5 + 0.05;
        else if (id === 'lavaL' || id === 'lavaR') v = Lv && Lv.open ? blink(110, id === 'lavaR' ? 110 : 0) : 0.05;
        else if (id === 'ramp') v = lit.ramp > 0 ? 1 : W.comboT > 0 ? blink(120) : breathe(380);
        else if (id === 'orbitL') v = lit.orbitL > 0 ? 1 : W.comboT > 0 ? blink(120, 60) : breathe(420, 200);
        else if (id === 'orbitR') v = lit.orbitR > 0 ? 1 : W.comboT > 0 ? blink(120, 0) : breathe(420, 500);
        else if (id === 'kick') v = W.kickback ? 1 : 0.05;
        else if (id === 'save') v = W.saveT > 0 ? blink(200) : 0.04;
        else if (id === 'geyser') v = G ? (G.st === 'puff' ? blink(70) : G.st === 'ready' ? 0.85 : 0.08) : 0;
        else if (/^drop\d/.test(id)) { const k = +id.slice(4); v = W.drops && !W.drops[k] ? 1 : 0.06; }
        else v = breathe(500, i * 97);
        o[i] = v;
      }
      return o;
    }
    lamps = buildLamps();

    // ---- the home framings (what must be in the picture: table x, y, height)
    const A = T.arch, homeSpecs = {};
    const sides = [[8, TH - 6, 0], [TW - 6, TH - 4, 0], [8, TH - 66, 0], [TW - 6, TH - 66, 0], [266, TH * 0.67, 0]];
    homeSpecs.whole = tid === 'orbit'
      ? { top: [[136, 2.5, H.arch + 0.5]], bot: [[136, 448, H.front + 0.5]], side: [[8, 440, 0], [264, 442, 0], [8, 380, 0], [264, 380, 0], [266, 300, 0]] }
      : { top: [[A.x, A.y - A.R - A.r - 1.5, H.arch + 0.5]], bot: [[A.x, TH + 2, H.front + 0.5]], side: sides };
    (T.storeys || []).forEach((s) => {
      const fl = s.flippers.map((i) => T.flippers[i]), fy = Math.max(...fl.map((f) => f.y));
      const lowest = s.y1 >= TH - 1;
      homeSpecs[s.id] = {
        top: [[MID, s.y0 <= 0 ? A.y - A.R - A.r - 1.5 : Math.max(0, s.y0 - 24), s.y0 <= 0 ? H.arch + 0.5 : 0]],
        bot: lowest ? [[A.x, TH + 2, H.front + 0.5]] : [[MID, fy + 44, 0]],
        side: lowest ? sides : [[Math.max(6, s.x0), fy, 0], [Math.min(TW - 6, s.x1 + 24), fy, 0], [6, (s.y0 + fy) / 2, 0], [TW - 4, (s.y0 + fy) / 2, 0]]
      };
    });
    // the old non-fill framing (the whole cabinet), for the bench's tilt studies
    const fitPts = [];
    [-3, TW + 3].forEach((x) => [-6, TH + 6].forEach((y) => [0, H.wood + 2].forEach((h) => fitPts.push([x, y, h]))));
    if (RAMP) for (let s = 0; s <= RAMP.L; s += RAMP.L / 12) { const r = rampAt(s); fitPts.push([r.x, r.y, r.z + H.rampWall + 1]); }

    // ---- occluders for the sight-line check: everything solid
    function occluders() {
      const out = [];
      group.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.visible && !o.userData.thin && !(o.material && (o.material.transparent || o.material === shadowMat)) && !balls.some((Bb) => Bb.m === o)) out.push(o); });
      return out;
    }

    function dispose() {
      disposables.forEach((d) => { try { d.dispose(); } catch (e) {} });
      if (skyTex) skyTex.dispose();
    }
    return {
      id: tid, T, B, TW, TH, MID, BR, ISLAND, theme: TH_, group, world, envRT, ballSky, M, liftU, LIFT, pfMatHi, pfMatLo, playfield, ledMat, rail,
      slings, bumpers, flippers, drops, spinner, plunger, toys, lights, flash, flashK: 0, lamps, homeSpecs, fitPts, backbox,
      artSource, artMs, occluders, dispose, buildLamps: () => (lamps = buildLamps()), get lampsObj() { return lamps; }, set lampsObj(v) { lamps = v; },
      rampAt, RAMP, giNow: 1, paintSky: null, skyKeyRef: { skyTex, skyKey }
    };
  }

  function useTable(id) {
    if (TB) { if (TB.world) { scene.remove(TB.world.group); cab.remove(TB.world.skirt); } mover.remove(TB.group); TB.dispose(); }
    TB = buildTable(id);
    mover.add(TB.group);
    TB.group.add(glowPts.pts, puffPts.pts); pops.forEach((sp) => TB.group.add(sp)); balls.forEach((Bb) => { TB.group.add(Bb.m, Bb.s, Bb.s2); });
    mover.add(units);
    units.matrix.set(1, 0, 0, -HW, 0, 0, 1, 0, 0, 1, 0, -ZC, 0, 0, 0, 1); units.matrixWorldNeedsUpdate = true;
    if (TB.world) { scene.add(TB.world.group); cab.add(TB.world.skirt); }
    scene.environment = TB.envRT.texture;
    scene.background = TB.ISLAND ? new THREE.Color(0x8fd0ff) : new THREE.Color(0x07060c);
    renderer.toneMappingExposure = TB.theme.exposure;
    applyTierToTable();
    motes.length = 0; trails.clear();
    if (particles && typeof particles.setOrigin === 'function') { try { particles.setOrigin(HW, ZC); } catch (e) {} }
    fit();
  }

  // ---------------------------------------------------------------- the camera
  let view = { tilt: HOME_TILT, fov: FOV, fill: opts.fill !== false };
  let camOverride = null, camSource = 'home', camErr = 0;
  const camBase = new THREE.Vector3(), camR = new THREE.Vector3(1, 0, 0), camU = new THREE.Vector3(0, 1, 0), camLook = new THREE.Vector3();
  let HOME = null, homes = {};
  const CABQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(PITCH, 0, 0)), CABQI = CABQ.clone().invert();
  const toCab = (x, y, h) => new THREE.Vector3(wx(x), h, wz(y)).applyQuaternion(CABQ);
  function cabBasis() { return CABQ; }
  // solve one framing at a tilt: top points on the top edge, bottom points on the bottom edge, the sides inside
  function solve(spec, tiltDeg, fov) {
    const q = cabBasis(), tilt = clamp(tiltDeg, 0, 80) * DEG;
    const F = new THREE.Vector3(0, -Math.cos(tilt), -Math.sin(tilt)).applyQuaternion(q);
    const U = new THREE.Vector3(0, Math.sin(tilt), -Math.cos(tilt)).applyQuaternion(q);
    const Rv = new THREE.Vector3().crossVectors(F, U);
    const margin = opts.margin != null ? opts.margin : 0.985, tV = Math.tan(fov * DEG / 2) * margin, tH = tV * (RW / RH);
    const Bp = (a) => a.map((p) => { const v = toCab(p[0], p[1], p[2]); return [v.dot(Rv), v.dot(U), v.dot(F)]; });
    const top = Bp(spec.top), bot = Bp(spec.bot), side = Bp(spec.side), Pn = top.concat(bot, side);
    const tTop = (d) => Math.max(...top.map((p) => p[1] - tV * (p[2] - d))), tBot = (d) => Math.min(...bot.map((p) => p[1] + tV * (p[2] - d)));
    const sOf = (d) => { let lo = -4000, hi = 4000; for (let k = 0; k < 70; k++) { const m = (lo + hi) / 2, l = Math.max(...side.map((p) => (m - p[0]) / (p[2] - d))), r = Math.max(...side.map((p) => (p[0] - m) / (p[2] - d))); if (l > r) hi = m; else lo = m; } return (lo + hi) / 2; };
    const need = (d) => { const c = sOf(d); return Math.max(...side.map((p) => Math.abs(p[0] - c) / (p[2] - d))) / tH; };
    const wn = Math.min(...Pn.map((p) => p[2])) - 4;
    let a = wn - 12000, b = wn; for (let k = 0; k < 90; k++) { const m = (a + b) / 2; if (tTop(m) > tBot(m)) b = m; else a = m; } let w = a;
    if (need(w) > 1) { let c = w - 12000, d = w; for (let k = 0; k < 90; k++) { const m = (c + d) / 2; if (need(m) > 1) d = m; else c = m; } w = c; }
    const t = tBot(w), s = (() => { const c = sOf(w); return Math.abs(c) < 1e6 ? c : 0; })();
    const pos = new THREE.Vector3().addScaledVector(Rv, s).addScaledVector(U, t).addScaledVector(F, w);
    const near = Math.max(1, (Math.min(...Pn.map((p) => p[2])) - w) * 0.4);
    return { pos, F, U, R: Rv, near, fov, look: lookOnTable(pos, F) };
  }
  function lookOnTable(pos, F) {   // where a camera's middle ray meets the playfield (table units [x, y, 0])
    const p = pos.clone().applyQuaternion(CABQI), f = F.clone().applyQuaternion(CABQI);
    const k = Math.abs(f.y) > 1e-6 ? -p.y / f.y : 0;
    return [p.x + f.x * k + HW, p.z + f.z * k + ZC, 0];
  }
  function toUnits(v) { const p = v.clone().applyQuaternion(CABQI); return [p.x + HW, p.z + ZC, p.y]; }
  function fit() {
    if (!TB || !RW) return;
    if (view.fill) {
      HOME = solve(TB.homeSpecs.whole, view.tilt, view.fov);
      homes = {};
      for (const k in TB.homeSpecs) { const h = k === 'whole' ? HOME : solve(TB.homeSpecs[k], view.tilt, view.fov); homes[k] = { eye: toUnits(h.pos), look: h.look, fov: h.fov }; }
    } else HOME = solveCabinet();
    place(HOME);
    TB.backbox.visible = !!view.fill;
    if (!TB.ISLAND) {
      if (view.fill) { if (TB.skyKeyRef.skyTex) { TB.skyKeyRef.skyTex.dispose(); TB.skyKeyRef.skyTex = null; TB.skyKeyRef.skyKey = ''; } scene.background = new THREE.Color(0x07060c); }
      else paintSpace();
    }
    place(HOME);
  }
  function solveCabinet() {   // the old non-fill framing: the whole cabinet, any room left over above its far end
    const q = cabBasis(), tilt = clamp(view.tilt, 0, 80) * DEG, fov = view.fov;
    camera.fov = fov; camera.aspect = RW / RH; camera.updateProjectionMatrix();
    const F = new THREE.Vector3(0, -Math.cos(tilt), -Math.sin(tilt)).applyQuaternion(q), U = new THREE.Vector3(0, Math.sin(tilt), -Math.cos(tilt)).applyQuaternion(q), Rv = new THREE.Vector3().crossVectors(F, U);
    const tV = Math.tan(fov * DEG / 2) * 0.985, tH = tV * camera.aspect;
    const P = TB.fitPts.map((p) => { const v = toCab(p[0], p[1], p[2]); return [v.dot(Rv), v.dot(U), v.dot(F)]; });
    const fH = (s) => { let m = Infinity; for (const p of P) m = Math.min(m, p[2] - Math.abs(p[0] - s) / tH); return m; };
    const gV = (t) => { let m = Infinity; for (const p of P) m = Math.min(m, p[2] - Math.abs(p[1] - t) / tV); return m; };
    const tern = (f, a, b) => { for (let k = 0; k < 80; k++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (f(m1) < f(m2)) a = m1; else b = m2; } return (a + b) / 2; };
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    let s = tern(fH, Math.min(...xs), Math.max(...xs)), t = tern(gV, Math.min(...ys), Math.max(...ys)); const w = Math.min(fH(s), gV(t));
    if (gV(t) > w + 1e-6) { let a = t, b = t + 5000; for (let k = 0; k < 80; k++) { const m = (a + b) / 2; if (gV(m) >= w) a = m; else b = m; } t = a; }
    const pos = new THREE.Vector3().addScaledVector(Rv, s).addScaledVector(U, t).addScaledVector(F, w);
    return { pos, F, U, R: Rv, near: Math.max(1, (Math.min(...P.map((p) => p[2])) - w) * 0.5), fov, look: lookOnTable(pos, F) };
  }
  function paintSpace() {   // the old table's space beyond the far end (again when the view changes)
    const v = new THREE.Vector3(), at = (x, y, h) => { v.copy(toCab(x, y, h)).project(camera); return [(v.x + 1) / 2, (1 - v.y) / 2]; };
    camera.updateMatrixWorld(true);
    const top = at(135, -4, H.wood), l = at(-3, -4, H.wood), rr = at(273, -4, H.wood);
    const key = [top[1], l[0], rr[0]].map((q) => q.toFixed(3)).join(), S = TB.skyKeyRef;
    if (key === S.skyKey) return; S.skyKey = key;
    const old = S.skyTex; S.skyTex = tex(skyCanvas(720, Math.round(720 * RH / RW), clamp(top[1], 0.02, 1), l[0], rr[0])); scene.background = S.skyTex;
    if (old) old.dispose();
  }
  function place(c) {   // a solved framing {pos, F, U, near, fov}
    camera.fov = c.fov || view.fov; camera.aspect = RW / RH;
    camera.position.copy(c.pos); camera.up.copy(c.U); camera.lookAt(c.pos.clone().add(c.F));
    camBase.copy(c.pos); camR.copy(c.R || new THREE.Vector3().crossVectors(c.F, c.U)); camU.copy(c.U);
    camera.near = TB && TB.ISLAND ? Math.max(2, Math.min(c.near || 5, 40)) : Math.max(1, c.near || 5); camera.far = TB && TB.ISLAND ? 9000 : 4000;
    camera.updateProjectionMatrix();
  }
  // a camera from table units: eye and look-at points, or a pose {aim, zoom, pitch, yaw}
  function fromEyeLook(eye, look, fov, roll, up) {
    const pos = toCab(eye[0], eye[1], eye[2]), at = toCab(look[0], look[1], look[2]), F = at.clone().sub(pos);
    const lookT = [look[0], look[1], look[2]];
    if (F.lengthSq() < 1e-6) return null;
    F.normalize();
    // "up" on screen is up the table (towards the arch) as far as the view allows, and never rolled unless asked
    const q = cabBasis(), farEnd = new THREE.Vector3(0, 0, -1).applyQuaternion(q), tUp = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    let U = up ? new THREE.Vector3(up[0], up[2], up[1]).applyQuaternion(q) : farEnd.clone();
    U.addScaledVector(F, -U.dot(F));
    if (U.lengthSq() < 1e-4) U = tUp.clone().addScaledVector(F, -tUp.dot(F));
    U.normalize();
    if (roll) U.applyAxisAngle(F, roll * DEG);
    const Rv = new THREE.Vector3().crossVectors(F, U);
    return { pos, F, U, R: Rv, near: Math.max(2, pos.distanceTo(at) * 0.05), fov: fov || view.fov, look: lookT };
  }
  function fromPose(p) {
    if (!HOME) return null;
    const aim = v3(p.aim) || HOME.look, zoom = clamp(+p.zoom || 1, 0.3, 6);
    const pitch = p.pitch != null ? +p.pitch : HOME_TILT + 9 * (zoom - 1) / 1.2, yaw = (+p.yaw || 0) * DEG, tl = clamp(pitch, 0, 85) * DEG;
    const at = toCab(aim[0], aim[1], aim[2] || 0), dHome = HOME.pos.distanceTo(toCab(HOME.look[0], HOME.look[1], 0));
    const q = cabBasis(), yq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const F = new THREE.Vector3(0, -Math.cos(tl), -Math.sin(tl)).applyQuaternion(yq).applyQuaternion(q);
    const U = new THREE.Vector3(0, Math.sin(tl), -Math.cos(tl)).applyQuaternion(yq).applyQuaternion(q);
    const d = dHome / zoom, pos = at.clone().addScaledVector(F, -d);
    return { pos, F, U, R: new THREE.Vector3().crossVectors(F, U), near: Math.max(2, d * 0.05), fov: p.fov || view.fov, look: [aim[0], aim[1], aim[2] || 0] };
  }
  function camFrom(r) {
    if (!r || typeof r !== 'object') return null;
    if (r.home === true || r === 'home') return HOME;
    const eye = v3(r.eye || r.pos || r.position || r.from || r.camera), look = v3(r.look || r.at || r.target || r.lookAt || r.to || r.center || r.centre);
    if (eye && look) return fromEyeLook(eye, look, +r.fov || 0, +r.roll || 0, v3(r.up));
    if (r.aim || r.zoom != null) return fromPose(r);
    return null;
  }
  function setCam(c) { camOverride = c || null; }

  // ---------------------------------------------------------------- the size, the tier
  function resize(w, h) {
    RW = Math.max(16, w | 0); RH = Math.max(16, h | 0);
    renderer.setSize(RW, RH, false); composer.setSize(RW, RH);
    sizeBloom();
    fit();
  }
  function sizeBloom() { bloom.setSize(Math.max(32, RW * PR * tier.bloomK * 2), Math.max(32, RH * PR * tier.bloomK * 2)); }
  function applyTierToTable() {
    if (!TB) return;
    TB.playfield.material = tier.clearcoat ? TB.pfMatHi : TB.pfMatLo;
    ballMat.envMap = tier.reflectEvery && opts.reflect !== false ? cubeRT.texture : TB.envRT.texture;
    ballMat.needsUpdate = true;
    if (particles && typeof particles.setTier === 'function') { try { particles.setTier(tierName); } catch (e) {} }
  }
  function setTier(name) {
    if (name === 'auto') { perf.locked = false; return; }
    if (!TIERS[name] || name === tierName) return;
    tierName = name; tier = TIERS[name]; perf.changes++;
    const pr = Math.min(PR_CAP, tier.pr);
    if (pr !== PR) { PR = pr; renderer.setPixelRatio(PR); composer.setPixelRatio(PR); }
    bloom.enabled = tier.bloom;
    if (opts.samples == null) [composer.renderTarget1, composer.renderTarget2].forEach((t) => { if (t.samples !== tier.samples) { t.samples = tier.samples; t.dispose(); } });
    applyTierToTable();
    if (RW) resize(RW, RH);
  }
  function judge(now) {   // the auto tier: frames running late step down; a long steady spell steps back up
    if (!autoTier || perf.locked) return;
    const dt = perf.last ? now - perf.last : 0; perf.last = now;
    if (dt > 0 && dt < 250) { perf.ring.push(dt); if (perf.ring.length > 120) perf.ring.shift(); }
    if (now < perf.evalAt || perf.ring.length < 45) return;
    perf.evalAt = now + 1000;
    const s = perf.ring.slice().sort((a, b) => a - b), med = s[s.length >> 1], p75 = s[Math.floor(s.length * 0.75)], p90 = s[Math.floor(s.length * 0.9)];
    perf.refresh = Math.min(perf.refresh || 1e9, Math.max(6, med));
    const R = perf.refresh;
    if (p75 > R * 1.3 + 2) { perf.bad++; perf.good = 0; } else if (p90 < R * 1.15 + 0.5) { perf.good++; perf.bad = 0; } else { perf.bad = 0; perf.good = 0; }
    const i = ORDER.indexOf(tierName);
    if (perf.bad >= 2 && i > 0) {
      if (perf.wentUp) { perf.upLock = now + perf.lockMs; perf.lockMs *= 2; perf.wentUp = false; }
      setTier(ORDER[i - 1]); perf.bad = 0; perf.ring.length = 0;
    } else if (perf.good >= 10 && i < ORDER.length - 1 && now > perf.upLock) {
      setTier(ORDER[i + 1]); perf.good = 0; perf.wentUp = true; perf.ring.length = 0;
    }
  }

  // ---------------------------------------------------------------- the effects drawn from PinFX.state and the toys' own
  const trails = new Map(), tmpC = new THREE.Color();
  let gN = 0, pN = 0;
  function putTo(S, k, x, y, z, r, g, b, a, sz) { S.pos[k * 3] = wx(x); S.pos[k * 3 + 1] = z; S.pos[k * 3 + 2] = wz(y); S.col[k * 4] = r; S.col[k * 4 + 1] = g; S.col[k * 4 + 2] = b; S.col[k * 4 + 3] = a; S.size[k] = sz; }
  function flush(S, n) {
    S.geo.setDrawRange(0, n);
    if (n) ['position', 'acol', 'size'].forEach((k) => { const at = S.geo.attributes[k]; at.needsUpdate = true; at.clearUpdateRanges && at.clearUpdateRanges(); at.addUpdateRange && at.addUpdateRange(0, n * at.itemSize); });
    S.mat.uniforms.uScale.value = RH * PR / (2 * Math.tan(camera.fov * DEG / 2));
    S.count = n;
  }
  function drawFx(W, st, dt) {
    gN = 0; pN = 0;
    const put = (x, y, z, col, a, size) => { if (!(a > 0.004) || gN >= glowPts.n) return; tmpC.set(col); putTo(glowPts, gN++, x, y, z, tmpC.r, tmpC.g, tmpC.b, a, size); };
    const BR = TB.BR, seen = new Set();
    (W.balls || []).forEach((b) => {
      const z = ballZ(b);
      let h = trails.get(b.id); if (!h) { h = []; trails.set(b.id, h); } seen.add(b.id);
      h.unshift([b.x, b.y, z]); if (h.length > 8) h.length = 8;
      const sp = b.m === 'ramp' ? Math.abs(b.vs || 0) : Math.hypot(b.vx || 0, b.vy || 0), k = clamp((sp - 430) / 420, 0, 1);
      if (k <= 0 || b.m === 'held' || b.carry) return;
      for (let i = 0; i < h.length - 1; i++) for (let j = 0; j < 3; j++) {
        const A = h[i], B = h[i + 1], u = j / 3, x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u;
        if (Math.hypot(x - b.x, y - b.y) < BR * 1.1) continue;
        const f = 1 - (i + u) / (h.length - 1);
        put(x, y, A[2] + (B[2] - A[2]) * u, '#a8ecff', 1.1 * k * f * f, BR * (0.7 + 1.3 * f));
      }
    });
    for (const id of trails.keys()) if (!seen.has(id)) trails.delete(id);
    if (st && st.sparks) for (let i = 0; i < st.sparks.length; i++) { const q = st.sparks[i]; if (q) put(q.x, q.y, q.z || 0, q.color || '#ffffff', (q.a == null ? 1 : q.a) * 2.4, q.size || 3); }
    // the toys' own particles
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i]; m.life += dt;
      if (m.life >= m.max) { motes[i] = motes[motes.length - 1]; motes.pop(); continue; }
      m.vz -= m.g * dt; m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
      if (m.kind === 'puff') { const d = 1 - Math.min(1, dt * 0.8); m.vx *= d; m.vy *= d; m.vz *= 1 - Math.min(1, dt * 0.6); }
      else if (m.z < 0.5 && m.vz < 0) { m.z = 0.5; m.vz *= -0.25; m.vx *= 0.5; m.vy *= 0.5; }
      const f = m.life / m.max, a = m.kind === 'glow' ? m.a * (1 - f) : m.a * Math.min(1, f * 6) * (1 - f), sz = m.size * (1 + m.grow * f);
      if (m.kind === 'glow') { if (gN < glowPts.n && a > 0.004) putTo(glowPts, gN++, m.x, m.y, m.z, m.col[0], m.col[1], m.col[2], a, sz); }
      else if (pN < puffPts.n && a > 0.004) putTo(puffPts, pN++, m.x, m.y, m.z, m.col[0], m.col[1], m.col[2], a, sz);
    }
    flush(glowPts, gN); flush(puffPts, pN);
    let pi = 0;
    if (st && st.pops) for (let i = 0; i < st.pops.length && pi < POP_N; i++) {
      const p = st.pops[i]; if (!p || p.text == null || p.text === '' || (p.a != null && p.a <= 0.01)) continue;
      const sp = pops[pi++], e = popTexture(String(p.text), p.color || '#ffd84a');
      if (sp.material.map !== e.t) { if (!sp.material.map) sp.material.needsUpdate = true; sp.material.map = e.t; }
      sp.material.opacity = p.a == null ? 1 : clamp(p.a, 0, 1);
      const hh = 13 * (p.s == null ? 1 : p.s);
      sp.scale.set(hh * e.aspect, hh, 1); sp.position.set(wx(p.x), (p.z || 0) + 16, wz(p.y)); sp.visible = true;
    }
    for (; pi < POP_N; pi++) pops[pi].visible = false;
    return gN + pN;
  }
  // a ball's height off the playfield: on a ramp or a carry its own height (lifted clear of the volcano's top while it
  // climbs out of the crater), held in the crater it sits in the lava, held in the geyser it rides the steam
  function ballZ(b) {
    const V = TB.toys.volcano;
    if (b.m === 'held') {
      if (b.at === 'crater' && V) return 51.4 * V.k - 2.5;
      if (b.at === 'geyser') return 3 + Math.sin(performance.now() / 60) * 0.8;
      return -4;
    }
    let z = b.m === 'ramp' ? (b.z || 0) : 0;
    if (b.carry && V && Math.hypot(b.x - V.x, b.y - V.y) < V.r - 6) z = Math.max(z, 56.4 * V.k - 2);
    return z;
  }

  // ---------------------------------------------------------------- the toys, every frame (they only read W.toys)
  const _mm = new THREE.Matrix4(), _e = new THREE.Euler(), _qq = new THREE.Quaternion(), _sc = new THREE.Vector3(), _ps = new THREE.Vector3();
  function updateToys(W, t, dt, play, dark) {
    const Tz = W.toys || {}, toys = TB.toys, lit = W.lit || {}, k60 = dt * 60;
    // the volcano
    const V = toys.volcano, Vs = Tz.volcano;
    if (V) {
      const rise = Vs ? clamp(Vs.rise || 0, 0, 1) : 0, press = Vs ? clamp(Vs.pressure || 0, 0, 1.5) : 0;
      const kT = 0.45 + 0.55 * (play ? rise : 0.25 + 0.15 * Math.sin(t / 2400));
      V.k += (kT - V.k) * (dt > 0 ? 1 - Math.exp(-dt / 0.12) : 1); V.cone.scale.y = V.k;
      const held = !!(Vs && Vs.busy && Vs.hold > 0), carrying = !!(Vs && Vs.busy && !(Vs.hold > 0) && Vs.carry > 0);
      if (carrying && V.lastCarry === 0) V.fount = 1;   // the launch: a lava fountain
      V.lastCarry = carrying ? Vs.carry : 0;
      V.fount = Math.max(0, V.fount - dt * 0.9);
      const warn = press > 1.25 ? 0.5 + 0.5 * Math.sin(t / 70) : 0;
      const glow = dark ? 0.15 : 0.6 + 1.3 * Math.min(1, press) + (held ? 1.0 + 0.3 * Math.sin(t / 90) : 0) + warn * 1.0 + V.fount * 1.5;
      V.coneMat.emissiveIntensity = glow;
      V.poolMat.color.setRGB(1, 0.36, 0.05).multiplyScalar(dark ? 0.5 : 1.3 + 0.9 * Math.min(1, press) + (held ? 0.5 + 0.3 * Math.sin(t / 90) : 0) + V.fount * 1.5);
      V.lavaLight.intensity = dark ? 0 : 500 + 1300 * Math.min(1, press) + (held ? 1500 : 0) + V.fount * 4000;
      V.lavaLight.position.y = V.HV * V.k + 8;
      const topY = V.HV * V.k + 1;
      // smoke from the crater, more as the pressure builds; embers when it's high or the crater holds the ball
      V.smokeAcc += dt * (2.5 + 14 * press + (held ? 12 : 0)) * tier.motes;
      while (V.smokeAcc >= 1) {
        V.smokeAcc -= 1; const a = mr() * Math.PI * 2, d = mr() * 6, g0 = 0.32 + mr() * 0.2;
        emit('puff', V.x + Math.cos(a) * d, V.y + Math.sin(a) * d, topY, (mr() - 0.5) * 8 + 6, (mr() - 0.5) * 6 - 4, 18 + mr() * 14, 2.2 + mr() * 1.6, 7 + mr() * 6, [g0, g0 * 0.95, g0 * 0.95], 0.55, 0, 2.2);
      }
      if ((press > 0.6 || held) && mr() < dt * (6 + 30 * press + (held ? 30 : 0)) * tier.motes) {
        emit('glow', V.x + (mr() - 0.5) * 8, V.y + (mr() - 0.5) * 8, topY, (mr() - 0.5) * 40, (mr() - 0.5) * 40, 50 + mr() * 70, 0.9 + mr() * 0.6, 2.2 + mr() * 1.5, [1, 0.45 + mr() * 0.3, 0.1], 1.6, 120);
      }
      if (V.fount > 0.3) {   // the money shot: the ball, black against a fountain of lava
        const nF = Math.round(dt * 600 * tier.motes * V.fount);
        for (let i = 0; i < nF; i++) emit('glow', V.x + (mr() - 0.5) * 10, V.y + (mr() - 0.5) * 10, topY, (mr() - 0.5) * 90, (mr() - 0.5) * 90 - 20, 120 + mr() * 160, 1.1 + mr() * 0.9, 2.5 + mr() * 3, [1, 0.35 + mr() * 0.45, 0.06], 2, 210);
        if (mr() < dt * 20) emit('puff', V.x, V.y, topY + 10, (mr() - 0.5) * 30, (mr() - 0.5) * 30, 40 + mr() * 30, 3, 14 + mr() * 8, [0.25, 0.22, 0.22], 0.6, 0, 2.5);
      }
    }
    // the geyser
    const G = toys.geyser, Gs = Tz.geyser;
    if (G) {
      const st = Gs ? Gs.st : 'ready';
      if (G.last === 'puff' && st === 'cool') G.burst = 1;
      G.last = st; G.burst = Math.max(0, G.burst - dt * 1.4);
      const rate = (st === 'puff' ? 40 : st === 'ready' ? 4 : 1) * tier.motes + G.burst * 90 * tier.motes;
      G.acc += dt * rate;
      while (G.acc >= 1) {
        G.acc -= 1; const a = mr() * Math.PI * 2, d = mr() * (G.r - 3), up = st === 'puff' ? 45 + mr() * 30 : G.burst > 0 ? 110 + mr() * 90 : 14 + mr() * 10, w = 0.85 + mr() * 0.15;
        emit('puff', G.x + Math.cos(a) * d, G.y + Math.sin(a) * d, 2, (mr() - 0.5) * 6, (mr() - 0.5) * 6 - 2, up, st === 'puff' || G.burst > 0 ? 1.4 + mr() : 2.4 + mr(), 6 + mr() * 5, [w, w, Math.min(1, w + 0.04)], st === 'ready' ? 0.4 : 0.7, 0, 2.6);
      }
      G.poolMat.color.set('#8ff4ff').multiplyScalar(dark ? 0.3 : st === 'puff' ? 1.6 + 0.6 * Math.sin(t / 50) : st === 'ready' ? 1.15 : 0.55);
    }
    // the magma crabs
    const C = toys.crabs, Cs = Tz.crabs;
    if (C && Cs) {
      let li = 0;
      for (let i = 0; i < C.n; i++) {
        const c = Cs[i] || { x: -999, y: -999 }, S = C.shells[i];
        const moved = S.px == null ? 0 : Math.hypot(c.x - S.px, c.y - S.py), dir = S.px == null ? 0 : Math.sign(c.x - S.px);
        S.px = c.x; S.py = c.y; S.phase += moved * 0.55;
        const hitV = lit.crab ? lit.crab[i] || 0 : 0; S.flash = hitV > 0 ? 1 : Math.max(0, S.flash - dt * 3);
        const stun = c.stun > 0, X = wx(c.x), Z = wz(c.y), bob = Math.abs(Math.sin(S.phase * 2)) * 0.5 * (moved > 0.01 ? 1 : 0);
        S.m.position.set(X, 3.6 + bob, Z); S.m.rotation.set(stun ? 0.25 : 0, 0, dir * 0.08);
        S.mat.emissiveIntensity = dark ? 0.1 : stun ? (Math.floor(t / 90) % 2 ? 1.6 : 0.25) : 0.9 + 0.35 * Math.sin(t / 300 + i) + S.flash * 3;
        // legs: three each side, two segments, stepping in alternate threes
        for (let s = -1; s <= 1; s += 2) for (let L = 0; L < 3; L++) {
          const ph = S.phase + L * 2.1 + (s > 0 ? Math.PI : 0) + (L % 2) * Math.PI, sw = Math.cos(ph) * 1.8 * (moved > 0.01 || stun ? 1 : 0.25), lift = Math.max(0, Math.sin(ph)) * 2.2;
          const hy = (L - 1) * 3.0 - 1, hx = s * 7.4, kx = s * 10.8, ky = hy * 1.2 + sw * 0.5, fx = s * 12.2 + sw * 0.3 * s, fy = hy * 1.35 + sw;
          C.legs.setMatrixAt(li++, segMatrix(_mm, X + hx, 3.2 + bob, Z + hy, X + kx, 5.8 + lift + bob, Z + ky, 1.25));
          C.legs.setMatrixAt(li++, segMatrix(_mm, X + kx, 5.8 + lift + bob, Z + ky, X + fx, 0.4 + lift * 0.6, Z + fy, 1.0));
        }
        // eye stalks, claws, eyes
        for (let s = -1; s <= 1; s += 2) {
          C.legs.setMatrixAt(li++, segMatrix(_mm, X + s * 2.4, 5.5 + bob, Z + 5.2, X + s * 3.0, 9.4 + bob, Z + 6.6, 0.5));
          const pinch = 0.85 + 0.15 * Math.sin(t / 160 + i * 2 + s), cx = X + s * 6.4, cz = Z + 9.2;
          _e.set(0, s * 0.6, 0); _qq.setFromEuler(_e); _sc.set(pinch, pinch, pinch); _ps.set(cx, 3.4 + bob, cz);
          C.claws.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), _mm.compose(_ps, _qq, _sc));
          _sc.set(1.35, 1.35, 1.35); _ps.set(X + s * 3.1, 10.2 + bob, Z + 6.8); _qq.identity();
          C.eyes.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), _mm.compose(_ps, _qq, _sc));
        }
        _mm.makeScale(24, 1, 20); _mm.setPosition(wx(c.x + SHX * 4), 0.3, wz(c.y + SHY * 4)); C.shadows.setMatrixAt(i, _mm);
      }
      C.legs.instanceMatrix.needsUpdate = true; C.claws.instanceMatrix.needsUpdate = true; C.eyes.instanceMatrix.needsUpdate = true; C.shadows.instanceMatrix.needsUpdate = true;
    }
    // the lava gates and lanes
    const L = toys.lava, Ls = Tz.lava;
    if (L) {
      const open = !!(Ls && Ls.open);
      L.flow.offset.y = (L.flow.offset.y - dt * (open ? 0.5 : 0.12)) % 1;
      L.gates.forEach((g, i) => {
        const h = Ls && Ls.gates[i] ? clamp(Ls.gates[i].h || 0, 0, 1) : 0;
        g.panel.position.y = H.gate / 2 + h * 20;
        g.mat.emissiveIntensity = dark ? 0.05 : 0.3 + h * 1.2 + (lit.lava && lit.lava[i] > 0 ? 1.5 : 0);
      });
      L.lanes.forEach((ln, i) => { const v = dark ? 0.15 : open ? 1.2 + 0.3 * Math.sin(t / 120 + i) : 0.55; ln.mat.color.setRGB(v, v, v); });
    }
    void k60;
  }

  // ---------------------------------------------------------------- the table movement (picture only)
  const _piv = new THREE.Vector3(), _tm = new THREE.Matrix4(), _rm = new THREE.Matrix4();
  function moveTable(st, t) {
    const tb = st && st.table;
    mover.matrix.identity();
    if (tb && typeof tb === 'object') {
      const pitch = clamp(+tb.pitch || 0, -12, 12) * DEG, roll = clamp(+tb.roll || 0, -12, 12) * DEG, dy = clamp(+tb.dy || 0, -40, 40);
      let sx = 0, sz = 0;
      if (tb.shake != null) {
        if (typeof tb.shake === 'object') { sx = clamp(+tb.shake.x || 0, -8, 8); sz = clamp(+tb.shake.y || 0, -8, 8); }
        else { const a = clamp(+tb.shake || 0, 0, 1) * 1.2; sx = a * Math.sin(t * 0.091) * Math.cos(t * 0.037); sz = a * Math.sin(t * 0.073 + 1.3); }   // (0..1: a rumble)
      }
      if (pitch || roll || dy || sx || sz) {
        const lk = HOME ? HOME.look : [HW, ZC, 0], pv = camLook.lengthSq() ? camLook : _piv.set(wx(lk[0]), 0, wz(lk[1]));
        _tm.makeTranslation(pv.x + sx, pv.y + dy, pv.z + sz);
        _rm.makeRotationFromEuler(_e.set(pitch, 0, -roll));
        mover.matrix.multiply(_tm).multiply(_rm).multiply(_tm.makeTranslation(-pv.x, -pv.y, -pv.z));
      }
    }
    mover.matrixWorldNeedsUpdate = true;
  }

  // where a table point is on the screen (0..1 from the bottom left), for the final pass's shockwaves
  const _pv = new THREE.Vector3(), _po = { project: null, ball: null }, _pb = { x: 0, y: 0 };
  function screenOf(x, y, z) {
    mover.updateMatrixWorld(true); _pv.set(wx(x), z || 0, wz(y)).applyMatrix4(mover.matrixWorld).project(camera);
    if (_pv.z > 1 || _pv.x < -1.2 || _pv.x > 1.2 || _pv.y < -1.2 || _pv.y > 1.2) return null;
    return { x: (_pv.x + 1) / 2, y: (_pv.y + 1) / 2 };
  }
  function postOpts(W) {
    _po.project = screenOf;
    const b = W.balls && W.balls[0];
    if (b) { const p = screenOf(b.x, b.y, ballZ(b) + TB.BR); if (p) { _pb.x = p.x; _pb.y = p.y; _po.ball = _pb; } else _po.ball = null; } else _po.ball = null;
    return _po;
  }

  // ---------------------------------------------------------------- every frame
  let lastT = null, reflectN = 0, fxPts = 0, cpuMs = 0;
  const refl = { calls: 0, tris: 0 };
  const tmpV = new THREE.Vector3();
  function draw(W, t, mode, info) {
    if (!W) return;
    const c0 = performance.now();
    judge(c0);
    const id = W.tableId || 'orbit';
    if (!TB || TB.id !== (E.table ? E.table(id).id : 'orbit')) useTable(id);
    const T = TB.T, dt = lastT == null ? 0 : clamp((t - lastT) / 1000, 0, 0.25); lastT = t;
    const play = mode !== 'title', dark = !!(W.tilted || W.over), lit = W.lit || {};
    let st = null;
    if (window.PinFX) { try { if (typeof PinFX.update === 'function') PinFX.update(W, t, mode); st = PinFX.state || null; } catch (e) { st = null; } }
    renderer.info.reset();
    // the spectacle add-ons, once they're on the page
    if (!particles && opts.particles !== false && window.PinParticles && typeof PinParticles.attach === 'function') {
      try {
        PinParticles.attach(THREE, scene, mover, tierName, { origin: [HW, ZC] }); particles = window.PinParticles; if (typeof particles.warm === 'function') particles.warm(renderer, camera);
        if (window.PinFX) window.PinFX.gpu = true;   // (fx.js's sparks now go to the GPU particles, not drawn a second time here)
      }
      catch (e) { console.warn('PinParticles.attach failed', e); particles = { update() {} }; }
    }
    if (!post && opts.post !== false && window.PinPost && typeof PinPost.pass === 'function') {   // (it does the output pass's job too: it replaces it)
      try { const p = PinPost.pass(THREE, renderer, { tier: tierName }); if (p) { composer.removePass(outPass); composer.addPass(p); composer.setSize(RW, RH); sizeBloom(); } post = window.PinPost; }
      catch (e) { console.warn('PinPost.pass failed', e); post = NOPOST; }
    }
    // flippers
    for (let i = 0; i < TB.flippers.length && i < W.flippers.length; i++) TB.flippers[i].grp.rotation.y = -W.flippers[i].a;
    // the background light: down on a tilt, and as fx.js says; on the island a dip is an ash cloud over the sun
    const giT = (dark && play ? 0.25 : 1) * clamp(st && st.gi != null ? +st.gi : 1, 0, 1.5);
    TB.giNow += (giT - TB.giNow) * (dt > 0 ? 1 - Math.exp(-dt / 0.07) : 1);
    const gi = TB.giNow, Lg = TB.lights;
    Lg.gi.forEach((g) => { g.l.intensity = g.base * gi; });
    // (when the spectacle's final pass is on, it adds a share of the flash itself: half here, so the two don't stack)
    const fl = clamp(st && st.flash ? +st.flash : 0, 0, 1) * (post && post !== NOPOST ? 0.5 : 1);
    Lg.hemi.intensity = Lg.HEMI * (0.3 + 0.7 * gi) + 2.4 * fl; Lg.key.intensity = Lg.KEY * (TB.ISLAND ? 0.15 + 0.85 * clamp(gi, 0, 1.2) : 0.4 + 0.6 * gi);
    TB.liftU.value = TB.LIFT * (0.3 + 0.7 * gi); renderer.toneMappingExposure = TB.theme.exposure * (1 + 0.3 * fl);
    if (TB.world) { const a = 0.4 + 0.6 * clamp(gi, 0, 1); TB.world.skyMat.color.setRGB(a, a, a * 1.02); TB.world.seaMat.color.setRGB(a, a, a); }
    // pop bumpers: the ring snaps down, the skirt and cap flash; a fumarole puffs
    TB.bumpers.forEach((bp, i) => {
      const v = lit.bump ? lit.bump[i] : 0;
      if (v >= 7 && bp.hit < 0.5) {
        TB.flashK = 1; TB.flash.color.copy(bp.col); TB.flash.position.set(wx(bp.x), 24, wz(bp.y));
        if (TB.ISLAND) for (let k = 0; k < 6 * tier.motes + 1; k++) emit('puff', bp.x + (mr() - 0.5) * 6, bp.y + (mr() - 0.5) * 6, H.bumpCap, (mr() - 0.5) * 20, (mr() - 0.5) * 20, 30 + mr() * 25, 1.2 + mr() * 0.6, 6 + mr() * 4, [0.55, 0.52, 0.5], 0.55, 0, 2);
      }
      bp.hit = v > 0 ? 1 : Math.max(0, bp.hit - dt * 7);
      const idle = play ? (dark ? 0.15 : 0.75 + 0.25 * Math.sin(t / 300 + i * 2.1)) : 0.6 + 0.6 * Math.max(0, Math.sin(t / 240 - i * 2.1));
      bp.ring.position.y = 11 - 4.4 * (v > 0 ? 1 : bp.hit);
      bp.skirtMat.emissiveIntensity = idle * 0.9 + bp.hit * 5;
      bp.sideMat.emissiveIntensity = (TB.ISLAND ? 0.4 : 1) * idle + bp.hit * 4;
      bp.topMat.emissiveIntensity = 0.45 * idle + bp.hit * 2.2;
    });
    TB.slings.forEach((s, i) => {
      const v = lit.sling ? lit.sling[i] : 0;
      if (v >= 9 && s.flash < 0.5) { TB.flashK = Math.max(TB.flashK, 0.8); TB.flash.color.set(s.col); const sl = T.slings[i]; TB.flash.position.set(wx((sl.a[0] + sl.c[0]) / 2), 18, wz((sl.a[1] + sl.c[1]) / 2)); }
      s.flash = v > 0 ? 1 : Math.max(0, s.flash - dt * 6);
      s.mat.emissiveIntensity = (dark ? 0.12 : 0.55) + s.flash * 2.6;
    });
    TB.flashK = Math.max(0, TB.flashK - dt * 5); TB.flash.intensity = TB.flashK * 9000;
    TB.drops.forEach((d, i) => {
      const down = W.drops && !W.drops[i] ? 1 : 0;
      d.down += (down - d.down) * (dt > 0 ? 1 - Math.exp(-dt / (down ? 0.03 : 0.07)) : 1);
      d.m.position.y = H.drop / 2 - d.down * (H.drop + 0.5); d.m.visible = d.down < 0.98;
      d.mat.emissiveIntensity = d.base + (lit.drop && lit.drop[i] > 0 ? 2.5 : 0);
    });
    if (TB.spinner) TB.spinner.rotation.x = -(W.spin ? W.spin.a : 0) * Math.PI * 2;
    const S = T.shooter, tipY = S.tip + (W.plunger ? W.plunger.pull : 0) * S.travel, P = TB.plunger;
    P.tip.position.set(wx(S.cx), TB.BR, wz(tipY)); P.rod.position.set(wx(S.cx), TB.BR, wz(tipY));
    P.spring.position.set(wx(S.cx), TB.BR, wz(tipY + 4.5)); P.spring.scale.set(1, 1, Math.max(1, TB.TH - 4 - tipY - 4.5));
    if (TB.ledMat) { const rl = lit.ramp > 0 ? 3.2 : W.comboT > 0 ? 1.6 + Math.sin(t / 60) * 0.8 : !play ? 1.2 + Math.sin(t / 200) * 0.6 : 1.0; TB.ledMat.color.set(TB.theme.led).multiplyScalar(dark ? 0.2 : rl); }
    updateToys(W, t, dt, play, dark);
    // balls
    let first = null;
    for (let i = 0; i < balls.length; i++) {
      const b = W.balls && W.balls[i], Bb = balls[i];
      if (!b) { Bb.m.visible = Bb.s.visible = Bb.s2.visible = false; continue; }
      const z = ballZ(b), cy = TB.BR + z, onFloor = b.m !== 'held' && !(b.m === 'ramp' && b.carry);
      Bb.m.position.set(wx(b.x), cy, wz(b.y)); Bb.m.visible = true; Bb.m.children[0].visible = b.at !== 'crater';
      const sz = 15 + z * 0.05;
      Bb.s.position.set(wx(b.x + SHX * TB.BR * 0.6), (b.m === 'ramp' && !b.carry ? z : 0) + 0.45, wz(b.y + SHY * TB.BR * 0.6)); Bb.s.scale.set(sz, 1, sz * 1.15); Bb.s.visible = onFloor || (b.m === 'ramp' && !b.carry);
      if (z > 2 && b.at !== 'crater') { Bb.s2.position.set(wx(b.x + SHX * cy), 0.1, wz(b.y + SHY * cy)); const k = 18 + z * 0.3; Bb.s2.scale.set(k, 1, k); Bb.s2.material.opacity = 1; Bb.s2.visible = true; } else Bb.s2.visible = false;
      if (!first) first = Bb.m;
    }
    updateLamps(W, t, mode, dt, st && st.lamps);
    fxPts = drawFx(W, st, dt);
    // the camera: the director's (PinCam), an override (the bench), or home
    let c = null;
    if (camOverride) { c = camOverride === 'home' ? HOME : typeof camOverride === 'object' && camOverride.pos ? camOverride : camFrom(camOverride); camSource = 'override'; }
    else if (window.PinCam && opts.cam !== 'home' && view.cam !== 'home' && typeof PinCam.frame === 'function') {
      try { const p = typeof PinCam.update === 'function' ? PinCam.update(W, t, mode, RW / RH) : null; c = camFrom(PinCam.frame(p, RW / RH)); camSource = c ? 'PinCam' : 'home'; }
      catch (e) { if (!camErr++) console.warn('PinCam failed', e); c = null; camSource = 'home'; }
    } else camSource = 'home';
    place(c || HOME);
    const lk = c && c.look ? c.look : lookOnTable(camera.position, camera.getWorldDirection(tmpV));
    camLook.set(wx(lk[0]), 0, wz(lk[1]));
    // a small shake moves the camera; the table movement moves the table
    const sk = st && st.shake, sx = sk ? clamp(+sk.x || 0, -1.5, 1.5) : 0, sy = sk ? clamp(+sk.y || 0, -1.5, 1.5) : 0;
    camera.position.copy(camBase).addScaledVector(camR, sx).addScaledVector(camU, sy);
    moveTable(st, t);
    if (particles && typeof particles.update === 'function') { try { particles.update(dt, st); } catch (e) {} }
    if (post && typeof post.update === 'function') { try { post.update(t, st, postOpts(W)); } catch (e) {} }
    // the ball's reflection: the table round it, from where it is
    refl.calls = 0; refl.tris = 0;
    if (first && opts.reflect !== false && tier.reflectEvery && (reflectN++ % tier.reflectEvery) === 0) {
      first.getWorldPosition(tmpV); cubeCam.position.copy(tmpV);
      const bg = scene.background; scene.background = TB.ballSky;
      balls.forEach((Bb) => { Bb.m.visible = false; });
      cubeCam.update(renderer, scene);
      scene.background = bg;
      refl.calls = renderer.info.render.calls; refl.tris = renderer.info.render.triangles;
      for (let i = 0; i < balls.length; i++) balls[i].m.visible = !!(W.balls && W.balls[i]);
    }
    composer.render();
    cpuMs = performance.now() - c0;
  }
  function updateLamps(W, t, mode, dt, extra) {
    let L = TB.lampsObj;
    if (!L) { if (window.PinArt && (window.PinLamps || typeof PinArt.inserts === 'function') && !TB.triedLamps) { TB.triedLamps = true; L = TB.buildLamps(); } if (!L) return; }
    let lv = null; try { lv = L.level(W, t, mode); } catch (e) { lv = null; }
    const n = L.list.length, C = L.ca.array, snap = dt <= 0 || dt > 0.5, tgt = L.tg, GAIN = opts.lampGain || 2.4;
    for (let i = 0; i < n; i++) tgt[i] = lv ? lv[i] || 0 : 0;
    if (extra && L.byId) for (const id in extra) { const i = L.byId[id]; if (i != null) tgt[i] += +extra[id] || 0; }
    const up = 1 - Math.exp(-dt / 0.028), dn = 1 - Math.exp(-dt / 0.11);
    for (let i = 0; i < n; i++) {
      const v = clamp(tgt[i], 0, 1.25); let c = L.cur[i];
      if (snap) { c = v; L.cool[i] = 0; }
      else if (v > c) { c += (v - c) * up; L.cool[i] = Math.max(0, L.cool[i] - dt * 8); }
      else { c += (v - c) * dn; L.cool[i] = Math.min(1, L.cool[i] + dt * 10); }
      L.cur[i] = c;
      const k = c * GAIN, warm = L.cool[i] * (1 - c), r = k, g = k * (1 - 0.32 * warm), b = k * (1 - 0.6 * warm);
      for (let q = 0; q < 4; q++) { C[i * 12 + q * 3] = r; C[i * 12 + q * 3 + 1] = g; C[i * 12 + q * 3 + 2] = b; }
    }
    L.ca.needsUpdate = true;
  }

  function setView(v) { view = Object.assign({}, view, v || {}); view.fill = !!view.fill; fit(); }

  // ---------------------------------------------------------------- set up, compile, measure
  resize(opts.width || canvasEl.width || 360, opts.height || canvasEl.height || 640);
  useTable(opts.table || (E.DEFAULT || 'orbit'));
  { const fill = opts.fill !== false; setView({ fill, tilt: opts.tilt != null ? opts.tilt : fill ? HOME_TILT : 35, fov: opts.fov || (fill ? FOV : 34) }); }
  renderer.compile(scene, camera);
  const buildMs = Math.round(performance.now() - t0);

  function stats() {
    return {
      buildMs, artMs: TB.artMs, table: TB.id, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, reflectCalls: refl.calls, reflectTriangles: refl.tris, art: TB.artSource,
      lamps: TB.lampsObj ? TB.lampsObj.list.length : 0, size: [Math.round(RW * PR), Math.round(RH * PR)], pixelRatio: PR, tier: tierName, auto: autoTier, tierChanges: perf.changes,
      view, cam: camSource, fx: !!window.PinFX, fxPoints: fxPts, motes: motes.length, pops: pops.filter((p) => p.visible).length, cpuMs: +cpuMs.toFixed(2),
      particles: !!particles, post: !!post, phone: PHONE
    };
  }
  function dispose() {
    if (TB) TB.dispose();
    shared.forEach((d) => { try { d.dispose(); } catch (e) {} });
    composer.dispose && composer.dispose(); rt.dispose(); renderer.dispose();
  }
  const api = {
    draw, setView, setCam, setTier, resize, dispose, stats,
    homes: () => JSON.parse(JSON.stringify(homes)),
    debug: { scene, camera, cab, mover, units, renderer, THREE, get table() { return TB.group; }, get TB() { return TB; }, occluders: () => TB.occluders(), ballZ: (b) => ballZ(b), toWorld: (x, y, h) => { mover.updateMatrixWorld(true); return new THREE.Vector3(wx(x), h, wz(y)).applyMatrix4(mover.matrixWorld); } }
  };
  window.Pin3D.homes = api.homes;
  return api;
}

window.Pin3D = { create, homes: () => ({}) };
