"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROTATIONS } from "@/lib/rotations";
import { useAudioStore } from "@/lib/audio-store";
import { skyPaletteFor } from "@/lib/sky-colors";
import { getSandTexture, mergeGeos, xform } from "@/lib/cockpit-assets";

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
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uTop, smoothstep(0.01, 0.45, h));
    col = mix(uHorizon * 0.95, col, smoothstep(-0.08, 0.01, h));
    // warm desert cloud formations
    float cl = sin(d.x * 7.0 + 1.2) * sin(d.z * 8.5 + 0.3)
             + 0.5 * sin((d.x + d.z) * 4.2 + 1.8)
             + 0.25 * sin(d.x * 15.0 - d.z * 12.0);
    cl = smoothstep(0.2, 0.95, cl) * smoothstep(0.02, 0.35, h);
    col = mix(col, uCloud, cl * 0.45);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function SkyDome() {
  const rotationId = useAudioStore((s) => s.rotationId);
  const rotation = ROTATIONS.find((r) => r.id === rotationId) ?? ROTATIONS[2];
  const pal = skyPaletteFor(rotation.lighting.sky);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        uniforms: {
          uTop: { value: new THREE.Color(pal.top) },
          uHorizon: { value: new THREE.Color(pal.horizon) },
          uCloud: { value: new THREE.Color(pal.cloud) },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [pal.top, pal.horizon, pal.cloud]
  );

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[750, 32, 20]} />
    </mesh>
  );
}

function DesertGround() {
  const map = getSandTexture();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, -150]}>
      <planeGeometry args={[1400, 1400]} />
      <meshLambertMaterial map={map ?? undefined} color="#c9955c" />
    </mesh>
  );
}

/** Faceted mountain peak cluster with natural ridges */
function makePeakGeometry(): THREE.BufferGeometry {
  let seed = 424242;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const jitter = (geo: THREE.BufferGeometry, amt: number) => {
    const p = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > -0.4) {
        p.setX(i, p.getX(i) + (rand() - 0.5) * amt);
        p.setZ(i, p.getZ(i) + (rand() - 0.5) * amt);
        p.setY(i, p.getY(i) + (rand() - 0.5) * amt * 0.6);
      }
    }
    geo.computeVertexNormals();
    return geo;
  };
  const parts = [
    xform(jitter(new THREE.ConeGeometry(1, 1, 7, 1), 0.25), 0, 0.5, 0),
    xform(jitter(new THREE.ConeGeometry(0.7, 0.8, 6, 1), 0.2), 0.9, 0.4, 0.35),
    xform(jitter(new THREE.ConeGeometry(0.65, 0.65, 6, 1), 0.22), -0.85, 0.32, -0.3),
    xform(jitter(new THREE.ConeGeometry(0.5, 0.5, 5, 1), 0.18), 0.2, 0.25, 0.7),
  ];
  return mergeGeos(parts);
}

const MOUNTAIN_COUNT = 24;

function Mountains() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const { geometry, placements } = useMemo(() => {
    let seed = 777001;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const geometry = makePeakGeometry();
    const placements: { x: number; z: number; w: number; h: number; ry: number; tint: string }[] = [];
    const tints = [
      "#b87f4c", // warm terracotta / golden sand
      "#a46e3e", // rich desert brown
      "#8e5b30", // deep earthy ridge
      "#c68d58", // bright desert sunlit crest
      "#7a4b24", // shadow ridge
    ];
    for (let i = 0; i < MOUNTAIN_COUNT; i++) {
      const t = i / (MOUNTAIN_COUNT - 1); // 0..1
      const ang = (t - 0.5) * Math.PI * 1.05; // -95°..95°
      const dist = 280 + rand() * 140;
      placements.push({
        x: Math.sin(ang) * dist,
        z: -Math.cos(ang) * dist,
        w: 110 + rand() * 110,
        h: 48 + rand() * 65,
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
      v.set(p.x, -4, p.z);
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

export default function Environment() {
  return (
    <group>
      <SkyDome />
      <DesertGround />
      <Mountains />
    </group>
  );
}
