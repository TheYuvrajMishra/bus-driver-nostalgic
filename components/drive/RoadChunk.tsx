"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { getChunkGeometry } from "@/lib/road-generator";
import { getRoadMaterial } from "@/lib/road-assets";

/**
 * One live road chunk: a ribbon mesh in the chunk's local frame
 * (starts at local origin, extends along -z with the chunk's curvature).
 * Placement into car-space happens in RoadChunkManager.
 */
export default function RoadChunk({
  n,
  groupRef,
}: {
  n: number;
  groupRef: (g: THREE.Group | null) => void;
}) {
  const geometry = useMemo(() => getChunkGeometry(n), [n]);
  const material = useMemo(() => getRoadMaterial(), []);
  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
}
