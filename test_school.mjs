import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { talkHeadmaster, basicsMissing } from './src/school.js';
import { hitDummy, sparLessons, sparBonus, talkSparMaster, talkLibrarian, talkFeeder, rest, LESSONS, LESSON_HITS } from './src/school.js';
const dlg = JSON.parse(readFileSync('src/data/dialogue.json'));
const gs = { flags: {}, items: { carrot: 1 }, hp: 2, maxHp: 6 };
// sparring
assert.match(hitDummy(gs).msg, /Sparring Master/);
let t = talkSparMaster(gs, dlg.sparmaster); assert.ok(gs.flags.spar_started);
for (let i = 0; i < LESSON_HITS - 1; i++) hitDummy(gs);
assert.match(hitDummy(gs).msg, /Lesson 1 of/);
assert.equal(sparBonus(gs), 0);
assert.match(talkSparMaster(gs, dlg.sparmaster).lines[0], /1 of 5/);
for (let i = 0; i < LESSON_HITS * (LESSONS - 1); i++) hitDummy(gs);
assert.equal(sparLessons(gs), LESSONS);
hitDummy(gs); assert.equal(gs.flags.spar_hits, LESSONS * LESSON_HITS); // capped
talkSparMaster(gs, dlg.sparmaster); assert.equal(sparBonus(gs), 1);
// library
const ids = ['a', 'b', 'c'];
assert.match(talkLibrarian(gs, dlg.librarian, ids).lines[0], /0 of 3/);
ids.forEach((i) => (gs.flags['met_' + i] = true));
const r = talkLibrarian(gs, dlg.librarian, ids); assert.equal(gs.maxHp, 8); assert.equal(gs.hp, 8);
talkLibrarian(gs, dlg.librarian, ids); assert.equal(gs.maxHp, 8); // only once
// bed + barn
gs.hp = 1; rest(gs, dlg.bed); assert.equal(gs.hp, 8);
const f = talkFeeder(gs, 'barn_rabbit', dlg.animal_rabbit);
assert.ok(f.choice.options[0].label.includes('(1)'));
f.choice.onPick(0); assert.equal(gs.items.carrot, 0); assert.equal(gs.flags.fed_barn_rabbit, 1);
// the maps and their doors all connect
const rooms = ['school','kitchen','potions','library','sparring','dorm1','dorm2','garden','barn','upper','dojo','workshop','town'];
const maps = Object.fromEntries(rooms.map((m) => [m, JSON.parse(readFileSync(`public/assets/maps/${m}.json`))]));
const books = [];
for (const [name, m] of Object.entries(maps)) {
  const g = Object.fromEntries(m.layers.map((l) => [l.name, l]));
  const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
  for (const d of g.doors.objects) {
    const p = props(d);
    if (!rooms.includes(p.toMap)) continue;
    const to = maps[p.toMap]; const i = p.toY * to.width + p.toX;
    assert.equal(to.layers.find((l) => l.name === 'obstacles').data[i], 0, `${name} -> ${p.toMap} lands on a wall`);
    // and the door has a way back
    assert.ok(maps[p.toMap].layers.find((l) => l.name === 'doors').objects.some((o) => props(o).toMap === name), `${p.toMap} has no way back to ${name}`);
  }
  for (const n of g.npcs.objects) {
    const p = props(n);
    assert.ok(dlg[p.dialogue ?? p.id], `${name}: ${p.id} has no dialogue`);
    assert.ok(existsSync(`public/assets/sprites/${p.texture ?? 'npc'}.png`), `${name}: ${p.texture} sprite`);
    assert.equal(g.obstacles.data[(n.y / 16) * m.width + n.x / 16] !== undefined, true);
    if (p.role === 'book') books.push(p.id);
  }
}
assert.equal(books.length, 8);
// the headmaster opens the stairs only when every first-year class is done
const g2 = { flags: {}, items: {} };
assert.equal(basicsMissing(g2).length, 4);
let h = talkHeadmaster(g2, dlg.headmaster); assert.ok(!g2.flags.school_upper); assert.match(h.lines.at(-1), /cook something/);
Object.assign(g2.flags, { crafted_cook: 1, crafted_alchemist: 1, library_done: 1, spar_passed: 1 });
h = talkHeadmaster(g2, dlg.headmaster); assert.ok(g2.flags.school_upper);
assert.equal(talkHeadmaster(g2, dlg.headmaster).lines, dlg.headmaster.upperLines);
console.log('school ok');
