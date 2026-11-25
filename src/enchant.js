// Enchanting: gems and scrolls made at the school's Workshop and applied to your weapon or armor. No Phaser in here.
// gs.enchant = { weapon: 'ember-gem' | null, armor: 'ward-gem' | null }  one enchant slot per piece of gear.
// data/enchants.json: { id: { name, slot: 'weapon'|'armor', damage?, defense?, cooldownMul? } }
// The enchant belongs to the slot, so it stays when you upgrade the weapon or armor at a smith.
import { getRecipes, craft } from './craft.js';

export const enchantOf = (gs, slot) => gs.enchant?.[slot] ?? null;

export function enchantText(def) {
  const bits = [];
  if (def.damage) bits.push(`+${def.damage} damage`);
  if (def.defense) bits.push(`+${def.defense} defense`);
  if (def.cooldownMul) bits.push(`${Math.round((1 - def.cooldownMul) * 100)}% faster swings`);
  return bits.join(', ');
}

// What your enchantments add right now: { damage, defense, cooldownMul }
export function enchantBonus(gs, defs) {
  const w = defs[enchantOf(gs, 'weapon')];
  const a = defs[enchantOf(gs, 'armor')];
  return { damage: w?.damage ?? 0, cooldownMul: w?.cooldownMul ?? 1, defense: a?.defense ?? 0 };
}

// Apply an enchant from the bag to the matching gear (the old enchant goes back in the bag). Returns { ok, msg }
export function applyEnchant(gs, id, defs) {
  const def = defs[id];
  if (!def) return { ok: false, msg: 'That cannot be enchanted onto gear.' };
  if (!gs[def.slot]) return { ok: false, msg: def.slot === 'weapon' ? 'You have no weapon to enchant.' : 'You are not wearing any armor.' };
  if ((gs.items[id] ?? 0) <= 0) return { ok: false, msg: 'You do not have that.' };
  if (!gs.enchant) gs.enchant = {};
  const old = gs.enchant[def.slot];
  if (old === id) return { ok: false, msg: 'It already carries that enchantment.' };
  if (old) gs.items[old] = (gs.items[old] ?? 0) + 1;
  gs.items[id] -= 1;
  gs.enchant[def.slot] = id;
  return { ok: true, msg: `Enchanted with ${def.name}!` };
}

// The Enchanter's conversation (same step shape as shop.js)
export function talkEnchanter(gs, npcId, data, ctx) {
  const { enchantDefs, itemDefs, recipes } = ctx;
  const first = !gs.flags[`met_${npcId}`];
  gs.flags[`met_${npcId}`] = true;
  return { lines: first ? [...data.lines, data.menu] : [data.menu], afterClose: () => null, choice: main() };

  function step(msg, fn) {
    return { lines: [], afterClose: () => msg, choice: fn() };
  }
  function menuOf(actions) {
    return { options: actions.map((a) => ({ label: a.label, disabled: !!a.disabled })), onPick: (i) => actions[i].run() };
  }
  function main() {
    const wnow = enchantDefs[enchantOf(gs, 'weapon')];
    const anow = enchantDefs[enchantOf(gs, 'armor')];
    return menuOf([
      { label: 'Make enchantments', run: () => step(null, makeMenu) },
      { label: `Enchant my weapon${wnow ? ` (${wnow.name})` : ''}`, run: () => step(null, () => slotMenu('weapon')) },
      { label: `Enchant my armor${anow ? ` (${anow.name})` : ''}`, run: () => step(null, () => slotMenu('armor')) },
      { label: 'Leave', run: () => ({ lines: [data.farewell], afterClose: () => null }) },
    ]);
  }
  function makeMenu() {
    const rs = getRecipes(gs, recipes, itemDefs);
    const actions = rs.map((r) => ({ label: r.text, disabled: !r.affordable, run: () => { const c = craft(gs, recipes, itemDefs, r.id); return step(c.msg, makeMenu); } }));
    actions.push({ label: 'Back', run: () => step(null, main) });
    return menuOf(actions);
  }
  function slotMenu(slot) {
    const ids = Object.keys(enchantDefs).filter((id) => enchantDefs[id].slot === slot && (gs.items[id] ?? 0) > 0);
    const actions = ids.map((id) => ({ label: `${enchantDefs[id].name} (${enchantText(enchantDefs[id])})`, run: () => { const r = applyEnchant(gs, id, enchantDefs); return step(r.msg, main); } }));
    if (actions.length === 0) actions.push({ label: `No ${slot} enchantments yet`, disabled: true, run: () => step(null, main) });
    actions.push({ label: 'Back', run: () => step(null, main) });
    return menuOf(actions);
  }
}
