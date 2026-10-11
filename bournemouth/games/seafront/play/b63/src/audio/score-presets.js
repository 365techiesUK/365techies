// THE SCORE - PER-LEVEL PRESETS (tr184). Data only: no nodes, no context, no side effects.
// Read tmp-tr184/MUSIC-RESEARCH.md before changing a number in here. Most of them are not
// taste, they are the answer to a measured constraint.
//
// ⚠️ THE THREE BANDS THAT ARE NOT NEGOTIABLE
//
//   1. 270 Hz - 3010 Hz, PIRATE RAID ONLY. raid-audio.js:40 holds the crew's first three
//      formant centres (F1 270-730, F2 840-2290, F3 2240-3010). Those three resonances are
//      the ONLY thing that makes the corsairs read as men rather than as noise: there are no
//      consonants in that synth at all. Sustained music in that band erases them. The pirate
//      preset therefore uses SINE voices below 250 Hz - a sine has no harmonics, so nothing
//      of it can climb into the formant band however the filter moves - plus one quiet
//      shimmer above 3.2 kHz. It vacates the band by construction, not by EQ.
//
//   2. BELOW 100 Hz DURING A SIEGE. `collapse` runs a 70 Hz -> 25 Hz sine for 2.2 s and
//      cannon/boom live in the same place. A music sub there turns the biggest moment in the
//      game to mud. Every siege preset's band starts above 100 Hz. `smuggle` is the one level
//      where nothing is sunk and there is no collapse cue, so it is the one preset allowed a
//      real low register.
//
//   3. THERE IS NO FREE BAND ANYWHERE. The jetski's supercharger whine sweeps 680 Hz to
//      3.2 kHz with the throttle and its second partial reaches 6.4 kHz; the firing order runs
//      42.5-200 Hz; the cavitation fizz 1800-3600 Hz. You cannot slot music into a gap because
//      there is no gap - there is a moving object. What the music can do instead is be the one
//      SUSTAINED, HARMONICALLY STABLE thing in a design where all 55 cues are transients or
//      noise bands, which is Bregman stream segregation and is why this is a bed and not a
//      tune. If the bed ever grows a transient it stops being a separate stream and starts
//      being another cue competing with the engine, and it will lose.
//
// ⚠️ NO NATIONALITY FRAMING (CONTRACT.md §7). The raid presets use a QUINTAL voicing - root,
// fifth, octave, twelfth - with no third anywhere. A chord with no third is neither major nor
// minor, so it carries weight without carrying an ethnicity. That is also the historically
// honest position: the National Museum of Denmark's own summary is that we know virtually
// nothing about how Viking-age music was played, so the "Viking sound" everyone recognises is
// a modern invention and writing it would be a fiction as well as a contract breach. We score
// the siege, not the costume.

// ---------------------------------------------------------------------------------------------
// CYCLE LENGTHS. Eno's Music for Airports is 22 tape loops of deliberately incommensurable
// lengths fed simultaneously, so the combination effectively never recurs. That is a property
// of the construction and costs nothing, which is the whole reason this is generative rather
// than a loop: the raid is ~7 minutes, so a 60 s loop is 7 passes per attempt and 140 passes
// over twenty attempts.
//
// Each preset gets TEN periods - five amplitude cycles and five filter cycles. Written in
// TENTHS OF A SECOND so the arithmetic is exact integers and the claim is checkable: every set
// below is PAIRWISE COPRIME as a set of integers, and suites test-score.mjs proves it rather
// than trusting this comment. Coprime integers mean the combined cycle is the product, which
// is measured in centuries.
//
// They are stored as tenths and divided by 10 at use, so no float ever enters the coprimality
// argument.
const T = (a) => a.map((x) => x / 10);

// TWELVE periods per preset, not ten: five amplitude cycles, five filter cycles, one for the
// shimmer and one for the breath. Every one of the twelve is in the pairwise-coprime set, so
// nothing in the texture is ever locked to anything else in it.
const CYCLES = {
  // 17.3 19.1 23.9 31.1 41.3 s  |  13.1 16.7 20.9 27.7 35.9 s  |  shim 50.3  breath 57.1
  siege: { gain: T([173, 191, 239, 311, 413]), filt: T([131, 167, 209, 277, 359]), shim: 50.3, breath: 57.1 },
  // faster, lighter - the level with a clock
  quick: { gain: T([113, 149, 191, 239, 299]), filt: T([89, 127, 163, 211, 263]), shim: 34.7, breath: 40.1 },
  // mid, and the shortest cycle is short enough to feel like it is moving
  open: { gain: T([137, 199, 241, 293, 371]), filt: T([113, 151, 223, 269, 337]), shim: 45.7, breath: 41.9 },
  // very slow. This is a bed that breathes rather than one that moves.
  still: { gain: T([233, 299, 373, 439, 539]), filt: T([179, 227, 281, 349, 419]), shim: 46.3, breath: 50.9 },
};

// ---------------------------------------------------------------------------------------------
// ⚠️ THE SHIMMER, AND WHY EVERY PRESET NOW HAS ONE. [measured, tmp-tr184/score/bounce.log]
//
// The game locks landscape on touch and is aimed at phones, and a phone speaker rolls off hard
// below roughly 450-500 Hz. The first bounce of this module measured what that does: with the
// bed alone at -36 LUFS full-range, the same file through a phone-speaker simulation came back
// at -37 LUFS for the Viking raid, -67 for the Harbour Mouth and -69 for the smuggling run -
// against a jet ski at -15.5 LUFS through the same filter. In other words, on a phone most of
// this music did not exist at all, and the low pulse least of all.
//
// A bed that only works on headphones is a bed that does not work. So every preset carries one
// quiet, tuned, sustained voice in 3550-5000 Hz, which is the one register a phone reproduces
// well that is not already carrying information: it is above the crew's F3 at 3010 Hz, above
// the cavitation fizz which tops out at 3600 Hz, and the only engine content up there is the
// supercharger's SECOND partial, whose fundamental is fully audible an octave down and is not
// masked by anything here.
//
// ⚠️ It does not fix the problem, it improves it, and the numbers are in RESULT.md. Making this
// music prominent on a phone would mean putting it in 1-4 kHz, which is exactly where the fizz,
// the crew formants and the supercharger whine live. That trade is not available. The honest
// position is that on a phone speaker this score is present but faint, and that the level wants
// a human listening to it on a real handset - which nobody on this project has ever done.
const SHIM_BAND = [3550, 5000];

// A quintal stack, in semitones above the chord root. No interval in any of these is a third.
//   0 root  7 fifth  12 octave  14 ninth  17 eleventh  19 twelfth  24 two octaves
const IV = {
  quintal5: [0, 7, 12, 19, 24],
  quintal4: [0, 7, 12, 19],
  quintal3: [0, 7, 12],
  open5: [0, 7, 14, 19, 26],     // fifths with a ninth on top: open, never modal
  quartal5: [0, 7, 12, 17, 24],  // an eleventh in the middle - brighter, still no third
};

// `null` means SILENCE, and it means it. Free ride gets nothing: it is open-ended, has no
// clock, no threat and no goal, so there is nothing for music to adapt to and any music there
// is by definition static music - which in the one study that measured this (Plut & Pasquier
// 2019, N=30) scored BELOW silence on reported tension, 0.49 against 0.55. Meanwhile the
// engine layers, the hull rush, the wind and the cavitation fizz are already a continuous,
// load-responsive, information-bearing texture. The engine IS the music in free ride, and a
// bed would mask the one mode where a player can learn to read it.
export const PRESETS = {
  free: null,

  // RESCUE - urgency without menace. Nobody in this level is hostile and swimmers are never
  // shown in danger, so the register has to be urgent but NOT threatening, which is a
  // genuinely different thing. No pulse: a ticking clock is menace and there is no antagonist
  // here. If the level is going badly the answer is to THIN OUT, not to add threat, which is
  // what a falling `density` does.
  rescue: {
    label: 'Rescue',
    voices: 5, wave: 'triangle', iv: IV.open5,
    tonicHz: 98.0, band: [170, 1500], ceil: 2600,
    cycles: CYCLES.open,
    detune: [6, 14], spanFifths: 4,
    chordEvery: [22, 44],
    bright: [2.0, 4.6], dens: [0.45, 1.0],
    level: 0.075,
    noise: { band: [420, 1150], q: 0.9, level: 0.018 },
    shimmer: { band: SHIM_BAND, q: 5.2, level: 0.055, detune: 9 },
    pulse: null,
  },

  // VIKING RAID - a siege, ~7 minutes, six waves. Quintal, low, dark. Stays above 100 Hz so
  // the boom/collapse sub is left alone, and the pulse is THE WAVE NUMBER rather than a tempo:
  // wave 1 is roughly one pulse every 4 s, wave 6 roughly one every 1.5 s, and because it is
  // keyed to a discrete game state and not to a clock it cannot get out of step.
  'raid-norse': {
    label: 'Viking raid',
    voices: 5, wave: 'sawtooth', iv: IV.quintal5,
    tonicHz: 110.0, band: [108, 900], ceil: 1300,
    cycles: CYCLES.siege,
    detune: [7, 15], spanFifths: 3,
    chordEvery: [26, 58],
    bright: [1.7, 3.4], dens: [0.4, 1.0],
    level: 0.080,
    noise: { band: [150, 430], q: 1.1, level: 0.016 },
    shimmer: { band: SHIM_BAND, q: 5.2, level: 0.05, detune: 9 },
    pulse: { hz: 124, slow: 4.0, fast: 1.5, level: 0.10, attack: 0.055, decay: 0.55 },
  },

  // PIRATE RAID - the same siege, different people, and the difference is WHERE the music is
  // allowed to be rather than what it plays. The crew's whole characterisation is three
  // formants between 270 Hz and 3010 Hz, so the bed vacates that band entirely: three SINE
  // voices under 250 Hz (a sine has no harmonics, so this is airtight and not a filter
  // promise) and one quiet shimmer above 3.2 kHz. The shimmer is also the only part of this
  // preset a phone speaker can reproduce, which is deliberate - see the phone-sim bounce.
  //
  // Brighter than the Norse level: a corsair is quicker than a longship and that difference
  // belongs in timbre. Nothing here pitches `runout`, `heave`, `drum`, `block` or `creak` -
  // the ship is already the percussion section and pitching her would turn her into a drone.
  'raid-pirate': {
    label: 'Pirate raid',
    voices: 3, wave: 'sine', iv: IV.quintal3,
    tonicHz: 110.0, band: [104, 250], ceil: 260,
    cycles: CYCLES.siege,
    detune: [5, 11], spanFifths: 3,
    chordEvery: [20, 46],
    bright: [1.05, 1.25], dens: [0.5, 1.0],
    level: 0.048,
    noise: null,
    shimmer: { band: SHIM_BAND, q: 5.2, level: 0.115, detune: 9 },
    pulse: { hz: 132, slow: 3.6, fast: 1.4, level: 0.095, attack: 0.05, decay: 0.48 },
  },

  // THE HARBOUR MOUTH (Old Harry) - timing and position, not attrition. So the music is the
  // steadiest thing in the game: an UNCHANGING pulse, slow, metronomic, never speeding up,
  // because it is a clock you can steer to. `slow` and `fast` are deliberately equal - the
  // pulse ignores its state input here, and that is the point, not an oversight.
  // Lowest density of the three combat levels: Old Harry is open water and a big sky.
  arena: {
    label: 'Harbour mouth',
    voices: 4, wave: 'triangle', iv: IV.quintal4,
    tonicHz: 130.8, band: [128, 900], ceil: 1500,
    cycles: CYCLES.siege,
    detune: [6, 13], spanFifths: 4,
    chordEvery: [20, 38],
    bright: [1.9, 3.8], dens: [0.3, 0.8],
    level: 0.070,
    noise: { band: [300, 900], q: 1.0, level: 0.014 },
    shimmer: { band: SHIM_BAND, q: 5.2, level: 0.062, detune: 9 },
    pulse: { hz: 116, slow: 2.4, fast: 2.4, level: 0.075, attack: 0.07, decay: 0.7 },
  },

  // THE DORSET SMUGGLING RUN - ~200 s, night, nothing is sunk. The best idea available in this
  // whole design is restraint. Near-silence is the DEFAULT here: one low sustained note
  // breathing on a slow cycle, density 0.2.
  //
  // ⚠️ And the music cuts out entirely while the player is creeping - see Score.silence(). The
  // `creepdrag` cue is a gated, deliberately quiet loop at 240-300 Hz with a 1.6-2.4 kHz chain
  // band; it is the sound of searching, and searching is a listening activity. Taking the
  // music away the moment creeping starts is worth more than any amount of added tension
  // music. Tension from absence.
  //
  // No pulse at any point: a beat at night on a revenue cutter is a genre signal from a
  // different film. Register below the creepdrag band, so under ~230 Hz - and this is the one
  // level with no collapse cue, so it is the one level allowed a real low end.
  smuggle: {
    label: 'Smuggling run',
    voices: 3, wave: 'triangle', iv: IV.quintal3,
    tonicHz: 73.4, band: [58, 230], ceil: 340,
    cycles: CYCLES.still,
    detune: [4, 9], spanFifths: 2,
    chordEvery: [34, 60],
    bright: [1.4, 3.0], dens: [0.2, 0.62],
    level: 0.062,
    noise: { band: [110, 300], q: 1.2, level: 0.012 },
    shimmer: { band: SHIM_BAND, q: 5.2, level: 0.048, detune: 9 },
    pulse: null,
  },

  // THE STUNT STAGE - 120 s, a hard timer, and the only level where a beat is unambiguously
  // right. THE MUSIC IS THE TIMER: density and brightness step up at 90 / 60 / 30 / 10 s
  // remaining, which is four discrete states a player learns, and it means they stop looking
  // at the HUD. The pulse is steady and moderate - not fast; the craft supplies the speed and
  // the arrival of a ramp supplies the event.
  stunt: {
    label: 'Stunt stage',
    voices: 5, wave: 'sawtooth', iv: IV.quartal5,
    tonicHz: 146.8, band: [150, 2000], ceil: 3000,
    cycles: CYCLES.quick,
    detune: [8, 16], spanFifths: 4,
    chordEvery: [18, 34],
    bright: [2.2, 5.2], dens: [0.35, 1.0],
    level: 0.072,
    noise: { band: [700, 1900], q: 0.8, level: 0.016 },
    shimmer: { band: SHIM_BAND, q: 5.2, level: 0.035, detune: 9 },
    pulse: { hz: 108, slow: 1.35, fast: 1.05, level: 0.085, attack: 0.045, decay: 0.42 },
  },
};

// The four discrete stunt states, as seconds remaining -> [density, brightness]. Discrete on
// purpose: a continuous ramp over 120 s is a ramp nobody notices, four steps is something a
// player can learn. Read by Score.stuntDial(); nothing else uses it.
export const STUNT_STEPS = [
  [90, 0.25, 0.20],
  [60, 0.45, 0.42],
  [30, 0.70, 0.66],
  [10, 0.90, 0.88],
  [0, 1.00, 1.00],
];

export const LEVELS = Object.keys(PRESETS);
