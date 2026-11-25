import assert from 'node:assert';
import cfg from './src/data/sealed-door.json' with { type: 'json' };
import { missingForDoor, openDoor, doorIsOpen } from './src/door.js';
import { isWorldFlag } from './src/coopLogic.js';

const names = { ruby: 'Ruby', 'crest-stone': 'Crest Stone' };
const gs = { items: { ruby: 1, sapphire: 1 }, flags: {} };
assert.deepEqual(missingForDoor(gs, cfg, names), ['emerald', 'Crest Stone']);
assert(!openDoor(gs, cfg).ok);
assert.equal(gs.items.ruby, 1); // nothing is used up when something is missing
gs.items.emerald = 1; gs.items['crest-stone'] = 1; gs.items.diamond = 2;
const r = openDoor(gs, cfg);
assert(r.ok && doorIsOpen(gs, cfg));
assert.equal(gs.items.ruby, 0); assert.equal(gs.items['crest-stone'], 0); assert.equal(gs.items.diamond, 2);
assert(!openDoor(gs, cfg).ok); // already open
assert(isWorldFlag('stonedoor_cleared') && isWorldFlag('golem_defeated'));
assert(!isWorldFlag('got_crest') && !isWorldFlag('golem_intro_seen'));
console.log('door ok');
