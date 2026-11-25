import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { phaseAt, darkness, skyColor, isNightPhase, isNightAt, forcedPhase, cycleFrom, CYCLE_MS, OUTDOOR } from './src/daynight.js';
import { plant, water, tick, getPlot } from './src/farming.js';
const J = (p) => JSON.parse(readFileSync(p));
// the clock
assert.equal(phaseAt(0), 0); assert.equal(phaseAt(CYCLE_MS / 2), 0.5); assert.ok(phaseAt(CYCLE_MS * 3 + 1000) < 0.01);
assert.equal(darkness(0.2), 0); assert.equal(darkness(0.75), 1); assert.ok(darkness(0.5) > 0 && darkness(0.5) < 1);
assert.ok(darkness(0.99) < darkness(0.93));
assert.deepEqual(skyColor(0.2), [255, 255, 255]); assert.ok(skyColor(0.75)[2] > skyColor(0.75)[0]); // night is blue
assert.equal(isNightPhase(0.2), false); assert.equal(isNightPhase(0.7), true);
assert.equal(isNightAt(CYCLE_MS * 0.7), true); assert.equal(isNightAt(CYCLE_MS * 0.1), false);
assert.equal(forcedPhase('?time=night'), 0.75); assert.equal(forcedPhase('?x=1'), null); assert.equal(cycleFrom('?cycle=60000'), 60000); assert.equal(cycleFrom(''), CYCLE_MS);
// night crops only advance at night
const crops = J('src/data/crops.json');
const gs = { items: { 'moonbloom-seeds': 1, 'seeds': 1 }, can: { water: 5, max: 6 }, plots: {}, flags: {}, gold: 0 };
assert.match(plant(gs, 'farm', 1, 1, 'moonbloom', crops).msg, /only grows at night/);
plant(gs, 'farm', 2, 2, 'wheat', crops);
water(gs, 'farm', 1, 1, 1000, crops); water(gs, 'farm', 2, 2, 1000, crops);
tick(gs, 'farm', 1e9, crops, false);
assert.equal(getPlot(gs, 'farm', 1, 1).stage, 1, 'moonbloom waits for night'); assert.equal(getPlot(gs, 'farm', 2, 2).stage, 2, 'wheat grows any time');
tick(gs, 'farm', 1e9, crops, true);
assert.equal(getPlot(gs, 'farm', 1, 1).stage, 2);
// the night friends are complete: sprite, treat item, seeds, harmless + tameable enemy
const items = J('src/data/items.json').items, fr = J('src/data/friends.json').kinds, en = J('src/data/enemies.json');
for (const k of ['firefly', 'owl', 'moonhare']) {
  assert.ok(fr[k] && items[fr[k].treat], k + ' treat'); assert.ok(existsSync(`public/assets/sprites/${fr[k].texture}.png`));
  assert.equal(en[k].harmless, true); assert.equal(en[k].damage, 0); assert.equal(en[k].tame, k);
  assert.ok(crops[Object.keys(crops).find((c) => crops[c].item === fr[k].treat)].nightOnly, k + ' treat is a night crop');
}
for (const c of ['moonbloom', 'glowcap']) for (const n of [2, 3, 4]) assert.ok(existsSync(`public/assets/sprites/crop-${c}-${n}.png`));
// the maps place them, only as night-only objects
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
for (const m of ['town', 'farm', 'forest', 'garden']) {
  const map = J(`public/assets/maps/${m}.json`); const layer = map.layers.find((l) => l.name === 'enemies');
  const night = layer.objects.filter((o) => props(o).nightOnly); assert.ok(night.length >= 3, m);
  night.forEach((o) => assert.ok(en[props(o).type].harmless));
  assert.ok(OUTDOOR.includes(m));
}
assert.ok(J('public/assets/maps/nightbarn.json').properties.some((p) => p.name === 'dark' && p.value));
console.log('daynight ok');
