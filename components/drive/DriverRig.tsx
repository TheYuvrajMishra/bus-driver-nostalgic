"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useDriveStore, EYE_HEIGHT } from "@/lib/drive-store";

/**
 * DriverRig — Camera motion controller:
 * Controls the first-person bus driver view through the 3D world.
 * Smoothly interpolates lateral steering offset, camera roll into turns,
 * and high-speed road shock bobbing.
 */
export default function DriverRig() {
  const camera = useThree((s) => s.camera);

  useFrame((state) => {
    const { lateralOffset, steeringAngle, speed } = useDriveStore.getState();
    const t = state.clock.elapsedTime;
    const speedK = Math.min(speed / 16, 1.0);
    
    // Smooth camera shock & vibration
    const bobY = Math.sin(t * 12.0) * 0.015 * speedK;
    const bobX = Math.sin(t * 6.5) * 0.008 * speedK;
    
    // First-person driver position slightly offset to right-hand drive lane center
    camera.position.set(lateralOffset + bobX, EYE_HEIGHT + bobY, 0);
    
    // Look ahead at vanishing point down the road with slight turn anticipation
    const lookTargetX = lateralOffset * 0.6 + bobX * 2 - steeringAngle * 4.0;
    camera.lookAt(lookTargetX, 1.42, -55);
    
    // Dynamic camera lean into turn (roll)
    camera.rotateZ(-steeringAngle * 0.035);
  });

  return null;
}
