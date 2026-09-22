// Shell: canvas, fixed-timestep loop, cameras, HUD, keys, record/replay.
//
// §5: restart is a state reset, never a scene reload. There is no loading step,
// no navigation and no click-to-continue anywhere in this file, and R prints
// what the reset actually cost.

import { cloneDefaults, DEG } from './params.js';
import { Sim, FIXED_DT } from './sim.js';
import { SEA_PRESETS, DEFAULT_PRESET } from './sea-state.js';
import { InputHub, Recorder, ReplayInput, TOUCH, TOUCH_DEFAULTS, touchSettings, setTouchSetting, stripRect } from './input.js';
import { Renderer } from './render.js';
// >>> CAMDYN
import { View3D, CAM_LEVELS } from './view3d.js';
// <<< CAMDYN
import { Telemetry } from './telemetry.js';
import { TuningPanel } from './tuning.js';
import { runSelfTest } from './selftest.js';
import { SeaRenderer } from './gl/renderer.js';
import { OVERCAST } from './gl/craft.js';
import { COAST } from './gl/coast.js';
// >>> RESCUE
import { initRescue } from './rescue/rescue-mode.js';
// <<< RESCUE
// >>> OVERBOARD
import { initOverboard } from './overboard/mode.js';
// <<< OVERBOARD
// >>> RAID
import { initRaid } from './raid/raid-mode.js';
import { createPerf } from './perf.js';
// <<< RAID
// >>> CRAFT
import { CraftHub } from './boats/hub.js';
// <<< CRAFT
// >>> JUICE
import { Juice, craftSample, setJuice } from './ui/juice.js';
// <<< JUICE
// >>> SMUGGLE
// THE DORSET SMUGGLING RUN (tmp-tr170), the sixth level. Everything of it lives in
// src/raid/smuggle.js and src/gl/smuggle-boats.js; importing it builds no mesh, no DOM and
// no audio, and while the mode is off nothing of it ticks or draws.
import { initSmuggle } from './raid/smuggle.js';
// <<< SMUGGLE
// >>> STUNT
// THE STUNT STAGE (tmp-tr173), the seventh level. Everything of it lives in src/stunt/ and
// src/gl/stunt-arena.js; importing it builds no mesh, no DOM and no audio, and while the mode
// is off nothing of it ticks or draws.
import { initStunt } from './stunt/stunt.js';
// <<< STUNT
// tr154: the level picker's rules. Pure - no DOM, no location - so the URL every choice
// produces is assertable in a node harness (tmp-tr154/test-levels.mjs).
import { levelURL, needsReload } from './ui/levels.js';
// >>> STARTPICK
// A SECOND import from the same module rather than an edit to the line above. The line above
// is tr154's and `git merge-file` charges for a touched line where an inserted one is free;
// two import statements naming one module are legal and the module is still evaluated once.
import { asksWhichLevel, LEVELS } from './ui/levels.js';
// <<< STARTPICK
// >>> WIREMUSIC
// THE SCORE (tr184, src/audio/) - the generative bed and the pulse, per level. The module was
// built, bounced and measured and then left UNWIRED: until this import nothing the game loads
// touched src/audio/ at all. This fence is the wiring, and it also carries the SOUND and MUSIC
// controls, which were overdue on their own account - see the block under the camera dial.
import { Score, resolveMusicMode, storeMusicMode, MUSIC_MODES } from './audio/score.js';
// A THIRD import of ui/levels.js, following STARTPICK's second one and for its reason: an
// inserted line is free to `git merge-file` where a touched one is not, and the module is still
// evaluated once. This fence needs the level TABLE because it may not write two of the seven
// level names - see musicNow() below.
import { LEVELS as WM_LEVELS } from './ui/levels.js';
// <<< WIREMUSIC

const $ = (s) => document.querySelector(s);

const view = $('#view');
const charts = $('#charts');
const params = cloneDefaults();
const sim = new Sim(params);
const live = new InputHub(view);
const renderer = new Renderer(view);
const view3d = new View3D(view);
const telemetry = new Telemetry(charts);
const recorder = new Recorder();
// >>> CAMDYN
// THE CALIBRATION GATE for the chase-camera dynamics in view3d.js (speed-reactive field of
// view, chase spring, impact shake, landing punch). The 19 judged views are rendered through
// ?cal= and they are this project's measuring instrument, so none of that may reach them.
//
// Set HERE, at module scope, because applyCalibrationURL() runs at the bottom of this file and
// a gate that arrived after the first frame would be no gate at all. frame() re-asserts it,
// which covers a calibration camera imposed later from the console.
view3d.calInert = new URLSearchParams(location.search).has('cal');

// CAMERA MOTION, the player's own dial. Three levels, in view3d.js's CAM_LEVELS:
// full (what the owner asked for), reduced (0.45 of it - almost exactly the strength
// that shipped before this round) and off (the static camera this project used to have).
//
// Precedence, strongest first:
//   ?cam=full|reduced|off   an explicit address, which is also how a capture or a bug
//                           report pins the setting without touching anyone's storage
//   the player's own choice, remembered in localStorage
//   prefers-reduced-motion  -> reduced, not off. Reduced is the strength the owner rode
//                           and described as barely noticeable, so it is already below
//                           the threshold that prompted this work; off stays one tap away
//   otherwise               -> full
const CAM_KEY = 'efoil.cameraMotion';
const CAM_ORDER = Object.keys(CAM_LEVELS);
function readCameraMotion() {
  const q = new URLSearchParams(location.search).get('cam');
  if (q && q in CAM_LEVELS) return q;
  try {
    const s = localStorage.getItem(CAM_KEY);
    if (s && s in CAM_LEVELS) return s;
  } catch { /* private window, blocked storage: fall through to the default */ }
  const reduce = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduce ? 'reduced' : 'full';
}
function setCameraMotion(name, quiet) {
  const applied = view3d.setMotion(name);
  try { localStorage.setItem(CAM_KEY, applied); } catch { /* not fatal; the setting still applies */ }
  for (const seg of document.querySelectorAll('#tset .camseg')) {
    for (const b of seg.querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === applied);
  }
  if (!quiet) {
    toast(applied === 'off' ? 'camera motion: off — the still camera'
      : applied === 'reduced' ? 'camera motion: reduced'
      : 'camera motion: full');
  }
  return applied;
}
setCameraMotion(readCameraMotion(), true);
for (const seg of document.querySelectorAll('#tset .camseg')) {
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) setCameraMotion(b.dataset.v);
  });
}
// <<< CAMDYN
// >>> WIREMUSIC
// ---------------------------------------------------------------------------
// SOUND AND MUSIC - the player's own two dials, and an accessibility defect fixed on the way
//
// ⚠️ THE GAME HAD NO IN-PAGE SOUND CONTROL AT ALL. #tset carried throttle, fire, tilt, hand,
// buttons, camera and opacity and no audio row, and the only way to silence anything was
// ?sound=0 in the address bar. The engine starts on the first gesture and then runs
// continuously, so that is a WCAG 2.1 SC 1.4.2 (Level A) failure as the game stood - before a
// note of music was added (tmp-tr183/MUSIC-RESEARCH.md §7.1). A URL parameter is not a
// mechanism on the page.
//
// TWO DIALS AND NOT ONE. The Game Accessibility Guidelines put "separate volume controls or
// mutes for effects, speech and background/music" at Basic level, because hearing loss is not
// flat across frequency and auditory processing disorder can make simultaneous sounds
// impossible to separate. So SOUND is the master - engine, raid, rescue AND music - and MUSIC
// is the score on its own. Someone who wants the engine and not the score can have exactly
// that, which is the case the guideline exists for.
//
// Both ladders are the camera dial's ladder above, for the camera dial's reasons: an explicit
// URL override first, so a capture or a bug report can pin the setting without touching
// anyone's storage; then the player's own remembered choice; then an accessibility default;
// then the product default. MUSIC's ladder is resolved by score.js itself (?music=, then
// localStorage efoil.music, then prefers-reduced-motion -> BED, then FULL) and is not
// rewritten here, so there is one copy of it and it is the copy the suite tests.
//
// ⚠️ THE ROWS ARE NOT CALLED `seg`, AND THAT IS THE POINT. index.html's control rows use
// `.seg`, and this file has a generic `querySelectorAll('#tset .seg')` loop that routes every
// click into setTouchSetting() and every sync out of touchSettings. A sound row inside that
// selector would quietly write a `sound` key into the TOUCH-settings store - which is exactly
// the trap the camera row hit and side-stepped with its own `camseg` class. These two rows use
// `sndseg` for the same reason, and suites/test-wire.mjs asserts that neither `sound` nor
// `music` can reach touchSettings, rather than trusting the class name to stay right.
// ---------------------------------------------------------------------------
const SOUND_KEY = 'efoil.sound';
const WM_Q = new URLSearchParams(location.search);
// The four flags the whole audio subsystem already refuses to start under (engine-audio.js:82,
// raid-audio.js:47, score.js's constructor). An address that carries one of them PINS the
// master off for that page load and the dial says so rather than pretending to disagree.
const SOUND_PINNED = WM_Q.get('sound') === '0' || WM_Q.has('mute')
  || WM_Q.has('cal') || WM_Q.get('clean') === '1';
const wmClamp01 = (x) => (typeof x === 'number' && isFinite(x) ? (x < 0 ? 0 : x > 1 ? 1 : x) : 0);
// Every level's row id, and the handle that level publishes on `window` for the console and the
// headless tests. The convention is the modules' own: row id `rescue` -> window.efoilRescue.
// Rows that are served by another row's module simply have no handle and are skipped.
const WM_IDS = WM_LEVELS.map((l) => l.id);
const wmMod = (id) => window['efoil' + id.charAt(0).toUpperCase() + id.slice(1)];

function readSound() {
  if (SOUND_PINNED) return false;
  if (WM_Q.get('sound') === '1') return true;
  try {
    const s = localStorage.getItem(SOUND_KEY);
    if (s === 'off') return false;
    if (s === 'on') return true;
  } catch { /* private window, blocked storage: fall through to the default */ }
  return true;
}

let soundOn = readSound();
let musicMode = resolveMusicMode(WM_Q);
// new Score() builds NOTHING - no AudioContext, no nodes - beyond three gesture listeners, and
// with mode 'off' it does not even build those. Under ?cal= / ?clean=1 / ?sound=0 / ?mute its
// own constructor disables it outright, which is the invariant the 25 judged renders rest on.
let score = new Score({ mode: musicMode });
let scoreLevel = null;     // the preset the score is on, or null while it is stopped
let wmCrept = false;       // is the night run's silence currently in force
let wmAboard = 0;          // the rescue's sled count, watched for the `settle` gesture
let wmSettles = 0;         // how many settles the frame loop has actually spent, for a suite

// ---------------------------------------------------------------------------
// ⚠️ THE iPHONE RINGER SWITCH - READ THIS BEFORE DEBUGGING "NO SOUND ON iOS"
//
// NOT FIXED HERE, ON PURPOSE, AND THIS IS THE COMMENT THAT SAYS WHY. It is left beside the
// master dial because this is where somebody chasing "an iPhone makes no sound" will arrive.
//
// THE CLAIM (tmp-tr183/MUSIC-RESEARCH.md §7.3, NOT tested by anyone on this project): on iOS, a
// page whose only output is Web Audio nodes is routed to the "ambient" audio session, which the
// hardware ring/silent switch silences - with no error, no exception and no state change. An
// HTMLMediaElement is not. If that is true on the target handsets, then on every iPhone with
// the switch down this game is silent in its entirety - engine, raid, rescue and music - and
// the player has no way to know why. This game locks landscape on touch and is aimed at phones,
// so it is the highest-value audio test available and it needs one iPhone and two minutes.
//
// WHAT I LOOKED FOR: a defensive mitigation that needs no audio asset, because this project
// ships none and adding the first one to fix an untested claim would be the wrong trade.
//
// ONE EXISTS, AND IT IS STILL NOT BUILT:
//
//     if ('audioSession' in navigator) navigator.audioSession.type = 'playback';
//
// The W3C Audio Session API (Editor's Draft; implemented in Safari 16.4+ and nowhere else).
// Feature-detected, zero bytes of asset, a no-op in every other browser. Three reasons it is
// a decision and not a default, and all three belong to the owner and not to this fence:
//   1. `playback` means "this page's audio is media", so it IGNORES the mute switch AND takes
//      the audio session from whatever the player was listening to. Turning it on makes a phone
//      that was deliberately silenced start making noise, and stops their music to do it.
//   2. It does not reach older iOS at all. There the only known fix is starting a short silent
//      looping HTMLMediaElement inside the unlock gesture, and that needs audio bytes - a file
//      or a base64 data URI, which is the same thing in a different coat.
//   3. NOBODY HAS CONFIRMED THE PREMISE. Shipping a workaround for a problem this project has
//      never observed, which changes behaviour for every iOS player, is not defensive.
// Test the premise on a real handset first. If it holds, the one line above is the whole fix
// for modern iOS and it belongs right here, inside the first-gesture path.
// ---------------------------------------------------------------------------

// THE THREE AUDIO OWNERS, muted through the handle each one actually offers. There is no shared
// bus in this tree: engine-audio.js, raid-audio.js and rescue-mode.js each build their own
// AudioContext (three construction sites outside src/audio/, and that is the whole list), so a
// master mute has to reach all three. It is RE-ASSERTED from frame() because two of them can
// come back on their own - the engine's visibilitychange handler resumes its context, and
// RaidAudio resumes on every gesture.
function applySound() {
  const on = soundOn;
  // 1. THE ENGINE. setCraft(null) is EngineAudio's own public "no engine": it tears the voices
  // down and suspends the context. It is the right lever rather than a plain ac.suspend()
  // because that handler only resumes when `kind && v`, so a mute made this way survives the
  // player tabbing away and back, which a suspend would not.
  const ea = craftHub && craftHub.audio;
  if (ea) {
    const want = on ? (craftHub.active ? craftHub.kind : null) : null;
    if (ea.kind !== want) ea.setCraft(want);
  }
  // 2. THE RAID AND THE SMUGGLING RUN, which share one RaidAudio class. All 35 of its cues are
  // connected to `out`, and `out` is the only thing connected to the destination, so that one
  // gain is the whole level. ⚠️ The value it is put BACK to is read off the node the first time
  // it is seen, never written here: raid-audio.js owns that number and a second copy of it in
  // this file is exactly the kind of copy that drifts. test-wire.mjs asserts the routing.
  // Found by walking the level table rather than by naming the two levels that own one today,
  // so a level that grows an `audio` later is muted by this without an edit.
  for (const id of WM_IDS) {
    const m = wmMod(id), a = m && m.audio;
    if (!a || !a.out) continue;
    if (a.wmLevel === undefined) a.wmLevel = a.out.gain.value;
    const v = on ? a.wmLevel : 0;
    if (a.out.gain.value !== v) a.out.gain.value = v;
  }
  // 3. THE RESCUE'S BLIPS, which own a fourth context and had no gate of any kind until this
  // round - see the WIREMUSIC fence in src/rescue/rescue-mode.js.
  const rq = wmMod('rescue');
  if (rq && rq.setSound) rq.setSound(on);
}

// THE MUSIC. `setMode('off')` is deliberately NOT used for a dial the player can turn back up:
// it is one-way - it sets the module's own `enabled` false and there is no way back without a
// new Score. stop() is the reversible equivalent and is the same silence, because it stops
// every oscillator and empties the voice list.
function applyMusic() {
  const want = soundOn ? musicMode : 'off';
  if (want === 'off') {
    if (score.ready) score.stop();
    scoreLevel = null;
    wmCrept = false;
    return;
  }
  if (score.mode === 'off' && !score.enabled) {
    // A page that LOADED with ?music=off (or a stored off) built no context and no listeners at
    // all, which is the module's documented promise. Turning it on now needs a fresh Score.
    // start() before the first gesture is a supported call and is honoured as soon as there is
    // one, so the music arrives on the next tap rather than on this click.
    score = new Score({ mode: want });
  } else {
    score.setMode(want);
  }
}

function setSound(on, quiet) {
  if (SOUND_PINNED) {
    if (!quiet) toast('sound is pinned off by this address (?sound=0 / ?mute)');
    syncSoundUI();
    return soundOn;
  }
  soundOn = !!on;
  try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch { /* not fatal; it still applies */ }
  applySound();
  applyMusic();
  syncSoundUI();
  if (!quiet) toast(soundOn ? 'sound: on' : 'sound: off — all of it, engine included');
  return soundOn;
}

function setMusic(m, quiet) {
  if (!MUSIC_MODES.includes(m)) return musicMode;
  musicMode = m;
  storeMusicMode(m);
  applyMusic();
  syncSoundUI();
  if (!quiet) {
    toast(m === 'off' ? 'music: off — the engine stays'
      : m === 'bed' ? 'music: bed only — no pulse'
      : 'music: full');
  }
  return m;
}

function syncSoundUI() {
  for (const seg of document.querySelectorAll('#tset .sndseg')) {
    const cur = seg.dataset.k === 'sound' ? (soundOn ? 'on' : 'off') : musicMode;
    for (const b of seg.querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === cur);
  }
}

for (const seg of document.querySelectorAll('#tset .sndseg')) {
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (seg.dataset.k === 'sound') setSound(b.dataset.v === 'on');
    else setMusic(b.dataset.v);
  });
}
// A SECOND listener on the SET button rather than an edit to syncSettingsUI(), which belongs to
// the touch-settings loop and must not learn about two settings that are not touch settings.
// It syncs unconditionally: this listener runs BEFORE the one that toggles the sheet open, so
// asking whether the sheet is open here would read the answer from before the click.
// DEFAULTS (#btn-set-def) deliberately does not reach these two. It restores the CONTROL
// defaults, and silencing a game somebody asked to be silent is not a default to restore.
{
  const bs = $('#btn-set');
  if (bs) bs.addEventListener('click', () => syncSoundUI());
}
// The keyboard route. #tset is the touch sheet and the cold row that opens it is
// `display: none` off a touch device, so without keys a desktop player would have no in-page
// control at all and the 1.4.2 defect would only be half fixed. Same argument, and the same
// shape, as J for the camera dial. O and Shift+O are simply what was free: every other letter
// in this game is a camera, a craft, a weapon, a mode or an instrument.
addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  if (e.code !== 'KeyO') return;
  if (e.shiftKey) setSound(!soundOn);
  else setMusic(MUSIC_MODES[(MUSIC_MODES.indexOf(musicMode) + 1) % MUSIC_MODES.length]);
});

// WHICH LEVEL IS RUNNING - asked of the LEVEL TABLE (ui/levels.js) and of the handle each level
// publishes for the console and the headless tests, so this reads the game rather than the URL
// and cannot disagree with it.
//
// ⚠️ IT IS ASKED OF THE TABLE AND NOT OF A LIST WRITTEN HERE, AND THAT IS THE MERGE RULE
// RATHER THAN TIDINESS. In main.js a fence owns its own level's name and no other line may
// spend it. The suites of the last two levels added sweep this whole file for exactly that,
// and both of them caught this fence on its first draft. So those two levels are SPELLED
// BY THE TABLE - each one's row id is also its preset name in score.js - and they are told
// apart below by the mechanic the music reads, which is the thing this code wants anyway.
// STARTPICK's MutationObserver takes its marks from the same table for the same reason.
function musicNow() {
  // Backwards through the table: every mode stands the others down as it enters, and the rows
  // added last are the ones that do the standing down.
  for (let i = WM_IDS.length - 1; i >= 0; i--) {
    const id = WM_IDS[i], m = wmMod(id);
    if (!m || !m.active) continue;
    if (id === 'raid') {
      // ONE MODULE SERVES THREE OF THE SEVEN ROWS. The Harbour Mouth is this same module with a
      // line instead of a pier (raid.js:69), so the objective is put to the GAME's own `level`
      // and not to ?arena=, and the faction is put to the module.
      const preset = (m.game && m.game.level === 'gate') ? 'arena'
        : m.foe === 'pirate' ? 'raid-pirate' : 'raid-norse';
      return { preset, kind: 'raid', m };
    }
    if (id === 'rescue') return { preset: 'rescue', kind: 'rescue', m };
    // >>> OVERBOARD
    // THE ONE ROW THAT DOES NOT SPELL ITS OWN PRESET. The owner asked for this level to carry
    // the rescue bed rather than one of its own ("add it to the level menu with the rescue
    // music"), so `preset: id` would ask score.js for a preset that does not exist. It takes
    // the rescue preset AND the rescue `kind`, because `kind` is what musicState() switches on
    // to decide which game variable drives the pulse - and the variable this level wants is the
    // one the rescue reads: people still to bring in. Sharing the bed but not the kind would
    // give it the right notes at the wrong times.
    //
    // ⚠️ This is the only line outside the four OVERBOARD fences below that names this level,
    // and it is inside a fence of its own for that reason. The preset count is UNCHANGED at
    // seven: this row adds a level, not a bed, which is why test-wire's preset assertion still
    // reads seven while its level assertion reads eight.
    if (id === 'overboard') return { preset: 'rescue', kind: 'rescue', m };
    // <<< OVERBOARD
    return { preset: id, kind: 'other', m };
  }
  // FREE RIDE IS SILENCE, and score.js treats that as a real level and not as an omission:
  // open water with no clock, no threat and no goal has nothing for the music to adapt to, and
  // the one study that measured it found static music scored BELOW silence on reported tension.
  // The engine is the music here.
  return { preset: 'free', kind: 'free', m: null };
}

// The tuning field that IS the night run's mechanic: a radius you have to be inside, and slow,
// to drag for a crop on the bottom. No other level has one, and asking for it is how the two
// table-spelled rows are told apart without writing either name.
const wmHasCreep = (g) => !!(g && g.T && typeof g.T.creepR === 'number');

// ⚠️ THE PULSE IS A GAME VARIABLE AND NOT A TEMPO. Every number below is the level's own: the
// wave the raid is actually on, the seconds actually left on the run clock, the metres actually
// between the boat and the nearest lugger. Nothing here keeps a clock, and score.js schedules
// each pulse from the value at the moment the one before it fired, so a change in the game
// changes the very next gap and the music cannot drift out of step with the level.
// ⚠️ `live` is not decoration. The rescue's `settle` is a ONE-SHOT the module consumes, and this
// function is also reachable from window.efoilScore.state, which a console or a bounce driver
// reads. A getter that consumed a gameplay event would mean the act of looking at the state
// changed it - the reader would take the settle and the score would never get it. Only the frame
// loop passes `live`, so only the frame loop advances the high-water mark; every other caller
// gets a true report of this instant and consumes nothing.
function musicState(now, live) {
  const g = now.m && now.m.game;
  if (!g) return {};
  if (now.kind === 'raid') {
    // THE PULSE IS THE WAVE NUMBER. finalWave is 6 by default, so this is the (wave-1)/5 the
    // module documents - read off the game, so that ?raidwave= cannot make it lie.
    const pulse = wmClamp01((g.wave - 1) / Math.max(1, g.finalWave - 1));
    // The siege's own pressure: how much of the pier is gone, or at the Harbour Mouth how much
    // of the line has been lost. Both are already computed by the rules on every tick.
    const frac = now.preset === 'arena'
      ? (typeof g.gateFrac === 'number' ? g.gateFrac : 1)
      : (typeof g.pierFrac === 'number' ? g.pierFrac : 1);
    return { intensity: wmClamp01(1 - frac), pulse };
  }
  if (now.kind === 'rescue') {
    const chances0 = (g.T && g.T.chances) || 3;
    const st = {
      // Urgency without menace: the filter opens as the wave clock runs down. This preset has
      // no pulse at all - a ticking clock is menace, and nobody in this level is hostile.
      brightness: wmClamp01(1 - g.timer / Math.max(1, g.timerTotal)),
      // GOING BADLY THINS OUT rather than adding threat, which is the thing this level most
      // easily gets wrong. Chances lost is the real variable for "this is going badly".
      intensity: wmClamp01(g.chances / Math.max(1, chances0)),
    };
    // The "you have made things better" gesture, asked for once per pickup. The sled filling IS
    // the pickup, read from the game rather than from an event, so a dropped frame cannot lose
    // it and a drop-off - which empties the sled - cannot fire it.
    const ab = g.aboard ? g.aboard.length : 0;
    if (ab > wmAboard) { st.settle = true; if (live) wmSettles++; }
    if (live) wmAboard = ab;
    return st;
  }
  if (wmHasCreep(g)) {
    const p = g.player;
    if (!p) return {};
    let d = Infinity;
    for (const b of g.boats) {
      if (b.state === 'gone' || b.state === 'seized') continue;
      const q = Math.hypot(p.x - b.x, p.z - b.z);
      if (q < d) d = q;
    }
    // PROXIMITY, NOT THREAT: closing on a lugger opens the filter. 1 alongside, 0 at 600 m.
    // ⚠️ `pulse` is passed because it is the pulse-rate variable this level's interface names -
    // the distance to the nearest lugger - but NOTHING SOUNDS FROM IT: this preset ships
    // `pulse: null` (score-presets.js), on the research's instruction that a beat at night on a
    // revenue cutter is a genre signal from a different film. If that preset ever grows a
    // pulse, the variable driving it is already the right one and already real.
    const near = isFinite(d) ? wmClamp01(1 - d / 600) : 0;
    return { intensity: near, pulse: near };
  }
  // THE MUSIC IS THE TIMER: score.js steps density and brightness at 90/60/30/10 s remaining,
  // and the pulse tightens from 1.35 s to 1.05 s across the same run.
  // A future row with neither a creep radius nor a run clock lands here and gets `undefined`,
  // which score.js ignores field by field, so it would play its preset's own resting bed. That
  // is a plain bed and not a silent failure, but it is not tailored either - stated, not hidden.
  const total = (g.T && g.T.runSec) || 120;
  return { secondsLeft: g.left, pulse: wmClamp01(1 - g.left / Math.max(1, total)) };
}

// THE NIGHT RUN GOES SILENT WHILE THE PLAYER IS CREEPING. The condition is the one that level's
// own crop step uses - a crop still down and settled, inside the creep radius, with the boat
// under the creep speed - rather than its `creep` event, because that event fires once on the
// way in and says nothing at all about the way out.
function wmCreeping(g) {
  if (!wmHasCreep(g) || !g.player || !g.crops) return false;
  const T = g.T, p = g.player;
  if (p.speed > T.creepSpeedMax) return false;
  for (const c of g.crops) {
    if (c.done || c.sinkT < T.cropSinkSec) continue;
    if (Math.hypot(p.x - c.x, p.z - c.z) <= T.creepR) return true;
  }
  return false;
}

// ONCE A FRAME, from the same loop as everything else. Called from frame().
function scoreFrame(dt) {
  // Two of the three audio owners can turn themselves back on, so a master mute is a thing that
  // has to be held rather than set. This costs four property reads a frame and only while off.
  if (!soundOn) applySound();
  if (!score.ready || !soundOn || musicMode === 'off') return;
  const now = musicNow();
  if (now.preset !== scoreLevel) {
    // A level change made while the night run's silence was in force would otherwise leave the
    // next level's music faded out with nothing left to bring it back.
    if (wmCrept) { score.resume(); wmCrept = false; }
    // The sled watcher is per-run, not per-session: leaving the rescue and coming back resets
    // the sled to empty, and a stale high-water mark would swallow every settle until the sled
    // climbed past it again.
    wmAboard = 0;
    scoreLevel = now.preset;
    score.setLevel(now.preset);      // start()s the first time, crossfades after that
  }
  if (now.kind === 'free') return;   // silence, and there is no state for it to adapt to
  const g = now.m && now.m.game;
  if (wmHasCreep(g)) {
    // silence() / resume(), and NOT stop() and NOT the master dial: every cycle keeps running
    // underneath, so the music that comes back is at a place in its own cycles it has never
    // been before and there is nothing to click. That is what this level needs - searching is
    // a listening activity - and it is what the module's own silence bounce demonstrates.
    const c = wmCreeping(g);
    if (c !== wmCrept) { wmCrept = c; if (c) score.silence(); else score.resume(); }
  }
  score.update(musicState(now, true), dt);
}

// The console and headless-test handle, in the shape window.efoilRaid and the rest already use.
// tmp-tr186/wire/bounce-wire.mjs reads `state` off a real running level and renders the score
// from that trajectory, so what gets bounced is what the wiring actually sends.
window.efoilScore = {
  get score() { return score; },
  get level() { return scoreLevel; },
  get state() { const n = musicNow(); return n.kind === 'free' ? null : musicState(n, false); },
  get settles() { return wmSettles; },
  get creeping() { return wmCrept; },
  get sound() { return soundOn; },
  get music() { return musicMode; },
  get pinned() { return SOUND_PINNED; },
  setSound, setMusic, stats: () => score.stats(),
};

// ⚠️ applySound() is NOT called here. It reads craftHub, which is a `const` declared further
// down this file, and calling it at module scope would hit the temporal dead zone. frame()
// applies it on the first frame instead, which is still long before any gesture and so long
// before any of the three owners can have made a sound.
syncSoundUI();
// <<< WIREMUSIC

// The GL sea. If WebGL2 is missing or a shader fails to link we say so once and
// carry on with the canvas-2D views - the rig still has to be usable, and a
// black screen would be a worse failure than a plain one.
const glCanvas = $('#gl');
let seaGL = null;
try {
  seaGL = new SeaRenderer(glCanvas);
  if (!seaGL.ok) { console.warn('[gl]', seaGL.error); seaGL = null; }
} catch (e) {
  console.warn('[gl] renderer construction failed:', e.message);
  seaGL = null;
}
let useGL = !!seaGL;

// Frame-time meter: ?perf=1 or Y. Counts draw calls by wrapping the GL context,
// so it works without a renderer library to ask.
const perf = createPerf(document, seaGL && seaGL.gl ? seaGL.gl : (glCanvas.getContext('webgl2') || null), glCanvas);
globalThis.__perf = perf;

const isTouch = matchMedia('(pointer: coarse)').matches;
const isSmall = matchMedia('(max-width: 900px)').matches;

// Chase by default. The side view is the INSTRUMENT (§8's gate is meant to be
// judgeable on featureless grey water) and it stays one keypress away on C -
// but defaulting to it meant the entire WebGL scene loaded behind
// `display: none`, so the sea, the coast, the shadows and the textures were all
// invisible until you happened to press a key.
let camera = 'chase';          // 'side' | 'chase' | 'fpv'
let source = live;
let attract = null;   // demo-mode attract pilot; null outside demo, see ATTRACT MODE
let replaying = null;
let paused = false;
let showCharts = !(isTouch || isSmall);
let acc = 0;
let last = performance.now() / 1000;
let hudClock = 0;
let toastUntil = 0;
// >>> CRAFT
// Speedboat / jetski (src/boats/). With the eFoil selected - the default - every
// craftHub hook below returns at once and the eFoil path runs untouched.
const craftHub = new CraftHub({
  sim, view3d, seaGL, live, glCanvas, restart: (q) => restart(q),
  toast: (m) => toast(m), showHint: (h, ms) => showHint(h, ms),
  isDemo: () => !!attract && source === attract,
});
// <<< CRAFT
// >>> JUICE
// THE FEEL LAYER: airtime, the landing verdict, hit confirmation and a streak that decays.
// All of it is src/ui/juice.js; this file only samples the craft for it and asks it to paint.
//
// NOT CONSTRUCTED AT ALL under ?cal=. The surest way for an overlay never to reach a
// measurement render is for it not to exist, so on a calibration address it is built with no
// mount, which makes its constructor return before it creates a stylesheet or a single node.
// Two further gates back that up: juice.js carries its own `body.clean-render #jz-root
// { display: none }` rule like every other overlay here, and its tick() is called from inside
// frame()'s `!paused && !window.__calFrozen` block, so ?hold=1 freezes it with the sim.
//
// It samples the craft and writes nothing back, so the sim hash, the plant and every boat
// handle exactly as they did.
const juice = setJuice(new Juice({
  mount: new URLSearchParams(location.search).has('cal') ? null : ($('#stagewrap') || document.body),
}));
// <<< JUICE

renderer.mast = params.assist.mastLength;

// Sea state. The default is the real modal Poole Bay state (§4) - short, fast,
// small chop, the choice that makes a local say "that's Bournemouth".
//
// FLAT stays one keypress away and is not an afterthought: §8's kill gate is
// explicitly meant to be judged on featureless grey water, so that a pretty sea
// can never flatter a dull verb.
const SEA_NAMES = Object.keys(SEA_PRESETS);
let seaIndex = Math.max(0, SEA_NAMES.indexOf(DEFAULT_PRESET));

function setSea(i, quiet) {
  seaIndex = (i + SEA_NAMES.length) % SEA_NAMES.length;
  const name = SEA_NAMES[seaIndex];
  sim.setSeaState(name === 'flat' ? null : name);
  const p = SEA_PRESETS[name];
  if (!quiet) {
    toast(p ? `sea: ${name} — Hs ${p.Hs} m, ${p.Tp} s, from ${p.dirFromDeg}°`
            : 'sea: flat — the gate condition');
  }
}

// ---------------------------------------------------------------------------
// THE WAVE-HEIGHT CONTROL (tmp-tr71). Owner: "bigger waves either side of the
// pier". This is the size dial for those two banks, and for nothing else: it
// scales the surf train only, so the offshore sea state (and its measured
// colour, and the table hash) is untouched at every setting.
//
//   ?surf=0     off - the pre-surf sea, bit for bit. The ablation.
//   ?surf=1     the modelled Bournemouth bank, ~1.15 m over the bar (default)
//   ?surf=1.8   a big day
//   [ and ]     step it down / up in the browser
// ---------------------------------------------------------------------------
const SURF_STEPS = [0, 0.35, 0.7, 1, 1.35, 1.8, 2.4];
let surfIndex = 3;
{
  const q = new URLSearchParams(location.search).get('surf');
  if (q !== null && isFinite(+q)) {
    sim.setSurfSize(+q);
    let best = 0;
    for (let i = 1; i < SURF_STEPS.length; i++) {
      if (Math.abs(SURF_STEPS[i] - +q) < Math.abs(SURF_STEPS[best] - +q)) best = i;
    }
    surfIndex = best;
  }
}
function setSurf(i, quiet) {
  surfIndex = Math.max(0, Math.min(SURF_STEPS.length - 1, i));
  const v = SURF_STEPS[surfIndex];
  sim.setSurfSize(v);
  if (!quiet) {
    toast(v === 0 ? 'surf: off' : `surf: ${v.toFixed(2)}x — ${(1.15 * v).toFixed(2)} m over the banks`);
  }
}

const panel = new TuningPanel($('#panel'), params, (group) => {
  if (group === 'assist' || group === '*') {
    sim.plant.setMast(params.assist.mastLength);
    renderer.mast = params.assist.mastLength;
  }
});

if (isTouch || isSmall) {
  $('#panel').classList.add('hidden');
  $('#help').classList.add('hidden');
  document.body.classList.add('touch');
  camera = 'chase';
}

// ---------------------------------------------------------------------------
// layout
// ---------------------------------------------------------------------------
// Measure the laid-out elements rather than doing arithmetic on innerWidth.
// Loading with the pane hidden makes innerWidth 0, which turned into a negative
// canvas width, which silently fell back to 300x150 and stayed there until the
// window happened to be resized. A ResizeObserver also covers the panel being
// toggled, for free.
function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  charts.style.display = showCharts ? 'block' : 'none';
  const w = Math.max(1, view.clientWidth), h = Math.max(1, view.clientHeight);
  renderer.resize(w, h, dpr);
  view3d.resize(w, h, dpr);
  if (seaGL) seaGL.resize(w, h, dpr);
  if (showCharts) telemetry.resize(Math.max(1, charts.clientWidth), Math.max(1, charts.clientHeight), dpr);
}
addEventListener('resize', resize);
new ResizeObserver(resize).observe($('#left'));

// ---------------------------------------------------------------------------
// actions
// ---------------------------------------------------------------------------
function restart(quiet) {
  // >>> UNPAUSE
  // Same reasoning as the picker's: a restart is an explicit "go", and every summary card's
  // PLAY AGAIN reaches the game through here. Without it, finishing a level while paused -
  // which is easy, because the pause key is also the key that releases the mouse - gave a
  // fresh run that would not move.
  paused = false;
  // <<< UNPAUSE
  const t0 = performance.now();
  sim.reset();
  const cost = performance.now() - t0;
  renderer.reset();
  // >>> CAMDYN
  // THE CAMERA'S OWN RESTART. This line read `view3d.smoothed = null` - a field View3D
  // has not had for a long time - so restart() has silently been skipping its camera
  // reset for however long, leaving the wake trail and the chase pose from the previous
  // run alive across an R. reset() is the real one: it refills the pooled wake arrays,
  // puts the chase camera back at its start pose and hard-zeroes the camera dynamics.
  //
  // Then ONE update at a large dt. reset() parks the camera at the ORIGIN pose, and a
  // level whose start is kilometres out (the gate entry is 8.6 km from it) would restart
  // with the chase camera flying in across the bay. The follow is k = min(1, dt * 5.5),
  // so any dt past 0.19 s is k = 1: the pose lands on the craft instead of setting off
  // toward it. The dynamics do not see this dt - stepDynamics() clamps to maxStep, and
  // the tick rewind has already hard-zeroed them.
  view3d.reset();
  view3d.update(sim, 1);
  // <<< CAMDYN
  // >>> CRAFT
  craftHub.reset();
  // <<< CRAFT
  // >>> JUICE
  juice.reset();
  // <<< JUICE
  telemetry.clear();
  if (replaying) { replaying = null; source = live; }
  if (recorder.active) recorder.stop();
  if (!quiet) toast(`restart ${cost.toFixed(2)} ms  (budget 400)`);
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  toastUntil = performance.now() + 2600;
}

// DEMO MODE. This is a physics rig and the rig earns its keep, but its default
// view was a keyboard-help card sitting on a tuning panel that took 40% of the
// width - unusable as something to hand to anyone. Default to the scene, keep
// every instrument one keypress away, and drop out of demo mode the moment an
// instrument is asked for so the two never fight.
//
// No splash, no click-to-start: SPEC §5 forbids a loading step anywhere, so the
// sim is already running behind the hint.
const DEMO = !new URLSearchParams(location.search).has('rig');

function leaveDemo() { document.body.classList.remove('demo'); }

// WHY YOU FELL OFF, in words, the moment it happens.
//
// The owner's first gameplay report was "keeps falling off" - with no mention
// of a cause, because there was none to see. The cause WAS on screen, in
// hud.wipes, in a detail card that demo mode hides along with every other card
// but the first. So the game knew exactly why and never said.
//
// Measured at the time: 100% of wipeouts were BREACH and the default preset
// wiped out 36 times a minute (tools/wipeout-census.mjs). Both are fixed now,
// but a player still needs to be told which of the three ways they went down,
// and what to do about it, or the skill has nothing to attach to.
const WIPE_TEXT = {
  BREACH:    '<b>BREACH</b> — the wing came clean out of the water. Ease forward sooner.',
  TOUCHDOWN: '<b>TOUCHDOWN</b> — the board slapped down hard. Catch it earlier, or add power.',
  DROPPED:   '<b>DROPPED</b> — ventilated and sinking. Push the nose down to re-wet the wing.',
};
let lastWipeCount = 0;

function reportWipeout(st) {
  // A restart zeroes st.wipeouts, and a stale high-water mark would then
  // suppress every report for the rest of the session.
  if (st.wipeouts < lastWipeCount) lastWipeCount = st.wipeouts;
  if (st.wipeouts <= lastWipeCount) return;
  lastWipeCount = st.wipeouts;
  showHint(WIPE_TEXT[st.lastCause] || ('<b>' + (st.lastCause || 'DOWN') + '</b>'), 4200);
}

function showHint(html, ms = 7000) {
  const el = $('#hint');
  if (!el) return;
  el.innerHTML = html;
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), ms);
}

function setCamera(m) {
  camera = m;
  view3d.mode = m === 'fpv' ? 'fpv' : 'chase';
  // Set visibility HERE, not only in frame(). Leaving it to the loop meant the
  // GL canvas stayed display:none until a frame happened to run, so the whole
  // 3D scene could be invisible on load.
  if (glCanvas) glCanvas.classList.toggle('on', !!(useGL && seaGL && m !== 'side'));
  for (const b of document.querySelectorAll('#viewbar button')) {
    b.classList.toggle('on', b.dataset.cam === m);
  }
  toast(m === 'side' ? 'side-on instrument view'
    : m === 'chase' ? 'chase camera' : 'FPV — the foil is invisible from here');
}

function cycleCamera() {
  setCamera(camera === 'side' ? 'chase' : camera === 'chase' ? 'fpv' : 'side');
}

function startReplay() {
  if (!recorder.length) { toast('nothing recorded - press [ to record'); return; }
  const expect = sim.hash.hex;
  restart(true);
  source = new ReplayInput(recorder.toJSON({}));
  replaying = { expect, ticks: recorder.length };
  toast(`replaying ${recorder.length} ticks`);
}

function cloneSim() {
  const s = new Sim(cloneDefaults());
  Object.assign(s.params.plant, params.plant);
  Object.assign(s.params.rider, params.rider);
  Object.assign(s.params.assist, params.assist);
  s.reset();
  return s;
}

function verifyDeterminism() {
  if (!recorder.length) { toast('record a run first ([ to start, [ again to stop)'); return; }
  const rec = recorder.toJSON({});
  const runs = [];
  for (let n = 0; n < 2; n++) {
    const s = cloneSim();
    const src = new ReplayInput(rec);
    for (let i = 0; i < rec.ticks; i++) s.step(src.sample(), FIXED_DT);
    runs.push(s.hash.hex);
  }
  toast(runs[0] === runs[1]
    ? `deterministic  ${runs[0]}  (${rec.ticks} ticks)`
    : `DRIFT  ${runs[0]} vs ${runs[1]}`);
}

function exportRun() {
  if (!recorder.length) { toast('nothing to export'); return; }
  const data = recorder.toJSON({
    assist: sim.assist.signature,
    assistTrue: sim.assist.isTrue,
    hash: sim.hash.hex,
    params: JSON.parse(JSON.stringify(params)),
  });
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `efoil-run-${data.ticks}t-${sim.assist.signature}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`exported ${data.ticks} ticks`);
}

function selfTest() {
  const out = $('#testout');
  if (out.classList.contains('on')) { out.classList.remove('on'); return; }
  out.textContent = '';
  out.classList.add('on');
  const r = runSelfTest((line) => { out.textContent += line + '\n'; });
  out.classList.toggle('fail', !r.passed);
  toast(r.passed ? 'self-test PASSED' : 'self-test FAILED - see panel');
}

// ---------------------------------------------------------------------------
// keys
// ---------------------------------------------------------------------------
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  switch (e.code) {
    case 'KeyR': restart(); break;
    // >>> CAMDYN
    // J cycles the camera-motion dial. #tset is the touch route and is hidden on a
    // desktop, so without a key a keyboard player would have no way to turn this down.
    case 'KeyJ':
      setCameraMotion(CAM_ORDER[(CAM_ORDER.indexOf(view3d.motionName) + 1) % CAM_ORDER.length]);
      break;
    // <<< CAMDYN
    case 'KeyC': cycleCamera(); break;
    // tr154: the picker's opener on a keyboard. The cold row that carries the LEVELS button is
    // `display:none` off a touch device, so without this a desktop player still had no route
    // to the corsair level but the address bar. NOT on Shift+L - that is the raid's own toggle
    // (raid-mode.js:519) and this switch does not look at modifiers.
    case 'KeyL': if (!e.shiftKey) toggleLevels(); break;
    case 'KeyP': case 'Escape': paused = !paused; toast(paused ? 'paused' : 'running'); break;
    case 'KeyT': leaveDemo(); $('#panel').classList.toggle('hidden'); resize(); break;
    case 'KeyG': leaveDemo(); showCharts = !showCharts; resize(); break;
    case 'KeyB': renderer.showBand = !renderer.showBand; view3d.showRibbon = !view3d.showRibbon; break;
    case 'KeyU': renderer.showRuler = !renderer.showRuler; break;
    case 'KeyM':
      live.mode = live.mode === 'mouse' ? 'keyboard' : 'mouse';
      toast(live.mode === 'mouse' ? 'mouse: move to lean/steer, scroll for throttle' : 'keyboard: W/S lean, A/D steer, arrows throttle');
      break;
    case 'Comma': setSea(seaIndex - 1); break;
    case 'Period': setSea(seaIndex + 1); break;
    case 'KeyF': setSea(SEA_NAMES.indexOf('flat')); break;
    case 'BracketLeft': setSurf(surfIndex - 1); break;
    case 'BracketRight': setSurf(surfIndex + 1); break;
    case 'KeyV': selfTest(); break;
    case 'KeyE': exportRun(); break;
    case 'KeyH': leaveDemo(); $('#help').classList.toggle('hidden'); break;
    case 'BracketLeft':
      if (recorder.active) { recorder.stop(); toast(`recorded ${recorder.length} ticks`); }
      else { restart(true); recorder.start(); toast('recording'); }
      break;
    case 'BracketRight': startReplay(); break;
    case 'Backslash': verifyDeterminism(); break;
    case 'Digit1': panel.applyAssistPreset('easy'); panel.assistSelect.value = 'easy'; toast('assist: easy'); break;
    case 'Digit2': panel.applyAssistPreset('default'); panel.assistSelect.value = 'default'; toast('assist: default'); break;
    case 'Digit3': panel.applyAssistPreset('expert'); panel.assistSelect.value = 'expert'; toast('assist: expert'); break;
  }
});

for (const b of document.querySelectorAll('#viewbar button')) {
  b.addEventListener('click', () => setCamera(b.dataset.cam));
}

// >>> PAD
// A CONNECTED CONTROLLER SAYS SO (tmp-tr198). The pad has driven this game since input.js was
// written and there was nothing anywhere - no toast, no help line, no hint - to tell anyone.
// A feature nobody can find is a secret, so this is the smallest thing that turns it into one.
//
// It also reports the refusal. input.js will not read a pad that does not claim the standard
// mapping (its indices would be noise), and a pad that silently does nothing is a worse bug
// than one that says why.
//
// NEVER on a calibration or clean render: the toast is a visible DOM element and a pad plugged
// in mid-render would paint a banner into a measured frame. Read once, at load, because ?cal=
// is a property of the address and cannot appear later.
{
  const padQuiet = new URLSearchParams(location.search).has('cal');
  addEventListener('gamepadconnected', (e) => {
    if (padQuiet || window.__calCam || document.body.classList.contains('clean-render')) return;
    const g = e && e.gamepad;
    toast(g && g.mapping === 'standard'
      ? 'controller connected — left stick lean/steer, RT throttle, LT ease off (astern on a boat), A punch it, B camera'
      : 'controller connected, but it does not report a standard layout — its buttons would be guesswork, so keyboard or mouse it is');
  });
}
// <<< PAD

// ---------------------------------------------------------------------------
// touch
// ---------------------------------------------------------------------------
const pad = $('#tpad'), thr = $('#tthr'), thrFill = $('#tthr .fill');
const thrRev = $('#tthr .rev'), thrZero = $('#tthr .zero'), thrPct = $('#tthr .pct'), thrLbl = $('#tthr .lbl');

// Canvas-relative, not viewport-relative. The two are the same on a phone today (the canvas
// fills the stage) but input.js now hit-tests REGIONS, so being a few px out would put the
// boundary of the throttle strip in the wrong place the moment anything above it changes.
const canvasXY = (e) => {
  const r = view.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
};

view.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  view.setPointerCapture(e.pointerId);
  const [x, y] = canvasXY(e);
  live.touchStart(e.pointerId, x, y, view.clientWidth, view.clientHeight);
  document.body.classList.add('riding');
  updateTouchUI();
});
view.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'touch') return;
  const [x, y] = canvasXY(e);
  live.touchMove(e.pointerId, x, y, view.clientHeight, view.clientWidth);
  updateTouchUI();
});
const endTouch = (e) => {
  if (e.pointerType !== 'touch') return;
  live.touchEnd(e.pointerId);
  updateTouchUI();
};
view.addEventListener('pointerup', endTouch);
view.addEventListener('pointercancel', endTouch);

// One source of truth for the strip: input.js grabs stripRect(), the widget is drawn at
// stripRect(). The old scheme drew one thing and grabbed another, which is exactly the bug.
function layoutTouch() {
  if (!document.body.classList.contains('touch')) return;
  const s = stripRect(view.clientWidth, view.clientHeight);
  thr.style.left = s.x + 'px'; thr.style.right = 'auto';
  thr.style.top = s.y + 'px'; thr.style.bottom = 'auto';
  thr.style.width = s.w + 'px'; thr.style.height = s.h + 'px';
  const zf = 100 / (1 + TOUCH.astern);                  // the zero detent, % from the top
  thrZero.style.top = zf + '%';
  thrRev.style.top = zf + '%';
  thrFill.style.bottom = (100 - zf) + '%';
  const { rx, ry } = live.padRadii(view.clientWidth, view.clientHeight);
  pad.style.setProperty('--rx', rx + 'px');
  const ring = $('#tghost');
  if (ring) { ring.style.width = rx * 2 + 'px'; ring.style.height = ry * 2 + 'px'; ring.style.margin = `0 0 ${-ry}px ${-rx}px`; }
}

function updateTouchUI() {
  if (!document.body.classList.contains('touch')) return;
  const t = live.touch;
  if (t.padId !== null) {
    const { rx, ry } = live.padRadii(view.clientWidth, view.clientHeight);
    pad.style.display = 'block';
    pad.style.left = t.padX + 'px';
    pad.style.top = t.padY + 'px';
    pad.querySelector('.nub').style.transform =
      `translate(${t.turn * rx}px, ${-t.lean * ry}px)`;
  } else {
    pad.style.display = 'none';
  }
  // Ahead grows up from the detent, astern grows down from it. Each half of the bar is one
  // side of the lever, so the picture and the drag agree.
  const zf = 100 / (1 + TOUCH.astern);
  thrFill.style.height = (t.throttle * zf).toFixed(1) + '%';
  thrRev.style.height = (t.astern * (100 - zf)).toFixed(1) + '%';
  thrPct.textContent = t.astern > 0 ? '-' + Math.round(t.astern * 100) : Math.round(t.throttle * 100);
  thrPct.style.color = t.astern > 0 ? 'rgba(242,193,78,.95)' : 'rgba(232,237,244,.75)';
}

// ---------------------------------------------------------------------------
// the cold row, the settings panel and BOOST (tmp-tr82)
// ---------------------------------------------------------------------------
const SIZE_SCALE = { s: 0.85, m: 1, l: 1.18 };

function applyTouchSettings() {
  const b = document.body;
  b.classList.toggle('mirror', !!touchSettings.mirror);
  b.classList.toggle('autofire', touchSettings.fire === 'auto');
  b.style.setProperty('--tbs', String(SIZE_SCALE[touchSettings.size] || 1));
  b.style.setProperty('--tbo', String(touchSettings.opacity));
  thrLbl.textContent = touchSettings.throttle === 'cruise' ? 'CRUISE'
    : touchSettings.throttle === 'hold' ? 'HOLD' : 'MANUAL';
  live.applyTouchSettings();
  layoutTouch();
  updateTouchUI();
  syncSettingsUI();
  // A boat is the only craft that reads astern, so only a boat shows the band.
  b.classList.toggle('astern', !!(craftHub && craftHub.active));
}

function syncSettingsUI() {
  for (const seg of document.querySelectorAll('#tset .seg')) {
    const k = seg.dataset.k;
    const cur = k === 'mirror' ? (touchSettings.mirror ? '1' : '0') : String(touchSettings[k]);
    for (const b of seg.querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === cur);
  }
  const op = $('#tset-op');
  if (op) op.value = String(Math.round(touchSettings.opacity * 100));
}

for (const seg of document.querySelectorAll('#tset .seg')) {
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const k = seg.dataset.k;
    setTouchSetting(k, k === 'mirror' ? b.dataset.v === '1' : b.dataset.v);
    if (k === 'tilt' && b.dataset.v !== 'off') armTilt();
    applyTouchSettings();          // every setting takes effect on the next frame
  });
}
$('#tset-op').addEventListener('input', (e) => {
  setTouchSetting('opacity', Math.max(0.35, Math.min(1, (+e.target.value || 85) / 100)));
  applyTouchSettings();
});
$('#btn-set-def').addEventListener('click', () => {
  for (const k in TOUCH_DEFAULTS) setTouchSetting(k, TOUCH_DEFAULTS[k]);
  applyTouchSettings(); toast('controls back to the defaults');
});
const closeSet = () => { $('#tset').classList.remove('on'); $('#btn-set').classList.remove('on'); };
$('#btn-set-close').addEventListener('click', closeSet);
$('#btn-set').addEventListener('click', () => {
  const on = $('#tset').classList.toggle('on');
  $('#btn-set').classList.toggle('on', on);
  $('#tmode').classList.remove('on');
  if (on) syncSettingsUI();
});

async function armTilt() {
  const r = await live.enableTilt();
  $('#tset-tiltmsg').textContent =
    r === 'ok' ? 'on — tilt is live' :
    r === 'denied' ? 'permission was declined' :
    r === 'needs-https' ? 'this page is not https, so the phone will not report its angle' :
    'this device has no orientation sensor';
  if (r === 'ok') live.recalibrateTilt();
  return r;
}

// TILT is a SETTING now, so this button is only ever a re-zero — which is what the toast has
// promised since the beginning while the code was actually adding another listener.
$('#btn-tilt').addEventListener('click', async () => {
  const r = await armTilt();
  toast(r === 'ok' ? 'tilt re-zeroed — this angle is now neutral'
    : r === 'needs-https' || r === 'denied' ? 'tilt needs https (or was declined) — use the thumb pad'
    : 'tilt not supported on this device');
});
$('#btn-cam').addEventListener('click', cycleCamera);
$('#btn-restart').addEventListener('click', () => restart());

// The cold row sits faded on a phone and wakes for a few seconds when touched, so five buttons
// are there when wanted and nearly invisible when not (2026-09-18).
{
  const row = $('#tbtns');
  let coldT = 0;
  const wake = () => {
    document.body.classList.add('coldhot');
    clearTimeout(coldT);
    coldT = setTimeout(() => document.body.classList.remove('coldhot'), 3500);
  };
  row.addEventListener('pointerdown', wake, { capture: true });
  row.addEventListener('pointerenter', wake);
}
$('#btn-craft').addEventListener('click', () => {
  // In a mode, the button switches even while moving (see CraftHub.cycle).
  const inMode = document.body.classList.contains('raid') || document.body.classList.contains('rescue');
  craftHub.cycle(inMode);
  applyTouchSettings();
});
// ---------------------------------------------------------------------------
// THE LEVEL PICKER (tr154, owner: "how can we make it easy to choose levels")
//
// Five levels behind one button, each with a line saying what it is. Deliberately NOT a start
// screen: a bare URL still opens straight into the jetski Viking raid (see DEFAULT START), and
// this sheet is something you OPEN, never something you have to get past. It is on screen only
// while it is being used, which is what keeps the phone HUD where three declutter passes left
// it. Opened by LEVELS on the cold row or by L on a keyboard; closed by choosing or CANCEL.
//
// TWO WAYS IN, AND THE REASON THERE HAS TO BE TWO:
//   * same world  -> live. Free ride, rescue, Viking and pirate all share the Bournemouth
//                    mesh, so leaving one and entering another costs nothing but a restart.
//   * arena       -> NAVIGATE. gl/arena-oldharry.js reads ?arena=oldharry at module load and
//                    coast.js bakes Old Harry's chalk into the world mesh while the page
//                    loads, so the harbour mouth cannot be reached or left without one. The
//                    sheet says LOADING while it happens; it is not free and it does not
//                    pretend to be. levels.js carries the whole rule and every other query
//                    param the player had (?surf=, ?seed=, ?rig=, ...) survives the trip.
// ---------------------------------------------------------------------------
const closeLevels = () => {
  $('#tmode').classList.remove('on', 'loading');
  $('#btn-mode').classList.remove('on');
};
function toggleLevels() {
  $('#tmode').classList.remove('loading');
  const on = $('#tmode').classList.toggle('on');
  $('#btn-mode').classList.toggle('on', on);
  closeSet();
}
$('#btn-mode').addEventListener('click', toggleLevels);

$('#tmode').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !b.dataset.m) return;
  const id = b.dataset.m;
  if (id === 'close') { closeLevels(); return; }

  // >>> UNPAUSE
  // PICKING A LEVEL UNPAUSES. Reported by the owner from the live site: pause, open the
  // picker, choose a level, and the level starts with the world frozen. Reproduced and
  // measured rather than reasoned about - entering PIRATE RAID from a paused game gave
  // `levelEntered: true`, `status: PAUSED`, `simAdvancing: false`.
  //
  // Nothing in this handler, or in the four per-level listeners that also fire for this
  // click, ever touched `paused`. It is module state that outlived the level it was set in.
  //
  // It goes HERE, above the `needsReload` branch, so it covers all eight rows - the four
  // live switches this function enters itself, and the navigating ones too. A page load
  // resets `paused` to false anyway, so for those it is simply a no-op rather than a second
  // rule to keep in step.
  //
  // ⚠️ NOT in closeLevels(): dismissing the sheet with CANCEL must leave a paused game
  // paused. Choosing a level is an explicit "play this now"; closing a menu is not.
  paused = false;
  // <<< UNPAUSE

  if (needsReload(id, location.search)) {
    // >>> STARTCRAFT
    // A COLD START HANDS YOU THE JETSKI, not the eFoil. `levelURL()`'s rule is that the craft
    // rides along with you, which is right once you are playing - your craft is a choice you
    // already made. But on the START SCREEN you have made no such choice, and the craft you
    // have not chosen is the eFoil, because that is what the page boots on. So picking VIKING
    // RAID cold handed you an eFoil, when a bare URL used to hand you a jetski and the owner
    // had asked for exactly that. The level tables' own `craftOk`/`craftFallback` cannot fix
    // this: the eFoil is a legal craft on every level now, so nothing rejects it.
    //
    // Narrow on purpose: only the FIRST showing, only when the player is still on the boot
    // craft. Open the picker mid-game with L and your craft rides along exactly as before.
    const cold = startPick.showing && craftHub.kind === 'efoil';
    const url = levelURL(id, location.search, cold ? 'jetski' : craftHub.kind);
    // <<< STARTCRAFT
    $('#tmode .load').textContent = 'LOADING ' + b.textContent + '\u2026';
    $('#tmode').classList.add('loading');
    // TWO frames, not one: a rAF callback runs BEFORE the paint it was scheduled for, so
    // navigating from the first one can blow the sheet away before it was ever on screen.
    requestAnimationFrame(() => requestAnimationFrame(() => location.assign(url)));
    return;
  }

  closeLevels();
  // Leave whatever is running FIRST, even when the target is another raid: raid-mode's enter()
  // returns immediately if a raid is already active (raid-mode.js:110), so without the exit
  // picking VIKING RAID during a pirate run would have silently done nothing at all.
  const R = window.efoilRaid;
  if (R && R.active && R.exit) R.exit();
  const Q = window.efoilRescue;
  if (Q && Q.active) {
    // rescue-mode.js keeps enter/exit private, so its own card button is the handle - the same
    // one raid-mode.js:106 uses, rather than a second way of saying it.
    const x = document.querySelector('#rq-over [data-a=exit]');
    if (x) x.click();
  }
  if (id === 'free') { toast('free ride \u2014 Bournemouth bay'); return; }
  if (id === 'rescue') {
    const d = document.querySelector('#rq-door');
    if (d) d.click(); else toast('that level is not loaded in this build');
    return;
  }
  // raid | pirate | gate. The faction is passed EXPLICITLY and each call is spelled out rather
  // than computed from `id`: R.foe persists between runs (raid-mode.js:113), so picking VIKING
  // after a pirate run used to hand back pirates - and the shipped tmp-tr136x/test-pirate.mjs
  // asserts the literal enter('pirate') in this file as its proof the front door still reaches
  // the pirate fleet. A ternary would have passed a reader and failed the suite.
  if (!R || !R.enter) { toast('that level is not loaded in this build'); return; }
  if (id === 'raid') { R.enter('norse'); return; }
  if (id === 'pirate') { R.enter('pirate'); return; }
  // gate only reaches here with the arena ALREADY loaded, and there the level is the harbour
  // mouth whatever the faction says - it is corsairs either way (raid-mode.js:75).
  if (id === 'gate') R.enter('pirate');
});

// >>> SMUGGLE
// THE SIXTH ROW OF THE PICKER, added from here rather than from index.html.
//
// WHY FROM JS. index.html belongs to another pass this round and its level sheet carries a
// character-for-character assertion on the pirate row (tmp-tr136x/test-pirate.mjs reads the
// file), so the safe way to add a row is to append the SAME SHAPE the sheet already uses -
// a <button data-m> followed by a SIBLING <span class="d">, never nested - at run time. The
// grid in index.html is `auto minmax(0,1fr)` (and two columns of that under 520px tall), so
// a sixth pair lays itself out with no CSS at all: portrait gains one row, landscape gains
// a third row of two and still clears the middle of the sheet.
//
// The click is handled in a SECOND listener rather than by editing the one above. Both fire
// for the same click: the one above does the shared work (close the sheet, leave whatever
// mode is running) and then falls off the end of its `id` chain harmlessly, and this one
// enters the level. Nothing above is reordered or reformatted, which is what keeps the merge
// clean.
{
  const body = $('#tmode .body');
  if (body && !body.querySelector('[data-m="smuggle"]')) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.m = 'smuggle'; b.textContent = 'THE SMUGGLING RUN';
    const d = document.createElement('span');
    d.className = 'd';
    d.textContent = 'Dorset, and they are landing contraband on the beach. Seize it — nothing here is sunk.';
    body.appendChild(b); body.appendChild(d);
  }
  $('#tmode').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.dataset.m !== 'smuggle') return;
    if (needsReload('smuggle', location.search)) return;   // the handler above is navigating
    const S = window.efoilSmuggle;
    if (!S || !S.enter) { toast('that level is not loaded in this build'); return; }
    S.enter();
  });
  // The keyboard card lives in index.html too, so its row is appended the same way.
  const help = document.querySelector('#help table');
  if (help && !help.dataset.sg) {
    help.dataset.sg = '1';
    const tr = document.createElement('tr');
    tr.innerHTML = '<td><kbd>Shift</kbd>+<kbd>J</kbd></td><td>the Dorset smuggling run — come alongside to seize, never sink</td>';
    help.appendChild(tr);
  }
}
// <<< SMUGGLE

// >>> STUNT
// THE SEVENTH ROW OF THE PICKER, added from here for the same reason the sixth row is:
// index.html
// is not this pass's file, and its level sheet carries a character-for-character assertion on
// the pirate row that tmp-tr136x/test-pirate.mjs reads off disk. So the row is appended at run
// time in the SAME SHAPE the sheet already uses - a <button data-m> followed by a SIBLING
// <span class="d">, never nested.
//
// ⚠️ AND THE LANDSCAPE GRID, WHICH A SEVENTH LEVEL REALLY DOES BREAK. index.html pins
// `#tmode .body` to `repeat(2, 176px minmax(0,1fr))` under `max-height: 520px`, and that rule
// was written for five entries in three rows. Seven is FOUR rows, and MEASURED on the live
// page with the seventh row in place and this rule disabled:
//
//     844 x 390   body 210 px in 210 px      fits
//     740 x 360   body 222 px in 222 px      fits
//     667 x 375   body 304 px in 250 px      ⚠️ 54 px BELOW THE FOLD
//
// ⚠️⚠️ THESE THREE READINGS ARE STALE AND THE "fits" ON THE FIRST TWO IS NO LONGER TRUE.
// They were measured before the accessibility pass (tmp-tr174) re-based the root font to 16 px
// and lifted the ladder. Re-measured on the live page afterwards, with seven entries:
//
//     1280 x 720   111 px over the fold,  6 of 7 reachable (desktop has a 15 px scrollbar)
//     844 x 390    129 px over,           4 of 7 reachable   <- "fits" above was measured at 10.5 px type
//     740 x 360    224 px over,           4 of 7
//     667 x 375    206 px over,           4 of 7
//
// So the sheet overflowed on EVERY phone size, not just the narrow one, and the seventh level
// was unreachable on all of them - which mattered far more once a bare URL started opening this
// sheet as the START SCREEN. The fix is the `PICKFIT` fence further down this file; it takes
// every size above to 0 px over and 7 of 7, and fails 0 of 584 swept viewports at >= 375 wide
// by >= 360 tall. The gate below at `max-width: 739px` still stands and is still correct - it
// is simply no longer sufficient on its own.
//
// Left in place rather than deleted because the REASONING under it is still right: the narrow
// case breaks on description wrap, and the pill column is the lever. Only the numbers aged.
//
// The narrow case is the one that breaks, and it breaks for a reason the tall case does not
// show: at 667 px wide the description column is only ~129 px, so the longer descriptions
// wrap to four lines and the rows grow. Six entries fit there (212 px in 212); seven do not.
// So this is the seventh level's bill and it is paid here.
//
// THE FIX IS THE PILL COLUMN, NOT THE TEXT, AND ONLY WHERE IT IS NEEDED. Scanning widths at
// 375 px tall with index.html's own rule and seven entries:
//
//     667 px wide   body 304 px in 250    54 px below the fold
//     700 px wide   body 251 px in 250     1 px
//     720 px wide   body 251 px in 250     1 px
//     740 px wide   body 222 px in 222     fits
//     800 px wide   body 210 px in 210     fits
//
// So the override is gated at `max-width: 739px` and the shipped 176 px grid is left exactly
// as it is on every phone wide enough for it - which is the 844 x 390 and 740 x 360 cases this
// project actually targets. Below 740 the pill column goes 176 -> 140 px, which hands each
// description ~34 px more to wrap in and takes the tall rows from four lines to three.
// Measured with the override on: 667x375 body 216 px in 216 (sheet 355 -> 321), 700 and 720
// likewise 0. Portrait is untouched - the max-height query never applies there.
//
// ONE COSMETIC CONSEQUENCE, stated rather than discovered: at 140 px the three longest titles
// (THE HARBOUR MOUTH, THE SMUGGLING RUN, THE STUNT STAGE) wrap to two lines. They still sit
// INSIDE the 40 px pill - two 15 px line boxes - so nothing clips and nothing grows; counted
// with Range.getClientRects() on the live page, not guessed.
//
// What is NOT touched: the description font stays at the sheet's own 10.5 px, because going
// under it is how this project has broken its own text floor before (ui/juice.js carries the
// scar - this page's 1rem is 12px, so anything written in rem measures 25% small). And it is
// NOT a third column: three pill+description pairs need about 912 px and the sheet is 800.
//
// It is injected rather than edited into index.html, which is not this pass's file either.
{
  const st = document.createElement('style');
  st.id = 'st-picker';
  st.textContent = '@media (max-height: 520px) and (max-width: 739px) {'
    + '#tmode .body { grid-template-columns: repeat(2, 140px minmax(0, 1fr)); gap: 6px 10px; }'
    + '#tmode .body button { min-height: 40px; }'
    + '}';
  document.head.appendChild(st);

  const body = $('#tmode .body');
  if (body && !body.querySelector('[data-m="stunt"]')) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.m = 'stunt'; b.textContent = 'THE STUNT STAGE';
    const d = document.createElement('span');
    d.className = 'd';
    d.textContent = 'A marked freestyle course off Boscombe. Twelve ramps, two minutes, build a score.';
    body.appendChild(b); body.appendChild(d);
  }
  // This is a SECOND listener rather than an edit to the shared one above, following the row
  // appended immediately before it. Both fire for the same click: the shared handler does the common work and then
  // falls off the end of its `id` chain, and this one enters the level. In practice the shared
  // handler NAVIGATES for this level - the stunt course is its own world mesh, so needsReload()
  // is true from everywhere else - and the guard below is what stops this one acting during a
  // navigation that is already under way.
  $('#tmode').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.dataset.m !== 'stunt') return;
    if (needsReload('stunt', location.search)) return;   // the handler above is navigating
    if (!stunt || !stunt.enter) { toast('that level is not loaded in this build'); return; }
    stunt.enter();
  });
  const help = document.querySelector('#help table');
  if (help && !help.dataset.st) {
    help.dataset.st = '1';
    const tr = document.createElement('tr');
    tr.innerHTML = '<td><kbd>Shift</kbd>+<kbd>T</kbd></td><td>the stunt stage — freestyle score attack, ramps only</td>';
    help.appendChild(tr);
  }
}
// <<< STUNT

// >>> OVERBOARD
// THE EIGHTH ROW OF THE PICKER, added 22 Sep 2026 on the owner's instruction. The builder
// that wrote this level deliberately did NOT add it: ui/levels.js was asserted at exactly
// seven rows by two suites, against literals, so that an eighth would be a decision and not a
// silent pass. This is that decision, and both assertions were updated by hand rather than
// relaxed - test-levels.mjs still pins the exact id list in sheet order, and test-wire.mjs
// still pins the preset count at SEVEN, because this row shares the rescue bed and adds no
// eighth preset.
//
// Same shape as the sixth and seventh rows above, and for the same reason: index.html's level
// sheet carries a character-for-character assertion on the pirate row that test-pirate.mjs
// reads off disk, so a row is appended at run time - a <button data-m> followed by a SIBLING
// <span class="d">, never nested.
//
// This level is a LIVE switch, not a navigation: it runs on the Bournemouth mesh with no
// arena, so needsReload() is false from every other Bournemouth level and the shared handler
// above does not navigate. The guard is kept anyway, because it IS true when the player is
// standing on one of the two arena worlds and the navigation is then already under way.
{
  const body = $('#tmode .body');
  if (body && !body.querySelector('[data-m="overboard"]')) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.m = 'overboard'; b.textContent = 'THE TRIP BACK';
    const d = document.createElement('span');
    d.className = 'd';
    d.textContent = 'A boatload too many in a building swell. Drive it badly and they go over the side — bring every one of them in.';
    body.appendChild(b); body.appendChild(d);
  }
  $('#tmode').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.dataset.m !== 'overboard') return;
    if (needsReload('overboard', location.search)) return;   // the handler above is navigating
    const O = window.efoilOverboard;
    if (!O || !O.enter) { toast('that level is not loaded in this build'); return; }
    O.enter();
  });
  const help = document.querySelector('#help table');
  if (help && !help.dataset.ob) {
    help.dataset.ob = '1';
    const tr = document.createElement('tr');
    tr.innerHTML = '<td><kbd>Shift</kbd>+<kbd>O</kbd></td><td>the trip back — nobody is left in the water</td>';
    help.appendChild(tr);
  }
}
// <<< OVERBOARD
// >>> A11Y
// THE PICKER'S PILLS ARE TOUCH TARGETS AND ONE OF THEM HAD DROPPED TO 40 px.
//
// index.html gives `#tmode .body button` a 44 px min-height under `max-height: 520px`, which
// is the 44 px floor this project keeps for anything pressed with a thumb. A later pass needed
// four more pixels of vertical room on a narrow landscape phone and took them from that
// min-height, in an injected sheet gated at `max-width: 739px`. Measured on the live page at
// 720x375, 700x375 and 667x375: the pills came back 140 x 40. At 844 and 740 they were 176 x 44,
// so the defect was invisible on the two viewports anybody checks first.
//
// This is an override rather than an edit to that sheet, because that sheet belongs to another
// pass and this one owns the floor. It is injected LAST, so at equal specificity it wins; the
// grid, the column widths and the gaps it sets are all left exactly as they are, and the four
// pixels come back out of the page instead - see tmp-tr174/a11y/RESULT.md for the measurement
// of what that costs and why it is still the right trade.
{
  const a11ySt = document.createElement('style');
  a11ySt.id = 'a11y-picker';
  a11ySt.textContent = '@media (max-height: 520px) and (max-width: 739px) {'
    + '#tmode .body button { min-height: 44px; }'
    + '}';
  document.head.appendChild(a11ySt);
}
// <<< A11Y

// >>> STARTPICK
// ---------------------------------------------------------------------------
// THE GAME ASKS WHICH LEVEL WHEN IT STARTS (2026-09-20, owner: "the game started on the
// Viking attack on Bournemouth Pier ... can we have it say when the game starts you can
// choose which level you wanna play would make sense, wouldn't")
//
// They are right, and the reason is in the sheet above: there are SEVEN levels and a bare
// URL went straight into one of them (DEFAULT START, at the foot of this file), so the other
// six sat behind a button a new player had no reason to press. A bare URL now shows THIS
// SHEET - the one that already exists, with the seven rows already in it - before any level
// begins.
//
// It is NOT a title screen, a splash or a menu. Nothing new is drawn, no new state machine
// exists, and every route into and out of the sheet is the route that was already there: the
// same markup, the same handlers, the same levels.js rules, opened by one extra class.
// Mid-game the sheet is exactly what it has always been.
//
// WHAT COUNTS AS BARE is asksWhichLevel() in ui/levels.js, not a condition written here: it
// is a question about a URL, and levels.js is the pure file test-levels.mjs can hold with no
// browser at all. ?cal= and ?clean=1 are excluded there, first and on their own.
//
// ---- FOUR DECISIONS THE BRIEF LEFT TO ME -----------------------------------
//
// 1. CANCEL IS HIDDEN ON THE FIRST SHOWING, AND ONLY THERE.
//    At startup there is nothing to cancel back to. But the button that would do the
//    cancelling is already in the list: FREE RIDE. Picked from a cold start it runs the same
//    lines CANCEL would - close the sheet, and there is no mode to leave - and then says
//    "free ride - Bournemouth bay". That is CANCEL plus the one thing CANCEL cannot say:
//    where you ended up. Two buttons doing one thing and only one of them explaining itself
//    is not a choice. So CANCEL is hidden by a class on the sheet, not removed from the
//    markup, and it is back the instant the sheet is opened by hand - which is the case it
//    was written for and the only case where it still means something.
//    It is hidden with `visibility`, not `display`: the foot also carries the Environment
//    Agency licence line, which is an OBLIGATION, and visibility keeps that foot exactly the
//    height and shape it is on every other showing.
//
// 2. WHAT IS BEHIND IT IS THE ATTRACT DEMO, AND IT COSTS LESS THAN WHAT IT REPLACES.
//    The demo pilot already starts on every bare URL today; DEFAULT START then throws it
//    away one frame later by entering the raid. So leaving it flying is not an addition -
//    boot now does strictly LESS, by one craftHub.select('jetski') and one raid.enter(), and
//    by every longship, crew and gun those two build. Measured both ways on this machine and
//    written up in tmp-tr180/startpick/RESULT.md. The card is drawn over a scene that was
//    being drawn anyway.
//
// 3. IT CANNOT START PLAY BY ACCIDENT - and the one thing that could was the demo's own
//    hand-over. AttractPilot flies until the first genuine input and then hands the craft to
//    the player at the same throttle. On a start screen that is the wrong trade: the first
//    genuine input is the mouse travelling 30 px toward the button you are about to press,
//    and what it buys is a craft flying in a straight line with nobody steering, out of the
//    bay at 40 km/h while you read the card. The pilot's own reset - past 280 m, or 1.5 s
//    down - only runs while the pilot is still flying, so nothing brings it back.
//    So while, and ONLY while, this first showing is up, `mousemove` and `wheel` are stopped
//    at window capture before the demo's own listener can see them. Three notes:
//      * stopImmediatePropagation, because the demo's listener is on the SAME target in the
//        SAME phase and plain stopPropagation does not reach it; and this block runs before
//        the demo registers, so the order is ours.
//      * `click` is NOT in the list, so every button on the sheet is untouched.
//      * nothing calls preventDefault, so the sheet's own body still scrolls on a wheel.
//    A TAP or a KEYPRESS is deliberately still let through and still hands over. A tap is a
//    pick, and a pick restarts or navigates a frame later, so the hand-over never lands; a
//    keypress is a genuine input by the rule the demo has always used, and taking L, Escape
//    and R away from a keyboard player to protect a background would be the worse trade.
//
// 4. IT REMEMBERS WHAT YOU PICKED LAST, AND ONLY MARKS IT.
//    One localStorage string, written when a level is picked FROM THIS SHEET - deliberately
//    not when one is entered by a key or by the front door, because the mark is an answer to
//    "which of these did I choose", and a route that never showed the sheet never answered
//    it. It is read when this first showing opens: the pill gets `data-last` and is scrolled
//    into view. It does not pre-select, it
//    does not auto-start and it does not reorder the list, because a start screen that plays
//    something before you touch it is the thing the owner has just asked us to stop doing.
//    On a first-ever visit, in a private window, or with storage blocked, there is no mark.
// ---------------------------------------------------------------------------
const startPick = {
  armed: asksWhichLevel(location.search),
  showing: false,
  KEY: 'efoil.lastLevel',

  open() {
    const sheet = $('#tmode');
    if (!sheet) return;
    this.showing = true;
    sheet.classList.remove('loading');
    sheet.classList.add('on', 'startpick');
    const btn = $('#btn-mode');
    if (btn) btn.classList.add('on');
    let last = null;
    try { last = localStorage.getItem(this.KEY); } catch { /* blocked storage: no mark */ }
    // An id read back out of storage is matched against the rows that are actually here, so
    // a level that was removed, or a hand-edited value, simply finds nothing.
    const pill = last && /^[a-z]+$/.test(last)
      ? sheet.querySelector('.body button[data-m="' + last + '"]') : null;
    if (pill) { pill.setAttribute('data-last', ''); pill.scrollIntoView({ block: 'nearest' }); }

    // ⚠️ THE SHEET'S OWN BUTTONS ARE NOT THE ONLY WAY INTO A LEVEL, and a card left standing
    // over a level that has already started would be a defect this change introduced. The
    // two front-door buttons in the top corner, and Shift+R / Shift+L / Shift+J / Shift+T,
    // all start a level without the sheet hearing a thing. Every level marks the body when
    // it starts, so the mark is what is watched - and the marks are taken FROM THE LEVEL
    // TABLE rather than written out, because in this file a fence owns its own level's name
    // and an unfenced line may not spend it. (The ids that are not body classes - free,
    // pirate, gate - simply never match; the four that are are the four that matter.)
    const MARKS = LEVELS.map((l) => l.id);
    this._obs = new MutationObserver(() => {
      if (!this.showing || !MARKS.some((m) => document.body.classList.contains(m))) return;
      closeLevels();
      this.done();
    });
    this._obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  },

  // The first showing is over the moment a level is chosen, whether that level is entered
  // here or a page load away. From here on the sheet is the ordinary mid-game sheet.
  done() {
    this.showing = false;
    const sheet = $('#tmode');
    if (!sheet) return;
    sheet.classList.remove('startpick');
    for (const p of sheet.querySelectorAll('.body button[data-last]')) p.removeAttribute('data-last');
    if (this._obs) { this._obs.disconnect(); this._obs = null; }
  },
};

{
  // The two rules the first showing needs. Injected rather than written into index.html, so
  // dist/index.html does not have to be re-copied for a start screen that is two selectors.
  const spSt = document.createElement('style');
  spSt.id = 'startpick';
  spSt.textContent =
    // Decision 1. visibility, not display - the licence line beside it must not move.
    '#tmode.startpick .foot button[data-m="close"] { visibility: hidden; }'
    // Decision 4. A white ring on the amber pill. Not a dim, not a fill and not a tick:
    // every one of those reads as "selected" or "unavailable", and this is neither. It is
    // "this is the one you played last", which is a note and not a state.
    + '#tmode.startpick .body button[data-last] { box-shadow: 0 0 0 3px rgba(255,255,255,.9); }';
  document.head.appendChild(spSt);

  // Decision 3. Registered HERE, above the attract block, so this listener is on window
  // before the demo's own and stopImmediatePropagation can still reach it.
  const hold = (e) => { if (startPick.showing) e.stopImmediatePropagation(); };
  for (const ev of ['mousemove', 'wheel']) addEventListener(ev, hold, { capture: true });

  // A THIRD listener on the sheet, following the two that the sixth and seventh rows already
  // add, and for the same reason: nothing above is reordered or reformatted, so the merge
  // stays a pure insertion. (This comment named those two levels on its first draft and a
  // name sweep in the suites caught it, correctly - in this file a fence owns its own
  // level's name, and an unfenced line may not spend it.)
  // It runs after the shared handler has closed the sheet or queued its navigation, and it
  // does two things: end the first showing, and remember.
  $('#tmode').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !b.dataset.m) return;
    if (b.dataset.m !== 'close') {
      try { localStorage.setItem(startPick.KEY, b.dataset.m); } catch { /* blocked: no memory */ }
    }
    startPick.done();
  });

  // L and the LEVELS button toggle the sheet, and a toggle that closes the first showing has
  // ended it as surely as a pick has: there is no level behind it to go back to. Without
  // this, closing with L and reopening would bring back a CANCEL with nothing to cancel.
  const btnMode = $('#btn-mode');
  if (btnMode) btnMode.addEventListener('click', () => {
    if (!$('#tmode').classList.contains('on')) startPick.done();
  });
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyL' && !e.shiftKey && startPick.showing) startPick.done();
  });
}
// <<< STARTPICK

// >>> PICKFIT
// ---------------------------------------------------------------------------
// THE PICKER HAS TO FIT, BECAUSE IT IS NOW THE FIRST THING A PLAYER SEES (2026-09-20)
//
// tmp-tr180 made this sheet the start screen and measured it there. It did not fit on any
// phone. Measured again on this base, seven levels against the body they are drawn in:
//
//     844 x 390   388 px of content in 259    4 of 7 reachable, the SEVENTH row 129 px under
//     740 x 360   453 in 229                  4 of 7
//     720 x 375   407 in 244                  4 of 7
//     700 x 375   450 in 244                  4 of 7
//     667 x 375   450 in 244                  4 of 7
//     390 x 844   1257 in 703                 4 of 7, the last row 554 px under
//     1280 x 720  696 in 585                  6 of 7
//
// A desktop grows a real 15 px scrollbar (offsetWidth - clientWidth = 15, measured) so the
// rest is at least discoverable there. A phone draws an overlay scrollbar that does not
// exist until you have already scrolled, so on the primary device, on the first screen, the
// seventh level could not be reached at all. Over a 584-viewport sweep the shipped sheet
// failed 466 of them.
//
// ⚠️ AND THE COMMENT BESIDE THE OLD GRID STILL SAYS IT FITS. The block above that injects
// `#st-picker` records "844 x 390 body 210 px in 210 px  fits" and "667x375 body 216 px in
// 216". Both were true the day they were measured. Both stopped being true when tmp-tr174
// raised this sheet's description from 10.5 px to 16 px and its heading from 13 to 17 - a
// correct change with its reasons written down, which silently invalidated the grid the
// older numbers described. Those lines live inside another pass's fence and this pass may
// not edit them, so the correction is recorded HERE and flagged for integration in
// tmp-tr181/pickfit/RESULT.md. The rules below override that grid everywhere it applies, so
// the code those numbers justify no longer decides anything.
//
// ---- WHAT THE ARITHMETIC ALLOWS, WHICH IS LESS THAN ANYONE WANTED ----------
// On a 390 px-tall landscape phone this sheet gets 259 px of body, between a 17 px heading
// and a PINNED foot carrying the Environment Agency licence line. Seven levels at the 44 px
// touch floor is four grid rows = 176 px plus gaps. That leaves about 65 px for SEVEN
// descriptions - three lines of 16 px text for the whole sheet. Every row below is content
// height READ OFF THE RUNNING PAGE with that layout applied, never worked out on paper:
//
//     layout tried                      844x390  740x360  720x375  700x375  667x375
//     as shipped                            388      453      407      450      450
//     tighter grid, 16 px kept              287      325      344      402      402
//     pill stacked over its description     394      394      394      437      437
//     two columns, pill column 120 px       259      251      264      264      274
//     ---- and the body it has to fit ----  259      229      244      244      244
//
// The best description-keeping layout fits 844 x 390 with **zero** pixels to spare - 259 in
// 259, measured - and misses every other landscape phone by 20 to 30. Zero is not a fit:
// tmp-tr174 recorded that its throttle label had 1.8 px of margin on THIS machine's
// monospace metrics and wrote the warning into the CSS beside the value; a platform with a
// wider face re-wraps one description and that row grows 19 px. Swept over 584 viewports
// that option failed 34, including 844 x 375 and 844 x 360 - the same phone, a slightly
// shorter window. (My first draft of this paragraph said "eleven pixels to spare" and
// "misses by 78 to 158". Both were arithmetic, both were wrong, and measuring them is what
// turned a defensible option into an indefensible one.)
//
// IT IS NOT THE TYPE THAT GIVES. tmp-tr174 took 128 under-floor sizes down to six declared
// exceptions and eleven under-44 controls down to none, and this brief is explicit that
// legibility is not the thing that yields. So the DESCRIPTIONS yield, and only where they
// cannot fit - which is the same trade #tset already takes, in the same stylesheet, under
// the same query, with the reason written next to it: "A phone held sideways is ~393 px
// tall. Two columns, and the prose goes: the segment labels carry the meaning and the
// explanations are still there in portrait."
//
// They are hidden VISUALLY and NOT removed. The span keeps its text and stays in the
// accessibility tree - position and clip, never `display: none` and never an ellipsis - so a
// screen reader still reads "THE HARBOUR MOUTH" followed by "Old Harry Rocks: sink them
// before they cross the line" on a phone held sideways. Nothing is deleted and nothing is
// truncated. Turn the phone upright and the descriptions are back.
//
// ---- THE TWO REGIMES, AND WHERE THE LINE BETWEEN THEM IS -------------------
// TITLES: an auto-fit grid with a 140 px column floor, so the sheet takes as many columns as
//   it has room for rather than a count measured once on one screen. 5 columns at 844 x 390,
//   4 at 740/720/700/667, 2 on a portrait phone, 1 at 320 px wide. Rows are
//   `minmax(44px, auto)`: never under the touch floor, and free to grow for a title that
//   wraps.
// DESCRIPTIONS: the list the sheet has always been, with the pill column pinned to 132 px
//   (it was `auto`, which on a portrait phone took 218 of 332 px and left the description
//   101, wrapping it to eight lines) and the description line-height at 1.2.
//
// The line between them is TWO thresholds and not one, because a narrow sheet wraps each
// description onto roughly twice as many lines as a wide one. Both were found by sweeping,
// not chosen: a single 521 px / 700 px threshold - the obvious one - failed 35 viewports.
//
//     >= 588 px wide and >= 560 px tall        descriptions
//     390-587 px wide and >= 760 px tall       descriptions
//     everything else                          titles
//
// ---- WHAT THIS WAS MEASURED AGAINST ----------------------------------------
// 584 viewports, every one of them laid out and read back with getComputedStyle and
// getBoundingClientRect (tmp-tr181/pickfit/fit.mjs). FAILING = any level not fully inside
// the scroll container at scrollTop 0, or any pill under 44 px, or any text under the 16 px
// floor, or a clipped title.
//
//     as shipped      466 of 584 failing
//     this            15 of 584 failing, and ZERO for every viewport at least 375 px wide
//                     and 360 px tall - the whole failing set is 320 px-wide windows under
//                     480 px tall, and windows 320 px TALL, neither of which is a device
//                     this game targets. They are listed by name in RESULT.md, not hidden.
//
// Two options were measured and NOT taken, which is the point of measuring them: an
// always-visible styled scrollbar left all five landscape phones at 4 of 7 reachable
// (a scroll affordance is not a fit), and wrapping each pill and its description in a card
// made 844 x 390 WORSE - 394 px of content against 388.
//
// Injected rather than written into index.html for the reason the A11Y block above is:
// three stylesheets are already injected over that file at run time, and the last one wins
// at equal specificity. A rule written into index.html would lose to `#st-picker` on exactly
// the narrow phones this fixes. So the layout does not depend on dist/index.html being
// re-copied; only the corrected prose in index.html does.
// ---------------------------------------------------------------------------
{
  const pfSt = document.createElement('style');
  pfSt.id = 'pickfit';
  pfSt.textContent =
    // ---- TITLES: every level on screen, nothing below the fold, nothing under 44 px.
    '#tmode .body {'
    + ' grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));'
    + ' grid-auto-rows: minmax(44px, auto);'
    + ' gap: 6px; align-items: stretch; align-content: start; }'
    + '#tmode .body button { min-height: 44px; padding: 6px 10px; line-height: 1.15; }'
    // The description is hidden from the eye and kept for everything else. 1 px + clip is
    // the standard visually-hidden shape; `position: absolute` also takes the span out of
    // the grid, so seven of them cost the scroll container exactly nothing - measured: at
    // 844 x 390 the body is 122 px of content, which is 48.78 + 6 + 67.17 to the pixel.
    + '#tmode .body .d { position: absolute; width: 1px; height: 1px; padding: 0;'
    + ' overflow: hidden; clip-path: inset(50%); white-space: nowrap; }'
    // ---- DESCRIPTIONS: only where seven of them fit. Thresholds swept, see above.
    + '@media (min-width: 588px) and (min-height: 560px),'
    + ' (min-width: 390px) and (max-width: 587px) and (min-height: 760px) {'
    + '#tmode { width: min(560px, calc(100% - 24px)); }'
    + '#tmode .body {'
    + ' grid-template-columns: 132px minmax(0, 1fr);'
    + ' grid-auto-rows: minmax(44px, auto);'
    + ' gap: 6px 12px; align-items: center; align-content: start; }'
    + '#tmode .body button { min-height: 50px; padding: 6px 10px; line-height: 1.15; }'
    + '#tmode .body .d { position: static; width: auto; height: auto; padding: 0;'
    + ' overflow: visible; clip-path: none; white-space: normal; line-height: 1.2; }'
    + '}';
  document.head.appendChild(pfSt);
}
// <<< PICKFIT

// BOOST / PUNCH IT. setPointerCapture, so a thumb that drifts off the circle mid-pop does not
// silently let go - which is what `pointerleave` did to FIRE and WATER.
{
  const bb = $('#tboost');
  const setB = (v) => (e) => {
    e.preventDefault(); e.stopPropagation();
    if (v) { try { bb.setPointerCapture(e.pointerId); } catch { /* not captured: still works */ } }
    bb.classList.toggle('down', v);
    live.setBoost(v);
  };
  bb.addEventListener('pointerdown', setB(true));
  bb.addEventListener('pointerup', setB(false));
  bb.addEventListener('pointercancel', setB(false));
  addEventListener('blur', () => { bb.classList.remove('down'); live.setBoost(0); });
}

if (isTouch || isSmall) applyTouchSettings();
addEventListener('resize', layoutTouch);
addEventListener('orientationchange', () => setTimeout(layoutTouch, 120));

// FULL SCREEN (2026-09-17, owner asked). Android Chrome/Edge grant element fullscreen and will
// usually take a landscape lock with it. iPhone Safari has NO fullscreen for a web page at all -
// the only chrome-free route there is Add to Home Screen, which the manifest and the apple-*
// meta tags in index.html set up - so say that plainly instead of failing silently.
$('#btn-full').addEventListener('click', async () => {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    try { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch { /* ignore */ }
    return;
  }
  if (!req) {
    toast(navigator.standalone === false
      ? 'iPhone Safari cannot full-screen a web page — use Share ▸ Add to Home Screen, then open it from there'
      : 'full screen is not available in this browser');
    return;
  }
  try {
    await req.call(el, { navigationUI: 'hide' });
    if (screen.orientation && screen.orientation.lock) {
      try { await screen.orientation.lock('landscape'); } catch { /* desktop and iOS refuse; harmless */ }
    }
    // Some browsers resolve the promise and stay windowed. Never leave the player tapping a
    // button that appears to do nothing.
    setTimeout(() => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        toast('this browser would not go full screen — on an iPhone use Share ▸ Add to Home Screen');
      }
    }, 400);
  } catch (e) { toast('full screen was refused: ' + (e && e.message ? e.message : 'unknown')); }
});
addEventListener('fullscreenchange', () => {
  const b = $('#btn-full');
  if (b) b.textContent = document.fullscreenElement ? 'EXIT' : 'FULL';
});

// ---------------------------------------------------------------------------
// loop
// ---------------------------------------------------------------------------
function tick() {
  const raw = source.sample(FIXED_DT);
  if (recorder.active) recorder.push(raw);
  // >>> CRAFT
  // A boat steps itself (and the idle eFoil, for the sea clock); null = demo pilot.
  if (craftHub.active) craftHub.step(attract && source === attract ? null : raw, FIXED_DT); else
  // <<< CRAFT
  sim.step(raw, FIXED_DT);
  // >>> RESCUE
  if (rescue && rescue.active) rescue.tick();
  // <<< RESCUE
  // >>> OVERBOARD
  // THE TRIP BACK (tmp-tr197). Same place and same shape as the RESCUE line above: once per
  // FIXED step, after the craft has stepped, read-only. It is a separate level and is mutually
  // exclusive with that one - mode.js stands itself down if another level's body class appears.
  if (overboard && overboard.active) overboard.tick();
  // <<< OVERBOARD
  // >>> RAID
  if (raid && raid.active) raid.tick();
  // <<< RAID
  // >>> SMUGGLE
  if (smuggle && smuggle.active) smuggle.tick();
  // <<< SMUGGLE
  telemetry.push(sim.plant.state, params.plant.mass * params.plant.g);
  // >>> CRAFT
  if (!craftHub.active)
  // <<< CRAFT
  if (attract && source === attract) attract.watch();

  if (replaying && source.done) {
    const ok = sim.hash.hex === replaying.expect;
    toast(ok ? `replay matched  ${sim.hash.hex}` : `replay DRIFTED  ${sim.hash.hex} vs ${replaying.expect}`);
    replaying = null;
    source = live;
  }
  // >>> JUICE
  // LAST in the tick and read-only: craftSample() looks at the active hull (or, on the eFoil,
  // the plant state) after everything above has already stepped, and nothing is written back.
  // The replay hash comes from sim.hash, which this cannot reach.
  juice.tick(FIXED_DT, craftSample(sim, craftHub));
  // <<< JUICE
  // >>> STUNT
  // THE STUNT STAGE's rules, last of all and read-only like the feel layer above it.
  // It is handed a craftSample() of its own rather than the one the JUICE fence just used,
  // because that value is consumed inside that fence and reaching into it would couple two
  // independent merges; craftSample() is a pure read of state that has already stepped, so
  // taking it twice in the same tick cannot give two different answers.
  if (stunt && stunt.active) stunt.tick(FIXED_DT, craftSample(sim, craftHub));
  // <<< STUNT
}

function frame(nowMs) {
  perf.frameStart(nowMs);
  const now = nowMs / 1000;
  let ft = now - last;
  last = now;
  if (ft > 0.25) ft = 0.25;          // a stall must not teleport the sim

  // >>> PAD
  // THE PAD'S ONE-SHOT ACTIONS (tmp-tr198), drained once per rendered frame.
  //
  // Here and not in tick() on purpose. tick() runs 0-8 times a frame off an accumulator, and
  // during a replay or the attract demo `source` is not `live` at all, so tick() never calls
  // live.sample() - a camera button hung off the sim step would be jittery when it worked and
  // silently dead when it mattered. pollActions() owns the edge state (input.js), nothing else
  // in the file touches it, so a button held across frames fires exactly once.
  //
  // These are VIEW actions. They set no sim input, they are not in the recorded stream, and
  // they cannot reach sim.hash - the same reason C and K cannot.
  //
  // Off during a calibration or clean render: a pad cycling the camera mid-measurement would
  // corrupt the corpus, and the craft is a page-load decision on those addresses anyway.
  if (!window.__calCam && !document.body.classList.contains('clean-render')) {
    for (const a of live.pollActions()) {
      if (a === 'camera') cycleCamera();
      // Exactly what the CRAFT button does, including its in-a-mode override - not a second
      // set of rules for the same action (boats/hub.js cycle()).
      else if (a === 'craft') {
        craftHub.cycle(document.body.classList.contains('raid') || document.body.classList.contains('rescue'));
        applyTouchSettings();
      }
    }
  }
  // <<< PAD

  // ?hold=1 stops the physics so successive calibration renders are identical,
  // while the draw below keeps running (a frozen loop screenshots as an empty
  // canvas - see the note further down).
  if (!paused && !window.__calFrozen) {
    acc += ft;
    let n = 0;
    while (acc >= FIXED_DT && n < 8) { tick(); acc -= FIXED_DT; n++; }
    // >>> CRAFT
    if (craftHub.active) craftHub.effects(ft); else
    // <<< CRAFT
    if (camera === 'side') {
      renderer.spawnSpray(sim, ft);
      renderer.stepParticles(ft);
      renderer.pushWake(sim, ft);
    } else {
      view3d.pushWake(sim, ft);
    }
  }

  // GL sea underneath, 2D craft/wake/ribbon on top, one camera driving both.
  const glOn = useGL && seaGL && camera !== 'side';
  glCanvas.classList.toggle('on', glOn);
  view3d.skipBackground = glOn;

  // >>> POSTFX
  // Hold the post framebuffer open across the whole frame, so the raid longships
  // and the rescue actors - which main.js draws BELOW, into what was the default
  // framebuffer - are smeared and vignetted with the sea instead of sitting crisp
  // on top of a blurred one. renderer.js leaves this off by default because
  // turning it on is this edit, and the matching applyPost() after the RAID block
  // is what this file then owes it.
  //
  // Scoped to the frame rather than set once: efoilCal.shot() calls seaGL.draw()
  // on its own and then readPixels, so a globally-true flag would hand it an
  // unresolved framebuffer. seaGL is nullable (see :52 and :55) - guard both ends.
  if (seaGL) seaGL.deferPost = true;
  // <<< POSTFX
  // >>> CRAFT
  if (craftHub.active) craftHub.draw(camera, ft); else
  // <<< CRAFT
  if (camera === 'side') {
    renderer.draw(sim, ft);
  } else {
    // >>> CAMDYN
    // The second half of the calibration gate: a camera imposed after load still kills the
    // dynamics, on the frame it appears and every frame after.
    if (window.__calCam) view3d.calInert = true;
    // <<< CAMDYN
    view3d.update(sim, Math.max(1 / 240, ft));
    // GL first: it owns the depth buffer and the background. The 2D overlay is
    // drawn afterwards on its own transparent canvas.
    if (glOn) {
      // A calibration camera, once set, OWNS the view until it is cleared. It
      // has to be redrawn every frame rather than drawn once and frozen: a
      // WebGL canvas without preserveDrawingBuffer is cleared as soon as it has
      // been composited, so a single draw followed by a frozen loop screenshots
      // as an empty canvas. Redrawing keeps the buffer valid whenever the
      // capture happens.
      const cc = window.__calCam;
      if (cc) seaGL.draw(sim, cc, cc.fov * DEG, 'chase');
      else seaGL.draw(sim, view3d.cam, view3d.fovY, view3d.mode);
      // The sea AND the craft now come off the GPU. All this layer still owes
      // is the depth ribbon - the one thing FPV cannot show honestly. A
      // calibration render wants the bare scene, nothing overlaid on it.
      if (!cc) view3d.drawRibbonOnly(sim);
    } else {
      view3d.draw(sim);
    }
  }
  // Frame counter for the headless render driver. It waits for this to advance
  // rather than sleeping a fixed interval - the sea and shadow passes need a
  // few frames to settle, and a sleep is either too short (captures a half-lit
  // scene) or too long (pays for every render).
  window.__frames = (window.__frames || 0) + 1;
  // >>> RESCUE
  // After the GL scene, same frame and depth buffer: people, boats, markers, HUD.
  // With a boat active the hub drew GL itself, side view included (merge 2026-09-17).
  const rcam = craftHub.active ? (window.__calCam || (camera === 'side' ? craftHub.camSide : view3d.cam))
    : (glOn ? (window.__calCam || view3d.cam) : null);
  if (rescue && rescue.active) rescue.frame(rcam);
  // <<< RESCUE
  // >>> OVERBOARD
  // The trip back draws its people, its markers and its HUD into the same frame and depth
  // buffer, with the camera that actually drew the scene - `rcam`, computed in the fence
  // immediately above, which is the same expression two of the fences below repeat verbatim.
  // It is READ here rather than recomputed, for the reason those two could have been.
  //
  // ⚠️ No other level is named in this fence, in this one or in the three others this file
  // carries for it. Two suites sweep main.js for a mention of their own level outside their
  // own fence and both of them went red on an earlier draft of these comments; the answer is
  // to reword the comment, which is what this is, and never to loosen the sweep.
  if (overboard && overboard.active) overboard.frame(rcam);
  // <<< OVERBOARD
  // >>> RAID
  // VIKING RAID (tr52): longships, crews and markers, same frame and depth buffer,
  // with the camera that actually drew the scene (boat side view included).
  if (raid && raid.active) {
    raid.frame(craftHub.active ? (window.__calCam || (camera === 'side' ? craftHub.camSide : view3d.cam))
      : (glOn ? (window.__calCam || view3d.cam) : null));
  }
  // <<< RAID
  // >>> SMUGGLE
  // The smugglers' craft, their sown crops and the level's markers: same frame, same depth
  // buffer, same camera the scene was actually drawn with - exactly as the RAID block above.
  if (smuggle && smuggle.active) {
    smuggle.frame(craftHub.active ? (window.__calCam || (camera === 'side' ? craftHub.camSide : view3d.cam))
      : (glOn ? (window.__calCam || view3d.cam) : null));
  }
  // <<< SMUGGLE
  // >>> STUNT
  // THE STUNT STAGE paints a DOM HUD and draws nothing into the frame - the course itself is
  // world geometry in the coast mesh, already drawn - so this takes no camera. It is here, in
  // frame() rather than tick(), for the reason the two fences above are: the HUD is repainted
  // once per FRAME, not eight times per frame at the fixed step.
  if (stunt && stunt.active) stunt.frame();
  // <<< STUNT
  // >>> JUICE
  // After every mode has drawn, so the feel layer is never painted over mid-frame. Under
  // ?cal= it has no elements to touch and returns immediately.
  juice.paint();
  // <<< JUICE

  // >>> POSTFX
  // Resolve the frame the sea, the craft and now the actors all drew into.
  // applyPost() returns false when nothing was pending (no GL, or the pass was
  // bypassed under ?cal=), so this is safe on every path - and clearing the flag
  // here is what keeps efoilCal.shot() on the ordinary, already-resolved route.
  if (seaGL) { seaGL.applyPost(); seaGL.deferPost = false; }
  // <<< POSTFX

  if (showCharts) telemetry.draw();

  hudClock += ft;
  // The throttle widget is repainted here as well as on every pointer event: a craft change or
  // a restart moves the LEVER without any pointer moving, and a strip still reading -100 after
  // the game has zeroed it is worse than no strip at all (tmp-tr82).
  if (hudClock > 0.05) { hudClock = 0; updateHud(); updateTouchUI(); }
  if (toastUntil && performance.now() > toastUntil) {
    $('#toast').classList.remove('on');
    toastUntil = 0;
  }
  // >>> WIREMUSIC
  // THE SCORE, once a frame and last of all. It draws nothing and reads nothing that has not
  // already stepped, so it cannot reach the sim hash, the replay or a single pixel. It runs
  // outside the `!paused` block on purpose: the master mute has to hold while the game is
  // paused, and a bed that stopped evolving on Escape would restart with a seam.
  // Under ?cal= and ?clean=1 score.ready is false and this returns on its first line.
  scoreFrame(ft);
  // <<< WIREMUSIC
  perf.frameEnd();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
const hud = {
  speed: $('#h-speed'), depth: $('#h-depth'), height: $('#h-height'),
  alpha: $('#h-alpha'), lw: $('#h-lw'), power: $('#h-power'), mode: $('#h-mode'),
  dldv: $('#h-dldv'), band: $('#h-band'), best: $('#h-best'), wipes: $('#h-wipes'),
  dist: $('#h-dist'), sig: $('#h-sig'), hash: $('#h-hash'), flow: $('#h-flow'),
  status: $('#h-status'), scheme: $('#h-scheme'), sea: $('#h-sea'),
};

function updateHud() {
  const s = sim.plant.state, st = sim.stats;
  const w = params.plant.mass * params.plant.g;
  hud.speed.textContent = (s.speed * 3.6).toFixed(1);
  hud.depth.textContent = (s.wingDepth * 100).toFixed(0);
  hud.height.textContent = (s.rideHeight * 100).toFixed(0);
  hud.alpha.textContent = (s.alpha / DEG).toFixed(1);
  hud.lw.textContent = (s.lift / w).toFixed(2);
  hud.power.textContent = (s.powerW / 1000).toFixed(2);
  hud.dist.textContent = st.distance.toFixed(0);
  hud.best.textContent = (st.bestFlightTicks / 120).toFixed(1);
  hud.wipes.textContent = st.wipeouts + (st.lastCause ? ' · ' + st.lastCause : '');
  reportWipeout(st);
  hud.band.textContent = sim.tick ? ((st.bandTicks / sim.tick) * 100).toFixed(0) : '0';
  hud.sig.textContent = sim.assist.signature + (sim.assist.isTrue ? ' · TRUE' : ' · ARCADE');
  hud.hash.textContent = sim.hash.hex;
  hud.scheme.textContent = live.mode + (live.tilt.on ? ' + tilt' : '');
  // Read the sim, not the intent. This said "poole-bay-modal" over a flat sea
  // for exactly as long as it was reporting the variable instead of the state.
  if (hud.sea) {
    hud.sea.textContent = sim.sea.stateName +
      (sim.sea.isFlat ? '' : ` · ${sim.sea.nActive} waves`);
  }
  // dL/dV as the fraction of bodyweight a 0.5 m/s wobble is worth (§2)
  hud.dldv.textContent = s.speed > 1
    ? `${s.dLdV.toFixed(0)} N/(m/s) · ±0.5 m/s = ${((s.dLdV * 0.5 / w) * 100).toFixed(0)}% weight`
    : '—';

  let mode = s.mode;
  if (s.mode === 'DOWN') mode = 'DOWN · ' + s.wipeoutCause;
  else if (s.ventilated) mode = 'VENTILATED';
  else if (s.stalled) mode = 'STALLED';
  hud.mode.textContent = mode;
  hud.mode.className = 'mode m-' + (s.mode === 'DOWN' ? 'down'
    : s.ventilated ? 'vent' : s.stalled ? 'stall' : s.mode.toLowerCase());

  let flow = '';
  for (let i = 0; i < 5; i++) flow += i < st.flow ? '█' : '░';
  hud.flow.textContent = flow;
  hud.flow.className = 'flow' + (st.inBand ? ' in' : '');

  hud.status.textContent = replaying ? 'REPLAY'
    : recorder.active ? 'REC ' + recorder.length
    : paused ? 'PAUSED' : '';
  hud.status.className = 'status' + (replaying ? ' rep' : recorder.active ? ' rec' : '');
  // >>> CRAFT
  craftHub.hud(hud);
  // <<< CRAFT
}

$('#testout').addEventListener('click', (e) => e.currentTarget.classList.remove('on'));

// ---------------------------------------------------------------------------
// CALIBRATION HARNESS
//
// Render the scene from an arbitrary real-world camera so a shot can be put
// side by side with the photograph it is meant to match. Every pier pass so far
// was built from a description and a single look, then shipped and corrected by
// the owner - which is how it took four rounds to discover the neck stands on
// arches. This makes the comparison measurable instead of remembered.
//
// Coordinates are the COAST frame from reference/coast.md §A: origin at
// Bournemouth Pier root, +X along-shore toward Boscombe, +Z seaward, Y up from
// mean sea level. The sim origin sits at coast (1170, 150), so the harness
// converts for you.
//
//   efoil.shot({ from:[coastX, y, coastZ], at:[coastX, y, coastZ], fov:52 })
// ---------------------------------------------------------------------------
// The sim origin in COAST coordinates. READ FROM COAST, never copied: this was
// duplicated as a literal 1170/150, and the moment the spawn moved to 230/300
// every calibration camera silently shifted 940 m and rendered empty sea. A
// constant that has to be kept in sync with another file will not be.
const COAST_ORIGIN = { x: COAST.startX, z: COAST.startZ };

// ---------------------------------------------------------------------------
// URL-DRIVEN CALIBRATION RENDER
//
// A render is fully specified by its address, so headless Chrome can produce one
// with a single command and no interaction:
//
//   chrome --headless=new --screenshot=out.png --window-size=W,H \
//     "http://localhost:8471/?cal=200,3.6,30;40,8,150;55&clean=1"
//
//   cal   = fromX,fromY,fromZ ; atX,atY,atZ ; fovDeg      (COAST coordinates)
//   clean = 1 hides the whole UI so the frame is nothing but the scene, which
//           is what gets composited against the photograph
//   hold  = 1 freezes the sim so the frame is reproducible
//
// This replaces reading the canvas back through the agent as base64 - the same
// comparison that used to cost a 20 KB round trip per view now costs a file.
function applyCalibrationURL() {
  const q = new URLSearchParams(location.search);
  const cal = q.get('cal');
  if (q.get('clean') === '1') document.body.classList.add('clean-render');
  // ?overcast=1 renders the flat grey day most of the reference footage was
  // shot in. Comparisons against a grey-day photograph are not meaningful
  // without it: sun glitter alone puts a strong edge on most of the sea, and
  // that shows up as the render being "too detailed" when it is really just
  // being sunny.
  if (q.get('overcast') !== null) OVERCAST.v = Math.min(1, Math.max(0, Number(q.get('overcast')) || 1));
  if (!cal) return false;

  const [fromS, atS, fovS] = cal.split(';');
  const nums = (s) => s.split(',').map(Number);
  const from = nums(fromS), at = nums(atS);
  const fov = fovS ? Number(fovS) : 52;
  if (from.length !== 3 || at.length !== 3 || from.some(isNaN) || at.some(isNaN)) {
    console.warn('cal= could not be parsed:', cal);
    return false;
  }

  setCamera('chase');            // ensures the GL canvas is the visible one
  // Freezing the SIM is fine and makes the shot reproducible; freezing the
  // RENDER LOOP is not - see the note in frame(). So stop the physics and let
  // the draw keep running.
  if (q.get('hold') === '1') window.__calFrozen = true;

  window.efoilCal.shot({ from, at, fov });   // sets __calCam via _lastCam
  window.__calCam = window.efoilCal._lastCam;
  window.__calReady = true;
  return true;
}

window.efoilCal = {
  // Camera spec in COAST coordinates -> rendered JPEG data URL.
  shot({ from, at, fov = 52, width = 560 }) {
    if (!seaGL || !seaGL.ok) return { error: 'no GL renderer' };
    const gl = seaGL.gl;
    const c = glCanvas;

    const fx = from[0] - COAST_ORIGIN.x, fz = from[2] - COAST_ORIGIN.z;
    const ax = at[0] - COAST_ORIGIN.x, az = at[2] - COAST_ORIGIN.z;
    const dx = ax - fx, dy = at[1] - from[1], dz = az - fz;
    const flat = Math.hypot(dx, dz);

    const cam = {
      x: fx, y: from[1], z: fz,
      yaw: Math.atan2(dz, dx),
      pitch: Math.atan2(dy, flat),
    };

    cam.fov = fov;
    this._lastCam = cam;
    seaGL.draw(sim, cam, fov * DEG, 'chase');

    const W = c.width, H = c.height;
    const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d');
    const img = o.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      const s = (H - 1 - y) * W * 4;
      img.data.set(px.subarray(s, s + W * 4), y * W * 4);
    }
    o.putImageData(img, 0, 0);
    const sm = document.createElement('canvas');
    sm.width = width; sm.height = Math.round(width * H / W);
    sm.getContext('2d').drawImage(off, 0, 0, sm.width, sm.height);
    return {
      data: sm.toDataURL('image/jpeg', 0.55).split(',')[1],
      cam: { ...cam, yawDeg: +(cam.yaw * 57.2958).toFixed(1), pitchDeg: +(cam.pitch * 57.2958).toFixed(1) },
      rangeToTarget: +Math.hypot(dx, dy, dz).toFixed(0),
    };
  },

  // Where does a coast-frame point land on screen, as a fraction of width and
  // height? Lets a known feature - the zip tower top, the head's landward
  // corner - be checked against the photograph numerically rather than by eye.
  // Must be called immediately after shot(), which sets the camera.
  where(coastPt) {
    const c = this._lastCam;
    if (!c) return { error: 'call shot() first' };
    const dx = (coastPt[0] - COAST_ORIGIN.x) - c.x;
    const dy = coastPt[1] - c.y;
    const dz = (coastPt[2] - COAST_ORIGIN.z) - c.z;
    // same basis as core.viewFromYawPitch
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const fwd = dx * cy + dz * sy;
    const right = -dx * sy + dz * cy;
    const depth = fwd * cp + dy * sp;
    const up = -fwd * sp + dy * cp;
    if (depth <= 0.05) return { onScreen: false, behindCamera: true };
    const aspect = seaGL.W / seaGL.H;
    const f = 1 / Math.tan((c.fov * DEG) / 2);
    return {
      onScreen: true,
      xPct: +(50 + 50 * (right / depth) * f / aspect).toFixed(1),
      yPct: +(50 - 50 * (up / depth) * f).toFixed(1),
      range: +Math.hypot(dx, dy, dz).toFixed(0),
    };
  },
};

// Console handle. This is a tuning rig - being able to drive the sim from
// devtools, step a fixed number of ticks and redraw is part of the job.
//   efoil.run(600)                      600 ticks at full throttle, then draw
//   efoil.run(300, {lean: 0.5, throttle: 0.4})
//   efoil.sim.plant.state               everything the HUD is reading
window.efoil = {
  sim, params, renderer, view3d, telemetry, panel, live, restart, selfTest, setCamera, setSea,
  seaGL, get glStatus() { return seaGL ? seaGL.status() : { ok: false, error: 'no renderer' }; },
  run(n = 120, input = { throttle: 1, boost: 1 }) {
    const raw = { lean: 0, turn: 0, throttle: 0, boost: 0, ...input };
    for (let i = 0; i < n; i++) {
      sim.step(raw, FIXED_DT);
      telemetry.push(sim.plant.state, params.plant.mass * params.plant.g);
      renderer.spawnSpray(sim, FIXED_DT);
      renderer.stepParticles(FIXED_DT);
      renderer.pushWake(sim, FIXED_DT);
      view3d.pushWake(sim, FIXED_DT);
    }
    if (camera === 'side') renderer.draw(sim, n * FIXED_DT);
    else { view3d.update(sim, n * FIXED_DT); view3d.draw(sim); }
    telemetry.draw();
    updateHud();
    return sim.plant.state;
  },
};

// Start angled toward the beach, not along it.
//
// The coast sits due shoreward of the start point. With heading 0 (along-shore,
// which is the pier-to-pier course) it lands at exactly 90 degrees to the
// camera, and the horizontal half-FOV is 46 - so the cliff, both piers and
// every groyne rendered correctly into a region of the world that was 44
// degrees off the edge of the screen. Turning shoreward puts it in frame; A/D
// still steers back along the course.
// FACING THE PIER. From the spawn at coast (230, 300) the pier tip bears -169
// degrees, the head -155 and the root -128, so -150 puts the whole 260 m length
// across the bow with the head roughly centred. Previously -55, which was
// chosen to bring the CLIFFS into frame from a spawn a kilometre away - and
// left the pier both behind the rider and out of the frustum.
sim.startHeading = -150 * DEG;
restart(true);

setSea(seaIndex, true);
setCamera(camera);
resize();
updateHud();
requestAnimationFrame(frame);

if (DEMO) {
  document.body.classList.add('demo');
  $('#help').classList.add('hidden');
  $('#panel').classList.add('hidden');
  showCharts = false;
  resize();
  showHint(isTouch
    ? 'Left pad to lean and steer &middot; right bar for throttle &middot; hold the foil in the band'
    : '<b>Move the mouse</b> to lean and steer &middot; '
      + '<b>scroll</b> for throttle &middot; <b>SPACE</b> pop-up '
      + '&mdash; <b>M</b> for keyboard, <b>H</b> help', 11000);
}

// >>> CRAFT
// ?craft=efoil|speedboat|jetski picks the craft at load (K cycles it, the bar
// under the view switcher picks it). Never on a ?cal= render.
window.efoil.craft = craftHub;
{
  const q = new URLSearchParams(location.search);
  const want = q.get('craft');
  if (want && want !== 'efoil' && !q.has('cal') && craftHub.select(want, true) && DEMO) {
    showHint(craftHub.hintText(), 11000);
  }
}
// <<< CRAFT

// ATTRACT MODE (2026-09-16). The front door used to open on the craft at rest,
// and at rest the plant floats at y = -0.20 m - board and foil 20 cm under
// water and invisible, so the first thing anyone saw was a man standing in the
// sea. The owner chose "open already up on the foil".
//
// This is an INPUT SOURCE, like ReplayInput - it drives the real sim through the
// same sample() path a player does, so no physics constant, no plant state and
// no gate is touched. It flies until the player's first genuine input, then
// hands over at the SAME throttle so they are not dropped off the foil.
//
// THE PILOT, MEASURED HEADLESS on the page's own default sea (poole-bay-modal,
// heading -150 deg; scripts in tmp-day/autopilot_*.mjs):
//  - The census's pilot (P on wing depth, gain 6, no damping) aimed at mid-band
//    wipes every few seconds even with its lag and wobble removed. Breach is the
//    only killer, and undamped gain porpoises into it.
//  - Depth-hold PD, kp 2 kd 0.6 at 0.24 m, straight: 0 DOWN transitions in a
//    600 s soak, in the band 50.4% of the time - it shows the mechanic, not just
//    a boat. But straight it covers 8 km in 10 min: gone from the scene in ~20 s,
//    and the pier head is 233 m off the start bow.
//  - So it CARVES: throttle 0.45, turn 0.35 after a 5 s run-up. 44 s laps, never
//    further than 216 m from spawn or 84 m toward the pier, ~40 km/h. Turning
//    costs stability - 3 DOWN in 300 s, the best of 9 throttle/turn pairs.
//  - Hence the reset: on a wipe (after 1.5 s, so it reads as a wipe and not a
//    glitch) or past 280 m, it quietly restarts from the pier-framed start.
// SKIPPED on ?cal= renders, so every measurement camera stays byte-identical,
// and absent on ?rig=1, so the kill-gate rig still starts at rest as before.
const ATTRACT = { depth: 0.24, kp: 2, kd: 0.6, throttle: 0.45, turn: 0.35,
  runUp: 5, resetAfterDown: 1.5, maxRange: 280, preroll: 5 };

class AttractPilot {
  constructor() { this.out = { lean: 0, turn: 0, throttle: 0, boost: 0 }; this.clear(); }
  clear() { this.lean = 0; this.prevErr = 0; this.t = 0; this.downFor = -1; }
  sample(dt) {
    const s = sim.plant.state;
    const err = (s.wingDepth ?? ATTRACT.depth) - ATTRACT.depth;
    const der = (err - this.prevErr) / dt; this.prevErr = err;
    const target = Math.max(-1, Math.min(1, err * ATTRACT.kp + der * ATTRACT.kd));
    this.lean += (target - this.lean) * 0.15;
    this.t += dt;
    const o = this.out;
    o.lean = this.lean; o.turn = this.t < ATTRACT.runUp ? 0 : ATTRACT.turn;
    o.throttle = ATTRACT.throttle; o.boost = 0;
    return o;
  }
  watch() {
    const s = sim.plant.state, w = sim.world;
    if (s.mode === 'DOWN') this.downFor = this.downFor < 0 ? 0 : this.downFor + FIXED_DT;
    else this.downFor = -1;
    if (this.downFor >= ATTRACT.resetAfterDown || Math.hypot(w.x, w.z) > ATTRACT.maxRange) startAttract();
  }
}

function startAttract() {
  restart(true);
  attract.clear();
  // >>> CRAFT
  if (craftHub.active) { craftHub.preroll(ATTRACT.preroll); return; }
  // <<< CRAFT
  const n = Math.round(ATTRACT.preroll / FIXED_DT);
  for (let i = 0; i < n; i++) {
    sim.step(attract.sample(FIXED_DT), FIXED_DT);
    renderer.spawnSpray(sim, FIXED_DT);
    renderer.stepParticles(FIXED_DT);
    renderer.pushWake(sim, FIXED_DT);
    view3d.pushWake(sim, FIXED_DT);
  }
}

if (DEMO && !new URLSearchParams(location.search).has('cal')) {
  attract = new AttractPilot();
  source = attract;
  startAttract();
  // Hand over on the first GENUINE input. Mouse movement needs 30 px of travel,
  // so the jitter of a hand resting on a mouse does not steal the demo.
  let travel = 0, lx = null, ly = null;
  const takeOver = () => {
    if (source !== attract) return;
    source = live;
    live.throttle = live.wheelThrottle = live._lastWheel = ATTRACT.throttle;
    attract = null;
    for (const [ev, fn] of handlers) window.removeEventListener(ev, fn, true);
  };
  const onMove = (e) => {
    if (lx !== null) travel += Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly);
    lx = e.clientX; ly = e.clientY;
    if (travel > 30) takeOver();
  };
  const handlers = [['mousemove', onMove], ['wheel', takeOver], ['keydown', takeOver],
    ['pointerdown', takeOver], ['touchstart', takeOver], ['gamepadconnected', takeOver]];
  for (const [ev, fn] of handlers) window.addEventListener(ev, fn, { capture: true, passive: true });
}

// A ?cal= address turns this page into a one-shot calibration render. Applied
// AFTER the first frame is scheduled so the GL context, sea and shadow map are
// all live before the calibration camera is imposed on them.
// >>> RESCUE
// RESCUE ARCADE MODE (tr42): ?mode=rescue, Shift+R, or the RESCUE MODE button on
// the front door. All of it lives in src/rescue/ and src/gl/rescue-actors.js;
// while the mode is off nothing of it ticks or draws.
const rescue = initRescue({
  sim, seaGL, FIXED_DT, toast, defaultSea: DEFAULT_PRESET,
  restart: () => restart(true),
  setSea: (name) => setSea(Math.max(0, SEA_NAMES.indexOf(name)), true),
  takeInput: (src) => { attract = null; replaying = null; source = src || live; },
});
// <<< RESCUE
// >>> RAID
// VIKING RAID ARCADE MODE (tr52): ?mode=raid, Shift+L, or the RAID MODE button on
// the front door. All of it lives in src/raid/ and src/gl/raid-actors.js; while
// the mode is off nothing of it ticks or draws. Mutually exclusive with rescue.
const raid = initRaid({
  sim, seaGL, FIXED_DT, toast, defaultSea: DEFAULT_PRESET, rescue, craft: craftHub, live,
  restart: () => restart(true),
  setSea: (name) => setSea(Math.max(0, SEA_NAMES.indexOf(name)), true),
  takeInput: (src) => { attract = null; replaying = null; source = src || live; },
});
// <<< RAID
// >>> SMUGGLE
// THE DORSET SMUGGLING RUN (tmp-tr170): ?mode=smuggle, Shift+J, or THE SMUGGLING RUN in the
// level picker. Constructed LAST of the three modes, so window.efoilRaid and
// window.efoilRescue already exist when it looks for them to stand down.
const smuggle = initSmuggle({
  sim, seaGL, FIXED_DT, toast, defaultSea: DEFAULT_PRESET, craft: craftHub, live,
  restart: () => restart(true),
  setSea: (name) => setSea(Math.max(0, SEA_NAMES.indexOf(name)), true),
  takeInput: (src) => { attract = null; replaying = null; source = src || live; },
});
// <<< SMUGGLE
// >>> STUNT
// THE STUNT STAGE (tmp-tr173): ?arena=stunt&mode=stunt, Shift+T, or THE STUNT STAGE in the
// level picker. Constructed LAST of the four modes, so every other mode's window handle
// already exists by the time this one looks for them to stand down. Same ctx shape as the
// three above it, so there is one contract between main.js and a level and not four.
const stunt = initStunt({
  sim, seaGL, FIXED_DT, toast, defaultSea: DEFAULT_PRESET, craft: craftHub, live,
  restart: () => restart(true),
  setSea: (name) => setSea(Math.max(0, SEA_NAMES.indexOf(name)), true),
  takeInput: (src) => { attract = null; replaying = null; source = src || live; },
});
// <<< STUNT
// >>> OVERBOARD
// THE TRIP BACK (tmp-tr197): ?mode=overboard, Shift+O, or THE TRIP BACK button. All of it
// lives in src/overboard/ plus src/gl/overboard-scene.js, and the scene creates no GL of its
// own - it fills the RescueActors instance that already exists in this build. Constructed
// LAST of the five levels, so every other level's window handle already exists by the time
// leaveOthers() looks for one to stand down. Same ctx shape as the four above it, so there is
// still one contract between main.js and a level and not five.
//
// ⚠️ It is NOT in the level picker. ui/levels.js is asserted at exactly seven rows by
// test-levels.mjs and at seven again by test-wire.mjs, both deliberately against literals so
// that an eighth is a decision and not a silent pass. Adding the row is that decision and is
// left to the integrator; the mode is fully reachable without it.
const overboard = initOverboard({
  sim, seaGL, FIXED_DT, toast, defaultSea: DEFAULT_PRESET, craft: craftHub, live,
  restart: () => restart(true),
  setSea: (name) => setSea(Math.max(0, SEA_NAMES.indexOf(name)), true),
  takeInput: (src) => { attract = null; replaying = null; source = src || live; },
});
// <<< OVERBOARD

requestAnimationFrame(() => applyCalibrationURL());

// Warm the paths a real restart will touch, so the first R is not the slow one.
runSelfTest(() => {});

// ---------------------------------------------------------------------------
// DEFAULT START (2026-09-18, owner: "on the phone can you make it automatically go full screen
// and start in jetski mode viking raid", then "can the game start in jetski viking mode" -
// the second ask dropped "on the phone", so the jetski + raid start is now EVERY device).
//
// The two halves are deliberately gated differently:
//   - jetski + raid          : every device, on a bare URL. This is the game's front door.
//   - fullscreen + landscape : TOUCH ONLY. Forcing a desktop browser full screen on load is
//                              hostile, and it needs a user gesture there anyway.
//
// A page cannot put ITSELF full screen - every browser demands a user gesture - so the FIRST
// touch does it, once, and that same touch still steers. iPhone Safari refuses element
// fullscreen outright; there the Add to Home Screen route (app.webmanifest + the apple-*
// meta tags) is the only way, and the attempt below simply does nothing.
// The raid and the jetski DO start on their own, unless the URL asked for something else.
// ?start=0 opts out and lands on the eFoil free ride (?phonestart=0 still works).
//
// The URL guards below are load-bearing, NOT politeness: the 19-view render corpus is shot
// with ?cal=...&clean=1&hold=1, so a raid must never start under it. The node harnesses
// (gate-check, test-raid/rescue/touch, the probes) import the modules directly and never
// load this page, so they are unaffected either way.
// ---------------------------------------------------------------------------
{
  const q = new URLSearchParams(location.search);
  const optedOut = q.get('start') === '0' || q.get('phonestart') === '0';
  const bare = !q.has('mode') && !q.has('craft') && !q.has('cal') && q.get('clean') !== '1';
  const wants = !optedOut && matchMedia('(pointer: coarse)').matches;   // fullscreen half
  // >>> STARTPICK
  // A BARE URL ASKS FIRST. This is an INSERTED BRANCH, not an edited condition: the line
  // below is character-for-character the line that shipped, and stays a pure insertion to
  // `git merge-file`. The `else` binds to that whole `if` statement, so the fullscreen half
  // that follows it is untouched and a touch player's first tap still takes the page full
  // screen - including the tap that picks a level.
  //
  // `startPick.armed` is STRICTLY NARROWER than `!optedOut && bare`: `bare` allows ?arena=,
  // ?raidfoe=, ?start= and ?phonestart=, and asksWhichLevel() does not. So every URL that
  // does NOT open the picker still reaches the line below and behaves exactly as it did -
  // ?cal= and ?clean=1 among them, which is what keeps the 25 judged views bit-identical.
  if (startPick.armed) {
    // >>> STARTCRAFT
    // THE START SCREEN RIDES A JETSKI. The `else` branch below - the old boot path - does
    // `craftHub.select('jetski')` and then `raid.enter()`. Inserting the picker in front of it
    // skipped BOTH, so a bare URL left the craft at hub.js's `kind = 'efoil'` default and the
    // demo behind the card was an eFoil. The owner saw that and said, reasonably, "I already
    // said I just want the jetski".
    //
    // So: take the craft select and LEAVE the raid.enter(). Selecting a craft is what the boot
    // always did; entering a level is the thing the start screen exists to stop doing for you.
    //
    // This also makes the flip at the level-pick call site a backstop rather than the fix. That
    // one reads `craftHub.kind === 'efoil'` and only fires from the start screen; with the craft
    // already a jetski it simply passes the jetski along. It stays, because a player who opens
    // the picker having deliberately switched to the eFoil must keep it - that IS a choice.
    //
    // Not under ?cal=: `startPick.armed` is false there, so this branch is unreachable on a
    // calibration render and the 25 judged views cannot see it.
    craftHub.select('jetski', true);
    // <<< STARTCRAFT
    startPick.open();
  } else
  // <<< STARTPICK
  if (!optedOut && bare) {
    requestAnimationFrame(() => {
      try {
        const t0 = performance.now();
        craftHub.select('jetski', true);
        const t1 = performance.now();
        performance.measure('boot:craftSelect', { start: t0, end: t1 });
        raid.enter();
        const t2 = performance.now();
        performance.measure('boot:raidEnter', { start: t1, end: t2 });
        applyTouchSettings();
        performance.measure('boot:touchSettings', { start: t2, end: performance.now() });
      } catch (e) { console.warn('[phone start]', e && e.message); }
    });
  }
  if (wants) {
    const goFull = () => {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
        Promise.resolve(req.call(el, { navigationUI: 'hide' })).then(() => {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
        }).catch(() => {});
      }
    };
    addEventListener('pointerdown', goFull, { once: true, capture: true });
  }
}
