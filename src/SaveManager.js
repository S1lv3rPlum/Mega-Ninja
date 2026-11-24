// Three named save slots, kept in the browser's localStorage (so they live on that device and browser).
// Slot data: { version, name, savedAt, state }.  state is null for a freshly created slot with no progress yet.
const PREFIX = 'mega-ninja-slot-';
const LEGACY_KEY = 'mega-ninja-save'; // the old single save: moved into slot 1 the first time
const VERSION = 1; // bump when your save format changes
const SLOTS = [1, 2, 3];

let current = null; // the slot being played

function read(slot) {
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Read failed', err);
    return null;
  }
}

function write(slot, record) {
  try {
    localStorage.setItem(PREFIX + slot, JSON.stringify(record));
    return true;
  } catch (err) {
    console.warn('Save failed', err);
    return false;
  }
}

// An old single-slot save becomes slot 1 (only if slot 1 is empty), so nobody loses progress
function migrate() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!read(1) && data.version === VERSION) {
      write(1, { version: VERSION, name: 'Player 1', savedAt: Date.now(), state: data.state });
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch (err) {
    console.warn('Migration failed', err);
  }
}

export const SaveManager = {
  SLOTS,

  // What the title screen shows: one entry per slot
  list() {
    migrate();
    return SLOTS.map((slot) => {
      const r = read(slot);
      return {
        slot,
        exists: !!r,
        name: r?.name ?? '',
        savedAt: r?.savedAt ?? 0,
        gold: r?.state?.gold ?? null,
        map: r?.state?.map ?? null,
        started: !!r?.state,
      };
    });
  },

  get current() {
    return current;
  },

  select(slot) {
    current = slot;
  },

  // Start a brand-new save in a slot (replaces whatever was there)
  create(slot, name) {
    write(slot, { version: VERSION, name, savedAt: Date.now(), state: null });
    current = slot;
  },

  save(state) {
    const slot = current ?? 1;
    const r = read(slot);
    return write(slot, { version: VERSION, name: r?.name ?? `Player ${slot}`, savedAt: Date.now(), state });
  },

  load() {
    const r = read(current ?? 1);
    return r && r.version === VERSION ? r.state : null; // add migrations later
  },

  remove(slot) {
    try {
      localStorage.removeItem(PREFIX + slot);
    } catch (err) {
      console.warn('Delete failed', err);
    }
  },

  hasSave() {
    return this.list().some((s) => s.exists);
  },
};
