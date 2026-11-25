import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from './src/fishing.js';
import { befriend, treatFor } from './src/pets.js';
import { craft, getRecipes } from './src/craft.js';
import { journalEntries } from './src/journal.js';
const R = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const fish = R('./src/data/fish.json'), items = R('./src/data/items.json').items, rec = R('./src/data/recipes.json'), fr = R('./src/data/friends.json');
const dlg = R('./src/data/dialogue.json');
const mk = () => ({ flags: {}, gold: 0, items: {}, pets: [], companion: null });
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

// ---- data sanity
for (const [id, f] of Object.entries(fish)) {
  assert.ok(items[id], `${id} is an item`); assert.ok(f.area.length && f.weight > 0 && f.sell > 0);
  if (!f.junk) { assert.ok(f.zone >= 0.1 && f.zone <= 0.5, id); assert.ok(f.reel >= 1 && f.reel <= 3); assert.ok(items[id].heal === 1); }
}
for (const area of ['garden', 'forest', 'peaks']) for (const night of [false, true]) assert.ok(F.fishFor(area, night, fish).filter((f) => !f.junk).length >= 2, `${area} night=${night}`);
// ---- day/night fish
const names = (a, n) => F.fishFor(a, n, fish).map((f) => f.id);
assert.ok(names('garden', false).includes('golden-koi') && !names('garden', true).includes('golden-koi'));
assert.ok(names('garden', true).includes('moon-carp') && !names('garden', false).includes('moon-carp'));
assert.ok(names('forest', true).includes('glow-eel') && names('peaks', true).includes('aurora-char'));
assert.ok(!names('forest', false).includes('pond-minnow'));                 // each pond has its own fish
// weighted pick: first fish at rng 0, last at rng ~1
assert.equal(F.pickFish('forest', false, fish, () => 0).id, 'forest-trout');
assert.equal(F.pickFish('forest', false, fish, () => 0.9999).id, 'soggy-boot');
assert.equal(F.pickFish('nowhere', false, fish), null);
// rare fish really are rarer
{ const c = {}; let k = 7; const rng = () => ((k = (k * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 4000; i++) { const f = F.pickFish('garden', false, fish, rng); c[f.id] = (c[f.id] ?? 0) + 1; }
  assert.ok(c['pond-minnow'] > c['sunfish'] && c['sunfish'] > c['golden-koi'] && c['golden-koi'] > 0); }

// ---- the cast
{ const c = F.startCast(1000, () => 0);
  assert.equal(c.biteAt, 1000 + F.BITE_MIN);
  assert.equal(F.startCast(1000, () => 0.9999999).biteAt < 1000 + F.BITE_MAX, true);
  assert.equal(F.castStatus(c, 1000 + F.BITE_MIN - 1), 'wait');
  assert.equal(F.castStatus(c, c.biteAt), 'bite');
  assert.equal(F.castStatus(c, c.biteAt + F.BITE_WINDOW), 'bite');
  assert.equal(F.castStatus(c, c.biteAt + F.BITE_WINDOW + 1), 'lost');
  assert.equal(F.pressCast(c, c.biteAt - 5), 'early'); assert.equal(F.pressCast(c, c.biteAt + 10), 'hooked'); assert.equal(F.pressCast(c, c.biteAt + 5000), 'lost'); }

// ---- the reel
{ const f = { id: 'x', zone: 0.3, speed: 1000, reel: 2 };
  const r = F.startReel(f, 0, () => 0.5);                                     // centre = 0.15 + 0.5*0.7 = 0.5
  assert.equal(r.center, 0.5); assert.equal(r.need, 2);
  assert.equal(F.markerPos(r, 0), 0); assert.equal(F.markerPos(r, 500), 0.5); assert.equal(F.markerPos(r, 1000), 1); assert.equal(F.markerPos(r, 1500), 0.5); assert.equal(F.markerPos(r, 2000), 0);
  let p = F.pressReel(r, 500, () => 0.0);                                     // hit #1: fish darts to the far left
  assert.deepEqual([p.hit, p.done], [true, null]); assert.equal(r.center, 0.15);
  p = F.pressReel(r, 500);                                                    // marker at .5, zone .0-.3 -> miss
  assert.deepEqual([p.hit, p.done], [false, null]); assert.equal(r.strikes, 1);
  p = F.pressReel(r, 500); assert.deepEqual([p.hit, p.done], [false, 'escaped']);
  const r2 = F.startReel({ ...f, reel: 1 }, 0, () => 0.5);
  assert.deepEqual(F.pressReel(r2, 600), { hit: true, done: 'caught' });
  // the green zone always stays inside the bar
  for (const v of [0, 0.5, 0.9999]) { const q = F.startReel(f, 0, () => v); assert.ok(q.center - q.zone / 2 >= 0 && q.center + q.zone / 2 <= 1); }
  assert.equal(F.startReel({ id: 'j', reel: 0 }, 0).need, 1); }

// ---- the catch and the log
{ const gs = mk(); assert.equal(F.hasRod(gs), false); gs.items[F.ROD] = 1; assert.equal(F.hasRod(gs), true);
  assert.equal(F.landFish(gs, { id: 'sunfish' }).first, true); assert.equal(F.landFish(gs, { id: 'sunfish' }).first, false);
  assert.equal(gs.items.sunfish, 2); assert.equal(gs.fishLog.sunfish, 2);
  assert.deepEqual(F.loggedCount(gs, fish), { caught: 1, total: 11 });
  F.landFish(gs, { id: 'soggy-boot' }); assert.equal(F.loggedCount(gs, fish).caught, 1); }   // the boot is not a kind

// ---- the fisher: log rewards (once each), selling, tips
{ const gs = mk(); const ctx = { fishDefs: fish, areaNames: { garden: 'Garden pond', forest: 'Forest pond', peaks: 'Frozen lake' } };
  const d = dlg.fisher;
  let s = F.talkFisher(gs, 'fisher', d, ctx);
  assert.deepEqual(s.lines, [...d.lines, d.menu]); assert.equal(s.choice.options[0].disabled, true);   // nothing to sell yet
  s = F.talkFisher(gs, 'fisher', d, ctx); assert.deepEqual(s.lines, [d.menu]);
  for (const id of ['pond-minnow', 'sunfish', 'forest-trout']) F.landFish(gs, { id });
  assert.deepEqual(F.talkFisher(gs, 'fisher', d, ctx).lines, [d.menu]);                   // 3 kinds: no prize yet
  F.landFish(gs, { id: 'frost-perch' });
  s = F.talkFisher(gs, 'fisher', d, ctx); assert.equal(gs.gold, 40); assert.equal(s.lines[0], F.LOG_REWARDS[0].msg);
  assert.equal(F.talkFisher(gs, 'fisher', d, ctx).lines.length, 1); assert.equal(gs.gold, 40);   // not twice
  // sell one pile
  s = F.talkFisher(gs, 'fisher', d, ctx); assert.equal(s.choice.options[0].disabled, false);
  const sell = s.choice.onPick(0); assert.equal(sell.choice.options.length, 5);           // 4 piles + Back
  assert.match(sell.choice.options[0].label, /Pond Minnow x1 \(4g\)/);
  const after = sell.choice.onPick(0); assert.equal(gs.gold, 44); assert.equal(gs.items['pond-minnow'], 0); assert.match(after.lines[0], /Sold 1 Pond Minnow for 4 gold/);
  assert.equal(F.sellFish(gs, fish, 'pond-minnow').ok, false);
  // log + tips + leave
  const log = s.choice.onPick(1); assert.equal(log.lines[0], 'You have caught 4 of 11 kinds.'); assert.match(log.lines[1], /Garden pond: Pond Minnow, Garden Sunfish, \?\?\?, \?\?\?/);
  assert.equal(s.choice.onPick(2).lines, d.tips); assert.equal(s.choice.onPick(3).lines[0], d.farewell);
  // all fish: the big prize
  for (const id of Object.keys(fish)) if (!fish[id].junk) F.landFish(gs, { id });
  const g0 = gs.gold; s = F.talkFisher(gs, 'fisher', d, ctx);
  assert.equal(gs.items['greater-potion'], 2); assert.equal(gs.items.elixir, 2); assert.equal(gs.gold, g0 + 100); }

// ---- fish as friend treats
{ const gs = mk(); const crab = fr.kinds.crab;
  assert.equal(treatFor(gs, crab), null); gs.items['pond-minnow'] = 1; assert.equal(treatFor(gs, crab), 'pond-minnow');
  gs.items.seaweed = 1; assert.equal(treatFor(gs, crab), 'seaweed');                        // favourite first
  assert.equal(befriend(gs, 'crab', 'Pinchy', fr).ok, true); assert.equal(gs.items.seaweed, 0); assert.equal(gs.items['pond-minnow'], 1);
  assert.equal(befriend(gs, 'crab', 'Two', fr).reason, 'have'); assert.equal(gs.items['pond-minnow'], 1);   // one crab only
  gs.pets = []; assert.equal(befriend(gs, 'crab', 'Again', fr).ok, true); assert.equal(gs.items['pond-minnow'], 0);   // then the fish (once the first has left)
  gs.pets = []; assert.equal(befriend(gs, 'crab', 'Three', fr).reason, 'no-treat');
  gs.items['forest-trout'] = 1; assert.equal(befriend(gs, 'owl', 'Hoot', fr).ok, true);
  gs.items['pond-minnow'] = 1; assert.equal(befriend(gs, 'rabbit', 'R', fr).reason, 'no-treat');   // a minnow is not for bunnies
  assert.deepEqual(journalEntries(gs, fr.kinds ? fr : fr, items).find((e) => e.id === 'crab').also, ['Pond Minnow']); }

// ---- cooking at the Fish Grill
{ const gs = mk(); const g = rec.grill;
  assert.ok(g.offers.length <= 10);                                                         // the menu has to fit on screen
  for (const o of g.offers) { assert.ok(items[o.out].heal >= 5); for (const k of Object.keys(o.needs)) assert.ok(items[k], k); }
  assert.ok(getRecipes(gs, g, items).every((r) => !r.affordable));
  Object.assign(gs.items, { 'pond-minnow': 2, herb: 1 });
  assert.equal(craft(gs, g, items, 'fish-stew').ok, true); assert.equal(gs.items['fish-stew'], 1); assert.equal(gs.items['pond-minnow'], 0);
  assert.equal(craft(gs, g, items, 'fish-stew').ok, false);
  assert.ok(dlg.grillcook.menu && dlg.fisher.tips.length === 3); }
console.log('fishing ok');
