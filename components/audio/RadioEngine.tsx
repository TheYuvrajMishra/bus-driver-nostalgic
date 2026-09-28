"use client";

import { useEffect, useRef } from "react";
import { useAudioStore } from "@/lib/audio-store";

/**
 * RadioEngine — mounted ONCE in RootLayout (app/layout.tsx).
 *
 * Handles Web Audio unlock and local fallback HTML5 audio.
 */
export default function RadioEngine() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { track, isPlaying, volume, isMuted, audioSource, pause } =
    useAudioStore();

  // Unlock browser audio context on first user interaction
  useEffect(() => {
    const unlock = () => {
      try {
        const AudioCtx =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === "suspended") {
            ctx.resume();
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
