"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Drive 🚌" },
  { href: "/playlists", label: "Playlists 📼" },
  { href: "/songs", label: "100 Songs 📻" },
  { href: "/about", label: "About 📖" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-3 z-40 px-3 sm:px-6 w-full flex justify-center pointer-events-none select-none">
      <nav className="glass-pill pointer-events-auto rounded-full p-1.5 shadow-2xl flex items-center gap-1 sm:gap-2">
        {/* Brand Lockup */}
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/5 transition"
        >
          <span className="text-base">🚌</span>
          <span className="font-bold tracking-tight text-xs sm:text-sm text-amber-100 hidden xs:inline">
            <span className="text-amber-400">bus-driver</span>
            <span className="text-amber-200/70 font-light">-nostalgic</span>
          </span>
        </Link>

        <div className="h-4 w-px bg-white/10 mx-0.5" />

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative rounded-full px-3 py-1 text-xs sm:text-sm font-medium transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-r from-amber-500 to-orange-400 text-neutral-950 font-bold shadow-md shadow-amber-500/25 scale-[1.02]"
                    : "text-amber-100/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
