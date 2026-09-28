/**
 * Raw driving and steering inputs — a module-level singleton (not React state) so the
 * per-frame controller can read it with zero re-render cost.
 *
 * Both keyboard and on-screen touch hooks write to this singleton.
 */
export const steeringInput = {
  /** Keyboard held state. */
  left: false,
  right: false,
  /**
   * On-screen wheel drag value in [-1, 1], or null when the wheel is not
   * being dragged. When non-null it wins over keyboard input.
   */
  wheel: null as number | null,

  /** Throttle pedal input in [0, 1] (ArrowUp or future touch pedal) */
  throttle: 0,
  /** Brake pedal input in [0, 1] (ArrowDown or future touch pedal) */
  brake: 0,
};
