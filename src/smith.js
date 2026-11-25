// The weapon smith in the Shadow Market. No Phaser in here.
// Unique weapons are ORDERED (gold + materials from weapons.json "smith") and are ready the next time you come back
// to the market (gs.marketVisits goes up each time you walk in). Each weapon has a rank; you can only order the next rank.
//   gs.smith = { id, visit } | null     gs.marketVisits = number of times you have entered the market

export function ensureSmith(gs) {
  if (gs.smith === undefined) gs.smith = null;
  if (gs.marketVisits === undefined) gs.marketVisits = 0;
}

export const rankOf = (gs, defs) => defs[gs.weapon]?.rank ?? 0;

// the one weapon you can order right now (next rank up), or null
export function nextWeapon(gs, defs) {
  const r = rankOf(gs, defs);
  const hit = Object.entries(defs).find(([, d]) => d.smith && d.rank === r + 1);
  return hit ? hit[0] : null;
}

export const costText = (d) =>
  [`${d.smith.gold}g`, ...Object.entries(d.smith.items ?? {}).map(([k, n]) => `${n} ${k}`)].join(' + ');

export function canAfford(gs, d) {
  return gs.gold >= d.smith.gold && Object.entries(d.smith.items ?? {}).every(([k, n]) => (gs.items[k] ?? 0) >= n);
}

export const orderReady = (gs) => !!gs.smith && gs.marketVisits > gs.smith.visit;

// pay and place an order. Returns { ok, msg }
export function placeOrder(gs, defs, id) {
  if (gs.smith) return { ok: false, msg: 'You already have an order.' };
  const d = defs[id];
  if (!d || !d.smith || nextWeapon(gs, defs) !== id) return { ok: false, msg: 'Not available.' };
  if (!canAfford(gs, d)) return { ok: false, msg: 'You are missing something.' };
  gs.gold -= d.smith.gold;
  for (const [k, n] of Object.entries(d.smith.items ?? {})) gs.items[k] -= n;
  gs.smith = { id, visit: gs.marketVisits };
  return { ok: true, msg: `Ordered the ${d.name}.` };
}

// pick up a finished order and equip it. Returns { ok, msg }
export function collect(gs, defs) {
  if (!orderReady(gs)) return { ok: false, msg: '' };
  const id = gs.smith.id;
  gs.weapon = id;
  gs.smith = null;
  return { ok: true, msg: `You got the ${defs[id].name}!` };
}

// The conversation (same step shape as quests.js / shop.js)
export function talkToSmith(gs, npcId, data, defs) {
  const met = `met_${npcId}`;
  const first = !gs.flags[met];
  gs.flags[met] = true;
  const intro = first ? [...data.lines] : [];
  if (gs.smith && orderReady(gs)) {
    const name = defs[gs.smith.id].name;
    return { lines: [...intro, data.ready.replace('{name}', name)], afterClose: () => collect(gs, defs).msg };
  }
  if (gs.smith) return { lines: [...intro, data.working.replace('{name}', defs[gs.smith.id].name)], afterClose: () => null };
  const id = nextWeapon(gs, defs);
  if (!id) return { lines: [...intro, data.done], afterClose: () => null };
  const d = defs[id];
  return {
    lines: [...intro, data.offer.replace('{name}', d.name).replace('{desc}', d.pitch ?? '')],
    afterClose: () => null,
    choice: {
      options: [{ label: `Order: ${costText(d)}`, disabled: !canAfford(gs, d) }, { label: 'Not now', disabled: false }],
      onPick: (i) => {
        if (i !== 0) return { lines: [data.farewell], afterClose: () => null };
        const r = placeOrder(gs, defs, id);
        return { lines: r.ok ? [data.ordered] : [], afterClose: () => r.msg };
      },
    },
  };
}
