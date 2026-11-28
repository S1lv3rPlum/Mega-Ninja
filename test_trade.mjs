import assert from 'node:assert';
import items from './src/data/items.json' with { type: 'json' };
import { tradable, bundleText, hasBundle, makeOffer, acceptOffer, settleOffer, sanitizeOffer, trimDone, NO_TRADE } from './src/trade.js';
const D = items.items;
const A = () => ({ gold: 100, items: { carrot: 5, ruby: 2, lantern: 1 }, tradesDone: {} });
const B = () => ({ gold: 40, items: { copper: 10 } });
const total = (...gs) => gs.reduce((t, g) => t + g.gold + Object.values(g.items).reduce((a, b) => a + b, 0), 0);
const base = { id: 't1', from: 'a', fromName: 'Ann', to: 'b', toName: 'Bo' };

// the key items can't be traded
assert(tradable(A().items, D).every((x) => !NO_TRADE.has(x.id)) && tradable(A().items, D).length === 2);

// a full swap: nothing made, nothing lost
{
  const a = A(), b = B(); const before = total(a, b);
  const m = makeOffer(a, { ...base, give: { carrot: 3 }, giveGold: 10, ask: { copper: 4 }, askGold: 0 }, D);
  assert(m.ok); assert.equal(a.items.carrot, 2); assert.equal(a.gold, 90, 'escrow: gone from the sender at once');
  const r = acceptOffer(b, { ...m.offer });
  assert(r.ok); assert.equal(b.items.carrot, 3); assert.equal(b.gold, 50); assert.equal(b.items.copper, 6);
  const s = settleOffer(a, { ...m.offer, status: 'accepted', paid: r.paid }, D);
  assert(s.ok && s.msg.includes('4 Copper')); assert.equal(a.items.copper, 4);
  assert.equal(total(a, b), before - 0, 'conserved');
  assert(!settleOffer(a, { ...m.offer, status: 'accepted', paid: r.paid }).ok, 'collected only once');
}
// decline / cancel give everything back, once
for (const status of ['declined', 'cancelled']) {
  const a = A(); const before = total(a);
  const m = makeOffer(a, { ...base, give: { ruby: 2 }, giveGold: 50, ask: {}, askGold: 0 }, D);
  assert(m.ok && a.items.ruby === undefined);
  assert(settleOffer(a, { ...m.offer, status }).ok);
  assert.equal(total(a), before); assert(!settleOffer(a, { ...m.offer, status }).ok);
}
// a gift (asking for nothing) is fine; an empty trade is not
{ const a = A(); assert(makeOffer(a, { ...base, give: { carrot: 1 }, ask: {} }, D).ok); }
assert(!makeOffer(A(), { ...base, give: {}, ask: {} }, D).ok);
// you cannot offer what you don't have, nor key items, nor to yourself
assert(!makeOffer(A(), { ...base, give: { carrot: 6 }, ask: {} }, D).ok);
assert(!makeOffer(A(), { ...base, give: {}, giveGold: 101, ask: {} }, D).ok);
{ const a = A(); const m = makeOffer(a, { ...base, give: { lantern: 1, carrot: 1 }, ask: {} }, D); assert(m.ok && a.items.lantern === 1 && !m.offer.give.lantern, 'key items are stripped'); }
assert(!makeOffer(A(), { ...base, to: 'a', give: { carrot: 1 }, ask: {} }, D).ok);
// the receiver can't accept without the payment, and nothing changes
{
  const b = B(); const o = sanitizeOffer({ ...base, give: { carrot: 1 }, ask: { copper: 11 }, status: 'open' }, D); const before = JSON.stringify(b);
  assert(!acceptOffer(b, o).ok); assert.equal(JSON.stringify(b), before);
  assert(!acceptOffer(B(), { ...o, status: 'accepted' }).ok, 'only an open offer');
}
// junk from the cloud is ignored or cleaned
assert.equal(sanitizeOffer(null), null); assert.equal(sanitizeOffer({ id: 'x' }), null);
assert.equal(sanitizeOffer({ ...base, status: 'weird' }), null);
const j = sanitizeOffer({ ...base, status: 'open', give: { carrot: -5, ruby: 2.9, nope: 1, lantern: 1 }, giveGold: '30', ask: {} }, D);
assert.deepEqual(j.give, { ruby: 2 }); assert.equal(j.giveGold, 30);
assert.equal(bundleText({ carrot: 2 }, 10, D), '2 Carrot, 10 gold'); assert.equal(bundleText({}, 0, D), 'nothing');
const g = { tradesDone: {} }; for (let i = 0; i < 60; i++) g.tradesDone['t' + i] = 1; trimDone(g); assert.equal(Object.keys(g.tradesDone).length, 40);
assert(hasBundle({ gold: 5, items: { carrot: 1 } }, { carrot: 1 }, 5));
console.log('trade ok');
