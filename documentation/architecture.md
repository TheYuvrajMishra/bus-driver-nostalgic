# Architecture — Technical Design

## 1. Stack

- **Framework**: Next.js (App Router), TypeScript — consistent with your other Three.js projects ([[dashcam-drive]]).
- **3D**: `three`, `@react-three/fiber`, `@react-three/drei` for helpers (no physics engine — see §4).
- **State**: Zustand — single small store for steering input, speed, current chunk index, audio playback state.
- **Styling**: Tailwind CSS.
- **Audio**: plain HTML `<audio>` element (or Howler.js if you need finer control) mounted once at the app root/layout — never inside a page component, so it survives route changes.

## 2. Project structure (suggested)

```
/app
  /layout.tsx          -> mounts <PersistentPlayer/> and <DriveScene/> once, at root
  /page.tsx            -> home
  /playlists/...
  /songs/...
  /about/page.tsx
/components
  /audio/PersistentPlayer.tsx
  /drive/DriveScene.tsx       -> R3F <Canvas>
  /drive/RoadChunkManager.tsx
  /drive/RoadChunk.tsx
  /drive/SteeringWheel.tsx    -> on-screen UI wheel, mirrors store value
  /drive/DriverRig.tsx        -> camera + dashboard/hood mesh, driver's-eye position
  /drive/props/*              -> instanced prop components (trees, dhabas, trucks, milestones)
/lib
  /audio-store.ts
  /drive-store.ts
  /road-generator.ts   -> seeded chunk generation logic (pure functions, no React)
  /asset-registry.ts   -> single labeled registry of models/textures (per your existing pattern)
/documentation          -> keep this doc set here; point coding agents at it, don't let them invent features
```

## 3. Procedural chunked road system (the core technical piece)

**Chunk model**
- Fixed-length road segment, e.g. 60m. Each chunk has: a start/end curvature+heading, a deterministic prop-placement list, and an index `n` along the infinite route.
- Curvature/heading per chunk index comes from a **seeded PRNG** (e.g. mulberry32) or a 1D noise function sampled at `n` — same seed always produces the same road shape, but nothing about the whole route is ever stored; only the currently-loaded chunks exist as data or geometry.

**Spawn/despawn loop**
- Track player's distance-traveled along the route.
- Maintain a small ring buffer of loaded chunks (e.g. current + 2 ahead + 1 behind = 4 chunks live at once).
- When the player crosses a trigger distance near the end of the furthest-loaded-ahead chunk, generate the next chunk (`n+1`) and append it.
- When a chunk falls far enough behind the player, dispose its geometry/instances and drop it from the buffer.
- Never keep more than the small live window in memory or in the scene graph — this is what keeps the "browser Three.js budget" flat regardless of how long someone drives.

**Prop placement**
- For each chunk, derive a deterministic prop list from the same seed (e.g. "chunk 42 gets a dhaba at local-x -3, a milestone at local-x +2, a truck instance at local-x -1") so revisiting the same seed always looks identical — useful for debugging and for LOD decisions.
- Props are placed via `InstancedMesh` batches (one instanced mesh per prop *type* — trucks, trees, milestones, dhabas — not one mesh per prop instance) to keep draw calls flat no matter how many props are on screen.

**LOD**
- Nearest 1–2 chunks: full prop density + billboard trees.
- Chunk 2–3 ahead: road surface + sparse/major props only (skip minor set-dressing) until it becomes near.

## 4. Vehicle/driving controller (no physics engine)

- Hand-rolled kinematic controller, same conclusion as [[dashcam-drive]]:
  - `speed`: constant or gently variable, no acceleration modeling needed for v1.
  - `steeringAngle`: driven by input (`←/→`/`A/D`, or on-screen wheel drag), clamped to a max value, eased in/out for arcade feel.
  - `lateralOffset`: integrates steering angle over time, clamped to road half-width so the car can't leave the road.
  - Camera position = driver-eye local offset from the car's current position/heading on the road spline; camera does not use a physics rigidbody, it's just following the same kinematic state.
- This avoids Rapier/Cannon entirely — cheaper on the iGPU and easier to tune for a cartoon-arcade feel than a real physics sim.

## 5. Steering input system

- Central `steeringAngle` value in the Zustand store, in range e.g. `[-1, 1]`.
- **Keyboard**: `←/→` or `A/D` held down ramps the value toward ±1 and eases back to 0 on release.
- **On-screen wheel (mouse/touch)**: pointer-down + drag computes an angle delta from the wheel's center, maps to the same `[-1, 1]` range.
- **Wheel visual** (`SteeringWheel.tsx`) always renders from the single store value, regardless of which input method last touched it — so keyboard and drag are visually indistinguishable to the player, both just "turn the wheel."

## 6. Camera / driver rig

- Camera is a child of the car's transform, positioned at a fixed local offset approximating a driver's eye height/position (not the car's center, not a hood-mounted dashcam position — this project wants "in place of the driver's eyes," i.e. head height, roughly where a human driver's eyes would be, slightly higher than the dashcam project's hood-cam approach).
- Dashboard rim / hood edge / mirror meshes sit in the camera's near field, static relative to camera, to sell the "inside the vehicle" feeling without needing a full visible car body.
- Phase 3: add subtle procedural bob (sine wave tied to speed) and sway (tied to steeringAngle) to the camera's local offset — keep amplitude small, this is ambient not intense.

## 7. Performance budget & techniques (potato-PC gate)

Priority order, matching research.md §3:
1. Draw calls: instancing for every repeated prop type; road/curb geometry merged where possible.
2. Billboard-impostor trees (camera-facing planes with alpha-cut texture), not real tree geometry.
3. Shared texture atlases for road/props to minimize material/shader switches.
4. LOD by chunk distance (full detail near, sparse/road-only far).
5. No real-time shadow maps — one ambient + one directional light, no shadow casting; fake ground-contact shadows as simple dark decals under trucks/dhabas if needed.
6. Frustum culling left on (default) — keep chunk bounding boxes sane so it actually helps.
7. No physics engine (see §4) — kinematic math only.
8. Target device for every perf decision: Ryzen 2200G + Vega 8 iGPU, no dedicated GPU. If it doesn't run smoothly there, it doesn't ship as default settings.

## 8. Audio persistence architecture

- `<audio>` element and its controlling React component live at the **root layout**, mounted exactly once for the whole app lifetime.
- Playlist/track state lives in a store (or React context) read by page-level UI (playlist chips, "now playing" text) — pages only read/dispatch to this state, they never own the `<audio>` element itself.
- Route changes must not unmount/remount the audio component — verify this explicitly in Next.js App Router (root layout components persist across route changes by default; keep the player out of any per-route layout).

## 9. Asset pipeline

- Low-poly models: source free cartoon/lowpoly truck/auto-rickshaw/dhaba assets or block them out in Blender; keep triangle counts low since draw calls, not triangles, are the iGPU bottleneck here.
- Textures: flat/toon-style, generated or hand-picked to match the saturated comic palette in design.md; pack into atlases per prop category.
- Single labeled asset registry file (`/lib/asset-registry.ts`) listing every model/texture with a name, path, and category — matches your existing pattern from [[dashcam-drive]] — so new props/trucks can be added without touching generation logic.

## 10. Build order for a coding agent

1. Root layout with persistent `<audio>` + basic play/pause UI (no game yet) — prove audio survives navigation.
2. `DriveScene` with a single static flat-textured road plane + camera at driver-eye height — no chunks yet, no props.
3. Kinematic controller + keyboard steering + on-screen wheel UI, still on the single static road.
4. Swap the static road for the chunk manager (spawn/despawn loop), still no props — confirm no seams/hitches while driving indefinitely.
5. Add instanced props per chunk (trees first, then dhabas/trucks/milestones), verifying frame rate stays flat as prop count grows.
6. Only after 1–5 are smooth on the target iGPU: layer in cartoon shading polish, camera bob/sway, horn/easter-egg extras from design.md Phase 3.

## 11. Traffic & Driving Dynamics Architecture (Spec Extension)

### 1. Kinematic Driving Model (`lib/drive-store.ts`, `components/drive/DriveController.tsx`)
- State: `speed` (0..30.5 m/s ≈ 0..110 km/h), `distanceTraveled`, `lateralOffset`, `throttle` (0..1), `brake` (0..1), `gear`, `rpm`.
- Acceleration: non-linear asymptotic curve `a(v) = a_max * (1 - (v / v_max)^1.5)`.
- Braking: strong linear deceleration `b = b_max * brake` down to 0 (holds at 0, no reverse).
- Engine Coasting: gentle resistive deceleration.
- Steering authority: speed-attenuated lateral rate `d_offset/dt = steer * max_rate * (1 - 0.25 * (v / v_max))`.

### 2. Spring-Damper Cabin Rig (`components/drive/DriverRig.tsx`, `lib/cabin-physics.ts`)
- Config scale: `CABIN_MOTION_SCALE` in `lib/driving-config.ts` (0 = off, default = 1.0).
- Spring 1 (Cabin Body): Pitch (accel/brake), Roll (steer * speed), Heave (road noise * speed), Engine idle vibration (8Hz harmonic).
- Spring 2 (Driver Head): Inertial lag and counter-motion.
- Secondary Physics: Hanging nimbu-mirchi charm pendulum driven by cabin acceleration vector; steering wheel smooth centering.
- Bump Impulse: Decaying trauma shake on soft collision / road irregularity.

### 3. 1D Road-Space Traffic Simulation (`lib/traffic-system.ts`, `components/drive/TrafficManager.tsx`)
- Lane coordinate system: `s` (longitudinal distance along road in meters) and `lane` (+1 right same-direction, -1 left oncoming).
- Window culling: Active window `[player_s - 150m, player_s + 400m]`. Seeded spawn/despawn by chunk hash.
- Vehicle types: Decorated Truck, Bus, Auto-Rickshaw, Taxi/Car, Scooter.
- Instanced rendering: Batch `InstancedMesh` per archetype with instance matrix and color/emissive state.
- AI State Machine: `CRUISE` -> `FOLLOW` (car-following gap) -> `OVERTAKE` (check oncoming window, blinker indicator, ease out, pass, merge back).
- Soft Collisions: 1D road box overlap test -> triggers soft bump velocity cut, lateral push, cabin shake impulse, and AI horn honk.

