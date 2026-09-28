import { DRIVING_CONFIG } from "./driving-config";

/**
 * Spring-Damper Cabin & Driver Head Motion Model (architecture.md §11).
 *
 * Simulates the heavy mechanical feel of a classic Indian bus chassis:
 * 1. Cabin Body:
 *    - Longitudinal pitch (nose-down on braking, nose-up on acceleration)
 *    - Roll toward outside of turn (steer * speed)
 *    - Vertical road bounce from procedural roughness + bump shocks
 *    - Continuous engine idle vibration (8-14Hz harmonic)
 * 2. Driver Head / Camera:
 *    - Second-order lag and counter-motion (inertia)
 * 3. Secondary Physics:
 *    - Nimbu-Mirchi hanging pendulum spring
 */

export interface CabinMotionState {
  // Cabin Body offsets
  cabinPitch: number; // degrees
  cabinRoll: number; // degrees
  cabinHeave: number; // pixels / cm
  cabinSway: number; // pixels / cm

  // Driver Head / Camera offsets
  headPitch: number; // radians
  headRoll: number; // radians
  headYaw: number; // radians
  headX: number; // meters
  headY: number; // meters
  headZ: number; // meters

  // Hanging ornament pendulum angle
  talismanAngle: number; // degrees
}

class CabinPhysicsEngine {
  // Spring 1: Cabin Body
  private cabinPitchVal = 0;
  private cabinPitchVel = 0;
  private cabinRollVal = 0;
  private cabinRollVel = 0;
  private cabinHeaveVal = 0;
  private cabinHeaveVel = 0;

  // Spring 2: Driver Head Inertia
  private headPitchVal = 0;
  private headPitchVel = 0;
  private headRollVal = 0;
  private headRollVel = 0;
  private headSwayVal = 0;
  private headSwayVel = 0;

  // Pendulum: Talisman
  private talismanAngleVal = 0;
  private talismanAngleVel = 0;

  // Speed memory for calculating longitudinal acceleration
  private prevSpeed = 16.0;

  update(
    dt: number,
    time: number,
    speed: number,
    steeringAngle: number,
    throttle: number,
    brake: number,
    shakeImpulse: number
  ): CabinMotionState {
    const scale = DRIVING_CONFIG.CABIN_MOTION_SCALE;
    if (scale <= 0) {
      return {
        cabinPitch: 0,
        cabinRoll: 0,
        cabinHeave: 0,
        cabinSway: 0,
        headPitch: 0,
        headRoll: 0,
        headYaw: 0,
        headX: 0,
        headY: 0,
        headZ: 0,
        talismanAngle: 0,
      };
    }

    // 1. Calculate Longitudinal & Lateral Acceleration
    const rawLongAccel = (speed - this.prevSpeed) / Math.max(0.001, dt);
    this.prevSpeed = speed;
    const speedRatio = Math.min(1.0, speed / DRIVING_CONFIG.MAX_SPEED);
    const lateralG = steeringAngle * Math.pow(speedRatio, 1.2) * 2.8;

    // 2. Procedural Road Roughness & Engine Vibration
    const engineRumbleY = Math.sin(time * 28.0) * (0.35 + 0.55 * speedRatio);
    const roadBumpY =
      (Math.sin(time * 9.3) * 0.7 + Math.sin(time * 19.7) * 0.4) * speedRatio;
    const bumpShock = shakeImpulse * (Math.sin(time * 45.0) * 12.0);

    // 3. Cabin Body Spring-Damper Simulation
    // Pitch: nose-down on brake (negative accel), nose-up on throttle (positive accel)
    const targetCabinPitch =
      -rawLongAccel * 0.45 + (brake > 0 ? -brake * 1.8 : throttle * 0.65);
    const kPitch = 24.0;
    const dPitch = 7.5;
    this.cabinPitchVel +=
      ((targetCabinPitch - this.cabinPitchVal) * kPitch -
        this.cabinPitchVel * dPitch) *
      dt;
    this.cabinPitchVal += this.cabinPitchVel * dt;

    // Roll: body leans to the outside of turn (opposite to turn direction)
    const targetCabinRoll = -lateralG * 2.4;
    const kRoll = 20.0;
    const dRoll = 6.8;
    this.cabinRollVel +=
      ((targetCabinRoll - this.cabinRollVal) * kRoll -
        this.cabinRollVel * dRoll) *
      dt;
    this.cabinRollVal += this.cabinRollVel * dt;

    // Heave: vertical bounce
    const targetCabinHeave = roadBumpY * 3.0 + engineRumbleY + bumpShock;
    const kHeave = 32.0;
    const dHeave = 8.5;
    this.cabinHeaveVel +=
      ((targetCabinHeave - this.cabinHeaveVal) * kHeave -
        this.cabinHeaveVel * dHeave) *
      dt;
    this.cabinHeaveVal += this.cabinHeaveVel * dt;

    // 4. Driver Head / Camera Lag & Inertia
    // Head pitches forward when vehicle decelerates (lurch)
    const targetHeadPitch =
      rawLongAccel * 0.012 + (brake > 0 ? -brake * 0.035 : 0.015 * throttle);
    const kHeadP = 16.0;
    const dHeadP = 6.0;
    this.headPitchVel +=
      ((targetHeadPitch - this.headPitchVal) * kHeadP -
        this.headPitchVel * dHeadP) *
      dt;
    this.headPitchVal += this.headPitchVel * dt;

    // Head sways laterally with lag
    const targetHeadSway = lateralG * 0.04;
    const kHeadS = 14.0;
    const dHeadS = 5.2;
    this.headSwayVel +=
      ((targetHeadSway - this.headSwayVal) * kHeadS -
        this.headSwayVel * dHeadS) *
      dt;
    this.headSwayVal += this.headSwayVel * dt;

    // 5. Talisman Pendulum Physics
    const targetTalismanAngle =
      steeringAngle * 42.0 * (0.4 + 0.6 * speedRatio) +
      Math.sin(time * 12.0) * 3.0 * speedRatio +
      shakeImpulse * Math.sin(time * 30.0) * 25.0;
    const kTal = 18.0;
    const dTal = 3.6;
    this.talismanAngleVel +=
      ((targetTalismanAngle - this.talismanAngleVal) * kTal -
        this.talismanAngleVel * dTal) *
      dt;
    this.talismanAngleVal += this.talismanAngleVel * dt;

    return {
      cabinPitch: this.cabinPitchVal * scale,
      cabinRoll: this.cabinRollVal * scale,
      cabinHeave: this.cabinHeaveVal * scale,
      cabinSway: (this.cabinRollVal * 2.2 + Math.sin(time * 5.0) * 0.5 * speedRatio) * scale,

      headPitch: this.headPitchVal * scale,
      headRoll: (-this.headSwayVal * 0.6 - steeringAngle * 0.03) * scale,
      headYaw: (-steeringAngle * 0.04) * scale,
      headX: (this.headSwayVal * 0.5 + Math.sin(time * 7.0) * 0.006 * speedRatio) * scale,
      headY: (this.cabinHeaveVal * 0.003 + Math.sin(time * 14.0) * 0.012 * speedRatio) * scale,
      headZ: (-this.headPitchVal * 0.4) * scale,

      talismanAngle: this.talismanAngleVal * scale,
    };
  }
}

export const cabinPhysics = new CabinPhysicsEngine();
