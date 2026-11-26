import assert from 'node:assert/strict';
import fs from 'node:fs';
import { talkToShopkeeper, getOffers, buy } from './src/shop.js';
const R = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const shop = R('./src/data/shop.json'), tools = R('./src/data/tools.json'), dlg = R('./src/data/dialogue.json');
const q = R('./public/assets/maps/quarry.json');
const miner = q.layers.find((l) => l.name === 'npcs').objects.find((o) => o.name === 'miner');
assert.equal(miner.properties.find((p) => p.name === 'shop').value, 'miner');
const gs = { flags: {}, gold: 0, items: {}, tools: { pickaxe: { dur: 30 } } };
// no pickaxe at all: he just says so
const bare = { ...gs, tools: {} };
let s = talkToShopkeeper(bare, 'miner', dlg.miner, shop.miner, tools);
assert.equal(s.choice, undefined); assert.equal(s.lines.at(-1), dlg.miner.nothing);
// a fine pickaxe, no gold: only the (greyed-out) sturdier-pickaxe offer
s = talkToShopkeeper(gs, 'miner', dlg.miner, shop.miner, tools);
assert.deepEqual(s.choice.options.map((o) => o.disabled), [true, false]); assert.match(s.choice.options[0].label, /Sturdier Pickaxe/);
// worn, no stone: the offer is greyed out
gs.tools.pickaxe.dur = 4;
s = talkToShopkeeper(gs, 'miner', dlg.miner, shop.miner, tools);
assert.deepEqual(s.choice.options.map((o) => o.disabled), [true, true, false]); assert.match(s.choice.options[0].label, /Fix Pickaxe \(3 stone\)/);
// with stone it is fixed (and a broken one too); only repairs are on offer here, nothing to buy
gs.items.stone = 5;
let r = s.choice.onPick(0); assert.equal(gs.tools.pickaxe.dur, 30); assert.equal(gs.items.stone, 2);
gs.tools.pickaxe.dur = 0; assert.equal(buy(gs, shop.miner, tools, 'fixpick').ok, false); // only 2 stone left
gs.items.stone = 3; assert.equal(buy(gs, shop.miner, tools, 'fixpick').ok, true); assert.equal(gs.tools.pickaxe.dur, 30);
assert.equal(getOffers({ ...gs, tools: {} }, shop.miner, tools).length, 0);              // no pickaxe at all: nothing offered
console.log('minerfix ok');
