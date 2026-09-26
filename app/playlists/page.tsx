"use client";

import { ROTATIONS } from "@/lib/rotations";
import { useAudioStore } from "@/lib/audio-store";

const fmtHour = (h: number) => {
  const hh = h % 24;
  const ampm = hh < 12 ? "AM" : "PM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12} ${ampm}`;
};

/**
 * The four IST rotations as "playlists". Tuning into one switches the radio
 * AND the drive's lighting mood (rotations.ts). The player keeps running
 * while you browse — architecture.md §8.
 */
export default function PlaylistsPage() {
  const rotationId = useAudioStore((s) => s.rotationId);
  const setRotation = useAudioStore((s) => s.setRotation);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-amber-100">Playlists</h1>
      <p className="max-w-2xl text-amber-200/70">
        Four IST rotations, radio-station style. Tuning in switches the track
        and the drive&apos;s day/night mood — the player below keeps running
        while you browse.
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
                    ON AIR
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-amber-200/60">
                {fmtHour(r.start)} – {fmtHour(r.end)} IST
              </p>
              <p className="mt-2 text-sm text-amber-200/50">
                🎵 {r.track.title} — {r.track.artist}
              </p>
              <button
                onClick={() => setRotation(r.id)}
                disabled={active}
                className={`mt-4 rounded-full px-4 py-1.5 text-sm transition ${
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
