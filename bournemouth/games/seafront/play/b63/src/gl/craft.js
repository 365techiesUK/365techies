// The board, the foil and the rider, lit by the same sky as the water.
//
// The lighting is what does the heavy lifting here. A procedural mesh with no
// texture reads as plastic under a directional light and as an object under a
// sky: the ambient term samples the analytic sky in the surface normal's
// direction, which is cheap image-based lighting and costs one extra call.
//
// Submerged parts are attenuated by depth in the fragment shader rather than
// hidden or alpha-faded, because that is both what water actually does and what
// keeps the wing legible - and seeing the wing is the entire skill of the game.

import { link, uniforms, buffer } from './core.js';
import { SKY_GLSL } from './shaders.js';
import { buildBoard, buildFoil, buildRider, RIDER_MAT } from './meshes.js';
import { SHADOW_GLSL, ATTRIBS } from './shadow.js';
import { NORMALMAP_GLSL } from './textures.js';

// Weather, 0 = the clear low-sun day this was built for, 1 = flat overcast.
// A shared mutable rather than a parameter threaded through every draw
// signature - one value, read by three shader programs. Set it from main.js.
export const OVERCAST = { v: 0 };

const SHADOW_UNIFORMS = ['uShadowMap', 'uLightViewProj', 'uShadowTexel'];
const COAST_TEX_UNIFORMS = ['uHasTex', 'uCliffA', 'uCliffN', 'uSandA', 'uSandN',
  'uTimberA', 'uTimberN', 'uConcA', 'uConcN'];

// ---------------------------------------------------------------------------
// OUTPUT DITHER - the last thing that happens to a colour in this file.
//
// Every pass draws STRAIGHT TO THE DEFAULT FRAMEBUFFER: renderer.js runs sky,
// water, coast and craft in turn and there is no post pass and no intermediate
// float target, so whatever encode() returns is rounded onto the canvas's 1/255
// grid by the hardware. On a slow gradient that grid IS the banding.
//
// MEASURED on the side566 render at 560x996 before this was added:
//     foreground sand   76.9% of vertically adjacent pixels byte-identical,
//                       longest plateau 61 px, longest horizontal run 122 px,
//                       62 distinct colours in a 440x155 box
//     mid beach         48.9% identical, plateau 26 px, run 89 px
//     just under surf   14.1% identical, plateau 9 px
// Contrast-stretch that crop and it is hard terraces, and the beach is the
// largest single surface in a shot from the water. It is not only the beach:
// the head building's wall in the approach camera was 51.9% identical with a
// 32 px plateau, and it is 13.7% / 9 px now.
//
// ⚠️ Every number here was rendered through a PRIVATE Chrome on a private debug
// port. tools/render_cdp.mjs hard-codes port 9333 and, when another session
// already owns it, fetches THAT browser's /json/version and drives it at THAT
// browser's viewport - a job asking for 560x996 came back 872x399, silently,
// twice this run. It also never sends setDeviceMetricsOverride when the job
// matches jobs[0], so even uncontended it returned 534x895 for a 560x996 job.
// Check the size of any render you are about to draw a conclusion from.
//
// The fix is one zero-mean value, uniform over +-0.5/255, added AFTER the gamma
// encode and before the hardware rounds. The probability of rounding up then
// equals the fractional part of the true value, so the LOCAL MEAN is exactly
// what encode() produced and a step boundary becomes a dissolve rather than a
// contour. One LSB peak-to-peak is the smallest amplitude at which the EXPECTED
// output equals the input for every fractional part - below it a value near a
// level boundary keeps a residual DC error, which is the banding - and it is
// far below what reads as film grain, which is the other way this goes wrong.
// Verified on the shipped frames: 25% of channel samples ON A DITHERED SURFACE
// move, half up and half down, and NOTHING anywhere in any of the five judged
// cameras moves by more than one level. Frame mean luminance is unchanged to
// 0.01. ⚠️ 25% is the rate over dithered pixels, NOT over the frame: an
// adversarial re-measure of the side566 A/B pair got 25.07% over the beach and
// 12.01% over the whole frame, the difference being the undithered sky and sea
// below. Divide by coverage before comparing two frames' rates.
//
// ⚠️ THIS DOES NOT MOVE THE PHOTOMATCH BANDS TO ANY USEFUL PRECISION. Do not
// add amplitude trying to make it. tools/photomatch.py autocontrasts, runs
// FIND_EDGES, and thresholds at 110. The kernel response is 3 for a straight
// 1-level step and 8 for an isolated 1-level pixel - both confirmed on a
// synthetic pair pushed through photomatch.edges() rather than derived on
// paper - so the score is 3*gain and 8*gain. ⚠️ THE GAIN IS THE FRAME'S, NOT A
// CONSTANT: it is 255/(hi-lo) of the greyscale, re-measured at 1.30 on the
// current side566 render (extrema 53..249) where an earlier pass recorded 1.27.
// At 1.30 that is 3.9 and 10.4, so the detector needs a ~28-level local jump
// before it fires - re-measure the gain, do not quote it. Quantisation
// contouring is invisible to it. Measured on the side566 render at 560x996,
// bands 4 and 5 have 166 and 444 hot pixels and EVERY ONE of them is on the
// image border - interior edge density is exactly 0.0000 both before and after.
// Their reported values are 4/W and 4/W + 2/(H/6), a closed form in the image
// SIZE that predicts the measured 0.0071/0.0191 at 560x996 and 0.0075/0.0207 at
// 534x895 without reading a single pixel. Only bands 2 and 3 carry signal.
//
// DETERMINISTIC, and a function of gl_FragCoord ONLY. No time, no frame index,
// nothing hashed off a clock, no Math.random anywhere near it. The same pixel
// of the same frame encodes to the same byte on every run, which record/replay
// requires. It also means the pattern does not CRAWL between frames, and that
// is what keeps a 1-LSB dither invisible in motion: an animated one at the same
// amplitude is exactly the film grain this was warned against.
//
// FOUR NOISES WERE BUILT AND RENDERED, not argued about. Same camera, same
// amplitude, same boxes; the beach numbers are vertically-adjacent pixels that
// are byte-identical / longest vertical plateau / longest horizontal run:
//
//   noise                 beach far      beach mid      beach near (fg sand)
//   none                 14.1%  9  35   48.9% 26  89   76.9% 61 122
//   Bayer 8x8 ordered     5.9%  7  12   16.3% 18  38   22.0% 32  24
//   Bayer + hash jitter   5.7%  7  12   15.8% 17  19   21.5% 27  23
//   white-noise hash      6.4%  5  11   20.3% 13  19   29.3% 15  19
//   interleaved gradient  3.7%  4  13   10.6% 15  15   15.2% 16  21
//
// Interleaved gradient noise wins everywhere and it is what ships. Two results
// in that table are worth keeping, because both contradict the obvious guess:
//   - The ordered matrix is NOT best, and it is worst on the long runs. A
//     column of pixels only ever sees the 8 matrix entries in its own x mod 8,
//     so its effective resolution is 1/8 of a level, not 1/64 - which is why it
//     still leaves a 32 px plateau in the flattest sand.
//   - Jittering inside each Bayer stratum was meant to fix exactly that and
//     BARELY MOVED IT (22.0 -> 21.5%). Sub-stratum jitter of under 1/64 of a
//     level almost never changes a rounding decision; the stratum a column can
//     reach is the constraint, and jitter does not change that.
// So do not "improve" this back to an ordered matrix. It was measured.
//
// The three channels are offset by a third of a level. Without that they flip
// on the same pixels and the dither becomes a LUMINANCE pattern; offset, it is
// mostly chroma, which the eye resolves far less well at this amplitude.
//
// Multiply, add and fract on highp only - no sin, no transcendental, no
// texture fetch. On one machine that is bit-identical every run, which is what
// replay needs; across drivers GLSL ES 3.0 only promises these ops to 1 ULP, so
// a different GPU could in principle differ on a pixel sitting exactly on a
// dither threshold. That is a framebuffer byte, not a simulation input - the
// record/replay guarantee is over the plant state, and nothing here feeds it.
// The dot() stays well inside float precision at any viewport this game will
// open: 4000 px maps to about 280 before the fract, leaving ~16 fraction bits.
//
// ---------------------------------------------------------------------------
// RE-VERIFIED 2026-08-20 by a later pass, on a PRIVATE debug port. Nothing
// above was taken on trust: this file is where a comment stating a number is
// cheapest to write and most expensive to believe, so every claim in it was
// rendered again and re-measured. All of them held. What follows is the
// evidence, and then the one thing this file cannot reach.
//
// A/B, side566 at 560x996, same camera, the amplitude below toggled 1.0 -> 0.0
// and back. Columns are vertically-adjacent byte-identical pairs / longest
// vertical plateau / longest horizontal run / distinct colours in the box.
//
// ⚠️ QUOTE THE BOX OR THE ROW IS UNREPRODUCIBLE. The first draft of this table
// gave four rows without them and NONE of the four could be recomputed: an
// adversarial pass re-rendered the identical frame - byte-identical over the
// whole beach - and got 14.1/48.9/76.9 where the row said 10.1/44.6/78.5. The
// measurement was real; the box was a private one, so the number was dead on
// arrival. These are the boxes measure.py `boxes()` already defines, which is
// also what the noise table above was measured on:
//
//   box                     x0,y0,x1,y1     DITHER OFF            DITHER ON
//   beach far      side566   60,600,500,660  14.1%   9   35  74   3.7%  4  13 132
//   beach mid      side566   60,675,500,800  48.9%  26   89  61  10.6% 15  15 114
//   beach near     side566   60,830,500,985  76.9%  61  122  62  15.2% 16  21 109
//   head bldg wall approach 470,228,540,250  62.7%  22   24 126  12.4%  9   5 237
//
// The three side566 rows now reproduce the noise table above in ALL SIX of its
// numbers - the "none" row and the "interleaved gradient" row, ident% included,
// not just the plateaus and runs. That table is real.
//
// AMPLITUDE, measured not asserted. Over 186,252 channel samples the ON-minus-
// OFF delta histogram is {-1: 11355, 0: 163826, +1: 11071}: nothing anywhere
// moves by more than ONE level, up and down are within 1.3% of each other, and
// frame mean luminance moves by -0.0014 of a level. Do not add amplitude.
//
// DETERMINISM, proved twice. (a) All five judged cameras plus side566, rendered
// through two independently launched browsers, came back BIT-IDENTICAL - 0
// differing pixels in 2.8 M. (b) Stronger, because a frozen frame could pass
// (a) by luck: the sign of every one of the 22,426 channel samples that moved
// agrees with the interleaved-gradient value recomputed offline from
// gl_FragCoord alone. 22,426 / 22,426 = 100.00%. No time term, frame index or
// Math.random in the path could survive that test.
// ⚠️ 100.00% IS THE SAMPLED REGION, NOT A LAW. Re-run adversarially over ten
// times the sample - 227,391 moved channel samples across approach + side566 -
// it is 227,373 / 227,391 = 99.992%. Re-run again a build later, on 227,409
// moved samples: 227,391 / 227,409 = 99.9921%. Both runs find exactly EIGHTEEN
// misses; all but one sit at |d| = 0.4999x, i.e. the offline double and the GPU
// highp float landed on opposite sides of the fract() wrap (the odd one out is
// at 0.483). That is the 1-ULP caveat four paragraphs below, showing up
// exactly where it was predicted to. Quote 99.99%, not 100%; a time term would
// score 50% (measured: recomputing with gl_FragCoord flipped to y-down scores
// 49.78% on approach and 50.00% on side566).
//
// CHROMA NOT LUMINANCE is a GUARANTEE here, not a tendency. Three points spaced
// 1/3 apart on the unit circle can never all land in the same half, so at most
// two of the three channels can ever move the same way. Counted over a whole
// 900x500 frame: (1,1,1) and (-1,-1,-1) occur ZERO times in 450,000 pixels.
//
// THE PHOTOMATCH BANDS DID NOT MOVE, exactly as predicted above: 1.0 / 1.0 /
// 1.5 / 13.9 / 41.5 / inf before and 1.0 / 1.0 / 1.5 / 13.9 / 41.5 / inf after.
// ⚠️ BAND 3 IS NOT THIS FILE'S TO OWN. Its rows are 498-664, which is the pier
// substructure, so its absolute value tracks whatever the pier modules are
// doing - it read 13.7 an hour before this line and 13.9 after another session
// touched pier-people-scale.js, with the dither untouched. A/B it, never trend
// it: only the BEFORE-vs-AFTER pair inside one controlled run means anything.
// The border claim was re-checked pixel by pixel rather than re-asserted -
// bands 4 and 5 carry 166 and 444 hot pixels and the INTERIOR count is 0 and 0,
// before and after. Band 3's signal is entirely in rows 498-582, which is the
// surf line and the pier substructure; below row 582, the beach proper, the
// detector fires on nothing but the two border columns - re-measured at exactly
// 2 hot pixels per sampled row, all the way down to row 662, interior 0. The
// beach contributes NO INTERIOR edge signal in any band. Those ratios are a
// closed form in the image size; the dither moves band 3 by 0.3% (0.1948 ->
// 0.1954, 4527 -> 4541 hot pixels, measured on a controlled 560x996 A/B - and
// re-measured 0.1906 -> 0.1917 on an earlier build of the pier, same 0.3-0.6%
// either way) and band 2 by 0.1%, under a tenth of the rounding on a ratio.
// Do not try to move them further, and do not read them as a sand defect.
//
// ⚠️ WHAT THIS FILE CANNOT REACH, AND IT IS THE BIGGER HALF OF THE FRAME.
// renderer.js draws sky -> water -> coast -> craft with gl.BLEND disabled
// throughout (renderer.js:97), so every pixel is written exactly once and is
// dithered exactly once - but only the last two of those four passes live here.
// The SKY and WATER passes encode through shaders.js's own TONEMAP() helper and
// are NOT dithered. ⚠️ DO NOT TRUST A shaders.js LINE NUMBER HERE: an earlier
// draft of this block said :448 and :1237 and both were stale inside the hour,
// because a second session is writing that file. Grep `TONEMAP()` for the two
// interpolation sites and `fragColor =` for the two writes. Same statistic,
// same renders, ident% / vplat / hrun / distinct colours:
//
//   surface                                   ident%   vplat  hrun   cols
//   sky OVERCAST   side566, 440x200 box        96.7%    146   440     10
//   sky sunny      along-neck, clear blue      37.3%     27   109    571
//   sky sunny      approach, clear blue        44.3%      4    65     97
//   SEA            approach / head / arcade   1.3-4.9%   4-9  14-34  1.3-4.5k
//   beach, THIS FILE, dithered                 15.4%     16    21    108
//
// AND HERE IS THE SIZE OF THE HOLE, WHICH NOBODY HAD PUT A NUMBER ON. Measured
// by A/B on the sandbox pair and calibrated against a region that is entirely
// coast (P(a dithered pixel moves) = 0.6012), the share of each judged frame
// this file's dither actually reaches:
//
//   camera        dithered   UNTOUCHED (sky + sea)
//   approach          8%          92%
//   entrance         15%          85%
//   head             34%          66%
//   along-neck       39%          61%
//   arcade           41%          59%
//   side566          48%          52%
//   chase (rig=1)     5%          95%
//
// The APPROACH camera is the brief's judged viewpoint - from the water at
// 150-400 m - and this file reaches under a twelfth of it. Read every claim
// above with that number attached: they are all true, and they are true about
// 8% of the frame that matters most.
//
// Two conclusions, and they point opposite ways:
//   - THE SKY NEEDS THIS. An overcast sky is TEN distinct colours over a
//     440x200 box, with every row a single flat value across its entire width,
//     and it is 53% of the side566 frame. Even sunny, with the cloud layer in,
//     the clear blue between clouds still runs 109 px of one byte.
//   - THE SEA DOES NOT, and this contradicts the obvious guess. Measured,
//     UNDITHERED water already scores better than this file's DITHERED beach on
//     every count - wave normals and glitter self-dither it. Do not spend a
//     pass there. One line inside TONEMAP() would cover both anyway.
//
// ⚠️ Do NOT wire that by importing DITHER_GLSL from this file. craft.js reads
// SKY_GLSL from shaders.js inside a template literal at module-evaluation time,
// so shaders.js importing back is a cycle and whichever module is entered
// second reads a const still in its temporal dead zone - a blank screen with no
// error. Copy the four lines. This tree already duplicates aces()/encode()
// between the two files for exactly that reason.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ?cdbg=legacy - ABLATION SWITCH FOR THE TEXTURE/PALETTE EXPRESSION BELOW.
//
// The texMean change (see the long block in COAST_FRAG) is the highest-blast-
// radius edit in this file: it moves every textured surface in the scene. The
// only honest way to judge it is a BEFORE/AFTER pair from ONE build, in ONE
// browser, seconds apart - and this tree cannot get that by editing the file
// and re-rendering, because FIVE other sessions are writing coast.js, pier.js
// and the pier-* modules continuously. Measured this run: pier-arcade-underside
// .js and pier-railings-parapet.js both changed mtime DURING my render window.
// An edit-render-revert-render A/B would have silently attributed their
// geometry to my expression.
//
// So the switch is compile-time, exactly like shaders.js's wdbg(): with the
// flag absent this emits the literal token `texDom` and the shader source is
// BYTE-IDENTICAL to having no switch at all - verified by diffing the emitted
// COAST_FRAG string, not by reading this comment. With ?cdbg=legacy it emits
// `1.0`, which pins every material back on t.rgb * (0.78 + vColor * 0.55).
//
// Guarded on `location` so node tooling can import this file.
// ⚠️ NO BACKTICKS BELOW THIS LINE - template-literal rule, same as shaders.js.
// ---------------------------------------------------------------------------
const CDBG = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
  ? (new URLSearchParams(location.search).get('cdbg') || '') : '').split(',');
const TEXDOM = CDBG.includes('legacy') ? '1.0' : 'texDom';
// ?cdbg=picketnear — paint the MAT.PICKET panel as a mask of its own near
// weight pw (dark blue = panel untouched, red = full near blend), so the exact
// pixels the distance knee reaches can be diffed against the judged bands
// before any brightness claim is made (this file's own rule: map a mask before
// you name it). Compile-time like TEXDOM: with the flag absent the injected
// string is empty and the emitted shader is byte-identical to the clean one.
const PICKDBG = CDBG.includes('picketnear')
  ? 'col = mix(vec3(0.0, 0.0, 0.6), vec3(1.0, 0.0, 0.0), pw);' : '';

// ?cdbg=lightdbg - DIAGNOSTIC ONLY (tmp-tr105). Emits the lighting terms as
// colour instead of the shaded pixel, so the wall/sky defect can be mapped
// before anything is changed:
//   R = ndl (the diffuse term), G = sh (the shadow term),
//   B = N.y * 0.5 + 0.5 (0.0 = normal points straight DOWN).
// ?cdbg=geomdbg - R = |dot(shading normal, geometric facet normal)|, which is
// 1.0 where the interpolated normal is honest and 0.0 where it is 90 deg wrong
// (a pbox side face, whose only vertex normals are +-Y). G = N.y*0.5+0.5,
// B = gN.y*0.5+0.5. Compile-time like TEXDOM: with the flag absent the
// injected string is empty and the emitted shader is byte-identical.
// ?cdbg=norepair - ABLATION SWITCH FOR THE FACET-NORMAL REPAIR in COAST_FRAG.
// Forces the repair weight to 0, which restores the exact pre-2026-09-18
// behaviour (pbox side faces resolve to N = (0,-1,0)). This is how the repair
// is LOCALISED: with the flag on, every judged camera must render BIT-IDENTICAL
// to the tree before the change, so any pixel that moved is provably the
// repair and nothing else. Compile-time, like TEXDOM.
// ?cdbg=repairmask - paint the repair weight instead of the shaded pixel:
// dark blue = the shading normal was left alone, RED = fully replaced by the
// facet normal. Map the mask before naming a surface (this file's own rule).
const NOREPAIR = CDBG.includes('norepair') ? ' * 0.0' : '';
// >>> SANDVC  (tmp-tr121, 2026-09-18)
// ?cdbg=nosandvc - ABLATION SWITCH FOR THE SAND PATCH MULTIPLIER.
//
// THE DEFECT. The owner's complaint is that the beach reads as card. Measured
// ALONG THE SHORE, one image row at a time, converted to ground metres (a beach
// at a grazing angle is anisotropic by 30:1, so a square block average compares
// two scales at once and means nothing), the relative sd of beach luminance is:
//
//     boxcar          raw     1 m      2 m      4 m
//   0566.jpg        0.0912  0.0725   0.0590   0.0535   OVERCAST, owner
//   0659.jpg        0.0896  0.0718   0.0591   0.0538   OVERCAST, owner
//   render BEFORE   0.0125  0.0078   0.0060   0.0042
//
// A factor of 9.3 at 1 m and 12.7 at 4 m, and the gap WIDENS with scale, which
// is the signature of "all the variation we have is grain".
//
// WHERE IT COMES FROM, AND WHY IT IS NOT THE VERTEX COLOUR. tmp-tr113 proved
// vColor is an additive trim here (sensitivity 0.310/0.262/0.172) and that is
// true, but it is not the whole story and on its own it points at the wrong
// fix. t.rgb is the BASE of the legacy line, so the TEXTURE's own contrast
// passes at sensitivity 1.0 - and assets/sand-albedo.png carries a linear
// relative sd of only 0.0491, 90% of it below 0.7 m on the ground. Predicted
// rendered CV = 0.0491 * 0.709 (the two-sample sum halves relative sd) * 0.4545
// (sRGB) = 0.0158, against 0.0125-0.0132 measured. THE FLAT BEACH IS THAT
// NUMBER. The lever with full authority was already there and it was empty.
//
// WHY NOT SIMPLY GIVE vColor AUTHORITY. Because coast.js's sand ramp is the
// WRONG SIGN and the legacy line is currently hiding it: the ribbon runs
// C.sandDry #D7C39B to C.sandDamp #B49A70 seaward, a linear per-channel ratio
// of 0.666/0.592/0.504, i.e. the model darkens the sand toward the water by
// 0.62 in luminance, where the owner's own frames say it BRIGHTENS by 1.070
// (tmp-tr113 section 2.1, same-frame against the pier's white wall). Under the
// legacy line that error arrives as 0.666^0.310 = 0.88 and is further masked by
// tmp-tr113's damp sheet; under a multiplicative vColor it would arrive at 0.62
// and the beach would go dark at the water's edge. A vColor-authority change is
// therefore owed a coast.js palette correction in the SAME commit, and that
// file is not this pass's. Written up in tmp-tr121/RESULT.md with the numbers.
//
// WHAT THIS SWITCH ABLATES. The patchwork ships as a MEAN-ONE multiplier in the
// ALPHA channel of assets/sand-albedo.png (RGB is byte-identical to the file
// before this pass, so nothing about the settled beach tone moves). Three taps
// of it at world gains 0.09 / 0.0313 / 0.0097 give features at 1.39 / 4.0 /
// 12.9 m; the weights 0.25/0.35/0.40 and the gain below are FITTED to the two
// rows of the table above (tmp-tr121/fit3.py, rmse 7.6% over 1/2/4 m).
// ⚠️ THE FIT WAS WRONG THE FIRST TIME AND THE RENDER IS WHAT CAUGHT IT, so the
// method is worth stating: the target numbers come from image rows spanning
// 13.2 m of beach, and fit2.py simulated 80 m rows. A window shorter than a
// feature absorbs that feature into the row mean, so the simulation counted
// power the measurement can never see and the first bake landed at 0.49 of
// target. ANY re-fit must use the same window as the measurement it is aimed
// at. fit3.py also stopped taking sd/mean of a UNIT-SD field, where the local
// mean passes through zero and the statistic is meaningless.
// With ?cdbg=nosandvc the gain is 0.0, sandPatch is exactly vec3(1.0), and the
// render must come back BIT-IDENTICAL to the tree before this change - which is
// how the change is localised. Compile-time, exactly like TEXDOM and NOREPAIR.
//
// THE FORM IS EXPONENTIAL, NOT LINEAR, AND THAT IS NOT DECORATION. The fitted
// amplitude is a LINEAR relative sd of 0.249 - a p90:p10 of 1.94, i.e. the damp
// patches really are about twice the reflectance of the dry ones - and at that
// amplitude 1.0 + gain * d goes NEGATIVE in the tail of the field (the baked
// alpha spans 10..249, so d reaches -0.461 and a linear gain of 2.355 would put
// the multiplier at -0.085). A clamp would leave flat black-floor blobs. The
// exponential cannot go negative at any d, needs no clamp, and a LOGNORMAL
// reflectance ratio is the natural model for "this patch is twice as damp".
//
// SANDVC_K = 3.8813 = sd_ln / (ln2 * sd_d), where sd_d = 0.10573 = 0.18 *
//            sqrt(0.25^2 + 0.35^2 + 0.40^2) is the sd of the weighted tap sum
//            and sd_ln = sqrt(ln(1 + 0.2903^2)) = 0.28445 is the log-sd that
//            gives a relative sd of 0.2903. That is the fit's 0.249 times 1.166,
//            and the 1.166 is MEASURED, not chosen: at 0.249 the render came
//            back at 0.81 of the simulation at 1 m and 2 m, because the sampler
//            sees the beach at 30:1 anisotropy and EXT_texture_filter_anisotropic
//            is capped at 8 in textures.js - and SwiftShader will not go past 8
//            anyway (tested: a sand-only cap of 16 rendered BIT-IDENTICALLY).
//            1.166 is the least-squares scale that puts the 1/2/4 m columns back
//            on the photograph, rmse 5.2%.
// SANDVC_N = 0.96035 = exp(-sd_ln^2 / 2), which is what makes the multiplier
//            MEAN EXACTLY ONE. Without it the whole beach lifts 3%, which is
//            why the ablation switches BOTH tokens and not just the gain.
// WARNING ALL THREE NUMBERS MOVE WITH THE PNG. 0.5000001 is the baked mean of
// that alpha channel, printed by tools/gen-textures.mjs, and 0.18 is its baked
// sd (0.5 * PATCH_S). A stale value here re-tints every sand surface in the
// scene in exactly the way a stale texMean does.
const SANDVC_K = CDBG.includes('nosandvc') ? '0.0' : '3.8813';
const SANDVC_N = CDBG.includes('nosandvc') ? '1.0' : '0.96035';
// <<< SANDVC
const REPAIRMASK = CDBG.includes('repairmask')
  ? 'col = mix(vec3(0.0, 0.0, 0.6), vec3(1.0, 0.0, 0.0), repair);' : '';
const LIGHTDBG = CDBG.includes('lightdbg')
  ? 'fragColor = vec4(ndl, sh, N.y * 0.5 + 0.5, 1.0); return;' : '';
const GEOMDBG = CDBG.includes('geomdbg')
  ? 'vec3 gg = normalize(cross(dFdx(vWorld), dFdy(vWorld))); if (dot(gg, V) < 0.0) gg = -gg; fragColor = vec4(abs(dot(normalize(vNormal), gg)), N.y * 0.5 + 0.5, gg.y * 0.5 + 0.5, 1.0); return;' : '';

// >>> ENVREF  (tmp-tr192, 2026-09-20)
// THE DEFECT, measured from pixels rather than read off the source. boat-pwc.js
// asks for roughness 0.26 on the hull, 0.28 on the deck, 0.30 on the two-tone
// hood, 0.22 on the bar tube and 0.05 on the glass - five glossy materials. The
// shader below had exactly ONE specular term for all of them,
//     pow(max(dot(N,H),0.0), mix(6.0,220.0,1.0-uRough)) * fres * 1.6
// an un-normalised white Blinn lobe whose PEAK value, at head-on incidence
// where fres is its minimum 0.04, is 0.064 - and no environment term at all. So
// a gelcoat hull that should be mirroring sky, sea and beach produced one faint
// dot when the sun happened to line up, and read as matte plastic everywhere
// else. The gloss was written down and never rendered.
//
// WHAT IS ADDED, and for each piece, where it is the cheap form and not the
// right one:
//
//  1. ENVIRONMENT REFLECTION. skyColor() is already included in this file (the
//     water shader uses it as ITS reflection source) and is evaluable from any
//     ray direction including ones pointing down, so the expensive part already
//     existed. One extra skyColor() along reflect(-V, N) is the whole cost.
//     THE DOWNWARD HEMISPHERE IS THE HAZED FAR WATER, NOT THE NEAR SEA.
//     skyColor() resolves rays below the horizon to COAST_TINT * 0.65, which is
//     the 4 km haze. A hull reflects the water 0.3 m under its chine, which is
//     darker and greener than that. Substituting a near-sea colour would mean
//     duplicating the sea body constants into this file where they could
//     silently diverge from the sea shader - so instead craft and sea now agree
//     about what lies below the horizon, and the price is that a steeply
//     downward reflection on the underside is brighter and greyer than it
//     should be. Said out loud because it is a KNOWN error, not an unknown one.
//     It is also mostly out of shot: at the chase and side cameras you see
//     topsides and sheer, not the garboard.
//  2. ROUGHNESS BLURS THE REFLECTION BY A COLOUR LERP. With an analytic sky
//     there is no prefiltered mip to sample, so the mirror colour is lerped
//     toward the hemisphere-around-N estimate this shader ALREADY computes for
//     its ambient term, by roughness. That destination is what a roughness-1
//     lobe converges to, so both ends are right and the middle is a straight
//     line drawn between them. IT IS AN APPROXIMATION, NOT A PREFILTER: at
//     roughness 0.26 a real GGX lobe (alpha 0.068) is far tighter than a 26%
//     lerp, so the shipped hull reflection is blurrier than the physics. It
//     costs nothing extra - skyAmb is computed either way - and the error is in
//     the safe direction, because too soft reads as a hull and too sharp reads
//     as chrome.
//  3. THE SUN DISC IS TAKEN BACK OUT OF THE ENVIRONMENT TERM. skyColor() draws
//     its own sun as disc * 30.0 * SUN_TINT, attenuated below the horizon by
//     the same smoothstep(0.0,-0.12,up) it uses for the far water. Left in, a
//     mirror-sharp reflection of a 1.3 deg disc at 30x is a single hard white
//     dot - precisely the artefact this pass exists to remove - AND it would be
//     double-counted against the lobe in 4. Subtracting it with its own
//     attenuation removes it exactly. The Mie HALO is deliberately kept: that
//     is real aureole and a glossy hull should show it.
//  4. AN ENERGY-NORMALISED SUN LOBE. GGX D with alpha = roughness^2, and
//     Hammon's cheap height-correlated visibility (GDC 2017). GGX D integrates
//     to 1 by construction, which is exactly what the old pow() lacked: at
//     roughness 0.05 the old form was a near-delta spike and at 0.9 a broad
//     wash worth almost nothing, both wrong in the same shader. ALPHA IS
//     WIDENED BY THE SUN'S OWN ANGULAR RADIUS: at roughness 0.05 the unwidened
//     lobe is alpha 0.0025, sharper than the solar disc itself, which is not a
//     material property but a modelling error. Because D integrates to 1 either
//     way the widening costs no energy and needs no renormalisation.
//  5. ENERGY CONSERVATION. Everything the reflection gains, the diffuse loses:
//     (direct*0.55 + ambient) is multiplied by (1 - F) and the environment is
//     added at F. Without that the whole craft simply gets brighter and the
//     result is a tone bug wearing a realism badge. F is Schlick with F0 0.04
//     and the roughness-capped F90, max(1-rough, F0), which keeps a rough
//     surface from going full mirror at grazing. What is NOT done is the
//     split-sum DFG term and its multiple-scattering compensation; without a
//     BRDF LUT the craft loses a few percent of energy at high roughness, and
//     the highest roughness on it is 0.35.
//  6. WETNESS. Nothing on the craft or the rider darkened or glossed where
//     water actually runs. The band is measured from the fragment's height
//     above the INSTANTANEOUS LOCAL water surface - uWaterY, one float, sampled
//     on the CPU from the same Sea object the physics reads, at the craft's own
//     (x, z). It is not an invented uniform: the draw call already holds
//     sim.sea and sim.time, and boats.js already samples exactly this for its
//     spray floor. The band is 0.00 m (the surface itself) to 0.29 m, and 0.29
//     is sheerY(0) = 0.288 in boat-pwc.js, the top edge of the topsides at
//     midships, which is where a running PWC carries its wetted line. Above it
//     a hull is wetted by SPRAY, which is another builder's subsystem this pass
//     does not touch. A speed-dependent bow soak was considered and NOT built:
//     its band height would have been a number with nothing to calibrate it
//     against, and this file's rule is to map a thing before naming it.
//     WET DOES NOT MEAN DARK ON THIS MATERIAL, and that is the finding.
//     Gelcoat is not porous, so wetting it does not soak pigment the way it
//     does sand. What a water film does is (a) return light to the substrate by
//     total internal reflection at the film's inner face and (b) replace the
//     paint's microsurface with an optically smooth one. (b) is the large
//     effect and (a) is the small one. (a) is solved, not guessed: a fraction
//     Ri = 1 - 1/n^2 = 0.43468 at n = 1.33 of the light leaving the substrate
//     is reflected back into it, and summing that geometric series gives
//     a_eff = a (1 - Ri) / (1 - a Ri). That is a 19% drop on a 0.70 white and a
//     43% drop on a 0.05 navy - dark paint darkens MORE in relative terms,
//     which is what a wet dark hull does.
//
// ABLATION. ?cdbg=noenv emits the pre-2026-09-20 lighting block VERBATIM. The
// old lines are kept below as a string rather than reconstructed by feeding
// constants into the new one, because an algebraic reconstruction in float is
// not an ablation, it is a second implementation. With the flag present the
// emitted GLSL is character-identical to this file before the pass and the 25
// judged views must come back at 0 px; with it absent the new block is emitted.
// Same compile-time device as TEXDOM and NOREPAIR above, for the same reason.
//   ?cdbg=nowet   keeps the reflection and the lobe, forces wetness to 0.
//   ?cdbg=nolobe  keeps the reflection and the wetness, restores the old pow().
// The uniform DECLARATION is inside the switch too, so a ?cdbg=noenv build has
// no trace of uWaterY anywhere in its instruction stream.
//
// NOT GATED ON ?cal=, DELIBERATELY. The ?cal= gate exists for POST-PROCESSING -
// bloom, motion blur, grade - effects that sit on top of the model and would
// corrupt a tone measurement. A material change IS the model. Gating it would
// leave the corpus measuring a lighting model that no longer ships, which is
// worse than a re-baseline. tmp-tr192/REBASELINE-NOTE.md carries the numbers.
// NO BACKTICKS BELOW THIS LINE - template-literal rule, same as above.
// ---------------------------------------------------------------------------
export const ENV_OFF = CDBG.includes('noenv');
const NOENV = ENV_OFF;
const ENV_WETSW = CDBG.includes('nowet') ? '0.0' : '1.0';
const NOLOBE = CDBG.includes('nolobe');

// ?cdbg=craftmask - paint every fragment this program draws MAGENTA and return.
//
// It exists because the re-baseline this pass was briefed to produce did not
// happen: all 25 judged views came back at 0 px. "0 px" has two possible
// causes - the change does nothing, or the corpus cannot see the thing it
// changes - and those are opposite conclusions, so the difference had to be
// MEASURED rather than argued. With this flag on, any judged view containing a
// single craft fragment shows magenta; a view with none is bit-identical to the
// unflagged one. Counting magenta over the 25 is the answer, and it is the same
// mask-before-you-name-it device this file uses for the picket panel and the
// facet repair. Compile-time, empty string when absent, so a clean build is
// byte-identical to having no switch - proven by re-rendering the corpus after
// adding it.
const CRAFTMASK = CDBG.includes('craftmask')
  ? '  fragColor = vec4(1.0, 0.0, 1.0, 1.0); return;\n' : '';

export const ENV_UNIFORM = NOENV ? '' : 'uniform float uWaterY;\n';

// Every number here is derived in the block above, not dialled in.
export const ENV_CONST = NOENV ? '' : `
const float ENVC_PI   = 3.14159265;
const float ENVC_F0   = 0.04;        // ((n-1)/(n+1))^2 at n = 1.5
const float ENVC_TIR  = 0.43468;     // 1 - 1/n^2 at n = 1.33
const float ENVC_WETR = 0.06;        // what a water film's own ripple leaves
const float ENVC_WET0 = 0.00;        // m above the LOCAL water surface
const float ENVC_WET1 = 0.29;        // sheerY(0) = 0.288 in boat-pwc.js
const float ENVC_SUNA = 0.00465;     // solar disc half-angle, rad (0.266 deg)
// The sun's irradiance in THIS shader's own units, read off its own diffuse
// term rather than chosen: direct * 0.55 is uBaseColor * 0.85 * 0.55 * ndl, and
// a Lambert surface returns albedo/pi * E * ndl, so E = 0.85 * 0.55 * pi.
const float ENVC_SUNE = 1.46867;
`;

// The lighting block itself. The NOENV arm is the pre-2026-09-20 text verbatim.
export const ENV_LIGHT = NOENV ? `
  // Sun, softened - this is a hazy coast, not a studio - and occluded.
  float ndl = max(dot(N, uSunDir), 0.0);
  float sh = sunShadow(vWorld, N, uSunDir);
  vec3 direct = uBaseColor * (ndl * 0.85 * sh + 0.15);

  // Ambient: the sky itself, sampled along the normal. Sitting an object in the
  // same environment as its background is most of what makes it belong there.
  vec3 ambient = uBaseColor * skyColor(normalize(N + vec3(0.0, 0.35, 0.0)), uSunDir) * 0.55;

  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), mix(6.0, 220.0, 1.0 - uRough));
  float fres = 0.04 + 0.5 * pow(1.0 - max(dot(N, V), 0.0), 4.0);

  vec3 col = direct * 0.55 + ambient + vec3(1.0) * spec * fres * 1.6 * sh;` : `
  // Wetness: height above the INSTANTANEOUS local sea surface.
  float wet = (1.0 - smoothstep(ENVC_WET0, ENVC_WET1, vWorld.y - uWaterY)) * ${ENV_WETSW};
  vec3 albW = uBaseColor * (1.0 - ENVC_TIR) / (1.0 - uBaseColor * ENVC_TIR);
  vec3 alb  = mix(uBaseColor, albW, wet);
  float rgh = mix(uRough, ENVC_WETR, wet);

  // Fresnel: Schlick with the roughness-capped F90, so a rough surface does not
  // go full mirror at grazing incidence.
  float NdV = max(dot(N, V), 1e-3);
  float fr  = ENVC_F0 + (max(1.0 - rgh, ENVC_F0) - ENVC_F0) * pow(1.0 - NdV, 5.0);

  // Sun, softened - this is a hazy coast, not a studio - and occluded.
  float ndl = max(dot(N, uSunDir), 0.0);
  float sh = sunShadow(vWorld, N, uSunDir);
  vec3 direct = alb * (ndl * 0.85 * sh + 0.15);

  // Ambient: the sky itself, sampled along the normal. Sitting an object in the
  // same environment as its background is most of what makes it belong there.
  vec3 skyAmb = skyColor(normalize(N + vec3(0.0, 0.35, 0.0)), uSunDir);
  vec3 ambient = alb * skyAmb * 0.55;

  // Environment. skyAmb is the roughness-1 end of the very same lobe.
  vec3 Rv = normalize(reflect(-V, N));
  vec3 envM = skyColor(Rv, uSunDir);
  // Take skyColor's own sun DISC back out, under the same below-horizon
  // attenuation it was added with. The halo stays; that is real aureole.
  envM -= SUN_TINT * (smoothstep(0.9992, 0.99975, dot(Rv, uSunDir)) * 30.0
                      * (1.0 - smoothstep(0.0, -0.12, Rv.y)));
  vec3 env = mix(envM, skyAmb, rgh);

  // The sun lobe: GGX, alpha widened by the solar disc so a near-mirror cannot
  // resolve the sun as a delta.
  vec3 H = normalize(uSunDir + V);
  float alp = max(rgh * rgh, 1e-5) + ENVC_SUNA;
  float al2 = alp * alp;
  float NdH = max(dot(N, H), 0.0);
  float den = NdH * NdH * (al2 - 1.0) + 1.0;
  float dgx = al2 / (ENVC_PI * den * den);
  float vgx = 0.5 / max(mix(2.0 * ndl * NdV, ndl + NdV, alp), 1e-4);
  float lobe = ${NOLOBE
    ? 'pow(NdH, mix(6.0, 220.0, 1.0 - uRough)) * (0.04 + 0.5 * pow(1.0 - NdV, 4.0)) * 1.6 / max(fr, 1e-4)'
    : 'dgx * vgx * ndl * ENVC_SUNE'};

  vec3 col = (direct * 0.55 + ambient) * (1.0 - fr)
           + env * fr
           + vec3(1.0) * lobe * fr * sh;`;
// <<< ENVREF

// ---------------------------------------------------------------------------
// ?rdbg=norider - ABLATION SWITCH FOR THE RIDER FIGURE.
//
// WHY IT HAD TO EXIST BEFORE ANY RIDER CLAIM. The five judged cameras all pass
// ?cal=, which puts a free camera out on the pier - NONE of them contains the
// rider at all, so tmp-tr2/measure.py has never measured the figure and cannot.
// Rendering the same rider camera WITH and WITHOUT the figure gives an exact
// per-pixel rider mask by difference - the same CROWD-0 method
// pier-people-scale.js documents for the deck crowd - and a mask is what turns
// "it looks flat" into a number. Measured on the clean pair used this pass: the
// mask is 1,879 px of 358,020 (0.52%) at the chase camera and a control box
// away from the figure shows 0 changed px, so the difference really is the
// rider and nothing else.
//
// JS-side, not compile-time like TEXDOM above, because the rider is a draw call
// and not a shader term: with the flag absent the emitted GLSL and every
// uniform are untouched, so a clean page is byte-identical to having no switch.
// Guarded on `location` so node tooling can import this file.
// ---------------------------------------------------------------------------
const RDBG = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
  ? (new URLSearchParams(location.search).get('rdbg') || '') : '').split(',');
const NO_RIDER = RDBG.includes('norider');

const DITHER_GLSL = `
// q is already gamma-encoded and in 0..1; the caller writes the result straight
// to the framebuffer and lets the hardware clamp and round to 8 bits.
vec3 dither8(vec3 q, vec2 frag) {
  float b = fract(52.9829189 * fract(dot(frag, vec2(0.06711056, 0.00583715))));
  vec3 d = fract(b + vec3(0.0, 0.33333333, 0.66666667)) - 0.5;  // +-0.5 LSB
  return q + d * (1.0 / 255.0);
}
`;

const VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
uniform mat4 uViewProj;
uniform mat4 uModel;
out vec3 vWorld;
out vec3 vNormal;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWorld = wp.xyz;
  // Rotation only - the model matrix carries no scale, so the 3x3 is enough.
  vNormal = mat3(uModel) * aNormal;
  gl_Position = uViewProj * wp;
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
out vec4 fragColor;

uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uBaseColor;
uniform float uRough;
uniform float uExposure;
uniform float uOvercast;
${ENV_UNIFORM}
${SKY_GLSL}
${SHADOW_GLSL}
${DITHER_GLSL}
${ENV_CONST}
vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
vec3 encode(vec3 c) { return pow(aces(c), vec3(1.0 / 2.2)); }

// Beer-Lambert through sea water, using the same green-water bias as the
// surface shader: red dies first, green survives longest.
const vec3 EXTINCT = vec3(0.62, 0.16, 0.30);
const vec3 WATER_IN = vec3(0.012, 0.055, 0.041);

void main() {
// >>> ENVREF
${CRAFTMASK}// <<< ENVREF
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorld);
  if (dot(N, V) < 0.0) N = -N;              // meshes are not watertight
// >>> ENVREF
${ENV_LIGHT}
// <<< ENVREF

  // Underwater: absorb along the path from the surface down to this fragment
  // and back toward the eye. Approximated with twice the depth, which is close
  // enough for a mast at 0-1 m and keeps it visibly a foil rather than a smudge.
  if (vWorld.y < 0.0) {
    float d = min(-vWorld.y, 3.0) * 2.0;
    vec3 t = exp(-EXTINCT * d);
    col = col * t + WATER_IN * (1.0 - t);
  }

  // The board is a large, smoothly curved, pale surface a metre from the eye in
  // chase view - the same slow-gradient case as the beach, so it gets the same
  // treatment. Screen-space and static, so it does not swim as the craft moves.
  fragColor = vec4(dither8(encode(col * uExposure), gl_FragCoord.xy), 1.0);
}
`;

// ---------------------------------------------------------------------------
// The coast. Same lighting, per-vertex colour, and much heavier haze: the
// measured palette says sky, water and an 8 km headland all sit within ~60
// levels of each other at the horizon, so a crisp coastline is the giveaway.
// ---------------------------------------------------------------------------
const COAST_VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
in vec3 aColor;
in float aMat;
uniform mat4 uViewProj;
uniform float uDepthBias;
out vec3 vWorld; out vec3 vNormal; out vec3 vColor; out float vMat;
void main() {
  vWorld = aPos; vNormal = aNormal; vColor = aColor; vMat = aMat;
  gl_Position = uViewProj * vec4(aPos, 1.0);
  // >>> DECALTIER (tmp-tr136). Pull this draw toward the camera by a fixed
  // number of DEPTH-BUFFER STEPS - not metres. Dividing by w cancels the
  // perspective divide that follows, so the shift lands as a constant offset
  // in window depth at every distance, under every near/far pair. That is what
  // makes the clifftop decals immune to a projection change; coast.js's
  // DECAL_TIER comment has the why. uDepthBias is 0 for every other draw, and
  // 0 here is bit-for-bit the old line.
  gl_Position.z -= uDepthBias * gl_Position.w;
  // <<< DECALTIER
}
`;

const COAST_FRAG = `#version 300 es
precision highp float;
in vec3 vWorld; in vec3 vNormal; in vec3 vColor; in float vMat;
out vec4 fragColor;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform float uExposure;
uniform float uOvercast;
uniform float uHasTex;
uniform sampler2D uCliffA; uniform sampler2D uCliffN;
uniform sampler2D uSandA;  uniform sampler2D uSandN;
uniform sampler2D uTimberA; uniform sampler2D uTimberN;
uniform sampler2D uConcA;  uniform sampler2D uConcN;
${SKY_GLSL}
${SHADOW_GLSL}
${NORMALMAP_GLSL}
${DITHER_GLSL}
vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
vec3 encode(vec3 c) { return pow(aces(c), vec3(1.0 / 2.2)); }

void main() {
  vec3 toCam = uCamPos - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / max(dist, 0.001);

  // ---- FACET-NORMAL REPAIR (2026-09-18, tmp-tr105) -----------------------
  // ⚠️ THE SECOND-HIGHEST-BLAST-RADIUS BLOCK IN THIS FILE. Every coast
  // fragment goes through it. Read all of it before editing.
  //
  // THE DEFECT IT REPAIRS IS NOT IN THIS FILE. pier.js builds every oriented
  // box with pbox(), which pushes EIGHT vertices - a top ring with normal
  // (0,+1,0) and a bottom ring with (0,-1,0) - and then reuses those same
  // eight for the FOUR SIDE QUADS. A side quad therefore interpolates from
  // (0,+1,0) at its top edge to (0,-1,0) at its bottom edge: at no point on a
  // vertical wall does the shading normal point out of the wall. The line
  // below this block used to flip N toward the viewer, and every judged camera
  // stands BELOW the pier head, so V.y is negative and the flip resolved the
  // WHOLE wall to N = (0,-1,0) - a normal pointing straight at the sea bed.
  // MEASURED with ?cdbg=lightdbg and ?cdbg=geomdbg on S_head (tmp-tr105):
  //   box                 ndl     sh    N.y   |dot(N, facet)|   facet.y
  //   tower_wall         0.000  0.973  -1.00       0.002         -0.00
  //   wall_flank_mid     0.000  0.786  -1.00       0.045         -0.04
  //   wall_seaward_end   0.001  0.787  -0.99       0.046         -0.04
  // The shadow map says those walls are LIT (sh 0.79-0.97). They render black
  // to the sun anyway, because ndl = max(dot((0,-1,0), sunDir), 0) = 0 for any
  // sun above the horizon. That is the whole of the wall/sky defect: the head
  // measured 0.60 of the sky where the owner OVERCAST references measure 0.99
  // and 0.97, and it read WARM (R/G 1.06 against the references' 0.935)
  // because N.y = -1 also drives down = 1 in the ground-bounce term below and
  // aims the ambient sky sample STRAIGHT DOWN.
  //
  // ⚠️ WHY THE REPAIR IS HERE AND NOT IN pbox(). Rewriting pbox to push 24
  // vertices is the structurally correct fix and it is NOT the cheap one: it
  // moves the vertex count of every pier module at once (pbox is the shared
  // helper for pier.js, pier-head-elevations.js, pier-landmarks.js,
  // pier-deck-furniture.js, pier-railings-parapet.js, pier-arcade-underside.js
  // and pier-people-scale.js - 212 call sites), which walks straight into
  // mesh-check, module-check and two other builders editing those files. The
  // repair below leaves the mesh BYTE-IDENTICAL.
  //
  // THE RULE. cross(dFdx(vWorld), dFdy(vWorld)) is the exact geometric normal
  // of the facet the fragment lies on. A legitimate SMOOTHING normal is never
  // far from it - a 10-segment ctube pile is 18 deg off (|dot| 0.95), a
  // smoothed cliff or beach less. A normal 70+ deg off its own facet is not
  // smoothing anything; it is a builder artefact. So: agree = |dot(shading,
  // facet)|, and the shading normal is replaced by the facet normal only as
  // agree falls below 0.45, fully by 0.20.
  //   - a pbox side face          agree 0.00-0.05  -> fully repaired
  //   - MAT.PICKET (5)            agree ~0.50      -> untouched by the ramp,
  //     AND excluded explicitly below. Its normal is rotated up to 60 deg off
  //     the face ON PURPOSE (pier-railings-parapet.js: the flat panel stands
  //     in for a run of round balusters and must light like one). That
  //     workaround exists BECAUSE of the pbox defect; it is deliberate, it is
  //     measured against the head-cam balustrade band, and this repair must
  //     not silently undo it.
  //   - sand, cliff, ctube piles  agree 0.9+       -> untouched
  // The facet normal is oriented toward the viewer first, which is correct for
  // a closed box seen from outside and is what the old flip was doing anyway.
  // At a polygon boundary inside a 2x2 derivative quad gN is meaningless, but
  // so is every other derivative in this shader (the picket AA below already
  // relies on them) and it costs at most a one-pixel fringe.
  vec3 Ni = normalize(vNormal);
  vec3 gN = cross(dFdx(vWorld), dFdy(vWorld));
  float gLen = length(gN);
  gN = gLen > 1.0e-12 ? gN / gLen : Ni;
  if (dot(gN, V) < 0.0) gN = -gN;
  float agree = abs(dot(Ni, gN));
  float repair = (1.0 - smoothstep(0.20, 0.45, agree)) * step(vMat, 4.5)${NOREPAIR};
  vec3 N = normalize(mix(Ni, gN, repair));
  if (dot(N, V) < 0.0) N = -N;

  // ---- surface texture --------------------------------------------------
  // World-planar UVs chosen per material rather than triplanar: every surface
  // here has a known dominant orientation, so one projection is correct and
  // costs a third of the samples. Detail fades out past 220 m, where a tile is
  // smaller than a pixel and sampling it only produces shimmer.
  vec3 albedo = vColor;
  if (uHasTex > 0.5) {
    int mat = int(vMat + 0.5);
    float fade = 1.0 - smoothstep(120.0, 320.0, dist);
    vec4 t; vec3 tn = vec3(0.5, 0.5, 1.0); float amt = 0.0;
    // texMean = this material's own MEAN sample, MEASURED off the PNG in the
    // linear space the shader reads it in; texDom = 1 keeps the legacy
    // texture-dominant expression. Both are explained in full below the chain.
    vec3 texMean = vec3(1.0); float texDom = 1.0;
    // >>> SANDVC
    // Mean-one damp/dry multiplier, set ONLY in the mat == 0 branch and left at
    // 1.0 for every other material, so nothing but sand can move.
    vec3 sandPatch = vec3(1.0);
    // <<< SANDVC
    if (mat == 1) {                       // cliff: vertical face, use X and Y
      // Two scales. A single 40 m tile was too coarse to read at 150 m and too
      // obviously repeating up close; the fine layer carries the visible grain
      // and the coarse one keeps the strata reading as strata.
      vec2 uv = vec2(vWorld.x, vWorld.y) * 0.075;
      vec2 uv2 = vec2(vWorld.x, vWorld.y) * 0.021 + 0.37;
      t = texture(uCliffA, uv) * 0.62 + texture(uCliffA, uv2) * 0.55;
      tn = texture(uCliffN, uv).xyz; amt = 1.15;
      texMean = vec3(0.6991, 0.4741, 0.1505); texDom = 0.0;
    } else if (mat == 0) {                // sand: horizontal
      // TWO SCALES, ROTATED. A single 11 m tile aligned to the world axes read
      // as woven corduroy across the whole beach at a grazing angle - a regular
      // grid is far more visible than the texture it is made of, and the beach
      // is the largest single surface in a shot from the water. The second
      // sample is rotated about 31 degrees and scaled by an irrational-ish
      // ratio so the two patterns do not come back into phase.
      vec2 w = vec2(vWorld.x, vWorld.z);
      vec2 uv = w * 0.09;
      vec2 uv2 = vec2(w.x * 0.857 - w.y * 0.515, w.x * 0.515 + w.y * 0.857) * 0.0313 + 0.61;
      // >>> SANDVC
      // The two samples are named rather than summed inline so their ALPHA is
      // reachable; t is the same expression, in the same order, so t.rgb is
      // bit-identical to what this line produced before.
      vec4 sA = texture(uSandA, uv);
      vec4 sB = texture(uSandA, uv2);
      t = (sA * 0.55 + sB * 0.62);
      // THIRD TAP, ALPHA ONLY, at 0.0097 - a 103.1 m tile, rotated 17 degrees
      // the other way from uv2 and offset again so the three lattices never
      // come back into phase. This is the tap that carries the 13 m blotching;
      // without it the field tops out at 4 m and the fit loses the whole
      // 4 m column of the table above. It costs one texture fetch, on sand only.
      vec2 uv3 = vec2(w.x * 0.956 + w.y * 0.292, w.y * 0.956 - w.x * 0.292) * 0.0097 + 0.23;
      float pa = sA.a * 0.25 + sB.a * 0.35 + texture(uSandA, uv3).a * 0.40;
      sandPatch = vec3(exp2((pa - 0.5000001) * ${SANDVC_K}) * ${SANDVC_N});
      // <<< SANDVC
      tn = mix(texture(uSandN, uv).xyz, texture(uSandN, uv2).xyz, 0.5); amt = 0.22;
      // texDom stays 1 - the sand keys were authored under the legacy line and
      // the rendered beach is a SETTLED match. See the block below.
    } else if (mat == 3) {                // groyne timber
      vec2 uv = vec2(vWorld.x, vWorld.y) * 0.42;
      t = texture(uTimberA, uv); tn = texture(uTimberN, uv).xyz; amt = 0.6;
      texMean = vec3(0.1837, 0.1590, 0.1147); texDom = 0.0;
    } else if (mat == 2) {                // concrete: prom and both piers
      vec2 uv = vec2(vWorld.x + vWorld.z, vWorld.y - vWorld.z) * 0.14;
      t = texture(uConcA, uv); tn = texture(uConcN, uv).xyz; amt = 0.35;
      // CONCRETE texMean UPDATED 2026-09-03 with the texture it describes.
      // assets/concrete-albedo.png is no longer GENERATED - it is the owner's own
      // pier concrete, cropped from the only footage in the archive that gets
      // under the deck (G:\DJI\DJI_20250209134206_0085_D.MP4 @ 95 s, the beam
      // face at 1-3 m), high-passed to kill form shading and wrapped seamless.
      // ⚠️ texMean MUST MOVE WITH THE PNG. The branch below divides the sample by
      // it to make the texture a detail multiplier centred on 1.0, so a stale
      // mean silently re-tints every concrete surface in the scene. Measured over
      // every pixel decoded to linear, the same way the old value was - the
      // method reproduces the old 0.2749/0.2618/0.2213 to four decimals, which is
      // how this new one is known to be on the same footing.
      // ⚠️ TRAP 5 IS NOT VIOLATED even though the plate is OVERCAST: this branch
      // is palette-dominant, so t.rgb is divided by its own per-channel mean and
      // only per-pixel VARIATION survives - absolute colour and any overcast cast
      // divide out by construction. Flat light is in fact the ideal capture.
      texMean = vec3(0.1734, 0.1697, 0.1542); texDom = 0.0;
    } else {
      t = vec4(vColor, 1.0);              // painted: huts, buildings
    }
    // ---- WHICH OF THE TWO IS THE BASE ------------------------------------
    // ⚠️ THE HIGHEST-BLAST-RADIUS LINES IN THIS FILE. Every textured surface
    // in the scene goes through them. Read the whole block before editing.
    //
    // The vertex colour carries the LARGE-scale variation the texture cannot
    // know about - which villa is brick and which is render, which pile is
    // rusted, which hut is which colour - so the two are multiplied rather
    // than swapped. The open question was which is the BASE and which is the
    // modulator, and until 2026-08-20 it was t.rgb * (0.78 + vColor * 0.55)
    // for every material: texture as the base, palette as a tint.
    // ⚠️ NO BACKTICKS ANYWHERE IN THIS BLOCK. All of it lives inside a JS
    // template literal, so one backtick in a comment ends the shader source
    // and the page dies with "Unexpected identifier" on a line 40 below it.
    // That happened once while writing this, and only a render caught it.
    // ⚠️ AND NO BACKSLASHES EITHER - NEW 2026-08-21, AND THIS ONE IS SILENT.
    // A backtick at least kills the page. A Windows path in a comment down
    // here does NOT: the file still parses, the page still loads, and the
    // damage lands in the EMITTED shader. Citing the reference photograph by
    // its Windows path, with backslash separators, ate the backslash-c pair
    // entirely, turned the backslash-b pair into a literal 0x08 BACKSPACE
    // inside the GLSL source string, and turned a trailing backslash before a
    // newline into a line continuation that welded two comment lines together.
    // ⚠️ WRITING THIS WARNING RE-CREATED THE FAULT, because the warning quoted
    // the path. Twice in one edit. Caught by byte-scanning the emitted
    // COAST_FRAG for control characters, NOT by importing the module and NOT
    // by rendering. Write paths with forward slashes or not at all, and after
    // ANY edit to this block re-emit COAST_FRAG and assert it contains zero
    // backticks, zero backslashes and zero control characters.
    //
    // hex() stores LINEAR, so that bracket can only span 0.78..1.33 - a 1.7:1
    // modulation. MEASURED off the BUILT MESH (buildCoast(), grouped by the
    // aMat column and weighted by triangle area, not guessed from source):
    //
    //   material   tris     area m2   distinct   palette span   what the old
    //                                  vColors   (sRGB)         line rendered
    //   CONCRETE  30,152   454,782       16       48 .. 242     129 .. 160
    //   SAND       3,660   204,007        3      181 .. 239     228 .. 248
    //   TIMBER     2,500     9,650        7       65 .. 155     108 .. 117
    //   CLIFF          0         0        -       -             - (dead, below)
    //   PAINTED   53,894   262,372    6,804       t = vColor, no texture
    //
    // Re-censused 2026-08-21 off a freshly built mesh: CONCRETE, SAND and
    // TIMBER reproduce their triangle counts EXACTLY (30,152 / 3,660 / 2,500)
    // and CLIFF is still dead at zero. PAINTED has grown to 54,770 tris - other
    // sessions, not this expression. ⚠️ The "16 distinct vColors" on CONCRETE
    // is a per-TRIANGLE count; per VERTEX there are 578, because some concrete
    // is colour-ramped across its triangles. Sixteen is the number of flat keys
    // and it is the right number for the argument above, but do not quote it as
    // the palette's cardinality.
    // ⚠️ CORRECTION 2026-08-21: the count is right (617 on the 21:47 tree, was
    // 578) but THE REASON GIVEN IS WRONG, and the real reason is worth knowing.
    // Counting vertices whose OWN aMat is 2 gives SIXTEEN, not 617 - there is
    // no colour-ramped concrete anywhere in the mesh. The extra colours arrive
    // through 2,400 MIXED-MATERIAL triangles that coast.js builds as blend
    // strips: 1,200 with SAND and CONCRETE vertices in the same triangle and
    // 1,200 with CONCRETE and PAINTED. aMat is a varying, so int(vMat + 0.5)
    // splits those triangles down the middle at run time and each half takes a
    // different branch of the chain below. It is pre-existing coast.js
    // geometry, it is unaffected by this expression, and it is why a
    // per-triangle census and a per-vertex census disagree by 38x.
    //
    // A 19:1 concrete palette arriving as 1.23:1. ⚠️ THOSE TWO RATIOS ARE IN
    // DIFFERENT UNITS - re-derived 2026-08-21. 1.23:1 is a RENDERED sRGB ratio
    // (recomputed: 1.238, luminance, over the 16 keys). 19:1 is only reachable
    // in LINEAR luminance and only with pierRust excluded (recomputed: 17.8:1);
    // the same span in sRGB is 6.1:1, and in linear WITH rust it is 53.6:1.
    // Quote it as 6.1:1 arriving as 1.24:1, both sRGB. Still damning, and now
    // comparable. That is not a dull cliff,
    // it is THE PIER: pierArch #9A968C rendered 140,137,125, pierWhite #EBE2DE
    // rendered 158,152,140, pierPile #5A5048 rendered 132,128,118 and pierRust
    // #33241B rendered 129,125,116 - four protected keys landing on the same
    // mid grey, at every distance inside 320 m, which is every judged camera.
    //
    // ⚠️ AND THE CLIFF IS NOT ON MAT.CLIFF ANY MORE. STATUS.md's open item 9
    // blames this expression for flattening the CLIFF palette. That was true
    // when it was written and it is not true now: coast.js moved the face, the
    // toe and the clifftop plateau onto MAT.PAINTED (its own note at
    // face_rows.push says so, with an A/B table), and a census of the built
    // mesh finds ZERO vertices with aMat == 1 - checked twice, on the 19:31
    // tree and again on the 21:47 one. The cliff branch above is dead code
    // kept correct, not live, and assets/cliff-albedo.png is currently unused.
    // The surface this line really was flattening is the CLIFFTOP BUILDING
    // SKYLINE, which coast.js builds on MAT.CONCRETE.
    //
    // THE FIX: divide the texture by its own mean so it becomes a DETAIL
    // multiplier centred on 1.0, and let the palette be the base. texMean is
    // MEASURED - the mean of assets/<mat>-albedo.png over EVERY pixel, decoded
    // to LINEAR (textures.js uploads albedo as SRGB8_ALPHA8, so texture()
    // returns linear and vColor is linear too), times this shader's own sample
    // gain where it samples twice:
    //   cliff    0.5976,0.4052,0.1286  x(0.62+0.55) -> 0.6991,0.4741,0.1505
    //   sand     0.6372,0.5028,0.2948  x(0.55+0.62) -> 0.7455,0.5883,0.3449
    //   timber   0.1837,0.1590,0.1147  x1.00
    //   concrete 0.2749,0.2618,0.2213  x1.00
    // Per CHANNEL, not per luminance: the texture's own hue duplicates what the
    // palette already states, and leaving it in is what made concrete caramel.
    //
    // ⚠️ TWO MATERIALS KEEP THE OLD LINE, DELIBERATELY:
    //   SAND    - its keys were authored UNDER the old expression and the
    //             rendered beach is SETTLED against photograph 763 (B/R 0.81
    //             against 0.80). Normalising it would darken the beach 1.7x
    //             and the correction would then be owed in coast.js's sand
    //             keys, not here. VERIFIED: a pure-sand box (entrance camera,
    //             560,286-860,296) is BIT-IDENTICAL across this change.
    //   PAINTED - there is no texture at all (t = vColor), so the old line is
    //             the tone curve x*(0.78 + 0.55x). SIX other modules reason
    //             about that curve in writing, coast.js's cliff-vegetation
    //             block measured its entire palette against it, and
    //             coast.js's protected beach-hut ramp sits on it.
    // texMean stays vec3(1.0) on both, so the palette term is finite and mix()
    // can never see an inf - inf * 0.0 is NaN, not 0, and that would be a
    // silent black draw call.
    //
    // THE FAR FIELD CANNOT MOVE. fade is 0 past 320 m, so mix() returns vColor
    // regardless of the textured term, so every far-range result that three
    // passes settled is untouched BY CONSTRUCTION rather than by luck.
    //
    // MEASURED, five judged cameras at 900x500, one frozen snapshot of the
    // tree, private HTTP port and private Chrome debug port, before vs after:
    //  - Substructure, L as a fraction of the SAME frame's open sea (the sky in
    //    photograph 763 is 96.1% clipped - trap 17 - so it cannot be the
    //    anchor). "structure" = pixels under 0.55x sea L. The rows below are
    //    the ORIGINAL pass's, and its regions were NOT written down:
    //                              p10     p50     p90    B/R
    //      photograph 763         0.141   0.287   0.484   1.07
    //      along-neck BEFORE      0.264   0.360   0.433   1.17
    //      along-neck AFTER       0.176   0.283   0.382   1.11
    //      head       BEFORE      0.270   0.362   0.430   1.09
    //      head       AFTER       0.191   0.302   0.380   1.02
    //    ⚠️ THE LINE THAT USED TO STAND HERE SAID "Closer to the photograph on
    //    all four statistics, in both cameras." IT IS CONTRADICTED BY THE TABLE
    //    DIRECTLY ABOVE IT. p90 moves AWAY in both: along-neck |0.484-0.433| =
    //    0.051 before against |0.484-0.382| = 0.102 after, and head 0.054
    //    against 0.104.
    //    ⚠️⚠️ 2026-08-21, THIRD PASS, MEASURING RATHER THAN READING. THIS ROW
    //    IS THE ONE ROW IN THIS BLOCK THAT DOES NOT REPRODUCE, AND THE REASON
    //    IS THAT IT BREAKS THE RULE STATED SIX LINES BELOW IT: it quotes no
    //    box. Everything else here reproduces to a decimal; this does not,
    //    because the statistic is violently box-sensitive. Measured over four
    //    substructure boxes x three sea anchors in photograph 763
    //    (1920x1080, bournemouth-reference / bournemouth-pier /
    //    763260589138714.jpg) the photo's OWN p50 ranges 0.246 (piles only,
    //    1480,600-1900,830) to 0.485 (beams, 1400,470-1919,700), and its p90
    //    ranges 0.465 to 0.532. A render p50 of 0.283 is "closer" or "further"
    //    depending entirely on which of those you picked.
    //    TWO of the four are robust and TWO are not:
    //      p10 IMPROVES under every box tried - photo 0.131..0.239, and my own
    //        interleaved pair moves head 0.224 -> 0.157 (sub 0,300-800,400,
    //        sea 600,400-880,460) and along-neck 0.236 -> 0.156 (sub
    //        0,260-430,400, sea 500,340-880,440), landing ON the photo's
    //        0.145..0.173 band from ABOVE.
    //      B/R IMPROVES under every box tried, but the photo figure above is
    //        WRONG: 1.07 is not attainable. Measured 0.93..1.00 over all
    //        twelve box pairs, 0.96 on the wide box with the wide sea anchor.
    //        The substructure of 763 is rust-warm; B/R there cannot exceed 1.
    //        Both render halves sit ABOVE it and both move DOWN - head
    //        1.14 -> 1.10, along-neck 1.20 -> 1.16 - so the direction of the
    //        finding survives, the number does not.
    //      p50 and p90 are NOT robust. On my boxes BOTH regress: head p50
    //        0.310 -> 0.260 and p90 0.385 -> 0.356; along-neck p50
    //        0.338 -> 0.302 and p90 0.431 -> 0.431, against a photo that reads
    //        0.380 / 0.524 on the matching wide box. Read that as "two improve,
    //        two regress", not as "three improve, one regresses".
    //    The earlier pass also tested and REJECTED the comfortable explanation
    //    that the pale keys simply brightened out of the "under 0.55x sea"
    //    mask: the share of the same box ABOVE that threshold FALLS, 27.1% ->
    //    26.1% head and 71.0% -> 69.9% along-neck. That REPRODUCES - my own
    //    masked share RISES only 68.9% -> 69.6% head and 61.5% -> 61.9%
    //    along-neck, i.e. nothing left the mask either way and the dimming is
    //    real. KEEP THE CHANGE: the case for it is the palette-spread and
    //    building-face rows below, both of which reproduce to a decimal, NOT
    //    this row. Do not repeat the "all four" claim and do not repeat the
    //    "three of four" claim either.
    //  - Clifftop building faces, along-neck, box 700,175-900,250, masked by
    //    CHANGED pixels (only CLIFF/CONCRETE/TIMBER inside 320 m can move, so
    //    "changed" IS a material mask): colour sd 13.7/16.8/20.0 ->
    //    29.2/38.2/43.8 against the 41.4/44.3/49.1 STATUS records for the
    //    reference. A brick roof and a brick chimney appear where the block was
    //    one flat grey.
    //  - Sky, mid-distance sea, horizon and sand: ZERO pixels changed, max
    //    delta 0, in every one of these boxes (quote the box or the row is
    //    unreproducible - this file's own rule): approach sky 100,20-800,90;
    //    approach sea-mid 100,330-800,362; approach whole lower frame
    //    0,300-900,500; entrance sky 100,20-800,100; entrance sand
    //    560,286-860,296; along-neck sky 450,20-890,100; head sky
    //    100,20-700,100; arcade sea 100,350-800,420.
    //  - photomatch --shot side566, controlled A/B inside one run, both browsers
    //    launched cold: 1.0 / 1.0 / 1.5 / 13.9 / 41.5 / inf BEFORE and AFTER.
    //    Identical to three decimals. The silhouette result is undisturbed.
    //  - Clipping (any channel >= 254): 0.000% before AND after, all five.
    //  - Frame mean luminance moves at most -1.7 levels (head camera).
    //
    // ⚠️ ONE NUMBER GOT WORSE AND IT IS A THRESHOLD, NOT A DEFECT. Share of
    // frame under L 25 goes 0.01% -> 1.62% along-neck and 0.41% -> 0.69% head
    // (approach, entrance and arcade: unchanged, and arcade's 5.5% did not
    // move at all). The mass of substructure pixels was sitting just above
    // L 25 and this moved it ~11 levels down. The photograph's OWN
    // substructure p10 is 0.141 of its sea against the render's 0.176 after
    // the change, so the render is still SHORT of the reference at the dark
    // end. Do not lift it back; if anything it owes another stop.
    //
    // -----------------------------------------------------------------------
    // RE-VERIFIED 2026-08-21 BY AN INDEPENDENT PASS THAT TRUSTED NONE OF THE
    // ABOVE. Everything in this section was re-measured from the PNGs, the
    // BUILT MESH and fresh renders. The verdict is KEEP, with two corrections
    // and one new trap. What follows is what a re-check actually establishes.
    //
    // 1. THE texMean CONSTANTS ARE EXACT. Re-derived from assets/*-albedo.png,
    //    sRGB-decoded to linear (textures.js uploads SRGB8_ALPHA8, so texture()
    //    returns linear) and multiplied by this shader's own sample gain:
    //      cliff 0.5976,0.4052,0.1286 x1.17 -> 0.6991,0.4741,0.1505
    //      timber            0.1837,0.1590,0.1147 x1.00
    //      concrete          0.2749,0.2618,0.2213 x1.00
    //    All three reproduce the constants above to four decimals.
    //
    // 2. WHY IT WORKS, IN ONE LINE OF ALGEBRA NOBODY HAD WRITTEN DOWN. Both
    //    expressions are LINEAR in t, so their ratio does not contain t:
    //        new/old = v*(t/mean) / (t*(0.78+0.55v)) = v / (mean*(0.78+0.55v))
    //    The change is a pure per-key, per-channel SCALE. It therefore adds no
    //    texture contrast and no noise - the relative variation of t is
    //    IDENTICAL under both - it only re-bases the DC level. And because a
    //    minified tile averages to its own mean, the limit of the new
    //    expression is exactly vColor: the palette lands by construction.
    //    Predicted albedo at that limit, MAT.CONCRETE (protected keys):
    //        key         palette   LEGACY rendered   NEW rendered   scale
    //        pierWhite   #EBE2DE   158,152,140       235,226,222    x2.4
    //        pierRail    #E4E3DF   156,152,140       228,227,223    x2.4
    //        pierArch    #9A968C   140,136,125       154,150,140    x1.2
    //        pierPile    #5A5048   132,128,118        90, 80, 72    x0.4
    //        pierRust    #33241B   129,125,116        51, 36, 27    x0.1
    //    FIVE PROTECTED KEYS SPANNING sRGB 51..235 ALL LANDED INSIDE 129..158
    //    UNDER THE LEGACY LINE. That is the defect, stated as a number.
    //
    // 3. FRESH A/B, INTERLEAVED, true 900x500. Pairs rendered back to back in
    //    ONE browser so a neighbouring session cannot move geometry between the
    //    halves - and it tried to: a first, sequential A/B had the arcade differ
    //    by 104,241 px run-to-run and reported the palette spread NARROWING
    //    there. Interleaved, it widens like the other four. Do not run this A/B
    //    any other way.
    //      camera      chg%   maxD   dL    clip   p95/p05 old -> new   sd
    //      approach    3.25%   45  -0.25  0.000%   2.61 -> 3.11    28.7 -> 29.2
    //      entrance    5.87%   49  +0.24  0.000%   3.72 -> 5.24    46.8 -> 56.3
    //      along-neck 27.93%   55  -1.25  0.000%   3.87 -> 6.80    29.3 -> 36.6
    //      head       21.82%   51  -1.74  0.000%   2.82 -> 3.89    25.0 -> 26.3
    //      arcade      4.06%   54  +0.57  0.000%   2.30 -> 2.63    14.8 -> 26.3
    //    p95/p05 is measured INSIDE THE CHANGED MASK, which IS a material mask:
    //    only CONCRETE and TIMBER inside 320 m can move. Spread widens in all
    //    five. No clipping anywhere. Frame mean moves at most 1.74 levels.
    //    ⚠️ The "bunching" statistic (share of masked pixels within +-6 L of
    //    their own median) does NOT support this cleanly - 12.2->3.9% entrance
    //    and 48.2->32.4% arcade but 40.8->43.8% approach and 50.1->53.1%
    //    along-neck. It is confounded by haze compressing the far field. Quote
    //    p95/p05 and sd, not that.
    //
    // 4. THE MUST-NOT-MOVE SET IS BIT-IDENTICAL, re-confirmed on the interleaved
    //    pair, same boxes as listed above: 0 changed pixels, max delta 0, in all
    //    of them. SAND and PAINTED are safe by construction as well as by
    //    measurement - mix(x, y, 1.0) returns y exactly - and the protected
    //    beach-hut ramp is a coast.js box() call, i.e. MAT.PAINTED, so it cannot
    //    move. ⚠️ The 0.35 m capping strip ABOVE each hut is a separate
    //    m.box(..., C.concreteDark, MAT.CONCRETE) and DOES move. The huts
    //    themselves do not.
    //
    // 5. THE SILHOUETTE RESULT IS UNDISTURBED. side566 edge-density bands,
    //    controlled A/B in one run at 560x996: 1.0/1.0/1.5/12.1/41.5/inf legacy
    //    against 1.0/1.0/1.5/12.2/41.5/inf new. Band 3 moves 0.8%, inside the
    //    0.3-0.6% this file already documents plus pier-module drift. (Band 3
    //    reads 12.1 where STATUS records 13.9 - the pier modules moved, not
    //    this expression. A/B it, never trend it.)
    //
    // 6. ⚠️ NEW TRAP, AND IT INVALIDATED TEN RENDERS BEFORE IT WAS CAUGHT.
    //    TWO PYTHON SERVERS CAN LISTEN ON ONE PORT ON WINDOWS. STATUS.md's
    //    server recipe sets ThreadingHTTPServer.allow_reuse_address = True; on
    //    Windows that lets a second process bind a port another session already
    //    owns, both stay LISTENING, and requests go to an ARBITRARY one. My
    //    "private" port 8479 was already owned, so my first ten renders were
    //    served another session's SNAPSHOT of this tree - craft.js at its 22:02
    //    size, without the switch below - and the A/B came back with ZERO
    //    changed pixels in all five cameras. That is a perfectly plausible
    //    result to publish and it would have been entirely false.
    //    ⚠️ BEFORE RENDERING: write a canary file, curl it back, and check that
    //    netstat -ano, filtered to your port and to LISTENING, returns exactly
    //    ONE line. Set allow_reuse_address = False so a collision fails loudly.
    //    tools/render_cdp.mjs has the same hazard on debug port 9333, and 9333
    //    was ALSO already owned by another session during this run.
    //    (Writing this paragraph is what broke the page once: the two backticks
    //    that were around that netstat command ENDED THIS TEMPLATE LITERAL,
    //    exactly as the warning 200 lines above says. Caught by counting
    //    backticks inside the literal, not by reading it.)
    // -----------------------------------------------------------------------
    vec3 legacy   = t.rgb * (0.78 + vColor * 0.55);
    vec3 palette  = vColor * (t.rgb / texMean);
    vec3 textured = mix(palette, legacy, ${TEXDOM});
    albedo = mix(vColor, textured, fade);
    // >>> SANDVC
    // AFTER the fade mix, deliberately. Past 320 m fade is 0 and albedo is
    // vColor alone, so a patch applied inside the mix would vanish exactly
    // where the beach is largest in frame. Applied here it survives to any
    // range and then FADES ITSELF OUT correctly: the field lives in a mipmapped
    // texture, so once a 1.4 m feature falls under a texel the mip average
    // returns the field's own mean and sandPatch goes to 1.0 by construction,
    // with no distance knee to tune and nothing to alias.
    albedo *= sandPatch;
    // <<< SANDVC
    // Under overcast there is no directional light to carve relief, so a normal
    // map that reads correctly in sun turns into pure noise. Measured: the beach
    // in the render carried 2227x the edge density of the beach in frame 566.
    // Fade the perturbation as the surface turns edge-on. At a grazing angle a
    // tangent-space normal map stops describing relief and becomes pure
    // high-frequency noise - which is exactly the view a rider at water level
    // has of the beach.
    float graze = clamp(dot(normalize(N), normalize(uCamPos - vWorld)), 0.0, 1.0);
    N = perturb(N, unpackNormal(tn),
                amt * fade * mix(1.0, 0.4, uOvercast) * smoothstep(0.05, 0.45, graze));
  }

  float ndl = max(dot(N, uSunDir), 0.0);
  // The pier shading itself, and the cliff shading its own gullies, is most of
  // what stops the coast reading as a flat cut-out.
  // SUBSTRUCTURE DIRECT-SUN ADMITTANCE (open item 2, direct-sun lever).
  // Measured problem: head-cam substructure dark-ratio p10/p50/p90 was
  // .164/.208/.337 with B/R 1.19 against photograph 763's piles at
  // .141/.258/.500, B/R 0.92 - the render's under-deck has NO sunlit band.
  // Diagnosed 2026-08-29 with a two-channel render (R=sunShadow, G=ndl): the
  // whole substructure is ndl>0 (seaward faces carry ndl up to ~0.60 under
  // sunDir(-0.35,0.72,0.60)) but sunShadow returns exactly 0 below the deck.
  // Forcing sh=1 gave .210/.366/.445 B/R 0.88 - so the normals are fine and
  // the shadow term is the whole story. That over-shadowing is geometrically
  // true for a solid slab (the sun is on the far flank), but photograph 763
  // shows the real pier admits direct light into the outer band: crossheads
  // and soffit edges read at half the sea's luminance, pile feet stay dark.
  // The admittance decays with distance below the slab because the occluder
  // distance along the sun ray grows as (deckUnder - y)/sunDir.y - ~0 m at the
  // crosshead tops (4.32 m, touching the slab underside), ~6 m at the water.
  // A constant world-space shadow slack therefore reproduces the photo's
  // gradient on its own: 2.5 m of slack lights everything whose occluder is
  // nearer than 2.5 m along the ray, i.e. y > 4.32 - 0.72*2.5 = 2.5 m, and
  // leaves the pile feet in true shadow. Scope, so nothing else moves:
  //   - inside the pier strip only: station -2..265 m (head trestles run
  //     s 129..262 in pier.js), offset |po| <= 33 m (HEAD_W -14.5..24.5 plus
  //     the 7 m landing stages; axis DIR and root (-230,-300) copied from
  //     pier.js/coast.js - vWorld is in sim coords);
  //   - below the deck slab: full under y=4.6, zero above y=5.2 (slab spans
  //     4.32-5.47, so the fascia feathers and the parapet gets nothing);
  //   - MAT.CONCRETE only: piles, braces, crossheads, spine - the huts,
  //     people and balustrade are PAINTED and keep exact shadows;
  //   - side faces only (1 - max(N.y, 0)): upward receivers - deck, prom,
  //     sand - keep exact shadows, which is what keeps the entrance_sand and
  //     deck gates bit-identical.
  // Slack only ADMITS light (it is extra bias), so it cannot add acne.
  float subSlack = 0.0;
  float subGate = 0.0;
  {
    vec2 rel = vWorld.xz - vec2(-230.0, -300.0);
    float ps = rel.x * 0.1063 + rel.y * 0.9943;   // station along the pier axis
    float po = rel.x * 0.9943 - rel.y * 0.1063;   // offset across it
    float underPier = step(-2.0, ps) * step(ps, 265.0) * step(abs(po), 33.0);
    subGate = underPier
            * (1.0 - smoothstep(4.6, 5.2, vWorld.y))
            * step(abs(vMat - 2.0), 0.5);
    subSlack = 10.0 * subGate * (1.0 - clamp(N.y, 0.0, 1.0));
  }
  float sh = sunShadow(vWorld, N, uSunDir, subSlack);
  // The admitted light is WARM and STRONGER than the plain ndl*0.5 direct.
  // Photo 763's sunlit crossheads measure B/R 0.92 at half the sea's
  // luminance; this render's substructure sat at B/R 1.17-1.19 with its
  // brightest band at ~0.41 of the sea. White direct at weight 0.5 against
  // the blue sky ambient cannot reach either number at any achievable ndl -
  // and the light that actually arrives under a deck edge at 46 degrees is
  // low-angle sun plus sea-glint bounce, both warm and both concentrated.
  // Scoped by the same subSlack feather, so the exact-shadow direct term
  // everywhere else stays exactly white at exactly 0.5.
  float subAmt = clamp(subSlack * 0.1, 0.0, 1.0);
  vec3 sunCol = mix(vec3(1.0), vec3(1.12, 1.02, 0.78), subAmt)
              * (1.0 + 0.4 * subAmt);
  // AMBIENT. This used the raw sky colour at 62%, which painted the whole pier
  // BLUE: anywhere the sun term was small - a face turned away, or in shadow -
  // a fully saturated sky sample was the only light, so grey concrete came out
  // the colour of the sky. The pier's deck fascia, piles and bracing all read
  // as bright blue from the water.
  //
  // A single directional sample is far more saturated than the hemisphere
  // integral it is standing in for: real sky ambient arrives from every
  // direction at once, including the pale horizon, and bounces before it
  // lands. Desaturating toward its own luminance is the cheap stand-in.
  // Shadowed concrete on a clear day IS blue-tinted - just nothing like this.
  vec3 skyS = skyColor(normalize(N + vec3(0.0, 0.4, 0.0)), uSunDir);
  float skyL = dot(skyS, vec3(0.2126, 0.7152, 0.0722));
  vec3 amb = mix(vec3(skyL), skyS, 0.38);
  // Ground bounce: light arriving from below has come off sand and water, so it
  // is warmer and greener than the sky, and it is what stops undersides - the
  // whole substructure, seen from a rider at water level - going flat and dead.
  float down = clamp(-N.y * 0.5 + 0.5, 0.0, 1.0);
  amb *= mix(vec3(1.0), vec3(1.07, 1.01, 0.87), down * 0.55);
  // SEA-GLINT BOUNCE UNDER THE PIER - the first bounce of the same direct sun
  // the slack above admits, and the only light that can reach the faces the
  // direct term never touches (ndl=0 on every landward face with the sun on
  // the seaward flank). Measured on the head cam at slack 10: the dark-mask
  // pixels split 31% warm (B/R<=1.00, the slack-lit limbs, ratio .359) against
  // 54% at B/R>1.15 (the ndl=0 faces, ratio .189) - the mask MEDIAN B/R sat
  // pinned at 1.17 vs photo 763's 0.92 because the cool faces are the
  // majority, and no shadow term can move a face the sun does not touch.
  // In 763 those same faces visibly glow warm-green from sea sparkle. Same
  // subGate scope as the slack; weighted by the down factor above so upward
  // receivers keep their exact colour (sand/deck gates stay bit-identical).
  // (NO BACKTICKS IN THIS COMMENT - it lives inside a template literal.)
  // sqrt(down): the mask's cool majority is VERTICAL faces (down = 0.5), and
  // the linear weight left the mask B/R at 1.05; sqrt lifts a vertical face's
  // weight to 0.71 while an upward face stays at exactly 0.
  amb *= mix(vec3(1.0), vec3(1.26, 1.07, 0.82), subGate * sqrt(down));
  vec3 col = albedo * (amb * 0.62 + sunCol * ndl * 0.5 * sh);
  ${REPAIRMASK}
  ${LIGHTDBG}
  ${GEOMDBG}

  // ---- MAT.PICKET (5): the head-balustrade panel, NEAR FIELD ONLY ---------
  // The panel is a flat stand-in for 0.027 m balusters on a 0.125 m pitch
  // (measured, frame 562) and its single settled colour is the azimuth-mean of
  // that run (pier-railings-parapet.js, PICKET_LIFT = 1.288). The far number is
  // SETTLED - head-cam band 186.7 / 60.0 percent - and this block cannot move
  // it: pw is 0 beyond PK_FAR and mix(col, x, 0.0) returns col exactly.
  // Inside PK_NEAR the 2026-08-21 verification left one measured defect open:
  // the band p50 is right (192.0 at 6-10 m vs reference 194-198) but the
  // VARIANCE is missing - 74.5 percent of the band above L 180 against the
  // reference photograph's 60-65 - because a flat quad resolves no pickets at a
  // range where the real run resolves them at about 19 px pitch. That reads as
  // frosted glass. So inside the knee the panel re-develops the structure it
  // stands in for, in shader only:
  //  - vertical stripes in WORLD space along the run, pitch 0.125 m, whose
  //    width grows as 1/sin(view-to-run angle) exactly as a run of round
  //    balusters closes up (min duty 0.216 = 0.027/0.125, normal incidence);
  //  - the gap between stripes is the sky the panel occludes - skyColor of the
  //    continued view ray, the same detail-0 function the real 0.16 m gap
  //    under the capping renders with (measured there: rgb 184,204,216);
  //  - the stripe is the settled colour with the void lift divided back out:
  //    a(PICKET_COL) = 1.288 a(pierRail) per channel by construction, and col
  //    is linear in albedo, so col * 0.7764 IS the lit-paint component.
  // The run tangent comes from screen-space derivatives (the quad is flat, so
  // cross(dFdx, dFdy) is its exact geometric normal) because the SHADING
  // normal the panel carries is deliberately rotated up to 60 deg off the face
  // (see pier-railings-parapet.js) and would give a false pitch.
  // Knee 12..19 m, MEASURED against the head-camera gate band, and the first
  // knee tried (22..34) was WRONG about which run that band contains. The
  // cdbg=picketnear mask diffed against the clean render shows the band's
  // columns 15-344 sampling the EAST flank at about 19-26 m - 6,110 of its
  // 6,112 changed pixels were inside 28 m - because the head camera stands
  // only 18.5 m off that flank (s=256, o=+43 against the flank at o=+24.5)
  // and the top-down capping detector finds the NEAR rail, not the far one.
  // The settled 186.7 / 60.0 was measured on the flat panel THERE, so the
  // pattern must die before it: PK_FAR = 19 sits just inside the nearest
  // panel pixel this camera can see (18.5 m perpendicular), touching at most
  // a sub-0.01 weight at the band's left edge, while the along-neck panel
  // (5.4 m at s=144 to 16.0 m at the s=128.25 junction) takes the pattern at
  // weight 1.0 falling to 0.4.
  if (vMat > 4.5) {
    vec3 pdx = dFdx(vWorld), pdy = dFdy(vWorld);
    vec3 pN = cross(pdx, pdy);                    // geometric plane normal
    vec2 pT = normalize(vec2(pN.z, -pN.x));       // horizontal run tangent
    float pu = dot(vWorld.xz, pT);                // metres along the run
    vec2 pV = normalize(vec2(V.x, V.z));
    float psin = abs(pV.x * pT.y - pV.y * pT.x);  // |sin(view, run)|
    float pduty = min(1.0, 0.216 / max(psin, 0.216));
    float paa = max(fwidth(pu), 1.0e-4);          // metres per pixel along run
    float phw = 0.0625 * pduty;                   // half stripe width, metres
    float pm = abs(fract(pu * 8.0) - 0.5) * 0.125;
    float pcov = 1.0 - smoothstep(phw - 0.5 * paa, phw + 0.5 * paa, pm);
    // Minified limit: once a 0.125 m pitch is under a pixel the AA stripe no
    // longer averages to its own duty, so hand it the duty explicitly.
    pcov = mix(pcov, pduty, clamp(paa * 8.0, 0.0, 1.0));
    float pw = 1.0 - smoothstep(12.0, 19.0, dist);   // PK_NEAR..PK_FAR
    vec3 pgap = skyColor(vec3(-V.x, max(-V.y, 0.02), -V.z), uSunDir);
    vec3 pnear = mix(pgap, col * 0.7764, pcov);   // 0.7764 = 1 / 1.288
    col = mix(col, pnear, pw);
    ${PICKDBG}
  }

  // Beer-Lambert haze, not a linear fog ramp. The build sheet is explicit that
  // an exponential-squared fog visibly misrenders a 20 km depth range.
  float haze = 1.0 - exp(-dist / 4200.0);
  vec3 air = skyColor(normalize(vec3(-V.x, 0.03, -V.z)), uSunDir);
  col = mix(col, air, clamp(haze, 0.0, 0.94));

  // Dither last. The haze mix above is the worst offender in the whole file for
  // banding: it is a slow exponential ramp over hundreds of metres, so at any
  // distance the coast is a shallow gradient with nothing in it to hide the
  // 1/255 steps.
  fragColor = vec4(dither8(encode(col * uExposure), gl_FragCoord.xy), 1.0);
}
`;

// >>> DECALTIER (tmp-tr136)
// Depth bias per tier, in NDC. gl_Position.z is in [-w, w] and window depth is
// 0.5 * z_ndc + 0.5, so a shift of 2/2^24 in NDC is exactly ONE step of the
// depth buffer: DECAL_BIAS_STEPS is therefore TWO steps per tier, and
// decalBiasStep() below reads the real bit depth rather than assuming 24.
//
// Two is the measured minimum. tmp-tr136/invert.py sweeps every facade offset
// over 150-900 m at far 4,000 / 4,400 / 16,000: unbiased, the 8 cm strip is a
// clean win at only 52% of distances, a tie at 46% and INVERTED - landing
// behind the wall it is in front of - at 1.4%. At a 2-step bias every layer is
// a clean win at 100.00% of distances at all three far planes.
//
// It is also bounded above, and that is the reason it is not larger: a bias
// pulls the decal toward the camera in real depth, so it must stay well under
// the distance to anything genuinely in front of the building. At 800 m one
// step is 0.48 m, so the deepest tier in use (5, the slab vstrip) is pulled
// 4.8 m - comfortably inside the clifftop planting's standoff, but not by so
// much that this should be raised without re-measuring it.
// TWO STEPS OF WHATEVER DEPTH BUFFER THIS DEVICE ACTUALLY HAS. This was
// hard-coded to 2/2^24 and that made the SHIPPED CODE, not just the analysis,
// assume a 24-bit buffer without ever asking for one. On a 16-bit device the
// constant is 256x too small and this whole fix silently does nothing; on a
// 32-bit one it is 256x too large and a decal punches through whatever stands
// in front of it. One getParameter at construction settles it.
const DECAL_BIAS_STEPS = 2;
function decalBiasStep(gl) {
  const bits = gl.getParameter(gl.DEPTH_BITS) || 24;
  return DECAL_BIAS_STEPS * (2 / (Math.pow(2, bits) - 1));
}
// <<< DECALTIER

export class CoastRenderer {
  constructor(gl, mesh) {
    this.gl = gl;
    this.prog = link(gl, COAST_VERT, COAST_FRAG, 'coast', ATTRIBS);
    this.u = uniforms(gl, this.prog,
      ['uViewProj', 'uCamPos', 'uSunDir', 'uExposure', 'uOvercast', 'uDepthBias',
        ...SHADOW_UNIFORMS, ...COAST_TEX_UNIFORMS]);
    const { aPos, aNormal, aColor, aMat } = ATTRIBS;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    buffer(gl, gl.ARRAY_BUFFER, mesh.data);
    const S = mesh.stride;
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(aNormal); gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(aColor); gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, S, 24);
    gl.enableVertexAttribArray(aMat); gl.vertexAttribPointer(aMat, 1, gl.FLOAT, false, S, 36);
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, mesh.index);
    gl.bindVertexArray(null);
    this.count = mesh.count;
    // >>> DECALTIER  read once, against the default framebuffer bound now.
    this.decalBias = decalBiasStep(gl);
    // <<< DECALTIER
    // >>> DECALTIER  [i0, i1, tier] runs, ascending, inside the clifftop
    // building block. Empty on any mesh built before tmp-tr136.
    this.decalTiers = mesh.decalTiers || [];
    // And the ranges that are recorded where they were built rather than
    // permuted - the pier's, which the raid re-permutes at runtime.
    this.fixedDecals = mesh.fixedDecals || [];
    // Ranges that want back-face culling, which the coast as a whole cannot have.
    this.culledRanges = mesh.culledRanges || [];
    // Ranges that must not be drawn into the SHADOW MAP. A decal thinner than
    // the shadow's own bias (shadow.js: 12 cm grazing, 2.5 cm face-on) cannot
    // cast a shadow anyone can see at this range - it can only cast acne on the
    // wall it is painted on, and put every fragment near the bias boundary on a
    // knife edge. Tiers 1-2 are the 6-15 cm layers (stock window quads, facade
    // strips and curtains) and the pier's 10-12 mm stain runs; tier 3 and up -
    // the 0.22 m piers, the 0.30-0.50 m lips and their soffits - still cast,
    // because a cornice throws a real line. Sorted, because the shadow pass
    // walks them in order.
    // Split, because the two halves have different raid safety. The clifftop
    // tiers sit below the pier slice and the raid never moves them, so they are
    // always valid. The pier's - the stain runs and the balustrade panel - are
    // ranges into the pier slice AS BUILT, and hide-ranges.js permutes that
    // slice on raid entry, so they stand down for the duration exactly as the
    // colour pass's do.
    this.noCastRanges = this.decalTiers.filter((r) => r[2] > 0 && r[2] <= 2)
      .map((r) => [r[0], r[1]])
      .sort((p, q) => p[0] - q[0]);
    this.noCastPier = this.fixedDecals.filter((r) => r[2] <= 2).map((r) => [r[0], r[1]])
      .concat(mesh.noCastOnly || [])
      .sort((p, q) => p[0] - q[0]);
    // <<< DECALTIER
    this.tex = null;
  }

  // Called once the async texture load resolves. Until then uHasTex is 0 and
  // the coast renders exactly as it did before - a slow fetch degrades, it does
  // not block or break.
  setTextures(tex) { this.tex = tex; }

  // >>> RAID
  // tr64: the Viking siege permutes THIS buffer's pier slice on raid entry so that each pier
  // section's above-deck triangles are one contiguous range it can skip, and puts the original
  // back on exit (src/raid/hide-ranges.js). Same indices, reordered; the vertex buffer, the
  // triangle count and every uniform are untouched. Never called with the raid off.
  raidIndexRead(i0, i1) {
    const gl = this.gl, out = new Uint32Array(i1 - i0);
    gl.bindVertexArray(this.vao);
    gl.getBufferSubData(gl.ELEMENT_ARRAY_BUFFER, i0 * 4, out);
    gl.bindVertexArray(null);
    return out;
  }

  raidIndexWrite(i0, data) {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, i0 * 4, data);
    gl.bindVertexArray(null);
  }
  // <<< RAID

  draw(cam, vp, sunDir, exposure, shadow) {
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.uViewProj, false, vp);
    gl.uniform3f(this.u.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform3f(this.u.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform1f(this.u.uExposure, exposure);
    if (this.u.uOvercast) gl.uniform1f(this.u.uOvercast, OVERCAST.v);
    if (shadow) shadow.bind(gl, this.prog, this.u);

    const t = this.tex;
    gl.uniform1f(this.u.uHasTex, t ? 1 : 0);
    if (t) {
      const bind = (name, unit, key) => {
        if (!t[key] || !this.u[name]) return;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t[key]);
        gl.uniform1i(this.u[name], unit);
      };
      bind('uCliffA', 0, 'cliffAlbedo');  bind('uCliffN', 1, 'cliffNormal');
      bind('uSandA', 2, 'sandAlbedo');    bind('uSandN', 3, 'sandNormal');
      bind('uTimberA', 5, 'timberAlbedo'); bind('uTimberN', 6, 'timberNormal');
      bind('uConcA', 7, 'concreteAlbedo'); bind('uConcN', 8, 'concreteNormal');
      // unit 4 is the shadow map - see ShadowMap.bind
    }

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);       // the coast ribbon is single-sided
    gl.bindVertexArray(this.vao);
    // >>> RAID
    // Viking pier siege: a SORTED, NON-OVERLAPPING list of [i0, i1] index ranges not to draw -
    // the pier crowd (nobody stands on a burning pier) and every section that has collapsed
    // (src/raid/hide-ranges.js). Set on globalThis only while the raid runs; with it absent
    // this is one drawElements exactly as before. tr64: was one range, now several.
    const raidSkip = globalThis.__raidHideRanges;
    // >>> DECALTIER
    // The biased tiers are contiguous (coast.js permuteDecalTiers lays them out
    // tier 0, 1, 2 ... in one block), so they cost ONE extra skip range in the
    // loop below plus one small draw each. They are cut out of the main pass
    // and redrawn with their bias; the raid's ranges address the pier, built
    // long after this block, so the two lists never overlap - sorted anyway so
    // the loop does not depend on that.
    const biased = this.decalTiers.length
      ? this.decalTiers.filter((r) => r[2] > 0) : [];
    // The pier's decal ranges are index ranges into the pier slice AS BUILT, and
    // hide-ranges.js permutes that slice on raid entry. It now permutes by
    // (section, class) rather than by section alone, so it can hand back the
    // same ranges in permuted coordinates - published as __raidDecalRanges, and
    // published ONLY when the permutation is actually in force. Absent, the
    // index buffer is the one this renderer built against and its own ranges
    // are the correct ones. So there is no standdown any more: the arcade's
    // fascia band and the culled silhouettes survive the siege.
    const rd = globalThis.__raidDecalRanges;
    const fixed = rd ? rd.biased : this.fixedDecals;
    const culled = rd ? rd.culled : this.culledRanges;
    let skips = biased.length
      ? [[biased[0][0], biased[biased.length - 1][1]]] : [];
    for (let k = 0; k < fixed.length; k++) skips.push([fixed[k][0], fixed[k][1]]);
    for (let k = 0; k < culled.length; k++) skips.push([culled[k][0], culled[k][1]]);
    if (raidSkip && raidSkip.length) skips = skips.concat(raidSkip);
    if (skips.length > 1) skips.sort((p, q) => p[0] - q[0]);
    if (this.u.uDepthBias) gl.uniform1f(this.u.uDepthBias, 0);
    if (skips.length) {
      let p = 0;
      for (let k = 0; k < skips.length; k++) {
        const a = skips[k][0], b = skips[k][1];
        if (a > p) gl.drawElements(gl.TRIANGLES, a - p, gl.UNSIGNED_INT, p * 4);
        p = b;
      }
      if (this.count > p) gl.drawElements(gl.TRIANGLES, this.count - p, gl.UNSIGNED_INT, p * 4);
    } else
    // <<< DECALTIER
    // <<< RAID
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_INT, 0);
    // >>> DECALTIER
    for (let k = 0; k < biased.length; k++) {
      const r = biased[k];
      gl.uniform1f(this.u.uDepthBias, r[2] * this.decalBias);
      gl.drawElements(gl.TRIANGLES, r[1] - r[0], gl.UNSIGNED_INT, r[0] * 4);
    }
    for (let k = 0; k < fixed.length; k++) {
      const r = fixed[k];
      gl.uniform1f(this.u.uDepthBias, r[2] * this.decalBias);
      gl.drawElements(gl.TRIANGLES, r[1] - r[0], gl.UNSIGNED_INT, r[0] * 4);
    }
    if ((biased.length || fixed.length) && this.u.uDepthBias) {
      gl.uniform1f(this.u.uDepthBias, 0);
    }
    if (culled.length) {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      for (let k = 0; k < culled.length; k++) {
        const r = culled[k];
        gl.drawElements(gl.TRIANGLES, r[1] - r[0], gl.UNSIGNED_INT, r[0] * 4);
      }
      gl.disable(gl.CULL_FACE);
    }
    // <<< DECALTIER
    gl.bindVertexArray(null);
  }
}

// ---------------------------------------------------------------------------
// THE RIDER'S FIVE MATERIALS. base rgb (LINEAR, the shader multiplies both the
// direct and the ambient term by it) + roughness.
//
// WHERE THE NUMBERS COME FROM. Two same-frame reads off the owner's own
// Bournemouth reference library. Trap 5 allows a RATIO inside one frame
// unconditionally, and every number below is a ratio; trap 17's clip share is
// stated next to every brightness.
//
//   bournemouth-beach/3501930726503853.jpg - Jul 31 2020, packed beach, full
//   sun, whole-frame clip 0.46%. Over the crowd band (rows 380-684), n = 44,788
//   skin px and 24,720 dark-garment px, masks painted and looked at before they
//   were named (trap 15):
//       skin           L p10/p50/p90   74.0 / 116.1 / 176.6   RGB p50 154,107,85
//       dark garment   L p10/p50/p90   12.1 /  29.5 /  48.4   RGB p50  33, 28,32
//       skin p50 / dark p50 = 3.94
//   sandbanks/2335190473177890.jpg - Feb 7 2019, RNLI lifeguard on the
//   Bournemouth stand, sunny, whole-frame clip 2.69%. Hand-placed boxes, mask
//   image kept at tmp-tr4/rider/r/REF_lg_boxes.png:
//       sunlit skin (hand)   L 175.2  (box clips 28.6% - OVERSTATED, see below)
//       shaded skin (cheek)  L  78.6  clip 0.00%
//       bright garment lit   L 135.2  clip 7.85%
//       bright garment shade L  82.2  clip 0.00%
//       black item (radio)   L  20.3  clip 0.00%
//   i.e. skin/dark 2.0-8.6 depending on how much sun the skin has, and a bright
//   garment landing BETWEEN dark and skin.
//
// THE ANCHOR THAT ACTUALLY DECIDED THE WETSUIT, because a bare luma cannot be
// carried between a photograph and a render with different exposure: the crowd
// frame contains OPEN SEA as well as garments, so both can be quoted as a
// fraction of the sea in their own frame, and so can the render.
//
//                              dark garment / open sea      skin / open sea
//   reference 3501930726503853          0.225                    0.888
//   render, the old single colour       0.607                      -
//   render, SHIPPED                     0.358                    0.803
//
// ⚠️ THOSE THREE RENDER FIGURES ARE BOX-DEPENDENT AND THE BOX WAS NOT SAVED.
// An independent verifier swept every clean 40x40 sea box in the tight frame and
// found the sea median ranging 87.1 to 218.9 - a 2.5x spread - so ANY ratio
// quoted against "the sea" moves with where you sample it. Re-measured with a
// STATED box (the 60 px either side of the figure's bbox over its own rows,
// rider excluded, n = 40,440, sea median L 166.8) and whole-material medians
// rather than hand-placed patches: reference 0.236, old single colour 0.468,
// shipped 0.259. The DIRECTION and the MAGNITUDE of the improvement reproduce;
// the exact pair above does not. Quote the stated-box numbers, or state your own
// box next to any number you add here - trap 15's lesson on a different axis.
//
// The old figure's one colour was far too light to be a wetsuit; the shipped
// value closes most of that gap without overshooting (61% on the pass's own
// unstated box, 90% on the verifier's stated one), and skin lands close to the
// reference on the same anchor either way.
//
// ⚠️ NEGATIVE RESULT, MEASURED, DO NOT "FINISH" THIS. A sixth pass put the
// wetsuit at real neoprene albedo (0.027/0.029/0.034, which is what the anchor
// asks for by extrapolation) and rendered it. It OVERSHOOTS in both directions
// - suit/sea 0.175 against the reference's 0.225 and skin/suit 4.58 against
// 3.94 - and it INVERTS the head-vs-torso break, taking it from 0.69/0.76/0.33
// to 1.37/1.51/0.33 as the near-black torso drops below the head band. The
// reference is bracketed by the shipped value and that one; landing exactly on
// it costs the head break, which is the defect this pass existed to fix.
// Renders: tmp-tr4/rider/r/F_*.png and r/SBS_EF_chase.png.
//
// ⚠️ Every colour here is a rider material. NONE of the 18 protected pier
// palette keys is touched, and none of these five is a palette key - they are
// literals passed straight to uBaseColor, the same way the board and foil
// already were.
const RIDER_PAINT = [];
// >>> RIDER
// ---------------------------------------------------------------------------
// RE-SOLVED 20 SEP 2026, WITH THE ENVREF REFLECTION PRESENT. The value above
// this fence was 0.075/0.080/0.094, and the line that justified it - "renders
// at L 52.6 at the tight camera against open sea at L 146.8" - was solved
// against a lighting model that had no environment term at all. ENVREF added
// one and the same albedo now renders +15.6 L brighter at that camera. The
// number did not become wrong; the model it was solved against stopped
// shipping.
//
// MY BOX, STATED, because the last pass's was not and a verifier showed the sea
// median ranges 87.1 to 218.9 across 40x40 boxes in ONE frame. Box: the 60
// columns immediately left and right of the rider's own bbox, over the rider's
// own rows, every rider pixel excluded. Rec.709 luma on display values, whole-
// material MEDIANS. n = 32,880 (tight) / 28,560 (chase) / 26,040 (side); sea
// L 147.7 / 130.0 / 160.5. That is the verifier's box in tmp-tr4/verify/
// rider.md, reused on purpose so the two sets of numbers can be put side by
// side. Cameras are ENVREF's three (tmp-tr192/jobs_rider.json).
//
// THE MATERIAL MASK IS EXACT, NOT A HUE BUCKET. tmp-tr192/ridertone.py split
// materials inside the ?rdbg=norider mask by hue and its own comment admits the
// dark bucket was "navy neoprene + hair". Hair renders 14-17 L darker, so that
// bucket's median moves with however much hair the camera sees - and the chase
// camera frames the back of the head. ?rpaint= (above) paints one material
// white and the rest black; differencing against an all-black render gives that
// material's visible pixels exactly. See tmp-tr196/ridertone196.py.
//
// THE ANCHOR, RE-MEASURED FROM THE PHOTOGRAPH A THIRD TIME rather than quoted:
// bournemouth-beach/3501930726503853.jpg with tmp-tr4/rider/r/REF_crowd_mask.png,
// dark garment 24,720 px, skin 44,788 px, open sea rows 300-330 (n = 31,744):
//     dark/sea 0.2361    skin/sea 0.9301    skin/dark 3.940
// ⚠️ THOSE ARE NOT TWO CONSTRAINTS. skin/dark is (skin/sea) / (dark/sea), and
// the render's skin/sea already sits at 0.927 mean against the photograph's
// 0.930, so the two collapse to ONE constraint on the suit. Agreement between
// them is arithmetic, not corroboration.
//
// WHAT WAS MEASURED (suit/sea, three cameras, exact masks, my box):
//     old lighting, shipped albedo   0.311 / 0.368 / 0.205   mean 0.295
//     new lighting, shipped albedo   0.417 / 0.444 / 0.280   mean 0.380
//     the photograph                                          0.236
// ⚠️ The CAMERA-TO-CAMERA spread (0.280 to 0.444) is larger than the change
// ENVREF made. No single camera can be called "the" anchor; the mean of the
// three is quoted and the three are always printed.
//
// ⚠️ THE NEGATIVE RESULT BELOW IS NOT BEING "FINISHED". IT IS BEING EXPLAINED.
// The sixth pass moved the WETSUIT to real neoprene and left the HAIR where it
// was, and the head-vs-torso break inverted. That is arithmetic: the hair is a
// separate material with a separate value, so a suit taken darker than the hair
// makes the torso band darker than the head band. Measured here, suit alone:
//     scale   suit/sea mean   hair/suit t/c/s        head/torso t/c/s
//     1.00       0.380        0.72 / 0.90 / 0.85     0.54 / 0.80 / 0.80
//     0.80       0.345        0.80 / 1.00 / 0.93     0.59 / 0.88 / 0.88
//     0.50       0.290        0.95 / 1.20 / 1.09     0.70 / 1.06 / 1.03  INVERTED
//     0.36       0.262        1.05 / 1.34 / 1.19     0.77 / 1.17 / 1.13  INVERTED
// The hair's own comment says its LEVEL was never anchored - "only its SIGN is
// used: hair is the darkest thing on a head". So the hair is the free parameter
// and the suit is the anchored one. Moving BOTH by the same factor keeps the
// albedo relationship that comment describes and the inversion does not happen:
//     scale   suit/sea mean   hair/suit t/c/s        head/torso t/c/s
//     0.50       0.290        0.76 / 0.94 / 0.89     0.54 / 0.83 / 0.85
//     0.36       0.262        0.78 / 0.95 / 0.91     0.55 / 0.85 / 0.87
//     0.24       0.237        0.80 / 0.98 / 0.94     0.55 / 0.86 / 0.88
//
// WHY 0.36 AND NOT 0.24, WHICH LANDS THE ANCHOR EXACTLY. 0.24 puts the wetsuit
// at linear luma 0.0192 and the hair at 0.0109 - both BELOW any real material,
// which would be compensating for the environment term by inventing an albedo
// no substance has. 0.36 is the real-neoprene value the negative result names
// (0.027/0.029/0.034) and it closes 82% of the gap. It is also where the
// hair-vs-suit break stops improving: 0.95 at chase against 0.98 at 0.24.
// A KNOWN RESIDUAL: 11% brighter than the photograph, stated rather than
// dialled out.
//
// ⚠️ The hair-vs-suit break is COMPRESSED by the reflection whatever is done
// here - it was 0.83 at chase before ENVREF and 0.90 after, at the shipped
// albedo. The additive environment floor is the same absolute quantity on both
// materials, so the darker the pair the closer their ratio runs to 1. That is a
// property of the lighting model, not of these numbers, and it is not mine to
// retune.
//
// ABLATION: ?rpaint=0:0.075,0.080,0.094,0.75;3:0.058,0.043,0.032,0.92;4:0.063,0.066,0.073,0.88
// restores the three pre-2026-09-20 values verbatim on the same build.
// ---------------------------------------------------------------------------
RIDER_PAINT[RIDER_MAT.WETSUIT] = [0.027, 0.029, 0.034, 0.75];
// <<< RIDER
// VEST - a buoyancy aid. The HUE is a choice and is declared as one: no eFoil
// rider exists anywhere in the reference library, so there is nothing to
// measure a hue off. What IS measured is the constraint it has to satisfy - the
// lifeguard frame puts a safety garment BETWEEN the dark item (L 20) and lit
// skin (L 175), at L 82 shaded to L 135 lit - and safety orange is what a UK
// buoyancy aid is, corroborated by the RNLI top in that same frame. Renders at
// L 128.1, i.e. inside that band and 2.44x the wetsuit.
RIDER_PAINT[RIDER_MAT.VEST] = [0.72, 0.26, 0.075, 0.62];
// SKIN - hue from the crowd frame's UNCLIPPED skin p50 RGB 154,107,85, which is
// linear 0.319 / 0.145 / 0.0876, i.e. R/G 2.20 and B/G 0.60. Held back to
// R/G 2.00, B/G 0.72 because that mask takes in warm sand-shadow edges at the
// body outline and is pushed orange by them (visible in r/REF_crowd_mask_z.png)
// - the ratio is a ceiling, not a centre. Magnitude is the largest break that
// renders with ZERO clipped pixels on the whole figure at all three cameras.
RIDER_PAINT[RIDER_MAT.SKIN] = [0.86, 0.43, 0.31, 0.55];
// HAIR - wet hair, darker than neoprene. The reference frame's hair crushes to
// L 1-2 against a bright sky and cannot give a level, so only its SIGN is used:
// hair is the darkest thing on a head. Renders at L 26.4 = 0.50x the wetsuit
// and 0.22x the skin of the neck below it, which is the break that stops the
// head being an ovoid. Roughness 0.92, not 0.85: at 0.85 the specular lobe put
// a hard highlight on the crown and it read as a bike helmet (r/Z_A_tight.png).
// >>> RIDER
// Was 0.058/0.043/0.032. Scaled by the same 0.36 as the wetsuit, for the reason
// set out in the WETSUIT block: this material's LEVEL was never anchored - only
// its sign was - so it is the free parameter that lets the anchored one move.
// Same factor, so the hue and the hair-to-suit albedo ratio (0.568) the comment
// above describes are both unchanged. Rendered hair/suit after: 0.78 tight,
// 0.95 chase, 0.91 side - darker than the suit at all three, which is the sign
// this material exists to carry.
RIDER_PAINT[RIDER_MAT.HAIR] = [0.021, 0.015, 0.012, 0.92];
// <<< RIDER
// BOOT - the same neoprene, flatter. Roughness 0.88 against the suit's 0.75:
// the difference is sheen, not colour, which is what separates a rubber-soled
// bootie from a suit leg at the ankle.
// ⚠️ THIS MATERIAL RENDERS ZERO PIXELS AT EVERY CAMERA MEASURED SO FAR, and an
// earlier version of this comment claimed "renders at 0.84x the suit", which was
// COMPUTED, NOT MEASURED. Verified independently: 0 px at the chase, side and
// tight rider cameras, 0/0/1 px at three more including one from directly above,
// and still 0 px with the board and foil removed entirely. The cause is not the
// material split - at rest the plant sits in mode FLOAT at y = -0.1998, so the
// board, the foil AND the rider's feet are all at or below the waterline, and
// the sea is drawn before the craft and occludes them. 240 of the rider's 1,900
// triangles (12.6%) and one of five draw calls therefore produce nothing at the
// cameras this pass could judge. It may well matter in flight with the board
// clear of the water - THAT CASE HAS NEVER BEEN RENDERED, so nothing is known
// either way. Do not tune this material against a number; render it first.
// >>> RIDER
// ⚠️ RENDERED FIRST, AS THAT NOTE ASKS. It is not zero everywhere. At the
// JETSKI it renders 137 px in a 42x95 bbox (tmp-tr196/game/gpwc_*, exact
// ?rpaint= mask, 1280x720) - the PWC rider stands on the running boards, which
// are above the waterline, so the booties are in shot where the eFoil's are
// not. On the eFoil it is still 0 px at every camera measured, including the
// real chase framing. So the note's claim was right about the eFoil and wrong
// as a general statement, and the material IS judgeable - on the other craft.
//
// Was 0.063/0.066/0.073. Scaled by the same 0.36 as the wetsuit and NOT tuned
// against its own number: this comment's own words are "the same neoprene,
// flatter", and 0.063/0.075 = 0.84 of the suit. Keeping that identity is what
// stops a bootie and a suit leg separating at the ankle for a reason that is
// not sheen. Measured at the jetski camera above, exact mask, 144 px: BOOT
// L 60.7 -> 43.0 against the wetsuit's 65.3 -> 44.8 on the same two frames, so
// it stays the darker of the two (0.93 before, 0.96 after) and the ankle break
// is not lost. That is ONE camera and 144 px; it is not a survey.
RIDER_PAINT[RIDER_MAT.BOOT] = [0.023, 0.024, 0.026, 0.88];
// <<< RIDER

// >>> RIDER
// ---------------------------------------------------------------------------
// ?rpaint= - THE INSTRUMENT THIS PASS'S TONE NUMBERS COME FROM. Debug only,
// absent by default, and it changes nothing when absent.
//
// TWO JOBS, and neither is obtainable any other way.
//
// 1. AN EXACT PER-MATERIAL PIXEL MASK. The previous pass separated the rider's
//    materials INSIDE the ?rdbg=norider mask by HUE (tmp-tr192/ridertone.py:
//    "suit = bl >= r && L < 120"). That bucket contains the HAIR as well as the
//    wetsuit - the file itself says so - and hair renders about 14 L darker, so
//    a "wetsuit" median measured that way is pulled down by however much hair
//    the camera happens to see. At the chase camera, which frames the back of
//    the head, that is a lot. Overriding ONE material to black and then to
//    white and differencing the two renders gives that material's visible
//    pixels EXACTLY: the geometry, the depth order and every other material are
//    bit-identical between the pair, so a pixel that moved can only be this
//    material. It is the same difference-mask logic as ?rdbg=norider, one
//    material down.
// 2. AN ALBEDO SWEEP WITHOUT A REBUILD. Re-solving the wetsuit means rendering
//    a dozen candidate albedos. Editing the constant and re-serving for each
//    one risks measuring a stale file (the contract's sha1 rule exists because
//    that has happened); driving it from the URL cannot, because the served
//    bytes never change.
//
// Syntax: ?rpaint=<mat>:<r>,<g>,<b>[,<rough>][;<mat>:...]  with mat 0..4 in
// RIDER_MAT order (WETSUIT, VEST, SKIN, HAIR, BOOT). Anything unparseable is a
// THROW, not a silent skip - a debug switch that quietly ignores a typo hands
// you a clean-build render and lets you label it as a swept one.
//
// It mutates the RIDER_PAINT array in place, so boats.js - which imports the
// same array for the PWC and RIB drivers - is overridden too and the jetski
// rider cannot silently disagree with the eFoil one.
//
// Guarded on `location` exactly like RDBG above, so node tooling still imports
// this file. With the parameter absent this whole block is one failed
// URLSearchParams lookup at module load and the array is untouched.
// ---------------------------------------------------------------------------
const RPAINT = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
  ? (new URLSearchParams(location.search).get('rpaint') || '') : '');
if (RPAINT) {
  for (const part of RPAINT.split(';')) {
    if (!part) continue;
    const [k, vals] = part.split(':');
    const mat = Number(k);
    if (!Number.isInteger(mat) || mat < 0 || mat > 4) {
      throw new Error('rpaint: bad material index ' + k);
    }
    const n = (vals || '').split(',').map(Number);
    if (n.length < 3 || n.length > 4 || n.some((v) => !Number.isFinite(v))) {
      throw new Error('rpaint: bad value list for material ' + mat + ': ' + vals);
    }
    RIDER_PAINT[mat] = [n[0], n[1], n[2], n.length === 4 ? n[3] : RIDER_PAINT[mat][3]];
  }
}
// <<< RIDER

// Baked lean poses. 11 across ±0.4 rad is about 4° apart - finer than the eye
// resolves on a figure 3.4 m away, and it all warms at construction.
const POSES = 11;
const LEAN_MIN = -0.40;
const LEAN_MAX = 0.40;
const poseLean = (i) => LEAN_MIN + (LEAN_MAX - LEAN_MIN) * (i / (POSES - 1));

export class CraftRenderer {
  constructor(gl, mastLength) {
    this.gl = gl;
    this.prog = link(gl, VERT, FRAG, 'craft', ATTRIBS);
    this.u = uniforms(gl, this.prog,
      ['uViewProj', 'uModel', 'uCamPos', 'uSunDir', 'uBaseColor', 'uRough', 'uExposure', 'uOvercast',
        // >>> ENVREF  null under ?cdbg=noenv, which does not declare it.
        'uWaterY',
        // <<< ENVREF
        ...SHADOW_UNIFORMS]);
    this.aPos = ATTRIBS.aPos;
    this.aNormal = ATTRIBS.aNormal;

    this.mastLength = mastLength;
    this.board = this._upload(buildBoard());
    this.foil = this._upload(buildFoil(mastLength));
    this.model = new Float32Array(16);

    // The rider leans continuously, but rebuilding the mesh to show it meant
    // destroying and recreating a VAO every frame - which stalls the driver
    // hard enough to hang the page. Poses are baked once instead and the
    // nearest is picked per frame: no allocation, no upload, nothing lazy.
    this.poses = [];
    for (let i = 0; i < POSES; i++) {
      this.poses.push(this._upload(buildRider(poseLean(i))));
    }
    this.rider = this.poses[(POSES - 1) >> 1];
  }

  _upload(mesh) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = buffer(gl, gl.ARRAY_BUFFER, mesh.data);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(this.aNormal);
    gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, 24, 12);
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, mesh.index);
    gl.bindVertexArray(null);
    // `groups` is present only on the rider. The shadow pass (renderer.js:206)
    // and the board/foil draws keep using `count` and are untouched by it.
    return { vao, vbo, count: mesh.count, groups: mesh.groups || null };
  }

  // The mast length is an ASSIST setting, so the foil has to be rebuildable.
  // Rare enough to do eagerly; never inside a frame.
  setMast(mastLength) {
    if (Math.abs(mastLength - this.mastLength) < 1e-6) return;
    const gl = this.gl;
    gl.deleteVertexArray(this.foil.vao);
    gl.deleteBuffer(this.foil.vbo);
    this.mastLength = mastLength;
    this.foil = this._upload(buildFoil(mastLength));
  }

  // Pick the nearest baked pose. Pure selection - no GL objects are created or
  // destroyed here, which is the whole point.
  setLean(lean) {
    const t = (lean - LEAN_MIN) / (LEAN_MAX - LEAN_MIN);
    const i = Math.max(0, Math.min(POSES - 1, Math.round(t * (POSES - 1))));
    this.rider = this.poses[i];
  }

  // model = translate(pos) * rotY(-heading) * rotZ(pitch) * rotX(roll)
  _setModel(x, y, z, heading, pitch, roll) {
    const m = this.model;
    const ch = Math.cos(heading), sh = Math.sin(heading);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    // local +X forward, +Y up, +Z right
    const fx = ch * cp, fy = sp, fz = sh * cp;
    const rx = -sh * cr + ch * sp * sr;
    const ry = -cp * sr;
    const rz = ch * cr + sh * sp * sr;
    const ux = fy * rz - fz * ry;
    const uy = fz * rx - fx * rz;
    const uz = fx * ry - fy * rx;
    m[0] = fx; m[1] = fy; m[2] = fz; m[3] = 0;
    m[4] = -ux; m[5] = -uy; m[6] = -uz; m[7] = 0;
    m[8] = rx; m[9] = ry; m[10] = rz; m[11] = 0;
    m[12] = x; m[13] = y; m[14] = z; m[15] = 1;
    return m;
  }

  draw(sim, cam, vp, sunDir, exposure, shadow, mode = 'chase') {
    const gl = this.gl;
    const s = sim.plant.state, w = sim.world;
    const down = s.mode === 'DOWN';
    const fpv = mode === 'fpv';

    this.setMast(sim.plant.mast);
    this.setLean(down ? 0.55 : s.pitch * 1.25);

    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.uViewProj, false, vp);
    gl.uniform3f(this.u.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform3f(this.u.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform1f(this.u.uExposure, exposure);
    if (this.u.uOvercast) gl.uniform1f(this.u.uOvercast, OVERCAST.v);
    // >>> ENVREF
    // The INSTANTANEOUS local water surface under the craft, from the same Sea
    // object the physics reads, at the craft's own (x, z). Slot 2: plant.js
    // owns 0 and 1, boats.js owns 3, so this takes the one that was free and
    // cannot evict a solve the sim is relying on. Guarded on the uniform being
    // present, so a ?cdbg=noenv build - which does not declare it - skips it.
    if (this.u.uWaterY) {
      gl.uniform1f(this.u.uWaterY,
        sim.sea ? sim.sea.sample(w.x, w.z, sim.time, 0, 2).height : 0);
    }
    // <<< ENVREF
    if (shadow) shadow.bind(gl, this.prog, this.u);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    const model = this._setModel(w.x, s.y, w.z, w.heading, s.pitch, w.roll);
    gl.uniformMatrix4fv(this.u.uModel, false, model);

    const part = (mesh, r, g, b, rough) => {
      gl.uniform3f(this.u.uBaseColor, r, g, b);
      gl.uniform1f(this.u.uRough, rough);
      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    };

    part(this.board, 0.72, 0.74, 0.77, 0.35);   // pale deck
    part(this.foil, 0.40, 0.43, 0.47, 0.18);    // bare metal, glossy
    // In FPV the camera sits at eye height INSIDE this mesh, so drawing it
    // fills the screen with the inside of the rider's own chest. You are the
    // rider; you do not get to see yourself.
    if (!fpv && !NO_RIDER) {
      // FIVE draw calls, one per material, over ONE vertex buffer and one index
      // buffer: meshes.js sorts the rider's triangles into material blocks at
      // build time, so this is a loop over five contiguous index ranges and not
      // five meshes. See RIDER_PAINT above for where each colour comes from.
      const gl2 = this.gl;
      gl2.bindVertexArray(this.rider.vao);
      for (const gp of this.rider.groups) {
        const p = RIDER_PAINT[gp.mat];
        gl2.uniform3f(this.u.uBaseColor, p[0], p[1], p[2]);
        gl2.uniform1f(this.u.uRough, p[3]);
        // Byte offset, not index offset - UNSIGNED_SHORT is 2 bytes.
        gl2.drawElements(gl2.TRIANGLES, gp.count, gl2.UNSIGNED_SHORT, gp.start * 2);
      }
    }

    gl.bindVertexArray(null);
    gl.disable(gl.CULL_FACE);
  }
}

// >>> CRAFT
// The boat drivers wear the same five rider materials (src/gl/boat-meshes.js).
export { RIDER_PAINT };
// <<< CRAFT
