# Mega-Ninja: project notes

A 2D, top-down, grid-based RPG (Pokémon/Zelda style) that runs in the browser.
Phaser 3 + Vite, hosted on GitHub Pages (deploys from `main` via `.github/workflows/deploy.yml`).
Decision: it stays 2D.

## Run
    npm install
    npm run dev      # local dev server
    npm run build    # static files in dist/

## Controls
Arrows / WASD move. Space / Enter / Z (or the A button on phones) talk and interact.
F (or the F button) picks up / throws. P (or the SAVE button) saves to this browser.

## Where things live
- `src/main.js`: game config, scene list (Title, World)
- `src/scenes/TitleScene.js`: logo, New Game / Continue
- `src/scenes/WorldScene.js`: the map, player, NPCs, doors, farming interaction, rabbit, HUD, touch controls
- `src/DialogueBox.js`: tap/key-to-advance dialogue with typewriter text
- `src/SaveManager.js`: localStorage save/load (key `mega-ninja-save`)
- `src/farming.js`: plot rules (plant, water, grow, harvest), no Phaser
- `src/quests.js`: quest-giver conversations (farmer, lumberjack), no Phaser. Conversation steps: `{lines, afterClose, choice}`; `WorldScene.runConvo` plays them.
- `src/rabbit.js`: the garden rabbit's timer state machine, no Phaser
- `src/tools.js`: tools that wear out (use, repair) and targets you work on with them (dirt pile, trees, rocks), no Phaser
- `src/shop.js`: market stall offers and buying (seeds, bigger pail, replacement tools), no Phaser. Stock lives in `src/data/shop.json`.
- `src/ChoiceMenu.js`: tappable / keyboard choice menu, reusable (quest confirm now; shop, battles, inventory later)
- `src/data/tools.json`: tool durability, shop price, repair materials (axe and pickaxe values are placeholders)
- `src/data/dialogue.json`, `src/data/quests.json`: all NPC text and quest requests
- `public/assets/`: maps (Tiled JSON), tilesets, sprites, items, UI. `public/assets/README.md` lists sizes.
- `make_assets.py`, `make_placeholders.py`, `make_farm_assets.py`, `make_forest_shop_assets.py`: generate the placeholder art and maps (the last one adds the forest, market stall, and patches town.json and farm.json)

## Maps (Tiled)
- Add a map: save `public/assets/maps/<name>.json`, add `<name>` to `MAPS` in `WorldScene.js`.
- Add a tileset: save `public/assets/tilesets/<name>.png`, add it to `TILESETS`. The name must match Tiled.
- Tile layer named `obstacles` blocks walking. Tile layer named `crops` makes plots (needs the `farm-tiles` tileset).
- Object layer `doors`: rectangles with properties `toMap` (string), `toX`, `toY` (ints). Land next to the door, not on it.
- Object layer `npcs`: rectangles with properties `id`, `texture` (`npc`), `dialogue` (key in dialogue.json).
- Object layer `targets`: rectangles with `id` (unique per map), `texture` (must be preloaded in WorldScene), `tool`
  (key in tools.json), `hits` (swings needed). Optional: `flag` (set when cleared), `drop` + `dropAmount` (item gained),
  `hint` (shown when you lack the tool), `clearedMsg`, `respawnMs` (a tree: leaves a stump and grows back; 0 = gone for good). Targets block walking until cleared, and cleared state is saved.
- Use plain rectangle objects, not "Insert Tile" objects.

## Game state (saved as one object)
`map`, `tile {x,y}`, `hp`, `gold`, `flags {}`, `items {seeds, wheat, shovel}`, `can {water, max}`,
`plots {map: {"x,y": {stage, growsAt}}}`, `quests {npcId: {index}}`, `drops {map: [{x,y,item}]}`,
`tools {shovel: {dur}}` (dur 0 = broken), `targets {map: {id: {hits, cleared}}}`.

## Design decisions
- Farm loop: plant (seed) -> water at each of 3 stages -> harvest. Each watering starts a growth timer
  (`GROW_MS` in farming.js, 15 s while testing). Timers use real time and are saved, so crops grow while away.
- Plot icons: blue drop = thirsty, dark soil = watered, yellow sparkle = ready.
- Harvest gives 1 wheat and 1-2 seeds back. Farmer gives 10 starter seeds, and 3 free seeds if you are stuck.
- Farmer only trades for the item he is currently asking for (quests.json: 5 wheat/25g, 10/60g, 20/150g, then repeats).
- Rabbit (after meeting the farmer): 30 s cooldown, sits on a plot 5 s, eats it, sits 5 s, hops away.
  Catch it by facing it and pressing F, press F again to throw. The first throw drops a shovel; pick it up with F.
- Tools wear: every swing costs 1 durability; at 0 the tool is broken and does nothing until repaired or replaced.
- Town: a treeline across the map (row 15) with a dirt pile in the gap on the south road. The shovel clears it (5 swings).
  The villager NPC explains and hints at the rabbits. The south end of the road has no door yet (forest map comes later).
- The farmer asks "Hand it over / Not yet" before taking wheat (first use of the choice menu).
- Walking sprite: `player-walk.png`, 16x24 frames, 3 columns (step, stand, step) x 4 rows (down, left, right, up).
  Character art templates: 4x size (64x96 frames) sheets of the same layout; separate walk and attack sheets.
- Market stall (farm map, east of the pump): shopkeeper with `shop: general`. Sells 5 seeds (10g), a bigger watering can in
  steps (10 for 50g, 15 for 120g, 20 for 250g), and a new axe (40g, only when you have none or yours is broken).
- Forest (door at the south end of the town road, past the landslide): 28 choppable trees (3 swings, drop 2 wood, grow back
  after 45 s, shown as stumps meanwhile). Lumberjack gives an axe on first meeting, buys wood (6/30g, 12/80g, 20/160g, then repeats),
  repairs the axe for 6 wood, and gives a free spare axe (9 uses) if you are stuck (broken axe, no wood, no gold).

## Next up (to-do list)
Done: choice menu, tools with wear, tool-on-target system, landslide, market stall, forest + lumberjack, walking sprite.
Still to do:
1. Mining corner between farm and forest: rocks (tool `pickaxe`, drop `stone`), a pickaxe (source undecided; `tools.json`
   has placeholder price and repair), and a big cave that exits at the far corner of the map into a new, unnamed land.
   The forest has no east exit yet; the farm has no south exit yet.
2. Forest boss / special drop (undecided).
3. A princess somewhere in the story. Her role is undecided (quest giver, rescue goal, mentor?).
4. Attack animation: wire in the attack sheet once the art exists. Open decisions: real-time swings (Zelda) vs separate
   battle screen (Pokemon); key to attack (suggest J, plus a B button on phones).
5. NPC sprites: currently single standing images; add walking-sheet support when sheets exist.
6. Battles, enemies and the inventory screen.

## Caveats
Logic modules (farming, quests, rabbit) have been tested in Node. Scene/graphics code is built but was written
without being run in a browser, so test new features on desktop and phone.

## Bag / Coin Pouch (inventory UI)
- `src/InventoryScreen.js` (Phaser overlay), `src/inventory.js` (pure logic, no Phaser), `src/data/items.json` (names, icons, colours, descriptions; also the purse name).
- Open with I or Tab, or the BAG button on phones. Arrows/WASD move, Esc/X/I/CLOSE button close. Tools show a wear bar.
- HUD now shows only gold (coin icon) and water, plus a warning when a tool is at 25% wear or broken. Everything else lives in the bag.
- To add a new item: add it to `items.json` (icon = seeds, wheat, log, rock, gem, ...; colour hex) and put a count in `gs.items[id]`. Slots appear automatically once the count is above 0.

## Design notes for upcoming mining and boss work (from Renee)
- Rocks spawn in RANDOM colours (not fixed per rock). Each colour = a different number of swings and a specific gem drop. Rarer gems spawn less often (weighted). One rock colour drops a DIAMOND (rarest).
- Boulder blocking the road east of the forest: pickaxe only, many swings (about 12), cleared for good.
- Pickaxe source: forest boss, something 'evil' that introduces the game's evil and leads up to a main boss. Boss is something to ATTACK (needs the attack key/animation and combat decisions). Shop sells a pickaxe (60g) as a safety net.
- Princess role still undecided; idea: she asks for a particular gem.
- Sprite size decision: stay at 16px tiles, 16x24 walking frames (Game Boy / Pokemon scale). Templates are 16x24 (walk) and 24x24 (attack), 1px outline.

## Mining update (quarry, coloured rocks, boulder)
- New map `quarry` (registered in MAPS; tileset `mine-tiles` in TILESETS). Reached by the forest's east road, which is blocked by a boulder (target `boulder`, 12 pickaxe swings, drops 5 stone, flag `boulder_cleared`, gone for good).
- Rocks: targets with property `variants = "rocks"` take a random kind from `src/data/rocks.json` (weights make gems rarer; diamond weight 2). Kind is stored in the save (`gs.targets[map][id].variant`) so reloading doesn't re-roll it; when a rock grows back (60 s) it re-rolls. Edit rocks.json to change weights, swings or drops.
- Shop: sells a pickaxe (60g, only if you have none or it's broken), repairs it for stone ("Fix Pickaxe"), and buys stone/gems (`sell` prices in shop.json; sells the whole stack).
- Miner NPC in the quarry foreshadows trouble in the big cave (north-east). The cave mouth is drawn but blocked: next step is the boss / evil intro and the passage to the new land.
- Fixed: an empty toast drew a small dark box mid-screen (toast now starts hidden).
- `make_mining_assets.py` regenerates the placeholder art and quarry map (forest edit runs once).
