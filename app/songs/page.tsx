"use client";

import { useState } from "react";
import { JUKEBOX_SONGS } from "@/lib/songs-catalog";
import { useAudioStore } from "@/lib/audio-store";
import SiteNav from "@/components/SiteNav";

export default function SongsPage() {
  const [search, setSearch] = useState("");
  const { currentSongIndex, isPlaying, playSongIndex, playRandomSong } =
    useAudioStore();

  const filtered = JUKEBOX_SONGS.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(search.toLowerCase())) ||
      String(s.id).includes(search)
  );

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden">
      <SiteNav />

      <main className="mx-auto max-w-4xl px-4 py-8 pb-36 space-y-6">
        {/* Header Hero Card with Light-Bending Glassmorphism */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="glass-reflection pointer-events-none absolute inset-0 opacity-25" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-mono font-semibold text-amber-300 uppercase tracking-widest mb-2">
                <span>📻</span> 100 Classics Catalog
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-amber-100">
                100 Gaane Bus-Driver Jukebox
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-amber-200/70 max-w-xl">
                80s-90s ke woh iconic gaane jo har highway bus, salon aur dhabe pe bajte the. Click any track to tune in with radio static!
              </p>
            </div>

            <button
              onClick={playRandomSong}
              className="flex items-center gap-2 self-start sm:self-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 px-5 py-2.5 text-sm font-bold text-neutral-950 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:scale-105 hover:shadow-amber-500/40 active:scale-95 cursor-pointer ring-1 ring-white/30 shrink-0"
            >
              <span className="text-base">🎲</span>
              <span>Play Random Song</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 100 songs by name, movie or number (e.g. Chaiyya Chaiyya, 49, Tip Tip)..."
            className="w-full rounded-2xl glass-panel px-4 py-3.5 pl-11 text-sm text-amber-100 placeholder-amber-200/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50 shadow-xl"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-300/60 text-sm">
            🔍
          </span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-amber-200/50 hover:text-amber-100 bg-white/10 rounded-full px-2 py-0.5"
            >
              Clear
            </button>
          )}
        </div>

        {/* Song List */}
        <div className="space-y-2">
          {filtered.map((song) => {
            const isCurrent = song.id - 1 === currentSongIndex;
            return (
              <div
                key={song.id}
                onClick={() => playSongIndex(song.id - 1)}
                className={`group relative flex items-center justify-between gap-3 rounded-2xl p-3.5 transition-all duration-300 cursor-pointer ${
                  isCurrent
                    ? "glass-pill border-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/10 scale-[1.01]"
                    : "glass-panel hover:border-amber-500/40 hover:bg-white/[0.04] active:scale-[0.99]"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Song ID Pill / Indicator */}
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-gradient-to-tr from-amber-500 to-orange-400 text-neutral-950 shadow-md shadow-amber-500/30"
                        : "bg-white/5 border border-white/10 text-amber-200/70 group-hover:text-amber-100 group-hover:border-amber-500/30"
                    }`}
                  >
                    {isCurrent && isPlaying ? "▶" : `#${song.id}`}
                  </span>

                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-semibold tracking-tight ${
                        isCurrent ? "text-amber-300 font-bold" : "text-amber-100"
                      }`}
                    >
                      {song.title}
                    </p>
                    <p className="truncate text-[11px] text-amber-200/50 mt-0.5">
                      ⏱ Starts after 60s {song.notes ? `· ${song.notes}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isCurrent && (
                    <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 px-2.5 py-0.5 text-[10px] font-bold text-neutral-950 shadow-sm">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-950 animate-ping" />
                      {isPlaying ? "ON AIR" : "PAUSED"}
                    </span>
                  )}
                  <a
                    href={song.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Open in YouTube"
                    className="rounded-full p-2 text-amber-200/40 hover:bg-white/10 hover:text-amber-300 transition text-xs"
                  >
                    ↗
                  </a>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="glass-panel rounded-2xl py-12 text-center text-sm text-amber-200/50">
              Koi gaana nahi mila matching &quot;{search}&quot;
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
