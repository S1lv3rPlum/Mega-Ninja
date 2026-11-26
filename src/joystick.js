// Floating thumb-stick maths. No Phaser in here.
// Touch anywhere in the left part of the screen, drag, and the stick tells you which way to walk.
export const STICK = { zoneW: 200, zoneTop: 56, radius: 26, dead: 7, bias: 1.25 };

// Which way is the thumb pushing? Returns {x,y} with one of them 0 (the game moves one tile at a time).
// `prev` is the last direction, so a thumb drifting near a diagonal does not flicker between two directions.
export function stickDir(dx, dy, prev = { x: 0, y: 0 }, cfg = STICK) {
  if (Math.hypot(dx, dy) < cfg.dead) return { x: 0, y: 0 };
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  let horizontal = ax >= ay;
  if (prev.x !== 0 && ay < ax * cfg.bias) horizontal = true; // already going sideways: stay unless clearly vertical
  else if (prev.y !== 0 && ax < ay * cfg.bias) horizontal = false;
  return horizontal ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
}

// keep the knob inside the ring
export function clampKnob(dx, dy, radius = STICK.radius) {
  const d = Math.hypot(dx, dy);
  return d <= radius ? { x: dx, y: dy } : { x: (dx / d) * radius, y: (dy / d) * radius };
}

// may a touch at (x,y) start a stick?
export const inStickZone = (x, y, cfg = STICK) => x < cfg.zoneW && y > cfg.zoneTop;
