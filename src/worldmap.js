// The world map. No Phaser in here.
// gs.visited = { town: true, ... } area ids. Older saves have none, so we work it out (inferVisited).
// An area is shown in one of three ways:  'here' (you are in it) | 'seen' (visited) | 'lead' (next to a place you
// have been, so you may know about it: name and hint shown, dimmed) | 'unknown' (shown as ?).

export const areaOf = (data, map) => Object.keys(data.nodes).find((id) => data.nodes[id].maps.includes(map)) ?? null;

function pathTo(data, from, to) {
  const prev = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === to) break;
    for (const n of data.nodes[cur].links) if (!(n in prev)) { prev[n] = cur; queue.push(n); }
  }
  if (!(to in prev)) return [];
  const out = [];
  for (let c = to; c; c = prev[c]) out.push(c);
  return out;
}

// call whenever a map loads
export function markVisited(gs, data, map) {
  if (!gs.visited) gs.visited = {};
  const area = areaOf(data, map);
  if (area) gs.visited[area] = true;
  return area;
}

// Fill in what an older save must have seen: the way from Town to where you are now, anyone you have met, big flags.
export function inferVisited(gs, data) {
  if (!gs.visited) gs.visited = {};
  const v = gs.visited;
  v.town = true;
  const here = areaOf(data, gs.map);
  if (here) pathTo(data, 'town', here).forEach((id) => (v[id] = true));
  for (const [id, n] of Object.entries(data.nodes)) {
    if (n.npcs.some((npc) => gs.flags?.[`met_${npc}`])) v[id] = true;
  }
  const via = (to) => pathTo(data, 'town', to).forEach((id) => (v[id] = true));
  if (gs.flags?.batqueen_defeated) via('crystal');
  if (gs.flags?.serpent_defeated) { via('ruins'); via('peaks'); }
  if ((gs.bazaarVisits ?? 0) > 0) via('bazaar');
  if ((gs.marketVisits ?? 0) > 0) via('market');
  // far into the game: the places right next to Town were surely visited long ago
  if (v.cave || v.crystal) data.nodes.town.links.forEach((id) => (v[id] = true));
  return v;
}

export function statusOf(gs, data, id) {
  const here = areaOf(data, gs.map);
  if (id === here) return 'here';
  if (gs.visited?.[id]) return 'seen';
  return data.nodes[id].links.some((l) => gs.visited?.[l]) ? 'lead' : 'unknown';
}

// text for the info box when an area is selected
export function describe(gs, data, id) {
  const n = data.nodes[id];
  const st = statusOf(gs, data, id);
  if (st === 'unknown') return { title: '???', lines: ['You have not found a way here yet.'], status: st };
  if (st === 'lead') return { title: n.label, lines: ['You have not been here yet.', n.hint], status: st };
  return { title: n.label, lines: [n.blurb], status: st };
}

// "where do I find...?" entries you may know about: the place is visited or is a lead
export function findList(gs, data) {
  return data.services
    .filter((s) => ['here', 'seen', 'lead'].includes(statusOf(gs, data, s.where)))
    .map((s) => ({ ...s, placeName: data.nodes[s.where].label, visited: statusOf(gs, data, s.where) !== 'lead' }));
}

// arrow-key movement on the map: the nearest area in that direction (or the same one if there is nothing there)
export function neighbor(data, id, dx, dy) {
  const me = data.nodes[id];
  let best = null;
  let bestScore = Infinity;
  for (const [other, n] of Object.entries(data.nodes)) {
    if (other === id) continue;
    const along = (n.x - me.x) * dx + (n.y - me.y) * dy;
    if (along < 5) continue;
    const across = Math.abs((n.x - me.x) * dy) + Math.abs((n.y - me.y) * dx);
    const score = along + across * 2;
    if (score < bestScore) { bestScore = score; best = other; }
  }
  return best ?? id;
}
