import Phaser from 'phaser';
import { SaveManager } from '../SaveManager.js';
import DialogueBox from '../DialogueBox.js';
import dialogueData from '../data/dialogue.json';

const TILE = 16;
const MOVE_MS = 140; // time to slide one tile

// NPCs on this map. 'dialogue' is a key in src/data/dialogue.json.
// (Later these can come from an object layer in Tiled.)
const NPCS = [{ id: 'elder', x: 17, y: 10, texture: 'npc', dialogue: 'elder' }];

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  preload() {
    this.load.image('tiles', 'assets/tilesets/tiles.png');
    this.load.tilemapTiledJSON('town', 'assets/maps/town.json');
    this.load.image('player', 'assets/sprites/player.png');
    this.load.image('npc', 'assets/sprites/npc.png');
    this.load.image('dialogue-box', 'assets/ui/dialogue-box.png');
  }

  create() {
    this.cameras.main.fadeIn(300);

    // --- Map (made in Tiled; layer names must match the JSON) ---
    this.map = this.make.tilemap({ key: 'town' });
    const tileset = this.map.addTilesetImage('tiles', 'tiles');
    this.map.createLayer('ground', tileset);
    this.obstacles = this.map.createLayer('obstacles', tileset);

    // --- Game state (loaded from a save if one exists) ---
    const saved = SaveManager.load();
    this.gameState = saved ?? {
      tile: { x: 15, y: 10 },
      hp: 20,
      gold: 0,
      flags: {},
    };
    if (!this.gameState.flags) this.gameState.flags = {};
    this.tile = { ...this.gameState.tile };
    this.facing = { x: 0, y: 1 }; // which way the player is looking (down)

    // --- NPCs ---
    this.npcs = NPCS.map((def) => ({
      ...def,
      sprite: this.add.image(def.x * TILE, def.y * TILE, def.texture).setOrigin(0, 0),
    }));

    // --- Player (grid-based: tracks a tile position, slides between tiles) ---
    this.player = this.add
      .image(this.tile.x * TILE, this.tile.y * TILE, 'player')
      .setOrigin(0, 0);
    this.moving = false;

    // --- Camera follows the player and stays inside the map ---
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.player, true);

    // --- Dialogue ---
    this.dialogue = new DialogueBox(this);

    // --- Input: arrows + WASD to move; Space / Enter / Z to talk; P to save ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    const onActionKey = (event) => {
      if (!event.repeat) this.onAction();
    };
    this.input.keyboard.on('keydown-SPACE', onActionKey);
    this.input.keyboard.on('keydown-ENTER', onActionKey);
    this.input.keyboard.on('keydown-Z', onActionKey);

    // --- Save (P) ---
    this.toast = this.add
      .text(160, 8, '', { fontSize: '10px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 4, y: 2 } })
      .setOrigin(0.5, 0)
      .setScrollFactor(0) // stays fixed on screen
      .setDepth(100);
    this.input.keyboard.on('keydown-P', () => this.saveGame());

    // --- Touch controls (phones/tablets) ---
    this.touchDir = { x: 0, y: 0 };
    this.createTouchControls();
  }

  createTouchControls() {
    // only show on touch devices
    if (!this.sys.game.device.input.touch) return;

    const make = (x, y, label, onDown) => {
      const b = this.add
        .text(x, y, label, {
          fontSize: '16px', color: '#ffffff', backgroundColor: '#000000aa',
          fixedWidth: 28, fixedHeight: 28, align: 'center',
          padding: { top: 6 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0) // stay fixed on screen
        .setDepth(100)
        .setAlpha(0.7)
        .setInteractive();
      b.on('pointerdown', onDown);
      b.on('pointerout', () => (this.touchDir = { x: 0, y: 0 }));
      return b;
    };

    make(44, 164, '▲', () => (this.touchDir = { x: 0, y: -1 }));
    make(16, 192, '◀', () => (this.touchDir = { x: -1, y: 0 }));
    make(72, 192, '▶', () => (this.touchDir = { x: 1, y: 0 }));
    make(44, 220, '▼', () => (this.touchDir = { x: 0, y: 1 }));

    // lifting any finger stops movement
    this.input.on('pointerup', () => (this.touchDir = { x: 0, y: 0 }));

    // A button = talk / interact (same as Space on a keyboard)
    make(292, 220, 'A', () => this.onAction());

    // save button (replaces the P key on phones)
    const save = make(292, 16, 'SAVE', () => this.saveGame());
    save.setStyle({ fixedWidth: 44, fontSize: '10px' });
  }

  // Space / Enter / Z / the A button
  onAction() {
    if (this.dialogue.isOpen) {
      this.dialogue.advance();
      return;
    }
    if (this.moving) return;

    const tx = this.tile.x + this.facing.x;
    const ty = this.tile.y + this.facing.y;
    const npc = this.npcAt(tx, ty);
    if (npc) this.talkTo(npc);
  }

  npcAt(x, y) {
    return this.npcs.find((n) => n.x === x && n.y === y) ?? null;
  }

  talkTo(npc) {
    const data = dialogueData[npc.dialogue];
    if (!data) return;

    const flag = `met_${npc.id}`;
    const firstTime = !this.gameState.flags[flag];
    this.gameState.flags[flag] = true;

    this.touchDir = { x: 0, y: 0 };
    this.dialogue.open(firstTime ? data.lines : data.repeatLines, data.name);
  }

  saveGame() {
    this.gameState.tile = { ...this.tile };
    const ok = SaveManager.save(this.gameState);
    this.showToast(ok ? 'Game saved' : 'Save failed');
  }

  showToast(msg) {
    this.toast.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1200, duration: 400 });
  }

  update() {
    if (this.moving || this.dialogue.isOpen) return;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1;

    // fall back to the on-screen buttons if no key is pressed
    if (dx === 0 && dy === 0) {
      dx = this.touchDir.x;
      dy = this.touchDir.y;
    }

    if (dx !== 0 || dy !== 0) this.tryMove(dx, dy);
  }

  tryMove(dx, dy) {
    this.facing = { x: dx, y: dy }; // turn to face that way, even if blocked

    const nx = this.tile.x + dx;
    const ny = this.tile.y + dy;
    if (!this.canWalk(nx, ny)) return;

    this.moving = true;
    this.tile = { x: nx, y: ny };
    this.tweens.add({
      targets: this.player,
      x: nx * TILE,
      y: ny * TILE,
      duration: MOVE_MS,
      onComplete: () => {
        this.moving = false;
      },
    });
  }

  canWalk(x, y) {
    // stay inside the map
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return false;
    // NPCs block the way
    if (this.npcAt(x, y)) return false;
    // any tile painted on the "obstacles" layer blocks movement
    return this.obstacles.getTileAt(x, y) === null;
  }
}
