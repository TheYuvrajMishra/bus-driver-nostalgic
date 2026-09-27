import type { Metadata } from "next";
import "./globals.css";
import PersistentPlayer from "@/components/audio/PersistentPlayer";
import RadioEngine from "@/components/audio/RadioEngine";


export const metadata: Metadata = {
  title: "bus-driver-nostalgic",
  description: "Always-on Indian nostalgia radio with a playable cartoon highway.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full w-full overflow-hidden antialiased">
      {/* RadioEngine owns playback (hidden YouTube playlist + legacy
          fallback). It is NOT inside any page or per-route layout, so the
          player survives client-side navigation (architecture.md §8). */}
      <body className="h-full w-full overflow-hidden bg-[#150803] text-amber-50">
        <main className="h-full w-full">{children}</main>
        <RadioEngine />
        <PersistentPlayer />
      </body>
    </html>
  );
}
