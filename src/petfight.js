// Pet training and fighting. No Phaser in here.
// A trained friend fights next to you with small hits. It never faints or gets hurt: after a number of hits it gets TIRED
// and rests for a while, then is ready again. Pet armor gives more stamina (and a little damage).
//   pet = { id, kind, name, level (0-3, saved), armor (an id from data/petarmor.json or undefined) }
import { companionPet } from './pets.js';
import { getRecipes, craft } from './craft.js';

export const TRAIN = [
  { name: 'Rookie', dmg: 1, cooldownMs: 1800, stamina: 4, treats: 2, gold: 0 },
  { name: 'Fighter', dmg: 1, cooldownMs: 1300, stamina: 7, treats: 4, gold: 60 },
  { name: 'Champion', dmg: 2, cooldownMs: 1300, stamina: 10, treats: 6, gold: 150 },
];
export const TIRED_MS = 10000; // how long a tired friend rests
export const REFILL_AFTER_MS = 8000; // quiet time that refills stamina without a full rest

export const petLevel = (pet) => pet.level ?? 0;
export const nextTraining = (pet) => TRAIN[petLevel(pet)] ?? null;

// null = untrained (it follows you but does not fight)
export function petStats(pet, armorDefs) {
  const L = petLevel(pet);
  if (L <= 0) return null;
  const t = TRAIN[Math.min(L, TRAIN.length) - 1];
  const a = armorDefs[pet.armor];
  return { dmg: t.dmg + (a?.damage ?? 0), cooldownMs: t.cooldownMs, stamina: t.stamina + (a?.stamina ?? 0) };
}

export const newFightState = () => ({ energy: null, nextAt: 0, tiredUntil: 0, lastAt: 0 });

// One step of the fight clock. Returns 'attack' | 'attack-tired' | 'rested' | null
export function petTick(st, stats, now, hasTarget) {
  if (st.tiredUntil) {
    if (now < st.tiredUntil) return null;
    st.tiredUntil = 0;
    st.energy = stats.stamina;
    return 'rested';
  }
  if (st.energy === null || st.energy > stats.stamina) st.energy = stats.stamina;
  if (!hasTarget) {
    if (st.lastAt && now - st.lastAt > REFILL_AFTER_MS) st.energy = stats.stamina;
    return null;
  }
  if (now < st.nextAt) return null;
  st.nextAt = now + stats.cooldownMs;
  st.lastAt = now;
  st.energy -= 1;
  if (st.energy <= 0) {
    st.tiredUntil = now + TIRED_MS;
    return 'attack-tired';
  }
  return 'attack';
}

// Train to the next level: uses the pet's favourite treat (and gold). Returns { ok, msg }
export function trainPet(gs, pet, friendDefs) {
  const next = nextTraining(pet);
  if (!next) return { ok: false, msg: `${pet.name} has learned everything I can teach.` };
  const treat = friendDefs.kinds[pet.kind].treat;
  if ((gs.items[treat] ?? 0) < next.treats) return { ok: false, msg: `Not enough treats. I need ${next.treats} ${treat}.` };
  if (gs.gold < next.gold) return { ok: false, msg: `I need ${next.gold} gold for that lesson.` };
  gs.items[treat] -= next.treats;
  gs.gold -= next.gold;
  pet.level = petLevel(pet) + 1;
  return { ok: true, msg: `${pet.name} is now a ${next.name}!` };
}

// Put armor from the bag on a pet (the old one goes back in the bag). armorId null = take it off.
export function fitArmor(gs, pet, armorId, armorDefs) {
  if (armorId && !armorDefs[armorId]) return { ok: false, msg: 'That does not fit a pet.' };
  if (armorId && (gs.items[armorId] ?? 0) <= 0) return { ok: false, msg: 'You do not have that.' };
  if (pet.armor) gs.items[pet.armor] = (gs.items[pet.armor] ?? 0) + 1;
  if (armorId) gs.items[armorId] -= 1;
  pet.armor = armorId ?? undefined;
  return { ok: true, msg: armorId ? `${pet.name} is wearing the ${armorDefs[armorId].name}.` : `${pet.name}'s armor is off.` };
}

// The Pet Trainer's conversation (same step shape as shop.js)
export function talkTrainer(gs, npcId, data, ctx) {
  const { friendDefs, itemDefs, armorRecipes, armorDefs } = ctx;
  const first = !gs.flags[`met_${npcId}`];
  gs.flags[`met_${npcId}`] = true;
  return { lines: first ? [...data.lines, data.menu] : [data.menu], afterClose: () => null, choice: main() };

  function step(msg, choiceFn) {
    return { lines: [], afterClose: () => msg, choice: choiceFn() };
  }
  function menuOf(actions) {
    return { options: actions.map((a) => ({ label: a.label, disabled: !!a.disabled })), onPick: (i) => actions[i].run() };
  }
  function main() {
    const pet = companionPet(gs);
    const actions = [];
    if (pet) {
      const next = nextTraining(pet);
      const treat = itemDefs[friendDefs.kinds[pet.kind].treat]?.name ?? 'treats';
      actions.push({
        label: next ? `Train ${pet.name} (${next.treats} ${treat}${next.gold ? `, ${next.gold}g` : ''})` : `${pet.name} is fully trained`,
        disabled: !next,
        run: () => { const r = trainPet(gs, pet, friendDefs); return step(r.msg, main); },
      });
      actions.push({ label: `Pet armor for ${pet.name}`, run: () => step(null, fitMenu) });
    }
    actions.push({ label: 'Make pet armor', run: () => step(null, makeMenu) });
    actions.push({ label: 'Leave', run: () => ({ lines: [data.farewell], afterClose: () => null }) });
    if (!pet) return menuOf(actions);
    return menuOf(actions);
  }
  function makeMenu() {
    const rs = getRecipes(gs, armorRecipes, itemDefs);
    const actions = rs.map((r) => ({ label: r.text, disabled: !r.affordable, run: () => { const c = craft(gs, armorRecipes, itemDefs, r.id); return step(c.msg, makeMenu); } }));
    actions.push({ label: 'Back', run: () => step(null, main) });
    return menuOf(actions);
  }
  function fitMenu() {
    const pet = companionPet(gs);
    if (!pet) return main();
    const actions = Object.keys(armorDefs)
      .filter((id) => (gs.items[id] ?? 0) > 0)
      .map((id) => ({ label: `Fit the ${armorDefs[id].name}`, run: () => { const r = fitArmor(gs, pet, id, armorDefs); return step(r.msg, fitMenu); } }));
    if (pet.armor) actions.push({ label: 'Take armor off', run: () => { const r = fitArmor(gs, pet, null, armorDefs); return step(r.msg, fitMenu); } });
    if (actions.length === 0) actions.push({ label: 'No pet armor yet', disabled: true, run: () => step(null, main) });
    actions.push({ label: 'Back', run: () => step(null, main) });
    return menuOf(actions);
  }
}
