import { ROAD_WIDTH } from "./road-constants";

/**
 * Deterministic per-chunk prop placement — architecture.md §3.
 * Same chunk index → same prop list, always (seeded PRNG keyed by n).
 *
 * Placed Props:
 * 1. Wooden Utility / Telephone Poles along Left Shoulder (wires & guardrails handled per-chunk)
 * 2. Dominant Large Flat-Canopy Acacia / Afromontane Trees
 * 3. Small Round Bushes / Shrubs (Ground-Cover Filler)
 * 4. Spiky Desert Grass / Yucca Clumps
 * 5. Faceted Low-Poly Rocks & Roadside Cliff Boulders (Warm Tan/Orange)
 * 6. Roadside Dhaba, Trucks, NH Milestones & Reflectors
 */

export type PropType =
  | "grass"
  | "tree"
  | "tree_banyan"
  | "tree_gulmohar"
  | "bush"
  | "rock"
  | "cliff"
  | "pole"
  | "dhaba"
  | "truck"
  | "milestone"
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

const ROAD_HALF = ROAD_WIDTH / 2; // 4.5m

function buildProps(n: number): PropItem[] {
  const rand = mulberry32((Math.imul(n, 2654435761) ^ 0x9e3779b9) >>> 0);
  const items: PropItem[] = [];

  // ---------------------------------------------------------------------------
  // 1. Telephone Poles along the left shoulder (at 10m, 30m, 50m)
  // ---------------------------------------------------------------------------
  const polePositions = [-10, -30, -50];
  for (const pz of polePositions) {
    items.push({
      type: "pole",
      x: -(ROAD_HALF + 2.8),
      z: pz,
      s: 1.0,
      ry: 0,
      v: 0,
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Rich Varied Roadside Trees (Flat Acacia, Dense Banyan/Neem, Flowering Gulmohar)
  // ---------------------------------------------------------------------------
  const treeCount = 10 + Math.floor(rand() * 4);
  for (let i = 0; i < treeCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const offset = side < 0
      ? ROAD_HALF + 5.8 + rand() * 18.0
      : ROAD_HALF + 5.2 + rand() * 24.0;

    // Weighted species selection: 55% Umbrella Acacia, 28% Dense Banyan/Neem, 17% Flowering Gulmohar
    const rType = rand();
    let type: PropType = "tree";
    if (rType < 0.55) {
      type = "tree";
    } else if (rType < 0.83) {
      type = "tree_banyan";
    } else {
      type = "tree_gulmohar";
    }

    items.push({
      type,
      x: side * offset,
      z: -(i / treeCount) * 58 - rand() * 2,
      s: 0.9 + rand() * 0.45,
      ry: rand() * Math.PI * 2,
      v: Math.floor(rand() * 3),
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Small Round Bushes / Shrubs (Ground-Cover Filler between Trees)
  // ---------------------------------------------------------------------------
  const bushCount = 18 + Math.floor(rand() * 8);
  for (let i = 0; i < bushCount; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const offset = side < 0
      ? ROAD_HALF + 3.8 + rand() * 20.0
      : ROAD_HALF + 3.2 + rand() * 24.0;
    items.push({
      type: "bush",
      x: side * offset,
      z: -rand() * 58,
      s: 0.75 + rand() * 0.55,
      ry: rand() * Math.PI * 2,
      v: Math.floor(rand() * 3),
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Spiky Desert Grass / Yucca Clumps along road edges & shoulders
  // ---------------------------------------------------------------------------
  const grassCount = 18 + Math.floor(rand() * 8);
  for (let i = 0; i < grassCount; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    items.push({
      type: "grass",
      x: side * (ROAD_HALF + 0.6 + rand() * 4.2),
      z: -rand() * 58,
      s: 0.8 + rand() * 0.5,
      ry: rand() * Math.PI * 2,
      v: Math.floor(rand() * 3),
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Faceted Low-Poly Rocks & Roadside Cliff Boulders (Warm Tan/Orange)
  // ---------------------------------------------------------------------------
  const rockCount = 10 + Math.floor(rand() * 6);
  for (let i = 0; i < rockCount; i++) {
    const side = rand() < 0.65 ? -1 : 1;
    const offset = side < 0
      ? ROAD_HALF + 4.2 + rand() * 18.0
      : ROAD_HALF + 3.6 + rand() * 22.0;
    items.push({
      type: "rock",
      x: side * offset,
      z: -rand() * 58,
      s: 0.7 + rand() * 1.0,
      ry: rand() * Math.PI * 2,
      v: Math.floor(rand() * 3),
    });
  }

  // Large rocky cliff formations on the left hillside
  if (rand() < 0.75) {
    items.push({
      type: "cliff",
      x: -(ROAD_HALF + 7.5 + rand() * 12.0),
      z: -10 - rand() * 38,
      s: 0.95 + rand() * 0.45,
      ry: (rand() - 0.5) * 0.8,
      v: 0,
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Roadside Dhaba / Brick Building
  // ---------------------------------------------------------------------------
  if (rand() < 0.32) {
    const side = rand() < 0.5 ? -1 : 1;
    items.push({
      type: "dhaba",
      x: side * (ROAD_HALF + 9.5 + rand() * 4.0),
      z: -14 - rand() * 32,
      s: 1.0,
      ry: side > 0 ? -Math.PI / 2 : Math.PI / 2,
      v: 0,
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Parked Indian Truck on Shoulder
  // ---------------------------------------------------------------------------
  if (rand() < 0.28) {
    items.push({
      type: "truck",
      x: ROAD_HALF + 2.4,
      z: -12 - rand() * 36,
      s: 1.0,
      ry: (rand() - 0.5) * 0.08,
      v: Math.floor(rand() * 3),
    });
  }

  // ---------------------------------------------------------------------------
  // 8. NH Milestone Marker
  // ---------------------------------------------------------------------------
  items.push({
    type: "milestone",
    x: (n % 2 === 0 ? 1 : -1) * (ROAD_HALF + 0.9),
    z: -28,
    s: 1.0,
    ry: n % 2 === 0 ? -Math.PI / 2 : Math.PI / 2,
    v: 0,
  });

  // ---------------------------------------------------------------------------
  // 9. Roadside Cat-Eye Reflectors
  // ---------------------------------------------------------------------------
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
