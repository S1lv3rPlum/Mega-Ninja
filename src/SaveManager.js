import { nameKey } from './coopLogic.js';
// Three named save slots, kept in the browser's localStorage (so they live on that device and browser).
// Slot data: { version, name, savedAt, state }.  state is null for a freshly created slot with no progress yet.
const PREFIX = 'mega-ninja-slot-';
const LEGACY_KEY = 'mega-ninja-save'; // the old single save: moved into slot 1 the first time
const VERSION = 1; // bump when your save format changes
const SLOTS = [1, 2, 3];
const COOP = 'coop'; // the special co-op slot (its world lives in the cloud, see Coop.js)
const COOP_KEY = 'mega-ninja-coop';
const keyFor = (slot) => (slot === COOP ? COOP_KEY : PREFIX + slot);

let current = null; // the slot being played

function read(slot) {
  try {
    const raw = localStorage.getItem(keyFor(slot));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Read failed', err);
    return null;
  }
}

function write(slot, record) {
  try {
    localStorage.setItem(keyFor(slot), JSON.stringify(record));
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
  COOP,
  afterSave: null, // set by Coop while a co-op game is open: called with the state after every save

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
    const ok = write(slot, { ...(r ?? {}), version: VERSION, name: r?.name ?? `Player ${slot}`, savedAt: Date.now(), state });
    if (ok && slot === COOP && this.afterSave) this.afterSave(state);
    return ok;
  },

  load() {
    const r = read(current ?? 1);
    return r && r.version === VERSION ? r.state : null; // add migrations later
  },

  // ---- the co-op slot ----
  coop() {
    const r = read(COOP);
    return { exists: !!r, name: r?.name ?? '', code: r?.code ?? '', started: !!r?.state, gold: r?.state?.gold ?? null };
  },

  // Join (or come back to) a co-op world as <name>. cloudChar = the character the cloud already has for that name.
  // The newer of this device's copy and the cloud's copy is used.
  joinCoop(code, name, cloudChar) {
    const local = read(COOP);
    const same = local && local.code === code && nameKey(local.name) === nameKey(name);
    let state = same ? local.state : null;
    let savedAt = same ? local.savedAt : 0;
    if (cloudChar?.state && (cloudChar.savedAt ?? 0) >= savedAt) {
      state = cloudChar.state;
      savedAt = cloudChar.savedAt ?? Date.now();
    }
    write(COOP, { version: VERSION, name, code, savedAt: savedAt || Date.now(), state });
    current = COOP;
  },

  // forget the co-op link on this device (the world itself stays in the cloud)
  removeCoop() {
    try {
      localStorage.removeItem(COOP_KEY);
    } catch (err) {
      console.warn('Delete failed', err);
    }
  },

  remove(slot) {
    try {
      localStorage.removeItem(keyFor(slot));
    } catch (err) {
      console.warn('Delete failed', err);
    }
  },

  hasSave() {
    return this.list().some((s) => s.exists);
  },
};
