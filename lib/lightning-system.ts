"use client";

import { create } from "zustand";
import { useWeatherStore } from "./weather-store";
import { useAudioStore } from "./audio-store";

interface LightningState {
  lightningFlash: number; // 0.0 to 1.0
  isLightningActive: boolean;
  triggerLightning: () => void;
  setLightningFlash: (val: number) => void;
}

export const useLightningStore = create<LightningState>((set, get) => ({
  lightningFlash: 0,
  isLightningActive: false,
  setLightningFlash: (lightningFlash) => set({ lightningFlash }),
  triggerLightning: () => {
    executeLightningSequence();
  },
}));

let lightningTimer: NodeJS.Timeout | null = null;
let animationFrameId: number | null = null;
let thunderAudio: HTMLAudioElement | null = null;

/**
 * Executes a realistic multi-flicker lightning flash and delayed thunder strike.
 */
function executeLightningSequence() {
  const store = useLightningStore.getState();
  if (store.isLightningActive) return;

  useLightningStore.setState({ isLightningActive: true });

  const startTime = performance.now();
  // Multi-flicker keyframes [timeOffsetMs, intensity]
  const keyframes: [number, number][] = [
    [0, 1.0],
    [45, 0.3],
    [90, 0.95],
    [160, 0.4],
    [240, 0.7],
    [360, 0.15],
    [480, 0.0],
  ];

  const animate = (now: number) => {
    const elapsed = now - startTime;
    if (elapsed >= 480) {
      useLightningStore.setState({ lightningFlash: 0 });
      return;
    }

    // Find interpolation segment
    let intensity = 0;
    for (let i = 0; i < keyframes.length - 1; i++) {
      const [t0, v0] = keyframes[i];
      const [t1, v1] = keyframes[i + 1];
      if (elapsed >= t0 && elapsed <= t1) {
        const factor = (elapsed - t0) / (t1 - t0);
        intensity = v0 + (v1 - v0) * factor;
        break;
      }
    }

    useLightningStore.setState({ lightningFlash: intensity });
    animationFrameId = requestAnimationFrame(animate);
  };

  animationFrameId = requestAnimationFrame(animate);

  // Realistic randomized acoustic delay for thunder strike (600ms - 1600ms)
  const acousticDelayMs = 600 + Math.random() * 1000;
  setTimeout(() => {
    playThunderSound();
    useLightningStore.setState({ isLightningActive: false });
  }, acousticDelayMs);
}

function playThunderSound() {
  if (typeof window === "undefined") return;

  const { isMuted, volume } = useAudioStore.getState();
  if (isMuted || volume <= 0.01) return;

  try {
    if (!thunderAudio) {
      thunderAudio = new Audio("/audio/thunder-strike.mp3");
      thunderAudio.preload = "auto";
    }

    // Clone audio to allow rapid overlapping rumbles
    const sound = thunderAudio.cloneNode(true) as HTMLAudioElement;
    sound.volume = Math.min(0.65, Math.max(0.1, 0.5 * volume));
    sound.play().catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Initializes automatic background lightning scheduler during rain.
 */
export function initLightningScheduler() {
  if (typeof window === "undefined") return;

  const scheduleNext = () => {
    if (lightningTimer) clearTimeout(lightningTimer);

    const isRaining = useWeatherStore.getState().isRaining;
    if (!isRaining) return;

    // Random interval between 12s and 25s for cozy monsoon vibes
    const nextIntervalMs = 12000 + Math.random() * 13000;
    lightningTimer = setTimeout(() => {
      if (useWeatherStore.getState().isRaining) {
        executeLightningSequence();
      }
      scheduleNext();
    }, nextIntervalMs);
  };

  useWeatherStore.subscribe((state, prevState) => {
    if (state.isRaining && !prevState.isRaining) {
      // First strike 3-5 seconds after rain begins
      if (lightningTimer) clearTimeout(lightningTimer);
      lightningTimer = setTimeout(() => {
        executeLightningSequence();
        scheduleNext();
      }, 3500);
    } else if (!state.isRaining && prevState.isRaining) {
      if (lightningTimer) clearTimeout(lightningTimer);
    }
  });

  if (useWeatherStore.getState().isRaining) {
    scheduleNext();
  }
}
