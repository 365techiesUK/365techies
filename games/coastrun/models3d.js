/* 365 Coast Run - the 3D models (5 Oct 2026): every car, tree, hut and lighthouse built from simple shapes in code,
 * flat-shaded with a colour on each face (the bright, clean look of the modern arcade racers) - our own designs, nothing
 * downloaded. A model is two geometries: the lit part, and the glowing part (lamps, windows, lights) that stays bright
 * at night. Units are metres; a model stands on y = 0 and faces -Z (the way the road goes). */
import * as THREE from '../common/vendor/three-r185/three.module.min.js';

const C = new THREE.Color(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E3 = new THREE.Euler(), V = new THREE.Vector3(), S3 = new THREE.Vector3();
function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- a kit: add shapes, get one geometry with a colour per face
export class Kit {
  constructor() { this.lit = []; this.glow = []; }
  put(geo, col, x, y, z, rx, ry, rz, sx, sy, sz, glow) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    E3.set(rx || 0, ry || 0, rz || 0); Q.setFromEuler(E3); V.set(x || 0, y || 0, z || 0); S3.set(sx || 1, sy || 1, sz || 1);
    M.compose(V, Q, S3); g.applyMatrix4(M);
    const n = g.attributes.position.count, cols = new Float32Array(n * 3);
    C.set(col);
    for (let i = 0; i < n; i++) { cols[i * 3] = C.r; cols[i * 3 + 1] = C.g; cols[i * 3 + 2] = C.b; }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'color' && k !== 'normal') g.deleteAttribute(k);
    (glow ? this.glow : this.lit).push(g);
    return this;
  }
  box(w, h, d, x, y, z, col, ry, rx, rz, glow) { return this.put(new THREE.BoxGeometry(w, h, d), col, x, y + h / 2, z, rx, ry, rz, 1, 1, 1, glow); }
  cyl(rt, rb, h, n, x, y, z, col, rx, rz, glow) { return this.put(new THREE.CylinderGeometry(rt, rb, h, n), col, x, y + h / 2, z, rx, 0, rz, 1, 1, 1, glow); }
  axle(r, w, n, x, y, z, col) { return this.put(new THREE.CylinderGeometry(r, r, w, n), col, x, y, z, 0, 0, Math.PI / 2); }   // lying across (X), centred
  roll(r, len, n, x, y, z, col) { return this.put(new THREE.CylinderGeometry(r, r, len, n), col, x, y, z, Math.PI / 2, 0, 0); }   // lying along (Z), centred
  cone(r, h, n, x, y, z, col, glow) { return this.put(new THREE.ConeGeometry(r, h, n), col, x, y + h / 2, z, 0, 0, 0, 1, 1, 1, glow); }
  blob(r, x, y, z, col, sx, sy, sz, seed) {   // a lumpy ball (leaves, rocks, bushes)
    const g = new THREE.IcosahedronGeometry(r, 0), p = g.attributes.position, rr = rnd(seed || 7), seen = new Map();
    for (let i = 0; i < p.count; i++) { const key = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3); let k = seen.get(key); if (k == null) { k = 0.82 + rr() * 0.36; seen.set(key, k); } p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
    return this.put(g, col, x, y, z, 0, 0, 0, sx || 1, sy || 1, sz || 1);
  }
  prism(w, h, d, x, y, z, col, ry) {   // a pitched roof, ridge along Z
    const g = new THREE.BufferGeometry(), v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex([0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3]);
    return this.put(g, col, x, y, z, 0, ry || 0, 0, w, h, d);
  }
  side(pts, width, x, y, z, col, glow) {   // a shape drawn side-on (along the length, up), given thickness across: car bodies
    const sh = new THREE.Shape(); sh.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) sh.lineTo(pts[i], pts[i + 1]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: false, steps: 1 });
    g.translate(0, 0, -width / 2); g.rotateY(Math.PI / 2);   // length runs front (-Z) to back (+Z), width along X
    return this.put(g, col, x, y, z, 0, 0, 0, 1, 1, 1, glow);
  }
  build() {
    const out = { lit: merge(this.lit), glow: this.glow.length ? merge(this.glow) : null };
    this.lit.forEach((g) => g.dispose()); this.glow.forEach((g) => g.dispose());
    return out;
  }
}
function merge(list) {
  let n = 0; list.forEach((g) => { n += g.attributes.position.count; });
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  list.forEach((g) => { pos.set(g.attributes.position.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------------- colours
const AUT = [['#c8641e', '#e08a2a', '#f2b237'], ['#b8452a', '#d0622c', '#e8973a'], ['#9a6a18', '#d0a028', '#f0cc48']];
const GRN = ['#2f7d32', '#3f8f3a', '#56a844'];
const HUT = ['#3fa7d6', '#f2c14e', '#e4572e', '#76b041', '#f4f1ea', '#d7263d'];

// ---------------------------------------------------------------- the roadside
const MODELS = {
  palm(k, v) {
    const lean = [0.5, -0.6, 0.2][v % 3];
    for (let i = 0; i < 7; i++) { const p = i / 7, x = lean * p * p * 2.2; k.cyl(0.22 - p * 0.08, 0.26 - p * 0.08, 1.25, 6, x, i * 1.2, 0, i % 2 ? '#8a6a45' : '#9c7a52'); }
    const tx = lean * 2.2, ty = 8.4;
    for (let j = 0; j < 9; j++) {
      const a = j / 9 * Math.PI * 2, droop = 0.55 + (j % 3) * 0.12;
      k.put(new THREE.BoxGeometry(0.9, 0.08, 3.6), GRN[j % 3], tx + Math.sin(a) * 1.6, ty - 0.35, Math.cos(a) * 1.6, droop, a, 0);
    }
    k.blob(0.42, tx, ty, 0, '#6b4a22', 1, 0.9, 1, 3);
  },
  lamp(k, v) {
    const pole = v ? '#20262e' : '#1f4a3f';
    k.cyl(0.18, 0.24, 0.6, 8, 0, 0, 0, pole).cyl(0.08, 0.1, 5.8, 6, 0, 0.6, 0, pole);
    k.box(0.09, 0.09, 1.6, 0, 6.2, -0.75, pole, 0, 0, 0);
    k.cyl(0.32, 0.18, 0.5, 6, 0, 5.75, -1.5, v ? '#fff1b0' : '#e8f2f2', 0, 0, !!v).cone(0.36, 0.3, 6, 0, 6.25, -1.5, pole);
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
    const c = v ? ['#2b6a2e', '#357a35', '#3f8a3c'] : ['#3c8a3a', '#4fa246', '#64b852'];
    k.blob(0.9, 0, 0.7, 0, c[0], 1.3, 0.9, 1.1, 2).blob(0.75, 0.6, 0.9, 0.3, c[1], 1, 0.9, 1, 4).blob(0.7, -0.6, 0.9, -0.2, c[2], 1, 0.9, 1, 6);
    if (!v) { const r = rnd(9); for (let i = 0; i < 10; i++) k.box(0.14, 0.14, 0.14, (r() - 0.5) * 2, 1 + r() * 0.6, (r() - 0.5) * 1.6, ['#ff5fa2', '#ffd23f', '#ffffff', '#ff7b39'][i % 4]); }
  },
  hotel(k, v) {
    const wall = ['#f2ead8', '#e9e2d6', '#f6efe0', '#dfe6ea'][v % 4], roof = ['#9a5b45', '#5a6670', '#8a4f3c', '#4f5d6a'][v % 4], fl = 5 + (v % 3);
    k.box(22, fl * 3.2, 14, 0, 0, 0, wall).prism(15, 4, 23, 0, fl * 3.2, 0, roof, Math.PI / 2);
    for (let f = 0; f < fl; f++) for (let w = 0; w < 7; w++) k.box(1.6, 1.8, 0.2, -9 + w * 3, 1 + f * 3.2, 7.05, '#7fb4d1');
    k.box(6, 3, 0.4, 0, 0, 7.1, ['#1d4e89', '#7a1f2b', '#1f6f50', '#333'][v % 4]);
  },
  yacht(k, v) {
    const night = v >= 3, hull = night ? '#26324a' : ['#ffffff', '#1d3557', '#f1faee'][v % 3];
    k.side([-4, 0.4, 4.4, 0.4, 5, 1.6, -4.2, 1.6], 2.6, 0, -0.4, 0, hull);
    k.box(1.8, 0.8, 3, 0, 1.2, 0.5, night ? '#33415a' : '#e9eef0');
    k.cyl(0.06, 0.06, 11, 4, 0, 1.2, -0.5, '#c8c8c8');
    if (!night) { k.side([0, 0, 0, 9.5, 3.8, 0], 0.05, 0, 1.6, -0.6, '#fdfdfd'); k.side([0, 0, 0, 8.2, -2.6, 0], 0.05, 0, 1.6, -0.4, '#f2f2f2'); }
    else { k.box(1.6, 0.25, 2.8, 0, 1.4, 0.5, '#ffd98a', 0, 0, 0, true); k.box(0.25, 0.25, 0.25, 0, 12.2, -0.5, '#fff2c0', 0, 0, 0, true); }
  },
  pier(k) {
    for (let x = -42; x <= 42; x += 6) { k.cyl(0.25, 0.25, 9, 5, x, -3, -1.6, '#5b4636'); k.cyl(0.25, 0.25, 9, 5, x, -3, 1.6, '#5b4636'); }
    k.box(90, 0.6, 6, 0, 6, 0, '#e8e0cf').box(90, 1, 0.1, 0, 6.6, 2.9, '#2e5d6b').box(90, 1, 0.1, 0, 6.6, -2.9, '#2e5d6b');
    k.box(22, 6, 12, 36, 6.6, 0, '#f4efe4'); for (let w = 0; w < 6; w++) k.box(2, 2.4, 0.2, 28 + w * 3.2, 8, 6.05, '#7fb4d1');
    k.box(24, 1, 13, 36, 12.6, 0, '#3f7f8f'); k.blob(5, 36, 13.4, 0, '#3f7f8f', 1, 0.7, 1, 1); k.cyl(0.2, 0.2, 3, 4, 36, 16.5, 0, '#3f7f8f');
  },
  oak(k, v) {
    const c = v ? AUT[(v - 1) % 3] : GRN;
    k.cyl(0.4, 0.6, 4.5, 6, 0, 0, 0, '#5a4632');
    k.blob(3.2, 0, 6.6, 0, c[0], 1.2, 0.85, 1.2, 11 + v).blob(2.4, 1.6, 7.6, 0.6, c[1], 1, 0.9, 1, 13 + v).blob(2.4, -1.5, 7.3, -0.8, c[2], 1, 0.9, 1, 17 + v).blob(1.9, 0.2, 9, 0.2, c[1], 1, 0.9, 1, 19 + v);
  },
  beech(k, v) {
    const c = v ? ['#8a3a1c', '#b5522a', '#d9813a'] : GRN;
    k.cyl(0.35, 0.5, 5, 6, 0, 0, 0, '#7d7b74');
    k.blob(2.6, 0, 7.4, 0, c[0], 1, 1.35, 1, 21 + v).blob(2, 0.8, 9.2, 0.4, c[1], 1, 1.2, 1, 23 + v).blob(1.6, -0.6, 10.6, -0.3, c[2], 1, 1.1, 1, 27 + v);
  },
  pine(k) {
    k.cyl(0.28, 0.4, 9, 6, 0, 0, 0, '#9a5a32');
    for (let i = 0; i < 5; i++) k.blob(1.9 - i * 0.15, (i % 2 ? 0.5 : -0.4), 6.5 + i * 1.6, (i % 3) * 0.3, ['#1f4d2e', '#2a6136', '#3a7a40'][i % 3], 1.25, 0.55, 1.25, 41 + i);
  },
  birch(k, v) {
    k.cyl(0.18, 0.24, 7, 6, 0, 0, 0, '#ecebe6');
    for (let i = 0; i < 5; i++) k.box(0.4, 0.12, 0.4, 0, 1 + i * 1.2, 0, '#2d2d2d', i);
    const c = v ? ['#b8901e', '#e0b830', '#f5d55a'] : GRN;
    k.blob(1.8, 0, 7.6, 0, c[0], 1, 1.4, 1, 61 + v).blob(1.3, 0.5, 9, 0.3, c[1], 1, 1.3, 1, 63 + v).blob(1.1, -0.4, 8.4, -0.4, c[2], 1, 1.2, 1, 67 + v);
  },
  sheep(k, v) {
    const f = v % 2 ? -1 : 1;
    for (const [x, z] of [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.4], [0.3, 0.4]]) k.box(0.12, 0.5, 0.12, x, 0, z, '#2b2b2b');
    k.blob(0.55, 0, 0.85, 0, '#f2efe6', 1, 0.75, 1.4, 5).box(0.32, 0.36, 0.42, 0, 0.9, -0.8 * f, '#2b2b2b');
  },
  hay(k) { k.axle(0.8, 1.2, 10, 0, 0.8, 0, '#d9b450'); k.axle(0.55, 1.22, 10, 0, 0.8, 0, '#e8c86a'); },
  cottage(k, v) {
    const wall = v ? '#f3ead2' : '#eee3c8';
    k.box(10, 4.4, 7, 0, 0, 0, wall);
    k.prism(8.2, 4, 11, 0, 4.2, 0, '#c9a050', Math.PI / 2);
    k.box(1.2, 2.6, 1.2, 3.6, 6, 0, '#8a7a6a');
    for (let i = 0; i < 3; i++) k.box(1.2, 1.2, 0.1, -3.2 + i * 3.2, 2.4, 3.52, '#3d4f5c');
    k.box(1.2, 2.2, 0.1, 0, 0, 3.55, '#3a5a3a');
  },
  finger(k) {
    k.cyl(0.08, 0.1, 3, 5, 0, 0, 0, '#f4f4f4');
    k.box(1.6, 0.35, 0.08, 0.7, 2.5, 0, '#f4f4f4', 0.2).box(1.6, 0.35, 0.08, -0.7, 2, 0, '#f4f4f4', -0.4);
  },
  castle(k) {
    k.cone(60, 40, 9, 0, -2, 0, '#5f9a45');
    const st = '#8e8c84', dk = '#6f6d66';
    k.box(9, 26, 9, 0, 34, 0, st).box(3, 6, 9, 3, 60, 0, dk).box(3, 3, 9, -3, 60, 0, dk);
    k.box(24, 8, 3, -14, 34, 8, st).box(3, 12, 3, -26, 34, 8, dk).box(18, 6, 3, 12, 34, -8, st).box(3, 9, 3, 21, 34, -8, dk);
  },
  heather(k, v) {
    const c = v ? ['#7a4a8a', '#9a5aa8', '#b77cc4'] : ['#a0662a', '#c27f34', '#7a4f22'];
    for (let i = 0; i < 5; i++) k.blob(0.55, (i - 2) * 0.6, 0.25, (i % 2) * 0.4, c[i % 3], 1.2, 0.5, 1.2, 70 + i);
  },
  pony(k, v) {
    const col = ['#6b4423', '#3a2a1e', '#9a8a7a'][v % 3], dk = shade(col, -0.3);
    for (const [x, z] of [[-0.25, -0.65], [0.25, -0.65], [-0.25, 0.65], [0.25, 0.65]]) k.box(0.16, 0.9, 0.16, x, 0, z, dk);
    k.box(0.7, 0.7, 1.7, 0, 0.9, 0, col).box(0.35, 0.8, 0.35, 0, 1.2, -0.95, col, 0, 0.8).box(0.32, 0.32, 0.6, 0, 0.95, -1.4, col, 0, 0.7);
    k.box(0.12, 0.7, 0.12, 0, 0.8, 0.9, dk, 0, -0.4);
  },
  logs(k) { for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) k.roll(0.32, 3.4, 7, -1.05 + i * 0.7 + r * 0.35, 0.32 + r * 0.56, 0, i % 2 ? '#7a5634' : '#8a6440'); },
  forestsign(k) { k.cyl(0.08, 0.08, 2.4, 5, 0, 0, 0, '#9aa0a6'); k.box(1.8, 1.3, 0.08, 0, 2.2, 0, '#d32f2f').box(1.6, 1.1, 0.1, 0, 2.3, 0, '#ffffff'); k.box(0.7, 0.5, 0.12, 0, 2.6, 0, '#4a3020'); },
  gorse(k) {
    k.blob(0.95, 0, 0.6, 0, '#2f4f26', 1.3, 0.75, 1.1, 13).blob(0.7, 0.7, 0.75, 0.3, '#3e6330', 1, 0.8, 1, 15);
    const r = rnd(17); for (let i = 0; i < 14; i++) k.box(0.15, 0.15, 0.15, (r() - 0.5) * 2.2, 0.6 + r() * 0.7, (r() - 0.5) * 1.6, i % 3 ? '#ffd31a' : '#ffe766');
  },
  rock(k, v) { const col = ['#8b8f93', '#e9e4d6', '#9a7d62'][v % 3]; k.blob(1.4, 0, 0.6, 0, col, 1.3, 0.75, 1, 81 + v).blob(0.9, 1.2, 0.4, 0.4, shade(col, -0.1), 1, 0.8, 1, 83 + v); },
  stack(k, v) {
    const w = [1, 1.3, 0.8][v % 3];
    k.cyl(5 * w, 7 * w, 26, 7, 0, -4, 0, '#f1ece0').cyl(4.6 * w, 5 * w, 1.2, 7, 0, 22, 0, '#6f9a45');
    k.cyl(9 * w, 9 * w, 0.3, 10, 0, -0.1, 0, '#ffffff');
  },
  lighthouse(k) {
    k.blob(7, 0, -1, 0, '#6b6056', 1.2, 0.7, 1.1, 91);
    k.cyl(1.7, 2.4, 18, 10, 0, 2, 0, '#f6f3ee');
    k.cyl(2.2, 2.25, 2.6, 10, 0, 8, 0, '#c62828').cyl(1.95, 2, 2.6, 10, 0, 14, 0, '#c62828');
    k.cyl(2.4, 2.4, 0.4, 10, 0, 20, 0, '#222').cyl(1.3, 1.3, 2.2, 8, 0, 20.4, 0, '#fff4b3', 0, 0, true).cone(1.6, 1.6, 8, 0, 22.6, 0, '#c62828');
  },
  arch(k) {
    const col = '#c9a77a', dk = '#a3835c';
    k.blob(16, -22, 6, 0, dk, 1, 1.6, 1.3, 101).blob(14, 22, 5, 0, col, 1, 1.5, 1.2, 103);
    k.box(46, 12, 16, 0, 26, 0, col).blob(10, 0, 37, 0, '#6f9a45', 2.4, 0.4, 0.9, 105);
    k.cyl(30, 30, 0.3, 12, 0, -0.1, 0, '#ffffff');
  },
  building(k, v) {
    const h = [24, 34, 16, 28][v % 4], r = rnd(91 + v);
    k.box(18, h, 12, 0, 0, 0, '#141a2c');
    for (let y = 2; y < h - 2; y += 3) for (let x = -7.5; x <= 7.5; x += 2.5) if (r() < 0.6) k.box(1.4, 1.5, 0.1, x, y, 6.05, r() < 0.8 ? '#ffd27a' : '#bfe0ff', 0, 0, 0, true);
    if (v % 2) k.box(10, 2.4, 0.2, 0, 0, 6.15, '#ffd98a', 0, 0, 0, true);
  },
  bollard(k) { k.cyl(0.16, 0.2, 0.9, 7, 0, 0, 0, '#1b1d22'); },
  buoy(k, v) { const col = v ? '#2e9e4a' : '#d32f2f'; k.cyl(0.4, 0.9, 1.6, 7, 0, -0.3, 0, col).cone(0.45, 0.9, 7, 0, 1.3, 0, col).box(0.25, 0.25, 0.25, 0, 2.2, 0, '#ffef9a', 0, 0, 0, true); },
  ferry(k) {
    k.side([-28, 0, 28, 0, 30, 4, -30, 4], 14, 0, -1, 0, '#e9eef2');
    k.box(16, 6, 10, 0, 3, 0, '#f4f6f8').box(10, 3, 8, 0, 9, 0, '#f4f6f8').cyl(1, 1, 4, 8, 0, 12, 0, '#2b4a7a');
    for (let i = 0; i < 6; i++) k.box(1.6, 1, 0.2, -6 + i * 2.4, 6, 5.05, '#ffd98a', 0, 0, 0, true);
  },
  needles(k) {
    const col = '#f3eee4';
    k.cyl(6, 9, 26, 6, -40, -4, 0, col).cyl(5, 8, 22, 6, -16, -4, 6, col).cyl(5, 7, 18, 6, 6, -4, 2, col);
    k.blob(8, 26, -1, 0, '#6b6056', 1.2, 0.6, 1, 111);
    k.cyl(1.3, 1.8, 12, 8, 26, 2, 0, '#f6f3ee').cyl(1.75, 1.8, 2, 8, 26, 7, 0, '#c62828').cyl(1, 1, 1.6, 8, 26, 14, 0, '#fff4b3', 0, 0, true).cone(1.2, 1.2, 8, 26, 15.6, 0, '#c62828');
    k.cyl(40, 40, 0.3, 12, -10, -0.1, 0, '#ffffff');
  },
  chev(k) { k.cyl(0.06, 0.06, 1.3, 5, 0, 0, 0, '#9aa0a6'); k.box(1.1, 0.9, 0.06, 0, 1.2, 0, '#111111'); },
  warn(k) { k.cyl(0.08, 0.08, 1.7, 5, -1.4, 0, 0, '#9aa0a6').cyl(0.08, 0.08, 1.7, 5, 1.4, 0, 0, '#9aa0a6'); k.box(3.6, 1.5, 0.08, 0, 1.6, 0, '#111111'); },
  gpost(k) { k.box(0.18, 1.1, 0.18, 0, 0, 0, '#f4f4f4').box(0.2, 0.18, 0.2, 0, 0.75, 0, '#d32f2f'); },
  wall(k) { k.box(0.6, 1.1, 4.2, 0, 0, 0, '#9d978a').box(0.7, 0.18, 4.2, 0, 1.05, 0, '#7d786d'); },
  fence(k) { k.box(0.14, 1.2, 0.14, 0, 0, 0, '#8a6a48').box(0.08, 0.1, 4.2, 0, 0.55, 0, '#8a6a48').box(0.08, 0.1, 4.2, 0, 1.05, 0, '#8a6a48'); },
  rail(k) { k.box(0.1, 1, 0.1, 0, 0, 0, '#2f7f86').box(0.07, 0.08, 4.2, 0, 0.55, 0, '#2f7f86').box(0.09, 0.09, 4.2, 0, 0.98, 0, '#2f7f86'); },
  quay(k) { k.box(0.8, 0.7, 4.2, 0, 0, 0, '#55585f'); }
};
export function shade(hex, f) { C.set(hex); const k = f < 0 ? 1 + f : 1; const add = f > 0 ? f : 0; return '#' + new THREE.Color(C.r * k + add * (1 - C.r), C.g * k + add * (1 - C.g), C.b * k + add * (1 - C.b)).getHexString(); }
const cache = new Map();
export function model(t, v) {   // {lit, glow} geometries, built once
  const key = t + '|' + (v || 0); let m = cache.get(key); if (m) return m;
  const f = MODELS[t]; if (!f) return null;
  const k = new Kit(); f(k, v || 0); m = k.build(); cache.set(key, m);
  return m;
}
export function has(t) { return !!MODELS[t]; }

// ---------------------------------------------------------------- cars: side-on shapes pushed out to their width
const CARCOL = ['#d62828', '#1d4ed8', '#f4f4f4', '#2b2d42', '#f2c14e', '#2a9d8f', '#8d99ae', '#e76f51'];
function wheelsOn(k, xs, zs, r, w) { for (const x of xs) for (const z of zs) { k.axle(r, w, 10, x, r, z, '#151515'); k.axle(r * 0.55, w + 0.02, 8, x, r, z, '#9aa0a6'); } }
function lights(k, w, y, z, h, col) { k.box(0.42, h || 0.16, 0.06, -w / 2 + 0.3, y, z, col || '#ff2a2a', 0, 0, 0, true).box(0.42, h || 0.16, 0.06, w / 2 - 0.3, y, z, col || '#ff2a2a', 0, 0, 0, true); }
const TRAFFIC = {
  hatch(k, col) { k.side([-1.9, 0.3, 1.9, 0.3, 1.95, 0.85, 1.5, 1.05, 1.1, 1.45, -0.6, 1.55, -1.4, 1.05, -1.9, 0.95], 1.7, 0, 0, 0, col); k.side([-0.55, 1.07, 1.05, 1.07, 1.3, 1.42, -0.5, 1.5], 1.5, 0, 0.02, 0, '#2a3440'); wheelsOn(k, [-0.78, 0.78], [-1.25, 1.25], 0.32, 0.22); lights(k, 1.7, 0.75, 1.96); },
  saloon(k, col) { k.side([-2.2, 0.3, 2.2, 0.3, 2.25, 0.85, 1.6, 0.95, 1.1, 1.4, -0.7, 1.42, -1.4, 0.95, -2.2, 0.85], 1.8, 0, 0, 0, col); k.side([-0.65, 0.97, 1.05, 0.97, 1.2, 1.36, -0.6, 1.38], 1.6, 0, 0.02, 0, '#2a3440'); wheelsOn(k, [-0.82, 0.82], [-1.45, 1.45], 0.33, 0.22); lights(k, 1.8, 0.72, 2.26); },
  sports(k, col) { k.side([-2.1, 0.25, 2.1, 0.25, 2.15, 0.75, 0.9, 0.95, 0.3, 1.2, -0.6, 1.2, -1.2, 0.85, -2.1, 0.6], 1.85, 0, 0, 0, col); k.side([-0.55, 0.88, 0.35, 0.95, 0.25, 1.15, -0.5, 1.15], 1.6, 0, 0.02, 0, '#2a3440'); k.box(1.7, 0.06, 0.4, 0, 1.0, 1.9, '#1a1a1a'); wheelsOn(k, [-0.84, 0.84], [-1.35, 1.35], 0.33, 0.25); lights(k, 1.85, 0.6, 2.16); },
  van(k, col) { k.side([-2.5, 0.35, 2.5, 0.35, 2.5, 2.3, -1.2, 2.3, -1.9, 1.3, -2.5, 1.1], 1.95, 0, 0, 0, col); k.side([-1.85, 1.35, -1.2, 1.35, -1.2, 2.05, -1.6, 2.05], 1.8, 0, 0.02, 0, '#2a3440'); wheelsOn(k, [-0.88, 0.88], [-1.6, 1.6], 0.36, 0.24); lights(k, 1.95, 1.2, 2.51, 0.4); },
  bus(k, col) {   // an open-top seaside bus
    const b = col === '#d62828' ? '#d62828' : '#f2c14e';
    k.side([-5.4, 0.4, 5.4, 0.4, 5.4, 3.4, -5.4, 3.4], 2.4, 0, 0, 0, b); k.box(2.42, 0.25, 10.8, 0, 1.9, 0, '#ffffff');
    k.side([-5.2, 2.2, 5.2, 2.2, 5.2, 3.1, -5.2, 3.1], 2.42, 0, 0.0, 0, '#2a3440');
    k.side([-5.4, 3.4, 5.4, 3.4, 5.4, 4.1, -5.4, 4.1], 2.42, 0, 0, 0, b);
    for (let i = 0; i < 6; i++) k.blob(0.25, (i % 2 ? 0.6 : -0.6), 4.5, -3.5 + i * 1.4, ['#f1c27d', '#8d5524', '#ffdbac', '#c68642', '#e0ac69', '#f1c27d'][i], 1, 1.1, 1, 120 + i);
    wheelsOn(k, [-1.05, 1.05], [-3.8, 3.6], 0.5, 0.3); lights(k, 2.4, 0.9, 5.42, 0.4);
  },
  camper(k, col) {
    k.side([-2.7, 0.35, 2.7, 0.35, 2.7, 2.5, -1.4, 2.5, -2.2, 1.4, -2.7, 1.2], 2, 0, 0, 0, '#f4f1ea');
    k.side([-2.7, 0.35, 2.7, 0.35, 2.7, 1.25, -2.7, 1.25], 2.02, 0, 0, 0, col);
    k.side([-2.15, 1.45, -1.45, 1.45, -1.45, 2.25, -1.8, 2.25], 1.85, 0, 0.02, 0, '#2a3440');
    k.box(1.6, 0.25, 3.4, 0, 2.5, 0.6, '#e8e2d4'); wheelsOn(k, [-0.9, 0.9], [-1.7, 1.7], 0.36, 0.24); lights(k, 2, 0.9, 2.71, 0.3);
  },
  tractor(k, col) {
    const g = col === '#2a9d8f' ? '#2e8b3a' : '#c62828';
    k.box(1.3, 1.1, 2.6, 0, 0.7, -0.6, g); k.box(1.6, 1.7, 1.4, 0, 1.4, 0.7, '#2a2a2a'); k.box(1.4, 1.4, 1.2, 0, 1.6, 0.7, '#8fb3c9');
    k.box(1.8, 0.15, 1.6, 0, 3.1, 0.7, g);
    for (const x of [-1, 1]) { k.axle(0.85, 0.5, 12, x * 0.95, 0.85, 1.1, '#1a1a1a'); k.axle(0.5, 0.4, 10, x * 0.8, 0.5, -1.4, '#1a1a1a'); }
    k.box(0.2, 0.2, 0.06, -0.6, 1.2, 1.45, '#ff8c00', 0, 0, 0, true).box(0.2, 0.2, 0.06, 0.6, 1.2, 1.45, '#ff8c00', 0, 0, 0, true);
  },
  lorry(k, col) {
    k.side([-6, 0.6, 3.6, 0.6, 3.6, 3.9, -6, 3.9], 2.5, 0, 0, 0, col); k.side([3.8, 0.5, 6.1, 0.5, 6.1, 2.6, 5.4, 3.3, 3.8, 3.3], 2.4, 0, 0, 0, '#3a3a3a');
    k.box(2.52, 0.3, 9.6, 0, 0.5, -1.2, '#3a3a3a'); wheelsOn(k, [-1.05, 1.05], [-4.6, -3.4, 4.8], 0.5, 0.35); lights(k, 2.5, 0.9, 6.12, 0.3);
  }
};
// the traffic face -Z but are seen from behind: their back is +Z
export const TRAFFIC_ORDER = ['hatch', 'saloon', 'van', 'bus', 'camper', 'tractor', 'lorry', 'sports'];
const TCOL = { hatch: [0, 1, 2, 4, 5, 6], saloon: [0, 1, 2, 3, 6, 7], van: [2, 2, 2, 6, 1], bus: [0, 4], camper: [5, 4, 1, 7], tractor: [5, 0], lorry: [2, 1, 3], sports: [0, 4, 7, 1] };
export function trafficModel(t, colIdx) {
  const id = TRAFFIC_ORDER[t], cols = TCOL[id], col = CARCOL[cols[colIdx % cols.length]], key = 'veh|' + id + '|' + col;
  let m = cache.get(key); if (m) return m;
  const k = new Kit(); TRAFFIC[id](k, col);
  // the traffic is built nose -Z with its back at +Z (where the lights are)
  m = k.build(); cache.set(key, m);
  return m;
}

// ---------------------------------------------------------------- the player's cars: body, and four wheels apart (they turn)
export function playerCar(id) {
  const k = new Kit();
  if (id === 'gt') {
    const b = '#b9c4d0', d = '#6c7a89';
    k.side([-2.25, 0.28, 2.3, 0.28, 2.35, 0.7, 1.95, 0.85, 0.9, 0.95, 0.25, 1.22, -0.7, 1.22, -1.35, 0.85, -2.25, 0.62], 1.92, 0, 0, 0, b);
    k.side([-0.65, 0.88, 0.3, 0.95, 0.2, 1.18, -0.6, 1.18], 1.66, 0, 0.02, 0, '#1d2834');
    k.side([-2.3, 0.28, 2.35, 0.28, 2.36, 0.5, -2.3, 0.5], 1.94, 0, 0, 0, d);
    k.box(1.9, 0.07, 0.45, 0, 1.05, 2.05, '#20262d').box(0.08, 0.25, 0.1, -0.6, 0.82, 2.05, '#20262d').box(0.08, 0.25, 0.1, 0.6, 0.82, 2.05, '#20262d');
  } else if (id === 'hatch') {
    const b = '#ffc21a', d = '#c58a00';
    k.side([-1.95, 0.3, 1.95, 0.3, 2.0, 0.85, 1.75, 1.05, 1.45, 1.52, -0.55, 1.6, -1.35, 1.05, -1.95, 0.95], 1.8, 0, 0, 0, b);
    k.side([-0.5, 1.08, 1.4, 1.08, 1.4, 1.48, -0.45, 1.55], 1.62, 0, 0.02, 0, '#1d2834');
    k.side([-1.98, 0.3, 2.0, 0.3, 2.0, 0.55, -1.98, 0.55], 1.82, 0, 0, 0, d);
    k.box(1.6, 0.06, 0.35, 0, 1.6, 1.25, d);
  } else {   // the roadster: open top, two people aboard
    const b = '#d7191f', d = '#8f0d12';
    k.side([-2.15, 0.28, 2.15, 0.28, 2.2, 0.72, 1.6, 0.9, 0.2, 0.92, -0.45, 1.2, -0.7, 0.9, -1.5, 0.84, -2.15, 0.66], 1.86, 0, 0, 0, b);
    k.side([-2.18, 0.28, 2.2, 0.28, 2.22, 0.5, -2.18, 0.5], 1.88, 0, 0, 0, d);
    k.box(1.5, 0.12, 1.5, 0, 0.82, 0.35, '#1b1b1b');
    k.side([-0.5, 0.92, -0.42, 0.92, -0.55, 1.25, -0.62, 1.25], 1.5, 0, 0, 0, '#cfe8ff');
    for (const [x, hair, skin] of [[-0.42, '#2b1d14', '#e0b088'], [0.42, '#5a3a22', '#c98d5a']]) { k.box(0.42, 0.45, 0.4, x, 0.9, 0.4, '#2d4a7a'); k.blob(0.2, x, 1.48, 0.38, skin, 1, 1.1, 1, 3); k.blob(0.22, x, 1.55, 0.45, hair, 1, 0.9, 1.05, 5); }
    k.box(1.5, 0.08, 0.2, 0, 0.98, 0.9, d);
  }
  // lights: tail lights at the back (+Z), headlights at the front (-Z)
  const w = id === 'gt' ? 1.92 : id === 'hatch' ? 1.8 : 1.86, len = id === 'gt' ? 2.3 : id === 'hatch' ? 1.97 : 2.17;
  k.box(0.5, 0.14, 0.06, -w / 2 + 0.34, 0.7, len + 0.02, '#ff2a2a', 0, 0, 0, true).box(0.5, 0.14, 0.06, w / 2 - 0.34, 0.7, len + 0.02, '#ff2a2a', 0, 0, 0, true);
  k.box(0.36, 0.12, 0.06, -w / 2 + 0.3, 0.62, -len - 0.04, '#fff6d8', 0, 0, 0, true).box(0.36, 0.12, 0.06, w / 2 - 0.3, 0.62, -len - 0.04, '#fff6d8', 0, 0, 0, true);
  k.box(0.6, 0.14, 0.04, 0, 0.42, len + 0.02, '#f7d417');
  const body = k.build();
  const wk = new Kit(); wk.axle(0.34, 0.26, 12, 0, 0, 0, '#141414'); wk.axle(0.2, 0.28, 8, 0, 0, 0, '#c0c4c8');
  for (let i = 0; i < 4; i++) wk.put(new THREE.BoxGeometry(0.29, 0.05, 0.05), '#5a5e62', 0.15, 0, 0, i * Math.PI / 4, 0, 0);   // spokes, so you can see it turn
  const wheel = wk.build();
  return { body: body, wheel: wheel.lit, wheels: [[-w / 2 + 0.05, 0.34, -len * 0.62], [w / 2 - 0.05, 0.34, -len * 0.62], [-w / 2 + 0.05, 0.34, len * 0.62], [w / 2 - 0.05, 0.34, len * 0.62]], len: len, width: w };
}
