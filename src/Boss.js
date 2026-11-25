import { useTool } from './tools.js';
import toolDefs from './data/tools.json';

const TILE = 16;

// Gnarl, the corrupted treant (the forest boss). A 2x2-tile creature.
//   dormant -> wakes when you come close with the sword (a short cutscene the first time)
//   phase 1: slams roots onto your tile and a couple of tiles next to it (tiles flash red first)
//   phase 2 (half health): slams more tiles, faster, and calls sapling helpers
//   defeated: the darkness leaves it. It becomes a friendly NPC and gives you the Heartwood Lantern.
// Weak to the axe (Space on it with a working axe hits for 4 and wears the axe down).
export const BOSS = {
  name: 'Gnarl',
  hp: 30,
  swordNote: 4, // axe damage
  wakeRadius: 6,
  aggroRadius: 11,
  phase1: { everyMs: 2800, telegraphMs: 1100, extra: 2 },
  phase2: { everyMs: 1800, telegraphMs: 800, extra: 4 },
  summonEveryMs: 9000,
  maxSaplings: 2,
  rootDamage: 2,
};

const INTRO = [
  'Hehehe... a little ninja, wandering into my forest.',
  'This old tree was so proud of its roots. All it took was one whisper.',
  'Go on, Gnarl. Show our visitor what happens to trespassers.',
];
const FREED = [
  '...Ohh. My head. My roots. Where... where did the shadow go?',
  'It crept into me while I slept, and I could not fight it. You freed me, little ninja.',
  'Please, take this. Heartwood from my own branches, lit by the sun itself. It will never need oil.',
  'But be careful. What I felt was only a sliver of something much bigger. It is stirring in the deep cave.',
];

export default class Boss {
  constructor(scene, obj) {
    this.scene = scene;
    this.x = Math.floor(obj.x / TILE);
    this.y = Math.floor(obj.y / TILE);
    this.max = BOSS.hp;
    this.hp = this.max;
    this.phase = 1;
    this.nextAttack = 0;
    this.nextSummon = 0;
    this.live = []; // things on screen we must clean up (telegraphs, roots)
    const gs = scene.gameState;
    this.good = !!gs.flags.treant_defeated;
    this.state = this.good ? 'good' : 'dormant'; // dormant | intro | active | dying | good
    this.sprite = scene.add.image(this.x * TILE, this.y * TILE, this.good ? 'treant-good' : 'treant-boss').setOrigin(0, 0).setDepth(9);
    if (this.good) this.makeNpc();
    scene.tweens.add({ targets: this.sprite, scaleY: 1.03, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.sprite.setOrigin(0, 1).setPosition(this.x * TILE, (this.y + 2) * TILE); // sway from the roots
  }

  occupies(x, y) {
    return x >= this.x && x <= this.x + 1 && y >= this.y && y <= this.y + 1;
  }

  makeNpc() {
    this.npc = { id: 'treant', dialogue: 'treant', x: this.x, y: this.y, sprite: this.sprite };
  }

  center() {
    return { x: this.x + 0.5, y: this.y + 0.5 };
  }

  dist() {
    const c = this.center();
    const t = this.scene.tile;
    return Math.max(Math.abs(t.x - c.x), Math.abs(t.y - c.y));
  }

  update(time) {
    const s = this.scene;
    const gs = s.gameState;
    if (this.state === 'dormant') {
      // only wakes once you carry the sword (the evil starts creeping in after that)
      if (gs.flags.got_sword && this.dist() <= BOSS.wakeRadius) this.wake();
      return;
    }
    if (this.state !== 'active') return;
    if (this.dist() > BOSS.aggroRadius) return; // you ran away: it just stands there

    const ph = this.phase === 1 ? BOSS.phase1 : BOSS.phase2;
    if (time >= this.nextAttack) {
      this.nextAttack = time + ph.everyMs;
      this.slam(ph);
    }
    if (this.phase === 2 && time >= this.nextSummon) {
      this.nextSummon = time + BOSS.summonEveryMs;
      this.summon();
    }
  }

  wake() {
    const s = this.scene;
    const gs = s.gameState;
    this.state = 'intro';
    s.touchDir = { x: 0, y: 0 };
    const begin = () => {
      this.state = 'active';
      this.nextAttack = s.time.now + 1800;
      this.nextSummon = s.time.now + 6000;
      this.drawBar();
      s.cameras.main.shake(300, 0.006);
      s.showToast('Gnarl awakens! Dodge the red tiles. Axes hurt it more!');
    };
    if (gs.flags.treant_intro_seen) {
      begin();
      return;
    }
    gs.flags.treant_intro_seen = true;
    s.dialogue.open(INTRO, '???', begin);
  }

  // roots burst out of the ground: warn first, then hit whoever is still standing there
  slam(ph) {
    const s = this.scene;
    const p = { ...s.tile };
    const picks = new Map();
    picks.set(`${p.x},${p.y}`, p);
    let guard = 0;
    while (picks.size < 1 + ph.extra && guard++ < 40) {
      const x = p.x + Math.floor(Math.random() * 5) - 2;
      const y = p.y + Math.floor(Math.random() * 5) - 2;
      if (x < 0 || y < 0 || x >= s.map.width || y >= s.map.height) continue;
      if (this.occupies(x, y)) continue;
      if (s.obstacles && s.obstacles.getTileAt(x, y) !== null) continue;
      picks.set(`${x},${y}`, { x, y });
    }
    const tiles = [...picks.values()];
    const marks = tiles.map((t) => {
      const r = s.add.rectangle(t.x * TILE + 8, t.y * TILE + 8, 14, 14, 0xff2020, 0.35).setStrokeStyle(1, 0xff6060).setDepth(6);
      s.tweens.add({ targets: r, alpha: 0.8, duration: 200, yoyo: true, repeat: Math.floor(ph.telegraphMs / 400) });
      this.live.push(r);
      return r;
    });
    s.tweens.add({ targets: this.sprite, scaleX: 1.06, duration: ph.telegraphMs / 2, yoyo: true });
    s.time.delayedCall(ph.telegraphMs, () => {
      marks.forEach((m) => m.destroy());
      if (this.state !== 'active') return;
      tiles.forEach((t) => {
        const root = s.add.triangle(t.x * TILE + 8, t.y * TILE + 9, 0, 14, 7, 0, 14, 14, 0x6b4a2a).setStrokeStyle(1, 0x2a1a10).setDepth(8);
        this.live.push(root);
        s.tweens.add({ targets: root, alpha: 0, delay: 200, duration: 250, onComplete: () => root.destroy() });
      });
      s.cameras.main.shake(90, 0.003);
      if (tiles.some((t) => t.x === s.tile.x && t.y === s.tile.y)) s.hurtPlayer(BOSS.rootDamage);
    });
  }

  summon() {
    const s = this.scene;
    if (s.enemies.countOf('sapling') >= BOSS.maxSaplings) return;
    const ring = [];
    for (let x = this.x - 1; x <= this.x + 2; x++) for (let y = this.y - 1; y <= this.y + 2; y++) if (!this.occupies(x, y)) ring.push({ x, y });
    ring.sort(() => Math.random() - 0.5);
    const spot = ring.find((r) => s.enemies.free(r.x, r.y, null));
    if (spot) s.enemies.spawnAt('sapling', spot.x, spot.y);
  }

  // the player's sword (damage 2) or axe (damage 4)
  hit(damage) {
    const s = this.scene;
    if (this.state !== 'active') {
      if (this.state === 'dormant') s.showToast('The old tree does not stir.');
      return;
    }
    this.hp = Math.max(0, this.hp - damage);
    this.sprite.setTint(0xffffff);
    s.time.delayedCall(90, () => {
      if (!this.sprite || this.state !== 'active') return;
      if (this.phase === 2) this.sprite.setTint(0xffa0a0);
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
      s.showToast('Gnarl roars! Saplings spring up!');
      this.nextSummon = s.time.now + 800;
    }
  }

  axeHit() {
    const s = this.scene;
    const gs = s.gameState;
    if (this.state !== 'active') return false;
    const use = useTool(gs, toolDefs, 'axe');
    if (!use.ok) {
      s.showToast(use.msg);
      return true;
    }
    s.updateHud();
    this.hit(BOSS.swordNote);
    if (use.broke) s.showToast(use.msg);
    return true;
  }

  defeat() {
    const s = this.scene;
    const gs = s.gameState;
    this.state = 'dying';
    this.live.forEach((o) => o.destroy && o.destroy());
    this.live = [];
    this.clearBar();
    s.enemies.clearAll(); // sprouts and saplings fade away
    this.sprite.clearTint();
    s.cameras.main.flash(500, 255, 255, 255);
    this.sprite.setTexture('treant-good');
    s.targets.forEach((t) => t.sprite.clearTint());
    s.time.delayedCall(700, () => {
      s.dialogue.open(FREED, BOSS.name, () => {
        gs.flags.treant_defeated = true;
        gs.items.lantern = 1;
        this.good = true;
        this.state = 'good';
        this.makeNpc();
        s.updateHud();
        s.showToast('Received the Heartwood Lantern');
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
      s.add.rectangle(160 - w / 2, 229, Math.max(1, (w * this.hp) / this.max), 6, this.phase === 2 ? 0xe05050 : 0x9a60c0).setOrigin(0, 0.5).setScrollFactor(0).setDepth(151),
      s.add.text(160, 218, BOSS.name, { fontSize: '8px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setScrollFactor(0).setDepth(151),
    ];
  }

  clearBar() {
    (this.bar ?? []).forEach((o) => o.destroy());
    this.bar = null;
  }
}
