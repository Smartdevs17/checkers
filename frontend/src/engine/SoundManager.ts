class SoundManagerClass {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor() {
    const stored = localStorage.getItem("checkers-sound");
    this.enabled = stored !== "0";
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context may not be available
    }
  }

  private playNoise(duration: number, volume = 0.08) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Audio context may not be available
    }
  }

  move() {
    this.playTone(600, 0.1, "sine", 0.12);
    setTimeout(() => this.playNoise(0.05, 0.06), 30);
  }

  capture() {
    this.playTone(400, 0.15, "square", 0.1);
    setTimeout(() => this.playTone(300, 0.1, "square", 0.08), 80);
    this.playNoise(0.1, 0.1);
  }

  king() {
    this.playTone(800, 0.15, "sine", 0.12);
    setTimeout(() => this.playTone(1000, 0.15, "sine", 0.1), 100);
    setTimeout(() => this.playTone(1200, 0.2, "sine", 0.08), 200);
  }

  select() {
    this.playTone(500, 0.06, "sine", 0.08);
  }

  invalid() {
    this.playTone(200, 0.15, "square", 0.1);
    setTimeout(() => this.playTone(180, 0.15, "square", 0.1), 100);
  }

  gameStart() {
    this.playTone(440, 0.15, "sine", 0.12);
    setTimeout(() => this.playTone(554, 0.15, "sine", 0.1), 150);
    setTimeout(() => this.playTone(660, 0.2, "sine", 0.12), 300);
  }

  gameOver() {
    this.playTone(660, 0.2, "sine", 0.12);
    setTimeout(() => this.playTone(554, 0.2, "sine", 0.1), 200);
    setTimeout(() => this.playTone(440, 0.3, "sine", 0.12), 400);
  }

  click() {
    this.playTone(700, 0.04, "sine", 0.06);
  }
}

export const SoundManager = new SoundManagerClass();
