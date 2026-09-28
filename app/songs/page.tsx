import type { Metadata } from "next";

export const metadata: Metadata = { title: "Songs — bus-driver-nostalgic" };

export default function SongsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-amber-100">Songs</h1>
      <p className="max-w-2xl text-amber-200/70">
        The track list lives here eventually. If the radio was playing on the
        home page, it should still be playing right now — uninterrupted.
      </p>
    </div>
  );
}
