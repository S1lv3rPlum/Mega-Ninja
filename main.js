import Phaser from 'phaser';
import TitleScene from './scenes/TitleScene.js';
import WorldScene from './scenes/WorldScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 320,   // 20 tiles x 16px
  height: 240,  // 15 tiles x 16px
  pixelArt: true,          // crisp pixels, no blurring when scaled
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },   // allows multi-touch on phones
  scene: [TitleScene, WorldScene], // first scene in the list runs first
});
