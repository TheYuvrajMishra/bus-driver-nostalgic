import { DRIVING_CONFIG } from "./driving-config";
import { useDriveStore, ROAD_HALF_WIDTH } from "./drive-store";
import { playTrafficSound, type HornType } from "./traffic-sound";

export type TrafficVehicleType =
  | "truck"
  | "bus"
  | "rickshaw"
  | "car"
  | "scooter";

export type AIState =
  | "CRUISE"
  | "FOLLOW"
  | "OVERTAKE_OUT"
  | "OVERTAKE_PASS"
  | "OVERTAKE_RETURN";

export interface TrafficVehicle {
  id: number;
  type: TrafficVehicleType;
  lane: number; // +1 right lane (same direction), -1 left lane (oncoming)
  s: number; // longitudinal position along highway (m)
  lateralOffset: number; // lateral position (m), -1.4m left, +1.4m right
  targetLateral: number;
  speed: number; // current speed in m/s
  desiredSpeed: number; // target cruise speed in m/s
  state: AIState;
  stateTimer: number; // time in current state (s)
  leadVehicleId: number | null;
  overtakenVehicleId: number | null;
  length: number; // meters
  width: number; // meters
  colorVariant: number; // 0, 1, 2
  brakeLight: boolean;
  blinkerLeft: boolean;
  blinkerRight: boolean;
  honkCooldown: number; // seconds
}

export const TRAFFIC_CONFIG = {
  MAX_ACTIVE_VEHICLES: 14,
  SIM_WINDOW_AHEAD: 380, // meters ahead of player
  SIM_WINDOW_BEHIND: 130, // meters behind player
  LANE_RIGHT_X: 1.45,
  LANE_LEFT_X: -1.45,
  SAFE_OVERTAKE_DISTANCE: 70, // meters of clear oncoming road needed
  COLLISION_COOLDOWN: 1.2, // seconds between collision impulses
} as const;

class TrafficSimulationEngine {
  private vehicles: TrafficVehicle[] = [];
  private nextId = 1;
  private collisionTimer = 0;
  private ambientHonkTimer = 18.0;

  // PRNG helper
  private mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  getVehicles(): TrafficVehicle[] {
    return this.vehicles;
  }

  /**
   * Spawns an archetype with authentic Indian highway dimensions and speed characteristics
   */
  private createVehicle(
    s: number,
    lane: number,
    rand: () => number
  ): TrafficVehicle {
    const id = this.nextId++;
    const rType = rand();
    let type: TrafficVehicleType = "truck";
    let length = 7.6;
    let width = 2.4;
    let desiredSpeed = 13.5;

    if (rType < 0.32) {
      type = "truck";
      length = 7.6;
      width = 2.4;
      desiredSpeed = 11.5 + rand() * 3.5; // 40-54 km/h
    } else if (rType < 0.54) {
      type = "bus";
      length = 9.2;
      width = 2.4;
      desiredSpeed = 15.0 + rand() * 4.0; // 54-68 km/h
    } else if (rType < 0.72) {
      type = "rickshaw";
      length = 2.5;
      width = 1.35;
      desiredSpeed = 9.5 + rand() * 3.0; // 34-45 km/h
    } else if (rType < 0.9) {
      type = "car";
      length = 4.2;
      width = 1.75;
      desiredSpeed = 20.0 + rand() * 6.5; // 72-95 km/h
    } else {
      type = "scooter";
      length = 1.9;
      width = 0.8;
      desiredSpeed = 14.0 + rand() * 4.0; // 50-65 km/h
    }

    const startLateral =
      lane > 0
        ? TRAFFIC_CONFIG.LANE_RIGHT_X + (rand() * 0.2 - 0.1)
        : TRAFFIC_CONFIG.LANE_LEFT_X + (rand() * 0.2 - 0.1);

    return {
      id,
      type,
      lane,
      s,
      lateralOffset: startLateral,
      targetLateral: startLateral,
      speed: desiredSpeed,
      desiredSpeed,
      state: "CRUISE",
      stateTimer: 0,
      leadVehicleId: null,
      overtakenVehicleId: null,
      length,
      width,
      colorVariant: Math.floor(rand() * 3),
      brakeLight: false,
      blinkerLeft: false,
      blinkerRight: false,
      honkCooldown: 4.0 + rand() * 12.0,
    };
  }

  /**
   * Triggers horn for a vehicle
   */
  private honkVehicle(v: TrafficVehicle, playerS: number, playerLat: number): void {
    if (v.honkCooldown > 0) return;
    v.honkCooldown = 8.0 + Math.random() * 10.0;

    let soundType: HornType = "truck";
    if (v.type === "truck") {
      soundType = Math.random() > 0.4 ? "truck" : "musical";
    } else if (v.type === "bus") {
      soundType = "musical";
    } else if (v.type === "rickshaw") {
      soundType = "rickshaw";
    } else if (v.type === "car") {
      soundType = "car";
    } else {
      soundType = "car";
    }

    const distZ = Math.abs(v.s - playerS);
    const deltaX = v.lateralOffset - playerLat;
    playTrafficSound(soundType, deltaX, distZ, v.speed);
  }

  /**
   * Main per-frame simulation update
   */
  update(dt: number): void {
    const { speed: playerSpeed, lateralOffset: playerLat, distanceTraveled: playerS } =
      useDriveStore.getState();

    this.collisionTimer = Math.max(0, this.collisionTimer - dt);
    this.ambientHonkTimer -= dt;

    // 1. Cull vehicles outside active window
    const minS = playerS - TRAFFIC_CONFIG.SIM_WINDOW_BEHIND;
    const maxS = playerS + TRAFFIC_CONFIG.SIM_WINDOW_AHEAD;

    this.vehicles = this.vehicles.filter((v) => v.s >= minS && v.s <= maxS);

    // 2. Deterministic Spawning if under vehicle cap
    if (this.vehicles.length < TRAFFIC_CONFIG.MAX_ACTIVE_VEHICLES) {
      const chunkIdx = Math.floor(playerS / 60);
      const rand = this.mulberry32(chunkIdx * 1000 + this.vehicles.length * 17);

      // Spawn either ahead or behind
      const spawnAhead = rand() > 0.35;
      const spawnDist = spawnAhead
        ? playerS + 180 + rand() * (TRAFFIC_CONFIG.SIM_WINDOW_AHEAD - 190)
        : playerS - 40 - rand() * (TRAFFIC_CONFIG.SIM_WINDOW_BEHIND - 45);

      // 60% Same-direction (right lane), 40% Oncoming (left lane)
      const lane = rand() > 0.4 ? 1 : -1;

      // Check distance from existing vehicles
      const tooClose = this.vehicles.some(
        (v) => Math.abs(v.s - spawnDist) < 26 && v.lane === lane
      );

      if (!tooClose) {
        this.vehicles.push(this.createVehicle(spawnDist, lane, rand));
      }
    }

    // 3. Ambient Highway Honk
    if (this.ambientHonkTimer <= 0 && this.vehicles.length > 0) {
      this.ambientHonkTimer = 16.0 + Math.random() * 22.0;
      const candidates = this.vehicles.filter(
        (v) => Math.abs(v.s - playerS) < 140
      );
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        this.honkVehicle(pick, playerS, playerLat);
      }
    }

    // 4. Update each vehicle state & kinematics
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      v.stateTimer += dt;
      v.honkCooldown = Math.max(0, v.honkCooldown - dt);

      if (v.lane === -1) {
        // ONCOMING LANE VEHICLE:
        // Drives toward player with negative s velocity
        v.s -= v.speed * dt;
        v.lateralOffset = TRAFFIC_CONFIG.LANE_LEFT_X;
        v.targetLateral = TRAFFIC_CONFIG.LANE_LEFT_X;
        v.brakeLight = false;
        v.blinkerLeft = false;
        v.blinkerRight = false;

        // Honk if player or an overtaking car is in oncoming lane ahead
        if (
          v.s > playerS &&
          v.s - playerS < 45 &&
          playerLat < -0.4 &&
          v.honkCooldown <= 0
        ) {
          this.honkVehicle(v, playerS, playerLat);
        }
      } else {
        // SAME-DIRECTION VEHICLE:
        // Advances with positive s velocity
        v.s += v.speed * dt;

        // Find nearest lead vehicle ahead in same direction
        let leadDist = 999;
        let leadSpeed = v.desiredSpeed;
        let leadId: number | null = null;

        for (let j = 0; j < this.vehicles.length; j++) {
          if (i === j) continue;
          const other = this.vehicles[j];
          if (other.lane === 1 && other.s > v.s) {
            const dist = other.s - v.s - (v.length + other.length) / 2;
            if (dist < leadDist) {
              leadDist = dist;
              leadSpeed = other.speed;
              leadId = other.id;
            }
          }
        }

        // Also check if player is ahead in front of this AI
        if (playerS > v.s && Math.abs(playerLat - v.lateralOffset) < 1.4) {
          const pDist = playerS - v.s - (v.length + 6.5) / 2;
          if (pDist > 0 && pDist < leadDist) {
            leadDist = pDist;
            leadSpeed = playerSpeed;
            leadId = -999; // player
          }
        }

        // AI State Machine
        switch (v.state) {
          case "CRUISE": {
            v.brakeLight = false;
            v.blinkerLeft = false;
            v.blinkerRight = false;
            v.targetLateral = TRAFFIC_CONFIG.LANE_RIGHT_X;

            // Accelerate to desired speed
            if (v.speed < v.desiredSpeed) {
              v.speed = Math.min(v.desiredSpeed, v.speed + 3.2 * dt);
            }

            // Check if approaching slow vehicle
            if (leadDist < 24.0) {
              v.state = "FOLLOW";
              v.stateTimer = 0;
              v.leadVehicleId = leadId;
            }
            break;
          }

          case "FOLLOW": {
            v.targetLateral = TRAFFIC_CONFIG.LANE_RIGHT_X;

            // Decelerate smoothly to follow lead vehicle
            if (leadDist < 20.0) {
              const targetFollowSpeed = Math.max(0, leadSpeed * 0.96);
              v.speed = Math.max(
                targetFollowSpeed,
                v.speed - 5.5 * dt * ((22.0 - leadDist) / 8.0)
              );
              v.brakeLight = v.speed < leadSpeed;
            } else {
              v.brakeLight = false;
            }

            // If stuck behind for > 1.8s and has higher desired speed, evaluate OVERTAKE
            if (
              v.stateTimer > 1.8 &&
              v.desiredSpeed > leadSpeed + 1.8 &&
              leadDist < 25.0
            ) {
              // Check oncoming lane clearance ahead
              const oncomingDanger = this.vehicles.some(
                (other) =>
                  other.lane === -1 &&
                  other.s > v.s &&
                  other.s < v.s + TRAFFIC_CONFIG.SAFE_OVERTAKE_DISTANCE
              );
              // Also check if player is currently in oncoming lane beside/ahead
              const playerInWay =
                playerLat < -0.4 &&
                playerS > v.s - 10 &&
                playerS < v.s + 50;

              if (!oncomingDanger && !playerInWay) {
                v.state = "OVERTAKE_OUT";
                v.stateTimer = 0;
                v.overtakenVehicleId = leadId;
                v.blinkerRight = true; // signal pull out
                if (Math.abs(v.s - playerS) < 80) {
                  this.honkVehicle(v, playerS, playerLat);
                }
              }
            }
            break;
          }

          case "OVERTAKE_OUT": {
            v.blinkerRight = true;
            v.targetLateral = TRAFFIC_CONFIG.LANE_LEFT_X;
            v.speed = Math.min(v.desiredSpeed * 1.12, v.speed + 4.2 * dt);

            // Abort if oncoming vehicle appears
            const suddenOncoming = this.vehicles.some(
              (other) =>
                other.lane === -1 &&
                other.s > v.s &&
                other.s < v.s + 38.0
            );
            if (suddenOncoming) {
              v.state = "OVERTAKE_RETURN";
              v.stateTimer = 0;
              v.blinkerRight = false;
              v.blinkerLeft = true;
            } else if (Math.abs(v.lateralOffset - TRAFFIC_CONFIG.LANE_LEFT_X) < 0.25) {
              v.state = "OVERTAKE_PASS";
              v.stateTimer = 0;
              v.blinkerRight = false;
            }
            break;
          }

          case "OVERTAKE_PASS": {
            v.targetLateral = TRAFFIC_CONFIG.LANE_LEFT_X;
            v.speed = Math.min(v.desiredSpeed * 1.15, v.speed + 4.0 * dt);

            // Check if passed lead vehicle
            const lead = this.vehicles.find((x) => x.id === v.overtakenVehicleId);
            const passed = lead ? v.s - lead.s > 15.0 : v.stateTimer > 3.0;

            if (passed) {
              v.state = "OVERTAKE_RETURN";
              v.stateTimer = 0;
              v.blinkerLeft = true; // signal merge back
            }
            break;
          }

          case "OVERTAKE_RETURN": {
            v.blinkerLeft = true;
            v.targetLateral = TRAFFIC_CONFIG.LANE_RIGHT_X;

            if (Math.abs(v.lateralOffset - TRAFFIC_CONFIG.LANE_RIGHT_X) < 0.25) {
              v.state = "CRUISE";
              v.stateTimer = 0;
              v.blinkerLeft = false;
              v.overtakenVehicleId = null;
            }
            break;
          }
        }

        // Smooth lateral steering translation
        const latDelta = v.targetLateral - v.lateralOffset;
        const steerSpeed = v.state.startsWith("OVERTAKE") ? 2.4 : 1.8;
        v.lateralOffset += Math.max(
          -steerSpeed * dt,
          Math.min(steerSpeed * dt, latDelta)
        );
      }

      // 5. Soft Player Collision Detection (Box Overlap)
      const playerBoxLen = 6.5;
      const playerBoxWidth = 2.2;
      const dS = Math.abs(v.s - playerS);
      const dLat = Math.abs(v.lateralOffset - playerLat);

      if (
        this.collisionTimer <= 0 &&
        dS < (v.length + playerBoxLen) * 0.48 &&
        dLat < (v.width + playerBoxWidth) * 0.48
      ) {
        this.collisionTimer = TRAFFIC_CONFIG.COLLISION_COOLDOWN;

        // Soft Bump Outcome:
        // 1. Cut speed by 45%
        const currentSpeed = useDriveStore.getState().speed;
        useDriveStore.setState({
          speed: Math.max(0, currentSpeed * 0.55),
        });

        // 2. Lateral push away
        const pushDir = playerLat >= v.lateralOffset ? 1 : -1;
        const newLat = Math.max(
          -ROAD_HALF_WIDTH,
          Math.min(ROAD_HALF_WIDTH, playerLat + pushDir * 0.75)
        );
        useDriveStore.getState().setLateralOffset(newLat);

        // 3. Cabin trauma shake impulse
        useDriveStore.getState().triggerBump(0.85);

        // 4. Soft bump collision audio & vehicle angry horn
        playTrafficSound("bump", v.lateralOffset - playerLat, 5, playerSpeed);
        this.honkVehicle(v, playerS, playerLat);
        v.brakeLight = true;
      }
    }
  }

  /**
   * Called when player presses H (Horn). Nearby AI reacts!
   */
  onPlayerHorn(): void {
    const { speed: playerSpeed, lateralOffset: playerLat, distanceTraveled: playerS } =
      useDriveStore.getState();

    // Find vehicles within 45m ahead of player
    for (const v of this.vehicles) {
      if (v.s > playerS && v.s - playerS < 45) {
        // Vehicle eases slightly to shoulder or honks back
        if (v.lane === 1) {
          v.lateralOffset = Math.min(
            ROAD_HALF_WIDTH - 0.2,
            v.lateralOffset + 0.35
          );
        }
        if (Math.random() > 0.45 && v.honkCooldown <= 0) {
          setTimeout(() => {
            this.honkVehicle(v, playerS, playerLat);
          }, 350 + Math.random() * 400);
        }
      }
    }
  }
}

export const trafficEngine = new TrafficSimulationEngine();
