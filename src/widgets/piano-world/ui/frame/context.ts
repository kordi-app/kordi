import type { PlayerSim } from "../../engine/player";
import type { RegionDef } from "../../engine/regions";
import type { StepEffectsApi } from "../step-effects";
import type { WorldEvents } from "../world-types";

/**
 * One frame of the world, as each region's step sees it (world.tsx builds it
 * and calls the steps in order). The steps in this folder each own one
 * region's or one feature's per-frame rules; world.tsx only sequences them.
 */
export interface FrameContext {
  /** my Kordi (mutable: a step may move, launch or place it) */
  s: PlayerSim;
  /** seconds since the last frame (capped) */
  dt: number;
  /** the scene clock, seconds */
  now: number;
  region: RegionDef;
  events: WorldEvents;
  /** sparkles, ripples, confetti… (null until mounted) */
  fx: StepEffectsApi | null;
}
