import audio from './audio.js';
const LINE_H = 14;
const MIN_WIDTH = 172;
const MAX_WIDTH = 300;
const CHAR_W = 6; // 10px monospace
const MAX_ROWS = 9; // longer lists scroll (a shop with many offers used to run off the screen)

// A small tappable choice menu (also works with the keyboard).
// Usage:
//   menu.open(['Yes', 'No'], { onSelect: (index) => { ... }, onCancel: () => { ... } });
// An option can also be { label: 'Buy (10 gold)', disabled: true } to show it greyed out.
// The scene routes keys to move(-1 / 1), select() and cancel().
// A list longer than MAX_ROWS scrolls with the arrow keys; ▲ / ▼ show (and can be tapped) when there is more above or below.
export default class ChoiceMenu {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.index = 0;
    this.top = 0; // first visible option
    this.options = [];
    this.parts = [];
    this.onSelect = null;
    this.onCancel = null;
  }

  open(options, { onSelect = null, onCancel = null } = {}) {
    if (this.isOpen || options.length === 0) return;
    this.isOpen = true;
    this.options = options.map((o) => (typeof o === 'string' ? { label: o, disabled: false } : o));
    this.index = this.options.findIndex((o) => !o.disabled);
    if (this.index < 0) this.index = 0;
    this.top = 0;
    this.onSelect = onSelect;
    this.onCancel = onCancel;

    const s = this.scene;
    const longest = Math.max(...this.options.map((o) => o.label.length + 2)); // +2 for the ▶ arrow
    const WIDTH = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, longest * CHAR_W + 20)); // wide enough for long recipe lines
    this.rows = Math.min(this.options.length, MAX_ROWS);
    const h = this.rows * LINE_H + 12;
    const x = 312 - WIDTH; // bottom-right, just above where the dialogue box sits
    const y = 168 - h;

    // invisible full-screen layer: keeps taps from reaching the buttons underneath
    this.zone = s.add.zone(160, 120, 320, 240).setScrollFactor(0).setDepth(198).setInteractive();
    this.panel = s.add
      .rectangle(x, y, WIDTH, h, 0x14142a, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffffff)
      .setScrollFactor(0)
      .setDepth(200);

    this.texts = [];
    for (let r = 0; r < this.rows; r++) {
      this.texts.push(
        s.add
          .text(x + 8, y + 6 + r * LINE_H, '', {
            fontSize: '10px',
            fontFamily: 'monospace',
            fixedWidth: WIDTH - 16,
            fixedHeight: LINE_H,
          })
          .setScrollFactor(0)
          .setDepth(201)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => this.setIndex(this.top + r))
          .on('pointerdown', () => {
            this.setIndex(this.top + r);
            this.select();
          })
      );
    }
    // scroll arrows (only shown when the list is longer than the window)
    const arrow = (label, ay, dir) =>
      s.add
        .text(x + WIDTH - 6, ay, label, { fontSize: '10px', fontFamily: 'monospace', color: '#ffd24a', backgroundColor: '#14142a' })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(202)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.page(dir));
    this.upArrow = arrow('▲', y + 1, -1);
    this.downArrow = arrow('▼', y + h - 13, 1);
    this.refresh();
  }

  // keep the highlighted option inside the visible window
  fitWindow() {
    if (this.index < this.top) this.top = this.index;
    if (this.index >= this.top + this.rows) this.top = this.index - this.rows + 1;
    this.top = Math.max(0, Math.min(this.top, this.options.length - this.rows));
  }

  // tap on ▲ / ▼: jump a page
  page(dir) {
    if (!this.isOpen) return;
    const max = this.options.length - this.rows;
    this.top = Math.max(0, Math.min(max, this.top + dir * (this.rows - 1)));
    if (this.index < this.top) this.index = this.top;
    if (this.index >= this.top + this.rows) this.index = this.top + this.rows - 1;
    this.refresh();
  }

  setIndex(i) {
    if (!this.isOpen || !this.options[i] || this.options[i].disabled) return;
    if (i !== this.index) audio.sfx('move');
    this.index = i;
    this.refresh();
  }

  refresh() {
    this.fitWindow();
    this.texts.forEach((t, r) => {
      const i = this.top + r;
      const o = this.options[i];
      t.setText((i === this.index ? '▶ ' : '  ') + o.label);
      t.setColor(o.disabled ? '#777777' : i === this.index ? '#ffd24a' : '#ffffff');
    });
    this.upArrow.setVisible(this.top > 0);
    this.downArrow.setVisible(this.top + this.rows < this.options.length);
  }

  // dir = -1 (up) or 1 (down); skips greyed-out options
  move(dir) {
    if (!this.isOpen) return;
    const n = this.options.length;
    let i = this.index;
    for (let step = 0; step < n; step++) {
      i = (i + dir + n) % n;
      if (!this.options[i].disabled) break;
    }
    if (i !== this.index) audio.sfx('move');
    this.index = i;
    this.refresh();
  }

  select() {
    if (!this.isOpen || this.options[this.index].disabled) return;
    const choice = this.index;
    audio.sfx('select');
    const cb = this.onSelect;
    this.close();
    if (cb) cb(choice);
  }

  cancel() {
    if (!this.isOpen) return;
    audio.sfx('back');
    const cb = this.onCancel;
    this.close();
    if (cb) cb();
  }

  close() {
    this.zone.destroy();
    this.panel.destroy();
    this.texts.forEach((t) => t.destroy());
    this.upArrow.destroy();
    this.downArrow.destroy();
    this.isOpen = false;
    this.onSelect = null;
    this.onCancel = null;
  }
}
