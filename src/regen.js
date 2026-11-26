// Hearts that slowly come back. No Phaser in here.
// Once you have been out of a fight for `delay` ms (no hit taken, no sword swung), you win back 1 hp (half a heart)
// every `every` ms until you are full. Never during a boss fight, and never from 0 hp.
// The difficulty sets the pace: easy heals sooner and faster, hard later and slower.
export const REGEN = {
  easy: { delay: 6000, every: 4000 },
  normal: { delay: 8000, every: 7000 },
  hard: { delay: 12000, every: 12000 },
};

export const newRegen = () => ({ lastFight: -Infinity, nextHeal: null });
export const inFight = (st, now) => {
  st.lastFight = now;
  st.nextHeal = null;
};

// call every frame while the game is running; returns true when a half heart was just restored
export function regenStep(gs, st, now, { blocked = false, level = 'normal' } = {}) {
  const r = REGEN[level] ?? REGEN.normal;
  if (blocked) st.lastFight = now; // a boss fight counts as fighting, so the wait starts when it ends
  if (blocked || gs.hp <= 0 || gs.hp >= gs.maxHp) {
    st.nextHeal = null;
    return false;
  }
  if (now - st.lastFight < r.delay) {
    st.nextHeal = null;
    return false;
  }
  if (st.nextHeal == null) st.nextHeal = Math.max(now, st.lastFight + r.delay);
  if (now < st.nextHeal) return false;
  gs.hp += 1;
  st.nextHeal = now + r.every;
  return true;
}
