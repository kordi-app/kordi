import { describe, expect, it } from "vitest";
import { ISLAND_BOUNDS, ISLAND_SOLIDS } from "./island";
import { NATURE_SOLIDS } from "./nature";
import { CAT_HOME, CAT_WALK_PERIOD, SECRET_SIT_SECONDS, SECRET_SPOT, catPlan, sitOnSpot } from "./cat-walk";

describe("the cat's secret spot", () => {
  it("is open meadow: nothing solid on or right beside it", () => {
    for (const solid of [...ISLAND_SOLIDS, ...NATURE_SOLIDS]) {
      const f = solid.foot;
      const gap =
        f.shape === "circle"
          ? Math.hypot(SECRET_SPOT.x - f.x, SECRET_SPOT.z - f.z) - f.r
          : Math.hypot(Math.max(0, Math.abs(SECRET_SPOT.x - f.x) - f.w / 2), Math.max(0, Math.abs(SECRET_SPOT.z - f.z) - f.d / 2));
      expect(gap, `solid at ${f.x}, ${f.z}`).toBeGreaterThan(2);
    }
    expect(Math.abs(SECRET_SPOT.x)).toBeLessThan(ISLAND_BOUNDS.x);
    expect(SECRET_SPOT.z).toBeLessThan(ISLAND_BOUNDS.zMax - 2);
  });

  it("the cat walks out, sits on it a while, and comes home", () => {
    const at = (s: number) => catPlan(s * 1000);
    const walking = at(3);
    expect(walking.kind).toBe("out");
    const sitting = at(50);
    expect(sitting).toEqual({ kind: "out", ...SECRET_SPOT, sitting: true });
    expect(at(CAT_WALK_PERIOD - 1)).toEqual({ kind: "home" });
    expect(at(CAT_WALK_PERIOD)).toEqual({ kind: "out", ...CAT_HOME, sitting: false });
  });

  it("opens only for sitting, on the spot, long enough", () => {
    const timer = { held: 0 };
    expect(sitOnSpot(timer, SECRET_SPOT.x, SECRET_SPOT.z, false, true, SECRET_SIT_SECONDS + 1)).toBe(false);
    expect(sitOnSpot(timer, SECRET_SPOT.x + 3, SECRET_SPOT.z, true, true, SECRET_SIT_SECONDS + 1)).toBe(false);
    expect(sitOnSpot(timer, SECRET_SPOT.x, SECRET_SPOT.z, true, true, SECRET_SIT_SECONDS / 2)).toBe(false);
    expect(sitOnSpot(timer, SECRET_SPOT.x, SECRET_SPOT.z, true, true, SECRET_SIT_SECONDS / 2 + 0.01)).toBe(true);
  });
});
