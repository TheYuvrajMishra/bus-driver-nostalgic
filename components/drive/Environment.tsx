"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROTATIONS } from "@/lib/rotations";
import { useAudioStore } from "@/lib/audio-store";
import { skyPaletteFor } from "@/lib/sky-colors";
import { getSandTexture, mergeGeos, xform } from "@/lib/cockpit-assets";

/**
 * Environment dressing — architecture.md §7 perf rules (no shadows,
 * dpr=1, no postprocessing). Three draw calls total:
 *   1. gradient sky dome (overcast shader, tinted by IST rotation)
 *   2. desert ground plane (sand speckle texture)
 *   3. one InstancedMesh of faceted mountain silhouettes on the horizon
 *
 * The ground + mountains are static in car-space: the chunk system
 * re-places the road around the camera, and distant scenery barely
 * parallaxes, so static placement reads correctly.
 */

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
    vec3 col = mix(uHorizon, uTop, smoothstep(0.02, 0.55, h));
    col = mix(uHorizon * 0.92, col, smoothstep(-0.1, 0.02, h));
    // soft overcast cloud bands
    float cl = sin(d.x * 9.0 + 1.7) * sin(d.z * 11.0 + 0.4)
             + 0.6 * sin((d.x + d.z) * 5.0 + 2.2);
    cl = smoothstep(0.35, 1.15, cl) * smoothstep(0.03, 0.3, h);
    col = mix(col, uCloud, cl * 0.5);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pal.top, pal.horizon, pal.cloud]
  );

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[620, 24, 16]} />
    </mesh>
  );
}

function DesertGround() {
  const map = getSandTexture();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, -120]}>
      <planeGeometry args={[1100, 1100]} />
      <meshLambertMaterial map={map ?? undefined} color="#c4a06c" />
    </mesh>
  );
}

/** One faceted peak cluster, jittered for a natural silhouette. */
function makePeakGeometry(): THREE.BufferGeometry {
  let seed = 424242;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const jitter = (geo: THREE.BufferGeometry, amt: number) => {
    const p = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      // don't move the base ring (y ~= -0.5) so peaks sit flat
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
    xform(jitter(new THREE.ConeGeometry(1, 1, 6, 1), 0.22), 0, 0.5, 0),
    xform(jitter(new THREE.ConeGeometry(0.62, 0.7, 5, 1), 0.18), 0.85, 0.35, 0.3),
    xform(jitter(new THREE.ConeGeometry(0.55, 0.55, 5, 1), 0.2), -0.8, 0.27, -0.25),
  ];
  const merged = mergeGeos(parts);
  return merged;
}

const MOUNTAIN_COUNT = 14;

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
    const tints = ["#8a7358", "#7a654e", "#93795c", "#6e5c46"];
    for (let i = 0; i < MOUNTAIN_COUNT; i++) {
      // arc across the horizon ahead; denser toward the edges so the
      // road's vanishing point stays readable in the middle
      const t = i / (MOUNTAIN_COUNT - 1); // 0..1
      const ang = (t - 0.5) * Math.PI * 0.9; // -81°..81°
      const dist = 300 + rand() * 90;
      placements.push({
        x: Math.sin(ang) * dist,
        z: -Math.cos(ang) * dist,
        w: 90 + rand() * 90,
        h: 42 + rand() * 55,
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
      s.set(p.w, p.h, p.w * 0.7);
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
