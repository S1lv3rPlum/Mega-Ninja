// The zone maps: tap an area on the world map to open its own detailed map (data/areamaps.json). No Phaser in here.
// A room is one real map (room.map) or one cave chamber (room.chamber). Status: here (you are in it), seen, or unknown.
export const hasArea = (data, id) => !!data[id];

// make sure the "maps you have walked into" list exists; call on every map load
export function markMapSeen(gs, map) {
  if (!gs.mapsSeen) gs.mapsSeen = {};
  gs.mapsSeen[map] = true;
}

// hereChamber: the id of the cave chamber you stand in right now (or null)
export function roomStatus(gs, area, room, hereChamber = null) {
  if (room.chamber) {
    if (hereChamber === room.chamber && gs.map === 'cave') return 'here';
    return gs.flags?.[`cave_ch_${room.chamber}`] ? 'seen' : 'unknown';
  }
  if (room.map && gs.map === room.map) return 'here';
  if (room.map && gs.mapsSeen?.[room.map]) return 'seen';
  if (room.visitedArea && gs.visited?.[room.visitedArea]) return 'seen';
  if (room.seenFlags?.some((f) => gs.flags?.[f])) return 'seen'; // older saves: a class you did proves you were there
  return 'unknown';
}

export function summary(gs, area, hereChamber = null) {
  const sts = area.rooms.map((r) => roomStatus(gs, area, r, hereChamber));
  const known = sts.filter((s) => s !== 'unknown').length;
  const story = area.rooms.filter((r) => r.story);
  const storySeen = story.filter((r) => roomStatus(gs, area, r, hereChamber) !== 'unknown').length;
  return { known, total: area.rooms.length, storySeen, storyTotal: story.length, all: known >= area.rooms.length };
}

export function describeRoom(gs, area, room, hereChamber = null) {
  const st = roomStatus(gs, area, room, hereChamber);
  if (st === 'unknown') return { title: '???', lines: [room.story ? 'Not explored yet. The story leads through here.' : 'Not explored yet.'], status: st };
  return { title: st === 'here' ? `${room.name} (you are here)` : room.name, lines: [room.note, room.story ? 'Needed for the story.' : 'Optional: for explorers.'], status: st };
}

// arrow keys on a zone map: nearest room in that direction (same trick as the world map)
export function nextRoom(area, id, dx, dy) {
  const me = area.rooms.find((r) => r.id === id);
  const cx = (r) => r.x + r.w / 2, cy = (r) => r.y + r.h / 2;
  let best = null, bs = Infinity;
  for (const r of area.rooms) {
    if (r.id === id) continue;
    const along = (cx(r) - cx(me)) * dx + (cy(r) - cy(me)) * dy;
    if (along < 4) continue;
    const across = Math.abs((cx(r) - cx(me)) * dy) + Math.abs((cy(r) - cy(me)) * dx);
    const score = along + across * 2;
    if (score < bs) { bs = score; best = r.id; }
  }
  return best ?? id;
}

// ---- fog of war for the terrain zone maps ----
// Every map you walk through is cut into 4x4-tile cells; gs.fog[map] is a string of 0/1 (one per cell) saying which you have seen.
export const FOG_CELL = 4;
const dims = (w, h) => [Math.ceil(w / FOG_CELL), Math.ceil(h / FOG_CELL)];

// reveal the cells near (tx, ty). Returns true if something new was revealed.
export function reveal(gs, map, w, h, tx, ty, radius = 6) {
  const [cols, rows] = dims(w, h);
  if (!gs.fog) gs.fog = {};
  const cur = gs.fog[map] && gs.fog[map].length === cols * rows ? gs.fog[map].split('') : new Array(cols * rows).fill('0');
  let changed = false;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const mx = cx * FOG_CELL + (FOG_CELL - 1) / 2, my = cy * FOG_CELL + (FOG_CELL - 1) / 2;
      if (cur[cy * cols + cx] === '0' && Math.hypot(mx - tx, my - ty) <= radius) { cur[cy * cols + cx] = '1'; changed = true; }
    }
  }
  if (changed || !gs.fog[map]) gs.fog[map] = cur.join('');
  return changed;
}
export function isSeen(gs, map, w, h, tx, ty) {
  const [cols] = dims(w, h);
  const f = gs.fog?.[map];
  return !!f && f[Math.floor(ty / FOG_CELL) * cols + Math.floor(tx / FOG_CELL)] === '1';
}
// share of the walkable floor you have seen, 0..100
export function exploredPct(gs, area) {
  let total = 0, seen = 0;
  area.rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '.') return;
    total++;
    if (isSeen(gs, area.map, area.w, area.h, x, y)) seen++;
  }));
  return total ? Math.round((seen / total) * 100) : 0;
}
// landmarks you have discovered (their cell is lifted), as selectable items in tile-centre coordinates
export function visibleLandmarks(gs, area) {
  return area.landmarks.filter((l) => isSeen(gs, area.map, area.w, area.h, l.x, l.y));
}
export function describeLandmark(l) {
  return { title: l.name, lines: [l.note, l.story ? 'Needed for the story.' : 'Optional.'] };
}

// an older save has been to this area but has no fog record yet: lift the fog around the doors (you came in by one)
export function inferFog(gs, area, areaId) {
  if (gs.fog?.[area.map] || !gs.visited?.[areaId]) return false;
  area.landmarks.filter((l) => l.kind === 'door').forEach((l) => reveal(gs, area.map, area.w, area.h, l.x, l.y));
  return true;
}
