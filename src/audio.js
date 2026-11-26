// The sound player: turns the recipes in music.js into sound with the Web Audio API. No audio files at all.
//   audio.attach(scene)        once per scene (finds the browser's audio context through Phaser)
//   audio.play('forest', true) background music (second argument: the calm night version). Changing tunes crossfades.
//   audio.sfx('swing')         a sound effect
//   audio.toggleMute()         mute button (the choice is remembered in localStorage)
// Everything is a harmless no-op when there is no audio (old browsers, tests).
import { buildPattern, midiToFreq, SFX } from './music.js';

const MUTE_KEY = 'mega-ninja-muted';
const LOOKAHEAD = 0.3;
const WAVE_GAIN = { sine: 1, triangle: 0.9, square: 0.42, sawtooth: 0.38 };

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch (err) {
    return false;
  }
}

class Track {
  constructor(audio, pattern, out) {
    this.audio = audio;
    this.p = pattern;
    this.out = out;
    this.byStep = Array.from({ length: pattern.steps }, () => []);
    pattern.events.forEach((e) => this.byStep[e.step % pattern.steps].push(e));
    this.filter = audio.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = pattern.night ? 1400 : 5200;
    this.filter.connect(out);
    this.step = 0;
    this.next = audio.ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.tick(), 90);
  }

  tick() {
    const ctx = this.audio.ctx;
    if (ctx.state !== 'running') {
      this.next = ctx.currentTime + 0.05; // do not queue up notes while the browser is still holding the sound back
      return;
    }
    while (this.next < ctx.currentTime + LOOKAHEAD) {
      this.byStep[this.step].forEach((e) => this.note(e, this.next));
      this.next += this.p.stepSec;
      this.step = (this.step + 1) % this.p.steps;
    }
  }

  note(e, t) {
    const ctx = this.audio.ctx;
    const dur = e.len * this.p.stepSec;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = e.wave;
    osc.frequency.value = midiToFreq(e.midi);
    const k = WAVE_GAIN[e.wave] ?? 0.6;
    const peak = (e.voice === 'bass' ? 0.2 : e.voice === 'pad' ? 0.05 : e.soft ? 0.09 : 0.12) * k;
    const attack = e.voice === 'pad' ? 0.5 : 0.012;
    const release = e.voice === 'pad' ? 0.9 : 0.09;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.linearRampToValueAtTime(peak * (e.voice === 'pad' ? 1 : 0.55), t + Math.max(attack + 0.01, dur * 0.6));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + release);
    osc.connect(g);
    g.connect(this.filter);
    osc.start(t);
    osc.stop(t + dur + release + 0.05);
    this.audio.stats.notes += 1;
  }

  stop(fadeSec) {
    clearInterval(this.timer);
    const ctx = this.audio.ctx;
    const now = ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
    setTimeout(() => {
      try {
        this.out.disconnect();
      } catch (err) {
        /* already gone */
      }
    }, (fadeSec + 1.2) * 1000); // let the last notes ring out
  }
}

class Audio {
  constructor() {
    this.ctx = null;
    this.muted = readMuted();
    this.track = null;
    this.want = null; // { name, night } the tune that should be playing
    this.stats = { notes: 0, sfx: 0 };
    this.noise = null;
  }

  attach(scene) {
    const ctx = scene?.sound?.context;
    if (!ctx || ctx === this.ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.45;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.7;
    this.sfxBus.connect(this.master);
    this.track = null;
    // browsers keep sound off until the player does something
    const wake = () => ctx.state === 'suspended' && ctx.resume();
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, wake));
    if (this.want) this.play(this.want.name, this.want.night);
  }

  play(name, night = false) {
    this.want = { name, night };
    if (!this.ctx) return;
    if (this.track && this.track.p.name === name && this.track.p.night === night) return;
    if (this.track) this.track.stop(1.0);
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    out.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 1.2);
    out.connect(this.musicBus);
    this.track = new Track(this, buildPattern(name, night), out);
  }

  stopMusic() {
    this.want = null;
    if (this.track) this.track.stop(0.6);
    this.track = null;
  }

  sfx(name) {
    const parts = SFX[name];
    if (!this.ctx || !parts || this.muted || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    this.stats.sfx += 1;
    parts.forEach((p) => {
      const t = t0 + (p.at ?? 0);
      const g = ctx.createGain();
      g.gain.setValueAtTime(p.v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + p.d);
      if (p.w === 'noise') {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer();
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.2;
        bp.frequency.setValueAtTime(p.f[0], t);
        bp.frequency.exponentialRampToValueAtTime(Math.max(40, p.f[1]), t + p.d);
        src.connect(bp);
        bp.connect(g);
        src.start(t);
        src.stop(t + p.d + 0.02);
      } else {
        const osc = ctx.createOscillator();
        osc.type = p.w;
        osc.frequency.setValueAtTime(p.f[0], t);
        if (p.f[1] !== p.f[0]) osc.frequency.exponentialRampToValueAtTime(Math.max(30, p.f[1]), t + p.d);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + p.d + 0.02);
      }
      g.connect(this.sfxBus);
    });
  }

  noiseBuffer() {
    if (!this.noise) {
      const ctx = this.ctx;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    return this.noise;
  }

  setMuted(m) {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch (err) {
      /* private window: just do not remember it */
    }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }
}

const audio = new Audio();
export default audio;
