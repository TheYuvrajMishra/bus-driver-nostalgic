import type { Metadata } from "next";

export const metadata: Metadata = { title: "Playlists — bus-driver-nostalgic" };

export default function PlaylistsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-amber-100">Playlists</h1>
      <p className="max-w-2xl text-amber-200/70">
        Time-of-day rotations (Highway Raat / Subah Nikaas / Dhaba Classics /
        Sunset Chill) land here in a later step. The player below keeps running
        while you browse.
      </p>
    </div>
  );
}
