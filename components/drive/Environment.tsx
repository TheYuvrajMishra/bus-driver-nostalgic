"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useWeatherStore, TIME_LIGHTING_CONFIGS } from "@/lib/weather-store";
import { getSandTexture, xform } from "@/lib/cockpit-assets";
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
    vec3 col = mix(uHorizon, uTop, smoothstep(0.01, 0.48, h));
    col = mix(uHorizon * 0.95, col, smoothstep(-0.08, 0.01, h));
    
    // Atmospheric low-poly cloud band
    float cl = sin(d.x * 6.0 + 1.2) * sin(d.z * 7.5 + 0.3)
             + 0.5 * sin((d.x + d.z) * 3.8 + 1.8)
             + 0.25 * sin(d.x * 12.0 - d.z * 10.0);
    cl = smoothstep(0.18, 0.88, cl) * smoothstep(0.02, 0.45, h);
    
    col = mix(col, uCloud, cl * (0.35 + uStorm * 0.4));
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
// 3. Faceted Low-Poly Natural Mountains & Dunes
// ----------------------------------------------------
function makeFacetedPeak(): THREE.BufferGeometry {
  let seed = 424242;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const jitter = (geo: THREE.BufferGeometry, amt: number) => {
    const p = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > -0.3) {
        p.setX(i, p.getX(i) + (rand() - 0.5) * amt);
        p.setZ(i, p.getZ(i) + (rand() - 0.5) * amt);
        p.setY(i, p.getY(i) + (rand() - 0.5) * amt * 0.7);
      }
    }
    geo.computeVertexNormals();
    return geo;
  };
  const parts = [
    xform(jitter(new THREE.ConeGeometry(1.0, 1.0, 7, 1), 0.28), 0, 0.5, 0),
    xform(jitter(new THREE.ConeGeometry(0.75, 0.85, 6, 1), 0.22), 0.95, 0.42, 0.35),
    xform(jitter(new THREE.ConeGeometry(0.7, 0.7, 6, 1), 0.24), -0.9, 0.35, -0.3),
    xform(jitter(new THREE.ConeGeometry(0.55, 0.55, 5, 1), 0.2), 0.25, 0.28, 0.75),
    xform(jitter(new THREE.ConeGeometry(0.6, 0.6, 5, 1), 0.2), -0.35, 0.3, 0.85),
  ];
  return mergeGeometries(parts)!;
}

const MOUNTAIN_COUNT = 32;

function Mountains() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const { geometry, placements } = useMemo(() => {
    let seed = 777001;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const geometry = makeFacetedPeak();
    const placements: { x: number; z: number; w: number; h: number; ry: number; tint: string }[] = [];
    
    // Natural sandstone, earth, and ridge colors (clean, non-orange)
    const tints = [
      "#9e9282", // sandstone grey-tan
      "#8c8072", // earthy ridge
      "#7d7265", // deep ridge
      "#b3a798", // light sunlit crest
      "#a49887", // warm stone
      "#6e6459", // shadow ridge
    ];
    for (let i = 0; i < MOUNTAIN_COUNT; i++) {
      const t = i / (MOUNTAIN_COUNT - 1);
      const ang = (t - 0.5) * Math.PI * 1.15;
      const dist = 260 + rand() * 180;
      placements.push({
        x: Math.sin(ang) * dist,
        z: -Math.cos(ang) * dist,
        w: 95 + rand() * 115,
        h: 42 + rand() * 70,
        ry: rand() * Math.PI * 2,
        tint: tints[i % tints.length],
      });
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
    const c = new THREE.Color();

    placements.forEach((p, i) => {
      e.set(0, p.ry, 0);
      q.setFromEuler(e);
      v.set(p.x, -3, p.z);
      s.set(p.w, p.h, p.w * 0.75);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(p.tint));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [placements]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, MOUNTAIN_COUNT]}
      frustumCulled={false}
    >
      <meshLambertMaterial color="#ffffff" flatShading />
    </instancedMesh>
  );
}

// ----------------------------------------------------
// 4. Endless Desert Ground Plane
// ----------------------------------------------------
function DesertGround() {
  const timeOfDay = useWeatherStore((s) => s.timeOfDay);
  const cfg = TIME_LIGHTING_CONFIGS[timeOfDay];
  const map = getSandTexture();

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, -150]}>
      <planeGeometry args={[1600, 1600]} />
      <meshLambertMaterial map={map ?? undefined} color={cfg.groundTint} />
    </mesh>
  );
}

// ----------------------------------------------------
// 5. 3D Rain Particle System (for Storm Mode)
// ----------------------------------------------------
const RAIN_COUNT = 1400;

function RainParticles() {
  const rainIntensity = useWeatherStore((s) => s.rainIntensity);
  const isRain = rainIntensity > 0.1;
  const meshRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(RAIN_COUNT * 3);
    const vel = new Float32Array(RAIN_COUNT);
    for (let i = 0; i < RAIN_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50; // X
      pos[i * 3 + 1] = Math.random() * 25 + 0.5; // Y
      pos[i * 3 + 2] = -Math.random() * 65; // Z
      vel[i] = 28 + Math.random() * 16;
    }
    return { positions: pos, velocities: vel };
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#c0d4ea",
        size: 0.18,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    []
  );

  useFrame((_, delta) => {
    if (!isRain || !meshRef.current) return;
    const speed = useDriveStore.getState().speed;
    const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i * 3 + 1] -= velocities[i] * delta;
      arr[i * 3 + 2] += (speed * 1.5 + 8.0) * delta;

      if (arr[i * 3 + 1] < 0.2 || arr[i * 3 + 2] > 2) {
        arr[i * 3] = (Math.random() - 0.5) * 50;
        arr[i * 3 + 1] = 22 + Math.random() * 8;
        arr[i * 3 + 2] = -60 - Math.random() * 15;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (!isRain) return null;

  return <points ref={meshRef} geometry={geo} material={mat} frustumCulled={false} />;
}

// ----------------------------------------------------
// 6. Dynamic Bus Headlights (Night / High Beams)
// ----------------------------------------------------
function BusHeadlights() {
  const headlights = useWeatherStore((s) => s.headlights);
  const timeOfDay = useWeatherStore((s) => s.timeOfDay);
  const active = headlights || timeOfDay === "night";

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
      <DesertGround />
      <Mountains />
      <RainParticles />
      <BusHeadlights />
    </group>
  );
}
