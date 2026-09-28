"use client";

import { useEffect } from "react";
import { steeringInput } from "@/lib/steering-input";

/**
 * Attaches keyboard driving listeners:
 * - Steer: ArrowLeft / ArrowRight, or A / D
 * - Accelerate: ArrowUp
 * - Brake / Stop: ArrowDown
 *
 * NOTE: W is strictly reserved for wipers, S is unused for driving per spec.
 */
export default function SteeringKeys() {
  useEffect(() => {
    const handleKey = (code: string, down: boolean) => {
      let handled = false;

      // Steering
      if (code === "ArrowLeft" || code === "KeyA") {
        steeringInput.left = down;
        handled = true;
      } else if (code === "ArrowRight" || code === "KeyD") {
        steeringInput.right = down;
        handled = true;
      }

      // Acceleration / Throttle
      if (code === "ArrowUp") {
        steeringInput.throttle = down ? 1.0 : 0.0;
        handled = true;
      }

      // Braking (holds at 0, no reverse)
      if (code === "ArrowDown") {
        steeringInput.brake = down ? 1.0 : 0.0;
        handled = true;
      }

      return handled;
    };

    const onDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT")
      ) {
        return;
      }

      if (handleKey(e.code, true)) {
        // Prevent default browser scrolling for arrow keys
        if (
          e.code === "ArrowLeft" ||
          e.code === "ArrowRight" ||
          e.code === "ArrowUp" ||
          e.code === "ArrowDown"
        ) {
          e.preventDefault();
        }
      }
    };

    const onUp = (e: KeyboardEvent) => {
      handleKey(e.code, false);
    };

    const onBlur = () => {
      steeringInput.left = false;
      steeringInput.right = false;
      steeringInput.throttle = 0;
      steeringInput.brake = 0;
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
