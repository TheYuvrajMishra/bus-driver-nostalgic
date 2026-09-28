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
let terrainTexture: THREE.CanvasTexture | null = null;

function makeTerrainTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;

  // Neutral light base (multiplies with vertex colors)
  g.fillStyle = "#f2ede4";
  g.fillRect(0, 0, S, S);

  let seed = 987654321;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  // Soft large blotches (soil variation)
  for (let i = 0; i < 40; i++) {
    const r = 12 + rand() * 30;
    const shade = 225 + Math.floor(rand() * 25);
    g.fillStyle = `rgba(${shade},${shade - 8},${shade - 20},0.35)`;
    g.beginPath();
    g.arc(rand() * S, rand() * S, r, 0, Math.PI * 2);
    g.fill();
  }

  // Fine grain speckle (earth texture)
  for (let i = 0; i < 2200; i++) {
    const v = 200 + Math.floor(rand() * 55);
    const dark = rand() < 0.4;
    const tone = dark ? v - 40 : v;
    g.fillStyle = `rgb(${tone},${tone - 6},${tone - 14})`;
    const sz = 1 + rand() * 2.2;
    g.fillRect(rand() * S, rand() * S, sz, sz);
  }

  // Sparse tiny pebbles / dry grass flecks
  for (let i = 0; i < 130; i++) {
    const warm = rand() < 0.5;
    g.fillStyle = warm ? "rgba(160,128,88,0.5)" : "rgba(120,110,84,0.45)";
    g.fillRect(rand() * S, rand() * S, 2 + rand() * 3, 1 + rand() * 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function getTerrainMaterial(): THREE.MeshLambertMaterial {
  if (!terrainMaterial) {
    const map = typeof document !== "undefined" ? makeTerrainTexture() : null;
    terrainTexture = map;
    terrainMaterial = new THREE.MeshLambertMaterial({
      map: map ?? undefined,
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

