"use client";

import { useState } from "react";
import { JUKEBOX_SONGS } from "@/lib/songs-catalog";
import { useAudioStore } from "@/lib/audio-store";

export default function SongsPage() {
  const [search, setSearch] = useState("");
  const { currentSongIndex, isPlaying, playSongIndex, playRandomSong } =
    useAudioStore();

  const filtered = JUKEBOX_SONGS.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.notes && s.notes.toLowerCase().includes(search.toLowerCase())) ||
    String(s.id).includes(search)
  );

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-amber-100">
            100 Gaane Bus-Driver Jukebox
          </h1>
          <p className="mt-1 text-sm text-amber-200/70">
            80s-90s ke woh gaane jo har bus, salon aur dhabe pe bajte the. Click any song to play instantly!
          </p>
        </div>
        <button
          onClick={playRandomSong}
          className="flex items-center gap-2 self-start rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-[#1a0f0c] shadow-lg transition hover:scale-105 hover:bg-amber-400 active:scale-95 cursor-pointer"
        >
          <span>🎲</span>
          <span>Play Random Song</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by song name or number (e.g. Chaiyya Chaiyya, 49, Tip Tip)..."
          className="w-full rounded-xl border border-amber-900/60 bg-[#1a0f0c]/80 px-4 py-3 text-sm text-amber-100 placeholder-amber-200/40 backdrop-blur-md focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-200/50 hover:text-amber-100"
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
              className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition cursor-pointer ${
                isCurrent
                  ? "border-amber-400 bg-amber-500/15 shadow-md"
                  : "border-amber-900/40 bg-[#1a0f0c]/60 hover:border-amber-700/60 hover:bg-[#1a0f0c]/90"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                    isCurrent
                      ? "bg-amber-500 text-[#1a0f0c]"
                      : "bg-amber-950/60 text-amber-200/60"
                  }`}
                >
                  {isCurrent && isPlaying ? "▶" : song.id}
                </span>

                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-semibold ${
                      isCurrent ? "text-amber-300" : "text-amber-100"
                    }`}
                  >
                    {song.title}
                  </p>
                  {song.notes && (
                    <p className="truncate text-[11px] text-amber-200/50">
                      {song.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isCurrent && (
                  <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-[#1a0f0c]">
                    {isPlaying ? "ON AIR" : "PAUSED"}
                  </span>
                )}
                <a
                  href={song.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open in YouTube"
                  className="rounded-lg p-1.5 text-amber-200/40 hover:bg-amber-500/10 hover:text-amber-300 transition text-xs"
                >
                  ↗
                </a>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-amber-200/50">
            Koi gaana nahi mila matching &quot;{search}&quot;
          </p>
        )}
      </div>
    </div>
  );
}
