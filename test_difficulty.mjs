import assert from 'node:assert/strict';
import { LEVELS, LEVEL_IDS, chosen, levelOf, setLevel, scaleDamage, scaleMs, scaleSight } from './src/difficulty.js';

const gs = {};
assert.equal(chosen(gs), false); assert.equal(levelOf(gs), LEVELS.normal);
assert.equal(setLevel(gs, 'bogus'), false); assert.equal(chosen(gs), false);
// normal changes nothing
for (const d of [1, 2, 3, 4, 6]) assert.equal(scaleDamage(gs, d), d);
assert.equal(scaleMs(gs, 2800, 'attack'), 2800); assert.equal(scaleSight(gs, 5), 5);
// easy
setLevel(gs, 'easy'); assert.ok(chosen(gs));
assert.equal(scaleDamage(gs, 1), 1); assert.equal(scaleDamage(gs, 2), 1); assert.equal(scaleDamage(gs, 3), 2); assert.equal(scaleDamage(gs, 4), 2); assert.equal(scaleDamage(gs, 0), 0);
assert.ok(scaleMs(gs, 2800, 'attack') > 2800); assert.ok(scaleMs(gs, 1100, 'warn') > 1100); assert.ok(scaleMs(gs, 1000, 'invuln') > 1000);
// hard
setLevel(gs, 'hard');
assert.equal(scaleDamage(gs, 2), 3); assert.equal(scaleDamage(gs, 1), 2); assert.equal(scaleDamage(gs, 4), 6);
assert.ok(scaleMs(gs, 2800, 'attack') < 2800); assert.ok(scaleMs(gs, 1100, 'warn') < 1100);
// ordering holds for every knob
for (const k of ['attack', 'warn', 'move', 'sight', 'invuln']) {
  if (k === 'sight') assert.ok(LEVELS.easy[k] < LEVELS.normal[k] && LEVELS.normal[k] < LEVELS.hard[k], k);
  else if (k === 'attack' || k === 'move') assert.ok(LEVELS.easy[k] > 1 && LEVELS.hard[k] < 1, k);
  else if (k === 'warn' || k === 'invuln') assert.ok(k === 'warn' ? LEVELS.easy[k] > 1 && LEVELS.hard[k] < 1 : LEVELS.easy[k] > 1 && LEVELS.hard[k] < 1, k);
}
assert.ok(scaleSight({ difficulty: 'easy' }, 3) >= 2);
assert.deepEqual(LEVEL_IDS, ['easy', 'normal', 'hard']);
console.log('difficulty ok');
