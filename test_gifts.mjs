import assert from 'node:assert';
import items from './src/data/items.json' with { type: 'json' };
import enemies from './src/data/enemies.json' with { type: 'json' };
import { BOSS_GIFTS, owedGifts, giveGifts, markEarned, giftFlag } from './src/bossGifts.js';

// every gift matches a real boss reward and a real item
for (const g of BOSS_GIFTS) {
  assert(items.items[g.item], g.item);
  const boss = Object.values(enemies).find((e) => e.flag === g.flag);
  assert(boss && boss.reward.item === g.item, g.flag);
}
const gs = { flags: { batqueen_defeated: true, serpent_defeated: true }, items: {} };
assert.deepEqual(owedGifts(gs).map((g) => g.item), ['crystal-lantern', 'moon-crest-half']);
const msgs = giveGifts(gs, owedGifts(gs)); assert.equal(msgs.length, 2);
assert.equal(gs.items['crystal-lantern'], 1); assert(gs.flags[giftFlag('serpent_defeated')]);
assert.deepEqual(owedGifts(gs), []);
gs.items['moon-crest-half'] = 0;                       // joined into the whole Crest: not handed out again
assert.deepEqual(owedGifts(gs), []);
const mine = { flags: { yeti_defeated: true }, items: {} }; markEarned(mine, 'yeti_defeated'); assert.deepEqual(owedGifts(mine), []);
const owned = { flags: { yeti_defeated: true }, items: { 'frost-boots': 1 } }; assert.deepEqual(owedGifts(owned), []);
assert.deepEqual(owedGifts({ flags: { yeti_defeated: true }, items: {} }, 'batqueen_defeated'), []);
console.log('gifts ok');

// ---- waystones: every entry is a real map spot with a flag, and each map has its waystone NPC
import fs from 'node:fs';
import ways from './src/data/waystones.json' with { type: 'json' };
import crops from './src/data/crops.json' with { type: 'json' };
for (const w of ways) {
  const m = JSON.parse(fs.readFileSync(`public/assets/maps/${w.map}.json`));
  const npc = m.layers.find((l) => l.name === 'npcs').objects.find((o) => o.name === `waystone-${w.id}`);
  assert(npc, w.id); assert.equal(npc.x / 16, w.x); assert.equal(npc.y / 16 + 1, w.y); assert.equal(w.flag, `waystone_${w.id}`);
}
for (const c of Object.values(crops)) { assert(items.items[c.seed], c.seed); assert(items.items[c.item], c.item); }
for (const id of Object.keys(crops).filter((c) => c !== 'wheat')) for (const n of [2, 3, 4]) assert(fs.existsSync(`public/assets/sprites/crop-${id}-${n}.png`), `${id}-${n}`);
console.log('waystones ok');

// ---- safety net: lanterns and boots are re-handed at the door if a friend beat the boss and you have none
import { reissueFor } from './src/bossGifts.js';
{
  const g = { flags: { batqueen_defeated: true, gift_batqueen_defeated: true }, items: {} };   // gift marked as received, item missing
  assert.match(reissueFor(g, 'crystal-lantern'), /Crystal Lantern/); assert.equal(g.items['crystal-lantern'], 1);
  assert.equal(reissueFor(g, 'crystal-lantern'), null);                                      // only while you have none
  assert.equal(reissueFor({ flags: {}, items: {} }, 'crystal-lantern'), null);               // boss not beaten: nothing
  assert.equal(reissueFor({ flags: { serpent_defeated: true }, items: {} }, 'moon-crest-half'), null); // used-up items never come back
}
