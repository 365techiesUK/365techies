/* 365 Coast Run - the 3D models (5 Oct 2026; made richer the same day for the OutRun-2-style revamp): every car, tree,
 * palm, hut, crowd and lighthouse built from shapes in code - our own designs, nothing downloaded. Each part of a model
 * says what it is made of (its material key): 'lit' plain painted surfaces, 'shiny' glossy ones (traffic paintwork,
 * glass), 'glow' lamps, windows and lights (bright at night, and they bloom), 'leaf' / 'frond' / 'grass' leafy cards
 * cut out by a painted texture (paintLeaves etc. below), and for your own car 'paint', 'chrome', 'glass', 'trim'.
 * world3d.js gives each key its material. Units are metres; a model stands on y = 0 and faces -Z (the way the road goes). */
import * as THREE from 'three';

const C = new THREE.Color(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E3 = new THREE.Euler(), V = new THREE.Vector3(), S3 = new THREE.Vector3();
function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const UV_KEYS = { leaf: 1, frond: 1, grass: 1 };

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
  castle(k) {
    k.cone(60, 40, 12, 0, -2, 0, '#5f9a45');
    const st = '#9e9a8e', dk = '#7f7b70';
    k.box(9, 26, 9, 0, 34, 0, st).box(3, 6, 9, 3, 60, 0, dk).box(3, 3, 9, -3, 60, 0, dk);
    k.box(24, 8, 3, -14, 34, 8, st).box(3, 12, 3, -26, 34, 8, dk).box(18, 6, 3, 12, 34, -8, st).box(3, 9, 3, 21, 34, -8, dk);
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
  arch(k) {
    const col = '#c9a77a', dk = '#a3835c';
    k.blob(16, -22, 6, 0, dk, 1, 1.6, 1.3, 101).blob(14, 22, 5, 0, col, 1, 1.5, 1.2, 103);
    k.box(46, 12, 16, 0, 26, 0, col).blob(10, 0, 37, 0, '#6f9a45', 2.4, 0.4, 0.9, 105);
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
  wall(k) { k.box(0.6, 1.1, 4.2, 0, 0, 0, '#9d978a').box(0.7, 0.18, 4.2, 0, 1.05, 0, '#7d786d'); },
  fence(k) { k.box(0.14, 1.2, 0.14, 0, 0, 0, '#8a6a48').box(0.08, 0.1, 4.2, 0, 0.55, 0, '#8a6a48').box(0.08, 0.1, 4.2, 0, 1.05, 0, '#8a6a48'); },
  rail(k) { k.box(0.1, 1, 0.1, 0, 0, 0, '#2f7f86').box(0.07, 0.08, 4.2, 0, 0.55, 0, '#2f7f86').box(0.09, 0.09, 4.2, 0, 0.98, 0, '#2f7f86'); },
  quay(k) { k.box(0.8, 0.7, 4.2, 0, 0, 0, '#55585f'); },
  armco(k) { k.box(0.14, 0.75, 0.14, 0, 0, 0, '#9aa0a6').box(0.06, 0.32, 4.2, -0.05, 0.42, 0, '#e8ecef', 0, 0, 0, 'shiny'); },
  tuft(k, v) {   // grass and flowers by the road
    const col = ['#7cbf52', '#8ccf5a', '#6aaa48', '#f4e04a', '#ffffff', '#ff8ab8'][v % 6];
    k.card(1.1, 0.9, 0, 0.42, 0, col, 0, 0, 'grass', 'up').card(1.1, 0.9, 0, 0.42, 0, col, Math.PI / 2, 0, 'grass', 'up');
  },
  crowd(k, v) {   // a row of people cheering behind a barrier (on their +Z side, towards the road), at the start, the checkpoints and the goal
    const r = rnd(200 + v);
    for (let i = 0; i < 12; i++) {
      const x = -6.6 + i * 1.2 + (r() - 0.5) * 0.3, z = (r() - 0.5) * 0.6, sh = SHIRTS[(r() * SHIRTS.length) | 0], sk = SKIN[(r() * SKIN.length) | 0], h = 0.9 + r() * 0.25;
      k.box(0.3, h, 0.25, x, 0, z, '#2d3a55').box(0.46, 0.62, 0.3, x, h, z, sh).ball(0.15, x, h + 0.82, z, sk, 1, 1.1, 1, 'lit', 8);
      const up = r() < 0.5; k.box(0.1, 0.55, 0.1, x - 0.28, h + (up ? 0.6 : 0.1), z, up ? sk : sh, 0, 0, up ? 0.3 : 0).box(0.1, 0.55, 0.1, x + 0.28, h + (up ? 0.6 : 0.1), z, up ? sk : sh, 0, 0, up ? -0.3 : 0);
    }
    k.box(15, 0.9, 0.12, 0, 0, 0.7, '#ffffff', 0, 0, 0, 'shiny');
    for (let i = 0; i < 8; i++) k.box(1.8, 0.3, 0.13, -6.3 + i * 1.8, 0.45, 0.7, i % 2 ? '#d32f2f' : '#1d4ed8');
  },
  flags(k, v) {   // flag poles in a row
    for (let i = 0; i < 4; i++) { const x = -4.5 + i * 3; k.cyl(0.05, 0.06, 6, 6, x, 0, 0, '#d8dde2'); k.box(1.6, 1, 0.04, x + 0.82, 4.8, 0, ['#d32f2f', '#ffd23f', '#1d7fd6', '#2a9d8f', '#ffffff'][(i + v) % 5], 0, 0, 0.08); }
  }
};
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
const TRAFFIC = {
  hatch(k, col) { k.side([-1.9, 0.3, 1.9, 0.3, 1.95, 0.85, 1.5, 1.05, 1.1, 1.45, -0.6, 1.55, -1.4, 1.05, -1.9, 0.95], 1.7, 0, 0, 0, col, 'shiny', 0.06); k.side([-0.55, 1.07, 1.05, 1.07, 1.3, 1.42, -0.5, 1.5], 1.52, 0, 0.02, 0, GLASS, 'shiny'); wheelsOn(k, [-0.78, 0.78], [-1.25, 1.25], 0.32, 0.22); lights(k, 1.7, 0.75, 1.96); },
  saloon(k, col) { k.side([-2.2, 0.3, 2.2, 0.3, 2.25, 0.85, 1.6, 0.95, 1.1, 1.4, -0.7, 1.42, -1.4, 0.95, -2.2, 0.85], 1.8, 0, 0, 0, col, 'shiny', 0.06); k.side([-0.65, 0.97, 1.05, 0.97, 1.2, 1.36, -0.6, 1.38], 1.62, 0, 0.02, 0, GLASS, 'shiny'); wheelsOn(k, [-0.82, 0.82], [-1.45, 1.45], 0.33, 0.22); lights(k, 1.8, 0.72, 2.26); },
  sports(k, col) { k.side([-2.1, 0.25, 2.1, 0.25, 2.15, 0.75, 0.9, 0.95, 0.3, 1.2, -0.6, 1.2, -1.2, 0.85, -2.1, 0.6], 1.85, 0, 0, 0, col, 'shiny', 0.07); k.side([-0.55, 0.88, 0.35, 0.95, 0.25, 1.15, -0.5, 1.15], 1.62, 0, 0.02, 0, GLASS, 'shiny'); k.box(1.7, 0.06, 0.4, 0, 1.0, 1.9, '#1a1a1a'); wheelsOn(k, [-0.84, 0.84], [-1.35, 1.35], 0.33, 0.25); lights(k, 1.85, 0.6, 2.16); },
  van(k, col) { k.side([-2.5, 0.35, 2.5, 0.35, 2.5, 2.3, -1.2, 2.3, -1.9, 1.3, -2.5, 1.1], 1.95, 0, 0, 0, col, 'shiny', 0.07); k.side([-1.85, 1.35, -1.2, 1.35, -1.2, 2.05, -1.6, 2.05], 1.82, 0, 0.02, 0, GLASS, 'shiny'); wheelsOn(k, [-0.88, 0.88], [-1.6, 1.6], 0.36, 0.24); lights(k, 1.95, 1.2, 2.51, 0.4); },
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
    k.box(1.6, 0.25, 3.4, 0, 2.5, 0.6, '#e8e2d4'); wheelsOn(k, [-0.9, 0.9], [-1.7, 1.7], 0.36, 0.24); lights(k, 2, 0.9, 2.71, 0.3);
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
  return this.put(g, col, 0, 0, 0, 0, 0, 0, 1, 1, 1, key || 'paint');
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
export function playerCar(id) {
  const D = CARDEF[id] || CARDEF.roadster, k = new Kit(), len = D.len, w = D.w, skin = ['#e0b088', '#c98d5a'];
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
