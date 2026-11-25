// Co-op world: the pure logic (no Phaser, no network), so it can be tested in Node.
//
// SHARED by everyone in a co-op world: farm plots, targets (rocks, trees, boulders, bushes) and
// "world flags" (boulder cleared, treant defeated...).
// PERSONAL to each player: bag, tools, hearts, gold, quests, ground drops, other flags, position.
//
// The shared part is flattened into "paths" like  plots/farm/3,8   targets/forest/boulder   flags/treant_defeated
// so that only what changed is sent to the cloud.

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid mix-ups
export const CODE_LENGTH = 6;
export const STALE_MS = 45000; // a player who has not checked in for this long is treated as gone

// A flag is shared if it is about the world, not about one player's story
export const isWorldFlag = (f) => f.endsWith('_defeated') || f.endsWith('_cleared');

// The cloud database does not allow . $ # [ ] / in keys
export const safeKey = (s) => String(s).replace(/[.$#[\]/]/g, '_');

export function makeCode(rng = Math.random) {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return s;
}

// What the player typed -> a valid code, or '' if it cannot be one
export function cleanCode(text) {
  const s = String(text ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === CODE_LENGTH && [...s].every((c) => CODE_ALPHABET.includes(c)) ? s : '';
}

export const cleanName = (text, fallback = 'Player') => String(text ?? '').trim().slice(0, 12) || fallback;
// the name as a database key: "Max" and "max" are the same character
export const nameKey = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'player';

// Stable text for a value, ignoring null/undefined fields (the cloud drops nulls) and key order
export function canon(v) {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'object') return JSON.stringify(v);
  const keys = Object.keys(v)
    .filter((k) => v[k] !== null && v[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
}

// ---- Flattening: the shared part of a game state as { path: value } ----

function flattenInto(out, section, tree) {
  for (const [map, entries] of Object.entries(tree ?? {})) {
    for (const [id, v] of Object.entries(entries ?? {})) out[`${section}/${safeKey(map)}/${safeKey(id)}`] = v;
  }
}

export function flattenShared(gs) {
  const out = {};
  flattenInto(out, 'plots', gs.plots);
  flattenInto(out, 'targets', gs.targets);
  for (const [f, on] of Object.entries(gs.flags ?? {})) {
    if (on && isWorldFlag(f)) out[`flags/${safeKey(f)}`] = true;
  }
  return out;
}

// The same thing from what the cloud sends back (a nested object)
export function flattenTree(tree) {
  const out = {};
  flattenInto(out, 'plots', tree?.plots);
  flattenInto(out, 'targets', tree?.targets);
  for (const [f, on] of Object.entries(tree?.flags ?? {})) if (on) out[`flags/${f}`] = true;
  return out;
}

// What changed between two flat maps: { path: newValue or null (= removed) }
export function diffFlat(prev, next) {
  const patch = {};
  for (const [p, v] of Object.entries(next)) if (canon(prev[p]) !== canon(v)) patch[p] = v;
  for (const p of Object.keys(prev)) if (!(p in next)) patch[p] = null;
  return patch;
}

// ---- Applying cloud data to a game state ----

function fixValue(section, v) {
  if (section === 'plots' && v && typeof v === 'object') return { growsAt: null, ...v }; // the cloud drops nulls
  return v;
}

// One changed path from the cloud: plots/farm/3,8  etc.
export function applyPath(gs, path, value) {
  const [section, a, b] = path.split('/');
  if (section === 'flags') {
    if (!gs.flags) gs.flags = {};
    if (value) gs.flags[a] = true;
    else delete gs.flags[a];
    return;
  }
  if (section !== 'plots' && section !== 'targets') return;
  if (!gs[section]) gs[section] = {};
  if (value === null || value === undefined) {
    if (gs[section][a]) delete gs[section][a][b];
    return;
  }
  if (!gs[section][a]) gs[section][a] = {};
  gs[section][a][b] = fixValue(section, value);
}

// First time in: the cloud's shared world replaces the local copy completely
export function applyInitial(gs, tree) {
  gs.plots = {};
  gs.targets = {};
  if (!gs.flags) gs.flags = {};
  for (const f of Object.keys(gs.flags)) if (isWorldFlag(f)) delete gs.flags[f];
  for (const [p, v] of Object.entries(flattenTree(tree))) applyPath(gs, p, v);
}

// The personal part of a state (what gets saved to the player's own character record)
export function personalPart(gs) {
  const copy = JSON.parse(JSON.stringify(gs));
  delete copy.plots;
  delete copy.targets;
  for (const f of Object.keys(copy.flags ?? {})) if (isWorldFlag(f)) delete copy.flags[f];
  return copy;
}

// ---- The live connection (Server-Sent Events) keeps a local copy of a part of the database ----
// events look like  put {path:'/', data:...}  or  patch {path:'/x', data:{...}}
export function applyStreamEvent(cache, type, payload) {
  const { path = '/', data } = payload ?? {};
  const segs = path.split('/').filter(Boolean);
  if (segs.length === 0) {
    if (type === 'put') return data === null || data === undefined ? {} : structuredClone(data);
    const next = { ...(cache ?? {}) };
    for (const [k, v] of Object.entries(data ?? {})) {
      if (v === null) delete next[k];
      else next[k] = v;
    }
    return next;
  }
  const root = structuredClone(cache ?? {});
  let node = root;
  for (let i = 0; i < segs.length - 1; i++) {
    if (typeof node[segs[i]] !== 'object' || node[segs[i]] === null) node[segs[i]] = {};
    node = node[segs[i]];
  }
  const last = segs[segs.length - 1];
  if (type === 'put') {
    if (data === null || data === undefined) delete node[last];
    else node[last] = structuredClone(data);
  } else {
    if (typeof node[last] !== 'object' || node[last] === null) node[last] = {};
    for (const [k, v] of Object.entries(data ?? {})) {
      if (v === null) delete node[last][k];
      else node[last][k] = v;
    }
  }
  return root;
}

// Other players currently around: drop yourself and anyone who has gone quiet
export function livePlayers(tree, myKey, now = Date.now()) {
  const out = {};
  for (const [k, p] of Object.entries(tree ?? {})) {
    if (k === myKey || !p || typeof p !== 'object') continue;
    if (typeof p.t !== 'number' || now - p.t > STALE_MS) continue;
    out[k] = p;
  }
  return out;
}
