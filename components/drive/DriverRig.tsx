"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useDriveStore, EYE_HEIGHT } from "@/lib/drive-store";
import {
  roadSlopeAtDistance,
  roadElevationAtDistance,
} from "@/lib/road-generator";
import { cabinPhysics } from "@/lib/cabin-physics";

/**
 * DriverRig — Camera Motion & Head Inertia Controller:
 *
 * Implements the second-order driver head lag & counter-motion model:
 * - Driver position follows lateral offset + spring-damper head sway
 * - Braking lurches view forward and pitches down slightly
 * - Turns produce realistic head lean and counter-sway
 * - Elevation & hill slope tracking for seamless uphill/downhill views
 */
export default function DriverRig() {
  const camera = useThree((s) => s.camera);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const {
      lateralOffset,
      steeringAngle,
      speed,
      distanceTraveled,
      throttle,
      brake,
      shakeImpulse,
    } = useDriveStore.getState();

    const t = state.clock.elapsedTime;

    // 1. Update Spring-Damper Physics
    const motion = cabinPhysics.update(
      dt,
      t,
      speed,
      steeringAngle,
      throttle,
      brake,
      shakeImpulse
    );

    // 2. Road Slope & Elevation ahead
    const slope = roadSlopeAtDistance(distanceTraveled);
    const elevAhead =
      roadElevationAtDistance(distanceTraveled + 45) -
      roadElevationAtDistance(distanceTraveled);

    // 3. Driver Head Camera Position in Car-Space
    const camX = lateralOffset + motion.headX;
    const camY = EYE_HEIGHT + motion.headY;
    const camZ = motion.headZ;
    camera.position.set(camX, camY, camZ);

    // 4. Look-at Target with turn anticipation and hill climbing
    const lookTargetX = lateralOffset * 0.65 + motion.headX * 2.0 - steeringAngle * 3.8;
    const lookTargetY = 1.45 + elevAhead * 0.6 + motion.headPitch * 15.0;
    camera.lookAt(lookTargetX, lookTargetY, -55);

    // 5. Dynamic Camera Roll & Pitch Lean
    camera.rotateZ(motion.headRoll);
    camera.rotateX(motion.headPitch);
  });

  return null;
}
