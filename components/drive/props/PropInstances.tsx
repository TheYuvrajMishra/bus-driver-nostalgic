"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { driveWorld } from "@/lib/drive-world";
import { propsForChunk } from "@/lib/prop-placer";
import { getTerrainHeightLocal, roadSlopeAtDistance, chunkLocalAt } from "@/lib/road-generator";
import { CHUNK_LENGTH } from "@/lib/drive-store";
import {
  getGrassGeometry,
  getDominantTreeGeometry,
  getBanyanTreeGeometry,
  getGulmoharTreeGeometry,
  getBushGeometry,
  getRockGeometry,
  getCliffFormationGeometry,
  getPoleGeometry,
  getDhabaGeometry,
  getTruckGeometry,
  getMilestoneGeometry,
  getReflectorGeometry,
} from "@/lib/prop-assets";
import { getToonGradient } from "@/lib/toon-material";

const MAX_GRASS = 120;
const MAX_TREE = 48;
const MAX_TREE_BANYAN = 36;
const MAX_TREE_GULMOHAR = 24;
const MAX_BUSH = 96;
const MAX_ROCK = 64;
const MAX_CLIFF = 16;
const MAX_POLE = 24;
const MAX_DHABA = 8;
const MAX_TRUCK = 12;
const MAX_MILESTONE = 8;
const MAX_REFLECTOR = 60;

const TREE_TINTS = ["#ffffff", "#f2f8eb", "#e4f2da"];
const BANYAN_TINTS = ["#ffffff", "#eef7e8", "#e2f2da"];
const GULMOHAR_TINTS = ["#ffffff", "#fff3ea", "#ffe8e0"];
const BUSH_TINTS = ["#ffffff", "#edf6e6", "#e1f0d8"];
const ROCK_TINTS = ["#ffffff", "#f7ede1", "#eeddcb"];
const TRUCK_TINTS = ["#ffffff", "#ffe9c4", "#d9e6ff"];
const GRASS_TINTS = ["#ffffff", "#f0f5d8", "#e6edc6"];

export default function PropInstances() {
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const treeRef = useRef<THREE.InstancedMesh>(null);
  const treeBanyanRef = useRef<THREE.InstancedMesh>(null);
  const treeGulmoharRef = useRef<THREE.InstancedMesh>(null);
  const bushRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const cliffRef = useRef<THREE.InstancedMesh>(null);
  const poleRef = useRef<THREE.InstancedMesh>(null);
  const dhabaRef = useRef<THREE.InstancedMesh>(null);
  const truckRef = useRef<THREE.InstancedMesh>(null);
  const milestoneRef = useRef<THREE.InstancedMesh>(null);
  const reflectorRef = useRef<THREE.InstancedMesh>(null);

  const assets = useMemo(() => {
    const gradientMap = getToonGradient();
    const propMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap });
    const reflectorMat = new THREE.MeshBasicMaterial({ color: "#ff9900" });
    return {
      grassGeo: getGrassGeometry(),
      treeGeo: getDominantTreeGeometry(),
      treeBanyanGeo: getBanyanTreeGeometry(),
      treeGulmoharGeo: getGulmoharTreeGeometry(),
      bushGeo: getBushGeometry(),
      rockGeo: getRockGeometry(),
      cliffGeo: getCliffFormationGeometry(),
      poleGeo: getPoleGeometry(),
      dhabaGeo: getDhabaGeometry(),
      truckGeo: getTruckGeometry(),
      milestoneGeo: getMilestoneGeometry(),
      reflectorGeo: getReflectorGeometry(),
      propMat,
      reflectorMat,
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
    const treeBanyan = treeBanyanRef.current;
    const treeGulmohar = treeGulmoharRef.current;
    const bush = bushRef.current;
    const rock = rockRef.current;
    const cliff = cliffRef.current;
    const pole = poleRef.current;
    const dhaba = dhabaRef.current;
    const truck = truckRef.current;
    const milestone = milestoneRef.current;
    const reflector = reflectorRef.current;

    if (
      !grass ||
      !tree ||
      !treeBanyan ||
      !treeGulmohar ||
      !bush ||
      !rock ||
      !cliff ||
      !pole ||
      !dhaba ||
      !truck ||
      !milestone ||
      !reflector
    ) {
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
      for (let i = 0; i < MAX_TREE_BANYAN; i++) {
        treeBanyan.setColorAt(i, c.set(BANYAN_TINTS[i % BANYAN_TINTS.length]));
      }
      for (let i = 0; i < MAX_TREE_GULMOHAR; i++) {
        treeGulmohar.setColorAt(i, c.set(GULMOHAR_TINTS[i % GULMOHAR_TINTS.length]));
      }
      for (let i = 0; i < MAX_BUSH; i++) {
        bush.setColorAt(i, c.set(BUSH_TINTS[i % BUSH_TINTS.length]));
      }
      for (let i = 0; i < MAX_ROCK; i++) {
        rock.setColorAt(i, c.set(ROCK_TINTS[i % ROCK_TINTS.length]));
      }
      for (let i = 0; i < MAX_TRUCK; i++) {
        truck.setColorAt(i, c.set(TRUCK_TINTS[i % TRUCK_TINTS.length]));
      }
      if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
      if (tree.instanceColor) tree.instanceColor.needsUpdate = true;
      if (treeBanyan.instanceColor) treeBanyan.instanceColor.needsUpdate = true;
      if (treeGulmohar.instanceColor) treeGulmohar.instanceColor.needsUpdate = true;
      if (bush.instanceColor) bush.instanceColor.needsUpdate = true;
      if (rock.instanceColor) rock.instanceColor.needsUpdate = true;
      if (truck.instanceColor) truck.instanceColor.needsUpdate = true;
    }

    let gi = 0;
    let ti = 0;
    let tbi = 0;
    let tgi = 0;
    let bi = 0;
    let ri = 0;
    let cli = 0;
    let pi = 0;
    let di = 0;
    let ki = 0;
    let mi = 0;
    let rfi = 0;

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

    for (const n of driveWorld.live) {
      const T = driveWorld.transforms.get(n);
      if (!T) continue;
      for (const p of propsForChunk(n)) {
        if (p.type === "pole" && pi < MAX_POLE) {
          // Align pole accurately along the chunk curve spline
          const t = Math.max(0, Math.min(1, -p.z / CHUNK_LENGTH));
          const [lx, lz, lh] = chunkLocalAt(n, t);
          const rx = Math.cos(lh);
          const rz = Math.sin(lh);
          const px = lx + rx * p.x;
          const pz = lz + rz * p.x;
          const py = getTerrainHeightLocal(n, px, pz);

          place(pole, pi++, T.px, T.py, T.pz, T.ry, px, py, pz, lh, p.s);
          continue;
        }

        const py = getTerrainHeightLocal(n, p.x, p.z);

        if (p.type === "grass" && gi < MAX_GRASS) {
          place(grass, gi++, T.px, T.py, T.pz, T.ry, p.x, py, p.z, p.ry, p.s);
        } else if (p.type === "tree" && ti < MAX_TREE) {
          place(tree, ti++, T.px, T.py, T.pz, T.ry, p.x, py, p.z, p.ry, p.s);
        } else if (p.type === "tree_banyan" && tbi < MAX_TREE_BANYAN) {
          place(treeBanyan, tbi++, T.px, T.py, T.pz, T.ry, p.x, py, p.z, p.ry, p.s);
        } else if (p.type === "tree_gulmohar" && tgi < MAX_TREE_GULMOHAR) {
          place(treeGulmohar, tgi++, T.px, T.py, T.pz, T.ry, p.x, py, p.z, p.ry, p.s);
        } else if (p.type === "bush" && bi < MAX_BUSH) {
          place(bush, bi++, T.px, T.py, T.pz, T.ry, p.x, py, p.z, p.ry, p.s);
        } else if (p.type === "rock" && ri < MAX_ROCK) {
          place(rock, ri++, T.px, T.py, T.pz, T.ry, p.x, py, p.z, p.ry, p.s);
        } else if (p.type === "cliff" && cli < MAX_CLIFF) {
          place(cliff, cli++, T.px, T.py, T.pz, T.ry, p.x, py, p.z, p.ry, p.s);
        } else if (p.type === "dhaba" && di < MAX_DHABA) {
          place(dhaba, di++, T.px, T.py, T.pz, T.ry, p.x, py + 0.04, p.z, p.ry, p.s);
        } else if (p.type === "truck" && ki < MAX_TRUCK) {
          const tFrac = Math.max(0, Math.min(1, -p.z / CHUNK_LENGTH));
          const propDist = n * CHUNK_LENGTH + tFrac * CHUNK_LENGTH;
          const slope = roadSlopeAtDistance(propDist);
          const pitch = Math.atan(slope);
          place(truck, ki++, T.px, T.py, T.pz, T.ry, p.x, py + 0.06, p.z, p.ry, p.s, pitch);
        } else if (p.type === "milestone" && mi < MAX_MILESTONE) {
          place(milestone, mi++, T.px, T.py, T.pz, T.ry, p.x, py + 0.04, p.z, p.ry, p.s);
        } else if (p.type === "reflector" && rfi < MAX_REFLECTOR) {
          place(reflector, rfi++, T.px, T.py, T.pz, T.ry, p.x, py + 0.04, p.z, p.ry, p.s);
        }
      }
    }

    grass.count = gi;
    tree.count = ti;
    treeBanyan.count = tbi;
    treeGulmohar.count = tgi;
    bush.count = bi;
    rock.count = ri;
    cliff.count = cli;
    pole.count = pi;
    dhaba.count = di;
    truck.count = ki;
    milestone.count = mi;
    reflector.count = rfi;

    for (const mesh of [
      grass,
      tree,
      treeBanyan,
      treeGulmohar,
      bush,
      rock,
      cliff,
      pole,
      dhaba,
      truck,
      milestone,
      reflector,
    ]) {
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
      {/* 1. Unshadowed Lightweight Ground Cover */}
      <instancedMesh args={[assets.grassGeo, assets.propMat, MAX_GRASS]} {...dynamic(grassRef)} castShadow={false} receiveShadow={false} />
      <instancedMesh args={[assets.bushGeo, assets.propMat, MAX_BUSH]} {...dynamic(bushRef)} castShadow={false} receiveShadow={false} />
      <instancedMesh args={[assets.milestoneGeo, assets.propMat, MAX_MILESTONE]} {...dynamic(milestoneRef)} castShadow={false} receiveShadow={false} />
      <instancedMesh args={[assets.reflectorGeo, assets.reflectorMat, MAX_REFLECTOR]} {...dynamic(reflectorRef)} castShadow={false} receiveShadow={false} />

      {/* 2. Primary Shadow-Casting Environmental Props (Near Chunks) */}
      <instancedMesh args={[assets.treeGeo, assets.propMat, MAX_TREE]} {...dynamic(treeRef)} castShadow receiveShadow={false} />
      <instancedMesh args={[assets.treeBanyanGeo, assets.propMat, MAX_TREE_BANYAN]} {...dynamic(treeBanyanRef)} castShadow receiveShadow={false} />
      <instancedMesh args={[assets.treeGulmoharGeo, assets.propMat, MAX_TREE_GULMOHAR]} {...dynamic(treeGulmoharRef)} castShadow receiveShadow={false} />
      <instancedMesh args={[assets.poleGeo, assets.propMat, MAX_POLE]} {...dynamic(poleRef)} castShadow receiveShadow={false} />
      <instancedMesh args={[assets.rockGeo, assets.propMat, MAX_ROCK]} {...dynamic(rockRef)} castShadow receiveShadow={false} />
      <instancedMesh args={[assets.cliffGeo, assets.propMat, MAX_CLIFF]} {...dynamic(cliffRef)} castShadow receiveShadow={false} />
      <instancedMesh args={[assets.dhabaGeo, assets.propMat, MAX_DHABA]} {...dynamic(dhabaRef)} castShadow receiveShadow={false} />
      <instancedMesh args={[assets.truckGeo, assets.propMat, MAX_TRUCK]} {...dynamic(truckRef)} castShadow receiveShadow={false} />
    </group>
  );
}
