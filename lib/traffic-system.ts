import { useDriveStore, ROAD_HALF_WIDTH } from "./drive-store";
import { playOvertakeHorn, playTrafficSound } from "./traffic-sound";

export type TrafficVehicleType = "car" | "bus" | "truck";

export interface TrafficVehicle {
  id: number;
  type: TrafficVehicleType;
  /** +1 same direction as player, -1 oncoming */
  lane: 1 | -1;
  /** longitudinal position along highway (m) */
  s: number;
  /** current lateral position (m) */
  lateralOffset: number;
  /** lane center x */
  laneX: number;
  /** per-driver lateral personality within lane (m) */
  personalOffset: number;
  /** current speed m/s, always >= 0 */
  speed: number;
  /** last computed acceleration m/s^2 (drives brake lights) */
  accel: number;
  /** IDM desired speed m/s */
  v0: number;
  length: number;
  width: number;
  wheelRadius: number;
  /** 0..2 livery tint variant */
  colorVariant: number;
  brakeLight: boolean;
  /** seconds until this vehicle may honk again */
  honkCooldown: number;
  /** overtake-detection latch: was the player behind this vehicle? */
  wasPlayerBehind: boolean;
  /** accumulated wheel rotation angle (radians) */
  wheelSpin: number;
}

/** Intelligent Driver Model parameters per vehicle type */
interface IdmParams {
  /** max acceleration m/s^2 */
  a: number;
  /** comfortable deceleration m/s^2 */
  b: number;
  /** minimum stopped gap m */
  s0: number;
  /** desired time headway s */
  T: number;
}

const IDM: Record<TrafficVehicleType, IdmParams> = {
  car: { a: 2.4, b: 2.8, s0: 3.0, T: 1.0 },
  bus: { a: 1.7, b: 2.4, s0: 4.0, T: 1.3 },
  truck: { a: 1.3, b: 2.1, s0: 5.0, T: 1.6 },
};

const TYPE_SPECS: Record<
  TrafficVehicleType,
  { length: number; width: number; wheelRadius: number; v0: number }
> = {
  car: { length: 4.2, width: 1.8, wheelRadius: 0.32, v0: 22.0 }, // ~79 km/h
  bus: { length: 9.5, width: 2.5, wheelRadius: 0.48, v0: 16.5 }, // ~59 km/h
  truck: { length: 8.0, width: 2.5, wheelRadius: 0.48, v0: 13.0 }, // ~47 km/h
};

export const TRAFFIC_CONFIG = {
  MAX_ACTIVE_VEHICLES: 12,
  SPAWN_AHEAD_MIN: 150,
  SPAWN_AHEAD_MAX: 380,
  DESPAWN_BEHIND: 130,
  DESPAWN_AHEAD: 450,
  SPAWN_CLEARANCE: 30, // min gap to existing vehicle in same lane at spawn
  LANE_SAME_X: 1.45,
  LANE_ONCOMING_X: -1.45,
  COLLISION_COOLDOWN: 1.2,
  OVERTAKE_LATERAL_RANGE: 3.4,
  HONK_COOLDOWN: 25,
  FIXED_DT: 1 / 120,
} as const;

class TrafficSimulationEngine {
  private vehicles: TrafficVehicle[] = [];
  private nextId = 1;
  private collisionTimer = 0;
  private spawnTimer = 0;
  private accumulator = 0;

  getVehicles(): TrafficVehicle[] {
    return this.vehicles;
  }

  private pickType(rand: number): TrafficVehicleType {
    if (rand < 0.4) return "car";
    if (rand < 0.7) return "bus";
    return "truck";
  }

  private createVehicle(
    s: number,
    lane: 1 | -1,
    playerS: number
  ): TrafficVehicle {
    const type = this.pickType(Math.random());
    const spec = TYPE_SPECS[type];
    const laneX =
      lane === 1 ? TRAFFIC_CONFIG.LANE_SAME_X : TRAFFIC_CONFIG.LANE_ONCOMING_X;
    const personalOffset =
      lane === 1 ? (Math.random() * 2 - 1) * 0.28 : 0;
    const v0 = spec.v0 * (0.92 + Math.random() * 0.16);

    return {
      id: this.nextId++,
      type,
      lane,
      s,
      lateralOffset: laneX + personalOffset,
      laneX,
      personalOffset,
      speed: v0 * (0.85 + Math.random() * 0.15),
      accel: 0,
      v0,
      length: spec.length,
      width: spec.width,
      wheelRadius: spec.wheelRadius,
      colorVariant: Math.floor(Math.random() * 3),
      brakeLight: false,
      honkCooldown: 0,
      wasPlayerBehind: playerS < s - spec.length / 2,
      wheelSpin: Math.random() * Math.PI * 2,
    };
  }

  /**
   * IDM acceleration. gap = bumper-to-bumper distance (m),
   * dv = own speed - leader speed (m/s, positive = closing in).
   * gap = Infinity when road ahead is clear.
   */
  private idmAccel(
    v: number,
    v0: number,
    gap: number,
    dv: number,
    p: IdmParams
  ): number {
    const sStar =
      p.s0 + Math.max(0, v * p.T + (v * dv) / (2 * Math.sqrt(p.a * p.b)));
    const freeTerm = Math.pow(v / Math.max(v0, 0.5), 4);
    const interactTerm = Math.pow(sStar / Math.max(gap, 0.4), 2);
    const acc = p.a * (1 - freeTerm - interactTerm);
    return Math.max(-7.5, Math.min(p.a, acc));
  }

  /** Public frame update: fixed-timestep substeps for frame-rate independence. */
  update(dt: number): void {
    this.accumulator += Math.min(dt, 0.1);
    const h = TRAFFIC_CONFIG.FIXED_DT;
    let n = 0;
    while (this.accumulator >= h && n < 24) {
      this.step(h);
      this.accumulator -= h;
      n++;
    }
  }

  private step(h: number): void {
    const {
      speed: playerSpeed,
      lateralOffset: playerLat,
      distanceTraveled: playerS,
    } = useDriveStore.getState();

    this.collisionTimer = Math.max(0, this.collisionTimer - h);
    this.spawnTimer = Math.max(0, this.spawnTimer - h);

    // 1. Cull outside active window
    const minS = playerS - TRAFFIC_CONFIG.DESPAWN_BEHIND;
    const maxS = playerS + TRAFFIC_CONFIG.DESPAWN_AHEAD;
    this.vehicles = this.vehicles.filter((v) => v.s >= minS && v.s <= maxS);

    // 2. Spawn (rate-limited, one at a time, far ahead, random)
    if (
      this.spawnTimer <= 0 &&
      this.vehicles.length < TRAFFIC_CONFIG.MAX_ACTIVE_VEHICLES
    ) {
      this.spawnTimer = 0.6;
      const lane: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const s =
        playerS +
        TRAFFIC_CONFIG.SPAWN_AHEAD_MIN +
        Math.random() *
          (TRAFFIC_CONFIG.SPAWN_AHEAD_MAX - TRAFFIC_CONFIG.SPAWN_AHEAD_MIN);
      const clear = !this.vehicles.some(
        (u) => u.lane === lane && Math.abs(u.s - s) < TRAFFIC_CONFIG.SPAWN_CLEARANCE
      );
      if (clear) this.vehicles.push(this.createVehicle(s, lane, playerS));
    }

    // 3. Per-vehicle kinematics
    for (const v of this.vehicles) {
      const p = IDM[v.type];
      v.honkCooldown = Math.max(0, v.honkCooldown - h);

      // --- find leader (nearest obstacle ahead in this lane) ---
      let gap = Infinity;
      let dv = 0; // own speed - leader speed

      for (const u of this.vehicles) {
        if (u === v || u.lane !== v.lane) continue;
        const ahead = v.lane === 1 ? u.s > v.s : u.s < v.s;
        if (!ahead) continue;
        const g = Math.abs(u.s - v.s) - (v.length + u.length) / 2;
        if (g < gap) {
          gap = g;
          dv = v.speed - u.speed;
        }
      }

      // --- player as leader ---
      const latOverlap =
        Math.abs(playerLat - v.lateralOffset) < (v.width + 2.2) / 2 + 0.25;
      if (v.lane === 1) {
        // player ahead of a same-direction vehicle
        if (latOverlap && playerS > v.s) {
          const g = playerS - v.s - (v.length + 6.5) / 2;
          if (g < gap) {
            gap = g;
            dv = v.speed - playerSpeed;
          }
        }
      } else {
        // player blocking an oncoming vehicle's lane
        if (latOverlap && playerS < v.s && v.s - playerS < 90) {
          const g = v.s - playerS - (v.length + 6.5) / 2;
          if (g < gap) {
            gap = g;
            dv = v.speed; // treat player as stopped obstacle head-on
          }
        }
      }

      // --- IDM accel + integrate ---
      v.accel = this.idmAccel(v.speed, v.v0, gap, dv, p);
      v.speed = Math.max(0, v.speed + v.accel * h);
      v.s += (v.lane === 1 ? 1 : -1) * v.speed * h;

      // --- smooth lateral tracking (no snapping, no lane changes) ---
      const targetLat = v.laneX + v.personalOffset;
      v.lateralOffset +=
        (targetLat - v.lateralOffset) * (1 - Math.exp(-3.0 * h));

      // --- brake lights with hysteresis (no flicker) ---
      if (!v.brakeLight && v.accel < -1.4) v.brakeLight = true;
      else if (v.brakeLight && v.accel > -0.6) v.brakeLight = false;

      // --- wheel spin (local axle frame: forward roll is always +) ---
      v.wheelSpin += (Math.abs(v.speed) / v.wheelRadius) * h;

      // --- overtake detection: player crosses from behind to ahead ---
      if (v.lane === 1) {
        const behindNow = playerS < v.s - v.length / 2 - 1;
        const aheadNow = playerS > v.s + v.length / 2 + 1;
        if (v.wasPlayerBehind && aheadNow) {
          // OVERTAKE! Horn only now.
          if (
            v.honkCooldown <= 0 &&
            Math.abs(playerLat - v.lateralOffset) <
              TRAFFIC_CONFIG.OVERTAKE_LATERAL_RANGE
          ) {
            playOvertakeHorn(
              v.type,
              v.lateralOffset - playerLat,
              Math.abs(v.s - playerS),
              playerSpeed - v.speed
            );
            v.honkCooldown = TRAFFIC_CONFIG.HONK_COOLDOWN;
          }
          v.wasPlayerBehind = false;
        } else if (behindNow) {
          v.wasPlayerBehind = true;
        } else if (aheadNow) {
          v.wasPlayerBehind = false;
        }
      }

      // --- soft player collision (box overlap) ---
      const dS = Math.abs(v.s - playerS);
      const dLat = Math.abs(v.lateralOffset - playerLat);
      if (
        this.collisionTimer <= 0 &&
        dS < (v.length + 6.5) * 0.42 &&
        dLat < (v.width + 2.2) * 0.42
      ) {
        this.collisionTimer = TRAFFIC_CONFIG.COLLISION_COOLDOWN;
        const st = useDriveStore.getState();
        useDriveStore.setState({ speed: Math.max(0, st.speed * 0.55) });
        const pushDir = playerLat >= v.lateralOffset ? 1 : -1;
        st.setLateralOffset(
          Math.max(
            -ROAD_HALF_WIDTH,
            Math.min(ROAD_HALF_WIDTH, playerLat + pushDir * 0.75)
          )
        );
        st.triggerBump(0.85);
        playTrafficSound("bump", v.lateralOffset - playerLat, 5, playerSpeed);
        v.brakeLight = true;
      }
    }
  }
}

export const trafficEngine = new TrafficSimulationEngine();
