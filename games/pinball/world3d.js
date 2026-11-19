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
 * drop targets, the lava river under the glass (one screen, 29 Oct 2026) and the lit backglass (wave 2). Beyond the cabinet: blue sky, a turquoise sea, the island's rock and a few
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
 * -> { draw(W, t, mode, info), setView(v), setCam(c), setTier(name), setRoom(on|'auto'), roomShots(), homes(), resize(w, h), dispose(), stats(), debug }
 *
 * WAVE 2 (30 Oct 2026): Ember Peak's backbox is a tall lit backglass (a volcano erupting at night, our explorer, a magma crab, the
 * title) in a chrome bezel with an arched topper, so a portrait phone's home has no dark band above it; the fumaroles are real pop
 * bumpers (instanced, lower caps); the crabs are coral with glossy eyes; and THE GAMES ROOM: create({ room }) or setRoom(true |
 * false | 'auto') - 'auto', the default, shows it in the title/attract only - a dim arcade round the cabinet (carpet, neon signs of
 * our own, other machines, the cabinet's legs, side art and coin door), built on first use, 5 draw calls while shown and none in
 * play; roomShots() gives trailer framings for setCam. */
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
const POP = { rim: 14.8, top: 20, ring: 8.6, skirt: 4.4 };   // Ember Peak's pop bumpers (30 Oct 2026, wave 2): the cap's rim and top (26 before), the ring's rest height, the skirt's
const H = { rail: 18, guide: 13, arch: 21, wood: 30, front: 22, bumpCap: 26, drop: 17, apron: 6, sling: 16, rampWall: 16, post: 19, void: 12, gate: 9 };
const WOOD_L = -36, WOOD_R = 308;
const FOV = 32, HOME_TILT = 28;   // classic's home (and the bench's tilt studies)
const EYE = { portrait: [40, 26], wide: [48, 24], a0: 0.62, a1: 1.25 };   // camera.js's player-eye home (CFG.eye), used when PinCam is not on the page (30 Oct 2026, owner: "the full realism rebuild")
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
    world: 'island', exposure: 1.3, bloomT: 1.25, cabinet: 'lacquer', tone: THREE.ACESFilmicToneMapping,   // filmic, under arcade light (30 Oct 2026, owner: "the full realism rebuild")
    bump: [{ c: '#ff7a1a', art: 'vent' }, { c: '#ffb21a', art: 'vent' }, { c: '#ff5a2a', art: 'vent' }],
    sling: ['#ff8a1a', '#ff8a1a'], slingArt: [null, null], ramp: 0xffc890, rampWall: '#ff9a2e', led: '#ffae3a',
    lava: '#ff6a1a', steam: '#f4f8ff', sea: '#29d3d6'
  },
  // THE MAGMA CHAMBER (wave 3, 5 Nov 2026): a level inside the volcano, in Ember Peak's cabinet - deep red rock, orange glow
  chamber: {
    world: 'cavern', exposure: 1.3, bloomT: 1.25, cabinet: 'lacquer', tone: THREE.ACESFilmicToneMapping,
    bump: [{ c: '#ff5a1a', art: 'vent' }, { c: '#ff7a1a', art: 'vent' }, { c: '#ff4a2a', art: 'vent' }],
    sling: ['#ff6a1a', '#ff6a1a'], slingArt: [null, null], ramp: 0xffc890, rampWall: '#ff7a2e', led: '#ff8a3a',
    lava: '#ff5a10', steam: '#ffd8c0', sea: '#3a0a06'
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

// several indexed or plain geometries (position, normal, uv) as one, for one draw call (30 Oct 2026, owner: "the full realism rebuild")
function mergeGeos(list) {
  const P = [], N = [], U = [];
  list.forEach((g0) => { const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv; for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); U.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); } if (g !== g0) g.dispose(); });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  out.computeBoundingSphere(); out.computeBoundingBox(); return out;
}
// smooth 3D value noise (0..1) and its fractal sum, for rock that is the same at a lathe's seam
function hash3(x, y, z) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, s = (t) => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf);
  const L = (a, b, t) => a + (b - a) * t, c = (i, j, k) => hash3(xi + i, yi + j, zi + k);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
function fbm3(x, y, z, oct) { let s = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise3(x, y, z); n += a; a *= 0.5; x = x * 2.07 + 5.3; y = y * 2.07 - 3.1; z = z * 2.07 + 1.7; } return s / n; }

// ---------------------------------------------------------------- canvases painted once
// the arcade the chrome reflects (equirectangular, 30 Oct 2026, owner: "the full realism rebuild"): a dark room, two long
// fluorescent tubes overhead along the table, the lit backbox up at the far end, rows of warm GI bulbs low down either
// side, neon from the machines across the room; the floor near black. Bright bits at 1.0 on near-black, so chrome shows
// highlights and the gloss shows lamp streaks, not a grey or a sky
function arcadeEnvCanvas(w, h) {
  const c = cv(w, h), g = c.getContext('2d'), r = rnd(61);
  const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, '#120e16'); q.addColorStop(0.42, '#0a0810'); q.addColorStop(0.5, '#140c0e'); q.addColorStop(0.56, '#060406'); q.addColorStop(1, '#030203');
  g.fillStyle = q; g.fillRect(0, 0, w, h);
  const uvOf = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [(Math.atan2(z, x) / (2 * Math.PI) + 0.5) * w, (0.5 - Math.asin(y / l) / Math.PI) * h]; };
  const line = (pts, wd, col, blur) => { g.save(); g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = blur || 0; g.beginPath(); let last = null; pts.forEach(([x, y, z]) => { const p = uvOf(x, y, z); if (!last || Math.abs(p[0] - last[0]) > w / 2) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); last = p; }); g.stroke(); g.restore(); };
  const blob = (u, v, rx, ry, col, a) => { g.save(); g.globalCompositeOperation = 'lighter'; g.translate(u, v); g.scale(1, ry / rx); const qq = g.createRadialGradient(0, 0, 0, 0, 0, rx); qq.addColorStop(0, rgba(col, a)); qq.addColorStop(0.35, rgba(col, a * 0.5)); qq.addColorStop(1, rgba(col, 0)); g.fillStyle = qq; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); };
  // the tubes overhead, along the table (the room's Z), and one across above the player
  for (const x of [-0.42, 0.42]) { const pts = []; for (let k = -40; k <= 40; k++) pts.push([x, 1, k * 0.12]); line(pts, h * 0.022, 'rgba(255,246,228,1)', 18); line(pts, h * 0.008, '#ffffff', 0); }
  { const pts = []; for (let k = -10; k <= 10; k++) pts.push([k * 0.06, 1, 0.9]); line(pts, h * 0.018, 'rgba(255,236,210,0.9)', 14); }
  // the backbox at the far end (-Z): a warm lit panel, a hot strip along its foot (the speaker panel's light)
  { const [u0, v0] = uvOf(-0.45, 0.62, -1), [u1, v1] = uvOf(0.45, 0.2, -1), bg = g.createLinearGradient(0, v0, 0, v1); bg.addColorStop(0, '#ff9a3a'); bg.addColorStop(0.5, '#ffd27a'); bg.addColorStop(1, '#ff6a1a'); g.fillStyle = bg; g.fillRect(Math.min(u0, u1), v0, Math.abs(u1 - u0), v1 - v0); blob((u0 + u1) / 2, (v0 + v1) / 2, Math.abs(u1 - u0) * 0.9, (v1 - v0) * 1.4, '#ff8a2a', 0.5); }
  // warm GI bulbs low down either side (the cabinet's own lamps), and the neon of the room
  for (const sx of [-1, 1]) for (let k = -6; k <= 6; k++) { const [u, v] = uvOf(sx, 0.05 + 0.03 * (k % 2), k * 0.22); blob(u, v, h * 0.02, h * 0.02, k % 3 ? '#ffc070' : '#ffe6b0', 0.95); }
  line([[-1, 0.18, -0.9], [-1, 0.18, -0.2]], h * 0.012, 'rgba(255,70,190,1)', 14); line([[1, 0.24, -0.8], [1, 0.24, -0.1]], h * 0.012, 'rgba(60,220,255,1)', 14);
  line([[-1, 0.3, 0.4], [-1, 0.3, 0.9]], h * 0.01, 'rgba(255,140,40,1)', 12); line([[1, 0.12, 0.3], [1, 0.12, 0.8]], h * 0.01, 'rgba(160,90,255,1)', 12);
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, [u, v] = uvOf(Math.cos(a), 0.02 + r() * 0.1, Math.sin(a)); blob(u, v, h * (0.03 + r() * 0.04), h * 0.02, ['#ff5ab4', '#3fd8ff', '#ffb040', '#9a6aff'][i % 4], 0.35); }
  return c;
}
// the playfield's general illumination (30 Oct 2026, owner: "the full realism rebuild"): a dim table lit in pools by its own
// lamps - bulbs along both side rails, hot pools under the slings and inlanes and round the flippers, warm key pools on the
// toys, the middle lit where the ball plays - over a dark base. Multiplies the playfield's self-light (x3 in the shader)
function giCanvas(T, B) {
  const k = 2, c = cv(T.W * k, T.H * k), g = c.getContext('2d'), W0 = T.W, H0 = T.H;
  g.fillStyle = 'rgb(30,27,34)'; g.fillRect(0, 0, c.width, c.height);
  g.scale(k, k); g.globalCompositeOperation = 'lighter';
  const pool = (x, y, rr, col, a, sy) => { g.save(); g.translate(x, y); g.scale(1, sy || 1); const q = g.createRadialGradient(0, 0, 0, 0, 0, rr); q.addColorStop(0, rgba(col, a)); q.addColorStop(0.4, rgba(col, a * 0.55)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.fillRect(-rr, -rr, rr * 2, rr * 2); g.restore(); };
  const vg = g.createLinearGradient(0, 0, 0, H0); vg.addColorStop(0, 'rgba(60,50,60,0)'); vg.addColorStop(0.5, 'rgba(70,60,60,0.35)'); vg.addColorStop(1, 'rgba(90,70,60,0.5)'); g.fillStyle = vg; g.fillRect(0, 0, W0, H0);
  for (let y = 150; y <= H0 - 40; y += 46) { pool(10, y, 30, '#ffc890', 0.55, 1.3); pool(240, y, 30, '#ffc890', 0.55, 1.3); }   // GI bulbs along both side rails
  (T.slings || []).forEach((s) => { const cx = (s.a[0] + s.b[0] + s.c[0]) / 3, cy = (s.a[1] + s.b[1] + s.c[1]) / 3; pool(cx, cy + 6, 46, '#ffd6a0', 0.75); pool(cx, cy - 30, 30, '#ffb070', 0.45); });
  (T.flippers || []).forEach((f) => pool(f.x + f.side * -8, f.y - 4, 40, '#fff0d8', 0.5));
  pool(T.MID + 10, T.H * 0.6, 90, '#ffe8d0', 0.28, 1.4);   // the key light down the middle, where the ball plays
  if (T.volcano) pool(T.volcano.x, T.volcano.y + 10, 62, '#ff9a50', 0.6);
  (B ? B.BUMPERS : []).forEach((Bm) => pool(Bm.x, Bm.y, 34, '#ffc070', 0.5));
  if (T.arch) pool(T.arch.x + 40, T.arch.y - 60, 60, '#ffe0b0', 0.3);
  return c;
}
// Ember Peak's die-cut art plastics (30 Oct 2026, owner: "the full realism rebuild"): thin printed plastics on posts over
// the outlane guides and the lava lanes' mouths, our own simple graphics - flame tongues, a lava drop, the island's palm
// and sun. Each: { pts (outline, table units), z (height), art } painted into one atlas, laid out a row of cells
function plasticsAtlas(list, S) {
  const cells = list.map((p) => { const xs = p.pts.map((q) => q[0]), ys = p.pts.map((q) => q[1]); return { x0: Math.min(...xs) - 1, y0: Math.min(...ys) - 1, x1: Math.max(...xs) + 1, y1: Math.max(...ys) + 1 }; });
  let AW = 0, AH = 0; cells.forEach((b) => { b.ox = AW; AW += Math.ceil((b.x1 - b.x0) * S) + 4; AH = Math.max(AH, Math.ceil((b.y1 - b.y0) * S)); });
  const c = cv(AW, AH), g = c.getContext('2d');
  list.forEach((p, i) => {
    const b = cells[i]; g.save(); g.translate(b.ox, 0); g.scale(S, S); g.translate(-b.x0, -b.y0);
    const path = () => { g.beginPath(); p.pts.forEach((q, j) => (j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); };
    path(); g.save(); g.clip();
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, R = Math.max(b.x1 - b.x0, b.y1 - b.y0);
    if (p.art === 'flame') {
      const q = g.createLinearGradient(0, b.y1, 0, b.y0); q.addColorStop(0, '#5a0a02'); q.addColorStop(0.35, '#e8360a'); q.addColorStop(0.7, '#ff9a1a'); q.addColorStop(1, '#ffe27a'); g.fillStyle = q; g.fillRect(b.x0, b.y0, R * 2, R * 2);
      const rr = rnd(7 + i);
      for (let k = 0; k < 7; k++) { const fx = b.x0 + (k + 0.5) / 7 * (b.x1 - b.x0), fh = (b.y1 - b.y0) * (0.4 + rr() * 0.5); g.fillStyle = k % 2 ? 'rgba(255,230,120,0.85)' : 'rgba(255,120,20,0.8)'; g.beginPath(); g.moveTo(fx - 2.4, b.y1); g.quadraticCurveTo(fx - 3, b.y1 - fh * 0.6, fx + (rr() - 0.5) * 3, b.y1 - fh); g.quadraticCurveTo(fx + 2.6, b.y1 - fh * 0.5, fx + 2.4, b.y1); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(255,255,230,0.9)'; for (let k = 0; k < 10; k++) { g.beginPath(); g.arc(b.x0 + rr() * (b.x1 - b.x0), b.y0 + rr() * (b.y1 - b.y0) * 0.6, 0.3 + rr() * 0.5, 0, Math.PI * 2); g.fill(); }
    } else if (p.art === 'drop') {
      const q = g.createLinearGradient(b.x0, 0, b.x1, 0); q.addColorStop(0, '#1a0a14'); q.addColorStop(0.5, '#3a1424'); q.addColorStop(1, '#1a0a14'); g.fillStyle = q; g.fillRect(b.x0, b.y0, R * 2, R * 2);
      g.strokeStyle = 'rgba(255,150,40,0.5)'; g.lineWidth = 0.5; for (let x = b.x0; x < b.x1; x += 2.2) { g.beginPath(); g.moveTo(x, b.y0); g.lineTo(x + 3, b.y1); g.stroke(); }
      const dq = g.createRadialGradient(cx, cy + 1, 0.5, cx, cy + 1, 7); dq.addColorStop(0, '#fff6c0'); dq.addColorStop(0.4, '#ffb020'); dq.addColorStop(1, '#e83a08');
      g.fillStyle = dq; g.beginPath(); g.moveTo(cx, cy - 6.5); g.bezierCurveTo(cx + 2, cy - 2.5, cx + 5, cy, cx + 5, cy + 2.5); g.arc(cx, cy + 2.5, 5, 0, Math.PI); g.bezierCurveTo(cx - 5, cy, cx - 2, cy - 2.5, cx, cy - 6.5); g.fill();
      g.font = '900 3.2px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffe08a'; g.fillText('LAVA', cx, b.y1 - 1.6);
    } else {   // 'palm': the island at sunset - a sun, the sea, a palm
      const q = g.createLinearGradient(0, b.y0, 0, b.y1); q.addColorStop(0, '#ff5a2a'); q.addColorStop(0.55, '#ffb040'); q.addColorStop(0.56, '#13b4cf'); q.addColorStop(1, '#064a7a'); g.fillStyle = q; g.fillRect(b.x0, b.y0, R * 2, R * 2);
      g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(cx + 2, b.y0 + (b.y1 - b.y0) * 0.55, 4.5, Math.PI, 0); g.fill();
      g.strokeStyle = '#1a0a08'; g.lineWidth = 1.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 3, b.y1); g.quadraticCurveTo(cx - 4.5, cy, cx - 1.5, b.y0 + 3.5); g.stroke();
      g.fillStyle = '#1a0a08'; for (let k = 0; k < 5; k++) { const a = -Math.PI * 0.95 + k * Math.PI * 0.45; g.beginPath(); g.ellipse(cx - 1.5 + Math.cos(a) * 3, b.y0 + 3.5 + Math.sin(a) * 1.6, 3.4, 0.9, a, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
    path(); g.lineJoin = 'round'; g.lineWidth = 1.1; g.strokeStyle = '#141014'; g.stroke(); g.lineWidth = 0.45; g.strokeStyle = 'rgba(255,240,210,0.95)'; g.stroke();   // the printed black keyline and white edge, as on a real plastic
    g.restore();
  });
  return { c, cells, AW, AH };
}
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
function lacquerCanvas() {   // Ember Peak's cabinet: glossy volcanic-black lacquer, faint lava waves, a gold pinstripe (dark since 29 Oct 2026: the lit table pops, as on the top tables)
  const c = cv(512, 256), g = c.getContext('2d'), r = rnd(9);
  const q = g.createLinearGradient(0, 0, 0, 256); q.addColorStop(0, '#1c1220'); q.addColorStop(1, '#0b070e');
  g.fillStyle = q; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 9; i++) {
    const y0 = 20 + i * 27 + r() * 6; g.strokeStyle = i % 3 ? 'rgba(255,96,24,0.12)' : 'rgba(255,190,90,0.09)'; g.lineWidth = 3 + r() * 4; g.beginPath();
    for (let x = 0; x <= 512; x += 8) { const yy = y0 + Math.sin(x / 40 + i * 1.7) * 6; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); }
    g.stroke();
  }
  g.fillStyle = '#ffc04a'; g.fillRect(0, 6, 512, 3); g.fillRect(0, 247, 512, 3);
  g.fillStyle = 'rgba(255,90,20,0.55)'; g.fillRect(0, 12, 512, 1); g.fillRect(0, 243, 512, 1);
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
  const q = g.createLinearGradient(0, 0, 0, HZ); q.addColorStop(0, '#05040e'); q.addColorStop(0.45, '#140c2a'); q.addColorStop(0.82, '#4a1a3a'); q.addColorStop(0.95, '#c8502a'); q.addColorStop(1, '#ffa050');   // dusk, the afterglow on the horizon (30 Oct 2026, owner: arcade light, not daylight)
  g.fillStyle = q; g.fillRect(0, 0, w, HZ);
  const s = g.createLinearGradient(0, HZ, 0, h); s.addColorStop(0, '#d0703a'); s.addColorStop(0.06, '#1a4a5a'); s.addColorStop(0.4, '#0a2a3a'); s.addColorStop(1, '#040e18');
  g.fillStyle = s; g.fillRect(0, HZ, w, h - HZ);
  const blob = (x, y, rx, ry, col, a, op) => { g.save(); g.globalCompositeOperation = op || 'source-over'; g.translate(x, y); g.scale(1, ry / rx); const qq = g.createRadialGradient(0, 0, 0, 0, 0, rx); qq.addColorStop(0, rgba(col, a)); qq.addColorStop(1, rgba(col, 0)); g.fillStyle = qq; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); };
  // the sun (high, in front and to the left, where the key light comes from) and its glow
  const sx = w * 0.62, sy = h * 0.16;
  blob(sx, h * 0.5, w * 0.16, w * 0.05, '#ff7a2a', 0.5, 'lighter');   // (the sun just set: its glow on the horizon)
  // clouds: soft puffs in rows near the horizon, fewer higher up
  for (let i = 0; i < 70; i++) {
    const x = r() * w, y = HZ - 6 - Math.pow(r(), 1.8) * HZ * 0.55, cw = w * (0.015 + r() * 0.035);
    for (let k = 0; k < 6; k++) blob(x + (r() - 0.5) * cw * 3, y + (r() - 0.5) * cw * 0.5, cw * (0.6 + r() * 0.6), cw * (0.35 + r() * 0.25), y > HZ * 0.8 ? '#ff8a5a' : '#3a2a4a', 0.25 + r() * 0.2);
    blob(x, y + cw * 0.35, cw * 2, cw * 0.4, '#1a1020', 0.18);
  }
  // islands on the horizon: low green humps, and a far volcano with a wisp of smoke
  const isle = (x, wd, ht, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x - wd, HZ + 1); for (let k = 0; k <= 20; k++) { const u = k / 20, yy = HZ - Math.sin(u * Math.PI) * ht * (0.8 + 0.2 * Math.sin(u * 17 + x)); g.lineTo(x - wd + u * wd * 2, yy); } g.lineTo(x + wd, HZ + 1); g.closePath(); g.fill(); };
  isle(w * 0.18, w * 0.05, h * 0.012, '#5c8f86'); isle(w * 0.35, w * 0.025, h * 0.008, '#6f9e95'); isle(w * 0.84, w * 0.06, h * 0.014, '#58897f');
  g.fillStyle = '#5a6a78'; g.beginPath(); g.moveTo(w * 0.04, HZ + 1); g.lineTo(w * 0.085, HZ - h * 0.035); g.lineTo(w * 0.095, HZ - h * 0.035); g.lineTo(w * 0.14, HZ + 1); g.closePath(); g.fill();
  for (let k = 0; k < 8; k++) blob(w * 0.09 + k * w * 0.006, HZ - h * 0.04 - k * h * 0.012, w * 0.012 + k * w * 0.002, w * 0.008, '#e8eef4', 0.5);
  // the sea's sparkle under the sun and a few wave lines
  for (let i = 0; i < 900; i++) { const y = HZ + Math.pow(r(), 2) * (h - HZ), x = sx + (r() - 0.5) * w * 0.25 * (1 + (y - HZ) / h); g.fillStyle = 'rgba(255,170,90,' + (0.15 + r() * 0.4) + ')'; g.fillRect(x, y, 1 + r() * 2, 1); }
  for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(220,225,255,' + (0.2 + r() * 0.6) + ')'; g.fillRect(r() * w, Math.pow(r(), 1.5) * HZ * 0.7, 1, 1); }   // stars
  return c;
}
function seaCanvas(n) {   // the sea under and round the island, seen from above: shallows to deep, a sparkle, then haze
  const c = cv(n, n), g = c.getContext('2d'), r = rnd(37), m = n / 2;
  const q = g.createRadialGradient(m, m, 0, m, m, m);
  q.addColorStop(0, '#0a1e24'); q.addColorStop(0.06, '#081a20'); q.addColorStop(0.16, '#06141a'); q.addColorStop(0.35, '#050f16'); q.addColorStop(0.7, '#081a28'); q.addColorStop(0.92, '#2a1a28'); q.addColorStop(1, '#4a2a2a');   // the sea at dusk (30 Oct 2026)
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
function popCanvas(text, col, plate) {   // a score pop-up: bold, outlined, crisp; a word pop (plate) sits on a dark plate with a thin gold edge
  const fs = 72, c0 = cv(8, 8), g0 = c0.getContext('2d'); g0.font = '900 ' + fs + 'px "Arial Black", Arial, sans-serif';
  const w = Math.ceil(g0.measureText(text).width + (plate ? 64 : 28)), h = fs + (plate ? 44 : 28), c = cv(w, h), g = c.getContext('2d');
  if (plate) {
    const r = 22, x0 = 3, y0 = 3, x1 = w - 3, y1 = h - 3;
    g.beginPath(); g.moveTo(x0 + r, y0); g.lineTo(x1 - r, y0); g.quadraticCurveTo(x1, y0, x1, y0 + r); g.lineTo(x1, y1 - r); g.quadraticCurveTo(x1, y1, x1 - r, y1);
    g.lineTo(x0 + r, y1); g.quadraticCurveTo(x0, y1, x0, y1 - r); g.lineTo(x0, y0 + r); g.quadraticCurveTo(x0, y0, x0 + r, y0); g.closePath();
    g.fillStyle = 'rgba(10,4,24,0.85)'; g.fill(); g.strokeStyle = '#d9a83a'; g.lineWidth = 3; g.stroke();
  }
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
// ---- wave 2 (30 Oct 2026, owner: "the most-watched digital pinball on YouTube"): a tall lit backglass and a topper, the
// fumarole pop bumpers' printed caps, the magma crabs' eyes, and the games room round the cabinet (title screen, trailers)
// the backglass (table x x0..x1, heights h0..h1, on the backbox's face at table y `face`) and the arched topper (tx0..tx1, th0 up, at table y tz)
const BG = { x0: WOOD_L + 4, x1: WOOD_R - 4, h0: 32, h1: 218, tx0: 46, tx1: 226, th0: 228, th1: 276, top: 226, face: -18.0, tz: -30 };
function topperArch(x) { const u = (x - (BG.tx0 + BG.tx1) / 2) / ((BG.tx1 - BG.tx0) / 2); return BG.th0 + 28 + 20 * Math.sqrt(Math.max(0, 1 - u * u)); }   // the topper's top edge at x
function crabArt(g, x, y, s, r, k) {   // a magma crab, cartoon, claws up (units; s = its size; k = px a unit, for the glow): coral shell, lava cracks, eyes on stalks
  g.save(); g.translate(x, y); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = '#7a1a0a'; g.lineWidth = s * 0.09;
  for (const sd of [-1, 1]) for (let L = 0; L < 3; L++) { g.beginPath(); g.moveTo(sd * s * 0.5, s * 0.1 + L * s * 0.1); g.quadraticCurveTo(sd * s * (0.95 + L * 0.08), -s * 0.05 + L * s * 0.12, sd * s * (1.05 + L * 0.06), s * 0.45 + L * s * 0.1); g.stroke(); }
  for (const sd of [-1, 1]) {   // arms up and the pincers
    g.lineWidth = s * 0.12; g.beginPath(); g.moveTo(sd * s * 0.6, -s * 0.05); g.quadraticCurveTo(sd * s * 1.05, -s * 0.2, sd * s * 0.95, -s * 0.62); g.stroke();
    g.save(); g.translate(sd * s * 0.95, -s * 0.78); g.rotate(sd * 0.35);
    const q = g.createLinearGradient(0, -s * 0.4, 0, s * 0.2); q.addColorStop(0, '#ffb070'); q.addColorStop(1, '#d8401a'); g.fillStyle = q;
    g.beginPath(); g.ellipse(0, 0, s * 0.26, s * 0.34, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff6a2a'; g.beginPath(); g.moveTo(-s * 0.2, -s * 0.2); g.quadraticCurveTo(-s * 0.32, -s * 0.62, -s * 0.06, -s * 0.66); g.quadraticCurveTo(-s * 0.08, -s * 0.36, -s * 0.02, -s * 0.24); g.fill();
    g.beginPath(); g.moveTo(s * 0.2, -s * 0.18); g.quadraticCurveTo(s * 0.34, -s * 0.5, s * 0.12, -s * 0.56); g.quadraticCurveTo(s * 0.08, -s * 0.34, s * 0.02, -s * 0.24); g.fill();
    g.restore();
  }
  const b = g.createRadialGradient(-s * 0.15, -s * 0.2, s * 0.05, 0, 0, s * 0.75); b.addColorStop(0, '#ffb070'); b.addColorStop(0.45, '#e2481c'); b.addColorStop(1, '#6a140a');
  g.fillStyle = b; g.beginPath(); g.ellipse(0, 0, s * 0.68, s * 0.42, 0, 0, Math.PI * 2); g.fill();
  g.save(); g.shadowColor = '#ffb02a'; g.shadowBlur = s * 0.25 * k; g.strokeStyle = '#ffd36a'; g.lineWidth = s * 0.035;
  for (let i = 0; i < 5; i++) { g.beginPath(); let px = -s * 0.4 + r() * s * 0.8, py = -s * 0.25 + r() * s * 0.2; g.moveTo(px, py); for (let q = 0; q < 3; q++) { px += (r() - 0.5) * s * 0.3; py += r() * s * 0.15; g.lineTo(px, py); } g.stroke(); }
  g.restore();
  g.strokeStyle = '#3a0a06'; g.lineWidth = s * 0.03; g.beginPath(); g.ellipse(0, 0, s * 0.68, s * 0.42, 0, 0, Math.PI * 2); g.stroke();
  for (const sd of [-1, 1]) {   // eyes on stalks, a glint in each
    g.strokeStyle = '#b8301a'; g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(sd * s * 0.16, -s * 0.3); g.lineTo(sd * s * 0.22, -s * 0.62); g.stroke();
    g.fillStyle = '#fff8e0'; g.beginPath(); g.arc(sd * s * 0.22, -s * 0.68, s * 0.13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#120808'; g.beginPath(); g.arc(sd * s * 0.2, -s * 0.66, s * 0.065, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(sd * s * 0.17, -s * 0.71, s * 0.03, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = '#3a0a06'; g.lineWidth = s * 0.04; g.beginPath(); g.arc(0, -s * 0.05, s * 0.18, 0.2, Math.PI - 0.2); g.stroke();   // a grin
  g.restore();
}
function explorerArt(g, x, y, s) {   // our explorer, a silhouette (feet at x, y; s = height): a wide hat, a pack, a torch held high
  g.save(); g.translate(x, y); g.fillStyle = '#07040a'; g.strokeStyle = '#07040a'; g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = s * 0.1; g.beginPath(); g.moveTo(-s * 0.08, 0); g.lineTo(-s * 0.04, -s * 0.42); g.moveTo(s * 0.1, 0); g.lineTo(s * 0.05, -s * 0.42); g.stroke();   // legs
  g.beginPath(); g.moveTo(-s * 0.12, -s * 0.4); g.lineTo(s * 0.12, -s * 0.4); g.lineTo(s * 0.1, -s * 0.74); g.lineTo(-s * 0.1, -s * 0.74); g.closePath(); g.fill();   // body
  g.fillRect(-s * 0.26, -s * 0.72, s * 0.17, s * 0.3);   // the pack
  g.beginPath(); g.arc(0, -s * 0.82, s * 0.08, 0, Math.PI * 2); g.fill();   // head
  g.beginPath(); g.ellipse(0, -s * 0.87, s * 0.19, s * 0.035, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(0, -s * 0.89, s * 0.09, s * 0.07, 0, Math.PI, Math.PI * 2); g.fill();   // the hat
  g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(s * 0.08, -s * 0.7); g.lineTo(s * 0.22, -s * 0.86); g.lineTo(s * 0.28, -s * 1.06); g.stroke();   // the arm up
  g.lineWidth = s * 0.035; g.beginPath(); g.moveTo(s * 0.24, -s * 1.0); g.lineTo(s * 0.32, -s * 1.16); g.stroke();   // the torch
  const f = g.createRadialGradient(s * 0.33, -s * 1.2, 0, s * 0.33, -s * 1.2, s * 0.22); f.addColorStop(0, 'rgba(255,250,200,1)'); f.addColorStop(0.35, 'rgba(255,170,50,0.9)'); f.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = f; g.beginPath(); g.arc(s * 0.33, -s * 1.2, s * 0.22, 0, Math.PI * 2); g.fill();
  g.lineWidth = s * 0.035; g.beginPath(); g.moveTo(-s * 0.08, -s * 0.66); g.lineTo(-s * 0.22, -s * 0.5); g.lineTo(-s * 0.3, -s * 0.06); g.stroke();   // the other arm, a stick
  g.restore();
}
// Ember Peak's backglass and its topper, one canvas (the topper's art in the top rows): a volcano erupting at night over the
// sea, our explorer on a ledge with a torch, a magma crab, EMBER PEAK in lava lettering (k px a unit: 4 on high, 2 on phones)
function backglassCanvas(k) {
  const GW = BG.x1 - BG.x0, GH = BG.h1 - BG.h0, TPH = BG.th1 - BG.th0, c = cv(GW * k, (GH + TPH) * k), g = c.getContext('2d'), r = rnd(365);
  const X = (x) => x - BG.x0, Y = (h) => TPH + (BG.h1 - h), K = k;
  g.scale(k, k);
  // ---- the glass
  g.save(); g.beginPath(); g.rect(0, TPH, GW, GH); g.clip();
  let q = g.createLinearGradient(0, Y(BG.h1), 0, Y(56)); q.addColorStop(0, '#05030f'); q.addColorStop(0.35, '#160830'); q.addColorStop(0.7, '#4a1036'); q.addColorStop(1, '#b23a1a');
  g.fillStyle = q; g.fillRect(0, TPH, GW, GH);
  for (let i = 0; i < 160; i++) { const a = 0.3 + r() * 0.7, z = r() < 0.08 ? 1.1 : 0.55; g.fillStyle = 'rgba(255,245,230,' + a + ')'; g.fillRect(r() * GW, Y(BG.h1) + Math.pow(r(), 1.4) * (GH * 0.62), z, z); }
  g.save(); g.shadowColor = '#fff2c8'; g.shadowBlur = 14 * K; g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(X(282), Y(196), 10, 0, Math.PI * 2); g.fill(); g.restore();   // the moon, a crescent
  g.fillStyle = '#0c0520'; g.beginPath(); g.arc(X(287), Y(199), 9.5, 0, Math.PI * 2); g.fill();
  const vx = X(78), vy = Y(146);   // the crater
  q = g.createRadialGradient(vx, vy, 4, vx, vy, 150); q.addColorStop(0, 'rgba(255,170,60,0.85)'); q.addColorStop(0.3, 'rgba(255,90,30,0.4)'); q.addColorStop(1, 'rgba(255,60,20,0)');
  g.fillStyle = q; g.fillRect(0, TPH, GW, GH);
  for (let i = 0; i < 34; i++) {   // the ash plume, lit from under
    const t = i / 34, px = vx + t * 120 + Math.sin(t * 9) * 8, py = vy - 10 - t * 70, rad = 7 + t * 22;
    q = g.createRadialGradient(px, py + rad * 0.3, 1, px, py, rad); q.addColorStop(0, 'rgba(120,60,60,' + (0.55 - t * 0.35) + ')'); q.addColorStop(0.6, 'rgba(50,30,50,' + (0.5 - t * 0.3) + ')'); q.addColorStop(1, 'rgba(30,20,40,0)');
    g.fillStyle = q; g.beginPath(); g.arc(px, py, rad, 0, Math.PI * 2); g.fill();
  }
  g.save(); g.lineCap = 'round'; g.shadowColor = '#ff7a1a'; g.shadowBlur = 10 * K;   // the fountain: jets and falling bombs
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.3, L = 24 + r() * 48, ex = vx + Math.cos(a) * L, ey = vy + Math.sin(a) * L;
    q = g.createLinearGradient(vx, vy, ex, ey); q.addColorStop(0, 'rgba(255,250,200,1)'); q.addColorStop(0.5, 'rgba(255,170,40,0.9)'); q.addColorStop(1, 'rgba(255,80,20,0)');
    g.strokeStyle = q; g.lineWidth = 0.8 + r() * 2.2; g.beginPath(); g.moveTo(vx + (r() - 0.5) * 6, vy); g.quadraticCurveTo((vx + ex) / 2, ey - 6, ex, ey); g.stroke();
  }
  for (let i = 0; i < 40; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.2, L = 20 + r() * 60; g.fillStyle = r() < 0.5 ? '#ffe08a' : '#ff8a2a'; g.beginPath(); g.arc(vx + Math.cos(a) * L, vy + Math.sin(a) * L * 0.8, 0.6 + r() * 1.4, 0, Math.PI * 2); g.fill(); }
  g.restore();
  // the island's far ridge (right), then the sea
  g.fillStyle = '#1c0c1e'; g.beginPath(); g.moveTo(X(150), Y(56)); for (let x = 150; x <= BG.x1 + 2; x += 6) g.lineTo(X(x), Y(60 + 7 * Math.sin(x * 0.05) + 4 * Math.sin(x * 0.13))); g.lineTo(X(BG.x1 + 2), Y(56)); g.closePath(); g.fill();
  q = g.createLinearGradient(0, Y(58), 0, Y(BG.h0)); q.addColorStop(0, '#3a1430'); q.addColorStop(0.25, '#1a0c26'); q.addColorStop(1, '#06040e'); g.fillStyle = q; g.fillRect(0, Y(58), GW, Y(BG.h0) - Y(58));
  for (let i = 0; i < 70; i++) { const yy = Y(57) + Math.pow(r(), 1.3) * 24, w = 4 + r() * 18; g.fillStyle = 'rgba(255,' + (120 + r() * 100 | 0) + ',50,' + (0.25 + r() * 0.5) + ')'; g.fillRect(vx - 40 + r() * 90 - w / 2, yy, w, 0.6); }
  // the volcano: dark rock, lit on its right by the lava, lava rivers down its flanks
  g.beginPath(); g.moveTo(X(-40), Y(54)); g.bezierCurveTo(X(10), Y(70), X(44), Y(108), X(64), Y(146)); g.lineTo(X(70), Y(149)); g.lineTo(X(86), Y(149)); g.lineTo(X(92), Y(146)); g.bezierCurveTo(X(110), Y(110), X(150), Y(72), X(200), Y(55)); g.closePath();
  q = g.createLinearGradient(X(20), 0, X(170), 0); q.addColorStop(0, '#0d070c'); q.addColorStop(0.55, '#24101a'); q.addColorStop(1, '#3a1a1c'); g.fillStyle = q; g.fill();
  g.save(); g.clip(); g.strokeStyle = 'rgba(90,40,50,0.5)'; g.lineWidth = 0.6;
  for (let i = 0; i < 30; i++) { const yy = Y(60 + r() * 85); g.beginPath(); g.moveTo(X(-20 + r() * 80), yy); g.lineTo(X(60 + r() * 120), yy + (r() - 0.5) * 6); g.stroke(); }
  g.restore();
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [x0, x1, x2, y2] of [[70, 50, 30, 64], [80, 84, 96, 58], [88, 116, 150, 60], [74, 66, 58, 90]]) {
    for (const [w, col, bl] of [[4.2, 'rgba(255,90,20,0.6)', 10], [1.9, '#ff9a2a', 5], [0.7, '#fff2a0', 2]]) {
      g.shadowColor = '#ff5a10'; g.shadowBlur = bl * K; g.strokeStyle = col; g.lineWidth = w;
      g.beginPath(); g.moveTo(X(x0), Y(147)); g.bezierCurveTo(X(x1), Y(122), X((x1 + x2) / 2 + 4), Y(92), X(x2), Y(y2)); g.stroke();
    }
  }
  g.restore();
  q = g.createRadialGradient(vx, vy + 1, 1, vx, vy + 1, 14); q.addColorStop(0, '#fffbe0'); q.addColorStop(0.4, '#ffb02a'); q.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = q; g.beginPath(); g.ellipse(vx, vy + 1, 14, 4, 0, 0, Math.PI * 2); g.fill();
  // the ledge (left, the foreground) and our explorer on it, black against the lava
  const ledge = [[-10, 84], [8, 80], [30, 72], [44, 60], [56, 46]];
  g.fillStyle = '#06030a'; g.beginPath(); g.moveTo(X(BG.x0 - 2), Y(BG.h0 - 2)); g.lineTo(X(BG.x0 - 2), Y(80)); ledge.forEach((p) => g.lineTo(X(p[0]), Y(p[1]))); g.lineTo(X(64), Y(BG.h0 - 2)); g.closePath(); g.fill();
  g.save(); g.strokeStyle = 'rgba(255,120,40,0.75)'; g.lineWidth = 0.8; g.shadowColor = '#ff6a1a'; g.shadowBlur = 4 * K; g.beginPath(); ledge.slice(0, 4).forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.stroke(); g.restore();
  explorerArt(g, X(-6), Y(83.5), 30);
  // the rocks (right, the foreground) and a magma crab on them
  g.fillStyle = '#06030a'; g.beginPath(); g.moveTo(X(232), Y(BG.h0 - 2)); g.lineTo(X(246), Y(44)); g.lineTo(X(268), Y(50)); g.lineTo(X(300), Y(47)); g.lineTo(X(BG.x1 + 2), Y(52)); g.lineTo(X(BG.x1 + 2), Y(BG.h0 - 2)); g.closePath(); g.fill();
  crabArt(g, X(268), Y(50), 20, r, K);
  // the title in lava lettering, and our name
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const tx = X(206), ty = Y(124); g.font = 'italic 900 27px "Arial Black", Arial, sans-serif';
  g.shadowColor = 'rgba(255,90,20,0.9)'; g.shadowBlur = 16 * K; g.lineWidth = 6; g.strokeStyle = '#2a0804'; g.strokeText('EMBER', tx - 26, ty - 13); g.strokeText('PEAK', tx + 22, ty + 15);
  g.shadowBlur = 0; g.lineWidth = 2.6; g.strokeStyle = '#ffd890'; g.strokeText('EMBER', tx - 26, ty - 13); g.strokeText('PEAK', tx + 22, ty + 15);
  q = g.createLinearGradient(0, ty - 26, 0, ty + 28); q.addColorStop(0, '#fff6c0'); q.addColorStop(0.3, '#ffc23a'); q.addColorStop(0.5, '#ff7a1a'); q.addColorStop(0.75, '#ffb02a'); q.addColorStop(1, '#e8401a');
  g.fillStyle = q; g.fillText('EMBER', tx - 26, ty - 13); g.fillText('PEAK', tx + 22, ty + 15);
  g.font = 'bold 8px "Arial Black", Arial, sans-serif'; g.fillStyle = '#fff3c4'; g.shadowColor = '#000'; g.shadowBlur = 3 * K; g.fillText('365 PINBALL HERO', tx - 4, Y(90));
  g.restore();
  for (let i = 0; i < 70; i++) { const z = 0.4 + r() * 0.9; g.fillStyle = 'rgba(255,' + (150 + r() * 100 | 0) + ',60,' + (0.4 + r() * 0.6) + ')'; g.fillRect(r() * GW, TPH + r() * GH * 0.85, z, z); }   // embers
  q = g.createLinearGradient(0, Y(BG.h1), 0, Y(BG.h0)); q.addColorStop(0, 'rgba(0,0,0,0.25)'); q.addColorStop(0.2, 'rgba(0,0,0,0)'); q.addColorStop(0.9, 'rgba(0,0,0,0)'); q.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = q; g.fillRect(0, TPH, GW, GH);
  g.strokeStyle = 'rgba(255,190,90,0.75)'; g.lineWidth = 0.7; g.strokeRect(2.5, TPH + 2.5, GW - 5, GH - 5);   // a gold pinstripe inside the frame
  g.restore();
  // ---- the topper (its own rows; table x tx0..tx1 squeezed across the full width)
  const sx = GW / (BG.tx1 - BG.tx0), TX = (x) => x - BG.tx0, TY = (h) => BG.th1 - h, TWd = BG.tx1 - BG.tx0;
  g.save(); g.scale(sx, 1);
  q = g.createLinearGradient(0, 0, 0, TPH); q.addColorStop(0, '#3a0c10'); q.addColorStop(1, '#120408'); g.fillStyle = q; g.fillRect(0, 0, TWd, TPH);
  q = g.createRadialGradient(TX(136), TY(240), 2, TX(136), TY(240), 70); q.addColorStop(0, 'rgba(255,120,30,0.7)'); q.addColorStop(1, 'rgba(255,60,20,0)'); g.fillStyle = q; g.fillRect(0, 0, TWd, TPH);
  g.save(); g.lineJoin = 'round'; g.shadowColor = '#ff7a1a'; g.shadowBlur = 6 * K; g.strokeStyle = '#ffb04a'; g.lineWidth = 1.4; g.beginPath();
  for (let x = BG.tx0 + 3; x <= BG.tx1 - 3; x += 2) { const h = topperArch(x) - 3; if (x === BG.tx0 + 3) g.moveTo(TX(x), TY(h)); else g.lineTo(TX(x), TY(h)); }
  g.lineTo(TX(BG.tx1 - 3), TY(BG.th0 + 2)); g.lineTo(TX(BG.tx0 + 3), TY(BG.th0 + 2)); g.closePath(); g.stroke(); g.restore();
  for (let i = 0; i < 9; i++) {   // flames along its foot
    const x = BG.tx0 + 14 + i * 19.5; g.save(); g.shadowColor = '#ff5a10'; g.shadowBlur = 5 * K; q = g.createLinearGradient(0, TY(BG.th0 + 3), 0, TY(BG.th0 + 15)); q.addColorStop(0, '#ffe08a'); q.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = q;
    g.beginPath(); g.moveTo(TX(x - 6), TY(BG.th0 + 3)); g.quadraticCurveTo(TX(x - 4), TY(BG.th0 + 10), TX(x + 1), TY(BG.th0 + 15 + (i % 2) * 4)); g.quadraticCurveTo(TX(x + 2), TY(BG.th0 + 8), TX(x + 6), TY(BG.th0 + 3)); g.fill(); g.restore();
  }
  g.restore();
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';   // (unsqueezed: the lettering keeps its shape)
  const cx = GW / 2; g.font = 'italic 900 16px "Arial Black", Arial, sans-serif'; g.shadowColor = '#ff6a1a'; g.shadowBlur = 8 * K; g.lineWidth = 3.5; g.strokeStyle = '#2a0804'; g.strokeText('365', cx, TY(259));
  q = g.createLinearGradient(0, TY(268), 0, TY(250)); q.addColorStop(0, '#fff6c0'); q.addColorStop(0.5, '#ffc23a'); q.addColorStop(1, '#ff7a1a'); g.fillStyle = q; g.shadowBlur = 0; g.fillText('365', cx, TY(259));
  g.font = 'bold 9px "Arial Black", Arial, sans-serif'; g.shadowColor = '#000'; g.shadowBlur = 2 * K; g.fillStyle = '#fff0c8'; g.fillText('PINBALL  HERO', cx, TY(242));
  g.restore();
  crabArt(g, GW * 0.16, TY(241), 15, r, K); crabArt(g, GW * 0.84, TY(241), 15, r, K);
  return c;
}
// a fumarole pop bumper's printed cap (30 Oct 2026): cream plastic, an erupting vent printed in the middle, FUMAROLE round its
// edge, the outer ring is the cap's lit side band. Neutral and warm: each bumper's own colour tints it as it glows.
function fumaroleCapCanvas(pts) {   // pts: the table's own bumper score (30 Oct 2026, owner: the cap said 1000, Ember pays 5000)
  const n = 256, c = cv(n, n), g = c.getContext('2d'), m = n / 2, r = rnd(73);
  g.fillStyle = '#ffd890'; g.fillRect(0, 0, n, n);
  const q = g.createRadialGradient(m, m, 4, m, m, m * 0.84); q.addColorStop(0, '#fff8e8'); q.addColorStop(0.7, '#f6dcb0'); q.addColorStop(1, '#e8b880'); g.fillStyle = q; g.beginPath(); g.arc(m, m, m * 0.84, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#3a1608'; g.lineWidth = 5; g.beginPath(); g.arc(m, m, m * 0.84, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(m, m, m * 0.56, 0, Math.PI * 2); g.stroke();
  g.save(); g.fillStyle = '#3a1608'; g.font = 'bold 21px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const word = ('FUMAROLE • ' + pts + ' • ').repeat(2), N = word.length;
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 - Math.PI / 2; g.save(); g.translate(m + Math.cos(a) * m * 0.7, m + Math.sin(a) * m * 0.7); g.rotate(a + Math.PI / 2); g.fillText(word[i], 0, 0); g.restore(); }
  g.restore();
  g.fillStyle = '#2a1410'; g.beginPath(); g.moveTo(m - 46, m + 34); g.lineTo(m - 13, m - 18); g.lineTo(m + 13, m - 18); g.lineTo(m + 46, m + 34); g.closePath(); g.fill();   // the vent: a little volcano, erupting
  g.save(); g.lineCap = 'round'; g.strokeStyle = '#e8501a'; g.lineWidth = 6;
  for (const [a, L] of [[-1.57, 40], [-1.95, 32], [-1.2, 32], [-2.3, 22], [-0.85, 22]]) { g.beginPath(); g.moveTo(m, m - 20); g.lineTo(m + Math.cos(a) * L, m - 20 + Math.sin(a) * L); g.stroke(); }
  g.strokeStyle = '#ffb02a'; g.lineWidth = 3; for (const x of [-22, 0, 20]) { g.beginPath(); g.moveTo(m + x * 0.4, m - 16); g.lineTo(m + x, m + 30); g.stroke(); }
  g.restore();
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(120,60,30,' + (0.05 + r() * 0.08) + ')'; g.beginPath(); g.arc(r() * n, r() * n, 2 + r() * 6, 0, Math.PI * 2); g.fill(); }
  return c;
}
function crabEyeCanvas() {   // a magma crab's eye (a sphere's uvs; u 0.25 faces the player): glossy cream, a black pupil ringed amber
  const w = 128, h = 64, c = cv(w, h), g = c.getContext('2d');
  g.fillStyle = '#fff4d0'; g.fillRect(0, 0, w, h);
  const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, 'rgba(255,255,255,0)'); q.addColorStop(1, 'rgba(200,140,60,0.5)'); g.fillStyle = q; g.fillRect(0, 0, w, h);
  g.fillStyle = '#120806'; g.beginPath(); g.ellipse(w * 0.25, h * 0.45, w * 0.085, h * 0.22, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ff9a2a'; g.beginPath(); g.ellipse(w * 0.25, h * 0.45, w * 0.04, h * 0.1, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#120806'; g.beginPath(); g.ellipse(w * 0.25, h * 0.45, w * 0.022, h * 0.065, 0, 0, Math.PI * 2); g.fill();
  return c;
}
// ---- the games room (30 Oct 2026, owner: "a table in a room" for the title screen and trailers): all our own designs
function neon(gs, text, x, y, px, col, font) {   // a neon sign's tube lettering on the colour and the glow canvases (gs: [g, glow-g])
  gs.forEach((g, i) => {
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.font = (font || 'bold ') + px + 'px "Arial Black", Arial, sans-serif';
    g.shadowColor = col; g.shadowBlur = px * 0.6; g.strokeStyle = col; g.lineWidth = px * 0.12; g.strokeText(text, x, y);
    g.shadowBlur = px * 0.2; g.strokeStyle = i ? 'rgba(255,240,250,0.8)' : rgba(col, 1); g.lineWidth = px * 0.04; g.strokeText(text, x, y);
    g.restore();
  });
}
function neonPath(gs, col, w, draw) { gs.forEach((g, i) => { g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = col; g.shadowBlur = w * 5; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); draw(g); g.stroke(); g.shadowBlur = w; g.strokeStyle = i ? 'rgba(255,245,250,0.7)' : col; g.lineWidth = w * 0.35; g.stroke(); g.restore(); }); }
function carpetCanvas(n) {   // the arcade carpet, one tile (tiles both ways): night blue, scattered neon shapes that glow under the blacklight
  const col = cv(n, n), glo = cv(n, n), g = col.getContext('2d'), gg = glo.getContext('2d'), r = rnd(1365), u = n / 512;
  g.fillStyle = '#0c0a1c'; g.fillRect(0, 0, n, n); gg.fillStyle = '#000'; gg.fillRect(0, 0, n, n);
  for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,30,70,0.5)' : 'rgba(5,4,12,0.5)'; g.fillRect(r() * n, r() * n, 2 * u, 2 * u); }   // the pile
  const C = ['#ff3cac', '#2ee6ff', '#ff8a1a', '#ffe14a', '#7a5cff'];
  const shapes = [
    (q, s) => { q.beginPath(); q.moveTo(-s, s * 0.6); q.lineTo(-s * 0.25, -s * 0.6); q.lineTo(s * 0.25, -s * 0.6); q.lineTo(s, s * 0.6); q.stroke(); q.beginPath(); q.moveTo(0, -s * 0.7); q.lineTo(0, -s * 1.2); q.stroke(); },   // a little volcano
    (q, s) => { q.beginPath(); for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI * 3, rr = s * k / 24; q.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } q.stroke(); },   // a swirl
    (q, s) => { q.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 4 / 5; q.lineTo(Math.cos(a) * s, Math.sin(a) * s); } q.closePath(); q.stroke(); },   // a star
    (q, s) => { q.beginPath(); q.moveTo(-s, 0); for (let k = 1; k <= 4; k++) q.lineTo(-s + k * s / 2, (k % 2 ? -1 : 1) * s * 0.4); q.stroke(); },   // a zigzag
    (q, s) => { q.beginPath(); q.arc(0, 0, s * 0.5, 0, Math.PI * 2); q.stroke(); q.beginPath(); q.arc(0, 0, s * 0.15, 0, Math.PI * 2); q.stroke(); }   // a ring
  ];
  for (let i = 0; i < 22; i++) {
    const x = r() * n, y = r() * n, s = (9 + r() * 12) * u, a = r() * Math.PI * 2, c = C[i % C.length], f = shapes[Math.floor(r() * shapes.length)];
    for (const [q, w, al] of [[g, 2.6 * u, 0.6], [gg, 2.6 * u, 0.8]]) for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      if (x + ox < -s * 1.5 || x + ox > n + s * 1.5 || y + oy < -s * 1.5 || y + oy > n + s * 1.5) continue;
      q.save(); q.translate(x + ox, y + oy); q.rotate(a); q.globalAlpha = al; q.strokeStyle = c; q.lineWidth = w; q.lineCap = 'round'; f(q, s); q.restore();
    }
  }
  return { col, glo };
}
// the room's walls, one canvas: a dark panelled wall, a chair rail, and our neon signs (365 ARCADE, LAVA LOUNGE, HIGH SCORE, OPEN LATE)
function wallCanvases(w) {
  const h = w / 2, col = cv(w, h), glo = cv(w, h), g = col.getContext('2d'), gg = glo.getContext('2d'), u = w / 2048, r = rnd(52);
  let q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, '#07060c'); q.addColorStop(0.6, '#15101f'); q.addColorStop(1, '#0c0a12'); g.fillStyle = q; g.fillRect(0, 0, w, h);
  gg.fillStyle = '#000'; gg.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = 0; x < w; x += 128 * u) g.fillRect(x, 0, 3 * u, h);   // panel seams
  g.fillStyle = '#1e1428'; g.fillRect(0, h * 0.72, w, h * 0.28); g.fillStyle = '#2a1d33'; g.fillRect(0, h * 0.715, w, 8 * u);   // the wainscot and its rail
  for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(255,255,255,' + r() * 0.03 + ')'; g.fillRect(r() * w, r() * h, 30 * u, 1 * u); }
  const both = [g, gg];
  neonPath(both, '#2ee6ff', 6 * u, (c) => { c.moveTo(40 * u, 60 * u); for (let x = 40; x <= 2008; x += 48) c.lineTo(x * u, (x / 48) % 2 ? 44 * u : 60 * u); });   // a zigzag tube along the top
  neonPath(both, '#ff3cac', 5 * u, (c) => { c.moveTo(0, h * 0.705); c.lineTo(w, h * 0.705); });   // a tube along the rail
  neon(both, '365 ARCADE', 760 * u, 250 * u, 150 * u, '#ff3cac', 'italic 900 ');
  neonPath(both, '#2ee6ff', 7 * u, (c) => { c.moveTo(330 * u, 345 * u); c.lineTo(1190 * u, 345 * u); });
  neonPath(both, '#ff8a1a', 8 * u, (c) => { c.moveTo(1500 * u, 330 * u); c.lineTo(1580 * u, 190 * u); c.lineTo(1620 * u, 190 * u); c.lineTo(1700 * u, 330 * u); });   // LAVA LOUNGE's volcano
  neonPath(both, '#ffe14a', 6 * u, (c) => { c.moveTo(1600 * u, 180 * u); c.lineTo(1585 * u, 120 * u); c.moveTo(1600 * u, 180 * u); c.lineTo(1630 * u, 110 * u); c.moveTo(1600 * u, 180 * u); c.lineTo(1560 * u, 140 * u); });
  neon(both, 'LAVA LOUNGE', 1600 * u, 400 * u, 60 * u, '#ff8a1a');
  neon(both, 'HIGH SCORE', 260 * u, 560 * u, 54 * u, '#ffe14a');
  neonPath(both, '#ffe14a', 5 * u, (c) => { for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k * Math.PI * 4 / 5; c.lineTo(260 * u + Math.cos(a) * 40 * u, 480 * u + Math.sin(a) * 40 * u); } });
  neon(both, 'OPEN LATE', 1840 * u, 590 * u, 44 * u, '#2ee6ff');
  neon(both, 'PLAY', 1240 * u, 600 * u, 70 * u, '#7a5cff', 'italic 900 ');
  neonPath(both, '#7a5cff', 7 * u, (c) => { c.moveTo(1340 * u, 600 * u); c.lineTo(1420 * u, 600 * u); c.moveTo(1395 * u, 575 * u); c.lineTo(1420 * u, 600 * u); c.lineTo(1395 * u, 625 * u); });
  q = g.createLinearGradient(0, 0, w, 0); q.addColorStop(0, 'rgba(0,0,0,0.55)'); q.addColorStop(0.2, 'rgba(0,0,0,0)'); q.addColorStop(0.8, 'rgba(0,0,0,0)'); q.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = q; g.fillRect(0, 0, w, h);
  return { col, glo };
}
// the room's cabinets, one atlas (fractions of the canvas, v down): RA the uprights' fronts, RB their sides, RC1/RC2 the other
// pinballs' backglasses, RD our cabinet's side art, RE our coin door, RF brushed steel, RG black body, RH the other pinballs' playfields
const RA = [0, 0, 0.25, 0.5], RB = [0.25, 0, 0.5, 0.5], RC1 = [0.5, 0, 0.75, 0.5], RC2 = [0.75, 0, 1, 0.5], RD = [0, 0.5, 0.5, 0.75], RE = [0.5, 0.5, 0.625, 0.75], RF = [0.64, 0.52, 0.735, 0.73], RG = [0.75, 0.5, 1, 0.75], RH = [0, 0.75, 0.5, 1], RH2 = [0.5, 0.75, 1, 1];
function roomAtlas(S) {
  const col = cv(S, S), glo = cv(S, S), g = col.getContext('2d'), gg = glo.getContext('2d'), r = rnd(908), u = S / 512;
  gg.fillStyle = '#000'; gg.fillRect(0, 0, S, S);
  const at = (R, f) => { const x = R[0] * S, y = R[1] * S, w = (R[2] - R[0]) * S, h = (R[3] - R[1]) * S; [g, gg].forEach((q, i) => { q.save(); q.beginPath(); q.rect(x, y, w, h); q.clip(); q.translate(x, y); f(q, w, h, i); q.restore(); }); };
  // RA: an upright's front: a lit marquee, a glowing screen of our own pixel game, the control panel, a coin door
  at(RA, (q, w, h, i) => {
    q.fillStyle = i ? '#000' : '#16121e'; q.fillRect(0, 0, w, h);
    let gr = q.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ff3cac'); gr.addColorStop(1, '#7a5cff'); q.fillStyle = gr; q.fillRect(w * 0.06, h * 0.03, w * 0.88, h * 0.1);
    q.fillStyle = '#fff'; q.font = 'italic 900 ' + (14 * u) + 'px Arial Black, Arial'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('365 INVADERS', w / 2, h * 0.08);
    q.fillStyle = '#05060c'; q.fillRect(w * 0.1, h * 0.18, w * 0.8, h * 0.34);
    const cs = ['#ff5cc8', '#3fe0ff', '#ffd84a'], k = w * 0.0075;   // our own 365 Invaders on the screen
    for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 4; xx++) invader(q, ART[['orb', 'moth', 'bot'][yy]], w * (0.15 + xx * 0.18), h * (0.21 + yy * 0.07), k, cs[yy]);
    q.fillStyle = '#fff'; q.fillRect(w * 0.47, h * 0.47, w * 0.12, h * 0.015); q.beginPath(); q.arc(w * 0.52, h * 0.43, w * 0.02, 0, Math.PI * 2); q.fill();
    if (!i) { q.fillStyle = '#2a2232'; q.fillRect(0, h * 0.55, w, h * 0.1); q.fillStyle = '#ff3a3a'; q.beginPath(); q.arc(w * 0.3, h * 0.6, w * 0.05, 0, Math.PI * 2); q.fill(); q.fillStyle = '#ffe14a'; q.beginPath(); q.arc(w * 0.6, h * 0.6, w * 0.04, 0, Math.PI * 2); q.fill(); q.beginPath(); q.arc(w * 0.72, h * 0.6, w * 0.04, 0, Math.PI * 2); q.fill(); q.fillStyle = '#3a3440'; q.fillRect(w * 0.3, h * 0.72, w * 0.4, h * 0.16); }
    q.fillStyle = '#ff3a2a'; q.fillRect(w * 0.38, h * 0.76, w * 0.07, h * 0.03); q.fillRect(w * 0.55, h * 0.76, w * 0.07, h * 0.03);
  });
  at(RB, (q, w, h, i) => { q.fillStyle = i ? '#000' : '#120e18'; q.fillRect(0, 0, w, h); q.save(); q.shadowColor = '#2ee6ff'; q.shadowBlur = 6 * u; q.strokeStyle = i ? '#2a8aa0' : '#2ee6ff'; q.lineWidth = 5 * u; q.beginPath(); q.moveTo(0, h * 0.9); q.lineTo(w, h * 0.35); q.stroke(); q.strokeStyle = i ? '#a02a70' : '#ff3cac'; q.beginPath(); q.moveTo(0, h * 0.97); q.lineTo(w, h * 0.45); q.stroke(); q.restore(); });
  // RC1 / RC2: the other pinballs' backglasses (our own: a comet over a ringed planet; a sunburst over waves)
  at(RC1, (q, w, h) => {
    let gr = q.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1a4a'); gr.addColorStop(1, '#3a0a5a'); q.fillStyle = gr; q.fillRect(0, 0, w, h);
    q.fillStyle = '#ffb02a'; q.beginPath(); q.arc(w * 0.6, h * 0.6, w * 0.22, 0, Math.PI * 2); q.fill(); q.strokeStyle = '#2ee6ff'; q.lineWidth = 4 * u; q.beginPath(); q.ellipse(w * 0.6, h * 0.6, w * 0.38, w * 0.08, -0.3, 0, Math.PI * 2); q.stroke();
    gr = q.createLinearGradient(w * 0.1, h * 0.1, w * 0.4, h * 0.3); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, '#fff'); q.strokeStyle = gr; q.lineWidth = 6 * u; q.beginPath(); q.moveTo(w * 0.05, h * 0.08); q.lineTo(w * 0.4, h * 0.3); q.stroke();
    for (let k = 0; k < 40; k++) { q.fillStyle = '#fff'; q.fillRect(r() * w, r() * h * 0.5, 1.5 * u, 1.5 * u); }
  });
  at(RC2, (q, w, h) => {
    q.fillStyle = '#0a3a2a'; q.fillRect(0, 0, w, h);
    for (let k = 0; k < 16; k++) { q.fillStyle = k % 2 ? '#ffe14a' : '#ff8a1a'; q.beginPath(); q.moveTo(w / 2, h * 0.55); const a0 = Math.PI + k / 16 * Math.PI, a1 = Math.PI + (k + 1) / 16 * Math.PI; q.lineTo(w / 2 + Math.cos(a0) * w, h * 0.55 + Math.sin(a0) * w); q.lineTo(w / 2 + Math.cos(a1) * w, h * 0.55 + Math.sin(a1) * w); q.fill(); }
    for (let k = 0; k < 4; k++) { q.strokeStyle = k % 2 ? '#2ee6ff' : '#fff'; q.lineWidth = 5 * u; q.beginPath(); for (let x = 0; x <= w; x += 4) q.lineTo(x, h * (0.62 + k * 0.08) + Math.sin(x / w * 12 + k) * 6 * u); q.stroke(); }
  });
  // RD: Ember Peak's side art: black lacquer, lava flames rising from the foot, a volcano and the name
  at(RD, (q, w, h, i) => {
    q.fillStyle = i ? '#000' : '#100608'; q.fillRect(0, 0, w, h);
    for (let k = 0; k < 26; k++) { const x = k / 25 * w, fh = h * (0.3 + r() * 0.45); const gr = q.createLinearGradient(0, h, 0, h - fh); gr.addColorStop(0, i ? 'rgba(255,90,20,0.6)' : '#ff6a1a'); gr.addColorStop(0.6, i ? 'rgba(255,60,10,0.15)' : '#a8200a'); gr.addColorStop(1, 'rgba(60,0,0,0)'); q.fillStyle = gr; q.beginPath(); q.moveTo(x - w * 0.04, h); q.quadraticCurveTo(x - w * 0.03, h - fh * 0.5, x + (r() - 0.5) * w * 0.03, h - fh); q.quadraticCurveTo(x + w * 0.02, h - fh * 0.5, x + w * 0.04, h); q.fill(); }
    if (!i) { q.fillStyle = '#1a0a0e'; q.beginPath(); q.moveTo(w * 0.62, h * 0.85); q.lineTo(w * 0.74, h * 0.3); q.lineTo(w * 0.79, h * 0.3); q.lineTo(w * 0.92, h * 0.85); q.fill(); }
    q.save(); q.strokeStyle = '#ffb02a'; q.lineWidth = 2 * u; q.shadowColor = '#ff6a1a'; q.shadowBlur = 6 * u; q.beginPath(); q.moveTo(w * 0.76, h * 0.3); q.lineTo(w * 0.72, h * 0.6); q.moveTo(w * 0.77, h * 0.3); q.lineTo(w * 0.83, h * 0.66); q.stroke(); q.restore();
    q.save(); q.font = 'italic 900 ' + (26 * u) + 'px Arial Black, Arial'; q.textAlign = 'left'; q.textBaseline = 'middle'; q.lineJoin = 'round'; q.lineWidth = 5 * u; q.strokeStyle = '#2a0804'; q.strokeText('EMBER PEAK', w * 0.06, h * 0.3);
    const gr = q.createLinearGradient(0, h * 0.2, 0, h * 0.4); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.5, '#ffb02a'); gr.addColorStop(1, '#e8401a'); q.fillStyle = gr; q.fillText('EMBER PEAK', w * 0.06, h * 0.3); q.restore();
    q.fillStyle = i ? '#000' : '#c8a060'; q.fillRect(0, 0, w, 2 * u); q.fillRect(0, h - 2 * u, w, 2 * u);
  });
  // RE: our coin door: steel, two lit coin entries (1 PLAY), the service plate
  at(RE, (q, w, h, i) => {
    let gr = q.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#5a5e66'); gr.addColorStop(0.5, '#a8acb4'); gr.addColorStop(1, '#5a5e66'); q.fillStyle = i ? '#000' : gr; q.fillRect(0, 0, w, h);
    if (!i) { q.strokeStyle = '#2a2c30'; q.lineWidth = 2 * u; q.strokeRect(w * 0.08, h * 0.05, w * 0.84, h * 0.9); }
    for (const yy of [0.2, 0.42]) { q.fillStyle = '#ff2a1a'; q.fillRect(w * 0.25, h * yy, w * 0.5, h * 0.12); q.fillStyle = i ? '#000' : '#1a0606'; q.fillRect(w * 0.47, h * (yy + 0.015), w * 0.06, h * 0.09); q.fillStyle = '#fff2c8'; q.font = 'bold ' + (7 * u) + 'px Arial'; q.textAlign = 'center'; q.fillText('1 PLAY', w / 2, h * (yy + 0.165)); }
    if (!i) { q.fillStyle = '#2a2c30'; q.fillRect(w * 0.3, h * 0.7, w * 0.4, h * 0.05); q.beginPath(); q.arc(w * 0.5, h * 0.85, w * 0.06, 0, Math.PI * 2); q.fill(); }
  });
  at([0.625, 0.5, 0.75, 0.75], (q, w, h, i) => { q.fillStyle = i ? '#000' : '#9a9ea8'; q.fillRect(0, 0, w, h); if (!i) for (let k = 0; k < 60; k++) { q.fillStyle = 'rgba(255,255,255,' + r() * 0.15 + ')'; q.fillRect(0, r() * h, w, 1); } });
  at(RG, (q, w, h, i) => { q.fillStyle = i ? '#000' : '#141018'; q.fillRect(0, 0, w, h); if (!i) { q.fillStyle = '#3a2f45'; q.fillRect(0, h * 0.82, w, h * 0.04); } });
  // RH / RH2: the other pinballs' playfields under glass, seen from a distance: colour, lit inserts, chrome
  [[RH, ['#1a3a8a', '#ff3cac', '#ffe14a', '#2ee6ff']], [RH2, ['#0a5a3a', '#ff8a1a', '#ffe14a', '#ff3a3a']]].forEach(([R, cs]) => at(R, (q, w, h, i) => {
    q.fillStyle = i ? '#000' : cs[0]; q.fillRect(0, 0, w, h); if (!i) { q.fillStyle = 'rgba(0,0,0,0.45)'; q.fillRect(0, 0, w, h); }
    for (let k = 0; k < 60; k++) { q.fillStyle = cs[1 + k % 3]; q.globalAlpha = i ? 0.45 : 0.8; q.beginPath(); q.arc(r() * w, r() * h, (2 + r() * 4) * u, 0, Math.PI * 2); q.fill(); }
    q.globalAlpha = 1; q.strokeStyle = i ? '#000' : '#dde2ea'; q.lineWidth = 2 * u; q.beginPath(); q.arc(w * 0.5, h * 0.2, w * 0.3, Math.PI, 0); q.stroke();
  }));
  return { col, glo };
}
// a box in the room (raw scene units) with an atlas rect on each face it shows: R = { px, nx, py, pz, nz } (default R.all)
function uvBox(G, x0, x1, y0, y1, z0, z1, R) {
  const face = (a, b, c, d, n, rc) => {
    if (!rc) return;
    const uv = [[rc[0], 1 - rc[3]], [rc[2], 1 - rc[3]], [rc[2], 1 - rc[1]], [rc[0], 1 - rc[1]]], P = [a, b, c, d];
    const ix = P.map((p, k) => G.v(p[0], p[1], p[2], n[0], n[1], n[2], uv[k][0], uv[k][1])); G.quad(ix[0], ix[1], ix[2], ix[3]);
  };
  const d = R.all;
  face([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], R.pz || d);
  face([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], R.nz || d);
  face([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], R.px || d);
  face([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], R.nx || d);
  face([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], R.py || d);
}
// the volcano's skin, wrapped round the cone (u round it, 0 = facing the player; v up it): black rock, a crusted rim,
// and on the glow canvas lava veins running down from the crater and the glowing mouth at the front, at its foot
function coneCanvases() {
  const w = 512, h = 256, col = cv(w, h), glo = cv(w, h), g = col.getContext('2d'), gg = glo.getContext('2d'), r = rnd(71);
  g.drawImage(noiseCanvas(64, 32, 5, 10), 0, 0, w, h);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = '#5a4c50'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(10,8,12,0.3)'; g.fillRect(0, 0, w, h);
  const ash = g.createLinearGradient(0, 0, 0, h); ash.addColorStop(0, 'rgba(190,176,170,0.6)'); ash.addColorStop(0.45, 'rgba(120,104,104,0.25)'); ash.addColorStop(1, 'rgba(10,6,8,0.45)');
  g.fillStyle = ash; g.fillRect(0, 0, w, h);   // grey ash high up, warm brown rock at the foot: the cone's form reads from above
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) { let x = r() * w, y = h * 0.04; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 10; y += h * 0.11; g.lineTo(x, y); } g.lineWidth = 2 + r() * 4; g.strokeStyle = 'rgba(8,6,8,0.55)'; g.stroke(); }
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
  for (let i = 0; i < 8; i++) vein((i + 0.3 + r() * 0.4) / 8 * w, h * (0.45 + r() * 0.45), 4 + r() * 3);
  return { col, glo };
}
function shellCanvases() {   // a magma crab's shell (a sphere's uvs: v = 1 at the top): dark crust, glowing cracks on its back
  const w = 256, h = 128, col = cv(w, h), glo = cv(w, h), g = col.getContext('2d'), gg = glo.getContext('2d'), r = rnd(83);
  const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, '#ff8a4a'); q.addColorStop(0.28, '#e8481c'); q.addColorStop(0.46, '#8a1c0c'); q.addColorStop(0.5, '#ffd08a'); q.addColorStop(0.56, '#e8a060'); q.addColorStop(1, '#6a2a14');   // a coral shell, a cream rim (wave 2, 30 Oct 2026: it reads against the purple field; it was dark crust)
  g.fillStyle = q; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.55 ? 'rgba(110,14,4,0.45)' : 'rgba(255,200,140,0.3)'; g.beginPath(); g.arc(r() * w, r() * h * 0.46, 1 + r() * 3, 0, Math.PI * 2); g.fill(); }
  gg.fillStyle = '#000'; gg.fillRect(0, 0, w, h);
  gg.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
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
function cavernCanvas(w, h) {   // THE MAGMA CHAMBER's cave round the cabinet (equirectangular): deep red rock, glowing seams below
  const c = cv(w, h), g = c.getContext('2d'), r = rnd(91);
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#0c0405'); grd.addColorStop(0.45, '#2a0b07'); grd.addColorStop(0.62, '#4a1408'); grd.addColorStop(0.75, '#ff6a1a'); grd.addColorStop(0.8, '#5a1606'); grd.addColorStop(1, '#1a0604');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h * 0.7, s = 8 + r() * 60; g.fillStyle = 'rgba(' + (20 + r() * 40 | 0) + ',' + (4 + r() * 10 | 0) + ',4,' + (0.25 + r() * 0.4) + ')'; g.beginPath(); g.ellipse(x, y, s * 1.6, s, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(255,120,30,0.55)'; g.lineWidth = Math.max(1, w / 900);
  for (let i = 0; i < 40; i++) { let x = r() * w, y = h * (0.35 + r() * 0.35); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * w * 0.03; y += r() * h * 0.03; g.lineTo(x, y); } g.stroke(); }
  return c;
}
function crustCanvas(n) {   // a sealed crater's crust: cooled black rock with glowing cracks (round, for the pool's disc)
  const c = cv(n, n), g = c.getContext('2d'), r = rnd(37), m = n / 2;
  g.fillStyle = '#1a1214'; g.beginPath(); g.arc(m, m, m, 0, 7); g.fill();
  for (let i = 0; i < 40; i++) { const a = r() * 7, d = r() * m * 0.85, s = n * (0.04 + r() * 0.08); g.fillStyle = 'rgba(' + (30 + r() * 30 | 0) + ',' + (24 + r() * 16 | 0) + ',' + (26 + r() * 16 | 0) + ',0.9)'; g.beginPath(); g.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, s, 0, 7); g.fill(); }
  g.strokeStyle = '#ff7a1a'; g.lineWidth = n / 70; g.shadowColor = '#ff5a10'; g.shadowBlur = n / 25;
  for (let i = 0; i < 9; i++) { let a = r() * 7, d = m * 0.1; g.beginPath(); g.moveTo(m + Math.cos(a) * d, m + Math.sin(a) * d); for (let k = 0; k < 5; k++) { a += (r() - 0.5) * 0.7; d += m * 0.17; g.lineTo(m + Math.cos(a) * d, m + Math.sin(a) * d); } g.stroke(); }
  return c;
}
// the arch's ends: a half circle, but a level's roof (wave 3) stops where it meets the side walls (x 6 and its right wall)
function archA0(T) { if (!T.level) return Math.PI; const c = Math.max(-1, Math.min(1, (6 - T.arch.x) / T.arch.R)); return 2 * Math.PI - Math.acos(c); }
function archA1(T) { if (!T.level) return 2 * Math.PI; const xr = T.shooter ? T.shooter.x0 : T.W - 26, c = Math.max(-1, Math.min(1, (xr - T.arch.x) / T.arch.R)); return 2 * Math.PI - Math.acos(c); }
function makeSkyEnv(renderer, skyTex) {   // Ember Peak: the arcade room (was the sky and the sea till 30 Oct 2026)
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
  let TB = null, arcadeEnv = null;
  const BUILT = {};   // every table built so far, kept (wave 3)
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
  function popTexture(text, col, plate) {
    const k = text + '|' + col + (plate ? '|p' : ''); let e = popTex.get(k);
    if (e) { popTex.delete(k); popTex.set(k, e); return e; }
    const c = popCanvas(text, col, plate); e = { t: tex(c, { aniso: ANISO }), aspect: c.width / c.height };
    popTex.set(k, e);
    if (popTex.size > 40) { const old = popTex.keys().next().value; popTex.get(old).t.dispose(); popTex.delete(old); }
    return e;
  }

  // the ball pool: chrome balls reflecting the table round them
  const BR0 = 7, BVIS = 1.3;   // the ball is drawn 30% bigger than the engine's (owner, 29 Oct 2026: "bigger ball", then "push it further") so it reads on a phone
  const cubeRT = keepS(new THREE.WebGLCubeRenderTarget(opts.reflectSize || (PHONE ? 64 : 128), { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }));
  const cubeCam = new THREE.CubeCamera(2, 2500, cubeRT); scene.add(cubeCam);
  cubeCam.children.forEach((c) => c.layers.set(1));
  const ballMat = keepS(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.05, envMap: cubeRT.texture, envMapIntensity: 1.3 }));
  const ballGeo = keepS(new THREE.SphereGeometry(BR0 * BVIS, 48, 32));
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
    const TH_ = THEMES[tid] || (T.level ? THEMES.chamber : THEMES.orbit), CAVE = TH_.world === 'cavern', ISLAND = TH_.world === 'island' || CAVE;   // (a level shares the island's look; CAVE marks what differs)
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
    (function () { const A = T.arch, pts = [], a0 = archA0(T), a1 = archA1(T); for (let k = 0; k <= 48; k++) { const a = a0 + (a1 - a0) * k / 48; pts.push([A.x + A.R * Math.cos(a), A.y + A.R * Math.sin(a)]); } for (let k = 0; k < 48; k++) parts.push({ seg: [pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]], r: 2.2, h: H.arch }); })();
    POSTS.forEach((p) => parts.push({ circle: [p.x, p.y, p.r + 0.4], h: H.post }));
    BUMPERS.forEach((Bm) => parts.push({ circle: [Bm.x, Bm.y, Bm.r + 1], h: ISLAND ? POP.top : H.bumpCap }));
    T.slings.forEach((s) => parts.push({ poly: offsetPoly([s.a, s.b, s.c], 3, 6), h: H.sling }));
    DROPS.forEach((d) => parts.push({ seg: [d.ax, d.ay, d.bx, d.by], r: 2.2, h: H.drop * 0.5 }));
    (T.voids || []).forEach((v) => parts.push({ poly: v, h: H.void }));
    if (T.volcano) parts.push({ circle: [T.volcano.x, T.volcano.y, T.volcano.r - 2], h: 44 });
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
    const LIFT = opts.lift != null ? opts.lift : ISLAND ? 0.36 : 0.34, liftU = { value: LIFT };
    // the self-light is laid on through the GI map: pools of lamp light on a dim table (Ember Peak, 30 Oct 2026, owner: "the full realism rebuild"); the old table's is even
    const giT = keep(tex(ISLAND ? giCanvas(T, B || { BUMPERS }) : (() => { const c = cv(2, 2), g = c.getContext('2d'); g.fillStyle = 'rgb(85,85,85)'; g.fillRect(0, 0, 2, 2); return c; })(), { linear: true }));
    const giU = { value: giT }, giK = { value: 3.0 };
    const lift = (m) => { m.onBeforeCompile = (sh) => { sh.uniforms.uLift = liftU; sh.uniforms.uGI = giU; sh.uniforms.uGIk = giK; sh.fragmentShader = 'uniform float uLift; uniform sampler2D uGI; uniform float uGIk;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * uLift * texture2D(uGI, vMapUv).rgb * uGIk;'); }; m.customProgramCacheKey = () => 'lift-gi'; return m; };
    const pfMatHi = keep(lift(new THREE.MeshPhysicalMaterial({ map: pfTex, roughness: ISLAND ? 0.5 : 0.62, metalness: 0, clearcoat: ISLAND ? 1 : 0.45, clearcoatRoughness: ISLAND ? 0.06 : 0.05, envMapIntensity: ISLAND ? 0.55 : 0.1 })));   // the island's: a glossy clear coat that shows the lamps (30 Oct 2026)
    const pfMatLo = keep(lift(new THREE.MeshStandardMaterial({ map: pfTex, roughness: ISLAND ? 0.26 : 0.5, metalness: 0, envMapIntensity: ISLAND ? 0.5 : 0.18 })));
    let glowTex = null;
    if (artGlow) { glowTex = keep(tex(artGlow, { aniso: ANISO })); [pfMatHi, pfMatLo].forEach((m) => { m.emissiveMap = glowTex; m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = ISLAND ? 1.0 : 1.1; }); }   // (island 1.45 -> 1.0 under arcade light, 30 Oct 2026: the ball stays the brightest thing)
    const pfGeo = keep(new THREE.PlaneGeometry(TW, TH)); pfGeo.rotateX(-Math.PI / 2);
    const playfield = RF(new THREE.Mesh(pfGeo, tier.clearcoat ? pfMatHi : pfMatLo)); group.add(playfield);

    // ---- the world beyond, and what the shiny things reflect
    let envRT, ballSky, skyTex = null, skyKey = '', world = null;
    if (ISLAND) {
      // the chrome reflects the arcade, not the sky (30 Oct 2026); made once and shared by every table (wave 3)
      if (!arcadeEnv) { const ac = keepS(tex(arcadeEnvCanvas(1024, 512), { wrapS: true })); ac.mapping = THREE.EquirectangularReflectionMapping; arcadeEnv = { ac, envRT: keepS(makeSkyEnv(renderer, ac)) }; }
      envRT = arcadeEnv.envRT;
      ballSky = arcadeEnv.ac;
      if (CAVE) world = buildCavern();
      else { const sc = islandSkyCanvas(PHONE ? 1024 : 2048, PHONE ? 512 : 1024), st = keep(tex(sc, { wrapS: true })); st.mapping = THREE.EquirectangularReflectionMapping; world = buildIsland(st); }
    } else {
      envRT = makeRoomEnv(renderer, pfTex, TW, TH);
      ballSky = keep(tex(ballSkyCanvas())); ballSky.mapping = THREE.EquirectangularReflectionMapping;
    }
    if (!ISLAND) disposables.push(envRT);
    function buildCavern() {   // THE MAGMA CHAMBER: the inside of the mountain round the cabinet (one dome, no sea)
      const w = new THREE.Group(), ct = keep(tex(cavernCanvas(PHONE ? 1024 : 1536, PHONE ? 512 : 768), { wrapS: true }));
      const skyMat = keep(new THREE.MeshBasicMaterial({ map: ct, side: THREE.BackSide, depthWrite: false, fog: false }));
      const dome = new THREE.Mesh(keep(new THREE.SphereGeometry(4200, 24, 12)), skyMat); dome.renderOrder = -10; w.add(dome);
      const seaMat = keep(new THREE.MeshBasicMaterial({ color: 0x1a0503 }));
      const floorG = keep(new THREE.PlaneGeometry(9000, 9000)); floorG.rotateX(-Math.PI / 2);
      const floor = new THREE.Mesh(floorG, seaMat); floor.position.y = -95; w.add(floor);
      return { group: w, skyMat, seaMat, skirt: new THREE.Group() };
    }
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
    const M = {   // the island's chrome is bright on a dark arcade: it shows the tubes and the lamps (30 Oct 2026, owner: "the full realism rebuild")
      chrome: keep(new THREE.MeshStandardMaterial({ color: ISLAND ? 0xf4f6fa : 0xe6ebf4, metalness: 1, roughness: ISLAND ? 0.1 : 0.17, envMapIntensity: ISLAND ? 2.6 : 1 })),
      darkChrome: keep(new THREE.MeshStandardMaterial({ color: ISLAND ? 0xc0c6d0 : 0x9aa3b4, metalness: 1, roughness: ISLAND ? 0.24 : 0.3, envMapIntensity: ISLAND ? 2 : 1 })),
      rubberW: keep(new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.55, envMapIntensity: 0.4 })),
      rubberB: keep(new THREE.MeshStandardMaterial({ color: ISLAND ? 0x141317 : 0x17161c, roughness: ISLAND ? 0.42 : 0.5, envMapIntensity: ISLAND ? 0.9 : 0.6 })),
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
    (function () { const A = T.arch, pts = [], a0 = archA0(T), a1 = archA1(T); for (let k = 0; k <= 120; k++) { const a = a0 + (a1 - a0) * k / 120; pts.push([A.x + A.R * Math.cos(a), A.y + A.R * Math.sin(a)]); } sweep(chrome, pts, A.r + 0.2, H.arch, { arc: 8 }); })();
    sweep(chrome, [[7.2, -14], [7.2, TH]], 1.4, 2.6, { base: H.wood - 1 });
    sweep(chrome, [[264.8, -14], [264.8, TH]], 1.4, 2.6, { base: H.wood - 1 });
    if (ISLAND) { box(chrome, -6, 8.6, H.wood - 0.2, H.wood + 2.2, -18, TH + 24); box(chrome, 263.4, 278, H.wood - 0.2, H.wood + 2.2, -18, TH + 24); }   // metal side rails along the cabinet's top edges (30 Oct 2026, owner: "the full realism rebuild")

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
      if (ISLAND) { const F = []; for (let i = 0; i < Math.min(6, n); i++) { const p = RP[i], lx = -p[4], ly = p[3]; F.push([chrome.v(wx(p[0] + lx * (rampHW + 0.5)), p[2] + 0.12, wz(p[1] + ly * (rampHW + 0.5)), 0, 1, 0, 0, 0), chrome.v(wx(p[0] - lx * (rampHW + 0.5)), p[2] + 0.12, wz(p[1] - ly * (rampHW + 0.5)), 0, 1, 0, 1, 0)]); } for (let i = 0; i < F.length - 1; i++) chrome.quad(F[i][0], F[i + 1][0], F[i + 1][1], F[i][1]); }   // the metal entrance flap (30 Oct 2026)
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
      const clearMat = keep(new THREE.MeshPhysicalMaterial({ color: ISLAND ? 0xe8f2ff : TH_.ramp, roughness: 0.04, metalness: 0, transparent: true, opacity: ISLAND ? 0.16 : 0.2, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: ISLAND ? 2.2 : 0.9 }));   // the island's: clear plastic, a cool tint, the lamps in its gloss (30 Oct 2026)
      const rampClear = new THREE.Mesh(keep(clear.geometry()), clearMat); rampClear.renderOrder = 3; group.add(rampClear);
      const wallMat = keep(new THREE.MeshStandardMaterial({ color: ISLAND ? 0xf0f6ff : TH_.rampWall, emissive: new THREE.Color(TH_.rampWall), emissiveIntensity: ISLAND ? 0.05 : 0.22, roughness: ISLAND ? 0.04 : 0.12, metalness: 0, transparent: true, opacity: ISLAND ? 0.2 : 0.36, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: ISLAND ? 2.4 : 1 }));
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

    // ---- the cabinet: sides and back, the front and lockdown bar; the corners outside the arch
    const wood = new Geo();
    box(wood, WOOD_L, 8, 0, H.wood, -18, TH + 0.5); box(wood, 264, WOOD_R, 0, H.wood, -18, TH + 0.5);
    box(wood, WOOD_L, WOOD_R, 0, H.wood, -18, 3);
    box(wood, WOOD_L, WOOD_R, 0, H.front, TH + 0.5, TH + 24);
    if (ISLAND) { box(wood, WOOD_L, WOOD_R, -14, -1.5, -18, TH + 24); }   // (its underside: seen from the low angles)
    group.add(RF(new THREE.Mesh(keep(wood.geometry()), M.wood)));
    const backbox = new THREE.Group(); group.add(backbox);
    if (ISLAND) {   // Ember Peak's backbox (30 Oct 2026, wave 2, owner: "the dark empty band above the backbox"): a tall lit backglass in a chrome bezel and an arched topper, filling the portrait home's top; 3 draw calls
      const GH = BG.h1 - BG.h0, TPH = BG.th1 - BG.th0, vG = GH / (GH + TPH), bt = keep(tex(backglassCanvas(tierName === 'high' && !PHONE ? 4 : 2), { aniso: ANISO }));   // (2 px a unit on phones: less memory than the old strip)
      const gl = new Geo(), lq = new Geo(), ch = new Geo(), Zg = wz(BG.face), TZ = wz(BG.tz), tu = (x) => (x - BG.tx0) / (BG.tx1 - BG.tx0), tv = (h) => vG + (h - BG.th0) / TPH * (1 - vG);
      const q4 = (G, P, uv, n) => { const ix = P.map((p, k) => G.v(p[0], p[1], p[2], n[0], n[1], n[2], uv[k][0], uv[k][1])); G.quad(ix[0], ix[1], ix[2], ix[3]); };
      q4(gl, [[wx(BG.x0), BG.h0, Zg], [wx(BG.x1), BG.h0, Zg], [wx(BG.x1), BG.h1, Zg], [wx(BG.x0), BG.h1, Zg]], [[0, 0], [1, 0], [1, vG], [0, vG]], [0, 0, 1]);
      const rim = [[BG.tx0, BG.th0]]; for (let k = 0; k <= 32; k++) { const x = BG.tx0 + (BG.tx1 - BG.tx0) * k / 32; rim.push([x, topperArch(x)]); } rim.push([BG.tx1, BG.th0]);
      const c0 = gl.v(wx((BG.tx0 + BG.tx1) / 2), BG.th0, TZ, 0, 0, 1, 0.5, tv(BG.th0)), ri = rim.map((p) => gl.v(wx(p[0]), p[1], TZ, 0, 0, 1, tu(p[0]), tv(p[1])));
      for (let k = 0; k < ri.length - 1; k++) gl.tri(c0, ri[k], ri[k + 1]);   // the topper's face, a fan round its arch
      const b0 = lq.v(wx((BG.tx0 + BG.tx1) / 2), BG.th0, TZ - 6, 0, 0, -1, 0, 0), rb = rim.map((p) => lq.v(wx(p[0]), p[1], TZ - 6, 0, 0, -1, p[0] / 120, p[1] / 120));
      for (let k = 0; k < rb.length - 1; k++) lq.tri(b0, rb[k], rb[k + 1]);   // its back, and its edge
      for (let k = 1; k < rim.length - 2; k++) { const a = rim[k], b = rim[k + 1], nx = -(b[1] - a[1]), ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1; q4(lq, [[wx(a[0]), a[1], TZ], [wx(b[0]), b[1], TZ], [wx(b[0]), b[1], TZ - 6], [wx(a[0]), a[1], TZ - 6]], [[0, 0], [0.1, 0], [0.1, 0.05], [0, 0.05]], [nx / l, ny / l, 0]); }
      box(lq, WOOD_L - 6, WOOD_R + 6, 0, BG.top, -46, -18.4);   // the box itself
      [[BG.x0 - 3.2, BG.x1 + 3.2, BG.h0 - 3.2, BG.h0 + 0.6], [BG.x0 - 3.2, BG.x1 + 3.2, BG.h1 - 0.6, BG.h1 + 3.2], [BG.x0 - 3.2, BG.x0 + 0.6, BG.h0 - 3.2, BG.h1 + 3.2], [BG.x1 - 0.6, BG.x1 + 3.2, BG.h0 - 3.2, BG.h1 + 3.2]].forEach((b) => box(ch, b[0], b[1], b[2], b[3], BG.face - 1.6, BG.face + 1.4));   // the bezel
      box(ch, WOOD_L - 7.5, WOOD_R + 7.5, BG.top, BG.top + 2.2, -47.5, -17.2);   // the crown trim
      wire(ch, rim.slice(1, rim.length - 1).map((p) => [p[0], BG.tz + 0.4, p[1]]), 1.3, 6); wire(ch, [[BG.tx0, BG.tz + 0.4, BG.th0 + 0.5], [BG.tx1, BG.tz + 0.4, BG.th0 + 0.5]], 1.1, 6);   // the topper's chrome edge
      const glass = new THREE.Mesh(keep(gl.geometry()), keep(new THREE.MeshStandardMaterial({ map: bt, emissiveMap: bt, emissive: 0xffffff, emissiveIntensity: 0.95, roughness: 0.14, metalness: 0, envMapIntensity: 0.7 }))); glass.name = 'backglass';
      backbox.add(glass, new THREE.Mesh(keep(lq.geometry()), M.wood), new THREE.Mesh(keep(ch.geometry()), M.chrome));
    } else {   // the old table's backbox: only its lit speaker panel shows, in the strip above the arch
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
    const lock = R1(new THREE.Mesh(lockGeo, keep(new THREE.MeshStandardMaterial({ color: ISLAND ? 0xb8bcc6 : 0x2a2e36, metalness: 1, roughness: ISLAND ? 0.38 : 0.35, envMapIntensity: ISLAND ? 0.8 : 0.6 }))));
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
      if (ISLAND) { sweep(chrome, left.slice(0, 5), 0.8, 1.2, { base: H.apron - 0.3 }); sweep(chrome, right.slice(right.length - 5), 0.8, 1.2, { base: H.apron - 0.3 }); }   // the apron's metal edge (30 Oct 2026)
      const dg = keep(new THREE.PlaneGeometry(2 * gap, TH - tipY - 6)); dg.rotateX(-Math.PI / 2);
      const drain = new THREE.Mesh(dg, keep(new THREE.MeshBasicMaterial({ color: ISLAND ? 0x062a3a : 0x010103 }))); drain.position.set(wx(MID), 0.08, wz((tipY + 6 + TH) / 2)); group.add(drain);
    })();

    const chromeMesh = RF(new THREE.Mesh(keep(chrome.geometry()), M.chrome)); group.add(chromeMesh);

    // ---- slingshots: white rubber round the posts, a coloured plastic on top (Ember Peak: black rubber, 30 Oct 2026)
    const slings = T.slings.map((s, i) => {
      const col = TH_.sling[i % 2], tri = [s.a, s.b, s.c];
      const rub = new Geo(); sweep(rub, offsetPoly(tri, 1.5, 8), 1.0, 6, { closed: true, base: 3 });
      group.add(R1(new THREE.Mesh(keep(rub.geometry()), ISLAND ? M.rubberB : M.rubberW)));
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
    let pop = null;
    const bumpers = ISLAND ? (function () {   // Ember Peak's fumaroles as real pop bumpers (30 Oct 2026, wave 2, owner: "stacked discs"): a rocky vent base, a black body, a lit amber skirt, a chrome ring that snaps down, a printed cap lit from inside, set lower (top 20, was 26: less ball hidden behind them). 5 draw calls for all (8 each before)
      const n = BUMPERS.length, rockL = [], blackL = [], v2 = (a) => a.map((q) => new THREE.Vector2(q[0], q[1]));
      BUMPERS.forEach((Bm, i) => {
        const lg = new THREE.LatheGeometry(v2([[Bm.r + 4.6, 0.05], [Bm.r + 4.0, 1.3], [Bm.r + 2.4, 2.7], [Bm.r + 0.8, 3.6], [Bm.r - 1.2, 4.0]]), 30), P = lg.attributes.position;
        for (let k = 0; k < P.count; k++) { const x = P.getX(k), y = P.getY(k), z = P.getZ(k), f = 1 + 0.16 * (fbm3(x * 0.35 + i * 7, y * 0.5, z * 0.35, 2) - 0.5) * Math.min(1, y / 1.2); P.setXYZ(k, x * f, y * (0.8 + 0.5 * fbm3(z * 0.4, x * 0.4, i, 2)), z * f); }
        lg.computeVertexNormals(); lg.translate(wx(Bm.x), 0, wz(Bm.y)); rockL.push(lg);
        const body = new THREE.CylinderGeometry(Bm.r - 4.6, Bm.r - 4.0, POP.rim - 3.6, 20, 1, true); body.translate(wx(Bm.x), 3.6 + (POP.rim - 3.6) / 2, wz(Bm.y)); blackL.push(body);
      });
      group.add(R1(new THREE.Mesh(keep(mergeGeos(rockL)), M.rock)), R1(new THREE.Mesh(keep(mergeGeos(blackL)), M.black))); rockL.concat(blackL).forEach((q) => q.dispose());
      // the instanced parts glow each in its own bumper's colour: the instance colour tints the emissive only (the print keeps its colours lit)
      const tintE = (m) => { m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n\ttotalEmissiveRadiance *= vColor.rgb;\n#endif'); }; m.customProgramCacheKey = () => 'tint-e'; return m; };
      const Rb = BUMPERS[0].r, CR = Rb + 1.6, capT = keep(tex(fumaroleCapCanvas(B && B.PTS ? B.PTS.bumper : 100), { aniso: ANISO }));
      const capG = keep(new THREE.LatheGeometry(v2([[0.01, POP.top + 0.1], [CR * 0.3, POP.top], [CR * 0.65, POP.top - 0.5], [CR - 1.0, POP.top - 1.5], [CR, POP.rim + 2.4], [CR, POP.rim + 0.3], [CR - 0.6, POP.rim - 0.2], [Rb - 4.4, POP.rim - 0.2]]).reverse(), 40));
      { const P = capG.attributes.position, uv = capG.attributes.uv; for (let k = 0; k < P.count; k++) uv.setXY(k, P.getX(k) / (2 * CR) * 0.95 + 0.5, 0.5 - P.getZ(k) / (2 * CR) * 0.95); }
      const capMat = keep(tintE(new THREE.MeshStandardMaterial({ map: capT, emissiveMap: capT, emissive: 0xffffff, roughness: 0.16, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 1.2 })));
      const skirtG = keep(new THREE.CylinderGeometry(Rb + 1.4, Rb + 2.0, 1.1, 36)); skirtG.translate(0, POP.skirt, 0);
      const skirtMat = keep(tintE(new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xffffff, roughness: 0.28, metalness: 0, envMapIntensity: 0.8 })));
      const ringG = keep(new THREE.TorusGeometry(Rb + 0.3, 0.95, 8, 36)); ringG.rotateX(Math.PI / 2);
      const caps = R1(new THREE.InstancedMesh(capG, capMat, n)), skirts = R1(new THREE.InstancedMesh(skirtG, skirtMat, n)), rings = R1(new THREE.InstancedMesh(ringG, M.chrome, n));
      const m4 = new THREE.Matrix4(), c3 = new THREE.Color();
      BUMPERS.forEach((Bm, i) => { m4.makeTranslation(wx(Bm.x), 0, wz(Bm.y)); caps.setMatrixAt(i, m4); skirts.setMatrixAt(i, m4); m4.makeTranslation(wx(Bm.x), POP.ring, wz(Bm.y)); rings.setMatrixAt(i, m4); c3.set(TH_.bump[i % 3].c); caps.setColorAt(i, c3); skirts.setColorAt(i, c3); });
      [caps, skirts, rings].forEach((m) => { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(m); }); caps.name = 'bumper cap';
      pop = { caps, skirts, rings };
      return BUMPERS.map((Bm, i) => ({ col: new THREE.Color(TH_.bump[i % 3].c), hit: 0, x: Bm.x, y: Bm.y }));
    })() : BUMPERS.map((Bm, i) => {
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
      const bat = new THREE.Group(); grp.add(bat); bat.scale.set(1, 1.42, 1.08);   // drawn taller and a little wider than the engine's bat, same pivot and length; width kept near 1 so the bigger drawn ball (BVIS) sinks ~2.4-2.6 into the drawn rubber at contact (3.0-3.8 at width 1.26), and the tip matches the engine's (29 Oct 2026, owner: "push it further"; review fix)
      bat.add(R1(new THREE.Mesh(rg, M.rubberR)), R1(new THREE.Mesh(bg, M.batW)));
      const pin = R1(new THREE.Mesh(cylinder(2.4, 2.6, 1.2, 20), M.chrome)); pin.position.y = 10.4; bat.add(pin);
      const sc = flipperShadowCanvas(f), sg = keep(new THREE.PlaneGeometry(sc.w, sc.h)); sg.rotateX(-Math.PI / 2); sg.translate(sc.w / 2 - sc.pad, 0, 0);
      const sh = new THREE.Mesh(sg, keep(new THREE.MeshBasicMaterial({ map: keep(tex(sc.c)), transparent: true, depthWrite: false, opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
      sh.position.y = 0.06; sh.scale.set(1, 1, 1.08); grp.add(sh);
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
    const plunger = T.shooter && T.shooter.none ? null : (function () {
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
    const postGeo = keep(ISLAND ? (() => {   // star posts: a fluted chrome star, a domed nut on top (30 Oct 2026, owner: "the full realism rebuild")
      const st = new THREE.Shape(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = k % 2 ? 0.76 : 1; if (k) st.lineTo(Math.cos(a) * r, Math.sin(a) * r); else st.moveTo(r, 0); } st.closePath();
      const prism = new THREE.ExtrudeGeometry(st, { depth: 0.86, bevelEnabled: false }); prism.rotateX(-Math.PI / 2);
      const cap = new THREE.LatheGeometry([[0.001, 0.86], [0.84, 0.86], [0.84, 0.9], [0.6, 0.98], [0.001, 1.03]].map((q) => new THREE.Vector2(q[0], q[1])), 14);
      const g = mergeGeos([prism, cap]); prism.dispose(); cap.dispose(); return g;
    })() : new THREE.LatheGeometry([[0, 0], [1, 0], [1, 0.86], [0.8, 0.95], [0.45, 1], [0, 1.02]].map((q) => new THREE.Vector2(q[0], q[1])), 16));
    T.slings.forEach((s) => [s.a, s.b, s.c].forEach((p) => posts.push([p[0], p[1], H.post, 1.6])));
    POSTS.forEach((p) => posts.push([p.x, p.y, H.post, 1.3]));
    if (T.lava) T.lava.gates.forEach((g) => { posts.push([g[0], g[1], 30, 2.4], [g[2], g[3], 30, 2.4]); });
    // ---- Ember Peak's die-cut art plastics on their posts (one draw call for them all; the posts are star posts below)
    if (ISLAND) {
      const lobed = (cx, cy, rx, ry, tips) => { const P = []; for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2, up = Math.max(0, -Math.sin(a)), f = 1 + tips * up * Math.pow(Math.abs(Math.cos(a * 3.5)), 3); P.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f]); } return P; };
      const PL = [
        { pts: lobed(37, 334, 15, 9, 0.45), z: 22, art: 'flame', stand: [[27, 342], [27, 352], [48, 330]] },
        { pts: lobed(213, 334, 15, 9, 0.2), z: 22, art: 'palm', stand: [[223, 342], [223, 352], [202, 330]] },
        { pts: offsetPoly([[31, 215], [53, 215], [53, 229], [31, 229]], 2, 4), z: 31.5, art: 'drop', stand: [] },
        { pts: offsetPoly([[197, 215], [219, 215], [219, 229], [197, 229]], 2, 4), z: 31.5, art: 'drop', stand: [] }
      ].slice(0, CAVE ? 2 : 4).map((q) => (CAVE ? Object.assign({}, q, { art: 'flame' }) : q)), S = 10, at = plasticsAtlas(PL, S), geos = [];   // (the chamber: flames on both, no beach)
      PL.forEach((p, i) => {
        const b = at.cells[i], g = extrude(p.pts, p.z, 0.8, 0.25), P = g.attributes.position, uv = g.attributes.uv;
        for (let k = 0; k < P.count; k++) uv.setXY(k, (b.ox + (P.getX(k) + HW - b.x0) * S) / at.AW, 1 - (P.getZ(k) + ZC - b.y0) * S / at.AH);
        geos.push(g); p.stand.forEach((q) => posts.push([q[0], q[1], p.z, 1.1]));
      });
      const ptx = keep(tex(at.c, { aniso: ANISO })), pm = keep(new THREE.MeshStandardMaterial({ map: ptx, emissiveMap: ptx, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.9, depthWrite: true, envMapIntensity: 1.2 }));
      const plastics = R1(new THREE.Mesh(keep(mergeGeos(geos)), pm)); geos.forEach((g) => g.dispose()); plastics.renderOrder = 2; plastics.name = 'art plastics'; plastics.userData.occl = true; group.add(plastics);   // writes depth and counts as solid: the ball under one gets the xray outline and the sight-line check sees it (30 Oct 2026)
    }
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
    if (T.volcano && CAVE) {
      const V = T.volcano, HV = 9, grp = new THREE.Group(); grp.position.set(wx(V.x), 0, wz(V.y)); group.add(grp);
      const R0 = V.r, prof = [[R0 + 6, 0], [R0 + 4, 2.4], [R0 + 1.6, 6.5], [R0 - 0.4, 8.6], [R0 - 2.4, 9], [R0 - 4, 7.6], [R0 - 5, 5.2]];
      const cg = keep(new THREE.LatheGeometry(prof.map((q) => new THREE.Vector2(q[0], q[1])), 40));
      { const P = cg.attributes.position; for (let k = 0; k < P.count; k++) { const x = P.getX(k), y = P.getY(k), z = P.getZ(k), rr = Math.hypot(x, z) || 1, n = (fbm3(x / 4, y / 4, z / 4, 3) - 0.5) * (y > 1 ? 2.4 : 0); P.setXYZ(k, x + x / rr * n, y, z + z / rr * n); } cg.computeVertexNormals(); }
      const cc = coneCanvases(), ct = keep(tex(cc.col, { wrapS: true, aniso: ANISO })), cgt = keep(tex(cc.glo, { wrapS: true }));
      const coneMat = keep(new THREE.MeshStandardMaterial({ map: ct, emissiveMap: cgt, emissive: new THREE.Color(TH_.lava), emissiveIntensity: 0.8, roughness: 0.8, metalness: 0, envMap: envRT.texture, envMapIntensity: 0.6 }));
      const cone = RF(new THREE.Mesh(cg, coneMat)); grp.add(cone);
      const poolG = keep(new THREE.CircleGeometry(R0 - 4, 32)); poolG.rotateX(-Math.PI / 2);
      const poolMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a1a').multiplyScalar(3) }));
      const pool = R1(new THREE.Mesh(poolG, poolMat)); pool.position.y = 5.4; cone.add(pool);
      const lavaLight = RF(new THREE.PointLight(0xff6a1a, 0, 150, 2)); lavaLight.position.set(0, 20, 6); grp.add(lavaLight);
      toys.volcano = { grp, cone, coneMat, poolMat, lavaLight, HV, POOL: 5.4, k: 1, fount: 0, lastCarry: 0, smokeAcc: 0, x: V.x, y: V.y, r: V.r, scoop: true };
    } else if (T.volcano) {
      // one screen (29 Oct 2026): a proper cone standing up off the playfield even at rest - concave flanks from a wide
      // foot (a low flare inside the ball's reach: a ball touching the 22-unit collision circle clears it) up to a
      // crusted rim round a lava crater the ball can sit in
      const V = T.volcano, HV = 60, POOL = 55.6, grp = new THREE.Group(); grp.position.set(wx(V.x), 0, wz(V.y)); group.add(grp);
      const R0 = V.r, prof = [[R0 + 7.5, 0], [R0 + 4.6, 0.6], [R0 + 2.6, 1.6], [R0 + 1.2, 3.5], [R0 - 0.3, 8], [R0 - 2.4, 14], [R0 - 4.6, 21], [R0 - 6.6, 29], [R0 - 8.3, 37],
        [R0 - 9.6, 45], [R0 - 10.4, 51.5], [R0 - 10.7, 56.5], [R0 - 10.6, 59.2], [R0 - 11.4, 60], [R0 - 12.3, 59.4], [R0 - 12.7, 57.6], [R0 - 12.8, POOL]];
      // rock, not a smooth cone (30 Oct 2026, owner: "the full realism rebuild"): the profile finely resampled, every vertex pushed
      // in or out by 3D noise (the same at the lathe's seam), only inwards low down where the ball meets it, crevices dark
      // and glowing with lava (aCrack), the rim kept round the crater
      const fine = []; for (let i = 0; i < prof.length - 1; i++) { const a = prof[i], b = prof[i + 1], m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.6)); for (let k = 0; k < m; k++) fine.push([a[0] + (b[0] - a[0]) * k / m, a[1] + (b[1] - a[1]) * k / m]); }
      fine.push(prof[prof.length - 1]);
      const SEG = 96, cg = keep(new THREE.LatheGeometry(fine.map((q) => new THREE.Vector2(q[0], q[1])), SEG));
      { const P = cg.attributes.position, uv = cg.attributes.uv, crack = new Float32Array(P.count), np = fine.length;
        for (let k = 0; k < P.count; k++) {
          const x = P.getX(k), y = P.getY(k), z = P.getZ(k), rr = Math.hypot(x, z) || 1, n = fbm3(x / 7, y / 9, z / 7, 4) - 0.5, ridge = Math.abs(fbm3(x / 5 + 9, y / 4, z / 5, 3) - 0.5);
          const amp = y < 2 ? 0 : y < 16 ? -Math.abs(n) * 2.6 * (y - 2) / 14 : y > 54 ? n * 0.9 : n * 4.2 - Math.max(0, 0.08 - ridge) * 14;
          P.setXYZ(k, x + x / rr * amp, y + (y > 2 && y < 54 ? n * 1.2 : 0), z + z / rr * amp);
          crack[k] = y < 1 ? 0 : clamp((0.045 - ridge) / 0.035, 0, 1) * (0.4 + 0.6 * clamp(y / 40, 0, 1)) + clamp(-n * 1.6 - 0.35, 0, 1) * 0.3;
          uv.setY(k, clamp(y / HV, 0, 1));
        }
        cg.computeVertexNormals();
        const N = cg.attributes.normal; for (let j = 0; j < np; j++) { const a = j, b = SEG * np + j, nx = N.getX(a) + N.getX(b), ny = N.getY(a) + N.getY(b), nz = N.getZ(a) + N.getZ(b), l = Math.hypot(nx, ny, nz) || 1; N.setXYZ(a, nx / l, ny / l, nz / l); N.setXYZ(b, nx / l, ny / l, nz / l); }   // (no seam)
        cg.setAttribute('aCrack', new THREE.BufferAttribute(crack, 1)); }
      const cc = coneCanvases(), ct = keep(tex(cc.col, { wrapS: true, aniso: ANISO })), cgt = keep(tex(cc.glo, { wrapS: true }));
      const coneMat = keep(new THREE.MeshStandardMaterial({ map: ct, emissiveMap: cgt, emissive: new THREE.Color(TH_.lava), emissiveIntensity: 0.8, roughness: 0.78, metalness: 0, envMap: envRT.texture, envMapIntensity: 0.7 }));
      coneMat.onBeforeCompile = (sh) => {
        sh.vertexShader = 'attribute float aCrack; varying float vCrack;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvCrack = aCrack;');
        sh.fragmentShader = 'varying float vCrack;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\tdiffuseColor.rgb *= 1.0 - 0.6 * vCrack;\n\ttotalEmissiveRadiance += emissive * vCrack * vCrack * 1.6;');
      };
      coneMat.customProgramCacheKey = () => 'rock-crack';
      const cone = RF(new THREE.Mesh(cg, coneMat)); grp.add(cone);
      if (V.mouth) cone.rotation.y = Math.atan2(V.mouth[0], V.mouth[1]);   // the glowing mouth on its skin faces the crater's own mouth
      const poolG = keep(new THREE.CircleGeometry(V.r - 12.6, 32)); poolG.rotateX(-Math.PI / 2);
      const poolMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a1a').multiplyScalar(3) }));
      const pool = R1(new THREE.Mesh(poolG, poolMat)); pool.position.y = POOL + 0.2; cone.add(pool);
      const crustG = keep(new THREE.CircleGeometry(V.r - 12.2, 32)); crustG.rotateX(-Math.PI / 2);
      const crustMat = keep(new THREE.MeshStandardMaterial({ map: keep(tex(crustCanvas(128))), emissiveMap: null, color: 0xffffff, emissive: new THREE.Color('#ff5a10'), emissiveIntensity: 0, roughness: 0.9 }));
      const crust = R1(new THREE.Mesh(crustG, crustMat)); crust.position.y = POOL + 0.9; crust.visible = false; cone.add(crust);
      // a collar of rubble on the playfield, where it rises out
      const r = rnd(55);
      const rockG = keep(new THREE.IcosahedronGeometry(1, 1)); { const P = rockG.attributes.position; for (let k = 0; k < P.count; k++) { const x = P.getX(k), y = P.getY(k), z = P.getZ(k), f = 0.72 + 0.5 * fbm3(x * 1.7 + 3, y * 1.7, z * 1.7, 2); P.setXYZ(k, x * f, y * f, z * f); } rockG.computeVertexNormals(); }   // lumpy boulders (30 Oct 2026)
      const rocks = R1(new THREE.InstancedMesh(rockG, M.rock, 30));
      { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2 + r() * 0.15, d = V.r + 6 + r() * 3.5, s = 1.2 + r() * 1.6; e.set(r() * 3, r() * 3, r() * 3); q.setFromEuler(e); m.compose(new THREE.Vector3(Math.sin(a) * d, s * 0.35, Math.cos(a) * d), q, new THREE.Vector3(s, s * 0.7, s)); rocks.setMatrixAt(k, m); } }
      grp.add(rocks);
      const lavaLight = RF(new THREE.PointLight(0xff6a1a, 0, 190, 2)); lavaLight.position.set(0, 64, 10); grp.add(lavaLight);
      toys.volcano = { grp, cone, coneMat, poolMat, lavaLight, HV, POOL, k: 0.85, fount: 0, lastCarry: 0, smokeAcc: 0, x: V.x, y: V.y, r: V.r, crust, crustMat };
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
    if (T.crabs && T.crabs.length && CAVE) {
      const cs = T.crabs[0], sc = shellCanvases(), st = keep(tex(sc.col)), sg = keep(tex(sc.glo));
      const mat = keep(new THREE.MeshStandardMaterial({ map: st, emissiveMap: sg, emissive: new THREE.Color('#ff6a10'), emissiveIntensity: 1.4, roughness: 0.5, metalness: 0, envMap: envRT.texture, envMapIntensity: 0.4 }));
      const m = RF(new THREE.Mesh(keep(new THREE.IcosahedronGeometry(cs.r, 3)), mat)); group.add(m);
      const shadow = new THREE.Mesh(shGeo, shadowMat); shadow.renderOrder = 1; group.add(shadow);
      toys.core = { m, mat, shadow, r: cs.r, flash: 0, spin: 0 };
    } else if (T.crabs && T.crabs.length) {
      const n = T.crabs.length, sc = shellCanvases(), st = keep(tex(sc.col)), sg = keep(tex(sc.glo));
      // a crab's carapace, not an egg (30 Oct 2026, owner: "the full realism rebuild"): a flat belly, a domed knobbly back, a
      // serrated rim with spikes, a notched brow at the front; the pincers two-fingered
      const shellG = keep(new THREE.SphereGeometry(1, 40, 22));
      { const P = shellG.attributes.position; for (let k = 0; k < P.count; k++) {
        let x = P.getX(k), y = P.getY(k), z = P.getZ(k); const th = Math.atan2(x, z), rim = Math.exp(-y * y / 0.03);
        if (y < 0) y *= 0.38; else y = y * (1 + 0.16 * (fbm3(x * 3, y * 3, z * 3, 2) - 0.5)) + 0.05 * Math.pow(Math.max(0, Math.cos(x * 9)), 6) * y;
        const sp = 1 + rim * (0.08 + 0.34 * Math.pow(Math.max(0, Math.cos(th * 9)), 8) * (Math.abs(th) > 0.5 ? 1 : 0));
        x *= sp * (1 + 0.12 * Math.max(0, z)); z *= sp; if (z > 0.3) z -= 0.22 * Math.exp(-x * x / 0.02) * Math.max(0, y + 0.3);
        P.setXYZ(k, x * 10.8, y * 5.6, z * 8.2);   // (bigger, wave 2: 9.6 / 4.6 / 7.2; the engine's radius is still 7)
      } shellG.computeVertexNormals(); }
      const legG = keep(new THREE.CylinderGeometry(1, 0.75, 1, 6, 1)); legG.translate(0, 0.5, 0);
      const legMat = keep(new THREE.MeshStandardMaterial({ color: 0xd8481c, roughness: 0.32, emissive: new THREE.Color('#ff4a10'), emissiveIntensity: 0.14, envMapIntensity: 1.3 }));   // (coral armour with a lava glow: wave 2, 30 Oct 2026; was dark)
      const clawG = keep((() => { const palm = new THREE.SphereGeometry(1, 14, 10); palm.scale(2.6, 1.8, 2.4); const f1 = new THREE.ConeGeometry(0.9, 3.6, 8); f1.rotateX(Math.PI / 2 + 0.25); f1.translate(-0.7, 0.4, 3.2); const f2 = new THREE.ConeGeometry(0.75, 3.0, 8); f2.rotateX(Math.PI / 2 - 0.3); f2.translate(0.9, -0.3, 2.9); const g = mergeGeos([palm, f1, f2]); [palm, f1, f2].forEach((q) => q.dispose()); return g; })());
      const eyeG = keep(new THREE.SphereGeometry(1, 14, 10)), eyeT = keep(tex(crabEyeCanvas()));   // glossy eyes with pupils that catch the lamps (wave 2, 30 Oct 2026; were glowing yellow beads)
      const eyeMat = keep(new THREE.MeshPhysicalMaterial({ map: eyeT, emissiveMap: eyeT, emissive: new THREE.Color('#ffc070'), emissiveIntensity: 0.45, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2 }));
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
    // ---- the OBSIDIAN PLUG (wave 3): a post of black volcanic glass between the flippers' tips, a glowing collar; it rises
    // out of the playfield while W.plug.up and sinks back when it drops
    if (T.plug) {
      const Pg = T.plug, grp = new THREE.Group(); grp.position.set(wx(Pg.x), 0, wz(Pg.y)); group.add(grp);
      const mat = keep(new THREE.MeshPhysicalMaterial({ color: 0x0c0a10, roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04, emissive: new THREE.Color(TH_.lava || '#ff6a1a'), emissiveIntensity: 0.15, envMap: envRT.texture, envMapIntensity: 1.6 }));
      const postG = keep(new THREE.CylinderGeometry(Pg.r * 0.8, Pg.r + 0.3, 13, 6, 1)); postG.translate(0, 6.5, 0);
      const post = RF(new THREE.Mesh(postG, mat)); grp.add(post);
      grp.visible = false;
      toys.plug = { grp, mat, h: 0 };
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
        // one screen: the gate lies ACROSS the lane's mouth at the bottom; the lane runs up from it to the arch
        const xa = Math.min(g[0], g[2]) + 1, xb = Math.max(g[0], g[2]) - 1;
        const yb = Math.min(g[1], g[3]) - 1, ya = yb - 74, w = Math.abs(xb - xa), h = yb - ya;
        const pg = keep(new THREE.PlaneGeometry(w, h)); pg.rotateX(-Math.PI / 2);
        const mat = keep(new THREE.MeshBasicMaterial({ map: flow, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0.6, 0.6, 0.6) }));
        const m = new THREE.Mesh(pg, mat); m.position.set(wx((xa + xb) / 2), 0.25, wz((ya + yb) / 2)); m.renderOrder = 1; group.add(m);
        return { m, mat };
      });
      toys.lava = { gates, lanes, flow };
    }
    // ---- one screen (29 Oct 2026): the LAVA RIVER printed under the glass from the volcano's foot down the middle to
    // the sea at the drain (art3d.js prints it; here a flowing sheet of lava over the print, one draw call; embers off it
    // and steam where it meets the sea are the toys' own particles)
    const RV = ISLAND && window.PinArt && typeof PinArt.river === 'function' ? PinArt.river(tid) : null;
    if (RV && RV.length > 1) {
      const rt = keep(tex(lavaFlowCanvas(), { repeat: true })), G = new Geo(); let s = 0;
      RV.forEach((p, i) => {
        const q0 = RV[Math.max(0, i - 1)], q1 = RV[Math.min(RV.length - 1, i + 1)]; let tx = q1[0] - q0[0], ty = q1[1] - q0[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        if (i) s += Math.hypot(p[0] - RV[i - 1][0], p[1] - RV[i - 1][1]);
        const hw = p[2] * 0.42;
        G.v(wx(p[0] - ty * hw), 0.2, wz(p[1] + tx * hw), 0, 1, 0, 0, -s / 64); G.v(wx(p[0] + ty * hw), 0.2, wz(p[1] - tx * hw), 0, 1, 0, 1, -s / 64);
        if (i) G.quad(2 * i - 2, 2 * i - 1, 2 * i + 1, 2 * i);
      });
      const mat = keep(new THREE.MeshBasicMaterial({ map: rt, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0.75, 0.75, 0.75) }));
      const m = new THREE.Mesh(keep(G.geometry()), mat); m.renderOrder = 1; m.name = 'lava river'; group.add(m);
      toys.river = { m, mat, rt, pts: RV, acc: 0 };
    }
    // ---- lights: the old table: high-key fill, a strong key, warm GI along the sides; Ember Peak: the sun and the sky,
    // the lava's own glow at the crater; both: one flash light
    const lights = { gi: [] };
    if (ISLAND) {   // arcade light (30 Oct 2026, owner: "the full realism rebuild"): a dim room, the cabinet's warm overhead lamp for shape, a cool backbox rim; the pools are in the GI map
      lights.hemi = RF(new THREE.HemisphereLight(0x8a80a8, 0x3a1a10, 0.45)); group.add(lights.hemi);
      lights.key = RF(new THREE.DirectionalLight(0xffe0bc, 1.55)); lights.key.position.copy(KEY).multiplyScalar(600); group.add(lights.key); group.add(lights.key.target);
      lights.rim = RF(new THREE.DirectionalLight(0xff9a5a, 0.8)); lights.rim.position.set(0, 120, -420); group.add(lights.rim); group.add(lights.rim.target);
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
        if (/^press\d/.test(id)) { const k = +id.slice(5), p = V ? V.pressure / (W.press && W.press.level > 0 ? W.press.level : 1) : 0; v = p >= (k + 1) / 8 ? (p > 1 ? blink(140, k * 30) : 1) : (p >= k / 8 ? 0.35 : 0.06); }
        else if (/^lane\d/.test(id)) { const k = +id.slice(4); v = W.skillOpen && W.skill === k ? blink(160) : W.lanes && W.lanes[k] ? 1 : breathe(500, k * 300); }
        else if (id === 'crater') v = V && V.busy ? 1 : (W.crater && W.crater.lit && W.crater.lit.length && !W.crater.sealed) || (V && V.ready) ? blink(120) : blink(420) * 0.5 + 0.05;
        // THE MAGMA CHAMBER's inserts (art3d.js inserts('chamber'); W.descent on the level's world)
        else if (/^vent\d/.test(id)) { const D = W.descent || {}, k = +id.slice(4); v = D.vents && D.vents[k] ? 1 : D.heat && D.heat[k] ? blink(260, k * 90) * (0.35 + 0.5 * D.heat[k] / (D.need || 1)) : W.next && W.next.shot === 'vents' ? 0.1 + 0.75 * blink(380, k * 127) : breathe(420, k * 300); }   // (fix pass: the cold vents pulse while NEXT says LIGHT THE VENTS)
        else if (id === 'core') { const D = W.descent || {}; v = D.cleared ? 0.3 : D.lit >= 3 ? blink(110) : breathe(600); }
        else if (id === 'scoop') { const D = W.descent || {}; v = V && V.busy ? 1 : D.cleared ? blink(100) : breathe(500, 200); }
        else if (id === 'cinder') v = Lv && Lv.gates && Lv.gates[0] && Lv.gates[0].h > 0.5 ? blink(130) : 0.05;
        else if (/^clock\d/.test(id)) { const D = W.descent || {}, k = +id.slice(5), secs = D.clock != null ? D.clock / 60 : 0; v = secs > (k + 1) * 9 ? 1 : secs > k * 9 ? (secs < 10 ? blink(120) : 0.5) : 0.04; }
        else if (id === 'lavaL' || id === 'lavaR') { const gi = id === 'lavaR' ? 1 : 0, gs = Lv && Lv.gates && Lv.gates[gi]; v = W.mb && W.mb.jp && W.mb.jp[id] ? blink(70, gi * 70) : gs ? (gs.h > 0.5 ? blink(110, gi * 110) : 0.05) : Lv && Lv.open ? blink(110, gi * 110) : 0.05; }   // (each lane by its own gate; JACKPOT lit in multiball: fast, wave 3)
        else if (id === 'ramp') v = lit.ramp > 0 ? 1 : W.mb && W.mb.jp && W.mb.jp.ramp ? blink(70) : breathe(380);
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
      group.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.visible && !o.userData.thin && !(o.material && ((o.material.transparent && !o.userData.occl) || o.material === shadowMat)) && !balls.some((Bb) => Bb.m === o)) out.push(o); });
      return out;
    }

    function dispose() {
      disposables.forEach((d) => { try { d.dispose(); } catch (e) {} });
      if (skyTex) skyTex.dispose();
    }
    return {
      id: tid, T, B, TW, TH, MID, BR, ISLAND, theme: TH_, group, world, envRT, ballSky, M, liftU, LIFT, pfMatHi, pfMatLo, playfield, ledMat, rail,
      slings, bumpers, pop, flippers, drops, spinner, plunger, toys, lights, flash, flashK: 0, lamps, homeSpecs, fitPts, backbox,
      artSource, artMs, occluders, dispose, buildLamps: () => (lamps = buildLamps()), get lampsObj() { return lamps; }, set lampsObj(v) { lamps = v; },
      rampAt, RAMP, giNow: 1, paintSky: null, skyKeyRef: { skyTex, skyKey }
    };
  }

  // every table is built once and kept (wave 3, INTO THE VOLCANO): the surface and its levels at load, so a cut to a level
  // and back is an instant switch with no rebuild; the games room moves with the switch
  function useTable(id) {
    const key = E.table ? E.table(id).id : 'orbit';
    let room = null;
    if (TB) { if (TB.world) { scene.remove(TB.world.group); cab.remove(TB.world.skirt); } room = TB.room || null; TB.room = null; mover.remove(TB.group); }
    TB = BUILT[key] || (BUILT[key] = buildTable(id));
    TB.room = room;
    HW = TB.TW / 2; ZC = TB.TH / 2;
    mover.add(TB.group);
    TB.group.add(glowPts.pts, puffPts.pts); pops.forEach((sp) => TB.group.add(sp)); balls.forEach((Bb) => { TB.group.add(Bb.m, Bb.s, Bb.s2); });
    mover.add(units);
    units.matrix.set(1, 0, 0, -HW, 0, 0, 1, 0, 0, 1, 0, -ZC, 0, 0, 0, 1); units.matrixWorldNeedsUpdate = true;
    if (TB.world) { scene.add(TB.world.group); cab.add(TB.world.skirt); }
    scene.environment = TB.envRT.texture;
    scene.background = TB.ISLAND ? new THREE.Color(0x0a0812) : new THREE.Color(0x07060c);
    renderer.toneMapping = TB.theme.tone || THREE.NeutralToneMapping; renderer.toneMappingExposure = TB.theme.exposure;
    bloom.threshold = TB.theme.bloomT || (opts.threshold != null ? opts.threshold : 1.75);
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
  // the player-eye home: camera.js's tilt and lens for this screen shape and mode (classic: 28 and 32), so the home here and the director's agree (30 Oct 2026)
  function eyeNow() {
    const a = RW / RH, P = window.PinCam;
    if (P && typeof P.homeTilt === 'function' && typeof P.lens === 'function') { try { const t = +P.homeTilt(a), f = +P.lens(a); if (t > 0 && f > 0) return [t, f]; } catch (e) {} }
    let u = clamp((a - EYE.a0) / (EYE.a1 - EYE.a0), 0, 1); u = u * u * (3 - 2 * u);
    return [EYE.portrait[0] + (EYE.wide[0] - EYE.portrait[0]) * u, EYE.portrait[1] + (EYE.wide[1] - EYE.portrait[1]) * u];
  }
  let eyeKey = '';
  function camHome() {   // camera.js's own home framing (the flipper boxes, the plunger ball and the arch top), when it is on the page
    const P = window.PinCam, a = RW / RH;
    if (!P || typeof P.home !== 'function' || typeof P.frame !== 'function') return null;
    try { const c = camFrom(P.frame(P.home(a, TB.id), a)); return c && c.pos ? c : null; } catch (e) { return null; }
  }
  function fit() {
    if (!TB || !RW) return;
    if (view.fill) {
      if (view.eye) { const e = eyeNow(); view.tilt = e[0]; view.fov = e[1]; eyeKey = e.join(); }
      HOME = (view.eye && camHome()) || solve(TB.homeSpecs.whole, view.tilt, view.fov);
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
    const pitch = p.pitch != null ? +p.pitch : Math.min(Math.max(40, view.tilt + 6), view.tilt + 9 * (zoom - 1) / 1.2), yaw = (+p.yaw || 0) * DEG, tl = clamp(pitch, 0, 85) * DEG;
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
    ballMat.envMap = tier.reflectEvery && opts.reflect !== false ? cubeRT.texture : TB.envRT.texture; ballMat.envMapIntensity = TB.ISLAND ? 2.3 : 1.3;   // (the island's arcade is dark: the ball shows its tubes bright, 30 Oct 2026)
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
  const trails = new Map(), tmpC = new THREE.Color(), _gl = new THREE.Vector3();
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
      h.unshift([b.x, b.y, z]); if (h.length > 10) h.length = 10;
      if (b.at !== 'crater') put(b.x, b.y, z + BR * BVIS, TB.ISLAND ? '#ffe2b0' : '#bfefff', 0.22, BR * 3.4 * BVIS);   // the hero ball's halo: always findable
      if (TB.ISLAND && b.at !== 'crater') { const cz = z + BR * BVIS, P = TB.group.worldToLocal(_gl.copy(camera.position)); let dx = P.x + HW - b.x, dy = P.z + ZC - b.y, dz = P.y - cz; const L = Math.hypot(dx, dy, dz) || 1; dx = dx / L - 0.12; dy = dy / L - 0.15; dz = dz / L + 0.18; const L2 = Math.hypot(dx, dy, dz) || 1, R = BR * BVIS + 1; put(b.x + dx / L2 * R, b.y + dy / L2 * R, cz + dz / L2 * R, '#ffffff', 0.75, BR * 1.1); }   // and its glint, the brightest point on the table: on the ball's camera-facing skin (leaned up and up-table), not inside it where the ball's depth hid it (30 Oct 2026, owner: "the full realism rebuild")
      const sp = b.m === 'ramp' ? Math.abs(b.vs || 0) : Math.hypot(b.vx || 0, b.vy || 0), k = clamp((sp - 280) / 380, 0, 1);
      if (k <= 0 || b.m === 'held' || b.carry) return;
      for (let i = 0; i < h.length - 1; i++) for (let j = 0; j < 3; j++) {
        const A = h[i], B = h[i + 1], u = j / 3, x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u;
        if (Math.hypot(x - b.x, y - b.y) < BR * 1.1) continue;
        const f = 1 - (i + u) / (h.length - 1);
        put(x, y, A[2] + (B[2] - A[2]) * u, '#a8ecff', 1.1 * k * f * f, BR * (0.7 + 1.3 * f));
      }
    });
    for (const id of trails.keys()) if (!seen.has(id)) trails.delete(id);
    if (TB.ISLAND) { const gk = clamp(TB.giNow, 0, 1.2); for (let y = 150; y <= TB.TH - 40; y += 46) { put(9.5, y, 2.5, '#ffd090', 0.5 * gk, 5); put(240.5, y, 2.5, '#ffd090', 0.5 * gk, 5); } }   // the GI bulbs along the side rails, under their pools of light (30 Oct 2026)
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
      else if (pN < puffPts.n && a > 0.004) { const pk = TB.ISLAND ? 0.6 : 1; putTo(puffPts, pN++, m.x, m.y, m.z, m.col[0] * pk, m.col[1] * pk * 0.96, m.col[2] * pk * 0.92, a, sz); }   // (steam and smoke in a dim arcade, not daylight, 30 Oct 2026)
    }
    flush(glowPts, gN); flush(puffPts, pN);
    let pi = 0;
    if (st && st.pops) for (let i = 0; i < st.pops.length && pi < POP_N; i++) {
      const p = st.pops[i]; if (!p || p.text == null || p.text === '' || (p.a != null && p.a <= 0.01)) continue;
      const sp = pops[pi++], e = popTexture(String(p.text), p.color || '#ffd84a', !!p.plate);
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
      if (b.at === 'crater' && V) return V.POOL * V.k - 2.5;
      if (b.at === 'geyser') return 3 + Math.sin(performance.now() / 60) * 0.8;
      return -4;
    }
    let z = b.m === 'ramp' ? (b.z || 0) : 0;
    if (b.carry && V && Math.hypot(b.x - V.x, b.y - V.y) < V.r - 6) z = Math.max(z, V.HV * V.k - 1);
    return z;
  }

  // ---------------------------------------------------------------- the toys, every frame (they only read W.toys)
  const _tc = new THREE.Color(), _mm = new THREE.Matrix4(), _e = new THREE.Euler(), _qq = new THREE.Quaternion(), _sc = new THREE.Vector3(), _ps = new THREE.Vector3();
  function updateToys(W, t, dt, play, dark) {
    const Tz = W.toys || {}, toys = TB.toys, lit = W.lit || {}, k60 = dt * 60;
    // the volcano
    const V = toys.volcano, Vs = Tz.volcano;
    if (V) {
      const rise = Vs ? clamp(Vs.rise || 0, 0, 1) : 0, press = Vs ? clamp(Vs.pressure || 0, 0, 1.5) : 0;
      const kT = 0.84 + 0.36 * (play ? rise : 0.2 + 0.12 * Math.sin(t / 2400));   // always a standing cone; it grows with the pressure
      V.k += (kT - V.k) * (dt > 0 ? 1 - Math.exp(-dt / 0.12) : 1); V.cone.scale.y = V.k;
      const held = !!(Vs && Vs.busy && Vs.hold > 0), carrying = !!(Vs && Vs.busy && !(Vs.hold > 0) && Vs.carry > 0);
      if (carrying && V.lastCarry === 0) V.fount = 1;   // the launch: a lava fountain
      V.lastCarry = carrying ? Vs.carry : 0;
      V.fount = Math.max(0, V.fount - dt * 0.9);
      const warn = press > 1.25 ? 0.5 + 0.5 * Math.sin(t / 70) : 0;
      const glow = dark ? 0.15 : 0.45 + 1.0 * Math.min(1, press) + (held ? 1.0 + 0.3 * Math.sin(t / 90) : 0) + warn * 1.0 + V.fount * 1.5;
      V.coneMat.emissiveIntensity = glow;
      V.poolMat.color.setRGB(1, 0.36, 0.05).multiplyScalar(dark ? 0.5 : 1.3 + 0.9 * Math.min(1, press) + (held ? 0.5 + 0.3 * Math.sin(t / 90) : 0) + V.fount * 1.5);
      V.lavaLight.intensity = dark ? 0 : 500 + 1300 * Math.min(1, press) + (held ? 1500 : 0) + V.fount * 4000;
      V.lavaLight.position.y = V.HV * V.k + 8;
      const topY = V.HV * V.k + 1;
      // smoke from the crater, more as the pressure builds; embers when it's high or the crater holds the ball
      V.smokeAcc += dt * (7 + 14 * press + (held ? 12 : 0)) * tier.motes;   // a plume at all times: it reads as a volcano
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
    if (V && V.crust) {   // a sealed crater (the boss's phase 1): the crust over the pool, its cracks glowing
      const sealed = !!(W.crater && W.crater.sealed);
      V.crust.visible = sealed; if (sealed) V.crustMat.emissiveIntensity = dark ? 0.1 : 0.5 + 0.3 * Math.sin(t / 380);
    }
    // the MAGMA CORE (a level's crab toy)
    const Co = toys.core, Cz = Tz.crabs && Tz.crabs[0];
    if (Co && Cz) {
      const D = W.descent || {}, armed = D.lit >= (D.vents ? D.vents.length : 3) && !D.cleared, hitV = lit.crab ? lit.crab[0] || 0 : 0;
      Co.flash = hitV > 0 ? 1 : Math.max(0, Co.flash - dt * 3); Co.spin += dt * (armed ? 2.4 : 0.7);
      Co.m.position.set(wx(Cz.x), Co.r + 1 + Math.sin(t / 420) * 0.6, wz(Cz.y)); Co.m.rotation.set(Co.spin * 0.4, Co.spin, 0);
      Co.mat.emissiveIntensity = dark ? 0.15 : D.cleared ? 0.5 : armed ? 1.6 + 0.9 * Math.sin(t / 110) + Co.flash * 3 : 0.9 + 0.2 * Math.sin(t / 500) + Co.flash * 2;
      const k = Co.r * 3.2; Co.shadow.scale.set(k, 1, k * 1.1); Co.shadow.position.set(wx(Cz.x + SHX * 6), 0.3, wz(Cz.y + SHY * 6));
    }
    // the OBSIDIAN PLUG
    const Pl = toys.plug;
    if (Pl) {
      const up = W.plug && W.plug.up ? 1 : 0;
      Pl.h += (up - Pl.h) * (dt > 0 ? 1 - Math.exp(-dt / 0.06) : 1); if (Math.abs(up - Pl.h) < 1e-3) Pl.h = up;
      Pl.grp.visible = Pl.h > 0.01; Pl.grp.position.y = -13 * (1 - Pl.h);
      Pl.mat.emissiveIntensity = dark ? 0.05 : 0.15 + (lit.plug > 0 ? 2.5 : 0) + (W.plug && W.plug.up && W.plug.t < 180 ? (Math.floor(t / 120) % 2 ? 0.8 : 0) : 0);
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
          const hy = (L - 1) * 3.4 - 1, hx = s * 8.4, kx = s * 12.6, ky = hy * 1.2 + sw * 0.5, fx = s * 14.4 + sw * 0.3 * s, fy = hy * 1.35 + sw;   // (wave 2: a wider stance for the bigger shell)
          C.legs.setMatrixAt(li++, segMatrix(_mm, X + hx, 3.2 + bob, Z + hy, X + kx, 6.6 + lift + bob, Z + ky, 1.35));
          C.legs.setMatrixAt(li++, segMatrix(_mm, X + kx, 6.6 + lift + bob, Z + ky, X + fx, 0.4 + lift * 0.6, Z + fy, 1.05));
        }
        // eye stalks, claws, eyes
        for (let s = -1; s <= 1; s += 2) {
          C.legs.setMatrixAt(li++, segMatrix(_mm, X + s * 2.6, 6.2 + bob, Z + 5.6, X + s * 3.4, 11.6 + bob, Z + 7.2, 0.6));   // (wave 2: taller stalks, bigger glossy eyes, claws raised and bigger)
          const pinch = 0.85 + 0.15 * Math.sin(t / 160 + i * 2 + s), cx = X + s * 7.8, cz = Z + 10.2, ck = 1.3 * pinch;
          _e.set(-0.45, s * 0.55, 0); _qq.setFromEuler(_e); _sc.set(ck, ck, ck); _ps.set(cx, 5.4 + bob, cz);
          C.claws.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), _mm.compose(_ps, _qq, _sc));
          _sc.set(2.0, 2.0, 2.0); _ps.set(X + s * 3.5, 12.6 + bob, Z + 7.5); _qq.identity();
          C.eyes.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), _mm.compose(_ps, _qq, _sc));
        }
        _mm.makeScale(29, 1, 24); _mm.setPosition(wx(c.x + SHX * 4), 0.3, wz(c.y + SHY * 4)); C.shadows.setMatrixAt(i, _mm);
      }
      C.legs.instanceMatrix.needsUpdate = true; C.claws.instanceMatrix.needsUpdate = true; C.eyes.instanceMatrix.needsUpdate = true; C.shadows.instanceMatrix.needsUpdate = true;
    }
    // the lava river: it flows faster and brighter with the pressure; a few embers rise off it
    const RVt = toys.river;
    if (RVt) {
      const press = Vs ? clamp(Vs.pressure || 0, 0, 1.5) : 0;
      RVt.rt.offset.y = (RVt.rt.offset.y - dt * (0.16 + 0.22 * press)) % 1;
      const v = dark ? 0.08 : 0.26 + 0.3 * Math.min(1, press) + 0.05 * Math.sin(t / 260); RVt.mat.color.setRGB(v, v, v);   // (dimmer under arcade light, 30 Oct 2026: it was blooming white)
      RVt.acc += dt * (dark ? 0 : 3 + 6 * press) * tier.motes;
      while (RVt.acc >= 1) {
        RVt.acc -= 1; const p = RVt.pts[1 + Math.floor(mr() * (RVt.pts.length - 2))];
        emit('glow', p[0] + (mr() - 0.5) * p[2] * 0.6, p[1] + (mr() - 0.5) * 4, 0.6, (mr() - 0.5) * 6, (mr() - 0.5) * 6, 14 + mr() * 18, 0.9 + mr() * 0.8, 1.3 + mr() * 1.1, [1, 0.42 + mr() * 0.3, 0.08], 1.2, 6);
        if (mr() < 0.35) { const e = RVt.pts[RVt.pts.length - 1], w = 0.9 + mr() * 0.1; emit('puff', e[0] + (mr() - 0.5) * e[2], e[1] + (mr() - 0.5) * 4, 1, (mr() - 0.5) * 5, (mr() - 0.5) * 5, 12 + mr() * 10, 1.6 + mr(), 4 + mr() * 4, [w, w, w], 0.35, 0, 2.4); }   // steam where the lava meets the sea
      }
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
      L.lanes.forEach((ln, i) => { const gh = Ls && Ls.gates[i] ? clamp(Ls.gates[i].h || 0, 0, 1) : open ? 1 : 0, v = dark ? 0.12 : 0.38 + gh * (0.62 + 0.3 * Math.sin(t / 120 + i)); ln.mat.color.setRGB(v, v, v); });   // (each lane by its own gate: one side at a time, wave 3)
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
    if (b) { const p = screenOf(b.x, b.y, ballZ(b) + TB.BR * BVIS); if (p) { _pb.x = p.x; _pb.y = p.y; _po.ball = _pb; } else _po.ball = null; } else _po.ball = null;
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
    applyRoom(mode);   // (the games room: the title, or when a bench asks, 30 Oct 2026)
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
        if (TB.ISLAND) for (let k = 0; k < 6 * tier.motes + 1; k++) emit('puff', bp.x + (mr() - 0.5) * 6, bp.y + (mr() - 0.5) * 6, POP.top, (mr() - 0.5) * 20, (mr() - 0.5) * 20, 30 + mr() * 25, 1.2 + mr() * 0.6, 6 + mr() * 4, [0.55, 0.52, 0.5], 0.55, 0, 2);
      }
      bp.hit = v > 0 ? 1 : Math.max(0, bp.hit - dt * 7);
      let idle = play ? (dark ? 0.15 : 0.75 + 0.25 * Math.sin(t / 300 + i * 2.1)) : 0.6 + 0.6 * Math.max(0, Math.sin(t / 240 - i * 2.1));
      const Dv = W.descent && W.descent.level ? W.descent : null;
      if (Dv && Dv.vents && i < Dv.vents.length) idle *= Dv.vents[i] ? 2.2 + 0.4 * Math.sin(t / 140 + i) : 0.35 + 0.5 * (Dv.heat ? Dv.heat[i] : 0) / (Dv.need || 1);   // (THE MAGMA CHAMBER's vents: lit, heating, cold)
      if (TB.pop) {   // (the island's instanced pop bumpers, 30 Oct 2026: the ring snaps down, the cap and the skirt glow in the bumper's colour)
        const P = TB.pop; _mm.makeTranslation(wx(bp.x), POP.ring - 4.2 * (v > 0 ? 1 : bp.hit), wz(bp.y)); P.rings.setMatrixAt(i, _mm);
        _tc.copy(bp.col).multiplyScalar(0.5 * idle + bp.hit * 2.6); P.caps.setColorAt(i, _tc); _tc.copy(bp.col).multiplyScalar(0.55 * idle + bp.hit * 5); P.skirts.setColorAt(i, _tc);
        P.rings.instanceMatrix.needsUpdate = true; P.caps.instanceColor.needsUpdate = true; P.skirts.instanceColor.needsUpdate = true; return;
      }
      bp.ring.position.y = 11 - 4.4 * (v > 0 ? 1 : bp.hit);
      bp.skirtMat.emissiveIntensity = idle * (TB.ISLAND ? 0.45 : 0.9) + bp.hit * 5;   // (the island's: amber plastic lit from inside, not neon, 30 Oct 2026)
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
    if (P) {
      P.tip.position.set(wx(S.cx), TB.BR, wz(tipY)); P.rod.position.set(wx(S.cx), TB.BR, wz(tipY));
      P.spring.position.set(wx(S.cx), TB.BR, wz(tipY + 4.5)); P.spring.scale.set(1, 1, Math.max(1, TB.TH - 4 - tipY - 4.5));
    }
    if (TB.ledMat) { const rl = lit.ramp > 0 ? 3.2 : W.comboT > 0 ? 1.6 + Math.sin(t / 60) * 0.8 : !play ? 1.2 + Math.sin(t / 200) * 0.6 : 1.0; TB.ledMat.color.set(TB.theme.led).multiplyScalar(dark ? 0.2 : rl); }
    updateToys(W, t, dt, play, dark);
    // balls
    let first = null;
    for (let i = 0; i < balls.length; i++) {
      const b = W.balls && W.balls[i], Bb = balls[i];
      if (!b) { Bb.m.visible = Bb.s.visible = Bb.s2.visible = false; continue; }
      const z = ballZ(b), cy = TB.BR * BVIS + z - (b.at === 'crater' ? TB.BR * (BVIS - 1) : 0), onFloor = b.m !== 'held' && !(b.m === 'ramp' && b.carry);
      Bb.m.position.set(wx(b.x), cy, wz(b.y)); Bb.m.visible = true; Bb.m.children[0].visible = b.at !== 'crater';
      const sz = (15 + z * 0.05) * BVIS;
      Bb.s.position.set(wx(b.x + SHX * TB.BR * 0.6), (b.m === 'ramp' && !b.carry ? z : 0) + 0.45, wz(b.y + SHY * TB.BR * 0.6)); Bb.s.scale.set(sz, 1, sz * 1.15); Bb.s.visible = onFloor || (b.m === 'ramp' && !b.carry);
      if (z > 2 && b.at !== 'crater') { Bb.s2.position.set(wx(b.x + SHX * cy), 0.1, wz(b.y + SHY * cy)); const k = 18 + z * 0.3; Bb.s2.scale.set(k, 1, k); Bb.s2.material.opacity = 1; Bb.s2.visible = true; } else Bb.s2.visible = false;
      if (!first) first = Bb.m;
    }
    updateLamps(W, t, mode, dt, st && st.lamps);
    fxPts = drawFx(W, st, dt);
    // the camera: the director's (PinCam), an override (the bench), or home
    if (view.eye && view.fill && eyeNow().join() !== eyeKey) fit();   // a new camera mode (classic) or screen shape: a new home
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
    const n = L.list.length, C = L.ca.array, snap = dt <= 0 || dt > 0.5, tgt = L.tg, GAIN = opts.lampGain || (TB.ISLAND ? 1.75 : 2.4);   // (the island's under filmic tone mapping: lit inserts keep their colour, 30 Oct 2026)
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

  // ---------------------------------------------------------------- the games room (30 Oct 2026, wave 2, owner: "a table in a room" for the title screen and trailers)
  // world.setRoom(true | false | 'auto'): 'auto' (the default; opts.room the same) shows it in the title/attract only. Ember Peak only.
  // Built on first use (about 20-60 ms of canvas painting), then kept; 5 draw calls while shown, none while hidden, so in play it costs
  // nothing unless a bench asks for it. While it shows, the island's sky and sea are hidden. world.roomShots(): framings for a trailer
  // (table units, for setCam): hero (front left, standing), wide (the cabinet in the room), low (legs, coin door, side art), glass (the backglass).
  let roomWant = opts.room != null ? opts.room : 'auto';
  function setRoom(on) { roomWant = on === 'auto' ? 'auto' : !!on; }
  function applyRoom(mode) {
    const on = !!TB && TB.ISLAND && (roomWant === 'auto' ? mode === 'title' : !!roomWant);
    if (on && !TB.room) { try { TB.room = buildRoom(); } catch (e) { console.warn('the room failed', e); TB.room = { group: new THREE.Group(), dispose() {}, ms: 0 }; } scene.add(TB.room.group); }
    if (TB.room) TB.room.group.visible = on;
    if (TB.world) { TB.world.group.visible = !on; TB.world.skirt.visible = !on; }
    const Lr = TB.lights && TB.lights.rim; if (Lr) { if (Lr.userData.base == null) Lr.userData.base = Lr.intensity; Lr.intensity = on ? Lr.userData.base * 0.15 : Lr.userData.base; } if (TB.pfMatHi) TB.pfMatHi.clearcoatRoughness = on ? 0.24 : 0.06; const Mc = TB.M && TB.M.chrome; if (Mc) { if (Mc.userData.env == null) Mc.userData.env = Mc.envMapIntensity; Mc.envMapIntensity = on ? Mc.userData.env * 0.45 : Mc.userData.env; }   // (30 Oct 2026, owner: trailer: in the room the low back rim's mirror glint off the clear coat bloomed into a white blob from the front cameras; a softer clear coat there too, for the key light's glint; and the chrome's arcade reflection at 0.45, or the side rails glowed like neon tubes from the room)
  }
  function roomShots() {
    const TH = TB ? TB.TH : 470;
    const up = [0, -Math.sin(PITCH), Math.cos(PITCH)];   // the room's up, not the table's (the cabinet is pitched)
    return { hero: { eye: [-220, TH + 640, 300], look: [150, 170, -40], fov: 40, up }, wide: { eye: [520, TH + 1350, 420], look: [135, 150, -180], fov: 44, up },
      low: { eye: [560, TH + 420, -260], look: [135, 230, -120], fov: 44, up }, glass: { eye: [135, 440, 205], look: [135, -20, 150], fov: 36, up } };
  }
  function buildRoom() {
    const r0 = performance.now(), junk = [], K = (x) => { junk.push(x); return x; }, grp = new THREE.Group(), hi = tierName === 'high' && !PHONE, TH = TB.TH;
    const cabP = (x, y, h) => new THREE.Vector3(wx(x), h, wz(y)).applyQuaternion(CABQ), LB = 120, FLOOR = cabP(HW, TH + 24, -LB).y - 330;
    // the carpet
    const cc = carpetCanvas(hi ? 512 : 256), ct = K(tex(cc.col, { repeat: true, aniso: ANISO })), cgl = K(tex(cc.glo, { repeat: true, aniso: ANISO })); ct.repeat.set(16, 16); cgl.repeat.set(16, 16);
    const fg = K(new THREE.PlaneGeometry(3400, 3400)); fg.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(fg, K(new THREE.MeshStandardMaterial({ map: ct, emissiveMap: cgl, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.95, metalness: 0, envMapIntensity: 0.1 }))); floor.position.set(0, FLOOR, 450); grp.add(floor);
    // the walls and their neon signs
    const wc = wallCanvases(hi ? 2048 : 1024), wt = K(tex(wc.col, { aniso: ANISO })), wgt = K(tex(wc.glo)), WG = new Geo(), WX = 1700, Z0 = -1250, Z1 = 2150, Y0 = FLOOR, Y1 = FLOOR + 1600;
    const wq = (a, b, c, d, n) => { const uv = [[0, 0], [1, 0], [1, 1], [0, 1]], ix = [a, b, c, d].map((p, k) => WG.v(p[0], p[1], p[2], n[0], n[1], n[2], uv[k][0], uv[k][1])); WG.quad(ix[0], ix[1], ix[2], ix[3]); };
    wq([-WX, Y0, Z0], [WX, Y0, Z0], [WX, Y1, Z0], [-WX, Y1, Z0], [0, 0, 1]); wq([-WX, Y0, Z1], [-WX, Y0, Z0], [-WX, Y1, Z0], [-WX, Y1, Z1], [1, 0, 0]); wq([WX, Y0, Z0], [WX, Y0, Z1], [WX, Y1, Z1], [WX, Y1, Z0], [-1, 0, 0]);
    grp.add(new THREE.Mesh(K(WG.geometry()), K(new THREE.MeshStandardMaterial({ map: wt, emissiveMap: wgt, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.9, metalness: 0, envMapIntensity: 0.1 }))));
    // the cabinets, one atlas: ours (its body, side art, coin door, legs) and the room's other machines
    const ra = roomAtlas(hi ? 1024 : 512), at = K(tex(ra.col, { aniso: ANISO })), agt = K(tex(ra.glo)), CG = new Geo(), AG = new Geo();
    uvBox(CG, wx(WOOD_L), wx(WOOD_R), -LB, -14, wz(-18), wz(TH + 24), { px: RD, nx: RD, pz: RG, nz: RG });   // our cabinet's body (built in the cabinet's pitched frame)
    uvBox(CG, wx(HW - 36), wx(HW + 36), -LB + 12, -22, wz(TH + 24), wz(TH + 27), { all: RF, pz: RE });   // its coin door
    uvBox(CG, wx(WOOD_L - 1), wx(WOOD_R + 1), -LB - 3, -LB, wz(-19), wz(TH + 25), { all: RF });   // a steel trim along its foot
    const cgeo = CG.geometry(); cgeo.applyQuaternion(CABQ);
    [[WOOD_L + 12, -6], [WOOD_R - 12, -6], [WOOD_L + 12, TH + 12], [WOOD_R - 12, TH + 12]].forEach(([x, y]) => {   // the legs, straight down to the floor, and their feet
      const p = cabP(x, y, -LB); uvBox(AG, p.x - 7, p.x + 7, FLOOR + 6, p.y + 4, p.z - 7, p.z + 7, { all: RF }); uvBox(AG, p.x - 11, p.x + 11, FLOOR, FLOOR + 6, p.z - 11, p.z + 11, { all: RF });
      uvBox(AG, p.x - 12, p.x + 12, p.y - 20, p.y + 4, p.z - 12, p.z + 12, { all: RF });   // the leg bracket
    });
    [[-640, RC1, RH], [640, RC2, RH2]].forEach(([cx, glass, pf]) => {   // two more pinball machines either side
      uvBox(AG, cx - 172, cx + 172, FLOOR + 320, FLOOR + 436, -250, 270, { all: RG, py: pf });
      uvBox(AG, cx - 178, cx - 164, FLOOR + 436, FLOOR + 448, -250, 270, { all: RF }); uvBox(AG, cx + 164, cx + 178, FLOOR + 436, FLOOR + 448, -250, 270, { all: RF }); uvBox(AG, cx - 178, cx + 178, FLOOR + 436, FLOOR + 450, 258, 274, { all: RF });   // its side rails and lockdown bar
      uvBox(AG, cx - 180, cx + 180, FLOOR + 440, FLOOR + 820, -290, -230, { all: RG, pz: glass });
      [[-158, -236], [158, -236], [-158, 256], [158, 256]].forEach(([dx, z]) => uvBox(AG, cx + dx - 6, cx + dx + 6, FLOOR, FLOOR + 320, z - 6, z + 6, { all: RF }));
    });
    for (let k = -3; k <= 3; k++) uvBox(AG, k * 460 - 160, k * 460 + 160, FLOOR, FLOOR + 920, Z0 + 20, Z0 + 320, { all: RG, pz: RA, px: RB, nx: RB });   // video uprights along the back wall
    [-450, 150, 750].forEach((z) => { uvBox(AG, -WX + 20, -WX + 320, FLOOR, FLOOR + 920, z - 160, z + 160, { all: RG, px: RA, pz: RB, nz: RB }); uvBox(AG, WX - 320, WX - 20, FLOOR, FLOOR + 920, z - 160, z + 160, { all: RG, nx: RA, pz: RB, nz: RB }); });   // and along the side walls
    const ag = AG.geometry(), merged = K(mergeGeos([cgeo, ag])); cgeo.dispose(); ag.dispose();
    grp.add(new THREE.Mesh(merged, K(new THREE.MeshStandardMaterial({ map: at, emissiveMap: agt, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.75, metalness: 0, envMapIntensity: 0.04 }))));   // (barely any reflection: at a grazing angle it washed the other machines' tops out)
    // the cabinet's shadow on the carpet and the warm light it throws round it
    const cpos = cabP(HW, TH / 2, 0), sg = K(new THREE.PlaneGeometry(1, 1)); sg.rotateX(-Math.PI / 2);
    const sh = new THREE.Mesh(sg, shadowMat); sh.scale.set(520, 1, 760); sh.position.set(cpos.x, FLOOR + 0.6, cpos.z); grp.add(sh);
    const gm = K(new THREE.MeshBasicMaterial({ map: K(tex(softDot(128, 0.15))), color: new THREE.Color('#ff7a2a').multiplyScalar(0.16), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const gw = new THREE.Mesh(sg, gm); gw.scale.set(1300, 1, 1500); gw.position.set(cpos.x, FLOOR + 1, cpos.z + 120); gw.renderOrder = 1; grp.add(gw);
    grp.visible = false;
    return { group: grp, FLOOR, ms: Math.round(performance.now() - r0), dispose() { junk.forEach((d) => { try { d.dispose(); } catch (e) {} }); } };
  }

  function setView(v) { v = v || {}; view = Object.assign({}, view, v); if (v.eye == null && (v.tilt != null || v.fov != null)) view.eye = false; view.fill = !!view.fill; view.eye = !!view.eye && view.fill; fit(); }   // eye: home at camera.js's tilt and lens (a tilt or lens of your own turns it off)

  // ---------------------------------------------------------------- set up, compile, measure
  resize(opts.width || canvasEl.width || 360, opts.height || canvasEl.height || 640);
  {   // build the starting table and the levels below it now (each kept), so switching later costs nothing
    const first = opts.table || (E.DEFAULT || 'orbit');
    if (E.TABLES && opts.levels !== false) Object.keys(E.TABLES).forEach((k) => { const Tk = E.TABLES[k]; if (Tk && Tk.level && (Tk.surface || E.DEFAULT) === (E.table ? E.table(first).id : first) && !BUILT[k]) { useTable(k); renderer.compile(scene, camera); } });
    useTable(first);
  }
  { const fill = opts.fill !== false; setView({ fill, eye: fill && opts.tilt == null && opts.fov == null, tilt: opts.tilt != null ? opts.tilt : fill ? HOME_TILT : 35, fov: opts.fov || (fill ? FOV : 34) }); }
  renderer.compile(scene, camera);
  const buildMs = Math.round(performance.now() - t0);

  function stats() {
    return {
      buildMs, artMs: TB.artMs, table: TB.id, built: Object.keys(BUILT), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, reflectCalls: refl.calls, reflectTriangles: refl.tris, art: TB.artSource,
      lamps: TB.lampsObj ? TB.lampsObj.list.length : 0, size: [Math.round(RW * PR), Math.round(RH * PR)], pixelRatio: PR, tier: tierName, auto: autoTier, tierChanges: perf.changes,
      view, cam: camSource, fx: !!window.PinFX, fxPoints: fxPts, motes: motes.length, pops: pops.filter((p) => p.visible).length, cpuMs: +cpuMs.toFixed(2),
      particles: !!particles, post: !!post, phone: PHONE, room: !!(TB.room && TB.room.group.visible), roomMs: TB.room ? TB.room.ms : null
    };
  }
  function dispose() {
    if (TB && TB.room) TB.room.dispose();
    Object.keys(BUILT).forEach((k) => { try { BUILT[k].dispose(); } catch (e) {} });
    shared.forEach((d) => { try { d.dispose(); } catch (e) {} });
    composer.dispose && composer.dispose(); rt.dispose(); renderer.dispose();
  }
  const api = {
    draw, setView, setCam, setTier, setRoom, roomShots, resize, dispose, stats,
    homes: () => JSON.parse(JSON.stringify(homes)),
    debug: { scene, camera, cab, mover, units, renderer, THREE, get table() { return TB.group; }, get TB() { return TB; }, occluders: () => TB.occluders(), ballZ: (b) => ballZ(b), toWorld: (x, y, h) => { mover.updateMatrixWorld(true); return new THREE.Vector3(wx(x), h, wz(y)).applyMatrix4(mover.matrixWorld); } }
  };
  window.Pin3D.homes = api.homes;
  return api;
}

window.Pin3D = { create, homes: () => ({}) };
