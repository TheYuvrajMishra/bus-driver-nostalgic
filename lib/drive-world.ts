/**
 * Shared per-frame world state, written by RoadChunkManager and read by
 * PropInstances. Module-level (not React state) — zero re-render cost.
 */
export interface ChunkTransform {
  /** Car-space position of the chunk group's origin. */
  px: number;
  py: number;
  pz: number;
  /** Car-space yaw of the chunk group (rotation.y). */
  ry: number;
}

class DriveWorld {
  /** Currently live chunk indices, oldest → newest. */
  live: number[] = [];
  /** Chunk index the camera is inside. */
  cur = 0;
  /** Car-space transform per live chunk. */
  transforms = new Map<number, ChunkTransform>();
}

export const driveWorld = new DriveWorld();
