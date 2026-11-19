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
}

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

const bottomOf = (p: Platform) => p.y - SOLID_DEPTH;

function overlaps(p: Platform, x: number, z: number, radius: number) {
  return Math.abs(x - p.x) < p.width / 2 + radius && Math.abs(z - p.z) < p.depth / 2 + radius;
}

/**
 * What you're standing on at (x, z) given your current height: the highest
 * platform top you could reach without jumping, or the cloud floor (y = 0).
 */
export function courseGround(x: number, z: number, y: number): { height: number; index: number | null } {
  let best = { height: 0, index: null as number | null };
  COURSE.forEach((p, index) => {
    if (overlaps(p, x, z, FOOT_RADIUS) && p.y <= y + STEP_UP && p.y > best.height) {
      best = { height: p.y, index };
    }
  });
  return best;
}

/** Would a body at (x, y, z) intersect a platform it can't simply step onto? */
export function courseBlocked(x: number, z: number, y: number): boolean {
  return COURSE.some(
    (p) =>
      overlaps(p, x, z, PLAYER_RADIUS) &&
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
  for (const p of COURSE) {
    if (!overlaps(p, x, z, PLAYER_RADIUS * 0.8)) continue;
    const headroom = bottomOf(p) - PLAYER_HEIGHT;
    if (headroom >= fromY - 1e-3 && headroom < toY && (limit === null || headroom < limit)) {
      limit = headroom;
    }
  }
  return limit;
}

export const COURSE_BOUNDS = { x: 12, zMin: -4.5, zMax: 4 };
export const COURSE_START = { x: -6, z: 2.6 };
