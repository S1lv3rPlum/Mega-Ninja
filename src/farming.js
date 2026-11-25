// Farming rules. No Phaser in here, so it is easy to test and to tune.
//
// A plot goes through these stages:
//   0 dirt (empty) -> plant a seed -> 1 sown -> water -> 2 sprouts -> water -> 3 young plant -> water -> 4 ready -> harvest -> 0
// Each watering starts a growth timer. Timers use real clock time and are saved,
// so crops keep growing while the player is away.

// Crops come from data/crops.json (seed item, harvest item, growMs per stage, seedsBack [min, max]).
// The functions below take that table as their last argument; this default keeps plain wheat working on its own.
export const DEFAULT_CROPS = { wheat: { name: 'Wheat', seed: 'seeds', item: 'wheat', growMs: 15000, seedsBack: [1, 2] } };
export const GROW_MS = 15000; // time for one stage to grow after watering (15 s while testing; try 60000+ later)
export const MAX_STAGE = 4;   // ready to harvest
export const CAN_MAX = 6;     // how much water the can holds
export const STARTER_SEEDS = 10;
export const FREE_SEEDS = 3;

const key = (x, y) => `${x},${y}`;

// Make sure an older save (or a brand-new game) has every field the farm needs
export function ensureState(gs) {
  if (typeof gs.gold !== 'number') gs.gold = 0;
  if (!gs.items) gs.items = {};
  if (typeof gs.items.seeds !== 'number') gs.items.seeds = 0;
  if (typeof gs.items.wheat !== 'number') gs.items.wheat = 0;
  if (typeof gs.items.shovel !== 'number') gs.items.shovel = 0;
  if (!gs.drops) gs.drops = {}; // items lying on the ground: { mapName: [{ x, y, item }] }
  if (!gs.can) gs.can = { water: 0, max: CAN_MAX };
  if (!gs.plots) gs.plots = {};
  if (!gs.quests) gs.quests = {};
  if (!gs.flags) gs.flags = {};
}

export function getPlot(gs, map, x, y) {
  return gs.plots[map]?.[key(x, y)] ?? { stage: 0, growsAt: null };
}

function setPlot(gs, map, x, y, plot) {
  if (!gs.plots[map]) gs.plots[map] = {};
  if (plot.stage === 0) delete gs.plots[map][key(x, y)]; // empty plots aren't stored
  else gs.plots[map][key(x, y)] = plot;
}

// Which crops can you plant right now? (the ones you carry seeds for)
export function plantable(gs, crops = DEFAULT_CROPS) {
  return Object.entries(crops).filter(([, c]) => (gs.items[c.seed] ?? 0) > 0).map(([id, c]) => ({ id, ...c, count: gs.items[c.seed] }));
}

export function plant(gs, map, x, y, cropId = 'wheat', crops = DEFAULT_CROPS) {
  const crop = crops[cropId];
  if (getPlot(gs, map, x, y).stage !== 0) return { ok: false, msg: 'Something is already growing here.' };
  if (!crop || (gs.items[crop.seed] ?? 0) < 1) return { ok: false, msg: 'You have no seeds.' };
  gs.items[crop.seed] -= 1;
  setPlot(gs, map, x, y, { stage: 1, growsAt: null, crop: cropId });
  return { ok: true, msg: `Planted ${crop.name.toLowerCase()}. It needs water.` };
}

export function water(gs, map, x, y, now = Date.now(), crops = DEFAULT_CROPS) {
  const p = getPlot(gs, map, x, y);
  if (p.stage < 1 || p.stage >= MAX_STAGE) return { ok: false, msg: 'Nothing to water here.' };
  if (p.growsAt !== null) return { ok: false, msg: 'Already watered. Give it time.' };
  if (gs.can.water < 1) return { ok: false, msg: 'Your can is empty. Fill it at the pump.' };
  gs.can.water -= 1;
  const crop = crops[p.crop ?? 'wheat'] ?? DEFAULT_CROPS.wheat;
  setPlot(gs, map, x, y, { stage: p.stage, growsAt: now + (crop.growMs ?? GROW_MS), crop: p.crop ?? 'wheat' });
  return { ok: true, msg: 'Watered.' };
}

export function harvest(gs, map, x, y, rng = Math.random, crops = DEFAULT_CROPS) {
  const p = getPlot(gs, map, x, y);
  if (p.stage !== MAX_STAGE) return { ok: false, msg: 'Not ready yet.' };
  const crop = crops[p.crop ?? 'wheat'] ?? DEFAULT_CROPS.wheat;
  const [lo, hi] = crop.seedsBack ?? [1, 2];
  const seeds = lo + (rng() < 0.5 ? 0 : hi - lo); // always get seeds back, sometimes more
  gs.items[crop.item] = (gs.items[crop.item] ?? 0) + 1;
  gs.items[crop.seed] = (gs.items[crop.seed] ?? 0) + seeds;
  setPlot(gs, map, x, y, { stage: 0, growsAt: null });
  return { ok: true, msg: `Harvested ${crop.name.toLowerCase()}! +${seeds} seed${seeds > 1 ? 's' : ''}` };
}

// The rabbit eats whatever is growing on a plot and leaves bare dirt. Returns true if something was eaten.
export function eatPlot(gs, map, x, y) {
  if (getPlot(gs, map, x, y).stage === 0) return false;
  setPlot(gs, map, x, y, { stage: 0, growsAt: null });
  return true;
}

export function fillCan(gs) {
  if (gs.can.water >= gs.can.max) return { ok: false, msg: 'Your can is already full.' };
  gs.can.water = gs.can.max;
  return { ok: true, msg: 'Filled your watering can.' };
}

// Advance any plots on this map whose timer has finished. Returns the plots that changed.
export function tick(gs, map, now = Date.now()) {
  const changed = [];
  const plots = gs.plots[map];
  if (!plots) return changed;
  for (const k of Object.keys(plots)) {
    const p = plots[k];
    if (p.growsAt !== null && now >= p.growsAt && p.stage < MAX_STAGE) {
      p.stage += 1;
      p.growsAt = null;
      const [x, y] = k.split(',').map(Number);
      changed.push({ x, y, stage: p.stage });
    }
  }
  return changed;
}

// How many plants are in the ground across all maps
export function plantedCount(gs) {
  return Object.values(gs.plots).reduce((n, m) => n + Object.keys(m).length, 0);
}
