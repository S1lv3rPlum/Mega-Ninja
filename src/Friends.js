import audio from './audio.js';
import friendDefs from './data/friends.json';
import itemsData from './data/items.json';
import toolDefs from './data/tools.json';
import { giveTool } from './tools.js';
import { Coop } from './Coop.js';
import { rabbitOnMap, canCatch, throwRabbit } from './rabbit.js';
import { ensureJournal, claimRewards } from './journal.js';
import { ensurePets, befriend, setCompanion, renamePet, releasePet, isFull, hasKind, hasTreat, treatFor, companionPet, cleanPetName } from './pets.js';

const TILE = 16;

// Scene helper for friends: offering treats, the one that follows you, and the Friends menu.
// (The rules live in pets.js.)
export default class Friends {
  constructor(scene) {
    this.scene = scene;
    this.sprite = null;
    this.sprite_id = null;
    ensurePets(scene.gameState);
    ensureJournal(scene.gameState);
  }

  // called after the map is built: put the companion next to the player
  start() {
    this.refresh(true);
  }

  // make the follower sprite match gs.companion
  refresh(place = false) {
    const s = this.scene;
    if (Coop.active && Coop.me) Coop.sendPresence(Coop.me.m, Coop.me.x, Coop.me.y, Coop.me.d); // tell the others
    const pet = companionPet(s.gameState);
    if (!pet) {
      if (this.sprite) this.sprite.destroy();
      this.sprite = null;
      this.sprite_id = null;
      return;
    }
    const kind = friendDefs.kinds[pet.kind];
    if (this.sprite && this.sprite_id !== pet.id) {
      this.sprite.destroy();
      this.sprite = null;
    }
    if (!this.sprite) {
      this.sprite = s.add.image(0, 0, kind.texture).setOrigin(0, 0).setDepth(7);
      this.sprite_id = pet.id;
      place = true;
    }
    if (place) {
      // start on the tile behind you if it is free, otherwise right under you
      const bx = s.tile.x - s.facing.x;
      const by = s.tile.y - s.facing.y;
      const spot = s.canWalk(bx, by) ? { x: bx, y: by } : s.tile;
      this.sprite.setPosition(spot.x * TILE, spot.y * TILE);
    }
  }

  // the player stepped from `prev`: the friend hops into the tile you just left
  onStep(prev) {
    if (!this.sprite) return;
    this.scene.tweens.add({ targets: this.sprite, x: prev.x * TILE, y: prev.y * TILE, duration: 150 });
  }

  // Space on something small and friendly-able. Returns true if it took the key.
  tryOffer(tx, ty) {
    const s = this.scene;
    const gs = s.gameState;
    const e = s.enemies.at(tx, ty);
    let kindId = null;
    let creature = null;
    if (e && e.def.tame) {
      kindId = e.def.tame;
      creature = { type: 'enemy', e };
    } else if (s.rabbit && rabbitOnMap(s.rabbit) && s.rabbit.x === tx && s.rabbit.y === ty && s.rabbitSprite && canCatch(s.rabbit)) {
      kindId = 'rabbit';
      creature = { type: 'rabbit' };
    }
    if (!kindId) return false;
    const kind = friendDefs.kinds[kindId];
    if (hasKind(gs, kindId)) {
      this.hopAway(creature, kind);
      return true;
    }
    const have = treatFor(gs, kind);
    const treat = itemsData.items[have ?? kind.treat].name;
    if (isFull(gs, friendDefs)) {
      s.showToast(`You have ${friendDefs.max} friends already.`);
      return true;
    }
    if (!hasTreat(gs, kind)) {
      s.showToast(`${kind.name} might like a ${treat.toLowerCase()}...`);
      return true;
    }
    s.choice.open([`Offer a ${treat.toLowerCase()}`, 'Not now'], {
      onSelect: (i) => {
        if (i === 0) this.makeFriend(kindId, creature);
      },
    });
    return true;
  }

  // you already have this kind: it is happy to see you, bounds away, and no treat is used
  hopAway(creature, kind) {
    const s = this.scene;
    const gs = s.gameState;
    audio.sfx('select');
    s.showToast(`The ${kind.name} knows you already! It hops away happily.`);
    const spr = creature.type === 'enemy' ? creature.e.sprite : s.rabbitSprite;
    if (spr) s.tweens.add({ targets: spr, y: spr.y - 4, duration: 110, yoyo: true, repeat: 3 });
    s.time.delayedCall(520, () => {
      if (creature.type === 'enemy') {
        if (!creature.e.dead) s.enemies.kill(creature.e, true); // gone for a while, then it grows back like any other
      } else if (s.rabbitSprite && s.rabbit && canCatch(s.rabbit)) {
        throwRabbit(s.rabbit); // the garden rabbit leaves for a while
        const rs = s.rabbitSprite;
        s.rabbitSprite = null;
        s.tweens.add({ targets: rs, alpha: 0, duration: 300, onComplete: () => rs.destroy() });
      }
    });
  }

  makeFriend(kindId, creature) {
    const s = this.scene;
    const gs = s.gameState;
    const kind = friendDefs.kinds[kindId];
    // the creature must still be there
    if (creature.type === 'enemy' && creature.e.dead) return;
    if (creature.type === 'rabbit' && !s.rabbitSprite) return;
    let name = kind.baseName;
    try {
      const typed = window.prompt(`Your new ${kind.name.toLowerCase()} is happy! Name it:`, kind.baseName);
      name = cleanPetName(typed, kind.baseName);
    } catch (err) {
      /* no prompt available: keep the default name */
    }
    const r = befriend(gs, kindId, name, friendDefs);
    if (!r.ok) return;
    if (creature.type === 'enemy') s.enemies.kill(creature.e, true);
    else {
      throwRabbit(s.rabbit); // it leaves the garden for a while
      const spr = s.rabbitSprite;
      s.rabbitSprite = null;
      s.tweens.add({ targets: spr, alpha: 0, duration: 300, onComplete: () => spr.destroy() });
      if (!gs.flags.shovel_dropped) {
        gs.flags.shovel_dropped = true;
        giveTool(gs, toolDefs, 'shovel');
        s.time.delayedCall(1600, () => s.showToast(`${r.pet.name} gave you a shovel!`));
      }
    }
    this.refresh();
    audio.sfx('friend');
    s.showToast(`${r.pet.name} is your friend now!`);
    const rewards = claimRewards(gs, itemsData.items);
    rewards.forEach((m, i) => s.time.delayedCall(2200 * (i + 1), () => { audio.sfx('reward'); s.showToast(m); }));
    s.updateHud();
  }

  // ---- Friends menu (FRIENDS button / G key) ----
  open() {
    const s = this.scene;
    if (s.choice.isOpen || s.dialogue.isOpen || s.bag.isOpen || s.moving || s.transitioning) return;
    const gs = s.gameState;
    const opts = gs.pets.map((p) => `${p.name}${p.level ? ` Lv${p.level}` : ''}${p.id === gs.companion ? ' (with you)' : ''}`);
    opts.push('Friend Journal', 'Close');
    s.choice.open(opts, {
      onSelect: (i) => {
        if (i < gs.pets.length) this.openPet(gs.pets[i]);
        else if (i === gs.pets.length) {
          claimRewards(gs, itemsData.items).forEach((m) => s.showToast(m)); // (an old save may already have earned one)
          s.bag.openJournal();
        }
      },
    });
  }

  openPet(pet) {
    const s = this.scene;
    const gs = s.gameState;
    const follows = gs.companion === pet.id;
    s.choice.open([follows ? 'Rest at home' : 'Come with me', 'Rename', 'Say goodbye', 'Back'], {
      onSelect: (i) => {
        if (i === 0) {
          setCompanion(gs, follows ? null : pet.id);
          this.refresh(true);
          s.showToast(follows ? `${pet.name} stays home.` : `${pet.name} follows you!`);
        } else if (i === 1) {
          let typed = null;
          try {
            typed = window.prompt('New name:', pet.name);
          } catch (err) {
            /* ignore */
          }
          if (typed !== null) renamePet(gs, pet.id, typed);
        } else if (i === 2) {
          s.choice.open(['Yes, set it free', 'No'], {
            onSelect: (j) => {
              if (j !== 0) return;
              releasePet(gs, pet.id);
              this.refresh();
              s.showToast(`${pet.name} waves goodbye.`);
            },
          });
        } else this.open();
      },
    });
  }
}
