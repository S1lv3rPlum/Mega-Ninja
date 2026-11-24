import Phaser from 'phaser';
import { SaveManager } from '../SaveManager.js';
import DialogueBox from '../DialogueBox.js';
import dialogueData from '../data/dialogue.json';
import questsData from '../data/quests.json';
import { MAX_STAGE, ensureState, getPlot, plant, water, harvest, fillCan, tick, eatPlot } from '../farming.js';
import { talkToQuestGiver } from '../quests.js';
import { createRabbit, tickRabbit, catchRabbit, throwRabbit, canCatch, rabbitOnMap } from '../rabbit.js';
import ChoiceMenu from '../ChoiceMenu.js';
import toolDefs from '../data/tools.json';
import { ensureToolState, giveTool, hitTarget, toolLabel, targetReady, isCleared } from '../tools.js';
import shopData from '../data/shop.json';
import { talkToShopkeeper } from '../shop.js';
import InventoryScreen, { iconKey } from '../InventoryScreen.js';
import { lowTools } from '../inventory.js';

const TILE = 16;
const MOVE_MS = 140; // time to slide one tile

const START_MAP = 'town';
const START_TILE = { x: 15, y: 10 };

// To add a map: save it as public/assets/maps/<name>.json and add its name here.
const MAPS = ['town', 'farm', 'forest'];
// To add a tileset: save it as public/assets/tilesets/<name>.png and add its name here.
// (The name must match the tileset's name inside Tiled.)
const TILESETS = ['tiles', 'farm-tiles', 'stall-tiles'];

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
    // walking sheet: 3 frames across (step, stand, step) x 4 rows (down, left, right, up), 16x24 each
    this.load.spritesheet('player', 'assets/sprites/player-walk.png', { frameWidth: 16, frameHeight: 24 });
    this.load.image('npc', 'assets/sprites/npc.png');
    this.load.image('rabbit', 'assets/sprites/rabbit.png');
    this.load.image('shovel', 'assets/items/shovel.png');
    this.load.image('dirt-pile', 'assets/sprites/dirt-pile.png'); // textures for "targets" objects go here
    this.load.image('tree', 'assets/sprites/tree.png');
    this.load.image('stump', 'assets/sprites/stump.png');
    this.load.image('lumberjack', 'assets/sprites/lumberjack.png'); // textures for NPCs go here
    this.load.image('shopkeeper', 'assets/sprites/shopkeeper.png');
    this.load.image('dialogue-box', 'assets/ui/dialogue-box.png');
  }

  create() {
    this.cameras.main.fadeIn(300);
    this.moving = false;
    this.transitioning = false;
    this.plotMarks = {}; // little icons drawn on plots: thirsty / watered / ready
    this.makeMarkTextures();
    this.dropSprites = {}; // items lying on the ground
    this.rabbitSprite = null;

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
    ensureToolState(gs);
    // older saves kept the shovel as a plain item: turn it into a tool
    if (gs.items.shovel > 0) {
      if (!gs.tools.shovel) giveTool(gs, toolDefs, 'shovel');
      gs.items.shovel = 0;
    }
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
        shop: p.shop, // a key in data/shop.json makes this NPC a shopkeeper
        x,
        y,
        sprite: this.add.image(x * TILE, y * TILE, p.texture ?? 'npc').setOrigin(0, 0).setDepth(10),
      };
    });

    // --- Targets: things you work on with a tool (dirt piles, trees, rocks) ---
    // A target with "respawnMs" (a tree) turns into a stump when cleared and grows back later.
    this.targets = objects('targets')
      .map((o) => {
        const p = readProps(o.properties);
        const id = p.id ?? o.name ?? `${o.x},${o.y}`;
        const respawnMs = p.respawnMs ?? 0;
        let active = true;
        if (isCleared(gs, gs.map, id)) {
          if (!respawnMs) return null; // cleared for good in an earlier visit
          active = targetReady(gs, gs.map, id); // grown back while you were away?
        }
        const x = Math.floor(o.x / TILE);
        const y = Math.floor(o.y / TILE);
        const texture = p.texture ?? 'dirt-pile';
        const stump = p.stump ?? 'stump';
        return {
          id,
          x,
          y,
          tool: p.tool ?? 'shovel',
          hits: p.hits ?? 3,
          flag: p.flag,
          drop: p.drop,
          dropAmount: p.dropAmount ?? 1,
          hint: p.hint,
          clearedMsg: p.clearedMsg ?? 'Cleared!',
          respawnMs,
          texture,
          stump,
          active,
          sprite: this.add.image(x * TILE, y * TILE, active ? texture : stump).setOrigin(0, 0).setDepth(active ? 4 : 3),
        };
      })
      .filter(Boolean);

    // --- Player (grid-based: tracks a tile position, slides between tiles) ---
    // The sprite is taller than a tile (16x24), so its feet sit on the bottom edge of its tile.
    this.player = this.add
      .sprite(this.tile.x * TILE, (this.tile.y + 1) * TILE, 'player', 0)
      .setOrigin(0, 1)
      .setDepth(10);
    ['down', 'left', 'right', 'up'].forEach((dir, row) => {
      if (this.anims.exists(`walk-${dir}`)) return;
      this.anims.create({
        key: `walk-${dir}`,
        frames: this.anims.generateFrameNumbers('player', { frames: [row * 3 + 1, row * 3, row * 3 + 1, row * 3 + 2] }),
        frameRate: 8,
        repeat: -1,
      });
    });
    this.faceFrame(this.facing);

    // --- Camera follows the player and stays inside the map ---
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.player, true);

    // --- Dialogue ---
    this.dialogue = new DialogueBox(this);
    this.choice = new ChoiceMenu(this);
    this.bag = new InventoryScreen(this);

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
      .text(160, 42, '', { fontSize: '10px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 4, y: 2 } })
      .setOrigin(0.5, 0)
      .setScrollFactor(0) // stays fixed on screen
      .setDepth(100);
    this.input.keyboard.on('keydown-P', () => this.saveGame());
    // F = pick up / throw
    this.input.keyboard.on('keydown-F', (event) => {
      if (!event.repeat) this.onGrab();
    });
    // choice menu: up/down (or W/S) to move, Esc / X to cancel (Space / Enter / Z select)
    const nav = (dir) => (event) => {
      if (this.choice.isOpen && !event.repeat) this.choice.move(dir);
    };
    this.input.keyboard.on('keydown-UP', nav(-1));
    this.input.keyboard.on('keydown-W', nav(-1));
    this.input.keyboard.on('keydown-DOWN', nav(1));
    this.input.keyboard.on('keydown-S', nav(1));
    const cancelKey = () => {
      if (this.bag.isOpen) this.bag.close();
      else this.choice.cancel();
    };
    this.input.keyboard.on('keydown-ESC', cancelKey);
    this.input.keyboard.on('keydown-X', cancelKey);
    // I / Tab = open or close the bag; arrows move around in it
    const toggleBag = (event) => {
      if (event.repeat) return;
      event.preventDefault?.();
      this.toggleBag();
    };
    this.input.keyboard.on('keydown-I', toggleBag);
    this.input.keyboard.on('keydown-TAB', toggleBag);
    const bagNav = (dx, dy) => (event) => {
      if (this.bag.isOpen && !event.repeat) this.bag.move(dx, dy);
    };
    this.input.keyboard.on('keydown-LEFT', bagNav(-1, 0));
    this.input.keyboard.on('keydown-A', bagNav(-1, 0));
    this.input.keyboard.on('keydown-RIGHT', bagNav(1, 0));
    this.input.keyboard.on('keydown-D', bagNav(1, 0));
    this.input.keyboard.on('keydown-UP', bagNav(0, -1));
    this.input.keyboard.on('keydown-W', bagNav(0, -1));
    this.input.keyboard.on('keydown-DOWN', bagNav(0, 1));
    this.input.keyboard.on('keydown-S', bagNav(0, 1));

    // --- Touch controls (phones/tablets) ---
    this.touchDir = { x: 0, y: 0 };
    this.createTouchControls();

    // --- HUD: gold, water, seeds, wheat ---
    this.hud = this.add
      .text(4, 4, '', { fontSize: '8px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 3, y: 2 }, lineSpacing: 1 })
      .setScrollFactor(0)
      .setDepth(100);
    // little coin icon in front of the gold number (the Coin Pouch)
    this.hudCoin = this.add.image(12, 9, iconKey(this, 'coin', '#f2c230')).setScrollFactor(0).setDepth(101);
    this.updateHud();

    // --- Farm plots: show saved growth, catch up on time spent away, then keep growing ---
    if (this.crops && this.farmGid !== null) {
      this.crops.filterTiles((t) => t.index > 0).forEach((t) => {
        this.refreshPlot(t.x, t.y);
      });
    }
    this.tickPlots();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => { this.tickPlots(); this.tickTargets(); } });

    // --- Rabbit: a garden pest on any map that has plots (starts once you've met the farmer) ---
    this.rabbit = null;
    this.plotCells = [];
    if (this.crops) {
      this.plotCells = this.crops.filterTiles((t) => t.index > 0).map((t) => ({ x: t.x, y: t.y }));
      if (this.plotCells.length > 0) this.rabbit = createRabbit();
    }

    // --- Items lying on the ground (like the shovel) ---
    (gs.drops[gs.map] ?? []).forEach((d) => this.showDrop(d));
  }

  updateHud() {
    const gs = this.gameState;
    // seeds, wheat, wood, stone and tools live in the bag (I key / BAG button); the HUD keeps the essentials
    const lines = [`   ${gs.gold}`, `Water ${gs.can.water}/${gs.can.max}`];
    const worn = lowTools(gs, toolDefs).map((t) => (t.dur <= 0 ? `${t.name} broken!` : `${t.name} ${t.dur}/${t.max}!`));
    if (worn.length > 0) lines.push(worn.join('  '));
    this.hud.setText(lines.join('\n'));
  }

  toggleBag() {
    if (this.bag.isOpen) {
      this.bag.close();
      return;
    }
    if (this.dialogue.isOpen || this.choice.isOpen || this.moving || this.transitioning) return;
    this.touchDir = { x: 0, y: 0 };
    this.bag.open();
  }

  // Draws the plot's tile and its status icon:
  //   blue drop      = growing but thirsty, needs water
  //   darker, wet    = watered, growing
  //   yellow sparkle = ready to harvest
  refreshPlot(x, y) {
    if (!this.crops || this.farmGid === null) return;
    const plot = getPlot(this.gameState, this.gameState.map, x, y);
    this.crops.putTileAt(this.farmGid + plot.stage, x, y);

    const k = `${x},${y}`;
    if (this.plotMarks[k]) {
      this.plotMarks[k].destroy();
      delete this.plotMarks[k];
    }
    let texture = null;
    if (plot.stage >= MAX_STAGE) texture = 'mark-ready';
    else if (plot.stage >= 1) texture = plot.growsAt === null ? 'mark-dry' : 'mark-wet';
    if (texture) {
      this.plotMarks[k] = this.add.image(x * TILE, y * TILE, texture).setOrigin(0, 0).setDepth(5);
    }
  }

  // The status icons are drawn in code, so there are no extra image files to manage
  makeMarkTextures() {
    const make = (key, draw) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(key, TILE, TILE);
      g.destroy();
    };

    make('mark-dry', (g) => {
      g.fillStyle(0x0b3d91, 1); // dark outline
      g.fillTriangle(11, 0, 6, 7, 16, 7);
      g.fillCircle(11, 9, 5);
      g.fillStyle(0x5fc0ff, 1); // water drop
      g.fillTriangle(11, 2, 8, 7, 14, 7);
      g.fillCircle(11, 9, 3);
    });

    make('mark-wet', (g) => {
      g.fillStyle(0x1a3a7a, 0.4); // soaked, darker soil
      g.fillRect(0, 0, TILE, TILE);
    });

    make('mark-ready', (g) => {
      g.fillStyle(0x7a5a00, 1); // dark outline
      g.fillTriangle(11, 0, 6, 6, 16, 6);
      g.fillTriangle(11, 12, 6, 6, 16, 6);
      g.fillStyle(0xfff27a, 1); // sparkle
      g.fillTriangle(11, 2, 8, 6, 14, 6);
      g.fillTriangle(11, 10, 8, 6, 14, 6);
    });
  }

  tickPlots() {
    const changed = tick(this.gameState, this.gameState.map, Date.now());
    changed.forEach((c) => this.refreshPlot(c.x, c.y));
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
    if (result.ok) this.refreshPlot(x, y);
    this.showToast(result.msg);
    this.updateHud();
  }

  // ---------- Targets (dirt piles, trees, rocks) ----------

  // only standing targets count: a stump can be walked over and used again after it regrows
  targetAt(x, y) {
    return this.targets.find((t) => t.active && t.x === x && t.y === y) ?? null;
  }

  // once a second: regrow any stumps whose time is up (not while you are standing on one)
  tickTargets() {
    const gs = this.gameState;
    this.targets.forEach((t) => {
      if (t.active || !t.respawnMs) return;
      if (t.x === this.tile.x && t.y === this.tile.y) return;
      if (targetReady(gs, gs.map, t.id)) {
        t.active = true;
        t.sprite.setTexture(t.texture).setDepth(4);
      }
    });
  }

  useOnTarget(t) {
    const gs = this.gameState;
    const r = hitTarget(gs, toolDefs, gs.map, t);
    this.updateHud();

    if (!r.ok) {
      this.showToast(r.msg);
      return;
    }

    if (r.cleared) {
      if (t.respawnMs) {
        t.active = false; // leaves a stump that grows back
        t.sprite.setTexture(t.stump).setDepth(3);
      } else {
        this.targets = this.targets.filter((x) => x !== t);
        this.tweens.add({ targets: t.sprite, alpha: 0, duration: 400, onComplete: () => t.sprite.destroy() });
      }
      const gained = r.amount > 0 ? ` (+${r.amount} ${r.drop})` : '';
      this.showToast(r.broke ? `${r.msg} ${t.clearedMsg}${gained}` : `${t.clearedMsg}${gained}`);
      this.updateHud();
    } else {
      // a little shake, and how many swings are left
      this.tweens.add({ targets: t.sprite, x: t.sprite.x + 2, duration: 50, yoyo: true, repeat: 2 });
      this.showToast(r.broke ? r.msg : `${r.left} more to go`);
    }
  }

  // ---------- Rabbit ----------

  updateRabbit(delta) {
    const r = this.rabbit;
    if (!r) return;

    // a rabbit in your arms rides above your head
    if (r.phase === 'held') {
      if (this.rabbitSprite) this.rabbitSprite.setPosition(this.player.x, this.player.y - 31);
      return;
    }
    // the rabbit waits until you've met the farmer, and pauses during dialogue and map changes
    if (!this.gameState.flags.met_farmer || this.dialogue.isOpen || this.transitioning) return;

    const gs = this.gameState;
    const events = tickRabbit(r, delta, {
      plots: this.plotCells.map((c) => ({ ...c, planted: getPlot(gs, gs.map, c.x, c.y).stage > 0 })),
      isFree: (x, y) => this.isFreeTile(x, y),
      rng: Math.random,
    });
    events.forEach((e) => this.onRabbitEvent(e));
  }

  onRabbitEvent(e) {
    const gs = this.gameState;
    if (e.type === 'appear') {
      this.rabbitSprite = this.add.image(e.x * TILE, e.y * TILE, 'rabbit').setOrigin(0, 0).setDepth(8);
      this.tweens.add({ targets: this.rabbitSprite, alpha: { from: 0, to: 1 }, duration: 250 });
      if (!gs.flags.rabbit_hint) {
        gs.flags.rabbit_hint = true;
        this.showToast('A rabbit! Face it and press F to catch it.');
      } else {
        this.showToast('A rabbit is in the garden!');
      }
    } else if (e.type === 'eat') {
      if (eatPlot(gs, gs.map, e.x, e.y)) {
        this.refreshPlot(e.x, e.y);
        this.showToast('The rabbit ate your plant!');
      }
      if (this.rabbitSprite) {
        this.tweens.add({ targets: this.rabbitSprite, y: this.rabbitSprite.y - 3, duration: 100, yoyo: true, repeat: 3 });
      }
    } else if (e.type === 'hop') {
      if (this.rabbitSprite) {
        this.tweens.add({ targets: this.rabbitSprite, x: e.to.x * TILE, y: e.to.y * TILE, duration: 350 });
      }
    } else if (e.type === 'leave') {
      if (this.rabbitSprite) this.rabbitSprite.destroy();
      this.rabbitSprite = null;
    }
  }

  // a tile something can land or hop on: inside the map, not blocked, and not where the player stands
  isFreeTile(x, y) {
    return this.canWalk(x, y) && !(x === this.tile.x && y === this.tile.y);
  }

  // F: throw the rabbit if you're holding it; otherwise pick up the rabbit or an item in front of you
  onGrab() {
    if (this.bag.isOpen || this.dialogue.isOpen || this.choice.isOpen || this.moving || this.transitioning) return;

    const r = this.rabbit;
    if (r && r.phase === 'held') {
      this.throwRabbitAway();
      return;
    }

    const tx = this.tile.x + this.facing.x;
    const ty = this.tile.y + this.facing.y;

    if (r && canCatch(r) && r.x === tx && r.y === ty && this.rabbitSprite) {
      catchRabbit(r);
      this.rabbitSprite.setDepth(11);
      this.showToast('Caught it! Face away and press F to throw it out.');
      return;
    }

    // otherwise: an item on the tile you face, or the one you are standing on
    const gs = this.gameState;
    const here = (gs.drops[gs.map] ?? []).find(
      (d) => (d.x === tx && d.y === ty) || (d.x === this.tile.x && d.y === this.tile.y)
    );
    if (here) this.pickUpDrop(here);
  }

  throwRabbitAway() {
    const gs = this.gameState;

    // lands up to 3 tiles away, flying over fences and trees; pick the farthest free tile
    let land = null;
    for (let d = 3; d >= 1 && !land; d--) {
      const x = this.tile.x + this.facing.x * d;
      const y = this.tile.y + this.facing.y * d;
      if (this.isFreeTile(x, y)) land = { x, y };
    }
    if (!land) {
      this.showToast('No room to throw it that way!');
      return;
    }

    throwRabbit(this.rabbit); // cooldown starts again
    const sprite = this.rabbitSprite;
    this.rabbitSprite = null;
    this.showToast('You threw the rabbit out of the garden!');

    // the first rabbit you ever throw drops a shovel where it lands
    const firstTime = !gs.flags.shovel_dropped;
    if (firstTime) gs.flags.shovel_dropped = true;

    this.tweens.add({
      targets: sprite,
      x: land.x * TILE,
      y: land.y * TILE,
      duration: 350,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: sprite, alpha: 0, duration: 300, onComplete: () => sprite.destroy() });
        if (firstTime) {
          const drop = { x: land.x, y: land.y, item: 'shovel' };
          if (!gs.drops[gs.map]) gs.drops[gs.map] = [];
          gs.drops[gs.map].push(drop);
          this.showDrop(drop);
          this.showToast('The rabbit dropped a shovel!');
        }
      },
    });
  }

  showDrop(drop) {
    this.dropSprites[`${drop.x},${drop.y}`] = this.add
      .image(drop.x * TILE, drop.y * TILE, drop.item)
      .setOrigin(0, 0)
      .setDepth(6);
  }

  pickUpDrop(drop) {
    const gs = this.gameState;
    gs.drops[gs.map] = gs.drops[gs.map].filter((d) => d !== drop);
    const sprite = this.dropSprites[`${drop.x},${drop.y}`];
    if (sprite) sprite.destroy();
    delete this.dropSprites[`${drop.x},${drop.y}`];

    if (toolDefs[drop.item]) {
      giveTool(gs, toolDefs, drop.item); // tools wear out, so they live in gs.tools
      this.showToast(`Got the ${drop.item}! Face something big and press Space to use it.`);
    } else {
      gs.items[drop.item] = (gs.items[drop.item] ?? 0) + 1;
      this.showToast(`Picked up ${drop.item}.`);
    }
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

    // F button = pick up / throw (same as F on a keyboard)
    make(292, 188, 'F', () => this.onGrab());

    // save button (replaces the P key on phones)
    const save = make(292, 16, 'SAVE', () => this.saveGame());
    save.setStyle({ fixedWidth: 44, fontSize: '10px' });

    // BAG button opens the inventory (the I key on a keyboard)
    const bagBtn = make(292, 46, 'BAG', () => this.toggleBag());
    bagBtn.setStyle({ fixedWidth: 44, fontSize: '10px' });
  }

  // Space / Enter / Z / the A button
  onAction() {
    if (this.bag.isOpen) return;
    if (this.choice.isOpen) {
      this.choice.select();
      return;
    }
    if (this.dialogue.isOpen) {
      this.dialogue.advance();
      return;
    }
    if (this.moving || this.transitioning) return;

    const tx = this.tile.x + this.facing.x;
    const ty = this.tile.y + this.facing.y;
    const npc = this.npcAt(tx, ty);
    const target = this.targetAt(tx, ty);
    if (npc) {
      this.talkTo(npc);
    } else if (target) {
      this.useOnTarget(target);
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

    // Shopkeepers (an NPC with a "shop" property pointing at data/shop.json)
    if (npc.shop && shopData[npc.shop]) {
      this.runConvo(talkToShopkeeper(this.gameState, npc.id, data, shopData[npc.shop], toolDefs), data.name);
      return;
    }

    // Quest givers (listed in quests.json) build their lines from the current request
    const quest = questsData[npc.dialogue];
    if (quest) {
      this.runConvo(talkToQuestGiver(this.gameState, npc.id, data, quest, toolDefs), data.name);
      return;
    }

    const flag = `met_${npc.id}`;
    const firstTime = !this.gameState.flags[flag];
    this.gameState.flags[flag] = true;

    this.touchDir = { x: 0, y: 0 };
    let lines = firstTime ? data.lines : data.repeatLines;
    // some NPCs say something different once a story flag is set (see "flagLines" in dialogue.json)
    for (const [flagName, flagLines] of Object.entries(data.flagLines ?? {})) {
      if (this.gameState.flags[flagName]) lines = flagLines;
    }
    this.dialogue.open(lines, data.name);
  }

  // Plays a conversation step: lines in the dialogue box, then a toast, then an optional choice menu,
  // and repeats with whatever the chosen option returns (see quests.js for the step shape).
  runConvo(step, name) {
    const next = () => {
      const msg = step.afterClose ? step.afterClose() : null;
      if (msg) this.showToast(msg);
      this.updateHud();
      if (!step.choice) return;
      this.choice.open(step.choice.options, {
        onSelect: (i) => {
          const result = step.choice.onPick(i);
          if (result) this.runConvo(result, name);
        },
      });
    };
    if (step.lines && step.lines.length > 0) this.dialogue.open(step.lines, name, next);
    else next();
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

  update(_time, delta) {
    this.updateRabbit(delta);

    if (this.moving || this.transitioning || this.dialogue.isOpen || this.choice.isOpen || this.bag.isOpen) return;

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
    if (!this.canWalk(nx, ny)) {
      this.faceFrame(this.facing); // bumped into something: just turn to face it
      return;
    }

    this.moving = true;
    this.tile = { x: nx, y: ny };
    this.player.play(`walk-${this.dirName(this.facing)}`, true);
    this.tweens.add({
      targets: this.player,
      x: nx * TILE,
      y: (ny + 1) * TILE,
      duration: MOVE_MS,
      onComplete: () => {
        this.moving = false;
        // keep walking if a direction is still held, otherwise stand still facing that way
        const held = this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown ||
          this.cursors.down.isDown || this.wasd.A.isDown || this.wasd.D.isDown || this.wasd.W.isDown ||
          this.wasd.S.isDown || this.touchDir.x !== 0 || this.touchDir.y !== 0;
        if (!held) this.faceFrame(this.facing);
        this.checkDoor();
      },
    });
  }

  dirName(f) {
    return f.y > 0 ? 'down' : f.y < 0 ? 'up' : f.x < 0 ? 'left' : 'right';
  }

  // stop animating and show the standing pose for a direction
  faceFrame(f) {
    const row = { down: 0, left: 1, right: 2, up: 3 }[this.dirName(f)];
    this.player.anims.stop();
    this.player.setFrame(row * 3 + 1);
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
    // so does a rabbit sitting on a tile
    if (this.rabbit && rabbitOnMap(this.rabbit) && this.rabbit.x === x && this.rabbit.y === y) return false;
    // dirt piles, trees and rocks block the way until they are cleared
    if (this.targetAt(x, y)) return false;
    // any tile painted on the "obstacles" layer blocks movement
    return !this.obstacles || this.obstacles.getTileAt(x, y) === null;
  }
}
