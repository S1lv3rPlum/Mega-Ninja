import assert from 'node:assert';
import crystal from './public/assets/maps/crystal.json' with { type: 'json' };
const d = crystal.layers.find((l) => l.name === 'doors').objects.find((o) => o.name === 'to-desert');
const P = Object.fromEntries(d.properties.map((p) => [p.name, p.value]));
// forging the Moon Crest uses up both halves, so the crest itself (or having been through once) must open the desert door
const ids = P.requiresItem.split('|');
assert(ids.includes('moon-crest-half') && ids.includes('moon-crest'));
assert.equal(P.openFlag, 'desert_open');
console.log('desert door ok');
