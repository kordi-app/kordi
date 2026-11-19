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

/** The highest top you could stand on at (x, z) from height y, or null for the base floor. */
export function terrainGround(
  solids: readonly Solid[],
  x: number,
  z: number,
  y: number,
): { height: number; index: number | null } {
  let best = { height: -Infinity, index: null as number | null };
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (s.top <= y + STEP_UP && s.top > best.height && overlaps(s.foot, x, z, FOOT_RADIUS)) {
      best = { height: s.top, index: i };
    }
  }
  return best;
}

const blocks = (s: Solid, y: number) => s.top > y + STEP_UP && y + BODY_HEIGHT > s.bottom;

/** Would a body at (x, y, z) be inside something it can't step onto? */
export function terrainBlocked(solids: readonly Solid[], x: number, z: number, y: number) {
  return solids.some((s) => blocks(s, y) && overlaps(s.foot, x, z, BODY_RADIUS));
}

/** Rising from fromY to toY: the highest feet height before the head hits an underside, or null. */
export function terrainCeiling(solids: readonly Solid[], x: number, z: number, fromY: number, toY: number) {
  let limit: number | null = null;
  for (const s of solids) {
    if (!overlaps(s.foot, x, z, BODY_RADIUS * 0.8)) continue;
    const headroom = s.bottom - BODY_HEIGHT;
    if (headroom >= fromY - 1e-3 && headroom < toY && (limit === null || headroom < limit)) limit = headroom;
  }
  return limit;
}

/** Push a body out of anything it ended up inside, the shortest way out. */
export function terrainDepenetrate(solids: readonly Solid[], x: number, z: number, y: number) {
  const SKIN = 1e-3;
  for (let pass = 0; pass < 2; pass++) {
    let moved = false;
    for (const s of solids) {
      if (!blocks(s, y)) continue;
      const f = s.foot;
      if (f.shape === "box") {
        const dx = x - f.x;
        const dz = z - f.z;
        const ox = f.w / 2 + BODY_RADIUS - Math.abs(dx);
        const oz = f.d / 2 + BODY_RADIUS - Math.abs(dz);
        if (ox <= 0 || oz <= 0) continue;
        if (ox < oz) x += (dx >= 0 ? 1 : -1) * (ox + SKIN);
        else z += (dz >= 0 ? 1 : -1) * (oz + SKIN);
      } else {
        const dx = x - f.x;
        const dz = z - f.z;
        const distance = Math.hypot(dx, dz);
        const min = f.r + BODY_RADIUS;
        if (distance >= min) continue;
        const nx = distance > 1e-4 ? dx / distance : 0;
        const nz = distance > 1e-4 ? dz / distance : 1;
        x = f.x + nx * (min + SKIN);
        z = f.z + nz * (min + SKIN);
      }
      moved = true;
    }
    if (!moved) break;
  }
  return { x, z };
}
