"use client";

import { useAudioStore } from "@/lib/audio-store";

/**
 * Example of a page-level component: it reads and dispatches the shared
 * audio store, but never owns the <audio> element itself (architecture.md §8).
 */
export default function NowPlaying() {
  const { track, isPlaying, toggle } = useAudioStore();
  return (
    <div className="rounded-xl border border-amber-900/50 bg-[#1a0f0c] p-6">
      <p className="text-xs uppercase tracking-widest text-amber-400/70">Now playing</p>
      <p className="mt-2 text-2xl font-bold text-amber-100">{track.title}</p>
      <p className="text-sm text-amber-200/60">{track.artist}</p>
      <button
        onClick={toggle}
        className="mt-4 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-[#1a0f0c] transition hover:bg-amber-400"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <p className="mt-4 text-xs text-amber-200/40">
        Step 1: the 3D driving scene arrives in step 2. Navigate with the top
        links — the radio must keep playing without restarting.
      </p>
    </div>
  );
}
