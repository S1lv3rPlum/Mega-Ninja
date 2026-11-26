import assert from 'node:assert/strict';
import { toastMs, TOAST_MIN, TOAST_MAX } from './src/toast.js';
assert.equal(toastMs(''), TOAST_MIN); assert.equal(toastMs('Picked!'), TOAST_MIN);                // short ones used to vanish in 1.2s
assert.ok(toastMs('A freezing draft blows from a passage behind the roost. The Bat Queen still guards it.') >= 9000); // ~86 chars
assert.equal(toastMs('x'.repeat(500)), TOAST_MAX);
assert.ok(toastMs('x'.repeat(40)) > toastMs('x'.repeat(20)));                                      // longer text, longer time
assert.equal(toastMs(undefined), TOAST_MIN);
console.log('toast ok');
