import { create } from "zustand";

export type TimeOfDay = "morning" | "noon";

export interface WeatherLighting {
  skyTop: string;
  skyHorizon: string;
  skyBottom: string;
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
  // 1. Bright Sunny Day - Saturated Azure Sky, Crisp Warm Sunlight & Golden Terrain
  morning: {
    skyTop: "#0b66d6",
    skyHorizon: "#6cb9ff",
    skyBottom: "#8ec4fa", // Below horizon sky continuation
    skyCloud: "#ffffff",
    fogColor: "#6cb9ff",
    fogNear: 240,
    fogFar: 920,
    ambientColor: "#8ec4fa", // Bright blue sky ambient bounce
    ambientIntensity: 1.35,
    sunColor: "#fffbf0", // Warm crisp sunlight
    sunIntensity: 3.2,
    sunPosition: [-32, 48, 14],
    cloudColor: "#ffffff",
    groundTint: "#e09848",
    isRain: false,
    isNight: false,
  },
  // 2. Rainy Noon - Moody Overcast Sky & Rain
  noon: {
    skyTop: "#1a212b",
    skyHorizon: "#48525e",
    skyBottom: "#38404a",
    skyCloud: "#2b3440",
    fogColor: "#48525e",
    fogNear: 55,
    fogFar: 380,
    ambientColor: "#ccd5de", // Cool grey overcast
    ambientIntensity: 0.85,
    sunColor: "#dbe3eb",
    sunIntensity: 1.2,
    sunPosition: [4, 18, -6],
    cloudColor: "#28303b",
    groundTint: "#767268",
    isRain: true,
    isNight: false,
  },
};

export interface WeatherStore {
  timeOfDay: TimeOfDay;
  isRaining: boolean;
  headlightsOn: boolean;
  wipersOn: boolean;
  setTimeOfDay: (t: TimeOfDay) => void;
  toggleHeadlights: () => void;
  toggleWipers: () => void;
  cycleTimeOfDay: () => void;
}

const ORDER: TimeOfDay[] = ["morning", "noon"];

export const useWeatherStore = create<WeatherStore>((set) => ({
  timeOfDay: "morning",
  isRaining: false,
  headlightsOn: false,
  wipersOn: false,
  setTimeOfDay: (timeOfDay) =>
    set({
      timeOfDay,
      isRaining: TIME_LIGHTING_CONFIGS[timeOfDay].isRain,
    }),
  toggleHeadlights: () => set((s) => ({ headlightsOn: !s.headlightsOn })),
  toggleWipers: () => set((s) => ({ wipersOn: !s.wipersOn })),
  cycleTimeOfDay: () =>
    set((s) => {
      const idx = ORDER.indexOf(s.timeOfDay);
      const next = ORDER[(idx + 1) % ORDER.length];
      return {
        timeOfDay: next,
        isRaining: TIME_LIGHTING_CONFIGS[next].isRain,
      };
    }),
}));
