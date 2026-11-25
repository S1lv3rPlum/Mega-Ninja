import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as B from './src/brew.js';
import { talkToShopkeeper, buy } from './src/shop.js';
import { listEntries } from './src/inventory.js';
const R = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const brews = R('./src/data/brews.json'), items = R('./src/data/items.json'), shop = R('./src/data/shop.json'), tools = R('./src/data/tools.json'), dlg = R('./src/data/dialogue.json');
const mk = () => ({ flags: {}, gold: 200, items: {}, tools: {}, can: { water: 0, max: 5 } });

// ---- data
for (const [id, b] of Object.entries(brews)) { assert.ok(items.items[id].brew, id); assert.ok(shop.brewer.offers.some((o) => o.item === id)); for (const e of Object.keys(b)) assert.ok(e in B.EFFECTS); }
const m = R('./public/assets/maps/market.json');
const npcs = m.layers.find((l) => l.name === 'npcs').objects;
assert.ok(!npcs.some((o) => o.name === 'closedsign')); const br = npcs.find((o) => o.name === 'brewer');
assert.equal(br.properties.find((p) => p.name === 'shop').value, 'brewer'); assert.equal([br.x / 16, br.y / 16].join(), '26,3');

// ---- the shop
{ const gs = mk();
  let s = talkToShopkeeper(gs, 'brewer', dlg.brewer, shop.brewer, tools);
  assert.deepEqual(s.lines, [...dlg.brewer.lines, dlg.brewer.menu]); assert.equal(s.choice.options.length, 4);
  assert.equal(buy(gs, shop.brewer, tools, 'swift-brew').ok, true); assert.equal(gs.items['swift-brew'], 1); assert.equal(gs.gold, 175);
  assert.equal(buy(gs, shop.brewer, tools, 'shadow-brew').ok, true); assert.equal(gs.gold, 135);
  gs.gold = 10; assert.equal(buy(gs, shop.brewer, tools, 'owl-brew').ok, false); assert.equal(gs.items['owl-brew'] ?? 0, 0); }

// ---- the bag shows brews as drinkable
{ const gs = mk(); gs.items['owl-brew'] = 2; const e = listEntries(gs, items, tools).find((x) => x.id === 'owl-brew'); assert.equal(e.brew, true); assert.equal(e.heal, 0);
  gs.items.bread = 1; assert.equal(listEntries(gs, items, tools).find((x) => x.id === 'bread').brew, false); }

// ---- drinking
{ const gs = mk(); const t = 1_000_000;
  assert.equal(B.drink(gs, brews, 'swift-brew', t).ok, false);                      // none in the bag
  assert.equal(B.drink(gs, brews, 'bread', t).ok, false);                           // not a brew
  gs.items['swift-brew'] = 2; gs.items['owl-brew'] = 1; gs.items['shadow-brew'] = 1;
  assert.equal(B.active(gs, 'speed', t), false); assert.equal(B.moveMs(gs, t, 140), 140); assert.equal(B.lightScale(gs, t), 1);
  const r = B.drink(gs, brews, 'swift-brew', t); assert.equal(r.ok, true); assert.match(r.msg, /Swift/); assert.equal(gs.items['swift-brew'], 1);
  assert.equal(B.active(gs, 'speed', t + 44999), true); assert.equal(B.active(gs, 'speed', t + 45000), false);   // 45 seconds
  assert.equal(B.moveMs(gs, t + 1000, 140), 91); assert.equal(B.lightScale(gs, t + 1000), 1);
  // stacking adds time
  B.drink(gs, brews, 'swift-brew', t + 5000);
  assert.equal(gs.buffs.speed, t + 90000);
  // the owl brew: light + night tint
  B.drink(gs, brews, 'owl-brew', t); assert.equal(B.lightScale(gs, t + 1), 1.5); assert.equal(B.lightScale(gs, t + 90000), 1);
  assert.deepEqual(B.nightTint(gs, t + 1, [72, 88, 156]), [182, 188, 215]); assert.deepEqual(B.nightTint(gs, t + 90001, [72, 88, 156]), [72, 88, 156]);
  // shadow = both
  const g2 = mk(); g2.items['shadow-brew'] = 1; assert.match(B.drink(g2, brews, 'shadow-brew', t).msg, /Swift and Owl-eye/);
  assert.equal(B.active(g2, 'speed', t + 1) && B.active(g2, 'vision', t + 1), true);
  // never more than 5 minutes
  const g3 = mk(); g3.items['owl-brew'] = 10; for (let i = 0; i < 10; i++) B.drink(g3, brews, 'owl-brew', t); assert.equal(B.remaining(g3, 'vision', t), B.MAX_MS);
  // HUD text
  assert.equal(B.buffText(g2, t + 1000), 'Swift 0:44  Owl-eye 1:29'); assert.equal(B.buffText(g2, t + 100000), ''); }
console.log('brew ok');
