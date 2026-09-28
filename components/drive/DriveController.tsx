"use client";

import { useFrame } from "@react-three/fiber";
import { useDriveStore, ROAD_HALF_WIDTH } from "@/lib/drive-store";
import { steeringInput } from "@/lib/steering-input";

/** How fast steeringAngle approaches a held input (per second). */
const STEER_ATTACK = 4.0;
/** How fast steeringAngle returns to 0 on release (per second). */
const STEER_RELEASE = 3.0;
/** Lateral velocity factor: lateralVel = steering * speed * LATERAL_K. */
const LATERAL_K = 0.55;

/**
 * Hand-rolled kinematic controller — architecture.md §4. No physics engine.
 *
 * Per frame:
 *  - target steering: wheel drag value wins, else keyboard ±1, else 0
 *  - steeringAngle eases toward target (arcade feel, no twitch)
 *  - lateralOffset integrates steering * speed, clamped to road half-width
 *  - distanceTraveled advances at constant speed (ambient endless drive)
 */
export default function DriveController() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // clamp tab-switch spikes
    const s = useDriveStore.getState();

    let target = 0;
    if (steeringInput.wheel !== null) {
      target = steeringInput.wheel;
    } else {
      if (steeringInput.left) target -= 1;
      if (steeringInput.right) target += 1;
    }

    const rate = target !== 0 ? STEER_ATTACK : STEER_RELEASE;
    const next = s.steeringAngle + Math.max(-rate * dt, Math.min(rate * dt, target - s.steeringAngle));

    const lateral = Math.max(
      -ROAD_HALF_WIDTH,
      Math.min(ROAD_HALF_WIDTH, s.lateralOffset + next * s.speed * LATERAL_K * dt)
    );

    // One store write per frame; readers use getState (no re-render) except
    // the wheel UI which selects steeringAngle only.
    useDriveStore.setState({
      steeringAngle: next,
      lateralOffset: lateral,
      distanceTraveled: s.distanceTraveled + s.speed * dt,
    });
  });
  return null;
}
