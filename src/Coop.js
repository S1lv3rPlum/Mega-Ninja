// The co-op world connection. One of these lives for as long as a co-op game is open
// (it survives the scene restarts that happen on every door).
//
// In the cloud:  worlds/<CODE>/meta                     the world exists
//                worlds/<CODE>/shared/...               farm plots, rocks/trees/boulders, world flags (everyone)
//                worlds/<CODE>/chars/<name>             each player's own bag, hearts, gold, quests...
//                worlds/<CODE>/players/<name>           where everyone is right now (for seeing each other)
//                worlds/<CODE>/trades/<id>              offers between two players (see trade.js)
import { cloudReady, cGet, cPut, cPatch, cDelete, cDeleteOnExit, cListen } from './cloud.js';
import {
  applyInitial, applyPath, applyStreamEvent, canon, diffFlat, flattenShared, flattenTree,
  livePlayers, nameKey, personalPart,
} from './coopLogic.js';
import { SaveManager } from './SaveManager.js';
import { companionPet } from './pets.js';
import itemsData from './data/items.json';
import { makeOffer, acceptOffer, settleOffer, sanitizeOffer, trimDone } from './trade.js';

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
      tradesTree: {}, notified: new Set(), settling: new Set(),
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
      }),
      cListen(`${base}/trades`, (type, p) => {
        this.tradesTree = applyStreamEvent(this.tradesTree, type, p);
        this.onTrades();
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

  // ---- trading (the rules are in trade.js; the offers live in the cloud) ----
  offers() {
    return Object.values(this.tradesTree ?? {}).map((o) => sanitizeOffer(o, itemsData.items)).filter(Boolean);
  },
  incoming() {
    return this.offers().filter((o) => o.to === this.key && o.status === 'open');
  },
  outgoing() {
    return this.offers().filter((o) => o.from === this.key && o.status === 'open');
  },

  // something changed in the trades: tell me about new offers, and collect answers to my own
  onTrades() {
    if (!this.gs) return;
    for (const o of this.offers()) {
      if (o.to === this.key && o.status === 'open' && !this.notified.has(o.id)) {
        this.notified.add(o.id);
        this.scene?.showToast(`${o.fromName} wants to trade! Open PETS, then Trades.`);
      }
      if (o.from === this.key && o.status !== 'open') this.settle(o);
    }
  },

  async settle(o) {
    if (this.settling.has(o.id)) return;
    this.settling.add(o.id);
    const gs = this.gs;
    const r = settleOffer(gs, o, itemsData.items);
    if (r.ok) {
      trimDone(gs);
      this.save();
      this.scene?.showToast(r.msg);
      this.scene?.updateHud?.();
    }
    try {
      await cDelete(`worlds/${this.code}/trades/${o.id}`);
    } catch (e) {
      this.settling.delete(o.id); // try again on the next change (tradesDone stops it being paid twice)
    }
  },

  save() {
    if (this.scene?.saveQuiet) this.scene.saveQuiet();
    else SaveManager.save(this.gs);
    this.savePersonal(this.gs, true);
  },

  // Send an offer. The things on offer leave your bag now and wait in the offer.
  async sendOffer(to, toName, give, giveGold, ask, askGold) {
    const gs = this.gs;
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const snap = JSON.stringify({ items: gs.items, gold: gs.gold });
    const made = makeOffer(gs, { id, from: this.key, fromName: this.name, to, toName, give, giveGold, ask, askGold }, itemsData.items);
    if (!made.ok) return made;
    this.save();
    try {
      await cPut(`worlds/${this.code}/trades/${id}`, made.offer);
    } catch (err) {
      let there = false;
      try { there = !!(await cGet(`worlds/${this.code}/trades/${id}`)); } catch (e2) { /* offline */ }
      if (!there) {
        Object.assign(gs, JSON.parse(snap)); // it never left: put it all back
        this.save();
        return { ok: false, msg: 'Could not reach the world. Nothing was sent.' };
      }
    }
    return { ok: true, offer: made.offer };
  },

  // the receiver says yes (accept = true) or no
  async respond(id, accept) {
    const gs = this.gs;
    const path = `worlds/${this.code}/trades/${id}`;
    let raw;
    try { raw = await cGet(path); } catch (e) { return { ok: false, msg: 'Could not reach the world.' }; }
    const o = sanitizeOffer(raw, itemsData.items);
    if (!o || o.status !== 'open' || o.to !== this.key) return { ok: false, msg: 'That offer is gone.' };
    if (!accept) {
      try { await cPatch(path, { status: 'declined' }); } catch (e) { return { ok: false, msg: 'Could not reach the world.' }; }
      return { ok: true, msg: 'Declined.' };
    }
    const snap = JSON.stringify({ items: gs.items, gold: gs.gold });
    const r = acceptOffer(gs, o, itemsData.items);
    if (!r.ok) return r;
    try {
      await cPatch(path, { status: 'accepted', paid: r.paid });
    } catch (err) {
      let status = null;
      try { status = (await cGet(path))?.status; } catch (e2) { /* offline */ }
      if (status !== 'accepted') {
        Object.assign(gs, JSON.parse(snap)); // it did not go through: undo
        return { ok: false, msg: 'Could not reach the world. Nothing changed.' };
      }
    }
    this.save();
    return { ok: true, msg: 'Trade done!' };
  },

  // the sender takes an open offer back
  async cancel(id) {
    const path = `worlds/${this.code}/trades/${id}`;
    try {
      const o = sanitizeOffer(await cGet(path), itemsData.items);
      if (!o || o.status !== 'open') return { ok: false, msg: 'It was already answered.' };
      await cPatch(path, { status: 'cancelled' }); // the live connection then returns your things
      return { ok: true, msg: 'Cancelling...' };
    } catch (e) {
      return { ok: false, msg: 'Could not reach the world.' };
    }
  },

  // what the other player has (their last backup), for choosing what to ask for
  async theirItems(key) {
    try {
      const st = await cGet(`worlds/${this.code}/chars/${key}/state`);
      return { items: st?.items ?? {}, gold: st?.gold ?? 0 };
    } catch (e) {
      return null;
    }
  },

  // ---- seeing each other ----
  sendPresence(map, x, y, d) {
    if (!this.active) return;
    this.me = { n: this.name, m: map, x, y, d, t: Date.now() };
    if (this.scene?.gameState?.ninja) this.me.nj = this.scene.gameState.ninja; // your ninja colour is visible to the others
    const pet = this.scene?.gameState ? companionPet(this.scene.gameState) : null;
    if (pet) {
      this.me.c = pet.kind; // your friend is visible to the others
      this.me.cn = pet.name;
    }
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
