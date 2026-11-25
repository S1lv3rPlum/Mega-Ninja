// Crafting at the school: the cook (kitchen) and the alchemist (potions). No Phaser in here.
// recipes.json:  { kitchen: { offers: [{ id, out, amount, needs: { item: n } }] }, potions: { ... } }
// The result is a normal item (items.json); foods and potions have "heal" so the bag's EAT button uses them.

export function getRecipes(gs, def, itemDefs) {
  const nm = (id) => itemDefs[id]?.name ?? id;
  return def.offers.map((o) => {
    const text = Object.entries(o.needs).map(([k, n]) => `${n} ${nm(k)}`).join(', ');
    return {
      id: o.id,
      label: nm(o.out),
      text: `${nm(o.out)} (${text})`,
      affordable: Object.entries(o.needs).every(([k, n]) => (gs.items[k] ?? 0) >= n),
    };
  });
}

// Craft one recipe by id. Returns { ok, msg }.
export function craft(gs, def, itemDefs, id) {
  const o = def.offers.find((x) => x.id === id);
  if (!o) return { ok: false, msg: 'I do not know that recipe.' };
  if (!Object.entries(o.needs).every(([k, n]) => (gs.items[k] ?? 0) >= n)) return { ok: false, msg: 'You are missing something.' };
  for (const [k, n] of Object.entries(o.needs)) gs.items[k] -= n;
  gs.items[o.out] = (gs.items[o.out] ?? 0) + o.amount;
  return { ok: true, msg: `Made ${itemDefs[o.out]?.name ?? o.out}!` };
}

// Same step shape as shop.js
export function talkToCrafter(gs, npcId, data, def, itemDefs) {
  const metFlag = `met_${npcId}`;
  const first = !gs.flags[metFlag];
  gs.flags[metFlag] = true;
  return { lines: first ? [...data.lines, data.menu] : [data.menu], afterClose: () => null, choice: menu() };

  function menu() {
    const rs = getRecipes(gs, def, itemDefs);
    const options = rs.map((r) => ({ label: r.text, disabled: !r.affordable }));
    options.push({ label: 'Leave', disabled: false });
    return {
      options,
      onPick: (i) => {
        if (i >= rs.length) return { lines: [data.farewell], afterClose: () => null };
        const r = craft(gs, def, itemDefs, rs[i].id);
        if (r.ok) gs.flags[`crafted_${npcId}`] = true; // the school's first-year check
        return { lines: [], afterClose: () => r.msg, choice: menu() };
      },
    };
  }
}
