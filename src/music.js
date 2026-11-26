// Music and sound effects, as DATA (no audio files, no Phaser). audio.js plays them with the Web Audio API.
//
// A THEME is a tiny recipe: key, scale, tempo, a chord progression and a few "feel" settings. buildPattern() turns a recipe
// into a looping list of notes (8 bars, 8 steps per bar). The same recipe is deterministic: it plays the same tune every time.
// NIGHT is a calmer version of any theme: slower, softer, sparser, with a gentle pad underneath.

export const STEPS_PER_BAR = 8;
export const BARS = 8;
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  dominant: [0, 1, 4, 5, 7, 8, 10], // "phrygian dominant": the desert sound
  penta: [0, 2, 4, 7, 9],
  pentaMinor: [0, 3, 5, 7, 10],
};

export const midiToFreq = (m) => 440 * 2 ** ((m - 69) / 12);

// the note `degree` steps up the scale from the root (negative = below, past the end = next octave)
export function scaleNote(root, scale, degree) {
  const n = scale.length;
  const oct = Math.floor(degree / n);
  return root + 12 * oct + scale[((degree % n) + n) % n];
}

// small seeded random numbers, so a theme always sounds the same
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// root = MIDI note of the tonic (60 = middle C); prog = 4 chord roots as scale degrees (each lasts 2 bars);
// lead/bass = waveforms; density = chance of a melody note on each step; octave = melody octave offset (in octaves)
export const THEMES = {
  title:   { root: 60, scale: 'penta',      bpm: 78,  prog: [0, 3, 4, 0], lead: 'triangle', bass: 'sine',     density: 0.45, octave: 0,  seed: 11, pad: true },
  town:    { root: 60, scale: 'major',      bpm: 108, prog: [0, 4, 5, 3], lead: 'triangle', bass: 'sine',     density: 0.62, octave: 0,  seed: 21 },
  farm:    { root: 67, scale: 'penta',      bpm: 96,  prog: [0, 2, 3, 0], lead: 'triangle', bass: 'sine',     density: 0.55, octave: 0,  seed: 31 },
  forest:  { root: 62, scale: 'dorian',     bpm: 88,  prog: [0, 5, 3, 4], lead: 'sine',     bass: 'triangle', density: 0.5,  octave: 0,  seed: 41 },
  quarry:  { root: 57, scale: 'mixolydian', bpm: 100, prog: [0, 6, 3, 4], lead: 'square',   bass: 'triangle', density: 0.5,  octave: 0,  seed: 51, soft: true },
  cave:    { root: 52, scale: 'phrygian',   bpm: 66,  prog: [0, 1, 0, 6], lead: 'sine',     bass: 'sine',     density: 0.28, octave: 0,  seed: 61, pad: true },
  crystal: { root: 64, scale: 'lydian',     bpm: 84,  prog: [0, 1, 4, 0], lead: 'sine',     bass: 'sine',     density: 0.6,  octave: 1,  seed: 71, pad: true },
  market:  { root: 57, scale: 'minor',      bpm: 94,  prog: [0, 5, 3, 4], lead: 'square',   bass: 'triangle', density: 0.55, octave: 0,  seed: 81, soft: true },
  peaks:   { root: 59, scale: 'pentaMinor', bpm: 74,  prog: [0, 3, 4, 3], lead: 'sine',     bass: 'sine',     density: 0.4,  octave: 0,  seed: 91, pad: true },
  ruins:   { root: 55, scale: 'dorian',     bpm: 72,  prog: [0, 3, 6, 4], lead: 'sine',     bass: 'triangle', density: 0.42, octave: 0,  seed: 101, pad: true },
  desert:  { root: 57, scale: 'dominant',   bpm: 94,  prog: [0, 1, 0, 4], lead: 'triangle', bass: 'triangle', density: 0.55, octave: 0,  seed: 111 },
  bazaar:  { root: 57, scale: 'dominant',   bpm: 112, prog: [0, 4, 1, 0], lead: 'square',   bass: 'triangle', density: 0.65, octave: 0,  seed: 121, soft: true },
  school:  { root: 65, scale: 'major',      bpm: 100, prog: [0, 3, 4, 0], lead: 'triangle', bass: 'sine',     density: 0.5,  octave: 0,  seed: 131 },
  garden:  { root: 62, scale: 'penta',      bpm: 84,  prog: [0, 3, 2, 4], lead: 'sine',     bass: 'sine',     density: 0.45, octave: 0,  seed: 141, pad: true },
  boss:    { root: 50, scale: 'minor',      bpm: 142, prog: [0, 5, 6, 4], lead: 'square',   bass: 'sawtooth', density: 0.78, octave: 0,  seed: 151, soft: true },
};

// which theme plays on which map (anything not listed uses 'town')
export const MAP_THEME = {
  town: 'town', farm: 'farm', forest: 'forest', quarry: 'quarry', cave: 'cave', crystal: 'crystal', market: 'market',
  peaks: 'peaks', ruins: 'ruins', desert: 'desert', bazaar: 'bazaar',
  school: 'school', kitchen: 'school', potions: 'school', library: 'school', sparring: 'school', dorm1: 'school', dorm2: 'school',
  upper: 'school', dojo: 'school', workshop: 'school', garden: 'garden', barn: 'garden', nightbarn: 'garden',
};
export const themeFor = (map) => MAP_THEME[map] ?? 'town';

// Build the looping note list. Returns { bpm, steps, stepSec, events: [{ step, midi, len, voice, wave }] }
// voice: 'lead' | 'bass' | 'pad'. len is in steps.
export function buildPattern(name, night = false) {
  const t = THEMES[name] ?? THEMES.town;
  const scale = SCALES[t.scale];
  const rand = rng(t.seed + (night ? 7 : 0));
  const bpm = night ? Math.round(t.bpm * 0.72) : t.bpm;
  const density = night ? t.density * 0.55 : t.density;
  const stepsTotal = STEPS_PER_BAR * BARS;
  const events = [];
  const chordAt = (bar) => t.prog[Math.floor(bar / 2) % t.prog.length]; // every chord lasts two bars
  const tones = (deg) => [deg, deg + 2, deg + 4]; // a triad built on the scale

  let last = chordAt(0) + 2 + t.octave * scale.length;
  for (let bar = 0; bar < BARS; bar++) {
    const chord = chordAt(bar);
    // bass: the chord's root on beats 1 and 3, sometimes the fifth on the off-beat
    const bassRoot = scaleNote(t.root - 12, scale, chord);
    events.push({ step: bar * 8, midi: bassRoot, len: night ? 6 : 3, voice: 'bass', wave: t.bass });
    if (!night) {
      events.push({ step: bar * 8 + 4, midi: bassRoot, len: 3, voice: 'bass', wave: t.bass });
      if (rand() < 0.4) events.push({ step: bar * 8 + 6, midi: scaleNote(t.root - 12, scale, chord + 4), len: 2, voice: 'bass', wave: t.bass });
    } else if (bar % 2 === 1) {
      events.push({ step: bar * 8 + 4, midi: scaleNote(t.root - 12, scale, chord + 4), len: 3, voice: 'bass', wave: t.bass });
    }
    // pad: a held chord, once every two bars (always at night, and in the "pad" themes)
    if ((night || t.pad) && bar % 2 === 0) {
      tones(chord).forEach((d) => events.push({ step: bar * 8, midi: scaleNote(t.root, scale, d), len: 16, voice: 'pad', wave: 'sine' }));
    }
    // melody: a gentle random walk that likes chord tones on the strong steps
    const second = bar >= 4; // the second phrase answers the first with a different walk
    let step = 0;
    while (step < STEPS_PER_BAR) {
      const strong = step % 4 === 0;
      const play = strong ? rand() < Math.min(1, density + 0.3) : rand() < density;
      if (!play) {
        step += 1;
        continue;
      }
      let deg;
      if (strong || rand() < 0.25) {
        const choices = tones(chord).map((d) => d + t.octave * scale.length + (rand() < 0.35 ? scale.length : 0));
        deg = choices[Math.floor(rand() * choices.length)];
      } else {
        deg = last + (rand() < 0.5 ? -1 : 1) * (rand() < 0.7 ? 1 : 2);
      }
      const lo = t.octave * scale.length - 1;
      const hi = t.octave * scale.length + scale.length + 2;
      deg = Math.max(lo, Math.min(hi, deg));
      if (second && bar === BARS - 1 && step === 0) deg = chordAt(0) + t.octave * scale.length; // come home at the end
      const len = night ? 2 + Math.floor(rand() * 3) : strong && rand() < 0.4 ? 3 : 1 + Math.floor(rand() * 2);
      events.push({ step: bar * 8 + step, midi: scaleNote(t.root, scale, deg), len: Math.min(len, STEPS_PER_BAR - step), voice: 'lead', wave: night ? 'sine' : t.lead, soft: !!t.soft });
      last = deg;
      step += Math.max(1, len);
    }
  }
  return { name, night, bpm, steps: stepsTotal, stepSec: 60 / bpm / 2, events };
}

// ---------------------------------------------------------------------------------------------------------------------
// SOUND EFFECTS. Each is a list of little sounds that play together or one after another.
//   w: 'square' | 'triangle' | 'sawtooth' | 'sine' | 'noise'   f: [start Hz, end Hz]   d: seconds   v: volume (0..1)
//   at: delay in seconds (default 0).  For noise, f is the centre of a band-pass filter sweeping from start to end.
export const SFX = {
  swing:   [{ w: 'noise', f: [3200, 900], d: 0.11, v: 0.35 }],
  hit:     [{ w: 'square', f: [260, 80], d: 0.11, v: 0.3 }, { w: 'noise', f: [1800, 600], d: 0.07, v: 0.35 }],
  hurt:    [{ w: 'sawtooth', f: [330, 70], d: 0.28, v: 0.3 }, { w: 'noise', f: [900, 300], d: 0.15, v: 0.2 }],
  pickup:  [{ w: 'square', f: [660, 990], d: 0.07, v: 0.22 }, { w: 'square', f: [990, 1320], d: 0.09, v: 0.22, at: 0.07 }],
  coin:    [{ w: 'square', f: [988, 988], d: 0.06, v: 0.2 }, { w: 'square', f: [1319, 1319], d: 0.2, v: 0.2, at: 0.06 }],
  door:    [{ w: 'triangle', f: [190, 130], d: 0.16, v: 0.35 }, { w: 'triangle', f: [200, 360], d: 0.16, v: 0.25, at: 0.14 }],
  select:  [{ w: 'square', f: [440, 660], d: 0.06, v: 0.2 }],
  move:    [{ w: 'square', f: [330, 330], d: 0.03, v: 0.12 }],
  back:    [{ w: 'square', f: [330, 200], d: 0.07, v: 0.18 }],
  tick:    [{ w: 'square', f: [700, 700], d: 0.02, v: 0.07 }],
  cast:    [{ w: 'noise', f: [1800, 500], d: 0.16, v: 0.3 }],
  splash:  [{ w: 'noise', f: [900, 250], d: 0.28, v: 0.3 }],
  bite:    [{ w: 'square', f: [880, 880], d: 0.06, v: 0.25 }, { w: 'square', f: [880, 880], d: 0.06, v: 0.25, at: 0.09 }, { w: 'square', f: [1175, 1175], d: 0.1, v: 0.25, at: 0.18 }],
  pull:    [{ w: 'triangle', f: [400, 640], d: 0.08, v: 0.25 }],
  miss:    [{ w: 'sawtooth', f: [320, 140], d: 0.3, v: 0.22 }],
  catch:   [523, 659, 784, 1047].map((f, i) => ({ w: 'triangle', f: [f, f], d: 0.12, v: 0.3, at: i * 0.09 })),
  drink:   [0, 0.12, 0.24].map((at, i) => ({ w: 'sine', f: [260 + i * 40, 520 + i * 60], d: 0.1, v: 0.3, at })),
  eat:     [{ w: 'triangle', f: [400, 520], d: 0.06, v: 0.25 }, { w: 'triangle', f: [440, 560], d: 0.06, v: 0.25, at: 0.1 }],
  friend:  [523, 659, 784, 1047, 1319].map((f, i) => ({ w: 'sine', f: [f, f], d: 0.18, v: 0.28, at: i * 0.08 })),
  reward:  [392, 523, 659, 784].map((f, i) => ({ w: 'square', f: [f, f], d: 0.13, v: 0.2, at: i * 0.1 })).concat([{ w: 'square', f: [1047, 1047], d: 0.4, v: 0.2, at: 0.4 }]),
  error:   [{ w: 'square', f: [200, 200], d: 0.09, v: 0.2 }, { w: 'square', f: [160, 160], d: 0.12, v: 0.2, at: 0.12 }],
};
