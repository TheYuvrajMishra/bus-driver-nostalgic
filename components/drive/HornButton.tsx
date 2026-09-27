"use client";

import { useEffect } from "react";

/**
 * Musical pressure horn — the classic Indian truck/bus "musical horn".
 *
 * Plays the hook of "Tip Tip Barsa Paani" (Mohra, 1994) as "pee pee" beeps.
 * Melody reference (sargam): Ma(t) Ma(t) Ga(k) Ga(k) Ma(t) Ma(t)
 * Ni(k) Dha(k) Ma — with Sa = F (the song's original key, F minor):
 *   B3 B3 Ab3 Ab3 B3 B3 | Eb4 Db4 B3(held)
 * Rendered on detuned square waves through a lowpass for that buzzy
 * pressure-horn bite. Short snippet, horn-style — not the song itself.
 *
 * Button + `H` key + steering wheel boss click.
 */

// Frequencies (Hz)
const B3 = 246.94;
const AB3 = 207.65;
const EB4 = 311.13;
const DB4 = 277.18;

/** [frequency, seconds] — "tip-tip bar-sa paa-ni" hook phrase. */
const PHRASE: Array<[number, number]> = [
  [B3, 0.12],
  [B3, 0.12], // tip-tip
  [AB3, 0.12],
  [AB3, 0.12], // bar-sa
  [B3, 0.2], // paa-
  [B3, 0.1],
  [EB4, 0.08],
  [DB4, 0.08], // -ni run
  [B3, 0.36], // resolve
];

let ctx: AudioContext | null = null;

function peep(freq: number, t: number, dur: number) {
  const ac = ctx!;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2600;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.45, t + 0.008);
  gain.gain.setValueAtTime(0.45, t + Math.max(0.008, dur - 0.04));
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  // Two detuned squares = pressure-horn buzz; tiny upward scoop = "pee".
  for (const detune of [-6, 6]) {
    const osc = ac.createOscillator();
    osc.type = "square";
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(freq * 0.94, t);
    osc.frequency.linearRampToValueAtTime(freq, t + 0.03);
    osc.connect(filter);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  filter.connect(gain);
  gain.connect(ac.destination);
}

export function honk() {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as any).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    let t = ctx.currentTime + 0.02;
    for (const [freq, dur] of PHRASE) {
      peep(freq, t, dur);
      t += dur + 0.015;
    }
  } catch {
    /* audio unavailable — stay silent */
  }
}

export default function HornButton() {
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
      aria-label="Honk the musical horn"
      title="Musical horn (H)"
      className="absolute bottom-4 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full border border-amber-700/60 bg-[#1a0f0c]/80 text-2xl opacity-80 transition hover:scale-105 hover:opacity-100 active:scale-95"
    >
      📯
    </button>
  );
}
