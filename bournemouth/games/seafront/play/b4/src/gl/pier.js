// ⚠️⚠️ THIS MODEL IS KNOWN WRONG — see the corrections at the bottom of this
// header. Verified pier reference now lives in
// C:\claude\bournemouth-reference\bournemouth-pier\ with PIER-INDEX.json and
// BY-FEATURE.json (query by deck / piles-trestles / underside / barrel-roof
// etc). 84 verified videos, 37 rated high modelling value.
//
// BOURNEMOUTH PIER, in detail.
//
// This is the marketing asset. Everything here comes from reference/coast.md
// §B.1a and §B.1c, and the four corrections that section makes to SPEC §4 all
// bite hardest right here:
//
//   - It is a GREY REINFORCED CONCRETE structure, neck rebuilt 1979-81, and the
//     county HER describes it as resembling a long road bridge. It is NOT
//     Victorian cast-iron filigree. That is "the single worst error available".
//   - It is 260 m, not 1,000 ft. The Victorian figure included landing stages.
//   - The pier-head building has an OXIDISED COPPER GREEN roof and WHITE
//     railings, not a grey box.
//   - Boscombe's head is bare; this one carries an 82 m building block. The
//     contrast between the two is the whole point.
//
// The silhouette the build sheet asks for, from 200 m offshore:
//   long low bare neck -> a sudden STEP up into a solid 82 m building mass ->
//   short open deck -> a tower -> a stub tip.
// ⚠️ THE STUB TIP IS NOT REAL and is no longer drawn. Aerial 0657 (crop
// c657tip) and drone 0588 both show the head running out at full width and
// ending SQUARE, with the zip tower standing at that square end. What the open
// deck beyond the block actually carries, landward to seaward, is the rotunda
// and then the tower, and nothing else. See the tip section. (2026-09-16, DSM:
// the rotunda closes the block's seaward end at s 208; the open deck lies
// between it and the tower.)
//
// ---------------------------------------------------------------------------
// THREE LONG-OPEN QUESTIONS, SETTLED FROM THE FOOTAGE. All three are RESOLVED
// POINTS, not open ones. Full evidence is at each site in the file.
// A and B settled 2026-08-16 and INDEPENDENTLY RE-CHECKED 2026-08-19 against
// the frames again, not against this header; C settled 2026-08-19.
//
//  A. THE HELTER SKELTER IS NOT PART OF THE PIER. REMOVED.
//     It is a temporary fairground ride on the open deck seaward of the block.
//     Present in 0536, 0542, 0579 (and tagged in 0535, 0552, 0643, 0681).
//     Absent from EVERY square-on side elevation and EVERY aerial in the set:
//     0565, 0666, 0598, 0605, 0620, 0676, 0568, 0588, 0608, 0657, 0590, 0599.
//     0579 and 0565 are both bright blue-sky frames of the same 30 m of deck;
//     one has a striped cone on it and the other has bare deck. That is a ride
//     that gets trucked in and out, not a building. It was also the loudest
//     object in all four judged cameras, which made the model read as A PIER
//     instead of as THIS pier.
//     RE-CHECKED 2026-08-19 and the case got stronger, from two directions.
//     0536 is the decisive frame and it had not been read closely enough: it
//     is shot from the deck three metres away, and the ride stands on the bare
//     boards ringed by HIRE CROWD BARRIERS, with wheelie bins and a trailer
//     beside it. Buildings do not get fenced off with barrier sections. And
//     the index's own captions place the sightings at events rather than in
//     the calendar generally - 0681 has a RED ARROWS STALL in the foreground
//     (Air Festival), 0552 and 0643 are dusk crowds with the ride LIT, 0535 is
//     "beyond crazy golf". Seven sightings, all summer-event-flavoured, against
//     twelve clean frames. Seasonal, and correctly gone.
//
//  B. THE ROTUNDA IS REAL, IT IS ON THE HEAD, AND IT WAS 1.8x TOO TALL.
//     Five independent frames in three lights show a white pavilion - colonnade,
//     projecting cornice, shallow segmental dome, lantern - at the seaward end
//     of the block (s 208, DSM 2026-09-16; it stood on the open deck at s 227
//     until then): 0666, 0565, 0598, and the two drone
//     frames 0588 and 0608, the first of which shows the dome's radial ribs.
//     It is NOT the green-roofed octagon frame 0599 shows at the ENTRANCE; that
//     is the ticket kiosk, ~3 m across, and pier-deck-furniture.js builds it.
//     Two real objects, not one object in the wrong place.
//     Re-measured off 0666 against the LIDAR roof height IN THE SAME FRAME, the
//     dome apex is 5.17 m above deck, not the 8.3 m built, and the lantern top
//     6.47 m, not 9.5 m. Cut to those. It is a low pavilion; it had been a
//     landmark taller than the head building's own roof.
//     RE-CHECKED 2026-08-19: position and height both stand (an independent
//     read of 0666 put the apex at 20-24 px above the deck line against the
//     42 px the LIDAR fixes as 8.83 m, i.e. 4.3-5.2 m, and 5.17 is inside
//     that). 0536 adds the thing no side elevation could: the pavilion is on
//     the EAST side of the head, which is the +o side and where it is built.
//     What DID need fixing is that it rendered as a smooth white lump - the
//     verandah was too shallow to shadow. Drum re-cut from r 7.2 to 6.4 and
//     glazed. See the ⚠️ at the rotunda.
//
//  C. THE PARASOLS ARE NOT THERE EITHER. REMOVED 2026-08-19.
//     Seven red-and-yellow canopies on the open head deck, the last geometry
//     in this file still drawn out of the helter skelter's palette and the
//     last survivor of the pass that placed the ride. No frame in the set has
//     them: 0536 walks the whole run at deck level and shows bare boards, and
//     0666, 0565, 0588 and 0608 all show that deck carrying railings and
//     people and nothing else. Edge-on they merged into one 20 m red-and-
//     yellow ribbon at head height in front of the rotunda - i.e. they
//     inherited the exact fault the helter skelter was removed for. See the
//     ⚠️ where they used to be.
// ---------------------------------------------------------------------------
//
// RockReef (ex-Pier Theatre, Elisabeth Whitworth Scott, 1960) was designed to
// look like an ocean liner heading out to sea: a central barrel vault with a
// fly tower rising above it. That barrel is the money shape - it is the one
// thing that makes the silhouette read as Bournemouth and not as any pier.

import { MAT } from './coast.js';

// Detail modules. Each was measured from its own set of reference frames and
// built independently, which is why they are separate files rather than more
// of this one - and why tools/module-check.mjs exists: built in isolation, no
// author could see another putting different geometry in the same place. It
// caught 27 m3 of exactly that on the neck edge. Run it after touching any of
// them.
import { addRailingsParapet } from './pier-railings-parapet.js';
import { addDeckFurniture } from './pier-deck-furniture.js';
import { addHeadElevations } from './pier-head-elevations.js';
import { addArcadeUnderside } from './pier-arcade-underside.js';
import { addPeopleAndScale } from './pier-people-scale.js';
// The promenade landmarks - above all the ferris wheel - sit LANDWARD of the
// pier root (stations -19..0), so they are not pier geometry at all. They are
// here because they are the thing that most says "Bournemouth" from the water,
// and frame 0657 shows the wheel dominating the entrance.
import { addPierLandmarks } from './pier-landmarks.js';
// >>> RAID
// Index ranges inside the coast mesh that the Viking pier siege may hide (set when the pier is built).
//
// tr145 - THE SINGLETON. This object is READ by hide-ranges.js and raid-mode.js, and it used to
// be WRITTEN unconditionally by buildBournemouthPier() - i.e. by whichever call to buildCoast()
// ran last. There are two such calls per session (renderer.js builds the drawn mesh; boats/hub.js
// rasterises a second mesh into the obstacle grid the first time a jetski or speedboat is
// selected), and the second one silently replaced .mask with an Int8Array measured against a
// DIFFERENT mesh while a raid was running on the first. tmp-tr138/ARCH.md section 2 found this
// and called it must-fix-before-a-second-arena-ships.
//
// The fix is one parameter, not a lock: buildBournemouthPier() writes into a TARGET object which
// DEFAULTS to this one, and the obstacle-grid build passes a throwaway. So exactly one caller -
// the one that owns the mesh that is actually drawn - ever publishes here, and a future arena
// cannot make the two disagree. tmp-tr145/test-gate.mjs fails if the bare write comes back.
export const RAID_RANGES = {};

// tr64: THE SIEGE'S SECTION STATIONS. These MUST equal src/raid/siege.js's SECTIONS s0/s1,
// and tmp-tr64/test-raid.mjs asserts it. They cannot be imported from there: siege.js imports
// pier.js (HEAD, TIP), so the dependency only runs one way. Built lazily inside the classifier
// so HEAD and TIP (declared further down this file) are initialised by the time it is called.
const raidSectionS = () => [[36, 68], [68, 98], [98, 128], [128, HEAD.HALL_S1],
  [HEAD.HALL_S1, HEAD.MASS_S1], [HEAD.MASS_S1, 216], [216, TIP.S_END]];

// tr64: A FALLEN SECTION MUST LEAVE A REAL GAP, not a black cap over a building that still
// stands. The pier is one slice of the single coast mesh drawn with one drawElements, and its
// triangles are ordered by KIND (massing, then each detail module) along the whole pier, so no
// section is contiguous and none can be skipped.
//
// This CLASSIFIES every pier triangle by the siege section(s) it stands on, so the raid can
// group them into contiguous ranges and skip them. It does NOT touch the mesh: it writes one
// byte per pier triangle into RAID_RANGES.mask and nothing else.
//
//   mask -1  the visitors (pier-people-scale.js) - hidden for the whole raid
//   mask  0  kept whatever falls: everything at or below the deck (piles, trestles, arcade,
//            deck slab, lower walkways) and everything off the sections (entrance, landmarks,
//            the tip past TIP.S_END). A fallen section leaves legs, stumps and a bare deck
//            standing in the water rather than a hole in mid-air.
//   mask >0  bitmask of the sections this above-deck triangle stands on.
//
// SPANNING GEOMETRY. Some pieces are built as one long box across several sections (the
// covered walkway runs at s 38-78 and 80-120, for instance). Hiding one because its centroid
// fell would tear a hole through a section still standing, so a triangle is recorded against
// EVERY section it overlaps and is only ever hidden when all of them have gone.
//
// WHY THE REORDER IS NOT DONE HERE. It was built and measured first (tmp-tr64/RESULT.md):
// stably reordering m.i keeps the triangle multiset and the vertex buffer bit-identical, but
// six of the 19 default views moved by 1 to 45 pixels, because reordering flips which of two
// COPLANAR surfaces wins the depth tie. The brief says revert if that happens, so the
// permutation is applied to the GPU index buffer on raid ENTRY and undone on exit
// (src/raid/hide-ranges.js, craft.js // >>> RAID). With the raid off the mesh, the index
// buffer and every render are exactly what they were.
function raidClassifyPier(m, i0, crowd0, crowd1, OX, OZ, R) {
  const SEC = raidSectionS(), NS = SEC.length;
  const idx = m.i, vv = m.v;
  const HIDE_TOP = DECK + 0.15;   // must reach above the deck to count as superstructure
  const HIDE_BOT = DECK - 0.02;   // and must not dip below it: deck slab, beams and piles stay
  const EPS = 0.25;               // a triangle merely touching a section boundary is not in it
  const n0 = (idx.length - i0) / 3;
  const mask = new Int8Array(n0);
  for (let t = 0; t < n0; t++) {
    const b = i0 + t * 3;
    if (b >= crowd0 && b < crowd1) { mask[t] = -1; continue; }   // the visitors: their own range
    let yLo = Infinity, yHi = -Infinity, sLo = Infinity, sHi = -Infinity;
    for (let k = 0; k < 3; k++) {
      const p = idx[b + k] * 3;
      const y = vv[p + 1], dx = vv[p] - OX, dz = vv[p + 2] - OZ;
      const s = dx * DIR[0] + dz * DIR[1];
      if (y < yLo) yLo = y; if (y > yHi) yHi = y;
      if (s < sLo) sLo = s; if (s > sHi) sHi = s;
    }
    if (yHi <= HIDE_TOP || yLo < HIDE_BOT) continue;             // 0: kept whatever falls
    let mk = 0;
    for (let i = 0; i < NS; i++) if (sHi > SEC[i][0] + EPS && sLo < SEC[i][1] - EPS) mk |= 1 << i;
    // A piece that is MOSTLY in one section belongs to it. The head's long side bays are one
    // box from s 128 to 180.8: 82% of it stands on the hall, and holding it up until the tower
    // falls too leaves most of a fallen hall still standing. A piece is only shared when no
    // section owns at least OWN of its length, or when the overhang past that section is more
    // than 6 m - the covered walkway runs, which really do span two sections evenly, and anything
    // whose overhang could swallow a whole neighbour (the tower is only 9.3 m long).
    if (mk && (mk & (mk - 1))) {
      const len = Math.max(0.01, sHi - sLo);
      let best = -1, bf = 0;
      for (let i = 0; i < NS; i++) {
        if (!(mk & (1 << i))) continue;
        const f = (Math.min(sHi, SEC[i][1]) - Math.max(sLo, SEC[i][0])) / len;
        if (f > bf) { bf = f; best = i; }
      }
      if (best >= 0 && bf >= 0.65 && len * (1 - bf) <= 6) mk = 1 << best;
    }
    mask[t] = mk;
  }
  R.pier = [i0, idx.length];
  R.sectionS = SEC;
  R.mask = mask;
}
// <<< RAID

// ---------------------------------------------------------------------------
// KNOWN ERRORS IN THIS MODEL — found by verifying the reference videos against
// it (frame numbers are in bournemouth-reference/bournemouth-pier/).
//
// 1. THE NECK STANDS ON ARCHES, NOT CROSS-BRACED PILES. Six independent frames
//    describe an arched substructure, and frame 566 shows it plainly: a row of
//    arched openings running the length of the neck, like a masonry viaduct.
//    The dense dark cross-bracing I built from the low-tide photo belongs to
//    the HEAD, not the neck. Two different structures, and I applied one to
//    both. Frames: 532, 539, 540, 588, 594, 603, 609, 624, 636, 659.
// 2. THE NECK HAS A SOLID PARAPET with a long horizontal signage band along
//    it — not the open post-and-rail I modelled for its whole length.
// 3. (WITHDRAWN 2026-08-16) "THERE IS A LARGE LED SCREEN ON THE SEAWARD FACE."
//    That came from one grey 640 px still. Frame 0565 (sunny, 720 px, shot
//    square - crop m_head) and 0659 (crop c659) both show the screen set into
//    the LANDWARD end wall, inside the semicircular tympanum under the barrel
//    vault, facing back up the pier at the beach. reference/coast.md §B.1a was
//    right. pier-head-elevations.js builds it there off two independent anchors
//    in frames 579 and 542; the slab this file used to put on the east flank is
//    gone. See the note at that site.
// 4. (WITHDRAWN) The head substructure looked solid in the grey-day frame 566,
//    but the owner's low-tide photograph shows it clearly as OPEN cross-braced
//    piles. At distance and in flat light a dense pile field reads as a solid
//    mass. The closer, clearer photograph wins; the head trestles stay.
// 5. RockReef IS present (frame 590 shows the sign). An earlier drone frame
//    made me conclude it was gone; that shot was of the seaward end only.
// 6. (FIXED 2026-08-16) THE HEAD FURNITURE STATIONS WERE INSIDE THE HEAD
//    BUILDING. Two schemes had been stacked: the drone-footage pass put a
//    helter skelter at s 168 and a rotunda at s 196, and the later LIDAR pass
//    then built the white block over s 140-215 straight on top of both without
//    moving them. Both were moved onto the open deck seaward of the block (the
//    rotunda came back to the block's seaward END, s 208, 2026-09-16 DSM), in the
//    order three frames agree on - block, rotunda, helter skelter, zip tower.
//    SUPERSEDED THE SAME DAY: the helter skelter is not permanent and is gone.
//    The order is block, rotunda, zip tower. See A and B in the header.
// 7. (FIXED 2026-08-16) THE LOWER LANDING STAGES WERE A ROW OF FREE-STANDING
//    BLACK BOXES IN OPEN WATER. Read the ⚠️ at the landing-stage section before
//    touching it: the gap-toothed deck and the single row of 0.9 m square legs
//    are the defect, not a feature, and three modules depend on what replaced
//    them.
//    SUPERSEDED 2026-09-16: the stages are retired. The EA 1 m DSM puts the
//    lower tier directly under the deck edge as WALKWAYS down both flanks, and
//    nothing outboard; see WALK (tmp-tr15/RESULT.md).
// 8. (SEAWARD END FIXED 2026-09-16) THE HEAD WAS TOO LONG. It was a 39 m
//    rectangle to s 262. The EA 1 m DSM ends it at s 252.36 with a chamfered,
//    rounded tip; see TIP below. The landward end (s 128) was not re-measured.
// 9. (HALF FIXED 2026-08-16) THE ZIP TOWER IS PROBABLY ~4 m SHORT AND HAS NO
//    CANOPY. The CANOPY is now built - a domed white mushroom top, which is in
//    eleven frames and is the tower's entire silhouette at distance; without it
//    a bare lattice mast reads as a crane. It is built RELATIVE TO THE PLATFORM
//    so it says nothing about the height. THE HEIGHT IS STILL OPEN: every read
//    of it has had to carry a scale from the head to the tower across the frame,
//    and the frames disagree (0565 says 19.4 m, 0666 says 12.5 m, the 1 m DSM
//    says at least 10.8 m, the build sheet says 18.3 m, the model says 14.5 m).
//    Measurements and reasoning are at the ZIP_TOP definition.
// 10. (RESOLVED 2026-08-16, RE-CONFIRMED 2026-08-19, NOT AN ERROR) THE NECK DOES
//    NOT CARRY PILE TRESTLES IN THIS FILE. The trestle loop starts at s 129, on
//    the head; s 0-128 is the arched neck (UPDATED 2026-09-17: open arches on
//    slim legs built by pier-arcade-underside.js, not a solid spine), which is what ten
//    frames show. Checked again from the other side this time, because the
//    brief was "act on it if the arcade agent reports a duplicate": that module
//    has now SETTLED the same question in its own header off frame 624 at 9x,
//    which carries both structures in one image - the head on its forest of
//    round piles, and running away from it an unbroken arcade of arched
//    openings in a solid wall, with no stretch of neck on piles and no stretch
//    of head on a wall. Its verdict is "pier.js agrees exactly ... Nothing needs
//    moving." Two files, two routes, same answer. There is nothing to remove,
//    and removing either structure would be the error.
// 11. (CLOSED 2026-09-17: the spine and its arches below were removed; the neck
//    is rebuilt as open arches in pier-arcade-underside.js.) THE ARCH HEAD IS A
//    ZIGGURAT AND SITS ~1.3 m TOO LOW. pier-arcade-underside.js measured the
//    openings as STILTED - long near-vertical jambs under a curved head - with a
//    springing near +0.9 m ODN and a crown near +2.6, against this file's -0.70
//    and +1.90, and it reports two independent routes agreeing. It also reports
//    the 7 stepped voussoirs reading as a literal staircase at 20 m. NOT changed
//    here, deliberately, for two reasons: that module copies this file's arcade
//    constants verbatim and is being edited right now, so moving the springing
//    would silently de-register its wall skin; and raising STEPS from 7 to 12 to
//    smooth the head costs 2,160 triangles on a file already at twice budget, to
//    smooth steps that module has already sunk into an 0.85 m shadowed reveal.
//    This wants one coordinated pass over both files, not a unilateral one.
//
// ---------------------------------------------------------------------------
// SWEEP OF THE FOUR JUDGED CAMERAS, 2026-08-19. What was looked for and what
// was found, including the negatives - a sweep that only records its hits is
// indistinguishable from a sweep that was not done.
//
//  FOUND AND FIXED   the parasols (C above) and the flat rotunda (B above).
//  FOUND, NOT MINE, NOT TOUCHED:
//    - THE HEAD BLOCK RENDERS TAUPE, NOT NEAR-WHITE. Its south wall samples
//      #817D7B against a C.pierWhite of #EBE2DE, and 0666/0565 show it bright.
//      This is NOT the MAT.CONCRETE trap and the wall is not mis-materialled:
//      the rotunda dome and the zip canopy are the SAME key on the SAME
//      MAT.PAINTED and sample #CAC9CB and #CDCDCE in the same frame. The
//      difference is orientation only - the scene's sun is higher than the
//      footage's, so vertical faces sit at ~0.55 of horizontal ones while the
//      reference has the flanks lit. That is a light direction, in shaders.js,
//      and repainting a measured palette key to compensate for it is exactly
//      how this file ended up with a brown building once already.
//    - THE 150 mm SLOT UNDER THE HEAD DECK (trestle tops 4.32, slab soffit
//      4.47) is real, and pier-arcade-underside.js has already closed it with
//      longitudinal beams over the two outer pile lines. DECK-1.15 and DECK-1.0
//      are now copied verbatim into that module; moving either from here would
//      silently de-register its whole underside. Left exactly where they are.
//  LOOKED FOR AND NOT FOUND: no coincident box pair anywhere in this file
//      (tmp-pierjs2/selfcheck.mjs: 517 boxes, 0 pairs agreeing on all six faces
//      within 60 mm), so no z-fighting of its own making; no box below the
//      seabed or above the fly tower; nothing standing clear of what carries it
//      except that 150 mm, which is spoken for.
// ---------------------------------------------------------------------------

// EXPORTED (tmp-tr71) so the surf field can put its two banks either side of THIS
// axis rather than re-deriving it. Value unchanged.
export const DIR = [0.1063, 0.9943];        // pier axis, 6.1 deg east of shore-normal
// Deck top, metres above mean sea level. MEASURED, not estimated: Environment
// Agency LIDAR Composite first-return DSM at 1 m, median of 1,221 cells on the
// deck itself (p10 5.09, p90 5.75). See tools/pier-profile.py.
// Was 6.75 from the build sheet, which was 1.28 m high.
// ODN is close enough to mean sea level for this. Bournemouth CHART DATUM is
// 1.40 m below ODN - do not mix them, it is exactly the sort of 1.4 m error
// that reads as a modelling mistake.
const DECK = 5.47;
const NECK_HALF = 5.5;               // 11 m wide neck
const HEAD_W = [-14.5, 24.5];        // head spans this across the axis
const TIP_HALF = 5.45;

// THE HEAD BUILDING'S MASSING, re-measured 2026-09-16 on the EA 1 m DSM - the
// evidence is in the head section of buildBournemouthPier and in
// tmp-tr8/s1/RESULT.md. Exported so tools/*.mjs pass the SAME numbers to
// pier-head-elevations.js instead of freezing a copy. y values are ODN.
export const HEAD = Object.freeze({
  EAVES_T: DECK + 6.50,     // wall top incl. coping; photos 6.3-6.9
  ROOF_R: 23.75,            // hall barrel radius, DSM section fit, crown HEAD_TOP
  HALL_S1: 171.5,           // barrel ends at the tower's landward face
  MASS_S1: 180.8,           // eaves-height side bays end (DSM s 180/181)
  // THE RANGE IS A THREE-PART SECTION, not one flat box (2026-09-16, EA 1 m DSM,
  // tmp-tr14/dsm_range.py + dsm_fit.py, median s 182-198, same every 4 m s 181-198).
  // A raised CENTRE, a segmental barrel (circle fit o 2-9: crown 4.805, R 21.0,
  // rms 6 mm; a pitch fits 24-31 mm), edges at DSM o 1.06/9.67 (3.93 crossing),
  // flanked by two lean-to AISLES falling ~0.06/m outward, 3.42 -> 3.17. The DSM
  // section's mid is o 5.4-5.5 and the hall's is 5.67: the frame reads ~0.5 m
  // west, so the fit is centred on the block's own axis, o 6.0.
  RANGE_C0: 1.7, RANGE_C1: 10.3,        // centre block wall faces (8.6 m wide)
  RANGE_CROWN_T: DECK + 4.80,           // barrel crown on o 6.0; 785 s video 4.3-4.9
  RANGE_R: 21.0,                        // barrel radius
  RANGE_EAVES_T: DECK + 4.80 - (4.3 * 4.3) / (2 * 21.0),   // 4.36, arc at the centre walls
  AISLE_T0: DECK + 3.17,                // aisle eaves at the flank walls (DSM 3.14-3.19)
  AISLE_T1: DECK + 3.42,                // aisle roof where it meets the centre block
  RANGE_FASCIA: 0.25,                   // aisle fascia depth, top at AISLE_T0, 0.30 oversail
  RANGE_S1: 198.0,          // range seaward end wall: DSM range 4 m cells stop s 198-199; its cladding (to +0.6) clears the widened rotunda's axis column at 198.86 (2026-09-16)
  ROT_S: 208.0, ROT_O: 5.1, // rotunda centre: DSM dome, tmp-tr8/s2/RESULT.md (2026-09-16)
  TB_S0: 171.5, TB_S1: 178.8, TB_O: 6.0, TB_T: DECK + 10.55,   // tower block
  FB_S0: 173.2, FB_S1: 178.8, FB_O: 3.4, FB_T: DECK + 11.75,   // fly box
  CAP_T: DECK + 12.05,      // fly box cap top = lantern floor; DSM 11.89
  // glazed cabin: DSM peak cells (12-15 m) cover only ~3-4 m across over s 175-179;
  // beach0115 full-res shows it ~0.6x the gallery's width and ~1.6x its height (2026-09-16)
  LN_S0: 174.6, LN_S1: 178.8, LN_O: 2.1, LN_T: DECK + 14.35,  // lantern (glazing top)
  ROOF_T: DECK + 14.53,     // cabin roof slab top; the roof box above it tops at the LIDAR crown
});

// THE HEAD'S SEAWARD END IN PLAN, fitted 2026-09-16 to the EA 1 m LIDAR DSM
// (tmp-tr13/fit_tip.py: footprint >= 3 m ODN, 13 of 964 pixels disagree;
// tmp-tr13/RESULT.md). The head was a 39 m rectangle to s 262; the DSM has it
// full width (deck + lower walkway strips) to s 240.6, then a 45-degree
// chamfer each side about o 4.6 into a R 10 m rounded nose ending at s 252.36.
// ONE SOURCE: pier.js and every module read these functions via ctx.TIP; do
// not copy the numbers. d is an INSET in metres (> 0 moves inboard).
export const TIP = (() => {
  const C = 4.6, A = 15.0, AS = 241.5, K = 1.0, R = 10.0, WALK_S = 240.6;
  const Q = Math.hypot(1, K);
  const SC = AS + A / K - R * Q / K;          // nose centre station
  const S_END = SC + R;                       // 252.36
  const hw = (s, d) => {                      // taper half-width at s, inset d
    const r = R - d;
    if (s <= SC + r * K / Q) return A - K * (s - AS) - d * Q;
    const t = r * r - (s - SC) * (s - SC);
    return t > 0 ? Math.sqrt(t) : 0;
  };
  // [oWest, oEast] of the deck at station s, inset d; null seaward of the tip
  const edges = (s, d = 0) => {
    if (s < WALK_S - d) return [HEAD_W[0] + d, HEAD_W[1] - d];
    if (s >= S_END - d) return null;
    const h = hw(s, d);
    return [Math.max(HEAD_W[0] + d, C - h), Math.min(HEAD_W[1] - d, C + h)];
  };
  // largest station at which offset o is still inside the outline at inset d
  const sMax = (o, d = 0) => {
    const h = Math.abs(o - C), r = R - d;
    if (h > hw(WALK_S - d, d)) return WALK_S - d;
    if (h <= r / Q) return SC + Math.sqrt(Math.max(0, r * r - h * h));
    return AS + (A - d * Q - h) / K;
  };
  // the tip outline at inset d, (s, o) points from the west walkway-end corner
  // round the nose to the east one; seg chords per quarter of the nose arc
  const outline = (d = 0, seg = 6) => {
    const r = R - d, s0 = WALK_S - d, a0 = Math.atan2(1, K);
    const w = [[s0, C - hw(s0, d)]];
    for (let i = 0; i <= seg; i++) {
      const a = a0 * (1 - i / seg);
      w.push([SC + r * Math.cos(a), C - r * Math.sin(a)]);
    }
    return w.concat(w.slice(0, -1).reverse().map(([s, o]) => [s, 2 * C - o]));
  };
  // trestle legs at station s that stand >= 0.5 m inside the deck edge across
  // the 0.72 m rib; pier.js and pier-arcade-underside.js share this rule
  const legs = (s, offs) => {
    const e = edges(s + 0.36, 0.5);
    return e ? offs.filter((o) => o >= e[0] && o <= e[1]) : [];
  };
  // TIP SUPPORT legs (2026-09-16; moved here from pier.js's bentOffs by tmp-tr25p
  // so pier-arcade-underside.js sleeves the same legs pier.js builds): past the
  // walkway end a leg also stands at each chamfer edge, 0.6 m inside, and a
  // half-bay nose bent (NOSE_S, 1.9 m short of S_END) carries edge-centre-edge.
  const bent = (s, offs) => {
    const l = legs(s, offs);
    if (s < WALK_S || s + 0.36 >= S_END - 0.6) return l;
    const e = edges(s + 0.36, 0.6);
    return [e[0], ...l.filter((o) => o > e[0] + 1.2 && o < e[1] - 1.2), e[1]];
  };
  const NOSE_S = 247.8 + 5.4 / 2;
  const nose = () => { const e = edges(NOSE_S + 0.36, 0.6); return [e[0], C, e[1]]; };
  return Object.freeze({ C, A, AS, K, R, WALK_S, SC, S_END, edges, sMax, outline, legs, bent, NOSE_S, nose });
})();

// THE MAIN DECK EDGE, THE LOWER WALKWAYS AND THEIR STAIRS, 2026-09-16.
// EA 1 m DSM (tmp-tr15/ev/dsm_section.py, median sections, 50% crossings): the
// head is a main deck with a LOWER WALKWAY down each flank the whole length of
// the head, stepping at s 191.5. s 128-191.5: walkways at ODN 2.10 (deck 5.55,
// so DECK-3.45), deck edge o -8.5/+20.3, outer edge -14.0/+25.6. s 191.5-240.6:
// walkways at 3.10 (DECK-2.45), deck edge -9.6/+19.4, outer -14.9/+24.6. Nothing
// outboard (the old landing stages at o -21.5/+31.5 had no DSM support). The
// tip (TIP) is deck level; the zone-2 deck edges run into its chamfers.
// Stairs: beach0115 t27983 at tmp-tr11/pose_final.json (tmp-tr15/ev/px.py) plus
// the DSM ramps: A west, landing 128.0-129.2, flight down seaward to 134.0;
// B both flanks, landing at deck level 197.0-199.2, flights down landward to
// the zone-1 walkway (s 190.2) and seaward to the zone-2 walkway (s 205.4).
// ONE SOURCE: pier.js and every module read WALK via ctx.WALK.
export const WALK = (() => {
  const STEP_S = 191.5, T = 0.40;                 // T: walkway slab depth
  const Z = [
    { s0: 128, s1: STEP_S, y: DECK - 3.45, deck: [-8.5, 20.3], out: [-14.0, 25.6] },
    { s0: STEP_S, s1: TIP.WALK_S, y: DECK - 2.45, deck: [-9.6, 19.4], out: [-14.9, 24.6] },
  ];
  const Q = Math.hypot(1, TIP.K);
  const zone = (s) => (s < STEP_S ? Z[0] : Z[1]);
  // stations where the zone-2 deck edges (inset d) meet the TIP chamfers
  const sChamW = (d) => TIP.AS + (TIP.A - d * Q - (TIP.C - Z[1].deck[0] - d)) / TIP.K;
  const sChamE = (d) => TIP.AS + (TIP.A - d * Q - (Z[1].deck[1] - d - TIP.C)) / TIP.K;
  // [oWest, oEast] of the MAIN deck at s, inset d; null past the nose
  const edges = (s, d = 0) => {
    const z = zone(s);
    let w = z.deck[0] + d, e = z.deck[1] - d;
    if (s >= TIP.WALK_S - d) {
      const t = TIP.edges(s, d);
      if (!t) return null;
      w = Math.max(w, t[0]); e = Math.min(e, t[1]);
    }
    return w < e ? [w, e] : null;
  };
  // the main deck's tip at inset d: west chamfer corner, TIP's nose, east corner
  const outline = (d = 0, seg = 6) => [[sChamW(d), Z[1].deck[0] + d],
    ...TIP.outline(d, seg).slice(1, -1), [sChamE(d), Z[1].deck[1] - d]];
  // the whole main deck polygon at inset d (s, o), landward west corner first
  const poly = (d = 0, seg = 6) => [[128, Z[0].deck[0] + d], [STEP_S, Z[0].deck[0] + d],
    [STEP_S, Z[1].deck[0] + d], ...outline(d, seg), [STEP_S, Z[1].deck[1] - d],
    [STEP_S, Z[0].deck[1] - d], [128, Z[0].deck[1] - d]];
  // stairs: side -1 west / +1 east; band = o range of flight and landing
  const STAIRS = [
    { side: -1, band: [-10.1, -8.5], land: [128.0, 129.2], flights: [[129.2, 134.0, Z[0].y]] },
    { side: -1, band: [-11.1, -9.6], land: [197.0, 199.2], flights: [[197.0, 190.2, Z[0].y], [199.2, 205.4, Z[1].y]] },
    { side: +1, band: [20.4, 21.9], land: [197.0, 199.2], flights: [[197.0, 190.2, Z[0].y], [199.2, 205.4, Z[1].y]] },
  ];
  // walkway slabs [s0, s1, o0, o1, yTop]. The B flights start below the zone-2
  // level, so zone 2 leaves their band open to s 193.5 and zone 1 floors it.
  const SLABS = [];
  for (const sd of [0, 1]) {
    const inn = (z) => z.deck[sd], out = (z) => z.out[sd];
    const lo = (a, b) => [Math.min(a, b), Math.max(a, b)];
    const B = STAIRS[sd === 0 ? 1 : 2].band;
    const bo = sd === 0 ? B[0] : B[1];            // outer face of the B band
    SLABS.push([128, STEP_S, ...lo(inn(Z[0]), out(Z[0])), Z[0].y]);
    SLABS.push([STEP_S, 193.5, ...lo(inn(Z[1]), bo), Z[0].y]);
    SLABS.push([STEP_S, 193.5, ...lo(bo, out(Z[1])), Z[1].y]);
    SLABS.push([193.5, TIP.WALK_S, ...lo(inn(Z[1]), out(Z[1])), Z[1].y]);
  }
  return Object.freeze({ STEP_S, T, Z, zone, edges, outline, poly, sChamW, sChamE, STAIRS, SLABS });
})();

// `ranges` is where the raid's index ranges are PUBLISHED. It defaults to the module's
// RAID_RANGES so every existing caller is unchanged; a caller that is building a throwaway mesh
// (boats/hub.js's obstacle grid) passes its own object and cannot disturb a running raid.
export function buildBournemouthPier(m, C, OX, OZ, ranges = RAID_RANGES) {
  // >>> RAID
  // tr64: where the pier's own slice of the coast index buffer starts (raidClassifyPier).
  const raidI0 = m.i.length;
  // <<< RAID
  // ---- WHY MAT.PAINTED IS PASSED EXPLICITLY BELOW --------------------------
  // pbox defaults to MAT.CONCRETE, and the coast fragment shader is
  // TEXTURE-DOMINANT for every textured material:
  //     textured = t.rgb * (0.78 + vColor * 0.55)
  // The texture is the base and the vertex colour only modulates it. That is
  // right for cliff and sand, where the texture IS the material. It is wrong
  // for painted render: the head building was set to a measured near-white
  // #EBE2DE and rendered BROWN, because a grey-brown concrete texture was
  // multiplying over it and winning.
  // MAT.PAINTED takes the vertex colour straight through, which is what a
  // painted surface actually wants. Concrete stays on the arches, piles, deck
  // slab and edge beams, where it belongs.

  // Station s along the pier, offset `off` across it, -> world X/Z.
  const at = (s, off) => [s * DIR[0] + off * DIR[1] + OX, s * DIR[1] - off * DIR[0] + OZ];

  // An ORIENTED box in pier space. Axis-aligned boxes are wrong for anything
  // long on a pier that runs 6 degrees off the world axis - beams and railings
  // built that way visibly skew away from the deck they belong to.
  // >>> PBOX24 (tmp-tr136)
  // The side walls used to be drawn from the top and bottom rings' EIGHT
  // vertices, so a vertical face interpolated from (0,+1,0) at its top edge to
  // (0,-1,0) at its bottom edge and never pointed out of the wall. That is the
  // defect craft.js's facet-normal repair exists to paper over, and it is the
  // reason every vertical face of every pbox on this pier had ndl = 0 - black
  // to the sun whatever the shadow map said - and carried the ground-bounce
  // term at full strength. craft.js calls fixing it here "the structurally
  // correct fix"; ColourMesh.box in coast.js already does it this way, so this
  // brings pbox into line with the codebase rather than inventing anything.
  //
  // Each side wall now owns four vertices carrying that wall's own outward
  // normal, computed from the edge and disambiguated against the box's own
  // centroid so it does not depend on which way `at` happens to wind.
  //
  // COSTS 16 VERTICES PER BOX AND NOT ONE TRIANGLE. The triangle count, the
  // index count and every index-addressed structure - RAID_RANGES.pier,
  // .crowdRaw, .mask, and tmp-tr136's decal/cull ranges - are untouched. The
  // winding and the diagonal are the ones the old code used: quad(a,b,c,d)
  // splits a-c, and the corner order here is the old bot[i], bot[j], top[j],
  // top[i].
  const pbox = (s0, s1, o0, o1, y0, y1, col, mat = MAT.CONCRETE) => {
    const c = [at(s0, o0), at(s1, o0), at(s1, o1), at(s0, o1)];
    const face = (yy, ny) => c.map((p) => m.pushC(p[0], yy, p[1], 0, ny, 0, col, mat));
    const top = face(y1, 1), bot = face(y0, -1);
    m.quad(top[0], top[1], top[2], top[3]);
    m.quad(bot[3], bot[2], bot[1], bot[0]);
    const gx = (c[0][0] + c[1][0] + c[2][0] + c[3][0]) * 0.25;
    const gz = (c[0][1] + c[1][1] + c[2][1] + c[3][1]) * 0.25;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const ex = c[j][0] - c[i][0], ez = c[j][1] - c[i][1];
      let nx = ez, nz = -ex;
      const L = Math.hypot(nx, nz);
      // A zero-length edge is a degenerate box (several callers pass s0 === s1
      // deliberately, as a flat panel). Fall back to the old up-normal rather
      // than emitting a NaN, which mesh-check would reject and which would be
      // far harder to trace than a dull face.
      if (L < 1e-9) { nx = 0; nz = 0; } else { nx /= L; nz /= L; }
      const mx = (c[i][0] + c[j][0]) * 0.5 - gx, mz = (c[i][1] + c[j][1]) * 0.5 - gz;
      if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
      const ny = (nx === 0 && nz === 0) ? 1 : 0;
      m.quad(
        m.pushC(c[i][0], y0, c[i][1], nx, ny, nz, col, mat),
        m.pushC(c[j][0], y0, c[j][1], nx, ny, nz, col, mat),
        m.pushC(c[j][0], y1, c[j][1], nx, ny, nz, col, mat),
        m.pushC(c[i][0], y1, c[i][1], nx, ny, nz, col, mat));
    }
  };
  // <<< PBOX24

  // ---- substructure -------------------------------------------------------
  // Paired columns on a crosshead, then longitudinal edge beams. This is the
  // 1979-81 concrete bridge idiom, and it is what the eye reads as "pier"
  // rather than "slab on sticks". The exact pile spacing could not be sourced
  // (§E.4: the structural tender is 403-blocked), so this is a regular bay
  // rhythm chosen to look right, NOT an invented published figure.
  // DENSE, DARK, CROSS-BRACED. The owner's low-tide photograph settles this:
  // the understructure is a close rhythm of slim dark piles with diagonal
  // bracing between every bay, and at 150 m it is the single most recognisable
  // thing about the pier. A sparse row of pale concrete columns - which is what
  // this was - reads as a motorway flyover.
  const BAY = 5.4;
  // ROUND piles and DIAGONAL bracing. Bournemouth's 1979-81 substructure is
  // round reinforced-concrete columns, and drawing them as square posts made
  // the understructure read as a model-railway trestle - which matters more
  // here than anywhere else, because from the water the underside is the most
  // visible part of the whole pier.
  //
  // The bracing was two HORIZONTALS per bay. Horizontals carry no shear; what
  // the low-tide photograph actually shows is a diagonal in every bay, and that
  // zig-zag is the single most recognisable thing about the head from 150 m.
  const wp = (s, off, y) => { const q = at(s, off); return [q[0], y, q[1]]; };
  // ⚠️ 10 SEGMENTS, NOT 7, AND IT IS THE ONE PLACE ON THIS PIER WHERE THAT IS
  // WORTH 1,050 TRIANGLES. The "along-neck" judged camera sits at pier station
  // 144, 29.8 m off the east flank and 2.2 m above the water, which puts the
  // nearest head-trestle leg about 6.9 m away. A 0.48 m column at 6.9 m is
  // 0.070 rad = 38 px at that camera's fov 52 over 500 px, and ctube carries
  // radial normals, so 7 segments gives ~3.5 shading bands across a 38 px
  // column - i.e. a flat-faced post with a hard vertical edge down it. That is
  // precisely the "model-railway trestle" read the note above says the round
  // piles exist to avoid, arriving by the back door at close range. Rendered
  // both ways and looked at: at 10 the same column shades as a cylinder.
  // 25 stations x 7 legs = 175 legs, +3 segments each = +1,050 triangles, on a
  // file already well over budget. It buys nothing at 150 m and everything at
  // 7 m, and one of the five judged cameras is at 7 m.
  const trestle = (s, offs, yTop) => {
    for (const off of offs) {
      const a = wp(s, off, -3.4), b = wp(s, off, yTop);
      m.ctube(a[0], a[1], a[2], b[0], b[1], b[2], 0.24, C.pierPile, MAT.CONCRETE, 10);
    }
    for (let i = 0; i < offs.length - 1; i++) {
      const a = offs[i], b = offs[i + 1];
      // one diagonal per bay, alternating so the run reads as a zig-zag
      const up = (i & 1) === 0;
      const lo = wp(s, up ? a : b, -3.4 + (yTop + 3.4) * 0.30);
      const hi = wp(s, up ? b : a, -3.4 + (yTop + 3.4) * 0.86);
      m.ctube(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2], 0.10, C.pierBrace, MAT.CONCRETE, 5);
      // and a single horizontal tie low down, where the photograph shows one
      const t0 = wp(s, a, -3.4 + (yTop + 3.4) * 0.30), t1 = wp(s, b, -3.4 + (yTop + 3.4) * 0.30);
      m.ctube(t0[0], t0[1], t0[2], t1[0], t1[1], t1[2], 0.09, C.pierBrace, MAT.CONCRETE, 5);
    }
    pbox(s - 0.3, s + 0.3, offs[0], offs[offs.length - 1], yTop - 0.45, yTop, C.pierBrace, MAT.CONCRETE);
  };

  // THE NECK'S SUBSTRUCTURE IS BUILT BY pier-arcade-underside.js (2026-09-17).
  //
  // This used to be a solid concrete spine pierced by 7 m arches. The photos
  // (tmp-tr37/ARCHES.md; "Bournemouth Pier from beach.mp4" @7.6 s) show no
  // wall: two arched face beams on slim square legs, open underneath, wide
  // flat spans alternating with groups of small arches. The spine was hidden
  // behind that module's skin and would show through the openings, so it is
  // gone; the deck slab below is kept.
  const SPINE_TOP = DECK - 1.15;

  // ---- THE LANDWARD END, 2026-09-18 (tmp-tr99) ---------------------------
  // The neck used to begin at s = 0. That is EXACTLY coast.js's beach lip
  // (z = 0 at o = 0), so the pier started on open sand with the promenade
  // 1.97 m below it: STATUS.md's "LANDWARD END NOT BUILT - the landward end
  // sits 16-20 m seaward of reality".
  //
  // EVIDENCE for the new start (EA 1 m DSM ref-cache/pier_dsm.tif in model
  // stations, probes tmp-tr99/dsm_prof.py and dsm_wall.py):
  //   * The deck surface is continuous at 4.8-5.0 ODN from s -21 (the seaward
  //     face of the entrance block, which rises to 9-17 ODN landward of it)
  //     right through s 0 and on down the neck.
  //   * The ground UNDER it stops at the sea wall, which crosses the pier's
  //     own line at s -10..-13 and falls back to s -20/-26 on the west flank
  //     and s -17/-25 on the east.
  //   * tmp-tr37's independent read of the same tile: "promenade level (4.8)
  //     at s -24..-16, and neck deck from s -16".
  // NECK_S0 is therefore -16.0: the landward end of the DECK, not of the
  // structure over sand - coast.js's apron is the abutment under s -16..0,
  // exactly as the owner's frame "Bournemouth Pier from beach.mp4" t7.6 shows
  // the landward end as a SOLID face with half-buried arches rather than legs
  // (tmp-tr99/ev/pfb_land2x.jpg; sunlit, so form only - trap 5).
  //
  // The deck stays at the protected constant DECK 5.470 over the new bay. The
  // real deck rises 4.9 -> 5.6 seaward and this model does not; that is the
  // same open item STATUS.md already carries, not something this bay adds.
  const NECK_S0 = -16.0;

  // deck slab and its edge beam
  pbox(NECK_S0, 128, -NECK_HALF, NECK_HALF, SPINE_TOP, DECK, C.pierDeck, MAT.CONCRETE);

  // THE PARAPET OVER THE NEW BAY, and why it is here rather than in
  // pier-railings-parapet.js. That file's neck run starts at s = 0 and is
  // another builder's; leaving the bay bare would put 16 m of unguarded deck
  // edge at the busiest part of the pier. Same section, same rhythm, same
  // colours as its NECK run (o +-5.45, rails at DECK+0.18 and DECK+1.10,
  // posts at 2.4 m, panel at pierRail x 0.85), so the two read as one run.
  // It should migrate into that file when its owner next touches it.
  {
    const RO = NECK_HALF - 0.05, Y_BOT = 0.18, Y_TOP = 1.10;
    const RR = 0.02, TR = 0.025, PR = 0.033;
    const PANEL = C.pierRail.map((v) => v * 0.85);
    const post = (s, c) => pbox(s - PR, s + PR, c - PR, c + PR,
      DECK - 0.04, DECK + Y_TOP, C.pierRail, MAT.PAINTED);
    for (const sgn of [-1, 1]) {
      const c = sgn * RO;
      pbox(NECK_S0, 0, c - RR, c + RR, DECK + Y_BOT - RR, DECK + Y_BOT + RR, C.pierRail, MAT.PAINTED);
      pbox(NECK_S0, 0, c - TR, c + TR, DECK + Y_TOP - TR, DECK + Y_TOP + TR, C.pierRail, MAT.PAINTED);
      pbox(NECK_S0, 0, c - 0.006, c + 0.006, DECK + Y_BOT, DECK + Y_TOP, PANEL, MAT.PAINTED);
      for (let k = 1; k <= 6; k++) post(-2.4 * k, c);
      post(NECK_S0 + PR, c);
    }

    // THE ENTRANCE AND ITS SURROUND. The deck has to END somewhere and the
    // parapet has to return across that end; this is that return, with a 3.0 m
    // gateway on the centre line and a taller jamb post each side of it.
    // NO GATE LEAVES, NO PYLONS: pier-deck-furniture.js already builds a
    // 1.9 m gate at s 11.6 and pier-landmarks.js an entrance pavilion at
    // s -9.4..-4.2, and neither owner's object is mine to duplicate. Nothing
    // in the DSM or in any owner frame shows the entrance furniture, so the
    // only things built here are the ones the geometry forces.
    const GAP = 1.5;
    for (const sgn of [-1, 1]) {
      const a = sgn * GAP, b = sgn * RO;
      const o0 = Math.min(a, b), o1 = Math.max(a, b);
      pbox(NECK_S0 - RR, NECK_S0 + RR, o0, o1, DECK + Y_BOT - RR, DECK + Y_BOT + RR, C.pierRail, MAT.PAINTED);
      pbox(NECK_S0 - TR, NECK_S0 + TR, o0, o1, DECK + Y_TOP - TR, DECK + Y_TOP + TR, C.pierRail, MAT.PAINTED);
      pbox(NECK_S0 - 0.006, NECK_S0 + 0.006, o0, o1, DECK + Y_BOT, DECK + Y_TOP, PANEL, MAT.PAINTED);
      // the jamb: 0.11 square and 2.05 m tall, so it reads as a gate post and
      // not as one more baluster
      pbox(NECK_S0 - 0.055, NECK_S0 + 0.055, a - 0.055, a + 0.055,
        DECK - 0.04, DECK + 2.05, C.pierRail, MAT.PAINTED);
      pbox(NECK_S0 - 0.09, NECK_S0 + 0.09, a - 0.09, a + 0.09,
        DECK + 2.05, DECK + 2.17, C.pierRail, MAT.PAINTED);
    }
  }
  // The long advertising banner along the deck edge - present in every
  // beach-level frame, and a strong horizontal that reads at 200 m.
  // WITHDRAWN 2026-08-03. This painted a bright blue band down BOTH flanks of
  // the fascia, and it was wrong three ways. The band is on the parapet face
  // ABOVE the deck, not on the fascia below it; it reads dark green to near
  // black with white lettering, not blue; and it appears on one flank only, if
  // it is permanent at all - frame 542 profiled over the same stations shows
  // that face uniformly bright with no band.
  //
  // The blue was a MIS-ATTRIBUTION: the blue genuinely visible in frames 557
  // and 558 is the GLAZED SHELTER's infill at s 4-46, a different object the
  // model already builds in C.pierGlass. A colour was carried from one object
  // to another, and then run down 90 m of pier on both sides.
  // pier-railings-parapet.js now draws the band, correctly, on one flank.

  // ---- THE GLAZED SHELTER AT s 4-46 — DELETED 2026-08-16 ------------------
  // 672 triangles, and every one of them was inside another module's building.
  //
  // It was a full-width shed: columns on BOTH deck edges at o = +-5.0, glazed
  // infill between them, and a green pitched roof spanning the whole 11 m of
  // neck at DECK+2.9..3.6 for 42 m. pier-deck-furniture.js's header (its
  // INTEGRATION section, "pier.js 242-264") asks for exactly this deletion and
  // gives the reason: the shelter is not a separate structure at all. It is the
  // landward end of the SAME covered walkway that module now builds, measured,
  // over CW_S0 16.5 -> CW_S1 127.7. Until this went, 30 m of that walkway stood
  // INSIDE this roof - a green roof inside a bigger green roof - and from the
  // air the neck read as decked over for its whole width.
  //
  // The covered walkway is the strongest single identity cue the pier has:
  // frame 0599 (drone, straight down the axis) and aerial 0657 both show one
  // green ridge running most of the neck, NARROW and central, with open railed
  // deck each side of it. A full-width shed is the opposite of that.
  //
  // Nothing measured is lost. f558's blue glazed panels and f636's shelter are
  // real; they are that module's dado and glazing now, at its measured width.

  // NOTE ON THE REST OF THE COVERED WALKWAY. f0599 and f0657 show the green
  // ridge running to the head, and pier-deck-furniture.js already carries it to
  // s 127.7. Nothing further is owed here - do not rebuild any part of it in
  // this file. One canopy, one owner.

  // ---- head substructure: main deck, lower walkways, stairs --------------
  // §B.1a: ~24 m of sound upper deck plus ~7 m of lower landing stage each
  // side, the west one closed for years. 2026-09-16: that lower tier is the
  // WALKWAY the EA 1 m DSM and beach0115 t27983 show down BOTH flanks directly
  // under the deck edge (see WALK), so it is built there. The old outboard
  // stages (s 152-226, o -21.5/+31.5, y 2.5) are RETIRED: the DSM has no cell
  // above -1 m ODN outboard of o -15/+25.5 anywhere on the head, and the photo
  // shows one railed tier under the deck edge, not a second deck beyond it.
  // Legs follow TIP.legs as before. The o -13 and +23 lines stand under the
  // walkways and stop at the walkway soffit with their own crosshead and brace;
  // the rest carry the main deck crosshead at DECK-1.15.
  const TR_OFFS = [-13, -6.5, 0, 6.5, 13, 19.5, 23];
  const WLEG = [-13, 23];
  // TIP SUPPORT (2026-09-16): past the walkway end a leg also stands at each
  // chamfer edge (0.6 m inside, across the rib), so the chamfers no longer
  // overhang the outer legs by 3-5 m. The rule is TIP.bent (shared).
  for (let s = 129; s < TIP.S_END; s += BAY) {
    const offs = TIP.bent(s, TR_OFFS);
    const main = offs.filter((o) => !WLEG.includes(o));
    if (main.length >= 2) trestle(s, main, DECK - 1.15);
    const z = WALK.zone(s + 0.36), ys = z.y - WALK.T;   // walkway soffit
    for (const wo of offs.filter((o) => WLEG.includes(o))) {
      const a = wp(s, wo, -3.4), b = wp(s, wo, ys);
      m.ctube(a[0], a[1], a[2], b[0], b[1], b[2], 0.24, C.pierPile, MAT.CONCRETE, 10);
      const sd = wo < 0 ? 0 : 1, inner = wo < 0 ? main[0] : main[main.length - 1];
      const lo = wp(s, wo, -3.4 + (ys + 3.4) * 0.30), hi = wp(s, inner, ys - 0.35);
      m.ctube(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2], 0.10, C.pierBrace, MAT.CONCRETE, 5);
      const oo = z.out[sd] - Math.sign(wo) * 0.15;
      pbox(s - 0.3, s + 0.3, Math.min(oo, inner), Math.max(oo, inner), ys - 0.35, ys, C.pierBrace, MAT.CONCRETE);
    }
  }
  // TIP SUPPORT: a half-bay bent under the nose, 1.9 m short of s 252.36
  {
    trestle(TIP.NOSE_S, TIP.nose(), DECK - 1.15);
  }
  for (let s = 129; s + BAY < TIP.S_END; s += BAY) {
    const a = TIP.legs(s, TR_OFFS), b = TIP.legs(s + BAY, TR_OFFS);
    for (const off of [-13, 0, 13, 23]) {
      if (!a.includes(off) || !b.includes(off)) continue;
      // the walkway lines' ties drop under the zone-1 walkway soffit (1.62)
      const [t0, t1] = WLEG.includes(off) ? [0.6, 0.95] : [1.4, 1.75];
      pbox(s, s + BAY, off - 0.1, off + 0.1, t0, t1, C.pierBrace, MAT.CONCRETE);
    }
  }
  // The MAIN deck slab (WALK): zone 1 as a box, zone 2 and the tip as ONE convex
  // extruded polygon fanned from its landward west corner. Walls share the
  // top/bottom vertices as pbox's do, so the edge shades as the old slab did.
  pbox(128, WALK.STEP_S, WALK.Z[0].deck[0], WALK.Z[0].deck[1], DECK - 1.0, DECK, C.pierDeck, MAT.CONCRETE);
  {
    const Z1 = WALK.Z[1];
    const poly = [[WALK.STEP_S, Z1.deck[0]], ...WALK.outline(0, 6), [WALK.STEP_S, Z1.deck[1]]];
    const P = poly.map(([s, o]) => at(s, o));
    const top = P.map((p) => m.pushC(p[0], DECK, p[1], 0, 1, 0, C.pierDeck, MAT.CONCRETE));
    const bot = P.map((p) => m.pushC(p[0], DECK - 1.0, p[1], 0, -1, 0, C.pierDeck, MAT.CONCRETE));
    for (let i = 1; i < P.length - 1; i++) {
      m.tri(top[0], top[i], top[i + 1]);
      m.tri(bot[0], bot[i + 1], bot[i]);
    }
    for (let i = 0; i < P.length; i++) {
      const j = (i + 1) % P.length;
      m.quad(bot[i], bot[j], top[j], top[i]);
    }
  }

  // ---- the lower walkways (WALK.SLABS) and their outer railings ----------
  // beach0115 t27983 (full-res x 0-1500, y 1470-1500) shows the west walkway
  // railed along its outer edge: pale posts and two rails, signs hung on it.
  // The east rail is the same idiom by symmetry (aerial 0657 shows people on
  // the east tier). Rail height 1.0 m and post pitch 3.6 m are not measured.
  for (const [s0, s1, o0, o1, y] of WALK.SLABS) {
    pbox(s0, s1, o0, o1, y - WALK.T, y, C.pierDeck, MAT.CONCRETE);
    // the riser where a zone-2 slab starts above the zone-1 level
    if (y > WALK.Z[0].y + 0.5 && s0 < 194) {
      pbox(s0, s0 + 0.3, o0, o1, WALK.Z[0].y - WALK.T, y - WALK.T, C.pierDeck, MAT.CONCRETE);
    }
  }
  {
    const RT = 1.0;
    const wrail = (s0, s1, o, y) => {
      pbox(s0, s1, o - 0.04, o + 0.04, y + RT - 0.06, y + RT, C.pierRail, MAT.PAINTED);
      pbox(s0, s1, o - 0.03, o + 0.03, y + 0.47, y + 0.53, C.pierRail, MAT.PAINTED);
      for (let s = s0 + 0.05; s < s1; s += 3.6) {
        pbox(s - 0.04, s + 0.04, o - 0.04, o + 0.04, y, y + RT - 0.06, C.pierRail, MAT.PAINTED);
      }
    };
    const xrail = (s, oa, ob, y) => {   // a rail across a walkway end
      pbox(s - 0.04, s + 0.04, Math.min(oa, ob), Math.max(oa, ob), y + RT - 0.06, y + RT, C.pierRail, MAT.PAINTED);
      pbox(s - 0.03, s + 0.03, Math.min(oa, ob), Math.max(oa, ob), y + 0.47, y + 0.53, C.pierRail, MAT.PAINTED);
    };
    for (const sd of [0, 1]) {
      const g = sd ? -1 : 1, [Z0, Z1] = WALK.Z;
      wrail(128.05, WALK.STEP_S, Z0.out[sd] + g * 0.1, Z0.y);
      wrail(WALK.STEP_S, TIP.WALK_S - 0.05, Z1.out[sd] + g * 0.1, Z1.y);
      // the step: a short rail across the zone-1 end and one post up to the zone-2 rail
      xrail(WALK.STEP_S - 0.05, Z0.out[sd] + g * 0.1, Z1.out[sd] + g * 0.1, Z0.y);
      xrail(128.05, Z0.deck[sd], Z0.out[sd] + g * 0.1, Z0.y);
      xrail(TIP.WALK_S - 0.05, Z1.deck[sd], Z1.out[sd] + g * 0.1, Z1.y);
    }
  }

  // ---- the stairs (WALK.STAIRS) ------------------------------------------
  // A deck-level landing outboard of the deck edge (the flank balustrade opens
  // over it), flights running ALONG the walkway down from it. Block treads as
  // the old stage flight used; the last tread is the walkway itself. Rise
  // <= 0.29; goings follow the photo/DSM stations, so they differ per flight.
  {
    const hr = (s0, o, y0, s1, y1, r) => {
      const a = wp(s0, o, y0), b = wp(s1, o, y1);
      m.ctube(a[0], a[1], a[2], b[0], b[1], b[2], r, C.pierRail, MAT.PAINTED, 5);
    };
    for (const st of WALK.STAIRS) {
      const [b0, b1] = st.band, sd = st.side < 0 ? 0 : 1;
      const de = WALK.edges(st.land[0] + 0.01)[sd];
      const l0 = st.side < 0 ? b0 : de, l1 = st.side < 0 ? de : b1;
      const lo = st.side < 0 ? b0 + 0.05 : b1 - 0.05;          // outer rail line
      pbox(st.land[0], st.land[1], l0, l1, DECK - 0.4, DECK, C.pierDeck, MAT.CONCRETE);
      hr(st.land[0], lo, DECK + 1.0, st.land[1], DECK + 1.0, 0.035);
      for (const [sT, sF, yF] of st.flights) {
        const N = Math.ceil((DECK - yF) / 0.29), rise = (DECK - yF) / N;
        const dir = Math.sign(sF - sT), going = Math.abs(sF - sT) / N;
        for (let k = 0; k < N - 1; k++) {
          const sa = sT + dir * k * going, sb = sT + dir * (k + 1) * going, y = DECK - (k + 1) * rise;
          pbox(Math.min(sa, sb), Math.max(sa, sb), b0, b1, y - 0.30, y, C.pierDeck, MAT.CONCRETE);
        }
        for (const o of [b0 + 0.05, b1 - 0.05]) {
          hr(sT, o, DECK + 1.0, sF, yF + 1.0, 0.035);
          for (const f of [0.15, 0.55, 0.95]) {
            const s = sT + (sF - sT) * f, yt = DECK - (DECK - yF) * f;
            hr(s, o, yt - rise, s, yt + 1.0, 0.025);
          }
        }
      }
    }
  }

  // ---- tip ----------------------------------------------------------------
  // 2026-09-16: THE TIP IS NOW TIP (above), from the DSM, and the head deck slab
  // follows it. What follows is the history of the older stub tip, kept for its
  // two defects; its "ends SQUARE" and "s = 261.7" statements are superseded.
  // THE STUB TIP AND ITS RAILINGS ARE GONE, and TIP_HALF with them for drawing
  // purposes. Two separate defects, one cause:
  //
  //  1. `pbox(250, 262, -TIP_HALF, TIP_HALF, DECK-1.0, DECK, C.pierDeck)` was
  //     EXACTLY COINCIDENT with the head deck slab above, which already runs
  //     128-262 at the full HEAD_W width. Same colour, same material, same two
  //     planes at y = 4.47 and y = 5.47: a coplanar duplicate, i.e. a
  //     z-fighting pair waiting for a depth-buffer round-off, and 12 triangles
  //     that could never draw anything.
  //  2. railRun then guarded that phantom tip at o = +-5.15, which on a 39 m
  //     wide head deck is two lines of white railing standing in open deck 9 m
  //     inboard of the edge, guarding nothing.
  //
  // The head-and-then-a-narrow-stub silhouette in this file's header is not what
  // the pier does. Aerial 0657 (crop c657tip) and drone 0588 both show the head
  // running out at full width and ending SQUARE, with the barrel-roofed block
  // and the zip tower standing at that square end - no narrower tip beyond it.
  // pier-railings-parapet.js agrees: it puts its end balustrade across the whole
  // -14.1..24.1 width at s = 261.7.
  //
  // ⚠️ OPEN: that module's FLANK railings stop at s = 249.4, so the last 12 m of
  // both deck edges are now unguarded. Deleting these rails did not cause that -
  // they were 9 m inboard and never guarded it - but it is now the only gap in
  // the perimeter. It belongs to pier-railings-parapet.js, whose rail section
  // and post rhythm would have to be matched exactly; building a second railing
  // system here to close 12 m would look worse than the gap.
  // TIP_HALF is still passed through ctx for the modules that read it.

  // The step across the deck where the neck widens was two solid white boxes
  // here. pier-railings-parapet.js's header asks for them to go: no frame shows
  // a solid barrier across the step, and they exist only to bury that module's
  // junction balustrade at s = 128.25. Deleted, with the parapet in that module
  // now run to s = 128.5 in the same change so the junction handrail ends
  // INSIDE the wall instead of floating 0.25 m past it over open deck. Doing
  // one without the other leaves either a barrier that is not there or a rail
  // hanging in mid-air.

  // ---- lamp columns, HEAD ONLY --------------------------------------------
  // WAS s 12 -> 250, i.e. the neck as well, at off = +(NECK_HALF - 0.9).
  // pier-deck-furniture.js builds the measured neck lamps over exactly the same
  // stations (s 12 -> 128 step 22) at LAMP_O = -(NECK_HALF - 0.8), and its
  // header asks for these to go: the reference puts the lamps on the OPEN
  // railed edge with the covered walkway opposite, so ONE line of columns, at
  // -o. Keeping both gave a lamp on each edge every 22 m for the whole neck -
  // six columns nothing in the footage supports, mirrored across the deck from
  // six that are measured.
  //
  // Two of them were also standing inside the deleted glazed shelter: at s 12
  // and s 34 the column ran DECK..DECK+3.85 straight up through that roof at
  // DECK+2.9..3.6. That defect is gone with the shelter, but it is worth
  // recording, because the same thing will happen to any new lamp put on the
  // neck now that the covered walkway runs s 16.5-127.7 with a 3.0 m ridge.
  //
  // The HEAD lamps stay: no module builds them, and the head deck edge carries
  // a lamp line in 0536 and 0590. Starting at 134 keeps the first one clear of
  // the neck/head step at 128.
  // ⚠️ THE LANTERN WAS A 0.6 x 0.6 x 0.25 m SLAB CENTRED ON THE POST, and from
  // the "head" camera - where the nearest of these columns stands about 24 m
  // away and is the tallest object on the near deck - it read as a grey mallet.
  // MEASURED, 2026-08-20, off the owner's own 2048 px frame
  // C:\claude\bournemouth-reference\bournemouth-pier\1066407125490724.jpg,
  // which catches nine of these columns in a row against a flat grey sky - the
  // clearest look at them in the whole reference set. They are a slim vertical
  // post, a SHORT BRACKET leaning outboard at the top, and a small flat
  // teardrop lantern held roughly horizontal at the end of it. On the nearest
  // column the lantern measures 63 px long by 10 px thick against a post that
  // runs 272+ px for about 3.5 m, i.e. ~78 px/m: LANTERN 0.81 m LONG AND
  // 0.13 m THICK, about 6:1. The old slab had it 0.6 x 0.6 x 0.25 - roughly
  // the right length, three times too wide across the deck, twice too thick,
  // and with no bracket at all, which is why it read as a hammer head rather
  // than as a lamp.
  // The bracket direction is INFERRED from the frame (every arm leans the same
  // way, outboard over the deck); the lantern's dimensions are measured. Total
  // height is unchanged at DECK + 3.85 so nothing that clears these clears them
  // by any less than it did.
  for (let s = 134; s < 250; s += 22) {
    // 2026-09-16: 1.6 m inside the MAIN deck edge (WALK), which is 4.2-5.1 m
    // inboard of the old HEAD_W; s 244 would stand past the TIP chamfer, so it goes
    const e = WALK.edges(s + 0.39, 0.1);
    if (!e) continue;
    const off = WALK.edges(s)[1] - 1.6;
    if (!e || off + 0.53 > e[1]) continue;
    pbox(s - 0.075, s + 0.075, off - 0.075, off + 0.075, DECK, DECK + 3.55, C.pierRail, MAT.PAINTED);
    // The bracket: 0.11 m section, 0.42 m out and 0.17 m up. Drawn as ONE
    // straight box, not as the swan neck the frame shows, because at the head
    // camera's 24 m and fov 40 over 500 px the whole bracket is 12 px long and
    // 3 px thick - the OFFSET reads and the curve inside it cannot.
    pbox(s - 0.055, s + 0.055, off, off + 0.42, DECK + 3.55, DECK + 3.72, C.pierRail, MAT.PAINTED);
    // the lantern, 0.78 x 0.22 x 0.13, hung on the end of the bracket
    pbox(s - 0.39, s + 0.39, off + 0.31, off + 0.53, DECK + 3.72, DECK + 3.85, C.pierRail, MAT.PAINTED);
  }

  // ---- THE TICKET KIOSK AT s 6-11 — DELETED 2026-08-16 --------------------
  // A 5 x 2.8 x 3.0 m rectangular box with a copper-green slab on top. Frame
  // 0599, looking straight down the pier axis, shows the entrance kiosk is a
  // glazed OCTAGONAL drum, much smaller, and its roof samples NEUTRAL DARK GREY
  // rather than oxidised copper. pier-deck-furniture.js builds that measured
  // drum at s 6.6, on top of this box, and its header asks for these two lines:
  // the old copper roof slab (|o| < 1.7 at DECK+3.0..3.3) is wider than the new
  // drum at that height, so it poked out through it as a green fin, and the
  // grey box wall ran on seaward past the drum to s 11.
  // Re-measuring the drum smaller made the fin worse. Deleting is the fix.

  // =========================================================================
  // WHAT IS ACTUALLY ON THE HEAD, from the owner's drone footage.
  //
  // The build sheet (§B.1a) described a 47 m barrel-vaulted RockReef block and
  // a Key West restaurant. The drone shot taken from seaward - the exact angle
  // this camera uses - shows neither. It shows a HELTER SKELTER, a white
  // ROTUNDA, the zip mast with a white canopy, parasols, and the whole head
  // standing on dark CROSS-BRACED TRESTLES.
  //
  // Primary photographic evidence of the thing itself beats a web-research
  // inference about it, so the photograph wins. The sourced NUMBERS (260 m,
  // deck +6.75, the 128 m step) still stand - it is the furniture that was
  // wrong.
  // =========================================================================

  // The WHITE head building, s 140-216: a two-storey HALL under a shallow
  // segmental barrel (s 140-171.5), a TOWER rising out of its seaward end
  // (s 171.5-178.8), eaves-height side bays to s 180.8, a single-storey RANGE
  // to s 199.2, and the ROTUNDA closing the head (centre s 208, cornice to
  // s 216.1). Pointed awnings along the east front.
  // ---- MEASURED FROM LIDAR, 2026-08-03 ---------------------------------------
  // Environment Agency 1 m first-return DSM, profiled along the pier axis by
  // tools/pier-profile.py: a plateau at 14.30 m ODN over s 140-170 and a
  // single tower return at 20.51 m ODN near s 175. Against a deck of 5.47 m ODN:
  //
  //     hall roof CROWN   8.83 m above deck  (HEAD_TOP)
  //     tower crown      15.04 m above deck
  //
  // ---- RE-MASSED TO THE SAME DSM IN PLAN, 2026-09-16 ------------------------
  // tmp-tr8/s1 (RESULT.md there has every number). The plateau is the RIDGE,
  // not the eaves: across the hall the DSM falls smoothly from 8.8 at the centre
  // to 7.2 a metre inside each wall, and a circular arc with its crown held at
  // HEAD_TOP fits the median section (s 142-168, 18 columns) at R 23.75 m, RMS
  // 0.026 m. Two independent photos put the WALL TOP near 6.5 m, 2.3 m under
  // the old eaves: the 15 Jan 2025 photomatch (6.2-6.9 after its deck residual)
  // and "Bournemouth Pier from beach" f004, which rules the eaves at 0.61 of the
  // DSM tower-block top (10.54) at the same column, i.e. 6.3-6.7. (Frame 566's
  // 2026-08-02 reading of 6.2 m, overturned the next day by this header, was
  // measuring the eaves; the LIDAR was measuring the crown. Both were right.)
  // Plan stations, DSM medians above deck:
  //     s 140-171   hall barrel, crown 8.8
  //     s 172-178   tower block plateau 10.54 (n 27), ~12 m wide
  //     s 173-177   fly box 11.89 (n 21), ~6 m wide; peak 14.1-15.0 s 175-179
  //     s 172-180   flat side bays either side of the tower, 6.09 (n 32)
  //     s 181-199   range, centre 4.75 / sides 3.25; nothing full-height
  // The photomatch put the tower's seaward face at s 182.2; the DSM's mixed row
  // is s 178, so TB_S1 = 178.8 is the DSM edge nudged toward the photo, not a
  // compromise with it. Stage 2 (2026-09-16, DSM) moved the rotunda to s 208
  // and ended the range at s 199.2: see the rotunda block.
  // ⚠️ The 740 s Beach Walk mapping's "flat block ends 204.3 / 201.1" is the
  // range-to-dome junction (DSM s 200, a clean 3.x row between the 4.75 range
  // and the 5.x dome), not the end of a full-height block: see RESULT.md.
  const HEAD_TOP = DECK + 8.83;
  // The re-massed head's stations and heights live in HEAD at module scope (top
  // of this file) so the tools that stub this file's ctx import them rather
  // than keep a copy that can go stale.
  const { EAVES_T, ROOF_R, HALL_S1, MASS_S1, RANGE_S1, TB_S0, TB_S1, TB_O, TB_T,
    FB_S0, FB_S1, FB_O, FB_T, CAP_T, LN_S0, LN_S1, LN_O } = HEAD;
  {
    const BB = [-3, 15];
    const bc = (BB[0] + BB[1]) / 2;
    // the eaves-height mass: hall walls, the tower's flanks and the side bays
    pbox(140, MASS_S1, BB[0], BB[1], DECK, EAVES_T, C.pierWhite, MAT.PAINTED);
    // THE SINGLE-STOREY RANGE, MASS_S1 - RANGE_S1, rebuilt 2026-09-16 to the DSM
    // section (HEAD header): a barrel-roofed CENTRE between two lean-to AISLES.
    // Was one flat box at DECK+4.70 with a 0.30 m fascia slab on top (5.00), which
    // stood 1.5-1.8 m proud of the DSM over both aisles.
    {
      const { RANGE_C0: C0, RANGE_C1: C1, RANGE_CROWN_T: CR, RANGE_R: RR, RANGE_EAVES_T: CE,
        AISLE_T0: A0, AISLE_T1: A1, RANGE_FASCIA: FD } = HEAD;
      // ONE full-width base box on the deck, up to the fascia's foot (A0 - FD):
      // everything above stands on it 20 mm deep, so the range still meets the
      // deck with the old box's four corners and DECK's built count is unchanged.
      const YB = A0 - FD, YS = YB - 0.02;
      pbox(MASS_S1, RANGE_S1, BB[0], BB[1], DECK, YB, C.pierWhite, MAT.PAINTED);
      // centre walls to the arc at their faces
      pbox(MASS_S1, RANGE_S1, C0, C1, YS, CE, C.pierWhite, MAT.PAINTED);
      // 7 equal chords over the walls plus a 0.30 m overhang each side and at the
      // sea end, top = arc at MID-chord (same rule as the hall barrel; worst
      // staircase error ~0.12 m at the outer chords' edges), base 20 mm under CE.
      const arcR = (o) => CR - (o - bc) * (o - bc) / (2 * RR);   // DSM fit is a parabola-close circle
      const RC = 7, Q0 = C0 - 0.30, Q1 = C1 + 0.30;
      for (let i = 0; i < RC; i++) {
        const o0 = Q0 + (Q1 - Q0) * (i / RC), o1 = Q0 + (Q1 - Q0) * ((i + 1) / RC);
        pbox(MASS_S1, RANGE_S1 + 0.30, o0, o1, CE - 0.02, arcR((o0 + o1) / 2), C.pierWhite, MAT.PAINTED);
      }
      // aisles: two chords each, tops on the lean-to line A1 (at the centre wall)
      // -> A0 (at the flank wall) at mid-chord; each runs 20 mm into the centre wall
      const aisle = (oW, oC) => {                // oW flank wall, oC centre wall
        const sg = Math.sign(oC - oW), w = Math.abs(oC - oW);
        for (let i = 0; i < 2; i++) {
          const a = oW + sg * w * (i / 2), b = oW + sg * w * ((i + 1) / 2) + (i ? sg * 0.02 : 0);
          const yTop = A0 + (A1 - A0) * ((i + 0.5) / 2);
          pbox(MASS_S1, RANGE_S1, Math.min(a, b), Math.max(a, b), YS, yTop, C.pierWhite, MAT.PAINTED);
        }
        // white eaves fascia: top at A0, FD deep, 0.30 oversail on the flank and
        // round the sea end as far as the centre wall
        pbox(MASS_S1, RANGE_S1 + 0.30, Math.min(oW - sg * 0.30, oW + sg * 0.30),
          Math.max(oW - sg * 0.30, oW + sg * 0.30), A0 - FD, A0, C.pierWhite, MAT.PAINTED);
        pbox(RANGE_S1 - 0.30, RANGE_S1 + 0.30, Math.min(oW + sg * 0.30, oC),
          Math.max(oW + sg * 0.30, oC), A0 - FD, A0, C.pierWhite, MAT.PAINTED);
      };
      aisle(BB[0], C0);
      aisle(BB[1], C1);
    }

    // No window bands here: pier-head-elevations.js builds the measured,
    // mullioned elevations on both flank planes. A second skin on the same
    // planes is a grazing-angle z-fight (removed 2026-08, see that file).

    // The scalloped awnings along the east elevation - m_head (frame 0565 at 6x).
    // DECK+3.15, not 3.0: at 3.0 the slab cut 130 mm into the elevations
    // module's RockReef signage band (DECK+2.20-3.13, s 145-163).
    // Last one ends at 196.6: the run stops at the range's end wall (2026-09-16).
    // 2026-09-16: the five whose slab reaches past MASS_S1 hang under the range's
    // aisle fascia (HEAD.AISLE_T0 - RANGE_FASCIA - 0.02 = DECK+2.90) instead: at
    // 3.45 they stood 0.28 m above the DSM eaves. Same form, 0.55 m lower.
    for (let s = 143; s + 2.6 <= RANGE_S1; s += 3.4) {
      const dy = s + 2.6 > MASS_S1 ? (HEAD.AISLE_T0 - HEAD.RANGE_FASCIA - 0.02) - (DECK + 3.45) : 0;
      pbox(s, s + 2.6, BB[1], BB[1] + 1.5, DECK + 3.15 + dy, DECK + 3.45 + dy, C.pierWhite, MAT.PAINTED);
      pbox(s + 0.9, s + 1.7, BB[1] + 1.5, BB[1] + 2.1, DECK + 2.85 + dy, DECK + 3.45 + dy, C.pierWhite, MAT.PAINTED);
    }

    // ---- THE HALL ROOF: one segmental barrel, s 140 - HALL_S1 ---------------
    // 13 solid chords, equal width, over the wall line plus a 0.80 m eaves
    // overhang each side. Each chord's top is the arc at its MID-width, so the
    // staircase straddles the curve (worst error 0.33 m at the outer chords),
    // and an odd count puts one chord's mid on the axis: its top is HEAD_TOP
    // exactly. Base 20 mm under EAVES_T so the chord never shares a face with
    // the elevations module's coping, whose top IS EAVES_T. The overhang edge
    // (o -3.80 / 15.80) stands 0.12 m clear of that coping's 0.68 m face.
    // The old +2.0 m west barrel (140-163), the 1.35 m vault (163-193.4), its
    // 0.5 m eaves kerbs and the flat block to 202.9 are all gone: the DSM has
    // nothing above 8.8 over the hall and nothing full-height past s 180.
    const RN = 13, R0 = BB[0] - 0.80, R1 = BB[1] + 0.80;
    const arcY = (o) => HEAD_TOP - (ROOF_R - Math.sqrt(ROOF_R * ROOF_R - (o - bc) * (o - bc)));
    for (let i = 0; i < RN; i++) {
      const o0 = R0 + (R1 - R0) * (i / RN), o1 = R0 + (R1 - R0) * ((i + 1) / RN);
      pbox(140, HALL_S1 + 0.10, o0, o1, EAVES_T - 0.02, arcY((o0 + o1) / 2),
        C.pierRoofDark, MAT.PAINTED);
    }
    // the white eaves fascia board both photos show under the dark roof edge,
    // 0.34 m deep, on the overhang's outer face (20 mm into it)
    pbox(140, HALL_S1 + 0.10, R0 - 0.06, R0 + 0.02, EAVES_T - 0.06, EAVES_T + 0.28,
      C.pierWhite, MAT.PAINTED);
    pbox(140, HALL_S1 + 0.10, R1 - 0.02, R1 + 0.06, EAVES_T - 0.06, EAVES_T + 0.28,
      C.pierWhite, MAT.PAINTED);
    // The landward GABLE SCREEN WALL, standing proud of this barrel, is built by
    // pier-head-elevations.js as its bow parapet (crown HEAD_TOP+0.80, from the
    // photomatch and f004), because it has to follow that module's bow in plan.

    // ---- THE BIG LED SCREEN - there is only one, on the LANDWARD gable ------
    // (frames 0565 and 0659), built by pier-head-elevations.js. The 18 x 3 m
    // east-flank slab that used to be drawn here punched through that module's
    // east elevation and was removed.

    // ---- THE TOWER: block, fly box, glazed lantern, plant box, mast ---------
    // Form from the 2026-09-03 drone reading (f004-west, the so-called east-beam f004 - which
    // is the WEST side too: land on the left, unmirrored text, tmp-tr31 2026-09-17 -
    // f008): a wide flat-topped block, a glazed ring on a narrower box, a white
    // capped lantern, a dark plant box, masts. Stations and heights from the DSM
    // (header). Trap 5 applies to those frames: FORM ONLY, no colour.
    // Stage 1, the BLOCK. Body, white parapet with a 60 mm dark coping on top;
    // its top is the DSM plateau.
    pbox(TB_S0, TB_S1, bc - TB_O, bc + TB_O, EAVES_T - 0.30, TB_T - 0.15, C.pierWhite, MAT.PAINTED);
    pbox(TB_S0 - 0.14, TB_S1 + 0.14, bc - TB_O - 0.14, bc + TB_O + 0.14,
      TB_T - 0.15, TB_T - 0.06, C.pierWhite, MAT.PAINTED);
    pbox(TB_S0 - 0.16, TB_S1 + 0.16, bc - TB_O - 0.16, bc + TB_O + 0.16,
      TB_T - 0.06, TB_T, C.pierWhite, MAT.PAINTED);
    // 2026-09-16, TOWER RE-DRESSED off the full-res beach0115 frame
    // (tmp-tr8/tower_photo.png): three WHITE tiers - block, a gallery band of
    // small dark windows under a white cornice, a tall white-framed glazed
    // cabin with a small dark box on its roof. The old dark cap, dark coping and
    // 1.31 m dark plant box made it read as a stepped black-and-grey stack.
    // Stage 2, the GALLERY (the elevations module rings it with windows) under a
    // WHITE cornice oversailing 0.4 m, whose top is the cabin's floor.
    pbox(FB_S0, FB_S1, bc - FB_O, bc + FB_O, TB_T - 0.10, FB_T, C.pierWhite, MAT.PAINTED);
    pbox(FB_S0 - 0.4, FB_S1 + 0.4, bc - FB_O - 0.4, bc + FB_O + 0.4, FB_T, CAP_T,
      C.pierWhite, MAT.PAINTED);
    // Stage 3, the GLAZED CABIN: 2.30 m of glass, 4.2 x 4.2 m. The DSM's 12-15 m
    // peak cells span only ~3-4 m across (s 175-179), and in the photo the
    // cabin is ~0.6x the gallery's width and ~1.6x its height. The old code
    // built its "corner posts" as full-length slabs sharing every face of the
    // glass box, so all four walls z-fought; posts are now true corner posts
    // and the mullions stand 40 mm proud of the glass.
    const LN_B = CAP_T, LN_T = HEAD.LN_T, ROOF_T = HEAD.ROOF_T;
    pbox(LN_S0, LN_S1, bc - LN_O, bc + LN_O, LN_B, LN_T, C.pierGlass, MAT.PAINTED);
    for (const s of [LN_S0, LN_S1]) for (const o of [bc - LN_O, bc + LN_O]) {
      pbox(s - 0.15, s + 0.15, o - 0.15, o + 0.15, LN_B, LN_T, C.pierWhite, MAT.PAINTED);
    }
    for (let i = 1; i < 5; i++) {          // 5 panes a face, both long faces and both ends
      const s = LN_S0 + (LN_S1 - LN_S0) * (i / 5), o = bc - LN_O + 2 * LN_O * (i / 5);
      pbox(s - 0.05, s + 0.05, bc - LN_O - 0.04, bc - LN_O + 0.02, LN_B, LN_T, C.pierWhite, MAT.PAINTED);
      pbox(s - 0.05, s + 0.05, bc + LN_O - 0.02, bc + LN_O + 0.04, LN_B, LN_T, C.pierWhite, MAT.PAINTED);
      pbox(LN_S0 - 0.04, LN_S0 + 0.02, o - 0.05, o + 0.05, LN_B, LN_T, C.pierWhite, MAT.PAINTED);
      pbox(LN_S1 - 0.02, LN_S1 + 0.04, o - 0.05, o + 0.05, LN_B, LN_T, C.pierWhite, MAT.PAINTED);
    }
    pbox(LN_S0 - 0.16, LN_S1 + 0.16, bc - LN_O - 0.16, bc + LN_O + 0.16,
      LN_T, ROOF_T, C.pierWhite, MAT.PAINTED);
    // Stage 4, the small dark ROOF BOX, centred on the cabin, topped at the LIDAR
    // crown HEAD_TOP + 6.21 = 20.51 m ODN (a 0.51 m box, not the old 1.31 m one).
    const LN_SC = (LN_S0 + LN_S1) / 2;
    pbox(LN_SC - 0.7, LN_SC + 0.7, bc - 0.7, bc + 0.7, ROOF_T, HEAD_TOP + 6.21,
      C.pierRoofDark, MAT.PAINTED);
    // The mast, from the roof box: a thin pole (it was a 0.8 m square post that
    // read as a chimney). Top unchanged since 2026-09-03.
    {
      const p = at(LN_SC + 0.4, bc);
      m.ctube(p[0], HEAD_TOP + 6.21 - 0.05, p[1], p[0], HEAD_TOP + 7.62, p[1], 0.06, C.pierRail, MAT.PAINTED, 5);
    }

    // The range's end wall (RANGE_S1 198.0) and its cladding (to 198.6) stand clear
    // of the widened rotunda's axis column (face 198.86) and cornice ring (198.9); the rotunda is the head's seaward end, and
    // nothing is built between s 216.1 and the zip tower (DSM: nothing > 1 m
    // over s 218-241). 2026-09-16, stage 2.
  }

  // ==========================================================================
  // THE HELTER SKELTER AND THE ROTUNDA WERE BOTH INSIDE THE BUILDING.
  //
  // This file contained two contradictory schemes for the head, stacked on top
  // of each other. The older drone-footage pass put a helter skelter at s 168
  // and a rotunda at s 196; the later LIDAR pass added the white block over
  // s 140-215, o -3..15 - and did not move the furniture out from under it.
  // Measured against the block:
  //     helter skelter  s 163.8-172.2, o -2.2..6.2   entirely inside it, with
  //                     8 m of striped cone growing out through the roof
  //     rotunda         s 186.5-205.5, o -2.8..16.8  ~95% inside it, the only
  //                     visible part a sliver of dome shearing through the east
  //                     wall at o 15.0-16.8
  // Roughly 500 triangles that could not be seen, and two interpenetrations
  // that could.
  //
  // WHERE THEY ACTUALLY GO. Both are on the open deck SEAWARD of the block,
  // and three frames agree on the order:
  //   0536 - standing on the head looking seaward past the end of the building:
  //          rotunda nearest, helter skelter beyond it, zip tower beyond that,
  //          all on the EAST side with open deck to the west.
  //   0579 - same sequence from the promenade: tower, helter, dome, block.
  //   0565 - sunny side elevation: the low white dome is clearly SEAWARD of the
  //          block, between it and the tower.
  // So: block ends 215 -> rotunda 227 -> helter 242 -> zip tower 251.
  // ⚠️ SUPERSEDED 2026-09-16 (stage 2, EA DSM in plan): the ORDER holds, the
  // stations did not. Range ends 199.2 -> rotunda centre 208 (the head's own
  // seaward end, 216.1) -> open deck -> zip tower (DSM 245.8, built there 2026-09-16).
  //
  // 2026-08-16: that ORDER survives, and the stations are confirmed by an
  // independent ratio read off 0666, which is the same shot family as 0565 but
  // sharper. Taking the head building's own length as the ruler (its landward
  // screen facade to its seaward wall = L, so the camera's obliquity cancels):
  //     rotunda centre   0.20 L seaward of the block  ->  s 230   (built 227)
  //     zip tower centre 0.49 L seaward of the block  ->  s 252   (built 251)
  // Two independent objects landing within 3 m of where they were already built
  // is a good check on the whole seaward layout. (It was not: the ruler L was
  // itself ~11-18 m too long at its seaward end. The DSM wins; see below.)
  //
  // WHAT DID NOT SURVIVE IS THE HELTER SKELTER'S PERMANENCE. It is a ride that
  // comes and goes, and it is now gone from the model. Full evidence below.
  // ==========================================================================

  // ==========================================================================
  // THE HELTER SKELTER — REMOVED 2026-08-16. RESOLVED, NOT DEFERRED.
  //
  // It is a TEMPORARY FAIRGROUND RIDE that comes and goes from the open deck
  // seaward of the block. It is not part of the pier, and it must not be part
  // of the permanent model.
  //
  // WHAT WAS SEARCHED: every frame in BY-FEATURE.json tagged helter-skelter,
  // rotunda, head-buildings or aerial, and every extracted still that shows the
  // seaward half of the head.
  //
  // PRESENT in 0536 (dusk, close, lit, on the deck), 0542 (beach, grey day),
  // 0579 (bright sun, from the promenade over the seafront pond). Tagged in
  // three more that are not in this session's extract: 0535, 0552, 0643, 0681.
  //
  // ABSENT from every square-on side elevation and every aerial:
  //   0565  sunny, 720 px, very nearly abeam - open deck, rotunda, tower, END
  //   0666  sunny, 720 px, the clearest of the whole set - same, nothing there
  //   0598  overcast, full length          0605  wet sand, full length
  //   0620  golden hour                    0676  low sun
  //   0568  backlit                        0588  drone, over the head
  //   0608  drone, sunset                  0657  sunny vertical aerial
  //   0590 and 0599, both drone, both looking along the deck
  //
  // THAT IS THE ANSWER. 0579 and 0565 are both bright, blue-sky, summer-looking
  // frames of the same 30 m of deck, shot square-ish, and one has a striped cone
  // on it and the other has bare deck. Weather and light do not explain it and
  // camera angle does not explain it. Something present in 3 frames and absent
  // from 12, at the same station, in the same conditions, is a ride that gets
  // trucked in and out. A permanent structure - the block, the fly tower, the
  // rotunda, the zip tower - is in ALL of them.
  //
  // In 0579 it stands between the rotunda and the zip tower, i.e. at almost
  // exactly the s 242 this file used, so the PLACE was right. The error was
  // treating it as permanent, and then letting it become the loudest object in
  // the silhouette: at DECK+12.6 with a 5.6 m base it out-shouted the one thing
  // that actually says Bournemouth, which is the barrel-vaulted block with the
  // LED screen in its landward gable. A red-and-white striped cone is a
  // Blackpool/Brighton cue. Putting one on this pier in every view made the
  // model read as A PIER rather than as THIS pier - the exact opposite of what
  // it was there for.
  //
  // 300 triangles removed. If a seasonal-dressing pass is ever built, this is
  // where it goes, behind a flag, with the zip tower's height settled first.
  // Do not restore it as permanent geometry without a frame that shows it in
  // the same shot as one of the twelve above.
  // ==========================================================================

  // ==========================================================================
  // THE ROTUNDA — REAL, AND IN THE RIGHT PLACE. RESOLVED 2026-08-16.
  //
  // The open question was whether this dome exists at all, and whether it had
  // been confused with the green-roofed octagonal thing frame 0599 shows at the
  // pier ENTRANCE. It has not. They are two different objects and both are real:
  //
  //   ENTRANCE  0599 (drone, straight down the axis) - a small glazed OCTAGONAL
  //             kiosk with a dark pitched roof, standing at the pier root with
  //             open sky above it and the covered walkway starting beyond it.
  //             ~3 m across. That is the ticket kiosk, and it is built by
  //             pier-deck-furniture.js at s 6.6 (this file's cruder box at
  //             s 6-11 has been deleted, see above).
  //   HEAD      a genuinely large white pavilion - a colonnade carrying a
  //             projecting cornice, a shallow segmental dome on it, and a
  //             lantern on the apex - standing on the open deck between the
  //             block and the zip tower.
  // Nothing about the entrance kiosk resembles the head pavilion except that
  // both are round-ish and have a roof.
  //
  // FIVE INDEPENDENT FRAMES SHOW THE HEAD DOME, in three different lights and
  // from three different vantage points:
  //   0666  sunny, 720 px, side elevation from the beach - the measuring frame
  //   0565  sunny, 720 px, nearly abeam - same object, same place
  //   0598  overcast, full length - a low pale dome between block and tower
  //   0588  drone, low sunset, close over the head - unmistakable: a RIBBED
  //         dome on a glazed/colonnaded drum with a lantern, railings round it
  //   0608  drone, sunset, further off - same silhouette
  // It is also in every frame BY-FEATURE.json tags "rotunda" (536, 585, 588,
  // 598, 608). This is not a one-frame object and it never was in doubt once
  // the frames were actually looked at.
  //
  // POSITION, RE-MEASURED 2026-09-16 FROM THE EA 1 m DSM IN PLAN: centre
  // s 208.0, o 5.1 (HEAD.ROT_S / ROT_O). Dome-bump centroid s 207.9 o -9.45
  // DSM (weights h-4.0 .. h-5.0 all agree to 0.05), >=5 m extent mid s 208.0
  // o -9.5, the single 6 m cell (lantern) at s 208 o -10, seaward outline
  // circle s 208.1. DSM o -8.59 is the hall axis = model o 6, so o 5.1. The
  // DSM shows NOTHING above 1 m over s 218-241, where this stood at s 227
  // (0666's 0.20 L read was on a ruler too long at its seaward end), and no
  // full-width surround: the footprint tapers ROUND from s 211 to 217.
  // Outline radius there ~9.2 incl. 1 m cell blur; R stays at 0666's 8.1.
  //
  // History: s 196 (inside the block) -> 227 (2026-08-16) -> 208 (DSM).
  // Drone frame 0588 (crop c588) shows a genuinely large
  // colonnaded pavilion with a shallow dome and a finial, so the diameter itself
  // is not in doubt, only the room it had to sit in.
  //
  // ⚠️ AND IT IS BUILT FROM TUBES NOW, NOT BOXES. The old version stepped a
  // 12-sided polygon round with pbox, and pbox takes the BOUNDING BOX of the
  // chord - so each "wall segment" was a filled rectangle spanning the whole
  // quadrant, and the twelve of them together made a solid block. The dome was
  // five concentric square slabs on top of it. As long as the thing was buried
  // inside the head building nobody could see that; the moment it came out onto
  // open deck it read as a plain white shed with a ziggurat on it, which is the
  // opposite of the one shape in frame 0588 that says "pier pavilion". A ctube
  // carries radial normals, so it is genuinely lit round its circumference as
  // well as being round in silhouette.
  //
  // ⚠️ ctube draws NO END CAPS. Every ring of the dome therefore runs from the
  // SAME base (the cornice) up to its own height, largest first, so each ring's
  // open rim looks down onto the outside of the next ring in rather than into
  // the building - nested cylinders, no hole. The apex is plugged by the
  // lantern, which is a closed pbox. The only gap left is the annulus between
  // the cornice and the drum, which is the colonnade roof and is visible from
  // directly overhead only.
  // ⚠️ THAT ANNULUS IS 1.7 m NOW, NOT THE 0.7 m THIS NOTE USED TO CLAIM, AND
  // THE 2026-08-19 DRUM RE-CUT IS WHAT GREW IT. Cornice 8.1 minus drum 6.4 =
  // 1.7 m of open ring (1.86 m to the dome's lowest ring, which is DRUM *
  // cos(1/7 * pi/2) = 6.24). Before the re-cut it was 8.1 - 7.2 = 0.9 m. It is
  // still not a hole THROUGH anything - craft.js draws the coast with
  // gl.disable(CULL_FACE) (see the coast draw), so the backfaces of the ring
  // inside it render and you look at surface, not at sky - and no judged
  // camera is above the deck. But a plan render does show it plainly, so if
  // this ever needs a soffit, this is the number to close.
  //
  // ⚠️ RE-MEASURED 2026-08-16 AND CUT TO A THIRD OF ITS HEIGHT. It was 9.5 m
  // above deck to the top of the lantern, which is 1.08x the whole head
  // building's roof - so on a pier whose one distinctive mass is a barrel-
  // vaulted block, a plain white dome was the tallest thing on the deck and
  // the head camera's dominant object. It is a low pavilion, not a landmark.
  //
  // MEASURED OFF FRAME 0666 (sunny, 720 px, side elevation from the beach, the
  // clearest frame in the set for the seaward half of the head). Vertical scale
  // is chained to the LIDAR, in the same image, at the same standing:
  //     deck y 628, main roof y 586        42 px = 8.83 m  ->  4.64 px/m
  //     CHECK: fly tower y 557, 71 px -> 15.3 m against a LIDAR 15.04. 2%.
  // Then, on that scale, off the rotunda itself:
  //     cornice soffit  y 615   13 px  ->  2.80 m   (colonnade clear height)
  //     cornice top     y 613   15 px  ->  3.23 m
  //     dome apex       y 604   24 px  ->  5.17 m
  //     lantern top     y 598   30 px  ->  6.47 m
  //     silhouette width x 495..570, 75 px -> 16.2 m across
  // WHY THE WIDTH IS READABLE AT ALL off an oblique frame: 0666 looks along the
  // beach, so along-pier distances are foreshortened - but a dome is a surface
  // of revolution, and its silhouette width is its TRUE diameter from every
  // azimuth. The building beside it is compressed; the dome is not.
  // Cornice radius therefore 8.1, columns on 7.9, drum 7.2.
  //
  // The old 9.0 m radius was not far out. The old HEIGHT was out by 1.8x, and
  // that is the number the eye reads.
  //
  // ⚠️ THE VERANDAH WAS 0.70 m DEEP AND THE DRUM WAS SOLID WHITE. RE-CUT
  // 2026-08-19, because the object rendered as a smooth white lump wherever it
  // appeared at all and the one shape that identifies it never showed.
  // ⚠️ "IN ALL FOUR JUDGED CAMERAS" IS WHAT THIS SAID, AND IT IS NOT TRUE.
  // Inverting at() over the four cal= addresses puts the eyes at pier stations
  // 311 (approach), 169 (entrance), 144 (along-neck) and 256 (head), aimed at
  // stations 206, 19, 61 and 201. The rotunda was then at s 227 (s 208 since
  // 2026-09-16), 58 m and 83 m BEHIND the entrance and along-neck eyes (39 and
  // 64 m now) - it cannot be in either
  // frame, at any fov. It is in approach and head only, and in head the deck
  // edge cuts it off at the eaves, so the colonnade this fix buys is not
  // visible there either. The fix is right and it is worth having in approach;
  // the reach of it was overstated. Do not repeat the claim without inverting
  // the cameras first.
  // The drum was r 7.2 inside a cornice at r 8.1, so the 14 columns at R 7.9
  // stood 0.20 m clear of a wall of the SAME colour and material as themselves.
  // There is no ambient occlusion in this renderer: a 0.2 m gap between two
  // C.pierWhite surfaces at the same lighting is not a colonnade, it is a
  // cylinder. What every frame of this thing actually shows is a DEEP SHADED
  // VERANDAH - a ring of pale posts standing well clear of a dark glazed wall:
  //   0536  from the deck, three metres away, the clearest look at it in the
  //         set: white posts on a solid white dado, GLAZED panels between them,
  //         a wide flat soffit overhead with downlights in it, and the drum
  //         plainly set back far enough to walk round inside the posts.
  //   0588  drone, low sun: the dome sits on a drum that reads DARK against a
  //         pale eaves ring, and the ring's overhang is unmistakable.
  //   0666  the ratio the measurement below is chained to: the dome's own
  //         diameter is visibly less than the eaves diameter, ~0.8 of it.
  // So: drum r 6.4 (0.79 of the cornice, matching that ratio), which puts the
  // columns 1.5 m clear of it; dado white to DECK+1.05 and C.pierGlass above;
  // and the dome springs off the drum at 6.4 rather than 7.2.
  // NOTHING MEASURED MOVES. Cornice radius 8.1 is the 16.2 m silhouette width
  // read off 0666, and the heights (eaves 2.80, cornice 3.23, apex 5.17,
  // lantern 6.47 above deck) are the same LIDAR-chained numbers as before.
  // Only the drum inside them is smaller.
  {
    // WIDENED 2026-09-16 off the DSM radial profile about (208.0, 5.1), seaward
    // half, median per 0.5 m of radius: cornice level ~3.2 m out to r 9.0 (3.13)
    // and gone by r 10 (0.46), so the cornice ring is r ~9.1, not the old 8.1.
    // Colonnade 7.9 -> 8.9 and drum 6.4 -> 7.4 keep their 1.5 m verandah.
    const rs = HEAD.ROT_S, ro = HEAD.ROT_O, R = 8.9;   // DSM, 2026-09-16
    const CORN_T = DECK + 3.23, EAVE = DECK + 2.80;
    const DRUM = 7.4;                    // was 6.4 (and 7.2 before that)
    const c = at(rs, ro);
    const cyl = (r, y0, y1, seg, col = C.pierWhite) =>
      m.ctube(c[0], y0, c[1], c[0], y1, c[1], r, col, MAT.PAINTED, seg);
    // drum, set back 1.5 m behind the colonnade: solid dado, then glazing.
    // MAT.PAINTED on both - the glass key is a colour, and on MAT.CONCRETE it
    // would come back brown like everything else that forgets the material.
    cyl(DRUM, DECK, DECK + 1.05, 16);
    cyl(DRUM, DECK + 1.05, CORN_T, 16, C.pierGlass);
    // the verandah columns, on the R circle
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const p = at(rs + Math.cos(a) * R, ro + Math.sin(a) * R);
      m.ctube(p[0], DECK, p[1], p[0], EAVE + 0.10, p[1], 0.24, C.pierWhite, MAT.PAINTED, 5);
    }
    // projecting cornice over the colonnade
    cyl(R + 0.2, EAVE, CORN_T, 16);
    // THE DOME, stepped rings whose tops ARE the DSM radial profile (p50 above
    // deck, 2026-09-16): r 8.0 3.60, 7.0 4.09, 6.0 4.47, 5.0 4.86, 4.0 5.13,
    // 3.0 5.29, 2.0 5.45. It springs from the cornice ring, not from a drum set
    // 1.5 m back, and is fuller than the old r = DRUM cos, rise 1.94 cap (which
    // was 0.4-0.7 m under this profile from r 6 inward). Still a shallow dome:
    // 2.2 m of rise over 9 m. Frames 0666 / 0588 show a segmental cap - so does this.
    const DOME = CORN_T;
    for (const [r, top] of [[8.4, 3.45], [7.5, 3.88], [6.5, 4.29], [5.5, 4.67],
                            [4.5, 5.00], [3.5, 5.21], [2.5, 5.37], [1.5, 5.52]]) {
      cyl(r, DOME, DECK + top, 14);
    }
    // The lantern on the apex - and the plug for the innermost ring. Half-width
    // 1.15 gives a corner radius of 1.63 over an innermost ring of r 1.5, so the
    // annulus is closed; its base is buried 0.14 m into that ring's top (5.52).
    // DSM centre cell 6.25 against this lantern cap at 6.47: agrees.
    pbox(rs - 1.15, rs + 1.15, ro - 1.15, ro + 1.15, DECK + 5.38, DOME + 2.92, C.pierWhite, MAT.PAINTED);
    pbox(rs - 1.35, rs + 1.35, ro - 1.35, ro + 1.35, DOME + 2.92, DOME + 3.24, C.pierRoofDark, MAT.PAINTED);
  }

  // ==========================================================================
  // THE PARASOLS — REMOVED 2026-08-19. RESOLVED, NOT DEFERRED.
  //
  // Seven of them: a 0.18 m mast to DECK+2.5 and a 3.4 x 3.4 m canopy slab at
  // DECK+2.5..2.8, in alternating C.helterRed and C.helterYellow, at ps 218,
  // 224.5, 231, 237.5 on po -5 and -11. They were the last thing in this file
  // still coloured out of the helter skelter's palette, and they were the last
  // survivor of the same drone-footage pass that put the ride here.
  //
  // NO FRAME IN THE SET SHOWS THEM. What the frames show of that deck:
  //   0536  standing ON the open head deck looking seaward, the whole run in
  //         one shot: bare timber boards, white balustrade, bins, hire
  //         barriers. Nothing overhead, nothing coloured, nothing at all.
  //   0666  sunny side elevation, the clearest frame in the set - block,
  //         rotunda, open deck, tower. The deck between them carries railings
  //         and people and no canopy line.
  //   0565  sunny, nearly abeam - same.
  //   0588 / 0608  drone, low over that exact deck - bare boards and railings.
  // The comment they were carrying cited 0536 as showing "bare railed deck",
  // which is exactly right and is an argument for deleting them, not for
  // moving them 6 m west, which is what the last pass did with it.
  //
  // AND THEY FAILED THE SAME WAY THE HELTER SKELTER DID. A 3.4 m slab 0.3 m
  // thick is nearly invisible face-on and a solid bar edge-on, and at 6.5 m
  // centres in s the four of a row merge: from the side elevation - which is
  // every judged camera except "entrance" - they read as ONE continuous red
  // and yellow ribbon 20 m long, floating at head height across the open deck,
  // directly in front of the rotunda. Having just removed a striped cone for
  // being the loudest object on the head and a seaside-generic cue, leaving a
  // red-and-yellow fairground awning in its place undoes the change.
  //
  // 168 triangles removed. Seaward-deck furniture belongs to
  // pier-railings-parapet.js (which has the photographed sign frame and bench
  // at s 233) and to pier-deck-furniture.js. One owner per object.
  // ==========================================================================

  // NOTE ON §B.1a's ROCKREEF BLOCK AND KEY WEST RESTAURANT. This note used to
  // say they were "deliberately NOT built" because the drone footage showed a
  // helter skelter and a rotunda instead. That was written when this file's
  // head was nothing but furniture, and it has been false since the LIDAR pass
  // built the 75 m block above with its barrel vault, fly tower and glazed
  // elevations - which IS the RockReef block, and frame 0590's RockReef sign
  // and 0666's barrel-vault gable confirm it. The two readings were never in
  // conflict: the building is permanent and the ride was seasonal, and the
  // earlier pass mistook "the photo shows a ride" for "the photo shows no
  // building" because it was looking at the open deck seaward of the block.
  // The Key West restaurant is still not separately built; nothing in the set
  // identifies it as a distinct mass rather than a tenancy inside the block.

  // ---- PierZip (§B.1c) ---------------------------------------------------
  // Tower at station 245.8, o 4.5 (DSM plan, 2026-09-16; was 251, 7), platform
  // at Y +25. Dual line, 237.6 m to the sand, descending only 5.3 degrees -
  // riders travel nearly level, they do not plunge.
  //
  // NOT CHANGED by the 2026-08-02 frame-566 calibration, deliberately. Measured
  // off that frame the tower reads about 8 m above deck, which would make the
  // sourced 18.3 m wildly wrong - but the tower stands at station ~246, the far
  // END of a 260 m pier, roughly 50% further from that camera than the head
  // where the deck height was measured. Correcting for that alone moves the
  // estimate to ~12 m, and the residual is inside the error of reading a
  // slender lattice mast off a 640 px video still. The head measurement was
  // trustworthy because building and deck were measured at the SAME station,
  // so perspective cancelled; here it does not. A sourced figure is not
  // overruled by a low-confidence pixel count. Re-measure from a frame shot
  // square to the head before touching this.
  //
  // 2026-08-03, LIDAR: now reduced, on an UPPER BOUND rather than a measurement.
  // The DSM returns nothing above 20.51 m ODN anywhere on the pier, and that
  // one return is the fly tower at station 175, not this. At the zip tower's own
  // station it sees only 10.82 m ODN. A 1 m DSM under-detects slender open
  // lattice - the cells are mostly sky - so 10.82 is a floor, not the height.
  // But the build sheet's 18.3 m above deck would put this at 23.8 m ODN, above
  // everything the survey found, which cannot be right. Set to 20.0 m ODN: just
  // under the fly tower, consistent with frame 566 where the two read as
  // comparable. This is a RECONCILIATION, not a measurement - it is the least
  // certain number on the pier and the one most worth a proper source.
  //
  // 2026-08-16, THE SQUARE FRAME THE NOTE ABOVE ASKS FOR — NOT ACTED ON, ON
  // PURPOSE, but recorded so the next pass does not have to find it again.
  // Frame 0565 is sunny, 720 px, and shot very nearly abeam, so it carries the
  // LIDAR-measured head building and the zip tower in one image (crops m_head
  // and m_zip, both with pixel rulers). At the head: deck 665, main roof 630, so
  // 8.83 m = 35 px = 3.96 px/m, and that scale puts the fly-tower top at 13.4 m
  // against a modelled 13.63 - the frame and the DSM agree, so the method is
  // sound. Carrying it to the tower needs a distance correction: the deck fascia
  // band measures 7 px at the head and 5 px at the tower, so the tower is at
  // ~0.71 of the scale, 2.83 px/m. Against that:
  //     zip platform floor   55 px  ->  19.4 m above deck
  //     canopy top           72 px  ->  25.4 m above deck
  // The platform reading lands within a metre of the build sheet's 18.3 m, which
  // is the figure the 2026-08-03 pass overruled. So the sourced number was
  // probably right and 14.5 is probably ~4 m short.
  // I have NOT changed it. The whole result hangs on a 5-px-against-7-px ratio,
  // which is +-20% on its own, and the tallest element of the silhouette is not
  // something to move on a reading that loose while a 1 m DSM says otherwise.
  // What IS certain from four frames (0565, 0588, 0657, 0659) and is simply not
  // built: the tower carries a DOMED WHITE CANOPY over its platform, and that
  // mushroom top is one of the most recognisable things in the whole pier
  // silhouette. Whoever raises the tower should add it in the same change.
  // MEASURED OFF THE LIDAR, 2026-08-19, and this replaces a reconciliation that
  // split the difference between two guesses.
  //
  // tools/pier-profile.py reads a 24.92 m ODN first return at station 245 - the
  // only thing out there tall enough to be the zip tower, standing 19.45 m over
  // a 5.47 m deck. The build sheet's sourced figure was 18.3 m above deck and
  // DMW Architects, who designed PierZip, independently support that order. A
  // photo measurement once suggested about 8 m and was correctly refused as low
  // confidence; this file then settled on DECK + 14.5 as a compromise between
  // the two, which is the one value nothing supports.
  //
  // Taking the measurement: 24.92 ODN. The 0.45 m below it is the platform slab
  // and handrail the DSM sees the top of.
  // ⚠️ SUPERSEDED 2026-09-16 (owner-approved change to this PROTECTED value). Mapped
  // in PLAN, the DSM over the tower has three levels: 26.03-26.54 within r 1.7 of
  // the centre (disc crown), 24.88-25.02 at r 0.8-2.0 (disc rim/underside - the
  // 24.92 above is one of THESE cells, 0.8 m from the centre, so it was never the
  // platform), and 21.67-22.80 at r 2.2-3.2, the widest ring (pod floor and bowl).
  // beach0115 agrees: with its apex at the DSM crown, disc rim 25.05, pod floor
  // 22.74 and bowl 21.80 all land on DSM levels (tmp-tr16/RESULT.md). So ZIP_TOP -
  // the POD FLOOR every part of the tower is built from - is DECK + 17.27.
  const ZIP_TOP = DECK + 17.27;         // 22.74 m ODN, pod floor: DSM ring 21.7-22.8 (2026-09-16; was 24.92)
  // PLAN POSITION off the same DSM, mapped in plan (2026-09-16): cells >= 10 m
  // above deck span s 242.2-249.4, centroid s 245.97 / extent mid 245.80, and
  // model o 4.51 / 4.60 (model o = DSM o + 14.6, tmp-tr8/s1). Was s 251, o 7 -
  // 5.2 m too far seaward. The cable anchor follows via at(ZS, ZO).
  // pier-people-scale.js's watching knot aims at these numbers too.
  const ZS = 245.8, ZO = 4.5;
  // ---- THE TOWER'S FORM: AN A-FRAME, NOT A LATTICE (2026-09-16) -----------
  // Rebuilt off owner photo beach0115 (tmp-tr11/pm/ref/t27983_full.png, tower
  // x 1240-1370, y 1195-1455; ruled zoom tmp-tr16/ev/ruled_zip.png), drone
  // 0588/0608, deck 0536 and aerial 0657. The real tower is a vertical MAST
  // column wrapped by a SPIRAL STAIR, one strongly SPLAYED LEG and a slightly
  // splayed second column forming an A with it, two horizontal STRUTS across
  // the A, a round glazed POD with a bowl underside, and a FLAT LENS-SHAPED
  // DISC on posts with one thin arm. The 4-leg tapered lattice and the domed
  // mushroom this replaces matched none of that.
  //
  // PLAN. The photo fixes each part only across its line of sight: image-left
  // is L = (s, o) (-0.553, +0.834) per metre at tmp-tr11/pose_final.json.
  // Depth comes from the DSM (tmp-tr16/dsm_bands.py) and the drone frames, in
  // which the leg rakes landward. Pod and disc centre P = (ZS, ZO + 0.6): the
  // DSM cells >= 19 m above deck centre on s 245.98, o 5.08. Mast axis 0.8 m
  // image-right of P (photo x 1323 against pod centre 1312). Leg foot at
  // P + (-6.4, +3.3), open deck, 4.7 m image-left of its head as photographed.
  //
  // HEIGHTS. Pod FLOOR = ZIP_TOP (protected; lowered to 22.74 on 2026-09-16). Above it, photo px
  // over the floor line at 12.31 px/m (tmp-tr11/pose_r3_apexdsm.json, the
  // pose whose apex is the DSM's): glass +1.50, disc underside +2.32, rim top
  // +2.64, apex +3.86; bowl bottom -0.95. Struts at the photo's fractions of
  // floor height, 0.318 and 0.659.
  // With ZIP_TOP at 22.74 (owner-approved, see its definition) the disc top lands
  // at 26.60 against the DSM crown 26.54, the underside at 25.06 against the rim
  // cells 24.88-25.02, and floor/bowl 22.74/21.79 on the DSM's 21.67-22.80 ring.
  // Everything here is built relative to ZIP_TOP (tmp-tr16/RESULT.md).
  {
    const H = ZIP_TOP - DECK, FL = ZIP_TOP, BASE = ZIP_TOP - 0.95;
    const LS = -0.553, LO = 0.834;                     // image-left, (s, o)
    const PS = ZS, PO = ZO + 0.6;                      // pod and disc centre
    const MS = PS - 0.8 * LS, MO = PO - 0.8 * LO;      // mast axis
    const W3 = (s, o, y) => { const p = at(s, o); return [p[0], y, p[1]]; };
    const tube = (a, b, r, col, seg) =>
      m.ctube(a[0], a[1], a[2], b[0], b[1], b[2], r, col, MAT.PAINTED, seg);
    // one triangle, wound and normalled to face away from ref (world xyz)
    const tri = (a, b, c, ref, col) => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const g = [(a[0] + b[0] + c[0]) / 3 - ref[0], (a[1] + b[1] + c[1]) / 3 - ref[1], (a[2] + b[2] + c[2]) / 3 - ref[2]];
      const L = Math.hypot(n[0], n[1], n[2]) || 1;
      let q = [a, b, c];
      if (n[0] * g[0] + n[1] * g[1] + n[2] * g[2] < 0) { q = [a, c, b]; n = n.map((x) => -x); }
      const id = q.map((p) => m.pushC(p[0], p[1], p[2], n[0] / L, n[1] / L, n[2] / L, col, MAT.PAINTED));
      m.tri(id[0], id[1], id[2]);
    };
    // convex solid of revolution about the vertical through (s, o): profile of
    // [r, y] pairs; r = 0 ends close as fans
    const lathe = (s, o, prof, yRef, col, seg) => {
      const ref = W3(s, o, yRef);
      const pt = (r, y, j) => { const a = (j / seg) * 2 * Math.PI; return W3(s + r * Math.cos(a), o + r * Math.sin(a), y); };
      for (let k = 0; k + 1 < prof.length; k++) {
        const [r0, y0] = prof[k], [r1, y1] = prof[k + 1];
        for (let j = 0; j < seg; j++) {
          const A = pt(r0, y0, j), B = pt(r0, y0, j + 1), Cc = pt(r1, y1, j + 1), D = pt(r1, y1, j);
          if (r0 > 0) tri(A, B, Cc, ref, col);
          if (r1 > 0) tri(A, Cc, D, ref, col);
        }
      }
    };
    // MAST: col1 vertical, col2 0.35 m the other side splaying to 1.15 m at deck
    const c1 = (y) => W3(MS + 0.35 * LS, MO + 0.35 * LO, y);
    const c2 = (y) => { const k = 0.35 + 0.8 * (BASE - y) / (BASE - DECK); return W3(MS - k * LS, MO - k * LO, y); };
    // a 0.3 m plinth under col1: its underside is the only tower geometry AT
    // DECK (4 verts, as the lattice had), so DECK's built count holds at 759
    pbox(MS - 0.6, MS + 0.6, MO - 0.6, MO + 0.6, DECK, DECK + 0.3, C.pierBeam, MAT.PAINTED);
    tube(c1(DECK + 0.3), c1(BASE), 0.17, C.pierBeam, 8);
    tube(c2(DECK), c2(BASE), 0.17, C.pierBeam, 6);
    // SPLAYED LEG, pod bowl to deck, and the two STRUTS across the A
    const T = [PS - 1.63, PO + 0.83], F = [PS - 6.4, PO + 3.3];
    const leg = (y) => { const t = (y - DECK) / (BASE - DECK); return W3(F[0] + (T[0] - F[0]) * t, F[1] + (T[1] - F[1]) * t, y); };
    tube(leg(DECK), leg(BASE + 0.3), 0.21, C.pierBeam, 6);   // runs into the bowl
    for (const f of [0.318, 0.659]) tube(leg(DECK + H * f), c2(DECK + H * f), 0.12, C.pierBeam, 6);
    // SPIRAL STAIR round the mast axis, deck to pod: 6 turns (photo pitch
    // ~36 px, ~3.1 m), a helicoid of treads, an outer stringer and a handrail
    const TURNS = 6, PER = 10, NS = TURNS * PER, RI = 0.25, RO = 1.3;   // cage 30 px wide
    const hp = (r, i, dy) => {
      const a = (i / PER) * 2 * Math.PI;
      return W3(MS + r * Math.cos(a), MO + r * Math.sin(a), DECK + 0.02 + (BASE - DECK - 0.02) * (i / NS) + dy);
    };
    // 2026-09-16 (tmp-tr25p item 3c): the top turn's handrail (1.0 m over the
    // treads) ran up INTO the pod bowl from i 57.7 to 60, by up to 0.75 m: the
    // bowl underside is BASE at r <= 1.5 from the pod axis, rising to FL - 0.25
    // at r 2.45, and the rail sits at r 1.9-2.1 there. Where it would meet the
    // bowl it now runs 0.08 m under it (rail radius 0.05 on top of that).
    const bowlUnder = (r) => BASE + (Math.min(Math.max(r, 1.5), 2.45) - 1.5) / 0.95 * 0.7;
    const railDy = (i) => {
      const a = (i / PER) * 2 * Math.PI, r = RO + 0.05;
      const rp = Math.hypot(MS + r * Math.cos(a) - PS, MO + r * Math.sin(a) - PO);
      return Math.min(1.0, bowlUnder(rp) - 0.13 - (DECK + 0.02 + (BASE - DECK - 0.02) * (i / NS)));
    };
    for (let i = 0; i < NS; i++) {
      const a0 = hp(RI, i, 0), b0 = hp(RO, i, 0), b1 = hp(RO, i + 1, 0), a1 = hp(RI, i + 1, 0);
      const up = [(a0[0] + b1[0]) / 2, a0[1] - 5, (a0[2] + b1[2]) / 2];
      const dn = [(a0[0] + b1[0]) / 2, a0[1] + 5, (a0[2] + b1[2]) / 2];
      tri(a0, b0, b1, up, C.pierRail); tri(a0, b1, a1, up, C.pierRail);
      tri(a0, b0, b1, dn, C.pierBeam); tri(a0, b1, a1, dn, C.pierBeam);
      const s0 = hp(RO, i, -0.08), s1 = hp(RO, i + 1, -0.08);
      tube(s0, s1, 0.06, C.pierBeam, 4);
      const h0 = hp(RO + 0.05, i, railDy(i)), h1 = hp(RO + 0.05, i + 1, railDy(i + 1));
      tube(h0, h1, 0.05, C.pierRail, 3);
    }
    // POD: floor top AT ZIP_TOP, bowl underside; glass wall and top rail
    lathe(PS, PO, [[0, FL], [2.45, FL], [2.45, FL - 0.25], [1.5, BASE], [0, BASE]],
      FL - 0.5, C.pierWhite, 16);
    { const a = W3(PS, PO, FL), b = W3(PS, PO, FL + 1.42), c = W3(PS, PO, FL + 1.52);
      tube(a, b, 2.40, C.pierBeam, 16); tube(b, c, 2.44, C.pierRail, 16); }   // glazing grey: colour NOT photo-tuned
    // four posts, floor to disc
    for (let i = 0; i < 4; i++) {
      const a = (i + 0.5) * Math.PI / 2;
      const s = PS + 2.0 * Math.cos(a), o = PO + 2.0 * Math.sin(a);
      tube(W3(s, o, FL), W3(s, o, FL + 2.34), 0.08, C.pierBeam, 4);
    }
    // DISC: flat underside, thin rim, shallow crown to the apex
    lathe(PS, PO, [[0, FL + 2.32], [2.35, FL + 2.32], [2.35, FL + 2.62], [1.25, FL + 3.55], [0, FL + 3.86]],
      FL + 2.9, C.pierWhite, 16);
    // 2026-09-16 (tmp-tr25p item 3b): the pale BRACKET on the pod's image-right
    // side in beach0115 (tmp-tr19/zip_zoom.png, full res x 1335-1352, y 1236-1247,
    // against pod axis x 1312 and floor line y 1242.4 at 12.25 px/m): about 0.5 m
    // deep where it leaves the pod, tapering to 3.2 m image-right of the axis,
    // on the floor line. Its centre is FL + 0.02 so no vertex lands on ZIP_TOP.
    // A CLOSED tapered prism (tri faces), not tubes: a ctube end is open, and
    // seen end-on from the tip it rendered as a hollow hexagon.
    { const vS = LO, vO = -LS;                         // horizontal, across the bracket
      const P = (t, w, h) => W3(PS - t * LS + w * vS, PO - t * LO + w * vO, FL + 0.02 + h);
      const n = [[-0.30, -0.25], [0.30, -0.25], [0.30, 0.25], [-0.30, 0.25]].map(([w, h]) => P(2.15, w, h));
      const f = [[-0.05, -0.06], [0.05, -0.06], [0.05, 0.06], [-0.05, 0.06]].map(([w, h]) => P(3.25, w, h));
      const ref = P(2.7, 0, 0);
      const quad = (a, b, c, d) => { tri(a, b, c, ref, C.pierWhite); tri(a, c, d, ref, C.pierWhite); };
      quad(n[0], n[1], n[2], n[3]); quad(f[0], f[1], f[2], f[3]);
      for (let k = 0; k < 4; k++) quad(n[k], n[(k + 1) % 4], f[(k + 1) % 4], f[k]); }
    // the thin arm out of the disc, image-right in beach0115 and 0536
    tube(W3(PS, PO, FL + 2.5), W3(PS - 4.0 * LS, PO - 4.0 * LO, FL + 2.56), 0.07, C.pierRail, 4);
  }

  // The two cables, as a shallow catenary to the sand 237.6 m away on bearing
  // 358.5 deg. A rider on the EAST flank passes directly beneath them.
  //
  // BUILT AS TUBES, NOT BOXES. This previously took the axis-aligned BOUNDING
  // BOX of each 9 m segment, so a span dropping a metre became a 9 x 1 x 9 m
  // block and the cable rendered as a chain of boulders - the single most
  // obviously wrong thing on the pier. A cable is 30 mm of steel; nothing about
  // it survives being drawn as a box.
  const land = [72.8 + OX, 14.5 + OZ];
  const [tx, tz] = at(ZS, ZO);
  const STEPS = 30;
  const CABLE_R = 0.035;                 // 70 mm dual-line zip cable
  const yTop = ZIP_TOP + 0.5, yEnd = 2.5;
  for (const gap of [-0.8, 0.8]) {
    const p = (t) => {
      const x = tx + (land[0] - tx) * t + gap * 0.9943;
      const z = tz + (land[1] - tz) * t - gap * 0.1063;
      // Catenary sag. Shallow: §B.1c has riders descending 5.3 degrees, nearly
      // level, so the sag is what gives the line its shape at all.
      const y = yTop + (yEnd - yTop) * t - Math.sin(t * Math.PI) * 3.2;
      return [x, y, z];
    };
    for (let i = 0; i < STEPS; i++) {
      const a = p(i / STEPS), b = p((i + 1) / STEPS);
      m.ctube(a[0], a[1], a[2], b[0], b[1], b[2], CABLE_R, C.pierRail, MAT.PAINTED, 5);
    }
  }

  // ---- detail modules -----------------------------------------------------
  // Everything above is the pier's MASSING - the shapes that make the
  // silhouette read as Bournemouth from 150-400 m. Everything below is detail
  // that only resolves closer in. Ordered massing-first deliberately: the
  // silhouette was wrong for weeks while detail kept being added to it, and no
  // amount of window mullions rescues a building that is the wrong height.
  // `at` is in the context because ctube works in WORLD coordinates while
  // everything else here is in pier space. Without it a module has no way to
  // place a round thing on a pier that runs 6.1 degrees off the world axis.
  const ctx = { pbox, at, m, C, MAT, DECK, NECK_HALF, HEAD_W, TIP_HALF, HEAD_TOP, HEAD, ZIP_TOP, TIP, WALK };
  // >>> DECALTIER (tmp-tr136)
  // Culled, now that picketPanel winds both its faces outward (see
  // pier-railings-parapet.js) - which only became safe once the panel stopped
  // casting into the shadow map, because the winding moves the shadow map and
  // the panel's shading is gated by balustrade_head. Everything else this
  // module builds is a closed ctube or box, and without culling every one ties
  // against its own back face along its silhouette.
  m.beginCull();
  addRailingsParapet(ctx);
  m.endCull();
  // <<< DECALTIER
  addDeckFurniture(ctx);
  addHeadElevations(ctx);
  addArcadeUnderside(ctx);
  // >>> RAID
  // Record the pier crowd's index range so the Viking pier siege can skip drawing the
  // visitors while it runs (nobody shown on a burning pier). Recording only - mesh unchanged.
  const crowd0 = m.i.length;
  // <<< RAID
  addPeopleAndScale(ctx);
  // >>> RAID
  const crowd1 = m.i.length;
  ranges.crowdRaw = [crowd0, crowd1];
  // <<< RAID
  // >>> DECALTIER (tmp-tr136)
  // Drawn back-face culled. Everything this module builds is a closed ctube or
  // box solid standing landward of the pier root, so culling removes only the
  // back faces that were being overdrawn - and those back faces are what tie
  // with their own front faces along every thin silhouette (the wheel's 32
  // spokes are 120 mm rods at 300-500 m). Measured: the module is the largest
  // single remaining contributor to the S views' far-plane sensitivity, and
  // the wheel is visually identical culled and unculled.
  m.beginCull();
  addPierLandmarks(ctx);
  m.endCull();
  // <<< DECALTIER
  // >>> RAID
  // tr64: tag each pier triangle with the siege section(s) it stands on. The mesh itself is
  // NOT touched; the raid groups them into ranges on entry (src/raid/hide-ranges.js).
  raidClassifyPier(m, raidI0, crowd0, crowd1, OX, OZ, ranges);
  // <<< RAID
}
