"use client";

import React from "react";

interface ScreenGrainOverlayProps {
  /** Opacity of the grain overlay (0 to 1). Default: 0.22 */
  opacity?: number;
  /** Blend mode to use. Default: "overlay" */
  blendMode?: "overlay" | "soft-light" | "multiply" | "screen";
  /** Whether to apply subtle vintage film grain jitter. Default: true */
  animated?: boolean;
  /** Size preset for the grain tile. Default: "medium" */
  grainScale?: "fine" | "medium" | "coarse";
}

/**
 * ScreenGrainOverlay
 * 
 * Lightweight, high-performance screen texture overlay created from optimized
 * dark-stone/concrete grain. Overlaid with `mix-blend-mode: overlay` to give the
 * whole screen an authentic, tactile nostalgic highway vibe without blocking pointer interactions.
 */
export default function ScreenGrainOverlay({
  opacity = 0.22,
  blendMode = "overlay",
  animated = true,
  grainScale = "medium",
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
        className={`pointer-events-none absolute -inset-[10%] h-[120%] w-[120%] will-change-transform ${
          animated ? "animate-grain" : ""
        }`}
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
