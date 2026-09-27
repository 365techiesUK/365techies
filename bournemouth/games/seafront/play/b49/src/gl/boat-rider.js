// A SKINNED rider for the PWC (tmp-tr95). Replaces the baked lean poses the
// jetski used (5 poses x 5 materials, one picked per frame) with ONE figure
// whose vertices are transformed on the CPU from a 16-bone skeleton every
// frame. Same five materials, same five draw calls, no extra draw call, and
// far less uploaded geometry than the pose stack it replaces.
//
// WHY A RIG. The brief wants the rider to lean into the turn, rise off the seat
// and shift back onto the plane, absorb slams with her knees, tuck at speed and
// keep her hands on the bars AS THE BARS TURN. That is four continuous axes;
// baking it would need dozens of poses. Skinning costs ~1.5k vertices of
// float work per frame, which is less than the wake already does.
//
// HOW.
//   skeleton(p)  solves the joint positions for a pose (2-bone IK at knee and
//                elbow, so the feet stay planted in the footwells and the hands
//                stay on the grips), and gives every bone an orthonormal frame.
//   build        makes the mesh ONCE in the bind pose and tags every vertex
//                with the bone that made it; joints are then softened by
//                blending into the parent/child bone over the end 20% of a bone.
//   boneMats     per frame: M = R_posed * R_bind^T, t = a_posed - M a_bind.
//                Rigid, because IK preserves limb length, so normals take the
//                same M.
//
// Frame: +X forward, +Y up, +Z right, y 0 = static waterline, ski design frame.

import { MeshBuilder, RIDER, RIDER_MAT } from './meshes.js';
import { V3, blob, sweep, cross, sc, cl, vestBack, coneGap, BACK_ROUNDEL } from './boat-meshes.js';

// The buoyancy aid, as ONE set of numbers. The blob below is built from them
// and so is the livery patch that has to lie on its back, so the mark cannot
// drift off the vest when the vest is re-shaped. (tr153)
export const VEST = { up: 0.60, fwd: 0.012, rx: 0.152, ry: 0.212, rz: 0.222, e1: 0.8, e2: 0.8, seg: 12, rings: 7 };

// Bone ids are offset by BONE0 in the craft's bone array (0 = static, 1 = bars,
// 2 = nozzle), so the rider can share one bone list with the moving hardware.
export const RB = {
  PELVIS: 0, TORSO: 1, NECK: 2, HEAD: 3,
  THIGH_L: 4, SHIN_L: 5, FOOT_L: 6,
  THIGH_R: 7, SHIN_R: 8, FOOT_R: 9,
  UARM_L: 10, FARM_L: 11, HAND_L: 12,
  UARM_R: 13, FARM_R: 14, HAND_R: 15,
};
export const RIDER_BONES = 16;
const PARENT = [-1, RB.PELVIS, RB.TORSO, RB.NECK,
  RB.PELVIS, RB.THIGH_L, RB.SHIN_L, RB.PELVIS, RB.THIGH_R, RB.SHIN_R,
  RB.TORSO, RB.UARM_L, RB.FARM_L, RB.TORSO, RB.UARM_R, RB.FARM_R];
const CHILD = [RB.TORSO, RB.NECK, RB.HEAD, -1,
  RB.SHIN_L, RB.FOOT_L, -1, RB.SHIN_R, RB.FOOT_R, -1,
  RB.FARM_L, RB.HAND_L, -1, RB.FARM_R, RB.HAND_R, -1];

const unit = V3.unit, add = V3.add, sub = V3.sub, dot = V3.dot;
const R = RIDER;

// A TWO-BONE CHAIN CANNOT REACH PAST l1 + l2, and what it does when asked to is
// the difference between a rider and a rag doll.
//
// ik() below already clamps the length it solves with, so the elbow always sits
// exactly l1 from the shoulder - but the caller then built the second bone from
// that elbow to the UNCLAMPED target, and that bone came out longer than the
// forearm. Every vertex is transformed by its own bone's rigid matrix, so the
// forearm mesh does not stretch to fill it: it stays 270 mm long and the HAND,
// which is anchored at the target, walks off the end of it. MEASURED on the
// shipped stances the moment the rig was woken up: 122 mm of tear at the ski's
// right wrist, 71 mm at the RIB's. It had never shown because nothing ever
// posed the rig.
//
// So the TARGET is pulled onto the reach sphere here, before anything is built
// from it. Both bones then keep their exact lengths in every pose - the figure
// cannot come apart, whatever amplitude a stance asks for - and the cost is
// paid where it belongs: the hand comes a few mm short of the grip instead.
// tmp-tr162/test-rig162.mjs holds both halves of that, the bone lengths as a
// hard equality and the residual slip as a bound.
export function reachClamp(root, target, l1, l2) {
  const d = sub(target, root), L = V3.len(d), m = l1 + l2 - 1e-3;
  return L <= m ? target : add(root, sc(d, 1 / L), m);
}

function ik(a, c, bend, l1, l2) {
  const d = sub(c, a), L = Math.min(V3.len(d), l1 + l2 - 1e-3), u = unit(d);
  const along = (l1 * l1 - l2 * l2 + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  let p = sub(bend, sc(u, dot(bend, u)));
  if (V3.len(p) < 1e-4) p = [0, 1, 0];
  return add(add(a, u, along), unit(p), h);
}

// One bone: start a, end b, and a frame (X along the bone, Z = X x ref).
function bone(a, b, ref) {
  const X = unit(sub(b, a));
  let Z = cross(X, ref);
  if (V3.len(Z) < 1e-4) Z = cross(X, Math.abs(X[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
  Z = unit(Z);
  const Y = cross(Z, X);
  return { a, b, X, Y, Z };
}

// ---------------------------------------------------------------------------
// The pose. p: hip[3], lean, tilt, twist, headUp, footL/footR (ankles),
// gripL/gripR, barAxis (unit, pointing to +z along the bar), and OPTIONALLY
// axisL / axisR - a per-hand replacement for barAxis, for a rider whose two
// hands are not on one shared tube (the RIB's wheel and throttle).
export function skeleton(p) {
  const up = unit([Math.sin(p.lean), Math.cos(p.lean) * Math.cos(p.tilt), Math.sin(p.tilt)]);
  const side = unit(sub([0, 0, 1], sc(up, up[2])));
  const fwd = cross(up, side);
  const hip = p.hip;
  const spine = add(hip, up, 0.12);
  const shC = add(add(hip, up, R.torso), fwd, 0.012);
  const hUp = unit([Math.sin(p.lean * 0.3 + (p.headUp || 0)), 1, Math.sin(p.tilt * 0.4)]);
  const neckTop = add(shC, hUp, R.neck + 0.012);
  const B = new Array(RIDER_BONES);
  B[RB.PELVIS] = bone(hip, spine, side);
  B[RB.TORSO] = bone(spine, shC, side);
  B[RB.NECK] = bone(shC, neckTop, side);
  B[RB.HEAD] = bone(neckTop, add(neckTop, hUp, R.headH), side);
  for (const s of [1, -1]) {
    const T = s > 0 ? RB.THIGH_R : RB.THIGH_L, U = s > 0 ? RB.UARM_R : RB.UARM_L;
    // Leg: hip joint -> knee (up and outboard) -> ankle, then a flat foot.
    const hj = add(hip, side, s * (R.hipW / 2 + 0.035));
    const ankle = reachClamp(hj, s > 0 ? p.footR : p.footL, R.thigh, R.shin);
    const bend = add(add(sc(fwd, 1), [0, 0.85, 0]), side, s * 0.5);
    const knee = ik(hj, ankle, bend, R.thigh, R.shin);
    B[T] = bone(hj, knee, cross(unit(sub(knee, hj)), unit(sub(ankle, knee))));
    B[T + 1] = bone(knee, ankle, B[T].Z);
    B[T + 2] = bone(ankle, add(ankle, [0.986, 0.166, 0], R.footL * 0.8), [0, 1, 0]);
    // Arm: shoulder -> elbow (down and outboard) -> wrist, hand along the bar.
    const shP = add(add(add(shC, side, s * R.shoulderW * 0.45), up, -0.035), fwd, 0.02);
    const grip = s > 0 ? p.gripR : p.gripL;
    // The axis the hand is wrapped around, pointing wrist -> fingertips. ONE
    // bar means one axis for both hands and `barAxis` is it, mirrored by s. A
    // wheel and a throttle lever are two different things held two different
    // ways, so either hand may name its own instead. The PWC names neither, so
    // its skeleton is arithmetically unchanged.
    const hx = s > 0 ? p.axisR : p.axisL;
    const out = hx ? unit(hx) : sc(p.barAxis, s);
    const wrist = reachClamp(shP, add(grip, out, -0.055), R.upperArm, R.foreArm);
    const eb = add(add(sc(fwd, -0.3), [0, -1, 0]), side, s * 0.95);
    const elbow = ik(shP, wrist, eb, R.upperArm, R.foreArm);
    B[U] = bone(shP, elbow, cross(unit(sub(elbow, shP)), unit(sub(wrist, elbow))));
    B[U + 1] = bone(elbow, wrist, B[U].Z);
    B[U + 2] = bone(wrist, add(wrist, out, 0.13), unit(sub(wrist, elbow)));
  }
  B.up = up; B.side = side; B.fwd = fwd;
  return B;
}

// ---------------------------------------------------------------------------
// Geometry, built once in the bind pose. Every primitive is wrapped in mark()
// so its vertices carry the bone that made them.
function buildMesh(B, cfg) {
  const mats = [0, 1, 2, 3, 4].map(() => ({ m: new MeshBuilder(), r: [] }));
  const W = mats[RIDER_MAT.WETSUIT], VEST_M = mats[RIDER_MAT.VEST], SKIN = mats[RIDER_MAT.SKIN];
  const HAIR = mats[RIDER_MAT.HAIR], BOOT = mats[RIDER_MAT.BOOT];
  const mark = (t, b, fn) => { const from = t.m.vertexCount; fn(t.m); t.r.push([from, t.m.vertexCount, b]); };
  const up = B.up, side = B.side, fwd = B.fwd;
  const BA = { X: fwd, Y: up, Z: side };

  // ---- pelvis and torso -------------------------------------------------
  const hip = B[RB.PELVIS].a, shC = B[RB.TORSO].b;
  mark(W, RB.PELVIS, (m) => blob(m, add(hip, up, 0.04), 0.125, 0.115, 0.175, { ...BA, seg: 10, rings: 6 }));
  mark(W, RB.TORSO, (m) => {
    const a = add(hip, up, TORSO.y0), b = add(shC, up, TORSO.y1);
    m.tube(a[0], a[1], a[2], b[0], b[1], b[2], TORSO.r0, TORSO.r1, TORSO.seg);
  });
  // Buoyancy aid: body, two shoulder straps and a waist belt, all in the eFoil
  // rider's vest colour so the two riders match.
  mark(VEST_M, RB.TORSO, (m) => blob(m, vestCentre(hip, up, fwd),
    VEST.rx, VEST.ry, VEST.rz, { ...BA, seg: VEST.seg, rings: VEST.rings, e1: VEST.e1, e2: VEST.e2 }));
  mark(VEST_M, RB.TORSO, (m) => {
    // A raised front panel so the vest is not one smooth egg.
    blob(m, add(add(hip, up, R.torso * 0.56), fwd, 0.135), 0.035, 0.155, 0.135, { ...BA, seg: 8, rings: 6, e1: 0.5, e2: 0.4 });
  });
  mark(BOOT, RB.TORSO, (m) => {
    // Zip line up the centre front, and the two shoulder straps over the top.
    const z0 = add(add(hip, up, R.torso * 0.33), fwd, 0.155), z1 = add(add(hip, up, R.torso * 0.86), fwd, 0.10);
    m.tube(z0[0], z0[1], z0[2], z1[0], z1[1], z1[2], 0.011, 0.011, 5);
    for (const s of [1, -1]) {
      const c = add(hip, up, R.torso * 0.80);
      const pts = [add(add(c, fwd, 0.125), side, s * 0.05), add(add(c, fwd, 0.06), side, s * 0.135),
        add(add(add(c, up, 0.085), fwd, -0.01), side, s * 0.14), add(add(c, fwd, -0.09), side, s * 0.115)];
      sweep(m, pts, 0.017, 5);
    }
    // Waist belt right round the vest.
    const belt = [];
    for (let k = 0; k <= 14; k++) {
      const a = (k / 14) * Math.PI * 2, c = add(hip, up, R.torso * 0.34);
      belt.push(add(add(c, fwd, 0.145 * Math.cos(a)), side, 0.215 * Math.sin(a)));
    }
    sweep(m, belt, 0.013, 4);
  });
  // Wetsuit panel seams: a yoke across the chest and one down each flank.
  mark(BOOT, RB.TORSO, (m) => {
    const c = add(hip, up, R.torso * 0.90);
    sweep(m, [add(add(c, side, -0.15), fwd, -0.02), add(c, fwd, 0.085), add(add(c, side, 0.15), fwd, -0.02)], 0.008, 4);
  });
  for (const s of [1, -1]) {
    mark(W, RB.TORSO, (m) => blob(m, add(add(add(shC, side, s * R.shoulderW * 0.42), up, -0.02), fwd, 0.01),
      0.082, 0.078, 0.082, { ...BA, seg: 8, rings: 5 }));
  }

  // ---- neck, head, hair -------------------------------------------------
  const nb = B[RB.NECK], hb = B[RB.HEAD];
  mark(SKIN, RB.NECK, (m) => m.tube(nb.a[0], nb.a[1] - 0.035, nb.a[2], nb.b[0], nb.b[1], nb.b[2], 0.062, 0.049, 8));
  const hc = add(hb.a, hb.X, R.headH * 0.47);
  // hb.X is up along the neck, hb.Z is forward, hb.Y is -side.
  const HB = { X: hb.Z, Y: hb.X, Z: hb.Y };
  mark(SKIN, RB.HEAD, (m) => blob(m, hc, R.headD / 2, R.headH / 2, R.headW / 2,
    { X: HB.X, Y: HB.Y, Z: HB.Z, seg: 12, rings: 8 }));
  mark(HAIR, RB.HEAD, (m) => {
    blob(m, add(add(hc, hb.X, 0.028), HB.X, -0.028), R.headD / 2 + 0.005, R.headH / 2 - 0.012, R.headW / 2 + 0.008,
      { X: HB.X, Y: HB.Y, Z: HB.Z, seg: 12, rings: 8 });
    // A short tail, blown back: it is what gives the head a silhouette at 30 m.
    const t0 = add(add(hc, HB.X, -0.082), hb.X, -0.035);
    sweep(m, [t0, add(add(t0, HB.X, -0.035), hb.X, -0.055), add(add(t0, HB.X, -0.058), hb.X, -0.125)], (i, n) => 0.038 - 0.026 * (i / (n - 1)), 6);
    // Sunglasses: a dark band across the eyes. Tiny, and it is what stops the
    // head reading as a bare ovoid from 20 m out.
    const eb = [];
    for (let k = 0; k <= 6; k++) {
      const a = (-1.0 + 2.0 * k / 6);
      eb.push(add(add(add(hc, HB.X, Math.cos(a * 0.9) * (R.headD / 2 + 0.004)), HB.Z, Math.sin(a * 0.9) * (R.headW / 2 + 0.004)), hb.X, 0.028));
    }
    sweep(m, eb, 0.017, 4);
  });

  // ---- arms and hands ---------------------------------------------------
  for (const s of [1, -1]) {
    const U = s > 0 ? RB.UARM_R : RB.UARM_L, ua = B[U], fa = B[U + 1], ha = B[U + 2];
    mark(W, U, (m) => m.tube(ua.a[0], ua.a[1], ua.a[2], ua.b[0], ua.b[1], ua.b[2], 0.062, 0.048, 8));
    mark(W, U + 1, (m) => m.tube(fa.a[0], fa.a[1], fa.a[2], fa.b[0], fa.b[1], fa.b[2], 0.05, 0.034, 8));
    // Hand: palm on the back of the bar, four fingers curled over the front,
    // thumb under. cfg.grip is the grip radius.
    const wr = ha.a, out = ha.X, hu = unit(sub(ha.a, fa.a));       // toward the wrist
    const hUpV = unit(sub(up, sc(out, dot(up, out))));
    const hFw = unit(cross(hUpV, out));
    const rg = cfg.grip;
    mark(SKIN, U + 2, (m) => {
      const pc = add(add(wr, out, 0.062), hUpV, 0.022);
      blob(m, add(pc, hFw, -0.012), 0.062, 0.036, 0.05, { X: out, Y: hUpV, Z: hFw, seg: 8, rings: 5, e1: 0.6, e2: 0.6 });
      for (let k = 0; k < 4; k++) {
        const off = 0.028 + k * 0.026, rr = rg + 0.013 - 0.001 * k;
        const at = (th) => add(add(add(wr, out, off), hUpV, Math.cos(th) * rr), hFw, Math.sin(th) * rr);
        const p0 = at(0.5), p1 = at(1.75), p2 = at(2.85);
        m.tube(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 0.0135, 0.0125, 5);
        m.tube(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], 0.0125, 0.011, 5);
      }
      const th0 = add(add(add(wr, out, 0.022), hUpV, rg * 0.55), hFw, rg * 0.95);
      const th1 = add(add(add(wr, out, 0.085), hUpV, -rg * 0.15), hFw, rg * 1.15);
      m.tube(th0[0], th0[1], th0[2], th1[0], th1[1], th1[2], 0.018, 0.014, 6);
    });
  }

  // ---- legs and booties -------------------------------------------------
  for (const s of [1, -1]) {
    const T = s > 0 ? RB.THIGH_R : RB.THIGH_L, th = B[T], sh = B[T + 1], ft = B[T + 2];
    mark(W, T, (m) => m.tube(th.a[0], th.a[1], th.a[2], th.b[0], th.b[1], th.b[2], 0.098, 0.072, 9));
    mark(BOOT, T, (m) => {
      // Outside-leg panel seam.
      const q0 = add(add(th.a, th.Z, s * 0.082), th.X, 0.06), q1 = add(add(th.b, th.Z, s * 0.062), th.X, -0.04);
      m.tube(q0[0], q0[1], q0[2], q1[0], q1[1], q1[2], 0.0085, 0.0085, 4);
    });
    mark(W, T + 1, (m) => {
      m.tube(sh.a[0], sh.a[1], sh.a[2], sh.b[0], sh.b[1], sh.b[2], 0.072, 0.046, 9);
      blob(m, sh.a, 0.075, 0.072, 0.07, { X: sh.X, Y: sh.Y, Z: sh.Z, seg: 8, rings: 5 });
    });
    mark(BOOT, T + 2, (m) => {
      const ak = ft.a, f = ft.X, u2 = ft.Y;
      blob(m, add(ak, u2, 0.005), 0.062, 0.062, 0.056, { X: f, Y: u2, Z: ft.Z, seg: 8, rings: 5 });
      blob(m, add(add(ak, f, 0.115), u2, -0.028), 0.115, 0.042, 0.052, { X: f, Y: u2, Z: ft.Z, seg: 9, rings: 5, e1: 0.55, e2: 0.6 });
      blob(m, add(add(ak, f, 0.085), u2, -0.055), 0.145, 0.014, 0.055, { X: f, Y: u2, Z: ft.Z, seg: 8, rings: 4, e1: 0.3, e2: 0.35 });
    });
  }
  return mats;
}

// The centre of the buoyancy aid, from the same three numbers the blob uses.
export function vestCentre(hip, up, fwd) { return add(add(hip, up, R.torso * VEST.up), fwd, VEST.fwd); }

// THE ROUNDEL ON THE RIDER'S BACK (tr153).
//
// This is the single most-visible surface in the game: the chase camera sits
// behind the rider and her back is 59-181 px wide across a real capture. It is
// where the owner's mark earns its place, and it is the reason the mark that
// goes here is the ROUNDEL and not the wordmark - a 7.4:1 lockup on a surface
// that is as tall as it is wide would have to shrink to a third of the height
// to fit, and the wordmark is the thing that dies first when it shrinks.
//
// The patch is laid on the vest's OWN superellipsoid, from VEST above, so it
// follows the curve of her back instead of floating in front of it.
//
// ⚠️ WHY THE LIFT IS 44 mm AND NOT THE 9 mm EVERY OTHER MARK USES. The wetsuit
// torso above (r 0.148 at the hip to 0.168 at the shoulder) is WIDER FORE-AFT
// THAN THE BUOYANCY AID IS, so it stands through the back of the vest: that
// dark panel across the rider's upper back is the wetsuit, not shading. It is
// how this figure has always looked and it is not this session's to change, but
// it means a decal laid on the vest at the usual 8 mm is BURIED for the middle
// third of its width - which is exactly what the first render showed. MEASURED
// along the back over the patch's whole span, the
// wetsuit stands up to 29.7 mm proud of the vest, worst at the centreline near
// the shoulders; 44 mm therefore clears it everywhere by 6.3 mm, and
// check-livery.mjs re-measures that clearance rather than trusting this note.
export function riderVestDecal(B, sheet, rect) {
  const hip = B[RB.PELVIS].a, up = B.up, fwd = B.fwd, side = B.side;
  const from = sheet.vertexCount;
  const size = vestBack(sheet, rect, vestCentre(hip, up, fwd), VEST.rx, VEST.ry, VEST.rz,
    { X: fwd, Y: up, Z: side, e1: VEST.e1, e2: VEST.e2 }, BACK_ROUNDEL.uHalf, BACK_ROUNDEL.lift);
  // THE MARK RIDES THE TORSO. The vest is carried by the TORSO bone, so the
  // patch cut from the vest's own skin is carried by it too: ONE rigid range,
  // no blend, because a sticker that shears is worse than one that clips.
  //
  // Without this the sheet holds no ranges at all, DecalSheet.skin() comes back
  // all-zero - which is bone STATIC, the hull - and the roundel hangs in the
  // bind pose while the rider leans out from under it. That is the exact
  // failure mode a decal welded to a bind pose has, and it is measured rather
  // than asserted: tmp-tr162/test-rig162.mjs holds the mark-to-torso distance
  // across a pose sweep and fails if it moves at all.
  sheet.bone(from, RB.TORSO);
  // MEASURE the clearance rather than assert it: every vertex just pushed, against
  // the wetsuit cone built from the SAME skeleton. Reported on the part and read
  // by check-livery.mjs, so a change to the vest, the wetsuit or the lift that
  // buries the mark is caught in node instead of on the owner's screen.
  const a0 = add(hip, up, TORSO.y0), b0 = add(B[RB.TORSO].b, up, TORSO.y1);
  return { ...size, clearance: coneGap(sheet, from, a0, b0, TORSO.r0, TORSO.r1) };
}

// The wetsuit torso, as one set of numbers - the decal above has to clear it.
export const TORSO = { y0: 0.06, y1: -0.05, r0: 0.148, r1: 0.168, seg: 10 };

// Primary bone per vertex, then soften the last 20% of each bone into the
// child and the first 20% into the parent.
function skinOf(t, B, base) {
  const n = t.m.vertexCount;
  const b0 = new Uint8Array(n), b1 = new Uint8Array(n), w1 = new Float32Array(n);
  for (const [from, to, bone] of t.r) {
    const bb = B[bone], L = Math.max(1e-4, V3.len(sub(bb.b, bb.a)));
    for (let k = from; k < to; k++) {
      const d = [t.m.v[k * 3] - bb.a[0], t.m.v[k * 3 + 1] - bb.a[1], t.m.v[k * 3 + 2] - bb.a[2]];
      const u = cl(dot(d, bb.X) / L, -0.5, 1.5);
      b0[k] = bone + base; b1[k] = bone + base; w1[k] = 0;
      if (u < 0.2 && PARENT[bone] >= 0) { b1[k] = PARENT[bone] + base; w1[k] = 0.5 * (1 - cl(u / 0.2, 0, 1)); }
      else if (u > 0.8 && CHILD[bone] >= 0) { b1[k] = CHILD[bone] + base; w1[k] = 0.5 * cl((u - 0.8) / 0.2, 0, 1); }
    }
  }
  return { b0, b1, w1 };
}

// ---------------------------------------------------------------------------
// Public: build the rig in a bind pose, and hand back a matrix writer.
export function buildRider(bindPose, cfg) {
  const B = skeleton(bindPose);
  const mats = buildMesh(B, cfg);
  return {
    parts: mats.map((t, k) => ({ mesh: t.m, mat: k, skin: skinOf(t, B, cfg.base || 0) })),
    bind: B,
  };
}

// Write M (row-major 3x3) and t for every rider bone into `out` at bone `base`.
// `shift` is the -cgX applied to the built vertices, folded into t.
export function riderMats(bind, pose, out, base, shift) {
  const P = skeleton(pose);
  for (let i = 0; i < RIDER_BONES; i++) {
    const b0 = bind[i], b1 = P[i], o = (base + i) * 12;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) out[o + r * 3 + c] = b1.X[r] * b0.X[c] + b1.Y[r] * b0.Y[c] + b1.Z[r] * b0.Z[c];
    }
    const a = b0.a;
    for (let r = 0; r < 3; r++) {
      out[o + 9 + r] = b1.a[r] - (out[o + r * 3] * a[0] + out[o + r * 3 + 1] * a[1] + out[o + r * 3 + 2] * a[2]);
    }
    // Vertices were shifted by -shift in x after the build; keep the map exact.
    out[o + 9] += out[o] * shift - shift;
    out[o + 10] += out[o + 3] * shift;
    out[o + 11] += out[o + 6] * shift;
  }
  return P;
}

// A rigid bone: rotation `ang` about `axis` through `pivot` (design frame).
export function rigidMat(out, idx, axis, ang, pivot, shift) {
  const o = idx * 12, c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
  const [x, y, z] = axis;
  const M = [t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c];
  for (let k = 0; k < 9; k++) out[o + k] = M[k];
  for (let r = 0; r < 3; r++) {
    out[o + 9 + r] = pivot[r] - (M[r * 3] * pivot[0] + M[r * 3 + 1] * pivot[1] + M[r * 3 + 2] * pivot[2]);
  }
  out[o + 9] += M[0] * shift - shift;
  out[o + 10] += M[3] * shift;
  out[o + 11] += M[6] * shift;
}

export function identityMat(out, idx) {
  const o = idx * 12;
  out[o] = 1; out[o + 1] = 0; out[o + 2] = 0;
  out[o + 3] = 0; out[o + 4] = 1; out[o + 5] = 0;
  out[o + 6] = 0; out[o + 7] = 0; out[o + 8] = 1;
  out[o + 9] = 0; out[o + 10] = 0; out[o + 11] = 0;
}

// Skin one part: bind interleaved (pos3, nrm3, ...) -> out, same layout.
//
// `stride` is the number of FLOATS per vertex, 6 by default. A livery decal is
// stride 8 - pos 3, normal 3, uv 2 - and its UVs are constants of the bind pose
// that must survive untouched, which is exactly what writing only q..q+5 does.
export function skinPart(bindData, skin, M, out, stride = 6) {
  const { b0, b1, w1 } = skin, n = b0.length;
  for (let k = 0; k < n; k++) {
    const q = k * stride;
    const x = bindData[q], y = bindData[q + 1], z = bindData[q + 2];
    const nx = bindData[q + 3], ny = bindData[q + 4], nz = bindData[q + 5];
    const w = w1[k], a = b0[k] * 12;
    let px, py, pz, mx, my, mz;
    px = M[a] * x + M[a + 1] * y + M[a + 2] * z + M[a + 9];
    py = M[a + 3] * x + M[a + 4] * y + M[a + 5] * z + M[a + 10];
    pz = M[a + 6] * x + M[a + 7] * y + M[a + 8] * z + M[a + 11];
    mx = M[a] * nx + M[a + 1] * ny + M[a + 2] * nz;
    my = M[a + 3] * nx + M[a + 4] * ny + M[a + 5] * nz;
    mz = M[a + 6] * nx + M[a + 7] * ny + M[a + 8] * nz;
    if (w > 0) {
      const b = b1[k] * 12, v = 1 - w;
      px = px * v + w * (M[b] * x + M[b + 1] * y + M[b + 2] * z + M[b + 9]);
      py = py * v + w * (M[b + 3] * x + M[b + 4] * y + M[b + 5] * z + M[b + 10]);
      pz = pz * v + w * (M[b + 6] * x + M[b + 7] * y + M[b + 8] * z + M[b + 11]);
      mx = mx * v + w * (M[b] * nx + M[b + 1] * ny + M[b + 2] * nz);
      my = my * v + w * (M[b + 3] * nx + M[b + 4] * ny + M[b + 5] * nz);
      mz = mz * v + w * (M[b + 6] * nx + M[b + 7] * ny + M[b + 8] * nz);
    }
    const l = Math.hypot(mx, my, mz) || 1;
    out[q] = px; out[q + 1] = py; out[q + 2] = pz;
    out[q + 3] = mx / l; out[q + 4] = my / l; out[q + 5] = mz / l;
  }
}
