// SPEEDBOAT: a 5.8 m sports RIB with a 150 hp outboard (tmp-tr41).
//
// PHYSICS PARAMETERS AND WHERE THEY COME FROM. Class-typical figures for a
// 5.5-6 m leisure RIB (e.g. the Ribeye/Ballistic/Valiant 5.8-6.0 m class, deep-V
// GRP hull, 100-150 hp outboard, two aboard); none is a single boat's brochure.
//   mass 1300 kg        dry hull ~650 + outboard ~220 + fuel ~150 + 2 adults ~170
//                       + kit; "loaded" in the class spread 1,100-1,450 kg
//   power 112 kW        150 hp at the prop shaft
//   eta 0.55            planing propeller overall efficiency (0.5-0.6 typical)
//   tStatic 4600 N      bollard pull of a 150 hp outboard on a planing pitch prop
//   waterplane 9.7 m^2  0.70 x 5.8 x 2.4 -> rho g A = 97 kN/m, static draft 0.13 m
//   uHump 6.0 m/s       volume Froude ~1.8 on displacement 1.27 m^3 (11.7 kn):
//                       the hump; uPlane 10 m/s (19 kn) is fully on the plane,
//                       which is where a RIB of this class "gets up"
//   cHump 0.12          R/W at the hump ~0.13 incl. friction: planing-hull
//                       series (Savitsky) put the hump at 0.12-0.18 R/W
//   kFric 4.3 N/(m/s)^2 1/2 rho S Cf with S ~3.5 m^2 wetted on the plane,
//                       Cf ~0.0024 incl. spray -> 4.3; aero kAero 0.9 (CdA 1.5)
//   kFric raised to 5.0 and kVisc 250 after the first headless run (43.6 kn
//                       top, 33 s coast-down): => top speed 41.3 kn flat out,
//                       planing in 4.7 s (class: 38-45 kn with 150 hp)
//   rMin 9 m, aLatMax 7 m/s^2 (0.7 g): a hard-over RIB turn; a sports RIB pulls
//                       0.6-0.8 g and bleeds speed doing it (turnDrag 0.2)
//   tauHump 7 deg bow rise at the hump, 3.5 deg planing trim, +/-2.5 deg driver
//                       trim (outboard trim range), bank 0.3 of the lateral g
//                       (~12 deg at 0.7 g) - a deep-V banks in, modestly.

import { MeshBuilder } from '../gl/meshes.js';
import { box, loft, seatedFigure } from '../gl/boat-meshes.js';

const DEG = Math.PI / 180;

export const SPEEDBOAT = {
  name: 'speedboat', label: 'SPEEDBOAT', unit: 'kn', unitScale: 1.943844,
  // ---- HANDLING PARAMETERS (tmp-tr50 realism pass; values the header does not
  // cover, or that changed, are sourced here - details in tmp-tr50/RESULT.md) ----
  // Target: Mercury Boat House Bulletin, Zodiac NZO 680 RIB + Mercury 150
  // FourStroke (4 cyl, 1383 kg as tested, calm): 0-20 mph 3.83 s, 0-30 mph
  // 6.53 s, WOT 46.5 mph @ 5800 rpm, idle 600 rpm = 3.4 mph; 2000 rpm 9.1 mph
  // (hump), 3000 rpm 20.6 mph (planing).
  mass: 1300, length: 5.8, beam: 2.4,
  // tStatic 4600 -> 4900 N: spool lag now costs ~0.5 s, this keeps 0-20/0-30 on
  // the bulletin (150 hp bollard pull ~35 N/hp on a planing prop).
  etaP: 0.55 * 112000, tStatic: 4900, tauEngine: 0.35, reverseFrac: 0.35,
  // Engine: electronic-throttle NA 4-cyl turning a 19 in prop - WOT rpm under
  // load in ~1 s (spoolUp tau 0.55 s), off faster. rpm 0 = idle 600, 1 = rated
  // 5800; holeRpm 0.62 = ~3800 rpm at the hole shot (prop slip), full at uRated.
  spoolUp: 0.55, spoolDown: 0.25, rpmUp: 0.3, rpmDown: 0.45, holeRpm: 0.62, uRated: 20.8,
  rpmIdle: 600, rpmMax: 5800, cylinders: 4,
  // Gear: an outboard shifts through neutral at idle; reverse only engages
  // slow (shiftU 2.5 m/s ~5 kn). Reverse rpm capped; transom-first drag x1.6
  // (a flat transom pushed through the water) -> ~5 kn astern flat out.
  shiftTime: 0.6, shiftU: 2.5, revCap: 0.55, revIdle: 0.25, asternDrag: 1.6,
  // Power trim (W in / S out) runs slowly: first-order 1.2 s to the lever.
  trimTau: 1.2,
  waterplane: 9.7, heaveZeta: 0.35, addedMass: 0.25, addedMassX: 0.08,
  freeboard: 0.55, slamV: 4.0, draft: 0.34, restLift: 0,
  // Slam: wedge water entry 1/2 rho Cs A v^2 on each 1.08 m^2 bottom panel while
  // it is within entryDepth of the surface; Cs 3.0 for a ~20 deg deadrise (Wagner
  // flat-plate limit is far higher, deadrise and air cushion cut it).
  // >>> DRAG
  // slamScrub 0.3 IS A FITTED SEAWAY-RESISTANCE COEFFICIENT AND THE LABEL IT CARRIED WAS
  // NOT EARNED. It read "horizontal share of the impact at running trim + wave slope
  // (sin 15-20 deg)", i.e. 0.26-0.34. Both quantities are in the model, so they were
  // measured (tmp-tr179): over every tick carrying a water-entry impulse, weighted by that
  // impulse, this hull's running trim plus the along-heading wave slope is
  //   glass 4.54 deg   groundswell 4.17   modal straight 5.53   modal carve 5.31
  //   fresh breeze 5.40   lively 4.84   storm 4.58
  // whose sine is 0.073-0.096. The constant is 3-4x its own stated derivation. It is also
  // the LARGEST single term in this craft's seaway resistance - 30% to 48% of total hull
  // drag depending on sea state, against 12% for the lift-induced term - so it is not a
  // detail; and nothing in the project can calibrate it, because there is no seaway speed
  // reference, only the flat-water bulletin below, on which slamScrub is identically zero.
  // The VALUE is therefore left alone and the CLAIM is withdrawn instead. Anyone who moves
  // it should know they are moving about a third of the seaway drag budget.
  // It does not move with tmp-tr179's work: that work shipped no physics, and the entry
  // angle it is derived from is unchanged.
  entryDepth: 0.25, slamCs: 3.0, slamVmax: 6, slamScrub: 0.3, slamEventG: 2.0,
  // <<< DRAG
  pitchDamp: 1.5, pitchDampAir: 0.3, rollDamp: 2, rollDampLin: 2.0,
  // >>> DRAG
  // cPlane 0.05 had no stated derivation; it has one now (tmp-tr179), and it checks out.
  // hull.js applies W * cPlane * tau(u) * wet as the lift-induced drag and W * liftMax *
  // tau'(u) * wet as the dynamic lift, so the model's own implied induced-drag angle is
  // cPlane / liftMax = 0.05 / 0.65 = 0.0769 = tan(4.40 deg) - against a measured running
  // trim of 3.70 deg flat out on flat water and 4.19-5.52 deg across four sea states.
  // That is Savitsky's D_i = L tan(trim) at this hull's own trim, to within a fifth of a
  // degree, and it is why the `* wet` in hull.js is right: the lift it is the price of is
  // itself proportional to wet. Do not "correct" either half without the other.
  uHump: 6.0, uPlane: 10.0, cHump: 0.12, cPlane: 0.05,
  // <<< DRAG
  kFric: 5.0, kVisc: 250, kAero: 0.9, kAeroSide: 2.4, liftMax: 0.65,
  // Bow rise at the hole shot 7 -> 9 deg (x1.35 trimmed out, x0.65 trimmed in:
  // "trim down for the hole shot"); trim lever +/-4 deg of running trim.
  tauHump: 9 * DEG, trimHump: 0.35, tauPlane: 3.5 * DEG, tauSquat: 1.5 * DEG, tauTrim: 4 * DEG,
  // Running-trim drag: minimum at tauOpt (Savitsky, ~4-6 deg for a deep-V),
  // +12% planing drag per (deviation / tauOpt)^2.
  tauOpt: 5.5 * DEG, trimDrag: 0.12,
  // Porpoising (Day & Haag 1952 stability limit, falling with speed): past
  // ~8.5 deg at 10 m/s, ~6.8 deg at top speed -> full trim-out at WOT porpoises
  // at ~1.6 Hz, a few degrees; trim +0.5 does not.
  porpTau0: 8.5 * DEG, porpSlope: 0.155 * DEG, porpAmp: 2.5 * DEG, porpGain: 14, porpKick: 0.03, porpHz: 1.6,
  // Ventilation: trimmed out past 0.55, hard banked turns, or the leg in the air;
  // loses up to 35% of thrust and flares the rpm.
  ventTrim: 0.5, ventRoll: 2.5, ventLoss: 0.35,
  bank: 0.30, bankMax: 16 * DEG,
  // Turning: the RIB TRACKS - steering asks no more than the keel grips
  // (aSteer 7 < aGrip 9 * wet; yawStab straightens a slide), so it carves at 0.7 g and leans in.
  // An outboard leg still steers with no thrust (steerIdle 0.55).
  rMin: 9, aLatMax: 7.0, aSteer: 7.0, aGrip: 9, yawStab: 0.25, steerSpool: 3, tauYaw: 0.4, steerIdle: 0.55, pivotRate: 0.25,
  turnDrag: 0.2, skidDrag: 0.12,
  latLin: 3.0, latQuad: 0.67,   // latQuad: 1/2 rho Cd A_lat / m, A_lat 5.8 x 0.3 m, Cd 1
  kGround: 60000, cGround: 9000, muGround: 0.55,
  // Hull spring points (design frame: transom x -2.6, bow tip +3.2) and the
  // collision outline (tubes included: they are the widest, longest thing).
  springPts: [[2.3, 0], [1.2, 0.75], [1.2, -0.75], [0, 0.95], [0, -0.95],
    [-1.3, 1.0], [-1.3, -1.0], [-2.4, 0.95], [-2.4, -0.95]],
  outline: [[3.3, 0], [2.9, 0.62], [2.1, 1.05], [0, 1.22], [-3.0, 1.2], [-3.3, 0.25],
    [-3.3, -0.25], [-3.0, -1.2], [0, -1.22], [2.1, -1.05], [2.9, -0.62]],
  // Camera and figure anchors (design frame).
  cam: { dist: 8.5, distSpeed: 3.0, height: 2.9, lookAhead: 2.0, lookH: 1.0, side: 13, fpv: [-0.35, 1.72] },
  wake: { stern: -2.7, halfBeam: 1.0, sprayX: 1.2 },
};

export function speedboatParts(cgX) {
  const parts = [];
  const add = (mesh, color, rough) => parts.push({ mesh, color, rough });

  // Deep-V hull, keel to sheer, closed at the transom.
  const hull = new MeshBuilder();
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  loft(hull, [-2.6, -1.8, -0.8, 0.2, 1.2, 2.0, 2.6, 3.0, 3.22], (x) => {
    const bow = sm(0.8, 3.25, x);
    const bc = 0.92 * Math.sqrt(Math.max(0.001, 1 - bow * bow));
    const yk = -0.33 + 0.40 * Math.pow(bow, 1.6);
    const yc = -0.10 + 0.22 * bow;
    return [[0, yk], [bc * 0.55, (yk + yc) / 2 - 0.01], [bc, yc], [bc + 0.06, 0.02 + 0.2 * bow], [bc + 0.02, 0.2 + 0.1 * bow]];
  });
  add(hull, [0.70, 0.72, 0.74], 0.30);

  // Deck, inside the tubes.
  const deck = new MeshBuilder();
  const b = deck.vertexCount;
  for (const p of [[-2.58, -0.78], [2.3, -0.62], [2.3, 0.62], [-2.58, 0.78]]) deck.push(p[0], 0.22, p[1], 0, 1, 0);
  deck.quad(b, b + 1, b + 2, b + 3);
  box(deck, 2.3, 0.14, -0.62, 2.95, 0.3, 0.62);          // anchor locker / bow step
  add(deck, [0.26, 0.27, 0.27], 0.9);

  // Tubes: a U of hypalon round the bow, open at the stern with cones.
  const tubes = new MeshBuilder();
  const path = [[-3.05, 0.97, 0.32, 0.2], [-1.6, 0.99, 0.33, 0.25], [0, 1.0, 0.34, 0.25], [1.2, 0.95, 0.36, 0.245],
    [2.1, 0.78, 0.40, 0.235], [2.7, 0.52, 0.44, 0.225], [3.05, 0.24, 0.47, 0.215], [3.15, 0, 0.48, 0.21]];
  for (const s of [1, -1]) {
    for (let i = 0; i + 1 < path.length; i++) {
      const [ax, az, ay, ar] = path[i], [bx, bz, by, br] = path[i + 1];
      tubes.tube(ax, ay, s * az, bx, by, s * bz, ar, br, 12, i === 0, false);
      tubes.ellipsoid(bx, by, s * bz, br, br, br, 10, 6);
    }
  }
  add(tubes, [0.055, 0.06, 0.068], 0.55);

  // Console, windscreen, jockey seat, wheel.
  const con = new MeshBuilder();
  box(con, 0.1, 0.22, -0.36, 0.78, 1.12, 0.36);
  box(con, -0.9, 0.22, -0.2, -0.25, 0.78, 0.2);           // seat base
  add(con, [0.72, 0.73, 0.74], 0.35);
  const glass = new MeshBuilder();
  const g = glass.vertexCount;
  for (const p of [[0.78, 1.1, -0.38], [0.56, 1.46, -0.40], [0.56, 1.46, 0.40], [0.78, 1.1, 0.38]]) glass.push(p[0], p[1], p[2], 0.85, 0.53, 0);
  glass.quad(g, g + 1, g + 2, g + 3);
  add(glass, [0.03, 0.045, 0.05], 0.08);
  const dark = new MeshBuilder();
  box(dark, -0.95, 0.78, -0.24, -0.2, 0.9, 0.24);          // cushion
  dark.tube(0.14, 1.12, 0, 0.1, 1.18, 0, 0.17, 0.17, 14);  // wheel (a disc at chase range)
  add(dark, [0.03, 0.03, 0.034], 0.8);

  // Outboard: cowl, leg, cavitation plate, on a transom bracket.
  const ob = new MeshBuilder();
  box(ob, -3.28, 0.38, -0.23, -2.72, 1.05, 0.23);
  box(ob, -3.12, -0.52, -0.08, -2.86, 0.4, 0.08);
  box(ob, -3.2, -0.42, -0.17, -2.78, -0.38, 0.17);
  add(ob, [0.02, 0.02, 0.022], 0.25);

  // Driver on the jockey seat, hands on the wheel.
  const fig = seatedFigure({ hip: [-0.55, 0.98, 0], lean: 10 * DEG, hand: [0.06, 1.2, 0.15], foot: [-0.12, 0.22, 0.17], kneeOut: 0.15 });
  for (const f of fig) parts.push({ mesh: f.mesh, mat: f.mat });

  // Into the CG frame.
  for (const p of parts) for (let i = 0; i < p.mesh.v.length; i += 3) p.mesh.v[i] -= cgX;
  return parts;
}
