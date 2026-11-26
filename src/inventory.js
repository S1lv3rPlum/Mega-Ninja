// What the bag shows. No Phaser in here. `items` is data/items.json, `toolDefs` is data/tools.json.
// Every stack with a count above zero gets a slot, then every tool you own.

const NICE = (id) => id.charAt(0).toUpperCase() + id.slice(1);

import { enchantOf, enchantText } from './enchant.js';

export function listEntries(gs, items, toolDefs, weaponDefs = {}, armorDefs = {}, enchantDefs = {}) {
  const enchLine = (slot) => { const e = enchantDefs[enchantOf(gs, slot)]; return e ? `\nEnchanted: ${e.name} (${enchantText(e)})` : ''; };
  const entries = [];
  const have = gs.items ?? {};
  const known = Object.keys(items.items);
  // anything in the save that the catalog doesn't know about still shows up (but not the legacy shovel counter)
  const extra = Object.keys(have).filter((id) => !known.includes(id) && id !== 'shovel' && have[id] > 0);
  [...known, ...extra].forEach((id) => {
    const n = have[id] ?? 0;
    if (n <= 0) return;
    const d = items.items[id] ?? { name: NICE(id), icon: 'rock', color: '#999999', desc: '' };
    entries.push({ id, kind: 'item', name: d.name, count: n, icon: d.icon, color: d.color, desc: d.desc, heal: d.heal ?? 0, brew: !!d.brew });
  });
  if (gs.weapon && weaponDefs[gs.weapon]) {
    const w = weaponDefs[gs.weapon];
    const d = items.weapons?.[gs.weapon] ?? { icon: 'sword', color: '#c9a46a' };
    entries.push({ id: gs.weapon, kind: 'weapon', name: w.name, damage: w.damage, icon: d.icon, color: d.color, desc: w.desc + enchLine('weapon') });
  }
  if (gs.armor && armorDefs[gs.armor]) {
    const a = armorDefs[gs.armor];
    const d = items.armor?.[gs.armor] ?? { icon: 'armor', color: '#c9a46a' };
    entries.push({ id: gs.armor, kind: 'armor', name: a.name, defense: a.defense, icon: d.icon, color: d.color, desc: a.desc + enchLine('armor') });
  }
  Object.keys(gs.tools ?? {}).forEach((id) => {
    const def = toolDefs[id];
    if (!def) return;
    const st = gs.tools[id];
    const d = items.tools?.[id] ?? { icon: 'rock', color: '#b0b6c0', desc: '' };
    const repair = def.repair ? Object.entries(def.repair).map(([k, v]) => `${v} ${k}`).join(', ') : '';
    entries.push({
      id, kind: 'tool', name: def.name, dur: st.dur, max: def.durability, broken: st.dur <= 0,
      icon: d.icon, color: d.color, desc: d.desc, repair,
    });
  });
  return entries;
}

// tools that are worn low enough to deserve a warning on the HUD
export function lowTools(gs, toolDefs, fraction = 0.25) {
  return Object.keys(gs.tools ?? {})
    .filter((id) => toolDefs[id] && gs.tools[id].dur <= toolDefs[id].durability * fraction)
    .map((id) => ({ id, name: toolDefs[id].short ?? toolDefs[id].name, dur: gs.tools[id].dur, max: toolDefs[id].durability }));
}

// move the selection around a grid with `cols` columns; stays inside [0, count)
export function moveSelection(index, dx, dy, cols, count) {
  if (count <= 0) return 0;
  let col = index % cols;
  let row = Math.floor(index / cols);
  const rows = Math.ceil(count / cols);
  col = Math.max(0, Math.min(cols - 1, col + dx));
  row = Math.max(0, Math.min(rows - 1, row + dy));
  return Math.min(count - 1, row * cols + col);
}

// ---- pockets: the bag is sorted into tabs so nothing needs scrolling
export const POCKETS = [
  { id: 'gear', label: 'GEAR' },
  { id: 'food', label: 'FOOD' },
  { id: 'seeds', label: 'SEEDS' },
  { id: 'crops', label: 'CROPS' },
  { id: 'fish', label: 'FISH' },
  { id: 'stuff', label: 'STUFF' },
];
export const PER_POCKET = 25;
const GEAR_ITEMS = ['fishing-rod', 'lantern', 'crystal-lantern', 'frost-boots', 'waystone-charm', 'padded-vest', 'copper-mail', 'crystal-plate', 'ember-gem', 'greater-ember-gem', 'ward-gem', 'greater-ward-gem'];
const CROP_ITEMS = ['wheat', 'carrot', 'pumpkin', 'herb', 'frostberry', 'seaweed', 'cactus-fruit', 'moonbloom', 'glowcap'];

export function pocketOf(e, fishIds = []) {
  if (e.kind !== 'item') return 'gear'; // tools, weapon, armor
  if (e.id.endsWith('seeds')) return 'seeds';
  if (GEAR_ITEMS.includes(e.id)) return 'gear';
  if (fishIds.includes(e.id)) return 'fish';
  if (CROP_ITEMS.includes(e.id)) return 'crops'; // raw produce stays with the crops even if you can eat it
  if (e.heal > 0 || e.brew) return 'food';
  return 'stuff';
}

// [{ id, label, entries }] in tab order. A pocket with more than PER_POCKET things spills into "LABEL 2", "LABEL 3"...
// The six standard pockets are always listed (an empty one is just dimmed); spill pages only when needed.
export function buildPockets(entries, fishIds = [], per = PER_POCKET) {
  const out = [];
  POCKETS.forEach((p) => {
    const mine = entries.filter((e) => pocketOf(e, fishIds) === p.id);
    const pages = Math.max(1, Math.ceil(mine.length / per));
    for (let i = 0; i < pages; i++) {
      out.push({ id: i === 0 ? p.id : `${p.id}${i + 1}`, label: i === 0 ? p.label : `${p.label} ${i + 1}`, entries: mine.slice(i * per, (i + 1) * per) });
    }
  });
  return out;
}
