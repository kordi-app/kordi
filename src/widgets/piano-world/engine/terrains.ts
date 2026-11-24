import { CAVE_TERRAIN } from "./cave";
import { DREAM_TERRAIN } from "./dream-sea";
import { ISLAND_TERRAIN } from "./nature";
import type { Terrain } from "./terrain";

/**
 * The solid ground a region can have beyond (or instead of) the keys, by name.
 * Regions name theirs (RegionDef.terrain) rather than hold it: the island's
 * terrain is built from the regions' portals, so regions.ts can't import it.
 */
export const TERRAINS = {
  island: ISLAND_TERRAIN,
  dream: DREAM_TERRAIN,
  cave: CAVE_TERRAIN,
} as const satisfies Record<string, Terrain>;

export type TerrainId = keyof typeof TERRAINS;
