// Every constant in this file, and where it came from.
//
// SPEC §6: three layers, and the separation is the trick.
//   PLANT  - honest physics. Never touched for feel. Every constant sourced.
//   RIDER  - where feel lives.
//   ASSIST - explicit, named, separately tunable, never hidden in the physics.
//
// The tuning panel enforces this: PLANT sliders are locked by default. That is
// the Blue Storm trap guard (§6) built into the tool rather than written on a
// wall.

export const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------
// PLANT - sourced physical constants (§2)
// ---------------------------------------------------------------------------
export const PLANT_DEFAULTS = {
  rho: 1025,              // kg/m^3   seawater
  g: 9.81,                // m/s^2
  mass: 110,              // kg       80 kg rider + ~30 kg rigged board

  // Front wing. 0.13-0.17 m^2 covers beginner / Lift 200 HA class wings.
  wingArea: 0.15,         // m^2
  wingChord: 0.20,        // m        mean chord - sets the free-surface length scale
  aspectRatio: 6.0,
  oswald: 0.85,
  cl0: 0.15,              // camber lift at zero alpha
  clAlpha: 4.2,           // /rad     finite-aspect-ratio lift slope
  alphaStall: 12 * DEG,
  clStallDrop: 0.55,      // post-stall CL multiplier - mushy, not a cliff
  cd0Wing: 0.0075,        // ref wingArea
  cdaMast: 0.00045,       // m^2      lumped Cd*A of mast + fuselage
  wingIncidence: 2 * DEG, // fixed mounting angle to the board

  mastLength: 0.75,       // m        ASSIST overrides this (0.60/0.75/0.90)

  // Ventilation. Air is drawn down the suction side and lift collapses
  // *instantly* (§2). Latched with hysteresis, because a real air cavity
  // persists until the wing gets back down into solid water.
  ventDepth: 0.12,        // m        latch below this wing depth
  reattachDepth: 0.40,    // m        unlatch above this
  ventFlushTime: 0.35,    // s        AND the cavity has to be swept away first
  ventLiftFactor: 0.22,   // residual lift once ventilated
  surfaceLossGain: 0.75,  // free-surface lift loss near the top
  surfaceLossScale: 0.55, // in chords

  // Motor. Fliteboard 4 kW, Lift ~5 kW. Takeoff draws 2.5-4.5 kW against
  // 1-1.5 kW cruising - that gap is the pop-up.
  motorPowerMax: 5000,    // W
  propEtaPeak: 0.60,
  propEtaPeakSpeed: 9.0,  // m/s   efficiency peak
  propEtaSpan: 12.0,      // m/s   falloff width - this is what caps top speed
  thrustStaticMax: 850,   // N

  // Hull. The wetted-area collapse is the whole pop-up feel (§2): less hull ->
  // more speed -> more lift (V^2) -> less hull. Positive feedback.
  hullCdA: 0.040,         // m^2   Cd*A at full wetted area
  hullWetDepth: 0.14,     // m     submersion giving full wetted area
  hullKnee: 0.30,         // wetted fraction below which drag falls off a cliff
  hullStiffness: 5400,    // N/m   floats 110 kg at ~0.20 m submersion
  hullDampingZeta: 0.75,
  hullSubMax: 0.35,       // m     buoyancy stops growing (board fully under)
  slapSpeed: 1.35,        // m/s   downward at touchdown = catapult
};

// Provenance shown in the panel, so nobody quietly "improves" a sourced number.
export const PLANT_SOURCES = {
  mass: 'Lift / Fliteboard rigged weights + 80 kg rider',
  wingArea: 'Lift 200 HA class / beginner front wings, 0.13-0.17 m^2',
  motorPowerMax: 'Fliteboard 4 kW, Lift Gen5 ~5 kW',
  ventDepth: 'Ventilation onset ~0.5-1 chord below the surface',
  hullCdA: 'Calibrated to 2.5-4.5 kW takeoff draw (foil.zone telemetry)',
  cd0Wing: 'Calibrated to 1-1.5 kW cruise at 30-40 km/h',
  propEtaSpan: 'Top speed is prop-pitch limited, ~50 km/h (expert only)',
};

// ---------------------------------------------------------------------------
// RIDER - where feel lives (§6)
//
// Input does NOT set angle of attack. It sets a target body pitch, reached
// through a spring-damper with lag and a rate limit. Porpoising emerges from
// V^2 gain + input lag + low damping. It is never animated.
// ---------------------------------------------------------------------------
export const RIDER_DEFAULTS = {
  maxLean: 9 * DEG,       // rad    body pitch authority
  trim: 1.2 * DEG,        // rad    neutral stance
  inputLag: 0.26,         // s      §6 says 200-400 ms
  rateLimit: 55 * DEG,    // rad/s  how fast a body can actually move
  stiffness: 42,          // 1/s^2  spring to commanded pitch
  damping: 7.5,           // 1/s    THE hidden skill stat
  skillRamp: 0,           // 1 = damping improves with time on foil
  skillRampTime: 180,     // s of clean foiling to reach practised
  dampingNovice: 5.2,
  dampingPractised: 9.6,
  throttleRate: 1.4,      // /s     how fast the trigger hand moves
};

// ---------------------------------------------------------------------------
// ASSIST - explicit, named, separately tunable, never inside the physics (§6)
//
// Assist state is stamped into every run so a "true" run and an "arcade" run
// are never compared.
// ---------------------------------------------------------------------------
export const ASSIST_DEFAULTS = {
  mastLength: 0.75,       // m   0.60 easy / 0.75 default / 0.90 expert
  inputSmoothing: 0.0,    // 0-1 extra low-pass on lean
  alphaRateCeiling: 0,    // deg/s cap on commanded pitch rate near breach, 0=off
  alphaCeilingDepth: 0.30,// m   engage below this wing depth
  autoTrim: 0,            // 1 = nudge trim toward the green band
  // How long the wing may be clear of the water before it counts as a breach.
  // An ASSIST, not physics: the plant still detects the breach honestly, this
  // only decides how forgiving the verdict is. Measured need, not taste - with
  // zero grace a pilot with a human 180 ms reaction lag wipes out 36 times a
  // minute and 100% of those are BREACH (tools/wipeout-census.mjs).
  breachGrace: 0.30,      // s   0.42 easy / 0.30 default / 0.10 expert
  // rollSelfCentring: not applicable - v1 gate is longitudinal only.
};

export const ASSIST_PRESETS = {
  // breachGrace read off the sweep in tools/wipeout-census.mjs, which has a
  // CLIFF between 0.25 and 0.35 s: 18 wipes/min becomes 0. Nearly every breach
  // is a transient pop lasting under a third of a second, so grace below ~0.25
  // barely helps and grace above ~0.35 makes breaching free. The interesting
  // range is narrow and the shipped values straddle it.
  easy:    { mastLength: 0.60, inputSmoothing: 0.35, alphaRateCeiling: 45, autoTrim: 1, breachGrace: 0.42 },
  default: { mastLength: 0.75, inputSmoothing: 0.00, alphaRateCeiling: 0,  autoTrim: 0, breachGrace: 0.30 },
  // Expert is the honest case, but NOT zero: at 0 the rule fires after a single
  // 8.3 ms tick of the wing touching the surface, which is a threshold no rider
  // could ever react to and is closer to a numerical artefact than a skill test.
  // 0.20 sits just BELOW the cliff, so expert is genuinely punishing (about 18
  // wipes a minute) without being a coin toss.
  expert:  { mastLength: 0.90, inputSmoothing: 0.00, alphaRateCeiling: 0,  autoTrim: 0, breachGrace: 0.20 },
};

// The green band: close enough to the surface that the foil is fast and alive,
// far enough that it has not ventilated. Holding this is the verb (§1).
export const BAND = { lo: 0.16, hi: 0.32 };   // wing depth, metres

// ---------------------------------------------------------------------------
// Panel schema
// ---------------------------------------------------------------------------
export const SCHEMA = {
  plant: [
    { k: 'mass',         label: 'All-up mass',        min: 70,   max: 150,  step: 1,     unit: 'kg' },
    { k: 'wingArea',     label: 'Front wing area',    min: 0.08, max: 0.30, step: 0.005, unit: 'm²' },
    { k: 'clAlpha',      label: 'Lift slope',         min: 2.5,  max: 6.0,  step: 0.1,   unit: '/rad' },
    { k: 'alphaStall',   label: 'Stall angle',        min: 6,    max: 20,   step: 0.5,   unit: '°', deg: true },
    { k: 'cd0Wing',      label: 'Wing Cd0',           min: 0.004,max: 0.02, step: 0.0005,unit: '' },
    { k: 'wingIncidence',label: 'Wing incidence',     min: -2,   max: 6,    step: 0.1,   unit: '°', deg: true },
    { k: 'ventDepth',    label: 'Ventilation depth',  min: 0.02, max: 0.30, step: 0.01,  unit: 'm' },
    { k: 'reattachDepth',label: 'Reattach depth',     min: 0.15, max: 0.70, step: 0.01,  unit: 'm' },
    { k: 'ventFlushTime',label: 'Cavity flush time',  min: 0,    max: 1.2,  step: 0.05,  unit: 's' },
    { k: 'motorPowerMax',label: 'Motor power',        min: 2000, max: 8000, step: 100,   unit: 'W' },
    { k: 'hullCdA',      label: 'Hull Cd·A (wetted)', min: 0.01, max: 0.09, step: 0.002, unit: 'm²' },
    { k: 'hullKnee',     label: 'Hull drag knee',     min: 0.05, max: 0.9,  step: 0.05,  unit: '' },
    { k: 'slapSpeed',    label: 'Touchdown slap limit',min: 0.5, max: 3.5,  step: 0.05,  unit: 'm/s' },
  ],
  rider: [
    { k: 'maxLean',    label: 'Lean authority',   min: 3,    max: 20,  step: 0.5,  unit: '°', deg: true },
    { k: 'trim',       label: 'Neutral trim',     min: -2,   max: 5,   step: 0.1,  unit: '°', deg: true },
    { k: 'inputLag',   label: 'Input lag',        min: 0.05, max: 0.60, step: 0.01, unit: 's' },
    { k: 'rateLimit',  label: 'Body rate limit',  min: 15,   max: 200, step: 5,    unit: '°/s', deg: true },
    { k: 'stiffness',  label: 'Stance stiffness', min: 10,   max: 120, step: 1,    unit: '1/s²' },
    { k: 'damping',    label: 'Stance damping ★', min: 1.5,  max: 20,  step: 0.1,  unit: '1/s' },
    { k: 'skillRamp',  label: 'Skill ramp on',    min: 0,    max: 1,   step: 1,    unit: '' },
    { k: 'throttleRate',label:'Trigger rate',     min: 0.4,  max: 4,   step: 0.1,  unit: '/s' },
  ],
  assist: [
    { k: 'mastLength',       label: 'Mast length',       min: 0.5,  max: 1.1, step: 0.05, unit: 'm' },
    { k: 'inputSmoothing',   label: 'Input smoothing',   min: 0,    max: 0.9, step: 0.05, unit: '' },
    { k: 'alphaRateCeiling', label: 'Pitch rate ceiling',min: 0,    max: 120, step: 5,    unit: '°/s' },
    { k: 'alphaCeilingDepth',label: 'Ceiling engages at',min: 0.1,  max: 0.6, step: 0.02, unit: 'm' },
    { k: 'autoTrim',         label: 'Auto trim',         min: 0,    max: 1,   step: 1,    unit: '' },
  ],
};

export function cloneDefaults() {
  return {
    plant: { ...PLANT_DEFAULTS },
    rider: { ...RIDER_DEFAULTS },
    assist: { ...ASSIST_DEFAULTS },
  };
}
