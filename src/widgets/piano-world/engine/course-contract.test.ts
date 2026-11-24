import { describe, expect, it } from "vitest";
import { COURSES, LIFT_AMPLITUDE, type CourseId } from "./course";
import { COURSE_CLIMBS, COURSE_FLOOR_HEIGHT, FIRST_STEP_Y } from "./course-contract";
import { EMOTES } from "./interactables";
import { REGION_IDS } from "./regions";

/*
 * The server lives in a separate repo, so its numbers are copied here by hand.
 * When one of these fails, either the client drifted (fix the client) or the
 * server changed on purpose (update the copy below, and course-contract.ts).
 */

// kordi server src/main/java/com/kordi_api/world/CourseTimer.java
const SERVER_TIMER = {
  /** CourseTimer.AREA_X */
  AREA_X: 12.5,
  /** CourseTimer.AREA_Z_MIN */
  AREA_Z_MIN: -7,
  /** CourseTimer.AREA_Z_MAX */
  AREA_Z_MAX: 4.5,
  /** CourseTimer.FLOOR_Y */
  FLOOR_Y: 0.3,
  /** CourseTimer.START_Y */
  START_Y: 0.5,
  /** CourseTimer.track: `y < goalY - 0.05` is not yet a finish */
  GOAL_TOLERANCE: 0.05,
};

// kordi server src/main/java/com/kordi_api/course/entity/Course.java — enum Course(region, goalY, minMillis)
const SERVER_COURSES: Record<string, { goalY: number }> = {
  /** Course.CLOUDS */
  clouds: { goalY: 19.0 },
  /** Course.NIGHT */
  night: { goalY: 17.3 },
  /** Course.RUINS */
  ruins: { goalY: 24.8 },
};

// kordi server src/main/java/com/kordi_api/world/WorldLobby.java
/** WorldLobby.REGIONS */
const SERVER_REGIONS = ["hall", "neon", "cathedral", "lounge", "clouds", "night", "ruins", "whale", "cave"];
/** WorldLobby.EMOTES */
const SERVER_EMOTES = ["wave", "clap", "dance", "sit"];

const courseIds = Object.keys(COURSES) as CourseId[];

describe("jump courses match the server's CourseTimer / Course", () => {
  it("has exactly the server's courses", () => {
    expect(courseIds.toSorted()).toEqual(Object.keys(SERVER_COURSES).toSorted());
  });

  it("stands on a floor the server reads as the floor", () => {
    expect(COURSE_FLOOR_HEIGHT).toBeLessThan(SERVER_TIMER.FLOOR_Y);
  });

  it.each(courseIds)("%s: climbing onto the first step starts the server's clock", (id) => {
    const steps = COURSES[id].platforms.filter((p) => p.kind !== "goal");
    expect(Math.min(...steps.map((p) => p.y))).toBeGreaterThanOrEqual(SERVER_TIMER.START_Y);
    expect(FIRST_STEP_Y).toBeGreaterThanOrEqual(SERVER_TIMER.START_Y);
  });

  it.each(courseIds)("%s: keeps the player inside the server's course area", (id) => {
    const { bounds, start } = COURSES[id];
    expect(bounds.x).toBeLessThanOrEqual(SERVER_TIMER.AREA_X);
    expect(bounds.zMin).toBeGreaterThanOrEqual(SERVER_TIMER.AREA_Z_MIN);
    expect(bounds.zMax).toBeLessThanOrEqual(SERVER_TIMER.AREA_Z_MAX);
    expect(Math.abs(start.x)).toBeLessThanOrEqual(bounds.x);
    expect(start.z).toBeGreaterThanOrEqual(bounds.zMin);
    expect(start.z).toBeLessThanOrEqual(bounds.zMax);
  });

  it.each(courseIds)("%s: the summit is the server's goal height", (id) => {
    const course = COURSES[id];
    const goal = course.platforms[course.goalIndex];
    const { goalY } = SERVER_COURSES[id];
    expect(goal.kind).toBe("goal");
    expect(goal.y).toBeCloseTo(goalY, 6);
    const { steps, rise } = COURSE_CLIMBS[id];
    expect(FIRST_STEP_Y + steps * rise).toBeCloseTo(goalY, 6);
  });

  it.each(courseIds)("%s: only the summit counts as a finish", (id) => {
    const course = COURSES[id];
    const finishLine = SERVER_COURSES[id].goalY - SERVER_TIMER.GOAL_TOLERANCE;
    course.platforms.forEach((p, i) => {
      // rising debris counts at the top of its rise: riding it must not finish the run
      const highest = p.y + (p.behavior === "lift" ? LIFT_AMPLITUDE : 0);
      if (i === course.goalIndex) expect(p.y).toBeGreaterThanOrEqual(finishLine);
      else expect(highest).toBeLessThan(finishLine);
    });
  });
});

describe("world ids match the server's WorldLobby", () => {
  it("regions", () => {
    expect([...REGION_IDS].toSorted()).toEqual(SERVER_REGIONS.toSorted());
  });

  it("emotes", () => {
    expect([...EMOTES].toSorted()).toEqual(SERVER_EMOTES.toSorted());
  });
});
