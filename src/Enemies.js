import { scaleMs, scaleSight } from './difficulty.js';
import audio from './audio.js';
import enemyDefs from './data/enemies.json';
import { markEarned } from './bossGifts.js';
import { chooseStep, damageEnemy, isAdjacent } from './combat.js';
import { perkGold, allFree, ALL_FREE_FLAG } from './fairies.js';

const TILE = 16;
const RAINBOW = [0xff6060, 0xffa040, 0xffe060, 0x70e080, 0x70a8ff, 0xc080ff];

// Real-time enemies that live on the tile grid. Each one chases you when you are close and attacks when adjacent
// (it flashes red first, so you have time to step away or hit it). Pure rules are in combat.js.
export default class Enemies {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.sleepers = [];
    this.readProps = null;
  }

  // enemies that were waiting for a flag (the Rainbow Fairy) appear now that it is set
  wake() {
    const waiting = this.sleepers;
    this.sleepers = [];
    if (waiting.length && this.readProps) this.spawn(waiting, this.readProps);
  }

  // objs: the "enemies" object layer from Tiled. Properties: id, type (a key in data/enemies.json), requiresFlag?
  spawn(objs, readProps) {
    const gs = this.scene.gameState;
    const now = Date.now();
    this.readProps = readProps;
    objs.forEach((o) => {
      const p = readProps(o.properties);
      const def = enemyDefs[p.type];
      if (!def) return;
      if (p.requiresFlag && !gs.flags[p.requiresFlag]) {
        if (!(p.hideIfFlag && gs.flags[p.hideIfFlag])) this.sleepers.push(o); // it wakes later (the Rainbow Fairy)
        return;
      }
      if (p.hideIfFlag && gs.flags[p.hideIfFlag]) return; // e.g. the sprouts vanish once the treant is freed
      const id = p.id ?? o.name;
      const saved = gs.enemies[gs.map]?.[id];
      const x = Math.floor(o.x / TILE);
      const y = Math.floor(o.y / TILE);
      const rec = { id, def, home: { x, y }, x, y, hp: def.hp, moving: false, nextMove: 0, nextAttack: 0, dead: false, respawnAt: 0, sprite: null };
      rec.nightOnly = !!p.nightOnly; // only out after dark (the night friends)
      if (rec.nightOnly && !this.scene.isNight && !(saved && saved.respawnAt > now)) {
        rec.hidden = true; // asleep until night falls
        this.list.push(rec);
        return;
      }
      if (saved && saved.respawnAt > now) {
        rec.dead = true;
        rec.respawnAt = saved.respawnAt;
      } else {
        rec.sprite = this.makeSprite(rec);
      }
      this.list.push(rec);
    });
  }

  // an extra enemy made during a fight (boss helpers): never saved, never respawns
  spawnAt(typeId, x, y) {
    const def = enemyDefs[typeId];
    if (!def) return null;
    const rec = { id: `dyn${this.list.length}-${Date.now()}`, def, home: { x, y }, x, y, hp: def.hp, moving: false, nextMove: 0, nextAttack: this.scene.time.now + 800, dead: false, respawnAt: 0, sprite: null, noRespawn: true };
    rec.sprite = this.makeSprite(rec);
    rec.sprite.setAlpha(0);
    this.scene.tweens.add({ targets: rec.sprite, alpha: 1, duration: 300 });
    this.list.push(rec);
    return rec;
  }

  countOf(texture) {
    return this.list.filter((e) => !e.dead && e.def.texture === texture).length;
  }

  // everything fades away (the boss was freed)
  clearAll() {
    this.list.forEach((e) => {
      if (e.sprite) {
        const spr = e.sprite;
        this.scene.tweens.add({ targets: spr, alpha: 0, duration: 500, onComplete: () => spr.destroy() });
      }
      e.sprite = null;
      e.dead = true;
      e.respawnAt = Infinity;
    });
  }

  makeSprite(e) {
    return this.scene.add.image(e.x * TILE, e.y * TILE, e.def.texture).setOrigin(0, 0).setDepth(9);
  }

  at(x, y) {
    return this.list.find((e) => !e.dead && !e.hidden && e.x === x && e.y === y) ?? null; // (a night creature asleep by day is not there)
  }

  free(x, y, self) {
    const s = this.scene;
    return s.canWalk(x, y) && !(x === s.tile.x && y === s.tile.y) && !this.list.some((e) => e !== self && !e.dead && !e.hidden && e.x === x && e.y === y);
  }

  // called every frame by the scene
  update(time) {
    const s = this.scene;
    const now = Date.now();
    this.list.forEach((e) => {
      if (e.def.rainbow && e.sprite) e.sprite.setTint(RAINBOW[Math.floor(time / 250) % RAINBOW.length]);
      if (e.def.summon && !e.dead && !e.hidden && e.def.sight >= Math.abs(e.x - s.tile.x) + Math.abs(e.y - s.tile.y)) this.summonTick(e, time);
      if (e.dead) {
        if (now >= e.respawnAt && (!e.nightOnly || s.isNight) && this.free(e.home.x, e.home.y, e)) this.revive(e); // (Infinity = never)
        return;
      }
      if (e.hidden || e.moving) return;
      const me = { x: e.x, y: e.y };
      if (e.def.harmless) {
        // a gentle creature: it wanders about, never chases and never attacks
        if (time < e.nextMove) return;
        e.nextMove = time + scaleMs(s.gameState, e.def.moveMs, 'move') * (0.8 + Math.random() * 1.2);
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const d = dirs[Math.floor(Math.random() * 4)];
        const nx = e.x + d[0];
        const ny = e.y + d[1];
        if (Math.abs(nx - e.home.x) > 3 || Math.abs(ny - e.home.y) > 3 || !this.free(nx, ny, e)) return;
        e.moving = true;
        e.x = nx;
        e.y = ny;
        s.tweens.add({ targets: e.sprite, x: nx * TILE, y: ny * TILE, duration: 300, onComplete: () => (e.moving = false) });
        return;
      }
      if (isAdjacent(me, s.tile)) {
        if (time >= e.nextAttack) {
          e.nextAttack = time + scaleMs(s.gameState, e.def.attackMs, 'attack');
          this.telegraph(e);
        }
        return;
      }
      if (time < e.nextMove) return;
      e.nextMove = time + scaleMs(s.gameState, e.def.moveMs, 'move') * (0.8 + Math.random() * 0.4);
      const step = chooseStep(me, s.tile, (x, y) => this.free(x, y, e), scaleSight(s.gameState, e.def.sight));
      if (!step) return;
      e.moving = true;
      e.x = step.x;
      e.y = step.y;
      s.tweens.add({ targets: e.sprite, x: step.x * TILE, y: step.y * TILE, duration: 220, onComplete: () => (e.moving = false) });
    });
  }

  // flash red, then strike if you're still next to it
  telegraph(e) {
    const s = this.scene;
    e.sprite.setTint(0xff5050);
    s.time.delayedCall(scaleMs(s.gameState, 380, 'warn'), () => {
      if (e.dead || !e.sprite) return;
      e.sprite.clearTint();
      if (isAdjacent({ x: e.x, y: e.y }, s.tile)) {
        const dx = Math.sign(s.tile.x - e.x);
        const dy = Math.sign(s.tile.y - e.y);
        s.tweens.add({ targets: e.sprite, x: e.sprite.x + dx * 5, y: e.sprite.y + dy * 5, duration: 70, yoyo: true });
        s.hurtPlayer(e.def.damage);
      }
    });
  }

  // dusk and dawn: the night friends come out of hiding, or go back to sleep
  applyDayNight(isNight) {
    this.list.forEach((e) => {
      if (!e.nightOnly) return;
      if (isNight && e.hidden) {
        e.hidden = false;
        if (e.dead) return; // (it respawns normally)
        e.x = e.home.x;
        e.y = e.home.y;
        e.sprite = this.makeSprite(e);
        e.sprite.setAlpha(0);
        this.scene.tweens.add({ targets: e.sprite, alpha: 1, duration: 800 });
      } else if (!isNight && !e.hidden) {
        e.hidden = true;
        const spr = e.sprite;
        e.sprite = null;
        e.moving = false;
        if (spr) this.scene.tweens.add({ targets: spr, alpha: 0, duration: 800, onComplete: () => spr.destroy() });
      }
    });
  }

  // the player's weapon hit this enemy; (dx, dy) is the swing direction, used for a one-tile knockback
  hit(e, damage, dx, dy) {
    const s = this.scene;
    const { dead } = damageEnemy(e, damage);
    audio.sfx('hit');
    e.sprite.setTint(0xffffff);
    s.time.delayedCall(90, () => e.sprite && !e.dead && e.sprite.clearTint());
    if (dead) {
      this.kill(e);
      return true;
    }
    const nx = e.x + dx;
    const ny = e.y + dy;
    if (!e.moving && this.free(nx, ny, e)) {
      e.moving = true;
      e.x = nx;
      e.y = ny;
      s.tweens.add({ targets: e.sprite, x: nx * TILE, y: ny * TILE, duration: 120, onComplete: () => (e.moving = false) });
    }
    e.nextAttack = Math.max(e.nextAttack, s.time.now + 500); // a hit knocks the wind out of it
    return false;
  }

  // quiet = no reward message (it left as a friend)
  kill(e, quiet = false) {
    const s = this.scene;
    const gs = s.gameState;
    e.dead = true;
    if (e.def.flag && !quiet) this.bossDown(e);
    if (e.noRespawn) {
      e.respawnAt = Infinity; // helpers don't come back
    } else {
      e.respawnAt = Date.now() + e.def.respawnMs;
      if (!gs.enemies[gs.map]) gs.enemies[gs.map] = {};
      gs.enemies[gs.map][e.id] = { respawnAt: e.respawnAt };
    }
    const spr = e.sprite;
    e.sprite = null;
    s.tweens.add({ targets: spr, alpha: 0, duration: 300, onComplete: () => spr.destroy() });
    if (e.def.gold && !quiet) {
      const earned = perkGold(gs, e.def.gold); // Sunny's gift
      gs.gold += earned;
      s.showToast(`${e.def.name} defeated! +${earned} gold`);
      s.updateHud();
    }
  }

  // a mini-boss fell: set its world flag, hand out its reward, tell the story
  bossDown(e) {
    const s = this.scene;
    const gs = s.gameState;
    gs.flags[e.def.flag] = true;
    markEarned(gs, e.def.flag); // this reward is yours already: no gift later
    if (allFree(gs) && !gs.flags[ALL_FREE_FLAG]) {
      gs.flags[ALL_FREE_FLAG] = true; // the sixth fairy is free: the Rainbow Fairy wakes in the middle of the Hollow
      this.wake();
      s.time.delayedCall(3200, () => s.showToast('A rainbow light blazes in the middle of the Hollow!'));
    }
    const r = e.def.reward;
    if (r) {
      gs.items[r.item] = (gs.items[r.item] ?? 0) + 1;
      s.time.delayedCall(700, () => s.showToast(r.msg));
    }
    if (e.def.defeatLines) s.time.delayedCall(1800, () => s.dialogue.open(e.def.defeatLines, e.def.name));
    // its helpers vanish with it
    this.list.forEach((o) => {
      if (!o.noRespawn || o.dead) return;
      o.dead = true;
      o.respawnAt = Infinity;
      const spr = o.sprite;
      o.sprite = null;
      if (spr) s.tweens.add({ targets: spr, alpha: 0, duration: 400, onComplete: () => spr.destroy() });
    });
  }

  // a boss that calls helpers: keeps up to `max` of them around while you fight
  summonTick(e, time) {
    const sm = e.def.summon;
    if (!sm || e.dead) return;
    if (!e.nextSummon) e.nextSummon = time + sm.everyMs;
    if (time < e.nextSummon) return;
    e.nextSummon = time + sm.everyMs;
    const alive = this.list.filter((o) => o.noRespawn && !o.dead && o.def.texture === (enemyDefs[sm.type]?.texture ?? sm.type)).length;
    if (alive >= sm.max) return;
    const spots = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]];
    for (const [dx, dy] of spots) {
      const x = e.x + dx;
      const y = e.y + dy;
      if (this.free(x, y, e)) {
        this.spawnAt(sm.type, x, y);
        return;
      }
    }
  }

  // another player (co-op) defeated or befriended this one: it vanishes here too, without a reward
  removeRemote(id, respawnAt) {
    const e = this.list.find((x) => x.id === id);
    if (!e || e.dead || e.noRespawn) return;
    e.dead = true;
    e.respawnAt = respawnAt;
    const spr = e.sprite;
    e.sprite = null;
    if (spr) this.scene.tweens.add({ targets: spr, alpha: 0, duration: 300, onComplete: () => spr.destroy() });
  }

  // the other player's record was cleared (it grew back there): grow back here when its time is up
  reviveRemote(id) {
    const e = this.list.find((x) => x.id === id);
    if (e && e.dead && !e.noRespawn && Date.now() >= e.respawnAt && (!e.nightOnly || this.scene.isNight) && this.free(e.home.x, e.home.y, e)) this.revive(e);
  }

  revive(e) {
    const gs = this.scene.gameState;
    e.dead = false;
    e.hp = e.def.hp;
    e.x = e.home.x;
    e.y = e.home.y;
    e.moving = false;
    e.nextMove = 0;
    e.sprite = this.makeSprite(e);
    if (gs.enemies[gs.map]) delete gs.enemies[gs.map][e.id];
  }
}
