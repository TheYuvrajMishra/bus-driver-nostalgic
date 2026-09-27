import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural prop assets — desert acacia trees, desert boulders, dhabas, trucks, milestones.
 * Everything is built once and shared (one InstancedMesh per prop type).
 */

function paint(
  geo: THREE.BufferGeometry,
  color: string,
  x = 0,
  y = 0,
  z = 0,
  ry = 0
): THREE.BufferGeometry {
  const g = geo.clone();
  if (ry) g.rotateY(ry);
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

let treeGeo: THREE.BufferGeometry | null = null;

/**
 * 3D Low-poly Desert Acacia Tree:
 * Flat-topped multi-tiered umbrella canopy with twisted dark-wood trunk.
 */
export function getTreeGeometry(): THREE.BufferGeometry {
  if (!treeGeo) {
    const parts: THREE.BufferGeometry[] = [];
    
    // Trunk: lower, middle, upper angled branches
    const trunk1 = paint(new THREE.CylinderGeometry(0.22, 0.35, 2.2, 6), "#422817", 0, 1.1, 0);
    const trunk2 = paint(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 5), "#422817", 0.3, 2.7, 0.1, 0.2);
    const trunk3 = paint(new THREE.CylinderGeometry(0.14, 0.2, 1.5, 5), "#422817", -0.35, 2.6, -0.15, -0.25);
    parts.push(trunk1, trunk2, trunk3);

    // Flat umbrella canopy tiers (low-poly discs/cylinders with bevels)
    // Tier 1: Main top canopy (wide flat umbrella)
    const canopyMain = paint(new THREE.CylinderGeometry(2.4, 2.7, 0.45, 8), "#3d6e32", 0.1, 3.8, 0);
    const canopyTop = paint(new THREE.ConeGeometry(2.0, 0.35, 7), "#487d3a", 0.1, 4.15, 0);
    
    // Tier 2: Mid-level side shelf
    const canopySideL = paint(new THREE.CylinderGeometry(1.6, 1.8, 0.38, 7), "#335e29", -1.2, 3.2, 0.3);
    const canopySideR = paint(new THREE.CylinderGeometry(1.4, 1.7, 0.35, 7), "#4b823e", 1.3, 3.3, -0.2);
    
    // Tier 3: Highlights
    const highlight1 = paint(new THREE.ConeGeometry(1.2, 0.25, 6), "#5b944b", 0.2, 4.35, 0.1);
    
    parts.push(canopyMain, canopyTop, canopySideL, canopySideR, highlight1);

    treeGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return treeGeo;
}

let rockGeo: THREE.BufferGeometry | null = null;

/** Low-poly roadside desert boulder */
export function getRockGeometry(): THREE.BufferGeometry {
  if (!rockGeo) {
    const parts: THREE.BufferGeometry[] = [
      paint(new THREE.DodecahedronGeometry(1.1, 0), "#9c7650", 0, 0.7, 0),
      paint(new THREE.DodecahedronGeometry(0.7, 0), "#835e3a", 0.8, 0.5, 0.3),
      paint(new THREE.DodecahedronGeometry(0.6, 0), "#b38960", -0.7, 0.4, -0.2),
    ];
    rockGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return rockGeo;
}

let blobTex: THREE.CanvasTexture | null = null;

/** Soft radial blob faking ground-contact shadow (no shadow maps). */
export function getBlobShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (!blobTex) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, "rgba(0,0,0,0.45)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    blobTex = new THREE.CanvasTexture(c);
  }
  return blobTex;
}

let dhabaGeo: THREE.BufferGeometry | null = null;

/** Roadside dhaba: plaster walls, terracotta roof, teal sign, charpai. */
export function getDhabaGeometry(): THREE.BufferGeometry {
  if (!dhabaGeo) {
    const parts = [
      paint(new THREE.BoxGeometry(4.2, 2.4, 3.2), "#ebdcb2", 0, 1.2, 0),
      paint(new THREE.BoxGeometry(4.8, 0.28, 3.8), "#b84532", 0, 2.54, 0), // terracotta roof slab
      paint(new THREE.BoxGeometry(0.4, 1.0, 0.4), "#7a5c3e", 1.4, 3.1, 0.8), // chimney
      paint(new THREE.BoxGeometry(2.4, 0.75, 0.12), "#1f9aa8", 0, 2.0, 1.66), // teal sign board
      paint(new THREE.BoxGeometry(1.1, 1.7, 0.1), "#4a3524", -1.2, 0.85, 1.62), // wood door
      paint(new THREE.BoxGeometry(1.8, 0.35, 0.9), "#c9a86a", 3.0, 0.35, 1.2), // charpai
      paint(new THREE.BoxGeometry(0.6, 0.9, 0.6), "#8a6a45", 3.0, 0.45, -1.0), // crates
    ];
    dhabaGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return dhabaGeo;
}

let truckGeo: THREE.BufferGeometry | null = null;

/** Hand-painted-style truck: mustard container, red cab, tail-art stripe. */
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
    // 6 wheels
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

let milestoneGeo: THREE.BufferGeometry | null = null;

/** Kilometre stone: white body, black cap, yellow band. */
export function getMilestoneGeometry(): THREE.BufferGeometry {
  if (!milestoneGeo) {
    const parts = [
      paint(new THREE.BoxGeometry(0.45, 1.0, 0.35), "#e8e8e2", 0, 0.5, 0),
      paint(new THREE.BoxGeometry(0.47, 0.18, 0.37), "#222226", 0, 1.02, 0),
      paint(new THREE.BoxGeometry(0.46, 0.12, 0.36), "#e5a71c", 0, 0.72, 0),
    ];
    milestoneGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return milestoneGeo;
}
