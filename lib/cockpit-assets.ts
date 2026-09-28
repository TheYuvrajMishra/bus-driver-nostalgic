import * as THREE from "three";

/**
 * Cockpit + environment canvas textures and a tiny geometry merge helper.
 *
 * All cockpit static trim is merged into a handful of meshes (one per
 * material) to keep draw calls flat — architecture.md §7.
 */

let patternTex: THREE.CanvasTexture | null = null;
let gaugeTex: THREE.CanvasTexture | null = null;
let sandTex: THREE.CanvasTexture | null = null;

/** Geometric band texture (orange/teal/yellow on dark) for the dash strip. */
export function getPatternTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (patternTex) return patternTex;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#14343a";
  g.fillRect(0, 0, 512, 64);
  const cols = ["#e8823f", "#f5b942", "#1f9aa8", "#e8503a"];
  // zigzag triangles, two rows
  for (let row = 0; row < 2; row++) {
    const y0 = row * 32;
    for (let i = 0; i < 16; i++) {
      g.fillStyle = cols[(i + row) % cols.length];
      const x0 = i * 32;
      g.beginPath();
      if ((i + row) % 2 === 0) {
        g.moveTo(x0, y0 + 32);
        g.lineTo(x0 + 16, y0);
        g.lineTo(x0 + 32, y0 + 32);
      } else {
        g.moveTo(x0, y0);
        g.lineTo(x0 + 16, y0 + 32);
        g.lineTo(x0 + 32, y0);
      }
      g.closePath();
      g.fill();
    }
  }
  // thin border lines
  g.fillStyle = "#e8823f";
  g.fillRect(0, 0, 512, 4);
  g.fillRect(0, 60, 512, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  patternTex = tex;
  return tex;
}

/** Instrument cluster: two dials with ticks + needles on dark. */
export function getGaugeTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (gaugeTex) return gaugeTex;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const g = c.getContext("2d")!;
  g.fillStyle = "#141216";
  g.fillRect(0, 0, 256, 96);
  const dial = (cx: number, needleDeg: number) => {
    g.strokeStyle = "#e8e0d0";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, 48, 38, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#e8e0d0";
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      const x1 = cx + Math.cos(a) * 30;
      const y1 = 48 + Math.sin(a) * 30;
      const x2 = cx + Math.cos(a) * 35;
      const y2 = 48 + Math.sin(a) * 35;
      g.lineWidth = i % 5 === 0 ? 3 : 1.5;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    }
    const na = ((needleDeg - 90) * Math.PI) / 180;
    g.strokeStyle = "#e8503a";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(cx, 48);
    g.lineTo(cx + Math.cos(na) * 26, 48 + Math.sin(na) * 26);
    g.stroke();
    g.fillStyle = "#e8e0d0";
    g.beginPath();
    g.arc(cx, 48, 5, 0, Math.PI * 2);
    g.fill();
  };
  dial(64, 55); // speedo ~ mid
  dial(192, 20); // fuel/temp-ish
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  gaugeTex = tex;
  return tex;
}

/** Subtle sand speckle, tiled over the desert ground. */
export function getSandTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (sandTex) return sandTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#b08d5e";
  g.fillRect(0, 0, 128, 128);
  let seed = 987654321;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < 900; i++) {
    const v = 120 + Math.floor(rand() * 60);
    g.fillStyle = `rgba(${v},${Math.floor(v * 0.82)},${Math.floor(v * 0.58)},0.5)`;
    const s = 1 + rand() * 2;
    g.fillRect(rand() * 128, rand() * 128, s, s);
  }
  // a few scrub dots
  for (let i = 0; i < 26; i++) {
    g.fillStyle = "rgba(96,110,62,0.55)";
    const s = 2 + rand() * 3;
    g.fillRect(rand() * 128, rand() * 128, s, s * 0.7);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 48);
  tex.colorSpace = THREE.SRGBColorSpace;
  sandTex = tex;
  return tex;
}

/**
 * Merge a list of (already transformed) BufferGeometries into one.
 * All inputs must carry position/normal/uv — true for every primitive
 * used here (box, cylinder, torus, cone, plane, sphere).
 */
export function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const list = geos.map((geo) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    return g;
  });
  let vCount = 0;
  for (const g of list) vCount += g.getAttribute("position").count;
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  let o = 0;
  for (const g of list) {
    const p = g.getAttribute("position") as THREE.BufferAttribute;
    const n = g.getAttribute("normal") as THREE.BufferAttribute;
    const u = g.getAttribute("uv") as THREE.BufferAttribute;
    pos.set(p.array as Float32Array, o * 3);
    nor.set(n.array as Float32Array, o * 3);
    uv.set(u.array as Float32Array, o * 2);
    o += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}

/** Helper: transform a geometry then return it (for mergeGeos lists). */
export function xform(
  geo: THREE.BufferGeometry,
  px: number,
  py: number,
  pz: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = sx,
  sz = sx
): THREE.BufferGeometry {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(px, py, pz), q, new THREE.Vector3(sx, sy, sz));
  geo.applyMatrix4(m);
  return geo;
}
