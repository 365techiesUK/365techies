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
import { track } from './analytics.js';
import { recordRun, bestOf as bestIn, topOf as topIn } from './scores.js';

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
export function complete(id, won, extra) {
  // Every level's end passes through here, won or lost, so this is where it is counted. `extra`
  // (27 Sep 2026, the PIER SURF revamp): a level may add its score and run count, so the analytics can
  // say whether people play again - anonymous numbers only (analytics.js is consent-gated, live only).
  track('level_end', { level: id, result: won ? 'won' : 'lost', ...(extra || {}) });
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

// ---- PERSONAL BESTS (ui/scores.js, 27 Sep 2026): through the same guarded store as everything here.
/** Record a finished run: { rank, isPB, prev, top }. Never throws. */
export function record(key, entry) { return recordRun(store(), key, entry); }
/** Whether anything can be kept here at all: a store that exists AND reads without throwing (Safari's
 * "block all cookies" throws on access). No store: the level keeps no records, so it never calls every
 * run a NEW PERSONAL BEST (the b53 review). */
export function canStore() {
  const s = store();
  if (!s) return false;
  try { s.getItem('seafront.probe'); return true; } catch { return false; }
}

// A KEPT BLOB (27 Sep 2026, stage 6: PIER SURF's best-ever ride, ~50 KB a clip) under its OWN key, so
// the prefs and the scores never parse it. blob(key) -> the parsed object or null; blob(key, v) keeps
// it (null removes it) and returns false if the store refused it (full, blocked). Never throws.
export function blob(key, val) {
  const s = store();
  if (!s) return val === undefined ? null : false;
  try {
    if (val === undefined) { const r = s.getItem(key); return r ? JSON.parse(r) : null; }
    if (val === null) { s.removeItem(key); return true; }
    s.setItem(key, JSON.stringify(val)); return true;
  } catch { return val === undefined ? null : false; }
}
// A SMALL REMEMBERED CHOICE (27 Sep 2026, stage 3: PIER SURF's EASY / NORMAL / REAL), in the same
// guarded store. pref(key) reads it (undefined when unset or no store); pref(key, v) keeps it. Never throws.
const PREFS = 'seafront.prefs.v1';
export function pref(key, val) {
  const s = store();
  let o = {};
  try { o = JSON.parse((s && s.getItem(PREFS)) || '{}') || {}; } catch { o = {}; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) o = {};   // junk (a number, a list) is nothing kept
  if (val === undefined) return o[key];
  o[key] = val;
  try { if (s) s.setItem(PREFS, JSON.stringify(o)); } catch { /* full or blocked: this visit only */ }
  return val;
}
/** The best run for a key, or null. Never throws. */
export function best(key) { return bestIn(store(), key); }
/** The top runs for a key, best first. Never throws. */
export function top(key) { return topIn(store(), key); }
