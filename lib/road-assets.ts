import * as THREE from "three";
import { ROAD_TILE_LENGTH } from "./road-constants";
import { getToonGradient } from "./toon-material";

const TEX_W = 256;
const TEX_H = 512;

let texture: THREE.CanvasTexture | null = null;
let material: THREE.MeshToonMaterial | null = null;

function makeRoadTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d")!;

  // 1. Warm sandy shoulder base
  g.fillStyle = "#b88952";
  g.fillRect(0, 0, TEX_W, TEX_H);

  // 2. Dark smooth tarmac asphalt
  const roadMargin = 16;
  g.fillStyle = "#26282b";
  g.fillRect(roadMargin, 0, TEX_W - roadMargin * 2, TEX_H);

  // Subtle tarmac asphalt grain & wear
  let seed = 456789;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < 40; i++) {
    const shade = 32 + Math.floor(rand() * 18);
    g.fillStyle = `rgb(${shade},${shade + 1},${shade + 3})`;
    g.fillRect(
      roadMargin + rand() * (TEX_W - roadMargin * 2 - 20),
      rand() * TEX_H,
      14 + rand() * 45,
      10 + rand() * 30
    );
  }

  // 3. Crisp solid white edge lines
  g.fillStyle = "#f0f0f0";
  g.fillRect(roadMargin + 4, 0, 8, TEX_H);
  g.fillRect(TEX_W - roadMargin - 12, 0, 8, TEX_H);

  // 4. Crisp bright white dashed centerline
  g.fillStyle = "#fbfbfb";
  const dashH = TEX_H * 0.38;
  const dashY = TEX_H * 0.12;
  g.fillRect(TEX_W / 2 - 4, dashY, 8, dashH);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function getRoadMaterial(): THREE.MeshToonMaterial {
  if (!material) {
    const map = typeof document !== "undefined" ? makeRoadTexture() : null;
    texture = map;
    material = new THREE.MeshToonMaterial({
      map: map ?? undefined,
      vertexColors: true,
      gradientMap: getToonGradient(),
    });
  }
  return material;
}
