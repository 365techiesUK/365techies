// VIKING RAID - mesh kit shared by the raid model files (tr59 split out of raid-actors.js).
// Nothing here builds a mesh at import time: every builder is a function called from
// the RaidActors constructor, which only runs on raid entry (tmp-tr51: meshes built at
// page load changed the default eFoil renders).
//
// Vertex layout per mesh: position, normal, colour rgb + emissive flag, anim code, pivot.
// ANIM CODES (read by the raid vertex shader, int(aAnim + 0.5)):
//   0 static            1 oar shaft (stroke)      9 oar blade (stroke + feather)
//   2 rower body lean   3 sail (billow/furl/tear) 4 ring   5 mast + rig (topple)
//   6 swimmer arm       7/8 shark tail/rear body  10 swimmer horns (flag)  11 swimmer float shield (flag)
//   12 standing warrior sway   13 jarl axe pump   14 drummer arm   15 banner flutter   16 bow-wave shimmer
//   17 rower, welded to his oar (tr67): the fraction of aAnim is the vertex's weight, 0 at the
//      seat, ~0.55 at the shoulders, 1 at the fists, and that fraction of the oar's own
//      stroke rotation about its own port is applied - so the fists never leave the handle
//   20+slot thrower arm        40+slot thrower's hand weapon (hidden while thrown)
//   +100 on any code = CREW vertex (hidden once the ship starts sinking: the crew are in the water)
import { MeshBuilder } from './meshes.js';
import { roundShield } from './raid-body.js';

export const ZERO = [0, 0, 0];
export const CREW = 100;

export class Kit {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.anim = []; this.piv = []; this.idx = []; }
  _vert(x, y, z, nx, ny, nz, c, em, anim, pv) {
    this.pos.push(x, y, z); this.nrm.push(nx, ny, nz); this.col.push(c[0], c[1], c[2], em);
    this.anim.push(anim); this.piv.push(pv[0], pv[1], pv[2]);
  }
  add(color, fn, anim = 0, pivot = ZERO, emissive = 0) {
    const b = new MeshBuilder();
    fn(b);
    const base = this.pos.length / 3;
    const shade = typeof color === 'function', av = typeof anim === 'function';
    for (let i = 0; i < b.v.length; i += 3) {
      const c = shade ? color(b.v[i], b.v[i + 1], b.v[i + 2]) : color;
      const an = av ? anim(b.v[i], b.v[i + 1], b.v[i + 2]) : anim;
      this._vert(b.v[i], b.v[i + 1], b.v[i + 2], b.n[i], b.n[i + 1], b.n[i + 2], c, emissive, an, typeof pivot === 'function' ? pivot(b.v[i], b.v[i + 1], b.v[i + 2]) : pivot);
    }
    for (const k of b.i) this.idx.push(base + k);
    return this;
  }
  // Same as add() but the part is built in a local frame and placed by T = {x, y, z, a (yaw: local +X -> (cos a, 0, sin a)), s (scale)}.
  // The pivot is given in the local frame too.
  addT(T, color, fn, anim = 0, pivot = ZERO, emissive = 0) {
    const b = new MeshBuilder();
    fn(b);
    const c = Math.cos(T.a || 0), s = Math.sin(T.a || 0), k = T.s || 1;
    const X = (x, y, z) => [T.x + (x * c - z * s) * k, T.y + y * k, T.z + (x * s + z * c) * k];
    const pv = X(pivot[0], pivot[1], pivot[2]);
    const base = this.pos.length / 3;
    const av = typeof anim === 'function', shade = typeof color === 'function';
    for (let i = 0; i < b.v.length; i += 3) {
      const p = X(b.v[i], b.v[i + 1], b.v[i + 2]);
      const nx = b.n[i], nz = b.n[i + 2];
      const an = av ? anim(b.v[i], b.v[i + 1], b.v[i + 2]) : anim;
      const col = shade ? color(b.v[i], b.v[i + 1], b.v[i + 2]) : color;
      this._vert(p[0], p[1], p[2], nx * c - nz * s, b.n[i + 1], nx * s + nz * c, col, emissive, an, pv);
    }
    for (const q of b.i) this.idx.push(base + q);
    return this;
  }
  tri(color, a, b, c, anim = 0, pv = ZERO, emissive = 0) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const base = this.pos.length / 3;
    for (const q of [a, b, c]) this._vert(q[0], q[1], q[2], nx, ny, nz, color, emissive, anim, typeof pv === 'function' ? pv(q) : pv);
    this.idx.push(base, base + 1, base + 2);
    return this;
  }
  quad(color, a, b, c, d, anim = 0, pv = ZERO, emissive = 0) { this.tri(color, a, b, c, anim, pv, emissive); return this.tri(color, a, c, d, anim, pv, emissive); }
  box(color, x0, y0, z0, x1, y1, z1, anim = 0, pv = ZERO) {
    const P = (i, j, k) => [i ? x1 : x0, j ? y1 : y0, k ? z1 : z0];
    this.quad(color, P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1), anim, pv);
    this.quad(color, P(0, 0, 0), P(0, 0, 1), P(1, 0, 1), P(1, 0, 0), anim, pv);
    this.quad(color, P(1, 0, 0), P(1, 0, 1), P(1, 1, 1), P(1, 1, 0), anim, pv);
    this.quad(color, P(0, 0, 0), P(0, 1, 0), P(0, 1, 1), P(0, 0, 1), anim, pv);
    this.quad(color, P(0, 0, 1), P(0, 1, 1), P(1, 1, 1), P(1, 0, 1), anim, pv);
    return this.quad(color, P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0), anim, pv);
  }
  // Tube along a polyline with per-point radii.
  path(color, pts, radii, seg, anim = 0, pivot = ZERO, capEnd = true) {
    return this.add(color, (b) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], c = pts[i + 1];
        b.tube(a[0], a[1], a[2], c[0], c[1], c[2], radii[i], radii[i + 1], seg, false, capEnd && i === pts.length - 2);
      }
    }, anim, pivot);
  }
  get tris3() { return this.idx.length / 3; }
}

export const PAINT = {
  plankA: [0.17, 0.095, 0.045], plankB: [0.22, 0.13, 0.062], plankC: [0.19, 0.11, 0.05], lap: [0.06, 0.035, 0.018],
  plankTop: [0.28, 0.17, 0.08], gunwale: [0.12, 0.07, 0.035],
  deck: [0.26, 0.17, 0.09], chest: [0.30, 0.19, 0.09], post: [0.13, 0.07, 0.032], spar: [0.30, 0.20, 0.10], rope: [0.40, 0.33, 0.22],
  oar: [0.42, 0.30, 0.16], oarBlade: [0.34, 0.22, 0.11],
  bandShip: [0.50, 0.08, 0.05], bandJarl: [0.08, 0.16, 0.38], bandBoss: [0.78, 0.55, 0.12],
  shieldPairs: [[[0.62, 0.07, 0.05], [0.88, 0.80, 0.60]], [[0.10, 0.22, 0.46], [0.90, 0.86, 0.72]], [[0.85, 0.62, 0.10], [0.06, 0.06, 0.07]],
    [[0.14, 0.32, 0.14], [0.86, 0.78, 0.52]], [[0.62, 0.07, 0.05], [0.06, 0.06, 0.07]], [[0.88, 0.80, 0.60], [0.10, 0.22, 0.46]]],
  rim: [0.09, 0.08, 0.075], boss: [0.46, 0.47, 0.50], metal: [0.355, 0.365, 0.40], iron: [0.28, 0.29, 0.31], dark: [0.05, 0.05, 0.055],
  gold: [0.85, 0.60, 0.14], ivory: [0.86, 0.80, 0.62], tongue: [0.70, 0.12, 0.10], eye: [1.0, 0.78, 0.15],
  dragonWood: [0.16, 0.085, 0.04], dragonBoss: [0.80, 0.56, 0.12], dragonBossDark: [0.05, 0.04, 0.03],
  skin: [0.66, 0.44, 0.32], woad: [0.10, 0.16, 0.34],
  mail: [0.185, 0.195, 0.225], leather: [0.24, 0.135, 0.06], trews: [0.30, 0.24, 0.17],
  furs: [[0.26, 0.17, 0.09], [0.16, 0.12, 0.08], [0.36, 0.28, 0.18], [0.11, 0.09, 0.07]],
  tunics: [[0.46, 0.10, 0.06], [0.16, 0.30, 0.12], [0.12, 0.20, 0.40], [0.42, 0.30, 0.10], [0.30, 0.30, 0.28]],
  hair: [[0.30, 0.15, 0.06], [0.62, 0.30, 0.08], [0.78, 0.64, 0.34], [0.14, 0.10, 0.07], [0.62, 0.60, 0.56]],
  cloakJarl: [0.50, 0.06, 0.05],
  sailA: [0.66, 0.08, 0.05], sailB: [0.90, 0.84, 0.70], sailHem: [0.30, 0.05, 0.04],
  jarlA: [0.07, 0.12, 0.36], jarlB: [0.90, 0.66, 0.14], jarlHem: [0.04, 0.06, 0.16],
  bossA: [0.035, 0.035, 0.04], bossB: [0.92, 0.66, 0.12], bossHem: [0.55, 0.36, 0.06], roundel: [0.93, 0.84, 0.62], raven: [0.03, 0.03, 0.035],
  banner: [0.66, 0.08, 0.05], bannerBoss: [0.92, 0.66, 0.12],
  foam: [0.60, 0.68, 0.70], white: [0.85, 0.9, 0.92], wake: [0.78, 0.84, 0.86],
  sharkTop: [0.20, 0.24, 0.28], sharkBelly: [0.72, 0.74, 0.74],
  crate: [0.36, 0.22, 0.10], band: [0.20, 0.20, 0.22],

  // PIRATE RAID (tr128). A second faction's colours, added beside the Norse ones and never
  // mixed into them: every existing array above keeps its length, so pick() still returns the
  // same colour for the same index and no Viking changes by one byte.
  // Generic colours only - no real badge, livery, country or heraldry is referenced.
  oakA: [0.155, 0.100, 0.058], oakB: [0.115, 0.072, 0.042], oakC: [0.200, 0.130, 0.072],
  antifoul: [0.205, 0.100, 0.068], bootTop: [0.058, 0.052, 0.050],
  wale: [0.048, 0.042, 0.040], gunport: [0.028, 0.025, 0.024], gunIron: [0.130, 0.135, 0.150],
  tar: [0.078, 0.070, 0.064], brass: [0.620, 0.480, 0.160],
  canvasA: [0.760, 0.720, 0.615], canvasB: [0.585, 0.545, 0.450], canvasHem: [0.360, 0.325, 0.255],
  canvasRed: [0.480, 0.135, 0.100], canvasGreen: [0.120, 0.300, 0.190],
  flagBlack: [0.045, 0.045, 0.050], flagRed: [0.480, 0.070, 0.050],
  pBandShip: [0.620, 0.440, 0.100], pBandJarl: [0.100, 0.300, 0.160], pBandBoss: [0.520, 0.080, 0.060],
  pTrews: [0.34, 0.31, 0.26], pCoatCapt: [0.30, 0.08, 0.07],
  pTunics: [[0.55, 0.22, 0.12], [0.20, 0.32, 0.46], [0.62, 0.58, 0.48], [0.30, 0.18, 0.34], [0.14, 0.38, 0.30], [0.58, 0.50, 0.20]],
  pCoats: [[0.14, 0.11, 0.09], [0.28, 0.13, 0.10], [0.11, 0.16, 0.20], [0.22, 0.20, 0.14]],
  pHair: [[0.10, 0.075, 0.055], [0.26, 0.14, 0.06], [0.50, 0.44, 0.34], [0.06, 0.05, 0.045], [0.55, 0.50, 0.44]],
  pHats: [[0.09, 0.085, 0.09], [0.24, 0.10, 0.08], [0.16, 0.14, 0.12], [0.55, 0.50, 0.40], [0.30, 0.26, 0.20]],
};

// Round shield hung on a hull side (plane normal to z, `face` = the outboard direction) or
// lying flat (plane normal to y). Painted in alternating sectors with a dark rim and a domed
// iron boss - tr67 replaced tr59's flat pinwheel and its 4-sided pyramid boss.
export function shield(k, cx, cy, cz, r, pair, face, seg = 9, rim = true, anim = 0, pv = ZERO, flat = false) {
  const P = flat
    ? (a, rr, off = 0) => [cx + Math.cos(a) * rr, cy + off, cz + Math.sin(a) * rr]
    : (a, rr, off = 0) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cz + face * off];
  if (!rim) {                      // mid LOD: a flat disc, no rim and no boss
    const c0 = P(0, 0, 0.02);
    for (let i = 0; i < seg; i++) k.tri(pair[i % 2], c0, P((i / seg) * Math.PI * 2, r), P(((i + 1) / seg) * Math.PI * 2, r), anim, pv);
    return;
  }
  roundShield(k, P, r, pair, anim, pv, seg, false);
}
