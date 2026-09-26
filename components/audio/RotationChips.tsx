"use client";

import { useEffect } from "react";
import { ROTATIONS, getCurrentRotation } from "@/lib/rotations";
import { useAudioStore } from "@/lib/audio-store";

/**
 * The four IST rotation chips. They drive the radio track AND the scene's
 * lighting mood (rotations.ts). Auto-switch with the clock unless the user
 * picks one manually.
 */
export default function RotationChips() {
  const rotationId = useAudioStore((s) => s.rotationId);
  const autoFollow = useAudioStore((s) => s.autoFollow);
  const setRotation = useAudioStore((s) => s.setRotation);
  const enableAutoFollow = useAudioStore((s) => s.enableAutoFollow);

  useEffect(() => {
    const tick = () => {
      if (!useAudioStore.getState().autoFollow) return;
      const current = getCurrentRotation();
      if (current.id !== useAudioStore.getState().rotationId) {
        useAudioStore.getState().setRotation(current.id, true);
      }
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ROTATIONS.map((r) => {
        const active = r.id === rotationId;
        return (
          <button
            key={r.id}
            onClick={() => setRotation(r.id)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              active
                ? "border-amber-400 bg-amber-500/20 text-amber-200"
                : "border-amber-900/60 text-amber-100/50 hover:border-amber-700 hover:text-amber-100"
            }`}
          >
            <span className="mr-1.5">{r.hindi}</span>
            {r.name}
            {active && autoFollow && (
              <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-[#1a0f0c]">
                LIVE
              </span>
            )}
          </button>
        );
      })}
      {!autoFollow && (
        <button
          onClick={enableAutoFollow}
          className="rounded-full border border-dashed border-amber-700 px-3 py-1.5 text-xs text-amber-200/60 hover:text-amber-100"
        >
          ↺ back to clock
        </button>
      )}
      <span className="ml-1 text-[11px] text-amber-200/40">
        IST rotations · drive mood follows the music
      </span>
    </div>
  );
}
