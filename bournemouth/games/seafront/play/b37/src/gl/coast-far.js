// THE FAR SIDE OF POOLE BAY - a bearing-keyed silhouette band (tr132).
//
// WHAT THIS IS, IN PIXELS. Everything drawn here is 370 pixels of an 884 x 405
// frame - 0.8% of it - at the judged camera (fovY 52, pixel scale 7.246 px/deg,
// rider eye 2.0 m at the spawn, coast 230/300). It is a SILHOUETTE BAND, not
// landform geometry: 152 x 6.5 px of Purbeck, 36 x 1.8 px of Sandbanks,
// 38 x 1.9 px of Hengistbury Head, and one 3.8 x 0.9 px nub called Old Harry.
// Measurements: tmp-tr123/RESULT.md sections 1-4, which computed them from
// reference/coast.md's own sourced bearings and from the owner's photographs.
//
// WHAT IS DELIBERATELY ABSENT, AND WHY IT MUST STAY ABSENT
//   * THE ISLE OF WIGHT. Geometrically 32 x 2.3 px at 24 km, and at this
//     project's 4200 m extinction length it renders at 0.33% residual contrast
//     - below Koschmieder's 2% liminal threshold, i.e. ABSENT (tmp-tr122
//     section 18.2). That is why it appears in 0 of the owner's 944 sea-level
//     frames and in only 2 of 2,434 files overall, both shot from the
//     Southbourne Overcliff at ~30 m. Drawing it would put on screen a view the
//     owner's own photographs prove he cannot see from the water.
//   * THE NEEDLES (0.35 x 0.20 px, and 15.4 m of a 33 m tower is under the
//     curve), CULVER DOWN and ST CATHERINE'S POINT (166 m and 96 m hidden),
//     CHRISTCHURCH LEDGE (submerged), the POOLE HARBOUR MOUTH as a feature
//     (it is water 0.07 m below the horizon - a notch, not a thing),
//     STUDLAND / KNOLL BEACH (0.1 px) and MUDEFORD SANDSPIT (0.04 px).
//   * BROWNSEA ISLAND and the north half of the Sandbanks peninsula. Not
//     curvature - OCCLUSION. Canford Cliffs stands at 3.3 km and 0.522 deg of
//     elevation, twice the angle of anything behind it, so everything north of
//     bearing 241.0 deg is behind it. Only the outer ~2 km of Sandbanks is in
//     clear view (tmp-tr123 section 3).
//   * NO LETTERING ANYWHERE. The Haven Hotel is 4.6 x 1.2 px here - a bump in
//     the Sandbanks silhouette, not a building. Its real name is painted across
//     its parapet in capitals; the standing no-branding rule (eight ROCKREEF
//     blocks) applies, and at 1.2 px there is nothing to letter anyway.
//
// HOW THE ATMOSPHERE IS HANDLED: IT IS NOT. Every point below sits at its TRUE
// distance (5.9 - 13.0 km), so craft.js COAST_FRAG's own Beer-Lambert term,
// haze = 1 - exp(-dist / 4200), produces the prescribed residual contrast by
// construction: 12.6% at the Purbeck's 8.7 km, a faint ridge and not a resolved
// landform. NOTHING here pre-blends toward the airlight, scales a contrast or
// touches the extinction length. A trade curve completed 2026-09-18 (tmp-tr122)
// concluded 4200 m must not change, and this band is built to look right under
// it. Note that the shader's clamp(haze, 0, 0.94) binds beyond 11,815 m, so
// Godlingston Hill (12.42 km) and Nine Barrow Down (12.95 km) render at 6.0%
// rather than their true 5.2% and 4.6%. That is the existing atmosphere's
// floor, not a choice made here.
//
// CURVATURE IS BAKED INTO THE HEIGHTS, NOT INTO THE WORLD. The world is flat;
// the earth is not. Every height below is the VISIBLE height at a 2.0 m eye
// with R_eff = 7,433,000 m (k = 0.13), i.e. real height minus h_hidden. The
// geometric horizon at that eye is 5.45 km and EVERYTHING here is beyond it.
// The hidden amounts are 0.05 m (Sandbanks) to 3.78 m (Nine Barrow) - at most
// 0.13 px - but they are applied because they are known. The base sits at
// y = -200 m, which the sea disc (renderer.js RMAX 1700) cuts at exactly the
// apparent horizon for any eye below 30 m, so no band ever shows a waterline.
//
// COST: see the return value. It is a silhouette band and it is cheap.
//
// >>> READ THIS BEFORE WONDERING WHY YOU CANNOT SEE IT <<<
// renderer.js sets the far clip plane to 4,000 m. Measured (tmp-tr132/pr):
// test slabs at 1,000 / 2,000 / 3,000 / 3,500 / 3,900 m render; slabs at
// 4,200 / 5,000 / 8,670 / 12,420 m are ABSENT. So under the stock projection
// this whole band is clipped away and costs pixels nowhere.
// It is still built at true distance, because the alternative - a scaled proxy
// inside 4,000 m - was measured and is not a backdrop: it swings across the
// frame at 0.15 px per metre ridden (3.8 px wrong after 25 m, 15 px after
// 100 m, and the whole 152 px band's width wrong after ~250 m). See
// tmp-tr132/RESULT.md for both measurements and for the one-line far-plane
// change that makes this band appear exactly as specified.

// ?cdbg=nofar - ABLATION SWITCH. Removes the entire band. Guarded on location
// so node tooling (gate-check, mesh-check, module-check, census) can import
// this file, where it reads as absent and the band IS built - the census and
// the mesh checks are meant to see it.
const NOFAR = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined')
  && (new URLSearchParams(location.search).get('cdbg') || '').split(',').includes('nofar');

// Coast frame (build sheet M-BM-A): +X along-shore at true bearing 079.0 deg,
// +Z seaward at true bearing 169.0 deg, origin at Bournemouth Pier root. A unit
// vector at true bearing b is therefore (cos(b-79), sin(b-79)) in (X, Z).
const RB = 230, ZB = 300;                       // the rider spawn, coast frame
const D2R = Math.PI / 180;
const at = (brg, km) => {
  const a = (brg - 79.0) * D2R, d = km * 1000;
  return [RB + Math.cos(a) * d, ZB + Math.sin(a) * d];
};

// sRGB -> linear, matching coast.js hex() exactly so these sit in the same
// space as every other colour in the mesh.
const hex = (h) => {
  const n = parseInt(h.slice(1), 16), f = (c) => Math.pow(c / 255, 2.2);
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
};

// TWO ALBEDOS, AND ONLY ONE OF THEM IS SOURCED.
//   GREEN is coast.js's own C.cliffScrub (#556B36), the olive the project
//   solved against the owner's cliff frames for scrub and downland. Purbeck
//   turf and Hengistbury heath are the same kind of surface.
//   CHALK is NOT sourced. tmp-tr124 section 2.8 is explicit that the reference
//   library cannot support an Old Harry tone: one owner photograph in which the
//   stacks are ~3 px, plus two videos of unverified provenance. #C8C6BE is a
//   plausible weathered-chalk value and nothing more; it is labelled as an
//   assumption in tmp-tr132/RESULT.md. It matters less than it looks - at 12.6%
//   residual contrast the albedo contributes about an eighth of the pixel, and
//   the reason chalk is here at all is the SIGN: Old Harry is PALER than the
//   downland behind it, which is the only reason a 3.8 px nub is findable.
const GREEN = hex('#556B36');
const CHALK = hex('#C8C6BE');
const BASE_Y = -200;                            // below every horizon; see above

// ---------------------------------------------------------------------------
// THE BAND. brg = true bearing from the spawn, km = slant distance, h = VISIBLE
// height in metres at a 2.0 m eye, col = albedo. Bearings, distances and real
// heights are reference/coast.md section C.2 as re-derived in tmp-tr123 section
// 1 ("SHEET"); the hidden amounts are that report's curvature table. Where a
// point is marked INTERP it is a linear fill between two sourced neighbours and
// carries no independent authority.
// ---------------------------------------------------------------------------

// 1. THE PURBECK MASS - the dominant element, 152 x 6.5 px, bearings 204.6 to
// 225.5. Points are in PLAN order along the real ridge, which is why the
// bearings are not monotonic: Handfast Point through Ballard Point is the chalk
// cliff line seen nearly end-on, so four points share ~1.4 deg of bearing and
// the skyline steps almost vertically there. That step is the shape the owner's
// own frame f01 measures (Handfast 23 px, the ridge behind it 54 px, in a 5x
// telephoto). The curtains are opaque and the visible skyline is their union,
// so end-on segments resolve correctly without any sorting.
const PURBECK = [
  { x: -4812, z: 7355, h: 19.3, col: CHALK },   // Old Harry / Foreland tip  204.6 deg  8.67 km
  { x: -5215, z: 7468, h: 22.2, col: CHALK },   // Handfast Point cliff top  206.2      9.00
  { x: -5416, z: 7771, h: 50.0, col: CHALK },   // chalk cliff, mid          206.1      9.36
  { x: -5694, z: 8059, h: 67.8, col: GREEN },   // chalk cliff, upper        206.4      9.76
  { x: -5715, z: 8477, h: 96.5, col: GREEN },   // Ballard Point             205.0     10.11
  { x: -6400, z: 8335, h: 108.3, col: GREEN },  // ridge                     208.5     10.42
  { x: -7055, z: 8106, h: 130.2, col: GREEN },  // Studland Hill             212.0     10.68
  { x: -7893, z: 8041, h: 159.8, col: GREEN },  // Ballard Down summit       215.4     11.22
  { x: -8872, z: 7384, h: 117.5, col: GREEN },  // Dean Hill                 221.1     11.53
  { x: -9678, z: 7784, h: 195.7, col: GREEN },  // Godlingston Hill          221.9     12.42
  { x: -10569, z: 7438, h: 195.2, col: GREEN }, // Nine Barrow Down          225.5     12.95
];

// 2. SANDBANKS, OUTER ~2 km ONLY. Ends HARD at bearing 241.0: north of that
// Canford Cliffs (3.3 km, 0.522 deg) stands in front of it, and so Brownsea
// Island and the north half of the peninsula are not drawn at all.
// THE TIP IS ANCHORED ON THE SHEET, NOT ON THE GAZETTEER. tmp-tr123 carries two
// positions for the same place - "Poole Harbour entrance, E side" at 236.8 deg
// / 6.12 km (sheet) and "Sandbanks tip / Haven Hotel" at 238.1 / 6.33
// (gazetteer recall) - and that 1.3 deg IS the report's own stated gazetteer
// error bar. Its verdict was "the sheet won, my recall lost", so the sheet
// bearing is used and the Haven bump sits on it.
// NOTHING IS DRAWN SEAWARD OF 236.8 deg. That bearing is the sheet's Poole
// Harbour entrance, E side - the tip of the peninsula, where the land stops.
// West of it is the harbour mouth, which is WATER 0.07 m below the horizon and
// is on the never-build list, and beyond that South Haven Point (0.3 px) and
// Studland / Knoll Beach (0.1 px), which are too. The first build of this
// module started the profile at 236.1 deg to reach tmp-tr123's quoted 36 px
// width, and that 0.7 deg of land sat across the harbour mouth. It is gone.
// The band is 4.2 deg = 30 px wide, and the 36 px figure is the gazetteer span,
// not the sheet's.
const SANDBANKS = [
  { brg: 236.8, km: 6.12, h: 2.0, col: GREEN },   // the tip, at the waterline SHEET
  { brg: 237.4, km: 6.10, h: 8.0, col: GREEN },   // spit, low                 INTERP
  { brg: 238.1, km: 6.05, h: 12.0, col: GREEN },  // spit body, dunes + pines  INTERP
  { brg: 240.1, km: 5.93, h: 25.0, col: GREEN },  // the tall blocks           25 m est
  { brg: 241.0, km: 5.88, h: 20.0, col: GREEN },  // HARD CUT - Canford occludes beyond
];

// 3. HENGISTBURY HEAD - 38 x 1.9 px to the east, the "which way am I facing"
// cue. Dark, foreshortened, compact. The south cape is the tail of this mass,
// not a feature of its own (on its own it is 0.4 px and would never be built).
const HENGISTBURY = [
  { brg: 86.6, km: 7.23, h: 14.8, col: GREEN },   // west end                  SHEET
  { brg: 88.3, km: 7.88, h: 35.6, col: GREEN },   // Warren Hill, the summit   SHEET
  { brg: 90.0, km: 8.30, h: 22.0, col: GREEN },   // east flank falling        INTERP
  { brg: 91.8, km: 8.72, h: 9.3, col: GREEN },    // south cape                SHEET
  { brg: 92.3, km: 8.80, h: 2.0, col: GREEN },    // into the sea              INTERP
];

// 4. OLD HARRY ROCKS - 3.8 x 0.94 px at bearing 203.8, 8.57 km, sitting just
// seaward of the Purbeck silhouette's left end.
// THE WIDTH IS THE OWNER'S OWN PHOTOGRAPH, NOT THE SHEET. tmp-tr123 section 6
// measured the detached stack group in f01 (Branksome beach, overcast, 2 m eye,
// 7.18 km) at 0.63 deg x 0.158 deg and said so explicitly: "it refines the
// sheet: 0.63 deg at 7.18 km makes the detached group ~79 m across, not the
// ~120 m I had assumed". 79 m at 8.57 km is 3.8 px, against the 5.8 px the
// brief carries from the unrefined figure. The smaller, photograph-measured
// number is used: it is the better evidence and it errs toward drawing less.
// Three stacks because f01 shows "2-3 white nubs at the waterline" - at 3.8 px
// total that is about 1 px each, which is all a stack group can ever be here.
const OLD_HARRY = { brg: 203.8, km: 8.57, span: 79, h: 19.3, stacks: 3 };

// smoothstep, not Catmull-Rom: a spline overshoots, and an overshoot on a
// skyline is an invented summit standing above a sourced one.
const ss = (t) => t * t * (3 - 2 * t);

export function buildFarBand(m, OX, OZ, MAT) {
  if (NOFAR) return { tris: 0, ablated: true };
  const i0 = m.i.length;
  const SUB = 6;                                 // sub-steps per sourced segment

  // One curtain segment: A -> B in the coast frame, opaque from BASE_Y to h.
  // The outward normal is the horizontal one pointing back toward the spawn -
  // the player is never more than ~2.3 km from it and the band is 5.9-13.0 km
  // away, so that side is the visible side everywhere in the world.
  const seg = (ax, az, ah, ac, bx, bz, bh, bc) => {
    const dx0 = bx - ax, dz0 = bz - az;
    const L = Math.hypot(dx0, dz0);
    if (!(L > 1e-3)) return;
    let nx = -dz0 / L, nz = dx0 / L;
    if (nx * (RB - ax) + nz * (ZB - az) < 0) { nx = -nx; nz = -nz; }
    // CCW as seen from the normal side: right = up x N = (nz, 0, -nx).
    let Ax = ax, Az = az, Ah = ah, Ac = ac, Bx = bx, Bz = bz, Bh = bh, Bc = bc;
    if (dx0 * nz - dz0 * nx < 0) {
      Ax = bx; Az = bz; Ah = bh; Ac = bc; Bx = ax; Bz = az; Bh = ah; Bc = ac;
    }
    const V = (x, y, z, c) => m.pushC(x + OX, y, z + OZ, nx, 0, nz, c, MAT.PAINTED);
    m.quad(V(Ax, BASE_Y, Az, Ac), V(Bx, BASE_Y, Bz, Bc), V(Bx, Bh, Bz, Bc), V(Ax, Ah, Az, Ac));
  };

  // A profile -> a subdivided curtain. Position is linear along the plan line;
  // height uses smoothstep so a downland ridge reads as a ridge and not as a
  // ten-vertex polyline, without ever rising above a sourced summit.
  const curtain = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      for (let s = 0; s < SUB; s++) {
        const P = (t) => [p.x + (q.x - p.x) * t, p.z + (q.z - p.z) * t,
          p.h + (q.h - p.h) * ss(t), t < 0.5 ? p.col : q.col];
        const a = P(s / SUB), b = P((s + 1) / SUB);
        seg(a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3]);
      }
    }
  };

  const toXZ = (pts) => pts.map((p) => {
    const c = at(p.brg, p.km); return { x: c[0], z: c[1], h: p.h, col: p.col };
  });

  curtain(PURBECK);
  curtain(toXZ(SANDBANKS));
  curtain(toXZ(HENGISTBURY));

  // THE HAVEN HOTEL: 4.6 x 1.2 px, which is 70 m wide and 18.3 m tall at
  // 6.1 km. Centred on 237.4 deg, not on the 236.8 deg tip: the hotel stands
  // back from the point, and at the tip half of a 70 m block would hang over
  // the harbour mouth. It is a BUMP on the Sandbanks silhouette. Nothing identifies it,
  // nothing is written on it, and at 1.2 px nothing could be.
  {
    const c = at(237.4, 6.10);
    const a = (237.4 - 79.0) * D2R;
    const tx = -Math.sin(a), tz = Math.cos(a);   // across the line of sight
    const w = 35;                                // half of 70 m
    const lx = c[0] - tx * w, lz = c[1] - tz * w;
    const rx = c[0] + tx * w, rz = c[1] + tz * w;
    seg(lx, lz, 8.0, GREEN, lx, lz, 17.9, GREEN);
    seg(lx, lz, 17.9, GREEN, rx, rz, 17.9, GREEN);
    seg(rx, rz, 17.9, GREEN, rx, rz, 8.0, GREEN);
  }

  // OLD HARRY: three chalk nubs across 79 m, seaward of the Foreland.
  {
    const c = at(OLD_HARRY.brg, OLD_HARRY.km);
    const a = (OLD_HARRY.brg - 79.0) * D2R;
    const tx = -Math.sin(a), tz = Math.cos(a);
    const pitch = OLD_HARRY.span / OLD_HARRY.stacks;
    for (let k = 0; k < OLD_HARRY.stacks; k++) {
      const s0 = -OLD_HARRY.span / 2 + k * pitch + pitch * 0.15;
      const s1 = s0 + pitch * 0.70;
      const h = OLD_HARRY.h * (k === 1 ? 1.0 : 0.82);   // the middle stack is the tall one
      seg(c[0] + tx * s0, c[1] + tz * s0, h, CHALK, c[0] + tx * s1, c[1] + tz * s1, h, CHALK);
    }
  }

  return { tris: (m.i.length - i0) / 3, ablated: false };
}
