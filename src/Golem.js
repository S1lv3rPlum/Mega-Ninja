import { scaleMs } from './difficulty.js';
import { useTool } from './tools.js';
import toolDefs from './data/tools.json';

const TILE = 16;

// Granite, the round rock golem (the cave boss). A 2x2-tile creature that guards the Crest Stone.
//   dormant -> wakes when you step close (a short cutscene the first time)
//   attacks: ROCKFALL (red tiles flash, then rocks drop on them) and ROLL (it curls into a ball, a lane of red
//   tiles shows where it will roll, it rolls across the room, then sits DIZZY for a moment and takes double damage)
//   phase 2 (half health): faster attacks, more rocks, and it shakes loose small Pebble helpers
//   defeated: it calms down, becomes a friendly NPC and gives you the Crest Stone.
// Weak to the pickaxe (Space on it with a working pickaxe hits for 4 and wears the pickaxe down); the sword hits for 2.
export const GOLEM = {
  name: 'Granite',
  flag: 'golem_defeated',
  hp: 48,
  pickDamage: 4,
  toolCooldownMs: 600, // the pickaxe cannot be spammed
  wakeRadius: 5,
  aggroRadius: 13,
  fall: { everyMs: 3200, telegraphMs: 1100, extra: 3 },
  fall2: { everyMs: 2200, telegraphMs: 850, extra: 5 },
  rollEvery: 3, // every 3rd attack is a roll (every 2nd in phase 2)
  rollTelegraphMs: 1100,
  rollMs: 650,
  dizzyMs: 2400,
  rockDamage: 2,
  summonEveryMs: 10000,
  maxPebbles: 2,
};

const INTRO = [
  'Rrrrumble... who walks on my floor?',
  'The stone door below is not for little ninjas. Granite keeps the Crest Stone. Granite keeps it SAFE.',
  'Turn back, or Granite will roll right over you!',
];
const FREED = [
  '...Oh. Granite had a bad dream. A dark voice in the deep, telling Granite to crush everyone.',
  'But you hit very hard, little ninja. Now the voice is quiet. Granite is sorry.',
  'Here. The Crest Stone. The cave builders left it with Granite, to keep for a worthy hero.',
  'Put it in the stone door with three gems: a ruby, a sapphire and an emerald. Then the way will open.',
];

export default class Golem {
  timing() {
    const base = this.phase === 1 ? GOLEM.fall : GOLEM.fall2;
    const gs = this.scene.gameState;
    return { ...base, everyMs: scaleMs(gs, base.everyMs, 'attack'), telegraphMs: scaleMs(gs, base.telegraphMs, 'warn') };
  }

  rollWarn() {
    return scaleMs(this.scene.gameState, GOLEM.rollTelegraphMs, 'warn');
  }

  constructor(scene, obj) {
    this.scene = scene;
    this.x = Math.floor(obj.x / TILE);
    this.y = Math.floor(obj.y / TILE);
    this.home = { x: this.x, y: this.y }; // where Granite sits when he is calm
    this.name = GOLEM.name;
    this.max = GOLEM.hp;
    this.hp = this.max;
    this.phase = 1;
    this.flag = GOLEM.flag;
    this.attackCount = 0;
    this.nextAttack = 0;
    this.nextSummon = 0;
    this.busy = false; // rolling or dizzy
    this.rolling = false;
    this.dizzyUntil = 0;
    this.live = [];
    const gs = scene.gameState;
    this.good = !!gs.flags[GOLEM.flag];
    this.state = this.good ? 'good' : 'dormant'; // dormant | intro | active | dying | good
    this.sprite = scene.add
      .image((this.x + 1) * TILE, (this.y + 1) * TILE, this.good ? 'golem-good' : 'golem')
      .setOrigin(0.5, 0.5)
      .setDepth(9);
    if (this.good) this.makeNpc();
    scene.tweens.add({ targets: this.sprite, scaleY: 1.03, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  occupies(x, y) {
    return x >= this.x && x <= this.x + 1 && y >= this.y && y <= this.y + 1;
  }

  // slide back to the spot he started on (the room's far corner, clear of the stone door)
  goHome() {
    if (this.x === this.home.x && this.y === this.home.y) return;
    this.x = this.home.x;
    this.y = this.home.y;
    this.scene.tweens.add({ targets: this.sprite, x: (this.x + 1) * TILE, y: (this.y + 1) * TILE, duration: 700, ease: 'Sine.easeInOut' });
  }

  makeNpc() {
    this.npc = { id: 'granite', dialogue: 'granite', x: this.x, y: this.y, sprite: this.sprite };
  }

  dist() {
    const t = this.scene.tile;
    return Math.max(Math.abs(t.x - (this.x + 0.5)), Math.abs(t.y - (this.y + 0.5)));
  }

  // could the 2x2 body stand with its top-left tile at (x, y)?
  fits(x, y) {
    const s = this.scene;
    for (let ty = y; ty <= y + 1; ty++) {
      for (let tx = x; tx <= x + 1; tx++) {
        if (tx < 0 || ty < 0 || tx >= s.map.width || ty >= s.map.height) return false;
        if (s.obstacles && s.obstacles.getTileAt(tx, ty) !== null) return false;
        if (s.targetAt(tx, ty)) return false;
        if (s.npcs.some((n) => n.x === tx && n.y === ty)) return false;
      }
    }
    return true;
  }

  overlapsPlayer(x, y) {
    const t = this.scene.tile;
    return t.x >= x && t.x <= x + 1 && t.y >= y && t.y <= y + 1;
  }

  update(time) {
    const s = this.scene;
    const gs = s.gameState;
    if (this.state === 'dormant') {
      if (this.dist() <= GOLEM.wakeRadius) this.wake();
      return;
    }
    if (this.state !== 'active' || this.busy) return;
    if (this.dist() > GOLEM.aggroRadius) return;

    if (time >= this.nextAttack) {
      const ph = this.timing();
      this.nextAttack = time + ph.everyMs;
      this.attackCount += 1;
      const every = this.phase === 1 ? GOLEM.rollEvery : GOLEM.rollEvery - 1;
      if (this.attackCount % every === 0) this.roll();
      else this.rockfall(ph);
    }
    if (this.phase === 2 && time >= this.nextSummon) {
      this.nextSummon = time + scaleMs(this.scene.gameState, GOLEM.summonEveryMs, 'attack');
      this.summon();
    }
    void gs;
  }

  wake() {
    const s = this.scene;
    const gs = s.gameState;
    this.state = 'intro';
    s.touchDir = { x: 0, y: 0 };
    const begin = () => {
      this.state = 'active';
      this.nextAttack = s.time.now + 2000;
      this.nextSummon = s.time.now + 7000;
      this.drawBar();
      s.cameras.main.shake(300, 0.006);
      s.showToast('Granite wakes! Pickaxes hurt it more. Hit it when it is dizzy!');
    };
    if (gs.flags.golem_intro_seen) {
      begin();
      return;
    }
    gs.flags.golem_intro_seen = true;
    s.dialogue.open(INTRO, GOLEM.name, begin);
  }

  mark(t, ms) {
    const s = this.scene;
    const r = s.add.rectangle(t.x * TILE + 8, t.y * TILE + 8, 14, 14, 0xff2020, 0.35).setStrokeStyle(1, 0xff6060).setDepth(6);
    s.tweens.add({ targets: r, alpha: 0.8, duration: 200, yoyo: true, repeat: Math.floor(ms / 400) });
    this.live.push(r);
    return r;
  }

  // ROCKFALL: warn, then rocks crash down on the marked tiles
  rockfall(ph) {
    const s = this.scene;
    const p = { ...s.tile };
    const picks = new Map();
    picks.set(`${p.x},${p.y}`, p);
    let guard = 0;
    while (picks.size < 1 + ph.extra && guard++ < 50) {
      const x = p.x + Math.floor(Math.random() * 5) - 2;
      const y = p.y + Math.floor(Math.random() * 5) - 2;
      if (x < 0 || y < 0 || x >= s.map.width || y >= s.map.height) continue;
      if (this.occupies(x, y)) continue;
      if (s.obstacles && s.obstacles.getTileAt(x, y) !== null) continue;
      picks.set(`${x},${y}`, { x, y });
    }
    const tiles = [...picks.values()];
    const marks = tiles.map((t) => this.mark(t, ph.telegraphMs));
    s.tweens.add({ targets: this.sprite, scaleX: 1.06, duration: ph.telegraphMs / 2, yoyo: true });
    s.time.delayedCall(ph.telegraphMs, () => {
      marks.forEach((m) => m.destroy());
      if (this.state !== 'active') return;
      tiles.forEach((t) => {
        const rock = s.add.rectangle(t.x * TILE + 8, t.y * TILE - 8, 10, 10, 0x8a8a96).setStrokeStyle(1, 0x2a2a34).setDepth(8);
        this.live.push(rock);
        s.tweens.add({
          targets: rock,
          y: t.y * TILE + 8,
          duration: 120,
          onComplete: () => s.tweens.add({ targets: rock, alpha: 0, duration: 300, onComplete: () => rock.destroy() }),
        });
      });
      s.cameras.main.shake(90, 0.003);
      if (tiles.some((t) => t.x === s.tile.x && t.y === s.tile.y)) s.hurtPlayer(GOLEM.rockDamage);
    });
  }

  // ROLL: curl up, show the lane, roll across it, then get dizzy
  roll() {
    const s = this.scene;
    const c = { x: this.x + 0.5, y: this.y + 0.5 };
    const dx = s.tile.x + 0.5 - c.x;
    const dy = s.tile.y + 0.5 - c.y;
    const dir = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
    // every position along the lane until something blocks the body
    const steps = [];
    let x = this.x;
    let y = this.y;
    while (this.fits(x + dir.x, y + dir.y)) {
      x += dir.x;
      y += dir.y;
      steps.push({ x, y });
    }
    if (steps.length < 2) {
      this.rockfall(this.timing()); // no room to roll here
      return;
    }
    this.busy = true;
    this.sprite.setTexture('golem-ball');
    const laneTiles = new Map();
    steps.forEach((st) => {
      for (let ty = st.y; ty <= st.y + 1; ty++) for (let tx = st.x; tx <= st.x + 1; tx++) laneTiles.set(`${tx},${ty}`, { x: tx, y: ty });
    });
    const marks = [...laneTiles.values()].filter((t) => !this.occupies(t.x, t.y)).map((t) => this.mark(t, this.rollWarn()));
    s.showToast('Granite curls up! Get out of the red lane!');
    s.tweens.add({ targets: this.sprite, angle: -8, duration: 140, yoyo: true, repeat: 3 });
    s.time.delayedCall(this.rollWarn(), () => {
      marks.forEach((m) => m.destroy());
      if (this.state !== 'active') return;
      // do not end up inside the player: stop short
      let last = steps.length - 1;
      while (last >= 0 && this.overlapsPlayer(steps[last].x, steps[last].y)) last -= 1;
      if (last < 0) {
        this.finishRoll(steps[0] ? { x: this.x, y: this.y } : null);
        return;
      }
      const dest = steps[last];
      this.rolling = true;
      s.cameras.main.shake(GOLEM.rollMs, 0.002);
      s.tweens.add({
        targets: this.sprite,
        x: (dest.x + 1) * TILE,
        y: (dest.y + 1) * TILE,
        angle: dir.x !== 0 || dir.y !== 0 ? 360 * 2 * (dir.x + dir.y > 0 ? 1 : -1) : 0,
        duration: GOLEM.rollMs,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          // wherever the ball is right now, it hurts anyone in the way
          const gx = Math.round(this.sprite.x / TILE - 1);
          const gy = Math.round(this.sprite.y / TILE - 1);
          if (this.overlapsPlayer(gx, gy)) s.hurtPlayer(GOLEM.rockDamage);
        },
        onComplete: () => {
          this.sprite.setAngle(0);
          this.finishRoll(dest);
        },
      });
    });
  }

  finishRoll(dest) {
    const s = this.scene;
    this.rolling = false;
    if (dest) {
      this.x = dest.x;
      this.y = dest.y;
    }
    this.sprite.setPosition((this.x + 1) * TILE, (this.y + 1) * TILE).setTexture('golem');
    if (this.state !== 'active') return;
    // dizzy: open to double damage
    const until = s.time.now + GOLEM.dizzyMs;
    this.dizzyUntil = until;
    this.sprite.setTint(0xffe060);
    s.cameras.main.shake(120, 0.004);
    s.showToast('Granite is dizzy! Hit it now!');
    s.time.delayedCall(GOLEM.dizzyMs, () => {
      if (this.state !== 'active') return;
      this.dizzyUntil = 0;
      if (this.phase === 2) this.sprite.setTint(0xffa0a0);
      else this.sprite.clearTint();
      this.busy = false;
      this.nextAttack = s.time.now + 900;
    });
  }

  summon() {
    const s = this.scene;
    if (s.enemies.countOf('pebble') >= GOLEM.maxPebbles) return;
    const ring = [];
    for (let x = this.x - 1; x <= this.x + 2; x++) for (let y = this.y - 1; y <= this.y + 2; y++) if (!this.occupies(x, y)) ring.push({ x, y });
    ring.sort(() => Math.random() - 0.5);
    const spot = ring.find((r) => s.enemies.free(r.x, r.y, null));
    if (spot) s.enemies.spawnAt('pebble', spot.x, spot.y);
  }

  // the player's sword (damage 2) or pickaxe (damage 4); double while dizzy
  hit(damage) {
    const s = this.scene;
    if (this.state !== 'active') {
      if (this.state === 'dormant') s.showToast('Granite sleeps like a boulder.');
      return;
    }
    if (this.rolling) {
      s.showToast('It is rolling! Wait until it stops.');
      return;
    }
    const dizzy = s.time.now < this.dizzyUntil;
    this.hp = Math.max(0, this.hp - damage * (dizzy ? 2 : 1));
    this.sprite.setTint(0xffffff);
    s.time.delayedCall(90, () => {
      if (!this.sprite || this.state !== 'active') return;
      if (s.time.now < this.dizzyUntil) this.sprite.setTint(0xffe060);
      else if (this.phase === 2) this.sprite.setTint(0xffa0a0);
      else this.sprite.clearTint();
    });
    this.drawBar();
    if (this.hp <= 0) {
      this.defeat();
      return;
    }
    if (this.phase === 1 && this.hp <= this.max / 2) {
      this.phase = 2;
      this.sprite.setTint(0xffa0a0);
      s.cameras.main.shake(400, 0.01);
      s.showToast('Granite roars! Pebbles tumble loose!');
      this.nextSummon = s.time.now + 800;
    }
  }

  toolHit() {
    const s = this.scene;
    const gs = s.gameState;
    if (this.state !== 'active') return false;
    if (s.time.now < (this.nextTool ?? 0)) return true; // still swinging
    this.nextTool = s.time.now + GOLEM.toolCooldownMs;
    const use = useTool(gs, toolDefs, 'pickaxe');
    if (!use.ok) {
      s.showToast(use.msg);
      return true;
    }
    s.updateHud();
    this.hit(GOLEM.pickDamage);
    if (use.broke) s.showToast(use.msg);
    return true;
  }

  defeat() {
    const s = this.scene;
    const gs = s.gameState;
    this.state = 'dying';
    this.busy = true;
    this.live.forEach((o) => o.destroy && o.destroy());
    this.live = [];
    this.clearBar();
    s.enemies.clearAll(); // pebbles and bats fade away
    this.sprite.clearTint().setAngle(0).setTexture('golem-good');
    s.cameras.main.flash(500, 255, 255, 255);
    s.time.delayedCall(700, () => {
      s.dialogue.open(FREED, GOLEM.name, () => {
        gs.flags[GOLEM.flag] = true;
        gs.flags.got_crest = true;
        gs.items['crest-stone'] = (gs.items['crest-stone'] ?? 0) + 1;
        this.good = true;
        this.state = 'good';
        this.goHome(); // he may have rolled to the middle of the room, or in front of the stone door: back to his own spot
        this.makeNpc();
        s.updateHud();
        s.showToast('Received the Crest Stone');
        s.saveQuiet();
      });
    });
  }

  drawBar() {
    this.clearBar();
    const s = this.scene;
    const w = 150;
    this.bar = [
      s.add.rectangle(160, 229, w + 2, 8, 0x000000, 0.8).setStrokeStyle(1, 0xffffff).setScrollFactor(0).setDepth(150),
      s.add.rectangle(160 - w / 2, 229, Math.max(1, (w * this.hp) / this.max), 6, this.phase === 2 ? 0xe05050 : 0x9a9aa8).setOrigin(0, 0.5).setScrollFactor(0).setDepth(151),
      s.add.text(160, 218, GOLEM.name, { fontSize: '8px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setScrollFactor(0).setDepth(151),
    ];
  }

  clearBar() {
    (this.bar ?? []).forEach((o) => o.destroy());
    this.bar = null;
  }
}
