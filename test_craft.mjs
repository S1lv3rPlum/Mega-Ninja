import assert from 'node:assert/strict';
import { getRecipes, craft, talkToCrafter } from './src/craft.js';
import { readFileSync } from 'node:fs';
const rec = JSON.parse(readFileSync('src/data/recipes.json'));
const items = JSON.parse(readFileSync('src/data/items.json')).items;
const gs = { items: { wheat: 3, herb: 1 }, flags: {} };
// every recipe output + ingredient is a real item, and food/potions heal
for (const k of Object.keys(rec)) for (const o of rec[k].offers) {
  if (k !== 'petarmor' && k !== 'enchant') assert.ok(items[o.out]?.heal > 0, o.out + ' heals'); else assert.ok(items[o.out], o.out);
  for (const n of Object.keys(o.needs)) assert.ok(items[n], 'ingredient ' + n);
}
let r = getRecipes(gs, rec.kitchen, items);
assert.equal(r.find((x) => x.id === 'bread').affordable, true);
assert.equal(r.find((x) => x.id === 'carrot-stew').affordable, false);
assert.equal(craft(gs, rec.kitchen, items, 'carrot-stew').ok, false);
assert.equal(craft(gs, rec.kitchen, items, 'bread').ok, true);
assert.equal(gs.items.wheat, 1); assert.equal(gs.items.bread, 1);
const t = talkToCrafter(gs, 'cook', { lines: ['hi'], menu: 'm', farewell: 'bye' }, rec.kitchen, items);
assert.deepEqual(t.lines, ['hi', 'm']);
assert.equal(t.choice.options.at(-1).label, 'Leave');
console.log('craft ok');
