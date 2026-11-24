const LINE_H = 14;
const WIDTH = 140;

// A small tappable choice menu (also works with the keyboard).
// Usage:
//   menu.open(['Yes', 'No'], { onSelect: (index) => { ... }, onCancel: () => { ... } });
// An option can also be { label: 'Buy (10 gold)', disabled: true } to show it greyed out.
// The scene routes keys to move(-1 / 1), select() and cancel().
export default class ChoiceMenu {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.index = 0;
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
    this.onSelect = onSelect;
    this.onCancel = onCancel;

    const s = this.scene;
    const h = this.options.length * LINE_H + 12;
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

    this.texts = this.options.map((o, i) =>
      s.add
        .text(x + 8, y + 6 + i * LINE_H, '', {
          fontSize: '10px',
          fontFamily: 'monospace',
          fixedWidth: WIDTH - 16,
          fixedHeight: LINE_H,
        })
        .setScrollFactor(0)
        .setDepth(201)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.setIndex(i))
        .on('pointerdown', () => {
          this.setIndex(i);
          this.select();
        })
    );
    this.refresh();
  }

  setIndex(i) {
    if (!this.isOpen || this.options[i].disabled) return;
    this.index = i;
    this.refresh();
  }

  refresh() {
    this.texts.forEach((t, i) => {
      const o = this.options[i];
      t.setText((i === this.index ? '▶ ' : '  ') + o.label);
      t.setColor(o.disabled ? '#777777' : i === this.index ? '#ffd24a' : '#ffffff');
    });
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
    this.index = i;
    this.refresh();
  }

  select() {
    if (!this.isOpen || this.options[this.index].disabled) return;
    const choice = this.index;
    const cb = this.onSelect;
    this.close();
    if (cb) cb(choice);
  }

  cancel() {
    if (!this.isOpen) return;
    const cb = this.onCancel;
    this.close();
    if (cb) cb();
  }

  close() {
    this.zone.destroy();
    this.panel.destroy();
    this.texts.forEach((t) => t.destroy());
    this.isOpen = false;
    this.onSelect = null;
    this.onCancel = null;
  }
}
