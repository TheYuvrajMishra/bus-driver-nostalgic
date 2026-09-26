import { create } from "zustand";
import { ROTATIONS, getCurrentRotation } from "./rotations";

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
}

/**
 * Audio playback state.
 *
 * The actual <audio> element lives in <PersistentPlayer/>, mounted exactly
 * once in the root layout. Pages only read/dispatch this store — they never
 * own the audio element (see documentation/architecture.md §8).
 *
 * The current IST rotation picks the track AND the scene's lighting mood
 * (rotations.ts). Rotations auto-switch with the clock unless the user
 * picks one manually.
 */
interface AudioState {
  rotationId: string;
  autoFollow: boolean;
  track: Track;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
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
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
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
