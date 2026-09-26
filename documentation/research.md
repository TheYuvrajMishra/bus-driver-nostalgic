# Research — Desi Highway Radio + Driving Game

## 1. Competitive analysis (reference sites)

### busdriverplaylist.in
- Always-on 90s Hindi film radio. Kumar Sanu / Alka Yagnik / Udit Narayan / Nadeem–Shravan era.
- **Four IST time-based rotations** auto-switch without user input: Highway Raat (22:00–05:00), Subah Nikaas (05:00–09:00), Dhaba Classics (09:00–18:00), Sunset Chill (18:00–22:00).
- 62 curated tracks, one shared player persists across routes (home / playlists / songs / about) — music never restarts on navigation.
- Dark warm theme (`#1a0f0c`), bilingual Hindi/English copy, bazaar-street hero photo, bus-interior photo on player.
- Free, no sign-up. Minimal nav: Spotify / YT Music / Playlists / Songs.

### busdriver.wtf
- Same genre, broader: 90s, Nostalgic, Bhojpuri, Punjabi, Haryanvi, Workout tabs. 226 tracks, multi-language site (EN/BN/MR).
- Branding is a specific driver persona ("Rajat — I drive this bus, I pick every song") — personifies the curator.
- Full keyboard-shortcut layer: `Space` play/pause, `←/→` seek, `N/P` track, `Q` queue, `T` ticket, `H` horn.
- "Ticket" / "horn" mechanics — playful transport-themed micro-interactions layered onto a music player (share-a-ticket prompt, horn sound button).
- NH 48 Delhi–Mumbai framing, "Horn OK Please" tagline, dark theme (`#150803`), road photo hero.

### deluxsalon.in
- Same family of site (per your reference), not fetchable directly (robots-disallowed) — treat as directionally same pattern: nostalgia-themed, dark warm palette, persistent audio, minimal chrome.

### Pattern extraction (what to copy)
1. **One persistent audio element** shared across every route — this is the single most important UX detail in all three. Never re-mount the `<audio>` on navigation.
2. **Time-of-day driven state** (rotations) — cheap way to make a static playlist feel alive.
3. **Transport personification** — a driver, a ticket, a horn — turns a plain player into a "ride."
4. **Minimal UI, maximal atmosphere** — one hero image/scene + big title + a handful of playlist chips. No dashboards, no clutter.
5. **Keyboard-first controls** on desktop, thumb-reachable controls on mobile.
6. **Dark, warm, slightly worn color palette** (browns/ambers, not neon) — matches dhaba/highway-at-night mood.

### The gap these sites leave open (your opportunity)
None of the three render an actual driving scene — the "road"/"bus" imagery is static photography. Replacing that static hero image with a **live, playable, first-person driving scene** (driver's-eye camera, steering wheel, procedural road) while the same persistent radio plays underneath is the differentiator. The game becomes the hero visual, not a photo.

## 2. Game-reference research

- **Cockpit/eye-level camera racers** (OutRun-style, desktop driving toys, "drive to relax" web games): camera fixed at head height behind the wheel, slight bob/sway tied to speed and steering angle — never full third-person, never floaty.
- **Endless/infinite road generators**: the standard pattern is a **ring buffer of road "chunks"** (fixed-length segments, e.g. 50–100m each). As the car crosses a trigger distance, spawn the next chunk ahead and destroy/recycle the one furthest behind. Curvature/elevation per chunk comes from a seeded pseudo-random sequence (e.g. mulberry32 / simplex noise sampled by chunk index) so the road is infinite but deterministic and lightweight — nothing is stored for the whole route, only the currently-loaded chunks.
- **Cartoonish Indian highway iconography** to draw from for props/environment: trucks with hand-painted "Horn OK Please" / "Buri Nazar Wale Tera Muh Kaala" tail-art, auto-rickshaws, dhabas with charpai and tea kettles, roadside temples/shrines, hoardings for Bollywood/paan masala, cows and stray dogs as roadside set-dressing (not necessarily obstacles unless you want a mini-game layer later), overloaded trucks, tea stalls, petrol pumps, milestone (kilometre) stones.
- **Steering input schemes seen across web driving games**: `←/→` or `A/D` for keyboard, click-drag on an on-screen wheel graphic for mouse/touch, and optionally device-tilt for mobile. The wheel graphic itself rotates to mirror whatever input is active, even on keyboard, so the UI always shows the "truth" of the current steering value.

## 3. Technical research — Three.js on integrated GPUs (your build target)

Your dev machine (Ryzen 2200G, Vega 8 iGPU, no dedicated GPU) is the realistic performance floor. Techniques that matter most, in priority order:

1. **Draw-call count is the #1 bottleneck on iGPUs**, not triangle count. Merge/instance everything repeated (trees, poles, trucks, milestones) via `InstancedMesh`.
2. **Billboard/impostor trees**: a flat plane with an alpha-cut tree texture, always facing camera (or camera-Y-locked), instead of real tree geometry. Near-zero triangle cost, reads as 3D from a moving driver's-eye viewpoint because you never see it edge-on.
3. **Texture atlasing**: pack road, curb, prop textures into shared atlases to cut material/shader switches.
4. **LOD by chunk distance**: only the 2–3 nearest chunks get full prop density; chunks further ahead render road surface only until they're close.
5. **No real-time shadow maps** — bake or fake shadows (a soft dark decal under trucks/props) instead of `THREE.DirectionalLight` shadow casting, which is expensive on iGPUs.
6. **Simple lighting**: one ambient + one directional light, no per-object dynamic lights.
7. **Frustum culling** is free with Three.js by default as long as you don't disable it and keep chunk-sized bounding boxes sane.
8. **Physics**: skip a full physics engine (Rapier/Cannon) for the driving feel itself — a hand-rolled kinematic controller (speed, steering angle, lateral offset clamped to road width) is both cheaper and easier to tune for an arcade-cartoon feel than a full rigid-body sim. (Same conclusion your [[dashcam-drive]] PRD already reached.)

## 4. Synthesis / recommendation

Build this as **one persistent-audio site** (pattern from the 3 reference sites) with the **static hero photo replaced by a live driver's-eye 3D scene** (pattern from endless-driver games + your potato-PC-safe chunked-road approach). Music keeps playing identically whether the user is looking at the game canvas or browsing playlists/songs pages — the game is a bonus visual layer on the same page, not a separate app.
