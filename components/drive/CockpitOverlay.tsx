"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useDriveStore } from "@/lib/drive-store";
import { steeringInput } from "@/lib/steering-input";

/**
 * 2D/3D Hybrid Cockpit Overlay:
 * 1. High-resolution Indian bus cabin frame with authentic painted dashboard dials.
 * 2. Interactive 3D Perspective Volumetric Steering Wheel with calibrated driver POV geometry.
 * 3. Hanging Nimbu-Mirchi charm with inertia pendulum physics.
 * 4. Windshield glass with sun flare and wiper blades.
 * 5. Cockpit camera shake & road vibration.
 */

// Calibrated 3D Volumetric Extrusion Slices (15 depth layers, depth=38px, minBrightness=0.50)
const DEPTH_LAYERS = [
  { z: -38.0, b: 0.50, s: 0.9750 },
  { z: -35.3, b: 0.53, s: 0.9768 },
  { z: -32.6, b: 0.56, s: 0.9785 },
  { z: -29.9, b: 0.59, s: 0.9803 },
  { z: -27.1, b: 0.62, s: 0.9820 },
  { z: -24.4, b: 0.65, s: 0.9838 },
  { z: -21.7, b: 0.68, s: 0.9855 },
  { z: -19.0, b: 0.71, s: 0.9873 },
  { z: -16.3, b: 0.74, s: 0.9890 },
  { z: -13.6, b: 0.77, s: 0.9908 },
  { z: -10.9, b: 0.80, s: 0.9925 },
  { z: -8.1,  b: 0.83, s: 0.9943 },
  { z: -5.4,  b: 0.86, s: 0.9960 },
  { z: -2.7,  b: 0.89, s: 0.9978 },
];

export default function CockpitOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const nimbuRef = useRef<HTMLDivElement>(null);
  const cockpitWrapRef = useRef<HTMLDivElement>(null);

  // Pendulum state for Nimbu-Mirchi charm
  const nimbuState = useRef({
    angle: 0,
    velocity: 0,
  });

  // Horn click handler
  const playHorn = useCallback(() => {
    // Dispatch 'h' keydown event to trigger HornButton audio
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "h" }));
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "h" }));
    }, 450);
  }, []);

  // Pointer drag steering
  const isDragging = useRef(false);
  const dragCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (wheelRef.current) {
      const rect = wheelRef.current.getBoundingClientRect();
      dragCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragCenter.current.x;
    const dy = e.clientY - dragCenter.current.y;
    // Angle from straight up (-y direction)
    const angle = Math.atan2(dx, -dy);
    // Max lock ~ 135 deg
    const maxLock = (135 * Math.PI) / 180;
    const normalized = Math.max(-1, Math.min(1, angle / maxLock));
    steeringInput.wheel = normalized;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    steeringInput.wheel = null;
  };

  // Continuous animation loop using requestAnimationFrame for 60fps buttery smooth cockpit dynamics
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const { speed, steeringAngle } = useDriveStore.getState();
      const t = now * 0.001;

      // 1. Cockpit Rumble & Inertia
      const speedNorm = Math.min(speed / 16, 1.0);
      const idleVibe = (1 - speedNorm) * Math.sin(t * 28) * 0.4;
      const roadBob = speedNorm * Math.sin(t * 14) * 0.8;
      const turnRoll = -steeringAngle * 1.2;
      const turnSway = -steeringAngle * 4;

      if (cockpitWrapRef.current) {
        cockpitWrapRef.current.style.transform = `translate3d(${turnSway.toFixed(2)}px, ${(idleVibe + roadBob).toFixed(2)}px, 0px) rotate(${turnRoll.toFixed(2)}deg)`;
      }

      // 2. Steering Wheel Rotation (smooth lock ~ 135 deg on its 3D plane)
      if (wheelRef.current) {
        const wheelDeg = steeringAngle * 135;
        wheelRef.current.style.transform = `rotateZ(${wheelDeg.toFixed(2)}deg)`;
      }

      // 3. Nimbu-Mirchi Pendulum Physics
      const targetNimbuAngle = steeringAngle * 28 * (0.4 + speedNorm * 0.6);
      const k = 14.0; // spring constant
      const damping = 3.5; // damping
      const force = -k * (nimbuState.current.angle - targetNimbuAngle);
      nimbuState.current.velocity += (force - damping * nimbuState.current.velocity) * dt;
      nimbuState.current.angle += nimbuState.current.velocity * dt;

      // Add gentle idle sway + road bump swing
      const idleSway = Math.sin(t * 3.5) * (0.8 + speedNorm * 2.0);
      const totalNimbuDeg = nimbuState.current.angle + idleSway;

      if (nimbuRef.current) {
        nimbuRef.current.style.transform = `translateX(-50%) rotate(${totalNimbuDeg.toFixed(2)}deg)`;
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
        }}
      >
        {/* Scaling SVG / Absolute canvas space matching 2172 x 724 */}
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
            {/* 1. Windshield Glass Overlay (Sun flare, wiper blades, vintage dust) */}
            <div
              className="pointer-events-none absolute"
              style={{
                left: "24.5%",
                top: "20.5%",
                width: "51.0%",
                height: "46.0%",
                opacity: 0.85,
                mixBlendMode: "screen",
              }}
            >
              <img
                src="/assets/cockpit_processed/windshield_glass.webp"
                alt="Windshield Glass"
                className="h-full w-full object-fill"
              />
            </div>

            {/* 2. Hanging Nimbu-Mirchi Talisman */}
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

            {/* 3. High-Resolution Indian Bus Cockpit Frame (with integrated dashboard dials) */}
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

            {/* 4. Interactive 3D Volumetric Steering Wheel with Calibrated Driver Perspective */}
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
              {/* Tilted Steering Column Plane (Calibrated Bus Wheel Slant) */}
              <div
                className="pointer-events-auto h-full w-full cursor-grab active:cursor-grabbing will-change-transform"
                style={{
                  transformStyle: "preserve-3d",
                  transform: "rotateX(57.5deg) rotateY(-10.5deg) rotateZ(14deg)",
                  transformOrigin: "50% 50%",
                  touchAction: "none",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* Rotating Volumetric 3D Wheel Disk */}
                <div
                  ref={wheelRef}
                  className="relative h-full w-full will-change-transform"
                  style={{
                    transformOrigin: "50% 50%",
                    transformStyle: "preserve-3d",
                    transform: "rotateZ(0deg)",
                  }}
                >
                  {/* Volumetric Extrusion Depth Slices */}
                  {DEPTH_LAYERS.map((layer, i) => (
                    <img
                      key={i}
                      src="/assets/cockpit_processed/steering_wheel.webp"
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                      style={{
                        transform: `translateZ(${layer.z}px) scale(${layer.s})`,
                        filter: `brightness(${layer.b}) contrast(1.2)`,
                        transformStyle: "preserve-3d",
                      }}
                      draggable={false}
                    />
                  ))}

                  {/* Top Face of Steering Wheel */}
                  <img
                    src="/assets/cockpit_processed/steering_wheel.webp"
                    alt="Steering Wheel"
                    className="relative h-full w-full object-contain pointer-events-none drop-shadow-[0_22px_28px_rgba(0,0,0,0.9)]"
                    style={{
                      transform: "translateZ(0px)",
                      transformStyle: "preserve-3d",
                    }}
                    draggable={false}
                  />

                  {/* Center Horn Clickable Area */}
                  <button
                    type="button"
                    className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer opacity-0 hover:opacity-10 active:opacity-25 bg-amber-400"
                    style={{
                      transform: "translate(-50%, -50%) translateZ(12px)",
                    }}
                    onClick={playHorn}
                    aria-label="Honk Horn"
                    title="Click to Honk Musical Horn!"
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
