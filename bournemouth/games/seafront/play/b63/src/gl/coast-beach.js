// THE BEACH SURFACE (tmp-tr113, 2026-09-18).
//
// SCOPE: the sand itself and how it meets the water. Nothing else. The
// promenade, the sea wall, the cliff, the clifftop, the beach huts, the
// groynes and the sea shader are other people's files and are untouched.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS - the measurement, not an adjective
// ---------------------------------------------------------------------------
// The owner asked for "more realistic". Measured on the tree as it stood, over
// the beach box of the X_owner_neck camera (rows 320-405, cols 250-750 of the
// 884x405 canvas), against the owner's own frames:
//
//   box                       CV (sd/mean)   p90:p10   CV at 16x16 blocks
//   ref-cache/vidframes/0566        0.129      1.396         0.087
//   ref-cache/vidframes/0659        0.127      1.371         0.087
//   ref-cache/vidframes/0636        0.104      1.295         0.068
//   ref-cache/vidframes/0557        0.087      1.232         0.034
//   RENDER, before this file        0.0152     1.041         0.0083
//
// The render's beach carries ONE EIGHTH of the tonal variation of the
// photographs, and - the line that decides the fix - 68% of the photographs'
// variation SURVIVES 16x16 block averaging. It is not grain. It is metres-wide
// damp and dry patches. (⚠️ THIS GAP IS NOT CLOSED BY THIS FILE AND CANNOT BE:
// see THE CEILING below. What this file fixes is the WET/DRY BAND, which is a
// different and separately measured defect.) Grain is the texture's job and craft.js has already
// faded the texture out: `fade = 1 - smoothstep(120, 320, dist)` is zero past
// 320 m, and the sand normal map is additionally gated by
// `smoothstep(0.05, 0.45, graze)`, which a rider's near-horizontal view of the
// beach never clears. At the ranges this scene is judged from, vColor IS the
// albedo. So the lever is per-vertex colour on geometry, exactly as the
// clifftop planting pass concluded for the cliff.
//
// ---------------------------------------------------------------------------
// THE WET SAND IS BRIGHTER THAN THE DRY SAND, NOT DARKER
// ---------------------------------------------------------------------------
// This inverts what the ribbon does and it is the single most useful thing
// measured this pass.
//
// TRAP 5 is obeyed: tone comes only from an OVERCAST frame, and only as a
// SAME-FRAME RATIO against something known in that same frame. The frame is
// ref-cache/vidframes/0566.jpg (sky p50 saturation 13.8, blueness +13.8 - flat
// grey, no shadows anywhere in it), and the same-frame white is the pier head
// building's own white wall, box (121,274)-(132,286):
//
//   white wall                       L p50 104.3
//   damp strip landward of the swash L p50  81.0   = 0.776 of the wall
//   dry sand, mid beach              L p50  75.7   = 0.725 of the wall
//   dry sand, foreground             L p50  69.7   = 0.668 of the wall
//
//   damp : dry (mid)  = 1.070      damp : dry (foreground) = 1.163
//
// Cross-checked on 0659.jpg, the only other flat-overcast frame of the same
// beach: the same vertical profile, brightest at the damp strip (L 80-86),
// falling to 65-68 over the dry beach. Same sign, same size.
//
// AND IT IS GREYER, not just brighter. Same frame, same boxes, RGB p50:
//   damp (89, 80, 73)   G/R 0.899   B/R 0.820
//   dry  (87, 74, 66)   G/R 0.851   B/R 0.759
// so damp/dry per channel is (1.023, 1.081, 1.106) ENCODED. Raised to 2.2 to
// undo the display transfer - the one assumption in this block, the camera's
// own tone curve is unknown - that is (1.05, 1.19, 1.25) in LINEAR albedo.
// That is the multiplier DAMP_MUL below. Nothing here is an absolute RGB read
// off a photograph.
//
// WHY it is brighter, which is the check that it is not a fluke: a film of
// water is a mirror, and every camera that matters here is near-grazing. The
// judged water cameras sit 1.4-4 m above a beach 150-300 m away, i.e. 0.2-1.0
// degrees above the surface, where Fresnel reflectance of water is 0.95-1.0.
// The damp band therefore reads as the SKY, not as sand, and the sky under
// overcast is the brightest thing in the scene. The ribbon ramps sandDry
// (#D7C39B) to sandDamp (#B49A70) across the whole beach depth - a 0.79x
// DARKENING spread over 38 m - which is wrong in sign, wrong in size and
// wrong in distribution. sandDamp is correct where it is also used, on the two
// rows at and below the waterline, where the sand is seen THROUGH water.
//
// ---------------------------------------------------------------------------
// WHAT IS REFUSED, AND WHY
// ---------------------------------------------------------------------------
//  * NO STRAND / WRACK LINE. Eight owner frames of this exact stretch - 0553,
//    0557, 0558, 0562, 0566, 0636, 0659, 0676 - show no weed or debris band at
//    any tide level. Two of them (0557, 0558) show broad sweeping TRACTOR
//    TRACKS across the dry sand: this beach is mechanically groomed, which is
//    precisely why there is no wrack line to draw. Building one would be
//    invented detail, and it is the detail the brief asked me to check for
//    rather than assume.
//  * NO TRACTOR TRACKS EITHER, although they are real and photographed. They
//    are 2 m wide curves hundreds of metres long; at the 6-7 m along-shore
//    vertex pitch this budget buys they would render as a smeared band, not as
//    tracks, and at 200 m a 2 m feature is 10 px. Refused on cost, recorded as
//    the best remaining idea.
//  * NO GROYNE CHANGES. The brief said CHECK, do not assume. Checked: none of
//    the eight near-pier frames above resolves a groyne within roughly 300 m
//    east of the pier, and the owner's Southbourne aerial
//    (southbourne-eastcliff/1573400858124679.jpg) does show them further east.
//    coast.js's westernmost groyne is at x = 300, which is consistent with
//    both. No change, and they are not my file in any case.
//  * NO GEOMETRY HEIGHT CHANGE. See the cross-slope note at the foot of this
//    file: the ribbon's profile IS measurably wrong, and correcting it moves a
//    must-not-move gate box. Measured, reported, left alone.
//  * NO DRY-BEACH MOTTLE, WHICH IS THE THING THE MEASUREMENT AT THE TOP OF
//    THIS FILE ASKED FOR. It was built, rendered and measured, and it cannot
//    be delivered from this file. See THE CEILING immediately below. The
//    sheet now covers only the seaward fifth of the beach, where the change
//    it can make is a BAND TONE rather than a texture.
//
// ---------------------------------------------------------------------------
// THE CEILING: craft.js CRUSHES VERTEX COLOUR ON SAND INSIDE 320 m
// ---------------------------------------------------------------------------
// This is the negative result of the pass and it is worth more than anything
// built here, because it says where the work has to happen next and it is not
// in this file.
//
// craft.js's COAST_FRAG renders SAND with the LEGACY, TEXTURE-DOMINANT branch
// (texDom stays 1 for mat 0):
//
//     albedo = mix(vColor, t.rgb * (0.78 + vColor * 0.55), fade)
//     fade   = 1 - smoothstep(120, 320, dist)
//
// Inside 120 m the vertex colour is not the albedo, it is a small ADDITIVE
// TRIM on a constant 0.78. The sensitivity of the albedo to a relative change
// in vColor is
//
//     s = 0.55 * vColor / (0.78 + 0.55 * vColor)
//
// which for C.sandDry, linear (0.6372, 0.5028, 0.2948), is (0.310, 0.262,
// 0.172) - so a +-26% swing in vertex colour becomes a +-8% swing in albedo
// and, through the render chain's roughly 0.41 encoded-per-linear response,
// +-3% in the rendered pixel.
//
// MEASURED, on a build of this file that DID carry full-beach mottle: sand
// vertex colour p90:p10 = 1.26 produced rendered p90:p10 = 1.032 (X_owner_neck
// rows 265-300) and 1.051 (rows 240-258). The arithmetic above predicts
// 1.26^0.310 = 1.074 in albedo, i.e. 1.074^(1/2.2) = 1.033 encoded. It matches
// the measurement to three decimals, so the mechanism is not in doubt.
//
// The gap it has to close is a factor of eight - rendered CV 0.015 against the
// photographs' 0.087 - and closing it from the vertex side inside 120 m would
// need a vertex-colour swing of about +-87%, which past 320 m (where fade is 0
// and vColor IS the albedo) would render as a 15:1 blotch. There is no setting
// that is right at both ends.
//
// SO THE DRY-BEACH MOTTLE IS A craft.js JOB, NOT A GEOMETRY JOB: either give
// SAND the palette branch the cliff and the concrete already use
// (`vColor * (t.rgb / texMean)`, which is multiplicative and would pass the
// full swing at every range), or raise the sand albedo texture's own contrast,
// whose sd this file's own predecessor measured at 3.7-4.6 of 255. Both are
// outside this file and both move the settled beach tone, so neither is
// something to do in passing. It is written down here so the next pass does
// not spend another day discovering it from the geometry side.
//
// ---------------------------------------------------------------------------
// HOW IT IS BUILT
// ---------------------------------------------------------------------------
// A single-sided sheet of quads laid ON the ribbon's own beach surface and
// lifted a few centimetres, carrying per-vertex colour and nothing else. The
// ribbon's beach is an exactly reproducible ruled surface - the three sand
// rows are [w+14, -0.9], [w, 0.0], [0, 3.0] with w = mhwOffset(x) and no noise
// on them - so the sheet can sit on it analytically.
//
// ⚠️ WINDING. The ribbon is wound m.quad(i3, i2, i1, i0) deliberately: it is a
// single-sided open surface, shadow.js fills the depth map with cullFace(FRONT),
// and the reversed winding is what stops the beach shadowing itself (the
// corduroy fix, coast.js). This sheet is the same kind of surface and MUST use
// the same winding, so the row and column index roles below are the ribbon's,
// unchanged: k = 0 seaward, k increasing landward, j increasing in x.
//
// ⚠️ MAT.SAND IS LOAD-BEARING. src/boats/obstacles.js skips every SAND triangle
// when it rasterises the boat occupancy grid, so this sheet cannot move a
// single grid cell. Any other material here would put 4,000 new triangles into
// the boat physics.

// ---------------------------------------------------------------------------
// ABLATION SWITCHES (the brief's ?xdbg= convention)
//   ?bdbg=off    build nothing - the tree as it was before this file
//   ?bdbg=flat   build the sheet with NO colour modulation, so the geometry
//                and the colour can be blamed separately
//   ?bdbg=mask   paint the sheet magenta, to see exactly which pixels it owns
//   ?bdbg=nodamp build the mottle but not the damp band
//   ?bdbg=nomot  build the damp band but not the mottle
// ---------------------------------------------------------------------------
const BDBG = (typeof location !== 'undefined'
  ? (new URLSearchParams(location.search).get('bdbg') || '') : '').split(',');

// Deterministic hash and coherent value noise. No Math.random anywhere in this
// project, and white noise is useless for this: damp patches on a beach are
// metres across and correlated, so every field here is fBm over smoothed
// value noise, the same construction coast.js uses for the cliff.
function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
const sm = (t) => t * t * (3 - 2 * t);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = sm(x - xi), v = sm(y - yi);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a + (b - a) * u) + ((c - a) + (d - c) * u - (b - a) * u) * v;
}
// Zero-mean fBm in about [-1, 1].
function fbm(x, y) {
  let s = 0, a = 1, f = 1, n = 0;
  for (let o = 0; o < 3; o++) {
    s += a * (vnoise(x * f, y * f) - 0.5) * 2;
    n += a; a *= 0.52; f *= 2.17;
  }
  return s / n;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------------------------------------------------------------------------
// CONSTANTS. DAMP_MUL and ROWS_T's seaward limit are MEASURED (frame 0566 and
// the Southbourne aerial); ROWS_T's landward limit is set by a gate box, which
// is said plainly where it is set; MOT_A was fitted by rendering; the two x
// pitches are a triangle-budget decision.
// ---------------------------------------------------------------------------
const X_FINE0 = -320, X_FINE1 = 620, DX_FINE = 7;   // where the judged cameras look
const X_FAR1 = 2450, DX_FAR = 26;                   // the rest of the 2.8 km, cheaply
// t = z / mhwOffset(x). THE SEAWARD FIFTH ONLY - 7.0 m of a 38 m beach at the
// pier root. Two independent reasons, and they agree:
//
//  1. MEASURED. The owner's Southbourne aerial
//     (southbourne-eastcliff/1573400858124679.jpg, overcast) read across the
//     beach at image row 980: sea 70-100, a bright foam spike 126-132 over
//     about 10 px, then a BRIGHT DAMP STRIP 114-126 over about 20 px, then the
//     dry beach settling at 103-118 for the remaining ~180 px. The damp strip
//     is roughly a tenth of the beach width, not a third and not a half, and
//     the ribbon's own ramp - sandDry all the way to sandDamp over the whole
//     38 m - is a third failure of the same key, after sign and size.
//  2. THE GATE. tmp-tr2/measure.py's entrance_sand box (S_entrance rows
//     231-239, cols 600-860) inverts to the beach ground patch x 52..116,
//     t 0.00..0.75 - computed by ray-casting the box corners onto the ribbon
//     surface, and confirmed by a ?bdbg=mask render. Starting at t = 0.80
//     leaves 0.05 of beach depth, about 1.9 m and 1.4 image rows, of margin.
//     A full-beach sheet was built first and blew that gate by 1,978 px
//     against a 40 px cap; this one does not touch it.
const ROWS_T = [0.80, 0.85, 0.895, 0.935, 0.97, 1.0];
const LIFT = 0.14;                 // metres above the ribbon, see the note below
// MOT_A is the STANDARD DEVIATION of the albedo multiplier, not a raw
// amplitude, because the first build of this file got that wrong and it is the
// trap anyone repeating this will fall into. fBm over three octaves, sampled at
// THESE vertex stations, has sd 0.173 and mean +0.058 - not 1 and not 0 - so a
// "0.215 amplitude" delivered a 3.5% swing and moved the rendered CV by 0.0002.
// The field is now normalised by those two constants (measured over all 1,485
// vertices of the fine section, tmp-tr113/fieldsd.mjs) and clamped, so MOT_A
// means what it says and the mean albedo of the beach is unchanged.
const MOT_BIAS = 0.058, MOT_SD = 0.173, MOT_CLAMP = 2.0;
const MOT_A = 0.15;                // sd of the albedo multiplier
const DAMP_MUL = [1.05, 1.19, 1.25];   // measured, 0566, see above
const DAMP_T = 0.885;              // mean tide mark, as a fraction of beach depth
const DAMP_RAG = 0.070;            // +-, along-shore: THE EDGE IS NOT STRAIGHT
const DAMP_SOFT = 0.085;           // how far the damp fades in landward of the mark

// The ribbon's own beach surface, exactly: y = 3.0 at z = 0, 0 at z = w.
// Only valid for 0 <= z <= w, which is the only place this sheet goes.
const ribbonY = (z, w) => 3.0 * (1 - z / w);

export function buildBeachSurface(m, C, MAT, OX, OZ, mhwOffset) {
  if (BDBG.includes('off')) return { tris: 0, verts: 0 };
  const FLAT = BDBG.includes('flat');
  const MASK = BDBG.includes('mask');
  const NODAMP = BDBG.includes('nodamp') || FLAT;
  const NOMOT = BDBG.includes('nomot') || FLAT;

  // Column stations. ONE row count for every column, so there is not a single
  // T-junction anywhere in the sheet: only the along-shore pitch changes.
  const xs = [];
  for (let x = X_FINE0; x < X_FINE1; x += DX_FINE) xs.push(x);
  for (let x = X_FINE1; x <= X_FAR1; x += DX_FAR) xs.push(x);

  const v0 = m.vertexCount;
  const cols = [];
  for (const x of xs) {
    const w = mhwOffset(x);
    // Surface normal of the ruled beach, built the same way the ribbon builds
    // its own: the segment runs (0, 3.0) -> (w, 0) in (z, y).
    const l = Math.hypot(3.0, w);
    const ny = w / l, nz = 3.0 / l;
    // The tide mark's own along-shore wander. One coherent field, ~90 m
    // wavelength, so the damp edge is a slow scallop rather than a ruled line
    // or a sawtooth. Frame 0565 (sunlit, FORM ONLY - no tone taken from it)
    // shows the swash running up in tongues at about this scale.
    const rag = fbm(x / 90, 11.3) * DAMP_RAG + fbm(x / 31, 4.7) * DAMP_RAG * 0.35;
    const tMark = DAMP_T + rag;
    const col = [];
    for (let k = 0; k < ROWS_T.length; k++) {
      // k = 0 is the SEAWARD row. ROWS_T is landward-first, so read it
      // backwards: this keeps the index roles identical to the ribbon's.
      const t = ROWS_T[ROWS_T.length - 1 - k];
      const z = t * w;
      // Two separate tapers, and they are not the same thing.
      //  * edge  - the LIFT, so the sheet has no step against the ribbon at
      //    its landward seam and sits within 2 cm of the water plane at its
      //    seaward one (t = 1 IS the waterline, so there is no strip of
      //    untouched ribbon between this sheet and the sea).
      //  * cw    - the COLOUR, which has to leave the seam matching the
      //    ribbon's OWN ramp. The ribbon interpolates sandDry -> sandDamp
      //    across the whole beach, so at t = 0.80 its vertex colour is already
      //    0.73 of sandDry. Painting full sandDry there would lay a bright
      //    line along the beach; blending out of the ribbon's own value over
      //    0.06 of beach depth (2.3 m) does not.
      const edge = Math.min(sm(clamp((t - 0.80) / 0.05, 0, 1)),
        sm(clamp((1.0 - t) / 0.03, 0, 1)));
      const cw = sm(clamp((t - 0.80) / 0.06, 0, 1));
      const y = ribbonY(z, w) + LIFT * (0.12 + 0.88 * edge);

      // ---- colour -------------------------------------------------------
      // Base is the ribbon's own key, so with the modulation off this sheet is
      // invisible (that is what ?bdbg=flat checks).
      let c = [C.sandDry[0], C.sandDry[1], C.sandDry[2]];
      if (!NOMOT) {
        // Three fields at three scales. The long one carries the metres-wide
        // damp/dry patchwork the photographs are actually made of; the short
        // one is at the vertex pitch and is what stops the long one reading as
        // an airbrush. Cross-shore wavelengths are shorter than along-shore
        // ones because that is how a beach dries: in bands parallel to the
        // water, broken up by drainage.
        // The finest octave is 13 m along-shore against a 7 m vertex pitch:
        // anything shorter aliases on this lattice rather than adding detail.
        const raw = 0.50 * fbm(x / 74, z / 41)
          + 0.33 * fbm(x / 26 + 17.1, z / 17 + 3.3)
          + 0.17 * fbm(x / 13 + 53.7, z / 9 + 29.1);
        const mot = clamp((raw - MOT_BIAS) / MOT_SD, -MOT_CLAMP, MOT_CLAMP);
        const g = 1 + MOT_A * mot;
        c[0] *= g; c[1] *= g; c[2] *= g;
      }
      if (!NODAMP) {
        // The tide mark. smoothstep from dry to damp across DAMP_SOFT of the
        // beach depth, centred on a mark that wanders along the shore.
        const d = sm(clamp((t - (tMark - DAMP_SOFT * 0.5)) / DAMP_SOFT, 0, 1));
        c[0] *= 1 + (DAMP_MUL[0] - 1) * d;
        c[1] *= 1 + (DAMP_MUL[1] - 1) * d;
        c[2] *= 1 + (DAMP_MUL[2] - 1) * d;
      }
      // Blend out of the ribbon's own ramp at the landward seam.
      for (let q = 0; q < 3; q++) {
        const rib = C.sandDry[q] + (C.sandDamp[q] - C.sandDry[q]) * t;
        c[q] = rib + (c[q] - rib) * cw;
      }
      if (MASK) c = [2.0, 0.0, 2.0];
      col.push(m.pushC(x + OX, y, z + OZ, 0, ny, nz, c, MAT.SAND));
    }
    cols.push(col);
  }

  // ⚠️ THE RIBBON'S WINDING, NOT THE OBVIOUS ONE. See the note at the head of
  // this file: quad(i3, i2, i1, i0) makes the LIT side the FRONT face, so the
  // depth pass (cullFace(FRONT)) discards this sheet and it cannot shadow
  // itself the way the beach used to.
  let tris = 0;
  for (let j = 0; j + 1 < cols.length; j++) {
    for (let k = 0; k + 1 < ROWS_T.length; k++) {
      const i0 = cols[j][k], i1 = cols[j][k + 1];
      const i2 = cols[j + 1][k + 1], i3 = cols[j + 1][k];
      m.quad(i3, i2, i1, i0);
      tris += 2;
    }
  }
  return { tris, verts: m.vertexCount - v0, cols: cols.length, rows: ROWS_T.length };
}

// ---------------------------------------------------------------------------
// THE CROSS-SLOPE PROFILE IS WRONG, AND I AM LEAVING IT ALONE. THE NUMBERS.
// ---------------------------------------------------------------------------
// The ribbon runs the beach as a STRAIGHT 1:12.7 ramp: y = 3.0 at z = 0 down
// to y = 0 at z = mhwOffset(x) = 38 m at the pier root.
//
// The EA 1 m DSM already in the tree (ref-cache/pier_dsm.tif, read with
// tmp-tr99/dsm_wall.py's own station mapping, probed at nine along-shore
// offsets o = -70..+90 excluding o = +75 which has a structure on it) says it
// is not a ramp. Converted to model units with model y = ODN + 0.57 - the
// offset implied by the protected DECK 5.470 against the DSM's 4.90 ODN deck -
// and averaged over the nine columns:
//
//     z (m)     0     10     20     30     40     50     60     68
//     DSM     2.94   2.60   2.31   2.03   1.60   0.92   0.59   0.32
//     ribbon  3.00   2.21   1.42   0.63   0.00  -0.77  -0.90  -0.90
//     error  -0.06  +0.39  +0.89  +1.40  +1.60
//
// The real beach is a BERM: nearly flat for the first 20-30 m (1:29 to 1:91 on
// the west columns, 1:69 over z 20-40 on the east ones), then a distinctly
// steeper face of about 1:12 from z 34-50, then flattening again. The model
// has that same 1:12 face, but it has applied it to the WHOLE beach, so the
// mid-beach sits up to 1.40 m too low.
//
// TWO THINGS THE SAME PROBE SETTLES, both worth more than the profile itself:
//
//   1. STATUS.md's open item "the coast ribbon datum leaves the beach too high
//      against the pier" IS WRONG, AND IT IS WRONG IN SIGN. The apron top is
//      AP_TOP 5.37 and the ribbon's beach lip is 3.00, so 2.37 m of wall
//      stands clear of the sand. tmp-tr99's own DSM probe measured that drop
//      at 2.05-2.86 m, median 2.45, over 13 offsets. The model is 0.08 m
//      inside the median and comfortably inside the range. The beach is not
//      too high at the wall; it is too LOW everywhere else.
//
//   2. mhwOffset IS RIGHT. Bournemouth MHWS is about +1.0 ODN; the DSM crosses
//      +1.0 ODN at z = 37 (o = -55) to z = 45 (o = +60), and the table says 38
//      at x = 0 rising to 45 at x = 300.
//
// WHY IT IS NOT CORRECTED HERE. tmp-tr2/measure.py's `entrance_sand` gate is
// rows 231-239, cols 600-860 of S_entrance, and those nine rows ARE the beach:
// the whole 38 m beach depth occupies rows 230-242 in that view, so each row
// is about 3.5 m of ground. At the entrance camera's 230 m and its 24.1 degree
// vertical field over 405 px (16.8 px/deg), a 1.40 m lift at mid-beach moves
// that sand 5.9 px - six rows of a nine-row must-not-move box. There is no
// version of the correction that leaves the gate alone, and the brief's
// instruction for this item is explicit: measure it, report it, change it only
// if every gate still passes. It does not, so it is reported and left.
//
// Correcting it is a real job and it is worth doing - it wants the ribbon's
// three sand rows replaced by five, the gate re-baselined DELIBERATELY with an
// ablation, and measure.py's baseline.json regenerated in the same commit.
// ---------------------------------------------------------------------------
