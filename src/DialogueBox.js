const CHARS_PER_SEC = 45;
const MAX_CHARS = 88; // about two lines of text fit in the box

// Long lines are split into pages (at sentence ends where possible) so nothing runs past the bottom of the box
export function paginate(lines, max = MAX_CHARS) {
  const pages = [];
  lines.forEach((line) => {
    const sentences = line.match(/[^.!?]+[.!?]*\s*/g) ?? [line];
    let page = '';
    const flush = () => {
      if (page.trim()) pages.push(page.trim());
      page = '';
    };
    sentences.forEach((sent) => {
      if ((page + sent).trim().length <= max) {
        page += sent;
        return;
      }
      flush();
      if (sent.trim().length <= max) {
        page = sent;
        return;
      }
      // one very long sentence: break it at spaces
      sent.trim().split(' ').forEach((w) => {
        if ((page + ' ' + w).trim().length > max) flush();
        page += (page ? ' ' : '') + w;
      });
    });
    flush();
  });
  return pages;
}

// A tap/key-to-advance dialogue box with a typewriter effect.
// Usage: dialogue.open(['line 1', 'line 2'], 'Speaker Name', () => { ...when closed... })
export default class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.typing = false;
    this.lines = [];
    this.index = 0;
    this.onClose = null;

    // Everything is pinned to the screen (scrollFactor 0) and drawn above the map
    this.box = scene.add
      .image(8, 176, 'dialogue-box')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);

    this.nameText = scene.add
      .text(16, 181, '', { fontSize: '8px', color: '#ffd24a', fontFamily: 'monospace' })
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);

    this.bodyText = scene.add
      .text(16, 193, '', {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
        wordWrap: { width: 288 },
        lineSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);

    this.hint = scene.add
      .text(304, 227, '▼', { fontSize: '8px', color: '#ffffff' })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);
  }

  open(lines, name = '', onClose = null) {
    if (this.isOpen || !lines || lines.length === 0) return;
    this.isOpen = true;
    this.lines = paginate(lines);
    this.index = 0;
    this.onClose = onClose;

    this.box.setVisible(true);
    this.nameText.setText(name).setVisible(true);
    this.bodyText.setVisible(true);

    // Invisible full-screen layer on top of everything: a tap anywhere advances,
    // and it keeps taps from reaching the on-screen buttons underneath.
    this.zone = this.scene.add
      .zone(160, 120, 320, 240)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive();
    this.zone.on('pointerdown', () => this.advance());

    this.showLine();
  }

  showLine() {
    this.fullText = this.lines[this.index];
    this.bodyText.setText('');
    this.hint.setVisible(false);
    this.typing = true;

    if (this.timer) this.timer.remove();
    let i = 0;
    this.timer = this.scene.time.addEvent({
      delay: 1000 / CHARS_PER_SEC,
      repeat: this.fullText.length - 1,
      callback: () => {
        i += 1;
        this.bodyText.setText(this.fullText.slice(0, i));
        if (i >= this.fullText.length) this.finishTyping();
      },
    });
  }

  finishTyping() {
    this.typing = false;
    if (this.timer) this.timer.remove();
    this.bodyText.setText(this.fullText);
    this.hint.setVisible(true);
  }

  // Call on tap / key press: finishes the current line, or moves to the next one
  advance() {
    if (!this.isOpen) return;
    if (this.typing) {
      this.finishTyping();
      return;
    }
    this.index += 1;
    if (this.index >= this.lines.length) this.close();
    else this.showLine();
  }

  close() {
    if (this.timer) this.timer.remove();
    this.box.setVisible(false);
    this.nameText.setVisible(false);
    this.bodyText.setVisible(false);
    this.hint.setVisible(false);
    this.zone.destroy();
    this.isOpen = false;
    const done = this.onClose;
    this.onClose = null;
    if (done) done();
  }
}
