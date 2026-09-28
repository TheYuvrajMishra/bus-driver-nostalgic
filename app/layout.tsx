import type { Metadata } from "next";
import "./globals.css";
import PersistentPlayer from "@/components/audio/PersistentPlayer";
import RadioEngine from "@/components/audio/RadioEngine";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "bus-driver-nostalgic",
  description: "Always-on Indian nostalgia radio with a playable cartoon highway.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      {/* RadioEngine owns playback (hidden YouTube playlist + legacy
          fallback). It is NOT inside any page or per-route layout, so the
          player survives client-side navigation (architecture.md §8). */}
      <body className="min-h-full bg-[#150803] text-amber-50">
        <SiteNav />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">{children}</main>
        <RadioEngine />
        <PersistentPlayer />
      </body>
    </html>
  );
}
