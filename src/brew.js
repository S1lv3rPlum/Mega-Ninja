// The Brewer's dark-magic brews: drink one and get a timed effect. No Phaser in here.
//   gs.buffs = { speed: expiresAt, vision: expiresAt }   (ms on the real clock, so a save keeps counting down)
// data/brews.json: { 'swift-brew': { speed: 45000 }, ... }  every key but "name" is an effect and its length in ms.
//   speed  - you walk faster (MOVE_SCALE of the normal slide time)
//   vision - dark areas: a much bigger lantern circle; at night outdoors the darkness lifts
export const MOVE_SCALE = 0.65;
export const VISION_LIGHT = 1.5;
export const VISION_SKY = 0.6;    // how much of the night tint is washed out
export const MAX_MS = 300000;     // you can stack brews, but never past 5 minutes
export const EFFECTS = { speed: 'Swift', vision: 'Owl-eye' };

export function ensureBuffs(gs) {
  if (!gs.buffs) gs.buffs = {};
}

export const remaining = (gs, effect, now) => Math.max(0, (gs.buffs?.[effect] ?? 0) - now);
export const active = (gs, effect, now) => remaining(gs, effect, now) > 0;

// drink one brew from the bag. Returns { ok, msg }
export function drink(gs, brews, id, now) {
  const b = brews[id];
  if (!b) return { ok: false, msg: 'You cannot drink that.' };
  if ((gs.items[id] ?? 0) <= 0) return { ok: false, msg: 'You have none left.' };
  ensureBuffs(gs);
  gs.items[id] -= 1;
  const got = [];
  for (const [effect, ms] of Object.entries(b)) {
    if (!(effect in EFFECTS)) continue;
    const start = Math.max(now, gs.buffs[effect] ?? 0);
    gs.buffs[effect] = Math.min(start + ms, now + MAX_MS);
    got.push(EFFECTS[effect]);
  }
  return { ok: true, msg: `Glug glug... ${got.join(' and ')}!` };
}

// how long one slide of a tile takes
export const moveMs = (gs, now, base) => (active(gs, 'speed', now) ? Math.round(base * MOVE_SCALE) : base);
// how much bigger the lantern circle is
export const lightScale = (gs, now) => (active(gs, 'vision', now) ? VISION_LIGHT : 1);
// the night tint with some of the dark washed out: rgb [r,g,b] -> rgb
export function nightTint(gs, now, rgb) {
  if (!active(gs, 'vision', now)) return rgb;
  return rgb.map((c) => Math.round(c + (255 - c) * VISION_SKY));
}

// "Swift 0:32  Owl-eye 1:10" for the HUD ('' when nothing is active)
export function buffText(gs, now) {
  return Object.keys(EFFECTS)
    .filter((e) => active(gs, e, now))
    .map((e) => {
      const s = Math.ceil(remaining(gs, e, now) / 1000);
      return `${EFFECTS[e]} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    })
    .join('  ');
}
