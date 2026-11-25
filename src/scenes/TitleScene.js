import Phaser from 'phaser';
import { SaveManager } from '../SaveManager.js';
import { Coop } from '../Coop.js';
import { cloudReady } from '../cloud.js';
import { cleanCode, cleanName, makeCode } from '../coopLogic.js';

const ROW_Y = [108, 134, 160, 186]; // three solo slots, then the co-op world

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  preload() {
    this.load.image('title-bg', 'assets/ui/title-bg.png');
    this.load.image('title-logo', 'assets/ui/title-logo.png');
    // optional: drop your logo at public/assets/ui/dataforge-logo.png and it appears next to the credit line
    this.load.image('dataforge-logo', 'assets/ui/dataforge-logo.png');
  }

  create() {
    this.cameras.main.fadeIn(300);
    this.starting = false;
    this.connecting = false;
    this.selected = 0;
    this.confirmDel = -1;

    this.add.image(0, 0, 'title-bg').setOrigin(0, 0);

    // Logo: shrink to fit and smooth it (pixel-perfect scaling can look jagged on a big logo)
    this.textures.get('title-logo').setFilter(Phaser.Textures.FilterMode.LINEAR);
    const logo = this.add.image(160, 56, 'title-logo');
    logo.setScale(Math.min(1, 280 / logo.width, 76 / logo.height));

    this.slots = SaveManager.list();
    const co = SaveManager.coop();
    // the co-op world looks like a 4th slot
    this.slots.push({ slot: 4, coop: true, exists: co.exists, name: co.name, code: co.code, started: co.started, gold: co.gold });
    this.rows = this.slots.map((s, i) => this.makeRow(s, i));
    this.status = this.add
      .text(160, 212, 'Tap a slot to play. Empty slot = new game.', { fontSize: '8px', color: '#dddddd', align: 'center', wordWrap: { width: 300 } })
      .setOrigin(0.5);
    this.highlight();
    this.addCredit();

    // keyboard: up/down to pick a slot, Enter/Space to play, Delete to erase it
    this.input.keyboard.on('keydown-UP', () => this.move(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.move(1));
    this.input.keyboard.on('keydown-ENTER', () => this.choose(this.selected));
    this.input.keyboard.on('keydown-SPACE', () => this.choose(this.selected));
    this.input.keyboard.on('keydown-DELETE', () => this.askDelete(this.selected));
    this.input.keyboard.on('keydown-BACKSPACE', () => this.askDelete(this.selected));
  }

  // "Created by Data Forge Apps" along the very bottom, below the instructions
  addCredit() {
    const text = this.add.text(0, 232, 'Created by Data Forge Apps', { fontSize: '8px', color: '#c8c8d8', fontFamily: 'monospace' }).setOrigin(0, 0.5);
    let w = text.width;
    let logo = null;
    if (this.textures.exists('dataforge-logo')) {
      this.textures.get('dataforge-logo').setFilter(Phaser.Textures.FilterMode.LINEAR);
      logo = this.add.image(0, 232, 'dataforge-logo').setOrigin(0, 0.5);
      logo.setScale(Math.min(1, 14 / logo.height, 40 / logo.width)); // at most 14px tall
      w += logo.displayWidth + 4;
    }
    // centre the logo + text together
    let x = 160 - w / 2;
    if (logo) {
      logo.setX(x);
      x += logo.displayWidth + 4;
    }
    text.setX(x);
  }

  makeRow(s, i) {
    const y = ROW_Y[i];
    const box = this.add
      .rectangle(160, y, 236, 22, 0x14142a, 0.92)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    box.on('pointerdown', () => {
      this.selected = i;
      this.highlight();
      this.choose(i);
    });
    let title = s.exists ? `${s.slot}. ${s.name}` : `${s.slot}. - Empty -`;
    if (s.coop) title = s.exists ? `CO-OP ${s.name}` : 'CO-OP WORLD';
    const label = this.add.text(52, y, title, { fontSize: '10px', color: s.exists || s.coop ? '#ffffff' : '#9a9ab0' }).setOrigin(0, 0.5);
    let infoText = s.started ? `${s.gold ?? 0} gold` : 'new';
    if (s.coop) infoText = s.exists ? s.code : cloudReady() ? 'play together' : 'not set up';
    const info = s.exists || s.coop
      ? this.add.text(s.coop && s.exists ? 220 : 232, y, infoText, { fontSize: '8px', color: s.coop ? '#9fd0ff' : '#ffe08a' }).setOrigin(1, 0.5)
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
    if (s.coop) {
      this.chooseCoop(s);
      return;
    }
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
      if (s.coop) SaveManager.removeCoop();
      else SaveManager.remove(s.slot);
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

  say(msg) {
    this.status.setText(msg);
  }

  // The co-op world: a code and a name. Blank code = start a brand-new world.
  chooseCoop(s) {
    if (!cloudReady()) {
      this.say('Co-op is not set up yet. It needs a free Firebase database: see COOP_SETUP.md.');
      return;
    }
    if (s.exists) {
      this.connectCoop(s.code, s.name, false);
      return;
    }
    const typed = window.prompt('Co-op world code.\nType the code to join a world, or leave blank to start a NEW world:', '');
    if (typed === null) return;
    let code = '';
    let create = false;
    if (typed.trim() === '') {
      code = makeCode();
      create = true;
    } else {
      code = cleanCode(typed);
      if (!code) {
        this.say('That is not a world code. They are 6 letters and numbers.');
        return;
      }
    }
    const who = window.prompt('Your name in the co-op world (up to 12 letters).\nUse the same name next time to get your character back:', 'Player');
    if (who === null) return;
    this.connectCoop(code, cleanName(who), create);
  }

  async connectCoop(code, name, create) {
    if (this.starting || this.connecting) return;
    this.connecting = true;
    this.say('Connecting...');
    const r = await Coop.join({ code, name, create });
    this.connecting = false;
    if (!r.ok) {
      this.say(
        r.error === 'no-world'
          ? 'No co-op world with that code. Check the letters.'
          : 'Could not reach the co-op server. Check the internet and try again.'
      );
      return;
    }
    SaveManager.joinCoop(code, name, r.char);
    if (create) window.alert(`Your new co-op world code is\n\n${code}\n\nShare it so others can join!`);
    this.startGame();
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    this.registry.set('coopWelcomed', false);
    this.registry.set('gameState', null); // WorldScene loads from the chosen slot (or starts fresh)
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('World'));
  }
}
