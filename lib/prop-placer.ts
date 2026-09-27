import { ROAD_WIDTH } from "./road-constants";

/**
 * Deterministic per-chunk prop placement — architecture.md §3.
 * Same chunk index → same prop list, always (seeded PRNG keyed by n).
 */

export type PropType = "tree" | "rock" | "dhaba" | "truck" | "milestone";

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

  // Low-poly Acacia trees lining both sides of the desert highway
  const treeCount = 8 + Math.floor(rand() * 4);
  for (let i = 0; i < treeCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    items.push({
      type: "tree",
      x: side * (ROAD_HALF + 3.0 + rand() * 9),
      z: -(i / treeCount) * 60 - rand() * 4,
      s: 0.85 + rand() * 0.65,
      ry: rand() * Math.PI * 2,
      v: Math.floor(rand() * 2),
    });
  }

  // Low-poly desert rocks / boulders scattered along shoulders
  const rockCount = 6 + Math.floor(rand() * 4);
  for (let i = 0; i < rockCount; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    items.push({
      type: "rock",
      x: side * (ROAD_HALF + 1.2 + rand() * 5),
      z: -rand() * 58,
      s: 0.6 + rand() * 0.7,
      ry: rand() * Math.PI * 2,
      v: Math.floor(rand() * 3),
    });
  }

  // Dhaba on one side, some chunks.
  if (rand() < 0.35) {
    const side = rand() < 0.5 ? -1 : 1;
    items.push({
      type: "dhaba",
      x: side * (ROAD_HALF + 7 + rand() * 4),
      z: -12 - rand() * 36,
      s: 0.9 + rand() * 0.3,
      ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, // face the road
      v: 0,
    });
  }

  // Hand-painted truck parked on the shoulder, some chunks.
  if (rand() < 0.45) {
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

  // Milestone stone every chunk, alternating sides.
  items.push({
    type: "milestone",
    x: (n % 2 === 0 ? 1 : -1) * (ROAD_HALF + 0.8),
    z: -30,
    s: 1,
    ry: 0,
    v: 0,
  });

  return items;
}

const cache = new Map<number, PropItem[]>();

function fullProps(n: number): PropItem[] {
  let p = cache.get(n);
  if (!p) {
    p = buildProps(n);
    cache.set(n, p);
  }
  return p;
}

/**
 * Props for chunk n. Sparse LOD (far-ahead chunks) keeps only the major
 * landmarks — road surface + sparse majors (architecture.md §3).
 */
export function propsForChunk(n: number, lod: Lod): PropItem[] {
  const full = fullProps(n);
  if (lod === "full") return full;
  return full.filter((p) => p.type !== "tree" && p.type !== "rock");
}

/** Drop cached prop lists that left the live window. */
export function evictProps(keep: Set<number>) {
  for (const k of cache.keys()) {
    if (!keep.has(k)) cache.delete(k);
  }
}
