import { wrapAngle } from "../../engine/physics";
import type { Landing } from "../../engine/player";
import type { FrameContext } from "./context";

const SPARKLE = "#ffe9a8";
/** a sparkle left behind this often while drifting */
const SPARK_EVERY = 0.45;
/** the lazy twirl when you're not steering, radians per second */
const TWIRL = 0.9;

export interface DriftFrame {
  /** drifting last frame */
  on: boolean;
  /** the trail's next sparkle (scene clock) */
  sparkAt: number;
}

export const createDriftFrame = (): DriftFrame => ({ on: false, sparkAt: 0 });

/**
 * Drifting down from the sky island (the physics is in player.ts): a soft
 * chime to start and to land, a trail of sparkles, and a lazy twirl.
 */
export function stepDriftFrame(ctx: FrameContext, state: DriftFrame, landing: Landing | null, steering: boolean) {
  const { s, now, dt, events, fx } = ctx;
  if (s.drifting !== state.on) {
    state.on = s.drifting;
    if (state.on) {
      events.onVoice("crystal", 88, 0.35);
      state.sparkAt = now;
    } else if (landing?.drifted) {
      fx?.ripple(s.pos.x, s.pos.y, s.pos.z, SPARKLE);
      events.onVoice("harp", 72, 0.45);
    }
  }
  if (!state.on) return;
  if (now >= state.sparkAt) {
    state.sparkAt = now + SPARK_EVERY;
    fx?.notes(s.pos.x, s.pos.y, s.pos.z, SPARKLE);
  }
  if (!steering) s.heading = wrapAngle(s.heading + dt * TWIRL);
}
