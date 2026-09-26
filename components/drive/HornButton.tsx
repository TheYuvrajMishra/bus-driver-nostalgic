"use client";

import { useEffect, useRef } from "react";

/**
 * Horn easter egg — busdriver.wtf-style playfulness (design.md §4).
 * Kept low-key against the music: short synthesized horn on its own
 * audio element (never through the radio player). Button + `H` key.
 */
export default function HornButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const honk = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/audio/horn.mp3");
      audioRef.current.volume = 0.6;
    }
    const el = audioRef.current;
    el.currentTime = 0;
    el.play().catch(() => {});
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyH") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      honk();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <button
      onClick={honk}
      aria-label="Honk the horn"
      title="Horn (H)"
      className="absolute bottom-4 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full border border-amber-700/60 bg-[#1a0f0c]/80 text-2xl opacity-80 transition hover:scale-105 hover:opacity-100 active:scale-95"
    >
      📯
    </button>
  );
}
