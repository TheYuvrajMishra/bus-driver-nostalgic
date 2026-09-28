"use client";

/**
 * Shared Web Audio context (singleton).
 *
 * Replaces the old cabinReverb.getAudioContext(). Lazily creates one
 * AudioContext per page load and resumes it on every access (browsers
 * suspend it until the user interacts).
 */

let sharedCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      sharedCtx = new AudioCtx();
    }
  }
  if (sharedCtx && sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}
