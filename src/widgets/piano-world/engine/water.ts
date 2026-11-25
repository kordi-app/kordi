import { BRIDGE_DEPTH, CAVE, CLIFF, ISLAND_BOUNDS, STREAM } from "./island";

/**
 * Where the island's water lies — the sea round the beach, the stream, the
 * pool under the harp falls — and the rings Kordi leaves on it. Pure data and
 * arithmetic: the renderer (ui/island/water.tsx) draws from the same numbers.
 */

/** The sea begins where the beach's rounded rectangle ends */
export const SEA = {
  halfX: ISLAND_BOUNDS.x + 9,
  zMin: ISLAND_BOUNDS.zMin - 9,
  zMax: ISLAND_BOUNDS.zMax + 9,
  radius: 22,
  level: -0.3,
};
export const STREAM_LEVEL = 0.02;
/** The pool the harp falls land in, at the cliff's foot */
export const POOL = { x: (CAVE.x0 + CAVE.x1) / 2, z: CLIFF.front + 1.6, r: 3.2, level: 0.03 };
/** The bridge's two rails stand in the stream, this far either side of z = 0 (xylo-bridge.tsx) */
export const BRIDGE_RAIL_Z = BRIDGE_DEPTH / 2 - 0.35;

/**
 * Boulders standing in the stream, for the current to part around. Nobody can
 * reach them (the stream's banks are solid), so they are scenery, not solids.
 */
export const STREAM_ROCKS: readonly { x: number; z: number; r: number }[] = [
  { x: STREAM.x - 0.8, z: -9, r: 0.55 },
  { x: STREAM.x + 1.1, z: -17.5, r: 0.42 },
  { x: STREAM.x - 1.2, z: -28, r: 0.48 },
  { x: STREAM.x + 1.2, z: 9.5, r: 0.5 },
  { x: STREAM.x - 0.7, z: 18, r: 0.4 },
  { x: STREAM.x + 0.6, z: 29, r: 0.52 },
];

/** Signed distance to the beach's outer edge: positive out at sea */
export function seaDistance(x: number, z: number) {
  const qx = Math.abs(x) - SEA.halfX + SEA.radius;
  const qz = Math.abs(z - (SEA.zMin + SEA.zMax) / 2) - (SEA.zMax - SEA.zMin) / 2 + SEA.radius;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - SEA.radius;
}

/** The height of the water's surface over (x, z), or null on dry land */
export function waterLevelAt(x: number, z: number): number | null {
  if (Math.hypot(x - POOL.x, z - POOL.z) < POOL.r) return POOL.level;
  if (Math.abs(x - STREAM.x) < STREAM.width / 2 && z > STREAM.zMin && z < STREAM.zMax) return STREAM_LEVEL;
  if (seaDistance(x, z) > 0) return SEA.level;
  return null;
}

// --- rings on the water ------------------------------------------------------

export const WATER_RIPPLES = 8;
/** A ring has spread and faded after this long (the shader's lifetime for it) */
export const WATER_RIPPLE_SECONDS = 2.6;

/**
 * The last few rings, as the water's shader reads them: x, z, start time (the
 * scene clock) and strength, four numbers each. One buffer for the whole
 * island, written in place — the same shared-runtime pattern as islandHits.
 */
export const waterRipples = { data: new Float32Array(WATER_RIPPLES * 4), next: 0 };

export function addWaterRipple(x: number, z: number, at: number, strength: number) {
  const o = waterRipples.next * 4;
  waterRipples.data[o] = x;
  waterRipples.data[o + 1] = z;
  waterRipples.data[o + 2] = at;
  waterRipples.data[o + 3] = strength;
  waterRipples.next = (waterRipples.next + 1) % WATER_RIPPLES;
}

export function clearWaterRipples() {
  waterRipples.data.fill(0);
  waterRipples.next = 0;
}

/** Feet this far above the surface (or the ground, where the water lies under it) still count as in the water */
const WADE_REACH = 0.12;
/** …and this far below it (the sea lies a little under the beach) */
const WADE_DEPTH = 1;
/** Wading leaves a ring every so far, but never more often than this */
const WADE_STRIDE = 0.6;
const WADE_INTERVAL = 0.22;
/** Standing still in the water, a quiet ring now and then */
const IDLE_INTERVAL = 1.5;

export const SPLASH_STRENGTH = 1;
export const WADE_STRENGTH = 0.6;
export const IDLE_STRENGTH = 0.35;

export interface Wade {
  wet: boolean;
  at: number;
  x: number;
  z: number;
}

export const createWade = (): Wade => ({ wet: false, at: -Infinity, x: 0, z: 0 });

export function resetWade(wade: Wade) {
  wade.wet = false;
  wade.at = -Infinity;
}

/**
 * One frame of someone at (x, y, z): stepping or landing in water makes a
 * splash ring, wading on leaves a trail of them, standing in it a quiet one
 * now and then. Returns the strength of the ring it made (0: none).
 */
export function stepWade(wade: Wade, x: number, y: number, z: number, grounded: boolean, now: number) {
  const level = waterLevelAt(x, z);
  const wet = grounded && level !== null && y <= Math.max(level, 0) + WADE_REACH && y >= level - WADE_DEPTH;
  const entered = wet && !wade.wet;
  wade.wet = wet;
  if (!wet) return 0;
  let strength = 0;
  if (entered) strength = SPLASH_STRENGTH;
  else if (now - wade.at > WADE_INTERVAL && Math.hypot(x - wade.x, z - wade.z) > WADE_STRIDE) strength = WADE_STRENGTH;
  else if (now - wade.at > IDLE_INTERVAL) strength = IDLE_STRENGTH;
  if (strength === 0) return 0;
  wade.at = now;
  wade.x = x;
  wade.z = z;
  addWaterRipple(x, z, now, strength);
  return strength;
}
