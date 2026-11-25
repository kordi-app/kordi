import { SPAWN } from "./layout";

/**
 * The cat's secret. The dream sea's portal is always open, but nothing shows
 * where it is and walking over it does nothing: you have to sit (emote) on
 * that one spot of meadow for a moment. The only one who knows is the cat —
 * pet it three times and it takes you there: it wanders off the keys, out to
 * the spot, sits there looking up at the sky a while, and comes home. Sit
 * beside it and you're through.
 *
 * The walk is yours alone: it happens on your screen (the cat isn't shared),
 * so someone else beside you sees it stay on the keys.
 */

/** The spot: an unremarkable stretch of open meadow south of the keys (nothing tall between it and the camera, so you can see the cat sit) */
export const SECRET_SPOT = { x: -11, z: 30 };
/** How close to it you must sit */
export const SECRET_REACH = 1.1;
/** ...and for how long */
export const SECRET_SIT_SECONDS = 2.5;

/** Pet the cat this many times and it shows you the way */
export const PETS_TO_FOLLOW = 3;
/** Out at the spot, it sits this long before trotting home */
export const CAT_SIT_SECONDS = 60;
/** …walking at this speed (a trot; Kordi walks at 4.2) */
export const CAT_WALK_SPEED = 2.2;
/** Where it waits on the keys */
export const CAT_HOME = { x: SPAWN.x, z: 1.2 };

const tripSeconds = Math.hypot(SECRET_SPOT.x - CAT_HOME.x, SECRET_SPOT.z - CAT_HOME.z) / CAT_WALK_SPEED;

export type CatPlan = { kind: "home" } | { kind: "out"; x: number; z: number; sitting: boolean };

/** The whole walk: out, sitting, and back */
export const CAT_WALK_SECONDS = tripSeconds * 2 + CAT_SIT_SECONDS;

/**
 * Where the cat should be at `nowMs`, for a walk that set out at `walkedAt`
 * (null: no walk): at home on the keys (wandering as it likes), or out on its
 * walk — heading for the spot, sitting on it, or trotting back.
 */
export function catPlan(walkedAt: number | null, nowMs: number): CatPlan {
  if (walkedAt === null) return { kind: "home" };
  const t = (nowMs - walkedAt) / 1000;
  if (t < 0) return { kind: "home" };
  const sitUntil = tripSeconds + CAT_SIT_SECONDS;
  const along = (k: number) => ({
    x: CAT_HOME.x + (SECRET_SPOT.x - CAT_HOME.x) * k,
    z: CAT_HOME.z + (SECRET_SPOT.z - CAT_HOME.z) * k,
  });
  if (t < tripSeconds) return { kind: "out", ...along(t / tripSeconds), sitting: false };
  if (t < sitUntil) return { kind: "out", ...SECRET_SPOT, sitting: true };
  if (t < sitUntil + tripSeconds) return { kind: "out", ...along(1 - (t - sitUntil) / tripSeconds), sitting: false };
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
