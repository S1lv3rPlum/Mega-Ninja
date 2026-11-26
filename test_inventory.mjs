import assert from 'node:assert/strict';
import fs from 'node:fs';
import { listEntries, lowTools, moveSelection } from './src/inventory.js';
const items = JSON.parse(fs.readFileSync('src/data/items.json'));
const tools = JSON.parse(fs.readFileSync('src/data/tools.json'));
const gs = { gold: 5, items: { seeds: 3, wheat: 0, wood: 2, shovel: 1, mystery: 4, diamond: 1 }, tools: { axe: { dur: 5 }, shovel: { dur: 0 } } };
const e = listEntries(gs, items, tools);
assert.deepEqual(e.map((x) => x.id), ['seeds', 'wood', 'diamond', 'mystery', 'axe', 'shovel']);
assert.equal(e.find((x) => x.id === 'shovel' && x.kind === 'tool').broken, true);
assert.equal(e.find((x) => x.id === 'axe').repair, '6 wood');
assert.deepEqual(lowTools(gs, tools).map((x) => x.id), ['axe', 'shovel']);
assert.equal(moveSelection(0, 1, 0, 5, 6), 1);
assert.equal(moveSelection(4, 1, 0, 5, 6), 4);
assert.equal(moveSelection(1, 0, 1, 5, 6), 5);
assert.equal(moveSelection(3, 0, 1, 5, 6), 5);
assert.equal(moveSelection(5, 0, -1, 5, 6), 0);
assert.deepEqual(listEntries({ items: {}, tools: {} }, items, tools), []);
console.log('inventory ok');
import { rollVariant, variantFor, hitTarget } from './src/tools.js';
import { getOffers, buy } from './src/shop.js';
const rocks = JSON.parse(fs.readFileSync('src/data/rocks.json')).rocks;
const shop = JSON.parse(fs.readFileSync('src/data/shop.json')).general;
// weighted roll: weights 50/22/12/8/6/2 = 100
assert.equal(rollVariant(rocks, () => 0).id, 'grey');
assert.equal(rollVariant(rocks, () => 0.49).id, 'grey');
assert.equal(rollVariant(rocks, () => 0.51).id, 'copper');
assert.equal(rollVariant(rocks, () => 0.999).id, 'diamond');
const counts = {}; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 20000; i++) { const v = rollVariant(rocks, rnd).id; counts[v] = (counts[v] ?? 0) + 1; }
assert(counts.grey > counts.copper && counts.copper > counts.sapphire && counts.ruby > counts.diamond, JSON.stringify(counts));
// a rock keeps its kind until cleared and grown back
const g2 = { targets: {}, items: {}, flags: {}, tools: { pickaxe: { dur: 30 } } };
const v1 = variantFor(g2, 'quarry', 'rock0', rocks, () => 0.999);
assert.equal(variantFor(g2, 'quarry', 'rock0', rocks, () => 0).id, v1.id);
const t = { id: 'rock0', tool: 'pickaxe', hits: v1.hits, drop: v1.drop, dropAmount: v1.amount, respawnMs: 1000 };
let r; for (let i = 0; i < v1.hits; i++) r = hitTarget(g2, tools, 'quarry', t, 0);
assert(r.cleared && g2.items.diamond === 1 && g2.tools.pickaxe.dur === 30 - v1.hits);
// shop: sells gems, repairs pickaxe, sells a pickaxe
const gs3 = { gold: 100, items: { stone: 5, ruby: 2, diamond: 1, wood: 0 }, tools: { pickaxe: { dur: 10 } }, can: { max: 6 } };
const offers = getOffers(gs3, { offers: shop.offers, sell: shop.sell }, tools);
assert(offers.some((o) => o.id === 'sell-ruby' && o.gain === 160) && offers.some((o) => o.id === 'fixpick' && o.affordable));
assert(!offers.some((o) => o.id === 'pickaxe')); // already own a working one
assert.equal(buy(gs3, shop, tools, 'sell-diamond').ok, true); assert.equal(gs3.gold, 350); assert.equal(gs3.items.diamond, 0);
assert.equal(buy(gs3, shop, tools, 'fixpick').ok, true); assert.equal(gs3.tools.pickaxe.dur, 30); assert.equal(gs3.items.stone, 2);
const gs4 = { gold: 59, items: {}, tools: {}, can: { max: 6 } };
assert.equal(buy(gs4, shop, tools, 'pickaxe').ok, false); gs4.gold = 60;
assert.equal(buy(gs4, shop, tools, 'pickaxe').ok, true); assert.equal(gs4.gold, 0); assert.equal(gs4.tools.pickaxe.dur, 30);
console.log('mining ok', counts);
{
  const { buildPockets, pocketOf, POCKETS } = await import('./src/inventory.js');
  const fish = JSON.parse(fs.readFileSync('src/data/fish.json'));
  const fishIds = Object.keys(fish);
  const all = { gold: 0, items: {}, tools: { axe: { dur: 5 } }, weapon: 'wooden-sword', armor: null };
  Object.keys(items.items).forEach((id) => (all.items[id] = 1));
  const weapons = JSON.parse(fs.readFileSync('src/data/weapons.json')), armor = JSON.parse(fs.readFileSync('src/data/armor.json'));
  all.weapon = Object.keys(weapons)[0]; all.armor = Object.keys(armor)[0];
  const ents = listEntries(all, items, tools, weapons, armor);
  const pk = buildPockets(ents, fishIds);
  assert.equal(pk.reduce((a, p) => a + p.entries.length, 0), ents.length); // nothing lost, nothing doubled
  assert.ok(pk.every((p) => p.entries.length <= 25));
  assert.equal(pk.length, POCKETS.length, 'with today\'s items every pocket fits on one page');
  const where = (id) => pk.find((p) => p.entries.some((e) => e.id === id && e.kind === 'item'))?.id;
  assert.equal(where('carrot-seeds'), 'seeds'); assert.equal(where('seeds'), 'seeds');
  assert.equal(where('bread'), 'food'); assert.equal(where('swift-brew'), 'food'); assert.equal(where('healing-potion'), 'food');
  assert.equal(where('pond-minnow'), 'fish'); assert.equal(where('soggy-boot'), 'fish'); assert.equal(where('fish-stew'), 'food');
  assert.equal(where('carrot'), 'crops'); assert.equal(where('ruby'), 'stuff'); assert.equal(where('moon-crest'), 'stuff');
  assert.equal(where('fishing-rod'), 'gear'); assert.equal(where('ember-gem'), 'gear'); assert.equal(where('copper-mail'), 'gear');
  assert.equal(pocketOf({ kind: 'tool', id: 'axe' }), 'gear'); assert.equal(pocketOf({ kind: 'item', id: 'mystery', heal: 0 }), 'stuff');
  // spill: 7 things with 3 per page -> pages
  const many = Array.from({ length: 7 }, (_, i) => ({ kind: 'item', id: `rock${i}`, heal: 0 }));
  const sp = buildPockets(many, [], 3).filter((p) => p.id.startsWith('stuff'));
  assert.deepEqual(sp.map((p) => [p.label, p.entries.length]), [['STUFF', 3], ['STUFF 2', 3], ['STUFF 3', 1]]);
  console.log('pockets ok');
}
