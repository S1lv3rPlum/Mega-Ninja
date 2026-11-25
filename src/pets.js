// Friends: little creatures you have made friends with by offering a treat. No Phaser in here.
//   gs.pets      = [{ id, kind, name }]   (up to friends.max)
//   gs.companion = the id of the one that follows you (or null: everyone is resting at home)
// A friend is never fought: it is won over with its favourite treat (see data/friends.json).

export function ensurePets(gs) {
  if (!Array.isArray(gs.pets)) gs.pets = [];
  if (gs.companion === undefined) gs.companion = null;
  if (gs.companion && !gs.pets.some((p) => p.id === gs.companion)) gs.companion = null;
}

export const cleanPetName = (text, fallback) => String(text ?? '').trim().slice(0, 12).trim() || fallback;

// one friend per kind: a wild animal of a kind you already have just hops away happy (nothing is used up)
export const hasKind = (gs, kindId) => gs.pets.some((p) => p.kind === kindId);
export const isFull = (gs, defs) => gs.pets.length >= defs.max;
// the favourite treat first, then anything else the kind likes (fish, see data/friends.json 'likes'); null if you have none
export const treatFor = (gs, kind) => [kind.treat, ...(kind.likes ?? [])].find((t) => (gs.items[t] ?? 0) > 0) ?? null;
export const hasTreat = (gs, kind) => treatFor(gs, kind) !== null;
export const companionPet = (gs) => gs.pets.find((p) => p.id === gs.companion) ?? null;

// Win a creature over: uses up one treat and adds the friend (the first one starts following you).
// Returns { ok, pet?, reason? }  reason: 'unknown' | 'have' | 'full' | 'no-treat'
export function befriend(gs, kindId, name, defs) {
  const kind = defs.kinds[kindId];
  if (!kind) return { ok: false, reason: 'unknown' };
  if (hasKind(gs, kindId)) return { ok: false, reason: 'have' };
  if (isFull(gs, defs)) return { ok: false, reason: 'full' };
  if (!hasTreat(gs, kind)) return { ok: false, reason: 'no-treat' };
  gs.items[treatFor(gs, kind)] -= 1;
  let n = 1;
  while (gs.pets.some((p) => p.id === `${kindId}${n}`)) n += 1;
  const pet = { id: `${kindId}${n}`, kind: kindId, name: cleanPetName(name, kind.baseName) };
  gs.pets.push(pet);
  if (!gs.journal) gs.journal = {};
  gs.journal[kindId] = true; // the Friend Journal remembers every kind you have met (journal.js)
  if (!gs.companion) gs.companion = pet.id;
  return { ok: true, pet };
}

// choose who follows (null = nobody)
export function setCompanion(gs, id) {
  if (id !== null && !gs.pets.some((p) => p.id === id)) return false;
  gs.companion = id;
  return true;
}

export function renamePet(gs, id, name) {
  const p = gs.pets.find((x) => x.id === id);
  if (!p) return false;
  p.name = cleanPetName(name, p.name);
  return true;
}

export function releasePet(gs, id) {
  const i = gs.pets.findIndex((x) => x.id === id);
  if (i < 0) return false;
  gs.pets.splice(i, 1);
  if (gs.companion === id) gs.companion = null;
  return true;
}
