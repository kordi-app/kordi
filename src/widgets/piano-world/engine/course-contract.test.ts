import { describe, expect, it } from "vitest";
import { COURSES, LIFT_AMPLITUDE, type CourseId } from "./course";
import { COURSE_CLIMBS, COURSE_FLOOR_HEIGHT, FIRST_STEP_Y } from "./course-contract";
import { EMOTES } from "./interactables";
import { REGION_IDS } from "./regions";
import { BELL, BELL_REACH } from "./island";
import { isle } from "./dream-sea";
import { WORLD_CONTRACT } from "./world-contract";

/*
 * The server's numbers come from world-contract.json, the same file the server
 * reads (CI checks the two repos' copies match). When one of these fails, the
 * client drifted from the contract: fix the client, or change the contract in
 * both repos on purpose.
 */
const SERVER_TIMER = WORLD_CONTRACT.course;
const SERVER_COURSES: Record<string, { goalY: number }> = WORLD_CONTRACT.course.courses;
const SERVER_REGIONS = WORLD_CONTRACT.regions;
const SERVER_EMOTES = WORLD_CONTRACT.emotes;

const courseIds = Object.keys(COURSES) as CourseId[];

describe("jump courses match the server's CourseTimer / Course", () => {
  it("has exactly the server's courses", () => {
    expect(courseIds.toSorted()).toEqual(Object.keys(SERVER_COURSES).toSorted());
  });

  it("stands on a floor the server reads as the floor", () => {
    expect(COURSE_FLOOR_HEIGHT).toBeLessThan(SERVER_TIMER.floorY);
  });

  it.each(courseIds)("%s: climbing onto the first step starts the server's clock", (id) => {
    const steps = COURSES[id].platforms.filter((p) => p.kind !== "goal");
    expect(Math.min(...steps.map((p) => p.y))).toBeGreaterThanOrEqual(SERVER_TIMER.startY);
    expect(FIRST_STEP_Y).toBeGreaterThanOrEqual(SERVER_TIMER.startY);
  });

  it.each(courseIds)("%s: keeps the player inside the server's course area", (id) => {
    const { bounds, start } = COURSES[id];
    expect(bounds.x).toBeLessThanOrEqual(SERVER_TIMER.areaX);
    expect(bounds.zMin).toBeGreaterThanOrEqual(SERVER_TIMER.areaZMin);
    expect(bounds.zMax).toBeLessThanOrEqual(SERVER_TIMER.areaZMax);
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
    const finishLine = SERVER_COURSES[id].goalY - SERVER_TIMER.goalTolerance;
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

describe("the secrets' spots match what the server checks", () => {
  it("the midnight bell: standing by it on the roof is within the server's reach", () => {
    const { bell } = WORLD_CONTRACT;
    expect([BELL.x, BELL.z]).toEqual([bell.x, bell.z]);
    expect(BELL_REACH).toBeLessThanOrEqual(bell.reach);
    expect(BELL.y).toBeGreaterThanOrEqual(bell.minY);
  });

  it("the whale's summit: anywhere on it is within the server's reach", () => {
    const { whale } = WORLD_CONTRACT;
    const summit = isle("summit");
    expect([summit.x, summit.z]).toEqual([whale.x, whale.z]);
    expect(summit.r).toBeLessThanOrEqual(whale.reach);
    expect(summit.top).toBeGreaterThanOrEqual(whale.minY);
  });
});
