/* 365 Eclipse - the 3D models (5 Oct 2026). Every craft, vehicle, ship and boss is built here from simple solids (boxes,
 * cylinders, cones, spheres and extruded outlines) merged into one coloured mesh each, so a whole fighter draws in one
 * go. All our own designs. Units are the game's pixels; a model's nose points along -Z (up the screen). Parts that move
 * (turrets, rotors, boss guns) are separate children, named so the picture can turn them or knock them out. */
import * as THREE from '../common/vendor/three-r185/three.module.min.js';

const SIN = 0.85, COS = 0.527;   // the camera's tilt (world3d.js): a height h shows h * COS higher up the screen
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

// ---------------------------------------------------------------- a kit for building one model out of solids
function merge(list) {
  let n = 0; list.forEach((g) => { n += g.attributes.position.count; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  list.forEach((g) => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
export function kit() {
  const solid = [], glow = [];
  function add(geo, col, x, y, z, rx, ry, rz, sx, sy, sz, into) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (geo !== g) geo.dispose();
    ['uv', 'uv1', 'uv2'].forEach((k) => { if (g.attributes[k]) g.deleteAttribute(k); });
    if (!g.attributes.normal) g.computeVertexNormals();
    _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _p.set(x || 0, y || 0, z || 0); _s.set(sx || 1, sy || 1, sz || 1);
    _m.compose(_p, _q, _s); g.applyMatrix4(_m);
    _c.set(col);
    const k = g.attributes.position.count, c = new Float32Array(k * 3);
    for (let i = 0; i < k; i++) { c[i * 3] = _c.r; c[i * 3 + 1] = _c.g; c[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    (into || solid).push(g);
  }
  const K = {
    box(w, h, d, col, x, y, z, rx, ry, rz) { add(new THREE.BoxGeometry(w, h, d), col, x, y, z, rx, ry, rz); return K; },
    cyl(rt, rb, h, col, x, y, z, rx, ry, rz, seg) { add(new THREE.CylinderGeometry(rt, rb, h, seg || 12), col, x, y, z, rx, ry, rz); return K; },
    // a cylinder lying along Z (a fuselage, a barrel): from z0 to z1
    tube(r0, r1, z0, z1, col, x, y, seg) { add(new THREE.CylinderGeometry(r1, r0, Math.abs(z1 - z0), seg || 12), col, x || 0, y || 0, (z0 + z1) / 2, Math.PI / 2 * (z1 > z0 ? 1 : -1)); return K; },
    cone(r, h, col, x, y, z, rx, ry, rz, seg) { add(new THREE.ConeGeometry(r, h, seg || 12), col, x, y, z, rx, ry, rz); return K; },
    ball(r, col, x, y, z, sx, sy, sz, seg) { add(new THREE.SphereGeometry(r, seg || 14, Math.max(6, (seg || 14) >> 1)), col, x, y, z, 0, 0, 0, sx, sy, sz); return K; },
    // a flat outline (points [x, forward]) given thickness t, lying level: wings, hulls, fins (vertical: up = true)
    plate(pts, t, col, x, y, z, up, ry) {
      const sh = new THREE.Shape(); pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
      const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
      g.translate(0, 0, -t / 2);
      // level: the outline's second number runs back along +Z; upright (a fin): its first number runs back, its second up
      if (up) add(g, col, x, y, z, 0, (ry || 0) - Math.PI / 2, 0); else add(g, col, x, y, z, Math.PI / 2, ry || 0, 0);
      return K;
    },
    // a hull: an outline extruded upward by h (ships, tanks, walls)
    hull(pts, h, col, x, y, z, bevel) {
      const sh = new THREE.Shape(); pts.forEach((p, i) => (i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1])));
      const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: !!bevel, bevelSize: bevel || 0, bevelThickness: bevel || 0, bevelSegments: 1 });
      add(g, col, x, (y || 0), z, -Math.PI / 2, 0, 0);
      return K;
    },
    torus(r, tube, col, x, y, z, rx, ry, rz, seg) { add(new THREE.TorusGeometry(r, tube, 8, seg || 32), col, x, y, z, rx, ry, rz); return K; },
    // lights and flames: drawn bright, never shaded
    lamp(geo, col, x, y, z, rx, ry, rz, sx, sy, sz) { add(geo, col, x, y, z, rx, ry, rz, sx, sy, sz, glow); return K; },
    light(r, col, x, y, z) { add(new THREE.SphereGeometry(r, 8, 6), col, x, y, z, 0, 0, 0, 1, 1, 1, glow); return K; },
    build(mat, glowMat) {
      const grp = new THREE.Group();
      if (solid.length) { const m = new THREE.Mesh(merge(solid), mat); m.castShadow = true; m.receiveShadow = true; grp.add(m); }
      if (glow.length) { const gm = new THREE.Mesh(merge(glow), glowMat); grp.add(gm); }
      return grp;
    }
  };
  return K;
}

// ---------------------------------------------------------------- materials (made once)
let MAT = null;
export function materials() {
  if (MAT) return MAT;
  MAT = {
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.38 }),
    paint: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.25, roughness: 0.55 }),
    matte: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.05, roughness: 0.85 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0b1a2e, metalness: 0.9, roughness: 0.08, envMapIntensity: 1.6 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    wreck: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.2, roughness: 0.9 })
  };
  return MAT;
}
function canopy(g, x, y, z, sx, sz) { const c = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), materials().glass); c.scale.set(sx, sx * 0.75, sz); c.position.set(x, y, z); c.castShadow = true; g.add(c); return c; }
function child(g, name, k, mat, x, y, z) { const c = k.build(mat || materials().metal, materials().glow); c.name = name; c.position.set(x || 0, y || 0, z || 0); g.add(c); return c; }

// ---------------------------------------------------------------- the player's fighters (and the wingmen)
const LIVERY = {
  swift: { a: '#e9eef4', b: '#9aa7b6', c: '#1f6fd6', d: '#2a3340', flame: '#7fd8ff' },
  striker: { a: '#8a97a8', b: '#5d6878', c: '#d8342c', d: '#2a3038', flame: '#ffb14a' },
  titan: { a: '#66704f', b: '#4a5238', c: '#f2c230', d: '#2c3026', flame: '#ffb14a' },
  wraith: { a: '#2a2c34', b: '#16171c', c: '#ff7a1a', d: '#3a3d48', flame: '#ff6ad8' }
};
export function fighter(id) {
  const L = LIVERY[id] || LIVERY.striker, K = kit(), M = materials();
  if (id === 'swift') {   // a slim delta with canards
    K.tube(2.1, 1.2, 9, -9, L.a).cone(1.2, 5, L.a, 0, 0, -11.5, -Math.PI / 2).tube(2.2, 2.2, 9, 12, L.d)
      .plate([[0, 6], [10, 8], [10, 10], [2.5, 10]], 0.7, L.a, 0, -0.3, 0).plate([[0, 6], [-10, 8], [-10, 10], [-2.5, 10]], 0.7, L.a, 0, -0.3, 0)
      .plate([[0, -6], [8.5, 7], [2, 7]], 0.6, L.b, 0, -0.2, 0).plate([[0, -6], [-8.5, 7], [-2, 7]], 0.6, L.b, 0, -0.2, 0)
      .plate([[2, -6], [4.5, -4], [2, -3.5]], 0.4, L.a, 0, 0, 0).plate([[-2, -6], [-4.5, -4], [-2, -3.5]], 0.4, L.a, 0, 0, 0)
      .plate([[3, 0], [9, 0], [10, 3], [6, 3]], 0.5, L.a, 0, 1.4, 6, true)
      .box(0.6, 0.15, 12, L.c, 0, 2.05, 0).box(14, 0.12, 0.8, L.c, 0, 0.15, 8.5)
      .lamp(new THREE.CylinderGeometry(1.6, 0.6, 4, 10), L.flame, 0, 0, 14, -Math.PI / 2);
  } else if (id === 'titan') {   // a heavy straight-winged attacker with two engines on its back
    K.box(4.4, 3.2, 20, L.a, 0, 0, 1).cone(2.2, 5, L.a, 0, 0, -11.5, -Math.PI / 2, 0, 0, 8)
      .plate([[2, -3], [14, -2], [14, 2.5], [2, 3]], 1, L.a, 0, 0, 0).plate([[-2, -3], [-14, -2], [-14, 2.5], [-2, 3]], 1, L.a, 0, 0, 0)
      .tube(2, 2, 3, 11, L.b, -4.2, 2.6).tube(2, 2, 3, 11, L.b, 4.2, 2.6)
      .plate([[3, 8], [8, 9], [8, 11], [3, 11]], 0.8, L.a, 0, 0.5, 0).plate([[-3, 8], [-8, 9], [-8, 11], [-3, 11]], 0.8, L.a, 0, 0.5, 0)
      .plate([[0, 0], [4, 0], [5, 3.5], [1.5, 3.5]], 0.6, L.a, 7.6, 1, 8.6, true).plate([[0, 0], [4, 0], [5, 3.5], [1.5, 3.5]], 0.6, L.a, -7.6, 1, 8.6, true)
      .box(28.5, 0.15, 1, L.c, 0, 0.55, 1.6).box(1, 0.2, 6, L.c, 0, 1.7, -7)
      .cyl(0.7, 0.7, 2, L.d, 9, -1.2, -1).cyl(0.7, 0.7, 2, L.d, -9, -1.2, -1).cyl(0.7, 0.7, 2, L.d, 11.5, -1.2, -0.8).cyl(0.7, 0.7, 2, L.d, -11.5, -1.2, -0.8)
      .lamp(new THREE.CylinderGeometry(1.5, 0.5, 4, 10), L.flame, -4.2, 2.6, 13, -Math.PI / 2).lamp(new THREE.CylinderGeometry(1.5, 0.5, 4, 10), L.flame, 4.2, 2.6, 13, -Math.PI / 2);
  } else if (id === 'wraith') {   // forward-swept wings, canards, a long spine
    K.tube(2.2, 1.6, 10, -8, L.a).cone(1.6, 6, L.a, 0, 0, -11, -Math.PI / 2).box(5.5, 2.2, 9, L.b, 0, -0.2, 5)
      .plate([[2.5, 4], [12, -2], [12.5, 0.5], [3, 9]], 0.8, L.a, 0, -0.2, 0).plate([[-2.5, 4], [-12, -2], [-12.5, 0.5], [-3, 9]], 0.8, L.a, 0, -0.2, 0)
      .plate([[2, -5], [6, -4], [6, -2.5], [2, -2]], 0.5, L.a, 0, 0.2, 0).plate([[-2, -5], [-6, -4], [-6, -2.5], [-2, -2]], 0.5, L.a, 0, 0.2, 0)
      .plate([[2, 8], [6.5, 10], [6.5, 11.5], [2, 11]], 0.5, L.a, 0, 0, 0).plate([[-2, 8], [-6.5, 10], [-6.5, 11.5], [-2, 11]], 0.5, L.a, 0, 0, 0)
      .plate([[0, 0], [4, 0], [5.5, 4], [2, 4]], 0.5, L.a, 2.4, 1.1, 6.5, true, 0.25).plate([[0, 0], [4, 0], [5.5, 4], [2, 4]], 0.5, L.a, -2.4, 1.1, 6.5, true, -0.25)
      .box(0.5, 0.15, 14, L.c, 2.5, 0.9, 3).box(0.5, 0.15, 14, L.c, -2.5, 0.9, 3).plate([[11.4, -1.6], [12.3, 0.2], [10.5, 0.8]], 0.9, L.c, 0, 0, 0).plate([[-11.4, -1.6], [-12.3, 0.2], [-10.5, 0.8]], 0.9, L.c, 0, 0, 0)
      .lamp(new THREE.CylinderGeometry(1.4, 0.5, 4, 10), L.flame, -1.6, -0.2, 11.5, -Math.PI / 2).lamp(new THREE.CylinderGeometry(1.4, 0.5, 4, 10), L.flame, 1.6, -0.2, 11.5, -Math.PI / 2);
  } else {   // striker: twin tails, broad swept wings, two engines
    K.box(5, 2.6, 16, L.a, 0, 0, 2).tube(1.9, 1.3, -6, -10, L.a).cone(1.3, 4, L.a, 0, 0, -12, -Math.PI / 2)
      .plate([[2.5, -1], [12, 5], [12, 7.5], [2.5, 7]], 0.8, L.a, 0, 0, 0).plate([[-2.5, -1], [-12, 5], [-12, 7.5], [-2.5, 7]], 0.8, L.a, 0, 0, 0)
      .plate([[2.5, 8.5], [7, 11], [7, 12.5], [2.5, 12]], 0.6, L.b, 0, 0, 0).plate([[-2.5, 8.5], [-7, 11], [-7, 12.5], [-2.5, 12]], 0.6, L.b, 0, 0, 0)
      .plate([[0, 0], [4, 0], [5.5, 4.5], [2, 4.5]], 0.5, L.b, 2.4, 1.2, 7, true, 0.12).plate([[0, 0], [4, 0], [5.5, 4.5], [2, 4.5]], 0.5, L.b, -2.4, 1.2, 7, true, -0.12)
      .box(0.5, 0.15, 13, L.c, 0, 1.35, 2).plate([[10.5, 4.2], [12, 5.2], [12, 7.5], [10.5, 7.3]], 0.9, L.c, 0, 0, 0).plate([[-10.5, 4.2], [-12, 5.2], [-12, 7.5], [-10.5, 7.3]], 0.9, L.c, 0, 0, 0)
      .tube(1.5, 1.4, 9, 11.5, L.d, -1.5, -0.2).tube(1.5, 1.4, 9, 11.5, L.d, 1.5, -0.2)
      .lamp(new THREE.CylinderGeometry(1.4, 0.5, 4, 10), L.flame, -1.5, -0.2, 13, -Math.PI / 2).lamp(new THREE.CylinderGeometry(1.4, 0.5, 4, 10), L.flame, 1.5, -0.2, 13, -Math.PI / 2);
  }
  const g = K.build(id === 'wraith' ? M.metal : M.paint, M.glow);
  canopy(g, 0, 1.6, id === 'titan' ? -6 : -4.5, 1.6, 3.2);
  g.scale.setScalar(1.22);   // a size bigger than the enemy fighters, so you can always find yourself
  return g;
}
export function wingman(id) {
  const L = LIVERY[id] || LIVERY.striker, K = kit();
  K.tube(1.4, 0.9, 6, -5, L.a).cone(0.9, 3, L.a, 0, 0, -6.5, -Math.PI / 2)
    .plate([[1, -1], [7, 4], [7, 5], [1, 5]], 0.5, L.b, 0, 0, 0).plate([[-1, -1], [-7, 4], [-7, 5], [-1, 5]], 0.5, L.b, 0, 0, 0)
    .box(10, 0.1, 0.6, L.c, 0, 0.3, 4).plate([[0, 0], [2.4, 0], [3, 2.6], [1, 2.6]], 0.3, L.a, 0, 0.8, 3, true)
    .lamp(new THREE.CylinderGeometry(1, 0.3, 3, 8), L.flame, 0, 0, 7.5, -Math.PI / 2);
  return K.build(materials().paint, materials().glow);
}

// ---------------------------------------------------------------- the enemy air force
const FOE = { body: '#9aa48a', dark: '#5e6852', belly: '#c0c6b4', red: '#e0262a', glass: '#141a22', grey: '#7d848c' };   // light enough to stand out on the sea and the city
function enemyJet(scale, livery) {
  const K = kit(), c = livery || FOE;
  K.tube(1.8, 1.1, 8, -7, c.body).cone(1.1, 4, c.body, 0, 0, -9, -Math.PI / 2).box(4, 2, 8, c.dark, 0, -0.2, 4)
    .plate([[1.5, -2], [9, 4], [9, 6], [1.5, 6]], 0.6, c.body, 0, 0, 0).plate([[-1.5, -2], [-9, 4], [-9, 6], [-1.5, 6]], 0.6, c.body, 0, 0, 0)
    .plate([[1.5, 6.5], [5, 8.5], [5, 9.5], [1.5, 9.5]], 0.5, c.dark, 0, 0, 0).plate([[-1.5, 6.5], [-5, 8.5], [-5, 9.5], [-1.5, 9.5]], 0.5, c.dark, 0, 0, 0)
    .plate([[0, 0], [3, 0], [4.2, 3.6], [1.4, 3.6]], 0.4, c.body, 0, 0.9, 6, true)
    .box(1.3, 0.12, 1.3, c.red, 6.6, 0.35, 4.6).box(1.3, 0.12, 1.3, c.red, -6.6, 0.35, 4.6).box(0.9, 0.5, 2.6, c.glass, 0, 1.15, -3.5)
    .lamp(new THREE.CylinderGeometry(1.2, 0.4, 3, 8), '#ffb04a', 0, -0.2, 9.5, -Math.PI / 2);
  const g = K.build(materials().paint, materials().glow); g.scale.setScalar(scale || 1); return g;
}
function interceptor() {
  const K = kit();
  K.tube(1.5, 0.8, 7, -8, '#9aa2ac').cone(0.8, 4, '#9aa2ac', 0, 0, -10, -Math.PI / 2)
    .plate([[0.8, -4], [8, 6], [0.8, 6]], 0.5, '#7c848e', 0, 0, 0).plate([[-0.8, -4], [-8, 6], [-0.8, 6]], 0.5, '#7c848e', 0, 0, 0)
    .plate([[0, 0], [2.6, 0], [3.4, 3], [1, 3]], 0.3, '#9aa2ac', 0, 0.7, 4.5, true).box(7, 0.1, 0.5, FOE.red, 0, 0.3, 4.5)
    .lamp(new THREE.CylinderGeometry(1, 0.3, 3, 8), '#ff7a3a', 0, 0, 8.5, -Math.PI / 2);
  return K.build(materials().metal, materials().glow);
}
function helicopter(scale, livery) {
  const c = livery || { body: '#4f5a44', dark: '#2f3529', glass: '#18222c' }, K = kit();
  K.ball(4, c.body, 0, 0, -1, 1, 0.85, 1.6).tube(1.4, 0.6, 3, 14, c.body, 0, 0.8).box(0.5, 4, 3, c.dark, 0, 2.2, 13.5)
    .box(7, 0.4, 1.2, c.dark, 0, 0.5, 12.5).box(9, 0.6, 1.2, c.dark, 0, -1, 0.5).cyl(0.7, 0.7, 2, c.dark, 4.6, -1.8, 0.5).cyl(0.7, 0.7, 2, c.dark, -4.6, -1.8, 0.5)
    .box(1.2, 1, 3, c.dark, 0, 3.4, -0.5).ball(2.2, c.glass, 0, 0.8, -5, 1, 0.8, 1).box(0.6, 0.3, 4, '#c8262a', 0, -2.4, -4);
  const g = K.build(materials().paint, materials().glow);
  // the rotor: a blurred disc and two blades (turned by the picture)
  const rot = new THREE.Group(); rot.name = 'rotor'; rot.position.set(0, 4.2, -0.5);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(11, 24), new THREE.MeshBasicMaterial({ color: 0x9aa0a6, transparent: true, opacity: 0.18, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; rot.add(disc);
  const bk = kit(); bk.box(22, 0.25, 1.1, '#202326', 0, 0, 0).box(1.1, 0.25, 22, '#202326', 0, 0, 0);
  rot.add(bk.build(materials().matte, materials().glow)); g.add(rot);
  const tr = new THREE.Group(); tr.name = 'rotor2'; tr.position.set(0.6, 2.2, 13.5);
  const tk = kit(); tk.box(0.2, 5, 0.6, '#202326', 0, 0, 0); tr.add(tk.build(materials().matte, materials().glow)); g.add(tr);
  g.scale.setScalar(scale || 1);
  return g;
}
function bomber() {
  const K = kit(), c = { a: '#7b8288', b: '#5a6066', d: '#3a3e42' };
  K.tube(3.6, 2.6, 22, -20, c.a).cone(2.6, 6, c.a, 0, 0, -23, -Math.PI / 2)
    .plate([[3, -6], [27, 10], [27, 14], [3, 8]], 1.1, c.a, 0, 0, 0).plate([[-3, -6], [-27, 10], [-27, 14], [-3, 8]], 1.1, c.a, 0, 0, 0)
    .plate([[2, 16], [10, 21], [10, 23], [2, 22]], 0.8, c.b, 0, 0, 0).plate([[-2, 16], [-10, 21], [-10, 23], [-2, 22]], 0.8, c.b, 0, 0, 0)
    .plate([[0, 0], [6, 0], [8, 6], [2.5, 6]], 0.6, c.a, 0, 2.4, 15, true);
  [-18, -10, 10, 18].forEach((x) => K.tube(1.5, 1.4, -2 + Math.abs(x) * 0.55, 6 + Math.abs(x) * 0.55, c.d, x, -1.8).lamp(new THREE.CylinderGeometry(1.2, 0.4, 3, 8), '#ffb04a', x, -1.8, 7.6 + Math.abs(x) * 0.55, -Math.PI / 2));
  K.box(2, 0.12, 2, FOE.red, 20, 0.6, 8).box(2, 0.12, 2, FOE.red, -20, 0.6, 8).box(1.6, 0.8, 3, FOE.glass, 0, 2.6, -16);
  return K.build(materials().paint, materials().glow);
}
function transport() {   // the item carrier: a big four-prop transport
  const K = kit(), c = { a: '#b5b9ad', b: '#8d9187', d: '#55584f' };
  K.tube(3.4, 3, 12, -12, c.a).ball(3.2, c.a, 0, 0, -12, 1, 1, 1.4).tube(3, 1.2, 12, 20, c.a, 0, 0.6)
    .plate([[2, -3], [22, -2], [22, 1.5], [2, 2]], 1, c.a, 0, 2.6, 0).plate([[-2, -3], [-22, -2], [-22, 1.5], [-2, 2]], 1, c.a, 0, 2.6, 0)
    .plate([[1, 16], [9, 17], [9, 20], [1, 20]], 0.6, c.b, 0, 1, 0).plate([[-1, 16], [-9, 17], [-9, 20], [-1, 20]], 0.6, c.b, 0, 1, 0)
    .plate([[0, 0], [5, 0], [7, 6], [2, 6]], 0.6, c.a, 0, 3, 14, true).box(36, 0.2, 1.4, '#e8c830', 0, 3.2, 0.6);
  [-14, -7, 7, 14].forEach((x) => K.tube(1.2, 1.1, -5, 2, c.d, x, 2.2));
  const g = K.build(materials().paint, materials().glow);
  [-14, -7, 7, 14].forEach((x) => { const d = new THREE.Mesh(new THREE.CircleGeometry(3.2, 16), new THREE.MeshBasicMaterial({ color: 0x55585a, transparent: true, opacity: 0.35, depthWrite: false })); d.position.set(x, 2.2, -5.3); d.name = 'prop'; g.add(d); });
  return g;
}
function gunship(scale, livery) {
  const c = livery || { a: '#4c5056', b: '#33363b', d: '#22252a' }, K = kit();
  K.box(9, 5, 30, c.a, 0, 0, 0).cone(4.5, 8, c.a, 0, 0, -19, -Math.PI / 2, Math.PI / 4, 0, 4)
    .plate([[4, -6], [24, 2], [24, 7], [4, 6]], 1.4, c.a, 0, 1.2, 0).plate([[-4, -6], [-24, 2], [-24, 7], [-4, 6]], 1.4, c.a, 0, 1.2, 0)
    .plate([[3, 12], [11, 16], [11, 18], [3, 18]], 0.9, c.b, 0, 0.5, 0).plate([[-3, 12], [-11, 16], [-11, 18], [-3, 18]], 0.9, c.b, 0, 0.5, 0);
  [-16, -8, 8, 16].forEach((x) => K.tube(1.8, 1.6, -3, 6, c.d, x, -1).lamp(new THREE.CylinderGeometry(1.4, 0.4, 3, 8), '#ffb04a', x, -1, 7.6, -Math.PI / 2));
  K.box(1.4, 1.2, 9, '#ffd84a', 0, 2.8, -4).box(2.2, 0.15, 2.2, FOE.red, 15, 2, 3).box(2.2, 0.15, 2.2, FOE.red, -15, 2, 3);
  const g = K.build(materials().metal, materials().glow);
  [[0, 3, -8], [0, -3, 6]].forEach((p, i) => { const t = kit(); t.ball(2.2, c.b, 0, 0, 0, 1, 0.6, 1).tube(0.5, 0.5, 0, 5, c.d, -0.7, 0.4).tube(0.5, 0.5, 0, 5, c.d, 0.7, 0.4); child(g, 'turret', t, null, p[0], p[1], p[2]); });
  g.scale.setScalar(scale || 1);
  return g;
}
function drone() {
  const K = kit();
  K.ball(3.4, '#4a4e5a', 0, 0, 0, 1, 0.7, 1).torus(4.2, 0.6, '#7a808e', 0, 0, 0, Math.PI / 2)
    .plate([[0, 2], [7, 6], [1, 4]], 0.4, '#3a3d46', 0, 0, 0).plate([[0, 2], [-7, 6], [-1, 4]], 0.4, '#3a3d46', 0, 0, 0)
    .light(1.3, '#ff3a5a', 0, 0.6, -2.6);
  return K.build(materials().metal, materials().glow);
}
function rocketModel() {
  const K = kit();
  K.tube(0.8, 0.8, -4, 4, '#d8d8d0').cone(0.8, 2, '#c8262a', 0, 0, -5, -Math.PI / 2)
    .plate([[0.8, 2.5], [2.4, 4.4], [0.8, 4.4]], 0.2, '#555', 0, 0, 0).plate([[-0.8, 2.5], [-2.4, 4.4], [-0.8, 4.4]], 0.2, '#555', 0, 0, 0)
    .lamp(new THREE.ConeGeometry(0.8, 4, 8), '#ffcf5a', 0, 0, 6, Math.PI / 2);
  return K.build(materials().paint, materials().glow);
}

// ---------------------------------------------------------------- on the ground and the sea
function tank(scale, livery) {
  const c = livery || { a: '#6e7350', b: '#4f5338', t: '#2c2e26' }, K = kit();
  K.box(9, 2.6, 13, c.a, 0, 1.6, 0).box(2.2, 2.4, 14, c.t, 4.6, 1.2, 0).box(2.2, 2.4, 14, c.t, -4.6, 1.2, 0)
    .box(8, 0.6, 3, c.b, 0, 3.1, 4.5);
  const g = K.build(materials().paint, materials().glow);
  const t = kit(); t.cyl(3.2, 3.6, 2.2, c.b, 0, 0, 0, 0, 0, 0, 10).box(3, 1.6, 2, c.a, 0, 0.2, 2).tube(0.55, 0.45, -1, -9, c.t, 0, 0.4).box(1.2, 0.8, 1.2, c.t, 1.6, 1.3, 0.5);
  child(g, 'turret', t, materials().paint, 0, 4, 0.5);
  g.scale.setScalar(scale || 1);
  return g;
}
function aaGun() {
  const K = kit();
  K.cyl(6, 6.6, 1.6, '#8c8e86', 0, 0.8, 0, 0, 0, 0, 8).box(13, 1, 1, '#ffd84a', 0, 1.7, 0).box(1, 1, 13, '#ffd84a', 0, 1.7, 0);
  const g = K.build(materials().matte, materials().glow);
  const t = kit(); t.box(4.4, 2.6, 4, '#5d6350', 0, 0, 0).tube(0.5, 0.45, -1, -8, '#2c2e26', 1.2, 0.8).tube(0.5, 0.45, -1, -8, '#2c2e26', -1.2, 0.8).box(1.2, 1.2, 1.2, '#2c2e26', 0, 1.8, 1);
  child(g, 'turret', t, materials().paint, 0, 3, 0);
  return g;
}
function samSite() {
  const K = kit();
  K.box(8, 2, 13, '#6e7350', 0, 1.6, 0).box(2, 2, 13, '#2c2e26', 4, 1, 0).box(2, 2, 13, '#2c2e26', -4, 1, 0).box(6, 3, 4, '#5d6248', 0, 3.4, -4);
  [-2, 0, 2].forEach((x) => K.tube(0.8, 0.8, -4, 6, '#d8d8d0', x, 5.2).cone(0.8, 1.6, '#c8262a', x, 5.2, -4.8, -Math.PI / 2));
  const g = K.build(materials().paint, materials().glow);
  g.children[0].rotation.x = 0; return g;
}
function truck(livery) {
  const K = kit(), c = livery || { a: '#6e7350', b: '#565a3c' };
  K.box(5, 3.6, 4, c.a, 0, 2.4, -4.5).box(5.4, 4.4, 9, c.b, 0, 2.8, 2.5).box(4.6, 1, 0.2, '#18222c', 0, 3.4, -6.6)
    .cyl(1.1, 1.1, 1, '#1f1f1f', 2.8, 1, -4.5, 0, 0, Math.PI / 2).cyl(1.1, 1.1, 1, '#1f1f1f', -2.8, 1, -4.5, 0, 0, Math.PI / 2)
    .cyl(1.1, 1.1, 1, '#1f1f1f', 2.8, 1, 4, 0, 0, Math.PI / 2).cyl(1.1, 1.1, 1, '#1f1f1f', -2.8, 1, 4, 0, 0, Math.PI / 2);
  return K.build(materials().paint, materials().glow);
}
function building(look) {
  const K = kit();
  if (look === 'hangar') {
    K.hull([[-15, -12], [15, -12], [15, 12], [-15, 12]], 1, '#7c7f7a').cyl(12, 12, 30, '#9aa098', 0, 1, 0, 0, 0, Math.PI / 2, 18)
      .box(21, 13, 0.6, '#565a55', 0, 6, 11.6).box(0.6, 12, 0.7, '#ffd84a', 0, 6, 11.9).box(31, 0.8, 1, '#c8262a', 0, 1.4, -12);
    const g = K.build(materials().matte, materials().glow);
    g.children[0].geometry.translate(0, -1, 0); return g;
  }
  if (look === 'parked') return parkedJet();
  if (look === 'city') {
    K.box(20, 14, 20, '#4a5060', 0, 7, 0).box(14, 3, 14, '#5a6070', 0, 15.5, 0).box(3, 3, 3, '#8a8f98', 5, 18, 5).cyl(0.4, 0.4, 10, '#c0c4cc', -5, 21, -5)
      .light(0.8, '#ff3a3a', -5, 26.2, -5);
    for (let i = 0; i < 4; i++) K.lamp(new THREE.BoxGeometry(18, 1, 0.3), '#ffd98a', 0, 3 + i * 3, 10.2);
    return K.build(materials().paint, materials().glow);
  }
  if (look === 'desert') { K.box(16, 7, 14, '#c9a878', 0, 3.5, 0).box(16.6, 0.8, 14.6, '#b08f60', 0, 7.2, 0).box(5, 3, 5, '#b89868', 3, 8.6, 2).box(4, 4, 0.4, '#3a2a1a', -4, 2, 7.1); return K.build(materials().matte, materials().glow); }
  if (look === 'arctic') { K.box(14, 5, 12, '#c8d0d8', 0, 2.5, 0).ball(5, '#e8eef4', 0, 5, 0, 1, 0.9, 1).cyl(0.4, 0.4, 8, '#888', 6, 6, 4).light(0.7, '#ff3a3a', 6, 10.2, 4); return K.build(materials().paint, materials().glow); }
  if (look === 'canyon') { K.cyl(4, 5, 16, '#8a7a66', 0, 8, 0, 0, 0, 0, 8).cyl(6, 5, 3, '#6e604e', 0, 17, 0, 0, 0, 0, 8).box(13, 1.2, 1.2, '#2a2a2a', 0, 19, 0); return K.build(materials().matte, materials().glow); }
  if (look === 'orbit') { K.cyl(5, 5, 16, '#c0c6d0', 0, 4, 0, 0, 0, Math.PI / 2, 14).ball(5, '#d0d6e0', 8, 4, 0).ball(5, '#d0d6e0', -8, 4, 0).box(26, 0.4, 7, '#2a4a8a', 0, 4, 0).light(0.8, '#7fd8ff', 0, 9.2, 0); return K.build(materials().metal, materials().glow); }
  // the harbour: a warehouse with a ridged roof and big doors
  K.box(22, 8, 16, '#a8907a', 0, 4, 0).hull([[-11.5, -8.5], [11.5, -8.5], [11.5, 8.5], [-11.5, 8.5]], 0.4, '#6e5e50', 0, 8, 0);
  K.plate([[-8.5, 0], [0, 4], [8.5, 0]], 23, '#7d6a58', 0, 8, 0, true);
  K.box(6, 6, 0.4, '#4a4038', -5, 3, 8.1).box(6, 6, 0.4, '#4a4038', 5, 3, 8.1);
  return K.build(materials().matte, materials().glow);
}
function parkedJet() {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshStandardMaterial({ color: 0x8a8678, roughness: 0.9 }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.2; pad.receiveShadow = true; g.add(pad);
  const j = enemyJet(1.3); j.position.y = 2.4; g.add(j);
  return g;
}
function bunker() {
  const K = kit();
  K.cyl(8, 10, 5, '#8e8a80', 0, 2.5, 0, 0, 0, 0, 10).ball(7, '#a09c92', 0, 4, 0, 1, 0.55, 1, 12).box(6, 1, 1, '#1a1a1a', 0, 6, -5.6);
  const g = K.build(materials().matte, materials().glow);
  const t = kit(); t.box(3.6, 1.6, 3.6, '#6a675f', 0, 0, 0).tube(0.5, 0.45, -1, -7, '#2a2a2a', 0, 0.2);
  child(g, 'turret', t, materials().matte, 0, 8, 0);
  return g;
}
// the white water behind a ship under way
let WAKE = null;
function wake(g, len, wid, z0) {
  if (!WAKE) WAKE = new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.4, depthWrite: false });
  const sh = new THREE.Shape(); sh.moveTo(-wid * 0.25, 0); sh.lineTo(wid * 0.25, 0); sh.lineTo(wid, len); sh.lineTo(wid * 0.55, len); sh.lineTo(0, len * 0.35); sh.lineTo(-wid * 0.55, len); sh.lineTo(-wid, len); sh.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), WAKE); m.rotation.x = Math.PI / 2; m.position.set(0, -0.6, z0); m.renderOrder = -1; g.add(m); return m;
}
function boat(livery) {
  const c = livery || { a: '#808890', b: '#5a6268', d: '#e8e8e0' }, K = kit();
  K.hull([[0, -15], [4.5, -7], [5, 8], [3.5, 12], [-3.5, 12], [-5, 8], [-4.5, -7]], 3, c.a, 0, -1, 0)
    .hull([[0, -14], [4, -7], [4.4, 8], [3, 11], [-3, 11], [-4.4, 8], [-4, -7]], 0.4, c.d, 0, 2, 0)
    .box(5, 3.4, 7, c.b, 0, 3.6, 2).box(4.6, 1, 0.3, '#18222c', 0, 4.6, -1.6).cyl(0.3, 0.3, 5, '#ccc', 0, 7, 3);
  const g = K.build(materials().paint, materials().glow);
  const t = kit(); t.cyl(1.8, 2, 1.4, c.b, 0, 0, 0).tube(0.4, 0.35, -1, -6, '#2a2a2a', 0, 0.3);
  child(g, 'turret', t, materials().paint, 0, 3, -8);
  wake(g, 34, 9, 11);
  return g;
}
function destroyer(scale, livery) {
  const c = livery || { a: '#7c848c', b: '#5c646c', d: '#d8d8d0', s: '#4a5258' }, K = kit();
  K.hull([[0, -36], [8, -22], [10, 0], [9, 24], [6, 34], [-6, 34], [-9, 24], [-10, 0], [-8, -22]], 4, c.a, 0, -1.5, 0)
    .hull([[0, -34], [7, -22], [9, 0], [8, 24], [5, 32], [-5, 32], [-8, 24], [-9, 0], [-7, -22]], 0.3, c.d, 0, 2.5, 0)
    .box(10, 5, 14, c.b, 0, 5, 2).box(7, 4, 7, c.s, 0, 9.5, 0).box(6.6, 1.2, 0.3, '#18222c', 0, 10.5, -3.6)
    .cyl(0.5, 0.5, 9, '#c8c8c0', 0, 15, 2).box(6, 0.4, 0.4, '#c8c8c0', 0, 18, 2).cyl(2, 2.4, 4, '#3a3e44', 0, 9, 10)
    .box(17, 0.3, 1.4, '#c8262a', 0, 2.9, -26);
  const g = K.build(materials().paint, materials().glow);
  [[-20, 'g0'], [22, 'g1']].forEach((p) => { const t = kit(); t.cyl(3, 3.4, 2.4, c.b, 0, 0, 0, 0, 0, 0, 10).box(4, 1.8, 3, c.b, 0, 0.3, -1.5).tube(0.55, 0.5, -2, -10, '#2a2a2a', -0.9, 0.4).tube(0.55, 0.5, -2, -10, '#2a2a2a', 0.9, 0.4); child(g, p[1], t, materials().paint, 0, 4, p[0]); });
  wake(g, 60, 16, 33);
  g.scale.setScalar(scale || 1);
  return g;
}
function submarine() {
  const K = kit();
  K.tube(4, 4, -22, 20, '#2c3036').ball(4, '#2c3036', 0, 0, -22, 1, 1, 1.6).cone(4, 8, '#2c3036', 0, 0, 24, Math.PI / 2)
    .hull([[-1.5, -6], [1.5, -6], [2, 4], [-2, 4]], 6, '#363b42', 0, 2.5, 2).box(9, 0.4, 2, '#363b42', 0, 6.5, 0).plate([[0, 0], [3, 0], [4, 4], [1, 4]], 0.4, '#363b42', 0, 0, 22, true)
    .box(9, 0.2, 1, '#c8262a', 0, 3.9, -12);
  return K.build(materials().metal, materials().glow);
}
function trainCar(loco) {
  const K = kit();
  if (loco) {
    K.box(9, 5, 22, '#2c4a7a', 0, 4, 0).box(8.6, 2.4, 6, '#203858', 0, 7.6, -6).box(8, 1, 0.3, '#18222c', 0, 7.8, -9.2).box(9.4, 0.6, 22.4, '#ffd84a', 0, 2, 0).box(10, 1.4, 24, '#1f1f1f', 0, 0.9, 0);
    const g = K.build(materials().paint, materials().glow);
    const t = kit(); t.cyl(2.4, 2.6, 1.6, '#203858', 0, 0, 0).tube(0.45, 0.4, -1, -7, '#1f1f1f', -0.6, 0.3).tube(0.45, 0.4, -1, -7, '#1f1f1f', 0.6, 0.3);
    child(g, 'turret', t, materials().paint, 0, 9, 4);
    g.rotation.order = 'YXZ'; return g;
  }
  K.box(9, 6, 22, '#7a5038', 0, 4.4, 0).box(9.4, 0.8, 22.4, '#5a3a28', 0, 7.6, 0).box(10, 1.4, 23, '#1f1f1f', 0, 0.9, 0);
  for (let i = -2; i <= 2; i++) K.box(9.6, 5, 0.4, '#5a3a28', 0, 4.4, i * 4.4);
  return K.build(materials().paint, materials().glow);
}
function stationPod() {
  const K = kit();
  K.cyl(8, 8, 2, '#6a707c', 0, 1, 0, 0, 0, 0, 6).box(18, 0.8, 2, '#3a3e48', 0, 2.4, 0).box(2, 0.8, 18, '#3a3e48', 0, 2.4, 0).light(0.6, '#7fd8ff', 7, 2.6, 0).light(0.6, '#7fd8ff', -7, 2.6, 0);
  const g = K.build(materials().metal, materials().glow);
  const t = kit(); t.ball(3, '#8a909c', 0, 0, 0, 1, 0.7, 1).tube(0.5, 0.45, -1, -7, '#2a2a2a', -0.8, 0.4).tube(0.5, 0.45, -1, -7, '#2a2a2a', 0.8, 0.4).light(0.7, '#ff3a5a', 0, 0.9, -2.2);
  child(g, 'turret', t, materials().metal, 0, 3.6, 0);
  return g;
}
function satellite() {
  const K = kit();
  K.box(10, 10, 14, '#c8b060', 0, 0, 0).box(30, 0.6, 12, '#1d3a7a', 22, 0, 0).box(30, 0.6, 12, '#1d3a7a', -22, 0, 0).cyl(0.6, 0.6, 14, '#999', 0, 0, 0, 0, 0, Math.PI / 2)
    .cone(7, 4, '#d8d8d8', 0, 8, 2, 0, 0, 0, 16).cyl(0.4, 0.4, 6, '#999', 0, 11, 2).light(1.4, '#ff3a5a', 0, 0, -7.4);
  for (let i = -2; i <= 2; i++) { K.box(0.3, 0.7, 12, '#7fa6d8', 22 + i * 5.5, 0, 0).box(0.3, 0.7, 12, '#7fa6d8', -22 + i * 5.5, 0, 0); }
  const g = K.build(materials().metal, materials().glow);
  const t = kit(); t.ball(3.5, '#666c78', 0, 0, 0).tube(0.7, 0.6, -1, -8, '#2a2a2a', 0, 0); child(g, 'turret', t, materials().metal, 0, -5.5, 4);
  return g;
}
function railgun() {
  const K = kit();
  K.box(22, 4, 30, '#5a5e64', 0, 2, 0).box(3, 3, 32, '#2a2c30', 9, 1.5, 0).box(3, 3, 32, '#2a2c30', -9, 1.5, 0).box(16, 4, 14, '#6c7076', 0, 6, 4);
  const g = K.build(materials().metal, materials().glow);
  const t = kit(); t.box(8, 5, 8, '#7c8088', 0, 0, 0).tube(1.6, 1.2, -2, -26, '#3a3d42', -1.8, 0.5).tube(1.6, 1.2, -2, -26, '#3a3d42', 1.8, 0.5).lamp(new THREE.BoxGeometry(0.8, 0.8, 20), '#7fd8ff', 0, 1.6, -14);
  child(g, 'turret', t, materials().metal, 0, 10, 2);
  return g;
}

// ---------------------------------------------------------------- the bosses: hull + guns at the rules' places
// gun(name, dx, dy, h): a turret at the screen offset (dx, dy) from the boss's middle, h above the hull's base
function gunAt(g, name, dx, dy, h, k, mat) { const c = child(g, name, k, mat, dx, h, (h * COS + dy) / SIN); c.userData.part = name; return c; }
function bigTurret(col, twin) {
  const t = kit(); t.cyl(5.5, 6, 3, col, 0, 0, 0, 0, 0, 0, 12).box(7, 3, 6, col, 0, 0.6, -2);
  if (twin) t.tube(0.9, 0.8, -3, -15, '#26292c', -1.6, 0.8).tube(0.9, 0.8, -3, -15, '#26292c', 1.6, 0.8); else t.tube(1.2, 1, -3, -15, '#26292c', 0, 0.8);
  return t;
}
function smallTurret(col) { const t = kit(); t.ball(3.4, col, 0, 0, 0, 1, 0.7, 1).tube(0.5, 0.5, -1, -8, '#26292c', -0.9, 0.5).tube(0.5, 0.5, -1, -8, '#26292c', 0.9, 0.5); return t; }
function coreLamp(col, r) { const t = kit(); t.ball(r, '#2a2d33', 0, 0, 0, 1, 0.6, 1).light(r * 0.62, col, 0, r * 0.4, 0); return t; }
export function boss(kind) {
  const M = materials(), g = new THREE.Group();
  if (kind === 'leviathan') {   // a battleship, bow up the screen
    const K = kit(), a = '#5e666e', b = '#4a5258', d = '#8a8a7e';
    K.hull([[0, -96], [22, -66], [34, -20], [34, 30], [26, 66], [-26, 66], [-34, 30], [-34, -20], [-22, -66]], 8, a, 0, -3, 0)
      .hull([[0, -92], [20, -64], [31, -20], [31, 30], [24, 63], [-24, 63], [-31, 30], [-31, -20], [-20, -64]], 0.4, d, 0, 5, 0)
      .box(26, 8, 40, b, 0, 9, -2).box(18, 10, 18, '#4a5258', 0, 17, -8).box(14, 6, 10, '#3e454a', 0, 25, -10).cyl(0.8, 0.8, 18, '#c8c8c0', 0, 34, -10)
      .box(30, 0.6, 0.6, '#c8c8c0', 0, 40, -10).cyl(3, 3.6, 7, '#33383d', 0, 22, 8).box(68, 0.4, 2, '#c8262a', 0, 5.4, 52);
    g.add(K.build(M.paint, M.glow));
    [['g1', -26, -46], ['g2', 26, -46], ['g3', -26, 30], ['g4', 26, 30]].forEach((p) => gunAt(g, p[0], p[1], p[2], 6.5, bigTurret(b, true), M.paint));
    gunAt(g, 'a1', -30, -8, 6, smallTurret(b), M.paint); gunAt(g, 'a2', 30, -8, 6, smallTurret(b), M.paint);
    gunAt(g, 'core', 0, -8, 30, coreLamp('#ff5a2a', 6), M.metal);
  } else if (kind === 'thunderhead') {   // a giant twin-rotor gunship
    const K = kit(), a = '#a0aa8a', b = '#727c62';
    K.box(30, 14, 56, a, 0, 0, 0).ball(15, a, 0, 0, -28, 1, 0.9, 1).cone(14, 26, a, 0, 0, 40, Math.PI / 2, 0, 0, 14)
      .plate([[14, -12], [52, -14], [52, -4], [14, 4]], 3, b, 0, 2, 0).plate([[-14, -12], [-52, -14], [-52, -4], [-14, 4]], 3, b, 0, 2, 0)
      .box(26, 5, 4, b, 0, 9, 46).ball(7, '#18222c', 0, 4, -38, 1.2, 0.7, 1).box(40, 0.6, 3, '#c8262a', 0, 7.4, 20);
    g.add(K.build(M.paint, M.glow));
    [['r1', -46, -10], ['r2', 46, -10]].forEach((p) => {
      const pod = kit(); pod.cyl(9, 10, 10, b, 0, 0, 0, 0, 0, 0, 14).cyl(3, 3, 6, '#22262a', 0, 7, 0).light(3, '#ffb04a', 0, -2, -10);
      const c = gunAt(g, p[0], p[1], p[2], 6, pod, M.paint);
      const rot = new THREE.Group(); rot.name = 'rotor'; rot.position.y = 10;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: 0x8a9096, transparent: true, opacity: 0.16, depthWrite: false })); disc.rotation.x = -Math.PI / 2; rot.add(disc);
      const bl = kit(); bl.box(60, 0.6, 2.4, '#1e2124', 0, 0, 0).box(2.4, 0.6, 60, '#1e2124', 0, 0, 0); rot.add(bl.build(M.matte, M.glow)); c.add(rot);
    });
    gunAt(g, 's1', -22, 24, 8, smallTurret(b), M.paint); gunAt(g, 's2', 22, 24, 8, smallTurret(b), M.paint);
    gunAt(g, 'core', 0, 0, 10, coreLamp('#ff3a3a', 8), M.metal);
  } else if (kind === 'colossus') {   // a land battleship on four tracks
    const K = kit(), a = '#6a6a48', b = '#4e4e34', t = '#24241c';
    K.box(70, 16, 104, a, 0, 12, 0).box(20, 14, 112, t, 42, 7, 0).box(20, 14, 112, t, -42, 7, 0).box(50, 8, 50, b, 0, 24, -10)
      .box(74, 1, 8, '#ffd84a', 0, 20.6, 48).box(8, 2, 100, '#4a4430', 0, 20.6, 0);
    for (let i = -5; i <= 5; i++) { K.box(21, 1.2, 2, '#1a1914', 42, 14.2, i * 10).box(21, 1.2, 2, '#1a1914', -42, 14.2, i * 10); }
    g.add(K.build(M.paint, M.glow));
    [['t1', -36, -40], ['t2', 36, -40], ['t3', -36, 34], ['t4', 36, 34]].forEach((p) => gunAt(g, p[0], p[1], p[2], 21, bigTurret(b, false), M.paint));
    [['m1', -18, 12], ['m2', 18, 12]].forEach((p) => { const r = kit(); r.box(8, 5, 10, b, 0, 0, 0); [-2.5, 0, 2.5].forEach((x) => r.tube(1, 1, -3, -7, '#d8d8d0', x, 2.5)); gunAt(g, p[0], p[1], p[2], 21, r, M.paint); });
    const cg = kit(); cg.cyl(12, 13, 7, b, 0, 0, 0, 0, 0, 0, 14).tube(3, 2.4, -6, -34, t, 0, 2).box(8, 6, 8, a, 0, 3, 6).light(2.5, '#ff5a2a', 0, 4, -2);
    gunAt(g, 'core', 0, -14, 28, cg, M.paint);
  } else if (kind === 'stormcrow') {   // a flying wing
    const K = kit(), a = '#2e3138', b = '#1f2126';
    K.plate([[0, -34], [86, 6], [86, 14], [62, 10], [44, 20], [22, 12], [0, 22], [-22, 12], [-44, 20], [-62, 10], [-86, 14], [-86, 6]], 6, a, 0, 0, 0)
      .ball(16, b, 0, 2, -8, 1, 0.45, 1.3).ball(7, '#18222c', 0, 6, -24, 1.2, 0.5, 1).box(160, 0.5, 2, '#c8262a', 0, 3.2, 6);
    g.add(K.build(M.metal, M.glow));
    [['e1', -70, 6], ['e2', -46, 2], ['e3', -22, -2], ['e4', 22, -2], ['e5', 46, 2], ['e6', 70, 6]].forEach((p) => {
      const e = kit(); e.tube(3.4, 3, -6, 8, '#3a3e46', 0, 0).lamp(new THREE.CylinderGeometry(2.6, 0.8, 6, 10), '#ff7a3a', 0, 0, 11, -Math.PI / 2).box(1.4, 1.4, 4, '#26292c', 0, -2.6, -6);
      gunAt(g, p[0], p[1], p[2], 3, e, M.metal);
    });
    gunAt(g, 'core', 0, -8, 8, coreLamp('#ff3a3a', 7), M.metal);
  } else if (kind === 'kraken') {   // a submarine carrier
    const K = kit(), a = '#4a5058', b = '#5e666e';
    K.tube(26, 26, -70, 62, a, 0, -6).ball(26, a, 0, -6, -70, 1, 1, 1.4).cone(26, 26, a, 0, -6, 75, Math.PI / 2, 0, 0, 20)
      .box(40, 4, 110, b, 0, 18, -4).box(14, 18, 26, b, 0, 28, -4).box(16, 2, 4, '#c8262a', 0, 20.4, 40);
    g.add(K.build(M.metal, M.glow));
    [['l1', -24, -40], ['l2', 24, -40]].forEach((p) => { const l = kit(); l.cyl(5, 5, 4, b, 0, 0, 0, 0, 0, 0, 12).light(3, '#ff3a3a', 0, 2.2, 0); gunAt(g, p[0], p[1], p[2], 20, l, M.metal); });
    [['d1', -30, 2], ['d2', 30, 2], ['d3', -24, 36], ['d4', 24, 36]].forEach((p) => gunAt(g, p[0], p[1], p[2], 20, smallTurret(b), M.metal));
    gunAt(g, 'core', 0, -4, 38, coreLamp('#3ad8ff', 8), M.metal);
  } else if (kind === 'citadel') {   // a fortress wall across the canyon
    const K = kit(), a = '#8a7c68', b = '#6e604e', d = '#4e4436';
    K.box(240, 26, 40, a, 0, 13, 0).box(240, 4, 44, b, 0, 27, 0);
    for (let i = -11; i <= 11; i++) K.box(6, 5, 6, a, i * 10.5, 31, -19);
    [-80, -52, 52, 80].forEach((x) => K.cyl(11, 13, 36, b, x, 18, 18, 0, 0, 0, 10));
    K.box(60, 30, 30, d, 0, 20, 2).box(40, 4, 34, '#3a3228', 0, 36, 2);
    g.add(K.build(M.matte, M.glow));
    [['w1', -80, 20], ['w2', 80, 20], ['w3', -52, 36], ['w4', 52, 36]].forEach((p) => gunAt(g, p[0], p[1], p[2], 37, bigTurret(b, true), M.paint));
    [['g1', -28, -14], ['g2', 28, -14]].forEach((p) => { const s = kit(); s.cyl(7, 8, 4, d, 0, 0, 0).ball(6, '#4a5a7a', 0, 3, 0, 1, 0.8, 1).light(3.2, '#7fd8ff', 0, 5.5, 0); gunAt(g, p[0], p[1], p[2], 38, s, M.metal); });
    const cg = kit(); cg.cyl(14, 15, 8, d, 0, 0, 0).tube(5, 4, -4, -40, '#2a2620', 0, 4).light(4, '#ff3a3a', 0, 5, 0);
    gunAt(g, 'core', 0, 6, 40, cg, M.paint);
  } else {   // eclipse: the orbital station - a ring, its pods, and the dark core with its corona
    const K = kit();
    K.torus(46, 3.2, '#9aa2b0', 0, 0, 0, Math.PI / 2, 0, 0, 48).torus(40, 1.2, '#5a6070', 0, 0, 0, Math.PI / 2, 0, 0, 48);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; K.box(1.4, 1.4, 40, '#6a7080', Math.sin(a) * 23, 0, Math.cos(a) * 23, 0, a, 0); }
    g.add(K.build(M.metal, M.glow));
    for (let i = 1; i <= 6; i++) { const p = kit(); p.ball(5, '#8a92a0', 0, 0, 0, 1, 0.7, 1).box(12, 0.8, 4, '#2a4a8a', 0, 0, 0).light(1.6, '#ff3a5a', 0, 2.6, 0); gunAt(g, 'o' + i, 0, 0, 0, p, M.metal); }
    const c = kit(); c.ball(14, '#06060a', 0, 0, 0).torus(16, 1, '#ffe8c0', 0, 0, 0, Math.PI / 2, 0, 0, 40);
    const core = gunAt(g, 'core', 0, 0, 0, c, M.metal);
    core.children.forEach((m) => { if (m.material === M.metal) m.material = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.9, roughness: 0.15 }); });
  }
  return g;
}

// ---------------------------------------------------------------- everything by the rules' names
export function enemy(type, look) {
  switch (type) {
    case 'jet': return enemyJet(1);
    case 'ace': return enemyJet(1.2, { body: '#7a1e22', dark: '#3a0e10', belly: '#a03a3a', red: '#ffd84a', glass: '#141a22' });
    case 'inter': return interceptor();
    case 'heli': return helicopter(1);
    case 'bomber': return bomber();
    case 'carrier': return transport();
    case 'gunship': return gunship(1);
    case 'drone': return drone();
    case 'rocket': return rocketModel();
    case 'tank': return tank(1);
    case 'aa': return aaGun();
    case 'sam': return samSite();
    case 'truck': return truck();
    case 'bldg': return building(look);
    case 'hangar': return building('hangar');
    case 'bunker': return bunker();
    case 'boat': return boat();
    case 'destroyer': return destroyer(1);
    case 'sub': return submarine();
    case 'loco': return trainCar(true);
    case 'car': return trainCar(false);
    case 'pod': return stationPod();
    case 'mid':
      if (look === 'gunboat') return destroyer(1.25, { a: '#5a6168', b: '#454b52', d: '#b8b4a4', s: '#3a4046' });
      if (look === 'icebreaker') return destroyer(1.3, { a: '#c8262a', b: '#e8e8e0', d: '#ffffff', s: '#d8d8d0' });
      if (look === 'bigheli') return helicopter(2.1, { body: '#2e3a2c', dark: '#1e241c', glass: '#18222c' });
      if (look === 'bigtank') return tank(2.6, { a: '#8a7a50', b: '#6a5c38', t: '#2c2a22' });
      if (look === 'railgun') return railgun();
      if (look === 'satellite') return satellite();
      return gunship(1.4, { a: '#5a2a2e', b: '#3a1a1e', d: '#22252a' });
  }
  return enemyJet(1);
}
// how high above the ground each kind flies (the picture's altitude; the rules don't need it)
// (low, so a craft's shadow falls close under it; world3d draws everything in the air in a second pass, so a tall
// building can never hide a jet)
export const HEIGHT = { player: 34, wing: 33, air: 26, heli: 22, bomber: 24, rocket: 24, boss: 22, mid: 24, ground: 0, cloud: 118 };
