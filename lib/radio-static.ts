/**
 * Radio Static Sound Synthesizer (Web Audio API)
 *
 * Synthesizes authentic analog radio tuning static bursts, frequency sweeps,
 * and crackles whenever tracks or stations are switched.
 * Zero external audio file dependencies.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a realistic analog radio tuning static burst during song transitions.
 * @param duration Duration of the static burst in seconds (default: 0.4s)
 * @param volume Master volume multiplier (0.0 to 1.0, default: 0.35)
 */
export function playRadioStatic(duration = 0.38, volume = 0.32): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // 1. Generate White Noise with slight analog crackle density
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      // White noise base
      const white = Math.random() * 2 - 1;
      // Pink-ish noise filter blend
      const pink = (lastOut * 0.85 + white * 0.15);
      lastOut = pink;

      // Occasional analog vinyl/switch pop / crackle
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

    // Frequency sweep from 600Hz -> 2800Hz -> 1100Hz (simulates dial tuning)
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + duration * 0.45);
    filter.frequency.exponentialRampToValueAtTime(950, now + duration);

    // 3. Highpass Filter to cut extreme low rumbles
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 320;

    // 4. Amplitude Envelope (Quick attack, noisy burst, smooth decay)
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
