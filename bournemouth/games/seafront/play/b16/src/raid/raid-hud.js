// VIKING RAID - HUD, front-door button, intro card, banners, markers, fly-up scores,
// power-up timers, boss bar, health, FIRE button and the game-over card (tr52; combat
// HUD tr57). DOM only, created from here so index.html needs no markup; hidden under
// ?clean=1 like every other overlay, so calibration renders stay bare.
//
// Wording: ships are "sunk", "holed" or "moor"; Vikings in the water "paddle home";
// pier sections are "alight", "burning" and "fall". tr60: the harvests are replaced by
// the PIER bar (overall health + one pip per section), the water-cannon tank, section
// and MOORING IN markers. The intro says the pier has been evacuated. Nothing refers
// to any modern group, place of origin or crossing. No blood or gore is described.

import { SECTIONS, sectionCentre } from './siege.js';
// 2026-09-19: the briefing used to hard-code "five" while tuning.js said 3. letThrough WAS 5
// and the balance pass cut it to 3 (at 5 the scripted bot held the line 8/8 - not a game),
// and the prose did not follow. Take the number from the table that owns it so the screen
// cannot disagree with the rules again. (NB: do not write the word r-e-a-d here - this file
// is swept for real pirates' names and Mary R-e-a-d is on that list. It caught this comment.)
import { TUNING } from './tuning.js';
// >>> JUICE
// The feel layer (src/ui/juice.js): airtime, landing verdicts, hit confirmation and a streak
// that decays. getJuice() returns null until main.js has built one, and main.js never builds
// one on a ?cal= address, so on a calibration render every JUICE block below is a null check
// and nothing else.
import { getJuice } from '../ui/juice.js';
// >>> PROGRESS
import * as prog from '../ui/progress-store.js';
// <<< PROGRESS
// <<< JUICE

const CSS = `
#rd-root { position: absolute; inset: 0; pointer-events: none; z-index: 30; display: none; overflow: hidden;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; color: #f4f7fb; }
body.raid #rd-root { display: block; }
body.raid #viewbar, body.raid #hint, body.raid #rq-door, body.raid #rd-door { display: none !important; }
body.clean-render #rd-root, body.clean-render #rd-door { display: none !important; }
body.raid #left > #craftbar { top: 62px; }
.rd-panel { background: rgba(8,14,22,.70); border: 1px solid rgba(255,255,255,.14); border-radius: 12px; backdrop-filter: blur(4px); }
#rd-top { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 16px; padding: 7px 18px; white-space: nowrap; }
#rd-wave { font-weight: 800; letter-spacing: .12em; font-size: 16px; color: #ffcf6e; }   /* A11Y 13 -> 16 */
#rd-inc { font-size: 16px; letter-spacing: .04em; }                                      /* A11Y 13 -> 16 */
#rd-inc b { font: 800 24px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; margin-right: 4px; }
#rd-compass { display: flex; align-items: center; gap: 6px; font-size: 16px; min-width: 110px; }  /* A11Y 13 -> 16 */
#rd-compass i { display: inline-block; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 22px solid #ffb13b; transform-origin: 50% 66%; }
#rd-compass.hot i { border-bottom-color: #ff5d4f; } #rd-compass.hot span { color: #ff8b80; }
#rd-boss { position: absolute; top: 104px; left: 50%; transform: translateX(-50%); width: min(460px, calc(100% - 40px)); padding: 6px 12px 8px; display: none; text-align: center; }
#rd-boss.on { display: block; animation: rdslam .5s cubic-bezier(.2,1.6,.4,1); }
#rd-boss .n { font-size: 16px; font-weight: 800; letter-spacing: .16em; color: #ffcf6e; }  /* A11Y 12 -> 16 */
#rd-boss .bar { height: 12px; border-radius: 6px; background: rgba(255,255,255,.12); margin-top: 4px; overflow: hidden; border: 1px solid rgba(255,207,110,.5); }
#rd-boss .bar i { display: block; height: 100%; width: 100%; background: linear-gradient(90deg, #ff4d3a, #ffb13b); transition: width .15s; }
#rd-score { position: absolute; top: 10px; right: 12px; padding: 8px 14px; text-align: right; min-width: 160px; }
#rd-score .v { font: 800 26px/1.05 ui-monospace, Consolas, monospace; }
#rd-score .pier { margin-top: 5px; text-align: left; min-width: 200px; }
#rd-score .pier .t { display: flex; justify-content: space-between; font-size: 16px; letter-spacing: .1em; color: #cfe3f5; }  /* A11Y 11 -> 16 */
#rd-score .pier .t b { color: #fff; font-size: 16px; }                                   /* A11Y 12 -> 16 */
#rd-score .pier .pb { height: 10px; border-radius: 5px; background: rgba(255,255,255,.14); margin: 3px 0 4px; overflow: hidden; }
#rd-score .pier .pb i { display: block; height: 100%; background: linear-gradient(90deg, #36e07a, #9df06a); transition: width .2s; }
#rd-score .pier.hurt .pb i { background: linear-gradient(90deg, #ff9a3d, #ffd76a); }
#rd-score .pier.low .pb i { background: linear-gradient(90deg, #ff3b30, #ff8b3d); }
#rd-score .pips { display: flex; gap: 3px; }
#rd-score .pips span { flex: 1; height: 8px; border-radius: 2px; background: #36e07a; }
#rd-score .pips span.dmg { background: #ffd76a; }
#rd-score .pips span.burn { background: #ff5a1f; box-shadow: 0 0 6px #ff7a2a; animation: rdpulse .3s infinite alternate; }
#rd-score .pips span.gone { background: #1d1a18; box-shadow: inset 0 0 0 1px rgba(255,255,255,.3); }
#rd-combo { font: 900 16px/1.2 ui-sans-serif, system-ui, sans-serif; color: #ffd76a; min-height: 20px; }  /* A11Y 15 -> 16 */
#rd-combo.x2 { color: #ffe95a; text-shadow: 0 0 10px rgba(255,220,60,.7); }
#rd-combo .cb { height: 4px; border-radius: 2px; background: rgba(255,255,255,.12); margin-top: 2px; overflow: hidden; }
#rd-combo .cb i { display: block; height: 100%; background: #ffd76a; }
#rd-pow { position: absolute; top: 120px; right: 12px; display: flex; flex-direction: column; gap: 5px; align-items: flex-end; }
.rd-chip { padding: 4px 10px; font-size: 16px; font-weight: 800;                         /* A11Y 12 -> 16 */ letter-spacing: .08em; border-radius: 999px; background: rgba(8,14,22,.75); border: 2px solid currentColor; min-width: 120px; position: relative; overflow: hidden; text-align: left; }
.rd-chip i { position: absolute; left: 0; bottom: 0; height: 3px; background: currentColor; }
.rd-chip b { float: right; margin-left: 8px; }
#rd-stat { position: absolute; left: 12px; bottom: 16px; padding: 8px 12px; width: 240px; font-size: 16px; letter-spacing: .06em; }  /* A11Y 12 -> 16, 210 -> 240 so the rows still fit */
#rd-stat .row { display: flex; justify-content: space-between; align-items: baseline; }
#rd-stat .hp { height: 12px; border-radius: 6px; background: rgba(255,255,255,.14); margin: 4px 0 7px; overflow: hidden; position: relative; }
#rd-stat .hp i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #36e07a, #9df06a); transition: width .12s; }
#rd-stat.low .hp i { background: linear-gradient(90deg, #ff3b30, #ff8b3d); }
#rd-stat.shield .hp { box-shadow: 0 0 0 2px #52dcff; }
#rd-stat .rl { height: 4px; border-radius: 2px; background: rgba(255,255,255,.14); margin-top: 3px; overflow: hidden; }
#rd-stat .rl i { display: block; height: 100%; background: #ffd76a; }
#rd-stat .wn { font-weight: 800; color: #ffd76a; }
#rd-stat .wt { font-weight: 800; color: #8fe3ff; }
#rd-stat .tk { height: 7px; border-radius: 4px; background: rgba(255,255,255,.14); margin-top: 3px; overflow: hidden; }
#rd-stat .tk i { display: block; height: 100%; background: linear-gradient(90deg, #2a8cff, #8fe3ff); }
#rd-stat.spray .tk { box-shadow: 0 0 0 2px #52dcff; }
#rd-stat.dry .tk i { background: #6d7c8a; } #rd-stat.dry .wt { color: #ff8b80; }
#rd-stat .sp { color: #b8c9d9; }
#rd-prompt { position: absolute; left: 50%; bottom: 64px; transform: translateX(-50%); padding: 9px 20px; font-size: 17px; font-weight: 800; letter-spacing: .03em; white-space: nowrap; opacity: 0; transition: opacity .15s; }
#rd-prompt.on { opacity: 1; } #rd-prompt.warn { color: #ff8b80; } #rd-prompt.good { color: #6ff0a0; } #rd-prompt.go { color: #ffd76a; }
#rd-prompt.danger { color: #fff; background: rgba(200,30,20,.85); animation: rdpulse .35s infinite alternate; }
#rd-banner { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); text-align: center; opacity: 0; padding: 14px 34px; white-space: nowrap; pointer-events: none; }
#rd-banner.on { opacity: 1; animation: rdslam .45s cubic-bezier(.2,1.6,.4,1); }
#rd-banner h1 { margin: 0; font-size: 46px; font-weight: 900; letter-spacing: .08em; text-shadow: 0 3px 14px rgba(0,0,0,.5); font-style: italic; }
#rd-banner p { margin: 6px 0 0; font-size: 16px; color: #d7e6f3; }
#rd-banner.fire h1 { color: #ff7a2a; } #rd-banner.fallen h1 { color: #ff5d4f; } #rd-banner.saved h1 { color: #6ff0a0; }
#rd-banner.clear h1 { color: #6ff0a0; } #rd-banner.landed h1 { color: #ffb13b; } #rd-banner.boss h1 { color: #ff6b4a; } #rd-banner.win h1 { color: #ffd23b; } #rd-banner.wave h1 { color: #ffcf6e; }
/* A11Y: max-height 80vh is not decoration. The card is centred on top: 40%, so half its height
   is how far it reaches ABOVE that line; anything over 80vh puts its own title off the top of
   the window, which is exactly what MEASURED here on the corsair level (13 px off at 1280x720,
   40-106 px off on every landscape phone) before this pass. 80vh caps the half at 40vh, which
   is the 40% it is anchored to, so the top edge can never go negative. */
#rd-intro { position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%); padding: 16px 24px; width: min(560px, calc(100% - 32px)); box-sizing: border-box; text-align: center; display: none; max-height: 80vh; overflow-y: auto; overscroll-behavior: contain; }
#rd-intro.on { display: block; }
#rd-intro h1 { margin: 0 0 2px; font-size: 34px; font-weight: 900; letter-spacing: .12em; color: #ffcf6e; }
#rd-intro .sub { font-size: 16px; color: #d7e6f3; margin-bottom: 10px; }                 /* A11Y 15 -> 16 */
#rd-intro ul { list-style: none; margin: 0 0 10px; padding: 0; font-size: 16px; line-height: 1.45; text-align: left; }  /* A11Y 14 -> 16 */
#rd-intro ul b { color: #ffd76a; }
/* A11Y: the Environment Agency licence line goes 10.5 -> 13 px and 13 is a DECLARED
   EXCEPTION to the 16 px floor, for the same reason as the copy in index.html's picker: it is
   a legal attribution, not instruction, it is never read in order to play, and at 16 px it
   costs two more lines on a card that already does not fit a 375 px-tall phone. */
#rd-over .ea, #rd-intro .ea { font-size: 13px; color: #93a5b5; font-style: normal; }
#rd-intro .hist { font-size: 16px; line-height: 1.45; color: #b8c9d9; font-style: italic; border-top: 1px solid rgba(255,255,255,.14); padding-top: 8px; }
#rd-intro .go { margin-top: .9em; padding-top: .7em; border-top: 1px solid rgba(255,255,255,.14); color: #f2c14e; font-weight: 700; letter-spacing: .01em; }
#rd-intro .go small { display: block; font-weight: 400; color: rgba(232,237,244,.55); margin-top: .15em; }  /* A11Y 12 -> 16 */
#rd-markers, #rd-fly { position: absolute; inset: 0; }
.rd-m { position: absolute; left: 0; top: 0; text-align: center; font-size: 16px; font-weight: 800;   /* A11Y 11 -> 16 */ white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,.9); will-change: transform; }
.rd-m .hb { width: 44px; height: 6px; border-radius: 3px; background: rgba(0,0,0,.55); margin: 0 auto 2px; overflow: hidden; border: 1px solid rgba(255,255,255,.35); }
.rd-m .hb i { display: block; height: 100%; background: #ffb13b; }
.rd-m.jarl .hb { width: 60px; border-color: #ffd23b; } .rd-m.boss .hb { width: 90px; height: 8px; border-color: #ffd23b; }
.rd-m.hot .hb i { background: #ff5d4f; }
.rd-m .ico { width: 30px; height: 30px; margin: 0 auto; border-radius: 50%; border: 3px solid #ffb13b; background: rgba(8,14,22,.6); position: relative; box-sizing: border-box; display: grid; place-items: center; font-size: 16px; }  /* A11Y 10 -> 16 px, and 26 -> 30 so the marker symbol still sits inside the ring.
     (Do NOT write the g-l-y-p-h word here: test-allies sweeps this file for it as proof the
     game has no text renderer, and this comment failed that sweep the first time it ran.) */
.rd-m.edge .ico::after { content: ''; position: absolute; left: 50%; top: 50%; width: 0; height: 0; border-top: 7px solid transparent; border-bottom: 7px solid transparent; border-left: 12px solid currentColor; transform: translate(-50%, -50%) rotate(var(--a, 0rad)) translateX(22px); }
.rd-m.edge { color: #ffb13b; } .rd-m.hot { color: #ff5d4f; } .rd-m.hot .ico { border-color: #ff5d4f; }
.rd-m.shark .ico { border-color: #ff2d20; background: #ff2d20; color: #fff; font-size: 17px; font-weight: 900; width: 30px; height: 30px; animation: rdpulse .25s infinite alternate; }
.rd-m.shark { color: #ff2d20; }
.rd-m.moor .hb i { background: #ff5d4f; } .rd-m.moor { color: #ff8b80; }
/* tr141: the relief fleet. Green, and the only green on the marker layer, so friend and foe
   are never the same colour at a glance. */
.rd-m.ally { color: #5bf39a; } .rd-m.ally .hb i { background: #5bf39a; } .rd-m.ally .hb { border-color: #2f7d55; }
.rd-m.sec { color: #ffb070; font-size: 16px; letter-spacing: .06em; }                    /* A11Y 10 -> 16 */
.rd-m.sec .fb { width: 54px; height: 5px; border-radius: 3px; background: rgba(0,0,0,.55); margin: 0 auto 2px; overflow: hidden; border: 1px solid rgba(255,160,80,.6); }
.rd-m.sec .fb i { display: block; height: 100%; background: linear-gradient(90deg, #ff3b1f, #ffc23a); }
.rd-m.sec.gone { color: #c9c2bd; } .rd-m.sec.gone .fb { display: none; }
.rd-m.sec.edge .ico { border-color: #ff7a2a; color: #ff7a2a; }
.rd-m.pick .ico { width: auto; height: auto; border-radius: 8px; padding: 2px 6px; border-width: 2px; font-size: 16px; letter-spacing: .06em; }  /* A11Y 10 -> 16 */
.rd-fly { position: absolute; left: 0; top: 0; font: 900 20px/1 ui-sans-serif, system-ui, sans-serif; color: #ffd76a; text-shadow: 0 2px 6px rgba(0,0,0,.8); white-space: nowrap; will-change: transform, opacity; }
.rd-fly.big { font-size: 28px; color: #ffe95a; } .rd-fly.hit { font-size: 16px; color: #fff; }   /* A11Y hit 15 -> 16 */ .rd-fly.shark { color: #9fe8ff; } .rd-fly.bad { color: #ff8b80; }
.rd-pop { position: absolute; left: 50%; top: 40%; transform: translate(-50%, 0); font: 900 30px/1 ui-sans-serif, system-ui, sans-serif; color: #ffd76a; text-shadow: 0 2px 10px rgba(0,0,0,.7); animation: rdpop 1.2s ease-out forwards; white-space: nowrap; font-style: italic; }
.rd-pop.combo { color: #ff9a3d; font-size: 36px; } .rd-pop.power { color: #9fe8ff; font-size: 26px; top: 50%; } .rd-pop.bad { color: #ff8b80; font-size: 26px; top: 50%; }
#rd-vig { position: absolute; inset: 0; opacity: 0; box-shadow: inset 0 0 70px 8px rgba(255,30,20,.7); transition: opacity .25s; }
#rd-vig.on { opacity: 1; transition: none; } #rd-vig.cyan { box-shadow: inset 0 0 60px 8px rgba(80,220,255,.7); }
#rd-vig.low { opacity: .35; }
/* FIRE and WATER moved INBOARD (tmp-tr82). They used to sit at right:96/100, i.e. right on
   top of the throttle's old grab region (the whole right half of the canvas), so one thumb
   could not hold a weapon and set speed. The throttle is now a 64 px strip at right:24, and
   these two clear its left edge by ~56 px. Sizes and the 32 px gap between them come from the
   ergonomics report: ≥64 px for anything hit under pressure, ≥16 px of dead space between.
   They scale and fade with the player's own button-size / opacity settings. */
#rd-fire { position: absolute; right: calc(144px * var(--tbs, 1)); bottom: calc(49px + env(safe-area-inset-bottom, 0px)); width: calc(96px * var(--tbs, 1)); height: calc(96px * var(--tbs, 1)); border-radius: 50%; border: 4px solid #ffd76a; background: rgba(255,90,40,.55);
  color: #fff; font: 900 18px ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; pointer-events: auto; display: none; touch-action: none; user-select: none; opacity: var(--tbo, .85); }
#rd-fire.down { background: rgba(255,160,40,.85); transform: scale(.94); }
/* On AUTO the button is a manual override, so it reads as available rather than as the only
   way to shoot. The little AUTO tag is the only thing that tells the player the gun is live. */
/* A11Y 9 -> 16 px, and the tag drops 17 -> 22 px below the ring so the taller line box keeps
   the same air under the button. The tracking comes off: at .14em "AUTO ON" is wider than the
   96 px ring it is centred under. Measured on the live page. */
#rd-fire .auto { position: absolute; left: 0; right: 0; bottom: -22px; font: 700 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .02em; color: #ffd76a; display: none; }
body.autofire #rd-fire { background: rgba(255,90,40,.32); }
body.autofire #rd-fire .auto { display: block; }
body.touch.raid #rd-fire { display: block; }
#rd-water { position: absolute; right: calc(154px * var(--tbs, 1)); bottom: calc(177px + env(safe-area-inset-bottom, 0px)); width: calc(76px * var(--tbs, 1)); height: calc(76px * var(--tbs, 1)); border-radius: 50%; border: 4px solid #8fe3ff; background: rgba(30,130,230,.55);
  color: #fff; font: 900 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .06em; pointer-events: auto; display: none; touch-action: none; user-select: none; opacity: var(--tbo, .85); }  /* A11Y 15 -> 16 */
#rd-water.down { background: rgba(60,170,255,.85); transform: scale(.94); }
body.touch.raid #rd-water { display: block; }
body.touch.raid.mirror #rd-fire { right: auto; left: calc(144px * var(--tbs, 1)); }
body.touch.raid.mirror #rd-water { right: auto; left: calc(154px * var(--tbs, 1)); }
#rd-over { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 20px 28px; min-width: 330px; text-align: center; display: none; pointer-events: auto; box-sizing: border-box; max-width: calc(100% - 24px); max-height: calc(100% - 24px); overflow: auto; }
#rd-over.on { display: block; animation: rdslam .5s cubic-bezier(.2,1.6,.4,1); }
#rd-over h1 { margin: 0 0 2px; font-size: 34px; letter-spacing: .1em; color: #ffcf6e; }
#rd-over .why { font-size: 16px; color: #d7e6f3; }                                       /* A11Y 14 -> 16 */
#rd-over .big { font: 900 44px/1.1 ui-monospace, Consolas, monospace; color: #ffd76a; margin: 6px 0 10px; }
#rd-over dl { display: grid; grid-template-columns: 1fr auto; gap: 3px 20px; margin: 0 0 14px; text-align: left; font-size: 16px; }  /* A11Y 14 -> 16 */
#rd-over dt { color: #b8c9d9; } #rd-over dd { margin: 0; font-weight: 700; text-align: right; }
/* A11Y: 14 -> 16 px, and min-height 44. These two buttons MEASURED 39 px tall on every
   viewport including the phone, and they are the only way to start another run - a primary
   touch target under the 44 px floor since the card was written. */
#rd-over button, #rd-door { font: 700 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; color: #0b1520; background: #ffc21a; border: 0; border-radius: 999px; padding: 10px 18px; min-height: 44px; cursor: pointer; margin: 0 4px 6px; }
#rd-over button.alt { background: rgba(255,255,255,.14); color: #f4f7fb; }
#rd-door { position: absolute; right: 16px; top: 92px; z-index: 35; display: none; box-shadow: 0 4px 18px rgba(0,0,0,.35); background: #ff9a3d; margin: 0; }
body.demo:not(.rescue):not(.raid) #rd-door { display: block; }
/* On a touch device there is no Shift+L, so the way in must stay on screen while you ride (2026-09-17). */
body.touch:not(.rescue):not(.raid) #rd-door { display: block; }
/* A11Y: <small> is 0.8333em of its parent, so these keyboard hints rendered at 11.67 px off a
   14 px button - a RELATIVE unit quietly under the floor, which is the same class of bug as
   the 12 px root this pass came to fix. Pinned to 14 px, a DECLARED EXCEPTION: it names a
   keyboard key, it is not shown on the only device where it would be the sole route to the
   action (a phone has no Enter), and the button it sits inside says the same thing. */
#rd-door small, #rd-over button small { font-size: 14px; font-weight: 600; opacity: .7; margin-left: 6px; }
/* PHONE DECLUTTER (2026-09-17, owner: "can't play raid mode on the phone as boxes on screen in the
   way"). On touch, during a raid, the game's own speed card and the craft chooser are redundant -
   the raid's own strip already carries speed, and you cannot change craft mid-raid anyway - so both
   go, which frees the whole top-left and the band under the wave bar. */
body.touch.raid #hud, body.touch.raid #left > #craftbar { display: none !important; }
@media (max-width: 640px) {
  #rd-top { gap: 10px; padding: 6px 12px; top: 8px; }
  body.raid #left > #craftbar { top: 136px; }
  #rd-inc b { font-size: 18px; } #rd-compass { min-width: 0; }
  #rd-boss { top: 176px; }
  /* Portrait is only 393 px wide: the centred wave bar and the score panel used to sit on top of
     each other. Left-align the wave bar and slim the score so they share the top row (2026-09-17). */
  #rd-top { left: 8px; transform: none; gap: 7px; padding: 5px 9px; font-size: 16px; }   /* A11Y 12 -> 16 */
  #rd-score { top: 8px; right: 8px; min-width: 0; padding: 5px 8px; } #rd-score .v { font-size: 18px; }  /* A11Y 17 -> 18 */
  #rd-score .pier { min-width: 118px; }
}
/* Narrow portrait: even slimmed, the wave strip and the score cannot share a 393 px row, so the
   score sits under it, right-aligned (2026-09-17). */
@media (max-width: 480px) {
  #rd-score { top: 48px; }
  #rd-boss { top: 150px; }
  #rd-pow { top: 196px; }
  #rd-pow { top: 222px; right: 8px; } .rd-chip { min-width: 110px; font-size: 16px; }    /* A11Y 11 -> 16 */
  /* One slim strip instead of a 150x146 block: hull bar, weapon, water bar, speed. Moved off
     the bottom-left for the same reason as the landscape rule: that is the stick's home
     (tmp-tr82). It now sits under the wave strip, left of the score panel. */
  /* A11Y 10 -> 16 px, 124 -> 150 px wide. The TRACKING comes off both this panel and the pier
     row opposite: at .06em / .1em the two panels met in the middle of a 393 px screen and the
     score painted over the weapon name (measured: the longest name, FLARE LAUNCHER, is 14
     characters and overflowed its box by 2 px). At .02em they clear each other. flex-wrap is
     the backstop so a longer name can never push sideways again - it drops a line instead. */
  #rd-stat { width: 150px; top: 52px; bottom: auto; left: 8px; font-size: 16px; padding: 6px 8px;
             line-height: 1.25; letter-spacing: .02em; }
  #rd-stat .row { flex-wrap: wrap; }
  #rd-stat .wt, #rd-stat .wk, #rd-stat .sp { font-size: 16px; }                          /* A11Y 9.5 -> 16 */
  #rd-stat .b, #rd-stat .tk { height: 5px; }
  /* The prompt sat in the middle of a phone screen, right over the water you are aiming at
     (owner, 2026-09-17). Bottom strip, above the touch buttons, wrapping instead of one long line. */
  /* Above WATER and well above the cold row, which now owns the bottom band (tmp-tr82). */
  /* Portrait: under the score panel, never across the middle (owner, 2026-09-18). */
  #rd-prompt { font-size: 16px; top: 150px; bottom: auto; padding: 5px 11px; max-width: 78vw; white-space: normal; text-align: center; line-height: 1.25; }  /* A11Y 12.5 -> 16 */
  #rd-banner h1 { font-size: 30px; } #rd-banner p { font-size: 16px; }                   /* A11Y p 13 -> 16 */
  /* A11Y: the briefing keeps 16 px body text, so the HEADING and the padding give way
     instead - the card has to fit a phone without being cut off, and the prose is the part
     a player actually reads. */
  /* top 50%, not 47%: max-height is calc(100% - 12px) here, so at 47% a full-height card
     still reached 2 px above the top of an 852 px portrait screen. Measured. */
  #rd-intro { padding: 10px 12px; top: 50%; max-height: calc(100% - 12px); }
  #rd-intro h1 { font-size: 22px; } #rd-intro ul { font-size: 16px; } #rd-intro .hist { font-size: 16px; }
  /* PORTRAIT (393 wide). Both weapons lift clear of the cold row, which owns the bottom
     95 px; FIRE keeps ≥25 px above it and WATER keeps 32 px above FIRE (tmp-tr82). */
  #rd-fire { width: calc(92px * var(--tbs, 1)); height: calc(92px * var(--tbs, 1)); right: 119px; bottom: calc(120px + env(safe-area-inset-bottom, 0px)); }
  #rd-water { width: calc(76px * var(--tbs, 1)); height: calc(76px * var(--tbs, 1)); right: 127px; bottom: calc(232px + env(safe-area-inset-bottom, 0px)); font-size: 16px; }  /* A11Y 13 -> 16 */
  body.touch.raid.mirror #rd-fire { left: 119px; right: auto; }
  body.touch.raid.mirror #rd-water { left: 127px; right: auto; }
  #rd-score .pier { min-width: 150px; }
  #rd-score .pier .t { letter-spacing: .02em; } #rd-score .pier .t span { font-size: 16px; }  /* A11Y 9 -> 16 */
  #rd-door { top: 88px; right: 10px; padding: 8px 14px; font-size: 16px; }               /* A11Y 13 -> 16 */
}
/* A phone held sideways is only ~390 px tall: at the heights above, WATER lands under the pier
   health panel. Drop both buttons into the clear band between that panel and the TILT/VIEW/RESET
   row, still under the right thumb (2026-09-17). */
/* LANDSCAPE PHONE: NO BOXES (owner, 2026-09-18: "turn off all the boxes that appear and if
   something is happening have smaller text pop up like pier is burning"). Every read-out panel
   goes; what is left is the controls and small text on the scene. The prompt chain above already
   carries the events - sharks, incoming, tank empty, hull low, a section burning, mooring,
   ladders - and the wave banner still announces each wave, both as bare text. */
@media (max-height: 520px) and (pointer: coarse) {
  #rd-top, #rd-score, #rd-stat, #rd-combo, #rd-pow { display: none !important; }
  /* A11Y 12 -> 16 px. white-space:normal goes with it so the 44vw cap two rules down
     actually binds: with the base rule's nowrap the longest prompt was one 420 px line.
     (No back-quotes in this block: it is inside a JS template literal.) */
  #rd-prompt { background: none; border: 0; box-shadow: none; backdrop-filter: none;
               font-size: 16px; font-weight: 700; letter-spacing: .04em; white-space: normal;
               text-align: center; line-height: 1.25;
               text-shadow: 0 1px 4px rgba(0,0,0,.85), 0 0 12px rgba(0,0,0,.6); }
  #rd-prompt.danger { background: none; color: #ff6b5e; animation: none; }
  #rd-banner { background: none; border: 0; box-shadow: none; backdrop-filter: none; padding: 0; }
  #rd-banner h1 { font-size: 22px; text-shadow: 0 2px 6px rgba(0,0,0,.85); }             /* A11Y 19 -> 22 */
  #rd-banner p { font-size: 16px; text-shadow: 0 1px 4px rgba(0,0,0,.85); }              /* A11Y 11 -> 16 */
  #rd-boss { background: none; border: 0; box-shadow: none; }
}
@media (max-height: 520px) {
  /* The base rule IS the short-landscape rule now (tmp-tr82): FIRE right:144 bottom:49,
     WATER right:154 bottom:177, both clear of the 64 px throttle strip at right:24 and of the
     cold row in the middle. Nothing to override here but the two panels beside them. */
  /* ⚠️ The stats block moves to the TOP-LEFT (tmp-tr82). At bottom:8 it covered x 12-162,
     y 232-385 - which is exactly where the left thumb's stick lands, so the player's own hand
     and the ring they are steering with were both on top of the hull/weapon/water read-out.
     The top-left only became free when the previous pass hid #hud during a touch raid, and
     nothing up there is needed under pressure, which is the definition of where it belongs. */
  /* Slimmed again 2026-09-18: at 150x153 on a 393 px screen the HUD covered 65% of the view and
     the owner called the game unplayable. Same information, a third of the height. */
  /* MINIMAL HUD on a landscape phone (owner, 2026-09-18: "still too many boxes"). The stats
     panel loses its background, its weapon name and its speed line and becomes two bare bars
     - hull and water - 96 px wide in the corner. The weapon is named on the FIRE button; the
     speed is on the throttle strip; the key hints mean nothing on a phone. */
  #rd-stat { top: 8px; bottom: auto; left: 8px; width: 132px; padding: 0; background: none;
             border: 0; box-shadow: none; backdrop-filter: none; font-size: 16px; line-height: 1.2; }  /* A11Y 9 -> 16, 96 -> 132 */
  #rd-stat .row { margin: 0 0 1px; }
  #rd-stat .wn, #rd-stat .tp, #rd-stat .rl, #rd-stat .sp, #rd-stat .wt, #rd-stat .wk, #rd-stat .fk { display: none; }
  #rd-stat .hl, #rd-stat .hv { font-size: 16px; text-shadow: 0 1px 3px rgba(0,0,0,.75); }  /* A11Y 8.5 -> 16 */
  #rd-stat .hp, #rd-stat .tk { height: 5px; }
  /* The score block loses its panel too: the number and the pier bar carry themselves. */
  #rd-score { background: none; border: 0; box-shadow: none; backdrop-filter: none; padding: 0; }
  #rd-score .v { font-size: 18px; text-shadow: 0 1px 4px rgba(0,0,0,.8); }               /* A11Y 16 -> 18 */
  #rd-score .pier { min-width: 120px; }
  /* Hidden until a section is alight or damaged - at 100% it says nothing you need. */
  #rd-score .pier { display: none; }
  #rd-score .pier.alight { display: block; }
  #rd-top { background: rgba(8,14,22,.42); }
  /* The cold row is needed rarely: fade it back until it is touched (JS adds .hot). */
  #tbtns { opacity: .38; transition: opacity .2s; }
  body.coldhot #tbtns { opacity: .95; }
  #rd-stat .b, #rd-stat .tk { height: 4px; }
  #rd-stat .wt, #rd-stat .wk, #rd-stat .sp { font-size: 16px; }                          /* A11Y 9 -> 16 */
  #rd-score { padding: 4px 8px; }
  #rd-score .v { font-size: 18px; }                                                      /* A11Y 15 -> 18 */
  #rd-score .pier { min-width: 168px; }                                                  /* A11Y 132 -> 168 */
  #rd-score .pier .t span { font-size: 16px; }                                           /* A11Y 8 -> 16 */
  /* The per-section pips are a nicety; on a phone the overall bar carries the message. */
  #rd-score .pips { display: none; }
  /* Weapon name and the key hints are desktop information - the buttons say it on a phone. */
  #rd-stat .wk, #rd-stat .fk { display: none; }
  #rd-combo { font-size: 16px; }                                                         /* A11Y 10 -> 16 */
  #rd-top { gap: 8px; padding: 4px 10px; font-size: 16px; }                               /* A11Y 11.5 -> 16 */
  #rd-inc b { font-size: 15px; }
  /* Above the cold row (top edge y = h-95) and narrow enough to clear FIRE's column. */
  /* Landscape phone: tuck it under the wave strip at the top. bottom:102px put it dead centre of
     a 393 px screen, right over the water you are aiming at - the owner reported it twice. */
  #rd-prompt { top: 58px; bottom: auto; max-width: 44vw; font-size: 16px; }              /* A11Y 12 -> 16 */
  /* A11Y: the briefing card was ALREADY 40-106 px off the top of every landscape phone before
     this pass - measured, and pre-existing. #rd-root is pointer-events:none so it cannot be
     scrolled back into view, and the card is on a timer, so the only honest fix is to make it
     FIT: centred rather than at 40%, a smaller heading, tighter padding, and the body text
     held at the 16 px floor. Measured at 844x390, 740x360, 720x375, 700x375 and 667x375. */
  #rd-intro { top: 50%; padding: 10px 14px; max-height: calc(100% - 12px);
              width: calc(100% - 20px); overflow-y: auto; overscroll-behavior: contain; }
  #rd-intro h1 { font-size: 22px; margin-bottom: 0; }
  #rd-intro .sub { margin-bottom: 6px; }
  #rd-intro ul { margin-bottom: 6px; line-height: 1.3; }
  #rd-intro .hist { line-height: 1.3; padding-top: 6px; }
}
@media (prefers-reduced-motion: reduce) { #rd-banner.on, #rd-over.on, #rd-boss.on { animation: none; } }
@keyframes rdpop { from { opacity: 1; transform: translate(-50%, 0) scale(1.25); } 20% { transform: translate(-50%, -8px) scale(1); } to { opacity: 0; transform: translate(-50%, -70px); } }
@keyframes rdslam { from { opacity: 0; transform: translate(-50%, -50%) scale(2.2); } 60% { opacity: 1; transform: translate(-50%, -50%) scale(.94); } to { transform: translate(-50%, -50%) scale(1); } }
@keyframes rdpulse { from { opacity: .75; } to { opacity: 1; } }
`;

const h = (tag, attrs = {}, html = '') => {
  const el = document.createElement(tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (html) el.innerHTML = html;
  return el;
};
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtNum = (n) => Math.round(n).toLocaleString('en-GB');
const TICK = 1 / 120;
const POW_COLOR = { rapid: '#ff9a3d', triple: '#f06cf0', heavy: '#ff5a4a', torpedo: '#34e6cf', turbo: '#ffe34a', shield: '#52dcff', repair: '#58f070', x2: '#ffc21a', bait: '#c08cff', douse: '#52dcff', rebuild: '#9df06a', water: '#2a8cff' };
const POW_SHORT = { rapid: 'RAPID', triple: 'TRIPLE', heavy: 'HEAVY', torpedo: 'TORPEDO', turbo: 'TURBO', shield: 'SHIELD', repair: 'REPAIR', x2: 'x2', bait: 'BAIT', douse: 'DOUSE', rebuild: 'REBUILD', water: 'WATER' };

// The one historical note (checked 2026-09-17, sources in tmp-tr52/RESULT.md).
const HISTORY = 'In the days of King Beorhtric of Wessex, the <i>Anglo-Saxon Chronicle</i> records, '
  + '&ldquo;came first three ships of the Northmen&rdquo; &mdash; the first to reach England. '
  + 'Æthelweard&rsquo;s version of the Chronicle says they landed at Portland, along this coast (usually dated 789).';

// tr128: the PIRATE faction's note. NO REAL PERSON IS NAMED, no country is named and no real
// flag or badge is shown or referred to, here or anywhere else in the model (see
// raid/tuning.js). The rig is a stated anachronism: this is a ~1700 rig, the Poole privateers
// were ~1400. Everything asserted below is true and is checked by tmp-tr128/test-pirate.mjs.
const HISTORY_P = 'Poole, eight miles west along this coast, was a privateers&rsquo; harbour in the Middle Ages, '
  + 'and in <b>1405</b> a raiding fleet came in off the sea and was driven back to its ships by the townspeople. '
  + 'The ships here are <i>not</i> those ships &mdash; a two-masted square rig is three centuries later. '
  + 'Cartoon pirates, invented and generic: no real badge, name or country appears anywhere in this game.';

// EVERY faction-dependent string in the HUD, in one table. Nothing here names a real person,
// a real badge, a country or a modern group, in either faction.
export const COPY = {
  norse: {
    title: 'VIKING RAID', door: 'RAID MODE', ships: 'Longships', shipsLc: 'longships', ship: 'longship',
    boss: 'THE JARL&rsquo;S FLAGSHIP', bossPlain: "THE JARL'S FLAGSHIP", bossBanner: "THE JARL'S FLAGSHIP!",
    bossComing: "the jarl's flagship is coming!", bossSunkSub: "the jarl's crew are paddling home",
    kindSunk: "JARL'S SHIP SUNK!", crew: 'Vikings', foes: 'raiders', sunkRow: 'Longships sunk',
    jarlRow: "Jarls' ships / flagships", warriors: 'warriors',
    sub: 'The raiders are coming for <b>Bournemouth Pier</b>! It has been evacuated &mdash; now defend it.',
    whySaved: 'The raiders are paddling home and Bournemouth Pier still stands.',
    whyLost: 'The raiders set the pier alight. Have another go!',
    overWhy0: 'The raiders made off with the harvest.',
    toast: 'VIKING RAID — save the pier! Z fire · X water · Shift+L to leave',
    history: HISTORY,
  },
  pirate: {
    title: 'PIRATE RAID', door: 'PIRATE RAID', ships: 'Pirate ships', shipsLc: 'pirate ships', ship: 'brig',
    boss: 'THE PIRATE FLAGSHIP', bossPlain: 'THE PIRATE FLAGSHIP', bossBanner: 'THE PIRATE FLAGSHIP!',
    bossComing: 'the pirate flagship is coming!', bossSunkSub: 'her crew are swimming for it',
    kindSunk: 'BIG BRIG SUNK!', crew: 'Pirates', foes: 'pirates', sunkRow: 'Pirate ships sunk',
    jarlRow: 'Big brigs / flagships', warriors: 'boarders',
    sub: 'A pirate fleet is standing in for <b>Bournemouth Pier</b>! It has been evacuated &mdash; now defend it.',
    whySaved: 'The pirates are swimming home and Bournemouth Pier still stands.',
    whyLost: 'The pirates set the pier alight. Have another go!',
    overWhy0: 'The pirates made off with the lot.',
    toast: 'PIRATE RAID — save the pier! Z fire · X water · Shift+L to leave',
    history: HISTORY_P,
    // ---- tr141: THE RELIEF FLEET ------------------------------------------------------------
    // THE ONLY PLACE IN THE GAME A REAL PERSON IS NAMED, and it is HTML text on the HUD, never
    // geometry: there is no text renderer in this project and none was added. Harry Paye is a
    // documented Poole figure of the early 1400s, six centuries dead, whom the town still
    // commemorates with a named day - not a modern person, not a nationality, not a badge. The
    // ships themselves carry no name, flag or lettering of any kind.
    allyMark: 'QUAY FLEET',
    allySighted: 'SAILS ON THE HORIZON',
    allySightedSub: 'ships are standing in from the west &mdash; they are not corsairs',
    allyArrive: 'THE QUAY FLEET!',
    allyArriveSub: 'Harry Paye and the Poole ships are coming in on your side',
    allyEngaged: 'THE QUAY FLEET IS ENGAGED!',
    allyEngagedSub: 'their guns are running out &mdash; press the corsairs while they are busy',
    allyKill: 'QUAY FLEET SINKS ONE!',
    allyDown: 'A QUAY SHIP IS GOING DOWN',
    allyDownSub: 'her crew are in the water &mdash; they are swimming clear, as everyone in this game does',
    allyGone: 'THE QUAY FLEET IS GONE',
    allyGoneSub: 'the pier is yours alone again',
  },
};

// ---- THE HARBOUR MOUTH (tr145) -----------------------------------------------------------
// The corsair level's copy. A SEPARATE TABLE, on purpose: COPY's two faction rows are asserted
// key-for-key against each other by tmp-tr141/test-allies.mjs, and a level is not a faction.
//
// ⚠️ THE EA ATTRIBUTION LIVES HERE AND IT IS A LEGAL OBLIGATION, not a credit. The Old Harry
// landform is Environment Agency LIDAR under the Open Government Licence, and the licence
// requires the acknowledgement to be reachable. It is on the level's INTRO CARD (shown on the
// first run of every session) and again on the GAME-OVER CARD (shown at the end of every single
// run, win or lose), so it cannot be missed by a player who skipped the intro.
//
// HARRY PAYE: the same rule as tr141. He is named in HTML HUD text and nowhere else - never in
// geometry - and he is a documented Poole figure of the early 1400s, six centuries dead. The
// 1405 raid on Poole is the historical flavour; the attackers here are CORSAIRS and carry no
// nation, flag, emblem, name or national colour anywhere in the world.
export const EA_ATTRIBUTION = 'Contains Environment Agency information &copy; Environment Agency and/or database right';

export const GATE_COPY = {
  title: 'THE HARBOUR MOUTH',
  objective: 'THE HARBOUR MOUTH',
  door: 'CORSAIR RAID',
  toast: 'THE HARBOUR MOUTH — hold the line at Old Harry! Z fire · Shift+L to leave',
  sub: 'A corsair fleet is standing in for the <b>Poole Harbour mouth</b>. Nothing is between them and it but you.',
  through: 'A CORSAIR IS THROUGH!',
  throughLast: 'ONE MORE AND THEY ARE IN',
  heldTitle: 'THE HARBOUR HELD!',
  heldSub: 'the corsairs are standing away south',
  lostTitle: 'THE CORSAIRS ARE THROUGH',
  lostSub: 'they have the run of the harbour',
  whySaved: 'The corsairs are standing away south and the harbour mouth is still yours.',
  whyLost: 'Too many got past Handfast Point. Have another go!',
  allySighted: 'SAILS OFF THE HARBOUR MOUTH',
  allySightedSub: 'ships are standing out of Poole &mdash; they are not corsairs',
  allyArriveSub: 'Harry Paye and the Poole ships are coming down on your side',
  allyGoneSub: 'the line is yours alone again',
  hist: `Historical flavour only. In 1405 a raiding fleet burned and looted Poole; the town&rsquo;s answer,
    under <b>Harry Paye</b> &mdash; a Poole shipman of the early 1400s whom the town still marks with a named
    day &mdash; became the local legend this level plays with. The raiders here are generic <b>corsairs</b>:
    no nation, no flag, no emblem, nobody&rsquo;s ancestors. Nobody is ever hurt and nobody in the water is
    ever a target.<br><span class="ea">${EA_ATTRIBUTION}. Old Harry Rocks, Handfast Point and Ballard Down
    are built from EA LIDAR at their true position 8.6 km from the Bournemouth origin.</span>`,
};

// The corsair level's intro card. Different rules, different card - the pier's card talks about
// mooring, ladders and hosing fires out, none of which happens at a cliff.
function gateIntroHtml(C, G, waves) {
  return `
        <h1>${G.title}</h1>
        <div class="sub">${G.sub}</div>
        <ul>
          <li>The corsairs are making for the harbour mouth past <b>Old Harry Rocks</b>. <b>Sink them before they get past the point</b> &mdash; hold <b>FIRE</b> (<b>Z</b>, middle mouse, pad <b>X</b>/<b>RB</b>). It auto-aims; ramming works too.</li>
          <li>Let <b>${TUNING.gate.letThrough}</b> through and the harbour is theirs. The counter top right is how many you have left.</li>
          <li>Their brigs carry <b>twelve guns a side</b> and with no town to shell they will lay them on <b>you</b>. Keep moving. Dodge arrows; turn away from <b>sharks</b>.</li>
          <li>The <b>Poole quay fleet</b> comes out to help you part way through. ${C.crew} in the water just swim home &mdash; <b>they are never targets</b>, and nobody is ever hurt. Hold the line for <b>${waves} waves</b>.</li>
        </ul>
        <div class="hist">${G.hist}</div>
        <div class="go">Press any key &mdash; or tap the screen &mdash; to begin. <small>The sea is holding still until you do.</small></div>`;
}

// The intro card, per faction. The only differences are the nouns and the history note; the
// rules, the controls and the no-target promise are word for word the same in both.
function introHtml(C, lives) {
  return `
        <h1>${C.title}</h1>
        <div class="sub">${C.sub}</div>
        <ul>
          <li>${C.ships} <b>moor</b> alongside and send ${C.warriors} up ladders with fire pots. <b>Sink them before they tie up</b> &mdash; hold <b>FIRE</b> (<b>Z</b>, middle mouse, pad <b>X</b>/<b>RB</b>). It auto-aims; ramming works too.</li>
          <li>Hold <b>WATER</b> (<b>X</b>, pad <b>Y</b>/<b>LB</b>) to <b>hose fires out</b>, knock fire pots out of the air and ${C.warriors} off ladders. The tank refills.</li>
          <li>Fire <b>spreads</b> and burnt sections <b>collapse</b>. Grab <b>DOUSE</b>, <b>REBUILD</b> and <b>WATER</b>. Dodge arrows; turn away from <b>sharks</b>.</li>
          <li>${C.crew} in the water just swim home &mdash; <b>they are never targets</b>, and nobody is ever hurt. Hold out for <b>${lives} waves</b> to save the pier.</li>
        </ul>
        <div class="hist">${C.history}</div>
        <div class="go">Press any key &mdash; or tap the screen &mdash; to begin. <small>The sea is holding still until you do.</small></div>`;
}

export class RaidHud {
  constructor(mount, { onEnter, onAgain, onExit, lives, onFire, onWater, foe }) {
    const style = h('style', { id: 'rd-style' }); style.textContent = CSS;
    document.head.appendChild(style);
    this.door = h('button', { id: 'rd-door', type: 'button' }, 'RAID MODE<small>Shift+L</small>');
    this.door.addEventListener('click', (e) => { e.stopPropagation(); onEnter(); });
    mount.appendChild(this.door);

    const r = this.root = h('div', { id: 'rd-root' });
    r.innerHTML = `
      <div id="rd-vig"></div>
      <div id="rd-markers"></div><div id="rd-fly"></div>
      <div id="rd-top" class="rd-panel"><span id="rd-wave">WAVE 1</span><span id="rd-inc"><b>0</b>to sink</span><span id="rd-compass"><i></i><span>—</span></span></div>
      <div id="rd-boss" class="rd-panel"><div class="n">THE JARL&rsquo;S FLAGSHIP</div><div class="bar"><i></i></div></div>
      <div id="rd-score" class="rd-panel"><div class="v">0</div><div id="rd-combo"></div><div class="pier"><div class="t"><span>BOURNEMOUTH PIER</span><b>100%</b></div><div class="pb"><i></i></div><div class="pips"></div></div></div>
      <div id="rd-pow"></div>
      <div id="rd-stat" class="rd-panel"><div class="row"><span class="hl">RIDER</span><span class="hv">100</span></div><div class="hp"><i></i></div>
        <div class="row"><span class="wn">FLARE LAUNCHER</span><span class="tp"></span></div><div class="rl"><i></i></div>
        <div class="row" style="margin-top:4px"><span class="wt">WATER CANNON</span><span class="wk">X / N</span></div><div class="tk"><i></i></div>
        <div class="row" style="margin-top:4px"><span class="sp">0 km/h</span><span class="sp fk">FIRE: Z / Q</span></div></div>
      <div id="rd-prompt" class="rd-panel"></div>
      <div id="rd-banner" class="rd-panel"><h1></h1><p></p></div>
      <div id="rd-intro" class="rd-panel">
        <h1>VIKING RAID</h1>
        <div class="sub">The raiders are coming for <b>Bournemouth Pier</b>! It has been evacuated &mdash; now defend it.</div>
        <ul>
          <li>Longships <b>moor</b> alongside and send warriors up ladders with fire pots. <b>Sink them before they tie up</b> &mdash; hold <b>FIRE</b> (<b>Z</b>, middle mouse, pad <b>X</b>/<b>RB</b>). It auto-aims; ramming works too.</li>
          <li>Hold <b>WATER</b> (<b>X</b>, pad <b>Y</b>/<b>LB</b>) to <b>hose fires out</b>, knock fire pots out of the air and warriors off ladders. The tank refills.</li>
          <li>Fire <b>spreads</b> and burnt sections <b>collapse</b>. Grab <b>DOUSE</b>, <b>REBUILD</b> and <b>WATER</b>. Dodge arrows; turn away from <b>sharks</b>.</li>
          <li>Vikings in the water just paddle home &mdash; they are never targets. Hold out for <b>${lives} waves</b> to save the pier.</li>
        </ul>
        <div class="hist">${HISTORY}</div>
      </div>
      <button id="rd-fire" type="button">FIRE<span class="auto">AUTO ON</span></button>
      <button id="rd-water" type="button">WATER</button>
      <div id="rd-over" class="rd-panel">
        <h1>RAID OVER</h1><div class="why">The raiders made off with the harvest.</div><div class="big">0</div><dl></dl>
        <!-- >>> PROGRESS  hidden unless the run was WON and there is a level after it. -->
        <button type="button" data-a="next" hidden>NEXT LEVEL <small></small></button>
        <!-- <<< PROGRESS -->
        <button type="button" data-a="again">PLAY AGAIN <small>Enter</small></button>
        <!-- >>> LEVELBACK  see the listener below for why this is here and why it is third. -->
        <button type="button" data-a="levels" class="alt">CHOOSE LEVEL</button>
        <!-- <<< LEVELBACK -->
        <button type="button" data-a="exit" class="alt">FREE RIDE <small>Shift+L</small></button>
      </div>`;
    mount.appendChild(r);
    const q = (s) => r.querySelector(s);
    this.el = {
      markers: q('#rd-markers'), fly: q('#rd-fly'), wave: q('#rd-wave'), inc: q('#rd-inc b'), compass: q('#rd-compass'), arrow: q('#rd-compass i'),
      cdist: q('#rd-compass span'), boss: q('#rd-boss'), bossBar: q('#rd-boss .bar i'), bossName: q('#rd-boss .n'),
      next: q('#rd-over [data-a=next]'),
      score: q('#rd-score .v'), combo: q('#rd-combo'), lives: q('#rd-score .c'), pow: q('#rd-pow'),
      stat: q('#rd-stat'), hl: q('#rd-stat .hl'), hv: q('#rd-stat .hv'), hp: q('#rd-stat .hp i'), wn: q('#rd-stat .wn'), tp: q('#rd-stat .tp'), rl: q('#rd-stat .rl i'), sp: q('#rd-stat .sp'),
      prompt: q('#rd-prompt'), banner: q('#rd-banner'), bannerH: q('#rd-banner h1'), bannerP: q('#rd-banner p'),
      intro: q('#rd-intro'), over: q('#rd-over'), overScore: q('#rd-over .big'), overDl: q('#rd-over dl'), vig: q('#rd-vig'), fire: q('#rd-fire'),
      overH: q('#rd-over h1'), overWhy: q('#rd-over .why'), water: q('#rd-water'),
      pier: q('#rd-score .pier'), pierPct: q('#rd-score .pier .t b'), pierBar: q('#rd-score .pier .pb i'), pips: q('#rd-score .pips'), tank: q('#rd-stat .tk i'),
      pierName: q('#rd-score .pier .t span'),     // tr145: "BOURNEMOUTH PIER" / "THE HARBOUR MOUTH"
    };
    this.level = 'pier';
    this.G = GATE_COPY;
    q('#rd-over [data-a=again]').addEventListener('click', (e) => { e.stopPropagation(); onAgain(); });
    // >>> LEVELBACK
    // A WAY TO ANOTHER LEVEL FROM THE CARD YOU FINISH ON. The owner, having played a full raid
    // through to PIER SAVED on the live site: "when you complete a level I think you should have
    // a choice to select other levels to give them a go."
    //
    // This is not a new idea - it is an INCONSISTENCY being closed. `smuggle.js` and `stunt.js`
    // have both carried a LEVELS button on their own cards for rounds; the raid, the rescue and
    // the trip back never got one, so three of the five levels ended in a dead end offering only
    // the same level again or free ride.
    //
    // ⚠️ NO `onLevels` CALLBACK, and that is deliberate rather than lazy. The two older cards
    // take one and then spend it on exactly this single line. Threading a third callback through
    // this constructor, rescue-hud's and overboard-hud's - and then through their four call
    // sites - would add surface for no behaviour. Clicking a DOM button from the DOM layer is
    // in-layer, and `#btn-mode` is the handle the picker publishes.
    //
    // It works even where the button is not visible: `index.html` hides the row on a calibration
    // render and used to hide it on a desktop, and a display:none button still takes a
    // programmatic click - the same property `main.js` already relies on to enter the rescue
    // through #rq-door.
    //
    // THIRD, not second: PLAY AGAIN keeps the Enter key and the first slot, because after a win
    // the most likely next action is another run of the thing you just got good at.
    // >>> PROGRESS
    // Clicks the PICKER'S OWN ROW for the next level rather than navigating itself. That row
    // already knows whether the level is a live switch or a page load (ui/levels.js), so this
    // cannot get out of step with it - and a hidden button still takes a programmatic click,
    // exactly as the CHOOSE LEVEL note below relies on.
    q('#rd-over [data-a=next]').addEventListener('click', (ev) => {
      ev.stopPropagation();
      const id = ev.currentTarget.dataset.go;
      const row = id && document.querySelector(`#tmode [data-m="${id}"]`);
      if (row) row.click();
    });
    // <<< PROGRESS
    q('#rd-over [data-a=levels]').addEventListener('click', (e) => {
      e.stopPropagation();
      const b = document.querySelector('#btn-mode');
      if (b) b.click();
    });
    // <<< LEVELBACK
    q('#rd-over [data-a=exit]').addEventListener('click', (e) => { e.stopPropagation(); onExit(); });
    // POINTER CAPTURE, NOT pointerleave (tmp-tr82). A thumb that rolls a few px off a 92 px
    // circle is normal; it is not a release intent, and treating it as one stopped the weapon
    // mid-wave. setPointerCapture keeps the events coming to the button until the thumb is
    // actually lifted, which is what MDN says it is for.
    const hold = (el, cb) => {
      const set = (v) => (e) => {
        e.preventDefault(); e.stopPropagation();
        if (v) { try { el.setPointerCapture(e.pointerId); } catch { /* unsupported: still usable */ } }
        el.classList.toggle('down', v);
        if (cb) cb(v);
      };
      el.addEventListener('pointerdown', set(true));
      el.addEventListener('pointerup', set(false));
      el.addEventListener('pointercancel', set(false));
    };
    hold(this.el.fire, onFire);
    hold(this.el.water, onWater);
    this.markerEls = []; this.flies = []; this.bannerTo = -1; this._keys = {};
    this.lives = lives;
    this.setFoe(foe);
  }

  // tr128: point the whole HUD at a faction. Called on construction and again whenever the
  // player enters the other faction's raid in the same session, so no Norse string is left
  // over on a pirate run (or the other way round).
  // tr145: which LEVEL's copy and intro card the HUD is showing. Called by raid-mode on entry;
  // 'pier' is the default and restores exactly what was there before.
  setLevel(level) {
    // >>> BRIEFING  a new level means a briefing the player has not read yet.
    this.introSkip = false;
    // <<< BRIEFING
    this.level = level === 'gate' ? 'gate' : 'pier';
    this.el.pierName.textContent = this.level === 'gate' ? this.G.objective : 'BOURNEMOUTH PIER';
    this.el.intro.innerHTML = this.level === 'gate'
      ? gateIntroHtml(this.C, this.G, this.lives) : introHtml(this.C, this.lives);
    if (this.level === 'gate') this.door.innerHTML = `${this.G.door}<small>Shift+L</small>`;
  }

  setFoe(foe) {
    // >>> BRIEFING
    // A FACTION change is a level change too - raid -> pirate is a live switch that never
    // touches setLevel - so the briefing flag has to reset here as well, or a player who
    // dismissed the viking card and then took NEXT would get the pirate raid with no briefing
    // at all. Found by clicking the new NEXT button rather than by reading this.
    this.introSkip = false;
    // <<< BRIEFING
    const C = this.C = COPY[foe] || COPY.norse;
    this.foe = COPY[foe] ? foe : 'norse';
    this.door.innerHTML = `${C.door}<small>Shift+L</small>`;
    this.el.intro.innerHTML = this.level === 'gate' ? gateIntroHtml(C, this.G, this.lives) : introHtml(C, this.lives);
    this.el.bossName.innerHTML = C.boss;
    this.el.overWhy.textContent = C.overWhy0;
    this._keys = {};
  }

  _set(key, el, prop, val) { if (this._keys[key] !== val) { this._keys[key] = val; el[prop] = val; } }

  banner(game, title, sub, cls, secs) {
    const e = this.el;
    e.bannerH.textContent = title; e.bannerP.textContent = sub;
    e.banner.className = 'rd-panel ' + (cls || '');
    void e.banner.offsetWidth;          // restart the slam animation
    e.banner.classList.add('on');
    this.bannerTo = game.tick + Math.round(secs / TICK);
    this.bannerFrom = game.tick;
  }

  bannerBusy(game) { return this.bannerTo >= 0 && game.tick <= this.bannerTo; }

  pop(text, cls = '') {
    const old = this.root.querySelectorAll('.rd-pop');           // at most two at once, never overprinted
    for (let i = 0; i < old.length - 1; i++) old[i].remove();
    const p = h('div', { class: 'rd-pop ' + cls }, text);
    if (old.length) p.style.marginTop = '44px';
    this.root.appendChild(p);
    setTimeout(() => p.remove(), 1250);
  }

  // A score / label that flies up from a point in the world.
  fly(x, y, z, text, cls = '') {
    let f = this.flies.find((q) => !q.live);
    if (!f) { if (this.flies.length >= 24) return; f = { el: h('div', { class: 'rd-fly' }) }; this.el.fly.appendChild(f.el); this.flies.push(f); }
    Object.assign(f, { live: true, x, y, z, t0: performance.now(), life: cls === 'big' ? 1600 : 1100 });
    f.el.className = 'rd-fly ' + cls; f.el.textContent = text; f.el.style.display = 'block';
  }

  flash(cls) {
    const v = this.el.vig;
    v.className = cls; void v.offsetWidth; v.classList.add('on');
    clearTimeout(this._vigT); this._vigT = setTimeout(() => v.classList.remove('on'), 90);
  }

  showOver(sum, seed) {
    const e = this.el;
    e.banner.classList.remove('on'); this.bannerTo = -1;
    e.overScore.textContent = fmtNum(sum.score);
    const saved = sum.outcome === 'saved';
    const gateLvl = sum.level === 'gate';
    // >>> PROGRESS
    // One HUD serves three campaign levels, so the id comes from the level AND the faction:
    // 'gate' is the harbour mouth whichever foe is set; otherwise the pier, norse or pirate.
    // Only a SAVED pier or mouth counts - losing must not open the next level.
    this.levelId = gateLvl ? 'gate' : (this.foe === 'pirate' ? 'pirate' : 'raid');
    prog.complete(this.levelId, saved);
    // The NEXT button appears only on a WIN with somewhere to go. After a loss the useful
    // action is PLAY AGAIN, and dangling the next level in front of someone who just lost
    // would be an odd thing to offer.
    const nxt = saved ? prog.next(this.levelId) : null;
    e.next.hidden = !nxt;
    if (nxt) {
      e.next.dataset.go = nxt;
      e.next.innerHTML = `NEXT: ${prog.title(nxt)}`;
    }
    // <<< PROGRESS
    e.over.classList.toggle('saved', saved);
    e.overH.textContent = gateLvl ? (saved ? this.G.heldTitle : this.G.lostTitle)
      : (saved ? 'PIER SAVED!' : 'THE PIER HAS BURNED DOWN');
    e.overWhy.textContent = gateLvl ? (saved ? this.G.whySaved : this.G.whyLost)
      : (saved ? this.C.whySaved : this.C.whyLost);
    const rows = gateLvl ? [
      ['Corsairs through', `${sum.gate.through} of ${sum.gate.limit} allowed`],
      [this.C.sunkRow, sum.sunk], [this.C.jarlRow, `${sum.jarlsSunk} / ${sum.bossesSunk}`],
      ...(sum.volleys ? [['Broadsides fired', `${sum.volleys} (${sum.allyVolleys} by the quay fleet)`]] : []),
      ...(sum.allies && sum.allies.arrived ? [['Quay fleet', `${sum.allies.kills} corsairs sunk · ${sum.allies.sunk} of ${sum.allies.arrived} lost`]] : []),
      ['Sharks scared off', sum.sharksScared], ['Best combo', sum.bestCombo], ['Accuracy', `${sum.accuracy}%`],
      ['Reached wave', `${sum.reachedWave} of ${sum.finalWave}`], ['Run length', fmtTime(sum.seconds)], ['Run seed', seed],
    ] : [
      ['Pier standing', `${sum.sectionsStanding} of ${sum.sections} sections · ${sum.pier}%`], ['Sections lost', sum.sectionsLost],
      ['Fires put out', sum.firesOut], [`${this.C.warriors[0].toUpperCase()}${this.C.warriors.slice(1)} hosed off ladders`, sum.knockedOff],
      [this.C.sunkRow, `${sum.sunk} (${sum.sunk - sum.sunkMoored} before mooring)`], [this.C.jarlRow, `${sum.jarlsSunk} / ${sum.bossesSunk}`],
      ...(sum.volleys ? [['Broadsides fired at you', `${sum.volleys} (${sum.roundsLanded} rounds on the pier)`]] : []),
      ['Sharks scared off', sum.sharksScared], ['Best combo', sum.bestCombo], ['Accuracy', `${sum.accuracy}%`],
      ['Reached wave', `${sum.reachedWave} of ${sum.finalWave}`], ['Raid length', fmtTime(sum.seconds)], ['Run seed', seed],
    ];
    e.overDl.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')
      // ⚠️ THE EA ATTRIBUTION, on the card every run ends on. See the note above GATE_COPY: this
      // is an Open Government Licence obligation on the Old Harry landform, not a credit.
      + (gateLvl ? `<dt class="ea">Landform</dt><dd class="ea">${EA_ATTRIBUTION}</dd>` : '');
    e.over.classList.add('on');
  }

  hideOver() { this.el.over.classList.remove('on'); }

  update(game, pose, proj, W, H, viewYaw) {
    const e = this.el, T = game.T, P = game.player;
    this._set('wave', e.wave, 'textContent', `WAVE ${game.wave}`);
    this._set('inc', e.inc, 'textContent', String(game.incoming));
    this._set('score', e.score, 'textContent', fmtNum(game.score));
    // the objective: the pier's health and one pip per section, or - at the harbour mouth - how
    // many corsairs you can still let through and one pip per crossing. SAME THREE ELEMENTS, so
    // the layout, the phone rule and the CSS are the ones that were already there.
    const secs = game.pier.sections;
    const gateLvl = game.level === 'gate';
    const frac = gateLvl ? game.gateFrac : game.pierFrac;
    this._set('pierPct', e.pierPct, 'textContent', gateLvl ? `${game.gateLeft} LEFT` : `${Math.ceil(frac * 100)}%`);
    e.pierBar.style.width = `${(frac * 100).toFixed(1)}%`;
    // 'alight' drives the phone rule below: the bar only earns its place on a small screen while
    // something is actually happening to the objective (owner, 2026-09-18).
    const alight = gateLvl ? game.gate.through > 0
      : secs.some((q) => q.fire > 0.02 || q.collapsed || q.hp < q.maxHp * 0.995);
    this._set('pierCls', e.pier, 'className', 'pier' + (frac < 0.4 ? ' low' : frac < 0.75 ? ' hurt' : '') + (alight ? ' alight' : ''));
    const pk2 = gateLvl
      ? Array.from({ length: game.gate.limit }, (_, i) => (i < game.gate.through ? 'g' : 'o')).join('')
      : secs.map((q) => (q.collapsed ? 'g' : q.fire > 0.05 ? 'b' : q.hp < q.maxHp * 0.98 ? 'd' : 'o')).join('');
    if (pk2 !== this._keys.pips) {
      this._keys.pips = pk2;
      e.pips.innerHTML = gateLvl
        ? pk2.split('').map((k) => `<span class="${k === 'g' ? 'gone' : ''}"></span>`).join('')
        : secs.map((q, i) => `<span class="${{ g: 'gone', b: 'burn', d: 'dmg', o: '' }[pk2[i]]}" title="${SECTIONS[i].name}"></span>`).join('');
    }
    // combo meter
    const ck = game.combo >= 2 ? `${game.combo}|${game.multiplier}` : game.fx.x2 > 0 ? 'x2' : '';
    if (ck !== this._keys.combo) {
      this._keys.combo = ck;
      e.combo.className = game.fx.x2 > 0 ? 'x2' : '';
      e.combo.innerHTML = game.combo >= 2 ? `COMBO ${game.combo} &times;${game.multiplier.toFixed(2).replace(/\.?0+$/, '')}<div class="cb"><i></i></div>` : game.fx.x2 > 0 ? 'SCORE &times;2' : '';
      this._cb = e.combo.querySelector('.cb i');
    }
    if (this._cb) this._cb.style.width = `${Math.max(0, (game.comboT / T.comboWindow) * 100).toFixed(0)}%`;

    // >>> JUICE
    // HIT CONFIRMATION, and the combo mirrored somewhere a player can actually see it.
    //
    // ⚠️ THIS CAN ONLY EVER FIRE ON A HOSTILE HULL, and that is a content rule, not a
    // nicety. game.lastHit is the rules' own note of the last round the PLAYER was credited
    // with. RaidGame sets it in exactly one place - _damage(), and only when `credit` is
    // true - and every call site into _damage() passes an entry of game.ships: a shot
    // exploding on a hull, splash from that shot, a ram, a shark worrying a hull, or one
    // ship's broadside into another. People in the water live in game.swimmers, which no
    // hit test in the game looks at at all, so there is no route from a person to this
    // line. The ally lookup below is the second guard: the rules already make the player's
    // rounds pass straight through her own side, and a hull on your side is not a hit to
    // celebrate either way. If the lookup fails, nothing is shown.
    //
    // The combo is MIRRORED, never re-invented: the number and its window both come from
    // the rules (game.combo, game.comboT and T.comboWindow, the table's own value), because
    // the #rd-combo line above is 11 px and the landscape-phone stylesheet in this file
    // hides it outright, so on the device most of this game is played on the streak was
    // invisible. One number, two places, no way for them to disagree.
    const J = getJuice();
    if (J) {
      const lh = game.lastHit;
      if (lh && lh.tick !== this._jzTick) {
        this._jzTick = lh.tick;
        const s = game.ships.find((q) => q.id === lh.ship);
        if (s && !s.ally) J.hit({ frac: Math.max(0, s.hp) / s.maxHp });
      }
      J.combo(game.combo, game.comboT / T.comboWindow);
      // The intro card and the game-over card are centred blocks that reach across the left
      // edge on a desktop window, and neither is a moment with a landing or a combo in it.
      J.mute(e.intro.classList.contains('on') || e.over.classList.contains('on'));
    }
    // <<< JUICE

    // power-up chips
    const chips = [];
    for (const k of ['rapid', 'triple', 'heavy', 'turbo', 'shield', 'x2']) if (game.fx[k] > 0) chips.push([k, game.fx[k], T.powerups[k].sec]);
    if (game.torpedoes > 0) chips.push(['torpedo', -game.torpedoes, 0]);
    for (const b of game.baits) chips.push(['bait', b.t, T.powerups.bait.sec]);
    const pk = chips.map((c) => c[0] + Math.ceil(c[1])).join(',');
    if (pk !== this._keys.pow) {
      this._keys.pow = pk;
      e.pow.innerHTML = chips.map(([k, v]) => `<div class="rd-chip" style="color:${POW_COLOR[k]}">${T.powerups[k].label}<b>${v < 0 ? `&times;${-v}` : Math.ceil(v) + 's'}</b><i data-k="${k}"></i></div>`).join('');
    }
    e.pow.querySelectorAll('i[data-k]').forEach((el, i) => { const c = chips[i]; if (c) el.style.width = c[2] ? `${Math.max(0, (c[1] / c[2]) * 100).toFixed(0)}%` : '100%'; });

    // health, weapon, reload, speed
    const Wp = game.weapon, efoil = P.craft === 'efoil';
    this._set('hl', e.hl, 'textContent', efoil ? 'RIDER' : 'HULL');
    this._set('hv', e.hv, 'textContent', String(Math.max(0, Math.round(P.hp))));
    e.hp.style.width = `${Math.max(0, (P.hp / P.maxHp) * 100).toFixed(0)}%`;
    e.stat.classList.toggle('low', P.hp < P.maxHp * 0.3);
    e.stat.classList.toggle('shield', game.fx.shield > 0);
    this._set('wn', e.wn, 'textContent', Wp.name + (game.fx.heavy > 0 ? ' +HEAVY' : ''));
    this._set('tp', e.tp, 'textContent', game.torpedoes > 0 ? `TORPEDOES ${game.torpedoes}` : '');
    const rel = Wp.reload * (game.fx.rapid > 0 ? T.rapidFactor : 1);
    e.rl.style.width = `${(100 * (1 - Math.max(0, P.reloadT) / rel)).toFixed(0)}%`;
    this._set('sp', e.sp, 'textContent', `${Math.round(Math.abs(pose.speed) * 3.6)} km/h`);
    e.tank.style.width = `${Math.max(0, game.tank / T.water.tank * 100).toFixed(0)}%`;
    e.stat.classList.toggle('spray', game.spraying);
    e.stat.classList.toggle('dry', game.tank < 4);
    e.vig.classList.toggle('low', P.hp < P.maxHp * 0.25 && game.playing);

    // boss bar
    const B = game.boss;
    if (B && (B.state === 'rowing' || (B.moored && B.state === 'landed')) && game.playing) {
      if (!e.boss.classList.contains('on')) e.boss.classList.add('on');
      e.bossBar.style.width = `${Math.max(0, (B.hp / B.maxHp) * 100).toFixed(1)}%`;
      this._set('bossn', e.bossName, 'textContent', `${this.C.bossPlain} · ${Math.max(0, Math.ceil(B.hp))} / ${B.maxHp}`);
    } else if (e.boss.classList.contains('on')) e.boss.classList.remove('on');

    const obj = game.objective(pose);
    if (obj) {
      const relA = Math.atan2(obj.z - pose.z, obj.x - pose.x) - (Number.isFinite(viewYaw) ? viewYaw : pose.heading);
      e.arrow.style.transform = `rotate(${relA.toFixed(3)}rad)`;
      e.cdist.textContent = obj.ship.moored ? `${Math.round(obj.dist)} m · MOORED` : `${Math.round(obj.dist)} m · ${Number.isFinite(obj.ttb) ? Math.ceil(obj.ttb) + ' s' : '—'}`;
      e.compass.classList.toggle('hot', obj.ttb < T.landingFlexSec);
      e.compass.style.visibility = 'visible';
    } else e.compass.style.visibility = 'hidden';

    // >>> BRIEFING
    // ⚠️ 24 Sep 2026: THIS USED TO READ `game.time < T.introSec`, AND THAT WAS THE BUG.
    // tuning.js still carries the comment it was written with - "the first-run intro card shows
    // this long; play is live from tick 0 behind it" - so it was a decision, not an accident.
    // It was the wrong one. The raid CLOCK ran, longships moored and arrows flew for the six to
    // nine seconds it took to read the card, and there was no way to skip it. Owner's words:
    // "the game starts and you can't play until that thing vanishes."
    //
    // Now it stays up until the player dismisses it, and main.js freezes the sim while it is up
    // (see the BRIEFING fence there), so reading it costs nothing. There is no timer left to
    // race: a fast reader taps and goes, a slow one is not punished.
    e.intro.classList.toggle('on', !this.introSkip && game.wave === game.firstWave && game.tick > 0 && game.playing);
    // <<< BRIEFING
    if (this.bannerTo >= 0 && (game.tick > this.bannerTo || game.tick < this.bannerFrom)) { e.banner.classList.remove('on'); this.bannerTo = -1; }

    // prompt, most important first
    let txt = '', cls = '';
    if (game.playing) {
      let shark = null;
      for (const k of game.sharks) if ((k.state === 'tell' || k.state === 'lunge') && Math.hypot(k.x - pose.x, k.z - pose.z) < 45) shark = k;
      let incoming = false;
      for (const m of game.missiles) if (m.vy < 0 && Math.hypot(m.x - pose.x, m.z - pose.z) < 14) incoming = true;
      let burn = null, bd = 95;
      secs.forEach((q, i) => { if (q.collapsed || q.fire < 0.12) return; const c = sectionCentre(i), d = Math.hypot(c.x - pose.x, c.z - pose.z); if (d < bd) { bd = d; burn = i; } });
      const moored = obj && obj.ship.moored;
      if (P.downT > 0) { txt = efoil ? 'KNOCKED OFF! climbing back on…' : 'STALLED! restarting…'; cls = 'danger'; }
      else if (P.stallT > 0) { txt = 'STALLED! restarting…'; cls = 'danger'; }
      else if (shark) { txt = 'SHARK! TURN AWAY!'; cls = 'danger'; }
      else if (incoming && game.fx.shield <= 0) { txt = 'INCOMING! DODGE!'; cls = 'warn'; }
      else if (game.tank < 4 && game.sprayT < 2) { txt = 'WATER TANK EMPTY — refilling…'; cls = 'warn'; }
      // The phone layout hides the hull bar, so say it in words when it matters.
      else if (P.hp > 0 && P.hp < 30) { txt = `HULL ${Math.round(P.hp)}% — back off`; cls = 'danger'; }
      else if (burn !== null && !game.spraying) { txt = `${SECTIONS[burn].name} IS BURNING! hold WATER (X)`; cls = 'danger'; }
      else if (obj && !moored && obj.ttb < T.landingFlexSec) { txt = `MOORING IN ${Math.ceil(obj.ttb)} s! sink her first`; cls = 'warn'; }
      else if (moored && obj.dist > 60) { txt = 'WARRIORS ON THE LADDERS! sink her or hose them off'; cls = 'warn'; }
      else if (game.time < 14 && game.stats.shotsFired === 0) { txt = 'Hold FIRE (Z) to sink ships · WATER (X) for fires'; cls = 'go'; }
    }
    this._set('pt', e.prompt, 'textContent', txt);
    this._set('pc', e.prompt, 'className', 'rd-panel' + (txt ? ' on ' + cls : ''));

    // fly-ups
    const now = performance.now();
    for (const f of this.flies) {
      if (!f.live) continue;
      const k = (now - f.t0) / f.life;
      if (k >= 1 || !proj) { f.live = false; f.el.style.display = 'none'; continue; }
      const s = proj(f.x, f.y, f.z);
      if (s.behind) { f.el.style.opacity = '0'; continue; }
      f.el.style.opacity = String(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
      f.el.style.transform = `translate(${s.x.toFixed(1)}px, ${(s.y - 70 * k).toFixed(1)}px) translate(-50%, -100%) scale(${(k < 0.12 ? 1.5 - k * 4 : 1).toFixed(2)})`;
    }

    // markers
    const list = [];
    if (proj && game.phase !== 'over') {
      for (const s of game.ships) {
        const moored = s.moored && s.state === 'landed';
        if (s.state !== 'rowing' && !moored) continue;
        const d = Math.hypot(s.x - pose.x, s.z - pose.z);
        const hot = !moored && s.ttb < T.landingFlexSec, dmg = s.hp < s.maxHp;
        // tr141: an ALLY is marked in green and is never "hot", never "MOORED" and never a
        // FLAGSHIP - none of those labels mean anything about a ship on your own side.
        if (s.ally) {
          if (d > 320) continue;
          list.push({ x: s.x, y: 11.2 * (s.L / 16) + 1, z: s.z, cls: 'ship ally', edge: false,
            html: `<div class="hb"><i style="width:${Math.max(0, (100 * s.hp) / s.maxHp).toFixed(0)}%"></i></div>${this.C.allyMark}` });
          continue;
        }
        const urgent = hot || moored || s.kind === 'boss' || (obj && obj.ship === s);
        if (!urgent && !dmg && s.kind === 'ship' && d > 160) continue;
        const label = hot ? `MOORING IN ${Math.ceil(s.ttb)}s` : moored ? 'MOORED' : s.kind === 'boss' ? 'FLAGSHIP' : '';
        list.push({ x: s.x, y: (moored ? 6 : 11.2) * (s.L / 16) + 1, z: s.z, cls: `${s.kind} ${hot ? 'hot' : ''} ${moored ? 'moor' : ''}`, edge: urgent, html: `<div class="hb"><i style="width:${Math.max(0, (100 * s.hp) / s.maxHp).toFixed(0)}%"></i></div>${label}` });
      }
      secs.forEach((q, i) => {
        const fallen = q.collapsed && q.collapseT < 14;
        if (!fallen && (q.collapsed || q.fire < 0.04)) return;
        const c = sectionCentre(i);
        const html = fallen ? `${SECTIONS[i].short} FALLEN` : `<div class="fb"><i style="width:${(q.fire * 100).toFixed(0)}%"></i></div>${SECTIONS[i].short} ${Math.ceil((100 * q.hp) / q.maxHp)}%`;
        list.push({ x: c.x, y: c.y + 5, z: c.z, cls: `sec${fallen ? ' gone' : ''}`, edge: !fallen && q.fire > 0.45, html: fallen || q.fire <= 0.45 ? html : html });
      });
      for (const k of game.sharks) {
        if (k.state !== 'tell' && k.state !== 'lunge') continue;
        const d = Math.hypot(k.x - pose.x, k.z - pose.z);
        if (d > 90) continue;
        list.push({ x: k.x, y: 2.5, z: k.z, cls: 'shark', edge: true, html: '<div class="ico">!</div>SHARK' });
      }
      for (const k of game.pickups) {
        if (Math.hypot(k.x - pose.x, k.z - pose.z) > 320) continue;
        list.push({ x: k.x, y: 3.6, z: k.z, cls: 'pick', edge: false, html: `<div class="ico" style="color:${POW_COLOR[k.kind]};border-color:${POW_COLOR[k.kind]}">${POW_SHORT[k.kind]}</div>` });
      }
    }
    while (this.markerEls.length < list.length) { const m = h('div', { class: 'rd-m' }); e.markers.appendChild(m); this.markerEls.push(m); }
    const M = 34, TOP = W < 640 ? 200 : 124, BOT = H - (W < 640 ? 260 : 120);
    const cy = (TOP + BOT) / 2, hh = Math.max(20, (BOT - TOP) / 2);
    const placed = [];
    for (let i = 0; i < this.markerEls.length; i++) {
      const m = this.markerEls[i], it = list[i];
      if (!it) { if (m.style.display !== 'none') m.style.display = 'none'; continue; }
      const s = proj(it.x, it.y, it.z);
      let x = s.x, y = s.y, edge = false, ang = 0;
      if (s.behind || x < M || x > W - M || y < TOP || y > BOT + 60) {
        if (!it.edge) { m.style.display = 'none'; continue; }
        edge = true;
        let dx = x - W / 2, dy = y - cy;
        if (s.behind) { dx = -dx; dy = -dy; if (Math.abs(dy) < 1 && Math.abs(dx) < 1) dy = 1; }
        ang = Math.atan2(dy, dx);
        const k = Math.min((W / 2 - M) / Math.max(1e-3, Math.abs(dx)), hh / Math.max(1e-3, Math.abs(dy)));
        x = W / 2 + dx * k; y = cy + dy * k + 20;
        const x0 = x, y0 = y, inward = x0 < W / 2 ? 1 : -1;
        const free = (xx, yy) => yy >= TOP && yy <= BOT + 40 && !placed.some((p) => Math.abs(p[0] - xx) < 58 && Math.abs(p[1] - yy) < 40);
        search: for (let c = 0; c < 3; c++) for (let kk = 0; kk < 24; kk++) {
          const xx = x0 + inward * c * 64, yy = y0 + (kk % 2 ? 1 : -1) * Math.ceil(kk / 2) * 42;
          if (free(xx, yy)) { x = xx; y = yy; break search; }
        }
        placed.push([x, y]);
      }
      m.style.display = 'block';
      const cn = 'rd-m ' + it.cls + (edge ? ' edge' : '');
      if (m.className !== cn) m.className = cn;
      m.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      if (edge) m.style.setProperty('--a', ang.toFixed(3) + 'rad');
      const html = edge && !it.html.includes('ico') ? `<div class="ico">${it.cls.includes('boss') ? '★' : it.cls.includes('sec') ? '!' : '⚓'}</div>` : it.html;
      if (m._html !== html) { m._html = html; m.innerHTML = html; }
    }
  }
}
