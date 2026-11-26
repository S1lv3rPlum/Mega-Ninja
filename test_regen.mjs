import assert from 'node:assert/strict';
import { REGEN, newRegen, inFight, regenStep } from './src/regen.js';
const run = (gs, st, from, to, opts, step = 250) => { let n = 0; for (let t = from; t <= to; t += step) if (regenStep(gs, st, t, opts)) n++; return n; };
// nothing to heal when full, and nothing from 0 hp
let gs = { hp: 20, maxHp: 20 }, st = newRegen(); assert.equal(run(gs, st, 0, 60000), 0);
gs = { hp: 0, maxHp: 20 }; assert.equal(run(gs, newRegen(), 0, 60000), 0); assert.equal(gs.hp, 0);
// after a hit: wait the delay, then one half heart per interval (normal: 8s then every 7s)
gs = { hp: 10, maxHp: 20 }; st = newRegen(); inFight(st, 1000);
assert.equal(run(gs, st, 1000, 8900), 0);            // still in the delay
assert.equal(run(gs, st, 9000, 9000), 1); assert.equal(gs.hp, 11);
assert.equal(run(gs, st, 9250, 15900), 0);           // not yet the next one
assert.equal(run(gs, st, 16000, 16000), 1); assert.equal(gs.hp, 12);
// it stops at full
run(gs, st, 16250, 200000); assert.equal(gs.hp, 20);
// another hit resets the wait
gs = { hp: 10, maxHp: 20 }; st = newRegen(); inFight(st, 0); run(gs, st, 0, 8250); const hp1 = gs.hp; inFight(st, 8500);
assert.equal(run(gs, st, 8500, 16000), 0); assert.equal(gs.hp, hp1);
// boss fight: nothing
gs = { hp: 5, maxHp: 20 }; st = newRegen(); assert.equal(run(gs, st, 0, 100000, { blocked: true }), 0);
// leaving the boss fight starts the wait fresh (no instant heal)
assert.equal(run(gs, st, 100250, 107750), 0); assert.equal(run(gs, st, 108000, 108250), 1);
// difficulty pace: easy beats normal beats hard over one minute
const heals = (lv) => { const g = { hp: 0 + 1, maxHp: 40 }, s = newRegen(); inFight(s, 0); run(g, s, 0, 60000, { level: lv }); return g.hp - 1; };
assert.ok(heals('easy') > heals('normal') && heals('normal') > heals('hard') && heals('hard') > 0, [heals('easy'), heals('normal'), heals('hard')].join());
assert.equal(heals('bogus'), heals('normal'));
// never above max
gs = { hp: 19, maxHp: 20 }; st = newRegen(); run(gs, st, 0, 100000); assert.equal(gs.hp, 20);
console.log('regen ok');
