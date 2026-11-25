import { beforeEach, describe, expect, it } from "vitest";
import { ISLAND_BOUNDS, ISLAND_SOLIDS, STREAM } from "./island";
import { BUSHES, GRASS, ISLAND_TERRAIN, NATURE_SOLIDS, TREES } from "./nature";
import { groundAt } from "./physics";
import { PORTAL_RADIUS, REGIONS, arrivalPoint, isDrawn, isWalkThrough } from "./regions";
import {
  MIRROR_REACH,
  MIRROR_SIT_SECONDS,
  MIRROR_STONE,
  PLINTH,
  STANDING_STONES,
  STATUE,
  STATUE_ARRIVAL,
  STATUE_CLEARING,
  STATUE_WAKE_SECONDS,
  createStatueSit,
  resetStatue,
  statueRuntime,
  stepStatue,
} from "./statue";
import { terrainBlocked } from "./terrain";

const fromStatue = (p: { x: number; z: number }) => Math.hypot(p.x - STATUE.x, p.z - STATUE.z);

describe("the dreaming statue's clearing", () => {
  it("is in the empty north-east: east of the stream, north of the drum valley, inside the island", () => {
    expect(STATUE.x - STATUE_CLEARING).toBeGreaterThan(STREAM.x + STREAM.width / 2);
    expect(STATUE.z + STATUE_CLEARING).toBeLessThan(-19);
    expect(STATUE.x + STATUE_CLEARING).toBeLessThan(ISLAND_BOUNDS.x);
    expect(STATUE.z - STATUE_CLEARING).toBeGreaterThan(ISLAND_BOUNDS.zMin);
  });

  it("is cleared: no tree or bush in it, and nothing of the island's built there already", () => {
    for (const thing of [...TREES, ...BUSHES]) expect(fromStatue(thing)).toBeGreaterThan(STATUE_CLEARING);
    for (const solid of [...ISLAND_SOLIDS, ...NATURE_SOLIDS]) {
      const f = solid.foot;
      const reach = f.shape === "circle" ? f.r : Math.hypot(f.w, f.d) / 2;
      // (the stream's invisible banks are long boxes; their nearest edge is what matters)
      const gap = f.shape === "circle" ? fromStatue(f) - reach : Math.abs(f.x - STATUE.x) - f.w / 2;
      expect(gap, `solid at ${f.x}, ${f.z}`).toBeGreaterThan(STATUE_CLEARING - 1);
    }
  });

  it("grows no grass through the plinth or the mirror stone", () => {
    for (const tuft of GRASS) {
      expect(fromStatue(tuft)).toBeGreaterThan(PLINTH.r);
      expect(Math.hypot(tuft.x - MIRROR_STONE.x, tuft.z - MIRROR_STONE.z)).toBeGreaterThan(MIRROR_STONE.r);
    }
  });

  it("has a mirror stone you can walk onto, and a plinth and standing stones you can't walk through", () => {
    const hall = REGIONS.hall;
    const onStone = groundAt(hall, MIRROR_STONE.x, MIRROR_STONE.z, 0);
    expect(onStone.height).toBeCloseTo(MIRROR_STONE.top);
    expect(terrainBlocked(ISLAND_TERRAIN, MIRROR_STONE.x, MIRROR_STONE.z, 0)).toBe(false);
    expect(terrainBlocked(ISLAND_TERRAIN, STATUE.x, STATUE.z, 0)).toBe(true);
    expect(STANDING_STONES.length).toBeGreaterThanOrEqual(6);
    for (const stone of STANDING_STONES) expect(terrainBlocked(ISLAND_TERRAIN, stone.x, stone.z, 0)).toBe(true);
  });

  it("puts the mirror stone on the camera's side of the statue, with no standing stone between it and the camera", () => {
    expect(MIRROR_STONE.z).toBeGreaterThan(STATUE.z + PLINTH.r + MIRROR_STONE.r);
    for (const stone of STANDING_STONES) {
      const hides = Math.abs(stone.x - MIRROR_STONE.x) < 3 && stone.z > MIRROR_STONE.z;
      expect(hides, `stone at ${stone.x}, ${stone.z}`).toBe(false);
    }
  });
});

describe("sitting out the statue's dream", () => {
  const sit = createStatueSit();
  beforeEach(() => resetStatue(sit));
  const onStone = (now: number, sitting = true, grounded = true) => stepStatue(sit, MIRROR_STONE.x, MIRROR_STONE.z + 0.3, sitting, grounded, now);

  /** Frame by frame (every 50 ms) from `from` to `to`: what each frame said, in order */
  const frames = (from: number, to: number, sitting = true) => {
    const said: ReturnType<typeof stepStatue>[] = [];
    for (let t = from; t <= to + 1e-9; t += 0.05) said.push(onStone(t, sitting));
    return said;
  };

  it("fills the mirror stone's light while you sit on it, and wakes the statue when it's full", () => {
    // asleep: "seconds since it woke" must never read as positive (the renderer opens its eyes by it)
    expect(10 - statueRuntime.wokenAt).toBeLessThan(0);
    expect(frames(10, 10 + MIRROR_SIT_SECONDS / 2)).not.toContain("woke");
    expect(statueRuntime.progress).toBeCloseTo(0.5, 1);
    const said = frames(10 + MIRROR_SIT_SECONDS / 2 + 0.05, 10 + MIRROR_SIT_SECONDS + 0.05);
    expect(said.filter((x) => x === "woke")).toHaveLength(1);
    expect(statueRuntime.progress).toBe(1);
  });

  it("takes you a moment after it wakes, even if you've stood up by then, and keeps asking till you're gone", () => {
    frames(0, MIRROR_SIT_SECONDS + 0.05);
    const woke = statueRuntime.wokenAt;
    expect(frames(woke + 0.05, woke + STATUE_WAKE_SECONDS / 2, false)).not.toContain("go");
    const after = frames(woke + STATUE_WAKE_SECONDS + 0.05, woke + STATUE_WAKE_SECONDS + 0.5, false);
    // a trip asked for while another fade runs is refused: "go" repeats until the next arrival resets it
    expect(after.every((x) => x === "go")).toBe(true);
    resetStatue(sit);
    expect(frames(20, 20.5)).not.toContain("go");
  });

  it("empties at once when you stand up, and starts from nothing when you sit again", () => {
    frames(0, MIRROR_SIT_SECONDS * 0.9);
    expect(statueRuntime.progress).toBeCloseTo(0.9, 1);
    expect(onStone(MIRROR_SIT_SECONDS * 0.9 + 0.05, false)).toBeNull();
    expect(statueRuntime.progress).toBe(0);
    const t = MIRROR_SIT_SECONDS * 0.9 + 0.1;
    expect(frames(t, t + MIRROR_SIT_SECONDS * 0.8)).not.toContain("woke");
    expect(frames(t + MIRROR_SIT_SECONDS * 0.8 + 0.05, t + MIRROR_SIT_SECONDS + 0.1)).toContain("woke");
  });

  it("doesn't count a sit across frames that were paused (the world scrolled out of view)", () => {
    frames(0, MIRROR_SIT_SECONDS * 0.5);
    // no frames for a minute, then back: the clock ran on, the sit didn't
    expect(onStone(60)).toBeNull();
    expect(statueRuntime.progress).toBe(0);
    expect(frames(60.05, 60 + MIRROR_SIT_SECONDS * 0.8)).not.toContain("woke");
  });

  it("needs you on the stone, sitting, with your feet down", () => {
    const late = MIRROR_SIT_SECONDS * 3;
    // standing on it
    onStone(0, false);
    expect(onStone(late, false)).toBeNull();
    // sitting in the air over it (a jump can't be a sit, but the rule shouldn't care how)
    onStone(0, true, false);
    expect(onStone(late, true, false)).toBeNull();
    // sitting beside it
    const beside = MIRROR_STONE.x + MIRROR_REACH + 0.2;
    stepStatue(sit, beside, MIRROR_STONE.z, true, true, 0);
    expect(stepStatue(sit, beside, MIRROR_STONE.z, true, true, late)).toBeNull();
    expect(statueRuntime.progress).toBe(0);
    expect(statueRuntime.wokenAt).toBe(Infinity);
  });
});

describe("the way into the music box and back", () => {
  const portal = REGIONS.hall.portals.find((p) => p.to === "musicbox");

  it("is not a portal you can see or walk into: only a place to come back to", () => {
    expect(portal?.arriveOnly).toBe(true);
    expect(portal && isDrawn(portal)).toBe(false);
    expect(portal && isWalkThrough(portal)).toBe(false);
    // every other portal of the hall is still walked through
    expect(REGIONS.hall.portals.filter((p) => !isWalkThrough(p))).toEqual([portal]);
  });

  it("brings you back in front of the statue, off the mirror stone, on open ground", () => {
    const back = arrivalPoint("hall", "musicbox");
    expect(back).toEqual(STATUE_ARRIVAL);
    expect(Math.hypot(back.x - MIRROR_STONE.x, back.z - MIRROR_STONE.z)).toBeGreaterThan(MIRROR_REACH + 1);
    expect(back.z).toBeGreaterThan(MIRROR_STONE.z);
    expect(fromStatue(back)).toBeLessThan(STATUE_CLEARING);
    expect(terrainBlocked(ISLAND_TERRAIN, back.x, back.z, 0)).toBe(false);
    expect(groundAt(REGIONS.hall, back.x, back.z, 0).height).toBe(0);
  });

  it("lands you in the music box clear of its way out", () => {
    const there = arrivalPoint("musicbox", "hall");
    for (const out of REGIONS.musicbox.portals) {
      expect(Math.hypot(there.x - out.x, there.z - out.z)).toBeGreaterThan(PORTAL_RADIUS * 2);
    }
  });
});
