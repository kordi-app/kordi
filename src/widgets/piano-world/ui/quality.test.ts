import { describe, expect, it } from "vitest";
import { LADDERS, MAX_TURNS, adapt, pixelRatio, startLadder, stepDown, stepUp, type LadderState } from "./quality";

const HIGH = LADDERS.high;
const run = (moves: ("up" | "down")[], from: LadderState = startLadder(HIGH)) =>
  moves.reduce((state, move) => adapt(state, move, HIGH), from);

describe("the quality ladders", () => {
  it("start where each tier always drew: the top step", () => {
    const top = (tier: keyof typeof LADDERS) => LADDERS[tier][LADDERS[tier].length - 1];
    expect(top("high")).toBe(1.75);
    expect(top("low")).toBe(1.25);
    expect(top("minimal")).toBe(0.5);
    expect(startLadder(HIGH).step).toBe(HIGH.length - 1);
  });

  it("get cheaper on the way down", () => {
    for (const ladder of Object.values(LADDERS)) {
      for (let i = 1; i < ladder.length; i++) expect(ladder[i]).toBeGreaterThan(ladder[i - 1]);
    }
  });

  it("stop at either end", () => {
    expect(stepDown(0)).toBe(0);
    expect(stepUp(HIGH.length - 1, HIGH)).toBe(HIGH.length - 1);
    expect(stepUp(0, HIGH)).toBe(1);
    expect(stepDown(2)).toBe(1);
  });

  it("never draw more pixels than the screen has", () => {
    expect(pixelRatio(1.75, 1)).toBe(1);
    expect(pixelRatio(1.75, 2)).toBe(1.75);
    expect(pixelRatio(0.85, 3)).toBe(0.85);
  });
});

describe("adapting to the frames", () => {
  it("walks all the way down on a slow device, without calling it a flip-flop", () => {
    const state = run(["down", "down", "down", "down"]);
    expect(state.step).toBe(0);
    expect(state.turns).toBe(0);
    expect(state.settled).toBe(false);
  });

  it("climbs back once there is room again", () => {
    const state = run(["down", "down", "down", "up", "up"]);
    expect(state.step).toBe(2);
  });

  it(`settles on the lower step after ${MAX_TURNS} turns back and forth`, () => {
    // 3 → 2 → 3 → 2 → (would be 3)
    const state = run(["down", "up", "down", "up"]);
    expect(state.settled).toBe(true);
    expect(state.step).toBe(2);
    // and stops climbing for good
    expect(run(["up", "up"], state).step).toBe(2);
  });

  it("still steps down once settled, if frames keep running slow", () => {
    const settled = run(["down", "up", "down", "up"]);
    expect(run(["down"], settled).step).toBe(1);
  });
});
