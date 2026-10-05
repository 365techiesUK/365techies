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
    if (key !== 'glow' && key !== 'alloy' && key !== 'chrome' && UV_KEYS[key] == null) { const nr = g.attributes.normal; for (let i = 0; i < n; i++) { const f = 0.6 + 0.4 * (nr.getY(i) * 0.5 + 0.5); cols[i * 3] *= f; cols[i * 3 + 1] *= f; cols[i * 3 + 2] *= f; } }
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
    for (const sd of [-1, 1]) k.box(0.03, 0.5, 0.6, sd * 1.16, 1.3, -0.5, '#2a3a48').box(0.04, 0.6, 0.06, sd * 1.165, 1.25, -0.5, trim);   // a little window each side
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
    const wall = ['#f2ead8', '#e9e2d6', '#f6efe0', '#dfe6ea'][v % 4], roof = ['#9a5b45', '#5a6670', '#8a4f3c', '#4f5d6a'][v % 4], fl = 5 + (v % 3);
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
  },
  yacht(k, v) {
    const night = v >= 3, hull = night ? '#26324a' : ['#ffffff', '#1d3557', '#f1faee'][v % 3];
    k.side([-4, 0.4, 4.4, 0.4, 5, 1.6, -4.2, 1.6], 2.6, 0, -0.4, 0, hull, 'shiny', 0.08);
    k.box(1.8, 0.8, 3, 0, 1.2, 0.5, night ? '#33415a' : '#e9eef0');
    k.cyl(0.06, 0.06, 11, 4, 0, 1.2, -0.5, '#c8c8c8');
    if (!night) { k.side([0, 0, 0, 9.5, 3.8, 0], 0.05, 0, 1.6, -0.6, '#fdfdfd'); k.side([0, 0, 0, 8.2, -2.6, 0], 0.05, 0, 1.6, -0.4, '#f2f2f2'); }
    else { k.box(1.6, 0.25, 2.8, 0, 1.4, 0.5, '#ffd98a', 0, 0, 0, 'glow'); k.box(0.25, 0.25, 0.25, 0, 12.2, -0.5, '#fff2c0', 0, 0, 0, 'glow'); }
  },
  pier(k) {
    for (let x = -42; x <= 42; x += 6) { k.cyl(0.25, 0.25, 9, 5, x, -3, -1.6, '#5b4636'); k.cyl(0.25, 0.25, 9, 5, x, -3, 1.6, '#5b4636'); }
    k.box(90, 0.6, 6, 0, 6, 0, '#e8e0cf').box(90, 1, 0.1, 0, 6.6, 2.9, '#2e5d6b').box(90, 1, 0.1, 0, 6.6, -2.9, '#2e5d6b');
    k.box(22, 6, 12, 36, 6.6, 0, '#f4efe4'); for (let w = 0; w < 6; w++) k.box(2, 2.4, 0.2, 28 + w * 3.2, 8, 6.05, '#7fb4d1', 0, 0, 0, 'shiny');
    k.box(24, 1, 13, 36, 12.6, 0, '#3f7f8f'); k.ball(5, 36, 13.4, 0, '#3f7f8f', 1, 0.7, 1); k.cyl(0.2, 0.2, 3, 4, 36, 16.5, 0, '#3f7f8f');
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
  pony(k, v) {
    const col = ['#6b4423', '#3a2a1e', '#9a8a7a'][v % 3], dk = shade(col, -0.3);
    for (const [x, z] of [[-0.25, -0.65], [0.25, -0.65], [-0.25, 0.65], [0.25, 0.65]]) k.box(0.16, 0.9, 0.16, x, 0, z, dk);
    k.box(0.7, 0.7, 1.7, 0, 0.9, 0, col).box(0.35, 0.8, 0.35, 0, 1.2, -0.95, col, 0, 0.8).box(0.32, 0.32, 0.6, 0, 0.95, -1.4, col, 0, 0.7);
    k.box(0.12, 0.7, 0.12, 0, 0.8, 0.9, dk, 0, -0.4);
  },
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
  needles(k) {
    const col = '#f3eee4';
    k.cyl(6, 9, 26, 8, -40, -4, 0, col).cyl(5, 8, 22, 8, -16, -4, 6, col).cyl(5, 7, 18, 8, 6, -4, 2, col);
    k.blob(8, 26, -1, 0, '#6b6056', 1.2, 0.6, 1, 111);
    k.cyl(1.3, 1.8, 12, 10, 26, 2, 0, '#f6f3ee').cyl(1.75, 1.8, 2, 10, 26, 7, 0, '#c62828').cyl(1, 1, 1.6, 10, 26, 14, 0, '#fff4b3', 0, 0, 'glow').cone(1.2, 1.2, 10, 26, 15.6, 0, '#c62828');
    k.cyl(40, 40, 0.3, 14, -10, -0.1, 0, '#ffffff');
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
  chainferry(k) {   // a chain ferry across a harbour mouth: a flat open car deck, a raised ramp at each end, a cabin each side with
    // the wheelhouse up on one, the chains running out fore and aft into the water (our own colours)
    k.side([-15, -1.2, 15, -1.2, 15.5, 1.2, -15.5, 1.2], 15, 0, 0, 0, '#2d5f6e', 'lit', 0.15);
    k.box(15.2, 0.12, 30.6, 0, 1.2, 0, '#e9ecee').box(9.6, 0.06, 30, 0, 1.32, 0, '#4a4f55');   // the deck, the road across it
    for (const z of [-1, 1]) k.box(10, 0.3, 4.5, 0, 1.3, z * 17.3, '#3a3f45', 0, z * 0.32, 0).box(10.4, 0.5, 0.3, 0, 2.6, z * 19.1, '#d9a400', 0, z * 0.32, 0);   // the ramps
    for (const sd of [-1, 1]) {
      k.box(2.2, 2.6, 24, sd * 6.5, 1.3, 0, '#f2f4f5').box(2.3, 0.3, 24.2, sd * 6.5, 3.9, 0, '#2d5f6e');
      for (let i = 0; i < 7; i++) k.box(0.06, 0.9, 1.6, sd * 7.62, 2.6, -9.6 + i * 3.2, '#2a3a48', 0, 0, 0, 'shiny');
    }
    k.box(2.6, 2.4, 6, 6.5, 4.2, 0, '#f2f4f5').box(2.7, 1.0, 6.1, 6.5, 5.4, 0, '#2a3a48', 0, 0, 0, 'shiny').box(2.9, 0.25, 6.3, 6.5, 6.6, 0, '#2d5f6e');   // the wheelhouse
    for (const x of [-3.5, 3.5]) for (const z of [-1, 1]) k.box(0.18, 0.18, 30, x, -0.9, z * 31, '#2a2a2a', 0, z * -0.07, 0);   // the chains, down into the water
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
  studland(k) {   // the Studland shore from the ferry: a long sandy beach, dunes and heath behind, the chalk headland beyond
    k.blob(70, 0, -64, 0, '#ecd9a8', 4.5, 1, 1.2, 151).blob(60, 0, -44, -30, '#8a7a50', 4.2, 0.85, 1.0, 153).blob(50, 160, -36, -40, '#f1ece0', 1.6, 0.9, 1.0, 155).blob(50, 160, -22, -40, '#6f9a45', 1.62, 0.32, 1.02, 157);
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
    const w = ['#f6f6f2', '#eef0f0', '#f4efe6', '#e8eef2'][v % 4], gl = '#3d6f8c';
    k.box(15, 4, 10, 0, 0, 0, w).box(10, 3.6, 8, v % 2 ? 2 : -2, 4, -0.6, w);
    k.box(14, 2.8, 0.15, 0, 0.6, 5.06, gl, 0, 0, 0, 'shiny').box(9, 2.6, 0.15, v % 2 ? 2 : -2, 4.5, 3.46, gl, 0, 0, 0, 'shiny');
    k.box(15.6, 0.28, 10.6, 0, 4, 0, '#d9d9d4').box(10.6, 0.28, 8.6, v % 2 ? 2 : -2, 7.6, -0.6, '#d9d9d4');
    k.box(15, 0.9, 0.06, 0, 4.28, 5.25, '#bcd7e6', 0, 0, 0, 'shiny');   // the glass balcony rail
    k.box(7, 0.06, 3.2, -3, 0, 7.2, '#29b4dc', 0, 0, 0, 'shiny').box(7.6, 0.2, 3.8, -3, -0.05, 7.2, '#e7e2d6');   // the pool
  },
  terrace(k, v) {   // Weymouth and Lyme: a tall painted house in a row along the front
    const c = ['#f3d9a4', '#e9b4b0', '#bfe0e8', '#f4f1ea', '#c9e3b8', '#f0c987'][v % 6], h = 12 + (v % 3);
    k.box(11.9, h, 9, 0, 0, 0, c);
    k.prism(9.6, 3, 12, 0, h, 0, ['#5a5f66', '#6b4a3a', '#4f5862'][v % 3], Math.PI / 2);
    k.box(1.4, 2.4, 1.4, 4.2, h + 1.2, 0, '#8a7a6a');
    for (let f = 0; f < 3; f++) for (let w = 0; w < 3; w++) k.box(1.5, 2, 0.12, -3.6 + w * 3.6, 2.2 + f * 3.4, 4.52, '#34505f', 0, 0, 0, 'shiny');
    k.box(11.9, 0.3, 0.6, 0, 3.9, 4.65, '#ffffff').box(11.9, 0.35, 0.3, 0, h - 0.4, 4.6, '#ffffff');
    k.box(1.3, 2.5, 0.1, 0, 0, 4.53, ['#1d3557', '#7a1f2b', '#1f6f50'][v % 3]);
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
  cobb(k) {   // the Cobb at Lyme Regis: a long curving stone harbour wall, boats tucked inside it
    for (let i = 0; i < 16; i++) { const a = -0.2 + i * 0.1, R = 70, x = Math.sin(a) * R, z = R - Math.cos(a) * R; k.box(7.6, 4.5, 8, x, -1.5, z, i % 2 ? '#a8a08c' : '#9e9682', -a); }
    k.box(6, 1.2, 9, 64, 3, 23, '#bdb5a0', -1.3);
    const r = rnd(77); for (let i = 0; i < 5; i++) k.side([-2.5, 0.3, 2.8, 0.3, 3.2, 1.2, -2.6, 1.2], 1.6, 12 + i * 8, -0.3, 22 + r() * 6, ['#ffffff', '#1d4ed8', '#d32f2f'][i % 3], 'shiny', 0.05);
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
  headland(k) {   // Hengistbury Head: a low heath-topped headland with sandy, ironstone-brown cliffs
    k.blob(32, 0, -5, 0, '#b07a4a', 2.2, 0.85, 1.4, 131).blob(30, 0, 9, 0, '#7a8a50', 2.25, 0.28, 1.45, 133);
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
  balloon(k, v) {   // a hot-air balloon, far off over the land
    const c = [['#e63946', '#ffd23f'], ['#1d7fd6', '#ffffff'], ['#2a9d8f', '#f4a261'], ['#9b5de5', '#ffd23f']][v % 4];
    for (let i = 0; i < 10; i++) k.put(new THREE.SphereGeometry(8, 3, 14, i * Math.PI / 5, Math.PI / 5), c[i % 2], 0, 16, 0, 0, 0, 0, 1, 1.22, 1);
    k.put(new THREE.CylinderGeometry(3.6, 1.4, 4.5, 16, 1, true), c[0], 0, 6.3, 0);
    k.box(1.7, 1.3, 1.7, 0, 2.2, 0, '#8a6a40');
    for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) k.cyl(0.03, 0.03, 2.4, 3, x, 3.4, z, '#5a4a30');
  },
};
const capG = (r, l) => new THREE.CapsuleGeometry(r, l, 3, 8);
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
export const TRAFFIC_ORDER = ['hatch', 'saloon', 'van', 'bus', 'camper', 'tractor', 'lorry', 'sports', 'wedge', 'lemans'];
const TCOL = { hatch: [0, 1, 2, 4, 5, 6], saloon: [0, 1, 2, 3, 6, 7], van: [2, 2, 2, 6, 1], bus: [0, 4], camper: [5, 4, 1, 7], tractor: [5, 0], lorry: [2, 1, 3], sports: [0, 4, 7, 1], wedge: [4, 7, 2, 3], lemans: [1, 2, 5, 4] };
export function trafficModel(t, colIdx) {
  const id = TRAFFIC_ORDER[t], cols = TCOL[id], col = CARCOL[cols[colIdx % cols.length]], key = 'veh|' + id + '|' + col;
  let m = cache.get(key); if (m) return m;
  const k = new Kit(); TRAFFIC[id](k, col);
  m = k.build(); cache.set(key, m);
  return m;
}

// ---------------------------------------------------------------- your car: a smooth lofted body (glossy paint), glass, chrome, two people aboard
// The body is drawn through cross-sections from the nose (-Z) to the tail (+Z): at each, a half-width, a bottom and a top,
// and a rounded-box shape between them; the bottom rises over the wheels into arches. keys: paint, trim (black),
// chrome, glass, tyre, lit (people, seats), glow (lights); the four wheels are apart (they turn and steer).
function sections(keys, wheelZ) {   // cross-sections along the body: [z, halfWidth, bottom, top]
  const at = (z) => { let i = 0; while (i < keys.length - 2 && keys[i + 1][0] < z) i++; const a = keys[i], b = keys[i + 1], f = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0]))); return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f]; };
  const z0 = keys[0][0], z1 = keys[keys.length - 1][0], zs = [];
  for (let i = 0; i <= 26; i++) zs.push(z0 + (z1 - z0) * (0.5 - 0.5 * Math.cos(i / 26 * Math.PI)));   // closer together at the nose and tail
  for (const wz of wheelZ) for (const o of [-0.46, -0.4, -0.385, -0.36, -0.32, -0.26, -0.18, -0.09, 0, 0.09, 0.18, 0.26, 0.32, 0.36, 0.385, 0.4, 0.46]) zs.push(wz + o);
  for (const kk of keys) zs.push(kk[0]);
  zs.sort((a, b) => a - b);
  const out = [];
  for (const z of zs) {
    if (z < z0 || z > z1 || (out.length && z - out[out.length - 1][0] < 0.012)) continue;
    const s = at(z); let bot = 0.3;
    for (const wz of wheelZ) { const d = (z - wz) / 0.39; if (Math.abs(d) < 1) bot = Math.max(bot, 0.34 + 0.39 * Math.sqrt(1 - d * d)); }   // round the tyre, a hand's width clear
    out.push([z, s[0], Math.max(s[1], bot), s[2], Math.max(s[1], 0.3)]);   // (and the bottom without the arch)
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
