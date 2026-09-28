"use client";

import { useEffect, useRef } from "react";
import { useAudioStore } from "@/lib/audio-store";
import { ambientAudio } from "@/lib/ambient-audio";
import { initLightningScheduler } from "@/lib/lightning-system";
import { getSharedAudioContext } from "@/lib/audio-context";

/**
 * RadioEngine — mounted ONCE in RootLayout (app/layout.tsx).
 *
 * Handles:
 * 1. Web Audio unlock & persistent audio subsystem.
 * 2. Looping rain ambient audio manager with smooth fade-in/fade-out.
 * 3. Atmospheric lightning & delayed thunder strike scheduler.
 */
export default function RadioEngine() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const {
    track,
    isPlaying,
    volume,
    isMuted,
    audioSource,
    pause,
  } = useAudioStore();

  // Initialize ambient rain and lightning scheduler on mount
  useEffect(() => {
    ambientAudio.init();
    initLightningScheduler();

    return () => {
      ambientAudio.cleanup();
    };
  }, []);

  // Unlock browser audio context & connect local audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = getSharedAudioContext();
        if (ctx) {
          if (ctx.state === "suspended") {
            ctx.resume();
          }

          // Connect local audio element directly to output on first unlock
          if (audioRef.current && !sourceNodeRef.current) {
            try {
              const source = ctx.createMediaElementSource(audioRef.current);
              sourceNodeRef.current = source;
              source.connect(ctx.destination);
            } catch {
              // ignore
            }
          }
        }
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Sync volume & mute for local audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Handle local track playback
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (audioSource === "local") {
      const current = el.getAttribute("src");
      if (current !== track.src) {
        el.src = track.src;
        el.load();
      }
      if (isPlaying) {
        el.play().catch(() => pause());
      } else {
        el.pause();
      }
    } else {
      el.pause();
    }
  }, [audioSource, isPlaying, track, pause]);

  return (
    <audio
      ref={audioRef}
      src={track.src}
      loop
      preload="auto"
      aria-hidden
      style={{ display: "none" }}
    />
  );
}
