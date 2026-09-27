"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWeatherStore, TIME_LIGHTING_CONFIGS } from "@/lib/weather-store";
import { useDriveStore } from "@/lib/drive-store";
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
 * Dynamic Atmospheric Scene Lighting with Real-Time Directional Sunlight & Hard Shadows:
 * 1. Exactly ONE shadow-casting light in the scene (Primary Warm Directional Sunlight).
 * 2. Hard, sharp comic-book-style shadows via THREE.BasicShadowMap (optimized for Ryzen 2200G / Vega 8 iGPU).
 * 3. 1024x1024 shadow map resolution tightly focused on the near 1-2 chunks around the driver.
 * 4. Dynamic shadow camera follows the player's lateral steering position each frame.
 */
function SceneLighting() {
  const timeOfDay = useWeatherStore((s) => s.timeOfDay);
  const L = TIME_LIGHTING_CONFIGS[timeOfDay];
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const sunTargetRef = useRef<THREE.Object3D>(null);

  useFrame(() => {
    const lateralOffset = useDriveStore.getState().lateralOffset;
    if (sunLightRef.current && sunTargetRef.current) {
      // Focus the shadow camera on the active road swath in front of the vehicle
      sunTargetRef.current.position.set(lateralOffset, 0, -35);
      // Position the sunlight relative to the player to maintain consistent sun angle
      sunLightRef.current.position.set(
        lateralOffset + L.sunPosition[0],
        L.sunPosition[1],
        -35 + L.sunPosition[2]
      );
      sunLightRef.current.target = sunTargetRef.current;
    }
  });

  return (
    <>
      <color attach="background" args={[L.skyHorizon]} />
      <fog attach="fog" args={[L.fogColor, L.fogNear, L.fogFar]} />
      <ambientLight color={L.ambientColor} intensity={L.ambientIntensity * 0.65} />

      {/* Target object for the directional sunlight shadow camera */}
      <object3D ref={sunTargetRef} position={[0, 0, -35]} />
      
      {/* 1. Primary Warm Directional Sunlight (ONLY shadow-casting light in scene) */}
      <directionalLight
        ref={sunLightRef}
        color={L.sunColor}
        intensity={L.sunIntensity}
        position={L.sunPosition}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
        shadow-camera-near={8}
        shadow-camera-far={160}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
      />

      {/* 2. Secondary Saturated Azure Sky Bounce Directional Light (NO shadows) */}
      <directionalLight
        color={timeOfDay === "morning" ? "#7ac0ff" : "#8a9ab0"}
        intensity={timeOfDay === "morning" ? 1.4 : 0.6}
        position={[35, 30, -40]}
        castShadow={false}
      />

      {/* 3. Zenith Daylight Downward Fill for crisp facet contrast (NO shadows) */}
      <directionalLight
        color="#ffffff"
        intensity={timeOfDay === "morning" ? 0.75 : 0.35}
        position={[0, 60, 0]}
        castShadow={false}
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
      {/* 3D Desert World Canvas with Crisp Basic Shadow Mapping */}
      <Canvas
        dpr={1}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 58, near: 0.1, far: 950, position: [0, 1.85, 0] }}
        shadows="basic"
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.BasicShadowMap;
        }}
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
