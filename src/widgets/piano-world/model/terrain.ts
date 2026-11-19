import type { VoiceId } from "@/shared/lib/audio";

/**
 * Solid terrain for the open island: things you can stand on, walk up, bump
 * your head on and can't walk through — bridge bars, drums, tower stairs,
 * cliffs, invisible water edges. Same rules as the jump course's steps, but
 * footprints can be boxes or circles. Pure data + hit testing.
 */

export type Footprint =
  | { shape: "box"; x: number; z: number; w: number; d: number }
  | { shape: "circle"; x: number; z: number; r: number };

/** Instrument voices the island's terrain plays (see shared/lib/audio/voices). */
export type TerrainVoice = VoiceId;

export interface Solid {
  foot: Footprint;
  /** top surface height */
  top: number;
  /** underside height (head bonks / walking beneath) */
  bottom: number;
  /** sounded when you step onto it */
  sound?: { voice: TerrainVoice; midi: number };
  /** landing launches you back up at JUMP_SPEED × bounce */
  bounce?: number;
  /** renderer animation key (e.g. "drum:3"), echoed back in hit events */
  tag?: string;
}

/** Same body as everywhere else in the world. */
const BODY_RADIUS = 0.42;
const BODY_HEIGHT = 1.9;
/** Climb this much without jumping (stairs, curbs) */
const STEP_UP = 0.35;
/** You can stand with part of your feet over an edge */
const FOOT_RADIUS = BODY_RADIUS * 0.6;

function overlaps(foot: Footprint, x: number, z: number, radius: number) {
  if (foot.shape === "box") {
    return Math.abs(x - foot.x) < foot.w / 2 + radius && Math.abs(z - foot.z) < foot.d / 2 + radius;
  }
  return Math.hypot(x - foot.x, z - foot.z) < foot.r + radius;
}

/**
 * Solids bucketed into a coarse grid, so a query only tests what's nearby
 * instead of every tree on the island. Build once per solid list.
 */
export interface Terrain {
  readonly solids: readonly Solid[];
  readonly cell: number;
  readonly buckets: ReadonlyMap<number, readonly number[]>;
}

const CELL = 6;
const cellKey = (cx: number, cz: number) => (cx + 4096) * 8192 + (cz + 4096);

function extent(foot: Footprint) {
  return foot.shape === "box" ? { hx: foot.w / 2, hz: foot.d / 2 } : { hx: foot.r, hz: foot.r };
}

export function buildTerrain(solids: readonly Solid[], cell = CELL): Terrain {
  const buckets = new Map<number, number[]>();
  solids.forEach((solid, i) => {
    const { hx, hz } = extent(solid.foot);
    for (let cx = Math.floor((solid.foot.x - hx) / cell); cx <= Math.floor((solid.foot.x + hx) / cell); cx++) {
      for (let cz = Math.floor((solid.foot.z - hz) / cell); cz <= Math.floor((solid.foot.z + hz) / cell); cz++) {
        const key = cellKey(cx, cz);
        const bucket = buckets.get(key);
        if (bucket) bucket.push(i);
        else buckets.set(key, [i]);
      }
    }
  });
  return { solids, cell, buckets };
}

/** Indices of solids whose cells touch the square (x ± r, z ± r); each listed once. */
const nearbyScratch: number[] = [];
let stamp = 0;
const stamps = new Map<Terrain, Uint32Array>();
function nearby(t: Terrain, x: number, z: number, r: number): readonly number[] {
  let seen = stamps.get(t);
  if (!seen) {
    seen = new Uint32Array(t.solids.length);
    stamps.set(t, seen);
  }
  stamp = (stamp + 1) >>> 0 || 1;
  nearbyScratch.length = 0;
  for (let cx = Math.floor((x - r) / t.cell); cx <= Math.floor((x + r) / t.cell); cx++) {
    for (let cz = Math.floor((z - r) / t.cell); cz <= Math.floor((z + r) / t.cell); cz++) {
      const bucket = t.buckets.get(cellKey(cx, cz));
      if (!bucket) continue;
      for (const i of bucket) {
        if (seen[i] === stamp) continue;
        seen[i] = stamp;
        nearbyScratch.push(i);
      }
    }
  }
  return nearbyScratch;
}

/** The highest top you could stand on at (x, z) from height y, or null for the base floor. */
export function terrainGround(t: Terrain, x: number, z: number, y: number): { height: number; index: number | null } {
  let height = -Infinity;
  let index: number | null = null;
  for (const i of nearby(t, x, z, FOOT_RADIUS)) {
    const s = t.solids[i];
    if (s.top <= y + STEP_UP && s.top > height && overlaps(s.foot, x, z, FOOT_RADIUS)) {
      height = s.top;
      index = i;
    }
  }
  return { height, index };
}

const blocks = (s: Solid, y: number) => s.top > y + STEP_UP && y + BODY_HEIGHT > s.bottom;

/** Would a body at (x, y, z) be inside something it can't step onto? */
export function terrainBlocked(t: Terrain, x: number, z: number, y: number) {
  for (const i of nearby(t, x, z, BODY_RADIUS)) {
    const s = t.solids[i];
    if (blocks(s, y) && overlaps(s.foot, x, z, BODY_RADIUS)) return true;
  }
  return false;
}

/** Rising from fromY to toY: the highest feet height before the head hits an underside, or null. */
export function terrainCeiling(t: Terrain, x: number, z: number, fromY: number, toY: number) {
  let limit: number | null = null;
  for (const i of nearby(t, x, z, BODY_RADIUS)) {
    const s = t.solids[i];
    if (!overlaps(s.foot, x, z, BODY_RADIUS * 0.8)) continue;
    const headroom = s.bottom - BODY_HEIGHT;
    if (headroom >= fromY - 1e-3 && headroom < toY && (limit === null || headroom < limit)) limit = headroom;
  }
  return limit;
}

/**
 * Push a body out of anything it ended up inside, the shortest way out. One
 * solid at a time, re-checking what's nearby after each push (a push can land
 * you against a neighbour), until clear.
 */
export function terrainDepenetrate(t: Terrain, x: number, z: number, y: number) {
  const SKIN = 1e-3;
  for (let push = 0; push < 6; push++) {
    let moved = false;
    for (const i of nearby(t, x, z, BODY_RADIUS)) {
      const s = t.solids[i];
      if (!blocks(s, y)) continue;
      const f = s.foot;
      const dx = x - f.x;
      const dz = z - f.z;
      if (f.shape === "box") {
        const ox = f.w / 2 + BODY_RADIUS - Math.abs(dx);
        const oz = f.d / 2 + BODY_RADIUS - Math.abs(dz);
        if (ox <= 0 || oz <= 0) continue;
        if (ox < oz) x += (dx >= 0 ? 1 : -1) * (ox + SKIN);
        else z += (dz >= 0 ? 1 : -1) * (oz + SKIN);
      } else {
        const distance = Math.hypot(dx, dz);
        const min = f.r + BODY_RADIUS;
        if (distance >= min) continue;
        const nx = distance > 1e-4 ? dx / distance : 0;
        const nz = distance > 1e-4 ? dz / distance : 1;
        x = f.x + nx * (min + SKIN);
        z = f.z + nz * (min + SKIN);
      }
      moved = true;
      break; // the neighbourhood changed: look again from the new spot
    }
    if (!moved) break;
  }
  return { x, z };
}
