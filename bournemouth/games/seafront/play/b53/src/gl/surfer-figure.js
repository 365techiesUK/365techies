// THE PLAYER'S SURFER, AS A PERSON (26 Sep 2026). The owner, after playing PIER SURF live: "we
// need to do quite a bit of work on the actual surfer ... make them a lot more realistic".
//
// Until now the player was drawn with the line-up's scenery figures (gl/surfers.js): three rigid
// meshes - lying, standing, a loose board - posed by one instance matrix each, so the rider could
// not bend a knee, reach for the water or turn their head. At 5-7 m from the camera that reads as a
// doll. This is a JOINTED figure instead, built the way the jet ski's rider is (gl/boat-rider.js):
// a 16-bone skeleton (22 since stage 4: the fingers and thumbs) solved every frame (two-bone IK at
// every elbow and knee, lengths held exactly), one mesh built once in a bind pose, and the vertices
// skinned on the CPU (~3k of them - less work than the wake does). The line-up keeps its cheap
// figures: they are 30-200 m away.
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
//   * A WIPEOUT (third pass, 27 Sep) - thrown off the heel side, held under in the white water
//     tucked up, surfacing to tread water, reeling the board in on the leash and climbing back on
//     over the tail. See wipeBoard() and SurferFigure._wipe().
//   * THE LEASH - a cord from the back ankle to the tail, with a little sag (across the water to the
//     board in a wipeout).
//   * THE LINE-UP (third pass) - the same figure for the nearest line-up surfers, goofy or regular,
//     its lean, crouch and arms eased by springs and shaped by the move they are riding (carve,
//     snap, cutback, floater), kneeling to lie down after a ride, spinning the board round sitting up.
//
// THE RULES gl/surfers.js keeps apply here too: nobody is real and nothing is branded - a plain
// dark wetsuit, no logo, no face. No Math.random.
//
// STAGE 4, BETTER PEOPLE (27 Sep 2026, the PIER SURF revamp; the figure half - the renderer's half
// is in gl/surfers.js). Shoulders without the fin the arm's root pushed out of the trunk; one lofted
// head with a brow, cheekbones, a chin and a nose as shape only (still no eyes, no mouth); the hair
// down to the nape and an optional neoprene hood; hands with a palm, four two-segment fingers and a
// thumb, cupped to paddle and relaxed to ride; feet with a flat sole, a heel, an arch and a toe
// box; flatlock seams; all paid for by thinner tubes (LOD1 7,020 -> 5,940 vertices). The
// numbers are with each piece in buildBody(); the suite is tmp-tr161/suites-live/test-surf-figure.mjs.
//
// THE MATERIAL IDS (FIG_MAT below - gl/surfers.js decodes them, so this table is shared). Every
// figure vertex carries its material in the vertex buffer's aAnim slot, NEGATIVE (a negative aAnim
// is what marks the jointed figures to that shader):
//     aAnim = -(id * 2 + rough), rough clamped to [0, 1.9];  v = -aAnim: id = floor(v / 2), rough = v - 2 id
//   id  material                                   default colour  rough
//    0  suit - the fabric-lined body                #252A30         0.84
//    1  chest and back panel - smooth-skin          #1A1E23         0.62
//    2  knee pads                                   #353B42         0.93
//    3  seams - flatlock, zip, collar, cuffs        #131518         0.70
//    4  skin (and the eye-line band, 12% darker)    #C8A183         0.50
//    5  hair                                        #3A2A1F         0.55
//    6  leash                                       #2A3036         0.50
//    7  hood - neoprene, ALWAYS in the mesh over    #252A30         0.80
//       the hair; the renderer draws it only for a look with a hood, and discards it otherwise
//    8  the sole - the underside of the foot       #C8A183         0.50  (drawn as skin by default)
// The vertex colours are these defaults: a figure with no look set draws exactly them.
//
// FRAME: the board's own - +X to the nose, +Y up, +Z to the right rail, y 0 = the board's centre
// plane (its deck is at DECK). gl/surfers.js draws the figure with the board's instance matrix, so
// the figure moves, pitches and rolls with the board for free.

import { MeshBuilder, RIDER } from './meshes.js';
import { V3, blob, sweep, cross, sc, cl } from './boat-meshes.js';

const add = V3.add, sub = V3.sub, dot = V3.dot, unit = V3.unit, len = V3.len;
const R = RIDER;
const DECK = 0.056;                    // board deck height above its centre plane (surfers.js BRD_HT + a skin)
// THE LEASH PLUG (27 Sep 2026): on the stringer, 11 cm in from the tail, just proud of the deck -
// where a real one is set. It was at [-1.0, DECK + 0.01, 0.03]: 3 cm PAST the tail (the board ends
// at x -0.97, surfers.js BRD_CX - BRD_HL) and 3 cm off the stringer, so the cord's last segment hung
// in the air off the end and drew as a broken, dashed line in the ride view (the PIER SURF audit).
const TAIL = [-0.86, DECK + 0.01, 0];
// BOARDS (27 Sep 2026, PIER SURF stage 5): that is the foamie's plug. On another hull gl/surfers.js sets
// the figure's `tailAt` to its own ([x, y, 0], 1 cm proud of that hull's deck as it is built); unset or
// null, TAIL - so a figure nobody tells draws exactly as it did. It is configuration, set every frame
// by the renderer, not animation state (surfer/replay.js FIG_STATE need not carry it).

const hex = (h) => { const n = parseInt(h.slice(1), 16); const f = (c) => Math.pow(c / 255, 2.2); return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)]; };
// A plain dark wetsuit made the way they are: a dull fabric-lined body, a smooth-skin chest and back
// panel that holds a film of water (the only glossy part), textured knee pads, dark seams.
// STAGE 4 (27 Sep 2026): the panel a shade darker, #1A1E23 (was #1D2126) - smooth-skin neoprene
// under a film of water reads darker than the jersey round it - and the seams are now where a
// suit's flatlocks run: down both sides, round the panel, under each arm, down the outside of each
// leg and round the knee pads, as well as the zip, collar and cuffs.
const COL = {
  suit: hex('#252A30'), chest: hex('#1A1E23'), knee: hex('#353B42'), seam: hex('#131518'),
  skin: hex('#C8A183'), hair: hex('#3A2A1F'), leash: hex('#2A3036'),
};
// ROUGHNESS per material, carried to gl/surfers.js's shader in a NEGATIVE aAnim (its own figures
// use 0/1/2 there, so their look cannot change). The shared constant is 0.09 - a mirror-wet
// board - and on a whole body it read as latex: every tube edge a highlight (26 Sep). The second
// pass took the fabric body further (0.66 still put a hot spot on every curve at a close-up).
// Stage 4 packs the material's id in with it (the table at the top of the file): the renderer's
// looks recolour a surfer by material, per instance, without a second vertex attribute.
export const FIG_MAT = Object.freeze({ suit: 0, chest: 1, knee: 2, seam: 3, skin: 4, hair: 5, leash: 6, hood: 7, sole: 8 });
export const figAnim = (id, rough) => -(id * 2 + Math.min(1.9, Math.max(0, rough)));
const mat = (id, col, rough) => ({ id, col, rough, anim: figAnim(id, rough) });
const MAT = {
  suit: mat(FIG_MAT.suit, COL.suit, 0.84), chest: mat(FIG_MAT.chest, COL.chest, 0.62), knee: mat(FIG_MAT.knee, COL.knee, 0.93),
  seam: mat(FIG_MAT.seam, COL.seam, 0.7), skin: mat(FIG_MAT.skin, COL.skin, 0.5),
  // The band across the eyes, 12% darker: the shade of the brow over the sockets, which is what
  // makes a face read as one at 5 m. There are no eyes.
  eyes: mat(FIG_MAT.skin, COL.skin.map((c) => c * 0.88), 0.5),
  hair: mat(FIG_MAT.hair, COL.hair, 0.55), leash: mat(FIG_MAT.leash, COL.leash, 0.5),
  hood: mat(FIG_MAT.hood, COL.suit, 0.8), sole: mat(FIG_MAT.sole, COL.skin, 0.5),
};

// ---------------------------------------------------------------------------- the skeleton
// Stage 4 adds three bones a hand (16-21): the four fingers' first segments together (FING), their
// second (TIP) and the thumb. The first sixteen are as they were, so every index a tool reads holds.
export const FB = {
  PELVIS: 0, CHEST: 1, NECK: 2, HEAD: 3,
  THIGH_L: 4, SHIN_L: 5, FOOT_L: 6, THIGH_R: 7, SHIN_R: 8, FOOT_R: 9,
  UARM_L: 10, FARM_L: 11, HAND_L: 12, UARM_R: 13, FARM_R: 14, HAND_R: 15,
  FING_L: 16, TIP_L: 17, THUMB_L: 18, FING_R: 19, TIP_R: 20, THUMB_R: 21,
};
const NB = 22;
const PARENT = [-1, 0, 1, 2, 0, 4, 5, 0, 7, 8, 1, 10, 11, 1, 13, 14, 12, 16, 12, 15, 19, 15];
const CHILD = [1, 2, 3, -1, 5, 6, -1, 8, 9, -1, 11, 12, 16, 14, 15, 19, 17, -1, -1, 20, -1, -1];

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
// v turned by ang about the unit axis n (right-handed).
function rotv(v, n, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), d = dot(n, v) * (1 - c), x = cross(n, v);
  return [v[0] * c + x[0] * s + n[0] * d, v[1] * c + x[1] * s + n[1] * d, v[2] * c + x[2] * s + n[2] * d];
}
const turn = (F, n, ang) => ({ X: rotv(F.X, n, ang), Y: rotv(F.Y, n, ang), Z: rotv(F.Z, n, ang) });

// THE HAND'S OWN BONES (stage 4, 27 Sep 2026). In the HAND bone's frame X runs down the hand, +Y is
// the back of it (the palm faces -Y: in the paddling pull the palm faces back against the water) and
// the thumb is on the -s*Z side (s +1 right, -1 left). The four fingers bend together about the
// knuckle line - one bone for their first segments, one for the rest - and the thumb swings across
// the palm about the hand's own length. `g`, a hand's grip, drives both: 0 flat on the deck, 0.2
// cupped to paddle, 0.45 relaxed, 0.85 holding a rail.
const KNUCKLE = 0.095, FING1 = 0.044;              // wrist to knuckle line; the first segment
const GRIP_REST = [0.45, 0.45, 0];
function handBones(B, s, g) {
  const Hb = B[s > 0 ? FB.HAND_R : FB.HAND_L], F = s > 0 ? FB.FING_R : FB.FING_L;
  const k = add(add(Hb.a, Hb.X, KNUCKLE), Hb.Y, -0.002);
  const f1 = turn(Hb, Hb.Z, -(0.08 + 1.05 * g)), f2 = turn(f1, f1.Z, -(0.1 + 1.25 * g));
  const pip = add(k, f1.X, FING1);
  B[F] = { a: k, b: pip, X: f1.X, Y: f1.Y, Z: f1.Z };
  B[F + 1] = { a: pip, b: add(pip, f2.X, 0.05), X: f2.X, Y: f2.Y, Z: f2.Z };
  // The thumb: 26 deg out from the hand in the palm's plane and dipped toward it, then turned across
  // the palm (opposed) by the grip.
  let t = turn(Hb, Hb.Y, s * 0.45);
  t = turn(t, t.Z, -0.15);
  t = turn(t, Hb.X, -s * 0.9 * g);
  const tp = add(add(add(Hb.a, Hb.X, 0.018), Hb.Z, -s * 0.016), Hb.Y, -0.006);
  B[F + 2] = { a: tp, b: add(tp, t.X, 0.104), X: t.X, Y: t.Y, Z: t.Z };
}

// Exported for tools that ask where the joints really are (tmp-tr205/hands.mjs: can the first-person
// camera see the hands paddle?).
export function skeleton(p) {
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
  const g = p.grip || GRIP_REST;
  handBones(B, 1, g[1]); handBones(B, -1, g[0]);
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
// (smooth weights), so a knee bends the way a knee does. The head, hands and feet were shaped pieces
// carried by their own bones; since stage 4 (27 Sep 2026) they are lofts and sheets as well, with
// weights of their own (the fingers bend at two joints each).
class Kit {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.anim = []; this.idx = []; this.ranges = []; this.wts = []; this.parts = {}; }
  // A shaped rigid piece, every vertex on one bone (skinOf gives its ends a little blend), or given
  // weights w ([b0, b1, share]).
  add(mk, boneId, fn, w = null) {
    const m = new MeshBuilder(), M = MAT[mk];
    fn(m);
    const base = this.pos.length / 3;
    for (let i = 0; i < m.v.length; i += 3) {
      this.pos.push(m.v[i], m.v[i + 1], m.v[i + 2]);
      this.nrm.push(m.n[i], m.n[i + 1], m.n[i + 2]);
      this.col.push(M.col[0], M.col[1], M.col[2]);
      this.anim.push(M.anim);
      this.wts.push(w);
    }
    for (const k of m.i) this.idx.push(base + k);
    this.ranges.push([base, this.pos.length / 3, boneId]);
  }
  // Where each named part's vertices are (tools and the suite count them).
  part(name, fn) { const a = this.count; fn(); (this.parts[name] || (this.parts[name] = [])).push([a, this.count]); }
  get count() { return this.pos.length / 3; }
}

// A SHEET (stage 4): rows x cols vertices joined into quads - every row a ring (closed), or every
// row an open arc (a ring cut open: where its two ends meet they share one normal). vert(i, j) ->
// { p, m: a MAT key, w: [b0, b1, share] }. Normals are smoothed from the triangles and turned away
// from inside(i), a point inside row i; the winding follows them.
function sheet(K, rows, cols, closed, vert, inside) {
  const base = K.count;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const v = vert(i, j), M = MAT[v.m];
    K.pos.push(v.p[0], v.p[1], v.p[2]); K.nrm.push(0, 0, 0);
    K.col.push(M.col[0], M.col[1], M.col[2]); K.anim.push(M.anim);
    K.wts.push(v.w);
  }
  const tri = [], jn = closed ? cols : cols - 1;
  for (let i = 0; i + 1 < rows; i++) for (let j = 0; j < jn; j++) {
    const v = base + i * cols + j, u = base + i * cols + (j + 1) % cols;
    tri.push(v, v + cols, u + cols, v, u + cols, u);
  }
  const P = K.pos, N = K.nrm;
  for (let t = 0; t < tri.length; t += 3) {
    const i0 = tri[t] * 3, i1 = tri[t + 1] * 3, i2 = tri[t + 2] * 3;
    const n = cross([P[i1] - P[i0], P[i1 + 1] - P[i0 + 1], P[i1 + 2] - P[i0 + 2]], [P[i2] - P[i0], P[i2 + 1] - P[i0 + 1], P[i2 + 2] - P[i0 + 2]]);
    for (const q of [i0, i1, i2]) { N[q] += n[0]; N[q + 1] += n[1]; N[q + 2] += n[2]; }
  }
  if (!closed) for (let i = 0; i < rows; i++) {
    const a = (base + i * cols) * 3, b = (base + i * cols + cols - 1) * 3;
    if (Math.abs(P[a] - P[b]) + Math.abs(P[a + 1] - P[b + 1]) + Math.abs(P[a + 2] - P[b + 2]) < 1e-7) {
      for (let d = 0; d < 3; d++) { const t = N[a + d] + N[b + d]; N[a + d] = t; N[b + d] = t; }
    }
  }
  let out = 0;
  for (let i = 0; i < rows; i++) {
    const c = inside(i);
    for (let j = 0; j < cols; j++) {
      const q = (base + i * cols + j) * 3;
      out += (P[q] - c[0]) * N[q] + (P[q + 1] - c[1]) * N[q + 1] + (P[q + 2] - c[2]) * N[q + 2];
    }
  }
  const f = out < 0 ? -1 : 1;
  for (let v = base; v < K.count; v++) {
    const q = v * 3, l = (Math.hypot(N[q], N[q + 1], N[q + 2]) || 1) * f;
    N[q] /= l; N[q + 1] /= l; N[q + 2] /= l;
  }
  for (let t = 0; t < tri.length; t += 3) {
    if (f > 0) K.idx.push(tri[t], tri[t + 1], tri[t + 2]); else K.idx.push(tri[t], tri[t + 2], tri[t + 1]);
  }
}

// WHERE A LOFT PUTS ITS RINGS (stage 4, 27 Sep 2026). `step` apart as before - except `dense` apart
// within `span` of a joint (zones: [[s, span, dense]]), where the outline bends and needs them - and
// a ring at each station in `at`, where a seam or a cuff changes the paint. Between two fixed rings
// the rest are spread by that density so no gap is wider than its step. Rings every 12-18 mm down a
// whole limb were most of the old figure's 7,020 vertices; it is the knee that needs them, not the
// shin.
function stations(s0, s1, step, zones = [], at = []) {
  const dens = (s) => { let d = step; for (const [c, span, dense] of zones) if (Math.abs(s - c) < span) d = Math.min(d, dense); return d; };
  const fix = [...new Set([s0, ...at.filter((e) => e > s0 && e < s1), s1])].sort((x, y) => x - y), S = [s0];
  for (let i = 0; i + 1 < fix.length; i++) {
    const a = fix[i], b = fix[i + 1], N = 64, cum = [0];
    for (let k = 1; k <= N; k++) cum.push(cum[k - 1] + (b - a) / N / dens(a + (b - a) * (k - 0.5) / N));
    const n = Math.max(1, Math.ceil(cum[N] - 1e-6));
    for (let r = 1, k = 1; r < n; r++) {
      const u = cum[N] * r / n;
      while (cum[k] < u) k++;
      S.push(a + (b - a) * (k - 1 + (u - cum[k - 1]) / (cum[k] - cum[k - 1])) / N);
    }
    S.push(b);
  }
  return S;
}
const ringAngles = (n) => Array.from({ length: n }, (_, k) => (k / n) * Math.PI * 2);
// A ring of angles from its first half (0 .. just under pi), mirrored: dense where the half is.
const mirrored = (half) => [...half, Math.PI, ...half.slice(1).reverse().map((a) => 2 * Math.PI - a)];

// A LOFT: one continuous surface along a path in the bind pose. at(s) -> { c, A, B }, the centre
// and the two section axes at arc length s; prof(s) -> { a, b, oa }, the radii along A and B and an
// offset along A (a calf, a seat); paint(s, ang) -> a MAT key (ang 0 = +A); weigh(s, ang, xy) ->
// [b0, b1, w], the two bones and the second one's share. The rings are `step` apart from s0 to s1,
// or at `stations`; `seg` evenly round, or at `angles`. shape(s, ang, prof) -> [x, y], optional: the
// point along A and B, for a section that is not an ellipse (a flat sole, a knuckle ridge).
function loft(K, { s0, s1, step, stations: st, seg, angles, at, prof, paint, weigh, shape }) {
  let S = st;
  if (!S) { const rings = Math.max(2, Math.round((s1 - s0) / step) + 1); S = Array.from({ length: rings }, (_, i) => s0 + (s1 - s0) * i / (rings - 1)); }
  const G = angles || ringAngles(seg);
  const F = S.map((s) => at(s)), R = S.map((s) => prof(s));
  sheet(K, S.length, G.length, true, (i, j) => {
    const s = S[i], ang = G[j], { c, A, B } = F[i], pr = R[i];
    const xy = shape ? shape(s, ang, pr) : [pr.oa + pr.a * Math.cos(ang), pr.b * Math.sin(ang)];
    return { p: add(add(c, A, xy[0]), B, xy[1]), m: paint(s, ang), w: weigh(s, ang, xy) };
  }, (i) => F[i].c);
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
  // The hands are built part-closed (a paddler's cup): flat on the deck and round a rail are then
  // both a fair way from the shape the fingers were made in, not all of the way - a smooth-skinned
  // joint pinches more the further it turns from its bind.
  grip: [0.3, 0.3, 0],
};

const bell = (x, c, w) => { const d = (x - c) / w; return d * d < 1 ? (1 - d * d) * (1 - d * d) : 0; };
// Straight lines through [x, y] points, x ascending.
const pwl = (pts) => (x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return pts[pts.length - 1][1];
};
// Catmull-Rom through keys [s, v1, v2 ...], every field (keyed() is its three-radii form).
function curve(keys) {
  return (s) => {
    let i = 0;
    while (i + 2 < keys.length && s > keys[i + 1][0]) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    const t = cl((s - k1[0]) / Math.max(1e-6, k2[0] - k1[0]), 0, 1), o = [];
    for (let j = 1; j < k1.length; j++) o.push(0.5 * (2 * k1[j] + (k2[j] - k0[j]) * t + (2 * k0[j] - 5 * k1[j] + 4 * k2[j] - k3[j]) * t * t + (3 * k1[j] - k0[j] - 3 * k2[j] + k3[j]) * t * t * t));
    return o;
  };
}
const absAng = (ang) => Math.abs(ang > Math.PI ? ang - 2 * Math.PI : ang);

// ---- THE HEAD (stage 4, 27 Sep 2026) --------------------------------------------------------------
// It was a skull, a face, a jaw, a nose and two ears as separate blobs, plus three hair clumps: 926
// vertices that read at a close-up as a lumpy ball with a ball on the front (tmp-audit/look/head.png).
// Now ONE loft on the HEAD bone, 14 round (dense across the face) by 19 up, whose sections are the
// head's own: flat across the face, round at the back, the skull's base tucked in over the nape.
// Everything a face has is SHAPE on it - a brow over two shallow hollows, cheekbones, a chin set
// 1 cm behind the brow, a nose - and the band across the eyes is painted 12% darker. There are no
// eyes and no mouth: nobody is real. Head-local coordinates: h up the bone from its middle (where
// eyes() puts the lens), f toward the face, w to the right; 0.24 tall, 0.2 deep, 0.158 wide
// (RIDER.headH/D/W). HEAD_KEYS: [h, the section's front, its back (both from the bone's line), its
// half-width]; the first and last are points (the chin's underside, the crown).
const HEAD_KEYS = [
  [-0.123, 0.056, -0.044, 0.004], [-0.116, 0.068, -0.036, 0.022], [-0.106, 0.074, -0.02, 0.036], [-0.094, 0.077, 0.012, 0.047],
  [-0.078, 0.083, 0.04, 0.056], [-0.062, 0.087, 0.066, 0.062], [-0.046, 0.089, 0.082, 0.067], [-0.03, 0.089, 0.092, 0.071],
  [-0.014, 0.089, 0.1, 0.075], [0.002, 0.089, 0.105, 0.077], [0.014, 0.09, 0.108, 0.079], [0.028, 0.089, 0.108, 0.079],
  [0.05, 0.084, 0.105, 0.077], [0.075, 0.074, 0.097, 0.072], [0.095, 0.058, 0.083, 0.062], [0.107, 0.04, 0.064, 0.048], [0.114, 0.022, 0.044, 0.03],
  [0.118, -0.008, 0.008, 0],
];
const HEADK = curve(HEAD_KEYS);
const HEAD_ANG1 = mirrored([0, 0.22, 0.5, 0.85, 1.3, 1.9, 2.55]), HEAD_ANG2 = mirrored([0, 0.35, 0.9, 1.6, 2.4]);
const HEAD_ROWS1 = [-0.123, -0.114, -0.104, -0.094, -0.081, -0.068, -0.056, -0.047, -0.038, -0.026, -0.013, 0, 0.013, 0.027, 0.046, 0.067, 0.088, 0.105, 0.118];
const HEAD_ROWS2 = [-0.123, -0.104, -0.081, -0.056, -0.038, -0.013, 0, 0.027, 0.067, 0.105, 0.118];
// The nose's profile at the middle of the face: from the bridge down to its tip (1.5 cm proud) and
// back in under it at a slant, a third as proud either side of the middle. Shape only. (2.6 cm was a beak; and
// a steep underside across three columns of vertices shaded as a dark oval where a mouth would be.)
const NOSE = pwl([[-0.062, 0], [-0.052, 0.003], [-0.044, 0.008], [-0.036, 0.013], [-0.026, 0.015], [-0.013, 0.011], [0, 0.006], [0.01, 0]]);
function faceBump(h, a) {
  let d = 0;
  if (a < 0.11) d += NOSE(h) + 0.0035 * bell(h, -0.097, 0.012);                                  // nose, chin
  else if (a < 0.33) d += 0.3 * NOSE(h) + 0.002 * bell(h, -0.097, 0.012);                       // its sides
  d += 0.004 * bell(h, 0.014, 0.012) * bell(a, 0.5, 0.45);       // the brow
  d -= 0.005 * bell(h, 0, 0.011) * bell(a, 0.5, 0.3);            // the hollows under it (no eyes in them)
  d += 0.004 * bell(h, -0.014, 0.03) * bell(a, 0.85, 0.4);       // the cheekbones
  return d;
}
// The head's section at height h, the point at angle ang round it (0 the face, pi/2 the right ear).
function headFW(h, ang, feat) {
  const k = HEADK(h), F = k[0], Bk = k[1], W = Math.max(0, k[2]);
  const c = Math.cos(ang), s = Math.sin(ang), cf = (F - Bk) / 2, r = Math.max(0, (F + Bk) / 2);
  let f = cf + r * Math.sign(c) * Math.pow(Math.abs(c), c > 0 ? 0.62 : 1), w = W * Math.sign(s) * Math.pow(Math.abs(s), 0.85);
  if (feat) { const d = faceBump(h, absAng(ang)); f += d * c; w += d * s; }
  return [f, w];
}
// THE HAIR: short and wet, a cap 2.5-5.5 mm over the skull from the crown to a hairline that is a
// hairline - up off the forehead, down past the temples, over the tops of the ears and down BEHIND
// them to the nape (it stopped short of the ears; the clumps on top are gone). The rings near the
// crown are level (following the hairline all the way up peaked the crown into a point).
const HAIR_ANG1 = mirrored([0, 0.22, 0.5, 0.85, 1.3, Math.PI / 2, 1.9, 2.55]);
const hairEdge = pwl([[0, 0.064], [0.5, 0.064], [0.85, 0.052], [1.3, 0.03], [Math.PI / 2, 0.024], [1.9, -0.02], [2.55, -0.055], [Math.PI, -0.068]]);
const HAIR_TOP1 = [0.118, 0.113, 0.104, 0.09], HAIR_TOP2 = [0.118, 0.1], HAIR_N1 = 11, HAIR_N2 = 5;
// THE HOOD (optional - FIG_MAT.hood): neoprene 12 mm out over the hair from the crown down to the
// collar, pulled in to the skin round an oval face opening (brow to under the chin, cheek to cheek),
// eased out over the ears, and below the skull draped straight to the neck instead of following
// the jaw in. It is always in the mesh; the renderer draws it only for a look that has one.
// Its rows close up round the top and bottom of the opening, and its columns are dense across the
// face (the head's) and pulled onto the opening's rim inside it: an opening that closed in one row
// step drew its top edge as long triangles that cut into the forehead - a slit showing the hair.
const HOOD_ROWS1 = [-0.14, -0.128, -0.116, -0.107, -0.1, -0.09, -0.078, -0.062, -0.046, -0.03, -0.014, 0.002, 0.018, 0.03, 0.04, 0.047, 0.056, 0.082, 0.105, 0.118];
const HOOD_ROWS2 = [-0.14, -0.116, -0.1, -0.078, -0.046, -0.014, 0.018, 0.04, 0.056, 0.095, 0.118];
const HOOD_ANG1 = [...HAIR_ANG1, 2 * Math.PI], HOOD_ANG2 = [...HEAD_ANG2, 2 * Math.PI];   // a column over each ear, as the hair has
const hoodOpen = (h) => h > -0.108 && h < 0.05 ? 1.0 * Math.sqrt(Math.max(0, 1 - Math.pow((h + 0.029) / 0.079, 4))) : 0;
function hoodFW(h, ang, off) {
  const hh = Math.max(h, HEAD_KEYS[0][0]), [f0, w0] = headFW(hh, ang, false);
  const df = f0 + 0.008, dh = hh + 0.005, L = Math.hypot(df, dh, w0) || 1;
  let f = f0 + df / L * off, hq = hh + dh / L * off, w = w0 + w0 / L * off;
  if (h < -0.04) {
    const fc = 0.009 + 0.01 * smooth(-0.14, -0.1, h), c = Math.cos(ang), sn = Math.sin(ang), k = smooth(-0.14, -0.07, h);
    const tf = fc + (c > 0 ? 0.058 : lerp(0.06, 0.078, k)) * c, tw = lerp(0.062, 0.072, k) * sn;
    if (Math.hypot(tf - fc, tw) > Math.hypot(f - fc, w)) { f = tf; w = tw; hq = h; }
  }
  return [f, hq, w];
}

// ---- THE HANDS (stage 4) ------------------------------------------------------------------------
// Each finger: [how far toward the thumb its knuckle is (m), its second segment's length, its
// thickness, how far it is spread toward the thumb (rad)]. The first segments are all FING1 long
// (they share a bone); the little finger is the thinnest and shortest.
const FINGERS = [[0.029, 0.043, 1, 0.05], [0.0095, 0.051, 1.02, 0], [-0.0095, 0.047, 0.97, -0.05], [-0.028, 0.031, 0.85, -0.12]];

// ---- THE FEET (stage 4): [x forward of the ankle joint, the top, the sole (up from the ankle), the
// half-width, how far the section sits toward the big toe]. The sole is flat 7.5 cm under the ankle;
// the ends are points (the back of the heel, the tip of the big toe).
const FOOT_KEYS = [
  [-0.07, -0.045, -0.045, 0, 0], [-0.062, -0.014, -0.068, 0.02, 0], [-0.045, 0, -0.075, 0.03, 0], [-0.018, 0.016, -0.075, 0.038, 0],
  [0.02, 0.014, -0.075, 0.038, 0.001], [0.06, -0.006, -0.075, 0.04, 0.002], [0.1, -0.026, -0.075, 0.045, 0.002], [0.14, -0.041, -0.075, 0.047, 0.001],
  [0.17, -0.047, -0.075, 0.043, 0.004], [0.192, -0.052, -0.073, 0.034, 0.009], [0.204, -0.058, -0.069, 0.02, 0.015], [0.208, -0.063, -0.063, 0, 0.018],
];
const FOOTK = curve(FOOT_KEYS);

function buildBody(B, lod = 1) {
  const q = (n) => lod === 1 ? n : Math.max(6, Math.round(n / lod));   // fewer facets for a line-up figure
  const L1 = lod === 1, K = new Kit();
  const Hf = B.H, FRONT = [1, 0, 0];
  const bx = (F) => ({ X: F.f, Y: F.u, Z: F.r });      // blob axes: X front, Y up, Z right
  // THINNER TUBES (stage 4, 27 Sep 2026): rings 12-13 mm apart only within 10 cm of a knee and
  // 7 cm of an elbow, where the outline bends, and 26-28 mm apart everywhere else (they were 14-18
  // mm apart everywhere) - the trunk, legs and arms 5,320 -> 3,960 vertices, which pay for the hands
  // (376 -> 628) and feet (370 -> 288 - they were blobs). A few rings more are set where a seam or cuff changes the paint.
  // ---- THE TRUNK AND NECK: one surface from the crotch up into the head. s is height above the hip
  // joints; a is front-to-back, b side to side. A seat behind, a waist, a chest, shoulders that slope
  // to the arms, a neck. The suit's smooth-skin panel over chest and back, the zip down the spine,
  // flatlock seams down the sides and round the panel, a collar, and skin above it.
  K.part('trunk', () => loft(K, {
    stations: stations(-0.105, 0.665, 0.026 * lod, [], L1 ? [0.215, 0.578, 0.588, 0.604, 0.612] : [0.588, 0.604]), seg: q(32),
    at: chain([B[FB.PELVIS], B[FB.CHEST], B[FB.NECK]], FRONT, 0.03),
    prof: keyed([[-0.105, 0.02, 0.03], [-0.085, 0.07, 0.1, -0.005], [-0.05, 0.1, 0.15, -0.012], [0.0, 0.112, 0.172, -0.012],
      [0.06, 0.108, 0.168, -0.006], [0.15, 0.098, 0.148, 0], [0.24, 0.104, 0.155, 0.004], [0.32, 0.116, 0.168, 0.01],
      [0.4, 0.12, 0.178, 0.012], [0.46, 0.108, 0.19, 0.004], [0.5, 0.086, 0.162, 0], [0.53, 0.066, 0.1, 0.002],
      [0.56, 0.056, 0.06, 0.006], [0.61, 0.053, 0.055, 0.01], [0.665, 0.05, 0.05, 0.01]]),
    paint: (s, ang) => {
      // A wetsuit's collar comes most of the way up the neck; a long bare neck read as a mannequin's.
      if (s > 0.605) return 'skin';
      if (s > 0.585) return 'seam';                                     // the collar's edge
      const c = Math.abs(Math.cos(ang)), back = Math.abs(ang - Math.PI);
      if (back < 0.1 && s > 0.08 && s < 0.53) return 'seam';           // the zip
      if (Math.abs(back - Math.PI / 2) < 0.05 && s > 0.02 && s < 0.43) return 'seam';   // down each side
      if (s > 0.21 && s < 0.5 && ((c > 0.3 && c < 0.45) || (c >= 0.45 && Math.abs(s - 0.215) < 0.004))) return 'seam';   // round the panel
      if (s > 0.22 && s < 0.5 && c > 0.45) return 'chest';
      return 'suit';
    },
    weigh: (s) => s < 0.02 ? [FB.PELVIS, FB.PELVIS, 0] : s < 0.2 ? [FB.PELVIS, FB.CHEST, smooth(0.02, 0.2, s)]
      : s < 0.49 ? [FB.CHEST, FB.CHEST, 0] : s < 0.6 ? [FB.CHEST, FB.NECK, smooth(0.49, 0.58, s)] : [FB.NECK, FB.HEAD, smooth(0.6, 0.665, s)],
  }));
  // ---- LEGS: hip to ankle in one surface - a full thigh, a knee (with the suit's textured pad on
  // the front of it, seamed round), a calf that swells behind, a slim ankle and the suit's cuff; the
  // outseam down the outside.
  for (const sd of [1, -1]) {
    const T = sd > 0 ? FB.THIGH_R : FB.THIGH_L, outer = sd > 0 ? Math.PI / 2 : 1.5 * Math.PI;
    K.part('legs', () => loft(K, {
      stations: stations(-0.09, R.thigh + R.shin + 0.005, 0.028 * lod, [[R.thigh, 0.1, 0.0125 * lod]], L1 ? [0.378, 0.542, 0.832, 0.848] : [0.832]),
      seg: q(20),
      at: chain([B[T], B[T + 1]], FRONT, 0.06),
      prof: keyed([[-0.09, 0.06, 0.06], [0, 0.092, 0.084, -0.005], [0.1, 0.088, 0.08], [0.22, 0.078, 0.072, 0.004], [0.34, 0.064, 0.058, 0.004],
        [0.42, 0.056, 0.054, 0.006], [0.46, 0.055, 0.052, 0.004], [0.52, 0.056, 0.05, -0.008], [0.6, 0.058, 0.05, -0.014],
        [0.7, 0.046, 0.042, -0.006], [0.8, 0.035, 0.033], [0.875, 0.033, 0.031, 0.004]]),
      paint: (s, ang) => {
        const c = Math.cos(ang), pad = s > 0.374 && s < 0.546;
        if (s > 0.83) return 'seam';                                    // the ankle cuff
        if (pad && c > 0.25 && (c < 0.45 || s < 0.382 || s > 0.538)) return 'seam';   // round the knee pad
        if (pad && c > 0.45) return 'knee';
        if (Math.abs(ang - outer) < 0.05 && s > 0) return 'seam';     // the outseam
        return 'suit';
      },
      weigh: (s) => s < 0.08 ? [T, FB.PELVIS, 0.5 * (1 - smooth(-0.09, 0.08, s))]
        : s < 0.38 ? [T, T, 0] : s < 0.5 ? [T, T + 1, smooth(0.38, 0.5, s)] : [T + 1, T + 1, 0],
    }));
  }
  // ---- ARMS: shoulder to wrist in one surface - the upper arm, an elbow that bends, the forearm
  // tapering to the cuff, a seam underneath.
  // THE SHOULDER (stage 4): the arm's root ran 6 cm back into the trunk, 5 cm thick and half on the
  // chest; with the arm raised - a paddle stroke's reach, a toe-side turn - it pushed out through
  // the top of the shoulder as a fin (tmp-audit/look/shoulders_ab.png). Now it starts 3.5 cm in,
  // 3 cm thick and three-quarters on the chest, so it stays inside the trunk, and a deltoid cap
  // (6.5 x 5.5 x 6 cm, 60% on the arm and 40% on the chest) rounds the joint over.
  for (const sd of [1, -1]) {
    const U = sd > 0 ? FB.UARM_R : FB.UARM_L, inner = sd > 0 ? 1.5 * Math.PI : Math.PI / 2;
    K.part('arms', () => loft(K, {
      stations: stations(-0.035, R.upperArm + R.foreArm + 0.004, 0.027 * lod, [[R.upperArm, 0.07, 0.0125 * lod]], L1 ? [0.546, 0.556] : [0.556]),
      seg: q(16),
      at: chain([B[U], B[U + 1]], FRONT, 0.05),
      prof: keyed([[-0.035, 0.03, 0.032], [0, 0.056, 0.06], [0.07, 0.057, 0.058], [0.15, 0.048, 0.047], [0.24, 0.043, 0.041],
        [0.29, 0.04, 0.04], [0.34, 0.043, 0.041], [0.4, 0.04, 0.037], [0.48, 0.032, 0.029], [0.564, 0.027, 0.024]]),
      paint: (s, ang) => s > 0.55 ? 'seam' : (Math.abs(ang - inner) < 0.05 && s > 0.06 ? 'seam' : 'suit'),   // the cuff; the underarm seam
      weigh: (s) => s < 0.1 ? [U, FB.CHEST, 0.75 * (1 - smooth(-0.035, 0.1, s))]
        : s < 0.24 ? [U, U, 0] : s < 0.34 ? [U, U + 1, smooth(0.24, 0.34, s)] : [U + 1, U + 1, 0],
    }));
    const ub = B[U], sr = sc(B.C.r, sd), out = unit(sub(sr, sc(ub.X, dot(sr, ub.X)))), fr = unit(cross(ub.X, out));
    K.part('deltoids', () => K.add('suit', U, (m) => blob(m, add(ub.a, ub.X, 0.022), 0.055, 0.065, 0.06,
      { X: fr, Y: ub.X, Z: out, seg: q(8), rings: q(6) }), [U, FB.CHEST, 0.4]));
  }
  // ---- THE HEAD, THE HAIR AND THE HOOD (see HEAD_KEYS). All of it on the HEAD bone; eyes() reads
  // that bone's middle, so the first-person lens has not moved.
  const WH = [FB.HEAD, FB.HEAD, 0];
  const hc = add(B[FB.HEAD].a, Hf.u, R.headH * 0.5), hmid = add(add(hc, Hf.f, -0.008), Hf.u, -0.005);
  const at3 = (f, h, w, off = 0) => { const P = add(add(add(hc, Hf.f, f), Hf.u, h), Hf.r, w); return off ? add(P, unit(sub(P, hmid)), off) : P; };
  const HA = L1 ? HEAD_ANG1 : HEAD_ANG2, HR = L1 ? HEAD_ROWS1 : HEAD_ROWS2;
  K.part('head', () => sheet(K, HR.length, HA.length, true, (i, j) => {
    const h = HR[i], ang = HA[j], a = absAng(ang), fw = headFW(h, ang, true);
    return { p: at3(fw[0], h, fw[1]), m: Math.abs(h) < 0.006 && a > 0.15 && a < 0.95 ? 'eyes' : 'skin', w: WH };
  }, () => hc));
  // Ears: small and flat, a little behind the middle of the head.
  if (L1) for (const s of [1, -1]) K.part('head', () => K.add('skin', FB.HEAD, (m) => blob(m, at3(-0.012, -0.006, s * 0.0745), 0.017, 0.029, 0.0075, { ...bx(Hf), seg: 7, rings: 5, e1: 0.8 }), WH));
  const HAH = L1 ? HAIR_ANG1 : HEAD_ANG2, TOP = L1 ? HAIR_TOP1 : HAIR_TOP2, NH = L1 ? HAIR_N1 : HAIR_N2, nd = NH - TOP.length;
  K.part('hair', () => sheet(K, NH, HAH.length, true, (i, j) => {
    const ang = HAH[j], h = i < TOP.length ? TOP[i] : lerp(0.074, hairEdge(absAng(ang)), (i - TOP.length + 1) / nd), fw = headFW(h, ang, false);
    return { p: at3(fw[0], h, fw[1], 0.0025 + 0.003 * Math.sqrt(1 - i / (NH - 1))), m: 'hair', w: WH };
  }, () => hmid));
  const HOR = L1 ? HOOD_ROWS1 : HOOD_ROWS2, HOA = L1 ? HOOD_ANG1 : HOOD_ANG2;
  K.part('hood', () => sheet(K, HOR.length, HOA.length, false, (i, j) => {
    const h = HOR[i], al = hoodOpen(h), ang = cl(HOA[j], al, 2 * Math.PI - al), a = absAng(ang);
    // 12 mm off the head, but pulled in to 4 mm at the face opening's rim - and on the rows just
    // above and below it at the front - so the edge reads as a hood's rolled edge, not a visor.
    const edge = al > 0 ? smooth(0, 0.35, Math.min(ang - al, 2 * Math.PI - al - ang))
      : a < 0.8 ? smooth(0, 0.025, h > -0.03 ? h - 0.05 : -0.108 - h) : 1;
    const off = 0.004 + 0.008 * edge + 0.006 * bell(a, Math.PI / 2, 0.45) * bell(h, -0.006, 0.05);
    const fhw = hoodFW(h, ang, off);
    return { p: at3(fhw[0], fhw[1], fhw[2]), m: 'hood', w: WH };
  }, () => hmid));
  // ---- THE HANDS (stage 4): a palm with the ball of the thumb, the heel of the hand, a hollow and
  // a ridge of knuckles; four fingers of two segments each (the knuckle and the middle joint bend,
  // smooth-skinned) spread a little so they read as four, and a thumb - all driven by the pose's
  // grip (handBones()). The fingers were not there at all: a mitten of two blobs. A line-up figure
  // (lod 2, 10-55 m off) keeps a mitten that still bends at the knuckles: a finger 1.7 cm across is
  // under a pixel there.
  for (const s of [1, -1]) {
    const Hi = s > 0 ? FB.HAND_R : FB.HAND_L, Fi = s > 0 ? FB.FING_R : FB.FING_L, Fa = Hi - 1;
    const hb = B[Hi], f1 = B[Fi], f2 = B[Fi + 1], th = B[Fi + 2];
    const knuckleW = (t) => t < 0.004 ? [Fi, Hi, 0.5 * (1 - smooth(-0.012, 0.004, t))] : t < FING1 - 0.008 ? [Fi, Fi, 0]
      : t < FING1 + 0.008 ? [Fi, Fi + 1, smooth(FING1 - 0.008, FING1 + 0.008, t)] : [Fi + 1, Fi + 1, 0];
    const tipped = (end) => (t, ang, pr) => t > end - 1e-4 ? [0, 0] : [pr.oa + pr.a * Math.cos(ang), pr.b * Math.sin(ang)];
    K.part('hands', () => {
      loft(K, {
        stations: L1 ? [-0.012, 0.004, 0.026, 0.05, 0.072, 0.087, 0.099, 0.108] : [-0.012, 0.035, 0.075, 0.104], seg: q(10),
        at: (x) => ({ c: add(hb.a, hb.X, x), A: hb.Y, B: hb.Z }),
        prof: keyed([[-0.012, 0.011, 0.02], [0, 0.0135, 0.026], [0.02, 0.0148, 0.033, -0.001], [0.045, 0.0152, 0.039, -0.001],
          [0.07, 0.0142, 0.042], [0.088, 0.0128, 0.043, 0.001], [0.1, 0.0105, 0.041], [0.108, 0.006, 0.034]]),
        shape: (x, ang, pr) => {
          const c = Math.cos(ang), sn = Math.sin(ang), toThumb = -s * sn, palm = Math.max(0, -c), back = Math.max(0, c);
          const d = 0.007 * bell(x, 0.03, 0.035) * Math.max(0, toThumb) * palm * 2     // the ball of the thumb
            + 0.003 * bell(x, 0.05, 0.04) * Math.max(0, -toThumb) * palm * 2          // the heel of the hand
            - 0.003 * bell(x, 0.06, 0.03) * palm * palm * palm                        // the hollow of the palm
            + 0.0035 * bell(x, 0.09, 0.012) * back * back;                            // the knuckles
          return [pr.oa + (pr.a + d) * c, (pr.b + d) * sn];
        },
        paint: () => 'skin',
        weigh: (x) => x < 0.03 ? [Hi, Fa, 0.5 * (1 - smooth(-0.012, 0.03, x))] : x > 0.09 ? [Hi, Fi, 0.4 * smooth(0.09, 0.108, x)] : [Hi, Hi, 0],
      });
      if (L1) for (const [zf, len2, r, beta] of FINGERS) {
        const L = FING1 + len2, spread = (F) => unit(add(sc(F.X, Math.cos(beta)), F.Z, -s * Math.sin(beta)));
        const d1 = spread(f1), d2 = spread(f2), k0 = add(f1.a, f1.Z, -s * zf), pip = add(k0, d1, FING1);
        const B1 = unit(cross(d1, f1.Y)), B2 = unit(cross(d2, f2.Y));
        loft(K, {
          stations: [-0.012, 0, FING1 - 0.008, FING1, FING1 + 0.008, L - 0.008, L - 0.003, L], seg: 6,
          at: (t) => t < FING1 ? { c: add(k0, d1, t), A: f1.Y, B: B1 } : { c: add(pip, d2, t - FING1), A: f2.Y, B: B2 },
          prof: keyed([[-0.012, 0.0082 * r, 0.0088 * r], [0, 0.0088 * r, 0.0092 * r], [FING1, 0.0077 * r, 0.0084 * r],
            [L - 0.008, 0.0062 * r, 0.007 * r], [L - 0.003, 0.0047 * r, 0.0052 * r], [L, 0.004, 0.004]]),
          shape: tipped(L), paint: () => 'skin', weigh: knuckleW,
        });
      } else loft(K, {
        stations: [-0.01, 0, FING1, 0.07, 0.085], seg: 6,
        at: (t) => t < FING1 ? { c: add(f1.a, f1.X, t), A: f1.Y, B: f1.Z } : { c: add(f1.b, f2.X, t - FING1), A: f2.Y, B: f2.Z },
        prof: keyed([[-0.01, 0.009, 0.036], [0, 0.0095, 0.04], [FING1, 0.0085, 0.039], [0.07, 0.007, 0.033], [0.085, 0.004, 0.018]]),
        shape: tipped(0.085), paint: () => 'skin', weigh: knuckleW,
      });
      loft(K, {                                                                      // the thumb
        stations: L1 ? [0.012, 0.035, 0.058, 0.08, 0.094, 0.1, 0.104] : [0.015, 0.06, 0.095, 0.104], seg: 6,
        at: (t) => ({ c: add(th.a, th.X, t), A: th.Y, B: th.Z }),
        prof: keyed([[0.012, 0.011, 0.013], [0.035, 0.0112, 0.0122], [0.058, 0.0098, 0.0105], [0.08, 0.0088, 0.0095], [0.094, 0.0072, 0.0078],
          [0.1, 0.0052, 0.0056], [0.104, 0.004, 0.004]]),
        shape: tipped(0.104), paint: () => 'skin',
        weigh: (t) => t < 0.045 ? [Fi + 2, Hi, 0.5 * (1 - smooth(0.012, 0.045, t))] : [Fi + 2, Fi + 2, 0],
      });
    });
  }
  // ---- THE FEET (stage 4): one loft each from the back of the heel to the big toe - a flat sole
  // 7.5 cm under the ankle joint (FIG_MAT.sole underneath), a round heel, the instep, an arch that
  // lifts the inside of the sole off the deck, and a toe box wider than the heel whose end slants
  // back from the big toe. They were three blobs. Above the ankle joint the back of the foot is
  // half on the shin, so it follows the leg as the ankle flexes; the sole stays on the foot.
  for (const s of [1, -1]) {
    const T = s > 0 ? FB.THIGH_R : FB.THIGH_L, ft = B[T + 2], up = sc(ft.Z, -1), med = -s;   // bind: X toes, Z down, Y side; the inside is -s along Y
    K.part('feet', () => loft(K, {
      stations: L1 ? FOOT_KEYS.map((k) => k[0]) : [-0.07, -0.045, -0.018, 0.06, 0.14, 0.192, 0.208],
      angles: L1 ? mirrored([0, 0.6, 1.2, 1.75, 2.3, 2.8]) : mirrored([0, 1.0, 1.9, 2.6]),
      at: (x) => ({ c: add(ft.a, ft.X, x), A: up, B: ft.Y }),
      prof: (x) => { const k = FOOTK(x); return { top: k[0], bot: k[1], hw: Math.max(0, k[2]), sh: k[3] }; },
      shape: (x, th, pr) => {
        const c = Math.cos(th), sn = Math.sin(th), mid = (pr.top + pr.bot) / 2, hv = Math.max(0, (pr.top - pr.bot) / 2);
        let v = c >= 0 ? mid + hv * Math.pow(c, 0.8) : mid - hv * Math.pow(-c, 0.22);
        if (c < 0 && sn * med > 0) v += 0.02 * bell(x, 0.04, 0.065) * Math.pow(sn * med, 1.5) * Math.sqrt(-c);   // the arch
        return [v, pr.sh * med + pr.hw * Math.sign(sn) * Math.pow(Math.abs(sn), 0.7)];
      },
      paint: (x, th) => Math.cos(th) < -0.6 ? 'sole' : 'skin',
      weigh: (x, th, xy) => [T + 2, T + 1, 0.5 * smooth(-0.02, 0.025, xy[0]) * (1 - smooth(-0.005, 0.045, x))],
    }));
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
  p.grip = p.grip || GRIP_REST;
  return p;
}
// A pose's `grip` ([left, right, 0] - stage 4, handBones()) is not a position or a direction: it
// blends, and a mirror swaps it, but no transform turns it.
export function blendPose(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const o = {};
  for (const key of KEYS) o[key] = lerp3(a[key], b[key], k);
  o.grip = lerp3(a.grip || GRIP_REST, b.grip || GRIP_REST, k);
  return o;
}
const dirA = (ang) => [Math.cos(ang), Math.sin(ang), 0];          // a direction pitched up from +X
const dirF = (ang) => [Math.sin(ang), -Math.cos(ang), 0];         // the matching "front" (belly down)

// PADDLING. phase 0..1 of one full cycle of the right arm; the left is half a cycle behind.
// amp 0 = lying still, hands trailing in the water; 1 = full stroke.
// The stroke's shape, in the board frame (x forward, y up, z out to the side), in one place so a
// tool can try it: reachX/reachZ where the hand goes in, catchY how deep it goes in, arc the height
// of the recovery over the water, hipX where it comes out.
// FOURTH PASS (27 Sep 2026, the owner: "you only get a little flash of hands ... it isn't clear you're
// actually paddling"). Measured through the first-person camera (tmp-tr205/hands.mjs), a hand was in a
// 16:9 view 8% of every stroke, and never above the water. Now the arm reaches its full length out
// in front (the target sits past it, so the arm straightens and the hand stays up over the water
// until it goes in), goes in just outside the rail (0.29 out, was 0.34; the deck is 0.25-0.27 wide either side where the hand goes in, so nearer would put it through the board) and comes forward in a higher arc:
// in view 63% of the stroke, all of it above the water. Portrait is too narrow for hands outside the rails of a 58 cm board: 0 -> 4%.
export const PADDLE = { reachX: 1.15, reachZ: 0.29, catchY: 0.0, arc: 0.2, hipX: -0.12, pullZ: 0.42 };
function prone(phase, amp, kick) {
  const K = PADDLE;
  const hand = (s, ph) => {
    let x, y, z, eb, hd;
    // The reach is nearly the whole arm: the hand goes in well out in front of the head, just
    // outside the rail (second pass - at 0.6 it went in beside the chin, and a surfer's-eye view
    // never saw a hand).
    // (Third pass, 27 Sep: every phase now starts where the last one ended - the recovery used to
    // finish 0.19 m ABOVE where the catch began, so the hand dropped into the water in one frame on
    // every stroke, and the elbow flipped at each change of phase. Measured at 11 m/s.)
    const EB_PULL = [0, 0.4, s], EB_OUT = [-0.3, 1, s], EB_REC = [-0.2, 1, s * 0.7];
    const HD_PULL = [0.15, -1, 0], HD_OUT = [-0.4, -1, 0], HD_REC = [1, -0.4, 0];
    if (ph < 0.55) {                 // catch and pull, under water, outside the rail
      const u = ease(ph / 0.55);
      x = lerp(K.reachX, K.hipX, u); y = DECK + K.catchY - 0.24 * Math.sin(Math.PI * Math.min(1, ph / 0.55)); z = s * lerp(K.reachZ, K.pullZ, u);
      eb = EB_PULL; hd = HD_PULL;
    } else if (ph < 0.63) {          // out of the water at the hip
      const u = (ph - 0.55) / 0.08;
      x = K.hipX; y = lerp(DECK + K.catchY, DECK + 0.13, u); z = s * K.pullZ;
      eb = lerp3(EB_PULL, EB_OUT, ease(u)); hd = lerp3(HD_PULL, HD_OUT, ease(u));
    } else {                         // recovery over the water, elbow high, reaching in to the catch
      const u = ease((ph - 0.63) / 0.37), r = (ph - 0.63) / 0.37;
      x = lerp(K.hipX, K.reachX, u); y = lerp(DECK + 0.13, DECK + K.catchY, u) + K.arc * Math.sin(Math.PI * u); z = s * (lerp(K.pullZ, K.reachZ, u) + 0.05 * Math.sin(Math.PI * u));
      eb = r < 0.25 ? lerp3(EB_OUT, EB_REC, ease(r / 0.25)) : r > 0.8 ? lerp3(EB_REC, EB_PULL, ease((r - 0.8) / 0.2)) : EB_REC;
      hd = r < 0.25 ? lerp3(HD_OUT, HD_REC, ease(r / 0.25)) : r > 0.8 ? lerp3(HD_REC, HD_PULL, ease((r - 0.8) / 0.2)) : HD_REC;
    }
    const rest = [0.12, DECK - 0.13, s * 0.37];
    // The hand CUPPED through the pull (fingers together and a little bent, stage 4), a touch looser
    // coming forward over the water, relaxed when lying still.
    const g = ph < 0.55 ? 0.2 : ph < 0.63 ? lerp(0.2, 0.32, (ph - 0.55) / 0.08) : ph < 0.9 ? 0.32 : lerp(0.32, 0.2, (ph - 0.9) / 0.1);
    return { h: lerp3(rest, [x, y, z], amp), e: lerp3([0, 0.6, s], eb, amp), d: lerp3([0.1, -1, s * 0.2], hd, amp), g: lerp(0.45, g, amp) };
  };
  const R_ = hand(1, phase % 1), L_ = hand(-1, (phase + 0.5) % 1);
  const a = 0.1, c = 0.3 + 0.06 * amp, hh = 0.95;
  // The body rolls a little toward the pulling arm.
  const roll = 0.08 * amp * Math.sin(phase * Math.PI * 2);
  return full({
    hip: [-0.34, DECK + 0.105, 0], up: dirA(a), fwd: [Math.sin(a), -Math.cos(a), roll],
    chestUp: dirA(c), chestFwd: [Math.sin(c), -Math.cos(c), roll * 1.5],
    headUp: dirA(hh), headFwd: dirF(hh),
    handR: R_.h, handL: L_.h, elbowR: R_.e, elbowL: L_.e, handDirR: R_.d, handDirL: L_.d, grip: [L_.g, R_.g, 0],
    footR: [-1.2, DECK + 0.075 + kick, 0.085], footL: [-1.2, DECK + 0.075 - kick, -0.085],
    kneeR: [0, -1, 0.1], kneeL: [0, -1, -0.1], toeR: [-1, -0.3, 0.05], toeL: [-1, -0.3, -0.05],
  });
}

// WAITING: sitting astride, upright, looking round. look -1..1 turns the head (and a little of the
// chest). The legs tread water - a slow egg-beater, each foot circling half a turn behind the other -
// the way a surfer sitting out the back keeps the board steady and pointed.
// spin (the line-up, 27 Sep): turning the board round sitting up to go for a wave - the legs beat
// harder and wider under the water and the hands come off the deck to scull.
function sit(look, t, spin = 0) {
  const tw = 0.25 * look, hw = 1.0 * look;
  const f0 = [1, 0.1, 0];
  const rot = (v, ang) => [v[0] * Math.cos(ang) - v[2] * Math.sin(ang), v[1], v[0] * Math.sin(ang) + v[2] * Math.cos(ang)];
  const w = t * (1.4 + 3.4 * spin), rr = 1 + 0.9 * spin, sc = 0.1 * spin * Math.sin(t * 5.5);
  return full({
    hip: [-0.3, DECK + 0.1, 0], up: [-0.02, 1, 0], fwd: f0,
    chestUp: [0.03, 1, 0], chestFwd: rot(f0, tw),
    headUp: [0.02, 1, 0], headFwd: rot([1, -0.12, 0], hw),
    handR: [0.2 - 0.2 * spin + sc, DECK + 0.07 - 0.2 * spin, 0.17 + 0.22 * spin], handL: [0.2 - 0.2 * spin - sc, DECK + 0.07 - 0.2 * spin, -0.17 - 0.22 * spin],
    elbowR: [-0.3, 0, 1], elbowL: [-0.3, 0, -1],
    handDirR: [1, -0.4, 0.1], handDirL: [1, -0.4, -0.1], grip: [0.12 + 0.13 * spin, 0.12 + 0.13 * spin, 0],   // resting on the deck; sculling
    footR: [0.1 + 0.08 * rr * Math.sin(w), DECK - 0.52 + 0.05 * rr * Math.cos(w), 0.4], footL: [0.1 - 0.08 * rr * Math.sin(w), DECK - 0.52 - 0.05 * rr * Math.cos(w), -0.4],
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
    handDirR: [1, 0, 0.3], handDirL: [1, 0, -0.3], grip: [0.8, 0.8, 0],     // holding the rails
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
    handDirR: [1, 0, 0.2], handDirL: [1, 0, -0.2], grip: [0.85, 0.85, 0],
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
    handDirR: [1, -0.3, 0], handDirL: [1, -0.3, 0], grip: [0.7, 0.7, 0],
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
    handDirR: [1, 0, 0.1], handDirL: [1, 0, -0.1], grip: [0.02, 0.02, 0],   // flat on the deck
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
    handDirR: [1, 0, 0.1], handDirL: [1, 0, -0.1], grip: [0.05, 0.05, 0],
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
//
// THE LINE-UP'S MOVES (third pass, 27 Sep - the owner: "a lot smoother ... much better sort of
// smoother moves ... so it looks natural"). S carries four weights, each eased by a spring in
// update(), so a move grows into the body and out of it instead of switching on:
//   carve  a bottom turn or a cutback's long arc: the hips drop to the inside rail, the leading
//          hand reaches for the water on a toe-side turn, the trailing hand drags on a heel-side one
//   snap   the top of a top turn: the chest and arms are thrown round into the turn AHEAD of the
//          hips (the upper body leads, the board follows), the back arm swinging up and through
//   back   a cutback: the head and the leading arm turn back toward the tail - toward the curl the
//          rider is turning to meet
//   wide   floating along the lip, or in the air: both arms out and up for balance, knees soft
// The player's own rider passes none of these (all zero), so that stance is the second pass's.
// banked: the board itself is banked into the turn (the line-up's is, by the turn's own angle), so
// the body does not lean over in the board's frame on top of it - that counted the lean twice and a
// rider in a backside bottom turn looked to be falling off the back (third pass, filmed). The arms
// and the head still do everything.
const NOSTY = { carve: 0, snap: 0, back: 0, wide: 0, banked: 0 };
function stance(comp, lean, t, pump, S = NOSTY) {
  const bl = 1 - 0.65 * (S.banked || 0);
  const lp = Math.max(0, lean), ln = Math.max(0, -lean), lpB = lp * bl, lnB = ln * bl, leanB = lean * bl;
  const sg = lean >= 0 ? 1 : -1;
  const open = 0.36;                                   // hips opened toward the nose
  // The chest counter-rotates into the turn; a snap throws it round ahead of the hips; a cutback
  // opens it back toward the tail.
  const chestOpen = open + 0.34 - 0.3 * lean - 0.4 * S.snap * sg - 0.5 * S.back;
  const bob = 0.015 * Math.sin(t * 2.3) + (pump || 0);
  // THE CROUCH. A surfer rides LOW: knees well bent (the hips 0.2-0.35 m below a straight-legged
  // stand), bent forward at the hips over the toe-side rail and a little toward the nose, the back
  // knee driven in toward the front one. The first cut stood nearly straight-legged and upright
  // and read as someone standing on a board, not riding it (close-ups, 26 Sep).
  //
  // STANDING, NOT KNEELING (27 Sep 2026, the PIER SURF look audit, tmp-audit/look/fig-try.js). That
  // crouch went too far: the back knee joint came down to 0.08-0.30 m (0.08 on a landing, 0.12 in a
  // toe-side turn; the deck is at 0.056) - a rider kneeling on the tail, and in a hard carve on a
  // landing it went 8 cm THROUGH the deck - and the hands were flung 0.95 m apart (1.16 in a turn),
  // scarecrow arms. Now: the hips a little higher and less driven down by the compression (0.74 -
  // 0.30 comp, was 0.8 - 0.42), set back over the stringer instead of out over the toe rail, the feet
  // a shoulder-width-and-a-bit apart (0.64 m, was 0.8) and both knees pointing the way the toes do:
  // the back knee 0.28-0.39 m up across ride, turns and landings, never within 14 cm of the deck over
  // every lean, crouch and move, and the hands 0.71 m apart, close in at the hips
  // (tmp-tr161/suites-live/test-surf-perf.mjs).
  const hipY = DECK + 0.07 + 0.74 - 0.30 * comp - 0.06 * lnB - 0.04 * S.carve + bob;
  const hip = [-0.1 + 0.03 * lean, hipY, -0.03 + 0.16 * leanB - 0.06 * lnB + 0.06 * S.carve * leanB];
  const tilt = 0.32 + 0.35 * comp + 0.45 * lpB - 0.12 * lnB;   // bent forward over the toes, and into the turn
  const bal = 0.04 * Math.sin(t * 1.7);
  const pa = (pump || 0) * 2.2;                        // the arms swing with a pump
  let hL = [0.36 + 0.1 * lp + 0.12 * ln, 0.06 - 0.1 * comp + bal - 0.3 * lp + 0.12 * ln + pa, 0.3 + 0.22 * lp + 0.2 * ln];
  let hR = [-0.34 - 0.1 * lp + 0.25 * ln, -0.1 - 0.05 * comp - bal + 0.34 * lp + 0.1 * ln - pa, 0.2 - 0.12 * lp + 0.3 * ln];
  // carve: the inside hand goes for the water (toe side: the leading hand, low and out over the
  // toes; heel side: the trailing hand, trailed behind the heels).
  hL = add(hL, [0.05 * lp, -0.2 * lp, 0.18 * lp], S.carve);
  hR = add(hR, [-0.12 * ln, -0.3 * ln, -0.42 * ln], S.carve);
  // snap: the back arm swings up and through, the front one comes across the body.
  hR = add(hR, [0.3, 0.38, 0.12 * sg], S.snap);
  hL = add(hL, [-0.18, 0.12, -0.18 * sg], S.snap);
  // back: the leading arm points back toward the tail, the trailing one opens behind.
  hL = add(hL, [-0.75, 0.22, 0.12], S.back);
  hR = add(hR, [-0.15, 0.18, -0.2], S.back);
  // wide: out and up for balance.
  hL = lerp3(hL, [0.55, 0.36, 0.5], S.wide);
  hR = lerp3(hR, [-0.62, 0.32, 0.46], S.wide);
  return full({
    hip, up: [0.1, 1, tilt], fwd: [Math.sin(open), 0, Math.cos(open)],
    chestUp: [0.2, 1, tilt + 0.2], chestFwd: [Math.sin(chestOpen), -0.1, Math.cos(chestOpen)],
    // The head leads: into the turn, down the face after a snap, back over the lead shoulder in a
    // cutback.
    headUp: [0.05, 1, 0.1], headFwd: [1 - 1.1 * S.back, -0.2 - 0.12 * S.carve - 0.1 * S.snap, 0.25 + 0.3 * lean + 0.35 * lean * S.carve + 0.5 * S.back],
    // Arms low and out for balance: the front one reaching toward the nose, the back one trailing.
    handL: add(hip, hL), handR: add(hip, hR),
    elbowL: [0.2, -1, 0.6], elbowR: [-0.2 + 0.3 * ln, -1, 0.6], handDirL: [1, -0.35, 0.3], handDirR: [-0.7 + 1.2 * ln, -0.6, 0.35],
    // Relaxed hands (stage 4), opening a little as one reaches for the water in a carve.
    grip: [0.45 - 0.12 * S.carve, 0.45 - 0.12 * S.carve, 0],
    footL: [0.22, DECK + 0.07, 0.0], footR: [-0.42, DECK + 0.07, 0.03],
    kneeL: [0.3, 0.1, 0.95], kneeR: [0.35, 0.15, 0.92], toeL: [0.5, 0, 0.87], toeR: [0.1, 0, 1],
  });
}

// IN THE AIR (27 Sep 2026, PIER SURF stage 6 - the player's board writes fx.air, 0..1): a GRAB. The
// knees drawn up, the hips down and back over the heels, the body folded forward over the knees, the
// back hand reaching down for the toe-side rail between the feet, the front arm out toward the nose
// for balance, the head down toward where the board will come down. update() blends the stance into it
// by X.air, which the board eases in off the lip and back out over the last half metre above the water
// - so the legs are reaching for the landing when it comes (and the board's fx.comp takes it). Regular
// foot; update() mirrors it for a goofy footer with the stance. t: a little balance in the front arm.
function grab(t) {
  const bal = 0.03 * Math.sin(t * 5);
  const hip = [-0.13, DECK + 0.33, -0.1];
  return full({
    hip, up: [0.12, 1, 0.75], fwd: [Math.sin(0.36), 0, Math.cos(0.36)],
    chestUp: [0.15, 1, 1.05], chestFwd: [0.55, -0.4, 0.75], headUp: [0.1, 1, 0.45], headFwd: [0.55, -0.5, 0.7],
    handR: [-0.1, DECK + 0.05, 0.3], handL: [0.6, DECK + 0.66 + bal, 0.34],
    elbowR: [-0.3, 0.1, 1], elbowL: [0.2, -0.8, 0.5], handDirR: [0.1, -1, 0.3], handDirL: [1, 0.1, 0.25],
    grip: [0.4, 0.85, 0],                                  // [left, right]: the back hand holds the rail
    footL: [0.22, DECK + 0.07, 0.0], footR: [-0.42, DECK + 0.07, 0.03],
    kneeL: [0.3, 0.45, 0.85], kneeR: [0.25, 0.45, 0.88], toeL: [0.5, 0, 0.87], toeR: [0.1, 0, 1],
  });
}

// GOOFY FOOT (27 Sep): half the line-up stands right foot forward. Mirrored across the stringer
// (z -> -z) with left and right swapped, so each limb stays on its own side of the body.
const SIDES = [['handL', 'handR'], ['elbowL', 'elbowR'], ['handDirL', 'handDirR'], ['footL', 'footR'], ['kneeL', 'kneeR'], ['toeL', 'toeR']];
function mirror(p) {
  const o = {};
  for (const k of KEYS) { const v = p[k]; o[k] = [v[0], v[1], -v[2]]; }
  for (const [a, b] of SIDES) { const t = o[a]; o[a] = o[b]; o[b] = t; }
  const g = p.grip || GRIP_REST; o.grip = [g[1], g[0], 0];
  return o;
}

// A pose moved rigidly: rotated by R (rows) and then shifted by t. Positions and directions.
const POS = new Set(['hip', 'handL', 'handR', 'footL', 'footR']);
function xform(p, R, t) {
  const o = {};
  for (const k of KEYS) {
    const v = p[k];
    const w = [R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]];
    o[k] = POS.has(k) && t ? add(w, t) : w;
  }
  o.grip = p.grip;
  return o;
}
// A pose moved by t (positions only).
function shift(p, t) {
  const o = {};
  for (const k of KEYS) o[k] = POS.has(k) ? add(p[k], t) : p[k];
  o.grip = p.grip;
  return o;
}
// The rotation gl/surfers.js place() applies: pitch (nose up +) about z, then roll about x, then
// the heading about y.
function rot(yaw, pitch, roll) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll), ch = Math.cos(yaw), sh = Math.sin(yaw);
  // P = [[cp,-sp,0],[sp,cp,0],[0,0,1]]; Rl = [[1,0,0],[0,cr,-sr],[0,sr,cr]]; Y = [[ch,0,-sh],[0,1,0],[sh,0,ch]]
  const RP = [[cp, -sp, 0], [cr * sp, cr * cp, -sr], [sr * sp, sr * cp, cr]];
  return [
    [ch * RP[0][0] - sh * RP[2][0], ch * RP[0][1] - sh * RP[2][1], ch * RP[0][2] - sh * RP[2][2]],
    RP[1],
    [sh * RP[0][0] + ch * RP[2][0], sh * RP[0][1] + ch * RP[2][1], sh * RP[0][2] + ch * RP[2][2]],
  ];
}
export function rotPoint(v, yaw, pitch, roll) { const R = rot(yaw, pitch, roll); return [R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]]; }

// AFTER A RIDE, LYING BACK DOWN (27 Sep): the line-up went from standing to paddling in one
// crossfade and read as a plank tipping over. Now: hands to the deck, a knee down, then flat.
function kneel() {
  return full({
    hip: [-0.5, DECK + 0.36, 0], up: [0.75, 1, 0], fwd: [0.8, -0.6, 0],
    chestUp: [1, 0.55, 0], chestFwd: [0.5, -1, 0], headUp: [1, 0.8, 0], headFwd: [0.7, -0.6, 0],
    handR: [0.02, DECK + 0.02, 0.21], handL: [0.02, DECK + 0.02, -0.21], elbowR: [-0.5, 0.3, 0.6], elbowL: [-0.5, 0.3, -0.6],
    handDirR: [1, 0, 0.1], handDirL: [1, 0, -0.1], grip: [0.05, 0.05, 0],
    footR: [-1.02, DECK + 0.07, 0.1], footL: [-0.98, DECK + 0.09, -0.1], kneeR: [0.3, -1, 0.1], kneeL: [0.3, -1, -0.1],
    toeR: [-1, -0.2, 0], toeL: [-1, -0.2, 0],
  });
}

// ---------------------------------------------------------------------------- the wipeout
// A WIPEOUT, IN TIME (27 Sep 2026). The owner saw a line-up surfer come off "and a foot sticking up
// through the foam, away from the leg": the old tumble was one rigid, spinning, spread-eagled body
// held AT the surface, so whichever limb swung up broke the white water apart from the rest.
// What happens instead, on anyone's wipeout:
//   fall    thrown off the heel side, arms flung up, legs off the deck - into the water
//   under   held down in the white water, tucked up and turning over, the whole body under
//   up      surfacing where the leash has them: upright, treading water, head and shoulders out,
//           legs beating down below, turning to face the way they will paddle
//   reach   the board pulled in on the leash; hands onto its tail
//   mount   chest onto the tail (pushing it down), then slide on and lie flat
// The board meanwhile is thrown on ahead, flips over in the white water, settles, and is reeled
// back. Everything is in the RIG frame: origin at the water surface where the board will END,
// +x the way the board was going when they fell. `turn` is the heading they finish on, relative to
// that; the swimmer comes up 1.35 m behind the board's end, so the tail lands at their hands.
//   T  the whole thing in seconds (the player's board allows 1.6, the line-up takes 3.2)
const WPH = [0.14, 0.42, 0.62, 0.8];
const SWIM_BACK = 1.35;
const wrapPI = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export function wipePhase(t, T) {
  const u = cl(t / Math.max(0.2, T), 0, 1);
  const i = u < WPH[0] ? 0 : u < WPH[1] ? 1 : u < WPH[2] ? 2 : u < WPH[3] ? 3 : 4;
  const a = i === 0 ? 0 : WPH[i - 1], b = i === 4 ? 1 : WPH[i];
  return { i, k: cl((u - a) / (b - a), 0, 1), u };
}
// The board, in the rig frame. rel: where it was relative to the rig when they fell ({dy, pitch,
// roll}); out gets { x, y, z, yaw, pitch, roll } (y above the local water surface).
export function wipeBoard(t, T, turn, rel, out) {
  const { i, k, u } = wipePhase(t, T);
  const r0 = rel ? rel.roll : 0, p0 = rel ? rel.pitch : 0, y0 = rel ? rel.dy : 0.05;
  const settle = 2 * Math.PI * Math.max(1, Math.round((r0 + 2.6) / (2 * Math.PI)));
  let x, y, z, yaw, pitch, roll;
  if (i === 0) {            // thrown on ahead, flipping
    const e = 1 - (1 - k) * (1 - k);
    x = 1.4 * e; z = 0.3 * e; y = y0 * (1 - k) + 0.35 * Math.sin(Math.PI * k);
    yaw = 0.6 * e; pitch = p0 * (1 - k) + 0.5 * Math.sin(Math.PI * k); roll = r0 + 2.6 * e;
  } else if (u < 0.5) {     // over and over in the white water, settling flat
    const q = cl((u - WPH[0]) / (0.5 - WPH[0]), 0, 1), e = ease(q);
    x = 1.4 + 0.5 * q; z = 0.3; y = -0.04 + 0.05 * Math.sin(t * 5);
    yaw = 0.6 + 0.5 * q; pitch = 0.3 * Math.sin(Math.PI * q) * (1 - q); roll = lerp(r0 + 2.6, settle, e);
  } else if (u < WPH[3]) {  // reeled back in on the leash to where they will climb on
    const q = ease((u - 0.5) / (WPH[3] - 0.5));
    x = 1.9 * (1 - q); z = 0.3 * (1 - q); y = -0.03;
    yaw = 1.1 + wrapPI(turn - 1.1) * q; pitch = 0; roll = settle;
  } else {                  // held while they climb on: the tail pushed down, then level
    x = 0; z = 0; y = -0.02 * Math.sin(Math.PI * k); yaw = turn; pitch = 0.2 * Math.sin(Math.PI * k); roll = settle;
  }
  // ON A LEASH: never further than 1.8 m (centre to hips) from the swimmer, who drifts under water
  // from where they went in to where they come up. (Without this, a swimmer surfacing BEHIND the
  // board's end - the player's case, turn 0 - had it 3.2 m away at the end of a 2.4 m leash.)
  if (u < WPH[3]) {
    const P = swimPoint(turn), kk = u < WPH[0] ? 0 : ease(cl((u - WPH[0]) / (WPH[1] - WPH[0]), 0, 1));
    const hx = lerp(0.3, P[0], kk), hz = lerp(0, P[2], kk), dx = x - hx, dz = z - hz, dd = Math.hypot(dx, dz);
    if (dd > 1.8) { x = hx + dx / dd * 1.8; z = hz + dz / dd * 1.8; }
  }
  out.x = x; out.y = y; out.z = z; out.yaw = yaw; out.pitch = pitch; out.roll = roll;
  return out;
}
// Where the swimmer surfaces, in the rig frame.
export function swimPoint(turn) { return [-SWIM_BACK * Math.cos(turn), 0, -SWIM_BACK * Math.sin(turn)]; }

function fallOff() {             // thrown off the heel side, lying back, limbs flung (board frame, regular)
  return full({
    hip: [-0.05, DECK + 0.02, -0.7], up: [0.2, 0.35, -1], fwd: [0.1, 1, 0.3],
    chestUp: [0.25, 0.3, -1], chestFwd: [0.1, 1, 0.25], headUp: [0.3, 0.5, -1], headFwd: [0.2, 1, 0.4],
    handR: [-0.5, DECK + 0.35, -1.25], handL: [0.55, DECK + 0.4, -1.2], elbowR: [0, 1, 0], elbowL: [0, 1, 0],
    handDirR: [0, 0.3, -1], handDirL: [0, 0.3, -1], grip: [0.3, 0.3, 0],
    footR: [-0.55, DECK + 0.55, -0.15], footL: [0.3, DECK + 0.4, -0.05], kneeR: [0, 1, 0.4], kneeL: [0, 1, 0.4],
    toeR: [0.2, 0.5, 1], toeL: [0.2, 0.5, 1],
  });
}
function curl(t) {               // tucked up under the water (swimmer frame, hip at the origin)
  const w = 0.06 * Math.sin(t * 3);
  return full({
    hip: [0, 0, 0], up: [0.35, 1, 0], fwd: [1, -0.3, 0],
    chestUp: [0.6, 1, 0], chestFwd: [1, -0.5, 0], headUp: [0.8, 1, 0], headFwd: [1, -0.7, 0],
    handR: [0.28, 0.6 + w, 0.14], handL: [0.28, 0.6 - w, -0.14], elbowR: [1, 0, 1], elbowL: [1, 0, -1],
    handDirR: [0, 1, -0.3], handDirL: [0, 1, 0.3], grip: [0.6, 0.6, 0],
    footR: [0.05, -0.3, 0.12], footL: [0.08, -0.26, -0.12], kneeR: [1, 0.6, 0.2], kneeL: [1, 0.6, -0.2],
    toeR: [-0.3, -1, 0], toeL: [-0.3, -1, 0],
  });
}
// Treading water: upright, the head and the tops of the shoulders out, hands sculling just under
// the surface, legs beating an egg-beater below (swimmer frame: the surface at y 0, facing +x).
function tread(t) {
  const w = t * 3.2, s = t * 2.6;
  return full({
    hip: [0, -0.62, 0], up: [0.06, 1, 0], fwd: [1, -0.03, 0],
    chestUp: [0.08, 1, 0], headUp: [0, 1, 0], headFwd: [1, 0.04, 0.1 * Math.sin(t * 0.9)],
    handR: [0.14 + 0.12 * Math.sin(s), -0.2, 0.44 + 0.06 * Math.cos(s)], handL: [0.14 - 0.12 * Math.sin(s), -0.2, -0.44 - 0.06 * Math.cos(s)],
    elbowR: [-0.2, -0.3, 1], elbowL: [-0.2, -0.3, -1], handDirR: [1, -0.25, 0.35], handDirL: [1, -0.25, -0.35], grip: [0.25, 0.25, 0],
    footR: [0.18 + 0.12 * Math.sin(w), -1.34 + 0.08 * Math.cos(w), 0.3], footL: [0.18 - 0.12 * Math.sin(w), -1.34 - 0.08 * Math.cos(w), -0.3],
    kneeR: [1, 0, 0.6], kneeL: [1, 0, -0.6], toeR: [0.3, -1, 0.3], toeL: [0.3, -1, -0.3],
  });
}
const back = (p) => xform(p, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [-SWIM_BACK, 0, 0]);   // swimmer -> board-end frame
function reachB(t) {             // hands onto the tail (board-end frame)
  return full({
    hip: [-SWIM_BACK, -0.56, 0], up: [0.3, 1, 0], fwd: [1, -0.2, 0],
    chestUp: [0.45, 1, 0], chestFwd: [1, -0.4, 0], headUp: [0.2, 1, 0], headFwd: [1, -0.15, 0],
    handR: [-1.0, DECK + 0.01, 0.21], handL: [-1.0, DECK + 0.01, -0.21], elbowR: [-0.3, -0.2, 1], elbowL: [-0.3, -0.2, -1],
    handDirR: [1, -0.2, 0.1], handDirL: [1, -0.2, -0.1], grip: [0.75, 0.75, 0],
    footR: [-1.3 + 0.1 * Math.sin(t * 3.2), -1.3, 0.25], footL: [-1.3 - 0.1 * Math.sin(t * 3.2), -1.32, -0.25],
    kneeR: [1, 0, 0.5], kneeL: [1, 0, -0.5], toeR: [0.3, -1, 0.3], toeL: [0.3, -1, -0.3],
  });
}
function pullB() {               // chest on the tail, pushing it down, legs still in the water
  return full({
    hip: [-1.2, -0.14, 0], up: [1, 0.3, 0], fwd: [0.3, -1, 0],
    chestUp: [1, 0.2, 0], chestFwd: [0.2, -1, 0], headUp: [1, 0.75, 0], headFwd: [0.7, -0.5, 0],
    handR: [-0.45, DECK + 0.02, 0.23], handL: [-0.45, DECK + 0.02, -0.23], elbowR: [-0.4, 0.5, 0.6], elbowL: [-0.4, 0.5, -0.6],
    handDirR: [1, 0, 0.1], handDirL: [1, 0, -0.1], grip: [0.05, 0.05, 0],
    footR: [-1.95, -0.42, 0.14], footL: [-1.9, -0.3, -0.14], kneeR: [0, -1, 0.1], kneeL: [0, -1, -0.1],
    toeR: [-1, -0.4, 0], toeL: [-1, -0.4, 0],
  });
}

// ---------------------------------------------------------------------------- the figure
const LEASH_N = 12, LEASH_SEG = 4;

// THE MESH, built once per level of detail and SHARED: every figure of one lod reads the same bind
// pose, skin weights, indices and colours; each keeps only its own animation state. lod 1 is the
// player's; lod 2 (about a third of the vertices) is for the line-up's nearest surfers.
const MESHES = new Map();
function meshFor(lod) {
  if (MESHES.has(lod)) return MESHES.get(lod);
  const bind = skeleton(full({ ...BIND }));
  const K = buildBody(bind, lod);
  const leashVerts = LEASH_N * (LEASH_SEG + 1), count = K.count + leashVerts;
  const idx = K.idx.slice();
  for (let i = 0; i + 1 < LEASH_N; i++) {
    for (let k = 0; k < LEASH_SEG; k++) {
      const a = K.count + i * (LEASH_SEG + 1) + k;
      idx.push(a, a + LEASH_SEG + 1, a + LEASH_SEG + 2, a, a + LEASH_SEG + 2, a + 1);
    }
  }
  // `rough` is the aAnim channel: a material's id and its roughness, packed (FIG_MAT, figAnim).
  const rough = new Float32Array(count), col = new Float32Array(count * 3);
  for (let k = 0; k < K.count; k++) { col.set([K.col[k * 3], K.col[k * 3 + 1], K.col[k * 3 + 2]], k * 3); rough[k] = K.anim[k]; }
  for (let k = K.count; k < count; k++) { col.set(MAT.leash.col, k * 3); rough[k] = MAT.leash.anim; }
  const M = {
    bind, bodyVerts: K.count, count, skin: skinOf(K, bind), parts: K.parts,
    bindPos: new Float32Array(K.pos), bindNrm: new Float32Array(K.nrm),
    idx: new Uint16Array(idx), tris: idx.length / 3, rough, col,
    // A vertex buffer laid out exactly as gl/surfers.js lays its meshes out: pos3 nrm3 col3 anim1.
    makeData() {
      const d = new Float32Array(count * 10);
      for (let k = 0; k < count; k++) { d[k * 10 + 6] = col[k * 3]; d[k * 10 + 7] = col[k * 3 + 1]; d[k * 10 + 8] = col[k * 3 + 2]; d[k * 10 + 9] = rough[k]; }
      return d;
    },
  };
  MESHES.set(lod, M);
  return M;
}
// Where a lod's parts are in its vertex buffer - { trunk, legs, arms, deltoids, head, hair, hood,
// hands, feet: [[from, to], ...] } - and its sizes, for tools and the suite (nothing in the game
// needs it: the renderer tells the hood by its material id).
export function figureMesh(lod = 1) { const M = meshFor(lod); return { count: M.count, bodyVerts: M.bodyVerts, tris: M.tris, parts: M.parts }; }

// A critically damped spring, stepped exactly: it eases IN as well as out. The figure's lean and
// crouch used a first-order lag, which starts every change at full rate - a visible kick at the
// start of each turn (third pass, 27 Sep: "smoother moves").
function spring(s, target, w, dt) {
  const x0 = s.x - target, v0 = s.v, e = Math.exp(-w * dt), c = v0 + w * x0;
  s.x = target + (x0 + c * dt) * e;
  s.v = (v0 - w * c * dt) * e;
  return s.x;
}
const sp0 = (x) => ({ x, v: 0 });
const NOX = {};
const NOREL = { dy: 0.05, pitch: 0, roll: 0 };

export class SurferFigure {
  // opts.lod: 1 (the player) or 2 (the line-up). opts.data false: no vertex buffer of its own - a
  // line-up figure is skinned into whichever draw slot it is given (write(leash, out)).
  constructor(opts = {}) {
    const M = meshFor(opts.lod || 1);
    this.lod = opts.lod || 1;
    this.bind = M.bind; this.bodyVerts = M.bodyVerts; this.skin = M.skin;
    this.bindPos = M.bindPos; this.bindNrm = M.bindNrm;
    this.count = M.count; this.idx = M.idx; this.tris = M.tris; this.rough = M.rough;
    this.makeData = M.makeData;
    this.data = opts.data === false ? null : M.makeData();
    this.M = new Float32Array(NB * 12);
    // Animation state - visual only, never read by the sim.
    this.phase = 0; this.amp = 0; this.sit = 0; this.stillT = 0; this.lean = 0; this.comp = 0.3;
    this.look = 0; this.lastState = -1; this.fromPose = null; this.fromT = 0; this.pose = prone(0, 0, 0); this.popT = 9; this.t = 0;
    this.sLean = sp0(0); this.sComp = sp0(0.5); this.sSpin = sp0(0);
    this.sC = sp0(0); this.sS = sp0(0); this.sB = sp0(0); this.sW = sp0(0);
    this.sty = { carve: 0, snap: 0, back: 0, wide: 0, banked: 0 };
    this.downT = 9; this.downFrom = null; this.wipeFrom = null; this.rig = null; this.G = false;
  }

  // Per drawn frame. `me` is the SurfBoard (or a line-up surfer's stand-in). X, the line-up's extras
  // (all optional; the player passes only the wipeout's): comp, carve, snap, back, wide, pump, land,
  // goofy, spin, and for a wipeout wipeT / wipeTurn / wipeRel / wipeHs / wipeHb - see _wipe(). air
  // (stage 6, the player's board.fx): 0..1, how far into the air's grab (grab(), above).
  // Returns the extra pitch / drop of the board when sitting (the tail sinks), which the caller
  // applies to the board and the figure alike.
  update(me, dt, X) {
    dt = Math.max(0, Math.min(0.1, dt));
    this.t += dt;
    X = X || NOX;
    const st = me.state | 0;
    const thr = st === 0 ? (me.thr || 0) : 0;
    this.amp += ((thr > 0.05 ? 0.55 + 0.45 * thr : 0) - this.amp) * Math.min(1, dt * 4);
    if (this.amp > 0.02) this.phase = (this.phase + dt / (1.25 - 0.45 * thr)) % 1;
    // Sit up when not paddling outside the whitewater. NOT a speed test: the swell alone moves a
    // board lying still at 0.5-0.8 m/s, so "slow" never came true and nobody ever sat (26 Sep).
    const still = st === 0 && thr < 0.05 && ((me.wave && me.wave.foam) || 0) < 0.35;
    this.stillT = still ? this.stillT + dt : 0;
    this.sit += ((this.stillT > 1.2 || (X.spin && still) ? 1 : 0) - this.sit) * Math.min(1, dt * 2.5);
    const spin = spring(this.sSpin, X.spin || 0, 6, dt);
    // Looking round while sitting - unless the first-person camera is steering the head
    // (src/surfer/pov-cam.js sets lookCtl: 0 ahead, 1 over the right shoulder).
    this.look = this.lookCtl !== null && this.lookCtl !== undefined ? this.lookCtl
      : Math.sin(this.t * 0.33) * 0.85 + 0.15 * Math.sin(this.t * 0.9);
    this.lean = spring(this.sLean, cl((me.r || 0) / 1.4, -1, 1), 7, dt);
    if (X.land) this.sComp.v += 2.4 * X.land;          // a landing drives the knees down
    this.comp = cl(spring(this.sComp, X.comp !== undefined ? X.comp : 0.5 + 0.4 * Math.abs(this.lean), 6, dt), 0, 1.1);
    const S = this.sty;
    S.carve = spring(this.sC, X.carve || 0, 6, dt); S.snap = spring(this.sS, X.snap || 0, 9, dt);
    S.back = spring(this.sB, X.back || 0, 6, dt); S.wide = spring(this.sW, X.wide || 0, 7, dt); S.banked = X.banked ? 1 : 0;
    if (st === 2 && this.lastState !== 2) this.popT = 0;
    this.popT += dt;
    const G = this.G = !!X.goofy;

    let target, duckPitch = null;
    if (st === 3) target = this._wipe(me, X);
    else if (st === 1) { const D = duck(me.stateT || 0); target = D.pose; duckPitch = D.pitch; }
    else if (st === 2) {
      // Pumping along a flat section: up and down about once a second, fading out in a turn.
      const pump = X.pump !== undefined ? X.pump : 0.045 * Math.sin(this.t * 6.3) * Math.max(0, 1 - Math.abs(this.lean) / 0.35);
      // A goofy footer's toe side is the LEFT rail, so the same turn is the other lean to them.
      let ride = stance(this.comp, G ? -this.lean : this.lean, this.t, pump, S), tk = tuck();
      // In the air (stage 6): folded into the grab by the board's own X.air - not sprung here: the board
      // eases it in and out, so the figure keeps no state of its own for it (surfer/replay.js FIG_STATE).
      const air = cl(X.air || 0, 0, 1);
      if (air > 0) ride = blendPose(ride, grab(this.t), air);
      if (G) { ride = mirror(ride); tk = mirror(tk); }
      // The pop-up: push up, tuck the feet through, rise into the crouch - about half a second.
      const p = this.popT;
      target = p < 0.14 ? pushUp() : p < 0.3 ? blendPose(pushUp(), tk, ease((p - 0.14) / 0.16))
        : p < 0.55 ? blendPose(tk, ride, ease((p - 0.3) / 0.25)) : ride;
    } else {
      target = blendPose(prone(this.phase, this.amp, 0.03 * this.amp * Math.sin(this.phase * Math.PI * 8)), sit(this.look, this.t, spin), ease(this.sit));
      // Off the feet after a ride: hands to the deck, a knee down, then flat and paddling.
      if (this.lastState === 2) { this.downT = 0; this.downFrom = this.pose; }
      if (this.downT < 0.8) {
        const d = this.downT;
        target = d < 0.35 ? blendPose(this.downFrom, kneel(), ease(d / 0.35)) : blendPose(kneel(), target, ease((d - 0.35) / 0.45));
        this.downT += dt;
      }
    }
    // Crossfade from wherever the body was when the state changed - except for the sequences that
    // start from the pose they found (a wipeout, lying down after a ride).
    if (st !== this.lastState) { this.fromPose = this.pose; this.fromT = 0; }
    this.fromT += dt;
    const xf = st === 2 ? 0.12 : 0.3;
    const own = st === 3 || (st === 0 && this.downT < 0.8);
    this.pose = !own && this.fromPose && this.fromT < xf ? blendPose(this.fromPose, target, ease(this.fromT / xf)) : target;
    this.lastState = st;
    if (st !== 3) this.rig = null;
    // Diving, the figure owns the board's pitch outright (nose under, level, nose back up).
    // (Kept on the figure as `ex` too: the first-person camera carries the eyes the same way.)
    if (duckPitch !== null) { this.duckP = this.duckP === undefined ? duckPitch : this.duckP + (duckPitch - this.duckP) * Math.min(1, dt * 12); return (this.ex = { pitch: this.duckP, drop: 0, abs: true }); }
    this.duckP = undefined;
    if (st === 3) return (this.ex = { pitch: 0, drop: 0 });
    return (this.ex = { pitch: 0.12 * ease(this.sit), drop: -0.05 * ease(this.sit) });
  }

  // THE WIPEOUT'S BODY (see wipeBoard above for the whole sequence). The pose is built in the RIG
  // frame until they climb on, and in the board's own frame after (this.rig.mount); the caller
  // draws it with whichever transform this.rig says. X.wipeT: the length (1.6 s default); wipeTurn:
  // the heading they finish on; wipeRel: where the board was, relative to the rig, as they fell
  // ({dy, pitch, roll}); wipeHs / wipeHb: the water's height at the swimmer / the board relative
  // to the rig's origin (the caller samples it, a frame behind).
  _wipe(me, X) {
    if (this.lastState !== 3) this.wipeFrom = this.pose;
    const T = X.wipeT || 1.6, turn = X.wipeTurn || 0, rel = X.wipeRel || NOREL, hs = X.wipeHs || 0;
    const t = me.stateT || 0, G = !!X.goofy, tt = this.t;
    const { i, k } = wipePhase(t, T);
    const Rb = rot(0, rel.pitch, rel.roll);
    const fo = G ? mirror(fallOff()) : fallOff();
    const fallEnd = xform(fo, Rb, [0.35, rel.dy - 0.25, 0]);
    const P = swimPoint(turn);
    // UNDER: the body goes down as a whole, fast (the hips 0.95 m under within the first third), while
    // the limbs fold from the fall into the tuck more slowly, relative to the hips - so no leg is left
    // sticking up out of the white water while the rest of them has gone (the owner's "foot").
    const fallRel = shift(fallEnd, sc(fallEnd.hip, -1));
    const underAt = (q, kk) => {
      const tuck = xform(curl(tt), rot(0.3 * kk + 0.3 * turn * q, 1.8 * q, 0.7 * Math.sin(Math.PI * kk)), null);
      const hip = [lerp(fallEnd.hip[0], P[0], q), lerp(fallEnd.hip[1], -0.95, ease(Math.min(1, kk / 0.3))), lerp(fallEnd.hip[2], P[2], q)];
      return shift(blendPose(fallRel, tuck, ease(Math.min(1, kk / 0.6))), hip);
    };
    let pose, mount = false;
    if (i === 0) {
      pose = blendPose(xform(this.wipeFrom || fo, Rb, [0, rel.dy, 0]), fallEnd, ease(k));
    } else if (i === 1) {
      pose = underAt(ease(k), k);
    } else if (i === 2) {
      const q = ease(k), y0 = 0.3 + 0.3 * turn;
      const up = xform(tread(tt), rot(y0 + wrapPI(turn - y0) * q, 0, 0), [P[0], -0.55 * (1 - q) + hs * q, P[2]]);
      pose = k < 0.4 ? blendPose(underAt(1, 1), up, ease(k / 0.4)) : up;
    } else if (i === 3) {
      const q = ease(k);
      pose = xform(blendPose(back(tread(tt)), reachB(tt), q), rot(turn, 0, 0), [0, hs * (1 - q), 0]);
    } else {
      mount = true;
      pose = k < 0.45 ? blendPose(reachB(tt), pullB(), ease(k / 0.45)) : blendPose(pullB(), prone(0, 0, 0), ease((k - 0.45) / 0.55));
    }
    // The leash's far end: the board's tail plug, in whichever frame the body is drawn in.
    const b = wipeBoard(t, T, turn, rel, this._wb || (this._wb = {}));
    const T0 = this.tailAt || TAIL;   // BOARDS: the plug of the hull being ridden
    let tail = T0;
    if (!mount) { const q = rotPoint(T0, b.yaw, b.pitch, b.roll); tail = [b.x + q[0], b.y + q[1] + (X.wipeHb || 0), b.z + q[2]]; }
    this.rig = { mount, tail, board: b, swim: P, phase: i };
    return pose;
  }

  // A FIGURE THAT JOINS MID-MOVE (stage 4, 27 Sep 2026). A line-up surfer keeps their figure while
  // they are further off than the jointed few, and it is only updated while it is drawn - so one
  // that came back into that set still carried the state it was last drawn in: a lastState of
  // "riding" had it replay the whole kneel-down after a ride that ended long ago, a stale fromPose
  // crossfaded from a pose metres away, springs eased in from an old lean. snapTo() puts the springs,
  // the sitting and the stroke where this state has them settled, forgets every transition and poses
  // the body at once. gl/surfers.js calls it as a surfer joins the jointed set; the arguments and the
  // return are update()'s. It adds no state of its own (surfer/replay.js FIG_STATE lists it all).
  snapTo(me, X) {
    X = X || NOX;
    const st = me.state | 0, thr = st === 0 ? (me.thr || 0) : 0;
    const still = st === 0 && thr < 0.05 && ((me.wave && me.wave.foam) || 0) < 0.35;
    const set = (s, x) => { s.x = x; s.v = 0; return x; };
    this.amp = thr > 0.05 ? 0.55 + 0.45 * thr : 0;
    this.stillT = still ? 1.3 : 0; this.sit = still ? 1 : 0;
    this.lean = set(this.sLean, cl((me.r || 0) / 1.4, -1, 1));
    this.comp = cl(set(this.sComp, X.comp !== undefined ? X.comp : 0.5 + 0.4 * Math.abs(this.lean)), 0, 1.1);
    set(this.sSpin, X.spin || 0);
    set(this.sC, X.carve || 0); set(this.sS, X.snap || 0); set(this.sB, X.back || 0); set(this.sW, X.wide || 0);
    this.lastState = st; this.fromPose = null; this.fromT = 9; this.popT = 9;
    this.downT = 9; this.downFrom = null; this.wipeFrom = null; this.duckP = undefined;
    return this.update(me, 0, X);
  }

  // THE EYES, for the first-person camera (src/surfer/pov-cam.js): the middle of the head and the way
  // the face and the crown point, from the pose as last drawn, in the frame it was drawn in (the
  // board's, or in a wipeout the rig's - this.drawAt says which transform that was).
  eyes() {
    const B = skeleton(this.pose), hb = B[FB.HEAD], H = B.H;
    return { c: add(hb.a, H.u, R.headH * 0.5), f: H.f, u: H.u, deck: DECK };
  }

  // Skin the body and rebuild the leash into this.data. `leash` false hides it. BOARDS: a number is the
  // cord's radius in metres, when more than its own 5.5 mm (gl/surfers.js leashR: never under 0.8 px).
  write(leash, out) {
    const B = skeleton(this.pose), bd = this.bind, M = this.M;
    for (let i = 0; i < NB; i++) {
      const b0 = bd[i], b1 = B[i], o = i * 12;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) M[o + r * 3 + c] = b1.X[r] * b0.X[c] + b1.Y[r] * b0.Y[c] + b1.Z[r] * b0.Z[c];
      for (let r = 0; r < 3; r++) M[o + 9 + r] = b1.a[r] - (M[o + r * 3] * b0.a[0] + M[o + r * 3 + 1] * b0.a[1] + M[o + r * 3 + 2] * b0.a[2]);
    }
    // SKINNING WITHOUT GARBAGE (27 Sep 2026, the PIER SURF perf audit). Math.hypot is not inlined by
    // the optimising compiler: every call boxed its three arguments as heap numbers - 527 KB of
    // garbage a frame in write() plus 173 KB in hypot itself, for the player and the line-up's jointed
    // figures together. A square root of the sum of squares is the same number here (no overflow at
    // metre scales; the skinned buffer compares BIT-IDENTICAL over every state, both lods -
    // tmp-tr161/suites-live/test-surf-perf.mjs), the per-vertex offsets are hoisted, and the
    // roughness channel - static, filled with the colours by makeData(), which every buffer this is
    // given comes from - is not rewritten 7,000 times a frame (only if the buffer lacks it).
    // Measured, paddling in headless Chrome (tmp-audit/stage1-perf, A/B on the same tree): the page's
    // garbage 1,034 -> 283 KB a frame; write() 3.9-4.4 -> 1.9-2.4 ms a frame at a 4x CPU throttle,
    // 1.35 -> 0.76 ms unthrottled; in Node the player's write() 344 -> 180 us.
    const { b0, b1, w1 } = this.skin, P = this.bindPos, N = this.bindNrm, D = out || this.data, n = this.bodyVerts;
    const rough = this.rough, fillRough = D[9] !== rough[0];
    for (let k = 0, k3 = 0, q = 0; k < n; k++, k3 += 3, q += 10) {
      const x = P[k3], y = P[k3 + 1], z = P[k3 + 2], nx = N[k3], ny = N[k3 + 1], nz = N[k3 + 2];
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
      const il = 1 / (Math.sqrt(mx * mx + my * my + mz * mz) || 1);
      D[q] = px; D[q + 1] = py; D[q + 2] = pz; D[q + 3] = mx * il; D[q + 4] = my * il; D[q + 5] = mz * il;
      if (fillRough) D[q + 9] = rough[k];
    }
    // The leash, back ankle (the right, or a goofy footer's left) to the tail plug, sagging onto the
    // deck - or, in a wipeout, across the water to wherever the board has got to.
    const ank = B[this.G ? FB.FOOT_L : FB.FOOT_R].a, base = this.bodyVerts * 10;
    const off = !!(this.rig && !this.rig.mount), TA = this.tailAt, tail = this.rig ? this.rig.tail : TA || TAIL;
    // BOARDS: on another hull the deck it rests on runs from DECK under the ankle to that hull's plug
    // (its deck there 1 cm under it) - the tail rocker and a pad's kick lift it - and ends 19 cm past
    // the plug, as the foamie's does (-1.05 = -0.86 - 0.19).
    const dx0 = TA ? TA[0] - 0.19 : -1.05, dRise = TA ? TA[1] - 0.01 - DECK : 0, dSpan = TA ? TA[0] - ank[0] : 1;
    const rOn = (typeof leash === 'number' && leash > 0.0055 ? leash : 0.0055) + 0.001;
    const span = len(sub(tail, ank)), sag = off ? 0.05 + 0.3 * Math.max(0, 2.2 - span) : 0.09;
    for (let i = 0; i < LEASH_N; i++) {
      const u = i / (LEASH_N - 1);
      let p = lerp3(ank, tail, u);
      p[1] = p[1] - sag * Math.sin(Math.PI * u);
      // It rests ON the deck where it lies over the board - not where it runs back into the water to
      // a foot that is still in it (climbing back on), which lifted a straight line out of the sea.
      // (BOARDS: on another hull the cord's middle rests a millimetre over its own radius, rOn; the
      // foamie's 8 mm over DECK - which its tail rocker climbs to near the plug - is kept as it was.)
      if (!off && p[0] > dx0 && Math.abs(p[2]) < 0.3) p[1] = Math.max(TA ? DECK + dRise * Math.min(1, Math.max(0, (p[0] - ank[0]) / dSpan)) + rOn : DECK + 0.008, p[1]);
      const nx = Math.min(LEASH_N - 1, i + 1), pv = Math.max(0, i - 1);
      const tn = unit(sub(lerp3(ank, tail, nx / (LEASH_N - 1)), lerp3(ank, tail, pv / (LEASH_N - 1))));
      const n1 = unit(cross(Math.abs(tn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], tn)), n2 = cross(tn, n1);
      const r = leash ? (typeof leash === 'number' && leash > 0.0055 ? leash : 0.0055) : 0;
      for (let k = 0; k <= LEASH_SEG; k++) {
        const ang = (k / LEASH_SEG) * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
        const d = [n1[0] * c + n2[0] * s, n1[1] * c + n2[1] * s, n1[2] * c + n2[2] * s];
        const q = base + (i * (LEASH_SEG + 1) + k) * 10;
        D[q] = p[0] + d[0] * r; D[q + 1] = p[1] + d[1] * r; D[q + 2] = p[2] + d[2] * r;
        D[q + 3] = d[0]; D[q + 4] = d[1]; D[q + 5] = d[2]; D[q + 9] = this.rough[this.bodyVerts + i * (LEASH_SEG + 1) + k];
      }
    }
    return D;
  }
}
