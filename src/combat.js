// Hearts, damage, fainting, eating and enemy movement. No Phaser in here.
// One heart = 2 hit points. Damage and healing are in hit points.

export const DEFAULT_MAX_HP = 20;

export function ensureCombatState(gs) {
  if (!gs.maxHp) gs.maxHp = DEFAULT_MAX_HP;
  if (typeof gs.hp !== 'number' || gs.hp > gs.maxHp) gs.hp = gs.maxHp;
  if (gs.weapon === undefined) gs.weapon = null;
  if (!gs.enemies) gs.enemies = {};
}

// Returns { fainted } after taking `amount` damage
export function hurtPlayer(gs, amount) {
  gs.hp = Math.max(0, gs.hp - amount);
  return { fainted: gs.hp <= 0 };
}

// Fainting: you wake up in town with full health. faint.json says what it costs (currently nothing).
// { goldLossPercent, goldLossFlat?, message }
export function faint(gs, cfg, startMap, startTile) {
  const pct = Math.min(100, Math.max(0, cfg.goldLossPercent ?? 0));
  const lost = Math.min(gs.gold, Math.floor((gs.gold * pct) / 100) + (cfg.goldLossFlat ?? 0));
  gs.gold -= lost;
  gs.hp = gs.maxHp;
  gs.map = startMap;
  gs.tile = { ...startTile };
  const extra = lost > 0 ? ` You lost ${lost} gold.` : '';
  return { lost, msg: (cfg.message ?? 'You fainted.') + extra };
}

// Eat something from the bag. `items` is data/items.json's "items" section; an item with "heal" is food.
export function eat(gs, items, id) {
  const def = items[id];
  if (!def || !def.heal) return { ok: false, msg: `You can't eat that.` };
  if ((gs.items[id] ?? 0) <= 0) return { ok: false, msg: `You have none left.` };
  if (gs.hp >= gs.maxHp) return { ok: false, msg: `You're already at full health.` };
  gs.items[id] -= 1;
  const before = gs.hp;
  gs.hp = Math.min(gs.maxHp, gs.hp + def.heal);
  const gained = gs.hp - before;
  return { ok: true, gained, msg: `Ate ${def.name.toLowerCase()}. +${gained / 2} heart${gained === 2 ? '' : 's'}` };
}

// ---------- enemies ----------
export const isAdjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

// Where does this enemy step next? Chases when you're within `sight` tiles, otherwise wanders a little.
// `free(x, y)` says whether a tile can be entered. Returns { x, y } or null (stay put).
export function chooseStep(e, player, free, sight, rnd = Math.random) {
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dirs = [];
  if (Math.abs(dx) + Math.abs(dy) <= sight) {
    const h = { x: Math.sign(dx), y: 0 };
    const v = { x: 0, y: Math.sign(dy) };
    const order = Math.abs(dx) >= Math.abs(dy) ? [h, v] : [v, h];
    order.forEach((d) => {
      if (d.x !== 0 || d.y !== 0) dirs.push(d);
    });
  } else {
    if (rnd() > 0.4) return null; // mostly stands around
    const all = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    dirs.push(all[Math.floor(rnd() * all.length)]);
  }
  for (const d of dirs) {
    const nx = e.x + d.x;
    const ny = e.y + d.y;
    if (free(nx, ny)) return { x: nx, y: ny };
  }
  return null;
}

// Damage an enemy. Returns { dead }.
export function damageEnemy(e, amount) {
  e.hp = Math.max(0, e.hp - amount);
  return { dead: e.hp <= 0 };
}
