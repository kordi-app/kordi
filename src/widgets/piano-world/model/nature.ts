import { INTERACTABLES } from "./interactables";
import {
  CLIFF,
  DRUMS,
  ISLAND_BOUNDS,
  ISLAND_SOLIDS,
  LAMPS,
  PATHS,
  STREAM,
  TOWER,
  WARP_STONES,
  hash,
} from "./island";
import { REGIONS } from "./regions";
import type { Solid } from "./terrain";

/**
 * The island's nature: woods, bushes, rocks, grass and flowers, scattered
 * deterministically (every player sees the same trees) and kept clear of the
 * plaza, paths, water and the musical zones. Trees, bushes and big rocks are
 * solid; grass and flowers are only scenery.
 */

export interface Tree {
  kind: "oak" | "pine";
  x: number;
  z: number;
  scale: number;
  /** canopy tint 0–1 */
  tint: number;
  turn: number;
}

export interface Prop {
  x: number;
  z: number;
  scale: number;
  turn: number;
  tint: number;
}

type Area = { x0: number; x1: number; z0: number; z1: number } | { x: number; z: number; r: number };

const inArea = (a: Area, x: number, z: number) =>
  "r" in a ? Math.hypot(x - a.x, z - a.z) < a.r : x > a.x0 && x < a.x1 && z > a.z0 && z < a.z1;

const rect = (x: number, z: number, w: number, d: number, margin: number): Area => ({
  x0: x - w / 2 - margin,
  x1: x + w / 2 + margin,
  z0: z - d / 2 - margin,
  z1: z + d / 2 + margin,
});

/** Places scenery never covers (water, paths, the plaza, the instruments). */
const GROUND_CLEAR: Area[] = [
  { x0: -36, x1: 36, z0: -9, z1: 15.5 }, // keyboard plaza
  { x0: STREAM.x - STREAM.width / 2 - 0.6, x1: STREAM.x + STREAM.width / 2 + 0.6, z0: -200, z1: 200 },
  ...PATHS.map((p) => rect(p.x, p.z, p.w, p.d, 0.3)),
  ...DRUMS.map((d) => ({ x: d.x, z: d.z, r: d.r + 0.3 })),
  { x: TOWER.x, z: TOWER.z, r: TOWER.half + 2 },
  { x0: CLIFF.x0 - 1, x1: CLIFF.x1 + 1, z0: CLIFF.back - 10, z1: CLIFF.front + 3.5 }, // cliff, cave, falls pool
];

/** …plus room to move: solid things (trees, bushes, rocks) also keep off these. */
const SOLID_CLEAR: Area[] = [
  ...GROUND_CLEAR,
  ...PATHS.map((p) => rect(p.x, p.z, p.w, p.d, 2.2)),
  { x0: -40, x1: 40, z0: -12, z1: 18 },
  { x: 72, z: 0, r: 19 }, // drum valley
  { x: TOWER.x, z: TOWER.z, r: 10 },
  { x0: -90, x1: -34, z0: -27, z1: 28 }, // the pipe forest has its own trees
  { x0: CLIFF.x0 - 4, x1: CLIFF.x1 + 6, z0: CLIFF.back - 12, z1: CLIFF.front + 12 },
  { x0: STREAM.x - 8, x1: STREAM.x + 10, z0: -4, z1: 4 }, // bridge approaches
  ...WARP_STONES.map((w) => ({ x: w.x, z: w.z + 1, r: 4.5 })),
  ...REGIONS.hall.portals.map((p) => ({ x: p.x, z: p.z, r: 3.5 })),
  ...LAMPS.map((l) => ({ x: l.x, z: l.z, r: 1.2 })),
  ...INTERACTABLES.filter((i) => i.region === "hall").map((i) => ({ x: i.x, z: i.z, r: 3 })),
];

const MARGIN = 2;
const insideIsland = (x: number, z: number) =>
  Math.abs(x) < ISLAND_BOUNDS.x - MARGIN && z > ISLAND_BOUNDS.zMin + MARGIN && z < ISLAND_BOUNDS.zMax - MARGIN;
const groundFree = (x: number, z: number) => insideIsland(x, z) && !GROUND_CLEAR.some((a) => inArea(a, x, z));
const solidFree = (x: number, z: number) => insideIsland(x, z) && !SOLID_CLEAR.some((a) => inArea(a, x, z));

/** Smooth 0–1 field: where woods grow thick (and meadows bloom). */
export function woodland(x: number, z: number) {
  const n =
    Math.sin(x * 0.061 + 1.3) * Math.cos(z * 0.083 - 0.7) +
    0.6 * Math.sin((x + z) * 0.047 + 2.1) +
    0.35 * Math.cos((x - z) * 0.13 - 1.1);
  return Math.min(1, Math.max(0, (n + 1.2) / 2.6));
}

/** Jittered-grid scatter: one candidate per cell, kept when `keep` says so. */
function scatter<T>(step: number, salt: number, make: (x: number, z: number, i: number) => T | null): T[] {
  const out: T[] = [];
  let i = 0;
  for (let gx = -ISLAND_BOUNDS.x; gx <= ISLAND_BOUNDS.x; gx += step) {
    for (let gz = ISLAND_BOUNDS.zMin; gz <= ISLAND_BOUNDS.zMax; gz += step) {
      i++;
      const x = gx + (hash(i, salt) - 0.5) * step * 0.9;
      const z = gz + (hash(i, salt + 1) - 0.5) * step * 0.9;
      const made = make(x, z, i);
      if (made) out.push(made);
    }
  }
  return out;
}

export const TREES: readonly Tree[] = scatter(4.2, 31, (x, z, i) => {
  if (!solidFree(x, z)) return null;
  const wood = woodland(x, z);
  // thick woods where the field is high, the odd lone tree elsewhere
  if (hash(i, 33) > wood * wood * 1.4 + 0.04) return null;
  // pines up north and in the deep woods, round oaks in the open
  const pine = hash(i, 34) < 0.25 + (z < -20 ? 0.35 : 0) + wood * 0.2;
  return { kind: pine ? "pine" : "oak", x, z, scale: 0.8 + hash(i, 35) * 0.7, tint: hash(i, 36), turn: hash(i, 37) * Math.PI * 2 };
});

/** Tree trunks are what you bump into. */
const trunkRadius = (t: Tree) => (t.kind === "pine" ? 0.32 : 0.38) * t.scale;

export const BUSHES: readonly Prop[] = scatter(5, 41, (x, z, i) => {
  if (!solidFree(x, z) || hash(i, 42) > 0.35 + woodland(x, z) * 0.3) return null;
  if (TREES.some((t) => Math.hypot(t.x - x, t.z - z) < 2.2)) return null;
  return { x, z, scale: 0.6 + hash(i, 43) * 0.7, turn: hash(i, 44) * 6.28, tint: hash(i, 45) };
});

export const ROCKS: readonly Prop[] = scatter(7.5, 51, (x, z, i) => {
  if (!solidFree(x, z) || hash(i, 52) > 0.3) return null;
  if (TREES.some((t) => Math.hypot(t.x - x, t.z - z) < 2)) return null;
  return { x, z, scale: 0.35 + hash(i, 53) ** 2 * 1.4, turn: hash(i, 54) * 6.28, tint: hash(i, 55) };
});

/** Grass tufts: everywhere there's ground (including the pipe forest), thinner in the woods. */
export const GRASS: readonly Prop[] = scatter(1.35, 61, (x, z, i) => {
  if (!groundFree(x, z) || hash(i, 62) > 0.62 - woodland(x, z) * 0.2) return null;
  return { x, z, scale: 0.6 + hash(i, 63) * 0.8, turn: hash(i, 64) * 6.28, tint: hash(i, 65) };
});

/** Flowers bloom in patches in the open (where the woods thin out). */
export const FLOWERS: readonly Prop[] = scatter(1.6, 71, (x, z, i) => {
  if (!groundFree(x, z)) return null;
  const meadow = 1 - woodland(x, z);
  const patch = Math.sin(x * 0.21 + 0.4) * Math.cos(z * 0.19 + 1.7);
  if (hash(i, 72) > (patch > 0.35 ? 0.75 : 0.05) * meadow) return null;
  return { x, z, scale: 0.7 + hash(i, 73) * 0.6, turn: hash(i, 74) * 6.28, tint: hash(i, 75) };
});

export const NATURE_SOLIDS: readonly Solid[] = [
  ...TREES.map((t): Solid => ({ foot: { shape: "circle", x: t.x, z: t.z, r: trunkRadius(t) }, top: 6 * t.scale, bottom: -1 })),
  ...BUSHES.map((b): Solid => ({ foot: { shape: "circle", x: b.x, z: b.z, r: 0.6 * b.scale }, top: 1.1 * b.scale, bottom: -1 })),
  // small rocks you can step over; big ones you walk round
  ...ROCKS.filter((r) => r.scale > 0.45).map(
    (r): Solid => ({ foot: { shape: "circle", x: r.x, z: r.z, r: 0.75 * r.scale }, top: 0.8 * r.scale, bottom: -1 }),
  ),
];

/** Everything solid on the island: the musical zones plus nature. */
export const ALL_ISLAND_SOLIDS: readonly Solid[] = [...ISLAND_SOLIDS, ...NATURE_SOLIDS];
