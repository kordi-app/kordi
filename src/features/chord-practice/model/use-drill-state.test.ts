import { describe, expect, it } from "vitest";
import { drillReducer, INITIAL_STATE } from "./use-drill-state";
import type { DrillChord } from "@/entities/chord-practice";

const chord = (name: string) => ({ name }) as DrillChord;

describe("drillReducer", () => {
  const playing = drillReducer(INITIAL_STATE, {
    type: "START",
    current: chord("C"),
    next: chord("G"),
  });

  it("a wrong chord breaks the streak and counts against accuracy without moving on", () => {
    const afterCorrect = drillReducer(playing, { type: "MARK_CORRECT", next: chord("F") });
    const afterWrong = drillReducer(afterCorrect, { type: "MARK_INCORRECT" });

    expect(afterWrong.streak).toBe(0);
    expect(afterWrong.wrongTries).toBe(1);
    // totalAttempted keys the current question: a wrong try must not reset it
    expect(afterWrong.totalAttempted).toBe(afterCorrect.totalAttempted);
    expect(afterWrong.currentChord).toEqual(afterCorrect.currentChord);
  });

  it("starting again clears the counters", () => {
    const wrong = drillReducer(playing, { type: "MARK_INCORRECT" });
    const restarted = drillReducer(wrong, { type: "START", current: chord("D"), next: chord("A") });
    expect(restarted.wrongTries).toBe(0);
  });
});
