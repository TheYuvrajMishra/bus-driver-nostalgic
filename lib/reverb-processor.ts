"use client";

/**
 * Procedural Bus Cabin Acoustic Reverb & Vintage Filter Engine.
 *
 * Generates an authentic impulse response representing a nostalgic
 * Indian highway bus interior (upholstery absorption, metal/glass reflections,
 * early diffuse echoes, and warm analog tone).
 */

let sharedAudioCtx: AudioContext | null = null;
let cabinImpulseBuffer: AudioBuffer | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  return sharedAudioCtx;
}

/**
 * Generates a stereo impulse response buffer simulating a vintage bus cabin.
 */
export function generateBusCabinImpulse(
  ctx: AudioContext,
  duration = 1.3,
  decay = 2.4
): AudioBuffer {
  if (cabinImpulseBuffer && cabinImpulseBuffer.sampleRate === ctx.sampleRate) {
    return cabinImpulseBuffer;
  }

  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Exponential decay with high-frequency absorption
    const envelope = Math.exp(-t * decay);

    // Early reflection discrete taps (bus windows & metal luggage rack)
    let earlyL = 0;
    let earlyR = 0;
    if (i === Math.floor(sampleRate * 0.018)) { earlyL += 0.45; earlyR += 0.3; }
    if (i === Math.floor(sampleRate * 0.032)) { earlyL += 0.35; earlyR += 0.4; }
    if (i === Math.floor(sampleRate * 0.054)) { earlyL += 0.25; earlyR += 0.28; }

    // Diffuse late reverberation
    const noiseL = (Math.random() * 2 - 1) * envelope * 0.65;
    const noiseR = (Math.random() * 2 - 1) * envelope * 0.65;

    left[i] = earlyL + noiseL;
    right[i] = earlyR + noiseR;
  }

  cabinImpulseBuffer = buffer;
  return buffer;
}

export interface ReverbGraph {
  inputNode: GainNode;
  outputNode: GainNode;
  convolverNode: ConvolverNode;
  wetGain: GainNode;
  dryGain: GainNode;
  warmFilter: BiquadFilterNode;
  setReverb: (enabled: boolean, wetLevel?: number) => void;
}

/**
 * Creates a complete Web Audio reverb and warm analog acoustic chain.
 */
export function createBusReverbChain(ctx: AudioContext): ReverbGraph {
  const inputNode = ctx.createGain();
  const outputNode = ctx.createGain();
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const warmFilter = ctx.createBiquadFilter();
  const convolverNode = ctx.createConvolver();

  // Warm vintage cabin acoustic filter (lowpass filter rolling off above 3800Hz)
  warmFilter.type = "lowshelf";
  warmFilter.frequency.value = 220;
  warmFilter.gain.value = 3.5; // Cozy bass resonance

  convolverNode.buffer = generateBusCabinImpulse(ctx);

  // Connect dry path: input -> dryGain -> output
  inputNode.connect(dryGain);
  dryGain.connect(outputNode);

  // Connect wet path: input -> warmFilter -> convolver -> wetGain -> output
  inputNode.connect(warmFilter);
  warmFilter.connect(convolverNode);
  convolverNode.connect(wetGain);
  wetGain.connect(outputNode);

  dryGain.gain.value = 1.0;
  wetGain.gain.value = 0.35; // Default lush cabin echo

  const setReverb = (enabled: boolean, wetLevel = 0.35) => {
    const now = ctx.currentTime;
    if (enabled) {
      wetGain.gain.setTargetAtTime(wetLevel, now, 0.05);
      dryGain.gain.setTargetAtTime(0.9, now, 0.05);
    } else {
      wetGain.gain.setTargetAtTime(0, now, 0.05);
      dryGain.gain.setTargetAtTime(1.0, now, 0.05);
    }
  };

  return {
    inputNode,
    outputNode,
    convolverNode,
    wetGain,
    dryGain,
    warmFilter,
    setReverb,
  };
}
