"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { getChunkGeometry, getChunkTerrainGeometry } from "@/lib/road-generator";
import { getRoadMaterial, getTerrainMaterial } from "@/lib/road-assets";

/**
 * One live road chunk:
 * 1. Road ribbon mesh (textured asphalt with painted markings).
 * 2. Seamless procedural terrain mesh (rolling desert dunes, roadside shoulders).
 *
 * Placement into car-space happens in RoadChunkManager.
 */
export default function RoadChunk({
  n,
  groupRef,
}: {
  n: number;
  groupRef: (g: THREE.Group | null) => void;
}) {
  const roadGeometry = useMemo(() => getChunkGeometry(n), [n]);
  const terrainGeometry = useMemo(() => getChunkTerrainGeometry(n), [n]);
  const roadMaterial = useMemo(() => getRoadMaterial(), []);
  const terrainMaterial = useMemo(() => getTerrainMaterial(), []);

  return (
    <group ref={groupRef}>
      <mesh geometry={roadGeometry} material={roadMaterial} />
      <mesh geometry={terrainGeometry} material={terrainMaterial} />
    </group>
  );
}
