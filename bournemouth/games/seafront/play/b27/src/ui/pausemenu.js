// THE PAUSE MENU (tmp-tr199, builder PAUSEMENU, 23 Sep 2026)
//
// The owner, playing the live site, reported three things:
//   "it's a bit weird in the game if you press escape... because otherwise you can't select
//    the menu if you've paused the game"
//   "when you finish the level or fail the level it's difficult to select the different buttons"
//   and a game that would not start after pausing (already fixed - see the UNPAUSE fences in
//   main.js, which this file must not undo).
//
// The first two are ONE defect with two faces, and the defect is POINTER LOCK. Measured in a
// real Chrome through the browser's own input pipeline (Input.dispatchKeyEvent, not a
// synthetic KeyboardEvent - the whole fault lives in the difference):
//
//   click the canvas          -> document.pointerLockElement = #view
//   REAL Escape, 1st press    -> pointerlockchange fires, lock released,
//                                and the page's keydown handler NEVER RUNS (0 Escapes seen).
//                                #h-status stays empty; the toast still reads the raid intro.
//   REAL Escape, 2nd press    -> the page sees it, `paused` flips, status reads PAUSED.
//
// That is exactly "one keypress does nothing and the next one pauses". Chrome eats the first
// Escape to release the lock and the game cannot hear it. So the key is NOT the reliable
// signal. The reliable signal is the thing the browser does instead: the lock going away.
//
// And the second complaint is the same cause seen from the other end. Also measured, with the
// raid's REAL game-over card raised through its REAL code path (phase 'lost' -> the 'over'
// event -> hud.showOver):
//
//   lock HELD       - a real click at the exact centre of CHOOSE LEVEL lands on `view`.
//                     The picker does not open. The button cannot be pressed AT ALL.
//   lock NOT taken  - the same click at the same coordinates hits the button and opens it.
//
// There is no cursor while the lock is held, every mouse event goes to the locked element,
// and so EVERY overlay button in this game - the summary cards, the level picker, the
// settings sheet - is unclickable the moment the player has clicked the water once. It is
// not "difficult"; it is impossible. So a pause menu made of real buttons is not enough on
// its own: the lock has to be handed back whenever a sheet with buttons is on screen, and it
// must not be taken again while one is.
//
// ---- WHAT THIS FILE OWNS --------------------------------------------------------------
//
//   1. The overlay itself: a dialog with RESUME / CHOOSE LEVEL / RESTART / FREE RIDE.
//   2. `otherSheetOpen()` - the ONE list of sheets that need a cursor. Nothing else in the
//      project keeps a second copy of it.
//   3. `body.pm-sheet`, set while any such sheet (this overlay included) is up. It carries NO
//      styling. It exists so `input.js` can refuse to TAKE pointer lock while a sheet is
//      open, in the same idiom it already uses one line earlier for `clean-render` - which is
//      why that file needs no import and stays the self-contained module it has always been.
//
// ---- WHY NOT `pointer-events: none` ON THE CANVAS ---------------------------------------
//
// It was the tidier-looking answer and it is wrong. `main.js:981` binds the TOUCH stick and
// throttle to `#view` itself, so switching the canvas off would take the controls away from a
// phone player who opens the level picker mid-passage. The lock guard has to be about the
// lock, not about the canvas.
//
// ---- WHICH LOCK LOSSES ARE A PAUSE, AND WHICH ARE NOT -----------------------------------
//
// The brief offered "open the menu when the lock is lost" as a hypothesis and warned that a
// lock can be lost for reasons that should not pause. It can. Enumerated on the untouched
// tree (tmp-tr199/probe-loss.mjs):
//
//   ACQUIRING the lock also fires pointerlockchange   -> test for LOST, never for "it fired".
//   a real Escape                                     -> LOST. This is the pause.
//   our own exitPointerLock()                         -> LOST, and the event is IDENTICAL.
//                                                        Guarded by _selfAt below.
//   C x3, and T / G / H / R / L                       -> lock KEPT. No spurious pause.
//   a failed re-lock                                  -> pointerlockerror, not ...change.
//
// One case could not be measured headless and is reasoned, not verified: a real alt-tab.
// Chrome releases the lock when the window loses focus, so the game will pause when you
// switch away. That is the behaviour a pause menu should have, so it is left alone.
//
// ---- TOUCH ------------------------------------------------------------------------------
//
// There is no pointer lock on a touch device, there is no Escape key and there is no P key,
// so on a phone NOTHING here can fire and no second menu appears - which is the outcome the
// brief asked for, reached by having no trigger rather than by a `body.touch` test. That
// matters: `body.touch` is also set for a small DESKTOP window (input.js says so on the very
// line this file adds a token to), and a mouse in a small window still gets pointer lock and
// still needs this menu. A tablet with a keyboard pressing Escape gets the overlay, and its
// CHOOSE LEVEL opens the same one picker the cold row's LEVELS button opens, so even there
// the player is never offered two lists.
//
// ---- THE CALIBRATION RENDER -------------------------------------------------------------
//
// ⚠️ Three independent gates, because one overlay bleeding into a judged view silently
// corrupts every tone number in this project:
//   1. NOT CONSTRUCTED AT ALL under ?cal= or ?clean=1 - main.js passes `mount: null` and the
//      constructor returns before it makes a stylesheet or a single node, exactly as
//      juice.js does. No node, no rule, no listener.
//   2. `body.clean-render #pm-root { display: none !important }` below, the rule every
//      overlay in this project carries, in case it is ever built on a page that then turns
//      clean-render on.
//   3. It cannot be triggered on a calibration address anyway: input.js refuses pointer lock
//      under ?cal=/?clean=1, so there is no lock to lose, and a render dispatches no keys.

// The sheets that need a cursor. Every one of them is a panel with BUTTONS in it.
//
// ⚠️ `#rd-intro` is deliberately NOT here. It is the raid's timed briefing card, it has no
// button in it at all, and it is on screen for the first seconds of every raid - handing the
// mouse back there would take the wheel off the player exactly as the level starts.
const SHEETS = [
  '#tmode.on',      // the level picker (and the start screen, which is the same sheet)
  '#tset.on',       // the touch CONTROLS sheet
  '#rd-over.on',    // the raid / harbour-mouth summary card
  '#rq-over.on',    // the rescue summary card
  '#ob-over.on',    // the trip back's summary card
  '#sg-intro.on',   // CAST OFF
  '#sg-over.on',
  '#st-card.on',    // the stunt stage's brief and summary share one card
  '#sf-intro.on',   // PIER SURF's rules card and its summary (26 Sep 2026)
  '#sf-over.on',
];
// ⚠️ getElementById AND NOT querySelector, AND THAT IS A MEASUREMENT, NOT A STYLE (tmp-tr199).
// This runs once per rendered frame, so it was timed in the real page with the raid HUD in the
// DOM, 200,000 iterations each:
//
//   document.querySelector('#tmode.on,#tset.on,#rd-over.on, ... ')     64.18 us
//   eight getElementById + classList.contains, short-circuiting         0.44 us
//
// 145x, for the same answer. A compound selector LIST does not take Chrome's id fast path -
// it walks for each piece - and at 30 fps the first version was spending 0.19% of the frame
// budget asking a question whose answer is almost always "no". The selector strings are kept
// above because they say exactly what is meant; the ids are derived from them, so there is
// still only one list and it cannot drift from itself.
const SHEET_IDS = SHEETS.map((s) => s.slice(1, s.indexOf('.')));

// TRUE when a sheet that needs a cursor - OTHER than the pause overlay - is on screen.
// Used for two different questions and they are not the same question, which is why there
// are two predicates here and not one:
//   * should the pause overlay be visible?   -> no, something else is already in front.
//   * may pointer lock be taken?             -> that one must count the overlay too, or the
//                                               overlay would let the lock straight back in.
// >>> BRIEFING
// The level briefing cards, which are NOT the same question as `otherSheetOpen`.
// A sheet asks "is something in front that needs a cursor". A briefing asks "is the player
// still reading", and the answer has to FREEZE THE SIM - main.js gates its fixed-step block on
// this. Before 24 Sep 2026 nothing did: the raid card showed for six to nine seconds with the
// clock running behind it, so the briefing cost you the opening of the level you were reading
// about. These are listed separately rather than folded into SHEETS because adding them there
// would also change pointer-lock and pause-overlay behaviour, which is a different decision.
const BRIEFINGS = ['rd-intro', 'sg-intro', 'dw-intro', 'sf-intro'];   // dw-intro: DOLPHIN WATCH (b22); sf-intro: PIER SURF

/** TRUE while a level briefing card is on screen. Cheap: three getElementById per frame. */
export function briefingOpen(doc) {
  const d = doc || document;
  for (const id of BRIEFINGS) {
    const e = d.getElementById(id);
    if (e && e.classList.contains('on')) return true;
  }
  return false;
}
// <<< BRIEFING

export function otherSheetOpen(doc) {
  const d = doc || document;
  for (const id of SHEET_IDS) {
    const e = d.getElementById(id);
    if (e && e.classList.contains('on')) return true;
  }
  return false;
}

const CSS = `
#pm-root { position: absolute; inset: 0; z-index: 58; display: none;
  align-items: center; justify-content: center;
  background: rgba(6,9,13,.58); backdrop-filter: blur(3px); }
#pm-root.on { display: flex; }
body.clean-render #pm-root { display: none !important; }
#pm-card { width: min(380px, calc(100% - 28px)); max-height: calc(100% - 20px); overflow-y: auto;
  padding: 16px 16px 18px; border-radius: 12px; text-align: center;
  background: rgba(12,14,18,.96); border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 18px 60px rgba(0,0,0,.55); }
#pm-card h2 { margin: 0 0 3px; font: 900 22px/1.15 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: .14em; color: #ffd76a; }
#pm-card .pm-sub { margin: 0 0 14px; font: 400 16px/1.35 ui-sans-serif, system-ui, sans-serif;
  color: #9fb3c4; }
#pm-card button { display: block; width: 100%; min-height: 48px; margin: 0 0 9px;
  padding: 0 14px; border: 0; border-radius: 10px; cursor: pointer;
  font: 700 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .06em;
  color: #0b1520; background: #ffc21a; }
#pm-card button.alt { background: rgba(255,255,255,.16); color: #e8edf4; }
#pm-card button:last-of-type { margin-bottom: 0; }
/* >>> LEAVE
   Set apart from the four that keep you in the game, and quieter than them, because it is the
   one button whose press ends the session. Still the full 48 px target - "quieter" is contrast,
   never a smaller thing to hit. */
#pm-card button.pm-leave { margin-top: 14px; background: rgba(255,255,255,.07);
  color: #9fb3c4; font-weight: 600; }
#pm-card button.pm-leave:hover { background: rgba(255,255,255,.13); color: #e8edf4; }
/* <<< LEAVE */
#pm-card button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
#pm-card .pm-foot { margin: 13px 0 0; font: 400 16px/1.4 ui-sans-serif, system-ui, sans-serif;
  color: #9fb3c4; }
#pm-card .pm-foot b { color: #dfe9f3; font-weight: 700; }
@media (max-height: 430px) {
  #pm-card { padding: 11px 13px 13px; }
  #pm-card h2 { font-size: 19px; }
  #pm-card .pm-sub { margin-bottom: 9px; }
  #pm-card button { min-height: 44px; margin-bottom: 7px; }
  #pm-card .pm-foot { margin-top: 9px; }
}
`;

export class PauseMenu {
  // Every action is a callback into main.js, and every one of those callbacks goes down a
  // route that ALREADY EXISTS - restart(), the picker's own #btn-mode handle, the picker's
  // own FREE RIDE row. This file starts nothing and unpauses nothing by itself; RESUME is
  // the single exception and it flips the same `paused` the Escape key has always flipped.
  constructor(opt) {
    const o = opt || {};
    this.on = false;
    this.acts = o;
    this.root = null;
    this._selfAt = -1e9;        // when WE last released the lock (see mine())
    this._prevFocus = null;
    if (!o.mount) return;       // ?cal= / ?clean=1 : nothing is built. See gate 1 above.

    const st = document.createElement('style');
    st.id = 'pm-css';
    st.textContent = CSS;
    document.head.appendChild(st);

    const r = document.createElement('div');
    r.id = 'pm-root';
    // A11Y: a real dialog, labelled by its own heading, and nothing behind it is reachable
    // because the backdrop covers the canvas and Tab is trapped below.
    r.innerHTML = '<div id="pm-card" role="dialog" aria-modal="true" aria-labelledby="pm-h">'
      + '<h2 id="pm-h">PAUSED</h2>'
      + '<p class="pm-sub">The sea is holding still.</p>'
      + '<button type="button" data-p="resume">RESUME</button>'
      + '<button type="button" data-p="levels" class="alt">CHOOSE LEVEL</button>'
      + '<button type="button" data-p="restart" class="alt">RESTART THIS LEVEL</button>'
      + '<button type="button" data-p="free" class="alt">FREE RIDE</button>'
      // >>> LEAVE
      // A DOOR OUT, and it is on a phone that it matters. The four buttons above all keep you
      // INSIDE the game. On touch the first tap takes the page fullscreen (main.js:2746), so
      // there is no address bar and no visible back button - a player who wants to stop has
      // nothing to press. On a desktop the browser's own back button covers it, which is why
      // this was easy to not notice.
      //
      // ⚠️ IT IS ONLY BUILT WHEN THERE IS SOMEWHERE TO GO. `o.leaveTo` is computed by main.js
      // and is null when the page has no parent and no same-origin history - the standalone
      // dev copy served at a root, for instance. A button that navigates nowhere is worse than
      // no button, because the player presses it and concludes the game is broken.
      //
      // ⚠️ NOT window.close(). A page cannot close a tab it did not open itself; the call is
      // silently ignored in every current browser, which is the same dead button by another
      // route.
      + (o.leaveTo ? '<button type="button" data-p="leave" class="alt pm-leave">LEAVE THE GAME</button>' : '')
      // <<< LEAVE
      + '<p class="pm-foot"><b>Esc</b> or <b>P</b> to carry on. '
      + 'Click the water to give the mouse back to the game.</p>'
      + '</div>';
    o.mount.appendChild(r);
    this.root = r;
    this.btns = Array.from(r.querySelectorAll('button'));

    r.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !b.dataset.p) return;
      e.stopPropagation();
      const f = this.acts['on' + b.dataset.p[0].toUpperCase() + b.dataset.p.slice(1)];
      if (f) f();
    });
    // The backdrop is a resume target too - clicking away from a pause card is what everyone
    // expects it to do - but ONLY the backdrop, never a click that started inside the card.
    r.addEventListener('mousedown', (e) => { if (e.target === r && this.acts.onResume) this.acts.onResume(); });
    // A11Y: Tab stays inside the dialog. Escape is NOT handled here on purpose - main.js's
    // keydown already toggles `paused` on Escape and P, and sync() follows `paused`, so the
    // key that opens this closes it through exactly one path.
    r.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !this.btns.length) return;
      const i = this.btns.indexOf(document.activeElement);
      const n = this.btns.length;
      const j = e.shiftKey ? (i <= 0 ? n - 1 : i - 1) : (i < 0 || i === n - 1 ? 0 : i + 1);
      e.preventDefault();
      this.btns[j].focus();
    });
  }

  // TRUE when a lock we have just dropped ourselves is the one that went away. A self-release
  // and an Escape produce the SAME pointerlockchange with the SAME empty pointerLockElement,
  // so there is nothing in the event to tell them apart and the only honest way is to
  // remember. A time window rather than a boolean flag, so a change event that never arrives
  // cannot strand the flag set and silently eat the player's next real Escape.
  mine() { return performance.now() - this._selfAt < 600; }

  release() {
    if (!document.pointerLockElement) return false;
    this._selfAt = performance.now();
    try { document.exitPointerLock(); } catch { /* not supported: nothing to give back */ }
    return true;
  }

  // Called once per RENDERED FRAME from main.js. Edge-triggered: it only touches the DOM when
  // what it wants differs from what is there. Measured in the real page with the raid HUD up:
  // the whole steady-state call is 0.44 us of getElementById plus two class reads of 0.04 us,
  // which is 0.0015% of a 30 fps frame budget.
  sync(paused) {
    if (!this.root) return;
    const other = otherSheetOpen();
    const want = !!paused && !other;
    if (want !== this.on) { if (want) this._show(); else this._hide(); }
    // The lock guard. `this.on` is included deliberately: the overlay is itself a sheet that
    // needs a cursor, and without it a click on the backdrop would hand the lock straight back
    // and make the menu's own buttons unpressable.
    const sheet = other || this.on;
    if (sheet !== document.body.classList.contains('pm-sheet')) document.body.classList.toggle('pm-sheet', sheet);
    // Hand the mouse back. This is the half of the fix that the summary cards needed: the lock
    // was taken long before the card appeared, so refusing new locks is not enough.
    if (sheet && document.pointerLockElement) this.release();
  }

  _show() {
    this.on = true;
    this.root.classList.add('on');
    this._prevFocus = document.activeElement;
    const b = this.btns[0];
    if (b) b.focus();
  }

  _hide() {
    this.on = false;
    this.root.classList.remove('on');
    // Give focus back where it was, but never to a node that has since left the document -
    // that silently drops focus on <body> and a keyboard player loses their place.
    const p = this._prevFocus;
    this._prevFocus = null;
    if (p && p !== document.body && p.isConnected && p.focus) { try { p.focus(); } catch { /* gone */ } }
    else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
}
