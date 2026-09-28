import type { Metadata } from "next";

export const metadata: Metadata = { title: "About — bus-driver-nostalgic" };

export default function AboutPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-amber-100">About</h1>
      <p className="max-w-2xl text-amber-200/70">
        A nostalgia radio where the hero visual is a drive, not a photo. Built
        step by step: persistent audio first, then the road, then the world.
        See the <code className="text-amber-300">documentation/</code> folder in
        the repo for the full spec.
      </p>
    </div>
  );
}
