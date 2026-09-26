import type { Metadata } from "next";

export const metadata: Metadata = { title: "Playlists — bus-driver-nostalgic" };

export default function PlaylistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
