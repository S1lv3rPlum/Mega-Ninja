import enemyDefs from './data/enemies.json';
import { chooseStep, damageEnemy, isAdjacent } from './combat.js';

const TILE = 16;

// Real-time enemies that live on the tile grid. Each one chases you when you are close and attacks when adjacent
// (it flashes red first, so you have time to step away or hit it). Pure rules are in combat.js.
export default class Enemies {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
  }

  // objs: the "enemies" object layer from Tiled. Properties: id, type (a key in data/enemies.json), requiresFlag?
  spawn(objs, readProps) {
    const gs = this.scene.gameState;
    const now = Date.now();
    objs.forEach((o) => {
      const p = readProps(o.properties);
      const def = enemyDefs[p.type];
      if (!def) return;
      if (p.requiresFlag && !gs.flags[p.requiresFlag]) return;
      if (p.hideIfFlag && gs.flags[p.hideIfFlag]) return; // e.g. the sprouts vanish once the treant is freed
      const id = p.id ?? o.name;
      const saved = gs.enemies[gs.map]?.[id];
      const x = Math.floor(o.x / TILE);
      const y = Math.floor(o.y / TILE);
      const rec = { id, def, home: { x, y }, x, y, hp: def.hp, moving: false, nextMove: 0, nextAttack: 0, dead: false, respawnAt: 0, sprite: null };
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
    return this.list.find((e) => !e.dead && e.x === x && e.y === y) ?? null;
  }

  free(x, y, self) {
    const s = this.scene;
    return s.canWalk(x, y) && !(x === s.tile.x && y === s.tile.y) && !this.list.some((e) => e !== self && !e.dead && e.x === x && e.y === y);
  }

  // called every frame by the scene
  update(time) {
    const s = this.scene;
    const now = Date.now();
    this.list.forEach((e) => {
      if (e.dead) {
        if (now >= e.respawnAt && this.free(e.home.x, e.home.y, e)) this.revive(e); // (Infinity = never)
        return;
      }
      if (e.moving) return;
      const me = { x: e.x, y: e.y };
      if (isAdjacent(me, s.tile)) {
        if (time >= e.nextAttack) {
          e.nextAttack = time + e.def.attackMs;
          this.telegraph(e);
        }
        return;
      }
      if (time < e.nextMove) return;
      e.nextMove = time + e.def.moveMs * (0.8 + Math.random() * 0.4);
      const step = chooseStep(me, s.tile, (x, y) => this.free(x, y, e), e.def.sight);
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
    s.time.delayedCall(380, () => {
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

  // the player's weapon hit this enemy; (dx, dy) is the swing direction, used for a one-tile knockback
  hit(e, damage, dx, dy) {
    const s = this.scene;
    const { dead } = damageEnemy(e, damage);
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
      gs.gold += e.def.gold;
      s.showToast(`${e.def.name} defeated! +${e.def.gold} gold`);
      s.updateHud();
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
    if (e && e.dead && !e.noRespawn && Date.now() >= e.respawnAt && this.free(e.home.x, e.home.y, e)) this.revive(e);
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
