"use client";

import { useEffect, useId, useRef } from "react";
import { useAudioStore } from "@/lib/audio-store";

/**
 * PersistentPlayer — mounted ONCE in the root layout (app/layout.tsx).
 *
 * The <audio> element here is the single shared player for the whole app.
 * Next.js App Router keeps the root layout mounted across route changes, so
 * this element — and whatever is playing through it — survives navigation
 * between /, /playlists, /songs and /about.
 *
 * Page components must NEVER render their own <audio>; they read/dispatch
 * the zustand store instead (see lib/audio-store.ts).
 */
export default function PersistentPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Stable per-mount id so we can prove (in tests) the element is never
  // re-created during navigation.
  const mountId = useId();
  const { track, isPlaying, toggle, pause } = useAudioStore();

  // Drive the element from store state (play/pause requests).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      // play() returns a promise that rejects when the browser blocks
      // non-gesture playback (autoplay policy) — reflect that back to state.
      el.play().catch(() => pause());
    } else {
      el.pause();
    }
  }, [isPlaying, pause]);

  // Reflect the element's real state back into the store (e.g. track ended,
  // or playback was paused by the OS/media keys).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => pause();
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [pause]);

  // Space = play/pause (prd.md Phase 1). Skip when focus is on an interactive
  // element so we don't double-trigger the player's own button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.tagName === "BUTTON" || t.tagName === "A")) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-900/60 bg-[#1a0f0c]/95 backdrop-blur">
      <audio
        ref={audioRef}
        src={track.src}
        loop
        preload="auto"
        data-mount-id={mountId}
        aria-hidden
      />
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
        <button
          onClick={toggle}
          aria-label={isPlaying ? "Pause radio" : "Play radio"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[#1a0f0c] transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
              <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-amber-100">{track.title}</p>
          <p className="truncate text-xs text-amber-200/60">{track.artist}</p>
        </div>
        <p className="hidden shrink-0 text-[11px] text-amber-200/50 sm:block">
          Space = play/pause
        </p>
      </div>
    </div>
  );
}
