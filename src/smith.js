// Smiths in the hidden markets. No Phaser in here.
// Unique gear is ORDERED (gold + materials from the gear file's "smith") and is ready the next time you come back
// to that market (gs.marketVisits / gs.bazaarVisits go up each time you walk in). Each piece has a rank; you can only
// order the next rank up. Two kinds: 'weapon' (weapons.json, the Shadow Market) and 'armor' (armor.json, the Desert Bazaar).
//   weapon: gs.weapon, order in gs.smith,      visits in gs.marketVisits
//   armor:  gs.armor,  order in gs.armorOrder, visits in gs.bazaarVisits

const KINDS = {
  weapon: { slot: 'weapon', order: 'smith', visits: 'marketVisits' },
  armor: { slot: 'armor', order: 'armorOrder', visits: 'bazaarVisits' },
};

export function ensureSmith(gs) {
  if (gs.smith === undefined) gs.smith = null;
  if (gs.marketVisits === undefined) gs.marketVisits = 0;
  if (gs.armor === undefined) gs.armor = null;
  if (gs.armorOrder === undefined) gs.armorOrder = null;
  if (gs.bazaarVisits === undefined) gs.bazaarVisits = 0;
}

export const rankOf = (gs, defs, kind = 'weapon') => defs[gs[KINDS[kind].slot]]?.rank ?? 0;

// the one piece you can order right now (next rank up), or null
export function nextWeapon(gs, defs, kind = 'weapon') {
  const r = rankOf(gs, defs, kind);
  const hit = Object.entries(defs).find(([, d]) => d.smith && d.rank === r + 1);
  return hit ? hit[0] : null;
}

export const costText = (d) =>
  [`${d.smith.gold}g`, ...Object.entries(d.smith.items ?? {}).map(([k, n]) => `${n} ${k}`)].join(' + ');

export function canAfford(gs, d) {
  return gs.gold >= d.smith.gold && Object.entries(d.smith.items ?? {}).every(([k, n]) => (gs.items[k] ?? 0) >= n);
}

export const orderReady = (gs, kind = 'weapon') => {
  const o = gs[KINDS[kind].order];
  return !!o && gs[KINDS[kind].visits] > o.visit;
};

// pay and place an order. Returns { ok, msg }
export function placeOrder(gs, defs, id, kind = 'weapon') {
  const K = KINDS[kind];
  if (gs[K.order]) return { ok: false, msg: 'You already have an order.' };
  const d = defs[id];
  if (!d || !d.smith || nextWeapon(gs, defs, kind) !== id) return { ok: false, msg: 'Not available.' };
  if (!canAfford(gs, d)) return { ok: false, msg: 'You are missing something.' };
  gs.gold -= d.smith.gold;
  for (const [k, n] of Object.entries(d.smith.items ?? {})) gs.items[k] -= n;
  gs[K.order] = { id, visit: gs[K.visits] };
  return { ok: true, msg: `Ordered the ${d.name}.` };
}

// pick up a finished order and equip it. Returns { ok, msg }
export function collect(gs, defs, kind = 'weapon') {
  if (!orderReady(gs, kind)) return { ok: false, msg: '' };
  const K = KINDS[kind];
  const id = gs[K.order].id;
  gs[K.slot] = id;
  gs[K.order] = null;
  return { ok: true, msg: `You got the ${defs[id].name}!` };
}

// The conversation (same step shape as quests.js / shop.js)
export function talkToSmith(gs, npcId, data, defs, kind = 'weapon') {
  const K = KINDS[kind];
  const met = `met_${npcId}`;
  const first = !gs.flags[met];
  gs.flags[met] = true;
  const intro = first ? [...data.lines] : [];
  const pending = gs[K.order];
  if (pending && orderReady(gs, kind)) {
    const name = defs[pending.id].name;
    return { lines: [...intro, data.ready.replace('{name}', name)], afterClose: () => collect(gs, defs, kind).msg };
  }
  if (pending) return { lines: [...intro, data.working.replace('{name}', defs[pending.id].name)], afterClose: () => null };
  const id = nextWeapon(gs, defs, kind);
  if (!id) return { lines: [...intro, data.done], afterClose: () => null };
  const d = defs[id];
  return {
    lines: [...intro, data.offer.replace('{name}', d.name).replace('{desc}', d.pitch ?? '')],
    afterClose: () => null,
    choice: {
      options: [{ label: `Order: ${costText(d)}`, disabled: !canAfford(gs, d) }, { label: 'Not now', disabled: false }],
      onPick: (i) => {
        if (i !== 0) return { lines: [data.farewell], afterClose: () => null };
        const r = placeOrder(gs, defs, id, kind);
        return { lines: r.ok ? [data.ordered] : [], afterClose: () => r.msg };
      },
    },
  };
}

// damage after armor: each hit is reduced by the armor's defense, but a hit always does at least 1
export const reduceDamage = (amount, armorDef) => Math.max(1, amount - (armorDef?.defense ?? 0));

// the two Moon Crest halves join into the whole Crest (once you hold both)
export function mergeCrest(gs) {
  if ((gs.items['moon-crest-half'] ?? 0) > 0 && (gs.items['moon-crest-half-2'] ?? 0) > 0) {
    gs.items['moon-crest-half'] -= 1;
    gs.items['moon-crest-half-2'] -= 1;
    gs.items['moon-crest'] = (gs.items['moon-crest'] ?? 0) + 1;
    return true;
  }
  return false;
}
