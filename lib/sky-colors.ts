import * as THREE from "three";

/**
 * Derives the sky-dome gradient stops + fog color from a rotation's base
 * sky color (rotations.ts). The dome is an overcast-style gradient:
 * darker zenith -> warm hazy horizon. Fog is matched to the horizon so the
 * desert ground melts into the sky with no visible seam.
 */

export interface SkyPalette {
  top: string;
  horizon: string;
  cloud: string;
  fog: string;
}

const _c = new THREE.Color();

function shift(hex: string, dl: number, ds: number): string {
  _c.set(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  _c.getHSL(hsl);
  _c.setHSL(
    hsl.h,
    Math.max(0, Math.min(1, hsl.s + ds)),
    Math.max(0, Math.min(1, hsl.l + dl))
  );
  return `#${_c.getHexString()}`;
}

export function skyPaletteFor(skyHex: string): SkyPalette {
  // Zenith: darker + slightly desaturated version of the rotation sky.
  const top = shift(skyHex, -0.16, -0.06);
  // Horizon: lifted toward a warm hazy tone (overcast feel).
  const lifted = shift(skyHex, 0.14, -0.02);
  _c.set(lifted);
  const warm = new THREE.Color("#cbb091");
  _c.lerp(warm, 0.35);
  const horizon = `#${_c.getHexString()}`;
  // Clouds: a touch lighter than the horizon.
  const cloud = shift(horizon, 0.1, -0.03);
  return { top, horizon, cloud, fog: horizon };
}
