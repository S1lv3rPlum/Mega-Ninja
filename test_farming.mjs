import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ensureState, plant, water, harvest, tick, plantable, getPlot } from './src/farming.js';
import { hitTarget, variantFor } from './src/tools.js';
const crops = JSON.parse(fs.readFileSync('src/data/crops.json'));
const gs = { gold: 0, items: { seeds: 1, 'carrot-seeds': 2, 'pumpkin-seeds': 0 }, can: { water: 6, max: 6 }, plots: {}, flags: {}, quests: {}, drops: {} };
ensureState(gs);
assert.deepEqual(plantable(gs, crops).map((c) => c.id), ['wheat', 'carrot']);
assert.equal(plant(gs, 'farm', 1, 1, 'pumpkin', crops).ok, false);
assert.equal(plant(gs, 'farm', 1, 1, 'carrot', crops).ok, true); assert.equal(gs.items['carrot-seeds'], 1);
assert.equal(plant(gs, 'farm', 2, 1, 'wheat', crops).ok, true);
water(gs, 'farm', 1, 1, 0, crops); water(gs, 'farm', 2, 1, 0, crops);
assert.equal(getPlot(gs, 'farm', 1, 1).crop, 'carrot');
// carrot grows in 9s, wheat needs 15s
tick(gs, 'farm', 9000);
assert.equal(getPlot(gs, 'farm', 1, 1).stage, 2); assert.equal(getPlot(gs, 'farm', 2, 1).stage, 1);
tick(gs, 'farm', 15000); assert.equal(getPlot(gs, 'farm', 2, 1).stage, 2);
for (let i = 0; i < 3; i++) { water(gs, 'farm', 1, 1, 0, crops); tick(gs, 'farm', 9999); }
assert.equal(getPlot(gs, 'farm', 1, 1).stage, 4, 'carrot ready');
const h = harvest(gs, 'farm', 1, 1, () => 0.9, crops);
assert(h.ok && gs.items.carrot === 1 && gs.items['carrot-seeds'] === 3 && h.msg.includes('carrot'), JSON.stringify([h, gs.items]));
// old saves: a plot without a crop is wheat
gs.plots.farm['5,5'] = { stage: 4, growsAt: null };
harvest(gs, 'farm', 5, 5, () => 0, crops); assert.equal(gs.items.wheat, 1);
// bush: no tool needed
const rocks = JSON.parse(fs.readFileSync('src/data/rocks.json'));
const g2 = { targets: {}, items: {}, flags: {}, tools: {} };
const v = variantFor(g2, 'town', 'bush0', rocks.forageTown, () => 0);
const t = { id: 'bush0', tool: '', hits: v.hits, drop: v.drop, dropAmount: v.amount, respawnMs: 1000 };
const r = hitTarget(g2, {}, 'town', t, 0);
assert(r.ok && r.cleared && g2.items['carrot-seeds'] === 2);
console.log('farming ok');

// ---- the treat crops (frostberry, seaweed, cactus fruit) grow like the others ----
{
  const F = await import('./src/farming.js');
  const crops = (await import('./src/data/crops.json', { with: { type: 'json' } })).default;
  for (const id of ['frostberry', 'seaweed', 'cactus-fruit']) {
    const gs = { items: { [crops[id].seed]: 2 }, can: { water: 9, max: 10 }, plots: {}, flags: {} };
    F.ensureState(gs);
    assert.equal(F.plantable(gs, crops).some((c) => c.id === id), true);
    assert.equal(F.plant(gs, 'farm', 1, 1, id, crops).ok, true);
    let now = 1000;
    for (let i = 0; i < F.MAX_STAGE && gs.plots.farm['1,1'].stage < F.MAX_STAGE; i++) {
      F.water(gs, 'farm', 1, 1, now, crops);
      now += crops[id].growMs + 1;
      F.tick(gs, 'farm', now);
    }
    assert.equal(gs.plots.farm['1,1'].stage, F.MAX_STAGE, id);
    assert.equal(F.harvest(gs, 'farm', 1, 1, () => 0.5, crops).ok, true, id);
    assert((gs.items[crops[id].item] ?? 0) >= 1, `${id} yields its treat`);
  }
  console.log('treat crops ok');
}
