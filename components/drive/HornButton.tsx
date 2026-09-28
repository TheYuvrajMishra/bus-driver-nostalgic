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
      {/* Visual Horn Notification Glass Toast */}
      {activeHorn && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full glass-pill px-4 py-2 shadow-2xl animate-in fade-in zoom-in-90 duration-200">
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

      {/* Floating Minimalist Glass Horn Button (Bottom Left) */}
      <button
        onClick={honk}
        aria-label="Honk the musical horn"
        title="Press Horn (H) · Plays Random Indian Truck Horn"
        className="fixed bottom-5 left-4 sm:left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full glass-pill text-xl shadow-2xl transition-all duration-300 hover:scale-110 hover:border-amber-400/80 active:scale-95 cursor-pointer ring-1 ring-white/20"
      >
        📯
      </button>
    </>
  );
}
