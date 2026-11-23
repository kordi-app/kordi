/**
 * The jump-course numbers the SERVER also relies on. The server times course
 * runs itself from the positions we send, so these must stay in step with it:
 *
 * - kordi server src/main/java/com/kordi_api/world/CourseTimer.java
 *     AREA_X / AREA_Z_MIN / AREA_Z_MAX — a run is void once you leave this area;
 *       it is a little wider than our {@link COURSE_BOUNDS}, which clamp the player.
 *     FLOOR_Y (0.3) — below it you are on the floor: the run resets.
 *     START_Y (0.5) — after touching the floor, rising to this starts the clock.
 *   So our floor ({@link COURSE_FLOOR_HEIGHT}) must sit below FLOOR_Y and the
 *   first step ({@link FIRST_STEP_Y}) at or above START_Y.
 * - kordi server src/main/java/com/kordi_api/course/entity/Course.java
 *     one enum constant per course, keyed by region name (= {@link CourseId}),
 *     with goalY (reaching goalY − 0.05 finishes) and minMillis.
 *   goalY is our summit's top: FIRST_STEP_Y + steps × rise (see {@link COURSE_CLIMBS}).
 *
 * Changing anything here means changing the server too. course-contract.test.ts
 * pins the server's current numbers and fails when the two drift apart.
 */

/** Also the region name of the course and the server's Course.region(). */
export type CourseId = "clouds" | "night" | "ruins";

/** Height of the floor the courses stand on (server: below FLOOR_Y). */
export const COURSE_FLOOR_HEIGHT = 0;

/** Top of the first step (server: at or above START_Y, so climbing onto it starts the clock). */
export const FIRST_STEP_Y = 0.8;

/**
 * How each course climbs: `steps` keys, each `rise` above the last, then the
 * summit one more `rise` up. The summit's top is the server's Course.goalY.
 */
export const COURSE_CLIMBS: Record<CourseId, { steps: number; rise: number }> = {
  clouds: { steps: 26, rise: 0.7 },
  night: { steps: 22, rise: 0.75 },
  ruins: { steps: 30, rise: 0.8 },
};

/**
 * Where the player is clamped on a course (server area: CourseTimer.AREA_*).
 * `zMin` is the default back edge; a course whose summit reaches further back
 * extends it to fit (see defineCourse in course.ts) — still inside AREA_Z_MIN.
 */
export const COURSE_BOUNDS = { x: 12, zMin: -4.5, zMax: 4 } as const;

/** Where you arrive on a course: on the floor, in front of the first step. */
export const COURSE_START = { x: -6, z: 2.6 } as const;
