/**
 * Pure Web Audio API Sound Synthesizer.
 * Zero external audio files. Generates rich bell/chime harmonics via oscillators.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private alarmInterval: number | null = null;
  private isAlarmRunning = false;
  private currentVolume = 0.8; // default 80%

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  public isContextRunning(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /**
   * Must be called during or after a user interaction to satisfy browser autoplay policy.
   */
  public async resume(): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      return ctx.state === 'running';
    } catch {
      return false;
    }
  }

  public setVolume(volume0to100: number) {
    const clamped = Math.max(0, Math.min(100, volume0to100));
    this.currentVolume = clamped / 100;
  }

  public getVolumePercent(): number {
    return Math.round(this.currentVolume * 100);
  }

  /**
   * Synthesizes a bell chime tone with natural harmonics and smooth exponential decay.
   */
  private playBellHarmonic(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    gainLevel: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Fast attack (15ms), exponential smooth decay
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainLevel), startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);

    // Add overtone for bell richness
    const overtone = ctx.createOscillator();
    const overGain = ctx.createGain();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2.01, startTime);

    overGain.gain.setValueAtTime(0.0001, startTime);
    overGain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, gainLevel * 0.35),
      startTime + 0.01
    );
    overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

    overtone.connect(overGain);
    overGain.connect(ctx.destination);

    overtone.start(startTime);
    overtone.stop(startTime + duration * 0.7 + 0.05);
  }

  /**
   * Plays a single iteration of the two-tone rising alarm:
   * Tone 1 (659.25 Hz / E5) -> Tone 2 (880.00 Hz / A5)
   */
  public playTwoToneAlarmOnce(customVolume?: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state !== 'running') {
      ctx.resume().catch(() => {});
    }

    const masterVol =
      customVolume !== undefined ? customVolume / 100 : this.currentVolume;
    if (masterVol <= 0.01) return;

    const now = ctx.currentTime;
    // Tone 1: E5 (659Hz)
    this.playBellHarmonic(ctx, 659.25, now, 0.4, masterVol * 0.7);
    // Tone 2: A5 (880Hz) - higher, louder, urgent
    this.playBellHarmonic(ctx, 880.0, now + 0.22, 0.6, masterVol * 0.85);

    // Vibration API support
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 250]);
      } catch {
        // ignore if not allowed
      }
    }
  }

  /**
   * Starts repeating rising alarm every ~2.0 seconds until explicitly stopped.
   */
  public startRepeatingNewOrderAlarm() {
    if (this.isAlarmRunning) return;
    this.isAlarmRunning = true;

    // Play immediately
    this.playTwoToneAlarmOnce();

    // Repeat every 2.1 seconds
    this.alarmInterval = window.setInterval(() => {
      if (!this.isAlarmRunning) {
        if (this.alarmInterval) clearInterval(this.alarmInterval);
        return;
      }
      this.playTwoToneAlarmOnce();
    }, 2100);
  }

  /**
   * Stops repeating alarm immediately.
   */
  public stopRepeatingNewOrderAlarm() {
    this.isAlarmRunning = false;
    if (this.alarmInterval !== null) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  /**
   * Kitchen gentle single chime (one soothing bell for orders moving to kitchen).
   */
  public playKitchenChime(customVolume?: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state !== 'running') {
      ctx.resume().catch(() => {});
    }

    const masterVol =
      customVolume !== undefined ? customVolume / 100 : this.currentVolume;
    if (masterVol <= 0.01) return;

    const now = ctx.currentTime;
    // Soft marimba/gong tone at 523.25 Hz (C5)
    this.playBellHarmonic(ctx, 523.25, now, 0.8, masterVol * 0.5);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(120);
      } catch {
        // ignore
      }
    }
  }

  public playSuccessTone() {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playBellHarmonic(ctx, 523.25, now, 0.2, this.currentVolume * 0.4);
    this.playBellHarmonic(ctx, 659.25, now + 0.1, 0.2, this.currentVolume * 0.4);
    this.playBellHarmonic(ctx, 783.99, now + 0.2, 0.35, this.currentVolume * 0.5);
  }
}

export const audioEngine = new AudioEngine();
