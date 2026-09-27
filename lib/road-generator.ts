import * as THREE from "three";
import { CHUNK_LENGTH } from "./drive-store";
import { ROAD_WIDTH, ROAD_TILE_LENGTH, CHUNK_SECTIONS } from "./road-constants";

/**
 * Seeded procedural road & terrain generation.
 *
 * Provides:
 * 1. Continuous procedural uphill/downhill elevation & slope for the highway.
 * 2. 2D Simplex Noise for natural desert dunes, rolling hills, and valleys.
 * 3. Seamless terrain generation that blends right up to the road shoulder,
 *    leaving the asphalt clear with zero clipping or floating.
 * 4. Ground height querying for exact prop & shadow placement on slopes.
 */

// -----------------------------------------------------------------------------
// 1. Fast 2D Simplex Noise Implementation (Deterministic, 0 Dependencies)
// -----------------------------------------------------------------------------
const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

const pTable = new Uint8Array([
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36,
  103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75,
  0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149,
  56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27,
  166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41,
  55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76,
  132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100,
  109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118,
  126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
  223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155,
  167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178,
  185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191,
  179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181,
  199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138,
  236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61,
  156, 180,
]);

const perm = new Uint8Array(512);
const permMod12 = new Uint8Array(512);
for (let i = 0; i < 512; i++) {
  perm[i] = pTable[i & 255];
  permMod12[i] = perm[i] % 12;
}

const grad3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

export function simplex2D(xin: number, yin: number): number {
  let n0 = 0;
  let n1 = 0;
  let n2 = 0;
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;

  let i1 = 0;
  let j1 = 0;
  if (x0 > y0) {
    i1 = 1;
    j1 = 0;
  } else {
    i1 = 0;
    j1 = 1;
  }

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1.0 + 2.0 * G2;
  const y2 = y0 - 1.0 + 2.0 * G2;

  const ii = i & 255;
  const jj = j & 255;
  const gi0 = permMod12[ii + perm[jj]];
  const gi1 = permMod12[ii + i1 + perm[jj + j1]];
  const gi2 = permMod12[ii + 1 + perm[jj + 1]];

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    t0 *= t0;
    n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    t1 *= t1;
    n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    t2 *= t2;
    n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
  }
  return 70.0 * (n0 + n1 + n2);
}

/** Multi-octave natural terrain noise for rolling desert dunes and hills. */
export function sampleNaturalTerrainNoise(wx: number, wz: number): number {
  // Octave 1: Vast rolling desert dunes & mountain ridges (scale ~240m, amp 16m)
  const n1 = simplex2D(wx * 0.0042, wz * 0.0042) * 15.0;
  // Octave 2: Secondary hills & road cuts (scale ~95m, amp 6.5m)
  const n2 = simplex2D(wx * 0.0105 + 1.7, wz * 0.0105 + 3.2) * 6.0;
  // Octave 3: Knoll & gully undulations (scale ~38m, amp 2.2m)
  const n3 = simplex2D(wx * 0.026 - 2.1, wz * 0.026 + 0.9) * 2.0;

  return n1 + n2 + n3;
}

// -----------------------------------------------------------------------------
// 2. Procedural Road Elevation & Heading
// -----------------------------------------------------------------------------

/**
 * Procedural continuous road elevation (uphill climbs, crests, downhill descents).
 * Smooth multi-frequency sine series — O(1), continuous derivative, no seams.
 */
export function roadElevationAtDistance(d: number): number {
  // Long rolling mountain passes (wavelength ~340m, amp 11m)
  const e1 = Math.sin(d * 0.0185) * 11.0;
  // Medium hill crests and dips (wavelength ~150m, amp 5m)
  const e2 = Math.sin(d * 0.042 + 1.2) * 4.6;
  // Gentle micro undulations (wavelength ~80m, amp 1.6m)
  const e3 = Math.sin(d * 0.078 + 2.5) * 1.5;
  // Regional elevation sweep (wavelength ~780m, amp 14m)
  const e4 = Math.sin(d * 0.008 + 0.4) * 13.5;

  return e1 + e2 + e3 + e4;
}

/** Analytical derivative (slope dy/dd) of road elevation for vehicle pitch. */
export function roadSlopeAtDistance(d: number): number {
  const de1 = 0.0185 * Math.cos(d * 0.0185) * 11.0;
  const de2 = 0.042 * Math.cos(d * 0.042 + 1.2) * 4.6;
  const de3 = 0.078 * Math.cos(d * 0.078 + 2.5) * 1.5;
  const de4 = 0.008 * Math.cos(d * 0.008 + 0.4) * 13.5;
  return de1 + de2 + de3 + de4;
}

/** Heading (radians) of the route at chunk boundary n. */
export function chunkHeading(n: number): number {
  return 0.55 * Math.sin(n * 0.31) + 0.25 * Math.sin(n * 0.113 + 1.7);
}

/** Heading change across chunk n. */
export function chunkTurn(n: number): number {
  return chunkHeading(n + 1) - chunkHeading(n);
}

/** Rotate an (x, z) vector about +Y by angle a. */
export function rotY(x: number, z: number, a: number): [number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c + z * s, -x * s + z * c];
}

// -----------------------------------------------------------------------------
// 3. World Anchors & Local End Positions
// -----------------------------------------------------------------------------

const endLocalCache = new Map<number, [number, number, number]>();

/**
 * Chunk-local position of chunk n's far end [ex, ey, ez].
 * Computed with the exact same walk the ribbon uses so chunks join with 0 seam.
 */
export function chunkEndLocal(n: number): [number, number, number] {
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
    const ey =
      roadElevationAtDistance((n + 1) * CHUNK_LENGTH) -
      roadElevationAtDistance(n * CHUNK_LENGTH);
    e = [x, ey, z];
    endLocalCache.set(n, e);
  }
  return e;
}

interface WorldAnchor {
  px: number;
  py: number;
  pz: number;
  h: number;
}
const anchorCache = new Map<number, WorldAnchor>();

/**
 * Deterministic world route position and heading at chunk boundary n.
 */
export function getChunkWorldAnchor(n: number): WorldAnchor {
  let a = anchorCache.get(n);
  if (a) return a;

  // Compute from 0 if not cached
  let px = 0;
  let pz = 0;
  let h = chunkHeading(0);

  if (n >= 0) {
    for (let k = 0; k < n; k++) {
      const [ex, , ez] = chunkEndLocal(k);
      const [wx, wz] = rotY(ex, ez, -h);
      px += wx;
      pz += wz;
      h = chunkHeading(k + 1);
    }
  } else {
    for (let k = -1; k >= n; k--) {
      const hk = chunkHeading(k);
      const [ex, , ez] = chunkEndLocal(k);
      const [wx, wz] = rotY(ex, ez, -hk);
      px -= wx;
      pz -= wz;
      h = hk;
    }
  }

  const py = roadElevationAtDistance(n * CHUNK_LENGTH);
  a = { px, py, pz, h };
  anchorCache.set(n, a);
  return a;
}

// -----------------------------------------------------------------------------
// 4. Terrain Blending & Ground Height Sampling
// -----------------------------------------------------------------------------

const ROAD_HALF = ROAD_WIDTH / 2; // 4.5m
const SHOULDER_WIDTH = 6.8; // gravel shoulder width from centerline (m)
const BLEND_END = 32.0; // distance from centerline where natural terrain is 100% (m)

/**
 * Blends the road elevation cleanly with the natural procedural terrain height.
 * - Under and at the road: matches road elevation (sub-centimetre asphalt lip).
 * - On shoulder: gentle ditch / gravel verge slope.
 * - Beyond shoulder: smooth Hermite blend into natural rolling desert dunes.
 */
export function getBlendedTerrainHeight(
  worldX: number,
  worldZ: number,
  lateralDist: number,
  roadY: number
): number {
  const absU = Math.abs(lateralDist);

  if (absU <= ROAD_HALF) {
    return roadY - 0.04;
  }
  if (absU <= SHOULDER_WIDTH) {
    const t = (absU - ROAD_HALF) / (SHOULDER_WIDTH - ROAD_HALF);
    return roadY - 0.04 - t * 0.12;
  }

  const t = Math.min(1.0, (absU - SHOULDER_WIDTH) / (BLEND_END - SHOULDER_WIDTH));
  const smoothT = t * t * (3 - 2 * t);
  const natH = sampleNaturalTerrainNoise(worldX, worldZ);
  const shoulderH = roadY - 0.16;

  return (1 - smoothT) * shoulderH + smoothT * natH;
}

/**
 * Exact local position [lx, lz, lh] along the chunk ribbon walk at fraction t.
 */
export function chunkLocalAt(n: number, t: number): [number, number, number] {
  const turn = chunkTurn(n);
  const totalSteps = CHUNK_SECTIONS;
  const targetStep = t * totalSteps;
  const fullSteps = Math.floor(targetStep);
  const frac = targetStep - fullSteps;
  const stepLen = CHUNK_LENGTH / CHUNK_SECTIONS;

  let x = 0;
  let z = 0;
  let h = 0;
  const dH = turn / CHUNK_SECTIONS;

  for (let i = 0; i < fullSteps; i++) {
    x += Math.sin(h) * stepLen;
    z += -Math.cos(h) * stepLen;
    h += dH;
  }

  if (frac > 0) {
    x += Math.sin(h) * (stepLen * frac);
    z += -Math.cos(h) * (stepLen * frac);
    h += dH * frac;
  }

  return [x, z, h];
}

/**
 * Sample exact ground height in chunk n's local coordinate frame for props & shadows.
 */
export function getTerrainHeightLocal(
  n: number,
  localX: number,
  localZ: number
): number {
  const A = getChunkWorldAnchor(n);
  const t = Math.max(0, Math.min(1, -localZ / CHUNK_LENGTH));
  const d = n * CHUNK_LENGTH + t * CHUNK_LENGTH;
  const roadY = roadElevationAtDistance(d);

  const [lx, lz, lh] = chunkLocalAt(n, t);
  const rx = Math.cos(lh);
  const rz = Math.sin(lh);

  const localPosX = lx + rx * localX;
  const localPosZ = lz + rz * localX;

  const [wx, wz] = rotY(localPosX, localPosZ, -A.h);
  const worldX = A.px + wx;
  const worldZ = A.pz + wz;

  const worldHeight = getBlendedTerrainHeight(worldX, worldZ, localX, roadY);
  return worldHeight - roadElevationAtDistance(n * CHUNK_LENGTH);
}

// -----------------------------------------------------------------------------
// 5. Geometry Generation & Caching
// -----------------------------------------------------------------------------

const roadGeomCache = new Map<number, THREE.BufferGeometry>();
const terrainGeomCache = new Map<number, THREE.BufferGeometry>();

export function getChunkGeometry(n: number): THREE.BufferGeometry {
  let g = roadGeomCache.get(n);
  if (!g) {
    g = buildChunkGeometry(n);
    roadGeomCache.set(n, g);
  }
  return g;
}

export function getChunkTerrainGeometry(n: number): THREE.BufferGeometry {
  let g = terrainGeomCache.get(n);
  if (!g) {
    g = buildChunkTerrainGeometry(n);
    terrainGeomCache.set(n, g);
  }
  return g;
}

/** Dispose geometries that left the live window. */
export function evictChunkGeometry(keep: Set<number>) {
  for (const [k, g] of roadGeomCache) {
    if (!keep.has(k)) {
      g.dispose();
      roadGeomCache.delete(k);
    }
  }
  for (const [k, g] of terrainGeomCache) {
    if (!keep.has(k)) {
      g.dispose();
      terrainGeomCache.delete(k);
    }
  }
  for (const k of endLocalCache.keys()) {
    if (!keep.has(k)) {
      endLocalCache.delete(k);
    }
  }
}

/** Build the 3D ribbon road mesh for chunk n. */
function buildChunkGeometry(n: number): THREE.BufferGeometry {
  const turn = chunkTurn(n);
  const step = CHUNK_LENGTH / CHUNK_SECTIONS;
  const hw = ROAD_HALF;
  const across = [-hw, -hw + 0.6, 0, hw - 0.6, hw];
  const cols = across.length;

  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const asphalt: [number, number, number] = [0.95, 0.95, 0.97];
  const edge: [number, number, number] = [0.5, 0.5, 0.53];

  const baseY = roadElevationAtDistance(n * CHUNK_LENGTH);

  let x = 0;
  let z = 0;
  let h = 0;
  let dist = 0;

  for (let i = 0; i <= CHUNK_SECTIONS; i++) {
    const rx = Math.cos(h);
    const rz = Math.sin(h);
    const currentDist = n * CHUNK_LENGTH + dist;
    const y = roadElevationAtDistance(currentDist) - baseY + 0.04; // 4cm asphalt lip

    for (let j = 0; j < cols; j++) {
      const o = across[j];
      positions.push(x + rx * o, y, z + rz * o);
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
      indices.push(a, b, c, b, d, c);
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

/** Lateral column offsets for procedural chunk terrain (18 columns, 480m total width). */
const TERRAIN_COLS = [
  -240, -160, -100, -60, -36, -20, -11, -7.0, -4.5, 4.5, 7.0, 11, 20, 36, 60,
  100, 160, 240,
];

/** Build the seamless 3D procedural terrain mesh for chunk n. */
function buildChunkTerrainGeometry(n: number): THREE.BufferGeometry {
  const turn = chunkTurn(n);
  const step = CHUNK_LENGTH / CHUNK_SECTIONS;
  const cols = TERRAIN_COLS.length;
  const A = getChunkWorldAnchor(n);
  const baseY = roadElevationAtDistance(n * CHUNK_LENGTH);

  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  let x = 0;
  let z = 0;
  let h = 0;
  let dist = 0;

  for (let i = 0; i <= CHUNK_SECTIONS; i++) {
    const rxLocal = Math.cos(h);
    const rzLocal = Math.sin(h);

    const worldAngle = A.h + h;
    const rxWorld = Math.cos(worldAngle);
    const rzWorld = Math.sin(worldAngle);

    const currentDist = n * CHUNK_LENGTH + dist;
    const roadY = roadElevationAtDistance(currentDist);

    // World centerline position at this cross-section
    const [wxCenter, wzCenter] = rotY(x, z, -A.h);
    const worldCenterX = A.px + wxCenter;
    const worldCenterZ = A.pz + wzCenter;

    for (let j = 0; j < cols; j++) {
      const u = TERRAIN_COLS[j];
      const vx = x + rxLocal * u;
      const vz = z + rzLocal * u;

      const worldX = worldCenterX + rxWorld * u;
      const worldZ = worldCenterZ + rzWorld * u;

      const worldHeight = getBlendedTerrainHeight(worldX, worldZ, u, roadY);
      const localY = worldHeight - baseY;

      positions.push(vx, localY, vz);
      uvs.push(j / (cols - 1), dist / ROAD_TILE_LENGTH);

      // Vertex color blending based on roadside proximity and dune elevation
      const absU = Math.abs(u);
      if (absU <= 7.0) {
        // Roadside gravel shoulder
        colors.push(0.66, 0.59, 0.49);
      } else {
        const heightRel = worldHeight - roadY;
        if (heightRel > 7.0) {
          // Sunlit dune crest / high ridge
          colors.push(0.87, 0.81, 0.7);
        } else if (heightRel < -5.0) {
          // Deep gully / shaded valley
          colors.push(0.55, 0.48, 0.39);
        } else {
          // Rolling desert sand
          const factor = (heightRel + 5.0) / 12.0;
          colors.push(
            0.55 + factor * 0.32,
            0.48 + factor * 0.33,
            0.39 + factor * 0.31
          );
        }
      }
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
      indices.push(a, b, c, b, d, c);
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
