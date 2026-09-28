"use client";

import { useAudioStore } from "@/lib/audio-store";

/**
 * NowPlaying — Minimalist Glassmorphic Now Playing Card.
 */
export default function NowPlaying() {
  const { currentSong, isPlaying, toggle } = useAudioStore();
  const title = currentSong?.title ?? "Bollywood 90s Hits";
  const subtitle = `📻 Gaana #${currentSong?.id ?? 1}/100 · 80s-90s Classics`;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div className="glass-reflection pointer-events-none absolute inset-0 opacity-25" />
      <div className="relative z-10 space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-mono font-semibold text-amber-300 uppercase tracking-widest">
          <span>📻</span> Now Broadcasting
        </div>
        <p className="text-xl sm:text-2xl font-extrabold text-amber-100 tracking-tight">
          {title}
        </p>
        <p className="text-xs sm:text-sm text-amber-200/60 font-mono">{subtitle}</p>
        <button
          onClick={toggle}
          className="mt-2 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 px-5 py-2 text-xs sm:text-sm font-bold text-neutral-950 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/30"
        >
          {isPlaying ? "Pause Radio" : "Play Radio"}
        </button>
      </div>
    </div>
  );
}
