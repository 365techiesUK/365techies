// THE PLAYER'S SURFER, AS A PERSON (26 Sep 2026). The owner, after playing PIER SURF live: "we
// need to do quite a bit of work on the actual surfer ... make them a lot more realistic".
//
// Until now the player was drawn with the line-up's scenery figures (gl/surfers.js): three rigid
// meshes - lying, standing, a loose board - posed by one instance matrix each, so the rider could
// not bend a knee, reach for the water or turn their head. At 5-7 m from the camera that reads as a
// doll. This is a JOINTED figure instead, built the way the jet ski's rider is (gl/boat-rider.js):
// a 16-bone skeleton solved every frame (two-bone IK at every elbow and knee, lengths held exactly),
// one mesh built once in a bind pose, and the vertices skinned on the CPU (~3k of them - less work
// than the wake does). The line-up keeps its cheap figures: they are 30-200 m away.
//
// WHAT IT DOES, all of it driven from the board (src/boats/surfboard.js) and read-only on it:
//   * PADDLING - an alternate-arm crawl: each hand reaches forward past the nose, catches the water
//     outside the rail, pulls back under the board to the hip and recovers over the water with the
//     elbow high. Chest up, head up looking ahead, legs together. Faster and fuller with effort.
//   * WAITING - sit up and straddle the board, legs down in the water, tail sunk, nose up, hands on
//     the deck, and look round over your shoulders for the next set.
//   * THE DUCK-DIVE - straight arms pushing the rails down, a knee on the tail, the other leg up.
//   * THE POP-UP - a push-up (chest up, arms straightening) and then the feet come through into a
//     crouch, in under half a second, which is how long a real one takes.
//   * RIDING - a regular stance (left foot forward) side-on across the board, knees bent, arms out
//     for balance; into a turn the hips drop to the inside rail, the knees compress and the chest
//     rotates the way you are going.
//   * A WIPEOUT - off the board and tumbling, limbs spread.
//   * THE LEASH - a cord from the back ankle to the tail, with a little sag.
//
// THE RULES gl/surfers.js keeps apply here too: nobody is real and nothing is branded - a plain
// dark wetsuit, no logo, no face. No Math.random.
//
// FRAME: the board's own - +X to the nose, +Y up, +Z to the right rail, y 0 = the board's centre
// plane (its deck is at DECK). gl/surfers.js draws the figure with the board's instance matrix, so
// the figure moves, pitches and rolls with the board for free.

import { MeshBuilder, RIDER } from './meshes.js';
import { V3, blob, sweep, cross, sc, cl } from './boat-meshes.js';

const add = V3.add, sub = V3.sub, dot = V3.dot, unit = V3.unit, len = V3.len;
const R = RIDER;
const DECK = 0.056;                    // board deck height above its centre plane (surfers.js BRD_HT + a skin)
const TAIL = [-1.0, DECK + 0.01, 0.03];  // the leash plug

const hex = (h) => { const n = parseInt(h.slice(1), 16); const f = (c) => Math.pow(c / 255, 2.2); return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)]; };
// A plain dark wetsuit made the way they are: a dull fabric-lined body, a smooth-skin chest and back
// panel that holds a film of water (the only glossy part), textured knee pads, dark seams.
const COL = {
  suit: hex('#252A30'), chest: hex('#1D2126'), knee: hex('#353B42'), seam: hex('#131518'),
  skin: hex('#C8A183'), hair: hex('#3A2A1F'), leash: hex('#2A3036'),
};
// ROUGHNESS per material, carried to gl/surfers.js's shader as a NEGATIVE aAnim (its own figures
// use 0/1/2 there, so their look cannot change). The shared constant is 0.09 - a mirror-wet
// board - and on a whole body it read as latex: every tube edge a highlight (26 Sep). The second
// pass took the fabric body further (0.66 still put a hot spot on every curve at a close-up).
const ROUGH = new Map([[COL.suit, 0.84], [COL.chest, 0.62], [COL.knee, 0.93], [COL.seam, 0.7], [COL.skin, 0.5], [COL.hair, 0.55], [COL.leash, 0.5]]);

// ---------------------------------------------------------------------------- the skeleton
export const FB = {
  PELVIS: 0, CHEST: 1, NECK: 2, HEAD: 3,
  THIGH_L: 4, SHIN_L: 5, FOOT_L: 6, THIGH_R: 7, SHIN_R: 8, FOOT_R: 9,
  UARM_L: 10, FARM_L: 11, HAND_L: 12, UARM_R: 13, FARM_R: 14, HAND_R: 15,
};
const NB = 16;
const PARENT = [-1, 0, 1, 2, 0, 4, 5, 0, 7, 8, 1, 10, 11, 1, 13, 14];
const CHILD = [1, 2, 3, -1, 5, 6, -1, 8, 9, -1, 11, 12, -1, 14, 15, -1];

function reachClamp(root, target, l) {
  const d = sub(target, root), L = len(d), m = l - 1e-3;
  return L <= m ? target : add(root, sc(d, 1 / L), m);
}
function ik(a, c, bend, l1, l2) {
  const d = sub(c, a), L = Math.min(len(d), l1 + l2 - 1e-3), u = unit(d);
  const along = (l1 * l1 - l2 * l2 + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  let p = sub(bend, sc(u, dot(bend, u)));
  if (len(p) < 1e-4) p = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return add(add(a, u, along), unit(p), h);
}
// A bone from a to b, framed about the first reference that is not parallel to it - so a limb
// pointing straight along one reference (an arm reaching past the nose, a leg lying flat) still
// gets a well-defined roll.
function bone(a, b, refs) {
  const X = unit(sub(b, a));
  let Z = null;
  for (const r of refs) { const z = cross(X, r); if (len(z) > 0.3) { Z = unit(z); break; } }
  if (!Z) Z = unit(cross(X, Math.abs(X[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  return { a, b, X, Y: cross(Z, X), Z };
}
// An orthonormal body frame from an "up" (the spine) and a "front" (the way the belly faces).
function frame(up, front) {
  const u = unit(up);
  const f = unit(sub(front, sc(u, dot(front, u))));
  return { u, f, r: cross(f, u) };            // r = the body's own right
}

function skeleton(p) {
  const P = frame(p.up, p.fwd), C = frame(p.chestUp || p.up, p.chestFwd || p.fwd);
  const H = frame(p.headUp || C.u, p.headFwd || C.f);
  const hip = p.hip, spine = add(hip, P.u, 0.12), shC = add(spine, C.u, R.torso - 0.12);
  const neckTop = add(shC, H.u, R.neck + 0.012);
  const B = new Array(NB);
  B[FB.PELVIS] = bone(hip, spine, [P.r, P.f]);
  B[FB.CHEST] = bone(spine, shC, [C.r, C.f]);
  B[FB.NECK] = bone(shC, neckTop, [H.r, H.f]);
  B[FB.HEAD] = bone(neckTop, add(neckTop, H.u, R.headH), [H.r, H.f]);
  for (const s of [1, -1]) {                  // +1 right, -1 left
    const T = s > 0 ? FB.THIGH_R : FB.THIGH_L, U = s > 0 ? FB.UARM_R : FB.UARM_L;
    const hj = add(hip, P.r, s * (R.hipW / 2 + 0.035));
    const ankle = reachClamp(hj, s > 0 ? p.footR : p.footL, R.thigh + R.shin);
    const knee = ik(hj, ankle, s > 0 ? p.kneeR : p.kneeL, R.thigh, R.shin);
    B[T] = bone(hj, knee, [P.r, P.f]);
    B[T + 1] = bone(knee, ankle, [P.r, P.f]);
    B[T + 2] = bone(ankle, add(ankle, unit(s > 0 ? p.toeR : p.toeL), R.footL * 0.8), [P.r, P.f]);
    const shP = add(add(shC, C.r, s * R.shoulderW * 0.45), C.u, -0.035);
    const wrist = reachClamp(shP, s > 0 ? p.handR : p.handL, R.upperArm + R.foreArm);
    const elbow = ik(shP, wrist, s > 0 ? p.elbowR : p.elbowL, R.upperArm, R.foreArm);
    const ua = unit(sub(elbow, shP)), fa = unit(sub(wrist, elbow));
    B[U] = bone(shP, elbow, [cross(ua, fa), C.f, C.u]);
    B[U + 1] = bone(elbow, wrist, [cross(ua, fa), C.f, C.u]);
    B[U + 2] = bone(wrist, add(wrist, unit(s > 0 ? p.handDirR : p.handDirL), 0.17), [C.f, C.u, C.r]);
  }
  B.P = P; B.C = C; B.H = H; B.shC = shC;
  return B;
}

// ---------------------------------------------------------------------------- the body mesh
// Built once in a standing bind pose.
//
// ONE SKIN, NOT A KIT OF PARTS (second pass, 26 Sep - the owner: "the surfer does need another
// pass ... more realistic"). The first figure was tubes and balls, one set per bone, and close up
// it read as a jointed mannequin: a ball at every elbow and knee, a join wherever one tube met the
// next, a highlight on every edge. Now the trunk-and-neck, each leg and each arm is ONE lofted
// surface running through its joints, and the vertices round a joint are shared by the two bones
// (smooth weights), so a knee bends the way a knee does. The head, hands and feet are still shaped
// pieces carried by their own bones - they do not bend.
class Kit {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.rough = []; this.idx = []; this.ranges = []; this.wts = []; }
  // A shaped rigid piece, every vertex on one bone (skinOf gives its ends a little blend).
  add(color, boneId, fn) {
    const m = new MeshBuilder();
    fn(m);
    const base = this.pos.length / 3;
    for (let i = 0; i < m.v.length; i += 3) {
      this.pos.push(m.v[i], m.v[i + 1], m.v[i + 2]);
      this.nrm.push(m.n[i], m.n[i + 1], m.n[i + 2]);
      this.col.push(color[0], color[1], color[2]);
      this.rough.push(ROUGH.get(color) ?? 0.35);
      this.wts.push(null);
    }
    for (const k of m.i) this.idx.push(base + k);
    this.ranges.push([base, this.pos.length / 3, boneId]);
  }
  get count() { return this.pos.length / 3; }
}

// A LOFT: one continuous surface along a path in the bind pose. at(s) -> { c, A, B }, the centre
// and the two section axes at arc length s; prof(s) -> { a, b, oa }, the radii along A and B and an
// offset along A (a calf, a seat); paint(s, ang) -> a COL entry (ang 0 = +A); weigh(s) -> [b0, b1, w],
// the two bones and the second one's share. Normals are smoothed from the triangles and turned out.
function loft(K, { s0, s1, step, seg, at, prof, paint, weigh }) {
  const rings = Math.max(2, Math.round((s1 - s0) / step) + 1), base = K.count, centres = [];
  for (let i = 0; i < rings; i++) {
    const s = s0 + (s1 - s0) * i / (rings - 1);
    const { c, A, B } = at(s), { a, b, oa } = prof(s), w = weigh(s);
    centres.push(c);
    for (let k = 0; k < seg; k++) {
      const ang = (k / seg) * Math.PI * 2;
      const p = add(add(c, A, oa + a * Math.cos(ang)), B, b * Math.sin(ang));
      const col = paint(s, ang);
      K.pos.push(p[0], p[1], p[2]); K.nrm.push(0, 0, 0);
      K.col.push(col[0], col[1], col[2]); K.rough.push(ROUGH.get(col) ?? 0.35);
      K.wts.push(w);
    }
  }
  const tri = [];
  for (let i = 0; i + 1 < rings; i++) for (let k = 0; k < seg; k++) {
    const v = base + i * seg + k, u = base + i * seg + (k + 1) % seg;
    tri.push(v, v + seg, u + seg, v, u + seg, u);
  }
  const P = K.pos, N = K.nrm;
  for (let t = 0; t < tri.length; t += 3) {
    const i0 = tri[t] * 3, i1 = tri[t + 1] * 3, i2 = tri[t + 2] * 3;
    const n = cross([P[i1] - P[i0], P[i1 + 1] - P[i0 + 1], P[i1 + 2] - P[i0 + 2]], [P[i2] - P[i0], P[i2 + 1] - P[i0 + 1], P[i2 + 2] - P[i0 + 2]]);
    for (const q of [i0, i1, i2]) { N[q] += n[0]; N[q + 1] += n[1]; N[q + 2] += n[2]; }
  }
  let out = 0;
  for (let i = 0; i < rings; i++) for (let k = 0; k < seg; k++) {
    const q = (base + i * seg + k) * 3, c = centres[i];
    out += (P[q] - c[0]) * N[q] + (P[q + 1] - c[1]) * N[q + 1] + (P[q + 2] - c[2]) * N[q + 2];
  }
  const f = out < 0 ? -1 : 1;
  for (let v = base; v < K.count; v++) {
    const q = v * 3, l = (Math.hypot(N[q], N[q + 1], N[q + 2]) || 1) * f;
    N[q] /= l; N[q + 1] /= l; N[q + 2] /= l;
  }
  for (const k of tri) K.idx.push(k);
}

// A path through a chain of bind-pose bones, s measured from the first bone's root (negative s runs
// back up the first bone's line, into the body it grows out of). The section turns smoothly across
// a joint instead of snapping to the next bone's axis.
function chain(bones, front, blend = 0.05) {
  const segs = []; let acc = 0;
  for (const b of bones) { const L = len(sub(b.b, b.a)); segs.push({ b, s0: acc, L }); acc += L; }
  return (s) => {
    let i = 0;
    while (i + 1 < segs.length && s > segs[i].s0 + segs[i].L) i++;
    const g = segs[i], c = add(g.b.a, g.b.X, s - g.s0);
    let X = g.b.X;
    for (let j = 1; j < segs.length; j++) {
      const k = ease((s - (segs[j].s0 - blend)) / (2 * blend));
      if (k > 0 && k < 1) X = unit(add(sc(segs[j - 1].b.X, 1 - k), segs[j].b.X, k));
    }
    const A = unit(sub(front, sc(X, dot(front, X))));
    return { c, A, B: cross(X, A) };
  };
}
// Radii along a loft from keys [s, a, b, oa], smoothed (Catmull-Rom) so the outline has no corners.
function keyed(keys) {
  return (s) => {
    let i = 0;
    while (i + 2 < keys.length && s > keys[i + 1][0]) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    const t = cl((s - k1[0]) / Math.max(1e-6, k2[0] - k1[0]), 0, 1);
    const cr = (j) => {
      const p0 = k0[j] || 0, p1 = k1[j] || 0, p2 = k2[j] || 0, p3 = k3[j] || 0;
      return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
    };
    return { a: Math.max(0.004, cr(1)), b: Math.max(0.004, cr(2)), oa: cr(3) };
  };
}
const smooth = (a, b, x) => ease((x - a) / (b - a));

const BIND = {
  hip: [0, 0.95, 0], up: [0, 1, 0], fwd: [1, 0, 0],
  handL: [0.02, 0.93, -0.36], handR: [0.02, 0.93, 0.36], elbowL: [-1, 0, -0.3], elbowR: [-1, 0, 0.3],
  handDirL: [0.05, -1, -0.15], handDirR: [0.05, -1, 0.15],
  footL: [0.02, 0.09, -0.12], footR: [0.02, 0.09, 0.12], kneeL: [1, 0, 0], kneeR: [1, 0, 0],
  toeL: [1, -0.1, -0.08], toeR: [1, -0.1, 0.08],
};

function buildBody(B) {
  const K = new Kit();
  const Hf = B.H, FRONT = [1, 0, 0];
  const bx = (F) => ({ X: F.f, Y: F.u, Z: F.r });      // blob axes: X front, Y up, Z right
  // ---- THE TRUNK AND NECK: one surface from the crotch up into the head. s is height above the hip
  // joints; a is front-to-back, b side to side. A seat behind, a waist, a chest, shoulders that slope
  // to the arms, a neck. The suit's smooth-skin panel over chest and back, the zip down the spine,
  // a collar, and skin above it.
  loft(K, {
    s0: -0.105, s1: 0.665, step: 0.018, seg: 32,
    at: chain([B[FB.PELVIS], B[FB.CHEST], B[FB.NECK]], FRONT, 0.03),
    prof: keyed([[-0.105, 0.02, 0.03], [-0.085, 0.07, 0.1, -0.005], [-0.05, 0.1, 0.15, -0.012], [0.0, 0.112, 0.172, -0.012],
      [0.06, 0.108, 0.168, -0.006], [0.15, 0.098, 0.148, 0], [0.24, 0.104, 0.155, 0.004], [0.32, 0.116, 0.168, 0.01],
      [0.4, 0.12, 0.178, 0.012], [0.46, 0.108, 0.19, 0.004], [0.5, 0.086, 0.162, 0], [0.53, 0.066, 0.1, 0.002],
      [0.56, 0.056, 0.06, 0.006], [0.61, 0.053, 0.055, 0.01], [0.665, 0.05, 0.05, 0.01]]),
    paint: (s, ang) => {
      // A wetsuit's collar comes most of the way up the neck; a long bare neck read as a mannequin's.
      if (s > 0.605) return COL.skin;
      if (s > 0.585) return COL.seam;                                     // the collar's edge
      if (Math.abs(ang - Math.PI) < 0.1 && s > 0.08 && s < 0.53) return COL.seam;   // the zip
      if (s > 0.22 && s < 0.5 && Math.abs(Math.cos(ang)) > 0.45) return COL.chest;
      return COL.suit;
    },
    weigh: (s) => s < 0.02 ? [FB.PELVIS, FB.PELVIS, 0] : s < 0.2 ? [FB.PELVIS, FB.CHEST, smooth(0.02, 0.2, s)]
      : s < 0.49 ? [FB.CHEST, FB.CHEST, 0] : s < 0.6 ? [FB.CHEST, FB.NECK, smooth(0.49, 0.58, s)] : [FB.NECK, FB.HEAD, smooth(0.6, 0.665, s)],
  });
  // ---- LEGS: hip to ankle in one surface - a full thigh, a knee (with the suit's textured pad on
  // the front of it), a calf that swells behind, a slim ankle.
  for (const sd of [1, -1]) {
    const T = sd > 0 ? FB.THIGH_R : FB.THIGH_L;
    loft(K, {
      s0: -0.09, s1: R.thigh + R.shin + 0.005, step: 0.016, seg: 20,
      at: chain([B[T], B[T + 1]], FRONT, 0.06),
      prof: keyed([[-0.09, 0.06, 0.06], [0, 0.092, 0.084, -0.005], [0.1, 0.088, 0.08], [0.22, 0.078, 0.072, 0.004], [0.34, 0.064, 0.058, 0.004],
        [0.42, 0.056, 0.054, 0.006], [0.46, 0.055, 0.052, 0.004], [0.52, 0.056, 0.05, -0.008], [0.6, 0.058, 0.05, -0.014],
        [0.7, 0.046, 0.042, -0.006], [0.8, 0.035, 0.033], [0.875, 0.033, 0.031, 0.004]]),
      paint: (s, ang) => (s > 0.38 && s < 0.54 && Math.cos(ang) > 0.45) ? COL.knee : COL.suit,
      weigh: (s) => s < 0.08 ? [T, FB.PELVIS, 0.5 * (1 - smooth(-0.09, 0.08, s))]
        : s < 0.38 ? [T, T, 0] : s < 0.5 ? [T, T + 1, smooth(0.38, 0.5, s)] : [T + 1, T + 1, 0],
    });
  }
  // ---- ARMS: shoulder to wrist in one surface - the deltoid grows out of the trunk (its root is
  // shared with the chest), the upper arm, an elbow that bends, the forearm tapering to the cuff.
  for (const sd of [1, -1]) {
    const U = sd > 0 ? FB.UARM_R : FB.UARM_L;
    loft(K, {
      s0: -0.06, s1: R.upperArm + R.foreArm + 0.004, step: 0.014, seg: 16,
      at: chain([B[U], B[U + 1]], FRONT, 0.05),
      prof: keyed([[-0.06, 0.05, 0.05], [0, 0.058, 0.062], [0.07, 0.057, 0.058], [0.15, 0.048, 0.047], [0.24, 0.043, 0.041],
        [0.29, 0.04, 0.04], [0.34, 0.043, 0.041], [0.4, 0.04, 0.037], [0.48, 0.032, 0.029], [0.564, 0.027, 0.024]]),
      paint: (s) => s > 0.55 ? COL.seam : COL.suit,                         // the cuff
      weigh: (s) => s < 0.1 ? [U, FB.CHEST, 0.5 * (1 - smooth(-0.06, 0.1, s))]
        : s < 0.24 ? [U, U, 0] : s < 0.34 ? [U, U + 1, smooth(0.24, 0.34, s)] : [U + 1, U + 1, 0],
    });
  }
  // ---- the head: a skull, the mass of the face and a jaw - no features -----------------------------
  const hb = B[FB.HEAD];
  const hc = add(hb.a, Hf.u, R.headH * 0.5);
  K.add(COL.skin, FB.HEAD, (m) => blob(m, add(hc, Hf.f, -0.01), 0.1, 0.112, 0.078, { ...bx(Hf), seg: 16, rings: 12 }));             // skull
  K.add(COL.skin, FB.HEAD, (m) => blob(m, add(add(hc, Hf.f, 0.04), Hf.u, -0.035), 0.065, 0.075, 0.066, { ...bx(Hf), seg: 12, rings: 8 }));  // face mass
  K.add(COL.skin, FB.HEAD, (m) => blob(m, add(add(hc, Hf.f, 0.035), Hf.u, -0.085), 0.05, 0.035, 0.052, { ...bx(Hf), seg: 10, rings: 6 }));  // jaw
  for (const s of [1, -1]) K.add(COL.skin, FB.HEAD, (m) => blob(m, add(add(hc, Hf.r, s * 0.078), Hf.f, -0.012), 0.022, 0.03, 0.01, { ...bx(Hf), seg: 8, rings: 5 }));
  // Wet hair: a cap over the crown and back of the skull (short of the ears), and a few clumps.
  K.add(COL.hair, FB.HEAD, (m) => blob(m, add(add(hc, Hf.u, 0.03), Hf.f, -0.025), 0.104, 0.09, 0.082, { ...bx(Hf), seg: 16, rings: 10, e1: 0.9,
    // The hairline: the cap is pulled up off the forehead in a curve (higher at the temples), not cut
    // straight across - a straight edge read as a helmet visor.
    deform: (x, y, z) => { if (x <= 0) return [x, y, z]; const edge = 0.01 + 0.35 * (z * z) / 0.0064 * 0.02; return [x, y < edge ? edge + (y - edge) * 0.15 : y, z]; } }));
  K.add(COL.skin, FB.HEAD, (m) => blob(m, add(add(hc, Hf.f, 0.105), Hf.u, -0.018), 0.02, 0.03, 0.013, { ...bx(Hf), seg: 8, rings: 5 }));   // nose
  for (const [f, u, r] of [[0.0, 0.1, 0.05], [-0.05, 0.08, -0.05], [-0.07, 0.03, 0.04]]) {
    K.add(COL.hair, FB.HEAD, (m) => blob(m, add(add(add(hc, Hf.f, f), Hf.u, u), Hf.r, r), 0.035, 0.022, 0.03, { ...bx(Hf), seg: 8, rings: 5 }));
  }
  // ---- hands and feet: shaped, carried by their own bones ------------------------------------------
  for (const s of [1, -1]) {
    const U = s > 0 ? FB.UARM_R : FB.UARM_L, ha = B[U + 2];
    K.add(COL.skin, U + 2, (m) => {
      const w = ha.a, d = ha.X, n = ha.Y, t = ha.Z;
      blob(m, add(w, d, 0.05), 0.056, 0.021, 0.044, { X: d, Y: n, Z: t, seg: 10, rings: 6, e1: 0.7, e2: 0.7 });
      blob(m, add(w, d, 0.118), 0.046, 0.016, 0.041, { X: d, Y: n, Z: t, seg: 10, rings: 6, e1: 0.8, e2: 0.6 });
      const t0 = add(add(w, d, 0.03), t, -s * 0.034), t1 = add(add(add(w, d, 0.085), t, -s * 0.054), n, 0.012);
      m.tube(t0[0], t0[1], t0[2], t1[0], t1[1], t1[2], 0.015, 0.012, 8);
    });
  }
  for (const s of [1, -1]) {
    const T = s > 0 ? FB.THIGH_R : FB.THIGH_L, ft = B[T + 2];
    K.add(COL.skin, T + 2, (m) => {
      const a = ft.a, f = ft.X, u = ft.Z, sd = ft.Y;         // bind: X toes, Z down (the sole), Y side
      blob(m, add(add(a, f, 0.075), u, 0.03), 0.12, 0.045, 0.05, { X: f, Y: u, Z: sd, seg: 10, rings: 6, e1: 0.7, e2: 0.8 });
      blob(m, add(add(a, f, -0.01), u, 0.035), 0.05, 0.04, 0.042, { X: f, Y: u, Z: sd, seg: 8, rings: 5 });
      blob(m, add(add(a, f, 0.18), u, 0.045), 0.045, 0.022, 0.048, { X: f, Y: u, Z: sd, seg: 8, rings: 5 });
    });
  }
  return K;
}

function skinOf(K, B) {
  const n = K.count, b0 = new Uint8Array(n), b1 = new Uint8Array(n), w1 = new Float32Array(n);
  for (const [from, to, bn] of K.ranges) {
    const bb = B[bn], L = Math.max(1e-4, len(sub(bb.b, bb.a)));
    for (let k = from; k < to; k++) {
      const d = [K.pos[k * 3] - bb.a[0], K.pos[k * 3 + 1] - bb.a[1], K.pos[k * 3 + 2] - bb.a[2]];
      const u = cl(dot(d, bb.X) / L, -0.5, 1.5);
      b0[k] = bn; b1[k] = bn; w1[k] = 0;
      if (u < 0.2 && PARENT[bn] >= 0) { b1[k] = PARENT[bn]; w1[k] = 0.5 * (1 - cl(u / 0.2, 0, 1)); }
      else if (u > 0.8 && CHILD[bn] >= 0) { b1[k] = CHILD[bn]; w1[k] = 0.5 * cl((u - 0.8) / 0.2, 0, 1); }
    }
  }
  // The lofts carry their own weights.
  for (let k = 0; k < n; k++) { const w = K.wts[k]; if (w) { b0[k] = w[0]; b1[k] = w[1]; w1[k] = w[2]; } }
  return { b0, b1, w1 };
}

// ---------------------------------------------------------------------------- the poses
const ease = (x) => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const KEYS = ['hip', 'up', 'fwd', 'chestUp', 'chestFwd', 'headUp', 'headFwd', 'handL', 'handR', 'elbowL', 'elbowR',
  'handDirL', 'handDirR', 'footL', 'footR', 'kneeL', 'kneeR', 'toeL', 'toeR'];
function full(p) {                     // fill the optional keys so every pose can be blended with every other
  p.chestUp = p.chestUp || p.up; p.chestFwd = p.chestFwd || p.fwd;
  p.headUp = p.headUp || p.chestUp; p.headFwd = p.headFwd || p.chestFwd;
  return p;
}
export function blendPose(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const o = {};
  for (const key of KEYS) o[key] = lerp3(a[key], b[key], k);
  return o;
}
const dirA = (ang) => [Math.cos(ang), Math.sin(ang), 0];          // a direction pitched up from +X
const dirF = (ang) => [Math.sin(ang), -Math.cos(ang), 0];         // the matching "front" (belly down)

// PADDLING. phase 0..1 of one full cycle of the right arm; the left is half a cycle behind.
// amp 0 = lying still, hands trailing in the water; 1 = full stroke.
function prone(phase, amp, kick) {
  const hand = (s, ph) => {
    let x, y, z, eb, hd;
    // The reach is nearly the whole arm: the hand goes in well out in front of the head, just
    // outside the rail (second pass - at 0.6 it went in beside the chin, and a surfer's-eye view
    // never saw a hand).
    if (ph < 0.55) {                 // catch and pull, under water, outside the rail
      const u = ease(ph / 0.55);
      x = lerp(0.72, -0.12, u); y = DECK - 0.06 - 0.24 * Math.sin(Math.PI * Math.min(1, ph / 0.55)); z = s * lerp(0.34, 0.4, u);
      eb = [0, 0.4, s]; hd = [0.15, -1, 0];
    } else if (ph < 0.63) {          // out of the water at the hip
      const u = (ph - 0.55) / 0.08;
      x = -0.12; y = lerp(DECK - 0.06, DECK + 0.13, u); z = s * 0.42;
      eb = [-0.3, 1, s]; hd = [-0.4, -1, 0];
    } else {                         // recovery over the water, elbow high
      const u = ease((ph - 0.63) / 0.37);
      x = lerp(-0.12, 0.72, u); y = DECK + 0.13 + 0.1 * Math.sin(Math.PI * u); z = s * (lerp(0.43, 0.34, u) + 0.05 * Math.sin(Math.PI * u));
      eb = [-0.2, 1, s * 0.7]; hd = [1, -0.4, 0];
    }
    const rest = [0.12, DECK - 0.13, s * 0.37];
    return { h: lerp3(rest, [x, y, z], amp), e: lerp3([0, 0.6, s], eb, amp), d: lerp3([0.1, -1, s * 0.2], hd, amp) };
  };
  const R_ = hand(1, phase % 1), L_ = hand(-1, (phase + 0.5) % 1);
  const a = 0.1, c = 0.3 + 0.06 * amp, hh = 0.95;
  // The body rolls a little toward the pulling arm.
  const roll = 0.08 * amp * Math.sin(phase * Math.PI * 2);
  return full({
    hip: [-0.34, DECK + 0.105, 0], up: dirA(a), fwd: [Math.sin(a), -Math.cos(a), roll],
    chestUp: dirA(c), chestFwd: [Math.sin(c), -Math.cos(c), roll * 1.5],
    headUp: dirA(hh), headFwd: dirF(hh),
    handR: R_.h, handL: L_.h, elbowR: R_.e, elbowL: L_.e, handDirR: R_.d, handDirL: L_.d,
    footR: [-1.2, DECK + 0.075 + kick, 0.085], footL: [-1.2, DECK + 0.075 - kick, -0.085],
    kneeR: [0, -1, 0.1], kneeL: [0, -1, -0.1], toeR: [-1, -0.3, 0.05], toeL: [-1, -0.3, -0.05],
  });
}

// WAITING: sitting astride, upright, looking round. look -1..1 turns the head (and a little of the
// chest). The legs tread water - a slow egg-beater, each foot circling half a turn behind the other -
// the way a surfer sitting out the back keeps the board steady and pointed.
function sit(look, t) {
  const tw = 0.25 * look, hw = 1.0 * look;
  const f0 = [1, 0.1, 0];
  const rot = (v, ang) => [v[0] * Math.cos(ang) - v[2] * Math.sin(ang), v[1], v[0] * Math.sin(ang) + v[2] * Math.cos(ang)];
  const w = t * 1.4;
  return full({
    hip: [-0.3, DECK + 0.1, 0], up: [-0.02, 1, 0], fwd: f0,
    chestUp: [0.03, 1, 0], chestFwd: rot(f0, tw),
    headUp: [0.02, 1, 0], headFwd: rot([1, -0.12, 0], hw),
    handR: [0.2, DECK + 0.07, 0.17], handL: [0.2, DECK + 0.07, -0.17], elbowR: [-0.3, 0, 1], elbowL: [-0.3, 0, -1],
    handDirR: [1, -0.4, 0.1], handDirL: [1, -0.4, -0.1],
    footR: [0.1 + 0.08 * Math.sin(w), DECK - 0.52 + 0.05 * Math.cos(w), 0.4], footL: [0.1 - 0.08 * Math.sin(w), DECK - 0.52 - 0.05 * Math.cos(w), -0.4],
    kneeR: [1, 0.2, 0.4], kneeL: [1, 0.2, -0.4],
    toeR: [0.4, -0.8, 0.2], toeL: [0.4, -0.8, -0.2],
  });
}

// THE DUCK-DIVE, in time. It is a sequence, not a pose (second pass, 26 Sep - the first was one
// held shape, and under the new underwater camera it read as someone lying on a board):
//   0-0.3 s    hands on the rails under the chest, arms straightening: the NOSE goes under
//   0.3-0.7 s  head down to the deck, the back KNEE drops onto the tail and drives it under, the
//              other leg kicks up straight behind - the board levels out, deep
//   0.7 s on   flat along the board under the wave, pulled in tight, legs together; the nose tips
//              back up as the buoyancy brings you out the back
// Returns the pose and the board's pitch (absolute: the figure owns it while diving).
function duckPush() {
  const a = 0.15, c = 0.1;
  return full({
    hip: [-0.36, DECK + 0.3, 0], up: dirA(a), fwd: [Math.sin(a), -Math.cos(a), 0],
    chestUp: dirA(c), chestFwd: [Math.sin(c), -Math.cos(c), 0], headUp: dirA(-0.3), headFwd: dirF(-0.3),
    handR: [0.3, DECK + 0.02, 0.25], handL: [0.3, DECK + 0.02, -0.25], elbowR: [-0.3, 0.2, 1], elbowL: [-0.3, 0.2, -1],
    handDirR: [1, 0, 0.3], handDirL: [1, 0, -0.3],
    footR: [-1.12, DECK + 0.1, 0.09], footL: [-1.12, DECK + 0.1, -0.09], kneeR: [0, -1, 0.1], kneeL: [0, -1, -0.1],
    toeR: [-0.3, -1, 0], toeL: [-0.3, -1, 0],
  });
}
function duckKnee() {
  const a = -0.12, c = -0.35;
  return full({
    hip: [-0.38, DECK + 0.23, 0], up: dirA(a), fwd: [Math.sin(a), -Math.cos(a), 0],
    chestUp: dirA(c), chestFwd: [Math.sin(c), -Math.cos(c), 0], headUp: dirA(-0.1), headFwd: dirF(-0.1),
    handR: [0.33, DECK + 0.03, 0.26], handL: [0.33, DECK + 0.03, -0.26], elbowR: [-0.3, 0.4, 1], elbowL: [-0.3, 0.4, -1],
    handDirR: [1, 0, 0.2], handDirL: [1, 0, -0.2],
    // The back knee on the tail, its shin up behind; the other leg straight up and back - the kick.
    footR: [-1.12, DECK + 0.3, 0.08], kneeR: [0, -1, 0],
    footL: [-1.2, DECK + 0.44, -0.08], kneeL: [0.2, -0.3, 0],                  // up and back, not upended
    toeR: [-1, 0.3, 0], toeL: [-0.6, 0.7, 0],
  });
}
function duckFlat() {
  const a = 0.02, c = 0.05;
  return full({
    hip: [-0.34, DECK + 0.1, 0], up: dirA(a), fwd: [Math.sin(a), -Math.cos(a), 0],
    chestUp: dirA(c), chestFwd: [Math.sin(c), -Math.cos(c), 0], headUp: dirA(0.25), headFwd: dirF(0.25),
    handR: [0.14, DECK + 0.0, 0.27], handL: [0.14, DECK + 0.0, -0.27], elbowR: [-0.3, 0.5, 1], elbowL: [-0.3, 0.5, -1],
    handDirR: [1, -0.3, 0], handDirL: [1, -0.3, 0],
    footR: [-1.2, DECK + 0.1, 0.07], footL: [-1.2, DECK + 0.1, -0.07], kneeR: [0, -1, 0.1], kneeL: [0, -1, -0.1],
    toeR: [-1, -0.2, 0.05], toeL: [-1, -0.2, -0.05],
  });
}
function duck(t) {
  let pose, pitch;
  if (t < 0.3) { pose = duckPush(); pitch = -0.5 * ease(t / 0.3); }
  else if (t < 0.7) { pose = blendPose(duckPush(), duckKnee(), ease((t - 0.3) / 0.2)); pitch = lerp(-0.5, -0.1, ease((t - 0.3) / 0.4)); }
  else { pose = blendPose(duckKnee(), duckFlat(), ease((t - 0.7) / 0.3)); pitch = lerp(-0.1, 0.12, ease((t - 0.7) / 0.6)); }
  return { pose, pitch };
}

// THE PUSH-UP at the start of a pop-up: hands flat on the deck under the chest, arms straightening,
// chest well up, up on the toes.
function pushUp() {
  const a = 0.14, c = 0.8;
  return full({
    hip: [-0.36, DECK + 0.15, 0], up: dirA(a), fwd: [Math.sin(a), -Math.cos(a), 0],
    chestUp: dirA(c), chestFwd: [Math.sin(c), -Math.cos(c), 0], headUp: dirA(1.2), headFwd: dirF(1.2),
    handR: [0.05, DECK + 0.02, 0.2], handL: [0.05, DECK + 0.02, -0.2], elbowR: [-0.6, 0.3, 0.5], elbowL: [-0.6, 0.3, -0.5],
    handDirR: [1, 0, 0.1], handDirL: [1, 0, -0.1],
    footR: [-1.18, DECK + 0.06, 0.085], footL: [-1.18, DECK + 0.06, -0.085], kneeR: [0, -1, 0.1], kneeL: [0, -1, -0.1],
    toeR: [-0.5, -0.9, 0], toeL: [-0.5, -0.9, 0],
  });
}
// THE TUCK between the push-up and the stance: the hips come up, the knees are drawn in under the
// chest and the feet land where the stance wants them, the hands still on the deck, the body already
// turning side-on. Without it the rider rose straight up out of the push-up like a lift.
function tuck() {
  return full({
    hip: [-0.24, DECK + 0.4, 0.04], up: [0.55, 1, 0.12], fwd: [0.6, -0.4, 0.7],
    chestUp: [0.75, 1, 0.2], chestFwd: [0.7, -0.5, 0.5], headUp: [0.2, 1, 0.05], headFwd: [1, -0.25, 0.2],
    handR: [0.12, DECK + 0.02, 0.2], handL: [0.12, DECK + 0.02, -0.16], elbowR: [-0.4, 0.4, 0.6], elbowL: [-0.4, 0.4, -0.6],
    handDirR: [1, 0, 0.1], handDirL: [1, 0, -0.1],
    footL: [0.22, DECK + 0.07, 0.0], footR: [-0.45, DECK + 0.07, 0.03],
    kneeL: [0.7, 0.3, 0.6], kneeR: [0.8, 0.3, 0.6], toeL: [0.5, 0, 0.87], toeR: [0.1, 0, 1],
  });
}

// RIDING, regular foot: left foot forward, facing the right rail (+Z, the toe side). comp 0..1 is
// how far the knees are bent; lean -1..1 is into a turn (+ toward the toes); t a little balance
// motion; pump the up-and-down of pumping for speed along a flat section (m).
//
// THE ARMS DO THE WORK (second pass): into a toe-side turn the rider drops over the toes, the
// leading hand reaches low toward the face of the wave and the trailing arm swings up behind; into a
// heel-side turn the hips sit back over the heels and both arms come forward over the toes for
// balance, the leading one pointing down the line. The head always looks where the board is going.
function stance(comp, lean, t, pump) {
  const lp = Math.max(0, lean), ln = Math.max(0, -lean);
  const open = 0.36;                                   // hips opened toward the nose
  const chestOpen = open + 0.34 - 0.3 * lean;          // the chest counter-rotates into the turn
  const bob = 0.015 * Math.sin(t * 2.3) + (pump || 0);
  // THE CROUCH. A surfer rides LOW: knees well bent (the hips 0.2-0.35 m below a straight-legged
  // stand), bent forward at the hips over the toe-side rail and a little toward the nose, the back
  // knee driven in toward the front one. The first cut stood nearly straight-legged and upright
  // and read as someone standing on a board, not riding it (close-ups, 26 Sep).
  const hipY = DECK + 0.07 + 0.8 - 0.42 * comp - 0.08 * ln + bob;
  const hip = [-0.1 + 0.03 * lean, hipY, 0.05 + 0.2 * lean - 0.06 * ln];
  const tilt = 0.32 + 0.35 * comp + 0.45 * lp - 0.12 * ln;   // bent forward over the toes, and into the turn
  const bal = 0.04 * Math.sin(t * 1.7);
  const hL = [0.48 + 0.1 * lp + 0.15 * ln, 0.14 - 0.1 * comp + bal - 0.35 * lp + 0.12 * ln, 0.3 + 0.25 * lp + 0.25 * ln];
  const hR = [-0.46 - 0.1 * lp + 0.3 * ln, 0.02 - 0.05 * comp - bal + 0.38 * lp + 0.1 * ln, 0.3 - 0.15 * lp + 0.35 * ln];
  return full({
    hip, up: [0.1, 1, tilt], fwd: [Math.sin(open), 0, Math.cos(open)],
    chestUp: [0.2, 1, tilt + 0.2], chestFwd: [Math.sin(chestOpen), -0.1, Math.cos(chestOpen)],
    headUp: [0.05, 1, 0.1], headFwd: [1, -0.2, 0.25 + 0.3 * lean],
    // Arms low and out for balance: the front one reaching toward the nose, the back one trailing.
    handL: add(hip, hL), handR: add(hip, hR),
    elbowL: [0.2, -1, 0.6], elbowR: [-0.2 + 0.3 * ln, -1, 0.6], handDirL: [1, -0.35, 0.3], handDirR: [-0.7 + 1.2 * ln, -0.6, 0.35],
    footL: [0.3, DECK + 0.07, 0.0], footR: [-0.5, DECK + 0.07, 0.03],
    kneeL: [0.6, 0.1, 0.8], kneeR: [0.75, 0.1, 0.65], toeL: [0.5, 0, 0.87], toeR: [0.1, 0, 1],
  });
}

// OFF THE BOARD: limbs spread, tumbling (the instance matrix does the tumbling).
function tumble(t) {
  const w = 0.15 * Math.sin(t * 7);
  return full({
    hip: [0, 0.05, 0], up: [1, 0.25, 0], fwd: [0.2, -1, 0.3],
    handR: [0.55, 0.3 + w, 0.45], handL: [0.5, 0.25 - w, -0.5], elbowR: [0, 1, 1], elbowL: [0, 1, -1],
    handDirR: [1, 0.3, 0.4], handDirL: [1, 0.3, -0.4],
    footR: [-0.7, -0.2 - w, 0.35], footL: [-0.75, 0.1 + w, -0.3], kneeR: [0.4, -1, 0.3], kneeL: [0.4, -1, -0.3],
    toeR: [-1, 0, 0.3], toeL: [-1, 0, -0.3],
  });
}

// ---------------------------------------------------------------------------- the figure
const LEASH_N = 12, LEASH_SEG = 4;

export class SurferFigure {
  constructor() {
    this.bind = skeleton(full({ ...BIND }));
    const K = buildBody(this.bind);
    this.bodyVerts = K.count;
    this.skin = skinOf(K, this.bind);
    this.bindPos = new Float32Array(K.pos); this.bindNrm = new Float32Array(K.nrm);
    // The leash: a tube recomputed every frame, appended after the body.
    const leashVerts = LEASH_N * (LEASH_SEG + 1);
    this.count = K.count + leashVerts;
    const idx = K.idx.slice();
    for (let i = 0; i + 1 < LEASH_N; i++) {
      for (let k = 0; k < LEASH_SEG; k++) {
        const a = K.count + i * (LEASH_SEG + 1) + k;
        idx.push(a, a + LEASH_SEG + 1, a + LEASH_SEG + 2, a, a + LEASH_SEG + 2, a + 1);
      }
    }
    this.idx = new Uint16Array(idx);
    this.tris = idx.length / 3;
    // Interleaved exactly as gl/surfers.js lays its meshes out: pos3 nrm3 col3 anim1.
    this.data = new Float32Array(this.count * 10);
    this.rough = new Float32Array(this.count);
    for (let k = 0; k < K.count; k++) {
      this.data[k * 10 + 6] = K.col[k * 3]; this.data[k * 10 + 7] = K.col[k * 3 + 1]; this.data[k * 10 + 8] = K.col[k * 3 + 2];
      this.rough[k] = -K.rough[k];
    }
    for (let k = K.count; k < this.count; k++) {
      this.data[k * 10 + 6] = COL.leash[0]; this.data[k * 10 + 7] = COL.leash[1]; this.data[k * 10 + 8] = COL.leash[2];
      this.rough[k] = -ROUGH.get(COL.leash);
    }
    this.M = new Float32Array(NB * 12);
    // Animation state - visual only, never read by the sim.
    this.phase = 0; this.amp = 0; this.sit = 0; this.stillT = 0; this.lean = 0; this.comp = 0.3;
    this.look = 0; this.lastState = -1; this.fromPose = null; this.fromT = 0; this.pose = prone(0, 0, 0); this.popT = 9; this.t = 0;
  }

  // Per drawn frame. `me` is the SurfBoard. Returns the extra pitch / drop of the board when sitting
  // (the tail sinks), which the caller applies to the board and the figure alike.
  update(me, dt) {
    dt = Math.max(0, Math.min(0.1, dt));
    this.t += dt;
    const st = me.state | 0, speed = Math.hypot(me.vx || 0, me.vz || 0);
    const thr = st === 0 ? (me.thr || 0) : 0;
    this.amp += ((thr > 0.05 ? 0.55 + 0.45 * thr : 0) - this.amp) * Math.min(1, dt * 4);
    if (this.amp > 0.02) this.phase = (this.phase + dt / (1.25 - 0.45 * thr)) % 1;
    // Sit up when not paddling outside the whitewater. NOT a speed test: the swell alone moves a
    // board lying still at 0.5-0.8 m/s, so "slow" never came true and nobody ever sat (26 Sep).
    const still = st === 0 && thr < 0.05 && ((me.wave && me.wave.foam) || 0) < 0.35;
    void speed;
    this.stillT = still ? this.stillT + dt : 0;
    this.sit += ((this.stillT > 1.2 ? 1 : 0) - this.sit) * Math.min(1, dt * 2.5);
    // Looking round while sitting - unless the first-person camera is steering the head
    // (src/surfer/pov-cam.js sets lookCtl: 0 ahead, 1 over the right shoulder).
    this.look = this.lookCtl !== null && this.lookCtl !== undefined ? this.lookCtl
      : Math.sin(this.t * 0.33) * 0.85 + 0.15 * Math.sin(this.t * 0.9);
    this.lean += (cl((me.r || 0) / 1.4, -1, 1) - this.lean) * Math.min(1, dt * 4);
    this.comp += ((0.5 + 0.4 * Math.abs(this.lean)) - this.comp) * Math.min(1, dt * 3);
    if (st === 2 && this.lastState !== 2) this.popT = 0;
    this.popT += dt;

    let target, duckPitch = null;
    if (st === 3) target = tumble(this.t);
    else if (st === 1) { const D = duck(me.stateT || 0); target = D.pose; duckPitch = D.pitch; }
    else if (st === 2) {
      // Pumping along a flat section: up and down about once a second, fading out in a turn.
      const pump = 0.045 * Math.sin(this.t * 6.3) * Math.max(0, 1 - Math.abs(this.lean) / 0.35);
      const ride = stance(this.comp, this.lean, this.t, pump);
      // The pop-up: push up, tuck the feet through, rise into the crouch - about half a second.
      const p = this.popT;
      target = p < 0.14 ? pushUp() : p < 0.3 ? blendPose(pushUp(), tuck(), ease((p - 0.14) / 0.16))
        : p < 0.55 ? blendPose(tuck(), ride, ease((p - 0.3) / 0.25)) : ride;
    } else target = blendPose(prone(this.phase, this.amp, 0.03 * this.amp * Math.sin(this.phase * Math.PI * 8)), sit(this.look, this.t), ease(this.sit));
    // Crossfade from wherever the body was when the state changed.
    if (st !== this.lastState) { this.fromPose = this.pose; this.fromT = 0; }
    this.fromT += dt;
    const xf = st === 2 ? 0.12 : st === 3 ? 0.08 : 0.3;
    this.pose = this.fromPose && this.fromT < xf && this.lastState !== 3 && st !== 3 ? blendPose(this.fromPose, target, ease(this.fromT / xf)) : target;
    this.lastState = st;
    // Diving, the figure owns the board's pitch outright (nose under, level, nose back up).
    // (Kept on the figure as `ex` too: the first-person camera carries the eyes the same way.)
    if (duckPitch !== null) { this.duckP = this.duckP === undefined ? duckPitch : this.duckP + (duckPitch - this.duckP) * Math.min(1, dt * 12); return (this.ex = { pitch: this.duckP, drop: 0, abs: true }); }
    this.duckP = undefined;
    return (this.ex = { pitch: 0.12 * ease(this.sit), drop: -0.05 * ease(this.sit) });
  }

  // THE EYES, for the first-person camera (src/surfer/pov-cam.js): the middle of the head and the way
  // the face and the crown point, from the pose as last drawn, in the board's own frame.
  eyes() {
    const B = skeleton(this.pose), hb = B[FB.HEAD], H = B.H;
    return { c: add(hb.a, H.u, R.headH * 0.5), f: H.f, u: H.u, deck: DECK };
  }

  // Skin the body and rebuild the leash into this.data. `leash` false hides it (a wipeout: the
  // board and the swimmer are drawn apart).
  write(leash) {
    const B = skeleton(this.pose), bd = this.bind, M = this.M;
    for (let i = 0; i < NB; i++) {
      const b0 = bd[i], b1 = B[i], o = i * 12;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) M[o + r * 3 + c] = b1.X[r] * b0.X[c] + b1.Y[r] * b0.Y[c] + b1.Z[r] * b0.Z[c];
      for (let r = 0; r < 3; r++) M[o + 9 + r] = b1.a[r] - (M[o + r * 3] * b0.a[0] + M[o + r * 3 + 1] * b0.a[1] + M[o + r * 3 + 2] * b0.a[2]);
    }
    const { b0, b1, w1 } = this.skin, P = this.bindPos, N = this.bindNrm, D = this.data;
    for (let k = 0; k < this.bodyVerts; k++) {
      const x = P[k * 3], y = P[k * 3 + 1], z = P[k * 3 + 2], nx = N[k * 3], ny = N[k * 3 + 1], nz = N[k * 3 + 2];
      const a = b0[k] * 12, w = w1[k];
      let px = M[a] * x + M[a + 1] * y + M[a + 2] * z + M[a + 9];
      let py = M[a + 3] * x + M[a + 4] * y + M[a + 5] * z + M[a + 10];
      let pz = M[a + 6] * x + M[a + 7] * y + M[a + 8] * z + M[a + 11];
      let mx = M[a] * nx + M[a + 1] * ny + M[a + 2] * nz;
      let my = M[a + 3] * nx + M[a + 4] * ny + M[a + 5] * nz;
      let mz = M[a + 6] * nx + M[a + 7] * ny + M[a + 8] * nz;
      if (w > 0) {
        const b = b1[k] * 12, v = 1 - w;
        px = px * v + w * (M[b] * x + M[b + 1] * y + M[b + 2] * z + M[b + 9]);
        py = py * v + w * (M[b + 3] * x + M[b + 4] * y + M[b + 5] * z + M[b + 10]);
        pz = pz * v + w * (M[b + 6] * x + M[b + 7] * y + M[b + 8] * z + M[b + 11]);
        mx = mx * v + w * (M[b] * nx + M[b + 1] * ny + M[b + 2] * nz);
        my = my * v + w * (M[b + 3] * nx + M[b + 4] * ny + M[b + 5] * nz);
        mz = mz * v + w * (M[b + 6] * nx + M[b + 7] * ny + M[b + 8] * nz);
      }
      const l = Math.hypot(mx, my, mz) || 1, q = k * 10;
      D[q] = px; D[q + 1] = py; D[q + 2] = pz; D[q + 3] = mx / l; D[q + 4] = my / l; D[q + 5] = mz / l; D[q + 9] = this.rough[k];
    }
    // The leash, back (right) ankle to the tail plug, sagging onto the deck.
    const ank = B[FB.FOOT_R].a, base = this.bodyVerts * 10;
    for (let i = 0; i < LEASH_N; i++) {
      const u = i / (LEASH_N - 1);
      let p = lerp3(ank, TAIL, u);
      p[1] = Math.max(DECK + 0.008, p[1] - 0.09 * Math.sin(Math.PI * u));
      const nx = Math.min(LEASH_N - 1, i + 1), pv = Math.max(0, i - 1);
      const tn = unit(sub(lerp3(ank, TAIL, nx / (LEASH_N - 1)), lerp3(ank, TAIL, pv / (LEASH_N - 1))));
      const n1 = unit(cross(Math.abs(tn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], tn)), n2 = cross(tn, n1);
      const r = leash ? 0.0055 : 0;
      for (let k = 0; k <= LEASH_SEG; k++) {
        const ang = (k / LEASH_SEG) * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
        const d = [n1[0] * c + n2[0] * s, n1[1] * c + n2[1] * s, n1[2] * c + n2[2] * s];
        const q = base + (i * (LEASH_SEG + 1) + k) * 10;
        D[q] = p[0] + d[0] * r; D[q + 1] = p[1] + d[1] * r; D[q + 2] = p[2] + d[2] * r;
        D[q + 3] = d[0]; D[q + 4] = d[1]; D[q + 5] = d[2]; D[q + 9] = this.rough[this.bodyVerts + i * (LEASH_SEG + 1) + k];
      }
    }
    return this.data;
  }
}
