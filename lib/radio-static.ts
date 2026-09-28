import { getSharedAudioContext } from "./audio-context";

/**
 * Radio Static Sound Synthesizer (Web Audio API)
 *
 * Synthesizes authentic analog radio tuning static bursts, frequency sweeps,
 * and crackles whenever tracks or stations are switched.
 * Zero external audio file dependencies.
 */

export function playRadioStatic(duration = 0.38, volume = 0.32): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // 1. Generate White Noise with slight analog crackle density
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      const pink = (lastOut * 0.85 + white * 0.15);
      lastOut = pink;

      const crackle = Math.random() > 0.985 ? (Math.random() * 2 - 1) * 1.8 : 0;
      data[i] = pink * 0.75 + crackle * 0.25;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // 2. Bandpass Filter simulating analog RF tuning sweep
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 3.5;
    const now = ctx.currentTime;

    // Frequency sweep from 650Hz -> 2600Hz -> 950Hz
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + duration * 0.45);
    filter.frequency.exponentialRampToValueAtTime(950, now + duration);

    // 3. Highpass Filter
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 320;

    // 4. Amplitude Envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.035);
    gainNode.gain.setValueAtTime(volume * 0.9, now + duration * 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Connect audio graph
    noiseSource.connect(filter);
    filter.connect(highpass);
    highpass.connect(gainNode);

    gainNode.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  } catch {
    // Fail silently if Web Audio is blocked or unavailable
  }
}
