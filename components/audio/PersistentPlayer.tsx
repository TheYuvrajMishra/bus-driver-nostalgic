"use client";

import { useEffect, useState, useId, useRef, useCallback } from "react";
import { useAudioStore } from "@/lib/audio-store";
import { getSongEffectiveStart, getSongEmbedUrl } from "@/lib/songs-catalog";

/**
 * PersistentPlayer — Mounted ONCE in RootLayout (app/layout.tsx).
 *
 * Provides:
 * 1. Center-Bottom Minimalist Floating Glassmorphic Player Bar.
 * 2. Realistic Smartphone Mockup Dashboard TV Mounted on the Right.
 * 3. 100% Uninterrupted Audio Playback even when the phone screen is minimized.
 * 4. Automatic Radio Static Sound & Visual Transition on song changes.
 * 5. Song Timing Rules:
 *    - All songs start after 60 seconds (effective start = 60s or offset+60s).
 *    - Automatically transitions to the next song 60s before the current song completes.
 */
export default function PersistentPlayer() {
  const mountId = useId();
  const [mounted, setMounted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState("01:00");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastSkipSongIdRef = useRef<number | null>(null);

  const {
    currentSong,
    currentSongIndex,
    isPlaying,
    volume,
    isMuted,
    isTuning,
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
    rotationId,
  } = useAudioStore();

  useEffect(() => {
    setMounted(true);
    initRandomOnClientMount();
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

  // Spacebar = Play/Pause (Skip when inside input fields)
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
  // YouTube IFrame PostMessage Communication & 60s Auto-Advance
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

  // Register listening handshake when iframe or song changes
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

  // Handle postMessage events from YouTube IFrame
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

          // Trigger change 60 seconds before the song ends!
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
        // ignore non-JSON messages
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [currentSong?.id]);

  // Periodic polling interval to query currentTime & duration
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      sendYtCommand("getCurrentTime");
      sendYtCommand("getDuration");
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying, sendYtCommand]);

  const title = currentSong?.title || "Bollywood 90s Hits";
  const songNumber = currentSong?.id || currentSongIndex + 1;
  const volumePercent = Math.round((isMuted ? 0 : volume) * 100);

  // YouTube Embed URL (always starts after 60 seconds)
  const effectiveStart = currentSong ? getSongEffectiveStart(currentSong) : 60;
  const ytEmbedUrl = currentSong
    ? getSongEmbedUrl(currentSong, isPlaying)
    : null;

  return (
    <>
      {/* ====================================================================
          📱 REALISTIC DASHBOARD SMARTPHONE MOCKUP (RIGHT COCKPIT)
          - Keeps iframe mounted 100% of the time so audio never cuts out.
          - Smooth spring cubic-bezier entrance & exit when minimized.
          ==================================================================== */}
      <div
        data-mount-id={mountId}
        className={`fixed bottom-24 sm:bottom-28 right-4 sm:right-6 md:right-8 z-40 w-[290px] sm:w-[330px] select-none transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          showVideoScreen
            ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
            : "translate-y-16 scale-90 opacity-0 pointer-events-none"
        }`}
      >
        {/* Magnetic Mount Stand Shadow & Base Bracket */}
        <div className="absolute -bottom-3 left-1/2 h-5 w-24 -translate-x-1/2 rounded-full bg-black/70 blur-md pointer-events-none" />
        <div className="absolute -bottom-2 left-1/2 h-3.5 w-16 -translate-x-1/2 rounded-t-lg bg-gradient-to-t from-neutral-900 to-neutral-700 border-x border-t border-amber-500/30 shadow-lg pointer-events-none" />

        {/* Outer Phone Chassis (Anodized Titanium Double-Bezel) */}
        <div className="relative glass-phone-body rounded-[2.5rem] p-2 sm:p-2.5 border border-amber-500/30">
          {/* Subtle Phone Rim Highlights */}
          <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-white/20 pointer-events-none" />

          {/* Inner Phone Screen Container */}
          <div className="relative overflow-hidden rounded-[2rem] bg-neutral-950 border border-black shadow-inner">
            {/* Top Phone Status Bar & Dynamic Island */}
            <div className="relative flex items-center justify-between px-4 pt-2.5 pb-1.5 text-[11px] font-medium text-amber-100/90 bg-gradient-to-b from-black/80 to-transparent">
              {/* Clock */}
              <span className="font-mono text-[10px] text-amber-200/90 font-bold tracking-tight">
                {phoneTime} IST
              </span>

              {/* Dynamic Island Notch */}
              <div className="flex items-center gap-1.5 rounded-full bg-black/90 px-2.5 py-0.5 border border-white/10 shadow-sm">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isPlaying ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"
                  }`}
                />
                <span className="text-[9px] font-mono text-amber-300 tracking-wider uppercase">
                  {isTuning ? "TUNING..." : isPlaying ? "ON AIR" : "PAUSED"}
                </span>
              </div>

              {/* Action Buttons: Dice & Minimize */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={playRandomSong}
                  title="Random Song"
                  className="rounded-full p-1 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 transition cursor-pointer text-[10px]"
                >
                  🎲
                </button>
                <button
                  onClick={toggleVideoScreen}
                  title="Minimize Phone (Audio continues playing)"
                  className="rounded-full h-4 w-4 flex items-center justify-center bg-white/10 hover:bg-white/20 text-amber-200 text-[10px] transition cursor-pointer"
                >
                  ✕
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
                <div className="pointer-events-none absolute inset-0 z-30 bg-amber-950/70 backdrop-blur-sm flex items-center justify-center animate-tuning-glitch">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl animate-spin">📻</span>
                    <span className="text-[10px] font-mono font-bold text-amber-200 tracking-widest uppercase">
                      TUNING FREQUENCY...
                    </span>
                  </div>
                </div>
              )}

              {/* Light-Bending Screen Reflection Glass Sheen */}
              <div className="pointer-events-none absolute inset-0 glass-reflection opacity-40 z-20" />
            </div>

            {/* Bottom Phone Info Drawer */}
            <div className="px-3.5 py-2.5 bg-gradient-to-t from-[#140a06] via-[#1a0f0a] to-transparent border-t border-amber-950/60">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-amber-100">
                    #{songNumber} {title}
                  </p>
                  <p className="truncate text-[10px] text-amber-300/60 font-mono mt-0.5">
                    ⏱ {currentTimeFormatted} · Starts @ 60s
                  </p>
                </div>

                {/* Animated Equalizer */}
                <div className="flex items-end gap-0.5 h-4 px-1 shrink-0">
                  <div className={`w-1 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-1" : "h-1"}`} />
                  <div className={`w-1 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-2" : "h-1.5"}`} />
                  <div className={`w-1 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-3" : "h-2"}`} />
                  <div className={`w-1 rounded-full bg-amber-400 ${isPlaying ? "eq-bar-4" : "h-1"}`} />
                </div>
              </div>

              {/* Phone Home Bar Pill */}
              <div className="mt-2 flex justify-center">
                <div className="h-1 w-20 rounded-full bg-white/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          📻 CENTER-BOTTOM MINIMALIST GLASSMORPHIC PLAYER BAR
          - Centered horizontally with light-bending specular border.
          - Tactile controls, animated equalizer, volume hover slider.
          ==================================================================== */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 select-none max-w-[calc(100vw-1.5rem)]">
        {/* Outer Bezel Wrapper */}
        <div className="glass-pill rounded-full p-1.5 shadow-2xl flex items-center gap-2 sm:gap-3 transition-all duration-300">
          {/* 1. Play / Pause Button with Button-in-Button Highlight */}
          <button
            onClick={toggle}
            aria-label={isPlaying ? "Pause radio" : "Play radio"}
            title={isPlaying ? "Pause (Space)" : "Play Track (Space)"}
            className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 text-neutral-950 shadow-lg shadow-amber-500/30 transition-all duration-300 hover:scale-105 hover:shadow-amber-500/50 active:scale-95 cursor-pointer ring-1 ring-white/30"
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current transition group-hover:scale-110" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current translate-x-0.5 transition group-hover:scale-110" aria-hidden>
                <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" />
              </svg>
            )}
          </button>

          {/* 2. Track Navigation (Prev, Next, Shuffle) */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              onClick={prev}
              aria-label="Previous song"
              title="Previous song (with radio static transition)"
              className="flex h-8 w-8 items-center justify-center rounded-full text-amber-200/70 transition hover:bg-white/10 hover:text-amber-100 active:scale-90 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <path d="M6 5h2.5v14H6zM19 5.5v13a1 1 0 0 1-1.53.85L8.6 13.2a1 1 0 0 1 0-1.7l8.87-6.15A1 1 0 0 1 19 5.5Z" />
              </svg>
            </button>

            <button
              onClick={next}
              aria-label="Next song"
              title="Next song (with radio static transition)"
              className="flex h-8 w-8 items-center justify-center rounded-full text-amber-200/70 transition hover:bg-white/10 hover:text-amber-100 active:scale-90 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <path d="M15.5 5H18v14h-2.5zM5 5.5v13a1 1 0 0 0 1.53.85l8.87-6.15a1 1 0 0 0 0-1.7L6.53 4.65A1 1 0 0 0 5 5.5Z" />
              </svg>
            </button>

            <button
              onClick={playRandomSong}
              aria-label="Random Song"
              title="Surprise Me (Play Random Track)"
              className="flex h-8 w-8 items-center justify-center rounded-full text-amber-300/80 hover:bg-white/10 hover:text-amber-100 active:scale-90 transition cursor-pointer text-xs"
            >
              🎲
            </button>
          </div>

          {/* 3. Track Metadata & Live Equalizer */}
          <div className="flex items-center gap-2.5 min-w-0 max-w-[140px] sm:max-w-[220px] md:max-w-[280px] px-1 border-l border-white/10">
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
                className="truncate text-xs sm:text-sm font-bold text-amber-100 tracking-tight"
              >
                {mounted ? `#${songNumber} ${title}` : track.title}
              </p>
              <p
                suppressHydrationWarning
                className="truncate text-[10px] text-amber-300/60 font-medium"
              >
                {isTuning ? "⚡ Tuning Frequency..." : mounted && isPlaying ? `📻 Gaana #${songNumber}/100` : "Click ▶ or Space to play"}
              </p>
            </div>
          </div>

          {/* 4. Controls Divider & Volume + Phone Toggles */}
          <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-white/10">
            {/* Hover Volume Slider */}
            <div className="relative flex items-center">
              <button
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                title={`Volume: ${volumePercent}% (Click to Mute/Unmute)`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-amber-200/80 hover:bg-white/10 hover:text-amber-100 transition cursor-pointer text-xs sm:text-sm"
              >
                {isMuted || volumePercent === 0 ? "🔇" : volumePercent < 50 ? "🔉" : "🔊"}
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
                <span className="text-[10px] font-mono text-amber-300 w-5">
                  {volumePercent}%
                </span>
              </div>
            </div>

            {/* 📱 Phone Mockup Dashboard Toggle */}
            <button
              onClick={toggleVideoScreen}
              title={
                showVideoScreen
                  ? "Minimize Dashboard Phone (Audio keeps playing)"
                  : "Open Dashboard Phone Mockup"
              }
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all cursor-pointer text-xs sm:text-sm ${
                showVideoScreen
                  ? "bg-amber-500/25 text-amber-300 ring-1 ring-amber-400/60 shadow-sm"
                  : "text-amber-200/60 hover:bg-white/10 hover:text-amber-100"
              }`}
            >
              📱
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
