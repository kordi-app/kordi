import { describe, expect, it } from "vitest";
import { comboMultiplier, gradeFor, isBossStage, scoreFor, warmUpBossProgression } from "./rules";

describe("scoring", () => {
  it("grades by the share of the time limit used", () => {
    expect(gradeFor(0.1)).toBe("PERFECT");
    expect(gradeFor(0.5)).toBe("GREAT");
    expect(gradeFor(0.9)).toBe("GOOD");
  });

  it("raises the multiplier as the combo grows", () => {
    expect([1, 4, 5, 9, 10, 19, 20, 99].map(comboMultiplier)).toEqual([1, 1, 1.5, 1.5, 2, 2, 3, 3]);
  });

  // the server rejects a run outside defeated × 100 ≤ score ≤ defeated × 2700 (AdventureRecordRequest)
  it("stays within the server's per-monster bounds", () => {
    expect(scoreFor("GOOD", 1, false)).toBe(100);
    expect(scoreFor("PERFECT", 20, true)).toBe(2700);
  });
});

describe("bosses", () => {
  it("closes every scene", () => {
    expect([1, 4, 5, 6, 10].map(isBossStage)).toEqual([false, false, true, false, true]);
  });

  it("asks for a progression on white keys only during the warm-up", () => {
    expect(warmUpBossProgression(0)).toEqual(["C", "F", "G"]);
    const all = new Set(Array.from({ length: 1000 }, (_, i) => warmUpBossProgression(i / 1000).join("-")));
    for (const progression of all) expect(progression).not.toContain("#");
    expect(all).toContain("E-A-B");
    expect(all).toContain("F-C-Dm");
    expect(all).not.toContain("E-C#m-A");
  });
});
