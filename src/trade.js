// Trading between co-op players. No Phaser, no network in here: just the rules.
//
// A trade is an OFFER kept in the cloud (worlds/<CODE>/trades/<id>):
//   { id, from, fromName, to, toName, give:{item:n}, giveGold, ask:{item:n}, askGold, status, paid? , t }
//   status: 'open' -> 'accepted' | 'declined' | 'cancelled'
// What the sender gives is taken out of their bag the moment they make the offer (it waits in the offer, "escrow"), so it can never
// be in two places at once. The receiver accepting pays the asked-for things into `paid` and takes the offered things. The sender
// then collects `paid` (accepted) or gets their things back (declined / cancelled), once, and the offer is deleted.
export const NO_TRADE = new Set(['lantern', 'crystal-lantern', 'frost-boots', 'moon-crest', 'moon-crest-half', 'moon-crest-half-2', 'fairy-charm', 'sunstone']);
export const MAX_QTY = 999;

const clean = (items) => {
  const out = {};
  for (const [id, n] of Object.entries(items ?? {})) {
    const q = Math.floor(Number(n));
    if (Number.isFinite(q) && q > 0 && q <= MAX_QTY) out[id] = q;
  }
  return out;
};
const goldOf = (g) => {
  const q = Math.floor(Number(g));
  return Number.isFinite(q) && q > 0 && q <= 1000000 ? q : 0;
};

// the things in a bag that can be traded, for a menu
export function tradable(items, itemDefs) {
  return Object.entries(items ?? {})
    .filter(([id, n]) => n > 0 && itemDefs[id] && !NO_TRADE.has(id))
    .map(([id, n]) => ({ id, name: itemDefs[id].name, n }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const bundleEmpty = (items, gold) => Object.keys(clean(items)).length === 0 && goldOf(gold) === 0;

// "2 Carrot, 10 gold"
export function bundleText(items, gold, itemDefs) {
  const parts = Object.entries(clean(items)).map(([id, n]) => `${n} ${itemDefs[id]?.name ?? id}`);
  if (goldOf(gold)) parts.push(`${goldOf(gold)} gold`);
  return parts.length ? parts.join(', ') : 'nothing';
}

export function hasBundle(gs, items, gold) {
  if ((gs.gold ?? 0) < goldOf(gold)) return false;
  return Object.entries(clean(items)).every(([id, n]) => (gs.items?.[id] ?? 0) >= n);
}
function take(gs, items, gold) {
  for (const [id, n] of Object.entries(clean(items))) {
    gs.items[id] -= n;
    if (gs.items[id] <= 0) delete gs.items[id];
  }
  gs.gold -= goldOf(gold);
}
function give(gs, items, gold) {
  if (!gs.items) gs.items = {};
  for (const [id, n] of Object.entries(clean(items))) gs.items[id] = (gs.items[id] ?? 0) + n;
  gs.gold = (gs.gold ?? 0) + goldOf(gold);
}

// make something the cloud sent safe to use (a hand-edited or broken offer is ignored)
export function sanitizeOffer(raw, itemDefs = null) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.from !== 'string' || typeof raw.to !== 'string') return null;
  const ok = (items) => {
    const c = clean(items);
    for (const id of Object.keys(c)) if (NO_TRADE.has(id) || (itemDefs && !itemDefs[id])) delete c[id];
    return c;
  };
  const status = ['open', 'accepted', 'declined', 'cancelled'].includes(raw.status) ? raw.status : null;
  if (!status) return null;
  return {
    id: raw.id, from: raw.from, fromName: String(raw.fromName ?? raw.from).slice(0, 12), to: raw.to, toName: String(raw.toName ?? raw.to).slice(0, 12),
    give: ok(raw.give), giveGold: goldOf(raw.giveGold), ask: ok(raw.ask), askGold: goldOf(raw.askGold), status, t: Number(raw.t) || 0,
    paid: raw.paid ? { items: ok(raw.paid.items), gold: goldOf(raw.paid.gold) } : null,
  };
}

// The sender makes an offer: their part leaves their bag now.
export function makeOffer(gs, { id, from, fromName, to, toName, give: g, giveGold, ask, askGold, now = Date.now() }, itemDefs = null) {
  const offer = sanitizeOffer({ id, from, fromName, to, toName, give: g, giveGold, ask, askGold, status: 'open', t: now }, itemDefs);
  if (!offer) return { ok: false, msg: 'That offer is not valid.' };
  if (from === to) return { ok: false, msg: 'You cannot trade with yourself.' };
  if (bundleEmpty(offer.give, offer.giveGold) && bundleEmpty(offer.ask, offer.askGold)) return { ok: false, msg: 'Add something to the trade first.' };
  if (!hasBundle(gs, offer.give, offer.giveGold)) return { ok: false, msg: 'You do not have all of that.' };
  take(gs, offer.give, offer.giveGold);
  return { ok: true, offer };
}

// The receiver accepts: they pay what was asked and get what was offered. Returns what they paid (for the sender to collect).
export function acceptOffer(gs, offer, itemDefs = {}) {
  if (offer.status !== 'open') return { ok: false, msg: 'That offer is gone.' };
  if (!hasBundle(gs, offer.ask, offer.askGold)) return { ok: false, msg: `You need ${bundleText(offer.ask, offer.askGold, itemDefs)} for this trade.` };
  take(gs, offer.ask, offer.askGold);
  give(gs, offer.give, offer.giveGold);
  return { ok: true, paid: { items: { ...offer.ask }, gold: offer.askGold } };
}

// The sender, after an answer: collect the payment (accepted) or get their own things back (declined / cancelled). Once only.
export function settleOffer(gs, offer, itemDefs = {}) {
  if (!gs.tradesDone) gs.tradesDone = {};
  if (gs.tradesDone[offer.id]) return { ok: false, msg: null };
  if (offer.status === 'accepted') {
    give(gs, offer.paid?.items, offer.paid?.gold);
    gs.tradesDone[offer.id] = 1;
    return { ok: true, msg: `${offer.toName} accepted your trade! You got ${bundleText(offer.paid?.items, offer.paid?.gold, itemDefs)}.`, text: true };
  }
  if (offer.status === 'declined' || offer.status === 'cancelled') {
    give(gs, offer.give, offer.giveGold);
    gs.tradesDone[offer.id] = 1;
    return { ok: true, msg: offer.status === 'declined' ? `${offer.toName} said no thanks. Your things are back.` : 'Trade cancelled. Your things are back.', text: false };
  }
  return { ok: false, msg: null };
}

// keep the "already collected" list from growing forever
export function trimDone(gs, keep = 40) {
  const ids = Object.keys(gs.tradesDone ?? {});
  if (ids.length > keep) for (const id of ids.slice(0, ids.length - keep)) delete gs.tradesDone[id];
}
