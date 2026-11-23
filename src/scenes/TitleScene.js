import Phaser from 'phaser';
import { SaveManager } from '../SaveManager.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  preload() {
    this.load.image('title-bg', 'assets/ui/title-bg.png');
    this.load.image('title-logo', 'assets/ui/title-logo.png');
    this.load.image('button', 'assets/ui/button.png');
  }

  create() {
    this.cameras.main.fadeIn(300);
    this.starting = false;
    this.confirming = false;

    this.add.image(0, 0, 'title-bg').setOrigin(0, 0);

    // Logo: shrink to fit if it's big, and smooth it (pixel-perfect scaling
    // can look jagged on a high-resolution logo)
    this.textures.get('title-logo').setFilter(Phaser.Textures.FilterMode.LINEAR);
    const logo = this.add.image(160, 70, 'title-logo');
    logo.setScale(Math.min(1, 280 / logo.width, 100 / logo.height));

    const hasSave = SaveManager.hasSave();

    if (hasSave) {
      this.makeButton(150, 'Continue', () => this.startGame());
      this.newGameBtn = this.makeButton(182, 'New Game', () => this.onNewGame(true));
      this.primaryAction = () => this.startGame();
    } else {
      this.newGameBtn = this.makeButton(160, 'New Game', () => this.onNewGame(false));
      this.primaryAction = () => this.onNewGame(false);
    }

    // Enter / Space also pick the top button
    this.input.keyboard.on('keydown-ENTER', () => this.primaryAction());
    this.input.keyboard.on('keydown-SPACE', () => this.primaryAction());
  }

  makeButton(y, label, onClick) {
    const img = this.add.image(160, y, 'button').setInteractive({ useHandCursor: true });
    const text = this.add
      .text(160, y, label, { fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5);
    img.on('pointerover', () => img.setTint(0xcccccc));
    img.on('pointerout', () => img.clearTint());
    img.on('pointerdown', onClick);
    return { img, text };
  }

  onNewGame(hasSave) {
    if (!hasSave) return this.startNew();

    // Existing save: ask for a second tap before erasing it
    if (!this.confirming) {
      this.confirming = true;
      this.newGameBtn.text.setText('Erase save? Tap again').setColor('#ff8888');
      this.time.delayedCall(3000, () => {
        this.confirming = false;
        this.newGameBtn.text.setText('New Game').setColor('#ffffff');
      });
      return;
    }
    this.startNew();
  }

  startNew() {
    SaveManager.clear();
    this.startGame();
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    this.registry.set('gameState', null); // WorldScene reloads from the save (or starts fresh)
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('World'));
  }
}
