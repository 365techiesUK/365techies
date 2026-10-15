# 365 Pinball Hero - table sim tools

15 Oct 2026. Never deployed. These load the real engine (`games/pinball/engine.js`, which reads
`games/pinball/table.js`) in node and play it without a screen, so the table can be checked and tuned by numbers
instead of by feel alone. `games/pinball/engine.test.mjs` runs a smaller, fixed batch of the same checks:

    node --test games/pinball/engine.test.mjs        (about 10 seconds)

Run everything from the repository root.

| Tool | What it does |
|---|---|
| `sim.cjs` | Shared helpers: a world with no ball in it, drop a ball anywhere, "is this spot free?", the auto-flipper bot, and a watcher that looks at every physics substep for a ball inside a wall, through a wall, the wrong way through a one-way gate, or off the table. |
| `traps.cjs` | The trap finder. `node tools/pinball/traps.cjs [balls=3000] [secs=20] [workers=16]` drops balls at random free spots with random speeds and lets the bot play each one. Reports every ball that rests or circles without scoring, wedges, tunnels or escapes, and how often the engine's ball search had to fire. `--corners` lets slow balls go on a fine grid round every named corner. `--games [n]` plays whole games with the bot. `--one <n>` replays one ball and prints its path. |
| `shots.cjs` | The shot map. `node tools/pinball/shots.cjs [speed] [--detail]` cradles the ball on each flipper (and rolls it down each inlane), flips after a delay swept in 1/600 s steps, and reports what each flip reaches first and the timing window (ms) for each target. `--fan <side> <cradle\|inlane> [speed] [inlane speed] [from ms] [to ms] [step ms] [down]` draws the shots. |
| `plunger.cjs` | Pull (frames held) to where the launch first goes: falls back, the bumpers, a top lane (skill shot), round the arch. |
| `features.cjs` | Plays each feature and prints the detail: kickback, hangar and its targets, the ramp's return, orbits and the LOOP, the one-way gates, ball save, tilt, extra ball, bonus count-up, game over. |
| `feel.cjs` | The table in real units (1 unit = 1.9 mm): flipper swing time and tip speed, ball speed off the flipper, bumper and sling kicks. |
| `paths.cjs` | `node tools/pinball/paths.cjs <speed> <steps> x,y,vx,vy ...` draws the paths of balls let go anywhere. |
| `view.html` | Draws the table exactly as the engine sees it, at 3x, with whatever the last tool wrote to `overlay.js` on top (trap spots, shot fans, paths). Open it from disk, or take a picture: `msedge --headless=new --screenshot=out.png --window-size=830,1360 file:///D:/claude/365-techies-pinball/tools/pinball/view.html` |

The engine has one hook for these tools: if a world has `W.onSub` set, it is called after every physics substep. The
game never sets it.

## What the numbers looked like on 15 Oct 2026 (Classic)

- Trap finder: 10,000 balls, 48 ball-hours: nothing stuck, nothing through a wall, ball search fired 0 times.
  Corners: 29,804 slow balls round 27 corners, none came to rest. 90 whole bot games (4.5 hours): 0 searches.
- Longest timing window from a flipper: left orbit 23 ms, right orbit 25 ms, warp ramp 25 ms, drop targets 85 ms,
  hangar (targets down) 48 ms. Gentle's windows are about 12% wider, Fast's about 10% narrower.
- Plunger: up to 0.12 of a pull is a tap (the machine's medium shot, down the right orbit to the right flipper);
  just over that falls back; about 0.52 to 0.73 drops into the top lanes (about 4 frames of hold for each lane);
  from about 0.75 the ball goes round the arch.
- Flipper: up in 25 ms, tip 3.2 m/s; ball off the flipper up to 3.6 m/s (90th percentile) and 3.9 m/s best.
