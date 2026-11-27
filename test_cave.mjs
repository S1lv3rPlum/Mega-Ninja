import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from './src/cave.js';
import * as L from './src/lessons.js';
import { buildPockets, pocketOf } from './src/inventory.js';
const R = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const cfg = R('./src/data/cave.json'), dlg = R('./src/data/dialogue.json'), items = R('./src/data/items.json').items, recipes = R('./src/data/recipes.json');
const caveMap = R('./public/assets/maps/cave.json'), quarry = R('./public/assets/maps/quarry.json'), crystal = R('./public/assets/maps/crystal.json');
const mk = (o = {}) => ({ gold: 0, flags: {}, items: {}, ...o });
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));

// ---- the map and cave.json agree
const layer = (m, n) => m.layers.find((l) => l.name === n);
const rects = layer(caveMap, 'chambers').objects.map((o) => ({ ...props(o), x0: o.x / 16, y0: o.y / 16, x1: (o.x + o.width) / 16 - 1, y1: (o.y + o.height) / 16 - 1 }));
assert.equal(cfg.chambers.length, 8);
assert.deepEqual(rects.map((r) => r.id).sort(), cfg.chambers.map((c) => c.id).sort());
cfg.chambers.forEach((c) => assert.equal(rects.find((r) => r.id === c.id).name, c.name));
// walkable grid, then everything is reachable from the door once the gate rocks are broken, and the vault is not before that
const W = caveMap.width, H = caveMap.height, obs = layer(caveMap, 'obstacles').data;
const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && obs[y * W + x] === 0;
const targets = layer(caveMap, 'targets').objects.map((o) => ({ id: props(o).id, x: o.x / 16, y: o.y / 16 }));
const gates = targets.filter((t) => t.id.startsWith('gate')), decor = targets.filter((t) => !t.id.startsWith('gate'));
const npcs = layer(caveMap, 'npcs').objects.map((o) => ({ id: props(o).id, x: o.x / 16, y: o.y / 16 }));
function flood(blocked, start) {
  const seen = new Set([start.join()]); const q = [start];
  while (q.length) { const [x, y] = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const k = [x + dx, y + dy]; if (open(...k) && !blocked.has(k.join()) && !seen.has(k.join())) { seen.add(k.join()); q.push(k); } }); }
  return seen;
}
const door = layer(caveMap, 'doors').objects.find((o) => o.name === 'to-quarry');
const land = [Number(props(door).toX) === 19 ? door.x / 16 : 0, door.y / 16 - 1]; // the tile in front of the door
const solid = (list) => new Set(list.map((t) => `${t.x},${t.y}`));
const withNpcs = new Set([...solid(decor), ...solid(npcs.filter((n) => n.id !== 'sealeddoor'))]);
const full = flood(withNpcs, land);
const inRoom = (r, set) => { for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) if (set.has(`${x},${y}`)) return true; return false; };
rects.forEach((r) => assert.ok(inRoom(r, full), `${r.id} is reachable`));
const cut = flood(new Set([...withNpcs, ...solid(gates)]), land);
assert.ok(!inRoom(rects.find((r) => r.id === 'vault'), cut), 'the vault needs the pickaxe');
assert.ok(!inRoom(rects.find((r) => r.id === 'mine'), cut), 'the mine needs the pickaxe');
assert.ok(inRoom(rects.find((r) => r.id === 'granite'), cut), 'Granite is on the free path');
// every decor rock leaves every floor tile reachable (no rock can trap you): all floor tiles that are not rocks are connected
let floorTiles = 0, reached = 0;
for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (open(x, y) && !withNpcs.has(`${x},${y}`)) { floorTiles++; if (full.has(`${x},${y}`)) reached++; }
assert.equal(reached, floorTiles);
// doors line up with the outside maps
const toCave = layer(quarry, 'doors').objects.find((o) => o.name === 'to-cave'), p = props(toCave);
assert.deepEqual([p.toX, p.toY], [land[0] === 0 ? p.toX : land[0], door.y / 16 - 1]);
assert.equal(door.x / 16, p.toX); // lands right in front of the cave's mouth
const toQ = props(door); assert.equal(toQ.toMap, 'quarry');
// the stone door, Granite and the way to the crystal caverns are still where the crystal map sends you
const toCrystal = layer(caveMap, 'doors').objects.find((o) => o.name === 'to-crystal');
const back = props(layer(crystal, 'doors').objects.find((o) => o.name === 'to-cave'));
assert.deepEqual([toCrystal.x / 16, toCrystal.y / 16 + 1], [back.toX, back.toY]);
assert.ok(open(back.toX, back.toY));
assert.ok(layer(caveMap, 'boss').objects.some((o) => o.name === 'granite'));
const teacher = layer(quarry, 'npcs').objects.find((o) => props(o).id === 'cavemaster');
assert.ok(teacher && dlg.cavemaster);
// no two things on one tile
const all = [...targets, ...npcs, ...layer(caveMap, 'enemies').objects.map((o) => ({ id: props(o).id, x: o.x / 16, y: o.y / 16 })), ...layer(caveMap, 'boss').objects.map((o) => ({ id: 'boss', x: o.x / 16, y: o.y / 16 }))];
assert.equal(new Set(all.map((t) => `${t.x},${t.y}`)).size, all.length);
all.forEach((t) => assert.ok(open(t.x, t.y), `${t.id} stands on floor`));

// ---- discovering chambers
const chambers = rects;
let gs = mk();
assert.equal(C.foundCount(gs, cfg), 0);
const where = (id) => { const r = chambers.find((c) => c.id === id); return [r.x0 + 1, r.y0 + 1]; };
let m = C.stepInto(gs, cfg, chambers, ...where('mouth'));
assert.match(m, /Entrance Cavern.*1 of 8/);
assert.equal(C.stepInto(gs, cfg, chambers, ...where('mouth')), null);            // only once
assert.equal(C.stepInto(gs, cfg, chambers, 0, 0), null);                          // a tunnel / outside
assert.equal(C.foundCount(gs, cfg), 1);
['echo', 'roost', 'granite', 'cross', 'grotto', 'mine'].forEach((id) => C.stepInto(gs, cfg, chambers, ...where(id)));
assert.equal(C.allFound(gs, cfg), false);
m = C.stepInto(gs, cfg, chambers, ...where('vault'));
assert.match(m, /all 8 chambers/); assert.equal(C.allFound(gs, cfg), true);

// ---- the teacher
gs = mk();
let t = C.talkTeacher(gs, dlg.cavemaster, cfg);
assert.ok(t.lines.length >= 4); assert.match(t.lines.at(-1), /not found any/);
t = C.talkTeacher(gs, dlg.cavemaster, cfg); assert.equal(t.lines.length, 1);
C.stepInto(gs, cfg, chambers, ...where('mouth')); C.stepInto(gs, cfg, chambers, ...where('echo'));
t = C.talkTeacher(gs, dlg.cavemaster, cfg); assert.match(t.lines[0], /2 of 8/);
assert.equal(L.learned(gs, 'cook'), false);
cfg.chambers.forEach((c) => { gs.flags[C.chamberFlag(c.id)] = true; });
t = C.talkTeacher(gs, dlg.cavemaster, cfg);
assert.equal(gs.flags.learned_cook, true); assert.equal(gs.flags.learned_brew, true); assert.match(t.afterClose(), /COOK and BREW/);
assert.deepEqual(C.talkTeacher(gs, dlg.cavemaster, cfg).lines, dlg.cavemaster.repeatLines);
// a first visit with everything already found teaches straight away, with the introduction first
gs = mk(); cfg.chambers.forEach((c) => { gs.flags[C.chamberFlag(c.id)] = true; });
t = C.talkTeacher(gs, dlg.cavemaster, cfg); assert.equal(t.lines.length, dlg.cavemaster.lines.length + dlg.cavemaster.teachLines.length);

// ---- the chest
gs = mk({ gold: 5 });
let c = C.openChest(gs, cfg, items, dlg.cavechest);
assert.equal(c.ok, true); assert.equal(gs.gold, 155); assert.equal(gs.items.ruby, 1); assert.equal(gs.items.herb, 3); assert.match(c.msg, /150 gold.*Ruby/);
Object.keys(cfg.chest.items).forEach((id) => assert.ok(items[id], id));
c = C.openChest(gs, cfg, items, dlg.cavechest); assert.equal(c.ok, false); assert.equal(gs.gold, 155);                       // only once
assert.ok(dlg.cavechestopen.lines.length);

// ---- cooking and brewing from the bag
gs = mk({ items: { wheat: 3, herb: 4, frostberry: 1 } });
assert.deepEqual(L.shownPockets(gs), []); assert.deepEqual(L.recipeEntries(gs, recipes, items), []);
gs.flags.learned_cook = true;
assert.deepEqual(L.shownPockets(gs), ['cook']);
let es = L.recipeEntries(gs, recipes, items);
assert.equal(es.length, recipes.kitchen.offers.length + recipes.grill.offers.length);
assert.ok(es.every((e) => e.pocket === 'cook' && e.kind === 'recipe'));
const bread = es.find((e) => e.recipeId === 'bread');
assert.equal(bread.affordable, true); assert.equal(bread.name, items.bread.name); assert.equal(L.needsText(bread), 'Wheat 3/2');
assert.equal(es.find((e) => e.recipeId === 'carrot-stew').affordable, false);
let r = L.makeFromBag(gs, recipes, items, bread);
assert.equal(r.ok, true); assert.equal(gs.items.wheat, 1); assert.equal(gs.items.bread, 1);
assert.equal(L.makeFromBag(gs, recipes, items, bread).ok, false);                                                 // only 1 wheat left
assert.equal(gs.flags.crafted_cook, undefined);                                                                   // the school class check is still for the school
gs.flags.learned_brew = true;
es = L.recipeEntries(gs, recipes, items);
assert.equal(es.filter((e) => e.pocket === 'brew').length, recipes.potions.offers.length);
const heal = es.find((e) => e.recipeId === 'healing-potion');
assert.equal(L.makeFromBag(gs, recipes, items, heal).ok, true); assert.equal(gs.items['healing-potion'], 1); assert.equal(gs.items.herb, 2);
// not learned: refuse
assert.equal(L.makeFromBag(mk({ items: { wheat: 9 } }), recipes, items, bread).ok, false);
// pockets: COOK/BREW tabs only when shown
const base = [{ kind: 'item', id: 'bread', heal: 3 }];
assert.equal(buildPockets(base, []).some((p) => p.id === 'cook'), false);
const withR = buildPockets([...base, ...es], [], undefined, L.shownPockets(gs));
assert.deepEqual(withR.map((p) => p.id).slice(-2), ['cook', 'brew']);
assert.equal(withR.find((p) => p.id === 'cook').entries.length, recipes.kitchen.offers.length + recipes.grill.offers.length);
assert.equal(withR.find((p) => p.id === 'brew').entries.length, 3);
assert.equal(withR.find((p) => p.id === 'food').entries.length, 1);       // recipes do not leak into FOOD
assert.equal(pocketOf({ kind: 'recipe', pocket: 'brew' }), 'brew');
console.log('cave tests ok');
