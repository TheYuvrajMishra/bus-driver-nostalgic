"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { driveWorld } from "@/lib/drive-world";
import { CHUNK_LENGTH } from "@/lib/drive-store";
import {
  chunkLocalAt,
  getTerrainHeightLocal,
  roadSlopeAtDistance,
} from "@/lib/road-generator";
import { trafficEngine, type TrafficVehicleType } from "@/lib/traffic-system";
import { getVehicleModels, disposeVehicleModels } from "@/lib/traffic-models";
import { getToonGradient } from "@/lib/toon-material";
import { preloadTrafficAudio } from "@/lib/traffic-sound";

const TYPES: TrafficVehicleType[] = ["car", "bus", "truck"];
const MAX_PER_TYPE = 12; // >= trafficEngine MAX_ACTIVE_VEHICLES
const MAX_WHEELS = MAX_PER_TYPE * 6;

/** uniform wheel-geometry scale per type (shared wheel geometry is truck-sized) */
const WHEEL_SCALE: Record<TrafficVehicleType, number> = {
  car: 0.32 / 0.48,
  bus: 1,
  truck: 1,
};

const BRAKE_ON = new THREE.Color(2.2, 0.14, 0.1);
const BRAKE_OFF = new THREE.Color(0.4, 0.045, 0.035);

export default function TrafficManager() {
  // body meshes: type -> livery variant -> mesh
  const bodyRefs = useRef<Record<TrafficVehicleType, (THREE.InstancedMesh | null)[]>>({
    car: [null, null, null],
    bus: [null, null, null],
    truck: [null, null, null],
  });
  const wheelRef = useRef<THREE.InstancedMesh>(null);
  const headRefs = useRef<Record<TrafficVehicleType, THREE.InstancedMesh | null>>({
    car: null,
    bus: null,
    truck: null,
  });
  const tailRefs = useRef<Record<TrafficVehicleType, THREE.InstancedMesh | null>>({
    car: null,
    bus: null,
    truck: null,
  });
  const sideDecalRefs = useRef<Record<TrafficVehicleType, THREE.InstancedMesh | null>>({
    car: null,
    bus: null,
    truck: null,
  });
  const rearDecalRef = useRef<THREE.InstancedMesh>(null);

  // Preload authentic Indian highway horn audio files from /audio/horn-*.mp3
  useEffect(() => {
    preloadTrafficAudio();
  }, []);

  const assets = useMemo(() => {
    const gradientMap = getToonGradient();
    const bodyMat = new THREE.MeshToonMaterial({
      vertexColors: true,
      gradientMap,
      side: THREE.DoubleSide,
    });
    const wheelMat = new THREE.MeshToonMaterial({
      vertexColors: true,
      gradientMap,
    });
    const headMat = new THREE.MeshBasicMaterial({
      color: "#fff3cf",
      toneMapped: false,
    });
    const tailMat = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      toneMapped: false,
    });

    const models = {
      car: getVehicleModels("car"),
      bus: getVehicleModels("bus"),
      truck: getVehicleModels("truck"),
    };

    const decalMats: Record<TrafficVehicleType, THREE.Material | null> = {
      car: null,
      bus: null,
      truck: null,
    };
    for (const t of TYPES) {
      if (models[t].sideDecal) {
        decalMats[t] = new THREE.MeshStandardMaterial({
          roughness: 0.6,
          metalness: 0.05,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });
      }
    }
    const rearDecalMat = models.truck.rearDecal
      ? new THREE.MeshStandardMaterial({
          roughness: 0.6,
          metalness: 0.05,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
      : null;

    return { models, bodyMat, wheelMat, headMat, tailMat, decalMats, rearDecalMat };
  }, []);

  // Generated livery artwork textures
  const [maps, setMaps] = useState<Record<string, THREE.Texture | null>>({
    car: null,
    bus: null,
    truck: null,
    truckRear: null,
  });

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const jobs: [string, string][] = [
      ["car", "/assets/traffic/car-side.png"],
      ["bus", "/assets/traffic/bus-side.png"],
      ["truck", "/assets/traffic/truck-cargo-side.png"],
      ["truckRear", "/assets/traffic/truck-rear.png"],
    ];
    (async () => {
      const out: Record<string, THREE.Texture> = {};
      for (const [key, url] of jobs) {
        try {
          const tex = await loader.loadAsync(url);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          out[key] = tex;
        } catch {
          // texture stays null -> plain livery
        }
      }
      if (!cancelled) setMaps((m) => ({ ...m, ...out }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Assign loaded textures to decal materials (car art is vertically cropped)
  useEffect(() => {
    const { decalMats, rearDecalMat, models } = assets;
    for (const t of TYPES) {
      const mat = decalMats[t] as THREE.MeshStandardMaterial | null;
      if (!mat) continue;
      const tex = maps[t];
      mat.map = tex;
      if (tex) {
        const crop = models[t].sideDecalVCrop;
        if (crop) {
          tex.repeat.set(1, crop[1] - crop[0]);
          tex.offset.set(0, crop[0]);
        } else {
          tex.repeat.set(1, 1);
          tex.offset.set(0, 0);
        }
      }
      mat.needsUpdate = true;
    }
    if (rearDecalMat) {
      (rearDecalMat as THREE.MeshStandardMaterial).map = maps.truckRear;
      rearDecalMat.needsUpdate = true;
    }
  }, [maps, assets]);

  useEffect(() => {
    return () => {
      disposeVehicleModels();
      for (const t of Object.values(maps)) t?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scratch = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      v: new THREE.Vector3(),
      s: new THREE.Vector3(1, 1, 1),
      zeroM: new THREE.Matrix4().makeScale(0, 0, 0),
    }),
    []
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);

    // 1. Advance fixed-timestep IDM traffic simulation
    trafficEngine.update(dt);
    const vehicles = trafficEngine.getVehicles();

    const bodies = bodyRefs.current;
    const wheelMesh = wheelRef.current;
    const heads = headRefs.current;
    const tails = tailRefs.current;
    const sides = sideDecalRefs.current;
    const rear = rearDecalRef.current;
    if (!wheelMesh || !rear) return;
    for (const t of TYPES) {
      if (!heads[t] || !tails[t] || !sides[t]) return;
      for (const b of bodies[t]) if (!b) return;
    }

    const { m, q, e, v, s, zeroM } = scratch;
    const { models } = assets;

    const bi: Record<TrafficVehicleType, number[]> = {
      car: [0, 0, 0],
      bus: [0, 0, 0],
      truck: [0, 0, 0],
    };
    const wi = { n: 0 };
    const hi: Record<TrafficVehicleType, number> = { car: 0, bus: 0, truck: 0 };
    const ti: Record<TrafficVehicleType, number> = { car: 0, bus: 0, truck: 0 };
    const si: Record<TrafficVehicleType, number> = { car: 0, bus: 0, truck: 0 };
    let ri = 0;

    // 2. Place every active vehicle in car-space along the road spline
    for (const veh of vehicles) {
      const n = Math.floor(veh.s / CHUNK_LENGTH);
      const T = driveWorld.transforms.get(n);
      if (!T) continue;

      const tFrac = Math.max(0, Math.min(1, (veh.s - n * CHUNK_LENGTH) / CHUNK_LENGTH));
      const [lx, lz, lh] = chunkLocalAt(n, tFrac);

      // Normal vector right-hand offset
      const rx = Math.cos(lh);
      const rz = -Math.sin(lh);
      const px = lx + rx * veh.lateralOffset;
      const pz = lz + rz * veh.lateralOffset;
      const py = getTerrainHeightLocal(n, px, pz) + 0.08;

      // Car-space world coordinates
      const cos = Math.cos(T.ry);
      const sin = Math.sin(T.ry);
      const wx = T.px + px * cos + pz * sin;
      const wy = T.py + py;
      const wz = T.pz + (-px * sin + pz * cos);

      // Models face +Z. Verified numerically: route-forward in car-space
      // is rotY(sin(lh), -cos(lh), ry); lane 1 (same direction) needs the
      // PI flip so the nose (+Z) aligns with travel (+s), oncoming needs none.
      const slope = roadSlopeAtDistance(veh.s);
      const basePitch = Math.atan(slope);
      const yaw = T.ry + lh + (veh.lane === 1 ? Math.PI : 0);
      const pitch = veh.lane === 1 ? -basePitch : basePitch;

      e.set(pitch, yaw, 0, "YXZ");
      q.setFromEuler(e);
      v.set(wx, wy, wz);
      s.set(1, 1, 1);
      m.compose(v, q, s);

      const model = models[veh.type];

      // Body (per livery variant)
      const variant = Math.max(0, Math.min(2, veh.colorVariant));
      bodies[veh.type][variant]!.setMatrixAt(bi[veh.type][variant]++, m);

      // Headlights + taillights share the body transform
      heads[veh.type]!.setMatrixAt(hi[veh.type]++, m);
      tails[veh.type]!.setMatrixAt(ti[veh.type], m);
      tails[veh.type]!.setColorAt(ti[veh.type]++, veh.brakeLight ? BRAKE_ON : BRAKE_OFF);

      // Wheels: spin about the local X axle (pre-yaw), positioned at mounts
      const wScale = WHEEL_SCALE[veh.type];
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      for (const mount of model.wheelMounts) {
        const ox = mount.x * 1; // mounts are symmetric; yaw handles orientation
        const oz = mount.z;
        v.set(
          wx + ox * cosY + oz * sinY,
          wy + mount.y,
          wz + -ox * sinY + oz * cosY
        );
        e.set(veh.wheelSpin, yaw, 0, "YXZ");
        q.setFromEuler(e);
        s.set(wScale, wScale, wScale);
        m.compose(v, q, s);
        if (wi.n < MAX_WHEELS) wheelMesh.setMatrixAt(wi.n++, m);
      }
      s.set(1, 1, 1);

      // Textured side livery (taxi art only on the taxi livery variant)
      const showSide =
        models[veh.type].sideDecal &&
        sides[veh.type] &&
        !(veh.type === "car" && variant !== 0);
      if (showSide) {
        e.set(pitch, yaw, 0, "YXZ");
        q.setFromEuler(e);
        v.set(wx, wy, wz);
        m.compose(v, q, s);
        sides[veh.type]!.setMatrixAt(si[veh.type]++, m);
      }

      // Truck tailgate art
      if (veh.type === "truck" && model.rearDecal) {
        e.set(pitch, yaw, 0, "YXZ");
        q.setFromEuler(e);
        v.set(wx, wy, wz);
        m.compose(v, q, s);
        rear.setMatrixAt(ri++, m);
      }
    }

    // 3. Park unused instances at zero scale
    for (const t of TYPES) {
      for (let k = 0; k < 3; k++) {
        const mesh = bodies[t][k]!;
        for (let i = bi[t][k]; i < MAX_PER_TYPE; i++) mesh.setMatrixAt(i, zeroM);
        mesh.instanceMatrix.needsUpdate = true;
      }
      const hm = heads[t]!;
      for (let i = hi[t]; i < MAX_PER_TYPE; i++) hm.setMatrixAt(i, zeroM);
      hm.instanceMatrix.needsUpdate = true;
      const tm = tails[t]!;
      for (let i = ti[t]; i < MAX_PER_TYPE; i++) {
        tm.setMatrixAt(i, zeroM);
        tm.setColorAt(i, BRAKE_OFF);
      }
      tm.instanceMatrix.needsUpdate = true;
      if (tm.instanceColor) tm.instanceColor.needsUpdate = true;
      const sm = sides[t];
      if (sm) {
        for (let i = si[t]; i < MAX_PER_TYPE; i++) sm.setMatrixAt(i, zeroM);
        sm.instanceMatrix.needsUpdate = true;
      }
    }
    for (let i = wi.n; i < MAX_WHEELS; i++) wheelMesh.setMatrixAt(i, zeroM);
    wheelMesh.instanceMatrix.needsUpdate = true;
    for (let i = ri; i < MAX_PER_TYPE; i++) rear.setMatrixAt(i, zeroM);
    rear.instanceMatrix.needsUpdate = true;
  });

  const setBodyRef = (t: TrafficVehicleType, k: number) => (mesh: THREE.InstancedMesh | null) => {
    bodyRefs.current[t][k] = mesh;
  };

  return (
    <group name="TrafficVehicles">
      {TYPES.map((t) =>
        assets.models[t].bodies.map((geo, k) => (
          <instancedMesh
            key={`${t}-body-${k}`}
            ref={setBodyRef(t, k)}
            args={[geo, assets.bodyMat, MAX_PER_TYPE]}
            castShadow
            receiveShadow
            frustumCulled={false}
          />
        ))
      )}

      {/* Spinning wheels (shared geometry, per-type scale) */}
      <instancedMesh
        ref={wheelRef}
        args={[assets.models.truck.wheel, assets.wheelMat, MAX_WHEELS]}
        castShadow
        frustumCulled={false}
      />

      {TYPES.map((t) => (
        <instancedMesh
          key={`${t}-head`}
          ref={(mesh: THREE.InstancedMesh | null) => {
            headRefs.current[t] = mesh;
          }}
          args={[assets.models[t].headlights, assets.headMat, MAX_PER_TYPE]}
          frustumCulled={false}
        />
      ))}

      {TYPES.map((t) => (
        <instancedMesh
          key={`${t}-tail`}
          ref={(mesh: THREE.InstancedMesh | null) => {
            tailRefs.current[t] = mesh;
          }}
          args={[assets.models[t].taillights, assets.tailMat, MAX_PER_TYPE]}
          frustumCulled={false}
        />
      ))}

      {TYPES.map((t) =>
        assets.models[t].sideDecal && assets.decalMats[t] ? (
          <instancedMesh
            key={`${t}-side`}
            ref={(mesh: THREE.InstancedMesh | null) => {
              sideDecalRefs.current[t] = mesh;
            }}
            args={[assets.models[t].sideDecal!, assets.decalMats[t]!, MAX_PER_TYPE]}
            frustumCulled={false}
          />
        ) : null
      )}

      {assets.models.truck.rearDecal && assets.rearDecalMat ? (
        <instancedMesh
          ref={rearDecalRef}
          args={[assets.models.truck.rearDecal, assets.rearDecalMat, MAX_PER_TYPE]}
          frustumCulled={false}
        />
      ) : null}
    </group>
  );
}
