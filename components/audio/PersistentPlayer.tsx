"use client";

import { useEffect, useState, useId, useRef, useCallback } from "react";
import { useAudioStore } from "@/lib/audio-store";
import { getSongEffectiveStart, getSongEmbedUrl } from "@/lib/songs-catalog";

// -----------------------------------------------------------------------------
// Vector SVG Icons (Zero Emojis, Agency-Grade Precision)
// -----------------------------------------------------------------------------
function IconPlay({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function IconPause({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function IconPrev({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden>
      <path d="M6 5h2.5v14H6zM19 5.5v13a1 1 0 0 1-1.53.85L8.6 13.2a1 1 0 0 1 0-1.7l8.87-6.15A1 1 0 0 1 19 5.5Z" />
    </svg>
  );
}

function IconNext({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden>
      <path d="M15.5 5H18v14h-2.5zM5 5.5v13a1 1 0 0 0 1.53.85l8.87-6.15a1 1 0 0 0 0-1.7L6.53 4.65A1 1 0 0 0 5 5.5Z" />
    </svg>
  );
}

function IconShuffle({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round`}
      aria-hidden
    >
      <path d="M16 3h5v5M4 20l5-5M21 3l-7 7M4 4l11 11M16 21h5v-5M21 21l-3-3" />
    </svg>
  );
}

function IconSpeakerMute({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round`}
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function IconSpeakerLow({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round`}
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function IconSpeakerHigh({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round`}
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function IconReverb({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round`}
      aria-hidden
    >
      <path d="M2 10v4M6 7v10M10 4v16M14 7v10M18 10v4M22 12v0" />
    </svg>
  );
}

function IconPhone({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round`}
      aria-hidden
    >
      <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function IconGrip({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function IconClose({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round`}
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * PersistentPlayer — Mounted ONCE in RootLayout (app/layout.tsx).
 *
 * Provides:
 * 1. Center-Bottom Minimalist Floating Glassmorphic Player Bar with Even Padding & Vector Icons.
 * 2. Realistic 3D Draggable Smartphone Mockup that can be placed anywhere across the screen.
 * 3. 100% Uninterrupted Audio Playback even when minimized or dragged.
 * 4. Automatic Radio Static Sound & Visual Transition on song changes.
 * 5. Song Timing Rules:
 *    - All songs start after 60 seconds (effective start = 60s or offset+60s).
 *    - Automatically transitions to the next song 60s before current song completes.
 */
export default function PersistentPlayer() {
  const mountId = useId();
  const [mounted, setMounted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState("01:00");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastSkipSongIdRef = useRef<number | null>(null);

  // --------------------------------------------------------------------------
  // Draggable State for 3D Phone Mockup
  // --------------------------------------------------------------------------
  const [phonePos, setPhonePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({
    mouseX: 0,
    mouseY: 0,
    posX: 0,
    posY: 0,
  });

  const {
    currentSong,
    currentSongIndex,
    isPlaying,
    volume,
    isMuted,
    isTuning,
    reverbEnabled,
    toggleReverb,
    setVolume,
    toggleMute,
    showVideoScreen,
    toggleVideoScreen,
    toggle,
    next,
    prev,
    playRandomSong,
    initRandomOnClientMount,
    track,
  } = useAudioStore();

  useEffect(() => {
    setMounted(true);
    initRandomOnClientMount();

    // Initialize phone position to bottom-right above HUD
    const initX = Math.max(16, window.innerWidth - 350);
    const initY = Math.max(16, window.innerHeight - 340);
    setPhonePos({ x: initX, y: initY });

    const onResize = () => {
      setPhonePos((prevPos) => {
        if (!prevPos) return null;
        const clampedX = Math.max(12, Math.min(window.innerWidth - 330, prevPos.x));
        const clampedY = Math.max(12, Math.min(window.innerHeight - 300, prevPos.y));
        return { x: clampedX, y: clampedY };
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [initRandomOnClientMount]);

  // Live IST Clock for Phone Mockup Header
  const [phoneTime, setPhoneTime] = useState("12:00");
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d);
      setPhoneTime(parts);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Spacebar = Play/Pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.tagName === "BUTTON" ||
          t.tagName === "A")
      )
        return;
      e.preventDefault();
      useAudioStore.getState().toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --------------------------------------------------------------------------
  // YouTube IFrame PostMessage Handshake & 60s Rule
  // --------------------------------------------------------------------------
  const sendYtCommand = useCallback((func: string, args: unknown[] = []) => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    lastSkipSongIdRef.current = null;
    const initTimer = setTimeout(() => {
      try {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "listening" }),
            "*"
          );
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: "command",
              func: "addEventListener",
              args: ["onStateChange"],
            }),
            "*"
          );
        }
      } catch {
        // ignore
      }
    }, 600);
    return () => clearTimeout(initTimer);
  }, [currentSong?.id, isPlaying]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "string") return;
      try {
        const data = JSON.parse(event.data);

        // State change: 0 = ENDED
        if (data.event === "onStateChange" && data.info === 0) {
          if (lastSkipSongIdRef.current !== currentSong?.id) {
            lastSkipSongIdRef.current = currentSong?.id ?? null;
            useAudioStore.getState().next();
          }
          return;
        }

        // Info delivery with currentTime & duration
        if (data.info && typeof data.info === "object") {
          const ct = data.info.currentTime;
          const dur = data.info.duration;

          if (typeof ct === "number") {
            const mins = Math.floor(ct / 60);
            const secs = Math.floor(ct % 60);
            setCurrentTimeFormatted(
              `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
            );
          }

          // Rule: Transition to next track 60s before completion
          if (
            typeof ct === "number" &&
            typeof dur === "number" &&
            dur > 120 &&
            ct >= dur - 60
          ) {
            if (lastSkipSongIdRef.current !== currentSong?.id) {
              lastSkipSongIdRef.current = currentSong?.id ?? null;
              useAudioStore.getState().next();
            }
          }
        }
      } catch {
        // non-json message from extensions
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [currentSong?.id]);

  // Periodic polling for time tracking
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        sendYtCommand("getCurrentTime");
        sendYtCommand("getDuration");
      }
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying, sendYtCommand]);

  // Sync play/pause with YouTube iframe
  useEffect(() => {
    if (!mounted) return;
    if (isPlaying) {
      sendYtCommand("playVideo");
    } else {
      sendYtCommand("pauseVideo");
    }
  }, [isPlaying, mounted, sendYtCommand]);

  // Sync volume with YouTube iframe
  useEffect(() => {
    if (!mounted) return;
    const volInt = isMuted ? 0 : Math.round(volume * 100);
    sendYtCommand("setVolume", [volInt]);
    if (isMuted) {
      sendYtCommand("mute");
    } else {
      sendYtCommand("unMute");
    }
  }, [volume, isMuted, mounted, sendYtCommand]);

  // --------------------------------------------------------------------------
  // Drag Handler Functions for 3D Phone Mockup
  // --------------------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only trigger drag on main chassis/header/grip, not on nested buttons or iframe
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("iframe") || target.closest("input")) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    const currentX = phonePos?.x ?? (window.innerWidth - 350);
    const currentY = phonePos?.y ?? (window.innerHeight - 340);

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: currentX,
      posY: currentY,
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const dx = moveEvt.clientX - dragStartRef.current.mouseX;
      const dy = moveEvt.clientY - dragStartRef.current.mouseY;

      const newX = dragStartRef.current.posX + dx;
      const newY = dragStartRef.current.posY + dy;

      const clampedX = Math.max(12, Math.min(window.innerWidth - 330, newX));
      const clampedY = Math.max(12, Math.min(window.innerHeight - 280, newY));

      setPhonePos({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const songNumber = String(currentSongIndex + 1).padStart(2, "0");
  const title = currentSong?.title || track.title;
  const volumePercent = isMuted ? 0 : Math.round(volume * 100);

  const effectiveStart = currentSong ? getSongEffectiveStart(currentSong) : 60;
  const ytEmbedUrl = currentSong
    ? getSongEmbedUrl(currentSong, isPlaying)
    : null;

  return (
    <>
      {/* ====================================================================
          📱 3D REALISTIC DRAGGABLE SMARTPHONE MOCKUP
          - Machined titanium chassis, CNC side buttons, Dynamic Island.
          - Draggable anywhere across the screen.
          - 100% uninterrupted audio playback even when minimized.
          ==================================================================== */}
      <div
        data-mount-id={mountId}
        onPointerDown={handlePointerDown}
        style={{
          left: phonePos ? `${phonePos.x}px` : "auto",
          top: phonePos ? `${phonePos.y}px` : "auto",
          right: phonePos ? "auto" : "1.5rem",
          bottom: phonePos ? "auto" : "7rem",
          position: "fixed",
        }}
        className={`z-40 w-[295px] sm:w-[330px] select-none transition-transform duration-300 ${
          isDragging ? "cursor-grabbing scale-[1.02] shadow-2xl" : "cursor-grab"
        } ${
          showVideoScreen
            ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
            : "translate-y-16 scale-90 opacity-0 pointer-events-none"
        }`}
      >
        {/* CNC Physical Side Buttons (Left: Volume Rockers, Right: Power Key) */}
        <div className="absolute -left-1 top-16 h-8 w-1 rounded-l-md bg-neutral-700/80 border-l border-y border-white/20 pointer-events-none" />
        <div className="absolute -left-1 top-26 h-8 w-1 rounded-l-md bg-neutral-700/80 border-l border-y border-white/20 pointer-events-none" />
        <div className="absolute -right-1 top-20 h-12 w-1 rounded-r-md bg-neutral-700/80 border-r border-y border-white/20 pointer-events-none" />

        {/* Outer 3D Phone Chassis */}
        <div className="relative phone-3d-chassis rounded-[2.5rem] p-2 sm:p-2.5">
          {/* Top Speaker Micro-Slit */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1 w-12 rounded-full bg-neutral-900 border-t border-white/10 pointer-events-none" />

          {/* Inner OLED Glass Screen Container */}
          <div className="relative overflow-hidden rounded-[2rem] bg-neutral-950 border border-neutral-900 shadow-inner">
            {/* Top Drag Handle Header & Dynamic Island */}
            <div className="relative flex items-center justify-between px-3.5 pt-2.5 pb-1.5 text-[11px] font-medium text-amber-100/90 bg-gradient-to-b from-neutral-900/90 to-transparent border-b border-white/5">
              {/* Drag Grip + Clock */}
              <div className="flex items-center gap-1.5 text-neutral-400">
                <IconGrip className="h-3 w-3 text-neutral-500" />
                <span className="font-mono text-[10px] text-neutral-300 font-semibold tracking-tight">
                  {phoneTime} IST
                </span>
              </div>

              {/* Dynamic Island Notch */}
              <div className="flex items-center gap-1.5 rounded-full bg-black px-2.5 py-0.5 border border-white/10 shadow-sm">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isPlaying ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"
                  }`}
                />
                <span className="text-[9px] font-mono text-amber-300/90 tracking-wider uppercase font-semibold">
                  {isTuning ? "TUNING..." : isPlaying ? "ON AIR" : "PAUSED"}
                </span>
              </div>

              {/* Action Buttons: Reverb, Shuffle & Minimize */}
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleReverb}
                  title={reverbEnabled ? "Cabin Reverb: ON" : "Cabin Reverb: OFF"}
                  className={`rounded-full p-1 transition cursor-pointer ${
                    reverbEnabled
                      ? "bg-white/15 text-amber-200 ring-1 ring-white/20"
                      : "text-neutral-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <IconReverb className="h-3 w-3" />
                </button>
                <button
                  onClick={playRandomSong}
                  title="Random Song"
                  className="rounded-full p-1 text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <IconShuffle className="h-3 w-3" />
                </button>
                <button
                  onClick={toggleVideoScreen}
                  title="Minimize Phone (Audio continues playing)"
                  className="rounded-full p-1 text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <IconClose className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Video Player Display (16:9 Aspect Ratio) */}
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              {ytEmbedUrl && (
                <iframe
                  ref={iframeRef}
                  key={`${currentSong?.videoId}`}
                  src={ytEmbedUrl}
                  title={currentSong?.title || "Bus TV"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              )}

              {/* Radio Tuning Static Glitch Flash Overlay */}
              {isTuning && (
                <div className="pointer-events-none absolute inset-0 z-30 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center animate-tuning-glitch">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-[10px] font-mono font-bold text-amber-200 tracking-widest uppercase">
                      TUNING FREQUENCY...
                    </span>
                  </div>
                </div>
              )}

              {/* Light-Bending Screen Reflection Glass Sheen */}
              <div className="pointer-events-none absolute inset-0 glass-reflection opacity-35 z-20" />
            </div>

            {/* Bottom Phone Info Drawer */}
            <div className="px-3.5 py-2 bg-gradient-to-t from-neutral-950 via-[#180e08]/90 to-transparent border-t border-white/5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-neutral-100">
                    #{songNumber} {title}
                  </p>
                  <p className="truncate text-[10px] text-amber-300/70 font-mono mt-0.5">
                    ⏱ {currentTimeFormatted} · Starts @ 60s
                  </p>
                </div>

                {/* Animated Equalizer */}
                <div className="flex items-end gap-0.5 h-3.5 px-1 shrink-0">
                  <div className={`w-0.5 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-1" : "h-1"}`} />
                  <div className={`w-0.5 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-2" : "h-1.5"}`} />
                  <div className={`w-0.5 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-3" : "h-2"}`} />
                  <div className={`w-0.5 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-4" : "h-1"}`} />
                </div>
              </div>

              {/* Phone Home Bar Pill */}
              <div className="mt-1.5 flex justify-center">
                <div className="h-1 w-16 rounded-full bg-white/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          📻 CENTER-BOTTOM MINIMALIST GLASSMORPHIC PLAYER BAR
          - Centered horizontally with light-bending specular border.
          - Evenly padded segmented cluster with high-end SVG vector icons.
          - Zero loud yellow backgrounds or rookie borders.
          ==================================================================== */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 select-none max-w-[calc(100vw-1.5rem)]">
        {/* Outer Frosted Glass Pill Wrapper */}
        <div className="glass-pill rounded-full p-1.5 shadow-2xl flex items-center gap-2 sm:gap-2.5 transition-all duration-300">
          {/* 1. Play / Pause Button with Button-in-Button Highlight */}
          <button
            onClick={toggle}
            aria-label={isPlaying ? "Pause radio" : "Play radio"}
            title={isPlaying ? "Pause (Space)" : "Play Track (Space)"}
            className="group relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 text-neutral-950 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:scale-105 hover:shadow-amber-500/40 active:scale-95 cursor-pointer ring-1 ring-white/30"
          >
            {isPlaying ? (
              <IconPause className="h-4 w-4 transition group-hover:scale-110" />
            ) : (
              <IconPlay className="h-4 w-4 translate-x-0.5 transition group-hover:scale-110" />
            )}
          </button>

          {/* 2. Track Navigation (Prev, Next, Shuffle) */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={prev}
              aria-label="Previous song"
              title="Previous song (with radio static transition)"
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition hover:bg-white/10 hover:text-white active:scale-90 cursor-pointer"
            >
              <IconPrev className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={next}
              aria-label="Next song"
              title="Next song (with radio static transition)"
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition hover:bg-white/10 hover:text-white active:scale-90 cursor-pointer"
            >
              <IconNext className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={playRandomSong}
              aria-label="Random Song"
              title="Surprise Me (Play Random Track)"
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white active:scale-90 transition cursor-pointer"
            >
              <IconShuffle className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-white/10 shrink-0" />

          {/* 3. Track Metadata & Live Equalizer */}
          <div className="flex items-center gap-2.5 min-w-0 max-w-[130px] sm:max-w-[200px] md:max-w-[260px] px-1">
            {/* Equalizer frequency bars */}
            <div className="flex items-end gap-0.5 h-3.5 shrink-0">
              <div className={`w-0.5 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-1" : "h-1"}`} />
              <div className={`w-0.5 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-2" : "h-2"}`} />
              <div className={`w-0.5 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-3" : "h-1.5"}`} />
              <div className={`w-0.5 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-4" : "h-2.5"}`} />
            </div>

            <div className="min-w-0 flex-1">
              <p
                suppressHydrationWarning
                className="truncate text-xs sm:text-sm font-semibold text-neutral-100 tracking-tight"
              >
                {mounted ? `#${songNumber} ${title}` : track.title}
              </p>
              <p
                suppressHydrationWarning
                className="truncate text-[10px] text-amber-300/70 font-medium font-mono"
              >
                {isTuning ? "Tuning Frequency..." : mounted && isPlaying ? `Track #${songNumber}/100` : "Click Play or Space"}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-white/10 shrink-0" />

          {/* 4. Evenly Padded Rightmost Controls Cluster (Volume, Reverb, Phone) */}
          <div className="flex items-center gap-1.5 shrink-0 px-1">
            {/* Hover Volume Slider */}
            <div className="relative flex items-center">
              <button
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                title={`Volume: ${volumePercent}% (Click to Mute/Unmute)`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                {isMuted || volumePercent === 0 ? (
                  <IconSpeakerMute className="h-3.5 w-3.5 text-neutral-400" />
                ) : volumePercent < 50 ? (
                  <IconSpeakerLow className="h-3.5 w-3.5" />
                ) : (
                  <IconSpeakerHigh className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Smooth expandable slider */}
              <div
                className={`flex items-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  showVolumeSlider
                    ? "w-24 sm:w-28 opacity-100 mr-1"
                    : "w-0 opacity-0 overflow-hidden"
                }`}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="h-1.5 w-16 sm:w-20 cursor-pointer accent-amber-400 bg-neutral-900 rounded-lg ring-1 ring-white/10"
                  title={`Volume ${volumePercent}%`}
                />
                <span className="text-[10px] font-mono text-amber-300/80 w-5">
                  {volumePercent}%
                </span>
              </div>
            </div>

            {/* Cabin Reverb Acoustic Filter Toggle */}
            <button
              onClick={toggleReverb}
              title={
                reverbEnabled
                  ? "Cabin Reverb: ON (Warm bus interior acoustic echo)"
                  : "Cabin Reverb: OFF (Click to enable cozy cabin echo)"
              }
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all cursor-pointer ${
                reverbEnabled
                  ? "bg-white/15 text-amber-200 ring-1 ring-white/25 shadow-[0_0_12px_rgba(255,200,100,0.15)]"
                  : "text-neutral-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <IconReverb className="h-3.5 w-3.5" />
            </button>

            {/* 3D Phone Mockup Dashboard Toggle */}
            <button
              onClick={toggleVideoScreen}
              title={
                showVideoScreen
                  ? "Minimize Dashboard Phone (Audio keeps playing)"
                  : "Open 3D Dashboard Phone (Draggable)"
              }
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all cursor-pointer ${
                showVideoScreen
                  ? "bg-white/15 text-amber-200 ring-1 ring-white/25 shadow-[0_0_12px_rgba(255,200,100,0.15)]"
                  : "text-neutral-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <IconPhone className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
