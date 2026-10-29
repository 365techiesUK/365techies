# 365 Pinball Hero - table sim tools

15 Oct 2026; any table, 16 Oct 2026. Never deployed. These load the real engine (`games/pinball/engine.js`, which
reads the tables: `games/pinball/table.js` is the old space table "orbit", `games/pinball/tables/ember.js` is Ember
Peak) in node and play it without a screen, so a table can be checked and tuned by numbers instead of by feel alone.
`games/pinball/engine.test.mjs` runs a smaller, fixed batch of the same checks on both tables:

    node --test games/pinball/engine.test.mjs        (43 tests, about 25 seconds)

Run everything from the repository root. **Every tool works on Ember Peak unless you add `--orbit`** (or
`--table=<id>`); code calls `S.use(id)` from `sim.cjs`.

| Tool | What it does |
|---|---|
| `sim.cjs` | Shared helpers: a world with no ball in it (options: targets down, lava gates up, geyser off, crabs still or removed), drop a ball anywhere, "is this spot free?", the auto-flipper bot (a side's button works all that side's flippers), and a watcher that looks at every physics substep for a ball inside a wall or a closed space, through a wall, the wrong way through a one-way gate or a closed lava gate, or off the table. |
| `traps.cjs` | The trap finder. `node tools/pinball/traps.cjs [balls=3000] [secs=20] [workers=16]` drops balls at random free spots with random speeds (some with the targets down, the lava gates up or a quake waiting) and lets the bot play each one. Reports every ball that rests or circles without scoring, wedges, tunnels or escapes, how often the ball search fired, any flipper touched by a ball from outside that flipper's storey's approach zone, any quake pulling while a ball is below an approach line, and how long balls take from crossing each approach line to a flipper. `--corners` lets slow balls go on a fine grid round every named corner. `--games [n]` plays whole games with the bot. `--one <n>` replays one ball and prints its path. |
| `shots.cjs` | The shot map. `node tools/pinball/shots.cjs [speed] [--detail]` cradles the ball on every flipper (and rolls it down each inlane, or the summit deck's floor), flips after a delay swept in 1/600 s steps, and reports what each flip reaches first and the timing window (ms) for each target. `--fan <flipper 0-3> <cradle\|inlane> [speed] [inlane speed] [from ms] [to ms] [step ms] [down]` draws the shots. |
| `plunger.cjs` | Pull (frames held) to where the launch first goes: falls back, the right orbit, the bumpers, a skill lane, round the arch. |
| `features.cjs` | Plays each feature and prints the detail. Both tables: kickback, ramp, orbits and the LOOP, one-way gates, ball save, tilt, extra ball, bonus, game over, `E.clone`. Orbit: the hangar. Ember Peak: the crater (hold, release step, sky carry, wire rail, back into the left inlane), geyser, crabs, lava gates, quake, pressure, storeys. |
| `feel.cjs` | The table in real units (1 unit = 1.9 mm): flipper swing time and tip speed, ball speed off the flipper, bumper and sling kicks. |
| `paths.cjs` | `node tools/pinball/paths.cjs <speed> <steps> x,y,vx,vy ...` draws the paths of balls let go anywhere. |
| `table-view.cjs` | Draws a table exactly as the engine sees it (colliders, toys, ramp and carry paths, sensors, storeys and approach lines), with the last tool's `overlay.js` on top: `node tools/pinball/table-view.cjs out.svg` or `--png out.png` (headless Edge). |
| `view.html` | The old viewer (the orbit table only). |

The engine has one hook for these tools: if a world has `W.onSub` set, it is called after every physics substep. The
game never sets it (and `E.clone` leaves it behind).

## Ember Peak on 29 Oct 2026: one screen (Classic unless said)

- 270 x 470 (was 270 x 680 with two storeys): the owner's call, so the home view is full size on a phone. One storey
  (`island`, flippers 0 and 1, approach line y 324); the lower part is the old table's, 24 down. No upper flipper.
- Layout: volcano (84,118, r 22, mouth tilted to the right flipper, half 15 deg) top left; skill lanes and three
  fumaroles top right; lava lanes x 30-54 / 196-220 inside the orbits, mouths at the bottom (gates across y 222);
  geyser (104,204); heat ramp lane x 128-154 (entry y 238) up over the fumaroles and down over the right orbit into
  the right inlane; three obsidian drops (157,236)-(187,246) across the foot of the vent, its floor right behind them;
  crabs at y 150 (x 124-150) and y 252 (x 74-96). The sky carry rides the wire rail down x 14-35 into the left inlane.
- Trap finder: 10,000 balls, 38.6 ball-hours (gates up, quakes and all): nothing stuck, nothing through a wall or a
  gate, no flipper reached from outside the approach zone, no quake pulling with a ball below the line, ball search 0.
  Corners: 49,460 slow balls round 43 corners, none came to rest. 60 whole bot games (176 minutes): 0 searches,
  median score 8.2 million; per game 1.4 craters, 1.4 ramps, 2.7 orbits, 0.8 geysers, 13 crabs, 6 drops.
- From crossing the approach line to the flipper: min 0.055 s, 1% 0.115 s, median 0.38 s.
- Longest timing windows (Gentle / Classic / Fast, ms): left orbit (right flipper) 35 / 23 / 23, right orbit (left)
  33 / 23 / 23, heat ramp 50 / 67 / 52 (mostly the left flipper), obsidian 53 / 52 / 47, crater 15 / 58 / 17 (right
  flipper), lava L across from the right flipper 32 / 30 / 18, lava R from the left 28 / 28 / 15, crabs 45-83. The
  crabs walk, so some windows change with where they are.
- Plunger: up to 0.12 of a pull is a tap (the machine's shot, down the right orbit to the right flipper); 0.13-0.19
  falls back; 0.20-0.47 the right orbit; 0.48-0.76 the three skill lanes (lane 2 six frames, lane 1 five, lane 0 three);
  from 0.80 round the arch and down the left orbit.

## The old table ("orbit") on 15 Oct 2026

- Trap finder: 10,000 balls, 48 ball-hours: nothing stuck, nothing through a wall, ball search fired 0 times.
  Corners: 29,804 slow balls round 27 corners, none came to rest. 90 whole bot games (4.5 hours): 0 searches.
- Longest timing window from a flipper: left orbit 23 ms, right orbit 25 ms, warp ramp 25 ms, drop targets 85 ms,
  hangar (targets down) 48 ms. Gentle's windows are about 12% wider, Fast's about 10% narrower.
- Flipper: up in 25 ms, tip 3.2 m/s; ball off the flipper up to 3.6 m/s (90th percentile) and 3.9 m/s best.
