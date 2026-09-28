"use client";

import { useEffect, useState } from "react";
import {
  playRandomHorn,
  preloadHornSounds,
  onHornPlayed,
  type HornSound,
} from "@/lib/horn-sounds";

function IconHorn({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round`}
      aria-hidden
    >
      <path d="M3 11v2a2 2 0 0 0 2 2h2l6 4V5L7 9H5a2 2 0 0 0-2 2z" fill="currentColor" />
      <path d="M16.5 7.5a6 6 0 0 1 0 9" />
      <path d="M19.5 4.5a10 10 0 0 1 0 15" />
    </svg>
  );
}

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
          <IconHorn className="h-5 w-5 text-amber-300 animate-pulse" />
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
        className="fixed bottom-5 left-4 sm:left-6 z-40 flex h-11 w-11 items-center justify-center rounded-full glass-pill text-neutral-300 shadow-2xl transition-all duration-300 hover:scale-110 hover:text-amber-200 active:scale-95 cursor-pointer ring-1 ring-white/15"
      >
        <IconHorn className="h-5 w-5" />
      </button>
    </>
  );
}
