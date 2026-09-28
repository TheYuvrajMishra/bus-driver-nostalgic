"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useWeatherStore, TIME_LIGHTING_CONFIGS } from "@/lib/weather-store";
import { useLightningStore } from "@/lib/lightning-system";
import { xform } from "@/lib/cockpit-assets";
import { useDriveStore } from "@/lib/drive-store";

// -----------------------------------------------------------------------------
// 1. Saturated Azure Daylight Sky Dome
// -----------------------------------------------------------------------------
const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col;
    if (h >= 0.0) {
      // Saturated azure blue at zenith smoothly transitioning to brilliant light sky blue
      float t = pow(clamp(h, 0.0, 1.0), 0.72);
      col = mix(uHorizon, uTop, t);
    } else {
      // Sky continuing smoothly below the horizon into soft atmospheric haze
      float t = clamp(-h * 1.8, 0.0, 1.0);
      col = mix(uHorizon, uBottom, t);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

function SkyDome() {
  const timeOfDay = useWeatherStore((s) => s.timeOfDay);
  const cfg = TIME_LIGHTING_CONFIGS[timeOfDay];

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        uniforms: {
          uTop: { value: new THREE.Color(cfg.skyTop) },
          uHorizon: { value: new THREE.Color(cfg.skyHorizon) },
          uBottom: { value: new THREE.Color(cfg.skyBottom) },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    []
  );

  useEffect(() => {
    material.uniforms.uTop.value.set(cfg.skyTop);
    material.uniforms.uHorizon.value.set(cfg.skyHorizon);
    material.uniforms.uBottom.value.set(cfg.skyBottom);
  }, [cfg, material]);

  useFrame(() => {
    const flash = useLightningStore.getState().lightningFlash;
    if (flash > 0.01) {
      const topCol = new THREE.Color(cfg.skyTop).lerp(
        new THREE.Color("#90afce"),
        flash * 0.7
      );
      const horizCol = new THREE.Color(cfg.skyHorizon).lerp(
        new THREE.Color("#c6dff8"),
        flash * 0.85
      );
      material.uniforms.uTop.value.copy(topCol);
      material.uniforms.uHorizon.value.copy(horizCol);
    } else {
      material.uniforms.uTop.value.set(cfg.skyTop);
      material.uniforms.uHorizon.value.set(cfg.skyHorizon);
    }
  });

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[920, 32, 24]} />
    </mesh>
  );
}

// -----------------------------------------------------------------------------
// 2. Large Voluminous Low-Poly Cumulus Clouds (Sunny-Day Lit)
// -----------------------------------------------------------------------------
function makeCloudSubMesh(
  geo: THREE.BufferGeometry,
  topCol: string,
  botCol: string,
  px = 0,
  py = 0,
  pz = 0,
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
  g.translate(px, py, pz);

  const top = new THREE.Color(topCol);
  const bot = new THREE.Color(botCol);
  const pos = g.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const y = pos.getY(i) - py;
    const factor = Math.max(0, Math.min(1, (y + 12) / 24));
    const c = top.clone().lerp(bot, 1.0 - factor);
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

// ----------------------------------------------------------------------------
// Faceted low-poly clouds (crisp geometric style) — instanced for performance.
// Vertex colors baked by face normal: white tops, pale blue-grey shaded sides.
// Instance color tints per weather (white in sun, dark grey in rain).
// ----------------------------------------------------------------------------
function makeFacetedCloud(seedOffset = 0): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  let seed = 54321 + seedOffset;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  // Cluster of flattened polyhedra — wide, clean cloud slab (reference style)
  const puffs = 5 + Math.floor(rand() * 2);
  for (let i = 0; i < puffs; i++) {
    const angle = (i / puffs) * Math.PI * 2 + rand() * 0.6;
    const dist = rand() * 12;
    const px = Math.cos(angle) * dist;
    const pz = Math.sin(angle) * dist * 0.5;
    const py = (rand() - 0.35) * 3.0;
    const r = 6.5 + rand() * 4.0;

    // Dodecahedron = larger, crisper facets than icosahedron
    const g = new THREE.DodecahedronGeometry(r, 0);
    // Flatten vertically for the classic wide cloud slab look
    g.scale(1.45, 0.48, 1.0);
    g.translate(px, py, pz);

    // Bake facet colors by face normal: white tops, blue-grey sides/underside.
    // toNonIndexed + computeVertexNormals => true flat facets (crisp, no smoothing)
    const geo = g.index ? g.toNonIndexed() : g;
    geo.computeVertexNormals();
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const colors = new Float32Array(pos.count * 3);
    const top = new THREE.Color("#ffffff");
    const side = new THREE.Color("#a9c3e2");
    const bottom = new THREE.Color("#8ba7cf");
    const c = new THREE.Color();
    for (let v = 0; v < pos.count; v++) {
      const ny = norm.getY(v);
      if (ny > 0.45) c.copy(top);
      else if (ny > -0.25) c.copy(side).lerp(top, Math.max(0, (ny + 0.25) / 0.7) * 0.5);
      else c.copy(bottom);
      colors[v * 3] = c.r;
      colors[v * 3 + 1] = c.g;
      colors[v * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.deleteAttribute("uv");
    parts.push(geo);
  }

  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

const FACETED_CLOUD_POSITIONS = [
  // Near-mid sky — big hero clouds (reference-style presence)
  { x: -130, y: 32, z: -150, s: 4.6, ry: 0.4 },
  { x: 30, y: 42, z: -190, s: 4.0, ry: 1.2 },
  { x: 165, y: 35, z: -160, s: 4.8, ry: -0.5 },
  { x: -45, y: 25, z: -120, s: 3.4, ry: 2.1 },
  { x: 95, y: 48, z: -230, s: 3.8, ry: 0.6 },
  // Mid layer
  { x: -220, y: 45, z: -300, s: 4.2, ry: 0.9 },
  { x: 240, y: 50, z: -320, s: 4.4, ry: -1.1 },
  { x: 0, y: 40, z: -340, s: 3.8, ry: 1.6 },
  { x: -90, y: 55, z: -260, s: 3.2, ry: -0.7 },
  // Distant horizon layer
  { x: -330, y: 60, z: -480, s: 4.6, ry: 2.8 },
  { x: 340, y: 65, z: -500, s: 4.8, ry: -2.2 },
  { x: 120, y: 70, z: -450, s: 4.0, ry: 0.2 },
];

function FacetedClouds() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeOfDay = useWeatherStore((s) => s.timeOfDay);
  const cfg = TIME_LIGHTING_CONFIGS[timeOfDay];

  const cloudGeo = useMemo(() => makeFacetedCloud(0), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color(cfg.cloudColor);

    FACETED_CLOUD_POSITIONS.forEach((p, i) => {
      e.set(0, p.ry, 0);
      q.setFromEuler(e);
      v.set(p.x, p.y, p.z);
      s.set(p.s, p.s, p.s);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cloudGeo, cfg]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.z = (state.clock.elapsedTime * 1.4) % 70;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[cloudGeo, undefined, FACETED_CLOUD_POSITIONS.length]}
      frustumCulled={false}
    >
      {/* Unlit = always bright white, crisp facets via baked vertex colors */}
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
}


// -----------------------------------------------------------------------------
// 4. Volumetric Natural Rain (Secondary Mode)
// -----------------------------------------------------------------------------
const LINE_RAIN_COUNT = 850;

function LineRain() {
  const rainIntensity = useWeatherStore((s) => s.rainIntensity);
  const isRain = rainIntensity > 0.1;
  const linesRef = useRef<THREE.LineSegments>(null);

  const { positions, particles } = useMemo(() => {
    const pos = new Float32Array(LINE_RAIN_COUNT * 6);
    const parts: { x: number; y: number; z: number; vy: number; vx: number; len: number; phase: number }[] = [];

    let seed = 44556;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    for (let i = 0; i < LINE_RAIN_COUNT; i++) {
      const x = (rand() - 0.5) * 88;
      const y = rand() * 34 - 1.0;
      const z = -rand() * 82 + 2.0;
      const vy = 28 + rand() * 22;
      const vx = (rand() - 0.5) * 2.8 - 1.2;
      const len = 0.75 + rand() * 0.95;
      const phase = rand() * Math.PI * 2;
      parts.push({ x, y, z, vy, vx, len, phase });

      pos[i * 6 + 0] = x;
      pos[i * 6 + 1] = y;
      pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x + vx * 0.04;
      pos[i * 6 + 4] = y - len;
      pos[i * 6 + 5] = z + 0.12;
    }
    return { positions: pos, particles: parts };
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#cfe4fa",
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    []
  );

  useFrame((state, delta) => {
    if (!isRain || !linesRef.current) return;
    const speed = useDriveStore.getState().speed;
    const posAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const speedZ = speed * 1.5 + 5.0;
    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;

    let seed = (time * 1000) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    for (let i = 0; i < LINE_RAIN_COUNT; i++) {
      const p = particles[i];
      p.y -= p.vy * dt;
      p.z += speedZ * dt;
      p.x += p.vx * dt;

      if (p.y < -2.5) {
        p.y = 22 + rand() * 12;
        p.z = -rand() * 85 + 2.0;
        p.x = (rand() - 0.5) * 88;
        p.vy = 28 + rand() * 22;
        p.len = 0.75 + rand() * 0.95;
      } else if (p.z > 2.5) {
        p.z = -55 - rand() * 28;
        p.y = rand() * 30 + 1.0;
        p.x = (rand() - 0.5) * 88;
      } else if (Math.abs(p.x) > 46) {
        p.x = (rand() - 0.5) * 88;
        p.y = rand() * 30 + 1.0;
        p.z = -rand() * 85 + 2.0;
      }

      const turbulence = Math.sin(time * 2.5 + p.phase) * 0.08;
      const slantX = (p.vx * 0.04 + turbulence) * p.len;
      const slantZ = (speedZ / 32.0) * 0.5 * p.len;

      const idx = i * 6;
      arr[idx + 0] = p.x;
      arr[idx + 1] = p.y;
      arr[idx + 2] = p.z;
      arr[idx + 3] = p.x + slantX;
      arr[idx + 4] = p.y - p.len;
      arr[idx + 5] = p.z + slantZ;
    }
    posAttr.needsUpdate = true;
  });

  if (!isRain) return null;

  return <lineSegments ref={linesRef} geometry={geo} material={mat} frustumCulled={false} />;
}

// -----------------------------------------------------------------------------
// 5. Dynamic Bus Headlights (High Beams)
// -----------------------------------------------------------------------------
function BusHeadlights() {
  const headlights = useWeatherStore((s) => s.headlights);
  const active = headlights;

  if (!active) return null;

  return (
    <group position={[0, 1.2, 0]}>
      <spotLight
        position={[-1.1, 0, 0]}
        target-position={[-0.8, -0.4, -38]}
        angle={0.42}
        penumbra={0.65}
        intensity={7.5}
        color="#fff5d8"
        distance={95}
        castShadow={false}
      />
      <spotLight
        position={[1.1, 0, 0]}
        target-position={[0.8, -0.4, -38]}
        angle={0.42}
        penumbra={0.65}
        intensity={7.5}
        color="#fff5d8"
        distance={95}
        castShadow={false}
      />
      <pointLight position={[0, 0.4, -14]} intensity={2.8} distance={28} color="#ffe8b8" castShadow={false} />
    </group>
  );
}

export default function Environment() {
  return (
    <group>
      <SkyDome />
      <FacetedClouds />
      <LineRain />
      <BusHeadlights />
    </group>
  );
}
