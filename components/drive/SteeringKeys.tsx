"use client";

import { useEffect } from "react";
import { steeringInput } from "@/lib/steering-input";

/**
 * Attaches keyboard steering listeners: ArrowLeft/ArrowRight or A/D.
 * Per design.md §3, arrows ALWAYS steer (seek lives on dedicated buttons).
 */
export default function SteeringKeys() {
  useEffect(() => {
    const set = (code: string, down: boolean) => {
      if (code === "ArrowLeft" || code === "KeyA") steeringInput.left = down;
      else if (code === "ArrowRight" || code === "KeyD") steeringInput.right = down;
      else return false;
      return true;
    };
    const onDown = (e: KeyboardEvent) => {
      if (set(e.code, true)) {
        // Don't scroll the page while steering.
        if (e.code === "ArrowLeft" || e.code === "ArrowRight") e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => set(e.code, false);
    const onBlur = () => {
      steeringInput.left = false;
      steeringInput.right = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
  return null;
}
