// Difficulty. No Phaser in here.  gs.difficulty = 'easy' | 'normal' | 'hard'  (missing = not chosen yet, plays as normal)
// Normal is the game exactly as it was. Every number below is a multiplier on the normal value.
//   dmg      damage taken from monsters and bosses
//   attack   time between attacks (bigger = slower to attack)
//   warn     how long the red warning shows before a hit lands (bigger = more time to dodge)
//   move     time between enemy steps (bigger = slower chasing)
//   sight    how far enemies notice you
//   invuln   how long you are safe after being hit
export const LEVELS = {
  easy: { name: 'Easy', desc: 'Slow, soft', dmg: 0.5, attack: 1.5, warn: 1.7, move: 1.3, sight: 0.8, invuln: 1.6 },
  normal: { name: 'Normal', desc: 'As made', dmg: 1, attack: 1, warn: 1, move: 1, sight: 1, invuln: 1 },
  hard: { name: 'Hard', desc: 'Fast, harsh', dmg: 1.5, attack: 0.8, warn: 0.75, move: 0.85, sight: 1.15, invuln: 0.7 },
};
export const LEVEL_IDS = ['easy', 'normal', 'hard'];

export const chosen = (gs) => LEVEL_IDS.includes(gs.difficulty);
export const levelOf = (gs) => LEVELS[chosen(gs) ? gs.difficulty : 'normal'];

export function setLevel(gs, id) {
  if (!LEVEL_IDS.includes(id)) return false;
  gs.difficulty = id;
  return true;
}

// damage after the level; a hit always costs at least 1 half-heart, and rounds up
export const scaleDamage = (gs, base) => (base <= 0 ? 0 : Math.max(1, Math.ceil(base * levelOf(gs).dmg - 1e-9)));
export const scaleMs = (gs, ms, key) => Math.round(ms * levelOf(gs)[key]);
export const scaleSight = (gs, tiles) => Math.max(2, Math.round(tiles * levelOf(gs).sight));
