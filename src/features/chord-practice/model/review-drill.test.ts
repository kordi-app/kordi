import { describe, expect, it } from "vitest";
import {
  firstTryCorrect,
  reviewDrillReducer,
  startReviewDrill,
  type ReviewDrillAction,
  type ReviewDrillState,
} from "./review-drill";

const deck = [
  { chordId: 1, name: "C" },
  { chordId: 2, name: "Am7" },
  { chordId: 3, name: "G7" },
];

const play = (state: ReviewDrillState, ...actions: ReviewDrillAction["type"][]) =>
  actions.reduce((s, type) => reviewDrillReducer(s, { type }), state);

describe("reviewDrillReducer", () => {
  it("an empty deck is done before it starts", () => {
    expect(startReviewDrill([]).status).toBe("done");
  });

  it("records a first-try correct and moves on", () => {
    const s = play(startReviewDrill(deck), "CORRECT");
    expect(s.outcomes).toEqual([{ chordId: 1, correct: true }]);
    expect(s.queue.map((i) => i.chordId)).toEqual([2, 3]);
    expect(s.questionKey).toBe(1);
  });

  it("a wrong try stays on the chord, counts as missed, and the chord comes back once at the end", () => {
    let s = play(startReviewDrill(deck), "INCORRECT");
    expect(s.queue[0].chordId).toBe(1);
    expect(s.currentMissed).toBe(true);
    expect(s.questionKey).toBe(0);

    s = play(s, "INCORRECT", "CORRECT");
    expect(s.outcomes).toEqual([{ chordId: 1, correct: false }]);
    expect(s.queue.map((i) => i.chordId)).toEqual([2, 3, 1]);

    // played right the second time round: the result stays "missed", and it is not dealt a third time
    s = play(s, "CORRECT", "CORRECT", "INCORRECT", "CORRECT");
    expect(s.status).toBe("done");
    expect(s.outcomes).toEqual([
      { chordId: 1, correct: false },
      { chordId: 2, correct: true },
      { chordId: 3, correct: true },
    ]);
    expect(firstTryCorrect(s)).toBe(2);
  });

  it("skipping counts as missed and deals the chord again once", () => {
    let s = play(startReviewDrill(deck.slice(0, 1)), "SKIP");
    expect(s.status).toBe("playing");
    expect(s.outcomes).toEqual([{ chordId: 1, correct: false }]);
    s = play(s, "SKIP");
    expect(s.status).toBe("done");
    expect(s.outcomes).toHaveLength(1);
  });

  it("ignores input once done", () => {
    const done = play(startReviewDrill(deck.slice(0, 1)), "CORRECT");
    expect(play(done, "INCORRECT")).toBe(done);
  });
});
