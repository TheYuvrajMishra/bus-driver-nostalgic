/**
 * Central Driving & Cabin Dynamics Tuning Constants.
 *
 * Configured for a heavy Indian Tata/Ashok Leyland highway bus with:
 * - High torque off the line, tapering towards top speed (~110 km/h)
 * - Powerful pneumatic drum brakes stopping at 0 without reverse
 * - Spring-damper cabin body inertia and driver head sway
 * - Single master scale CABIN_MOTION_SCALE (0 = off, 1 = normal)
 */

export const DRIVING_CONFIG = {
  // Speed & Acceleration
  MAX_SPEED: 30.5, // m/s (~110 km/h)
  MIN_SPEED: 0.0, // m/s (no reverse)
  ACCEL_INITIAL: 5.8, // m/s^2 initial pickup torque
  ACCEL_POWER_EXP: 1.45, // asymptotic tapering exponent
  BRAKE_DECEL: 9.6, // m/s^2 strong service brake deceleration
  COAST_DECEL: 1.35, // m/s^2 gentle engine-braking when coasting
  
  // Steering & Lateral Kinematics
  STEER_ATTACK: 4.2,
  STEER_RELEASE: 3.5,
  LATERAL_K: 0.52,
  STEER_SPEED_ATTENUATION: 0.28, // reduces steering authority slightly at high speed
  
  // Road & Shoulder
  ROAD_HALF_WIDTH: 3.2, // meters
  SHOULDER_START: 2.7, // meters (rumble / speed drag boundary)
  SHOULDER_DRAG_FACTOR: 1.8,
  
  // Cabin Motion Rig (Spring-Damper)
  CABIN_MOTION_SCALE: 1.0, // 0 = off, 1 = realistic heavy bus chassis feel
  
  // Engine RPM simulation
  RPM_IDLE: 800,
  RPM_MAX: 2800,
} as const;
