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
  // 1. Natural White Sunny Day - Clean Crisp 6500K Daylight, Balanced Sky Ambient & Natural Earth
  morning: {
    skyTop: "#1c6ab6",
    skyHorizon: "#8ec2eb",
    skyBottom: "#add7f8", // Below horizon sky continuation
    skyCloud: "#ffffff",
    fogColor: "#8ec2eb",
    fogNear: 180,
    fogFar: 880,
    ambientColor: "#dbe8f5", // Soft natural daylight sky ambient
    ambientIntensity: 1.15,
    sunColor: "#ffffff", // Pure crisp natural white sunlight (no yellow/orange cast)
    sunIntensity: 3.0,
    sunPosition: [-32, 48, 14],
    cloudColor: "#ffffff",
    groundTint: "#c89d68",
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
  rainIntensity: number;
  autoCycle: boolean;
  headlights: boolean;
  headlightsOn: boolean;
  wipers: boolean;
  wipersOn: boolean;
  setTimeOfDay: (t: TimeOfDay) => void;
  setAutoCycle: (on: boolean) => void;
  toggleHeadlights: () => void;
  toggleWipers: () => void;
  cycleTimeOfDay: () => void;
}

const ORDER: TimeOfDay[] = ["morning", "noon"];

export const useWeatherStore = create<WeatherStore>((set) => ({
  timeOfDay: "morning",
  isRaining: false,
  rainIntensity: 0,
  autoCycle: false,
  headlights: false,
  headlightsOn: false,
  wipers: false,
  wipersOn: false,
  setTimeOfDay: (timeOfDay) =>
    set({
      timeOfDay,
      isRaining: TIME_LIGHTING_CONFIGS[timeOfDay].isRain,
      rainIntensity: TIME_LIGHTING_CONFIGS[timeOfDay].isRain ? 1.0 : 0.0,
    }),
  setAutoCycle: (autoCycle) => set({ autoCycle }),
  toggleHeadlights: () =>
    set((s) => ({
      headlights: !s.headlights,
      headlightsOn: !s.headlightsOn,
    })),
  toggleWipers: () =>
    set((s) => ({
      wipers: !s.wipers,
      wipersOn: !s.wipersOn,
    })),
  cycleTimeOfDay: () =>
    set((s) => {
      const idx = ORDER.indexOf(s.timeOfDay);
      const next = ORDER[(idx + 1) % ORDER.length];
      return {
        timeOfDay: next,
        isRaining: TIME_LIGHTING_CONFIGS[next].isRain,
        rainIntensity: TIME_LIGHTING_CONFIGS[next].isRain ? 1.0 : 0.0,
      };
    }),
}));
