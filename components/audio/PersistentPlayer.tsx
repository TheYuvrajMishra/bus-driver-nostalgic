"use client";

import { useEffect, useId } from "react";
import { useAudioStore } from "@/lib/audio-store";
import { YOUTUBE_PLAYLIST_TITLE } from "@/lib/radio-config";

/**
 * PersistentPlayer — mounted ONCE in the root layout (app/layout.tsx).
 *
 * This is the VISIBLE bottom radio bar (UI only). The actual playback engines
 * live in <RadioEngine/>: a hidden YouTube playlist player, with the old
 * local <audio> loop as fallback. Next.js App Router keeps the root layout
 * mounted across route changes, so playback survives navigation between /,
 * /playlists, /songs and /about.
 *
 * Page components must NEVER render their own <audio>; they read/dispatch
 * the zustand store instead (see lib/audio-store.ts).
 */
export default function PersistentPlayer() {
  // Stable per-mount id so we can prove (in tests) the bar is never
  // re-created during navigation.
  const mountId = useId();
  const {
    track,
    isPlaying,
    toggle,
    next,
    prev,
    engine,
    radioTitle,
  } = useAudioStore();

  const title = radioTitle ?? track.title;
  const subtitle =
    engine === "youtube"
      ? `📻 ${YOUTUBE_PLAYLIST_TITLE} · YouTube`
      : track.artist;

  // Space = play/pause (prd.md Phase 1). Skip when focus is on an interactive
  // element so we don't double-trigger the player's own button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.tagName === "BUTTON" || t.tagName === "A")) return;
      e.preventDefault();
      useAudioStore.getState().toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      data-mount-id={mountId}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-900/60 bg-[#1a0f0c]/95 backdrop-blur"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
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
        {engine === "youtube" && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={prev}
              aria-label="Previous song"
              title="Previous song"
              className="flex h-8 w-8 items-center justify-center rounded-full text-amber-200/70 transition hover:bg-amber-500/10 hover:text-amber-100"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                <path d="M6 5h2.5v14H6zM19 5.5v13a1 1 0 0 1-1.53.85L8.6 13.2a1 1 0 0 1 0-1.7l8.87-6.15A1 1 0 0 1 19 5.5Z" />
              </svg>
            </button>
            <button
              onClick={next}
              aria-label="Next song"
              title="Next song"
              className="flex h-8 w-8 items-center justify-center rounded-full text-amber-200/70 transition hover:bg-amber-500/10 hover:text-amber-100"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                <path d="M15.5 5H18v14h-2.5zM5 5.5v13a1 1 0 0 0 1.53.85l8.87-6.15a1 1 0 0 0 0-1.7L6.53 4.65A1 1 0 0 0 5 5.5Z" />
              </svg>
            </button>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-amber-100">{title}</p>
          <p className="truncate text-xs text-amber-200/60">{subtitle}</p>
        </div>
        <p className="hidden shrink-0 text-[11px] text-amber-200/50 sm:block">
          Space = play/pause
        </p>
      </div>
    </div>
  );
}
