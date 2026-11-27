// The big cave: eight chambers to discover, a teacher outside who thanks you with cooking and brewing,
// and a treasure chest in the last chamber. No Phaser in here.
// Everything lives in gs.flags (personal, saved): cave_ch_<id> (found), cave_chest_open, learned_cook, learned_brew, met_cavemaster.
// cfg = data/cave.json; chambers = the map's "chambers" rectangles [{ id, name, x0, y0, x1, y1 }] in tiles.

export const chamberFlag = (id) => `cave_ch_${id}`;
export const foundCount = (gs, cfg) => cfg.chambers.filter((c) => gs.flags[chamberFlag(c.id)]).length;
export const allFound = (gs, cfg) => foundCount(gs, cfg) >= cfg.chambers.length;
export const chamberAt = (chambers, x, y) => chambers.find((c) => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1) ?? null;

// You stepped onto (x, y). Returns a message the first time you enter a new chamber, otherwise null.
export function stepInto(gs, cfg, chambers, x, y) {
  const c = chamberAt(chambers, x, y);
  if (!c || gs.flags[chamberFlag(c.id)]) return null;
  gs.flags[chamberFlag(c.id)] = true;
  const n = foundCount(gs, cfg);
  const total = cfg.chambers.length;
  if (n >= total) return `${c.name}! That is all ${total} chambers. Go and tell the teacher outside!`;
  return `Discovered: ${c.name} (${n} of ${total})`;
}

export const hasLearned = (gs) => !!gs.flags.learned_cook && !!gs.flags.learned_brew;

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

// The teacher outside the cave. First time: asks for help. Then reports progress. When every chamber is found: teaches.
export function talkTeacher(gs, data, cfg) {
  const first = !gs.flags.met_cavemaster;
  gs.flags.met_cavemaster = true;
  const n = foundCount(gs, cfg);
  const total = cfg.chambers.length;
  if (hasLearned(gs)) return { lines: data.repeatLines };
  if (n >= total) {
    gs.flags.learned_cook = true;
    gs.flags.learned_brew = true;
    return { lines: [...(first ? data.lines : []), ...data.teachLines], afterClose: () => 'You can cook and brew now! Look for the COOK and BREW tabs in your bag.' };
  }
  const progress = fill(n === 0 ? data.noneLine : data.progress, { n, total });
  return { lines: first ? [...data.lines, progress] : [progress] };
}

// The treasure chest in the last chamber. Returns { ok, lines, msg }; the reward is given once.
export function openChest(gs, cfg, itemDefs, data) {
  if (gs.flags.cave_chest_open) return { ok: false, lines: data.openLines ?? data.repeatLines };
  gs.flags.cave_chest_open = true;
  const parts = [];
  if (cfg.chest.gold) {
    gs.gold += cfg.chest.gold;
    parts.push(`${cfg.chest.gold} gold`);
  }
  for (const [id, n] of Object.entries(cfg.chest.items ?? {})) {
    gs.items[id] = (gs.items[id] ?? 0) + n;
    parts.push(`${n} ${itemDefs[id]?.name ?? id}`);
  }
  return { ok: true, lines: data.lines, msg: `The chest held: ${parts.join(', ')}!` };
}
