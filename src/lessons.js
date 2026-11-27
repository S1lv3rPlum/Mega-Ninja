// Cooking and brewing from the bag, once the cave teacher has taught you. No Phaser in here.
// Recipes come from data/recipes.json. COOK = the kitchen and the grill, BREW = the potion lab.
// A recipe is a bag entry { kind: 'recipe', pocket, set, recipeId, ... }; making it uses craft.js.
import { craft } from './craft.js';

export const SETS = { cook: ['kitchen', 'grill'], brew: ['potions'] };
export const learned = (gs, kind) => !!gs.flags?.[`learned_${kind}`];
// the extra pockets the bag should show for this player
export const shownPockets = (gs) => Object.keys(SETS).filter((k) => learned(gs, k));

export function recipeEntries(gs, recipes, itemDefs) {
  const out = [];
  for (const kind of shownPockets(gs)) {
    for (const set of SETS[kind]) {
      for (const o of recipes[set]?.offers ?? []) {
        const d = itemDefs[o.out] ?? { name: o.out, icon: 'rock', color: '#999999', desc: '' };
        const needs = Object.entries(o.needs).map(([k, n]) => ({ id: k, name: itemDefs[k]?.name ?? k, need: n, have: gs.items[k] ?? 0 }));
        out.push({
          id: `recipe:${o.id}`, kind: 'recipe', pocket: kind, set, recipeId: o.id,
          name: d.name, icon: d.icon, color: d.color, desc: d.desc ?? '',
          held: gs.items[o.out] ?? 0, needs, affordable: needs.every((n) => n.have >= n.need),
        });
      }
    }
  }
  return out;
}

export const needsText = (e) => e.needs.map((n) => `${n.name} ${n.have}/${n.need}`).join('\n');

// make one from the bag. Returns { ok, msg }
export function makeFromBag(gs, recipes, itemDefs, entry) {
  if (!learned(gs, entry.pocket)) return { ok: false, msg: 'You have not learned that yet.' };
  const def = recipes[entry.set];
  if (!def) return { ok: false, msg: 'I do not know that recipe.' };
  return craft(gs, def, itemDefs, entry.recipeId);
}
