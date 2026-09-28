import * as THREE from "three";
import { CHUNK_LENGTH } from "./drive-store";
import { ROAD_WIDTH, ROAD_TILE_LENGTH, CHUNK_SECTIONS } from "./road-constants";

/**
 * Seeded procedural road & rocky terrain generation.
 *
 * Provides:
 * 1. Continuous procedural uphill/downhill elevation & slope for the highway.
 * 2. Asymmetric low-poly rocky terrain:
 *    - Left side: prominent tiered rocky hills & bluffs in warm tan/orange tones with visible faceted rock detail close to the road.
 *    - Right side: warm rolling savanna plains with rocky knolls and plateaus.
 * 3. Seamless terrain blending right up to the road shoulder.
 * 4. Ground height querying for exact prop, tree, and guardrail placement.
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

/** Multi-octave faceted rocky terrain noise for layered hills & cliffs. */
export function sampleRockyHillNoise(wx: number, wz: number): number {
  // Octave 1: Major rocky hill massifs (scale ~180m, amp 16m)
  const n1 = simplex2D(wx * 0.0055, wz * 0.0055) * 15.0;
  // Octave 2: Rocky ridges & escarpments (scale ~75m, amp 7m)
  const n2 = simplex2D(wx * 0.0135 + 2.4, wz * 0.0135 + 1.1) * 6.5;
  // Octave 3: Faceted rock strata & terraces (quantized stepped look)
  const raw3 = simplex2D(wx * 0.032 - 1.5, wz * 0.032 + 3.8);
  const n3 = (Math.floor(raw3 * 3.0) / 3.0) * 3.2;

  return n1 + n2 + n3;
}

/** Rolling savanna plains noise for the right side of the highway. */
export function sampleSavannaNoise(wx: number, wz: number): number {
  const n1 = simplex2D(wx * 0.0042, wz * 0.0042) * 8.5;
  const n2 = simplex2D(wx * 0.011 + 3.1, wz * 0.011 + 2.4) * 3.8;
  const n3 = simplex2D(wx * 0.028 - 0.8, wz * 0.028 + 1.7) * 1.5;
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
  const e1 = Math.sin(d * 0.0185) * 11.0;
  const e2 = Math.sin(d * 0.042 + 1.2) * 4.6;
  const e3 = Math.sin(d * 0.078 + 2.5) * 1.5;
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

export function getChunkWorldAnchor(n: number): WorldAnchor {
  let a = anchorCache.get(n);
  if (a) return a;

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
const BLEND_END = 30.0; // distance from centerline where natural terrain is 100% (m)

/**
 * Blends the road elevation cleanly with the layered rocky hills & savanna plains.
 * - Under and at the road: matches road elevation (sub-centimetre asphalt lip).
 * - On shoulder: gentle ditch / gravel verge slope.
 * - Left side (u < -6.8m): Sharp rocky cliff / layered hill rise (matching reference).
 * - Right side (u > 6.8m): Rolling savanna plain with rocky knolls.
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
  const shoulderH = roadY - 0.16;

  let natH = 0;
  if (lateralDist < 0) {
    // Left side: Steep tiered rocky bluffs & hills rising right beside the road
    const dLeft = Math.abs(lateralDist) - SHOULDER_WIDTH;
    const bluffBase = Math.pow(Math.min(1.0, dLeft / 26.0), 0.65) * 13.5;
    const rockyNoise = sampleRockyHillNoise(worldX, worldZ);
    natH = roadY + bluffBase + rockyNoise * 0.85;
  } else {
    // Right side: Warm rolling savanna terrain
    const dRight = lateralDist - SHOULDER_WIDTH;
    const savannaBase = Math.pow(Math.min(1.0, dRight / 40.0), 1.1) * 3.5;
    const savannaNoise = sampleSavannaNoise(worldX, worldZ);
    natH = roadY + savannaBase + savannaNoise * 0.75;
  }

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
const guardrailGeomCache = new Map<number, THREE.BufferGeometry>();
const wireGeomCache = new Map<number, THREE.BufferGeometry>();

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

export function getChunkGuardrailGeometry(n: number): THREE.BufferGeometry {
  let g = guardrailGeomCache.get(n);
  if (!g) {
    g = buildChunkGuardrailGeometry(n);
    guardrailGeomCache.set(n, g);
  }
  return g;
}

export function getChunkWireGeometry(n: number): THREE.BufferGeometry {
  let g = wireGeomCache.get(n);
  if (!g) {
    g = buildChunkWireGeometry(n);
    wireGeomCache.set(n, g);
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
  for (const [k, g] of guardrailGeomCache) {
    if (!keep.has(k)) {
      g.dispose();
      guardrailGeomCache.delete(k);
    }
  }
  for (const [k, g] of wireGeomCache) {
    if (!keep.has(k)) {
      g.dispose();
      wireGeomCache.delete(k);
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
    const y = roadElevationAtDistance(currentDist) - baseY + 0.04;

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

/** Lateral column offsets for procedural chunk terrain (22 columns, dense roadside sampling). */
const TERRAIN_COLS = [
  -260, -180, -120, -80, -50, -32, -20, -14, -9.5, -7.0, -4.5, 4.5, 7.0, 9.5, 14,
  20, 32, 50, 80, 120, 180, 260,
];

/** Build the seamless 3D procedural rocky terrain mesh for chunk n. */
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

      const absU = Math.abs(u);
      if (absU <= 7.0) {
        // Roadside light brown gravel shoulder (less yellow)
        colors.push(0.79, 0.63, 0.42); // #c9a06b
      } else if (u < -7.0) {
        // Left side: Light brown faceted rock cliff & hill palette
        const heightRel = worldHeight - roadY;
        if (heightRel > 8.0) {
          // Sunlit rock ledge / ridge crest (soft light tan)
          colors.push(0.85, 0.66, 0.43); // #d9a86e
        } else if (heightRel > 3.0) {
          // Steep faceted rock face (muted brown-tan)
          colors.push(0.75, 0.54, 0.31); // #c08a4f
        } else {
          // Crevices & shaded rock base (deep brown umber)
          colors.push(0.54, 0.35, 0.20); // #8a5933
        }
      } else {
        // Right side: Light yellow-brown rolling plain
        const heightRel = worldHeight - roadY;
        if (heightRel > 4.5) {
          // Sunlit knoll (light warm brown)
          colors.push(0.83, 0.69, 0.47); // #d4b078
        } else if (heightRel < -2.0) {
          // Shaded dip (deeper brown)
          colors.push(0.60, 0.44, 0.27); // #997044
        } else {
          // Rolling light brown earth
          colors.push(0.77, 0.60, 0.38); // #c49961
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

/**
 * Build seamless, curve-following 3D guardrail geometry along the right shoulder for chunk n.
 * Follows every turn, crest, and dip with zero gaps between chunks.
 */
function buildChunkGuardrailGeometry(n: number): THREE.BufferGeometry {
  const turn = chunkTurn(n);
  const step = CHUNK_LENGTH / CHUNK_SECTIONS;
  const A = getChunkWorldAnchor(n);
  const baseY = roadElevationAtDistance(n * CHUNK_LENGTH);
  const railU = ROAD_HALF + 1.25; // 5.75m from centerline

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const colTop: [number, number, number] = [0.74, 0.79, 0.84]; // #bdc9d6
  const colMid: [number, number, number] = [0.46, 0.51, 0.56]; // #75818d
  const colBot: [number, number, number] = [0.62, 0.67, 0.72]; // #9eaab6

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

    const [wxCenter, wzCenter] = rotY(x, z, -A.h);
    const worldCenterX = A.px + wxCenter;
    const worldCenterZ = A.pz + wzCenter;

    const gx = x + rxLocal * railU;
    const gz = z + rzLocal * railU;

    const worldX = worldCenterX + rxWorld * railU;
    const worldZ = worldCenterZ + rzWorld * railU;

    const groundH = getBlendedTerrainHeight(worldX, worldZ, railU, roadY);
    const gy = groundH - baseY;

    // 0: Top lip (sunlit bevel)
    positions.push(gx, gy + 0.74, gz);
    colors.push(...colTop);

    // 1: Center crease (shaded crease indented slightly inward)
    positions.push(gx - rxLocal * 0.08, gy + 0.58, gz - rzLocal * 0.08);
    colors.push(...colMid);

    // 2: Bottom lip
    positions.push(gx, gy + 0.44, gz);
    colors.push(...colBot);

    if (i < CHUNK_SECTIONS) {
      x += Math.sin(h) * step;
      z += -Math.cos(h) * step;
      h += turn / CHUNK_SECTIONS;
      dist += step;
    }
  }

  // Indices for rail ribbon
  for (let i = 0; i < CHUNK_SECTIONS; i++) {
    const i0 = i * 3;
    const i1 = i0 + 1;
    const i2 = i0 + 2;

    const n0 = (i + 1) * 3;
    const n1 = n0 + 1;
    const n2 = n0 + 2;

    indices.push(i0, n0, i1);
    indices.push(n0, n1, i1);

    indices.push(i1, n1, i2);
    indices.push(n1, n2, i2);
  }

  // Vertical support posts every 2 steps (~3m)
  const colPost: [number, number, number] = [0.38, 0.42, 0.46]; // #616b75
  let vertOffset = (CHUNK_SECTIONS + 1) * 3;

  for (let i = 0; i <= CHUNK_SECTIONS; i += 2) {
    const t = i / CHUNK_SECTIONS;
    const [lx, lz, lh] = chunkLocalAt(n, t);
    const rx = Math.cos(lh);
    const rz = Math.sin(lh);

    const currentDist = n * CHUNK_LENGTH + t * CHUNK_LENGTH;
    const roadY = roadElevationAtDistance(currentDist);

    const [wxCenter, wzCenter] = rotY(lx, lz, -A.h);
    const worldX = A.px + wxCenter + Math.cos(A.h + lh) * railU;
    const worldZ = A.pz + wzCenter + Math.sin(A.h + lh) * railU;

    const groundH = getBlendedTerrainHeight(worldX, worldZ, railU, roadY);
    const gy = groundH - baseY;

    const px = lx + rx * (railU - 0.04);
    const pz = lz + rz * (railU - 0.04);
    const pw = 0.06;

    // Front post face quad
    positions.push(px - rz * pw, gy, pz + rx * pw);
    colors.push(...colPost);

    positions.push(px + rz * pw, gy, pz - rx * pw);
    colors.push(...colPost);

    positions.push(px + rz * pw, gy + 0.74, pz - rx * pw);
    colors.push(...colPost);

    positions.push(px - rz * pw, gy + 0.74, pz + rx * pw);
    colors.push(...colPost);

    indices.push(vertOffset, vertOffset + 1, vertOffset + 2);
    indices.push(vertOffset, vertOffset + 2, vertOffset + 3);
    vertOffset += 4;
  }

  // Yellow chevron curve warning sign on post at center of chunk for sharp turns or alternate chunks
  if (Math.abs(turn) > 0.06 || n % 3 === 0) {
    const t = 0.5;
    const [lx, lz, lh] = chunkLocalAt(n, t);
    const rx = Math.cos(lh);
    const rz = Math.sin(lh);

    const currentDist = n * CHUNK_LENGTH + t * CHUNK_LENGTH;
    const roadY = roadElevationAtDistance(currentDist);

    const [wxCenter, wzCenter] = rotY(lx, lz, -A.h);
    const worldX = A.px + wxCenter + Math.cos(A.h + lh) * railU;
    const worldZ = A.pz + wzCenter + Math.sin(A.h + lh) * railU;

    const groundH = getBlendedTerrainHeight(worldX, worldZ, railU, roadY);
    const gy = groundH - baseY;

    const sx = lx + rx * (railU + 0.05);
    const sz = lz + rz * (railU + 0.05);
    const sw = 0.55;
    const colYellow: [number, number, number] = [0.96, 0.68, 0.0];

    positions.push(sx - rz * sw, gy + 0.85, sz + rx * sw);
    colors.push(...colYellow);

    positions.push(sx + rz * sw, gy + 0.85, sz - rx * sw);
    colors.push(...colYellow);

    positions.push(sx + rz * sw, gy + 1.85, sz - rx * sw);
    colors.push(...colYellow);

    positions.push(sx - rz * sw, gy + 1.85, sz + rx * sw);
    colors.push(...colYellow);

    indices.push(vertOffset, vertOffset + 1, vertOffset + 2);
    indices.push(vertOffset, vertOffset + 2, vertOffset + 3);
    vertOffset += 4;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/**
 * Build seamless, continuous 3D wire geometry along the left telephone pole line.
 * Flows unbroken through all road curves, hills, and dips from chunk to chunk.
 */
function buildChunkWireGeometry(n: number): THREE.BufferGeometry {
  const A = getChunkWorldAnchor(n);
  const baseY = roadElevationAtDistance(n * CHUNK_LENGTH);
  const wireU = -(ROAD_HALF + 2.8); // -7.3m from centerline

  const positions: number[] = [];
  const indices: number[] = [];

  const WIRE_SECTIONS = 30; // High resolution spline curve
  const rw = 0.02; // ribbon half-width for visibility

  let vertCount = 0;

  for (let i = 0; i <= WIRE_SECTIONS; i++) {
    const t = i / WIRE_SECTIONS;
    const distInChunk = t * CHUNK_LENGTH;
    const [lx, lz, lh] = chunkLocalAt(n, t);
    const rx = Math.cos(lh);
    const rz = Math.sin(lh);

    // Catenary sag across 20m pole spans (poles at 10m, 30m, 50m)
    let spanFrac: number;
    if (distInChunk < 10) {
      spanFrac = (distInChunk + 10) / 20.0;
    } else if (distInChunk < 30) {
      spanFrac = (distInChunk - 10) / 20.0;
    } else if (distInChunk < 50) {
      spanFrac = (distInChunk - 30) / 20.0;
    } else {
      spanFrac = (distInChunk - 50) / 20.0;
    }
    const sag = -4.0 * 0.45 * spanFrac * (1.0 - spanFrac);

    const currentDist = n * CHUNK_LENGTH + distInChunk;
    const roadY = roadElevationAtDistance(currentDist);

    const [wxCenter, wzCenter] = rotY(lx, lz, -A.h);
    const worldX = A.px + wxCenter + Math.cos(A.h + lh) * wireU;
    const worldZ = A.pz + wzCenter + Math.sin(A.h + lh) * wireU;

    const groundH = getBlendedTerrainHeight(worldX, worldZ, wireU, roadY);
    const gy = groundH - baseY;

    // 3 Wires matching exact pole insulator positions: Left top (-0.98m, 7.7m), Right top (+0.98m, 7.7m), Center lower (+0.68m, 6.7m)
    const wireOffsets = [
      { uOff: -0.98, yOff: 7.7 },
      { uOff: 0.98, yOff: 7.7 },
      { uOff: 0.68, yOff: 6.7 },
    ];

    for (const w of wireOffsets) {
      const cx = lx + rx * (wireU + w.uOff);
      const cy = gy + w.yOff + sag;
      const cz = lz + rz * (wireU + w.uOff);

      // Ribbon cross vertices
      positions.push(cx - rz * rw, cy, cz + rx * rw);
      positions.push(cx + rz * rw, cy, cz - rx * rw);
    }
  }

  // Connect quad strips for all 3 wires
  for (let i = 0; i < WIRE_SECTIONS; i++) {
    for (let w = 0; w < 3; w++) {
      const baseI = i * 6 + w * 2;
      const nextI = (i + 1) * 6 + w * 2;

      indices.push(baseI, nextI, baseI + 1);
      indices.push(nextI, nextI + 1, baseI + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

