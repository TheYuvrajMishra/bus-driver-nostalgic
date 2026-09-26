import type { Metadata } from "next";
import DriveScene from "@/components/drive/DriveScene";
import NowPlaying from "@/components/audio/NowPlaying";

export const metadata: Metadata = { title: "Drive — bus-driver-nostalgic" };

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-amber-100">
        Desi Highway Radio <span className="text-amber-400">+ Driving Game</span>
      </h1>
      <DriveScene />
    </div>
  );
}
