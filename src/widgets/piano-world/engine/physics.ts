import { CASE_H, PRESS_DEPTH, keyAt } from "./layout";
import { courseGround } from "./course";
import { terrainGround } from "./terrain";
import { TERRAINS } from "./terrains";
import type { RegionDef } from "./regions";

/** Walking speed, units per second. */
export const SPEED = 4.2;
export const JUMP_SPEED = 7.5;
export const GRAVITY = 22;
/** Neon's black-key springs launch this much harder than a normal jump. */
export const SPRING_BOOST = 1.75;
/** Above this gap to the ground, an unsupported player falls rather than glides down. */
export const FALL_THRESHOLD = 0.4;

// --- feel (all per second) ------------------------------------------------
/** How fast you reach walking speed on the ground… */
export const GROUND_ACCEL = 32;
/** …and how quickly you stop when you let go. */
export const GROUND_FRICTION = 26;
/** Steering in the air is weaker, so jumps commit to a direction. */
export const AIR_ACCEL = 11;
/** You can still jump this long after walking off a ledge. */
export const COYOTE_TIME = 0.1;
/** A jump pressed this long before landing still happens on landing. */
export const JUMP_BUFFER = 0.12;
/** Releasing jump early cuts the rise short: extra gravity while rising. */
export const JUMP_CUT_GRAVITY = 2.4;
/** Landing harder than this (downward speed) squashes Kordi and kicks up dust. */
export const HARD_LANDING = 6;

/** Kordi's collision body on the keyboard floor (see course.ts for the climb). */
export const BODY_RADIUS = 0.42;

export type Direction = "up" | "down" | "left" | "right";
export type InputState = Record<Direction, boolean> & {
  /** set on Space / jump button press; consumed by the next frame */
  jump: boolean;
  /** Space / jump button currently held (variable jump height) */
  jumpHeld: boolean;
};

export const idleInput = (): InputState => ({
  up: false,
  down: false,
  left: false,
  right: false,
  jump: false,
  jumpHeld: false,
});

/** Approach `target` by at most `step` (for velocity acceleration). */
export function approach(value: number, target: number, step: number) {
  return value < target ? Math.min(value + step, target) : Math.max(value - step, target);
}

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
}

/**
 * Push a body at (x, z) out of any circle it overlaps. Returns the corrected
 * position and the push normal of the last contact (for cancelling velocity).
 */
export function resolveCircles(
  x: number,
  z: number,
  radius: number,
  colliders: readonly CircleCollider[],
): { x: number; z: number; normal: { x: number; z: number } | null } {
  let normal: { x: number; z: number } | null = null;
  for (const c of colliders) {
    const dx = x - c.x;
    const dz = z - c.z;
    const distance = Math.hypot(dx, dz);
    const min = c.radius + radius;
    if (distance >= min) continue;
    // exactly on top: push out toward the camera so you never get stuck
    const nx = distance > 1e-4 ? dx / distance : 0;
    const nz = distance > 1e-4 ? dz / distance : 1;
    x = c.x + nx * min;
    z = c.z + nz * min;
    normal = { x: nx, z: nz };
  }
  return { x, z, normal };
}

export const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

export interface Ground {
  height: number;
  /** note to sound, if standing on something playable */
  midi: number | null;
  black: boolean;
  /** course platform index, for progress tracking */
  platform: number | null;
  /** island terrain (ISLAND_TERRAIN.solids index) when standing on it rather than a key */
  solid: number | null;
}

/** What's underfoot in this region at (x, z), given the current height. */
export function groundAt(region: RegionDef, x: number, z: number, y: number): Ground {
  const course = region.course;
  if (course) {
    const hit = courseGround(course, x, z, y);
    const platform = hit.index === null ? null : course.platforms[hit.index];
    return {
      height: hit.height,
      midi: platform?.midi ?? null,
      black: platform?.kind === "black",
      platform: hit.index,
      solid: null,
    };
  }
  const terrain = region.terrain ? TERRAINS[region.terrain] : null;
  const hit = terrain ? terrainGround(terrain, x, z, y) : null;
  if (region.floor !== undefined) {
    // no keyboard: the terrain where there is some, else the region's floor
    const on = hit !== null && hit.index !== null && hit.height > region.floor;
    return { height: on ? hit.height : region.floor, midi: null, black: false, platform: null, solid: on ? hit.index : null };
  }
  const key = keyAt(x, z, region.keys);
  const keyHeight = key ? CASE_H + key.height - PRESS_DEPTH : 0;
  // terrain over the keys (the island's bridges, stairs, rocks…) wins where it's higher
  if (hit && hit.index !== null && hit.height > keyHeight) {
    return { height: hit.height, midi: null, black: false, platform: null, solid: hit.index };
  }
  return {
    height: keyHeight,
    midi: key?.midi ?? null,
    black: key?.black ?? false,
    platform: null,
    solid: null,
  };
}

/** An angle folded into [-π, π), whatever its size or sign. */
export function wrapAngle(angle: number) {
  return angle - Math.PI * 2 * Math.floor((angle + Math.PI) / (Math.PI * 2));
}

/**
 * Shortest-path angle interpolation, so turning never spins the long way round
 * (for any two angles: `%` alone keeps the sign, and a far-apart pair went the long way).
 */
export function lerpAngle(from: number, to: number, t: number) {
  return from + wrapAngle(to - from) * t;
}

/** Where to put the player on entering a region. A fresh object per entry. */
export interface Arrival {
  x: number;
  z: number;
}
