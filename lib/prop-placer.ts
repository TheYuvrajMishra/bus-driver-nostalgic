import { ROAD_WIDTH } from "./road-constants";

/**
 * Deterministic per-chunk prop placement — architecture.md §3.
 * Same chunk index → same prop list, always (seeded PRNG keyed by n).
 */

export type PropType =
  | "grass"
  | "tree"
  | "rock"
  | "dhaba"
  | "truck"
  | "milestone"
  | "pole"
  | "reflector";

export interface PropItem {
  type: PropType;
  /** Chunk-local position: x right of centre, z along (-60 → 0). */
  x: number;
  z: number;
  /** Uniform scale. */
  s: number;
  /** Extra yaw on top of the chunk's yaw. */
  ry: number;
  /** Color variant index (tints via instance color). */
  v: number;
}

export type Lod = "full" | "sparse";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROAD_HALF = ROAD_WIDTH / 2;

function buildProps(n: number): PropItem[] {
  const rand = mulberry32((Math.imul(n, 2654435761) ^ 0x9e3779b9) >>> 0);
  const items: PropItem[] = [];

  // 1. Spiky Desert Grass Tufts (Yucca clumps lining highway edges)
  const grassCount = 16 + Math.floor(rand() * 8);
  for (let i = 0; i < grassCount; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    items.push({
      type: "grass",
      x: side * (ROAD_HALF + 0.4 + rand() * 4.5),
      z: -rand() * 58,
      s: 0.8 + rand() * 0.6,
      ry: rand() * Math.PI * 2,
      v: Math.floor(rand() * 3),
    });
  }

  // 2. Low-poly desert rocks / boulders scattered along shoulders and dunes
  const rockCount = 8 + Math.floor(rand() * 6);
  for (let i = 0; i < rockCount; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    items.push({
      type: "rock",
      x: side * (ROAD_HALF + 1.2 + rand() * 12.0),
      z: -rand() * 58,
      s: 0.6 + rand() * 1.1,
      ry: rand() * Math.PI * 2,
      v: Math.floor(rand() * 3),
    });
  }

  // 3. Low-poly Acacia trees lining both sides of the desert highway
  const treeCount = 8 + Math.floor(rand() * 4);
  for (let i = 0; i < treeCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    items.push({
      type: "tree",
      x: side * (ROAD_HALF + 3.2 + rand() * 14.0),
      z: -(i / treeCount) * 60 - rand() * 3,
      s: 0.85 + rand() * 0.65,
      ry: rand() * Math.PI * 2,
      v: Math.floor(rand() * 2),
    });
  }

  // 4. Telegraph & Power Transmission Poles along the left shoulder
  if (n % 2 === 0) {
    items.push({
      type: "pole",
      x: -(ROAD_HALF + 2.6),
      z: -15,
      s: 1.0,
      ry: 0,
      v: 0,
    });
    items.push({
      type: "pole",
      x: -(ROAD_HALF + 2.6),
      z: -45,
      s: 1.0,
      ry: 0,
      v: 0,
    });
  }

  // 5. Roadside Dhaba / Abandoned Brick House
  if (rand() < 0.38) {
    const side = rand() < 0.5 ? -1 : 1;
    items.push({
      type: "dhaba",
      x: side * (ROAD_HALF + 6.5 + rand() * 3.5),
      z: -14 - rand() * 32,
      s: 0.95 + rand() * 0.25,
      ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, // face the highway
      v: 0,
    });
  }

  // 6. Parked Truck on shoulder
  if (rand() < 0.35) {
    const side = rand() < 0.5 ? -1 : 1;
    items.push({
      type: "truck",
      x: side * (ROAD_HALF + 1.2),
      z: -8 - rand() * 44,
      s: 0.95 + rand() * 0.15,
      ry: (rand() - 0.5) * 0.1,
      v: Math.floor(rand() * 3),
    });
  }

  // 7. Milestone stone every chunk
  items.push({
    type: "milestone",
    x: (n % 2 === 0 ? 1 : -1) * (ROAD_HALF + 0.8),
    z: -28,
    s: 1.0,
    ry: n % 2 === 0 ? -Math.PI / 2 : Math.PI / 2,
    v: 0,
  });

  // 8. Roadside Cat-Eye Reflectors along both lane edges
  for (let zStep = -5; zStep >= -55; zStep -= 10) {
    items.push({
      type: "reflector",
      x: -(ROAD_HALF - 0.15),
      z: zStep,
      s: 1.0,
      ry: 0,
      v: 0,
    });
    items.push({
      type: "reflector",
      x: ROAD_HALF - 0.15,
      z: zStep,
      s: 1.0,
      ry: 0,
      v: 0,
    });
  }

  return items;
}

const cache = new Map<number, PropItem[]>();

export function propsForChunk(n: number): PropItem[] {
  let list = cache.get(n);
  if (!list) {
    list = buildProps(n);
    cache.set(n, list);
  }
  return list;
}

export function evictProps(keep: Set<number>) {
  for (const k of cache.keys()) {
    if (!keep.has(k)) cache.delete(k);
  }
}
