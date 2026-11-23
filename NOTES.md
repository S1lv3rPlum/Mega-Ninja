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
- `src/data/dialogue.json`, `src/data/quests.json`: all NPC text and quest requests
- `public/assets/`: maps (Tiled JSON), tilesets, sprites, items, UI. `public/assets/README.md` lists sizes.
- `make_assets.py`, `make_placeholders.py`, `make_farm_assets.py`: generate the placeholder art and maps

## Maps (Tiled)
- Add a map: save `public/assets/maps/<name>.json`, add `<name>` to `MAPS` in `WorldScene.js`.
- Add a tileset: save `public/assets/tilesets/<name>.png`, add it to `TILESETS`. The name must match Tiled.
- Tile layer named `obstacles` blocks walking. Tile layer named `crops` makes plots (needs the `farm-tiles` tileset).
- Object layer `doors`: rectangles with properties `toMap` (string), `toX`, `toY` (ints). Land next to the door, not on it.
- Object layer `npcs`: rectangles with properties `id`, `texture` (`npc`), `dialogue` (key in dialogue.json).
- Use plain rectangle objects, not "Insert Tile" objects.

## Game state (saved as one object)
`map`, `tile {x,y}`, `hp`, `gold`, `flags {}`, `items {seeds, wheat, shovel}`, `can {water, max}`,
`plots {map: {"x,y": {stage, growsAt}}}`, `quests {npcId: {index}}`, `drops {map: [{x,y,item}]}`.

## Design decisions
- Farm loop: plant (seed) -> water at each of 3 stages -> harvest. Each watering starts a growth timer
  (`GROW_MS` in farming.js, 15 s while testing). Timers use real time and are saved, so crops grow while away.
- Plot icons: blue drop = thirsty, dark soil = watered, yellow sparkle = ready.
- Harvest gives 1 wheat and 1-2 seeds back. Farmer gives 10 starter seeds, and 3 free seeds if you are stuck.
- Farmer only trades for the item he is currently asking for (quests.json: 5 wheat/25g, 10/60g, 20/150g, then repeats).
- Rabbit (after meeting the farmer): 30 s cooldown, sits on a plot 5 s, eats it, sits 5 s, hops away.
  Catch it by facing it and pressing F, press F again to throw. The first throw drops a shovel (needed in the next map).

## Next up
1. Bazaar in the farm map with a shopkeeper (needs a tappable choice menu; the menu is reusable for battles and inventory).
2. The next map, where the shovel is needed.
3. Walking animations once there is sprite art.
4. Battles and inventory screen.

## Caveats
Logic modules (farming, quests, rabbit) have been tested in Node. Scene/graphics code is built but was written
without being run in a browser, so test new features on desktop and phone.
