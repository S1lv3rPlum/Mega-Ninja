// The six rainbow fairies of the Cursed Hollow, and the gift each one gives once you free her. No Phaser in here.
// A fairy is freed when her thorn guardian falls, which sets the world flag fairy_<colour>_defeated. Like every boss flag it is
// shared in co-op, so one friend freeing a fairy gives the gift to everybody. The perks are worked out from the flags,
// so nothing extra is saved.
export const FAIRIES = [
  { id: 'red', name: 'Ruby', perk: 'Your sword hits 1 harder.' },
  { id: 'orange', name: 'Amber', perk: 'Food and potions heal 1 extra heart.' },
  { id: 'yellow', name: 'Sunny', perk: 'Enemies drop 50% more gold.' },
  { id: 'green', name: 'Fern', perk: 'Crops grow in about half the time.' },
  { id: 'blue', name: 'Marina', perk: 'Fishing is easier: longer bite window, wider green zone.' },
  { id: 'purple', name: 'Violet', perk: 'Your hearts come back much faster.' },
];
export const fairyFlag = (id) => `fairy_${id}_defeated`;
export const ALL_FREE_FLAG = 'fairies_all_cleared'; // set once the sixth is free: the Rainbow Fairy wakes

export const isFree = (gs, id) => !!gs?.flags?.[fairyFlag(id)];
export const freedCount = (gs) => FAIRIES.filter((f) => isFree(gs, f.id)).length;
export const allFree = (gs) => freedCount(gs) === FAIRIES.length;

export const perkDamage = (gs) => (isFree(gs, 'red') ? 1 : 0);
export const perkHeal = (gs) => (isFree(gs, 'orange') ? 2 : 0); // half-hearts: 2 = one heart
export const perkGold = (gs, n) => (isFree(gs, 'yellow') ? Math.ceil(n * 1.5) : n);
export const perkGrowMul = (gs) => (isFree(gs, 'green') ? 0.5 : 1);
export const perkRod = (gs) => (isFree(gs, 'blue') ? { window: 300, zone: 0.05 } : { window: 0, zone: 0 });
export const perkRegenMul = (gs) => (isFree(gs, 'purple') ? 0.5 : 1);

// text for the toast / journal: which fairies are free and what they give
export function fairyStatus(gs) {
  return FAIRIES.map((f) => ({ ...f, free: isFree(gs, f.id) }));
}
