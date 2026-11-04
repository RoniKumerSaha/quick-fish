/**
 * Procedural audio. Everything is synthesised with WebAudio — no asset files.
 *
 * - SFX: short oscillator/noise envelopes with per-sound character.
 * - Music: a slow, relaxing generative loop over a pentatonic scale with a
 *   plucked melody, soft bass pad and gentle wave noise.
 */

const NOTE = (semitonesFromA4) => 440 * Math.pow(2, semitonesFromA4 / 12);

// A minor pentatonic-ish scale for the melody (semitone offsets from A4).
const SCALE = [-12, -10, -8, -5, -3, 0, 3, 5, 7, 10, 12, 15];

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.musicEnabled = true;
    this._musicTimer = null;
    this._step = 0;
    this._started = false;
    this._waveNodes = [];
  }

  /** Lazily create the AudioContext (browsers require a user gesture). */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      this.enabled = false;
      return;
    }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.55;
    this.sfxGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.0;
    this.musicGain.connect(this.master);

    this._buildWaveBed();
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) {
      this.master.gain.setTargetAtTime(on ? 0.85 : 0.0, this.ctx.currentTime, 0.05);
    }
  }

  setMusicEnabled(on) {
    this.musicEnabled = on;
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(on ? 0.28 : 0.0, this.ctx.currentTime, 0.4);
  }

  // ---------------------------------------------------------------- wave bed

  _buildWaveBed() {
    // Filtered noise loop = ocean wash.
    const len = this.ctx.sampleRate * 4;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Brown-ish noise for a soft surf.
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    // Cross-fade the ends so the loop is seamless.
    const fade = this.ctx.sampleRate * 0.5;
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      data[i] = data[i] * t + data[len - fade + i] * (1 - t);
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start();
    lfo.start();
    this._waveNodes.push(src, lfo);
  }

  // -------------------------------------------------------------------- sfx

  _env(node, t, attack, decay, peak = 1) {
    const g = node.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  _tone(freq, { type = 'sine', dur = 0.15, attack = 0.005, peak = 0.5, slideTo = null, delay = 0 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    this._env(gain, t, attack, dur, peak);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + attack + 0.05);
  }

  _noise({ dur = 0.2, peak = 0.4, freq = 1200, q = 1, type = 'bandpass', delay = 0, sweepTo = null } = {}) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.value = q;
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t + dur);
    const gain = this.ctx.createGain();
    this._env(gain, t, 0.005, dur, peak);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  cast() {
    this._noise({ dur: 0.35, peak: 0.28, freq: 900, sweepTo: 260, type: 'lowpass', q: 0.7 });
    this._tone(180, { type: 'triangle', dur: 0.18, peak: 0.16, slideTo: 90 });
  }

  splash() {
    this._noise({ dur: 0.22, peak: 0.34, freq: 2600, sweepTo: 700, q: 0.8 });
    this._tone(520, { type: 'sine', dur: 0.12, peak: 0.12, slideTo: 240 });
  }

  bite() {
    this._tone(880, { type: 'square', dur: 0.08, peak: 0.16 });
    this._tone(1180, { type: 'square', dur: 0.09, peak: 0.16, delay: 0.09 });
    this._tone(880, { type: 'square', dur: 0.08, peak: 0.16, delay: 0.19 });
  }

  hookSet() {
    this._tone(300, { type: 'sawtooth', dur: 0.12, peak: 0.18, slideTo: 620 });
    this._noise({ dur: 0.1, peak: 0.2, freq: 1800 });
  }

  reelTick() {
    this._noise({ dur: 0.04, peak: 0.09, freq: 3200, q: 3 });
  }

  catchSuccess() {
    const notes = [0, 4, 7, 12];
    notes.forEach((n, i) => {
      this._tone(NOTE(n + 12), { type: 'triangle', dur: 0.16, peak: 0.22, delay: i * 0.07 });
    });
  }

  catchJoke() {
    this._tone(320, { type: 'square', dur: 0.1, peak: 0.16 });
    this._tone(240, { type: 'square', dur: 0.12, peak: 0.16, delay: 0.1 });
    this._tone(180, { type: 'square', dur: 0.22, peak: 0.16, delay: 0.2 });
    this._noise({ dur: 0.3, peak: 0.12, freq: 400, type: 'lowpass' });
  }

  snap() {
    this._noise({ dur: 0.18, peak: 0.4, freq: 2400, sweepTo: 300, q: 0.6 });
    this._tone(700, { type: 'sawtooth', dur: 0.2, peak: 0.2, slideTo: 120 });
  }

  coin() {
    this._tone(NOTE(19), { type: 'square', dur: 0.07, peak: 0.14 });
    this._tone(NOTE(26), { type: 'square', dur: 0.12, peak: 0.14, delay: 0.06 });
  }

  buy() {
    this._tone(NOTE(12), { type: 'triangle', dur: 0.09, peak: 0.2 });
    this._tone(NOTE(19), { type: 'triangle', dur: 0.14, peak: 0.2, delay: 0.07 });
  }

  denied() {
    this._tone(160, { type: 'square', dur: 0.09, peak: 0.16 });
    this._tone(120, { type: 'square', dur: 0.12, peak: 0.16, delay: 0.08 });
  }

  unlock() {
    [0, 7, 12, 16, 19].forEach((n, i) => {
      this._tone(NOTE(n + 7), { type: 'triangle', dur: 0.3, peak: 0.2, delay: i * 0.09 });
    });
  }

  ui() {
    this._tone(660, { type: 'square', dur: 0.04, peak: 0.08 });
  }

  levelUp() {
    [0, 5, 9, 12, 17].forEach((n, i) => {
      this._tone(NOTE(n + 4), { type: 'square', dur: 0.12, peak: 0.16, delay: i * 0.06 });
    });
  }

  // ------------------------------------------------------------------ music

  startMusic() {
    if (!this.ctx) return;
    if (this._started) return;
    this._started = true;
    this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.28 : 0.0, this.ctx.currentTime, 1.5);
    this._step = 0;
    this._musicTimer = setInterval(() => this._musicTick(), 700);
  }

  stopMusic() {
    if (this._musicTimer) clearInterval(this._musicTimer);
    this._musicTimer = null;
    this._started = false;
  }

  _musicTick() {
    if (!this.ctx || !this.musicEnabled || !this.enabled) return;
    const s = this._step++;

    // Melody: pick a random-ish note from the scale, sparse and calm.
    if (s % 2 === 0 || Math.random() < 0.25) {
      const idx = Math.floor(Math.random() * SCALE.length);
      const freq = NOTE(SCALE[idx]);
      this._pluck(freq, 0.13);
      if (Math.random() < 0.3) {
        this._pluck(NOTE(SCALE[idx] + 12), 0.07, 0.25);
      }
    }

    // Bass pad every 4 steps.
    if (s % 4 === 0) {
      const bass = NOTE(SCALE[Math.floor(Math.random() * 4)] - 12);
      this._pad(bass);
    }

    // Occasional high shimmer.
    if (s % 16 === 7) {
      this._tone(NOTE(SCALE[SCALE.length - 1] + 12), { type: 'sine', dur: 1.4, attack: 0.4, peak: 0.05 });
    }
  }

  _pluck(freq, peak = 0.12, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.5);
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.8);
  }

  _pad(freq) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    osc.type = 'sine';
    osc2.type = 'sine';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 1.005;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + 3.4);
    osc2.stop(t + 3.4);
  }
}

export const audio = new Audio();
