"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useDriveStore, EYE_HEIGHT } from "@/lib/drive-store";

/**
 * DriverRig — architecture.md §6.
 *
 * The camera sits at a fixed local offset approximating a driver's eye
 * height/position (not the car centre, not a hood dashcam). Dashboard rim,
 * hood edge and wing mirrors are near-field meshes parented to the same rig
 * group so they sell the "inside the vehicle" feeling without a full car body.
 *
 * The rig reads kinematic state straight from the zustand store inside
 * useFrame (no React re-renders per frame).
 */
export default function DriverRig() {
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    const { lateralOffset, steeringAngle, speed } = useDriveStore.getState();
    const t = state.clock.elapsedTime;
    // Subtle procedural bob/sway — architecture.md §6, design.md §4.
    // Ambient, not intense: it must never fight the listening experience.
    const speedK = speed / 14;
    const bobY = Math.sin(t * 7.0) * 0.018 * speedK;
    const bobX = Math.sin(t * 4.3) * 0.012 * speedK;
    group.current?.position.set(lateralOffset, 0, 0);
    camera.position.set(lateralOffset + bobX, EYE_HEIGHT + bobY, 0);
    camera.lookAt(lateralOffset + bobX * 2, 1.05, -40);
    camera.rotateZ(-steeringAngle * 0.025); // gentle lean into the turn
  });

  return (
    <group ref={group}>
      {/* dashboard rim */}
      <mesh position={[0, 0.72, -0.85]}>
        <boxGeometry args={[2.3, 0.42, 0.55]} />
        <meshLambertMaterial color="#232023" />
      </mesh>
      {/* dashboard top pad */}
      <mesh position={[0, 0.97, -0.95]}>
        <boxGeometry args={[2.1, 0.1, 0.5]} />
        <meshLambertMaterial color="#2e2a2e" />
      </mesh>
      {/* hood edge */}
      <mesh position={[0, 1.02, -2.4]}>
        <boxGeometry args={[1.9, 0.08, 1.6]} />
        <meshLambertMaterial color="#4a4a52" />
      </mesh>
      {/* wing mirrors */}
      <mesh position={[-1.15, 1.32, -0.55]}>
        <boxGeometry args={[0.16, 0.12, 0.06]} />
        <meshLambertMaterial color="#1c1a1c" />
      </mesh>
      <mesh position={[1.15, 1.32, -0.55]}>
        <boxGeometry args={[0.16, 0.12, 0.06]} />
        <meshLambertMaterial color="#1c1a1c" />
      </mesh>
      <mesh position={[-1.08, 1.18, -0.55]}>
        <boxGeometry args={[0.04, 0.18, 0.04]} />
        <meshLambertMaterial color="#1c1a1c" />
      </mesh>
      <mesh position={[1.08, 1.18, -0.55]}>
        <boxGeometry args={[0.04, 0.18, 0.04]} />
        <meshLambertMaterial color="#1c1a1c" />
      </mesh>
      {/* rear-view mirror — sits near the top edge of the windshield:
          dark frame + blue glass so it reads as a mirror, not a black bar */}
      <mesh position={[0, 1.82, -0.735]}>
        <boxGeometry args={[0.4, 0.15, 0.03]} />
        <meshLambertMaterial color="#2e2e34" />
      </mesh>
      <mesh position={[0, 1.82, -0.726]} rotation={[-0.06, 0, 0]}>
        <boxGeometry args={[0.36, 0.11, 0.02]} />
        <meshLambertMaterial
          color="#222b3a"
          emissive="#2a3d5c"
          emissiveIntensity={0.55}
        />
      </mesh>
    </group>
  );
}
