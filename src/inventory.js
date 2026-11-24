// What the bag shows. No Phaser in here. `items` is data/items.json, `toolDefs` is data/tools.json.
// Every stack with a count above zero gets a slot, then every tool you own.

const NICE = (id) => id.charAt(0).toUpperCase() + id.slice(1);

export function listEntries(gs, items, toolDefs, weaponDefs = {}) {
  const entries = [];
  const have = gs.items ?? {};
  const known = Object.keys(items.items);
  // anything in the save that the catalog doesn't know about still shows up (but not the legacy shovel counter)
  const extra = Object.keys(have).filter((id) => !known.includes(id) && id !== 'shovel' && have[id] > 0);
  [...known, ...extra].forEach((id) => {
    const n = have[id] ?? 0;
    if (n <= 0) return;
    const d = items.items[id] ?? { name: NICE(id), icon: 'rock', color: '#999999', desc: '' };
    entries.push({ id, kind: 'item', name: d.name, count: n, icon: d.icon, color: d.color, desc: d.desc, heal: d.heal ?? 0 });
  });
  if (gs.weapon && weaponDefs[gs.weapon]) {
    const w = weaponDefs[gs.weapon];
    const d = items.weapons?.[gs.weapon] ?? { icon: 'sword', color: '#c9a46a' };
    entries.push({ id: gs.weapon, kind: 'weapon', name: w.name, damage: w.damage, icon: d.icon, color: d.color, desc: w.desc });
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
