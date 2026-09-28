"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useDriveStore, CHUNK_LENGTH } from "@/lib/drive-store";
import {
  chunkHeading,
  chunkEndLocal,
  chunkLocalAt,
  rotY,
  evictChunkGeometry,
  roadElevationAtDistance,
} from "@/lib/road-generator";
import { driveWorld } from "@/lib/drive-world";
import { evictProps } from "@/lib/prop-placer";
import RoadChunk from "./RoadChunk";

const CHUNKS_BEHIND = 1;
const CHUNKS_AHEAD = 5;

function getChunkList(cur: number): number[] {
  const list: number[] = [];
  for (let i = cur - CHUNKS_BEHIND; i <= cur + CHUNKS_AHEAD; i++) {
    list.push(i);
  }
  return list;
}

/**
 * Spawn/despawn ring buffer with 3D elevation & heading.
 *
 * Extended live window: current chunk + 5 ahead + 1 behind (7 chunks total = 360m).
 * The camera rig stays near the origin; each frame, chunks are placed in car-space
 * so the route point at distance `d` sits at the origin with heading 0:
 *   group.position = [cx, cy, cz]
 *   group.rotation.y = h(d) - h[n]
 * This keeps float precision flat no matter how far you drive, and because
 * chunk n+1's origin is exactly chunk n's ribbon end (chunkEndLocal), there
 * are no visible seams in horizontal curvature or vertical elevation.
 */
export default function RoadChunkManager() {
  const [live, setLive] = useState<number[]>(() => getChunkList(0));
  const liveRef = useRef<number[]>(getChunkList(0));
  // Anchor: route position/heading at boundary `n`, walked forward as the car advances.
  const anchor = useRef({
    n: 0,
    px: 0,
    py: roadElevationAtDistance(0),
    pz: 0,
    h: chunkHeading(0),
  });
  const groups = useRef(new Map<number, THREE.Group>());

  useFrame(() => {
    const d = useDriveStore.getState().distanceTraveled;
    const cur = Math.floor(d / CHUNK_LENGTH);
    const A = anchor.current;

    // Advance the anchor to the oldest live boundary.
    const target = cur - CHUNKS_BEHIND;
    while (A.n < target) {
      const [ex, ey, ez] = chunkEndLocal(A.n);
      const [wx, wz] = rotY(ex, ez, -A.h);
      A.px += wx;
      A.py += ey;
      A.pz += wz;
      A.n += 1;
      A.h = chunkHeading(A.n);
    }

    // Route position P[m] and heading h[m] for any live boundary m.
    const posAt = (m: number): [number, number, number, number] => {
      let qx = A.px;
      let qy = A.py;
      let qz = A.pz;
      let qh = A.h;
      if (m >= A.n) {
        for (let k = A.n; k < m; k++) {
          const [ex, ey, ez] = chunkEndLocal(k);
          const [wx, wz] = rotY(ex, ez, -qh);
          qx += wx;
          qy += ey;
          qz += wz;
          qh = chunkHeading(k + 1);
        }
      } else {
        for (let k = A.n - 1; k >= m; k--) {
          const hk = chunkHeading(k);
          const [ex, ey, ez] = chunkEndLocal(k);
          const [wx, wz] = rotY(ex, ez, -hk);
          qx -= wx;
          qy -= ey;
          qz -= wz;
          qh = hk;
        }
      }
      return [qx, qy, qz, qh];
    };

    // Exact route position and heading at car distance d
    const t = (d - cur * CHUNK_LENGTH) / CHUNK_LENGTH;
    const [pcx, , pcz, hc] = posAt(cur);
    const [lx, lz, lh] = chunkLocalAt(cur, t);
    const [ox, oz] = rotY(lx, lz, -hc);
    const pdx = pcx + ox;
    const pdy = roadElevationAtDistance(d);
    const pdz = pcz + oz;
    const hd = hc + lh;

    // Spawn/despawn at chunk boundaries only (no per-frame React churn).
    const targetFirst = cur - CHUNKS_BEHIND;
    if (liveRef.current[0] !== targetFirst) {
      const next = getChunkList(cur);
      liveRef.current = next;
      setLive(next);
      evictChunkGeometry(new Set(next));
      evictProps(new Set(next));
    }

    // Publish the live world for PropInstances (module-level, no re-render).
    driveWorld.live = liveRef.current;
    driveWorld.cur = cur;

    // Place every live chunk in car-space with 3D elevation and yaw rotation.
    for (const n of liveRef.current) {
      const g = groups.current.get(n);
      if (!g) continue;
      const [qx, qy, qz, qh] = posAt(n);
      const [cx, cz] = rotY(qx - pdx, qz - pdz, hd);
      const cy = qy - pdy;
      const ry = hd - qh;
      g.position.set(cx, cy, cz);
      g.rotation.y = ry;
      driveWorld.transforms.set(n, { px: cx, py: cy, pz: cz, ry });
    }
  });

  return (
    <group>
      {live.map((n) => (
        <RoadChunk
          key={n}
          n={n}
          groupRef={(g) => {
            if (g) groups.current.set(n, g);
            else groups.current.delete(n);
          }}
        />
      ))}
    </group>
  );
}
