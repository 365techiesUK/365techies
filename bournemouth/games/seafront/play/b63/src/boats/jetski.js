// JETSKI: a 3.4 m sit-down personal watercraft, 230 hp class (tmp-tr41).
//
// PHYSICS PARAMETERS AND WHERE THEY COME FROM. Class-typical figures for a
// 3.3-3.5 m three-seat performance PWC (Sea-Doo RXP-X / GTX, Yamaha GP, Kawasaki
// Ultra class), one rider aboard; none is a single model's brochure.
//   mass 440 kg          ~350 kg curb (dry ~300 + fuel) + an 85-90 kg rider
//   power 172 kW         230 hp; jet-pump overall efficiency ~0.45 at speed
//   tStatic 4400 N       static jet thrust, low end of the class (~4.5-6 kN)
//   waterplane 2.65 m^2  0.65 x 3.4 x 1.2 -> 26.7 kN/m, static draft 0.16 m
//   uHump 4.5 / uPlane 8 m/s: a PWC is on the plane by ~15-18 mph
//   kFric fitted so full throttle tops out at ~27 m/s = 60 mph (class: 55-67 mph,
//                        the upper end being governed 300 hp machines)
//   => 0-30 mph in ~2 s, 0-60 mph ~7 s here; brochure 0-60 for 300 hp is ~3.5 s,
//      this is a 230 hp machine with a heavier rider, deliberately not the max
//   rMin 4 m, aLatMax 10.5 m/s^2 (~1.07 g): PWCs carve far tighter than a RIB
//   bank 0.6 of the lateral g, capped 32 deg: the rider leans the hull in
//   steerIdle 0.3: a jet steers by its nozzle, so steering fades off throttle
//     (the real "off-throttle steering" problem); pivotRate lets it spin at idle
//   Light and stiff: at speed across chop the spring-points leave the water on
//   crests, which is the hop - it is not scripted.

import { MeshBuilder } from '../gl/meshes.js';
import { box, loft, seatedFigure } from '../gl/boat-meshes.js';

const DEG = Math.PI / 180;

export const JETSKI = {
  name: 'jetski', label: 'JETSKI', unit: 'mph', unitScale: 2.236936,
  // ---- HANDLING PARAMETERS (tmp-tr50 realism pass; sources in tmp-tr50/RESULT.md) ----
  // Targets: Sea-Doo GTR 230 (Rotax 1630 ACE supercharged triple, 169 kW @ 8000
  // rpm): 0-30 mph under 2 s (Boating Mag test), top speed governed ~65 mph
  // (67 light rider); Sea-Doo iBR figures (Boating Mag): 50 -> 5 mph coasting
  // ~250 ft / 7.5 s, with the iBR brake 143 ft / 4.8 s.
  mass: 440, length: 3.4, beam: 1.2,
  etaP: 0.45 * 172000, tStatic: 4400, tauEngine: 0.18, reverseFrac: 0.6,
  // Engine: low-inertia impeller on a supercharged triple - fast spool. rpm 0 =
  // idle ~1700, 1 = 8000. A jet pump at stall still turns ~80% rpm (holeRpm).
  spoolUp: 0.28, spoolDown: 0.12, rpmUp: 0.2, rpmDown: 0.3, holeRpm: 0.8, uRated: 29,
  // >>> TWOSTROKE
  // ⚠️ THE SOUND AND THE PERFORMANCE MODEL DIFFERENT ENGINES, AND THAT IS DELIBERATE.
  //
  // Every handling number above is calibrated against a real machine with published tests -
  // the Sea-Doo GTR 230, which is a four-stroke supercharged triple. Those numbers are good
  // and they stay.
  //
  // The AUDIO is a two-stroke (20 Sep 2026, owner's ask). boats/engine-audio-layers.js builds
  // the firing order at rpm/60 x cylinders - an octave above a four-stroke - and does not
  // build the half-order component at all. It is the sound people associate with a jet ski.
  //
  // `supercharged` is therefore FALSE: a two-stroke of this kind is not supercharged, the
  // audio no longer models an impeller whine, and nothing else reads this flag. It said
  // `true` for one pass after the audio changed, which is exactly the class of stale claim
  // that hid several defects on this project - a field asserting something the code had
  // stopped doing.
  //
  // If this split ever bothers someone: do NOT "fix" it by flipping one to match the other.
  // Making the performance two-stroke means re-calibrating against a different real machine
  // and losing the Boating Mag figures; making the audio four-stroke means undoing what was
  // asked for. It is a choice, not an oversight. ⚠️ Note rpmMax 8000 is high for a real
  // two-stroke triple - that is the four-stroke target showing through, and it is audible.
  rpmIdle: 1700, rpmMax: 8000, cylinders: 3, supercharged: false,
  // <<< TWOSTROKE
  // Reverse bucket (iBR class): drops at any speed in 0.35 s through neutral;
  // reverse rpm capped (revCap) so astern speed stays a few mph.
  shiftTime: 0.35, shiftU: 99, revCap: 0.5, revIdle: 0.3, asternDrag: 2.2,
  // Rider weight moves fast.
  trimTau: 0.25,
  waterplane: 2.65, heaveZeta: 0.4, addedMass: 0.15, addedMassX: 0.05,
  freeboard: 0.4, slamV: 5.0, draft: 0.24, restLift: 0,
  // >>> DRAG
  // slamScrub 0.25: the jetski half of the note in speedboat.js. The derivation stated
  // there is sin(running trim + wave slope); measured on this hull, impulse-weighted, that
  // angle is 2.96-5.01 deg across seven sea states, sine 0.052-0.087 - so 0.25 is likewise
  // a fitted seaway-resistance coefficient, 3-5x its label, carrying 9-25% of total hull
  // drag in a seaway. Left alone for the same reason: nothing here can calibrate it, and
  // it is identically zero on the flat water that can.
  entryDepth: 0.2, slamCs: 1.4, slamVmax: 7, slamScrub: 0.25, slamEventG: 2.0,
  // <<< DRAG
  pitchDamp: 1.2, pitchDampAir: 0.2, rollDamp: 6, rollDampLin: 1.5,
  // >>> DRAG
  // cPlane 0.06: this craft's implied induced-drag angle is cPlane / liftMax = 0.06 / 0.6
  // = 0.10 = tan(5.71 deg), against a measured running trim of 2.70 deg on flat water and
  // 2.09-3.21 deg in a seaway - about twice the Savitsky value, where the speedboat's
  // equivalent lands within a fifth of a degree (tmp-tr179). Either cPlane is high or
  // liftMax 0.6 understates how much of a planing PWC's support is dynamic; the two are
  // not separable from anything measured here, and cPlane and kFric were co-fitted to the
  // flat-water top speed, which is held. Flagged, not touched.
  uHump: 4.5, uPlane: 8.0, cHump: 0.17, cPlane: 0.06,
  // <<< DRAG
  // kFric 3.3 -> 2.8: ~63 mph flat out with a 90 kg rider (governed 65-67 light).
  kFric: 2.8, kVisc: 70, kAero: 0.35, kAeroSide: 0.9, liftMax: 0.6,
  // Jet thrust sits below the CG and the intake sucks the stern down: most of
  // the running trim is thrust-borne (tauSquat 3.5 deg x T/W), so chopping the
  // throttle drops the nose (~2.5 deg) and the hull stuffs and scrubs speed.
  tauHump: 4 * DEG, trimHump: 0.25, tauPlane: 0.5 * DEG, tauSquat: 3.5 * DEG, tauTrim: 3 * DEG,
  tauOpt: 4 * DEG, trimDrag: 0.3,
  // Rider far back at speed -> porpoising (bow hop), weaker than the RIB's.
  porpTau0: 7.5 * DEG, porpSlope: 0.1 * DEG, porpAmp: 2.5 * DEG, porpGain: 12, porpKick: 0.03, porpHz: 2.2,
  // A carving jet can suck air through the intake when the hull lifts on its side.
  ventTrim: 0, ventRoll: 1.2, ventLoss: 0.7,
  bank: 0.6, bankMax: 32 * DEG,
  // Turning: TWITCHY and can SLIDE - steering asks for 12.5 m/s^2 but the short
  // keel grips ~10.5 (aGrip * wet, less bow-high), so a hard turn at speed skids.
  // NO THROTTLE, NO STEERING (NTSB 1998 PWC study, USCG Aux PWC seminar): nozzle
  // authority follows pump power (steerSpool), 8% left from hull and OTS fins.
  rMin: 4, aLatMax: 10.5, aSteer: 12, aGrip: 10.5, yawStab: 0.2, steerSpool: 1.6, tauYaw: 0.18, steerIdle: 0.08, pivotRate: 0.9,
  turnDrag: 0.16, skidDrag: 0.18,
  latLin: 4.0, latQuad: 0.99,   // latQuad: 1/2 rho Cd A_lat / m, A_lat 3.4 x 0.25 m, Cd 1
  kGround: 25000, cGround: 3000, muGround: 0.6,
  springPts: [[1.35, 0], [0.7, 0.45], [0.7, -0.45], [-0.3, 0.6], [-0.3, -0.6],
    [-1.3, 0.62], [-1.3, -0.62]],
  outline: [[1.85, 0], [1.2, 0.36], [0.2, 0.6], [-1.65, 0.6], [-1.65, -0.6], [0.2, -0.6], [1.2, -0.36]],
  cam: { dist: 4.6, distSpeed: 1.6, height: 1.9, lookAhead: 1.2, lookH: 0.9, side: 8, fpv: [-0.2, 1.45] },
  wake: { stern: -1.7, halfBeam: 0.5, sprayX: 0.4 },
};

export function jetskiParts(cgX) {
  const parts = [];
  const add = (mesh, color, rough) => parts.push({ mesh, color, rough });
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const stations = [-1.62, -1.2, -0.6, 0, 0.6, 1.1, 1.45, 1.7, 1.86];
  const half = (x) => 0.6 * Math.sqrt(Math.max(0.002, 1 - sm(0.1, 1.9, x) ** 2));

  // Lower hull: V bottom, white.
  const hull = new MeshBuilder();
  loft(hull, stations, (x) => {
    const bow = sm(0.3, 1.9, x), bc = half(x);
    const yk = -0.22 + 0.34 * Math.pow(bow, 1.5);
    return [[0, yk], [bc * 0.6, yk + 0.1], [bc, -0.02 + 0.12 * bow], [bc + 0.03, 0.2 + 0.08 * bow]];
  });
  add(hull, [0.72, 0.73, 0.75], 0.3);

  // Upper deck: gunwale -> footwell -> body -> spine, colour.
  const top = new MeshBuilder();
  loft(top, stations, (x) => {
    const bow = sm(0.3, 1.9, x), bc = half(x) + 0.03, g = 0.2 + 0.08 * bow;
    const spine = x > 0.2 ? 0.52 + 0.18 * Math.sin(Math.min(1, (x - 0.2) / 0.5) * Math.PI / 2) - 0.45 * sm(0.9, 1.9, x)
      : 0.46;
    const well = x < 0.35 && x > -1.45;
    const body = Math.min(bc * 0.55, 0.3);
    return well
      ? [[0, spine], [body * 0.7, spine - 0.02], [body, spine - 0.14], [body + 0.02, 0.3], [bc - 0.03, 0.3], [bc, g]]
      : [[0, spine], [body * 0.8, spine - 0.03], [bc * 0.6, spine - 0.1], [bc * 0.8, (spine + g) / 2 + 0.04],
        [bc * 0.95, g + 0.08], [bc, g]];   // same point count as a footwell station
  }, true);
  add(top, [0.52, 0.045, 0.035], 0.25);

  // Seat, handlebar pod, bars, sponson/nozzle.
  const dark = new MeshBuilder();
  dark.ellipsoid(-0.62, 0.53, 0, 0.72, 0.13, 0.2, 14, 8);
  dark.tube(0.42, 0.55, 0, 0.3, 0.86, 0, 0.07, 0.05, 8);
  dark.tube(0.28, 0.9, -0.36, 0.28, 0.9, 0.36, 0.022, 0.022, 8);
  box(dark, -1.75, -0.12, -0.1, -1.55, 0.02, 0.1);
  add(dark, [0.025, 0.025, 0.03], 0.55);
  const hood = new MeshBuilder();
  hood.ellipsoid(0.72, 0.62, 0, 0.42, 0.12, 0.3, 12, 7);
  add(hood, [0.62, 0.64, 0.66], 0.2);

  const fig = seatedFigure({ hip: [-0.5, 0.74, 0], lean: 32 * DEG, hand: [0.27, 0.92, 0.31], foot: [-0.12, 0.3, 0.4], kneeOut: 0.5 });
  for (const f of fig) parts.push({ mesh: f.mesh, mat: f.mat });

  for (const p of parts) for (let i = 0; i < p.mesh.v.length; i += 3) p.mesh.v[i] -= cgX;
  return parts;
}
