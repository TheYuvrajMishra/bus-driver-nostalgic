import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * High-Quality Low-Poly Procedural Prop Assets for Bright Sunny Day Drive:
 * 1. Dominant Large Flat-Canopy Acacia / Afromontane Tree (Wide Umbrella Canopy)
 * 2. Small Round Bush / Shrub (Ground-Cover Filler)
 * 3. Spiky Desert Grass / Yucca Clump
 * 4. Multi-Faceted Low-Poly Rocky Boulders & Cliff Formations (Warm Tan/Orange)
 * 5. Steel Highway Guardrail Segments & Yellow Chevron Warning Signs
 * 6. Wooden Utility / Telephone Poles with Insulators
 * 7. Sagging 3-Wire Power Line Cables
 * 8. Indian NH Milestone Markers
 * 9. Roadside Dhaba
 * 10. Hand-Painted Indian Truck
 * 11. Roadside Cat-Eye Reflectors & Blob Shadows
 */

function paint(
  geo: THREE.BufferGeometry,
  color: string,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1
): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (sx !== 1 || sy !== 1 || sz !== 1) g.scale(sx, sy, sz);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3 + 0] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

// -----------------------------------------------------------------------------
// 1. Dominant Large Flat-Canopy Acacia / Babul Tree
// -----------------------------------------------------------------------------
let dominantTreeGeo: THREE.BufferGeometry | null = null;

export function getDominantTreeGeometry(): THREE.BufferGeometry {
  if (!dominantTreeGeo) {
    const parts: THREE.BufferGeometry[] = [];

    // Gnarled weathered trunk base & root flares
    const trunkMain = paint(
      new THREE.CylinderGeometry(0.35, 0.65, 3.2, 7),
      "#482b17",
      0,
      1.6,
      0,
      0.05,
      0,
      0.08
    );
    const root1 = paint(
      new THREE.CylinderGeometry(0.18, 0.35, 1.4, 5),
      "#3b2210",
      0.45,
      0.5,
      0.3,
      -0.4,
      0.2,
      -0.6
    );
    const root2 = paint(
      new THREE.CylinderGeometry(0.16, 0.32, 1.3, 5),
      "#3b2210",
      -0.48,
      0.45,
      -0.25,
      0.3,
      -0.4,
      0.55
    );
    const root3 = paint(
      new THREE.CylinderGeometry(0.14, 0.28, 1.2, 5),
      "#3b2210",
      -0.2,
      0.45,
      0.5,
      -0.55,
      0,
      0.2
    );

    // Spreading branch armature
    const branchR = paint(
      new THREE.CylinderGeometry(0.24, 0.36, 3.0, 6),
      "#3e2513",
      1.1,
      3.4,
      0.35,
      0.45,
      0.3,
      0.62
    );
    const branchR2 = paint(
      new THREE.CylinderGeometry(0.14, 0.22, 2.2, 5),
      "#3e2513",
      2.4,
      4.3,
      0.7,
      0.2,
      0.1,
      0.45
    );
    const branchL = paint(
      new THREE.CylinderGeometry(0.22, 0.34, 2.8, 6),
      "#3e2513",
      -1.05,
      3.3,
      -0.4,
      -0.38,
      -0.3,
      -0.58
    );
    const branchL2 = paint(
      new THREE.CylinderGeometry(0.13, 0.2, 2.0, 5),
      "#3e2513",
      -2.2,
      4.1,
      -0.8,
      -0.2,
      -0.15,
      -0.42
    );
    const branchC = paint(
      new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6),
      "#482e1b",
      0.12,
      3.8,
      0.15,
      0.12,
      0.25,
      0.1
    );
    parts.push(trunkMain, root1, root2, root3, branchR, branchR2, branchL, branchL2, branchC);

    // Multi-tiered stepped parasol umbrella canopy foliage
    // Central Main Umbrella
    const canopyMainCap = paint(
      new THREE.ConeGeometry(3.6, 0.5, 9),
      "#6dc93a", // sunlit golden-green highlight
      0.2,
      5.35,
      0.2
    );
    const canopyMainBody = paint(
      new THREE.CylinderGeometry(4.4, 4.8, 0.6, 9),
      "#449226", // rich leaf green
      0.2,
      4.9,
      0.2
    );
    const canopyMainRim = paint(
      new THREE.CylinderGeometry(4.7, 4.4, 0.35, 9),
      "#367d1d", // mid forest tone
      0.2,
      4.55,
      0.2
    );
    const canopyMainUnderside = paint(
      new THREE.CylinderGeometry(4.3, 3.4, 0.3, 9),
      "#1e4c10", // deep shaded underside
      0.2,
      4.3,
      0.2
    );
    parts.push(canopyMainCap, canopyMainBody, canopyMainRim, canopyMainUnderside);

    // Right elevated branch canopy
    const canopyRightCap = paint(
      new THREE.ConeGeometry(2.3, 0.45, 8),
      "#75d642",
      2.6,
      4.95,
      0.8
    );
    const canopyRightBody = paint(
      new THREE.CylinderGeometry(2.7, 3.0, 0.5, 8),
      "#4ca32c",
      2.6,
      4.55,
      0.8
    );
    const canopyRightUnderside = paint(
      new THREE.CylinderGeometry(2.8, 2.1, 0.28, 8),
      "#225612",
      2.6,
      4.25,
      0.8
    );
    parts.push(canopyRightCap, canopyRightBody, canopyRightUnderside);

    // Left drooping branch canopy
    const canopyLeftCap = paint(
      new THREE.ConeGeometry(2.1, 0.42, 8),
      "#65bf35",
      -2.4,
      4.65,
      -0.9
    );
    const canopyLeftBody = paint(
      new THREE.CylinderGeometry(2.5, 2.8, 0.48, 8),
      "#3f8e23",
      -2.4,
      4.3,
      -0.9
    );
    const canopyLeftUnderside = paint(
      new THREE.CylinderGeometry(2.6, 1.9, 0.25, 8),
      "#1b460e",
      -2.4,
      4.0,
      -0.9
    );
    parts.push(canopyLeftCap, canopyLeftBody, canopyLeftUnderside);

    // Rear accent canopy
    const canopyRearCap = paint(
      new THREE.ConeGeometry(1.6, 0.35, 7),
      "#6ac638",
      -0.5,
      5.0,
      1.9
    );
    const canopyRearBody = paint(
      new THREE.CylinderGeometry(1.9, 2.2, 0.4, 7),
      "#429025",
      -0.5,
      4.7,
      1.9
    );
    parts.push(canopyRearCap, canopyRearBody);

    dominantTreeGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return dominantTreeGeo;
}

// -----------------------------------------------------------------------------
// 1B. Dense Cloud-Canopy Banyan / Neem Tree
// -----------------------------------------------------------------------------
let banyanTreeGeo: THREE.BufferGeometry | null = null;

export function getBanyanTreeGeometry(): THREE.BufferGeometry {
  if (!banyanTreeGeo) {
    const parts: THREE.BufferGeometry[] = [];

    // Massive gnarled main trunk & 4 descending pillar roots
    const trunk = paint(
      new THREE.CylinderGeometry(0.55, 0.85, 3.0, 8),
      "#422818",
      0,
      1.5,
      0
    );
    const root1 = paint(
      new THREE.CylinderGeometry(0.18, 0.26, 2.6, 5),
      "#382012",
      0.75,
      1.3,
      0.4,
      0.1,
      0,
      -0.15
    );
    const root2 = paint(
      new THREE.CylinderGeometry(0.16, 0.24, 2.5, 5),
      "#382012",
      -0.7,
      1.25,
      0.35,
      -0.1,
      0.1,
      0.18
    );
    const root3 = paint(
      new THREE.CylinderGeometry(0.17, 0.25, 2.7, 5),
      "#382012",
      0.2,
      1.35,
      -0.75,
      0.15,
      -0.1,
      0
    );
    const root4 = paint(
      new THREE.CylinderGeometry(0.15, 0.22, 2.4, 5),
      "#382012",
      -0.65,
      1.2,
      -0.55,
      -0.12,
      0,
      -0.1
    );

    // Spreading crown boughs
    const bough1 = paint(
      new THREE.CylinderGeometry(0.28, 0.42, 2.5, 6),
      "#3d2414",
      0.9,
      3.2,
      0.5,
      0.35,
      0.2,
      0.45
    );
    const bough2 = paint(
      new THREE.CylinderGeometry(0.26, 0.38, 2.4, 6),
      "#3d2414",
      -0.85,
      3.1,
      -0.45,
      -0.3,
      -0.2,
      -0.42
    );
    const bough3 = paint(
      new THREE.CylinderGeometry(0.25, 0.36, 2.6, 6),
      "#3d2414",
      -0.3,
      3.3,
      0.8,
      0.4,
      -0.1,
      -0.2
    );
    parts.push(trunk, root1, root2, root3, root4, bough1, bough2, bough3);

    // Organic leafy cloud puffs (faceted dodecahedra volumes)
    const domeCenter = paint(
      new THREE.DodecahedronGeometry(2.4, 1),
      "#4fa62d",
      0,
      5.2,
      0,
      0.2,
      0.5,
      0.1
    );
    const crownTop = paint(
      new THREE.DodecahedronGeometry(1.7, 1),
      "#6ecf3e", // sunny crown highlight
      0.2,
      6.2,
      -0.1,
      0.4,
      0.1,
      -0.2
    );
    const cloudRight = paint(
      new THREE.DodecahedronGeometry(2.1, 1),
      "#429324",
      1.8,
      4.4,
      0.9,
      -0.2,
      0.3,
      0.4
    );
    const cloudRightTop = paint(
      new THREE.DodecahedronGeometry(1.4, 1),
      "#63c435",
      2.2,
      5.1,
      0.8,
      0.1,
      -0.3,
      0.2
    );
    const cloudLeft = paint(
      new THREE.DodecahedronGeometry(2.0, 1),
      "#3b8720",
      -1.7,
      4.3,
      -0.8,
      0.3,
      -0.4,
      0.1
    );
    const cloudLeftTop = paint(
      new THREE.DodecahedronGeometry(1.3, 1),
      "#5aba30",
      -2.0,
      4.9,
      -0.7,
      -0.2,
      0.2,
      0.3
    );
    const cloudFront = paint(
      new THREE.DodecahedronGeometry(1.8, 1),
      "#357b1c",
      -0.4,
      4.1,
      1.6,
      0.1,
      0.4,
      -0.3
    );
    const cloudBack = paint(
      new THREE.DodecahedronGeometry(1.7, 1),
      "#2e6f18",
      0.5,
      4.2,
      -1.5,
      -0.3,
      0.1,
      0.4
    );
    const understoryShadow = paint(
      new THREE.DodecahedronGeometry(2.2, 0),
      "#1c4a0d",
      0,
      3.8,
      0,
      0.5,
      0.2,
      -0.3
    );
    parts.push(
      domeCenter,
      crownTop,
      cloudRight,
      cloudRightTop,
      cloudLeft,
      cloudLeftTop,
      cloudFront,
      cloudBack,
      understoryShadow
    );

    banyanTreeGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return banyanTreeGeo;
}

// -----------------------------------------------------------------------------
// 1C. Flowering Gulmohar (Flame Tree) with Scarlet & Orange Blossom Canopy
// -----------------------------------------------------------------------------
let gulmoharTreeGeo: THREE.BufferGeometry | null = null;

export function getGulmoharTreeGeometry(): THREE.BufferGeometry {
  if (!gulmoharTreeGeo) {
    const parts: THREE.BufferGeometry[] = [];

    // Sweeping curved trunk & broad spreading boughs
    const trunk = paint(
      new THREE.CylinderGeometry(0.32, 0.55, 3.0, 7),
      "#442b1a",
      0,
      1.5,
      0,
      0.08,
      0,
      0.05
    );
    const bough1 = paint(
      new THREE.CylinderGeometry(0.2, 0.32, 3.2, 5),
      "#3d2414",
      1.4,
      3.2,
      0.2,
      0.2,
      0.1,
      0.75
    );
    const bough2 = paint(
      new THREE.CylinderGeometry(0.2, 0.32, 3.0, 5),
      "#3d2414",
      -1.3,
      3.1,
      -0.3,
      -0.25,
      -0.2,
      -0.7
    );
    const bough3 = paint(
      new THREE.CylinderGeometry(0.18, 0.28, 2.8, 5),
      "#3d2414",
      -0.2,
      3.3,
      1.3,
      0.65,
      0,
      -0.15
    );
    parts.push(trunk, bough1, bough2, bough3);

    // Spreading Scarlet & Orange Blossom Canopy Discs with Emerald Base
    // Central Canopy
    const centerBlossomCap = paint(
      new THREE.ConeGeometry(3.5, 0.6, 8),
      "#e63c1e", // fiery scarlet blossom crown
      0,
      5.2,
      0.1
    );
    const centerBlossomBody = paint(
      new THREE.CylinderGeometry(4.2, 4.5, 0.55, 8),
      "#f4511e", // bright vermilion blossom tier
      0,
      4.75,
      0.1
    );
    const centerLeafBase = paint(
      new THREE.CylinderGeometry(4.4, 3.8, 0.4, 8),
      "#2e7d32", // lush emerald leaf layer
      0,
      4.35,
      0.1
    );
    const centerUnderside = paint(
      new THREE.CylinderGeometry(3.6, 2.8, 0.25, 8),
      "#1b5e20",
      0,
      4.1,
      0.1
    );
    parts.push(centerBlossomCap, centerBlossomBody, centerLeafBase, centerUnderside);

    // Right Canopy Wing
    const rightBlossomCap = paint(
      new THREE.ConeGeometry(2.4, 0.5, 7),
      "#e53935",
      2.5,
      4.75,
      0.5
    );
    const rightBlossomBody = paint(
      new THREE.CylinderGeometry(2.8, 3.1, 0.45, 7),
      "#ff7043",
      2.5,
      4.35,
      0.5
    );
    const rightLeafBase = paint(
      new THREE.CylinderGeometry(3.0, 2.2, 0.35, 7),
      "#388e3c",
      2.5,
      4.0,
      0.5
    );
    parts.push(rightBlossomCap, rightBlossomBody, rightLeafBase);

    // Left Canopy Wing
    const leftBlossomCap = paint(
      new THREE.ConeGeometry(2.2, 0.45, 7),
      "#d32f2f",
      -2.3,
      4.6,
      -0.6
    );
    const leftBlossomBody = paint(
      new THREE.CylinderGeometry(2.6, 2.9, 0.42, 7),
      "#ff5722",
      -2.3,
      4.22,
      -0.6
    );
    const leftLeafBase = paint(
      new THREE.CylinderGeometry(2.7, 2.0, 0.3, 7),
      "#2e7d32",
      -2.3,
      3.9,
      -0.6
    );
    parts.push(leftBlossomCap, leftBlossomBody, leftLeafBase);

    // Blossom accent puffs
    const frontBlossomPuff = paint(
      new THREE.DodecahedronGeometry(1.2, 0),
      "#ff3d00",
      -0.4,
      4.6,
      2.2,
      0.2,
      0.4,
      -0.1
    );
    const backBlossomPuff = paint(
      new THREE.DodecahedronGeometry(1.1, 0),
      "#e64a19",
      0.6,
      4.7,
      -1.8,
      -0.3,
      0.2,
      0.3
    );
    parts.push(frontBlossomPuff, backBlossomPuff);

    gulmoharTreeGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return gulmoharTreeGeo;
}

// -----------------------------------------------------------------------------
// 2. Small Round Bush / Shrub (Ground-Cover Filler)
// -----------------------------------------------------------------------------
let bushGeo: THREE.BufferGeometry | null = null;

export function getBushGeometry(): THREE.BufferGeometry {
  if (!bushGeo) {
    const parts: THREE.BufferGeometry[] = [
      paint(new THREE.DodecahedronGeometry(1.0, 0), "#48962c", 0, 0.75, 0, 0.2, 0.4, 0),
      paint(new THREE.DodecahedronGeometry(0.78, 0), "#387d21", -0.65, 0.55, 0.25, -0.3, 0.6, 0.1),
      paint(new THREE.DodecahedronGeometry(0.82, 0), "#59a834", 0.62, 0.58, -0.22, 0.4, -0.5, 0.2),
      paint(new THREE.DodecahedronGeometry(0.55, 0), "#2a6618", 0.1, 0.38, 0.68, 0.1, 0.2, -0.3),
    ];
    bushGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return bushGeo;
}

// -----------------------------------------------------------------------------
// 3. Spiky Desert Grass Clump (Yucca / Steppe Grass)
// -----------------------------------------------------------------------------
let grassGeo: THREE.BufferGeometry | null = null;

export function getGrassGeometry(): THREE.BufferGeometry {
  if (!grassGeo) {
    const parts: THREE.BufferGeometry[] = [];
    const bladeGeo = new THREE.ConeGeometry(0.12, 1.15, 4);
    const bladeColors = ["#629633", "#76ab3d", "#517f27", "#8cb845", "#4a7522"];

    parts.push(paint(bladeGeo, bladeColors[0], 0, 0.55, 0, 0.05, 0.2, 0));

    const angles = [0, 0.9, 1.8, 2.7, 3.6, 4.5, 5.4];
    angles.forEach((ang, i) => {
      const tilt = 0.38 + (i % 3) * 0.12;
      const heightScale = 0.75 + (i % 4) * 0.15;
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

// -----------------------------------------------------------------------------
// 4. Low-Poly Faceted Rocks & Boulder Formations (Warm Tan/Orange)
// -----------------------------------------------------------------------------
let rockGeo: THREE.BufferGeometry | null = null;

export function getRockGeometry(): THREE.BufferGeometry {
  if (!rockGeo) {
    const parts: THREE.BufferGeometry[] = [
      // Main central faceted rock
      paint(new THREE.DodecahedronGeometry(1.35, 0), "#e28c3a", 0, 0.85, 0, 0.25, 0.6, 0.1),
      // Sunlit upper boulder slab
      paint(new THREE.DodecahedronGeometry(0.95, 0), "#f4b05a", 0.95, 0.65, 0.45, -0.3, 0.8, 0.15),
      // Terracotta side boulder
      paint(new THREE.DodecahedronGeometry(0.82, 0), "#c87228", -0.95, 0.52, -0.3, 0.4, -0.6, 0.25),
      // Base shaded chunk
      paint(new THREE.DodecahedronGeometry(0.58, 0), "#9a4b16", 0.25, 0.32, 1.1, 0.1, 0.3, -0.4),
    ];
    rockGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return rockGeo;
}

let cliffFormationGeo: THREE.BufferGeometry | null = null;

export function getCliffFormationGeometry(): THREE.BufferGeometry {
  if (!cliffFormationGeo) {
    const parts: THREE.BufferGeometry[] = [
      // Layered stepped rock shelf formation
      paint(new THREE.BoxGeometry(4.2, 1.8, 2.6), "#e08836", 0, 0.9, 0, 0.08, 0.2, 0),
      paint(new THREE.BoxGeometry(3.4, 1.6, 2.2), "#f2aa54", 0.4, 2.2, 0.2, -0.05, 0.35, 0.06),
      paint(new THREE.BoxGeometry(2.2, 1.4, 1.6), "#f7bd6e", 0.8, 3.4, 0.4, 0.04, -0.2, 0.08),
      paint(new THREE.DodecahedronGeometry(1.6, 0), "#c67026", -1.4, 1.2, 0.6, 0.2, 0.5, 0),
      paint(new THREE.DodecahedronGeometry(1.2, 0), "#9c4c15", 1.8, 0.8, -0.7, -0.3, 0.4, 0.1),
    ];
    cliffFormationGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return cliffFormationGeo;
}

// -----------------------------------------------------------------------------
// 5. Instanced Metal Guardrail Prop & Yellow Road Warning Signs
// -----------------------------------------------------------------------------
let guardrailGeo: THREE.BufferGeometry | null = null;

export function getGuardrailGeometry(): THREE.BufferGeometry {
  if (!guardrailGeo) {
    const parts: THREE.BufferGeometry[] = [];
    const len = 10.0; // 10m rail segment

    // Corrugated W-beam horizontal rail ribbon (silver-grey steel)
    // Upper facet
    parts.push(
      paint(
        new THREE.BoxGeometry(0.08, 0.16, len),
        "#b8c4d0", // sunlit upper bevel
        0,
        0.72,
        -len / 2
      )
    );
    // Center crease facet
    parts.push(
      paint(
        new THREE.BoxGeometry(0.12, 0.14, len),
        "#88939e", // shaded valley crease
        -0.02,
        0.6,
        -len / 2
      )
    );
    // Lower facet
    parts.push(
      paint(
        new THREE.BoxGeometry(0.08, 0.16, len),
        "#a2acb6", // lower bevel
        0,
        0.48,
        -len / 2
      )
    );

    // Vertical I-beam support posts every 2.5m
    const postCount = 4;
    for (let i = 0; i < postCount; i++) {
      const zPos = -(i * (len / (postCount - 1)));
      // Main post
      parts.push(
        paint(
          new THREE.BoxGeometry(0.12, 0.85, 0.12),
          "#5e6670",
          -0.04,
          0.38,
          zPos
        )
      );
      // Small white/red reflector tag on post
      parts.push(
        paint(
          new THREE.BoxGeometry(0.02, 0.1, 0.08),
          "#e8e8e8",
          0.04,
          0.62,
          zPos
        )
      );
    }

    guardrailGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return guardrailGeo;
}

let roadSignGeo: THREE.BufferGeometry | null = null;

export function getRoadSignGeometry(): THREE.BufferGeometry {
  if (!roadSignGeo) {
    const parts: THREE.BufferGeometry[] = [
      // Metal support pole
      paint(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), "#50565e", 0, 1.1, 0),
      // Yellow warning diamond plate
      paint(new THREE.BoxGeometry(1.1, 1.1, 0.04), "#f5a800", 0, 1.65, 0, 0, 0, Math.PI / 4),
      // Black chevron arrow marking `<`
      paint(new THREE.BoxGeometry(0.48, 0.14, 0.05), "#181818", -0.08, 1.76, 0.01, 0, 0, Math.PI / 4),
      paint(new THREE.BoxGeometry(0.48, 0.14, 0.05), "#181818", -0.08, 1.54, 0.01, 0, 0, -Math.PI / 4),
    ];
    roadSignGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return roadSignGeo;
}

// -----------------------------------------------------------------------------
// 6. Wooden Utility / Telephone Pole with Crossarms & Ceramic Insulators
// -----------------------------------------------------------------------------
let poleGeo: THREE.BufferGeometry | null = null;

export function getPoleGeometry(): THREE.BufferGeometry {
  if (!poleGeo) {
    const parts: THREE.BufferGeometry[] = [
      // Main wooden trunk pole
      paint(new THREE.CylinderGeometry(0.13, 0.22, 8.2, 6), "#4e3927", 0, 4.1, 0),
      // Top horizontal T-crossarm
      paint(new THREE.BoxGeometry(2.3, 0.13, 0.13), "#3b2a1c", 0, 7.5, 0),
      // Lower horizontal crossarm
      paint(new THREE.BoxGeometry(1.7, 0.11, 0.11), "#3b2a1c", 0, 6.5, 0),
      // Diagonal support strut braces
      paint(new THREE.BoxGeometry(0.06, 0.85, 0.06), "#3b2a1c", -0.45, 7.05, 0, 0, 0, -0.65),
      paint(new THREE.BoxGeometry(0.06, 0.85, 0.06), "#3b2a1c", 0.45, 7.05, 0, 0, 0, 0.65),
      // 4 White ceramic insulators
      paint(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 5), "#f0f0f0", -0.98, 7.7, 0),
      paint(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 5), "#f0f0f0", 0.98, 7.7, 0),
      paint(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 5), "#f0f0f0", -0.68, 6.7, 0),
      paint(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 5), "#f0f0f0", 0.68, 6.7, 0),
      // Base support collar
      paint(new THREE.BoxGeometry(0.55, 0.45, 0.55), "#726b64", 0, 0.22, 0),
    ];
    poleGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return poleGeo;
}

// -----------------------------------------------------------------------------
// 7. Sagging 3-Wire Power Line Cables (Spanning 20m between poles)
// -----------------------------------------------------------------------------
let wireSpanGeo: THREE.BufferGeometry | null = null;

export function getWireSpanGeometry(): THREE.BufferGeometry {
  if (!wireSpanGeo) {
    const parts: THREE.BufferGeometry[] = [];
    const spanLen = 20.0;
    const steps = 8;
    const sag = 0.52; // 52cm catenary dip

    // Cable origins at insulators
    const cables = [
      { x: -0.98, y: 7.7 },
      { x: 0.98, y: 7.7 },
      { x: 0.68, y: 6.7 },
    ];

    for (const cb of cables) {
      for (let s = 0; s < steps; s++) {
        const t0 = s / steps;
        const t1 = (s + 1) / steps;

        const z0 = -t0 * spanLen;
        const z1 = -t1 * spanLen;

        const y0 = cb.y - 4.0 * sag * t0 * (1.0 - t0);
        const y1 = cb.y - 4.0 * sag * t1 * (1.0 - t1);

        const dz = z1 - z0;
        const dy = y1 - y0;
        const segLen = Math.sqrt(dz * dz + dy * dy);
        const pitch = Math.atan2(dy, -dz);

        const wireSeg = paint(
          new THREE.CylinderGeometry(0.015, 0.015, segLen, 3),
          "#1a1d20",
          cb.x,
          (y0 + y1) / 2,
          (z0 + z1) / 2,
          pitch,
          0,
          0
        );
        parts.push(wireSeg);
      }
    }

    wireSpanGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return wireSpanGeo;
}

// -----------------------------------------------------------------------------
// 8. Indian NH Kilometre Milestone Marker
// -----------------------------------------------------------------------------
let milestoneGeo: THREE.BufferGeometry | null = null;

export function getMilestoneGeometry(): THREE.BufferGeometry {
  if (!milestoneGeo) {
    const parts = [
      paint(new THREE.BoxGeometry(0.48, 0.7, 0.36), "#f0f0eb", 0, 0.35, 0),
      paint(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 10), "#e5a71c", 0, 0.7, 0, Math.PI / 2, 0, 0),
      paint(new THREE.BoxGeometry(0.49, 0.08, 0.37), "#1a1a1a", 0, 0.48, 0),
    ];
    milestoneGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return milestoneGeo;
}

// -----------------------------------------------------------------------------
// 9. Roadside Dhaba / Brick Building
// -----------------------------------------------------------------------------
let dhabaGeo: THREE.BufferGeometry | null = null;

export function getDhabaGeometry(): THREE.BufferGeometry {
  if (!dhabaGeo) {
    const parts = [
      paint(new THREE.BoxGeometry(4.8, 2.6, 3.4), "#d4b886", 0, 1.3, 0),
      paint(new THREE.BoxGeometry(5.4, 0.28, 4.2), "#a63d2b", 0, 2.72, 0.2, 0.08, 0, 0),
      paint(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 4), "#5c4028", -2.2, 1.1, 2.1),
      paint(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 4), "#5c4028", 2.2, 1.1, 2.1),
      paint(new THREE.BoxGeometry(4.8, 0.12, 1.8), "#7a3b2a", 0, 2.25, 1.4, 0.18, 0, 0),
      paint(new THREE.BoxGeometry(2.8, 0.8, 0.12), "#1f9aa8", 0, 2.15, 1.76),
      paint(new THREE.BoxGeometry(1.1, 1.8, 0.1), "#4a3524", -1.2, 0.9, 1.72),
      paint(new THREE.BoxGeometry(0.9, 0.9, 0.1), "#36454f", 1.2, 1.4, 1.72),
      paint(new THREE.BoxGeometry(2.0, 0.38, 1.0), "#c9a86a", 3.2, 0.38, 1.4),
      paint(new THREE.BoxGeometry(0.7, 0.7, 0.7), "#7a5a3a", 3.2, 0.35, -0.8),
    ];
    dhabaGeo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
  }
  return dhabaGeo;
}

// -----------------------------------------------------------------------------
// 10. Low-Poly Hand-Painted Indian Truck
// -----------------------------------------------------------------------------
let truckGeo: THREE.BufferGeometry | null = null;

export function getTruckGeometry(): THREE.BufferGeometry {
  if (!truckGeo) {
    const parts = [
      paint(new THREE.BoxGeometry(2.3, 0.35, 6.8), "#2a2b30", 0, 0.85, 0),
      paint(new THREE.BoxGeometry(2.45, 2.7, 4.8), "#e5a71c", 0, 2.35, -0.9),
      paint(new THREE.BoxGeometry(2.35, 2.1, 1.9), "#c43b2a", 0, 1.9, 2.5),
      paint(new THREE.BoxGeometry(2.05, 0.75, 0.12), "#1a2530", 0, 2.3, 3.46),
      paint(new THREE.BoxGeometry(2.48, 0.5, 0.06), "#258038", 0, 1.5, -3.32),
      paint(new THREE.BoxGeometry(2.48, 0.28, 0.06), "#f0f0e8", 0, 2.65, -3.32),
      paint(new THREE.BoxGeometry(2.35, 0.32, 0.25), "#4e4e55", 0, 0.85, 3.55),
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

// -----------------------------------------------------------------------------
// 11. Roadside Cat-Eye Reflectors & Blob Shadow
// -----------------------------------------------------------------------------
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
