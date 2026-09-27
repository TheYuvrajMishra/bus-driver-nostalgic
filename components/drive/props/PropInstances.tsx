"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { driveWorld } from "@/lib/drive-world";
import { propsForChunk, type PropItem } from "@/lib/prop-placer";
import { getTerrainHeightLocal, roadSlopeAtDistance } from "@/lib/road-generator";
import { CHUNK_LENGTH } from "@/lib/drive-store";
import {
  getGrassGeometry,
  getTreeGeometry,
  getRockGeometry,
  getBlobShadowTexture,
  getDhabaGeometry,
  getTruckGeometry,
  getMilestoneGeometry,
  getPoleGeometry,
  getReflectorGeometry,
} from "@/lib/prop-assets";
import { getToonGradient } from "@/lib/toon-material";

const MAX_GRASS = 120;
const MAX_TREE = 60;
const MAX_ROCK = 60;
const MAX_DHABA = 8;
const MAX_TRUCK = 12;
const MAX_MILESTONE = 8;
const MAX_POLE = 16;
const MAX_REFLECTOR = 60;
const MAX_SHADOW = 120;

const TREE_TINTS = ["#ffffff", "#e8f4dd", "#d6ecc8"];
const ROCK_TINTS = ["#ffffff", "#ebd4b8", "#d9be9e"];
const TRUCK_TINTS = ["#ffffff", "#ffe9c4", "#d9e6ff"];
const GRASS_TINTS = ["#ffffff", "#e8f0cb", "#dce8b5"];

const SHADOW_SIZE: Record<PropItem["type"], [number, number]> = {
  tree: [4.8, 4.8],
  rock: [2.2, 2.2],
  dhaba: [7.2, 6.2],
  truck: [4.2, 9.0],
  milestone: [0, 0],
  grass: [0.9, 0.9],
  pole: [1.2, 1.2],
  reflector: [0, 0],
};

export default function PropInstances() {
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const treeRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const dhabaRef = useRef<THREE.InstancedMesh>(null);
  const truckRef = useRef<THREE.InstancedMesh>(null);
  const milestoneRef = useRef<THREE.InstancedMesh>(null);
  const poleRef = useRef<THREE.InstancedMesh>(null);
  const reflectorRef = useRef<THREE.InstancedMesh>(null);
  const shadowRef = useRef<THREE.InstancedMesh>(null);

  const assets = useMemo(() => {
    const gradientMap = getToonGradient();
    const propMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap });
    const reflectorMat = new THREE.MeshBasicMaterial({ color: "#ff9900" });
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: getBlobShadowTexture() ?? undefined,
      transparent: true,
      depthWrite: false,
    });
    return {
      grassGeo: getGrassGeometry(),
      treeGeo: getTreeGeometry(),
      rockGeo: getRockGeometry(),
      dhabaGeo: getDhabaGeometry(),
      truckGeo: getTruckGeometry(),
      milestoneGeo: getMilestoneGeometry(),
      poleGeo: getPoleGeometry(),
      reflectorGeo: getReflectorGeometry(),
      propMat,
      reflectorMat,
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
    const grass = grassRef.current;
    const tree = treeRef.current;
    const rock = rockRef.current;
    const dhaba = dhabaRef.current;
    const truck = truckRef.current;
    const milestone = milestoneRef.current;
    const pole = poleRef.current;
    const reflector = reflectorRef.current;
    const shadow = shadowRef.current;

    if (!grass || !tree || !rock || !dhaba || !truck || !milestone || !pole || !reflector || !shadow) {
      return;
    }
    const { m, q, e, v, s, c } = scratch;

    if (!tinted.current) {
      tinted.current = true;
      for (let i = 0; i < MAX_GRASS; i++) {
        grass.setColorAt(i, c.set(GRASS_TINTS[i % GRASS_TINTS.length]));
      }
      for (let i = 0; i < MAX_TREE; i++) {
        tree.setColorAt(i, c.set(TREE_TINTS[i % TREE_TINTS.length]));
      }
      for (let i = 0; i < MAX_ROCK; i++) {
        rock.setColorAt(i, c.set(ROCK_TINTS[i % ROCK_TINTS.length]));
      }
      for (let i = 0; i < MAX_TRUCK; i++) {
        truck.setColorAt(i, c.set(TRUCK_TINTS[i % TRUCK_TINTS.length]));
      }
      if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
      if (tree.instanceColor) tree.instanceColor.needsUpdate = true;
      if (rock.instanceColor) rock.instanceColor.needsUpdate = true;
      if (truck.instanceColor) truck.instanceColor.needsUpdate = true;
    }

    let gi = 0;
    let ti = 0;
    let ri = 0;
    let di = 0;
    let ki = 0;
    let mi = 0;
    let pi = 0;
    let rfi = 0;
    let si = 0;

    const place = (
      mesh: THREE.InstancedMesh,
      i: number,
      cx: number,
      cy: number,
      cz: number,
      cry: number,
      px: number,
      py: number,
      pz: number,
      yaw: number,
      sc: number,
      pitch = 0
    ) => {
      const cos = Math.cos(cry);
      const sin = Math.sin(cry);
      const wx = cx + px * cos + pz * sin;
      const wy = cy + py;
      const wz = cz + (-px * sin + pz * cos);
      e.set(pitch, cry + yaw, 0, "YXZ");
      q.setFromEuler(e);
      v.set(wx, wy, wz);
      s.set(sc, sc, sc);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
    };

    const placeShadow = (
      cx: number,
      cy: number,
      cz: number,
      cry: number,
      px: number,
      py: number,
      pz: number,
      w: number,
      d: number
    ) => {
      if (si >= MAX_SHADOW || w === 0) return;
      const cos = Math.cos(cry);
      const sin = Math.sin(cry);
      const wx = cx + px * cos + pz * sin;
      const wy = cy + py + 0.03;
      const wz = cz + (-px * sin + pz * cos);
      v.set(wx, wy, wz);
      e.set(-Math.PI / 2, 0, 0);
      q.setFromEuler(e);
      s.set(w, d, 1);
      m.compose(v, q, s);
      shadow.setMatrixAt(si++, m);
    };

    for (const n of driveWorld.live) {
      const T = driveWorld.transforms.get(n);
      if (!T) continue;
      for (const p of propsForChunk(n)) {
        const py = getTerrainHeightLocal(n, p.x, p.z);
        if (p.type === "grass" && gi < MAX_GRASS) {
          place(grass, gi++, T.px, T.py, T.pz, T.ry, p.x, py, p.z, p.ry, p.s);
          const [sw, sd] = SHADOW_SIZE.grass;
          placeShadow(T.px, T.py, T.pz, T.ry, p.x, py, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "tree" && ti < MAX_TREE) {
          place(tree, ti++, T.px, T.py, T.pz, T.ry, p.x, py, p.z, p.ry, p.s);
          const [sw, sd] = SHADOW_SIZE.tree;
          placeShadow(T.px, T.py, T.pz, T.ry, p.x, py, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "rock" && ri < MAX_ROCK) {
          place(rock, ri++, T.px, T.py, T.pz, T.ry, p.x, py, p.z, p.ry, p.s);
          const [sw, sd] = SHADOW_SIZE.rock;
          placeShadow(T.px, T.py, T.pz, T.ry, p.x, py, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "pole" && pi < MAX_POLE) {
          place(pole, pi++, T.px, T.py, T.pz, T.ry, p.x, py, p.z, p.ry, p.s);
          const [sw, sd] = SHADOW_SIZE.pole;
          placeShadow(T.px, T.py, T.pz, T.ry, p.x, py, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "dhaba" && di < MAX_DHABA) {
          place(dhaba, di++, T.px, T.py, T.pz, T.ry, p.x, py + 0.04, p.z, p.ry, p.s);
          const [sw, sd] = SHADOW_SIZE.dhaba;
          placeShadow(T.px, T.py, T.pz, T.ry, p.x, py, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "truck" && ki < MAX_TRUCK) {
          const tFrac = Math.max(0, Math.min(1, -p.z / CHUNK_LENGTH));
          const propDist = n * CHUNK_LENGTH + tFrac * CHUNK_LENGTH;
          const slope = roadSlopeAtDistance(propDist);
          const pitch = Math.atan(slope);
          place(truck, ki++, T.px, T.py, T.pz, T.ry, p.x, py + 0.06, p.z, p.ry, p.s, pitch);
          const [sw, sd] = SHADOW_SIZE.truck;
          placeShadow(T.px, T.py, T.pz, T.ry, p.x, py, p.z, sw * p.s, sd * p.s);
        } else if (p.type === "milestone" && mi < MAX_MILESTONE) {
          place(milestone, mi++, T.px, T.py, T.pz, T.ry, p.x, py + 0.04, p.z, p.ry, p.s);
        } else if (p.type === "reflector" && rfi < MAX_REFLECTOR) {
          place(reflector, rfi++, T.px, T.py, T.pz, T.ry, p.x, py + 0.04, p.z, p.ry, p.s);
        }
      }
    }

    grass.count = gi;
    tree.count = ti;
    rock.count = ri;
    pole.count = pi;
    dhaba.count = di;
    truck.count = ki;
    milestone.count = mi;
    reflector.count = rfi;
    shadow.count = si;

    for (const mesh of [grass, tree, rock, pole, dhaba, truck, milestone, reflector, shadow]) {
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
      <instancedMesh args={[assets.grassGeo, assets.propMat, MAX_GRASS]} {...dynamic(grassRef)} />
      <instancedMesh args={[assets.treeGeo, assets.propMat, MAX_TREE]} {...dynamic(treeRef)} />
      <instancedMesh args={[assets.rockGeo, assets.propMat, MAX_ROCK]} {...dynamic(rockRef)} />
      <instancedMesh args={[assets.poleGeo, assets.propMat, MAX_POLE]} {...dynamic(poleRef)} />
      <instancedMesh args={[assets.dhabaGeo, assets.propMat, MAX_DHABA]} {...dynamic(dhabaRef)} />
      <instancedMesh args={[assets.truckGeo, assets.propMat, MAX_TRUCK]} {...dynamic(truckRef)} />
      <instancedMesh args={[assets.milestoneGeo, assets.propMat, MAX_MILESTONE]} {...dynamic(milestoneRef)} />
      <instancedMesh args={[assets.reflectorGeo, assets.reflectorMat, MAX_REFLECTOR]} {...dynamic(reflectorRef)} />
      <instancedMesh args={[assets.shadowGeo, assets.shadowMat, MAX_SHADOW]} {...dynamic(shadowRef)} />
    </group>
  );
}
