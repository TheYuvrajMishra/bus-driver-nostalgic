"use client";

import { useFrame } from "@react-three/fiber";
import { useDriveStore, ROAD_HALF_WIDTH } from "@/lib/drive-store";
import { steeringInput } from "@/lib/steering-input";
import { DRIVING_CONFIG } from "@/lib/driving-config";

/**
 * Kinematic Driving Controller (no physics engine) — architecture.md §4 & §11.
 *
 * Simulates heavy Indian bus dynamics:
 *  - Fast initial torque curve tapering near top speed (~110 km/h)
 *  - Strong pneumatic service braking down to 0 (holds at 0, no reverse)
 *  - Coasting with gentle engine compression braking
 *  - Speed-attenuated steering authority and shoulder rumble/drag
 *  - Real distance-traveled integration for seamless chunk streaming
 */
export default function DriveController() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // clamp tab-switch spikes
    const s = useDriveStore.getState();

    // 1. Resolve Throttle & Brake Inputs (Keyboard + Touch Hooks)
    const throttle = steeringInput.throttle;
    const brake = steeringInput.brake;

    // 2. Compute Longitudinal Acceleration
    let speed = s.speed;
    const maxSpeed = DRIVING_CONFIG.MAX_SPEED;

    if (brake > 0) {
      // Strong service braking
      speed -= DRIVING_CONFIG.BRAKE_DECEL * brake * dt;
      if (speed < 0) speed = 0;
    } else if (throttle > 0) {
      // Progressive non-linear acceleration curve
      const speedRatio = Math.min(1.0, speed / maxSpeed);
      const torqueCurve = Math.max(
        0.15, // guaranteed responsive off-the-line pickup even at full stop (speed = 0)
        1.0 - Math.pow(speedRatio, DRIVING_CONFIG.ACCEL_POWER_EXP)
      );
      const accel = DRIVING_CONFIG.ACCEL_INITIAL * throttle * torqueCurve;
      speed += accel * dt;
      if (speed > maxSpeed) speed = maxSpeed;
    } else {
      // Gentle engine coasting braking
      if (speed > 0) {
        speed -= DRIVING_CONFIG.COAST_DECEL * dt;
        if (speed < 0) speed = 0;
      }
    }

    // 3. Shoulder Drag & Micro-Rumble
    const absLat = Math.abs(s.lateralOffset);
    if (absLat > DRIVING_CONFIG.SHOULDER_START && speed > 2.0) {
      const shoulderDepth =
        (absLat - DRIVING_CONFIG.SHOULDER_START) /
        (ROAD_HALF_WIDTH - DRIVING_CONFIG.SHOULDER_START);
      speed = Math.max(
        0,
        speed - shoulderDepth * DRIVING_CONFIG.SHOULDER_DRAG_FACTOR * dt
      );
    }

    // 4. Resolve Steering Target & Easing
    let targetSteer = 0;
    if (steeringInput.wheel !== null) {
      targetSteer = steeringInput.wheel;
    } else {
      if (steeringInput.left) targetSteer -= 1;
      if (steeringInput.right) targetSteer += 1;
    }

    const steerRate =
      targetSteer !== 0
        ? DRIVING_CONFIG.STEER_ATTACK
        : DRIVING_CONFIG.STEER_RELEASE;
    const nextSteer =
      s.steeringAngle +
      Math.max(
        -steerRate * dt,
        Math.min(steerRate * dt, targetSteer - s.steeringAngle)
      );

    // 5. Speed-Attenuated Lateral Displacement
    const speedRatio = Math.min(1.0, speed / maxSpeed);
    const steerAuthority =
      1.0 - DRIVING_CONFIG.STEER_SPEED_ATTENUATION * speedRatio;
    const lateralDelta =
      nextSteer * speed * DRIVING_CONFIG.LATERAL_K * steerAuthority * dt;

    const lateral = Math.max(
      -ROAD_HALF_WIDTH,
      Math.min(ROAD_HALF_WIDTH, s.lateralOffset + lateralDelta)
    );

    // 6. Realistic Engine Gear & RPM Mapping
    const speedKmh = speed * 3.6;
    let gear = 1;
    let gearRatio = 0.2;
    if (speedKmh > 80) {
      gear = 5;
      gearRatio = 0.95;
    } else if (speedKmh > 55) {
      gear = 4;
      gearRatio = 0.72;
    } else if (speedKmh > 35) {
      gear = 3;
      gearRatio = 0.5;
    } else if (speedKmh > 18) {
      gear = 2;
      gearRatio = 0.32;
    } else {
      gear = 1;
      gearRatio = 0.15;
    }

    const baseRpm =
      DRIVING_CONFIG.RPM_IDLE +
      (speed / (maxSpeed * gearRatio)) *
        (DRIVING_CONFIG.RPM_MAX - DRIVING_CONFIG.RPM_IDLE);
    const rpm = Math.min(
      DRIVING_CONFIG.RPM_MAX,
      Math.max(DRIVING_CONFIG.RPM_IDLE, Math.round(baseRpm))
    );

    // 7. Decay Trauma Shake Impulse
    const nextShake =
      s.shakeImpulse > 0.001 ? s.shakeImpulse * Math.exp(-dt * 5.0) : 0;

    // 8. Commit Single Optimized Store Write per frame
    useDriveStore.setState({
      speed,
      speedKmh,
      throttle,
      brake,
      gear,
      rpm,
      steeringAngle: nextSteer,
      lateralOffset: lateral,
      distanceTraveled: s.distanceTraveled + speed * dt,
      shakeImpulse: nextShake,
    });
  });

  return null;
}
