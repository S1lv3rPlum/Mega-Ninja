// The sealed stone door in the cave: it needs a set of items (data/sealed-door.json) and uses them up.
// Pure logic (no Phaser) so it can be tested in Node.

// names of the items still missing, e.g. ['Ruby', 'Crest Stone']
export function missingForDoor(gs, cfg, itemNames = {}) {
  return Object.entries(cfg.requires)
    .filter(([id, n]) => (gs.items[id] ?? 0) < n)
    .map(([id]) => itemNames[id] ?? id);
}

export const doorIsOpen = (gs, cfg) => !!gs.flags[cfg.flag];

// try to open it: uses the items up and sets the flag. Returns { ok, missing }
export function openDoor(gs, cfg, itemNames = {}) {
  const missing = missingForDoor(gs, cfg, itemNames);
  if (missing.length > 0 || doorIsOpen(gs, cfg)) return { ok: false, missing };
  for (const [id, n] of Object.entries(cfg.requires)) gs.items[id] -= n;
  gs.flags[cfg.flag] = true;
  return { ok: true, missing: [] };
}
