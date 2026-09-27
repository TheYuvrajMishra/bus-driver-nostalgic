"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  getChunkGeometry,
  getChunkTerrainGeometry,
  getChunkGuardrailGeometry,
  getChunkWireGeometry,
} from "@/lib/road-generator";
import {
  getRoadMaterial,
  getTerrainMaterial,
  getGuardrailMaterial,
  getWireMaterial,
} from "@/lib/road-assets";

/**
 * One live road chunk:
 * 1. Road ribbon mesh (textured asphalt with painted markings).
 * 2. Seamless procedural terrain mesh (layered rocky bluffs & savanna).
 * 3. Continuous curve-following W-beam guardrail mesh with support posts.
 * 4. Continuous curve-following 3-wire catenary power lines.
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
  const guardrailGeometry = useMemo(() => getChunkGuardrailGeometry(n), [n]);
  const wireGeometry = useMemo(() => getChunkWireGeometry(n), [n]);

  const roadMaterial = useMemo(() => getRoadMaterial(), []);
  const terrainMaterial = useMemo(() => getTerrainMaterial(), []);
  const guardrailMaterial = useMemo(() => getGuardrailMaterial(), []);
  const wireMaterial = useMemo(() => getWireMaterial(), []);

  return (
    <group ref={groupRef}>
      <mesh geometry={roadGeometry} material={roadMaterial} />
      <mesh geometry={terrainGeometry} material={terrainMaterial} />
      <mesh geometry={guardrailGeometry} material={guardrailMaterial} />
      <mesh geometry={wireGeometry} material={wireMaterial} />
    </group>
  );
}
