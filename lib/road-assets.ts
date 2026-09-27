import * as THREE from "three";
import { getToonGradient } from "./toon-material";

const TEX_W = 512;
const TEX_H = 1024;

let texture: THREE.CanvasTexture | null = null;
let material: THREE.MeshToonMaterial | null = null;

function makeRoadTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d")!;

  // 1. Warm sandy shoulder base
  g.fillStyle = "#a87a4a";
  g.fillRect(0, 0, TEX_W, TEX_H);

  // 2. High-quality dark tarmac asphalt
  const roadMargin = 32;
  const roadWidth = TEX_W - roadMargin * 2;
  g.fillStyle = "#1e2024";
  g.fillRect(roadMargin, 0, roadWidth, TEX_H);

  // Subtle aggregate grain & asphalt tire wear
  let seed = 456789;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  // Fine speckle grain
  for (let i = 0; i < 300; i++) {
    const shade = 28 + Math.floor(rand() * 22);
    g.fillStyle = `rgb(${shade},${shade + 1},${shade + 3})`;
    g.fillRect(
      roadMargin + rand() * (roadWidth - 8),
      rand() * TEX_H,
      4 + rand() * 12,
      3 + rand() * 8
    );
  }

  // 3. Crisp solid white edge lines with soft outer border
  g.fillStyle = "#e8e8e8";
  g.fillRect(roadMargin + 8, 0, 14, TEX_H);
  g.fillRect(TEX_W - roadMargin - 22, 0, 14, TEX_H);

  // 4. Clean white dashed centerline
  g.fillStyle = "#ffffff";
  const dashH = TEX_H * 0.38;
  const dashY = TEX_H * 0.12;
  g.fillRect(TEX_W / 2 - 7, dashY, 14, dashH);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
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

let terrainMaterial: THREE.MeshLambertMaterial | null = null;

export function getTerrainMaterial(): THREE.MeshLambertMaterial {
  if (!terrainMaterial) {
    terrainMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });
  }
  return terrainMaterial;
}

let guardrailMaterial: THREE.MeshLambertMaterial | null = null;

export function getGuardrailMaterial(): THREE.MeshLambertMaterial {
  if (!guardrailMaterial) {
    guardrailMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });
  }
  return guardrailMaterial;
}

let wireMaterial: THREE.MeshBasicMaterial | null = null;

export function getWireMaterial(): THREE.MeshBasicMaterial {
  if (!wireMaterial) {
    wireMaterial = new THREE.MeshBasicMaterial({
      color: "#181b1e",
    });
  }
  return wireMaterial;
}

