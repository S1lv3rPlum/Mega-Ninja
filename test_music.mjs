import assert from 'node:assert/strict';
import { SCALES, THEMES, MAP_THEME, SFX, buildPattern, themeFor, scaleNote, midiToFreq, rng, STEPS_PER_BAR, BARS } from './src/music.js';
import fs from 'node:fs';

// ---- note maths
assert.equal(midiToFreq(69), 440); assert.ok(Math.abs(midiToFreq(60) - 261.6256) < 0.001);
assert.equal(scaleNote(60, SCALES.major, 0), 60); assert.equal(scaleNote(60, SCALES.major, 2), 64); assert.equal(scaleNote(60, SCALES.major, 7), 72);
assert.equal(scaleNote(60, SCALES.major, -1), 59); assert.equal(scaleNote(60, SCALES.penta, 5), 72); assert.equal(scaleNote(60, SCALES.penta, -1), 57);
{ const a = rng(5), b = rng(5), c = rng(6); const x = [a(), a(), a()], y = [b(), b(), b()]; assert.deepEqual(x, y); assert.notEqual(c(), x[0]); assert.ok(x.every((v) => v >= 0 && v < 1)); }

// ---- every map has a real theme; every theme builds
const maps = fs.readdirSync(new URL('./public/assets/maps/', import.meta.url)).map((f) => f.replace('.json', ''));
for (const m of maps) assert.ok(THEMES[themeFor(m)], `map ${m} needs a theme`);
for (const t of Object.values(MAP_THEME)) assert.ok(THEMES[t]);
assert.equal(themeFor('somewhere-new'), 'town');

for (const [name, t] of Object.entries(THEMES)) {
  assert.ok(SCALES[t.scale], name);
  const scale = SCALES[t.scale];
  for (const night of [false, true]) {
    const p = buildPattern(name, night);
    assert.equal(p.steps, STEPS_PER_BAR * BARS); assert.ok(p.bpm > 40 && p.bpm < 200); assert.ok(Math.abs(p.stepSec - 60 / p.bpm / 2) < 1e-9);
    assert.ok(p.events.length > 12, `${name} has some music`);
    const inScale = new Set(); for (let d = -10; d < 20; d++) inScale.add(scaleNote(t.root, scale, d)); for (let d = -10; d < 20; d++) inScale.add(scaleNote(t.root - 12, scale, d));
    for (const e of p.events) {
      assert.ok(e.step >= 0 && e.step < p.steps && e.len >= 1, name);
      assert.ok(inScale.has(e.midi), `${name}: note ${e.midi} is not in the scale`);
      assert.ok(['lead', 'bass', 'pad'].includes(e.voice) && ['sine', 'triangle', 'square', 'sawtooth'].includes(e.wave));
      if (e.voice === 'lead') assert.ok(e.midi >= 40 && e.midi <= 100);
    }
    assert.ok(p.events.some((e) => e.voice === 'lead') && p.events.some((e) => e.voice === 'bass'));
    assert.deepEqual(buildPattern(name, night), p);                                // same tune every time
  }
  // the night version is calmer: slower, fewer melody notes, a pad, soft sine lead
  const d = buildPattern(name, false), n = buildPattern(name, true);
  assert.ok(n.bpm < d.bpm, `${name} night is slower`);
  assert.ok(n.events.filter((e) => e.voice === 'lead').length <= d.events.filter((e) => e.voice === 'lead').length, `${name} night is sparser`);
  assert.ok(n.events.some((e) => e.voice === 'pad'));
  assert.ok(n.events.filter((e) => e.voice === 'lead').every((e) => e.wave === 'sine'));
}
// different areas sound different
assert.notDeepEqual(buildPattern('forest').events, buildPattern('cave').events);
assert.ok(buildPattern('boss').bpm > buildPattern('town').bpm && buildPattern('boss').bpm > 130);
assert.ok(buildPattern('cave').events.filter((e) => e.voice === 'lead').length < buildPattern('town').events.filter((e) => e.voice === 'lead').length);

// ---- sound effects
const need = ['swing', 'hit', 'hurt', 'pickup', 'coin', 'door', 'select', 'move', 'back', 'cast', 'splash', 'bite', 'miss', 'catch', 'drink', 'eat', 'friend', 'reward', 'error'];
for (const n of need) assert.ok(SFX[n] && SFX[n].length, n);
for (const [n, parts] of Object.entries(SFX)) for (const p of parts) {
  assert.ok(['square', 'triangle', 'sawtooth', 'sine', 'noise'].includes(p.w), n);
  assert.ok(p.f.length === 2 && p.f.every((x) => x > 30 && x < 12000), n); assert.ok(p.d > 0 && p.d < 1, n); assert.ok(p.v > 0 && p.v <= 0.5, n); assert.ok((p.at ?? 0) >= 0 && (p.at ?? 0) < 1, n);
}
console.log('music ok');
