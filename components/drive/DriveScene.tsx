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
import CockpitOverlay from "./CockpitOverlay";
import HornButton from "./HornButton";

/**
 * Lighting matched to IST rotation (morning, afternoon, golden hour, dusk, midnight).
 * Fog matches the desert horizon sky color for infinite landscape blending.
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

export default function DriveScene() {
  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-black select-none">
      {/* 3D Desert World Canvas */}
      <Canvas
        dpr={1}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 58, near: 0.1, far: 950, position: [0, 1.85, 0] }}
        shadows={false}
        className="h-full w-full"
      >
        <SceneLighting />
        <Environment />
        <RoadChunkManager />
        <PropInstances />
        <DriverRig />
        <DriveController />
      </Canvas>

      {/* Layered Indian Bus Cockpit HUD */}
      <CockpitOverlay />

      {/* Input Handlers */}
      <SteeringKeys />
      <HornButton />

      {/* Subtle Retro Controls Badge */}
      <div className="pointer-events-none absolute right-4 top-4 z-30 rounded-lg bg-black/60 px-3.5 py-1.5 text-xs font-mono text-amber-200/90 backdrop-blur-md border border-amber-800/40 shadow-xl">
        A/D or ←/→ to steer · Drag wheel · H = Horn · Space = Radio
      </div>
    </div>
  );
}
