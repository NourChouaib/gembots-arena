'use client';

/**
 * SoundManager — Web Audio API programmatic sound generation
 * No audio files needed — all sounds generated via oscillators
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private _enabled: boolean = false;
  private initialized: boolean = false;

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    // Load preference from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gembots_sound_enabled');
      this._enabled = saved === 'true';
    }
  }

  get isEnabled() {
    return this._enabled;
  }

  toggle(): boolean {
    this._enabled = !this._enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('gembots_sound_enabled', String(this._enabled));
    }
    // Resume AudioContext on enable (needed for autoplay policy)
    if (this._enabled) {
      const ctx = this.getCtx();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    }
    return this._enabled;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.3,
    rampDown: boolean = true,
  ) {
    if (!this._enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    if (rampDown) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume: number = 0.1) {
    if (!this._enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  /** Battle start — epic rising sweep */
  battleStart() {
    if (!this._enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    // Rising sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);

    // Impact hit
    setTimeout(() => {
      this.playTone(150, 0.2, 'square', 0.2);
      this.playNoise(0.15, 0.15);
    }, 300);
  }

  /** Hit / lead change — short punch */
  hit() {
    this.playNoise(0.1, 0.12);
    this.playTone(200, 0.15, 'square', 0.15);
  }

  /** Critical hit — heavy impact */
  criticalHit() {
    if (!this._enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    // Low boom
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);

    this.playNoise(0.2, 0.2);
  }

  /** Victory — triumphant ascending notes */
  victory() {
    if (!this._enabled) return;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, 'sine', 0.2);
        this.playTone(freq * 1.5, 0.3, 'triangle', 0.1); // harmony
      }, i * 150);
    });
  }

  /** Defeat — descending low notes */
  defeat() {
    if (!this._enabled) return;
    const notes = [392, 330, 262, 196]; // G4, E4, C4, G3
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.5, 'sawtooth', 0.12);
      }, i * 200);
    });
  }

  /** Countdown tick — sharp tick sound, pitch rises as countdown decreases */
  countdownTick(secondsLeft: number) {
    // Pitch increases as we get closer to 0
    const freq = 800 + (10 - Math.max(1, secondsLeft)) * 80;
    this.playTone(freq, 0.08, 'square', 0.15, true);
  }

  /** Price up — quick ascending blip */
  priceUp() {
    this.playTone(600, 0.08, 'sine', 0.1);
    setTimeout(() => this.playTone(900, 0.08, 'sine', 0.1), 60);
  }

  /** Price down — quick descending blip */
  priceDown() {
    this.playTone(500, 0.08, 'sine', 0.1);
    setTimeout(() => this.playTone(350, 0.08, 'sine', 0.1), 60);
  }
}

// Singleton
export const soundManager = new SoundManager();
