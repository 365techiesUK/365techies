// PIER SURF - the controller main.js talks to (26 Sep 2026, stage 1: paddle out, duck-dive,
// catch, ride). Same shape as src/dolphinwatch/mode.js: one place owns enter/exit, everything
// it changes is saved and put back, and main.js holds three fenced hooks - initSurfer(ctx),
// S.tick() after each fixed step and S.frame(cam) after the GL scene.
//
// The tenth level: in the picker (last), and at ?mode=surfer. The 27 Sep 2026 revamp (tmp-audit/,
// the lead's plan) works through it in stages - stage 1, "really easy to play", is the prompts,
// the press buffer (surfboard.js popVerdict) and the paddle-back arrow below.
//
// Where: the EAST bank beside Bournemouth Pier (sea-surf.js ZONE_O +72), the side the local
// guides call the favourite. The waves are the sea's own shoaling train, not a spawner: this
// file only reads them to put the words on screen.
//
// Rules of tone (SPEC-SURF.md, gl/surfers.js): nobody is in danger, a wipeout is a tumble and a
// climb back on, nothing is branded, and the real beach's history is not mentioned.

import { SURF, surfSample, makeSurfSlot, shoreCoords, setFactor, fadeShift } from '../sea-surf.js';
import { DIR as PIER_DIR } from '../gl/pier.js';
import { PRONE, DUCK, RIDE, WIPE, BOARD } from '../boats/surfboard.js';
import { SurferHud } from './surfer-hud.js';
import { createReplay, packClip, unpackClip, REPLAY_MODEL } from './replay.js';
import { waveScore } from './judge.js';
import { SUIT_LOOKS, SKIN_TONES, HAIR_COLS } from '../gl/surfers.js';
import * as prog from '../ui/progress-store.js';
import { track } from '../ui/analytics.js';
import { scoreKey, dailyGoals, dailyState, dailyEvent, streakAfter, streakNow, BOARDS, boardState, boardEvent } from '../ui/scores.js';
import { buzz, hapticsOn, setHaptics } from './haptics.js';

const OTHER_MODES = ['rescue', 'raid', 'smuggle', 'stunt', 'overboard', 'dolphins'];
export const SURFRUN = {
  waves: 3,          // rides to win
  rideMin: 3.0,      // s standing for a ride to count
  side: 1,           // +1 east bank
  o: 66,             // m alongshore from the pier centreline
  inside: 38,        // m inside the break onset to start: a few lines of whitewater to get through
  // ...but the FIRST run of a visit starts nearer (27 Sep 2026, stage 1): a first-timer's first ride
  // came at a median 71 s, most of it paddling out through 38 m of whitewater (tmp-audit/ease/novice.mjs).
  // Still one line of whitewater to duck-dive: the lesson stays, the wait goes.
  insideFirst: 18,
  // HEATS (27 Sep 2026, stage 3). The first run of a visit is the lesson above (three waves). Every
  // PLAY AGAIN after it is a heat: four minutes, every ride scored 0-10 (judge.js waveScore), the best
  // two added up - as a contest is judged. A ride under way at the horn still counts.
  heatSec: 240, heatBest: 2, heatMinRide: 1.5,
  // Medals for the heat total. PROVISIONAL (from the judge lab's bots: two clean trimmed waves ~9, a
  // chi-driven surfer with turns ~14) - to be set after a human's heats on the Dell.
  medals: [['GOLD', 15], ['SILVER', 12], ['BRONZE', 8]],
  // THE SIZE (28 Sep 2026). The owner: "can we have much bigger waves in pier surf". THE big day, the sea's
  // own ceiling: the median wave at the peak 0.95 m amplitude (~1.9 m face), the sets ~3.5 m, breaking
  // further out (tmp-audit/bigwaves/sizes.mjs; it was 1.0: 0.26 m, the biggest ~1 m). Set on the way in
  // unless the address pins one (?surf=), and the player's own setting put back on the way out.
  surf: 3.0,
  // THE BIG DAY'S LESSON STARTS AT THE TAIL OF A SET (28 Sep 2026). A run starts the sea's clock at 0,
  // and 0-42 s is a set: on the big day that is 40 s of 2 m whitewater at the lesson's start, running
  // shoreward faster than anyone paddles - W alone went backwards, 26 m in 5 s (verify22, live b57).
  // Surfers wait for a lull to paddle out: from 39 s the last line or two of the set comes through
  // (~3 s of whitewater at the start - the duck-dive is still taught), then the lull to the peak
  // (tmp-audit/bigwaves/paddle.mjs). A lesson begun by entering the level (or re-placed by the level
  // picker) only: again() - the bench film's restart - and heats (in the line-up) keep sea time 0.
  bigLessonT: 39,
  endSec: 4,
};

// EVERY RIDE ENDING HAS A NAME (27 Sep 2026, stage 2): the board says why a ride ended (ride_end.why);
// the level says it in words. A kick-out is the banner's; a clipped pier and a short ride have their own.
export const END_WORDS = {
  closeout: 'CLOSED OUT - straighten out when it walls up',
  landing: 'BAD LANDING - come down facing down the face',
  rail: 'CAUGHT A RAIL - too hard a turn for your speed',
  falls: 'PITCHED FROM THE LIP - drop down the face, or be quicker',
  over_back: 'OVER THE BACK - the wave went on without you',
  outran: 'OUTRAN IT - it went flat ahead of you',
  shallows: 'IN THE SHALLOWS - paddle back out',
};
// What the level calls out as a ride's multiplier climbs (the board's judge: x2 / x3 / x4).
// EASY / NORMAL / REAL (27 Sep 2026, stage 3). The sim stays honest - the catch is the same physics
// on every level; what changes is the help (surfboard.js BOARD's assists) and the prompts:
//   EASY    set waves paddled for you (4 s), a nudge toward the pocket while you ride, a dive that
//           waits for the crest, the take-off press held 1.2 s, BACK TO THE PEAK from anywhere far
//   NORMAL  the press held 1.2 s, the dive waits for the crest, set waves called, BACK TO THE PEAK
//           once no wave will come (the build as it was before levels - the default)
//   REAL    no help at all: the press acts at once, no wave is called, you paddle back yourself,
//           and its first run paddles out the full distance (heats start in the line-up on every
//           level, as a contest does: you are out there when the horn goes)
// Personal bests are kept per level (scoreKey kind '<run>.<level>').
export const SURF_LEVELS = {
  easy: { name: 'EASY', spec: { popBuffer: 1.2, autoPaddle: 4, autoTrim: 0.3, duckWait: true }, grade: true, back: 'far',
    note: 'Set waves are paddled for you and your line is nudged toward the pocket.' },
  normal: { name: 'NORMAL', spec: { popBuffer: 1.2, autoPaddle: 0, autoTrim: 0, duckWait: true }, grade: true, back: 'dead',
    note: 'Set waves are called for you. BACK TO THE PEAK after a ride.' },
  real: { name: 'REAL', spec: { popBuffer: 0, autoPaddle: 0, autoTrim: 0, duckWait: false, risk: true }, grade: false, back: 'none',
    note: 'No help, and the wave can take you: closeouts, the lip, a caught rail.' },
};
export const SURF_LEVEL_DEFAULT = 'normal';

export const RIDE_CALL = { 2: '×2  NICE RIDE', 3: '×3  LONG RIDE!', 4: '×4  EPIC RIDE!' };

// Pier space <-> world, as gl/surfers.js does it.
const D0 = PIER_DIR[0], D1 = PIER_DIR[1];
function toWorld(s, o, out) { out[0] = s * D0 + o * D1 - 230; out[1] = s * D1 - o * D0 - 300; return out; }
const _w = [0, 0], _sc = {};
export function worldAt(d, o, out) {
  let s = d + 38;
  for (let i = 0; i < 8; i++) { toWorld(s, o, _w); shoreCoords(_w[0], _w[1], _sc); s += d - _sc.d; }
  return toWorld(s, o, out);
}
// THE NEXT SET (27 Sep 2026, stage 1): seconds until the set envelope is up again, from the same
// closed form the sea uses (setFactor) - 0 while a set is running. For "next set in N s".
export function nextSetIn(t, level = 0.8) {
  if (setFactor(t) >= level) return 0;
  for (let k = 1; k <= 240; k++) if (setFactor(t + k * 0.5) >= level) return k * 0.5;
  return null;
}
// The set-peak time, found from the real clock (gl/surfers.js T_SET_PEAK does the same).
const T_PEAK = (() => { let bt = 0, bv = -1; for (let t = 0; t < 1000; t += 0.5) { const v = setFactor(t); if (v > bv) { bv = v; bt = t; } } return bt; })();
// Outermost d in this column that breaks at the set peak: where the whitewater starts.
export function onsetAt(o, ctl) {
  const slot = makeSurfSlot(), p = [0, 0];
  for (let d = SURF.D_FADE1 + fadeShift(ctl) - 1; d > 8; d -= 2) {   // + the big day's reach
    worldAt(d, o, p);
    surfSample(p[0], p[1], T_PEAK, 0, ctl, slot);
    if (slot.brk > 0) return d;
  }
  return 60;
}

export function initSurfer(ctx) {
  const { sim, seaGL } = ctx;
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const isCal = q.has('cal');
  const mount = (typeof document !== 'undefined' && (document.querySelector('#stagewrap') || document.body)) || null;
  const S = {
    active: false, hud: null, runs: 0, lastSimTick: 0, prevCraft: null, prevSurf: null,
    run: null, onset: 0, arrow: null,
    get game() { return S.run; },
  };
  const probe = makeSurfSlot();
  // The level (EASY / NORMAL / REAL): remembered between visits; ?surflevel=real picks one for a link.
  { const want = q.get('surflevel') || prog.pref('surfLevel'); S.level = SURF_LEVELS[want] ? want : SURF_LEVEL_DEFAULT; }
  // THE INSTANT REPLAY (surfer/replay.js): every ride recorded, offered back after it ends, and the
  // run's best one kept for the summary card. The hub asks it for the frame while one plays.
  const RP = createReplay({ sim, hub: () => ctx.craft, mount });
  S.replay = RP;
  // A SOUND AND A BUZZ FOR EVERY REWARD (27 Sep 2026, stage 3): the board's own cue voice
  // (boats/surf-audio.js through EngineAudio.cue - no new AudioContext; silent when muted, ?sound=0,
  // ?cal, ?clean) and the phone's or pad's vibration (haptics.js - off under ?cal, ?clean, the film).
  const cue = (kind, arg) => { const au = ctx.craft && ctx.craft.audio; if (au && typeof au.cue === 'function') au.cue(kind, arg); };
  S.haptics = { on: hapticsOn, set: setHaptics };
  let wasReady = false, wasSet = false;

  const board = () => (ctx.craft && ctx.craft.hulls ? ctx.craft.hulls.surfboard : null);
  const tboost = () => (typeof document !== 'undefined' ? document.getElementById('tboost') : null);
  S.tbLabel = null;

  function spawn(lineup, first) {
    const ctl = sim.sea ? sim.sea.surfCtl : 1;
    S.onset = onsetAt(SURFRUN.o * SURFRUN.side, ctl);
    // PLAY AGAIN STARTS IN THE LINE-UP (27 Sep 2026, stage 3): the next ride came 85-95 s after a
    // restart, most of it paddling out again (tmp-audit/loop/lineup-start.mjs). The first run of a
    // visit keeps the paddle-out - it is the duck-dive lesson; again() (the bench's and the film
    // drivers' restart) keeps it too.
    if (lineup) {
      const k = worldAt(S.onset - 4, SURFRUN.o * SURFRUN.side, [0, 0]);
      sim.startX = k[0]; sim.startZ = k[1];
      sim.startHeading = -Math.PI / 2;       // facing the beach, waiting for a set
      return;
    }
    const isFirst = first !== undefined ? first : S.runs === 0;
    const p = worldAt(Math.max(24, S.onset - (isFirst && S.level !== 'real' ? SURFRUN.insideFirst : SURFRUN.inside)), SURFRUN.o * SURFRUN.side, [0, 0]);
    sim.startX = p[0]; sim.startZ = p[1];
    sim.startHeading = Math.PI / 2;          // seaward: +Z is offshore here
  }

  // (after ctx.restart(): the big day's first lesson starts at SURFRUN.bigLessonT on the sea's clock)
  function lessonClock() {
    if (!sim.sea || !(sim.sea.surfCtl > 2.4) || !S.run || S.run.kind !== 'lesson') return;
    sim.time = SURFRUN.bigLessonT;
    const B = board();
    if (B) { const n0 = B.crests; B.reset(B.x, B.z, B.heading, sim.sea, sim.time); B.crests = n0; }
    S.run.lastCrest = -1;
  }

  function newRun(brief, kind) {
    S.run = { phase: 'live', t: 0, waves: 0, goal: SURFRUN.waves, best: 0, bestPts: 0, score: 0, rides: [], ducks: 0, ducksClean: 0, washed: 0, wipes: 0, early: 0, events: [], endT: 0, lastCrest: -1,
      kind: kind || 'lesson', waveScores: [], heat: 0, surf: sim.sea ? sim.sea.surfCtl : 1, newBoards: [] };
    S.runs++;
    RP.reset();
    S.pb = prog.best(runKey());
    applyLevel();
    if (S.hud) { S.hud.hideOver(); if (brief) S.hud.showIntro(); }
  }

  // The run's table: the level, the surf size, the kind of run and the difficulty.
  // (the surf size the run STARTED at: '[' / ']' mid-run must not file it under another size - the b53 review)
  const runKey = () => scoreKey('surfer', S.run && S.run.surf !== undefined ? S.run.surf : sim.sea ? sim.sea.surfCtl : 1, `${S.run && S.run.kind === 'heat' ? 'heat' : 'waves3'}.${S.level}`);
  // The level's help, onto the board (a copy of BOARD: the base spec is never edited).
  function applyLevel() {
    const B = board();
    if (!B) return;
    B.spec = { ...BOARD, ...SURF_LEVELS[S.level].spec };
    if (sim.sea) B.gradeAmp = gradeAmp();
    if (S.hud) S.hud.setLevel(S.level, SURF_LEVELS);
  }
  function setLevel(id) {
    if (!SURF_LEVELS[id]) return;
    S.level = id;
    prog.pref('surfLevel', id);
    if (S.run) S.pb = prog.best(runKey());
    // Picked on the rules card before the first run has started: that run's start is the level's
    // (REAL paddles out the full distance) - the board is placed again (the b53 review).
    if (S.hud && S.hud.introOn && S.run && S.run.kind === 'lesson' && S.run.rides.length === 0 && S.runs === 1) {
      spawn(false, true);
      if (ctx.restart) ctx.restart();
      lessonClock();
      S.lastSimTick = sim.tick;
    }
    applyLevel();
  }

  // DAILY GOALS (27 Sep 2026, stage 6; ui/scores.js): the local day read ONCE as the level opens, so
  // midnight during a heat changes nothing. Progress and the streak kept through progress-store pref().
  const ymdOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function openDay() {
    const now = new Date(), yd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    S.ymd = ymdOf(now); S.yday = ymdOf(yd);
    S.daily = dailyState(prog.pref('daily'), S.ymd);
    S.streak = streakNow(prog.pref('streak'), S.ymd, S.yday);
    if (S.hud) S.hud.setDaily(S.daily, dailyGoals(S.ymd), S.streak);
  }
  // Before writing: what is kept now (another tab's goals and counts) merged in - done, the union;
  // counts, the larger (the b53 review: a tab loaded earlier wrote its own copy over the other's).
  function saveDaily() {
    const kept = dailyState(prog.pref('daily'), S.ymd);
    for (const id of kept.done) if (!S.daily.done.includes(id)) S.daily.done.push(id);
    for (const [k, v] of Object.entries(kept.c)) if (Number.isFinite(v) && !(S.daily.c[k] >= v)) S.daily.c[k] = v;
    prog.pref('daily', S.daily);
  }
  function goal(ev) {
    if (!S.daily || isCal) return;
    const hits = dailyEvent(S.daily, ev);
    // Every event that can move a count is kept (not only a finished goal - 2 of 'Ride 3 waves' is progress).
    if (hits.length || ev.type === 'duck_clean' || (ev.type === 'ride' && ev.ok)) saveDaily();
    if (!hits.length) return;
    for (const g of hits) { if (S.hud) S.hud.pop(`GOAL!  ${g.text}`, 'goal'); cue('pb'); buzz('wave'); }
    if (S.daily.done.length === S.daily.ids.length) {
      const st = streakAfter(prog.pref('streak'), S.ymd, S.yday);
      prog.pref('streak', st); S.streak = st.n;
      if (S.hud) S.hud.banner('TODAY\u2019S GOALS DONE', st.n > 1 ? `${st.n}-day streak - come back tomorrow for three more` : 'come back tomorrow for three more', 'good', 3200, true);
    }
    if (S.hud) S.hud.setDaily(S.daily, dailyGoals(S.ymd), S.streak);
  }
  S.goal = goal;

  // YOUR LOOK (27 Sep 2026, stage 4): suit, skin, hair or hood, and stance - on the rules card's
  // locker, kept through progress-store, handed to the renderer (gl/surfers.js playerLook) and to the
  // board (goofy: the figure's mirror()). Cosmetic only. Look 0 / skin 0 / hair 0 is the figure's own.
  const SUIT_NAMES = ['Black', 'Hooded winter black', 'Charcoal, navy chest', 'Blue rash vest', 'Shorty', 'Black, teal panel', 'Hooded olive', 'Grey rash vest'];
  const LOCKER = { suits: SUIT_LOOKS.map((s, i) => ({ c: s.c, name: SUIT_NAMES[i] || `Suit ${i + 1}` })), skin: SKIN_TONES, hair: HAIR_COLS };
  const ci = (v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0);
  {
    const L = prog.pref('look');
    const o = L && typeof L === 'object' ? L : {};
    S.look = { suit: ci(o.suit, SUIT_LOOKS.length), skin: ci(o.skin, SKIN_TONES.length), hair: ci(o.hair, HAIR_COLS.length),
      hood: o.hood === 'on' || o.hood === 'off' ? o.hood : 'auto', goofy: o.goofy === true ? 'true' : 'false' };
  }
  // The boards only once the renderer can draw them (gl/surfers.js setPlayerBoard); earned ones are kept either way.
  const boardsShown = () => { const SG = ctx.seaGL && ctx.seaGL.surfers; return !!(SG && typeof SG.setPlayerBoard === 'function'); };
  function applyLook() {
    const SG = ctx.seaGL && ctx.seaGL.surfers, L = S.look;
    LOCKER.boards = boardsShown() ? BOARDS : null;
    if (SG) SG.playerLook = S.active ? { suit: L.suit, skin: L.skin, hair: L.hair, hood: L.hood === 'on' ? true : L.hood === 'off' ? false : undefined } : null;
    const B = board(); if (B) { B.goofy = S.active && L.goofy === 'true'; if (B.fx) B.fx.goofy = B.goofy; }
    if (S.hud) S.hud.setLocker(LOCKER, L, S.boards);
    applyBoard();
  }
  function setLook(k, v) {
    const L = S.look;
    if (k === 'suit') L.suit = ci(+v, SUIT_LOOKS.length);
    else if (k === 'skin') L.skin = ci(+v, SKIN_TONES.length);
    else if (k === 'hair') L.hair = ci(+v, HAIR_COLS.length);
    else if (k === 'hood' && (v === 'auto' || v === 'on' || v === 'off')) L.hood = v;
    else if (k === 'goofy' && (v === 'true' || v === 'false')) L.goofy = v;
    else return;
    prog.pref('look', { ...L, goofy: L.goofy === 'true' });
    applyLook();
  }
  S.setLook = setLook;

  // UNLOCKABLE BOARDS (27 Sep 2026, stage 5; ui/scores.js BOARDS): the foamie from the start, the rest
  // earned - picked in the locker, handed to the renderer (gl/surfers.js setPlayerBoard, when it has it).
  S.boards = boardState(prog.pref('boards'));
  function applyBoard() {
    const SG = ctx.seaGL && ctx.seaGL.surfers;
    if (SG && typeof SG.setPlayerBoard === 'function') SG.setPlayerBoard(S.active ? { hull: S.boards.pick } : null);
  }
  function setBoard(id) {
    if (!S.boards.got.includes(id)) return;   // a locked board says what earns it; it is not a pick
    S.boards.pick = id; saveBoards(); applyBoard();
    if (S.hud) S.hud.setLocker(LOCKER, S.look, S.boards);
  }
  // (merged with what another tab kept before writing - union of the boards, this tab's pick)
  function saveBoards() {
    const kept = boardState(prog.pref('boards'));
    for (const id of kept.got) if (!S.boards.got.includes(id)) S.boards.got.push(id);
    prog.pref('boards', S.boards);
  }
  function unlocks(ev) {
    if (isCal) return;
    const got = boardEvent(S.boards, ev);
    if (!got.length) return;
    saveBoards();
    // The banner waits for the wave's (queued: it used to be replaced the same tick - the b53 review),
    // and the summary card says it too.
    if (boardsShown()) for (const b of got) { if (S.hud) S.hud.banner('NEW BOARD UNLOCKED', [b.name, 'pick it under YOUR LOOK'], 'good', 3200, true); if (S.run) S.run.newBoards.push(b.name); cue('pb'); buzz('wave'); }
    if (S.hud) S.hud.setLocker(LOCKER, S.look, S.boards);
  }
  S.setBoard = setBoard;

  // YOUR BEST-EVER RIDE (27 Sep 2026, stage 6): the highest-scoring counted ride at each surf size,
  // kept between visits (progress-store blob, its own key; three sizes at most) and offered as WATCH
  // YOUR BEST EVER on the rules card and the summary card. A clip from another model is dropped.
  const BEST_KEY = 'seafront.bestride.v1';
  const surfTag = () => (sim.sea ? sim.sea.surfCtl : 1).toFixed(1);
  function bestEver() {
    const all = prog.blob(BEST_KEY), o = all && all[surfTag()];
    const c = o ? unpackClip(o) : null;
    return c ? { clip: c, score: o.meta.score, d: o.d } : null;
  }
  function keepBest(clip) {
    if (!clip || !clip.ok || isCal) return false;
    // Filed under the size the ride was RIDDEN at (the clip says), not the size when the run ended.
    const tag = (clip.surf !== undefined ? clip.surf : sim.sea ? sim.sea.surfCtl : 1).toFixed(1);
    const all0 = prog.blob(BEST_KEY), old = all0 && all0[tag] ? unpackClip(all0[tag]) : null;
    if (old && old.score >= clip.score) return false;
    const all = all0 && typeof all0 === 'object' ? all0 : {};
    for (const k of Object.keys(all)) if (!all[k] || all[k].v !== REPLAY_MODEL) delete all[k];   // another model's: gone
    all[tag] = packClip(clip, { d: S.ymd || '' });
    const keys = Object.keys(all);
    if (keys.length > 3) for (const k of keys.filter((x) => x !== tag).slice(0, keys.length - 3)) delete all[k];
    return prog.blob(BEST_KEY, all);
  }
  S.bestEver = bestEver;
  function watchBestEver() { const b = bestEver(); if (b) RP.play(b.clip); }

  function leaveOthers() {
    if (typeof window === 'undefined') return;
    for (const k of ['efoilRaid', 'efoilSmuggle', 'efoilStunt', 'efoilOverboard', 'efoilWatch']) {
      const M = window[k]; if (M && M.active && M.exit) M.exit();
    }
    const Q = window.efoilRescue;
    if (Q && Q.active && typeof document !== 'undefined') { const b = document.querySelector('#rq-over [data-a=exit]'); if (b) b.click(); }
  }

  function enter() {
    if (S.active || isCal) return;
    if (!board()) { if (ctx.toast) ctx.toast('the surfboard is not in this build'); return; }
    leaveOthers();
    if (!S.hud && mount) S.hud = new SurferHud(mount, { onAgain: playAgain, onExit: () => exit(), onReplay: () => RP.play(RP.best), onBestEver: watchBestEver, onLook: (k, v) => (k === 'board' ? setBoard(v) : setLook(k, v)), onBack: () => backToPeak(), onSkip: () => skipToSet(), haptics: S.haptics, onLevel: setLevel });
    if (ctx.craft) ctx.craft.replay = RP;
    S.active = true;
    { const tb = tboost(); S.tbLabel = tb ? tb.innerHTML : null; }
    if (typeof document !== 'undefined') document.body.classList.add('surfer');
    if (ctx.setSea) ctx.setSea(ctx.defaultSea);
    // The waves have to be on. Put the player's own setting back on the way out.
    if (sim.sea && sim.setSurfSize) {
      S.prevSurf = sim.sea.surfCtl;
      const pinned = (() => { try { return /[?&]surf=/.test(location.search); } catch { return false; } })();
      if (!pinned || !(sim.sea.surfCtl >= 0.7)) sim.setSurfSize(SURFRUN.surf);
    }
    spawn();
    const c = ctx.craft;
    if (c) { S.prevCraft = c.kind; if (c.kind !== 'surfboard') c.select('surfboard', true); }
    if (ctx.takeInput) ctx.takeInput(null);
    openDay();
    newRun(true);
    if (S.hud) S.hud.setBestEver(bestEver());
    applyLook();
    if (ctx.restart) ctx.restart();
    lessonClock();
    applyLevel();
    S.lastSimTick = sim.tick;
    globalThis.__modeCraftSwitch = false;
    // THROUGH YOUR OWN EYES from the start (the owner, 26 Sep: "start the game where you're actually
    // on the board and the camera is where your eyes are"). C / the view bar still change it.
    S.prevCam = ctx.getCamera ? ctx.getCamera() : null;
    if (ctx.setCamera) ctx.setCamera('fpv');
    // The mouse steers, paddles and dives (input.js SURF_MOUSE) while the level is on.
    if (ctx.live) { ctx.live.surf = true; ctx.live.lockX = 0; }
  }

  function exit(quiet) {
    if (!S.active) return;
    S.active = false;
    RP.reset();
    const tb = tboost(); if (tb && S.tbLabel !== null) tb.innerHTML = S.tbLabel;
    if (tb) { tb.classList.remove('sf-go'); tb.classList.remove('sf-wait'); tb.classList.remove('sf-ring'); tb.style.removeProperty('--ring'); S._ring = 0; }
    if (typeof document !== 'undefined') { for (const c of ['surfer', 'sf-riding', 'sf-warn', 'pad', 'sf-veteran', 'sf-along']) document.body.classList.remove(c); }
    if (S.hud) { S.hud.hideOver(); S.hud.hideIntro(); }
    { const B = board(); if (B) B.spec = BOARD; }   // free ride: the board without a level's help
    applyLook();   // (S.active is false now: the renderer's default look, a regular stance)
    if (quiet === true) return;
    if (S.prevSurf !== null && sim.setSurfSize) sim.setSurfSize(S.prevSurf);
    sim.startX = 0; sim.startZ = 0; sim.startHeading = 0;
    if (ctx.setSea) ctx.setSea(ctx.defaultSea);
    if (ctx.takeInput) ctx.takeInput(null);
    const c = ctx.craft;
    if (c) c.select(S.prevCraft && S.prevCraft !== 'surfboard' ? S.prevCraft : 'efoil', true);
    if (ctx.restart) ctx.restart();
    globalThis.__modeCraftSwitch = false;
    if (ctx.setCamera && S.prevCam) ctx.setCamera(S.prevCam);
    if (ctx.live) { ctx.live.surf = false; ctx.live.lockX = 0; }
  }

  function again() {
    openDay();   // between runs, a new day is picked up (never mid-run - the b53 review)
    newRun();
    spawn();
    if (ctx.restart) ctx.restart();
    S.lastSimTick = sim.tick;
  }
  // The heat is over: its medal, then the card (S.frame shows it SURFRUN.endSec later).
  function heatOver() {
    const r = S.run;
    if (!r || r.phase === 'over') return;
    r.phase = 'over'; r.endT = r.t;
    const m = SURFRUN.medals.find(([, v]) => r.heat >= v);
    r.medal = m ? m[0] : null;
    goal({ type: 'heat', total: r.heat });
    // MEASURE WHETHER IT IS ADDICTIVE (stage 3): every heat, won or not - anonymous, consent-gated and a
    // no-op off the live site (ui/analytics.js track), like level_end.
    track('surf_heat', { score: Math.round(r.heat * 100), waves: r.waveScores.length, medal: r.medal || 'none', difficulty: S.level,
      surf: +(sim.sea ? sim.sea.surfCtl : 1).toFixed(1), runs: S.runs, first_ride_s: r.firstRideT === undefined ? -1 : Math.round(r.firstRideT) });
    unlocks({ type: 'heat', medal: r.medal });
    if (S.hud) S.hud.banner('HEAT OVER', `${r.heat.toFixed(2)}${r.medal ? `  ·  ${r.medal}` : ''}  ·  best two of ${r.waveScores.length} ${r.waveScores.length === 1 ? 'wave' : 'waves'}`, 'good', SURFRUN.endSec * 1000);
  }
  // PLAY AGAIN from the summary card or Enter: straight into the line-up (spawn above).
  function playAgain() {
    openDay();
    newRun(false, 'heat');
    spawn(true);
    if (ctx.restart) ctx.restart();
    S.lastSimTick = sim.tick;
  }

  // BACK TO THE PEAK (27 Sep 2026, stage 3). 55-80% of a session was paddling back out after a ride
  // (tmp-audit/feel); riding was 13% of it. After a ride, from anywhere no wave will come to, one press
  // (Q, or the pill) fades out and puts you back at the take-off spot facing the beach. The sea's clock
  // runs on - nothing is skipped but the paddle. The replay is told first, so no clip holds the jump.
  S.backAt = -1;
  function backOffered(B) {
    if (!S.run || S.run.phase !== 'live' || !B || B.state !== PRONE || S.backAt >= 0) return false;
    if (RP.playing() || (S.hud && (S.hud.introOn || S.hud.overOn))) return false;
    // REAL: you paddle (the arrow still shows the way). EASY: from anywhere far from the peak.
    const lv = SURF_LEVELS[S.level].back;
    if (lv === 'none') return false;
    const k = S.peak(); const far = Math.hypot(B.x - k[0], B.z - k[1]) > 25;
    if (lv === 'far') return far && (S.runs > 1 || S.run.rides.length > 0);
    return far && (S.arrow !== null || (S.run.rides.length > 0 && S.run.t - (S.run.lastEndT || -99) < 30));
  }
  function backToPeak() {
    const B = board();
    if (!backOffered(B)) return false;
    S.backAt = sim.time;
    if (S.hud) S.hud.fade(500);
    RP.flush();
    setTimeout(() => {
      const B2 = board();
      if (B2 && S.active && S.run && S.run.phase === 'live' && B2.state === PRONE) {
        const k = S.peak();
        const n0 = B2.crests;   // (kept: the one-wave-counts-once rule and the crest sound count on it)
        B2.reset(k[0], k[1], -Math.PI / 2, sim.sea, sim.time);
        B2.crests = n0;
        // ...and the last wave counted is forgotten: jumped out past it, its crest never crossed you, so the
        // next wave caught would carry the SAME crest number and be refused as "the same wave" (the review).
        S.run.lastCrest = -1;
        B2.cool = 0.3;
        RP.ring.clear();
        if (S.hud) S.hud.pop('BACK AT THE PEAK - wait for a set');
      }
      S.backAt = -1;
    }, 250);
    return true;
  }

  // ---- what just happened on the board, turned into words -----------------------------------
  function consume(B) {
    const r = S.run, hud = S.hud;
    for (const e of B.events) {
      switch (e.type) {
        case 'duck': r.ducks++; break;
        // RISK (REAL, stage 6): the warning, and getting out of it.
        case 'risk': if (hud) hud.pop(e.why === 'closeout' ? 'CLOSING OUT - STRAIGHTEN OUT!' : e.why === 'falls' ? 'THE LIP! - DROP DOWN' : 'EASE THE TURN!', 'bad'); buzz('ready'); break;
        case 'rode_out': if (hud) hud.pop('RODE IT OUT', 'mult'); break;
        // AIRS (stage 6): the lift-off's up-sweep; the landing's score comes as the AIR move's own pop.
        case 'air': cue('kickout'); buzz('ready'); break;
        case 'duck_clean': r.ducksClean++; cue('duck_clean'); buzz('duck_clean'); if (hud) hud.pop('CLEAN DUCK-DIVE'); goal({ type: 'duck_clean' }); break;
        // A wash just after a duck-dive came up is a dive that went too soon - say so (stage 1).
        case 'washed': r.washed++; buzz('washed'); if (hud) hud.pop(e.early ? 'TOO EARLY - you came up before it' : 'CAUGHT INSIDE', 'bad'); break;
        case 'early': r.early++; cue('early'); if (hud) hud.pop('TOO EARLY - keep paddling', 'bad'); break;
        case 'back_on': if (hud) hud.pop('BACK ON - paddle out'); break;
        case 'pearl': cue(e.why === 'falls' ? 'falls' : 'pearl', { why: e.why }); if (hud) hud.pop(e.why === 'falls' ? 'OVER THE FALLS - too late' : 'PEARLED - too late, nose under', 'bad'); break;
        // THE TAKE-OFF, graded (stage 2): a late drop is the best start there is, and says so.
        case 'popup': r.curMoves = []; cue('popup'); buzz('popup'); if (hud) hud.pop(e.grade === 'late' ? 'LATE DROP!  +100' : e.grade === 'foam' ? 'UP - now get onto the green face' : 'UP AND RIDING!'); break;
        // A MOVE, named and scored by the board's judge (surfer/judge.js) once it has banked - the
        // rider still up on the face 0.8 s after the turn. A new kind of move in the ride pays extra.
        case 'move': (r.curMoves || (r.curMoves = [])).push({ name: e.name, pts: (e.pts || 0) + (e.bonus || 0), t: e.t }); cue('move', { n: e.n || 1 }); buzz('move'); if (hud) hud.pop(`${e.name}  +${e.pts}${e.bonus ? `  · NEW MOVE +${e.bonus}` : ''}`, 'move'); break;
        case 'move_lost': cue('lost'); if (hud) hud.pop('LOST IT', 'bad'); break;
        case 'foam_drop': if (hud) hud.pop('IN THE WHITEWATER - get back on the face', 'bad'); break;
        case 'carve': if (hud) hud.pop(`${e.n > 1 ? `CARVE x${e.n}` : 'CARVE!'}  +${e.pts}`); break;
        // The multiplier climbing is the ride getting better: say so, the moment it does.
        case 'ride_mult': cue('ride_mult', { mult: e.mult }); buzz('ride_mult'); if (hud) hud.pop(RIDE_CALL[e.mult] || `×${e.mult}`, 'mult'); break;
        case 'wipe': r.wipes++; buzz('wipe'); break;
        case 'ride_end': {
          // ONE WAVE COUNTS ONCE (stage 1): standing up again on the same face after a kick-out is the
          // same wave (surfboard.js ride.crest) - the level was won 10 s after the first pop-up that way.
          const again = e.crest !== undefined && e.crest === r.lastCrest;
          // In a heat every ride of 1.5 s+ is judged, including one still going at the horn.
          const heat = r.kind === 'heat';
          const ok = heat ? e.secs >= SURFRUN.heatMinRide && (r.phase === 'live' || r.phase === 'horn') && !again
            : e.secs >= SURFRUN.rideMin && r.phase === 'live' && !again;
          if (again && e.secs >= SURFRUN.rideMin && hud) hud.pop('Same wave - catch a new one', 'bad');
          if (ok) r.lastCrest = e.crest;
          if (ok && r.firstRideT === undefined) r.firstRideT = Math.max(0, r.t - e.secs);   // (analytics: seconds to the first ride)
          r.lastEndT = r.t;
          const bestBefore = r.rides.reduce((m, x) => (x.ok ? Math.max(m, x.score) : m), 0);
          const nMoves = e.moves ? e.moves.length : (e.carves || 0);
          r.rides.push({ secs: e.secs, dist: e.dist, top: e.top, carves: nMoves, moves: e.moves || null, score: e.score, mult: e.mult, kick: e.kickPts > 0, why: e.why, ok });
          if (e.secs > r.best) r.best = e.secs;
          if (e.why === 'kickout') cue('kickout');
          if (e.why === 'closeout' || e.why === 'rail' || e.why === 'falls' || e.why === 'landing') cue('falls');   // REAL's falls, a bad landing (stage 6)
          goal({ type: 'ride', ok, secs: e.secs, score: e.score, mult: e.mult, kick: e.kickPts > 0, moves: (e.moves || []).map((m) => m.name) });
          unlocks({ type: 'ride', ok, mult: e.mult, moves: (e.moves || []).map((m) => m.name) });
          // A kick-out that did not go over the back pays nothing - say how to earn it.
          if (e.why === 'kickout' && !(e.kickPts > 0) && hud && e.secs >= 1) hud.pop('KICK OUT ON THE FACE - over the back pays a bonus', 'bad');
          if (ok && heat) {
            // THE WAVE'S SCORE, and the heat so far (the best two).
            const w = waveScore(e.score);
            r.waves++;
            r.waveScores.push(w);
            const best2 = r.waveScores.slice().sort((a, b) => b - a).slice(0, SURFRUN.heatBest);
            r.heat = Math.round(best2.reduce((m, x) => m + x, 0) * 100) / 100;
            r.score = Math.round(r.heat * 100);
            if (e.score > r.bestPts) r.bestPts = e.score;
            cue('wave'); buzz('wave');
            const names = (e.moves || []).map((m) => m.name).join(' · ');
            if (hud) hud.banner(`WAVE ${r.waves}:  ${w.toFixed(2)}`, [names || `${e.secs.toFixed(1)} s up`, e.kickPts > 0 ? 'clean kick-out' : `×${e.mult}`, `heat ${r.heat.toFixed(2)} (best two)`], 'good', 2800);
            if (r.phase === 'horn') heatOver();
          } else if (ok) {
            r.waves++;
            r.score += e.score;
            cue('wave'); buzz('wave');
            if (e.score > r.bestPts) r.bestPts = e.score;
            const cv = nMoves ? ` · ${nMoves} ${e.moves ? (nMoves === 1 ? 'move' : 'moves') : (nMoves === 1 ? 'carve' : 'carves')}` : '';
            const kk = e.kickPts > 0 ? ` · clean kick‑out +${e.kickPts}` : '';   // a non-breaking hyphen: it wrapped as 'kick- / out'
            const title = r.waves > 1 && e.score > bestBefore ? `BEST RIDE  +${e.score}` : `WAVE ${r.waves}  +${e.score}`;
            // Three chips: the ride, its moves (or its speed), the kick-out (or its length).
            if (hud) hud.banner(title, [`${e.secs.toFixed(1)} s up · ×${e.mult}`, nMoves ? cv.replace(/^ · /, '') : `top ${(e.top * 3.6).toFixed(0)} km/h`,
              kk ? kk.replace(/^ · /, '') : `${Math.round(e.dist)} m`], 'good', 2800);
            if (r.waves >= SURFRUN.waves) { r.phase = 'won'; r.endT = r.t; if (hud) hud.banner('SURF’S UP', `${SURFRUN.waves} waves at the pier`, 'good', SURFRUN.endSec * 1000); }
          } else if (r.phase === 'horn') {
            heatOver();
          } else if (hud && e.why !== 'pier') {
            hud.pop(e.secs < 1 ? 'It rolled away' : `Short one - ${e.secs.toFixed(1)} s`, 'bad');
          }
          if (hud && e.why === 'pier') hud.pop('CLIPPED THE PIER', 'bad');
          if (hud && END_WORDS[e.why] && e.secs >= 1) hud.pop(END_WORDS[e.why], 'bad');
          // The clip is cut a couple of seconds from now, once the end of the ride is recorded too.
          // The replay's highlight edit (surfer/replay.js planShots) cuts to the best of these moves.
          RP.rideEnded({ popT: e.t - e.secs, endT: e.t, why: e.why, score: e.score, secs: e.secs, mult: e.mult, wave: r.waves, ok, surf: sim.sea ? sim.sea.surfCtl : 1,
            moves: r.curMoves || [], zonePts: Math.round((e.zonePts || 0) + (e.latePts || 0)), kickPts: Math.round(e.kickPts || 0) });
          r.curMoves = [];
          break;
        }
        default: break;
      }
    }
    B.events.length = 0;
  }

  // ---- the one line of advice for right now ---------------------------------------------------
  function incomingAt(B, m) {
    // YOU ARE IN THE IMPACT ZONE: the water under you is breaking (brk depends on where you are,
    // not on the crest), and a crest is on its way to you. Checked FIRST, because a probe a few
    // metres out can be seaward of where the wave starts to break and see nothing coming -
    // MEASURED in the running game, 26 Sep: probe brk 0.06-0.16, board brk 0.70-0.90, and the
    // player was washed off with no warning at all.
    const w = B.wave;
    if (w.amp > 0.2 && w.brk > 0.5 && w.chi > (m > 6 ? -2.4 : -1.1) && w.chi < -0.05) return true;
    surfSample(B.x, B.z + m, sim.time, 0, sim.sea.surfCtl, probe);
    // brk 0.25, not 0.5: a wave that is only STARTING to break out there can be fully breaking by
    // the time it reaches you - that is exactly the peak - and it must still be warned about.
    return probe.brk > 0.25 && probe.chi > -1.4 && probe.chi < 0.2 && probe.amp > 0.2;
  }
  // ON A PHONE OR A TABLET (27 Sep 2026, the owner: "on the iPad ... there's no way of standing
  // up on the board ... it says press the space bar, but obviously a phone or an iPad don't have a
  // space bar"). The round button IS the space bar there - it always was - but every line below
  // named keys and mouse buttons, and the button said POP UP the moment a wave was under you,
  // before you were fast enough: tap it then and "too early" is all you get. So on a touch screen
  // the words name the touch controls, and the button only says POP UP when standing up will work.
  const touchUI = () => typeof document !== 'undefined' && document.body.classList.contains('touch');
  // The one test for "a pop-up now would stand you up" - the prompt and the button both use it, and
  // since stage 1 it IS the board's own verdict (surfboard.js popVerdict), so the cue can no longer
  // say POP UP to a press the board would pearl (22% of big-day cues did, tmp-audit/ease/window.mjs).
  const popReady = (B) => B.state === PRONE && B.popV === 'ok';
  // The names of the controls in use (stage 1): a gamepad player was told about SPACE and the mouse.
  const keyNames = () => (ctx.live && ctx.live.mode === 'gamepad'
    ? { pop: 'A', paddle: 'RT or stick up', steer: 'left stick' }
    : { pop: 'right click / SPACE', paddle: 'W / ↑', steer: 'A / D' });
  // WHERE WAVES COME (27 Sep 2026, stage 1). "Wait for a wave" used to be judged from the water under
  // you at this instant - true anywhere nothing was breaking, so after a ride that ended by the pier
  // or near the beach the level said WAIT where no wave would ever come (35 of 40 simulated quick
  // learners sat there ~200 s, tmp-audit/ease/stall.mjs). A good spot is on this bank, far enough
  // out, and where the set peak actually brings a wave (amplitude at the set-peak time).
  const spotSlot = makeSurfSlot(), spotSc = {};
  function goodSpot(B) {
    shoreCoords(B.x, B.z, spotSc);
    if (Math.abs(spotSc.o - SURFRUN.o * SURFRUN.side) >= 30 || spotSc.d <= 18) return false;
    surfSample(B.x, B.z, T_PEAK, 0, sim.sea.surfCtl, spotSlot);
    return spotSlot.amp >= 0.3;
  }
  // The take-off spot the arrow points to: just inside where the set peak starts to break (waiting at
  // onset - 4 m caught 68-71% of set waves against 53% at onset + 10, tmp-audit/ease/spot.mjs).
  // 'WAIT FOR THE SET' SKIP (27 Sep 2026, stage 6). Sitting at the peak facing in, with nothing coming
  // (no whitewater and no set wave within 30 m) and the next set more than 12 s off, one press (N, or the
  // pill) fades out and moves the clock on to 7 s before the set - exact, since the surf is closed-form
  // in time. Behind the fade: the board is re-seated on the new water (no false crest counted), the
  // replay ring is cut, the spray trail cleared. In a heat the heat clock runs on by the same amount:
  // a skip saves your patience, not the heat's time.
  S.skipAt = -1;
  const skipProbe = makeSurfSlot();
  function skipOffered(B) {
    if (!S.run || S.run.phase !== 'live' || !B || B.state !== PRONE || S.skipAt >= 0 || S.backAt >= 0 || !sim.sea) return false;
    if (RP.playing() || (S.hud && (S.hud.introOn || S.hud.overOn))) return false;
    if (!(-Math.sin(B.heading) > 0.35) || !goodSpot(B)) return false;
    const n = nextSetIn(sim.time);
    if (n === null || n < 12) return false;
    for (let d = 0; d <= 30; d += 10) {
      surfSample(B.x, B.z + d, sim.time, 0, sim.sea.surfCtl, skipProbe);
      if (skipProbe.brk > 0.2 || skipProbe.amp >= gradeAmp()) return false;
    }
    return true;
  }
  function skipToSet() {
    const B = board();
    if (!skipOffered(B)) return false;
    S.skipAt = sim.time;
    if (S.hud) S.hud.fade(600);
    RP.flush();
    setTimeout(() => {
      const B2 = board();
      const n = nextSetIn(sim.time);
      if (B2 && S.active && S.run && S.run.phase === 'live' && B2.state === PRONE && n !== null && n > 8) {
        const jump = n - 7;
        sim.time += jump;
        if (S.run.kind === 'heat') S.run.t += jump;
        const n0 = B2.crests;
        B2.reset(B2.x, B2.z, B2.heading, sim.sea, sim.time);   // on the new water; _chiPrev fresh
        B2.crests = n0; S.run.lastCrest = -1;   // (a new set: no wave from before the jump is under you)
        B2.cool = 0.3;
        RP.ring.clear();
        const bx = ctx.seaGL && ctx.seaGL.boats; if (bx && typeof bx.surfFxClear === 'function') bx.surfFxClear();
        if (S.hud) S.hud.pop('THE SET IS COMING - get ready');
      }
      S.skipAt = -1;
    }, 300);
    return true;
  }
  S.skipToSet = skipToSet;
  // (for tools: why the skip is or is not offered right now)
  S.skipWhy = () => {
    const B = board(); if (!B || !sim.sea) return 'no board';
    const n = nextSetIn(sim.time), o = [];
    for (let d = 0; d <= 30; d += 10) { surfSample(B.x, B.z + d, sim.time, 0, sim.sea.surfCtl, skipProbe); o.push(`${d}:${skipProbe.brk.toFixed(2)}/${skipProbe.amp.toFixed(2)}`); }
    return { state: B.state, facingIn: -Math.sin(B.heading) > 0.35, spot: goodSpot(B), next: n, grade: +gradeAmp().toFixed(2), probes: o.join(' '), offered: skipOffered(B) };
  };

  // S.home() stays as it was - the suite's bots and the film drivers use it.
  S.peak = () => worldAt(S.onset - 4, SURFRUN.o * SURFRUN.side, [0, 0]);
  // A SET WAVE: the amplitude that is worth paddling for, 0.85 of the set peak's at the take-off spot,
  // so the big day scales itself.
  let gradeCtl = null, gradeA = 0.4;
  function gradeAmp() {
    const ctl = sim.sea.surfCtl;
    if (ctl !== gradeCtl) { const k = S.peak(); surfSample(k[0], k[1], T_PEAK, 0, ctl, spotSlot); gradeA = 0.85 * spotSlot.amp; gradeCtl = ctl; }
    return gradeA;
  }
  // The open shoulder, as a bearing from the board's heading: along the shore AWAY from the curl.
  // B.wave.curlSide (the board's judge, surfer/judge.js): +1 = the breaking part is on the side the
  // world unit vector (alongX, alongZ) points to, -1 = the other; 0 off a ride (no arrow).
  function openShoulder(B) {
    const w = B.wave, cs = w && w.curlSide;
    if (!cs) return null;
    const ax = w.alongX !== undefined ? w.alongX : D1, az = w.alongZ !== undefined ? w.alongZ : -D0;
    const dx = -cs * ax, dz = -cs * az;
    let a = Math.atan2(dz, dx) - B.heading;
    while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }
  const bearingTo = (B, p) => { let a = Math.atan2(p[1] - B.z, p[0] - B.x) - B.heading; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  function advise(B) {
    const w = B.wave, facingIn = -Math.sin(B.heading) > 0.35, facingOut = Math.sin(B.heading) > 0.35;
    const T = touchUI(), K = keyNames();
    S.arrow = null;
    if (B.state === WIPE) return ['Off the board - climb back on…', 'warn'];
    if (B.state === DUCK) return ['Under it…', ''];
    if (B.state === RIDE) {
      // ALONG THE WAVE (stage 2): the first seconds of a ride point to the open shoulder - away from
      // where it is breaking (the judge's curlSide) - which is where the ride is. "Steer along the
      // wave" named no direction, and following it paid less than riding straight in on the foam.
      const along = openShoulder(B);
      if (along !== null && B.ride && B.time - B.ride.t0 < 2.5) { S.arrow = along; return [T ? 'ALONG THE WAVE - steer to the arrow' : `ALONG THE WAVE - steer to the arrow (${K.steer})`, 'good']; }
      // A SECTION (stage 6, S.frame): the breaking part closing on you - pump (the paddle control) to outrun it.
      if (S.section) return [T ? 'MAKE THE SECTION - pump! (paddle strip)' : `MAKE THE SECTION - pump! (${K.paddle})`, 'warn'];
      return [T ? 'RIDING - steer along the wave with your left thumb · KICK OUT to finish' : `RIDING - steer along the wave (${K.steer}) · ${K.pop} to kick out`, 'good'];
    }
    // Whitewater coming at you. A real duck-dive starts one or two body lengths before it hits,
    // so the NOW cue looks 4 m seaward - about a second at the ~3 m/s the whitewater closes on a
    // paddler it is already slowing - and the early warning looks 11 m out.
    // Ready to stand up comes FIRST: facing the beach and carried fast enough, the whitewater behind
    // you is the wave you are catching, and "Whitewater behind you!" over a green POP UP button
    // told the player two things at once (the iPad run, 27 Sep).
    if (popReady(B)) return [T ? 'POP UP! (tap POP UP)' : `POP UP! (${K.pop})`, 'good'];
    // Fast enough but the face is still too steep: a press now would pearl - hold (it is held for you).
    if (B.popV === 'pearl') return [T ? 'HOLD - too steep, wait a moment' : 'HOLD - too steep, wait a moment', 'warn'];
    if (B._popHold > 0) return ['WAIT FOR IT…', 'good'];
    if (incomingAt(B, 4)) return facingOut ? [T ? 'DUCK DIVE NOW! (tap DUCK DIVE)' : `DUCK DIVE NOW! (${K.pop})`, 'warn'] : [T ? 'Whitewater behind you - keep paddling, let it push you' : 'Whitewater behind you - keep paddling, let it push you', 'warn'];
    if (facingOut && incomingAt(B, 11)) return ['Whitewater coming - wait for it… then duck-dive', 'warn'];
    if (facingIn && w.face && w.amp > 0.25) return [T ? 'PADDLE! (paddle strip) - it is lifting you' : `PADDLE! (${K.paddle}) - it is lifting you`, 'good'];
    const spot = goodSpot(B);
    // GRADE THE WAVE (stage 1): 10 m out, 2-3 s before it lifts you - the old PADDLE! came as it was
    // already lifting you, and for waves too small to carry anyone.
    if (facingIn && spot && SURF_LEVELS[S.level].grade) {
      surfSample(B.x, B.z + 10, sim.time, 0, sim.sea.surfCtl, probe);
      if (probe.chi > -1.2 && probe.chi < -0.2 && probe.amp >= gradeAmp()) return [T ? 'SET WAVE - PADDLE NOW! (paddle strip)' : `SET WAVE - PADDLE NOW! (${K.paddle})`, 'good'];
      if (probe.chi > -1.2 && probe.chi < -0.2 && probe.amp > 0.25) return ['Small one - let it go, wait for the set', ''];
    }
    // Nowhere a wave will come: point the way back to the peak.
    if (!spot) {
      S.arrow = bearingTo(B, S.peak());
      return [T ? 'Paddle back to the peak - steer to the arrow and paddle' : `Paddle back to the peak - follow the arrow (${K.steer}, ${K.paddle})`, ''];
    }
    surfSample(B.x, B.z + 7, sim.time, 0, sim.sea.surfCtl, probe);
    const outside = w.brk < 0.02 && probe.brk < 0.02;
    if (outside && facingOut) return [T ? 'Outside the break - steer round to face the beach and wait for a wave' : `Outside the break - turn to the beach (${K.steer}) and wait for a wave`, ''];
    if (outside && facingIn) {
      const n = nextSetIn(sim.time);
      const when = n === 0 ? ' - the set is here' : n ? ` - next set in ${Math.ceil(n)} s` : '';
      return [T ? `Wait for a wave${when}. When one lifts you, paddle` : `Wait for a wave${when}. When one lifts you, paddle hard`, ''];
    }
    if (outside) return [T ? 'Keep turning to face the beach' : `Keep turning to face the beach (${K.steer})`, ''];
    if (facingOut) return [T ? 'Paddle out - duck-dive the whitewater (tap DUCK DIVE)' : `Paddle out (${K.paddle}) - duck-dive the whitewater (${K.pop})`, ''];
    return [T ? 'Steer round with your left thumb and paddle out to sea' : `Turn round and paddle out to sea (${K.steer})`, ''];
  }

  // ---- hooks main.js calls --------------------------------------------------------------------
  S.tick = function () {
    if (!S.run) return;
    if (typeof document !== 'undefined') {
      for (const k of OTHER_MODES) if (document.body.classList.contains(k)) { exit(true); return; }
    }
    if (sim.tick < S.lastSimTick) {
      if (globalThis.__modeCraftSwitch) globalThis.__modeCraftSwitch = false;
      // A restart (R, RESET, the pause menu's RESTART) in a heat starts the heat again - not the lesson.
      // again() itself stays the paddle-out (the Service Pass bench and the film drivers call it).
      else if (S.run && S.run.kind === 'heat') playAgain();
      else again();
    }
    S.lastSimTick = sim.tick;
    const c = ctx.craft;
    if (c && c.kind !== 'surfboard') {
      globalThis.__modeCraftSwitch = true;
      c.select('surfboard', true);
      if (ctx.toast) ctx.toast('PIER SURF is a surfboard level');
      S.lastSimTick = sim.tick;
      return;
    }
    const B = board();
    S.run.t += ctx.FIXED_DT;
    if (B && B.events.length) consume(B);
    // THE HORN: a heat's four minutes are up. A ride under way finishes first (and counts).
    const r = S.run;
    if (r.kind === 'heat' && r.phase === 'live' && r.t >= SURFRUN.heatSec) {
      cue('horn'); buzz('wave');
      if (B && B.state === RIDE) { r.phase = 'horn'; if (S.hud) S.hud.pop('HORN - finish this wave!', 'mult'); }
      else heatOver();
    }
    if (r.phase === 'horn' && (!B || B.state !== RIDE)) heatOver();   // the ride ended without a count
  };

  // WHERE THE RIDER IS ON SCREEN (27 Sep 2026, stage 3): a point 2.1 m above the board, projected
  // through the camera the hub last drew with (view3d.js project()'s maths, the hub's own lens). In
  // the HUD's CSS pixels; null when it is behind the lens (your own eyes) or too near an edge - a
  // callout then takes its usual place.
  const _an = { x: 0, y: 0 };
  function riderAnchor(B) {
    const c = ctx.craft && ctx.craft._lastCam, root = S.hud && S.hud.root;
    if (!c || c.fov === undefined || !root) return null;
    const W = root.clientWidth, H = root.clientHeight;
    if (!(W > 0 && H > 0)) return null;
    const dx = B.x - c.x, dy = (B.yDraw || 0) + 2.1 - c.y, dz = B.z - c.z;
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const fx = dx * cy + dz * sy, rz = -dx * sy + dz * cy;
    const fz = fx * cp + dy * sp, uy = -fx * sp + dy * cp;
    if (fz < 1.5) return null;
    const f = (H / 2) / Math.tan(c.fov / 2);
    _an.x = W / 2 + (rz / fz) * f; _an.y = H / 2 - (uy / fz) * f;
    if (_an.x < 90 || _an.x > W - 90 || _an.y < 70 || _an.y > H - 60) return null;
    return _an;
  }

  S.frame = function () {
    if (!S.run || !S.hud) return;
    const B = board();
    if (!B) return;
    // A replay on screen: the game is held, and none of the live HUD is showing.
    if (RP.playing()) return;
    RP.record(sim.time, B);
    S.hud.anchor = B.state === RIDE ? riderAnchor(B) : null;
    B.riskOn = S.run.waves >= 2;   // RISK (REAL): two waves of grace a run (surfboard.js BOARD.risk)
    if (sim.sea) B.gradeAmp = gradeAmp();   // EASY's auto-paddle grade follows a '[' / ']' surf change (cached)
    // SECTIONS YOU CAN READ (27 Sep 2026, stage 6): the level looks along the crest on the curl side
    // (the judge's curlSide / alongX / alongZ) at 4, 8 and 12 m; the nearest one breaking (brk 0.5) is
    // the section. It is called as it steps nearer - once, with the lip's hiss - and again only once
    // nothing breaks within 12 m, or after the foam. The judge's own curlDist sees 6 m (its probes),
    // too near to call in time. New players: called before 89% of their rides into the foam, a median
    // 0.9 s ahead (tmp-audit/stage3-me/sectioncheck2.mjs) - a break that starts beside you gets no warning.
    if (B.state === RIDE && B.wave.zone !== 'foam') {
      const w = B.wave, cs = w.curlSide || 1, ax = w.alongX !== undefined ? w.alongX : 1, az = w.alongZ !== undefined ? w.alongZ : 0;
      let near = Infinity;
      for (let d = 4; d <= 12; d += 4) { if (surfSample(B.x + cs * ax * d, B.z + cs * az * d, sim.time, 0, sim.sea.surfCtl, probe).brk >= 0.5) { near = d; break; } }
      // (not in a ride's first 1.5 s: at the take-off the curl is always beside you - that is the wave)
      if (!S.section && near < (S._near === undefined ? Infinity : S._near) && B.ride && B.time - B.ride.t0 > 1.5) { S.section = true; S.hud.section = true; S.hud.pop('SECTION!', 'section'); cue('section'); }
      else if (S.section && near === Infinity) S.section = false;
      S._near = near;
    } else { S.section = false; S._near = undefined; }
    S.hud.section = S.section;
    const [msg, kind] = advise(B);
    const ready = popReady(B), setCall = msg.startsWith('SET WAVE');
    if (ready && !wasReady) buzz('ready');
    if (setCall && !wasSet) cue('set');
    wasReady = ready; wasSet = setCall;
    S.hud.arrow = S.arrow;
    S.hud.back = backOffered(B);
    S.hud.skip = !S.hud.back && skipOffered(B);
    S.hud.pb = S.pb ? (S.run.kind === 'heat' ? (S.pb.s / 100).toFixed(2) : S.pb.s) : null;
    S.hud.heatSec = SURFRUN.heatSec;
    if (typeof document !== 'undefined') document.body.classList.toggle('sf-veteran', S.run.rides.length > 0);
    // The rules card names the controls in use: a gamepad gets its own line (surfer-hud.js li.pad).
    if (typeof document !== 'undefined') document.body.classList.toggle('pad', !!(ctx.live && ctx.live.mode === 'gamepad'));
    // A warning always shows. On a phone the REPLAY offer sits where the prompt goes, so while one
    // is up the offer steps aside for it (surfer/replay.js CSS) and comes back after, if still due.
    if (typeof document !== 'undefined') document.body.classList.toggle('sf-warn', kind === 'warn');
    S.hud.update(S.run, B, msg, kind);
    // THE BIG TOUCH BUTTON says what it will do right now (it is SPACE on a phone).
    const tb = tboost();
    if (tb) {
      const w = B.wave, facingIn = -Math.sin(B.heading) > 0.35;
      // POP UP only when a tap will stand you up (popReady - the same test as the prompt), green
      // and pulsing; while a wave is lifting you but you are not up to speed yet it says PADDLE,
      // because a tap then is "too early" (27 Sep 2026, the iPad report - see advise()).
      const ready = popReady(B);
      const lifting = B.state === PRONE && facingIn && w.face && w.amp > 0.12;
      // HOLD: fast enough but too steep, or a press being held (stage 1) - a tap now is not wasted,
      // but the button says the truth: not yet.
      const holding = B.state === PRONE && (B.popV === 'pearl' || B._popHold > 0);
      const lab = B.state === RIDE ? 'KICK<br>OUT' : ready ? 'POP<br>UP' : holding ? 'HOLD' : lifting ? 'PADDLE' : 'DUCK<br>DIVE';
      if (tb.innerHTML !== lab) tb.innerHTML = lab;
      tb.classList.toggle('sf-go', ready);
      tb.classList.toggle('sf-wait', (lifting || holding) && !ready);
      // THE TIMING RING (27 Sep 2026, stage 5): round the button, how near a wave has you to standing
      // speed (the board's u over its popU), from the moment one starts lifting you - and solid green
      // exactly when a tap stands you up (popReady, the same test as POP UP). Written only when it
      // moves 2% (a style write a frame is a layout a frame on an old iPad).
      const ring = ready ? 1 : lifting || holding ? Math.max(0, Math.min(0.98, B.u / B.spec.popU)) : 0;
      if (Math.abs(ring - (S._ring || 0)) >= 0.02 || (ring === 0) !== ((S._ring || 0) === 0) || (ring === 1) !== (S._ring === 1)) {
        tb.style.setProperty('--ring', ring.toFixed(2)); tb.classList.toggle('sf-ring', ring > 0); S._ring = ring;
      }
    }
    if ((S.run.phase === 'won' || S.run.phase === 'over') && S.run.t - S.run.endT > SURFRUN.endSec && !S.hud.overOn) {
      RP.offer(false);
      S.run.replayable = !!RP.best;
      // THE RUN IS KEPT (stage 3, ui/scores.js): a personal best and a local top ten per surf size.
      const ctl = sim.sea ? sim.sea.surfCtl : 1;
      const rides = S.run.rides.filter((x) => x.ok);
      const d = new Date();
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      // A heat keeps its total in hundredths (12.40 -> 1240) - its own table per level, apart from the lesson's.
      S.run.rec = prog.canStore() ? prog.record(runKey(), { s: S.run.score, w: S.run.waves, m: rides.reduce((m, x) => m + (x.carves || 0), 0), b: S.run.bestPts, d: day }) : null;
      S.run.level = SURF_LEVELS[S.level].name;
      S.run.recExtra = { score: S.run.score, runs: S.runs, pb: S.run.rec && S.run.rec.isPB ? 1 : 0, surf: +ctl.toFixed(1), kind: S.run.kind, medal: S.run.medal || 'none', difficulty: S.level };   // (not `level`: level_end's own field is the level's id)
      if (S.run.rec && S.run.rec.isPB) cue('pb');
      S.run.bestEverNew = keepBest(RP.best) === true;
      S.run.hasBestEver = !!bestEver();
      S.hud.showOver(S.run);
    }
  };

  // What the music reads (main.js musicState, SURFER fence): quieter while you wait, full while
  // you ride, and the pulse climbs with the waves you have ridden.
  S.musicState = function () {
    const B = board(), r = S.run;
    if (!B || !r) return {};
    const riding = B.state === RIDE ? 1 : 0;
    return { intensity: 0.35 + 0.65 * riding, pulse: Math.min(1, r.waves / SURFRUN.waves) };
  };

  S.enter = enter; S.exit = exit; S.again = again; S.playAgain = playAgain; S.backToPeak = backToPeak; S.setLevel = setLevel;
  S.board = board;
  // For probes and the film driver (tmp-tr201/film/shots/surf-driver.mjs): read-only views of the
  // sea the level already reads. Nothing here moves anything.
  const probe2 = makeSurfSlot(), sc2 = {};
  S.probe = (x, z) => surfSample(x, z, sim.time, 0, sim.sea.surfCtl, probe2);
  S.dAt = (x, z) => shoreCoords(x, z, sc2).d;
  S.home = () => worldAt(S.onset + 10, SURFRUN.o * SURFRUN.side, [0, 0]);
  S.pierward = Math.atan2(D0 * SURFRUN.side, -D1 * SURFRUN.side);   // along -o from this bank
  if (typeof addEventListener === 'function') {
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      // The press that ended a replay (main.js dismissBriefing) does nothing else.
      if (e.__briefingAte || RP.playing()) return;
      if (S.active && e.code === 'Enter' && S.hud && S.hud.overOn) playAgain();
      // Q: back to the peak after a ride (the pill says so while it is offered).
      if (S.active && e.code === 'KeyQ' && !e.repeat) backToPeak();
      // N: skip the wait for the next set (the pill says so while it is offered).
      if (S.active && e.code === 'KeyN' && !e.repeat) skipToSet();
      // X: watch the last ride again (or, on the summary card, the best one).
      if (S.active && e.code === 'KeyX' && !e.repeat) { if (RP.pending) RP.flush(); RP.play(S.hud && S.hud.overOn ? RP.best : RP.last); }
    });
  }
  if (!isCal && q.get('mode') === 'surfer') enter();
  if (typeof window !== 'undefined') window.efoilSurfer = S;
  return S;
}
