import { create } from "zustand";

export type TimeOfDay = "morning" | "storm" | "sunset" | "night";

export interface WeatherLighting {
  skyTop: string;
  skyHorizon: string;
  skyCloud: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  ambientColor: string;
  ambientIntensity: number;
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  cloudColor: string;
  groundTint: string;
  isRain: boolean;
  isNight: boolean;
}

export const TIME_LIGHTING_CONFIGS: Record<TimeOfDay, WeatherLighting> = {
  // 1. Crisp Natural White Sunlight & Azure Blue Sky
  morning: {
    skyTop: "#1e6bb8",
    skyHorizon: "#90c8f0",
    skyCloud: "#ffffff",
    fogColor: "#8ec4ed",
    fogNear: 100,
    fogFar: 550,
    ambientColor: "#ffffff", // Pure natural white light
    ambientIntensity: 1.05,
    sunColor: "#ffffff", // Pure white daylight sun
    sunIntensity: 2.3,
    sunPosition: [12, 16, -10],
    cloudColor: "#edf3f8",
    groundTint: "#baa37f",
    isRain: false,
    isNight: false,
  },
  // 2. Moody Slate Overcast & Rain
  storm: {
    skyTop: "#1a212b",
    skyHorizon: "#48525e",
    skyCloud: "#2b3440",
    fogColor: "#3e4752",
    fogNear: 55,
    fogFar: 380,
    ambientColor: "#ccd5de", // Neutral cool grey-white overcast
    ambientIntensity: 0.85,
    sunColor: "#dbe3eb",
    sunIntensity: 1.2,
    sunPosition: [4, 18, -6],
    cloudColor: "#28303b",
    groundTint: "#767268",
    isRain: true,
    isNight: false,
  },
  // 3. Balanced Golden Hour Dusk
  sunset: {
    skyTop: "#25304e",
    skyHorizon: "#ee8042",
    skyCloud: "#ea6e36",
    fogColor: "#d26f3e",
    fogNear: 75,
    fogFar: 440,
    ambientColor: "#ffe6d6",
    ambientIntensity: 0.85,
    sunColor: "#ffa25b",
    sunIntensity: 1.9,
    sunPosition: [-16, 5, -12],
    cloudColor: "#a85032",
    groundTint: "#9c7050",
    isRain: false,
    isNight: false,
  },
  // 4. Midnight Starfield (User Approved)
  night: {
    skyTop: "#060a17",
    skyHorizon: "#11182c",
    skyCloud: "#0c1220",
    fogColor: "#0d1324",
    fogNear: 40,
    fogFar: 280,
    ambientColor: "#24335c",
    ambientIntensity: 0.35,
    sunColor: "#8fa8e0",
    sunIntensity: 0.5,
    sunPosition: [-6, 12, -4],
    cloudColor: "#0f1524",
    groundTint: "#2e2b26",
    isRain: false,
    isNight: true,
  },
};

interface WeatherStoreState {
  timeOfDay: TimeOfDay;
  autoCycle: boolean;
  rainIntensity: number;
  headlights: boolean;
  wipers: boolean;
  setTimeOfDay: (t: TimeOfDay) => void;
  setAutoCycle: (val: boolean) => void;
  setHeadlights: (val: boolean) => void;
  setWipers: (val: boolean) => void;
  toggleHeadlights: () => void;
  toggleWipers: () => void;
}

export const useWeatherStore = create<WeatherStoreState>((set) => ({
  timeOfDay: "morning", // Default to natural crisp white daylight
  autoCycle: false,
  rainIntensity: 0,
  headlights: false,
  wipers: false,
  setTimeOfDay: (timeOfDay) =>
    set({
      timeOfDay,
      rainIntensity: timeOfDay === "storm" ? 0.9 : 0,
      headlights: timeOfDay === "night",
      wipers: timeOfDay === "storm",
    }),
  setAutoCycle: (autoCycle) => set({ autoCycle }),
  setHeadlights: (headlights) => set({ headlights }),
  setWipers: (wipers) => set({ wipers }),
  toggleHeadlights: () => set((s) => ({ headlights: !s.headlights })),
  toggleWipers: () => set((s) => ({ wipers: !s.wipers })),
}));
