import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { TrafficVehicleType } from "./traffic-system";

/**
 * Detailed procedural vehicle models with baked vertex colors.
 *
 * Convention: vehicle FRONT faces +Z, up +Y, origin at ground center.
 * (TrafficManager adds a PI yaw so +Z maps onto the route-forward -Z.)
 *
 * Bodies are merged into ONE geometry per color variant (single InstancedMesh
 * with a vertex-color material). Wheels, headlights, taillights and textured
 * decal panels are separate instanced meshes described by VehicleModelSet.
 */

export interface WheelMount {
  x: number;
  y: number;
  z: number;
}

export interface VehicleModelSet {
  /** merged body geometry, baked vertex colors, one per livery variant */
  bodies: THREE.BufferGeometry[];
  /** single wheel geometry (tire + hub, axle along X) */
  wheel: THREE.BufferGeometry;
  /** wheel mounts in vehicle-local space */
  wheelMounts: WheelMount[];
  /** merged pair of headlight boxes (front, faces +Z) */
  headlights: THREE.BufferGeometry;
  /** merged pair of taillight boxes (rear, faces -Z) */
  taillights: THREE.BufferGeometry;
  /** merged left+right textured side panels (UV-corrected so art reads correctly) */
  sideDecal: THREE.BufferGeometry | null;
  sideDecalUrl: string | null;
  /** vertical crop of the side texture to sample (v range), null = full */
  sideDecalVCrop: [number, number] | null;
  /** textured rear panel (faces -Z) */
  rearDecal: THREE.BufferGeometry | null;
  rearDecalUrl: string | null;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function paint(g: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
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

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return paint(g, color);
}

function cylX(
  r: number,
  len: number,
  x: number,
  y: number,
  z: number,
  color: string,
  segments = 12
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, segments);
  g.rotateZ(Math.PI / 2); // axis -> X
  g.translate(x, y, z);
  return paint(g, color);
}

function cylY(
  r: number,
  len: number,
  x: number,
  y: number,
  z: number,
  color: string,
  segments = 12
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, segments);
  g.translate(x, y, z);
  return paint(g, color);
}

function cylZ(
  r: number,
  len: number,
  x: number,
  y: number,
  z: number,
  color: string,
  segments = 12
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, segments);
  g.rotateX(Math.PI / 2); // axis -> Z
  g.translate(x, y, z);
  return paint(g, color);
}

const GLASS = "#0e141b";
const TIRE = "#16171a";
const HUB = "#9aa0a6";
const CHROME = "#c9ced4";
const DARK = "#1e2126";

/* ------------------------------------------------------------------ */
/* wheels                                                              */
/* ------------------------------------------------------------------ */

function buildWheel(radius: number, width: number): THREE.BufferGeometry {
  const tire = new THREE.CylinderGeometry(radius, radius, width, 16);
  tire.rotateZ(Math.PI / 2);
  paint(tire, TIRE);
  const hub = new THREE.CylinderGeometry(
    radius * 0.55,
    radius * 0.55,
    width + 0.02,
    10
  );
  hub.rotateZ(Math.PI / 2);
  paint(hub, HUB);
  const cap = new THREE.CylinderGeometry(
    radius * 0.2,
    radius * 0.2,
    width + 0.04,
    8
  );
  cap.rotateZ(Math.PI / 2);
  paint(cap, DARK);
  return mergeGeometries([tire, hub, cap])!;
}

/* ------------------------------------------------------------------ */
/* decals (textured panels, UV-corrected)                              */
/* ------------------------------------------------------------------ */

/**
 * Two side planes merged into one geometry. Left plane (x<0) faces -X with
 * U increasing toward the front (+Z); right plane (x>0) faces +X with U
 * increasing toward the rear (-Z) — so the artwork reads correctly from
 * both sides of the vehicle.
 */
function buildSideDecal(
  w: number,
  h: number,
  y: number,
  z: number,
  halfW: number
): THREE.BufferGeometry {
  const off = 0.012;
  const left = new THREE.PlaneGeometry(w, h);
  left.rotateY(-Math.PI / 2);
  left.translate(-(halfW + off), y, z);
  const right = new THREE.PlaneGeometry(w, h);
  right.rotateY(Math.PI / 2);
  right.translate(halfW + off, y, z);
  return mergeGeometries([left, right])!;
}

/** Rear panel facing -Z, U increasing toward -X so text reads correctly. */
function buildRearDecal(w: number, h: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  g.rotateY(Math.PI);
  g.translate(0, y, z - 0.012);
  return g;
}

/* ------------------------------------------------------------------ */
/* CAR — vintage Ambassador taxi (L 4.2, W 1.8)                        */
/* ------------------------------------------------------------------ */

const CAR_LIVERIES = [
  { body: "#15161a", roof: "#f5b301" }, // black + yellow taxi
  { body: "#e9e7de", roof: "#d8d5c9" }, // white
  { body: "#6e1d1d", roof: "#7d2323" }, // maroon
];

function buildCarBody(livery: (typeof CAR_LIVERIES)[number]): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const B = livery.body;
  const R = livery.roof;

  parts.push(box(1.8, 0.62, 4.2, 0, 0.66, 0, B)); // lower body
  parts.push(box(1.7, 0.2, 1.15, 0, 1.04, 1.45, B)); // hood
  parts.push(box(1.7, 0.18, 0.95, 0, 1.02, -1.6, B)); // trunk
  parts.push(box(1.58, 0.6, 2.05, 0, 1.3, -0.12, B)); // cabin
  parts.push(box(1.6, 0.09, 2.1, 0, 1.64, -0.12, R)); // roof
  // glasshouse
  parts.push(box(1.46, 0.48, 0.07, 0, 1.3, 0.93, GLASS)); // windshield
  parts.push(box(1.46, 0.44, 0.07, 0, 1.28, -1.17, GLASS)); // rear window
  parts.push(box(0.05, 0.4, 1.85, -0.8, 1.3, -0.12, GLASS)); // side glass L
  parts.push(box(0.05, 0.4, 1.85, 0.8, 1.3, -0.12, GLASS)); // side glass R
  parts.push(box(0.05, 0.44, 0.08, -0.8, 1.3, 0.9, B)); // A-pillars
  parts.push(box(0.05, 0.44, 0.08, 0.8, 1.3, 0.9, B));
  // chrome + trim
  parts.push(box(1.86, 0.13, 0.16, 0, 0.4, 2.14, CHROME)); // front bumper
  parts.push(box(1.86, 0.13, 0.16, 0, 0.4, -2.14, CHROME)); // rear bumper
  parts.push(box(1.15, 0.3, 0.07, 0, 0.66, 2.11, DARK)); // grille
  parts.push(box(1.82, 0.05, 4.22, 0, 0.42, 0, CHROME)); // side trim
  parts.push(box(0.46, 0.13, 0.03, 0, 0.58, 2.2, "#f2f2f2")); // front plate
  parts.push(box(0.46, 0.13, 0.03, 0, 0.58, -2.2, "#f7c948")); // rear plate
  // mirrors
  parts.push(box(0.05, 0.05, 0.22, -0.93, 1.22, 0.72, DARK));
  parts.push(box(0.05, 0.05, 0.22, 0.93, 1.22, 0.72, DARK));
  parts.push(box(0.07, 0.12, 0.05, -1.02, 1.28, 0.72, B));
  parts.push(box(0.07, 0.12, 0.05, 1.02, 1.28, 0.72, B));
  // taxi roof sign
  parts.push(box(0.56, 0.05, 0.3, 0, 1.7, -0.12, DARK));
  parts.push(box(0.5, 0.15, 0.24, 0, 1.8, -0.12, "#f5b301"));
  // door handles
  for (const sx of [-1, 1])
    for (const zz of [0.35, -0.65])
      parts.push(box(0.03, 0.05, 0.22, sx * 0.91, 0.95, zz, CHROME));
  // exhaust
  parts.push(cylZ(0.045, 0.35, 0.5, 0.26, -2.2, "#3a3d42"));

  return mergeGeometries(parts)!;
}

function buildCar(): VehicleModelSet {
  const bodies = CAR_LIVERIES.map(buildCarBody);
  const headlights = mergeGeometries([
    paint(new THREE.BoxGeometry(0.34, 0.22, 0.07).translate(-0.55, 0.8, 2.12), "#fff6d8"),
    paint(new THREE.BoxGeometry(0.34, 0.22, 0.07).translate(0.55, 0.8, 2.12), "#fff6d8"),
  ])!;
  const taillights = mergeGeometries([
    paint(new THREE.BoxGeometry(0.3, 0.2, 0.07).translate(-0.6, 0.74, -2.12), "#ff2a1e"),
    paint(new THREE.BoxGeometry(0.3, 0.2, 0.07).translate(0.6, 0.74, -2.12), "#ff2a1e"),
  ])!;
  return {
    bodies,
    wheel: buildWheel(0.32, 0.24),
    wheelMounts: [
      { x: -0.82, y: 0.32, z: 1.35 },
      { x: 0.82, y: 0.32, z: 1.35 },
      { x: -0.82, y: 0.32, z: -1.35 },
      { x: 0.82, y: 0.32, z: -1.35 },
    ],
    headlights,
    taillights,
    // door-band crop of the taxi artwork (bottom 55%: doors + TAXI text)
    sideDecal: buildSideDecal(3.3, 0.62, 0.73, -0.1, 0.9),
    sideDecalUrl: "/assets/traffic/car-side.png",
    sideDecalVCrop: [0, 0.55],
    rearDecal: null,
    rearDecalUrl: null,
  };
}

/* ------------------------------------------------------------------ */
/* BUS — intercity coach (L 9.5, W 2.5)                                */
/* ------------------------------------------------------------------ */

const BUS_LIVERIES = [
  { body: "#0e7c7d", skirt: "#123f45" }, // teal
  { body: "#1d4fa3", skirt: "#152c52" }, // blue
  { body: "#2e7d32", skirt: "#1b4a1f" }, // green
];

function buildBusBody(livery: (typeof BUS_LIVERIES)[number]): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const B = livery.body;
  const S = livery.skirt;

  parts.push(box(2.5, 1.7, 9.5, 0, 1.6, 0, B)); // main body
  parts.push(box(2.54, 0.52, 9.5, 0, 0.52, 0, S)); // lower skirt
  parts.push(box(2.5, 0.2, 9.5, 0, 2.55, 0, "#dde2e6")); // roof
  parts.push(box(1.7, 0.16, 3.2, 0, 2.73, -0.6, "#b7bec5")); // roof AC pod
  parts.push(box(1.7, 0.06, 0.5, 0, 2.83, 1.4, "#b7bec5")); // roof hatch
  // windshield + divider
  parts.push(box(2.24, 1.0, 0.07, 0, 1.95, 4.76, GLASS));
  parts.push(box(0.07, 1.0, 0.09, 0, 1.95, 4.76, B));
  parts.push(box(2.3, 0.16, 0.09, 0, 2.5, 4.76, B)); // header above glass
  // destination board (glowing amber)
  parts.push(box(1.25, 0.3, 0.06, 0, 2.28, 4.79, "#ffb62e"));
  // front details
  parts.push(box(1.8, 0.42, 0.07, 0, 0.92, 4.77, DARK)); // grille
  parts.push(box(2.56, 0.2, 0.18, 0, 0.44, 4.79, "#3a3e44")); // front bumper
  parts.push(box(2.56, 0.2, 0.18, 0, 0.44, -4.79, "#3a3e44")); // rear bumper
  parts.push(box(0.5, 0.14, 0.03, 0, 0.62, 4.88, "#f2f2f2")); // front plate
  // rear glass + engine grille
  parts.push(box(1.9, 0.7, 0.07, 0, 1.95, -4.76, GLASS));
  parts.push(box(2.0, 0.5, 0.06, 0, 0.95, -4.78, DARK));
  // side rub rails
  parts.push(box(0.04, 0.08, 9.5, -1.26, 1.05, 0, CHROME));
  parts.push(box(0.04, 0.08, 9.5, 1.26, 1.05, 0, CHROME));
  // mirrors on arms
  for (const sx of [-1, 1]) {
    parts.push(box(0.5, 0.05, 0.05, sx * 1.45, 2.35, 4.55, DARK));
    parts.push(box(0.08, 0.34, 0.2, sx * 1.68, 2.2, 4.55, DARK));
    parts.push(box(0.03, 0.28, 0.16, sx * 1.71, 2.2, 4.55, "#aeb6bd"));
  }
  // entry door seam (front right)
  parts.push(box(0.03, 1.9, 0.02, 1.26, 1.35, 3.6, DARK));
  // mudflaps
  parts.push(box(0.55, 0.45, 0.06, -1.02, 0.42, -4.35, "#101114"));
  parts.push(box(0.55, 0.45, 0.06, 1.02, 0.42, -4.35, "#101114"));

  return mergeGeometries(parts)!;
}

function buildBus(): VehicleModelSet {
  const bodies = BUS_LIVERIES.map(buildBusBody);
  const headlights = mergeGeometries([
    paint(new THREE.BoxGeometry(0.42, 0.3, 0.07).translate(-0.78, 1.02, 4.78), "#fff6d8"),
    paint(new THREE.BoxGeometry(0.42, 0.3, 0.07).translate(0.78, 1.02, 4.78), "#fff6d8"),
  ])!;
  const taillights = mergeGeometries([
    paint(new THREE.BoxGeometry(0.32, 0.52, 0.07).translate(-0.98, 1.15, -4.78), "#ff2a1e"),
    paint(new THREE.BoxGeometry(0.32, 0.52, 0.07).translate(0.98, 1.15, -4.78), "#ff2a1e"),
  ])!;
  return {
    bodies,
    wheel: buildWheel(0.48, 0.34),
    wheelMounts: [
      { x: -1.02, y: 0.48, z: 3.2 },
      { x: 1.02, y: 0.48, z: 3.2 },
      { x: -1.02, y: 0.48, z: -2.7 },
      { x: 1.02, y: 0.48, z: -2.7 },
      { x: -1.02, y: 0.48, z: -3.9 },
      { x: 1.02, y: 0.48, z: -3.9 },
    ],
    headlights,
    taillights,
    sideDecal: buildSideDecal(8.6, 1.7, 1.62, 0, 1.25),
    sideDecalUrl: "/assets/traffic/bus-side.png",
    sideDecalVCrop: null,
    rearDecal: null,
    rearDecalUrl: null,
  };
}

/* ------------------------------------------------------------------ */
/* TRUCK — desi goods carrier (L 8.0, W 2.5)                           */
/* ------------------------------------------------------------------ */

const TRUCK_LIVERIES = [
  { cab: "#b3312a", cargo: "#7c5a33" }, // red cab
  { cab: "#2456a8", cargo: "#5f6b3a" }, // blue cab
  { cab: "#2f7d3a", cargo: "#8a6b3f" }, // green cab
];

function buildTruckBody(livery: (typeof TRUCK_LIVERIES)[number]): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const C = livery.cab;
  const G = livery.cargo;

  parts.push(box(2.0, 0.35, 7.6, 0, 0.62, -0.2, "#1d1f22")); // chassis
  // cab
  parts.push(box(2.5, 1.7, 2.3, 0, 1.7, 2.75, C)); // cab block
  parts.push(box(2.5, 0.14, 2.3, 0, 2.62, 2.75, "#d8dce0")); // cab roof
  parts.push(box(2.2, 0.5, 1.5, 0, 2.9, 2.35, C)); // roof deflector
  parts.push(box(2.2, 0.85, 0.07, 0, 2.0, 3.92, GLASS)); // windshield
  parts.push(box(0.06, 0.6, 1.15, -1.26, 2.0, 2.85, GLASS)); // cab side glass
  parts.push(box(0.06, 0.6, 1.15, 1.26, 2.0, 2.85, GLASS));
  parts.push(box(1.7, 0.55, 0.09, 0, 1.12, 3.96, CHROME)); // grille
  parts.push(box(2.56, 0.26, 0.2, 0, 0.6, 3.99, "#3a3e44")); // front bumper
  parts.push(box(0.5, 0.14, 0.03, 0, 0.62, 4.1, "#f2f2f2")); // front plate
  parts.push(box(0.2, 0.13, 0.07, -1.08, 0.88, 3.98, "#ff8c1a")); // indicators
  parts.push(box(0.2, 0.13, 0.07, 1.08, 0.88, 3.98, "#ff8c1a"));
  // cargo box
  parts.push(box(2.5, 2.2, 5.2, 0, 1.85, -1.2, G));
  parts.push(box(2.56, 0.14, 5.26, 0, 3.0, -1.2, "#4a3a24")); // top rail
  parts.push(box(2.56, 0.14, 5.26, 0, 0.78, -1.2, "#4a3a24")); // bottom rail
  // corner posts
  for (const sx of [-1, 1])
    for (const zz of [-3.7, 1.3])
      parts.push(box(0.1, 2.2, 0.1, sx * 1.26, 1.85, zz, "#4a3a24"));
  // rear light bar
  parts.push(box(2.3, 0.18, 0.08, 0, 0.85, -3.84, "#2b2e33"));
  // mirrors
  for (const sx of [-1, 1]) {
    parts.push(box(0.4, 0.05, 0.05, sx * 1.4, 2.3, 3.6, DARK));
    parts.push(box(0.08, 0.3, 0.18, sx * 1.58, 2.15, 3.6, DARK));
  }
  // exhaust stack behind cab
  parts.push(cylY(0.09, 1.7, 1.12, 1.9, 1.5, "#9aa0a6"));
  parts.push(cylY(0.11, 0.18, 1.12, 2.8, 1.5, "#6b7076"));
  // fuel tank
  parts.push(cylX(0.32, 1.2, -0.85, 0.78, 0.7, "#aab1b8"));
  parts.push(box(0.1, 0.1, 1.0, -0.85, 1.12, 0.7, DARK)); // tank strap
  // air horns on cab roof (desi touch)
  parts.push(cylZ(0.07, 0.55, -0.45, 2.78, 3.3, "#b08d3e"));
  parts.push(cylZ(0.07, 0.55, 0.45, 2.78, 3.3, "#b08d3e"));
  // mudflaps
  parts.push(box(0.55, 0.5, 0.06, -1.02, 0.45, -3.45, "#101114"));
  parts.push(box(0.55, 0.5, 0.06, 1.02, 0.45, -3.45, "#101114"));
  // rear underrun bar
  parts.push(box(2.2, 0.16, 0.1, 0, 0.5, -3.9, "#3a3e44"));

  return mergeGeometries(parts)!;
}

function buildTruck(): VehicleModelSet {
  const bodies = TRUCK_LIVERIES.map(buildTruckBody);
  const headlights = mergeGeometries([
    paint(new THREE.BoxGeometry(0.44, 0.32, 0.07).translate(-0.82, 1.5, 3.97), "#fff6d8"),
    paint(new THREE.BoxGeometry(0.44, 0.32, 0.07).translate(0.82, 1.5, 3.97), "#fff6d8"),
  ])!;
  const taillights = mergeGeometries([
    paint(new THREE.BoxGeometry(0.3, 0.42, 0.07).translate(-1.02, 1.15, -3.85), "#ff2a1e"),
    paint(new THREE.BoxGeometry(0.3, 0.42, 0.07).translate(1.02, 1.15, -3.85), "#ff2a1e"),
  ])!;
  return {
    bodies,
    wheel: buildWheel(0.48, 0.34),
    wheelMounts: [
      { x: -1.02, y: 0.48, z: 2.75 },
      { x: 1.02, y: 0.48, z: 2.75 },
      { x: -1.02, y: 0.48, z: -1.7 },
      { x: 1.02, y: 0.48, z: -1.7 },
      { x: -1.02, y: 0.48, z: -3.0 },
      { x: 1.02, y: 0.48, z: -3.0 },
    ],
    headlights,
    taillights,
    sideDecal: buildSideDecal(4.9, 1.8, 1.85, -1.2, 1.25),
    sideDecalUrl: "/assets/traffic/truck-cargo-side.png",
    sideDecalVCrop: null,
    rearDecal: buildRearDecal(2.3, 1.8, 1.85, -3.8),
    rearDecalUrl: "/assets/traffic/truck-rear.png",
  };
}

/* ------------------------------------------------------------------ */

const cache = new Map<TrafficVehicleType, VehicleModelSet>();

export function getVehicleModels(type: TrafficVehicleType): VehicleModelSet {
  let m = cache.get(type);
  if (!m) {
    m = type === "car" ? buildCar() : type === "bus" ? buildBus() : buildTruck();
    cache.set(type, m);
  }
  return m;
}

export function disposeVehicleModels(): void {
  for (const m of cache.values()) {
    for (const b of m.bodies) b.dispose();
    m.wheel.dispose();
    m.headlights.dispose();
    m.taillights.dispose();
    m.sideDecal?.dispose();
    m.rearDecal?.dispose();
  }
  cache.clear();
}
