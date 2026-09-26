import { create } from "zustand";

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
 */
interface AudioState {
  track: Track;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
}

const PLACEHOLDER_TRACK: Track = {
  id: "placeholder-radio",
  title: "Placeholder Radio",
  // Music catalog/licensing is still an open question (prd.md §7).
  // This generated drone stands in until the real catalog is decided.
  artist: "catalog pending — generated placeholder",
  src: "/audio/placeholder-radio.mp3",
};

export const useAudioStore = create<AudioState>((set) => ({
  track: PLACEHOLDER_TRACK,
  isPlaying: false,
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
}));
