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
const b = P.befriend(gs, 'rabbit', '', defs);
assert(b.ok && b.pet.id === 'rabbit2' && b.pet.name === 'Bunny' && gs.companion === 'rabbit1'); // first one keeps following
assert.equal(P.befriend(gs, 'rabbit', 'x', defs).reason, 'no-treat');
assert(P.setCompanion(gs, 'rabbit2') && P.companionPet(gs).name === 'Bunny');
assert(P.setCompanion(gs, null) && !P.companionPet(gs));
assert(!P.setCompanion(gs, 'ghost'));
assert(P.renamePet(gs, 'rabbit1', 'Zoom') && gs.pets[0].name === 'Zoom');
assert(P.releasePet(gs, 'rabbit1') && gs.pets.length === 1);
// the friend list is capped
const full = { items: { herb: 20 }, pets: [], companion: null };
for (let i = 0; i < defs.max; i++) assert(P.befriend(full, 'shadow', '', defs).ok);
assert.equal(P.befriend(full, 'shadow', '', defs).reason, 'full'); assert.equal(full.items.herb, 20 - defs.max);
// a stale companion id is cleaned up on load
const stale = { pets: [], companion: 'gone' }; P.ensurePets(stale); assert.equal(stale.companion, null);
console.log('pets ok');
