// DOLPHIN WATCH - HUD, briefing card, "Blow!" markers and the summary card (b22). DOM only,
// created from here so index.html needs no markup, and hidden under ?clean=1 like every other
// overlay so a calibration render stays bare.
//
// Wording rule: the dolphins are met, watched, ridden with - never caught, chased, hunted or
// scored off. The rules card is the real code for meeting them on the water, and it names no
// organisation.
//
// ⚠️ No back-quote may appear inside the CSS template literal below.

// >>> PROGRESS
import * as prog from '../ui/progress-store.js';
import { setNext, goNext } from '../ui/next-button.js';
// <<< PROGRESS

const CSS = `
#dw-root { position: absolute; inset: 0; pointer-events: none; z-index: 30; display: none;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; color: #f4f7fb; }
body.dolphins #dw-root { display: block; }
body.dolphins #viewbar, body.dolphins #hint { display: none !important; }
body.dolphins #left > #craftbar { display: none !important; }
body.clean-render #dw-root { display: none !important; }
body.touch.dolphins #hud { display: none !important; }
/* A card up (the rules, the result) lifts the whole layer over the touch controls (32-33) and
   stays under the pause overlay (58) and the level list (60), which a card button can open. */
body.dolphins.dwcard #dw-root { z-index: 57; }
body.touch #dw-over button small { display: none; }
.dw-panel { background: rgba(8,14,22,.70); border: 1px solid rgba(255,255,255,.14); border-radius: 12px;
  backdrop-filter: blur(4px); }
#dw-top { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; align-items: center;
  gap: 16px; padding: 7px 18px; white-space: nowrap; }
#dw-title { font-weight: 800; letter-spacing: .12em; font-size: 16px; color: #9fe6ff; }
#dw-timer { font: 700 28px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; min-width: 84px; text-align: center; }
#dw-timer.low { color: #ff6b5e; }
#dw-ride { display: flex; flex-direction: column; gap: 4px; font-size: 16px; min-width: 150px; }
#dw-ride .bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,.15); overflow: hidden; }
#dw-ride .bar i { display: block; height: 100%; width: 0; background: #46f0c8; }
#dw-compass { display: flex; align-items: center; gap: 6px; font-size: 16px; }
#dw-compass i { display: inline-block; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent;
  border-bottom: 22px solid #7fe0ff; transform-origin: 50% 66%; }
#dw-score { position: absolute; top: 10px; right: 12px; padding: 8px 14px; text-align: right; min-width: 150px; }
#dw-score .v { font: 800 26px/1.05 ui-monospace, Consolas, monospace; }
#dw-score .s { font-size: 16px; color: #bfe9ff; min-height: 20px; }
#dw-score .c { font-size: 16px; letter-spacing: .1em; color: #cfe3f5; }
#dw-score .c span { display: inline-block; width: 11px; height: 11px; border-radius: 50%; margin-left: 4px;
  border: 3px solid #46f0c8; vertical-align: -1px; }
#dw-score .c span.gone { border-color: #ff6b5e; background: #ff6b5e; }
#dw-calm { position: absolute; left: 12px; bottom: 16px; padding: 8px 12px; font-size: 16px; letter-spacing: .08em; min-width: 170px; }
#dw-calm .meter { height: 8px; border-radius: 4px; background: rgba(255,255,255,.15); margin-top: 6px; overflow: hidden; }
#dw-calm .meter i { display: block; height: 100%; width: 0; background: #46f0c8; transition: background .3s; }
#dw-calm.edgy .meter i { background: #ffb13b; } #dw-calm.bad .meter i { background: #ff6b5e; }
#dw-calm .spd { margin-top: 6px; font: 700 16px/1 ui-monospace, Consolas, monospace; letter-spacing: 0; color: #cfe3f5; }
#dw-calm .spd.ok { color: #6ff0c8; }
/* On a phone the bottom of the screen is the touch bar and the throttle, so the prompt and the
   pod panel go up top: the prompt straight under the clock, the two panels under that, all of it
   above the horizon line where a far "Blow!" marker lands. Measured at 390 x 664 on 24 Sep. */
body.touch #dw-prompt { top: 62px; bottom: auto; white-space: normal; text-align: center; width: max-content;
  font-size: 16px; padding: 7px 14px; max-width: calc(100% - 16px); box-sizing: border-box; }
body.touch #dw-calm { top: 124px; left: 8px; bottom: auto; min-width: 0; width: 150px; padding: 6px 10px; }
body.touch #dw-score { top: 124px; right: 8px; }
#dw-prompt { position: absolute; left: 50%; bottom: 64px; transform: translateX(-50%); padding: 9px 20px; font-size: 17px;
  font-weight: 700; letter-spacing: .03em; white-space: nowrap; opacity: 0; transition: opacity .2s; max-width: calc(100% - 24px); }
#dw-prompt.on { opacity: 1; }
#dw-prompt.warn { color: #ffb2aa; } #dw-prompt.good { color: #6ff0c8; }
#dw-banner { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); text-align: center; opacity: 0;
  transition: opacity .35s; padding: 16px 34px; max-width: calc(100% - 24px); box-sizing: border-box; }
#dw-banner.on { opacity: 1; }
#dw-banner h1 { margin: 0; font-size: 40px; font-weight: 900; letter-spacing: .08em; text-shadow: 0 3px 14px rgba(0,0,0,.5); }
#dw-banner p { margin: 6px 0 0; font-size: 16px; color: #d7e6f3; }
#dw-banner.good h1 { color: #6ff0c8; } #dw-banner.bad h1 { color: #ffb13b; }
#dw-markers { position: absolute; inset: 0; overflow: hidden; }
.dw-m { position: absolute; left: 0; top: 0; text-align: center; font-weight: 800; white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0,0,0,.85); will-change: transform, opacity; }
.dw-m b { display: inline-block; padding: 3px 12px; border-radius: 999px; background: rgba(8,14,22,.72);
  border: 2px solid #7fe0ff; color: #dff6ff; font-size: 17px; letter-spacing: .06em; }
.dw-m span { display: table; margin: 3px auto 0; padding: 0 7px; border-radius: 8px; background: rgba(8,14,22,.6);
  font-size: 16px; color: #dff6ff; }
.dw-m.edge b::after { content: ''; display: inline-block; width: 0; height: 0; margin-left: 6px; vertical-align: 1px;
  border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-left: 10px solid #7fe0ff;
  transform: rotate(var(--a, 0rad)); }
.dw-pop { position: absolute; left: 50%; top: 42%; transform: translate(-50%, 0); font: 900 26px/1 ui-sans-serif, system-ui, sans-serif;
  color: #6ff0c8; text-shadow: 0 2px 8px rgba(0,0,0,.6); animation: dwpop 1.4s ease-out forwards; white-space: nowrap; }
.dw-pop.bad { color: #ffb13b; }
#dw-intro, #dw-over { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 20px 26px;
  width: min(520px, calc(100% - 24px)); max-height: calc(100% - 24px); overflow: auto; box-sizing: border-box;
  text-align: center; display: none; pointer-events: auto; }
#dw-intro.on, #dw-over.on { display: block; }
#dw-intro h1, #dw-over h1 { margin: 0 0 4px; font-size: 30px; letter-spacing: .1em; color: #9fe6ff; }
#dw-intro .sub { font-size: 17px; color: #dbe8f4; margin-bottom: 10px; }
#dw-intro ul { list-style: none; margin: 0 0 10px; padding: 0; font-size: 16px; line-height: 1.45; text-align: left; }
#dw-intro ul li { margin-bottom: 7px; }
#dw-intro ul b { color: #9fe6ff; }
#dw-intro .note { font-size: 16px; line-height: 1.4; color: #a9bfd3; margin: 4px 0 12px; font-style: italic; }
#dw-over .big { font: 900 44px/1.1 ui-monospace, Consolas, monospace; color: #ffd76a; margin: 6px 0 12px; }
#dw-over .why { font-size: 16px; color: #dbe8f4; margin-bottom: 8px; }
#dw-over dl { display: grid; grid-template-columns: 1fr auto; gap: 4px 20px; margin: 0 0 16px; text-align: left; font-size: 16px; }
#dw-over dt { color: #b8c9d9; } #dw-over dd { margin: 0; font-weight: 700; text-align: right; }
#dw-over.won h1 { color: #6ff0c8; } #dw-over.lost h1 { color: #ffb13b; }
#dw-intro button, #dw-over button { font: 700 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; color: #0b1520;
  background: #ffc21a; border: 0; border-radius: 999px; padding: 10px 18px; min-height: 44px; cursor: pointer; margin: 4px; }
#dw-over button.alt { background: rgba(255,255,255,.14); color: #f4f7fb; }
#dw-intro button small, #dw-over button small { font-size: 14px; font-weight: 600; opacity: .7; margin-left: 6px; }
@media (max-width: 640px) {
  #dw-top { gap: 10px; padding: 6px 12px; top: 8px; }
  #dw-title { display: none; }
  #dw-timer { font-size: 22px; min-width: 64px; }
  #dw-ride { min-width: 110px; }
  #dw-score { top: 62px; right: 8px; min-width: 0; padding: 6px 10px; }
  #dw-score .v { font-size: 20px; }
  #dw-prompt { font-size: 16px; white-space: normal; text-align: center; width: max-content; }
  #dw-banner h1 { font-size: 28px; }
}
/* NARROW PHONES (b22 live check, 24 Sep): the bar above is 390 px wide, and 360-375 px phones -
   and the app's own browser pane at 343 - cut both ends off it. Under 420 the labels shorten
   ("BOW 12 / 30 s", "147 m") and the gaps close; the text itself stays at 16 px. */
#dw-ride .k2, #dw-compass .k2 { display: none; }
@media (max-width: 420px) {
  #dw-top { gap: 8px; padding: 6px 10px; max-width: calc(100% - 12px); box-sizing: border-box; }
  #dw-timer { font-size: 20px; min-width: 52px; }
  #dw-ride { min-width: 0; }
  #dw-ride .k1, #dw-compass .k1 { display: none; }
  #dw-ride .k2 { display: inline; }
  #dw-calm { width: 132px; }
  #dw-intro h1, #dw-over h1 { font-size: 24px; }
}
/* Short screens: the rules card loses its closing note and some air, so START stays on screen
   on a 568 px phone. Any tap starts the level anyway (main.js dismissBriefing). */
@media (max-height: 620px) {
  #dw-intro { padding: 12px 16px; }
  #dw-intro .note { display: none; }
  #dw-intro .sub { margin-bottom: 6px; }
  #dw-intro ul li { margin-bottom: 4px; }
  #dw-intro ul { line-height: 1.35; }
}
@keyframes dwpop { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, -70px); } }
`;

const h = (tag, attrs = {}, html = '') => {
  const el = document.createElement(tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (html) el.innerHTML = html;
  return el;
};
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtNum = (n) => Math.round(n).toLocaleString('en-GB');

export class WatchHud {
  constructor(mount, { onStart, onAgain, onExit }) {
    const style = h('style', { id: 'dw-style' }); style.textContent = CSS;
    document.head.appendChild(style);

    const r = this.root = h('div', { id: 'dw-root' });
    r.innerHTML = `
      <div id="dw-markers"></div>
      <div id="dw-top" class="dw-panel">
        <span id="dw-title">DOLPHIN WATCH</span>
        <span id="dw-timer">5:00</span>
        <span id="dw-ride"><span class="t"><span class="k1">ON THE BOW </span><span class="k2">BOW </span><b>0</b> / 30 s</span><span class="bar"><i></i></span></span>
        <span id="dw-compass"><i></i><span class="d"><span class="k1">last seen </span><b>—</b></span></span>
      </div>
      <div id="dw-score" class="dw-panel"><div class="v">0</div><div class="s"></div><div class="c">SCARES</div></div>
      <div id="dw-calm" class="dw-panel">THE POD <span class="w">calm</span><div class="meter"><i></i></div><div class="spd">0 kn</div></div>
      <div id="dw-prompt" class="dw-panel"><span class="t"></span></div>
      <div id="dw-banner" class="dw-panel"><h1></h1><p></p></div>
      <div id="dw-intro" class="dw-panel">
        <h1>DOLPHIN WATCH</h1>
        <div class="sub">A pod of bottlenose dolphins is in the bay. Get them riding your bow for 30 seconds.</div>
        <ul>
          <li><b>Watch for the blow.</b> Every time they surface a marker goes up where they were, and the compass remembers it.</li>
          <li><b>Slow down near them.</b> Hold a steady 6–20 knots on a straight course and let them come to you.</li>
          <li><b>Never chase them.</b> Charge at them, or throw the boat about near them, and they bolt.</li>
          <li><b>Three scares</b> and the pod leaves the bay.</li>
        </ul>
        <div class="note">Bottlenose dolphins really do visit Poole Bay. If you meet them on the water, the same rules apply.</div>
        <button type="button" data-a="start">START</button>
      </div>
      <div id="dw-over" class="dw-panel">
        <h1>DOLPHIN WATCH</h1><div class="why"></div><div>final score</div><div class="big">0</div><dl></dl>
        <!-- >>> PROGRESS -->
        <button type="button" data-a="next" hidden>NEXT</button>
        <!-- <<< PROGRESS -->
        <button type="button" data-a="again">PLAY AGAIN <small>Enter</small></button>
        <!-- >>> LEVELBACK -->
        <button type="button" data-a="levels" class="alt">CHOOSE LEVEL</button>
        <!-- <<< LEVELBACK -->
        <button type="button" data-a="exit" class="alt">FREE RIDE</button>
      </div>`;
    mount.appendChild(r);
    const q = (s) => r.querySelector(s);
    this.el = {
      markers: q('#dw-markers'), timer: q('#dw-timer'), rideT: q('#dw-ride .t b'), rideBar: q('#dw-ride .bar i'),
      compass: q('#dw-compass'), arrow: q('#dw-compass i'), cdist: q('#dw-compass .d b'), cwhy: q('#dw-compass .d .k1'),
      score: q('#dw-score .v'), note: q('#dw-score .s'), scares: q('#dw-score .c'),
      calm: q('#dw-calm'), calmW: q('#dw-calm .w'), calmI: q('#dw-calm .meter i'), spd: q('#dw-calm .spd'),
      prompt: q('#dw-prompt'), promptT: q('#dw-prompt .t'),
      banner: q('#dw-banner'), bannerH: q('#dw-banner h1'), bannerP: q('#dw-banner p'),
      intro: q('#dw-intro'),
      over: q('#dw-over'), overH: q('#dw-over h1'), overWhy: q('#dw-over .why'), overScore: q('#dw-over .big'),
      overDl: q('#dw-over dl'), next: q('#dw-over [data-a=next]'),
    };
    q('#dw-intro [data-a=start]').addEventListener('click', (e) => { e.stopPropagation(); this.hideIntro(); if (onStart) onStart(); });
    // >>> PROGRESS
    q('#dw-over [data-a=next]').addEventListener('click', (e) => { e.stopPropagation(); goNext(e.currentTarget); });
    // <<< PROGRESS
    q('#dw-over [data-a=again]').addEventListener('click', (e) => { e.stopPropagation(); onAgain(); });
    // >>> LEVELBACK  the raid card carries the reasoning; same closure, same handle.
    q('#dw-over [data-a=levels]').addEventListener('click', (e) => {
      e.stopPropagation();
      const b = document.querySelector('#btn-mode');
      if (b) b.click();
    });
    // <<< LEVELBACK
    q('#dw-over [data-a=exit]').addEventListener('click', (e) => { e.stopPropagation(); onExit(); });
    this.markerEls = [];
    this.bannerUntil = 0;
    this._scaresKey = '';
  }

  // The briefing card. pausemenu.js lists #dw-intro in BRIEFINGS, so while it is up the sim is
  // frozen - reading the rules costs nothing off the clock - and main.js's dismissBriefing()
  // takes it down on any key, click or touch.
  showIntro() { this.el.intro.classList.add('on'); this._card(); }
  hideIntro() { this.el.intro.classList.remove('on'); this._card(); }
  // body.dwcard while either card is up. Also re-read every frame in update(), because the
  // briefing can be taken down from main.js (any key) without passing through here.
  _card() {
    const on = this.el.intro.classList.contains('on') || this.el.over.classList.contains('on');
    if (document.body.classList.contains('dwcard') !== on) document.body.classList.toggle('dwcard', on);
  }
  get introOn() { return this.el.intro.classList.contains('on'); }

  banner(title, sub, cls, ms) {
    const e = this.el;
    e.bannerH.textContent = title; e.bannerP.textContent = sub;
    e.banner.className = 'dw-panel on ' + (cls || '');
    this.bannerUntil = performance.now() + ms;
  }

  pop(text, cls = '') {
    const p = h('div', { class: 'dw-pop ' + cls }, text);
    this.root.appendChild(p);
    setTimeout(() => p.remove(), 1450);
  }

  showOver(sum) {
    const e = this.el;
    // >>> PROGRESS
    // Unlike the rescue and the trip back this level CAN be lost, so the mode's own verdict is
    // what is recorded, and a lost run offers PLAY AGAIN rather than NEXT.
    prog.complete('dolphins', !!sum.won);
    setNext(e.next, 'dolphins', !!sum.won);
    // <<< PROGRESS
    e.banner.classList.remove('on'); this.bannerUntil = 0;
    e.over.className = 'dw-panel on ' + (sum.won ? 'won' : 'lost');
    e.overH.textContent = sum.won ? 'BOW RIDERS' : sum.why === 'scared' ? 'THE POD HAS LEFT' : 'OUT OF TIME';
    e.overWhy.textContent = sum.won
      ? (sum.calm ? 'Thirty seconds on the bow, and not one scare.' : 'Thirty seconds on the bow.')
      : sum.why === 'scared' ? 'Three scares and they left the bay. Slower near them, and steady.'
        : 'The pod has moved on. Find the blow, then ease right off.';
    e.overScore.textContent = fmtNum(sum.score);
    const rows = [
      ['Seconds on the bow', `${sum.rideT.toFixed(1)} / 30`],
      ['Leaps seen', sum.leaps],
      ['Scares', `${sum.scares} / 3`],
    ];
    if (sum.calm) rows.push(['Never scared them', 'CALM BONUS']);
    rows.push(['Time', fmtTime(sum.seconds)]);
    e.overDl.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    this._card();
  }

  hideOver() { this.el.over.classList.remove('on'); this._card(); }

  // Per frame. `proj(x, y, z)` -> {x, y, behind} in CSS px, or null with no 3D view.
  update(run, pose, proj, W, H, viewYaw, waterAt) {
    const e = this.el, T = run.T;
    e.timer.textContent = fmtTime(run.timer);
    e.timer.classList.toggle('low', run.phase === 'live' && run.timer < 30);
    e.rideT.textContent = String(Math.floor(run.rideT));
    e.rideBar.style.width = (Math.min(1, run.rideT / T.rideGoal) * 100).toFixed(1) + '%';
    e.score.textContent = fmtNum(run.phase === 'live' ? Math.round(run.rideT * T.pts.perSec) + run.leaps * T.pts.leap : run.score);
    e.note.textContent = run.leaps ? `${run.leaps} ${run.leaps === 1 ? 'leap' : 'leaps'} seen` : '';
    const sk = `${run.scares}/${T.scares}`;
    if (sk !== this._scaresKey) {
      this._scaresKey = sk;
      e.scares.innerHTML = 'SCARES' + Array.from({ length: T.scares }, (_, i) => `<span class="${i < run.scares ? 'gone' : ''}"></span>`).join('');
    }
    // The pod's own threat, as the pod computes it: at 0.40 they bolt, so the meter is full there.
    const th = Math.min(1, run.threat / 0.40);
    e.calmI.style.width = (th * 100).toFixed(0) + '%';
    e.calm.classList.toggle('edgy', th > 0.35 && th <= 0.7);
    e.calm.classList.toggle('bad', th > 0.7);
    e.calmW.textContent = run.status === 'scared' ? 'bolting' : th > 0.7 ? 'about to bolt' : th > 0.35 ? 'nervous' : 'calm';
    // Your speed, in the knots the rules card speaks in, green inside the band they will ride
    // (dolphin-pod.js RIDE_V, 3-10.5 m/s). The game's own speed card is hidden on a phone here.
    const kn = Math.max(0, (pose && pose.speed) || 0) * 1.943844;
    e.spd.textContent = `${kn.toFixed(0)} kn`;
    e.spd.classList.toggle('ok', kn >= 5.8 && kn <= 20.4);
    this._card();

    const obj = run.objective(pose);
    if (obj && run.status !== 'riding') {
      const rel = Math.atan2(obj.z - pose.z, obj.x - pose.x) - (Number.isFinite(viewYaw) ? viewYaw : pose.heading);
      e.arrow.style.transform = `rotate(${rel.toFixed(3)}rad)`;
      e.cwhy.textContent = 'last seen ';
      e.cdist.textContent = `${Math.round(obj.dist)} m`;
      e.compass.style.visibility = 'visible';
    } else if (run.status === 'riding') {
      e.arrow.style.transform = 'rotate(0rad)';
      e.cwhy.textContent = '';
      e.cdist.textContent = 'on the bow';
      e.compass.style.visibility = 'visible';
    } else e.compass.style.visibility = 'hidden';

    let txt = '', cls = '';
    if (run.phase === 'live') {
      switch (run.status) {
        case 'scared': txt = 'They’ve bolted — give them space'; cls = 'warn'; break;
        case 'riding': txt = 'ON YOUR BOW — hold her steady'; cls = 'good'; break;
        case 'coming': txt = 'They’re coming to you — hold your course'; cls = 'good'; break;
        case 'nervous': txt = 'Too fast — they’re getting nervous'; cls = 'warn'; break;
        case 'search': txt = 'Watch for the blow'; break;
        default:
          txt = obj && obj.dist < 170 ? 'Steady, 6–20 knots — let them come to you' : 'Head for the last blow';
      }
    }
    e.promptT.textContent = txt;
    e.prompt.className = 'dw-panel' + (txt ? ' on ' + cls : '');

    if (this.bannerUntil && performance.now() > this.bannerUntil && run.phase === 'live') {
      e.banner.classList.remove('on'); this.bannerUntil = 0;
    }

    // "Blow!" markers, where each breath was taken, fading over their life.
    const list = [];
    if (proj && run.phase !== 'over') {
      for (const b of run.blows) {
        const y = (waterAt ? waterAt(b.x, b.z) : 0) + 2.2;
        list.push({ x: b.x, y, z: b.z, a: 1 - b.age / T.blowLife, label: `${Math.round(Math.hypot(b.x - pose.x, b.z - pose.z))} m` });
      }
    }
    while (this.markerEls.length < list.length) {
      const m = h('div', { class: 'dw-m' }, '<b>Blow!</b><span></span>');
      e.markers.appendChild(m); this.markerEls.push(m);
    }
    const M = 40;
    // How far down the top panels reach, re-measured on a resize and otherwise every second
    // (reading layout every frame would force one; the panels only move with the window).
    if (this._topFor !== W * 1e5 + H || !(this._topAge-- > 0)) {
      this._topFor = W * 1e5 + H; this._topAge = 60;
      const rs = this.root.getBoundingClientRect();
      let b = 0;
      for (const el of [e.calm, this.root.querySelector('#dw-top'), this.root.querySelector('#dw-score')]) {
        const r = el.getBoundingClientRect();
        if (r.height && r.top - rs.top < H * 0.4) b = Math.max(b, r.bottom - rs.top);
      }
      this._topR = b + 6;
    }
    const topR = this._topR || 60;
    for (let i = 0; i < this.markerEls.length; i++) {
      const m = this.markerEls[i], it = list[i];
      if (!it) { m.style.display = 'none'; continue; }
      const s = proj(it.x, it.y, it.z);
      let x = s.x, y = s.y, edge = false, ang = 0;
      if (s.behind || x < M || x > W - M || y < 0 || y > H - M) {
        edge = true;
        let dx = x - W / 2, dy = y - H / 2;
        if (s.behind) { dx = -dx; dy = -dy; if (Math.abs(dy) < 1 && Math.abs(dx) < 1) dy = 1; }
        ang = Math.atan2(dy, dx);
        const kx = (W / 2 - M - 30) / Math.max(1e-3, Math.abs(dx)), ky = (H / 2 - M - 40) / Math.max(1e-3, Math.abs(dy));
        const k = Math.min(kx, ky);
        x = W / 2 + dx * k; y = H / 2 + 20 + dy * k;
      }
      // Never under the top panels: a far breath lands on the horizon, and on a phone the
      // panels reach down towards it. Pinned just below them, at its own x, it still says
      // which way and how far.
      if (y - 52 < topR) y = topR + 52;
      m.style.display = 'block';
      m.className = 'dw-m' + (edge ? ' edge' : '');
      m.style.opacity = Math.max(0, Math.min(1, it.a * 1.6)).toFixed(2);
      m.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      m.style.setProperty('--a', ang.toFixed(3) + 'rad');
      m.lastChild.textContent = it.label;
    }
  }
}
