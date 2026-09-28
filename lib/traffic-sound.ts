import { cabinReverb } from "./reverb-processor";
import { useAudioStore } from "./audio-store";

/**
 * Traffic Audio & Spatial Horn Synthesizer (Web Audio API)
 *
 * Implements:
 * 1. Authentic Indian Highway Truck Horns loaded from /audio/horn-*.mp3
 * 2. Spatial Stereo Panning based on vehicle lateral position relative to player
 * 3. Distance Attenuation & Distance High-Frequency Air Damping (loud up close, low/muffled far away)
 * 4. Max 4 Simultaneous SFX Voices (voice-limiting)
 * 5. Smooth Music Ducking during nearby horn blasts
 * 6. Soft Bump Collision Sound
 */

export type HornType = "truck" | "musical" | "rickshaw" | "car" | "bump";

const TRUCK_HORN_FILES = [
  "/audio/horn-air.mp3",
  "/audio/horn-rajasthani.mp3",
  "/audio/horn-truck-1.mp3",
  "/audio/horn-truck-2.mp3",
  "/audio/horn-truck-3.mp3",
  "/audio/horn-truck-4.mp3",
  "/audio/horn-truck-5.mp3",
];

const audioBufferCache = new Map<string, AudioBuffer>();
let isPreloading = false;

/** Preloads and decodes all truck horn MP3s into Web Audio memory */
export async function preloadTrafficAudio(): Promise<void> {
  if (typeof window === "undefined" || isPreloading) return;
  isPreloading = true;

  try {
    const ctx = cabinReverb.getAudioContext();
    if (!ctx) return;

    for (const url of TRUCK_HORN_FILES) {
      if (audioBufferCache.has(url)) continue;
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const arrayBuf = await resp.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        audioBufferCache.set(url, audioBuf);
      } catch {
        // ignore individual load errors
      }
    }
  } catch {
    // ignore
  } finally {
    isPreloading = false;
  }
}

interface ActiveVoice {
  stop: () => void;
  startTime: number;
}

const activeVoices: ActiveVoice[] = [];
const MAX_VOICES = 4;

function acquireVoiceSlot(): void {
  if (activeVoices.length >= MAX_VOICES) {
    const oldest = activeVoices.shift();
    if (oldest) {
      try {
        oldest.stop();
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Plays a spatialized traffic horn or collision sound
 *
 * @param type Horn or SFX type
 * @param lateralDelta relative X distance (- left oncoming lane, + right lane/shoulder)
 * @param distanceZ longitudinal distance in meters (0 to 300)
 * @param relativeSpeed relative velocity for Doppler pitch shift
 */
export function playTrafficSound(
  type: HornType,
  lateralDelta = 0,
  distanceZ = 15,
  relativeSpeed = 0
): void {
  try {
    const ctx = cabinReverb.getAudioContext();
    if (!ctx) return;

    // Trigger preloading in background if not loaded yet
    if (audioBufferCache.size === 0 && !isPreloading) {
      preloadTrafficAudio();
    }

    acquireVoiceSlot();

    const now = ctx.currentTime;
    const masterIn = cabinReverb.getMasterInput() || ctx.destination;

    // 1. Distance Attenuation (Inverse-power curve: loud up close, smooth low falloff far away)
    const dist3D = Math.sqrt(distanceZ * distanceZ + lateralDelta * lateralDelta);
    const clampedDist = Math.max(1.5, dist3D);

    // Natural highway distance rolloff
    const volumeGain = Math.min(1.0, 1.0 / (1.0 + Math.pow(clampedDist / 22.0, 1.45)));

    // 2. Spatial Stereo Panning (-1.0 full left to +1.0 full right)
    const panX = Math.max(-0.95, Math.min(0.95, lateralDelta / 3.2));
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) panner.pan.setValueAtTime(panX, now);

    // 3. Distance Low-Pass Air Damping (high frequencies drop off with distance)
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = "lowpass";
    const cutoffHz = Math.max(750, 16000 - clampedDist * 95);
    airFilter.frequency.setValueAtTime(cutoffHz, now);

    // 4. Master Volume Gain
    const gainNode = ctx.createGain();
    const masterVolume = volumeGain * 0.85;
    gainNode.gain.setValueAtTime(masterVolume, now);

    // Connect node chain: [Source] -> [airFilter] -> [gainNode] -> [panner] -> [masterIn]
    airFilter.connect(gainNode);
    if (panner) {
      gainNode.connect(panner);
      panner.connect(masterIn);
    } else {
      gainNode.connect(masterIn);
    }

    // 5. Duck radio music volume if horn is nearby (< 50m)
    if (clampedDist < 50) {
      useAudioStore.getState().duckVolume?.(0.72, 750);
    }

    // 6. Doppler Pitch Shift Factor
    const doppler = Math.max(0.88, Math.min(1.12, 1.0 + relativeSpeed / 340));

    let duration = 0.6;
    let sourceNode: AudioNode | null = null;
    let stopFn: () => void = () => {};

    // Check if we have authentic MP3 samples for trucks / buses / horns
    const isHorn = type === "truck" || type === "musical" || type === "car" || type === "rickshaw";
    const availableBuffers = Array.from(audioBufferCache.values());

    if (isHorn && availableBuffers.length > 0) {
      // Pick random authentic Indian truck horn from public/audio
      let chosenBuffer: AudioBuffer;
      if (type === "musical") {
        chosenBuffer =
          audioBufferCache.get("/audio/horn-rajasthani.mp3") ||
          availableBuffers[Math.floor(Math.random() * availableBuffers.length)];
      } else {
        const randIdx = Math.floor(Math.random() * availableBuffers.length);
        chosenBuffer = availableBuffers[randIdx];
      }

      const bufSource = ctx.createBufferSource();
      bufSource.buffer = chosenBuffer;
      bufSource.playbackRate.setValueAtTime(doppler, now);
      bufSource.connect(airFilter);

      duration = chosenBuffer.duration / doppler;
      bufSource.start(now);
      bufSource.stop(now + duration);

      sourceNode = bufSource;
      stopFn = () => {
        try {
          bufSource.stop();
        } catch {}
      };
    } else if (type === "bump") {
      // Soft Metallic & Rubber Thud for Collision
      duration = 0.42;
      gainNode.gain.setValueAtTime(masterVolume * 1.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + duration);

      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.22), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.35;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.setValueAtTime(420, now);

      osc.connect(airFilter);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(airFilter);

      osc.start(now);
      osc.stop(now + duration);
      noiseSource.start(now);
      noiseSource.stop(now + 0.22);

      sourceNode = osc;
      stopFn = () => {
        try {
          osc.stop();
          noiseSource.stop();
        } catch {}
      };
    } else {
      // Fallback synthesizer if buffers are still loading
      duration = 0.55;
      gainNode.gain.setValueAtTime(masterVolume * 0.7, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = "sawtooth";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(262 * doppler, now);
      osc2.frequency.setValueAtTime(330 * doppler, now);

      osc1.connect(airFilter);
      osc2.connect(airFilter);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);

      sourceNode = osc1;
      stopFn = () => {
        try {
          osc1.stop();
          osc2.stop();
        } catch {}
      };
    }

    const voiceEntry: ActiveVoice = {
      startTime: now,
      stop: stopFn,
    };
    activeVoices.push(voiceEntry);
    setTimeout(() => {
      const idx = activeVoices.indexOf(voiceEntry);
      if (idx !== -1) activeVoices.splice(idx, 1);
    }, duration * 1000 + 100);
  } catch {
    // Fail silently if Web Audio is locked
  }
}
