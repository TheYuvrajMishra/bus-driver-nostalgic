import type { Metadata } from "next";
import DriveScene from "@/components/drive/DriveScene";

export const metadata: Metadata = { title: "Drive — bus-driver-nostalgic" };

export default function HomePage() {
  return <DriveScene />;
}
