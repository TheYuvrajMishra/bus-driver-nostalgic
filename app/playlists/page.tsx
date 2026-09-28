"use client";

import Link from "next/link";
import { ROTATIONS } from "@/lib/rotations";
import { useAudioStore } from "@/lib/audio-store";

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
    <div className="space-y-6 max-w-4xl pb-16">
      <h1 className="text-3xl font-bold text-amber-100">Playlists & Stations</h1>

      {/* 100 Gaane Jukebox Card */}
      <div className="rounded-xl border border-amber-400/60 bg-amber-500/10 p-5 shadow-lg">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold text-amber-100">
            📻 100 Gaane Bus-Driver Jukebox (80s-90s Classics)
          </h2>
          <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-[#1a0f0c]">
            {isPlaying ? "ON AIR" : "READY"}
          </span>
        </div>
        <p className="mt-1 text-sm text-amber-200/80">
          Abhi baj raha hai:{" "}
          <strong className="text-amber-300">
            #{currentSong?.id} {currentSong?.title}
          </strong>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={playRandomSong}
            className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-1.5 text-sm font-bold text-[#1a0f0c] shadow transition hover:bg-amber-400 cursor-pointer"
          >
            <span>🎲</span>
            <span>Play Random Track</span>
          </button>
          <Link
            href="/songs"
            className="inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
          >
            View All 100 Songs →
          </Link>
        </div>
      </div>

      <p className="max-w-2xl text-amber-200/70">
        Four IST stations, radio-station style. Tuning in switches the
        drive&apos;s lighting mood — the radio below keeps running while you browse.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {ROTATIONS.map((r) => {
          const active = r.id === rotationId;
          return (
            <div
              key={r.id}
              className={`rounded-xl border p-5 transition ${
                active
                  ? "border-amber-400 bg-amber-500/10"
                  : "border-amber-900/50 bg-[#1a0f0c]/60"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-semibold text-amber-100">
                  {r.hindi} <span className="text-amber-400">{r.name}</span>
                </h2>
                {active && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-[#1a0f0c]">
                    TUNED IN
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-amber-200/60">
                {fmtHour(r.start)} – {fmtHour(r.end)} IST
              </p>
              <button
                onClick={() => setRotation(r.id)}
                disabled={active}
                className={`mt-4 rounded-full px-4 py-1.5 text-sm transition cursor-pointer ${
                  active
                    ? "cursor-default bg-amber-500/20 text-amber-200/50"
                    : "bg-amber-500 text-[#1a0f0c] hover:bg-amber-400"
                }`}
              >
                {active ? "Tuned in" : "Tune in"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
