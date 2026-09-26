// CRAFT HUB (tmp-tr41): which craft the player is on, and everything a boat
// needs from the shell - stepping, cameras, HUD, the chooser, the demo pilot and
// the shared player-pose provider.
//
// THE EFOIL IS THE DEFAULT AND IS NEVER WRAPPED. With kind === 'efoil' every
// hook main.js and renderer.js call is a no-op that returns immediately, no
// provider is registered (player-pose.js falls back to the eFoil sim) and no
// sea sample, mesh or buffer is touched per frame. The boats' GL objects are
// created once at startup (SPEC §5: nothing compiled lazily), which changes no
// pixel of an eFoil frame; the collision grid is built on first selection.
//
// While a boat is active the eFoil sim is still stepped - with ZERO input, at
// rest at the spawn, never drawn - so sim.time (the sea clock every renderer and
// the rescue mode read) keeps running exactly as it does for the eFoil.

import { PlaneHull } from './hull.js';
import { SPEEDBOAT } from './speedboat.js';
import { JETSKI } from './jetski.js';
import { Obstacles } from './obstacles.js';
import { BoatRenderer } from '../gl/boats.js';
import { buildCoast } from '../gl/coast.js';
import { setPoseProvider } from '../player-pose.js';
import { EngineAudio } from './engine-audio.js';   // tmp-tr50: procedural engine sound
import { track } from '../ui/analytics.js';           // a craft the player chose, not a restore
// >>> CAMDYN
// The chase-camera dynamics and BOTH tuning sets live in view3d.js, so there is one
// implementation and one place to tune for every craft in the game.
import { CAM_BOAT } from '../view3d.js';
// <<< CAMDYN
// >>> SURFER
import { SurfBoard, BOARD, STATE_NAME as BOARD_STATE } from './surfboard.js';
// <<< SURFER

export const CRAFTS = ['efoil', 'speedboat', 'jetski'];
const SPECS = { speedboat: SPEEDBOAT, jetski: JETSKI };
const LABEL = { efoil: 'EFOIL', speedboat: 'SPEEDBOAT', jetski: 'JETSKI' };
// >>> SURFER
// THE SURFBOARD IS A FOURTH KIND THAT IS NEVER IN CRAFTS. K, the craft bar and every level's
// craft list walk CRAFTS; only the surfing level selects the board, by name, through select().
// It has no engine (audio stays off) and no BoatRenderer mesh: the rider is drawn by the
// line-up's own renderer (gl/surfers.js `player`), which already has the prone, standing and
// tumbling figures.
SPECS.surfboard = BOARD;
LABEL.surfboard = 'SURFBOARD';
const KINDS = [...CRAFTS, 'surfboard'];
// <<< SURFER
const STOPPED = 1.5;            // m/s: craft can be changed at or below this
// Demo pilot: a wide carve that keeps the boat in front of the pier.
const DEMO = { throttle: { speedboat: 0.55, jetski: 0.4 }, turn: { speedboat: 0.32, jetski: 0.22 },
  runUp: 4, maxRange: 300, preroll: 5 };
// >>> BEACHBACK  see _beachWatch()
const BEACH = { stuck: 2.0, moved: 1.5, freeFor: 0.5, crumbEvery: 0.25, crumbs: 24, before: 2.0, fallback: 12 };
// <<< BEACHBACK
// >>> CAMCLIP  see _unclip()
const CLIP = { step: 0.4, back: 0.7, lift: 0.3, capsule: 0.4, easeOut: 2.5 };
// <<< CAMCLIP

export class CraftHub {
  // o: { sim, view3d, seaGL, live, glCanvas, restart, toast, showHint, isDemo, getCamera }
  constructor(o) {
    this.o = o;
    this.kind = 'efoil';
    this.hulls = { speedboat: new PlaneHull(SPEEDBOAT), jetski: new PlaneHull(JETSKI) };
    this.hulls.surfboard = new SurfBoard(BOARD);   // SURFER
    this.obs = null;
    this.idle = { lean: 0, turn: 0, throttle: 0, boost: 0 };
    this.demoIn = { lean: 0, turn: 0, throttle: 0, boost: 0 };
    this.demoT = 0;
    this.camSide = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
    this.camInit = false;
    this.gfx = null;
    // No AudioContext exists until a gesture AND a boat (eFoil pages stay silent).
    this.audio = new EngineAudio();
    this.shakeE = 0; this.shakeSlams = 0;
    if (o.seaGL && o.seaGL.ok && o.seaGL.craft) {
      try {
        this.gfx = new BoatRenderer(o.seaGL.gl, o.seaGL.craft)
          .build({ speedboat: this.hulls.speedboat.cgX, jetski: this.hulls.jetski.cgX });
        o.seaGL.boats = this.gfx;           // read by the >>> CRAFT hooks in renderer.js
      } catch (e) { console.warn('[boats] GL build failed:', e.message); this.gfx = null; }
    }
    this._bindUI();
  }

  get active() { return this.kind !== 'efoil'; }
  get hull() { return this.hulls[this.kind] || null; }
  get spec() { return SPECS[this.kind] || null; }

  // >>> RAID
  // Viking raid (tr57): moving longships as dynamic obstacles plus a turbo / stall factor,
  // applied to BOTH hulls so a craft change keeps them; raidHook(null, 0, 0) clears all of it.
  raidHook(list, boost, stall) {
    for (const k in this.hulls) { const h = this.hulls[k]; h.setDynamic(list); h.raidBoost = boost || 0; h.raidStall = stall || 0; }
  }
  // <<< RAID

  // ---- selection ----------------------------------------------------------
  canSwitch() {
    if (this._demoAtInput || this.o.isDemo()) return true;
    const sp = this.active ? this.hull.speed : this.o.sim.plant.state.speed;
    return sp <= STOPPED;
  }

  select(kind, quiet) {
    if (!KINDS.includes(kind)) return false;   // SURFER: KINDS, so the board can be named
    if (kind !== 'efoil' && !this.obs) {
      const t0 = performance.now();
      // Prefer the mesh the GL renderer already built. Measured 19 Sep 2026:
      // rebuilding the coast here cost 256 ms of a 343 ms freeze one frame after
      // the first paint (src/perf.js boot timeline + the performance.measure
      // entries). Obstacles.build only READS data/index/count/stride, so sharing
      // is safe; we release the reference immediately so the ~11 MB is not held
      // for the session.
      //
      // tr145 ⚠️ `{ ranges: {} }` IS LOAD-BEARING on the fallback path below, not
      // tidiness. That call is a SECOND buildCoast() whose mesh is rasterised into
      // a grid and thrown away; without the throwaway target it also re-published
      // pier.js's RAID_RANGES - the index ranges a raid already running on the
      // FIRST mesh is addressing the pier with. It was harmless only while both
      // calls built the same world. tmp-tr145/test-gate.mjs fails if a bare
      // buildCoast() comes back.
      const shared = this.o.seaGL && this.o.seaGL.coastMesh;
      this.obs = new Obstacles().build(shared || buildCoast({ ranges: {} }));
      if (shared) this.o.seaGL.coastMesh = null;
      this.obsSource = shared ? 'shared' : 'rebuilt';
      this.obs.stats.totalMs = +(performance.now() - t0).toFixed(0);
      window.__boatObstacles = this.obs.stats;
    }
    this.kind = kind;
    if (this.gfx) { this.gfx.active = this.active; this.gfx.kind = this.active ? kind : null; this.gfx.hull = this.hull; }
    // >>> SURFER  the line-up's renderer draws the player while the board is the craft.
    if (this.o.seaGL && this.o.seaGL.surfers) this.o.seaGL.surfers.player = kind === 'surfboard' ? this.hull : null;
    // <<< SURFER
    setPoseProvider(this.active ? () => this.pose() : null);
    // A restart inside a mode is a CRAFT CHANGE, not a new run: the mode watches sim.tick and
    // would otherwise start over (2026-09-18).
    if (document.body.classList.contains('raid') || document.body.classList.contains('rescue')) globalThis.__modeCraftSwitch = true;
    this.o.restart(true);
    this.audio.setCraft(this.active ? kind : null);   // SURFER: the board's 'engine' is the surf (surf-audio.js)
    this.shakeE = 0; this.shakeSlams = this.active ? this.hull.slams : 0;
    const L = this.o.live;
    // tmp-tr82: the phone's throttle is a sticky LEVER, so zeroing `throttle` alone is not
    // enough - the cruise setting would put the old value straight back on the next sample.
    if (L && !this.o.isDemo()) { L.throttle = 0; L.wheelThrottle = 0; L._lastWheel = 0; if (L.zeroTouchThrottle) L.zeroTouchThrottle(); }
    this._syncBar();
    if (!quiet) {
      track('craft_select', { craft: kind });   // >>> ANALYTICS: only a player's own change is loud
      this.o.toast(`craft: ${LABEL[kind].toLowerCase()}`);
      this.o.showHint(this.hintText(), 9000);
    }
    return true;
  }

  cycle(force) {
    // `force` comes from the on-screen CRAFT button while a mode is running: a phone player is
    // almost never stopped in a raid, and refusing to switch left them with no way to change
    // craft at all (owner, 2026-09-18). The new craft starts where the old one was, at rest.
    // >>> SURFER  the surfing level is a board level: K / CRAFT / the pad do not take you off it.
    if (this.kind === 'surfboard') { this.o.toast('PIER SURF is a surfboard level'); return; }
    // <<< SURFER
    if (!force && !this.canSwitch()) { this.o.toast('stop first to change craft (K)'); return; }
    // SURFER: from the board (not in CRAFTS, index -1) this lands on the first craft, the eFoil.
    this.select(CRAFTS[(CRAFTS.indexOf(this.kind) + 1) % CRAFTS.length]);
  }

  hintText() {
    if (!this.active) {
      // >>> LEVELBACK  the eFoil's line needs it for the same reason the boats' does.
      return '<b>Move the mouse</b> to lean and steer &middot; <b>scroll</b> for throttle &middot; <b>SPACE</b> pop-up '
        + '&mdash; <b>M</b> for keyboard, <b>H</b> help, <b>K</b> craft, <b>L</b> levels';
      // <<< LEVELBACK
    }
    // >>> LEVELBACK
    // ⚠️ `L` EARNED ITS PLACE ON THIS LINE THE HARD WAY. The owner played the game on a
    // desktop and reported that once you pick a level "there's no way to go back to the
    // level menu". The key has always worked - measured, not assumed: pressing L inside a
    // running Viking raid opens the picker over the top of it, all eight rows. What was
    // missing is that NOTHING SAID SO. The LEVELS button exists but `index.html` hides the
    // whole button row on a desktop (`body:not(.touch) #tbtns { display: none }`), and this
    // hint line - the one piece of text a desktop player actually reads - listed only K.
    // The help card behind H had it; a player who does not know there is a help card does not
    // press H.
    //
    // It goes LAST and after K because the line is already long; at 1280 px it wraps on a
    // narrow window, and the two least-used items should be the ones that fall to the second
    // row rather than `steer` or `throttle`.
    return `<b>${LABEL[this.kind]}</b> &middot; <b>mouse left/right</b> or <b>A/D</b> to steer &middot; `
      // >>> LEFTMOUSE
      // ⚠️ THE LEFT BUTTON WAS MISSING FROM ITS OWN HINT. `input.js:775` is
      // `this.mouse.down - this.mouse.right`, so the left button ramps the throttle UP exactly
      // as the right one ramps it down - and this line listed only scroll and the arrows. The
      // owner found it by playing and reported the instructions as wrong; he was right.
      + '<b>left mouse</b>, <b>scroll</b> or <b>&uarr;/&darr;</b> throttle &middot; <b>W/S</b> trim '
      + '&middot; <b>right mouse</b> or <b>SPACE</b> slow/reverse '
      // <<< LEFTMOUSE
      + '&mdash; <b>K</b> next craft &middot; <b>L</b> levels';
    // <<< LEVELBACK
  }

  pose() {
    const h = this.hull;
    return { x: h.x, z: h.z, heading: h.heading, speed: h.u, craft: this.kind };
  }

  // ---- hooks called from main.js --------------------------------------------
  reset() {
    if (!this.active) return;
    const sim = this.o.sim;
    this.hull.reset(sim.world.x, sim.world.z, sim.startHeading, sim.sea, sim.time);
    if (this.gfx) this.gfx.clearFx();
    this.demoT = 0;
    this.camInit = false;
    this.sideInit = false;
    this._bw = null;          // >>> BEACHBACK: crumbs from before a reset are somewhere else
  }

  // raw === null means the attract demo is driving.
  step(raw, dt) {
    const sim = this.o.sim;
    let inp = raw || this._demo(dt);
    // RIGHT MOUSE BUTTON = ASTERN (2026-09-17, owner request). input.js raises `brake` once the
    // throttle has been ramped to zero and the button is still held; the astern command then winds
    // on over about a second, so it slows first and backs off second - the same thing SPACE does,
    // on the button the owner reaches for. Released, it drops straight out of gear again.
    // SURFER: a board has no astern; the right button is just "not paddling".
    if (inp.brake && this.kind === 'surfboard') inp = { ...inp, brake: 0, throttle: 0 };
    if (inp.brake) {
      this.revCmd = Math.min(1, (this.revCmd || 0) + dt * 1.2);
      inp = { ...inp, boost: 1, throttle: Math.max(inp.throttle || 0, this.revCmd) };
    } else this.revCmd = 0;
    this.hull.step(inp, dt, sim.sea, sim.time, this.obs);
    if (!raw) this._demoWatch();
    else this._beachWatch(inp, dt);     // >>> BEACHBACK
    sim.step(this.idle, dt);              // the eFoil, at rest: keeps the sea clock
  }

  preroll(sec = DEMO.preroll) {
    if (!this.active) return;
    const sim = this.o.sim, n = Math.round(sec * 120);
    for (let i = 0; i < n; i++) { this.step(null, 1 / 120); this.effects(1 / 120); }
  }

  _demo(dt) {
    this.demoT += dt;
    const d = this.demoIn;
    d.throttle = DEMO.throttle[this.kind];
    d.turn = this.demoT < DEMO.runUp ? 0 : DEMO.turn[this.kind];
    d.lean = 0; d.boost = 0;
    return d;
  }

  _demoWatch() {
    const h = this.hull;
    if (Math.hypot(h.x, h.z) > DEMO.maxRange || h.hits > 0 || h.aground) {
      const sim = this.o.sim;
      h.reset(0, 0, sim.startHeading, sim.sea, sim.time);
      this.demoT = 0;
      if (this.gfx) this.gfx.clearFx();
    }
  }

  // >>> BEACHBACK
  // BACK IN THE WATER (b22, 24 Sep 2026). The owner's own recording: a craft run up the beach
  // sat on the sand, creeping, with the throttle open - hull.js's beached-craft escape only
  // releases the sand's grip and lets the slope take her off, and on dry sand above the
  // waterline there is too little slope and no water to take her anywhere.
  //
  // The rule is the one the demo pilot already lives by, made gentle for a player: AGROUND,
  // TRYING TO MOVE (throttle or astern), and under 1.5 m of net progress in 2 s. Then she is
  // put back where she last floated - the crumb from ~2 s before she grounded, so not the
  // wet sand she crossed on the way in - pointing down the beach's own slope, out to sea.
  //
  // ⚠️ `aground` flickers: on a beached hull a wave lifts the stern clear for a few ticks and
  // puts it back. So "afloat" means afloat for 0.5 s straight - a crumb is never laid on the
  // beach by a passing crest, and a crest does not end the stuck count either.
  // ⚠️ A craft idling in the shallows is NOT stuck: nobody is trying to move it. That keeps
  // rescue pick-ups and a slow nose-in at the shore exactly as they were.
  _beachWatch(inp, dt) {
    const h = this.hull, t = h.time;
    let W = this._bw;
    if (!W || W.kind !== this.kind) {
      W = this._bw = { kind: this.kind, crumbs: [], freeT: BEACH.freeFor, lastCrumb: -9, groundT: -1, anchor: null };
    }
    if (h.aground) { W.freeT = 0; if (W.groundT < 0) W.groundT = t; }
    else {
      W.freeT += dt;
      if (W.freeT >= BEACH.freeFor) { W.groundT = -1; W.anchor = null; }
    }
    if (W.freeT >= BEACH.freeFor && t - W.lastCrumb >= BEACH.crumbEvery) {
      W.crumbs.push({ x: h.x, z: h.z, t });
      if (W.crumbs.length > BEACH.crumbs) W.crumbs.shift();
      W.lastCrumb = t;
    }
    const trying = (inp.throttle || 0) > 0.05 || !!inp.brake;
    if (W.groundT < 0 || !trying) { W.anchor = null; return; }
    if (!W.anchor) { W.anchor = { x: h.x, z: h.z, t }; return; }
    if (t - W.anchor.t < BEACH.stuck) return;
    if (Math.hypot(h.x - W.anchor.x, h.z - W.anchor.z) >= BEACH.moved) {
      W.anchor = { x: h.x, z: h.z, t };
      return;
    }
    this._backInWater(W);
  }

  _backInWater(W) {
    const h = this.hull, sim = this.o.sim, obs = this.obs;
    let c = null;
    for (const k of W.crumbs) if (k.t <= W.groundT - BEACH.before) c = k;
    if (!c && W.crumbs.length) c = W.crumbs[0];
    // Down the slope: the beach and the seabed both fall away seaward, at Bournemouth and in
    // the arena alike, so the ground's own gradient is "out to sea" wherever this can happen.
    let gx = 0, gz = 0;
    if (obs) { obs.ground(c ? c.x : h.x, c ? c.z : h.z); gx = -obs.groundSlope[0]; gz = -obs.groundSlope[1]; }
    const g = Math.hypot(gx, gz);
    let x, z, heading;
    if (c) {
      x = c.x; z = c.z;
      heading = g > 1e-4 ? Math.atan2(gz, gx) : Math.atan2(c.z - h.z, c.x - h.x);
    } else {
      // Never floated since the last reset (spawned on the sand): walk her down the slope.
      heading = g > 1e-4 ? Math.atan2(gz, gx) : h.heading + Math.PI;
      x = h.x + Math.cos(heading) * BEACH.fallback; z = h.z + Math.sin(heading) * BEACH.fallback;
    }
    h.reset(x, z, heading, sim.sea, sim.time);
    if (this.gfx) this.gfx.clearFx();
    this.camInit = false; this.sideInit = false;
    this._bw = null;
    this.rescues = (this.rescues || 0) + 1;
    this.o.toast('Back in the water');
  }
  // <<< BEACHBACK

  effects(ft) {
    if (!this.active || !this.gfx) return;
    this.gfx.effects(ft, this.spec, this.o.sim.sea, this.o.sim.time);
    if (this.hull.hits !== this._lastHits) {
      if (this._lastHits != null && this.hull.hits > this._lastHits && this.hull.lastHitSpeed > 1.2) {
        this.o.toast(`hit it at ${(this.hull.lastHitSpeed * this.spec.unitScale).toFixed(0)} ${this.spec.unit}`);
      }
      this._lastHits = this.hull.hits;
    }
  }

  // The whole draw for a boat frame: camera, GL scene, clear the 2D overlay.
  draw(camera, ft) {
    const o = this.o, v = o.view3d, sim = o.sim;
    const cc = window.__calCam;
    let cam = v.cam;
    this.audio.update(this.hull, this.spec, ft);
    // Slam shake: a kick per slam, scaled by its g, gone in ~0.3 s; capped small.
    const h = this.hull;
    if (h.slams < this.shakeSlams) this.shakeSlams = h.slams;
    if (h.slams > this.shakeSlams) { this.shakeE = Math.max(this.shakeE, Math.min(1, (h.slamG - 1.5) / 3)); this.shakeSlams = h.slams; }
    this.shakeE *= Math.exp(-Math.max(0, ft) * 9);
    // >>> CAMCLIP
    // Last frame's pull-in comes off FIRST, before even the dynamics - it went on after them.
    // _chase() integrates cam.x/z/y as its own smoothing state, so a pull-in left on the pose
    // would be smoothed from next frame and the camera would never ease back out.
    const U = this._clip;
    if (U) { v.cam.x -= U.x; v.cam.y -= U.y; v.cam.z -= U.z; U.x = 0; U.y = 0; U.z = 0; }
    // <<< CAMCLIP
    // >>> CAMDYN
    // CAMERA DYNAMICS FOR A BOAT: speed-reactive field of view, chase spring, impact
    // shake and landing punch, all stepped in view3d.js against CAM_BOAT, so there is
    // one implementation and one tuning block for every craft in the game. The hull
    // hands over its own signals - surge, heading, yaw rate, hits, slams, airborne
    // ticks - which are cleaner than anything that could be inferred from the pose.
    //
    // Take LAST frame's offsets back off the pose FIRST: _chase() below uses cam.x and
    // cam.z as its own smoothing state, so a shake left on them would be integrated
    // straight back in and a decaying kick would become a permanent drift.
    v.liftDynamics(v.cam);
    if (h) {
      v.stepDynamics({ u: h.u, heading: h.heading, turn: h.r, tick: h.ticks, live: camera !== 'side' },
        CAM_BOAT, Math.max(1 / 240, ft), (a, u, dt) => v.boatEvents(h, dt));
    }
    // <<< CAMDYN
    if (cc) cam = cc;
    else if (camera === 'side') cam = this._side(Math.max(1 / 240, ft));
    else if (camera === 'fpv') this._fpv(v.cam);
    else if (this.kind === 'surfboard') this._surfCam(v.cam, Math.max(1 / 240, ft));   // SURFER
    else this._chase(v.cam, Math.max(1 / 240, ft));
    // >>> CAMDYN
    // ...and put this frame's on, once the craft has framed its own shot. Never on a
    // calibration camera, and never on the side-on instrument view, which has no
    // dynamics by design.
    //
    // The look-at point is handed over so the camera can be RE-AIMED from wherever the
    // spring slung it - otherwise a big sideways offset just walks the boat out of the
    // frame instead of swinging around her. These are _chase()'s own three lines, and
    // they have to agree with it: lookAhead along the heading, lookH above the hull.
    if (!cc && camera !== 'side') {
      const C = this.spec.cam;
      v.applyDynamics(cam, camera === 'fpv' ? null : (this.kind === 'surfboard' && this._surfLook) || {   // SURFER
        x: h.x + Math.cos(h.heading) * C.lookAhead,
        y: h.y + C.lookH,
        z: h.z + Math.sin(h.heading) * C.lookAhead,
      });
    }
    // <<< CAMDYN
    // >>> CAMCLIP
    if (!cc && camera !== 'side' && camera !== 'fpv') this._unclip(cam, Math.max(1 / 240, ft), this.kind === 'surfboard' ? this._surfLook : null);   // SURFER: its own look point
    else if (U) U.f = 1;
    // <<< CAMCLIP
    if (o.seaGL && o.glCanvas) {
      o.glCanvas.classList.add('on');
      o.seaGL.draw(sim, cam, cc ? cc.fov * Math.PI / 180 : v.fovY, camera === 'fpv' ? 'fpv' : 'chase');
    }
    // The 2D overlay carries nothing for a boat (the depth ribbon is an eFoil
    // instrument) but must still be cleared every frame.
    v.ctx.setTransform(v.dpr || 1, 0, 0, v.dpr || 1, 0, 0);
    v.ctx.clearRect(0, 0, v.W || 0, v.H || 0);
  }

  // Chase: further back and higher than the eFoil's, heading-lagged so a turn
  // shows the side of the hull.
  _chase(cam, dt) {
    const h = this.hull, C = this.spec.cam;
    const sp = Math.max(0, h.u);
    if (!this.camInit) { this.camYaw = h.heading; }
    let dy = h.heading - this.camYaw;
    while (dy > Math.PI) dy -= 2 * Math.PI;
    while (dy < -Math.PI) dy += 2 * Math.PI;
    this.camYaw += dy * Math.min(1, dt * 2.2);
    const dist = C.dist + Math.min(C.distSpeed, sp * 0.12);
    const tx = h.x - Math.cos(this.camYaw) * dist, tz = h.z - Math.sin(this.camYaw) * dist;
    const ty = h.y + C.height;
    const k = this.camInit ? Math.min(1, dt * 5) : 1;
    cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k;
    cam.y = this.camInit ? cam.y + (ty - cam.y) * Math.min(1, dt * 3) : ty;
    this.camInit = true;
    const lx = h.x + Math.cos(h.heading) * C.lookAhead, lz = h.z + Math.sin(h.heading) * C.lookAhead;
    const ly = h.y + C.lookH;
    cam.yaw = Math.atan2(lz - cam.z, lx - cam.x);
    cam.pitch = Math.atan2(ly - cam.y, Math.hypot(lx - cam.x, lz - cam.z));
    this._shake(cam, 0.06, 0.008);
  }

  // >>> CAMCLIP
  // THE CHASE CAMERA STAYS OUT OF THE SCENERY (b22, 24 Sep 2026). The owner's own recording:
  // at 3:17 the camera sat behind a pier leg and the frame went nearly black, and at 12:07,
  // after a ram, it was inside the pirate flagship's hull. Nothing had ever asked whether the
  // spot the camera was slung to was solid.
  //
  // Walk the line from the look point back to the camera and stop short of the first solid
  // thing: a rasterised cell whose structure stands taller than the line at that point (so a
  // low groyne is flown over and a pier leg is not), or a ship's capsule. The camera moves
  // ALONG that line, so what it is aimed at does not change - only how far back it stands.
  // In at once when something comes between, out again over ~0.4 s when it clears.
  //
  // ⚠️ Point capsules (half 0) are channel marks, and are skipped: the Harbour Mouth is run
  // between them, and a camera jumping in at every buoy would be worse than a buoy in shot.
  // SURFER: `look` - a camera that frames something other than the point ahead of the bow (the
  // board's, which looks back at the rider) passes the point it is aimed at and its own minimum.
  _unclip(cam, dt, look) {
    const h = this.hull, C = this.spec.cam, obs = this.obs;
    const U = this._clip || (this._clip = { f: 1, x: 0, y: 0, z: 0 });
    const lx = look ? look.x : h.x + Math.cos(h.heading) * C.lookAhead, lz = look ? look.z : h.z + Math.sin(h.heading) * C.lookAhead;
    const ly = look ? look.y : h.y + C.lookH;
    const dx = cam.x - lx, dy = cam.y - ly, dz = cam.z - lz;
    const len = Math.hypot(dx, dy, dz);
    // ⚠️ NEVER CLOSER THAN JUST BEHIND OUR OWN STERN (b24). The first cut of this (b22) let the
    // camera come in to 1.5 m from the look point, which is INSIDE the boat: the owner's own
    // recording, 24 Sep, stopped with the pier landing stage behind the RIB, filled the frame with
    // the driver's back and then the inside of the hull. A leg clipping the very edge of a shot is
    // the lesser fault; a camera inside the craft is the whole screen.
    const minD = look ? look.minD : C.lookAhead + Math.abs((this.spec.wake && this.spec.wake.stern) || 2) + 0.8;
    let f = 1;
    if (len > minD) {
      const dyn = h.dyn;
      for (let s = CLIP.step; s < len + CLIP.step; s += CLIP.step) {
        const q = Math.min(s, len) / len;
        const px = lx + dx * q, py = ly + dy * q, pz = lz + dz * q;
        let hit = !!obs && obs.solidAt(px, pz, py - CLIP.lift);
        if (!hit && dyn) {
          for (const d of dyn) {
            if (!(d.half > 0)) continue;
            const ax = Math.cos(d.heading), az = Math.sin(d.heading);
            const wx = px - d.x, wz = pz - d.z;
            const t = Math.max(-d.half, Math.min(d.half, wx * ax + wz * az));
            const rr = d.r + CLIP.capsule;
            if ((wx - ax * t) ** 2 + (wz - az * t) ** 2 < rr * rr) { hit = true; break; }
          }
        }
        if (hit) { f = Math.max(minD, s - CLIP.back) / len; break; }
      }
    }
    U.f = f < U.f ? f : U.f + (f - U.f) * Math.min(1, dt * CLIP.easeOut);
    if (U.f > 0.999) U.f = 1;
    const k = U.f - 1;
    U.x = dx * k; U.y = dy * k; U.z = dz * k;
    cam.x += U.x; cam.y += U.y; cam.z += U.z;
  }
  // <<< CAMCLIP

  // >>> SURFER
  // THE BOARD'S CAMERA (PIER SURF stage 2). A chase camera behind a surfer shows the beach while
  // the wave that matters is BEHIND them, so this one moves round the rider with what they are
  // doing:
  //   paddling out, under, tumbling   behind, looking out to sea at what is coming
  //   facing the beach, lying down    IN FRONT, looking back over you at the waves - so you can
  //                                   see one rise behind you, which is the whole catch
  //   riding                          ahead and to the beach side, looking back at you on the face
  // It swings round on the SHORT arc of an angle, never through the rider, and it is never below
  // the sea surface (the sea is drawn opaque; a camera under it sees nothing).
  _surfCam(cam, dt) {
    const h = this.hull, st = h.state;
    const facingIn = -Math.sin(h.heading) > 0.3;
    let a, d, up, lookA, lookU;
    if (st === 2) {
      const want = -Math.cos(h.heading);                 // + when the rider's right is the beach
      if (!this._surfSide || Math.abs(want) > 0.2) this._surfSide = want >= 0 ? 1 : -1;
      a = h.heading + this._surfSide * 0.5; d = 7.2; up = 1.5; lookA = 0; lookU = 0.8;
    } else if (st === 0 && facingIn) {
      a = h.heading; d = 5.8; up = 1.9; lookA = -6; lookU = 0.5;
    } else {
      a = h.heading + Math.PI; d = 5.2; up = 1.9; lookA = 2.5; lookU = 0.45;
    }
    const S = this._sc || (this._sc = {});
    if (!this.camInit || S.a === undefined) { S.a = a; S.d = d; S.up = up; S.lookA = lookA; S.lookU = lookU; S.y = h.y; }
    else {
      let da = a - S.a;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      const k = Math.min(1, dt * 2.2);
      S.a += da * k; S.d += (d - S.d) * k; S.up += (up - S.up) * k;
      S.lookA += (lookA - S.lookA) * k; S.lookU += (lookU - S.lookU) * k;
      S.y += (h.y - S.y) * Math.min(1, dt * 3);
    }
    this.camInit = true;
    cam.x = h.x + Math.cos(S.a) * S.d; cam.z = h.z + Math.sin(S.a) * S.d;
    cam.y = S.y + S.up;
    const sim = this.o.sim, sea = sim && sim.sea;
    if (sea && sea.sample) { const wy = sea.sample(cam.x, cam.z, sim.time, 0, 3).height; if (cam.y < wy + 0.6) cam.y = wy + 0.6; }
    const L = this._surfLook || (this._surfLook = { x: 0, y: 0, z: 0, minD: 2.0 });
    L.x = h.x + Math.cos(h.heading) * S.lookA; L.z = h.z + Math.sin(h.heading) * S.lookA; L.y = S.y + S.lookU;
    cam.yaw = Math.atan2(L.z - cam.z, L.x - cam.x);
    cam.pitch = Math.atan2(L.y - cam.y, Math.hypot(L.x - cam.x, L.z - cam.z));
  }
  // <<< SURFER

  // tmp-tr50: a damped jolt after a slam (<= 6 cm, <= 0.5 deg chase; FPV a bit more).
  _shake(cam, dy, dp) {
    const e = this.shakeE;
    if (!(e > 0.01)) return;
    const s = this.hull.time;
    cam.y += e * dy * Math.sin(s * 41);
    cam.pitch += e * dp * Math.sin(s * 33 + 1.3);
  }

  _fpv(cam) {
    const h = this.hull, [ex, ey0] = this.spec.cam.fpv;
    const ey = this.kind === 'surfboard' ? (h.state === 2 ? 1.55 : 0.5) : ey0;   // SURFER: standing or lying down
    const ch = Math.cos(h.heading), sh = Math.sin(h.heading);
    cam.x = h.x + ch * ex; cam.z = h.z + sh * ex;
    cam.y = h.y + ey + ex * Math.sin(h.pitch);
    cam.yaw = h.heading;
    cam.pitch = -0.08 + h.pitch * 0.8;
    this._shake(cam, 0.05, 0.014);
    this.camInit = false;
  }

  // Side: square-on to the boat's right, low, the instrument view for a hull.
  _side(dt) {
    const h = this.hull, C = this.spec.cam, cam = this.camSide;
    const tx = h.x - Math.sin(h.heading) * C.side, tz = h.z + Math.cos(h.heading) * C.side;
    const k = this.sideInit ? Math.min(1, dt * 4) : 1;
    cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k; cam.y = 1.6;
    this.sideInit = true;
    cam.yaw = Math.atan2(h.z - cam.z, h.x - cam.x);
    cam.pitch = Math.atan2(h.y + 0.6 - cam.y, Math.hypot(h.x - cam.x, h.z - cam.z));
    return cam;
  }

  hud(hud) {
    if (!this.active) return;
    // >>> SURFER
    if (this.kind === 'surfboard') { this._boardHud(hud); return; }
    // <<< SURFER
    const h = this.hull, P = this.spec;
    const sp = h.u;
    hud.speed.textContent = Math.abs(sp * P.unitScale).toFixed(1);
    if (!this.unitEl) this.unitEl = document.querySelector('#hud .card .unit');
    if (this.unitEl) this.unitEl.textContent = `${P.unit} · ${(Math.abs(sp) * 3.6).toFixed(0)} km/h`;
    let mode = h.airTicks > 6 ? 'AIRBORNE' : h.aground ? 'AGROUND' : sp < -0.3 ? 'ASTERN'
      : Math.abs(sp) < 0.5 ? 'STOPPED' : sp >= P.uPlane ? 'PLANING' : sp >= P.uHump * 0.7 ? 'ON THE HUMP' : 'DISPLACEMENT';
    hud.mode.textContent = LABEL[this.kind] + ' · ' + mode;
    hud.mode.className = 'mode ' + (mode === 'PLANING' || mode === 'AIRBORNE' ? 'm-flying' : mode === 'AGROUND' ? 'm-down' : 'm-taxi');
    for (const k of ['depth', 'height', 'alpha', 'lw', 'power', 'band', 'best']) if (hud[k]) hud[k].textContent = '—';
    const rpm = Math.round((P.rpmIdle + Math.max(0, h.rpm) * (P.rpmMax - P.rpmIdle)) / 100) * 100;
    hud.dldv.textContent = `${h.gear === 1 ? 'F' : h.gear === -1 ? 'R' : 'N'} ${rpm} rpm · pitch ${(h.pitch * 57.3).toFixed(1)}° · roll ${(h.roll * 57.3).toFixed(1)}° · hits ${h.hits}`;
    hud.dist.textContent = Math.hypot(h.x, h.z).toFixed(0);
    hud.flow.textContent = '';
  }

  // >>> SURFER
  // The board's line on the craft card: the wave's speed against yours is the whole catch.
  _boardHud(hud) {
    const h = this.hull, P = this.spec, sp = h.speed;
    hud.speed.textContent = (sp * P.unitScale).toFixed(1);
    if (!this.unitEl) this.unitEl = document.querySelector('#hud .card .unit');
    if (this.unitEl) this.unitEl.textContent = `${P.unit} · ${(sp * 3.6).toFixed(0)} km/h`;
    const st = BOARD_STATE[h.state] || 'PADDLING';
    hud.mode.textContent = 'SURFBOARD · ' + st;
    hud.mode.className = 'mode ' + (h.state === 2 ? 'm-flying' : h.state === 3 ? 'm-down' : 'm-taxi');
    for (const k of ['depth', 'height', 'alpha', 'lw', 'power', 'band', 'best']) if (hud[k]) hud[k].textContent = '—';
    const w = h.wave;
    hud.dldv.textContent = `wave ${w.c.toFixed(1)} m/s · you ${Math.max(0, h.u).toFixed(1)} m/s · water ${w.depth.toFixed(1)} m`;
    hud.dist.textContent = Math.hypot(h.x, h.z).toFixed(0);
    hud.flow.textContent = '';
  }
  // <<< SURFER

  // ---- chooser bar + K key ----------------------------------------------------
  _bindUI() {
    // Recorded BEFORE main.js's attract hand-over listeners run (registered
    // earlier, same capture phase), so a click or K on the demo still counts
    // as "the demo was running".
    const mark = () => { this._demoAtInput = this.o.isDemo(); };
    addEventListener('keydown', (e) => { if (e.code === 'KeyK') mark(); }, { capture: true });
    addEventListener('pointerdown', mark, { capture: true });
    addEventListener('keydown', (e) => {
      if (e.code !== 'KeyK' || (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT'))) return;
      this.cycle();
      this._demoAtInput = false;
    });
    if (typeof document === 'undefined' || new URLSearchParams(location.search).has('cal')) return;
    const st = document.createElement('style');
    st.textContent = '#craftbar{position:absolute;top:52px;left:50%;transform:translateX(-50%);display:flex;gap:4px;'
      + 'background:rgba(12,14,18,.72);border:1px solid rgba(232,237,244,.12);border-radius:20px;padding:4px;z-index:30}'
      + '#craftbar button{border:0;border-radius:16px;padding:5px 12px;background:transparent;color:rgba(232,237,244,.5);letter-spacing:.06em}'
      + '#craftbar button.on{background:rgba(255,215,106,.22);color:#ffd76a}'
      + 'body.touch #craftbar{top:8px}body.clean-render #craftbar{display:none!important}';
    document.head.appendChild(st);
    const bar = document.createElement('div');
    bar.id = 'craftbar';
    for (const k of CRAFTS) {
      const b = document.createElement('button');
      b.textContent = LABEL[k]; b.dataset.craft = k;
      b.addEventListener('click', () => {
        if (k === this.kind) return;
        if (!this.canSwitch()) { this.o.toast('stop first to change craft'); return; }
        this.select(k);
        this._demoAtInput = false;
      });
      bar.appendChild(b);
    }
    const left = document.querySelector('#left');
    if (left) left.appendChild(bar);
    this.bar = bar;
    this._syncBar();
  }

  _syncBar() {
    if (!this.bar) return;
    for (const b of this.bar.querySelectorAll('button')) b.classList.toggle('on', b.dataset.craft === this.kind);
  }
}
