// Quest-giver conversations (farmer, lumberjack). No Phaser in here.
//
// A quest giver always has exactly one current request ("bring me N wheat for G gold").
// He only trades for the item he is asking for right now.
//
// Every talk function returns a conversation step:
//   { lines: [...],            // shown in the dialogue box (can be empty)
//     afterClose: () => msg,   // runs after the lines; returns a short toast message or null
//     choice: { options: [...], onPick: (i) => step | null } }   // optional menu; null = conversation over
// The scene shows the lines, runs afterClose, opens the menu, and repeats with whatever onPick returns.
import { FREE_SEEDS, plantedCount } from './farming.js';
import { giveTool, hasTool, isBroken, repairTool, maxDur } from './tools.js';

export const fill = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined ? values[k] : `{${k}}`));

// Requests are used in order; once the list runs out, the last one repeats
export const currentRequest = (quest, index) =>
  quest.requests[Math.min(index, quest.requests.length - 1)];

const aOrAn = (word) => (/^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`);
const costText = (cost) => Object.entries(cost).map(([k, n]) => `${n} ${k}`).join(' + ');

// The gift you get the first time you meet him: items and/or a tool
function giveFirstGift(gs, quest, toolDefs) {
  const gift = quest.firstGift;
  if (!gift) return null;
  const parts = [];
  for (const [item, n] of Object.entries(gift.items ?? {})) {
    gs.items[item] = (gs.items[item] ?? 0) + n;
    parts.push(`${n} ${item}`);
  }
  if (gift.tool) {
    giveTool(gs, toolDefs, gift.tool);
    parts.push(aOrAn(toolDefs[gift.tool].name.toLowerCase()));
  }
  return parts.length ? `Received ${parts.join(' and ')}` : null;
}

export function talkToQuestGiver(gs, npcId, data, quest, toolDefs = {}) {
  if (!gs.quests[npcId]) gs.quests[npcId] = { index: 0 };
  const state = gs.quests[npcId];
  const req = currentRequest(quest, state.index);
  const metFlag = `met_${npcId}`;

  // First meeting: introduce, state the first request, hand over the gift when the box closes
  if (!gs.flags[metFlag]) {
    gs.flags[metFlag] = true;
    return {
      lines: [...data.lines, fill(req.ask ?? data.ask, req)],
      afterClose: () => giveFirstGift(gs, quest, toolDefs),
    };
  }

  // Quest givers who also repair tools (the lumberjack) use a menu
  if (quest.service) return serviceMenu(gs, npcId, data, quest, toolDefs);

  const have = gs.items[req.item] ?? 0;

  // Enough for the request: ask first, then hand it over when the player says yes
  if (have >= req.amount) {
    return {
      lines: [fill(data.ready, req)],
      afterClose: () => null,
      choice: {
        options: ['Hand it over', 'Not yet'],
        onPick: (i) => (i === 0 ? handOver(gs, state, data, quest, req) : null),
      },
    };
  }

  // Not enough yet
  const lines = [fill(data.notEnough, { ...req, have })];
  let afterClose = () => null;

  // Safety net: no seeds and nothing growing means the player is stuck, so give a few
  if (quest.safetyNet === 'seeds' && gs.items.seeds === 0 && plantedCount(gs) === 0) {
    lines.push(data.freeSeeds);
    afterClose = () => {
      gs.items.seeds += FREE_SEEDS;
      return `Received ${FREE_SEEDS} seeds`;
    };
  }
  return { lines, afterClose };
}

// Pay for the current request and move on to the next one.
// A request can override its texts ("ask", "thanks") and give a weapon instead of (or as well as) gold:
//   { item, amount, reward, give: { weapon: 'sword', name: 'Training Sword' } }
function handOver(gs, state, data, quest, req) {
  gs.items[req.item] -= req.amount;
  gs.gold += req.reward ?? 0;
  const got = [];
  if (req.reward > 0) got.push(`${req.reward} gold`);
  if (req.give?.weapon) {
    gs.weapon = req.give.weapon;
    gs.flags[`got_${req.give.weapon}`] = true;
    got.push(aOrAn(req.give.name ?? req.give.weapon));
  }
  state.index += 1;
  const next = currentRequest(quest, state.index);
  return {
    lines: [fill(req.thanks ?? data.thanks, req), fill(next.ask ?? data.nextAsk, next)],
    afterClose: () => (got.length ? `Received ${got.join(' and ')}` : null),
  };
}

// ---------- the lumberjack: hand over wood, repair your axe, or get a spare if you are stuck ----------

function serviceMenu(gs, npcId, data, quest, toolDefs) {
  const state = gs.quests[npcId];
  const tool = quest.service.tool;
  const def = toolDefs[tool];
  const cost = def.repair ?? {};
  const canRepair = Object.entries(cost).every(([item, n]) => (gs.items[item] ?? 0) >= n);
  const broken = !hasTool(gs, tool) || isBroken(gs, tool);

  // Stuck: broken (or lost) tool, no materials to repair it, and no gold for a new one -> a short-lived spare
  if (broken && !canRepair && gs.gold < (def.price ?? Infinity)) {
    return {
      lines: [data.spare],
      afterClose: () => {
        gs.tools[tool] = { dur: def.spare ?? 5 };
        return `Received a spare ${def.name.toLowerCase()}`;
      },
      choice: menu(),
    };
  }
  return { lines: [broken ? data.broken : data.menu], afterClose: () => null, choice: menu() };

  // builds the options fresh each time, so counts and greyed-out entries stay up to date
  function menu() {
    const req = currentRequest(quest, state.index);
    const have = gs.items[req.item] ?? 0;
    const options = [
      { label: `Sell ${req.amount} ${req.item} (${req.reward}g)`, disabled: have < req.amount },
    ];
    const owned = hasTool(gs, tool);
    const needsRepair = owned && gs.tools[tool].dur < maxDur(gs, toolDefs, tool);
    const repairIdx = needsRepair ? options.push({
      label: `Repair ${def.name.toLowerCase()} (${costText(cost)})`,
      disabled: !Object.entries(cost).every(([item, n]) => (gs.items[item] ?? 0) >= n),
    }) - 1 : -1;
    options.push({ label: 'Leave', disabled: false });
    const leaveIdx = options.length - 1;

    return {
      options,
      onPick: (i) => {
        if (i === leaveIdx) return null;
        if (i === 0) {
          const step = handOver(gs, state, data, quest, req);
          step.choice = menu();
          return step;
        }
        if (i === repairIdx) {
          const r = repairTool(gs, toolDefs, tool);
          return { lines: [], afterClose: () => r.msg, choice: menu() };
        }
        return null;
      },
    };
  }
}
