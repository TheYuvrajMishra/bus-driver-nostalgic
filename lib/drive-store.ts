import { create } from "zustand";
import { DRIVING_CONFIG } from "./driving-config";
import { steeringInput } from "./steering-input";

export const ROAD_HALF_WIDTH = DRIVING_CONFIG.ROAD_HALF_WIDTH;
export const EYE_HEIGHT = 1.9;
export const CHUNK_LENGTH = 60;

interface DriveState {
  /** Forward speed in m/s (0 .. MAX_SPEED). */
  speed: number;
  /** Speed in km/h for dashboard instrumentation. */
  speedKmh: number;
  /** Normalized throttle input in [0, 1]. */
  throttle: number;
  /** Normalized brake input in [0, 1]. */
  brake: number;
  /** Engine RPM for tachometer gauge. */
  rpm: number;
  /** Simulated gear (1..5). */
  gear: number;
  /** Shared steering value in [-1, 1]. */
  steeringAngle: number;
  /** Lateral position of the bus on the road (m). */
  lateralOffset: number;
  /** Total distance driven along the route (m). */
  distanceTraveled: number;
  /** Bump shake trauma impulse [0, 1]. */
  shakeImpulse: number;

  setThrottle: (v: number) => void;
  setBrake: (v: number) => void;
  setSteering: (v: number) => void;
  setLateralOffset: (v: number) => void;
  addDistance: (d: number) => void;
  triggerBump: (intensity?: number) => void;
  reset: () => void;
}

export const useDriveStore = create<DriveState>((set) => ({
  speed: 16.0, // starts at comfortable ~58 km/h cruise
  speedKmh: 57.6,
  throttle: 0,
  brake: 0,
  rpm: 1650,
  gear: 4,
  steeringAngle: 0,
  lateralOffset: 0.8, // right-hand traffic lane
  distanceTraveled: 0,
  shakeImpulse: 0,

  setThrottle: (v) => {
    const val = Math.max(0, Math.min(1, v));
    steeringInput.throttle = val;
    set({ throttle: val });
  },
  setBrake: (v) => {
    const val = Math.max(0, Math.min(1, v));
    steeringInput.brake = val;
    set({ brake: val });
  },
  setSteering: (v) =>
    set({ steeringAngle: Math.max(-1, Math.min(1, v)) }),
  setLateralOffset: (v) =>
    set({
      lateralOffset: Math.max(
        -ROAD_HALF_WIDTH,
        Math.min(ROAD_HALF_WIDTH, v)
      ),
    }),
  addDistance: (d) =>
    set((s) => ({ distanceTraveled: s.distanceTraveled + d })),
  triggerBump: (intensity = 0.6) =>
    set((s) => ({
      shakeImpulse: Math.min(1.0, s.shakeImpulse + intensity),
    })),
  reset: () =>
    set({
      speed: 16.0,
      speedKmh: 57.6,
      throttle: 0,
      brake: 0,
      rpm: 1650,
      gear: 4,
      steeringAngle: 0,
      lateralOffset: 0.8,
      distanceTraveled: 0,
      shakeImpulse: 0,
    }),
}));
