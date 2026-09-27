"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useDriveStore } from "@/lib/drive-store";
import { steeringInput } from "@/lib/steering-input";

/**
 * 2D/3D Hybrid Cockpit Overlay:
 * 1. High-resolution Indian bus cabin frame with cutouts.
 * 2. Active vintage TATA cluster (Speedometer, Tachometer, Fuel, Temp with animated needles).
 * 3. Interactive rotating Steering Wheel with driver hands on the steering column.
 * 4. Hanging Nimbu-Mirchi charm with inertia pendulum physics.
 * 5. Windshield glass with sun flare and wiper blades.
 * 6. Cockpit camera shake & road vibration.
 */

// Native aspect ratio of the cockpit frame (2171 x 724)
const FRAME_W = 2171;
const FRAME_H = 724;

export default function CockpitOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const nimbuRef = useRef<HTMLDivElement>(null);
  const speedoNeedleRef = useRef<HTMLDivElement>(null);
  const rpmNeedleRef = useRef<HTMLDivElement>(null);
  const fuelNeedleRef = useRef<HTMLDivElement>(null);
  const tempNeedleRef = useRef<HTMLDivElement>(null);
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

  const handlePointerUp = (e: React.PointerEvent) => {
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

      // 2. Steering Wheel Rotation (smooth lock ~ 135 deg, clockwise when steering right)
      if (wheelRef.current) {
        const wheelDeg = steeringAngle * 135;
        wheelRef.current.style.transform = `translate(-50%, -50%) rotate(${wheelDeg.toFixed(2)}deg)`;
      }

      // 3. Gauge Needles
      // Speedometer: 0 to 120 km/h -> -135 deg to +135 deg
      // Let's scale speed (0..16 m/s -> 0..60 km/h in simulation, multiplier ~ 3.6)
      const kmh = Math.min(speed * 3.6, 120);
      const speedDeg = -135 + (kmh / 120) * 270 + (Math.sin(t * 30) * speedNorm * 0.8);
      if (speedoNeedleRef.current) {
        speedoNeedleRef.current.style.transform = `translate(-50%, -50%) rotate(${speedDeg.toFixed(2)}deg)`;
      }

      // Tachometer (RPM): 0 to 40 (x100) -> -135 deg to +135 deg
      // Idle at 800 RPM (-80 deg), revs up to 2800 RPM with speed
      const rpm = 8 + speedNorm * 22 + (Math.sin(t * 22) * speedNorm * 0.5);
      const rpmDeg = -135 + (rpm / 40) * 270;
      if (rpmNeedleRef.current) {
        rpmNeedleRef.current.style.transform = `translate(-50%, -50%) rotate(${rpmDeg.toFixed(2)}deg)`;
      }

      // Fuel Needle: points to ~ 70% full with subtle vibration
      const fuelDeg = -15 + Math.sin(t * 2) * 1.5;
      if (fuelNeedleRef.current) {
        fuelNeedleRef.current.style.transform = `translate(-50%, -50%) rotate(${fuelDeg.toFixed(2)}deg)`;
      }

      // Temp Needle: sits at optimal operating zone (40% mark)
      const tempDeg = -30 + Math.sin(t * 1.2) * 0.8;
      if (tempNeedleRef.current) {
        tempNeedleRef.current.style.transform = `translate(-50%, -50%) rotate(${tempDeg.toFixed(2)}deg)`;
      }

      // 4. Nimbu-Mirchi Pendulum Physics
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
        Using aspect-ratio scaling to match 2171x724 native resolution 
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
        {/* Scaling SVG / Absolute canvas space matching 2171 x 724 */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ width: "100%", height: "100%" }}
        >
          <div
            className="relative"
            style={{
              width: "100vw",
              height: "calc(100vw * (724 / 2171))",
              minHeight: "100vh",
              minWidth: "calc(100vh * (2171 / 724))",
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

            {/* 3. Dashboard Instrument Cluster (Mounted on the binnacle bezels) */}
            {/* Speedometer (Dial 1) */}
            <div
              className="pointer-events-none absolute aspect-square rounded-full overflow-hidden shadow-2xl"
              style={{
                left: "27.38%",
                top: "75.21%",
                width: "5.80%",
                transform: "translate(-50%, -50%)",
                zIndex: 12,
              }}
            >
              <img
                src="/assets/cockpit_processed/gauge_speedo.png"
                alt="Speedometer"
                className="absolute inset-0 h-full w-full object-contain"
              />
              <div
                ref={speedoNeedleRef}
                className="absolute left-1/2 top-1/2 h-full w-full will-change-transform"
                style={{ transform: "translate(-50%, -50%) rotate(-135deg)" }}
              >
                <img
                  src="/assets/cockpit_processed/needle_up.png"
                  alt="Speed Needle"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            {/* Tachometer / RPM (Dial 2) */}
            <div
              className="pointer-events-none absolute aspect-square rounded-full overflow-hidden shadow-2xl"
              style={{
                left: "32.22%",
                top: "74.80%",
                width: "5.53%",
                transform: "translate(-50%, -50%)",
                zIndex: 12,
              }}
            >
              <img
                src="/assets/cockpit_processed/gauge_rpm.png"
                alt="RPM Gauge"
                className="absolute inset-0 h-full w-full object-contain"
              />
              <div
                ref={rpmNeedleRef}
                className="absolute left-1/2 top-1/2 h-full w-full will-change-transform"
                style={{ transform: "translate(-50%, -50%) rotate(-135deg)" }}
              >
                <img
                  src="/assets/cockpit_processed/needle_up.png"
                  alt="RPM Needle"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            {/* Fuel Gauge (Dial 3) */}
            <div
              className="pointer-events-none absolute aspect-square rounded-full overflow-hidden shadow-2xl"
              style={{
                left: "37.29%",
                top: "75.14%",
                width: "5.71%",
                transform: "translate(-50%, -50%)",
                zIndex: 12,
              }}
            >
              <img
                src="/assets/cockpit_processed/gauge_fuel.png"
                alt="Fuel Gauge"
                className="absolute inset-0 h-full w-full object-contain"
              />
              <div
                ref={fuelNeedleRef}
                className="absolute left-1/2 top-1/2 h-full w-full will-change-transform"
                style={{ transform: "translate(-50%, -50%) rotate(0deg)" }}
              >
                <img
                  src="/assets/cockpit_processed/needle_up.png"
                  alt="Fuel Needle"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            {/* Temperature Gauge (Dial 4) */}
            <div
              className="pointer-events-none absolute aspect-square rounded-full overflow-hidden shadow-2xl"
              style={{
                left: "42.12%",
                top: "75.21%",
                width: "5.71%",
                transform: "translate(-50%, -50%)",
                zIndex: 12,
              }}
            >
              <img
                src="/assets/cockpit_processed/gauge_temp.png"
                alt="Temp Gauge"
                className="absolute inset-0 h-full w-full object-contain"
              />
              <div
                ref={tempNeedleRef}
                className="absolute left-1/2 top-1/2 h-full w-full will-change-transform"
                style={{ transform: "translate(-50%, -50%) rotate(0deg)" }}
              >
                <img
                  src="/assets/cockpit_processed/needle_up.png"
                  alt="Temp Needle"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            {/* 4. High-Resolution Indian Bus Cockpit Frame */}
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

            {/* 5. Interactive Steering Wheel */}
            {/* Mounted on the steering column at cx=32.2%, cy=77.3% */}
            <div
              ref={wheelRef}
              className="pointer-events-auto absolute aspect-square cursor-grab active:cursor-grabbing will-change-transform"
              style={{
                left: "32.2%",
                top: "77.3%",
                width: "27.5%",
                transform: "translate(-50%, -50%) rotate(0deg)",
                transformOrigin: "50% 50%",
                zIndex: 20,
                touchAction: "none",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <img
                src="/assets/cockpit_processed/steering_wheel.webp"
                alt="Steering Wheel"
                className="h-full w-full object-contain pointer-events-none"
                draggable={false}
              />

              {/* Center Horn Clickable Area */}
              <button
                type="button"
                className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer opacity-0 hover:opacity-10 active:opacity-25 bg-amber-400"
                onClick={playHorn}
                aria-label="Honk Horn"
                title="Click to Honk Musical Horn!"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
