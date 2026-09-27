"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useDriveStore } from "@/lib/drive-store";
import { steeringInput } from "@/lib/steering-input";
import { honk } from "./HornButton";

/**
 * 2D/3D Hybrid Cockpit Overlay:
 * 1. Windshield Glass Layer (Underneath cockpit frame, zIndex: 2)
 * 2. High-resolution Indian bus cabin frame with authentic painted dashboard dials (zIndex: 10).
 * 3. Hanging Nimbu-Mirchi charm with inertia pendulum physics (zIndex: 15).
 * 4. Interactive 3D Perspective Volumetric Steering Wheel with calibrated driver POV geometry (zIndex: 20).
 * 5. Cockpit camera shake & road vibration.
 */

// Calibrated 3D Volumetric Extrusion Slices (clean, shadow-free, bright front face)
const DEPTH_LAYERS = [
  { z: -38.0, b: 0.70, s: 0.9750 },
  { z: -35.3, b: 0.72, s: 0.9768 },
  { z: -32.6, b: 0.74, s: 0.9785 },
  { z: -29.9, b: 0.76, s: 0.9803 },
  { z: -27.1, b: 0.78, s: 0.9820 },
  { z: -24.4, b: 0.81, s: 0.9838 },
  { z: -21.7, b: 0.84, s: 0.9855 },
  { z: -19.0, b: 0.87, s: 0.9873 },
  { z: -16.3, b: 0.89, s: 0.9890 },
  { z: -13.6, b: 0.92, s: 0.9908 },
  { z: -10.9, b: 0.94, s: 0.9925 },
  { z: -8.1, b: 0.96, s: 0.9943 },
  { z: -5.4, b: 0.97, s: 0.9960 },
  { z: -2.7, b: 0.99, s: 0.9978 },
  { z: 0.0, b: 1.00, s: 1.0000 },
];

export default function CockpitOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cockpitWrapRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const nimbuRef = useRef<HTMLDivElement>(null);

  // Mouse / Pointer drag state for steering wheel
  const isDragging = useRef(false);
  const dragCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startPointerAngle = useRef(0);
  const startWheelAngle = useRef(0);

  // Inertia states
  const nimbuAngle = useRef(0);
  const nimbuVel = useRef(0);

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
    startWheelAngle.current = (useDriveStore.getState().steeringAngle * Math.PI) / 3.0;
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
  // Animation Frame: Wheel Spin, Talisman Sway, Engine Shake
  // ----------------------------------------------------
  useEffect(() => {
    let animId: number;
    let prevTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - prevTime) / 1000, 0.1);
      prevTime = time;

      const { steeringAngle, speed } = useDriveStore.getState();
      const speedNorm = Math.min(speed / 16, 1.0);

      // 1. In-plane Steering Wheel Rotation (Z-axis spin in local tilted coordinate frame)
      if (wheelRef.current) {
        const spinDeg = steeringAngle * 75; // 75 deg max rotation lock
        wheelRef.current.style.transform = `rotateZ(${spinDeg}deg)`;
      }

      // 2. Nimbu-Mirchi Charm Inertia (Spring pendulum physics)
      if (nimbuRef.current) {
        const targetAngle = -steeringAngle * 38;
        const springForce = (targetAngle - nimbuAngle.current) * 16.0;
        const damping = -nimbuVel.current * 4.8;
        const roadJolt = Math.sin(time * 0.014) * 2.2 * speedNorm;

        nimbuVel.current += (springForce + damping + roadJolt) * dt;
        nimbuAngle.current += nimbuVel.current * dt;

        nimbuRef.current.style.transform = `rotate(${nimbuAngle.current.toFixed(2)}deg)`;
      }

      // 3. Cabin Engine Vibration & Road Bump Shake
      if (cockpitWrapRef.current) {
        const idleVibeY = Math.sin(time * 0.024) * 0.6;
        const roadBumpY = Math.sin(time * 0.012) * 1.2 * speedNorm;
        const roadBumpX = Math.cos(time * 0.007) * 0.7 * speedNorm;

        cockpitWrapRef.current.style.transform = `translate3d(${roadBumpX.toFixed(2)}px, ${(idleVibeY + roadBumpY).toFixed(2)}px, 0)`;
      }

      // Smooth return to center when not dragging or pressing keys
      if (!isDragging.current && !steeringInput.left && !steeringInput.right) {
        if (Math.abs(steeringAngle) > 0.001) {
          const decayed = steeringAngle * Math.exp(-dt * 6.0);
          useDriveStore.getState().setSteering(Math.abs(decayed) < 0.001 ? 0 : decayed);
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
              className="pointer-events-none absolute"
              style={{
                left: "24.5%",
                top: "20.5%",
                width: "51.0%",
                height: "46.0%",
                opacity: 0.75,
                zIndex: 2,
                mixBlendMode: "screen",
              }}
            >
              <img
                src="/assets/cockpit_processed/windshield_glass.webp"
                alt="Windshield Glass"
                className="h-full w-full object-fill"
              />
            </div>

            {/* 2. High-Resolution Indian Bus Cockpit Frame (with integrated dashboard dials) (zIndex: 10) */}
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
                  transform: "rotateX(57.5deg) rotateY(-10.5deg) rotateZ(14deg)",
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
