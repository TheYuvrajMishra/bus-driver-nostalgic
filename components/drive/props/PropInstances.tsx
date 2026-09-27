"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { driveWorld } from "@/lib/drive-world";
import { propsForChunk, type PropItem } from "@/lib/prop-placer";
import {
  getTreeGeometry,
  getRockGeometry,
  getBlobShadowTexture,
  getDhabaGeometry,
  getTruckGeometry,
  getMilestoneGeometry,
} from "@/lib/prop-assets";
import { getToonGradient } from "@/lib/toon-material";
import { useDriveStore } from "@/lib/drive-store";

const MAX_TREE = 50;
const MAX_ROCK = 40;
const MAX_DHABA = 6;
const MAX_TRUCK = 10;
const MAX_MILESTONE = 6;
const MAX_SHADOW = 80;

const TREE_TINTS = ["#ffffff", "#e8f4dd", "#d6ecc8"];
const ROCK_TINTS = ["#ffffff", "#ebd4b8", "#d9be9e"];
const TRUCK_TINTS = ["#ffffff", "#ffe9c4", "#d9e6ff"];
const SHADOW_SIZE: Record<PropItem["type"], [number, number]> = {
  tree: [4.8, 4.8],
  rock: [2.2, 2.2],
  dhaba: [7.0, 6.0],
  truck: [4.2, 9.0],
  milestone: [0, 0], // no shadow
};

export default function PropInstances() {
  const treeRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const dhabaRef = useRef<THREE.InstancedMesh>(null);
  const truckRef = useRef<THREE.InstancedMesh>(null);
  const milestoneRef = useRef<THREE.InstancedMesh>(null);
  const shadowRef = useRef<THREE.InstancedMesh>(null);

  const assets = useMemo(() => {
    const gradientMap = getToonGradient();
    const propMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap });
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: getBlobShadowTexture() ?? undefined,
      transparent: true,
      depthWrite: false,
    });
    return {
      treeGeo: getTreeGeometry(),
      rockGeo: getRockGeometry(),
      dhabaGeo: getDhabaGeometry(),
      truckGeo: getTruckGeometry(),
      milestoneGeo: getMilestoneGeometry(),
      propMat,
      shadowGeo,
      shadowMat,
    };
  }, []);

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
    const rock = rockRef.current;
    const dhaba = dhabaRef.current;
    const truck = truckRef.current;
    const milestone = milestoneRef.current;
    const shadow = shadowRef.current;
    if (!tree || !rock || !dhaba || !truck || !milestone || !shadow) return;
    const { m, q, e, v, s, c } = scratch;

    if (!tinted.current) {
      tinted.current = true;
      for (let i = 0; i < MAX_TREE; i++) {
        tree.setColorAt(i, c.set(TREE_TINTS[i % TREE_TINTS.length]));
      }
      for (let i = 0; i < MAX_ROCK; i++) {
        rock.setColorAt(i, c.set(ROCK_TINTS[i % ROCK_TINTS.length]));
      }
      for (let i = 0; i < MAX_TRUCK; i++) {
        truck.setColorAt(i, c.set(TRUCK_TINTS[i % TRUCK_TINTS.length]));
      }
      if (tree.instanceColor) tree.instanceColor.needsUpdate = true;
      if (rock.instanceColor) rock.instanceColor.needsUpdate = true;
      if (truck.instanceColor) truck.instanceColor.needsUpdate = true;
    }

    let ti = 0;
    let ri = 0;
    let di = 0;
    let ki = 0;
    let mi = 0;
    let si = 0;

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
          place(tree, ti++, T.px, T.pz, T.ry, p.x, p.z, p.ry, p.s, 0);
          const [sw, sd] = SHADOW_SIZE.tree;
          placeShadow(T.px, T.pz, T.ry, p.x, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "rock" && ri < MAX_ROCK) {
          place(rock, ri++, T.px, T.pz, T.ry, p.x, p.z, p.ry, p.s, 0);
          const [sw, sd] = SHADOW_SIZE.rock;
          placeShadow(T.px, T.pz, T.ry, p.x, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "dhaba" && di < MAX_DHABA) {
          place(dhaba, di++, T.px, T.pz, T.ry, p.x, p.z, p.ry, p.s, 0);
          const [sw, sd] = SHADOW_SIZE.dhaba;
          placeShadow(T.px, T.pz, T.ry, p.x, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "truck" && ki < MAX_TRUCK) {
          place(truck, ki++, T.px, T.pz, T.ry, p.x, p.z, p.ry, p.s, 0);
          const [sw, sd] = SHADOW_SIZE.truck;
          placeShadow(T.px, T.pz, T.ry, p.x, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "milestone" && mi < MAX_MILESTONE) {
          place(milestone, mi++, T.px, T.pz, T.ry, p.x, p.z, p.ry, p.s, 0);
        }
      }
    }

    tree.count = ti;
    rock.count = ri;
    dhaba.count = di;
    truck.count = ki;
    milestone.count = mi;
    shadow.count = si;
    for (const mesh of [tree, rock, dhaba, truck, milestone, shadow]) {
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
      <instancedMesh args={[assets.treeGeo, assets.propMat, MAX_TREE]} {...dynamic(treeRef)} />
      <instancedMesh args={[assets.rockGeo, assets.propMat, MAX_ROCK]} {...dynamic(rockRef)} />
      <instancedMesh args={[assets.dhabaGeo, assets.propMat, MAX_DHABA]} {...dynamic(dhabaRef)} />
      <instancedMesh args={[assets.truckGeo, assets.propMat, MAX_TRUCK]} {...dynamic(truckRef)} />
      <instancedMesh args={[assets.milestoneGeo, assets.propMat, MAX_MILESTONE]} {...dynamic(milestoneRef)} />
      <instancedMesh args={[assets.shadowGeo, assets.shadowMat, MAX_SHADOW]} {...dynamic(shadowRef)} />
    </group>
  );
}
