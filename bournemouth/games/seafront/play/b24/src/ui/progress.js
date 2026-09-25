// src/ui/progress.js — WHAT THE PLAYER HAS FINISHED, AND WHAT COMES NEXT.
//
// Deliberately pure, like ui/levels.js next door: no DOM, no `location`, no localStorage.
// The store is passed in. That is what lets the whole of this be asserted in a node harness
// with no browser (tmp-tr195/test-progress.mjs), which matters because the interesting parts
// are the edge cases - a storage that throws, a saved name that no longer exists, a player who
// jumped straight to level five from a shared link.
//
// ---------------------------------------------------------------------------------------
// THE TWO RULES THAT SHAPE THIS
//
// 1. PROGRESS IS A ROUTE, NOT A CAGE. The picker still lists every level and every one of them
//    still starts. Someone who arrived from a Facebook post about Vikings gets the Viking raid,
//    not a lecture about finishing the rescue first. What progression adds is a DEFAULT PATH -
//    a NEXT button on the card you just beat - and a record of what you have done.
//    A hard gate would mostly annoy the people the game is being advertised to.
//
// 2. IT MUST WORK WHEN THE STORE DOES NOT. localStorage throws in a private window, comes back
//    empty after a clear, and is per-browser and per-device - so a player on their phone has
//    none of their laptop's progress. Every function here therefore degrades to "nothing is
//    completed", which is exactly today's behaviour. Progress is a nice-to-have on top of a
//    game that works without it; it is never a precondition for playing anything.
// ---------------------------------------------------------------------------------------

// The campaign order. FREE RIDE IS NOT IN IT and that is on purpose: it is the sandbox and the
// shop window, it has no win condition to complete, and it is the level that runs on the
// weakest hardware. It is always open and never "done".
//
// The order is the LEVEL PICKER'S order, not a new one invented here. That order was chosen
// deliberately and a second, different ordering would be one more thing to get out of step.
export const CAMPAIGN = ['rescue', 'raid', 'pirate', 'gate', 'smuggle', 'stunt', 'overboard', 'dolphins'];

// Display names, for the NEXT button. Kept beside the order so the two cannot drift apart.
export const TITLES = {
  rescue: 'RESCUE MODE',
  raid: 'VIKING RAID',
  pirate: 'PIRATE RAID',
  gate: 'THE HARBOUR MOUTH',
  smuggle: 'THE SMUGGLING RUN',
  stunt: 'THE STUNT STAGE',
  overboard: 'THE TRIP BACK',
  dolphins: 'DOLPHIN WATCH',
  free: 'FREE RIDE',
};

const KEY = 'seafront.done.v1';

/** The level after `id` in the campaign, or null at the end (or for a level not in it). */
export function nextAfter(id) {
  const i = CAMPAIGN.indexOf(id);
  if (i < 0 || i === CAMPAIGN.length - 1) return null;
  return CAMPAIGN[i + 1];
}

/** The first level of the campaign - where a player with no history is pointed. */
export function firstLevel() { return CAMPAIGN[0]; }

/**
 * Read the completed set. NEVER THROWS and never returns undefined: a store that is absent,
 * blocked, full of junk or holding a level id this build no longer has all resolve to a clean
 * Set of the names that are still real.
 */
export function readDone(store) {
  let raw = null;
  try { raw = store && store.getItem ? store.getItem(KEY) : null; } catch { return new Set(); }
  if (!raw) return new Set();
  let list;
  try { list = JSON.parse(raw); } catch { return new Set(); }
  if (!Array.isArray(list)) return new Set();
  // Drop anything that is not a level this build knows about, so a rename or a removal cannot
  // resurrect a dead id into the UI.
  return new Set(list.filter((x) => typeof x === 'string' && CAMPAIGN.includes(x)));
}

/** Record `id` as completed. Returns the new Set whether or not the write survived. */
export function writeDone(store, done) {
  const list = CAMPAIGN.filter((x) => done.has(x));   // stable order, no junk
  try { if (store && store.setItem) store.setItem(KEY, JSON.stringify(list)); } catch { /* fine */ }
  return new Set(list);
}

/** Mark one level complete. Free ride is not a campaign step, so completing it is a no-op. */
export function markComplete(store, id) {
  const done = readDone(store);
  if (!CAMPAIGN.includes(id)) return done;
  done.add(id);
  return writeDone(store, done);
}

/**
 * Is `id` reached on the default path? Everything the player has finished, plus the one after
 * the furthest they have got, plus the first level. NOT a permission check - the picker starts
 * anything - this only decides what is shown as already reached.
 */
export function reached(id, done) {
  if (!CAMPAIGN.includes(id)) return true;          // free ride and anything unknown: always
  if (done.has(id)) return true;
  const i = CAMPAIGN.indexOf(id);
  if (i === 0) return true;                          // the first one is always reached
  // The frontier is one past the highest completed index, so finishing level 4 out of order
  // opens level 5 rather than stranding the player back at 2.
  let furthest = -1;
  for (const d of done) furthest = Math.max(furthest, CAMPAIGN.indexOf(d));
  return i <= furthest + 1;
}

/** Where a returning player should be pointed: the first campaign level they have not done. */
export function resume(done) {
  for (const id of CAMPAIGN) if (!done.has(id)) return id;
  return null;                                        // all seven finished
}

/** done / total, for a one-line "3 of 7" in the picker. */
export function tally(done) {
  return { done: CAMPAIGN.filter((x) => done.has(x)).length, total: CAMPAIGN.length };
}
