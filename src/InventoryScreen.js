import itemsData from './data/items.json';
import toolDefs from './data/tools.json';
import weaponDefs from './data/weapons.json';
import armorDefs from './data/armor.json';
import { listEntries, moveSelection } from './inventory.js';
import enchantDefs from './data/enchants.json';
import friendDefs from './data/friends.json';
import { journalEntries, metCount, nextReward } from './journal.js';

// 10x10 pixel icons. '#' = main colour, 'o' = dark outline, 'h' = highlight, '.' = empty.
const ICONS = {
  seeds:   ['..........', '..........', '...o..o...', '..o#o.o#o.', '...o..o...', '.o..o.....', 'o#o.o..o..', '.o....o#o.', '.......o..', '..........'],
  wheat:   ['....o.....', '...o#o.o..', '..o#o.o#o.', '...o#o#o..', '..o#o#o#o.', '...o#o#o..', '....oo#o..', '.....oo...', '.....o....', '.....o....'],
  log:     ['..........', '..oooooo..', '.o######o.', 'o#ooo##oo#', 'o#o#o##o##', 'o#ooo##oo#', '.o######o.', '..oooooo..', '..........', '..........'],
  rock:    ['..........', '...oooo...', '..o#hh#o..', '.o#hh###o.', '.o######oo', 'o#######o#', 'o########o', '.oo#####o.', '...oooooo.', '..........'],
  gem:     ['..........', '..oooooo..', '.o#hh###o.', 'o#hh#####o', 'oooooooooo', '.o######o.', '..o####o..', '...o##o...', '....oo....', '..........'],
  shovel:  ['......oo..', '.....o##o.', '......o#o.', '.....o#o..', '....o#o...', '...o#o....', '..ooo.....', '.o###o....', '.o###o....', '..ooo.....'],
  axe:     ['..........', '...oooo...', '..o####o..', '.o#####oo.', '.o###o#o..', '..oo.o#o..', '....o#o...', '...o#o....', '..o#o.....', '..oo......'],
  pickaxe: ['..oooooo..', '.o######o.', 'o##oooo##o', 'oo.o##o.oo', '...o#o....', '...o#o....', '...o#o....', '...o#o....', '...o#o....', '....oo....'],
  sword:   ['.........o', '........o#o', '.......o#o.', '......o#o..', '.o...o#o...', '..o.o#o....', '...o#o.....', '..oo#o.....', '.o#o.o.....', 'o#o........'],
  carrot:  ['.......oo.', '.....o#o#o', '....o#o.o.', '...o#o....', '..o#oh....', '.o#oh.....', '.o##o.....', '..oo......', '..........', '..........'],
  pumpkin: ['....oo....', '...o#o....', '.oooooooo.', 'o###h####o', 'o##h#####o', 'o#o##o###o', 'o#o##o###o', 'o###h####o', '.o#######o', '..oooooo..'],
  leaf:    ['.......ooo', '.....oo##o', '...oo###o.', '..o####o..', '.o##h#o...', '.o#o#o....', 'oo#o......', 'o.o.......', '..........', '..........'],
  crest:   ['..oooooo..', '.o#hhh##o.', 'o#h####h#o', 'o##o##o##o', 'o###oo###o', 'o###oo###o', 'o##o##o##o', '.o######o.', '..oooooo..', '..........'],
  lantern: ['...oooo...', '..o....o..', '...oooo...', '..o####o..', '.o#hhh##o.', '.o#h#o##o.', '.o#hhh##o.', '.o######o.', '..oooooo..', '..........'],
  armor:   ['..oo..oo..', '.o##oo##o.', 'o###oo###o', 'o#h#oo#h#o', '.o##oo##o.', '..o#oo#o..', '..o#oo#o..', '..o#oo#o..', '...oooo...', '..........'],
  boots:   ['..........', '..oooo....', '.o####o...', '.o#hh#o...', '.o####o...', '.o####oooo', '.o#######o', '.o########', '..oooooooo', '..........'],
  coin:    ['..oooooo..', '.o######o.', 'o##hh###oo', 'o#h##.##o.', 'o#h#.o##o.', 'o#h##.##o.', 'o###oo##o.', '.o######o.', '..oooooo..', '..........'],
};

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255);
}

// make (once) a 10x10 texture for an icon in a colour
export function iconKey(scene, icon, color) {
  const key = `icon-${icon}-${color}`;
  if (scene.textures.exists(key)) return key;
  const rows = ICONS[icon] ?? ICONS.rock;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const main = parseInt(color.slice(1), 16);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const col = ch === '#' ? main : ch === 'h' ? shade(color, 1.35) : shade(color, 0.35);
      g.fillStyle(col, 1).fillRect(x, y, 1, 1);
    });
  });
  g.generateTexture(key, 10, 10);
  g.destroy();
  return key;
}

const JCOLS = 5;
const JSLOT = 40;
const JX = 22;
const JY = 44;
const COLS = 5;
const SLOT = 32;
const GRID_X = 20;
const GRID_Y = 42;
const ROWS = 5;

// The bag: a grid of everything you carry, with a detail panel for the selected slot.
export default class InventoryScreen {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.parts = [];
    this.index = 0;
    this.entries = [];
    this.mode = 'bag';
    this.jIndex = 0;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (this.isOpen) return;
    const s = this.scene;
    this.isOpen = true;
    this.mode = 'bag';
    this.entries = listEntries(s.gameState, itemsData, toolDefs, weaponDefs, armorDefs, enchantDefs);
    this.index = Math.min(this.index, Math.max(0, this.entries.length - 1));

    const add = (o) => {
      o.setScrollFactor(0).setDepth(300);
      this.parts.push(o);
      return o;
    };
    // invisible full-screen layer so taps don't reach the buttons underneath
    const zone = s.add.zone(160, 120, 320, 240).setScrollFactor(0).setDepth(299).setInteractive();
    this.parts.push(zone);
    add(s.add.rectangle(160, 120, 320, 240, 0x000000, 0.55));
    add(s.add.rectangle(10, 12, 300, 216, 0x1a1a30, 0.98).setOrigin(0, 0).setStrokeStyle(2, 0xffffff));
    add(s.add.text(20, 18, 'BAG', { fontSize: '12px', fontFamily: 'monospace', color: '#ffe08a' }));

    // purse (the Coin Pouch)
    const coin = iconKey(s, 'coin', '#f2c230');
    add(s.add.image(236, 24, coin).setOrigin(0.5));
    this.purseText = add(s.add.text(300, 24, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(1, 0.5));
    add(s.add.text(300, 34, itemsData.purse.name, { fontSize: '7px', fontFamily: 'monospace', color: '#9aa0b8' }).setOrigin(1, 0));

    // slots
    this.slotBoxes = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = GRID_X + (i % COLS) * (SLOT + 2);
      const y = GRID_Y + Math.floor(i / COLS) * (SLOT + 2);
      const e = this.entries[i];
      const box = add(s.add.rectangle(x, y, SLOT, SLOT, e ? 0x2c2c4a : 0x20203a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x4a4a70));
      if (e) {
        box.setInteractive();
        box.on('pointerdown', () => this.select(i));
        const img = add(s.add.image(x + SLOT / 2, y + SLOT / 2 - 3, iconKey(s, e.icon, e.color)).setOrigin(0.5).setScale(2));
        if (e.kind === 'weapon' || e.kind === 'armor') {
          // weapons and armor don't wear out: no count, no bar
        } else if (e.kind === 'item') {
          add(s.add.text(x + SLOT - 3, y + SLOT - 3, String(e.count), { fontSize: '8px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(1, 1));
        } else {
          const frac = e.max > 0 ? e.dur / e.max : 0;
          add(s.add.rectangle(x + 3, y + SLOT - 5, SLOT - 6, 3, 0x000000, 1).setOrigin(0, 0));
          const col = e.broken ? 0xd04040 : frac <= 0.25 ? 0xe0a030 : 0x50c060;
          if (frac > 0) add(s.add.rectangle(x + 3, y + SLOT - 5, Math.max(1, (SLOT - 6) * frac), 3, col, 1).setOrigin(0, 0));
        }
        void img;
      }
      this.slotBoxes.push(box);
    }
    this.cursor = add(s.add.rectangle(0, 0, SLOT + 2, SLOT + 2).setOrigin(0, 0).setStrokeStyle(2, 0xffe08a).setFillStyle(0, 0));

    // detail panel
    this.detailName = add(s.add.text(200, 42, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffe08a' }));
    this.detailSub = add(s.add.text(200, 56, '', { fontSize: '8px', fontFamily: 'monospace', color: '#ffffff' }));
    this.eatBtn = add(
      s.add.text(252, 196, 'EAT', { fontSize: '9px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#3a7a3a', padding: { x: 6, y: 3 } }).setOrigin(0.5).setInteractive(),
    );
    this.eatBtn.on('pointerdown', () => this.use());
    this.detailDesc = add(s.add.text(200, 72, '', { fontSize: '8px', fontFamily: 'monospace', color: '#c8ccdc', wordWrap: { width: 104 }, lineSpacing: 2 }));

    // footer: hint + close button (the button is what phones use)
    add(s.add.text(20, 214, 'Arrows: move  Space: eat', { fontSize: '7px', fontFamily: 'monospace', color: '#8a90a8' }));
    const close = add(
      s.add.text(284, 215, 'CLOSE', { fontSize: '9px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#444466', padding: { x: 4, y: 2 } }).setOrigin(0.5).setInteractive(),
    );
    close.on('pointerdown', () => this.close());
    const quit = add(
      s.add.text(222, 215, 'SAVE + TITLE', { fontSize: '8px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#2a4a6a', padding: { x: 4, y: 3 } }).setOrigin(0.5).setInteractive(),
    );
    const jbtn = add(
      s.add.text(150, 215, 'JOURNAL', { fontSize: '8px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#6a3a6a', padding: { x: 4, y: 3 } }).setOrigin(0.5).setInteractive(),
    );
    jbtn.on('pointerdown', () => {
      this.close();
      this.openJournal();
    });
    quit.on('pointerdown', () => {
      this.close();
      this.scene.quitToTitle();
    });

    if (this.entries.length === 0) {
      add(s.add.text(200, 44, 'Nothing yet.', { fontSize: '8px', fontFamily: 'monospace', color: '#8a90a8' }));
    }
    this.refresh();
  }

  select(i) {
    if (this.mode === 'journal') {
      this.jIndex = i;
      this.refreshJournal();
      return;
    }
    if (!this.entries[i]) return;
    this.index = i;
    this.refresh();
  }

  move(dx, dy) {
    if (!this.isOpen) return;
    if (this.mode === 'journal') {
      this.jIndex = moveSelection(this.jIndex, dx, dy, JCOLS, this.jEntries.length);
      this.refreshJournal();
      return;
    }
    this.index = moveSelection(this.index, dx, dy, COLS, this.entries.length);
    this.refresh();
  }

  refresh() {
    const gs = this.scene.gameState;
    this.purseText.setText(String(gs.gold));
    const x = GRID_X + (this.index % COLS) * (SLOT + 2) - 1;
    const y = GRID_Y + Math.floor(this.index / COLS) * (SLOT + 2) - 1;
    this.cursor.setPosition(x, y).setVisible(this.entries.length > 0);
    const e = this.entries[this.index];
    if (!e) {
      this.eatBtn.setVisible(false);
      this.detailName.setText('');
      this.detailSub.setText('');
      this.detailDesc.setText('');
      return;
    }
    this.detailName.setText(e.name);
    this.eatBtn.setVisible(e.kind === 'item' && (e.heal > 0 || e.id === 'waystone-charm'));
    this.eatBtn.setText(e.id === 'waystone-charm' ? 'USE' : 'EAT');
    if (e.kind === 'armor') {
      this.detailSub.setText(`Defense ${e.defense}`);
      this.detailDesc.setText(e.desc);
    } else if (e.kind === 'weapon') {
      this.detailSub.setText(`Damage ${e.damage}`);
      this.detailDesc.setText(e.desc);
    } else if (e.kind === 'item') {
      this.detailSub.setText(e.heal > 0 ? `x${e.count}   heals ${e.heal / 2} heart${e.heal === 2 ? '' : 's'}` : `x${e.count}`);
      this.detailDesc.setText(e.desc);
    } else {
      this.detailSub.setText(e.broken ? 'Broken!' : `Wear ${e.dur}/${e.max}`);
      const lines = [e.desc];
      if (e.repair) lines.push(`Repair: ${e.repair}`);
      this.detailDesc.setText(lines.join('\n'));
    }
  }

  // Space / the EAT button: eat the selected food
  use() {
    if (this.mode === 'journal') return;
    const e = this.entries[this.index];
    if (this.isOpen && e && e.kind === 'item' && e.id === 'waystone-charm') {
      this.close();
      this.scene.openWaystones();
      return;
    }
    if (!this.isOpen || !e || e.kind !== 'item' || !e.heal) return;
    const msg = this.scene.eatFood(e.id);
    // rebuild so counts and the cursor stay right (the stack may be gone now)
    this.close();
    this.open();
    if (msg) this.scene.showToast(msg);
  }

  // ---- the Friend Journal (journal.js): a page for every friend in the world, shown as a silhouette until you meet it ----
  openJournal() {
    if (this.isOpen) return;
    const s = this.scene;
    this.isOpen = true;
    this.mode = 'journal';
    this.jEntries = journalEntries(s.gameState, friendDefs, itemsData.items);
    this.jIndex = Math.min(this.jIndex, this.jEntries.length - 1);
    const add = (o) => {
      o.setScrollFactor(0).setDepth(300);
      this.parts.push(o);
      return o;
    };
    this.parts.push(s.add.zone(160, 120, 320, 240).setScrollFactor(0).setDepth(299).setInteractive());
    add(s.add.rectangle(160, 120, 320, 240, 0x000000, 0.55));
    add(s.add.rectangle(10, 12, 300, 216, 0x2a1a30, 0.98).setOrigin(0, 0).setStrokeStyle(2, 0xffffff));
    add(s.add.text(20, 18, 'FRIEND JOURNAL', { fontSize: '12px', fontFamily: 'monospace', color: '#ffb8e8' }));
    this.jCount = add(s.add.text(300, 20, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(1, 0));
    this.jBoxes = [];
    this.jEntries.forEach((e, n) => {
      const x = JX + (n % JCOLS) * (JSLOT + 6);
      const y = JY + Math.floor(n / JCOLS) * (JSLOT + 6);
      const box = add(s.add.rectangle(x, y, JSLOT, JSLOT, e.met ? 0x3c2c4a : 0x20203a, 1).setOrigin(0, 0).setStrokeStyle(1, 0x6a4a80).setInteractive());
      box.on('pointerdown', () => this.select(n));
      const img = add(s.add.image(x + JSLOT / 2, y + JSLOT / 2, e.texture).setOrigin(0.5).setScale(2));
      if (!e.met) {
        img.setTintFill(0x0a0a14).setAlpha(0.85);
        add(s.add.text(x + JSLOT / 2, y + JSLOT / 2, '?', { fontSize: '12px', fontFamily: 'monospace', color: '#6a6a90' }).setOrigin(0.5));
      }
      this.jBoxes.push(box);
    });
    this.jCursor = add(s.add.rectangle(0, 0, JSLOT + 2, JSLOT + 2).setOrigin(0, 0).setStrokeStyle(2, 0xffe08a).setFillStyle(0, 0));
    this.jName = add(s.add.text(20, 136, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffe08a' }));
    this.jDesc = add(s.add.text(20, 152, '', { fontSize: '8px', fontFamily: 'monospace', color: '#d8d0e8', wordWrap: { width: 280 }, lineSpacing: 3 }));
    this.jReward = add(s.add.text(20, 198, '', { fontSize: '8px', fontFamily: 'monospace', color: '#9be8a0', wordWrap: { width: 280 } }));
    add(s.add.text(20, 214, 'Arrows: move', { fontSize: '7px', fontFamily: 'monospace', color: '#8a90a8' }));
    const bag = add(s.add.text(222, 215, 'BAG', { fontSize: '9px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#2a4a6a', padding: { x: 6, y: 3 } }).setOrigin(0.5).setInteractive());
    bag.on('pointerdown', () => {
      this.close();
      this.open();
    });
    const close = add(s.add.text(284, 215, 'CLOSE', { fontSize: '9px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#444466', padding: { x: 4, y: 2 } }).setOrigin(0.5).setInteractive());
    close.on('pointerdown', () => this.close());
    this.refreshJournal();
  }

  refreshJournal() {
    const gs = this.scene.gameState;
    const n = metCount(gs);
    this.jCount.setText(`${n} / ${this.jEntries.length}`);
    const e = this.jEntries[this.jIndex];
    this.jCursor.setPosition(JX + (this.jIndex % JCOLS) * (JSLOT + 6) - 1, JY + Math.floor(this.jIndex / JCOLS) * (JSLOT + 6) - 1);
    if (e.met) {
      this.jName.setText(e.name);
      const lines = [e.hint, `Favourite treat: ${e.treat}.`];
      if (e.when) lines.push(e.when);
      lines.push(e.yours.length ? `Your friends: ${e.yours.join(', ')}` : 'You have said goodbye to this one, but you will always remember it.');
      this.jDesc.setText(lines.join('\n'));
    } else {
      this.jName.setText('???');
      this.jDesc.setText([e.hint, e.when, 'Offer it its favourite treat to make friends.'].filter(Boolean).join('\n'));
    }
    const nx = nextReward(gs);
    this.jReward.setText(nx ? `Next reward at ${nx.count} friends: ${(itemsData.items[nx.item]?.name ?? nx.item)} x${nx.amount}` : 'You met every friend!');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
    this.slotBoxes = [];
  }
}
