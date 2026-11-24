import { describe, expect, it } from "vitest";
import { groundAt } from "./physics";
import { REGIONS, REGION_IDS, arrivalPoint } from "./regions";
import { TERRAINS } from "./terrains";

describe("regions are described by data", () => {
  it.each(REGION_IDS)("%s: a region without a keyboard has terrain to stand on and a way in", (id) => {
    const region = REGIONS[id];
    if (region.floor === undefined) return;
    expect(region.terrain && TERRAINS[region.terrain]).toBeTruthy();
    expect(region.entry).toBeDefined();
  });

  it.each(REGION_IDS)("%s: a direct link puts you on solid ground", (id) => {
    const region = REGIONS[id];
    const at = arrivalPoint(id, null);
    const ground = groundAt(region, at.x, at.z, 0);
    expect(ground.height).toBeGreaterThanOrEqual(0);
  });
});
