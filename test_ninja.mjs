import assert from 'node:assert/strict';
import { NINJA_COLORS, NINJA_IDS, ninjaId, isAccent, recolorPixel, recolorData, talkTailor } from './src/ninja.js';
import { readFileSync } from 'node:fs';
assert.deepEqual(NINJA_IDS, ['red', 'pink', 'green', 'yellow']);
assert.equal(ninjaId({}), 'red'); assert.equal(ninjaId({ ninja: 'green' }), 'green'); assert.equal(ninjaId({ ninja: 'purple' }), 'red');
// only the red scarf pixels change; black, grey and skin stay
assert.equal(isAccent(255, 0, 0), true); assert.equal(isAccent(210, 40, 50), true); assert.equal(isAccent(120, 0, 0), true);
for (const px of [[0, 0, 0], [33, 33, 33], [149, 149, 149], [240, 200, 160], [255, 255, 255], [35, 35, 50]]) assert.equal(isAccent(...px), false, px.join());
assert.equal(isAccent(255, 0, 0, 0), false); // transparent
assert.deepEqual(recolorPixel(255, 0, 0, 'pink'), [255, 105, 180]);
assert.deepEqual(recolorPixel(255, 65, 65, 'pink'), [255, 143, 199]); // a light edge stays light
assert.ok(recolorPixel(120, 0, 0, 'yellow')[0] < recolorPixel(255, 0, 0, 'yellow')[0]); // a dark edge stays dark
const buf = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 255, 240, 200, 160, 255]);
recolorData(buf, 'green'); assert.deepEqual([...buf.slice(0, 3)], [40, 205, 90]); assert.deepEqual([...buf.slice(4, 8)], [0, 0, 0, 255]); assert.deepEqual([...buf.slice(8, 11)], [240, 200, 160]);
const red = new Uint8ClampedArray([255, 0, 0, 255]); recolorData(red, 'red'); assert.deepEqual([...red], [255, 0, 0, 255]);
// the tailor
const dlg = JSON.parse(readFileSync('src/data/dialogue.json'));
const gs = { flags: {} }; let changed = null;
const t = talkTailor(gs, 'tailor', dlg.tailor, (id) => (changed = id));
assert.equal(t.choice.options.length, 5); assert.match(t.choice.options[0].label, /\(now\)/);
t.choice.onPick(2); assert.equal(changed, 'green'); assert.equal(gs.ninja, 'green');
assert.equal(t.choice.onPick(4).lines[0], dlg.tailor.farewell);
// the tailor stands in the town
const town = JSON.parse(readFileSync('public/assets/maps/town.json'));
assert.ok(town.layers.find((l) => l.name === 'npcs').objects.some((o) => o.name === 'tailor'));
console.log('ninja ok');
