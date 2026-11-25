import { describe, expect, it } from "vitest";
import { XYLO_BARS, XYLO_SHARPS, XYLO_SHARP_WIDTH, XYLO_BAR_WIDTH, BRIDGE_DEPTH, WARP_STONES } from "./island";

const STEP_UP = 0.35;

describe("the xylophone bridge", () => {
  it("has the upper row a xylophone has: a sharp wherever two naturals are a whole tone apart", () => {
    expect(XYLO_SHARPS.map((s) => s.midi)).toEqual([73, 75, 78, 80, 82, 85]);
  });

  it("puts each sharp between its two naturals, over the deck's far side", () => {
    for (const sharp of XYLO_SHARPS) {
      const below = XYLO_BARS.find((b) => b.midi === sharp.midi - 1)!;
      const above = XYLO_BARS.find((b) => b.midi === sharp.midi + 1)!;
      expect(sharp.x).toBeCloseTo((below.x + above.x) / 2);
      // over both naturals' edges, and on the far (north, −z) half of the deck
      expect(XYLO_SHARP_WIDTH / 2).toBeGreaterThan((above.x - below.x) / 2 - XYLO_BAR_WIDTH / 2);
      expect(sharp.z + sharp.depth / 2).toBeLessThanOrEqual(0);
      expect(sharp.z - sharp.depth / 2).toBeGreaterThanOrEqual(-BRIDGE_DEPTH / 2 - 1e-9);
    }
  });

  it("lets you step up onto a sharp from either neighbour, and it stands above both", () => {
    for (const sharp of XYLO_SHARPS) {
      for (const n of XYLO_BARS.filter((b) => Math.abs(b.midi - sharp.midi) === 1)) {
        expect(sharp.top).toBeGreaterThan(n.top);
        expect(sharp.top - n.top).toBeLessThanOrEqual(STEP_UP);
      }
    }
  });
});

describe("warp stones", () => {
  it("has none on the bridge (the drum valley's is right beside it)", () => {
    expect(WARP_STONES.map((s) => s.id)).not.toContain("bridge");
  });
});
