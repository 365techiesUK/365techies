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
  blob(r, x, y, z, col, sx, sy, sz, seed) {   // a lumpy ball (rocks, mounds)
    const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position, rr = rnd(seed || 7), seen = new Map();
    for (let i = 0; i < p.count; i++) { const key = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3); let k = seen.get(key); if (k == null) { k = 0.86 + rr() * 0.28; seen.set(key, k); } p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
    g.computeVertexNormals();
    return this.put(g, col, x, y, z, 0, 0, 0, sx || 1, sy || 1, sz || 1);
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
const SHIRTS = ['#e63946', '#f1faee', '#1d7fd6', '#ffd23f', '#2a9d8f', '#f4a261', '#9b5de5', '#ff7eb6', '#111111'];
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

// ---------------------------------------------------------------- the roadside
const MODELS = {
  palm(k, v) {
    const lean = [0.7, -0.8, 0.3][v % 3], tall = 8.5 + (v % 3) * 0.9;
    for (let i = 0; i < 9; i++) { const p = i / 9, x = lean * p * p * 2.4; k.cyl(0.2 - p * 0.07, 0.25 - p * 0.07, tall / 9 + 0.05, 7, x, i * tall / 9, 0, i % 2 ? '#8a6a45' : '#a07c54'); }
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
    k.box(22, fl * 3.2, 14, 0, 0, 0, wall).prism(15, 4, 23, 0, fl * 3.2, 0, roof, Math.PI / 2);
    for (let f = 0; f < fl; f++) for (let w = 0; w < 7; w++) { k.box(1.6, 1.8, 0.2, -9 + w * 3, 1 + f * 3.2, 7.05, '#7fb4d1', 0, 0, 0, 'shiny'); if (f) k.box(2.2, 0.12, 0.7, -9 + w * 3, 0.9 + f * 3.2, 7.3, '#ffffff'); }
    k.box(6, 3, 0.4, 0, 0, 7.1, ['#1d4e89', '#7a1f2b', '#1f6f50', '#333'][v % 4]);
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
  arch(k) {   // Durdle Door: a great limestone arch standing in the sea
    const sh = new THREE.Shape(); sh.moveTo(-46, -4); sh.lineTo(-40, 22); sh.quadraticCurveTo(-26, 40, 0, 38); sh.quadraticCurveTo(26, 36, 36, 18); sh.lineTo(44, -4);
    sh.lineTo(16, -4); sh.lineTo(16, 6); sh.absarc(0, 6, 16, 0, Math.PI, false); sh.lineTo(-16, -4); sh.lineTo(-46, -4);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 22, bevelEnabled: true, bevelThickness: 3, bevelSize: 3, bevelSegments: 2, curveSegments: 14 }); g.translate(0, 0, -11); g.computeVertexNormals();
    const p = g.attributes.position, cl = new Float32Array(p.count * 3), a = new THREE.Color('#d8c09a'), b = new THREE.Color('#b89a72'), c2 = new THREE.Color('#e8dcc0');
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), band = Math.sin(y * 0.9 + p.getX(i) * 0.05) > 0.3 ? b : y > 30 ? c2 : a; cl[i * 3] = band.r; cl[i * 3 + 1] = band.g; cl[i * 3 + 2] = band.b; }
    k.put(g, '#ffffff', 0, 0, 0); const last = k.parts.lit[k.parts.lit.length - 1]; last.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    k.blob(14, -6, 38, 0, '#6f9a45', 2.6, 0.32, 1.2, 105);
    k.cyl(30, 30, 0.3, 16, 0, -0.1, 0, '#ffffff');
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
  armco(k) { k.box(0.14, 0.75, 0.14, 0, 0, 0, '#9aa0a6').box(0.06, 0.32, 4.2, -0.05, 0.42, 0, '#e8ecef', 0, 0, 0, 'shiny'); },
  tuft(k, v) {   // grass and flowers by the road
    const col = ['#7cbf52', '#8ccf5a', '#6aaa48', '#a8c850', '#94c25a', '#78b04c'][v % 6];
    k.card(1.1, 0.9, 0, 0.42, 0, col, 0, 0, 'grass', 'up').card(1.1, 0.9, 0, 0.42, 0, col, Math.PI / 2, 0, 'grass', 'up');
  },
  crowd(k, v) {   // a row of people cheering behind a barrier (on their +Z side, towards the road), at the start, the checkpoints and the goal
    const r = rnd(200 + v);
    for (let i = 0; i < 12; i++) person(k, -6.6 + i * 1.2 + (r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.6, r, r() < 0.7);
    k.box(15, 0.9, 0.12, 0, 0, 0.7, '#ffffff', 0, 0, 0, 'shiny');
    for (let i = 0; i < 8; i++) k.box(1.8, 0.3, 0.13, -6.3 + i * 1.8, 0.45, 0.7, i % 2 ? '#d32f2f' : '#1d4ed8');
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
    const grey = new THREE.Color('#6f7a86'), gold = new THREE.Color('#e0a63c'), ochre = new THREE.Color('#c88a30');
    for (let q = n0; q < k.parts.lit.length; q++) { const g = k.parts.lit[q], p = g.attributes.position, c = g.attributes.color; for (let i = 0; i < p.count; i++) { const y = p.getY(i), col = y < 4 ? grey : (Math.floor(y / 6) % 2 ? gold : ochre); c.setXYZ(i, col.r, col.g, col.b); } }
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
function person(k, x, y, z, r, cheer) {   // one of the crowd: legs, a shirt, a head, arms (raised arms wave: the 'wave' material moves them)
  const sh = SHIRTS[(r() * SHIRTS.length) | 0], sk = SKIN[(r() * SKIN.length) | 0], h = 0.9 + r() * 0.25, up = cheer && r() < 0.75;
  k.box(0.3, h, 0.25, x, y, z, ['#2d3a55', '#3a3a3a', '#5a4632', '#1d4e89'][(r() * 4) | 0]).box(0.46, 0.62, 0.3, x, y + h, z, sh).ball(0.15, x, y + h + 0.82, z, sk, 1, 1.1, 1, 'lit', 8);
  if (r() < 0.4) k.ball(0.16, x, y + h + 0.9, z + 0.02, ['#2a1c12', '#c89a4a', '#6b3a1e', '#111111'][(r() * 4) | 0], 1.05, 0.7, 1.05, 'lit', 8);
  if (up) k.box(0.1, 0.55, 0.1, x - 0.3, y + h + 0.6, z, sk, 0, 0, 0.35, 'wave').box(0.1, 0.55, 0.1, x + 0.3, y + h + 0.6, z, sk, 0, 0, -0.35, 'wave');
  else k.box(0.1, 0.55, 0.1, x - 0.28, y + h + 0.08, z, sh).box(0.1, 0.55, 0.1, x + 0.28, y + h + 0.08, z, sh);
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
  lorry(k, col) {
    k.side([-6, 0.6, 3.6, 0.6, 3.6, 3.9, -6, 3.9], 2.5, 0, 0, 0, col, 'shiny', 0.05); k.side([3.8, 0.5, 6.1, 0.5, 6.1, 2.6, 5.4, 3.3, 3.8, 3.3], 2.4, 0, 0, 0, '#3a3a3a', 'shiny', 0.05);
    k.box(2.52, 0.3, 9.6, 0, 0.5, -1.2, '#3a3a3a'); wheelsOn(k, [-1.05, 1.05], [-4.6, -3.4, 4.8], 0.5, 0.35); lights(k, 2.5, 0.9, 6.12, 0.3);
  }
};
export const TRAFFIC_ORDER = ['hatch', 'saloon', 'van', 'bus', 'camper', 'tractor', 'lorry', 'sports'];
const TCOL = { hatch: [0, 1, 2, 4, 5, 6], saloon: [0, 1, 2, 3, 6, 7], van: [2, 2, 2, 6, 1], bus: [0, 4], camper: [5, 4, 1, 7], tractor: [5, 0], lorry: [2, 1, 3], sports: [0, 4, 7, 1] };
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
  for (const wz of wheelZ) for (const o of [-0.5, -0.44, -0.36, -0.24, -0.1, 0.1, 0.24, 0.36, 0.44, 0.5]) zs.push(wz + o);
  zs.sort((a, b) => a - b);
  const out = [];
  for (const z of zs) {
    if (z < z0 || z > z1 || (out.length && z - out[out.length - 1][0] < 0.025)) continue;
    const s = at(z); let arch = 0;
    for (const wz of wheelZ) { const d = (z - wz) / 0.47; if (Math.abs(d) < 1) arch = Math.max(arch, 0.43 * Math.sqrt(1 - d * d)); }
    out.push([z, s[0], Math.max(s[1], 0.3 + arch), s[2]]);
  }
  return out;
}
Kit.prototype.loft = function (st, col, key, opt) {   // a smooth closed body through cross-sections [z, halfWidth, bottom, top]
  opt = opt || {}; const N = opt.n || 28, up = opt.up || 3, dn = opt.dn || 6, belly = opt.belly == null ? 0.45 : opt.belly;
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
  const keys = [[-2.3, 0.56, 0.38, 0.5], [-2.18, 0.82, 0.3, 0.58], [-1.92, 0.93, 0.28, 0.65], [-1.45, 0.97, 0.28, 0.71], [-0.95, 0.97, 0.28, 0.76], [-0.52, 0.96, 0.28, 0.81],
    [0.1, 0.94, 0.28, 0.79], [0.65, 0.97, 0.28, 0.83], [1.2, 1.0, 0.28, 0.88], [1.72, 1.0, 0.29, 0.9], [2.1, 0.96, 0.31, 0.89], [2.3, 0.86, 0.36, 0.84]];
  const st = sections(keys, wz), at = (z) => { let b = st[0]; for (const s of st) if (Math.abs(s[0] - z) < Math.abs(b[0] - z)) b = s; return b; };
  k.loft(st, col, 'paint', { up: 3.8, dn: 6 });
  { const list = k.parts.paint, g = list[list.length - 1], P3 = g.attributes.position, C3 = g.attributes.color;   // two-tone shading: deeper red low down and along the sills, a touch brighter on the shoulders
    for (let i = 0; i < P3.count; i++) { const y = P3.getY(i), f = y < 0.5 ? 0.45 + 0.55 * Math.min(1, Math.max(0, (y - 0.3) / 0.2)) : y > 0.78 ? 1.06 : 1; C3.setXYZ(i, C3.getX(i) * f, C3.getY(i) * f, C3.getZ(i) * f); } }
  // the cabin: a black tub, tan seats with headrests, the dash and its glowing dials, a raked windscreen in a black frame
  k.box(1.5, 0.05, 1.3, 0, 0.79, 0.28, '#111111', 0, 0, 0, 'trim');
  for (const x of [-0.4, 0.4]) {
    k.ball(0.26, x, 0.84, 0.42, '#b8743e', 0.95, 0.28, 1.0, 'lit', 14);   // the cushion
    k.put(new THREE.CapsuleGeometry(0.2, 0.12, 4, 12), '#a8652f', x, 0.95, 0.74, 0.22, 0, 0, 1.15, 1, 0.36, 'lit');   // the backrest
    k.box(0.07, 0.3, 0.02, x, 0.8, 0.665, '#8a5226', 0, 0.22, 0, 'lit');   // its stitched centre panel
    k.ball(0.11, x, 1.02, 0.8, '#94582a', 0.9, 0.55, 0.4, 'lit', 12);   // a slim headrest
    for (const b of [-1, 1]) { k.put(new THREE.CapsuleGeometry(0.055, 0.1, 4, 8), '#94582a', x + b * 0.22, 0.88, 0.71, 0.22, 0, 0, 1, 1, 0.9, 'lit'); k.put(new THREE.CapsuleGeometry(0.05, 0.36, 4, 8), '#94582a', x + b * 0.22, 0.84, 0.42, Math.PI / 2, 0, 0, 1, 1, 0.8, 'lit'); }   // soft bolsters
    k.loft([[0.86, 0.1, 0.78, 0.84], [1.0, 0.15, 0.78, 0.99], [1.35, 0.14, 0.78, 0.95], [1.85, 0.06, 0.8, 0.89]], col, 'paint', { up: 2.4, dn: 3, belly: 0.3, n: 16, x: x });   // the humps behind the seats
  }
  k.box(1.62, 0.15, 0.32, 0, 0.8, -0.5, '#191919', 0, 0, 0, 'trim');
  for (const x of [0.28, 0.52]) { k.cyl(0.055, 0.055, 0.02, 14, x, 0.92, -0.335, '#3a404a', Math.PI / 2, 0, 'glow'); k.put(new THREE.TorusGeometry(0.052, 0.006, 4, 18), '#f2efe6', x, 0.92, -0.349, 0, 0, 0, 1, 1, 1, 'chrome'); k.box(0.006, 0.04, 0.004, x + 0.01, 0.9, -0.35, '#ff6a3d', 0, 0, -0.6, 'glow'); }
  k.box(1.52, 0.44, 0.02, 0, 0.82, -0.6, '#b8d0e0', 0, 0.78, 0, 'screen');
  k.box(1.56, 0.028, 0.035, 0, 1.17, -0.44, '#121212', 0, 0.78, 0, 'trim').box(0.025, 0.44, 0.035, -0.77, 0.82, -0.6, '#121212', 0, 0.78, 0, 'trim').box(0.025, 0.44, 0.035, 0.77, 0.82, -0.6, '#121212', 0, 0.78, 0, 'trim');
  k.box(0.18, 0.05, 0.035, 0, 1.12, -0.46, '#121212', 0, 0.78, 0, 'trim');   // the mirror
  // louvres over the engine, scoops ahead of the rear wheels, the mirrors on stalks
  const topAt = (z) => { let i = 0; while (i < st.length - 2 && st[i + 1][0] < z) i++; const a = st[i], b = st[i + 1], f = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0]))); return a[3] + (b[3] - a[3]) * f; };
  const ribbon = (x0, x1, z0, z1, lift, hex) => {   // a strip lying on the body from z0 to z1, between x0 and x1
    const pos = [], n = Math.ceil((z1 - z0) / 0.04);
    for (let q = 0; q < n; q++) { const za = z0 + (z1 - z0) * q / n, zb = z0 + (z1 - z0) * (q + 1) / n, ya = topAt(za) + lift, yb = topAt(zb) + lift;
      pos.push(x0, ya, za, x0, yb, zb, x1, yb, zb, x0, ya, za, x1, yb, zb, x1, ya, za); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    k.put(g, hex, 0, 0, 0, 0, 0, 0, 1, 1, 1, 'paint');
  };
  for (const sx of [-0.13, 0.13]) for (const [z0, z1] of [[-2.14, -0.64], [0.98, 2.22]]) {   // twin white stripes, nose to tail round the cabin, each with a fine dark edge
    ribbon(sx - 0.05, sx + 0.05, z0, z1, 0.004, '#5e0910');
    ribbon(sx - 0.042, sx + 0.042, z0, z1, 0.007, '#f4f2ec');
  }
  for (let i = 0; i < 9; i++) { const z = 1.15 + i * 0.11; k.box(0.09 - i * 0.004, 0.04, 0.13, 0, at(z)[3] - 0.012, z, col, 0, 0.05, 0, 'paint'); }   // the centre spine
  for (const sd of [-1, 1]) {
    const hw = at(0.72)[1];
    k.put(new THREE.CapsuleGeometry(0.075, 0.42, 6, 12), '#141414', sd * (hw - 0.02), 0.58, 0.74, Math.PI / 2, 0, 0, 0.45, 1, 1, 'trim');   // a rounded intake
    k.put(new THREE.CapsuleGeometry(0.085, 0.44, 6, 12), col, sd * (hw - 0.008), 0.61, 0.72, Math.PI / 2, 0, 0, 0.3, 1, 0.55, 'paint');   // its lip
    k.box(0.05, 0.05, 0.8, sd * (hw - 0.005), 0.71, 0.7, col, 0, 0, 0, 'paint');
    const dw = at(-0.5)[1];
    k.box(0.05, 0.16, 0.08, sd * (dw + 0.02), 0.8, -0.52, col, 0, 0, sd * -0.5, 'paint');   // the arm, rising out from the door top
    k.ball(0.075, sd * (dw + 0.11), 0.95, -0.52, col, 1.15, 0.72, 0.85, 'paint', 12).ball(0.06, sd * (dw + 0.11), 0.95, -0.47, '#2a3440', 1.1, 0.68, 0.3, 'glass', 10);
  }
  // the nose: flush glass over the lamps, a dark mouth and a splitter
  const nz = -1.98, ny = at(nz)[3];
  for (const sd of [-1, 1]) {
    k.box(0.36, 0.04, 0.24, sd * 0.58, ny - 0.07, nz, '#fffbe8', 0, 0.26, 0, 'glow');
    k.box(0.4, 0.015, 0.03, sd * 0.58, ny - 0.04, nz - 0.17, '#e8f4ff', 0, 0.26, 0, 'glow');   // a running-light strip along its front edge
    k.put(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), '#fff6d8', sd * 0.62, 0.42, -len + 0.02, Math.PI / 2, 0, 0, 1, 1, 1, 'glow');   // fog lamps in the bumper
    k.put(new THREE.TorusGeometry(0.065, 0.01, 6, 18), '#d6d9dc', sd * 0.62, 0.42, -len + 0.005, 0, 0, 0, 1, 1, 1, 'chrome');
  }
  k.put(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 18), '#f2c230', 0, at(-2.15)[3] - 0.01, -2.17, 0.5, 0, 0, 1, 1, 1, 'chrome');   // the badge
  k.box(1.1, 0.12, 0.1, 0, 0.35, -len + 0.04, '#0d0d0d', 0, 0, 0, 'trim').box(1.55, 0.03, 0.24, 0, 0.29, -2.18, '#0d0d0d', 0, 0, 0, 'trim');
  // the tail: a black panel with the light bar across it, the diffuser, four pipes and the plate
  k.box(1.72, 0.26, 0.06, 0, 0.47, len + 0.005, '#0d0d0d', 0, 0, 0, 'trim');
  k.box(1.64, 0.05, 0.05, 0, 0.72, len + 0.01, '#ff0a18', 0, 0, 0, 'brake');
  for (const sd of [-1, 1]) {
    k.put(new THREE.CapsuleGeometry(0.075, 0.34, 6, 16), '#d6d9dc', sd * 0.6, 0.63, len + 0.005, 0, 0, Math.PI / 2, 1.12, 1.04, 0.35, 'chrome');   // the chrome surround
    k.put(new THREE.CapsuleGeometry(0.065, 0.32, 6, 16), '#ff0a18', sd * 0.6, 0.63, len + 0.02, 0, 0, Math.PI / 2, 1, 1, 0.4, 'brake');
    k.box(0.12, 0.012, 0.02, sd * 0.6, 0.628, len + 0.045, '#7a0008', 0, 0, 0, 'trim');   // a dark line through it
  }
  for (const sd of [-1, 1]) k.box(0.1, 0.05, 0.05, sd * 0.9, 0.48, len - 0.02, '#ffb070', 0, 0, 0, 'glow');   // the indicators
  k.box(1.5, 0.025, 0.04, 0, 0.785, len - 0.005, '#d6d9dc', 0, 0, 0, 'chrome');
  k.box(1.7, 0.035, 0.22, 0, at(len - 0.15)[3] - 0.01, len - 0.12, col, 0, -0.12, 0, 'paint');   // a lip spoiler
  k.box(1.3, 0.1, 0.3, 0, 0.29, len - 0.1, '#0d0d0d', 0, 0, 0, 'trim');
  for (const x of [-0.5, -0.34, 0.34, 0.5]) k.roll(0.045, 0.22, 12, x, 0.36, len + 0.03, '#d6d9dc', 'chrome');
  k.box(0.52, 0.11, 0.02, 0, 0.42, len + 0.04, '#ffffff', 0, 0, 0, 'plate');
  for (const sd of [-1, 1]) { k.box(0.012, 0.36, 0.012, sd * (at(-0.5)[1] - 0.004), 0.43, -0.5, '#4a0006', 0, 0, 0, 'trim'); k.box(0.012, 0.3, 0.012, sd * (at(0.45)[1] - 0.004), 0.45, 0.45, '#4a0006', 0, 0, 0, 'trim'); k.box(0.01, 0.012, 0.95, sd * (at(0)[1] - 0.003), 0.62, -0.03, '#4a0006', 0, 0, 0, 'trim'); }   // the doors' shut lines
  // the wheel arches: a dark well inside, a flared lip round the outside
  for (const z of wz) for (const sd of [-1, 1]) {
    const hw = at(z)[1];
    k.put(new THREE.CylinderGeometry(0.44, 0.44, 0.34, 18, 1, true, -Math.PI / 2, Math.PI), '#0b0b0b', sd * (hw - 0.2), 0.34, z, 0, 0, Math.PI / 2, 1, 1, 1, 'trim');
    k.put(new THREE.TorusGeometry(0.455, 0.035, 6, 20, Math.PI), col, sd * (hw - 0.012), 0.34, z, 0, sd * Math.PI / 2, 0, 1, 1, 1, 'paint');
  }
  for (const sd of [-1, 1]) { const hw = at(0)[1];
    k.box(0.05, 0.11, 1.75, sd * (hw - 0.01), 0.3, 0, '#151517', 0, 0, 0, 'trim').box(0.02, 0.018, 1.7, sd * (hw + 0.015), 0.4, 0, '#d6d9dc', 0, 0, 0, 'chrome'); }   // the sills
  // red brake calipers (they stay put while the wheels turn)
  const wx = w / 2 - 0.08;
  for (const z of wz) for (const sd of [-1, 1]) k.box(0.05, 0.13, 0.17, sd * (wx - 0.15), 0.43, z - 0.1, '#d01818', 0, 0, 0, 'lit');
  return { k: k, len: len, w: w, wz: wz, wx: wx };
}
function bigWheel() {   // a low tyre, a five-spoke star rim and the brake disc behind it
  const wk = new Kit();
  wk.axle(0.34, 0.27, 24, 0, 0, 0, '#1c1c1e', 'tyre').axle(0.262, 0.275, 22, 0, 0, 0, '#232325', 'tyre');
  wk.axle(0.235, 0.05, 20, -0.05, 0, 0, '#3a3d40', 'trim');   // the disc
  wk.put(new THREE.TorusGeometry(0.245, 0.018, 6, 28), '#d4d8dc', 0.145, 0, 0, 0, Math.PI / 2, 0, 1, 1, 1, 'alloy');   // the rim's lip
  for (let i = 0; i < 10; i++) { const a = i * Math.PI * 2 / 10; wk.put(new THREE.BoxGeometry(0.04, 0.24, 0.045), i % 2 ? '#b8bec4' : '#dfe3e6', 0.15, Math.cos(a) * 0.115, Math.sin(a) * 0.115, a, 0, 0, 1, 1, 1, 'alloy'); }
  wk.axle(0.24, 0.02, 24, 0.137, 0, 0, '#26282b', 'trim');   // the dark face behind the spokes
  wk.put(new THREE.TorusGeometry(0.296, 0.026, 6, 32), '#55565a', 0.13, 0, 0, 0, Math.PI / 2, 0, 1, 1, 0.4, 'tyre');   // the sidewall band
  wk.put(new THREE.TorusGeometry(0.296, 0.008, 4, 32), '#8a8b90', 0.138, 0, 0, 0, Math.PI / 2, 0, 1, 1, 1, 'tyre');   // a ring of lettering
  wk.axle(0.06, 0.06, 10, 0.155, 0, 0, '#2a2d31', 'trim');
  return wk.build();
}

// ---------------------------------------------------------------- the two of you, in parts that move (world3d.js puts them together and poses them)
// Each part is built round its own pivot. The driver (on the right: a British car) wears sunglasses and a white shirt;
// his girlfriend has a turquoise top and long fair hair that streams out behind her in the wind.
export function people() {
  const P = (fn) => { const k = new Kit(); fn(k); return k.build(); };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
  const one = (o) => ({
    torso: P((k) => { k.put(cap(o.chest, 0.3), o.top, 0, 0.3, 0, 0, 0, 0, o.wide, 1, 0.72, 'lit'); for (const sd of [-1, 1]) k.ball(o.arm * 1.35, sd * o.chest * o.wide * 0.98, 0.55, 0, o.sleeve, 1, 0.9, 1, 'lit', 10); if (o.collar) for (const sd of [-1, 1]) k.box(0.09, 0.03, 0.07, sd * 0.05, 0.62, -0.06, '#e4e4de', 0, 0, sd * 0.5, 'lit'); k.cyl(0.05, 0.055, 0.14, 8, 0, 0.6, 0, o.skin); if (o.strap) { k.box(0.04, 0.2, 0.04, -0.1, 0.48, -0.1, o.skin); k.box(0.04, 0.2, 0.04, 0.1, 0.48, -0.1, o.skin); } }),
    head: P((k) => {
      k.ball(0.122, 0, 0.13, 0, o.skin, 1, 1.15, 1.06, 'lit', 16);
      k.ball(0.021, 0, 0.112, -0.122, o.skin, 0.9, 0.95, 0.75, 'lit', 8);   // the nose   // the nose
      k.ball(0.132, 0, 0.18, 0.025, o.hair, 1.04, o.long ? 0.95 : 0.82, 1.08, 'lit', 16);
      if (!o.long) { k.ball(0.125, 0, 0.13, 0.035, o.hair, 1.02, 0.85, 1.0, 'lit', 16); k.ball(0.06, 0, 0.255, -0.08, o.hair, 1.4, 0.55, 1, 'lit', 10); }   // the back of his head, and a quiff
      if (o.long) {
        k.ball(0.1, -0.09, 0.08, 0.05, o.hair, 0.45, 1.0, 0.85, 'lit', 12); k.ball(0.1, 0.09, 0.08, 0.05, o.hair, 0.45, 1.0, 0.85, 'lit', 12);
        k.ball(0.13, 0, 0.08, 0.07, o.hair, 0.86, 1.35, 0.6, 'lit', 16);   // the mass of it down her back
        k.ball(0.09, -0.03, 0.235, -0.08, '#f6d888', 1.15, 0.45, 0.8, 'lit', 12).ball(0.07, 0.05, 0.225, -0.09, '#e8c070', 1.1, 0.45, 0.7, 'lit', 10);   // a side-swept fringe
      }
      for (const sd of [-1, 1]) k.ball(0.028, sd * 0.123, 0.13, 0.005, o.skin, 0.5, 1, 0.8, 'lit', 8);   // ears
      if (o.shades) {   // his wraparound sunglasses: dark lenses, a thin frame round to the ears
        for (const sd of [-1, 1]) k.ball(0.04, sd * 0.047, 0.148, -0.113, '#0d1218', 1.2, 0.85, 0.45, 'glass', 10);
        k.box(0.03, 0.014, 0.02, 0, 0.152, -0.122, '#1a1a1a').box(0.24, 0.012, 0.012, 0, 0.165, -0.105, '#1a1a1a');
        k.box(0.05, 0.01, 0.012, -0.045, 0.19, -0.115, '#2a1c12', 0, 0, 0.12).box(0.05, 0.01, 0.012, 0.045, 0.19, -0.115, '#2a1c12', 0, 0, -0.12);   // brows
      } else {
        for (const sd of [-1, 1]) k.ball(0.035, sd * 0.045, 0.262, -0.075, '#151a20', 1.25, 0.6, 0.45, 'glass', 10);   // her sunglasses pushed up into her hair
        for (const ex of [-0.046, 0.046]) {
          k.ball(0.024, ex, 0.15, -0.108, '#fbfbf8', 1.1, 0.9, 0.55, 'lit', 10);   // the white of the eye
          k.ball(0.005, ex + 0.005, 0.155, -0.127, '#ffffff', 1, 1, 0.5, 'lit', 6);
          k.ball(0.014, ex, 0.149, -0.12, '#3a6fb0', 1, 1.1, 0.5, 'lit', 8).ball(0.007, ex, 0.149, -0.126, '#101010', 1, 1, 0.5, 'lit', 6);   // blue iris, pupil
          k.box(0.05, 0.009, 0.01, ex, 0.168, -0.122, '#2a1c12', 0, 0, ex > 0 ? -0.2 : 0.2);   // lashes
          k.box(0.045, 0.008, 0.01, ex, 0.19, -0.118, '#a87a40', 0, 0, ex > 0 ? -0.12 : 0.12);   // brows
          k.ball(0.026, ex * 1.5, 0.1, -0.1, '#f2949a', 1, 0.6, 0.4, 'lit', 8);   // blush
        }
      }
      k.put(new THREE.TorusGeometry(0.03, 0.006, 5, 12, Math.PI), o.shades ? '#8a4a3a' : '#c8304a', 0, 0.083, -0.114, 0, 0, Math.PI, 1, 0.8, 0.45, 'lit');   // a smile
    }),
    upper: P((k) => k.put(cap(o.arm, 0.2), o.sleeve, 0, -0.14, 0)),
    fore: P((k) => { k.put(cap(o.arm * 0.9, 0.17), o.skin, 0, -0.12, 0); k.box(0.07, 0.085, 0.055, 0, -0.32, 0, o.skin, 0, 0, 0, 'lit').ball(0.022, 0.036, -0.255, -0.018, o.skin, 1, 1.3, 1, 'lit', 8); }),   // a mitten hand and thumb
    hair: o.long ? [0, 1, 2].map((i) => P((k) => {
      const w = 0.11 - i * 0.016, c = ['#f0cd78', '#ecc66e', '#e6be66', '#deb45e', '#d6a852'][i];
      k.ball(0.07, 0, 0, 0.07, c, w / 0.14, w / 0.15, 1.5, 'lit', 14);   // one smooth length of tail, overlapping the next
    })) : null,
    scarf: null
  });
  const driver = one({ collar: true, chest: 0.165, wide: 1.25, top: '#f2f2ee', sleeve: '#f2f2ee', skin: '#e2ae86', hair: '#2a1c12', arm: 0.052, shades: true });
  const girl = one({ chest: 0.14, wide: 1.15, top: '#1fb5c4', sleeve: '#e8b48c', skin: '#efbf98', hair: '#f0cd78', arm: 0.044, long: true, strap: true });
  const sw = P((k) => { k.put(new THREE.TorusGeometry(0.175, 0.022, 8, 24), '#151515', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'trim'); k.box(0.3, 0.03, 0.02, 0, 0, 0, '#202020', 0, 0, 0, 'trim').cyl(0.045, 0.045, 0.03, 12, 0, 0, 0, '#2a2a2e', Math.PI / 2, 0, 'trim'); });
  return {
    driver: { part: driver, seat: [0.4, 0.72, 0.42], neck: 0.68, shoulder: [0.205, 0.56, 0], elbow: 0.27, scale: 1.2 },
    girl: { part: girl, seat: [-0.4, 0.71, 0.5], neck: 0.66, shoulder: [0.18, 0.54, 0], elbow: 0.26, hairAt: [-0.085, 0.19, 0.09], scarfAt: [-0.085, -0.03, 0.04], scale: 1.18 },
    wheel: { geo: sw, at: [0.4, 0.98, -0.08], tilt: 0.45 }
  };
}

export function playerCar(id) {
  if (!CARDEF[id] || id === 'roadster') {   // the red roadster: its own body, wheels and cabin (the two of you come from people())
    const S = spider();
    return { body: S.k.build(), wheel: bigWheel(), wheels: [[-S.wx, 0.34, S.wz[0]], [S.wx, 0.34, S.wz[0]], [-S.wx, 0.34, S.wz[1]], [S.wx, 0.34, S.wz[1]]], len: S.len, width: S.w, open: true };
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
