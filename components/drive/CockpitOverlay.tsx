"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useDriveStore } from "@/lib/drive-store";
import { steeringInput } from "@/lib/steering-input";

/**
 * 2D/3D Hybrid Cockpit Overlay:
 * 1. High-resolution Indian bus cabin frame with authentic painted dashboard dials.
 * 2. Interactive 3D Perspective Steering Wheel on tilted gimbal with pointer drag & musical horn.
 * 3. Hanging Nimbu-Mirchi charm with inertia pendulum physics.
 * 4. Windshield glass with sun flare and wiper blades.
 * 5. Cockpit camera shake & road vibration.
 */

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
      // Target angle based on lateral centrifugal force:
      // When turning right (steeringAngle > 0), centrifugal force swings the talisman to the left (positive CSS rotation)
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
            }}
          >
            {/* 1. Windshield Glass Overlay (Sun flare, wiper blades, vintage dust) */}
            <div
              className="pointer-events-none absolute"
              style={{
                left: "25.8%",
                top: "23.5%",
                width: "48.2%",
                height: "40.5%",
                opacity: 0.82,
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

            {/* 3. High-Resolution Indian Bus Cockpit Frame (with integrated dashboard gauges) */}
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

            {/* 4. Interactive 3D Perspective Steering Wheel */}
            {/* 3D Perspective Gimbal Container matching driver POV slant */}
            <div
              className="pointer-events-none absolute"
              style={{
                left: "32.2%",
                top: "78.0%",
                width: "36%",
                aspectRatio: "1 / 1",
                transform: "translate(-50%, -50%)",
                perspective: "700px",
                perspectiveOrigin: "50% 35%",
                zIndex: 20,
              }}
            >
              {/* Tilted Steering Column Plane (Bus Flat Wheel Slant) */}
              <div
                className="pointer-events-auto h-full w-full cursor-grab active:cursor-grabbing will-change-transform"
                style={{
                  transformStyle: "preserve-3d",
                  transform: "rotateX(58deg) rotateY(4deg) rotateZ(-3deg)",
                  transformOrigin: "50% 50%",
                  touchAction: "none",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* Rotating Wheel Disk on 3D Plane */}
                <div
                  ref={wheelRef}
                  className="relative h-full w-full will-change-transform"
                  style={{
                    transformOrigin: "50% 50%",
                    transformStyle: "preserve-3d",
                    transform: "rotateZ(0deg)",
                  }}
                >
                  <img
                    src="/assets/cockpit_processed/steering_wheel.webp"
                    alt="Steering Wheel"
                    className="h-full w-full object-contain pointer-events-none drop-shadow-[0_25px_30px_rgba(0,0,0,0.9)]"
                    draggable={false}
                  />

                  {/* Center Horn Clickable Area */}
                  <button
                    type="button"
                    className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer opacity-0 hover:opacity-10 active:opacity-25 bg-amber-400"
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
