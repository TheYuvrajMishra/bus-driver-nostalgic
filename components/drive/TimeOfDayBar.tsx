"use client";

import { useWeatherStore, type TimeOfDay } from "@/lib/weather-store";
import { useEffect } from "react";

// Inline SVG Icons for zero-dependency reliability
function SunIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function CloudRainIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M16 14v6" />
      <path d="M8 14v6" />
      <path d="M12 16v6" />
    </svg>
  );
}

function SunsetIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10V2" />
      <path d="m4.93 10.93 1.41 1.41" />
      <path d="M2 18h2" />
      <path d="M20 18h2" />
      <path d="m19.07 10.93-1.41 1.41" />
      <path d="M22 22H2" />
      <path d="m8 6 4-4 4 4" />
      <path d="M16 18a4 4 0 0 0-8 0" />
    </svg>
  );
}

function MoonIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function SparklesIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function LightbulbIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

const MOODS: { id: TimeOfDay; label: string; hindi: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "morning", label: "Sunny", hindi: "सुबह", icon: SunIcon },
  { id: "noon", label: "Rainy", hindi: "दोपहर / बारिश", icon: CloudRainIcon },
];

export default function TimeOfDayBar() {
  const timeOfDay = useWeatherStore((s) => s.timeOfDay);
  const autoCycle = useWeatherStore((s) => s.autoCycle);
  const headlights = useWeatherStore((s) => s.headlights);
  const setTimeOfDay = useWeatherStore((s) => s.setTimeOfDay);
  const setAutoCycle = useWeatherStore((s) => s.setAutoCycle);
  const toggleHeadlights = useWeatherStore((s) => s.toggleHeadlights);

  // Auto cycle timer if enabled
  useEffect(() => {
    if (!autoCycle) return;
    const moodOrder: TimeOfDay[] = ["morning", "noon"];
    const interval = setInterval(() => {
      const curIdx = moodOrder.indexOf(useWeatherStore.getState().timeOfDay);
      const nextIdx = (curIdx + 1) % moodOrder.length;
      setTimeOfDay(moodOrder[nextIdx]);
    }, 28000); // cycle every 28s
    return () => clearInterval(interval);
  }, [autoCycle, setTimeOfDay]);

  return (
    <div className="pointer-events-auto fixed top-4 left-1/2 z-40 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-neutral-950/80 px-3 py-1.5 shadow-2xl backdrop-blur-md select-none">
      {/* Mood Buttons */}
      {MOODS.map((m) => {
        const Icon = m.icon;
        const active = timeOfDay === m.id && !autoCycle;
        return (
          <button
            key={m.id}
            onClick={() => {
              setAutoCycle(false);
              setTimeOfDay(m.id);
            }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all ${
              active
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 shadow-md shadow-amber-500/20 scale-105"
                : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{m.hindi}</span>
            <span className="hidden sm:inline text-[10px] opacity-75">({m.label})</span>
          </button>
        );
      })}

      <div className="h-4 w-px bg-neutral-700/60 mx-1" />

      {/* Auto-Cycle Button */}
      <button
        onClick={() => setAutoCycle(!autoCycle)}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
          autoCycle
            ? "bg-emerald-500/20 border border-emerald-400 text-emerald-300"
            : "text-neutral-400 hover:text-neutral-200"
        }`}
        title="Automatically cycles between Sunny Morning and Rainy Noon"
      >
        <SparklesIcon className="h-3 w-3" />
        <span className="text-[11px]">Auto</span>
      </button>

      {/* Headlights Toggle */}
      <button
        onClick={toggleHeadlights}
        className={`flex items-center gap-1 rounded-full p-1.5 text-xs transition-all ${
          headlights
            ? "bg-yellow-400 text-neutral-950 shadow-sm shadow-yellow-400/30"
            : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
        }`}
        title="Toggle Headlights (L)"
      >
        <LightbulbIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
