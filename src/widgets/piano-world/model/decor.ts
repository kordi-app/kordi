import { BOUNDS, WHITE_L } from "./layout";
import type { CircleCollider } from "./physics";
import type { RegionId } from "./regions";

/**
 * Set dressing placed in each keyboard region. Shared by the renderer and
 * the physics, so whatever stands on the floor is also solid.
 */
export type DecorKind = "column" | "floorLamp";

export interface DecorItem {
  kind: DecorKind;
  x: number;
  z: number;
}

const SOLID_RADIUS: Record<DecorKind, number> = { column: 0.55, floorLamp: 0.25 };

/** Behind the keyboard, where the colonnade / lounge lamps stand */
const BACK_ROW_Z = -WHITE_L / 2 - 3;
function columns(): DecorItem[] {
  const out: DecorItem[] = [];
  for (let x = -BOUNDS.x + 4; x <= BOUNDS.x - 4; x += 6) out.push({ kind: "column", x, z: BACK_ROW_Z });
  return out;
}

const DECOR: Partial<Record<RegionId, DecorItem[]>> = {
  cathedral: columns(),
  lounge: [-12, -2, 8, 15].map((x): DecorItem => ({ kind: "floorLamp", x, z: BACK_ROW_Z + 0.8 })),
};

export function decorFor(region: RegionId): readonly DecorItem[] {
  return DECOR[region] ?? [];
}

export function decorColliders(region: RegionId): CircleCollider[] {
  return decorFor(region).map((item) => ({ x: item.x, z: item.z, radius: SOLID_RADIUS[item.kind] }));
}
