"use client";

import { useEffect, useState, useId } from "react";
import { useAudioStore } from "@/lib/audio-store";

/**
 * PersistentPlayer — mounted ONCE in RootLayout (app/layout.tsx).
 *
 * Provides:
 * 1. Retro Bus TV Monitor with active YouTube embed playback & video.
 * 2. Bottom Radio Bar with 100-Gaane Jukebox Controls, Volume Slider, and Mute.
 */
export default function PersistentPlayer() {
  const mountId = useId();
  const [mounted, setMounted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const {
    currentSong,
    isPlaying,
    volume,
    isMuted,
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
  }, [initRandomOnClientMount]);

  const title = currentSong?.title || "Bollywood 90s Hits";
  const subtitle = `📻 Gaana #${currentSong?.id || 1}/100 · 80s-90s Classics`;

  // Space = play/pause. Skip when typing in inputs.
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

  const volumePercent = Math.round((isMuted ? 0 : volume) * 100);

  // YouTube embed URL with autoplay parameter when isPlaying is true
  const ytEmbedUrl = currentSong
    ? `https://www.youtube.com/embed/${currentSong.videoId}?autoplay=${
        isPlaying ? 1 : 0
      }&playsinline=1&rel=0&modestbranding=1${
        currentSong.startSeconds ? `&start=${currentSong.startSeconds}` : ""
      }`
    : null;

  return (
    <div
      data-mount-id={mountId}
      className="fixed bottom-4 left-4 z-40 flex flex-col gap-2 select-none"
    >
      {/* 📺 Retro Bus TV Screen (Mounted above the radio bar) */}
      {showVideoScreen && (
        <div className="relative w-80 sm:w-96 rounded-2xl border-2 border-amber-500/60 bg-[#120a06]/95 p-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* TV Bezel Header */}
          <div className="flex items-center justify-between px-2 pb-1.5 text-xs text-amber-200">
            <div className="flex items-center gap-1.5 font-bold truncate pr-2">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="truncate">
                📺 Bus TV · #{currentSong?.id} {currentSong?.title}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={playRandomSong}
                title="Random Song"
                className="rounded px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/40 text-[10px] text-amber-300 font-mono transition cursor-pointer"
              >
                🎲 Random
              </button>
              <button
                onClick={toggleVideoScreen}
                title="Minimize TV Screen"
                className="h-5 w-5 rounded flex items-center justify-center bg-amber-950/80 hover:bg-amber-800 text-amber-200 text-xs transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Video Player Frame */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-amber-900/40">
            {ytEmbedUrl && (
              <iframe
                key={`${currentSong?.videoId}-${isPlaying}`}
                src={ytEmbedUrl}
                title={currentSong?.title || "Bus TV"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full border-0"
              />
            )}
          </div>
        </div>
      )}

      {/* 📻 Bottom Radio Bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-amber-900/70 bg-[#1a0f0c]/95 px-3.5 py-2.5 backdrop-blur-md shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-lg">
        {/* Play/Pause Button */}
        <button
          onClick={toggle}
          aria-label={isPlaying ? "Pause radio" : "Play radio"}
          title={isPlaying ? "Pause (Space)" : "Play Track (Space)"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[#1a0f0c] shadow-md transition hover:scale-105 hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-95 cursor-pointer"
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current translate-x-0.5" aria-hidden>
              <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>

        {/* Track Navigation Controls */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={prev}
            aria-label="Previous song"
            title="Previous song"
            className="flex h-8 w-8 items-center justify-center rounded-full text-amber-200/70 transition hover:bg-amber-500/10 hover:text-amber-100 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M6 5h2.5v14H6zM19 5.5v13a1 1 0 0 1-1.53.85L8.6 13.2a1 1 0 0 1 0-1.7l8.87-6.15A1 1 0 0 1 19 5.5Z" />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Next song"
            title="Next song"
            className="flex h-8 w-8 items-center justify-center rounded-full text-amber-200/70 transition hover:bg-amber-500/10 hover:text-amber-100 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M15.5 5H18v14h-2.5zM5 5.5v13a1 1 0 0 0 1.53.85l8.87-6.15a1 1 0 0 0 0-1.7L6.53 4.65A1 1 0 0 0 5 5.5Z" />
            </svg>
          </button>
          <button
            onClick={playRandomSong}
            aria-label="Random Song"
            title="Surprise Me (Play Random Track)"
            className="flex h-8 w-8 items-center justify-center rounded-full text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-100 transition cursor-pointer text-xs"
          >
            🎲
          </button>
        </div>

        {/* Song Info */}
        <div className="min-w-0 flex-1">
          <p
            suppressHydrationWarning
            className="truncate text-xs sm:text-sm font-bold text-amber-100 tracking-tight"
          >
            {mounted ? title : track.title}
          </p>
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                isPlaying ? "bg-amber-400 animate-pulse" : "bg-amber-700"
              }`}
            />
            <p
              suppressHydrationWarning
              className="truncate text-[10px] sm:text-xs text-amber-200/70"
            >
              {mounted && isPlaying ? subtitle : "Click ▶ or press Space to play"}
            </p>
          </div>
        </div>

        {/* Volume & Controls */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-amber-900/40">
          {/* Volume Control */}
          <div className="relative flex items-center">
            <button
              onClick={toggleMute}
              onMouseEnter={() => setShowVolumeSlider(true)}
              title={`Volume: ${volumePercent}% (Click to Mute/Unmute)`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-amber-200/80 hover:bg-amber-500/10 hover:text-amber-100 transition cursor-pointer text-sm"
            >
              {isMuted || volumePercent === 0 ? "🔇" : volumePercent < 50 ? "🔉" : "🔊"}
            </button>

            {/* Hover/Focus Volume Slider */}
            <div
              className={`flex items-center gap-2 transition-all duration-200 ${
                showVolumeSlider
                  ? "w-28 opacity-100 mr-1"
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
                className="h-1.5 w-20 cursor-pointer accent-amber-500 bg-amber-950/80 rounded-lg"
                title={`Volume ${volumePercent}%`}
              />
              <span className="text-[10px] font-mono text-amber-300 w-6">
                {volumePercent}%
              </span>
            </div>
          </div>

          {/* 📺 TV Screen Toggle */}
          <button
            onClick={toggleVideoScreen}
            title={showVideoScreen ? "Hide Bus TV" : "Show Bus TV"}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition cursor-pointer text-sm ${
              showVideoScreen
                ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400"
                : "text-amber-200/70 hover:bg-amber-500/10 hover:text-amber-100"
            }`}
          >
            📺
          </button>
        </div>
      </div>
    </div>
  );
}
