"use client";

import { useEffect, useState } from "react";
import {
  playRandomHorn,
  preloadHornSounds,
  onHornPlayed,
  type HornSound,
} from "@/lib/horn-sounds";

/** Exported helper for steering boss or key listeners */
export function honk() {
  return playRandomHorn();
}

/**
 * HornButton & Live Musical Horn Toast Indicator.
 *
 * Randomly plays iconic Indian bus horns on press (Naagin, Tip Tip Barsa,
 * Dhoom Machale, Tata Ashok Leyland Air Horn, Sholay, Pardesi, etc.).
 *
 * Activated via: Button Click, `H` Key, or Steering Wheel Center Boss.
 */
export default function HornButton() {
  const [activeHorn, setActiveHorn] = useState<HornSound | null>(null);

  useEffect(() => {
    preloadHornSounds();

    const unsubscribe = onHornPlayed((horn) => {
      setActiveHorn(horn);
      const timer = setTimeout(() => {
        setActiveHorn((curr) => (curr?.id === horn.id ? null : curr));
      }, 2200);
      return () => clearTimeout(timer);
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyH") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT")
      )
        return;
      e.preventDefault();
      honk();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      {/* Visual Horn Name Notification Toast */}
      {activeHorn && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border-2 border-amber-400/80 bg-[#1e0f0a]/95 px-4 py-2 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-90 duration-200">
          <span className="text-xl animate-bounce">📯</span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
              {activeHorn.hindiName}
            </span>
            <span className="text-[10px] text-amber-400 font-mono">
              {activeHorn.name}
            </span>
          </div>
        </div>
      )}

      {/* Floating Retro Horn Button */}
      <button
        onClick={honk}
        aria-label="Honk the musical horn"
        title="Press Horn (H) · Plays Random Indian Truck Horn"
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-600/80 bg-[#24120a]/90 text-2xl shadow-2xl backdrop-blur-md transition hover:scale-110 hover:border-amber-400 hover:bg-amber-600/20 active:scale-95 cursor-pointer"
      >
        📯
      </button>
    </>
  );
}
