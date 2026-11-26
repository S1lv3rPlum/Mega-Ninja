import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getOffers, buy, talkToShopkeeper } from './src/shop.js';
import { placeOrder, canAfford, costText } from './src/smith.js';
import * as F from './src/fishing.js';
const R = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const tools = R('./src/data/tools.json'), shop = R('./src/data/shop.json'), weapons = R('./src/data/weapons.json'), dlg = R('./src/data/dialogue.json'), items = R('./src/data/items.json').items;
const mk = (o = {}) => ({ gold: 0, flags: {}, items: {}, tools: { axe: { dur: 30 }, pickaxe: { dur: 30 }, shovel: { dur: 20 } }, can: { max: 5 }, ...o });

// ---- the tinker: repairs for gold or materials, and buys wood/stone
assert.ok(dlg.tinker.lines.length && dlg.tinker.menu && dlg.tinker.nothing && dlg.tinker.farewell);
let gs = mk();
assert.deepEqual(getOffers(gs, shop.tinker, tools), []);                                                 // nothing worn, nothing to sell
assert.equal(talkToShopkeeper(gs, 'tinker1', dlg.tinker, shop.tinker, tools).choice, undefined);
gs.tools.axe.dur = 3; gs.tools.shovel.dur = 0; gs.gold = 30;
const ids = () => getOffers(gs, shop.tinker, tools).map((o) => o.id);
assert.deepEqual(ids(), ['gfixaxe', 'gfixshovel', 'fixaxe']);
assert.equal(buy(gs, shop.tinker, tools, 'gfixaxe').ok, true); assert.equal(gs.gold, 5); assert.equal(gs.tools.axe.dur, 30);
assert.equal(buy(gs, shop.tinker, tools, 'gfixshovel').ok, false); assert.equal(gs.tools.shovel.dur, 0);   // 15g needed, has 5
gs.gold = 15; assert.equal(buy(gs, shop.tinker, tools, 'gfixshovel').ok, true); assert.equal(gs.tools.shovel.dur, tools.shovel.durability); assert.equal(gs.gold, 0);
// by materials, and a sturdier tool is repaired to its new maximum
gs.tools.pickaxe.dur = 1; gs.toolMax = { pickaxe: 70 }; gs.items.stone = 3;
assert.equal(buy(gs, shop.tinker, tools, 'fixpick').ok, true); assert.equal(gs.tools.pickaxe.dur, 70); assert.equal(gs.items.stone, 0);
gs.tools.pickaxe.dur = 1; gs.gold = 25; buy(gs, shop.tinker, tools, 'gfixpick'); assert.equal(gs.tools.pickaxe.dur, 70);
// no tool, no offer
assert.deepEqual(getOffers(mk({ tools: {} }), shop.tinker, tools), []);
// selling wood
gs.items.wood = 5; gs.gold = 0; assert.equal(buy(gs, shop.tinker, tools, 'sell-wood').ok, true); assert.equal(gs.gold, 15); assert.equal(gs.items.wood, 0);
gs.items.wood = 2; assert.equal(buy(gs, shop.general, tools, 'sell-wood').ok, true); assert.equal(gs.gold, 21);
assert.ok(items.wood);

// ---- weapon orders now need wood too
for (const id of ['shadowglass', 'moonreaper']) assert.ok(weapons[id].smith.items.wood > 0, id);
gs = mk({ weapon: 'sword', gold: 500, items: { crystal: 4, copper: 3 }, smith: null, marketVisits: 1 });
assert.equal(canAfford(gs, weapons.shadowglass), false); assert.equal(placeOrder(gs, weapons, 'shadowglass').ok, false);
gs.items.wood = 4; assert.equal(canAfford(gs, weapons.shadowglass), true); assert.equal(placeOrder(gs, weapons, 'shadowglass').ok, true);
assert.equal(gs.items.wood, 0); assert.match(costText(weapons.shadowglass), /4 wood/);

// ---- better fishing rods
gs = mk({ gold: 1000, items: { wood: 60 } });
assert.equal(F.rodLevel(gs), 0); assert.equal(F.rodName(gs), 'Fishing Rod'); assert.deepEqual(F.rodBonus(gs), { window: 0, zone: 0 });
const base = F.startCast(0, () => 0, F.rodBonus(gs)); assert.equal(base.window, F.BITE_WINDOW);
assert.equal(F.castStatus(base, base.biteAt + F.BITE_WINDOW + 50), 'lost');
assert.equal(F.buildRod(gs).ok, true); assert.equal(F.rodName(gs), 'Pine Rod'); assert.equal(gs.gold, 950); assert.equal(gs.items.wood, 50);
const c1 = F.startCast(0, () => 0, F.rodBonus(gs)); assert.equal(F.castStatus(c1, c1.biteAt + F.BITE_WINDOW + 50), 'bite'); // the longer window saves you
assert.ok(F.startReel({ zone: 0.2, speed: 1000, reel: 1 }, 0, () => 0.5, F.rodBonus(gs)).zone > 0.2);
assert.equal(F.buildRod(gs).ok, true); assert.equal(F.buildRod(gs).ok, true); assert.equal(F.rodName(gs), 'Master Rod');
assert.equal(F.buildRod(gs).ok, false); assert.equal(F.nextRod(gs), null); assert.equal(gs.items.wood, 0); assert.equal(gs.gold, 1000 - 50 - 150 - 400);
// zone never gets silly
assert.ok(F.startReel({ zone: 0.5, speed: 1000 }, 0, () => 0.5, { zone: 0.5 }).zone <= 0.7);
// the fisher's menu shows the rod offer, greyed out until you can pay
gs = mk({ gold: 0, items: {} }); gs.flags.met_fisher = true;
const ctx = { fishDefs: R('./src/data/fish.json'), areaNames: {} };
let s = F.talkFisher(gs, 'fisher', dlg.fisher, ctx);
assert.equal(s.choice.options.length, 5); assert.match(s.choice.options[3].label, /Pine Rod: 10 wood \+ 50g/); assert.equal(s.choice.options[3].disabled, true);
gs.gold = 50; gs.items.wood = 10; s = F.talkFisher(gs, 'fisher', dlg.fisher, ctx); assert.equal(s.choice.options[3].disabled, false);
const built = s.choice.onPick(3); assert.match(built.lines[0], /Pine Rod/); assert.equal(built.choice.options[3].disabled, true); // next one costs more
console.log('wood ok');
