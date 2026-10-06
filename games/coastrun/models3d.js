/* 365 Coast Run - the 3D models (5 Oct 2026; made richer the same day for the OutRun-2-style revamp): every car, tree,
 * palm, hut, crowd and lighthouse built from shapes in code - our own designs, nothing downloaded. Each part of a model
 * says what it is made of (its material key): 'lit' plain painted surfaces, 'shiny' glossy ones (traffic paintwork,
 * glass), 'glow' lamps, windows and lights (bright at night, and they bloom), 'leaf' / 'frond' / 'grass' leafy cards
 * cut out by a painted texture (paintLeaves etc. below), and for your own car 'paint', 'chrome', 'glass', 'trim'.
 * world3d.js gives each key its material. Units are metres; a model stands on y = 0 and faces -Z (the way the road goes). */
import * as THREE from 'three';

const C = new THREE.Color(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E3 = new THREE.Euler(), V = new THREE.Vector3(), S3 = new THREE.Vector3();
function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const UV_KEYS = { leaf: 1, frond: 1, grass: 1, stone: 1, plate: 1 };

// ---------------------------------------------------------------- a kit: add shapes, get one geometry per material
export class Kit {
  constructor() { this.parts = {}; }
  put(geo, col, x, y, z, rx, ry, rz, sx, sy, sz, key) {
    key = key === true ? 'glow' : key || 'lit';
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    E3.set(rx || 0, ry || 0, rz || 0, 'YXZ'); Q.setFromEuler(E3); V.set(x || 0, y || 0, z || 0); S3.set(sx || 1, sy || 1, sz || 1);   // tilt first, then turn
    M.compose(V, Q, S3); g.applyMatrix4(M);
    const n = g.attributes.position.count, cols = new Float32Array(n * 3);
    C.set(col);
    for (let i = 0; i < n; i++) { cols[i * 3] = C.r; cols[i * 3 + 1] = C.g; cols[i * 3 + 2] = C.b; }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    if (!g.attributes.normal) g.computeVertexNormals();
    if (key !== 'glow' && key !== 'alloy' && key !== 'chrome' && key !== 'rlamp' && UV_KEYS[key] == null) { const nr = g.attributes.normal; for (let i = 0; i < n; i++) { const f = 0.6 + 0.4 * (nr.getY(i) * 0.5 + 0.5); cols[i * 3] *= f; cols[i * 3 + 1] *= f; cols[i * 3 + 2] *= f; } }
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'color' && k !== 'normal' && !(k === 'uv' && UV_KEYS[key])) g.deleteAttribute(k);
    (this.parts[key] || (this.parts[key] = [])).push(g);
    geo.dispose();
    return this;
  }
  box(w, h, d, x, y, z, col, ry, rx, rz, key) { return this.put(new THREE.BoxGeometry(w, h, d), col, x, y + h / 2, z, rx, ry, rz, 1, 1, 1, key); }
  cyl(rt, rb, h, n, x, y, z, col, rx, rz, key) { return this.put(new THREE.CylinderGeometry(rt, rb, h, n), col, x, y + h / 2, z, rx, 0, rz, 1, 1, 1, key); }
  axle(r, w, n, x, y, z, col, key) { return this.put(new THREE.CylinderGeometry(r, r, w, n), col, x, y, z, 0, 0, Math.PI / 2, 1, 1, 1, key); }   // lying across (X), centred
  roll(r, len, n, x, y, z, col, key) { return this.put(new THREE.CylinderGeometry(r, r, len, n), col, x, y, z, Math.PI / 2, 0, 0, 1, 1, 1, key); }   // lying along (Z), centred
  cone(r, h, n, x, y, z, col, key) { return this.put(new THREE.ConeGeometry(r, h, n), col, x, y + h / 2, z, 0, 0, 0, 1, 1, 1, key); }
  ball(r, x, y, z, col, sx, sy, sz, key, detail) { return this.put(new THREE.SphereGeometry(r, detail || 10, Math.max(4, (detail || 10) >> 1)), col, x, y, z, 0, 0, 0, sx, sy, sz, key); }
  blob(r, x, y, z, col, sx, sy, sz, seed, opt) {   // a lumpy ball (rocks, mounds); a big one (a hill) - or any with opt.smooth - is
    // smooth and gently rolling, col on its gentle slopes and stone (opt.rock) where it's steep, opt.wet: dark at the waterline
    opt = opt || {};
    if (r < 20 && !opt.smooth) {
      const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position, rr = rnd(seed || 7), seen = new Map();
      for (let i = 0; i < p.count; i++) { const key = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3); let k = seen.get(key); if (k == null) { k = 0.86 + rr() * 0.28; seen.set(key, k); } p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
      g.computeVertexNormals();
      return this.put(g, col, x, y, z, 0, 0, 0, sx || 1, sy || 1, sz || 1);
    }
    sx = sx || 1; sy = sy || 1; sz = sz || 1;
    const g = new THREE.IcosahedronGeometry(r, r >= 50 ? 7 : r >= 20 ? 6 : 3), p = g.attributes.position, rr = rnd(seed || 7), ph = [rr() * 6, rr() * 6, rr() * 6, rr() * 6], v = new THREE.Vector3();
    const lump = (d) => 1 + 0.07 * Math.sin(d.x * 2.6 + ph[0]) * Math.sin(d.z * 2.2 + ph[1]) + 0.05 * Math.sin(d.y * 3.4 + d.x * 1.7 + ph[2]) + 0.025 * Math.sin(d.z * 6.1 + d.x * 5.3 + ph[3]);
    const nrm = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); const k = lump(v); nrm[i * 3] = v.x; nrm[i * 3 + 1] = v.y; nrm[i * 3 + 2] = v.z; p.setXYZ(i, v.x * r * k, v.y * r * k, v.z * r * k); }
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));   // smooth: each point's own direction from the middle
    this.put(g, col, x, y, z, 0, 0, 0, sx, sy, sz);
    // the colour, from the smooth slope and the place on the hill (never per triangle: that showed every facet)
    const list = this.parts.lit, G = list[list.length - 1], C3 = G.attributes.color, base = new THREE.Color(col), rock = new THREE.Color(opt.rock || '#bdb6a3'), wet = new THREE.Color('#6f685a'), c = new THREE.Color();
    for (let i = 0; i < C3.count; i++) {
      const nx = nrm[i * 3] / sx, ny = nrm[i * 3 + 1] / sy, nzz = nrm[i * 3 + 2] / sz, up = ny / Math.hypot(nx, ny, nzz), steep = 1 - Math.min(1, Math.max(0, (up - 0.55) / 0.22));
      const px = p.getX(i) * sx, py = p.getY(i) * sy + y, pz = p.getZ(i) * sz;
      const nz = 0.9 + 0.1 * Math.sin(px * 0.11 + pz * 0.07) * Math.sin(py * 0.13 + 1.7) + 0.06 * Math.sin(px * 0.37 + py * 0.29 + pz * 0.31);
      c.copy(base).lerp(rock, steep * 0.85).multiplyScalar(nz);
      if (opt.wet && py < 2.5) c.lerp(wet, Math.min(1, (2.5 - py) / 2) * 0.7);
      C3.setXYZ(i, c.r, c.g, c.b);
    }
    return this;
  }
  prism(w, h, d, x, y, z, col, ry) {   // a pitched roof, ridge along Z
    const g = new THREE.BufferGeometry(), v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex([0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3]);
    return this.put(g, col, x, y, z, 0, ry || 0, 0, w, h, d);
  }
  side(pts, width, x, y, z, col, key, bevel) {   // a shape drawn side-on (front = +u, up), pushed out to a width: car bodies
    const sh = new THREE.Shape(); sh.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) sh.lineTo(pts[i], pts[i + 1]);
    const b = bevel || 0, g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.01, width - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b * 0.8, bevelSegments: 3, steps: 1, curveSegments: 4 });
    g.translate(0, 0, -(width - 2 * b) / 2); g.rotateY(Math.PI / 2);   // length runs front (-Z) to back (+Z), width along X
    g.computeVertexNormals();
    return this.put(g, col, x, y, z, 0, 0, 0, 1, 1, 1, key);
  }
  card(w, h, x, y, z, col, ry, rx, key, nrm) {   // a leafy card cut out by its texture (key leaf / grass); nrm: its normals point away from this centre, or 'up'
    key = key || 'leaf';
    this.put(new THREE.PlaneGeometry(w, h), col, x, y, z, rx || 0, ry || 0, 0, 1, 1, 1, key);
    if (nrm) { const list = this.parts[key], g = list[list.length - 1], p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) { let nx = 0, ny = 1, nz = 0; if (nrm !== 'up') { nx = p.getX(i) - nrm[0]; ny = p.getY(i) - nrm[1]; nz = p.getZ(i) - nrm[2]; } const L = Math.hypot(nx, ny, nz) || 1; n.setXYZ(i, nx / L, ny / L, nz / L); } }
    return this;
  }
  frond(len, wid, x, y, z, col, yaw, pitch, droop) {   // a palm frond: lying flat from the crown out along its length, drooping towards the tip
    const g = new THREE.PlaneGeometry(len, wid, 8, 1); g.rotateX(-Math.PI / 2); g.translate(len / 2, 0, 0);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i) / len; p.setY(i, -droop * u * u); }
    g.computeVertexNormals();
    return this.put(g, col, x, y, z, 0, yaw, pitch, 1, 1, 1, 'frond');
  }
  clump(r, x, y, z, col, seed) {   // a ball of leaves: crossed leafy cards
    const q = rnd(seed || 3);
    const c = [x, y - r * 0.7, z];   // the leaves are lit as if they made a ball (the centre a little low, so the tops catch the sun)
    for (let i = 0; i < 3; i++) this.card(r * 2.2, r * 2.0, x, y, z, col, i * Math.PI / 3 + q() * 0.4, (q() - 0.5) * 0.5, 'leaf', c);
    this.card(r * 2.1, r * 2.1, x, y + r * 0.2, z, col, q() * 3, -Math.PI / 2 + (q() - 0.5) * 0.4, 'leaf', c);
    return this;
  }
  build() {
    const out = {};
    for (const k of Object.keys(this.parts)) { out[k] = merge(this.parts[k]); this.parts[k].forEach((g) => g.dispose()); }
    out.lit = out.lit || null; out.glow = out.glow || null;
    return out;
  }
}
export function merge(list) {
  let n = 0; list.forEach((g) => { n += g.attributes.position.count; });
  const uv = list.every((g) => g.attributes.uv);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uvs = uv ? new Float32Array(n * 2) : null; let o = 0;
  list.forEach((g) => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); if (uv) uvs.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------------- the textures that cut leaves, fronds and grass out of their cards
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function paintLeaves() {   // pale leaves (the card's colour tints them): a loose round cluster
  const c = cv(256, 256), x = c.getContext('2d'), r = rnd(5);
  for (let i = 0; i < 420; i++) {
    const a = r() * 6.28, d = Math.pow(r(), 0.6) * 112, px = 128 + Math.cos(a) * d, py = 128 + Math.sin(a) * d * 0.95;
    const s = 7 + r() * 9, l = 150 + r() * 105, rot = r() * 6.28;
    x.save(); x.translate(px, py); x.rotate(rot); x.fillStyle = 'rgb(' + (l * 0.95 | 0) + ',' + (l | 0) + ',' + (l * 0.9 | 0) + ')';
    x.beginPath(); x.ellipse(0, 0, s, s * 0.5, 0, 0, 6.28); x.fill(); x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(-s, -0.6, s * 2, 1.2); x.restore();
  }
  return c;
}
export function paintFrond() {   // a palm frond: a stem with leaflets down both sides (pale green; tinted by the card)
  const c = cv(256, 64), x = c.getContext('2d');
  x.strokeStyle = '#d8e8c8'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 32); x.lineTo(252, 32); x.stroke();
  for (let i = 4; i < 248; i += 5) {
    const t = i / 250, len = 28 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 3, l = 175 + ((i * 37) % 70);
    x.strokeStyle = 'rgb(' + (l * 0.85 | 0) + ',' + l + ',' + (l * 0.72 | 0) + ')'; x.lineWidth = 2.6;
    x.beginPath(); x.moveTo(i, 32); x.lineTo(i + 9, 32 - len); x.moveTo(i, 32); x.lineTo(i + 9, 32 + len); x.stroke();
  }
  return c;
}
export function paintGrass() {   // a tuft of grass blades (and the odd flower, by tint)
  const c = cv(128, 128), x = c.getContext('2d'), r = rnd(9);
  for (let i = 0; i < 46; i++) {
    const bx = 14 + r() * 100, h = 50 + r() * 74, lean = (r() - 0.5) * 40, l = 140 + r() * 115;
    x.fillStyle = 'rgb(' + (l * 0.84 | 0) + ',' + (l | 0) + ',' + (l * 0.7 | 0) + ')';
    x.beginPath(); x.moveTo(bx - 2.2, 128); x.quadraticCurveTo(bx + lean * 0.4, 128 - h * 0.6, bx + lean, 128 - h); x.quadraticCurveTo(bx + lean * 0.4 + 1, 128 - h * 0.6, bx + 2.2, 128); x.fill();
  }
  return c;
}

// ---------------------------------------------------------------- colours
const GRN = ['#4f8f3a', '#5fa344', '#74b852'], AUT = [['#d0702a', '#e8923a', '#f4b844'], ['#c0502e', '#da6a34', '#ee9a44'], ['#b8901e', '#dcb434', '#f4d460']];
const HUT = ['#3fa7d6', '#f2c14e', '#e4572e', '#76b041', '#f4f1ea', '#d7263d'];
const CROWD = ['#2b3a55', '#e9e2d0', '#9a8f6a', '#b9b2a4', '#4f6b5a', '#7a3b3b', '#f4f2ec', '#3d4a5c', '#c8b48a'];   // navy, cream, khaki, stone, sage, burgundy, white, slate, sand
const SHIRTS = ['#e63946', '#f1faee', '#1d7fd6', '#ffd23f', '#2a9d8f', '#f4a261', '#9b5de5', '#ff7eb6', '#111111'];
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

// ---------------------------------------------------------------- the roadside
const MODELS = {
  palm(k, v) {
    const lean = [0.7, -0.8, 0.3][v % 3], tall = 8.5 + (v % 3) * 0.9;
    { const pts = []; for (let i = 0; i <= 6; i++) { const p = i / 6; pts.push(new THREE.Vector3(lean * p * p * 2.4, p * (tall + 0.1), 0)); }
      const curve = new THREE.CatmullRomCurve3(pts), T = 22, RS = 10, g = new THREE.TubeGeometry(curve, T, 0.25, RS, false), P = g.attributes.position, c = new THREE.Vector3(), w = new THREE.Vector3();
      for (let j = 0; j <= T; j++) { curve.getPointAt(j / T, c); const f = 1 - 0.34 * (j / T); for (let q = 0; q <= RS; q++) { const i = j * (RS + 1) + q; w.fromBufferAttribute(P, i).sub(c).multiplyScalar(f).add(c); P.setXYZ(i, w.x, w.y, w.z); } }
      g.computeVertexNormals(); k.put(g, '#9a7a52', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'lit');
      const list = k.parts.lit, G = list[list.length - 1], Q = G.attributes.position, C3 = G.attributes.color;
      for (let i = 0; i < Q.count; i++) { const f = 0.78 + 0.22 * Math.pow(Math.abs(Math.sin(Q.getY(i) * Math.PI * 2.6)), 0.5); C3.setXYZ(i, C3.getX(i) * f, C3.getY(i) * f, C3.getZ(i) * f); }   // the rings
      k.cyl(0.25, 0.4, 0.45, 10, 0, 0, 0, '#7a5c3c'); }
    const tx = lean * 2.4, ty = tall + 0.1, q = rnd(31 + v);
    for (let j = 0; j < 11; j++) {
      const a = j / 11 * Math.PI * 2 + q() * 0.3, up = 0.28 - (j % 3) * 0.18, len = 3.4 + q() * 1.2;
      k.frond(len, 1.15, tx, ty + 0.1, 0, ['#5c9a3c', '#6fae46', '#82be52'][j % 3], a - Math.PI / 2, up, 1.3 + q() * 0.7);
    }
    k.ball(0.22, tx - 0.18, ty - 0.2, 0.1, '#6b4a22').ball(0.22, tx + 0.18, ty - 0.22, 0.06, '#7a5628').ball(0.2, tx, ty - 0.3, -0.18, '#5e4019');
  },
  lamp(k, v) {
    if (v === 2) {   // Bournemouth's promenade lamp: a tall blue column with a lantern on a short arm
      k.cyl(0.2, 0.26, 0.8, 10, 0, 0, 0, '#1d5fa8').cyl(0.09, 0.12, 5.6, 8, 0, 0.8, 0, '#1d5fa8').box(0.08, 0.08, 1.1, 0, 6.2, -0.5, '#1d5fa8');
      k.cyl(0.26, 0.16, 0.55, 8, 0, 5.75, -1.0, '#f4f6f0').cone(0.3, 0.3, 8, 0, 6.3, -1.0, '#1d5fa8');
      return;
    }
    const pole = v ? '#20262e' : '#1f4a3f';
    k.cyl(0.18, 0.24, 0.6, 10, 0, 0, 0, pole).cyl(0.08, 0.1, 5.8, 8, 0, 0.6, 0, pole);
    k.box(0.09, 0.09, 1.6, 0, 6.2, -0.75, pole);
    k.cyl(0.32, 0.18, 0.5, 8, 0, 5.75, -1.5, v ? '#fff1b0' : '#e8f2f2', 0, 0, v ? 'glow' : 'lit').cone(0.36, 0.3, 8, 0, 6.25, -1.5, pole);
  },
  hut(k, v) {
    const col = HUT[v % 6], trim = v % 6 === 4 ? '#3fa7d6' : '#ffffff';
    k.box(2.6, 0.25, 3, 0, 0, 0, '#b99a6a').box(2.3, 2.3, 2.6, 0, 0.25, 0, col);
    k.prism(2.8, 1.1, 2.9, 0, 2.55, 0, trim);
    k.box(1, 1.8, 0.06, 0, 0.3, 1.31, shade(col, -0.2)).box(0.06, 1.8, 0.07, 0, 0.3, 1.32, trim);
    for (let q = -4; q <= 4; q++) { if (Math.abs(q) > 1) k.box(0.035, 2.25, 0.02, q * 0.26, 0.27, 1.31, shade(col, -0.14)); for (const sd of [-1, 1]) k.box(0.02, 2.25, 0.035, sd * 1.16, 0.27, q * 0.29, shade(col, -0.14)); }   // the planks
    k.box(2.34, 0.1, 2.64, 0, 2.1, 0, trim);   // a trim band under the roof
    for (const sd of [-1, 1]) k.box(0.03, 0.5, 0.6, sd * 1.16, 1.3, -0.5, v >= 6 ? '#ff9a2e' : '#2a3a48', 0, 0, 0, v >= 6 ? 'glow' : 'lit').box(0.04, 0.6, 0.06, sd * 1.165, 1.25, -0.5, trim);   // a little window each side (lit, at night)
    if (v >= 6) k.box(0.9, 1.5, 0.05, 0, 0.35, 1.34, '#ff8a1e', 0, 0, 0, 'glow').box(0.2, 0.2, 0.2, 0, 2.15, 1.4, '#ffd27a', 0, 0, 0, 'glow').box(2.2, 0.02, 1.6, 0, 0.27, 2.2, '#7a4a1a', 0, 0, 0, 'glow');   // the door open on a warm room, a lamp over it, its light on the boards   // the door open, a lamp over it
  },
  brolly(k, v) {
    const cols = [['#e63946', '#ffffff'], ['#1d7fd6', '#ffffff'], ['#f4a261', '#2a9d8f'], ['#ffd23f', '#ee4266']][v % 4];
    k.cyl(0.03, 0.03, 2.2, 5, 0, 0, 0, '#e8e1d0');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.put(new THREE.ConeGeometry(1.4, 0.55, 3, 1, true, a, Math.PI / 4), cols[i % 2], 0, 2.2, 0); }
    k.box(0.6, 0.4, 1.2, 0.9, 0, 0.4, cols[0], 0.3);
  },
  bush(k, v) {
    const c = v ? ['#3c7a36', '#4a8a3e', '#5a9a46'] : ['#4f9a42', '#62ae4c', '#76c258'];
    k.clump(0.9, 0, 0.75, 0, c[0], 2).clump(0.75, 0.6, 0.95, 0.3, c[1], 4).clump(0.7, -0.6, 0.9, -0.2, c[2], 6);
    if (!v) { const r = rnd(9); for (let i = 0; i < 10; i++) k.ball(0.09, (r() - 0.5) * 2, 1 + r() * 0.6, (r() - 0.5) * 1.6, ['#ff5fa2', '#ffd23f', '#ffffff', '#ff7b39'][i % 4], 1, 1, 1, 'lit', 5); }
  },
  hotel(k, v) {
    if (v >= 4) return apartments(k, v);
    const wall = ['#f2ead8', '#e9e2d6', '#f6efe0', '#dfe6ea'][v % 4], roof = ['#9a5b45', '#5a6670', '#8a4f3c', '#4f5d6a'][v % 4], fl = [5, 7, 6, 4][v % 4];
    const H = fl * 3.2, glass = ['#3d5a70', '#47627a', '#3a5566', '#4a6478'][v % 4], trim = '#f7f6f2', awn = ['#1d4e89', '#9b3a2c', '#1f6f50', '#2b2d42'][v % 4];
    k.box(22, H, 14, 0, 0, 0, wall).prism(15, 4, 23, 0, H, 0, roof, Math.PI / 2);
    k.box(22.7, 0.55, 14.7, 0, H - 0.2, 0, trim).box(22.3, 3.0, 14.3, 0, 0, 0, shade(wall, -0.07));   // the cornice; the ground floor a shade deeper
    for (let w = 0; w < 8; w++) k.box(0.55, H - 3.4, 0.3, -10.5 + w * 3, 3.0, 7.1, shade(wall, 0.05));   // pilasters between the bays
    for (let f = 1; f < fl; f++) for (let w = 0; w < 7; w++) {
      const x = -9 + w * 3, y = 1 + f * 3.2;
      k.box(1.95, 2.15, 0.12, x, y - 0.17, 7.05, trim).box(1.6, 1.8, 0.2, x, y, 7.07, glass, 0, 0, 0, 'shiny');   // the frame, the glass
      k.box(2.5, 0.14, 0.85, x, y - 0.3, 7.45, trim).box(2.5, 0.06, 0.06, x, y + 0.6, 7.86, '#d6dde2', 0, 0, 0, 'shiny');   // the balcony, its rail
    }
    for (let w = 0; w < 7; w++) { const x = -9 + w * 3; k.box(2.5, 2.3, 0.14, x, 0.15, 7.08, glass, 0, 0, 0, 'shiny').box(2.9, 0.08, 1.5, x, 2.55, 7.7, awn, 0, -0.32, 0); }   // the shopfronts and their awnings
    for (const sd of [-1, 1]) for (let f = 1; f < fl; f++) for (let w = 0; w < 4; w++) k.box(0.12, 2.15, 1.95, sd * 11.03, 0.83 + f * 3.2, -4.5 + w * 3, trim).box(0.2, 1.8, 1.6, sd * 11.06, 1 + f * 3.2, -4.5 + w * 3, glass, 0, 0, 0, 'shiny');   // the side windows
    // a pillared porch over the door (the middle bay), then each hotel its own roofline
    k.box(4.6, 0.4, 2.6, 0, 3.0, 8.3, trim).box(4.9, 0.2, 2.8, 0, 3.4, 8.3, shade(wall, -0.12));
    for (const x of [-2.0, 2.0]) k.cyl(0.22, 0.26, 3.0, 10, x, 0, 9.3, trim);
    const st = v % 4;
    if (st === 0) {   // a pediment over the middle and a flag
      k.put(new THREE.CylinderGeometry(5.2, 5.2, 0.8, 3), trim, 0, H + 1.1, 7.0, -Math.PI / 2, 0, 0, 1, 1, 0.42);   // (a triangle prism stood up: the pediment)
      k.cyl(0.07, 0.08, 7, 6, 0, H + 2.2, 4, '#e0e4e8').box(2.2, 1.3, 0.05, 1.15, H + 7.4, 4, ['#d32f2f', '#1d7fd6', '#ffd23f'][(v >> 2) % 3]);
    } else if (st === 1) {   // a round turret at each front corner, a green copper cap
      for (const sd of [-1, 1]) { k.cyl(2.3, 2.3, H + 2.4, 14, sd * 10.6, 0, 6.6, wall).cone(2.7, 4.4, 14, sd * 10.6, H + 2.4, 6.6, '#5e8c7a');
        for (let f = 1; f < fl; f++) k.box(1.3, 1.9, 0.3, sd * 10.6, 1 + f * 3.2, 8.85, glass, 0, 0, 0, 'shiny'); }
    } else if (st === 2) {   // art deco: a stepped tower over the middle, white bands, a flagpole
      k.box(7, 4.5, 8, 0, H, 3, wall).box(4.5, 3, 5.5, 0, H + 4.5, 3, wall).box(7.3, 0.4, 8.3, 0, H + 4.3, 3, trim).box(4.8, 0.4, 5.8, 0, H + 7.3, 3, trim);
      for (let f = 1; f < fl; f++) k.box(22.4, 0.18, 14.4, 0, f * 3.2 - 0.05, 0, trim);
      k.cyl(0.06, 0.07, 5, 6, 0, H + 7.7, 3, '#e0e4e8');
    } else {   // dormers along the roof and tall chimneys
      for (const x of [-7.5, -2.5, 2.5, 7.5]) { k.box(2.2, 2.0, 2.0, x, H + 0.4, 5.2, wall).prism(2.6, 1.1, 2.4, x, H + 2.4, 5.2, roof).box(1.4, 1.3, 0.12, x, H + 0.7, 6.22, glass, 0, 0, 0, 'shiny'); }
      for (const x of [-9, 9]) k.box(1.6, 5, 1.6, x, H + 1, -2, '#8a5a48');
    }
  },
  yacht(k, v) {
    const night = v >= 3, hull = night ? '#26324a' : ['#ffffff', '#1d3557', '#f1faee'][v % 3];
    k.side([-4, 0.4, 4.4, 0.4, 5, 1.6, -4.2, 1.6], 2.6, 0, -0.4, 0, hull, 'shiny', 0.08);
    k.box(1.8, 0.8, 3, 0, 1.2, 0.5, night ? '#33415a' : '#e9eef0');
    k.cyl(0.06, 0.06, 11, 4, 0, 1.2, -0.5, '#c8c8c8');
    if (!night) { k.side([0, 0, 0, 9.5, 3.8, 0], 0.05, 0, 1.6, -0.6, '#fdfdfd'); k.side([0, 0, 0, 8.2, -2.6, 0], 0.05, 0, 1.6, -0.4, '#f2f2f2'); }
    else { k.box(1.6, 0.25, 2.8, 0, 1.4, 0.5, '#ffd98a', 0, 0, 0, 'glow'); k.box(0.25, 0.25, 0.25, 0, 12.2, -0.5, '#fff2c0', 0, 0, 0, 'glow'); }
  },
  pier(k, v) {   // Bournemouth Pier (v 0) and Boscombe Pier (v 1), from the promenade (+X runs out to sea, deck top at y 0): the owner's
    // photos and the seafront game's measured model (365-efoil-game/src/gl/pier.js) - a GREY CONCRETE neck like a long road bridge on
    // dense dark cross-braced piles, white railings; at Bournemouth a long white head building with a copper-green barrel roof and a
    // fly tower, a low white rotunda, the lattice zip-wire tower at the square end and its wires down to the beach; at the root the
    // white pier-entrance building with green roofs and cupolas, the observation wheel beside it
    return v === 3 ? yarmouthPier(k) : v === 2 ? swanagePier(k) : v ? boscombePier(k) : bournemouthPier(k);
  },
  oak(k, v) {
    const c = v ? AUT[(v - 1) % 3] : GRN, q = rnd(11 + v * 7);
    k.cyl(0.38, 0.6, 4.6, 8, 0, 0, 0, '#5a4632').cyl(0.16, 0.26, 2.6, 6, 0.8, 3.6, 0.2, '#5a4632', 0, -0.5).cyl(0.16, 0.26, 2.4, 6, -0.7, 3.8, -0.3, '#5a4632', 0, 0.55);
    for (let i = 0; i < 9; i++) { const a = q() * 6.28, d = q() * 2.6; k.clump(1.5 + q() * 0.9, Math.cos(a) * d, 6.2 + q() * 3, Math.sin(a) * d, c[i % 3], 20 + i); }
  },
  beech(k, v) {
    const c = v ? ['#9a3e1c', '#c0582c', '#de8a3c'] : GRN, q = rnd(21 + v * 5);
    k.cyl(0.32, 0.5, 5.4, 8, 0, 0, 0, '#8d8a82');
    for (let i = 0; i < 9; i++) { const a = q() * 6.28, d = q() * 1.9; k.clump(1.3 + q() * 0.8, Math.cos(a) * d, 6 + q() * 5.2, Math.sin(a) * d, c[i % 3], 40 + i); }
  },
  pine(k) {
    k.cyl(0.26, 0.38, 9.5, 7, 0, 0, 0, '#a0603a');
    const q = rnd(51); for (let i = 0; i < 7; i++) k.clump(1.6 - i * 0.12, (q() - 0.5) * 1.4, 6.6 + i * 1.25, (q() - 0.5) * 1.4, ['#1f4d2e', '#2a6136', '#3a7a40'][i % 3], 60 + i);
  },
  birch(k, v) {
    k.cyl(0.17, 0.24, 7.4, 7, 0, 0, 0, '#ecebe6');
    for (let i = 0; i < 6; i++) k.box(0.38, 0.1, 0.38, 0, 0.8 + i * 1.15, 0, '#2d2d2d', i);
    const c = v ? ['#c8a020', '#e4c034', '#f8dc60'] : GRN, q = rnd(61 + v);
    for (let i = 0; i < 7; i++) k.clump(1 + q() * 0.6, (q() - 0.5) * 2, 6.6 + q() * 3.6, (q() - 0.5) * 2, c[i % 3], 70 + i);
  },
  sheep(k, v) {
    const f = v % 2 ? -1 : 1;
    for (const [x, z] of [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.4], [0.3, 0.4]]) k.box(0.12, 0.5, 0.12, x, 0, z, '#2b2b2b');
    k.ball(0.55, 0, 0.85, 0, '#f2efe6', 1, 0.75, 1.4).box(0.32, 0.36, 0.42, 0, 0.9, -0.8 * f, '#2b2b2b');
  },
  hay(k) { k.axle(0.8, 1.2, 14, 0, 0.8, 0, '#d9b450'); k.axle(0.55, 1.22, 12, 0, 0.8, 0, '#e8c86a'); },
  cottage(k, v) {
    const wall = v ? '#f3ead2' : '#eee3c8';
    k.box(10, 4.4, 7, 0, 0, 0, wall);
    k.prism(8.2, 4, 11, 0, 4.2, 0, '#c9a050', Math.PI / 2);
    k.box(1.2, 2.6, 1.2, 3.6, 6, 0, '#8a7a6a');
    for (let i = 0; i < 3; i++) k.box(1.2, 1.2, 0.1, -3.2 + i * 3.2, 2.4, 3.52, '#3d4f5c', 0, 0, 0, 'shiny');
    k.box(1.2, 2.2, 0.1, 0, 0, 3.55, '#3a5a3a');
    k.clump(1, -4.4, 1, 3.8, '#3f8a3a', 3).clump(0.9, 4.2, 1, 3.8, '#4f9a42', 5);
  },
  finger(k) { k.cyl(0.08, 0.1, 3, 6, 0, 0, 0, '#f4f4f4'); k.box(1.6, 0.35, 0.08, 0.7, 2.5, 0, '#f4f4f4', 0.2).box(1.6, 0.35, 0.08, -0.7, 2, 0, '#f4f4f4', -0.4); },
  castle(k) {   // Corfe: the ruined keep on its steep hill, curtain walls and broken towers
    k.blob(70, 0, -10, 0, '#5f9a45', 1.15, 0.95, 1.05, 141).blob(40, 30, 10, -20, '#6aa44c', 1, 0.6, 1, 143);
    const st = '#c2bba8', dk = '#a39b88', H = 55, X = 1.8;
    k.box(16 * X, 22 * X, 16 * X, 0, H, 0, st, 0, 0, 0, 'stone');   // the keep's lower storey
    k.box(16 * X, 13 * X, 2.2 * X, 0, H + 22 * X, 6.9 * X, st, 0, 0, 0, 'stone');                                         // the walls left standing round its hollow top
    k.box(2.2 * X, 17 * X, 11 * X, 6.9 * X, H + 22 * X, 1.5 * X, st, 0, 0, 0, 'stone');
    k.box(2.2 * X, 9 * X, 8 * X, -6.9 * X, H + 22 * X, 3 * X, dk, 0, 0, 0, 'stone');
    k.box(6 * X, 6 * X, 2.2 * X, -4.6 * X, H + 22 * X, -6.9 * X, dk, 0, 0, 0, 'stone');
    for (const [x, z, h] of [[-6, 6.9, 3], [-2, 6.9, 5], [3, 6.9, 2], [6.9, 5, 4], [6.9, -2, 2.5], [-6.9, 5.5, 2]]) k.box(2.4 * X, h * X, 2.4 * X, x * X, H + (z === 6.9 ? 35 : x === 6.9 ? 39 : 31) * X, z * X, dk, 0, 0, 0, 'stone');   // ragged broken tops
    k.box(6 * X, 14 * X, 4.5 * X, 10 * X, H - 2, -9 * X, dk, 0.3, 0, 0.42, 'stone');                                       // a great slumped piece, fallen and leaning
    for (let f = 0; f < 4; f++) k.box(0.9 * X, 2.6 * X, 0.3, (-4.5 + f * 3) * X, H + (8 + (f % 2) * 9) * X, 8 * X + 0.05, '#2e2c28');   // window slits
    for (let f = 0; f < 3; f++) k.box(0.3, 2.6 * X, 0.9 * X, 8 * X + 0.05, H + (10 + f * 6) * X, (-4 + f * 4) * X, '#2e2c28');
    for (const [x, z, h] of [[-3.5, 6.9, 1.6], [0.5, 6.9, 2.6], [4.5, 6.9, 1.2], [6.9, 2.5, 2.2], [6.9, -3.5, 1.4]]) k.box(1.4 * X, h * X, 1.4 * X, x * X, H + (z === 6.9 ? 35 : 39) * X + (z === 6.9 ? 3 : 4) * X, z * X, st, 0, 0, 0, 'stone');   // zig-zag broken tops
    for (let q = 0; q < 4; q++) k.box(9 * X, (7 - q) * X, 3 * X, (-12 - q * 8) * X, H - 10 - q * 9, (18 + q * 3) * X, q % 2 ? dk : st, 0.25, 0, 0, 'stone').box(9 * X, (6 - q) * X, 3 * X, (14 + q * 8) * X, H - 10 - q * 9, (-18 - q * 3) * X, q % 2 ? st : dk, -0.25, 0, 0, 'stone');   // curtain walls stepping down the hill
    k.box(36 * X, 9 * X, 3.5 * X, -24 * X, H - 4, 14 * X, st).box(5 * X, 15 * X, 5 * X, -42 * X, H - 6, 14 * X, dk).box(30 * X, 7 * X, 3.5 * X, 22 * X, H - 4, -14 * X, st).box(5 * X, 12 * X, 5 * X, 37 * X, H - 6, -14 * X, dk).box(4 * X, 18 * X, 4 * X, 20 * X, H - 4, 16 * X, dk);
  },
  heather(k, v) {
    const c = v ? ['#8a5a9a', '#a46ab8', '#c08cd4'] : ['#b0762a', '#cc8f3a', '#8a5f2a'];
    for (let i = 0; i < 4; i++) k.clump(0.55, (i - 1.5) * 0.65, 0.35, (i % 2) * 0.4, c[i % 3], 70 + i);
  },
  pony(k, v) { ponyAt(k, 0, 0, ['#6b4423', '#3a2a1e', '#9a8a7a'][v % 3], 1, v === 1); },
  logs(k) { for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) k.roll(0.32, 3.4, 9, -1.05 + i * 0.7 + r * 0.35, 0.32 + r * 0.56, 0, i % 2 ? '#7a5634' : '#8a6440'); },
  forestsign(k) { k.cyl(0.08, 0.08, 2.4, 5, 0, 0, 0, '#9aa0a6'); k.box(1.8, 1.3, 0.08, 0, 2.2, 0, '#d32f2f').box(1.6, 1.1, 0.1, 0, 2.3, 0, '#ffffff'); k.box(0.7, 0.5, 0.12, 0, 2.6, 0, '#4a3020'); },
  gorse(k) {
    k.clump(0.95, 0, 0.7, 0, '#3e6330', 13).clump(0.75, 0.7, 0.8, 0.3, '#4d7438', 15);
    const r = rnd(17); for (let i = 0; i < 16; i++) k.ball(0.11, (r() - 0.5) * 2.2, 0.6 + r() * 0.8, (r() - 0.5) * 1.6, i % 3 ? '#ffd31a' : '#ffe766', 1, 1, 1, 'lit', 5);
  },
  rock(k, v) { const col = ['#8b8f93', '#e9e4d6', '#9a7d62'][v % 3]; k.blob(1.4, 0, 0.6, 0, col, 1.3, 0.75, 1, 81 + v).blob(0.9, 1.2, 0.4, 0.4, shade(col, -0.1), 1, 0.8, 1, 83 + v); },
  stack(k, v) {
    const w = [1, 1.3, 0.8][v % 3];
    k.cyl(5 * w, 7 * w, 26, 9, 0, -4, 0, '#f1ece0').cyl(4.6 * w, 5 * w, 1.2, 9, 0, 22, 0, '#6f9a45');
    k.cyl(9 * w, 9 * w, 0.3, 14, 0, -0.1, 0, '#ffffff');
  },
  lighthouse(k) {
    k.blob(7, 0, -1, 0, '#6b6056', 1.2, 0.7, 1.1, 91);
    k.cyl(1.7, 2.4, 18, 14, 0, 2, 0, '#f6f3ee');
    k.cyl(2.2, 2.25, 2.6, 14, 0, 8, 0, '#c62828').cyl(1.95, 2, 2.6, 14, 0, 14, 0, '#c62828');
    k.cyl(2.4, 2.4, 0.4, 14, 0, 20, 0, '#222').cyl(1.3, 1.3, 2.2, 10, 0, 20.4, 0, '#fff4b3', 0, 0, 'glow').cone(1.6, 1.6, 10, 0, 22.6, 0, '#c62828');
  },
  arch(k) {   // Durdle Door: a natural limestone arch - the long headland sloping up from the sea, then weathered boulders round a
    // rounded, ragged opening; pale limestone where it's steep, turf where it's level, dark at its wet foot, foam round it
    const rock = '#d8cfb7', turf = '#6e9446';
    k.blob(30, -50, 3, 0, turf, 1.75, 0.9, 0.55, 301, { rock: rock, wet: true });
    [[-25, 6, 15], [-23, 18, 13], [-15, 27, 12.5], [-3, 30, 12], [9, 27, 11.5], [18, 18, 11], [21, 7, 12]].forEach(([ax, ay, ar], i) =>
      k.blob(ar, ax, ay, (i % 2 ? 1.6 : -1.6), turf, 1.15, 1.0, 0.72, 311 + i, { rock: rock, wet: true, smooth: true }));
    for (const [fx, fz, fr] of [[-30, 10, 9], [30, 9, 7], [2, -11, 10], [40, -7, 6], [-44, -9, 7]]) k.ball(fr, fx, -0.2, fz, '#e9efee', 1.6, 0.04, 1, 'lit', 10);   // foam where the sea meets it
  },
  building(k, v) {
    const h = [24, 34, 16, 28][v % 4], r = rnd(91 + v);
    k.box(18, h, 12, 0, 0, 0, '#1a2034');
    for (let y = 2; y < h - 2; y += 3) for (let x = -7.5; x <= 7.5; x += 2.5) if (r() < 0.6) k.box(1.4, 1.5, 0.1, x, y, 6.05, r() < 0.8 ? '#ffd27a' : '#bfe0ff', 0, 0, 0, 'glow');
    if (v % 2) k.box(10, 2.4, 0.2, 0, 0, 6.15, '#ffd98a', 0, 0, 0, 'glow');
  },
  bollard(k) { k.cyl(0.16, 0.2, 0.9, 8, 0, 0, 0, '#1b1d22'); },
  buoy(k, v) { const col = v ? '#2e9e4a' : '#d32f2f'; k.cyl(0.4, 0.9, 1.6, 9, 0, -0.3, 0, col).cone(0.45, 0.9, 9, 0, 1.3, 0, col).box(0.25, 0.25, 0.25, 0, 2.2, 0, '#ffef9a', 0, 0, 0, 'glow'); },
  ferry(k) {
    k.side([-28, 0, 28, 0, 30, 4, -30, 4], 14, 0, -1, 0, '#e9eef2');
    k.box(16, 6, 10, 0, 3, 0, '#f4f6f8').box(10, 3, 8, 0, 9, 0, '#f4f6f8').cyl(1, 1, 4, 8, 0, 12, 0, '#2b4a7a');
    for (let i = 0; i < 6; i++) k.box(1.6, 1, 0.2, -6 + i * 2.4, 6, 5.05, '#ffd98a', 0, 0, 0, 'glow');
  },
  needles(k) {   // the Needles: three low jagged blades of chalk in a line out to sea (+X), the lighthouse at the foot of the last - a white
    // tower with a red band, its lantern and the helipad on top - about as tall as the rocks (from the owner's photo of them at night)
    const W = '#f3eee4', W2 = '#e2dccd';
    const blade = (x0, len, h, th, ry) => {
      const sh = new THREE.Shape(); sh.moveTo(0, -2); sh.lineTo(len * 0.15, h * 0.7); sh.lineTo(len * 0.32, h * 0.86); sh.lineTo(len * 0.46, h); sh.lineTo(len * 0.62, h * 0.82); sh.lineTo(len * 0.8, h * 0.6); sh.lineTo(len, -2); sh.lineTo(0, -2);
      const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: th * 0.25, bevelSize: 0.8, bevelSegments: 2 }); g.translate(0, 0, -th / 2);
      k.put(g, W, x0, 0, 0, 0, ry || 0, 0, 1, 1, 1, 'stone');
      k.blob(len * 0.22, x0 + len * 0.5, -1, 0, W2, 1.3, 0.25, 0.7, 120 + Math.round(x0));   // its foot in the surf
    };
    const O = 60;   // (the whole line starts this far out from where it's placed: from 56 m back, its first blade stood on the grass by the road)
    blade(O - 56, 26, 26, 7, 0.08); blade(O - 24, 20, 21, 6, -0.06); blade(O + 2, 15, 16, 5, 0.1);
    const LX = O + 26;
    k.blob(7, LX, -1, 0, '#8a8478', 1.2, 0.45, 1, 111);   // the rock it stands on
    k.cyl(2.6, 3.1, 16, 16, LX, 1, 0, '#f6f3ee').cyl(2.62, 2.62, 3.2, 16, LX, 8.5, 0, '#c62828');   // the tower, its red band
    k.cyl(1.7, 1.9, 2.2, 12, LX, 17, 0, '#2a2a2a').cyl(1.5, 1.5, 1.6, 12, LX, 17.3, 0, '#ff4a3a', 0, 0, 'glow');   // the lantern, lit red
    k.cyl(3.6, 3.6, 0.4, 16, LX, 19.4, 0, '#e8e4da').cyl(3.65, 3.65, 0.05, 16, LX, 19.82, 0, '#3a8a4a');   // the helipad
    k.cyl(46, 46, 0.3, 18, O - 16, -0.1, 0, '#ffffff');   // the surf round them
  },
  yarmouthcastle(k) {   // Yarmouth Castle by the ferry slipway: a squat Tudor artillery fort of grey stone, low thick walls, an arrowhead bastion
    // on the land side, a gun platform with cannons looking over the water (+X: the water), a flag
    const S = '#a8a294', S2 = '#968f80';
    k.box(30, 8, 26, 0, -0.5, 0, S, 0, 0, 0, 'stone').box(30.6, 1, 26.6, 0, 7.5, 0, S2, 0, 0, 0, 'stone');
    k.put(new THREE.CylinderGeometry(15, 15, 8, 4), S, -16, 3.5, 0, 0, Math.PI / 4, 0, 1, 1, 0.75, 'stone');   // the arrowhead bastion
    for (let i = 0; i < 7; i++) k.box(2.2, 1.4, 1.4, -12 + i * 4, 7.5, 13.0, S2, 0, 0, 0, 'stone').box(2.2, 1.4, 1.4, -12 + i * 4, 7.5, -13.0, S2, 0, 0, 0, 'stone');   // battlements
    for (let i = 0; i < 4; i++) k.roll(0.35, 3, 8, 12 + (i % 2) * 2, 9.2, -9 + i * 6, '#1c1c1c').box(1.2, 0.6, 1.6, 11, 8.5, -9 + i * 6, '#5a4632');   // the cannons
    k.box(6, 4, 6, -6, 7.5, 6, '#e8e4dc').prism(6.6, 2.2, 6.6, -6, 11.5, 6, '#4a4a4e');   // a little white house inside the walls
    k.cyl(0.08, 0.1, 8, 6, 2, 8.5, -4, '#e8ecea').box(2.4, 1.4, 0.05, 3.25, 15, -4, '#c62828');
  },
  thatch(k, v) {   // a thatched cottage (Freshwater): white walls, a deep rounded thatch roof down over little windows, a brick chimney
    const W = ['#f6f2e8', '#efe6d0', '#f4ecdc'][v % 3], T = ['#b89a5a', '#a88a4a', '#c4a868'][v % 3];
    k.box(10, 3.4, 6, 0, 0, 0, W);
    k.put(new THREE.CylinderGeometry(4.4, 4.4, 11, 14, 1, false, -Math.PI / 2, Math.PI), T, 0, 3.2, 0, 0, 0, Math.PI / 2, 1, 0.9, 1);   // the thatch, rounded
    k.box(11, 0.4, 7.2, 0, 3.0, 0, shade(T, -0.15));
    for (const x of [-3, 3]) k.box(1.2, 1.0, 0.1, x, 1.2, 3.02, '#2a3440', 0, 0, 0, 'shiny').box(1.0, 0.8, 0.12, x, 5.2, 3.6, '#2a3440', 0, 0, 0, 'shiny');   // windows, the eyebrow ones in the thatch
    k.box(1.0, 2.0, 0.12, 0, 0, 3.03, ['#2f5a3a', '#1d3557', '#7a1f2b'][v % 3]).box(1.4, 3.4, 1.2, 4.2, 5.4, -1, '#9a5040');
    k.box(10.6, 0.8, 0.4, 0, 0, 5.5, '#4f8a3a');   // a hedge at the front
    for (let i = 0; i < 6; i++) k.ball(0.25, -4 + i * 1.6, 0.9, 5.6, ['#e63946', '#ff7eb6', '#ffd23f'][i % 3], 1, 1, 1, 'lit', 6);
  },
  tennyson(k) {   // the Tennyson Monument on the top of the down: a tall Celtic cross of pale granite on a stepped base
    const G = '#c9c3b6';
    k.box(5, 1, 5, 0, 0, 0, G, 0, 0, 0, 'stone').box(3.6, 1, 3.6, 0, 1, 0, G, 0, 0, 0, 'stone').box(1.6, 9, 1.0, 0, 2, 0, G, 0, 0, 0, 'stone');
    k.box(5, 1.2, 1.0, 0, 8.2, 0, G, 0, 0, 0, 'stone').put(new THREE.TorusGeometry(1.5, 0.3, 6, 18), G, 0, 8.8, 0, 0, 0, 0, 1, 1, 1, 'stone');
  },
  alumcliffs(k) {   // Alum Bay's cliffs of coloured sands: a tall curved face striped top to bottom in reds, ochres, yellows, white and grey-purple,
    // a green top, a shingle beach at its foot (its face +Z, towards the road across the bay)
    const C = ['#c0563a', '#e0b060', '#f2e6c8', '#a86a8a', '#e8a048', '#d8d0c0', '#9a4a3a', '#f0d080', '#8a8a9a', '#c87850', '#efe4cc', '#b05a6a'];
    for (let i = 0; i < 30; i++) {   // the face in steep sloping strips, each its own sand, overlapping (upright and apart they read as slabs)
      const a = -0.75 + i * 0.05, x = Math.sin(a) * 100, z = -Math.cos(a) * 100 + 100, h = 50 + Math.sin(i * 1.7) * 7 + Math.sin(i * 0.43) * 5;
      k.box(6.6, h, 12, x, -2, z - 6, C[i % C.length], -a, -0.32, 0, 'lit');
      k.blob(5.5, x - Math.sin(a) * 6, h - 5, z - 12, '#6f9a45', 1.3, 0.45, 1.6, 3400 + i);   // the turf along the top, rounded
      if (i % 2 === 0) k.box(3.2, h * 0.55, 0.4, x + Math.cos(a) * 1.2, h * 0.1, z + 0.6 - h * 0.08, C[(i + 5) % C.length], -a, -0.32, 0.05);   // a streak of another sand down the face
    }
    for (let i = 0; i < 12; i++) k.blob(4 + (i % 3), -55 + i * 10, -0.5, 6 + (i % 2) * 3, C[(i * 5) % C.length], 1.6, 0.5, 1, 3460 + i);   // slumped sand at the foot
    k.box(150, 0.6, 14, 0, -0.3, 12, '#9a958a');   // the shingle
  },
  landmarkpark(k) {   // the Needles visitor park on the clifftop: low buildings with glass fronts under a long canopy, people, the jars of
    // coloured sand in a lit window, flags
    const r = rnd(3300);
    k.box(30, 4.6, 12, 0, 0, 0, '#f2f0ea').box(31, 0.4, 13, 0, 4.6, 0, '#2f4a6a').box(28, 3.4, 0.12, 0, 0.5, 6.05, '#3a5566', 0, 0, 0, 'shiny');
    k.box(30, 0.2, 4, 0, 3.6, 8, '#e8e4dc'); for (let x = -14; x <= 14; x += 4) k.cyl(0.1, 0.1, 3.6, 6, x, 0, 9.8, '#9aa0a6');
    for (let i = 0; i < 10; i++) k.box(0.4, 0.9, 0.3, -6 + i * 1.2, 1.2, 6.2, ['#c0563a', '#e0b060', '#a86a8a', '#f2e6c8', '#e8a048'][i % 5]);   // the sand jars in the window
    for (let i = 0; i < 4; i++) k.cyl(0.06, 0.06, 7, 5, -15 + i * 10, 0, 13, '#e8ecea').box(1.6, 1.0, 0.05, -14.2 + i * 10, 6, 13, ['#d62828', '#1d7fd6', '#ffd23f', '#2a9d8f'][i]);
    for (let i = 0; i < 5; i++) person(k, -13 + r() * 26, 0, 10 + r() * 4, r, r() < 0.3);
  },
  oldbattery(k) {   // the Old Battery on the cliff over the Needles: low Victorian fort walls round a parade, two big guns on their mounts, the
    // little white coastguard lookout with its windows all round, a flagpole (+X towards the sea)
    const S = '#b8b0a0';
    k.box(34, 2.2, 1.6, 0, 0, -12, S, 0, 0, 0, 'stone').box(34, 2.2, 1.6, 0, 0, 12, S, 0, 0, 0, 'stone').box(1.6, 2.2, 25, -17, 0, 0, S, 0, 0, 0, 'stone').box(1.6, 2.6, 25, 17, 0, 0, S, 0, 0, 0, 'stone');
    k.box(32, 0.1, 22, 0, 0.02, 0, '#7a8a5a');
    for (const z of [-5, 5]) k.cyl(2.2, 2.2, 0.8, 12, 12, 0, z, '#5a5a5a').roll(0.5, 7, 10, 12, 1.6, z, '#1c1c1c').box(6, 0.4, 0.4, 14.5, 1.6, z, '#1c1c1c', 0, 0, 0.12);
    k.box(5, 3.4, 4, -8, 0, 0, '#f6f6f2').box(5.2, 1.4, 4.2, -8, 3.4, 0, '#3a5566', 0, 0, 0, 'shiny').box(5.6, 0.3, 4.6, -8, 4.8, 0, '#2a2a2a');   // the lookout
    k.cyl(0.08, 0.1, 9, 6, 0, 0, -8, '#e8ecea').box(2.4, 1.4, 0.05, 1.25, 7.4, -8, '#1d4e89');
  },
  chev(k) { k.cyl(0.06, 0.06, 1.3, 5, 0, 0, 0, '#9aa0a6'); k.box(1.1, 0.9, 0.06, 0, 1.2, 0, '#111111'); },
  warn(k) { k.cyl(0.08, 0.08, 1.7, 5, -1.4, 0, 0, '#9aa0a6').cyl(0.08, 0.08, 1.7, 5, 1.4, 0, 0, '#9aa0a6'); k.box(3.6, 1.5, 0.08, 0, 1.6, 0, '#111111'); },
  gpost(k) { k.box(0.18, 1.1, 0.18, 0, 0, 0, '#f4f4f4').box(0.2, 0.18, 0.2, 0, 0.75, 0, '#d32f2f'); },
  wall(k) { k.box(0.6, 1.1, 4.5, 0, 0, 0, '#c9c1ae', 0, 0, 0, 'stone').box(0.72, 0.18, 4.5, 0, 1.05, 0, '#a59c88', 0, 0, 0, 'stone'); },
  fence(k) { k.box(0.14, 1.2, 0.14, 0, 0, 0, '#8a6a48').box(0.08, 0.1, 4.2, 0, 0.55, 0, '#8a6a48').box(0.08, 0.1, 4.2, 0, 1.05, 0, '#8a6a48'); },
  rail(k) { k.box(0.1, 1, 0.1, 0, 0, 0, '#2f7f86').box(0.07, 0.08, 4.2, 0, 0.55, 0, '#2f7f86').box(0.09, 0.09, 4.2, 0, 0.98, 0, '#2f7f86'); },
  quay(k) { k.box(0.8, 0.7, 4.2, 0, 0, 0, '#55585f'); },
  marker(k) { k.box(0.14, 1.05, 0.14, 0, 0, 0, '#f4f4f0').box(0.15, 0.22, 0.15, 0, 0.72, 0, '#151515').box(0.06, 0.1, 0.02, 0, 0.78, -0.08, '#ff2a2a', 0, 0, 0, 'glow'); },
  vpost(k) {   // the road's edge on the downs and the heath: wooden posts, three strands of wire
    k.box(0.12, 1.05, 0.12, 0, 0, -1.05, '#7a6448').box(0.12, 1.05, 0.12, 0, 0, 1.05, '#6f5a40');
    for (const y of [0.38, 0.66, 0.94]) k.box(0.022, 0.022, 4.3, 0, y, 0, '#9a9da2', 0, 0, 0, 'shiny');
  },
  prom(k, v) {   // the town's edge: a low cream wall with a coping, flowers along the top of every other length
    k.box(0.5, 0.62, 4.25, 0, 0, 0, '#e8dfcc', 0, 0, 0, 'stone').box(0.66, 0.1, 4.25, 0, 0.62, 0, '#d2c7b0', 0, 0, 0, 'stone');
    if (v % 2 === 0) { const r = rnd(41 + v); k.box(0.46, 0.22, 3.9, 0, 0.72, 0, '#5a4a36');
      for (let i = 0; i < 14; i++) k.ball(0.11 + r() * 0.05, (r() - 0.5) * 0.3, 0.98 + r() * 0.1, -1.85 + i * 0.28, i % 3 ? ['#e63946', '#ffd23f', '#ff7eb6', '#ffffff', '#ff9a3c'][(i + v) % 5] : '#4f8a3a', 1, 0.8, 1, 'lit', 5); }
  },
  flowerbed(k, v) {   // a raised bed of bright flowers on the front
    const r = rnd(61 + v), cols = [['#e63946', '#ffd23f', '#ffffff'], ['#ff7eb6', '#9b5de5', '#ffffff'], ['#ff9a3c', '#ffd23f', '#e63946']][v % 3];
    k.box(3.2, 0.4, 1.4, 0, 0, 0, '#d9cfb8', 0, 0, 0, 'stone').box(3.0, 0.12, 1.2, 0, 0.36, 0, '#4a3a2a');
    for (let i = 0; i < 22; i++) { const x = (r() - 0.5) * 2.8, z = (r() - 0.5) * 1.0; k.ball(0.16, x, 0.55 + r() * 0.15, z, i % 4 ? cols[i % 3] : '#4f8a3a', 1, 0.75, 1, 'lit', 5); }
  },
  tpole(k) {   // a telegraph pole along a country road
    k.cyl(0.12, 0.16, 8.4, 6, 0, 0, 0, '#5d4a36').box(1.5, 0.12, 0.12, 0, 7.6, 0, '#5d4a36');
    for (const x of [-0.6, 0, 0.6]) k.cyl(0.05, 0.05, 0.16, 5, x, 7.72, 0, '#e8e8e2');
  },
  windsurf(k, v) {   // a windsurfer out on the water: a white board, a bright sail leaning into the wind
    const sail = [['#ff3b30', '#ffd60a'], ['#0a84ff', '#ffffff'], ['#34c759', '#ffd60a'], ['#ff2d92', '#5ac8fa']][v % 4];
    k.box(0.6, 0.14, 2.7, 0, 0, 0, '#f4f6f8', 0, 0, 0, 'shiny');
    k.side([0.2, 0.3, 0.1, 4.6, -1.9, 0.5], 0.04, 0, 0.1, 0, sail[0], 'lit');
    k.side([0.1, 2.6, 0.1, 4.6, -0.9, 1.6], 0.05, 0.01, 0.1, 0, sail[1], 'lit');
    k.box(0.05, 4.6, 0.05, 0, 0.12, 0.15, '#d8dade');
    person(k, -0.3, 0.12, -0.3, rnd(7 + v), false);
  },
  bunting(k, v) {   // a string of bright pennants across the road between two white poles, sagging in the middle
    const W = 14.6, cols = [['#e63946', '#ffffff', '#1d4ed8'], ['#ffd23f', '#e63946', '#2a9d8f', '#ffffff'], ['#ff7eb6', '#ffd23f', '#3ec1ff', '#7cff8a']][v % 3];
    for (const sd of [-1, 1]) k.cyl(0.09, 0.12, 7.2, 6, sd * W, 0, 0, '#f2f2ee');
    const N = 30;
    for (let i = 0; i < N; i++) { const u = (i + 0.5) / N * 2 - 1, y = 6.9 - 1.6 * (1 - u * u), x = u * W;
      k.put(new THREE.ConeGeometry(0.34, 0.66, 3), cols[i % cols.length], x, y - 0.36, 0, Math.PI, 0, 0, 1, 1, 0.12, 'lit'); }   // a pennant, facing along the road
    for (let i = 0; i < N; i++) { const u0 = i / N * 2 - 1, u1 = (i + 1) / N * 2 - 1, y0 = 6.9 - 1.6 * (1 - u0 * u0), y1 = 6.9 - 1.6 * (1 - u1 * u1); k.box(Math.hypot(W * (u1 - u0), y1 - y0), 0.025, 0.025, (u0 + u1) / 2 * W, (y0 + y1) / 2, 0, '#2a2a2a', 0, 0, Math.atan2(y1 - y0, W * (u1 - u0))); }
  },
  chainferry(k) {   // the chain ferry (bow -Z), from the owner's drone footage: 74 m long and 20 wide, white, the car deck open down the
    // middle (green, lane lines), a passenger structure along each side, the bridge raised high on one side amidships with its mast,
    // hinged ramps at both ends, the chains running out ahead and astern (no name, no livery)
    const W = '#f6f7f6', L = 66, deckY = 1.3;
    k.box(20, 2.9, L, 0, -1.6, 0, W).box(20.1, 0.5, L + 0.1, 0, -1.6, 0, '#24323e');   // the hull, a dark band at the water
    k.box(15.2, 0.12, L, 0, deckY - 0.1, 0, '#3f6f52');   // the car deck (a hair above the hull's top: level with it, the two fought)
    for (const x of [-1.9, 1.9, 5.7, -5.7]) k.box(0.15, 0.02, L - 4, x, deckY + 0.025, 0, '#f2f2ee');   // lanes, between the rows of cars
    for (const sd of [-1, 1]) {
      const x = sd * 8.8;
      k.box(2.4, 3.2, L - 10, x, deckY, 0, W).box(2.5, 0.25, L - 10, x, deckY + 3.2, 0, '#e2e4e2');
      k.box(0.08, 1.1, L - 14, x + sd * 1.22, deckY + 1.5, 0, '#33475a', 0, 0, 0, 'shiny').box(0.08, 1.1, L - 14, x - sd * 1.22, deckY + 1.5, 0, '#33475a', 0, 0, 0, 'shiny');
      for (let z = -L / 2 + 6; z < L / 2 - 5; z += 2.4) k.box(0.05, 1.0, 0.05, x + sd * 1.15, deckY + 3.45, z, '#ffffff');
      k.box(0.06, 0.06, L - 10, x + sd * 1.15, deckY + 4.45, 0, '#ffffff').box(0.06, 0.06, L - 10, x - sd * 1.15, deckY + 4.45, 0, '#ffffff');
      for (const z of [-20, 0, 20]) k.put(new THREE.TorusGeometry(0.35, 0.09, 6, 12), '#e63946', x + sd * 1.27, deckY + 2.2, z, 0, Math.PI / 2, 0);   // lifebuoys
      for (const e of [-1, 1]) beam(k, [sd * 4.2, -0.4, e * (L / 2 - 2)], [sd * 4.2, -4, e * (L / 2 + 40)], 0.3, '#2a2a2a');   // the chains, out into the water
    }
    for (const e of [-1, 1]) k.box(15, 0.4, 6, 0, deckY - 0.1, e * (L / 2 + 2.6), '#5a5f66', 0, e * 0.12, 0).box(15.4, 0.3, 0.3, 0, deckY + 0.2, e * (L / 2 + 5.6), '#e8c02a');   // the ramps, a little raised
    // the bridge, raised amidships on the starboard side (+X), its wheelhouse windows, mast and radar
    k.box(4.6, 5.6, 9, 8.8, deckY + 3.2, 0, W).box(4.8, 1.4, 9.2, 8.8, deckY + 6.6, 0, '#22303c', 0, 0, 0, 'shiny').box(5.2, 0.4, 9.6, 8.8, deckY + 8.8, 0, '#e2e4e2');
    k.cyl(0.1, 0.12, 5, 6, 8.8, deckY + 9.2, 0, '#ffffff').box(2.6, 0.12, 0.2, 8.8, deckY + 12.6, 0, '#ffffff').box(0.4, 0.4, 0.4, 8.8, deckY + 14.2, 0, '#ffd23f', 0, 0, 0, 'glow');
    for (let i = 0; i < 6; i++) person(k, 8.8 + (i % 2 ? 0.5 : -0.4), deckY + 3.45, (i < 3 ? -26 : 9) + (i % 3) * 5, rnd(1800 + i), i % 3 === 0);   // passengers along the top, on the bridge's side (the camera swings round the other)
  },
  carferry(k) {   // a car ferry across the Solent: a long white hull with a navy band, an open car deck at the back, the bridge and
    // passenger decks forward, a funnel (our own colours)
    k.side([-30, -2.5, 28, -2.5, 33, 2.5, -32, 2.5], 16, 0, 0, 0, '#1f3a5f', 'lit', 0.2);
    k.side([-31.6, 2.5, 32.6, 2.5, 33.4, 3.3, -32.2, 3.3], 16.2, 0, 0, 0, '#f4f6f8', 'lit', 0.1);
    k.box(15.6, 0.12, 36, 0, 3.3, 12, '#4a4f55').box(0.15, 0.12, 30, 0, 3.43, 12, '#e8e2c8');   // the open car deck at the back, its lane line
    for (const sd of [-1, 1]) k.box(0.3, 1.4, 36, sd * 7.85, 3.3, 12, '#f4f6f8').box(0.32, 0.12, 36, sd * 7.85, 4.7, 12, '#1f3a5f');   // its sides
    k.box(15, 4.2, 22, 0, 3.3, -17, '#f4f6f8').box(13, 3.4, 16, 0, 7.5, -19, '#f4f6f8').box(10, 2.4, 7, 0, 10.9, -22, '#f4f6f8');   // the decks forward
    for (const y of [4.6, 8.4]) for (const sd of [-1, 1]) for (let i = 0; i < 8; i++) k.box(0.08, 1.1, 1.8, sd * (y < 6 ? 7.52 : 6.52), y, -26 + i * 2.6, '#2a3a48', 0, 0, 0, 'shiny');
    k.box(10.2, 1.0, 0.1, 0, 11.6, -25.55, '#22313f', 0, 0, 0, 'shiny');   // the bridge windows
    k.cyl(1.6, 1.9, 5, 12, 0, 13.3, -16, '#1f3a5f').cyl(1.65, 1.65, 0.9, 12, 0, 17.4, -16, '#f2c230');   // the funnel
    k.box(16, 0.2, 0.2, 0, 4.7, 30, '#1f3a5f').cyl(0.08, 0.08, 7, 5, 0, 13.3, -24, '#d8dade');
  },
  wight(k) {   // the Isle of Wight's west end from the sea: white chalk cliffs under green downs
    const n0 = k.parts.lit ? k.parts.lit.length : 0;
    k.blob(60, 0, -18, 0, '#f3eee4', 4.2, 0.9, 1.4, 141).blob(55, -60, -16, 30, '#efe9de', 3.2, 0.75, 1.2, 143);
    for (let q = n0; q < k.parts.lit.length; q++) { const g = k.parts.lit[q], p = g.attributes.position, c = g.attributes.color;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), f = 0.86 + 0.14 * Math.sin(y * 0.7 + p.getX(i) * 0.05); c.setXYZ(i, c.getX(i) * f, c.getY(i) * f, c.getZ(i) * f); } }
    k.blob(58, 0, 14, 0, '#7a9a55', 4.25, 0.32, 1.42, 145).blob(52, -60, 10, 30, '#86a45c', 3.25, 0.3, 1.22, 147);
  },
  studland(k) {   // Studland from the ferry: Shell Bay's long sandy beach with marram dunes, heath and pines behind, the slipway and
    // its queue, and the chalk headland of Old Harry far off to the left
    k.blob(70, 0, -64, 0, '#ecd9a8', 4.5, 1, 1.2, 151, { smooth: true }).blob(60, 0, -46, -40, '#cbbf8a', 4.2, 0.9, 1.0, 153, { smooth: true });
    k.blob(60, 0, -36, -110, '#6a7a48', 4.6, 0.85, 1.2, 159, { smooth: true }).blob(50, -160, -36, -60, '#f1ece0', 1.6, 0.9, 1.0, 155).blob(50, -160, -22, -60, '#6f9a45', 1.62, 0.32, 1.02, 157);
    const r = rnd(161); for (let i = 0; i < 26; i++) { const x = (r() - 0.5) * 520, z = -60 - r() * 90; k.cone(4 + r() * 3, 10 + r() * 6, 7, x, 0, z, ['#2e4a2a', '#36522e'][i % 2]); }
    for (let i = 0; i < 18; i++) { const x = (r() - 0.5) * 480; k.card(3, 2, x, 6.2, -12 - r() * 8, '#b8b878', r() * 3, 0, 'grass', 'up'); }
    k.box(16, 0.6, 46, 0, 2.4, 6, '#8a8a84', 0, 0.12, 0).box(24, 0.6, 40, 2, 5.6, -36, '#9a958a');   // the slipway up from the water, the lane at its head
    k.box(3, 2.8, 3.4, 14, 6.2, -26, '#f4f2ec').box(3.4, 0.3, 3.8, 14, 9.0, -26, '#1d4e89');
    for (let i = 0; i < 6; i++) carShape(k, 4, -24 - i * 5.6, ['#d62828', '#f4f4f4', '#1d4ed8', '#2b2d42', '#e76f51', '#c0c4c8'][i], 6.2);
  },
  armco(k) { k.box(0.14, 0.75, 0.14, 0, 0, 0, '#9aa0a6').box(0.06, 0.32, 4.2, -0.05, 0.42, 0, '#e8ecef', 0, 0, 0, 'shiny'); },
  tuft(k, v) {   // grass and flowers by the road
    const col = ['#7cbf52', '#8ccf5a', '#6aaa48', '#a8c850', '#94c25a', '#78b04c'][v % 6];
    k.card(1.1, 0.9, 0, 0.42, 0, col, 0, 0, 'grass', 'up').card(1.1, 0.9, 0, 0.42, 0, col, Math.PI / 2, 0, 'grass', 'up');
  },
  crowd(k, v) {   // a row of people cheering behind a barrier (on their +Z side, towards the road), at the start, the checkpoints and the goal
    const r = rnd(200 + v);
    for (let i = 0; i < 9; i++) person(k, -6.4 + i * 1.6 + (r() - 0.5) * 0.7, 0, (r() - 0.5) * 0.9, r, r() < 0.8);
    k.box(15, 0.9, 0.12, 0, 0, 0.7, '#e8e4da', 0, 0, 0, 'shiny');
    for (let i = 0; i < 8; i++) k.box(1.8, 0.3, 0.13, -6.3 + i * 1.8, 0.45, 0.7, i % 2 ? '#1f2f4a' : '#e8e4da');
  },
  flags(k, v) {   // flag poles in a row
    for (let i = 0; i < 4; i++) { const x = -4.5 + i * 3; k.cyl(0.05, 0.06, 6, 6, x, 0, 0, '#d8dde2'); k.box(1.6, 1, 0.04, x + 0.82, 4.8, 0, ['#d32f2f', '#ffd23f', '#1d7fd6', '#2a9d8f', '#ffffff'][(i + v) % 5], 0, 0, 0.08); }
  },
  villa(k, v) {   // Sandbanks: a smart white house of stacked boxes, glass walls to the sea, a pool
    if (v >= 4) return v % 2 ? villaCurve(k, v) : villaGable(k, v);
    const w = ['#f8f8f4', '#f2efe8', '#f6f2ea', '#eef0ee'][v % 4], gl = '#25323e';
    k.box(15, 4, 10, 0, 0, 0, w).box(10, 3.6, 8, v % 2 ? 2 : -2, 4, -0.6, w);
    k.box(14, 2.8, 0.15, 0, 0.6, 5.06, gl, 0, 0, 0, 'shiny').box(9, 2.6, 0.15, v % 2 ? 2 : -2, 4.5, 3.46, gl, 0, 0, 0, 'shiny');
    k.box(15.6, 0.28, 10.6, 0, 4, 0, '#d9d9d4').box(10.6, 0.28, 8.6, v % 2 ? 2 : -2, 7.6, -0.6, '#d9d9d4');
    k.box(15, 0.9, 0.06, 0, 4.28, 5.25, '#bcd7e6', 0, 0, 0, 'shiny');   // the glass balcony rail
    k.box(7, 0.06, 3.2, -3, 0, 7.2, '#29b4dc', 0, 0, 0, 'shiny').box(7.6, 0.2, 3.8, -3, -0.05, 7.2, '#e7e2d6');
    const ux = v % 2 ? 2 : -2;
    for (const sd of [-1, 1]) { k.box(0.12, 2.2, 7, sd * 7.52, 0.9, 0, gl, 0, 0, 0, 'shiny').box(0.12, 2.0, 5, ux + sd * 5.02, 4.7, -0.6, gl, 0, 0, 0, 'shiny'); }   // windows round the sides
    for (let i = 0; i < 12; i++) k.box(0.12, 2.8, 0.06, ux - 4.4 + i * 0.8, 4.4, 3.62, ['#c9a46a', '#8a8f96', '#d8d2c4', '#5a5f66'][v % 4]);   // a louvred sunshade over the upper glass
    k.box(10.2, 0.9, 0.06, ux, 7.9, 3.45, '#bcd7e6', 0, 0, 0, 'shiny').cyl(0.05, 0.05, 2.2, 5, ux + 3, 7.9, 1, '#e8e4da');   // the roof terrace: its glass rail, a parasol
    k.cone(1.6, 0.5, 8, ux + 3, 9.9, 1, ['#ffffff', '#1d3557', '#e9c46a', '#2a9d8f'][v % 4]);
    k.box(17, 1.3, 0.4, 0, 0, 9.6, w).box(2.6, 1.4, 0.1, 5.5, 0, 9.75, '#5a5f66');   // the front wall, the gate
    k.cyl(0.18, 0.28, 5.5, 6, 6.2, 0, 7.8, '#8a6a48');
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; k.box(0.5, 0.06, 2.6, 6.2 + Math.cos(a) * 1.2, 5.4, 7.8 + Math.sin(a) * 1.2, '#3f8a3a', -a + Math.PI / 2, 0.45, 0); }   // a palm in the garden   // the pool
  },
  terrace(k, v) {   // Weymouth and Lyme: a tall painted house in a row along the front (its face +Z) - framed sash windows with sills, a bay
    // or an iron balcony on the first floor, a shopfront and awning on some, a cornice, the chimney stack and its pots
    const c = ['#f3d9a4', '#e9b4b0', '#bfe0e8', '#f4f1ea', '#c9e3b8', '#f0c987'][v % 6], fl = 3 + ((v >> 1) % 2), h = 1.4 + fl * 3.4;
    const trim = '#fbfaf6', gl = '#34505f', shop = v % 3 === 1, bay = v % 3 === 0, rail = v % 2 === 1;
    k.box(11.9, h, 9, 0, 0, 0, c);
    k.prism(9.6, 3, 12, 0, h, 0, ['#5a5f66', '#6b4a3a', '#4f5862'][v % 3], Math.PI / 2);
    k.box(1.4, 2.4, 1.4, 4.2, h + 1.2, 0, '#8a7a6a'); for (const x of [3.8, 4.2, 4.6]) k.cyl(0.11, 0.12, 0.55, 6, x, h + 3.6, 0, '#b0603a');   // the chimney stack, its pots
    k.box(12.1, 0.45, 0.55, 0, h - 0.55, 4.55, trim).box(11.9, 0.25, 0.25, 0, 3.6, 4.6, trim);   // the cornice, a string course over the ground floor
    const win = (x, y, w2) => { k.box(w2 + 0.35, 2.3, 0.1, x, y - 0.15, 4.5, trim).box(w2, 1.95, 0.14, x, y, 4.52, gl, 0, 0, 0, 'shiny').box(w2 + 0.45, 0.14, 0.34, x, y - 0.32, 4.62, trim).box(0.07, 1.95, 0.16, x, y, 4.56, trim).box(w2, 0.07, 0.16, x, y + 0.9, 4.56, trim); };   // frame, glass, sill, glazing bars
    for (let f = 1; f < fl; f++) for (let w = 0; w < 3; w++) { if (bay && w === 1 && f < 3) continue; win(-3.6 + w * 3.6, 4.3 + (f - 1) * 3.4, 1.45); }
    if (bay) {   // a bay window over two floors in the middle
      k.box(4.0, 6.6, 1.3, 0, 3.6, 5.1, c).box(4.3, 0.35, 1.5, 0, 10.2, 5.15, trim);
      for (let f = 0; f < 2; f++) { const y = 4.6 + f * 3.4; k.box(3.2, 2.1, 0.12, 0, y - 0.1, 5.78, gl, 0, 0, 0, 'shiny').box(3.5, 0.14, 0.3, 0, y - 0.25, 5.86, trim); for (const x of [-0.8, 0.8]) k.box(0.08, 2.1, 0.16, x, y - 0.1, 5.8, trim); }
    }
    if (rail) {   // a first-floor balcony with a black iron railing
      k.box(11.6, 0.16, 1.1, 0, 3.75, 5.0, trim);
      for (let x = -5.6; x <= 5.6; x += 0.35) k.box(0.04, 0.9, 0.04, x, 3.9, 5.5, '#1e2226');
      k.box(11.6, 0.06, 0.08, 0, 4.8, 5.5, '#1e2226');
    }
    if (shop) {   // a shopfront: big glass, a painted fascia, a striped awning out over the pavement
      const fc = ['#1d3557', '#7a1f2b', '#1f6f50', '#3a2a50'][v % 4];
      k.box(9.6, 2.6, 0.14, -0.6, 0.25, 4.5, '#e8d8b8').box(9.4, 2.4, 0.06, -0.6, 0.35, 4.6, '#9ab4c2', 0, 0, 0, 'shiny').box(11.9, 0.7, 0.2, 0, 2.85, 4.58, fc);   // a lit shop behind light glass (dark glass under the awning read as a black void)
      for (let i = 0; i < 6; i++) k.box(0.9, 0.7, 0.12, -4.6 + i * 1.6, 0.9, 4.56, ['#ff7eb6', '#ffd23f', '#3ec1ff', '#ff9a3c', '#7cff8a', '#ffffff'][(i + v) % 6]);   // things in the window
      for (let i = 0; i < 8; i++) k.box(1.4, 0.06, 1.7, -4.95 + i * 1.42, 2.75, 5.35, i % 2 ? '#ffffff' : fc, 0, -0.38, 0);
      k.box(1.2, 2.6, 0.14, 5.1, 0, 4.55, fc);
    } else {
      for (const w of [0, 2]) win(-3.6 + w * 3.6, 1.6, 1.45);
      k.box(1.3, 2.5, 0.1, 0, 0, 4.53, ['#1d3557', '#7a1f2b', '#1f6f50'][v % 3]).box(1.6, 0.5, 0.12, 0, 2.5, 4.53, trim).box(1.0, 0.35, 0.14, 0, 2.55, 4.55, gl, 0, 0, 0, 'shiny');   // the door, its fanlight
      k.box(1.8, 0.18, 0.7, 0, 0, 4.85, '#cfc8b8');   // the step
    }
  },
  clock(k) {   // Weymouth's Victorian clock tower on the front: painted iron, four faces, a pointed red roof
    k.box(2.8, 1, 2.8, 0, 0, 0, '#c8b89a').box(2.0, 8, 2.0, 0, 1, 0, '#2f6fb0');
    k.box(2.4, 2.4, 2.4, 0, 9, 0, '#f2e6c8');
    for (const [x, z, a, b] of [[0, 1.22, Math.PI / 2, 0], [0, -1.22, Math.PI / 2, 0], [1.22, 0, 0, Math.PI / 2], [-1.22, 0, 0, Math.PI / 2]]) { k.cyl(0.85, 0.85, 0.06, 18, x, 10.17, z, '#ffffff', a, b); k.cyl(0.08, 0.08, 0.08, 6, x * 1.03, 10.17, z * 1.03, '#111111', a, b); }
    k.cone(1.8, 3.2, 4, 0, 11.4, 0, '#c8382e'); k.cyl(0.07, 0.07, 1.2, 6, 0, 14.5, 0, '#d4af37');
  },
  priory(k) {   // Christchurch Priory, inland: the long church and its tall square tower with battlements
    const st = '#b9ad94', dk = '#9d927b';
    k.box(11, 36, 11, 0, 0, 0, st).box(44, 15, 15, -28, 0, 0, st).prism(15, 8, 44, -28, 15, 0, '#6e6a62', Math.PI / 2);
    for (let i = -5; i <= 5; i += 2) { k.box(1.4, 1.6, 1.4, i, 36, 5.2, dk).box(1.4, 1.6, 1.4, i, 36, -5.2, dk).box(1.4, 1.6, 1.4, 5.2, 36, i, dk).box(1.4, 1.6, 1.4, -5.2, 36, i, dk); }
    for (let i = 0; i < 6; i++) k.box(2, 6, 0.3, -46 + i * 7, 4, 7.6, '#3d4b55', 0, 0, 0, 'shiny');
  },
  cobb(k) {   // the Cobb at Lyme Regis: a long curving stone harbour arm out of the sea, a parapet along its seaward side, the round head
    // at the end, fishing boats tucked in behind it
    const R = 80, n = 40, r = rnd(77);
    for (let i = 0; i < n; i++) {
      const a = -0.15 + i * 0.04, x = Math.sin(a) * R, z = R - Math.cos(a) * R, c = i % 3 ? '#a8a08c' : '#9e9682';
      k.box(3.7, 8, 10, x, -3, z, c, -a).box(3.7, 2.2, 2.2, x + 4 * Math.sin(a), 5, z - 4 * Math.cos(a), shade(c, -0.08), -a).box(3.7, 1.2, 3, x - 4.6 * Math.sin(a), 3.2, z + 4.6 * Math.cos(a), shade(c, 0.06), -a);   // the arm, its parapet, the step down inside
    }
    const ae = -0.15 + n * 0.04, hx = Math.sin(ae) * R, hz = R - Math.cos(ae) * R;
    k.cyl(6, 7, 7.5, 16, hx, -3, hz, '#a49c88').cyl(6.2, 6.2, 0.4, 16, hx, 4.5, hz, '#8e8774');   // the round head
    for (let i = 0; i < 6; i++) { const a = 0.1 + i * 0.2, bx = Math.sin(a) * (R - 14), bz = R - Math.cos(a) * (R - 14);
      k.side([-2.5, 0.3, 2.8, 0.3, 3.2, 1.2, -2.6, 1.2], 1.6, bx, -0.3, bz, ['#ffffff', '#1d4ed8', '#d32f2f'][i % 3], 'shiny', 0.05); }
  },
  goldcap(k) {   // Golden Cap: the highest cliff on the south coast, a flat green top over a glowing gold face, grey-blue clay below
    const n0 = k.parts.lit ? k.parts.lit.length : 0;
    k.blob(42, 0, -6, 0, '#d39a34', 1.6, 1.15, 1.25, 121).blob(30, 30, -8, 20, '#c9902e', 1.5, 0.9, 1.2, 125);
    const clay = new THREE.Color('#5f6a76'), clay2 = new THREE.Color('#7a838c'), gold = new THREE.Color('#d9a043'), ochre = new THREE.Color('#c4852c'), cc = new THREE.Color(), gg = new THREE.Color();
    for (let q = n0; q < k.parts.lit.length; q++) {
      const g = k.parts.lit[q], p = g.attributes.position, c = g.attributes.color; let lo = 1e9, hi = -1e9;
      for (let i = 0; i < p.count; i++) { lo = Math.min(lo, p.getY(i)); hi = Math.max(hi, p.getY(i)); }
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), gt = Math.min(1, Math.max(0, (y - 0.55 * hi) / (0.2 * hi))), sgt = gt * gt * (3 - 2 * gt);
        cc.copy(clay).lerp(clay2, 0.5 + 0.5 * Math.sin(y * 0.9 + x * 0.07));
        gg.copy(gold).lerp(ochre, 0.5 + 0.5 * Math.sin(y * 0.6 + z * 0.05)); cc.lerp(gg, sgt).multiplyScalar(0.9 + 0.1 * Math.sin(x * 0.5 + y * 1.3 + z * 0.4));
        c.setXYZ(i, cc.r, cc.g, cc.b);
      }
    }
    k.blob(38, 0, 22, 0, '#6f9a45', 1.65, 0.3, 1.3, 123);
  },
  headland(k) {   // Hengistbury Head: a low flat heath-topped headland, its end a cliff of layered orange sand and ironstone
    k.blob(34, 0, -4, 0, '#c07a44', 2.4, 0.8, 1.4, 131, { rock: '#c8743a' });
    for (let i = 0; i < 4; i++) k.blob(33.6 - i * 0.2, 0, -6 + i * 3.2, 0, ['#b8683a', '#d08a4a', '#a85a32', '#c88048'][i], 2.42, 0.06, 1.42, 135 + i);   // the strata
    k.blob(32, 0, 10.5, 0, '#5a5a3a', 2.36, 0.26, 1.42, 133).blob(20, -20, 16, 10, '#6a5a3e', 1.8, 0.28, 1.3, 134);   // the heath on top
    for (let i = 0; i < 8; i++) k.cone(3, 7, 7, -50 + i * 12, 15 + (i % 3), -20 + (i % 4) * 9, '#2e4a2a');   // a few pines
  },
  longgroyne(k, v) {   // the Long Groyne off Hengistbury Head: big pale rock blocks out into the surf, a red beacon post at its end (+X out)
    const r = rnd(2600 + v);
    for (let x = 0; x < 40; x += 2.0) for (let j = 0; j < 3; j++) k.blob(1.3 + r() * 0.7, x + (r() - 0.5), -0.5 + j * 0.45 - x * 0.025, (r() - 0.5) * 3, ['#c9c0a8', '#b8ae96', '#d8d0bc'][(r() * 3) | 0], 1.25, 0.8, 1, 2610 + v * 70 + Math.round(x * 3) + j);
    k.cyl(0.18, 0.2, 5.5, 8, 40, 0, 0, '#1a1a1a').box(0.3, 2.2, 0.3, 40, 2.4, 0, '#d62828').box(1.6, 0.25, 0.3, 40, 5.4, 0, '#d62828');   // the beacon: a post, a red trapezoid top
    beam(k, [39.3, 5.5, 0], [39.7, 7.0, 0], 0.22, '#d62828'); beam(k, [40.7, 5.5, 0], [40.3, 7.0, 0], 0.22, '#d62828'); k.box(1.0, 0.22, 0.3, 40, 6.9, 0, '#d62828');
  },
  visitorcentre(k, v) {   // the visitor centre and its cafe at the Head: a low timber building with a green turf roof, a glazed end, tables out
    const r = rnd(2700);
    k.box(22, 4, 10, 0, 0, 0, '#8a6a48').box(22.6, 0.6, 10.6, 0, 4, 0, '#5a7a3a');
    for (let i = 0; i < 11; i++) k.box(0.12, 4, 0.1, -10.5 + i * 2.1, 0, 5.05, '#6a4e34');
    k.box(7, 3, 0.12, 7, 0.5, 5.06, '#3a5566', 0, 0, 0, 'shiny');
    for (let i = 0; i < 4; i++) { const x = -8 + i * 4; k.cyl(0.5, 0.5, 0.06, 8, x, 0.75, 8.5, '#6a4e34').cyl(0.05, 0.05, 2.3, 4, x, 0, 8.5, '#9a9a9a').cone(1.4, 0.45, 8, x, 2.2, 8.5, ['#2f6a3a', '#e8e4da'][i % 2]); }
    for (let i = 0; i < 5; i++) person(k, -9 + i * 4 + r(), 0, 10.5 + r(), r, false);
  },
  landtrain(k, v) {   // the little land train that takes people out to the sandbank: a green engine and three open carriages under
    // striped canopies, people aboard (along +Z)
    k.box(2, 1.4, 3.2, 0, 0.4, -6, '#2f6a3a', 0, 0, 0, 'shiny').box(1.9, 1.0, 1.6, 0, 1.8, -5.4, '#2f6a3a').box(1.8, 0.7, 0.1, 0, 2.0, -6.22, '#2a3a48', 0, 0, 0, 'shiny');
    k.cyl(0.18, 0.18, 1.2, 8, 0.5, 1.8, -7.1, '#c9a227');
    for (const [z, x] of [[-6.9, -0.9], [-6.9, 0.9], [-5.1, -0.9], [-5.1, 0.9]]) k.axle(0.35, 0.25, 10, x, 0.35, z, '#151515');
    for (let c = 0; c < 3; c++) {
      const z = -2 + c * 4.2, r = rnd(2800 + c);
      k.box(1.9, 0.5, 3.6, 0, 0.5, z, '#e8e4da').box(2.0, 0.08, 3.8, 0, 2.6, z, c % 2 ? '#d62828' : '#ffffff');
      for (const [x, zz] of [[-0.9, -1.7], [0.9, -1.7], [-0.9, 1.7], [0.9, 1.7]]) k.cyl(0.04, 0.04, 1.6, 4, x, 1.0, z + zz, '#9a9a9a');
      for (const x of [-0.85, 0.85]) k.axle(0.3, 0.2, 8, x, 0.3, z - 1.2, '#151515').axle(0.3, 0.2, 8, x, 0.3, z + 1.2, '#151515');
      for (let i = 0; i < 3; i++) person(k, (i - 1) * 0.55, 0.7, z + (r() - 0.5) * 2, r, r() < 0.3);
    }
  },
  dykes(k, v) {   // the Iron Age Double Dykes: two long grassy banks with a ditch between, running back from the road (+X), a stile and a sign
    for (const z of [-3.5, 3.5]) k.blob(16, 30, -12.5, z, '#7a8a48', 2.4, 0.95, 0.2, 2900 + (z > 0 ? 1 : 0), { smooth: true });
    for (let i = 0; i < 12; i++) k.cone(0.7, 0.9, 6, 8 + i * 4, 2.6 + (i % 2) * 0.3, (i % 2 ? 3.5 : -3.5), '#5a6a38');
    k.cyl(0.08, 0.08, 1.4, 5, 2, 0, 6, '#6a4e34').box(0.08, 0.5, 0.9, 2, 1.1, 6, '#6a4e34');
  },
  footbridge(k, v) {   // a white footbridge right over the road, people on it waving
    const col = '#eef2f4';
    for (const x of [-11.6, 11.6]) for (const z of [-1, 1]) k.box(0.55, 6.2, 0.55, x, 0, z, col);
    k.box(25, 0.4, 2.8, 0, 6, 0, col, 0, 0, 0, 'shiny');
    for (const z of [-1.35, 1.35]) { k.box(25, 0.14, 0.14, 0, 7.5, z, col); for (let i = -12; i <= 12; i += 1.5) k.box(0.1, 1.6, 0.1, i, 6.3, z, col, 0, 0, (i * 2) % 2 ? 0.55 : -0.55); }
    const r = rnd(300 + v); for (let i = 0; i < 7; i++) person(k, -9 + i * 3 + r() * 1.2, 6.4, (r() - 0.5) * 1.2, r, true);
  },
  viaduct(k) {   // a stone railway viaduct striding over the road: a big arch for the road, smaller ones either side
    const sh = new THREE.Shape(), arch = (x1, x0, h) => { sh.lineTo(x1, 0); sh.lineTo(x1, h); sh.absarc((x0 + x1) / 2, h, (x1 - x0) / 2, 0, Math.PI, false); sh.lineTo(x0, 0); };
    sh.moveTo(-48, 0); sh.lineTo(-48, 17); sh.lineTo(48, 17); sh.lineTo(48, 0);
    arch(44, 32, 3); arch(28, 16, 3); arch(11, -11, 3.5); arch(-16, -28, 3); arch(-32, -44, 3); sh.lineTo(-48, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 5.5, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -2.75); g.computeVertexNormals();
    k.put(g, '#c8bfaa', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'stone');
    k.box(96, 1.1, 6.4, 0, 17, 0, '#8f8774').box(96, 0.9, 0.3, 0, 18.1, 3.05, '#8f8774').box(96, 0.9, 0.3, 0, 18.1, -3.05, '#8f8774');
    // a little steam train on top: the engine (boiler, cab, chimney) and two green carriages
    k.box(12, 0.9, 2.4, -30, 18.1, 0, '#1c1c1c').axle(1.15, 8.5, 14, -31.5, 20.15, 0, '#1f2a22', 'shiny').box(3.4, 3, 2.7, -25.6, 19, 0, '#1f2a22', 0, 0, 0, 'shiny');
    k.cyl(0.38, 0.45, 1.5, 8, -35, 21, 0, '#151515');
    for (let i = 0; i < 2; i++) k.box(12.5, 3, 2.7, -16.5 + i * 13.4, 18.4, 0, '#3f5f3a', 0, 0, 0, 'shiny').box(12.6, 0.3, 2.8, -16.5 + i * 13.4, 21.4, 0, '#d9d4c4');
  },
  rockarch(k, v) {   // a natural arch of pale rock right over the road, as the coast's own arches are over the sea: lumpy legs, a thick
    // lintel, grass along the top
    const sh = new THREE.Shape(), q = rnd(410 + v), j = (a) => a + (q() - 0.5) * 2;
    sh.moveTo(-28, 0); [[-27, 8], [-24, 15], [-18, 20.5], [-9, 23.5], [0, 24], [9, 23], [18, 20], [24, 14], [27.5, 7]].forEach(([x, y]) => sh.lineTo(j(x), j(y))); sh.lineTo(28, 0);
    sh.lineTo(14.8, 0); sh.lineTo(14.8, 3.5); sh.absarc(0, 3.5, 14.8, 0, Math.PI, false); sh.lineTo(-14.8, 0); sh.lineTo(-28, 0);   // (the opening clear of the boundary, 14.2 out)
    const g = new THREE.ExtrudeGeometry(sh, { depth: 15, bevelEnabled: true, bevelThickness: 2.2, bevelSize: 1.4, bevelSegments: 2, curveSegments: 14 }); g.translate(0, 0, -7.5); g.computeVertexNormals();   // (deep: from the side a thin one read as a ring)
    k.put(g, '#d2c7ab', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'lit');   // (plain weathered rock: the masonry texture made it a bridge)
    for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) k.blob(3.8 + q() * 2.4, sd * (21 + q() * 3), 2 + i * 4.2, (q() - 0.5) * 13, '#cfc4a8', 1, 1.2, 1, 430 + v * 9 + i + (sd > 0 ? 5 : 0));   // lumps on the legs
    for (let i = 0; i < 4; i++) k.blob(4 + q() * 2, (q() - 0.5) * 30, 20 + q() * 3, (q() - 0.5) * 12, '#d6ccb2', 1.3, 0.7, 1, 450 + v * 9 + i);   // and over the top
    k.blob(9, 0, 22.6, 0, '#6f9a45', 1.8, 0.32, 1.0, 440 + v);   // grass on top (hugging the rock: wider and thinner, from below it read as a green line in the sky)
  },
  treearch(k, v) {   // old trees either side of the lane, their crowns meeting over the road: a green tunnel 60 m long to drive through.
    // The crowns are solid lumpy balls of leaves (leaf cards, seen from right underneath, showed as flat planks across the sky)
    const c = v % 2 ? AUT[(v >> 1) % 3] : GRN, q = rnd(450 + v * 3);
    for (let z = -28; z <= 28; z += 8) for (const sd of [-1, 1]) {
      const x = sd * (15.4 + q() * 1.4), zz = z + (q() - 0.5) * 3;
      k.cyl(0.42, 0.72, 10, 8, x, 0, zz, '#5a4632', 0, sd * 0.2);   // the trunk, leaning in over the road
      k.cyl(0.18, 0.3, 7, 6, x - sd * 2.8, 7.2, zz, '#5a4632', 0, sd * 0.95);   // a bough reaching across
    }
    for (let z = -30; z <= 30; z += 4.5) for (const lx of [-12, -6.5, -1.5, 3.5, 8.5, 13]) {   // the canopy: overlapping lumps, highest over the middle of the road
      const x = lx + (q() - 0.5) * 2.5, y = 12.2 - Math.abs(x) * 0.16 + q() * 1.6;
      k.blob(2.5 + q() * 1.3, x, y, z + (q() - 0.5) * 2.5, c[(q() * 3) | 0], 1.25, 0.72, 1.15, 600 + v * 97 + Math.round(z * 7 + lx * 3));
    }
  },
  strollers(k, v) {   // people out along the front: a loose group, some waving at the cars going by, sometimes with a dog
    const r = rnd(700 + v * 13), n = 4 + (v % 4);
    for (let i = 0; i < n; i++) person(k, (r() - 0.5) * 5.5, 0, (r() - 0.5) * 2.8, r, r() < 0.3);
    if (v % 3 === 0) { const dc = ['#3a2a1e', '#d8c8a8', '#111111'][(v >> 2) % 3], dx = 1.6, dz = 1.2;
      k.box(0.24, 0.26, 0.6, dx, 0.22, dz, dc).box(0.2, 0.2, 0.26, dx, 0.42, dz - 0.36, dc).box(0.05, 0.05, 0.28, dx, 0.42, dz + 0.38, dc, 0, 0.6);
      for (const [lx, lz] of [[-0.08, -0.22], [0.08, -0.22], [-0.08, 0.22], [0.08, 0.22]]) k.box(0.06, 0.22, 0.06, dx + lx, 0, dz + lz, dc); }
  },
  deckchairs(k, v) {   // a patch of beach: a striped windbreak, deckchairs with people in them, someone on a towel, a bucket
    const r = rnd(740 + v * 7), C = [['#e63946', '#ffffff'], ['#1d7fd6', '#ffffff'], ['#2a9d8f', '#ffd23f'], ['#ff7eb6', '#ffffff']][v % 4];
    for (let i = 0; i < 6; i++) k.box(0.55, 1.0, 0.03, -1.4 + i * 0.55, 0.05, -1.3, i % 2 ? C[1] : C[0]);   // the windbreak, behind
    for (let i = 0; i < 6; i++) k.cyl(0.025, 0.025, 1.2, 4, -1.68 + i * 0.67, 0, -1.33, '#c9a46a');
    const n = 2 + (v % 3);
    for (let i = 0; i < n; i++) { const x = -1.2 + i * 1.05; deckchair(k, x, 0, C[0], C[1]); if (r() < 0.75) sitter(k, x, 0.05, -0.05, r); }
    lyer(k, 2.2 + r() * 0.6, 0.6, r);
    k.cyl(0.12, 0.09, 0.2, 7, -1.9, 0, 0.9, ['#ff3b30', '#ffd60a', '#0a84ff'][v % 3]);   // a bucket
    if (v % 2) k.ball(0.2, 1.0, 0.2, 1.4, '#ffffff', 1, 1, 1, 'lit', 8).ball(0.205, 1.0, 0.2, 1.4, C[0], 1, 1, 0.35, 'lit', 8);   // a beach ball
  },
  motorboat(k, v) {   // a little speedboat out on the bay, bow to -Z, a white wake behind it
    const hull = ['#f4f6f8', '#1d3557', '#c62828', '#f4f6f8'][v % 4], trim = ['#1d7fd6', '#f4f6f8', '#f4f6f8', '#e63946'][v % 4];
    k.side([-2.6, 0, 2.4, 0, 3.4, 0.9, -2.7, 0.9], 1.9, 0, -0.2, 0, hull, 'shiny', 0.06);
    k.box(1.94, 0.14, 5.4, 0, 0.5, 0.1, trim);
    k.box(1.5, 0.5, 0.06, 0, 0.7, -0.8, '#bcd7e6', 0, 0.5, 0, 'shiny');   // the windscreen
    person(k, 0.25, 0.2, 0.2, rnd(31 + v), v % 2 === 0);
    k.box(2.2, 0.03, 10, 0, -0.12, 7.6, '#eef6f8').box(1.0, 0.04, 6, 0, -0.1, 5.4, '#ffffff');   // the wake
  },
  marina(k, v) {   // a pontoon along the shore with yachts moored either side: a forest of masts (v 3+: at night, lit)
    const night = v >= 3, r = rnd(800 + v), wood = night ? '#4a4038' : '#9a8266';
    k.box(2, 0.3, 44, 0, 0.1, 0, wood);
    for (let z = -20; z <= 20; z += 5) { k.box(4.6, 0.25, 0.7, 3.3, 0.1, z, wood); for (const sd of [-1, 1]) k.cyl(0.16, 0.16, 2.2, 5, sd * 1.05, -1.4, z, '#3a3028'); }   // the fingers, the piles
    for (let z = -17.5; z <= 17.5; z += 5) for (const off of [0, 2.5]) if (r() < 0.85) moored(k, 1.2, z + off, 8 + r() * 3, r, night);   // (all out on the seaward side, +X)
    if (night) for (let z = -20; z <= 20; z += 10) k.box(0.2, 0.2, 0.2, 0, 1.2, z, '#ffe2a0', 0, 0, 0, 'glow').cyl(0.06, 0.06, 1, 4, 0, 0.3, z, '#2a2e36');
  },
  quaylight(k) { k.cyl(0.12, 0.16, 1.0, 6, 0, 0, 0, '#2a2e36').box(0.24, 0.24, 0.24, 0, 1.0, 0, '#ffe2a0', 0, 0, 0, 'glow'); },   // a lamp on the quay's edge
  ponies(k, v) {   // New Forest ponies grazing by the road, a foal with them
    const r = rnd(900 + v), cols = ['#6b4423', '#3a2a1e', '#9a8a7a', '#c8a070'];
    const n = 2 + (v % 2);
    for (let i = 0; i < n; i++) ponyAt(k, (i - (n - 1) / 2) * 2.6 + (r() - 0.5), (r() - 0.5) * 2.5, cols[(v + i) % 4], 1, r() < 0.6);
    ponyAt(k, 1.4, 1.8, cols[(v + 1) % 4], 0.62, false);
  },
  caravan(k, v) {   // a static holiday caravan on the clifftop: cream with a coloured band, windows, a little step
    const band = ['#2a9d8f', '#1d7fd6', '#c0392b', '#7a8a3a'][v % 4];
    k.box(3.3, 2.6, 9, 0, 0.45, 0, '#f2eee2').box(3.34, 0.35, 9.04, 0, 1.25, 0, band).box(3.5, 0.2, 9.2, 0, 3.05, 0, '#d8d4c8');
    for (const z of [-3, -0.5, 2.5]) for (const sd of [-1, 1]) k.box(0.06, 0.9, 1.6, sd * 1.67, 1.75, z, '#3a5566', 0, 0, 0, 'shiny');
    k.box(0.06, 1.9, 0.8, 1.67, 0.5, 1.1, '#cfc8b8').box(0.7, 0.3, 0.9, 2.05, 0, 1.1, '#9a9488');
    k.box(3.1, 0.45, 8.6, 0, 0, 0, '#5a5650');
  },
  kiosk(k, v) {   // a seaside ice-cream kiosk with a striped awning and a sandwich board, people queueing
    const c = ['#ff7eb6', '#3ec1ff', '#ffd23f'][v % 3], r = rnd(960 + v);
    k.box(3.2, 2.5, 2.4, 0, 0, 0, '#f6f2ea').box(3.4, 0.3, 2.6, 0, 2.5, 0, c).box(2.6, 1.0, 0.08, 0, 1.0, 1.21, '#2a3a48', 0, 0, 0, 'shiny');
    for (let i = 0; i < 7; i++) k.box(0.48, 0.05, 1.0, -1.45 + i * 0.48, 2.3, 1.6, i % 2 ? '#ffffff' : c, 0, -0.35, 0);
    k.cone(0.45, 1.1, 10, 0, 2.8, 0, '#e8b860').ball(0.42, 0, 4.0, 0, '#ffd8e6', 1, 0.9, 1, 'lit', 10);   // a giant cone on the roof
    k.box(0.6, 0.9, 0.05, 1.9, 0, 2.2, c, 0, 0.35, 0);
    for (let i = 0; i < 3; i++) person(k, -1 + i * 0.9, 0, 2.4 + i * 0.5, r, false);
  },
  drywall(k, v) {   // a length of dry-stone field wall, a little crooked, a gap with a wooden gate in it
    const r = rnd(980 + v), c = ['#b8b0a0', '#c9c1ae', '#a89f8c'][v % 3];
    for (let i = 0; i < 6; i++) { if (i === 3) { for (let b = 0; b < 4; b++) k.box(0.06, 0.06, 3.4, 0, 0.25 + b * 0.25, i * 3.6 - 9, '#8a6a48'); continue; }
      k.box(0.6, 1.0 + r() * 0.2, 3.7, (r() - 0.5) * 0.3, 0, i * 3.6 - 9, c, (r() - 0.5) * 0.1, 0, 0, 'stone').box(0.7, 0.18, 3.7, 0, 1.05, i * 3.6 - 9, shade(c, -0.15), 0, 0, 0, 'stone'); }
  },
  pierarch(k, v) {   // Bournemouth's pier entrance, made a gateway over the road: two cream pavilion towers with green domes, an iron arch between
    const cream = '#f2ead8', green = '#5e8c7a';
    for (const sd of [-1, 1]) {
      const x = sd * 15.6;
      k.box(4, 9, 4, x, 0, 0, cream).box(4.4, 0.5, 4.4, x, 9, 0, '#e2d8c2').cyl(1.9, 2.1, 1.4, 14, x, 9.5, 0, cream);
      k.put(new THREE.SphereGeometry(2.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), green, x, 10.9, 0).cyl(0.12, 0.12, 2, 6, x, 13, 0, '#e8e4da');
      for (const y of [2.5, 6]) k.box(0.1, 2.2, 1.6, x - sd * 2.02, y, 0, '#3a5566', 0, 0, 0, 'shiny');
    }
    for (let i = 0; i <= 24; i++) { const u = i / 24 * 2 - 1, a0 = Math.asin(Math.max(-1, Math.min(1, u))); const x = u * 13.6, y = 8.2 + Math.cos(a0) * 3.2;
      if (i < 24) { const u2 = (i + 1) / 24 * 2 - 1, x2 = u2 * 13.6, y2 = 8.2 + Math.cos(Math.asin(Math.max(-1, Math.min(1, u2)))) * 3.2; k.box(Math.hypot(x2 - x, y2 - y) + 0.05, 0.35, 0.35, (x + x2) / 2, (y + y2) / 2 - 0.17, 0, '#2f5a4f', 0, 0, Math.atan2(y2 - y, x2 - x)); }
      if (i % 3 === 0) k.box(0.08, y - 7.4, 0.08, x, 7.4, 0, '#2f5a4f'); }
    k.box(27.4, 0.4, 0.4, 0, 7.2, 0, '#2f5a4f');
    k.cyl(1.1, 1.1, 0.2, 18, 0, 11.6, 0, '#e2c25a', Math.PI / 2, 0);   // a gilded crest at the top
    for (let i = 0; i < 14; i++) k.ball(0.18, -12.6 + i * 1.94, 7.0, 0.3, '#fff3c0', 1, 1, 1, 'glow', 6);   // a row of bulbs under the arch
  },
  liftbridge(k, v) {   // the harbour's lifting bridge, open: two tall white leaves raised either side of the road like sails, blue light at their feet
    for (const sd of [-1, 1]) {
      const x = sd * 15.4;
      k.box(4, 3, 7, x, 0, 0, '#d8dce0');
      k.side([-3.2, 0, 3.2, 0, 0.6, 20], 1.2, x + sd * 0.4, 3, 0, '#f4f6f8', 'shiny');   // the raised leaf, a tall white triangle
      k.box(0.3, 17, 0.3, x - sd * 0.4, 3, 0.4, '#c8ccd2', 0, 0, sd * 0.14);
      k.box(4.2, 0.4, 7.2, x, 2.8, 0, '#3ec1ff', 0, 0, 0, 'glow');   // light at the foot
    }
    k.box(27, 0.8, 4, 0, 13.2, 0, '#d8dce0').box(27, 0.3, 4.1, 0, 13.0, 0, '#3ec1ff', 0, 0, 0, 'glow');   // the gantry over the road, lit underneath
  },
  carpark(k, v) {   // a clifftop car park: gravel, a row of parked cars, a pay machine, people heading off for a walk
    const r = rnd(1000 + v * 3), cols = ['#d62828', '#1d4ed8', '#f4f4f4', '#2b2d42', '#f2c14e', '#2a9d8f', '#8d99ae', '#e76f51'];
    k.box(20, 0.08, 9, 0, -0.02, 0, '#bdb4a2');
    for (let i = 0; i < 6; i++) { if (r() < 0.2) continue; const x = -8 + i * 3.2, c = cols[(r() * 8) | 0];
      k.box(1.8, 0.75, 4.1, x, 0.32, 0, c, 0, 0, 0, 'shiny').box(1.6, 0.6, 2.1, x, 1.07, 0.2, shade(c, -0.1)).box(1.62, 0.45, 1.9, x, 1.12, 0.2, '#2a3a48', 0, 0, 0, 'shiny');
      for (const [wx, wz] of [[-0.85, -1.3], [0.85, -1.3], [-0.85, 1.3], [0.85, 1.3]]) k.axle(0.33, 0.24, 10, x + wx, 0.33, wz, '#151515');
      if (r() < 0.4) k.box(1.4, 0.4, 0.9, x, 1.67, 0.2, ['#c62828', '#e8e4da', '#3a3a3a'][(r() * 3) | 0]); }   // a roof box or bikes
    k.box(0.5, 1.5, 0.4, 9.5, 0, 3.5, '#2a5a8a').box(0.4, 0.3, 0.06, 9.5, 1.1, 3.72, '#c8d8e8', 0, 0, 0, 'shiny');
    for (let i = 0; i < 2 + (v % 2); i++) person(k, 7.5 + i * 0.8, 0, 5 + r(), r, false);
  },
  picnic(k, v) {   // a picnic table on the grass, a family sat round it
    const r = rnd(1040 + v);
    k.box(1.8, 0.08, 0.8, 0, 0.72, 0, '#9a7a52');
    for (const sd of [-1, 1]) { k.box(1.8, 0.06, 0.3, 0, 0.42, sd * 0.68, '#8a6a48'); k.box(0.08, 0.72, 1.7, sd * 0.75, 0, 0, '#7a5c3c', 0, sd * 0.35, 0); }
    for (let i = 0; i < 2 + (v % 2); i++) { const z = i % 2 ? 0.75 : -0.75; sitter(k, -0.5 + (i >> 1), 0.12, z, r); }
    k.box(0.4, 0.3, 0.3, 0.3, 0.8, 0, '#d8c8a8');   // a hamper
    if (v % 2) for (let i = 0; i < 1; i++) person(k, 2.0, 0, 0.8, r, true);
  },
  chairlift(k, v) {   // a clifftop chairlift crossing over the road: two lattice towers, the cables, open chairs with people riding
    const r = rnd(1100 + v), steel = '#5a6470';
    for (const sd of [-1, 1]) { const x = sd * 15.8;
      for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) k.box(0.18, 12, 0.18, x + dx * 0.6, 0, dz * 0.6, steel, 0, dx * 0.05, -dz * 0.05);
      for (let y = 2; y < 12; y += 2.5) k.box(1.0, 0.1, 0.1, x, y, -0.45, steel).box(1.0, 0.1, 0.1, x, y, 0.45, steel);
      k.box(1.2, 0.5, 4.6, x, 12, 0, '#c8462a'); }
    for (const z of [-2, 2]) k.box(31.6, 0.06, 0.06, 0, 11.4 - (z > 0 ? 0.6 : 0), z, '#2a2a2a');
    for (let i = 0; i < 6; i++) { const z = i % 2 ? 2 : -2, x = -12 + i * 4.8 + (r() - 0.5), y = 10.6 - (z > 0 ? 0.6 : 0);
      k.box(0.05, 1.6, 0.05, x, y - 1.6, z, '#2a2a2a').box(1.3, 0.12, 0.6, x, y - 2.3, z, ['#2a9d8f', '#e9c46a', '#e76f51'][i % 3]).box(1.3, 0.6, 0.08, x, y - 2.3, z - 0.3, ['#2a9d8f', '#e9c46a', '#e76f51'][i % 3]);
      if (r() < 0.75) { person(k, x - 0.25, y - 3.15, z, r, r() < 0.5); if (r() < 0.5) person(k, x + 0.3, y - 3.15, z, r, false); } }
  },
  craneway(k, v) {   // a quarry's travelling crane spanning the road: two braced legs, a girder across, the crab and hook, a block of stone hanging
    const y0 = '#d9a400', rust = '#8a5a3a';
    for (const sd of [-1, 1]) { const x = sd * 15.6;
      k.box(0.6, 11, 0.6, x, 0, -2, y0).box(0.6, 11, 0.6, x, 0, 2, y0).box(0.3, 0.3, 4, x, 5.5, 0, y0).box(0.3, 4.6, 0.3, x, 3.2, 0, y0, 0, 0.8, 0);
      k.box(1.4, 0.8, 5, x, 0, 0, '#3a3a3a'); }
    k.box(33, 1.2, 1.2, 0, 11, -1.4, y0).box(33, 1.2, 1.2, 0, 11, 1.4, y0);
    for (let x = -15; x <= 15; x += 2.5) k.box(0.15, 1.2, 2.6, x, 11, 0, y0, 0, 0.6, 0);
    k.box(3, 1.6, 3.6, 4, 12.2, 0, rust).box(1.6, 1.2, 1.4, 4, 13.8, 0, '#2a3a48', 0, 0, 0, 'shiny');   // the crab, its cab
    k.box(0.05, 3.2, 0.05, 4, 8, 0, '#2a2a2a').box(2.6, 1.4, 1.6, 4, 6.6, 0, '#e8e2d2', 0, 0.2, 0, 'stone');   // a block of Portland stone on the hook
  },
  hutrow(k, v) {   // a terrace of seven beach huts along the promenade at the cliff's foot (faces -X, the road), the stone toe wall behind
    const r = rnd(1200 + v * 7);
    for (let i = 0; i < 7; i++) { const z = -6.9 + i * 2.3, white = v % 3 === 2; hutAt(k, z, white ? '#f6f6f2' : BHUT[(r() * BHUT.length) | 0], '#ffffff', true);
      if (white) k.box(0.06, 1.85, 1.5, -1.24, 0.3, z, ['#2a9d8f', '#1d4ed8', '#2f8a6a'][v % 3]); }
    k.box(0.8, 1.3, 16.4, 2.2, -0.3, 0, '#b9b1a2', 0, 0, 0, 'stone').box(0.9, 0.15, 16.4, 2.2, 1.0, 0, '#a59c8a', 0, 0, 0, 'stone');
  },
  clifflift(k, v) {   // a cliff lift: two little cars on an incline railway up the cliff face, a station at the foot and one at the top (+X up the cliff)
    const H = 30, X1 = 1.2, X2 = 20.6, ang = Math.atan2(H, X2 - X1), L = Math.hypot(H, X2 - X1);
    for (const z of [-2.4, 2.4]) {
      beam(k, [X1, 0.2, z - 0.7], [X2, H + 0.2, z - 0.7], 0.14, '#3a3f45'); beam(k, [X1, 0.2, z + 0.7], [X2, H + 0.2, z + 0.7], 0.14, '#3a3f45');   // the rails
      beam(k, [X1, -0.3, z], [X2, H - 0.3, z], 1.9, '#9a958a');   // the track bed
      const f = z < 0 ? 0.22 : 0.7, cx = X1 + (X2 - X1) * f, cy = H * f;   // a car on each track, stepped to stay level
      k.box(2.6, 2.5, 2.0, cx, cy + 0.3, z, ['#f2ead0', '#d8e8f0'][v % 2]).box(2.7, 0.3, 2.1, cx, cy + 2.8, z, '#2f6a5a').box(0.06, 1.0, 1.6, cx - 1.31, cy + 1.3, z, '#2a3a48', 0, 0, 0, 'shiny');
    }
    k.box(4.2, 3.4, 9, -1.2, 0, 0, '#f4f2ec').box(4.6, 0.4, 9.4, -1.2, 3.4, 0, '#2f6a5a').box(0.1, 1.8, 4, -3.32, 0.4, 0, '#2a3a48', 0, 0, 0, 'shiny');   // the station at the foot
    k.box(5, 3.6, 9, X2 + 2.4, H - 4, 0, '#f4f2ec').box(5.4, 0.4, 9.4, X2 + 2.4, H - 0.4, 0, '#2f6a5a').box(6, 4, 9, X2 + 2.4, H - 8, 0, '#cfc6b0');   // and at the top, on its plinth
  },
  zigzag(k, v) {   // a zig-zag path climbing the cliff face, a low timber fence on its outer edge
    const H = 30, X1 = 1.5, X2 = 20.5, n = 5;
    for (let i = 0; i < n; i++) {
      const xa = X1 + (X2 - X1) * i / n, xb = X1 + (X2 - X1) * (i + 1) / n, ya = H * i / n * (i ? 1 : 0.4), yb = H * (i + 1) / n, za = i % 2 ? 9 : -9;
      beam(k, [xa + 0.6, ya + 0.1, za], [xb + 0.6, yb + 0.1, -za], 1.6, '#d9c9a0');
      beam(k, [xa - 0.3, ya + 0.7, za], [xb - 0.3, yb + 0.7, -za], 0.08, '#8a6a48');
    }
  },
  groyne(k, v) {   // a timber groyne out through the surf: a line of weathered posts and planking, running seaward (+X)
    for (let x = 0; x < 42; x += 1.4) k.box(0.3, 4.2 - x * 0.04, 0.3, x, -3, 0, x % 2.8 < 1.4 ? '#4a3c30' : '#5a4a3a');
    for (const y of [-0.6, 0.1]) k.box(42, 0.35, 0.12, 21, y, 0.2, '#5a4a3a');
  },
  lifeguard(k, v) {   // a lifeguard hut on stilts, the red-and-yellow flags either side
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box(0.15, 1.4, 0.15, x, 0, z, '#d8d8d2');
    k.box(2.6, 2, 2.6, 0, 1.4, 0, '#d62828').box(2.9, 0.25, 2.9, 0, 3.4, 0, '#ffd23f').box(0.06, 0.8, 1.8, -1.31, 2.2, 0, '#2a3a48', 0, 0, 0, 'shiny');
    for (const z of [-6, 6]) { k.cyl(0.05, 0.05, 4, 5, 0, 0, z, '#e8e4da'); k.box(0.04, 0.5, 1.0, 0, 3.4, z + 0.5, '#d62828').box(0.04, 0.5, 1.0, 0, 2.9, z + 0.5, '#ffd23f'); }
  },
  mooring(k, v) {   // a yacht at her mooring in the harbour: hull, cabin, mast, the sail furled on the boom, a buoy at the bow
    const r = rnd(1300 + v * 11), hull = ['#ffffff', '#f4f4f0', '#1d3557', '#e9eef0', '#7a1f2b', '#ffffff'][v % 6], L = 8 + (v % 3) * 2;
    k.side([-L / 2, 0, L / 2 - 0.6, 0, L / 2 + 0.6, 1.1, -L / 2 - 0.2, 1.1], 2.6, 0, -0.3, 0, hull, 'shiny', 0.08);
    k.box(2.0, 0.6, L * 0.35, 0, 0.8, 0.4, '#eef0f0').box(1.9, 0.18, L * 0.33, 0, 1.15, 0.4, '#3a5566', 0, 0, 0, 'shiny');
    const m = L * 1.35; k.cyl(0.05, 0.07, m, 4, 0, 0.8, -0.6, '#d0d0d0').roll(0.16, L * 0.45, 6, 0, 2.0, 0.6, ['#1d4e89', '#7a1f2b', '#1f6f50', '#e8e4da'][v % 4]);
    k.cyl(0.35, 0.35, 0.5, 8, 0, -0.2, -L / 2 - 2.5, ['#ff7a1a', '#ffd23f'][v % 2]);
    if (r() < 0.4) k.side([-1.4, 0, 1.6, 0, 1.8, 0.5, -1.5, 0.5], 1.2, 0.2, -0.2, L / 2 + 1.6, '#3a3a3a', 'shiny', 0.04);   // a tender astern
  },
  jetty(k, v) {   // a private timber jetty out from a garden into the harbour (+X out), a ladder at the end, sometimes a RIB tied up
    const L = 14 + (v % 3) * 5, wood = '#a58a68';
    k.box(L, 0.25, 2.0, L / 2, 0.9, 0, wood);
    for (let x = 1; x <= L; x += 2.5) for (const z of [-0.9, 0.9]) k.cyl(0.13, 0.13, 3.4, 5, x, -2.4, z, '#5a4a3a');
    for (const z of [-0.95, 0.95]) k.box(L, 0.08, 0.08, L / 2, 1.9, z, '#e8e4da');
    if (v % 2) { k.side([-2.4, 0, 2.6, 0, 3.2, 0.8, -2.5, 0.8], 2.0, L - 2, -0.2, 2.4, '#2a2a2a', 'shiny', 0.1); k.box(1.6, 0.5, 1.8, L - 2.4, 0.5, 2.4, '#d8d8d2'); }
  },
  marram(k, v) {   // a sand dune by the road, marram grass in clumps along its top (Sandbanks beach, Shell Bay)
    const r = rnd(1400 + v * 5);
    k.blob(4.5, 0, -2.6, 0, '#ead9ae', 2.2, 0.85, 1.3, 1410 + v, { smooth: true });
    for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * 16, z = (r() - 0.5) * 8, y = Math.max(0, 1.1 - (x * x) / 70 - (z * z) / 30);
      const c = ['#b8b878', '#a8ad6a', '#c8c48a', '#9aa060'][i % 4];
      k.card(1.3, 1.1, x, y + 0.45, z, c, r() * 3, 0, 'grass', 'up').card(1.3, 1.1, x, y + 0.45, z, c, r() * 3 + 1.5, 0, 'grass', 'up'); }
    if (v % 3 === 0) { k.cyl(0.04, 0.04, 1, 4, 3, 0.6, 2.5, '#9a8a6a'); for (let i = 0; i < 5; i++) k.box(0.04, 0.9, 0.04, 3 + i * 1.6, 0.6, 2.5 - i * 0.3, '#9a8a6a'); }   // a rope fence post or two
  },
  rockgroyne(k, v) {   // a groyne of big granite boulders running out through the surf (+X out to sea)
    const r = rnd(1500 + v);
    for (let x = 0; x < 34; x += 2.2) for (let j = 0; j < 2; j++) k.blob(1.2 + r() * 0.6, x + (r() - 0.5), -0.6 + j * 0.5 - x * 0.03, (r() - 0.5) * 2.4, ['#8f8a84', '#a09a92', '#7d7872'][(r() * 3) | 0], 1.2, 0.8, 1, 1510 + v * 50 + Math.round(x * 3) + j);
  },
  haven(k, v) {   // the hotel at the point of Sandbanks by the ferry: long, white, three storeys, steep terracotta roofs and gables, a round
    // corner with a conical roof, a glazed terrace looking over the harbour mouth (+Z the road, +X towards the ferry)
    const W = '#f8f6f0', roof = '#b8452e', gl = '#33475a';
    k.box(46, 10, 14, 0, 0, 0, W).prism(15, 5, 47, 0, 10, 0, roof, Math.PI / 2);
    for (let f = 0; f < 3; f++) for (let w = 0; w < 11; w++) k.box(2.2, 1.7, 0.12, -20 + w * 4, 1.2 + f * 3.1, 7.05, gl, 0, 0, 0, 'shiny');
    for (const x of [-14, -2, 10]) { k.box(6, 4, 2, x, 9, 6.6, W).prism(6.6, 3.2, 2.6, x, 13, 6.6, roof); k.box(3, 2, 0.12, x, 10, 7.62, gl, 0, 0, 0, 'shiny'); }   // gables on the roof
    k.cyl(6, 6, 11, 18, 24, 0, 2, W).cone(6.8, 6, 18, 24, 11, 2, roof);   // the round corner
    for (let f = 0; f < 3; f++) for (let a = 0; a < 6; a++) { const t = -0.6 + a * 0.45; k.box(0.12, 1.7, 1.8, 24 + Math.sin(t) * 6.02, 1.2 + f * 3.1, 2 + Math.cos(t) * 6.02, gl, t + Math.PI / 2, 0, 0, 'shiny'); }
    k.box(30, 3.2, 6, -6, 0, 10, '#eceae4').box(29.6, 2.4, 0.12, -6, 0.4, 13.05, '#5a7a8a', 0, 0, 0, 'shiny').box(30.6, 0.3, 6.6, -6, 3.2, 10, '#e2ded4');   // the glazed terrace
    k.cyl(0.08, 0.1, 9, 6, -22, 10, 3, '#e8ecea').box(2.2, 1.3, 0.05, -20.8, 17.4, 3, '#1d4e89');
    k.box(52, 1.1, 0.5, 2, 0, 16, W);
  },
  ferryqueue(k, v) {   // the slipway down to the chain ferry and the queue for it: a lane of cars, the ticket booth, a blue sign with a ferry on it
    const r = rnd(1600 + v), cols = ['#d62828', '#1d4ed8', '#f4f4f4', '#2b2d42', '#f2c14e', '#2a9d8f', '#8d99ae', '#e76f51', '#c0c4c8'];
    for (let i = 0; i < 7; i++) carShape(k, 0, -4 - i * 5.6, cols[(r() * cols.length) | 0], v ? 2.2 : 0);   // (v 1: up on the slipway's apron, in the crossing)
    k.box(2.4, 2.6, 3, 3.2, 0, 2, '#f4f2ec').box(2.8, 0.3, 3.4, 3.2, 2.6, 2, '#1d4e89').box(0.08, 1, 2, 1.96, 1.2, 2, '#2a3a48', 0, 0, 0, 'shiny');   // the booth
    k.cyl(0.08, 0.08, 3.6, 6, -2.6, 0, 4, '#9aa0a6').box(0.08, 1.6, 2.6, -2.6, 2.4, 4, '#1d5fa8');
    k.box(0.1, 0.5, 1.6, -2.66, 2.8, 4, '#ffffff').box(0.1, 0.35, 0.5, -2.66, 3.25, 4, '#ffffff');   // the ferry pictogram
    k.box(0.12, 0.12, 4, 1.4, 1.0, 6, '#e8c02a', 0, 0, 0.0);   // the barrier
  },
  slipland(k) {   // the Sandbanks end, from the ferry: the point of the spit, its sea wall, the slipway down into the water (towards -Z)
    k.box(340, 2.2, 110, 0, 0, 55, '#d8cfb8').box(60, 0.3, 60, 4, 2.2, 30, '#bfb8a6');   // the land and its apron
    k.box(16, 0.6, 28, 2, 0.2, -12, '#8a8a84', 0, -0.14, 0);   // the slipway, down to the water
    k.box(340, 2.6, 1.2, 0, -0.4, 0.4, '#e8e4da');   // the sea wall
    for (let i = 0; i < 16; i++) k.blob(2 + (i % 3) * 0.6, (i < 8 ? -90 : 30) + (i % 8) * 6, -0.4, -2, '#8f8a84', 1.2, 0.7, 1, 1720 + i);
  },
  brownsea(k, v) {   // Brownsea Island across the harbour: low and wooded with pines, a little castle with a tower at the water's edge, a quay
    k.blob(70, 0, -40, 0, '#3e5a34', 2.6, 0.62, 1.3, 1701, { smooth: true }).blob(40, 60, -18, 30, '#4a6a3c', 1.6, 0.6, 1.0, 1703, { smooth: true });
    const r = rnd(1705); for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 300, z = (r() - 0.5) * 140, y = Math.max(0, 6 - (x * x) / 9000 - (z * z) / 3000) * 1.6; k.cone(6 + r() * 4, 14 + r() * 8, 7, x, y, z, ['#2e4a2a', '#36522e', '#2a4426'][i % 3]); }
    k.box(24, 9, 14, -120, 0, 60, '#cfc6b0', 0, 0, 0, 'stone').box(7, 15, 7, -128, 0, 58, '#c9c0aa', 0, 0, 0, 'stone');   // the castle
    for (let i = 0; i < 6; i++) k.box(1.6, 1.4, 1, -132 + i * 4, 9, 67.2, '#c9c0aa', 0, 0, 0, 'stone');
    k.box(30, 1.2, 6, -110, -0.4, 74, '#8a7a62');   // the quay
  },
  quayfront(k, v) {   // the buildings along Poole Quay (their fronts +Z, to the road), lit at night: a mock-Tudor pub, a brick
    // warehouse, apartments, Georgian buildings with restaurants (from the owner's quay footage)
    const r = rnd(1900 + v * 17), t = v % 4;
    if (t === 0) quayPub(k, r); else if (t === 1) quayWarehouse(k, r); else if (t === 2) quayFlats(k, r, v); else quayTerrace(k, r);
  },
  customhouse(k) {   // the old custom house on the quay: Georgian red brick, a double flight of steps up to a doorway under a white
    // portico, sash windows, a hipped roof with a flagpole
    const B = '#9a4030', W = '#efeae0', r = rnd(1950);
    k.box(18, 9.6, 12, 0, 0, 0, B).box(18.4, 0.5, 12.4, 0, 9.6, 0, W);
    k.put(new THREE.ConeGeometry(13.6, 4.2, 4), '#4a4a50', 0, 12.2, 0, 0, Math.PI / 4, 0, 1, 1, 0.68);
    for (let f = 0; f < 2; f++) for (const x of [-6.4, -3.6, 3.6, 6.4]) litWin(k, r, x, 1.4 + f * 4.4, 6.02, 1.4, 2.4, 0.7);
    k.box(3.2, 3.6, 0.6, 0, 4.4, 6.3, W).box(1.6, 2.6, 0.12, 0, 4.6, 6.62, '#e0a848', 0, 0, 0, 'glow');   // the doorway and its portico
    k.put(new THREE.CylinderGeometry(2.4, 2.4, 0.6, 3), W, 0, 8.4, 6.4, Math.PI / 2, 0, 0, 1, 0.5, 1);
    for (const sd of [-1, 1]) for (let i = 0; i < 8; i++) k.box(0.5, (8 - i) * 0.55, 1.4, sd * (2.25 + i * 0.5), 0, 7.6, '#c9c1ae', 0, 0, 0, 'stone');   // the double flight of steps, down from the door each way
    k.box(4, 4.4, 1.4, 0, 0, 7.6, '#c9c1ae', 0, 0, 0, 'stone');
    k.cyl(0.08, 0.1, 6, 6, 0, 13, 0, '#e8ecea').box(1.8, 1.1, 0.05, 0.95, 18.0, 0, '#1d4e89');
  },
  tripkiosk(k, v) {   // a boat-trip ticket kiosk on the quay: red and white, an ornate pyramid roof with a finial, a lit hatch
    const red = ['#d62828', '#2a6ab0'][v % 2];
    k.box(2.4, 2.6, 2.4, 0, 0, 0, red).box(2.5, 0.3, 2.5, 0, 2.6, 0, '#ffffff');
    k.put(new THREE.ConeGeometry(2.0, 1.8, 4), red, 0, 3.8, 0, 0, Math.PI / 4).cyl(0.06, 0.06, 0.8, 4, 0, 4.6, 0, '#ffffff').ball(0.14, 0, 5.4, 0, '#ffd23f');
    k.box(1.6, 0.9, 0.08, 0, 1.2, 1.22, '#e8b860', 0, 0, 0, 'glow').box(1.9, 0.12, 0.4, 0, 1.15, 1.35, '#ffffff');
  },
  quaybollard(k, v) {   // a black iron bollard on the quay's edge, a rope from it down to a boat alongside (+X: the water)
    k.cyl(0.22, 0.28, 0.7, 10, 0, 0, 0, '#1a1a1c').cyl(0.3, 0.3, 0.12, 10, 0, 0.7, 0, '#1a1a1c');
    if (v % 2 === 0) beam(k, [0.1, 0.5, 0], [3.4, 0.3, v % 4 ? 3 : -3], 0.05, '#e8e4da');
  },
  fishboat(k, v) {   // a small fishing boat moored against the quay (bow -Z): a coloured hull, a wheelhouse lit at night, a mast and
    // derrick with its riding light, nets and orange floats, tyres hung as fenders
    const hull = ['#c62828', '#1d4e89', '#2f6a3a', '#f4f4f0', '#e8b030'][v % 5], r = rnd(2000 + v);
    k.side([-5, -0.6, 4.4, -0.6, 5.6, 1.6, -5.2, 1.4], 3.6, 0, 0, 0, hull, 'shiny', 0.1);
    k.box(3.62, 0.25, 10.4, 0, 1.2, 0, '#f4f4f0');
    k.box(2.4, 2.2, 2.6, 0, 1.5, -1.0, '#f4f4f0').box(2.42, 0.6, 2.62, 0, 2.6, -1.0, '#e8b048', 0, 0, 0, 'glow').box(2.6, 0.2, 2.8, 0, 3.7, -1.0, hull);   // the wheelhouse
    k.cyl(0.08, 0.1, 6, 6, 0, 3.7, -1.0, '#e8e8e4').box(0.2, 0.2, 0.2, 0, 9.8, -1.0, '#fff4c0', 0, 0, 0, 'glow');
    beam(k, [0, 6.6, -1.0], [0, 2.4, 3.6], 0.1, '#d8d8d4');   // the derrick
    for (let i = 0; i < 6; i++) k.ball(0.22, (r() - 0.5) * 2.4, 1.5, 2 + r() * 2.4, '#ff7a1a', 1, 1, 1, 'lit', 6);
    k.box(2.6, 0.5, 2.4, 0, 1.4, 2.8, '#2a4a3a');   // nets
    for (const z of [-3, 0, 3]) k.put(new THREE.TorusGeometry(0.32, 0.12, 5, 10), '#151515', -1.85, 0.4, z, 0, Math.PI / 2, 0);
  },
  portcrane(k, v) {   // a dockside crane across the harbour at the commercial port: a portal on legs, a tower and an angled jib, red lights at the top
    const Y = ['#e8b030', '#d8d8d4', '#3a6ab0'][v % 3], H = 28 + (v % 2) * 6;
    for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) k.box(0.8, 9, 0.8, x, 0, z, Y);
    k.box(9.6, 1.2, 9.6, 0, 9, 0, Y).box(3, H - 10, 3, 0, 10.2, 0, Y).box(5, 3.4, 4, 0, H, 0.6, Y).box(4.6, 1.2, 0.1, 0, H + 1.2, 2.62, '#e8b048', 0, 0, 0, 'glow');
    beam(k, [0, H + 2, 0], [0, H + 22, -30], 1.0, Y); beam(k, [0, H + 3.4, 2], [0, H + 23, -28], 0.25, '#2a2a2a');
    beam(k, [0, H + 22, -30], [0, 6, -31], 0.08, '#1a1a1a');
    k.box(0.6, 0.6, 0.6, 0, H + 23, -30, '#ff3a2a', 0, 0, 0, 'glow').box(0.6, 0.6, 0.6, 0, H + 3.6, 0, '#ff3a2a', 0, 0, 0, 'glow');
    for (let i = 0; i < 4; i++) k.box(2.4, 2.6, 12, 8 + i * 2.6, 0, 6, ['#b83a2a', '#2a5a9a', '#3a7a4a', '#d8a030'][i % 4]);   // a stack of containers
  },
  canopy(k, v) {   // the quay's glass-roofed shelter: a ridged glass roof on slim posts, benches under it, lit at night
    for (const [x, z] of [[-4.5, -2.5], [4.5, -2.5], [-4.5, 2.5], [4.5, 2.5], [0, -2.5], [0, 2.5]]) k.cyl(0.1, 0.12, 3, 6, x, 0, z, '#2a3a48');
    k.box(10, 0.3, 6, 0, 3, 0, '#2a3a48').prism(6.4, 1.8, 10.4, 0, 3.3, 0, '#9ab4c2', Math.PI / 2);
    k.box(9, 0.1, 5, 0, 3.0, 0, '#d8b870', 0, 0, 0, 'glow');   // the light under the roof
    for (const z of [-1.4, 1.4]) k.box(7, 0.45, 0.6, 0, 0, z, '#5a4a3a');
  },
  reeds(k, v) {   // a bed of reeds at the harbour's edge (the owner's aerials of Christchurch Harbour): tall straw and green stems in clumps
    const r = rnd(2100 + v * 7);
    k.blob(3, 0, -2.2, 0, '#5a5a3a', 2.4, 0.8, 1.6, 2110 + v, { smooth: true });
    for (let i = 0; i < 16; i++) { const x = (r() - 0.5) * 12, z = (r() - 0.5) * 7, c = ['#b8a868', '#a8a060', '#8a9a58', '#c8b878'][i % 4], h = 2 + r() * 0.8;
      k.card(1.6, h, x, h / 2 + 0.1, z, c, r() * 3, 0, 'grass', 'up').card(1.6, h, x, h / 2 + 0.1, z, c, r() * 3 + 1.6, 0, 'grass', 'up'); }
    for (let i = 0; i < 6; i++) k.cyl(0.04, 0.04, 0.5, 4, (r() - 0.5) * 10, 2.4 + r() * 0.6, (r() - 0.5) * 6, '#6a4a2a');   // seed heads
  },
  marsh(k, v) {   // a patch of saltmarsh out in the harbour, just above the water: green and brown, a few reeds
    const r = rnd(2200 + v * 5);
    for (let i = 0; i < 4; i++) { const R = 6 + r() * 5; k.blob(R, (r() - 0.5) * 26, 0.35 - R * 0.1, (r() - 0.5) * 18, ['#6a7a4a', '#7a7a50', '#5a6a42', '#8a8458'][i], 1.6, 0.1, 1.2, 2210 + v * 9 + i, { smooth: true }); }   // (flat: just proud of the water)
    for (let i = 0; i < 10; i++) k.card(1.4, 1.2, (r() - 0.5) * 24, 0.7, (r() - 0.5) * 16, ['#a8a060', '#8a9a58'][i % 2], r() * 3, 0, 'grass', 'up');
  },
  swans(k, v) {   // swans on the water by the quay: a pair, sometimes with grey cygnets behind
    const r = rnd(2300 + v);
    const swan = (x, z, s, col, ry) => {
      k.ball(0.5 * s, x, 0.25 * s, z, col, 1, 0.55, 1.6, 'lit', 10);
      k.put(capG(0.09 * s, 0.6 * s), col, x + Math.sin(ry) * 0.6 * s, 0.75 * s, z - Math.cos(ry) * 0.6 * s, -0.25, 0, 0);
      k.ball(0.14 * s, x + Math.sin(ry) * 0.75 * s, 1.15 * s, z - Math.cos(ry) * 0.75 * s, col, 1, 0.9, 1.4, 'lit', 8).box(0.08 * s, 0.07 * s, 0.22 * s, x + Math.sin(ry) * 0.85 * s, 1.1 * s, z - Math.cos(ry) * 0.92 * s, '#ff8a1a');
    };
    swan(0, 0, 1, '#fbfbf8', 0); swan(1.8, 1.2, 1, '#f6f6f2', 0.3);
    if (v % 2) for (let i = 0; i < 3; i++) swan(0.6 + i * 0.8, 3 + r(), 0.5, '#a8a49c', 0.1);
  },
  bandstand(k, v) {   // the Victorian bandstand on the quay: eight slender iron posts on a low round base, a railing, a green ogee roof
    const R = 4.4;
    k.cyl(R + 0.4, R + 0.6, 0.9, 16, 0, 0, 0, '#d8d2c4', 0, 0, 'stone');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.cyl(0.08, 0.1, 3.2, 6, Math.cos(a) * R, 0.9, Math.sin(a) * R, '#2f5a4a');
      k.box(0.05, 0.7, R * 0.76, Math.cos(a + Math.PI / 8) * R * 0.92, 0.9, Math.sin(a + Math.PI / 8) * R * 0.92, '#2f5a4a', -(a + Math.PI / 8) + Math.PI / 2); }
    k.cyl(R + 0.4, R + 0.4, 0.3, 16, 0, 4.1, 0, '#f4f2ea').cone(R + 0.6, 2.2, 16, 0, 4.4, 0, '#3f7a64').cyl(0.4, 0.4, 0.7, 8, 0, 6.5, 0, '#f4f2ea').cone(0.6, 1.2, 8, 0, 7.2, 0, '#3f7a64');
  },
  rowboats(k, v) {   // rowing boats and little motor boats for hire, tied along a short pontoon (+X out from the bank)
    const r = rnd(2400 + v);
    k.box(10, 0.25, 1.6, 5, 0.2, 0, '#9a8266');
    for (let i = 0; i < 5; i++) { const x = 1.5 + i * 2, col = ['#2a6ab0', '#e8e4da', '#c62828', '#2f6a3a', '#e8b030'][(i + v) % 5];
      for (const sd of [-1, 1]) { if (r() < 0.25) continue; k.side([-1.6, 0, 1.4, 0, 1.9, 0.6, -1.7, 0.6], 1.2, x, -0.1, sd * 2.0, col, 'shiny', 0.06); k.box(1.0, 0.08, 0.2, x, 0.4, sd * 2.0, '#8a6a48'); } }
  },
  placemill(k, v) {   // the old watermill on the quay: a long low building of stone below and dark weatherboard above, a steep tiled roof, a wheel at the end
    k.box(24, 4, 9, 0, 0, 0, '#b8ad96', 0, 0, 0, 'stone').box(24, 3, 9, 0, 4, 0, '#4a3a30').prism(10, 4.4, 24.6, 0, 7, 0, '#8a4a34', Math.PI / 2);
    for (let i = 0; i < 6; i++) k.box(1.2, 1.2, 0.12, -10 + i * 4, 5, 4.56, '#2a3440', 0, 0, 0, 'shiny');
    k.box(1.6, 2.4, 0.12, 4, 0, 4.56, '#3a2a1e');
    k.put(new THREE.TorusGeometry(2.6, 0.22, 6, 18), '#3a2e26', 12.4, 2.6, 0, 0, Math.PI / 2, 0);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI; k.box(0.12, 5.2, 0.6, 12.5, 2.6, 0, '#3a2e26', 0, a, 0); }
  },
  castlekeep(k, v) {   // the ruined Norman castle keep on its grassy mound: two tall broken walls of grey rubble stone
    k.blob(16, 0, -7, 0, '#6f9a45', 1.4, 0.75, 1.4, 2501, { smooth: true });
    const st = '#a8a090';
    k.side([0, 0, 12, 0, 12, 8, 9, 11, 6, 9, 3, 12.5, 0, 10], 2, 0, 4.6, -6, st, 'stone');
    k.side([0, 0, 9, 0, 9, 6, 6, 9.5, 3, 7, 0, 8], 2, -6, 4.6, 0, st, 'stone');
    for (const [x, z] of [[2, -4], [-3, 3], [5, 4]]) k.blob(1.5, x, 4.8, z, '#9a9282', 1.3, 0.6, 1);
  },
  tollbooth(k, v) {   // the ferry road's toll booth (Studland): a little brick hut with a mossy tiled hipped roof, a window, a barrier arm raised
    k.box(3.4, 2.6, 3.2, 0, 0, 0, '#9a5040').box(3.6, 0.2, 3.4, 0, 2.6, 0, '#e8e4da');
    k.put(new THREE.ConeGeometry(3.0, 1.5, 4), '#8a7a52', 0, 3.55, 0, 0, Math.PI / 4, 0, 1, 1, 0.95);
    k.box(2.2, 1.0, 0.1, 0, 1.2, 1.62, '#2a3a48', 0, 0, 0, 'shiny').box(0.1, 1.0, 1.6, 1.72, 1.2, 0, '#2a3a48', 0, 0, 0, 'shiny');
    k.cyl(0.14, 0.14, 1.1, 8, 0, 0, 2.6, '#d62828');
    for (let i = 0; i < 6; i++) k.box(0.12, 0.12, 0.7, 0, 1.1 + i * 0.42, 2.6 + 0.1 + i * 0.24, i % 2 ? '#ffffff' : '#d62828', 0, -1.05, 0);   // the arm, raised
  },
  littlesea(k, v) {   // a boardwalk across the heath to the lake (Little Sea, Studland): timber walkway and rails (+X out), reeds, the water
    const T = '#a89070', r = rnd(3100);
    k.box(18, 0.2, 1.8, 9, 0.35, 0, T);
    for (let x = 0.5; x < 18; x += 2) for (const z of [-0.9, 0.9]) k.box(0.1, 1.0, 0.1, x, 0.35, z, T);
    for (const z of [-0.9, 0.9]) k.box(18, 0.08, 0.08, 9, 1.3, z, T);
    k.cyl(16, 16, 0.12, 24, 34, 0.05, 2, '#3a6a8a', 0, 0, 'shiny');   // the lake
    for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, d = 15 + r() * 3; k.card(2, 1.6, 34 + Math.cos(a) * d, 0.9, 2 + Math.sin(a) * d, ['#b8a868', '#8a9a58'][i % 2], r() * 3, 0, 'grass', 'up'); }
    for (let i = 0; i < 3; i++) k.ball(0.35, 30 + i * 3, 0.25, -2 + i * 2, '#2a2a2a', 1.2, 0.6, 0.8);   // ducks
  },
  clocktower(k, v) {   // the old stone clock tower by the sea at Swanage: square, Gothic, a clock face on each side, a tall pointed spire
    const S = '#c9bea4';
    k.box(3.6, 1.2, 3.6, 0, 0, 0, S, 0, 0, 0, 'stone').box(3, 11, 3, 0, 1.2, 0, S, 0, 0, 0, 'stone').box(3.4, 0.5, 3.4, 0, 12.2, 0, '#b8ad92', 0, 0, 0, 'stone');
    for (const [x, z, ry] of [[0, 1.52, 0], [1.52, 0, Math.PI / 2], [0, -1.52, 0], [-1.52, 0, Math.PI / 2]]) k.put(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 18), '#f4f0e0', x, 10.2, z, Math.PI / 2, ry, 0);   // the clock faces
    k.put(new THREE.ConeGeometry(2.3, 9, 4), '#a89c82', 0, 17.2, 0, 0, Math.PI / 4, 0, 1, 1, 1, 'stone').cyl(0.06, 0.06, 1.5, 4, 0, 21.7, 0, '#3a3a3a');
    for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) k.cone(0.4, 2.2, 6, x, 12.7, z, '#a89c82');   // pinnacles at its corners
  },
  purbeckcottage(k, v) {   // a cottage of grey Purbeck stone in Corfe (its face +Z): rubble-stone walls, a heavy roof of stone slates, small
    // white-framed windows, a chimney at each end; some a pair, some with a little porch, flowers by the door
    const S = ['#b4ad9e', '#a8a191', '#bcb4a4'][v % 3], R = ['#6e685e', '#7a7468', '#666158'][v % 3], wide = v % 2 ? 13 : 8, r = rnd(3500 + v);
    k.box(wide, 5.2, 6.5, 0, 0, 0, S, 0, 0, 0, 'stone').prism(7.6, 3.4, wide + 0.6, 0, 5.2, 0, R, Math.PI / 2);
    for (const sd of [-1, 1]) k.box(1.0, 2.6, 1.0, sd * (wide / 2 - 0.3), 7.4, 0, S, 0, 0, 0, 'stone');   // the chimneys
    const n = v % 2 ? 4 : 2;
    for (let i = 0; i < n; i++) { const x = -wide / 2 + wide * (i + 0.5) / n; k.box(1.1, 1.0, 0.1, x, 3.3, 3.27, '#f2efe8').box(0.9, 0.8, 0.12, x, 3.4, 3.28, '#2a3440', 0, 0, 0, 'shiny'); if (i !== 1) k.box(1.1, 1.0, 0.1, x, 1.1, 3.27, '#f2efe8').box(0.9, 0.8, 0.12, x, 1.2, 3.28, '#2a3440', 0, 0, 0, 'shiny'); }
    k.box(1.0, 2.0, 0.12, v % 2 ? 0.8 : 0, 0, 3.28, ['#2f5a3a', '#1d3557', '#7a1f2b', '#4a3a2a'][v % 4]);
    if (v % 3 === 0) k.box(1.8, 0.25, 1.2, 0, 2.4, 3.9, R).box(0.12, 2.4, 0.12, -0.8, 0, 4.4, S).box(0.12, 2.4, 0.12, 0.8, 0, 4.4, S);   // a porch
    for (let i = 0; i < 4; i++) k.ball(0.28, (r() - 0.5) * wide * 0.8, 0.4, 3.6, ['#e63946', '#ff7eb6', '#ffd23f', '#9b5de5'][i], 1, 1.1, 0.8, 'lit', 6);
  },
  stonepub(k) {   // the old stone pub in the village square: a long grey Purbeck-stone front, a porch on stone pillars out over the pavement, a blank
    // hanging sign, flower baskets, benches out front
    const S = '#b0a998', R = '#6e685e', r = rnd(3600);
    k.box(18, 6, 8, 0, 0, 0, S, 0, 0, 0, 'stone').prism(9, 3.6, 18.6, 0, 6, 0, R, Math.PI / 2);
    for (let i = 0; i < 5; i++) { const x = -7 + i * 3.5; k.box(1.4, 1.2, 0.1, x, 3.8, 4.02, '#f2efe8').box(1.2, 1.0, 0.12, x, 3.9, 4.03, '#e8b860', 0, 0, 0, 'glow'); if (i !== 2) k.box(1.4, 1.4, 0.1, x, 1.0, 4.02, '#f2efe8').box(1.2, 1.2, 0.12, x, 1.1, 4.03, '#e0a848', 0, 0, 0, 'glow'); }
    k.box(4, 0.4, 3, 0, 3.4, 5.4, R).box(4.2, 0.3, 3.2, 0, 3.0, 5.4, S, 0, 0, 0, 'stone'); for (const x of [-1.7, 1.7]) k.box(0.5, 3.0, 0.5, x, 0, 6.6, S, 0, 0, 0, 'stone');   // the porch
    k.box(0.1, 0.1, 1.2, 9.4, 5.0, 4.6, '#1a1a1a').box(0.08, 1.3, 1.0, 9.4, 3.6, 5.0, '#5a1f1a');   // the sign on its bracket (blank)
    for (const x of [-6, -3, 3, 6]) { k.cyl(0.02, 0.02, 0.5, 4, x, 5.0, 4.4, '#222222'); k.ball(0.45, x, 4.8, 4.4, ['#e63946', '#ff7eb6', '#ffd23f', '#9b5de5'][(r() * 4) | 0], 1, 0.8, 1); }
    for (const x of [-5.5, 5.5]) k.box(2.6, 0.45, 0.6, x, 0.45, 7.2, '#6a4e34').box(2.6, 0.08, 1.6, x, 0.85, 7.2, '#8a6a48');
    for (let i = 0; i < 4; i++) person(k, -6 + i * 4 + r(), 0, 8.5 + r(), r, false);
  },
  corfestation(k) {   // the heritage railway's station at Corfe, along the road (+Z: along it): a stone station with a canopy over the platform,
    // and a steam train standing at it - a green engine with its tall chimney steaming, carriages in crimson and cream
    const S = '#b0a998', G = '#2f5a3a';
    k.box(7, 1, 70, 0, 0, 0, '#9a958a');   // the platform
    k.box(5, 4.4, 16, -1, 1, -8, S, 0, 0, 0, 'stone').prism(6.4, 2.6, 16.6, -1, 5.4, -8, '#6e685e', 0);
    k.box(4, 0.25, 30, 1.5, 4.4, -2, '#e8e4da'); for (let z = -16; z <= 12; z += 4) k.cyl(0.1, 0.12, 3.4, 6, 3.2, 1, z, G);   // the canopy, its columns
    const tx = 6.8;   // the train on the track beside the platform
    k.box(2.6, 0.3, 74, tx, 0, -2, '#4a4038');
    k.box(2.6, 2.4, 9, tx, 1.0, -30, G, 0, 0, 0, 'shiny').axle(1.2, 2.4, 14, tx, 2.4, -32, G, 'shiny').box(2.8, 3.2, 3.2, tx, 1.0, -25.4, G, 0, 0, 0, 'shiny');   // the engine: boiler, cab
    k.cyl(0.4, 0.45, 1.6, 10, tx, 3.6, -35, '#1a1a1a').box(2.4, 0.1, 9, tx, 3.6, -30, '#c9a227');   // the chimney, a brass line
    for (let i = 0; i < 5; i++) k.ball(1.2 + i * 0.5, tx + i * 0.3, 6 + i * 1.3, -35 + i * 2.2, '#f4f4f2', 1, 0.8, 1, 'lit', 8);   // steam
    for (const z of [-33.5, -30, -27]) for (const sd of [-1, 1]) k.axle(0.75, 0.2, 12, tx + sd * 1.25, 0.95, z, '#c62828');   // red wheels
    for (let c = 0; c < 3; c++) { const z = -16 + c * 15;
      k.box(2.7, 3.2, 14, tx, 1.0, z, '#7a1f2b', 0, 0, 0, 'shiny').box(2.72, 1.2, 14.02, tx, 2.9, z, '#e8d8b0').put(new THREE.CylinderGeometry(1.6, 1.6, 14, 12, 1, false, -Math.PI / 2, Math.PI), '#4a4a4e', tx, 4.0, z, Math.PI / 2, 0, 0, 0.9, 1, 0.4);
      for (let w = 0; w < 6; w++) k.box(0.08, 0.8, 1.4, tx - 1.37, 3.1, z - 5.5 + w * 2.2, '#2a3440', 0, 0, 0, 'shiny'); }
    for (let i = 0; i < 6; i++) person(k, -0.5 + (i % 2), 1, -12 + i * 5, rnd(3700 + i), i % 3 === 0);
  },
  redwood(k, v) {   // a giant redwood of Rhinefield Drive (planted along it in 1859): a huge red-brown trunk flaring at its foot, bare for
    // the first dozen metres, then a tall narrow spire of dark blue-green, its branches swept up
    const H = [40, 46, 52][v % 3], q = rnd(4100 + v), bark = ['#8a4a2e', '#7e4430', '#94523a'][v % 3];
    k.cyl(1.15, 2.1, 2.6, 10, 0, 0, 0, bark).cyl(0.62, 1.15, H * 0.62, 9, 0, 2.6, 0, bark).cyl(0.12, 0.62, H * 0.38, 7, 0, 2.6 + H * 0.62, 0, shade(bark, -0.1));
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + q(); k.box(0.5, 2.2 + q(), 0.5, Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55, shade(bark, -0.12), a); }   // the buttresses
    const n = 12, y0 = H * 0.27;
    for (let i = 0; i < n; i++) { const f = i / (n - 1), r = 4.6 * (1 - f) + 0.7, y = y0 + f * (H - y0 - 1.2);
      k.clump(r, (q() - 0.5) * 0.8, y, (q() - 0.5) * 0.8, ['#23402c', '#2b4c33', '#1c3826'][i % 3], 4200 + v * 20 + i); }
  },
  lyndchurch(k) {   // Lyndhurst's church on its knoll over the village (its face +Z, to the road): Victorian red brick banded with pale stone,
    // a long steep slate roof, tall lancet windows, and at the end its tower with the slender spire you see from all round the Forest
    const B = '#a4462f', S = '#e2d6bc', R = '#4c5058', r = rnd(4300);
    k.blob(26, 0, -3.4, 0, '#5f7f3a', 1.35, 0.22, 1, 4301, { smooth: true });   // the knoll
    k.box(30, 11, 12, -4, 1.4, 0, B).prism(13, 9, 31, -4, 12.4, 0, R, Math.PI / 2);   // the nave
    for (const y of [4.4, 8.2, 12.2]) k.box(30.2, 0.45, 12.2, -4, y, 0, S);   // the stone bands
    for (let i = 0; i < 6; i++) { const x = -16.5 + i * 4.6; k.box(1.5, 5.6, 0.12, x, 4.9, 6.06, S).box(1.1, 5.0, 0.14, x, 5.1, 6.07, '#2b3540', 0, 0, 0, 'shiny'); k.prism(1.5, 1.0, 0.16, x, 10.5, 6.07, S, 0); }   // lancets
    k.box(10, 9, 6, -10, 1.4, 8.6, B).prism(10.4, 5.4, 6.4, -10, 10.4, 8.6, R, 0).box(3.2, 6.4, 0.14, -10, 3.4, 11.66, '#2b3540', 0, 0, 0, 'shiny');   // the transept's gable and its big window
    const tx = 15.5;   // the tower and the spire
    k.box(8, 30, 8, tx, 1.4, 0, B); for (const y of [7, 14, 21, 28]) k.box(8.3, 0.6, 8.3, tx, y, 0, S);
    for (const z of [4.06, -4.06]) k.box(1.6, 4.4, 0.12, tx, 22.4, z, '#20262e');   // the bell openings
    for (const x of [tx - 4.06, tx + 4.06]) k.box(0.12, 4.4, 1.6, x, 22.4, 0, '#20262e');
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.cone(0.7, 3.2, 6, tx + x * 3.7, 31.4, z * 3.7, S);   // the pinnacles at its corners
    k.cone(4.4, 26, 8, tx, 31.4, 0, R).cone(0.18, 2.2, 5, tx, 57.2, 0, '#c9a24a', 'shiny');   // the spire, a gilded tip
    for (let i = 0; i < 14; i++) { const x = -24 + r() * 50, z = 9 + r() * 10; k.box(0.7, 0.9 + r() * 0.4, 0.16, x, 1.0 - Math.max(0, (Math.abs(x) - 18) * 0.12), z, '#9a9a94'); }   // the churchyard's stones
    for (const [x, z, s] of [[-24, 4, 1.4], [26, -6, 1.6], [-20, -10, 1.3], [24, 10, 1.1]]) k.cyl(0.3, 0.5, 3, 6, x, 0, z, '#4a3a2a').clump(2.6 * s, x, 3.2 + 2 * s, z, '#203c26', 4310 + Math.round(x)).clump(2.0 * s, x, 5.8 + 2 * s, z, '#284a2e', 4320 + Math.round(z));   // dark old yews
  },
  brickhouse(k, v) {   // Lyndhurst's high street (its face +Z): Victorian red-brick houses and shops, white sash windows, slate roofs and tall
    // chimneys; some a pair with bay windows, a shop with a striped awning, one an old inn with a hanging sign (blank), one thatched
    const B = ['#a4462f', '#9a3e2c', '#b0543a', '#8e3a28', '#a85036', '#9c4430'][v % 6], R = '#4c5058', wide = [9, 12, 10, 11, 9, 13][v % 6], h = v % 3 === 1 ? 8 : 6.4, r = rnd(4400 + v);
    if (v === 5) { k.box(wide, 3.6, 6.5, 0, 0, 0, '#f2ecdc'); k.put(new THREE.CylinderGeometry(4.6, 4.6, wide + 1, 14, 1, false, -Math.PI / 2, Math.PI), '#b0925a', 0, 3.4, 0, 0, 0, Math.PI / 2, 1, 0.9, 1); k.box(1.2, 3.4, 1.2, wide / 2 - 1.6, 5.6, -1, B); }   // the thatched one
    else { k.box(wide, h, 7, 0, 0, 0, B).prism(7.6, 3.4, wide + 0.4, 0, h, 0, R, Math.PI / 2); for (const sd of [-1, 1]) k.box(1.1, 3.0, 1.4, sd * (wide / 2 - 0.4), h + 1.8, 0, B); }
    const n = Math.round(wide / 3), wy = v === 5 ? [1.2] : h > 7 ? [1.2, 3.9] : [1.2, 3.6], fz = v === 5 ? 3.27 : 3.52;
    for (let i = 0; i < n; i++) { const x = -wide / 2 + wide * (i + 0.5) / n; for (const y of wy) { if (y < 2 && i === (n >> 1)) continue; k.box(1.3, 1.6, 0.1, x, y, fz, '#f4f1ea').box(1.0, 1.3, 0.12, x, y + 0.15, fz + 0.01, '#5a7890', 0, 0, 0, 'shiny'); } }
    k.box(1.1, 2.3, 0.12, -wide / 2 + wide * ((n >> 1) + 0.5) / n, 0, fz + 0.02, ['#2f5a3a', '#1d3557', '#7a1f2b', '#2a2a2a'][v % 4]);
    if (v % 3 === 1) for (const sd of [-1, 1]) k.box(2.6, 2.4, 1.0, sd * wide / 4, 0.4, 3.9, B).box(2.2, 1.6, 0.1, sd * wide / 4, 0.8, 4.42, '#5a7890', 0, 0, 0, 'shiny');   // bay windows
    if (v === 2 || v === 4) { k.box(wide - 1, 2.6, 0.12, 0, 0.2, 3.56, '#5a7890', 0, 0, 0, 'shiny'); for (let i = 0; i < 6; i++) k.box((wide - 1) / 6, 0.18, 1.6, -(wide - 1) / 2 + (i + 0.5) * (wide - 1) / 6, 2.9, 4.2, i % 2 ? '#f4f1ea' : ['#2f6a4a', '#7a1f2b'][v % 2], 0, -0.35); }   // a shop front, its awning
    if (v === 0) k.box(0.1, 0.1, 1.2, wide / 2 - 0.6, 3.4, 4.1, '#1a1a1a').box(0.08, 1.2, 0.9, wide / 2 - 0.6, 2.1, 4.4, '#4a2a1a');   // the inn's sign (blank)
    for (let i = 0; i < 4; i++) k.ball(0.26, (r() - 0.5) * wide * 0.8, 0.35, 3.9, ['#e63946', '#ff7eb6', '#ffd23f', '#9b5de5'][i], 1, 1.1, 0.8, 'lit', 6);
  },
  cattlegrid(k) {   // where the road comes into the open Forest: a grid of steel bars across the road over a pit (the ponies won't cross it),
    // the white field gates standing open either side, and the warning sign with a pony on it (its road runs along Z, across is X; the
    // grid runs out over the verges to the boundary, so nothing stands where the car can go)
    const w = 14.4;
    k.box(w * 2, 0.04, 3.2, 0, 0.0, 0, '#1a1c1e');
    for (let i = 0; i < 12; i++) k.box(w * 2, 0.07, 0.11, 0, 0.0, -1.45 + i * 0.264, '#b8bcc0', 0, 0, 0, 'shiny');
    for (const sd of [-1, 1]) {
      k.box(0.32, 1.5, 0.32, sd * (w + 0.4), 0, -1.7, '#f2f2ee').box(0.32, 1.5, 0.32, sd * (w + 0.4), 0, 1.7, '#f2f2ee');   // the gate posts
      for (const y of [0.35, 0.75, 1.15]) k.box(0.1, 0.12, 3.4, sd * (w + 0.4), y, -3.5, '#f2f2ee');   // the gate, swung open along the verge
      k.box(0.1, 1.3, 0.1, sd * (w + 0.4), 0, -5.1, '#f2f2ee');
      for (let i = 0; i < 3; i++) k.box(4.2, 0.12, 0.1, sd * (w + 2.5), 0.35 + i * 0.4, 1.7, '#7a6a52');   // a fence going off
      k.box(0.16, 1.4, 0.16, sd * (w + 4.6), 0, 1.7, '#7a6a52');
    }
    k.cyl(0.07, 0.07, 2.5, 6, w + 1.6, 0, -3.2, '#9aa0a6');   // the sign: a red triangle, a pony on it
    k.put(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 3), '#d32f2f', w + 1.6, 2.9, -3.12, Math.PI / 2, 0, 0).put(new THREE.CylinderGeometry(0.6, 0.6, 0.07, 3), '#ffffff', w + 1.6, 2.86, -3.08, Math.PI / 2, 0, 0);
    k.box(0.5, 0.22, 0.08, w + 1.6, 2.76, -3.03, '#111111').box(0.06, 0.2, 0.08, w + 1.42, 2.58, -3.03, '#111111').box(0.06, 0.2, 0.08, w + 1.78, 2.58, -3.03, '#111111').box(0.08, 0.22, 0.08, w + 1.86, 2.88, -3.03, '#111111', 0, 0, 0.5);
  },
  deer(k, v) {   // fallow deer in the woods: slim fawn bodies, white bellies and rumps, long thin legs; a buck with flat antlers
    const r = rnd(4500 + v), n = 2 + (v % 3);
    for (let d = 0; d < n; d++) {
      const x = (d - (n - 1) / 2) * 2.4 + (r() - 0.5), z = (r() - 0.5) * 3, s = d === 0 && v % 2 ? 1.05 : 0.85 + r() * 0.1, col = ['#a8703c', '#9a6434', '#b47c48'][d % 3], up = r() < 0.6;
      for (const [lx, lz] of [[-0.14, -0.42], [0.14, -0.42], [-0.14, 0.42], [0.14, 0.42]]) k.put(capG(0.04 * s, 0.85 * s), col, x + lx * s, 0.45 * s, z + lz * s);
      k.put(capG(0.24 * s, 0.6 * s), col, x, 1.05 * s, z, Math.PI / 2, 0, 0).box(0.3 * s, 0.14 * s, 0.6 * s, x, 0.86 * s, z, '#efe6d6');   // the body, the white belly
      k.box(0.26 * s, 0.3 * s, 0.1 * s, x, 0.95 * s, z + 0.6 * s, '#f4efe4');   // the rump
      const hy = up ? 1.75 : 0.6, hz = up ? -0.75 : -1.0;
      k.put(capG(0.09 * s, 0.45 * s), col, x, (1.15 + hy) / 2 * s, z + (-0.45 + hz) / 2 * s, up ? -0.5 : -2.2, 0, 0).put(capG(0.09 * s, 0.22 * s), col, x, hy * s, z + hz * s, up ? -1.9 : -2.9, 0, 0);
      if (d === 0 && v % 2) for (const sd of [-1, 1]) k.box(0.05, 0.5, 0.05, x + sd * 0.12, (hy + 0.15) * s, z + hz * s + 0.1, '#d8c8a0', 0, 0, sd * 0.4).box(0.32, 0.22, 0.04, x + sd * 0.3, (hy + 0.6) * s, z + hz * s + 0.12, '#d8c8a0', 0, 0, sd * 0.5);   // the buck's antlers
    }
  },
  bracken(k, v) {   // bracken under the trees, turning gold and russet
    const c = [['#b0762a', '#c48a3a', '#8a6a2a'], ['#7a8a3a', '#9a8a3a', '#b0762a']][v % 2], q = rnd(4600 + v);
    for (let i = 0; i < 5; i++) k.card(1.6 + q() * 0.6, 1.1, (q() - 0.5) * 2.4, 0.5, (q() - 0.5) * 2.4, c[i % 3], q() * 3.14, 0, 'grass', 'up');
  },
  lymhouse(k, v) {   // Lymington's High Street (its face +Z): Georgian houses and shops, painted render or red brick - rows of white sash
    // windows, a cornice and a parapet in front of a slate roof, chimney stacks; a bow-fronted shop window or a door under a fanlight, a hanging
    // sign (blank), a striped awning on some
    const C = ['#f6f2e8', '#efe4c8', '#ecc8c0', '#a4462f', '#c8dce6', '#f2e3a8', '#cfdcc0', '#9c4430'][v % 8], brick = v % 8 === 3 || v % 8 === 7;
    const fl = v % 3 === 2 ? 2 : 3, h = 1.2 + fl * 3.2, wide = [8, 10, 7.5, 11, 9, 8.5, 10, 9.5][v % 8], T = '#fbfaf6', GL = '#2e3e4a', r = rnd(4700 + v);
    k.box(wide, h, 8, 0, 0, 0, C).box(wide + 0.3, 0.35, 8.3, 0, h - 0.25, 0, T).box(wide, 0.9, 0.3, 0, h + 0.1, 3.85, C);   // the walls, the cornice, the parapet
    k.prism(7.6, 2.2, wide - 0.3, 0, h, -0.3, '#4c5058', Math.PI / 2);
    for (const sd of [-1, 1]) { const cx = sd * (wide / 2 - 0.6); k.box(1.1, 2.4, 1.6, cx, h + 0.4, -0.4, brick ? C : '#a4462f'); for (const o of [-0.25, 0.25]) k.cyl(0.11, 0.13, 0.5, 6, cx + o, h + 2.8, -0.4, '#b0603a'); }
    const n = Math.max(2, Math.round(wide / 2.6));
    for (let f = 1; f < fl; f++) for (let i = 0; i < n; i++) { const x = -wide / 2 + wide * (i + 0.5) / n, y = 0.6 + f * 3.2, wh = f === fl - 1 ? 1.6 : 1.9;
      k.box(1.15, wh + 0.2, 0.1, x, y - 0.1, 4.02, T).box(0.9, wh, 0.12, x, y, 4.03, GL, 0, 0, 0, 'shiny').box(0.95, 0.06, 0.14, x, y + wh * 0.5, 4.05, T).box(1.3, 0.12, 0.3, x, y - 0.16, 4.1, T); }   // sashes, their bars and sills
    const shop = v % 2 === 0, dx = shop ? wide / 2 - 1.3 : 0;
    if (shop) {   // the bow window, white glazing bars on it, a fascia over it, and the sign on its bracket
      const bx = -wide * 0.18;
      k.put(new THREE.CylinderGeometry(2.0, 2.0, 2.3, 12, 1, false, -Math.PI / 2, Math.PI), GL, bx, 1.75, 4.0, 0, 0, 0, 1, 1, 0.5, 'shiny');
      k.box(4.3, 0.3, 1.2, bx, 0.3, 4.4, T).box(4.4, 0.35, 1.25, bx, 2.9, 4.4, T).box(wide - 0.4, 0.7, 0.16, 0, 3.25, 4.06, ['#1d3557', '#2f5a3a', '#7a1f2b', '#2a2a2a'][(v >> 1) % 4]);
      for (const a of [-1.1, -0.4, 0.4, 1.1]) k.box(0.07, 2.3, 0.07, bx + Math.sin(a) * 2.0, 0.6, 4.0 + Math.cos(a) * 1.0, T);
      k.box(0.08, 0.08, 1.3, wide / 2 - 0.4, 4.0, 4.6, '#1a1a1a').box(0.06, 0.9, 0.8, wide / 2 - 0.4, 3.05, 4.95, ['#e8c060', '#2f5a3a', '#7a1f2b', '#1d3557'][v % 4]);
      if (v % 4 === 2) for (let i = 0; i < 6; i++) k.box((wide - 1) / 6, 0.16, 1.5, -(wide - 1) / 2 + (i + 0.5) * (wide - 1) / 6, 3.6, 4.7, i % 2 ? '#f4f1ea' : '#2f6a4a', 0, -0.35);   // an awning
    }
    k.box(1.1, 2.3, 0.12, dx, 0, 4.04, ['#1d3557', '#2f5a3a', '#7a1f2b', '#111111', '#3a5a7a'][v % 5]).box(1.5, 0.5, 0.14, dx, 2.35, 4.04, T).box(1.0, 0.36, 0.15, dx, 2.4, 4.05, GL, 0, 0, 0, 'shiny');   // the door, the fanlight over it
    if (!shop) for (const x of [-wide / 2 + 1.6, wide / 2 - 1.6]) k.box(1.15, 1.9, 0.1, x === dx ? x + 1 : x, 1.0, 4.02, T).box(0.9, 1.7, 0.12, x === dx ? x + 1 : x, 1.1, 4.03, GL, 0, 0, 0, 'shiny');
    for (let i = 0; i < 3; i++) k.ball(0.3, (r() - 0.5) * wide * 0.8, 4.4, 4.3, ['#e63946', '#ff7eb6', '#ffd23f', '#9b5de5'][(v + i) % 4], 1, 0.8, 1, 'lit', 6);   // hanging baskets
  },
  stthomas(k) {   // St Thomas's at the top of Lymington's High Street (its face +Z): the stone tower with the white cupola on top (put there in
    // 1670), a balustrade round it, a round clock face (no numbers); the long rendered nave with tall round-headed windows, the churchyard's limes
    const S = '#d8ccb0', W = '#f6f4ee', R = '#4c5058', r = rnd(4800);
    const tx = 12, th = 21;
    k.box(7, th, 7, tx, 0, 0, S, 0, 0, 0, 'stone'); for (const y of [7, 14]) k.box(7.3, 0.4, 7.3, tx, y, 0, shade(S, -0.08), 0, 0, 0, 'stone');
    k.box(7.6, 0.5, 7.6, tx, th, 0, W); for (let i = 0; i < 9; i++) for (const [ox, oz, rot] of [[0, 3.6, 0], [0, -3.6, 0], [3.6, 0, 1], [-3.6, 0, 1]]) k.box(rot ? 0.14 : 0.18, 0.9, rot ? 0.18 : 0.14, tx + ox + (rot ? 0 : -3.4 + i * 0.85), th + 0.5, oz + (rot ? -3.4 + i * 0.85 : 0), W);   // the balustrade
    k.box(7.6, 0.25, 7.6, tx, th + 1.4, 0, W);
    k.cyl(2.3, 2.3, 3.4, 8, tx, th + 1.6, 0, W); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + 0.39; k.box(0.7, 1.9, 0.2, tx + Math.sin(a) * 2.25, th + 2.3, Math.cos(a) * 2.25, '#2a3036', a); }   // the cupola's open arches
    k.ball(2.45, tx, th + 5.0, 0, W, 1, 0.75, 1, 'lit', 12).cyl(0.5, 0.6, 1.2, 8, tx, th + 6.6, 0, W).cone(0.35, 1.2, 8, tx, th + 7.8, 0, W).cyl(0.06, 0.06, 1.6, 4, tx, th + 9.0, 0, '#c9a24a', 0, 0, 'shiny');   // its dome, lantern, gilded vane
    k.box(1.5, 0.5, 0.2, tx + 0.6, th + 10.0, 0, '#c9a24a', 0, 0, 0, 'shiny');
    k.cyl(1.3, 1.3, 0.2, 16, tx, 15.6, 3.6, W, Math.PI / 2).box(0.08, 0.9, 0.06, tx, 16.0, 3.72, '#111111').box(0.6, 0.08, 0.06, tx + 0.25, 16.6, 3.72, '#111111');   // the clock face and its hands
    k.box(1.6, 3.4, 0.15, tx, 0, 3.55, '#4a2a1a').box(1.8, 0.6, 0.2, tx, 3.4, 3.55, S, 0, 0, 0, 'stone');   // the west door
    k.box(24, 9, 13, -4, 0, 0, '#ece4d0').prism(13.6, 6, 24.6, -4, 9, 0, R, Math.PI / 2);   // the nave
    for (let i = 0; i < 5; i++) { const x = -14 + i * 4.6; k.box(1.6, 4.4, 0.12, x, 2.6, 6.53, W).box(1.25, 4.0, 0.14, x, 2.7, 6.54, '#2b3540', 0, 0, 0, 'shiny'); k.cyl(0.62, 0.62, 0.15, 10, x, 6.7, 6.55, '#2b3540', Math.PI / 2); }
    for (const [x, z, s] of [[-20, 9, 1.3], [-8, 11, 1.1], [24, 8, 1.4], [22, -8, 1.2]]) k.cyl(0.3, 0.45, 4, 6, x, 0, z, '#4a3a2a').clump(3.2 * s, x, 5.5 + 2 * s, z, '#4e7a3a', 4810 + Math.round(x)).clump(2.4 * s, x + 1, 8 + 2 * s, z, '#5a8a40', 4820 + Math.round(z));
    for (let i = 0; i < 10; i++) k.box(0.7, 0.9 + r() * 0.4, 0.16, -18 + r() * 34, 0, 8 + r() * 6, '#9a9a94');
    k.box(40, 0.8, 0.5, 0, 0, 13.5, '#a4462f');   // the churchyard wall
  },
  seabaths(k) {   // Lymington's open-air sea-water baths by the river (from the bank, +X out over the water; its deck at y 0): a long pool of
    // bright blue water inside white walls, the pale deck round it, a row of colourful changing huts, inflatables floating, people about
    const L = 64, Wd = 30, x0 = 2;
    k.box(L, 3.6, Wd, x0 + L / 2, -4.2, 0, '#9ad8e0');   // the pool's floor
    for (const sd of [-1, 1]) k.box(L + 6, 4.2, 3, x0 + L / 2, -4.2, sd * (Wd / 2 + 1.5), '#d8d2c4', 0, 0, 0, 'stone').box(3, 4.2, Wd, x0 + L / 2 + sd * (L / 2 + 1.5), -4.2, 0, '#d8d2c4', 0, 0, 0, 'stone');   // the deck round it, its walls down to the river
    k.box(L, 0.3, Wd, x0 + L / 2, -0.6, 0, '#38c8dc', 0, 0, 0, 'shiny');   // the water
    for (let i = 0; i < 6; i++) k.box(L - 2, 0.04, 0.12, x0 + L / 2, -0.27, -Wd / 2 + 2.5 + i * (Wd - 5) / 5, '#f4f4f4');   // lane ropes
    for (const sd of [-1, 1]) k.box(L + 6, 0.9, 0.3, x0 + L / 2, 0, sd * (Wd / 2 + 2.85), '#f4f4f0');
    k.box(0.3, 0.9, Wd + 6, x0 + L + 2.85, 0, 0, '#f4f4f0');
    for (let i = 0; i < 10; i++) { const c = ['#e63946', '#ffd23f', '#2a9df4', '#7cc576', '#ff7eb6', '#ff9a3c'][i % 6]; k.box(2.6, 2.8, 2.4, x0 + 6 + i * 5.8, 0, -Wd / 2 - 4.6, c).prism(3.0, 1.0, 2.8, x0 + 6 + i * 5.8, 2.8, -Wd / 2 - 4.6, '#f4f1ea', Math.PI / 2).box(1.1, 2.0, 0.1, x0 + 6 + i * 5.8, 0, -Wd / 2 - 3.38, '#f4f1ea'); }
    const r = rnd(4900);
    for (let i = 0; i < 7; i++) k.blob(1.0 + r() * 0.5, x0 + 8 + r() * (L - 16), -0.35, (r() - 0.5) * (Wd - 6), ['#ffd23f', '#ff7eb6', '#ff9a3c', '#7cc576', '#e63946'][i % 5], 1.6, 0.35, 1.0, 4910 + i);   // inflatables
    for (let i = 0; i < 5; i++) person(k, x0 + 4 + r() * (L - 8), 0, (r() < 0.5 ? -1 : 1) * (Wd / 2 + 1.2), r, false);
  },
  boatyard(k, v) {   // a boatyard by the river (its face +Z, to the road): a big clad shed, yachts up on cradles with their masts up, the blue
    // travel hoist that lifts them out
    const r = rnd(5000 + v), shed = ['#3a5a7a', '#8a9098', '#2f5a4a'][v % 3];
    k.box(26, 10, 16, 0, 0, -10, shed).prism(16.6, 3, 26.6, 0, 10, -10, shade(shed, -0.15), Math.PI / 2).box(8, 8, 0.2, -6, 0, -1.9, '#d8dcd8');
    for (let i = 0; i < 3; i++) {
      const x = -9 + i * 9, z = 6 + (r() - 0.5) * 2, hc = ['#f4f6f8', '#1d3557', '#f4f6f8', '#7a1f2b'][(v + i) % 4], af = ['#b02a2a', '#1a2a4a', '#2a2a2a'][i % 3];
      for (const [px, pz] of [[-1, -2], [1, -2], [-1, 2], [1, 2]]) k.box(0.12, 1.6, 0.12, x + px * 1.1, 0, z + pz, '#d8a020');   // the cradle
      k.ball(1, x, 2.0, z, af, 1.25, 0.75, 4.2, 'lit', 10).ball(1, x, 2.5, z, hc, 1.3, 0.7, 4.4, 'lit', 10).box(0.25, 1.4, 1.8, x, 0.4, z, af);   // the hull, its antifouling, the keel
      k.box(1.6, 0.8, 2.4, x, 3.0, z - 0.4, '#f4f6f8').cyl(0.08, 0.1, 11 + r() * 3, 5, x, 3.0, z - 1.0, '#d8d8d8');   // the cabin, the mast
    }
    for (const sd of [-1, 1]) { k.box(0.5, 8, 0.5, 12 + sd * 3, 0, 1, '#2a6ad0').box(0.5, 8, 0.5, 12 + sd * 3, 0, 9, '#2a6ad0').box(0.5, 0.6, 8.5, 12 + sd * 3, 8, 5, '#2a6ad0'); }   // the travel hoist
    k.box(6.5, 0.6, 0.6, 12, 8, 1, '#2a6ad0').box(6.5, 0.6, 0.6, 12, 8, 9, '#2a6ad0');
  },
  saltpans(k, v) {   // the old salt pans on the marshes towards Keyhaven: shallow square lagoons of still water between grassy banks
    const r = rnd(5100 + v), n = 2 + (v % 2);
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { const x = (i - (n - 1) / 2) * 15, z = (j - 0.5) * 13; k.box(13, 0.08, 11, x, -0.15, z, ['#7a9aaa', '#8aa8b4', '#6a8a9a'][(i + j + v) % 3], 0, 0, 0, 'shiny'); }
    for (let i = 0; i <= n; i++) k.box(1.6, 0.45, 27, (i - n / 2) * 15, -0.2, 0, '#6e7a44');   // the banks between
    for (let j = 0; j < 3; j++) k.box(n * 15 + 1.6, 0.45, 1.6, 0, -0.2, (j - 1) * 13, '#6e7a44');
    for (let i = 0; i < 6; i++) k.card(1.4, 1.0, (r() - 0.5) * n * 15, 0.45, (r() < 0.5 ? -1 : 1) * 13 + (r() - 0.5), ['#a8a060', '#8a9a58'][i % 2], r() * 3, 0, 'grass', 'up');
  },
  egrets(k, v) {   // little egrets stalking the shallows of the marsh: white, slim, an S of a neck, black legs
    const r = rnd(5200 + v), n = 2 + (v % 3);
    for (let i = 0; i < n; i++) {
      const x = (r() - 0.5) * 8, z = (r() - 0.5) * 6, a = r() * 6.28, s = 0.9 + r() * 0.2, fx = Math.sin(a), fz = Math.cos(a);
      for (const o of [-0.06, 0.06]) k.box(0.025, 0.45 * s, 0.025, x + fz * o, 0, z - fx * o, '#1a1a1a');
      k.ball(0.17 * s, x, 0.55 * s, z, '#fbfbf8', 0.75, 0.8, 1.6, 'lit', 8);
      k.ball(0.06 * s, x + fx * 0.22 * s, 0.75 * s, z + fz * 0.22 * s, '#fbfbf8', 1, 2.4, 1, 'lit', 6).ball(0.06 * s, x + fx * 0.3 * s, 0.95 * s, z + fz * 0.3 * s, '#fbfbf8', 1, 1, 1.3, 'lit', 6);   // the neck, the head
      k.box(0.03, 0.03, 0.16 * s, x + fx * 0.4 * s, 0.94 * s, z + fz * 0.4 * s, '#1a1a1a', a);   // the bill
    }
  },
  obelisk(k) {   // the Walhampton monument on the far bank of the river: a tall granite obelisk (1840) above the trees on its low wooded hill
    const G = '#c4beb2', r = rnd(5300);
    k.blob(34, 0, -8, 0, '#4f6e3a', 1.5, 0.42, 1.1, 5301, { smooth: true });
    for (let i = 0; i < 22; i++) { const a = r() * 6.28, d = 8 + r() * 36, x = Math.cos(a) * d * 1.3, z = Math.sin(a) * d * 0.9, y = 6.2 - d * 0.14; k.clump(3 + r() * 2, x, y + 3, z, ['#3e6a32', '#4a7a3a', '#56803e'][i % 3], 5310 + i); }
    k.box(5, 3, 5, 0, 5.6, 0, G, 0, 0, 0, 'stone').box(4, 1.2, 4, 0, 8.6, 0, G, 0, 0, 0, 'stone');
    k.put(new THREE.CylinderGeometry(1.0, 1.75, 22, 4), G, 0, 20.8, 0, 0, Math.PI / 4, 0, 1, 1, 1, 'stone');
    k.put(new THREE.ConeGeometry(1.0, 2.2, 4), G, 0, 32.9, 0, 0, Math.PI / 4, 0, 1, 1, 1, 'stone');
  },
  hurstcastle(k) {   // Hurst Castle at the end of its long shingle spit, seen across the water from the Keyhaven marshes (+X out to sea, the
    // spit along Z): Henry VIII's round keep and bastions, the long granite wings of casemates either side, the tall white lighthouse
    // beyond the west wing and the little red light in front
    const G = '#b4aea2', D = '#8e8a80', r = rnd(5400);
    k.box(46, 1.6, 620, 10, -1.2, 0, '#cbbfa6');   // the spit
    for (let i = 0; i < 9; i++) k.blob(6 + r() * 4, 10 + (r() - 0.5) * 30, -0.6, -300 + i * 75, '#c4b89e', 1.4, 0.18, 2.4, 5410 + i, { smooth: true });
    k.cyl(13, 14, 11, 16, 0, 0, 0, G, 0, 0, 'stone').cyl(7, 7.5, 6, 12, 0, 11, 0, D, 0, 0, 'stone');   // the keep
    for (const a of [0, 2.09, 4.19]) k.cyl(7, 7.4, 7.5, 12, Math.cos(a) * 14, 0, Math.sin(a) * 14, G, 0, 0, 'stone');   // the bastions
    for (const sd of [-1, 1]) {
      k.box(16, 12, 92, 4, 0, sd * 64, G, 0, 0, 0, 'stone').box(16.6, 0.8, 92.6, 4, 12, sd * 64, D, 0, 0, 0, 'stone');   // a wing
      for (let i = 0; i < 12; i++) k.box(0.2, 4.4, 3.2, -4.1, 2.5, sd * (24 + i * 7.2), '#2c2a28');   // its casemate windows (the landward face)
    }
    k.cyl(3.0, 3.6, 30, 14, 2, 0, 128, '#f6f4ee').cyl(3.3, 3.3, 0.6, 14, 2, 30, 128, '#2a2a2a').cyl(2.4, 2.4, 3.0, 12, 2, 30.6, 128, '#e8eef0', 0, 0, 'glow').cone(2.8, 2.2, 12, 2, 33.6, 128, '#2a2a2a');   // the lighthouse
    k.box(4, 7, 4, 2, 0, 112, '#b0282a').box(4.6, 0.6, 4.6, 2, 7, 112, '#2a2a2a');   // the low light, red
  },
  lulcastle(k) {   // Lulworth Castle in its park (its face +Z, to the road): a square hunting lodge of pale stone, three storeys, a big round
    // tower at each corner, battlements all round, tall mullioned windows; the lawn, a gravel sweep and great cedars about it
    const S = '#e6dcc4', D = '#2c3238', r = rnd(5500), W = 26, H = 17, TR = 5.4, TH = 21;
    k.blob(40, 0, -6.6, 0, '#5e8a3c', 1.6, 0.18, 1.3, 5501, { smooth: true });   // the lawn rising to it
    k.box(W, H, W, 0, 0, 0, S, 0, 0, 0, 'stone');
    const merl = (x, z, ry) => k.box(1.0, 1.1, 0.7, x, H, z, S, ry, 0, 0, 'stone');
    for (let i = 0; i < 11; i++) { const u = -W / 2 + 2.6 + i * 2.1; merl(u, W / 2 - 0.3, 0); merl(u, -W / 2 + 0.3, 0); merl(W / 2 - 0.3, u, Math.PI / 2); merl(-W / 2 + 0.3, u, Math.PI / 2); }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = sx * W / 2, z = sz * W / 2;
      k.cyl(TR, TR + 0.2, TH, 16, x, 0, z, S, 0, 0, 'stone').cyl(TR + 0.35, TR + 0.35, 0.5, 16, x, TH - 0.5, z, shade(S, -0.06), 0, 0, 'stone');
      for (let m = 0; m < 10; m++) { const a = m / 10 * 6.283; k.box(1.1, 1.2, 0.8, x + Math.sin(a) * (TR - 0.1), TH, z + Math.cos(a) * (TR - 0.1), S, a, 0, 0, 'stone'); }
      for (const y of [4, 9.5, 15]) k.box(1.2, 2.4, 0.2, x, y, z + TR + 0.02, D, 0, 0, 0, 'shiny').box(0.2, 2.4, 1.2, x + sx * (TR + 0.02), y, z, D, 0, 0, 0, 'shiny');   // tower windows
    }
    for (const y of [3.2, 8.4, 13.4]) for (let i = 0; i < 4; i++) { const x = -7.5 + i * 5; k.box(2.4, 3.0, 0.15, x, y, W / 2 + 0.05, S, 0, 0, 0, 'stone').box(2.0, 2.6, 0.17, x, y + 0.2, W / 2 + 0.06, D, 0, 0, 0, 'shiny').box(0.16, 2.6, 0.2, x, y + 0.2, W / 2 + 0.08, S); }   // the mullioned windows
    k.box(4, 4.6, 0.3, 0, 0, W / 2 + 0.1, '#4a3a2a').box(5, 0.6, 0.4, 0, 4.6, W / 2 + 0.15, S, 0, 0, 0, 'stone');   // the doorway
    for (let i = 0; i < 4; i++) k.box(9 - i * 0.6, 0.35, 1.2, 0, i * 0.35, W / 2 + 1 + (3 - i) * 1.0, '#d8ceb4', 0, 0, 0, 'stone');   // the steps
    k.blob(16, 0, -0.6, W / 2 + 18, '#c9bfa6', 1.6, 0.04, 0.9, 5502, { smooth: true });   // the gravel sweep
    for (const [x, z, sc] of [[-44, -6, 1.3], [40, 10, 1.15], [-34, 26, 1.0], [46, -22, 1.2]]) {   // cedars: a stout trunk, broad flat layers
      k.cyl(0.8 * sc, 1.2 * sc, 7 * sc, 7, x, 0, z, '#5a4632');
      for (let l = 0; l < 4; l++) k.blob(7.5 * sc - l * 1.3 * sc, x + (r() - 0.5) * 2, (5.5 + l * 3) * sc, z + (r() - 0.5) * 2, ['#2c4a32', '#34563a', '#2a4430'][l % 3], 1.5, 0.32, 1.3, 5510 + l + Math.round(x));
    }
  },
  rangeflag(k, v) {   // the army ranges by the road: a tall white pole flying the red flag (firing today), a red-and-white board at its foot (blank)
    k.cyl(0.08, 0.1, 8.5, 6, 0, 0, 0, '#f2f2ee').box(0.04, 1.5, 2.4, 0, 6.8, 1.25, '#d42a2a', 0, 0.12 * (v % 2 ? 1 : -1), 0);
    if (v % 3 === 0) k.box(0.1, 1.6, 0.1, -0.9, 0, 0, '#9aa0a6').box(0.1, 1.6, 0.1, 0.9, 0, 0, '#9aa0a6').box(2.3, 1.4, 0.08, 0, 1.5, 0.05, '#c62828').box(1.9, 0.9, 0.1, 0, 1.75, 0.08, '#f4f4f0');
  },
  tankhulk(k, v) {   // an old tank left on the ranges as a target: a rusting olive hull on its tracks, the turret turned, churned ground round it
    const r = rnd(5600 + v), O = ['#5e5a3a', '#6a5a3a', '#57553a'][v % 3], RU = '#8a5a32', ty = (r() - 0.5) * 1.6;
    k.blob(7, 0, -2.0, 0, '#7a6a4a', 1.4, 0.32, 1.1, 5610 + v, { smooth: true });
    for (const sd of [-1, 1]) k.box(0.9, 1.1, 7.4, sd * 1.75, 0, 0, '#3a3630').box(0.95, 0.35, 7.6, sd * 1.75, 1.05, 0, '#2e2a26');   // the tracks
    k.box(3.2, 1.1, 6.6, 0, 0.8, 0, O).box(3.0, 0.5, 2.2, 0, 1.35, 2.6, O, 0, -0.35, 0).box(1.2, 0.6, 1.4, 0.6, 1.6, -1.4, RU);   // the hull, its sloped front, rust
    k.put(new THREE.CylinderGeometry(1.4, 1.6, 0.9, 10), O, 0, 2.35, -0.4, 0, ty, 0).roll(0.11, 4.2, 6, Math.sin(ty) * 2.4, 2.4, -0.4 + Math.cos(ty) * 2.4, '#4a463a');   // the turret, the gun
    k.box(1.0, 0.5, 1.0, -0.8 + r(), 2.7, -0.6, RU);
  },
  lulcottage(k, v) {   // West Lulworth (its face +Z): cottages of whitewash or grey-cream stone under steep thatch (a slate roof on some),
    // little windows peeping from the thatch, a stone chimney, a low wall and flowers in front; v 5: the thatched inn, longer, its sign
    // (blank) and benches out
    const inn = v % 6 === 5, Wl = ['#f6f2e8', '#d8d0bc', '#f2ede2', '#e4dccb', '#f6f2e8', '#efe8da'][v % 6], slate = v % 6 === 3, T = slate ? '#5a5e66' : ['#c8a868', '#bc9c5c', '#d0b070'][v % 3];
    const len = inn ? 15 : [9, 10.5, 8.5, 11, 9.5][v % 5], r = rnd(5700 + v), stone = Wl === '#d8d0bc' || Wl === '#e4dccb';
    k.box(len, 4.0, 6.4, 0, 0, 0, Wl, 0, 0, 0, stone ? 'stone' : 'lit');
    k.prism(7.6, 3.9, len + 0.9, 0, 3.8, 0, T, Math.PI / 2);   // the roof, steep
    if (!slate) k.box(len + 0.9, 0.4, 0.7, 0, 7.55, 0, shade(T, -0.2));   // the thatch's ridge
    const n = Math.max(2, Math.round(len / 3.4));
    for (let i = 0; i < n; i++) { const x = -len / 2 + len * (i + 0.5) / n;
      if (i !== (n >> 1)) k.box(1.1, 1.1, 0.1, x, 1.1, 3.22, '#f4f1ea').box(0.9, 0.9, 0.12, x, 1.2, 3.23, '#2a3440', 0, 0, 0, 'shiny');
      k.box(1.3, 1.0, 1.3, x, 4.3, 3.0, slate ? Wl : T).box(0.9, 0.7, 0.12, x, 4.4, 3.66, '#2a3440', 0, 0, 0, 'shiny'); }   // windows, and the little ones up in the roof
    k.box(1.0, 2.1, 0.12, -len / 2 + len * ((n >> 1) + 0.5) / n, 0, 3.23, ['#2f5a3a', '#1d3557', '#7a1f2b', '#4a3a2a'][v % 4]);
    k.box(1.3, 2.6, 1.2, len / 2 - 1.2, 6.3, -0.6, '#b8ae98', 0, 0, 0, 'stone');
    k.box(len + 1, 0.9, 0.5, 0, 0, 5.4, '#c8beaa', 0, 0, 0, 'stone');   // the front wall
    for (let i = 0; i < 6; i++) k.ball(0.26, -len / 2 + 0.8 + r() * (len - 1.6), 1.05, 5.4, ['#e63946', '#ff7eb6', '#ffd23f', '#9b5de5'][i % 4], 1, 1, 1, 'lit', 6);
    if (inn) { k.box(0.1, 0.1, 1.2, len / 2 - 0.4, 3.2, 4.1, '#1a1a1a').box(0.08, 1.2, 0.9, len / 2 - 0.4, 1.9, 4.4, '#5a2a1a'); for (const x of [-4, 3]) k.box(2.4, 0.45, 0.6, x, 0.45, 4.4, '#6a4e34').box(2.4, 0.08, 1.5, x, 0.85, 4.4, '#8a6a48'); }
  },
  lulcove(k) {   // Lulworth Cove from its beach (+X out to sea, the beach at the near side, y 0 the sea): the near-round bay in its ring of chalk
    // and limestone cliffs, turf on top, the narrow mouth to the open sea at the far side; boats on the shingle and at their moorings
    const r = rnd(5800), cx = 110, R = 92, chalk = '#ece6d6', lime = '#cfc6ae', turf = '#6e9446';
    for (let i = 0; i < 26; i++) {   // the ring, both sides of the bay round to the mouth (the near side left for the beach, the far side open)
      const side = i % 2 ? 1 : -1, j = i >> 1, a = side * (0.62 + j * 0.19), x = cx - Math.cos(a) * R, z = Math.sin(a) * R, back = j > 9;
      const h = back ? 2.0 - (j - 9) * 0.35 : 1.15 + Math.sin(j / 9 * Math.PI) * 0.75;
      k.blob(15.5 + r() * 3.5, x - Math.cos(a) * 8, -4, z + Math.sin(a) * 8, turf, 1.2, h * 1.15, 1.2, 5810 + i, { rock: back ? lime : chalk, wet: true, smooth: true });
    }
    k.blob(26, cx - R - 2, -1.6, 0, '#cbbf9e', 0.9, 0.08, 2.3, 5850, { smooth: true });   // the shingle beach round the near side
    for (let i = 0; i < 7; i++) { const a = (r() - 0.5) * 1.6; k.ball(1, cx - Math.cos(a) * (R - 6) + 2, 0.7, Math.sin(a) * (R - 6), ['#f4f4f0', '#2a6ad0', '#c0392b', '#f2c94c'][i % 4], 1.2, 0.5, 2.6, 'lit', 8); }   // boats pulled up
    for (let i = 0; i < 9; i++) { const x = cx - 40 + r() * 80, z = (r() - 0.5) * 100; k.ball(1, x, 0.25, z, ['#f4f4f0', '#1d3557', '#f4f4f0'][i % 3], 1.3, 0.45, 3.2, 'lit', 8); if (i % 3 === 0) k.cyl(0.06, 0.08, 8, 4, x, 0.4, z, '#d8d8d8'); }   // boats at their moorings
  },
  parade(k, v) {   // a Bournemouth shopping parade (Winton Banks, Moordown, Charminster Road; its face +Z): Edwardian red brick, three
    // storeys, a gable or dormers over two-storey bay windows, stone bands, chimneys; two shops below with coloured fascias (no
    // lettering), big windows, an awning on some. v 0-7 by day; v 8-15 at night: the fascias and windows lit, the upper windows warm
    const night = v >= 8, u = v % 8, r = rnd(6000 + v);
    const B = ['#a4462f', '#9a3e2c', '#b0543a', '#efe4c8', '#a85036', '#8e3a28', '#f2ede2', '#9c4430'][u], render = u === 3 || u === 6;
    const S = '#e8e0cc', W = 11, H = 10.4, gable = u % 3 !== 2, flat = render;
    k.box(W, H, 9, 0, 0, 0, B, 0, 0, 0, render ? 'lit' : 'stone');
    for (const y of [4.2, 7.3]) k.box(W + 0.1, 0.3, 9.1, 0, y, 0, S);   // the stone bands
    if (flat) k.box(W + 0.2, 1.0, 9.2, 0, H, 0, B).box(W + 0.3, 0.2, 9.3, 0, H + 1.0, 0, S);   // a parapet (the 1930s ones)
    else { k.prism(9.4, 3.6, W + 0.3, 0, H, 0, '#4c5058', Math.PI / 2);
      if (gable) { k.prism(0.6, 3.6, 6, -W / 4, H, 4.3, B, 0).prism(0.7, 3.7, 6.3, -W / 4, H - 0.05, 4.6, '#f4f1ea', 0); k.box(1.4, 1.5, 0.12, -W / 4, H + 0.5, 4.62, '#2a3440', 0, 0, 0, night && r() < 0.6 ? 'glow' : 'shiny'); }   // a front gable, white bargeboards, its window
      else for (const x of [-W / 4, W / 4]) k.box(1.8, 1.6, 1.6, x, H + 0.5, 3.6, '#4c5058').box(1.2, 1.0, 0.12, x, H + 0.8, 4.42, '#5a7890', 0, 0, 0, 'shiny'); }   // dormers
    for (const sd of [-1, 1]) k.box(1.1, 2.4, 1.6, sd * (W / 2 - 0.5), H + (flat ? 1.2 : 1.8), -1, B, 0, 0, 0, render ? 'lit' : 'stone');   // chimneys
    for (const x of [-W / 4, W / 4]) {   // two-storey bays (or flat windows on the 1930s ones), lit warm at night here and there
      for (const y of [4.6, 7.7]) {
        const lit = night && r() < 0.55, gl = lit ? '#ffd890' : '#5a7890', key = lit ? 'glow' : 'shiny';
        if (flat) k.box(2.6, 1.8, 0.12, x, y, 4.52, '#f4f1ea').box(2.3, 1.5, 0.14, x, y + 0.15, 4.53, gl, 0, 0, 0, key);
        else k.box(2.8, 2.2, 0.9, x, y - 0.1, 4.8, S).box(2.4, 1.7, 0.12, x, y + 0.15, 5.26, gl, 0, 0, 0, key).box(0.12, 1.7, 0.7, x - 1.25, y + 0.15, 4.9, gl, 0, 0, 0, key).box(0.12, 1.7, 0.7, x + 1.25, y + 0.15, 4.9, gl, 0, 0, 0, key);
      }
    }
    const FAS = night ? ['#28e070', '#3a8cff', '#b04aff', '#ff4060', '#ffd040', '#30e0e0', '#ff8a30', '#f4f4f4'] : ['#2f6a4a', '#1d3557', '#7a1f2b', '#c9a227', '#3a5a7a', '#2a2a2a', '#5a2a6a', '#b0543a'];
    for (const sd of [-1, 1]) {   // the two shops: a fascia (lettering left off), the window, the door, a pilaster between
      const x = sd * W / 4, f = FAS[(u * 3 + (sd > 0 ? 1 : 0) + v) % 8];
      k.box(W / 2 - 0.5, 0.75, 0.3, x, 3.15, 4.55, f, 0, 0, 0, night ? 'glow' : 'lit');
      k.box(W / 2 - 1.6, 2.5, 0.12, x - 0.4, 0.45, 4.52, night ? ['#fff0c8', '#ffe4a0', '#e8f4ff'][(u + (sd > 0 ? 1 : 0)) % 3] : '#5a7890', 0, 0, 0, night ? 'glow' : 'shiny');
      k.box(1.0, 2.8, 0.13, x + W / 4 - 0.9, 0, 4.53, night ? '#ffe8b0' : '#1a1a1a', 0, 0, 0, night ? 'glow' : 'lit');
      if (!night && r() < 0.35) for (let i = 0; i < 5; i++) k.box((W / 2 - 0.6) / 5, 0.15, 1.4, x - (W / 2 - 0.6) / 2 + (i + 0.5) * (W / 2 - 0.6) / 5, 2.75, 5.2, i % 2 ? '#f4f1ea' : f, 0, -0.35);   // an awning
      if (night && r() < 0.4) for (let i = 0; i < 4; i++) k.box(0.6, 0.5, 0.6, x - 1.6 + i * 0.9, 0.2, 5.0, ['#e63946', '#ffd23f', '#7cc576', '#ff9a3c'][i], 0, 0, 0, 'lit');   // fruit out front
    }
    k.box(0.5, 3.6, 0.4, 0, 0, 4.58, S).box(0.5, 3.6, 0.4, -W / 2 + 0.25, 0, 4.58, S).box(0.5, 3.6, 0.4, W / 2 - 0.25, 0, 4.58, S);   // the pilasters
  },
  nightparade(k, v) { MODELS.parade(k, 8 + (v % 8)); },   // (Charminster Road at night: the restaurants lit)
  cornerbank(k) {   // the old bank on the corner at Winton Banks (its face +Z): red brick dressed in pale stone, three storeys, a little
    // pyramid-roofed turret on the corner, stone bands and window surrounds, a blue door under a stone hood, its name panel left blank
    const B = '#a4462f', S = '#e2d6bc', D = '#2a3440';
    k.box(14, 10, 12, 0, 0, 0, B, 0, 0, 0, 'stone').prism(12.6, 3.6, 14.4, 0, 10, 0, '#4c5058', Math.PI / 2);
    for (const y of [0, 3.8, 7.0]) k.box(14.2, 0.45, 12.2, 0, y + (y ? 0 : 0.0), 0, S, 0, 0, 0, 'stone');
    k.box(14.2, 1.0, 12.2, 0, 0, 0, S, 0, 0, 0, 'stone');   // the stone plinth
    k.prism(0.8, 4.2, 5.4, -3.5, 10, 6.1, B, 0).prism(0.9, 4.3, 5.8, -3.5, 9.95, 6.35, S, 0);   // a stone-edged gable over the front
    k.cyl(2.4, 2.4, 13.2, 8, 7, 0, 6, B, 0, 0, 'stone').cone(2.9, 3.6, 8, 7, 13.2, 6, '#4c5058').cyl(0.08, 0.08, 1.2, 4, 7, 16.8, 6, '#2a2a2a');   // the corner turret
    for (const y of [1.4, 4.5, 7.6]) for (const x of [-5, -1.8, 2]) k.box(1.9, 2.2, 0.14, x, y, 6.06, S, 0, 0, 0, 'stone').box(1.5, 1.9, 0.16, x, y + 0.15, 6.07, D, 0, 0, 0, 'shiny');
    for (const y of [4.5, 7.6]) k.box(1.4, 2.0, 0.14, 7 + 1.7, y, 6 + 1.7, D, -0.785, 0, 0, 'shiny');
    k.box(1.6, 2.9, 0.16, 7, 0, 8.45, '#1d3a8a').box(2.4, 0.5, 0.6, 7, 3.0, 8.5, S, 0, 0, 0, 'stone').box(3, 0.7, 0.16, -2, 3.0, 6.08, S, 0, 0, 0, 'stone');   // the blue door under its hood; the blank name panel
  },
  brickchurch(k) {   // St Luke's, Winton (its face +Z): a tall Victorian red-brick church side-on to the road, a great pointed window in
    // its gable end, buttresses, a steep slate roof, a bellcote; railings and a noticeboard (blank) in front
    const B = '#9a3e2c', S = '#d8ccb0', R = '#4c5058';
    k.box(12, 11, 26, 0, 0, -6, B, 0, 0, 0, 'stone').prism(12.6, 8, 26.6, 0, 11, -6, R, 0);   // the nave, its gable end to the road
    k.prism(0.8, 8.2, 12.6, 0, 11, 7.3, B, Math.PI / 2);
    k.box(5.4, 8.4, 0.14, 0, 2.6, 7.06, S, 0, 0, 0, 'stone').put(new THREE.CylinderGeometry(2.7, 2.7, 0.14, 12, 1, false, -Math.PI / 2, Math.PI), S, 0, 11.0, 7.06, Math.PI / 2, 0, 0, 1, 1, 1, 'stone');
    k.box(4.8, 8.2, 0.16, 0, 2.7, 7.08, '#2b3540', 0, 0, 0, 'shiny').put(new THREE.CylinderGeometry(2.4, 2.4, 0.16, 12, 1, false, -Math.PI / 2, Math.PI), '#2b3540', 0, 10.9, 7.08, Math.PI / 2, 0, 0, 1, 1, 1, 'shiny');   // the great window
    for (const x of [-1.6, 0, 1.6]) k.box(0.12, 9.5, 0.2, x, 2.7, 7.1, S, 0, 0, 0, 'stone');   // its mullions
    for (const x of [-6.3, 6.3]) k.box(1.0, 9, 1.4, x, 0, 6.5, B, 0, 0, 0, 'stone');   // buttresses
    for (let i = 0; i < 4; i++) { const z = 2 - i * 6; for (const sd of [-1, 1]) k.box(0.14, 4.4, 1.6, sd * 6.06, 3, z, '#2b3540', 0, 0, 0, 'shiny'); }
    k.box(1.6, 3.0, 1.2, 0, 19, 7, B, 0, 0, 0, 'stone').prism(1.4, 1.2, 2.0, 0, 22, 7, R, Math.PI / 2);   // the bellcote
    for (let i = 0; i < 16; i++) k.box(0.05, 1.2, 0.05, -7.5 + i, 0, 9.5, '#1a1a1a'); k.box(15, 0.06, 0.06, 0, 1.15, 9.5, '#1a1a1a');   // the railings
  },
  moderne(k) {   // the old Moderne cinema at Winton (art deco, now a church centre; its face +Z): a white stepped front, a tall fin up
    // the middle, horizontal bands, a long canopy over the doors; the hall behind in brick
    const W = '#f4f2ec', G = '#2a3440';
    k.box(22, 9, 26, 0, 0, -10, '#a4462f', 0, 0, 0, 'stone').box(22.4, 0.5, 26.4, 0, 9, -10, '#d8d0c0');
    k.box(18, 11, 3, 0, 0, 3, W).box(12, 13.5, 2.6, 0, 0, 3.3, W).box(2.4, 17, 2.4, 0, 0, 4.4, W);   // the stepped white front, the fin
    for (const y of [7.6, 9.2]) k.box(18.2, 0.25, 3.2, 0, y, 3, '#cfd8dc');   // the bands
    for (let i = 0; i < 5; i++) k.box(0.9, 3.6, 0.12, -9 + 1.4 + i * 1.6 + (i > 1 ? 9.6 : 0), 6.4, 4.56, G, 0, 0, 0, 'shiny');   // tall thin windows either side
    k.box(16, 0.5, 2.6, 0, 3.6, 5.6, W).box(14, 3.2, 0.14, 0, 0.2, 4.56, G, 0, 0, 0, 'shiny');   // the canopy, the glass doors
    for (const y of [11, 13]) k.box(2.5, 0.25, 2.5, 0, y, 4.4, '#cfd8dc');
  },
  policestn(k) {   // Winton's 1960s police station (its face +Z): two storeys of long windows over a pale blue band of panels, buff brick
    // ends, a low green copper roof, the blue lamp (glow) by the door
    const Y = '#c8a870', BL = '#7ea8d8', G = '#2a3440';
    k.box(30, 7.6, 12, 0, 0, 0, '#e8e8e2').box(30.6, 0.9, 12.6, 0, 7.6, 0, '#5aa898');   // the block, the copper roof's edge
    k.prism(12.6, 1.4, 30.6, 0, 8.5, 0, '#5aa898', Math.PI / 2);
    for (const x of [-14.2, 14.2]) k.box(1.8, 7.6, 12.2, x, 0, 0, Y, 0, 0, 0, 'stone');   // the buff brick ends
    k.box(26.6, 1.6, 0.12, 0, 3.0, 6.06, BL);   // the blue band
    for (let i = 0; i < 8; i++) k.box(1.0, 0.8, 0.14, -11.6 + i * 3.3, 3.4, 6.08, '#f4f4f4');   // its pale crosses
    for (const y of [0.8, 4.9]) for (let i = 0; i < 10; i++) k.box(2.2, 1.9, 0.14, -12.2 + i * 2.7, y, 6.07, G, 0, 0, 0, 'shiny');
    k.box(4, 2.6, 2.4, -2, 0, 7, '#f0f0ea').box(0.4, 0.4, 0.4, -2, 3.4, 8.2, '#3a7aff', 0, 0, 0, 'glow');   // the porch, the blue lamp
  },
  vicvilla(k, v) {   // a Victorian villa off Wimborne Road (Dean Park; its face +Z): red brick or cream render, a front gable with white
    // bargeboards over a two-storey bay, tall chimneys, behind a low wall and a hedge, a Scots pine or two in the garden (Bournemouth's pines)
    const B = ['#a4462f', '#efe4c8', '#9a3e2c', '#e8dcc0'][v % 4], R = '#4c5058', r = rnd(6100 + v), render = v % 2 === 1;
    k.box(12, 7.4, 10, 0, 0, 0, B, 0, 0, 0, render ? 'lit' : 'stone').prism(10.6, 4.4, 12.4, 0, 7.4, 0, R, Math.PI / 2);
    k.prism(0.8, 4.6, 6.6, -2.6, 7.4, 5.1, B, 0).prism(0.7, 4.8, 7.0, -2.6, 7.3, 5.45, '#f4f1ea', 0);   // the gable, its bargeboards
    k.box(4.2, 6.6, 1.4, -2.6, 0.6, 5.6, B, 0, 0, 0, render ? 'lit' : 'stone');
    for (const y of [1.4, 4.4]) k.box(3.4, 2.0, 0.12, -2.6, y, 6.32, '#5a7890', 0, 0, 0, 'shiny');
    for (const y of [1.4, 4.4]) k.box(1.4, 1.9, 0.12, 2.6, y, 5.06, '#5a7890', 0, 0, 0, 'shiny');
    k.box(1.2, 2.3, 0.12, 4.6, 0, 5.06, ['#2f5a3a', '#7a1f2b', '#1d3557'][v % 3]);
    for (const x of [-5.4, 5.0]) k.box(1.0, 3.2, 1.2, x, 9.8, -1, B);
    k.box(13, 0.9, 0.4, 0, 0, 9.2, '#c8beaa', 0, 0, 0, 'stone').box(13, 1.6, 0.9, 0, 0.9, 8.9, '#3f6a34');   // the wall and hedge
    if (v % 2 === 0) { const x = (r() < 0.5 ? -1 : 1) * 8; k.cyl(0.3, 0.45, 11, 6, x, 0, 6, '#a0603a'); for (let i = 0; i < 5; i++) k.clump(2.2 - i * 0.2, x + (r() - 0.5) * 2, 10 + i * 1.3, 6 + (r() - 0.5) * 2, ['#1f4d2e', '#2a6136'][i % 2], 6110 + v * 7 + i); }
  },
  semis(k, v) {   // a pair of 1930s semis (Moordown, Queens Park; their face +Z): pebbledash or brick below, two-storey bays, a hipped
    // tiled roof, porches, low front walls and a car on the drive
    const P = ['#e8e2d4', '#d8cdb8', '#f0ece2', '#c8b8a0'][v % 4], BR = '#9a4a34', T = ['#7a4a3a', '#5e5550', '#8a5a44'][v % 3], r = rnd(6200 + v);
    k.box(16, 6.4, 9, 0, 0, 0, P).box(16.1, 2.6, 9.1, 0, 0, 0, BR, 0, 0, 0, 'stone');
    k.put(new THREE.ConeGeometry(11.2, 4.6, 4), T, 0, 8.7, 0, 0, Math.PI / 4, 0, 1, 1, 0.6, 'lit');   // the hipped roof
    for (const sd of [-1, 1]) {
      const x = sd * 4.4;
      k.box(3.4, 5.6, 1.0, x, 0.4, 4.9, P).box(3.0, 1.6, 0.12, x, 1.2, 5.42, '#5a7890', 0, 0, 0, 'shiny').box(3.0, 1.6, 0.12, x, 4.0, 5.42, '#5a7890', 0, 0, 0, 'shiny');   // the bays
      k.box(1.6, 0.3, 1.4, sd * 7.0, 2.6, 5.2, T).box(1.0, 2.2, 0.12, sd * 7.0, 0, 4.56, ['#2f5a3a', '#7a1f2b', '#1d3557', '#f4f4f0'][(v + (sd > 0 ? 1 : 0)) % 4]);   // porch, door
      k.box(8, 0.8, 0.35, x, 0, 9.6, BR, 0, 0, 0, 'stone');
    }
    k.box(1.1, 2.4, 1.1, 0, 7.2, 0, BR, 0, 0, 0, 'stone');
    if (r() < 0.6) { const c = ['#c62828', '#1d3557', '#e8e8e8', '#2a2a2a', '#3a6a9a'][(v + 2) % 5], x = (r() < 0.5 ? -1 : 1) * 4.4; k.box(1.8, 0.8, 4.2, x, 0.3, 7.6, c, 0, 0, 0, 'shiny').box(1.6, 0.6, 2.2, x, 1.1, 7.4, '#5a7890', 0, 0, 0, 'shiny'); }   // a car on the drive
  },
  richmondpub(k) {   // The Richmond on Charminster Road at night (its face +Z): Edwardian red brick, a big curved Dutch gable with its name
    // band (left blank), bay windows lit warm, hanging baskets, lamps over the doors
    const B = '#9a3e2c', S = '#e8e0cc';
    k.box(18, 9.4, 11, 0, 0, 0, B, 0, 0, 0, 'stone').prism(11.6, 3.4, 18.4, 0, 9.4, 0, '#4c5058', Math.PI / 2);
    k.box(8, 3.6, 0.8, 0, 9.4, 5.2, B, 0, 0, 0, 'stone').put(new THREE.CylinderGeometry(4, 4, 0.8, 16, 1, false, -Math.PI / 2, Math.PI), B, 0, 13.0, 5.2, Math.PI / 2, 0, 0, 1, 0.6, 1, 'stone');   // the curved gable
    k.box(6.4, 0.7, 0.2, 0, 10.2, 5.65, '#1d3a2a').box(1.6, 1.4, 0.14, 0, 11.4, 5.66, '#ffd890', 0, 0, 0, 'glow');   // the blank name band, the gable window lit
    for (const y of [3.8, 9.0]) k.box(18.2, 0.35, 11.2, 0, y, 0, S);
    for (const x of [-5.5, 5.5]) { k.box(4.4, 3.4, 1.4, x, 0.4, 6.0, S).box(3.8, 2.6, 0.14, x, 0.8, 6.72, '#ffd890', 0, 0, 0, 'glow'); k.box(2.4, 2.0, 0.14, x, 5.2, 5.56, '#ffcf80', 0, 0, 0, 'glow'); }   // the bays, lit
    k.box(1.6, 2.8, 0.14, 0, 0, 5.57, '#ffe0a0', 0, 0, 0, 'glow').ball(0.3, 0, 3.4, 6.0, '#fff2c0', 1, 1, 1, 'glow', 8);
    for (const x of [-8, -3, 3, 8]) k.ball(0.45, x, 4.3, 6.2, ['#e63946', '#ff7eb6', '#ffd23f', '#9b5de5'][Math.abs(x) % 4], 1, 0.8, 1, 'lit', 6);
  },
  busstop(k, v) {   // a bus shelter (its face +Z, to the road): glass sides and back on a dark frame, a bench, the stop's flag on its pole
    // (blank), a timetable case
    const F = '#2a2e36', G = '#a8c8d8';
    k.box(4.2, 0.12, 1.6, 0, 2.5, 0, F).box(4.0, 2.3, 0.06, 0, 0.15, -0.75, G, 0, 0, 0, 'shiny');
    for (const x of [-2.05, 2.05]) k.box(0.08, 2.5, 1.5, x, 0, 0, G, 0, 0, 0, 'shiny').box(0.1, 2.6, 0.1, x, 0, 0.75, F);
    k.box(3, 0.1, 0.4, 0, 0.55, -0.45, '#8a8f98');
    k.cyl(0.05, 0.05, 2.8, 5, 2.9, 0, 0.6, '#c0c4c8').box(0.06, 0.55, 0.55, 2.9, 2.5, 0.6, v % 2 ? '#c62828' : '#1d5fae').box(0.4, 0.6, 0.08, 2.9, 1.4, 0.68, '#f4f4f4');
  },
  zebra(k) {   // a zebra crossing's Belisha beacons (the road runs along Z, across is X): an amber globe on a black-and-white pole each side
    // (its stripes are painted on the road itself: world3d.js, seg.zebra)
    for (const sd of [-1, 1]) {
      const x = sd * 8.6;
      for (let j = 0; j < 6; j++) k.cyl(0.07, 0.07, 0.45, 6, x, j * 0.45, -1.6, j % 2 ? '#f4f4f4' : '#1a1a1a');
      k.ball(0.3, x, 2.95, -1.6, '#ffae1a', 1, 1, 1, 'glow', 10);
    }
  },
  kinsonchurch(k) {   // St Andrew's, Kinson (its face +Z): the old smugglers' church - a squat square tower of rust-brown heathstone with
    // battlements and a clock face (no numbers), the nave and porch of the same stone under red tiles, gravestones in the grass
    const H = '#8a5634', H2 = '#7a4a2c', T = '#9a4a34', r = rnd(6300);
    k.box(6.6, 15, 6.6, 9, 0, 0, H, 0, 0, 0, 'stone');
    for (let i = 0; i < 5; i++) for (const [x, z] of [[9 - 2.7 + i * 1.35, 3.1], [9 - 2.7 + i * 1.35, -3.1], [9 - 3.1, -2.7 + i * 1.35], [9 + 3.1, -2.7 + i * 1.35]]) k.box(0.8, 1.0, 0.8, x, 15, z, H2, 0, 0, 0, 'stone');   // the battlements
    for (const y of [5, 10]) k.box(6.9, 0.3, 6.9, 9, y, 0, H2, 0, 0, 0, 'stone');
    k.cyl(0.9, 0.9, 0.12, 14, 9, 11.2, 3.33, '#f2efe6', Math.PI / 2).box(0.06, 0.6, 0.05, 9, 11.4, 3.42, '#1a1a1a').box(0.45, 0.06, 0.05, 9.2, 11.75, 3.42, '#1a1a1a');   // the clock
    k.box(1.0, 2.4, 0.14, 9, 7.2, 3.32, '#2a2a2a', 0, 0, 0, 'shiny').box(1.4, 2.4, 0.14, 9, 0, 3.34, '#4a3020');   // a window, the west door
    k.box(16, 6.4, 8.4, -2.5, 0, 0, H, 0, 0, 0, 'stone').prism(9.2, 4.4, 16.4, -2.5, 6.4, 0, T, Math.PI / 2);   // the nave, red tiles
    for (const x of [-7.5, -3, 1.5]) k.box(1.0, 2.6, 0.14, x, 2.2, 4.22, '#2b3540', 0, 0, 0, 'shiny');
    k.box(3.2, 3.2, 3, -2.5, 0, 5.4, H2, 0, 0, 0, 'stone').prism(3.6, 1.8, 3.4, -2.5, 3.2, 5.4, T, 0);   // the porch
    for (let i = 0; i < 18; i++) { const x = -14 + r() * 28, z = 8 + r() * 9; k.box(0.7, 0.7 + r() * 0.5, 0.15, x, 0, z, ['#9a9a94', '#8a8680', '#a8a49c'][i % 3], (r() - 0.5) * 0.2); }
    k.box(34, 1.0, 0.5, 0, 0, 18, '#7a5a3c', 0, 0, 0, 'stone');   // the churchyard wall
    for (const [x, z] of [[-16, 2], [17, 8]]) k.cyl(0.35, 0.5, 4, 6, x, 0, z, '#4a3a2a').clump(3.4, x, 6.4, z, '#203c26', 6310 + x).clump(2.6, x + 0.8, 9, z, '#284a2e', 6320 + x);   // yews
  },
  flatparade(k, v) {   // a 1960s shopping parade (Kinson; its face +Z): two floors of flats over the shops, a flat roof, long windows and
    // balconies, buff or brown brick, the shops' fascias (no lettering) under a deep concrete canopy
    const B = ['#b8946a', '#8a5a3c', '#c8b090', '#9a6a4a'][v % 4], r = rnd(6400 + v), W = 16, FAS = ['#2f6a4a', '#1d3557', '#7a1f2b', '#c9a227', '#3a5a7a', '#c62828'];
    k.box(W, 9.6, 10, 0, 0, 0, B, 0, 0, 0, 'stone').box(W + 0.4, 0.5, 10.4, 0, 9.6, 0, '#d8d4cc');
    k.box(W + 0.6, 0.45, 2.4, 0, 3.6, 5.6, '#d8d4cc');   // the canopy over the pavement
    for (let i = 0; i < 3; i++) { const x = -W / 3 + i * W / 3; k.box(W / 3 - 0.6, 0.6, 0.2, x, 3.0, 5.06, FAS[(v + i) % 6]).box(W / 3 - 1.4, 2.4, 0.12, x - 0.3, 0.4, 5.04, '#5a7890', 0, 0, 0, 'shiny'); }
    for (const y of [4.6, 7.2]) { k.box(W - 1, 1.5, 0.12, 0, y, 5.04, '#5a7890', 0, 0, 0, 'shiny'); for (let i = 0; i < 4; i++) k.box(0.15, 1.6, 0.16, -W / 2 + 0.5 + i * (W - 1) / 3, y, 5.06, '#f4f4f0'); }   // the flats' long windows
    if (v % 2) for (const x of [-4, 4]) k.box(3.4, 0.15, 1.2, x, 6.6, 5.6, '#d8d4cc').box(3.4, 0.9, 0.08, x, 6.75, 6.2, '#5a6068');   // balconies
  },
  commcentre(k) {   // Kinson's community centre at Pelhams Park (its face +Z): a long low white building, a dark blue band along its front
    // (its name left off), a glazed entrance, the park's lawn and trees about it
    k.box(26, 5, 12, 0, 0, 0, '#f2f2ee').box(26.4, 0.4, 12.4, 0, 5, 0, '#c8ccd0').box(16, 1.2, 0.14, -2, 3.6, 6.06, '#1d3a8a');
    for (let i = 0; i < 7; i++) k.box(1.6, 1.8, 0.12, -11 + i * 3.4, 1.2, 6.05, '#5a7890', 0, 0, 0, 'shiny');
    k.box(4, 3, 2, 8, 0, 7, '#e8e8e2').box(3.4, 2.4, 0.12, 8, 0.1, 8.02, '#5a7890', 0, 0, 0, 'shiny');
    k.blob(22, 0, -2.4, 14, '#5e9a3e', 1.4, 0.12, 0.8, 6501, { smooth: true });
  },
  throopmill(k) {   // Throop Mill on the Stour (its face +Z, to the lane; the river behind it, along X): a tall red-brick flour mill, three
    // storeys and an attic, slate roof, the white boarded hoist gable jutting from the top, a white painted band (its name left off),
    // white doors; the millpond and weir below, a willow
    const B = '#a4462f', R = '#4c5058', W = '#f2efe6';
    k.box(18, 11, 11, 0, 0, 0, B, 0, 0, 0, 'stone').prism(12, 4.6, 18.4, 0, 11, 0, R, Math.PI / 2);
    k.box(3, 3, 2, -3, 11.4, 5.4, W).prism(3.4, 1.6, 2.4, -3, 14.4, 5.4, R, 0);   // the lucam, the hoist gable
    k.box(12, 1.2, 0.14, 3, 7.6, 5.56, W);   // the painted band (left blank)
    for (const y of [1.6, 4.8, 8.4]) for (const x of [-6.5, -2, 5, 7.5]) k.box(1.2, 1.6, 0.14, x, y, 5.56, '#2a3440', 0, 0, 0, 'shiny');
    k.box(2.2, 3.2, 0.16, 1.6, 0, 5.58, W).box(2.0, 2.6, 0.16, -3, 3.6, 5.58, W);   // the doors
    k.box(30, 0.3, 14, 0, -1.2, -13, '#4a7a8a', 0, 0, 0, 'shiny').box(0.8, 1.0, 14, -6, -1.2, -13, '#8a8478', 0, 0, 0, 'stone');   // the millpond, the weir
    k.cyl(0.5, 0.7, 4, 6, 12, 0, -6, '#5a4632'); for (let i = 0; i < 6; i++) k.clump(2.6, 12 + Math.cos(i) * 2, 5 + (i % 3) * 1.2, -6 + Math.sin(i) * 2, ['#7a9a4a', '#8aa856'][i % 2], 6600 + i);   // a willow
  },
  riverseg(k, v) {   // a stretch of the River Stour beside the lane (along Z): dark slow water between grassy banks, reeds along the edges,
    // a willow or an alder now and then
    const r = rnd(6700 + v);
    k.box(15.6, 0.3, 10.4, 0, -0.1, 0, '#5a7a44').box(14, 0.2, 9.4, 0, 0.12, 0, '#3a6a78', 0, 0, 0, 'shiny');   // its grassy banks, the water (proud of the meadow's bumps: lower, the ground hid it)
    for (let i = 0; i < 5; i++) k.card(1.6, 1.3, (r() < 0.5 ? -6.6 : 6.6) + (r() - 0.5), 0.1, (r() - 0.5) * 8, ['#a8a060', '#7a9a4a'][i % 2], r() * 3, 0, 'grass', 'up');
    if (v % 3 === 0) { const x = (r() < 0.5 ? -1 : 1) * 8.5; k.cyl(0.35, 0.5, 3.4, 6, x, -0.2, 0, '#5a4632'); for (let i = 0; i < 4; i++) k.clump(2.2, x + (r() - 0.5) * 2, 4 + i * 0.8, (r() - 0.5) * 2, ['#6a8a42', '#7a9a4a'][i % 2], 6710 + v * 5 + i); }
  },
  estatehouse(k, v) {   // 1970s-80s estate houses (Muscliff, Littledown; their face +Z): a short terrace or a pair in brown or red brick, dark
    // concrete-tiled roofs, white windows, a garage or a car, little open-plan front lawns
    const B = ['#8a5a3c', '#9a4a34', '#a8784e', '#7a4a32'][v % 4], T = ['#4a4440', '#5a4a44', '#3e3a38'][v % 3], n = 2 + (v % 2), r = rnd(6800 + v);
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 6.4;
      k.box(6.2, 5.6, 8, x, 0, 0, B, 0, 0, 0, 'stone');
      k.box(2.2, 1.2, 0.12, x - 1.3, 1.0, 4.03, '#f4f4f0').box(2.0, 1.0, 0.13, x - 1.3, 1.1, 4.04, '#5a7890', 0, 0, 0, 'shiny');
      k.box(2.6, 1.2, 0.12, x, 3.4, 4.03, '#f4f4f0').box(2.4, 1.0, 0.13, x, 3.5, 4.04, '#5a7890', 0, 0, 0, 'shiny');
      k.box(1.0, 2.1, 0.12, x + 1.8, 0, 4.03, ['#f4f4f0', '#2f5a3a', '#7a1f2b', '#1d3557'][(v + i) % 4]);
    }
    k.prism(9, 3.2, n * 6.4 + 0.4, 0, 5.6, 0, T, Math.PI / 2);
    k.blob(10, 0, -1.0, 7.6, '#6aa848', n * 0.34, 0.1, 0.32, 6810 + v, { smooth: true });   // the lawns
    if (r() < 0.6) { const c = ['#c62828', '#e8e8e8', '#1d3557', '#2a2a2a', '#7a8a9a'][v % 5], x = (n - 1) / 2 * 6.4; k.box(1.8, 0.8, 4.2, x, 0.3, 8.4, c, 0, 0, 0, 'shiny').box(1.6, 0.6, 2.2, x, 1.1, 8.2, '#5a7890', 0, 0, 0, 'shiny'); }
  },
  castlepoint(k) {   // Castlepoint shopping centre (its face +Z, to the road across its car park): a long low run of big stores in white and
    // grey cladding under one sweeping white canopy on slender posts, glass fronts, the anchor store's tall white gable (no lettering)
    const W = '#eef0f2', G = '#c4c8cc';
    k.box(140, 9, 30, 0, 0, 0, G).box(140.4, 0.6, 30.4, 0, 9, 0, W);
    for (let i = 0; i < 10; i++) k.box(12, 6, 0.14, -63 + i * 14, 0.3, 15.04, '#2a3440', 0, 0, 0, 'shiny').box(12.4, 1.4, 0.2, -63 + i * 14, 6.8, 15.1, ['#1d3557', '#2f6a4a', '#c62828', '#3a5a7a', '#5a2a6a'][i % 5]);
    const cv = new THREE.CylinderGeometry(9, 9, 142, 18, 1, true, Math.PI * 0.12, Math.PI * 0.42); k.put(cv, W, 0, 7, 22, 0, 0, Math.PI / 2, 1, 0.5, 1, 'lit');   // the sweeping canopy
    for (let i = 0; i < 12; i++) k.cyl(0.18, 0.18, 8, 6, -66 + i * 12, 0, 24.5, W);
    k.box(26, 14, 2, 52, 0, 15.5, W).prism(2.4, 3, 26.4, 52, 14, 15.5, W, Math.PI / 2);   // the anchor store's gable
  },
  ylamp(k) {   // a tall car-park lamp post with two curved arms (Castlepoint)
    k.cyl(0.14, 0.2, 10, 6, 0, 0, 0, '#d8dce0');
    for (const sd of [-1, 1]) k.box(3.2, 0.14, 0.14, sd * 1.5, 10.2, 0, '#d8dce0', 0, 0, sd * 0.35).box(0.9, 0.18, 0.5, sd * 3, 10.6, 0, '#f4f4f0', 0, 0, 0, 'glow');
  },
  rbhospital(k, v) {   // a wing of the Royal Bournemouth Hospital (its face +Z): long, two or three storeys, white with bands of windows, a
    // bright blue metal roof (its sign), blue gables; v 0: the Accident Centre entrance with its red canopy
    const n = 2 + (v % 2), L = 38 + (v % 3) * 6, B = '#f2f2ee', BL = '#2a7ad8';
    k.box(L, n * 3.6, 16, 0, 0, 0, B);
    for (let f = 0; f < n; f++) { k.box(L - 2, 1.4, 0.12, 0, 1.0 + f * 3.6, 8.04, '#2a3440', 0, 0, 0, 'shiny'); k.box(L - 2, 0.25, 0.14, 0, 2.6 + f * 3.6, 8.06, '#b8443a'); }   // the window bands, a red line under each
    k.prism(17, 3.6, L + 0.6, 0, n * 3.6, 0, BL, Math.PI / 2);   // the blue roof
    for (const x of [-L / 3, L / 3]) k.prism(0.8, 3.6, 7, x, n * 3.6, 8.2, BL, 0).box(6, 1.6, 1.2, x, n * 3.6 - 1.6, 8.2, B);   // blue gables
    if (v % 3 === 0) { k.box(14, 0.5, 6, 0, 3.2, 11, '#c62828').box(12, 3.0, 0.14, 0, 0, 8.06, '#2a3440', 0, 0, 0, 'shiny'); for (const x of [-6.5, 6.5]) k.cyl(0.15, 0.15, 3.2, 6, x, 0, 13.6, '#d8dce0'); }   // the Accident Centre
  },
  leisurecentre(k) {   // the Littledown Centre (its face +Z): a big sports hall in buff brick with a curved metal roof and a band of blue
    // cladding, a glazed entrance block, flags out front
    const Bk = '#c8a878';
    k.box(44, 10, 30, 0, 0, -4, Bk, 0, 0, 0, 'stone').box(44.4, 2, 30.4, 0, 8, -4, '#3a6ab8');
    k.put(new THREE.CylinderGeometry(22, 22, 30.4, 16, 1, false, -Math.PI / 2 * 0.55, Math.PI * 0.55), '#b8c0c8', 0, 4.2, -4, Math.PI / 2, 0, 0, 1, 0.45, 1);
    k.box(18, 6, 6, -8, 0, 13, '#e8ecee').box(16, 4.6, 0.14, -8, 0.4, 16.02, '#2a3440', 0, 0, 0, 'shiny');
    for (const x of [6, 9, 12]) k.cyl(0.07, 0.07, 9, 5, x, 0, 18, '#d8dce0').box(0.05, 1.2, 1.8, x, 7.4, 18.9, ['#2a7ad8', '#2f8a4a', '#c62828'][(x / 3) % 3]);
  },
  glassoffice(k, v) {   // an office block of the big bank's campus at Littledown (its face +Z): four storeys of blue glass curtain wall between
    // white bands, a flat roof, among pines
    const L = 34 + (v % 2) * 10;
    k.box(L, 15, 18, 0, 0, 0, '#3a6a9a', 0, 0, 0, 'shiny');
    for (let f = 0; f <= 4; f++) k.box(L + 0.3, 0.45, 18.3, 0, f * 3.6, 0, '#eef0f2');
    for (let i = 0; i <= L / 4; i++) k.box(0.12, 15, 18.2, -L / 2 + i * 4, 0, 0, '#9ab0c4');
  },
  lakegeese(k, v) {   // the lake in Littledown park: still water, reeds round it, a few geese and ducks on it
    const r = rnd(6900 + v);
    k.blob(16, 0, -2.6, 0, '#4a7a8a', 1.6, 0.17, 1.0, 6901 + v, { smooth: true });
    for (let i = 0; i < 10; i++) { const a = r() * 6.28; k.card(1.5, 1.2, Math.cos(a) * 24, 0.5, Math.sin(a) * 15, ['#a8a060', '#7a9a4a'][i % 2], r() * 3, 0, 'grass', 'up'); }
    for (let i = 0; i < 6; i++) { const x = (r() - 0.5) * 30, z = (r() - 0.5) * 16; k.ball(0.35, x, 0.25, z, i % 2 ? '#6a5a4a' : '#d8d4c8', 1, 0.7, 1.5, 'lit', 6).ball(0.12, x, 0.62, z - 0.4, '#1a1a1a', 1, 1, 1, 'lit', 5); }
  },
  parkedcar(k, v) {   // a car parked at the kerb (along Z): any colour, plain - no make
    const c = ['#c62828', '#e8e8e8', '#1d3557', '#2a2a2a', '#7a8a9a', '#3a6a3a', '#c9a227', '#5a6a8a'][v % 8];
    k.box(1.8, 0.75, 4.3, 0, 0.3, 0, c, 0, 0, 0, 'shiny').box(1.62, 0.62, 2.3, 0, 1.05, 0.1, '#2a3440', 0, 0, 0, 'shiny').box(1.64, 0.12, 2.2, 0, 1.62, 0.1, c, 0, 0, 0, 'shiny');
    for (const [x, z] of [[-0.82, -1.4], [0.82, -1.4], [-0.82, 1.4], [0.82, 1.4]]) k.axle(0.32, 0.24, 10, x, 0.32, z, '#1a1a1a');
  },
  junction(k, v) {   // a side street going off (its mouth on the main road at z 0, running away along +X): tarmac, kerbs, give-way lines
    // across its mouth, its name plate (blank) on two posts, a traffic light on the corner on some
    k.box(40, 0.06, 7, 20, -0.02, 0, '#5c6066').box(40, 0.16, 0.4, 20, 0, -3.7, '#b8b4aa').box(40, 0.16, 0.4, 20, 0, 3.7, '#b8b4aa');
    for (let i = 0; i < 7; i++) k.box(0.15, 0.03, 0.6, 1.2, 0.05, -2.7 + i * 0.85, '#f4f4f2');   // give way
    k.box(0.15, 0.03, 6.4, 0.6, 0.05, 0, '#f4f4f2');
    k.box(0.08, 1.0, 0.08, 2.2, 0, -4.4, '#2a2a2a').box(0.08, 1.0, 0.08, 2.2, 0, -5.6, '#2a2a2a').box(0.06, 0.4, 1.4, 2.2, 0.9, -5.0, '#f4f4f2');   // the name plate (blank)
    if (v % 2 === 0) { k.cyl(0.08, 0.08, 3.2, 6, 0.4, 0, -4.2, '#2a2a2a').box(0.36, 1.0, 0.3, 0.4, 3.2, -4.2, '#1a1a1a'); for (const [y, c] of [[3.95, '#ff3030'], [3.65, '#ffb020'], [3.35, '#30e060']]) k.ball(0.1, 0.25, y, -4.2, c, 1, 1, 0.5, y > 3.9 ? 'glow' : 'lit', 6); }
  },
  streettree(k, v) {   // a street tree in the pavement (a lime or a plane): a slim trunk in a grille, a rounded crown
    const r = rnd(7000 + v);
    k.box(1.2, 0.05, 1.2, 0, 0, 0, '#3a3a3a').cyl(0.16, 0.22, 3.6, 6, 0, 0, 0, '#6a5a44');
    for (let i = 0; i < 5; i++) k.clump(1.5 + r() * 0.5, (r() - 0.5) * 1.6, 4.4 + r() * 1.6, (r() - 0.5) * 1.6, ['#4e8a3a', '#5a9a42', '#6aa848'][i % 3], 7010 + v * 7 + i);
  },
  bin(k) { k.cyl(0.32, 0.28, 0.95, 8, 0, 0, 0, '#2a2e36').cyl(0.35, 0.35, 0.08, 8, 0, 0.95, 0, '#c9a227'); },   // a litter bin
  postbox(k) {   // a red pillar box (no lettering): the round red pillar, its black base, the domed cap, the slot
    k.cyl(0.3, 0.3, 1.3, 14, 0, 0.12, 0, '#c8102e', 0, 0, 'shiny').cyl(0.34, 0.34, 0.14, 14, 0, 0, 0, '#1a1a1a').ball(0.32, 0, 1.42, 0, '#c8102e', 1, 0.45, 1, 'shiny', 12);
    k.box(0.36, 0.06, 0.06, 0, 1.08, 0.29, '#1a1a1a').box(0.3, 0.2, 0.04, 0, 0.75, 0.3, '#f2c94c');
  },
  tpolewire(k) {   // a wooden telegraph pole with its crossbar and insulators, the drop wires fanning to the houses (along Z: the wire to the next)
    k.cyl(0.1, 0.14, 8, 6, 0, 0, 0, '#6a5440').box(1.4, 0.1, 0.1, 0, 7.4, 0, '#5a4636');
    for (const x of [-0.55, 0, 0.55]) k.cyl(0.04, 0.04, 0.14, 5, x, 7.5, 0, '#e8e8e2');
    k.put(new THREE.CylinderGeometry(0.012, 0.012, 32, 3), '#1a1a1a', 0, 7.55, 16, Math.PI / 2 + 0.02, 0, 0);   // the wire on to the next pole
    for (const sd of [-1, 1]) k.put(new THREE.CylinderGeometry(0.01, 0.01, 9, 3), '#1a1a1a', sd * 4, 6.2, 1, 0, 0, sd * 1.15);   // drops to the houses
  },
  wheeliebins(k, v) {   // a household's wheelie bins at the front: BCP's grey-black rubbish, blue recycling and a green garden bin (no lettering)
    const cols = [['#2a2e32', '#2a5aa8'], ['#2a2e32', '#2a5aa8', '#3a7a3a'], ['#2a5aa8', '#2a2e32']][v % 3];
    cols.forEach((c, i) => { const x = (i - (cols.length - 1) / 2) * 0.7; k.box(0.58, 0.95, 0.72, x, 0.06, 0, c).box(0.62, 0.08, 0.78, x, 1.01, 0.02, c).axle(0.08, 0.6, 6, x, 0.08, -0.32, '#1a1a1a'); });
  },
  gardenwall(k, v) {   // a front garden's low wall and its gate (along Z, the house behind at -X): brick or stone, a hedge or flowers behind, a gate
    const W = ['#9a4a34', '#c8beaa', '#a85036', '#d8d0bc'][v % 4];
    k.box(0.3, 0.75, 7, 0, 0, 0, W, 0, 0, 0, 'stone').box(0.36, 0.08, 7.06, 0, 0.75, 0, '#b8b0a0', 0, 0, 0, 'stone');
    k.box(0.06, 0.9, 1.2, 0, 0, 2.6 + (v % 2) * -5.2, ['#2a2a2a', '#f4f4f0', '#2f5a3a'][v % 3]);   // the gate
    if (v % 2) k.box(0.7, 1.1, 5.4, -0.6, 0, -0.6, '#3f6a34'); else for (let i = 0; i < 6; i++) k.ball(0.24, -0.4, 0.9, -2.6 + i * 0.9, ['#e63946', '#ffd23f', '#ff7eb6', '#ffffff'][i % 4], 1, 1, 1, 'lit', 6);
  },
  balloon(k, v) {   // a hot-air balloon, far off over the land
    const c = [['#e63946', '#ffd23f'], ['#1d7fd6', '#ffffff'], ['#2a9d8f', '#f4a261'], ['#9b5de5', '#ffd23f']][v % 4];
    for (let i = 0; i < 10; i++) k.put(new THREE.SphereGeometry(8, 3, 14, i * Math.PI / 5, Math.PI / 5), c[i % 2], 0, 16, 0, 0, 0, 0, 1, 1.22, 1);
    k.put(new THREE.CylinderGeometry(3.6, 1.4, 4.5, 16, 1, true), c[0], 0, 6.3, 0);
    k.box(1.7, 1.3, 1.7, 0, 2.2, 0, '#8a6a40');
    for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) k.cyl(0.03, 0.03, 2.4, 3, x, 3.4, z, '#5a4a30');
  },
};
const capG = (r, l) => new THREE.CapsuleGeometry(r, l, 2, 7);
function apartments(k, v) {   // a modern seafront block (its face +Z): white bands of balconies with glass fronts, a set-back top floor, coloured panels
  const fl = 6 + (v % 3) * 2, H = fl * 3.0, gl = '#4a6a80', acc = ['#2a9d8f', '#e9c46a', '#e76f51', '#457b9d'][v % 4], wall = ['#f4f4f0', '#f2e2c0', '#e9b8a0', '#e8e4dc'][v % 4];
  k.box(20, H, 13, 0, 0, 0, wall).box(16, 3, 10, 0, H, -1, wall).box(16.6, 0.3, 10.6, 0, H + 3, -1, '#d8d8d2');   // the block, the set-back penthouse
  k.box(15.4, 2.4, 0.12, 0, H + 0.3, 4.05, gl, 0, 0, 0, 'shiny');
  for (let f = 0; f < fl; f++) {
    const y = f * 3.0;
    k.box(20.6, 0.28, 2.0, 0, y + 0.02, 7.4, '#fbfbf8');   // the balcony slab
    if (f) k.box(20.4, 0.95, 0.06, 0, y + 0.3, 8.35, '#bcd7e6', 0, 0, 0, 'shiny');   // its glass front
    k.box(19.6, 2.3, 0.12, 0, y + 0.35, 6.55, f ? gl : '#3a4a58', 0, 0, 0, 'shiny');   // the glass wall behind
    for (const x of [-6.5, 0, 6.5]) k.box(0.3, 3.0, 2.0, x, y, 7.4, f % 2 ? acc : wall);   // dividers, every other floor coloured
  }
  for (const sd of [-1, 1]) for (let f = 1; f < fl; f++) k.box(0.12, 1.6, 7, sd * 10.05, f * 3.0 + 0.7, -1, gl, 0, 0, 0, 'shiny');   // side windows in a band
}   // (people and ponies come in crowds now: kept light)
function ponyAt(k, x, z, col, s, graze) {   // a stocky forest pony, head to -Z: a round barrel of a body, slim legs, a dark mane and tail
  const dk = shade(col, -0.35);
  for (const [lx, lz] of [[-0.2, -0.55], [0.2, -0.55], [-0.2, 0.55], [0.2, 0.55]]) k.put(capG(0.06 * s, 0.72 * s), col, x + lx * s, 0.4 * s, z + lz * s).box(0.13 * s, 0.1 * s, 0.14 * s, x + lx * s, 0, z + lz * s, '#2a2420');
  k.put(capG(0.34 * s, 0.75 * s), col, x, 1.05 * s, z, Math.PI / 2, 0, 0);   // the body
  const hy = graze ? 0.55 : 1.55, hz = graze ? -1.35 : -1.15;
  k.put(capG(0.15 * s, 0.5 * s), col, x, (1.2 + hy) / 2 * s, z + (-0.8 + hz) / 2 * s, graze ? -2.2 : -0.7, 0, 0);   // the neck
  k.put(capG(0.12 * s, 0.32 * s), col, x, hy * s, z + hz * s, graze ? -2.8 : -1.9, 0, 0).box(0.08 * s, 0.3 * s, 0.5 * s, x, (hy - 0.05 + (graze ? 0 : 0.18)) * s, z + (hz + 0.35) * s, dk, 0, graze ? -1.0 : 0.6, 0);   // the head, the mane
  k.put(capG(0.07 * s, 0.5 * s), dk, x, 0.85 * s, z + 0.78 * s, 0.35, 0, 0);   // the tail
}
function person(k, x, y, z, r, cheer) {   // one of the crowd, in grown-up proportions: two legs, a body narrowing to the waist, a neck,
  // an oval head (hair on most), rounded arms - raised ones wave (the 'wave' material moves them)
  const sh = CROWD[(r() * CROWD.length) | 0], sk = SKIN[(r() * SKIN.length) | 0], h = 0.82 + r() * 0.24, pose = r(), up = cheer && pose < 0.3, one = cheer && !up && pose < 0.55;
  const legs = ['#2d3a55', '#3a3a3a', '#5a4632', '#1d4e89', '#d8d2c4'][(r() * 5) | 0], hair = ['#2a1c12', '#c89a4a', '#6b3a1e', '#111111', '#8a8a86'][(r() * 5) | 0];
  for (const sd of [-1, 1]) k.put(capG(0.075, h - 0.15), legs, x + sd * 0.1, y + h / 2, z);
  k.put(capG(0.16, 0.3), sh, x, y + h + 0.3, z, 0, 0, 0, 1.3, 1, 0.72);
  k.cyl(0.05, 0.055, 0.12, 6, x, y + h + 0.6, z, sk).ball(0.11, x, y + h + 0.83, z, sk, 1, 1.18, 1.05, 'lit', 10);
  if (r() < 0.85) k.ball(0.118, x, y + h + 0.88, z + 0.02, hair, 1.04, 0.82, 1.08, 'lit', 10);
  for (const sd of [-1, 1]) {
    if (up || (one && sd > 0)) k.put(capG(0.05, 0.48), sk, x + sd * 0.3, y + h + 0.95, z, 0, 0, sd * -0.35, 1, 1, 1, 'wave');
    else k.put(capG(0.05, 0.46), sh, x + sd * 0.27, y + h + 0.28, z, 0, 0, sd * 0.08);
  }
}
function sitter(k, x, y, z, r) {   // someone sat back in a deckchair, facing +Z: legs out in front, leaning back, an arm on the rest
  const sh = CROWD[(r() * CROWD.length) | 0], sk = SKIN[(r() * SKIN.length) | 0], legs = r() < 0.55 ? sk : ['#2d3a55', '#d8d2c4', '#1d4e89'][(r() * 3) | 0];
  for (const sd of [-1, 1]) k.put(capG(0.07, 0.48), legs, x + sd * 0.1, y + 0.3, z + 0.36, Math.PI / 2 - 0.3, 0, 0);
  k.put(capG(0.15, 0.26), sh, x, y + 0.58, z - 0.08, -0.5, 0, 0, 1.3, 1, 0.72);
  k.ball(0.11, x, y + 0.95, z - 0.27, sk, 1, 1.15, 1.05, 'lit', 10);
  if (r() < 0.6) k.put(capG(0.05, 0.4), sk, x + 0.28, y + 0.55, z, 0.9, 0, 0);
}
function deckchair(k, x, z, c1, c2) {   // a striped deckchair on its wooden frame, facing +Z
  for (const sd of [-1, 1]) k.box(0.04, 0.04, 1.2, x + sd * 0.3, 0.32, z - 0.05, '#c9a46a', 0, -0.62, 0).box(0.04, 0.04, 0.85, x + sd * 0.3, 0.2, z + 0.25, '#c9a46a', 0, 0.55, 0);
  for (let i = 0; i < 5; i++) k.box(0.115, 0.02, 1.05, x - 0.23 + i * 0.115, 0.36, z - 0.05, i % 2 ? c2 : c1, 0, -0.62, 0);   // the canvas, slung back
}
function lyer(k, x, z, r) {   // someone sunbathing on a towel, along Z
  const sk = SKIN[(r() * SKIN.length) | 0], sh = CROWD[(r() * CROWD.length) | 0];
  k.box(0.85, 0.02, 1.9, x, 0, z, ['#e63946', '#ffd23f', '#3ec1ff', '#ff7eb6', '#2a9d8f'][(r() * 5) | 0]);
  k.put(capG(0.15, 0.55), sh, x, 0.16, z - 0.15, Math.PI / 2, 0, 0, 1.25, 1, 0.75).put(capG(0.07, 0.6), sk, x - 0.09, 0.1, z + 0.55, Math.PI / 2, 0, 0).put(capG(0.07, 0.6), sk, x + 0.09, 0.1, z + 0.55, Math.PI / 2, 0, 0);
  k.ball(0.11, x, 0.15, z - 0.68, sk, 1, 0.95, 1.1, 'lit', 10);
}
function moored(k, x, z, len, r, night) {   // a yacht moored stern-to a pontoon, its bow out along +X or -X (len's sign), mast up, sail furled
  const hull = night ? '#26324a' : ['#ffffff', '#f4f4f0', '#1d3557', '#e9eef0'][(r() * 4) | 0], L = Math.abs(len), sd = Math.sign(len);
  k.box(L * 0.78, 0.8, 2.2, x + sd * L * 0.39, 0, z, hull, 0, 0, 0, 'shiny');
  k.put(new THREE.CylinderGeometry(1.25, 1.25, 0.8, 3), hull, x + sd * L * 0.8, 0.4, z, 0, sd > 0 ? 0 : Math.PI, 0, 0.9, 1, 0.88, 'shiny');   // the bow
  k.box(L * 0.32, 0.6, 1.5, x + sd * L * 0.36, 0.8, z, night ? '#33415a' : '#e9eef0').box(L * 0.3, 0.2, 1.45, x + sd * L * 0.36, 1.12, z, night ? '#ffd98a' : '#3a5566', 0, 0, 0, night ? 'glow' : 'shiny');
  const m = 9 + r() * 4; k.cyl(0.05, 0.06, m, 4, x + sd * L * 0.55, 0.8, z, '#d0d0d0').box(L * 0.42, 0.22, 0.22, x + sd * L * 0.34, 2.0, z, night ? '#2a3550' : ['#1d4e89', '#7a1f2b', '#1f6f50', '#2b2d42'][(r() * 4) | 0]);   // the mast, the furled sail on its boom
  if (night) k.box(0.18, 0.18, 0.18, x + sd * L * 0.55, 0.8 + m, z, '#fff2c0', 0, 0, 0, 'glow');
}
function beam(k, a, b, t, col, key) {   // a square bar from point a to point b
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
  k.put(new THREE.BoxGeometry(t, t, L), col, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, -Math.asin(dy / L), Math.atan2(dx, dz), 0, 1, 1, 1, key || 'lit');
}
const PIER_GREY = '#aeaba2', PILE = '#2e302f', RAIL = '#f2f4f2', COPPER = '#6c9f88';
function pierNeck(k, x0, x1, hw, bent) {   // a concrete deck on bents of dark piles, cross-braced, white railings both sides
  k.box(x1 - x0, 0.55, hw * 2, (x0 + x1) / 2, -0.55, 0, PIER_GREY).box(x1 - x0, 0.9, 0.35, (x0 + x1) / 2, -1.45, hw - 0.2, '#8f8c84').box(x1 - x0, 0.9, 0.35, (x0 + x1) / 2, -1.45, -hw + 0.2, '#8f8c84');
  for (let x = x0 + 2; x < x1; x += bent) {
    for (const z of [-hw + 1.2, hw - 1.2]) k.cyl(0.32, 0.36, 15, 6, x, -16, z, PILE);
    beam(k, [x, -1.5, -hw + 1.2], [x, -9, hw - 1.2], 0.22, PILE); beam(k, [x, -1.5, hw - 1.2], [x, -9, -hw + 1.2], 0.22, PILE);   // the cross-bracing
    k.box(0.4, 0.5, hw * 2 - 1.6, x, -2.0, 0, PILE);
  }
  for (const z of [-hw + 0.1, hw - 0.1]) { k.box(x1 - x0, 0.07, 0.07, (x0 + x1) / 2, 1.05, z, RAIL, 0, 0, 0, 'shiny').box(x1 - x0, 0.05, 0.05, (x0 + x1) / 2, 0.55, z, RAIL);
    for (let x = x0 + 1; x < x1; x += 2.4) k.box(0.07, 1.1, 0.07, x, 0, z, RAIL); }
}
function bournemouthPier(k) {
  const X0 = 9;   // the deck starts behind the entrance building; stations below are the measured ones (s 0 = the root)
  // the entrance: two white wings with green hipped roofs and little cupolas, the deck running out between them
  for (const sd of [-1, 1]) {
    const zc = sd * 8.2;
    k.box(9, 7.2, 10, 4.5, -0.5, zc, '#f4f2ec').box(9.6, 0.45, 10.6, 4.5, 6.7, zc, '#e6e2d8');
    k.put(new THREE.ConeGeometry(7.6, 3.6, 4), COPPER, 4.5, 8.95, zc, 0, Math.PI / 4, 0, 1, 1, 1.28);   // the hipped roof
    k.box(0.12, 2.0, 8.4, -0.07, 0.4, zc, '#2a3a48', 0, 0, 0, 'shiny').box(0.6, 0.12, 8.8, -0.35, 2.55, zc, ['#1d4e89', '#7a1f2b'][sd > 0 ? 1 : 0], 0, -0.4, 0);   // shopfronts, an awning
    for (let w = 0; w < 3; w++) k.box(0.12, 1.4, 1.6, -0.06, 4.1, zc - 3 + w * 3, '#3a5566', 0, 0, 0, 'shiny');
    const cx = 8.2, cz = sd * 3.8;   // a cupola on the seaward corner by the gate
    k.cyl(1.4, 1.4, 2.6, 10, cx, 6.7, cz, '#f4f2ec').cone(1.75, 2.4, 10, cx, 9.3, cz, COPPER).cyl(0.05, 0.05, 2.2, 4, cx, 11.7, cz, '#e8e4da');
  }
  k.box(1.0, 1.2, 7.4, 0.5, 4.6, 0, '#f4f2ec').box(0.2, 0.9, 6.4, 0.0, 4.75, 0, '#1d4e89');   // the gateway's lintel and its blue band
  k.cyl(1.6, 1.6, 2.6, 8, 12, 0, -3, '#f4f2ec').cone(2.0, 1.6, 8, 12, 2.6, -3, COPPER);   // the green-roofed octagonal ticket kiosk
  // the neck, s 0-118: 11 m wide, lamps along it
  pierNeck(k, X0, X0 + 118, 5.5, 6);
  for (let x = X0 + 10; x < X0 + 118; x += 22) for (const z of [-5.2, 5.2]) k.cyl(0.07, 0.09, 4.2, 6, x, 0, z, '#e8ecea').box(0.3, 0.4, 0.3, x, 4.2, z, '#fff3c0', 0, 0, 0, 'glow');
  // the head, s 118-252: 39 m wide (o -14.5..24.5), a denser grid of piles
  const H0 = X0 + 118, H1 = X0 + 252, zc = 5;
  k.box(H1 - H0, 0.6, 39, (H0 + H1) / 2, -0.6, zc, PIER_GREY);
  for (let x = H0 + 2; x < H1; x += 6) for (const z of [-13, -5, 3, 11, 19]) k.cyl(0.36, 0.4, 15, 6, x, -16, z, PILE);
  for (let x = H0 + 2; x < H1; x += 12) { beam(k, [x, -1.5, -13], [x, -9, 19], 0.24, PILE); beam(k, [x, -1.5, 19], [x, -9, -13], 0.24, PILE); }
  for (const z of [-14.4, 24.4]) { k.box(H1 - H0, 0.07, 0.07, (H0 + H1) / 2, 1.05, z, RAIL, 0, 0, 0, 'shiny'); for (let x = H0 + 1; x < H1; x += 2.4) k.box(0.07, 1.1, 0.07, x, 0, z, RAIL); }
  k.box(0.07, 0.07, 39, H1 - 0.1, 1.05, zc, RAIL, 0, 0, 0, 'shiny');
  // the head building (ex-theatre, built like a liner heading out to sea): white walls with window bands, a copper-green barrel vault ...
  const B0 = X0 + 118, B1 = X0 + 171.5, wz0 = -9, wz1 = 21, wc = (wz0 + wz1) / 2, ww = wz1 - wz0;
  k.box(B1 - B0, 6.5, ww, (B0 + B1) / 2, 0, wc, '#f6f5f0');
  for (const z of [wz0 - 0.06, wz1 + 0.06]) for (const y of [1.0, 3.9]) k.box(B1 - B0 - 3, 1.5, 0.1, (B0 + B1) / 2, y, z, '#33475a', 0, 0, 0, 'shiny');
  k.box(0.1, 1.5, ww - 4, B0 - 0.06, 1.0, wc, '#33475a', 0, 0, 0, 'shiny');
  const R = 23.75, half = Math.asin((ww / 2) / R), sag = R - Math.cos(half) * R;
  k.put(new THREE.CylinderGeometry(R, R, B1 - B0, 28, 1, true, -half, half * 2), COPPER, (B0 + B1) / 2, 6.5 + sag - R, wc, 0, 0, Math.PI / 2);   // the barrel vault
  k.put(new THREE.CylinderGeometry(R, R, 0.2, 28, 1, false, -half, half * 2), '#e6e4dc', B0 + 0.1, 6.5 + sag - R, wc, 0, 0, Math.PI / 2).put(new THREE.CylinderGeometry(R, R, 0.2, 28, 1, false, -half, half * 2), '#e6e4dc', B1 - 0.1, 6.5 + sag - R, wc, 0, 0, Math.PI / 2);   // its gable ends
  // ... the fly tower rising over it, a dark screen on its landward face, the glazed lantern on top
  const T0 = X0 + 171.5, T1 = X0 + 178.8;
  k.box(T1 - T0, 10.55, 14, (T0 + T1) / 2, 0, 6, '#f6f5f0').box(T1 - T0 - 1.6, 1.2, 9, (T0 + T1) / 2 - 0.2, 10.55, 3.4, '#f0eee6');
  k.box(0.12, 3.4, 8, T0 - 0.07, 6.6, 6, '#141c28', 0, 0, 0, 'shiny');   // the screen
  k.box(4.2, 2.3, 3.8, (T0 + T1) / 2, 11.75, 2.1, '#3a5566', 0, 0, 0, 'shiny').box(4.6, 0.4, 4.2, (T0 + T1) / 2, 14.05, 2.1, '#e6e4dc');
  // the lower range seaward of it: a white block, a raised centre with its own low barrel
  const G0 = X0 + 180.8, G1 = X0 + 198;
  k.box(G1 - G0 + 2, 3.3, 26, (G0 + G1) / 2 - 1, 0, 6, '#f6f5f0').box(G1 - G0 + 2, 1.4, 8.6, (G0 + G1) / 2 - 1, 3.3, 6, '#f2f0e8');
  k.put(new THREE.CylinderGeometry(21, 21, G1 - G0 + 2, 20, 1, true, -0.21, 0.42), COPPER, (G0 + G1) / 2 - 1, 4.8 - 21, 6, 0, 0, Math.PI / 2);
  for (const z of [-6.9, 18.9]) k.box(G1 - G0, 1.2, 0.1, (G0 + G1) / 2, 1.2, z, '#33475a', 0, 0, 0, 'shiny');
  // the rotunda: a low white pavilion, colonnade, shallow dome, lantern (s 208, o 5.1; apex 5.2 m over the deck)
  const RX = X0 + 208, RZ = 5.1;
  k.cyl(6.4, 6.4, 3.1, 18, RX, 0, RZ, '#f6f5f0').cyl(7.2, 7.2, 0.35, 18, RX, 3.1, RZ, '#ffffff');
  for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; k.cyl(0.18, 0.2, 3.1, 6, RX + Math.cos(t) * 6.9, 0, RZ + Math.sin(t) * 6.9, '#ffffff'); }
  k.put(new THREE.SphereGeometry(6.6, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#eeece6', RX, 3.45, RZ, 0, 0, 0, 1, 0.26, 1).cyl(0.9, 0.9, 1.1, 10, RX, 5.1, RZ, '#ffffff');
  // the zip-wire tower at the square end: a tapering lattice, a platform and cabin on top
  const ZX = X0 + 244, ZZ = 4.6, ZH = 26;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) beam(k, [ZX + a * 2.4, 0, ZZ + b * 2.4], [ZX + a * 1.1, ZH, ZZ + b * 1.1], 0.28, '#4a5056');
  for (let y = 2; y < ZH; y += 3.2) { const w = 2.4 - (y / ZH) * 1.3;
    for (const [a, b, c, d] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) { beam(k, [ZX + a * w, y, ZZ + b * w], [ZX + c * w, y, ZZ + d * w], 0.14, '#4a5056'); beam(k, [ZX + a * w, y, ZZ + b * w], [ZX + c * (w - 0.2), y + 3.2, ZZ + d * (w - 0.2)], 0.1, '#4a5056'); } }
  k.box(4.4, 0.3, 4.4, ZX, ZH, ZZ, '#3a3f45').box(2.6, 2.4, 2.6, ZX, ZH + 0.3, ZZ, '#22262c').box(4.4, 0.06, 0.06, ZX, ZH + 1.3, ZZ + 2.2, RAIL).box(4.4, 0.06, 0.06, ZX, ZH + 1.3, ZZ - 2.2, RAIL);
  k.box(0.6, 0.6, 0.6, ZX, ZH + 2.7, ZZ, '#ff4a3a', 0, 0, 0, 'glow');
  for (const dz of [-0.6, 0.6]) beam(k, [ZX - 1, ZH - 0.5, ZZ + dz], [X0 + 30, 0.4, 46 + dz * 3], 0.06, '#1a1a1a');   // the zip wires, down to the beach east of the pier
  // the observation wheel beside the entrance, west of it
  const WX = 6, WZ = -34, WR = 15.5, WY = WR + 2.5;   // (beside the promenade, short of the entrance: further out it stood in front of the pier)
  k.put(new THREE.TorusGeometry(WR, 0.32, 6, 48), '#f4f4f2', WX, WY, WZ, 0, 0, 0, 1, 1, 1, 'shiny').put(new THREE.TorusGeometry(WR - 1.2, 0.18, 6, 48), '#f4f4f2', WX, WY, WZ, 0, 0, 0, 1, 1, 1, 'shiny');   // (its face to the promenade: edge-on it was a pole)
  for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; beam(k, [WX, WY, WZ], [WX + Math.cos(t) * WR, WY + Math.sin(t) * WR, WZ], 0.12, '#e8e8e6');
    k.box(1.8, 1.6, 1.4, WX + Math.cos(t) * (WR + 0.4), WY + Math.sin(t) * (WR + 0.4) - 1.9, WZ, ['#e63946', '#1d7fd6', '#ffd23f', '#2a9d8f'][a % 4]); }
  for (const dx of [-6, 6]) for (const dz of [-2.2, 2.2]) beam(k, [WX + dx, -0.5, WZ + dz], [WX, WY, WZ + dz * 0.25], 0.5, '#e8e8e6');
  k.box(6, 3, 8, WX - 9, -0.5, WZ, '#f4f2ec').box(6.4, 0.3, 8.4, WX - 9, 2.5, WZ, '#1d4e89');   // its booth
}
function boscombePier(k) {   // Boscombe: a bare modern pier - a long concrete neck, a plain head with railings and benches, a white entrance pavilion
  k.box(10, 4.2, 16, 4.5, -0.5, 0, '#f6f6f2').box(10.6, 0.5, 17, 4.5, 3.7, 0, '#d8d8d2').box(0.12, 2.6, 13, -0.06, 0.4, 0, '#2a3a48', 0, 0, 0, 'shiny');
  k.box(8, 0.4, 3, 9.5, 4.2, 0, '#f6f6f2');
  pierNeck(k, 9, 9 + 190, 4.5, 6);
  k.box(36, 0.6, 26, 9 + 208, -0.6, 0, PIER_GREY);
  for (let x = 9 + 192; x < 9 + 226; x += 6) for (const z of [-11, -4, 4, 11]) k.cyl(0.34, 0.38, 15, 6, x, -16, z, PILE);
  for (const z of [-12.9, 12.9]) { k.box(36, 0.07, 0.07, 9 + 208, 1.05, z, RAIL, 0, 0, 0, 'shiny'); for (let x = 9 + 190; x < 9 + 226; x += 2.4) k.box(0.07, 1.1, 0.07, x, 0, z, RAIL); }
  for (let i = 0; i < 4; i++) k.box(2.4, 0.5, 0.6, 9 + 196 + i * 7, 0, -9, '#9a7a52');
}
function woodPier(k, o) {   // a Victorian wooden pier: a timber deck raised on timber piles out into the water (+X), lamp posts both sides, a little
  // entrance building at the root (o: len, w, entrance and roof colours, stumps of an older pier beside it) - Swanage's, Yarmouth's
  // (the deck stands 1.4 m above the promenade: level with it, it sank into the sand and barely showed from the road)
  const T = '#8a7258', P = '#4a3c30', D = 1.4, L = o.len, hw = o.w / 2;
  k.box(8, 3.4, 10, 4, -0.5, 0, o.ent).prism(10.6, 2.2, 8.6, 4, 2.9, 0, o.roof).box(0.12, 1.8, 3.2, -0.06, 0.4, 0, '#2a3a48', 0, 0, 0, 'shiny');
  k.box(10, D, o.w - 1, 10, 0, 0, T, 0, 0, Math.atan2(D, 10));   // a ramp up to the deck
  k.box(L, 0.45, o.w, 14 + L / 2, D - 0.45, 0, T).box(L, 0.6, o.w + 0.2, 14 + L / 2, D - 1.05, 0, '#3a2e24');   // the deck, a dark fascia under it
  for (let x = 16; x < 14 + L; x += 4.5) { for (const z of [-hw + 0.3, hw - 0.3]) k.cyl(0.22, 0.25, 12 + D, 6, x, -12.2, z, P); beam(k, [x, D - 1.2, -hw + 0.3], [x, -6.5, hw - 0.3], 0.14, P); }
  for (const z of [-hw + 0.05, hw - 0.05]) { k.box(L, 0.08, 0.08, 14 + L / 2, D + 1.05, z, '#e8e4da'); for (let x = 15; x < 14 + L; x += 2.5) k.box(0.08, 1.1, 0.08, x, D, z, '#e8e4da'); }
  for (let x = 24; x < 14 + L; x += 20) for (const z of [-hw + 0.2, hw - 0.2]) k.cyl(0.07, 0.09, 4.4, 6, x, D, z, o.lamp).box(0.34, 0.42, 0.34, x, D + 4.4, z, '#fff3c0', 0, 0, 0, 'glow');
  k.box(16, 0.45, o.w + 5, 14 + L, D - 0.45, 0, T).box(16.2, 0.6, o.w + 5.2, 14 + L, D - 1.05, 0, '#3a2e24');   // the head, a little wider
  if (o.stumps) for (let x = 10; x < 120; x += 6) k.cyl(0.25, 0.3, 4 + ((x * 7) % 3), 5, x, -3, -18, '#3a3028');   // the old pier's stumps beside it
  const r = rnd(3200 + L); for (let i = 0; i < 16; i++) person(k, 20 + r() * L, D, (r() - 0.5) * (o.w - 2), r, r() < 0.2);   // people strolling out along it
}
const swanagePier = (k) => woodPier(k, { len: 190, w: 7, ent: '#f4f2ec', roof: '#5a6a72', lamp: '#1d3557', stumps: true });
const yarmouthPier = (k) => woodPier(k, { len: 220, w: 5, ent: '#dfe6ea', roof: '#2f4a6a', lamp: '#2a2a2a', stumps: false });   // (Yarmouth's: long and plain, a weatherboarded entrance)
function hutAt(k, z, col, trim, num) {   // one beach hut facing -X, as the owner's photos show them: weatherboarded, pastel, a white gable, a dark roof
  const w = 2.0, d = 2.4, h = 2.15, dk = shade(col, -0.12);
  k.box(d, 0.25, w + 0.1, 0, 0, z, '#7a6a52').box(d, h, w, 0, 0.25, z, col);
  for (let q = 1; q < 7; q++) k.box(0.025, 0.035, w, -d / 2 - 0.01, 0.25 + q * 0.3, z, dk);   // the weatherboards on the front
  k.box(0.06, 1.85, 1.5, -d / 2 - 0.03, 0.3, z, shade(col, 0.08)).box(0.07, 1.85, 0.05, -d / 2 - 0.05, 0.3, z, dk);   // the double doors
  k.prism(w + 0.3, 1.0, d + 0.3, 0, 0.25 + h, z, '#4d5156', Math.PI / 2);   // the roof, ridge running back from the front
  beam(k, [-d / 2 - 0.12, 0.25 + h - 0.04, z - w / 2 - 0.15], [-d / 2 - 0.12, 0.25 + h + 1.0, z], 0.14, trim); beam(k, [-d / 2 - 0.12, 0.25 + h + 1.0, z], [-d / 2 - 0.12, 0.25 + h - 0.04, z + w / 2 + 0.15], 0.14, trim);   // the white bargeboards
  if (num) k.box(0.03, 0.18, 0.5, -d / 2 - 0.04, h + 0.3, z, '#2a2a2a');
}
const BHUT = ['#c4dbe8', '#f2edd2', '#f6f6f2', '#bfe4d2', '#3f7fc0', '#c04aa0', '#e4eef2', '#f4c9bd', '#f6e6a6', '#a9d8d0', '#ffffff', '#9fc4e8'];
function villaCurve(k, v) {   // a curved white house of three floors (its face +Z): sweeping balconies, floor-to-ceiling glass, a spiral stair up the side
  const W = '#fbfbf8', gl = '#3a5566', r = 6.5;
  for (let f = 0; f < 3; f++) {
    const y = f * 3.3, w = 15 - f * 1.5;
    k.box(w, 3.3, 9, -f * 0.6, y, -0.5, W);
    k.put(new THREE.CylinderGeometry(r - f * 0.6, r - f * 0.6, 3.3, 20, 1, false, 0, Math.PI), W, -f * 0.6 + w / 2 - 0.2, y + 1.65, -0.5, 0, Math.PI / 2, 0, 0.5, 1, 1);   // the rounded end
    k.box(w - 1, 2.5, 0.12, -f * 0.6, y + 0.4, 4.02, gl, 0, 0, 0, 'shiny');
    k.box(w + 0.6, 0.25, 2.2, -f * 0.6, y + 3.3, 4.6, W).box(w + 0.6, 0.9, 0.06, -f * 0.6, y + 3.55, 5.7, '#bcd7e6', 0, 0, 0, 'shiny');   // a sweeping balcony, its glass edge
  }
  for (let i = 0; i < 14; i++) { const a = i * 0.55; k.box(1.2, 0.08, 0.5, -8.6 + Math.cos(a) * 0.7, i * 0.7, 1 + Math.sin(a) * 0.7, '#e8e8e4', a); }   // the spiral stair
  k.cyl(0.12, 0.12, 10, 6, -8.6, 0, 1, '#e8e8e4');
  k.box(17, 1.3, 0.4, 0, 0, 9.2, W).box(2.4, 1.6, 0.1, 5, 0, 9.35, '#3a3a3a');   // the front wall, the gate
  k.box(15, 0.05, 4, 0, 0, 6.6, '#5aa040');   // a lawn
  cordyline(k, -6, 7.5, 1); cordyline(k, 6.5, 7.8, 0.85);
}
function villaGable(k, v) {   // an older Sandbanks house: brick and white render, steep red-tiled gables, a bay window, tall chimneys
  const brick = ['#a85a44', '#b06a50'][v % 2], W = '#f6f2ea', roof = ['#b8452e', '#a83e2a'][v % 2], gl = '#2f4556';
  k.box(14, 6.4, 10, 0, 0, 0, W).box(14.1, 2.6, 10.1, 0, 0, 0, brick);
  k.prism(10.6, 4.6, 14.8, 0, 6.4, 0, roof, Math.PI / 2);
  for (const x of [-3.6, 3.6]) { k.box(5.2, 3.4, 2.2, x, 3.6, 5.6, W).prism(5.8, 3.0, 2.6, x, 7.0, 5.6, roof); k.box(3.2, 1.9, 0.12, x, 4.3, 6.72, gl, 0, 0, 0, 'shiny'); }   // two front gables
  k.box(4.4, 2.6, 1.4, -3.6, 0.3, 5.7, W).box(3.6, 1.8, 0.12, -3.6, 0.6, 6.42, gl, 0, 0, 0, 'shiny');   // a bay window
  k.box(1.4, 2.4, 0.12, 3.6, 0, 5.06, '#2a3a5a').box(5.2, 0.08, 0.06, 0, 2.6, 5.08, '#e8e4da');
  for (const x of [-5.6, 5.2]) k.box(1.1, 3.6, 1.1, x, 8.6, -1.5, brick);
  k.box(17, 1.2, 0.5, 0, 0, 9.2, brick).box(17.2, 0.15, 0.6, 0, 1.2, 9.2, '#e8e4da');
  cordyline(k, 6.2, 7.6, 1);
}
function cordyline(k, x, z, s) {   // a cabbage palm, as on every Sandbanks front garden: a thin grey trunk, a spiky green head
  k.cyl(0.13 * s, 0.2 * s, 3.4 * s, 6, x, 0, z, '#8a8278');
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; k.box(0.12 * s, 0.05 * s, 1.5 * s, x + Math.cos(a) * 0.5 * s, 3.5 * s, z + Math.sin(a) * 0.5 * s, i % 2 ? '#5f8a3a' : '#7aa048', -a + Math.PI / 2, i % 3 ? -0.5 : 0.4, 0); }
}
function carShape(k, x, z, col, y) {   // a parked car, simple (seen from across the water)
  y = y || 0;
  k.box(1.8, 0.7, 4.2, x, y + 0.3, z, col, 0, 0, 0, 'shiny').box(1.6, 0.55, 2.2, x, y + 1.0, z + 0.2, shade(col, -0.15)).box(1.62, 0.42, 2.0, x, y + 1.04, z + 0.2, '#2a3a48', 0, 0, 0, 'shiny');
  for (const [wx, wz] of [[-0.85, -1.3], [0.85, -1.3], [-0.85, 1.3], [0.85, 1.3]]) k.axle(0.33, 0.24, 8, x + wx, y + 0.33, z + wz, '#151515');
}
const LIT = ['#c89040', '#d8a050', '#b88038', '#e0b060'];   // warm windows at night (the glow material brightens them)
function litWin(k, r, x, y, z, w, h, p) {   // a window on a +Z face: lit (warm) or dark, with a pale frame
  k.box(w + 0.2, h + 0.2, 0.08, x, y - 0.1, z, '#d8d2c4');
  if (r() < (p == null ? 0.6 : p)) k.box(w, h, 0.1, x, y, z + 0.02, LIT[(r() * 4) | 0], 0, 0, 0, 'glow'); else k.box(w, h, 0.1, x, y, z + 0.02, '#1c2430', 0, 0, 0, 'shiny');
}
function quayPub(k, r) {   // a mock-Tudor pub on the quay: white render and black beams, red-tiled gables, warm bay windows, flower baskets,
  // tables out front under festoon lights
  const W = '#f2eee4', beam = '#2a2622', roof = '#8a3a2a';
  k.box(18, 8.4, 11, 0, 0, 0, W).prism(12, 4.6, 18.6, 0, 8.4, 0, roof, Math.PI / 2);
  for (const x of [-5, 4.6]) { k.box(6.4, 3, 1.6, x, 5.6, 5.9, W).prism(7, 3.4, 2.2, x, 8.6, 6.0, roof); for (const dx of [-3, 0, 3]) k.box(0.2, 3, 0.1, x + dx, 5.6, 6.72, beam); k.box(6.4, 0.2, 0.1, x, 7.2, 6.72, beam); }   // jettied gables, their beams
  for (let x = -8.6; x <= 8.6; x += 1.9) k.box(0.18, 3.2, 0.1, x, 4.0, 5.53, beam);
  k.box(18, 0.22, 0.1, 0, 4.0, 5.53, beam).box(18, 0.22, 0.1, 0, 7.1, 5.53, beam);
  for (const x of [-5, 4.6]) for (const dx of [-1.2, 1.2]) litWin(k, r, x + dx, 6.0, 6.75, 1.2, 1.1, 0.8);
  for (const x of [-6, -2, 4, 7.6]) { k.box(3, 2.2, 1.2, x, 0.6, 6.0, W); k.box(2.6, 1.7, 0.1, x, 0.85, 6.62, '#e8a848', 0, 0, 0, 'glow'); }   // the bay windows, lit
  k.box(1.6, 2.6, 0.12, 1, 0, 5.56, '#3a1e14');   // the door
  for (const x of [-8, -3.5, 1.4, 6]) { k.cyl(0.02, 0.02, 0.6, 4, x, 3.4, 6.6, '#222222'); k.ball(0.45, x, 3.2, 6.6, ['#e63946', '#ff7eb6', '#ffd23f', '#9b5de5'][(r() * 4) | 0], 1, 0.8, 1); }   // hanging baskets
  for (let i = 0; i < 3; i++) { const x = -6 + i * 6; k.cyl(0.4, 0.4, 0.06, 8, x, 0.75, 9.5, '#5a4a3a').cyl(0.05, 0.05, 2.4, 4, x, 0, 9.5, '#9a9a9a').cone(1.5, 0.5, 8, x, 2.2, 9.5, ['#1d4e89', '#2f6a3a', '#7a1f2b'][i]); }
  for (let i = 0; i < 18; i++) { const u = i / 17, x = -8.5 + u * 17, y = 3.6 - Math.sin(u * Math.PI * 3) * 0.25; k.ball(0.09, x, y, 11.6, '#ffd27a', 1, 1, 1, 'glow', 5); }   // festoon lights
  k.box(0.1, 1.2, 0.9, 9.4, 4.6, 6.8, '#3a2a1a').box(1.2, 0.08, 0.08, 9.0, 5.8, 6.3, '#1a1a1a');   // the pub sign on its bracket (blank: no name)
}
function quayWarehouse(k, r) {   // a tall red-brick warehouse, its gable to the quay, loading doors one above another, a hoist beam at the top
  const B = '#9a4a34', roof = '#5a4a44';
  k.box(14, 14, 16, 0, 0, 0, B).prism(14.6, 5, 16.4, 0, 14, 0, roof);   // (the ridge runs back from the quay: the gable faces it)
  k.prism(14, 5, 0.6, 0, 14, 8.0, B, 0);
  for (let f = 0; f < 4; f++) for (const x of [-4.6, 4.6]) litWin(k, r, x, 1.6 + f * 3.3, 8.02, 1.4, 1.8, 0.5);
  for (let f = 0; f < 4; f++) k.box(2.2, 2.6, 0.12, 0, 1 + f * 3.3, 8.05, f ? '#4a3a2a' : '#c88a3a', 0, 0, 0, f ? 'lit' : 'glow');   // the loading doors, the ground one open and lit
  k.box(0.3, 0.3, 2.2, 0, 15.2, 8.9, '#2a2a2a').box(0.05, 2.4, 0.05, 0, 12.9, 9.9, '#2a2a2a');
}
function quayFlats(k, r, v) {   // modern apartments on the quay: brick and white bands, glass balconies, windows lit at random
  const B = ['#b0603e', '#c47a4a'][v % 2], H = 18;
  k.box(20, H, 13, 0, 0, 0, B);
  for (let f = 0; f < 6; f++) { k.box(20.4, 0.4, 13.4, 0, f * 3, 0, '#e8e4dc'); for (let w = 0; w < 6; w++) litWin(k, r, -8.3 + w * 3.3, f * 3 + 0.8, 6.52, 2.2, 1.9, 0.45); if (f) k.box(20, 0.9, 0.06, 0, f * 3 + 0.4, 7.6, '#9ab4c2', 0, 0, 0, 'shiny').box(20, 0.2, 1.1, 0, f * 3, 7.05, '#e8e4dc'); }
  k.box(20.6, 0.6, 13.6, 0, H, 0, '#d8d2c4');
}
function quayTerrace(k, r) {   // Georgian brick buildings with restaurants below: lit glass shopfronts, sash windows over, chimneys
  const B = ['#8a4030', '#a05a40', '#7a3a2c'][(r() * 3) | 0];
  k.box(16, 10, 10, 0, 0, 0, B).box(16.4, 0.5, 10.4, 0, 10, 0, '#e8e4dc').prism(9, 2.4, 16.2, 0, 10.5, 0, '#4a4a4e', Math.PI / 2);
  k.box(15, 3, 0.12, 0, 0.3, 5.05, '#d8a050', 0, 0, 0, 'glow').box(16, 0.7, 0.3, 0, 3.3, 5.1, ['#1d3557', '#2f5a3a', '#5a1f2b'][(r() * 3) | 0]);
  for (let f = 0; f < 2; f++) for (let w = 0; w < 4; w++) litWin(k, r, -5.4 + w * 3.6, 4.8 + f * 2.8, 5.02, 1.3, 1.9, 0.55);
  for (const x of [-6, 6]) k.box(1.2, 2.2, 1.2, x, 11.6, 0, B);
}
export function shade(hex, f) { C.set(hex); const k = f < 0 ? 1 + f : 1; const add = f > 0 ? f : 0; return '#' + new THREE.Color(C.r * k + add * (1 - C.r), C.g * k + add * (1 - C.g), C.b * k + add * (1 - C.b)).getHexString(); }
const cache = new Map();
export function model(t, v) {   // {key: geometry} for a roadside thing, built once
  const key = t + '|' + (v || 0); let m = cache.get(key); if (m) return m;
  const f = MODELS[t]; if (!f) return null;
  const k = new Kit(); f(k, v || 0); m = k.build(); cache.set(key, m);
  return m;
}
export function has(t) { return !!MODELS[t]; }

// ---------------------------------------------------------------- the traffic: glossy, seen mostly from behind (their back is +Z)
const CARCOL = ['#d62828', '#1d4ed8', '#f4f4f4', '#2b2d42', '#f2c14e', '#2a9d8f', '#8d99ae', '#e76f51'];
function wheelsOn(k, xs, zs, r, w) { for (const x of xs) for (const z of zs) { k.axle(r, w, 14, x, r, z, '#151515'); k.axle(r * 0.58, w + 0.02, 10, x, r, z, '#b8bec4', 'shiny'); } }
function lights(k, w, y, z, h, col) { k.box(0.42, h || 0.16, 0.06, -w / 2 + 0.3, y, z, col || '#ff2a2a', 0, 0, 0, 'glow').box(0.42, h || 0.16, 0.06, w / 2 - 0.3, y, z, col || '#ff2a2a', 0, 0, 0, 'glow'); }
const GLASS = '#1c2632';
function tail(k, w, y, z, h) {   // a lamp cluster each side: a dark surround, the red lamp, an amber indicator at the outer edge
  h = h || 0.18;
  for (const sd of [-1, 1]) {
    const x = sd * (w / 2 - 0.3);
    k.box(0.5, h + 0.08, 0.05, x, y - 0.04, z - 0.01, '#1a0c0c', 0, 0, 0, 'shiny');
    k.box(0.34, h, 0.06, x - sd * 0.04, y, z, '#ff2a2a', 0, 0, 0, 'glow');
    k.box(0.1, h * 0.7, 0.06, x + sd * 0.18, y + h * 0.15, z, '#ffb24a', 0, 0, 0, 'lit');
  }
}
function rearEnd(k, w, z, by, py) {   // the bumper and the plate
  k.box(w + 0.06, 0.22, 0.16, 0, by, z - 0.03, '#1e1f22', 0, 0, 0, 'shiny');
  k.box(0.52, 0.12, 0.03, 0, py, z + 0.02, '#f2d24a'); k.box(0.48, 0.03, 0.035, 0, py + 0.045, z + 0.025, '#2a2a2a');
}
function slopeGlass(k, w, zA, yA, zB, yB) {   // a rear window lying along the slope from (zA, yA) at the back to (zB, yB) at the front
  const dz = zB - zA, dy = yB - yA, L = Math.hypot(dz, dy), a = Math.atan2(dy, -dz);
  k.put(new THREE.BoxGeometry(w, 0.03, L * 0.86), GLASS, 0, (yA + yB) / 2 + 0.11 * Math.cos(a), (zA + zB) / 2 + 0.11 * Math.sin(a), a, 0, 0, 1, 1, 1, 'shiny');   // (out past the body's bevel)
}
const TRAFFIC = {
  hatch(k, col) { k.side([-1.9, 0.3, 1.9, 0.3, 1.95, 0.85, 1.5, 1.05, 1.1, 1.45, -0.6, 1.55, -1.4, 1.05, -1.9, 0.95], 1.7, 0, 0, 0, col, 'shiny', 0.1); k.side([-0.55, 1.07, 1.05, 1.07, 1.3, 1.42, -0.5, 1.5], 1.52, 0, 0.02, 0, GLASS, 'shiny'); wheelsOn(k, [-0.78, 0.78], [-1.25, 1.25], 0.32, 0.22);
    slopeGlass(k, 1.36, 1.42, 1.08, 0.62, 1.52); tail(k, 1.7, 0.78, 2.02); rearEnd(k, 1.7, 2.02, 0.3, 0.55); },
  saloon(k, col) { k.side([-2.2, 0.3, 2.2, 0.3, 2.25, 0.85, 1.6, 0.95, 1.1, 1.4, -0.7, 1.42, -1.4, 0.95, -2.2, 0.85], 1.8, 0, 0, 0, col, 'shiny', 0.1); k.side([-0.65, 0.97, 1.05, 0.97, 1.2, 1.36, -0.6, 1.38], 1.62, 0, 0.02, 0, GLASS, 'shiny'); wheelsOn(k, [-0.82, 0.82], [-1.45, 1.45], 0.33, 0.22);
    slopeGlass(k, 1.44, 1.42, 0.98, 0.72, 1.4); tail(k, 1.8, 0.7, 2.32); rearEnd(k, 1.8, 2.32, 0.3, 0.5); },
  sports(k, col) { k.side([-2.1, 0.25, 2.1, 0.25, 2.15, 0.75, 0.9, 0.95, 0.3, 1.2, -0.6, 1.2, -1.2, 0.85, -2.1, 0.6], 1.85, 0, 0, 0, col, 'shiny', 0.1); k.side([-0.55, 0.88, 0.35, 0.95, 0.25, 1.15, -0.5, 1.15], 1.62, 0, 0.02, 0, GLASS, 'shiny'); k.box(1.7, 0.06, 0.4, 0, 1.0, 1.9, '#1a1a1a'); wheelsOn(k, [-0.84, 0.84], [-1.35, 1.35], 0.33, 0.25);
    slopeGlass(k, 1.3, 1.22, 0.86, 0.62, 1.16); tail(k, 1.85, 0.56, 2.22, 0.14); rearEnd(k, 1.85, 2.22, 0.25, 0.4); },
  van(k, col) { k.side([-2.5, 0.35, 2.5, 0.35, 2.5, 2.3, -1.2, 2.3, -1.9, 1.3, -2.5, 1.1], 1.95, 0, 0, 0, col, 'shiny', 0.12); k.side([-1.85, 1.35, -1.2, 1.35, -1.2, 2.05, -1.6, 2.05], 1.82, 0, 0.02, 0, GLASS, 'shiny'); wheelsOn(k, [-0.88, 0.88], [-1.6, 1.6], 0.36, 0.24);
    const stripe = col === '#f4f4f4' ? '#1d4ed8' : '#f4f4f4';
    k.side([-2.56, 1.02, 2.56, 1.02, 2.56, 1.24, -2.56, 1.24], 1.99, 0, 0, 0, stripe, 'shiny');   // a stripe along the side and round the back
    k.box(1.99, 0.22, 0.03, 0, 1.02, 2.62, stripe, 0, 0, 0, 'shiny');
    k.box(0.03, 1.7, 0.04, 0, 0.5, 2.63, '#2a2a2a');   // the split back doors
    for (const sd of [-1, 1]) k.box(0.62, 0.4, 0.04, sd * 0.42, 1.6, 2.63, GLASS, 0, 0, 0, 'shiny');   // their windows
    tail(k, 1.95, 0.6, 2.64, 0.36); rearEnd(k, 1.95, 2.64, 0.32, 0.62); },
  bus(k, col) {   // an open-top seaside bus
    const b = col === '#d62828' ? '#d62828' : '#f2c14e';
    k.side([-5.4, 0.4, 5.4, 0.4, 5.4, 3.4, -5.4, 3.4], 2.4, 0, 0, 0, b, 'shiny', 0.06); k.box(2.42, 0.25, 10.8, 0, 1.9, 0, '#ffffff');
    k.side([-5.2, 2.2, 5.2, 2.2, 5.2, 3.1, -5.2, 3.1], 2.44, 0, 0, 0, GLASS, 'shiny');
    k.side([-5.4, 3.4, 5.4, 3.4, 5.4, 4.1, -5.4, 4.1], 2.42, 0, 0, 0, b, 'shiny');
    const r = rnd(7); for (let i = 0; i < 6; i++) { k.ball(0.22, (i % 2 ? 0.6 : -0.6), 4.55, -3.5 + i * 1.4, SKIN[(r() * 5) | 0], 1, 1.1, 1, 'lit', 8); k.box(0.42, 0.4, 0.3, (i % 2 ? 0.6 : -0.6), 4.1, -3.5 + i * 1.4, SHIRTS[(r() * 9) | 0]); }
    wheelsOn(k, [-1.05, 1.05], [-3.8, 3.6], 0.5, 0.3); lights(k, 2.4, 0.9, 5.42, 0.4);
  },
  camper(k, col) {
    k.side([-2.7, 0.35, 2.7, 0.35, 2.7, 2.5, -1.4, 2.5, -2.2, 1.4, -2.7, 1.2], 2, 0, 0, 0, '#f4f1ea', 'shiny', 0.07);
    k.side([-2.7, 0.35, 2.7, 0.35, 2.7, 1.25, -2.7, 1.25], 2.04, 0, 0, 0, col, 'shiny');
    k.side([-2.15, 1.45, -1.45, 1.45, -1.45, 2.25, -1.8, 2.25], 1.87, 0, 0.02, 0, GLASS, 'shiny');
    k.box(1.6, 0.25, 3.4, 0, 2.5, 0.6, '#e8e2d4'); wheelsOn(k, [-0.9, 0.9], [-1.7, 1.7], 0.36, 0.24);
    k.box(1.2, 0.6, 0.04, 0, 1.55, 2.78, GLASS, 0, 0, 0, 'shiny'); tail(k, 2, 0.85, 2.79, 0.3); rearEnd(k, 2, 2.79, 0.32, 0.6);
  },
  tractor(k, col) {
    const g = col === '#2a9d8f' ? '#2e8b3a' : '#c62828';
    k.box(1.3, 1.1, 2.6, 0, 0.7, -0.6, g, 0, 0, 0, 'shiny'); k.box(1.6, 1.7, 1.4, 0, 1.4, 0.7, '#2a2a2a'); k.box(1.4, 1.4, 1.2, 0, 1.6, 0.7, '#8fb3c9', 0, 0, 0, 'shiny');
    k.box(1.8, 0.15, 1.6, 0, 3.1, 0.7, g);
    for (const x of [-1, 1]) { k.axle(0.85, 0.5, 16, x * 0.95, 0.85, 1.1, '#1a1a1a'); k.axle(0.5, 0.4, 12, x * 0.8, 0.5, -1.4, '#1a1a1a'); }
    k.box(0.2, 0.2, 0.06, -0.6, 1.2, 1.45, '#ff8c00', 0, 0, 0, 'glow').box(0.2, 0.2, 0.06, 0.6, 1.2, 1.45, '#ff8c00', 0, 0, 0, 'glow');
  },
  wedge(k, col) {   // a rival: a low, wide 1980s wedge supercar of our own - knife-edge nose, dark glass canopy pushed forward,
    // a flat engine deck with slats, intakes in its flanks, a wing on stalks, one bar of light across its tail
    k.side([-2.25, 0.27, 2.2, 0.27, 2.34, 0.46, 2.24, 0.6, 0.95, 0.86, -0.85, 0.94, -2.22, 0.98, -2.3, 0.72, -2.26, 0.42], 2.0, 0, 0, 0, col, 'shiny', 0.07);
    k.side([0.98, 0.84, 0.3, 1.1, -0.62, 1.12, -1.2, 0.94], 1.46, 0, 0.02, 0, GLASS, 'shiny');   // the canopy
    k.side([0.3, 1.1, -0.62, 1.12, -0.62, 1.14, 0.28, 1.125], 1.36, 0, 0.004, 0, col, 'shiny');   // its roof panel
    for (let i = 0; i < 6; i++) k.box(1.24, 0.025, 0.07, 0, 0.965 + i * 0.005, 0.95 + i * 0.19, '#121212');   // slats over the engine
    for (const sd of [-1, 1]) {
      k.box(0.05, 0.24, 0.72, sd * 1.0, 0.5, 0.55, '#121212', sd * -0.08, 0, 0);   // an intake down each flank
      k.box(0.06, 0.18, 0.1, sd * 0.72, 0.98, 1.98, '#151515');   // the wing's stalks
      k.box(0.36, 0.035, 0.03, sd * 0.62, 0.47, -2.3, '#f6f2e2', 0, 0, 0, 'glow');   // slim lamps low in the nose
    }
    k.box(1.94, 0.045, 0.36, 0, 1.15, 2.0, col, 0, 0, 0, 'shiny').box(1.94, 0.02, 0.06, 0, 1.13, 2.17, '#151515');   // the wing
    k.box(1.98, 0.36, 0.05, 0, 0.5, 2.27, '#121212', 0, 0, 0, 'shiny');   // a black tail panel
    k.box(1.7, 0.07, 0.06, 0, 0.74, 2.29, '#ff2a2a', 0, 0, 0, 'glow');   // one bar of light right across
    wheelsOn(k, [-0.86, 0.86], [-1.42, 1.38], 0.35, 0.3); rearEnd(k, 1.98, 2.28, 0.3, 0.6);
  },
  lemans(k, col) {   // a rival: a low 1960s endurance racer of our own - long curving nose, bulging wheel arches over fat tyres, a
    // bubble of a cabin, a long tail cut off square; twin stripes nose to tail and a white roundel on each door
    const stripe = col === '#f4f4f4' ? '#1d4ed8' : col === '#f2c14e' ? '#1a1a1a' : '#f4f4f4';
    const top = [2.14, 0.46, 2.02, 0.6, 1.45, 0.7, 0.72, 0.73, 0.36, 0.98, -0.42, 1.0, -0.9, 0.86, -1.6, 0.8, -2.1, 0.74];
    k.side([-2.1, 0.25, 2.06, 0.25].concat(top, [-2.12, 0.4]), 1.86, 0, 0, 0, col, 'shiny', 0.12);
    k.side([0.72, 0.75, 0.37, 0.96, -0.4, 0.98, -0.86, 0.86], 1.3, 0, 0.02, 0, GLASS, 'shiny');   // the cabin's glass
    for (const z of [-1.35, 1.32]) for (const sd of [-1, 1]) k.ball(0.38, sd * 0.74, 0.56, z, col, 0.55, 0.5, 1.35, 'shiny', 14);   // the arches, bulging over the wheels
    const band = []; for (let i = 0; i < top.length; i += 2) band.push(top[i], top[i + 1] + 0.012);
    for (let i = top.length - 2; i >= 0; i -= 2) band.push(top[i], top[i + 1] - 0.012);
    for (const sx of [-0.15, 0.15]) k.side(band, 0.16, sx, 0.1, 0, stripe, 'shiny');   // (up by the body's rounded edge)   // the stripes, following the body from nose to tail
    for (const sd of [-1, 1]) {
      k.put(new THREE.CylinderGeometry(0.21, 0.21, 0.01, 18), '#f4f4f4', sd * 0.935, 0.52, 0.05, 0, 0, Math.PI / 2, 1, 1, 1, 'shiny');   // a roundel on the door
      k.put(new THREE.CylinderGeometry(0.12, 0.12, 0.012, 14), '#1a1a1a', sd * 0.938, 0.52, 0.05, 0, 0, Math.PI / 2, 1, 1, 1, 'shiny');
      k.ball(0.1, sd * 0.6, 0.55, -1.95, '#f6f2e2', 1, 0.8, 0.5, 'glow', 10);   // covered round lamps in the nose
    }
    k.box(1.76, 0.12, 0.05, 0, 0.6, 2.13, '#121212').box(1.4, 0.06, 0.06, 0, 0.62, 2.15, '#ff2a2a', 0, 0, 0, 'glow');
    wheelsOn(k, [-0.82, 0.82], [-1.35, 1.32], 0.34, 0.3); rearEnd(k, 1.84, 2.14, 0.3, 0.42);
  },
  lorry(k, col) {
    k.side([-6, 0.6, 3.6, 0.6, 3.6, 3.9, -6, 3.9], 2.5, 0, 0, 0, col, 'shiny', 0.05); k.side([3.8, 0.5, 6.1, 0.5, 6.1, 2.6, 5.4, 3.3, 3.8, 3.3], 2.4, 0, 0, 0, '#3a3a3a', 'shiny', 0.05);
    k.box(2.52, 0.3, 9.6, 0, 0.5, -1.2, '#3a3a3a'); wheelsOn(k, [-1.05, 1.05], [-4.6, -3.4, 4.8], 0.5, 0.35); lights(k, 2.5, 0.9, 6.12, 0.3);
  }
};

// ---------------------------------------------------------------- the racers (owner, 6 Oct): a pack of supercars of our own, each a cousin of a
// famous shape - its proportions, stance and colours - never a copy: no badges, names, grilles or lamp signatures of any real make.
// Keys: rpaint (clearcoat body), rglass, shiny (chrome, alloy), lit (black, tyres), rlamp (lamps).
const RIMS = { five: [5, false, 0.085], twin: [5, true, 0.042], star: [5, false, 0.045], ten: [10, false, 0.034], seven: [7, false, 0.05] };
function rwheel(k, x, z, r, w, rim, style) {   // a low tyre on the ground, a big rim on its outer face (r: the tyre's radius)
  const sd = Math.sign(x) || 1, ox = x + sd * (w / 2 - 0.005), rr = r * 0.74, S = RIMS[style] || RIMS.five;
  k.axle(r, w, 16, x, r, z, '#131313', 'lit');
  k.axle(rr, 0.02, 14, ox, r, z, '#1c1e21', 'lit');   // the barrel, dark behind the spokes
  k.put(new THREE.TorusGeometry(rr, 0.02, 4, 18), rim, ox + sd * 0.006, r, z, 0, Math.PI / 2, 0, 1, 1, 1, 'shiny');   // the lip
  for (let i = 0; i < S[0]; i++) for (const off of S[1] ? [-0.12, 0.12] : [0]) { const a = i * Math.PI * 2 / S[0] + off;
    k.put(new THREE.BoxGeometry(0.03, rr * 0.92, S[2]), rim, ox + sd * 0.01, r + Math.cos(a) * rr * 0.46, z + Math.sin(a) * rr * 0.46, a, 0, 0, 1, 1, 1, 'shiny'); }
  k.axle(0.07, 0.03, 10, ox + sd * 0.014, r, z, rim, 'shiny').axle(0.035, 0.035, 8, ox + sd * 0.018, r, z, '#1c1e21', 'lit');
}
function lerpAt(list, z, j) { let i = 0; while (i < list.length - 2 && list[i + 1][0] < z) i++; const a = list[i], b = list[i + 1], f = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0]))); return a[j] + (b[j] - a[j]) * f; }
function racerBody(k, col, o) {   // a lofted body (paint, shaded deeper low down), a glass cabin and a painted roof; o.w: [[z, r, tyre width]...] the wheels
  const wz = o.w.map((q) => q[0]), st = sections(o.keys, wz, o.w.map((q) => [q[1], q[1] + 0.05])), n0 = (k.parts.rpaint || []).length;
  k.loft(st, col, 'rpaint', { up: o.up || 3.4, dn: 6, belly: o.belly || 0.6, crease: o.crease == null ? 0.12 : o.crease, n: 22 });   // (always creased: a sharp shoulder line catching the light)
  if (o.cabin) k.loft(o.cabin, '#1a2430', 'rglass', { up: o.cabinUp || 3, dn: 8, belly: 0.3, n: 18 });
  if (o.roof) k.loft(o.roof, col, 'rroof', { up: o.roofUp || 3, dn: o.roofDn || 3, belly: o.roofBelly || 0.4, n: 18 });   // (a satin coat: a flat roof under the sun flared white)
  const list = k.parts.rpaint;
  for (let q = n0; q < list.length; q++) { const P3 = list[q].attributes.position, C3 = list[q].attributes.color;
    for (let i = 0; i < P3.count; i++) { const y = P3.getY(i), f = y > 0.74 ? 1.08 : y > 0.5 ? 0.88 + (y - 0.5) / 0.24 * 0.2 : 0.66 + 0.22 * Math.max(0, (y - 0.24) / 0.26); C3.setXYZ(i, C3.getX(i) * f, C3.getY(i) * f, C3.getZ(i) * f); } }
  const B = { st: st, topAt: (z) => lerpAt(st, z, 3), hwAt: (z) => lerpAt(st, z, 1), roofAt: (z) => o.roof ? lerpAt(o.roof, z, 3) : 0 };
  for (const [z, r, w] of o.w) for (const sd of [-1, 1]) {   // the wheel arches: a dark liner, a fine lip; the wheel set flush under it
    const hw = B.hwAt(z), R = r + 0.05;
    k.put(new THREE.CylinderGeometry(R, R, 0.36, 18, 1, true, -Math.PI / 2, Math.PI), '#0b0b0c', sd * (hw - 0.2), r, z, 0, 0, Math.PI / 2, 1, 1, 1, 'lit');
    k.put(new THREE.TorusGeometry(R + 0.008, 0.016, 5, 22, Math.PI), col, sd * (hw - 0.012), r, z, 0, sd * Math.PI / 2, 0, 1, 1, 1, 'rpaint');
    rwheel(k, sd * (hw - w / 2 - 0.02), z, r, w, o.rim || '#cdd1d5', o.style);
  }
  if (o.mirror) { const [mz, my] = o.mirror; for (const sd of [-1, 1]) { const hw = B.hwAt(mz) - 0.06;   // door mirrors on short arms
    k.box(0.12, 0.02, 0.03, sd * (hw + 0.05), my - 0.03, mz, '#151517', 0, 0, sd * 0.3, 'lit');
    k.ball(0.055, sd * (hw + 0.13), my, mz, col, 1.3, 0.75, 1.5, 'rpaint', 12).ball(0.045, sd * (hw + 0.13), my, mz + 0.06, '#1a2430', 1.2, 0.65, 0.3, 'rglass', 8); } }
  if (o.doors) for (const z of o.doors) for (const sd of [-1, 1]) {   // the doors' shut lines
    const t = B.topAt(z), hw = B.hwAt(z); k.box(0.006, Math.max(0.1, t - 0.4), 0.012, sd * (hw + 0.002), 0.34, z, '#1a1a1c', 0, 0, 0, 'lit'); }
  return B;
}
function ribbon(k, yAt, x0, x1, z0, z1, lift, hex) {   // a strip lying on the body from z0 to z1 (stripes)
  const pos = [], n = Math.ceil((z1 - z0) / 0.05);
  for (let q = 0; q < n; q++) { const za = z0 + (z1 - z0) * q / n, zb = z0 + (z1 - z0) * (q + 1) / n, ya = yAt(za) + lift, yb = yAt(zb) + lift; pos.push(x0, ya, za, x0, yb, zb, x1, yb, zb, x0, ya, za, x1, yb, zb, x1, ya, za); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  k.put(g, hex, 0, 0, 0, 0, 0, 0, 1, 1, 1, 'rpaint');
}
function plate(k, pts, x, w, col, key) { k.side(pts.flatMap((p, i) => i % 2 ? [p] : [-p]), w, x, 0, 0, col, key || 'rpaint', 0.012); }   // a panel drawn side-on, pts as [z, y, z, y...]
function lamp(k, x, y, z, sx, sy, col, house) {   // a lamp: a crisp lens in a dark housing
  if (house !== false) k.ball(0.1, x, y, z - 0.012, '#120c0c', sx * 1.18, sy * 1.35, 0.3, 'lit', 12);
  k.ball(0.1, x, y, z, col, sx, sy, 0.3, 'rlamp', 12);
}
const RED = '#ff2a2a', LAMP = '#f6f2e2', BLK = '#121214';
function cover(k, x, y, z, sx, sy, sz, ry) {   // a lamp under a clear cover, lying in the bodywork
  k.put(new THREE.SphereGeometry(0.1, 12, 8), '#8ea2b4', x, y, z, 0, ry || 0, 0, sx, sy, sz, 'rglass');
  k.put(new THREE.SphereGeometry(0.08, 10, 6), LAMP, x, y + 0.01, z - Math.cos(ry || 0) * sz * 0.03, 0, ry || 0, 0, sx * 0.85, sy * 0.85, sz * 0.8, 'rlamp');
}
function cabW(cab, z, y, up) {   // how wide a glass cabin is at height y (its sections lofted with belly 0.3)
  const hw = lerpAt(cab, z, 1), cb = lerpAt(cab, z, 2), t = lerpAt(cab, z, 3), ym = cb + (t - cb) * 0.3;
  if (y <= ym) return hw; const s = Math.pow(Math.min(1, (y - ym) / (t - ym)), up / 2); return Math.pow(Math.sqrt(1 - s * s), 2 / up) * hw;
}
function capOver(cab, list, up) {   // a painted roof hugging a glass cabin: [[z, bottom]...]; a low bottom takes the paint down the side, so
  // where the bottom falls is the back edge of the side window
  return list.map(([z, b0]) => { const b = Math.max(b0, lerpAt(cab, z, 2)); return [z, cabW(cab, z, b, up) + 0.02, b, lerpAt(cab, z, 3) + 0.02]; });
}
function glassOn(k, sec, z0, z1, f, up, belly) {   // a window lying on a painted loft's top, from z0 to z1, f of its width
  const pos = [], n = Math.max(2, Math.ceil((z1 - z0) / 0.05)), m = 6;
  const P = (z, u) => { const hw = lerpAt(sec, z, 1), b = lerpAt(sec, z, 2), t = lerpAt(sec, z, 3), ym = b + (t - b) * belly, x = u * f * hw, c = Math.pow(Math.abs(x) / hw, up / 2);
    return [x, ym + (t - ym) * Math.pow(Math.sqrt(Math.max(0, 1 - c * c)), 2 / up) + 0.006, z]; };
  for (let q = 0; q < n; q++) for (let j = 0; j < m; j++) { const za = z0 + (z1 - z0) * q / n, zb = z0 + (z1 - z0) * (q + 1) / n, ua = -1 + 2 * j / m, ub = -1 + 2 * (j + 1) / m;
    pos.push(...P(za, ua), ...P(zb, ua), ...P(zb, ub), ...P(za, ua), ...P(zb, ub), ...P(za, ub)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  k.put(g, '#1a2430', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'rglass');
}
function trimLine(k, pts, col, s) {   // a thin bright line through [[x, y, z]...]
  for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
    k.put(new THREE.BoxGeometry(s || 0.014, s || 0.014, L + 0.01), col || '#e4e7ea', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, -Math.asin(dy / L), Math.atan2(dx, dz), 0, 1, 1, 1, 'shiny'); }
}
function windowTrim(k, B, cab, cap, z0, z1, up) {   // a bright surround on the side glass: along the waist, and under the roof's edge
  const zs = []; for (let z = z0; z < z1; z += 0.12) zs.push(z); zs.push(z1);
  for (const sd of [-1, 1]) {
    trimLine(k, zs.map((z) => { const y = B.topAt(z) + 0.006; return [sd * (cabW(cab, z, y, up) + 0.006), y, z]; }));
    trimLine(k, [cap[0][0]].concat(zs.filter((z) => z > cap[0][0])).map((z) => { const y = lerpAt(cap, z, 2) - 0.008; return [sd * (cabW(cab, z, y, up) + 0.006), y, z]; }));
  }
}
function vent(k, pts, x, sd, col) {   // a recessed vent seen side-on: a black frame, a lighter mesh inside, a body-colour lip over it
  plate(k, pts, x + sd * 0.006, 0.02, BLK, 'lit');
  const c = [0, 0]; for (let i = 0; i < pts.length; i += 2) { c[0] += pts[i] / (pts.length / 2); c[1] += pts[i + 1] / (pts.length / 2); }
  plate(k, pts.map((v, i) => c[i % 2] + (v - c[i % 2]) * 0.8), x + sd * 0.014, 0.02, '#34373c', 'lit');
}
Object.assign(TRAFFIC, {
  wedge(k, col) {   // cousin of the late-80s twin-turbo wedge: short and squat, a knife nose, a deck climbing to the tail, slats over the
    // engine, a low full-width wing carried on short endplates that continue the rear wings
    const B = racerBody(k, col, { w: [[-1.22, 0.33, 0.27], [1.24, 0.36, 0.33]], up: 4.6, crease: 0.3, style: 'five', mirror: [-0.5, 0.86], doors: [-0.62, 0.5],
      keys: [[-1.88, 0.86, 0.3, 0.36], [-1.8, 0.94, 0.27, 0.42], [-1.62, 0.97, 0.24, 0.54], [-1.22, 0.99, 0.23, 0.76], [-0.85, 0.97, 0.23, 0.76], [-0.35, 0.95, 0.23, 0.76], [0.25, 0.98, 0.24, 0.81], [0.8, 1.03, 0.25, 0.87], [1.24, 1.06, 0.25, 0.9], [1.65, 1.04, 0.27, 0.94], [1.95, 0.99, 0.32, 0.96], [2.06, 0.92, 0.42, 0.95]],
      cabin: [[-0.72, 0.7, 0.67, 0.73], [-0.45, 0.69, 0.69, 0.98], [0.05, 0.65, 0.72, 1.07], [0.48, 0.61, 0.76, 1.05], [0.8, 0.54, 0.8, 0.96], [0.98, 0.46, 0.84, 0.9]], cabinUp: 4,
      roof: [[-0.18, 0.5, 0.99, 1.05], [0.2, 0.54, 1.01, 1.08], [0.52, 0.48, 0.99, 1.05]] });
    for (let i = 0; i < 7; i++) { const z = 1.05 + i * 0.1; k.box(1.06, 0.02, 0.045, 0, B.topAt(z) - 0.008, z, BLK, 0, 0, 0, 'lit'); }   // slats over the engine
    const wt = B.topAt(1.95) + 0.2;
    for (const sd of [-1, 1]) {
      plate(k, [1.62, B.topAt(1.62) - 0.02, 2.06, B.topAt(2.06) - 0.02, 2.06, wt, 1.8, wt - 0.02], sd * 0.93, 0.07, col);   // short endplates, continuing the rear wings
      vent(k, [-0.45, 0.55, -0.05, 0.55, -0.05, 0.7, -0.3, 0.7], sd * B.hwAt(-0.25), sd, col);   // a duct in each door
      vent(k, [0.52, 0.32, 1.0, 0.32, 1.0, 0.64, 0.62, 0.6], sd * B.hwAt(0.78), sd, col);   // an intake ahead of the rear wheel
      k.box(0.36, 0.016, 0.045, sd * 0.58, B.topAt(-1.74) - 0.01, -1.74, LAMP, 0, -0.59, 0, 'rlamp');   // a slit of a lamp in the nose
      lamp(k, sd * 0.6, 0.7, 2.075, 2.1, 0.55, RED);   // a long lamp each side
      k.roll(0.055, 0.14, 12, sd * 0.4, 0.36, 2.04, '#cfd3d7', 'shiny');
    }
    k.box(1.88, 0.045, 0.34, 0, wt, 1.9, col, 0, -0.06, 0, 'rpaint').box(1.86, 0.035, 0.03, 0, wt + 0.03, 2.06, BLK, 0, 0, 0, 'lit');   // the wing, low, and its lip
    k.box(1.76, 0.3, 0.05, 0, 0.38, 2.07, '#202226', 0, 0, 0, 'lit');   // a dark mesh tail
    k.box(1.74, 0.025, 0.2, 0, 0.27, -1.84, BLK, 0, 0, 0, 'lit');   // the splitter under the knife nose
  },
  lemans(k, col) {   // cousin of the 60s endurance winner and its revival: very low, long curving nose, lamps under clear covers in the wing
    // tops, a deep scoop behind the door under a swelling haunch, a bubble cabin, a tail cut off square, twin stripes nose to tail
    const stripe = col === '#f4f4f4' ? '#1d4ed8' : '#f4f4f4';
    const B = racerBody(k, col, { w: [[-1.38, 0.33, 0.27], [1.36, 0.36, 0.33]], up: 3.2, crease: 0.14, style: 'twin', mirror: [-0.62, 0.84], doors: [-0.7, 0.3],
      keys: [[-2.15, 0.5, 0.32, 0.44], [-2.02, 0.8, 0.25, 0.58], [-1.75, 0.93, 0.24, 0.69], [-1.38, 0.99, 0.24, 0.76], [-0.95, 0.95, 0.24, 0.74], [-0.5, 0.93, 0.24, 0.74], [0.3, 0.97, 0.24, 0.8], [0.9, 1.05, 0.25, 0.87], [1.36, 1.07, 0.25, 0.9], [1.85, 1.04, 0.28, 0.91], [2.12, 1.0, 0.3, 0.91], [2.18, 0.98, 0.3, 0.9]],
      cabin: [[-0.74, 0.76, 0.68, 0.72], [-0.47, 0.75, 0.7, 0.98], [0.0, 0.71, 0.72, 1.1], [0.43, 0.67, 0.75, 1.1], [0.83, 0.58, 0.8, 0.98], [1.12, 0.48, 0.84, 0.88]],
      roof: [[-0.3, 0.55, 1.01, 1.07], [0.08, 0.6, 1.05, 1.12], [0.43, 0.57, 1.05, 1.12], [0.76, 0.48, 1.0, 1.06]] });
    for (const sx of [-0.13, 0.13]) {   // twin stripes over the nose, the roof and the tail
      ribbon(k, B.topAt, sx - 0.085, sx + 0.085, -2.08, -0.72, 0.008, stripe);
      ribbon(k, B.roofAt, sx - 0.085, sx + 0.085, -0.26, 0.72, 0.008, stripe);
      ribbon(k, B.topAt, sx - 0.085, sx + 0.085, 1.14, 2.16, 0.008, stripe);
    }
    for (const sd of [-1, 1]) {
      const ly = B.topAt(-1.84), ry = sd * 0.28;   // lamps sunk in the wing tops: a dark pocket, swept back, two bright projector dots in it
      k.put(new THREE.SphereGeometry(0.1, 12, 8), '#0c0e12', sd * 0.6, ly - 0.045, -1.84, -0.39, ry, 0, 2.3, 0.4, 3.0, 'lit');
      for (const dz of [-0.1, 0.08]) k.ball(0.034, sd * 0.6 + dz * Math.sin(ry), ly - 0.01 + dz * 0.38, -1.84 + dz * Math.cos(ry), LAMP, 1, 0.8, 1, 'rlamp', 10);
      vent(k, [0.35, 0.36, 0.98, 0.36, 0.98, 0.66, 0.5, 0.6], sd * B.hwAt(0.65), sd, col);   // a deep scoop behind the door
      plate(k, [0.32, 0.6, 1.0, 0.66, 1.05, 0.72, 0.4, 0.66], sd * (B.hwAt(0.65) + 0.024), 0.04, col);   // the haunch swelling over it
      lamp(k, sd * 0.6, 0.68, 2.19, 1.7, 0.8, RED);   // a wide oval lamp each side
    }
    k.box(1.8, 0.34, 0.05, 0, 0.36, 2.185, '#202226', 0, 0, 0, 'lit');   // the tail, cut off square, dark
    for (const x of [-0.12, 0.12]) k.roll(0.065, 0.14, 12, x, 0.44, 2.19, '#d6d9dc', 'shiny');   // twin pipes in the middle
    k.box(0.9, 0.12, 0.06, 0, 0.3, -2.13, BLK, 0, 0, 0, 'lit');
  },
  coupe9(k, col) {   // cousin of the rear-engined German turbo coupe: a short low bonnet between proud front wings with upright oval lamps,
    // a tall glasshouse with an upright screen, the roof peaking over the driver and falling in one curve to the tail, broad flared
    // rear hips, a body-colour spoiler with a rubber edge, lamps joined by a dark band across the tail
    const cab = [[-0.6, 0.72, 0.69, 0.73], [-0.4, 0.71, 0.71, 1.06], [-0.05, 0.69, 0.74, 1.2], [0.4, 0.66, 0.77, 1.18], [0.85, 0.59, 0.8, 1.06], [1.2, 0.52, 0.81, 0.95], [1.52, 0.44, 0.81, 0.86]];
    const roof = capOver(cab, [[-0.24, 1.1], [0.1, 1.13], [0.5, 1.09], [0.68, 1.06], [0.82, 0.99], [0.92, 0.9], [0.98, 0.8], [1.53, 0.8]], 3);   // the roof falling in one curve to the lid, the side glass a D
    const B = racerBody(k, col, { w: [[-1.18, 0.31, 0.24], [1.02, 0.36, 0.36]], up: 3.0, crease: 0.1, style: 'five', mirror: [-0.5, 0.82], doors: [-0.58, 0.45],
      keys: [[-1.92, 0.55, 0.3, 0.44], [-1.78, 0.78, 0.25, 0.53], [-1.5, 0.84, 0.23, 0.63], [-1.18, 0.86, 0.23, 0.69], [-0.85, 0.84, 0.23, 0.66], [-0.55, 0.84, 0.23, 0.68], [0.0, 0.89, 0.24, 0.75], [0.55, 1.02, 0.25, 0.82], [1.02, 1.15, 0.25, 0.85], [1.45, 1.1, 0.27, 0.84], [1.8, 0.98, 0.31, 0.8], [2.0, 0.86, 0.38, 0.74]],
      cabin: cab, roof: roof, roofBelly: 0.2, roofDn: 8 });
    glassOn(k, roof, 0.98, 1.44, 0.62, 3, 0.2);   // the rear window, on the fastback
    for (const sd of [-1, 1]) {
      k.loft([[-1.88, 0.12, 0.45, 0.58], [-1.72, 0.2, 0.45, 0.76], [-1.2, 0.21, 0.45, 0.79], [-0.7, 0.19, 0.45, 0.74], [-0.45, 0.08, 0.45, 0.69]], col, 'rpaint', { up: 2.4, dn: 4, belly: 0.4, n: 14, x: sd * 0.62 });   // the front wings, proud
      k.put(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 18), LAMP, sd * 0.62, 0.66, -1.84, Math.PI / 2, 0, 0, 1, 1.25, 1, 'rlamp');   // an upright oval lamp on the front of each
      k.put(new THREE.TorusGeometry(0.105, 0.014, 4, 18), '#d6d9dc', sd * 0.62, 0.66, -1.83, 0, 0, 0, 1, 1.25, 1, 'shiny');
      k.box(0.34, 0.1, 0.05, sd * 0.6, 0.6, 2.01, RED, 0, 0, 0, 'rlamp');   // a lamp each side ...
      k.roll(0.05, 0.12, 10, sd * 0.36, 0.38, 1.98, '#cfd3d7', 'shiny');
    }
    k.box(0.86, 0.06, 0.04, 0, 0.62, 2.012, '#5a0d10', 0, 0, 0, 'lit');   // ... joined by a dark red band
    const sy = B.topAt(1.75);
    k.box(1.3, 0.1, 0.42, 0, sy + 0.02, 1.74, col, 0, -0.04, 0, 'rpaint');   // the spoiler: a raised tray in body colour ...
    for (const sd of [-1, 1]) k.box(0.05, 0.05, 0.42, sd * 0.63, sy + 0.12, 1.74, col, 0, -0.04, 0, 'rpaint');   // ... its raised sides ...
    k.box(1.34, 0.05, 0.05, 0, sy + 0.11, 1.96, BLK, 0, 0, 0, 'lit');   // ... and its black rubber edge
    k.box(1.55, 0.1, 0.04, 0, 0.5, 2.0, BLK, 0, 0, 0, 'lit');
    k.box(1.2, 0.1, 0.06, 0, 0.3, -1.88, BLK, 0, 0, 0, 'lit');
  },
  gtbrit(k, col) {   // cousin of the British V8 grand tourer: a long bonnet, the cabin set well back behind the front axle, fat hips swelling past
    // the cabin, a fastback to a short upturned ducktail, swept-back teardrop lamps
    const cab = [[-0.2, 0.72, 0.76, 0.8], [0.05, 0.71, 0.78, 1.03], [0.45, 0.68, 0.8, 1.13], [0.9, 0.63, 0.82, 1.11], [1.3, 0.56, 0.85, 1.0], [1.62, 0.47, 0.88, 0.93]];
    const roof = capOver(cab, [[0.2, 1.06], [0.65, 1.08], [0.95, 1.04], [1.15, 0.99], [1.3, 0.94], [1.42, 0.9], [1.5, 0.85], [1.63, 0.85]], 3);   // a fastback, the side glass tapering to a point
    const B = racerBody(k, col, { w: [[-1.3, 0.33, 0.26], [1.26, 0.35, 0.3]], up: 3.2, crease: 0.25, style: 'ten', mirror: [-0.1, 0.86], doors: [-0.2, 0.85],
      keys: [[-1.98, 0.6, 0.32, 0.52], [-1.84, 0.84, 0.26, 0.62], [-1.58, 0.92, 0.25, 0.7], [-1.3, 0.94, 0.25, 0.75], [-0.75, 0.91, 0.25, 0.77], [-0.2, 0.89, 0.25, 0.79], [0.45, 0.93, 0.25, 0.82], [0.9, 1.03, 0.26, 0.86], [1.26, 1.08, 0.26, 0.88], [1.65, 1.03, 0.28, 0.9], [1.9, 0.92, 0.32, 0.92], [2.0, 0.84, 0.4, 0.92]],
      cabin: cab, roof: roof, roofBelly: 0.2, roofDn: 8 });
    glassOn(k, roof, 1.0, 1.58, 0.6, 3, 0.2);   // the rear window
    windowTrim(k, B, cab, roof, 0.02, 1.46, 3);   // a thin bright surround
    k.ball(0.3, 0, 0.42, -1.965, BLK, 1.9, 0.38, 0.25, 'lit', 16).ball(0.3, 0, 0.42, -1.975, '#34373c', 1.7, 0.3, 0.2, 'lit', 16);   // a wide low mouth: dark round its edge, a lighter mesh inside ...
    k.put(new THREE.TorusGeometry(0.3, 0.011, 4, 26), '#b9bec4', 0, 0.42, -1.985, 0, 0, 0, 1.9, 0.38, 1, 'shiny');   // ... behind a thin satin lip
    for (const sd of [-1, 1]) {
      cover(k, sd * 0.6, 0.63, -1.76, 1.0, 0.5, 2.2, sd * 0.35);   // swept-back teardrop lamps
      k.box(0.02, 0.04, 0.3, sd * (B.hwAt(-0.85) + 0.004), 0.55, -0.85, '#d6d9dc', 0, 0, 0, 'shiny');   // a strake behind the front wheel
      k.box(0.5, 0.05, 0.05, sd * 0.52, 0.8, 1.99, RED, 0, 0, 0, 'rlamp').box(0.18, 0.05, 0.05, sd * 0.79, 0.8, 1.92, RED, sd * 0.5, 0, 0, 'rlamp');   // a slim lamp each side, round the corner
      k.roll(0.055, 0.12, 10, sd * 0.45, 0.4, 1.97, '#cfd3d7', 'shiny');
    }
    k.box(1.28, 0.03, 0.14, 0, B.topAt(1.95) - 0.005, 1.97, col, 0, -0.38, 0, 'rpaint');   // the ducktail, kicked up
    k.box(1.2, 0.12, 0.1, 0, 0.3, 1.94, BLK, 0, 0, 0, 'lit');
  },
  raging(k, col) {   // cousin of the sharp Italian V10: short, all edges, one arc from nose to tail, the windscreen pushed forward over the
    // front wheels, slashes of lamps up the wings, a big recessed trapezoid mouth across the nose, big black intakes
    const B = racerBody(k, col, { w: [[-1.2, 0.33, 0.27], [1.22, 0.35, 0.32]], up: 6, crease: 0.55, style: 'star', rim: '#7a7f86', mirror: [-0.8, 0.86], doors: [-0.85, 0.55],
      keys: [[-1.83, 0.66, 0.28, 0.42], [-1.7, 0.92, 0.23, 0.55], [-1.45, 0.99, 0.23, 0.68], [-1.2, 1.0, 0.23, 0.76], [-0.9, 0.98, 0.23, 0.79], [-0.3, 0.97, 0.23, 0.8], [0.4, 0.99, 0.24, 0.82], [0.85, 1.02, 0.25, 0.84], [1.22, 1.04, 0.25, 0.85], [1.55, 1.02, 0.27, 0.82], [1.8, 0.98, 0.31, 0.77], [1.9, 0.94, 0.38, 0.73]],
      cabin: [[-0.98, 0.76, 0.74, 0.79], [-0.7, 0.74, 0.76, 0.98], [-0.2, 0.7, 0.78, 1.08], [0.35, 0.66, 0.8, 1.07], [0.8, 0.6, 0.82, 0.98], [1.1, 0.52, 0.84, 0.9]], cabinUp: 6,
      roof: [[-0.45, 0.53, 1.0, 1.06], [0.0, 0.56, 1.02, 1.09], [0.45, 0.52, 1.0, 1.06]], roofUp: 6 });
    const trap = (w0, w1, h) => { const t = new THREE.Shape(); t.moveTo(-w0, 0); t.lineTo(w0, 0); t.lineTo(w1, h); t.lineTo(-w1, h); t.closePath(); return new THREE.ShapeGeometry(t); };
    k.put(trap(0.78, 0.6, 0.2), BLK, 0, 0.25, -1.836, 0, Math.PI, 0, 1, 1, 1, 'lit').put(trap(0.7, 0.54, 0.15), '#34373c', 0, 0.275, -1.842, 0, Math.PI, 0, 1, 1, 1, 'lit');   // the mouth, its mesh inside
    for (const sd of [-1, 1]) {
      k.box(0.44, 0.03, 0.1, sd * 0.6, B.topAt(-1.58) - 0.03, -1.58, LAMP, sd * 0.3, -0.25, sd * -0.3, 'rlamp');   // a slash of a lamp up each wing
      vent(k, [0.45, 0.32, 0.98, 0.32, 0.98, 0.66, 0.6, 0.62], sd * B.hwAt(0.75), sd, col);   // a big intake ahead of the rear wheel
      plate(k, [0.42, 0.62, 1.0, 0.66, 1.0, 0.7, 0.5, 0.67], sd * (B.hwAt(0.75) + 0.024), 0.04, col);
      k.box(0.46, 0.03, 0.05, sd * 0.56, 0.665, 1.905, RED, 0, 0, 0, 'rlamp').box(0.4, 0.03, 0.05, sd * 0.58, 0.6, 1.905, RED, 0, 0, 0, 'rlamp');   // two thin lamp bars each side, where the roof's arc runs out
    }
    for (const [wz, r] of [[-1.2, 0.33], [1.22, 0.35]]) for (const sd of [-1, 1]) {   // the arches' lips, flat-topped and angular
      const hx = sd * (B.hwAt(wz) + 0.006), R = r + 0.06;
      k.box(0.03, 0.035, 0.44, hx, r + R * 0.93, wz, col, 0, 0, 0, 'rpaint');
      for (const e of [-1, 1]) k.box(0.03, 0.035, 0.34, hx, r + R * 0.58, wz + e * 0.34, col, 0, e * 1.0, 0, 'rpaint');
    }
    k.box(0.9, 0.02, 0.5, 0, B.topAt(1.42) - 0.006, 1.42, '#1a2430', 0, 0.12, 0, 'rglass');   // a glass engine cover, slatted
    for (let i = 0; i < 5; i++) k.box(0.92, 0.014, 0.03, 0, B.topAt(1.22 + i * 0.1) + 0.012, 1.22 + i * 0.1, BLK, 0, 0, 0, 'lit');
    k.box(1.7, 0.22, 0.05, 0, 0.36, 1.905, '#202226', 0, 0, 0, 'lit');   // a dark mesh tail
    for (const x of [-0.12, 0.12]) k.roll(0.06, 0.12, 10, x, 0.4, 1.9, '#cfd3d7', 'shiny');
  },
  trident(k, col) {   // cousin of the curvy Italian grand tourer: front-engined, a three-box shape - a flat roof, upright side glass in a bright
    // frame, a kinked rear pillar, a short separate boot - a wide low mouth with one blade, swept twin-lens lamp pods, oval lamps
    const cab = [[-0.45, 0.74, 0.8, 0.84], [-0.2, 0.73, 0.82, 1.06], [0.2, 0.71, 0.84, 1.2], [0.6, 0.68, 0.86, 1.17], [1.0, 0.62, 0.88, 1.07], [1.3, 0.55, 0.9, 0.98], [1.45, 0.51, 0.9, 0.955]];   // (narrowing to the back)
    const roof = capOver(cab, [[-0.1, 1.07], [0.2, 1.13], [0.55, 1.11], [0.76, 1.08], [0.84, 1.0], [0.88, 0.93], [0.9, 0.86], [1.46, 0.86]], 4);   // the roof peaking over the driver, falling to the pillar
    const B = racerBody(k, col, { w: [[-1.36, 0.33, 0.26], [1.32, 0.35, 0.29]], up: 2.8, crease: 0.14, style: 'seven', mirror: [-0.36, 0.92], doors: [-0.45, 0.95],
      keys: [[-2.08, 0.6, 0.35, 0.56], [-1.95, 0.84, 0.29, 0.66], [-1.7, 0.92, 0.27, 0.74], [-1.36, 0.94, 0.27, 0.79], [-0.8, 0.92, 0.27, 0.8], [-0.1, 0.9, 0.27, 0.82], [0.6, 0.92, 0.27, 0.86], [1.05, 0.95, 0.28, 0.9], [1.32, 0.97, 0.28, 0.93], [1.65, 0.95, 0.3, 0.95], [1.92, 0.9, 0.35, 0.95], [2.0, 0.82, 0.42, 0.93]],
      cabin: cab, cabinUp: 4, roof: roof, roofUp: 4, roofBelly: 0.2, roofDn: 8 });
    glassOn(k, roof, 0.92, 1.42, 0.62, 4, 0.2);   // the rear window, raked down to a short flat boot
    windowTrim(k, B, cab, roof, -0.3, 0.88, 4);   // upright side glass in a bright frame
    k.ball(0.3, 0, 0.42, -2.035, BLK, 1.85, 0.42, 0.25, 'lit', 16).ball(0.3, 0, 0.42, -2.045, '#34373c', 1.68, 0.34, 0.2, 'lit', 16);   // a wide low mouth, a mesh inside ...
    k.put(new THREE.TorusGeometry(0.3, 0.011, 4, 26), '#b9bec4', 0, 0.42, -2.055, 0, 0, 0, 1.85, 0.42, 1, 'shiny');   // ... a satin lip round it
    for (const sd of [-1, 1]) {
      cover(k, sd * 0.6, 0.67, -1.84, 2.3, 0.42, 1.5, sd * 0.45);   // a wide swept lamp
      plate(k, [0.66, 0.865, 0.89, 0.865, 0.89, 0.975], sd * 0.655, 0.03, col);   // the pillar's foot, kinked forward
      lamp(k, sd * 0.6, 0.74, 2.022, 1.5, 0.85, RED); k.ball(0.06, sd * 0.38, 0.74, 2.032, '#ffb24a', 1.3, 0.85, 0.3, 'rlamp', 8);   // oval lamps, an amber one inside
      k.roll(0.05, 0.12, 10, sd * 0.4, 0.44, 1.99, '#cfd3d7', 'shiny');
    }
    k.box(1.4, 0.14, 0.1, 0, 0.38, 1.97, BLK, 0, 0, 0, 'lit');
  },
  barchetta(k, col) {   // cousin of the open V12 two-seater: a very long bonnet with a scoop between raised wing crowns carrying almond lamps
    // under clear covers, the beltline running unbroken through the doors and kicking up over the rear wheels, a cockpit cut down to
    // the seats, hoops behind the heads, a low raked screen
    const B = racerBody(k, col, { w: [[-1.42, 0.33, 0.26], [1.36, 0.35, 0.3]], up: 3.2, crease: 0.14, style: 'five', mirror: [-0.45, 0.92], doors: [-0.42, 0.8],
      keys: [[-2.12, 0.62, 0.33, 0.54], [-1.98, 0.86, 0.27, 0.64], [-1.72, 0.93, 0.25, 0.72], [-1.42, 0.96, 0.25, 0.77], [-0.75, 0.94, 0.25, 0.8], [-0.42, 0.93, 0.25, 0.83], [-0.36, 0.92, 0.25, 0.62], [0.8, 0.93, 0.25, 0.62], [0.86, 0.95, 0.25, 0.86], [1.36, 1.0, 0.26, 0.92], [1.85, 0.96, 0.28, 0.9], [2.15, 0.87, 0.33, 0.87], [2.22, 0.8, 0.4, 0.85]] });
    for (const sd of [-1, 1]) {
      k.loft([[-0.46, 0.04, 0.3, 0.82], [-0.38, 0.075, 0.3, 0.85], [0.3, 0.08, 0.3, 0.87], [0.82, 0.075, 0.3, 0.88], [0.9, 0.04, 0.3, 0.88]], col, 'rpaint', { up: 2.4, dn: 6, belly: 0.6, n: 14, x: sd * 0.86 });   // the doors, rounded, up to the beltline
      k.loft([[-2.02, 0.1, 0.55, 0.62], [-1.85, 0.2, 0.55, 0.81], [-1.4, 0.22, 0.55, 0.86], [-0.9, 0.19, 0.55, 0.84], [-0.55, 0.08, 0.55, 0.81]], col, 'rpaint', { up: 2.4, dn: 4, belly: 0.4, n: 14, x: sd * 0.6 });   // the wing crowns
      cover(k, sd * 0.6, 0.72, -1.88, 1.6, 0.45, 2.0, sd * 0.2);   // almond lamps under clear covers
    }
    k.box(1.6, 0.03, 1.2, 0, 0.46, 0.25, BLK, 0, 0, 0, 'lit');   // the cockpit floor
    for (const x of [-0.38, 0.38]) {
      k.ball(0.24, x, 0.52, 0.4, '#1e1c1d', 0.95, 0.3, 1.0, 'lit', 12).put(new THREE.CapsuleGeometry(0.17, 0.2, 4, 10), '#1e1c1d', x, 0.66, 0.66, 0.26, 0, 0, 1.1, 0.75, 0.36, 'lit');   // the seats, low behind the beltline
      k.loft([[0.64, 0.11, 0.84, 0.93], [0.72, 0.15, 0.82, 1.06], [0.95, 0.165, 0.8, 1.07], [1.45, 0.13, 0.8, 0.97], [2.0, 0.05, 0.8, 0.88]], col, 'rpaint', { up: 3, dn: 3, belly: 0.3, n: 14, x: x });   // a headrest hump behind each head, flowing into the deck
      k.put(new THREE.CapsuleGeometry(0.15, 0.26, 4, 10), x > 0 ? '#e8e4da' : '#2a3a5a', x, 0.8, 0.5, 0.15, 0, 0, 1.25, 1, 0.8, 'lit');   // the two aboard
      k.ball(0.11, x, 1.14, 0.48, '#e2ae86', 1, 1.1, 1.05, 'lit', 12).ball(0.118, x, 1.19, 0.51, x > 0 ? '#2a1c12' : '#c89a4a', 1.04, 0.82, 1.08, 'lit', 12);
    }
    k.box(1.42, 0.26, 0.02, 0, 0.8, -0.5, '#3c5568', 0, 0.95, 0, 'rglass').box(1.46, 0.022, 0.03, 0, 1.03, -0.37, '#e4e7ea', 0, 0.95, 0, 'shiny');   // a low raked tinted screen, its bright frame
    for (const sd of [-1, 1]) k.box(0.022, 0.27, 0.03, sd * 0.72, 0.8, -0.5, '#e4e7ea', 0, 0.95, 0, 'shiny');
    k.box(0.4, 0.07, 0.6, 0, B.topAt(-1.2) - 0.01, -1.2, BLK, 0, 0, 0, 'lit');   // the bonnet scoop
    k.box(0.8, 0.12, 0.06, 0, 0.32, -2.09, BLK, 0, 0, 0, 'lit');
    for (const sd of [-1, 1]) {
      k.box(0.17, 0.11, 0.05, sd * 0.5, 0.7, 2.24, RED, 0, 0, 0, 'rlamp').box(0.17, 0.11, 0.05, sd * 0.72, 0.7, 2.215, RED, 0, 0, 0, 'rlamp');   // two square lamps each side
      for (const dx of [0, 0.13]) k.roll(0.045, 0.12, 10, sd * (0.4 + dx), 0.4, 2.22, '#cfd3d7', 'shiny');
    }
  }
});
export const TRAFFIC_ORDER = ['hatch', 'saloon', 'van', 'bus', 'camper', 'tractor', 'lorry', 'sports', 'wedge', 'lemans', 'coupe9', 'gtbrit', 'raging', 'trident', 'barchetta'];
const TCOL = { hatch: [0, 1, 2, 4, 5, 6], saloon: [0, 1, 2, 3, 6, 7], van: [2, 2, 2, 6, 1], bus: [0, 4], camper: [5, 4, 1, 7], tractor: [5, 0], lorry: [2, 1, 3], sports: [0, 4, 7, 1],
  wedge: ['#d10f1d', '#f2c230', '#e8eaec', '#e2531c'], lemans: ['#2e64d8', '#d62a1c', '#f4f4f4', '#e2531c'], coupe9: ['#c0c4c8', '#c81e1e', '#f2f2ee', '#2f6b48'], gtbrit: ['#2f6b48', '#c0c4c8', '#8a8f96', '#c9a227'],
  raging: ['#9fd000', '#ef7d00', '#f2c230', '#f4f4f2'], trident: ['#2b4fa0', '#e8e4da', '#c0c4c8', '#5a6b78'], barchetta: ['#c81e1e', '#e8c02a', '#c0c4c8', '#2e64d8'] };   // (the racers: their own colours)
export function trafficModel(t, colIdx) {
  const id = TRAFFIC_ORDER[t], cols = TCOL[id], c0 = cols[colIdx % cols.length], col = typeof c0 === 'string' ? c0 : CARCOL[c0], key = 'veh|' + id + '|' + col;
  let m = cache.get(key); if (m) return m;
  const k = new Kit(); TRAFFIC[id](k, col);
  m = k.build(); cache.set(key, m);
  return m;
}

// ---------------------------------------------------------------- your car: a smooth lofted body (glossy paint), glass, chrome, two people aboard
// The body is drawn through cross-sections from the nose (-Z) to the tail (+Z): at each, a half-width, a bottom and a top,
// and a rounded-box shape between them; the bottom rises over the wheels into arches. keys: paint, trim (black),
// chrome, glass, tyre, lit (people, seats), glow (lights); the four wheels are apart (they turn and steer).
function sections(keys, wheelZ, arch) {   // cross-sections along the body: [z, halfWidth, bottom, top]; arch: [[centre height, radius] per wheel] (default: the roadster's)
  const at = (z) => { let i = 0; while (i < keys.length - 2 && keys[i + 1][0] < z) i++; const a = keys[i], b = keys[i + 1], f = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0]))); return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f]; };
  const z0 = keys[0][0], z1 = keys[keys.length - 1][0], zs = [];
  for (let i = 0, nn = arch ? 18 : 26; i <= nn; i++) zs.push(z0 + (z1 - z0) * (0.5 - 0.5 * Math.cos(i / nn * Math.PI)));   // closer together at the nose and tail
  for (const wz of wheelZ) for (const o of arch ? [-0.42, -0.38, -0.32, -0.22, -0.1, 0, 0.1, 0.22, 0.32, 0.38, 0.42] : [-0.46, -0.4, -0.385, -0.36, -0.32, -0.26, -0.18, -0.09, 0, 0.09, 0.18, 0.26, 0.32, 0.36, 0.385, 0.4, 0.46]) zs.push(wz + o);
  for (const kk of keys) zs.push(kk[0]);
  zs.sort((a, b) => a - b);
  const out = [];
  for (const z of zs) {
    if (z < z0 || z > z1 || (out.length && z - out[out.length - 1][0] < 0.012)) continue;
    const s = at(z); let bot = arch ? 0 : 0.3;   // (the racers ride lower)
    wheelZ.forEach((wz, wi) => { const A = arch ? arch[wi] : [0.34, 0.39], d = (z - wz) / A[1]; if (Math.abs(d) < 1) bot = Math.max(bot, A[0] + A[1] * Math.sqrt(1 - d * d)); });   // round the tyre, a hand's width clear
    out.push([z, s[0], Math.max(s[1], bot), arch ? Math.max(s[2], Math.max(s[1], bot) + 0.05) : s[2], Math.max(s[1], 0.3)]);   // (and the bottom without the arch)
  }
  return out;
}
Kit.prototype.loft = function (st, col, key, opt) {   // a smooth closed body through cross-sections [z, halfWidth, bottom, top]
  opt = opt || {}; const N = opt.n || 28, up = opt.up || 3, dn = opt.dn || 6, belly = opt.belly == null ? 0.45 : opt.belly;
  if (opt.crease != null) return this.creased(st, col, key, opt);
  const pos = [], idx = [];
  for (const [z, hw, y0, yt] of st) {
    const ym = y0 + (yt - y0) * belly;
    for (let j = 0; j < N; j++) {
      const a = j / N * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), e = s >= 0 ? 2 / up : 2 / dn;
      pos.push(hw * Math.sign(c) * Math.pow(Math.abs(c), e), s >= 0 ? ym + (yt - ym) * Math.pow(s, e) : ym - (ym - y0) * Math.pow(-s, e), z);
    }
  }
  for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < N; j++) { const a = i * N + j, b = i * N + (j + 1) % N, c = (i + 1) * N + j, d = (i + 1) * N + (j + 1) % N; idx.push(a, b, c, b, d, c); }
  const L = st.length - 1, f0 = pos.length / 3;
  pos.push(0, (st[0][2] + st[0][3]) / 2, st[0][0] - 0.015, 0, (st[L][2] + st[L][3]) / 2, st[L][0] + 0.015);
  for (let j = 0; j < N; j++) { idx.push(f0, (j + 1) % N, j); idx.push(f0 + 1, L * N + j, L * N + (j + 1) % N); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return this.put(g, col, opt.x || 0, opt.y || 0, opt.z || 0, 0, 0, 0, 1, 1, 1, key || 'paint');
};
Kit.prototype.creased = function (st, col, key, opt) {   // the same body in two halves that meet at a crisp shoulder line, the flank below
  // it upright, the body above it leaning in (opt.crease: how far, per metre of height); each half has its own normals, so the line stays sharp
  const N = opt.n || 28, H = N >> 1, R = H + 1, up = opt.up || 3, dn = opt.dn || 6, belly = opt.belly == null ? 0.45 : opt.belly, tkf = typeof opt.crease === 'function' ? opt.crease : () => opt.crease;   // (a number, or a function of z)
  const mid = (s) => { const b0 = s[4] == null ? s[2] : s[4]; return Math.min(s[3] - 0.004, Math.max(s[2] + 0.004, b0 + (s[3] - b0) * belly)); };
  for (const half of [0, 1]) {
    const pos = [], idx = [];
    for (const s of st) {
      const [z, hw, y0, yt] = s, ym = mid(s), tk = tkf(z);
      for (let j = 0; j <= H; j++) {
        const a = (half + j / H) * Math.PI, c = Math.cos(a), sn = Math.abs(Math.sin(a));
        if (!half) { const e = 2 / up, y = ym + (yt - ym) * Math.pow(sn, e); pos.push(Math.sign(c) * Math.pow(Math.abs(c), e) * Math.max(0, hw - tk * (y - ym)), y, z); }
        else { const e = 2 / dn; pos.push(Math.sign(c) * Math.pow(Math.abs(c), e) * hw, ym - (ym - y0) * Math.pow(sn, e), z); }
      }
    }
    for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < H; j++) { const a = i * R + j, b = a + 1, c = a + R, d = c + 1; idx.push(a, b, c, b, d, c); }
    const L = st.length - 1, f0 = pos.length / 3;
    pos.push(0, mid(st[0]), st[0][0] - 0.015, 0, mid(st[L]), st[L][0] + 0.015);
    for (let j = 0; j < H; j++) { idx.push(f0, j + 1, j); idx.push(f0 + 1, L * R + j, L * R + j + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    this.put(g, col, opt.x || 0, opt.y || 0, opt.z || 0, 0, 0, 0, 1, 1, 1, key || 'paint');
  }
  return this;
};
const CARDEF = {
  roadster: { col: '#d2101e', len: 2.28, w: 1.92, wz: [-1.38, 1.38],
    keys: [[-2.28, 0.66, 0.4, 0.58], [-2.12, 0.86, 0.31, 0.69], [-1.75, 0.94, 0.29, 0.75], [-1.0, 0.95, 0.29, 0.79], [-0.45, 0.94, 0.28, 0.85], [0.3, 0.93, 0.28, 0.83], [1.0, 0.96, 0.28, 0.87], [1.6, 0.97, 0.29, 0.9], [2.06, 0.94, 0.31, 0.9], [2.28, 0.78, 0.4, 0.8]] },
  gt: { col: '#c3ccd6', len: 2.36, w: 1.96, wz: [-1.42, 1.44],
    keys: [[-2.36, 0.7, 0.4, 0.55], [-2.16, 0.9, 0.31, 0.64], [-1.6, 0.96, 0.29, 0.7], [-0.8, 0.97, 0.29, 0.77], [0, 0.97, 0.28, 0.8], [0.9, 0.98, 0.28, 0.84], [1.6, 0.99, 0.29, 0.86], [2.1, 0.95, 0.31, 0.84], [2.36, 0.8, 0.4, 0.74]],
    cabin: [[-0.85, 0.74, 0.7, 0.79], [-0.55, 0.73, 0.72, 1.0], [-0.1, 0.71, 0.74, 1.17], [0.45, 0.69, 0.76, 1.19], [0.95, 0.65, 0.78, 1.11], [1.45, 0.6, 0.8, 0.95], [1.8, 0.55, 0.8, 0.86]],
    roof: [[-0.28, 0.5, 1.07, 1.14], [0.1, 0.54, 1.11, 1.185], [0.55, 0.52, 1.12, 1.2], [0.95, 0.45, 1.06, 1.125]], cabinUp: 3 },
  hatch: { col: '#ffc01a', len: 2.02, w: 1.84, wz: [-1.24, 1.26],
    keys: [[-2.02, 0.68, 0.4, 0.62], [-1.84, 0.85, 0.31, 0.74], [-1.4, 0.91, 0.29, 0.84], [-0.9, 0.92, 0.29, 0.92], [0, 0.92, 0.29, 0.96], [1.2, 0.93, 0.29, 1.0], [1.8, 0.91, 0.3, 1.0], [2.02, 0.85, 0.36, 0.95]],
    cabin: [[-0.95, 0.8, 0.84, 0.93], [-0.55, 0.79, 0.88, 1.3], [0.3, 0.77, 0.92, 1.48], [1.3, 0.76, 0.94, 1.5], [1.8, 0.74, 0.95, 1.46], [1.97, 0.72, 0.95, 1.32]], cabinUp: 4.5,
    roof: [[-0.28, 0.6, 1.4, 1.5], [0.2, 0.64, 1.44, 1.535], [1.4, 0.64, 1.44, 1.545], [1.84, 0.6, 1.4, 1.5]] }
};
// ---------------------------------------------------------------- your red roadster: long, low and open, a tan cabin, a turning steering wheel
// (our own design: a wedge nose with flush lamps, scoops ahead of the rear wheels, louvres over the engine, humps behind
// the seats, a light bar across the tail and four pipes)
function spider() {
  const k = new Kit(), col = '#d10f1d', len = 2.3, w = 1.98, wz = [-1.42, 1.42];
  const keys = [[-2.32, 0.6, 0.36, 0.44], [-2.18, 0.82, 0.3, 0.53], [-1.92, 0.93, 0.28, 0.645], [-1.42, 1.0, 0.28, 0.76], [-0.95, 0.97, 0.28, 0.79], [-0.52, 0.94, 0.28, 0.81],
    [-0.42, 0.93, 0.28, 0.8], [-0.33, 0.92, 0.28, 0.47], [0.9, 0.93, 0.28, 0.47], [0.99, 0.95, 0.28, 0.85], [1.2, 1.08, 0.28, 0.85], [1.45, 1.13, 0.28, 0.858], [1.72, 1.11, 0.29, 0.865], [2.1, 1.04, 0.3, 0.875], [2.2, 1.0, 0.31, 0.89], [2.27, 0.95, 0.36, 0.92], [2.31, 0.87, 0.42, 0.915]];
  const st = sections(keys, wz), at = (z) => { let b = st[0]; for (const s of st) if (Math.abs(s[0] - z) < Math.abs(b[0] - z)) b = s; return b; };
  const tone = (n) => { const list = k.parts.paint; for (let q = list.length - (n || 1); q < list.length; q++) { const g = list[q], P3 = g.attributes.position, C3 = g.attributes.color;   // two-tone shading: deeper red low down and along the sills, a touch brighter on the shoulders
    for (let i = 0; i < P3.count; i++) { const y = P3.getY(i), f = y > 0.8 ? 1.15 : y > 0.62 ? 1 + (y - 0.62) / 0.18 * 0.15 : y > 0.45 ? 0.74 + 0.26 * (y - 0.45) / 0.17 : 0.62 + 0.12 * Math.min(1, Math.max(0, (y - 0.3) / 0.15)); C3.setXYZ(i, C3.getX(i) * f, C3.getY(i) * f, C3.getZ(i) * f); } } };
  k.loft(st, col, 'paint', { up: 3.6, dn: 6, belly: 0.5, crease: (z) => z < 0.95 ? 0.32 : z < 1.25 ? 0.32 + (z - 0.95) / 0.3 * 0.43 : z < 2.2 ? 0.75 : 0.75 - (z - 2.2) / 0.11 * 0.15 }); tone(2);   // a crisp shoulder line along the flanks: upright below it, leaning in above (more over the rear wheels: hips)
  // the cabin: a black tub, low black leather seats, the dash and its glowing dials, a raked curved windscreen in a slim black frame
  k.box(1.74, 0.03, 1.34, 0, 0.465, 0.29, '#121212', 0, 0, 0, 'trim');   // the floor, down in the well
  k.box(0.22, 0.2, 1.1, 0, 0.47, 0.25, '#1c1c1e', 0, 0, 0, 'trim');   // the transmission tunnel between the seats
  k.box(1.7, 0.34, 0.04, 0, 0.465, -0.33, '#141414', 0, 0, 0, 'trim');   // the footwell's front wall, under the dash
  for (const sd of [-1, 1]) {   // the doors, standing up either side of the well, flush with the body, their tops rising towards the back
    k.side([0.43, 0.3, 0.43, 0.76, 0.39, 0.79, -0.93, 0.83, -0.99, 0.8, -0.99, 0.3], 0.07, sd * 0.885, 0, 0, col, 'paint', 0.025); tone();
    k.box(0.02, 0.28, 1.3, sd * 0.84, 0.5, 0.28, '#1e1c1d', 0, 0, 0, 'lit');   // the door card, black leather
    k.box(0.04, 0.025, 0.9, sd * 0.825, 0.66, 0.36, '#3a3436', 0, 0, 0, 'lit');   // its armrest
  }
  for (const x of [-0.4, 0.4]) {
    k.ball(0.26, x, 0.5, 0.44, '#232022', 0.95, 0.3, 1.0, 'lit', 14);   // the cushion, low
    k.put(new THREE.CapsuleGeometry(0.17, 0.26, 4, 12), '#1e1c1d', x, 0.7, 0.75, 0.26, 0, 0, 1.15, 1, 0.36, 'lit');   // the backrest, shoulder high
    k.box(0.07, 0.32, 0.02, x, 0.5, 0.69, '#3a3436', 0, 0.26, 0, 'lit');   // its stitched centre panel
    for (const b of [-1, 1]) { k.put(new THREE.CapsuleGeometry(0.05, 0.36, 4, 8), '#2b2729', x + b * 0.21, 0.52, 0.44, Math.PI / 2, 0, 0, 1, 1, 0.8, 'lit'); k.put(new THREE.CapsuleGeometry(0.05, 0.24, 4, 8), '#2b2729', x + b * 0.19, 0.7, 0.73, 0.26, 0, 0, 1, 1, 0.9, 'lit'); }   // bolsters, seat and back
    k.loft([[0.9, 0.13, 0.8, 0.9], [1.05, 0.14, 0.8, 0.92], [1.6, 0.12, 0.8, 0.905], [2.2, 0.1, 0.8, 0.895]], col, 'paint', { up: 6, dn: 3, belly: 0.3, n: 20, x: x, crease: 0.6 });   // long low fairings behind the seats, running back into the ducktail
    k.ball(0.1, x, 0.9, 0.9, '#1e1c1d', 1.2, 0.45, 0.6, 'lit', 12);   // a leather pad on the front of each
  }
  k.box(1.56, 0.07, 0.28, 0, 0.76, -0.5, '#26221f', 0, 0, 0, 'trim');
  k.put(new THREE.CapsuleGeometry(0.14, 1.28, 4, 16), '#2a2628', 0, 0.83, -0.5, 0, 0, Math.PI / 2, 0.3, 1, 1, 'lit');   // the leather roll along its top
  k.ball(0.17, 0.4, 0.905, -0.43, '#1a1a1c', 1.3, 0.34, 0.55, 'trim', 14);   // the hood over the dials
  for (const x of [0.29, 0.51]) { k.cyl(0.05, 0.05, 0.02, 14, x, 0.87, -0.31, '#e4eaf0', Math.PI / 2, 0, 'lit'); k.put(new THREE.TorusGeometry(0.048, 0.006, 4, 18), '#f2efe6', x, 0.87, -0.322, 0, 0, 0, 1, 1, 1, 'chrome'); k.box(0.006, 0.036, 0.004, x + 0.01, 0.852, -0.324, '#ff6a3d', 0, 0, -0.6, 'glow'); }
  {
    const NC = 8, bot = [], top = [], H = 0.36, A = 1.0;
    for (let i = 0; i <= NC; i++) { const u = i / NC * 2 - 1, sw = 0.1 * u * u; bot.push([u * 0.78, 0.8, -0.72 + sw]); top.push([u * 0.65, 0.8 + H * Math.cos(A), -0.72 + H * Math.sin(A) + sw]); }
    const pos = [], idx = []; for (let i = 0; i <= NC; i++) pos.push(...bot[i], ...top[i]);
    for (let i = 0; i < NC; i++) idx.push(i * 2, i * 2 + 2, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 1);
    for (const flip of [false, true]) {   // both faces, each smooth
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(flip ? idx.map((v, j) => idx[j - j % 3 + (2 - j % 3)]) : idx); g.computeVertexNormals(); k.put(g, '#d8e6ef', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'screen');
    }
    const rail = (pts, r) => k.put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), pts.length * 3, r, 5, false), '#121212', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'trim');
    rail(top, 0.011); rail([bot[0], top[0]], 0.013); rail([bot[NC], top[NC]], 0.013);
    k.box(0.15, 0.04, 0.025, 0, top[NC >> 1][1] - 0.055, top[NC >> 1][2] + 0.012, '#121212', 0, A, 0, 'trim');   // the mirror
  }
  // the engine vent between the fairings, scoops ahead of the rear wheels, slim black mirrors
  k.box(0.5, 0.008, 0.64, 0, at(1.55)[3] - 0.004, 1.55, '#2a0408', 0, 0, 0, 'trim');   // a dark recess
  for (let i = 0; i < 7; i++) { const z = 1.27 + i * 0.093; k.box(0.46, 0.014, 0.04, 0, at(z)[3] - 0.002, z, '#121214', 0, -0.35, 0, 'trim'); }   // its louvres
  for (const sd of [-1, 1]) {
    const hw = at(0.72)[1];
    k.put(new THREE.CapsuleGeometry(0.075, 0.42, 6, 12), '#141414', sd * (hw - 0.02), 0.58, 0.74, Math.PI / 2, 0, 0, 0.45, 1, 1, 'trim');   // a rounded intake
    k.put(new THREE.CapsuleGeometry(0.085, 0.44, 6, 12), col, sd * (hw - 0.008), 0.61, 0.72, Math.PI / 2, 0, 0, 0.3, 1, 0.55, 'paint');   // its lip
    k.box(0.05, 0.05, 0.8, sd * (hw - 0.005), 0.71, 0.7, col, 0, 0, 0, 'paint');
    k.box(0.025, 0.06, 0.05, sd * 0.925, 0.77, -0.4, '#141416', 0, 0, sd * -0.6, 'trim');   // a short black arm off the front of the door
    k.ball(0.06, sd * 0.99, 0.85, -0.41, '#141416', 1.4, 0.6, 1.6, 'trim', 14).ball(0.05, sd * 0.99, 0.85, -0.32, '#2a3440', 1.4, 0.55, 0.25, 'glass', 10);   // a flat black teardrop pod, the glass on its back
  }
  // the nose: flush glass over the lamps, a dark mouth and a splitter
  const nz = -1.98, ny = at(nz)[3];
  for (const sd of [-1, 1]) {
    k.box(0.36, 0.024, 0.2, sd * 0.58, ny - 0.04, nz, '#1a1e24', 0, -0.4, 0, 'glass');   // a dark lamp housing, flush in the wedge
    k.box(0.3, 0.012, 0.05, sd * 0.58, ny - 0.02, nz - 0.05, '#fffbe8', 0, -0.4, 0, 'glow');   // a slim lamp in it
    k.box(0.34, 0.015, 0.03, sd * 0.52, ny - 0.09, nz - 0.17, '#e8f4ff', 0, -0.4, 0, 'glow');   // a running-light strip along its front edge
  }
  k.box(0.8, 0.09, 0.1, 0, 0.33, -len + 0.03, '#0d0d0d', 0, 0, 0, 'trim').box(1.05, 0.03, 0.16, 0, 0.29, -2.2, '#0d0d0d', 0, 0, 0, 'trim');
  // the tail: a narrow black band carrying slim lamps that wrap round the corners, joined by a fine light line; a finned
  // diffuser, two pipes and the plate
  for (const sd of [-1, 1]) {   // a lamp each side: a bold bar in a black housing, kinked up at its outer end
    k.box(0.44, 0.1, 0.045, sd * 0.47, 0.64, len + 0.006, '#0b0b0c', 0, 0, 0, 'trim').box(0.4, 0.078, 0.05, sd * 0.47, 0.651, len + 0.012, '#ff0a18', 0, 0, 0, 'brake');
    k.box(0.17, 0.1, 0.045, sd * 0.71, 0.67, len + 0.006, '#0b0b0c', 0, 0, sd * 0.45, 'trim').box(0.15, 0.078, 0.05, sd * 0.71, 0.681, len + 0.012, '#ff0a18', 0, 0, sd * 0.45, 'brake');
  }
  k.box(1.2, 0.02, 0.13, 0, 0.895, len + 0.03, col, 0, -0.21, 0, 'paint');   // the ducktail's crisp lip (as wide as the rounded tail is, up there)
  k.box(1.3, 0.025, 0.04, 0, 0.865, len + 0.012, '#0b0b0c', 0, 0, 0, 'trim');   // and the shadow line under it
  k.box(1.0, 0.1, 0.3, 0, 0.29, len - 0.1, '#3c4046', 0, 0, 0, 'trim');   // the diffuser, and its fins
  for (let i = 0; i < 5; i++) k.box(0.02, 0.09, 0.24, -0.2 + i * 0.1, 0.295, len - 0.02, '#5a5e64', 0, 0, 0, 'trim');
  for (const x of [-0.4, 0.4]) { k.roll(0.085, 0.12, 18, x, 0.36, len, '#c9cdd2', 'lit'); k.roll(0.058, 0.02, 14, x, 0.36, len + 0.055, '#0e0e10', 'trim'); }   // two big bright pipes, dark inside
  k.box(0.44, 0.093, 0.02, 0, 0.645, len + 0.03, '#ffffff', 0, 0, 0, 'plate');   // the plate, on the red between the lamps
  // the wheel arches: a dark well inside, a flared lip round the outside
  for (const z of wz) for (const sd of [-1, 1]) {
    const hw = at(z)[1];
    k.put(new THREE.CylinderGeometry(0.385, 0.385, 0.34, 20, 1, true, -Math.PI / 2, Math.PI), '#0b0b0b', sd * (hw - 0.2), 0.34, z, 0, 0, Math.PI / 2, 1, 1, 1, 'trim');
    k.put(new THREE.TorusGeometry(0.395, 0.018, 6, 24, Math.PI), col, sd * (hw - 0.01), 0.34, z, 0, sd * Math.PI / 2, 0, 1, 1, 1, 'paint');
  }
  for (const sd of [-1, 1]) { const hw = at(0)[1];
    k.box(0.05, 0.11, 1.9, sd * (hw - 0.01), 0.3, 0, '#151517', 0, 0, 0, 'trim'); }   // the sills
  // the underside (you see it when she rolls): a dark floor pan between the axles, the axles, a diff, a fuel tank, twin exhausts
  k.box(1.5, 0.02, 2.1, 0, 0.255, 0, '#3a3d42', 0, 0, 0, 'trim').box(0.34, 0.03, 2.1, 0, 0.228, 0, '#1e2022', 0, 0, 0, 'trim');
  for (const z of wz) k.put(new THREE.CylinderGeometry(0.032, 0.032, 1.62, 8), '#3a3c40', 0, 0.34, z, 0, 0, Math.PI / 2, 1, 1, 1, 'trim');
  k.box(0.26, 0.17, 0.24, 0, 0.25, wz[1], '#2c2e31', 0, 0, 0, 'trim').box(0.7, 0.08, 0.45, 0, 0.175, 0.55, '#6c7076', 0, 0, 0, 'trim');
  for (const sd of [-1, 1]) k.put(new THREE.CylinderGeometry(0.036, 0.036, 2.0, 8), '#8e9196', sd * 0.42, 0.225, 1.2, Math.PI / 2, 0, 0, 1, 1, 1, 'chrome');
  // red brake calipers (they stay put while the wheels turn)
  const wx = w / 2 - 0.08, wxr = wx + 0.06;   // (the rear pair further out, under the hips)
  for (const z of wz) for (const sd of [-1, 1]) k.box(0.05, 0.13, 0.17, sd * ((z > 0 ? wxr : wx) - 0.15), 0.43, z - 0.1, '#d01818', 0, 0, 0, 'lit');
  return { k: k, len: len, w: w, wz: wz, wx: wx, wxr: wxr };
}
function bigWheel() {   // a low tyre, a five-spoke star rim and the brake disc behind it
  const wk = new Kit();
  wk.axle(0.34, 0.27, 24, 0, 0, 0, '#1c1c1e', 'tyre').axle(0.285, 0.275, 22, 0, 0, 0, '#232325', 'tyre');
  wk.axle(0.25, 0.05, 20, -0.05, 0, 0, '#3a3d40', 'trim');   // the disc
  wk.put(new THREE.TorusGeometry(0.27, 0.026, 6, 32), '#e6e9ec', 0.145, 0, 0, 0, Math.PI / 2, 0, 1, 1, 1, 'alloy');   // the rim's lip, bright
  for (let i = 0; i < 10; i++) { const a = Math.floor(i / 2) * Math.PI * 2 / 5 + (i % 2 ? 0.1 : -0.1); wk.put(new THREE.BoxGeometry(0.04, 0.26, 0.055), '#a4aab2', 0.15, Math.cos(a) * 0.135, Math.sin(a) * 0.135, a, 0, 0, 1, 1, 1, 'alloy'); }   // five twin spokes, silver
  wk.axle(0.265, 0.02, 24, 0.137, 0, 0, '#26282b', 'trim');   // the dark face behind the spokes
  wk.put(new THREE.TorusGeometry(0.312, 0.02, 6, 32), '#55565a', 0.13, 0, 0, 0, Math.PI / 2, 0, 1, 1, 0.4, 'tyre');   // the sidewall band
  wk.put(new THREE.TorusGeometry(0.312, 0.007, 4, 32), '#8a8b90', 0.138, 0, 0, 0, Math.PI / 2, 0, 1, 1, 1, 'tyre');   // a ring of lettering
  wk.axle(0.06, 0.06, 10, 0.155, 0, 0, '#2a2d31', 'trim');
  wk.axle(0.26, 0.012, 22, -0.141, 0, 0, '#8c9095', 'alloy').axle(0.07, 0.03, 12, -0.155, 0, 0, '#c4c8cc', 'alloy');   // the back of the wheel
  wk.put(new THREE.TorusGeometry(0.312, 0.02, 6, 32), '#55565a', -0.13, 0, 0, 0, Math.PI / 2, 0, 1, 1, 0.4, 'tyre');
  return wk.build();
}

// ---------------------------------------------------------------- the two of you, in parts that move (world3d.js puts them together and poses them)
// Each part is built round its own pivot. The driver (on the right: a British car) wears sunglasses and a white shirt;
// his girlfriend has a turquoise top and long fair hair that streams out behind her in the wind.
function hairLock(k, pts, r, hex, oy, fl, tp) {   // a lock of hair: a tube along a curve, tapering to its tip (tp: how far), lighter at the root (fl: flattened [x, z, y])
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), T = 12, RS = 7;
  const g = new THREE.TubeGeometry(curve, T, r, RS, false), P = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let j = 0; j <= T; j++) { curve.getPointAt(j / T, c); const f = 1 - (tp == null ? 0.88 : tp) * (j / T) ** 1.35; for (let q = 0; q <= RS; q++) { const i = j * (RS + 1) + q; v.fromBufferAttribute(P, i).sub(c).multiplyScalar(f); if (fl) { v.x *= fl[0]; v.z *= fl[1]; if (fl[2]) v.y *= fl[2]; } v.add(c); P.setXYZ(i, v.x, v.y, v.z); } }
  g.computeVertexNormals(); k.put(g, hex, 0, 0, 0, 0, 0, 0, 1, 1, 1, 'lit');
  const list = k.parts.lit, G = list[list.length - 1], Q = G.attributes.position, C3 = G.attributes.color;   // a touch lighter at the crown, deeper towards the tips
  for (let i = 0; i < Q.count; i++) { const y = Q.getY(i) + (oy || 0), f = y > 0.17 ? 1.06 : y < -0.04 ? 0.88 : 0.88 + 0.18 * (y + 0.04) / 0.21; C3.setXYZ(i, Math.min(1, C3.getX(i) * f), Math.min(1, C3.getY(i) * f), Math.min(1, C3.getZ(i) * f)); }
}
export function people() {
  const P = (fn) => { const k = new Kit(); fn(k); return k.build(); };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
  const one = (o) => ({
    torso: P((k) => { if (o.short) k.put(new THREE.LatheGeometry([[0.12, 0.02], [0.135, 0.14], [0.142, 0.3], [0.168, 0.42], [0.182, 0.49], [0.178, 0.54], [0.105, 0.6], [0.07, 0.615], [0.052, 0.64]].map((q) => new THREE.Vector2(q[0], q[1])), 22), o.top, 0, 0, 0, 0, 0, 0, 1.45, 1, 0.7, 'lit'); else { k.put(new THREE.LatheGeometry([[0.13, 0.02], [0.136, 0.12], [0.116, 0.25], [0.12, 0.33], [0.142, 0.41], [0.15, 0.47], [0.148, 0.485], [0.146, 0.5], [0.138, 0.525], [0.105, 0.565], [0.065, 0.6], [0.046, 0.64]].map((q) => new THREE.Vector2(q[0], q[1])), 22), o.top, 0, 0, 0, 0, 0, 0, 1.2, 1, 0.78, 'lit');
      const G = k.parts.lit[k.parts.lit.length - 1], Q = G.attributes.position, N = G.attributes.normal, C3 = G.attributes.color, sk = new THREE.Color(o.skin);
      for (let i = 0; i < Q.count; i++) if (Q.getY(i) > 0.49) { const f = 0.6 + 0.4 * (N.getY(i) * 0.5 + 0.5); C3.setXYZ(i, sk.r * f, sk.g * f, sk.b * f); } }   // bare shoulders above her top
    if (!o.short) for (const sd of [-1, 1]) k.ball(o.arm * 1.1, sd * 0.16, 0.52, 0, o.sleeve, 1, 0.85, 1, 'lit', 10); else { k.put(new THREE.TorusGeometry(0.06, 0.013, 4, 16, Math.PI), '#e4e4de', 0, 0.6, 0, Math.PI / 2, 0, 0, 1, 1, 0.5, 'lit'); } if (o.collar) for (const sd of [-1, 1]) k.box(0.08, 0.012, 0.06, sd * 0.045, 0.585, -0.05, '#e4e4de', 0, -0.6, sd * 0.45, 'lit'); k.cyl(0.05, 0.055, 0.14, 8, 0, 0.6, 0, o.skin); if (o.strap) { for (const sd of [-1, 1]) k.put(new THREE.TorusGeometry(0.09, 0.009, 4, 12, Math.PI), o.top, sd * 0.075, 0.51, 0, 0, Math.PI / 2, 0, 1, 1, 1, 'lit'); } }),
    head: P((k) => {
      k.ball(0.122, 0, 0.13, 0, o.skin, 1, 1.15, 1.06, 'lit', 16);
      k.ball(0.021, 0, 0.112, -0.122, o.skin, 0.9, 0.95, 0.75, 'lit', 8);   // the nose   // the nose
      const h0 = k.parts.lit.length;
      k.ball(0.132, 0, 0.18, 0.025, o.hair, 1.04, o.long ? 0.95 : 0.82, 1.08, 'lit', 16);
      if (!o.long) { k.put(new THREE.SphereGeometry(0.125, 16, 8), o.hair, 0, 0.135, 0.035, 0.3, 0, 0, 0.96, 0.85, 1.0, 'lit').ball(0.11, 0, 0.12, 0.05, o.hair, 0.95, 0.6, 0.9, 'lit', 14);   // the back of his head, tipped, tapering into the nape
        k.ball(0.07, 0.025, 0.245, -0.02, o.hair, 1.4, 0.45, 1.7, 'lit', 14);   // swept back from a side parting
        for (const [x, c] of [[-0.05, '#2e1f14'], [0, '#24180f'], [0.05, '#33231a']]) hairLock(k, [[x, 0.272, -0.07], [x * 1.1, 0.298, 0], [x * 1.15, 0.292, 0.08], [x * 1.1, 0.256, 0.14]], 0.03, c, 0, [2.0, 1, 0.4], 0.7);   // layered over the crown
        for (let q = h0; q < k.parts.lit.length; q++) { const G = k.parts.lit[q], Q = G.attributes.position, C3 = G.attributes.color;   // the sun on top, darker underneath
          for (let i = 0; i < Q.count; i++) { const f = 0.74 + 0.5 * Math.min(1, Math.max(0, (Q.getY(i) - 0.05) / 0.24)); C3.setXYZ(i, C3.getX(i) * f, C3.getY(i) * f, C3.getZ(i) * f); } }
      }
      if (o.long) {
        k.ball(0.115, 0, 0.09, 0.07, '#cfa452', 0.86, 1.15, 0.55, 'lit', 14).ball(0.1, 0, -0.05, 0.075, '#c09648', 0.95, 1.05, 0.5, 'lit', 12);   // the under-layer, in shadow
        for (const xo of [-0.035, 0.04]) {   // fine bright strands over the crown
          const pts = []; for (let s = 0; s <= 4; s++) { const a = -0.35 + s * 0.45; pts.push([xo * (1 - s * 0.05), 0.18 + 0.129 * Math.cos(a), 0.025 + 0.148 * Math.sin(a)]); }
          hairLock(k, pts, 0.0055, '#f6dc94');
        }
        k.ball(0.09, -0.03, 0.235, -0.08, '#ecc87e', 1.15, 0.45, 0.8, 'lit', 12).ball(0.07, 0.05, 0.225, -0.09, '#dcb46a', 1.1, 0.45, 0.7, 'lit', 10);   // a side-swept fringe
      }
      for (const sd of [-1, 1]) k.ball(0.028, sd * 0.123, 0.13, 0.005, o.skin, 0.5, 1, 0.8, 'lit', 8);   // ears
      if (o.shades) {   // his wraparound sunglasses: dark lenses, a thin frame round to the ears
        for (const sd of [-1, 1]) k.ball(0.04, sd * 0.047, 0.148, -0.113, '#0d1218', 1.2, 0.85, 0.45, 'glass', 10);
        k.box(0.03, 0.014, 0.02, 0, 0.152, -0.122, '#1a1a1a').box(0.2, 0.012, 0.012, 0, 0.165, -0.11, '#1a1a1a'); for (const sd of [-1, 1]) k.box(0.008, 0.01, 0.12, sd * 0.121, 0.16, -0.05, '#1a1a1a');
        k.box(0.05, 0.01, 0.012, -0.045, 0.19, -0.115, '#2a1c12', 0, 0, 0.12).box(0.05, 0.01, 0.012, 0.045, 0.19, -0.115, '#2a1c12', 0, 0, -0.12);   // brows
      } else {
        for (const ex of [-0.047, 0.047]) {   // her sunglasses, on: tinted lenses, a little cat-eye, in a fine gold frame
          k.ball(0.038, ex, 0.15, -0.112, '#4a2a1a', 1.25, 0.82, 0.45, 'glass', 10);
          k.box(0.045, 0.008, 0.01, ex, 0.19, -0.118, '#a87a40', 0, 0, ex > 0 ? -0.12 : 0.12);   // brows
        }
        k.box(0.2, 0.008, 0.01, 0, 0.17, -0.118, '#d8b464', 0, 0, 0, 'chrome').box(0.025, 0.012, 0.014, 0, 0.152, -0.124, '#d8b464', 0, 0, 0, 'chrome');
        for (const sd of [-1, 1]) k.box(0.007, 0.008, 0.11, sd * 0.118, 0.163, -0.06, '#d8b464', 0, 0, 0, 'chrome');
      }
      k.put(new THREE.TorusGeometry(0.024, 0.0055, 5, 12, Math.PI), o.shades ? '#86503e' : '#b4505c', 0, 0.086, -0.115, 0, 0, Math.PI, 1, 0.5, 0.45, 'lit');   // a quiet smile
    }),
    upper: P((k) => {
      k.put(cap(o.arm, 0.2), o.short ? o.skin : o.sleeve, 0, -0.14, 0);
      if (o.short) {   // a short shirt sleeve
        k.put(new THREE.CylinderGeometry(o.arm * 1.18, o.arm * 1.34, 0.14, 12), o.sleeve, 0, -0.055, 0, 0, 0, 0, 1, 1, 1, 'lit');
        // (no cap: the sleeve starts inside the torso)   // its top rounded off, flush with the tube
        k.put(new THREE.TorusGeometry(o.arm * 1.34, 0.007, 4, 14), '#d2d2cc', 0, -0.135, 0, Math.PI / 2, 0, 0, 1, 1, 1, 'lit');
      }
    }),
    fore: P((k) => { k.ball(o.arm * 1.0, 0, 0, 0, o.long || o.short ? o.skin : o.sleeve, 1, 1, 1, 'lit', 8); k.put(new THREE.CylinderGeometry(o.arm * 0.9, o.arm * 0.62, 0.22, 10), o.skin, 0, -0.12, 0, 0, 0, 0, 1, 1, 1, 'lit'); k.ball(0.042, 0, -0.32, 0, o.skin, 0.95, 1.3, 0.42, 'lit', 10).ball(0.032, 0, -0.372, -0.006, o.skin, 0.9, 0.95, 0.4, 'lit', 8).ball(0.018, 0.036, -0.29, -0.01, o.skin, 0.9, 1.5, 0.8, 'lit', 8); }),   // an open hand, flat, and a thumb
    locks: o.long ? (() => {   // her locks of hair, each built round its root so it can swing back in the wind
      const zb = (x, y) => 0.025 + 0.15 * Math.sqrt(Math.max(0, 1 - (x / 0.145) ** 2 - ((y - 0.18) / 0.135) ** 2)) + 0.012;   // just outside the back of her head
      const lock = (x, j, dz, r, fl, tp) => [[x * 0.8, 0.27, 0.06 - dz], [x * 1.15, 0.2, zb(x * 1.15, 0.2) - dz], [x * 1.25 + j, 0.04, zb(x * 1.15, 0.2) - 0.006 - dz], [x * 1.3 + j * 2, -0.29, zb(x * 1.15, 0.2) - dz], r, fl, tp];
      const L = [lock(0, 0, 0.012, 0.034, [2.7, 0.4], 0.55)].concat([[-0.1, 0.01], [-0.05, -0.008], [0, 0.01], [0.05, -0.01], [0.1, 0.008]].map(([x, j]) => lock(x, j, 0, 0.034, [1.7, 0.45], 0.75)));
      for (const sd of [-1, 1]) L.push([[sd * 0.08, 0.26, 0.0], [sd * 0.128, 0.17, 0.02], [sd * 0.126, 0.04, 0.035], [sd * 0.115, -0.16, 0.06], 0.03, [0.6, 1.6], 0.75]);
      const S = [1, 1, 0.95, 1.04, 0.95, 1, 0.96, 0.96], CL = ['#a5874e', '#e2ba6e', '#d4ac62', '#dcb468', '#cfa85e', '#e0b86c', '#d4ac62', '#d4ac62'];
      return L.map((q, i) => { const p0 = q[0]; return { at: p0, s: S[i], geo: P((k) => hairLock(k, q.slice(0, 4).map((p) => [p[0] - p0[0], p[1] - p0[1], p[2] - p0[2]]), q[4] * [1, 1, 0.95, 1.05, 0.95, 1, 1, 1][i], CL[i], p0[1], q[5], q[6])) }; });
    })() : null,
    hair: null,
    scarf: null
  });
  const driver = one({ collar: true, short: true, chest: 0.165, wide: 1.25, top: '#f2f2ee', sleeve: '#f2f2ee', skin: '#e2ae86', hair: '#2a1c12', arm: 0.052, shades: true });
  const girl = one({ chest: 0.14, wide: 1.15, top: '#1fb5c4', sleeve: '#e8b48c', skin: '#efbf98', hair: '#f0cd78', arm: 0.043, long: true, strap: true });
  const sw = P((k) => { k.put(new THREE.TorusGeometry(0.175, 0.022, 8, 24), '#151515', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'trim'); k.box(0.3, 0.03, 0.02, 0, 0, 0, '#202020', 0, 0, 0, 'trim').cyl(0.045, 0.045, 0.03, 12, 0, 0, 0, '#2a2a2e', Math.PI / 2, 0, 'trim'); });
  return {
    driver: { part: driver, seat: [0.4, 0.53, 0.47], neck: 0.685, shoulder: [0.205, 0.56, 0], elbow: 0.27, scale: 0.98 },
    girl: { part: girl, seat: [-0.4, 0.51, 0.6], lean: 0.22, neck: 0.68, shoulder: [0.17, 0.53, 0], elbow: 0.26, hairAt: [-0.085, 0.19, 0.09], scarfAt: [-0.085, -0.03, 0.04], scale: 0.96 },
    wheel: { geo: sw, at: [0.4, 0.85, -0.13], tilt: 0.55 }
  };
}

export function playerCar(id) {
  if (!CARDEF[id] || id === 'roadster') {   // the red roadster: its own body, wheels and cabin (the two of you come from people())
    const S = spider();
    return { body: S.k.build(), wheel: bigWheel(), wheels: [[-S.wx, 0.34, S.wz[0]], [S.wx, 0.34, S.wz[0]], [-S.wxr, 0.34, S.wz[1]], [S.wxr, 0.34, S.wz[1]]], len: S.len, width: S.w, open: true };
  }
  const D = CARDEF[id], k = new Kit(), len = D.len, w = D.w, skin = ['#e0b088', '#c98d5a'];
  const st = sections(D.keys, D.wz);
  k.loft(st, D.col, 'paint', { up: 3.2, dn: 6 });
  const near = (z) => { let best = st[0]; for (const s of st) if (Math.abs(s[0] - z) < Math.abs(best[0] - z)) best = s; return best; };
  if (D.cabin) {
    k.loft(D.cabin, '#121a24', 'glass', { up: D.cabinUp, dn: 8, belly: 0.3, n: 24 });
    k.loft(D.roof, D.col, 'paint', { up: 3, dn: 3, belly: 0.4, n: 24 });
  } else {   // the roadster: open, a windscreen, the seats and two people aboard
    k.box(1.5, 0.06, 1.25, 0, 0.82, 0.32, '#141414', 0, 0, 0, 'trim');
    k.box(1.5, 0.36, 0.06, 0, 0.83, -0.48, GLASS, 0, -0.45, 0, 'glass');
    k.box(1.56, 0.04, 0.06, 0, 1.15, -0.62, '#d0d4d8', 0, -0.45, 0, 'chrome');
    for (const x of [-0.42, 0.42]) { k.box(0.48, 0.42, 0.14, x, 0.8, 0.84, '#3a2a22', 0, 0.15, 0, 'lit'); k.box(0.26, 0.16, 0.1, x, 1.2, 0.9, '#3a2a22', 0, 0.15, 0, 'lit'); }
    for (const [x, hair, sk, top, long] of [[0.42, '#2b1d14', skin[0], '#f4f4f4', false], [-0.42, '#c89a4a', skin[1], '#e63946', true]]) {
      k.box(0.44, 0.46, 0.32, x, 0.84, 0.48, top, 0, 0, 0, 'lit'); k.ball(0.165, x, 1.5, 0.46, sk, 1, 1.12, 1, 'lit', 12);
      k.ball(0.185, x, 1.56, 0.52, hair, 1, 0.92, 1.05, 'lit', 12); if (long) k.box(0.34, 0.34, 0.1, x, 1.2, 0.66, hair);
    }
    k.cyl(0.18, 0.18, 0.04, 16, 0.42, 1.1, 0.0, '#111111', -1.1, 0, 'trim');
    k.box(0.12, 0.4, 0.1, 0.24, 0.98, 0.2, skin[0], 0, -0.9, 0.3).box(0.12, 0.4, 0.1, 0.6, 0.98, 0.2, skin[0], 0, -0.9, -0.3);
  }
  // the front: a dark intake and the lamps; the back: the lights across the tail, a diffuser, the pipes, the plate
  const nose = near(-len + 0.18), tail = near(len - 0.05);
  k.box(1.0, 0.13, 0.08, 0, 0.36, -len + 0.06, '#0d0f12', 0, 0, 0, 'trim');
  for (const sd of [-1, 1]) {
    k.box(0.36, 0.09, 0.14, sd * (nose[1] - 0.3), nose[3] - 0.08, -len + 0.2, '#fff8e8', 0, 0, 0, 'glow');
    k.box(0.5, 0.1, 0.08, sd * (tail[1] - 0.36), tail[3] - 0.14, len - 0.02, '#ff1a2a', 0, 0, 0, 'glow');
    k.box(0.08, 0.2, 0.62, sd * (near(D.wz[1] - 0.75)[1] - 0.02), 0.42, D.wz[1] - 0.75, '#0d0f12', 0, 0, 0, 'trim');   // a side intake
    k.box(0.16, 0.09, 0.11, sd * (w / 2 + 0.02), D.cabin ? D.cabin[1][2] + 0.12 : 0.95, -0.55, D.cabin ? D.col : '#121417', 0, 0, 0, D.cabin ? 'paint' : 'trim');   // mirrors
    k.roll(0.055, 0.22, 12, sd * 0.38, 0.36, len + 0.02, '#d0d4d8', 'chrome');
  }
  k.box(1.3, 0.12, 0.1, 0, 0.33, len - 0.02, '#0d0f12', 0, 0, 0, 'trim');
  k.box(0.52, 0.12, 0.03, 0, 0.5, len + 0.005, '#f7d417', 0, 0, 0, 'lit');
  const body = k.build();
  const wk = new Kit(); wk.axle(0.34, 0.27, 22, 0, 0, 0, '#111111', 'tyre'); wk.axle(0.255, 0.275, 20, 0, 0, 0, '#1a1a1a', 'tyre'); wk.axle(0.2, 0.285, 18, 0, 0, 0, '#9aa2aa', 'chrome'); wk.axle(0.06, 0.3, 10, 0, 0, 0, '#2a2d31', 'trim');
  for (let i = 0; i < 5; i++) wk.put(new THREE.BoxGeometry(0.296, 0.05, 0.36), '#5d646b', 0, 0, 0, i * Math.PI / 5, 0, 0, 1, 1, 1, 'chrome');   // spokes, so you can see it turn
  const wheel = wk.build();
  const wx = w / 2 - 0.08;
  return { body: body, wheel: wheel, wheels: [[-wx, 0.34, D.wz[0]], [wx, 0.34, D.wz[0]], [-wx, 0.34, D.wz[1]], [wx, 0.34, D.wz[1]]], len: len, width: w };
}
