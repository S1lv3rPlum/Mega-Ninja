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

## Combat, sensei, save slots (update after mining)
- **Hearts**: 1 heart = 2 hp, `gs.hp` / `gs.maxHp` (default 20 = 10 hearts), drawn top right. Rules in `src/combat.js` (no Phaser, tested in `test_combat.mjs`).
- **Attack**: J key or B button swings the weapon (`gs.weapon`, defined in `data/weapons.json`) at the tile you face. Slash flash is a placeholder until the real attack sheet arrives.
- **Enemies** (`src/Enemies.js`, `data/enemies.json`): real-time on the grid. They chase within `sight` tiles, flash red, then strike if still adjacent. Defeated ones respawn after `respawnMs` (saved in `gs.enemies`). Add them in Tiled on an object layer named `enemies` (props: id, type, optional requiresFlag). Forest shadow sprouts need flag `got_sword`.
- **Fainting**: wake in town with full hp. `data/faint.json` -> `goldLossPercent` (currently 0) and `goldLossFlat` (optional) set the penalty.
- **Eating**: select food in the bag, press Space or tap EAT. Food = an item in `items.json` with `heal` (hp). Wheat heals 2.
- **Sensei** (town, NPC id `sensei`): quest giver; first request is 5 wood -> Training Sword (`give: {weapon:'sword'}`), then stone and copper for gold. Requests can override `ask`/`thanks` and give weapons. Armor/spells can reuse the same `give` idea later.
- **Save slots**: 3 named slots (`src/SaveManager.js`, title screen in `src/scenes/TitleScene.js`). Names are typed in a browser prompt. Old single saves move into slot 1. Autosave on every door and when fainting; bag has SAVE + TITLE to switch players.
- **Next**: boss in the forest (corrupted treant, two phases, redeemed after defeat, gives the never-empty cave lantern), then crops/foraging, crafting, potions.

## Crops, foraging, the treant boss (update after combat/saves)
- **Crops** (`data/crops.json`): wheat (item `seeds` = "Wheat Seeds"), carrot (9 s/stage), pumpkin (30 s/stage). A plot stores its crop (`plots[map]["x,y"].crop`, missing = wheat for old saves). With several seed types the player picks from a menu. Non-wheat crops are drawn as pictures (`crop-<name>-<stage>.png`, stages 2-4) over a dirt tile. To add a crop: add it to crops.json, add seed+harvest items to items.json, add the 3 stage pictures and list the name in WorldScene preload.
- **Foraging**: bushes are targets with no tool (`tool` = "") and `variants` = a table in `data/rocks.json` (`forageTown`, `forageForest`). They give seeds or herbs, and regrow in 90 s. Carrot seeds are also sold at the market. Selling: carrot 6g, pumpkin 25g, herb 3g.
- **HUD**: water only shows on maps that have plots; a "+2 Wood (7)" pickup line appears under the HUD whenever anything is added to the bag (any source). Toast messages now wrap.
- **Dialogue**: `DialogueBox.js` splits long lines into pages (max 88 chars) so nothing runs past the box.
- **Boss** (`src/Boss.js`, object `treant` on a `boss` layer in forest.json): Gnarl, a 2x2 corrupted treant (30 hp). Wakes when you come close while owning the sword (intro cutscene once, flag `treant_intro_seen`). Phase 1: root slams on your tile + 2 nearby tiles (red warning first). At half hp: faster, 4 extra tiles, calls sapling helpers (max 2). Weak to the axe: Space on it with a working axe = 4 damage and wears the axe. Sword = 2 damage. Tuning numbers are the `BOSS` object at the top of Boss.js.
- **After the win**: flag `treant_defeated`; sprouts disappear (`hideIfFlag`), dark tint on trees clears, Gnarl becomes a friendly NPC (`dialogue.json` key `treant`) and you receive the **Heartwood Lantern** (`items.lantern = 1`, never needs oil). Cave sign in the quarry (`cavesign`) reacts to the flag. The cave itself is still blocked: next step.
- Fainting during the fight resets the boss (the scene restarts); `faint.json` still decides the penalty.
- `make_boss_crops_assets.py` regenerates the placeholder art and map edits (runs once per map).

## Co-op world (4th slot on the title screen)
- Files: `coopLogic.js` (pure logic, tested by `test_coop.mjs`), `cloud.js` (Firebase REST + live stream, no npm package), `Coop.js` (the connection that lives across scene restarts), `firebaseConfig.js` (the database address; empty = co-op shows "not set up"), `database.rules.json`, `COOP_SETUP.md`.
- Cloud layout: `worlds/<CODE>/meta`, `/shared/{plots,targets,flags}`, `/chars/<name>`, `/players/<name>`.
- **Shared** = `gs.plots`, `gs.targets`, and world flags (`isWorldFlag` in coopLogic.js: `treant_defeated` and any flag ending `_cleared`). To share another flag, change that function. Everything else in the game state is personal.
- Shared changes are found by diffing every second (`Coop.tick`, called from WorldScene) and only the changed paths are sent. Incoming changes call `WorldScene.coopSharedChanged` (redraw plots, targets; restart the forest if the treant was freed elsewhere).
- Other players: `WorldScene.coopPlayers` draws a tinted copy of the player sprite with a name label. Presence is sent on every step and every 10 s; anyone quiet for 45 s disappears.
- Characters are keyed by lowercase name; the bag etc. is backed up to `chars/<name>` on every save (throttled 8 s) and autosaved every 20 s in co-op. The newer of the device copy and the cloud copy wins when joining.
- A player who arrives after `treant_defeated` is set gets the Heartwood Lantern automatically (WorldScene.create).
- Not done yet: shared enemies/boss fight, blocking other players' tiles, trading.

## Walking NPCs
- Any NPC object on a map's `npcs` layer walks if it has an int custom property **walkRadius** (e.g. 3): it strolls to neighbouring tiles within that many tiles of where you placed it. Without the property it stands still as before.
- Optional properties: `walkPauseMs` (average wait between steps, default 2200) and `walkStepMs` (time per step, default 450).
- They never step on obstacles, crop plots, doorways, targets (rocks, trees), enemies, the boss, the rabbit, you, or a co-op friend. They freeze while any dialogue, menu or the bag is open, so you can always talk to one.
- **Walking animation**: a walking NPC whose texture has a sheet named `<texture>-walk.png` in `public/assets/sprites/` is animated. The sheet is laid out exactly like the player's `player-walk.png`: 3 frames across (step, stand, step) x 4 rows (down, left, right, up), every frame 16x24, feet on the bottom edge. Example: texture `npc` uses `npc-walk.png` (a placeholder bobbing sheet made from `npc.png`). **To swap in real art: replace the PNG with the same layout.** For a new NPC: add its texture name to `NPC_WALK_SHEETS` at the top of WorldScene.js, add `<name>-walk.png`, and give the NPC a `walkRadius`. NPCs without a sheet still slide around as a single picture. A walking NPC also turns to face you when you talk to it.
- Code: `updateWalkers` / `npcCanStep` / `standNpc` in WorldScene.js.
- Town has a demo "wanderer" at (9,12), radius 2. Walking is not synced between co-op players (each device moves its own wanderers).

## The cave
- **Entrance**: a door object `to-cave` in quarry.json at tile (19,3), in the north cliff above the sign. A door can now have `requiresItem` (an item id, here `lantern`) and `lockedMsg`: without the item the tile is blocked and the message shows when you walk into it. Any door can use this.
- **Dark maps**: a map-level custom property `dark` = true (Map > Map Properties in Tiled) darkens the whole screen except a flickering lantern circle around the player (`createDarkness` / `updateDarkness` in WorldScene.js; circle size = the 160px `lantern-light` canvas, change the scale there). Enemies and rocks outside the circle are barely visible, on purpose.
- **cave.json** (30x22, tileset mine-tiles): entrance hall -> mining chamber (west) and bat hall (east) -> deep chamber with the sealed stone door (NPC `sealeddoor` at the top). 21 rocks use `variants: caveRocks` (rocks.json: same kinds as `rocks` but gems are more common), respawn after 2 minutes. 7 `bat` enemies (enemies.json: fast, 3 hp).
- **The sealed door** is the teaser for the next land: its dialogue says three empty sockets wait under a ninja crest. Idea for later: placing a ruby, sapphire and emerald opens it.
- `make_cave_assets.py` rebuilds the map, bat and door pictures, the quarry door and the data entries (it checks that every room can be reached without breaking a rock). Re-running it overwrites hand edits to cave.json, so after you start editing in Tiled, stop using the script.

## Granite (cave boss) and the stone door
- **Granite** (`src/Golem.js`, object `granite` with property `kind: golem` on cave.json's `boss` layer at tile (20,4)): a 2x2 round rock golem, 48 hp. Rockfall (red tiles, then rocks drop) and Roll (curls into a ball, a red lane shows the path, it rolls across, then sits dizzy: double damage). At half health it is faster and shakes loose up to 2 `pebble` helpers. Weak to the pickaxe (Space on it: 4 damage, 0.6 s between swings, wears the pickaxe); the sword does 2. Tuning numbers are the `GOLEM` object at the top of Golem.js. The scene picks the class from the boss object's `kind` (no kind = Gnarl the treant). Both bosses have a `toolHit()` and a `flag`.
- **After the fight**: flag `golem_defeated` (a shared co-op world flag: any flag ending `_defeated` or `_cleared` is shared), Granite becomes a friendly NPC (`granite` in dialogue.json) and gives the **Crest Stone** (`items['crest-stone']`, personal flag `got_crest`). A co-op friend who arrives later gets a Crest Stone too, once.
- **The stone door** (NPC `sealeddoor` at (21,1)): `src/door.js` + `data/sealed-door.json` say what it needs: ruby, sapphire, emerald and the Crest Stone (all used up). Talking to it lists what is missing, or offers "Place them". Opening sets the shared flag `stonedoor_cleared`; the NPC then swaps to `openTexture` and `openDialogue` (NPC properties `openFlag`, `openTexture`, `openDialogue` work for any NPC). The passage beyond just says "To be continued" for now. Tested by `test_door.mjs`.
- Taming/following creatures (Pokemon-style) was suggested by the kids: not built. Granite and the Pebbles would be natural first tamables. The Bat Queen is saved for a later boss.

## Friends (taming) 
- Small creatures only (bunny, shadow sprout, cave bat). Never bosses or boss helpers (saplings, pebbles). Nothing is fought: face the creature and press Space/A to offer its favourite treat.
- Treats + kinds are in `src/data/friends.json` (rabbit = carrot, shadow sprout = herb, bat = pumpkin). To make another enemy tameable: add a kind there and `"tame": "<kind>"` to that enemy in `enemies.json`.
- Up to 6 friends (`max`), one follows you (follow only, no fighting). PETS button / G key: choose who follows, rename, say goodbye.
- Befriending the first rabbit also gives the shovel (same as the old throw-out reward). F still catches and throws it.
- State: `gs.pets` [{id, kind, name}], `gs.companion`. Personal (not shared in co-op). Rules in `pets.js` (test: `test_pets.mjs`), scene code in `Friends.js`.

### Friends and enemies in co-op
- Defeated/befriended enemies are now SHARED (`gs.enemies` -> cloud `shared/enemies/<map>/<id>` = {respawnAt}): when one kid beats or befriends a bat or sprout, it vanishes for the other too (no reward for them) and grows back on the same timer. Enemy positions are NOT synced; each device moves its own copy.
- A player's companion is sent with their presence (`c` = kind, `cn` = name) so the other player sees the friend trailing them. Friends themselves stay personal (the Friends list is not shared).
- No change needed to `database.rules.json`.

## Crystal Caverns (beyond the stone door)
- Built by `make_crystal_assets.py` (map `crystal.json`, `crystal-tiles.png`, sprites, data). Re-running it overwrites hand edits to `crystal.json`; and re-running `make_cave_assets.py` afterwards would undo the door it adds to `cave.json`, so run the crystal script again after it.
- The stone door (NPC with `passable: yes`) can be walked through once `stonedoor_cleared` is set; a door object with `requiresFlag` sits behind it.
- Rooms: Glimmer Hall (arrive), Crystal Gallery (scout's note: princess + Moon Crest story beat), Moth Garden (tameable Crystal Moths, treat = Glow Crystal), Queen's Roost (Bat Queen), hidden nook (cold draft sign: the Shadow Market door goes here next).
- Bat Queen = a boss-type enemy in `enemies.json` (`boss`, `flag: batqueen_defeated`, `summon`, `reward`, `defeatLines`); only the sword/weapon is needed. Reward: Crystal Lantern (bigger light circle in dark maps; will also reveal the hidden market door). Late joiners and co-op friends get the lantern too.
- Crystal rocks (`crystalRocks`) drop Glow Crystals (sell 12) plus gems.

## Shadow Market (hidden dark-magic market behind the Caverns nook)
- Reached from the Crystal Caverns hidden nook; the crack in the wall only opens with the Crystal Lantern (door `requiresItem`). Built by `make_market_assets.py` (run `make_crystal_assets.py` first; it makes the door).
- Stalls: Hexsmith (weapon smith), Critter Seller (treats for friends), Charm Seller (buys gems/crystals at better prices), a closed stall (potions/brews later). 4 customers wander (`walkRadius`).
- Weapon smith (`smith.js`, test `test_smith.mjs`): unique weapons in `weapons.json` have `rank` and `smith: {gold, items}`. You can only order the next rank; the order is ready the next time you come back (`gs.marketVisits` goes up on each entry, `gs.smith = {id, visit}`). Weapons: Shadowglass Blade (dmg 3, fast), Moonreaper (dmg 5). New weapon replaces the old one.
- Plan: the NEXT market (desert bazaar) gets the armor smith and NO weapon smith.

## Snowy Peaks (behind the Bat Queen's roost)
- Built by `make_peaks_assets.py` (run `make_crystal_assets.py` first: it adds the passage door at the back of the Queen's Roost, open once `batqueen_defeated`). Order if you regenerate everything: cave -> crystal -> market -> peaks (each script rewrites `dialogue.json` entries it owns; they add to the file rather than replace it).
- Map `peaks.json`: arrival clearing with snowy berry bushes (frostberries = the Snow Fox treat) and Snow Foxes (tameable), an Old Hermit (story: princess went to the Sunken Ruins across the lake), the Yeti's den (boss-type enemy like the Bat Queen; weapon only; calls Frost Imps; reward Frost Boots, flag `yeti_defeated`, shared + late-joiner gift), and a frozen lake with a thin-ice path to a far-shore island with the ruins gate (teaser: "To be continued").
- Thin ice: map property `thinIceGid` (the ground tile number); those tiles block movement unless you own `frost-boots` (`thinIceAt` in WorldScene). Deep ice and cliffs are normal obstacles.
- Next: the Sunken Ruins gate goes at the island (replace the `ruinsgate` sign with a door), and the ruins loop back to the Crystal Caverns. Then the desert (armor smith, no weapon smith).

## Sunken Ruins (through the old gate on the Peaks island)
- Built by `make_ruins_assets.py`. Script order if regenerating everything: cave -> crystal -> market -> peaks -> ruins. The Peaks island gate is now a door (`to-ruins`), and the Crystal Gallery has a wave-carved archway (west wall) that opens once `serpent_defeated`: the LOOP back to the Caverns.
- Puzzle: three rune stones (NPCs with `setFlag` + `openFlag` + lit texture; flags `runea/b/c_cleared`) light the inner door (NPC with `needFlags`, `passable`, own `openFlag: ruinsdoor_cleared`). Flags end in `_cleared`, so co-op shares them. New generic NPC props: `setFlag`, `needFlags`, `passable`.
- Guardian's chamber: Sea Serpent (boss-type enemy, 26 hp, calls Jellies; reward Moon Crest (half); flag `serpent_defeated`), the princess's note (story: she split the Crest, the other half went to the desert market), and the exit arch back to the Caverns.
- Tameable Tide Crab (treat = seaweed from kelp bushes). Shared + late-joiner gifts for the Crest half, like the lantern and boots.
- Next: the desert (bazaar with the armor smith, NO weapon smith; the other Crest half / the princess).

## Desert + Bazaar (through the sealed archway in the Moth Garden)
- Built by `make_desert_assets.py` (maps `desert.json`, `bazaar.json`). Script order: cave -> crystal -> market -> peaks -> ruins -> desert.
- The Moth Garden's crescent-sealed archway opens only for someone carrying the Moon Crest (half) from the Sunken Ruins.
- Desert: scorpions (hostile), tameable Sand Lizards (treat = cactus fruit), cactus-fruit bushes, sunstone rocks (`desertRocks`), the Scorpion King's pit (boss-type enemy, 34 hp, calls scorpions, flag `scorpionking_defeated`, drops the other Crest half).
- Bazaar: ARMOR smith (no weapon smith here), treat seller (every treat), gem trader (best gem prices), the princess (flagLines change after the king falls), 4 wandering customers.
- Armor (`armor.json`, `smith.js` now handles both kinds): ordered like weapons, ready on your next visit (`gs.armor`, `gs.armorOrder`, `gs.bazaarVisits`). Sunscale Vest defense 1, Mirage Mail defense 2. Each hit is reduced by the defense but always does at least 1 (`reduceDamage`). Shown in the bag.
- The two Crest halves join into the Moon Crest automatically (`mergeCrest`, run from `updateHud`). The princess points north: the end-game hook ("To be continued").
- Boss rewards for co-op friends are now a table in `bossGifts.js` (test `test_gifts.mjs`); a personal flag `gift_<flag>` stops used-up items being given twice. To add a boss: give its enemy `flag` + `reward`, then add a row to BOSS_GIFTS.

## Waystones, Waystone Charm, treat crops
- `make_waystones.py` (RUN LAST, after the area scripts, because they rebuild maps): adds a waystone NPC to town, farm, forest, quarry, crystal, peaks, ruins and bazaar (finds a free open spot near the arrival), writes `waystones.json` (id, label, map, arrival x/y, flag `waystone_<id>`), makes the treat crop sprites and adds the crops + seeds. Safe to run again (it replaces old waystones).
- Touch a waystone once to light it (NPC `setFlag` + `openFlag`; flags are personal, not shared in co-op). The town one is always lit.
- Waystone Charm: the princess in the bazaar gives it after the Scorpion King falls (NPC props `giveItem` + `giveWhen`). Bag -> select the charm -> USE (or Space) -> pick a lit waystone.
- Treat crops: frostberry, seaweed (kelp spores), cactus fruit now grow in the farm plots (`crops.json`); seeds come from the area bushes (about 1 in 5 pickings).
- Planned next (agreed order): ninja school (sensei checklist, kitchen/potions) -> pet training + pet armor -> enchanting -> final area + hard boss.

## Ninja School
- `make_school.py` builds everything: the building front in the town (top-left, door at tile 4,2, needs the Moon Crest), `school-tiles.png`, the rooms, sprites (students/cook/alchemist are recolours of the villager, bookshelf/bed/dummy are placeholders), recipes, items and dialogue. Safe to re-run (only touches the town's top-left corner).
- Rooms (map names): `school` (hall: Headmaster, wandering students; doors to every room), `kitchen` (Cook), `potions` (Alchemist), `library` (8 books + Librarian), `sparring` (Sparring Master + 4 dummies), `dorm1`/`dorm2` (beds heal you), `garden` (outside, students, pond), `barn` (5 animals to feed/pet, not tameable). Free slots for the Pet Dojo and Enchanting Workshop: hall top wall at x=16 and one more (the hall is 20 wide).
- NPC prop `role`: book (plain dialogue, counts as read via `met_<id>`), librarian (prop `books` = comma list of book ids; all read = +1 heart, once), sparmaster, dummy, bed, feeder. All logic is in `src/school.js` (tests: `test_school.mjs`, which also checks every door lands on a free tile and has a way back).
- Sparring: talk to the master, then every 10 sword hits on a dummy is a lesson; 5 lessons and a talk to the master gives `spar_passed` = +1 sword damage (see `sparBonus` in `attack()`).
- Crafting: Cook (`craft: kitchen`) and Alchemist (`craft: potions`) use `src/craft.js` + `src/data/recipes.json`. Foods and potions are normal items with `heal`. Add a recipe = one entry in recipes.json + an item in items.json.
- The Headmaster gives the Acceptance Letter once (NPC `giveItem` with no `giveWhen` = give on first talk).
- Second floor: a staircase in the hall (tile 17,1) opens once the Headmaster says so (`school_upper`). He checks: cooked at the Cook (`crafted_cook`), brewed (`crafted_alchemist`), read every book (`library_done`), passed sparring (`spar_passed`); see `BASICS` in `src/school.js`. Upstairs (`upper`): Pet Dojo (`dojo`) and the Enchanting Workshop (`workshop`, door locked by `workshop_open` until enchanting is built; the room has a placeholder Enchanter).
- Pet fighting (`src/petfight.js`, `updatePetFight` in WorldScene): train your companion at the Pet Trainer with its favourite treats (+ gold): Rookie, Fighter, Champion (`TRAIN` table). A trained friend hits enemies next to it (never tameable kinds), gets TIRED after its stamina runs out (greyed out, rests 10 s), and is never hurt. Pet armor (`petarmor.json`, recipes in recipes.json `petarmor`, made and fitted at the Trainer) adds stamina and a little damage. `pet.level` and `pet.armor` are saved with the pet. Tests: `test_petfight.mjs`.
- Enchanting (`src/enchant.js`, `src/data/enchants.json`, recipes.json `enchant`): the Enchanter in the Workshop (`workshop`, open to anyone who reached the second floor) makes gems/scrolls from ore + crystals and sets them on your gear. One enchant per slot (`gs.enchant = { weapon, armor }`), it stays when you upgrade at a smith, and a new one swaps the old back into the bag. Ember Gem +1 / Greater +2 damage, Ward Gem +1 / Greater +2 defense, Swift Scroll 25% faster swings; greater gems need a diamond. Effects are applied in `attack()` (damage + cooldown) and `hurtPlayer()` (defense). The bag shows "Enchanted: ..." on the weapon and armor. Tests: `test_enchant.mjs`. To add an enchant: one entry in enchants.json, an item in items.json, a recipe.
- Still to come: the final area + boss, tuned for players who have enchanted gear.

## Day and night, night friends, night crops, Night Barn
- `src/daynight.js`: one day = 8 minutes of real clock time (`CYCLE_MS`; shared automatically in co-op because it is the clock). Phases: day, dusk, night, dawn. Outdoor maps (`OUTDOOR`: town, farm, forest, quarry, peaks, desert, bazaar, garden) get a multiply-colour overlay (blue at night, orange at dusk/dawn), drifting fireflies and glowing lit waystones (`createDayNight`/`updateDayNight` in WorldScene). Buildings, caves, the school and the castle are not tinted.
- Testing the clock: add `?time=night` (or day, dusk, dawn) to the game's web address to pin the time; `?cycle=60000` makes a full day 1 minute.
- Night friends: firefly (treat: glowcap), owl and moon hare (treat: moonbloom). They are `harmless` tameable enemies (`damage 0`, they only wander) with the object property `nightOnly=yes`: they are asleep (hidden) by day and appear at dusk (`Enemies.applyDayNight`). Placed in town, farm, forest and the school garden by `make_daynight.py`.
- Night crops: moonbloom and glowcap (`nightOnly: true` in crops.json). They plant and water like any crop but only advance a stage while it is night (`tick(gs, map, now, crops, night)` in farming.js). Seeds: bushes in town/forest (rare) and 3 for 30g at the market stall.
- Night Barn: a second barn in the school garden (door at tile 10,3), a dark map (`nightbarn`, needs the lantern like the cave) with 5 night animals to feed and pet (the barn feeder now also offers moonbloom/glowcap when you carry some).
- Run order if regenerating: ... make_school.py -> make_waystones.py -> make_daynight.py (it edits the town/farm/forest/garden maps).
- Not changed on purpose: bosses are not harder at night.

## Ninja colours
- Choose Black + Red (the original), Pink, Green or Yellow. `src/ninja.js` swaps only the strongly red pixels (scarf/headband) of `player-walk.png` at runtime and keeps the shading, so it also works if the sprite art is replaced as long as the accent is red. The recoloured sheet is built once per colour in `ninjaTexture()` (WorldScene) and cached as `player-<colour>`; walking animations are `walk-<texture>-<dir>`.
- `gs.ninja` holds the colour (saved; co-op sends it as `nj` in presence, so each player is seen in their own colour; two players with the same colour get the blue tint so you can tell them apart).
- A save that has not chosen yet is asked once at the start ("Which ninja are you?"). The Ninja Tailor in the town (`make_tailor.py`, role `wardrobe`) changes it any time.
- To add a colour: one entry in `NINJA_COLORS`. Tests: `test_ninja.mjs`.

## Friend Journal
- `src/journal.js` + `gs.journal` (kind -> true). `befriend()` in pets.js records every kind; `ensureJournal` backfills old saves.
- Open it from the Friends menu ("Friend Journal") or the JOURNAL button in the bag. It's a mode of InventoryScreen (`openJournal`), so key routing is unchanged.
- Unmet kinds show a black silhouette + "?" with a hint (`hint`/`when` in friends.json). Saying goodbye never erases a page.
- Rewards (journal.js REWARDS): 3 friends -> 2 healing potions, 6 -> 2 greater potions, 10 -> 3 elixirs; claimed once via flags `journal_reward_<n>`.

## Fishing
- `src/fishing.js` (rules, no Phaser) + `src/FishingUI.js` (bobber, "!" and reel bar) + `src/data/fish.json` (fish: area, when any/day/night, weight, zone, speed, reel pulls, sell, colour).
- Map properties: `fishGid` (the obstacle tile you can fish from) and `fishArea`. Garden pond = school-tiles 11, forest pond = 3 (new, added by make_fishing.py), Snowy Peaks frozen lake = 4 (deep ice).
- How a cast goes: face water with the Fishing Rod, Space = cast; Space again when "!" shows (too early scares it, too late loses it); then keep the marker inside the green bar. Rare fish need 2-3 good pulls, 2 misses lose the fish. Moving, J, ESC or getting hurt pulls the line in.
- The Old Fisher (forest, next to the new pond) gives the rod, buys fish by the pile, shows the Fish Log, tips, and gives prizes at 4 / 8 / 11 kinds (flags `fishlog_reward_N`). `gs.fishLog` = { fishId: count }. The Soggy Boot is junk and does not count.
- Cooking: a second cook, the Angler Chef, in the school kitchen (`craft: 'grill'`, recipes.json `grill`, 9 dishes). Raw fish heal 1.
- Fish as friend treats: friends.json `likes` (crab: pond minnow, owl: forest trout, snow fox: frost perch, sand lizard: sunfish). The favourite treat is used first (`treatFor` in pets.js). The Friend Journal shows "(or ...)".
- ChoiceMenu now widens to fit its longest option (long recipe lines were cut off).
- Regenerate with `python3 make_fishing.py` (after make_school / make_daynight). It overwrites hand edits to those map objects but not fish.json.

## Miner repairs pickaxes
- The quarry Miner is now a repair-only shop (`shop: 'miner'` on the NPC, `miner` in shop.json). Fixing the pickaxe costs 3 stone (from tools.json), no trip to the farm shop needed. If the pickaxe is fine he says so (`nothing` line in his dialogue; supported in shop.js for any repair-only stall).

## The Brewer (Shadow Market stall)
- The closed stall at the east end of the market is open: the Brewer (`brewer` NPC, `shop: 'brewer'`, sprite hexbrewer.png) replaces the closed sign. Made by `make_brewer.py` (run after make_market_assets.py).
- Three brews, drunk from the bag (DRINK button / Space): Swift Brew 25g (45 s: walk ~35% faster), Owl-Eye Brew 25g (90 s: bigger lantern circle in dark areas, night tint outdoors mostly lifted), Shadow Brew 40g (both).
- `src/brew.js` (no Phaser) + `src/data/brews.json` (effect -> ms). `gs.buffs = { speed, vision }` hold expiry times on the real clock, so they survive a save. Stacking adds time, max 5 minutes. HUD shows "Swift 0:45  Owl-eye 1:30" under the hearts.
- Hooks in WorldScene: `moveMs` in the player's move tween, `lightScale` in updateDarkness, `nightTint` in updateDayNight, `drinkBrew` / `updateBuffHud`. Items with `brew: true` get a DRINK button in the bag.

## Fixes: scrolling menus, invisible blockers
- ChoiceMenu shows at most 9 rows; longer lists (a shop with many offers) scroll with the arrow keys, with ▲/▼ markers you can also tap.
- Night-only creatures that are asleep by day (`hidden`) no longer block tiles: `Enemies.at()`, `free()`, the summon check and the pet-fight target search all ignore them. (They used to sit invisibly on their home tile all day.)

## One friend per kind; Granite goes home
- `befriend()` refuses a kind you already have (`reason: 'have'`). In the world, offering a treat to a wild animal of a kind you already have shows "...knows you already! It hops away happily." The animal hops and leaves for a while (normal respawn), and NO treat is used (`Friends.hopAway`). Saying goodbye to your friend lets you befriend that kind again. Saves that already have two of a kind keep both. (Idea parked: let every friend follow at once, an "entourage".)
- Granite (Golem.js) slides back to his home spot when he is calmed, so he can no longer end up sitting in front of the stone door. (Leaving the cave and coming back also resets him, because his spot is not saved.)

## Music and sound effects (no audio files)
- `src/music.js` (data, no Phaser): scales, theme recipes (`THEMES`: key, scale, bpm, chord progression, waveforms, density), `MAP_THEME` (which map plays which theme; unknown maps use 'town'), `buildPattern(name, night)` (8 bars, deterministic, same tune every time) and `SFX` (little oscillator/noise recipes). The NIGHT version of any theme is slower, sparser, soft sine lead plus a pad.
- `src/audio.js`: the Web Audio player (singleton). `audio.attach(scene)` per scene, `audio.play(theme, night)` crossfades, `audio.sfx(name)`, `audio.toggleMute()` (remembered in localStorage key `mega-ninja-muted`). It shares Phaser's AudioContext and waits quietly until the browser allows sound (first key press or tap).
- WorldScene.updateAudio (twice a second): boss music while a boss/golem is `active`, else the map's theme, calm version after dark on OUTDOOR maps. Title screen has its own tune.
- Sounds hooked in: sword swing, enemy hit, getting hurt, door, item pickup, gold, menu move/select/back (ChoiceMenu), eat/drink, fishing (cast, splash, bite, pull, miss, catch), making friends, journal rewards.
- Mute: M key, the small ♪ in the top-right corner, or the SND/MUTE button on touch screens.
- To change a tune, edit its line in THEMES (seed changes the melody, bpm/scale/prog change the feel) and run `node test_music.mjs`. New SFX: add an entry to SFX and call `audio.sfx('name')`.

## Difficulty (Easy / Normal / Hard)
- `src/difficulty.js` (pure, `test_difficulty.mjs`): `gs.difficulty` = easy|normal|hard; missing = asked once on next load, plays as Normal. Normal = the game exactly as before.
- Multipliers: easy = damage x0.5 (min 1 half-heart), attacks 1.5x slower, red warnings 1.7x longer, enemies move 1.3x slower, sight x0.8, invulnerability after a hit 1.6s. Hard = damage x1.5, attacks x0.8, warnings x0.75, move x0.85, sight x1.15, invuln 0.7s.
- Applied in `WorldScene.hurtPlayer` (damage + invuln, so bosses/rocks/roots all scale), `Enemies.js` (attackMs, 380ms telegraph, moveMs, sight), `Boss.js`/`Golem.js` via `timing()` (everyMs, telegraphMs, summon timer, Golem roll warning).
- Asked by `chooseLevel()` after the colour chooser (or on load for older saves); bag footer button "LV: EASY" re-opens it.

## Touch joystick (replaces the on-screen D-pad)
- `src/joystick.js` (pure, `test_joystick.mjs`): touch anywhere in the left 200px (below the top HUD strip, not on a button, no menu open), hold and drag; a ring + knob appear under the thumb. `stickDir` gives one of 4 directions with a 7px dead zone and a bias so the thumb near a diagonal doesn't flicker. A faint ring at (46,196) hints where to start.
- Tracks its own pointer id, so tapping A/B/F with the other thumb no longer stops movement. If a menu closes while the thumb is still down, walking resumes from the thumb position.

## Friend limit removed
- The 6-friend cap is gone (`"max"` removed from friends.json; `isFull` is false unless `max` is set). Still one friend per kind, so the total is just the number of kinds; new kinds added later are collectable without releasing anyone. The friends list scrolls.

## Bag pockets (tabs instead of one long grid)
- Bag is sorted into tabs: GEAR (tools, weapon, armor, rod, lanterns, boots, charm, armor pieces, enchant gems), FOOD (anything that heals or is a brew), SEEDS, CROPS (raw produce), FISH (fish.json incl. the boot), STUFF (ores, gems, crests, the rest). `pocketOf`/`buildPockets` in inventory.js (tested). Tap a tab, or push the arrows past the side of a pocket to hop to the next non-empty one. The open tab is remembered. A pocket over 25 things spills to "STUFF 2" etc. (before this, anything past 25 was silently hidden).
- To re-file an item, edit GEAR_ITEMS / CROP_ITEMS in inventory.js.

## Sturdier axe + pickaxe (shop upgrades)
- shop.json offer `type: 'toolup'` (`tool`, `label`, `levels:[{to,price}]`) like the pail: Axe/Pickaxe 30 -> 45 (80g) -> 70 (200g) -> 100 (400g). Needs the tool; refills it (even if broken). Saved as `gs.toolMax = { axe: 45 }`; always read through `maxDur(gs, defs, id)` in tools.js (wear label, repair, bag bar, low-tool warning, replacement tools). Sold at the farm market stall (axe + pickaxe) and by the Quarry Miner (pickaxe). Test: `test_toolup.mjs`.

## World map (N key / MAP button) + "where to find things"
- `src/data/worldmap.json` (areas with x/y on the screen, links, which real maps belong to each, `blurb`, `hint`, plus `services` = what/where/how) and `src/worldmap.js` (pure; `test_worldmap.mjs` checks every map belongs to one area, links are two-way, no overlaps). Shown as a mode of the bag screen (`openMap()` in InventoryScreen), so it blocks movement and closes like the bag (Esc / N / CLOSE). Arrow keys or taps select an area; FIND toggles the "where to find things" list.
- `gs.visited` is filled in on every map load. Old saves get it inferred (path from Town to where you are, NPCs met, boss flags, market/bazaar visits). Areas show as: you (yellow), seen, lead (next to a seen area: name + hint, orange) or ? (unknown). To add an area: a node + `maps` entry; add services as you add shops.

## Wood economy, pines and the Tinkers
- **Snow pines** (`snow-pine` / `snow-pine-stump`, `make_tinker_pines.py`): 14 choppable pines in the Frozen Peaks (3 swings, 2 wood, regrow after 60s). Placed so every door and the waystone stay reachable even with all of them standing. They are bigger and have snow on them; the smaller plain pines are scenery.
- **Wandering Tinker** (`tinker` sprite, `shop.json` `tinker`, dialogue `tinker`): Frozen Peaks next to the waystone (3,20) and Desert Bazaar (21,15). Fixes shovel/axe/pickaxe for gold (new offer type `repairgold`: 15/25/25g) or for materials (axe 6 wood, pickaxe 3 stone), and buys wood (3g) and stone (2g). Repairs go to the tool's upgraded maximum.
- **Wood uses**: Hexsmith orders need wood (Shadowglass +4, Moonreaper +8 in weapons.json `smith.items`); the farm stall and tinkers buy wood; **better fishing rods** from the Old Fisher (`fishing.js` ROD_LEVELS, `gs.rodLevel`): Pine Rod 10 wood + 50g, Frostwood Rod 20 + 150g, Master Rod 30 + 400g; each gives a longer bite window (+0.5/0.9/1.3s) and wider green zone (+0.06/0.12/0.18). Test: `test_wood.mjs`.
- Parked idea: bridges/rafts (spend wood to reach a land across water) for a later area.

## Map "FIND" lists: shops and goals
- Each `services` entry in worldmap.json has `kind`: `shop` (who sells or does what) or `goal` (where key items and bosses are: lanterns, Crest Stone, Frost Boots, Moon Crest halves, the Bat Queen's passage and the hidden market crack). The FIND screen has a SHOPS / GOALS button; rows are 9px apart (max ~15 per list). Only places you have visited or are next to are listed; the rest stay hidden so nothing is spoiled. When you add a boss or key item, add a `goal` row.

## Heart regeneration
- `src/regen.js` (pure, `test_regen.mjs`): once you have been out of a fight for a while (no hit taken, no sword swung), you win back 1 hp (half a heart) every few seconds until full. Normal: after 8s, then every 7s. Easy: 6s / 4s. Hard: 12s / 12s. Never during a boss fight (`boss.state` intro/active; the wait starts when it ends), never at 0 hp, resets when you take a hit or swing. A fresh map load also counts as just having fought. Hooked in WorldScene `update` (after the menus-open guard), `hurtPlayer` and `attack`. Tune the numbers in `REGEN`.
