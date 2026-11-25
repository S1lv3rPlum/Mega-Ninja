// Fishing. No Phaser in here.
//   gs.items['fishing-rod']  = 1 once the Old Fisher gives you the rod
//   gs.fishLog = { 'pond-minnow': 3, ... }   how many of each fish you have ever caught
//
// A cast has two parts:
//   1. CAST   - the bobber floats. After a random wait the fish BITES (a short window): press Space then.
//               Too early scares the fish; too late and it gets away.
//   2. REEL   - a marker slides back and forth along a bar. Press Space while it is inside the green zone.
//               Common fish need one good pull, rare fish need two or three. Two bad pulls and it escapes.
// Fish live in data/fish.json: { area: [..], when: 'any'|'day'|'night', weight, zone, speed, reel, sell, ... }

export const BITE_MIN = 1500;
export const BITE_MAX = 4200;
export const BITE_WINDOW = 1300;
export const MAX_STRIKES = 2;

export const ROD = 'fishing-rod';
export const hasRod = (gs) => (gs.items[ROD] ?? 0) > 0;

export function ensureFishing(gs) {
  if (!gs.fishLog) gs.fishLog = {};
}

// fish that can be caught in an area right now (night = true after dark)
export function fishFor(area, night, fishDefs) {
  return Object.entries(fishDefs)
    .filter(([, f]) => f.area.includes(area) && (f.when === 'any' || (f.when === 'night') === night))
    .map(([id, f]) => ({ id, ...f }));
}

// weighted random pick. rng() is a number in [0,1)
export function pickFish(area, night, fishDefs, rng = Math.random) {
  const list = fishFor(area, night, fishDefs);
  if (list.length === 0) return null;
  const total = list.reduce((a, f) => a + f.weight, 0);
  let r = rng() * total;
  for (const f of list) {
    r -= f.weight;
    if (r < 0) return f;
  }
  return list[list.length - 1];
}

// ---- part 1: the cast
export function startCast(now, rng = Math.random) {
  return { castAt: now, biteAt: now + BITE_MIN + rng() * (BITE_MAX - BITE_MIN) };
}

// 'wait' (nothing yet) | 'bite' (press now!) | 'lost' (you were too slow)
export function castStatus(c, now) {
  if (now < c.biteAt) return 'wait';
  return now <= c.biteAt + BITE_WINDOW ? 'bite' : 'lost';
}

// Space during a cast: 'early' | 'hooked' | 'lost'
export function pressCast(c, now) {
  const s = castStatus(c, now);
  return s === 'wait' ? 'early' : s === 'bite' ? 'hooked' : 'lost';
}

// ---- part 2: the reel
export function startReel(fish, now, rng = Math.random) {
  const zone = fish.zone ?? 0.3;
  return {
    fish,
    t0: now,
    period: fish.speed ?? 1400,
    zone,
    center: zone / 2 + rng() * (1 - zone),
    need: Math.max(1, fish.reel ?? 1),
    hits: 0,
    strikes: 0,
  };
}

// where the marker is (0..1): it bounces from one end to the other
export function markerPos(r, now) {
  const p = (((now - r.t0) / r.period) % 2 + 2) % 2;
  return p > 1 ? 2 - p : p;
}

export const inZone = (r, pos) => Math.abs(pos - r.center) <= r.zone / 2;

// Space during the reel. Returns { hit, done: 'caught' | 'escaped' | null }
export function pressReel(r, now, rng = Math.random) {
  const hit = inZone(r, markerPos(r, now));
  if (hit) {
    r.hits += 1;
    if (r.hits >= r.need) return { hit, done: 'caught' };
    r.center = r.zone / 2 + rng() * (1 - r.zone); // the fish darts somewhere new
    return { hit, done: null };
  }
  r.strikes += 1;
  return { hit, done: r.strikes >= MAX_STRIKES ? 'escaped' : null };
}

// ---- the catch
export function landFish(gs, fish) {
  ensureFishing(gs);
  const first = !gs.fishLog[fish.id];
  gs.fishLog[fish.id] = (gs.fishLog[fish.id] ?? 0) + 1;
  gs.items[fish.id] = (gs.items[fish.id] ?? 0) + 1;
  return { first };
}

// fish kinds you have caught at least once, and how many kinds there are (the junk boot is not counted)
export function loggedCount(gs, fishDefs) {
  const real = Object.entries(fishDefs).filter(([, f]) => !f.junk);
  return { caught: real.filter(([id]) => (gs.fishLog?.[id] ?? 0) > 0).length, total: real.length };
}

// ---- the Old Fisher: sells your fish, shows your log, gives prizes
export const LOG_REWARDS = [
  { count: 4, gold: 40, msg: 'Four kinds! Here is 40 gold for your trouble.' },
  { count: 8, item: 'greater-potion', amount: 2, msg: 'Eight kinds! Take these potions, ninja.' },
  { count: 11, item: 'elixir', amount: 2, gold: 100, msg: 'EVERY fish! You are a true angler. Take this.' },
];

export function claimLogRewards(gs, fishDefs) {
  const { caught } = loggedCount(gs, fishDefs);
  const msgs = [];
  for (const r of LOG_REWARDS) {
    const flag = `fishlog_reward_${r.count}`;
    if (caught >= r.count && !gs.flags[flag]) {
      gs.flags[flag] = true;
      if (r.gold) gs.gold += r.gold;
      if (r.item) gs.items[r.item] = (gs.items[r.item] ?? 0) + r.amount;
      msgs.push(r.msg);
    }
  }
  return msgs;
}

export function sellable(gs, fishDefs) {
  return Object.entries(fishDefs)
    .filter(([id]) => (gs.items[id] ?? 0) > 0)
    .map(([id, f]) => ({ id, name: f.name, count: gs.items[id], each: f.sell ?? 1 }));
}

export function sellFish(gs, fishDefs, id) {
  const n = gs.items[id] ?? 0;
  const f = fishDefs[id];
  if (!f || n <= 0) return { ok: false, msg: 'You have none of those.' };
  const gold = n * (f.sell ?? 1);
  gs.items[id] = 0;
  gs.gold += gold;
  return { ok: true, gold, msg: `Sold ${n} ${f.name} for ${gold} gold.` };
}

// lines for the fish log, grouped by place
export function logLines(gs, fishDefs, areaNames) {
  const { caught, total } = loggedCount(gs, fishDefs);
  const lines = [`You have caught ${caught} of ${total} kinds.`];
  for (const [area, label] of Object.entries(areaNames)) {
    const names = Object.entries(fishDefs)
      .filter(([, f]) => !f.junk && f.area.includes(area))
      .map(([id, f]) => ((gs.fishLog?.[id] ?? 0) > 0 ? f.name : '???'));
    lines.push(`${label}: ${names.join(', ')}`);
  }
  return lines;
}

// Same step shape as shop.js / craft.js:  { lines, afterClose, choice: { options, onPick } }
export function talkFisher(gs, npcId, data, { fishDefs, areaNames }) {
  ensureFishing(gs);
  const metFlag = `met_${npcId}`;
  const first = !gs.flags[metFlag];
  gs.flags[metFlag] = true;
  const prizes = claimLogRewards(gs, fishDefs);
  const intro = first ? [...data.lines, data.menu] : [...prizes, data.menu];
  if (first && prizes.length) intro.unshift(...prizes);
  return { lines: intro, afterClose: () => null, choice: mainMenu() };

  function mainMenu() {
    return {
      options: [
        { label: 'Sell my fish', disabled: sellable(gs, fishDefs).length === 0 },
        { label: 'My fish log', disabled: false },
        { label: 'Fishing tips', disabled: false },
        { label: 'Leave', disabled: false },
      ],
      onPick: (i) => {
        if (i === 0) return sellMenu();
        if (i === 1) return { lines: logLines(gs, fishDefs, areaNames), afterClose: () => null, choice: mainMenu() };
        if (i === 2) return { lines: data.tips, afterClose: () => null, choice: mainMenu() };
        return { lines: [data.farewell], afterClose: () => null };
      },
    };
  }

  function sellMenu() {
    const list = sellable(gs, fishDefs);
    const options = list.map((s) => ({ label: `${s.name} x${s.count} (${s.count * s.each}g)`, disabled: false }));
    options.push({ label: 'Back', disabled: false });
    return {
      lines: ['Which pile?'],
      afterClose: () => null,
      choice: {
        options,
        onPick: (i) => {
          if (i >= list.length) return { lines: [data.menu], afterClose: () => null, choice: mainMenu() };
          const r = sellFish(gs, fishDefs, list[i].id);
          return { lines: [r.msg], afterClose: () => null, choice: mainMenu() };
        },
      },
    };
  }
}
