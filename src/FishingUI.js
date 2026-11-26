// The fishing screen: bobber on the water, the "!" bite, and the reel bar. The rules live in fishing.js.
import audio from './audio.js';
import fishDefs from './data/fish.json';
import itemsData from './data/items.json';
import { iconKey } from './InventoryScreen.js';
import { isNightPhase } from './daynight.js';
import { hasRod, startCast, castStatus, pressCast, startReel, markerPos, pressReel, pickFish, landFish, loggedCount, BITE_WINDOW } from './fishing.js';

const BAR_X = 100;
const BAR_W = 120;
const BAR_Y = 204;

export default class FishingUI {
  constructor(scene, { gid = 0, area = null } = {}) {
    this.scene = scene;
    this.gid = gid;
    this.area = area;
    this.state = null; // { phase: 'wait'|'bite'|'reel', cast, reel, fish, tile, parts }
  }

  get active() {
    return !!this.state;
  }

  // is the tile in front of you water you can fish in?
  isWater(tx, ty) {
    const s = this.scene;
    if (!this.gid || !s.obstacles) return false;
    const t = s.obstacles.getTileAt(tx, ty);
    return !!t && t.index === this.gid;
  }

  // Space at the water's edge. Returns true if it used the key press.
  tryCast(tx, ty) {
    if (!this.isWater(tx, ty)) return false;
    const s = this.scene;
    const gs = s.gameState;
    if (!hasRod(gs)) {
      s.showToast('You need a fishing rod. Try the pond in the forest...');
      return true;
    }
    const now = s.time.now;
    // the bobber lands up to two tiles out, so the player's own sprite never hides it
    const f = s.facing;
    let k = 0;
    while (k < 2 && this.isWater(tx + f.x * (k + 1), ty + f.y * (k + 1))) k += 1;
    const x = (tx + f.x * k) * 16 + 8;
    const y = (ty + f.y * k) * 16 + 8;
    const parts = [];
    const ripple = s.add.circle(x, y, 4).setStrokeStyle(1, 0xffffff, 0.8).setFillStyle(0, 0).setDepth(8);
    s.tweens.add({ targets: ripple, scale: 2, alpha: 0, duration: 900, repeat: -1 });
    const bobber = s.add.circle(x, y, 2.5, 0xff3030).setDepth(9).setStrokeStyle(1, 0xffffff);
    const line = s.add.graphics().setDepth(8);
    parts.push(ripple, bobber, line);
    this.state = { phase: 'wait', cast: startCast(now), tile: { tx, ty }, bobber, line, parts, bx: x, by: y };
    this.drawLine(0);
    audio.sfx('cast');
    s.time.delayedCall(220, () => audio.sfx('splash'));
    s.showToast('You cast your line... wait for a bite!');
    return true;
  }

  drawLine(dip) {
    const st = this.state;
    const p = this.scene.player;
    st.line.clear().lineStyle(1, 0xffffff, 0.7).lineBetween(p.x + 8, p.y + 4, st.bx, st.by + dip);
    st.bobber.setPosition(st.bx, st.by + dip);
  }

  update(now) {
    const st = this.state;
    if (!st) return;
    const s = this.scene;
    if (st.phase === 'wait' || st.phase === 'bite') {
      const status = castStatus(st.cast, now);
      if (status === 'lost') { audio.sfx('miss'); return this.cancel('Too slow... it got away.'); }
      if (status === 'bite' && st.phase === 'wait') {
        st.phase = 'bite';
        audio.sfx('bite');
        st.bang = s.add.text(s.player.x + 8, s.player.y - 14, '!', { fontSize: '16px', fontFamily: 'monospace', color: '#ff4040', stroke: '#ffffff', strokeThickness: 3 }).setOrigin(0.5).setDepth(120);
        st.parts.push(st.bang);
      }
      this.drawLine(st.phase === 'bite' ? (Math.floor(now / 80) % 2) * 2 : 0); // the bobber dips when something bites
      return;
    }
    if (st.phase === 'reel') {
      this.drawLine(Math.sin(now / 90) * 1.5);
      this.drawBar(now);
    }
  }

  // Space (or the A button) while a line is out
  press() {
    const st = this.state;
    if (!st) return;
    const s = this.scene;
    const now = s.time.now;
    if (st.phase === 'wait' || st.phase === 'bite') {
      const r = pressCast(st.cast, now);
      if (r === 'early') { audio.sfx('miss'); return this.cancel('Too early! You scared the fish.'); }
      if (r === 'lost') return this.cancel('Too slow... it got away.');
      const night = isNightPhase(s.phaseNow());
      const fish = pickFish(this.area, night, fishDefs);
      if (!fish) return this.cancel('Nothing is biting here.');
      st.bang?.destroy();
      audio.sfx('splash');
      if (fish.junk) {
        this.land(fish);
        return;
      }
      st.fish = fish;
      st.phase = 'reel';
      st.reel = startReel(fish, now);
      st.bar = s.add.graphics().setScrollFactor(0).setDepth(250);
      st.label = s.add.text(BAR_X + BAR_W / 2, BAR_Y - 14, '', { fontSize: '8px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setScrollFactor(0).setDepth(251);
      st.parts.push(st.bar, st.label);
      s.showToast('A fish! Press Space when the marker is in the green!');
      this.drawBar(now);
      return;
    }
    const r = pressReel(st.reel, now);
    st.flash = { ok: r.hit, until: now + 250 };
    if (r.done === 'caught') this.land(st.fish);
    else if (r.done === 'escaped') { audio.sfx('miss'); this.cancel(`The ${st.fish.name} got away!`); }
    else if (r.hit) { audio.sfx('pull'); s.showToast('Nice pull! Keep going!'); }
    else { audio.sfx('miss'); s.showToast('Missed! The line goes slack...'); }
  }

  drawBar(now) {
    const st = this.state;
    const r = st.reel;
    const g = st.bar;
    g.clear();
    g.fillStyle(0x000000, 0.7).fillRect(BAR_X - 2, BAR_Y - 2, BAR_W + 4, 14);
    g.fillStyle(0x2a4a6a, 1).fillRect(BAR_X, BAR_Y, BAR_W, 10);
    const zx = BAR_X + (r.center - r.zone / 2) * BAR_W;
    const flash = st.flash && now < st.flash.until ? st.flash.ok : null;
    g.fillStyle(flash === false ? 0xd04040 : flash ? 0xc8ff80 : 0x48c860, 1).fillRect(zx, BAR_Y, r.zone * BAR_W, 10);
    g.fillStyle(0xffffff, 1).fillRect(BAR_X + markerPos(r, now) * BAR_W - 1, BAR_Y - 2, 3, 14);
    st.label.setText(`${st.fish.name}   pulls ${r.hits}/${r.need}   slips ${r.strikes}/2`);
  }

  land(fish) {
    const s = this.scene;
    const gs = s.gameState;
    const { first } = landFish(gs, { id: fish.id, ...fish });
    const x = s.player.x + 8;
    const y = s.player.y - 6;
    this.clear();
    audio.sfx(fish.junk ? 'splash' : 'catch');
    const icon = s.add.image(x, y, iconKey(s, fish.junk ? 'boots' : 'fish', fish.color)).setScale(3).setDepth(130);
    s.tweens.add({ targets: icon, y: y - 22, alpha: 0, duration: 1400, ease: 'Sine.easeOut', onComplete: () => icon.destroy() });
    if (fish.junk) s.showToast('You reeled in... a soggy boot. Ew!');
    else {
      const { caught, total } = loggedCount(gs, fishDefs);
      s.showToast(first ? `Caught a ${fish.name}! New for your log (${caught}/${total}).` : `Caught a ${fish.name}!`);
    }
    s.updateHud();
  }

  clear() {
    if (!this.state) return;
    this.scene.tweens.killTweensOf(this.state.parts);
    this.state.parts.forEach((p) => p.destroy());
    this.state = null;
  }

  cancel(msg) {
    if (!this.state) return;
    this.clear();
    if (msg) this.scene.showToast(msg);
  }
}
