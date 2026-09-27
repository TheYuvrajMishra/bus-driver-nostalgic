import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural prop assets for Indian Highway Drive:
 * 1. Spiky Desert Grass Tufts (Yucca / Dry Steppe Grass)
 * 2. Low-Poly Desert Boulders & Rock Formations
 * 3. Umbrella Acacia Trees with Tiered Low-Poly Canopies
 * 4. Roadside Indian Dhaba / Abandoned Brick House
 * 5. Electricity & Telegraph Transmission Poles
 * 6. NH Milestone Markers
 * 7. Roadside Reflectors
 */

function paint(
  geo: THREE.BufferGeometry,
  color: string,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0
): THREE.BufferGeometry {
  const g = geo.clone();
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

// ----------------------------------------------------
// 1. Spiky Desert Grass Clump (Yucca / Steppe Grass)
// ----------------------------------------------------
let grassGeo: THREE.BufferGeometry | null = null;

export function getGrassGeometry(): THREE.BufferGeometry {
  if (!grassGeo) {
    const parts: THREE.BufferGeometry[] = [];
    const bladeGeo = new THREE.ConeGeometry(0.12, 1.1, 4);
    const bladeColors = ["#7a8e48", "#8b9c45", "#627533", "#a69a4e", "#5a702b"];

    // Central upright blade
    parts.push(paint(bladeGeo, bladeColors[0], 0, 0.55, 0, 0.05, 0.2, 0));

    // Outer fanning blades
    const angles = [0, 0.9, 1.8, 2.7, 3.6, 4.5, 5.4];
    angles.forEach((ang, i) => {
      const tilt = 0.35 + (i % 3) * 0.12;
      const heightScale = 0.7 + (i % 4) * 0.15;
      const blade = bladeGeo.clone();
      blade.scale(heightScale, heightScale, heightScale);
      parts.push(
        paint(
          blade,
          bladeColors[i % bladeColors.length],
          Math.sin(ang) * 0.18,
          0.45 * heightScale,
          Math.cos(ang) * 0.18,
          Math.cos(ang) * tilt,
          ang,
          -Math.sin(ang) * tilt
        )
      );
    });

    bladeGeo.dispose();
    grassGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return grassGeo;
}

// ----------------------------------------------------
// 2. Low-Poly Desert Boulders & Multi-faceted Rocks
// ----------------------------------------------------
let rockGeo: THREE.BufferGeometry | null = null;

export function getRockGeometry(): THREE.BufferGeometry {
  if (!rockGeo) {
    const parts: THREE.BufferGeometry[] = [
      paint(new THREE.DodecahedronGeometry(1.2, 0), "#b4895c", 0, 0.75, 0, 0.2, 0.5, 0),
      paint(new THREE.DodecahedronGeometry(0.85, 0), "#8f643e", 0.9, 0.55, 0.4, -0.3, 0.8, 0.1),
      paint(new THREE.DodecahedronGeometry(0.7, 0), "#c4986b", -0.85, 0.45, -0.25, 0.4, -0.6, 0.2),
      paint(new THREE.DodecahedronGeometry(0.45, 0), "#7a5332", 0.2, 0.28, 1.0, 0.1, 0.3, -0.4),
    ];
    rockGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return rockGeo;
}

// ----------------------------------------------------
// 3. Low-Poly Desert Acacia Tree (Flat Umbrella Canopy)
// ----------------------------------------------------
let treeGeo: THREE.BufferGeometry | null = null;

export function getTreeGeometry(): THREE.BufferGeometry {
  if (!treeGeo) {
    const parts: THREE.BufferGeometry[] = [];

    // Trunk segments with angular branch splits
    const trunk1 = paint(new THREE.CylinderGeometry(0.24, 0.38, 2.4, 6), "#3a2214", 0, 1.2, 0);
    const trunk2 = paint(new THREE.CylinderGeometry(0.18, 0.24, 1.8, 5), "#3a2214", 0.35, 2.8, 0.15, 0.15, 0, 0.25);
    const trunk3 = paint(new THREE.CylinderGeometry(0.16, 0.22, 1.7, 5), "#3a2214", -0.4, 2.7, -0.2, -0.2, 0, -0.3);
    parts.push(trunk1, trunk2, trunk3);

    // Flat umbrella canopy tiers (faceted hexagonal low-poly discs)
    const canopyMain = paint(new THREE.CylinderGeometry(2.6, 2.9, 0.5, 8), "#355e2b", 0.1, 3.9, 0);
    const canopyTop = paint(new THREE.ConeGeometry(2.2, 0.4, 7), "#447837", 0.1, 4.3, 0);

    const canopySideL = paint(new THREE.CylinderGeometry(1.7, 1.9, 0.42, 7), "#2e5225", -1.3, 3.3, 0.35);
    const canopySideR = paint(new THREE.CylinderGeometry(1.5, 1.8, 0.38, 7), "#4a803c", 1.4, 3.4, -0.25);
    const highlight = paint(new THREE.ConeGeometry(1.3, 0.3, 6), "#5b944b", 0.2, 4.5, 0.1);

    parts.push(canopyMain, canopyTop, canopySideL, canopySideR, highlight);

    treeGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return treeGeo;
}

// ----------------------------------------------------
// 4. Roadside Dhaba / Abandoned Brick House
// ----------------------------------------------------
let dhabaGeo: THREE.BufferGeometry | null = null;

export function getDhabaGeometry(): THREE.BufferGeometry {
  if (!dhabaGeo) {
    const parts = [
      // Main brick structure
      paint(new THREE.BoxGeometry(4.8, 2.6, 3.4), "#d4b886", 0, 1.3, 0),
      // Overhanging sloped corrugated tin / terracotta roof
      paint(new THREE.BoxGeometry(5.4, 0.28, 4.2), "#a63d2b", 0, 2.72, 0.2, 0.08, 0, 0),
      // Rustic awning porch pillars
      paint(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 4), "#5c4028", -2.2, 1.1, 2.1),
      paint(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 4), "#5c4028", 2.2, 1.1, 2.1),
      paint(new THREE.BoxGeometry(4.8, 0.12, 1.8), "#7a3b2a", 0, 2.25, 1.4, 0.18, 0, 0), // awning sheet
      // Teal painted Dhaba sign board
      paint(new THREE.BoxGeometry(2.8, 0.8, 0.12), "#1f9aa8", 0, 2.15, 1.76),
      // Weathered wood door & shutter window
      paint(new THREE.BoxGeometry(1.1, 1.8, 0.1), "#4a3524", -1.2, 0.9, 1.72),
      paint(new THREE.BoxGeometry(0.9, 0.9, 0.1), "#36454f", 1.2, 1.4, 1.72),
      // Charpai cot & wooden crates outside
      paint(new THREE.BoxGeometry(2.0, 0.38, 1.0), "#c9a86a", 3.2, 0.38, 1.4),
      paint(new THREE.BoxGeometry(0.7, 0.7, 0.7), "#7a5a3a", 3.2, 0.35, -0.8),
    ];
    dhabaGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return dhabaGeo;
}

// ----------------------------------------------------
// 5. Roadside Electricity & Telegraph Pole
// ----------------------------------------------------
let poleGeo: THREE.BufferGeometry | null = null;

export function getPoleGeometry(): THREE.BufferGeometry {
  if (!poleGeo) {
    const parts = [
      // Main concrete / wooden pole
      paint(new THREE.CylinderGeometry(0.12, 0.18, 7.5, 6), "#66584c", 0, 3.75, 0),
      // Crossbar arms for power lines
      paint(new THREE.BoxGeometry(1.8, 0.12, 0.12), "#45382e", 0, 6.8, 0),
      paint(new THREE.BoxGeometry(1.4, 0.1, 0.1), "#45382e", 0, 5.9, 0),
      // Insulators (white ceramics)
      paint(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 4), "#e8e8e8", -0.8, 7.0, 0),
      paint(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 4), "#e8e8e8", 0.8, 7.0, 0),
      paint(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 4), "#e8e8e8", -0.6, 6.1, 0),
      paint(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 4), "#e8e8e8", 0.6, 6.1, 0),
      // Ground support block
      paint(new THREE.BoxGeometry(0.5, 0.4, 0.5), "#88827c", 0, 0.2, 0),
    ];
    poleGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return poleGeo;
}

// ----------------------------------------------------
// 6. Indian NH Kilometre Milestone Marker
// ----------------------------------------------------
let milestoneGeo: THREE.BufferGeometry | null = null;

export function getMilestoneGeometry(): THREE.BufferGeometry {
  if (!milestoneGeo) {
    const parts = [
      // White concrete base body
      paint(new THREE.BoxGeometry(0.48, 0.7, 0.36), "#f0f0eb", 0, 0.35, 0),
      // Rounded yellow cap (National Highway style)
      paint(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 10), "#e5a71c", 0, 0.7, 0, Math.PI / 2, 0, 0),
      // Black road marker band
      paint(new THREE.BoxGeometry(0.49, 0.08, 0.37), "#1a1a1a", 0, 0.48, 0),
    ];
    milestoneGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return milestoneGeo;
}

// ----------------------------------------------------
// 7. Roadside Cat-Eye Reflectors (Glowing at night)
// ----------------------------------------------------
let reflectorGeo: THREE.BufferGeometry | null = null;

export function getReflectorGeometry(): THREE.BufferGeometry {
  if (!reflectorGeo) {
    const parts = [
      paint(new THREE.BoxGeometry(0.18, 0.06, 0.14), "#e6e6e6", 0, 0.03, 0),
      paint(new THREE.BoxGeometry(0.06, 0.04, 0.15), "#ffaa00", 0, 0.035, 0),
    ];
    reflectorGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return reflectorGeo;
}

// ----------------------------------------------------
// 8. Low-Poly Hand-Painted Truck
// ----------------------------------------------------
let truckGeo: THREE.BufferGeometry | null = null;

export function getTruckGeometry(): THREE.BufferGeometry {
  if (!truckGeo) {
    const parts = [
      paint(new THREE.BoxGeometry(2.3, 0.35, 6.8), "#2a2b30", 0, 0.85, 0), // chassis
      paint(new THREE.BoxGeometry(2.45, 2.7, 4.8), "#e5a71c", 0, 2.35, -0.9), // container
      paint(new THREE.BoxGeometry(2.35, 2.1, 1.9), "#c43b2a", 0, 1.9, 2.5), // cab
      paint(new THREE.BoxGeometry(2.05, 0.75, 0.12), "#1a2530", 0, 2.3, 3.46), // windshield
      paint(new THREE.BoxGeometry(2.48, 0.5, 0.06), "#258038", 0, 1.5, -3.32), // tail-art stripe
      paint(new THREE.BoxGeometry(2.48, 0.28, 0.06), "#f0f0e8", 0, 2.65, -3.32), // top stripe
      paint(new THREE.BoxGeometry(2.35, 0.32, 0.25), "#4e4e55", 0, 0.85, 3.55), // bumper
    ];
    const wheel = new THREE.CylinderGeometry(0.48, 0.48, 0.34, 12);
    for (const [wx, wz] of [
      [-1.1, 2.5],
      [1.1, 2.5],
      [-1.1, -0.8],
      [1.1, -0.8],
      [-1.1, -2.4],
      [1.1, -2.4],
    ] as [number, number][]) {
      const w = wheel.clone();
      w.rotateZ(Math.PI / 2);
      parts.push(paint(w, "#1c1c1e", wx, 0.48, wz));
    }
    wheel.dispose();
    truckGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return truckGeo;
}

// ----------------------------------------------------
// 9. Soft Blob Shadow Texture
// ----------------------------------------------------
let blobTex: THREE.CanvasTexture | null = null;

export function getBlobShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (!blobTex) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, "rgba(0,0,0,0.48)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    blobTex = new THREE.CanvasTexture(c);
  }
  return blobTex;
}
