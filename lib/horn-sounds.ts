/**
 * Indian Bus & Truck Horns Catalog & Playback Engine.
 *
 * Connected directly to user-provided MP3 audio files in public/audio:
 * - horn-air.mp3
 * - horn-rajasthani.mp3
 * - horn-truck-1.mp3
 * - horn-truck-2.mp3
 * - horn-truck-3.mp3
 * - horn-truck-4.mp3
 * - horn-truck-5.mp3
 */

export interface HornSound {
  id: string;
  name: string;
  hindiName: string;
  file: string;
}

export const HORN_CATALOG: HornSound[] = [
  {
    id: "horn-air",
    name: "Pressure Air Horn",
    hindiName: "प्रेशर एयर हॉर्न",
    file: "/audio/horn-air.mp3",
  },
  {
    id: "horn-rajasthani",
    name: "Rajasthani Musical Horn",
    hindiName: "राजस्थानी म्यूजिकल हॉर्न",
    file: "/audio/horn-rajasthani.mp3",
  },
  {
    id: "horn-truck-1",
    name: "Desi Truck Horn #1",
    hindiName: "देसी ट्रक हॉर्न #१",
    file: "/audio/horn-truck-1.mp3",
  },
  {
    id: "horn-truck-2",
    name: "Desi Truck Horn #2",
    hindiName: "देसी ट्रक हॉर्न #२",
    file: "/audio/horn-truck-2.mp3",
  },
  {
    id: "horn-truck-3",
    name: "Desi Truck Horn #3",
    hindiName: "देसी ट्रक हॉर्न #३",
    file: "/audio/horn-truck-3.mp3",
  },
  {
    id: "horn-truck-4",
    name: "Desi Truck Horn #4",
    hindiName: "देसी ट्रक हॉर्न #४",
    file: "/audio/horn-truck-4.mp3",
  },
  {
    id: "horn-truck-5",
    name: "Desi Truck Horn #5",
    hindiName: "देसी ट्रक हॉर्न #५",
    file: "/audio/horn-truck-5.mp3",
  },
];

let lastPlayedIndex = -1;
let audioElementsCache: Record<string, HTMLAudioElement> = {};
let toastListeners: Array<(horn: HornSound) => void> = [];

export function onHornPlayed(callback: (horn: HornSound) => void) {
  toastListeners.push(callback);
  return () => {
    toastListeners = toastListeners.filter((cb) => cb !== callback);
  };
}

function notifyHornToast(horn: HornSound) {
  toastListeners.forEach((cb) => {
    try {
      cb(horn);
    } catch {}
  });
}

/** Preload all horn sounds in memory for instant zero-latency playback */
export function preloadHornSounds() {
  if (typeof window === "undefined") return;
  HORN_CATALOG.forEach((horn) => {
    if (!audioElementsCache[horn.id]) {
      const el = new Audio(horn.file);
      el.preload = "auto";
      audioElementsCache[horn.id] = el;
    }
  });
}

/**
 * Play a random authentic Indian pressure horn sound from the catalog.
 * Guarantees a different horn than the previous honk.
 */
export function playRandomHorn(): HornSound {
  let nextIdx = Math.floor(Math.random() * HORN_CATALOG.length);
  if (HORN_CATALOG.length > 1 && nextIdx === lastPlayedIndex) {
    nextIdx = (nextIdx + 1) % HORN_CATALOG.length;
  }
  lastPlayedIndex = nextIdx;
  const horn = HORN_CATALOG[nextIdx];

  notifyHornToast(horn);

  try {
    if (typeof window !== "undefined") {
      let audio = audioElementsCache[horn.id];
      if (!audio) {
        audio = new Audio(horn.file);
        audioElementsCache[horn.id] = audio;
      }
      audio.currentTime = 0;
      audio.volume = 1.0;
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn("Horn audio play was blocked or interrupted:", err);
        });
      }
    }
  } catch (err) {
    console.warn("Failed to play horn sound:", err);
  }

  return horn;
}
