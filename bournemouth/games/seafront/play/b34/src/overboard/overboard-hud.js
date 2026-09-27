// OVERBOARD - HUD, banners and the summary card (tmp-tr197). DOM only, created
// from here so index.html needs no markup, and hidden under ?clean=1 like every
// other overlay so a calibration render stays bare.
//
// Wording rule, same as the rescue level's: people are "aboard", "in the
// water", "picked up", "brought in by the shore team". Nothing in this file
// names a real service, an organisation, a nationality or a place of origin,
// and nothing in it suggests anyone is in danger.
//
// THE PART THAT EARNS ITS PIXELS is the BOAT panel, bottom left. It is not
// decoration: the ejection rule is only fair if the player can see it coming,
// so the panel shows, live,
//   * one pip per person aboard, coloured by how well they are holding on, and
//   * a meter of the boat's lateral g with the threshold marked on it.
// Drive inside the mark and nobody moves. Hold it past the mark and the pips
// bleed down, in the order the seat plan says, and THEN somebody goes.
//
// ⚠️ No back-quote may appear inside the CSS template literal below.

// >>> PROGRESS
import * as prog from '../ui/progress-store.js';
import { setNext, goNext } from '../ui/next-button.js';
// <<< PROGRESS

const CSS = `
#ob-root { position: absolute; inset: 0; pointer-events: none; z-index: 30; display: none;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; color: #f4f7fb; }
body.overboard #ob-root { display: block; }
body.overboard #viewbar, body.overboard #hint, body.overboard #ob-door { display: none !important; }
body.clean-render #ob-root, body.clean-render #ob-door { display: none !important; }
body.overboard #left > #craftbar { top: 62px; }
.ob-panel { background: rgba(8,14,22,.70); border: 1px solid rgba(255,255,255,.14); border-radius: 12px;
  backdrop-filter: blur(4px); }
#ob-top { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; align-items: center;
  gap: 16px; padding: 7px 18px; white-space: nowrap; }
#ob-leg { font-weight: 800; letter-spacing: .12em; font-size: 16px; color: #9fd8ff; }
#ob-timer { font: 700 30px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; min-width: 92px; text-align: center; }
#ob-timer.low { color: #ff6b5e; animation: obpulse .5s ease-in-out infinite alternate; }
#ob-count { font-size: 16px; letter-spacing: .04em; }
#ob-count b { font-size: 18px; }
#ob-count i { font-style: normal; color: #ffb13b; }
#ob-compass { display: flex; align-items: center; gap: 6px; font-size: 16px; }
#ob-compass i { display: inline-block; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent;
  border-bottom: 22px solid #ffb13b; transform-origin: 50% 66%; }
#ob-compass.zone i { border-bottom-color: #46f08a; }
#ob-score { position: absolute; top: 10px; right: 12px; padding: 8px 14px; text-align: right; min-width: 150px; }
#ob-score .v { font: 800 26px/1.05 ui-monospace, Consolas, monospace; }
#ob-score .s { font-size: 16px; color: #ffd76a; min-height: 20px; }
#ob-boat { position: absolute; left: 12px; bottom: 16px; padding: 9px 13px; font-size: 16px; letter-spacing: .06em; min-width: 226px; }
#ob-boat .hd { display: flex; justify-content: space-between; gap: 14px; }
#ob-boat .hd em { font-style: normal; color: #9fb4c8; }
#ob-boat .pips { display: flex; gap: 5px; margin: 7px 0 9px; }
#ob-boat .pips span { width: 20px; height: 24px; border-radius: 5px; border: 2px solid rgba(255,255,255,.28);
  background: linear-gradient(to top, var(--c, #46f08a) var(--g, 100%), rgba(255,255,255,.06) 0); }
#ob-boat .pips span.gone { border-style: dashed; border-color: rgba(255,255,255,.18); background: none; }
#ob-boat .gl { font-size: 16px; color: #cfe3f5; display: flex; justify-content: space-between; }
#ob-boat .meter { position: relative; height: 10px; border-radius: 5px; background: rgba(255,255,255,.12);
  margin-top: 5px; overflow: hidden; }
#ob-boat .meter i { display: block; height: 100%; width: 0; background: #46f08a; transition: width .08s linear; }
#ob-boat .meter.hot i { background: #ff8b45; }
#ob-boat .meter u { position: absolute; top: -2px; bottom: -2px; width: 2px; background: #f4f7fb; opacity: .85; }
#ob-boat.warn { border-color: rgba(255,139,69,.85); box-shadow: 0 0 16px rgba(255,139,69,.28); }
#ob-prompt { position: absolute; left: 50%; bottom: 64px; transform: translateX(-50%); padding: 9px 20px; font-size: 17px;
  font-weight: 700; letter-spacing: .03em; white-space: nowrap; opacity: 0; transition: opacity .2s; }
#ob-prompt.on { opacity: 1; }
#ob-prompt.warn { color: #ff8b80; }
#ob-prompt.good { color: #6ff0a0; }
#ob-prompt .bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.15); margin-top: 6px; overflow: hidden; display: none; }
#ob-prompt .bar i { display: block; height: 100%; width: 0; background: #46f08a; }
#ob-prompt.bar-on .bar { display: block; }
#ob-banner { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); text-align: center; opacity: 0;
  transition: opacity .35s, transform .35s; padding: 16px 34px; }
#ob-banner.on { opacity: 1; transform: translate(-50%, -50%) scale(1.02); }
#ob-banner h1 { margin: 0; font-size: 44px; font-weight: 900; letter-spacing: .08em; text-shadow: 0 3px 14px rgba(0,0,0,.5); }
#ob-banner p { margin: 6px 0 0; font-size: 16px; color: #d7e6f3; }
#ob-banner.good h1 { color: #6ff0a0; }
#ob-banner.late h1 { color: #ffb13b; }
#ob-markers { position: absolute; inset: 0; overflow: hidden; }
.ob-m { position: absolute; left: 0; top: 0; transform: translate(-50%, -100%); text-align: center; font-size: 16px; font-weight: 700;
  white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,.8); will-change: transform; }
.ob-m .ico { width: 30px; height: 30px; margin: 0 auto 2px; border-radius: 50%; border: 3px solid #ffb13b;
  background: conic-gradient(#46f08a calc(var(--p, 0) * 1turn), rgba(8,14,22,.55) 0); position: relative; }
.ob-m .ico b { position: absolute; inset: 0; display: grid; place-items: center; font-size: 16px; }
.ob-m.obj .ico { border-color: #ffd23b; box-shadow: 0 0 12px rgba(255,210,59,.8); width: 34px; height: 34px; }
.ob-m.zone .ico { border-color: #46f08a; border-radius: 7px; }
.ob-m.zone.idle { opacity: .55; }
.ob-m.edge .ico::after { content: ''; position: absolute; left: 50%; top: 50%; width: 0; height: 0; border-top: 7px solid transparent;
  border-bottom: 7px solid transparent; border-left: 12px solid currentColor; transform: translate(-50%, -50%) rotate(var(--a, 0rad)) translateX(22px); }
.ob-m.edge { color: #ffb13b; } .ob-m.edge.zone { color: #46f08a; }
.ob-pop { position: absolute; left: 50%; top: 42%; transform: translate(-50%, 0); font: 900 26px/1 ui-sans-serif, system-ui, sans-serif;
  color: #ffd76a; text-shadow: 0 2px 8px rgba(0,0,0,.6); animation: obpop 1.2s ease-out forwards; }
.ob-pop.over { color: #ff8b45; font-size: 30px; }
.ob-pop.pick { color: #7fd8ff; font-size: 20px; }
#ob-over { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 22px 30px; min-width: 340px;
  text-align: center; display: none; pointer-events: auto; box-sizing: border-box;
  max-width: calc(100% - 24px); max-height: calc(100% - 24px); overflow: auto; }
#ob-over.on { display: block; }
#ob-over h1 { margin: 0 0 4px; font-size: 34px; letter-spacing: .1em; }
#ob-over .big { font: 900 44px/1.1 ui-monospace, Consolas, monospace; color: #ffd76a; margin: 6px 0 12px; }
#ob-over dl { display: grid; grid-template-columns: 1fr auto; gap: 4px 20px; margin: 0 0 16px; text-align: left; font-size: 16px; }
#ob-over dt { color: #b8c9d9; } #ob-over dd { margin: 0; font-weight: 700; text-align: right; }
#ob-over button, #ob-door { font: 700 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; color: #0b1520;
  background: #ffc21a; border: 0; border-radius: 999px; padding: 10px 18px; min-height: 44px; cursor: pointer; margin: 0 4px; }
#ob-over button.alt { background: rgba(255,255,255,.14); color: #f4f7fb; }
/* ⚠️ HIDDEN EVERYWHERE, ON PURPOSE, AND IT STILL HAS A JOB. The first draft of this
   file showed this button top-right exactly as #rq-door and #rd-door used to - and
   index.html:314 turns BOTH of those off with a display:none !important and gives the
   reason: there is a level picker now, it lists every level, and a bare URL opens it as
   the start screen, so a second visual language in the corner offering one level again
   is clutter over the level card. Reintroducing that button would have undone a decision
   this project had already taken and written down.
   It is KEPT, not deleted, for the same reason those two are kept: main.js enters the
   rescue level by CLICKING #rq-door, because that module's enter/exit are private. This
   level's enter/exit are public on window.efoilOverboard, so a picker row can call
   either - but a hidden button still takes a programmatic click and the pattern already
   exists, so the handle is here if it is wanted. */
#ob-door { position: absolute; right: 16px; top: 88px; z-index: 35; display: none !important;
  box-shadow: 0 4px 18px rgba(0,0,0,.35); }
body.touch.overboard #hud, body.touch.overboard #left > #craftbar { display: none !important; }
#ob-door small, #ob-over button small { font-size: 14px; font-weight: 600; opacity: .7; margin-left: 6px; }
@keyframes obpulse { from { opacity: 1; } to { opacity: .55; } }
@keyframes obpop { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, -70px); } }
`;

const h = (tag, attrs = {}, html = '') => {
  const el = document.createElement(tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (html) el.innerHTML = html;
  return el;
};
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtNum = (n) => Math.round(n).toLocaleString('en-GB');
// Grip 1 -> green, 0 -> red, through amber. One place, so the pips and the
// meter cannot disagree about what "in trouble" looks like.
const gripColour = (g) => (g > 0.72 ? '#46f08a' : g > 0.42 ? '#ffc21a' : '#ff6b5e');

export class OverboardHud {
  constructor(mount, { onEnter, onAgain, onNext, onExit }) {
    const style = h('style', { id: 'ob-style' }); style.textContent = CSS;
    document.head.appendChild(style);

    this.door = h('button', { id: 'ob-door', type: 'button' }, 'THE TRIP BACK<small>Shift+O</small>');
    this.door.addEventListener('click', (e) => { e.stopPropagation(); onEnter(); });
    mount.appendChild(this.door);

    const r = this.root = h('div', { id: 'ob-root' });
    r.innerHTML = `
      <div id="ob-markers"></div>
      <div id="ob-top" class="ob-panel">
        <span id="ob-leg">LEG 1</span>
        <span id="ob-timer">0:00</span>
        <span id="ob-count"><b>0</b> aboard</span>
        <span id="ob-compass"><i></i><span>&mdash;</span></span>
      </div>
      <div id="ob-score" class="ob-panel"><div class="v">0</div><div class="s"></div></div>
      <div id="ob-boat" class="ob-panel">
        <div class="hd"><span>HOLDING ON</span><em class="seats">0/0</em></div>
        <div class="pips"></div>
        <div class="gl"><span>TURNING IT</span><em class="g">0.00 g</em></div>
        <div class="meter"><i></i><u></u></div>
      </div>
      <div id="ob-prompt" class="ob-panel"><span class="t"></span><div class="bar"><i></i></div></div>
      <div id="ob-banner" class="ob-panel"><h1></h1><p></p></div>
      <div id="ob-over" class="ob-panel">
        <h1>PASSAGE OVER</h1><div>final score</div><div class="big">0</div><dl></dl>
        <!-- >>> PROGRESS  the next LEVEL, now there is one after this (b22) -->
        <button type="button" data-a="nextlevel" hidden>NEXT</button>
        <!-- <<< PROGRESS -->
        <button type="button" data-a="next">NEXT LEG <small>Enter</small></button>
        <button type="button" data-a="again" class="alt">SAME LEG AGAIN</button>
        <!-- >>> LEVELBACK -->
        <button type="button" data-a="levels" class="alt">CHOOSE LEVEL</button>
        <!-- <<< LEVELBACK -->
        <button type="button" data-a="exit" class="alt">FREE RIDE <small>Shift+O</small></button>
      </div>`;
    mount.appendChild(r);
    const q = (s) => r.querySelector(s);
    this.el = {
      markers: q('#ob-markers'), leg: q('#ob-leg'), timer: q('#ob-timer'), count: q('#ob-count'),
      compass: q('#ob-compass'), arrow: q('#ob-compass i'), cdist: q('#ob-compass span'),
      score: q('#ob-score .v'), note: q('#ob-score .s'),
      boat: q('#ob-boat'), seats: q('#ob-boat .seats'), pips: q('#ob-boat .pips'),
      gval: q('#ob-boat .g'), meter: q('#ob-boat .meter'), meterI: q('#ob-boat .meter i'), meterU: q('#ob-boat .meter u'),
      prompt: q('#ob-prompt'), promptT: q('#ob-prompt .t'), bar: q('#ob-prompt .bar i'),
      banner: q('#ob-banner'), bannerH: q('#ob-banner h1'), bannerP: q('#ob-banner p'),
      over: q('#ob-over'), overScore: q('#ob-over .big'), overDl: q('#ob-over dl'),
      nextLevel: q('#ob-over [data-a=nextlevel]'),
    };
    // >>> PROGRESS
    q('#ob-over [data-a=nextlevel]').addEventListener('click', (e) => { e.stopPropagation(); goNext(e.currentTarget); });
    // <<< PROGRESS
    q('#ob-over [data-a=next]').addEventListener('click', (e) => { e.stopPropagation(); onNext(); });
    q('#ob-over [data-a=again]').addEventListener('click', (e) => { e.stopPropagation(); onAgain(); });
    // >>> LEVELBACK  the raid card carries the reasoning; this is the same closure of the
    // same inconsistency. No onLevels callback for the reason stated there.
    q('#ob-over [data-a=levels]').addEventListener('click', (e) => {
      e.stopPropagation();
      const b = document.querySelector('#btn-mode');
      if (b) b.click();
    });
    // <<< LEVELBACK
    q('#ob-over [data-a=exit]').addEventListener('click', (e) => { e.stopPropagation(); onExit(); });
    this.markerEls = [];
    this.pipEls = [];
    this.bannerUntil = 0;
    this._pipsFor = -1;
    // The meter tops out at 2x the threshold, so "at the mark" is always
    // half way along it whatever the threshold is tuned to.
    this.gFull = 1;
  }

  banner(title, sub, cls, ms) {
    const e = this.el;
    e.bannerH.textContent = title; e.bannerP.textContent = sub;
    e.banner.className = 'ob-panel on ' + (cls || '');
    this.bannerUntil = performance.now() + ms;
  }

  pop(text, cls = '') {
    const p = h('div', { class: 'ob-pop ' + cls }, text);
    this.root.appendChild(p);
    setTimeout(() => p.remove(), 1250);
  }

  showOver(sum) {
    const e = this.el;
    // >>> PROGRESS
    // The trip back cannot be lost either: its outcome is "all aboard" or "shore team", and both
    // are ways of getting everyone in. Finishing the passage is the completion.
    prog.complete('overboard', true);
    // b22: this was the last level and its card had no NEXT. It is not any more.
    setNext(e.nextLevel, 'overboard', true);
    // <<< PROGRESS
    e.banner.classList.remove('on'); this.bannerUntil = 0;
    e.overScore.textContent = fmtNum(sum.score);
    const rows = [
      ['Started with', `${sum.started} aboard`],
      ['Brought to the beach', sum.broughtIn],
      ['Went over the side', sum.wentOver],
      ['Picked back up', sum.recovered],
      ['Brought in by the shore team', sum.handedToShore],
      ['Time left', fmtTime(sum.secondsLeft)],
      ['Passage', fmtTime(sum.seconds)],
    ];
    if (sum.dry) rows.splice(2, 0, ['Nobody went over', 'DRY PASSAGE']);
    e.overDl.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    e.over.classList.add('on');
  }

  hideOver() { this.el.over.classList.remove('on'); }

  // Per-frame. `proj(x, y, z)` -> { x, y, behind } in CSS px, or null with no 3D view.
  update(run, pose, proj, W, H, viewYaw) {
    const e = this.el, T = run.T;
    e.leg.textContent = `LEG ${run.leg}`;
    const t = run.phase === 'intro' ? run.timerTotal : run.timer;
    e.timer.textContent = fmtTime(t);
    e.timer.classList.toggle('low', run.phase === 'live' && run.timer < 25);
    const nw = run.nWater;
    e.count.innerHTML = `<b>${run.nAboard}</b> aboard` + (nw ? ` &middot; <i><b>${nw}</b> in the water</i>` : '');
    e.score.textContent = fmtNum(Math.max(0, run.score));
    e.note.textContent = run.everOver === 0 && run.phase === 'live' ? 'DRY SO FAR' : '';

    // ---- the boat panel ----
    const cap = run.people.length;
    if (this._pipsFor !== cap) {
      this._pipsFor = cap;
      e.pips.innerHTML = Array.from({ length: cap }, () => '<span></span>').join('');
      this.pipEls = [...e.pips.children];
    }
    const seated = run.people.filter((p) => p.state === 'aboard').sort((a, b) => a.seat - b.seat);
    e.seats.textContent = `${seated.length}/${cap}`;
    for (let i = 0; i < this.pipEls.length; i++) {
      const pip = this.pipEls[i], p = seated[i];
      if (!p) { pip.className = 'gone'; pip.style.removeProperty('--g'); continue; }
      pip.className = '';
      const g = Math.max(0, Math.min(1, p.grip));
      pip.style.setProperty('--g', (g * 100).toFixed(0) + '%');
      pip.style.setProperty('--c', gripColour(g));
    }
    const gNow = Math.max(0, run.sling);
    this.gFull = Math.max(0.6, T.holdG * 2);
    e.gval.textContent = `${gNow.toFixed(2)} g`;
    e.meterI.style.width = (Math.min(1, gNow / this.gFull) * 100).toFixed(1) + '%';
    e.meter.classList.toggle('hot', gNow > T.holdG);
    e.meterU.style.left = ((T.holdG / this.gFull) * 100).toFixed(1) + '%';
    e.boat.classList.toggle('warn', run.phase === 'live' && run.worstGrip < T.warnGrip);

    // ---- compass ----
    const obj = run.objective(pose);
    if (obj) {
      const rel = Math.atan2(obj.z - pose.z, obj.x - pose.x) - (Number.isFinite(viewYaw) ? viewYaw : pose.heading);
      e.arrow.style.transform = `rotate(${rel.toFixed(3)}rad)`;
      e.cdist.textContent = `${obj.kind === 'zone' ? 'BEACH' : ''} ${Math.round(obj.dist)} m`.trim();
      e.compass.classList.toggle('zone', obj.kind === 'zone');
      e.compass.style.visibility = 'visible';
    } else e.compass.style.visibility = 'hidden';

    // ---- prompt ----
    let txt = '', cls = '', bar = -1;
    if (run.phase === 'live') {
      const need = run.pickNeed || T.pickupHold;
      switch (run.status) {
        case 'tooFast': txt = 'SLOW RIGHT DOWN to pick them up'; cls = 'warn'; bar = run.pickT / need; break;
        case 'picking':
          txt = run.nearPerson && run.nearPerson.cold > 0.5
            ? 'PICKING UP — they are cold and slow, hold it here'
            : 'PICKING UP — hold it here';
          cls = 'good'; bar = run.pickT / need; break;
        case 'slowForDrop': txt = 'Ease off to put them ashore'; cls = 'warn'; break;
        case 'dropping': txt = 'PUTTING THEM ASHORE'; cls = 'good'; break;
        default:
          if (run.worstGrip < T.warnGrip) { txt = 'EASE OFF — they cannot hold on'; cls = 'warn'; }
          else if (obj && obj.kind === 'person') txt = obj.dist < 40 ? 'Slow right down beside them' : 'Come about and pick them up';
          else if (obj && obj.kind === 'zone') txt = 'Bring them in to the beach';
      }
    }
    e.promptT.textContent = txt;
    e.prompt.className = 'ob-panel' + (txt ? ' on ' + cls : '') + (bar >= 0 ? ' bar-on' : '');
    if (bar >= 0) e.bar.style.width = (Math.min(1, bar) * 100).toFixed(0) + '%';

    // Banners live on SIM phase, not the wall clock, so a slow frame rate
    // cannot desynchronise the text from the state.
    const bannerPhase = run.phase === 'intro' || run.phase === 'ashore' || run.phase === 'timeup';
    if (!bannerPhase && this.bannerUntil) { e.banner.classList.remove('on'); this.bannerUntil = 0; }

    // ---- world markers ----
    const list = [];
    if (proj && run.phase !== 'over') {
      for (const p of run.people) {
        if (p.state !== 'water') continue;
        const isObj = obj && obj.kind === 'person' && obj.person === p;
        const here = run.nearPerson === p;
        const need = run.pickNeed || T.pickupHold;
        list.push({
          x: p.x, y: 3.2, z: p.z, cls: isObj ? 'obj' : '',
          label: `${Math.round(Math.hypot(p.x - pose.x, p.z - pose.z))} m`,
          n: p.cold > 0.66 ? '❄' : '1', p: here ? run.pickT / need : 0,
        });
      }
      const Z = run.zone;
      list.push({
        x: Z.x, y: 5, z: Z.z, cls: 'zone' + (run.nAboard ? '' : ' idle'),
        label: `BEACH ${Math.round(Math.hypot(Z.x - pose.x, Z.z - pose.z))} m`,
        n: run.nAboard || '', p: 0,
      });
    }
    while (this.markerEls.length < list.length) {
      const m = h('div', { class: 'ob-m' }, '<div class="ico"><b></b></div><span></span>');
      e.markers.appendChild(m); this.markerEls.push(m);
    }
    const M = 34;
    for (let i = 0; i < this.markerEls.length; i++) {
      const m = this.markerEls[i];
      const it = list[i];
      if (!it) { m.style.display = 'none'; continue; }
      const s = proj(it.x, it.y, it.z);
      let x = s.x, y = s.y, edge = false, ang = 0;
      if (s.behind || x < M || x > W - M || y < M + 60 || y > H - M) {
        edge = true;
        let dx = x - W / 2, dy = y - H / 2;
        if (s.behind) { dx = -dx; dy = -dy; if (Math.abs(dy) < 1 && Math.abs(dx) < 1) dy = 1; }
        ang = Math.atan2(dy, dx);
        const kx = (W / 2 - M) / Math.max(1e-3, Math.abs(dx)), ky = (H / 2 - M - 40) / Math.max(1e-3, Math.abs(dy));
        const k = Math.min(kx, ky);
        x = W / 2 + dx * k; y = H / 2 + 20 + dy * k;
      }
      m.style.display = 'block';
      m.className = 'ob-m ' + it.cls + (edge ? ' edge' : '');
      m.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      m.style.setProperty('--p', Math.min(1, it.p).toFixed(3));
      m.style.setProperty('--a', ang.toFixed(3) + 'rad');
      m.firstChild.firstChild.textContent = it.n;
      m.lastChild.textContent = it.label;
    }
  }
}
