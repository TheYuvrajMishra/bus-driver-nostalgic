/**
 * Module-scope holder for YouTube IFrame player instance and Audio helpers.
 */

interface YtPlayerLike {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  loadVideoById(args: { videoId: string; startSeconds?: number } | string): void;
  cueVideoById(args: { videoId: string; startSeconds?: number } | string): void;
  unMute(): void;
  mute(): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  getPlayerState(): number;
  getVideoData(): { title?: string };
}

let player: YtPlayerLike | null = null;

export function setYtPlayer(p: YtPlayerLike | null) {
  player = p;
}

export function isYtReady(): boolean {
  return player !== null;
}

export function ytUnmute() {
  try {
    player?.unMute();
  } catch {
    /* ignore */
  }
}

export function ytMute() {
  try {
    player?.mute();
  } catch {
    /* ignore */
  }
}

export function ytSetVolume(volumePercent: number) {
  try {
    const vol = Math.max(0, Math.min(100, Math.round(volumePercent)));
    player?.setVolume(vol);
    if (vol > 0) {
      player?.unMute();
    }
  } catch {
    /* ignore */
  }
}

export function ytLoadVideo(videoId: string, startSeconds?: number) {
  try {
    ytUnmute();
    if (typeof startSeconds === "number" && startSeconds > 0) {
      player?.loadVideoById({ videoId, startSeconds });
    } else {
      player?.loadVideoById(videoId);
    }
  } catch {
    /* ignore */
  }
}

export function ytCueVideo(videoId: string, startSeconds?: number) {
  try {
    if (typeof startSeconds === "number" && startSeconds > 0) {
      player?.cueVideoById({ videoId, startSeconds });
    } else {
      player?.cueVideoById(videoId);
    }
  } catch {
    /* ignore */
  }
}

export function ytPlay() {
  try {
    ytUnmute();
    player?.playVideo();
  } catch {
    /* ignore */
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
    ytUnmute();
    player?.nextVideo();
  } catch {
    /* ignore */
  }
}

export function ytPrev() {
  try {
    ytUnmute();
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
