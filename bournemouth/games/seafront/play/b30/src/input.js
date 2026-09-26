// Per-platform input.
//
// One contract, four devices:
//
//   { lean: -1..1, turn: -1..1, throttle: 0..1, boost: 0|1 }
//
// Throttle is a TARGET, not a position. Every device sets it directly (trigger,
// slider, tilt) or ramps it (keys, mouse buttons); the rider's hand rate limit
// in rider.js is what turns that target into an actual throttle, so keyboard
// and gamepad end up feeling the same.
//
// The one rule that makes replay a proof rather than a demo: input is quantised
// AT SAMPLE TIME, so a live tick and a replayed tick are fed byte-identical
// numbers whichever device produced them.
//
// >>> PAD
// ⚠️ AND THE RULE THAT PROTECTS IT (tmp-tr198). The pad's one-shot actions - camera, craft -
// are VIEW actions, not craft input. They are NOT in the contract above, they are NOT in
// `out`, and Recorder never sees them; they leave this file through pollActions(), which
// main.js drains once per rendered FRAME. So the recorded stream is the same four numbers
// it has always been, and a replay - which does not call sample() at all - cannot be
// reached by a pad. The only pad value that is new INSIDE the contract is astern, and it
// arrives as `brake`, which was already outside the recording by the same reasoning the
// mouse's right button is.
// <<< PAD

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const q8 = (v) => Math.round(clamp(v, -1, 1) * 127) / 127;
const q8u = (v) => Math.round(clamp(v, 0, 1) * 255) / 255;

export const KEYMAP = {
  leanFwd: ['KeyW'],
  leanBack: ['KeyS'],
  turnLeft: ['KeyA'],
  turnRight: ['KeyD'],
  thrUp: ['ArrowUp'],
  thrDown: ['ArrowDown'],
  boost: ['Space'],
};

const KEY_RAMP = 3.0;      // /s - how fast a held key expresses intent.
                           // Deliberately faster than the rider's hand, so the
                           // hand stays the binding constraint on every device.

// >>> PAD
// ---------------------------------------------------------------------------
// GAMEPAD (tmp-tr198). The pad was already half-wired and nobody knew: the left stick,
// the right trigger and A have driven this game since the file was written, and the raid
// has read FIRE and WATER off the pad since tr60. What was missing was ASTERN - `brake` was
// gated to touch and mouse, so a boat could not be backed off on a pad by construction -
// and the two VIEW actions, camera and craft.
//
// THE WHOLE MAP, so it is written down in one place for the first time:
//
//   left stick          lean (Y) / steer (X)        this file, dead zone PAD.dead
//   RT      buttons[7]  throttle, analogue          this file
//   LT      buttons[6]  ease off, then ASTERN       this file, NEW
//   A       buttons[0]  punch it (boost)            this file
//   B       buttons[1]  camera: side/chase/FPV      this file, NEW (edge)
//   R3      buttons[11] camera, same action         this file, NEW (edge)
//   d-pad R buttons[15] next craft                  this file, NEW (edge)
//   X       buttons[2]  fire       )  raid/raid-mode.js, since tr60. NOT bound here, and
//   RB      buttons[5]  fire       )  deliberately not moved: they are HELD, that file polls
//   Y       buttons[3]  water      )  them itself every tick, and they already work.
//   LB      buttons[4]  water      )
//
// Why the brief's proposed Y-for-camera was declined: Y is the water cannon and has been
// since tr60. B and R3 were free; nothing had to move.
//
// ⚠️ THE INDICES ABOVE ONLY MEAN ANYTHING ON THE STANDARD MAPPING. A pad reporting
// `mapping: ""` lays its axes and buttons out however its driver felt like, so reading
// index 7 off one is not "an approximation", it is noise. _padUsable() refuses those pads
// outright and says so, instead of steering the craft with them.
export const PAD = {
  dead: 0.12,        // stick dead zone. Unchanged - this is the number the file has always used.
  trigDead: 0.06,    // LT only. RT is read RAW, exactly as before, so with LT at rest the
                     // throttle path is byte-identical to the one that shipped.
  astern: 0.55,      // LT past this, with RT shut, is ASTERN. Below it LT only cuts the ahead
                     // throttle. The detent is in the VALUE, not on the trigger, which is the
                     // same trick the touch lever uses (_thrRaw) - so a player finds neutral
                     // without looking and cannot slip into reverse by resting a finger.
  rtShut: 0.05,      // ... and astern needs the ahead trigger actually shut, so you cannot be
                     // driving forward and astern at the same time.
  wake: 0.2,         // how much REAL input it takes to make the pad the active device (defect 2)
  BTN: { boost: 0, camera: 1, fire: 2, water: 3, lb: 4, rb: 5, lt: 6, rt: 7,
         camera2: 11, dpadRight: 15 },
};
// <<< PAD

// ---------------------------------------------------------------------------
// PHONE CONTROL SCHEME (tmp-tr82): "left thumb rides, right thumb fights, the
// throttle looks after itself". One source of truth for the geometry, because
// index.html has to DRAW the throttle strip exactly where input.js GRABS it -
// the old scheme drew a 56 px slider and then took the whole right half, which
// is how FIRE and WATER ended up inside the throttle's grab region.
//
// Every number is CSS px in the canvas's own coordinates.
export const TOUCH = {
  edge: 24,          // left/right strip where a drag is IGNORED. A web page cannot defer
                     // Android's back gesture or iOS's edge swipe, so the only fix is not to
                     // put anything draggable there.
  bottom: 36,        // same idea for the home indicator: nothing draggable below this.
  stripW: 64,        // throttle strip, drawn and grabbed at the same width
  stripRight: 24,    // its right margin (== edge, so its right side is the dead strip)
  stripTop: 0.35,    // top of the strip, as a fraction of canvas height (landscape). 0.35 of a
                     // 393 px screen is y=137, which clears the raid's score panel (it ends at
                     // y=127); at 0.17 the top 60 px of the lever was drawn BEHIND it.
  stripTopP: 0.66,   // ... portrait: an 852 px screen does not want a 660 px lever, and the
                     // bottom third is where the thumb already is
  stripBottom: 46,   // px clear of the canvas bottom
  padLeft: 0.45,     // the stick's activation region: x in [edge, w*padLeft]
  padTop: 0.22,      // ... and y > h*padTop, so the top strip stays cold
  // ELLIPTICAL STICK. Trim is the mechanic this project is gated on and steering is not,
  // so the trim axis gets the longer travel and therefore the finer resolution. The thumb
  // also sweeps sideways more easily than up and down, so equal radii would make trim the
  // twitchier axis - exactly backwards.
  padRx: 48, padRy: 62,           // landscape
  padRxP: 50, padRyP: 66,         // portrait (h > w)
  padDead: 0.08,     // 8% of radius. Touch is the noisiest device and was the ONLY one with
                     // no dead zone at all: mouse uses 0.08/0.10, gamepad 0.12.
  padRecentre: 1.4,  // past 1.4R the anchor follows the thumb, so a slow drift up the screen
                     // cannot silently become a permanent full nose-up.
  leanExpo: 1.45,    // >1 = finer near neutral. Measured against linear: see tmp-tr82/RESULT.md
  turnExpo: 1.25,
  thrR: 190,         // px of drag for one unit of throttle (capped at h*0.42)
  thrRfrac: 0.42,
  astern: 0.5,       // how far below zero the strip goes (0.5 = half a unit of drag)
  detent: 0.07,      // the ZERO DETENT: |raw| below this is exactly zero, in both directions,
                     // so you can find idle without looking and cannot slip into reverse.
  tiltLean: 22,      // degrees of pitch for full trim
  tiltSteer: 25,     // degrees of roll for full lock
  tiltDead: 0.08,
  thumbWins: 0.02,   // a thumb this far off centre overrides tilt, on BOTH axes
};

const TOUCH_KEY = 'efoil.touch.v1';

// The scheme's defaults, which are the research's recommendation:
// cruise throttle, auto-fire in the raid, tilt off until the player asks for it.
export const TOUCH_DEFAULTS = {
  throttle: 'cruise',   // cruise | hold | manual
  fire: 'auto',         // auto | button
  tilt: 'off',          // off | lean | leansteer
  mirror: false,        // left-handed: stick right, throttle left
  size: 'm',            // s | m | l
  opacity: 0.85,        // 0.35 .. 1
};

export const touchSettings = { ...TOUCH_DEFAULTS };

export function loadTouchSettings() {
  try {
    const raw = globalThis.localStorage && localStorage.getItem(TOUCH_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      for (const k in TOUCH_DEFAULTS) if (v[k] !== undefined) touchSettings[k] = v[k];
    }
  } catch { /* private mode, or a corrupt value: the defaults are the scheme anyway */ }
  return touchSettings;
}

export function saveTouchSettings() {
  try {
    if (globalThis.localStorage) localStorage.setItem(TOUCH_KEY, JSON.stringify(touchSettings));
  } catch { /* nothing to do: the setting still applies for this session */ }
  return touchSettings;
}

export function setTouchSetting(k, v) {
  if (!(k in TOUCH_DEFAULTS)) return touchSettings;
  touchSettings[k] = v;
  return saveTouchSettings();
}

// The throttle strip, in canvas coordinates. index.html positions the widget from
// exactly this, so what you see is what you can grab.
export function stripRect(w, h) {
  const m = touchSettings.mirror;
  const x = m ? TOUCH.stripRight : w - TOUCH.stripRight - TOUCH.stripW;
  const top = Math.round(h * (h > w ? TOUCH.stripTopP : TOUCH.stripTop));
  const bot = h - TOUCH.stripBottom;
  return { x, y: top, w: TOUCH.stripW, h: Math.max(60, bot - top), zero: 0 };
}

export class InputHub {
  constructor(canvas) {
    this.canvas = canvas;
    this.mode = 'keyboard';
    this.available = { keyboard: true, mouse: true, gamepad: false, touch: false };
    this.tilt = { on: false, supported: 'DeviceOrientationEvent' in window, zero: null, beta: 0, roll: 0, rollZero: null };

    this.keys = new Set();
    this.mouse = { lean: 0, turn: 0, down: 0, right: 0, over: false };
    // POINTER LOCK (2026-09-17, the owner: clicks "drop me out of the browser window even in
    // full screen"). Steering read the cursor's ABSOLUTE position in the canvas, so the pointer
    // wandered off the edge and the next click landed on whatever was behind the game. Clicking
    // the scene now locks the pointer: the cursor is hidden, movementX/Y drives a virtual stick
    // (`lockX/lockY`, the same -1..1 the absolute path produces), and Escape gives it back.
    // Unlocked behaviour is exactly as before, so nothing changes for a player who never clicks.
    this.locked = false;
    this.lockX = 0;
    this.lockY = 0;
    this.rightT = 0;      // right button held, seconds (slow down, then astern on a boat)
    this.brake = 0;
    // Absolute throttle set by the wheel, kept separate from `throttle` so the
    // keys and the buttons can still ramp on top of it.
    this.wheelThrottle = 0;
    this._lastWheel = 0;
    // thrRaw is the throttle LEVER, -TOUCH.astern .. 1, with zero in the middle of a detent.
    // `throttle` is what the craft gets (0..1) and `astern` is what a boat reads as reverse.
    this.touch = {
      lean: 0, turn: 0, throttle: 0, boost: 0, astern: 0,
      padId: null, padX: 0, padY: 0, thrId: null, thrStart: 0, thrOrigin: 0, thrRaw: 0,
    };
    loadTouchSettings();
    // >>> PAD
    // `astern` joins the pad's own state for the same reason `touch.astern` exists: it is the
    // reverse half of one lever, and the craft reads it through `brake` like every other device.
    this.pad = { lean: 0, turn: 0, throttle: 0, boost: 0, astern: 0 };
    // What the last pad we looked at actually is. `usable` is false for a pad whose layout we
    // cannot read; the toast in main.js says which of the two happened, so a refused pad is
    // visible rather than simply dead.
    this.padInfo = { id: '', mapping: '', usable: false, seen: false };
    this._padPrev = 0;          // edge state for pollActions(). Written in ONE place, on purpose.
    this._padActions = [];
    // Defect 2: a pad appearing must not steal the mode. When it is genuinely used and later
    // unplugged, the player goes back to whatever they were driving with, not to 'keyboard'.
    this._preGamepadMode = 'mouse';
    // <<< PAD

    this.throttle = 0;       // persistent target, ramped by digital devices
    this.out = { lean: 0, turn: 0, throttle: 0, boost: 0 };

    this._bindKeyboard();
    this._bindMouse();
    this._bindGamepad();

    // MOUSE IS THE DEFAULT ON DESKTOP. The keyboard ramps lean through a rate
    // limit, which is honest to a real rider's hands but makes holding a 16 cm
    // band genuinely unpleasant to attempt - and whether holding that band is
    // FUN is the one question this whole project is gated on. A control scheme
    // that fights the tester cannot answer it. The mouse gives a continuous,
    // absolute lean axis, which is what the mechanic actually wants.
    // Keyboard stays available and M toggles back.
    this.mode = 'mouse';
    if (matchMedia('(pointer: coarse)').matches) {
      this.available.touch = true;
      this.mode = 'touch';
    }
  }

  // -------------------------------------------------------------------------
  _bindKeyboard() {
    addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      this.keys.add(e.code);
      if (this.mode !== 'keyboard' && this._isDriveKey(e.code)) this.mode = 'keyboard';
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  _isDriveKey(code) {
    for (const list of Object.values(KEYMAP)) if (list.includes(code)) return true;
    return false;
  }

  _bindMouse() {
    const c = this.canvas;
    c.addEventListener('mousemove', (e) => {
      const r = c.getBoundingClientRect();
      this.mouse.over = true;
      let nx, ny;
      if (this.locked) {
        // Relative: the same -1..1 the absolute path gives, but it cannot leave the window.
        // Half the canvas of travel moves the stick from centre to full, as before.
        this.lockX = clamp(this.lockX + (e.movementX || 0) / Math.max(1, r.width / 2), -1, 1);
        this.lockY = clamp(this.lockY + (e.movementY || 0) / Math.max(1, r.height / 2), -1, 1);
        nx = this.lockX; ny = this.lockY;
      } else {
        // Up = lean back = nose up. Dead zone in the middle third so the neutral
        // stance is somewhere you can actually rest.
        ny = ((e.clientY - r.top) / r.height) * 2 - 1;
        nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      }
      this.mouse.lean = -this._dead(ny, 0.08) * 1.15;
      this.mouse.turn = this._dead(nx, 0.10) * 1.15;
    });
    c.addEventListener('mouseleave', () => { this.mouse.over = false; });
    c.addEventListener('mousedown', (e) => {
      // Edge and Chrome open autoscroll on a middle click, which steals the pointer mid-fight
      // (middle mouse is FIRE in the Viking raid).
      if (e.button === 1) e.preventDefault();
      if (e.button === 0) this.mouse.down = 1;
      if (e.button === 2) this.mouse.right = 1;
      // Take the pointer on the first click in the scene, from wherever the cursor is, so the
      // craft does not jump. Never during a calibration/clean render, and never if the browser
      // refuses (it throws when the document is not user-activated).
      // NEVER on a phone (2026-09-18, owner: "message comes up to show your cursor switch apps").
      // A tap fires a compatibility mousedown, so the touch UI was silently asking for pointer lock
      // and Chrome threw up its "press and hold to show your cursor and switch apps" banner over
      // the game. There is no cursor to capture on a touch device.
      // Judge the EVENT, not the layout: body.touch is also set for a small desktop window, and a
      // mouse in a small window should still get pointer lock. firesTouchEvents is true exactly for
      // the compatibility mousedown a tap produces.
      const fromTouch = (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents)
        || (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches);
      // >>> PAUSEMENU
      // ...AND NOT WHILE A SHEET WITH BUTTONS IS ON SCREEN (tmp-tr199).
      //
      // Measured, through a real browser's own input pipeline rather than a synthetic
      // event: while the lock is held, a real click on the EXACT CENTRE of a summary
      // card's CHOOSE LEVEL button lands on `view` and the button cannot be pressed at
      // all. There is no cursor and every mouse event goes to the locked element. So the
      // owner's "it's difficult to select the different buttons" is not difficulty, it is
      // impossibility, and it is the same defect as the swallowed Escape.
      //
      // main.js hands the mouse back when such a sheet appears. This term is the other
      // half: without it the next click that MISSES the card would take the lock straight
      // back and the cursor would vanish again between one button and the next.
      //
      // A BODY CLASS, NOT AN IMPORT, and that is deliberate rather than lazy: this file
      // has never imported anything and is the better for it, and the same line already
      // asks document.body for `clean-render`, so this is the identical question asked
      // the identical way. src/ui/pausemenu.js sets the class and owns the ONE list of
      // which sheets need a cursor; there is no second copy of that list here.
      //
      // ⚠️ THIS FILE IS CRLF. Verified by byte count before and after - never with
      // `grep -c $'\r$'`, which lies on this project (CONTRACT-round5 §1).
      // <<< PAUSEMENU
      if (!fromTouch && !this.locked && !window.__calCam && !document.body.classList.contains('clean-render')
      // >>> PAUSEMENU
          && !document.body.classList.contains('pm-sheet')
      // <<< PAUSEMENU
      ) {
        const r = c.getBoundingClientRect();
        this.lockX = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
        this.lockY = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
        try { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* not supported */ }
      }
      // Clicking the scene switches to mouse control. This used to read
      // `this.mode === 'keyboard' && this.mouseEnabled`, and mouseEnabled is
      // `this.mode === 'mouse'` - so the condition was mode===keyboard AND
      // mode===mouse, which is never true. Clicking did nothing, and the only
      // way in was an undocumented M key.
      if (this.mode === 'keyboard') this.mode = 'mouse';
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = 0;
      if (e.button === 2) this.mouse.right = 0;
    });
    // THROTTLE ON THE WHEEL. Holding a button to ramp throttle means you never
    // know where the throttle actually is, which is poor for a mechanic whose
    // whole difficulty is holding a narrow band - the rider needs to set power
    // and then concentrate on lean. The wheel is absolute, notched and can be
    // nudged without moving the hand that is steering.
    // Each notch is 6%: fine enough to trim, coarse enough to go from float to
    // flying in a couple of flicks.
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.mode === 'keyboard') this.mode = 'mouse';
      this.wheelThrottle = clamp(this.wheelThrottle - Math.sign(e.deltaY) * 0.06, 0, 1);
    }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('dragstart', (e) => e.preventDefault());
    c.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === c;
      if (!this.locked) { this.mouse.down = 0; this.mouse.right = 0; }   // the release swallows the mouseup
    });
    document.addEventListener('pointerlockerror', () => { this.locked = false; });
  }

  _dead(v, dz) {
    const a = Math.abs(v);
    return a < dz ? 0 : Math.sign(v) * ((a - dz) / (1 - dz));
  }

  // >>> PAD
  // DEFECT 2 (tmp-tr198). This used to be `this.mode = 'gamepad'` on connect. Plugging a pad in
  // while playing on the keyboard or the mouse stopped the keyboard and the mouse steering until
  // you touched a key, because sample() reads `mode` and nothing else. A pad APPEARING is not a
  // player using one. Availability follows the connection; the MODE follows actual input, in
  // _pollGamepad() below, against PAD.wake.
  //
  // Disconnect is the same rule read backwards: if the pad was never driven the mode is already
  // right and must not be touched, and if it was, the player goes back to the device they were
  // on before - not unconditionally to 'keyboard', which on a desktop was never where they were.
  _bindGamepad() {
    addEventListener('gamepadconnected', (e) => {
      const g = e && e.gamepad;
      this.padInfo = { id: (g && g.id) || '', mapping: (g && g.mapping) || '',
        usable: this._padUsable(g), seen: true };
      if (this.padInfo.usable) this.available.gamepad = true;
    });
    addEventListener('gamepaddisconnected', () => {
      // Re-derive rather than assume: a second pad may still be plugged in.
      this.available.gamepad = this._anyUsablePad();
      if (!this.available.gamepad) {
        this.padInfo = { ...this.padInfo, usable: false, seen: false };
        if (this.mode === 'gamepad') this.mode = this._preGamepadMode || 'keyboard';
      }
    });
  }

  // The ONE test for "may I read this pad's indices". `mapping` is the only thing the Gamepad
  // API tells us about the layout, and off 'standard' the numbers are whatever the driver chose.
  _padUsable(g) { return !!g && g.mapping === 'standard'; }

  _anyUsablePad() {
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const g of pads) if (this._padUsable(g)) return true;
    } catch { /* getGamepads throws in some sandboxes; treat it as no pad */ }
    return false;
  }

  // The live standard-mapping pad, or null. Lowest index wins, and an unreadable pad is SKIPPED
  // rather than taken - with a generic pad in port 0 and a proper one in port 1, the old loop
  // took port 0's garbage and never looked further.
  _pad() {
    let pads;
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; }
    catch { return null; }
    let refused = null;
    for (const g of pads) {
      if (!g) continue;
      if (this._padUsable(g)) return g;
      if (!refused) refused = g;
    }
    if (refused && this.padInfo.id !== refused.id) {
      this.padInfo = { id: refused.id || '', mapping: refused.mapping || '', usable: false, seen: true };
    }
    return null;
  }

  _btn(g, i) {
    const b = g.buttons[i];
    if (!b) return 0;
    return b.value != null ? b.value : (b.pressed ? 1 : 0);
  }

  _pressed(g, i) {
    const b = g.buttons[i];
    return !!(b && (b.pressed || (b.value != null && b.value > 0.5)));
  }

  // EDGE ACTIONS. Buttons on a pad are POLLED, not evented: there is no queue of transitions to
  // drain, only "what is down right now". So a one-shot action needs a rising edge computed
  // against the previous poll, and there are exactly two properties to get right:
  //
  //   cannot DOUBLE-FIRE - `_padPrev` is written in this method and nowhere else in the file,
  //     once per call, from the same `bits` the edge was computed against. A button held across
  //     N calls rises exactly once. sample() never touches it, so the 1-8 sample() calls a frame
  //     makes cannot consume or repeat an edge.
  //   cannot MISS a press that spans a poll - a button down at poll N and up at poll N+1 still
  //     shows in `bits` at poll N.
  //
  // ⚠️ What it CANNOT do, and no web page can: see a press that goes down AND up entirely
  // between two polls. The Gamepad API exposes no transition history. main.js calls this once
  // per rendered frame, so the blind window is one frame - ~17 ms at 60 fps, against a human
  // button press of 50-200 ms. Stated, and tested, rather than claimed away.
  //
  // Called once per FRAME, not per sim tick, and deliberately not from sample(): sample() is not
  // called at all during a replay or the attract demo, and is called 0-8 times in a frame
  // otherwise, so an edge hung off it would be both jittery and absent exactly when the player
  // wants to change camera.
  pollActions() {
    const out = this._padActions;
    out.length = 0;
    const g = this._pad();
    if (!g) { this._padPrev = 0; return out; }
    const B = PAD.BTN;
    // Both camera buttons are ORed into ONE bit before the edge is taken, so pressing B and R3
    // together is one camera change, not two.
    const bits = (this._pressed(g, B.camera) || this._pressed(g, B.camera2) ? 1 : 0)
      | (this._pressed(g, B.dpadRight) ? 2 : 0);
    const rise = bits & ~this._padPrev;
    this._padPrev = bits;
    if (rise & 1) out.push('camera');
    if (rise & 2) out.push('craft');
    return out;
  }
  // <<< PAD

  // Tilt-to-lean. Fits an eFoil unusually well - you lean the phone the way you
  // lean your body. Needs a secure context, so over plain http on a LAN it will
  // simply refuse; the thumb pad is always there as the fallback.
  // ⚠️ ONE LISTENER FOR THE SESSION (tmp-tr82). This used to add a NEW deviceorientation
  // listener on every tap of TILT, and the toast says "tap again to re-zero" - so a player
  // following the instructions accumulated handlers and the axis got noisier every tap.
  // The permission prompt still needs a user gesture, so the call stays on the button; the
  // listener is registered at most once and a repeat tap is a re-zero and nothing else.
  async enableTilt() {
    if (!this.tilt.supported) return 'unsupported';
    if (this._tiltBound) { this.recalibrateTilt(); return 'ok'; }
    try {
      const D = window.DeviceOrientationEvent;
      if (typeof D.requestPermission === 'function') {
        const r = await D.requestPermission();
        if (r !== 'granted') return 'denied';
      }
    } catch { return 'needs-https'; }
    this._onOrient = (e) => {
      if (e.beta == null) return;
      // ⚠️ BOTH AXES ARE RESOLVED IN SCREEN SPACE (tmp-tr82). Which physical axis is "tip the
      // phone away from you" and which is "bank it left" depends on how the phone is held, so
      // read the screen angle and rotate the (beta, gamma) pair with it.
      //
      // The bug this replaces: only ROLL was resolved. LEAN always read `beta` - so in
      // LANDSCAPE, where roll is also +-beta, the trim axis and the steering axis were THE
      // SAME PHYSICAL ROTATION. Tipping the phone to trim also steered, and banking it to
      // steer also trimmed, and no amount of tuning could separate them.
      //
      // ang 0   portrait          pitch =  beta   roll =  gamma
      // ang 90  landscape         pitch =  gamma  roll = -beta
      // ang 180 portrait flipped  pitch = -beta   roll = -gamma
      // ang 270 landscape flipped pitch = -gamma  roll =  beta
      // The roll column is exactly what the previous pass shipped and verified, so steering
      // behaves as it did; only the pitch column is new.
      const ang = (typeof screen !== 'undefined' && screen.orientation && screen.orientation.angle)
        || window.orientation || 0;
      const g = e.gamma;
      const pitch = ang === 90 ? g : ang === 270 || ang === -90 ? (g == null ? null : -g)
        : ang === 180 ? -e.beta : e.beta;
      const roll = ang === 90 ? -e.beta : ang === 270 || ang === -90 ? e.beta
        : ang === 180 ? (g == null ? null : -g) : g;
      if (pitch != null) {
        this.tilt.beta = pitch;
        if (this.tilt.zero == null) this.tilt.zero = pitch;
      }
      if (roll != null) {
        if (this.tilt.rollZero == null) this.tilt.rollZero = roll;
        this.tilt.roll = roll;
      }
    };
    addEventListener('deviceorientation', this._onOrient);
    this._tiltBound = true;
    this.tilt.on = true;
    return 'ok';
  }

  // The tilt SETTING (off / lean / lean+steer) is what sample() reads; `tilt.on` only says
  // whether the sensor is running. Turning it off leaves the listener in place - there is no
  // second permission prompt to pay for, and re-arming is instant.
  get tiltLean() { return this.tilt.on && touchSettings.tilt !== 'off'; }
  get tiltSteer() { return this.tilt.on && touchSettings.tilt === 'leansteer'; }

  // Re-zero BOTH axes: wherever you are holding the phone right now is neutral.
  recalibrateTilt() { this.tilt.zero = this.tilt.beta; this.tilt.rollZero = this.tilt.roll; }

  // -------------------------------------------------------------------------
  // Touch (tmp-tr82). Left thumb rides: a floating ELLIPTICAL stick with a dead zone.
  // Right edge holds the throttle, in a 64 px strip and nowhere else, so the right thumb
  // can hold FIRE or WATER without the throttle stealing the pointer.

  padRadii(w, h) {
    const p = h > w;
    return { rx: p ? TOUCH.padRxP : TOUCH.padRx, ry: p ? TOUCH.padRyP : TOUCH.padRy };
  }

  // Which control a touchdown belongs to. Returns 'pad' | 'throttle' | null ('' = the
  // gesture strips down each side and the band along the bottom, where a drag is ignored).
  touchRegion(x, y, w, h) {
    const m = touchSettings.mirror;
    if (y > h - TOUCH.bottom) return null;
    const s = stripRect(w, h);
    // The GRAB zone is far wider than the drawn ribbon: the owner's first phone run had the
    // speedboat sitting still because a thumb landing an inch inside the edge hit nothing at
    // all (2026-09-18). The visible strip stays slim; only the catch area grows, and it still
    // starts well outboard of FIRE and WATER.
    // ...but never into the outer 24 px: that belongs to the phone's own edge gestures, and a
    // page cannot defer them (test 'the right 24 px is dead' guards this).
    const grabIn = 48, EDGE = TOUCH.edge;
    const gx0 = Math.max(touchSettings.mirror ? EDGE : s.x - grabIn, EDGE);
    const gx1 = Math.min(touchSettings.mirror ? s.x + s.w + grabIn : w - EDGE, w - EDGE);
    if (x >= gx0 && x <= gx1 && y >= s.y - 24 && y <= s.y + s.h + 24) return 'throttle';
    const inPad = m ? (x > w * (1 - TOUCH.padLeft) && x < w - TOUCH.edge)
                    : (x > TOUCH.edge && x < w * TOUCH.padLeft);
    if (inPad && y > h * TOUCH.padTop) return 'pad';
    return null;
  }

  touchStart(id, x, y, w, h) {
    this._lastW = w; this._lastH = h;      // touchEnd has no size argument (tap-to-set, 2026-09-18)
    // h was not a parameter before this pass; fall back to a landscape phone rather than NaN.
    if (!(h > 0)) h = Math.round(w * 393 / 852);
    const r = this.touchRegion(x, y, w, h);
    if (r === 'pad' && this.touch.padId === null) {
      this.touch.padId = id;
      this.touch.padX = x; this.touch.padY = y;
      this.mode = 'touch';
    } else if (r === 'throttle' && this.touch.thrId === null) {
      this.touch.thrId = id;
      this.touch.thrStart = y;
      this.touch.thrOrigin = this.touch.thrRaw;
      this.mode = 'touch';
      if (touchSettings.throttle !== 'cruise') this._thrAbs(y, w, h);
      else { this.touch.thrTapY = y; this.touch.thrMoved = false; }   // resolved in touchEnd: a tap SETS the cruise
    }
  }

  touchMove(id, x, y, h, w) {
    if (!(w > 0)) w = Math.round(h * 852 / 393);
    if (id === this.touch.padId) {
      const { rx, ry } = this.padRadii(w, h);
      // Re-anchor past 1.4R: full deflection still plateaus from 1.0R to 1.4R, but a slow
      // creep beyond that drags the anchor with it instead of pinning the axis.
      const lim = TOUCH.padRecentre;
      const dx0 = x - this.touch.padX, dy0 = y - this.touch.padY;
      if (dx0 > rx * lim) this.touch.padX = x - rx * lim;
      else if (dx0 < -rx * lim) this.touch.padX = x + rx * lim;
      if (dy0 > ry * lim) this.touch.padY = y - ry * lim;
      else if (dy0 < -ry * lim) this.touch.padY = y + ry * lim;
      this.touch.lean = this._stick(-(y - this.touch.padY), ry, TOUCH.leanExpo);
      this.touch.turn = this._stick(x - this.touch.padX, rx, TOUCH.turnExpo);
    } else if (id === this.touch.thrId) {
      if (touchSettings.throttle === 'cruise') {
        const R = Math.min(TOUCH.thrR, h * TOUCH.thrRfrac);
        if (Math.abs(y - this.touch.thrStart) > 6) this.touch.thrMoved = true;
        this._thrRaw(this.touch.thrOrigin - (y - this.touch.thrStart) / R);
      } else {
        this._thrAbs(y, w, h);
      }
    }
  }

  touchEnd(id) {
    if (id === this.touch.padId) { this.touch.padId = null; this.touch.lean = 0; this.touch.turn = 0; }
    if (id === this.touch.thrId) {
      this.touch.thrId = null;
      // HOLD is the only mode that lets go: cruise and manual both hold where you left them,
      // which is the whole point of a cruise and the single best thing about the old scheme.
      if (touchSettings.throttle === 'hold') this._thrRaw(0);
      // A tap on the strip (no drag) sets the cruise to where you tapped - the obvious
      // reading of a slider, and the difference between 'it does nothing' and 'it works'.
      else if (touchSettings.throttle === 'cruise' && !this.touch.thrMoved && this.touch.thrTapY != null) {
        this._thrAbs(this.touch.thrTapY, this._lastW || 852, this._lastH || 393);
      }
      this.touch.thrTapY = null; this.touch.thrMoved = false;
    }
  }

  // The stick's shaping, per axis: clamp to the radius, kill the dead zone, then a mild
  // expo so the middle of the travel - where a ride-height band is held - is the fine part.
  _stick(d, R, expo) {
    const v = clamp(d / R, -1, 1);
    const a = Math.abs(v);
    if (a < TOUCH.padDead) return 0;
    const n = (a - TOUCH.padDead) / (1 - TOUCH.padDead);
    return Math.sign(v) * Math.pow(n, expo);
  }

  // The lever position -> what the craft gets. The detent is in the VALUE, not on the glass,
  // so it works the same whether the drag was relative (cruise) or absolute (manual/hold).
  _thrRaw(raw) {
    const t = this.touch;
    t.thrRaw = clamp(raw, -TOUCH.astern, 1);
    const d = TOUCH.detent;
    if (Math.abs(t.thrRaw) <= d) { t.throttle = 0; t.astern = 0; return; }
    if (t.thrRaw > 0) { t.throttle = (t.thrRaw - d) / (1 - d); t.astern = 0; }
    else { t.throttle = 0; t.astern = Math.min(1, (-t.thrRaw - d) / Math.max(1e-6, TOUCH.astern - d)); }
  }

  // Absolute: where in the strip the thumb is IS the lever. Used by manual and hold.
  _thrAbs(y, w, h) {
    const s = stripRect(w, h);
    const zeroY = s.y + s.h * (1 / (1 + TOUCH.astern));     // 1 unit ahead above, astern below
    const f = y <= zeroY ? (zeroY - y) / Math.max(1, zeroY - s.y)
                         : -(y - zeroY) / Math.max(1, s.y + s.h - zeroY) * TOUCH.astern;
    this._thrRaw(f);
  }

  // BOOST / PUNCH IT on a phone (tmp-tr82). `touch.boost` was declared at construction and
  // read in sample(), and NOTHING ever assigned it - so the pop-up, the move that gets an
  // eFoil onto the foil, had no phone input at all. This is the assignment.
  setBoost(v) { this.touch.boost = v ? 1 : 0; if (v) this.mode = 'touch'; }

  // A craft change / restart has to move the LEVER, not just `throttle`, or cruise puts the
  // old value straight back.
  zeroTouchThrottle() { this.touch.thrStart = 0; this.touch.thrOrigin = 0; this._thrRaw(0); }

  // Used by the settings panel: a mode change must take effect on the next frame, not the
  // next touchdown, and hold must not leave the craft stuck at the last cruise value.
  applyTouchSettings() {
    if (touchSettings.throttle === 'hold' && this.touch.thrId === null) this._thrRaw(0);
    if (!this.tiltLean) { this.touch.tiltBias = 0; }
  }

  // -------------------------------------------------------------------------
  has(list) { return list.some((c) => this.keys.has(c)) ? 1 : 0; }

  _pollGamepad() {
    // >>> PAD
    const g = this._pad();
    if (!g) {
      // A pad that has gone, or one we refused, drives nothing. Leaving the last values in place
      // would hold the throttle open on a craft after the cable was pulled.
      if (this.pad.throttle || this.pad.astern || this.pad.boost || this.pad.lean || this.pad.turn) {
        this.pad.lean = 0; this.pad.turn = 0; this.pad.throttle = 0; this.pad.boost = 0; this.pad.astern = 0;
      }
      return false;
    }
    this.available.gamepad = true;
    this.padInfo = { id: g.id || '', mapping: g.mapping, usable: true, seen: true };
    const dz = (v) => (Math.abs(v) < PAD.dead ? 0 : v);
    this.pad.lean = -dz(g.axes[1] || 0);
    this.pad.turn = dz(g.axes[0] || 0);
    // THE THROTTLE LEVER, both halves of it. RT is read RAW - no dead zone, no shaping - so
    // with LT at rest `throttle` is the identical expression the file shipped with. LT then
    // subtracts from it, which is "ease off" and costs nothing to learn, and past PAD.astern
    // with RT shut it becomes reverse, which is what a boat's `brake` has always meant.
    const rt = this._btn(g, PAD.BTN.rt);
    const ltRaw = this._btn(g, PAD.BTN.lt);
    const lt = ltRaw < PAD.trigDead ? 0 : ltRaw;
    this.pad.throttle = clamp(rt - lt, 0, 1);
    this.pad.astern = (rt < PAD.rtShut && lt > PAD.astern)
      ? clamp((lt - PAD.astern) / (1 - PAD.astern), 0, 1) : 0;
    this.pad.boost = this._pressed(g, PAD.BTN.boost) ? 1 : 0;
    // DEFECT 2, the other half: the mode follows what the player DOES. Every channel counts,
    // not just lean and throttle - steering out of a turn, or backing off a jetty on LT, used
    // to leave the pad "not the active device" while it was plainly the one being driven.
    if (Math.abs(this.pad.lean) > PAD.wake || Math.abs(this.pad.turn) > PAD.wake
      || this.pad.throttle > 0.1 || this.pad.astern > 0 || this.pad.boost) {
      if (this.mode !== 'gamepad') this._preGamepadMode = this.mode;
      this.mode = 'gamepad';
    }
    return true;
    // <<< PAD
  }

  sample(dt = 1 / 120) {
    const o = this.out;
    let lean = 0, turn = 0, boost = 0;
    let target = null;             // an analogue device sets this outright

    this._pollGamepad();

    if (this.mode === 'gamepad') {
      lean = this.pad.lean; turn = this.pad.turn;
      target = this.pad.throttle; boost = this.pad.boost;
      // >>> PAD
      // ASTERN ON A PAD (tmp-tr198), through the SAME `brake` channel the mouse's right button
      // and the touch lever already use - boats/hub.js:171 ramps the reverse power off it, and
      // the eFoil never reads it, so this is boats-only by construction exactly as those are.
      // Assigning it here also closes a latent bug: this branch never wrote `this.brake` at all,
      // so a brake raised on the mouse stayed raised for ever once the player picked up a pad.
      this.brake = this.pad.astern > 0 ? 1 : 0;
      // <<< PAD
    } else if (this.mode === 'touch') {
      lean = this.touch.lean; turn = this.touch.turn;
      target = this.touch.throttle; boost = this.touch.boost;
      // TILT RIDES ON TOP OF THE THUMB, ON BOTH AXES (tmp-tr82). It used to be backwards:
      // steering yielded to the thumb but LEAN DID NOT YIELD AT ALL, so the one axis the
      // player most needs to grab back - the trim, when the phone is at a silly angle - was
      // the one they could not. Same rule for both now: any thumb past the dead zone wins.
      if (this.tiltLean && this.tilt.zero != null && Math.abs(this.touch.lean) < TOUCH.thumbWins) {
        lean = clamp(this._dead((this.tilt.zero - this.tilt.beta) / TOUCH.tiltLean, TOUCH.tiltDead), -1, 1);
      }
      if (this.tiltSteer && this.tilt.rollZero != null && Math.abs(this.touch.turn) < TOUCH.thumbWins) {
        turn = clamp(this._dead((this.tilt.roll - this.tilt.rollZero) / TOUCH.tiltSteer, TOUCH.tiltDead) * 1.1, -1, 1);
      }
      // ASTERN ON A PHONE (tmp-tr82). `brake` was gated on `this.mode === 'mouse'`, so a boat
      // could never go astern on touch however the scheme was drawn. The strip's zero detent
      // is the touch source; the eFoil never reads brake, so this is boats-only by construction.
      this.brake = this.touch.astern > 0 ? 1 : 0;
    } else {
      // Keyboard and mouse share the keyboard's ramping throttle, so you can
      // steer with the mouse and still punch it with space.
      const kb = this.has(KEYMAP.leanFwd) * -1 + this.has(KEYMAP.leanBack);
      const kt = this.has(KEYMAP.turnLeft) * -1 + this.has(KEYMAP.turnRight);
      if (this.mode === 'mouse' && kb === 0) lean = this.mouse.lean; else lean = kb;
      if (this.mode === 'mouse' && kt === 0) turn = this.mouse.turn; else turn = kt;
      const dir = this.has(KEYMAP.thrUp) - this.has(KEYMAP.thrDown)
        + (this.mode === 'mouse' ? this.mouse.down - this.mouse.right : 0);
      // The wheel sets an absolute floor; buttons and keys ramp from there. So
      // you can flick to roughly the power you want and then trim it.
      if (this.mode === 'mouse' && dir === 0 && this.wheelThrottle !== this._lastWheel) {
        this.throttle = this.wheelThrottle;
        this._lastWheel = this.wheelThrottle;
      }
      this.throttle = clamp(this.throttle + dir * KEY_RAMP * dt, 0, 1);
      if (dir !== 0) { this.wheelThrottle = this.throttle; this._lastWheel = this.throttle; }
      boost = this.has(KEYMAP.boost);
      // RIGHT BUTTON = SLOW DOWN, THEN REVERSE (2026-09-17, owner request). It has always ramped
      // the throttle down; held on once the throttle is at zero it now also raises `brake`, which
      // a BOAT reads as astern (src/boats/hub.js ramps the reverse power). The eFoil never reads
      // it, so right-button behaviour there is exactly what it was. The 0.25 s dwell keeps a quick
      // "ease off" from slipping into reverse.
      this.rightT = this.mouse.right ? this.rightT + dt : 0;
      this.brake = this.mode === 'mouse' && this.mouse.right && this.throttle <= 0.002 && this.rightT > 0.25 ? 1 : 0;
    }

    if (target !== null) this.throttle = target;

    o.lean = q8(lean);
    o.turn = q8(turn);
    o.throttle = q8u(this.throttle);
    o.boost = boost ? 1 : 0;
    o.brake = this.brake || 0;     // boats: astern on the right button. Not recorded; the sim ignores it.
    return o;
  }

  get mouseEnabled() { return this.mode === 'mouse'; }
}

// ---------------------------------------------------------------------------
export class Recorder {
  constructor() { this.clear(); }
  clear() { this.lean = []; this.turn = []; this.thr = []; this.bits = []; this.active = false; }
  start() { this.clear(); this.active = true; }
  stop() { this.active = false; }
  push(i) {
    if (!this.active) return;
    this.lean.push(Math.round(i.lean * 127));
    this.turn.push(Math.round(i.turn * 127));
    this.thr.push(Math.round(i.throttle * 255));
    this.bits.push(i.boost ? 1 : 0);
  }
  get length() { return this.lean.length; }
  toJSON(meta) {
    return {
      v: 2, ...meta, ticks: this.lean.length,
      lean: this.lean.slice(), turn: this.turn.slice(),
      thr: this.thr.slice(), bits: this.bits.slice(),
    };
  }
}

export class ReplayInput {
  constructor(rec) {
    this.r = rec; this.i = 0;
    this.out = { lean: 0, turn: 0, throttle: 0, boost: 0 };
  }
  get done() { return this.i >= this.r.lean.length; }
  get length() { return this.r.lean.length; }
  sample() {
    const o = this.out;
    if (this.done) { o.lean = 0; o.turn = 0; o.throttle = 0; o.boost = 0; return o; }
    o.lean = this.r.lean[this.i] / 127;
    o.turn = (this.r.turn ? this.r.turn[this.i] : 0) / 127;
    o.throttle = this.r.thr[this.i] / 255;
    o.boost = this.r.bits[this.i] & 1 ? 1 : 0;
    this.i++;
    return o;
  }
}

// A deterministic scripted rider, for the self-test. No clock, no randomness.
export class ScriptedInput {
  constructor() { this.i = 0; this.out = { lean: 0, turn: 0, throttle: 0, boost: 0 }; }
  sample() {
    const t = this.i++;
    const o = this.out;
    o.throttle = q8u(t < 240 ? 1 : 0.45);
    o.boost = t > 60 && t < 150 ? 1 : 0;
    o.lean = q8(Math.sin(t / 47) * 0.55 + Math.sin(t / 13) * 0.15);
    o.turn = q8(Math.sin(t / 91) * 0.4);
    return o;
  }
}
