# PRD — [Working Title] Desi Highway Radio + Driving Game

## 1. One-liner
An always-on Indian nostalgia music radio (like busdriverplaylist.in / busdriver.wtf) where the hero of the page isn't a static photo — it's a live, playable, cartoon-comic 3D driving scene seen through the driver's eyes, with a procedural highway that never runs out and never taxes the browser.

## 2. Target audience
- Same audience as the reference sites: people who want 90s/80s Hindi nostalgia music as ambient background (study, commute, night drive, dhaba vibe).
- Secondary: people who click in for the novelty of "driving" the site and stick around because the radio plays underneath.
- Must work on low-end/shared PCs and integrated-GPU laptops — this is a real constraint, not a nice-to-have (see §6).

## 3. Core value proposition
1. **The radio** — always-on, no sign-up, no pause-to-load. Curated Hindi playlist(s), rotates or lets user pick.
2. **The drive** — a first-person cartoon Indian highway you steer through while the radio plays. Not a separate "game mode" — it's the background/foreground visual of the same page.

## 4. Feature list (by phase)

### Phase 1 — Skeleton (must ship first)
- Persistent `<audio>` element that survives route/page changes (mirrors the reference sites' most important UX trait).
- One playlist, play/pause/next/prev, keyboard shortcuts (`Space`, `←/→` seek, `N/P` track).
- Minimal driving scene: flat cartoon-textured road, simple low-poly bus/car dashboard rim at the bottom of the screen (driver's eye view), camera fixed at driver head height.
- Steering: `←/→` or `A/D` keys turn the wheel and curve the car's path within road bounds. On-screen wheel graphic mirrors the current steering value.
- Procedural road: chunk-based generation and despawning (see architecture.md) — no hand-built map, no tension about map size.
- Runs at a stable frame rate on the dev machine (iGPU, no dedicated GPU) — this is a pass/fail gate before moving to Phase 2, not a later polish item.

### Phase 2 — Cartoon Indian world-dressing
- Roadside props via instancing: dhabas, hand-painted trucks, auto-rickshaws, milestone stones, hoardings, roadside temples — placed deterministically per chunk seed.
- Billboard-impostor trees lining the road.
- Comic/cartoon shading (flat-shaded or simple toon-ramp materials, saturated palette) rather than photoreal.
- Basic day/night visual state tied to the same IST time logic the reference sites use for playlist rotation (so the drive looks like the "Highway Raat" / "Subah Nikaas" mood the currently-playing rotation implies).

### Phase 3 — Feel & polish (only after Phase 1+2 are running well on potato hardware)
- Camera head-bob / sway tied to speed and steering.
- Horn button / sound easter egg (reference-site style playfulness).
- Multiple playlists/rotations page, songs list page — same structure as reference sites.
- Mobile: touch drag-to-steer wheel.

### Explicit non-goals (v1)
- No real physics engine / suspension / tyre simulation.
- No lap times, no scoring, no crash/game-over state — this is an ambient toy, not a racing game.
- No multiplayer.
- No hand-authored maps — everything procedural.

## 5. Success criteria
- Radio never stutters or restarts when the user navigates or interacts with the game.
- Driving scene holds a smooth, playable frame rate on the reference low-end machine (Ryzen 2200G / Vega 8 iGPU, no dedicated GPU) with default settings — this is the real acceptance test, not a synthetic benchmark.
- Road generation has no visible "seam," pop-in, or hitch as chunks spawn/despawn during continuous driving.
- Steering feels arcade-simple and immediate, not twitchy or laggy.

## 6. Constraints
- **Hardware floor**: AMD Ryzen 2200G, Vega 8 integrated graphics, no dedicated GPU, 256GB SSD + 500GB HDD, 19" 1080p-class monitor. Every visual/perf decision is made against this floor first, "looks nicer on a good GPU" second.
- **Browser-only, client-side**: everything must run inside the browser's Three.js budget — no server-side rendering of frames, no native app.
- **Solo/small build**: architecture should favor simplicity an agent (Antigravity/Claude Code) can implement without hallucinating features not in these docs — see architecture.md for the exact system boundaries.

## 7. Open questions to resolve before/at Phase 2
- Exact music catalog/licensing source (are tracks self-hosted files, or embed of Spotify/YT like busdriverplaylist.in?).
- Final visual identity/name for the project (see design.md for direction, not a final name).
- Whether time-of-day rotation logic drives both the playlist *and* the game's lighting, or just the playlist.
