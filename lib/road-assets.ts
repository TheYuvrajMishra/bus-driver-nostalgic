import * as THREE from "three";
import { ROAD_TILE_LENGTH } from "./road-constants";

const TEX_W = 128;
const TEX_H = 256;

/**
 * Shared road assets — one texture + one material for ALL chunks
 * (architecture.md §7: shared materials, minimal shader switches).
 *
 * The texture is created lazily on first client-side use because it needs
 * `document` (R3F scene children only render in the browser).
 */
let texture: THREE.CanvasTexture | null = null;
let material: THREE.MeshLambertMaterial | null = null;

function makeRoadTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d")!;

  g.fillStyle = "#3d3d3f";
  g.fillRect(0, 0, TEX_W, TEX_H);

  // worn patches / repair marks
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

  // dashed centre line (one dash per 24 m tile)
  g.fillStyle = "#d8b93a";
  g.fillRect(TEX_W / 2 - 3, TEX_H * 0.15, 6, TEX_H * 0.35);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function getRoadMaterial(): THREE.MeshLambertMaterial {
  if (!material) {
    const map = typeof document !== "undefined" ? makeRoadTexture() : null;
    texture = map;
    material = new THREE.MeshLambertMaterial({
      map: map ?? undefined,
      vertexColors: true,
    });
  }
  return material;
}
