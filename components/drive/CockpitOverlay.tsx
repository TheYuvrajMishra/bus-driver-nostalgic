"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useDriveStore } from "@/lib/drive-store";
import { useWeatherStore } from "@/lib/weather-store";
import { useLightningStore } from "@/lib/lightning-system";
import { steeringInput } from "@/lib/steering-input";
import { cabinPhysics } from "@/lib/cabin-physics";
import { honk } from "./HornButton";

function WindshieldRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rainIntensity = useWeatherStore((s) => s.rainIntensity);
  const isRain = rainIntensity > 0.1;

  useEffect(() => {
    if (!isRain) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    interface GlassDrop {
      x: number;
      y: number;
      r: number;
      trail: number;
      opacity: number;
      speed: number;
      age: number;
      maxAge: number;
    }
    const drops: GlassDrop[] = [];
    const maxDrops = 40;

    for (let i = 0; i < maxDrops; i++) {
      drops.push({
        x: Math.random() * 800,
        y: Math.random() * 500,
        r: 1.2 + Math.random() * 2.2,
        trail: Math.random() * 8,
        opacity: 0.2 + Math.random() * 0.35,
        speed: 2 + Math.random() * 8,
        age: Math.random() * 10,
        maxAge: 6 + Math.random() * 12,
      });
    }

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      ctx.clearRect(0, 0, 800, 500);

      const busSpeed = useDriveStore.getState().speed;
      const jolt = Math.sin(time * 0.015) * 0.4;

      // Draw each organic rain droplet
      for (const d of drops) {
        d.age += dt;
        d.y += (d.speed + busSpeed * 0.4) * dt;
        d.x += jolt * 0.2;

        // If droplet lifespan ends or it trickles off bottom, respawn at a completely random spot on glass
        if (d.age > d.maxAge || d.y > 510) {
          d.x = Math.random() * 800;
          d.y = Math.random() * 490; // Anywhere on windshield pane
          d.r = 1.2 + Math.random() * 2.2;
          d.trail = Math.random() * 8;
          d.opacity = 0.2 + Math.random() * 0.35;
          d.speed = 2 + Math.random() * 8;
          d.age = 0;
          d.maxAge = 6 + Math.random() * 12;
        }

        // Small water bead trail
        if (d.trail > 2) {
          ctx.strokeStyle = `rgba(200, 225, 250, ${d.opacity * 0.45})`;
          ctx.lineWidth = d.r * 0.6;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y - d.trail);
          ctx.lineTo(d.x, d.y);
          ctx.stroke();
        }

        // Water droplet bead
        ctx.fillStyle = `rgba(230, 245, 255, ${d.opacity})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();

        // Droplet specular glint
        ctx.fillStyle = `rgba(255, 255, 255, ${d.opacity * 1.3})`;
        ctx.beginPath();
        ctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isRain]);

  if (!isRain) return null;

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={500}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 3 }}
    />
  );
}

/**
 * Multi-layer 3D volumetric extrusion for steering wheel rim & spokes
 */
const DEPTH_LAYERS = [
  { z: -16, s: 0.94, b: 0.35 },
  { z: -12, s: 0.955, b: 0.45 },
  { z: -8, s: 0.97, b: 0.6 },
  { z: -4, s: 0.985, b: 0.78 },
  { z: 0, s: 1.0, b: 1.0 },
];

/**
 * CockpitOverlay with 3D Volumetric Steering Wheel, Spring-Damper Cabin Physics,
 * Calibrated Instrument Needles (Speedometer & Tachometer), and Nimbu-Mirchi Pendulum.
 */
export default function CockpitOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cockpitWrapRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const nimbuRef = useRef<HTMLDivElement>(null);
  const lightningFlash = useLightningStore((s) => s.lightningFlash);

  // Mouse / Pointer drag state for steering wheel
  const isDragging = useRef(false);
  const dragCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startPointerAngle = useRef(0);
  const startWheelAngle = useRef(0);

  // ----------------------------------------------------
  // Interactive Pointer Drag Handling
  // ----------------------------------------------------
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    dragCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    const dx = e.clientX - dragCenter.current.x;
    const dy = e.clientY - dragCenter.current.y;
    startPointerAngle.current = Math.atan2(dy, dx);
    startWheelAngle.current =
      (useDriveStore.getState().steeringAngle * Math.PI) / 3.0;
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragCenter.current.x;
    const dy = e.clientY - dragCenter.current.y;
    const curAngle = Math.atan2(dy, dx);
    let delta = curAngle - startPointerAngle.current;

    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;

    const newSteering = Math.max(
      -1,
      Math.min(1, (startWheelAngle.current + delta) / (Math.PI / 3.0))
    );
    useDriveStore.getState().setSteering(newSteering);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  }, []);

  // ----------------------------------------------------
  // Animation Frame: Cabin Motion Rig, Gauges, Talisman & Wheel
  // ----------------------------------------------------
  useEffect(() => {
    let animId: number;
    let prevTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - prevTime) / 1000, 0.1);
      prevTime = time;

      const {
        steeringAngle,
        speed,
        speedKmh,
        rpm,
        distanceTraveled,
        throttle,
        brake,
        shakeImpulse,
      } = useDriveStore.getState();

      // 1. In-plane Steering Wheel Rotation (Z-axis spin)
      if (wheelRef.current) {
        const spinDeg = steeringAngle * 75; // 75 deg max lock
        wheelRef.current.style.transform = `rotateZ(${spinDeg}deg)`;
      }

      // 2. Cabin Spring-Damper & Secondary Physics
      const motion = cabinPhysics.update(
        dt,
        time / 1000,
        speed,
        steeringAngle,
        throttle,
        brake,
        shakeImpulse
      );

      // Cabin Body Pitch/Roll/Heave/Sway
      if (cockpitWrapRef.current) {
        const tX = motion.cabinSway.toFixed(2);
        const tY = motion.cabinHeave.toFixed(2);
        const rZ = motion.cabinRoll.toFixed(2);
        const rX = motion.cabinPitch.toFixed(2);
        cockpitWrapRef.current.style.transform = `translate3d(${tX}px, ${tY}px, 0) rotateX(${rX}deg) rotateZ(${rZ}deg)`;
      }

      // Hanging Nimbu-Mirchi Charm
      if (nimbuRef.current) {
        nimbuRef.current.style.transform = `rotate(${motion.talismanAngle.toFixed(2)}deg)`;
      }

      // Smooth return to center when not dragging or pressing keys
      if (!isDragging.current && !steeringInput.left && !steeringInput.right) {
        if (Math.abs(steeringAngle) > 0.001) {
          const decayed = steeringAngle * Math.exp(-dt * 6.0);
          useDriveStore
            .getState()
            .setSteering(Math.abs(decayed) < 0.001 ? 0 : decayed);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-10 flex h-full w-full items-center justify-center overflow-hidden select-none"
    >
      {/* 
        Responsive Cockpit Container:
        Using aspect-ratio scaling to match 2172x724 native resolution 
        while filling the viewport comfortably.
      */}
      <div
        ref={cockpitWrapRef}
        className="relative h-full w-full will-change-transform"
        style={{
          width: "100vw",
          height: "100vh",
          minWidth: "100vw",
          minHeight: "100vh",
          transformOrigin: "center 85%",
        }}
      >
        {/* Scaling canvas space matching 2172 x 724 */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ width: "100%", height: "100%" }}
        >
          <div
            className="relative"
            style={{
              width: "100vw",
              height: "calc(100vw * (724 / 2172))",
              minHeight: "100vh",
              minWidth: "calc(100vh * (2172 / 724))",
              transform: "scale(1.16) translateY(1.5%)",
              transformOrigin: "center 42%",
            }}
          >
            {/* 1. Windshield Glass Overlay — strictly UNDERNEATH the cockpit frame (zIndex: 2) */}
            <div
              className="pointer-events-none absolute overflow-hidden"
              style={{
                left: "24.5%",
                top: "20.5%",
                width: "51.0%",
                height: "46.0%",
                opacity: 0.85,
                zIndex: 2,
                mixBlendMode: "screen",
              }}
            >
              <img
                src="/assets/cockpit_processed/windshield_glass.webp"
                alt="Windshield Glass"
                className="h-full w-full object-fill"
              />
              <WindshieldRain />
            </div>

            {/* 2. High-Resolution Indian Bus Cockpit Frame (zIndex: 10) */}
            <div
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ zIndex: 10 }}
            >
              <img
                src="/assets/cockpit_processed/cockpit_frame.webp"
                alt="Bus Cockpit"
                className="h-full w-full object-fill"
              />
            </div>

            {/* Ambient Lightning Flash Sheen across Windshield & Interior Glass */}
            {lightningFlash > 0.01 && (
              <div
                className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-75"
                style={{
                  backgroundColor: "rgba(219, 234, 254, 0.22)",
                  opacity: lightningFlash,
                  zIndex: 12,
                }}
              />
            )}

            {/* 3. Hanging Nimbu-Mirchi Talisman (zIndex: 15) */}
            <div
              ref={nimbuRef}
              className="pointer-events-none absolute will-change-transform"
              style={{
                left: "50.0%",
                top: "16.2%",
                width: "4.8%",
                height: "23.5%",
                transformOrigin: "top center",
                zIndex: 15,
              }}
            >
              <img
                src="/assets/cockpit_processed/nimbu_mirchi.webp"
                alt="Nimbu Mirchi"
                className="h-full w-full object-contain"
              />
            </div>

            {/* 4. Interactive 3D Volumetric Steering Wheel with Calibrated Driver Perspective (zIndex: 20) */}
            <div
              className="pointer-events-none absolute"
              style={{
                left: "30.8%",
                top: "80%",
                width: "28.5%",
                aspectRatio: "1 / 1",
                transform: "translate(-50%, -50%)",
                perspective: "1600px",
                perspectiveOrigin: "50% 9%",
                zIndex: 20,
              }}
            >
              {/* Outer Gimbal with User-Tuned 3D Slant Angles */}
              <div
                className="relative h-full w-full"
                style={{
                  transformStyle: "preserve-3d",
                  transform:
                    "rotateX(57.5deg) rotateY(-10.5deg) rotateZ(14deg)",
                  transformOrigin: "center center",
                }}
              >
                {/* Spinning Wheel Container with 3D Depth Slices */}
                <div
                  ref={wheelRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="pointer-events-auto relative h-full w-full cursor-grab active:cursor-grabbing will-change-transform"
                  style={{
                    transformStyle: "preserve-3d",
                    transformOrigin: "center center",
                  }}
                >
                  {/* Volumetric Depth Extrusion Slices */}
                  {DEPTH_LAYERS.map((layer, index) => {
                    const isFront = index === DEPTH_LAYERS.length - 1;
                    return (
                      <div
                        key={index}
                        className="pointer-events-none absolute inset-0"
                        style={{
                          transformStyle: "preserve-3d",
                          transform: `translateZ(${layer.z}px) scale(${layer.s})`,
                          filter: `brightness(${layer.b})`,
                          opacity: isFront ? 1 : 0.92,
                        }}
                      >
                        <img
                          src="/assets/cockpit_processed/steering_wheel.webp"
                          alt={`Steering Layer ${index}`}
                          className="h-full w-full object-contain"
                          draggable={false}
                        />
                      </div>
                    );
                  })}

                  {/* Clickable Center Horn Area */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      honk();
                    }}
                    title="Press Horn (H)"
                    className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[32%] w-[32%] rounded-full cursor-pointer hover:ring-2 hover:ring-amber-400/40"
                    style={{
                      transform: "translateZ(8px)",
                      zIndex: 30,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
