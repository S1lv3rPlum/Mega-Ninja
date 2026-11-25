// Tools that wear out, and targets you work on with them (dirt piles, trees, rocks).
// No Phaser in here. Functions take `defs` (the contents of data/tools.json) as an argument.
//
// Tool state in a save:  gs.tools = { shovel: { dur: 18 } }   (dur 0 = broken)
// Target state:          gs.targets = { mapName: { targetId: { hits: 3, cleared: false } } }

export function ensureToolState(gs) {
  if (!gs.tools) gs.tools = {};
  if (!gs.targets) gs.targets = {};
}

export const hasTool = (gs, id) => !!gs.tools[id];
export const isBroken = (gs, id) => !!gs.tools[id] && gs.tools[id].dur <= 0;

export function giveTool(gs, defs, id) {
  gs.tools[id] = { dur: defs[id].durability };
}

export function toolLabel(gs, defs, id) {
  const def = defs[id];
  const name = def.short ?? def.name;
  return isBroken(gs, id) ? `${name} broken` : `${name} ${gs.tools[id].dur}/${def.durability}`;
}

// Use a tool once. Returns { ok, msg, broke }.
export function useTool(gs, defs, id) {
  const name = defs[id].name.toLowerCase();
  if (!hasTool(gs, id)) return { ok: false, msg: `You need a ${name}.` };
  if (isBroken(gs, id)) return { ok: false, msg: `Your ${name} is broken. It needs repairing.` };
  gs.tools[id].dur -= 1;
  const broke = gs.tools[id].dur <= 0;
  return { ok: true, broke, msg: broke ? `Your ${name} broke!` : null };
}

// Repair with materials from defs[id].repair (for example { wood: 3 }). Restores full durability.
export function repairTool(gs, defs, id) {
  const def = defs[id];
  const name = def.name.toLowerCase();
  if (!hasTool(gs, id)) return { ok: false, msg: `You don't have a ${name}.` };
  if (gs.tools[id].dur >= def.durability) return { ok: false, msg: `Your ${name} is in perfect shape.` };
  const cost = def.repair ?? {};
  for (const [item, n] of Object.entries(cost)) {
    if ((gs.items[item] ?? 0) < n) return { ok: false, msg: `Repairing needs ${n} ${item}.` };
  }
  for (const [item, n] of Object.entries(cost)) gs.items[item] -= n;
  gs.tools[id].dur = def.durability;
  return { ok: true, msg: `Your ${name} is good as new.` };
}

// One swing of a tool at a target: { id, tool, hits, flag?, drop?, dropAmount?, hint?, respawnMs? }
// Returns { ok, cleared, broke, left, msg }.
// A target with respawnMs (a tree) grows back that many milliseconds after it is cleared.
export function hitTarget(gs, defs, map, t, now = Date.now()) {
  if (!gs.targets[map]) gs.targets[map] = {};
  if (!gs.targets[map][t.id]) gs.targets[map][t.id] = { hits: t.hits, cleared: false };
  const state = gs.targets[map][t.id];
  if (state.cleared) return { ok: false, msg: 'Already cleared.' };

  // a target with no tool (a bush you pick by hand) needs nothing and wears nothing
  const use = t.tool ? useTool(gs, defs, t.tool) : { ok: true, broke: false, msg: null };
  if (!use.ok) return { ok: false, msg: !hasTool(gs, t.tool) && t.hint ? t.hint : use.msg };

  state.hits -= 1;
  if (state.hits <= 0) {
    state.cleared = true;
    if (t.respawnMs) state.respawnAt = now + t.respawnMs;
    if (t.flag) gs.flags[t.flag] = true;
    const amount = t.drop ? (t.dropAmount ?? 1) : 0;
    if (amount > 0) gs.items[t.drop] = (gs.items[t.drop] ?? 0) + amount;
    return { ok: true, cleared: true, broke: use.broke, left: 0, drop: t.drop, amount, msg: use.msg };
  }
  return { ok: true, cleared: false, broke: use.broke, left: state.hits, msg: use.msg };
}

// Has a cleared target that grows back reached its regrow time? If so it is reset (fresh hits) and true is returned.
export function targetReady(gs, map, id, now = Date.now()) {
  const state = gs.targets[map]?.[id];
  if (!state || !state.cleared || !state.respawnAt || now < state.respawnAt) return false;
  delete gs.targets[map][id];
  return true;
}

export const isCleared = (gs, map, id) => !!gs.targets[map]?.[id]?.cleared;

// ---------- Variants: a target that comes in random kinds (rocks of different colours) ----------
// table = an array from data/rocks.json: [{ id, weight, hits, drop, amount, texture, msg }, ...]
// Rarer kinds have a smaller weight. `rnd` is injectable so tests can pick.
export function rollVariant(table, rnd = Math.random) {
  const total = table.reduce((n, v) => n + v.weight, 0);
  let r = rnd() * total;
  for (const v of table) {
    r -= v.weight;
    if (r < 0) return v;
  }
  return table[table.length - 1];
}

// The kind this target is right now. Rolled once and kept in the save (so reloading doesn't re-roll it);
// when a rock grows back its old state is deleted, so the next call rolls a new colour.
export function variantFor(gs, map, id, table, rnd = Math.random) {
  if (!gs.targets[map]) gs.targets[map] = {};
  const state = gs.targets[map][id];
  const known = state?.variant ? table.find((v) => v.id === state.variant) : null;
  if (known) return known;
  const v = rollVariant(table, rnd);
  gs.targets[map][id] = { hits: v.hits, cleared: false, variant: v.id };
  return v;
}
