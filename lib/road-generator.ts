import * as THREE from "three";
import { CHUNK_LENGTH } from "./drive-store";
import { ROAD_WIDTH, ROAD_TILE_LENGTH, CHUNK_SECTIONS } from "./road-constants";

/**
 * Seeded procedural road generation — architecture.md §3.
 *
 * Pure functions of the chunk index `n` (plus small caches): the same index
 * always yields the same road shape, and nothing about the whole route is
 * ever stored — only the live window exists as geometry.
 *
 * Heading uses a bounded sum-of-sines (deterministic, O(1), no drift):
 * the road winds gently but can never spiral or loop back on itself.
 */

/** Heading (radians) of the route at chunk boundary n. */
export function chunkHeading(n: number): number {
  return 0.55 * Math.sin(n * 0.31) + 0.25 * Math.sin(n * 0.113 + 1.7);
}

/** Heading change across chunk n. */
export function chunkTurn(n: number): number {
  return chunkHeading(n + 1) - chunkHeading(n);
}

/**
 * Rotate an (x, z) vector about +Y by angle a.
 * Matches three.js `rotation.y = a` convention.
 */
export function rotY(x: number, z: number, a: number): [number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c + z * s, -x * s + z * c];
}

const endLocalCache = new Map<number, [number, number]>();

/**
 * Chunk-local position of the chunk's far end, computed with the exact same
 * incremental walk the ribbon geometry uses — so consecutive chunks join
 * with no visible seam.
 */
export function chunkEndLocal(n: number): [number, number] {
  let e = endLocalCache.get(n);
  if (!e) {
    const turn = chunkTurn(n);
    const step = CHUNK_LENGTH / CHUNK_SECTIONS;
    let x = 0;
    let z = 0;
    let h = 0;
    for (let i = 0; i < CHUNK_SECTIONS; i++) {
      x += Math.sin(h) * step;
      z += -Math.cos(h) * step;
      h += turn / CHUNK_SECTIONS;
    }
    e = [x, z];
    endLocalCache.set(n, e);
  }
  return e;
}

const geomCache = new Map<number, THREE.BufferGeometry>();

export function getChunkGeometry(n: number): THREE.BufferGeometry {
  let g = geomCache.get(n);
  if (!g) {
    g = buildChunkGeometry(n);
    geomCache.set(n, g);
  }
  return g;
}

/** Dispose geometries that left the live window. */
export function evictChunkGeometry(keep: Set<number>) {
  for (const [k, g] of geomCache) {
    if (!keep.has(k)) {
      g.dispose();
      geomCache.delete(k);
      endLocalCache.delete(k);
    }
  }
}

function buildChunkGeometry(n: number): THREE.BufferGeometry {
  const turn = chunkTurn(n);
  const step = CHUNK_LENGTH / CHUNK_SECTIONS;
  const hw = ROAD_WIDTH / 2;
  // 5 vertices across: outer edges get a darker "curb" tint via vertex colors
  const across = [-hw, -hw + 0.6, 0, hw - 0.6, hw];
  const cols = across.length;

  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const asphalt: [number, number, number] = [0.24, 0.24, 0.25];
  const edge: [number, number, number] = [0.12, 0.12, 0.13];

  let x = 0;
  let z = 0;
  let h = 0;
  let dist = 0;

  for (let i = 0; i <= CHUNK_SECTIONS; i++) {
    const rx = Math.cos(h);
    const rz = Math.sin(h); // right vector for current heading
    for (let j = 0; j < cols; j++) {
      const o = across[j];
      positions.push(x + rx * o, 0, z + rz * o);
      uvs.push(j / (cols - 1), dist / ROAD_TILE_LENGTH);
      const c = j === 0 || j === cols - 1 ? edge : asphalt;
      colors.push(c[0], c[1], c[2]);
    }
    if (i < CHUNK_SECTIONS) {
      x += Math.sin(h) * step;
      z += -Math.cos(h) * step;
      h += turn / CHUNK_SECTIONS;
      dist += step;
    }
  }

  for (let i = 0; i < CHUNK_SECTIONS; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, b, c, b, d, c); // upward-facing winding
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
