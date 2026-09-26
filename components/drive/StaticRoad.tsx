"use client";

import { useMemo } from "react";
import * as THREE from "three";

const TEX_W = 128;
const TEX_H = 256;

/**
 * Procedurally drawn flat road texture (canvas → CanvasTexture).
 * Asphalt with worn patches, solid edge lines and a dashed centre line.
 * Tiled along the road length; drawn once and reused (no per-frame cost).
 */
function makeRoadTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d")!;

  // asphalt base
  g.fillStyle = "#3d3d3f";
  g.fillRect(0, 0, TEX_W, TEX_H);

  // worn patches / repairs for character
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < 26; i++) {
    const shade = 52 + Math.floor(rand() * 22);
    g.fillStyle = `rgb(${shade},${shade},${shade + 3})`;
    g.fillRect(rand() * TEX_W, rand() * TEX_H, 12 + rand() * 40, 8 + rand() * 26);
  }

  // edge lines
  g.fillStyle = "#cfcfcf";
  g.fillRect(4, 0, 5, TEX_H);
  g.fillRect(TEX_W - 9, 0, 5, TEX_H);

  // dashed centre line (one dash per tile)
  g.fillStyle = "#d8b93a";
  g.fillRect(TEX_W / 2 - 3, TEX_H * 0.15, 6, TEX_H * 0.35);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Tile length in metres: one texture tile = 24 m of road. */
export const ROAD_TILE_LENGTH = 24;

/**
 * Step-2 static road: a single flat-textured plane. Replaced by the chunked
 * procedural system in step 4.
 */
export default function StaticRoad({ length = 1400 }: { length?: number }) {
  const texture = useMemo(() => {
    const t = makeRoadTexture();
    t.repeat.set(1, length / ROAD_TILE_LENGTH);
    return t;
  }, [length]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -length / 2 + 20]}>
      <planeGeometry args={[9, length]} />
      <meshLambertMaterial map={texture} />
    </mesh>
  );
}
