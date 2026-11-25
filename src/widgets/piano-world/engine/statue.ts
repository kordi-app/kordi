import type { Solid } from "./terrain";

/**
 * The dreaming statue. Deep in the island's north-east wood, in a round
 * clearing ringed by old standing stones, a mossy stone Kordi sits asleep,
 * hugging a small harp. In front of it lies a round flat stone, polished like
 * a mirror. Sit on it the way the statue sits (the sit emote) and its light
 * fills; when it is full the statue opens its eyes, and you are inside what
 * it was dreaming of: the music box (music-box.ts).
 *
 * Nothing tells you to sit. The only hints are the statue's own pose and the
 * empty seat facing it.
 *
 * Pure data + state; ui/island/dreaming-statue.tsx draws it.
 */

/** The statue, in the middle of its clearing */
export const STATUE = { x: 76, z: -44 };
/** Trees and undergrowth keep this far from it */
export const STATUE_CLEARING = 9.5;
/**
 * A gap in the wood leading up to the clearing from the drum valley, on the
 * camera's side: it's how you notice there is something in there, and it keeps
 * trunks from standing between the camera and the mirror stone.
 */
export const STATUE_GLADE = { x0: STATUE.x - 3.2, x1: STATUE.x + 3.2, z0: STATUE.z, z1: -18 };

/** What the statue sits on */
export const PLINTH = { r: 1.9, top: 0.9 };

/**
 * The mirror stone: on the camera side of the statue (+z), so you sit facing
 * it and can see both. Low enough to walk onto, and wide enough that its rim
 * (where its light fills) shows all round whoever sits on it.
 */
export const MIRROR_STONE = { x: STATUE.x, z: STATUE.z + 4.6, r: 1.7, top: 0.14 };
/** Sit (grounded) within this distance of its middle: anywhere on the stone */
export const MIRROR_REACH = MIRROR_STONE.r;
/** ...for this long, and the statue wakes */
export const MIRROR_SIT_SECONDS = 2;
/** Its eyes stay open this long before you're taken into the dream */
export const STATUE_WAKE_SECONDS = 0.9;

/** Coming back out of the dream you stand in front of the mirror stone, clear of it (so nothing starts again by itself) */
export const STATUE_ARRIVAL = { x: STATUE.x, z: MIRROR_STONE.z + MIRROR_STONE.r + 1.6 };

export interface StandingStone {
  x: number;
  z: number;
  r: number;
  height: number;
  /** leaning this much (radians), this way (radians round y) */
  lean: number;
  turn: number;
}

const RING_RADIUS = 7.2;
const RING_COUNT = 11;
/**
 * The ring: old stones at even angles round the statue, each a little
 * different, with the arc on the camera's side (+z) left open — that is the
 * way in, and a stone there would stand between you and the camera.
 */
export const STANDING_STONES: readonly StandingStone[] = Array.from({ length: RING_COUNT }, (_, i) => {
  const angle = (i / RING_COUNT) * Math.PI * 2;
  const wobble = (k: number) => {
    const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return {
    // angle 0 is due south (+z): i = 0 is the middle of the gap
    x: STATUE.x + Math.sin(angle) * RING_RADIUS,
    z: STATUE.z + Math.cos(angle) * RING_RADIUS,
    r: 0.55 + wobble(1) * 0.2,
    height: 2.4 + wobble(2) * 1.5,
    lean: (wobble(3) - 0.5) * 0.24,
    turn: wobble(4) * Math.PI,
    angle,
  };
})
  .filter((stone) => Math.cos(stone.angle) < 0.55)
  .map(({ x, z, r, height, lean, turn }) => ({ x, z, r, height, lean, turn }));

export const STATUE_SOLIDS: readonly Solid[] = [
  // the plinth and the statue on it: one tall round thing you walk round
  { foot: { shape: "circle", x: STATUE.x, z: STATUE.z, r: PLINTH.r }, top: 6, bottom: -1 },
  ...STANDING_STONES.map((s): Solid => ({ foot: { shape: "circle", x: s.x, z: s.z, r: s.r }, top: s.height, bottom: -1 })),
  // the mirror stone: a low step you stand (and sit) on
  { foot: { shape: "circle", x: MIRROR_STONE.x, z: MIRROR_STONE.z, r: MIRROR_STONE.r }, top: MIRROR_STONE.top, bottom: -1 },
];

// ── sitting out the dream ────────────────────────────────────────────────────

/** What the renderer reads every frame (written by stepStatue) */
export const statueRuntime = {
  /** how full the mirror stone's light is, 0–1 */
  progress: 0,
  /** when the statue opened its eyes (the clock given to stepStatue; +∞: asleep, so "seconds since" is never positive) */
  wokenAt: Infinity,
};

export interface StatueSit {
  /** sitting on the mirror stone since (null: not sitting there) */
  since: number | null;
  /** the clock at the last step (null: none yet): a long gap means the frames were paused */
  seenAt: number | null;
  /** the statue woke at (null: it hasn't, this sit) */
  wokenAt: number | null;
  /** this sit has already sent you off: nothing more until you stand up */
  done: boolean;
}

export const createStatueSit = (): StatueSit => ({ since: null, seenAt: null, wokenAt: null, done: false });

/**
 * Frames further apart than this were paused (the world scrolled out of view
 * stops drawing, but the clock runs on): a sit doesn't count across the gap.
 */
const PAUSE_GAP = 0.5;

/** A fresh arrival on the island: no half-finished sit carries over, and the statue is asleep */
export function resetStatue(sit: StatueSit) {
  sit.since = null;
  sit.seenAt = null;
  sit.wokenAt = null;
  sit.done = false;
  statueRuntime.progress = 0;
  statueRuntime.wokenAt = Infinity;
}

/**
 * One frame by the statue. Sitting (the emote) with your feet on the mirror
 * stone fills its light over MIRROR_SIT_SECONDS; standing up, stepping off or
 * jumping empties it at once. When it's full the statue wakes ("woke": its
 * eyes open, a chime), and a moment later you go ("go": into the music box,
 * asked for every frame until you've gone) — once woken it takes you even if
 * you stand up.
 *
 * Timed by the clock `now` (seconds), not summed frame deltas — those are
 * capped per frame, so a slow device would wait far longer.
 */
export function stepStatue(
  sit: StatueSit,
  x: number,
  z: number,
  sitting: boolean,
  grounded: boolean,
  now: number,
): "woke" | "go" | null {
  const paused = sit.seenAt !== null && now - sit.seenAt > PAUSE_GAP;
  sit.seenAt = now;
  // woken: the dream takes you, whatever you do now. "go" repeats every frame
  // until you're gone (resetStatue, on the next arrival): a trip asked for while
  // another fade was still running is refused, and must be asked for again
  if (sit.wokenAt !== null) {
    if (now - sit.wokenAt < STATUE_WAKE_SECONDS) return null;
    sit.done = true;
    return "go";
  }
  if (paused) sit.since = null;
  const on = sitting && grounded && Math.hypot(x - MIRROR_STONE.x, z - MIRROR_STONE.z) < MIRROR_REACH;
  if (!on) {
    sit.since = null;
    sit.done = false;
    statueRuntime.progress = 0;
    return null;
  }
  if (sit.done) return null;
  sit.since ??= now;
  statueRuntime.progress = Math.min(1, (now - sit.since) / MIRROR_SIT_SECONDS);
  if (statueRuntime.progress < 1) return null;
  sit.wokenAt = now;
  statueRuntime.wokenAt = now;
  return "woke";
}
