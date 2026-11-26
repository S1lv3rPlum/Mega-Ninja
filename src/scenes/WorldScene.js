import Phaser from 'phaser';
import { SaveManager } from '../SaveManager.js';
import DialogueBox from '../DialogueBox.js';
import dialogueData from '../data/dialogue.json';
import questsData from '../data/quests.json';
import { MAX_STAGE, ensureState, getPlot, plant, water, harvest, fillCan, tick, eatPlot, plantable } from '../farming.js';
import cropsData from '../data/crops.json';
import { talkToQuestGiver } from '../quests.js';
import { createRabbit, tickRabbit, catchRabbit, throwRabbit, canCatch, rabbitOnMap } from '../rabbit.js';
import ChoiceMenu from '../ChoiceMenu.js';
import toolDefs from '../data/tools.json';
import { ensureToolState, giveTool, hitTarget, toolLabel, targetReady, isCleared, variantFor } from '../tools.js';
import rocksData from '../data/rocks.json';
import itemsData from '../data/items.json';
import weaponDefs from '../data/weapons.json';
import faintCfg from '../data/faint.json';
import Enemies from '../Enemies.js';
import Boss from '../Boss.js';
import Golem from '../Golem.js';
import doorCfg from '../data/sealed-door.json';
import { missingForDoor, openDoor } from '../door.js';
import { ensureCombatState, hurtPlayer as applyHurt, faint as applyFaint, eat } from '../combat.js';
import shopData from '../data/shop.json';
import { talkToShopkeeper } from '../shop.js';
import { talkToCrafter } from '../craft.js';
import FishingUI from '../FishingUI.js';
import audio from '../audio.js';
import { themeFor } from '../music.js';
import brewDefs from '../data/brews.json';
import { drink, moveMs, lightScale, nightTint, buffText } from '../brew.js';
import fishDefs from '../data/fish.json';
import { talkFisher } from '../fishing.js';
import { hitDummy, sparBonus, talkSparMaster, talkLibrarian, talkFeeder, rest, talkHeadmaster } from '../school.js';
import { enchantBonus, talkEnchanter } from '../enchant.js';
import { NINJA_COLORS, NINJA_IDS, ninjaId, recolorData, talkTailor } from '../ninja.js';
import { OUTDOOR, phaseAt, darkness, skyColor, toHex, isNightPhase, forcedPhase, cycleFrom } from '../daynight.js';
import enchantDefs from '../data/enchants.json';
import { petStats, petTick, newFightState, talkTrainer } from '../petfight.js';
import { companionPet } from '../pets.js';
import petArmorDefs from '../data/petarmor.json';
import recipeData from '../data/recipes.json';
import InventoryScreen, { iconKey } from '../InventoryScreen.js';
import { lowTools } from '../inventory.js';
import { Coop } from '../Coop.js';
import Friends from '../Friends.js';
import { owedGifts, giveGifts } from '../bossGifts.js';
import waystoneData from '../data/waystones.json';
import { ensureSmith, talkToSmith, reduceDamage, mergeCrest } from '../smith.js';
import armorDefs from '../data/armor.json';
import friendDefs from '../data/friends.json';

const TILE = 16;
// NPCs that have walking animation: for each name here, public/assets/sprites/<name>-walk.png is a sheet laid out
// exactly like the player's (3 frames across: step, stand, step; 4 rows: down, left, right, up; each frame 16x24).
// To give an NPC animation: add its texture name here, drop in <name>-walk.png, and give the NPC a walkRadius.
const NPC_WALK_SHEETS = ['npc', 'student1', 'student2', 'student3'];
const DIRS = ['down', 'left', 'right', 'up'];
const MOVE_MS = 140; // time to slide one tile

const START_MAP = 'town';
const START_TILE = { x: 15, y: 10 };

// To add a map: save it as public/assets/maps/<name>.json and add its name here.
const MAPS = ['town', 'farm', 'forest', 'quarry', 'cave', 'crystal', 'market', 'peaks', 'ruins', 'desert', 'bazaar', 'school', 'kitchen', 'potions', 'library', 'sparring', 'dorm1', 'dorm2', 'garden', 'barn', 'upper', 'dojo', 'workshop', 'nightbarn'];
// To add a tileset: save it as public/assets/tilesets/<name>.png and add its name here.
// (The name must match the tileset's name inside Tiled.)
const TILESETS = ['tiles', 'farm-tiles', 'stall-tiles', 'mine-tiles', 'crystal-tiles', 'market-tiles', 'snow-tiles', 'ruins-tiles', 'desert-tiles', 'bazaar-tiles', 'school-tiles'];

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
    NPC_WALK_SHEETS.forEach((n) =>
      this.load.spritesheet(`${n}-walk`, `assets/sprites/${n}-walk.png`, { frameWidth: 16, frameHeight: 24 })
    );
    this.load.image('rabbit', 'assets/sprites/rabbit.png');
    this.load.image('shovel', 'assets/items/shovel.png');
    this.load.image('dirt-pile', 'assets/sprites/dirt-pile.png'); // textures for "targets" objects go here
    this.load.image('tree', 'assets/sprites/tree.png');
    this.load.image('stump', 'assets/sprites/stump.png');
    this.load.image('lumberjack', 'assets/sprites/lumberjack.png'); // textures for NPCs go here
    this.load.image('shopkeeper', 'assets/sprites/shopkeeper.png');
    ['fisher', 'hexbrewer', 'firefly', 'owl', 'moonhare', 'cook', 'trainer', 'enchanter', 'student1', 'student2', 'student3', 'bookshelf', 'bed', 'dummy'].forEach((n) => this.load.image(n, `assets/sprites/${n}.png`));
    this.load.image('alchemist', 'assets/sprites/alchemist.png');
    ['grey', 'copper', 'sapphire', 'emerald', 'ruby', 'diamond', 'crystal', 'sun'].forEach((r) => this.load.image(`rock-${r}`, `assets/sprites/rock-${r}.png`));
    this.load.image('rubble', 'assets/sprites/rubble.png');
    ['treant-boss', 'treant-good', 'sapling', 'sign', 'bat-queen', 'moth', 'hexsmith', 'hexcreature', 'hexcharm', 'yeti', 'snowfox', 'frostimp', 'snow-bush', 'snow-bush-bare', 'serpent', 'jelly', 'crab', 'kelp', 'kelp-bare', 'rune-off', 'rune-on', 'ruinsdoor', 'ruinsdoor-open', 'scorpion', 'sandlizard', 'scorpionking', 'cactus-fruit', 'cactus-fruit-bare', 'princess', 'bzsmith', 'bzspice', 'bzgem', 'waystone-off', 'waystone-on'].forEach((n) => this.load.image(n, `assets/sprites/${n}.png`));
    this.load.image('bush', 'assets/sprites/bush.png');
    this.load.image('bush-bare', 'assets/sprites/bush-bare.png');
    ['carrot', 'pumpkin', 'frostberry', 'seaweed', 'cactus-fruit', 'moonbloom', 'glowcap'].forEach((c) => [2, 3, 4].forEach((n) => this.load.image(`crop-${c}-${n}`, `assets/sprites/crop-${c}-${n}.png`)));
    this.load.image('sensei', 'assets/sprites/sensei.png');
    this.load.image('shadow', 'assets/sprites/shadow.png');
    this.load.image('boulder', 'assets/sprites/boulder.png');
    ['bat', 'golem', 'golem-ball', 'golem-good', 'pebble', 'sealed-door-open'].forEach((n) => this.load.image(n, `assets/sprites/${n}.png`));
    this.load.image('sealed-door', 'assets/sprites/sealed-door.png');
    this.load.image('dialogue-box', 'assets/ui/dialogue-box.png');
  }

  create() {
    this.cameras.main.fadeIn(300);
    audio.attach(this); // music + sound effects (audio.js)
    this.audioTick = 0;
    this.moving = false;
    this.transitioning = false;
    this.plotMarks = {}; // little icons drawn on plots: thirsty / watered / ready
    this.plotCrops = {}; // pictures of non-wheat crops drawn over a plot
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
    ensureCombatState(gs);
    ensureSmith(gs);
    gs.flags.waystone_town = true; // the town waystone is always lit
    if (gs.map === 'bazaar') gs.bazaarVisits += 1; // an order at the armor smith is ready the next time you come back
    if (gs.map === 'market') gs.marketVisits += 1; // an order at the weapon smith is ready the next time you come back
    // co-op: the shared world (farm, rocks, boulders, the treant) comes from the cloud before the map is built
    if (Coop.active) Coop.prepare(gs);
    // a co-op friend freed the treant before you got there: the lantern is waiting for you too
    const pending = [];
    if (gs.flags.treant_defeated && !(gs.items.lantern > 0)) {
      gs.items.lantern = 1;
      pending.push('The treant was freed by your friends! He left you the Heartwood Lantern.');
    }
    // the golem was calmed by a friend before you got here: the Crest Stone is yours too (once)
    if (gs.flags.golem_defeated && !gs.flags.got_crest) {
      gs.flags.got_crest = true;
      gs.items['crest-stone'] = (gs.items['crest-stone'] ?? 0) + 1;
      pending.push('Granite was calmed by your friends! He gave you a Crest Stone too.');
    }
    // boss rewards a friend earned (or earned before you joined) are yours too, once (see bossGifts.js)
    pending.push(...giveGifts(gs, owedGifts(gs)));
    if (pending.length) this.registry.set('pendingMsg', pending);
    this.invulnUntil = 0;
    this.nextSwing = 0;
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
      if (l.name === 'ground') this.groundLayer = layer;
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
          requiresItem: p.requiresItem, // e.g. 'lantern': the door will not open without it
          requiresFlag: p.requiresFlag, // e.g. 'stonedoor_cleared': closed until that flag is set
          lockedMsg: p.lockedMsg ?? 'It is locked.',
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
      // a walking NPC with a <texture>-walk sheet gets a 16x24 animated sprite (feet on the bottom of its tile)
      const isOpen = !!(p.openFlag && gs.flags[p.openFlag]);
      const tex = isOpen ? p.openTexture ?? p.texture ?? 'npc' : p.texture ?? 'npc';
      const sheet = (p.walkRadius ?? 0) > 0 && this.textures.exists(`${tex}-walk`) ? `${tex}-walk` : null;
      let sprite;
      if (sheet) {
        DIRS.forEach((dir, row) => {
          if (this.anims.exists(`${sheet}-${dir}`)) return;
          this.anims.create({
            key: `${sheet}-${dir}`,
            frames: this.anims.generateFrameNumbers(sheet, { frames: [row * 3 + 1, row * 3, row * 3 + 1, row * 3 + 2] }),
            frameRate: 8,
            repeat: -1,
          });
        });
        sprite = this.add.sprite(x * TILE, (y + 1) * TILE, sheet, 1).setOrigin(0, 1).setDepth(10);
      } else {
        sprite = this.add.image(x * TILE, y * TILE, tex).setOrigin(0, 0).setDepth(10);
      }
      return {
        id,
        sheet,
        // an NPC with openFlag (a flag name) changes texture and dialogue once that flag is set (see the cave's stone door)
        openFlag: p.openFlag,
        openTexture: p.openTexture,
        openDialogue: p.openDialogue,
        giveItem: p.giveItem, // gives this item once, when the flag giveWhen is set (the princess and the Waystone Charm)
        giveWhen: p.giveWhen,
        setFlag: p.setFlag, // pressing Space on it sets this flag (a rune stone); pair with openFlag for the lit look
        needFlags: p.needFlags ? String(p.needFlags).split(',') : null, // it sets its own openFlag once all of these are set (the inner door)
        passable: !!p.passable, // once its openFlag is set you can walk through it (the stone door)
        dialogue: isOpen && p.openDialogue ? p.openDialogue : p.dialogue ?? id,
        shop: p.shop, // a key in data/shop.json makes this NPC a shopkeeper
        role: p.role, // school: book, librarian, sparmaster, dummy, bed, feeder (see src/school.js)
        books: p.books ? String(p.books).split(',') : null,
        craft: p.craft, // 'kitchen' or 'potions': a key in data/recipes.json (the school's cook and alchemist)
        smith: p.smith, // a weapon smith: orders weapons from data/weapons.json
        x,
        y,
        sprite,
        // Walking NPCs: give the NPC object a custom property  walkRadius  (an int, e.g. 3) in Tiled.
        // It then strolls around within that many tiles of where you placed it.
        // Optional: walkPauseMs (average wait between steps, default 2200), walkStepMs (time per step, default 450).
        walk: p.walkRadius ?? 0,
        home: { x, y },
        pauseMs: p.walkPauseMs ?? 2200,
        stepMs: p.walkStepMs ?? 450,
        nextStep: 800 + Math.random() * 2000,
        moving: false,
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
          variants: p.variants, // a key in data/rocks.json: the target is a random kind each time it (re)spawns
          active,
          sprite: this.add.image(x * TILE, y * TILE, active ? texture : stump).setOrigin(0, 0).setDepth(active ? 4 : 3),
        };
      })
      .filter(Boolean);
    this.targets.forEach((t) => {
      if (t.active) this.applyVariant(t);
    });

    // --- Player (grid-based: tracks a tile position, slides between tiles) ---
    // The sprite is taller than a tile (16x24), so its feet sit on the bottom edge of its tile.
    this.playerTex = this.ninjaTexture(ninjaId(gs));
    this.player = this.add
      .sprite(this.tile.x * TILE, (this.tile.y + 1) * TILE, this.playerTex, 0)
      .setOrigin(0, 1)
      .setDepth(10);
    this.faceFrame(this.facing);

    // --- Enemies (real-time; an "enemies" object layer in Tiled) ---
    // --- Day and night (outdoor maps are tinted; the night friends only come out after dark) ---
    this.forcedPhase = forcedPhase(window.location.search);
    this.cycleMs = cycleFrom(window.location.search);
    this.isNight = isNightPhase(this.phaseNow());
    this.enemies = new Enemies(this);
    this.enemies.spawn(objects('enemies'), readProps);

    // --- The forest boss (an object on a "boss" layer) ---
    this.boss = null;
    const bossObj = objects('boss')[0];
    if (bossObj) this.boss = readProps(bossObj.properties).kind === 'golem' ? new Golem(this, bossObj) : new Boss(this, bossObj);
    // the forest is darkened by the shadow until the treant is freed
    if (gs.map === 'forest' && gs.flags.got_sword && !gs.flags.treant_defeated) {
      this.targets.forEach((t) => t.sprite.setTint(0x8a7aaa));
    }

    // --- Camera follows the player and stays inside the map ---
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.player, true);

    // --- Dark maps (a map property "dark" = true in Tiled): only a lantern-sized circle around you is lit ---
    this.darkRT = null;
    if (readProps(raw.properties).dark) this.createDarkness();
    this.thinIceGid = readProps(raw.properties).thinIceGid ?? 0;
    this.fishing = new FishingUI(this, { gid: readProps(raw.properties).fishGid ?? 0, area: readProps(raw.properties).fishArea ?? null }); // ponds: see fishing.js
    this.createDayNight();

    // --- Dialogue ---
    this.dialogue = new DialogueBox(this);
    this.choice = new ChoiceMenu(this);
    this.bag = new InventoryScreen(this);
    this.friends = new Friends(this);
    this.friends.start();
    if (!this.gameState.ninja) this.time.delayedCall(700, () => this.chooseNinja()); // choose a colour the first time

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
      .text(160, 42, '', { fontSize: '10px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 4, y: 2 }, wordWrap: { width: 280 }, align: 'center' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0) // stays fixed on screen
      .setDepth(400) // above the bag, so messages from eating show
      .setAlpha(0); // hidden until there is something to say (an empty toast still draws a dark box)
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
      if (this.fishing?.active) this.fishing.cancel('You pulled in your line.');
      else if (this.bag.isOpen) this.bag.close();
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
    this.input.keyboard.on('keydown-J', (event) => {
      if (!event.repeat) this.attack();
    });
    this.input.keyboard.on('keydown-G', (event) => {
      if (!event.repeat) this.friends.open();
    });
    this.input.keyboard.on('keydown-M', (event) => {
      if (!event.repeat) this.toggleMute();
    });
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
    this.muteIcon = null;
    if (!this.sys.game.device.input.touch) {
      this.muteIcon = this.add
        .text(316, 3, audio.muted ? '♪x' : '♪', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2 })
        .setOrigin(1, 0).setScrollFactor(0).setDepth(101).setAlpha(0.7).setInteractive({ useHandCursor: true });
      this.muteIcon.on('pointerdown', () => this.toggleMute());
    }
    this.buffHud = null; // (re)made on the first updateBuffHud: the scene restarts on every map change
    this.hud = this.add
      .text(4, 4, '', { fontSize: '8px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 3, y: 2 }, lineSpacing: 1 })
      .setScrollFactor(0)
      .setDepth(100);
    this.pickupText = this.add
      .text(4, 40, '', { fontSize: '8px', fontFamily: 'monospace', color: '#ffe08a', backgroundColor: '#000000aa', padding: { x: 3, y: 2 }, lineSpacing: 1 })
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0);
    this.lastItems = { ...gs.items }; // so only changes after this point pop up
    // little coin icon in front of the gold number (the Coin Pouch)
    this.hudCoin = this.add.image(12, 9, iconKey(this, 'coin', '#f2c230')).setScrollFactor(0).setDepth(101);
    this.createHearts();
    this.updateHud();
    const faintMsg = this.registry.get('faintMsg');
    if (faintMsg) {
      this.registry.set('faintMsg', null);
      this.time.delayedCall(700, () => this.dialogue.open([faintMsg], 'Town'));
    }

    // --- Farm plots: show saved growth, catch up on time spent away, then keep growing ---
    if (this.crops && this.farmGid !== null) {
      this.crops.filterTiles((t) => t.index > 0).forEach((t) => {
        this.refreshPlot(t.x, t.y);
      });
    }
    this.tickPlots();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => { this.tickPlots(); this.tickTargets(); } });

    if (this.darkRT) this.showToast('The Heartwood Lantern lights the way.');

    // --- Co-op: see the other players, share the world ---
    this.remoteSprites = {};
    if (Coop.active) {
      this.time.addEvent({ delay: 1000, loop: true, callback: () => Coop.tick() });
      Coop.bind(this);
      Coop.sendPresence(gs.map, this.tile.x, this.tile.y, 'down');
      this.events.once('shutdown', () => Coop.unbind(this));
      if (!this.registry.get('coopWelcomed')) {
        this.registry.set('coopWelcomed', true);
        this.showToast(`Co-op world ${Coop.code}`);
      }
    }
    const pendingMsg = this.registry.get('pendingMsg');
    if (pendingMsg) {
      this.registry.set('pendingMsg', null);
      this.time.delayedCall(900, () => this.dialogue.open([].concat(pendingMsg), ''));
    }

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
    if (mergeCrest(gs)) this.time.delayedCall(900, () => this.showToast('The two halves hum and join into the Moon Crest!'));
    // seeds, wheat, wood, stone and tools live in the bag (I key / BAG button); the HUD keeps the essentials
    const lines = [`   ${gs.gold}`];
    if (this.crops) lines.push(`Water ${gs.can.water}/${gs.can.max}`); // only where there are plots to water
    const worn = lowTools(gs, toolDefs).map((t) => (t.dur <= 0 ? `${t.name} broken!` : `${t.name} ${t.dur}/${t.max}!`));
    if (worn.length > 0) lines.push(worn.join('  '));
    this.hud.setText(lines.join('\n'));
    this.updateHearts();
    this.showPickups();
  }

  // When something is added to your bag, show it with the new total under the HUD ("+2 Wood (7)")
  showPickups() {
    const gs = this.gameState;
    if (!this.lastItems) this.lastItems = { ...gs.items };
    const gained = [];
    Object.entries(gs.items).forEach(([id, n]) => {
      const before = this.lastItems[id] ?? 0;
      if (n > before && id !== 'shovel') gained.push(`+${n - before} ${itemsData.items[id]?.name ?? id} (${n})`);
    });
    this.lastItems = { ...gs.items };
    if (this.lastGold !== undefined && gs.gold > this.lastGold) audio.sfx('coin');
    this.lastGold = gs.gold;
    if (gained.length > 0) audio.sfx('pickup');
    if (gained.length === 0 || !this.pickupText) return;
    this.pickupText.setText(gained.join('\n')).setAlpha(1).setPosition(4, this.hud.y + this.hud.height + 3);
    this.tweens.killTweensOf(this.pickupText);
    this.tweens.add({ targets: this.pickupText, alpha: 0, delay: 2200, duration: 500 });
  }

  // ---------- Hearts, attacking, fainting, eating ----------

  createHearts() {
    this.hearts = [];
    const n = Math.ceil(this.gameState.maxHp / 2);
    for (let i = 0; i < n; i++) {
      this.hearts.push(this.add.image(268 - (n - i) * 10, 6, 'heart-full').setOrigin(0, 0).setScrollFactor(0).setDepth(101));
    }
  }

  rebuildHearts() {
    if (this.hearts) this.hearts.forEach((h) => h.destroy());
    this.createHearts();
    this.updateHearts();
  }

  updateHearts() {
    if (!this.hearts) return;
    const hp = this.gameState.hp;
    this.hearts.forEach((h, i) => {
      const v = hp - i * 2;
      h.setTexture(v >= 2 ? 'heart-full' : v === 1 ? 'heart-half' : 'heart-empty');
    });
  }

  // A trained friend fights beside you with small hits, and gets tired (never hurt) after a while (see petfight.js)
  updatePetFight() {
    const gs = this.gameState;
    const pet = companionPet(gs);
    const spr = this.friends && this.friends.sprite;
    if (!pet || !spr) return;
    const stats = petStats(pet, petArmorDefs);
    if (!stats) return;
    if (!this.petFight) this.petFight = {};
    const st = (this.petFight[pet.id] ??= newFightState());
    const px = Math.round(spr.x / TILE);
    const py = Math.round(spr.y / TILE);
    const target = this.enemies.list.find((e) => !e.dead && !e.hidden && !e.def.tame && Math.abs(e.x - px) <= 1 && Math.abs(e.y - py) <= 1);
    const r = petTick(st, stats, Date.now(), !!target);
    if (st.tiredUntil) spr.setTint(0x8c8cb4);
    if (r === 'rested') {
      spr.clearTint();
      this.showToast(`${pet.name} is rested and ready!`);
    }
    if ((r === 'attack' || r === 'attack-tired') && target) {
      this.enemies.hit(target, stats.dmg, Math.sign(target.x - px), Math.sign(target.y - py));
      const fx = this.add.image(target.x * TILE + 8, target.y * TILE + 8, 'slash').setDepth(12).setScale(0.7);
      this.tweens.add({ targets: fx, alpha: 0, duration: 160, onComplete: () => fx.destroy() });
      this.tweens.add({ targets: spr, y: spr.y - 3, duration: 70, yoyo: true });
      if (r === 'attack-tired') this.showToast(`${pet.name} is tired and needs a rest.`);
    }
  }

  // J / the B button: swing the weapon at the tile in front of you
  attack() {
    if (this.bag.isOpen || this.dialogue.isOpen || this.choice.isOpen || this.moving || this.transitioning) return;
    this.fishing.cancel();
    const gs = this.gameState;
    const w = weaponDefs[gs.weapon];
    if (!w) {
      this.showToast('You have no weapon yet.');
      return;
    }
    const now = this.time.now;
    if (now < this.nextSwing) return;
    const ench = enchantBonus(gs, enchantDefs);
    this.nextSwing = now + w.cooldownMs * ench.cooldownMul;
    audio.sfx('swing');
    this.touchDir = { x: 0, y: 0 };

    const { x: fx, y: fy } = this.facing;
    const tx = this.tile.x + fx;
    const ty = this.tile.y + fy;
    // slash flash on the tile in front, and a little lunge
    const angle = fx > 0 ? 0 : fy > 0 ? 90 : fx < 0 ? 180 : 270;
    const slash = this.add.image(tx * TILE + 8, ty * TILE + 8, 'slash').setAngle(angle).setDepth(12);
    this.tweens.add({ targets: slash, alpha: 0, duration: 160, onComplete: () => slash.destroy() });
    this.tweens.add({ targets: this.player, x: this.player.x + fx * 3, y: this.player.y + fy * 3, duration: 60, yoyo: true });

    const dmg = w.damage + sparBonus(gs) + enchantBonus(gs, enchantDefs).damage; // sparring class +1, Ember gems
    const e = this.enemies.at(tx, ty);
    const dummy = !e && this.npcs.find((n) => n.role === 'dummy' && n.x === tx && n.y === ty);
    if (dummy) {
      this.showToast(hitDummy(gs).msg);
      this.tweens.add({ targets: dummy.sprite, x: dummy.sprite.x + 2, duration: 50, yoyo: true, repeat: 2 });
    } else if (e) this.enemies.hit(e, dmg, fx, fy);
    else if (this.boss && this.boss.occupies(tx, ty)) this.boss.hit(dmg);
  }

  hurtPlayer(amount) {
    const now = this.time.now;
    if (now < this.invulnUntil || this.transitioning) return;
    this.invulnUntil = now + 1000;
    audio.sfx('hurt');
    this.fishing.cancel('Ouch! Your line snapped.');
    const r = applyHurt(this.gameState, reduceDamage(amount, { defense: (armorDefs[this.gameState.armor]?.defense ?? 0) + enchantBonus(this.gameState, enchantDefs).defense }));
    this.cameras.main.shake(120, 0.004);
    this.tweens.add({ targets: this.player, alpha: 0.3, duration: 80, yoyo: true, repeat: 4, onComplete: () => this.player.setAlpha(1) });
    this.updateHud();
    if (r.fainted) this.faintNow();
  }

  // out of hearts: wake up in town (faint.json decides what it costs)
  faintNow() {
    this.transitioning = true;
    this.touchDir = { x: 0, y: 0 };
    this.cameras.main.fadeOut(700);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const r = applyFaint(this.gameState, faintCfg, START_MAP, START_TILE);
      this.registry.set('faintMsg', r.msg);
      SaveManager.save(this.gameState);
      this.scene.restart();
    });
  }

  // Save and go back to the title screen (to switch to another save slot)
  quitToTitle() {
    this.gameState.tile = { ...this.tile };
    SaveManager.save(this.gameState);
    if (Coop.active) Coop.stop(this.gameState);
    this.transitioning = true;
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.registry.set('gameState', null);
      this.scene.start('Title');
    });
  }

  // M key / the sound button: music and effects on or off (remembered)
  toggleMute() {
    const muted = audio.toggleMute();
    this.showToast(muted ? 'Sound off (press M to turn it on)' : 'Sound on');
    this.muteIcon?.setText(muted ? '♪x' : '♪');
  }

  // drink a brew from the bag (brew.js)
  drinkBrew(id) {
    const r = drink(this.gameState, brewDefs, id, Date.now());
    if (r.ok) audio.sfx('drink');
    this.updateBuffHud();
    this.dnTick = 0; // repaint the night tint right away
    return r.msg;
  }

  // pick the tune for where you are: the area's theme (calm version after dark outdoors), or the boss music in a boss fight
  updateAudio(time) {
    if (time < this.audioTick) return;
    this.audioTick = time + 500;
    const map = this.gameState.map;
    const boss = this.boss?.state === 'active';
    audio.play(boss ? 'boss' : themeFor(map), !boss && this.isNight && OUTDOOR.includes(map));
  }

  updateBuffHud() {
    if (!this.buffHud) {
      this.buffHud = this.add.text(168, 17, '', { fontSize: '8px', fontFamily: 'monospace', color: '#d8b8ff', stroke: '#000000', strokeThickness: 2 }).setScrollFactor(0).setDepth(101);
    }
    const t = buffText(this.gameState, Date.now());
    if (t !== this.buffHud.text) this.buffHud.setText(t);
  }

  eatFood(id) {
    const r = eat(this.gameState, itemsData.items, id);
    if (r.ok) audio.sfx('eat');
    this.updateHud();
    return r.msg;
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
    const cropId = plot.crop ?? 'wheat';
    const overlay = cropId !== 'wheat' && plot.stage >= 2;
    // wheat has its own tiles; other crops are a picture drawn over plain dirt
    this.crops.putTileAt(this.farmGid + (overlay ? 0 : plot.stage), x, y);
    if (this.plotCrops[`${x},${y}`]) {
      this.plotCrops[`${x},${y}`].destroy();
      delete this.plotCrops[`${x},${y}`];
    }
    if (overlay) this.plotCrops[`${x},${y}`] = this.add.image(x * TILE, y * TILE, `crop-${cropId}-${plot.stage}`).setOrigin(0, 0).setDepth(4);

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

    // hearts (full / half / empty) for the health bar, and the sword-slash flash
    const heart = (g, fill, leftOnly) => {
      g.fillStyle(fill, 1);
      g.fillCircle(2.5, 2.5, 2.5);
      if (!leftOnly) g.fillCircle(6.5, 2.5, 2.5);
      g.fillRect(1, 2, leftOnly ? 3.5 : 7, 2);
      g.fillTriangle(0, 3, leftOnly ? 4.5 : 9, 3, 4.5, 8);
    };
    make('heart-full', (g) => heart(g, 0xe03a4a, false));
    make('heart-empty', (g) => heart(g, 0x4a3a4a, false));
    make('heart-half', (g) => {
      heart(g, 0x4a3a4a, false);
      heart(g, 0xe03a4a, true);
    });
    make('slash', (g) => {
      g.lineStyle(3, 0xffffff, 1);
      g.beginPath();
      g.arc(2, 8, 11, -0.9, 0.9);
      g.strokePath();
      g.lineStyle(1, 0xbfe6ff, 1);
      g.beginPath();
      g.arc(2, 8, 8, -0.8, 0.8);
      g.strokePath();
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
    const changed = tick(this.gameState, this.gameState.map, Date.now(), cropsData, isNightPhase(this.phaseNow()));
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
    if (stage === 0) {
      // which seeds? one kind plants straight away, several kinds ask first
      const options = plantable(gs, cropsData);
      if (options.length === 0) {
        this.showToast('No seeds. Try picking the bushes.');
        return;
      }
      if (options.length === 1) {
        this.finishFarm(x, y, plant(gs, map, x, y, options[0].id, cropsData));
        return;
      }
      this.touchDir = { x: 0, y: 0 };
      this.choice.open(options.map((o) => `${o.name} seeds (${o.count})`), {
        onSelect: (i) => this.finishFarm(x, y, plant(gs, map, x, y, options[i].id, cropsData)),
      });
      return;
    }
    const result = stage >= MAX_STAGE ? harvest(gs, map, x, y, Math.random, cropsData) : water(gs, map, x, y, Date.now(), cropsData);
    this.finishFarm(x, y, result);
  }

  finishFarm(x, y, result) {
    if (result.ok) this.refreshPlot(x, y);
    this.showToast(result.msg);
    this.updateHud();
  }

  // ---------- Targets (dirt piles, trees, rocks) ----------

  // Rocks come in random colours: pick (or reload) this one's kind and copy its hits, drop and picture onto it
  applyVariant(t) {
    if (!t.variants) return;
    const gs = this.gameState;
    const v = variantFor(gs, gs.map, t.id, rocksData[t.variants]);
    t.hits = v.hits;
    t.drop = v.drop;
    t.dropAmount = v.amount;
    t.texture = v.texture;
    t.clearedMsg = v.msg;
    t.sprite.setTexture(v.texture);
  }

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
        this.applyVariant(t); // a rock grows back as a new random colour
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
        this.showToast('A rabbit! F catches it. Or face it and press Space to offer a carrot.');
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

    // B button = swing your weapon (the J key on a keyboard)
    make(258, 220, 'B', () => this.attack());

    // F button = pick up / throw (same as F on a keyboard)
    make(292, 188, 'F', () => this.onGrab());

    // save button (replaces the P key on phones)
    const save = make(292, 16, 'SAVE', () => this.saveGame());
    save.setStyle({ fixedWidth: 44, fontSize: '10px' });

    // BAG button opens the inventory (the I key on a keyboard)
    const bagBtn = make(292, 46, 'BAG', () => this.toggleBag());
    bagBtn.setStyle({ fixedWidth: 44, fontSize: '10px' });

    // FRIENDS button (the G key on a keyboard)
    const friendBtn = make(292, 76, 'PETS', () => this.friends.open());
    friendBtn.setStyle({ fixedWidth: 44, fontSize: '10px' });

    // sound on / off (the M key on a keyboard)
    const soundBtn = make(292, 106, audio.muted ? 'MUTE' : 'SND', () => {
      this.toggleMute();
      soundBtn.setText(audio.muted ? 'MUTE' : 'SND');
    });
    soundBtn.setStyle({ fixedWidth: 44, fontSize: '10px' });
  }

  // Space / Enter / Z / the A button
  onAction() {
    if (this.bag.isOpen) {
      this.bag.use(); // Space in the bag eats the selected food
      return;
    }
    if (this.choice.isOpen) {
      this.choice.select();
      return;
    }
    if (this.dialogue.isOpen) {
      this.dialogue.advance();
      return;
    }
    if (this.moving || this.transitioning) return;
    if (this.fishing.active) {
      this.fishing.press(); // a line is out: Space bites / reels
      return;
    }

    const tx = this.tile.x + this.facing.x;
    const ty = this.tile.y + this.facing.y;
    // the treant is weak to the axe: Space with a working axe swings it at the boss
    if (this.boss && this.boss.occupies(tx, ty) && (this.boss.toolHit?.() ?? this.boss.axeHit())) return;
    if (this.friends.tryOffer(tx, ty)) return;
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
    } else this.fishing.tryCast(tx, ty);
  }

  npcAt(x, y) {
    if (this.boss && this.boss.npc && this.boss.occupies(x, y)) return this.boss.npc; // the freed treant
    return this.npcs.find((n) => n.x === x && n.y === y && !(n.passable && n.openFlag && this.gameState.flags[n.openFlag])) ?? null;
  }

  talkTo(npc) {
    const data = dialogueData[npc.dialogue];
    if (!data) return;

    this.touchDir = { x: 0, y: 0 };
    if (npc.id === 'sealeddoor' && !this.gameState.flags[doorCfg.flag]) {
      this.sealedDoor(npc, data);
      return;
    }
    // an animated NPC turns to look at you
    if (npc.sheet && !npc.moving) this.standNpc(npc, this.dirName({ x: -this.facing.x, y: -this.facing.y }));

    if (npc.giveItem && (!npc.giveWhen || this.gameState.flags[npc.giveWhen]) && !this.gameState.flags[`gave_${npc.id}`]) {
      this.gameState.flags[`gave_${npc.id}`] = true;
      const gs = this.gameState;
      gs.items[npc.giveItem] = (gs.items[npc.giveItem] ?? 0) + 1;
      const nm = itemsData.items[npc.giveItem]?.name ?? npc.giveItem;
      this.time.delayedCall(2500, () => this.showToast(`Received: ${nm}`));
    }
    // a rune stone: the first touch lights it (and may open a door that needs several runes)
    if (npc.setFlag && !this.gameState.flags[npc.setFlag]) {
      this.gameState.flags[npc.setFlag] = true;
      this.showToast('The rune glows!');
      this.refreshOpenNpcs();
      this.checkRuneDoors();
      return;
    }
    if (npc.role === 'wardrobe') {
      this.runConvo(talkTailor(this.gameState, npc.id, data, (id) => this.setNinja(id)), data.name);
      return;
    }
    if (npc.role === 'headmaster') {
      const step = talkHeadmaster(this.gameState, data);
      this.runConvo(step, data.name);
      return;
    }
    if (npc.role === 'enchanter') {
      this.runConvo(talkEnchanter(this.gameState, npc.id, data, { enchantDefs, itemDefs: itemsData.items, recipes: recipeData.enchant }), data.name);
      return;
    }
    if (npc.role === 'trainer') {
      this.runConvo(talkTrainer(this.gameState, npc.id, data, { friendDefs, itemDefs: itemsData.items, armorRecipes: recipeData.petarmor, armorDefs: petArmorDefs }), data.name);
      return;
    }
    if (npc.role === 'sparmaster') { this.runConvo(talkSparMaster(this.gameState, data), data.name); return; }
    if (npc.role === 'dummy') { this.showToast(hitDummy(this.gameState).msg); return; }
    if (npc.role === 'bed') { this.runConvo(rest(this.gameState, data), data.name); return; }
    if (npc.role === 'fisher') {
      this.runConvo(talkFisher(this.gameState, npc.id, data, { fishDefs, areaNames: { garden: 'Garden pond', forest: 'Forest pond', peaks: 'Frozen lake' } }), data.name);
      return;
    }
    if (npc.role === 'feeder') { this.runConvo(talkFeeder(this.gameState, npc.id, data), data.name); return; }
    if (npc.role === 'librarian') {
      const step = talkLibrarian(this.gameState, data, npc.books ?? []);
      const orig = step.afterClose;
      step.afterClose = () => { const m = orig ? orig() : null; this.rebuildHearts(); return m; };
      this.runConvo(step, data.name);
      return;
    }
    if (npc.craft && recipeData[npc.craft]) {
      this.runConvo(talkToCrafter(this.gameState, npc.id, data, recipeData[npc.craft], itemsData.items), data.name);
      return;
    }
    if (npc.smith) {
      const armorSmith = npc.smith === 'armor';
      this.runConvo(talkToSmith(this.gameState, npc.id, data, armorSmith ? armorDefs : weaponDefs, armorSmith ? 'armor' : 'weapon'), data.name);
      return;
    }

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

  // The cave's stone door: needs a ruby, sapphire, emerald and the Crest Stone (data/sealed-door.json); they are used up.
  sealedDoor(npc, data) {
    const gs = this.gameState;
    const names = Object.fromEntries(Object.entries(itemsData.items).map(([id, it]) => [id, it.name]));
    const missing = missingForDoor(gs, doorCfg, names);
    const first = !gs.flags.met_sealeddoor;
    gs.flags.met_sealeddoor = true;
    const lines = [...(first ? data.lines : data.repeatLines)];
    if (missing.length > 0) {
      lines.push(`You still need: ${missing.join(', ')}.`);
      this.runConvo({ lines }, data.name);
      return;
    }
    lines.push('You are carrying everything the door asks for.');
    this.runConvo(
      {
        lines,
        choice: {
          options: ['Place them', 'Not yet'],
          onPick: (i) => {
            if (i !== 0) return null;
            const r = openDoor(gs, doorCfg, names);
            if (!r.ok) return { lines: ['Something is missing.'] };
            this.refreshOpenNpcs();
            this.cameras.main.flash(400, 255, 255, 255);
            this.cameras.main.shake(900, 0.006);
            this.saveQuiet();
            return {
              lines: [
                'One by one the gems sink into the sockets and glow. The Crest Stone clicks into place.',
                'The stone door grinds open on a dark passage.',
              ],
              afterClose: () => 'The stone door is open!',
            };
          },
        },
      },
      data.name
    );
  }

  // NPCs with an openFlag switch to their "open" look when the flag is set (also called when a co-op friend opens it)
  // the Waystone Charm: pick a lit waystone to travel to
  openWaystones() {
    const gs = this.gameState;
    if (this.choice.isOpen || this.dialogue.isOpen || this.moving || this.transitioning) return;
    const lit = waystoneData.filter((w) => gs.flags[w.flag]);
    const options = lit.map((w) => ({ label: w.label + (w.map === gs.map ? ' (here)' : ''), disabled: w.map === gs.map }));
    options.push({ label: 'Cancel', disabled: false });
    this.choice.open(options, { onSelect: (i) => i < lit.length && this.teleportTo(lit[i]) });
  }

  teleportTo(w) {
    this.transitioning = true;
    this.touchDir = { x: 0, y: 0 };
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.gameState.map = w.map;
      this.gameState.tile = { x: w.x, y: w.y };
      SaveManager.save(this.gameState);
      this.scene.restart();
    });
  }

  // a door NPC with needFlags opens itself (sets its openFlag) once every needed flag is set
  checkRuneDoors() {
    const gs = this.gameState;
    this.npcs.forEach((n) => {
      if (!n.needFlags || !n.openFlag || gs.flags[n.openFlag]) return;
      if (n.needFlags.every((f) => gs.flags[f])) {
        gs.flags[n.openFlag] = true;
        this.time.delayedCall(700, () => this.showToast('A heavy door grinds open somewhere nearby...'));
      }
    });
    this.refreshOpenNpcs();
  }

  refreshOpenNpcs() {
    const gs = this.gameState;
    this.npcs.forEach((n) => {
      if (!n.openFlag || !gs.flags[n.openFlag]) return;
      if (n.openTexture) n.sprite.setTexture(n.openTexture);
      if (n.openDialogue) n.dialogue = n.openDialogue;
    });
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

  // ---------- Co-op ----------

  // everyone else in the world right now: { name: {n, m: map, x, y, d: direction} }
  coopPlayers(players) {
    const gs = this.gameState;
    const here = {};
    Object.entries(players).forEach(([k, p]) => {
      if (p.m === gs.map) here[k] = p;
    });
    Object.keys(this.remoteSprites).forEach((k) => {
      if (here[k] && here[k].nj === this.remoteSprites[k].nj) return; // (a changed colour rebuilds the sprite)
      this.remoteSprites[k].sprite.destroy();
      this.remoteSprites[k].label.destroy();
      this.remoteSprites[k].pet?.destroy();
      delete this.remoteSprites[k];
    });
    Object.entries(here).forEach(([k, p]) => {
      const px = p.x * TILE;
      const py = (p.y + 1) * TILE;
      const dir = ['down', 'left', 'right', 'up'].includes(p.d) ? p.d : 'down';
      let r = this.remoteSprites[k];
      if (!r) {
        const tex = this.ninjaTexture(p.nj);
        const sprite = this.add.sprite(px, py, tex, 1).setOrigin(0, 1).setDepth(9);
        if (!p.nj || p.nj === ninjaId(gs)) sprite.setTint(0x9fd0ff); // same colour as you (or unknown): tinted blue so you can tell who is who
        const label = this.add
          .text(px + 8, py - 26, p.n ?? k, { fontSize: '8px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2 })
          .setOrigin(0.5, 1)
          .setDepth(11);
        r = { sprite, label, x: p.x, y: p.y, pet: null, petKind: null, tex, nj: p.nj };
        this.remoteSprites[k] = r;
        this.standRemote(sprite, dir);
      }
      this.syncRemotePet(r, p);
      if (r.x === p.x && r.y === p.y) return;
      if (r.pet) this.tweens.add({ targets: r.pet, x: r.x * TILE, y: r.y * TILE, duration: 150 }); // it hops into the tile they left
      r.x = p.x;
      r.y = p.y;
      this.tweens.killTweensOf(r.sprite);
      r.sprite.play(this.walkKey(r.tex, dir), true);
      this.tweens.add({
        targets: r.sprite,
        x: px,
        y: py,
        duration: MOVE_MS,
        onUpdate: () => r.label.setPosition(r.sprite.x + 8, r.sprite.y - 26),
        onComplete: () => this.standRemote(r.sprite, dir),
      });
    });
  }

  // show (or hide) the friend a co-op player has brought along
  syncRemotePet(r, p) {
    const kind = friendDefs.kinds[p.c];
    if (!kind) {
      if (r.pet) r.pet.destroy();
      r.pet = null;
      r.petKind = null;
      return;
    }
    if (r.pet && r.petKind !== p.c) {
      r.pet.destroy();
      r.pet = null;
    }
    if (!r.pet) {
      r.pet = this.add.image(r.x * TILE, r.y * TILE, kind.texture).setOrigin(0, 0).setDepth(7);
      r.petKind = p.c;
    }
  }

  // ---------- Ninja colour (see ninja.js) ----------

  // the texture key for a colour: 'player' for the original red, otherwise a recoloured copy made once from the sheet
  ninjaTexture(id) {
    const cid = NINJA_COLORS[id] ? id : 'red';
    const key = cid === 'red' ? 'player' : `player-${cid}`;
    if (!this.textures.exists(key)) {
      const src = this.textures.get('player').getSourceImage();
      const cv = document.createElement('canvas');
      cv.width = src.width;
      cv.height = src.height;
      const ctx = cv.getContext('2d');
      ctx.drawImage(src, 0, 0);
      const img = ctx.getImageData(0, 0, cv.width, cv.height);
      recolorData(img.data, cid);
      ctx.putImageData(img, 0, 0);
      const tex = this.textures.addCanvas(key, cv);
      for (let i = 0; i < 12; i++) tex.add(i, 0, (i % 3) * 16, Math.floor(i / 3) * 24, 16, 24);
    }
    ['down', 'left', 'right', 'up'].forEach((dir, row) => {
      const ak = this.walkKey(key, dir);
      if (this.anims.exists(ak)) return;
      this.anims.create({
        key: ak,
        frames: this.anims.generateFrameNumbers(key, { frames: [row * 3 + 1, row * 3, row * 3 + 1, row * 3 + 2] }),
        frameRate: 8,
        repeat: -1,
      });
    });
    return key;
  }

  walkKey(tex, dir) {
    return tex === 'player' ? `walk-${dir}` : `walk-${tex}-${dir}`;
  }

  // switch colour now: the sprite changes at once and the other players see it
  setNinja(id) {
    const gs = this.gameState;
    gs.ninja = NINJA_COLORS[id] ? id : 'red';
    this.playerTex = this.ninjaTexture(gs.ninja);
    this.player.setTexture(this.playerTex);
    this.faceFrame(this.facing);
    if (Coop.active && Coop.me) Coop.sendPresence(Coop.me.m, Coop.me.x, Coop.me.y, Coop.me.d);
    this.saveQuiet();
  }

  // the first time (every save that has not chosen yet): which ninja are you?
  chooseNinja() {
    if (this.choice.isOpen || this.dialogue.isOpen || this.transitioning) return;
    this.showToast('Which ninja are you?');
    this.choice.open(NINJA_IDS.map((id) => NINJA_COLORS[id].name), {
      onSelect: (i) => {
        if (i >= 0 && i < NINJA_IDS.length) this.setNinja(NINJA_IDS[i]);
      },
    });
  }

  standRemote(sprite, dir) {
    sprite.anims.stop();
    sprite.setFrame({ down: 0, left: 1, right: 2, up: 3 }[dir] * 3 + 1);
  }

  // the shared world changed in the cloud (paths like plots/farm/3,8 or targets/forest/boulder)
  coopSharedChanged(paths) {
    const gs = this.gameState;
    let freed = false;
    paths.forEach((path) => {
      const [section, a, b] = path.split('/');
      if (section === 'plots' && a === gs.map && this.crops) {
        const [x, y] = b.split(',').map(Number);
        this.refreshPlot(x, y);
      } else if (section === 'targets' && a === gs.map) {
        const t = this.targets.find((o) => o.id === b);
        if (t) this.syncTargetVisual(t);
      } else if (section === 'enemies' && a === gs.map && this.enemies) {
        const rec = gs.enemies[a]?.[b];
        if (rec) this.enemies.removeRemote(b, rec.respawnAt);
        else this.enemies.reviveRemote(b);
      } else if (path.startsWith('flags/') && owedGifts(gs, path.slice(6)).length) {
        giveGifts(gs, owedGifts(gs, path.slice(6))).forEach((msg) => this.showToast(msg));
        this.updateHud();
      } else if (this.boss && path === `flags/${this.boss.flag}`) {
        freed = true;
      } else if (this.npcs.some((n) => n.openFlag && path === `flags/${n.openFlag}`)) {
        this.refreshOpenNpcs();
      }
    });
    this.checkRuneDoors();
    if (freed && this.boss && !this.boss.good && !this.transitioning) {
      this.showToast(`${this.boss.name ?? 'The boss'} has been beaten by a friend!`);
      this.time.delayedCall(1500, () => {
        if (this.transitioning) return;
        this.transitioning = true;
        this.saveQuiet();
        this.scene.restart(); // the forest rebuilds with the treant freed
      });
    }
  }

  // make a target look like its saved state says (used when someone else changes it)
  syncTargetVisual(t) {
    const gs = this.gameState;
    if (isCleared(gs, gs.map, t.id)) {
      if (!t.respawnMs) {
        this.targets = this.targets.filter((o) => o !== t);
        t.sprite.destroy();
      } else if (t.active) {
        t.active = false;
        t.sprite.setTexture(t.stump).setDepth(3);
      }
    } else if (!t.active) {
      t.active = true;
      this.applyVariant(t);
      t.sprite.setTexture(t.texture).setDepth(4);
    } else {
      this.applyVariant(t);
    }
  }

  // quiet save (no toast), used after story moments
  saveQuiet() {
    this.gameState.tile = { ...this.tile };
    SaveManager.save(this.gameState);
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
    this.updateDarkness(_time);
    this.updateDayNight(_time);
    this.fishing.update(this.time.now);
    this.updateBuffHud();
    this.updateAudio(_time);
    this.updateRabbit(delta);
    if (!(this.transitioning || this.dialogue.isOpen || this.choice.isOpen || this.bag.isOpen)) {
      this.enemies.update(_time);
      this.updatePetFight();
      if (this.boss) this.boss.update(_time);
      this.updateWalkers(_time);
    }

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

  // ---------- Day and night (see daynight.js) ----------

  phaseNow() {
    return this.forcedPhase ?? phaseAt(Date.now(), this.cycleMs);
  }

  createDayNight() {
    this.dayOverlay = null;
    this.nightBugs = [];
    this.waystoneGlows = [];
    this.dnTick = 0;
    if (!OUTDOOR.includes(this.gameState.map)) return;
    this.dayOverlay = this.add.rectangle(0, 0, 320, 240, 0xffffff).setOrigin(0, 0).setScrollFactor(0).setDepth(90).setBlendMode(Phaser.BlendModes.MULTIPLY);
    // fireflies drifting about after dark
    const W = this.map.widthInPixels;
    const H = this.map.heightInPixels;
    for (let i = 0; i < 14; i++) {
      const b = this.add.rectangle(Math.random() * W, Math.random() * H, 2, 2, 0xfff08a).setDepth(92).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: b, x: b.x + (Math.random() * 40 - 20), y: b.y + (Math.random() * 30 - 15), duration: 2500 + Math.random() * 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.nightBugs.push({ obj: b, seed: Math.random() * 6 });
    }
    // lit waystones shine at night
    if (!this.textures.exists('glow')) {
      const cv = this.textures.createCanvas('glow', 32, 32);
      const ctx = cv.getContext();
      const gr = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
      gr.addColorStop(0, 'rgba(150,255,235,0.9)');
      gr.addColorStop(1, 'rgba(150,255,235,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 32, 32);
      cv.refresh();
    }
    this.npcs.filter((n) => String(n.id).startsWith('waystone')).forEach((n) => {
      const g = this.add.image(n.x * TILE + 8, n.y * TILE + 8, 'glow').setDepth(91).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      this.waystoneGlows.push({ img: g, npc: n });
    });
    this.dnTick = 0;
    this.updateDayNight(this.time.now, true);
  }

  updateDayNight(time, first = false) {
    const night = isNightPhase(this.phaseNow());
    if (night !== this.isNight) {
      this.isNight = night;
      this.enemies.applyDayNight(night);
      if (OUTDOOR.includes(this.gameState.map)) this.showToast(night ? 'Night falls. Creatures are stirring...' : 'The sun rises.');
    }
    if (!this.dayOverlay || (!first && time < this.dnTick)) return;
    this.dnTick = time + 120;
    const phase = this.phaseNow();
    this.dayOverlay.setFillStyle(toHex(nightTint(this.gameState, Date.now(), skyColor(phase)))); // Owl-Eye lifts the night
    const d = darkness(phase);
    this.nightBugs.forEach((b, i) => b.obj.setAlpha(d * (0.45 + 0.55 * Math.sin(time / 320 + b.seed))));
    this.waystoneGlows.forEach((g) => g.img.setAlpha(this.gameState.flags[g.npc.openFlag] ? d * 0.8 : 0));
  }

  // ---------- Darkness (the cave) ----------

  createDarkness() {
    if (!this.textures.exists('lantern-light')) {
      const c = this.textures.createCanvas('lantern-light', 160, 160);
      const ctx = c.getContext();
      const g = ctx.createRadialGradient(80, 80, 10, 80, 80, 80);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 160, 160);
      c.refresh();
    }
    this.darkRT = this.add.renderTexture(0, 0, 320, 240).setOrigin(0, 0).setScrollFactor(0).setDepth(90);
    this.lightImg = this.make.image({ key: 'lantern-light', add: false }).setOrigin(0.5, 0.5);
  }

  updateDarkness(time) {
    if (!this.darkRT) return;
    const cam = this.cameras.main;
    this.darkRT.clear();
    this.darkRT.fill(0x05030c, 0.94);
    const flicker = 1 + Math.sin(time / 170) * 0.025 + Math.sin(time / 53) * 0.015; // a gentle lantern flicker
    const bright = this.gameState.items['crystal-lantern'] > 0 ? 1.5 : 1; // the Crystal Lantern lights a much bigger circle
    this.lightImg.setScale(flicker * bright * lightScale(this.gameState, Date.now())); // an Owl-Eye Brew lights a bigger circle
    this.darkRT.erase(this.lightImg, this.player.x + 8 - cam.scrollX, this.player.y - 12 - cam.scrollY);
  }

  // ---------- Walking NPCs ----------

  // can this NPC step onto tile (x, y)?
  npcCanStep(n, x, y) {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return false;
    if (this.obstacles && this.obstacles.getTileAt(x, y) !== null) return false;
    if (this.crops && this.crops.getTileAt(x, y) !== null) return false; // stay out of the crop plots
    if (this.tile.x === x && this.tile.y === y) return false;
    if (this.npcs.some((o) => o !== n && o.x === x && o.y === y)) return false;
    if (this.targetAt(x, y)) return false;
    if (this.doors.some((d) => x >= d.x0 && x <= d.x1 && y >= d.y0 && y <= d.y1)) return false; // never stand in a doorway
    if (this.enemies && this.enemies.at(x, y)) return false;
    if (this.boss && this.boss.occupies(x, y)) return false;
    if (this.rabbit && rabbitOnMap(this.rabbit) && this.rabbit.x === x && this.rabbit.y === y) return false;
    if (Object.values(this.remoteSprites ?? {}).some((r) => r.x === x && r.y === y)) return false; // a co-op friend
    return true;
  }

  // stop animating and show the standing pose facing a direction
  standNpc(n, dir) {
    if (!n.sheet) return;
    n.sprite.anims.stop();
    n.sprite.setFrame(DIRS.indexOf(dir) * 3 + 1);
  }

  updateWalkers(now) {
    if (this.dialogue.isOpen || this.choice.isOpen || this.bag.isOpen || this.transitioning) return; // everyone waits while you talk
    this.npcs.forEach((n) => {
      if (!n.walk || n.moving || now < n.nextStep) return;
      n.nextStep = now + n.pauseMs * (0.5 + Math.random());
      const dirs = Phaser.Utils.Array.Shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      for (const [dx, dy] of dirs) {
        const nx = n.x + dx;
        const ny = n.y + dy;
        if (Math.abs(nx - n.home.x) > n.walk || Math.abs(ny - n.home.y) > n.walk) continue;
        if (!this.npcCanStep(n, nx, ny)) continue;
        n.moving = true;
        n.x = nx; // the tile is taken straight away so nobody walks into the same spot
        n.y = ny;
        const dir = this.dirName({ x: dx, y: dy });
        const oy = n.sheet ? TILE : 0; // an animated sprite's origin is its feet
        if (n.sheet) n.sprite.play(`${n.sheet}-${dir}`, true);
        this.tweens.add({
          targets: n.sprite,
          x: nx * TILE,
          y: ny * TILE + oy,
          duration: n.stepMs,
          onComplete: () => {
            n.moving = false;
            this.standNpc(n, dir);
          },
        });
        break;
      }
    });
  }

  tryMove(dx, dy) {
    if (this.fishing.active) this.fishing.cancel('You pulled in your line.');
    this.facing = { x: dx, y: dy }; // turn to face that way, even if blocked

    const nx = this.tile.x + dx;
    const ny = this.tile.y + dy;
    if (!this.canWalk(nx, ny)) {
      this.faceFrame(this.facing); // bumped into something: just turn to face it
      const locked = this.lockedDoorAt(nx, ny);
      if (locked && !this.toast.alpha) this.showToast(locked.lockedMsg);
      else if (this.thinIceAt(nx, ny) && !this.toast.alpha) this.showToast('The ice is too thin and slippery. Boots with a good grip might help.');
      return;
    }

    this.moving = true;
    const prevTile = this.tile;
    this.tile = { x: nx, y: ny };
    this.friends.onStep(prevTile);
    if (Coop.active) Coop.sendPresence(this.gameState.map, nx, ny, this.dirName(this.facing));
    this.player.play(this.walkKey(this.playerTex, this.dirName(this.facing)), true);
    this.tweens.add({
      targets: this.player,
      x: nx * TILE,
      y: (ny + 1) * TILE,
      duration: moveMs(this.gameState, Date.now(), MOVE_MS), // a Swift Brew makes you quicker
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

  // thin ice (a map property thinIceGid = the ground tile number) can only be crossed in Frost Boots
  thinIceAt(x, y) {
    const gid = this.thinIceGid;
    if (!gid || !this.groundLayer) return false;
    const t = this.groundLayer.getTileAt(x, y);
    return !!t && t.index === gid && !(this.gameState.items['frost-boots'] > 0);
  }

  lockedDoorAt(x, y) {
    const d = this.doors.find((o) => x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1);
    if (!d) return null;
    const noItem = d.requiresItem && !(this.gameState.items[d.requiresItem] > 0);
    const noFlag = d.requiresFlag && !this.gameState.flags[d.requiresFlag];
    return noItem || noFlag ? d : null;
  }

  checkDoor() {
    const { x, y } = this.tile;
    const door = this.doors.find((d) => x >= d.x0 && x <= d.x1 && y >= d.y0 && y <= d.y1);
    if (door) this.useDoor(door);
  }

  useDoor(door) {
    this.transitioning = true;
    audio.sfx('door');
    this.touchDir = { x: 0, y: 0 };
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.gameState.map = door.toMap;
      this.gameState.tile = { x: door.toX, y: door.toY };
      SaveManager.save(this.gameState); // autosave on every map change
      this.scene.restart(); // create() builds the new map from gameState
    });
  }

  canWalk(x, y) {
    // stay inside the map
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return false;
    // NPCs block the way
    if (this.npcAt(x, y)) return false;
    // a door that needs an item you do not have
    if (this.lockedDoorAt(x, y)) return false;
    if (this.thinIceAt(x, y)) return false;
    // so does a rabbit sitting on a tile
    if (this.rabbit && rabbitOnMap(this.rabbit) && this.rabbit.x === x && this.rabbit.y === y) return false;
    // so does an enemy
    if (this.enemies && this.enemies.at(x, y)) return false;
    // the treant fills a 2x2 block
    if (this.boss && this.boss.occupies(x, y)) return false;
    // dirt piles, trees and rocks block the way until they are cleared
    if (this.targetAt(x, y)) return false;
    // any tile painted on the "obstacles" layer blocks movement
    return !this.obstacles || this.obstacles.getTileAt(x, y) === null;
  }
}
