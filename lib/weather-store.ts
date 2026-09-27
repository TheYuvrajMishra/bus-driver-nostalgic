import { create } from "zustand";

export type TimeOfDay = "morning" | "noon";

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
  // 1. Sunny Morning - Crisp Natural White Sunlight & Azure Blue Sky
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
  // 2. Rainy Noon - Moody Overcast Sky & Rain
  noon: {
    skyTop: "#1a212b",
    skyHorizon: "#48525e",
    skyCloud: "#2b3440",
    fogColor: "#3e4752",
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
  timeOfDay: "morning", // Default to Sunny Morning
  autoCycle: false,
  rainIntensity: 0,
  headlights: false,
  wipers: false,
  setTimeOfDay: (timeOfDay) =>
    set({
      timeOfDay,
      rainIntensity: timeOfDay === "noon" ? 0.9 : 0,
      wipers: timeOfDay === "noon",
    }),
  setAutoCycle: (autoCycle) => set({ autoCycle }),
  setHeadlights: (headlights) => set({ headlights }),
  setWipers: (wipers) => set({ wipers }),
  toggleHeadlights: () => set((s) => ({ headlights: !s.headlights })),
  toggleWipers: () => set((s) => ({ wipers: !s.wipers })),
}));
