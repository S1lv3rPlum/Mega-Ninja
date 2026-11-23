// Farming rules. No Phaser in here, so it is easy to test and to tune.
//
// A plot goes through these stages:
//   0 dirt (empty) -> plant a seed -> 1 sown -> water -> 2 sprouts -> water -> 3 young plant -> water -> 4 ready -> harvest -> 0
// Each watering starts a growth timer. Timers use real clock time and are saved,
// so crops keep growing while the player is away.

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

export function plant(gs, map, x, y) {
  if (getPlot(gs, map, x, y).stage !== 0) return { ok: false, msg: 'Something is already growing here.' };
  if (gs.items.seeds < 1) return { ok: false, msg: 'You have no seeds.' };
  gs.items.seeds -= 1;
  setPlot(gs, map, x, y, { stage: 1, growsAt: null });
  return { ok: true, msg: 'Planted a seed. It needs water.' };
}

export function water(gs, map, x, y, now = Date.now()) {
  const p = getPlot(gs, map, x, y);
  if (p.stage < 1 || p.stage >= MAX_STAGE) return { ok: false, msg: 'Nothing to water here.' };
  if (p.growsAt !== null) return { ok: false, msg: 'Already watered. Give it time.' };
  if (gs.can.water < 1) return { ok: false, msg: 'Your can is empty. Fill it at the pump.' };
  gs.can.water -= 1;
  setPlot(gs, map, x, y, { stage: p.stage, growsAt: now + GROW_MS });
  return { ok: true, msg: 'Watered.' };
}

export function harvest(gs, map, x, y, rng = Math.random) {
  if (getPlot(gs, map, x, y).stage !== MAX_STAGE) return { ok: false, msg: 'Not ready yet.' };
  const seeds = 1 + (rng() < 0.5 ? 1 : 0); // always get a seed back, sometimes two
  gs.items.wheat += 1;
  gs.items.seeds += seeds;
  setPlot(gs, map, x, y, { stage: 0, growsAt: null });
  return { ok: true, msg: `Harvested wheat! +${seeds} seed${seeds > 1 ? 's' : ''}` };
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
