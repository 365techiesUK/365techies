// ASSIST - explicit, named, separately tunable, never hidden inside the
// physics (§6).
//
// Every function in here is a named cheat. None of them reach into the plant.
// The assist signature is stamped into every recorded run and every result, so
// a "true" run and an "arcade" run are never compared.

import { BAND } from './params.js';
import { hashString } from './rng.js';

export class Assist {
  constructor(params) {
    this.p = params;            // live reference to tuning.assist
    this.reset();
  }

  reset() {
    this.smoothed = 0;
    this.trimBias = 0;
  }

  // 1. Input smoothing. Takes the sting out of a nervous hand.
  //
  // Expressed as a time constant, not a per-tick lerp: at 120 Hz a "0.35"
  // blend factor would be an 11 ms filter, i.e. an assist that does nothing
  // while appearing to be switched on. 1.0 = 0.5 s of smear.
  shapeInput(raw, out, dt) {
    const s = this.p.inputSmoothing;
    if (s > 0) {
      const k = 1 - Math.exp(-dt / (s * 0.5));
      this.smoothed += (raw.lean - this.smoothed) * k;
    } else {
      this.smoothed = raw.lean;
    }
    out.lean = this.smoothed;
    out.turn = raw.turn;
    out.throttle = raw.throttle;
    out.boost = raw.boost;
    return out;
  }

  // 2. Auto trim. Nudges neutral stance toward the green band so a beginner
  //    is not fighting a slow drift as well as everything else.
  trim(plantState, dt) {
    if (!this.p.autoTrim) { this.trimBias = 0; return 0; }
    const mid = (BAND.lo + BAND.hi) / 2;
    const err = plantState.wingDepth - mid;     // too deep -> positive
    this.trimBias += (Math.max(-1, Math.min(1, -err * 0.35)) * 0.6 - this.trimBias) * dt * 1.5;
    return this.trimBias * (1.5 * Math.PI / 180);
  }

  // 3. Pitch rate ceiling near breach. The panic-jerk killer: when the wing is
  //    already close to the top, the commanded pitch is not allowed to climb
  //    fast. Applied to the COMMAND, not to the physics.
  limitPitchRate(rider, prevPitch, plantState, dt) {
    const ceil = this.p.alphaRateCeiling;
    if (!ceil) return;
    if (plantState.wingDepth > this.p.alphaCeilingDepth) return;
    const maxStep = ceil * (Math.PI / 180) * dt;
    const delta = rider.pitch - prevPitch;
    if (delta > maxStep) {
      rider.pitch = prevPitch + maxStep;
      rider.pitchRate = Math.min(rider.pitchRate, ceil * (Math.PI / 180));
    }
  }

  // 4. Mast length. 0.60 easy / 0.75 default / 0.90 expert - a longer mast is
  //    more room above the wing, i.e. a wider band to hunt for.
  get mastLength() { return this.p.mastLength; }

  get signature() {
    const p = this.p;
    return `M${Math.round(p.mastLength * 100)}` +
           `.S${Math.round(p.inputSmoothing * 100).toString().padStart(2, '0')}` +
           `.R${Math.round(p.alphaRateCeiling).toString().padStart(3, '0')}` +
           `.T${p.autoTrim ? 1 : 0}`;
  }

  get isTrue() {
    const p = this.p;
    return p.inputSmoothing === 0 && p.alphaRateCeiling === 0 && !p.autoTrim;
  }

  get hash() { return hashString(this.signature); }
}
