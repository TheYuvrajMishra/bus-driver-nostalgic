"use client";

import Link from "next/link";
import { ROTATIONS } from "@/lib/rotations";
import { useAudioStore } from "@/lib/audio-store";
import SiteNav from "@/components/SiteNav";

const fmtHour = (h: number) => {
  const hh = h % 24;
  const ampm = hh < 12 ? "AM" : "PM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12} ${ampm}`;
};

export default function PlaylistsPage() {
  const rotationId = useAudioStore((s) => s.rotationId);
  const setRotation = useAudioStore((s) => s.setRotation);
  const currentSong = useAudioStore((s) => s.currentSong);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const playRandomSong = useAudioStore((s) => s.playRandomSong);

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden">
      <SiteNav />

      <main className="mx-auto max-w-4xl px-4 py-8 pb-36 space-y-6">
        {/* Header Hero Card with Light-Bending Glassmorphism */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="glass-reflection pointer-events-none absolute inset-0 opacity-25" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-mono font-semibold text-amber-300 uppercase tracking-widest mb-2">
                <span>📼</span> Highway Radio Stations
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-amber-100">
                Playlists & Stations
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-amber-200/70 max-w-xl">
                Tuning into a station changes the 3D drive ambiance & scene lighting in real time. Continuous radio plays uninterrupted.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                onClick={playRandomSong}
                className="flex items-center gap-2 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 px-4 py-2 text-xs sm:text-sm font-bold text-neutral-950 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/30"
              >
                <span>🎲</span>
                <span>Random Track</span>
              </button>
              <Link
                href="/songs"
                className="glass-pill rounded-full px-4 py-2 text-xs sm:text-sm font-semibold text-amber-100 transition-all duration-300 hover:scale-105 hover:text-white active:scale-95 flex items-center gap-1.5"
              >
                <span>100 Songs →</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 100 Gaane Jukebox Active Status Card */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border-amber-500/30">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-amber-100 flex items-center gap-2">
              <span>📻</span> 100 Gaane Bus-Driver Jukebox (80s-90s Classics)
            </h2>
            <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 px-3 py-0.5 text-[10px] font-bold text-neutral-950 shadow-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-950 animate-ping" />
              {isPlaying ? "ON AIR" : "READY"}
            </span>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-amber-200/80">
            Current Broadcast:{" "}
            <strong className="text-amber-300 font-semibold">
              #{currentSong?.id} {currentSong?.title}
            </strong>
          </p>
        </div>

        {/* 4 Time-of-day Stations Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {ROTATIONS.map((r) => {
            const active = r.id === rotationId;
            return (
              <div
                key={r.id}
                className={`group glass-panel rounded-2xl p-5 transition-all duration-300 ${
                  active
                    ? "border-amber-400 bg-amber-500/15 shadow-xl shadow-amber-500/10 scale-[1.01]"
                    : "hover:border-amber-500/40 hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-bold text-amber-100">
                    {r.hindi} <span className="text-amber-400">{r.name}</span>
                  </h2>
                  {active && (
                    <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-mono font-bold text-neutral-950 shadow-sm">
                      TUNED IN
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-amber-200/60 font-mono">
                  ⏰ {fmtHour(r.start)} – {fmtHour(r.end)} IST
                </p>
                <button
                  onClick={() => setRotation(r.id)}
                  disabled={active}
                  className={`mt-4 rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 cursor-pointer ${
                    active
                      ? "cursor-default bg-white/10 text-amber-200/50"
                      : "bg-gradient-to-tr from-amber-500 to-orange-400 text-neutral-950 hover:scale-105 active:scale-95 shadow-md shadow-amber-500/20 ring-1 ring-white/20"
                  }`}
                >
                  {active ? "Currently Tuned" : "Tune In with Static 📻"}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
