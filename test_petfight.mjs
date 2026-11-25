import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { petStats, petTick, newFightState, trainPet, fitArmor, talkTrainer, TIRED_MS, TRAIN } from './src/petfight.js';
const fd = JSON.parse(readFileSync('src/data/friends.json'));
const items = JSON.parse(readFileSync('src/data/items.json')).items;
const rec = JSON.parse(readFileSync('src/data/recipes.json'));
const armor = JSON.parse(readFileSync('src/data/petarmor.json'));
const pet = { id: 'rabbit1', kind: 'rabbit', name: 'Bunny' };
const gs = { flags: {}, items: { carrot: 20 }, gold: 100, pets: [pet], companion: 'rabbit1' };
assert.equal(petStats(pet, armor), null); // untrained pets do not fight
assert.equal(trainPet(gs, pet, fd).ok, true); assert.equal(pet.level, 1); assert.equal(gs.items.carrot, 18);
assert.equal(trainPet(gs, pet, fd).ok, true); assert.equal(gs.gold, 40); assert.equal(pet.level, 2);
assert.equal(trainPet(gs, pet, fd).ok, false); // 150 gold needed
gs.gold = 500; assert.equal(trainPet(gs, pet, fd).ok, true); assert.equal(trainPet(gs, pet, fd).ok, false); assert.equal(pet.level, 3);
// stamina -> tired -> rested, never hurt
const st = newFightState(); let stats = petStats(pet, armor); assert.equal(stats.dmg, 2);
let now = 1000, hits = 0, res;
for (;;) { res = petTick(st, stats, now, true); now += stats.cooldownMs; if (res === 'attack' || res === 'attack-tired') hits++; if (res === 'attack-tired') break; assert.ok(hits < 100); }
assert.equal(hits, stats.stamina);
assert.equal(petTick(st, stats, now + 100, true), null); // resting
assert.equal(petTick(st, stats, now + TIRED_MS + 10, false), 'rested');
// armor: needs the item, swaps, adds stamina
assert.equal(fitArmor(gs, pet, 'crystal-plate', armor).ok, false);
gs.items['crystal-plate'] = 1; assert.equal(fitArmor(gs, pet, 'crystal-plate', armor).ok, true);
stats = petStats(pet, armor); assert.equal(stats.stamina, TRAIN[2].stamina + 12); assert.equal(stats.dmg, 3);
gs.items['padded-vest'] = 1; fitArmor(gs, pet, 'padded-vest', armor); assert.equal(gs.items['crystal-plate'], 1); // swapped back to the bag
fitArmor(gs, pet, null, armor); assert.equal(pet.armor, undefined); assert.equal(gs.items['padded-vest'], 1);
// trainer menu
const dlg = JSON.parse(readFileSync('src/data/dialogue.json'));
gs.items.wood = 2; gs.items.herb = 2;
const t = talkTrainer(gs, 'trainer', dlg.trainer, { friendDefs: fd, itemDefs: items, armorRecipes: rec.petarmor, armorDefs: armor });
const labels = t.choice.options.map((o) => o.label);
assert.ok(labels.some((l) => /fully trained/.test(l))); assert.equal(labels.at(-1), 'Leave');
const make = t.choice.onPick(labels.indexOf('Make pet armor')).choice;
const vest = make.options.findIndex((o) => /Padded Vest/.test(o.label)); assert.equal(make.options[vest].disabled, false);
make.onPick(vest); assert.equal(gs.items['padded-vest'], 2);
console.log('petfight ok');
