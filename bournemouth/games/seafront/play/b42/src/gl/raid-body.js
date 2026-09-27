// VIKING RAID - the parts a Viking is built from (tr67).
//
// WHY THIS FILE EXISTS. tr59's crews were blobs: an egg for the body, a ball for the head,
// straight pipes for arms, no hands and no feet. The owner played the raid and said the
// Vikings "look really blocky". Everything here exists to give a figure a human silhouette
// at 50-200 m: a chest and rounded shoulders over a waist, a neck, a head with a jaw, limbs
// that taper and bend at the elbow and the knee, fists that close round an oar or a haft,
// and boots.
//
// FRAME: +X is the way the figure faces, +Y up, +Z his right. Metres at figure scale
// (Kit.addT's T.s carries 1/shipScale, so crews stay human on the big hulls).
// Nothing is built at import time - every function here is called from a builder, and the
// builders only run when RaidActors is constructed, on raid entry (tmp-tr51).
//
// SHADING: revolve() and limb() emit smooth normals, so limbs, helmets, heads, shield domes
// and beards are smooth-shaded. Belts, plates, hems, cheek guards and shield rims are 'hard'
// profile points or plain plates, which keeps their edge. The raid fragment shader flips the
// normal towards the camera, so winding does not matter here - only the normals do.

const TAU = Math.PI * 2;

// Surface of revolution about the Y axis through (cx, cy, cz).
// prof = [[r, y, hard?], ...] bottom to top; r = 0 closes that end to a point.
// sx / sz squash the circular section into an ellipse (a chest is wider than it is deep).
// A 'hard' profile point emits its ring twice, once with the normal of the band below and
// once with the band above, so the edge stays crisp (belt, hem, plate, shield rim).
export function revolve(b, cx, cy, cz, prof, seg = 8, sx = 1, sz = 1) {
  const n = prof.length, bn = [];
  for (let i = 0; i < n - 1; i++) {
    const dr = prof[i + 1][0] - prof[i][0], dy = prof[i + 1][1] - prof[i][1], l = Math.hypot(dr, dy) || 1;
    bn.push([dy / l, -dr / l]);
  }
  const ring = (r, y, nr, ny) => {
    const base = b.vertexCount;
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      b.push(cx + ca * r * sx, cy + y, cz + sa * r * sz, ca * nr / sx, ny, sa * nr / sz);
    }
    return base;
  };
  const lo = new Array(n), hi = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = bn[Math.max(0, i - 1)], c = bn[Math.min(n - 2, i)];
    if (prof[i][2] && i > 0 && i < n - 1) { lo[i] = ring(prof[i][0], prof[i][1], a[0], a[1]); hi[i] = ring(prof[i][0], prof[i][1], c[0], c[1]); }
    else {
      const nr = a[0] + c[0], ny = a[1] + c[1], l = Math.hypot(nr, ny) || 1;
      lo[i] = hi[i] = ring(prof[i][0], prof[i][1], nr / l, ny / l);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const A = hi[i], B = lo[i + 1];
    for (let s = 0; s < seg; s++) {
      const t = (s + 1) % seg;
      if (prof[i][0] < 1e-4) b.tri(A + s, B + s, B + t);
      else if (prof[i + 1][0] < 1e-4) b.tri(A + s, B + s, A + t);
      else b.quad(A + s, B + s, B + t, A + t);
    }
  }
}

// A flat plate: four corners, one face normal. Armour, cheek guards, axe cheeks.
export function plate(b, p0, p1, p2, p3) {
  const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
  const vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  const base = b.vertexCount;
  for (const q of [p0, p1, p2, p3]) b.push(q[0], q[1], q[2], nx, ny, nz);
  b.quad(base, base + 1, base + 2, base + 3);
}

// Tapered limb through a polyline, with a ball at each interior joint so an elbow or a knee
// reads as a joint and not as a kink in a pipe.
export function limb(b, pts, r, seg = 5, ball = true) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    b.tube(a[0], a[1], a[2], c[0], c[1], c[2], r[i], r[i + 1], seg, i === 0, i === pts.length - 2);
  }
  if (ball) for (let i = 1; i < pts.length - 1; i++) {
    const q = pts[i], rr = r[i] * 1.04;
    b.ellipsoid(q[0], q[1], q[2], rr, rr, rr, Math.max(3, seg - 2), 2);
  }
}

// A closed fist round a haft running along `ax` (need not be unit). tr73: no longer a
// 4-sided block. A 6-sided barrel with a knuckle ring that swells where the fingers fold
// over the haft and tapers again at the wrist, plus a thumb rolled across the grip.
// The barrel is centred on `p` and built on the haft's own axis, so a welded fist
// (anim 17) still shares the shaft's transform exactly - tmp-tr67/oarcheck.mjs.
export function fist(b, p, ax, r = 0.085, seg = 6) {
  const l = Math.hypot(ax[0], ax[1], ax[2]) || 1, d = [ax[0] / l, ax[1] / l, ax[2] / l];
  const A = (u) => [p[0] + d[0] * u, p[1] + d[1] * u, p[2] + d[2] * u];
  // wrist -> knuckles -> finger ends, along the haft
  b.tube(...A(-r * 1.25), ...A(r * 0.30), r * 0.64, r * 1.06, seg, true, false);   // tapered wrist into the knuckles
  b.tube(...A(r * 0.30), ...A(r * 1.10), r * 1.06, r * 0.78, seg, false, true);    // rounded knuckles, fingers closing
  // thumb: a short roll laid across the knuckles, on the back of the hand
  const up = Math.abs(d[1]) > 0.8 ? [1, 0, 0] : [0, 1, 0];
  const t = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]];
  const tl = Math.hypot(t[0], t[1], t[2]) || 1, T = [t[0] / tl, t[1] / tl, t[2] / tl];
  const P = (u, v) => [p[0] + d[0] * u + T[0] * v, p[1] + d[1] * u + T[1] * v, p[2] + d[2] * u + T[2] * v];
  b.tube(...P(-r * 0.55, r * 0.80), ...P(r * 0.85, r * 0.60), r * 0.40, r * 0.27, 3, false, true);
}

// A boot: ankle, instep and a rounded toe, pointing +X (yawed by `a` about Y).
export function boot(b, x, y, z, s = 1, a = 0) {
  const c = Math.cos(a), si = Math.sin(a);
  const P = (dx, dy, dz) => [x + (dx * c - dz * si) * s, y + dy * s, z + (dx * si + dz * c) * s];
  b.tube(...P(-0.07, 0.15, 0), ...P(0.15, 0.05, 0), 0.084 * s, 0.058 * s, 4, true, true);
}

// Head: jaw, cheeks and cranium. The cranium sits under the helmet and the chin under the
// beard, so only the face band is really seen and it is deliberately cheap.
export function skull(b, y, s = 1) {
  revolve(b, 0, y, 0, [[0.05, -0.15], [0.115, -0.065], [0.132, 0.02], [0.112, 0.10], [0, 0.155]].map(([r, dy]) => [r * s, dy * s]), 6, 1.07, 0.95);
}

export function neck(b, y0, y1, r = 0.085) { b.tube(-0.01, y0, 0, 0.0, y1, 0, r * 1.15, r, 5, false, false); }

// Beard and moustache with shape: it widens at the jaw, hangs in a rounded fork and is
// notched under the nose. tr59's beard was one offset egg, which is what read as a slab.
// tr73: the top of the beard was dropped ~3 cm and narrowed so there is a real band of
// face between the moustache and the fur for a mouth to sit in (see faceDark()).
export function beard(b, y, len = 1, braid = true) {
  limb(b, [[0.035, y - 0.075, 0], [0.05, y - 0.14 * len, 0], [0.07, y - 0.29 * len, 0], [0.045, y - 0.41 * len, 0]],
    [0.104, 0.146, 0.102, 0.030], 5, false);
  b.tube(0.108, y + 0.020, -0.082, 0.108, y + 0.020, 0.082, 0.034, 0.034, 4, false, false);   // moustache
  if (braid) for (const sd of [-1, 1]) b.tube(-0.045, y + 0.06, sd * 0.125, -0.075, y - 0.34, sd * 0.155, 0.042, 0.02, 3, false, false);
}

// FACE, near LOD only (tr73). Under the helmet tr67 left a blank band of skin. These two
// parts put a face on it, cheap enough not to turn to noise at chase distance: the skin
// part is a brow ridge that scowls down towards the nasal bar, a nose whose wings show
// either side of that bar, and a cheekbone each side; the dark part is two sunken eye
// slots and the mouth. `y` is the head centre, as for skull()/beard()/helm().
export function faceSkin(b, y) {
  for (const sd of [-1, 1]) {
    b.tube(0.138, y + 0.020, sd * 0.026, 0.107, y + 0.046, sd * 0.104, 0.024, 0.013, 3, false, false);  // brow ridge
    b.tube(0.118, y - 0.020, sd * 0.068, 0.056, y - 0.062, sd * 0.116, 0.030, 0.015, 3, false, false);  // cheekbone
  }
  b.tube(0.122, y + 0.022, 0, 0.118, y - 0.048, 0, 0.017, 0.042, 4, false, true);                       // nose, wings clear of the nasal bar
}
export function faceDark(b, y) {
  for (const sd of [-1, 1]) {                       // sunken eye: a dark slot under the brow
    plate(b, [0.128, y - 0.010, sd * 0.036], [0.122, y - 0.002, sd * 0.094], [0.119, y + 0.026, sd * 0.090], [0.127, y + 0.016, sd * 0.040]);
  }
  b.tube(0.112, y - 0.146, -0.048, 0.112, y - 0.146, 0.048, 0.017, 0.017, 3, false, false);             // mouth line
}

// Helmet: a proper spun dome with a flared brow rim, a nasal bar down the face and hinged
// cheek guards. The dome is the silhouette at distance, so it keeps its 8 segments.
export function helm(b, y, o = {}) {
  revolve(b, 0, y, 0, [[0.160, -0.02], [0.152, 0.055, 1], [0.134, 0.12], [0.098, 0.168], [0, 0.208]], 8, 1.04, 1.0);
  b.tube(0.150, y + 0.01, 0, 0.144, y - 0.12, 0, 0.029, 0.024, 4, false, true);                // nasal bar
  if (o.cheeks !== false) for (const sd of [-1, 1]) {      // hinged cheek guards, clear of the face
    plate(b, [0.055, y - 0.03, sd * 0.140], [0.070, y - 0.145, sd * 0.118], [-0.045, y - 0.155, sd * 0.128], [-0.055, y - 0.03, sd * 0.152]);
  }
}

// Horns, for the Hollywood look: a smooth taper with a lift and a twist.
export function horns(b, y, s = 1) {
  for (const sd of [-1, 1]) {
    const P = [[0.0, y + 0.035, sd * 0.135], [0.05, y + 0.22, sd * 0.32], [0.24, y + 0.42, sd * 0.30]];
    const R = [0.055, 0.04, 0.006];
    for (let i = 0; i < 2; i++) b.tube(P[i][0], P[i][1], P[i][2] * s, P[i + 1][0], P[i + 1][1], P[i + 1][2] * s, R[i], R[i + 1], 4, i === 0, false);
  }
}

// PIRATE RAID (tr128). Headgear that is NOT a helmet, for the second faction. It sits in
// exactly the place helm() sits (y = head centre + 0.075) and it is CHEAPER: measured 48
// tris for the cocked hat and 39 for the scarf, against helm()'s 72. helm() and horns()
// above are untouched, so no Viking moves.
// Generic shapes only: no badge, no device, no cockade of any real design, no lettering.
export function hat(b, y, o = {}) {
  if (o.kind === 'scarf') {
    // a scarf tied over the crown with a short knotted tail at the back
    revolve(b, 0, y, 0, [[0.152, -0.025], [0.150, 0.050], [0.112, 0.125], [0, 0.168]], 6, 1.03, 1.0);
    b.tube(-0.105, y + 0.030, 0, -0.245, y - 0.085, 0, 0.046, 0.018, 3, false, true);
    return;
  }
  // a cocked hat: a low crown inside a wide flat brim, turned up at three corners
  revolve(b, 0, y + 0.028, 0, [[0.120, 0.000], [0.128, 0.058], [0.108, 0.118], [0, 0.152]], 6, 1.02, 1.0);
  revolve(b, 0, y, 0, [[0.132, 0.045], [0.255, 0.012]], 6, 1.0, 1.0);
  for (const a of [0, 2.0944, -2.0944]) {
    const c = Math.cos(a), s = Math.sin(a);
    plate(b, [c * 0.20, y + 0.020, s * 0.20], [c * 0.255, y + 0.085, s * 0.255],
      [c * 0.20 - s * 0.10, y + 0.075, s * 0.20 + c * 0.10], [c * 0.16 - s * 0.06, y + 0.030, s * 0.16 + c * 0.06]);
  }
}

// Torso: hips, a waist, a chest that is wider than it is deep, and a shoulder yoke.
// o.bulk fattens him, o.dy shifts the whole body, o.top is the shoulder height.
export function torso(b, o = {}) {
  const k = o.bulk || 1, dy = o.dy || 0, top = o.top === undefined ? 1.575 : o.top;
  revolve(b, 0, dy, 0, [[0.30 * k, 0.87], [0.252 * k, 1.06], [0.30 * k, 1.30], [0.30 * k, 1.50], [0.19 * k, top]], 8, 0.74, 1.0);
  for (const sd of [-1, 1]) b.ellipsoid(0, 1.475 + dy, sd * 0.27 * k, 0.125, 0.13, 0.135, 4, 2);    // rounded shoulders
}

// A plain flat-sided belt: hard edges top and bottom, so it cuts the mail shirt in two.
export function belt(b, dy = 0, k = 1) {
  revolve(b, 0, dy, 0, [[0.322 * k, 1.005], [0.322 * k, 1.085]], 6, 0.75, 1.01);
}

// The hem of a mail shirt or tunic: a flare that ends in a hard edge.
export function hem(b, y = 0.87, r = 0.30, flare = 0.025, drop = 0.07, k = 1) {
  revolve(b, 0, 0, 0, [[(r + flare) * k, y - drop], [r * k, y]], 6, 0.74, 1.0);
}

// A fur mantle over the shoulders, with a ragged lower edge instead of a flat rim.
export function mantle(b, y = 1.5, r = 0.36, k = 1) {
  revolve(b, -0.02, 0, 0, [[r * k, y - 0.10], [(r + 0.025) * k, y + 0.02], [(r - 0.11) * k, y + 0.115]], 8, 0.84, 1.0);
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * TAU, a1 = ((i + 0.5) / 8) * TAU, a2 = ((i + 1) / 8) * TAU;
    const P = (a, yy) => [-0.02 + Math.cos(a) * r * k * 0.84, yy, Math.sin(a) * r * k];
    const n = [Math.cos(a1) * 0.83, -0.3, Math.sin(a1) * 0.83];
    const drop = i % 2 ? 0.055 : 0.095;     // a scalloped fur edge, not a row of saw teeth
    const q = [P(a0, y - 0.10), P(a1, y - 0.10 - drop), P(a2, y - 0.10)].map((v) => b.push(v[0], v[1], v[2], n[0], n[1], n[2]));
    b.tri(q[0], q[1], q[2]);
  }
}

// A round shield: a dished face, a domed boss and a rim that keeps its edge. `face` is the
// direction the front points along the shield's own axis.
// Emitted through the Kit so the sectors can be painted: k.tri / k.quad take colours.
export function roundShield(k, P, r, pair, anim = 0, pv = [0, 0, 0], seg = 8, dish = true) {
  const inner = r * 0.82, d = dish ? 0.05 * r : 0;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
    if (dish) {
      k.tri(pair[i % 2], P(0, 0, r * 0.24), P(a0, inner, d), P(a1, inner, d), anim, pv);
      k.quad([pair[i % 2][0] * 0.62, pair[i % 2][1] * 0.62, pair[i % 2][2] * 0.62], P(a0, inner, d), P(a0, r, -0.03 * r), P(a1, r, -0.03 * r), P(a1, inner, d), anim, pv);
    } else {
      k.tri(pair[i % 2], P(0, 0, r * 0.06), P(a0, r, -0.03 * r), P(a1, r, -0.03 * r), anim, pv);
    }
    k.quad(RIM, P(a0, r, -0.03 * r), P(a0, r * 1.05, -0.10 * r), P(a1, r * 1.05, -0.10 * r), P(a1, r, -0.03 * r), anim, pv);
  }
  const bs = 5;                                     // domed iron boss
  for (let i = 0; i < bs; i++) {
    const a0 = (i / bs) * TAU, a1 = ((i + 1) / bs) * TAU;
    k.tri(BOSS, P(0, 0, r * 0.32), P(a0, r * 0.15, r * 0.21), P(a1, r * 0.15, r * 0.21), anim, pv);
    k.quad(BOSS, P(a0, r * 0.15, r * 0.21), P(a0, r * 0.23, r * 0.05), P(a1, r * 0.23, r * 0.05), P(a1, r * 0.15, r * 0.21), anim, pv);
  }
}
const RIM = [0.09, 0.08, 0.075], BOSS = [0.46, 0.47, 0.50];

// Weapon heads. Tapered, with a haft socket, so an axe does not read as a paper cut-out.
export function axeHead(b, x, y, z, s = 1) {
  // bearded blade: a socket round the haft, a thick cheek, then a thin crescent edge
  const Q = (dx, dy, dz) => [x + dx * s, y + dy * s, z + dz * s];
  for (const sd of [-1, 1]) {
    plate(b, Q(0.02, 0.30, sd * 0.038), Q(0.44, 0.40, sd * 0.014), Q(0.46, -0.26, sd * 0.014), Q(0.03, -0.14, sd * 0.038));
    plate(b, Q(0.44, 0.40, sd * 0.014), Q(0.57, 0.33, 0), Q(0.59, -0.19, 0), Q(0.46, -0.26, sd * 0.014));
  }
  b.tube(x - 0.02 * s, y + 0.30 * s, z, x - 0.02 * s, y - 0.14 * s, z, 0.052 * s, 0.05 * s, 5, true, true);
}

export function spearHead(b, x, y, z, s = 1) {
  b.tube(x, y, z, x + 0.02 * s, y + 0.1 * s, z, 0.032 * s, 0.062 * s, 5, true, false);          // socket
  plate(b, [x - 0.055 * s, y + 0.10 * s, z], [x + 0.02 * s, y + 0.44 * s, z], [x + 0.09 * s, y + 0.10 * s, z], [x + 0.018 * s, y + 0.03 * s, z]);
  b.tube(x + 0.02 * s, y + 0.1 * s, z, x + 0.02 * s, y + 0.44 * s, z, 0.03 * s, 0.004 * s, 4, false, false);  // midrib
}

// The jarl's great axe (tr73 rebuild). tr67's was two trapezoid bits and read as a pair of
// flat banners in silhouette. This is a bearded axe: a socketed head with langets down the
// haft, a curved cutting edge, and a beard that hangs below the haft line. The outline is
// deliberately not symmetric top-to-bottom and the two cheeks are not the same thickness,
// so it reads as forged rather than sawn. Frame: u runs up the haft, v out from it (+z),
// w across the cheeks (+x). Silhouette reach ~0.78 out and 0.95 tall at s = 1.
export function greatAxe(b, x, y, z, s = 1) {
  const Q = (u, v, w) => [x + w * s, y + u * s, z + v * s];
  // inner spine (thick, at the socket) and the outer cutting outline (thin), bow to beard
  const I = [[0.30, 0.085], [0.27, 0.115], [0.10, 0.135], [-0.10, 0.135], [-0.26, 0.115], [-0.31, 0.085]];
  const O = [[0.40, 0.31], [0.315, 0.605], [0.06, 0.745], [-0.215, 0.695], [-0.45, 0.475], [-0.545, 0.215]];
  const tI = [0.052, 0.050, 0.046, 0.044, 0.040, 0.034], tO = 0.007;
  for (const w of [1, -1]) {
    const k = w > 0 ? 1 : 0.88;                                   // the two cheeks are not the same thickness
    for (let i = 0; i < I.length - 1; i++) {
      plate(b, Q(I[i][0], I[i][1], w * tI[i] * k), Q(I[i + 1][0], I[i + 1][1], w * tI[i + 1] * k),
        Q(O[i + 1][0], O[i + 1][1], w * tO), Q(O[i][0], O[i][1], w * tO));
    }
  }
  for (let i = 0; i < O.length - 1; i++)                          // the edge itself
    plate(b, Q(O[i][0], O[i][1], tO), Q(O[i + 1][0], O[i + 1][1], tO), Q(O[i + 1][0], O[i + 1][1], -tO), Q(O[i][0], O[i][1], -tO));
  plate(b, Q(I[0][0], I[0][1], tI[0]), Q(O[0][0], O[0][1], tO), Q(O[0][0], O[0][1], -tO), Q(I[0][0], I[0][1], -tI[0] * 0.88));
  const n = I.length - 1;
  plate(b, Q(O[n][0], O[n][1], tO), Q(I[n][0], I[n][1], tI[n]), Q(I[n][0], I[n][1], -tI[n] * 0.88), Q(O[n][0], O[n][1], -tO));
  b.tube(x, y + 0.36 * s, z, x, y - 0.36 * s, z, 0.082 * s, 0.072 * s, 6, false, false);      // socket round the haft
  for (const sd of [-1, 1]) {                                     // langets down the haft
    plate(b, [x + sd * 0.040 * s, y - 0.34 * s, z - 0.012 * s], [x + sd * 0.040 * s, y - 0.34 * s, z + 0.030 * s],
      [x + sd * 0.028 * s, y - 0.66 * s, z + 0.022 * s], [x + sd * 0.028 * s, y - 0.66 * s, z - 0.010 * s]);
  }
}

export function swordBlade(b, x, y, z, s = 1) {
  b.tube(x, y, z, x + 0.06 * s, y + 0.66 * s, z, 0.05 * s, 0.022 * s, 4, true, true);
  plate(b, [x - 0.11 * s, y - 0.02 * s, z - 0.02 * s], [x + 0.11 * s, y - 0.02 * s, z - 0.02 * s], [x + 0.11 * s, y + 0.03 * s, z + 0.02 * s], [x - 0.11 * s, y + 0.03 * s, z + 0.02 * s]);
}
