"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Drive" },
  { href: "/playlists", label: "Playlists" },
  { href: "/songs", label: "Songs" },
  { href: "/about", label: "About" },
];

export default function SiteNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-40 border-b border-amber-900/40 bg-[#150803]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
        <span className="mr-4 text-lg font-bold tracking-tight text-amber-100">
          🚌 <span className="text-amber-400">bus-driver</span>
          <span className="text-amber-200/70">-nostalgic</span>
        </span>
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-amber-500/15 text-amber-300"
                  : "text-amber-100/60 hover:text-amber-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
