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
- `src/quests.js`: quest-giver conversations (farmer), no Phaser
- `src/rabbit.js`: the garden rabbit's timer state machine, no Phaser
- `src/tools.js`: tools that wear out (use, repair) and targets you work on with them (dirt pile, trees, rocks), no Phaser
- `src/ChoiceMenu.js`: tappable / keyboard choice menu, reusable (quest confirm now; shop, battles, inventory later)
- `src/data/tools.json`: tool durability, shop price, repair materials (axe and pickaxe values are placeholders)
- `src/data/dialogue.json`, `src/data/quests.json`: all NPC text and quest requests
- `public/assets/`: maps (Tiled JSON), tilesets, sprites, items, UI. `public/assets/README.md` lists sizes.
- `make_assets.py`, `make_placeholders.py`, `make_farm_assets.py`: generate the placeholder art and maps

## Maps (Tiled)
- Add a map: save `public/assets/maps/<name>.json`, add `<name>` to `MAPS` in `WorldScene.js`.
- Add a tileset: save `public/assets/tilesets/<name>.png`, add it to `TILESETS`. The name must match Tiled.
- Tile layer named `obstacles` blocks walking. Tile layer named `crops` makes plots (needs the `farm-tiles` tileset).
- Object layer `doors`: rectangles with properties `toMap` (string), `toX`, `toY` (ints). Land next to the door, not on it.
- Object layer `npcs`: rectangles with properties `id`, `texture` (`npc`), `dialogue` (key in dialogue.json).
- Object layer `targets`: rectangles with `id` (unique per map), `texture` (must be preloaded in WorldScene), `tool`
  (key in tools.json), `hits` (swings needed). Optional: `flag` (set when cleared), `drop` + `dropAmount` (item gained),
  `hint` (shown when you lack the tool), `clearedMsg`. Targets block walking until cleared, and cleared state is saved.
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

## Next up (to-do list)
Done: choice menu, tools with wear, the tool-on-target system, the landslide (first target).
Still to do, roughly in this order:
1. Shop / bazaar (farm map). Outdoor stall vs interior map is undecided. First stock: a bigger water pail (6 -> more),
   then tools (buy a replacement axe etc.) and future items. Prices live in a data file. Uses ChoiceMenu.
2. Forest zone (door at the south end of the town road): choppable trees (targets with tool `axe`, drop `wood`),
   a lumberjack NPC (like the farmer) who gives an axe and asks for wood; he can also repair tools for materials
   (`repairTool` already exists). Next drop / boss undecided. Safety net: a free basic axe if stuck.
3. Mining corner between farm and forest: rocks (tool `pickaxe`, drop `stone`), a pickaxe (source undecided), and a big
   cave that exits at the far corner of the map into a new, still-unnamed land.
4. A princess somewhere in the story. Her role is undecided (quest giver, rescue goal, mentor?).

Also still open: walking animations (once there is sprite art), battles and the inventory screen.

## Caveats
Logic modules (farming, quests, rabbit) have been tested in Node. Scene/graphics code is built but was written
without being run in a browser, so test new features on desktop and phone.
