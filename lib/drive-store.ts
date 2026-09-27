import { create } from "zustand";

/** Half of the drivable road width (m). lateralOffset is clamped to this. */
export const ROAD_HALF_WIDTH = 3.2;
/** Driver's eye height above the road surface (m) — bus driver sits high. */
export const EYE_HEIGHT = 1.9;
/** Chunk length in metres (architecture.md §3). */
export const CHUNK_LENGTH = 60;

interface DriveState {
  /** Forward speed in m/s. Constant for v1 (no acceleration model). */
  speed: number;
  /** Shared steering value in [-1, 1] — keyboard and on-screen wheel both
      write this one value (architecture.md §5). */
  steeringAngle: number;
  /** Lateral position of the car on the road (m), clamped to road bounds. */
  lateralOffset: number;
  /** Total distance driven along the route (m). Drives chunk spawning. */
  distanceTraveled: number;
  setSteering: (v: number) => void;
  setLateralOffset: (v: number) => void;
  addDistance: (d: number) => void;
  reset: () => void;
}

export const useDriveStore = create<DriveState>((set) => ({
  speed: 14,
  steeringAngle: 0,
  lateralOffset: 0,
  distanceTraveled: 0,
  setSteering: (v) =>
    set({ steeringAngle: Math.max(-1, Math.min(1, v)) }),
  setLateralOffset: (v) =>
    set({ lateralOffset: Math.max(-ROAD_HALF_WIDTH, Math.min(ROAD_HALF_WIDTH, v)) }),
  addDistance: (d) => set((s) => ({ distanceTraveled: s.distanceTraveled + d })),
  reset: () =>
    set({ steeringAngle: 0, lateralOffset: 0, distanceTraveled: 0 }),
}));
