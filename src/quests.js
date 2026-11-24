// Quest-giver conversations. No Phaser in here.
// A quest giver always has exactly one current request ("bring me N wheat for G gold").
// He only trades for the item he is asking for right now.
import { FREE_SEEDS, STARTER_SEEDS, plantedCount } from './farming.js';

export const fill = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined ? values[k] : `{${k}}`));

// Requests are used in order; once the list runs out, the last one repeats
export const currentRequest = (quest, index) =>
  quest.requests[Math.min(index, quest.requests.length - 1)];

// Returns { lines, afterClose, choice? }. Show the lines in the dialogue box; call afterClose() when it closes.
// afterClose() returns a short message to show (or null).
// If `choice` is present, show choice.options after the dialogue; if the player picks the first one,
// call choice.onYes(), which returns another { lines, afterClose } to show.
export function talkToQuestGiver(gs, npcId, data, quest) {
  if (!gs.quests[npcId]) gs.quests[npcId] = { index: 0 };
  const state = gs.quests[npcId];
  const req = currentRequest(quest, state.index);
  const metFlag = `met_${npcId}`;

  // First meeting: introduce, state the first request, give starter seeds when the box closes
  if (!gs.flags[metFlag]) {
    gs.flags[metFlag] = true;
    return {
      lines: [...data.lines, fill(data.ask, req)],
      afterClose: () => {
        gs.items.seeds += STARTER_SEEDS;
        return `Received ${STARTER_SEEDS} seeds`;
      },
    };
  }

  const have = gs.items[req.item] ?? 0;

  // Enough for the request: ask first, then hand it over when the player says yes
  if (have >= req.amount) {
    return {
      lines: [fill(data.ready, req)],
      afterClose: () => null,
      choice: {
        options: ['Hand it over', 'Not yet'],
        onYes: () => {
          gs.items[req.item] -= req.amount;
          gs.gold += req.reward;
          state.index += 1;
          const next = currentRequest(quest, state.index);
          return {
            lines: [fill(data.thanks, req), fill(data.nextAsk, next)],
            afterClose: () => `Received ${req.reward} gold`,
          };
        },
      },
    };
  }

  // Not enough yet
  const lines = [fill(data.notEnough, { ...req, have })];
  let afterClose = () => null;

  // Safety net: no seeds and nothing growing means the player is stuck, so give a few
  if (gs.items.seeds === 0 && plantedCount(gs) === 0) {
    lines.push(data.freeSeeds);
    afterClose = () => {
      gs.items.seeds += FREE_SEEDS;
      return `Received ${FREE_SEEDS} seeds`;
    };
  }
  return { lines, afterClose };
}
