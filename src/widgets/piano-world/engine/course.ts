/**
 * Jump courses: climbs of floating keys seen side-on (like classic 2D jump
 * maps). Steps are solid: you land on their tops, bump your head on their
 * undersides and can't walk through their sides.
 *
 * Laps run left→right on the front row and right→left on a back row, so no
 * step ever sits directly above another within jumping reach — a solid step
 * overhead would otherwise make the climb impossible.
 *
 * Tuned to the player's jump: v=7.5, g=22 → apex ≈ 1.28, ~0.68 s airborne,
 * ~2.9 units of travel at walking speed. Layouts are checked offline so every
 * overhead step leaves ≥ 2.2 headroom and consecutive edge gaps stay ≤ 1.4.
 *
 * - clouds ("Cloud Keys"): daytime; some steps slide, crumble or bounce
 * - night ("Night Keys"): steps only exist while a sweeping searchlight is on them
 */

import {
  COURSE_BOUNDS,
  COURSE_CLIMBS,
  COURSE_FLOOR_HEIGHT,
  COURSE_START,
  FIRST_STEP_Y,
  type CourseId,
} from "./course-contract";

// The server times runs on these courses: the numbers it shares live in course-contract.ts.
export type { CourseId } from "./course-contract";

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

/** A searchlight sweeping left and right across the course. */
export interface Beam {
  /** centre x swings ±amplitude around 0 */
  amplitude: number;
  period: number;
  phase: number;
  /** full width of the lit band */
  width: number;
}

export interface CourseDef {
  id: CourseId;
  platforms: readonly Platform[];
  goalIndex: number;
  start: { x: number; z: number };
  bounds: { x: number; zMin: number; zMax: number };
  /** night course: steps are solid only while lit (rest steps and the goal always are) */
  beams?: readonly Beam[];
}

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** columns per lap before the path turns onto the other row */
const SWEEP = 8;
const RUN = 2.25;
const FRONT_Z = 0;
const BACK_Z = -2.6;

/** The summit: wide enough for a treasure up front and a portal behind it. */
const GOAL_WIDTH = 6;
const GOAL_DEPTH = 4.6;
/** Gap from the last step's centre to the summit's near edge (unchanged jump). */
const GOAL_NEAR_EDGE = RUN * 1.35 - 1.6;
/** How far the summit's front edge sits in front of the last step's row centre. */
const GOAL_FRONT_OVERHANG = 1.3;

export const SLIDE_AMPLITUDE = 0.45;
const SLIDE_PERIOD = 3.2;
export const CRUMBLE_DELAY = 0.7;
export const CRUMBLE_DOWN_TIME = 3;
export const BOUNCE_BOOST = 1.6;
/** A step stays solid this long after the light leaves it — a fair grace window. */
export const LIGHT_GRACE = 0.4;

function scaleNote(step: number, base: number) {
  return base + Math.floor(step / 7) * 12 + C_MAJOR[step % 7];
}

interface LayoutOptions {
  steps: number;
  rise: number;
  baseNote: number;
  /** wider steps for the dark course, where judging an edge is harder */
  whiteWidth: number;
  behaviors?: Record<number, Platform["behavior"]>;
}

function buildPlatforms({ steps, rise, baseNote, whiteWidth, behaviors = {} }: LayoutOptions): Platform[] {
  const platforms: Platform[] = [];
  const half = ((SWEEP - 1) * RUN) / 2;
  for (let i = 0; i < steps; i++) {
    const lap = Math.floor(i / SWEEP);
    const column = i % SWEEP;
    const forward = lap % 2 === 0;
    // reverse laps start one step in from the landing, so nothing sits right above it
    const x = forward ? -half + column * RUN : half - (column + 1) * RUN;
    const isTurn = column === SWEEP - 1;
    // every 4th step is a narrow black key; the turns are wide landings that
    // span both rows, so you can walk across to the next lap
    const kind: Platform["kind"] = isTurn ? "rest" : i % 4 === 3 ? "black" : "white";
    platforms.push({
      x,
      y: FIRST_STEP_Y + i * rise,
      z: isTurn ? (FRONT_Z + BACK_Z) / 2 : forward ? FRONT_Z : BACK_Z,
      width: kind === "rest" ? 2.2 : kind === "black" ? 0.8 : whiteWidth,
      depth: kind === "rest" ? -BACK_Z + 1.6 : kind === "black" ? 1.2 : 1.6,
      midi: scaleNote(i, baseNote),
      kind,
      behavior: behaviors[i],
    });
  }
  // The goal is a wide summit: the treasure up front, the exit portal at the
  // back. Its near edge keeps the same jump from the last step; it grows away
  // from that step and backward (away from the camera).
  const last = platforms[platforms.length - 1];
  const lastForward = Math.floor((steps - 1) / SWEEP) % 2 === 0;
  platforms.push({
    x: last.x + (lastForward ? 1 : -1) * (GOAL_NEAR_EDGE + GOAL_WIDTH / 2),
    y: last.y + rise,
    z: last.z + GOAL_FRONT_OVERHANG - GOAL_DEPTH / 2,
    width: GOAL_WIDTH,
    depth: GOAL_DEPTH,
    midi: scaleNote(steps, baseNote) + 12,
    kind: "goal",
  });
  return platforms;
}

function defineCourse(id: CourseId, layout: LayoutOptions, beams?: readonly Beam[]): CourseDef {
  const platforms = buildPlatforms(layout);
  const goal = platforms[platforms.length - 1];
  return {
    id,
    platforms,
    goalIndex: platforms.length - 1,
    start: { x: COURSE_START.x, z: COURSE_START.z },
    // reach the back of the summit, where the portal stands
    bounds: {
      x: COURSE_BOUNDS.x,
      zMin: Math.min(COURSE_BOUNDS.zMin, goal.z - goal.depth / 2 - 0.4),
      zMax: COURSE_BOUNDS.zMax,
    },
    beams,
  };
}

/** Where things stand on the summit: the treasure up front, the exit portal at the back. */
export function goalSpots(course: CourseDef) {
  const goal = course.platforms[course.goalIndex];
  return {
    treasure: { x: goal.x, y: goal.y, z: goal.z + goal.depth / 2 - 1.1 },
    portal: { x: goal.x, y: goal.y, z: goal.z - goal.depth / 2 + 1.1 },
  };
}

export const COURSES: Record<CourseId, CourseDef> = {
  clouds: defineCourse("clouds", {
    ...COURSE_CLIMBS.clouds,
    baseNote: 48, // C3 upward
    whiteWidth: 1.3,
    behaviors: { 5: "slide", 13: "slide", 21: "slide", 10: "crumble", 18: "crumble", 12: "bounce" },
  }),
  // two lights at different speeds, so a lit path comes round within a few seconds
  night: defineCourse("night", { ...COURSE_CLIMBS.night, baseNote: 57, whiteWidth: 1.45 }, [
    // slow enough to ride: from a landing, roughly 2 in 5 departures make it to the next one
    { amplitude: 9, period: 11, phase: 0, width: 5.5 },
    { amplitude: 9, period: 15, phase: Math.PI, width: 4.5 },
  ]),
};

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
 * Live state of the active course scene: the clock that drives sliding steps
 * and searchlights, which crumbling steps are down, and when each step was
 * last lit. Written by the frame loop, read by collision here and by the
 * renderer — one source of truth. Reset whenever a different course opens.
 */
export const courseRuntime = {
  courseId: null as CourseId | null,
  time: 0,
  /** index → time it started wobbling */
  crumbling: new Map<number, number>(),
  /** index → time it comes back */
  fallenUntil: new Map<number, number>(),
  /** index → time its light runs out (night course) */
  litUntil: new Map<number, number>(),
};

/** Centre x of a beam at time t. */
export function beamX(beam: Beam, t: number) {
  return Math.sin((t / beam.period) * Math.PI * 2 + beam.phase) * beam.amplitude;
}

/** The searchlight lamps hang this far above the goal. */
export const BEAM_LAMP_ABOVE = 7;
/** The shaft is a cone: at the floor it is this much wider than at the goal. */
const BEAM_SPREAD = 0.5;

/**
 * Full width of a beam's lit band at height y. `beam.width` at the goal,
 * widening linearly toward the floor (and narrowing up to the lamp) — the
 * renderer draws exactly this cone.
 */
export function beamWidthAt(course: CourseDef, beam: Beam, y: number) {
  const top = course.platforms[course.goalIndex].y;
  return beam.width * (1 + (BEAM_SPREAD * (top - y)) / top);
}

/** 0–1: how strongly the brightest beam covers (x, y) (1 at its centre, 0 outside). */
export function beamLight(course: CourseDef, x: number, y: number, t: number) {
  let light = 0;
  for (const beam of course.beams ?? []) {
    light = Math.max(light, 1 - Math.abs(x - beamX(beam, t)) / (beamWidthAt(course, beam, y) / 2));
  }
  return light;
}

/** Rest landings and the goal carry their own lanterns: always lit. */
export const alwaysLit = (p: Platform) => p.kind === "rest" || p.kind === "goal";

/** Call each frame with the active course and the shared clock. */
export function tickCourse(course: CourseDef, t: number) {
  if (courseRuntime.courseId !== course.id) {
    courseRuntime.courseId = course.id;
    courseRuntime.crumbling.clear();
    courseRuntime.fallenUntil.clear();
    courseRuntime.litUntil.clear();
  }
  courseRuntime.time = t;

  for (const [i, since] of courseRuntime.crumbling) {
    if (t - since > CRUMBLE_DELAY) {
      courseRuntime.crumbling.delete(i);
      courseRuntime.fallenUntil.set(i, t + CRUMBLE_DOWN_TIME);
    }
  }
  for (const [i, until] of courseRuntime.fallenUntil) {
    if (t > until) courseRuntime.fallenUntil.delete(i);
  }
  if (course.beams) {
    course.platforms.forEach((p, i) => {
      if (beamLight(course, p.x, p.y, t) > 0) courseRuntime.litUntil.set(i, t + LIGHT_GRACE);
    });
  }
}

/** Sliding offset of platform `i` at time `t` (0 for platforms that don't move). */
export function slideOffset(course: CourseDef, i: number, t: number = courseRuntime.time) {
  if (course.platforms[i].behavior !== "slide") return 0;
  return Math.sin((t / SLIDE_PERIOD) * Math.PI * 2 + i) * SLIDE_AMPLITUDE;
}

/** Standing on a crumbling platform sets it wobbling (once). */
export function touchCrumble(course: CourseDef, i: number, t: number) {
  if (course.platforms[i].behavior !== "crumble") return;
  if (courseRuntime.crumbling.has(i) || courseRuntime.fallenUntil.has(i)) return;
  courseRuntime.crumbling.set(i, t);
}

/** Can you stand on / collide with platform `i` right now? */
export function isSolid(course: CourseDef, i: number) {
  if (courseRuntime.fallenUntil.has(i)) return false;
  if (!course.beams || alwaysLit(course.platforms[i])) return true;
  return (courseRuntime.litUntil.get(i) ?? -Infinity) > courseRuntime.time;
}

const bottomOf = (p: Platform) => p.y - SOLID_DEPTH;

function overlaps(course: CourseDef, i: number, x: number, z: number, radius: number) {
  const p = course.platforms[i];
  return (
    Math.abs(x - (p.x + slideOffset(course, i))) < p.width / 2 + radius &&
    Math.abs(z - p.z) < p.depth / 2 + radius
  );
}

/**
 * What you're standing on at (x, z) given your current height: the highest
 * platform top you could reach without jumping, or the floor (y = 0).
 */
export function courseGround(
  course: CourseDef,
  x: number,
  z: number,
  y: number,
): { height: number; index: number | null } {
  let best = { height: COURSE_FLOOR_HEIGHT, index: null as number | null };
  course.platforms.forEach((p, index) => {
    if (!isSolid(course, index)) return;
    if (overlaps(course, index, x, z, FOOT_RADIUS) && p.y <= y + STEP_UP && p.y > best.height) {
      best = { height: p.y, index };
    }
  });
  return best;
}

/**
 * Push a body out of any step it ended up inside, the shortest way out.
 * courseBlocked only stops you walking *into* a step; steps can also come to
 * you — a sliding step drifts into you, a crumbled one respawns, a dark one
 * gets lit, or you clip an edge on the way down — and once inside, every move
 * is blocked. Call every frame after moving.
 */
export function courseDepenetrate(course: CourseDef, x: number, z: number, y: number): { x: number; z: number } {
  const SKIN = 1e-3;
  // two passes: getting out of one step can nudge you into a neighbour
  for (let pass = 0; pass < 2; pass++) {
    let moved = false;
    course.platforms.forEach((p, i) => {
      if (!isSolid(course, i) || p.y <= y + STEP_UP || y + PLAYER_HEIGHT <= bottomOf(p)) return;
      const dx = x - (p.x + slideOffset(course, i));
      const dz = z - p.z;
      const overlapX = p.width / 2 + PLAYER_RADIUS - Math.abs(dx);
      const overlapZ = p.depth / 2 + PLAYER_RADIUS - Math.abs(dz);
      if (overlapX <= 0 || overlapZ <= 0) return;
      if (overlapX < overlapZ) x += (dx >= 0 ? 1 : -1) * (overlapX + SKIN);
      else z += (dz >= 0 ? 1 : -1) * (overlapZ + SKIN);
      moved = true;
    });
    if (!moved) break;
  }
  return { x, z };
}

/** Would a body at (x, y, z) intersect a platform it can't simply step onto? */
export function courseBlocked(course: CourseDef, x: number, z: number, y: number): boolean {
  return course.platforms.some(
    (p, i) =>
      isSolid(course, i) &&
      overlaps(course, i, x, z, PLAYER_RADIUS) &&
      p.y > y + STEP_UP && // too high to step onto
      y + PLAYER_HEIGHT > bottomOf(p), // and not entirely above our head
  );
}

/**
 * Rising from `fromY` to `toY`: the underside you'd hit first, as the
 * highest feet height you can reach (null if the way up is clear).
 */
export function courseCeiling(
  course: CourseDef,
  x: number,
  z: number,
  fromY: number,
  toY: number,
): number | null {
  let limit: number | null = null;
  course.platforms.forEach((p, i) => {
    if (!isSolid(course, i) || !overlaps(course, i, x, z, PLAYER_RADIUS * 0.8)) return;
    const headroom = bottomOf(p) - PLAYER_HEIGHT;
    if (headroom >= fromY - 1e-3 && headroom < toY && (limit === null || headroom < limit)) {
      limit = headroom;
    }
  });
  return limit;
}
