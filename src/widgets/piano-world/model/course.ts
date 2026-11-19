/**
 * "Cloud Keys" — the hidden jump course. A climb of floating keys seen
 * side-on (like classic 2D jump maps). Steps are solid: you land on their
 * tops, bump your head on their undersides and can't walk through their sides.
 *
 * Laps run left→right on the front row and right→left on a back row, so no
 * step ever sits directly above another within jumping reach — a solid step
 * overhead would otherwise make the climb impossible.
 *
 * Tuned to the player's jump: v=7.5, g=22 → apex ≈ 1.28, ~0.68 s airborne,
 * ~2.9 units of travel at walking speed. Steps rise 0.7 and sit 2.25 apart
 * (edge gaps under 1.0), checked so every overhead step leaves ≥ 2.2 headroom.
 */

export interface Platform {
  x: number;
  /** top surface height */
  y: number;
  z: number;
  width: number;
  depth: number;
  /** note played on landing; climbing plays a rising scale */
  midi: number;
  kind: "white" | "black" | "rest" | "goal";
  /**
   * Terrain that does something:
   * - slide: drifts side to side (you ride along while standing on it)
   * - crumble: wobbles when stood on, then drops away for a few seconds
   * - bounce: a trampoline that launches you on landing
   */
  behavior?: "slide" | "crumble" | "bounce";
}

const BEHAVIORS: Record<number, Platform["behavior"]> = {
  5: "slide",
  13: "slide",
  21: "slide",
  10: "crumble",
  18: "crumble",
  12: "bounce",
};

export const SLIDE_AMPLITUDE = 0.45;
const SLIDE_PERIOD = 3.2;
export const CRUMBLE_DELAY = 0.7;
export const CRUMBLE_DOWN_TIME = 3;
export const BOUNCE_BOOST = 1.6;

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const STEPS = 26;
const RISE = 0.7;
const RUN = 2.25;
/** columns per lap before the path turns onto the other row */
const SWEEP = 8;
const FRONT_Z = 0;
const BACK_Z = -2.6;

function scaleNote(step: number) {
  return 48 + Math.floor(step / 7) * 12 + C_MAJOR[step % 7]; // from C3 upward
}

function buildCourse(): Platform[] {
  const platforms: Platform[] = [];
  for (let i = 0; i < STEPS; i++) {
    const lap = Math.floor(i / SWEEP);
    const column = i % SWEEP;
    const forward = lap % 2 === 0;
    // reverse laps start one step in from the landing, so nothing sits right above it
    const half = ((SWEEP - 1) * RUN) / 2;
    const x = forward ? -half + column * RUN : half - (column + 1) * RUN;
    const isTurn = column === SWEEP - 1;
    // every 4th step is a narrow black key; the turns are wide landings that
    // span both rows, so you can walk across to the next lap
    const kind: Platform["kind"] = isTurn ? "rest" : i % 4 === 3 ? "black" : "white";
    platforms.push({
      x,
      y: 0.8 + i * RISE,
      z: isTurn ? (FRONT_Z + BACK_Z) / 2 : forward ? FRONT_Z : BACK_Z,
      width: kind === "rest" ? 2.2 : kind === "black" ? 0.8 : 1.3,
      depth: kind === "rest" ? BACK_Z * -1 + 1.6 : kind === "black" ? 1.2 : 1.6,
      midi: scaleNote(i),
      kind,
      behavior: BEHAVIORS[i],
    });
  }
  const last = platforms[platforms.length - 1];
  const lastForward = Math.floor((STEPS - 1) / SWEEP) % 2 === 0;
  platforms.push({
    x: last.x + (lastForward ? 1 : -1) * RUN * 1.35,
    y: last.y + RISE,
    z: last.z,
    width: 3.2,
    depth: 2.6,
    midi: scaleNote(STEPS) + 12,
    kind: "goal",
  });
  return platforms;
}

export const COURSE: readonly Platform[] = buildCourse();
export const GOAL_INDEX = COURSE.length - 1;
export const COURSE_TOP = COURSE[GOAL_INDEX].y;

/** Key slab thickness, plus the dark case under it (both solid). */
export const PLATFORM_THICKNESS = 0.32;
export const CASE_THICKNESS = 0.22;
const SOLID_DEPTH = PLATFORM_THICKNESS + CASE_THICKNESS;

/** Kordi's collision body (the model is drawn at 1.6×). */
export const PLAYER_RADIUS = 0.42;
export const PLAYER_HEIGHT = 1.9;

/** How high you can step up without jumping (curbs, not ledges). */
const STEP_UP = 0.35;
/** You can stand with part of your feet over the edge */
const FOOT_RADIUS = PLAYER_RADIUS * 0.6;

/**
 * Live state of the (single) course scene: the clock that drives sliding
 * platforms and which crumbling ones are down. Written by the scene's frame
 * loop, read by collision here and by the renderer — one source of truth.
 */
export const courseRuntime = {
  time: 0,
  /** index → time it started wobbling */
  crumbling: new Map<number, number>(),
  /** index → time it comes back */
  fallenUntil: new Map<number, number>(),
};

/** Sliding offset of platform `i` at time `t` (0 for platforms that don't move). */
export function slideOffset(i: number, t: number = courseRuntime.time) {
  if (COURSE[i].behavior !== "slide") return 0;
  return Math.sin((t / SLIDE_PERIOD) * Math.PI * 2 + i) * SLIDE_AMPLITUDE;
}

/** Advance crumbles: wobbling ones fall after the delay, fallen ones return. */
export function updateCrumbles(t: number) {
  for (const [i, since] of courseRuntime.crumbling) {
    if (t - since > CRUMBLE_DELAY) {
      courseRuntime.crumbling.delete(i);
      courseRuntime.fallenUntil.set(i, t + CRUMBLE_DOWN_TIME);
    }
  }
  for (const [i, until] of courseRuntime.fallenUntil) {
    if (t > until) courseRuntime.fallenUntil.delete(i);
  }
}

/** Standing on a crumbling platform sets it wobbling (once). */
export function touchCrumble(i: number, t: number) {
  if (COURSE[i].behavior !== "crumble") return;
  if (courseRuntime.crumbling.has(i) || courseRuntime.fallenUntil.has(i)) return;
  courseRuntime.crumbling.set(i, t);
}

const isDown = (i: number) => courseRuntime.fallenUntil.has(i);

const bottomOf = (p: Platform) => p.y - SOLID_DEPTH;

function overlaps(i: number, x: number, z: number, radius: number) {
  const p = COURSE[i];
  return (
    Math.abs(x - (p.x + slideOffset(i))) < p.width / 2 + radius && Math.abs(z - p.z) < p.depth / 2 + radius
  );
}

/**
 * What you're standing on at (x, z) given your current height: the highest
 * platform top you could reach without jumping, or the cloud floor (y = 0).
 */
export function courseGround(x: number, z: number, y: number): { height: number; index: number | null } {
  let best = { height: 0, index: null as number | null };
  COURSE.forEach((p, index) => {
    if (isDown(index)) return;
    if (overlaps(index, x, z, FOOT_RADIUS) && p.y <= y + STEP_UP && p.y > best.height) {
      best = { height: p.y, index };
    }
  });
  return best;
}

/** Would a body at (x, y, z) intersect a platform it can't simply step onto? */
export function courseBlocked(x: number, z: number, y: number): boolean {
  return COURSE.some(
    (p, i) =>
      !isDown(i) &&
      overlaps(i, x, z, PLAYER_RADIUS) &&
      p.y > y + STEP_UP && // too high to step onto
      y + PLAYER_HEIGHT > bottomOf(p), // and not entirely above our head
  );
}

/**
 * Rising from `fromY` to `toY`: the underside you'd hit first, as the
 * highest feet height you can reach (null if the way up is clear).
 */
export function courseCeiling(x: number, z: number, fromY: number, toY: number): number | null {
  let limit: number | null = null;
  for (let i = 0; i < COURSE.length; i++) {
    const p = COURSE[i];
    if (isDown(i) || !overlaps(i, x, z, PLAYER_RADIUS * 0.8)) continue;
    const headroom = bottomOf(p) - PLAYER_HEIGHT;
    if (headroom >= fromY - 1e-3 && headroom < toY && (limit === null || headroom < limit)) {
      limit = headroom;
    }
  }
  return limit;
}

export const COURSE_BOUNDS = { x: 12, zMin: -4.5, zMax: 4 };
export const COURSE_START = { x: -6, z: 2.6 };
