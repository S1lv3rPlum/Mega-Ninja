import assert from 'node:assert';
import defs from './src/data/friends.json' with { type: 'json' };
import items from './src/data/items.json' with { type: 'json' };
import enemies from './src/data/enemies.json' with { type: 'json' };
import * as P from './src/pets.js';

// every treat is a real item, every tameable enemy points at a real kind
for (const [id, k] of Object.entries(defs.kinds)) assert(items.items[k.treat], `${id} treat`);
for (const [id, e] of Object.entries(enemies)) if (e.tame) assert(defs.kinds[e.tame], `${id} tame`);
assert(enemies.shadow.tame === 'shadow' && enemies.bat.tame === 'bat' && !enemies.sapling.tame && !enemies.pebble.tame);

const gs = { items: { carrot: 2 } };
P.ensurePets(gs);
assert.deepEqual(gs.pets, []); assert.equal(gs.companion, null);
assert.equal(P.befriend(gs, 'shadow', '', defs).reason, 'no-treat');
assert.equal(P.befriend(gs, 'nope', '', defs).reason, 'unknown');
const a = P.befriend(gs, 'rabbit', '  Thumper the Great ', defs);
assert(a.ok && a.pet.name === 'Thumper the' && gs.items.carrot === 1 && gs.companion === 'rabbit1');
assert.equal(P.befriend(gs, 'rabbit', '', defs).reason, 'have'); assert.equal(gs.items.carrot, 1);   // one friend per kind: no second bunny, and the treat is kept
assert(P.hasKind(gs, 'rabbit') && !P.hasKind(gs, 'bat'));
gs.items.pumpkin = 1; const b = P.befriend(gs, 'bat', '', defs);
assert(b.ok && b.pet.id === 'bat1' && b.pet.name === 'Bat' && gs.companion === 'rabbit1'); // first one keeps following
assert(P.setCompanion(gs, 'bat1') && P.companionPet(gs).name === 'Bat');
assert(P.setCompanion(gs, null) && !P.companionPet(gs));
assert(!P.setCompanion(gs, 'ghost'));
assert(P.renamePet(gs, 'rabbit1', 'Zoom') && gs.pets[0].name === 'Zoom');
assert(P.releasePet(gs, 'rabbit1') && gs.pets.length === 1);
// no cap on the friend list: every kind can be collected, one each
const full = { items: { herb: 20, carrot: 20, pumpkin: 20, crystal: 20, frostberry: 20, seaweed: 20, 'cactus-fruit': 20 }, pets: [], companion: null };
const kinds = Object.keys(defs.kinds);
assert.equal(defs.max, undefined);
['shadow', 'rabbit', 'bat', 'moth', 'snowfox', 'crab', 'sandlizard'].forEach((k) => assert(P.befriend(full, k, '', defs).ok, k));
assert.equal(full.pets.length, 7); assert.equal(P.isFull(full, defs), false);
assert.equal(P.isFull(full, { max: 7 }), true); // a cap can still be switched on in data
// (a kind you have wins over a full list: you are told you know it already)
assert.equal(P.befriend(full, 'shadow', '', defs).reason, 'have');
// a stale companion id is cleaned up on load
const stale = { pets: [], companion: 'gone' }; P.ensurePets(stale); assert.equal(stale.companion, null);
console.log('pets ok');
