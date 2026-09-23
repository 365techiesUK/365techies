// GLSL for the sky and the water.
//
// Colours are the ones measured out of the owner's own footage with ffmpeg and
// written down in reference/palette.md, converted here to linear. The three
// findings that decide whether this reads as sea water:
//
//   1. The near-to-far emerald -> teal -> blue-grey ramp IS the Fresnel term.
//      It is not fog and must not be faked with a distance lerp, or it breaks
//      the moment the camera pitches.
//   2. Foam is grey (~rgb 170), never white.
//   3. Sky, water and coast all sit within ~60 levels of each other AT the
//      horizon. A hard horizon line means the haze is wrong.
//
// The wave maths is not here. It is injected from src/sea-glsl.js, generated
// from the same component table the CPU physics sampler reads - SPEC §3's
// one-table rule. Do not add a second wave loop to this file.

import { COAST, mhwOffset } from './coast.js';
// tmp-tr71: the surf field emits its own GLSL from the SAME ladder the CPU
// sampler uses, so the breaking wave the player rides and the breaking wave
// that is drawn cannot be two different waves.
import { surfChunk } from '../sea-surf.js';
// tmp-tr147: WHERE THE SHORELINE IS. Bournemouth's is mhwChunk() below, a table
// in X with the sea at +Z. The Old Harry arena's is a signed distance field to
// its surveyed waterline, because a headland has sea on BOTH sides and cannot
// be written as mhw(x) at any rotation (tmp-tr138/ARCH.md section 3).
//
// ⚠️ THE THREE TEMPLATES BELOW ARE THE ONLY PLACE THE TWO DIFFER, and with the
// flag off each one emits the EXACT text that was inline here before. The
// emitted vertex and fragment sources are then byte-for-byte what they were,
// which is how "Bournemouth is bit-identical" is a construction rather than a
// hope. tmp-tr147/RESULT.md carries the string diff and the 19-view pixel diff.
import { SHORE_ON } from '../sea-shore.js';

// "how far offshore is this point", for the VERTEX stage. Both arms leave
// `shoreW` and `shoreD` defined, because the code below uses both names.
const shoreVertChunk = () => (SHORE_ON ? `  vec3 shoreF = shoreFieldAt(P.xz);
  float shoreW = 40.0;
  float shoreD = shoreF.x;` : `  float shoreW = mhwAt(P.x);
  float shoreD = P.z - (shoreW - COAST_Z0);`);

// The same, for the FRAGMENT stage. shoreW is only ever read by bedDepth() on
// its LANDWARD branch (d <= 0), which is the beach ribbon's own ramp; the arena
// has no ribbon, so 40 m is a placeholder that no drawn pixel can reach.
const shoreFragChunk = () => (SHORE_ON ? `  vec3 shoreF = shoreFieldAt(vWorld.xz);
  float shoreW = 40.0;
  float shoreD = shoreF.x;` : `  float shoreW = mhwAt(vWorld.x);
  float shoreD = vWorld.z - (shoreW - COAST_Z0);`);

// >>> SHORE
// d(eta)/d(shoreD) -> world XZ. This is the SAME quantity in both arms: the
// gradient of the offshore coordinate. Bournemouth's is (-dmhw, 1) - the
// analytic gradient of z - mhw(x) - and the arena's is the distance field's own
// unit gradient, which costs nothing because the four taps that gave the
// distance give it too.
//
// WHAT THIS EMITS, AND WHEN IT WAS LAST KNOWN GOOD. It is the third of the
// three shoreline templates named in the block at the top of this file, and
// until tmp-tr175 (20 Sep 2026) it was the only one of the three that was
// never called: waterFrag() carried Bournemouth's `dmhw` lines inline, so with
// the arena flag ON the surf crest still took its direction from Bournemouth's
// MHW table 8.4 km away. That table clamps out of range there, `dmhw` is
// EXACTLY 0 at every arena pixel, and the crest slope therefore pointed at
// world +Z no matter which way the headland faced - mean 90.7 deg and worst
// 180.0 deg away from the true offshore direction, measured over the 1,210
// field nodes 1-120 m offshore. It is now wired in at the one call site below
// and both arms are exercised: the OFF arm emits byte-for-byte the text that
// was inline - the generated water fragment source with the flag off differs
// from the pre-wiring one by the two fence marker lines above and by nothing
// else (diffed; +26 chars, both of them comments) - and the ON arm is what the
// arena renders.
//
// The OFF arm was ALSO self-recursive - it interpolated a call to its own
// function - so reaching it at all was an immediate RangeError. That was
// invisible while nothing called the template and is why the two defects are
// one defect: a template nobody calls is a template nobody type-checks.
const shoreGradChunk = () => (SHORE_ON ? `    // d(eta)/d(shoreD) -> world XZ. shoreF.yz is the shore field's own UNIT
    // gradient, i.e. the offshore direction at this pixel, so the crest wraps
    // the headland instead of facing world +Z. It costs no extra taps: the
    // four that gave the distance gave the gradient with it.
    vec2 g = ST.y * shoreF.yz;` :
  `    // d(eta)/d(shoreD) -> world XZ. shoreD runs with +Z, tilted by the beach's
    // own along-X gradient, which is what keeps the crest parallel to the sand
    // rather than to the world axis.
    float dmhw = (mhwAt(vWorld.x + 4.0) - mhwAt(vWorld.x - 4.0)) / 8.0;
    vec2 g = vec2(ST.y * -dmhw, ST.y);`);
// <<< SHORE

// sRGB -> linear, done once at authoring time rather than per fragment.
const lin = (r, g, b) => {
  const f = (c) => Math.pow(c / 255, 2.2).toFixed(5);
  return `vec3(${f(r)}, ${f(g)}, ${f(b)})`;
};

// ---------------------------------------------------------------------------
// lin() UNDOES sRGB. It does NOT undo the tonemap, and for an OPAQUE surface
// whose measured value is a finished pixel out of a photograph, that is a bug
// rather than a rounding error.
//
// A number sampled out of a JPEG has already been through a camera's own tone
// curve. Feeding it back in as scene radiance and running aces() over it again
// tonemaps it twice, and because the curve is steepest at the top the loss is
// worst exactly where it matters. MEASURED through this file's own pipeline at
// exposure 1.0:
//     authored 226,231,242 (the measured swash foam)     renders 223,224,228
//     authored 240,251,255 (the measured breaking crest)  renders 227,230,231
// The two are 14 levels apart in the reference and 4 apart on screen, and both
// land within 12 levels of the water they are painted on (SKY_HORIZON itself
// renders 215,224,225). The previous note on these constants spotted the
// 3-level loss on the first one and called it inside the reference's own
// spread. It is not: the crest colour loses 13 and the two collapse together.
//
// This solves the ACES quadratic for the radiance that renders BACK as the
// measured luminance and scales the measured linear colour by it. It comes out
// at 1.240x for the swash sheet and 2.981x for the breaking crest.
//
// ⚠️ WHAT IT DELIVERS IS THE LUMINANCE, NOT THE HUE. The solve is done on
// luminance and the curve is then applied PER CHANNEL, which recompresses the
// channels against each other. Measured forward through this file's own
// aces()/encode() at exposure 1.0, at full coverage:
//     SURF       authored 226,231,242  renders 229.5,230.8,233.5
//     SURF_BREAK authored 240,251,255  renders 248.2,249.2,249.5
// Luminance lands on target to 0.04%, and the two constants now separate by 18
// rendered levels where lin() left them 4 apart - which was the point. But the
// blue-over-red the references are emphatic about (+16 levels on the swash,
// +15 on the crest) arrives as +4 and +1.3, so the foam renders NEUTRAL where
// the photograph is blue-white, and SURF_BREAK's red lands 8 levels above the
// value it was authored from. Recovering the hue would need a per-channel
// solve, which does not preserve luminance; that trade has not been made here.
//
// Sanity check that this is physics and not a fudge: it puts sunlit foam at
// 1.5-3.0x the radiance of SKY_HORIZON. A white surface at 0.7 albedo under
// ~100 klx sits near 22 kcd/m2 against a clear horizon sky's 8-15, so 1.5-2.7x
// is the right neighbourhood. The reference's own 255s are clipped - the real
// crest was brighter than the camera could hold - which says the same thing.
//
// ⚠️ ONLY for opaque surfaces composited over the finished colour, i.e. the
// surf foam. The BODY_* constants must NOT use it: they feed a Fresnel mix and
// were already solved through the whole pipeline to land on their measured
// value, so putting them through here would correct them twice.
// ---------------------------------------------------------------------------
const linTM = (r, g, b) => {
  const f = (c) => Math.pow(c / 255, 2.2);
  const L = [f(r), f(g), f(b)];
  const y = 0.2126 * L[0] + 0.7152 * L[1] + 0.0722 * L[2];   // target, display-linear
  const A = 2.51 - 2.43 * y, B = 0.03 - 0.59 * y, C = -0.14 * y;
  const x = (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);   // solves aces(x) = y
  const k = x / y;
  return `vec3(${(L[0] * k).toFixed(5)}, ${(L[1] * k).toFixed(5)}, ${(L[2] * k).toFixed(5)})`;
};

// ---------------------------------------------------------------------------
// ?wdbg=nodetail,nofoam,noglitter,noroughen,nosurf,nocloud,noface,nolobe,showsurf - ablation
//
// 2026-09-17 (tmp-tr71, the surf): two more, and between them they restore the
// pre-surf water EXACTLY, which is how 'only the water in the two banks moved'
// gets proved rather than asserted:
//   ?surf=0             the whole shoaling train, its bed perturbation and the
//                       line-up (a URL parameter, not a wdbg: it is a real game
//                       control and it reaches the CPU sampler too)
//   ?wdbg=nosurftrain   the train's contribution to THIS shader only
//   ?wdbg=nofoamtex     the foam texture, which also breaks up the PRE-EXISTING
//                       swash and sheet and so is not covered by ?surf=0
// switches.
//
// nolobe removes the far-water rough reflection lobe (2026-09-16) and nothing
// else; noroughen removes it too, together with the glitter widening.
//
// 2026-09-16 (tmp-tr17), one switch per sea fix so each can be ablated alone:
//   nooc        water reflections ignore ?overcast (the pre-fix blue sea on a grey day)
//   nolobecloud the far-water lobe reflects the cloud-free sky again
//   nofarchroma far water keeps the blue zenith reflection and the teal body (tmp-tr21)
//   nofootfix   detailFade keys on the per-triangle footprint again (the pale wedges)
// 2026-09-16 (tmp-tr24, sea polish), same rule:
//   nofartrend   far water keeps the tmp-tr21 lobe tint (no extra horizon greening)
//   frontsoft    OPT-IN: soften the straight fade front (moves b50; owner keeps b50 on 763) (nofrontnoise: no wander)
//   nofrontwander the fade front is straight again (tmp-tr35 wander is DEFAULT since 2026-09-17, owner; keeps b50, approach_seamid re-baselined +2 R)
//   nocloudsoft  the far-water lobe's reflected clouds are hard-edged again
//   noocblue     overcast far water keeps ocSky()'s neutral grey (no blue lift)
//
// nocloud removes the weather layer from BOTH the sky pass and the water's
// reflection term, and nothing else. It exists for the same reason nosurf does:
// the cloud field was added on 2026-08-20 to a sea whose mid-distance colour is
// SETTLED and measured, and "the sea did not move" has to be PROVED by a diff
// rather than argued from the shape of the falloff. It also isolates the sun's
// own Mie halo, which is a feature the sky is supposed to have and which any
// sky-structure metric will otherwise count as weather.
//
// showsurf is the odd one out: it does not remove a term, it paints the three
// shore masks straight out as R = foam coverage, G = breaking share, B = bed
// return (see the last line of the water fragment shader). It was implemented
// and used for attribution but left out of this list, which is the same thing
// as not existing to the next reader.
//
// nosurf removes the whole shoreline block (surf foam AND the shallow-water bed
// return) and nothing else, which is how "the sea colour has not moved" gets
// PROVED rather than asserted: render with and without and diff. It is not the
// same switch as nofoam, which is the offshore whitecap term.
//
// The sea's "too much high-frequency detail" problem has three plausible
// culprits (detail normal, foam, sun glitter) and arguing about which is
// useless: they are cheap to turn off one at a time and measure. This exists so
// that attribution is a render, not an opinion.
//
// Read HERE rather than in main.js because these have to be compile-time
// literals folded into the GLSL. A uniform would leave the term in the
// instruction stream, and - more to the point - a suppressed-by-uniform term
// still runs its mix() and can still alias through it. Substituting 0.0 into
// the source removes it outright.
//
// Guarded on `location` so node tooling can still import this file; sea-glsl.js
// makes the same promise and craft.js pulls SKY_GLSL out of here.
//
// ⚠️ NO BACK-TICKS ANYWHERE BELOW, not even inside a GLSL comment. Every shader
// in this file is a JS template literal, so one stray back-tick ends the string
// and the page dies at load with "Uncaught SyntaxError: Unexpected number"
// pointing at a line of English prose. Cost twenty minutes on 2026-08-19.
// ---------------------------------------------------------------------------
const WDBG = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
  ? (new URLSearchParams(location.search).get('wdbg') || '') : '').split(',');
const dbg = (k) => (WDBG.includes(k) ? '0.0' : '1.0');
// Numeric tuning hook, 2026-09-16 (far-water chroma): ?wnum=fb:0.8,fh:0.5 overrides a
// constant at shader build time. Absent or non-numeric = the measured default.
const WNUM = Object.fromEntries((typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
  ? (new URLSearchParams(location.search).get('wnum') || '') : '').split(',').filter(Boolean).map((kv) => kv.split(':')));
const num = (k, d) => (WNUM[k] !== undefined && isFinite(+WNUM[k]) ? (+WNUM[k]).toFixed(4) : d.toFixed(4));

// >>> SEAOPT-dbg
// tmp-tr130, the SEA OPTICS pass. Its switches live in their own ?sdbg=
// namespace rather than in ?wdbg=, for two reasons: the wdbg list is already
// sixteen names long and mixing an optics ablation into it makes "which switch
// proved what" unanswerable six weeks later; and craft.js owns ?cdbg= on the
// same page, so three namespaces now line up one per owner - cdbg the coast,
// wdbg the wave/foam dynamics, sdbg the water's optics.
//
// Same compile-time substitution rule as dbg()/num() above and for the same
// reason: sdbg() folds to the literal 1.0 when the switch is absent, so an
// unflagged build has no trace of the switch in its instruction stream and
// cannot alias through a suppressed term.
const SDBG = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
  ? (new URLSearchParams(location.search).get('sdbg') || '') : '').split(',');
const sdbg = (k) => (SDBG.includes(k) ? '0.0' : '1.0');
const sOn = (k) => SDBG.includes(k);
const SNUM = Object.fromEntries((typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
  ? (new URLSearchParams(location.search).get('snum') || '') : '').split(',').filter(Boolean).map((kv) => kv.split(':')));
const snum = (k, d) => (SNUM[k] !== undefined && isFinite(+SNUM[k]) ? (+SNUM[k]).toFixed(4) : d.toFixed(4));
// <<< SEAOPT-dbg

export const SKY_GLSL = `
// Analytic sky. Doubles as the reflection source for the water, so it has to be
// evaluable from an arbitrary ray direction, including ones pointing down.
const vec3 SKY_ZENITH  = ${lin(53, 116, 181)};
// Horizon shifted from a purple-grey to the CYAN measured in frame 0657
// (#CFE5E8 against this file's previous #D4DEF0). This matters far more than it
// looks: at the player's eye height of 1.6 m almost all visible water is at
// grazing incidence, where Schlick puts Fresnel near 1, so the sea is mostly
// SKY REFLECTION. A purple-grey sky therefore produced a purple-grey sea, which
// is most of what read as "washed out" - the water body colour was only part of
// it. Changing the sky is the cheaper and more correct fix.
const vec3 SKY_HORIZON = ${lin(207, 229, 232)};
const vec3 SUN_TINT    = ${lin(255, 244, 224)};
const vec3 COAST_TINT  = ${lin(153, 155, 168)};

// ---------------------------------------------------------------------------
// WEATHER. Until 2026-08-20 this sky was a vertical gradient plus a Mie halo and
// nothing else, i.e. one genuinely cloudless afternoon, on 16-43% of every
// judged frame.
//
// ⚠️ THE NUMBER THE OPEN LIST QUOTED FOR THIS IS NOT USABLE AND THE REPLACEMENT
// IS SMALLER. The survey measured raw mean |dL/dx| over a sky box and put the
// owner's photographs 7-16x above the render (3.34 against 0.21-0.47). Re-run
// here, most of that gap is PIXEL PITCH, not weather: a 4000 px phone frame's
// neighbours sit ~4x closer in ANGLE than a 900 px render's, so a smooth
// gradient scores lower per pixel there while sensor and JPEG noise scores the
// same. Resample every photograph to the render's 900 px and the photograph
// median falls from 3.34 to 0.41 against the render's 0.065-0.227. Raw per-row
// sd is confounded too - it counts this shader's own Mie halo, which scores
// 4.8-5.9 with no cloud in frame at all, the same as reference 763 which HAS
// visible cumulus.
//
// So the target was re-measured on a metric that only weather can move: band-
// pass the sky between 9 and 121 px ALONG X (0.5-7 deg at these cameras, which
// is what a Poole Bay cumulus subtends from the water), and take the sd, plus
// the share of sky more than 4 levels off that band-pass. A vertical gradient
// scores 0 on both; the halo scores under 1. Measured over eight hand-aimed sky
// boxes in the owner's own SUNNY photographs of this coast:
//
//     metric            reference min / median / max   before      SHIPPED
//     band-pass sd            1.37 /  3.83 / 13.82     1.41-2.14   6.49-7.14
//     cloud share, |bp|>4     1.8% /  9.3% / 66.1%     0.9%-1.9%   15.8-16.5%
//     cloud share, blue/red   0.0% / 12.5% / 47.0%     0.9%-1.9%   6.4-17.7%
//     8x8 per-row sd          6.15 / 19.30 / 41.72     4.31-5.44   10.7-11.7
//     cloud-vs-sky dL        17.6  / 73.3  / 89.3        n/a       21.4-39.5
//
// The render sat at or below the MINIMUM of all eight on every one. The defect
// is real; it is about 3x, not 16x. The SHIPPED column is inside the reference
// range on every row, at approach / entrance / head; it sits above the median on
// the two structure metrics and below it on contrast, which is the signature of
// a field of many medium clouds where the reference median is fewer and bigger.
// That is the closest this construction gets without inventing cloud sizes the
// reference cannot support.
//
// ⚠️ THREE CAMERAS, NOT FIVE, AND THE OTHER TWO ARE NOT IN THE TABLE. Said out
// loud because "inside the range" invites being read as a whole-frame result.
// arcade is excluded by construction - rsky2.py records that no rect in it
// survives the nocloud ablation. ALONG-NECK IS EXCLUDED BY MEASUREMENT: its one
// proven-clean rect (430,0,900,60) scores band-pass 0.36 and cloud share 0.0%
// on the shipped build, i.e. BELOW the reference minimum of 1.37, and it scored
// the same 0.36 / 0.0% before this pass - that strip of sky simply has no cloud
// in it at either threshold. Verified 2026-08-20. It is a 470 x 60 px strip and
// a small share of that frame, but it is one of the five judged cameras and the
// table above says nothing about it.
//
// ⚠️ TWO DIFFERENT "CLOUD SHARE" NUMBERS APPEAR IN THIS FILE and they are not
// interchangeable. |bp|>4 is the band-pass residual test (skystat.stats); the
// blue-over-red one is the absolute B-R collapse test the SIZE/TH table below
// uses. On the same eight reference boxes they give medians of 9.3% and 12.5%,
// and on frame 763 they give 7.8% and 16.6%. Say which one you mean.
//
// WHAT IS BUILT: a three-slab cumulus field (it started as two - see the note
// further down - and this sentence said "two" long after the third was added).
// Cumulus are not a veil: they are discrete lumps with a flat base at one
// height, and the flat base is most of what makes them read as cumulus rather
// than as fog. So the same noise field is sampled on horizontal planes at
// CLOUD_BASE_M, CLOUD_MID_M and CLOUD_TOP_M. For a
// ray of elevation e the plane at height H is met at slant range H/sin(e), so
// the sample point is d.xz * H / (sin(e) * CLOUD_SIZE_M) - which means the base
// plane's sample is exactly (BASE/TOP) times the top plane's, a pure radial
// scale. That is real parallax, not a fudge: the same lump's base is met at a
// LOWER elevation than its top, so its underside shows as a band below the lit
// crown, and the lower edge of that band is the flat bottom.
//
// ⚠️ NO ANIMATION, deliberately. There is no clock in this shader and there must
// not be one: main.js's whole calibration-render contract is that ?hold=1 makes
// successive renders identical, and every measurement in this file's history
// depends on it. The clouds are a fixed field. A drifting sky is a separate job
// and it needs a time uniform plumbed through renderer.js, which is not my file.
//
// ⚠️ THREE SLABS, NOT TWO, AND THE THIRD IS NOT DECORATION. With two the shading
// is binary - either the ray meets the crown or it meets the base - so a cloud
// with any real vertical depth renders as a white cap sitting on a slab of flat
// grey. The third sample is the middle of the same 1-D march and turns that into
// a continuous height, which is what a sunlit flank needs.
//
// ⚠️ THE DEPTH IS WHAT MAKES THEM LOOK LIKE CLOUDS RATHER THAN SMEARS, and this
// is geometry, not taste. A flat plane seen at elevation e is compressed
// vertically by sin(e), and the judged cameras only ever see 0-26 deg of sky, so
// ANY single-plane cloud is squashed 4:1 or worse and reads as a streak - which
// is exactly what the 480 m-deep first attempt did. What is NOT compressed is
// the cloud's own vertical extent: 900 m of depth at 7 km subtends 7.4 deg
// against the mean lump's 6.9 deg of width, i.e. 0.93:1, which is a cumulus.
//
// ⚠️ THE LUMP IS NOT CLOUD_SIZE_M, and an earlier version of this paragraph did
// that sum with the noise wavelength and with a CLOUD_SIZE_M that had since been
// changed - it read "11.9 deg of width, i.e. 1.6:1" off SIZE 1450 while the
// constant said 2600. CLOUD_SIZE_M is the wavelength of the noise; the CLOUD is
// the connected region where the field beats its clumped threshold, and at
// TH 0.800 that is much smaller. MEASURED on the CPU with this file's own hash,
// octave schedule and clump field over a 60 x 60-unit patch sampled at 40
// samples per unit, counting only islands that do not touch the patch edge
// (635 of them): field sd 0.1312 about a mean of 0.4976, ground coverage 1.48%,
// island equivalent-disc diameter (2*sqrt(A/pi)) mean 591 m and median 381 m,
// longer bbox side p25 195 m / p75 1040 m / max 6500 m.
// ⚠️ RE-DERIVED 2026-08-20 BY THE VERIFIER. The line above used to read "634
// complete islands ... mean 838 m ... bbox side p25 130 m / p75 845 m / max
// 5460 m". Re-run from this file's constants the count, the coverage and the
// MEDIAN reproduce (635, 1.48%, 381 m) but the MEAN does not - it is 591 m, not
// 838 - and no single bbox definition yields 130/845/5460 (130 is the shorter
// side's p25, 845 the row extent's p75, 5460 near the geometric mean's max, so
// the old triple mixed three definitions). Failure mode 4, caught by recomputing
// rather than by reading. The sampling rate and the edge rule are stated here
// because the count and the percentiles both move with them.
// Fair-weather cumulus run 0.5-2 km, so the median is small for one and the mean
// is at the bottom of the band rather than mid-band as the old number implied;
// the tail still reaches congestus.
// Ground coverage is far below the SCREEN coverage measured above because the
// projection stretches the field radially - do not compare the two.
const float CLOUD_BASE_M = 850.0;    // fair-weather cumulus base over the UK in
const float CLOUD_MID_M  = 1250.0;   // summer, 600-1200 m; depth 500-1000 m.
const float CLOUD_TOP_M  = 1750.0;   // INFERRED - nothing in the reference set
                                     // resolves a cloud base height or depth.
// SIZE and TH were both MEASURED IN, not guessed. Screen cloud share, taken as
// the share of a sky box whose blue-over-red has collapsed below half the same
// box's own clear-sky value - an absolute test, so a cloudless box scores near
// zero rather than the 33% a per-frame terciles split forces on it:
//     six curated sunny reference boxes   0.0  5.0  11.7  13.4  16.6  47.0 %
//     first attempt, SIZE 640 TH 0.560                          51.7 %
//     second,        SIZE 640 TH 0.645                          26.9 %
//     third,         SIZE 1450 TH 0.680                      NOT MEASURED
//     fourth,        SIZE 2600 TH 0.770                       23.0 - 30.8 %
//     shipped,       SIZE 2600 TH 0.800                        6.4 - 17.7 %
// (the last two are the spread across the approach, entrance and head cameras)
// and the first two were also wrong in CHARACTER, not just in quantity: a field
// of many small lumps at one scale reads as a mackerel altocumulus sheet, and
// every reference frame of this coast shows FEW, LARGE, well separated cumulus
// with big clear gaps. Size is what fixes that; the threshold only thins it.
//
// ⚠️ THE SHIPPED PAIR IS 2600/0.800. This line used to say 1450/0.680 while the
// code said 2600/0.770 - a comment describing code that does not exist, which is
// this project's documented failure mode number four. The 1450/0.680 row above
// is left in for the history but its coverage was never recorded and this pass
// did not re-render it, so it says NOT MEASURED rather than a number invented to
// fill the column. Every other figure in this block was computed from a render
// of the constants as they stand.
//
// TH 0.770 vs 0.800, measured rather than eyeballed. At 0.770 coverage was
// 23-31% - above the reference p75 of 19.3% - band-pass sd 10.4-10.9 and 8x8
// per-row sd 21.1-23.6. At 0.800 coverage is 6-18%, straddling the reference
// median, and the picture matches 979558724175565 (the commonest Bournemouth
// sky: small scattered cumulus, big clear gaps) where 0.770 read as a busier
// day than any sea-level reference in the set. The cost is that the 8x8 per-row
// sd falls from ~22 to ~11, i.e. from the reference median down to its p25.
// Coverage was preferred over that because coverage is what an eye reads.
const float CLOUD_SIZE_M = 2600.0;   // horizontal size of one lump
const float CLOUD_TH     = 0.800;    // coverage threshold on the normalised FBM
const float CLOUD_SOFT   = 0.058;    // edge softness
// Cumulus clump into streets with wide clear lanes between them. A plain
// threshold on an FBM does not: it spaces the lumps out almost evenly, which is
// the other half of why the mackerel version looked wrong. A second, much
// coarser noise field shifts the threshold up and down by +/-0.5*CLOUD_CLUMP,
// which opens real holes in the field and packs the rest. It costs one noise
// sample per slab and it is the single largest improvement in how the sky READS
// for the smallest cost in this block.
const float CLOUD_CLUMP  = 0.260;

// ⚠️ CLOUD_TH IS ABOVE 0.5 ON PURPOSE AND THAT IS LOAD-BEARING. skyFbm() fades
// each octave toward its own MEAN of 0.5 as the sample footprint outgrows it,
// so a ray that cannot resolve any octave returns exactly 0.5, which is BELOW
// the threshold, which gives alpha 0, which returns this function's pre-cloud
// value bit for bit. That is what keeps the settled sea safe: the water's
// reflection ray is scattered by the wave normals, its footprint is enormous,
// and it therefore reflects the SAME sky it reflected before rather than a
// uniform veil that would lift the whole sea.
//
// Colours are LINEAR RADIANCE, not display values, and they are solved through
// this file's own aces()/encode() at exposure 1.0 rather than copied out of a
// JPEG. Measured over the curated frames, a sunlit cumulus crown sits +69
// display levels of luminance above its own clear sky and a base +22 (the base
// is usually still brighter than the sky at these small angular sizes; only the
// nearest, biggest cloud in the set went darker, at -37). Solving aces(x) = y
// backwards: 250/255 wants linear 3.17, 195/255 wants 0.42. Hue is taken from
// the measured medians - crown 213,219,248 and base 140,189,243 - which are
// both BLUE-leaning, because a cumulus is a white dielectric taking its fill
// light from the sky around it. The consumer-JPEG saturation in those medians
// is NOT copied; only the channel ORDER is.
const vec3 CLOUD_LIT  = vec3(2.34, 2.50, 2.72);
const vec3 CLOUD_DARK = vec3(0.34, 0.41, 0.53);

// Hoskins hash12. Deterministic, no tables, no textures - the project rule.
float skyHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float skyNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = skyHash(i);
  float b = skyHash(i + vec2(1.0, 0.0));
  float c = skyHash(i + vec2(0.0, 1.0));
  float e = skyHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, e, f.x), f.y);
}

// 4-octave FBM, band-limited per octave against the sample footprint.
//
// foot is the width of one sample in the SAME units as p. An octave whose own
// wavelength is under that is faded toward 0.5 - its mean - and not toward
// zero. Fading toward the mean is what preserves the field's expected value, so
// coverage does not creep as the footprint changes, and it is what makes the
// unresolvable case return the pre-cloud sky exactly. This is the same argument
// the water's detail normal already makes at the top of waterFrag(), applied to
// the other end of the same problem.
//
// 4 octaves at gain 0.50, not 5 at 0.52: MEASURED on the CPU with the same hash
// and the same schedule, the normalised field's sd is 0.132 either way, so the
// fifth octave bought no shape - only a scatter of sub-lump speckle that the
// projection then smears toward the horizon. It is also 20% of the cost of this
// whole block, evaluated twice per slab, twice per water fragment.
float skyFbm(vec2 p, float foot) {
  float amp = 0.5, fr = 1.0, s = 0.0, n = 0.0;
  for (int i = 0; i < 4; i++) {
    float res = 1.0 - smoothstep(0.30, 1.00, foot * fr);
    s += amp * mix(0.5, skyNoise(p * fr + float(i) * 19.7), res);
    n += amp;
    amp *= 0.50;
    fr *= 2.17;
  }
  return s / n;
}

// One cumulus slab: the silhouette of the cloud field cut on the plane at one
// height, seen along d. th is the clumped threshold, computed ONCE for the ray
// and shared by all three slabs so a lump cannot change its own threshold
// between its base and its crown.
float skySlab(vec2 q, float foot, float th) {
  return smoothstep(th, th + CLOUD_SOFT, skyFbm(q, foot));
}

// The clumping threshold for one ray.
//
// ⚠️ The clumping field is faded toward 0.5 on the SAME footprint rule as the
// FBM. If it were not, an unresolvable ray would still get its threshold pushed
// around, the threshold could drop under the field's own mean, and the "returns
// the pre-weather sky exactly" guarantee - the thing keeping the settled sea
// still - would be gone.
float skyClumpTh(vec2 q, float foot) {
  float cres  = 1.0 - smoothstep(0.30, 1.00, foot * 0.26);
  float clump = mix(0.5, skyNoise(q * 0.26 + vec2(71.3, 24.9)), cres);
  return CLOUD_TH + (0.5 - clump) * CLOUD_CLUMP;
}

// detail 0 = the pre-2026-08-20 sky, EXACTLY. 1 = full weather.
// ang = the angular width of one sample, radians. Taken with dFdx/dFdy at the
// CALL SITE rather than here, because a derivative is undefined in non-uniform
// control flow and this function is called from inside a branch in craft.js.
vec3 skyColorD(vec3 d, vec3 sunDir, float detail, float ang) {
  d = normalize(d);
  float up = clamp(d.y, -1.0, 1.0);

  // Horizon weighting. pow() rather than a linear mix because the real gradient
  // crowds almost all of its change into the bottom few degrees.
  float t = pow(1.0 - clamp(abs(up), 0.0, 1.0), 3.5);
  vec3 col = mix(SKY_ZENITH, SKY_HORIZON, t);

  float alpha = 0.0;
  if (detail > 0.0) {
    // 0.0125 rad is 0.7 deg. Below that the flat-plane projection is meaningless
    // - one pixel of elevation spans tens of kilometres of ground - and the
    // range clamp keeps the sample coordinate inside float precision.
    float dy   = max(up, 0.0125);
    float rng  = CLOUD_TOP_M / dy;
    vec2  q    = d.xz * (rng / CLOUD_SIZE_M);

    // Footprint. The projection stretches a pixel RADIALLY by 1/dy and leaves
    // it alone azimuthally, so the true footprint is anisotropic; value noise on
    // a square grid cannot be band-limited anisotropically, and taking the max
    // would kill the whole low sky. The geometric mean of the two axes is used
    // instead. What it costs is that the near-horizon band is under-filtered
    // along the radius.
    //
    // ⚠️ AN EARLIER VERSION OF THIS NOTE SAID THAT COST WAS ACCEPTABLE BECAUSE
    // "clouds STRETCH toward the horizon in 750469047084535 and 979558724175565
    // anyway". They do; the render's did not stretch, it DASHED - 2.0 px tall,
    // below every reference in the set. That is measured under the gap fade
    // below, which is what actually deals with it. This note is left because the
    // footprint choice is still the right one ABOVE the fade; it is no longer
    // the thing carrying the low sky.
    float foot = ang * (rng / CLOUD_SIZE_M) * inversesqrt(dy);

    // The three slabs are three steps of the SAME 1-D march. For a fixed ray of
    // elevation e the plane at height H is met at q = H / (e * CLOUD_SIZE_M), so
    // stepping H is a pure radial scale on q and no second projection is needed.
    float rm = CLOUD_MID_M  / CLOUD_TOP_M;
    float rb = CLOUD_BASE_M / CLOUD_TOP_M;

    // ⚠️ THE SLAB MARCH HAS ITS OWN RESOLUTION LIMIT AND IT MUST FADE OUT WHEN
    // IT IS REACHED - the same rule skyFbm() already applies to its octaves,
    // applied to the other axis. This is the largest thing the first weather
    // pass got wrong and no metric in this project could see it, because every
    // sky rect ever measured here stops at row 109-122, which at these cameras
    // is 13 deg of elevation and UP. The band from 13 deg down to the horizon is
    // another 30% of the frame and had never been looked at.
    //
    // MEASURED, approach camera, clean sky columns 0-210, cloud mask = the same
    // absolute blue-over-red collapse the coverage number uses, mean run length
    // of the mask along each axis:
    //
    //     elevation   cloud%   runX px   runY px   X:Y
    //      20-40 deg    3.4      22.6      9.9     2.28
    //      13-20 deg    1.3      11.2      4.7     2.40
    //       8-13 deg    4.6      21.3      5.1     4.15
    //       4- 8 deg    3.7      16.8      2.0     8.50   <- scratches
    //
    // and the owner's own photographs, same mask, same 900 px normalisation, in
    // the 30 rows immediately above their own horizon: runY 8.0 (763), 2.4
    // (979), 24.9 (750469), 24.1 (751893), 5.2 (5615867). The render's 2.0 px is
    // below every one of them. In ANGULAR terms it is 0.23 deg against 763's
    // 0.8 deg, i.e. 3.5x too thin, and a 2-px-tall bright feature has no
    // interior - it reads as a scratch on the lens, not as a cloud.
    //
    // WHY, and why it is not fixable by adding slabs. For a ray of elevation e
    // the sample radius is |q| = cos(e) * CLOUD_TOP_M / (sin(e) * CLOUD_SIZE_M),
    // so d|q|/de goes as 1/sin^2(e): near the horizon an enormous range of
    // radius is crushed into a few tenths of a degree. The same lump's base and
    // crown are met at radii 2.06:1 apart, which IS several degrees of elevation
    // and is the right answer - but three point samples across that span draw
    // three separate dashes with gaps between them instead of one cloud. Closing
    // the gaps needs the slab spacing to fall under one island's radial width:
    // at 6 deg that is 0.514*|q| / (N-1) <= 0.3 with |q| = 6.4, i.e. N = 12
    // slabs, four times the cost of the whole block, to draw the part of the sky
    // that is furthest away and lowest contrast.
    //
    // So it fades instead, on the honest variable: the gap between adjacent
    // slabs measured in the field's own units. 0.85 to 1.75 is where one island
    // stops being resolved; converted to elevation at these constants that is
    // full cloud above 13 deg, half at 8 deg and clear below 6 deg, which is
    // what 763, 979 and 5615867 all show - a pale hazy band above the horizon
    // with the cumulus sitting higher up. The distant-cumulus veil that IS there
    // at grazing is already carried by SKY_HORIZON, which is a milky cyan and
    // not a blue; adding cloud on top of it would count it twice.
    float gap = length(q) * (1.0 - rm);
    float res = 1.0 - smoothstep(0.85, 1.75, gap);

    // Haze. A cumulus 40 km out is gone; one inside 8 km is at full contrast.
    // This is also what protects the grazing reflection: at 1.6 m eye height the
    // water 100 m out reflects a ray 0.9 deg above the horizon, i.e. 109 km of
    // slant range on this plane, where this is already zero. It is kept as well
    // as the gap fade above and not replaced by it: the two are different limits
    // that happen to bite in the same direction, and the haze one is what covers
    // a ray that is high in elevation but still looking a long way out.
    float haze = 1.0 - smoothstep(8000.0, 40000.0, rng);

    // ⚠️ BOTH FADES ARE EVALUATED BEFORE THE FBM, AND THE FBM IS BRANCHED OVER.
    // COUNTED, not estimated: the block below is 3 slabs x 4 octaves x 4 hashes
    // plus the clump sample's 4 = 52 skyHash calls, and it runs once per SKY
    // fragment and again per WATER fragment for the reflection ray, on a surface
    // that is 44-54% of a judged frame. INFERRED, not measured: those reflection
    // rays are overwhelmingly near-horizon - exactly what this gate rejects - so
    // the branch should be coherent across a warp rather than a per-pixel coin
    // toss. Nobody has profiled this; what IS verified is that adding the branch
    // left all six calibration renders BIT-IDENTICAL, so it costs nothing to be
    // wrong about the coherence.
    //
    // Safe to branch here specifically because nothing below takes a derivative:
    // skyFbm and skyNoise are pure, and the pixel footprint arrives as a
    // parameter from the call site, which is what the note on this function's
    // signature is for. 0.002 of alpha is 0.22 of a display level at the largest
    // cloud-to-sky step this palette can make (248 against 136 in red).
    if (res * haze > 0.002) {
      float th = skyClumpTh(q * rm, foot * rm);
      float sT = skySlab(q,      foot,      th);
      float sM = skySlab(q * rm, foot * rm, th);
      float sB = skySlab(q * rb, foot * rb, th);

      // The lump covers the union of the three silhouettes; how high up it the
      // ray struck is their weighted mean. Struck at the crown only -> 1.00,
      // sunlit. Struck through the whole depth (a flank seen side-on) -> 0.68.
      // Struck at the base only -> 0.24, the shaded underside. Continuous
      // between, which is the point of the third sample.
      alpha = max(sT, max(sM, sB)) * res * haze * detail;
      float lit = (sT + sM * 0.75 + sB * 0.30) / max(sT + sM + sB, 1e-3);
      col = mix(col, mix(CLOUD_DARK, CLOUD_LIT, lit), alpha);
    }
  }

  // Sun: a Mie forward-scatter halo plus a small disc. The halo is what makes
  // the horizon glare read as real; the disc alone looks like a sticker.
  // Both are attenuated by cloud in front of them - a disc drawn over an opaque
  // cumulus is the loudest possible tell that the cloud is a decal.
  float cosA = dot(d, sunDir);
  float halo = pow(max(cosA, 0.0), 22.0);
  float disc = smoothstep(0.9992, 0.99975, cosA);
  col += SUN_TINT * (halo * 0.5 * (1.0 - alpha * 0.65) + disc * 30.0 * (1.0 - alpha));

  // Below the horizon the "sky" is what a downward reflection ray should see:
  // the far water, already hazed. Keeps grazing reflections from going black.
  col = mix(col, COAST_TINT * 0.65, smoothstep(0.0, -0.12, up));
  return col;
}

// The pre-weather sky, unchanged and bit-exact. craft.js calls this for the
// AMBIENT term on every piece of geometry and for its aerial perspective, and
// neither wants cloud in it: the ambient direction is built from a surface
// NORMAL, not a view ray, so a cloud field sampled through it would put noise
// on the pier per face rather than in the sky.
vec3 skyColor(vec3 d, vec3 sunDir) { return skyColorD(d, sunDir, 0.0, 0.0); }
`;

export const SKY_VERT = `#version 300 es
// Fullscreen triangle. No attributes, no buffer - gl_VertexID does the work.
//
// The ray is built from the camera basis rather than by inverting the
// view-projection matrix: fewer moving parts, and it cannot silently disagree
// with the water pass about which way the camera is pointing.
out vec3 vRay;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uTanHalfFov;
uniform float uAspect;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  gl_Position = vec4(p, 1.0, 1.0);
  vRay = uCamFwd
       + uCamRight * (p.x * uAspect * uTanHalfFov)
       + uCamUp    * (p.y * uTanHalfFov);
}
`;

export const SKY_FRAG = `#version 300 es
precision highp float;
in vec3 vRay;
out vec4 fragColor;
uniform vec3 uSunDir;
uniform float uExposure;
// 0 = the clear low-sun day this was built for, 1 = flat overcast. Bournemouth
// is overcast a great deal of the time and most of the reference footage is,
// so this is a real condition rather than a debug switch - and comparisons
// against a grey-day photograph are meaningless without it, because sun
// glitter alone puts a strong edge on most of the sea.
uniform float uOvercast;
${SKY_GLSL}
${TONEMAP()}
void main() {
  vec3 rd = normalize(vRay);
  // The angular width of one pixel, taken from the ray itself rather than from
  // the FOV and the viewport: it then stays correct at any resolution, any FOV
  // and any camera pitch, and it is the same argument waterFrag() already makes
  // for dFdx(vWorld.xz). skyColorD() band-limits the cloud field against it.
  float ang = length(dFdx(rd)) + length(dFdy(rd));
  // Cloud is killed by overcast rather than left to be greyed: an overcast sky
  // is a uniform bright source with no structure in it, and lumpy grey is a
  // worse answer than flat grey.
  vec3 c = skyColorD(rd, uSunDir, (1.0 - uOvercast) * ${dbg('nocloud')}, ang);
  // Overcast: collapse the blue gradient toward a flat luminous grey and kill
  // the sun disc and halo. An overcast sky is not "the same sky, darker" - it is
  // a uniform bright source with no direction in it at all, which is why a
  // clear-sky gradient with the exposure pulled down still reads as sunny.
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 grey = mix(vec3(lum), vec3(0.62, 0.635, 0.655), 0.72) * 1.02;
  c = mix(c, grey, uOvercast);
  // Dithered: the sky is this file's worst-quantised surface (83.9% identical
  // horizontal neighbours over a 430x85 clear-sky box, flat runs of 82 px).
  fragColor = vec4(dither8(encode(c * uExposure), gl_FragCoord.xy), 1.0);
}
`;

function TONEMAP() {
  return `
// ACES-ish filmic curve, then sRGB encode. Without a tonemap the sun glitter
// clips to flat white patches and the whole sea looks like plastic.
vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
vec3 encode(vec3 c) { return pow(aces(c), vec3(1.0 / 2.2)); }

// 8-BIT DITHER. A VERBATIM COPY of craft.js's DITHER_GLSL, NOT an import.
// ⚠️ craft.js reads SKY_GLSL out of this file inside a template literal at
// module-evaluation time. If this file imported back, whichever module is
// entered second would read a const still in its temporal dead zone: a blank
// screen, no error. This tree already duplicates aces()/encode() between the
// two files for exactly that reason. Keep the two copies identical by hand.
//
// It lives INSIDE TONEMAP() so both of this file's interpolation sites - the
// SKY_FRAG at the top and waterFrag() at the bottom - get it from one place.
// Those are the only two passes craft.js's own dither cannot reach: renderer.js
// draws sky -> water -> coast -> craft with blending off, so the first two are
// already in the framebuffer and quantised before craft.js gets a fragment.
//
// MEASURED on my own baseline renders (872x399, boxes as noted), horizontally
// byte-identical neighbours / longest flat run / distinct colours:
//     approach clear sky  430x85   83.9%   82 px   548
//     head     clear sky  400x65   79.5%   64 px   487
//     entrance sky        430x85   82.7%   81 px   485
//     approach open sea   500x95   16.0%   29 px  2877   <- already fine
//     (craft.js's DITHERED beach, for scale        15.4%)
// The sky gradient crosses ~85 px per output level, so a smooth analytic ramp
// lands 80+ px of one byte and the eye reads the step edges as banding arcs.
// The sea does not need this - wave normals and glitter already self-dither it
// to 16% - but the term is zero-mean at +-0.5 LSB, so applying it to both costs
// the water nothing measurable and keeps this to one function.
//
// q is already gamma-encoded and in 0..1; the caller writes the result straight
// to the framebuffer and lets the hardware clamp and round to 8 bits.
vec3 dither8(vec3 q, vec2 frag) {
  float b = fract(52.9829189 * fract(dot(frag, vec2(0.06711056, 0.00583715))));
  vec3 d = fract(b + vec3(0.0, 0.33333333, 0.66666667)) - 0.5;  // +-0.5 LSB
  return q + d * (1.0 / 255.0);
}
`;
}

// ---------------------------------------------------------------------------
// SHORE - where the sea meets the sand.
//
// Everything here answers one question per fragment: HOW DEEP IS IT? Surf is
// not a screen-space effect and it is not a distance-from-a-line effect - it is
// what water does when the bed comes up under it, and every feature below is
// driven off that one number so they cannot disagree with each other.
//
// ⚠️ The waterline position is NOT copied here. mhwOffset() is coast.js's own
// function, called at build time and baked into the GLSL as a resampled
// polyline. If the MHW table moves, the surf line moves with it. A second copy
// of those numbers would drift, and a surf line 5 m off the sand is worse than
// no surf line at all.
//
// The resample stride is 100 m and the MHW knots sit at 0/300/600/900/1200/
// 1500/1800/2100 - all multiples of 100 - so between those knots the source is
// already linear and this reproduces it EXACTLY. The single exception is the
// last knot at 2343 (Boscombe pier root), where the resample cuts a 0.9 m
// corner. That is 2.3 km from the judged cameras.
// ---------------------------------------------------------------------------
// The waterline table on its own. Split out of shoreChunk() by tmp-tr71 so the
// VERTEX stage can ask "how far offshore is this vertex" without dragging in the
// whole surf-foam block. Byte-identical content; shoreChunk() below still emits
// it, so there is one table and two callers.
function mhwChunk() {
  // Wider than the coast ribbon's own -300..2700 so the clamp never lands
  // inside anything the player can see.
  const X0 = -600, X1 = 2800, STEP = 100;
  const n = Math.round((X1 - X0) / STEP) + 1;
  const vals = [];
  for (let i = 0; i < n; i++) vals.push(mhwOffset(X0 + i * STEP).toFixed(2));

  return `
const int   MHW_N    = ${n};
const float MHW_X0   = ${X0.toFixed(1)};
const float MHW_STEP = ${STEP.toFixed(1)};
const float MHW_OFF[MHW_N] = float[MHW_N](${vals.join(', ')});
// World = coast - origin, so the whole table shifts with the sim origin rather
// than being re-authored in world space.
const float COAST_X0 = ${COAST.startX.toFixed(1)};
const float COAST_Z0 = ${COAST.startZ.toFixed(1)};

// How far seaward of the seawall the mean-high-water line sits, at this X.
float mhwAt(float worldX) {
  float t = clamp((worldX + COAST_X0 - MHW_X0) / MHW_STEP, 0.0, float(MHW_N - 1) - 0.001);
  int i = int(t);
  return mix(MHW_OFF[i], MHW_OFF[i + 1], t - float(i));
}
`;
}

function shoreChunk() {
  return mhwChunk() + `

// Still-water depth over the seabed, metres. Positive seaward of MHW.
//
// TWO LAWS, blended, because one power law cannot carry both ends and the two
// ends are anchored to different things.
//
// INSHORE - MEASURED. coast.js's beach ribbon puts the sand at y = 0.0 at the
// waterline and y = -0.90 exactly 14 m further out. Dean's equilibrium profile
// h = A * d^(2/3) - the standard form for a sandy shoreface - through that one
// point gives A = 0.90 / 14^(2/3) = 0.155. The foam has to break on the bed
// that the sand mesh actually draws, so this law is kept UNCHANGED wherever
// the sand is: the blend below has not started at 14 m and is 5% in at 25 m.
//
// OFFSHORE - the same law reached 6.31 m at the pier tip (260 m out) against
// the real 4-5 m this file already recorded, i.e. the shoreface was running
// about 40% too steep. h = 0.2792 * sqrt(d) puts 4.50 m at 260 m, and it
// happens to cross the inshore law at d = 34 m, so the two agree either side
// of the blend and the join carries no step (checked at 30 m: 1.494 against
// 1.529, and at 60 m: 2.375 against 2.163).
//
// INFERRED, still: this project has no bathymetry and neither law is surveyed.
// The change is that the profile is now wrong in the middle rather than wrong
// at the only end anybody quoted a real number for.
//
// What it buys the surf: the 3.0 m contour - the outer edge of the bed-return
// band below - moves from 85 m offshore to 115 m, and the depth-per-pixel at
// the shoreline drops by about a quarter, which is what the pixel-average
// integrations below are competing against.
//
// Landward of the waterline the ribbon's own ramp is used: it rises 3.0 m over
// the w metres from the waterline to the seawall.
float bedDepth(float d, float w) {
  if (d > 0.0) {
    float hIn  = 0.155 * pow(d, 0.66667);
    float hOff = 0.2792 * sqrt(d);
    return mix(hIn, hOff, smoothstep(18.0, 70.0, d));
  }
  return d * (3.0 / max(w, 1.0));
}

// Significant wave height, read out of the shared table rather than written
// down here. Hs = 4*sigma and sigma^2 = sum(a^2 / 2) for a sum of independent
// sinusoids, so this is exact for the model the physics uses.
//
// Reading it keeps the property the old crest-threshold test had and was right
// to want: the 'lively' and 'storm' presets widen the surf zone for free,
// because a bigger sea breaks in deeper water. Nothing is written back - SPEC
// section 3's one-table rule is intact.
//
// Tier 0 only: MEASURED off the modal table, the eight physics components carry
// Hs 0.499 of the total 0.500. The remaining 24 are ripple and do not break.
float seaHs() {
  float v = 0.0;
  for (int i = 0; i < SEA_N_PHYS; i++) v += wA[i].w * wA[i].w * 0.5;
  return 4.0 * sqrt(v);
}

// Green's law shoaling gain, referenced to 4 m and clamped. Recovers the height
// the wave WOULD have had if the shared table shoaled, for the break test only.
float greenGain(float h) {
  return pow(clamp(4.0 / max(h, 0.35), 1.0, 12.0), 0.25);
}

// THE FRACTION OF THE WAVE FIELD THAT IS BREAKING at this depth.
//
// Wave heights within a sea state are Rayleigh distributed about
// Hrms = Hs/sqrt(2); McCowan's index says an individual wave breaks once its
// height passes gamma*h, gamma = 0.78. The share above that threshold is the
// Rayleigh tail,
//     Qb = exp(-(0.78 h / Hrms)^2)
// which is the standard Battjes form with its transcendental root dropped - the
// root only bites once Qb approaches 1, where this is saturated anyway.
//
// ⚠️ This REPLACES a 5-tap sample of the instantaneous crest against a
// smoothstep(0.26, 0.46) threshold, and the replacement is not a refinement:
// the old test was MEASURED not to fire at any depth the far cameras can
// resolve. At the approach camera the first row of water below the sand sits in
// 1.34 m, where the tier-0 crest reaches 0.19 of the depth against a 0.26
// threshold - arithmetically zero in the one pixel that had to carry the line.
// The whole shore block moved 371 pixels out of 349,920 by at most 6 levels.
//
// MEASURED against the modal table (Hs 0.50): Qb is 0.001 at h 1.5 m, 0.09 at
// 1.0 m, 0.37 at 0.7 m and 0.88 at 0.3 m - an outer break 16 m offshore on this
// profile, saturating at 3 m. f657 is a bigger day and its broken water starts
// ~30 m out, which is what a bigger day should do and what this now does by
// itself, because Hs comes out of the table.
float breakFrac(float h, float hs) {
  float hrms = hs * 0.70711 * greenGain(h);
  float rat  = 0.78 * max(h, 0.04) / max(hrms, 0.02);
  return exp(-rat * rat);
}

// Long-wave crest elevation above still water, recomputed PER PIXEL.
//
// The vertex-interpolated vWorld.y cannot do this job. MEASURED off renderer.js
// (RINGS 72, R0 0.6, RMAX 1700, growth 1.1185): at the 260 m the judged
// approach camera stands off the waterline, one grid quad is 31 m radially and
// 13 m along its ring, while the peak period's wavelength is 26 m. Gating surf
// on that interpolant would have drawn the breaking line in ~30 m blocks -
// about 67 px wide at the approach camera's measured 0.45 m per pixel - which
// is a worse artefact than the missing surf it replaced.
//
// Tier 0 only: MEASURED off the modal table, the eight physics components carry
// Hs 0.499 of the total 0.500, i.e. all of it. The remaining 24 are ripple.
//
// Feeding the DISPLACED position in where the maths wants the undisplaced one
// costs a phase error of one Gerstner displacement, under 0.3 m against a 26 m
// wave. Irrelevant for a foam mask, and it saves inverting the displacement.
float seaCrest(vec2 p) {
  float e = 0.0;
  for (int i = 0; i < SEA_N_PHYS; i++) e += wA[i].w * cos(dot(wA[i].xy, p) + wB[i].x);
  return e;
}

// Pixel-AVERAGE of a band [lo, hi] in depth, given this pixel spans hf metres
// of depth. The exact box filter: how much of the pixel's depth interval falls
// inside the band.
//
// ⚠️ This is the whole reason the surf renders at all, and the reason it is
// worth a function of its own. MEASURED at the approach camera - eye 1.6 m,
// waterline 245 m off, 46 deg vertical over 405 rows, so 0.001982 rad/pixel:
//
//     offshore    range     screen row     rows from the waterline
//        0 m      245 m       236.80          +0.00
//       20 m      225 m       237.09          +0.29
//       50 m      195 m       237.65          +0.84
//
// The ENTIRE surf zone out to 50 m is 0.84 of one pixel tall, and the swash
// band alone (the last 5.8 m of water) is 0.08. A point-sampled mask on a
// feature that thin does not draw a thin line - it draws nothing, plus a
// scatter of pixels wherever a sample centre happens to land inside. MEASURED
// on the before render: toggling the whole shore block moved 116 pixels out of
// 350,000, in 7 rows, and only 18 of them by more than 4 levels.
//
// hf -> 0 recovers the hard band exactly, so the near field is untouched;
// hf >> (hi - lo) gives the band's SHARE of the pixel, which is the correct
// answer for a feature smaller than a sample and the one that turns a scatter
// into a continuous line.
float bandCov(float h, float hf, float lo, float hi) {
  float f = max(hf, 1e-4);
  return clamp((min(h + f * 0.5, hi) - max(h - f * 0.5, lo)) / f, 0.0, 1.0);
}
`;
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------
export function waterVert(seaChunk) {
  return `#version 300 es
precision highp float;

// (dx, dz) offset from the grid centre, in world metres. A polar grid: dense
// close in, coarse at the horizon, centred on the camera every frame.
in vec2 aOffset;

uniform mat4 uViewProj;
uniform vec2 uCenter;      // camera XZ, the grid origin
uniform float uTide;

out vec3 vWorld;
out vec3 vNormal;
out float vJac;
out float vDist;
// tmp-tr71: how much of the surf hump this vertex actually got. The fragment
// stage needs it so it can put back, per pixel, the slope the band limit below
// took off the mesh - see the note there.
out float vSurfFade;

${seaChunk}
${mhwChunk()}
${surfChunk()}

void main() {
  vec2 p0 = uCenter + aOffset;

  vec3 P; vec3 N; float jac;
  // Beyond a few hundred metres the wave height is well under a pixel, so the
  // displacement is faded out. This is what stops the horizon boiling.
  float far = smoothstep(220.0, 700.0, length(aOffset));
  seaSurface(p0, uTide, P, N, jac);
  P.y = mix(P.y, uTide, far);
  N = normalize(mix(N, vec3(0.0, 1.0, 0.0), far));

  // ---- THE SURF HUMP (tmp-tr71) ------------------------------------------
  // Added at the DISPLACED position, which is what the CPU sampler does: it
  // inverts the Gerstner displacement first and then asks the surf field for
  // the elevation at world (x, z). Feeding p0 in instead would put the crest up
  // to 0.3 m out of place against the physics the rider is actually on.
  //
  // BAND LIMIT, and it is not optional. renderer.js's polar grid (RINGS 72,
  // R0 0.6, growth 1.1185) has 11.9 m between rings at 100 m from the camera
  // and 29.9 m at 250 m, against a 27 m wavelength over the bank. Past about
  // 120 m the hump is under-sampled and would alias into a crawling moire. So
  // the DISPLACEMENT fades from 110 to 240 m of camera distance, and the
  // FRAGMENT stage keeps the full normal and the full foam at every range -
  // exactly the split the detail-normal band limit already uses, and the reason
  // the far judged views change in shading rather than in silhouette.
  //
  // Nothing the rider can see moves: the chase camera sits ~10 m off the board,
  // so the water under the craft is always at sFade = 1 and agrees with the
  // sampler the physics reads.
${shoreVertChunk()}
  float chi, hLoc, amp;
  vec4 S = surfTrain(P.xz, shoreD, chi, hLoc, amp);
  float sFade = 1.0 - smoothstep(110.0, 240.0, length(aOffset));
  P.y += S.x * sFade;
  vSurfFade = sFade;

  vWorld = P;
  vNormal = N;
  vJac = jac;
  vDist = length(aOffset);
  gl_Position = uViewProj * vec4(P, 1.0);
}
`;
}

export function waterFrag(seaChunk, shadowChunk) {
  return `#version 300 es
precision highp float;

in vec3 vWorld;
in vec3 vNormal;
in float vJac;
in float vDist;
in float vSurfFade;
out vec4 fragColor;

uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform float uExposure;
// Still-water level. Already a uniform of this program - the vertex stage
// declares and uses it, renderer.js already looks up and sets it - so this is
// the same one, redeclared for this stage, not a new thing to wire up. The surf
// needs it to turn a surface height into a DEPTH.
uniform float uTide;
// 0 = the clear low-sun day this was built for, 1 = flat overcast. Bournemouth
// is overcast a great deal of the time and most of the reference footage is,
// so this is a real condition rather than a debug switch - and comparisons
// against a grey-day photograph are meaningless without it, because sun
// glitter alone puts a strong edge on most of the sea.
uniform float uOvercast;

${seaChunk}
${SKY_GLSL}
${shoreChunk()}
${surfChunk()}
${shadowChunk}
${TONEMAP()}

// Poole Bay water body colour, RE-MEASURED 2026-08-03 from the sunny drone
// frame 0657 (tools/sample-ref.py). It is TEAL - blue-green - not the near-pure
// green this used to carry.
//
// The old note said "green survives depth, blue is scattered out by suspended
// sediment", and used it to justify rgb(10,48,35) deep and rgb(51,123,86)
// shallow. That reasoning is fine for a turbid estuary and wrong for Poole Bay
// on a clear day: the measurement says
//     mid water  #196F83 = (25, 111, 131)   blue channel HIGHEST
//     near shore #236C7B = (35, 108, 123)
// Blue leads green in every sample. The previous values were sourced from
// OVERCAST stills, where the sky puts a flat grey over everything and the
// residual is green; the owner's verdict on that whole pass was that it looked
// dull, and this is the largest single reason why.
//
// A drone looks steeply down, so Fresnel is near its 0.02 floor and reflection
// contributes little - which makes these frames unusually good for reading BODY
// colour rather than sky.
//
// Solved so the rest-state mix lands on the measured value: the shader blends
// DEEP->SHALLOW by clamp(lift*0.7 + sss*0.6), which sits near t=0.245 on flat
// water, so 0.755*DEEP + 0.245*SHALLOW should equal the measured mid-water.
const vec3 BODY_DEEP    = ${lin(14, 92, 114)};
const vec3 BODY_SHALLOW = ${lin(64, 150, 152)};
const vec3 FOAM         = ${lin(179, 182, 179)};

// SURF - the shoreline, and a SEPARATE set of numbers from FOAM above.
//
// FOAM is an offshore whitecap seen edge-on through a lot of air, and the note
// on it ("foam is grey ~170, never white") is right FOR THAT. Breaking surf at
// the beach is not the same material seen the same way, and it measures nowhere
// near 170. Two independent references agree:
//
//   f657, drone, swash band at the sand: p50 of the brightest 8% of the band
//     226,231,242, peak 253,253,255
//   bournemouth-beach/5659302427433328.jpg, sea level, sunny, breaking band:
//     p90 228,242,247, p99 243,255,255
//
// Blue is the highest channel in every one of those. Foam is a rough white
// dielectric taking its colour from the sky above it, so on a blue day it is a
// blue-white, not a neutral grey. ⚠️ STALE CLAIM REMOVED: this paragraph used
// to end "authoring in measured sRGB and reading it back through aces() costs
// about 3 levels (226 -> 223), which is inside the reference's own spread".
// The linTM() note above supersedes it - the crest constant lost 13, not 3, and
// the two collapsed together. It is also worth knowing that linTM() does NOT
// give the blue-white back: it restores the separation, not the hue. See the
// measured forward numbers on linTM().
//
// The breaking crest measures brighter and bluer than the swash sheet behind
// it - f657 rows 468-471 top-10 hit 240,253,255 while the swash sits at 226 -
// because it is aerated water lit from every side rather than a wet sheet. Two
// constants, both measured, rather than one averaged invention.
//
// Through linTM(), not lin(): see the note on it. Foam is the one thing in this
// shader that is an opaque surface laid over the finished colour, so a measured
// display value has to be un-tonemapped on the way in or it arrives 20 levels
// dark - which on water that is already at 214 is the whole feature.
const vec3 SURF       = ${linTM(226, 231, 242)};
const vec3 SURF_BREAK = ${linTM(240, 251, 255)};

// Water over a sand bed, MEASURED f657 rows 500-505 (the last clean water
// before the swash foam): p50 62,107,118 against the same frame's open water at
// 33,107,121. The bed return is almost purely RED - green and blue are already
// gone by 1 m, and what comes back up is the sand. That asymmetry is the reason
// this is a measured colour and not "the shallow colour, brighter".
const vec3 BODY_SHOAL = ${lin(62, 107, 118)};

// Unpolarised Fresnel reflectance of an air-water interface, n = 1.333, exact
// (not Schlick). Used ONLY by the far-water rough lobe in main(); see there.
float fresnelWater(float c) {
  c = clamp(c, 0.0, 1.0);
  float g = sqrt(0.7769 + c * c);            // sqrt(n^2 - sin^2), n^2 = 1.7769
  float rs = (c - g) / (c + g);
  float rp = (1.7769 * c - g) / (1.7769 * c + g);
  return 0.5 * (rs * rs + rp * rp);
}

// OVERCAST FOR EVERYTHING THE WATER REFLECTS. 2026-09-16, tmp-tr17. SKY_FRAG
// greys its colour under uOvercast; the water's three sky lookups (smooth
// reflection, rough lobe, distance haze) did not, so ?overcast=1 drew a grey
// sky over the clear-day blue sea. MEASURED, approach far strip (tmp-tr17/sea17.py):
// R/G 0.754, B/G 1.174 on BOTH the sunny and the overcast render, against the
// owner's overcast clip G:/DJI/DJI_20250112144045_0004_D.MP4 at R/G 0.92-1.00,
// B/G 1.04-1.06. Same formula as SKY_FRAG, applied per sky sample because it is
// affine (the grey has a constant part), not linear. uOvercast = 0 returns c.
vec3 ocSky(vec3 c) {
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 grey = mix(vec3(lum), vec3(0.62, 0.635, 0.655), 0.72) * 1.02;
  return mix(c, grey, uOvercast * ${dbg('nooc')});
}

// SOFT-EDGED CLOUDS FOR THE FAR-WATER LOBE. 2026-09-16, tmp-tr24 (sea polish, item 3).
// The rough lobe below sums 6 quadrature nodes, each a pixel-footprint sky sample,
// so a reflected cloud arrived as up to 6 sharp copies = hard-edged pale patches.
// Widening each node's FOOTPRINT to the node spacing removed the clouds outright:
// the footprint band-limits skyFbm() toward its mean 0.5, which is below CLOUD_TH.
// What the lobe actually integrates is partial COVERAGE of each node's cell, so
// this copy of skyColorD() widens the coverage EDGE instead (th -/+ soft about the
// same contour) and leaves the fbm and its footprint alone. Only the lobe calls
// it; the sky pass and the smooth reflection keep skyColorD() bit for bit.
// Ablation: ?wdbg=nocloudsoft (the lobe calls skyColorD() again); tuning ?wnum=cs:.
vec3 skyColorLobe(vec3 d, vec3 sunDir, float detail, float ang, float soft) {
  d = normalize(d);
  float up = clamp(d.y, -1.0, 1.0);
  float t = pow(1.0 - clamp(abs(up), 0.0, 1.0), 3.5);
  vec3 col = mix(SKY_ZENITH, SKY_HORIZON, t);
  float alpha = 0.0;
  if (detail > 0.0) {
    float dy   = max(up, 0.0125);
    float rng  = CLOUD_TOP_M / dy;
    vec2  q    = d.xz * (rng / CLOUD_SIZE_M);
    float foot = ang * (rng / CLOUD_SIZE_M) * inversesqrt(dy);
    float rm = CLOUD_MID_M  / CLOUD_TOP_M;
    float rb = CLOUD_BASE_M / CLOUD_TOP_M;
    float gap = length(q) * (1.0 - rm);
    float res = 1.0 - smoothstep(0.85, 1.75, gap);
    float haze = 1.0 - smoothstep(8000.0, 40000.0, rng);
    if (res * haze > 0.002) {
      float th = skyClumpTh(q * rm, foot * rm);
      float sT = smoothstep(th - soft, th + CLOUD_SOFT + soft, skyFbm(q,      foot));
      float sM = smoothstep(th - soft, th + CLOUD_SOFT + soft, skyFbm(q * rm, foot * rm));
      float sB = smoothstep(th - soft, th + CLOUD_SOFT + soft, skyFbm(q * rb, foot * rb));
      alpha = max(sT, max(sM, sB)) * res * haze * detail;
      float lit = (sT + sM * 0.75 + sB * 0.30) / max(sT + sM + sB, 1e-3);
      col = mix(col, mix(CLOUD_DARK, CLOUD_LIT, lit), alpha);
    }
  }
  float cosA = dot(d, sunDir);
  float halo = pow(max(cosA, 0.0), 22.0);
  float disc = smoothstep(0.9992, 0.99975, cosA);
  col += SUN_TINT * (halo * 0.5 * (1.0 - alpha * 0.65) + disc * 30.0 * (1.0 - alpha));
  col = mix(col, COAST_TINT * 0.65, smoothstep(0.0, -0.12, up));
  return col;
}

void main() {
  vec3 V = normalize(uCamPos - vWorld);

  // ------------------------------------------------------------------------
  // BAND LIMIT. This is the fix for "the sea carries far too much
  // high-frequency detail", 2026-08-19, and it is worth being exact about why,
  // because the previous version was not wrong so much as measuring the wrong
  // thing.
  //
  // The detail normal is the tier-2 band of the shared wave table: MEASURED out
  // of sea-state.js, its 16 components run lambda 0.877 m down to 0.300 m, so
  // Nyquist wants a sample footprint of 0.44 m at the long end and 0.15 m at
  // the short end.
  //
  // The old fade was 1 - smoothstep(20, 160, vDist). Distance is the wrong
  // variable. What decides whether a ripple can be drawn is how much SEA one
  // pixel covers, and at a grazing view that grows as d^2/eyeHeight, not as d.
  // Measured at the calibration camera (1.6 m eye, 40 deg over 405 rows):
  //
  //      10 m -> 0.11 m per pixel      within Nyquist
  //      20 m -> 0.43 m                already at the long end's Nyquist
  //      40 m -> 1.72 m                3.4x the median ripple
  //     160 m -> 27.6 m               55x the median ripple  <- fade ENDED here
  //
  // So the old fade was still holding a 0.5 m ripple field at 26% strength out
  // at 113 m, where one pixel already averaged 13.8 m of sea, and only reached
  // zero at 160 m and 27.6 m per pixel. (Solved, not eyeballed: 1 - smoothstep
  // hits 0.26 at t = 0.665 of the 20..160 ramp. An earlier draft of this note
  // paired the 26% with the 27.6 m - two different distances - which was
  // wrong; the argument is the same either way, the numbers were not.) That is
  // not detail, it is a hash of the wave phase - and a hash of a moving phase
  // is precisely the stipple that reads as "computer graphics". Ablation
  // confirmed it: suppressing this one term removed 59-85% of the
  // luminance-gradient energy in every distance band, while suppressing foam
  // moved 4 pixels and suppressing sun glitter moved none at all outside the
  // sun's own track.
  //
  // VERIFIED 2026-08-19 by a second, independent measurement the ablation does
  // not make: nudge the calibration camera 0.1 m and diff the two frames. That
  // is the crawl, held still. Mean per-pixel change, old -> new:
  //     70-250 m   9.1 -> 3.9      -57%
  //      25-70 m  19.1 -> 6.1      -68%
  //      14-25 m  23.9 -> 13.6     -43%
  //       8-14 m  27.6 -> 26.9      -3%
  //        < 8 m  25.2 -> 25.2       0%   bit-identical
  // The instability is removed exactly where it could not have been drawn, and
  // the water the rider is actually looking at is untouched.
  //
  // dFdx/dFdy of the world position IS the footprint, exactly, for free, and it
  // stays correct at any resolution, any FOV and any camera pitch - which no
  // hand-tuned distance constant can. max() rather than the geometric mean:
  // aliasing is decided by the worst axis, and at a grazing view that is
  // overwhelmingly the vertical one.
  //
  // NOT a flatten. Inside ~12 m the footprint is under 0.15 m and the detail
  // band survives at full strength, so the water immediately around the rider
  // keeps every ripple it had. What goes is only what could never have been
  // drawn.
  // ------------------------------------------------------------------------
  // 0.15 is the short end's Nyquist exactly. 0.50 is the long end's 0.44
  // rounded UP, not a measured limit: the fade has to finish a little past the
  // last representable wavelength or the longest component in the band dies
  // while it is still worth drawing. Everything between 0.15 and 0.44 is a
  // compromise anyway - one fade stands in for sixteen per-component ones.
  float foot = max(length(dFdx(vWorld.xz)), length(dFdy(vWorld.xz)));
  // ⚠️ 2026-09-16, tmp-tr17: "exactly" above is true per TRIANGLE only. vWorld
  // is affine across each displaced triangle, so its derivatives are constant
  // on it and jump at every edge; in the 0.15-0.50 m window that stepped
  // detailFade triangle by triangle, and with the far-water lobe keyed on
  // 1 - detailFade the steps became the verifier's straight-edged pale wedges
  // (approach rows ~264-300). The fade now keys on the footprint of the pixel
  // RAY on the still-water plane: the ray is smooth across triangle edges, so
  // this is too. It ignores wave tilt, which the soft 0.15-0.50 ramp absorbs.
  // foot itself is unchanged (nearFace below still reads it).
  vec3  rayW  = -V;
  vec3  flatP = uCamPos + rayW * (max(uCamPos.y - uTide, 0.05) / max(-rayW.y, 1e-4));
  float footS = max(length(dFdx(flatP.xz)), length(dFdy(flatP.xz)));
  // FADE FRONT, SOFTENED. 2026-09-16, tmp-tr24 (sea polish item 2). footS above is
  // a function of the screen ROW alone, and SwiftShader's dFdx/dFdy are per 2x2
  // quad, so the fix above left the 0.15-0.50 ramp - and the lobe's brightness step
  // inside it - as a straight staircase of 2-row blocks (approach: L 133 -> 178 in
  // six ~10-level steps, rows 274-285, the same row in every column). Two changes,
  // neither reads a triangle derivative, so the wedges cannot come back:
  //  (a) footA: the same flat-plane footprint written analytically per pixel,
  //      range x pixel angle / sin(grazing) - smooth down the column, no 2x2 steps.
  //      Only the pixel ANGLE is differenced, and it is the same for every pixel.
  //  (b) a smooth two-octave world-space noise on the same flat-plane point scales
  //      it by exp(fa n), n in [-1, 1] and zero-mean: the front wanders by rows
  //      from column to column around its old mean row, like patches of wind.
  // It keys detailFade AND the far-chroma haze below, so their fronts stay together.
  // ⚠️ OPT-IN since 2026-09-16 (owner): it moves the b50 band (approach R/G 0.814 ->
  // 0.825) and the owner keeps b50 on photo 763's calibration. Enable with
  // ?wdbg=frontsoft (then ?wdbg=nofrontnoise gives (a) only); tuning ?wnum=fa:,fs:.
  ${!WDBG.includes('frontsoft') ? '' : [
    'float pixAng = max(length(dFdx(rayW)), length(dFdy(rayW)));',
    'float footA  = length(flatP - uCamPos) * pixAng / max(-rayW.y, 1e-4);',
    'vec2  frontQ = flatP.xz / ' + num('fs', 3.0) + ';',
    'float frontN = (skyNoise(frontQ) * 0.62 + skyNoise(frontQ * 2.37 + vec2(17.3, 5.1)) * 0.38) * 2.0 - 1.0;',
    'footS = mix(footS, footA * exp(' + num('fa', 0.40) + ' * ' + dbg('nofrontnoise') + ' * frontN), smoothstep(0.27, 0.36, footS));'].join('\n  ')}
  // ⚠️ The smoothstep(0.27, 0.36) guard is load-bearing: the ENTRANCE camera's
  // near-sea band (measure.py rows 332+) starts at a footprint of ~0.23 m, inside the
  // 0.15-0.50 ramp. Unguarded (exp(fa n) reaching 0.15 / 1.49) it moved entrance
  // near-sea L p90 162.0 -> 161.7; below 0.27 m footS is now the old value exactly.
  float footD = mix(foot, footS, ${dbg('nofootfix')});
  // FADE FRONT WANDER, ONE-SIDED AND BAND-LIMITED. 2026-09-17, tmp-tr35. The front
  // above is still a straight row (footS is a function of the row). tmp-tr24's
  // frontsoft broke it but moved the b50 band the owner keeps on photo 763. This
  // version can only move the front UP (toward the horizon) and only inside a
  // footprint band, so rows outside it keep the old footD bit for bit:
  //  - below f0 (0.41 m; approach rows >= 282 = hz+50, the b50 band) footDW == footD;
  //  - above it the footprint is compressed toward f0 by k = exp(-wa u) <= 1, u a
  //    two-octave world-space noise on the flat-plane point (cells ws 2.0 m) through
  //    smoothstep(w0, w1): patches of u = 0 keep the old front, u = 1 lifts it;
  //  - k recovers to 1 over footS f1..f2 (0.60-0.72 m) so the lift is bounded and
  //    far water keeps its look. Compress-then-recover is monotone in footS for any
  //    k > 0 (derivative >= k), so it cannot fold into a dark line.
  // Approach, measured (tmp-tr35/RESULT.md): pixels change in rows 267-282 only;
  // b50 box (rows 282-331, cols 20-120) 0 px changed even with u forced to 1
  // everywhere (worst case); far/b20/b50 medians identical to the third decimal.
  // Only detailFade reads footDW; the far-chroma haze window keeps footD.
  // DEFAULT since 2026-09-17 (owner); ?wdbg=nofrontwander compiles it out and renders are
  // bit-identical to the pre-change tree. Tuning ?wnum=wa:,ws:,w0:,w1:,f0:,f1:,f2:.
  // It moves measure.py approach_seamid (rows 270-300 hold the front itself): p50 R
  // 137 -> 139, so that gate was re-baselined when the owner made this the default
  // (proof in measure.py). wa 1.9 / ws 3 / f1-f2 0.50-0.64 lifts R by only ~1 but is subtler.
  ${WDBG.includes('nofrontwander') ? '' : [
    'vec2  wandQ = flatP.xz / ' + num('ws', 2.0) + ';',
    'float wandN = skyNoise(wandQ) * 0.62 + skyNoise(wandQ * 2.37 + vec2(17.3, 5.1)) * 0.38;',
    'float wandK = exp(-' + num('wa', 2.5) + ' * smoothstep(' + num('w0', 0.30) + ', ' + num('w1', 0.60) + ', wandN));',
    'float wandF = ' + num('f0', 0.41) + ';',
    'wandK = mix(wandK, 1.0, smoothstep(' + num('f1', 0.60) + ', ' + num('f2', 0.72) + ', footS));',
    'float footDW = mix(foot, footS > wandF ? wandF + (footS - wandF) * wandK : footS, ' + dbg('nofootfix') + ');'].join('\n  ')}
  float detailFade = (1.0 - smoothstep(0.15, 0.50, ${WDBG.includes('nofrontwander') ? 'footD' : 'footDW'})) * ${dbg('nodetail')};
  // ⚠️ THE FAINT REPEATING TILE IN THE NEAR WATER IS IN THE SHARED WAVE TABLE,
  // NOT IN THIS FILE. Diagnosed 2026-08-20, NOT fixed, and the reason it was
  // not fixed here is that there is nothing here to fix.
  //
  // On-screen, high-passed (31 px boxcar) horizontal autocorrelation of the
  // bottom 25% of frame, local maxima above the perspective ramp:
  //     entrance   lag  21 px  r +0.10      ref763 same measure: lag 26  r +0.03
  //     approach   lag  40 px  r +0.11
  //     alongneck  lag  25/38  r +0.07/0.06
  //     head       lag  46 px  r +0.17
  // Three things pin it to the table:
  //   1. ?wdbg=nodetail, which suppresses seaDetailNormal() outright, REMOVES
  //      the peak: approach r 0.11 -> 0.01, entrance 0.10 -> 0.01.
  //      ?wdbg=noglitter changes it by nothing at all, so it is not the sun.
  //   2. Ray-cast back to the water plane, those lags are 0.53 m (approach),
  //      0.67 m (entrance) and 0.46-0.70 m (along-neck) of WORLD at mid-band -
  //      inside the tier-2 components' own 0.310-0.849 m.
  //   3. The table's tier-2 slope field, evaluated along a straight line in
  //      plain JS with no renderer involved, autocorrelates at r 0.47-0.54,
  //      with a 0.62 m peak along both +Z and the wave-travel direction.
  //
  // WHY the table is quasi-periodic, read off buildWaveTable()'s own output for
  // the modal preset: components 8..31 all carry amp*k = 0.01471-0.01474 -
  // IDENTICAL slope amplitude to four decimals - on a geometric wavelength
  // ladder 1.451 m -> 0.310 m. Tier 0, by contrast, spreads amp*k 0.0146-0.0460.
  // (⚠️ that upper bound read 0.0386 until 2026-08-21 and was wrong: 0.0386 is
  // component 7's value, and the scan that produced it missed component 4 - the
  // MODAL PEAK at lambda 10.54 m - which carries 0.04596, the largest in the
  // table. Re-measured off buildWaveTable()'s output for 'poole-bay-modal'.
  // The error understated the contrast this paragraph is drawing, so the
  // argument is unaffected; the number was still wrong.)
  // Twenty-four equal-amplitude sinusoids is a COMB, not a spectrum: no
  // component dominates, so the partial sums come back into phase at a visible
  // scale. That is the tile.
  //
  // The head camera's lag-46 peak is a DIFFERENT defect: nodetail makes it
  // STRONGER (0.17 -> 0.22) and it maps to 1.56 m of world, above the tier-2
  // band. That one is in tier 0/1 - the displaced, physics-carrying components.
  //
  // ⚠️ DO NOT FIX IT FROM HERE. The amplitudes live in src/sea-state.js and are
  // shared with the physics through the one wave table, so touching them moves
  // the sim and breaks the e64c737b replay hash. It is also mild - r 0.10-0.17
  // against a photograph's 0.03 - and STATUS.md ranks it low on purpose.
  vec3 dN = seaDetailNormal(vWorld.xz);
  vec3 N = normalize(mix(vNormal, normalize(vNormal + vec3(dN.x, 0.0, dN.z) * mix(1.4, 0.55, uOvercast)), detailFade));

  // ------------------------------------------------------------------------
  // THE SURF TRAIN (tmp-tr71). Evaluated here rather than down in the shore
  // block because its SLOPE belongs in the normal, and the normal is used by
  // the Fresnel, the reflection ray and the glitter, all of which are above the
  // shore block.
  //
  // ⚠️ The slope is put in PER PIXEL and at FULL strength at every range, while
  // the vertex stage's hump faded out past 110 m (see waterVert). That is
  // deliberate and it is the only way the surf reads at the along-neck and
  // entrance cameras: the mesh cannot carry a 27 m wave at 30 m between rings,
  // but a per-pixel normal carries it at any range, and the existing footprint
  // machinery band-limits it the same way it band-limits the detail normal.
  //
  // vSurfFade tells this stage how much of the hump the mesh already got, so
  // the two do not double-count the part the vertices already tilted.
${shoreFragChunk()}
  // The pixel's own world footprint, taken HERE in uniform control flow. Two
  // band limits below need it and one of them sits inside the h < 6 branch: a
  // derivative is undefined wherever a branch diverges across a quad, which is
  // exactly the seaward edge of the surf zone.
  float surfPx = max(length(dFdx(vWorld.xz)), length(dFdy(vWorld.xz)));
  float surfChi, surfH, surfAmp;
  vec4 ST = surfTrain(vWorld.xz, shoreD, surfChi, surfH, surfAmp);
  ST *= ${dbg('nosurftrain')};
  {
// >>> SHORE
${shoreGradChunk()}
// <<< SHORE
    // The mesh already tilted by the part of the hump it received; adding the
    // whole gradient again on top of that would double the slope in the near
    // field. vNormal carries vSurfFade of it, so only the rest goes in here,
    // plus a band limit on the pixel's own footprint.
    float bl = 1.0 - smoothstep(4.0, 16.0, surfPx);
    vec3 sn = normalize(vec3(-g.x, 1.0, -g.y));
    N = normalize(N + vec3(sn.x, 0.0, sn.z) * bl);
  }

  float NdotV = max(dot(N, V), 0.0);

  // Schlick, F0 = 0.02 for water. THIS is the near-to-far colour ramp.
  float F = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);

  vec3 R = reflect(-V, N);
  R.y = max(R.y, 0.005);                  // never sample straight down
  // ⚠️ THE REFLECTION HAS TO SEE THE SAME WEATHER THE SKY DOES, or the sea stops
  // matching the sky it is reflecting. Same function, same field.
  //
  // The angular spread of the reflected ray across one pixel is dFdx/dFdy of R
  // itself, which already carries the wave normals' own scatter - so choppy
  // water band-limits the cloud field automatically, and where the chop is
  // finer than a pixel the field falls back to its mean, which is below
  // CLOUD_TH, which returns the pre-weather sky bit for bit. That is not a
  // convenience: it is what lets the settled mid-distance sea be proved
  // untouched rather than asserted to be.
  float angR = length(dFdx(R)) + length(dFdy(R));
  vec3 refl = ocSky(skyColorD(R, uSunDir, (1.0 - uOvercast) * ${dbg('nocloud')}, angR));

  // ------------------------------------------------------------------------
  // THE SURF ZONE. One depth, three features. STATUS.md item 7: "the waterline
  // meets the sand as a hard clean edge" - MEASURED in the before render, the
  // shoreward camera went from sand 165,156,133 to water 208,219,221 in a
  // SINGLE row, with one transitional pixel. That single row is the whole
  // difference between a surf beach and a boating lake.
  //
  // ⚠️ Everything here is gated on h < 6 m of water, and the settled sea colour
  // must not move. What that gate is worth, stated exactly rather than
  // optimistically - the previous version of this note claimed the block could
  // not reach any judged camera, and after the bed profile was corrected and
  // the bed-return band widened to 3.0 m that stopped being true:
  //
  //   - the deepest term (bed return) is zero past h 3.0 m, which this profile
  //     puts 115 m off the waterline. Foam is zero past h 1.5 m, i.e. 30 m.
  //   - the along-neck camera stands 101 m off the waterline and the entrance
  //     camera 118 m, so BOTH now see the bed-return band in their foreground,
  //     and they should: that water is 2-3 m deep over sand and is not open sea.
  //   - the approach camera stands 256 m off, in 4.5 m, where every term here is
  //     already zero. MEASURED: 11 rows move, all of them at the shoreline.
  //   - the open-water camera at 855 m never enters the gate at all. MEASURED
  //     with ?wdbg=nosurf: ZERO pixels differ by more than 1 level, so the
  //     settled sea is proved untouched rather than asserted to be.
  //
  // The whole block is also why this is depth-driven rather than a band drawn
  // at a fixed distance off the waterline: MHW swings from 38 m at the pier to
  // 70 m at 1500, the beach is not a straight line, and a fixed band would
  // uncouple from the sand the moment either changed.
  // ------------------------------------------------------------------------
  // shoreW / shoreD are computed above, with the surf train.
  //
  // THE BED NOW CARRIES THE TWO BANKS. Outside them surfZoneBed() is zero and
  // this is the unchanged shoreface law, so every judged pixel away from the
  // pier sits over exactly the seabed it always did - which is what makes the
  // "only the two banks moved" claim checkable by ablation.
  //
  // ⚠️ step(0.0001, uSurfCtl) is what makes ?surf=0 a REAL ablation. Without it
  // the bank stayed in the bed with the waves switched off, so "surf off"
  // restored 4 of the 19 judged views instead of all 19 and there was no clean
  // before to compare against. MEASURED, tmp-tr71/v_abl.
  float hBank = (shoreD > 0.0 ? surfBarDelta(shoreD) * surfZoneBed(surfOffset(vWorld.xz)) : 0.0)
              * ${dbg('nosurftrain')} * step(0.0001, uSurfCtl);
  float h = bedDepth(shoreD, shoreW) + hBank;
  h = max(h, shoreD > 0.0 ? 0.02 : h);
  // The BED-RETURN band takes the bank at 0.55, and that is a rendering decision
  // with a reason rather than a fudge. shoal's 3.0 m scale was calibrated on the
  // natural profile, where h < 3 m only happens within 115 m of the sand; the
  // bank puts h ~ 1.3 m out at 130 m, so at full weight the whole bank rendered
  // as shoreline - a pale wash 140 m wide (tmp-tr71/ev/sheet_judged_1.png,
  // S_entrance AFTER). Half weight keeps the bank's colour signature, which the
  // owner's drone frames do show, without painting it as swash.
  float hShoal = bedDepth(shoreD, shoreW) + hBank * 0.55;

  // The pixel's footprint, in the two units the surf zone is measured in:
  // hFoot is how much DEPTH one pixel spans, stride is how much cross-shore
  // WORLD it spans. Both are taken HERE, in uniform control flow, and not
  // inside the h < 6.0 branch below: a derivative is undefined wherever the
  // branch diverges across a quad, which is precisely the seaward edge of the
  // surf zone - the pixels that decide whether there is a line at all.
  //
  // MEASURED at the approach camera by rendering these two values out as
  // colour: at the first row of water below the sand, hFoot is 1.32 m and
  // stride is 39.2 m; one row further seaward, 0.61 m and 22.4 m. Against a
  // swash band 0.5 m deep and a 26 m peak wavelength, one pixel there covers
  // the whole of the surf zone and better than a wave.
  //
  // The same render gives the blunt version of it. Reading depth down the
  // column, the rows go: SAND, then 1.34 m, then 2.47 m, then 3.11 m. The
  // shoreline gets ONE row of water, and everything between the sand and 1.34 m
  // of depth - the swash, the break, the whole of the inner surf - falls inside
  // the beach's own pixel and is lost to it. That is a rasterisation limit at
  // 39 m per pixel, not something this shader can reach.
  float hFoot  = fwidth(h);
  vec2  stride = dFdy(vWorld.xz);

  float surf = 0.0;      // foam coverage, 0..1
  float breaking = 0.0;  // how much of that is an actively breaking crest
  float shoal = 0.0;     // bed return through shallow water
  if (h < 6.0) {
    // Geometric depth for the water's EDGE uses the drawn surface, so the foam
    // sits exactly where the water actually meets the sand rather than a few
    // centimetres off it. Per-pixel crest is for the phase term only - see
    // seaCrest() for why the two elevations are deliberately different.
    float hw   = h + (vWorld.y - uTide);
    float etaP = seaCrest(vWorld.xz);
    // ⚠️ FEEDING THE SURF TRAIN'S HEIGHT INTO THIS Hs WAS TRIED (tmp-tr71) AND
    // REVERTED, and the reason is worth keeping because it is not obvious.
    // Adding the two fields in quadrature - sqrt(seaHs^2 + (2*amp)^2) - is the
    // correct way to combine two independent wave fields, and it took Hs over
    // the banks from 0.50 m to 1.2 m. But the Rayleigh tail is SATURATING: at
    // Hs 1.2 the broken share passes 0.9 everywhere shallower than 1.5 m, so the
    // whole 100 m surf zone rendered as one flat white wash with no structure
    // in it at all (tmp-tr71/ev/sheet_e_ba.png, "eye 12 m AFTER"). The train's
    // own roller below already carries the surf foam AND has the phase
    // structure - the bright bands with green water between them that the
    // reference actually shows - so this stays on the background spectrum it
    // was written for, and the train is added alongside rather than folded in.
    float hs   = seaHs();

    // BREAKING FRACTION, PIXEL-AVERAGED IN DEPTH. See breakFrac() for the
    // Rayleigh tail itself; this is the integration, and it is not optional.
    //
    // Qb is strongly convex in h - it runs 0.001 / 0.09 / 0.37 / 0.89 across
    // 1.5 / 1.0 / 0.7 / 0.3 m - so evaluating it at the pixel CENTRE is not an
    // approximation of the pixel's average, it is a different number by an
    // order of magnitude. MEASURED at the approach camera: the shoreline pixel
    // is centred on h 1.34 m where Qb is 0.006, while the pixel spans 0.67 to
    // 2.01 m, over which Qb's TRUE box average is 0.064 - ten times more foam,
    // and all of it from the shallow half the centre sample never sees.
    //
    // 5 taps across the footprint, clamped to the wet side so the shoreline
    // pixel is not asked for the depth of dry sand. Near field: hFoot is tiny,
    // all five taps land on the same depth and the result is the point value,
    // so the rider's own water is unchanged.
    //
    // ⚠️ THE 5 TAPS ARE A BIASED ESTIMATOR OF THAT AVERAGE, and the bias is
    // stated here rather than hidden because an earlier version of this note
    // quoted the estimator's answer as if it were the integral. The taps sit at
    // +/-0.5, +/-0.25 and 0 of the footprint and are weighted equally, i.e. the
    // closed Newton-Cotes NODES with the box rule's WEIGHTS - which counts each
    // endpoint five times more than a box filter should. Qb is dominated by the
    // shallow endpoint (at the pixel above, tap 0 alone is 0.408 of the 0.499
    // sum), so the error is all one way. MEASURED at that pixel, hs 0.4993:
    //     these 5 taps, uniform weights   0.0998    <- what this code returns
    //     the same 5 nodes, trapezoid     0.0737
    //     5-point MIDPOINT rule           0.0609
    //     true box average (200k samples) 0.0640
    // So this runs 1.56x high in the far field, and exactly right in the near
    // field where the taps converge. It is LEFT ALONE deliberately: the whole
    // shore block is already at or under the visibility floor at the two far
    // judged cameras (see the note above the block), so correcting it downward
    // would only make an invisible feature more invisible, and the rendered
    // frames in this file's history were judged with this estimator in place.
    // If the surf is ever revisited, offsets of (float(t) - 2.0) * 0.2 make
    // these the midpoints of five equal sub-intervals and land on 0.0609.
    float qb = 0.0;
    for (int t = 0; t < 5; t++) {
      qb += breakFrac(max(h + hFoot * (float(t) - 2.0) * 0.25, 0.04), hs);
    }
    qb *= 0.2;

    // WHERE IN THE WAVE the foam is, at this instant. Qb says how much of the
    // field is breaking; the crest phase says whether this patch is under one.
    // That is what makes the line travel and gives it along-shore structure
    // instead of a smooth ramp.
    //
    // Faded to its mean once one pixel spans more than a wavelength, for the
    // same reason the swash and the bed return are: an instantaneous criterion
    // sampled once per 26 m wave returns whichever phase the sample centre
    // landed on, and a surf line that latches on and off along the shore is a
    // worse artefact than the smooth one. 6 -> 26 m of stride is the peak
    // wavelength either side, MEASURED off the modal table.
    float phase = smoothstep(-0.20, 0.30, etaP * greenGain(hw) / max(hw, 0.15));
    float trav  = mix(phase, 0.5, smoothstep(6.0, 26.0, length(stride)));

    // Swash. The last half metre of water is white whatever the wave is doing -
    // this is the run-up sheet.
    //
    // Two forms of the same band, chosen on the footprint. Under 0.44 m of
    // depth per pixel the original soft edge is used UNCHANGED, so nothing the
    // rider can see moves. Past 1.2 m the band is smaller than a sample and the
    // box average takes over - see bandCov(). The box runs 0 to 0.28 because
    // 0.28 is the area under the soft version (0.06 of solid band plus half of
    // the 0.44 ramp), so the two carry the same amount of foam and the crossover
    // does not pop.
    float swSoft = 1.0 - smoothstep(0.06, 0.50, hw);
    float swCov  = bandCov(hw, hFoot, 0.0, 0.28);
    float sw = mix(swSoft, swCov, smoothstep(0.44, 1.2, hFoot));

    // THE INNER SURF IS A SHEET, NOT A LINE. Whitewater that a wave has made
    // does not un-break: it runs on shoreward and thins out, so everything
    // between the outer break and the sand carries residual foam whatever the
    // local phase is doing. f657 shows exactly that and it is the single most
    // recognisable thing in the frame - a continuous pale edge along the sand,
    // with the broken streaks OUTSIDE it rather than the other way round.
    //
    // Anchored on the same Qb as the crests so the two cannot disagree: what
    // has broken by this depth is still foam at this depth. The 0.55 floor is
    // INFERRED - it is the share of the sheet that survives between crests, and
    // nothing in the reference resolves an individual sheet's decay.
    float sheet = qb * mix(0.55, 1.0, trav);

    // The dry-beach cut is widened to the footprint for the same reason as
    // everything else here: at 260 m one pixel spans 1.3 m of depth, so a cut
    // 0.08 m wide either takes the whole row or none of it.
    float dry = smoothstep(-0.03, max(0.05, hFoot * 0.5), hw);

    // THE ROLLER. ST.w is whitewater born at a breaking crest and trailing
    // SEAWARD of it (the wave runs on shoreward and leaves the foam behind),
    // fading over about 1.2 rad of phase, plus the residual sheet that
    // everything inside the break carries. It is a DIFFERENT quantity from the
    // Rayleigh sheet above: that one says how much of the whole field has broken
    // by this depth, this one says where the crest that is breaking right now
    // actually is. Both are needed - the first draws the band, the second draws
    // the moving line inside it.
    //
    // Band-limited on the pixel's cross-shore footprint for the reason
    // everything else in this block is: one pixel at the approach camera spans
    // more than a wavelength, and an instantaneous phase sampled once per wave
    // latches on and off along the shore. Past 26 m of stride the roller falls
    // back to its own mean, which is the sheet it already contributed.
    float rollBL = 1.0 - smoothstep(8.0, 30.0, length(stride));
    // 0.78: MEASURED down from 1.0. At full weight the bank rendered as a solid
    // white ellipse (tmp-tr71/ev/f_12m_after.png at the 12 m camera) because the
    // amplitude is CLIPPED to the breaker limit right across the inner surf, so
    // the roller saturates there. The owner's own frame shows bright bands with
    // green water between them, not a sheet.
    float roller = mix(surfFoamMean(ST.z), ST.w, rollBL) * 0.78;
    surf = clamp(max(max(sheet, sw), roller), 0.0, 1.0) * dry * ${dbg('nosurf')};

    // FOAM TEXTURE. A correct coverage mask still renders as fog without it -
    // measured, tmp-tr71/ev/sheet_g.png, where the whole bank came out as a soft
    // white blob. Band-limited on the pixel's own world footprint against the
    // 1-4 m cell size, so the far field falls back to the flat mask it already
    // had rather than aliasing, and the swash right at the sand is left alone
    // (a run-up sheet IS flat).
    {
      float texBL = (1.0 - smoothstep(1.1, 4.5, surfPx)) * smoothstep(0.10, 0.45, hw)
                  * ${dbg('nofoamtex')};
      float ft = surfFoamTex(vWorld.xz);
      surf = clamp(surf * mix(1.0, 0.42 + 0.82 * ft, texBL), 0.0, 1.0);
    }

    // Share of the foam that is an actively breaking crest rather than sheet.
    // A blend weight for the two measured foam colours, NOT a coverage - the
    // old code multiplied this by the coverage, which made the bright crest
    // colour unreachable exactly where coverage was thin.
    // A breaking crest from the train is the brightest foam there is, so it
    // takes the crest colour outright rather than being averaged with the sheet.
    breaking = clamp(max(trav * 1.25 - 0.12, ST.z * roller), 0.0, 1.0);

    // Bed return and suspended sand. Steady on h, not on the instantaneous
    // depth, because this is what the water is carrying and it does not move
    // with the waves. Widened from 2.2 to 3.0 m to follow the corrected bed
    // profile: on the old law 2.2 m sat 53 m offshore, on this one 3.0 m sits
    // 115 m offshore, which is the band f657 actually shows as a different
    // colour from the open sea.
    float shSoft = 1.0 - smoothstep(0.0, 3.0, max(hShoal, 0.0));
    float shCov  = bandCov(max(hShoal, 0.0), hFoot, 0.0, 1.5);
    shoal = mix(shSoft, shCov, smoothstep(1.5, 3.6, hFoot)) * ${dbg('nosurf')};
  }

  // ------------------------------------------------------------------------
  // BROKEN WATER IS NOT A MIRROR. Without this the surf cannot be seen at any
  // range, however well the mask above is integrated, and the reason is worth
  // stating precisely because it is not a colour problem.
  //
  // Schlick's F assumes the surface is smooth at the scale of the sample. At
  // the approach camera the water meets the sand at 0.35 degrees grazing, so
  // F = 0.97 and the sea there is the horizon sky - MEASURED in the before
  // render at 213,222,223. Foam is 226,231,242. Painting one over the other is
  // a 13-level change on a 219 background: correct arithmetic, invisible line.
  //
  // But that F is wrong for this water. Shoaling and broken water carries
  // steep sub-pixel structure - it is the one place on the sea where the
  // smooth-surface assumption fails outright - so the microfacets face every
  // direction, the average reflectance collapses toward its normal-incidence
  // value, and the bed return underneath comes up instead. This is the everyday
  // observation that you can see the bottom in the shallows while the open sea
  // a hundred metres out is a mirror.
  //
  // ⚠️ THE PREVIOUS NOTE HERE CLAIMED ITS REFERENCES SHOWED THE SHOAL BAND
  // DARKER THAN THE OPEN SEA. Both numbers it quoted say the opposite, and so
  // does every other sea-level frame checked since:
  //   f657 (drone): last clean water before the swash 62,107,118 against open
  //     water 33,107,121 - BRIGHTER, and redder, which is the bed coming up.
  //   5659302427433328.jpg (sea level): shoaling band p50 38,85,98 against the
  //     water seaward of the break at 22,80,95 - BRIGHTER.
  //   5615867598443478.jpg (sea level, calm, sunny; owner's own): the sea
  //     brightens monotonically from lum 51 (13,68,88) at the horizon to lum 99
  //     (70,106,116) in the last metres before the sand. No dark band anywhere.
  //   5722034404493463.jpg (sea level, overcast; owner's own): sea p50 lum 111
  //     seaward rising to 134 at the break, then the surf band itself p50 136
  //     to 191 with p90 226-250 - the foam.
  //
  // So the real shoreline is a BRIGHTENING, and this term darkens. It is kept
  // anyway, deliberately, and the reason is arithmetic rather than taste.
  //
  // MEASURED in this render: the sand reads 150,147,131 (lum 148) and the water
  // touching it reads 214,223,224 (lum 221). Every reference has that ordering
  // the other way round - sea well BELOW sand - because our far water is
  // returning SKY_HORIZON almost exactly (F = 0.979 at 0.25 degrees grazing).
  // It is also sitting where the ACES curve has no headroom left: lifting 214
  // to 235 costs +86% of linear radiance, so the measured foam at 226,231,242
  // lands 9 levels above the water it is painted on and nothing brighter can be
  // bought at any price. Rendering the surf at f657's own Hs 1.2 was tried and
  // measured - coverage rose to 0.33 in the shoreline row and the frame did not
  // visibly change.
  //
  // Collapsing F in the shoal band is therefore the only lever inside this
  // block with any tonal authority, and it is a partial correction TOWARD the
  // measured relationship rather than away from it: it pulls the water nearest
  // the sand down off the ceiling, which is the direction every reference wants,
  // even though the open sea beyond stays inverted. That inversion is in the sea
  // shading, not here, and it is the thing worth fixing next.
  //
  // The physics of the collapse is sound on its own terms: shoaling and broken
  // water carries steep sub-pixel structure, the microfacets face every
  // direction, and the average reflectance falls toward normal incidence. It is
  // the everyday observation that you can see the bottom in the shallows while
  // the open sea is a mirror.
  //
  // ⚠️ Driven by the SHOAL band, not by surf alone. Keying it off surf was tried
  // and measured and it cancels: where foam covers the water the darkening is
  // hidden under the foam, and where there is no foam there is no darkening.
  // The shoal band works because it is wider than the foam and is not covered
  // by it, so the shoreline reads as three tones - sand, foam, disturbed water -
  // instead of one ramp.
  //
  // 0.42 is INFERRED and is a rendering decision, not a measurement: nothing
  // here pins the effective grazing reflectance of shoaling water. It is set to
  // take the band 15-30 levels off the ceiling, which is what it costs to
  // separate at all now that the tonemap headroom above is known to be gone.
  //
  // Applied to F itself rather than to the output colour so the sun glitter
  // below is suppressed by the same number: disturbed water does not glitter
  // either, and a mirror sliver of sun inside the surf line is a loud tell.
  //
  // ⚠️ Gated to the surf zone by construction: shoal and surf are both zero
  // outside h < 6 m and both carry the nosurf ablation factor, so ?wdbg=nosurf
  // restores the settled open-sea Fresnel exactly - which is how "the sea
  // colour has not moved" gets proved rather than asserted.
  float disturb = clamp(shoal * 1.55 + surf * 0.5, 0.0, 1.0);
  F = mix(F, min(F, 0.42), disturb);
  // ------------------------------------------------------------------------

  // Body colour. Wave crests are thinner and let more light through, so they go
  // toward the shallow green - a cheap stand-in for subsurface scattering, and
  // the thing that stops the sea reading as a sheet of metal.
  //
  // ---------------------------------------------------------------------------
  // ⚠️ "THE NEAR SEA IS RED-STARVED" WAS TESTED HERE ON 2026-08-20 AND NOT ACTED
  // ON, BECAUSE THE TARGET IT WAS MEASURED AGAINST IS THE WRONG WATER. Do not
  // re-open it without reading this. The open list said: render near-field R/G
  // 0.41-0.47 against "the reference's 0.64-0.80", and pointed at this mix.
  //
  // Where the 0.64-0.80 came from, checked frame by frame:
  //   REF 763260589138714 - the photographer is standing IN the water AT the
  //     shoreline. Its bottom 18% is water under 2 m deep over sand, with
  //     suspended sand and swash in it. Measured across the whole frame its R/G
  //     is a flat 0.79-0.84, and its B/G falls to 0.91 close in - the emerald
  //     shallow wave face. That is shoreline water, not the water a rider 256 m
  //     offshore is looking at.
  //   REF 1654036391293305 - LOOKED AT, not just sampled: it is a warship on the
  //     horizon photographed from the East Cliff under a hazy, largely overcast
  //     sky. Deep offshore water, long range, grey sky. Trap 5 says colour comes
  //     from SUNNY frames; this is not one, and its R/G 0.655 is a grey sky
  //     lifting red in slate water.
  //
  // What the owner's own SUNNY sea-level frame says instead. 5659302427433328,
  // banded by the depth its own geometry implies (eye ~1.6 m at the waterline,
  // range from the depression angle, depth from this file's bedDepth law):
  //     h 0.7-1.1 m   139,158,165   R/G 0.880
  //     h 1.1-1.5 m    89,120,129   R/G 0.742
  //     h > 2 m        48, 95,109   R/G 0.505
  // R/G falls MONOTONICALLY as the water deepens. 0.64-0.80 is the middle of
  // that ramp - water 1 to 1.5 m deep - and the judged cameras' bottom 18% is in
  // 2.7 to 4.5 m.
  //
  // Rendered against it at a matched geometry. A calibration camera was placed
  // at eye 1.6 m standing ON the mean-high-water line at coast X 120 (coast Z
  // 46.2 out of coast.js's own mhwOffset), aimed horizontally out to sea, so
  // screen row -> depression -> range -> depth exactly as in the photograph:
  //     h 0.7-1.1 m   168,194,201   R/G 0.866   against the photograph's 0.880
  //     h 1.1-1.6 m   157,190,199   R/G 0.826   against              0.742
  //     h 2.1-3.0 m   191,210,214   R/G 0.910   against              0.505
  // In the shallows, where the bed return fires, the render is within 0.014 of
  // the photograph. It is if anything slightly TOO red at 1.1-1.6 m. There is no
  // red starvation anywhere the two can be compared.
  //
  // WHAT IS REAL, and it is a different defect with a different fix: R/G stops
  // falling and turns back UP as the water deepens - 0.826 at 1.1-1.6 m, 0.910
  // at 2.1-3.0 m - where every reference falls monotonically, and the luminance
  // runs 184-206 against the photograph's 86-114. Both are the same thing: as
  // the view goes grazing, Schlick takes F to 0.98 and the water returns
  // SKY_HORIZON, whose own R/G is 207/229 = 0.904. The sea converges on the sky
  // instead of on the water. The note further down this function already says
  // so - "our far water is returning SKY_HORIZON almost exactly... That
  // inversion is in the sea shading, not here, and it is the thing worth fixing
  // next" - and the honest fix is the Toksvig argument the sun lobe below
  // already makes, applied to F as well: slope variance that the band limit has
  // taken out of the normal has to come back as roughness, and roughness pulls
  // the average reflectance down off its grazing value.
  //
  // ⚠️ NOT DONE HERE, DELIBERATELY. That term is keyed on (1 - detailFade).
  // Extrapolating the footprint table above waterFrag() - which is measured, and
  // where the footprint grows as range squared - puts detailFade at 0.986 over
  // the settled mid-distance band 12.6 m out and 1.000 over the near band at
  // 4.6-8 m, so (1 - detailFade) is 0.014 and 0.000 there. The term therefore
  // cannot fix the near field at all - it is a MID AND FAR water change,
  // and mid and far water are on this project's do-not-touch list with a
  // measured pair (173,198,207 against 160,184,193) behind them. It also needs a
  // reference decision this pass could not make: the two sunny sea-level frames
  // disagree by 90 levels on how bright far water is (763 reads L 177 just below
  // its own horizon, 5659 reads L 86), because one looks toward the sun through
  // haze and the other away from it. Somebody has to say which day this game is.
  //
  // ⚠️ WHAT THE WEATHER PASS DID TO THIS NUMBER ANYWAY, measured 2026-08-20 by
  // the verifier and NOT stated when the pass shipped. Nothing in waterFrag was
  // touched, but the sea is mostly sky reflection, so raising CLOUD_TH from
  // 0.770 to 0.800 takes bright cloud out of the reflected sky and cloud is far
  // warmer than the blue it sits in. Bottom 18% of frame, foam excluded, p50:
  //     approach   83,160,179 R/G 0.519  ->  77,158,178 R/G 0.487
  //     entrance   67,144,170 R/G 0.465  ->  64,142,169 R/G 0.451
  //     alongneck  67,143,166 R/G 0.469  ->  62,141,165 R/G 0.440
  //     head      122,171,187 R/G 0.713  -> 121,171,187 R/G 0.708
  // So the near sea moved 0.006-0.031 FURTHER from the open list's target while
  // the note above was being written. On the shoalcal geometry - the only place
  // the render and a photograph can be compared - the same move is 0.872 ->
  // 0.866 at h 0.7-1.1 m and 0.832 -> 0.826 at 1.1-1.6 m, i.e. it stays inside
  // 0.014 of the photograph and does not overturn the argument. It is recorded
  // because it is exactly the "fixed one property and silently broke another"
  // pattern, and because a later pass reading only the prose above would not
  // know the number had moved at all. The settled MID-distance pair did not
  // move: approach rows 280-289 read 172,198,206 before and after, against the
  // checkpoint's 173,198,207.
  // ---------------------------------------------------------------------------
  // ⚠️ RE-OPENED 2026-08-20 (later) AND DECLINED AGAIN, ON A DIFFERENT AND
  // HARDER GROUND THAN THE NOTE ABOVE. The task was the survey's proposal: "a
  // DEPTH-DRIVEN BED-RETURN term that only fires inshore - shallow water over
  // pale sand returns red that deep water does not." That mechanism is
  // SIGN-INVERTED on this render's own bathymetry, and nobody had measured the
  // bathymetry.
  //
  // The two bands in question are screen bands, and what water they land on was
  // computed by ray-casting each judged camera onto y = 0 and running the
  // result through coast.js's own mhwOffset() and this file's bedDepth():
  //
  //     camera      band              range from cam   DEPTH        flat-water F
  //     approach    MID  rows 250-285   14.2-42.1 m   4.21-4.48 m   0.56-0.83
  //     approach    NEAR rows 327-399    4.9- 9.6 m   4.43-4.49 m   0.15-0.41
  //     entrance    MID                 30.0-83.5 m   2.06-2.93 m   0.50-0.79
  //     entrance    NEAR                11.0-21.7 m   2.83-3.01 m   0.12-0.37
  //     alongneck   MID                 17.9-60.3 m   2.03-2.67 m   0.53-0.83
  //     alongneck   NEAR                 6.1-12.5 m   2.66-2.76 m   0.12-0.39
  //     head        MID                 79.8- 391 m   1.84-3.85 m   0.83-0.96
  //     head        NEAR                13.1-30.0 m   3.82-4.02 m   0.29-0.60
  //
  // On EVERY camera the NEAR band is the SAME depth as the settled MID band or
  // DEEPER. The rider is 250 m offshore looking down at his own feet; the water
  // higher up the frame is FURTHER UP THE BEACH and therefore SHALLOWER. So a
  // term keyed on depth paints the settled mid-distance pair HARDER than the
  // near field it was asked to fix, on all four cameras. Depth carries no
  // signal that separates them - on the approach camera it carries 0.05 m.
  //
  // Partly corroborated by ablation - ⚠️ and this paragraph OVERCLAIMED it until
  // 2026-08-21. ?wdbg=nosurf zeroes the shoal and surf terms outright. Measured
  // at the real render size of 872x399, so the bottom 18% is rows 327-398, on
  // the ablation renders THEMSELVES rather than from memory:
  //     approach    bottom 18%       0 px move            rows moved 229-252
  //     entrance    bottom 18%   5,370 px move, max 1 lvl  rows moved 226-398
  //     along-neck  bottom 18%  29,428 px move, max 2 lvl  rows moved 235-398
  // The claim that used to stand here - "ZERO pixels on approach AND entrance,
  // 37 pixels in along-neck, nowhere near the near band" - is true of the
  // APPROACH CAMERA ONLY and was generalised from it. That is failure mode 2.
  // On entrance and along-neck the existing bed return DOES reach the near
  // band, all the way to the last row. What survives is the WEAKER and still
  // sufficient statement: where it reaches the near field it moves it by 1-2
  // levels, against the 54 levels of red the proposal would have to find. The
  // argument this section rests on is the BATHYMETRY below, not this ablation.
  //
  // WHAT ACTUALLY SEPARATES THEM IS FRESNEL, and it is not enough. The only
  // per-pixel quantity that differs is F, so the only lever is body, which
  // enters at weight (1 - F). MEASURED with a probe (+0.030 linear red added to
  // body, rendered, then reverted):
  //     approach   NEAR R +18.0   MID R +2.0    transfer ratio 9.0 : 1
  //     entrance   NEAR R +20.0   MID R +3.0    transfer ratio 6.7 : 1
  // Reaching the stated target (R/G 0.80 at the near band's own G of 156) needs
  // R +54, i.e. 3x that probe, which lands the settled mid pair near 185,201,209
  // - R/G ~0.92 against the reference's 0.85, where it is already 0.89. The
  // mid band's R/G error would grow from 0.040 to 0.070 - it would NEARLY
  // DOUBLE (x1.74) to buy the near band's. (⚠️ read "grow by a quarter" until
  // 2026-08-21; recomputed 0.9204-0.85 over 0.8905-0.85 = 1.74, so the real
  // cost is worse than the note claimed, not better.) 9:1 is not the ~27:1
  // this needs, and no reshaping of a body-colour term makes it so.
  //
  // AND THE TARGET IS THE WRONG WATER, which is the note above's point restated
  // with the geometry attached. Photograph 763 was taken standing IN THE SURF at
  // the pier root on a wide lens ~1.5 m over water 1-2 m deep; its bottom 18% is
  // looking nearly straight down into the swash. The judged cameras' bottom 18%
  // is 2.7-4.5 m of water seen at 55-81 degrees off vertical. That is trap 6's
  // argument - never compare across viewing geometry - applied to DEPTH.
  //
  // ⚠️ SO: DO NOT ADD A DEPTH-DRIVEN BED RETURN FOR THE NEAR FIELD. It is not
  // that it is risky; it pushes the wrong band. The near/far R/G inversion is
  // real and is the Toksvig-F item the note above already names, and it is a
  // MID-AND-FAR change that needs the owner to say which day this game is.
  float lift = clamp(vWorld.y * 1.6 + 0.35, 0.0, 1.0);
  float sss = pow(max(dot(-V, normalize(uSunDir - N * 0.6)), 0.0), 3.0);
  vec3 body = mix(BODY_DEEP, BODY_SHALLOW, clamp(lift * 0.7 + sss * 0.6, 0.0, 1.0));
  body = mix(body, BODY_SHOAL, shoal * 0.85);

  // ---------------------------------------------------------------------------
  // NEAR-FIELD WAVE-FACE EXTINCTION. This is STATUS.md open item 1's CONTRAST
  // half - "the near sea does not lose contrast with distance" - and it is a
  // body problem, not a Fresnel one. It is deliberately independent of the hue
  // half (the owner-blocked F_TOKSVIG pack in tmp-tr2/1x/DECISION.md): nothing
  // here touches F, so the two can land in either order.
  //
  // THE DEFECT, measured on the frozen approach camera at 884x405 through
  // body-only and reflection-only probes (rows 332-404 = the near band the
  // instrument reads, rows 270-299 = the settled mid box):
  //
  //                       NEAR band      settled MID box
  //     body  L spread       6.3              27.3
  //     refl  L spread      48.0              24.7
  //
  // The reflection attenuates with range the way it should - it nearly halves.
  // The BODY runs backwards: the one term that is supposed to give the body its
  // wave structure has four fifths of its dynamic range at mid distance and
  // almost none in the near field. With the body flat, every near-field tone has
  // to arrive through F across a 75-level body-to-sky gap, and Schlick is convex
  // at 71-80 degrees of incidence, so what comes out is a BRIGHT-skewed
  // distribution. Detrended per row, the render's wave contrast is 49.3 near and
  // 49.5 mid: identical. That IS the "texture painted on a plane" tell.
  //
  // WHY THE BODY IS FLAT NEAR. lift above is keyed on ABSOLUTE elevation,
  // which is a long-wave quantity. Measured through a lift probe on the same
  // frame: lift spans 0.510-0.663 across the whole near band - a 46 mm elevation
  // range - and 0.075-0.651 across the mid box. The near band is a 3 m x 6 m
  // patch of the 10.54 m modal wave sitting on its FLANK, where slope is maximal
  // and elevation range is minimal; the mid box spans two wavelengths. An
  // elevation-keyed term cannot resolve the near field and never could.
  //
  // WHAT THE REFERENCE SHOWS. Photograph 763260589138714, bottom 18%, LEFT 60%
  // only so the pier and its own shadow are excluded (trap 15: a band that
  // straddles two surfaces measures neither). By decile of L, mean RGB:
  //
  //                      dark decile        median          bright decile
  //     photograph 763   53, 80, 93      123, 157, 137     149, 180, 173
  //     render (before)  42, 145, 166     79, 159, 178     178, 202, 208
  //
  // The medians agree to 0.3 of a level - that is the whole point of this item.
  // The photograph's dark end falls in ALL THREE channels (R x0.355, G x0.441,
  // B x0.535 of its own bright end); the render's falls only in red (x0.236)
  // while green holds x0.719 and blue x0.800. The render has no dark end because
  // its BODY has no dark end. In the photograph those dark pixels are the
  // seaward FACES of the swells - the parts tilted toward the camera.
  //
  // THE KEY. NdotV - V.y. V.y is exactly the flat-water NdotV at the same
  // pixel, so the difference is the wave's own tilt toward the eye and nothing
  // else - range-independent, camera-independent, and free. Measured over the
  // near band: p05/p50/p90 = -0.084/+0.012/+0.089 approach, -0.075/+0.011/+0.077
  // entrance, -0.101/+0.003/+0.074 along-neck. 0.090 is therefore the top
  // decile of face tilt on all three cameras, and clamping at 0 means facets
  // tilted AWAY are untouched - which is why p90 does not move (178.7 -> 178.3).
  //
  // THE GATE. Both knees are MEASURED footprints off a foot probe on this frame,
  // not chosen: 0.078 m is the near band's own p90 footprint on approach, and
  // 0.110 m is the SMALLEST footprint anywhere in the settled approach_seamid
  // box. So the term is at full strength over 90% of the near band and
  // zero over the whole settled box AT 884x405 - measured, 0 changed pixels
  // there, not hoped for. Widening the upper knee to 0.173 (that box's p10) buys
  // nothing on any near band and costs 653 changed pixels in the settled box, so
  // it was measured and rejected.
  //
  // ⚠️ THAT ZERO IS NOT A STRUCTURAL GUARANTEE - IT IS RESOLUTION-DEPENDENT, AND
  // AN EARLIER DRAFT OF THIS COMMENT IMPLIED OTHERWISE. foot (the variable below) is the world size
  // of ONE PIXEL, a sampling-rate quantity, not a range quantity: double the
  // canvas and foot halves, so both knees open at ~2x the world distance.
  // Measured by an independent verifier, this term alone inside the settled
  // approach_seamid box: 0 of 5,250 px at 442x203, 0 of 21,000 at 884x405, and
  // 10,012 of 84,000 (11.9%, max delta 38) at 1768x810, where the box mean moves
  // -0.55 L. The p50 gate still PASSES at every resolution tested (delta 0.0)
  // and 1x vs 2x are visually indistinguishable, so this is a bounded cost, not
  // a defect - but measure.py ASSERTS 884x405 (trap 19), which means the one box
  // the safety argument rests on is only ever checked at the resolution where
  // this term is silent. Behaviour above 2x is UNMEASURED: 2652x1215 would not
  // settle inside the render driver's 120 s timeout. If this game ever ships at
  // a canvas materially above 884x405, RE-MEASURE the settled box before
  // trusting any number in this block.
  //
  // THE FORM is a multiplicative scale on the body in LINEAR light, not a mix
  // toward another colour. Less light comes back up out of a face you are
  // looking into; that is a radiance statement, not a hue one. Measured: near-sea
  // R/G moves +0.009/+0.003/+0.023 and B/G +0.013/+0.002/+0.031 on the three
  // cameras, both in the direction of the reference. Mixing toward BODY_DEEP
  // instead was tried and rejected - it drags B/G from 1.135 to 1.248, and the
  // hue is somebody else's decision.
  //
  // 0.30 is INFERRED in the sense the file's own 0.42 is: it is set by
  // measurement to land the near band's p10 on the reference's own dark decile.
  // Swept 0.30/0.35/0.45/0.55/0.65 -> approach p10 84.3/87.7/94.3/100.3/105.7
  // against photograph 763's 82.7, with p50 held at 135.3-136.7 against 138.7
  // before and 139.0 in the reference.
  //
  // ⚠️ NOT gated on shoal. That was built and measured: over the bed the face
  // does not hand you the deep column, so a (1 - shoal) guard is defensible - but
  // it moves the judged cameras by 0-1 level and it would stop ?wdbg=nosurf being
  // a clean ablation of the shore block. Left out on the measurement.
  float faceTilt = clamp((NdotV - V.y) / 0.090, 0.0, 1.0);
  float nearFace = (1.0 - smoothstep(0.078, 0.110, foot)) * ${dbg('noface')};
  body *= mix(1.0, 0.30, faceTilt * nearFace);
  // ---------------------------------------------------------------------------
  // FAR-WATER CHROMA, body half (2026-09-16, tmp-tr21; the reflection half and the
  // measurements are in the far-water block below). Past a pixel footprint of
  // 0.25-0.60 m (beyond the lobe's own 0.15-0.50 fade, so the calibrated NEAR sea is
  // bit-for-bit untouched - a 0.03-0.15 window moved entrance near R/G 0.416 -> 0.692
  // and was rejected) the body is seen partly (0.80) as neutral airlight of EQUAL
  // luminance, so brightness calibration holds; the body share grows toward the
  // viewer, so R/G rises from far to b20 as clip 0184 does. Sunny only: overcast
  // is left exactly as tmp-tr17 set it. Ablation: ?wdbg=nofarchroma; tuning:
  // ?wnum=fh:,h0:,h1: (and fr:,fb: below).
  float farChroma = ${dbg('nofarchroma')} * (1.0 - uOvercast);
  float hazeK = ${num('fh', 0.80)} * farChroma * smoothstep(${num('h0', 0.25)}, ${num('h1', 0.60)}, footD);
  body = mix(body, vec3(dot(body, vec3(0.2126, 0.7152, 0.0722))), hazeK);

  vec3 col = mix(body, refl, F);

  // ---------------------------------------------------------------------------
  // FAR WATER REFLECTS A ROUGH LOBE, NOT THE HORIZON. 2026-09-16, tmp-tr6/sea.
  //
  // ⚠️ THIS REOPENS A SETTLED ITEM, ON NEW EVIDENCE, AND SAYS SO. STATUS.md
  // closed "stop tuning mid-distance and offshore water" against photograph
  // 763 - which looks INTO the sun through haze from the surf at the pier root.
  // The owner's own clip G:/DJI/dji aug 25/DJI_20250816125542_0184_D.MP4
  // (16 Aug, near noon, eye level, open horizon, sun high) contradicts it.
  // Same-frame ratios, so exposure cannot fake them, via tmp-tr6/sea_target.py
  // (approach camera, 10 rows under the horizon over 12 rows above it):
  //
  //                          far water / sky     far water R/G
  //     clip 0184               0.51 - 0.62        0.74 - 0.87
  //     before this block          0.971              0.945
  //     after  this block          0.613              0.754     <- both IN
  //
  // THE DEFECT is the one the long notes above name: at 0.3-2 deg of grazing the
  // band-limited normal is smooth, Schlick takes F to 0.9+, and the sea returns
  // SKY_HORIZON (R/G 0.904) - a mirror of the brightest sky there is.
  //
  // WHY THE 1x FIX (Toksvig on F, tmp-tr2/1x/DECISION.md) COULD NOT DO IT.
  // Lowering F hands the energy to the BODY term, whose floor is the PROTECTED
  // BODY_DEEP (R/G 0.15). Its 5659-day strength (K 0.95) got the darkness and
  // went teal (R/G 0.389), and a grazing ceiling of 0.07 is a matte surface,
  // not rough water. Here darker does NOT mean more body.
  //
  // THE DERIVATION. Single-scatter microfacet reflection of the analytic sky:
  //  1. Slopes are Gaussian with mean-square slope SEA_MSS (below); 1-D rms
  //     s1 = sqrt(SEA_MSS / 2) in the view plane. Cross-view slopes were
  //     integrated offline and moved the answer by < 0.005 of water/sky and
  //     < 0.009 of R/G, so the integral is 1-D.
  //  2. The eye sees facets in proportion to their projected area,
  //     max(m.V, 0) / m.N. At grazing that keeps only facets TILTED TOWARD THE
  //     EYE, so each visible facet (a) is met at a steeper local angle - lower
  //     F - and (b) reflects a ray raised by twice its tilt, into higher sky
  //     that this file's own gradient makes darker. That is the whole effect:
  //     the sea reflects a lobe-integrated sky, not the horizon sample.
  //  3. Per-facet F is the EXACT unpolarised Fresnel for n = 1.333, not
  //     Schlick: Schlick overshoots it by 10-14% at the 75-85 deg local angles
  //     that dominate here (0.398 vs 0.348 at 80 deg).
  //  4. A reflected ray under the local wave horizon hits the next wave:
  //     Smith G1 for a Beckmann field (Walter 2007 rational fit) sends that
  //     share to skyColorD()'s OWN below-horizon value, COAST_TINT * 0.65 -
  //     "the far water, already hazed". Measured share: 7-9% of the lobe.
  //  5. Quadrature: 6-node midpoint rule over t = s / s1 in
  //     [max(-tan(elev)/s1, -3), 3], weighted by the projected area times the
  //     Gaussian. Against a 6,000-sample Monte Carlo of steps 1-4 at this mss
  //     it is within 0.018 of water/sky and 0.019 of R/G at 0.5-25 deg (worst
  //     at 5 deg; 4 nodes err 0.04; Gauss-Hermite errs 0.15 - the visibility
  //     cut truncates it).
  //  The offline model (tmp-tr6/sea/model/) predicted each render, at 1 deg:
  //  mss 0.0246 -> 0.678 model / 0.681 render; 0.0312 -> 0.642 / 0.646;
  //  0.0388 -> 0.608 / 0.613.
  //
  // ⚠️ THE BODY KEEPS ITS SMOOTH-SURFACE WEIGHT (1 - F), AND THAT IS A CHOICE,
  // NOT MICROFACET PHYSICS. Energy-conserving transmission would raise it to
  // 1 - F_eff (~0.55). RENDERED at this mss, same lobe: water/sky 0.704,
  // R/G 0.659 - OUT on both, too bright AND too teal, the 5659 failure in
  // miniature (tmp-tr6/sea/model/S_approach_honestbody.png). The reason it is
  // held: water-leaving radiance offshore is a few per cent of the horizon sky
  // (Rrs ~0.004/sr against a hazy horizon ~0.06 E_d/sr), while BODY_* here is a
  // protected NEAR-FIELD calibration at ~0.20 of SKY_HORIZON in green (mean
  // lift) - 2-4x that. Both radiometric figures are order-of-magnitude
  // literature estimates, not measurements of this bay. With those constants protected, any larger body share goes teal.
  // Only the REFLECTED term is replaced; the body term is untouched bit for bit.
  //
  // SEA_MSS = 0.0388 IS CALIBRATED INSIDE A PHYSICAL BRACKET, NOT DERIVED.
  // It is the Cox-Munk clean-surface mean-square slope 0.003 + 0.00512 U at
  // U = 7.0 m/s, mid Beaufort 4. The clip shows scattered whitecaps, which this
  // file's foam note puts at roughly Force 4 (5.5-7.9 m/s, mss 0.031-0.043).
  // MEASURED along the bracket (approach, water/sky / R/G):
  //     mss 0.0246 (U 5.2 minus the 0.0050 the vertex normal carries)  0.681 / 0.797  OUT
  //     mss 0.0312 (U 5.5, Force 4 floor)                              0.646 / 0.779  OUT
  //     mss 0.0388 (U 7.0)                                             0.613 / 0.754  IN
  // Rougher is darker AND bluer (the lobe climbs into a bluer sky), so the IN
  // segment is narrow: interpolating the measured points, water/sky ~0.595-0.62
  // with R/G ~0.74-0.757. 0.0388 sits inside it, near both edges. ⚠️ It is the CLIP DAY's roughness, not the modal wave table's:
  // Hs 0.5 m / Tp 4 s implies U 3.3-5.5 m/s (JONSWAP fetch-limited / PM) and
  // the table itself resolves only mss 0.0084 (tiers 0-2, detail x1.4). The
  // 0.0050 of tiers 0-1 the vertex normal still carries under 220 m is NOT
  // subtracted; subtracting it would need U ~8.0 for the same result.
  //
  // THE GATE is (1 - detailFade), exactly as the glitter lobe and the 1x pack
  // key roughness: at detailFade = 1 the resolved detail normal already
  // scatters the reflection pixel by pixel. MEASURED: near-sea p10/p50/p90 and
  // spread identical to the digit on approach, entrance and along-neck
  // (approach p10 84.3, spread 94.0). ⚠️ foot is a PIXEL-size quantity, so the
  // window moves outward at larger canvases - same caveat as the face-tilt
  // term below. Measured at 884x405 only.
  // NEGATIVE RESULT: the strict variance key 1 - detailFade^2 (N mixes the
  // detail SLOPE linearly, so variance goes as its square) was rendered and
  // rejected - approach pale-streak share 9.63% -> 9.69% (no gain), entrance
  // near-band p90 and spread moved 0.3, mid pair moved further (-56,-36,-25).
  // ⚠️ OPEN: inside the window (approach rows ~275-300) the smooth path's pale
  // wave highlights now stand against darker far water: pixels > their 9x31
  // local median + 20 L, rows 250-330, approach 6.79% -> 9.63% (entrance
  // 5.48% -> 5.09%). They read as streaks, not blocks, but the band has a front.
  //
  // WHAT MOVES, by design: approach_seamid p50 173,198,207 -> 130,171,188.
  // The far-to-mid brightening this leaves (approach rows 240 -> 300: L 133 ->
  // 177) is in the clip too (f5 0.55 -> 0.86, f19 0.66 -> 0.82 of its sky over
  // the first ~100 rows). The horizon keeps a 3-4 row haze ramp (rows 233-236:
  // L 178, 153, 141, 138) where the clip steps in ~2 rows at 720.
  // ?wdbg=nolobe removes this block alone (renders bit-identical to the
  // pre-change tree on all five judged cameras); ?wdbg=noroughen removes it
  // with the glitter widening. The glitter term below still uses smooth F.
  // Cost: 6 analytic sky evaluations WITH the cloud layer (since tmp-tr17,
  // 2026-09-16; was cloud-free) per fragment where detailFade < 1.
  // ---------------------------------------------------------------------------
  const float SEA_MSS = 0.0388;          // Cox-Munk 0.003 + 0.00512 * 7.0 m/s; bracket measured above
  float lobeW = (1.0 - detailFade) * ${dbg('noroughen')} * ${dbg('nolobe')};
  if (lobeW > 0.0) {
    float s1 = sqrt(0.5 * SEA_MSS);
    vec3 Tv = V - N * NdotV;
    float tl = length(Tv);
    Tv /= max(tl, 1e-5);
    // Visible slopes start where a facet turns edge-on to the eye, t = -tan(elev)/s1;
    // +-3 sigma holds 99.7% of the Gaussian. 6 nodes: see step 5 above.
    float t0 = max(-(NdotV / max(tl, 1e-5)) / s1, -3.0);
    float dt = (3.0 - t0) / 6.0;
    vec3 acc = vec3(0.0);
    float fAcc = 0.0;
    float wAcc = 0.0;
    for (int k = 0; k < 6; k++) {
      float t = t0 + (float(k) + 0.5) * dt;
      vec3 m = normalize(N + Tv * (s1 * t));
      float mv = dot(m, V);
      float w = max(mv, 0.0) / max(dot(m, N), 1e-3) * exp(-0.5 * t * t);
      vec3 Rk = reflect(-V, m);
      float ry = dot(Rk, N);
      // Smith G1, Beckmann: a = tan(elevation) / (sqrt(2) * s1); rational fit, Walter et al. 2007.
      float a = ry / (max(length(Rk - N * ry), 1e-5) * s1 * 1.41421356);
      float G = ry <= 0.0 ? 0.0
              : (a >= 1.6 ? 1.0 : 1.0 / (1.0 + (1.0 - 1.259 * a + 0.396 * a * a) / (3.535 * a + 2.181 * a * a)));
      float Fk = fresnelWater(mv);
      // 2026-09-16, tmp-tr17: the lobe now sees the SAME weather as the smooth
      // reflection (was the cloud-free skyColor, so far water lost every cloud
      // reflection and ?wdbg=nocloud moved 14 px in approach rows hz+2..30).
      // Footprint angR per node; the node spread is the vertical smear.
      // tmp-tr24: soft-edged cloud coverage (skyColorLobe, above); nocloudsoft = the old call.
      acc  += w * Fk * ocSky(mix(COAST_TINT * 0.65,
              ${WDBG.includes('nocloudsoft') ? 'skyColorD(Rk, uSunDir, (1.0 - uOvercast) * ' + dbg('nocloud') + ' * ' + dbg('nolobecloud') + ', angR)'
                : 'skyColorLobe(Rk, uSunDir, (1.0 - uOvercast) * ' + dbg('nocloud') + ' * ' + dbg('nolobecloud') + ', angR, ' + num('cs', 0.03) + ')'}, G));
      fAcc += w * Fk;
      wAcc += w;
    }
    vec3 lobeRefl = acc / max(wAcc, 1e-6);
    float fEff = fAcc / max(wAcc, 1e-6);
    // Broken shoal water keeps the collapse the surf block applies to F (0.42, above).
    lobeRefl *= mix(1.0, min(fEff, 0.42) / max(fEff, 1e-4), disturb);
    // FAR-WATER CHROMA, 2026-09-16 (tmp-tr21). Two defects left OUT by tmp-tr17,
    // same-frame ratios on the approach camera against clip 0184 (sunny, high sun):
    //   far  (hz+2..12)  B/G 1.174 vs 1.02-1.06 - the rough lobe climbs into the
    //        zenith-weighted sky; greying ONLY the reflection took it to 1.019.
    //   b20 (hz+20..40)  R/G 0.676 vs 0.77-0.90 - the (1-F) BODY share, and
    //        BODY_DEEP is R/G 0.15 in linear light.
    // SKY_ZENITH and BODY_* are PROTECTED and untouched. Instead: (a) the rough
    // lobe's sky reflection is tinted green-grey (R x0.95, B x0.75) - the clip's far
    // water is R/G 0.73 / B/G 1.04, greener and greyer than any sky it could mirror;
    // (b) the body half above. Sunny only. Swept on the approach camera (tmp-tr21/sw*):
    //                 far R/G  far B/G   b20 R/G  b20 B/G   b50 R/G  b50 B/G
    //   before         0.754    1.174     0.676    1.184     0.814    1.059
    //   after          0.774    1.036     0.789    1.053     0.814    1.053
    //   clip 0184    .69-.78  1.02-1.06  .77-.90 1.05-1.10  .87-.91 1.04-1.13
    // far w/s 0.613 -> 0.584 and b20 0.590 -> 0.574 (clip .49-.53 / .55-.60). The far->b20
    // R/G rise is +0.015 against the clip's +0.06-0.12: direction right, size short.
    // b50 R/G stays 0.814 (clip .87-.91): that band is the calibrated near/mid field.
    // Near-sea L/R/G/B/G percentiles on approach, entrance and along-neck: unchanged.
    // FAR->B20 WARMING TREND, 2026-09-16 (tmp-tr24, sea polish item 1). The far->b20
    // R/G rise was +0.015 against clip 0184's +0.06-0.12, with b20 R/G already IN at
    // 0.789 and far at 0.774 near the top of .69-.78. So the FAR end is greened: the
    // lobe's red is cut further toward the horizon, keyed on V.y (the sine of the
    // grazing angle - the clip's trend is a function of how grazing the view is, and
    // V is smooth across wave triangles, so no footprint wedges). The ramp ends at
    // V.y 0.036, about 18 rows under the horizon on the approach camera, so b20
    // (hz+20..40), b50 and the calibrated near sea are untouched bit for bit.
    // Sunny only (inside farChroma). Ablation ?wdbg=nofartrend; tuning ?wnum=tg:,t0:,t1:.
    float farTrend = ${num('tg', 0.18)} * ${dbg('nofartrend')}
                   * (1.0 - smoothstep(${num('t0', 0.004)}, ${num('t1', 0.036)}, V.y));
    lobeRefl *= mix(vec3(1.0), vec3(${num('fr', 0.95)} * (1.0 - farTrend), 1.0, ${num('fb', 0.75)}), farChroma);
    // OVERCAST FAR-WATER BLUE, 2026-09-16 (tmp-tr24, sea polish item 4). Under ?overcast
    // the lobe mirrors ocSky()'s near-neutral grey, so the far strip read B/G 1.019
    // against clip G:/DJI/DJI_20250112144045_0004_D.MP4 at 1.04-1.06 (its b20 1.03-1.06
    // too) while R/G 0.969 and far/sky-high 0.754 were already IN. The lobe's blue is
    // lifted on grey days only: uOvercast = 0 multiplies by exactly 1, so sunny renders
    // are bit-identical. Calibrated, not derived. Ablation ?wdbg=noocblue; tuning ?wnum=ob:.
    lobeRefl *= mix(vec3(1.0), vec3(1.0, 1.0, ${num('ob', 1.08)}), uOvercast * ${dbg('noocblue')});
    col = mix(col, (1.0 - F) * body + lobeRefl, lobeW);
  }

  // Sun glitter. Blinn-Phong with a tight lobe, scaled by Fresnel so it only
  // fires where the surface is actually mirror-like - and killed in shadow,
  // which is what draws the pier's shadow across the water as a dark band.
  //
  // The lobe WIDENS as the band limit above takes the ripples away. This is the
  // other half of band-limiting a normal map and it is not optional: slope
  // variance that the normal no longer represents has to come back as
  // roughness, or a surface that was a glitter field becomes a mirror the
  // moment it is far enough away, and a pow-900 mirror puts a hard sliver of
  // sun on the sea. Cheap Toksvig - peak intensity of a Blinn-Phong lobe scales
  // with its exponent, so exponent and amplitude move together and the energy
  // in the sun's track is roughly preserved. What it buys is the broad soft
  // glitter ROAD to the horizon that the sunny drone frames actually show,
  // instead of a stipple field that happens to be brightest near the sun.
  float sh = sunShadow(vWorld, N, uSunDir);
  vec3 H = normalize(uSunDir + V);
  // dbg() is 1.0 normally and 0.0 when suppressed, so ?wdbg=noroughen pins the
  // widened floor back up at 900 and the lobe stops responding to the fade.
  float lobe = mix(mix(900.0, 150.0, ${dbg('noroughen')}), 900.0, detailFade);
  float spec = pow(max(dot(N, H), 0.0), lobe) * (lobe * (1.0 / 900.0));
  col += vec3(1.0, 0.97, 0.92) * spec * 3.2 * F * sh * (1.0 - uOvercast) * ${dbg('noglitter')};
  // Shadowed water also loses the light scattered up out of its own body.
  col *= mix(mix(0.72, 0.94, uOvercast), 1.0, sh);

  // Foam. jac is the horizontal Jacobian from the shared sea chunk: it falls as
  // the surface is compressed at a crest, so it finds whitecaps for free.
  //
  // NOT the cause of the high-frequency problem, measured 2026-08-19: with the
  // sunny calibration cameras, suppressing this term outright moved 4 pixels at
  // the open-water camera and 7 at the approach camera. The 2026-08-03 pass
  // below already took it to essentially zero for the modal sea state. Left
  // alone deliberately - if anything it is now under-used, but that is a
  // separate question from this one.
  //
  // MEASURED DOWN 2026-08-03. The old threshold (0.62 -> 0.30, up to 0.85 mix)
  // put a continuous white band across the middle distance. Frame 566 shows a
  // Poole Bay chop with essentially NO whitecaps offshore - just a thin break at
  // the shoreline - because whitecapping needs roughly Force 4, and the modal
  // state this sea is tuned to is well below that. Whitecaps everywhere is one
  // of the loudest "this is a game" signals available.
  float foam = smoothstep(0.42, 0.18, vJac) * (1.0 - smoothstep(40.0, 130.0, vDist)) * ${dbg('nofoam')};
  col = mix(col, FOAM, clamp(foam, 0.0, 0.5));

  // Surf, laid ON TOP of the Fresnel mix rather than into the body colour,
  // because foam is an opaque surface and not a property of the water under it.
  // That distinction is the whole reason this reads at 260 m: MEASURED in the
  // before render, water at the waterline is 208,219,221 - at 0.35 degrees
  // grazing, Schlick gives F = 0.97 and the sea there IS the horizon sky (trap
  // 6). Anything mixed into the body would have been multiplied by 0.03 and
  // vanished. Foam over the top survives, and the 223 it lands on separates
  // from the sand's 165,156,133 in the row below it.
  //
  // The offshore whitecap term above is capped at 0.5 and gated to 130 m on
  // purpose; this one is capped at 0.97 and has NO distance gate, because the
  // shoreline is 260 m away in every camera the game is judged on. The two do
  // not overlap - one is driven by the surface Jacobian anywhere, the other by
  // depth only within 53 m of the sand - so max() would be dishonest and a
  // straight second mix is what actually happens: surf covers whitecaps.
  //
  // Shadow is applied at 0.86 rather than the water's 0.72 because foam is
  // rough and diffuse: it keeps far more skylight in shadow than a mirror does.
  float sSurf = sunShadow(vWorld, vec3(0.0, 1.0, 0.0), uSunDir);
  col = mix(col, mix(SURF, SURF_BREAK, breaking) * mix(0.86, 1.0, sSurf),
            clamp(surf, 0.0, 0.97));

  // Distance haze toward the sky at the horizon. Sky, water and coast within
  // ~60 levels of each other is what the measurements say, so this has to be
  // generous or the horizon reads as a cut edge.
  //
  // This one keeps the pre-weather skyColor() and it is not an oversight. The
  // direction is pinned at y = 0.02 and V is a unit vector, so the elevation
  // here is 0.02 rad at a grazing view and at worst 0.037 rad looking steeply
  // down at the rider's own water. On the cumulus plane those are slant ranges
  // of 62 km and 34 km, and skyColorD() has faded cloud to zero by 34 km. The
  // cloud term would therefore return exactly this value at three times the
  // cost, twice per water fragment.
  // >>> SEAOPT-atten
  // THE SEA AND THE LAND ARE SEEN THROUGH THE SAME AIR, so they get the same
  // law. This was smoothstep(120.0, 1400.0, vDist), which is not an extinction
  // curve at all - it is zero until 120 m, then S-shaped, then SATURATED from
  // 1400 m on. craft.js's coast, in the same frame, uses Beer-Lambert
  // 1.0 - exp(-dist / 4200.0). The two disagree by 3.3x at 1400 m: 92% against
  // 28%. Nothing in tmp-tr122's trade-curve study examined the sea; it
  // established 4200 m as the honest LAND figure and left this untouched.
  //
  // MEASURED (tmp-tr130, ?sdbg=hazeamt + ?sdbg=hazeoff + ?sdbg=hazecol over the
  // 19 judged views; the distance and the haze term are written RAW so the
  // numbers are the shader's own, not inferred):
  //   band        haze    cost of the haze   |sea - hazetarget|
  //   300-400 m    8.0%     17 levels          107
  //   600-800 m   40.8%     71 levels          117
  //  1100-1450 m  97.3%    116 levels          121
  // The old law was not a small veil on an already-sky-coloured sea. The sea's
  // own colour is 93-121 levels away from the haze target at EVERY range, so
  // the law had full authority and was spending nearly all of it: past 1.1 km
  // the water was 97% painted sky.
  //
  // WHAT THE OWNER'S OWN SEA-LEVEL FRAMES SAY, as same-frame sea:sky LINEAR
  // ratios taken at the horizon (tmp-tr130/hz.py; sky p50 116-152 in red, i.e.
  // NOT clipped, so unlike tmp-tr122's landform frame these can carry a ratio -
  // and clipping could only bias the ratio UP, so the gap is a lower bound):
  //   5659302427433328.jpg  sea 2-6 rows under the horizon / sky = 0.121
  //   5722034404493463.jpg  same measurement                     = 0.207
  // The real sea a kilometre or two out keeps 12-21% of the sky's luminance.
  // It does not become the sky. The old law made it 92% sky and, worse, made it
  // BRIGHTEN toward the horizon - the inversion the note 500 lines above
  // already spotted at the waterline and called "the thing worth fixing next".
  // Both frames brighten the other way: 0.121 at the horizon to 0.620 inshore,
  // and 0.207 to 1.146.
  //
  // 4200 m is NOT fitted here and is not claimed as measured. It is craft.js's
  // constant, adopted so that a sea fragment and a coast fragment at the same
  // range are veiled by the same air. If tmp-tr122's proposed 12000 m is ever
  // taken up for the coast, THIS CONSTANT MUST MOVE WITH IT - that is the whole
  // point of it being the same number. ?snum=bx:12000 does it without an edit.
  //
  // ⚠️ The 1700 m mesh edge (renderer.js RMAX) is what the old saturation was
  // really hiding. It is handled below, separately and honestly, instead of
  // being smuggled into the atmosphere.
  vec3 hazeCol = ocSky(skyColor(normalize(vec3(-V.x, 0.02, -V.z)), uSunDir));
  float haze = ${sOn('noatten') ? 'smoothstep(120.0, 1400.0, vDist)'
    : '1.0 - exp(-vDist / ' + snum('bx', 4200.0) + ')'};
  // THE MESH EDGE, named as such. The sea is a polar grid that stops at 1700 m
  // and the sky is drawn behind it, so the outermost ring is a real silhouette
  // that the atmosphere has no reason to hide. This ramp is a RENDERING
  // CONCEALER and is confined to the last 500 m of the grid, which subtends
  // 0.2 px at the 1.6 m approach camera and 2.3 px at the 12 m long-course
  // camera - the whole of it is inside the horizon line. Ablation ?sdbg=noedge
  // says what it is worth; if the seam does not read without it, it goes.
  haze = max(haze, smoothstep(${snum('e0', 1200.0)}, ${snum('e1', 1700.0)}, vDist) * ${sdbg('noedge')});
  col = mix(col, hazeCol, haze * 0.92 * ${sdbg('hazeoff')});
  // <<< SEAOPT-atten

  // ?wdbg=showsurf paints the three shore masks straight out as R = foam
  // coverage, G = breaking share, B = bed return, unlit. ⚠️ NOT untonemapped,
  // whatever this comment used to say: the assignment happens before the last
  // line of the shader, so the masks still go through encode(col * uExposure).
  // A value read off that render is aces() of the mask, not the mask - invert it
  // before quoting a coverage from it, or read it only as "present / absent". The
  // surf zone is one pixel tall at the far cameras, so "is the mask there and
  // this weak, or not there at all" is a question no amount of looking at the
  // finished frame can answer - and the two have completely different fixes.
  // dbg() folds to 1.0 when the switch is absent, so this compiles away.
  col = mix(col, vec3(surf, breaking, shoal), 1.0 - ${dbg('showsurf')});

  // >>> SEAOPT-probe
  // Unflagged the two substitutions below are the empty string, so the only
  // difference from the unfenced build is GLSL COMMENT TEXT plus two blank
  // lines - nothing the compiler can turn into a fragment. Proved by a 19-view
  // pixel diff, not asserted. ?sdbg=hazeamt writes the haze term
  // RAW - no tonemap, no gamma - so a value read off the PNG is the number the
  // shader computed: R = haze (0-1), G = vDist / 2000, B = 1 - F (the share of
  // the pixel that is BODY rather than sky reflection, which is the quantity
  // that decides whether hazing the far sea can be seen at all).
${sOn('hazeamt') ? '  fragColor = vec4(haze, vDist / 2000.0, 1.0 - F, 1.0); return;' : ''}
${sOn('hazecol') ? '  col = hazeCol;' : ''}
  // <<< SEAOPT-probe
  // Dithered for consistency with the sky pass above, not because the water
  // needs it: MEASURED 16.0% identical neighbours on a 500x95 open-sea box,
  // already better than craft.js's dithered beach at 15.4%. The term is
  // zero-mean +-0.5 LSB so it cannot move any colour measurement.
  fragColor = vec4(dither8(encode(col * uExposure), gl_FragCoord.xy), 1.0);
}
`;
}

// >>> POSTFX
// ---------------------------------------------------------------------------
// THE POST PASS (tmp-tr164). GLSL only - the framebuffers, the MSAA resolve and
// the state save/restore are in src/gl/post.js, and renderer.js decides whether
// the pass runs at all.
//
// WHAT THIS IS NOT: it is NOT a tonemap. The ACES curve and the sRGB encode
// stay exactly where they are, per material, in TONEMAP() above, in craft.js
// and in boats.js. Nothing was moved here and nothing here re-grades. The
// texture this shader samples is ALREADY tonemapped, gamma-encoded and dithered
// 8-bit output - the same bytes that used to land straight in the default
// framebuffer.
//
// PROVED, NOT ASSERTED. With uBlur = 0 and uVig = 0 this shader reduces to a
// copy plus one extra +-0.5 LSB dither. Measured on a frozen scene, that whole
// pass against the pass switched off: 9,700 of 314,188 pixels differ (3.1%),
// max delta 2, mean 0.032. The 1 LSB is the added dither and the other 1 is the
// ANGLE blit resolve of the 4 MSAA samples rounding differently from the
// browser's own resolve of the default framebuffer. Numbers in
// tmp-tr164/RESULT.md section 4.
//
// TWO CONSEQUENCES OF SAMPLING ENCODED 8-BIT COLOUR, both handled:
//   1. Averaging gamma-encoded samples darkens a bright streak - sun glitter
//      smeared across a dark sea loses most of its energy. So the blur
//      accumulates c*c and takes a sqrt at the end. That is a gamma-2.0
//      approximation of a linear-light average: one multiply per tap and one
//      sqrt per pixel, against 16 pow() calls for the exact thing.
//   2. Multiplying by a smooth vignette ramp on 8-bit values bands. The output
//      is re-dithered with the same +-0.5 LSB hash the sky and water use.
//
// DEPTH. gl_FragDepth is written from the resolved scene depth. This is not
// decoration: raid-actors.js and rescue-actors.js draw into the DEFAULT
// framebuffer after SeaRenderer.draw() has returned, and they depth-test
// against the scene. Without this line a longship would float in front of the
// pier it is moored against. post.js has the measurements behind the choice.
//
// NO LENS DROPLETS. They were built here and cut. See post.js.
// ---------------------------------------------------------------------------
export const POST_VERT = `#version 300 es
// Fullscreen triangle. Same gl_VertexID trick as SKY_VERT: no attributes, no
// buffer, no VAO contents - three vertices that cover the clip cube.
out vec2 vUV;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  gl_Position = vec4(p, 0.0, 1.0);
  vUV = p * 0.5 + 0.5;
}
`;

// Taps along the blur ladder. MEASURED, 884x405 and 1920x1080 on an RTX 3090:
// one tap costs 0.0024 ms/frame at 1080p, so the whole ladder is ~0.04 ms and
// the count is decided by the picture, not the budget. 8 taps COMB - the pier
// railing and the big wheel at the left edge of tmp-tr164/shots/B_on.png show
// eight discrete copies of every thin member, because jitter breaks up noise
// but not a repeating high-contrast structure. 16 closes them.
const POST_TAPS = 16;

export const POST_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uScene;
uniform sampler2D uDepth;
// Blur centre in UV. NOT the screen centre: it is where the craft is going,
// projected through the same camera basis the sky pass uses, so in a hard turn
// the sharp point swings to the outside of the turn and the frame smears past
// it. Falls back to (0.5, 0.5) whenever the direction of travel is unknown or
// behind the camera.
uniform vec2 uFocus;
uniform float uBlur;      // 0 = off; the fraction of the focus-to-pixel span smeared
uniform float uVig;       // 0 = off; darkening at the outer radius
uniform float uVigR0;     // inner radius of the vignette ramp, in half-frame units
uniform float uAspect;
uniform float uJitter;    // 0 or 1 - dither the tap ladder

// The same hash the sky and water passes dither with, kept here verbatim rather
// than imported, for the reason TONEMAP() gives about template-literal
// evaluation order. If you change one, change all three.
float postHash(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

vec3 postDither(vec3 q, vec2 frag) {
  float b = postHash(frag);
  vec3 d = fract(b + vec3(0.0, 0.33333333, 0.66666667)) - 0.5;  // +-0.5 LSB
  return q + d * (1.0 / 255.0);
}

void main() {
  // PUT THE SCENE DEPTH BACK. Everything drawn into the default framebuffer
  // after this pass - the raid longships and crews, the rescue actors - reads
  // it. See post.js.
  gl_FragDepth = texture(uDepth, vUV).r;

  // ---- speed blur ----------------------------------------------------------
  // A zoom blur about uFocus: every tap walks from this pixel toward the focus,
  // so the centre of travel stays sharp and the frame edges streak. That is the
  // shape a forward-moving camera actually produces, and it is why it reads as
  // speed rather than as an out-of-focus lens.
  vec2 dv = vUV - uFocus;
  float rr = length(dv * vec2(uAspect, 1.0));
  // No smear at all in the first few percent around the focus, ramping to full
  // by two thirds of the way out. Without the ramp the sharp point is a single
  // pixel and the middle of the frame mushes.
  // The ramp used to be smoothstep(0.06, 0.72, rr): smear beginning 6% out from the
  // focus and reaching full strength well inside the frame, so nearly every pixel
  // was moving and the sharp region was a dot. Starting at 0.42 and not reaching
  // full until past the corner (1.05) keeps the middle of the frame - where the
  // craft, the rider and whatever you are aiming at actually live - properly sharp,
  // and puts the motion in peripheral vision where the eye reads it as speed.
  float amt = uBlur * smoothstep(0.42, 1.05, rr);
  // Dither the ladder by up to half a step, so what is left of the ghosting
  // reads as grain - which the eye takes for motion - rather than as copies.
  float j = (postHash(gl_FragCoord.xy) - 0.5) * uJitter;
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < ${POST_TAPS}; i++) {
    float t = (float(i) + 0.5 + j) / float(${POST_TAPS});
    vec3 c = texture(uScene, uFocus + dv * (1.0 - amt * t)).rgb;
    // Weighted toward the unsmeared end, so a still frame is not softened and
    // the streak trails off behind the object rather than straddling it.
    float w = 1.0 - 0.55 * t;
    acc += c * c * w;
    wsum += w;
  }
  vec3 col = sqrt(acc / wsum);

  // ---- vignette ------------------------------------------------------------
  // Elliptical, in half-frame units, so it is the frame's own shape at any
  // aspect: 1.0 at the middle of the short edges, 1.414 in the corners.
  col *= 1.0 - uVig * smoothstep(uVigR0, 1.45, length((vUV - 0.5) * 2.0));

  fragColor = vec4(postDither(col, gl_FragCoord.xy), 1.0);
}
`;
// <<< POSTFX
