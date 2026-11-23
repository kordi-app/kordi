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
 * - ruins ("Storm Temple"): the hardest — narrow stone steps, debris that rises
 *   and sinks, and bell stones that vanish each time the temple bell tolls
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
   * - lift: floating debris that rises and sinks (you ride it; jump off at the right height)
   * - bell: solid between tolls of the temple bell, gone for a moment on each toll;
   *   neighbouring bell stones toll half a cycle apart, so one always holds
   */
  behavior?: "slide" | "crumble" | "bounce" | "lift" | "bell";
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
  /** storm temple: a dragon that breathes fire across the height you're climbing at */
  dragon?: DragonDef;
}

/**
 * The storm temple's dragon. Every `every` seconds it picks the height you're
 * at, roars (a red line marks the band for `warn` seconds), then a wall of fire
 * sweeps across the band, side to side, over `sweep` seconds. Caught in it, you
 * are knocked back — usually down a step or two, never straight to the floor.
 */
export interface DragonDef {
  every: number;
  warn: number;
  sweep: number;
  /** half-height of the burning band */
  band: number;
  /** half-width of the wall of fire */
  wall: number;
}

/** The dragon's current attack, if any: where the band is and when it began. */
export interface Breath {
  /** where you were when it roared: the fire sweeps past here */
  x: number;
  /** centre height of the band */
  y: number;
  /** roar time; fire starts at roar + warn */
  at: number;
  /** +1 sweeps left → right, −1 right → left */
  dir: 1 | -1;
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
/** Rising debris: ± this much around its place in the climb, once per LIFT_PERIOD. */
export const LIFT_AMPLITUDE = 0.9;
const LIFT_PERIOD = 4;
/** The temple bell: one toll per stone every BELL_PERIOD; the stone is gone for the last BELL_GONE of it. */
export const BELL_PERIOD = 2.4;
export const BELL_GONE = 0.38;
/** …and shudders for this long (fraction of the period) before it goes, as a warning. */
export const BELL_WARN = 0.16;

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

function defineCourse(id: CourseId, layout: LayoutOptions, beams?: readonly Beam[], dragon?: DragonDef): CourseDef {
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
    dragon,
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
  // the hardest: narrow stone, and every lap mixes rising debris, bell stones and
  // crumbling steps. A lift always follows a steady step, so you can wait for it.
  ruins: defineCourse("ruins", {
    ...COURSE_CLIMBS.ruins,
    baseNote: 50, // D3 upward, in D dorian's colours over the C-major steps
    whiteWidth: 1.15,
    behaviors: {
      1: "slide", 2: "bell", 3: "bell", 5: "lift",
      9: "crumble", 10: "bell", 11: "bell", 13: "lift", 14: "crumble",
      17: "slide", 18: "bell", 19: "bell", 21: "lift", 22: "crumble",
      // the last lift sits low enough that its peak stays under the finish line
      25: "bell", 26: "bell", 28: "lift", 29: "crumble",
    },
  }, undefined, { every: 9, warn: 1.6, sweep: 1.4, band: 1.3, wall: 0.9 }),
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
  /** the previous frame's time: fire is tested over the whole stretch it swept since then */
  prevTime: 0,
  /** index → time it started wobbling */
  crumbling: new Map<number, number>(),
  /** index → time it comes back */
  fallenUntil: new Map<number, number>(),
  /** index → time its light runs out (night course) */
  litUntil: new Map<number, number>(),
  /** the dragon's attack in progress (storm temple), and when the next one comes */
  breath: null as Breath | null,
  nextBreath: 0,
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
    courseRuntime.breath = null;
    courseRuntime.nextBreath = t + (course.dragon?.every ?? 0);
  }
  courseRuntime.prevTime = courseRuntime.time;
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

/** After you leave the floor, the dragon waits at least this long before its first attack. */
const DRAGON_FIRST_WAIT = 3;

/** The fire sweeps this far either side of where you were when the dragon roared. */
export const FIRE_REACH = 10;

/**
 * Drive the dragon (call each frame after tickCourse): when an attack is due,
 * aim it at `playerY` — but not while you're still on the floor, and never at
 * the summit. Returns the new breath on the frame it roars (for the sound).
 */
export function tickDragon(course: CourseDef, t: number, playerX: number, playerY: number): Breath | null {
  const dragon = course.dragon;
  if (!dragon) return null;
  const { breath } = courseRuntime;
  if (breath && t > breath.at + dragon.warn + dragon.sweep) courseRuntime.breath = null;
  if (courseRuntime.breath || t < courseRuntime.nextBreath) return null;
  const summit = course.platforms[course.goalIndex].y;
  courseRuntime.nextBreath = t + dragon.every;
  if (playerY < FIRST_STEP_Y || playerY > summit - 1) {
    // nothing to aim at; once you start climbing you get a few seconds before it comes
    courseRuntime.nextBreath = t + DRAGON_FIRST_WAIT;
    return null;
  }
  const next: Breath = { x: playerX, y: playerY + 0.9, at: t, dir: Math.floor(t) % 2 === 0 ? 1 : -1 };
  courseRuntime.breath = next;
  return next;
}

/** Where the wall of fire is now (x), or null while the dragon is still roaring / done. */
export function fireX(course: CourseDef, t: number = courseRuntime.time): number | null {
  const { breath } = courseRuntime;
  const dragon = course.dragon;
  if (!breath || !dragon) return null;
  const k = (t - breath.at - dragon.warn) / dragon.sweep;
  if (k < 0 || k > 1) return null;
  return sweepX(breath, k);
}

/** The wall's x at sweep progress k (0–1): from behind you, past you, and on. */
const sweepX = (breath: Breath, k: number) => breath.x + breath.dir * FIRE_REACH * (2 * k - 1);

/**
 * Did the fire pass over a body at (x, y) since the last frame? (y = feet; the
 * band covers your body.) Tested over the whole stretch the wall swept, not
 * just where it is now: it crosses the course in under a second and a half,
 * so on a slow frame it would otherwise jump clean over you.
 */
export function burning(course: CourseDef, x: number, y: number): boolean {
  const { breath, prevTime, time } = courseRuntime;
  const dragon = course.dragon;
  if (!breath || !dragon || Math.abs(y + PLAYER_HEIGHT / 2 - breath.y) >= dragon.band) return false;
  const progress = (t: number) => Math.min(1, Math.max(0, (t - breath.at - dragon.warn) / dragon.sweep));
  const k0 = progress(Math.max(prevTime, breath.at));
  const k1 = progress(time);
  if (k1 <= 0 || k0 >= 1 || k1 <= k0) return false;
  const [from, to] = [sweepX(breath, k0), sweepX(breath, k1)].sort((a, b) => a - b);
  return x > from - dragon.wall && x < to + dragon.wall;
}

/** Height offset of platform `i` at time `t` (0 for platforms that don't rise and sink). */
export function liftOffset(course: CourseDef, i: number, t: number = courseRuntime.time) {
  if (course.platforms[i].behavior !== "lift") return 0;
  return Math.sin((t / LIFT_PERIOD) * Math.PI * 2 + i * 1.7) * LIFT_AMPLITUDE;
}

/** Where a bell stone is in its cycle, 0–1; the toll (and its vanishing) is at the end. */
export function bellPhase(i: number, t: number = courseRuntime.time) {
  const phase = t / BELL_PERIOD + (i % 2) * 0.5;
  return phase - Math.floor(phase);
}

/** Is bell stone `i` gone right now? (Always false for other platforms.) */
export function bellGone(course: CourseDef, i: number, t: number = courseRuntime.time) {
  return course.platforms[i].behavior === "bell" && bellPhase(i, t) >= 1 - BELL_GONE;
}

/** Top of platform `i` right now (debris rises and sinks). */
export const topOf = (course: CourseDef, i: number) => course.platforms[i].y + liftOffset(course, i);

/** Standing on a crumbling platform sets it wobbling (once). */
export function touchCrumble(course: CourseDef, i: number, t: number) {
  if (course.platforms[i].behavior !== "crumble") return;
  if (courseRuntime.crumbling.has(i) || courseRuntime.fallenUntil.has(i)) return;
  courseRuntime.crumbling.set(i, t);
}

/** Can you stand on / collide with platform `i` right now? */
export function isSolid(course: CourseDef, i: number) {
  if (courseRuntime.fallenUntil.has(i)) return false;
  if (bellGone(course, i)) return false;
  if (!course.beams || alwaysLit(course.platforms[i])) return true;
  return (courseRuntime.litUntil.get(i) ?? -Infinity) > courseRuntime.time;
}

const bottomOf = (course: CourseDef, i: number) => topOf(course, i) - SOLID_DEPTH;

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
  course.platforms.forEach((_, index) => {
    if (!isSolid(course, index)) return;
    const top = topOf(course, index);
    if (overlaps(course, index, x, z, FOOT_RADIUS) && top <= y + STEP_UP && top > best.height) {
      best = { height: top, index };
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
      if (!isSolid(course, i) || topOf(course, i) <= y + STEP_UP || y + PLAYER_HEIGHT <= bottomOf(course, i)) return;
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
    (_, i) =>
      isSolid(course, i) &&
      overlaps(course, i, x, z, PLAYER_RADIUS) &&
      topOf(course, i) > y + STEP_UP && // too high to step onto
      y + PLAYER_HEIGHT > bottomOf(course, i), // and not entirely above our head
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
  course.platforms.forEach((_, i) => {
    if (!isSolid(course, i) || !overlaps(course, i, x, z, PLAYER_RADIUS * 0.8)) return;
    const headroom = bottomOf(course, i) - PLAYER_HEIGHT;
    if (headroom >= fromY - 1e-3 && headroom < toY && (limit === null || headroom < limit)) {
      limit = headroom;
    }
  });
  return limit;
}
