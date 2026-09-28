// Geometry helpers for the driveable boats (tmp-tr41): a lofted planing hull,
// boxes, and a SEATED figure dressed in the eFoil rider's own five materials.
//
// Everything is built with the project's MeshBuilder (meshes.js) and returns
// PARTS: { mesh, color: [r, g, b] linear, rough }. Colours are uBaseColor
// literals for the craft shader, the same way board and foil are painted; no
// palette key and no texture is involved. The figure's paint is imported from
// craft.js (RIDER_PAINT) rather than copied, so a rider-material change there
// reaches the boat drivers too.
//
// Frame: local +X forward, +Y up, +Z right (craft.js _setModel), origin at the
// static waterline at the CG.

import { MeshBuilder, RIDER, RIDER_MAT } from './meshes.js';

export const V3 = {
  add: (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  unit: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};

// Axis-aligned box, outward normals, CCW from outside.
export function box(m, x0, y0, z0, x1, y1, z1) {
  const f = (n, pts) => {
    const b = m.vertexCount;
    for (const p of pts) m.push(p[0], p[1], p[2], n[0], n[1], n[2]);
    m.quad(b, b + 1, b + 2, b + 3);
  };
  f([1, 0, 0], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]);
  f([-1, 0, 0], [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]]);
  f([0, 1, 0], [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]);
  f([0, -1, 0], [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]]);
  f([0, 0, 1], [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]]);
  f([0, 0, -1], [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]]);
}

// Loft a shell through stations. section(x) returns half-profile points
// [[z, y], ...] from the centreline outward; it is mirrored to the port side.
// capStart closes the first station (a transom) with a fan.
export function loft(m, xs, section, capStart = true) {
  const rings = xs.map((x) => {
    const half = section(x);
    const pts = [];
    for (let i = half.length - 1; i >= 1; i--) pts.push([x, half[i][1], -half[i][0]]);
    for (let i = 0; i < half.length; i++) pts.push([x, half[i][1], half[i][0]]);
    return pts;
  });
  const base = m.vertexCount, per = rings[0].length;
  for (const r of rings) for (const p of r) m.push(p[0], p[1], p[2], 0, 1, 0);
  for (let s = 0; s + 1 < rings.length; s++) {
    for (let j = 0; j + 1 < per; j++) {
      const a = base + s * per + j, b = a + per;
      m.quad(a, b, b + 1, a + 1);
    }
  }
  const from = base;
  if (capStart) {
    const r = rings[0];
    let cy = 0; for (const p of r) cy += p[1];
    const c = m.push(r[0][0], cy / r.length, 0, -1, 0, 0);
    for (let j = 0; j + 1 < per; j++) m.tri(c, base + j + 1, base + j);
  }
  m.smoothNormals(from);
}

function seatIK(hip, foot, bend, thigh, shin) {
  const d = V3.sub(foot, hip);
  const L = Math.min(V3.len(d), thigh + shin - 1e-3);
  const u = V3.unit(d);
  const along = (thigh * thigh - shin * shin + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, thigh * thigh - along * along));
  const p = V3.unit(V3.sub(bend, [u[0] * V3.dot(bend, u), u[1] * V3.dot(bend, u), u[2] * V3.dot(bend, u)]));
  return V3.add(V3.add(hip, u, along), p, h);
}

// A seated driver: hip centre, torso pitch forward (rad), hand and foot
// targets for the right side (z > 0; mirrored for the left). RIDER's
// proportions; limbs solved with two-bone IK so hands really hold the bar.
export function seatedFigure(o) {
  const R = RIDER;
  const mats = [0, 1, 2, 3, 4].map(() => new MeshBuilder());
  const W = mats[RIDER_MAT.WETSUIT], VEST = mats[RIDER_MAT.VEST], SKIN = mats[RIDER_MAT.SKIN];
  const HAIR = mats[RIDER_MAT.HAIR], BOOT = mats[RIDER_MAT.BOOT];
  const hip = o.hip, lean = o.lean;
  const up = [Math.sin(lean), Math.cos(lean), 0];
  const sh = V3.add(hip, up, R.torso);
  // Pelvis and torso.
  W.ellipsoid(hip[0] - 0.02, hip[1] + 0.02, 0, 0.13, 0.11, 0.17, 12, 7);
  W.tube(hip[0], hip[1] + 0.05, 0, sh[0], sh[1] - 0.06, 0, 0.15, 0.17, 12);
  const chest = V3.add(hip, up, R.torso * 0.66);
  VEST.ellipsoid(chest[0], chest[1], 0, 0.15, 0.2, 0.215, 12, 8);
  // Neck, head, hair cap (the hair sits back and up, leaving the face).
  const neckTop = V3.add(sh, [Math.sin(lean * 0.5), Math.cos(lean * 0.5), 0], R.neck + 0.04);
  SKIN.tube(sh[0], sh[1] - 0.02, 0, neckTop[0], neckTop[1], 0, 0.055, 0.05, 8);
  const hc = V3.add(neckTop, [0.01, 1, 0], R.headH * 0.45);
  SKIN.ellipsoid(hc[0], hc[1], 0, R.headD / 2, R.headH / 2, R.headW / 2, 12, 8);
  HAIR.ellipsoid(hc[0] - 0.025, hc[1] + 0.03, 0, R.headD / 2 + 0.006, R.headH / 2 - 0.01, R.headW / 2 + 0.008, 12, 8);
  for (const s of [1, -1]) {
    // Arms: shoulder -> elbow (IK, elbows out and down) -> hand on the bar.
    const shP = [sh[0] - 0.02, sh[1] - 0.03, s * R.shoulderW / 2 * 0.9];
    const hand = [o.hand[0], o.hand[1], s * o.hand[2]];
    const elbow = seatIK(shP, hand, [0, -1, s * 0.8], R.upperArm, R.foreArm);
    W.tube(shP[0], shP[1], shP[2], elbow[0], elbow[1], elbow[2], 0.058, 0.046, 8);
    W.tube(elbow[0], elbow[1], elbow[2], hand[0], hand[1], hand[2], 0.046, 0.032, 8);
    SKIN.ellipsoid(hand[0], hand[1], hand[2], 0.05, 0.04, 0.035, 8, 5);
    W.ellipsoid(shP[0], shP[1] - 0.02, shP[2], 0.077, 0.072, 0.072, 8, 5);
    // Legs: hip joint -> knee (IK, knees up and out) -> ankle, bootie.
    const hj = [hip[0], hip[1], s * R.hipW / 2 + s * 0.03];
    const ankle = [o.foot[0], o.foot[1] + 0.08, s * o.foot[2]];
    const knee = seatIK(hj, ankle, [1, 1, s * (o.kneeOut || 0.3)], R.thigh, R.shin);
    W.tube(hj[0], hj[1], hj[2], knee[0], knee[1], knee[2], 0.09, 0.065, 9);
    W.tube(knee[0], knee[1], knee[2], ankle[0], ankle[1], ankle[2], 0.063, 0.042, 9);
    BOOT.ellipsoid(ankle[0] + 0.07, o.foot[1] + 0.04, ankle[2], 0.13, 0.05, 0.05, 9, 5);
  }
  return mats.map((mb, k) => ({ mesh: mb, mat: k }));
}

// ---------------------------------------------------------------------------
// Shared builder helpers (moved here verbatim from boat-models.js, tmp-tr95, so
// that boat-models.js, boat-pwc.js and boat-rider.js all use one copy).

export const DEG = Math.PI / 180;
export const cl = (v, a, b) => Math.min(b, Math.max(a, v));
export const sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

// Flip normals (from vertex `from`) that disagree with dir(p).
export function orient(m, from, dir) {
  for (let k = from; k < m.vertexCount; k++) {
    const d = dir([m.v[k * 3], m.v[k * 3 + 1], m.v[k * 3 + 2]]);
    if (m.n[k * 3] * d[0] + m.n[k * 3 + 1] * d[1] + m.n[k * 3 + 2] * d[2] < 0) {
      m.n[k * 3] *= -1; m.n[k * 3 + 1] *= -1; m.n[k * 3 + 2] *= -1;
    }
  }
}

// Quad grid through rows of points (equal length), smooth normals, oriented.
export function grid(m, rows, dir) {
  const base = m.vertexCount, per = rows[0].length;
  for (const r of rows) for (const p of r) m.push(p[0], p[1], p[2], 0, 1, 0);
  for (let s = 0; s + 1 < rows.length; s++) {
    for (let j = 0; j + 1 < per; j++) { const a = base + s * per + j; m.quad(a, a + per, a + per + 1, a + 1); }
  }
  m.smoothNormals(base);
  orient(m, base, dir);
}

// Tube swept along a polyline (parallel transport), analytic normals.
export function sweep(m, pts, rad, seg = 8) {
  const base = m.vertexCount, n = pts.length;
  let nn = null;
  for (let i = 0; i < n; i++) {
    const t = V3.unit(V3.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
    if (!nn) nn = V3.unit(cross(Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], t));
    else nn = V3.unit(V3.sub(nn, sc(t, V3.dot(nn, t))));
    const bn = cross(t, nn), r = typeof rad === 'function' ? rad(i, n) : rad;
    for (let k = 0; k <= seg; k++) {
      const a = (k / seg) * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a);
      const d = [nn[0] * c + bn[0] * s, nn[1] * c + bn[1] * s, nn[2] * c + bn[2] * s];
      m.push(pts[i][0] + d[0] * r, pts[i][1] + d[1] * r, pts[i][2] + d[2] * r, d[0], d[1], d[2]);
    }
  }
  for (let i = 0; i + 1 < n; i++) {
    for (let k = 0; k < seg; k++) { const a = base + i * (seg + 1) + k; m.quad(a, a + seg + 1, a + seg + 2, a + 1); }
  }
}

// Superellipsoid on basis X/Y/Z (unit), radii rx/ry/rz; e ~0.2 boxy, 1 round.
export function blob(m, c, rx, ry, rz, o = {}) {
  const seg = o.seg || 12, rings = o.rings || 8, e1 = o.e1 ?? 1, e2 = o.e2 ?? 1;
  const X = o.X || [1, 0, 0], Y = o.Y || [0, 1, 0], Z = o.Z || [0, 0, 1];
  const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  const base = m.vertexCount;
  for (let i = 0; i <= rings; i++) {
    const u = -Math.PI / 2 + (Math.PI * i) / rings, cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= seg; j++) {
      const v = -Math.PI + (2 * Math.PI * j) / seg;
      let l = [rx * sp(cu, e1) * sp(Math.cos(v), e2), ry * sp(su, e1), rz * sp(cu, e1) * sp(Math.sin(v), e2)];
      if (o.deform) l = o.deform(l[0], l[1], l[2]);
      m.push(c[0] + X[0] * l[0] + Y[0] * l[1] + Z[0] * l[2], c[1] + X[1] * l[0] + Y[1] * l[1] + Z[1] * l[2],
        c[2] + X[2] * l[0] + Y[2] * l[1] + Z[2] * l[2], 0, 1, 0);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) { const a = base + i * (seg + 1) + j; m.quad(a, a + seg + 1, a + seg + 2, a + 1); }
  }
  m.smoothNormals(base);
  orient(m, base, (p) => V3.sub(p, c));
}

// Catmull-Rom densify a polyline (k points per segment).
export function spline(P, k) {
  const out = [];
  for (let i = 0; i + 1 < P.length; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let s = 0; s < k; s++) {
      const t = s / k, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2
        + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(P[P.length - 1].slice());
  return out;
}

export const mirror = (pts) => pts.map((p) => [p[0], p[1], -p[2]]);
// Hull section (centre -> sheer) as [z, y]; returns mirrored ring [x, y, z] port->stbd.
export const ring = (x, half) => [...half.slice(1).reverse().map(([z, y]) => [x, y, -z]), ...half.map(([z, y]) => [x, y, z])];

export function kneeIK(hip, foot, bend, a, b) {
  const d = V3.sub(foot, hip), L = Math.min(V3.len(d), a + b - 1e-3), u = V3.unit(d);
  const along = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - along * along));
  const p = V3.unit(V3.sub(bend, sc(u, V3.dot(bend, u))));
  return V3.add(V3.add(hip, u, along), p, h);
}

// ---------------------------------------------------------------------------
// LIVERY DECALS (tr153). The player's own craft carries the owner's marks, and
// a mark is a TEXTURE, not geometry: these helpers lay a small quad grid on a
// surface the hull already has, lift it clear along that surface's own normal,
// and give every vertex a UV into the livery atlas.
//
// ⚠️ THIS IS THE ONLY GEOMETRY IN THE PROJECT WITH A UV ATTRIBUTE. A decal part
// is uploaded by BoatRenderer._uploadUV at stride 32 (pos 3 + normal 3 + uv 2)
// and drawn by its own program; every other part in this file still builds at
// stride 24 through MeshBuilder.build() and is untouched. The two formats never
// meet in one VAO - see boats.js.
//
// ⚠️ NO LETTERING IS GENERATED HERE. There is no glyph code, no font and no text
// renderer anywhere in the project. The only marks that exist are the two tiles
// baked out of the owner's own logo file by tools/gen-livery.py, and they are
// only ever placed on the PLAYER'S craft and rider.

// A sheet of decal patches destined for ONE draw call: one MeshBuilder, one
// parallel UV array, and the bone ranges for the patches that are skinned.
export class DecalSheet {
  constructor() { this.m = new MeshBuilder(); this.uv = []; this.r = []; }

  get vertexCount() { return this.m.vertexCount; }

  // Lay one patch. `surf(a, b) -> [x, y, z]` for a, b in 0..1; `rect` is the
  // atlas sub-rect [s0, t0, s1, t1]. Normals come from the parametric
  // derivatives of `surf` itself, so a patch sits on a curved moulding the same
  // way deckPanel's graphics do, and the lift is along that normal rather than
  // straight up (a vertical lift buries the panel on a steep shoulder).
  patch(surf, rect, o = {}) {
    const nu = o.nu || 4, nv = o.nv || 4, lift = o.lift ?? 0.010, e = o.eps ?? 1e-3;
    const m = this.m, base = m.vertexCount;
    const [s0, t0, s1, t1] = rect;
    const uvOf = o.uvOf || ((a, b) => [a, b]);
    const sgn = o.flipN ? -1 : 1;
    for (let i = 0; i <= nu; i++) {
      for (let j = 0; j <= nv; j++) {
        const a = i / nu, b = j / nv;
        const p = surf(a, b);
        const ta = V3.sub(surf(Math.min(1, a + e), b), surf(Math.max(0, a - e), b));
        const tb = V3.sub(surf(a, Math.min(1, b + e)), surf(a, Math.max(0, b - e)));
        const cr = cross(ta, tb), cl2 = Math.hypot(cr[0], cr[1], cr[2]);
        // A degenerate frame means the patch has run off the end of the surface
        // it is riding and the walker has clamped. Silent garbage on the GPU;
        // loud here, where tools/../check-livery.mjs sees it.
        if (!(cl2 > 1e-9)) throw new Error(`[decal] degenerate surface at a=${a.toFixed(3)} b=${b.toFixed(3)}`);
        const n = sc([cr[0] / cl2, cr[1] / cl2, cr[2] / cl2], sgn);
        m.push(p[0] + n[0] * lift, p[1] + n[1] * lift, p[2] + n[2] * lift, n[0], n[1], n[2]);
        const [s, t] = uvOf(a, b);
        this.uv.push(s0 + (s1 - s0) * s, t0 + (t1 - t0) * t);
      }
    }
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) { const k = base + i * (nv + 1) + j; m.quad(k, k + nv + 1, k + nv + 2, k + 1); }
    }
    return this;
  }

  // Tag everything pushed since `from` onto one bone (the skinned patches).
  bone(from, b) { this.r.push([from, this.m.vertexCount, b]); return this; }

  // A rigid skin table in skinPart's layout: primary bone per vertex, no blend.
  // Deliberately NOT softened across joints the way the rider's own skin is - a
  // decal is a rigid sticker on one body part and a blend would shear the mark.
  skin(base) {
    const n = this.m.vertexCount;
    const b0 = new Uint8Array(n), b1 = new Uint8Array(n), w1 = new Float32Array(n);
    for (const [from, to, b] of this.r) for (let k = from; k < to; k++) { b0[k] = b + base; b1[k] = b + base; }
    return { b0, b1, w1 };
  }

  // { mesh, uv } in the shape BoatRenderer._uploadUV wants.
  build() { return { mesh: this.m, uv: new Float32Array(this.uv) }; }
}

// The superellipsoid `blob` draws, as a surface function. Same formula, same
// deform hook - so a decal laid with this sits exactly on the blob's skin.
export function blobSurf(c, rx, ry, rz, o = {}) {
  const e1 = o.e1 ?? 1, e2 = o.e2 ?? 1;
  const X = o.X || [1, 0, 0], Y = o.Y || [0, 1, 0], Z = o.Z || [0, 0, 1];
  const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  return (u, v) => {
    const cu = Math.cos(u), su = Math.sin(u);
    let l = [rx * sp(cu, e1) * sp(Math.cos(v), e2), ry * sp(su, e1), rz * sp(cu, e1) * sp(Math.sin(v), e2)];
    if (o.deform) l = o.deform(l[0], l[1], l[2]);
    return [c[0] + X[0] * l[0] + Y[0] * l[1] + Z[0] * l[2], c[1] + X[1] * l[0] + Y[1] * l[1] + Z[1] * l[2],
      c[2] + X[2] * l[0] + Y[2] * l[1] + Z[2] * l[2]];
  };
}

// The roundel square on the BACK of a buoyancy-aid blob built with basis
// {X: forward, Y: up, Z: side}. The back is longitude PI; `uHalf` sets the
// height and `vHalf` is solved from it so the patch comes out square on the
// skin rather than square in parameter space. Both riders - the PWC's skinned
// one and the RIB's baked one - go through here, so one mark, one size.
export function vestBack(sheet, rect, c, rx, ry, rz, o, uHalf = 0.47, lift = 0.008, nu = 6) {
  const e1 = o.e1 ?? 1, e2 = o.e2 ?? 1;
  const S = blobSurf(c, rx, ry, rz, o);
  const half = ry * Math.pow(Math.sin(uHalf), e1);          // half height on the skin
  const vHalf = Math.asin(Math.min(1, Math.pow(half / rz, 1 / e2)));
  const surf = (a, b) => S(mix(-uHalf, uHalf, a), Math.PI + mix(-vHalf, vHalf, b));
  // a runs bottom -> top, so the atlas row (t, downward) is 1 - a; b runs from
  // the rider's LEFT flank to her RIGHT as seen from behind, which is the
  // reading direction for someone looking at her back.
  sheet.patch(surf, rect, { nu, nv: nu, lift, uvOf: (a, b) => [b, 1 - a] });
  return { width: 2 * half, height: 2 * half };
}

// The livery atlas, as PRINTED by tools/gen-livery.py. Three tiles in one
// 256x256 RGBA png; re-run the generator and these lines are the only thing
// that can need changing.
//   ROUNDEL    168x168 at (0,0)     the mark on its own white disc, 1:1
//   WORDMARK   222x30  at (17,180)  "365techies", ink only, 7.400:1
//   WORDPLATE  238x38  at (9,216)   the same ink on a white bar, 6.263:1
export const LIVERY_UV = {
  roundel: [0.000000, 0.000000, 0.656250, 0.656250],
  wordmark: [0.066406, 0.703125, 0.933594, 0.820312],
  wordplate: [0.035156, 0.843750, 0.964844, 0.992188],
};
// THE BACK ROUNDEL, sized once for both riders. uHalf is the half-angle of the
// patch up the vest, which sets the mark; lift is how far it stands off.
//
// MEASURED on a 298-frame chase capture of the jetski: the rider's buoyancy aid
// is 19-85 px wide on a 1080-wide portrait frame (p50 70), and the mark comes
// out at 0.42 of that. 0.56 puts it at 256 mm on a back 444 mm across - 58%,
// which is a race bib, not a sticker - and that is the largest the wetsuit
// underneath allows: at 0.60 the mark reaches the shoulders, where the wetsuit
// stands furthest proud, and a 44 mm lift no longer clears it.
export const BACK_ROUNDEL = { uHalf: 0.56, lift: 0.044 };

// The aspect each wide tile must be drawn at, or the letters stretch.
export const LIVERY_ASPECT = { wordmark: 222 / 30, wordplate: 238 / 38 };

// The smallest gap from every vertex pushed into `sheet` since `from` to a
// truncated cone a0->b0, r0->r1. Negative means the mark is buried inside it.
// Both riders' back roundels are checked against their own wetsuit with this.
export function coneGap(sheet, from, a0, b0, r0, r1) {
  const ax = V3.sub(b0, a0), L = V3.len(ax) || 1e-6;
  const u = V3.unit(ax), m = sheet.m;
  let worst = Infinity;
  for (let k = from; k < m.vertexCount; k++) {
    const w = [m.v[k * 3] - a0[0], m.v[k * 3 + 1] - a0[1], m.v[k * 3 + 2] - a0[2]];
    const along = V3.dot(w, u), r = mix(r0, r1, cl(along / L, 0, 1));
    worst = Math.min(worst, V3.len(V3.sub(w, sc(u, along))) - r);
  }
  return worst;
}
