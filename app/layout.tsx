import type { Metadata } from "next";
import "./globals.css";
import PersistentPlayer from "@/components/audio/PersistentPlayer";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "bus-driver-nostalgic",
  description: "Always-on Indian nostalgia radio with a playable cartoon highway.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      {/* PersistentPlayer is mounted here, at the root, exactly once.
          It is NOT inside any page or per-route layout, so the <audio>
          element survives client-side navigation (architecture.md §8). */}
      <body className="min-h-full bg-[#150803] text-amber-50">
        <SiteNav />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">{children}</main>
        <PersistentPlayer />
      </body>
    </html>
  );
}
