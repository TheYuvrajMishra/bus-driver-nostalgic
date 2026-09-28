import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Helper to paint vertex colors and transform geometry parts
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
// 1. Decorated Indian Highway Truck (Tata / Ashok Leyland)
// -----------------------------------------------------------------------------
let truckGeo: THREE.BufferGeometry | null = null;
export function getTrafficTruckGeometry(): THREE.BufferGeometry {
  if (!truckGeo) {
    const parts: THREE.BufferGeometry[] = [];

    // Main Chassis frame
    parts.push(paint(new THREE.BoxGeometry(1.8, 0.4, 7.6), "#1e1e1e", 0, 0.45, 0));

    // Front Cabin (Mustard Yellow / Bright Orange)
    parts.push(paint(new THREE.BoxGeometry(2.3, 2.0, 2.4), "#f59e0b", 0, 1.6, -2.4));

    // Cabin Brow / Sunvisor (Red/White patterned peak)
    parts.push(paint(new THREE.BoxGeometry(2.36, 0.35, 0.8), "#dc2626", 0, 2.7, -2.9, 0.2));

    // Front Windshield (Reflective Blue/Cyan)
    parts.push(paint(new THREE.BoxGeometry(2.0, 0.9, 0.1), "#38bdf8", 0, 1.85, -3.61));

    // Front Grille & Chrome Bumper
    parts.push(paint(new THREE.BoxGeometry(1.9, 0.65, 0.15), "#d1d5db", 0, 0.9, -3.62));
    parts.push(paint(new THREE.BoxGeometry(2.4, 0.35, 0.4), "#9ca3af", 0, 0.45, -3.7));

    // Headlights (Warm White / Yellow)
    parts.push(paint(new THREE.BoxGeometry(0.35, 0.3, 0.1), "#fef08a", -0.85, 0.9, -3.66));
    parts.push(paint(new THREE.BoxGeometry(0.35, 0.3, 0.1), "#fef08a", 0.85, 0.9, -3.66));

    // High Cargo Carrier Box (Wood plank pattern / Royal Blue / Deep Red)
    parts.push(paint(new THREE.BoxGeometry(2.35, 2.3, 4.8), "#1d4ed8", 0, 1.8, 1.2));

    // Top Carrier Rack / Luggage Canopy
    parts.push(paint(new THREE.BoxGeometry(2.2, 0.4, 4.6), "#eab308", 0, 3.1, 1.2));

    // Rear Tailgate Banner ("HORN OK PLEASE" Yellow/Red chevron panel)
    parts.push(paint(new THREE.BoxGeometry(2.36, 0.9, 0.1), "#ef4444", 0, 1.3, 3.61));
    parts.push(paint(new THREE.BoxGeometry(1.8, 0.4, 0.12), "#fef08a", 0, 1.35, 3.62));

    // Mudflaps (Black Rubber with White stripes)
    parts.push(paint(new THREE.BoxGeometry(0.55, 0.6, 0.05), "#18181b", -0.85, 0.4, 3.7));
    parts.push(paint(new THREE.BoxGeometry(0.55, 0.6, 0.05), "#18181b", 0.85, 0.4, 3.7));

    // Wheels (Front single pair, Rear dual axle pairs)
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 10);
    // Front Wheels
    parts.push(paint(wheelGeo, "#27272a", -1.15, 0.48, -2.4, 0, 0, Math.PI / 2));
    parts.push(paint(wheelGeo, "#27272a", 1.15, 0.48, -2.4, 0, 0, Math.PI / 2));
    // Rear Axle 1
    parts.push(paint(wheelGeo, "#27272a", -1.15, 0.48, 1.8, 0, 0, Math.PI / 2));
    parts.push(paint(wheelGeo, "#27272a", 1.15, 0.48, 1.8, 0, 0, Math.PI / 2));
    // Rear Axle 2
    parts.push(paint(wheelGeo, "#27272a", -1.15, 0.48, 2.9, 0, 0, Math.PI / 2));
    parts.push(paint(wheelGeo, "#27272a", 1.15, 0.48, 2.9, 0, 0, Math.PI / 2));

    const merged = mergeGeometries(parts, false);
    merged.computeVertexNormals();
    truckGeo = merged;
  }
  return truckGeo;
}

// -----------------------------------------------------------------------------
// 2. Indian Highway Passenger Bus
// -----------------------------------------------------------------------------
let busGeo: THREE.BufferGeometry | null = null;
export function getTrafficBusGeometry(): THREE.BufferGeometry {
  if (!busGeo) {
    const parts: THREE.BufferGeometry[] = [];

    // Main Bus Body (Teal / Emerald Green or Maroon)
    parts.push(paint(new THREE.BoxGeometry(2.35, 2.4, 9.2), "#047857", 0, 1.8, 0));

    // White Roof Cap
    parts.push(paint(new THREE.BoxGeometry(2.36, 0.3, 9.0), "#f8fafc", 0, 3.05, 0));

    // Front Windshield (Slanted)
    parts.push(paint(new THREE.BoxGeometry(2.1, 1.1, 0.1), "#38bdf8", 0, 2.1, -4.61));

    // Destination Board above Windshield ("DELHI - JAIPUR")
    parts.push(paint(new THREE.BoxGeometry(1.6, 0.35, 0.1), "#fef08a", 0, 2.85, -4.61));

    // Side Window Bands (Left & Right)
    parts.push(paint(new THREE.BoxGeometry(0.1, 0.75, 7.8), "#0284c7", -1.18, 2.0, 0.2));
    parts.push(paint(new THREE.BoxGeometry(0.1, 0.75, 7.8), "#0284c7", 1.18, 2.0, 0.2));

    // Rear Window
    parts.push(paint(new THREE.BoxGeometry(1.9, 0.75, 0.1), "#0284c7", 0, 2.1, 4.61));

    // Front Bumper & Headlights
    parts.push(paint(new THREE.BoxGeometry(2.4, 0.4, 0.3), "#9ca3af", 0, 0.5, -4.7));
    parts.push(paint(new THREE.BoxGeometry(0.3, 0.25, 0.1), "#fef08a", -0.85, 0.85, -4.65));
    parts.push(paint(new THREE.BoxGeometry(0.3, 0.25, 0.1), "#fef08a", 0.85, 0.85, -4.65));

    // Roof Luggage Carrier with Canvas Tarpaulins
    parts.push(paint(new THREE.BoxGeometry(2.0, 0.2, 5.0), "#475569", 0, 3.25, 0.6));
    parts.push(paint(new THREE.BoxGeometry(1.8, 0.45, 2.2), "#b45309", 0, 3.5, 0.2));
    parts.push(paint(new THREE.BoxGeometry(1.7, 0.4, 1.8), "#0284c7", 0, 3.45, 1.8));

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 10);
    // Front
    parts.push(paint(wheelGeo, "#1e293b", -1.15, 0.48, -3.2, 0, 0, Math.PI / 2));
    parts.push(paint(wheelGeo, "#1e293b", 1.15, 0.48, -3.2, 0, 0, Math.PI / 2));
    // Rear
    parts.push(paint(wheelGeo, "#1e293b", -1.15, 0.48, 2.8, 0, 0, Math.PI / 2));
    parts.push(paint(wheelGeo, "#1e293b", 1.15, 0.48, 2.8, 0, 0, Math.PI / 2));

    const merged = mergeGeometries(parts, false);
    merged.computeVertexNormals();
    busGeo = merged;
  }
  return busGeo;
}

// -----------------------------------------------------------------------------
// 3. Indian Auto-Rickshaw (3-Wheeler)
// -----------------------------------------------------------------------------
let rickshawGeo: THREE.BufferGeometry | null = null;
export function getTrafficRickshawGeometry(): THREE.BufferGeometry {
  if (!rickshawGeo) {
    const parts: THREE.BufferGeometry[] = [];

    // Lower Green Body Tub
    parts.push(paint(new THREE.BoxGeometry(1.3, 0.7, 2.4), "#15803d", 0, 0.55, 0));

    // Yellow Canopy Roof
    parts.push(paint(new THREE.BoxGeometry(1.32, 0.85, 1.8), "#eab308", 0, 1.45, 0.3));

    // Black Canvas Rear Hood
    parts.push(paint(new THREE.BoxGeometry(1.3, 0.6, 0.1), "#18181b", 0, 1.25, 1.21));

    // Front Slanted Windshield Frame
    parts.push(paint(new THREE.BoxGeometry(1.1, 0.65, 0.1), "#38bdf8", 0, 1.25, -0.65, 0.2));

    // Front Mudguard & Single Headlamp
    parts.push(paint(new THREE.BoxGeometry(0.35, 0.3, 0.6), "#18181b", 0, 0.45, -1.2));
    parts.push(paint(new THREE.BoxGeometry(0.25, 0.25, 0.1), "#fef08a", 0, 0.7, -1.25));

    // 3 Wheels (1 front center, 2 rear)
    const wheelSmall = new THREE.CylinderGeometry(0.26, 0.26, 0.18, 8);
    // Front Center Wheel
    parts.push(paint(wheelSmall, "#27272a", 0, 0.26, -1.15, 0, 0, Math.PI / 2));
    // Rear Wheels
    parts.push(paint(wheelSmall, "#27272a", -0.65, 0.26, 0.75, 0, 0, Math.PI / 2));
    parts.push(paint(wheelSmall, "#27272a", 0.65, 0.26, 0.75, 0, 0, Math.PI / 2));

    const merged = mergeGeometries(parts, false);
    merged.computeVertexNormals();
    rickshawGeo = merged;
  }
  return rickshawGeo;
}

// -----------------------------------------------------------------------------
// 4. Vintage Indian Highway Car / Taxi (Premier Padmini / Ambassador)
// -----------------------------------------------------------------------------
let carGeo: THREE.BufferGeometry | null = null;
export function getTrafficCarGeometry(): THREE.BufferGeometry {
  if (!carGeo) {
    const parts: THREE.BufferGeometry[] = [];

    // Lower Main Body (White / Taxi Yellow-Black / Silver)
    parts.push(paint(new THREE.BoxGeometry(1.7, 0.6, 4.2), "#f8fafc", 0, 0.55, 0));

    // Passenger Cabin Roof & Pillars
    parts.push(paint(new THREE.BoxGeometry(1.5, 0.65, 2.1), "#f1f5f9", 0, 1.15, 0.1));

    // Windshields (Front & Rear)
    parts.push(paint(new THREE.BoxGeometry(1.4, 0.5, 0.1), "#38bdf8", 0, 1.05, -0.98, 0.3));
    parts.push(paint(new THREE.BoxGeometry(1.4, 0.45, 0.1), "#38bdf8", 0, 1.05, 1.18, -0.3));

    // Front Bumper & Chrome Grille
    parts.push(paint(new THREE.BoxGeometry(1.72, 0.22, 0.15), "#9ca3af", 0, 0.42, -2.15));
    parts.push(paint(new THREE.BoxGeometry(1.2, 0.3, 0.1), "#d1d5db", 0, 0.6, -2.12));

    // Round Headlights
    parts.push(paint(new THREE.BoxGeometry(0.24, 0.24, 0.1), "#fef08a", -0.62, 0.62, -2.13));
    parts.push(paint(new THREE.BoxGeometry(0.24, 0.24, 0.1), "#fef08a", 0.62, 0.62, -2.13));

    // Rear Bumper
    parts.push(paint(new THREE.BoxGeometry(1.72, 0.22, 0.15), "#9ca3af", 0, 0.42, 2.15));

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 9);
    // Front
    parts.push(paint(wheelGeo, "#1e293b", -0.85, 0.32, -1.25, 0, 0, Math.PI / 2));
    parts.push(paint(wheelGeo, "#1e293b", 0.85, 0.32, -1.25, 0, 0, Math.PI / 2));
    // Rear
    parts.push(paint(wheelGeo, "#1e293b", -0.85, 0.32, 1.25, 0, 0, Math.PI / 2));
    parts.push(paint(wheelGeo, "#1e293b", 0.85, 0.32, 1.25, 0, 0, Math.PI / 2));

    const merged = mergeGeometries(parts, false);
    merged.computeVertexNormals();
    carGeo = merged;
  }
  return carGeo;
}

// -----------------------------------------------------------------------------
// 5. Indian Highway Scooter / Two-Wheeler
// -----------------------------------------------------------------------------
let scooterGeo: THREE.BufferGeometry | null = null;
export function getTrafficScooterGeometry(): THREE.BufferGeometry {
  if (!scooterGeo) {
    const parts: THREE.BufferGeometry[] = [];

    // Front Apron Shield (Vintage Blue / Maroon)
    parts.push(paint(new THREE.BoxGeometry(0.55, 0.75, 0.1), "#0284c7", 0, 0.7, -0.65, 0.15));

    // Handlebars & Headlamp
    parts.push(paint(new THREE.BoxGeometry(0.7, 0.12, 0.15), "#d1d5db", 0, 1.15, -0.55));
    parts.push(paint(new THREE.BoxGeometry(0.18, 0.18, 0.1), "#fef08a", 0, 1.15, -0.63));

    // Floorboard & Side Engine Cowl
    parts.push(paint(new THREE.BoxGeometry(0.45, 0.15, 1.1), "#334155", 0, 0.35, -0.1));
    parts.push(paint(new THREE.BoxGeometry(0.55, 0.45, 0.8), "#0284c7", 0, 0.55, 0.35));

    // Long Seat Cushion
    parts.push(paint(new THREE.BoxGeometry(0.38, 0.18, 0.75), "#18181b", 0, 0.82, 0.3));

    // Low-Poly Rider Silhouette (Torso & Helmet)
    parts.push(paint(new THREE.BoxGeometry(0.42, 0.65, 0.3), "#475569", 0, 1.2, 0.2));
    parts.push(paint(new THREE.SphereGeometry(0.2, 6, 5), "#f59e0b", 0, 1.68, 0.15));

    // 2 Small Wheels
    const wheelSmall = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 8);
    parts.push(paint(wheelSmall, "#1e293b", 0, 0.22, -0.65, 0, 0, Math.PI / 2));
    parts.push(paint(wheelSmall, "#1e293b", 0, 0.22, 0.65, 0, 0, Math.PI / 2));

    const merged = mergeGeometries(parts, false);
    merged.computeVertexNormals();
    scooterGeo = merged;
  }
  return scooterGeo;
}

// -----------------------------------------------------------------------------
// Emissive Indicator / Brake Light Geometry
// -----------------------------------------------------------------------------
let brakeLightGeo: THREE.BufferGeometry | null = null;
export function getBrakeLightGeometry(): THREE.BufferGeometry {
  if (!brakeLightGeo) {
    // 2 red light quads positioned at vehicle rear corners
    const left = paint(new THREE.BoxGeometry(0.24, 0.18, 0.08), "#ff1e1e", -0.82, 0, 0);
    const right = paint(new THREE.BoxGeometry(0.24, 0.18, 0.08), "#ff1e1e", 0.82, 0, 0);
    brakeLightGeo = mergeGeometries([left, right], false);
  }
  return brakeLightGeo;
}

let blinkerLightGeo: THREE.BufferGeometry | null = null;
export function getBlinkerLightGeometry(): THREE.BufferGeometry {
  if (!blinkerLightGeo) {
    // Amber light quad for turn signals
    blinkerLightGeo = paint(new THREE.BoxGeometry(0.18, 0.15, 0.08), "#ffb703", 0, 0, 0);
  }
  return blinkerLightGeo;
}
