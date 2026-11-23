const KEY = 'mega-ninja-save';
const VERSION = 1; // bump when your save format changes

export const SaveManager = {
  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: VERSION, state }));
      return true;
    } catch (err) {
      console.warn('Save failed', err);
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data.version === VERSION ? data.state : null; // add migrations later
    } catch (err) {
      console.warn('Load failed', err);
      return null;
    }
  },

  hasSave() {
    return localStorage.getItem(KEY) !== null;
  },

  clear() {
    localStorage.removeItem(KEY);
  },
};
