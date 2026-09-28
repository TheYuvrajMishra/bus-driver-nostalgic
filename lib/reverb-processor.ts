"use client";

import { useAudioStore } from "./audio-store";

/**
 * Procedural Bus Cabin Acoustic Reverb & Vintage Filter Engine.
 *
 * Simulates the warm acoustic interior of an Indian highway bus cabin:
 * - 12m x 2.4m x 2.0m acoustic volume with metal roof, glass windows, and vinyl seats
 * - Early reflection taps (18ms, 32ms, 54ms)
 * - 1.6s exponential diffuse decay
 * - Warm low-end chassis body resonance (140Hz / 220Hz)
 * - Immediate acoustic feedback on toggle
 */

class CabinReverbManager {
  private ctx: AudioContext | null = null;
  private convolver: ConvolverNode | null = null;
  private warmFilter: BiquadFilterNode | null = null;
  private wetGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private masterIn: GainNode | null = null;
  private resonanceOsc: OscillatorNode | null = null;
  private resonanceGain: GainNode | null = null;
  private impulseBuffer: AudioBuffer | null = null;
  private initialized = false;

  public getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public init() {
    if (this.initialized || typeof window === "undefined") return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    this.initialized = true;

    try {
      this.masterIn = ctx.createGain();
      this.wetGain = ctx.createGain();
      this.dryGain = ctx.createGain();
      this.warmFilter = ctx.createBiquadFilter();
      this.convolver = ctx.createConvolver();

      // Warm analog low-shelf boost (cozy bus cabin acoustic resonance)
      this.warmFilter.type = "lowshelf";
      this.warmFilter.frequency.value = 220;
      this.warmFilter.gain.value = 4.5;

      // Generate impulse response
      this.convolver.buffer = this.getImpulseResponse(ctx);

      // Connect dry signal
      this.masterIn.connect(this.dryGain);
      this.dryGain.connect(ctx.destination);

      // Connect wet signal (reverb)
      this.masterIn.connect(this.warmFilter);
      this.warmFilter.connect(this.convolver);
      this.convolver.connect(this.wetGain);
      this.wetGain.connect(ctx.destination);

      // Initial state
      const initialReverb = useAudioStore.getState().reverbEnabled;
      this.setReverbEnabled(initialReverb);

      // Setup subtle cabin acoustic resonance generator
      this.setupResonanceGenerator(ctx);
    } catch (err) {
      console.warn("Could not initialize cabin reverb graph:", err);
    }
  }

  private getImpulseResponse(ctx: AudioContext): AudioBuffer {
    if (this.impulseBuffer && this.impulseBuffer.sampleRate === ctx.sampleRate) {
      return this.impulseBuffer;
    }

    const duration = 1.6;
    const decay = 2.2;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * decay);

      // Early discrete reflection taps (windshield glass, side windows, ceiling)
      let earlyL = 0;
      let earlyR = 0;
      if (i === Math.floor(sampleRate * 0.016)) { earlyL += 0.55; earlyR += 0.35; }
      if (i === Math.floor(sampleRate * 0.034)) { earlyL += 0.40; earlyR += 0.48; }
      if (i === Math.floor(sampleRate * 0.058)) { earlyL += 0.30; earlyR += 0.32; }
      if (i === Math.floor(sampleRate * 0.082)) { earlyL += 0.22; earlyR += 0.25; }

      // Diffuse stereo reverberation
      const noiseL = (Math.random() * 2 - 1) * envelope * 0.7;
      const noiseR = (Math.random() * 2 - 1) * envelope * 0.7;

      left[i] = earlyL + noiseL;
      right[i] = earlyR + noiseR;
    }

    this.impulseBuffer = buffer;
    return buffer;
  }

  private setupResonanceGenerator(ctx: AudioContext) {
    try {
      this.resonanceGain = ctx.createGain();
      this.resonanceGain.gain.value = 0;

      // Dual subtle sub-harmonic tone simulating bus cabin air resonance
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 110; // Low A fundamental cabin body mode

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 140;
      filter.Q.value = 2.0;

      osc.connect(filter);
      filter.connect(this.resonanceGain);

      if (this.convolver && this.wetGain) {
        this.resonanceGain.connect(this.convolver);
      }

      osc.start();
      this.resonanceOsc = osc;
    } catch {
      // ignore
    }
  }

  public setReverbEnabled(enabled: boolean) {
    const ctx = this.getAudioContext();
    if (!ctx || !this.wetGain || !this.dryGain) return;

    const now = ctx.currentTime;
    if (enabled) {
      this.wetGain.gain.setTargetAtTime(0.55, now, 0.04);
      this.dryGain.gain.setTargetAtTime(0.85, now, 0.04);
      if (this.resonanceGain) {
        this.resonanceGain.gain.setTargetAtTime(0.018, now, 0.1);
      }
    } else {
      this.wetGain.gain.setTargetAtTime(0.0, now, 0.04);
      this.dryGain.gain.setTargetAtTime(1.0, now, 0.04);
      if (this.resonanceGain) {
        this.resonanceGain.gain.setTargetAtTime(0.0, now, 0.05);
      }
    }
  }

  /**
   * Plays an immediate tactile acoustic impulse response chirp when the user toggles reverb.
   * If turned ON: plays an acoustic test click that rings through the 1.6s bus cabin reverb.
   * If turned OFF: plays a tight dry acoustic click.
   */
  public playAcousticFeedback(enabled: boolean) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      if (enabled) {
        // Warm speaker impulse chirp (sweeping 480Hz -> 160Hz)
        osc.type = "triangle";
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.035);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        osc.connect(gain);
        // Connect to both direct output and the convolver so the reverb tail is immediately audible!
        gain.connect(ctx.destination);
        if (this.convolver && this.wetGain) {
          gain.connect(this.convolver);
        }
      } else {
        // Tight dry click
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.015);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        osc.connect(gain);
        gain.connect(ctx.destination);
      }

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // ignore
    }
  }

  /**
   * Route any external audio node or buffer source through the cabin reverb chain.
   */
  public getMasterInput(): GainNode | null {
    if (!this.initialized) {
      this.init();
    }
    return this.masterIn;
  }
}

export const cabinReverb = new CabinReverbManager();
