import * as THREE from "three";

/**
 * Shared toon gradient map for the comic flat-shaded look (design.md §2).
 * One 4-step ramp reused by every toon material — zero per-frame cost.
 */
let gradient: THREE.DataTexture | null = null;

export function getToonGradient(): THREE.DataTexture {
  if (!gradient) {
    const data = new Uint8Array([90, 150, 210, 255]);
    gradient = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}
