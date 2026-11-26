import assert from 'node:assert/strict';
import { stickDir, clampKnob, inStickZone, STICK } from './src/joystick.js';
const Z = { x: 0, y: 0 };
assert.deepEqual(stickDir(0, 0), Z); assert.deepEqual(stickDir(3, -3), Z);                 // dead zone
assert.deepEqual(stickDir(20, 2), { x: 1, y: 0 }); assert.deepEqual(stickDir(-20, 2), { x: -1, y: 0 });
assert.deepEqual(stickDir(2, 20), { x: 0, y: 1 }); assert.deepEqual(stickDir(2, -20), { x: 0, y: -1 });
// near a diagonal: sticks with the direction it was already going
assert.deepEqual(stickDir(15, 17, { x: 1, y: 0 }), { x: 1, y: 0 });
assert.deepEqual(stickDir(17, 15, { x: 0, y: 1 }), { x: 0, y: 1 });
// but a clear change wins
assert.deepEqual(stickDir(8, 20, { x: 1, y: 0 }), { x: 0, y: 1 });
assert.deepEqual(stickDir(20, 8, { x: 0, y: -1 }), { x: 1, y: 0 });
// knob clamp
assert.deepEqual(clampKnob(10, 0), { x: 10, y: 0 });
const k = clampKnob(100, 0); assert.equal(k.x, STICK.radius); assert.equal(k.y, 0);
const k2 = clampKnob(30, 40); assert.ok(Math.abs(Math.hypot(k2.x, k2.y) - STICK.radius) < 1e-9);
// zone: left side, below the top HUD
assert.ok(inStickZone(40, 150)); assert.ok(!inStickZone(250, 150)); assert.ok(!inStickZone(40, 20));
console.log('joystick ok');
