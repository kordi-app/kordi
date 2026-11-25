import { describe, expect, it } from "vitest";
import { ISLAND_BOUNDS, ISLAND_SOLIDS } from "./island";
import { NATURE_SOLIDS } from "./nature";
import { CAT_HOME, CAT_SIT_SECONDS, CAT_WALK_SECONDS, SECRET_SIT_SECONDS, SECRET_SPOT, catPlan, sitOnSpot } from "./cat-walk";

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
  });

  it("can be seen: nothing tall between it and the camera (which follows from +z)", () => {
    for (const solid of [...ISLAND_SOLIDS, ...NATURE_SOLIDS]) {
      if (solid.top < 1.2) continue;
      const f = solid.foot;
      const r = f.shape === "circle" ? f.r : Math.max(f.w, f.d) / 2;
      const dx = Math.abs(f.x - SECRET_SPOT.x) - r;
      const dz = f.z - SECRET_SPOT.z;
      expect(dx < 2.5 && dz > -r && dz < 16, `solid at ${f.x}, ${f.z} hides the spot`).toBe(false);
    }
    expect(SECRET_SPOT.z).toBeLessThan(ISLAND_BOUNDS.zMax - 2);
  });

  it("stays home until it's asked, then walks out, sits on it a while, and comes home", () => {
    const walkedAt = 1_000_000;
    const at = (s: number) => catPlan(walkedAt, walkedAt + s * 1000);
    expect(catPlan(null, walkedAt)).toEqual({ kind: "home" });
    expect(at(0)).toEqual({ kind: "out", ...CAT_HOME, sitting: false });
    expect(at(3).kind).toBe("out");
    expect(at(CAT_WALK_SECONDS - CAT_SIT_SECONDS / 2 - 15)).toEqual({ kind: "out", ...SECRET_SPOT, sitting: true });
    expect(at(CAT_WALK_SECONDS + 1)).toEqual({ kind: "home" });
  });

  it("opens only for sitting, on the spot, long enough", () => {
    const timer: { since: number | null } = { since: null };
    const at = (x: number, sitting: boolean, now: number) => sitOnSpot(timer, x, SECRET_SPOT.z, sitting, true, now);
    expect(at(SECRET_SPOT.x, false, 10)).toBe(false);
    expect(at(SECRET_SPOT.x + 3, true, 20)).toBe(false);
    expect(at(SECRET_SPOT.x, true, 30)).toBe(false); // sat down
    expect(at(SECRET_SPOT.x, true, 30 + SECRET_SIT_SECONDS / 2)).toBe(false);
    expect(at(SECRET_SPOT.x, true, 30 + SECRET_SIT_SECONDS)).toBe(true);
    expect(at(SECRET_SPOT.x, false, 40)).toBe(false); // stood up: starts over
    expect(at(SECRET_SPOT.x, true, 41)).toBe(false);
  });
});
