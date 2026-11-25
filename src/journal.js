// The Friend Journal: a page for every kind of friend in the world. No Phaser in here.
// gs.journal = { kindId: true }  (set when you befriend one; kept even if you say goodbye to it later)
// Milestone rewards are given once (flag journal_reward_<count>).

export const REWARDS = [
  { count: 3, item: 'healing-potion', amount: 2, msg: 'Journal reward: 2 Healing Potions!' },
  { count: 6, item: 'greater-potion', amount: 2, msg: 'Journal reward: 2 Greater Potions!' },
  { count: 10, item: 'elixir', amount: 3, msg: 'You met every friend! 3 Elixirs!' },
];

// make sure old saves count the friends they already have
export function ensureJournal(gs) {
  if (!gs.journal) gs.journal = {};
  for (const p of gs.pets ?? []) gs.journal[p.kind] = true;
}

export function recordFriend(gs, kindId) {
  if (!gs.journal) gs.journal = {};
  gs.journal[kindId] = true;
}

export const metCount = (gs) => Object.keys(gs.journal ?? {}).length;

// One page per kind, in the order of friends.json
export function journalEntries(gs, friendDefs, itemDefs) {
  return Object.entries(friendDefs.kinds).map(([id, k]) => ({
    id,
    met: !!gs.journal?.[id],
    name: k.name,
    texture: k.texture,
    treat: itemDefs[k.treat]?.name ?? k.treat,
    also: (k.likes ?? []).map((t) => itemDefs[t]?.name ?? t),
    hint: k.hint ?? '',
    when: k.when ?? '',
    yours: (gs.pets ?? []).filter((p) => p.kind === id).map((p) => p.name),
  }));
}

export function nextReward(gs) {
  const n = metCount(gs);
  return REWARDS.find((r) => n < r.count) ?? null;
}

// Give any milestone rewards that have been reached. Returns the messages to show.
export function claimRewards(gs, itemDefs = {}) {
  const out = [];
  const n = metCount(gs);
  for (const r of REWARDS) {
    const flag = `journal_reward_${r.count}`;
    if (n >= r.count && !gs.flags[flag]) {
      gs.flags[flag] = true;
      gs.items[r.item] = (gs.items[r.item] ?? 0) + r.amount;
      out.push(r.msg);
    }
  }
  return out;
}
