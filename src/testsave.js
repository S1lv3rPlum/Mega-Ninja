// A late-game "Tester" save, so late content can be tried without replaying. No Phaser in here.
// Shown on the title screen only when the page address ends in ?test=1.
import cave from './data/cave.json' with { type: 'json' };
import waystones from './data/waystones.json' with { type: 'json' };

export const TEST_NAME = 'Tester';

export function buildTestState() {
  const flags = {
    got_sword: true, treant_defeated: true, golem_defeated: true, got_crest: true,
    batqueen_defeated: true, yeti_defeated: true, serpent_defeated: true, scorpionking_defeated: true,
    gift_batqueen_defeated: true, gift_yeti_defeated: true, gift_serpent_defeated: true, gift_scorpionking_defeated: true,
    met_cavemaster: true, learned_cook: true, learned_brew: true,
  };
  for (const w of waystones) flags[w.flag] = true;
  for (const c of cave.chambers) flags[`cave_ch_${c.id}`] = true;
  return {
    hp: 60, maxHp: 60, gold: 5000,
    ninja: 'red', difficulty: 'normal',
    flags,
    items: {
      'moon-crest': 1, 'crystal-lantern': 1, 'frost-boots': 1, sunstone: 1,
      copper: 20, sapphire: 10, emerald: 10, ruby: 10, diamond: 5, crystal: 10, wood: 40, stone: 40, herb: 20,
      carrot: 10, pumpkin: 10, frostberry: 10, seaweed: 10, 'cactus-fruit': 10, glowcap: 10, moonbloom: 10,
      bread: 5, 'ninja-feast': 3, 'healing-potion': 5, 'greater-potion': 3, elixir: 2,
      'ember-gem': 2, 'ward-gem': 2, 'greater-ember-gem': 1, 'greater-ward-gem': 1, 'swift-scroll': 1,
      'fishing-rod': 1, 'fairy-charm': 1,
    },
    tools: { shovel: { dur: 40 }, axe: { dur: 60 }, pickaxe: { dur: 60 } },
    toolMax: { shovel: 40, axe: 60, pickaxe: 60 },
    weapon: 'moonreaper', armor: 'mirage',
    enchant: { weapon: 'greater-ember-gem', armor: 'greater-ward-gem' },
    rodLevel: 3,
    pets: [{ id: 'rabbit1', kind: 'rabbit', name: 'Bunny' }, { id: 'owl1', kind: 'owl', name: 'Hoot' }],
    companion: 'owl1',
    journal: { rabbit: true, owl: true },
  };
}
