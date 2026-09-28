"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { driveWorld } from "@/lib/drive-world";
import { propsForChunk, type PropItem } from "@/lib/prop-placer";
import {
  getTreeTexture,
  getBlobShadowTexture,
  getDhabaGeometry,
  getTruckGeometry,
  getMilestoneGeometry,
} from "@/lib/prop-assets";
import { getToonGradient } from "@/lib/toon-material";
import { useDriveStore, EYE_HEIGHT } from "@/lib/drive-store";

const MAX_TREE = 40;
const MAX_DHABA = 6;
const MAX_TRUCK = 10;
const MAX_MILESTONE = 6;
const MAX_SHADOW = 60;

const TREE_TINTS = ["#ffffff", "#d9eccf"];
const TRUCK_TINTS = ["#ffffff", "#ffe9c4", "#d9e6ff"];
const SHADOW_SIZE: Record<PropItem["type"], [number, number]> = {
  tree: [5.2, 5.2],
  dhaba: [7.0, 6.0],
  truck: [4.2, 9.0],
  milestone: [0, 0], // no shadow
};

/**
 * All roadside props as ONE InstancedMesh per prop type (architecture.md §3):
 * trees (billboard impostors), dhabas, trucks, milestones + blob shadows.
 *
 * Placement is deterministic per chunk seed (lib/prop-placer.ts). Every frame,
 * instance matrices are recomputed in car-space from the chunk transforms
 * published by RoadChunkManager — no React re-renders, ~70 matrix composes.
 */
export default function PropInstances() {
  const treeRef = useRef<THREE.InstancedMesh>(null);
  const dhabaRef = useRef<THREE.InstancedMesh>(null);
  const truckRef = useRef<THREE.InstancedMesh>(null);
  const milestoneRef = useRef<THREE.InstancedMesh>(null);
  const shadowRef = useRef<THREE.InstancedMesh>(null);

  const assets = useMemo(() => {
    const treeGeo = new THREE.PlaneGeometry(3.6, 5.2);
    treeGeo.translate(0, 2.6, 0); // base at ground
    const gradientMap = getToonGradient();
    const treeMat = new THREE.MeshToonMaterial({
      map: getTreeTexture() ?? undefined,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      gradientMap,
    });
    const propMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap });
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: getBlobShadowTexture() ?? undefined,
      transparent: true,
      depthWrite: false,
    });
    return {
      treeGeo,
      treeMat,
      dhabaGeo: getDhabaGeometry(),
      truckGeo: getTruckGeometry(),
      milestoneGeo: getMilestoneGeometry(),
      propMat,
      shadowGeo,
      shadowMat,
    };
  }, []);

  // Static per-instance color tints (set once).
  const tinted = useRef(false);

  const scratch = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      v: new THREE.Vector3(),
      s: new THREE.Vector3(),
      c: new THREE.Color(),
    }),
    []
  );

  useFrame(() => {
    const tree = treeRef.current;
    const dhaba = dhabaRef.current;
    const truck = truckRef.current;
    const milestone = milestoneRef.current;
    const shadow = shadowRef.current;
    if (!tree || !dhaba || !truck || !milestone || !shadow) return;
    const { m, q, e, v, s, c } = scratch;

    if (!tinted.current) {
      tinted.current = true;
      for (let i = 0; i < MAX_TREE; i++) {
        tree.setColorAt(i, c.set(TREE_TINTS[i % TREE_TINTS.length]));
      }
      for (let i = 0; i < MAX_TRUCK; i++) {
        truck.setColorAt(i, c.set(TRUCK_TINTS[i % TRUCK_TINTS.length]));
      }
      tree.instanceColor!.needsUpdate = true;
      truck.instanceColor!.needsUpdate = true;
    }

    const camX = useDriveStore.getState().lateralOffset;
    let ti = 0;
    let di = 0;
    let ki = 0;
    let mi = 0;
    let si = 0;

    /** Car-space placement of one prop instance. Returns [wx, wz]. */
    const place = (
      mesh: THREE.InstancedMesh,
      i: number,
      cx: number,
      cz: number,
      cry: number,
      px: number,
      pz: number,
      yaw: number,
      sc: number,
      y = 0
    ): [number, number] => {
      const cos = Math.cos(cry);
      const sin = Math.sin(cry);
      const wx = cx + px * cos + pz * sin;
      const wz = cz + (-px * sin + pz * cos);
      e.set(0, cry + yaw, 0);
      q.setFromEuler(e);
      v.set(wx, y, wz);
      s.set(sc, sc, sc);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
      return [wx, wz];
    };

    const placeShadow = (
      cx: number,
      cz: number,
      cry: number,
      px: number,
      pz: number,
      w: number,
      d: number
    ) => {
      if (si >= MAX_SHADOW || w === 0) return;
      const cos = Math.cos(cry);
      const sin = Math.sin(cry);
      v.set(cx + px * cos + pz * sin, 0.02, cz + (-px * sin + pz * cos));
      e.set(-Math.PI / 2, 0, 0);
      q.setFromEuler(e);
      s.set(w, d, 1);
      m.compose(v, q, s);
      shadow.setMatrixAt(si++, m);
    };

    for (const n of driveWorld.live) {
      const T = driveWorld.transforms.get(n);
      if (!T) continue;
      const lod = n - driveWorld.cur <= 1 ? "full" : "sparse";
      for (const p of propsForChunk(n, lod)) {
        if (p.type === "tree" && ti < MAX_TREE) {
          const [wx, wz] = place(tree, ti, T.px, T.pz, T.ry, p.x, p.z, 0, p.s);
          // Y-locked billboard: face the camera, ignore chunk yaw.
          const facing = Math.atan2(wx - camX, wz - 0);
          e.set(0, facing, 0);
          q.setFromEuler(e);
          v.set(wx, 0, wz);
          s.set(p.s, p.s, p.s);
          m.compose(v, q, s);
          tree.setMatrixAt(ti, m);
          ti++;
          const [sw, sd] = SHADOW_SIZE.tree;
          placeShadow(T.px, T.pz, T.ry, p.x, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "dhaba" && di < MAX_DHABA) {
          place(dhaba, di++, T.px, T.pz, T.ry, p.x, p.z, p.ry, p.s);
          const [sw, sd] = SHADOW_SIZE.dhaba;
          placeShadow(T.px, T.pz, T.ry, p.x, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "truck" && ki < MAX_TRUCK) {
          place(truck, ki++, T.px, T.pz, T.ry, p.x, p.z, p.ry, p.s);
          const [sw, sd] = SHADOW_SIZE.truck;
          placeShadow(T.px, T.pz, T.ry, p.x, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "milestone" && mi < MAX_MILESTONE) {
          place(milestone, mi++, T.px, T.pz, T.ry, p.x, p.z, p.ry, p.s);
        }
      }
    }

    tree.count = ti;
    dhaba.count = di;
    truck.count = ki;
    milestone.count = mi;
    shadow.count = si;
    for (const mesh of [tree, dhaba, truck, milestone, shadow]) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  const dynamic = (ref: React.Ref<THREE.InstancedMesh>) => ({
    ref,
    frustumCulled: false as const,
    onUpdate: (mesh: THREE.InstancedMesh) => {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    },
  });

  return (
    <group>
      <instancedMesh args={[assets.treeGeo, assets.treeMat, MAX_TREE]} {...dynamic(treeRef)} />
      <instancedMesh args={[assets.dhabaGeo, assets.propMat, MAX_DHABA]} {...dynamic(dhabaRef)} />
      <instancedMesh args={[assets.truckGeo, assets.propMat, MAX_TRUCK]} {...dynamic(truckRef)} />
      <instancedMesh args={[assets.milestoneGeo, assets.propMat, MAX_MILESTONE]} {...dynamic(milestoneRef)} />
      <instancedMesh args={[assets.shadowGeo, assets.shadowMat, MAX_SHADOW]} {...dynamic(shadowRef)} />
    </group>
  );
}
