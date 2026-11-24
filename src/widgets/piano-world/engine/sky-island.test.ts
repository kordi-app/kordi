import { beforeEach, describe, expect, it } from "vitest";
import { WORLD_CONTRACT } from "./world-contract";
import { ISLAND_BOUNDS, ISLAND_SOLIDS, TOWER } from "./island";
import type { KordiMotion } from "@/entities/character";
import { JUMP_SPEED, GRAVITY, HARD_LANDING, SPEED, lerpAngle, wrapAngle, type Ground } from "./physics";
import { createPlayerSim, jumpAndFall } from "./player";
import {
  ISLAND_GATE,
  SKY_DRIFT,
  ORRERY,
  SKY_ISLAND,
  SKY_OPEN_SECONDS,
  STAR_PADS,
  STAR_RADIUS,
  STAR_STEPS,
  STAR_THICKNESS,
  TOLL_GAP,
  openGates,
  openSky,
  skyRuntime,
  syncSky,
  stepSkyPads,
  tickSky,
} from "./sky-island";
import type { Footprint } from "./terrain";

/** WorldLobby.MAX_Y: the server drops moves above this */
const SERVER_MAX_Y = WORLD_CONTRACT.bounds.maxY;
const JUMP_APEX = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
const BODY_HEIGHT = 1.9;
const BODY_RADIUS = 0.42; // terrain.ts

function distanceTo(foot: Footprint, x: number, z: number) {
  if (foot.shape === "circle") return Math.max(0, Math.hypot(x - foot.x, z - foot.z) - foot.r);
  const dx = Math.max(0, Math.abs(x - foot.x) - foot.w / 2);
  const dz = Math.max(0, Math.abs(z - foot.z) - foot.d / 2);
  return Math.hypot(dx, dz);
}

beforeEach(() => {
  skyRuntime.until = -Infinity;
  skyRuntime.ringAt = -Infinity;
  tickSky(0);
});

describe("star steps", () => {
  it("each one is a jump up from the last (the first from the roof)", () => {
    let from = { x: TOWER.x - TOWER.half + 0.3, z: STAR_STEPS[0].z, top: TOWER.top, r: 0.3 };
    for (const step of STAR_STEPS) {
      expect(step.top - from.top).toBeLessThan(JUMP_APEX - 0.2);
      const gap = Math.hypot(step.x - from.x, step.z - from.z) - STAR_RADIUS - from.r;
      // airtime to come down onto a step `rise` higher, at walking speed
      const rise = step.top - from.top;
      const air = (JUMP_SPEED + Math.sqrt(JUMP_SPEED ** 2 - 2 * GRAVITY * rise)) / GRAVITY;
      expect(gap).toBeGreaterThan(0.2); // not overlapping
      expect(gap).toBeLessThan(SPEED * air * 0.6);
      from = { ...step, r: STAR_RADIUS };
    }
  });

  it("the last one leads straight onto the island", () => {
    const last = STAR_STEPS[STAR_STEPS.length - 1];
    const gap = Math.hypot(last.x - SKY_ISLAND.x, last.z - SKY_ISLAND.z) - STAR_RADIUS - SKY_ISLAND.radius;
    expect(gap).toBeLessThan(0.5);
    expect(SKY_ISLAND.top - last.top).toBeLessThan(JUMP_APEX - 0.2);
  });

  it("never hangs over the tower's stairs, where it would catch a climber's head", () => {
    for (const step of STAR_STEPS) {
      const bottom = step.top - STAR_THICKNESS;
      for (const solid of ISLAND_SOLIDS) {
        // beside a surface it's only a ledge to jump onto; over one, a ceiling
        if (distanceTo(solid.foot, step.x, step.z) > STAR_RADIUS - BODY_RADIUS * 0.6) continue;
        expect(solid.top + BODY_HEIGHT, `${solid.top} under a step at ${step.top}`).toBeLessThan(bottom);
      }
    }
  });

  it("everything stays inside the island's bounds and under the server's height limit", () => {
    for (const p of [...STAR_STEPS, { x: SKY_ISLAND.x, z: SKY_ISLAND.z - SKY_ISLAND.radius, top: SKY_ISLAND.top }]) {
      expect(Math.abs(p.x)).toBeLessThan(ISLAND_BOUNDS.x);
      expect(p.z).toBeGreaterThan(ISLAND_BOUNDS.zMin);
      expect(p.z).toBeLessThan(ISLAND_BOUNDS.zMax);
    }
    expect(SKY_ISLAND.top + ORRERY.height).toBeLessThan(SERVER_MAX_Y);
  });

  it("star pads sit on the island, clear of the orrery and each other", () => {
    STAR_PADS.forEach((p, i) => {
      const r = Math.hypot(p.x - SKY_ISLAND.x, p.z - SKY_ISLAND.z);
      expect(r).toBeLessThan(SKY_ISLAND.radius - 0.8);
      expect(Math.hypot(p.x - ORRERY.x, p.z - ORRERY.z)).toBeGreaterThan(ORRERY.radius + 1.2);
      STAR_PADS.slice(i + 1).forEach((q) => expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThan(1.6));
    });
  });
});

describe("the midnight bell", () => {
  it("brings one star down per stroke, then the island", () => {
    openSky(100, SKY_OPEN_SECONDS, true);
    expect(openGates(100)).toBe(1);
    expect(openGates(100 + TOLL_GAP * 5 + 0.01)).toBe(6);
    expect(openGates(100 + 20)).toBe(ISLAND_GATE + 1);
    expect(openGates(100 + SKY_OPEN_SECONDS + 1)).toBe(0);
  });

  it("joining while it's open shows everything at once", () => {
    openSky(100, 60, false);
    expect(openGates(100)).toBe(ISLAND_GATE + 1);
  });

  it("ringing again while open only adds time (no second toll)", () => {
    expect(openSky(100, 60, true)).toBe(true);
    expect(openSky(130, 60, true)).toBe(false);
    expect(openGates(131)).toBe(ISLAND_GATE + 1);
    expect(skyRuntime.until).toBe(190);
  });
});

describe("joining a channel", () => {
  it("shuts a sky opened elsewhere, and takes the channel's time when it's open", () => {
    openSky(100, 600, true);
    syncSky(110, 0);
    expect(openGates(110)).toBe(0);
    syncSky(120, 30);
    expect(openGates(120)).toBe(ISLAND_GATE + 1);
    expect(skyRuntime.until).toBe(150);
  });
});

describe("constellations", () => {
  const stand = (i: number, now: number) => stepSkyPads(STAR_PADS[i].x, SKY_ISLAND.top, STAR_PADS[i].z, now, true);

  beforeEach(() => {
    openSky(0, SKY_OPEN_SECONDS, false);
    tickSky(1);
  });

  it("lighting every star of one rings its chord", () => {
    expect(stand(0, 1)).toEqual([{ kind: "pad", midi: 60 }]);
    stand(1, 2);
    expect(stand(2, 3)).toEqual([{ kind: "pad", midi: 67 }, { kind: "constellation", index: 0 }]);
  });

  it("a half-lit constellation goes dark if you wander off", () => {
    stand(0, 1);
    stand(1, 2);
    stand(2, 20); // too late: the first two went dark
    expect(skyRuntime.done[0]).toBe(false);
  });

  it("all three finish the sky", () => {
    const events = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((i) => stand(i, 1 + i * 0.5));
    expect(events.at(-1)).toEqual({ kind: "finished" });
  });

  it("nothing lights from the air or while the island is closed", () => {
    expect(stepSkyPads(STAR_PADS[0].x, SKY_ISLAND.top, STAR_PADS[0].z, 1, false)).toEqual([]);
    skyRuntime.until = -Infinity;
    tickSky(2);
    expect(stand(0, 2)).toEqual([]);
  });
});

describe("drifting down from the sky", () => {
  const motion = (): KordiMotion => ({ phase: 0, amount: 0, emote: null, land: 0, stretch: 0, lean: 0, bank: 0 });
  const vec = (y: number) => ({ x: 0, y, z: 0, set(x: number, ny: number, z: number) { this.x = x; this.y = ny; this.z = z; } });
  const flat = (height: number): Ground => ({ height, midi: null, black: false, platform: null, solid: null });
  const env = { course: null, island: null, drift: SKY_DRIFT };
  const noJump = { pressed: false, held: false, buffer: 0 };

  /** Seconds from walking off at `from` to landing on `to`, and how the landing went. */
  function fall(from: number, to: number) {
    const s = createPlayerSim(vec(from));
    s.restY = from; // where you were standing
    s.airborne = true;
    const dt = 1 / 60;
    for (let t = 0; t < 30; t += dt) {
      const landing = jumpAndFall(s, motion(), dt, flat(to), noJump, env);
      if (landing) return { seconds: t, landing };
    }
    throw new Error("never landed");
  }

  it("takes about ten seconds from the island to the meadow, and lands softly", () => {
    const { seconds, landing } = fall(SKY_ISLAND.top, 0);
    expect(seconds).toBeGreaterThan(9);
    expect(seconds).toBeLessThan(12);
    expect(landing.drifted).toBe(true);
    expect(landing.impact).toBeLessThan(HARD_LANDING);
  });

  it("leaves short hops between star steps alone", () => {
    const { seconds, landing } = fall(SKY_ISLAND.top, SKY_ISLAND.top - 1);
    expect(landing.drifted).toBe(false);
    expect(seconds).toBeLessThan(0.5);
  });

  it("leaves a hop between star steps alone, even with the meadow far below the gap", () => {
    // jumping from one star step up to the next: mid-hop there's nothing under you but the ground
    const step = STAR_STEPS[STAR_STEPS.length - 2];
    const s = createPlayerSim(vec(step.top));
    s.restY = step.top;
    s.airborne = true;
    s.jumped = true;
    s.vy = JUMP_SPEED;
    const dt = 1 / 60;
    const next = step.top + 0.6;
    for (let t = 0; t < 2; t += dt) {
      jumpAndFall(s, motion(), dt, flat(0), { pressed: false, held: true, buffer: 0 }, env);
      expect(s.drifting).toBe(false);
      if (s.vy < 0 && s.pos.y <= next) break; // it lands on the next step here
    }
  });

  it("leaves a jump off the tower roof alone", () => {
    expect(fall(TOWER.top, 0).landing.drifted).toBe(false);
  });
});

describe("angles", () => {
  it("turns the short way round however far the heading has wound up", () => {
    // a long twirl leaves the heading many turns round; the next step must not unwind them
    const wound = Math.PI * 2 * 7 + 0.1;
    expect(lerpAngle(wound, 0, 1) - wound).toBeCloseTo(-0.1);
    expect(lerpAngle(-wound, 0, 1) + wound).toBeCloseTo(0.1);
    expect(wrapAngle(wound)).toBeCloseTo(0.1);
    expect(wrapAngle(-Math.PI)).toBeCloseTo(-Math.PI);
  });
});
