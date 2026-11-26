import assert from 'node:assert/strict';
import fs from 'node:fs';
import { neighbor, areaOf, markVisited, inferVisited, statusOf, describe, findList } from './src/worldmap.js';
const data = JSON.parse(fs.readFileSync('src/data/worldmap.json'));
const maps = fs.readdirSync('public/assets/maps').map((f) => f.replace('.json', ''));
// every real map belongs to exactly one area, every link goes both ways, every area is on the screen without overlaps
for (const m of maps) { const owners = Object.keys(data.nodes).filter((id) => data.nodes[id].maps.includes(m)); assert.equal(owners.length, 1, `${m} -> ${owners}`); }
for (const [id, n] of Object.entries(data.nodes)) {
  for (const l of n.links) assert.ok(data.nodes[l].links.includes(id), `${id}<->${l}`);
  assert.ok(n.x >= 24 && n.x <= 296 && n.y >= 40 && n.y <= 195, id);
  for (const [id2, n2] of Object.entries(data.nodes)) if (id2 !== id) assert.ok(Math.abs(n.x - n2.x) >= 50 || Math.abs(n.y - n2.y) >= 20, `${id} overlaps ${id2}`);
}
for (const s of data.services) assert.ok(data.nodes[s.where], s.what);
assert.equal(areaOf(data, 'dorm2'), 'school'); assert.equal(areaOf(data, 'nightbarn'), 'garden'); assert.equal(areaOf(data, 'nowhere'), null);

// an old save standing in the Bazaar: the way there is inferred, the Shadow Market is a lead (the thing she missed)
const gs = { map: 'bazaar', flags: { met_hexsmith_nope: true, batqueen_defeated: true }, bazaarVisits: 3 };
inferVisited(gs, data);
for (const id of ['town', 'forest', 'quarry', 'cave', 'crystal', 'desert', 'bazaar']) assert.ok(gs.visited[id], id);
assert.ok(!gs.visited.market); assert.ok(gs.visited.farm && gs.visited.school);
assert.equal(statusOf(gs, data, 'bazaar'), 'here'); assert.equal(statusOf(gs, data, 'cave'), 'seen');
assert.equal(statusOf(gs, data, 'market'), 'lead'); assert.equal(statusOf(gs, data, 'ruins'), 'lead'); // next to the Caverns
assert.equal(describe(gs, data, 'market').title, 'Shadow Market'); assert.match(describe(gs, data, 'market').lines.join(' '), /Crystal Lantern/);
const g2 = { map: 'town', flags: {} }; inferVisited(g2, data);
assert.equal(statusOf(g2, data, 'crystal'), 'unknown'); assert.equal(describe(g2, data, 'crystal').title, '???');
// find list: weapon upgrades is offered as a lead, with the place
const f = findList(gs, data).find((s) => s.what === 'Weapon upgrades'); assert.ok(f && f.visited === false && f.placeName === 'Shadow Market');
assert.ok(!findList(g2, data).some((s) => s.what === 'Weapon upgrades'));
// markVisited
const g3 = {}; assert.equal(markVisited(g3, data, 'kitchen'), 'school'); assert.ok(g3.visited.school);
// met flags count
const g4 = { map: 'town', flags: { met_enchanter: true } }; inferVisited(g4, data); assert.ok(g4.visited.upper);
// arrow keys walk the map sensibly
assert.equal(neighbor(data, 'town', 1, 0), 'quarry');
assert.equal(neighbor(data, 'town', -1, 0), 'school'); assert.equal(neighbor(data, 'town', 0, -1), 'farm'); assert.equal(neighbor(data, 'town', 0, 1), 'forest');
assert.equal(neighbor(data, 'crystal', 0, 1), 'market'); assert.equal(neighbor(data, 'crystal', 1, 0), 'desert'); assert.equal(neighbor(data, 'crystal', 0, -1), 'peaks');
assert.equal(neighbor(data, 'garden', -1, 0), 'garden'); // nothing there: stay
for (const id of Object.keys(data.nodes)) assert.ok(data.nodes[id].short || data.nodes[id].label.length <= 11, id);
console.log('worldmap ok');
