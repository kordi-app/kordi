/**
 * How a pet swims after its owner — in the world, not on the owner's back.
 *
 * The pet used to be a child of the owner's model, so it turned with the
 * owner's heading: spin on the spot and it swung round like something glued
 * on. Here it has a place and a velocity of its own. It is drawn to a perch
 * beside and above the owner by a soft spring (so it lags, overshoots a
 * little and settles), trails behind the way the owner is *travelling* (never
 * the way they face — turning in place moves nothing), faces the way it is
 * itself swimming, and drifts about its perch when the owner stands still.
 *
 * Pure numbers (no three.js): the model reads the owner's pose off the scene
 * graph and writes the result back (ui/moon-whale.tsx).
 *
 * Lengths are in the owner's model units and scale with the owner.
 */

/** The perch: this far out from the owner's axis, this high (above the head, clear of any hat) */
export const PERCH_RADIUS = 0.92;
export const PERCH_HEIGHT = 1.85;
/** Where round the owner it starts, measured from their heading: behind the right shoulder */
const PERCH_START = Math.atan2(-0.8, -0.45);
/** Never closer to the owner's axis than this (the body is 0.5 wide, the pet 0.2): it goes round, not through */
export const KEEP_OUT = 0.72;
/** Never further from where it wants to be than this, however fast the owner falls */
const LEASH = 3;
/** The owner moved this far in one frame: a portal or a warp, not a walk — the pet comes along */
const CARRIED_BEYOND = 6;
/** While the owner travels it hangs back this far to one side of straight behind (radians) */
const TRAIL_SIDE = 0.75;
/** The owner counts as travelling above this speed, the pet as swimming above this one */
const TRAVELLING = 0.6;
const SWIMMING = 0.5;
/** A little kick upwards when the owner jumps */
const HOP = 2.2;

/**
 * The spring per mood: [stiffness, damping]. Following is slightly
 * underdamped (ζ ≈ 0.8), which is what makes it lag about a body's width
 * behind at a walk and ease in with a small overshoot when you stop.
 */
const SPRING = {
  follow: [70, 13],
  clap: [120, 16],
  dance: [160, 20],
  sit: [40, 11],
} as const;

export type PetMood = keyof typeof SPRING;

export interface PetOwner {
  x: number;
  y: number;
  z: number;
  /** which way they face (radians about y, 0 = +z) */
  heading: number;
  /** the model's scale in the world */
  scale: number;
}

export interface PetSwim {
  ready: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** which way it faces, and the way it was last swimming (it keeps looking that way at rest) */
  yaw: number;
  restYaw: number;
  /** where round the owner its perch is (world radians about y, 0 = +z) */
  azimuth: number;
  /** where the owner was last frame, and how fast they've been going (smoothed) */
  ownerX: number;
  ownerY: number;
  ownerZ: number;
  ownerVx: number;
  ownerVz: number;
  /** its own speed over the ground, in model units (the tail beats faster) */
  speed: number;
  /** so two pets side by side don't bob in step */
  seed: number;
}

export const createPetSwim = (seed = 0): PetSwim => ({
  ready: false,
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  restYaw: 0,
  azimuth: 0,
  ownerX: 0,
  ownerY: 0,
  ownerZ: 0,
  ownerVx: 0,
  ownerVz: 0,
  speed: 0,
  seed,
});

/** The shortest way round from 0 to `angle`, in (-π, π] */
function wrap(angle: number) {
  const turn = Math.PI * 2;
  return angle - turn * Math.round(angle / turn);
}

/**
 * One frame of swimming at clock time `t`. `hop`: the owner has just jumped.
 */
export function stepPetSwim(s: PetSwim, owner: PetOwner, mood: PetMood, t: number, dt: number, hop = false) {
  const k = owner.scale;
  if (!s.ready) {
    // starts on its perch, as if it had always been there
    s.ready = true;
    s.azimuth = owner.heading + PERCH_START;
    s.x = owner.x + Math.sin(s.azimuth) * PERCH_RADIUS * k;
    s.y = owner.y + PERCH_HEIGHT * k;
    s.z = owner.z + Math.cos(s.azimuth) * PERCH_RADIUS * k;
    s.yaw = s.restYaw = owner.heading;
    s.ownerX = owner.x;
    s.ownerY = owner.y;
    s.ownerZ = owner.z;
  }
  if (dt <= 0) return;

  // how the owner is travelling (their heading is deliberately not part of this)
  const settle = 1 - Math.exp(-dt * 8);
  s.ownerVx += ((owner.x - s.ownerX) / dt - s.ownerVx) * settle;
  s.ownerVz += ((owner.z - s.ownerZ) / dt - s.ownerVz) * settle;
  s.ownerX = owner.x;
  s.ownerY = owner.y;
  s.ownerZ = owner.z;
  const travelling = Math.hypot(s.ownerVx, s.ownerVz) / k > TRAVELLING;

  // --- where it wants to be
  const phase = t + s.seed;
  let tx: number;
  let ty: number;
  let tz: number;
  if (mood === "sit") {
    // nestles into the owner's arms, below the face (the one place it follows their heading: they can't turn while sitting)
    const reach = 0.62 * k;
    tx = owner.x + Math.sin(owner.heading) * reach;
    ty = owner.y + (0.4 + Math.sin(phase * 1.5) * 0.02) * k;
    tz = owner.z + Math.cos(owner.heading) * reach;
  } else if (mood === "dance") {
    // round and round the owner
    s.azimuth = wrap(t * 3.2);
    tx = owner.x + Math.sin(s.azimuth) * 1.05 * k;
    ty = owner.y + (1.3 + Math.sin(t * 6.4) * 0.15) * k;
    tz = owner.z + Math.cos(s.azimuth) * 1.05 * k;
  } else {
    if (travelling) {
      // falls in behind the way they're going, on whichever side it already is
      const behind = Math.atan2(-s.ownerVx, -s.ownerVz);
      const side = wrap(s.azimuth - behind) >= 0 ? 1 : -1;
      s.azimuth += wrap(behind + side * TRAIL_SIDE - s.azimuth) * (1 - Math.exp(-dt * 3));
    } else {
      // at rest it stays where it is in the world, wandering a little
      s.azimuth += Math.sin(phase * 0.23) * 0.1 * dt;
    }
    const bounce = mood === "clap" ? Math.abs(Math.sin(t * 9)) * 0.25 : 0;
    // a lazy loop about the perch
    tx = owner.x + (Math.sin(s.azimuth) * PERCH_RADIUS + Math.sin(phase * 0.7) * 0.18) * k;
    ty = owner.y + (PERCH_HEIGHT + Math.sin(phase * 1.3) * 0.12 + bounce) * k;
    tz = owner.z + (Math.cos(s.azimuth) * PERCH_RADIUS + Math.cos(phase * 0.7) * 0.15) * k;
  }

  // --- the spring that draws it there
  const [stiffness, damping] = SPRING[mood];
  s.vx += (stiffness * (tx - s.x) - damping * s.vx) * dt;
  s.vy += (stiffness * (ty - s.y) - damping * s.vy) * dt;
  s.vz += (stiffness * (tz - s.z) - damping * s.vz) * dt;
  if (hop) s.vy += HOP * k;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.z += s.vz * dt;

  // a long fall or a dash: it never gets left behind
  const away = Math.hypot(s.x - tx, s.y - ty, s.z - tz);
  if (away > LEASH * k) {
    const pull = (LEASH * k) / away;
    s.x = tx + (s.x - tx) * pull;
    s.y = ty + (s.y - ty) * pull;
    s.z = tz + (s.z - tz) * pull;
  }

  // never inside the owner: cutting across, it slides round them instead
  if (mood !== "sit") {
    let outX = s.x - owner.x;
    let outZ = s.z - owner.z;
    let out = Math.hypot(outX, outZ);
    if (out < KEEP_OUT * k) {
      if (out < 1e-4) {
        outX = Math.sin(s.azimuth);
        outZ = Math.cos(s.azimuth);
        out = 1;
      }
      outX /= out;
      outZ /= out;
      s.x = owner.x + outX * KEEP_OUT * k;
      s.z = owner.z + outZ * KEEP_OUT * k;
      // and stops pushing inwards
      const inward = Math.min(0, s.vx * outX + s.vz * outZ);
      s.vx -= inward * outX;
      s.vz -= inward * outZ;
    }
  }

  // --- it faces the way it swims; at rest it keeps looking that way, glancing about
  s.speed = Math.hypot(s.vx, s.vz) / k;
  const swimming = s.speed > SWIMMING;
  if (mood === "sit") s.restYaw = owner.heading;
  else if (swimming) s.restYaw = Math.atan2(s.vx, s.vz);
  const look = swimming || mood === "sit" ? s.restYaw : s.restYaw + Math.sin(phase * 0.7) * 0.4;
  s.yaw += wrap(look - s.yaw) * (1 - Math.exp(-dt * (swimming ? 7 : 2.5)));
}

/**
 * The owner is at (x, y, z) now. If that's a leap from where the pet last saw
 * them (a portal, a warp, a respawn), it is carried along rather than left to
 * swim across the map.
 */
export function carryPetSwim(s: PetSwim, x: number, y: number, z: number, scale: number) {
  if (!s.ready) return;
  const dx = x - s.ownerX;
  const dy = y - s.ownerY;
  const dz = z - s.ownerZ;
  if (Math.hypot(dx, dy, dz) <= CARRIED_BEYOND * scale) return;
  s.x += dx;
  s.y += dy;
  s.z += dz;
  s.ownerX = x;
  s.ownerY = y;
  s.ownerZ = z;
}
