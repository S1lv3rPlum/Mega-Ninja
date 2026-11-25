import assert from 'node:assert';
import defs from './src/data/weapons.json' with { type: 'json' };
import dlg from './src/data/dialogue.json' with { type: 'json' };
import items from './src/data/items.json' with { type: 'json' };
import * as S from './src/smith.js';

// every ingredient is a real item; ranks are a clean chain; every weapon has an icon entry
const ranks = Object.values(defs).map((d) => d.rank).sort();
assert.deepEqual(ranks, ranks.map((_, i) => i + 1));
for (const [id, d] of Object.entries(defs)) {
  assert(items.weapons[id], `${id} icon`);
  for (const k of Object.keys(d.smith?.items ?? {})) assert(items.items[k], `${id}: ${k}`);
}
const data = dlg.hexsmith; assert(data && data.ready && data.working && data.offer && data.ordered && data.done);

const gs = { flags: {}, gold: 0, items: {}, weapon: 'sword' };
S.ensureSmith(gs);
assert.equal(S.nextWeapon(gs, defs), 'shadowglass');
let step = S.talkToSmith(gs, 'hexsmith', data, defs);
assert(step.choice.options[0].disabled);                          // too poor
assert.equal(S.placeOrder(gs, defs, 'shadowglass').ok, false);
assert.equal(S.placeOrder(gs, defs, 'moonreaper').ok, false);     // cannot skip a rank
const cost = defs.shadowglass.smith; gs.gold = cost.gold + 5;
for (const [k, n] of Object.entries(cost.items)) gs.items[k] = n + 1;
gs.marketVisits = 1;
step = S.talkToSmith(gs, 'hexsmith', data, defs);
assert(!step.choice.options[0].disabled);
let r = step.choice.onPick(0); assert.equal(r.afterClose(), 'Ordered the Shadowglass Blade.');
assert.equal(gs.gold, 5); assert.equal(gs.weapon, 'sword');
assert.equal(S.orderReady(gs), false);                            // same visit: not ready
step = S.talkToSmith(gs, 'hexsmith', data, defs); assert.match(step.lines.at(-1), /Shadowglass/); assert.equal(gs.weapon, 'sword');
assert.equal(S.placeOrder(gs, defs, 'shadowglass').ok, false);    // one order at a time
gs.marketVisits = 2;                                              // left and came back
assert(S.orderReady(gs));
step = S.talkToSmith(gs, 'hexsmith', data, defs); assert.equal(step.afterClose(), 'You got the Shadowglass Blade!');
assert.equal(gs.weapon, 'shadowglass'); assert.equal(gs.smith, null);
assert.equal(S.nextWeapon(gs, defs), 'moonreaper');
gs.weapon = 'moonreaper';
step = S.talkToSmith(gs, 'hexsmith', data, defs); assert(!step.choice); assert.equal(S.nextWeapon(gs, defs), null);
console.log('smith ok');
