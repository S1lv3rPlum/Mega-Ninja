import assert from 'node:assert';
import * as C from './src/coopLogic.js';

// codes and names
const code = C.makeCode(() => 0.5);
assert.equal(code.length, 6);
assert.equal(C.cleanCode(' ab-cd 23 '), 'ABCD23');
assert.equal(C.cleanCode('ABCD0O'), ''); // 0 and O are not in the alphabet
assert.equal(C.cleanCode('ABC'), '');
assert.equal(C.cleanName('  Maximilian the Great '), 'Maximilian t');
assert.equal(C.cleanName('   '), 'Player');
assert.equal(C.nameKey('Max!'), 'max');
assert.equal(C.nameKey('!!!'), 'player');
assert.equal(C.safeKey('a.b/c'), 'a_b_c');

// flags
assert(C.isWorldFlag('treant_defeated'));
assert(C.isWorldFlag('boulder_cleared'));
assert(!C.isWorldFlag('got_sword'));
assert(!C.isWorldFlag('met_sensei'));

// flatten only shared things
const gs = {
  plots: { farm: { '3,8': { stage: 1, growsAt: null, crop: 'wheat' } } },
  targets: { forest: { boulder: { hits: 2, cleared: false } } },
  flags: { got_sword: true, boulder_cleared: true },
  drops: { town: [{ x: 1, y: 1, item: 'x' }] },
  items: { wood: 3 },
};
const flat = C.flattenShared(gs);
assert.deepEqual(Object.keys(flat).sort(), ['flags/boulder_cleared', 'plots/farm/3,8', 'targets/forest/boulder']);

// diff: change, add, remove
const flat2 = { ...flat };
gs.plots.farm['3,8'] = { stage: 2, growsAt: 123, crop: 'wheat' };
delete gs.targets.forest.boulder;
gs.plots.farm['4,8'] = { stage: 1, growsAt: null };
const patch = C.diffFlat(flat, C.flattenShared(gs));
assert.deepEqual(Object.keys(patch).sort(), ['plots/farm/3,8', 'plots/farm/4,8', 'targets/forest/boulder']);
assert.equal(patch['targets/forest/boulder'], null);
assert.deepEqual(C.diffFlat(flat2, flat2), {});

// the cloud drops nulls and reorders keys: that must not look like a change
const local = { plots: { farm: { '1,1': { stage: 1, growsAt: null, crop: 'wheat' } } } };
const fromCloud = { plots: { farm: { '1,1': { crop: 'wheat', stage: 1 } } } };
assert.deepEqual(C.diffFlat(C.flattenShared(local), C.flattenTree(fromCloud)), {});

// applying the cloud's world to a fresh game state
const mine = { flags: { got_sword: true, treant_defeated: true }, plots: { farm: { '9,9': { stage: 1 } } }, targets: {} };
C.applyInitial(mine, { plots: fromCloud.plots, flags: { boulder_cleared: true }, targets: { quarry: { r1: { hits: 1, cleared: true } } } });
assert.deepEqual(Object.keys(mine.plots.farm), ['1,1']);
assert.strictEqual(mine.plots.farm['1,1'].growsAt, null); // restored, so the game treats it as "thirsty"
assert(mine.flags.got_sword); // personal flag kept
assert(!mine.flags.treant_defeated); // world flag now comes only from the cloud
assert(mine.flags.boulder_cleared);
assert.equal(mine.targets.quarry.r1.cleared, true);

// one remote change
C.applyPath(mine, 'plots/farm/1,1', null);
assert.deepEqual(mine.plots.farm, {});
C.applyPath(mine, 'flags/treant_defeated', true);
assert(mine.flags.treant_defeated);
C.applyPath(mine, 'flags/treant_defeated', null);
assert(!mine.flags.treant_defeated);

// personal part leaves out the shared things
const p = C.personalPart({ ...gs, flags: { got_sword: true, boulder_cleared: true } });
assert(!p.plots && !p.targets && p.flags.got_sword && !p.flags.boulder_cleared && p.items.wood === 3);

// stream events
let cache = C.applyStreamEvent({}, 'put', { path: '/', data: { a: { x: 1 } } });
cache = C.applyStreamEvent(cache, 'put', { path: '/b/c', data: 5 });
assert.equal(cache.b.c, 5);
cache = C.applyStreamEvent(cache, 'patch', { path: '/a', data: { y: 2, x: null } });
assert.deepEqual(cache.a, { y: 2 });
cache = C.applyStreamEvent(cache, 'put', { path: '/b/c', data: null });
assert.deepEqual(cache.b, {});
cache = C.applyStreamEvent(cache, 'put', { path: '/', data: null });
assert.deepEqual(cache, {});

// players: hide me and anyone gone quiet
const now = 1_000_000;
const live = C.livePlayers({ me: { t: now }, ann: { t: now - 1000, x: 1 }, old: { t: now - 99999 }, bad: 5 }, 'me', now);
assert.deepEqual(Object.keys(live), ['ann']);

console.log('coop ok');

// ---- defeated enemies are shared; everything else about enemies stays out of the personal save ----
{
  const gs = { plots: {}, targets: {}, flags: {}, hp: 5, enemies: { forest: { s1: { respawnAt: 123 } }, cave: {} } };
  const flat = C.flattenShared(gs);
  assert.deepEqual(flat['enemies/forest/s1'], { respawnAt: 123 });
  assert.equal(C.personalPart(gs).enemies, undefined);
  const other = { plots: {}, targets: {}, flags: {}, enemies: {} };
  C.applyInitial(other, { enemies: { forest: { s1: { respawnAt: 123 } } } });
  assert.deepEqual(other.enemies, { forest: { s1: { respawnAt: 123 } } });
  C.applyPath(other, 'enemies/forest/s1', null);
  assert.deepEqual(other.enemies.forest, {});
  C.applyPath(other, 'enemies/cave/b1', { respawnAt: 9 });
  assert.equal(other.enemies.cave.b1.respawnAt, 9);
  const patch = C.diffFlat(flat, C.flattenShared({ ...gs, enemies: { forest: {} } }));
  assert.deepEqual(patch, { 'enemies/forest/s1': null }); // it grew back
  console.log('coop enemies ok');
}
