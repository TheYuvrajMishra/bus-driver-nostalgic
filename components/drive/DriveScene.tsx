"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWeatherStore, TIME_LIGHTING_CONFIGS } from "@/lib/weather-store";
import { useDriveStore } from "@/lib/drive-store";
import DriverRig from "./DriverRig";
import DriveController from "./DriveController";
import RoadChunkManager from "./RoadChunkManager";
import PropInstances from "./props/PropInstances";
import Environment from "./Environment";
import DistanceDepthBlur from "./DistanceDepthBlur";
import SteeringKeys from "./SteeringKeys";
import CockpitOverlay from "./CockpitOverlay";
import HornButton from "./HornButton";
import TimeOfDayBar from "./TimeOfDayBar";

/**
 * Dynamic Atmospheric Scene Lighting with Extended Directional Sunlight & Hard Shadows:
 * 1. Exactly ONE shadow-casting light in the scene (Primary Warm Directional Sunlight).
 * 2. Hard, sharp comic-book-style shadows via THREE.BasicShadowMap.
 * 3. Extended 2048x2048 shadow map covering 200m+ ahead along the road.
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
      // Focus the shadow camera deep along the forward road corridor (up to 200m+ ahead)
      sunTargetRef.current.position.set(lateralOffset, 0, -65);
      // Position the sunlight relative to the player to maintain consistent sun angle
      sunLightRef.current.position.set(
        lateralOffset + L.sunPosition[0] * 1.5,
        L.sunPosition[1] * 1.5,
        -65 + L.sunPosition[2] * 1.5
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
      <object3D ref={sunTargetRef} position={[0, 0, -65]} />
      
      {/* 1. Primary Warm Directional Sunlight (ONLY shadow-casting light in scene) */}
      <directionalLight
        ref={sunLightRef}
        color={L.sunColor}
        intensity={L.sunIntensity}
        position={L.sunPosition}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        shadow-camera-near={10}
        shadow-camera-far={260}
        shadow-camera-left={-75}
        shadow-camera-right={75}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />

      {/* 2. Secondary Soft Natural Sky Bounce Fill Light (NO shadows) */}
      <directionalLight
        color={timeOfDay === "morning" ? "#e2edfa" : "#8a9ab0"}
        intensity={timeOfDay === "morning" ? 0.75 : 0.6}
        position={[35, 30, -40]}
        castShadow={false}
      />

      {/* 3. Zenith Daylight Downward Fill for crisp facet contrast (NO shadows) */}
      <directionalLight
        color="#ffffff"
        intensity={timeOfDay === "morning" ? 0.55 : 0.35}
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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-black select-none">
      {/* 3D Desert World Canvas with Crisp Basic Shadow Mapping & Cinematic Distance Blur */}
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
        <DistanceDepthBlur />
      </Canvas>

      {/* Layered Indian Bus Cockpit HUD */}
      <CockpitOverlay />

      {/* Time of Day & Weather Switcher */}
      <TimeOfDayBar />

      {/* Input Handlers */}
      <SteeringKeys />
      <HornButton />

      {/* Floating Top Right Glass Pill Navigation (Catalog & Playlists) */}
      <div className="fixed top-4 right-4 sm:right-6 z-40 hidden sm:flex items-center gap-2">
        <Link
          href="/songs"
          className="glass-pill rounded-full px-3.5 py-1.5 text-xs font-semibold text-amber-100/90 shadow-xl transition-all duration-300 hover:scale-105 hover:text-white active:scale-95 flex items-center gap-1.5"
        >
          <span>📻</span>
          <span>100 Songs</span>
        </Link>
        <Link
          href="/playlists"
          className="glass-pill rounded-full px-3.5 py-1.5 text-xs font-semibold text-amber-100/90 shadow-xl transition-all duration-300 hover:scale-105 hover:text-white active:scale-95 flex items-center gap-1.5"
        >
          <span>📼</span>
          <span>Stations</span>
        </Link>
      </div>

      {/* Subtle Minimalist Controls Glass Badge (Bottom Left next to Horn) */}
      <div className="pointer-events-none fixed left-18 sm:left-22 bottom-6 z-30 hidden md:flex items-center gap-2 rounded-full glass-pill px-3 py-1 text-[11px] font-mono text-amber-200/80 shadow-lg">
        <span>A/D Steer</span>
        <span className="opacity-30">·</span>
        <span>H Horn</span>
        <span className="opacity-30">·</span>
        <span>1-2 Mood</span>
        <span className="opacity-30">·</span>
        <span>L Lights</span>
      </div>
    </div>
  );
}
