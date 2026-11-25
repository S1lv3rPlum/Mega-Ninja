import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { enchantBonus, applyEnchant, talkEnchanter, enchantText } from './src/enchant.js';
import { listEntries } from './src/inventory.js';
const defs = JSON.parse(readFileSync('src/data/enchants.json'));
const items = JSON.parse(readFileSync('src/data/items.json'));
const rec = JSON.parse(readFileSync('src/data/recipes.json'));
const dlg = JSON.parse(readFileSync('src/data/dialogue.json'));
for (const id of Object.keys(defs)) assert.ok(items.items[id], id + ' is an item');
for (const o of rec.enchant.offers) assert.ok(defs[o.out], o.out + ' has an effect');
const gs = { flags: {}, items: { 'ember-gem': 1, 'greater-ember-gem': 1, 'ward-gem': 1, 'swift-scroll': 1 }, weapon: 'sword' };
assert.deepEqual(enchantBonus(gs, defs), { damage: 0, cooldownMul: 1, defense: 0 });
assert.equal(applyEnchant(gs, 'ward-gem', defs).ok, false); // no armor yet
gs.armor = 'sunscale';
assert.equal(applyEnchant(gs, 'ward-gem', defs).ok, true);
assert.equal(enchantBonus(gs, defs).defense, 1);
assert.equal(applyEnchant(gs, 'ember-gem', defs).ok, true);
assert.equal(enchantBonus(gs, defs).damage, 1);
// swapping returns the old one to the bag; only one per slot
assert.equal(applyEnchant(gs, 'greater-ember-gem', defs).ok, true);
assert.equal(gs.items['ember-gem'], 1); assert.equal(enchantBonus(gs, defs).damage, 2);
assert.equal(applyEnchant(gs, 'swift-scroll', defs).ok, true);
assert.equal(gs.items['greater-ember-gem'], 1); assert.equal(enchantBonus(gs, defs).damage, 0);
assert.equal(enchantBonus(gs, defs).cooldownMul, 0.75);
assert.equal(applyEnchant(gs, 'swift-scroll', defs).ok, false);
assert.equal(applyEnchant(gs, 'nonsense', defs).ok, false);
// the bag mentions it
const e = listEntries(gs, items, {}, JSON.parse(readFileSync('src/data/weapons.json')), JSON.parse(readFileSync('src/data/armor.json')), defs);
assert.match(e.find((x) => x.kind === 'weapon').desc, /Swift Scroll \(25% faster swings\)/);
assert.match(e.find((x) => x.kind === 'armor').desc, /Ward Gem \(\+1 defense\)/);
// the workshop menu: make a gem, then use it
const g2 = { flags: {}, items: { ruby: 1, crystal: 2 }, weapon: 'sword', armor: 'sunscale' };
const t = talkEnchanter(g2, 'enchanter', dlg.enchanter, { enchantDefs: defs, itemDefs: items.items, recipes: rec.enchant });
const make = t.choice.onPick(0).choice;
const i = make.options.findIndex((o) => /Ember Gem/.test(o.label) && !/Greater/.test(o.label)); assert.equal(make.options[i].disabled, false);
const back = make.onPick(i); assert.equal(g2.items['ember-gem'], 1); assert.equal(g2.items.ruby, 0);
const main = back.choice.onPick(back.choice.options.length - 1).choice; // Back
const wm = main.onPick(1).choice; // Enchant my weapon
wm.onPick(0);
assert.equal(g2.enchant.weapon, 'ember-gem');
console.log('enchant ok');
