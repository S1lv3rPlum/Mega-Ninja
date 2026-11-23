import Phaser from 'phaser';
import { SaveManager } from '../SaveManager.js';
import DialogueBox from '../DialogueBox.js';
import dialogueData from '../data/dialogue.json';
import questsData from '../data/quests.json';
import { MAX_STAGE, ensureState, getPlot, plant, water, harvest, fillCan, tick } from '../farming.js';
import { talkToQuestGiver } from '../quests.js';

const TILE = 16;
const MOVE_MS = 140; // time to slide one tile

const START_MAP = 'town';
const START_TILE = { x: 15, y: 10 };

// To add a map: save it as public/assets/maps/<name>.json and add its name here.
const MAPS = ['town', 'farm'];
// To add a tileset: save it as public/assets/tilesets/<name>.png and add its name here.
// (The name must match the tileset's name inside Tiled.)
const TILESETS = ['tiles', 'farm-tiles'];

// Tiled stores custom properties as a list of {name, value}; turn that into a plain object
const readProps = (p) =>
  Array.isArray(p) ? Object.fromEntries(p.map((o) => [o.name, o.value])) : (p ?? {});

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  preload() {
    MAPS.forEach((m) => this.load.tilemapTiledJSON(m, `assets/maps/${m}.json`));
    TILESETS.forEach((t) => this.load.image(t, `assets/tilesets/${t}.png`));
    this.load.image('player', 'assets/sprites/player.png');
    this.load.image('npc', 'assets/sprites/npc.png');
    this.load.image('dialogue-box', 'assets/ui/dialogue-box.png');
  }

  create() {
    this.cameras.main.fadeIn(300);
    this.moving = false;
    this.transitioning = false;

    // --- Game state: kept in memory between maps, loaded from the save on first entry ---
    let gs = this.registry.get('gameState');
    if (!gs) {
      const saved = SaveManager.load() ?? {};
      gs = { map: START_MAP, tile: { ...START_TILE }, hp: 20, gold: 0, flags: {}, ...saved };
      this.registry.set('gameState', gs);
    }
    if (!MAPS.includes(gs.map)) {
      gs.map = START_MAP;
      gs.tile = { ...START_TILE };
    }
    ensureState(gs);
    this.gameState = gs;
    this.tile = { ...gs.tile };
    this.facing = { x: 0, y: 1 }; // which way the player is looking (down)

    // --- Map (made in Tiled): every tile layer is drawn; the one named "obstacles" blocks movement ---
    this.map = this.make.tilemap({ key: gs.map });
    const tilesets = TILESETS.filter((n) => this.map.tilesets.some((t) => t.name === n)).map((n) =>
      this.map.addTilesetImage(n, n)
    );
    this.obstacles = null;
    this.crops = null;
    this.map.layers.forEach((l) => {
      const layer = this.map.createLayer(l.name, tilesets);
      if (l.name === 'obstacles') this.obstacles = layer;
      if (l.name === 'crops') this.crops = layer;
    });
    // gid of the first tile in farm-tiles.png: dirt, sown, sprouts, young, ready, then pump, fence, hay
    this.farmGid = this.map.tilesets.find((t) => t.name === 'farm-tiles')?.firstgid ?? null;

    // Object layers ("doors", "npcs") are read straight from the Tiled file
    const raw = this.cache.tilemap.get(gs.map).data;
    const objects = (name) =>
      raw.layers.find((l) => l.type === 'objectgroup' && l.name === name)?.objects ?? [];

    // --- Doors: stepping on one takes you to another map (or another spot on this one) ---
    this.doors = objects('doors')
      .map((o) => {
        const p = readProps(o.properties);
        const x0 = Math.floor(o.x / TILE);
        const y0 = Math.floor(o.y / TILE);
        return {
          x0,
          y0,
          x1: x0 + Math.max(1, Math.round((o.width || TILE) / TILE)) - 1,
          y1: y0 + Math.max(1, Math.round((o.height || TILE) / TILE)) - 1,
          toMap: p.toMap ?? gs.map,
          toX: p.toX,
          toY: p.toY,
        };
      })
      .filter((d) => {
        const ok = MAPS.includes(d.toMap) && Number.isInteger(d.toX) && Number.isInteger(d.toY);
        if (!ok) console.warn('Skipping door with bad toMap/toX/toY:', d);
        return ok;
      });

    // --- NPCs ---
    this.npcs = objects('npcs').map((o) => {
      const p = readProps(o.properties);
      const x = Math.floor(o.x / TILE);
      const y = Math.floor(o.y / TILE);
      const id = p.id ?? o.name;
      return {
        id,
        dialogue: p.dialogue ?? id,
        x,
        y,
        sprite: this.add.image(x * TILE, y * TILE, p.texture ?? 'npc').setOrigin(0, 0),
      };
    });

    // --- Player (grid-based: tracks a tile position, slides between tiles) ---
    this.player = this.add
      .image(this.tile.x * TILE, this.tile.y * TILE, 'player')
      .setOrigin(0, 0);

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
      .text(160, 30, '', { fontSize: '10px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 4, y: 2 } })
      .setOrigin(0.5, 0)
      .setScrollFactor(0) // stays fixed on screen
      .setDepth(100);
    this.input.keyboard.on('keydown-P', () => this.saveGame());

    // --- Touch controls (phones/tablets) ---
    this.touchDir = { x: 0, y: 0 };
    this.createTouchControls();

    // --- HUD: gold, water, seeds, wheat ---
    this.hud = this.add
      .text(4, 4, '', { fontSize: '8px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 3, y: 2 }, lineSpacing: 1 })
      .setScrollFactor(0)
      .setDepth(100);
    this.updateHud();

    // --- Farm plots: show saved growth, catch up on time spent away, then keep growing ---
    if (this.crops && this.farmGid !== null) {
      this.crops.filterTiles((t) => t.index > 0).forEach((t) => {
        this.setPlotVisual(t.x, t.y, getPlot(gs, gs.map, t.x, t.y).stage);
      });
    }
    this.tickPlots();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickPlots() });
  }

  updateHud() {
    const gs = this.gameState;
    this.hud.setText(
      `Gold ${gs.gold}  Water ${gs.can.water}/${gs.can.max}\nSeeds ${gs.items.seeds}  Wheat ${gs.items.wheat}`
    );
  }

  setPlotVisual(x, y, stage) {
    if (this.crops && this.farmGid !== null) this.crops.putTileAt(this.farmGid + stage, x, y);
  }

  tickPlots() {
    const changed = tick(this.gameState, this.gameState.map, Date.now());
    changed.forEach((c) => this.setPlotVisual(c.x, c.y, c.stage));
    if (changed.some((c) => c.stage >= MAX_STAGE)) this.showToast('Something is ready to harvest!');
  }

  isPlot(x, y) {
    return !!this.crops && this.crops.getTileAt(x, y) !== null;
  }

  isPump(x, y) {
    if (!this.obstacles || this.farmGid === null) return false;
    const tile = this.obstacles.getTileAt(x, y);
    return tile !== null && tile.index === this.farmGid + 5; // 5 = pump in farm-tiles.png
  }

  farmAt(x, y) {
    const gs = this.gameState;
    const map = gs.map;
    const stage = getPlot(gs, map, x, y).stage;
    const result =
      stage === 0 ? plant(gs, map, x, y) : stage >= MAX_STAGE ? harvest(gs, map, x, y) : water(gs, map, x, y);
    if (result.ok) this.setPlotVisual(x, y, getPlot(gs, map, x, y).stage);
    this.showToast(result.msg);
    this.updateHud();
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
    if (this.moving || this.transitioning) return;

    const tx = this.tile.x + this.facing.x;
    const ty = this.tile.y + this.facing.y;
    const npc = this.npcAt(tx, ty);
    if (npc) {
      this.talkTo(npc);
    } else if (this.isPump(tx, ty)) {
      this.showToast(fillCan(this.gameState).msg);
      this.updateHud();
    } else if (this.isPlot(tx, ty)) {
      this.farmAt(tx, ty);
    }
  }

  npcAt(x, y) {
    return this.npcs.find((n) => n.x === x && n.y === y) ?? null;
  }

  talkTo(npc) {
    const data = dialogueData[npc.dialogue];
    if (!data) return;

    this.touchDir = { x: 0, y: 0 };

    // Quest givers (listed in quests.json) build their lines from the current request
    const quest = questsData[npc.dialogue];
    if (quest) {
      const { lines, afterClose } = talkToQuestGiver(this.gameState, npc.id, data, quest);
      this.dialogue.open(lines, data.name, () => {
        const msg = afterClose();
        if (msg) this.showToast(msg);
        this.updateHud();
      });
      return;
    }

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
    this.tweens.killTweensOf(this.toast);
    this.toast.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1200, duration: 400 });
  }

  update() {
    if (this.moving || this.transitioning || this.dialogue.isOpen) return;

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
        this.checkDoor();
      },
    });
  }

  checkDoor() {
    const { x, y } = this.tile;
    const door = this.doors.find((d) => x >= d.x0 && x <= d.x1 && y >= d.y0 && y <= d.y1);
    if (door) this.useDoor(door);
  }

  useDoor(door) {
    this.transitioning = true;
    this.touchDir = { x: 0, y: 0 };
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.gameState.map = door.toMap;
      this.gameState.tile = { x: door.toX, y: door.toY };
      this.scene.restart(); // create() builds the new map from gameState
    });
  }

  canWalk(x, y) {
    // stay inside the map
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return false;
    // NPCs block the way
    if (this.npcAt(x, y)) return false;
    // any tile painted on the "obstacles" layer blocks movement
    return !this.obstacles || this.obstacles.getTileAt(x, y) === null;
  }
}
