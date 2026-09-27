"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useWeatherStore, TIME_LIGHTING_CONFIGS } from "@/lib/weather-store";
import { xform } from "@/lib/cockpit-assets";
import { useDriveStore } from "@/lib/drive-store";

// ----------------------------------------------------
// 1. Dynamic Atmospheric Sky Dome (Natural White / Blue Daylight)
// ----------------------------------------------------
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
  uniform vec3 uCloud;
  uniform float uStorm;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col;
    if (h >= 0.0) {
      col = mix(uHorizon, uTop, smoothstep(0.0, 0.55, h));
      // Atmospheric soft cloud wisps in upper sky
      float cl = sin(d.x * 6.0 + 1.2) * sin(d.z * 7.5 + 0.3)
               + 0.5 * sin((d.x + d.z) * 3.8 + 1.8);
      cl = smoothstep(0.25, 0.85, cl) * smoothstep(0.05, 0.5, h);
      col = mix(col, uCloud, cl * (0.35 + uStorm * 0.4));
    } else {
      // Below horizon: seamlessly continue the horizon sky color all the way down
      col = uHorizon;
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
          uCloud: { value: new THREE.Color(cfg.skyCloud) },
          uStorm: { value: cfg.isRain ? 1.0 : 0.0 },
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
    material.uniforms.uCloud.value.set(cfg.skyCloud);
    material.uniforms.uStorm.value = cfg.isRain ? 1.0 : 0.0;
  }, [cfg, material]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[750, 32, 20]} />
    </mesh>
  );
}

// ----------------------------------------------------
// 2. Low-Poly Volumetric Clouds (Overhead)
// ----------------------------------------------------
function makeLowPolyCloudCluster(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const count = 18;
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  for (let i = 0; i < count; i++) {
    const r = 4.5 + rand() * 4.0;
    const geo = new THREE.DodecahedronGeometry(r, 0);
    const px = (rand() - 0.5) * 32.0;
    const py = (rand() - 0.5) * 6.0;
    const pz = (rand() - 0.5) * 28.0;
    parts.push(xform(geo, px, py, pz));
  }
  return mergeGeometries(parts)!;
}

const CLOUD_COUNT = 16;

function LowPolyStormClouds() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeOfDay = useWeatherStore((s) => s.timeOfDay);
  const cfg = TIME_LIGHTING_CONFIGS[timeOfDay];

  const { geometry, placements } = useMemo(() => {
    const geometry = makeLowPolyCloudCluster();
    const placements: { x: number; y: number; z: number; s: number; ry: number }[] = [];
    let seed = 88991;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const x = (rand() - 0.5) * 450;
      const y = 32 + rand() * 18;
      const z = -40 - rand() * 380;
      const s = 1.2 + rand() * 1.5;
      const ry = rand() * Math.PI * 2;
      placements.push({ x, y, z, s, ry });
    }
    return { geometry, placements };
  }, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color(cfg.cloudColor);

    placements.forEach((p, i) => {
      e.set(0, p.ry, 0);
      q.setFromEuler(e);
      v.set(p.x, p.y, p.z);
      s.set(p.s, p.s * 0.7, p.s);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [placements, cfg]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.z = (state.clock.elapsedTime * 2.2) % 60;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, CLOUD_COUNT]}
      frustumCulled={false}
    >
      <meshLambertMaterial color={cfg.cloudColor} flatShading />
    </instancedMesh>
  );
}

// ----------------------------------------------------
// 3. 3D Volumetric Natural Rain (Scattered across entire 3D atmosphere)
// ----------------------------------------------------
const LINE_RAIN_COUNT = 850;

function LineRain() {
  const rainIntensity = useWeatherStore((s) => s.rainIntensity);
  const isRain = rainIntensity > 0.1;
  const linesRef = useRef<THREE.LineSegments>(null);

  // Each rain line has 2 vertices (top & bottom) -> 6 floats per line
  const { positions, particles } = useMemo(() => {
    const pos = new Float32Array(LINE_RAIN_COUNT * 6);
    const parts: { x: number; y: number; z: number; vy: number; vx: number; len: number; phase: number }[] = [];

    let seed = 44556;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    for (let i = 0; i < LINE_RAIN_COUNT; i++) {
      // Uniformly scatter across the entire 3D frustum
      const x = (rand() - 0.5) * 88;
      const y = rand() * 34 - 1.0; // Random heights so no initial sheet
      const z = -rand() * 82 + 2.0; // From camera origin out to horizon
      const vy = 28 + rand() * 22; // Varied terminal velocity
      const vx = (rand() - 0.5) * 2.8 - 1.2; // Natural drift
      const len = 0.75 + rand() * 0.95; // Varied streak lengths
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

      // Independent continuous respawn anywhere across the 3D volume
      if (p.y < -2.5) {
        // Hit ground: respawn up in cloud deck at a completely RANDOM depth
        p.y = 22 + rand() * 12;
        p.z = -rand() * 85 + 2.0; // Random depth everywhere!
        p.x = (rand() - 0.5) * 88;
        p.vy = 28 + rand() * 22;
        p.len = 0.75 + rand() * 0.95;
      } else if (p.z > 2.5) {
        // Passed behind camera: respawn ahead at a completely RANDOM height
        p.z = -55 - rand() * 28;
        p.y = rand() * 30 + 1.0;
        p.x = (rand() - 0.5) * 88;
      } else if (Math.abs(p.x) > 46) {
        p.x = (rand() - 0.5) * 88;
        p.y = rand() * 30 + 1.0;
        p.z = -rand() * 85 + 2.0;
      }

      // Micro-turbulence angle
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

// ----------------------------------------------------
// 4. Dynamic Bus Headlights (High Beams)
// ----------------------------------------------------
function BusHeadlights() {
  const headlights = useWeatherStore((s) => s.headlights);
  const active = headlights;

  if (!active) return null;

  return (
    <group position={[0, 1.2, 0]}>
      {/* Left Headlight Beam */}
      <spotLight
        position={[-1.1, 0, 0]}
        target-position={[-0.8, -0.4, -38]}
        angle={0.42}
        penumbra={0.65}
        intensity={7.5}
        color="#fff5d8"
        distance={95}
      />
      {/* Right Headlight Beam */}
      <spotLight
        position={[1.1, 0, 0]}
        target-position={[0.8, -0.4, -38]}
        angle={0.42}
        penumbra={0.65}
        intensity={7.5}
        color="#fff5d8"
        distance={95}
      />
      {/* Forward Road Asphalt Warm Glow */}
      <pointLight position={[0, 0.4, -14]} intensity={2.8} distance={28} color="#ffe8b8" />
    </group>
  );
}

export default function Environment() {
  return (
    <group>
      <SkyDome />
      <LowPolyStormClouds />
      <LineRain />
      <BusHeadlights />
    </group>
  );
}
