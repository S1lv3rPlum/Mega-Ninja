import assert from 'node:assert';
import fs from 'node:fs';
import items from './src/data/items.json' with { type: 'json' };
import enemies from './src/data/enemies.json' with { type: 'json' };
import dialogue from './src/data/dialogue.json' with { type: 'json' };
import enchants from './src/data/enchants.json' with { type: 'json' };
import hollow from './public/assets/maps/hollow.json' with { type: 'json' };
import forest from './public/assets/maps/forest.json' with { type: 'json' };
import { FAIRIES, fairyFlag, isFree, freedCount, allFree, perkDamage, perkHeal, perkGold, perkGrowMul, perkRod, perkRegenMul, ALL_FREE_FLAG } from './src/fairies.js';
import { eat } from './src/combat.js';
import { regenStep, newRegen } from './src/regen.js';
import { rodBonus } from './src/fishing.js';
import { BOSS_GIFTS } from './src/bossGifts.js';
import { isWorldFlag } from './src/coopLogic.js';

const P = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
const layer = (m, n) => m.layers.find((l) => l.name === n);

// six fairies, each with a world-shared flag, a guardian, a cage, dialogue and sprites
assert.equal(FAIRIES.length, 6);
const ws = fs.readFileSync('src/scenes/WorldScene.js', 'utf8');
for (const f of FAIRIES) {
  assert(isWorldFlag(fairyFlag(f.id)), 'shared in co-op');
  const g = enemies[`guard_${f.id}`];
  assert(g && g.boss && g.flag === fairyFlag(f.id) && g.summon.type === 'wisp');
  for (const t of [`fairy-${f.id}`, `guard-${f.id}`]) { assert(fs.existsSync(`public/assets/sprites/${t}.png`), t); assert(ws.includes(`\`fairy-\${c}\``) && ws.includes(`\`guard-\${c}\``)); }
  assert(g.texture === `guard-${f.id}`);
  assert(dialogue[`fairycage_${f.id}`] && dialogue[`fairyfree_${f.id}`]);
  const npc = layer(hollow, 'npcs').objects.map(P).find((p) => p.id === `fairy_${f.id}`);
  assert(npc && npc.openFlag === fairyFlag(f.id) && npc.openTexture === `fairy-${f.id}` && dialogue[npc.dialogue]);
  const en = layer(hollow, 'enemies').objects.map(P).find((p) => p.type === `guard_${f.id}`);
  assert(en && en.hideIfFlag === fairyFlag(f.id));
}
assert(isWorldFlag(ALL_FREE_FLAG), 'the rainbow wake-up is shared');
// rainbow boss
const rb = enemies.rainbow;
assert(rb.boss && rb.flag === 'rainbow_defeated' && items.items[rb.reward.item] && enchants[rb.reward.item]);
assert(BOSS_GIFTS.some((g) => g.flag === 'rainbow_defeated' && g.item === 'prism-gem'));
const rbObj = layer(hollow, 'enemies').objects.map(P).find((p) => p.type === 'rainbow');
assert(rbObj.requiresFlag === ALL_FREE_FLAG && rbObj.hideIfFlag === 'rainbow_defeated');
for (const t of ['wisp', 'fairy-cage', 'rainbow-fairy']) { assert(fs.existsSync(`public/assets/sprites/${t}.png`)); assert(ws.includes(`'${t}'`), t); }
// every enemy type used in the Hollow exists
for (const e of layer(hollow, 'enemies').objects.map(P)) assert(enemies[e.type], e.type);
// the doors line up both ways, and the Forest's is locked behind the charm
const dh = layer(hollow, 'doors').objects[0]; const dp = P(dh);
assert.equal(dp.toMap, 'forest');
const fd = layer(forest, 'doors').objects.find((o) => P(o).toMap === 'hollow'); const fp = P(fd);
assert.equal(fp.requiresItem, 'fairy-charm'); assert(items.items['fairy-charm']);
assert.equal(fd.x / 16, 0); assert.equal(layer(forest, 'obstacles').data[fd.y / 16 * forest.width], 0);
assert.equal(fp.toX, hollow.width - 2); assert.equal(dp.toX, 1); assert.equal(dp.toY, fd.y / 16);
// the arrival tile in the Hollow is walkable
const ob = layer(hollow, 'obstacles').data;
assert.equal(ob[fp.toY * hollow.width + fp.toX], 0);
// ---- perks
const gs = (flags = {}) => ({ flags, items: { bread: 3, elixir: 1 }, hp: 4, maxHp: 20 });
assert.equal(freedCount(gs()), 0); assert(!allFree(gs()));
assert.equal(perkDamage(gs()), 0); assert.equal(perkDamage(gs({ fairy_red_defeated: true })), 1);
assert.equal(perkGold(gs(), 10), 10); assert.equal(perkGold(gs({ fairy_yellow_defeated: true }), 10), 15); assert.equal(perkGold(gs({ fairy_yellow_defeated: true }), 5), 8);
assert.equal(perkGrowMul(gs({ fairy_green_defeated: true })), 0.5);
const rod0 = rodBonus({ flags: {}, rodLevel: 1 }); const rod1 = rodBonus({ flags: { fairy_blue_defeated: true }, rodLevel: 1 });
assert(rod1.window > rod0.window && rod1.zone > rod0.zone);
const e1 = eat(gs(), items.items, 'bread'); assert.equal(e1.gained, 3);
const g2 = gs({ fairy_orange_defeated: true }); assert.equal(eat(g2, items.items, 'bread').gained, 5);
const g3 = gs({ fairy_orange_defeated: true }); assert.equal(eat(g3, items.items, 'elixir').gained, 16, 'a full-heal elixir still just fills you up');
// Violet: hearts come back faster
const count = (flags) => { const g = gs(flags); const st = newRegen(); let healed = 0; for (let t = 0; t < 60000; t += 100) if (regenStep(g, st, t)) healed += 1; return healed; };
assert(count({ fairy_purple_defeated: true }) > count({}) * 1.5);
// all six
const all = {}; for (const f of FAIRIES) all[fairyFlag(f.id)] = true;
assert(allFree(gs(all)) && freedCount(gs(all)) === 6);
console.log('fairies ok');
