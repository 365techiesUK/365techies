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
// >>> CAMDYN
// The chase-camera dynamics and BOTH tuning sets live in view3d.js, so there is one
// implementation and one place to tune for every craft in the game.
import { CAM_BOAT } from '../view3d.js';
// <<< CAMDYN

export const CRAFTS = ['efoil', 'speedboat', 'jetski'];
const SPECS = { speedboat: SPEEDBOAT, jetski: JETSKI };
const LABEL = { efoil: 'EFOIL', speedboat: 'SPEEDBOAT', jetski: 'JETSKI' };
const STOPPED = 1.5;            // m/s: craft can be changed at or below this
// Demo pilot: a wide carve that keeps the boat in front of the pier.
const DEMO = { throttle: { speedboat: 0.55, jetski: 0.4 }, turn: { speedboat: 0.32, jetski: 0.22 },
  runUp: 4, maxRange: 300, preroll: 5 };

export class CraftHub {
  // o: { sim, view3d, seaGL, live, glCanvas, restart, toast, showHint, isDemo, getCamera }
  constructor(o) {
    this.o = o;
    this.kind = 'efoil';
    this.hulls = { speedboat: new PlaneHull(SPEEDBOAT), jetski: new PlaneHull(JETSKI) };
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
    if (!CRAFTS.includes(kind)) return false;
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
    setPoseProvider(this.active ? () => this.pose() : null);
    // A restart inside a mode is a CRAFT CHANGE, not a new run: the mode watches sim.tick and
    // would otherwise start over (2026-09-18).
    if (document.body.classList.contains('raid') || document.body.classList.contains('rescue')) globalThis.__modeCraftSwitch = true;
    this.o.restart(true);
    this.audio.setCraft(this.active ? kind : null);
    this.shakeE = 0; this.shakeSlams = this.active ? this.hull.slams : 0;
    const L = this.o.live;
    // tmp-tr82: the phone's throttle is a sticky LEVER, so zeroing `throttle` alone is not
    // enough - the cruise setting would put the old value straight back on the next sample.
    if (L && !this.o.isDemo()) { L.throttle = 0; L.wheelThrottle = 0; L._lastWheel = 0; if (L.zeroTouchThrottle) L.zeroTouchThrottle(); }
    this._syncBar();
    if (!quiet) {
      this.o.toast(`craft: ${LABEL[kind].toLowerCase()}`);
      this.o.showHint(this.hintText(), 9000);
    }
    return true;
  }

  cycle(force) {
    // `force` comes from the on-screen CRAFT button while a mode is running: a phone player is
    // almost never stopped in a raid, and refusing to switch left them with no way to change
    // craft at all (owner, 2026-09-18). The new craft starts where the old one was, at rest.
    if (!force && !this.canSwitch()) { this.o.toast('stop first to change craft (K)'); return; }
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
      + '<b>scroll</b> or <b>&uarr;/&darr;</b> throttle &middot; <b>W/S</b> trim &middot; <b>right mouse</b> or <b>SPACE</b> slow/reverse '
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
  }

  // raw === null means the attract demo is driving.
  step(raw, dt) {
    const sim = this.o.sim;
    let inp = raw || this._demo(dt);
    // RIGHT MOUSE BUTTON = ASTERN (2026-09-17, owner request). input.js raises `brake` once the
    // throttle has been ramped to zero and the button is still held; the astern command then winds
    // on over about a second, so it slows first and backs off second - the same thing SPACE does,
    // on the button the owner reaches for. Released, it drops straight out of gear again.
    if (inp.brake) {
      this.revCmd = Math.min(1, (this.revCmd || 0) + dt * 1.2);
      inp = { ...inp, boost: 1, throttle: Math.max(inp.throttle || 0, this.revCmd) };
    } else this.revCmd = 0;
    this.hull.step(inp, dt, sim.sea, sim.time, this.obs);
    if (!raw) this._demoWatch();
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
      v.applyDynamics(cam, camera === 'fpv' ? null : {
        x: h.x + Math.cos(h.heading) * C.lookAhead,
        y: h.y + C.lookH,
        z: h.z + Math.sin(h.heading) * C.lookAhead,
      });
    }
    // <<< CAMDYN
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

  // tmp-tr50: a damped jolt after a slam (<= 6 cm, <= 0.5 deg chase; FPV a bit more).
  _shake(cam, dy, dp) {
    const e = this.shakeE;
    if (!(e > 0.01)) return;
    const s = this.hull.time;
    cam.y += e * dy * Math.sin(s * 41);
    cam.pitch += e * dp * Math.sin(s * 33 + 1.3);
  }

  _fpv(cam) {
    const h = this.hull, [ex, ey] = this.spec.cam.fpv;
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
