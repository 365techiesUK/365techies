// RIDER - where feel lives (§6).
//
// Input does not set angle of attack. It sets a TARGET BODY PITCH, reached
// through a spring-damper with stiffness, damping, 200-400 ms lag and a rate
// limit. Porpoising emerges from that lag against the plant's V^2 lift gain.
// It is never animated, and there is no code in here that detects it.
//
// Damping is the hidden skill stat that improves over early sessions - which is
// how real riders actually improve. Switch `skillRamp` on to model that.

export class Rider {
  constructor(params) {
    this.p = params;            // live reference to tuning.rider
    this.reset();
  }

  reset() {
    this.pitch = 0;             // actual body pitch (rad)
    this.pitchRate = 0;
    this.commanded = 0;         // lagged, rate-limited target
    this.throttle = 0;
    this.foilTime = 0;          // seconds of clean flight, drives the skill ramp
  }

  get damping() {
    const p = this.p;
    if (!p.skillRamp) return p.damping;
    const t = Math.min(1, this.foilTime / Math.max(1, p.skillRampTime));
    return p.dampingNovice + (p.dampingPractised - p.dampingNovice) * t;
  }

  // input: { lean: -1..1, turn: -1..1, throttle: 0..1, boost: 0|1 }
  step(input, dt, flying, trimBias = 0) {
    const p = this.p;

    // The trigger hand. Every device hands us a target; the hand is what cannot
    // step instantly. Punching it for the pop-up is a different motion from
    // feathering it, hence the 3x on boost.
    const thrTarget = input.boost ? 1 : input.throttle;
    const rate = p.throttleRate * (input.boost ? 3 : 1) * dt;
    const d = thrTarget - this.throttle;
    this.throttle = Math.max(0, Math.min(1, this.throttle + Math.max(-rate, Math.min(rate, d))));

    // Where the rider is trying to put their weight.
    const target = p.trim + trimBias + input.lean * p.maxLean;

    // First-order lag: the 200-400 ms between deciding and the body arriving.
    const k = 1 - Math.exp(-dt / Math.max(0.01, p.inputLag));
    let next = this.commanded + (target - this.commanded) * k;

    // Rate limit: a body has a top speed.
    const maxStep = p.rateLimit * dt;
    const delta = next - this.commanded;
    this.commanded += Math.max(-maxStep, Math.min(maxStep, delta));

    // Spring-damper to the commanded stance. Underdamp this and the rider
    // fights themselves; that fight is porpoising.
    const acc = p.stiffness * (this.commanded - this.pitch) - this.damping * this.pitchRate;
    this.pitchRate += acc * dt;
    this.pitch += this.pitchRate * dt;

    if (flying) this.foilTime += dt;
  }
}
