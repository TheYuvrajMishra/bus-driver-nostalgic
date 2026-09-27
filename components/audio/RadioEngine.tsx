"use client";

import { useEffect, useRef } from "react";
import { useAudioStore } from "@/lib/audio-store";
import { YOUTUBE_PLAYLIST_ID } from "@/lib/radio-config";
import {
  setYtPlayer,
  isYtReady,
  ytPlay,
  ytPause,
  ytNext,
  ytTitle,
} from "@/lib/yt-engine";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = "https://www.youtube.com/iframe_api";
const READY_TIMEOUT_MS = 15_000;

/**
 * RadioEngine — mounted ONCE in the root layout (app/layout.tsx).
 *
 * Owns the actual playback engines; the visible bottom bar
 * (<PersistentPlayer/>) is UI-only and drives the zustand store.
 *
 * Primary engine: a hidden YouTube IFrame player running the playlist from
 * lib/radio-config.ts. Fallback engine: the old local <audio> loop
 * (placeholder tracks) if the YouTube API can't load (offline, blocked).
 *
 * The zustand store stays the source of truth for play/pause; this component
 * just syncs the active engine to it.
 */
export default function RadioEngine() {
  const holderRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const createdRef = useRef(false);

  const { track, isPlaying, engine, setEngine, setRadioTitle, pause } =
    useAudioStore();

  // Create the YouTube player once.
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    let disposed = false;
    let ytPlayer: any = null;

    const onReady = (player: any) => {
      if (disposed) return;
      ytPlayer = player;
      setYtPlayer(player);
      setEngine("youtube");
      // Debug/QA handle (also lets tests assert the player survives nav).
      (window as any).__ytPlayer = player;
      const t = ytTitle();
      if (t) setRadioTitle(t);
      if (useAudioStore.getState().isPlaying) ytPlay();
    };

    const createPlayer = () => {
      if (disposed || !holderRef.current || !window.YT?.Player) return;
      const YTNS = window.YT;
      ytPlayer = new YTNS.Player(holderRef.current, {
        width: "4",
        height: "4",
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          listType: "playlist",
          list: YOUTUBE_PLAYLIST_ID,
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          rel: 0,
          loop: 1,
        },
        events: {
          onReady: (e: any) => onReady(e.target),
          onStateChange: (e: any) => {
            if (e.data === YTNS.PlayerState.PLAYING) {
              const t = ytTitle();
              if (t) useAudioStore.getState().setRadioTitle(t);
            }
          },
          // A video that refuses embedding (or errors) gets skipped.
          onError: () => ytNext(),
        },
      });
    };

    const failToLegacy = () => {
      if (disposed || isYtReady()) return;
      useAudioStore.getState().setEngine("legacy");
      useAudioStore.getState().setRadioTitle(null);
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevReady?.();
        createPlayer();
      };
      const script = document.createElement("script");
      script.src = API_SRC;
      script.async = true;
      script.onerror = failToLegacy;
      document.head.appendChild(script);
    }

    const timer = setTimeout(failToLegacy, READY_TIMEOUT_MS);

    return () => {
      disposed = true;
      clearTimeout(timer);
      try {
        ytPlayer?.destroy?.();
      } catch {
        /* ignore */
      }
      setYtPlayer(null);
      delete (window as any).__ytPlayer;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drive the active engine from store state (play/pause requests).
  useEffect(() => {
    if (engine === "youtube") {
      if (isPlaying) ytPlay();
      else ytPause();
    } else {
      const el = audioRef.current;
      if (!el) return;
      if (isPlaying) el.play().catch(() => pause());
      else el.pause();
    }
  }, [isPlaying, engine, pause]);

  // Legacy engine: switch source when the rotation/track changes,
  // preserving play state across the switch.
  useEffect(() => {
    if (engine !== "legacy") return;
    const el = audioRef.current;
    if (!el) return;
    const current = el.getAttribute("src");
    if (current !== track.src) {
      const wasPlaying = !el.paused;
      el.src = track.src;
      el.load();
      if (wasPlaying || useAudioStore.getState().isPlaying) {
        el.play().catch(() => pause());
      }
    }
  }, [track, engine, pause]);

  return (
    <>
      {/* Hidden YouTube player — audio-only radio. Kept in the DOM (not
          display:none) so playback isn't throttled. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          width: 4,
          height: 4,
          bottom: 0,
          left: 0,
          opacity: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div ref={holderRef} />
      </div>
      {/* Legacy fallback engine (local placeholder loop). */}
      {engine === "legacy" && (
        <audio ref={audioRef} src={track.src} loop preload="auto" aria-hidden />
      )}
    </>
  );
}
