import { beforeEach, describe, expect, it } from "vitest";
import { ISLAND_BOUNDS, STREAM } from "./island";
import { ISLAND_TERRAIN } from "./nature";
import { terrainBlocked } from "./terrain";
import {
  IDLE_STRENGTH,
  POOL,
  SEA,
  SPLASH_STRENGTH,
  STREAM_LEVEL,
  STREAM_ROCKS,
  WADE_STRENGTH,
  WATER_RIPPLES,
  addWaterRipple,
  clearWaterRipples,
  createWade,
  seaDistance,
  stepWade,
  waterLevelAt,
  waterRipples,
} from "./water";

beforeEach(clearWaterRipples);

describe("where the island's water lies", () => {
  it("knows the pool, the stream and the sea from dry land", () => {
    expect(waterLevelAt(POOL.x, POOL.z)).toBe(POOL.level);
    expect(waterLevelAt(STREAM.x, 20)).toBe(STREAM_LEVEL);
    expect(waterLevelAt(0, SEA.zMin - 5)).toBe(SEA.level);
    expect(waterLevelAt(0, 5)).toBeNull();
    expect(waterLevelAt(STREAM.x + STREAM.width / 2 + 0.5, 20)).toBeNull();
  });

  it("keeps the whole walkable island on the beach side of the sea", () => {
    for (const x of [-ISLAND_BOUNDS.x, 0, ISLAND_BOUNDS.x]) {
      for (const z of [ISLAND_BOUNDS.zMin, 0, ISLAND_BOUNDS.zMax]) expect(seaDistance(x, z)).toBeLessThan(0);
    }
  });

  it("stands the stream's boulders in the water, clear of the bridge, where nobody walks", () => {
    for (const rock of STREAM_ROCKS) {
      expect(Math.abs(rock.x - STREAM.x) + rock.r).toBeLessThan(STREAM.width / 2);
      expect(Math.abs(rock.z)).toBeGreaterThan(5);
      expect(terrainBlocked(ISLAND_TERRAIN, rock.x, rock.z, 0)).toBe(true);
    }
  });
});

describe("rings on the water", () => {
  it("keeps the last few rings, overwriting the oldest", () => {
    for (let i = 0; i < WATER_RIPPLES + 1; i++) addWaterRipple(i, -i, i * 0.5, 1);
    expect(waterRipples.next).toBe(1);
    expect([...waterRipples.data.slice(0, 4)]).toEqual([WATER_RIPPLES, -WATER_RIPPLES, WATER_RIPPLES * 0.5, 1]);
    expect([...waterRipples.data.slice(4, 8)]).toEqual([1, -1, 0.5, 1]);
  });

  it("splashes on stepping in, trails rings while wading, and stays quiet on land", () => {
    const wade = createWade();
    expect(stepWade(wade, 0, 0, 5, true, 0)).toBe(0);
    expect(stepWade(wade, POOL.x, 0, POOL.z, true, 1)).toBe(SPLASH_STRENGTH);
    // the next frame, barely moved: nothing yet
    expect(stepWade(wade, POOL.x + 0.05, 0, POOL.z, true, 1.016)).toBe(0);
    expect(stepWade(wade, POOL.x + 0.8, 0, POOL.z, true, 1.4)).toBe(WADE_STRENGTH);
    // standing still: a quiet ring after a while
    expect(stepWade(wade, POOL.x + 0.8, 0, POOL.z, true, 2)).toBe(0);
    expect(stepWade(wade, POOL.x + 0.8, 0, POOL.z, true, 3.2)).toBe(IDLE_STRENGTH);
    expect(waterRipples.next).toBe(3);
  });

  it("splashes again on landing back in the water after a jump", () => {
    const wade = createWade();
    expect(stepWade(wade, POOL.x, 0, POOL.z, true, 1)).toBe(SPLASH_STRENGTH);
    expect(stepWade(wade, POOL.x, 1.2, POOL.z, false, 1.3)).toBe(0);
    expect(stepWade(wade, POOL.x, 0, POOL.z, true, 1.6)).toBe(SPLASH_STRENGTH);
  });

  it("leaves the water alone from a bridge or a height above it", () => {
    const wade = createWade();
    expect(stepWade(wade, STREAM.x, 0.5, 0, true, 1)).toBe(0);
    expect(waterRipples.data.every((v) => v === 0)).toBe(true);
  });
});
