"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { driveWorld } from "@/lib/drive-world";
import { CHUNK_LENGTH } from "@/lib/drive-store";
import {
  chunkLocalAt,
  getTerrainHeightLocal,
  roadSlopeAtDistance,
} from "@/lib/road-generator";
import { trafficEngine } from "@/lib/traffic-system";
import {
  getTrafficTruckGeometry,
  getTrafficBusGeometry,
  getTrafficRickshawGeometry,
  getTrafficCarGeometry,
  getTrafficScooterGeometry,
  getBrakeLightGeometry,
  getBlinkerLightGeometry,
} from "@/lib/traffic-models";
import { getToonGradient } from "@/lib/toon-material";
import { preloadTrafficAudio } from "@/lib/traffic-sound";

const MAX_TRUCKS = 8;
const MAX_BUSES = 6;
const MAX_RICKSHAWS = 8;
const MAX_CARS = 8;
const MAX_SCOOTERS = 6;
const MAX_LIGHTS = 14;

export default function TrafficManager() {
  const truckRef = useRef<THREE.InstancedMesh>(null);
  const busRef = useRef<THREE.InstancedMesh>(null);
  const rickshawRef = useRef<THREE.InstancedMesh>(null);
  const carRef = useRef<THREE.InstancedMesh>(null);
  const scooterRef = useRef<THREE.InstancedMesh>(null);

  const brakeLightsRef = useRef<THREE.InstancedMesh>(null);
  const blinkerLeftRef = useRef<THREE.InstancedMesh>(null);
  const blinkerRightRef = useRef<THREE.InstancedMesh>(null);

  // Preload all authentic Indian highway truck horn audio files from /audio/horn-*.mp3
  useEffect(() => {
    preloadTrafficAudio();
  }, []);

  const assets = useMemo(() => {
    const gradientMap = getToonGradient();
    // Vertex colors baked into geometries for authentic vibrant liveries
    const trafficMat = new THREE.MeshToonMaterial({
      vertexColors: true,
      gradientMap,
      side: THREE.DoubleSide,
    });

    const brakeMat = new THREE.MeshBasicMaterial({
      color: "#ff1e1e",
      toneMapped: false,
    });

    const blinkerMat = new THREE.MeshBasicMaterial({
      color: "#ffaa00",
      toneMapped: false,
    });

    return {
      truckGeo: getTrafficTruckGeometry(),
      busGeo: getTrafficBusGeometry(),
      rickshawGeo: getTrafficRickshawGeometry(),
      carGeo: getTrafficCarGeometry(),
      scooterGeo: getTrafficScooterGeometry(),
      brakeGeo: getBrakeLightGeometry(),
      blinkerGeo: getBlinkerLightGeometry(),
      trafficMat,
      brakeMat,
      blinkerMat,
    };
  }, []);

  const scratch = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      v: new THREE.Vector3(),
      s: new THREE.Vector3(),
      zeroM: new THREE.Matrix4().makeScale(0, 0, 0),
    }),
    []
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);

    // 1. Advance 1D traffic simulation & AI state machines
    trafficEngine.update(dt);
    const vehicles = trafficEngine.getVehicles();

    const truck = truckRef.current;
    const bus = busRef.current;
    const rickshaw = rickshawRef.current;
    const car = carRef.current;
    const scooter = scooterRef.current;
    const brakeLights = brakeLightsRef.current;
    const blinkerLeft = blinkerLeftRef.current;
    const blinkerRight = blinkerRightRef.current;

    if (
      !truck ||
      !bus ||
      !rickshaw ||
      !car ||
      !scooter ||
      !brakeLights ||
      !blinkerLeft ||
      !blinkerRight
    ) {
      return;
    }

    const { m, q, e, v, s, zeroM } = scratch;

    let ki = 0; // trucks
    let bi = 0; // buses
    let ri = 0; // rickshaws
    let ci = 0; // cars
    let si = 0; // scooters
    let bli = 0; // brake lights
    let bll = 0; // blinkers left
    let blr = 0; // blinkers right

    // Blink timer (2Hz flashing for indicators)
    const blinkOn = Math.floor(performance.now() / 250) % 2 === 0;

    // 2. Position active vehicles in car-space along road spline
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

      // Road pitch and yaw
      const slope = roadSlopeAtDistance(veh.s);
      const basePitch = Math.atan(slope);

      // Car-space world coordinates
      const cos = Math.cos(T.ry);
      const sin = Math.sin(T.ry);
      const wx = T.px + px * cos + pz * sin;
      const wy = T.py + py;
      const wz = T.pz + (-px * sin + pz * cos);

      const isReverse = veh.lane < 0;
      const yaw = T.ry + lh + (isReverse ? Math.PI : 0);
      const pitch = isReverse ? -basePitch : basePitch;

      e.set(pitch, yaw, 0, "YXZ");
      q.setFromEuler(e);
      v.set(wx, wy, wz);
      s.set(1, 1, 1);
      m.compose(v, q, s);

      // Place in type-specific instanced mesh
      if (veh.type === "truck" && ki < MAX_TRUCKS) {
        truck.setMatrixAt(ki++, m);
      } else if (veh.type === "bus" && bi < MAX_BUSES) {
        bus.setMatrixAt(bi++, m);
      } else if (veh.type === "rickshaw" && ri < MAX_RICKSHAWS) {
        rickshaw.setMatrixAt(ri++, m);
      } else if (veh.type === "car" && ci < MAX_CARS) {
        car.setMatrixAt(ci++, m);
      } else if (veh.type === "scooter" && si < MAX_SCOOTERS) {
        scooter.setMatrixAt(si++, m);
      }

      // Dynamic Brake Lights (when slowing down)
      if (veh.brakeLight && bli < MAX_LIGHTS) {
        const rearDist = veh.length * 0.48;
        const bX = wx + Math.sin(yaw) * rearDist;
        const bZ = wz + Math.cos(yaw) * rearDist;
        v.set(bX, wy + 0.65, bZ);
        m.compose(v, q, s);
        brakeLights.setMatrixAt(bli++, m);
      }

      // Dynamic Turn Indicators (flashing amber)
      if (blinkOn && veh.blinkerLeft && bll < MAX_LIGHTS) {
        const rearDist = veh.length * 0.46;
        const indX = wx + Math.sin(yaw) * rearDist - Math.cos(yaw) * (veh.width * 0.44);
        const indZ = wz + Math.cos(yaw) * rearDist + Math.sin(yaw) * (veh.width * 0.44);
        v.set(indX, wy + 0.7, indZ);
        m.compose(v, q, s);
        blinkerLeft.setMatrixAt(bll++, m);
      }

      if (blinkOn && veh.blinkerRight && blr < MAX_LIGHTS) {
        const rearDist = veh.length * 0.46;
        const indX = wx + Math.sin(yaw) * rearDist + Math.cos(yaw) * (veh.width * 0.44);
        const indZ = wz + Math.cos(yaw) * rearDist - Math.sin(yaw) * (veh.width * 0.44);
        v.set(indX, wy + 0.7, indZ);
        m.compose(v, q, s);
        blinkerRight.setMatrixAt(blr++, m);
      }
    }

    // 3. Zero out unused instances
    for (let i = ki; i < MAX_TRUCKS; i++) truck.setMatrixAt(i, zeroM);
    for (let i = bi; i < MAX_BUSES; i++) bus.setMatrixAt(i, zeroM);
    for (let i = ri; i < MAX_RICKSHAWS; i++) rickshaw.setMatrixAt(i, zeroM);
    for (let i = ci; i < MAX_CARS; i++) car.setMatrixAt(i, zeroM);
    for (let i = si; i < MAX_SCOOTERS; i++) scooter.setMatrixAt(i, zeroM);
    for (let i = bli; i < MAX_LIGHTS; i++) brakeLights.setMatrixAt(i, zeroM);
    for (let i = bll; i < MAX_LIGHTS; i++) blinkerLeft.setMatrixAt(i, zeroM);
    for (let i = blr; i < MAX_LIGHTS; i++) blinkerRight.setMatrixAt(i, zeroM);

    // 4. Mark matrices dirty for GPU upload
    truck.instanceMatrix.needsUpdate = true;
    bus.instanceMatrix.needsUpdate = true;
    rickshaw.instanceMatrix.needsUpdate = true;
    car.instanceMatrix.needsUpdate = true;
    scooter.instanceMatrix.needsUpdate = true;
    brakeLights.instanceMatrix.needsUpdate = true;
    blinkerLeft.instanceMatrix.needsUpdate = true;
    blinkerRight.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="TrafficVehicles">
      {/* Heavy Indian Trucks */}
      <instancedMesh
        ref={truckRef}
        args={[assets.truckGeo, assets.trafficMat, MAX_TRUCKS]}
        castShadow
        receiveShadow
      />
      {/* Highway Passenger Buses */}
      <instancedMesh
        ref={busRef}
        args={[assets.busGeo, assets.trafficMat, MAX_BUSES]}
        castShadow
        receiveShadow
      />
      {/* Auto-Rickshaws */}
      <instancedMesh
        ref={rickshawRef}
        args={[assets.rickshawGeo, assets.trafficMat, MAX_RICKSHAWS]}
        castShadow
        receiveShadow
      />
      {/* Cars & Taxis */}
      <instancedMesh
        ref={carRef}
        args={[assets.carGeo, assets.trafficMat, MAX_CARS]}
        castShadow
        receiveShadow
      />
      {/* Scooters */}
      <instancedMesh
        ref={scooterRef}
        args={[assets.scooterGeo, assets.trafficMat, MAX_SCOOTERS]}
        castShadow
        receiveShadow
      />

      {/* Dynamic Emissive Brake Lights */}
      <instancedMesh
        ref={brakeLightsRef}
        args={[assets.brakeGeo, assets.brakeMat, MAX_LIGHTS]}
      />
      {/* Dynamic Flashing Indicators (Left & Right) */}
      <instancedMesh
        ref={blinkerLeftRef}
        args={[assets.blinkerGeo, assets.blinkerMat, MAX_LIGHTS]}
      />
      <instancedMesh
        ref={blinkerRightRef}
        args={[assets.blinkerGeo, assets.blinkerMat, MAX_LIGHTS]}
      />
    </group>
  );
}
