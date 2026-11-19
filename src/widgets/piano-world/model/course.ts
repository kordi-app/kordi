/**
 * "Cloud Keys" — the hidden jump course. A zig-zag climb of floating keys,
 * laid out on a wall facing the camera so the whole route reads at a glance
 * (side-on, like classic 2D jump maps). Falling just drops you to whatever is
 * below; the only way up is to climb again.
 *
 * Tuned to the player's jump: v=7.5, g=22 → apex ≈ 1.28 high, ~0.68 s airborne,
 * ~2.9 units of travel at walking speed. Steps rise 0.8 and sit ≤ 2.3 apart.
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
const RISE = 0.8;
const RUN = 2.25;
/** columns per sweep before the path turns back */
const SWEEP = 8;

function scaleNote(step: number) {
  return 48 + Math.floor(step / 7) * 12 + C_MAJOR[step % 7]; // from C3 upward
}

function buildCourse(): Platform[] {
  const platforms: Platform[] = [];
  for (let i = 0; i < STEPS; i++) {
    const lap = Math.floor(i / SWEEP);
    const column = i % SWEEP;
    const direction = lap % 2 === 0 ? 1 : -1;
    const x = direction * (-((SWEEP - 1) * RUN) / 2 + column * RUN);
    const isTurn = column === SWEEP - 1;
    // every 4th step is a narrow black key; the turns are wide resting spots
    const kind: Platform["kind"] = isTurn ? "rest" : i % 4 === 3 ? "black" : "white";
    platforms.push({
      x,
      y: 0.8 + i * RISE,
      z: kind === "black" ? -0.35 : 0,
      width: kind === "rest" ? 2.2 : kind === "black" ? 0.75 : 1.3,
      depth: kind === "black" ? 1.2 : 1.8,
      midi: scaleNote(i),
      kind,
    });
  }
  const last = platforms[platforms.length - 1];
  platforms.push({
    x: last.x + (Math.floor((STEPS - 1) / SWEEP) % 2 === 0 ? 1 : -1) * RUN * 1.1,
    y: last.y + RISE,
    z: 0,
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

/** Platform thickness (visual only — collision uses the top surface). */
export const PLATFORM_THICKNESS = 0.32;

/** How high you can step up without jumping (curbs, not ledges). */
const STEP_UP = 0.35;

/**
 * What you're standing on at (x, z) given your current height: the highest
 * platform top you could reach without jumping, or the cloud floor (y = 0).
 */
export function courseGround(x: number, z: number, y: number): { height: number; index: number | null } {
  let best = { height: 0, index: null as number | null };
  COURSE.forEach((p, index) => {
    if (
      Math.abs(x - p.x) <= p.width / 2 &&
      Math.abs(z - p.z) <= p.depth / 2 &&
      p.y <= y + STEP_UP &&
      p.y > best.height
    ) {
      best = { height: p.y, index };
    }
  });
  return best;
}

export const COURSE_BOUNDS = { x: 12, zMin: -2, zMax: 4 };
export const COURSE_START = { x: -6, z: 2.6 };
