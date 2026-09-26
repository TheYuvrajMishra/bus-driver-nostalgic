import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural prop assets — canvas textures + merged low-poly geometry.
 * Everything is built once and shared (one InstancedMesh per prop type).
 * Lazily created on first client-side use (canvas needs `document`).
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

let treeTex: THREE.CanvasTexture | null = null;

/** Alpha-cut tree billboard texture (banyan-style canopy). */
export function getTreeTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (!treeTex) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 192;
    const g = c.getContext("2d")!;
    // trunk
    g.fillStyle = "#6b4a2f";
    g.fillRect(58, 108, 12, 84);
    g.fillRect(48, 150, 32, 10); // roots
    // canopy blobs
    const blobs: [number, number, number, string][] = [
      [64, 62, 46, "#2e6b2e"],
      [34, 88, 30, "#35823a"],
      [96, 88, 30, "#2a6128"],
      [64, 40, 30, "#3d9142"],
    ];
    for (const [x, y, r, col] of blobs) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // highlight
    g.fillStyle = "#4da854";
    g.beginPath();
    g.arc(52, 52, 18, 0, Math.PI * 2);
    g.fill();
    treeTex = new THREE.CanvasTexture(c);
    treeTex.colorSpace = THREE.SRGBColorSpace;
  }
  return treeTex;
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
    grad.addColorStop(0, "rgba(0,0,0,0.42)");
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
      paint(new THREE.BoxGeometry(4, 2.4, 3), "#e8d9a8", 0, 1.2, 0),
      paint(new THREE.BoxGeometry(4.6, 0.25, 3.6), "#a83c2a", 0, 2.52, 0), // roof slab
      paint(new THREE.BoxGeometry(0.4, 1.0, 0.4), "#7a5c3e", 1.4, 3.1, 0.8), // chimney
      paint(new THREE.BoxGeometry(2.2, 0.7, 0.12), "#1f8a8a", 0, 1.95, 1.56), // sign board
      paint(new THREE.BoxGeometry(1.0, 1.6, 0.1), "#4a3524", -1.2, 0.8, 1.52), // door
      paint(new THREE.BoxGeometry(1.8, 0.35, 0.9), "#c9a86a", 3.0, 0.35, 1.2), // charpai
      paint(new THREE.BoxGeometry(0.5, 0.9, 0.5), "#8a6a45", 3.0, 0.45, -1.0), // crate
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
      paint(new THREE.BoxGeometry(2.2, 0.3, 6.6), "#333338", 0, 0.85, 0), // chassis
      paint(new THREE.BoxGeometry(2.4, 2.6, 4.6), "#d9a419", 0, 2.3, -0.9), // container
      paint(new THREE.BoxGeometry(2.3, 2.0, 1.8), "#b3392b", 0, 1.85, 2.5), // cab
      paint(new THREE.BoxGeometry(2.0, 0.7, 0.12), "#1a2530", 0, 2.25, 3.42), // windshield
      paint(new THREE.BoxGeometry(2.44, 0.5, 0.06), "#2e7d32", 0, 1.5, -3.22), // tail-art stripe
      paint(new THREE.BoxGeometry(2.44, 0.28, 0.06), "#e8e8e2", 0, 2.6, -3.22), // top stripe
      paint(new THREE.BoxGeometry(2.3, 0.3, 0.25), "#55555c", 0, 0.85, 3.5), // bumper
    ];
    // 6 wheels
    const wheel = new THREE.CylinderGeometry(0.45, 0.45, 0.32, 10);
    for (const [wx, wz] of [
      [-1.05, 2.5],
      [1.05, 2.5],
      [-1.05, -0.8],
      [1.05, -0.8],
      [-1.05, -2.4],
      [1.05, -2.4],
    ] as [number, number][]) {
      const w = wheel.clone();
      w.rotateZ(Math.PI / 2);
      parts.push(paint(w, "#1c1c1c", wx, 0.45, wz));
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
      paint(new THREE.BoxGeometry(0.46, 0.12, 0.36), "#d8b93a", 0, 0.72, 0),
    ];
    milestoneGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return milestoneGeo;
}
