// The garden rabbit. No Phaser in here: it is a small timer-driven state machine.
//
//   cooldown (30 s) -> appears on a plot and sits (5 s) -> eats what is growing there
//   -> sits (5 s) -> hops 1-2 tiles away -> disappears -> cooldown again ...
//
// The player can catch it while it sits ('held'), and throw it away, which restarts the cooldown.

export const COOLDOWN_MS = 30000;
export const SIT_MS = 5000;
export const HOP_MS = 400;
export const PREFER_PLANTED = true; // go for plots with something growing (false = any plot at random)

export function createRabbit() {
  return { phase: 'cooldown', timer: COOLDOWN_MS, x: 0, y: 0 };
}

export const rabbitOnMap = (r) => r.phase === 'sit1' || r.phase === 'sit2' || r.phase === 'hopping';
export const canCatch = (r) => r.phase === 'sit1' || r.phase === 'sit2';

export function catchRabbit(r) {
  if (!canCatch(r)) return false;
  r.phase = 'held';
  r.timer = 0;
  return true;
}

export function throwRabbit(r) {
  if (r.phase !== 'held') return false;
  r.phase = 'cooldown';
  r.timer = COOLDOWN_MS;
  return true;
}

function pickPlot(plots, rng) {
  const planted = plots.filter((p) => p.planted);
  const pool = PREFER_PLANTED && planted.length > 0 ? planted : plots;
  return pool.length ? pool[Math.floor(rng() * pool.length)] : null;
}

function pickHop(r, isFree, rng) {
  const options = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (const d of [1, 2]) {
      const x = r.x + dx * d;
      const y = r.y + dy * d;
      if (isFree(x, y)) options.push({ x, y });
    }
  }
  return options.length ? options[Math.floor(rng() * options.length)] : null;
}

// Advance the timers by dt milliseconds. Returns events for the scene to show:
//   { type: 'appear', x, y } | { type: 'eat', x, y } | { type: 'hop', from, to } | { type: 'leave' }
// ctx = { plots: [{ x, y, planted }], isFree(x, y), rng }
export function tickRabbit(r, dt, ctx) {
  const events = [];
  if (r.phase === 'held') return events;
  r.timer -= dt;
  if (r.timer > 0) return events;

  const rng = ctx.rng ?? Math.random;
  switch (r.phase) {
    case 'cooldown': {
      const plot = pickPlot(ctx.plots, rng);
      if (!plot) {
        r.timer = COOLDOWN_MS; // no plots here, try again later
        break;
      }
      r.x = plot.x;
      r.y = plot.y;
      r.phase = 'sit1';
      r.timer = SIT_MS;
      events.push({ type: 'appear', x: r.x, y: r.y });
      break;
    }
    case 'sit1':
      r.phase = 'sit2';
      r.timer = SIT_MS;
      events.push({ type: 'eat', x: r.x, y: r.y });
      break;
    case 'sit2': {
      const to = pickHop(r, ctx.isFree, rng);
      if (to) {
        events.push({ type: 'hop', from: { x: r.x, y: r.y }, to });
        r.x = to.x;
        r.y = to.y;
      }
      r.phase = 'hopping';
      r.timer = HOP_MS;
      break;
    }
    case 'hopping':
      r.phase = 'cooldown';
      r.timer = COOLDOWN_MS;
      events.push({ type: 'leave' });
      break;
  }
  return events;
}
