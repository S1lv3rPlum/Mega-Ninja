// What a boss leaves behind for everyone in a co-op world. When a world flag (like batqueen_defeated) is set by a friend,
// you are owed the same reward once, whether you were there or joined later. No Phaser in here.
// A personal flag "gift_<flag>" records that you have had yours, so a used-up item (the Moon Crest halves join into
// the whole Crest) is never handed out twice.
export const BOSS_GIFTS = [
  { flag: 'batqueen_defeated', item: 'crystal-lantern', who: 'The Bat Queen was beaten by your friends!', gets: 'You got a Crystal Lantern too.' },
  { flag: 'yeti_defeated', item: 'frost-boots', who: 'The Yeti was beaten by your friends!', gets: 'You got Frost Boots too.' },
  { flag: 'serpent_defeated', item: 'moon-crest-half', who: 'The Sea Serpent was calmed by your friends!', gets: 'You got half of the Moon Crest too.' },
  { flag: 'scorpionking_defeated', item: 'moon-crest-half-2', who: 'The Scorpion King was beaten by your friends!', gets: 'You got the other Moon Crest half too.' },
];

export const giftFlag = (flag) => `gift_${flag}`;

// gifts owed right now for a set of flags (all flags in gs, or just one)
export function owedGifts(gs, onlyFlag = null) {
  return BOSS_GIFTS.filter(
    (g) => (!onlyFlag || g.flag === onlyFlag) && gs.flags[g.flag] && !gs.flags[giftFlag(g.flag)] && !(gs.items[g.item] > 0)
  );
}

// hand them over (marks them as received); returns the messages to show
export function giveGifts(gs, gifts) {
  return gifts.map((g) => {
    gs.items[g.item] = (gs.items[g.item] ?? 0) + 1;
    gs.flags[giftFlag(g.flag)] = true;
    return `${g.who} ${g.gets}`;
  });
}

// you earned a boss reward yourself: no gift is owed for it later
export const markEarned = (gs, flag) => {
  gs.flags[giftFlag(flag)] = true;
};
