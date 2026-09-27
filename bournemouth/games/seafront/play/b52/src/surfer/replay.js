// THE INSTANT REPLAY (27 Sep 2026). The owner, on making the ride the highlight of the game:
// "should it have like a playback or something like that?".
//
// Every frame of PIER SURF the board's visible state is written into a ring (Ring, below). When a
// ride ends the level cuts a CLIP from it - a second and a half before you stood up to a couple of
// seconds after it finished - and offers it back: REPLAY (X, or the button). Playing it FREEZES the
// game (the clip is on screen as a level briefing card - ui/pausemenu.js BRIEFINGS - so main.js
// holds its fixed step exactly as it does for a rules card), and any key or tap ends it and hands the
// game back exactly where it was. The best ride of the run is kept for the summary card.
//
// HOW A PAST MOMENT IS DRAWN. The sea is a pure function of time (every wave, the sets, the surf),
// so the renderer is asked for the frame at the RECORDED time: sim.time is set to it for the one
// draw call and put straight back. The rider is drawn from a stand-in board (the ghost) carrying the
// recorded state, and the jointed figure poses itself from that exactly as it does live - it runs
// through the same pop-up, stance and wipe-out it did the first time. What lives in the present -
// the line-up - is left out of the picture (gl/surfers.js lineupOff): drawn over a past sea it
// would float. The figure's own animation state is put back when the replay ends.
//
// THE CUT. Three camera set-ups, the way a ride is filmed from the beach and the water:
//   THE TAKE-OFF    from the water ahead of you, low, as the wave stands you up (in slow motion)
//   ON THE FACE     from the beach side, level with you, the wave's face standing up behind you
//   DOWN THE LINE   from behind and above, looking where you are going - the pier ahead of you
// A short ride skips the middle one. A ride that ends in a wipe-out slows down again for it.
//
// Pure parts (Ring, cutClip, sampleClip, planShots, speedAt, shotCamera) are exported for the
// suite (tmp-tr161/suites-live/test-surfer.mjs). No Math.random. Nothing here writes the sim.

export const REPLAY = {
  pre: 1.5,          // s of the clip before you stood up...
  post: 2.2,         // ...and after the ride ended
  ringSec: 60,       // s of history kept (a clip longer than this starts late)
  minGap: 1 / 75,    // s of sim time between two recorded frames (a 144 Hz screen records at ~70)
  offerSec: 7,       // s the REPLAY button stays up after a ride
  slow: 0.35,        // the take-off in slow motion...
  slowFrom: -0.5, slowTo: 1.0,   // ...from this long before the pop-up to this long after
  wipeSlow: 0.5,     // a wipe-out's own slow motion, from just before it to 1.2 s into it
  ramp: 0.25,        // s to ease in and out of slow motion
  takeoffSec: 1.3,   // s after the pop-up that THE TAKE-OFF cuts away
  faceMin: 6,        // s of riding before ON THE FACE is worth its own shot
};

// What is recorded per frame, in this order.
export const FIELDS = ['t', 'x', 'y', 'yDraw', 'z', 'heading', 'pitch', 'roll', 'state', 'stateT', 'r', 'u', 'vx', 'vz', 'thr', 'foam'];
const NF = FIELDS.length;
const ANG = new Set([5, 6, 7]);   // heading, pitch, roll: interpolated the short way round

const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

// ---- the recording --------------------------------------------------------------------------
export class Ring {
  constructor(frames) {
    this.n = frames; this.d = new Float64Array(frames * NF); this.head = 0; this.len = 0; this.lastT = -Infinity;
  }
  clear() { this.head = 0; this.len = 0; this.lastT = -Infinity; }
  // B: the SurfBoard. Returns true if a frame was written.
  push(t, B) {
    if (!(t > this.lastT + REPLAY.minGap * 0.999) && t >= this.lastT) return false;
    if (t < this.lastT) this.clear();   // the sim's clock went back: a restart - the history is gone
    const o = this.head * NF, d = this.d;
    d[o] = t; d[o + 1] = B.x; d[o + 2] = B.y || 0; d[o + 3] = B.yDraw !== undefined ? B.yDraw : (B.y || 0); d[o + 4] = B.z;
    d[o + 5] = B.heading; d[o + 6] = B.pitch || 0; d[o + 7] = B.roll || 0; d[o + 8] = B.state | 0; d[o + 9] = B.stateT || 0;
    d[o + 10] = B.r || 0; d[o + 11] = B.u || 0; d[o + 12] = B.vx || 0; d[o + 13] = B.vz || 0; d[o + 14] = B.thr || 0;
    d[o + 15] = (B.wave && B.wave.foam) || 0;
    this.head = (this.head + 1) % this.n; this.len = Math.min(this.n, this.len + 1); this.lastT = t;
    return true;
  }
  // The frames with t0 <= t <= t1, oldest first, as a fresh array (the ring keeps turning).
  slice(t0, t1) {
    const out = [];
    for (let i = 0; i < this.len; i++) {
      const o = ((this.head - this.len + i + this.n) % this.n) * NF, t = this.d[o];
      if (t >= t0 && t <= t1) for (let k = 0; k < NF; k++) out.push(this.d[o + k]);
    }
    return new Float64Array(out);
  }
}

// A clip: the frames, and what the ride was. meta: { popT, endT, why, score, secs, mult, wave }.
export function cutClip(ring, meta) {
  const d = ring.slice(meta.popT - REPLAY.pre, meta.endT + REPLAY.post);
  const n = d.length / NF;
  if (n < 4) return null;
  const P = sampleClip({ d, n }, meta.popT), E = sampleClip({ d, n }, meta.endT);
  let ax = E.x - P.x, az = E.z - P.z;
  const l = Math.hypot(ax, az);
  if (l < 1) { ax = Math.cos(P.heading); az = Math.sin(P.heading); } else { ax /= l; az /= l; }
  return { d, n, t0: d[0], t1: d[(n - 1) * NF], ...meta, pop: { x: P.x, z: P.z }, along: [ax, az] };
}

// The board at time t, interpolated between the two frames either side. out: reused if given.
export function sampleClip(clip, t, out) {
  const d = clip.d, n = clip.n;
  out = out || {};
  let lo = 0, hi = n - 1;
  if (t <= d[0]) hi = 0;
  else if (t >= d[(n - 1) * NF]) lo = hi = n - 1;
  else { while (hi - lo > 1) { const m = (lo + hi) >> 1; if (d[m * NF] <= t) lo = m; else hi = m; } }
  const a = lo * NF, b = hi * NF;
  const span = d[b] - d[a], f = span > 1e-9 ? clamp((t - d[a]) / span, 0, 1) : 0;
  for (let k = 0; k < NF; k++) {
    const v0 = d[a + k], v1 = d[b + k];
    out[FIELDS[k]] = ANG.has(k) ? v0 + wrap(v1 - v0) * f : v0 + (v1 - v0) * f;
  }
  // The state is not a number between two others: it is the earlier frame's until the later one's.
  out.state = d[a + 8] | 0;
  if (d[b + 8] !== d[a + 8]) out.stateT = d[a + 9] + (t - d[a]);
  out.t = t;
  return out;
}

// ---- the cut ----------------------------------------------------------------------------------
export function planShots(clip) {
  const R = REPLAY, L = clip.endT - clip.popT, cut1 = Math.min(clip.popT + R.takeoffSec, clip.t1);
  const shots = [{ id: 'takeoff', name: 'THE TAKE-OFF', from: clip.t0, to: cut1 }];
  if (L >= R.faceMin) {
    const mid = cut1 + (clip.endT - cut1) * 0.5;
    shots.push({ id: 'face', name: 'ON THE FACE', from: cut1, to: mid });
    shots.push({ id: 'line', name: 'DOWN THE LINE', from: mid, to: clip.t1 });
  } else shots.push({ id: 'line', name: 'DOWN THE LINE', from: cut1, to: clip.t1 });
  return shots;
}

const WIPES = new Set(['falls', 'pearl', 'pier', 'washed']);
// How fast the replay runs at clip time t: 1, or slow motion round the take-off (and a wipe-out).
export function speedAt(clip, t) {
  const R = REPLAY;
  const win = (a, b, v) => {
    const k = Math.min(smooth((t - (a - R.ramp)) / R.ramp), 1 - smooth((t - b) / R.ramp));
    return 1 + (v - 1) * clamp(k, 0, 1);
  };
  let s = win(clip.popT + R.slowFrom, clip.popT + R.slowTo, R.slow);
  if (WIPES.has(clip.why)) s = Math.min(s, win(clip.endT - 0.3, clip.endT + 1.2, R.wipeSlow));
  return s;
}

// ---- the cameras --------------------------------------------------------------------------------
// S: the shot's own state (fresh on a cut). g: the ghost board at this instant. sea: for the water
// under the lens. Writes cam (x, y, z, yaw, pitch) and returns the vertical field of view.
export function shotCamera(shot, S, cam, g, clip, sea, dt, snap) {
  const up = (g.yDraw || 0);
  const waterAt = (x, z) => (sea && sea.sample ? sea.sample(x, z, g.t, 0, 3).height : 0);
  // The line of travel, smoothed (as ride-cam.js does it).
  const sp = Math.hypot(g.vx, g.vz);
  const dir = sp > 1.2 ? Math.atan2(g.vz, g.vx) : g.heading;
  if (snap || S.dir === undefined) S.dir = dir; else S.dir = wrap(S.dir + wrap(dir - S.dir) * Math.min(1, dt / 0.6));
  const fx = Math.cos(S.dir), fz = Math.sin(S.dir);
  let tx, ty, tz, ax, ay, az, fov, follow = true, above = 0.7;
  if (shot.id === 'takeoff') {
    // A tripod in the water: shoreward of where you stood up and along the line you then took,
    // low. It does not move (it bobs with the water); it pans to keep you in the frame.
    const [lx, lz] = clip.along;
    tx = clip.pop.x + lx * 12; tz = clip.pop.z + lz * 12 - 10;
    ty = -Infinity; above = 0.9; follow = false;
    ax = g.x; ay = up + 0.8; az = g.z; fov = 28;   // a long lens: at 40 deg the rider was a speck
  } else if (shot.id === 'face') {
    // From the beach side, level with you, looking OUT TO SEA at you: the face stands up behind you.
    // (First cut aimed ahead of you, down the line, and the face never showed - 27 Sep.)
    let sx = -fz, sz = fx;
    if (sz > 0) { sx = -sx; sz = -sz; }            // the beach side is -Z on this coast
    tx = g.x + fx * 1.5 + sx * 10; tz = g.z + fz * 1.5 + sz * 10; ty = up + 1.6;
    ax = g.x + fx * 0.5; ay = up + 1.1; az = g.z + fz * 0.5; fov = 40;
  } else {
    // From behind and above, looking down the line you are riding - the pier, if you ride to it.
    let sx = -fz, sz = fx;
    if (sz < 0) { sx = -sx; sz = -sz; }            // a little to the sea side, off your shoulder
    tx = g.x - fx * 7.5 + sx * 2; tz = g.z - fz * 7.5 + sz * 2; ty = up + 4.5;
    ax = g.x + fx * 6; ay = up + 0.5; az = g.z + fz * 6; fov = 48;
  }
  const wy = waterAt(tx, tz);
  if (ty < wy + above) ty = wy + above;
  // Position: a critically damped spring told the board's velocity (so it does not trail), or for
  // the tripod, just the water's heave smoothed.
  if (snap || S.x === undefined) { S.x = tx; S.y = ty; S.z = tz; S.vx = follow ? g.vx : 0; S.vy = 0; S.vz = follow ? g.vz : 0; }
  else {
    const w = follow ? 5 : 3, gvx = follow ? g.vx : 0, gvz = follow ? g.vz : 0;
    S.vx += (w * w * (tx - S.x) + 2 * w * (gvx - S.vx)) * dt; S.x += S.vx * dt;
    S.vy += (w * w * (ty - S.y) + 2 * w * (0 - S.vy)) * dt; S.y += S.vy * dt;
    S.vz += (w * w * (tz - S.z) + 2 * w * (gvz - S.vz)) * dt; S.z += S.vz * dt;
  }
  const wy2 = waterAt(S.x, S.z);
  if (S.y < wy2 + 0.4) S.y = wy2 + 0.4;
  // Aim: smoothed too, so a carve swings the shot rather than jerking it.
  if (snap || S.ax === undefined) { S.ax = ax; S.ay = ay; S.az = az; }
  else { const k = Math.min(1, dt * 8); S.ax += (ax - S.ax) * k; S.ay += (ay - S.ay) * k; S.az += (az - S.az) * k; }
  cam.x = S.x; cam.y = S.y; cam.z = S.z;
  cam.yaw = Math.atan2(S.az - S.z, S.ax - S.x);
  cam.pitch = Math.atan2(S.ay - S.y, Math.hypot(S.ax - S.x, S.az - S.z));
  return fov * Math.PI / 180;
}

// ---- the player -------------------------------------------------------------------------------
// The jointed figure's animation state (gl/surfer-figure.js SurferFigure: everything its update()
// writes, none of its mesh). A replay poses it from the recording; this is what is put back after.
export const FIG_STATE = ['phase', 'amp', 'sit', 'stillT', 'lean', 'comp', 'look', 'lastState', 'fromPose', 'fromT', 'pose', 'popT', 't',
  'sLean', 'sComp', 'sSpin', 'sC', 'sS', 'sB', 'sW', 'sty', 'downT', 'downFrom', 'wipeFrom', 'rig', 'G', 'duckP', 'ex', 'lookCtl', 'drawAt', '_wb',
  'hideNear'];
const cloneState = (v) => (v === null || typeof v !== 'object' ? v
  : typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

const CSS = [
  '#sf-replay { position: absolute; inset: 0; pointer-events: none; z-index: 31; display: none;',
  '  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; color: #f4f7fb; }',
  '#sf-replay.on { display: block; }',
  '#sf-replay .rec { position: absolute; top: 14px; left: 16px; font: 800 18px/1 ui-monospace, Consolas, monospace; letter-spacing: .12em;',
  '  text-shadow: 0 2px 8px rgba(0,0,0,.6); }',
  '#sf-replay .rec i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ff4a4a; margin-right: 8px;',
  '  vertical-align: 0; animation: sfrec 1s steps(2, start) infinite; }',
  '@keyframes sfrec { to { visibility: hidden; } }',
  // On a dark pill: pale blue straight on a pale sky could not be read (the take-off shot, 27 Sep).
  '#sf-replay .shot { position: absolute; top: 10px; right: 12px; font: 800 16px/1.2 ui-sans-serif, system-ui, sans-serif; letter-spacing: .1em;',
  '  text-align: right; color: #9fe6ff; background: rgba(8,14,22,.62); border: 1px solid rgba(255,255,255,.14); border-radius: 10px; padding: 6px 12px; }',
  '#sf-replay .shot:empty { display: none; }',
  '#sf-replay .rec { background: rgba(8,14,22,.62); border: 1px solid rgba(255,255,255,.14); border-radius: 10px; padding: 6px 12px; top: 10px; left: 12px; }',
  '#sf-replay .foot { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); width: min(520px, calc(100% - 32px));',
  '  text-align: center; background: rgba(8,14,22,.62); border: 1px solid rgba(255,255,255,.14); border-radius: 12px; padding: 8px 14px 10px; box-sizing: border-box; }',
  '#sf-replay .info { font: 800 18px/1.2 ui-monospace, Consolas, monospace; color: #ffd76a; }',
  '#sf-replay .bar { height: 5px; border-radius: 3px; background: rgba(255,255,255,.18); overflow: hidden; margin: 7px 0 5px; }',
  '#sf-replay .bar i { display: block; height: 100%; width: 0; background: #ff4a4a; }',
  '#sf-replay .skip { font-size: 14px; color: #b8c9d9; }',
  // Everything that is the live game steps out of the picture while it plays.
  'body.sf-replaying #hud, body.sf-replaying #sf-top, body.sf-replaying #sf-score, body.sf-replaying #sf-meter,',
  'body.sf-replaying #sf-prompt, body.sf-replaying #sf-ride, body.sf-replaying #sf-banner, body.sf-replaying .sf-pop,',
  'body.sf-replaying #sf-over, body.sf-replaying #sf-rpbtn { display: none !important; }',
  // ...and the game's own controls: a tap on RESET or LEVELS mid-replay acted on the game behind it
  // (a button is exempt from ending the card). Hidden, a tap lands on the picture and ends the replay.
  'body.sf-replaying #touchui, body.sf-replaying #tboost, body.sf-replaying #tbtns { visibility: hidden !important; }',
  // THE OFFER: after a ride, where the ride counter was (it has gone by then).
  '#sf-rpbtn { position: absolute; left: 50%; top: 64px; transform: translateX(-50%); display: none; pointer-events: auto; z-index: 31;',
  '  font: 800 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; color: #0b1520; background: #ffc21a; border: 0;',
  '  border-radius: 999px; padding: 10px 20px; min-height: 44px; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.35); }',
  '#sf-rpbtn.on { display: block; }',
  '#sf-rpbtn small { font-size: 14px; font-weight: 600; opacity: .7; margin-left: 6px; }',
  // On a phone the offer is a pill in the top corner (stage 1, 27 Sep 2026). It used to take the
  // prompt's place - and the prompt after a ride is the one saying where to paddle back to.
  'body.touch #sf-rpbtn { top: 10px; left: auto; right: 10px; transform: none; padding: 8px 14px; font-size: 15px; }',
  'body.touch #sf-rpbtn small { display: none; }',
  'body.clean-render #sf-replay, body.clean-render #sf-rpbtn { display: none !important; }',
].join('\n');

// ctx: { sim, hub (the craft hub), mount }. The level (mode.js) owns it.
export function createReplay(ctx) {
  const ring = new Ring(Math.ceil(REPLAY.ringSec / REPLAY.minGap));
  const R = { ring, last: null, best: null, pending: null, P: null, offerT: 0 };
  let el = null, btn = null;

  function dom() {
    if (el || typeof document === 'undefined' || !ctx.mount) return el;
    if (!document.getElementById('sf-rp-css')) {
      const st = document.createElement('style'); st.id = 'sf-rp-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    el = document.createElement('div');
    el.id = 'sf-replay';
    el.innerHTML = '<div class="rec"><i></i>REPLAY</div><div class="shot"></div>'
      + '<div class="foot"><div class="info"></div><div class="bar"><i></i></div><div class="skip">any key or tap to go back to the surf</div></div>';
    btn = document.createElement('button');
    btn.id = 'sf-rpbtn'; btn.type = 'button';
    btn.innerHTML = '&#9654; REPLAY<small>X</small>';
    btn.addEventListener('click', (e) => { e.stopPropagation(); R.play(R.last); });
    ctx.mount.appendChild(el); ctx.mount.appendChild(btn);
    return el;
  }

  // Every rendered frame of the level (mode.js S.frame): write the board down, cut a clip that is due.
  R.record = function (t, B) {
    if (R.P) return;
    ring.push(t, B);
    const p = R.pending;
    if (p && t >= p.endT + REPLAY.post) R.cut();
    if (R.offerT && t > R.offerT) R.offer(false);
  };
  // A ride has ended (mode.js, on 'ride_end'). The clip is cut once its last seconds are recorded.
  R.rideEnded = function (meta) {
    if (R.pending) R.cut();
    R.pending = meta;
  };
  R.cut = function () {
    const p = R.pending; R.pending = null;
    if (!p) return null;
    const c = cutClip(ring, p);
    if (!c) return null;
    R.last = c;
    if (p.ok && (!R.best || c.score > R.best.score)) R.best = c;
    if (p.ok) R.offer(true);
    return c;
  };
  R.offer = function (on) {
    dom();
    R.offerT = on ? ring.lastT + REPLAY.offerSec : 0;
    if (btn) btn.classList.toggle('on', !!on);
    if (typeof document !== 'undefined') document.body.classList.toggle('sf-offer', !!on);
  };
  R.reset = function () { R.stop(); ring.clear(); R.last = null; R.best = null; R.pending = null; R.offer(false); };

  // ---- playing ----
  R.playing = () => !!R.P;
  R.play = function (clip) {
    if (!clip || R.P || !dom()) return false;
    const hub = ctx.hub(), sg = hub && hub.o && hub.o.seaGL, S = sg && sg.surfers;
    if (!hub || !S || !S.fig) return false;
    R.offer(false);
    // The figure's own animation state and the line-up renderer's clocks, to put back afterwards.
    const F = S.fig.fig, keep = {};
    for (const k of FIG_STATE) if (k in F) keep[k] = cloneState(F[k]);
    const sKeep = { _figT: S._figT, _pb: S._pb, _pw: S._pw, _pwLast: S._pwLast };
    const ghost = { spec: hub.hull.spec, wave: { foam: 0 }, ticks: 0, speed: 0 };
    // The board's spray and trail (gl/boats.js _surfFx) are run on the recording too: the live
    // ones are set aside, and put back as they were.
    const bx = sg.boats && sg.boats.surfFxSave ? sg.boats : null;
    const fx = bx ? bx.surfFxSave() : null;
    if (bx) bx.surfFxClear();
    R.P = { clip, t: clip.t0, shots: planShots(clip), si: -1, S: {}, ghost, keep, sKeep, F, hub, sg, bx, fx };
    const info = el.querySelector('.info');
    info.textContent = `${clip.ok ? `WAVE ${clip.wave}` : 'RIDE'}  ·  +${clip.score}  ·  ${clip.secs.toFixed(1)} s  ·  ×${clip.mult}`;
    el.classList.add('on');
    document.body.classList.add('sf-replaying');
    return true;
  };
  R.stop = function () {
    const P = R.P;
    if (!P) return;
    R.P = null;
    const S = P.sg.surfers;
    Object.assign(P.F, P.keep);
    Object.assign(S, P.sKeep);
    S.player = P.hub.hull; S.lineupOff = false;
    if (P.bx && P.fx) P.bx.surfFxRestore(P.fx);
    P.hub.camInit = false;
    if (el) el.classList.remove('on');
    if (typeof document !== 'undefined') document.body.classList.remove('sf-replaying');
  };

  // THE FRAME, from boats/hub.js draw(). True if the replay drew it (the hub then does nothing else).
  R.draw = function (hub, camera, ft) {
    const P = R.P;
    if (!P) return false;
    // Dismissed (any key or tap - main.js dismissBriefing takes the card down): this frame is live.
    if (!el.classList.contains('on')) { R.stop(); return false; }
    const o = hub.o, sim = o.sim, v = o.view3d, sg = P.sg, clip = P.clip, g = P.ghost;
    const dt = Math.max(0, Math.min(0.1, ft || 1 / 60));
    const rdt = dt * speedAt(clip, P.t);   // clip time this frame (slow motion slows the water too)
    P.t = Math.min(clip.t1, P.t + rdt);
    sampleClip(clip, P.t, g);
    g.wave.foam = g.foam; g.speed = Math.hypot(g.vx, g.vz);
    if (P.bx) { P.bx.hull = g; if (rdt > 0) P.bx._surfFx(rdt, sim.sea, g.t); }
    // The shot for this moment; a new one is a cut (fresh camera state).
    let si = P.shots.findIndex((s) => P.t >= s.from && P.t < s.to);
    if (si < 0) si = P.shots.length - 1;
    const cut = si !== P.si;
    if (cut) { P.si = si; P.S = {}; }
    const shot = P.shots[si];
    const fov = shotCamera(shot, P.S, v.cam, g, clip, sim.sea, rdt, cut);
    const live = sim.time;
    sim.time = g.t;
    sg.surfers.player = g; sg.surfers.lineupOff = true;
    if (P.F.lookCtl !== undefined) P.F.lookCtl = null;
    P.F.hideNear = false;   // the live ride view may have been mid-blend: a replay always shows the rider
    if (o.glCanvas) o.glCanvas.classList.add('on');
    try { sg.draw(sim, v.cam, fov, 'chase'); }
    finally { sim.time = live; sg.surfers.player = hub.hull; if (P.bx) P.bx.hull = hub.hull; }
    if (v.ctx) { v.ctx.setTransform(v.dpr || 1, 0, 0, v.dpr || 1, 0, 0); v.ctx.clearRect(0, 0, v.W || 0, v.H || 0); }
    // The card.
    const slow = speedAt(clip, P.t) < 0.9;
    const label = shot.name + (slow ? '  ·  SLOW-MO' : '');
    const se = el.querySelector('.shot');
    if (se.textContent !== label) se.textContent = label;
    el.querySelector('.bar i').style.width = `${(100 * (P.t - clip.t0) / Math.max(0.01, clip.t1 - clip.t0)).toFixed(1)}%`;
    if (P.t >= clip.t1) R.stop();
    return true;
  };
  return R;
}
