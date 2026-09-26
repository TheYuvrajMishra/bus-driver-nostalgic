import type { Metadata } from "next";
import NowPlaying from "@/components/audio/NowPlaying";

export const metadata: Metadata = { title: "Drive — bus-driver-nostalgic" };

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-amber-100">
        Desi Highway Radio <span className="text-amber-400">+ Driving Game</span>
      </h1>
      <p className="max-w-2xl text-amber-200/70">
        Always-on Indian nostalgia radio. The hero of this page will soon be a
        live, playable cartoon highway seen through the driver&apos;s eyes —
        while the same radio keeps playing underneath.
      </p>
      <NowPlaying />
    </div>
  );
}
