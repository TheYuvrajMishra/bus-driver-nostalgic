import { create } from "zustand";
import { ROTATIONS, getCurrentRotation } from "./rotations";
import { ytNext, ytPrev } from "./yt-engine";

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
}

/**
 * Audio playback state.
 *
 * The actual playback engines live in <RadioEngine/>, mounted exactly once
 * in the root layout. Pages only read/dispatch this store — they never own
 * playback (see documentation/architecture.md §8).
 *
 * Primary engine: hidden YouTube playlist (lib/radio-config.ts). The store's
 * `radioTitle` carries the live video title; `track` is the legacy fallback
 * (local placeholder loop) used only if YouTube can't load.
 *
 * The current IST rotation still picks the drive's lighting mood
 * (rotations.ts). Rotations auto-switch with the clock unless the user
 * picks one manually.
 */
interface AudioState {
  rotationId: string;
  autoFollow: boolean;
  track: Track;
  isPlaying: boolean;
  /** Which engine is actually producing sound. */
  engine: "youtube" | "legacy";
  /** Live YouTube video title (null when the legacy engine is active). */
  radioTitle: string | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setEngine: (e: "youtube" | "legacy") => void;
  setRadioTitle: (t: string | null) => void;
  /** Manually select a rotation (disables auto-follow unless asked). */
  setRotation: (id: string, auto?: boolean) => void;
  /** Re-enable clock-driven rotation switching. */
  enableAutoFollow: () => void;
}

const initial = getCurrentRotation();

export const useAudioStore = create<AudioState>((set) => ({
  rotationId: initial.id,
  autoFollow: true,
  track: initial.track,
  isPlaying: false,
  engine: "youtube",
  radioTitle: null,
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  next: () => ytNext(),
  prev: () => ytPrev(),
  setEngine: (engine) => set({ engine }),
  setRadioTitle: (radioTitle) => set({ radioTitle }),
  setRotation: (id, auto = false) => {
    const r = ROTATIONS.find((x) => x.id === id);
    if (!r) return;
    set({ rotationId: id, track: r.track, autoFollow: auto });
  },
  enableAutoFollow: () => {
    const r = getCurrentRotation();
    set({ rotationId: r.id, track: r.track, autoFollow: true });
  },
}));
