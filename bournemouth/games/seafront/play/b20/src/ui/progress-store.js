// src/ui/progress-store.js — the ONE place that touches localStorage for progression.
//
// ui/progress.js next door holds the rules and is deliberately pure so it can be tested in
// node. This file is the thin, impure half: it owns the browser storage and nothing else, so
// there is exactly one `localStorage` in the tree to reason about and exactly one place that
// has to be defensive about it.
//
// ⚠️ EVERY ACCESS IS WRAPPED. localStorage is not merely "sometimes empty":
//   * a private window throws on the first getItem, not on write;
//   * a browser with site data blocked throws on access to the PROPERTY itself, so even
//     `typeof localStorage` has to be inside the try;
//   * a full quota throws on write while reads keep working.
// A game that cannot be played because a progress save failed would be a far worse bug than
// having no progression at all, so every path here degrades to "nothing completed".

import { markComplete, readDone, nextAfter, reached, resume, tally, TITLES, CAMPAIGN } from './progress.js';

function store() {
  try {
    // The property access is inside the try on purpose - see the note above.
    const s = globalThis.localStorage;
    if (s && typeof s.getItem === 'function') return s;
  } catch { /* blocked: fall through */ }
  return null;
}

/** Levels finished, as a Set. Never throws; empty when storage is unavailable. */
export function done() { return readDone(store()); }

/**
 * Record a finished level. `won` is what the MODE decides, because the modes do not agree on
 * what finishing means and pretending they do would be wrong:
 *   raid / pirate / harbour mouth  outcome === 'saved'   - the pier or the mouth held
 *   smuggling run                  outcome === 'held'    - the coast held
 *   rescue / stunt / trip back     no fail state at all  - finishing the run IS completing it
 * Passing won=false records nothing, so a lost raid does not open the next level.
 */
export function complete(id, won) {
  if (!won) return done();
  return markComplete(store(), id);
}

/** The level after `id`, or null at the end of the campaign. */
export function next(id) { return nextAfter(id); }

/** Display name for a level id, for the NEXT button. */
export function title(id) { return TITLES[id] || String(id || '').toUpperCase(); }

/** Is this level on the default path yet? Not a lock - the picker starts anything. */
export function isReached(id) { return reached(id, done()); }

/** The first unfinished campaign level, or null when all seven are done. */
export function nextUnfinished() { return resume(done()); }

/** { done, total } for a "3 of 7" line. */
export function progress() { return tally(done()); }

export { CAMPAIGN };
