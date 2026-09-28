// src/ui/levels.js — WHERE EACH LEVEL LIVES, AND WHETHER GETTING THERE COSTS A PAGE LOAD.
//
// The picker's markup is in index.html and its wiring is in main.js; this file is the part
// with rules in it, and it is deliberately pure — no DOM, no `location`, no imports — so the
// URL a choice produces can be asserted in a node harness with no browser at all
// (tmp-tr154/test-levels.mjs).
//
// ---------------------------------------------------------------------------------------
// THE ONE CONSTRAINT THAT SHAPES ALL OF THIS
// gl/arena-oldharry.js reads `?arena=oldharry` at MODULE LOAD and coast.js bakes the Old Harry
// landform into the world mesh while the page is loading. gl/stunt-arena.js reads
// `?arena=stunt` the same way and gl/ramps.js reads ITS placement table off that flag, so the
// twelve stunt ramps are in or out of the world mesh at page load too. Neither world can be
// added to or removed from a running session at any price. So:
//
//   * free ride / rescue / viking / pirate / smuggling share ONE world -> switch live.
//   * anything that crosses an arena boundary                          -> NAVIGATE, and say so.
//
// `needsReload()` is that boundary and it is the only place the rule is written down.
//
// ⚠️ tmp-tr173 GENERALISED THIS FROM A BOOLEAN TO AN ARENA NAME, because there are now
// THREE worlds and not two. `arena` on a level is `false` or the arena's id, `arenaOf(search)`
// returns the same thing for a URL, and needsReload compares the two. The old boolean
// `arenaOn()` is still here and still means exactly what it meant — "is this URL outside the
// Bournemouth mesh" — because that is a real question the picker still asks. A boolean could
// not express "Old Harry -> the stunt stage is also a page load", which it is.
// ---------------------------------------------------------------------------------------

// Every arena this build has, which is also the set of values `?arena=` may legally take: an
// unknown value is not an arena, so a typo lands in Bournemouth rather than in nothing.
export const ARENAS = ['oldharry', 'stunt'];

// The SEVEN entries, in the order the sheet shows them. `arena` is the ONLY per-level fact the
// reload decision uses; `q` is what the URL must say for a fresh page to land in that level.
//
// Why these params and not a new `?level=` of my own: every one of them already exists and is
// already honoured on load — `mode` by raid-mode.js:524 and rescue-mode.js:168, `raidfoe` by
// raid-mode.js:74, `arena` by arena-oldharry.js:108 and stunt-arena.js:106, `start=0` by
// main.js's DEFAULT START. Inventing a param of my own would have meant one more thing that
// can get out of step.
export const LEVELS = [
  { id: 'free',   arena: false, q: { start: '0' } },
  { id: 'rescue', arena: false, q: { mode: 'rescue' } },
  { id: 'raid',   arena: false, q: { mode: 'raid' } },
  { id: 'pirate', arena: false, q: { mode: 'raid', raidfoe: 'pirate' } },
  // No `raidfoe`: with the arena on, raid-mode.js:75 already makes the faction corsair because
  // the LEVEL is the gate. Setting it here as well would be a second switch to get out of step.
  { id: 'gate',   arena: 'oldharry', q: { mode: 'raid' } },
  // tmp-tr170 THE DORSET SMUGGLING RUN. Bournemouth's own mesh, so it is a LIVE switch like
  // the first four - only the Old Harry arena costs a page load, and this level does not use
  // it. `mode=smuggle` is read on load by src/raid/smuggle.js's initSmuggle() exactly as
  // `mode=raid` is by raid-mode.js:524, so a pasted URL lands in it with no extra machinery;
  // OWNED below already carries `mode`, so a stale one cannot follow a player out of here.
  { id: 'smuggle', arena: false, q: { mode: 'smuggle' } },
  // tmp-tr173 THE STUNT STAGE. Its own world: gl/ramps.js's placement table is EMPTY unless
  // ?arena=stunt is set, so the twelve ramps and the course marking are baked in or out at
  // page load exactly as the Old Harry chalk is. That is why it carries an `arena` and why
  // every crossing into or out of it is a navigation. `mode=stunt` is read on load by
  // src/stunt/stunt.js's initStunt() exactly as `mode=smuggle` is by initSmuggle().
  //
  // ⚠️ 2026-09-20: THE EFOIL IS BACK ON THIS LIST, AND THE OLD REASON FOR ITS ABSENCE IS
  // GONE. What this comment used to say - "boats/ramp-collide.js wraps the HULL obstacle grid
  // and the eFoil's plant has no path into it, so an eFoil rides straight THROUGH every ramp"
  // - was true when tmp-tr173 wrote it and is NOT true any more. src/foil-ramp.js gives the
  // foil its own contact: the eFoil rides a ramp ON ITS WING, one contact point instead of a
  // hull's seven, with the board carried 2.35 m up at the crest. Measured by its author at
  // 1.01-1.20 s of air against a control of 0.00-0.27 s, 0 stuck and 0 NaN over 96 runs.
  // A stale comment asserting something false is how several of this project's defects hid,
  // so the reason is replaced rather than left standing beside a changed list.
  //
  // `craftOk` / `craftFallback` STAY, and are no longer about the eFoil. Every craft this
  // build ships can ride the course, so the list's remaining job is to be the one gate a
  // fourth craft has to pass, and to catch a `?craft=` value this build has never heard of -
  // which is the only input that can still reach `craftFallback`. The game is called
  // 365 eFoil; the craft it is named after can ride the stage it is named for.
  { id: 'stunt', arena: 'stunt', q: { mode: 'stunt' },
    craftOk: ['efoil', 'jetski', 'speedboat'], craftFallback: 'jetski' },
  // tmp-tr197 THE TRIP BACK, added to the sheet 22 Sep 2026 on the owner's instruction
  // ("add it to the level menu with the rescue music"). Bournemouth's own mesh and no arena,
  // so it is a LIVE switch like the first four and the smuggling run - `mode=overboard` is
  // read on load by src/overboard/mode.js exactly as `mode=smuggle` is by initSmuggle(), and
  // OWNED below already carries `mode`, so a stale one cannot follow a player out of here.
  //
  // ⚠️ LAST IN THE TABLE ON PURPOSE. musicNow() walks this list BACKWARDS because "the rows
  // added last are the ones that do the standing down", and mode.js stands itself down when
  // another level's body class appears. A row inserted above `stunt` would be asked about
  // after it.
  //
  // ⚠️ ITS ROW ID IS NOT A PRESET NAME, and that is deliberate. The two rows above resolve
  // their music by id-equals-preset; this one does not, because the owner asked for the
  // RESCUE bed rather than one of its own, and a level sharing a bed with another is a thing
  // this table cannot express. It is resolved in musicNow()'s OVERBOARD fence instead, which
  // is also the only place in main.js allowed to spell this level's name.
  { id: 'overboard', arena: false, q: { mode: 'overboard' } },
  // b22 DOLPHIN WATCH, added 24 Sep 2026 on the owner's instruction ("Maybe we should add a
  // dolphin finding level"). Bournemouth's own mesh and no arena, so a LIVE switch like the row
  // above - src/dolphinwatch/mode.js reads `mode=dolphins` on load. SPEEDBOAT ONLY, and that is
  // the pod's rule rather than this table's: src/dolphin-pod.js rides a boat's bow wave and
  // nothing else, so on any other craft the level could not be won. `craftFallback` is what a
  // cold start or a `?craft=` for anything else resolves to.
  //
  // ⚠️ LAST, for the reason the row above gives: musicNow() walks this list backwards and the
  // row added last is the one that stands the others down.
  { id: 'dolphins', arena: false, q: { mode: 'dolphins' }, craftOk: ['speedboat'], craftFallback: 'speedboat' },
  // PIER SURF, added 26 Sep 2026 on the owner's instruction ("carry on with stage 2 and add it to
  // the levels"). Bournemouth's own mesh and no arena, so a LIVE switch like the two rows above -
  // src/surfer/mode.js reads `mode=surfer` on load. SURFBOARD ONLY, and the board is not a craft
  // anyone can choose: it is in no craft list (boats/hub.js KINDS vs CRAFTS), the level selects
  // it itself and puts the player's own craft back on the way out. So NO craftOk here: the
  // craft the player is on rides along in the URL as it does for every other live row, which is
  // exactly what the level hands back to them when they leave.
  //
  // ⚠️ LAST, for the reason the rows above give: the row added last stands the others down.
  { id: 'surfer', arena: false, q: { mode: 'surfer' } },
];

export const levelById = (id) => LEVELS.find((l) => l.id === id) || null;

// Params the picker OWNS. Everything else in the URL — ?surf=, ?seed=, ?raidwave=, ?rig=,
// ?sea=, whatever a player or a harness put there — is carried across a navigation untouched,
// because a reload the player did not ask for must not quietly drop their setup.
const OWNED = ['arena', 'mode', 'raidfoe', 'start', 'phonestart'];

// WHICH arena a URL is in: the arena's id, or false for the Bournemouth mesh. An `?arena=`
// value that is not in ARENAS is not an arena - a typo must land you in the ordinary world
// and not in a fourth state nothing in this build knows how to construct.
export function arenaOf(search) {
  const v = new URLSearchParams(search || '').get('arena');
  return ARENAS.includes(v) ? v : false;
}

// Is this URL outside the Bournemouth mesh at all? Kept, because that is what the old boolean
// meant and because the picker's loading card asks exactly this question.
export function arenaOn(search) {
  return arenaOf(search) !== false;
}

// TRUE iff getting to `id` from a page loaded with `search` has to go through a page load.
// Compares ARENA IDENTITY, not truthiness: Old Harry -> the stunt stage is two different
// world meshes and is a reload, which `l.arena !== arenaOn(search)` could not have said.
export function needsReload(id, search) {
  const l = levelById(id);
  return !!l && l.arena !== arenaOf(search);
}

// The URL for `id`, built from the CURRENT one. `craft` is the craft the player is on right
// now ('efoil' | 'speedboat' | 'jetski'): a navigation they did not ask for should not also
// put them back on a different machine. 'efoil' is the default and main.js:1023 ignores
// ?craft=efoil, so it is dropped rather than written.
export function levelURL(id, search, craft) {
  const l = levelById(id);
  if (!l) return null;
  const q = new URLSearchParams(search || '');
  for (const k of OWNED) q.delete(k);
  if (l.arena) q.set('arena', l.arena);
  for (const k in l.q) q.set(k, l.q[k]);
  // The craft rides along, UNLESS the level names a set it can be ridden on and the current
  // one is not in it - then the level's own fallback is written instead. Only the stunt stage
  // does that today, and its entry above says why.
  const want = (l.craftOk && !l.craftOk.includes(craft)) ? l.craftFallback : craft;
  if (want && want !== 'efoil') q.set('craft', want); else q.delete('craft');
  const s = q.toString();
  return s ? '?' + s : './';
}

// >>> STARTPICK
// DOES THIS URL ALREADY SAY WHICH LEVEL? (2026-09-20, owner: "can we have it say when the game
// starts you can choose which level you wanna play would make sense, wouldn't")
//
// A bare URL used to open straight into the jetski Viking raid - main.js's DEFAULT START -
// so a new player never learned the other six levels were there. A bare URL now shows the
// picker FIRST and an explicit address still goes straight in, and the difference between
// those two is a question about a URL. So it is answered here, beside the rest of the URL
// rules, where tests/test-levels.mjs can hold it with no browser at all - and not in main.js
// where the same rule would only ever be checked by loading a page and looking at it.
//
// SAYS WHICH LEVEL = OWNED, plus `craft`.
//   * OWNED is every param levelURL() writes. Taking the whole list rather than naming
//     params by hand means every URL this picker's own buttons produce is a deep link BY
//     CONSTRUCTION - the picker can never navigate into a URL that re-opens the picker - and
//     an eighth level that brings a new param of its own gets that property for free the
//     moment it is added to OWNED, which is the only place a new param can be added anyway.
//   * `craft` is not in OWNED because levelURL() writes it conditionally, but `?craft=jetski`
//     is still an address that asked for a particular ride, and it has never opened into
//     anything except that ride. Asking a question the URL has already half-answered would
//     be a regression for it.
export const NAMES_A_LEVEL = [...OWNED, 'craft'];

// ⚠️ THE TWO THAT ARE NOT A GAME AT ALL, CHECKED FIRST AND ON THEIR OWN.
// `?cal=` renders the 25 judged calibration views and `?clean=1` strips the HUD for them.
// A card drawn over either one would corrupt the corpus every tone number in this project is
// measured against, so they are a separate early return rather than two more entries in the
// list above: a future level param cannot be added in a way that lets one of them through,
// and neither can a typo in the list.
//
// Note what is NOT here. `?rig=1` (the tuning rig), `?surf=`, `?seed=`, `?sea=`, `?cam=` and
// the `?v=` cache-buster play-efoil.cmd appends all say something about the instrument or the
// conditions and NOTHING about which level. They ask, which is the right answer: a cache
// buster is not a level choice, and the rig operator who used to be dropped into a Viking
// raid now gets to say what they wanted to tune.
export function asksWhichLevel(search) {
  const q = new URLSearchParams(search || '');
  if (q.has('cal') || q.get('clean') === '1') return false;
  return !NAMES_A_LEVEL.some((k) => q.has(k));
}
// <<< STARTPICK
