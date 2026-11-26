import { describe, expect, it } from "vitest";
import { LADDERS, MAX_TURNS, adapt, ladderFor, startLadder, stepDown, stepUp, type LadderState } from "./quality";

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
    expect(ladderFor(HIGH, 2)).toEqual([1, 1.25, 1.5, 1.75]);
    expect(ladderFor(HIGH, 1)).toEqual([1]);
    expect(ladderFor(LADDERS.low, 3)).toEqual([0.85, 1, 1.25]);
    expect(ladderFor(LADDERS.minimal, 1)).toEqual([0.5]);
  });

  it("fold the steps above the screen into one, so every step down is cheaper", () => {
    expect(ladderFor(HIGH, 1.25)).toEqual([1, 1.25]);
    expect(ladderFor(HIGH, 1.6)).toEqual([1, 1.25, 1.5, 1.6]);
    expect(ladderFor(LADDERS.low, 1)).toEqual([0.85, 1]);
    // a screen with fewer pixels than the bottom step still draws at its own ratio
    expect(ladderFor(LADDERS.low, 0.75)).toEqual([0.75]);
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

  it("hands back the same state when it can go no further", () => {
    const top = startLadder(HIGH);
    expect(adapt(top, "up", HIGH)).toBe(top);
    const bottom = run(["down", "down", "down"]);
    expect(adapt(bottom, "down", HIGH)).toBe(bottom);
    const settled = run(["down", "up", "down", "up"]);
    expect(adapt(settled, "up", HIGH)).toBe(settled);
  });

  it("does not count a turn that went nowhere", () => {
    // up at the top, then down: one move, not a turn
    const state = run(["up", "down"]);
    expect(state.turns).toBe(0);
    expect(state.step).toBe(HIGH.length - 2);
  });

  it("still steps down once settled, if frames keep running slow", () => {
    const settled = run(["down", "up", "down", "up"]);
    expect(run(["down"], settled).step).toBe(1);
  });
});
