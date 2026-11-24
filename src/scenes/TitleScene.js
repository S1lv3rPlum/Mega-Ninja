import Phaser from 'phaser';
import { SaveManager } from '../SaveManager.js';

const ROW_Y = [124, 152, 180];

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  preload() {
    this.load.image('title-bg', 'assets/ui/title-bg.png');
    this.load.image('title-logo', 'assets/ui/title-logo.png');
  }

  create() {
    this.cameras.main.fadeIn(300);
    this.starting = false;
    this.selected = 0;
    this.confirmDel = -1;

    this.add.image(0, 0, 'title-bg').setOrigin(0, 0);

    // Logo: shrink to fit and smooth it (pixel-perfect scaling can look jagged on a big logo)
    this.textures.get('title-logo').setFilter(Phaser.Textures.FilterMode.LINEAR);
    const logo = this.add.image(160, 56, 'title-logo');
    logo.setScale(Math.min(1, 280 / logo.width, 76 / logo.height));

    this.slots = SaveManager.list();
    this.rows = this.slots.map((s, i) => this.makeRow(s, i));
    this.add
      .text(160, 212, 'Tap a slot to play. Empty slot = new game.', { fontSize: '8px', color: '#dddddd' })
      .setOrigin(0.5);
    this.highlight();

    // keyboard: up/down to pick a slot, Enter/Space to play, Delete to erase it
    this.input.keyboard.on('keydown-UP', () => this.move(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.move(1));
    this.input.keyboard.on('keydown-ENTER', () => this.choose(this.selected));
    this.input.keyboard.on('keydown-SPACE', () => this.choose(this.selected));
    this.input.keyboard.on('keydown-DELETE', () => this.askDelete(this.selected));
    this.input.keyboard.on('keydown-BACKSPACE', () => this.askDelete(this.selected));
  }

  makeRow(s, i) {
    const y = ROW_Y[i];
    const box = this.add
      .rectangle(160, y, 236, 24, 0x14142a, 0.92)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    box.on('pointerdown', () => {
      this.selected = i;
      this.highlight();
      this.choose(i);
    });
    const title = s.exists ? `${s.slot}. ${s.name}` : `${s.slot}. - Empty -`;
    const label = this.add.text(52, y, title, { fontSize: '10px', color: s.exists ? '#ffffff' : '#9a9ab0' }).setOrigin(0, 0.5);
    const info = s.exists
      ? this.add.text(232, y, s.started ? `${s.gold ?? 0} gold` : 'new', { fontSize: '8px', color: '#ffe08a' }).setOrigin(1, 0.5)
      : null;
    let del = null;
    if (s.exists) {
      del = this.add
        .text(262, y, 'DEL', { fontSize: '8px', color: '#ffffff', backgroundColor: '#6a2a2a', padding: { x: 3, y: 2 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      del.on('pointerdown', () => this.askDelete(i));
    }
    return { box, label, info, del };
  }

  move(d) {
    this.selected = (this.selected + d + this.rows.length) % this.rows.length;
    this.highlight();
  }

  highlight() {
    this.rows.forEach((r, i) => r.box.setStrokeStyle(2, i === this.selected ? 0xffe08a : 0xffffff));
  }

  choose(i) {
    if (this.starting) return;
    const s = this.slots[i];
    if (s.exists) {
      SaveManager.select(s.slot);
      this.startGame();
      return;
    }
    // empty slot: ask for a name (the browser's own text box, so phones get their keyboard)
    const typed = window.prompt('Name this save (up to 12 letters):', `Player ${s.slot}`);
    if (typed === null) return; // cancelled
    const name = typed.trim().slice(0, 12) || `Player ${s.slot}`;
    SaveManager.create(s.slot, name);
    this.startGame();
  }

  // erasing needs a second tap within 3 seconds
  askDelete(i) {
    const s = this.slots[i];
    const row = this.rows[i];
    if (!s || !s.exists || !row.del) return;
    if (this.confirmDel === i) {
      SaveManager.remove(s.slot);
      this.scene.restart();
      return;
    }
    this.confirmDel = i;
    row.del.setText('SURE?').setBackgroundColor('#c03030');
    this.time.delayedCall(3000, () => {
      if (this.confirmDel === i && row.del && row.del.active) {
        this.confirmDel = -1;
        row.del.setText('DEL').setBackgroundColor('#6a2a2a');
      }
    });
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    this.registry.set('gameState', null); // WorldScene loads from the chosen slot (or starts fresh)
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('World'));
  }
}
