// Day and night. No Phaser in here.
// The clock is the real clock (Date.now()), so everyone in a co-op world sees the same time of day with nothing to sync.
// One full day lasts CYCLE_MS. Outdoor maps get a colour tint (multiplied over the picture); inside buildings, caves,
// the school and the castle stay as they are.
export const CYCLE_MS = 8 * 60 * 1000;
export const OUTDOOR = ['town', 'farm', 'forest', 'quarry', 'peaks', 'desert', 'bazaar', 'garden'];

// phase 0..1:  0-0.45 day, 0.45-0.58 dusk, 0.58-0.92 night, 0.92-1 dawn
export const DAY_END = 0.45;
export const NIGHT_START = 0.58;
export const NIGHT_END = 0.92;

export const phaseAt = (nowMs, cycle = CYCLE_MS) => ((nowMs % cycle) + cycle) % cycle / cycle;

// 0 = full day, 1 = full night
export function darkness(phase) {
  if (phase < DAY_END) return 0;
  if (phase < NIGHT_START) return (phase - DAY_END) / (NIGHT_START - DAY_END);
  if (phase < NIGHT_END) return 1;
  return 1 - (phase - NIGHT_END) / (1 - NIGHT_END);
}

// creatures and plants that need the night wait for this
export const isNightPhase = (phase) => darkness(phase) >= 0.6;
export const isNightAt = (nowMs, cycle = CYCLE_MS) => isNightPhase(phaseAt(nowMs, cycle));

const WHITE = [255, 255, 255];
const SUNSET = [255, 172, 122];
const NIGHT = [72, 88, 156];
const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// the colour multiplied over the screen: white by day, orange at dusk and dawn, deep blue at night
export function skyColor(phase) {
  if (phase < DAY_END) return WHITE;
  if (phase < NIGHT_START) {
    const t = (phase - DAY_END) / (NIGHT_START - DAY_END);
    return t < 0.5 ? lerp(WHITE, SUNSET, t * 2) : lerp(SUNSET, NIGHT, (t - 0.5) * 2);
  }
  if (phase < NIGHT_END) return NIGHT;
  const t = (phase - NIGHT_END) / (1 - NIGHT_END);
  return t < 0.5 ? lerp(NIGHT, SUNSET, t * 2) : lerp(SUNSET, WHITE, (t - 0.5) * 2);
}

export const toHex = ([r, g, b]) => (r << 16) | (g << 8) | b;

// ?time=night | day | dusk | dawn in the web address pins the clock (for testing); ?cycle=60000 changes the day length
export function forcedPhase(search) {
  try {
    const q = new URLSearchParams(search);
    const t = q.get('time');
    return { day: 0.2, dusk: 0.52, night: 0.75, dawn: 0.96 }[t] ?? null;
  } catch (e) {
    return null;
  }
}
export function cycleFrom(search) {
  try {
    const c = Number(new URLSearchParams(search).get('cycle'));
    return c >= 10000 ? c : CYCLE_MS;
  } catch (e) {
    return CYCLE_MS;
  }
}
