"use client";

import { useWeatherStore } from "./weather-store";
import { useAudioStore } from "./audio-store";

/**
 * Ambient Audio Engine — Manages continuous looping rain audio with smooth fades.
 * Asset: /audio/rain-ambient.mp3 (Raining on multiple surfaces mix)
 */
class AmbientAudioManager {
  private rainAudio: HTMLAudioElement | null = null;
  private currentRainVolume = 0;
  private targetRainVolume = 0;
  private fadeInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  public init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    this.rainAudio = new Audio("/audio/rain-ambient.mp3");
    this.rainAudio.loop = true;
    this.rainAudio.preload = "auto";
    this.rainAudio.volume = 0;

    // Start fade interpolation loop
    this.fadeInterval = setInterval(() => {
      this.updateFade();
    }, 50);

    // Subscribe to weather and audio store changes
    useWeatherStore.subscribe(() => {
      this.recalculateTarget();
    });

    useAudioStore.subscribe(() => {
      this.recalculateTarget();
    });

    // Listen for user interaction to unlock audio
    const unlock = () => {
      if (this.rainAudio && this.rainAudio.paused && useWeatherStore.getState().isRaining) {
        this.rainAudio.play().catch(() => {});
      }
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    this.recalculateTarget();
  }

  private recalculateTarget() {
    const isRaining = useWeatherStore.getState().isRaining;
    const { isMuted, volume } = useAudioStore.getState();

    if (!isRaining || isMuted) {
      this.targetRainVolume = 0;
    } else {
      // Gentle, low-volume cozy rain sound level (0.24 max scaled by master volume)
      this.targetRainVolume = Math.min(0.24, Math.max(0.04, 0.22 * volume));
    }

    if (isRaining && this.rainAudio && this.rainAudio.paused) {
      this.rainAudio.play().catch(() => {});
    }
  }

  private updateFade() {
    if (!this.rainAudio) return;

    const step = 0.02; // Smooth fade step
    if (Math.abs(this.currentRainVolume - this.targetRainVolume) < step) {
      this.currentRainVolume = this.targetRainVolume;
    } else if (this.currentRainVolume < this.targetRainVolume) {
      this.currentRainVolume += step;
    } else {
      this.currentRainVolume -= step;
    }

    this.rainAudio.volume = Math.max(0, Math.min(1, this.currentRainVolume));

    if (this.currentRainVolume <= 0.001 && !useWeatherStore.getState().isRaining) {
      if (!this.rainAudio.paused) {
        this.rainAudio.pause();
      }
    }
  }

  public cleanup() {
    if (this.fadeInterval) clearInterval(this.fadeInterval);
    if (this.rainAudio) {
      this.rainAudio.pause();
      this.rainAudio = null;
    }
    this.initialized = false;
  }
}

export const ambientAudio = new AmbientAudioManager();
