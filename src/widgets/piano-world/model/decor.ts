import { BOUNDS, WHITE_L } from "./layout";
import type { CircleCollider } from "./physics";
import type { RegionId } from "./regions";

/**
 * Set dressing placed in each keyboard region. Shared by the renderer and
 * the physics, so whatever stands on the floor is also solid.
 */
export type DecorKind = "lamp" | "column" | "floorLamp";

export interface DecorItem {
  kind: DecorKind;
  x: number;
  z: number;
}

const SOLID_RADIUS: Record<DecorKind, number> = { lamp: 0.22, column: 0.55, floorLamp: 0.25 };

/** Behind the keyboard, where the colonnade / lounge lamps stand */
const BACK_ROW_Z = -WHITE_L / 2 - 3;
/** Edge lamps sit just inside the fence */
const EDGE_INSET = 0.8;
const EDGE_SPACING = 9;

function edgeLamps(): DecorItem[] {
  const lamps: DecorItem[] = [];
  const xMax = BOUNDS.x - EDGE_INSET;
  for (let x = -xMax; x <= xMax + 1e-6; x += (xMax * 2) / Math.round((xMax * 2) / EDGE_SPACING)) {
    lamps.push({ kind: "lamp", x, z: BOUNDS.zMax - EDGE_INSET });
    lamps.push({ kind: "lamp", x, z: BOUNDS.zMin + EDGE_INSET });
  }
  return lamps;
}

const EDGE_LAMPS = edgeLamps();

function columns(): DecorItem[] {
  const out: DecorItem[] = [];
  for (let x = -BOUNDS.x + 4; x <= BOUNDS.x - 4; x += 6) out.push({ kind: "column", x, z: BACK_ROW_Z });
  return out;
}

const DECOR: Partial<Record<RegionId, DecorItem[]>> = {
  hall: EDGE_LAMPS,
  neon: EDGE_LAMPS,
  cathedral: [...EDGE_LAMPS, ...columns()],
  lounge: [
    ...EDGE_LAMPS,
    ...[-16, -4, 8, 20].map((x): DecorItem => ({ kind: "floorLamp", x, z: BACK_ROW_Z + 0.8 })),
  ],
};

export function decorFor(region: RegionId): readonly DecorItem[] {
  return DECOR[region] ?? [];
}

export function decorColliders(region: RegionId): CircleCollider[] {
  return decorFor(region).map((item) => ({ x: item.x, z: item.z, radius: SOLID_RADIUS[item.kind] }));
}
