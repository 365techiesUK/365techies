// src/ui/scores.js - PERSONAL BESTS AND A LOCAL TOP-10 (27 Sep 2026, the PIER SURF revamp's stage 3).
// The owner: "quite addictive ... some sort of scoring, maybe a high score". The audit found nothing
// was saved anywhere, so PLAY AGAIN had nothing to beat.
//
// PURE: the store is passed in (ui/progress-store.js hands over its one guarded localStorage), so this
// runs in node and cannot be the thing that breaks a private window. Every read of junk - no store, a
// store that throws, bad JSON, the wrong shape, an unknown key - is "no scores yet".
//
// One object under ONE versioned key (localStorage is shared with the whole 365techies.co.uk origin):
//   { v: 1, k: { '<level>@<surf size>@<run kind>': [ {s, w, m, b, d}, ... up to 10, best first ] } }
//   s  the run's score       w  waves counted     m  moves banked
//   b  the best ride's score d  the day (YYYY-MM-DD, handed in - no clock read here)
// A later retune of the scoring bumps SCORES_KEY, so old and new numbers are never mixed.
// Local only: no leaderboard, no network, nothing about the player is kept but these numbers.

export const SCORES_KEY = 'seafront.scores.v1';
const MAX = 10;        // runs kept per key
// keys kept: surf sizes (up to 8) x run kinds (2) x levels (3) = 48 - under 10 KB (it was 24, and REAL's
// tables were the ones evicted: the b53 review)
const MAX_KEYS = 64;

const fresh = () => ({ v: 1, k: {} });

/** The whole object, or a fresh one. Never throws. */
export function readScores(store) {
  try {
    const raw = store && typeof store.getItem === 'function' ? store.getItem(SCORES_KEY) : null;
    const o = raw ? JSON.parse(raw) : null;
    if (o && typeof o === 'object' && o.v === 1 && o.k && typeof o.k === 'object' && !Array.isArray(o.k)) return o;
  } catch { /* blocked, throwing or junk: no scores */ }
  return fresh();
}

const num = (v) => (Number.isFinite(v) ? v : 0);
function clean(list) {
  return Array.isArray(list) ? list.filter((e) => e && typeof e === 'object' && Number.isFinite(e.s)).slice(0, MAX) : [];
}

/** The top runs for a key, best first (at most 10). */
export function topOf(store, key) { return clean(readScores(store).k[key]); }

/** The best run for a key, or null. */
export function bestOf(store, key) { const t = topOf(store, key); return t.length ? t[0] : null; }

/**
 * Record a finished run. entry: { s, w, m, b, d }. Returns { rank (1-10, or null if it did not make
 * the table), isPB, prev (the best score before this run, or null), top (the table after) }.
 * A store that will not write still returns the right answer for this run.
 */
export function recordRun(store, key, entry) {
  const S = readScores(store);
  const top = clean(S.k[key]);
  const prev = top.length ? top[0].s : null;
  // Nothing scored is not a run to keep: no 0.00 personal best, no 0.00 in the table (the b53 review).
  if (!(num(entry.s) > 0)) return { rank: null, isPB: false, prev, top };
  const e = { s: Math.round(num(entry.s)), w: Math.round(num(entry.w)), m: Math.round(num(entry.m)), b: Math.round(num(entry.b)), d: String(entry.d || '').slice(0, 10) };
  top.push(e);
  // Best first; an equal score keeps the earlier run ahead (it got there first).
  top.sort((a, b) => b.s - a.s);
  const rank = top.indexOf(e) + 1;
  S.k[key] = top.slice(0, MAX);
  // Keep the object small: drop the keys with the lowest best scores beyond MAX_KEYS.
  const keys = Object.keys(S.k);
  if (keys.length > MAX_KEYS) {
    keys.sort((a, b) => ((clean(S.k[b])[0] || { s: 0 }).s - (clean(S.k[a])[0] || { s: 0 }).s));
    for (const k of keys.slice(MAX_KEYS)) if (k !== key) delete S.k[k];
  }
  try { if (store && typeof store.setItem === 'function') store.setItem(SCORES_KEY, JSON.stringify(S)); } catch { /* full or blocked: this run is still answered */ }
  return { rank: rank <= MAX ? rank : null, isPB: prev === null ? e.s > 0 : e.s > prev, prev, top: S.k[key] };
}

/** The key for a run: level, surf size (one decimal) and run kind ('waves3', 'heat'...). */
export function scoreKey(level, surf, kind) {
  return `${level}@${num(surf).toFixed(1)}@${kind || 'run'}`;
}

// ---- DAILY GOALS AND A STREAK (27 Sep 2026, the revamp's stage 6) ----------------------------------
// Three goals a day, the same three all day for everyone (picked from the LOCAL date, handed in by the
// level - no clock read here), from twelve. All done in a day extends the streak; a day missed starts
// it again. Nothing involves the pier, swimmers or dolphins. Stored by the level through progress-store
// pref() ('daily', 'streak') - junk or nothing there is a fresh day.
export const DAILY_GOALS = Object.freeze([
  { id: 'waves3', text: 'Ride 3 waves', n: 3 },
  { id: 'cutback', text: 'Land a CUTBACK', move: 'CUTBACK' },
  { id: 'bottom', text: 'Land a BOTTOM TURN', move: 'BOTTOM TURN' },
  { id: 'lip', text: 'Land an OFF THE LIP', move: 'OFF THE LIP' },
  { id: 'snap', text: 'Land a SNAP', move: 'SNAP' },
  { id: 'x3', text: 'Reach ×3 on one wave' },
  { id: 'kick', text: 'Kick out over the back' },
  { id: 'long', text: 'Ride one wave for 10 s' },
  { id: 'big', text: 'Score 300 on one wave' },
  { id: 'combo', text: 'Two different moves on one wave' },
  { id: 'ducks', text: '3 clean duck-dives', n: 3 },
  { id: 'heat8', text: 'A heat of 8.00 or more' },
]);

// FNV-1a, 32 bit.
function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** Today's three goals for a 'YYYY-MM-DD' day: the three with the lowest hash of day + id. */
export function dailyGoals(ymd) {
  return DAILY_GOALS.map((g) => ({ g, h: fnv(`${ymd}:${g.id}`) })).sort((a, b) => a.h - b.h).slice(0, 3).map((x) => x.g);
}

/** The day's progress, from what was stored (any junk, or another day's, is a fresh day). */
export function dailyState(raw, ymd) {
  const ids = dailyGoals(ymd).map((g) => g.id);
  if (raw && typeof raw === 'object' && raw.d === ymd && Array.isArray(raw.ids) && raw.ids.join() === ids.join()) {
    return { d: ymd, ids, done: Array.isArray(raw.done) ? raw.done.filter((x) => ids.includes(x)) : [], c: raw.c && typeof raw.c === 'object' ? { ...raw.c } : {} };
  }
  return { d: ymd, ids, done: [], c: {} };
}

/**
 * Something happened; returns the goals it completed (and marks them in `st`).
 * ev: { type: 'ride', ok, secs, score, mult, moves: [names], kick } | { type: 'duck_clean' } | { type: 'heat', total }
 */
export function dailyEvent(st, ev) {
  const out = [];
  const byId = Object.fromEntries(DAILY_GOALS.map((g) => [g.id, g]));
  const moves = ev.moves || [];
  for (const id of st.ids) {
    if (st.done.includes(id)) continue;
    const g = byId[id];
    let hit = false;
    if (ev.type === 'ride' && ev.ok) {
      if (id === 'waves3') { st.c.waves3 = (st.c.waves3 || 0) + 1; hit = st.c.waves3 >= g.n; }
      else if (g.move) hit = moves.includes(g.move);
      else if (id === 'x3') hit = ev.mult >= 3;
      else if (id === 'kick') hit = !!ev.kick;
      else if (id === 'long') hit = ev.secs >= 10;
      else if (id === 'big') hit = ev.score >= 300;
      else if (id === 'combo') hit = new Set(moves).size >= 2;
    } else if (ev.type === 'duck_clean' && id === 'ducks') { st.c.ducks = (st.c.ducks || 0) + 1; hit = st.c.ducks >= g.n; }
    else if (ev.type === 'heat' && id === 'heat8') hit = ev.total >= 8;
    if (hit) { st.done.push(id); out.push(g); }
  }
  return out;
}

/** The streak after today's three are all done: one more if yesterday's were, else 1. */
export function streakAfter(raw, ymd, yesterday) {
  const s = raw && typeof raw === 'object' && typeof raw.last === 'string' && Number.isFinite(raw.n) ? raw : { last: '', n: 0 };
  if (s.last === ymd) return { last: ymd, n: s.n };
  return { last: ymd, n: s.last === yesterday ? s.n + 1 : 1 };
}
/** The streak as it stands today: 0 if the last full day was before yesterday. */
export function streakNow(raw, ymd, yesterday) {
  if (!raw || typeof raw !== 'object' || !Number.isFinite(raw.n)) return 0;
  return raw.last === ymd || raw.last === yesterday ? raw.n : 0;
}

// ---- UNLOCKABLE BOARDS (27 Sep 2026, the revamp's stage 5) ------------------------------------------
// Four hulls (gl/surfers.js draws them); the foamie from the start, the others earned. Cosmetic only - but
// for one thing since 28 Sep 2026: the LONGBOARD walks (NOSE RIDING, surfboard.js BOARD.walk*; `does`):
// the physics is the same board whichever you ride, and nothing is ever locked out of play. Stored by
// the level through progress-store pref('boards') as { got: [ids], pick: id } - junk is a fresh start.
export const BOARDS = Object.freeze([
  { id: 'foamie', name: 'FOAMIE', need: null },
  { id: 'thruster', name: 'THRUSTER', need: 'Land a SNAP or an OFF THE LIP' },
  { id: 'fish', name: 'FISH', need: 'Reach ×3 on one wave' },
  { id: 'long', name: 'LONGBOARD', need: 'Win a heat medal', does: 'walk to the nose: HANG FIVE, HANG TEN' },
]);

/** The stored board state, cleaned: always has the foamie, and a pick that is one you have. */
export function boardState(raw) {
  const ids = BOARDS.map((b) => b.id);
  const got = raw && Array.isArray(raw.got) ? raw.got.filter((x) => ids.includes(x)) : [];
  if (!got.includes('foamie')) got.unshift('foamie');
  const pick = raw && got.includes(raw.pick) ? raw.pick : 'foamie';
  return { got: [...new Set(got)], pick };
}

/**
 * Something happened; returns the boards it unlocked (and adds them to st.got).
 * ev: { type: 'ride', ok, mult, moves: [names] } | { type: 'heat', medal }
 */
export function boardEvent(st, ev) {
  const out = [];
  const give = (id) => { if (!st.got.includes(id)) { st.got.push(id); out.push(BOARDS.find((b) => b.id === id)); } };
  if (ev.type === 'ride' && ev.ok) {
    const m = ev.moves || [];
    if (m.includes('SNAP') || m.includes('OFF THE LIP')) give('thruster');
    if (ev.mult >= 3) give('fish');
  } else if (ev.type === 'heat' && ev.medal) give('long');
  return out;
}
