import {
  BELL_GONE,
  bellPhase,
  burning,
  courseRuntime,
  slideOffset,
  tickCourse,
  tickDragon,
  touchCrumble,
  type CourseDef,
} from "../../engine/course";
import type { FrameContext } from "./context";

/** Knocked back by dragon fire: this fast sideways (with the flames) and up. */
const BURN_PUSH = 5.5;
const BURN_HOP = 4.5;
/** After a burn you can't be caught again for this long. */
const BURN_GRACE = 1.2;

export interface CourseFrame {
  /** dragon fire can't catch you again until then (course clock) */
  burnUntil: number;
}

export const createCourseFrame = (): CourseFrame => ({ burnUntil: 0 });

/**
 * A jump course, before anything moves: ride a sliding step, run the
 * course's clock (moving, crumbling and vanishing steps), toll the temple
 * bell as its stones go, and let the dragon roar and burn.
 */
export function stepCourseBefore(ctx: FrameContext, course: CourseDef, state: CourseFrame) {
  const { s, now, events, fx } = ctx;
  // ride along on a sliding platform (before anything else moves)
  if (!s.airborne && s.platform !== null) {
    s.pos.x += slideOffset(course, s.platform, now) - slideOffset(course, s.platform, courseRuntime.time);
  }
  const before = courseRuntime.time;
  tickCourse(course, now);
  // the temple bell tolls as each set of bell stones goes (two sets, half a cycle apart)
  if (course.platforms.some((p) => p.behavior === "bell")) {
    for (const parity of [0, 1]) {
      const from = bellPhase(parity, before);
      const to = bellPhase(parity, now);
      const crossed = from < 1 - BELL_GONE && to >= 1 - BELL_GONE && to - from < 0.5;
      if (crossed) events.onVoice("bell", parity ? 45 : 50, 0.55);
    }
  }
  if (tickDragon(course, now, s.pos.x, s.pos.y)) events.onDragon("roar");
  if (now > state.burnUntil && burning(course, s.pos.x, s.pos.y)) {
    // knocked back with the flames: off your step, usually down one or two
    const dir = courseRuntime.breath?.dir ?? 1;
    s.vx = dir * BURN_PUSH;
    s.vy = BURN_HOP;
    s.airborne = true;
    s.jumped = true;
    s.springing = true;
    state.burnUntil = now + BURN_GRACE;
    events.onDragon("burn");
    fx?.dust(s.pos.x, s.pos.y, s.pos.z);
  }
}

/** Standing on a crumbling step sets it going. */
export function stepCourseAfter(ctx: FrameContext, course: CourseDef) {
  const { s, now } = ctx;
  if (!s.airborne && s.platform !== null) touchCrumble(course, s.platform, now);
}
