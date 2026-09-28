// HAPTICS for PIER SURF (27 Sep 2026, stage 3). A buzz in the hand for the moments that matter,
// on the two kinds of device that can give one:
//
//   * A PHONE - navigator.vibrate(pattern). Android Chrome has it. iOS Safari has no vibrate at all,
//     so there this is a silent no-op, which is the only honest thing a web page can do on an
//     iPhone. Only on a touch device: desktop Chrome also has vibrate() and nothing to shake.
//   * A GAMEPAD - the pad's vibrationActuator.playEffect('dual-rumble', ...). The pad is found the
//     way src/input.js _pad() finds the one it reads (lowest-index 'standard' mapping), so it is
//     the pad in the player's hands; input.js itself is not touched.
//
// The level calls buzz(kind) and owns the SET toggle; this file owns the patterns, the setting and
// every refusal. The kinds and their vibrate() patterns (ms on, ms off, ms on...):
//   popup [18]  move [10]  ride_mult [25,40,25]  wave [30,60,30,60,60]  wipe [80]
//   washed [40,30,40]  duck_clean [12]  ready [8] (the rising edge of 'POP UP ready')
//
// THE SETTING. On by default, persisted under 'seafront.haptics.v1' ('1' / '0'). localStorage
// throws in a private window, in a sandboxed frame and when the disk is full, so it is only ever
// touched inside store(), which returns null instead of throwing, and the in-memory value still
// holds for the session when the write fails. ALWAYS OFF - whatever the setting says, and without
// writing it - under ?clean=1 or ?cal= (the judged renders: read from location.search once, at
// load) and while the film harness runs (globalThis.__film, read at each call because the harness
// sets it after the page has loaded).
//
// Nothing here throws out of buzz(), setHaptics() or hapticsOn(). No Math.random, no timers except
// the pad's later pulses (a dual-rumble is one pulse; a pattern is several).

export const HAPTIC_PATTERNS = Object.freeze({
  popup: Object.freeze([18]),
  move: Object.freeze([10]),
  ride_mult: Object.freeze([25, 40, 25]),
  wave: Object.freeze([30, 60, 30, 60, 60]),
  wipe: Object.freeze([80]),
  washed: Object.freeze([40, 30, 40]),
  duck_clean: Object.freeze([12]),
  ready: Object.freeze([8]),
});

// A pad's motors: [strongMagnitude, weakMagnitude] per kind. The strong motor is the heavy low
// one, kept for the falls; the light things are weak-motor only.
const PAD_MAG = Object.freeze({
  popup: [0.25, 0.6], move: [0, 0.4], ride_mult: [0.3, 0.7], wave: [0.5, 0.9],
  wipe: [0.9, 0.5], washed: [0.7, 0.4], duck_clean: [0, 0.35], ready: [0, 0.3],
});
// A rumble motor needs this long to spin up at all; an 8 ms pulse on a pad is nothing.
const PAD_MIN_MS = 40;
// 'ready' is a rising EDGE the level computes from a verdict that can flicker frame to frame at the
// threshold; a flickering edge would be a buzz-storm in the hand, so it may buzz once a second.
const GAP_MS = Object.freeze({ ready: 1000 });
const KEY = 'seafront.haptics.v1';

let PINNED = false;                 // ?clean=1 / ?cal=: the renders never buzz
try {
  const q = new URLSearchParams(typeof location !== 'undefined' && location ? location.search : '');
  PINNED = q.has('cal') || q.get('clean') === '1';
} catch { PINNED = false; }

let pref = null;                    // the player's setting; null until first read
let gen = 0;                        // a new buzz cancels the pad pulses an older one still has queued
const last = {};
const counts = {};

const filming = () => { try { return !!globalThis.__film; } catch { return false; } };
const now = () => { try { return globalThis.performance.now(); } catch { return Date.now(); } };

// The one place localStorage is touched. store() reads, store(v) writes; either returns null on
// any failure rather than throwing.
function store(val) {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    if (val === undefined) return ls.getItem(KEY);
    ls.setItem(KEY, val);
    return val;
  } catch { return null; }
}

export function hapticsOn() {
  if (PINNED || filming()) return false;
  if (pref === null) pref = store() !== '0';
  return pref;
}

// Returns what is now in effect (false under ?clean / ?cal / the film whatever was asked).
export function setHaptics(on) {
  try {
    if (PINNED || filming()) return false;
    pref = !!on;
    store(pref ? '1' : '0');
    if (!pref) stopAll();
    return pref;
  } catch { return false; }
}

// kind: one of HAPTIC_PATTERNS. True if a phone or a pad was asked to buzz.
export function buzz(kind) {
  try {
    const pat = Object.prototype.hasOwnProperty.call(HAPTIC_PATTERNS, kind) ? HAPTIC_PATTERNS[kind] : null;
    if (!pat || !hapticsOn()) return false;
    const gap = GAP_MS[kind] || 0, t = now();
    if (gap && last[kind] !== undefined && t - last[kind] < gap) return false;
    last[kind] = t;
    const a = phone(pat), b = pad(kind, pat);
    if (a || b) counts[kind] = (counts[kind] || 0) + 1;
    return a || b;
  } catch { return false; }
}

// For a headless check: what is in effect and how many of each kind reached a device.
export function hapticsDebug() {
  return { on: hapticsOn(), pinned: PINNED, film: filming(), counts: { ...counts } };
}

// The navigator, if this is a touch device that has vibrate() and may use it now; else null.
function vibrator() {
  const nav = globalThis.navigator;
  if (!nav || typeof nav.vibrate !== 'function') return null;        // iOS: no vibrate, no buzz
  let touch = (nav.maxTouchPoints | 0) > 0;
  if (!touch) { try { touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches; } catch { touch = false; } }
  if (!touch) return null;
  // Chrome refuses vibrate() before the first tap and logs an [Intervention] for every refusal.
  const ua = nav.userActivation;
  if (ua && ua.hasBeenActive === false) return null;
  return nav;
}

function phone(pat) {
  const nav = vibrator();
  if (!nav) return false;
  try { return nav.vibrate(pat.slice()) !== false; } catch { return false; }
}

// The pad input.js reads: the lowest-index pad with the 'standard' mapping.
function activePad() {
  const nav = globalThis.navigator;
  if (!nav || typeof nav.getGamepads !== 'function') return null;
  let pads;
  try { pads = nav.getGamepads(); } catch { return null; }
  for (const g of pads || []) if (g && g.mapping === 'standard') return g;
  return null;
}

function pad(kind, pat) {
  const g = activePad();
  const act = g && g.vibrationActuator;
  if (!act || typeof act.playEffect !== 'function') return false;
  // Newer Chrome lists what the actuator can do; an older one only has the call.
  if (Array.isArray(act.effects) && !act.effects.includes('dual-rumble')) return false;
  const [strongMagnitude, weakMagnitude] = PAD_MAG[kind];
  const mine = ++gen;
  const play = (ms) => {
    if (mine !== gen) return;
    try {
      const p = act.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude, weakMagnitude });
      if (p && typeof p.catch === 'function') p.catch(() => { /* preempted or unplugged: fine */ });
    } catch { /* a pad that went away mid-pattern */ }
  };
  // The pattern's on-segments, each at least PAD_MIN_MS, with the pattern's own gaps between.
  let at = 0;
  for (let i = 0; i < pat.length; i += 2) {
    const ms = Math.max(PAD_MIN_MS, pat[i]);
    if (at === 0) play(ms);
    else {
      const st = globalThis.setTimeout;
      if (typeof st === 'function') st(() => play(ms), at);
    }
    at += ms + (pat[i + 1] || 0);
  }
  return true;
}

// Switched off: stop a phone mid-pattern and let queued pad pulses lapse.
function stopAll() {
  gen++;
  try { const nav = vibrator(); if (nav) nav.vibrate(0); } catch { /* fine */ }
}
