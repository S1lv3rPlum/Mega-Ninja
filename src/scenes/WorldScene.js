import Phaser from 'phaser';
import { SaveManager } from '../SaveManager.js';

const TILE = 16;
const MOVE_MS = 140; // time to slide one tile

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  preload() {
    this.load.image('tiles', 'assets/tilesets/tiles.png');
    this.load.tilemapTiledJSON('town', 'assets/maps/town.json');
    this.load.image('player', 'assets/sprites/player.png');
  }

  create() {
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
    this.tile = { ...this.gameState.tile };

    // --- Player (grid-based: tracks a tile position, slides between tiles) ---
    this.player = this.add
      .image(this.tile.x * TILE, this.tile.y * TILE, 'player')
      .setOrigin(0, 0);
    this.moving = false;

    // --- Camera follows the player and stays inside the map ---
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.player, true);

    // --- Input: arrows + WASD ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // --- Save (P) ---
    this.toast = this.add
      .text(160, 8, '', { fontSize: '10px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 4, y: 2 } })
      .setOrigin(0.5, 0)
      .setScrollFactor(0) // stays fixed on screen
      .setDepth(100);
    this.input.keyboard.on('keydown-P', () => this.saveGame());
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
    if (this.moving) return;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) this.tryMove(dx, dy);
  }

  tryMove(dx, dy) {
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
    // any tile painted on the "obstacles" layer blocks movement
    return this.obstacles.getTileAt(x, y) === null;
  }
}
