"use client";

import { Canvas } from "@react-three/fiber";
import { ROTATIONS } from "@/lib/rotations";
import { skyPaletteFor } from "@/lib/sky-colors";
import { useAudioStore } from "@/lib/audio-store";
import DriverRig from "./DriverRig";
import DriveController from "./DriveController";
import RoadChunkManager from "./RoadChunkManager";
import PropInstances from "./props/PropInstances";
import Environment from "./Environment";
import SteeringKeys from "./SteeringKeys";
import SteeringWheel from "./SteeringWheel";
import HornButton from "./HornButton";

/**
 * One ambient + one directional light, no shadow maps (architecture.md §7).
 * Colors/intensity follow the active IST rotation's mood (rotations.ts).
 * Fog is matched to the sky-dome horizon so the desert melts into the sky.
 */
function SceneLighting() {
  const rotationId = useAudioStore((s) => s.rotationId);
  const rotation = ROTATIONS.find((r) => r.id === rotationId) ?? ROTATIONS[2];
  const L = rotation.lighting;
  const pal = skyPaletteFor(L.sky);
  return (
    <>
      <color attach="background" args={[pal.top]} />
      <fog attach="fog" args={[pal.fog, L.fogNear, L.fogFar]} />
      <ambientLight color={L.ambientColor} intensity={L.ambientIntensity} />
      <directionalLight
        color={L.sunColor}
        intensity={L.sunIntensity}
        position={L.sunPosition}
      />
    </>
  );
}

/**
 * DriveScene — the R3F canvas. Step 6: cartoon toon shading, rotation-driven
 * day/night mood, camera bob/sway, horn easter egg.
 *
 * Perf: dpr locked to 1 (Vega 8 floor), no shadows, no postprocessing,
 * 4 road draws + 5 prop draws.
 */
export default function DriveScene() {
  return (
    <div className="relative h-[62vh] min-h-[380px] w-full overflow-hidden rounded-xl border border-amber-900/50">
      <Canvas
        dpr={1}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 55, near: 0.1, far: 900, position: [0, 1.9, 0] }}
        shadows={false}
      >
        <SceneLighting />
        <Environment />
        <RoadChunkManager />
        <PropInstances />
        <DriverRig />
        <DriveController />
      </Canvas>
      <SteeringKeys />
      <SteeringWheel />
      <HornButton />
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/50 px-2 py-1 text-[11px] text-amber-200/80">
        ←/→ or A/D to steer · drag the wheel · Space = radio · H = horn
      </div>
    </div>
  );
}
