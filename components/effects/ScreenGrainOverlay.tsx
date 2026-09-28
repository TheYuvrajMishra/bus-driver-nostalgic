"use client";

import React from "react";

interface ScreenGrainOverlayProps {
  /** Opacity of the grain overlay (0 to 1). Default: 0.22 */
  opacity?: number;
  /** Blend mode to use. Default: "overlay" */
  blendMode?: "overlay" | "soft-light" | "multiply" | "screen";
  /** Size preset for the grain tile. Default: "fine" (small tile, dense repeat = high-res look) */
  grainScale?: "fine" | "medium" | "coarse";
}

/**
 * ScreenGrainOverlay
 *
 * Lightweight, high-performance screen texture overlay created from optimized
 * dark-stone/concrete grain. Overlaid with `mix-blend-mode: overlay` to give the
 * whole screen an authentic, tactile nostalgic highway vibe without blocking pointer interactions.
 *
 * Static (no animation) — the fine tile repeats densely across the screen so the
 * grain reads high-res instead of chunky.
 */
export default function ScreenGrainOverlay({
  opacity = 0.22,
  blendMode = "overlay",
  grainScale = "fine",
}: ScreenGrainOverlayProps) {
  const tileSize =
    grainScale === "fine" ? "256px" : grainScale === "coarse" ? "512px" : "384px";

  const textureUrl =
    grainScale === "fine"
      ? "/assets/grain/grain-overlay-256.webp"
      : "/assets/grain/grain-overlay-512.webp";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none"
      style={{
        zIndex: 40,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url(${textureUrl})`,
          backgroundRepeat: "repeat",
          backgroundSize: `${tileSize} ${tileSize}`,
          mixBlendMode: blendMode,
          opacity: opacity,
        }}
      />
    </div>
  );
}
