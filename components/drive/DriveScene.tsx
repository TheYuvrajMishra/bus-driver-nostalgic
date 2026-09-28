"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWeatherStore, TIME_LIGHTING_CONFIGS } from "@/lib/weather-store";
import { useDriveStore } from "@/lib/drive-store";
import { useLightningStore } from "@/lib/lightning-system";
import DriverRig from "./DriverRig";
import DriveController from "./DriveController";
import RoadChunkManager from "./RoadChunkManager";
import PropInstances from "./props/PropInstances";
import TrafficManager from "./TrafficManager";
import Environment from "./Environment";
import DistanceDepthBlur from "./DistanceDepthBlur";
import SteeringKeys from "./SteeringKeys";
import CockpitOverlay from "./CockpitOverlay";
import HornButton from "./HornButton";
import TimeOfDayBar from "./TimeOfDayBar";

/**
 * Dynamic Atmospheric Scene Lighting with Extended Directional Sunlight,
 * Hard Shadows & Organic Lightning Flashes:
 */
function SceneLighting() {
  const timeOfDay = useWeatherStore((s) => s.timeOfDay);
  const L = TIME_LIGHTING_CONFIGS[timeOfDay];
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const sunTargetRef = useRef<THREE.Object3D>(null);
  const lightningLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const fogRef = useRef<THREE.Fog>(null);

  useFrame(() => {
    const lateralOffset = useDriveStore.getState().lateralOffset;
    const flash = useLightningStore.getState().lightningFlash;

    if (sunLightRef.current && sunTargetRef.current) {
      // Focus shadow camera forward
      sunTargetRef.current.position.set(lateralOffset, 0, -65);
      sunLightRef.current.position.set(
        lateralOffset + L.sunPosition[0] * 1.5,
        L.sunPosition[1] * 1.5,
        -65 + L.sunPosition[2] * 1.5
      );
      sunLightRef.current.target = sunTargetRef.current;
    }

    // Dynamic lightning burst lighting
    if (lightningLightRef.current) {
      lightningLightRef.current.position.set(lateralOffset + 25, 75, -85);
      lightningLightRef.current.intensity = flash * 5.2;
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = L.ambientIntensity * 0.65 + flash * 2.0;
      if (flash > 0.01) {
        ambientLightRef.current.color.lerpColors(
          new THREE.Color(L.ambientColor),
          new THREE.Color("#e0f2fe"),
          flash * 0.8
        );
      } else {
        ambientLightRef.current.color.set(L.ambientColor);
      }
    }

    if (fogRef.current) {
      if (flash > 0.01) {
        fogRef.current.color.lerpColors(
          new THREE.Color(L.fogColor),
          new THREE.Color("#93b5d6"),
          flash * 0.6
        );
      } else {
        fogRef.current.color.set(L.fogColor);
      }
    }
  });

  return (
    <>
      <color attach="background" args={[L.skyHorizon]} />
      <fog ref={fogRef} attach="fog" args={[L.fogColor, L.fogNear, L.fogFar]} />
      <ambientLight ref={ambientLightRef} color={L.ambientColor} intensity={L.ambientIntensity * 0.65} />

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

      {/* 2. Secondary Soft Warm Sky Bounce Fill Light (NO shadows) */}
      <directionalLight
        color={timeOfDay === "morning" ? "#f6e7cd" : "#8a9ab0"}
        intensity={timeOfDay === "morning" ? 0.6 : 0.6}
        position={[35, 30, -40]}
        castShadow={false}
      />

      {/* 3. Zenith Daylight Downward Fill for crisp facet contrast (NO shadows) */}
      <directionalLight
        color={timeOfDay === "morning" ? "#fff6e6" : "#ffffff"}
        intensity={timeOfDay === "morning" ? 0.45 : 0.35}
        position={[0, 60, 0]}
        castShadow={false}
      />

      {/* 4. Atmospheric Electric Lightning Flash Fill Light */}
      <directionalLight
        ref={lightningLightRef}
        color="#dbeafe"
        intensity={0}
        position={[25, 75, -85]}
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
        <TrafficManager />
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
        <span>↑/↓ Drive</span>
        <span className="opacity-30">·</span>
        <span>A/D Steer</span>
        <span className="opacity-30">·</span>
        <span>H Horn</span>
        <span className="opacity-30">·</span>
        <span>1-4 Mood</span>
        <span className="opacity-30">·</span>
        <span>L Lights</span>
      </div>
    </div>
  );
}
