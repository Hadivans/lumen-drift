// LUMEN DRIFT — synthesized sound effects. No audio files, no network: every
// sound is a small WebAudio oscillator/envelope patch, created on first user
// gesture (browsers require it) and muted on demand.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._noiseBuffer = null;
  }

  /** Call from a user gesture (click / keydown). Safe to call repeatedly. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  _tone({ type = 'sine', from = 440, to = null, dur = 0.12, vol = 0.5, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise({ dur = 0.2, vol = 0.4, freq = 800, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    if (!this._noiseBuffer) {
      const len = this.ctx.sampleRate * 0.5;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this._noiseBuffer = buf;
    }
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  /** Collect blip — pitch climbs with the combo, so streaks sound rewarding. */
  collect(combo) {
    const step = Math.min(combo, 24);
    const base = 520 * Math.pow(1.059463, step); // semitone per combo step
    this._tone({ type: 'sine', from: base, to: base * 1.5, dur: 0.1, vol: 0.45 });
    this._tone({ type: 'triangle', from: base * 2, to: base * 2.4, dur: 0.07, vol: 0.18 });
  }

  hit() {
    this._tone({ type: 'sawtooth', from: 220, to: 55, dur: 0.28, vol: 0.5 });
    this._noise({ dur: 0.22, vol: 0.35, freq: 900 });
  }

  powerup() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this._tone({ type: 'sine', from: f, dur: 0.14, vol: 0.35, delay: i * 0.07 }));
  }

  levelUp() {
    [392, 523, 659, 784].forEach((f, i) =>
      this._tone({ type: 'triangle', from: f, to: f * 1.01, dur: 0.16, vol: 0.4, delay: i * 0.08 }));
  }

  nearMiss() {
    this._tone({ type: 'sine', from: 880, to: 1320, dur: 0.08, vol: 0.25 });
  }

  click() {
    this._tone({ type: 'square', from: 660, dur: 0.05, vol: 0.2 });
  }

  gameOver() {
    [392, 330, 262, 196].forEach((f, i) =>
      this._tone({ type: 'triangle', from: f, dur: 0.28, vol: 0.4, delay: i * 0.16 }));
  }
}
