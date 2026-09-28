import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import Link from "next/link";

export const metadata: Metadata = { title: "About — bus-driver-nostalgic" };

export default function AboutPage() {
  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden">
      <SiteNav />

      <main className="mx-auto max-w-4xl px-4 py-8 pb-36 space-y-6">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="glass-reflection pointer-events-none absolute inset-0 opacity-25" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-mono font-semibold text-amber-300 uppercase tracking-widest">
              <span>📖</span> Concept & Philosophy
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-amber-100">
              Bus-Driver Nostalgic
            </h1>
            <p className="text-sm sm:text-base text-amber-200/80 leading-relaxed">
              Always-on Indian nostalgia radio with an interactive 3D cartoon highway drive, real-time lighting transitions, authentic bus horns, and an analog radio tuner playing 100 timeless 80s-90s Bollywood classics.
            </p>

            <div className="pt-4 grid gap-4 sm:grid-cols-2">
              <div className="glass-panel rounded-2xl p-4 border-amber-500/20">
                <h3 className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-2">
                  <span>📻</span> 100-Track Analog Jukebox
                </h3>
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  Every track starts 60s in, transitioning seamlessly with analog radio static. Dashboard smartphone mockup keeps the radio playing even when minimized.
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-4 border-amber-500/20">
                <h3 className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-2">
                  <span>📯</span> Iconic Musical Horns
                </h3>
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  Tata & Ashok Leyland air horns, Naagin, Tip Tip Barsa, and Dhoom Machale tuned for highway driving nostalgia.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 px-5 py-2.5 text-sm font-bold text-neutral-950 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:scale-105 active:scale-95 ring-1 ring-white/30"
              >
                <span>🚌</span>
                <span>Enter Drive Mode</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
