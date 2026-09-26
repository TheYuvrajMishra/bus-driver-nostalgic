"use client";

import { Canvas } from "@react-three/fiber";
import DriverRig from "./DriverRig";
import DriveController from "./DriveController";
import StaticRoad from "./StaticRoad";
import SteeringKeys from "./SteeringKeys";
import SteeringWheel from "./SteeringWheel";

/**
 * DriveScene — the R3F canvas. Step 3: kinematic steering is live
 * (keyboard ←/→ or A/D + on-screen wheel). Still the static road — chunks
 * arrive in step 4.
 *
 * Perf: dpr locked to 1 (Vega 8 floor), no shadows, no postprocessing.
 */
export default function DriveScene() {
  return (
    <div className="relative h-[62vh] min-h-[380px] w-full overflow-hidden rounded-xl border border-amber-900/50">
      <Canvas
        dpr={1}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 62, near: 0.1, far: 900, position: [0, 1.45, 0] }}
        shadows={false}
      >
        <color attach="background" args={["#101418"]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[6, 12, 4]} intensity={1.6} />
        <StaticRoad />
        <DriverRig />
        <DriveController />
      </Canvas>
      <SteeringKeys />
      <SteeringWheel />
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/50 px-2 py-1 text-[11px] text-amber-200/80">
        Step 3 — ←/→ or A/D to steer, or drag the wheel
      </div>
    </div>
  );
}
