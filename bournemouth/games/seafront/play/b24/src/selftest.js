// The build-breaking checks (§5).
//
// "Restart under 400 ms, zero loading, zero navigation, zero click-to-continue.
//  State reset, never a scene reload. Make it a build-breaking automated check."
//
// Plus the two that make record/replay worth having: identical inputs from an
// identical state must produce an identical hash, and a replayed recording must
// land on the same hash as the run that produced it.

import { Sim, FIXED_DT } from './sim.js';
import { ScriptedInput, Recorder, ReplayInput } from './input.js';
import { cloneDefaults } from './params.js';
import { seaChecks } from './sea-selftest.js';

const RESET_BUDGET_MS = 400;
const TICKS = 1200;      // 10 s of riding
const SEA = 'poole-bay-modal';   // §4: the real modal Poole Bay state

function runScripted(sim, ticks) {
  const input = new ScriptedInput();
  for (let i = 0; i < ticks; i++) sim.step(input.sample(), FIXED_DT);
  return sim.hash.hex;
}

export function runSelfTest(logFn) {
  const log = logFn || (() => {});
  const results = [];
  const add = (name, pass, detail) => {
    results.push({ name, pass, detail });
    log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`);
  };

  // 1. Restart cost. This is a state reset; anything approaching the budget
  //    means something is being re-instantiated that should have been pooled.
  {
    const sim = new Sim(cloneDefaults());
    runScripted(sim, 600);
    let worst = 0, total = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const t0 = performance.now();
      sim.reset();
      const dt = performance.now() - t0;
      worst = Math.max(worst, dt);
      total += dt;
    }
    add('restart < 400 ms', worst < RESET_BUDGET_MS,
      `worst ${worst.toFixed(3)} ms, mean ${(total / N).toFixed(4)} ms over ${N}`);
  }

  // 2. Determinism: same params, same inputs, same hash - twice in the same
  //    object, so a reset that leaks state shows up here.
  {
    const sim = new Sim(cloneDefaults());
    const a = runScripted(sim, TICKS);
    sim.reset();
    const b = runScripted(sim, TICKS);
    const sim2 = new Sim(cloneDefaults());
    const c = runScripted(sim2, TICKS);
    add('deterministic after reset', a === b, `${a} vs ${b}`);
    add('deterministic across instances', a === c, `${a} vs ${c}`);
  }

  // 3. Record -> replay must reproduce the run exactly.
  {
    const sim = new Sim(cloneDefaults());
    const rec = new Recorder();
    rec.start();
    const input = new ScriptedInput();
    for (let i = 0; i < TICKS; i++) {
      const raw = input.sample();
      rec.push(raw);
      sim.step(raw, FIXED_DT);
    }
    rec.stop();
    const live = sim.hash.hex;

    const sim2 = new Sim(cloneDefaults());
    const replay = new ReplayInput(rec.toJSON({}));
    for (let i = 0; i < TICKS; i++) sim2.step(replay.sample(), FIXED_DT);
    add('replay reproduces run', live === sim2.hash.hex, `${live} vs ${sim2.hash.hex}`);
  }

  // 4. Sanity on the sourced numbers, so a slider drag cannot quietly leave the
  //    sim describing a boat that does not exist (§2).
  {
    const p = cloneDefaults().plant;
    const w = p.mass * p.g;
    const vTakeoff = Math.sqrt(w / (0.5 * p.rho * p.wingArea * 0.8));
    const kmh = vTakeoff * 3.6;
    add('takeoff 13-19 km/h', kmh >= 13 && kmh <= 19, `${kmh.toFixed(1)} km/h at CL 0.8`);

    const dLdV = p.rho * vTakeoff * p.wingArea * 0.8;
    add('dL/dV > 400 N per m/s', dLdV > 400,
      `${dLdV.toFixed(0)} N per m/s = ${(dLdV * 0.5 / w * 100).toFixed(0)}% of weight per 0.5 m/s`);
  }

  // 5. Top speed and cruise power, measured rather than asserted.
  {
    const sim = new Sim(cloneDefaults());
    // The current input contract. It used to be {thrUp, thrDown} and an object
    // missing `turn` silently produced NaN heading -> NaN world position -> a
    // NaN sea query, which reported itself as a serene "0.0 km/h flat out".
    const hold = { lean: 0, turn: 0, throttle: 1, boost: 1 };
    let vmax = 0;
    for (let i = 0; i < 3600; i++) {
      sim.step(hold, FIXED_DT);
      if (sim.plant.state.mode === 'FLYING') vmax = Math.max(vmax, sim.plant.state.speed);
    }
    const kmh = vmax * 3.6;
    add('top speed 40-58 km/h', kmh >= 40 && kmh <= 58, `${kmh.toFixed(1)} km/h flat out`);
  }

  const passed = results.every((r) => r.pass);
  log(passed ? 'ALL CHECKS PASSED' : 'SELF-TEST FAILED');
  return { passed, results };
}
