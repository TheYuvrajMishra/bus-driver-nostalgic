"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useDriveStore, CHUNK_LENGTH } from "@/lib/drive-store";
import {
  chunkHeading,
  chunkEndLocal,
  rotY,
  evictChunkGeometry,
} from "@/lib/road-generator";
import RoadChunk from "./RoadChunk";

const CHUNKS_BEHIND = 1;
const CHUNKS_AHEAD = 2;

/**
 * Spawn/despawn ring buffer — architecture.md §3.
 *
 * Live window: current chunk + 2 ahead + 1 behind (4 chunks). The camera
 * rig stays near the origin; each frame, chunks are re-placed in car-space
 * so the route point at distance `d` sits at the origin with heading 0:
 *   group.position = rotY(P[n] - P(d), h(d))
 *   group.rotation.y = h(d) - h[n]
 * This keeps float precision flat no matter how far you drive, and because
 * chunk n+1's origin is exactly chunk n's ribbon end (chunkEndLocal), there
 * are no visible seams.
 */
export default function RoadChunkManager() {
  const [live, setLive] = useState<number[]>(() => [-CHUNKS_BEHIND, 0, 1, CHUNKS_AHEAD]);
  const liveRef = useRef<number[]>([-CHUNKS_BEHIND, 0, 1, CHUNKS_AHEAD]);
  // Anchor: route position/heading at boundary `n`, walked forward as the car advances.
  const anchor = useRef({ n: 0, px: 0, pz: 0, h: chunkHeading(0) });
  const groups = useRef(new Map<number, THREE.Group>());

  useFrame(() => {
    const d = useDriveStore.getState().distanceTraveled;
    const cur = Math.floor(d / CHUNK_LENGTH);
    const A = anchor.current;

    // Advance the anchor to the oldest live boundary.
    const target = cur - CHUNKS_BEHIND;
    while (A.n < target) {
      const [ex, ez] = chunkEndLocal(A.n);
      const [wx, wz] = rotY(ex, ez, -A.h);
      A.px += wx;
      A.pz += wz;
      A.n += 1;
      A.h = chunkHeading(A.n);
    }

    // Route position P[m] and heading h[m] for any live boundary m.
    // Forward walk from the anchor when m >= anchor.n; exact backward walk
    // when m < anchor.n (only happens for the behind-chunk at session start,
    // since the car never reverses in v1).
    const posAt = (m: number): [number, number, number] => {
      let qx = A.px;
      let qz = A.pz;
      let qh = A.h;
      if (m >= A.n) {
        for (let k = A.n; k < m; k++) {
          const [ex, ez] = chunkEndLocal(k);
          const [wx, wz] = rotY(ex, ez, -qh);
          qx += wx;
          qz += wz;
          qh = chunkHeading(k + 1);
        }
      } else {
        for (let k = A.n - 1; k >= m; k--) {
          const hk = chunkHeading(k);
          const [ex, ez] = chunkEndLocal(k);
          const [wx, wz] = rotY(ex, ez, -hk);
          qx -= wx;
          qz -= wz;
          qh = hk;
        }
      }
      return [qx, qz, qh];
    };

    // h(d): heading at the car's distance; P(d): its route position.
    const t = (d - cur * CHUNK_LENGTH) / CHUNK_LENGTH;
    const [pcx, pcz, hc] = posAt(cur);
    const hNext = chunkHeading(cur + 1);
    const hd = hc + (hNext - hc) * t;
    const [ex, ez] = chunkEndLocal(cur);
    const [ox, oz] = rotY(ex * t, ez * t, -hc);
    const pdx = pcx + ox;
    const pdz = pcz + oz;

    // Spawn/despawn at chunk boundaries only (no per-frame React churn).
    const next = [cur - CHUNKS_BEHIND, cur, cur + 1, cur + CHUNKS_AHEAD];
    if (next[0] !== liveRef.current[0]) {
      liveRef.current = next;
      setLive(next);
      evictChunkGeometry(new Set(next));
    }

    // Place every live chunk in car-space.
    for (const n of liveRef.current) {
      const g = groups.current.get(n);
      if (!g) continue;
      const [qx, qz, qh] = posAt(n);
      const [cx, cz] = rotY(qx - pdx, qz - pdz, hd);
      g.position.set(cx, 0, cz);
      g.rotation.y = hd - qh;
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
