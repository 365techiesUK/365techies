// VIKING RAID - the controller main.js talks to (tr52; combat, sharks, feedback tr57).
//
// main.js holds four fenced // >>> RAID hooks: the import, raid.tick() after each
// fixed sim step, raid.frame(cam) after the GL scene is drawn, and initRaid(ctx) at
// the bottom (ctx now also carries the CraftHub and the live input hub). With the
// mode off, tick/frame are never called, no GL object is created, nothing is drawn
// and no dynamic obstacle is registered on the boats, so the default game renders
// byte-identically and the boats handle exactly as before.
//
// Ways in: ?mode=raid, Shift+L, or the RAID MODE button on the front door.
// tr128 FACTIONS: the same siege against a second, PIRATE fleet - ?mode=raid&raidfoe=pirate,
// the PIRATE RAID button on the front door, or window.efoilRaid.enter('pirate'). A run is one
// faction or the other and they are never mixed. Nothing about the rules, the pier, the fire,
// the sharks, the power-ups or the no-target guarantee changes: only the hulls, the hats and
// about thirty strings do.
// Ways out: Shift+L again, or FREE RIDE on the game-over card.
// Rescue and raid are mutually exclusive (see enter() and the Shift+R intercept).
// FIRE: hold Z or Q, the middle mouse button, gamepad X or RB, or the on-screen FIRE
// button (touch). Keys checked free against input.js, main.js, hub.js and rescue-mode.js.
// tr60 PIER SIEGE: WATER CANNON on its own control - hold X or N, gamepad Y (3) or LB (4),
// or the on-screen WATER button (touch). Z/N and pad 3/4 are unused by input.js (WASD,
// arrows, Space, pad 0/7), main.js (B C E F G H M P R T U V, digits, brackets, Comma,
// Period, Backslash, Escape), hub.js (K), rescue (Shift+R, Enter) and this file (Q X,
// Shift+L, Enter). The pier effects (src/gl/raid-pier.js) are built on first entry.
// Test/demo URL extras: &seed=<int>, &raidwave=<n>, &raidbot=1 (scripted pilot).

import { playerPose } from '../player-pose.js';
import { RaidGame } from './raid.js';
import { RaidHud, COPY } from './raid-hud.js';
import { raidPilot } from './pilot.js';
import { RaidActors, RaidScene } from '../gl/raid-actors.js';
import { RaidDriver } from './collide.js';
import { RaidAudio } from './raid-audio.js';
import { RaidPier } from '../gl/raid-pier.js';
import { pierAt, SECTIONS, sectionCentre } from './siege.js';
import { gateAt } from './gate.js';                          // tr145: the corsair level
import { TUNING } from './tuning.js';
import { ARENA_ON } from '../gl/arena-oldharry.js';
import { RAID_RANGES } from '../gl/pier.js';
import { enterHide, exitHide, hideRanges, decalRanges, FALL_SEC } from './hide-ranges.js';   // tr64: real gaps where a section falls
import { touchSettings } from '../input.js';                                    // tmp-tr82: fire auto | button

// tr60: start facing the pier head (the player starts at the sim origin, ~230 m off it)
const PIER_HEAD = pierAt(195, 6);
const SEA_HEADING = Math.atan2(PIER_HEAD[1], PIER_HEAD[0]);

// ---- tr145 THE CORSAIR LEVEL -----------------------------------------------------------------
// WHICH LEVEL, AND WHY IT IS THE ARENA FLAG AND NOT A SECOND ONE. The Old Harry landform is
// appended to the coast mesh at BUILD time behind ?arena=oldharry (gl/arena-oldharry.js), so the
// geometry is a page-load decision and cannot be turned on mid-session. Reading the SAME flag
// for the rules means the level can never be played in a world with no chalk in it, and there is
// no second switch to get out of step. The rules themselves take it as an option (RaidGame
// opts.level) and never read a URL, so a headless suite can build either level with no
// environment at all.
const LEVEL = ARENA_ON ? 'gate' : 'pier';
// Where the player is put down, and which way she is looking. In GATE coordinates (gate.js):
// `run` metres inside the line, `off` metres out along the channel from the Old Harry stacks.
const GATE_ENTRY = gateAt(TUNING.gate.entry.run, TUNING.gate.entry.off);
const GATE_HEADING = TUNING.gate.entry.heading;
// tr69 (owner: "the keys to fire and water seem difficult"): FIRE moved to Z and WATER to X,
// side by side under the left hand. Q and N stay as alternates; they were the old bindings.
const FIRE_KEYS = new Set(['KeyZ', 'KeyQ']);
const WATER_KEYS = new Set(['KeyX', 'KeyN']);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function initRaid(ctx) {
  const { sim, seaGL, FIXED_DT } = ctx;
  const q = new URLSearchParams(location.search);
  const isCal = q.has('cal');
  const seed0 = q.has('seed') ? (Number(q.get('seed')) >>> 0) : undefined;
  const startWave = Math.max(1, Number(q.get('raidwave')) || 1);
  const bot = q.get('raidbot') === '1';
  // tr128: which faction this session enters with. ?raidfoe=pirate, the PIRATE RAID button on
  // the front door, or R.enter('pirate'). ONE RUN, ONE FLEET - longships and brigs never mix.
  // tr145: the corsair level is fought against the corsairs, so the arena flag implies the
  // faction. ?raidfoe= still wins if it is given, which is what keeps the existing tests honest.
  const foe0 = COPY[q.get('raidfoe')] ? q.get('raidfoe') : (LEVEL === 'gate' ? 'pirate' : 'norse');
  const mount = document.querySelector('#stagewrap') || document.body;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const R = {
    active: false, game: null, actors: null, scene: new RaidScene(), hud: null, driver: null, audio: null,
    runs: 0, lastSimTick: 0, prevHeading: sim.startHeading, stats: null, shake: 0, botOut: null, foe: foe0,
    keys: new Set(), mouseFire: false, touchFire: false, padFire: false, frameMs: 0,
    wkeys: new Set(), touchWater: false, pierFx: null, crackleT: 0, bannerFall: -1,
  };

  const seedFor = (run) => ((seed0 ?? 0x7a1d0789) + run * 7919) >>> 0;
  const hullOf = () => { const c = ctx.craft; return c && c.active ? c.hull : null; };

  function newRun() {
    if (R.driver) R.driver.clear();
    R.game = new RaidGame({ seed: seedFor(R.runs), startWave, foe: R.foe, level: LEVEL });
    R.driver = new RaidDriver(R.game, ctx.craft ? (l, b, st) => ctx.craft.raidHook(l, b, st) : null);
    R.runs++;
    R.lastLandTick = -1; R.bossSunkTick = -1; R.barrageShown = -1;
    R.scene.reset();
    if (R.pierFx) { R.pierFx.parts.length = 0; R.pierFx.falls.length = 0; R.pierFx.sp.clear(); }
    R.hud.hideOver();
    consumeEvents();
    R.downBits = -1; updateHidden();   // tr64: a new run rebuilds the pier, so nothing is hidden but the crowd
  }

  function leaveRescue() {
    const r = ctx.rescue;
    if (r && r.active) { const b = document.querySelector('#rq-over [data-a=exit]'); if (b) b.click(); }
  }

  function enter(foe) {
    if (R.active) return;
    leaveRescue();
    // tr128: the faction is a property of the RUN. Only the faction in play has its hulls,
    // sails, swimmers and ladder boarders built, so a Viking raid pays nothing for the
    // pirates and neither costs anything against the static world (built on entry, tmp-tr51).
    if (COPY[foe]) R.foe = foe;
    if (!R.hud) R.hud = makeHud();
    if (R.hud.foe !== R.foe) R.hud.setFoe(R.foe);
    if (R.hud.level !== LEVEL) R.hud.setLevel(LEVEL);
    if (!R.audio || R.audio.foe !== R.foe) {
      const t0 = performance.now();
      R.audio = new RaidAudio(R.foe);
      performance.measure('raid:audio', { start: t0, end: performance.now() });
    }
    if (seaGL && (!R.actors || R.actors.foe !== R.foe)) {
      try {
        const t0 = performance.now();
        R.actors = new RaidActors(seaGL.gl, R.foe);
        performance.measure('raid:actors', { start: t0, end: performance.now() });
      } catch (e) { console.warn('[raid] actors failed:', e.message); }
    }
    if (seaGL && (!R.pierFx || R.pierFx.foe !== R.foe)) {
      // The default branch is spelled out in full on purpose: tmp-tr66/test-raid.mjs asserts
      // this exact source line to prove the pier effects (and their sprite atlas) are built
      // HERE, on entry, and never at module load. tr128 adds a faction to it, not a new path.
      try {
        const t0 = performance.now();
        if (R.foe === 'pirate') R.pierFx = new RaidPier(seaGL.gl, 'pirate');
        else R.pierFx = new RaidPier(seaGL.gl);
        performance.measure('raid:pierFx', { start: t0, end: performance.now() });
      } catch (e) { console.warn('[raid] pier effects failed:', e.message); }
    }
    R.active = true;
    // The pier has been evacuated: hide the pier crowd while the raid runs, and hide each
    // section's own above-deck range once it has collapsed, so a fallen section is a REAL GAP
    // (craft.js / renderer.js // >>> RAID skip these ranges; all cleared again in exit()).
    // tr64: entering permutes the pier's slice of the index buffer so each section is one
    // range; exit() puts the original back. With no GL, or if the swap fails, it falls back to
    // the crowd's un-permuted range, which is exactly what tr63 did.
    const tHide = performance.now();
    R.hide = seaGL && seaGL.coast ? enterHide(seaGL.coast) : null;
    performance.measure('raid:enterHide', { start: tHide, end: performance.now() });
    R.downBits = -1;
    updateHidden();
    document.body.classList.add('raid');
    R.prevHeading = sim.startHeading;
    R.prevStart = [sim.startX, sim.startZ];
    // ⚠️ INSTANT ENTRY. Old Harry is 8.6 km from the frame origin and the owner must not have to
    // ride there. COAST.startX/startZ is the FRAME ORIGIN and must not move (tmp-tr138/ARCH.md
    // section 4: a dozen modules read it, and main.js carries a scar about a duplicated spawn
    // literal shifting every calibration camera by 940 m). So the SPAWN moves instead, through
    // sim.startX/startZ - the exact pattern sim.startHeading has used since tr60 - and the
    // ctx.restart() two lines down, which was already going to happen, puts the rider (or,
    // through boats/hub.js, the boat) down there. There is no ride and no loading step.
    if (LEVEL === 'gate') { sim.startX = GATE_ENTRY[0]; sim.startZ = GATE_ENTRY[1]; sim.startHeading = GATE_HEADING; }
    else sim.startHeading = SEA_HEADING;
    // >>> PILOT
    // tmp-tr177: the pilot is handed the active hull so its stuck check can read the hull's
    // own `wet` / `propWet` / `airTicks` and tell AGROUND from merely slow. `hullOf()` is the
    // same accessor R.driver.tick() already uses on the two lines below and returns null on
    // the eFoil; the pilot treats a missing hull as "no opinion" and behaves as before.
    // Called per sample, not captured, so a mid-run craft change is picked up.
    ctx.takeInput(bot ? { sample: () => (R.botOut = raidPilot(sim, R.game, hullOf())) } : null);
    // <<< PILOT
    ctx.restart();
    R.lastSimTick = sim.tick;
    newRun();
    if (ctx.toast) ctx.toast(LEVEL === 'gate' ? R.hud.G.toast : R.hud.C.toast);
  }

  function exit() {
    if (!R.active) return;
    R.active = false;
    globalThis.__raidHideRanges = null;
    globalThis.__raidDecalRanges = null;   // >>> DECALTIER <<<
    if (seaGL && seaGL.coast) exitHide(seaGL.coast);
    R.hide = null; R.downBits = -1;
    if (R.driver) R.driver.clear();
    if (ctx.craft && ctx.craft.raidHook) ctx.craft.raidHook(null, 0, 0);
    document.body.classList.remove('raid');
    R.hud.hideOver();
    unshake();
    sim.startHeading = R.prevHeading;
    if (R.prevStart) { sim.startX = R.prevStart[0]; sim.startZ = R.prevStart[1]; R.prevStart = null; }
    ctx.setSea(ctx.defaultSea);
    ctx.takeInput(null);
    ctx.restart();
  }

  function again() { ctx.restart(); R.lastSimTick = sim.tick; newRun(); }

  function makeHud() {
    return new RaidHud(mount, { onEnter: () => enter(R.foe), onAgain: again, onExit: exit, foe: R.foe, lives: Math.max(new RaidGame().T.finalWave, startWave), onFire: (v) => { R.touchFire = v; }, onWater: (v) => { R.touchWater = v; } });
  }

  // ---- feedback ---------------------------------------------------------------
  const kick = (a) => { R.shake = Math.max(R.shake, Math.min(1, a)); };
  const canvases = () => [document.querySelector('#gl'), document.querySelector('#view')].filter(Boolean);
  function unshake() { for (const c of canvases()) c.style.transform = ''; R.shake = 0; }
  const vol = (x, z) => { const p = R.game.player; return clamp(1 - Math.hypot(x - p.x, z - p.z) / 260, 0.12, 1); };

  function consumeEvents() {
    const g = R.game, hud = R.hud, au = R.audio, sc = R.scene;
    const fx = R.pierFx;
    // tr145: the corsair level's own words where it has them, the faction's everywhere else.
    // GATE_COPY is a separate table, so this never widens COPY's two faction rows.
    const CG = (k) => (LEVEL === 'gate' && hud.G[k] !== undefined ? hud.G[k] : hud.C[k]);
    for (const e of g.events) {
      sc.onEvent(e, g);
      if (fx) fx.onEvent(e, g);
      const snd = (name, v = 1) => { if (au) au.play(name, v); };
      switch (e.type) {
        case 'wave':
          if (sim.sea.stateName !== e.sea) ctx.setSea(e.sea);
          if (e.n !== g.firstWave) hud.banner(g, `WAVE ${e.n}`, e.boss ? hud.C.bossComing : `${e.quota} ${hud.C.shipsLc} · ${e.sharks} ${e.sharks === 1 ? 'shark' : 'sharks'}`, 'wave', g.T.bannerSec);
          snd('horn');
          break;
        case 'boss':
          hud.banner(g, hud.C.bossBanner, 'she is making for the pier head with a fire barrage', 'boss', 3.0);
          snd('bosshorn'); kick(0.45);
          break;
        case 'fire':
          snd(e.kind === 'ball' ? 'cannon' : e.kind, 1);
          if (e.kind === 'ball') kick(0.12);
          break;
        case 'boom': snd('boom', vol(e.x, e.z)); if (vol(e.x, e.z) > 0.7) kick(0.18); break;
        case 'hit':
          if (e.how === 'ram') { snd('thud', 1); snd('crack', 1); kick(0.55); }
          if (e.points) hud.fly(e.x, e.y + 3, e.z, `+${e.points}`, 'hit');
          break;
        case 'sink': {
          const s = g.ships.find((q) => q.id === e.ship);
          hud.fly(e.x, 8 * (s ? s.L / 16 : 1), e.z, `+${e.points}`, 'big');
          if (e.kind !== 'boss') hud.pop(e.kind === 'jarl' ? hud.C.kindSunk : 'SUNK!');
          snd('bigsplash', vol(e.x, e.z)); snd('cheer', 0.8); kick(0.35 + 0.3 * vol(e.x, e.z));
          break;
        }
        case 'bossSunk':
          R.bossSunkTick = e.tick;
          hud.banner(g, 'FLAGSHIP SUNK!', `${hud.C.bossSunkSub} · +${e.points}`, 'win', 3.2);
          snd('bosssunk'); snd('cheer', 1.2); kick(1);
          break;
        case 'combo':
          snd('combo', e.n);
          if (e.n === 3 || e.n === 5 || e.n % 4 === 0) hud.pop(`COMBO ${e.n}! ×${e.mult.toFixed(2).replace(/\.?0+$/, '')}`, 'combo');
          break;
        case 'splash': if (vol(e.x, e.z) > 0.2) snd('splash', vol(e.x, e.z) * (e.size ? 1 : 0.5)); break;
        case 'throw': snd('throw', vol(e.x, e.z)); break;
        case 'hurt':
          hud.flash(''); snd('hurt', e.heavy ? 1.2 : 0.8); kick(e.heavy ? 0.8 : 0.35);
          hud.fly(g.player.x, 2.5, g.player.z, `-${e.dmg}`, 'bad');
          if (e.heavy) hud.pop(e.craft === 'efoil' ? 'KNOCKED OFF!' : 'STALLED!', 'bad');
          break;
        case 'deflect': hud.flash('cyan'); snd('shield'); break;
        case 'swamped':
          hud.banner(g, 'SWAMPED!', 'back in the fight in a moment', 'landed', 2.0);
          snd('landed'); kick(0.6);
          break;
        case 'moored':
          hud.pop(`MOORED AT ${SECTIONS[e.section].short}!`, 'bad');
          snd('moor', vol(e.x, e.z)); kick(0.15);
          break;
        case 'ignite':
          if (e.how !== 'spread' || g.time - (R.igniteT || -9) > 4) { R.igniteT = g.time; hud.pop(`${SECTIONS[e.section].short} ALIGHT!`, 'bad'); }
          { const c = sectionCentre(e.section); snd('whoomph', vol(c.x, c.z)); }
          break;
        case 'smash': snd('smash', vol(e.x, e.z) * (e.kind === 'pot' ? 1 : e.kind === 'shot' ? 0.95 : 0.4));
          if (e.kind === 'shot') { snd('crack', vol(e.x, e.z) * 0.8); kick(0.10 * vol(e.x, e.z)); }
          break;
        // tr136 THE BROADSIDE. One 'gun' event per gun, ~0.09-0.20 s apart, so the cue
        // plays as a ragged roll on its own with no extra sequencing here. raid-audio's
        // 0.06 s gate on 'cannon' is shorter than the tightest gap, so no gun is swallowed.
        case 'gun': snd('cannon', vol(e.x, e.z) * 0.85); kick(0.05 * vol(e.x, e.z)); break;
        case 'volley': if (!e.ally && vol(e.x, e.z) > 0.55) hud.pop('BROADSIDE!', 'combo'); break;
        // ---- tr141 THE QUAY FLEET. The arrival is a BEAT in three parts and the cues carry it.
        // CUE NAMES ONLY: src/raid/raid-audio.js belongs to another pass and is not touched
        // here. play() falls off the end of its switch on an unknown name, so every call below
        // is a silent no-op until those cues exist - it cannot break the mode in the meantime.
        // The names wanted are listed in tmp-tr141/RESULT.md.
        case 'alliesSighted':
          hud.banner(g, CG('allySighted'), CG('allySightedSub'), 'wave', 3.0);
          snd('pipe', 1); snd('horn', 0.5);
          break;
        case 'alliesClosing':
          hud.banner(g, hud.C.allyArrive, CG('allyArriveSub'), 'win', 3.4);
          snd('pipe', 1.2); snd('cheer', 1.1); kick(0.35);
          break;
        case 'alliesEngaged':
          hud.banner(g, hud.C.allyEngaged, hud.C.allyEngagedSub, 'win', 2.8);
          snd('allyhorn', 1); snd('cheer', 0.8);
          break;
        case 'allyKill': hud.pop(hud.C.allyKill, 'combo'); snd('bigsplash', vol(e.x, e.z) * 0.8); snd('cheer', 0.5); break;
        case 'allySunk':
          if (e.left > 0) hud.pop(hud.C.allyDown, 'bad');
          else hud.banner(g, hud.C.allyGone, CG('allyGoneSub'), 'fallen', 2.6);
          snd('bigsplash', vol(e.x, e.z)); snd('allydown', 1); kick(0.3);
          break;
        case 'climbFire': snd('whoomph', vol(e.x, e.z) * 0.7); break;
        case 'lob': if (e.kind === 'pot') snd('lob', vol(e.x, e.z)); else snd('throw', vol(e.x, e.z)); break;
        case 'pierBurning':
          if (!R.hud.bannerBusy(g)) hud.banner(g, 'THE PIER IS BURNING!', `${e.burning} sections alight · hose them down!`, 'fire', 2.6);
          snd('bosshorn'); kick(0.3);
          break;
        case 'collapse': {
          hud.banner(g, `${SECTIONS[e.section].name} HAS FALLEN!`, e.left > 0 ? `${e.left} of ${SECTIONS.length} sections still standing` : 'the pier is gone', 'fallen', 3.0);
          R.bannerFall = e.tick;
          snd('collapse', 1); snd('bigsplash', 0.9); kick(1);
          break;
        }
        // ---- tr145 THE HARBOUR MOUTH. Three events and that is the whole level on screen.
        // The cues are ones that already exist: a corsair getting past is the same gut-drop as a
        // section falling, so it borrows 'collapse'; holding the line ends like a pier saved.
        case 'through':
          hud.banner(g, hud.G.through, e.left > 0
            ? `${e.left} more and the harbour is theirs`
            : 'the harbour is theirs', 'fallen', e.left <= 1 ? 2.6 : 2.0);
          if (e.left === 1) hud.pop(hud.G.throughLast, 'bad');
          snd('bosshorn'); snd('horn', 0.8); kick(0.55);
          break;
        case 'gateLost':
          hud.banner(g, hud.G.lostTitle, hud.G.lostSub, 'fallen', 3.0);
          snd('lost'); kick(0.8);
          break;
        case 'gateHeld':
          hud.banner(g, hud.G.heldTitle, `${hud.G.heldSub} · +${e.points}`, 'saved', 3.0);
          snd('bosssunk'); snd('cheer', 1.3); kick(0.6);
          break;
        case 'pierLost':
          hud.banner(g, 'THE PIER HAS BURNED DOWN!', 'the raiders row away cheering', 'fallen', 3.0);
          snd('lost'); kick(0.8);
          break;
        case 'pierSaved':
          hud.banner(g, 'PIER SAVED!', `${e.standing} of ${SECTIONS.length} sections standing · +${e.points}`, 'saved', 3.0);
          snd('bosssunk'); snd('cheer', 1.3); kick(0.6);
          break;
        case 'barrage':
          if (R.barrageShown !== e.ship) { R.barrageShown = e.ship; hud.banner(g, 'FIRE BARRAGE!', 'the flagship is bombarding the pier head', 'boss', 2.4); }
          snd('bosshorn'); snd('barrage', vol(e.x, e.z)); kick(0.35);
          break;
        case 'fireOut':
          hud.fly(e.x, e.y + 3, e.z, e.points ? `FIRE OUT! +${e.points}` : 'FIRE OUT!', 'big');
          snd('steam', 1.2); snd('cheer', 0.5);
          break;
        case 'potDoused': hud.fly(e.x, e.y + 1, e.z, `+${e.points}`, 'hit'); snd('steam', 0.6); break;
        case 'knockOff': hud.fly(e.x, e.y + 1.5, e.z, `SPLASH! +${e.points}`, 'shark'); snd('knock', vol(e.x, e.z)); break;
        case 'steam': snd('steam', 0.5 * vol(e.x, e.z)); break;
        case 'tankEmpty': snd('expire'); break;
        case 'clear':
          if (R.bossSunkTick >= 0 && e.tick - R.bossSunkTick < 240) {     // the flagship's banner keeps the stage
            hud.banner(g, 'FLAGSHIP SUNK!', `wave ${e.n} cleared${e.clean ? ` · bonus +${e.bonus}` : ''}`, 'win', 3.2);
            snd('wave'); break;
          }
          if (e.final) break;
          if (R.bannerFall >= 0 && e.tick - R.bannerFall < 200) break;
          hud.banner(g, e.clean ? 'WAVE CLEARED!' : 'WAVE OVER', e.clean ? `the pier stands at ${e.pier}% · bonus +${e.bonus}` : `${e.lost} ${e.lost === 1 ? 'section' : 'sections'} lost · the pier stands at ${e.pier}%`, 'clear', g.T.clearSec);
          snd('wave'); if (e.clean) snd('cheer', 0.7);
          break;
        case 'pickup':
          hud.pop(e.label + '!', 'power'); snd('pickup');
          break;
        case 'expire': snd('expire'); break;
        case 'sharkTell': snd('tell'); break;
        case 'lunge': snd('lunge'); break;
        case 'sharkHit': kick(0.8); break;
        case 'sharkShot': hud.fly(e.x, 2.5, e.z, `+${e.points}`, 'shark'); snd('splash', 1.2); break;
        case 'bump': snd('thud', e.hard ? 1 : 0.45); kick(e.hard ? 0.5 : 0.15); break;
        case 'over': hud.showOver(e, g.seed); break;
      }
    }
    g.events.length = 0;
  }

  // ---- fire input ----------------------------------------------------------------
  const isField = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA');
  addEventListener('keydown', (e) => { if (R.active && FIRE_KEYS.has(e.code) && !isField(e)) R.keys.add(e.code); if (R.active && WATER_KEYS.has(e.code) && !isField(e) && !e.ctrlKey && !e.metaKey) R.wkeys.add(e.code); }, { capture: true });
  addEventListener('keyup', (e) => { R.keys.delete(e.code); R.wkeys.delete(e.code); }, { capture: true });
  addEventListener('blur', () => { R.keys.clear(); R.wkeys.clear(); R.mouseFire = false; R.touchFire = false; R.touchWater = false; });
  addEventListener('mousedown', (e) => { if (R.active && e.button === 1) { R.mouseFire = true; e.preventDefault(); } }, { capture: true });
  addEventListener('mouseup', (e) => { if (e.button === 1) R.mouseFire = false; }, { capture: true });
  // AUTO-FIRE ON A PHONE (tmp-tr82). The weapon already auto-aims (raid.js `_aim`), so a FIRE
  // button that must be HELD buys nothing except a thumb that can no longer reach the water
  // cannon - which is the one interesting decision in the siege. On AUTO the gun shoots
  // whenever _aim finds a longship or a surfaced shark in its cone, and the button stays as a
  // manual override. Touch only, and only while the raid is actually being played, so the
  // headless tests, the bot and every desktop path are untouched by construction.
  function autoFiring() {
    if (bot || !R.active) return false;
    if (touchSettings.fire !== 'auto') return false;
    if (typeof document === 'undefined' || !document.body.classList.contains('touch')) return false;
    const g = R.game;
    if (!g || !g.playing || g.player.downT > 0) return false;
    try { return !!g._aim(g.weapon); } catch { return false; }
  }

  function firing() {
    if (bot) return !!(R.botOut && R.botOut.fire);
    if (autoFiring()) return true;
    let pad = false;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) if (p && ((p.buttons[2] && p.buttons[2].pressed) || (p.buttons[5] && p.buttons[5].pressed))) pad = true;
    } catch { pad = false; }
    return R.keys.size > 0 || R.mouseFire || R.touchFire || pad;
  }
  function watering() {
    if (bot) return !!(R.botOut && R.botOut.water);
    let pad = false;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) if (p && ((p.buttons[3] && p.buttons[3].pressed) || (p.buttons[4] && p.buttons[4].pressed))) pad = true;
    } catch { pad = false; }
    return R.wkeys.size > 0 || R.touchWater || pad;
  }

  // tr64: which index ranges the coast draw skips. The crowd goes for the whole raid; a
  // section joins it FALL_SEC after it collapses, by which time the overlay's superstructure
  // has broken up and fallen, so the eye sees the mass go rather than a building blink out.
  function updateHidden() {
    if (!R.active) return;
    let bits = 0;
    const g = R.game;
    if (g && g.pier && R.hide) for (let i = 0; i < g.pier.sections.length; i++) {
      const q = g.pier.sections[i];
      if (q.collapsed && q.collapseT >= FALL_SEC) bits |= 1 << i;
    }
    if (bits === R.downBits) return;
    R.downBits = bits;
    const down = [];
    for (let i = 0; i < 7; i++) if (bits & (1 << i)) down.push(i);
    globalThis.__raidHideRanges = R.hide ? hideRanges(down, true)
      : (RAID_RANGES.crowdRaw ? [RAID_RANGES.crowdRaw] : null);
    // >>> DECALTIER (tmp-tr136)
    // Published ONLY when the slice is actually permuted. Its absence tells
    // craft.js and renderer.js that the index buffer is the one they built
    // against, so they use their own ranges - which is the right answer when
    // buildHide failed and nothing was permuted at all.
    globalThis.__raidDecalRanges = R.hide
      ? decalRanges(globalThis.__raidHideRanges) : null;
    // <<< DECALTIER
  }
  R.updateHidden = updateHidden;

  // ---- hooks main.js calls -------------------------------------------------------
  R.tick = function () {
    if (sim.tick < R.lastSimTick) {
      // A craft change restarts the sim without ending the raid (src/boats/hub.js).
      if (globalThis.__modeCraftSwitch) globalThis.__modeCraftSwitch = false;
      else newRun();
    }
    R.lastSimTick = sim.tick;
    R.driver.tick(sim, hullOf(), FIXED_DT, firing(), watering());
    if (R.game.events.length) consumeEvents();
    updateHidden();   // tr64: a collapsed section stops being drawn once it has fallen
  };

  const clip = new Float32Array(4);
  let lastNow = 0;
  R.frame = function (cam) {
    const t0 = performance.now();
    const pose = playerPose(sim);
    let proj = null;
    const W = seaGL ? seaGL.W : 1, H = seaGL ? seaGL.H : 1;
    if (cam && seaGL && R.actors) {
      R.scene.sprites = R.pierFx ? R.pierFx.sp : null;   // tr62: actors' smoke/flash/spray go to the soft sprite pass
      R.scene.fill(R.actors, R.game, sim, pose, cam);
      R.actors.draw(cam, seaGL.vpM, seaGL.sunDir, seaGL.exposure, sim.time);
      R.stats = R.actors.lastStats;
      if (R.pierFx) {
        R.pierFx.fill(R.game, sim, pose, cam);
        R.pierFx.draw(cam, seaGL.vpM, seaGL.sunDir, seaGL.exposure, sim.time);
        const a = R.stats, b = R.pierFx.lastStats;
        R.stats = { draws: a.draws + b.draws, tris: a.tris + b.tris, instances: a.instances + b.instances, pierDraws: b.draws, pierTris: b.tris, parts: b.parts, sprites: b.sprites, pierMeshTris: b.meshTris };
      }
      const m = seaGL.vpM;
      proj = (x, y, z) => {
        clip[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
        clip[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        clip[3] = m[3] * x + m[7] * y + m[11] * z + m[15];
        const w = clip[3], iw = 1 / (Math.abs(w) < 1e-4 ? 1e-4 : Math.abs(w));
        return { x: (clip[0] * iw * 0.5 + 0.5) * W, y: (0.5 - clip[1] * iw * 0.5) * H, behind: w < 0.1 };
      };
    }
    R.hud.update(R.game, pose, proj, W, H, cam ? cam.yaw : undefined);
    // fire ambience: crackle and roar by how much is burning and how close; the cannon's hiss
    if (R.audio && R.game.playing && t0 - R.crackleT > 240) {
      R.crackleT = t0;
      let heat = 0;
      R.game.pier.sections.forEach((q, i) => { if (q.fire > 0.02) { const c = sectionCentre(i); heat += q.fire * clamp(1 - Math.hypot(c.x - pose.x, c.z - pose.z) / 400, 0.1, 1); } });
      if (heat > 0.05) R.audio.play('crackle', Math.min(1.5, heat));
      if (heat > 1.2) R.audio.play('roar', Math.min(1.5, heat / 2));
      if (R.game.spraying) R.audio.play('hiss', 1);
      // tr140 ONE LINE, and it is in the block that already exists to do exactly this. The
      // pirates' rigging, hull, canvas, bell and the guns being run out are a BED, not events:
      // nothing in raid.js or siege.js emits "a rope creaked". ambience() returns on its first
      // line for norse, so the Viking raid is bit-for-bit unaffected.
      R.audio.ambience(R.game, pose.x, pose.z);
    }
    // screen shake: a few px, fast decay; much smaller with prefers-reduced-motion
    const dt = lastNow ? Math.min(0.1, (t0 - lastNow) / 1000) : 0;
    lastNow = t0;
    R.shake *= Math.exp(-dt * 7);
    const amp = R.shake * (reduced ? 1.5 : 7);
    if (amp > 0.25) {
      const s = t0 / 1000, tx = (Math.sin(s * 71) + Math.sin(s * 43)) * 0.5 * amp, ty = (Math.sin(s * 59 + 1) + Math.sin(s * 31)) * 0.5 * amp;
      for (const c of canvases()) c.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
      R.shaking = true;
    } else if (R.shaking) { unshake(); R.shaking = false; }
    R.frameMs = performance.now() - t0;
  };

  R.enter = enter;
  R.exit = exit;

  addEventListener('keydown', (e) => {
    if (isField(e)) return;
    if (e.code === 'KeyR' && e.shiftKey && R.active) { exit(); return; }
    if (e.code === 'KeyL' && e.shiftKey) { R.active ? exit() : enter(R.foe); return; }
    if (R.active && e.code === 'Enter' && R.game && R.game.phase === 'over') again();
  }, { capture: true });

  if (!isCal || q.get('mode') === 'raid') R.hud = makeHud();
  // >>> CLEANUP
  // tmp-tr174: `!isCal &&` added. This auto-entry had no calibration guard, so
  // `?cal=...&mode=raid` started a live siege underneath a measurement render -
  // longships, gunfire, sharks, screen shake and the HUD - and every tone number
  // taken from that frame would have been of a different world. It was harmless
  // only because no judged URL happens to carry both, and this project added six
  // judged views in one day. The two newer level controllers already guard this
  // exact line (`smuggle.js:1050`, `stunt.js:662`); the raid now reads the same.
  // The makeHud() line above is left as it was: it already has its own isCal term,
  // it is shared verbatim with rescue-mode.js:167, and a built-but-inactive HUD is
  // this module's ordinary resting state on any page load with no mode set.
  if (!isCal && q.get('mode') === 'raid') enter(foe0);
  // <<< CLEANUP

  // Headless test handle: advance the real sim (eFoil or the active boat) and the game
  // with the scripted pilot, exactly as main.js's tick() would, until `until(game)`.
  R.fastForward = (maxTicks, until) => {
    let n = 0;
    for (; n < maxTicks; n++) {
      const out = raidPilot(sim, R.game, hullOf());   // >>> PILOT <<< (see takeInput above)
      const c = ctx.craft;
      if (c && c.active) { c.step(out, FIXED_DT); c.effects(FIXED_DT); } else sim.step(out, FIXED_DT);
      R.botOut = out;
      R.driver.tick(sim, hullOf(), FIXED_DT, !!out.fire, !!out.water);
      if (R.game.events.length) consumeEvents();
      updateHidden();   // tr64: as R.tick() does, so a fast-forwarded collapse leaves a gap
      if (until && until(R.game)) break;
    }
    return n;
  };
  window.efoilRaid = R;
  return R;
}
