import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hasArea, markMapSeen, roomStatus, summary, describeRoom, nextRoom } from './src/areamap.js';
const R = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const areas = R('./src/data/areamaps.json'), world = R('./src/data/worldmap.json'), cave = R('./src/data/cave.json');
assert.ok(hasArea(areas, 'cave') && hasArea(areas, 'school') && hasArea(areas, 'town') && !hasArea(areas, 'nowhere'));

// data sanity: every area is a world-map area, rooms stay on the panel and never overlap, links and exits point at real rooms
for (const [id, a] of Object.entries(areas)) {
  assert.ok(world.nodes[id], `${id} is a world map area`);
  if (a.kind === 'terrain') continue; // checked below
  const ids = a.rooms.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  a.rooms.forEach((r) => {
    assert.ok(r.x >= 14 && r.y >= 36 && r.x + r.w <= 306 && r.y + r.h <= 184, `${id}/${r.id} fits`);
    assert.ok(r.note && r.name);
  });
  a.rooms.forEach((r, i) => a.rooms.slice(i + 1).forEach((o) => assert.ok(r.x + r.w <= o.x || o.x + o.w <= r.x || r.y + r.h <= o.y || o.y + o.h <= r.y, `${id}: ${r.id} overlaps ${o.id}`)));
  (a.links ?? []).forEach(([x, y]) => assert.ok(ids.includes(x) && ids.includes(y)));
  (a.exits ?? []).forEach((e) => assert.ok(ids.includes(e.anchor)));
  if (a.kind !== 'terrain' && id !== 'garden' && id !== 'upper') assert.ok(a.rooms.some((r) => r.story));
  assert.ok(a.tagline.length <= 70, 'tagline fits on one line');
}
// the cave's rooms are exactly the cave's chambers; the school's rooms are exactly the school area's maps
assert.deepEqual(areas.cave.rooms.map((r) => r.chamber).sort(), cave.chambers.map((c) => c.id).sort());
assert.deepEqual(areas.school.rooms.map((r) => r.map).sort(), [...world.nodes.school.maps].sort());
// the way through the story (mouth -> echo -> crossing -> Granite) is marked, and so are all four classes
assert.deepEqual(areas.cave.rooms.filter((r) => r.story).map((r) => r.id).sort(), ['cross', 'echo', 'granite', 'mouth']);
assert.deepEqual(areas.school.rooms.filter((r) => r.story).map((r) => r.id).sort(), ['kitchen', 'library', 'potions', 'school', 'sparring']);
// a gated tunnel is flagged where the real map has rock piles
assert.deepEqual(areas.cave.links.filter((l) => l[2] === 'gate').length, 3);

// ---- cave status follows the discovered chambers
const gs = { map: 'quarry', flags: {}, visited: {} };
const C = areas.cave;
assert.equal(roomStatus(gs, C, C.rooms[0]), 'unknown');
gs.flags.cave_ch_echo = true;
assert.equal(roomStatus(gs, C, C.rooms.find((r) => r.id === 'echo')), 'seen');
gs.map = 'cave';
assert.equal(roomStatus(gs, C, C.rooms.find((r) => r.id === 'echo'), 'echo'), 'here');
assert.equal(roomStatus(gs, C, C.rooms.find((r) => r.id === 'echo'), 'mouth'), 'seen');
assert.deepEqual(summary(gs, C), { known: 1, total: 8, storySeen: 1, storyTotal: 4, all: false });
cave.chambers.forEach((c) => { gs.flags[`cave_ch_${c.id}`] = true; });
assert.equal(summary(gs, C).all, true);
const d = describeRoom({ map: 'x', flags: {} }, C, C.rooms.find((r) => r.id === 'vault'));
assert.equal(d.title, '???'); assert.ok(!JSON.stringify(d).includes('last chamber'));        // unexplored rooms keep their secrets
assert.match(describeRoom(gs, C, C.rooms.find((r) => r.id === 'vault')).lines.join(' '), /last chamber/);

// ---- school status: maps you walked into, the courtyard from the area visit, old saves from class flags
const S = areas.school;
const g2 = { map: 'school', flags: {}, visited: { school: true } };
const st = (id, g = g2) => roomStatus(g, S, S.rooms.find((r) => r.id === id));
assert.equal(st('school'), 'here'); assert.equal(st('kitchen'), 'unknown');
markMapSeen(g2, 'kitchen'); assert.equal(st('kitchen'), 'seen'); assert.deepEqual(g2.mapsSeen, { kitchen: true });
g2.map = 'town'; assert.equal(st('school'), 'seen');                                          // courtyard counts as seen once the School area has been visited
g2.flags.library_done = true; assert.equal(st('library'), 'seen');                            // older save: a finished class proves it
assert.equal(st('dorm1'), 'unknown');
assert.equal(summary(g2, S).total, 7);

// ---- arrow keys
assert.equal(nextRoom(S, 'school', 0, -1) !== 'school', true);
assert.equal(nextRoom(S, 'school', -1, 0).startsWith('dorm'), true);
assert.equal(nextRoom(S, 'kitchen', 1, 0), 'potions'); assert.equal(nextRoom(S, 'library', 1, 0), 'sparring');
assert.equal(nextRoom(S, 'potions', 0, 1), 'school'); assert.equal(nextRoom(S, 'dorm1', 1, 0), 'school');
assert.equal(nextRoom(C, 'mouth', 0, -1), 'echo'); assert.equal(nextRoom(C, 'echo', 0, -1), 'roost');
assert.equal(nextRoom(C, 'sparring' in {} ? 'x' : 'vault', 1, 0), 'vault');                  // nothing there: stay
console.log('areamap tests ok');

// ================= terrain zone maps and fog =================
import { reveal, isSeen, exploredPct, visibleLandmarks, describeLandmark, FOG_CELL } from './src/areamap.js';
const maps = ['town', 'forest', 'hollow', 'quarry', 'farm', 'crystal', 'market', 'peaks', 'ruins', 'desert', 'bazaar'];
const world2 = world.nodes;
for (const id of maps) {
  const a = areas[id];
  assert.equal(a.kind, 'terrain'); assert.deepEqual(world2[id].maps, [id]);                    // a single-map world-map area
  const m = R(`./public/assets/maps/${id}.json`);
  assert.equal(a.w, m.width); assert.equal(a.h, m.height); assert.equal(a.rows.length, a.h); a.rows.forEach((r) => assert.equal(r.length, a.w));
  const ob = m.layers.find((l) => l.name === 'obstacles').data;
  const tiles = new Set(a.rows.flatMap((r, y) => [...r].map((c, x) => (c === '.' ? `${x},${y}` : null))).filter(Boolean));
  assert.ok(tiles.size > 50);
  assert.ok(a.landmarks.length >= 4); assert.ok(a.tagline.length <= 70);
  const names = new Set();
  a.landmarks.forEach((l) => {
    assert.ok(l.x >= 0 && l.y >= 0 && l.x < a.w && l.y < a.h, `${id}/${l.name} on the map`);
    assert.ok(tiles.has(`${l.x},${l.y}`), `${id}/${l.name} stands on a walkable tile (${l.x},${l.y})`);
    assert.ok(['door', 'shop', 'boss', 'npc', 'waystone', 'thing'].includes(l.kind));
    assert.ok(l.note); assert.ok(!names.has(l.id)); names.add(l.id);
  });
  // every door and boss and waystone in the real map is a landmark
  for (const layer of m.layers.filter((l) => ['doors', 'boss'].includes(l.name))) for (const o of layer.objects) assert.ok(a.landmarks.some((l) => l.x === Math.floor(o.x / 16) && l.y === Math.floor(o.y / 16)), `${id}: ${o.name} has a landmark`);
  for (const o of m.layers.find((l) => l.name === 'npcs').objects.filter((o) => o.name.startsWith('waystone'))) assert.ok(a.landmarks.some((l) => l.x === Math.floor(o.x / 16) && l.y === Math.floor(o.y / 16)), `${id}: waystone`);
}
// the maps' story-boss rooms are gold
assert.ok(areas.forest.landmarks.find((l) => l.kind === 'boss').story && areas.ruins.landmarks.find((l) => l.name === 'Sea Serpent').story);
assert.ok(areas.market.landmarks.every((l) => !l.story));
assert.deepEqual(Object.keys(areas).sort(), ['bazaar', 'cave', 'crystal', 'desert', 'farm', 'forest', 'garden', 'hollow', 'market', 'peaks', 'quarry', 'ruins', 'school', 'town', 'upper']); // every world-map area has a zone map
assert.deepEqual(Object.keys(world.nodes).sort(), Object.keys(areas).sort());

// ---- fog
{
  const T = areas.town, g = { flags: {} };
  assert.equal(isSeen(g, 'town', 30, 20, 4, 2), false); assert.equal(exploredPct(g, T), 0); assert.deepEqual(visibleLandmarks(g, T), []);
  assert.equal(reveal(g, 'town', 30, 20, 4, 3), true);
  assert.equal(g.fog.town.length, Math.ceil(30 / FOG_CELL) * Math.ceil(20 / FOG_CELL));
  assert.equal(isSeen(g, 'town', 30, 20, 4, 2), true); assert.equal(isSeen(g, 'town', 30, 20, 25, 15), false);
  assert.equal(reveal(g, 'town', 30, 20, 4, 3), false);                                           // nothing new
  assert.deepEqual(visibleLandmarks(g, T).map((l) => l.name), ['Road to the School']);            // only what you have been near
  const p1 = exploredPct(g, T); assert.ok(p1 > 0 && p1 < 40);
  for (let y = 0; y < 20; y += 3) for (let x = 0; x < 30; x += 3) reveal(g, 'town', 30, 20, x, y);
  assert.equal(exploredPct(g, T), 100); assert.equal(visibleLandmarks(g, T).length, T.landmarks.length);
  assert.equal(describeLandmark(T.landmarks[0]).lines[1], 'Needed for the story.');
  // a damaged / old string of the wrong length is replaced safely
  const bad = { flags: {}, fog: { town: '101' } }; assert.equal(reveal(bad, 'town', 30, 20, 4, 3), true); assert.equal(bad.fog.town.length, 40);
}
console.log('terrain zone map tests ok');

// ---- older saves: visited area, no fog yet -> the doors are lifted; never invents fog for places you have not been
import { inferFog } from './src/areamap.js';
{
  const g = { flags: {}, visited: { forest: true } };
  assert.equal(inferFog(g, areas.forest, 'forest'), true);
  assert.ok(visibleLandmarks(g, areas.forest).some((l) => l.kind === 'door'));
  assert.equal(visibleLandmarks(g, areas.forest).some((l) => l.kind === 'boss'), false);
  assert.equal(inferFog(g, areas.forest, 'forest'), false);                                        // only once
  assert.equal(inferFog({ flags: {}, visited: {} }, areas.desert, 'desert'), false);
}
console.log('inferFog ok');
