/**
 * Module-scope holder for the YouTube IFrame player instance.
 *
 * The player is created once by <RadioEngine/>; these helpers let the audio
 * store and UI drive it without prop-drilling the instance. Every helper is
 * a no-op until the player is ready (and guarded against YT API throws).
 */

interface YtPlayerLike {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  getVideoData(): { title?: string };
}

let player: YtPlayerLike | null = null;

export function setYtPlayer(p: YtPlayerLike | null) {
  player = p;
}

export function isYtReady(): boolean {
  return player !== null;
}

export function ytPlay() {
  try {
    player?.playVideo();
  } catch {
    /* not ready / blocked — store stays source of truth */
  }
}

export function ytPause() {
  try {
    player?.pauseVideo();
  } catch {
    /* ignore */
  }
}

export function ytNext() {
  try {
    player?.nextVideo();
  } catch {
    /* ignore */
  }
}

export function ytPrev() {
  try {
    player?.previousVideo();
  } catch {
    /* ignore */
  }
}

export function ytTitle(): string | null {
  try {
    return player?.getVideoData()?.title ?? null;
  } catch {
    return null;
  }
}
