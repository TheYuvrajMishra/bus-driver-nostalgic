"use client";

import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useWeatherStore, TIME_LIGHTING_CONFIGS, type TimeOfDay } from "@/lib/weather-store";
import DriverRig from "./DriverRig";
import DriveController from "./DriveController";
import RoadChunkManager from "./RoadChunkManager";
import PropInstances from "./props/PropInstances";
import Environment from "./Environment";
import SteeringKeys from "./SteeringKeys";
import CockpitOverlay from "./CockpitOverlay";
import HornButton from "./HornButton";
import TimeOfDayBar from "./TimeOfDayBar";

/**
 * Dynamic Atmospheric Scene Lighting driven by Time of Day & Weather:
 * - Morning: Crisp golden sunlight with warm fog
 * - Storm (Noon): Dark ominous thundercloud lighting with storm haze
 * - Sunset: Glowing orange / lavender horizon rim light
 * - Night: Deep midnight ambience with dynamic bus headlight beams
 */
function SceneLighting() {
  const timeOfDay = useWeatherStore((s) => s.timeOfDay);
  const L = TIME_LIGHTING_CONFIGS[timeOfDay];

  return (
    <>
      <color attach="background" args={[L.skyHorizon]} />
      <fog attach="fog" args={[L.fogColor, L.fogNear, L.fogFar]} />
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
  // Keyboard shortcuts for Time & Weather
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const setTimeOfDay = useWeatherStore.getState().setTimeOfDay;
      if (e.key === "1") setTimeOfDay("morning");
      if (e.key === "2") setTimeOfDay("noon");
      if (e.key === "l" || e.key === "L") useWeatherStore.getState().toggleHeadlights();
      if (e.key === "w" || e.key === "W") useWeatherStore.getState().toggleWipers();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

      {/* Time of Day & Weather Switcher */}
      <TimeOfDayBar />

      {/* Input Handlers */}
      <SteeringKeys />
      <HornButton />

      {/* Subtle Controls Badge */}
      <div className="pointer-events-none fixed right-4 bottom-4 z-30 rounded-lg bg-black/60 px-3.5 py-1.5 text-xs font-mono text-amber-200/90 backdrop-blur-md border border-amber-800/40 shadow-xl">
        A/D to Steer · H = Horn · 1-4 = Weather/Time · L = Lights · W = Wipers
      </div>
    </div>
  );
}
