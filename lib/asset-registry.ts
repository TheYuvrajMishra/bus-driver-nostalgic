/**
 * Asset registry — architecture.md §9.
 *
 * Single labeled registry of every model/texture used by the driving scene.
 * All assets in v1 are procedural (canvas textures, merged low-poly
 * geometry) so there are no external files to license or download; each
 * entry names its factory and category so new props can be added without
 * touching generation logic.
 */
export interface AssetEntry {
  name: string;
  category: "texture" | "geometry" | "audio";
  factory: string;
  note: string;
}

export const ASSET_REGISTRY: AssetEntry[] = [
  {
    name: "road-surface",
    category: "texture",
    factory: "lib/road-assets.ts → getRoadMaterial()",
    note: "Canvas-drawn asphalt: worn patches, edge lines, dashed centre line. Tiled every 24 m via ribbon UVs.",
  },
  {
    name: "tree-billboard",
    category: "texture",
    factory: "lib/prop-assets.ts → getTreeTexture()",
    note: "Alpha-cut banyan-style canopy + trunk on a camera-facing plane (research.md §3: billboard impostors).",
  },
  {
    name: "blob-shadow",
    category: "texture",
    factory: "lib/prop-assets.ts → getBlobShadowTexture()",
    note: "Radial-gradient decal faking ground contact under trucks/dhabas/trees (no shadow maps, arch.md §7).",
  },
  {
    name: "dhaba",
    category: "geometry",
    factory: "lib/prop-assets.ts → getDhabaGeometry()",
    note: "Merged low-poly roadside dhaba: plaster walls, terracotta roof slab, teal sign board, charpai. Vertex-colored.",
  },
  {
    name: "truck",
    category: "geometry",
    factory: "lib/prop-assets.ts → getTruckGeometry()",
    note: "Merged low-poly hand-painted-style truck: mustard container, red cab, tail-art stripe, 6 wheels. Vertex-colored; instance color tints variants.",
  },
  {
    name: "milestone",
    category: "geometry",
    factory: "lib/prop-assets.ts → getMilestoneGeometry()",
    note: "Merged kilometre stone: white body, black cap, yellow band. Vertex-colored.",
  },
  {
    name: "placeholder-highway-raat",
    category: "audio",
    factory: "public/audio/placeholder-highway-raat.mp3",
    note: "Generated placeholder drone (82.5 Hz base) for the Highway Raat rotation. Real catalog TBD (prd.md §7).",
  },
  {
    name: "placeholder-subah-nikaas",
    category: "audio",
    factory: "public/audio/placeholder-subah-nikaas.mp3",
    note: "Generated placeholder drone (110 Hz base) for the Subah Nikaas rotation.",
  },
  {
    name: "placeholder-dhaba-classics",
    category: "audio",
    factory: "public/audio/placeholder-dhaba-classics.mp3",
    note: "Generated placeholder drone (130.8 Hz base) for the Dhaba Classics rotation.",
  },
  {
    name: "placeholder-sunset-chill",
    category: "audio",
    factory: "public/audio/placeholder-sunset-chill.mp3",
    note: "Generated placeholder drone (98 Hz base) for the Sunset Chill rotation.",
  },
];
