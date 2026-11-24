import { SPAWN } from "./layout";

/**
 * The cat's secret. The dream sea's portal is always open, but nothing shows
 * where it is and walking over it does nothing: you have to sit (emote) on
 * that one spot of meadow for a moment. The only one who knows is the cat —
 * every so often it wanders off the keys, out to the spot, sits there and
 * looks up at the sky. Sit beside it and you're through.
 *
 * The cat's walks run on the wall clock, so everyone on the island sees the
 * same walk at the same time.
 */

/** The spot: an unremarkable stretch of open meadow south of the keys (nothing tall between it and the camera, so you can see the cat sit) */
export const SECRET_SPOT = { x: -11, z: 30 };
/** How close to it you must sit */
export const SECRET_REACH = 1.1;
/** ...and for how long */
export const SECRET_SIT_SECONDS = 2.5;

/** The cat goes for a walk once every this many seconds… */
export const CAT_WALK_PERIOD = 8 * 60;
/** …sets out at the start of the period and sits at the spot until this far in… */
const SIT_UNTIL = 75;
/** …walking at this speed (a trot; Kordi walks at 4.2) */
export const CAT_WALK_SPEED = 2.2;
/** Where it waits on the keys */
export const CAT_HOME = { x: SPAWN.x, z: 1.2 };

const tripSeconds = Math.hypot(SECRET_SPOT.x - CAT_HOME.x, SECRET_SPOT.z - CAT_HOME.z) / CAT_WALK_SPEED;

export type CatPlan = { kind: "home" } | { kind: "out"; x: number; z: number; sitting: boolean };

/**
 * Where the cat should be at wall-clock time `nowMs`: at home on the keys
 * (wandering as it likes), or out on its walk — heading for the spot, sitting
 * on it, or trotting back.
 */
export function catPlan(nowMs: number): CatPlan {
  const t = (nowMs / 1000) % CAT_WALK_PERIOD;
  const along = (k: number) => ({
    x: CAT_HOME.x + (SECRET_SPOT.x - CAT_HOME.x) * k,
    z: CAT_HOME.z + (SECRET_SPOT.z - CAT_HOME.z) * k,
  });
  if (t < tripSeconds) return { kind: "out", ...along(t / tripSeconds), sitting: false };
  if (t < SIT_UNTIL) return { kind: "out", ...SECRET_SPOT, sitting: true };
  if (t < SIT_UNTIL + tripSeconds) return { kind: "out", ...along(1 - (t - SIT_UNTIL) / tripSeconds), sitting: false };
  return { kind: "home" };
}

/**
 * Sitting on the spot (feet on the ground) at clock time `now` (seconds): true
 * once you've sat there long enough. Timed by the clock, not summed frame
 * deltas — those are capped per frame, so a slow device would wait far longer.
 */
export function sitOnSpot(timer: { since: number | null }, x: number, z: number, sitting: boolean, grounded: boolean, now: number) {
  const on = sitting && grounded && Math.hypot(x - SECRET_SPOT.x, z - SECRET_SPOT.z) < SECRET_REACH;
  if (!on) {
    timer.since = null;
    return false;
  }
  timer.since ??= now;
  return now - timer.since >= SECRET_SIT_SECONDS;
}
