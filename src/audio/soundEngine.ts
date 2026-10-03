/**
 * Cozy procedural sound synthesis using the Web Audio API.
 * Pure native audio synthesis with zero external dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private musicInterval: number | null = null;
  private campfireNode: AudioNode | null = null;
  private masterGain: GainNode | null = null;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // AudioContext not supported
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx) {
      if (!muted) {
        this.init();
        this.startBackgroundMusic();
      }
      return;
    }

    if (this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }

    if (!muted && !this.musicInterval) {
      this.startBackgroundMusic();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public playFootstep() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, t);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 + Math.random() * 40, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // Audio node failure fallback
    }
  }

  public playJump() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.18);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.18);
    } catch {
      // Ignore
    }
  }

  public playChime(success = false) {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      const notes = success ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime + idx * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch {
      // Ignore
    }
  }

  public playDeerBleat() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.linearRampToValueAtTime(540, t + 0.12);
      osc.frequency.linearRampToValueAtTime(460, t + 0.28);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.3);
    } catch {
      // Ignore
    }
  }

  public playCampfireSparks() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const popTime = t + Math.random() * 0.2;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200 + Math.random() * 800, popTime);

        gain.gain.setValueAtTime(0.08, popTime);
        gain.gain.exponentialRampToValueAtTime(0.001, popTime + 0.04);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(popTime);
        osc.stop(popTime + 0.04);
      }
    } catch {
      // Ignore
    }
  }

  private startBackgroundMusic() {
    if (this.musicInterval) return;

    // Pentatonic scale frequencies (C major pentatonic / A minor pentatonic: C, D, E, G, A)
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
    let noteIndex = 0;

    const playNextNote = () => {
      if (this.isMuted || !this.ctx || !this.masterGain) return;

      try {
        const note = scale[noteIndex % scale.length];
        noteIndex = (noteIndex + 1 + Math.floor(Math.random() * 3)) % scale.length;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Warm kalimba/vibraphone like envelope
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, t);

        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 1.5);
      } catch {
        // Ignore
      }
    };

    this.musicInterval = window.setInterval(playNextNote, 950);
  }

  private weatherGain: GainNode | null = null;
  private weatherSource: AudioNode | null = null;
  private currentWeather: 'clear' | 'rain' | 'snow' = 'clear';

  public setWeather(weather: 'clear' | 'rain' | 'snow') {
    this.currentWeather = weather;
    if (!this.ctx || !this.masterGain) return;

    if (weather === 'clear') {
      if (this.weatherGain) {
        this.weatherGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      }
      return;
    }

    if (!this.weatherGain) {
      this.weatherGain = this.ctx.createGain();
      this.weatherGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.weatherGain.connect(this.masterGain);
    }

    if (!this.weatherSource) {
      // Procedural soft noise buffer (pink/brownish noise)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = weather === 'rain' ? 'lowpass' : 'bandpass';
      filter.frequency.setValueAtTime(weather === 'rain' ? 800 : 380, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.weatherGain);
      noise.start();
      this.weatherSource = noise;
    }

    const targetGain = weather === 'rain' ? 0.08 : 0.05;
    this.weatherGain.gain.setTargetAtTime(this.isMuted ? 0 : targetGain, this.ctx.currentTime, 0.3);
  }

  public destroy() {
    if (this.weatherSource) {
      try {
        (this.weatherSource as AudioBufferSourceNode).stop();
      } catch {
        // Ignore
      }
      this.weatherSource = null;
    }
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const soundEngine = new SoundEngine();
