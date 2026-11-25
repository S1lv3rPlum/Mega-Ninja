import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ensureJournal, recordFriend, metCount, journalEntries, nextReward, claimRewards, REWARDS } from './src/journal.js';
import { befriend } from './src/pets.js';
const fd = JSON.parse(readFileSync('src/data/friends.json')); const items = JSON.parse(readFileSync('src/data/items.json')).items;
for (const [id, k] of Object.entries(fd.kinds)) assert.ok(k.hint, id + ' has a hint');
for (const r of REWARDS) assert.ok(items[r.item], r.item);
const gs = { flags: {}, items: { carrot: 9, herb: 9, pumpkin: 9, crystal: 9 }, pets: [{ id: 'old1', kind: 'rabbit', name: 'Old' }] };
ensureJournal(gs); assert.equal(metCount(gs), 1); // an old save counts its existing friends
befriend(gs, 'shadow', 'S', fd); befriend(gs, 'bat', 'B', fd);
assert.deepEqual(Object.keys(gs.journal).sort(), ['bat', 'rabbit', 'shadow']);
const e = journalEntries(gs, fd, items);
assert.equal(e.length, Object.keys(fd.kinds).length); assert.equal(e.find((x) => x.id === 'owl').met, false); assert.deepEqual(e.find((x) => x.id === 'bat').yours, ['B']);
assert.equal(nextReward(gs).count, 6);
assert.equal(claimRewards(gs).length, 1); assert.equal(gs.items['healing-potion'], 2); assert.equal(claimRewards(gs).length, 0); // once
gs.pets.length = 0; // saying goodbye does not erase the page
assert.equal(metCount(gs), 3);
for (const k of Object.keys(fd.kinds)) recordFriend(gs, k);
assert.equal(claimRewards(gs).length, 2); assert.equal(gs.items.elixir, 3); assert.equal(nextReward(gs), null);
console.log('journal ok');
