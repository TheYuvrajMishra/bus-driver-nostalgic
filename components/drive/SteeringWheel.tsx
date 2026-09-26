"use client";

import { useRef } from "react";
import { useDriveStore } from "@/lib/drive-store";
import { steeringInput } from "@/lib/steering-input";

/** Pointer angle (from straight-up) that maps to full lock. */
const FULL_LOCK_RAD = (75 * Math.PI) / 180;
/** Visual rotation of the wheel graphic at full lock. */
const VISUAL_DEG = 135;

/**
 * On-screen steering wheel — architecture.md §5, design.md §3.
 *
 * Pointer-down + drag around the wheel's centre writes to the same
 * steeringAngle store value as the keyboard. The graphic always renders
 * from the store value, so keyboard and drag are visually indistinguishable.
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
      className="absolute bottom-4 left-1/2 z-10 h-28 w-28 -translate-x-1/2 cursor-grab touch-none select-none rounded-full opacity-70 transition-opacity hover:opacity-100 active:cursor-grabbing"
      style={{ touchAction: "none" }}
      role="slider"
      aria-label="Steering wheel"
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
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
        style={{ transform: `rotate(${steeringAngle * VISUAL_DEG}deg)` }}
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke="#b45309" strokeWidth="7" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.6" />
        {[0, 120, 240].map((deg) => (
          <line
            key={deg}
            x1="50"
            y1="50"
            x2={50 + 40 * Math.cos(((deg - 90) * Math.PI) / 180)}
            y2={50 + 40 * Math.sin(((deg - 90) * Math.PI) / 180)}
            stroke="#b45309"
            strokeWidth="6"
            strokeLinecap="round"
          />
        ))}
        <circle cx="50" cy="50" r="12" fill="#92400e" />
        <circle cx="50" cy="50" r="5" fill="#f59e0b" />
      </svg>
    </div>
  );
}
