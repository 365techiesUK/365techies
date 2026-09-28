// PIER SURF - HUD, rules card and summary card (stage 1, 26 Sep 2026). DOM only, created from
// here so index.html needs no markup, and hidden under ?clean=1 like every other overlay.
// Same look as Dolphin Watch's (src/dolphinwatch/watch-hud.js), with its own ids.
//
// ⚠️ No back-quote may appear inside the CSS template literal below.

import { RIDE_PTS, rideMult } from '../boats/surfboard.js';

// >>> PROGRESS
import * as prog from '../ui/progress-store.js';
import { setNext, goNext } from '../ui/next-button.js';
// <<< PROGRESS

const CSS = `
#sf-root { position: absolute; inset: 0; pointer-events: none; z-index: 30; display: none;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; color: #f4f7fb; }
body.surfer #sf-root { display: block; }
body.surfer #viewbar, body.surfer #hint { display: none !important; }
body.surfer #left > #craftbar { display: none !important; }
body.clean-render #sf-root { display: none !important; }
body.touch.surfer #hud { display: none !important; }
/* STAGE 1 (27 Sep 2026): in the level the game's own speed panel (mph, craft, state) is clutter the
   level already says better, and CRAFT does nothing here (the level refuses other craft). */
body.surfer #hud, body.surfer #btn-craft { display: none !important; }
/* The touch controls say what they do in the level: the pad steers (no trim on a board) and the strip
   paddles - it lets go when you let go, in the level (input.js). Relabelled here, not in the page. */
body.surfer #tghost::after { content: 'STEER'; }
body.surfer #tthr span.lbl { color: transparent; }
body.surfer #tthr span.lbl::after { content: 'PADDLE'; color: #f4f7fb; position: absolute; left: 0; right: 0; }
body.surfer.sfcard #sf-root { z-index: 57; }
.sf-panel { background: rgba(8,14,22,.70); border: 1px solid rgba(255,255,255,.14); border-radius: 12px; backdrop-filter: blur(4px); }
#sf-top { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; align-items: center;
  gap: 16px; padding: 7px 18px; white-space: nowrap; }
#sf-title { font-weight: 800; letter-spacing: .12em; font-size: 16px; color: #9fe6ff; }
#sf-waves { font: 700 24px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; }
#sf-waves span { display: inline-block; width: 13px; height: 13px; border-radius: 50%; margin-left: 5px;
  border: 3px solid #46f0c8; vertical-align: 0; }
#sf-waves span.on { background: #46f0c8; }
#sf-waves small { font-size: 13px; opacity: .75; margin-left: 8px; }
body.touch #sf-waves small { display: none; }
#sf-clock { font: 700 16px/1 ui-monospace, Consolas, monospace; color: #cfe3f5; }
#sf-clock.late { color: #ffb13b; }
#sf-meter { position: absolute; left: 12px; bottom: 16px; padding: 8px 12px; font-size: 16px; letter-spacing: .06em; min-width: 190px; }
#sf-meter .bar { position: relative; height: 10px; border-radius: 5px; background: rgba(255,255,255,.15); margin-top: 6px; overflow: hidden; }
#sf-meter .bar i { display: block; height: 100%; width: 0; background: #7fe0ff; }
#sf-meter .bar b { position: absolute; top: -2px; bottom: -2px; width: 3px; background: #ffd76a; left: 75%; }
#sf-meter .v { margin-top: 5px; font: 700 16px/1 ui-sans-serif, system-ui, sans-serif; color: #ffd76a; letter-spacing: .06em; padding-left: calc(75% - 30px); }
#sf-meter.ok .bar i { background: #46f0c8; }
/* PADDLE SPEED (stage 1): full at popU / 0.75, so POP UP is always at the same place (75%). Green and
   pulsing when a press would stand you up, amber while it would be too steep. */
#sf-meter.go { border-color: #6ff0c8; animation: sf-mgo .5s ease-in-out infinite alternate; }
#sf-meter.steep .bar i { background: #ffb13b; }
@keyframes sf-mgo { from { box-shadow: 0 0 0 0 rgba(80,255,150,.55); } to { box-shadow: 0 0 0 10px rgba(80,255,150,0); } }
#sf-prompt .ar { display: none; margin-right: 10px; font-size: 22px; line-height: 1; vertical-align: -3px; transition: transform .15s linear; }
#sf-prompt.arrow .ar { display: inline-block; }
#sf-score { position: absolute; top: 10px; right: 12px; padding: 8px 14px; text-align: right; min-width: 150px; font-size: 16px; }
#sf-score .v { font: 800 24px/1.05 ui-monospace, Consolas, monospace; }
#sf-score .s { color: #bfe9ff; }
/* THE RIDE COUNTER (27 Sep 2026): up only while you ride, top middle - over the sky, not over you
   (the ride view puts the rider in the lower middle of the picture). */
#sf-ride { position: absolute; left: 50%; top: 64px; transform: translateX(-50%); padding: 6px 16px 8px; text-align: center;
  min-width: 180px; display: none; }
#sf-ride.on { display: block; }
#sf-ride .t { display: flex; justify-content: space-between; gap: 16px; font: 700 15px/1.2 ui-monospace, Consolas, monospace; color: #cfe3f5; }
#sf-ride .t b { color: #f4f7fb; }
#sf-ride.m2 .t b { color: #7fe0ff; } #sf-ride.m3 .t b { color: #46f0c8; } #sf-ride.m4 .t b { color: #ffb13b; }
#sf-ride .v { font: 900 34px/1.05 ui-monospace, Consolas, monospace; color: #ffd76a; }
#sf-ride .bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.15); overflow: hidden; margin-top: 4px; }
#sf-ride .bar i { display: block; height: 100%; width: 0; background: #46f0c8; }
#sf-ride .n { font-size: 16px; color: #a9bfd3; margin-top: 3px; }
/* The multiplier's call, riding: said IN the counter whose x it raises (stage 3), not floated over the
   picture - there it met the move callouts pinned over your head. */
#sf-ride .call { display: none; font: 900 20px/1.1 ui-sans-serif, system-ui, sans-serif; color: #ffd76a; margin-top: 2px; letter-spacing: .03em; white-space: nowrap; }
#sf-ride .call.on { display: block; animation: sfcall 1.6s ease-out forwards; }
#sf-ride .call.on ~ .n { display: none; }
@keyframes sfcall { 0% { opacity: 0; transform: scale(.85); } 10% { opacity: 1; transform: scale(1.12); } 22% { transform: scale(1); } 80% { opacity: 1; } 100% { opacity: 0; } }
.sf-pop.mult { color: #ffd76a; font-size: 30px; }
.sf-pop.move { color: #f4f7fb; font-size: 28px; letter-spacing: .04em; }
/* ON THE WAVE (27 Sep 2026, stage 2): while you ride, the catch meter becomes where you are on the
   wave - LIP | POCKET | FACE | FOAM, a dot for you, and what that band pays (the judge's zones). */
#sf-meter .rstrip, #sf-meter .rrate { display: none; }
#sf-meter.riding .bar, #sf-meter.riding .v, #sf-meter.riding .lbl { display: none; }
#sf-meter.riding .rstrip { display: flex; position: relative; margin-top: 4px; height: 22px; border-radius: 6px; overflow: hidden; }
#sf-meter.riding .rrate { display: block; margin-top: 5px; font: 800 16px/1 ui-monospace, Consolas, monospace; color: #ffd76a; text-align: center; }
#sf-meter .rstrip b { flex: 1 1 0; min-width: 0; overflow: hidden; font: 700 11px/22px ui-sans-serif, system-ui, sans-serif; text-align: center; color: #0b1520; letter-spacing: .04em; }
body.touch #sf-meter .rstrip b { font-size: 9px; letter-spacing: 0; }
#sf-meter .rstrip b[data-z="lip"] { background: #9fe6ff; } #sf-meter .rstrip b[data-z="pocket"] { background: #46f0c8; }
#sf-meter .rstrip b[data-z="face"] { background: #7fb8d8; } #sf-meter .rstrip b[data-z="foam"] { background: #e6eef4; }
#sf-meter .rstrip b.on { outline: 2px solid #ffd76a; outline-offset: -2px; }
#sf-meter .rstrip i { position: absolute; top: 3px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; background: #ffd76a; border: 2px solid #0b1520; transition: left .12s linear; }
#sf-meter.pocket { box-shadow: 0 0 16px rgba(70,240,200,.55); }
/* On a phone the arrow along the wave takes the ride counter's place for the first seconds. */
body.touch.sf-riding.sf-along #sf-prompt { display: block; }
body.touch.sf-along #sf-ride { display: none; }
#sf-prompt { position: absolute; left: 50%; bottom: 64px; transform: translateX(-50%); padding: 9px 20px; font-size: 17px;
  font-weight: 700; letter-spacing: .03em; white-space: nowrap; max-width: calc(100% - 24px); }
#sf-prompt.warn { color: #ffb2aa; } #sf-prompt.good { color: #6ff0c8; }
#sf-banner { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); text-align: center; opacity: 0;
  transition: opacity .35s; padding: 16px 34px; max-width: calc(100% - 24px); box-sizing: border-box; }
#sf-banner.on { opacity: 1; }
#sf-banner h1 { margin: 0; font-size: 40px; font-weight: 900; letter-spacing: .08em; text-shadow: 0 3px 14px rgba(0,0,0,.5); }
#sf-banner p { margin: 6px 0 0; font-size: 16px; color: #d7e6f3; }
/* A wave's numbers as three chips (stage 3), not a line of dots to read at speed. */
#sf-banner p span { display: inline-block; margin: 2px 3px; padding: 3px 10px; border-radius: 999px; background: rgba(8,16,26,.55); white-space: nowrap; }
#sf-banner.good h1 { color: #6ff0c8; } #sf-banner.bad h1 { color: #ffb13b; }
.sf-pop { position: absolute; left: 50%; top: 42%; transform: translate(-50%, 0); font: 900 26px/1.1 ui-sans-serif, system-ui, sans-serif;
  color: #6ff0c8; text-shadow: 0 2px 8px rgba(0,0,0,.6); animation: sfpop 1.6s ease-out forwards;
  /* never wider than the screen: the long ones (the risk and kick-out advice) wrap, centred (b53 review) */
  width: max-content; max-width: calc(100% - 24px); white-space: normal; text-align: center; box-sizing: border-box; }
.sf-pop.section { color: #ffd76a; }
.sf-pop.bad { color: #ffb13b; }
/* PINNED ABOVE THE RIDER (stage 3): a move's callout on a dark pill just over your head, following
   you (mode.js riderAnchor), so it never covers you - beside your head if over it is the ride counter. */
.sf-pop.at { top: 0; left: 0; background: rgba(8,16,26,.62); padding: 6px 12px 7px; border-radius: 999px; font-size: 22px;
  animation: sfpopat 1.6s ease-out forwards; }

@keyframes sfpopat { 0% { opacity: 0; transform: translate(-50%, -80%) scale(.9); } 12% { opacity: 1; transform: translate(-50%, -100%) scale(1.05); }
  75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -150%); } }
@keyframes sfpop { 0% { opacity: 0; transform: translate(-50%, 10px) scale(.9); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
  75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -26px); } }
#sf-intro, #sf-over { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 20px 26px;
  width: min(540px, calc(100% - 24px)); max-height: calc(100% - 24px); overflow: auto; box-sizing: border-box;
  text-align: center; display: none; pointer-events: auto; }
#sf-intro.on, #sf-over.on { display: block; }
#sf-intro h1, #sf-over h1 { margin: 0 0 4px; font-size: 30px; letter-spacing: .1em; color: #9fe6ff; }
#sf-intro .sub { font-size: 17px; color: #dbe8f4; margin-bottom: 10px; }
#sf-intro ul { list-style: none; margin: 0 0 10px; padding: 0; font-size: 16px; line-height: 1.45; text-align: left; }
#sf-intro ul li { margin-bottom: 7px; }
#sf-intro ul b { color: #9fe6ff; }
#sf-intro .note { font-size: 16px; line-height: 1.4; color: #a9bfd3; margin: 4px 0 12px; font-style: italic; }
#sf-over dl { display: grid; grid-template-columns: 1fr auto; gap: 4px 20px; margin: 8px 0 16px; text-align: left; font-size: 16px; }
#sf-over dt { color: #b8c9d9; } #sf-over dd { margin: 0; font-weight: 700; text-align: right; }
#sf-over h1 { color: #6ff0c8; }
#sf-over .big { font: 900 44px/1.1 ui-monospace, Consolas, monospace; color: #ffd76a; margin: 6px 0 4px; }
/* STAGE 3 (27 Sep 2026): the run is kept - a personal best, and your top five with this run in it. */
#sf-over .pbl { font: 800 18px/1.3 ui-sans-serif, system-ui, sans-serif; color: #bfe9ff; min-height: 1.3em; }
#sf-over .pbl.new { color: #6ff0c8; font-size: 22px; letter-spacing: .06em; animation: sfpb .45s ease-in-out 3 alternate; }
@keyframes sfpb { from { transform: scale(1); } to { transform: scale(1.08); } }
#sf-over ol { list-style: none; margin: 6px auto 10px; padding: 0; max-width: 300px; font: 700 16px/1.5 ui-monospace, Consolas, monospace; text-align: left; }
#sf-over ol li { display: flex; justify-content: space-between; padding: 0 10px; border-radius: 6px; color: #cfe3f5; }
#sf-over ol li.me { background: rgba(255,215,106,.18); color: #ffd76a; }
#sf-over .newb { font: 800 15px/1.3 ui-sans-serif, system-ui, sans-serif; color: #6ff0c8; margin: 4px 0; }
#sf-over .newb:empty { display: none; }
#sf-back { position: absolute; left: 50%; bottom: 118px; transform: translateX(-50%); display: none; pointer-events: auto; z-index: 31;
  font: 800 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .06em; color: #0b1520; background: #9fe6ff; border: 0;
  border-radius: 999px; padding: 10px 18px; min-height: 44px; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.35); }
#sf-back.on { display: block; }
/* SKIP TO THE NEXT SET (stage 6): the back pill's twin, in its place (never both at once). */
#sf-skip { position: absolute; left: 50%; bottom: 118px; transform: translateX(-50%); display: none; pointer-events: auto; z-index: 31;
  font: 800 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .06em; color: #0b1520; background: #ffd76a; border: 0;
  border-radius: 999px; padding: 10px 18px; min-height: 44px; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.35); }
#sf-skip.on { display: block; }
#sf-skip small { font-size: 15px; font-weight: 600; opacity: .7; margin-left: 6px; }
body.touch #sf-skip { bottom: 150px; } body.touch #sf-skip small { display: none; }
#sf-back small { font-size: 15px; font-weight: 600; opacity: .7; margin-left: 6px; }
body.touch #sf-back { bottom: 150px; } body.touch #sf-back small { display: none; }
#sf-back, #sf-skip { white-space: nowrap; }
/* An upright phone (<= 480 px): the round button is 120-212 px up in the middle and the meter ~300-360
   px - the pills go above both, or a tap on them was a DUCK DIVE (the b53 review, measured). */
@media (orientation: portrait) and (max-width: 480px) { body.touch #sf-back, body.touch #sf-skip { bottom: calc(378px + env(safe-area-inset-bottom, 0px)); } }
#sf-fade { position: absolute; inset: 0; background: #07121c; opacity: 0; pointer-events: none; transition: opacity .25s linear; z-index: 32; }
#sf-fade.on { opacity: 1; }
/* A HUD FOR EACH MOMENT: riding, the score panel steps aside, and after your first ride the prompt too
   (the ride counter and the strip say what matters then). */
body.sf-riding #sf-score { display: none; }
body.sf-riding.sf-veteran:not(.sf-along) #sf-prompt { display: none; }
#sf-intro .touch, #sf-intro .pad { display: none; } body.touch #sf-intro li.touch { display: list-item; } body.touch #sf-intro span.touch { display: inline; }
body.touch #sf-intro .keys { display: none; }
body.pad:not(.touch) #sf-intro li.pad { display: list-item; } body.pad:not(.touch) #sf-intro span.pad { display: inline; } body.pad:not(.touch) #sf-intro .keys { display: none; }
#sf-intro button, #sf-over button { font: 700 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; color: #0b1520;
  background: #ffc21a; border: 0; border-radius: 999px; padding: 10px 18px; min-height: 44px; cursor: pointer; margin: 4px; }
#sf-over button.alt { background: rgba(255,255,255,.14); color: #f4f7fb; }
#sf-intro .touchonly { display: none; } body.touch #sf-intro .touchonly { display: inline-block; }
/* EASY / NORMAL / REAL (stage 3): a three-way switch above PADDLE OUT, the chosen one lit. */
#sf-intro .lvls { display: inline-flex; gap: 0; margin: 2px 0 6px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(159,230,255,.35); }
#sf-intro .lvls button { margin: 0; border-radius: 0; background: rgba(255,255,255,.08); color: #cfe3f5; padding: 9px 16px; min-height: 44px; }
#sf-intro .lvls button.on { background: #9fe6ff; color: #0b1520; }
#sf-intro .lvlnote { font-size: 15px; color: #a9bfd3; margin: 0 0 10px; min-height: 1.3em; }
/* YOUR LOOK (stage 4): the rules card's other face - suit, skin, hair or hood, stance. The card stays
   up (the game stays frozen) while you choose. */
#sf-intro .locker { display: none; }
#sf-intro.lk .rules { display: none; } #sf-intro.lk .locker { display: block; }
#sf-intro .locker h2 { font-size: 14px; letter-spacing: .12em; color: #9fe6ff; margin: 10px 0 4px; }
#sf-intro .locker .row { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
#sf-intro .locker button.sw { width: 44px; height: 44px; min-height: 44px; padding: 0; margin: 0; border-radius: 10px; border: 2px solid rgba(255,255,255,.25); }
#sf-intro .locker button.sw.round { border-radius: 50%; }
#sf-intro .locker button.sw.on { border-color: #ffd76a; box-shadow: 0 0 0 2px #ffd76a; }
#sf-intro .locker button.tx { background: rgba(255,255,255,.1); color: #cfe3f5; padding: 8px 14px; margin: 0; }
#sf-intro .locker button.tx.on { background: #9fe6ff; color: #0b1520; }
#sf-intro .locker .nm { font-size: 14px; color: #a9bfd3; min-height: 1.3em; margin-top: 4px; }
#sf-intro .locker button.tx.locked { opacity: .55; cursor: default; }
#sf-intro .locker button.tx.locked small { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0; opacity: .9; margin: 2px 0 0; }
/* TODAY'S THREE GOALS (stage 6): a line of ticks on the rules card and the summary card. */
.today { font-size: 15px; line-height: 1.5; color: #cfe3f5; margin: 2px 0 10px; }
.today b { color: #ffd76a; letter-spacing: .08em; margin-right: 4px; }
.today span { white-space: nowrap; margin: 0 6px; }
.today span.done { color: #6ff0c8; }
.today i { font-style: normal; color: #a9bfd3; white-space: nowrap; }
.sf-pop.goal { color: #ffd76a; }
#sf-intro button.alt { background: rgba(255,255,255,.14); color: #f4f7fb; }
#sf-intro button small, #sf-over button small { font-size: 15px; font-weight: 600; opacity: .7; margin-left: 6px; }
/* The summary card on a landscape phone (stage 1): PLAY AGAIN sat off the bottom of a 390 px screen
   (tmp-audit/show/over-probe.mjs). Two pairs of stats a row, and the buttons always in view. */
@media (max-height: 500px) {
  #sf-over { padding: 10px 16px; }
  #sf-over h1 { font-size: 22px; margin: 0; }
  #sf-over .big { font-size: 30px; margin: 2px 0; }
  #sf-over dl { grid-template-columns: 1fr auto 1fr auto; gap: 2px 14px; margin: 4px 0 8px; font-size: 15px; }
  #sf-over button { padding: 7px 14px; min-height: 40px; margin: 2px; }
  /* the table shows the best and your run only, small, so ONE MORE HEAT stays on screen (b53 review) */
  #sf-over ol { font-size: 13px; line-height: 1.25; margin: 2px auto 4px; }
  #sf-over ol li:not(:first-child):not(.me) { display: none; }
  #sf-over .pbl { min-height: 0; margin: 0; }
  #sf-over .newb { margin: 2px 0; }
  /* the locker's BOARD row: the earn-text stays in the tooltip, and the row may wrap */
  #sf-intro .locker button.tx.locked small { display: none; }
  #sf-intro .locker .grp.boards { white-space: normal; }
  #sf-intro .locker .grp.boards .row { flex-wrap: wrap; }
  /* The rules card on a phone held sideways: the levels and PADDLE OUT share a row, the note goes
     (the level's name says enough there), so PADDLE OUT is on screen without scrolling. */
  #sf-intro { padding: 10px 16px; }
  #sf-intro h1 { font-size: 22px; margin: 0; }
  #sf-intro .sub { font-size: 15px; margin-bottom: 4px; }
  #sf-intro ul { font-size: 14.5px; line-height: 1.35; margin-bottom: 4px; }
  #sf-intro ul li { margin-bottom: 3px; }
  #sf-intro .lvlnote { display: none; }
  #sf-intro .today, #sf-over .today { display: none; }
  /* the locker on a phone held sideways: each heading beside its row */
  #sf-intro .locker .grp { display: inline-block; white-space: nowrap; margin: 3px 8px; vertical-align: middle; }
  #sf-intro .locker h2 { display: inline-block; margin: 0 6px 0 0; vertical-align: middle; }
  #sf-intro .locker .row { display: inline-flex; flex-wrap: nowrap; vertical-align: middle; }
  #sf-intro .locker .nm { display: none; }
  #sf-intro .locker button.sw { width: 40px; height: 40px; min-height: 40px; }
  #sf-intro .lvls { vertical-align: middle; margin: 2px 6px 2px 0; }
  #sf-intro button { margin: 2px; }
}
body.touch #sf-over button small { display: none; }
/* THE ROUND BUTTON on a touch screen (27 Sep 2026, the iPad report): green and pulsing when a tap
   will stand you up (mode.js popReady), dimmed while a wave lifts you but you are not up to speed. */
body.surfer #tboost.sf-go { background: rgba(40,200,110,.9); border-color: #c9ffdd; animation: sf-go .5s ease-in-out infinite alternate; }
body.surfer #tboost.sf-wait { background: rgba(120,140,160,.45); border-color: #c9d6e2; }
/* THE TIMING RING (stage 5): an arc round the button filling with your speed toward standing up
   (mode.js sets --ring 0..1), solid green on POP UP. A conic gradient cut to a 6 px band by a mask. */
body.surfer #tboost::after { content: ''; position: absolute; inset: -12px; border-radius: 50%; pointer-events: none; opacity: 0;
  background: conic-gradient(#46f0c8 calc(var(--ring, 0) * 360deg), rgba(255,255,255,.18) 0);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px)); transition: opacity .15s; }
body.surfer #tboost.sf-ring::after { opacity: 1; }
body.surfer #tboost.sf-go::after { background: #46f0c8; box-shadow: 0 0 12px #46f0c8; }
@keyframes sf-go { from { box-shadow: 0 0 0 0 rgba(80,255,150,.7); } to { box-shadow: 0 0 0 16px rgba(80,255,150,0); } }
body.touch #sf-prompt { top: 62px; bottom: auto; white-space: normal; text-align: center; width: max-content; font-size: 16px; }
/* 140, not Dolphin Watch's 124: this level's prompts run to two lines on a 375 px phone (66 px
   tall from 62), and at 124 they sat 4 px over both panels - measured 26 Sep. */
/* STAGE 1: the catch meter was on the horizon, where the wave you are watching for comes (y 100-300
   on a phone). It sits low now, in the middle, above the control row. */
body.touch #sf-meter { top: auto; bottom: 104px; left: 50%; transform: translateX(-50%); min-width: 0; width: 150px; padding: 6px 10px; font-size: 14px; }
body.touch #sf-meter .v { font-size: 14px; }
/* 96 px in from the throttle's side, not 8: on a landscape phone the strip runs up past 140 px
   and the panel sat over its top and its CRUISE mark (the Android landscape run, 27 Sep). */
/* ...and the score folds into the top bar (#sf-top .pts): its own panel sat on the horizon too. */
body.touch #sf-score { display: none; }
#sf-top .pts { display: none; font: 800 18px/1 ui-monospace, Consolas, monospace; color: #ffd76a; }
body.touch #sf-top .pts { display: inline; }
body.touch #sf-top .pts[hidden] { display: none; }
body.touch.mirror #sf-score { right: 8px; }
body.touch.mirror #sf-meter { left: 96px; }
/* ...but in PORTRAIT the strip sits low (input.js stripBottomP), and 96 px in put the score panel
   over the catch meter on a 375 px phone (the ride-counter layout probe, 27 Sep). */
@media (orientation: portrait) { body.touch #sf-score { right: 8px; } body.touch.mirror #sf-meter { left: 8px; } }
/* A PHONE HELD UPRIGHT, 480 px or narrower (index.html moves the round button in to 119 px, 120 px up):
   centred at the bottom, the meter sat across the button (x 179-270 of 390, found with the timing ring,
   27 Sep). It sits above the button instead, clear of the steering pad's top (230 px up + its 130 px:
   300 px keeps it off both at 390x844 and 375x667, measured with tmp-audit/stage3-me/ringcheck.mjs). */
@media (orientation: portrait) and (max-width: 480px) {
  body.touch #sf-meter { bottom: calc(300px + env(safe-area-inset-bottom, 0px)); left: auto; right: 100px; transform: none; width: 132px; }
  body.touch.mirror #sf-meter { right: auto; left: 100px; }
}
/* On a touch screen the prompt lives up here; while you ride the round button already says KICK
   OUT, so the ride counter takes the prompt's place, one line shorter so it clears the panels. */
body.touch.sf-riding #sf-prompt { display: none; }
body.touch #sf-ride { top: 62px; }
body.touch #sf-ride .n { display: none; }
body.touch #sf-ride .v { font-size: 28px; }
@media (max-width: 640px) {
  #sf-title { display: none; }
  #sf-prompt { font-size: 16px; white-space: normal; text-align: center; width: max-content; }
  #sf-banner h1 { font-size: 28px; }
}
`;

// What each part of the wave pays, as the ride strip says it (surfer/judge.js zone weights).
const ZONE_RATE = { pocket: 'POCKET ×1.5', face: 'ON THE FACE ×1', lip: 'IN THE LIP ×1', foam: 'WHITEWATER ×0.15', flat: 'FLAT ×0.05' };

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export class SurferHud {
  constructor(mount, cb) {
    this.cb = cb || {};
    if (!document.getElementById('sf-css')) {
      const st = document.createElement('style'); st.id = 'sf-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    const root = document.createElement('div');
    root.id = 'sf-root';
    root.innerHTML = `
      <div id="sf-top" class="sf-panel"><span id="sf-title">PIER SURF</span><span id="sf-waves"></span><span id="sf-clock">0:00</span><span class="pts" id="sf-tpts">0</span></div>
      <div id="sf-score" class="sf-panel"><div class="v" id="sf-pts">0</div><div class="s" id="sf-best">best ride —</div><div class="s" id="sf-duck">duck-dives 0</div></div>
      <div id="sf-ride" class="sf-panel"><div class="t"><span id="sf-rt">RIDE 0.0 s</span><b id="sf-rx">×1</b></div><div class="v" id="sf-rp">+0</div><div class="call" id="sf-rc"></div><div class="bar"><i></i></div><div class="n" id="sf-rn"></div></div>
      <div id="sf-meter" class="sf-panel"><span class="lbl">PADDLE SPEED</span><div class="bar"><i></i><b></b></div><div class="v">POP UP</div><div class="rstrip"><b data-z="lip">LIP</b><b data-z="pocket">POCKET</b><b data-z="face">FACE</b><b data-z="foam">FOAM</b><i></i></div><div class="rrate"></div></div>
      <div id="sf-prompt" class="sf-panel"><span class="ar">&#11014;</span><span class="tx"></span></div>
      <div id="sf-banner" class="sf-panel"><h1></h1><p></p></div>
      <button id="sf-back" type="button">&#8679; BACK TO THE PEAK<small>Q</small></button>
      <button id="sf-skip" type="button">&#9193; SKIP TO THE NEXT SET<small>N</small></button>
      <div id="sf-fade"></div>
      <div id="sf-intro" class="sf-panel">
        <h1>PIER SURF</h1>
        <div class="rules">
        <div class="sub">The sandbank beside Bournemouth Pier, east side. Catch three waves - then heats.</div>
        <ul>
          <li class="keys"><b>Paddle</b> with <b>W</b> or the left mouse button, <b>steer</b> with <b>A</b> / <b>D</b> or the mouse.</li>
          <li class="pad"><b>Paddle</b> with <b>RT</b> or the stick pushed up, <b>steer</b> with the left stick.</li>
          <li class="touch"><b>Paddle</b> with the strip on the right, <b>steer</b> with your left thumb.</li>
          <li><b>One button does it all</b> - <span class="keys">right click or <b>SPACE</b></span><span class="pad">button <b>A</b></span><span class="touch">the big round button</span>: <b>DUCK DIVE</b> under whitewater, <b>POP UP</b> when a wave carries you, <b>KICK OUT</b> to finish.</li>
          <li><b>Ride it</b> along the face, close to where it breaks - that scores most, and turns score more. The prompts show you the rest.</li>
        </ul>
        <div class="today" id="sf-today"></div>
        <div class="lvls" role="group" aria-label="Level"><button type="button" data-a="lvl" data-l="easy">EASY</button><button type="button" data-a="lvl" data-l="normal">NORMAL</button><button type="button" data-a="lvl" data-l="real">REAL</button></div>
        <div class="lvlnote" id="sf-lvlnote"></div>
        <button type="button" data-a="go">PADDLE OUT</button>
        <button type="button" data-a="best" class="alt" hidden>&#9654; WATCH YOUR BEST EVER</button>
        <button type="button" data-a="look" class="alt">YOUR LOOK</button>
        <button type="button" data-a="buzz" class="alt touchonly">VIBRATION: ON</button>
        </div>
        <div class="locker" id="sf-locker"></div>
      </div>
      <div id="sf-over" class="sf-panel">
        <h1>SURF’S UP</h1>
        <div class="big" id="sf-total">0</div>
        <div class="pbl" id="sf-pbl"></div>
        <div class="newb"></div>
        <ol id="sf-top5"></ol>
        <div class="today" id="sf-today2"></div>
        <dl id="sf-stats"></dl>
        <button type="button" data-a="next" hidden>NEXT</button>
        <button type="button" data-a="replay" hidden>&#9654; WATCH YOUR BEST RIDE <small>X</small></button>
        <button type="button" data-a="best" class="alt" hidden>&#9654; YOUR BEST EVER</button>
        <button type="button" data-a="again">PLAY AGAIN <small>Enter</small></button>
        <button type="button" data-a="levels" class="alt">CHOOSE LEVEL</button>
        <button type="button" data-a="exit" class="alt">FREE RIDE</button>
      </div>`;
    mount.appendChild(root);
    this.root = root;
    const $ = (s) => root.querySelector(s);
    this.el = {
      waves: $('#sf-waves'), clock: $('#sf-clock'), best: $('#sf-best'), duck: $('#sf-duck'), pts: $('#sf-pts'),
      total: $('#sf-total'), next: $('#sf-over [data-a=next]'), replay: $('#sf-over [data-a=replay]'), again: $('#sf-over [data-a=again]'),
      pbl: $('#sf-pbl'), top5: $('#sf-top5'), back: $('#sf-back'), skip: $('#sf-skip'), fade: $('#sf-fade'),
      meter: $('#sf-meter'), bar: $('#sf-meter .bar i'), mark: $('#sf-meter .bar b'), mv: $('#sf-meter .v'),
      rdot: $('#sf-meter .rstrip i'), rbands: root.querySelectorAll('#sf-meter .rstrip b'), rrate: $('#sf-meter .rrate'),
      ride: $('#sf-ride'), rc: $('#sf-rc'), rt: $('#sf-rt'), rx: $('#sf-rx'), rp: $('#sf-rp'), rbar: $('#sf-ride .bar i'), rn: $('#sf-rn'),
      prompt: $('#sf-prompt'), ptx: $('#sf-prompt .tx'), par: $('#sf-prompt .ar'), tpts: $('#sf-tpts'), banner: $('#sf-banner'), bh: $('#sf-banner h1'), bp: $('#sf-banner p'),
      intro: $('#sf-intro'), over: $('#sf-over'), stats: $('#sf-stats'),
    };
    this.el.back.addEventListener('click', (e) => { e.stopPropagation(); if (this.cb.onBack) this.cb.onBack(); });
    this.el.skip.addEventListener('click', (e) => { e.stopPropagation(); if (this.cb.onSkip) this.cb.onSkip(); });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      e.stopPropagation();
      const a = b.dataset.a;
      if (a === 'go') this.hideIntro();
      else if (a === 'next') goNext(b);
      else if (a === 'again' && this.cb.onAgain) this.cb.onAgain();
      else if (a === 'replay' && this.cb.onReplay) this.cb.onReplay();
      else if (a === 'best' && this.cb.onBestEver) this.cb.onBestEver();
      else if (a === 'lvl' && this.cb.onLevel) this.cb.onLevel(b.dataset.l);
      else if (a === 'look') this.el.intro.classList.add('lk');
      else if (a === 'lkdone') this.el.intro.classList.remove('lk');
      else if (a === 'lk' && this.cb.onLook) this.cb.onLook(b.dataset.k, b.dataset.v);
      // Vibration on or off (stage 3; haptics.js keeps it, default on).
      else if (a === 'buzz' && this.cb.haptics) { const on = this.cb.haptics.set(!this.cb.haptics.on()); b.textContent = `VIBRATION: ${on ? 'ON' : 'OFF'}`; }
      // >>> LEVELBACK  the same handle every other level's card uses.
      else if (a === 'levels') { const m = document.querySelector('#btn-mode'); if (m) m.click(); }
      // <<< LEVELBACK
      else if (a === 'exit' && this.cb.onExit) this.cb.onExit();
    });
    this.overOn = false;
    this._bannerT = 0;
    this._last = {};
  }

  showIntro() {
    this.el.intro.classList.add('on');
    // the vibration button says what is SAVED (it read ON after a visit that turned it off - b53 review)
    const bz = this.el.intro.querySelector('[data-a=buzz]');
    if (bz && this.cb.haptics) bz.textContent = `VIBRATION: ${this.cb.haptics.on() ? 'ON' : 'OFF'}`;
    this._card();
  }
  hideIntro() { this.el.intro.classList.remove('on'); this.el.intro.classList.remove('lk'); this._card(); }
  hideOver() { this.el.over.classList.remove('on'); this.overOn = false; this._card(); }
  get introOn() { return this.el.intro.classList.contains('on'); }
  // body.sfcard while either card is up. Re-read every frame in update() too, because the rules
  // card can be taken down from main.js (any key) without passing through here.
  _card() {
    const on = this.el.intro.classList.contains('on') || this.el.over.classList.contains('on');
    if (document.body.classList.contains('sfcard') !== on) document.body.classList.toggle('sfcard', on);
  }

  showOver(run) {
    // >>> PROGRESS  this level is only ever finished by winning it, so that is what is recorded.
    // (stage 3) with the run's numbers, so the analytics can say whether people play again.
    prog.complete('surfer', true, run.recExtra);
    setNext(this.el.next, 'surfer', true);
    // <<< PROGRESS
    const rides = run.rides.filter((r) => r.ok);
    const top = rides.reduce((m, r) => Math.max(m, r.top), 0);
    const moves = rides.reduce((m, r) => m + (r.carves || 0), 0);
    const heatRows = run.kind === 'heat' ? [
      // Every wave's score, the two that count in bold-free brackets: 4.50 [7.30] 2.10 [5.60].
      ['Wave scores', run.waveScores.length ? (() => { const keep = run.waveScores.slice().sort((a, b) => b - a).slice(0, 2); const k = keep.slice();
        return run.waveScores.map((w) => { const i = k.indexOf(w); if (i >= 0) { k.splice(i, 1); return `[${w.toFixed(2)}]`; } return w.toFixed(2); }).join('  '); })() : 'none'],
    ] : [];
    const rows = [
      ...heatRows,
      ...(run.level ? [['Level', run.level]] : []),
      ['Waves ridden', `${run.waves}`],
      ['Best ride', `${run.bestPts || 0} pts`],
      [rides.some((r) => r.moves) ? 'Moves' : 'Carves', `${moves}`],
      ['Longest ride', `${run.best.toFixed(1)} s`],
      ['Top speed', `${(top * 3.6).toFixed(0)} km/h`],
      ['Duck-dives (clean)', `${run.ducks} (${run.ducksClean})`],
      ['Time', fmt(run.endT || run.t)],
    ];
    this.el.replay.hidden = !run.replayable;   // surfer/replay.js: the run's best ride, kept
    // ...and the best ever at this surf size (stage 6), when this run did not just set it.
    { const be = this.el.over.querySelector('[data-a=best]'); if (be) be.hidden = !run.hasBestEver || run.bestEverNew; }
    // THE RUN, KEPT (stage 3, ui/scores.js): a new personal best says so; the table shows your top
    // five with this run in it. No store (a private window) = no line and no table, never an error.
    const rec = run.rec, heat = run.kind === 'heat';
    const fmtS = (v) => (heat ? (v / 100).toFixed(2) : String(v));
    this.el.over.querySelector('h1').textContent = heat ? (run.medal ? `HEAT OVER  ·  ${run.medal}` : 'HEAT OVER') : 'SURF’S UP';
    this.el.again.innerHTML = `${run.kind === 'lesson' ? 'START A HEAT' : 'ONE MORE HEAT'} <small>Enter</small>`;
    const pbl = this.el.pbl;
    pbl.className = 'pbl' + (rec && rec.isPB ? ' new' : '');
    pbl.textContent = !rec ? '' : rec.isPB ? (rec.prev !== null ? `NEW PERSONAL BEST!  +${fmtS(run.score - rec.prev)}` : 'NEW PERSONAL BEST!')
      : rec.prev === null ? 'No waves scored - catch one to set a best'
      : run.score === rec.prev ? 'EQUALS YOUR PERSONAL BEST' : `Personal best ${fmtS(rec.prev)}  ·  ${fmtS(rec.prev - run.score)} to beat it`;
    // A board unlocked in this run (its banner may have been under the wave's): said here as well.
    const nb = this.el.over.querySelector('.newb');
    if (nb) nb.textContent = run.newBoards && run.newBoards.length ? `NEW BOARD: ${run.newBoards.join(', ')} - pick it under YOUR LOOK` : '';
    this.el.top5.innerHTML = rec && rec.top ? rec.top.slice(0, 5).map((e, i) => `<li class="${i + 1 === rec.rank ? 'me' : ''}"><span>${i + 1}.  ${esc(e.d || '')}</span><span>${fmtS(e.s)}</span></li>`).join('') : '';
    this.el.stats.innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    // The total counts up over 1.2 s - the moment of the card.
    const total = run.score, el = this.el.total, t0 = performance.now();
    const tick = () => { const k = Math.min(1, (performance.now() - t0) / 1200); el.textContent = fmtS(Math.round(total * (1 - (1 - k) ** 3))); if (k < 1 && this.overOn) requestAnimationFrame(tick); };
    el.textContent = '0';
    this.el.over.classList.add('on'); this.overOn = true; this._card();
    requestAnimationFrame(tick);
    // ...and lands on the total even where frames are held back (a background tab, a slow phone).
    setTimeout(() => { if (this.overOn) el.textContent = fmtS(total); }, 1300);
  }

  // YOUR LOOK (mode.js, stage 4): the locker's swatches from the renderer's own palettes (P), the
  // chosen ones ringed. Rebuilt on each choice - it is a few dozen buttons, on a card, not per frame.
  setLocker(P, L, BD) {
    const e = this.root.querySelector('#sf-locker');
    if (!e || !P) return;
    const sw = (k, v, css, title, round) => `<button type="button" class="sw${round ? ' round' : ''}${String(L[k]) === String(v) ? ' on' : ''}" data-a="lk" data-k="${k}" data-v="${v}" title="${esc(title)}" aria-label="${esc(title)}" style="background:${css}"></button>`;
    const tx = (k, v, text) => `<button type="button" class="tx${String(L[k]) === String(v) ? ' on' : ''}" data-a="lk" data-k="${k}" data-v="${v}">${esc(text)}</button>`;
    const suitName = P.suits[L.suit] ? P.suits[L.suit].name : '';
    // (each heading and its row in one group, so a narrow card wraps whole groups)
    const grp = (h, inner, after) => `<div class="grp${h === 'BOARD' ? ' boards' : ''}"><h2>${h}</h2><div class="row">${inner}</div>${after || ''}</div>`;
    e.innerHTML = grp('WETSUIT', P.suits.map((s, i) => sw('suit', i, `linear-gradient(135deg, ${s.c[0]} 0 50%, ${s.c[1]} 50% 100%)`, s.name)).join(''), `<div class="nm">${esc(suitName)}</div>`)
      + grp('SKIN', P.skin.map((c, i) => sw('skin', i, c, `skin tone ${i + 1}`, true)).join(''))
      + grp('HAIR', P.hair.map((c, i) => sw('hair', i, c, `hair ${i + 1}`, true)).join(''))
      + grp('HOOD', tx('hood', 'auto', 'AS THE SUIT') + tx('hood', 'on', 'HOOD') + tx('hood', 'off', 'NO HOOD'))
      + grp('STANCE', tx('goofy', 'false', 'REGULAR') + tx('goofy', 'true', 'GOOFY'))
      // BOARDS (stage 5): yours lit; a locked one greyed, saying what earns it.
      + (BD && P.boards ? grp('BOARD', P.boards.map((b) => {
        const got = BD.got.includes(b.id);
        return `<button type="button" class="tx${BD.pick === b.id ? ' on' : ''}${got ? '' : ' locked'}" data-a="lk" data-k="board" data-v="${b.id}"${got ? '' : ` title="${esc(b.need)}" aria-disabled="true"`}>${esc(b.name)}${got ? '' : ` <small>${esc(b.need)}</small>`}</button>`;
      }).join('')) : '')
      + '<div style="margin-top:12px"><button type="button" data-a="lkdone">DONE</button></div>';
  }

  // YOUR BEST EVER (mode.js bestEver): the rules card's button, shown when one is kept for this surf.
  setBestEver(b) {
    const e = this.root.querySelector('#sf-intro [data-a=best]');
    if (e) { e.hidden = !b; if (b) e.innerHTML = `&#9654; WATCH YOUR BEST EVER <small>+${b.score}</small>`; }
  }

  // TODAY'S GOALS (mode.js openDay/goal, ui/scores.js): the three, ticked when done, and the streak.
  setDaily(st, goals, streak) {
    // (spaces between the chips: each is nowrap, so the spaces are where a narrow card wraps)
    const html = !st || !goals ? '' : `<b>TODAY</b> ${goals.map((g) => `<span class="${st.done.includes(g.id) ? 'done' : ''}">${st.done.includes(g.id) ? '\u2713' : '\u25cb'} ${esc(g.text)}</span>`).join(' ')}${streak > 0 ? ` <i>\u00b7 ${streak}-day streak</i>` : ''}`;
    for (const id of ['#sf-today', '#sf-today2']) { const e = this.root.querySelector(id); if (e && e.innerHTML !== html) e.innerHTML = html; }
  }

  // The level switch on the rules card (mode.js SURF_LEVELS): the chosen one lit, and what it means.
  setLevel(id, levels) {
    for (const b of this.root.querySelectorAll('#sf-intro .lvls button')) b.classList.toggle('on', b.dataset.l === id);
    const n = this.root.querySelector('#sf-lvlnote');
    if (n && levels && levels[id]) n.textContent = levels[id].note;
  }

  // A short fade to the sea's colour and back (BACK TO THE PEAK, stage 3).
  fade(ms) {
    const f = this.el.fade;
    f.classList.add('on');
    setTimeout(() => f.classList.remove('on'), Math.max(200, (ms || 500) - 250));
  }

  // sub: a line, or (stage 3) an array - each part a chip. queued: wait for the banner showing to finish
  // (an unlock or the goals-done call, which land in the same tick as the wave's own banner - b53 review).
  banner(title, sub, kind, ms, queued) {
    if (queued && this._bannerT && performance.now() < this._bannerT) { (this._bq || (this._bq = [])).push([title, sub, kind, ms]); return; }
    const el = this.el;
    el.bh.textContent = title;
    if (Array.isArray(sub)) el.bp.innerHTML = sub.filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('');
    else el.bp.textContent = sub || '';
    el.banner.className = 'sf-panel on ' + (kind || '');
    this._bannerT = performance.now() + (ms || 2500);
  }

  // Two can land in the same instant (UP AND RIDING! and the bottom turn's CARVE!), so a new one
  // stacks under whatever is still showing instead of printing on top of it.
  pop(text, kind) {
    // The multiplier's call while the ride counter shows: in the counter (see #sf-ride .call).
    if (kind === 'mult' && this.el.ride.classList.contains('on') && this.el.ride.offsetParent && !this.section) {
      const c = this.el.rc;
      c.classList.remove('on'); void c.offsetWidth;   // restart the flash
      c.textContent = text; c.classList.add('on');
      clearTimeout(this._callT); this._callT = setTimeout(() => c.classList.remove('on'), 1650);
      return;
    }
    const d = document.createElement('div');
    // Riding with you on screen, a callout is pinned over your head.
    const at = !!this.anchor && kind !== 'mult';
    d.className = 'sf-pop' + (kind ? ' ' + kind : '') + (at ? ' at' : '');
    d.textContent = text;
    if (at) d._k = this.root.querySelectorAll('.sf-pop.at').length;   // a second one stacks on the first
    else {
      const live = this.root.querySelectorAll('.sf-pop:not(.at)').length;
      if (live) d.style.marginTop = `${Math.min(live, 3) * 36}px`;
    }
    this.root.appendChild(d);
    if (at) { this._rb = this._rideBox(); this._pin(d); }   // update() keeps it on you as you move
    setTimeout(() => d.remove(), 1700);
  }
  // The ride counter's box in the HUD's own pixels (null when it is not showing).
  _rideBox() {
    const e = this.el.ride;
    if (!e.classList.contains('on') || !e.offsetParent) return null;
    const r = e.getBoundingClientRect(), o = this.root.getBoundingClientRect();
    return { l: r.left - o.left - 6, r: r.right - o.left + 6, b: r.bottom - o.top + 6 };
  }
  _pin(d) {
    const a = this.anchor;
    if (!a) return;   // the rider went off screen: it stays where it last was
    const k = Math.min(d._k, 3), w = d.offsetWidth || 180, h = d.offsetHeight || 34, W = this.root.clientWidth;
    let x = a.x, bot = a.y - k * (h + 6);
    const R = this._rb;
    if (R && bot - h < R.b && x + w / 2 > R.l && x - w / 2 < R.r) {
      // Over your head is the ride counter: beside your head instead, on the side with more room.
      const side = a.x < W / 2 ? 1 : -1;
      x = a.x + side * (w / 2 + 40); bot = a.y + h + 12 + k * (h + 6);
    }
    x = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, x));
    // The pill's box: translate(-50%, -100%) puts its bottom edge at `top`.
    d.style.left = `${x.toFixed(0)}px`; d.style.top = `${bot.toFixed(0)}px`;
  }

  update(run, B, msg, kind) {
    const el = this.el, L = this._last;
    if (this.anchor) { const ps = this.root.querySelectorAll('.sf-pop.at'); if (ps.length) { this._rb = this._rideBox(); for (const d of ps) this._pin(d); } }
    if (this._bannerT && performance.now() > this._bannerT) {
      el.banner.classList.remove('on'); this._bannerT = 0;
      const nx = this._bq && this._bq.shift();
      if (nx) this.banner(nx[0], nx[1], nx[2], nx[3]);
    }
    // A HEAT (stage 3): the best two waves so far and the time left, amber for the last 30 s.
    const heat = run.kind === 'heat';
    let wv;
    if (heat) {
      // The total big; the two waves that make it small beside it (not on a phone - the bar is narrow).
      const b2 = run.waveScores.slice().sort((a, b) => b - a).slice(0, 2);
      wv = `HEAT ${run.heat.toFixed(2)}${b2.length > 1 ? `<small>${b2.map((x) => x.toFixed(2)).join(' + ')}</small>` : ''}`;
    } else {
      const goal = run.goal || 3;
      const dots = Array.from({ length: goal }, (_, i) => `<span class="${i < run.waves ? 'on' : ''}"></span>`).join('');
      wv = `${run.waves} / ${goal}${dots}`;
    }
    if (L.wv !== wv) { el.waves.innerHTML = wv; L.wv = wv; }
    const left = heat ? Math.max(0, (this.heatSec || 240) - run.t) : 0;
    const clk = heat ? fmt(Math.ceil(left)) : fmt(run.t);
    if (L.clk !== clk) { el.clock.textContent = clk; el.clock.classList.toggle('late', heat && left <= 30); L.clk = clk; }
    this._card();
    // THE SCORE COUNTS UP (stage 3): a wave's points added over 0.8 s, not in one jump.
    let pts;
    if (heat) pts = run.heat.toFixed(2);
    else {
      const now = performance.now(), C = this._cu || (this._cu = { from: run.score, to: run.score, t0: 0 });
      if (run.score !== C.to) { C.from = run.score > C.to ? Math.round(this._cuShown !== undefined ? this._cuShown : C.to) : run.score; C.to = run.score; C.t0 = now; }
      const k = Math.min(1, (now - C.t0) / 800);
      this._cuShown = C.from + (C.to - C.from) * (1 - (1 - k) ** 3);
      pts = String(Math.round(this._cuShown));
    }
    if (L.pts !== pts) { el.pts.textContent = pts; el.tpts.textContent = pts; L.pts = pts; }
    if (L.heat !== heat) { el.tpts.hidden = heat; L.heat = heat; }   // a heat's bar already says its total
    // In points, as the summary card says it (the HUD said 14.9 s where the card said 1022 pts).
    // In a heat, the best wave's score out of 10.
    const best = heat ? (run.waveScores.length ? `best wave ${Math.max(...run.waveScores).toFixed(2)}` : 'best wave —')
      : run.bestPts > 0 ? `best ride ${run.bestPts} pts` : 'best ride —';
    if (L.best !== best) { el.best.textContent = best; L.best = best; }
    // The personal best to beat (stage 3) in place of the duck-dive count (the summary card has that).
    const dk = this.pb ? `personal best ${this.pb}` : 'no personal best yet';
    if (L.dk !== dk) { el.duck.textContent = dk; L.dk = dk; }
    const back = !!this.back;
    if (L.back !== back) { el.back.classList.toggle('on', back); L.back = back; }
    const skip = !!this.skip;
    if (L.skip !== skip) { el.skip.classList.toggle('on', skip); L.skip = skip; }
    // THE RIDE COUNTER (surfboard.js RIDE_PTS): the points this ride has made so far, the seconds up,
    // the multiplier and how far to the next one. Gone the moment the ride ends - the banner then
    // carries the final numbers.
    const R = B.state === 2 ? B.ride : null;
    if (L.rideOn !== !!R) {
      L.rideOn = !!R;
      el.ride.classList.toggle('on', L.rideOn);
      document.body.classList.toggle('sf-riding', L.rideOn);
    }
    if (R) {
      // The judge's own numbers (stage 2) when the board has them: the running total, the multiplier,
      // and the QUALITY seconds (on the face or in the pocket) that climb it - not the wall clock.
      const secs = Math.max(0, B.time - R.t0), st = RIDE_PTS.steps;
      const q = R.q !== undefined ? R.q : secs, m = R.mult !== undefined ? R.mult : rideMult(secs);
      const rp = `+${Math.round(R.pts !== undefined ? R.pts : R.timePts + R.carvePts)}`;
      if (L.rp !== rp) { el.rp.textContent = rp; L.rp = rp; }
      const rt = `RIDE ${secs.toFixed(1)} s`;
      if (L.rt !== rt) { el.rt.textContent = rt; L.rt = rt; }
      if (L.rm !== m) { el.rx.textContent = `×${m}`; el.ride.className = `sf-panel on m${m}`; L.rm = m; }
      const next = st[m - 1], prev = m > 1 ? st[m - 2] : 0;
      el.rbar.style.width = `${(next ? Math.max(0, Math.min(100, (100 * (q - prev)) / (next - prev))) : 100).toFixed(1)}%`;
      const rn = next ? `×${m + 1} at ${next} s on the face` : 'top multiplier';
      if (L.rn !== rn) { el.rn.textContent = rn; L.rn = rn; }
    }
    // The arrow along the wave (mode.js, the first seconds of a ride) - on a phone it borrows the
    // ride counter's place.
    const along = !!R && ((this.arrow !== null && this.arrow !== undefined) || !!this.section);   // (stage 6: a SECTION call too)
    if (L.along !== along) { document.body.classList.toggle('sf-along', along); L.along = along; }
    // PADDLE SPEED (stage 1). It used to be "you vs the wave" in m/s - a wave speed paddling can never
    // reach, with the real goal (the pop-up speed) marked at a place that moved with every wave. Now
    // the bar is full at popU / 0.75, so POP UP is always at 75%; it goes green and pulses when a press
    // would stand you up (the board's own verdict), amber while it would be too steep.
    const u = Math.max(0, B.u);
    el.bar.style.width = `${Math.min(100, (u / (B.spec.popU / 0.75)) * 100).toFixed(1)}%`;
    let mc = 'sf-panel' + (u >= B.spec.popU ? ' ok' : '') + (B.popV === 'ok' ? ' go' : B.popV === 'pearl' ? ' steep' : '');
    if (R) {
      // ON THE WAVE: the judge's zone (B.wave.zone, stage 2) or, before it, a guess from the water.
      const w = B.wave, z = w.zone || (w.brk >= 0.5 ? 'foam' : w.chi > -0.25 && w.chi < 0 ? 'lip' : 'face');
      mc = 'sf-panel riding' + (z === 'pocket' ? ' pocket' : '');
      // The band lit is the zone; 'flat' (no live face under you) shows as the LIP near the crest and the
      // FACE below it - never FOAM, which it is not (the b53 review: an OFF THE LIP lit FOAM).
      const zb = z === 'flat' ? (w.chi > -0.25 && w.chi < 0.3 ? 'lip' : 'face') : z;
      if (L.rz !== z || L.rzb !== zb) {
        el.rbands.forEach((b) => b.classList.toggle('on', b.dataset.z === zb));
        el.rrate.textContent = ZONE_RATE[z] || '';
        L.rz = z; L.rzb = zb;
      }
      // The dot sits IN the lit band (its centre), nudged within it by where you are on the face.
      const cx = { lip: 12.5, pocket: 37.5, face: 62.5, foam: 87.5 }[zb] || 62.5;
      const x = cx + (zb === 'pocket' || zb === 'face' ? Math.max(-9, Math.min(9, (-w.chi - 1.0) * 8)) : 0);
      const xs = x.toFixed(0) + '%';
      if (L.rx2 !== xs) { el.rdot.style.left = xs; L.rx2 = xs; }
    }
    if (L.mc !== mc) { el.meter.className = mc; L.mc = mc; }
    if (L.msg !== msg) { el.ptx.textContent = msg; L.msg = msg; }
    // The way back to the peak (mode.js advise sets it): up is straight ahead, turning with you.
    const ar = this.arrow;
    const cls = 'sf-panel ' + (kind || '') + (ar !== null && ar !== undefined ? ' arrow' : '');
    if (L.cls !== cls) { el.prompt.className = cls; L.cls = cls; }
    if (ar !== null && ar !== undefined) {
      const deg = Math.round(ar * 180 / Math.PI / 5) * 5;
      if (L.ar !== deg) { el.par.style.transform = `rotate(${deg}deg)`; L.ar = deg; }
    }
  }
}

function fmt(t) { const s = Math.max(0, Math.floor(t)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
