/**
 * Procedural chiptune bus — menu/world music plus movement & civic SFX.
 * Volumes follow Game Settings (master / music / sfx / mute).
 */

type AudioBus = 'sfx' | 'music';

class RetroAudioSynth {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private masterVol = 0.8;
  private musicVol = 0.55;
  private sfxVol = 0.7;
  private masterGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private ambientId: ReturnType<typeof setInterval> | null = null;
  private theme: 'off' | 'menu' | 'world' = 'off';

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(this.masterGain);
      this.musicBus.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.applyVolumes();
    if (this.isMuted) this.stopMusic();
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.applyVolumes();
    if (this.isMuted) this.stopMusic();
    return this.isMuted;
  }

  public setVolumes(opts: { master?: number; music?: number; sfx?: number; mute?: boolean }) {
    if (opts.master != null) this.masterVol = Math.max(0, Math.min(1, opts.master));
    if (opts.music != null) this.musicVol = Math.max(0, Math.min(1, opts.music));
    if (opts.sfx != null) this.sfxVol = Math.max(0, Math.min(1, opts.sfx));
    if (opts.mute != null) this.isMuted = opts.mute;
    this.applyVolumes();
    if (this.isMuted) this.stopMusic();
  }

  private applyVolumes() {
    const mute = this.isMuted ? 0 : 1;
    if (this.masterGain) this.masterGain.gain.value = this.masterVol * mute;
    if (this.sfxBus) this.sfxBus.gain.value = this.sfxVol;
    if (this.musicBus) this.musicBus.gain.value = this.musicVol;
  }

  private dest(bus: AudioBus): AudioNode | null {
    this.initCtx();
    if (this.isMuted || !this.ctx) return null;
    return bus === 'music' ? this.musicBus : this.sfxBus;
  }

  private blip(
    bus: AudioBus,
    type: OscillatorType,
    startHz: number,
    endHz: number,
    dur: number,
    peak = 0.12,
    when = 0
  ) {
    const out = this.dest(bus);
    if (!this.ctx || !out) return;
    const now = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, startHz), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), now + dur);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + dur);
  }

  public playFootstep() {
    this.blip('sfx', 'triangle', 140, 36, 0.045, 0.09);
  }

  public playJump() {
    this.blip('sfx', 'square', 220, 620, 0.12, 0.11);
    this.blip('sfx', 'triangle', 180, 480, 0.14, 0.05);
  }

  public playLand() {
    this.blip('sfx', 'triangle', 90, 32, 0.08, 0.14);
    this.blip('sfx', 'square', 70, 28, 0.05, 0.04);
  }

  public playSplash() {
    this.blip('sfx', 'sine', 420, 90, 0.16, 0.08);
    this.blip('sfx', 'triangle', 280, 60, 0.12, 0.06, 0.02);
  }

  public playBump() {
    this.blip('sfx', 'square', 90, 50, 0.04, 0.05);
  }

  public playClaim() {
    this.blip('sfx', 'triangle', 200, 340, 0.08, 0.1);
    this.blip('sfx', 'square', 340, 220, 0.07, 0.05, 0.05);
  }

  public playFlag() {
    this.blip('sfx', 'square', 392, 523, 0.1, 0.1);
    this.blip('sfx', 'triangle', 523, 784, 0.12, 0.08, 0.08);
  }

  public playDecree() {
    this.blip('sfx', 'triangle', 330, 440, 0.12, 0.1);
    this.blip('sfx', 'triangle', 440, 660, 0.16, 0.08, 0.1);
  }

  public playClick() {
    this.blip('sfx', 'square', 800, 400, 0.03, 0.12);
  }

  public playItemPickup() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => this.blip('sfx', 'square', freq, freq * 0.98, 0.08, 0.12, i * 0.06));
  }

  public playCardReveal() {
    this.blip('sfx', 'sawtooth', 300, 1200, 0.3, 0.16);
  }

  public playQuestComplete() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => this.blip('sfx', 'triangle', freq, freq, 0.18, 0.16, i * 0.08));
  }

  public startMenuTheme() {
    this.startTheme('menu');
  }

  public startWorldTheme() {
    this.startTheme('world');
  }

  public stopMenuTheme() {
    this.stopMusic();
  }

  public stopWorldTheme() {
    this.stopMusic();
  }

  public stopMusic() {
    for (const n of this.musicNodes) {
      try {
        n.osc.stop();
      } catch {
        /* already stopped */
      }
    }
    this.musicNodes = [];
    if (this.ambientId) clearInterval(this.ambientId);
    this.ambientId = null;
    this.theme = 'off';
  }

  private startTheme(kind: 'menu' | 'world') {
    if (this.theme === kind && this.musicNodes.length) return;
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.musicBus) return;
    this.stopMusic();
    this.theme = kind;
    const ctx = this.ctx;
    const out = this.musicBus;
    const now = ctx.currentTime;
    const melody = kind === 'menu' ? [392, 440, 523.25, 440, 349.23, 392] : [261.63, 329.63, 392, 349.23, 293.66, 329.63];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'world' ? 'sine' : i % 2 ? 'triangle' : 'square';
      osc.frequency.value = freq;
      gain.gain.value = kind === 'world' ? 0.028 : 0.04;
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      this.musicNodes.push({ osc, gain });
    });
    const pad = kind === 'world' ? 3200 : 2400;
    this.ambientId = setInterval(() => {
      if (this.isMuted || !this.ctx || !this.musicBus) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const start = kind === 'world' ? 196 : 180;
      osc.frequency.setValueAtTime(start, t);
      osc.frequency.exponentialRampToValueAtTime(start * 0.5, t + 1.2);
      gain.gain.setValueAtTime(kind === 'world' ? 0.022 : 0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain);
      gain.connect(this.musicBus);
      osc.start(t);
      osc.stop(t + 1.2);
    }, pad);
  }
}

export const retroAudio = new RetroAudioSynth();
