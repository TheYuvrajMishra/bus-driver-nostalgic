"use client";

import { useAudioStore } from "@/lib/audio-store";
import { YOUTUBE_PLAYLIST_TITLE } from "@/lib/radio-config";

/**
 * Example of a page-level component: it reads and dispatches the shared
 * audio store, but never owns playback itself (architecture.md §8).
 */
export default function NowPlaying() {
  const { track, radioTitle, engine, isPlaying, toggle } = useAudioStore();
  const title = radioTitle ?? track.title;
  const subtitle =
    engine === "youtube" ? `📻 ${YOUTUBE_PLAYLIST_TITLE} · YouTube` : track.artist;
  return (
    <div className="rounded-xl border border-amber-900/50 bg-[#1a0f0c] p-6">
      <p className="text-xs uppercase tracking-widest text-amber-400/70">Now playing</p>
      <p className="mt-2 text-2xl font-bold text-amber-100">{title}</p>
      <p className="text-sm text-amber-200/60">{subtitle}</p>
      <button
        onClick={toggle}
        className="mt-4 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-[#1a0f0c] transition hover:bg-amber-400"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <p className="mt-4 text-xs text-amber-200/40">
        Real 90s Bollywood radio, straight from YouTube. Navigate with the top
        links — the radio must keep playing without restarting.
      </p>
    </div>
  );
}
