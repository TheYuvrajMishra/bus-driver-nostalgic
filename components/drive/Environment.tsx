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

import { useTexture } from "@react-three/drei";

// ----------------------------------------------------------------------------
// Anime-style cloud billboards (PNG sprites scattered across the sky)
// ----------------------------------------------------------------------------
const ANIME_CLOUDS = [
  // Near-mid sky — large hero clouds
  { tex: 0, x: -180, y: 135, z: -280, w: 170, o: 1.0 },
  { tex: 1, x: -40, y: 120, z: -350, w: 90, o: 1.0 },
  { tex: 0, x: 200, y: 150, z: -300, w: 190, o: 1.0 },
  { tex: 2, x: 120, y: 100, z: -240, w: 220, o: 0.98 },
  { tex: 1, x: -120, y: 170, z: -200, w: 75, o: 1.0 },
  // Distant horizon layer — smaller, softer
  { tex: 0, x: -320, y: 90, z: -480, w: 150, o: 0.9 },
  { tex: 2, x: 330, y: 95, z: -520, w: 200, o: 0.88 },
  { tex: 0, x: 0, y: 85, z: -560, w: 160, o: 0.85 },
  { tex: 1, x: 250, y: 110, z: -450, w: 80, o: 0.9 },
  { tex: 2, x: -250, y: 105, z: -420, w: 180, o: 0.88 },
  // High overhead clouds
  { tex: 0, x: -100, y: 200, z: -180, w: 140, o: 1.0 },
  { tex: 2, x: 150, y: 210, z: -190, w: 170, o: 0.95 },
  { tex: 1, x: 40, y: 190, z: -160, w: 70, o: 1.0 },
  { tex: 0, x: -300, y: 180, z: -250, w: 120, o: 0.95 },
];

// Texture aspect ratios (width / height)
const CLOUD_ASPECTS = [1920 / 1280, 1120 / 2240, 2736 / 912];

function AnimeClouds() {
  const groupRef = useRef<THREE.Group>(null);
  const textures = useTexture([
    "/assets/clouds/cloud-fluffy.png",
    "/assets/clouds/cloud-puffy.png",
    "/assets/clouds/cloud-wispy.png",
  ]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    // Slow dreamy drift
    const t = state.clock.elapsedTime;
    g.position.x = Math.sin(t * 0.02) * 12;
    g.position.z = (t * 1.2) % 60;
  });

  return (
    <group ref={groupRef}>
      {ANIME_CLOUDS.map((c, i) => {
        const h = c.w / CLOUD_ASPECTS[c.tex];
        return (
          <sprite key={i} position={[c.x, c.y, c.z]} scale={[c.w, h, 1]}>
            <spriteMaterial
              map={textures[c.tex]}
              transparent
              depthWrite={false}
              opacity={c.o}
              fog={false}
            />
          </sprite>
        );
      })}
    </group>
  );
}

// -----------------------------------------------------------------------------
// 3. Horizon Mountain Range (Rugged 3D Faceted Peaks, Rust-to-Slate Gradient)
// -----------------------------------------------------------------------------
function makeHorizonMountains(
  radius: number,
  baseY: number,
  peakHeight: number,
  segments: number,
  seedOffset: number,
  rustColor: string,
  slateColor: string
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  let seed = 47281 + seedOffset;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const colRust = new THREE.Color(rustColor);
  const colSlate = new THREE.Color(slateColor);
  const colMid = new THREE.Color("#755358"); // warm purplish slate

  // Ring of mountain vertices: 3 rings (base, mid-ridge, summit peaks)
  const angleStep = (Math.PI * 2) / segments;

  for (let i = 0; i < segments; i++) {
    const angle = i * angleStep;
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);

    // Peak height variation with sharp jagged ridges
    const ridgeNoise =
      Math.sin(angle * 5.0 + seedOffset) * 0.45 +
      Math.sin(angle * 11.0 + 1.2) * 0.35 +
      Math.sin(angle * 19.0 + 2.7) * 0.2;
    const hPeak = baseY + Math.max(12, peakHeight * (0.65 + ridgeNoise * 0.45));
    const hMid = baseY + hPeak * 0.48;

    const rBase = radius * (1.0 + (rand() - 0.5) * 0.08);
    const rMid = radius * (0.95 + (rand() - 0.5) * 0.06);
    const rPeak = radius * (0.9 + (rand() - 0.5) * 0.05);

    // 0: Base vertex
    positions.push(sinA * rBase, baseY - 6, -cosA * rBase);
    colors.push(colRust.r, colRust.g, colRust.b);

    // 1: Mid-ridge vertex
    positions.push(sinA * rMid, hMid, -cosA * rMid);
    colors.push(colMid.r, colMid.g, colMid.b);

    // 2: Summit peak vertex
    positions.push(sinA * rPeak, hPeak, -cosA * rPeak);
    colors.push(colSlate.r, colSlate.g, colSlate.b);
  }

  // Create faceted triangles between adjacent angular segments
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const i0 = i * 3 + 0;
    const i1 = i * 3 + 1;
    const i2 = i * 3 + 2;

    const n0 = next * 3 + 0;
    const n1 = next * 3 + 1;
    const n2 = next * 3 + 2;

    // Lower facet quad (2 tris)
    indices.push(i0, n0, i1);
    indices.push(n0, n1, i1);

    // Upper facet quad (2 tris)
    indices.push(i1, n1, i2);
    indices.push(n1, n2, i2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function HorizonMountains() {
  const outerMountains = useMemo(
    () =>
      makeHorizonMountains(
        700,
        -15,
        155,
        48,
        101,
        "#bd6e3c", // base rust
        "#424e62"  // summit cool slate grey
      ),
    []
  );

  const innerRidge = useMemo(
    () =>
      makeHorizonMountains(
        480,
        -12,
        82,
        36,
        202,
        "#c9783e", // warm terracotta
        "#624e52"  // purplish slate ridge
      ),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Distant Rugged Mountain Peaks */}
      <mesh geometry={outerMountains} frustumCulled={false}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
      {/* Mid-Distance Foothill Ridge */}
      <mesh geometry={innerRidge} frustumCulled={false}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
    </group>
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
      <HorizonMountains />
      <AnimeClouds />
      <LineRain />
      <BusHeadlights />
    </group>
  );
}
