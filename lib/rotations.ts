import type { Track } from "./audio-store";

/**
 * The four IST time-based rotations (research.md §1, prd.md Phase 2).
 * Each rotation carries its placeholder track AND the scene's lighting mood —
 * the drive looks like the mood the currently-playing rotation implies.
 */

export interface RotationLighting {
  sky: string;
  fogNear: number;
  fogFar: number;
  ambientColor: string;
  ambientIntensity: number;
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
}

export interface Rotation {
  id: string;
  name: string;
  hindi: string;
  /** IST hour range [start, end). Overnight ranges wrap (start > end). */
  start: number;
  end: number;
  track: Track;
  lighting: RotationLighting;
}

const placeholder = (id: string, title: string, file: string, artist: string): Track => ({
  id,
  title,
  artist,
  src: `/audio/${file}`,
});

export const ROTATIONS: Rotation[] = [
  {
    id: "highway-raat",
    name: "Highway Raat",
    hindi: "हाईवे रात",
    start: 22,
    end: 5,
    track: placeholder(
      "ph-highway-raat",
      "Highway Raat",
      "placeholder-highway-raat.mp3",
      "placeholder track · final catalog TBD"
    ),
    lighting: {
      sky: "#0d1330",
      fogNear: 70,
      fogFar: 360,
      ambientColor: "#5a6aa8",
      ambientIntensity: 0.6,
      sunColor: "#cfd8ff",
      sunIntensity: 0.55,
      sunPosition: [-6, 9, -4],
    },
  },
  {
    id: "subah-nikaas",
    name: "Subah Nikaas",
    hindi: "सुबह निकास",
    start: 5,
    end: 9,
    track: placeholder(
      "ph-subah-nikaas",
      "Subah Nikaas",
      "placeholder-subah-nikaas.mp3",
      "placeholder track · final catalog TBD"
    ),
    lighting: {
      sky: "#ffc98a",
      fogNear: 80,
      fogFar: 420,
      ambientColor: "#ffdcb0",
      ambientIntensity: 0.85,
      sunColor: "#fff2d8",
      sunIntensity: 1.7,
      sunPosition: [8, 6, -6],
    },
  },
  {
    id: "dhaba-classics",
    name: "Dhaba Classics",
    hindi: "ढाबा क्लासिक्स",
    start: 9,
    end: 18,
    track: placeholder(
      "ph-dhaba-classics",
      "Dhaba Classics",
      "placeholder-dhaba-classics.mp3",
      "placeholder track · final catalog TBD"
    ),
    lighting: {
      sky: "#79c7e8",
      fogNear: 90,
      fogFar: 450,
      ambientColor: "#ffffff",
      ambientIntensity: 0.9,
      sunColor: "#fff6e0",
      sunIntensity: 2.1,
      sunPosition: [6, 12, 2],
    },
  },
  {
    id: "sunset-chill",
    name: "Sunset Chill",
    hindi: "सनसेट चिल",
    start: 18,
    end: 22,
    track: placeholder(
      "ph-sunset-chill",
      "Sunset Chill",
      "placeholder-sunset-chill.mp3",
      "placeholder track · final catalog TBD"
    ),
    lighting: {
      sky: "#e8823f",
      fogNear: 70,
      fogFar: 380,
      ambientColor: "#ffb37a",
      ambientIntensity: 0.75,
      sunColor: "#ff9a4d",
      sunIntensity: 1.5,
      sunPosition: [-8, 4, -6],
    },
  },
];

/** Current IST hour (0–23). */
export function istHour(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).format(d);
  return parseInt(parts, 10) % 24;
}

function inRange(h: number, start: number, end: number): boolean {
  return start <= end ? h >= start && h < end : h >= start || h < end;
}

export function getRotationForHour(h: number): Rotation {
  return ROTATIONS.find((r) => inRange(h, r.start, r.end)) ?? ROTATIONS[2];
}

export function getCurrentRotation(d: Date = new Date()): Rotation {
  return getRotationForHour(istHour(d));
}
