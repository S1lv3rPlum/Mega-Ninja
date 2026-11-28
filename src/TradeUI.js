// The Trades menu (PETS button / G key, co-op only): offer things to another player, and answer offers you got.
// It is a chain of the usual choice menus. All the rules are in trade.js, the cloud part is in Coop.js.
import { Coop } from './Coop.js';
import { livePlayers } from './coopLogic.js';
import { tradable, bundleText, bundleEmpty } from './trade.js';
import itemsData from './data/items.json';

const ITEMS = itemsData.items;
const GOLD_STEPS = [10, 50, 100, 500, 1000];

export default class TradeUI {
  constructor(scene) {
    this.scene = scene;
  }

  // the first menu
  open() {
    const s = this.scene;
    if (!Coop.active) return;
    const inn = Coop.incoming().length;
    const out = Coop.outgoing().length;
    s.choice.open(['Offer a trade', `Offers for you (${inn})`, `Your open offers (${out})`, 'Close'], {
      onSelect: (i) => {
        if (i === 0) this.pickPlayer();
        else if (i === 1) this.listIncoming();
        else if (i === 2) this.listOutgoing();
      },
    });
  }

  // ---- making an offer ----
  pickPlayer() {
    const s = this.scene;
    const others = Object.entries(livePlayers(Coop.playersTree, Coop.key));
    if (!others.length) {
      s.showToast('Nobody else is in the world right now.');
      return;
    }
    s.choice.open([...others.map(([, p]) => p.n), 'Back'], {
      onSelect: (i) => {
        if (i < others.length) this.start(others[i][0], others[i][1].n);
        else this.open();
      },
      onCancel: () => this.open(),
    });
  }

  async start(key, name) {
    const s = this.scene;
    s.showToast(`Looking in ${name}'s bag...`);
    const theirs = await Coop.theirItems(key);
    const draft = { key, name, give: {}, giveGold: 0, ask: {}, askGold: 0, theirs: theirs ?? { items: {}, gold: 0 } };
    this.build(draft, 'give');
  }

  // side = 'give' (what you put in) or 'ask' (what you want back)
  build(d, side) {
    const s = this.scene;
    const gs = s.gameState;
    const giving = side === 'give';
    const pool = giving ? { items: gs.items, gold: gs.gold } : d.theirs;
    const have = tradable(pool.items, ITEMS);
    const chosen = giving ? d.give : d.ask;
    const goldNow = giving ? d.giveGold : d.askGold;
    const sum = bundleText(chosen, goldNow, ITEMS);
    const title = giving ? `YOU GIVE: ${sum}` : `YOU WANT: ${sum}`;
    const opts = [title.slice(0, 44), giving ? 'Next: what do you want back?' : 'Next: look it over', 'Add gold', 'Clear this side'];
    have.forEach((it) => opts.push(`${it.name}  (${it.n - (chosen[it.id] ?? 0)} left)`));
    opts.push('Cancel the trade');
    const again = () => this.build(d, side);
    s.choice.open(
      opts.map((label, i) => ({ label, disabled: i === 0 })),
      {
        onSelect: (i) => {
          if (i === 1) return giving ? this.build(d, 'ask') : this.review(d);
          if (i === 2) return this.pickGold(d, side, pool.gold ?? 0, again);
          if (i === 3) {
            if (giving) { d.give = {}; d.giveGold = 0; } else { d.ask = {}; d.askGold = 0; }
            return again();
          }
          if (i === opts.length - 1) return;
          const it = have[i - 4];
          this.pickQty(it, it.n - (chosen[it.id] ?? 0), (q) => {
            chosen[it.id] = (chosen[it.id] ?? 0) + q;
            again();
          }, again);
        },
        onCancel: () => (giving ? this.pickPlayer() : this.build(d, 'give')),
      }
    );
  }

  pickQty(it, max, done, back) {
    const s = this.scene;
    if (max <= 0) return back();
    const steps = [...new Set([1, 2, 5, 10, 25, max])].filter((n) => n <= max).sort((a, b) => a - b);
    s.choice.open([...steps.map((n) => `${n === max && n > 1 ? 'All ' : ''}${n} ${it.name}`), 'Back'], {
      onSelect: (i) => (i < steps.length ? done(steps[i]) : back()),
      onCancel: back,
    });
  }

  pickGold(d, side, maxGold, back) {
    const s = this.scene;
    const field = side === 'give' ? 'giveGold' : 'askGold';
    const room = Math.max(0, maxGold - d[field]);
    const steps = [...new Set([...GOLD_STEPS.filter((g) => g <= room), room])].filter((g) => g > 0).sort((a, b) => a - b);
    if (!steps.length) {
      s.showToast(side === 'give' ? 'You have no more gold to add.' : 'They have no more gold.');
      return back();
    }
    s.choice.open([...steps.map((g) => `${g === room && !GOLD_STEPS.includes(g) ? 'All ' : ''}${g} gold`), 'Back'], {
      onSelect: (i) => {
        if (i < steps.length) d[field] += steps[i];
        back();
      },
      onCancel: back,
    });
  }

  review(d) {
    const s = this.scene;
    if (bundleEmpty(d.give, d.giveGold) && bundleEmpty(d.ask, d.askGold)) {
      s.showToast('Add something to the trade first.');
      return this.build(d, 'give');
    }
    const g = bundleText(d.give, d.giveGold, ITEMS);
    const a = bundleText(d.ask, d.askGold, ITEMS);
    s.choice.open([{ label: `Give ${g}`.slice(0, 46), disabled: true }, { label: `For ${a}`.slice(0, 46), disabled: true }, `Send to ${d.name}`, 'Change it', 'Cancel'], {
      onSelect: async (i) => {
        if (i === 2) {
          const r = await Coop.sendOffer(d.key, d.name, d.give, d.giveGold, d.ask, d.askGold);
          s.showToast(r.ok ? `Offer sent to ${d.name}!` : r.msg);
          s.updateHud?.();
        } else if (i === 3) this.build(d, 'give');
      },
      onCancel: () => this.build(d, 'ask'),
    });
  }

  // ---- offers you got ----
  listIncoming() {
    const s = this.scene;
    const list = Coop.incoming();
    if (!list.length) {
      s.showToast('No offers for you right now.');
      return this.open();
    }
    s.choice.open([...list.map((o) => `${o.fromName}: ${bundleText(o.give, o.giveGold, ITEMS)}`.slice(0, 46)), 'Back'], {
      onSelect: (i) => (i < list.length ? this.answer(list[i]) : this.open()),
      onCancel: () => this.open(),
    });
  }

  answer(o) {
    const s = this.scene;
    const g = bundleText(o.give, o.giveGold, ITEMS);
    const a = bundleText(o.ask, o.askGold, ITEMS);
    s.choice.open([{ label: `${o.fromName} gives: ${g}`.slice(0, 46), disabled: true }, { label: `You pay: ${a}`.slice(0, 46), disabled: true }, 'Accept', 'Decline', 'Back'], {
      onSelect: async (i) => {
        if (i !== 2 && i !== 3) return this.listIncoming();
        const r = await Coop.respond(o.id, i === 2);
        s.showToast(r.msg);
        if (i === 2 && r.ok) s.updateHud?.();
      },
      onCancel: () => this.listIncoming(),
    });
  }

  listOutgoing() {
    const s = this.scene;
    const list = Coop.outgoing();
    if (!list.length) {
      s.showToast('You have no open offers.');
      return this.open();
    }
    s.choice.open([...list.map((o) => `To ${o.toName}: ${bundleText(o.give, o.giveGold, ITEMS)}`.slice(0, 46)), 'Back'], {
      onSelect: (i) => {
        if (i >= list.length) return this.open();
        const o = list[i];
        s.choice.open([{ label: `Wants: ${bundleText(o.ask, o.askGold, ITEMS)}`.slice(0, 46), disabled: true }, 'Take it back', 'Leave it'], {
          onSelect: async (j) => {
            if (j !== 2 && j !== 1) return;
            if (j === 1) s.showToast((await Coop.cancel(o.id)).msg);
          },
          onCancel: () => this.listOutgoing(),
        });
      },
      onCancel: () => this.open(),
    });
  }
}
