import { CASE_H, PRESS_DEPTH, keyAt } from "./layout";
import { COURSE, courseGround } from "./course";
import type { RegionDef } from "./regions";

/** Walking speed, units per second. */
export const SPEED = 4.2;
export const JUMP_SPEED = 7.5;
export const GRAVITY = 22;
/** Neon's black-key springs launch this much harder than a normal jump. */
export const SPRING_BOOST = 1.75;
/** Above this gap to the ground, an unsupported player falls rather than glides down. */
export const FALL_THRESHOLD = 0.4;

export type Direction = "up" | "down" | "left" | "right";
export type InputState = Record<Direction, boolean> & {
  /** set on Space / jump button; consumed by the next frame */
  jump: boolean;
};

export const idleInput = (): InputState => ({
  up: false,
  down: false,
  left: false,
  right: false,
  jump: false,
});

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
}

/** What's underfoot in this region at (x, z), given the current height. */
export function groundAt(region: RegionDef, x: number, z: number, y: number): Ground {
  if (region.feature === "course") {
    const hit = courseGround(x, z, y);
    return {
      height: hit.height,
      midi: hit.index === null ? null : COURSE[hit.index].midi,
      black: hit.index !== null && COURSE[hit.index].kind === "black",
      platform: hit.index,
    };
  }
  const key = keyAt(x, z);
  return {
    height: key ? CASE_H + key.height - PRESS_DEPTH : 0,
    midi: key?.midi ?? null,
    black: key?.black ?? false,
    platform: null,
  };
}

/** Shortest-path angle interpolation, so turning never spins the long way round. */
export function lerpAngle(from: number, to: number, t: number) {
  const delta = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return from + delta * t;
}

/** Where to put the player on entering a region. A fresh object per entry. */
export interface Arrival {
  x: number;
  z: number;
}
