"use client";

import { useRef } from "react";
import { useDriveStore } from "@/lib/drive-store";
import { steeringInput } from "@/lib/steering-input";

/** Pointer angle (from straight-up) that maps to full lock. */
const FULL_LOCK_RAD = (75 * Math.PI) / 180;

/**
 * Steering drag zone — architecture.md §5, design.md §3.
 *
 * The visible wheel is now the 3D cockpit wheel (DriverRig), which renders
 * from the same steeringAngle store value. This component keeps the proven
 * pointer-drag math as an INVISIBLE touch zone at the bottom of the drive
 * view so mobile drag-to-steer keeps working exactly as before.
 *
 * Pointer-down + drag around the zone's centre writes to the same
 * steeringAngle store value as the keyboard.
 */
export default function SteeringWheel() {
  const steeringAngle = useDriveStore((s) => s.steeringAngle);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const valueFromEvent = (clientX: number, clientY: number) => {
    const el = boxRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    const angle = Math.atan2(dx, -dy); // 0 = up, + = clockwise
    return Math.max(-1, Math.min(1, angle / FULL_LOCK_RAD));
  };

  return (
    <div
      ref={boxRef}
      className="absolute bottom-2 left-1/2 z-10 h-32 w-64 -translate-x-1/2 cursor-grab touch-none select-none opacity-0 active:cursor-grabbing"
      style={{ touchAction: "none" }}
      role="slider"
      aria-label="Steering drag zone"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={Number(steeringAngle.toFixed(2))}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        steeringInput.wheel = valueFromEvent(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (dragging.current) steeringInput.wheel = valueFromEvent(e.clientX, e.clientY);
      }}
      onPointerUp={() => {
        dragging.current = false;
        steeringInput.wheel = null;
      }}
      onPointerCancel={() => {
        dragging.current = false;
        steeringInput.wheel = null;
      }}
    />
  );
}
