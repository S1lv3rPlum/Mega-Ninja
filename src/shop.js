import { repairTool } from './tools.js';
// The market stall. No Phaser in here.
//
// shop.json offers:
//   { type: 'item',    item, amount, price, label }          buy N of an item (seeds)
//   { type: 'upgrade', label, levels: [{ to, price }, ...] } watering can size, one level at a time
//   { type: 'tool',    tool, label }                         buy a tool (price from tools.json); only offered when
//                                                            you have none or yours is broken
//   { type: 'repair',  tool, label }                         repair a worn tool with materials (from tools.json)
//   shop.json "sell": { item: price each }                   adds "Sell all <item>" entries for whatever you carry
// Offers that make no sense right now (a tool you own, a pail already maxed out) are left out of the menu.

function pailLevel(gs, offer) {
  return offer.levels.find((l) => l.to > gs.can.max) ?? null;
}

// Offers available right now: [{ id, label, price, affordable }]
export function getOffers(gs, shopDef, toolDefs) {
  const out = [];
  for (const o of shopDef.offers) {
    let price = o.price;
    let label = o.label;
    if (o.type === 'upgrade') {
      const level = pailLevel(gs, o);
      if (!level) continue;
      price = level.price;
      label = `${o.label} (holds ${level.to})`;
    } else if (o.type === 'repair') {
      const def = toolDefs[o.tool];
      const st = gs.tools[o.tool];
      if (!st || st.dur >= def.durability) continue;
      const cost = def.repair ?? {};
      const text = Object.entries(cost).map(([k, n]) => `${n} ${k}`).join(', ');
      out.push({
        id: o.id, label: o.label, text: `${o.label} (${text})`, price: 0,
        affordable: Object.entries(cost).every(([k, n]) => (gs.items[k] ?? 0) >= n),
      });
      continue;
    } else if (o.type === 'tool') {
      const owned = gs.tools[o.tool];
      if (owned && owned.dur > 0) continue;
      price = toolDefs[o.tool].price;
    }
    out.push({ id: o.id, label, price, affordable: gs.gold >= price });
  }
  for (const [item, each] of Object.entries(shopDef.sell ?? {})) {
    const n = gs.items[item] ?? 0;
    if (n <= 0) continue;
    const gain = n * each;
    out.push({ id: `sell-${item}`, label: `Sell ${n} ${item}`, text: `Sell ${n} ${item} +${gain}g`, price: 0, gain, affordable: true });
  }
  return out;
}

// Buy an offer by id. Returns { ok, msg }.
export function buy(gs, shopDef, toolDefs, id) {
  const offer = getOffers(gs, shopDef, toolDefs).find((o) => o.id === id);
  if (!offer) return { ok: false, msg: 'That is not for sale right now.' };
  if (offer.gain) {
    const item = id.slice(5);
    const n = gs.items[item];
    gs.items[item] = 0;
    gs.gold += offer.gain;
    return { ok: true, msg: `Sold ${n} ${item} for ${offer.gain} gold.` };
  }
  if (!offer.affordable) return { ok: false, msg: offer.text ? 'You are missing materials.' : `You need ${offer.price} gold.` };

  const def = shopDef.offers.find((o) => o.id === id);
  if (def.type === 'repair') {
    const r = repairTool(gs, toolDefs, def.tool);
    return { ok: r.ok, msg: r.msg };
  }
  gs.gold -= offer.price;
  if (def.type === 'item') {
    gs.items[def.item] = (gs.items[def.item] ?? 0) + def.amount;
    return { ok: true, msg: `Bought ${def.amount} ${def.item}.` };
  }
  if (def.type === 'upgrade') {
    const level = pailLevel(gs, def);
    gs.can.max = level.to;
    return { ok: true, msg: `Your watering can now holds ${level.to}.` };
  }
  // tool: a fresh one with full durability
  gs.tools[def.tool] = { dur: toolDefs[def.tool].durability };
  const n = toolDefs[def.tool].name.toLowerCase();
  return { ok: true, msg: `Bought ${/^[aeiou]/.test(n) ? 'an' : 'a'} ${n}.` };
}

// The conversation with the shopkeeper (same step shape as quests.js)
export function talkToShopkeeper(gs, npcId, data, shopDef, toolDefs) {
  const metFlag = `met_${npcId}`;
  const first = !gs.flags[metFlag];
  gs.flags[metFlag] = true;
  return { lines: first ? [...data.lines, data.menu] : [data.menu], afterClose: () => null, choice: menu() };

  function menu() {
    const offers = getOffers(gs, shopDef, toolDefs);
    const options = offers.map((o) => ({ label: o.text ?? `${o.label} ${o.price}g`, disabled: !o.affordable }));
    options.push({ label: 'Leave', disabled: false });
    return {
      options,
      onPick: (i) => {
        if (i >= offers.length) return { lines: [data.farewell], afterClose: () => null };
        const r = buy(gs, shopDef, toolDefs, offers[i].id);
        return { lines: [], afterClose: () => r.msg, choice: menu() };
      },
    };
  }
}
