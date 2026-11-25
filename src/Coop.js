// The co-op world connection. One of these lives for as long as a co-op game is open
// (it survives the scene restarts that happen on every door).
//
// In the cloud:  worlds/<CODE>/meta                     the world exists
//                worlds/<CODE>/shared/...               farm plots, rocks/trees/boulders, world flags (everyone)
//                worlds/<CODE>/chars/<name>             each player's own bag, hearts, gold, quests...
//                worlds/<CODE>/players/<name>           where everyone is right now (for seeing each other)
import { cloudReady, cGet, cPut, cPatch, cDelete, cDeleteOnExit, cListen } from './cloud.js';
import {
  applyInitial, applyPath, applyStreamEvent, canon, diffFlat, flattenShared, flattenTree,
  livePlayers, nameKey, personalPart,
} from './coopLogic.js';
import { SaveManager } from './SaveManager.js';

const PERSONAL_EVERY_MS = 8000; // how often the character is backed up to the cloud
const HEARTBEAT_EVERY = 10; // seconds between "I'm still here" updates

export const Coop = {
  active: false,
  started: false,
  code: '',
  name: '',
  key: '',
  online: false,
  scene: null,
  gs: null,

  // Check the world and fetch what is already there. create=true makes a new world.
  // Returns { ok, error?, char? }  (error: 'not-set-up' | 'no-world' | 'offline')
  async join({ code, name, create }) {
    if (!cloudReady()) return { ok: false, error: 'not-set-up' };
    try {
      if (create) {
        await cPut(`worlds/${code}/meta`, { created: Date.now() });
      } else if (!(await cGet(`worlds/${code}/meta`))) {
        return { ok: false, error: 'no-world' };
      }
      const key = nameKey(name);
      const [shared, char] = await Promise.all([cGet(`worlds/${code}/shared`), cGet(`worlds/${code}/chars/${key}`)]);
      this.reset();
      Object.assign(this, { active: true, code, name, key, pendingShared: shared ?? {} });
      return { ok: true, char: char && char.state ? char : null };
    } catch (err) {
      console.warn('Co-op join failed', err);
      return { ok: false, error: 'offline' };
    }
  },

  reset() {
    (this.stops ?? []).forEach((s) => s());
    this.stops = [];
    Object.assign(this, {
      active: false, started: false, online: false, scene: null, gs: null, pushing: false,
      sharedTree: {}, remoteFlat: {}, lastPushed: {}, playersTree: {}, me: null,
      presenceBusy: false, presenceDirty: false, lastPersonalAt: 0, personalTimer: null, seconds: 0,
    });
  },

  // Called by the world scene on every (re)start, before it builds the map.
  prepare(gs) {
    this.gs = gs;
    if (this.started) return;
    this.started = true;
    // the cloud's world replaces whatever shared things this device remembered
    this.sharedTree = this.pendingShared ?? {};
    applyInitial(gs, this.sharedTree);
    this.remoteFlat = flattenTree(this.sharedTree);
    this.lastPushed = flattenShared(gs);

    const base = `worlds/${this.code}`;
    this.stops.push(
      cListen(
        `${base}/shared`,
        (type, p) => {
          this.sharedTree = applyStreamEvent(this.sharedTree, type, p);
          this.onSharedTree();
        },
        (ok) => (this.online = ok)
      ),
      cListen(`${base}/players`, (type, p) => {
        this.playersTree = applyStreamEvent(this.playersTree, type, p);
        this.refreshPlayers();
      })
    );
    SaveManager.afterSave = (state) => this.savePersonal(state);
    this.onExit = () => cDeleteOnExit(`${base}/players/${this.key}`);
    window.addEventListener('pagehide', this.onExit);
  },

  bind(scene) {
    this.scene = scene;
    this.refreshPlayers();
  },
  unbind(scene) {
    if (this.scene === scene) this.scene = null;
  },

  // ---- shared world ----
  onSharedTree() {
    const gs = this.gs;
    if (!gs) return;
    const next = flattenTree(this.sharedTree);
    const changes = diffFlat(this.remoteFlat, next);
    this.remoteFlat = next;
    const changed = [];
    for (const [path, v] of Object.entries(changes)) {
      if (canon(v) === canon(this.lastPushed[path])) continue; // that is just our own change coming back
      applyPath(gs, path, v);
      if (v === null) delete this.lastPushed[path];
      else this.lastPushed[path] = v;
      changed.push(path);
    }
    if (changed.length && this.scene) this.scene.coopSharedChanged(changed);
  },

  // send what changed locally since the last time
  async pushShared() {
    if (!this.active || !this.started || this.pushing || !this.gs) return;
    const patch = diffFlat(this.lastPushed, flattenShared(this.gs));
    const paths = Object.keys(patch);
    if (!paths.length) return;
    this.pushing = true;
    try {
      await cPatch(`worlds/${this.code}/shared`, patch);
      for (const p of paths) {
        if (patch[p] === null) delete this.lastPushed[p];
        else this.lastPushed[p] = patch[p];
      }
    } catch (err) {
      console.warn('Co-op push failed, will retry', err); // lastPushed unchanged, so the next tick tries again
    } finally {
      this.pushing = false;
    }
  },

  // once a second from the world scene
  tick() {
    if (!this.active) return;
    this.pushShared();
    this.seconds += 1;
    if (this.me && this.seconds % HEARTBEAT_EVERY === 0) this.sendPresence(this.me.m, this.me.x, this.me.y, this.me.d);
    this.refreshPlayers(); // also drops anyone who went quiet
    if (this.seconds % 20 === 0 && this.scene) this.scene.saveQuiet(); // autosave while playing together
  },

  // ---- seeing each other ----
  sendPresence(map, x, y, d) {
    if (!this.active) return;
    this.me = { n: this.name, m: map, x, y, d, t: Date.now() };
    if (this.presenceBusy) {
      this.presenceDirty = true;
      return;
    }
    this.presenceBusy = true;
    cPut(`worlds/${this.code}/players/${this.key}`, this.me)
      .catch(() => {})
      .finally(() => {
        this.presenceBusy = false;
        if (this.presenceDirty) {
          this.presenceDirty = false;
          this.sendPresence(this.me.m, this.me.x, this.me.y, this.me.d);
        }
      });
  },

  refreshPlayers() {
    if (this.scene) this.scene.coopPlayers(livePlayers(this.playersTree, this.key));
  },

  // ---- my own character ----
  savePersonal(state, force = false) {
    if (!this.active || !state) return;
    const now = Date.now();
    const send = () => {
      this.lastPersonalAt = Date.now();
      this.personalTimer = null;
      cPut(`worlds/${this.code}/chars/${this.key}`, { savedAt: Date.now(), state: personalPart(state) }).catch((e) =>
        console.warn('Character backup failed', e)
      );
    };
    if (force || now - this.lastPersonalAt >= PERSONAL_EVERY_MS) {
      if (this.personalTimer) clearTimeout(this.personalTimer);
      send();
    } else if (!this.personalTimer) {
      this.personalTimer = setTimeout(send, PERSONAL_EVERY_MS - (now - this.lastPersonalAt));
    }
  },

  // leaving to the title screen
  stop(state) {
    if (!this.active) return;
    this.savePersonal(state, true);
    cDelete(`worlds/${this.code}/players/${this.key}`).catch(() => {});
    window.removeEventListener('pagehide', this.onExit);
    SaveManager.afterSave = null;
    this.pushShared();
    // give the last writes a moment before closing the live connections
    const stops = this.stops;
    this.stops = [];
    setTimeout(() => stops.forEach((s) => s()), 1500);
    Object.assign(this, { active: false, started: false, scene: null, gs: null });
  },
};

Coop.reset();
