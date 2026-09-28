import { create } from "zustand";
import { ROTATIONS, getCurrentRotation } from "./rotations";
import {
  JUKEBOX_SONGS,
  getRandomSongIndex,
  getSongByIndex,
  type JukeboxSong,
} from "./songs-catalog";

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
}

/**
 * Audio playback state for 100 Gaane Bus-Driver Jukebox & Scene Lighting.
 */
interface AudioState {
  rotationId: string;
  autoFollow: boolean;
  track: Track;
  isPlaying: boolean;
  audioSource: "youtube" | "local";
  radioTitle: string | null;

  // Jukebox state
  currentSongIndex: number;
  currentSong: JukeboxSong;
  shuffleMode: boolean;
  hasRandomizedOnMount: boolean;

  // Volume & Screen state
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  showVideoScreen: boolean;

  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  playSongIndex: (index: number) => void;
  playRandomSong: () => void;
  initRandomOnClientMount: () => void;
  toggleShuffle: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleVideoScreen: () => void;
  setAudioSource: (source: "youtube" | "local") => void;
  setRadioTitle: (t: string | null) => void;
  setRotation: (id: string, auto?: boolean) => void;
  enableAutoFollow: () => void;
}

// Deterministic initial state for SSR
const initialRotation = getCurrentRotation();
const initialSong = JUKEBOX_SONGS[0];

export const useAudioStore = create<AudioState>((set, get) => ({
  rotationId: initialRotation.id,
  autoFollow: true,
  track: initialRotation.track,
  isPlaying: false,
  audioSource: "youtube",
  radioTitle: initialSong.title,

  currentSongIndex: 0,
  currentSong: initialSong,
  shuffleMode: true,
  hasRandomizedOnMount: false,

  volume: 0.9,
  isMuted: false,
  showVideoScreen: true, // Visible by default so user sees and hears video immediately!

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),

  initRandomOnClientMount: () => {
    if (get().hasRandomizedOnMount) return;
    const rndIdx = getRandomSongIndex();
    const song = getSongByIndex(rndIdx);
    set({
      currentSongIndex: rndIdx,
      currentSong: song,
      radioTitle: song.title,
      hasRandomizedOnMount: true,
    });
  },

  playSongIndex: (index: number) => {
    const s = getSongByIndex(index);
    set({
      currentSongIndex: index,
      currentSong: s,
      radioTitle: s.title,
      isPlaying: true,
    });
  },

  playRandomSong: () => {
    const current = get().currentSongIndex;
    let nextIdx = getRandomSongIndex();
    if (JUKEBOX_SONGS.length > 1 && nextIdx === current) {
      nextIdx = (nextIdx + 1) % JUKEBOX_SONGS.length;
    }
    const s = getSongByIndex(nextIdx);
    set({
      currentSongIndex: nextIdx,
      currentSong: s,
      radioTitle: s.title,
      isPlaying: true,
    });
  },

  next: () => {
    const { shuffleMode, currentSongIndex } = get();
    if (shuffleMode) {
      get().playRandomSong();
    } else {
      const nextIdx = (currentSongIndex + 1) % JUKEBOX_SONGS.length;
      get().playSongIndex(nextIdx);
    }
  },

  prev: () => {
    const { shuffleMode, currentSongIndex } = get();
    if (shuffleMode) {
      get().playRandomSong();
    } else {
      const prevIdx =
        (currentSongIndex - 1 + JUKEBOX_SONGS.length) % JUKEBOX_SONGS.length;
      get().playSongIndex(prevIdx);
    }
  },

  toggleShuffle: () => set((s) => ({ shuffleMode: !s.shuffleMode })),

  setVolume: (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    set((s) => ({ isMuted: !s.isMuted }));
  },

  toggleVideoScreen: () => set((s) => ({ showVideoScreen: !s.showVideoScreen })),

  setAudioSource: (audioSource) => set({ audioSource }),
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
