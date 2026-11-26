import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getOffers, buy } from './src/shop.js';
import { maxDur, repairTool, useTool, toolLabel, giveTool } from './src/tools.js';
import { listEntries, lowTools } from './src/inventory.js';
const tools = JSON.parse(fs.readFileSync('src/data/tools.json'));
const shop = JSON.parse(fs.readFileSync('src/data/shop.json'));
const items = JSON.parse(fs.readFileSync('src/data/items.json'));
const mk = (gold) => ({ gold, items: { wood: 20, stone: 20 }, flags: {}, can: { water: 0, max: 5 }, tools: { axe: { dur: 30 }, pickaxe: { dur: 12 } } });

// offers appear for a tool you own, not for one you don't
let gs = mk(1000);
const ids = () => getOffers(gs, shop.general, tools).map((o) => o.id);
assert.ok(ids().includes('axeup') && ids().includes('pickup'));
delete gs.tools.axe; assert.ok(!ids().includes('axeup')); gs.tools.axe = { dur: 30 };
// buying: gold is spent, the tool gets sturdier AND is refilled
let r = buy(gs, shop.general, tools, 'pickup');
assert.ok(r.ok, r.msg); assert.equal(gs.gold, 920); assert.equal(maxDur(gs, tools, 'pickaxe'), 45); assert.equal(gs.tools.pickaxe.dur, 45);
assert.equal(maxDur(gs, tools, 'axe'), 30); // the other tool is untouched
// next level, then the top, then it disappears
buy(gs, shop.general, tools, 'pickup'); assert.equal(maxDur(gs, tools, 'pickaxe'), 70);
buy(gs, shop.general, tools, 'pickup'); assert.equal(maxDur(gs, tools, 'pickaxe'), 100);
assert.ok(!ids().includes('pickup'));
assert.equal(buy(gs, shop.general, tools, 'pickup').ok, false);
assert.equal(gs.gold, 1000 - 80 - 200 - 400);
// can't afford
gs = mk(50); r = buy(gs, shop.general, tools, 'axeup'); assert.equal(r.ok, false); assert.equal(maxDur(gs, tools, 'axe'), 30);
// wear, repair and labels all use the new maximum
gs = mk(500); buy(gs, shop.general, tools, 'axeup');
for (let i = 0; i < 10; i++) useTool(gs, tools, 'axe'); assert.equal(gs.tools.axe.dur, 35);
assert.equal(toolLabel(gs, tools, 'axe'), 'Axe 35/45');
assert.equal(repairTool(gs, tools, 'axe').ok, true); assert.equal(gs.tools.axe.dur, 45);
assert.equal(repairTool(gs, tools, 'axe').ok, false); // already perfect at the NEW max
const e = listEntries(gs, items, tools).find((x) => x.id === 'axe' && x.kind === 'tool'); assert.equal(e.max, 45);
gs.tools.axe.dur = 10; assert.deepEqual(lowTools(gs, tools).find((x) => x.id === 'axe'), { id: 'axe', name: 'Axe', dur: 10, max: 45 });
// a replacement bought after a break keeps the upgrade
gs.tools.axe.dur = 0; assert.ok(ids().includes('axe')); buy(gs, shop.general, tools, 'axe'); assert.equal(gs.tools.axe.dur, 45);
// a broken tool is refilled by upgrading too (and the miner sells the pickaxe upgrade)
gs = mk(500); gs.tools.pickaxe.dur = 0;
assert.ok(getOffers(gs, shop.miner, tools).some((o) => o.id === 'pickup')); buy(gs, shop.miner, tools, 'pickup'); assert.equal(gs.tools.pickaxe.dur, 45);
// old saves with no toolMax behave as before
assert.equal(maxDur({}, tools, 'axe'), 30);
console.log('toolup ok');
