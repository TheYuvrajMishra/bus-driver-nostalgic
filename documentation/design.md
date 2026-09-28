# Design — Visual & UX Direction

## 1. Visual identity

**Mood:** warm, worn, nostalgic highway-at-night — same emotional register as the reference sites — but the hero visual is a living cartoon scene instead of a photo.

**Color palette**
- Base UI chrome: dark warm browns/near-black, matching the reference sites' theme colors (`#1a0f0c`, `#150803` range) — this is the "frame" around the game canvas and the player.
- In-scene (the 3D world): saturated, comic-book-flat cartoon colors — mustard-yellow trucks, red/green hand-painted tail art, teal/turquoise dhaba signage, warm sodium-lamp amber for night lighting. Contrast the muted UI chrome against the vivid in-world palette so the drive pops as the visual centerpiece.
- Accent: sodium-lamp amber / marigold-orange for interactive highlights (play button, active playlist chip, steering wheel highlight).

**Typography**
- Bilingual like all three references: a Devanagari display face for headline/branding moments ("बस", "सवारी"-style flourishes), paired with a clean, slightly condensed Latin sans for body/UI (nav, track titles, timestamps).
- Keep body text minimal — these sites succeed by having almost no text; most "content" is the music itself and, in your version, the drive.

## 2. Game world art direction

**Overall style:** flat-shaded / toon-ramp cartoon, not photoreal — think comic-strip Indian highway, not a driving-sim screenshot. This also happens to be the cheapest style to render well on an iGPU (few textures, high color saturation, simple lighting hides the lack of real shadows).

**Road & environment set-dressing (draw from, per chunk):**
- Two-lane highway, painted lane dividers, worn asphalt texture with visible patch/repair marks for character.
- Roadside: dhabas with charpai and a tea kettle silhouette, hand-painted trucks with "Horn OK Please" / tail-art, auto-rickshaws parked or puttering along the shoulder, roadside shrine/temple, milestone (kilometre) stones, petrol pump signage, Bollywood/paan-masala hoardings, the odd cow or stray dog as a static roadside prop.
- Trees as camera-facing billboard cutouts (banyan/palm silhouettes) — cheap, and from a forward-driving POV they read as real trees.
- Sky: simple gradient (day) or star-flecked amber gradient (night) rather than a full skybox — cheap and sets mood fast.

**Vehicle / cockpit:**
- Driver's-eye camera means the "vehicle" the player sees is mostly the **dashboard rim, hood edge, and wing mirrors** at the bottom/sides of frame — not a full car model, since the player never sees it from outside.
- Dashboard should carry the same cartoon-bus-driver personality as busdriver.wtf's "Rajat — I drive this bus" framing: a small marigold garland hanging off the mirror, a sticker or two, a simple steering wheel model the player's input rotates in real time.

## 3. UI / UX layout

- **Canvas-first**: the driving scene fills most of the viewport as the primary visual, same role the hero photo plays on the reference sites.
- **Player bar**: persists at the same screen position across every route (home / playlists / songs / about), never re-renders/restarts on navigation — mirrors the reference sites' single-shared-player pattern exactly.
- **On-screen steering wheel**: small, bottom-center or bottom-corner, semi-transparent, always shows the true current steering value whether the input came from keyboard or drag — this is the player's confirmation the "car" is listening to them.
- **Minimal nav**: playlists / songs / about, same shallow structure as the references. No dashboards, no settings screens in v1.
- **Keyboard-first**, mirroring busdriver.wtf's shortcut layer: `Space` play/pause, `←/→` seek (when not actively steering) or steer (when driving), `N/P` track, plus your own steering key mapping — resolve the overlap between "seek" and "steer" explicitly during Phase 1 build (recommend: arrows always steer the car; seek moves to dedicated buttons/scrub bar instead, since steering is the primary interaction here).

## 4. Audio/feel notes
- Music is the star — no aggressive engine SFX competing with it. If any ambient engine hum is added, keep it very low and optional.
- A horn button/easter egg (busdriver.wtf-style playfulness) is a nice Phase 3 touch, not core.
- Camera bob/sway (Phase 3) should be subtle — this is a relaxing ambient toy, not an intense racer; motion should never fight the listening experience.
