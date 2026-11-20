import * as THREE from "three";
import type { KordiMotion } from "@/entities/character";
import {
  BOUNCE_BOOST,
  courseBlocked,
  courseCeiling,
  courseDepenetrate,
  type CourseDef,
} from "./course";
import {
  AIR_ACCEL,
  BODY_RADIUS,
  COYOTE_TIME,
  FALL_THRESHOLD,
  GRAVITY,
  GROUND_ACCEL,
  GROUND_FRICTION,
  HARD_LANDING,
  JUMP_CUT_GRAVITY,
  JUMP_SPEED,
  SPEED,
  approach,
  lerpAngle,
  resolveCircles,
  type CircleCollider,
  type Ground,
  type InputState,
} from "./physics";
import { terrainBlocked, terrainCeiling, terrainDepenetrate, type Solid, type Terrain } from "./terrain";

/**
 * Your Kordi's movement, one frame at a time: walking with momentum, solid
 * steps and terrain, props and other players, body language, and jumping /
 * falling / landing. Plain functions over a mutable state object — the
 * scene's frame loop calls them in order and handles what they report
 * (sounds, effects, events).
 */

export interface PlayerSim {
  /** live position, shared with renderers that follow the player */
  pos: THREE.Vector3;
  heading: number;
  vx: number;
  vz: number;
  vy: number;
  airborne: boolean;
  /** in the air because of a jump (not a fall) — no coyote jump then */
  jumped: boolean;
  /** launched by a spring, trampoline or drum: ignores the early-release cut */
  springing: boolean;
  sinceGrounded: number;
  jumpBuffer: number;
  lastForward: number;
  bumpCooldown: number;
  midi: number | null;
  /** course platform underfoot */
  platform: number | null;
  /** island terrain underfoot (ISLAND_TERRAIN.solids index) */
  solid: number | null;
  /** height of the last ground stood on: the camera follows this, not jumps */
  restY: number;
}

export const createPlayerSim = (pos: THREE.Vector3): PlayerSim => ({
  pos,
  heading: 0,
  vx: 0,
  vz: 0,
  vy: 0,
  airborne: false,
  jumped: false,
  springing: false,
  sinceGrounded: 0,
  jumpBuffer: 0,
  lastForward: 0,
  bumpCooldown: 0,
  midi: null,
  platform: null,
  solid: null,
  restY: 0,
});

/** Put the player down at a spot, standing still (arrivals, warps). */
export function placePlayer(s: PlayerSim, x: number, y: number, z: number) {
  s.pos.set(x, y, z);
  s.heading = 0; // face the camera on arrival
  s.vx = s.vz = s.vy = 0;
  s.airborne = s.jumped = s.springing = false;
  s.platform = null;
  s.midi = null;
  s.solid = null;
  s.restY = y;
}

/** What the player walks among this frame. */
export interface WalkEnv {
  bounds: { x: number; zMin: number; zMax: number };
  course: CourseDef | null;
  island: Terrain | null;
  /** props you can't walk through (keyboard regions) */
  props: CircleCollider[];
  /** other players nearby, for gentle pushing and bumps */
  players: Iterable<{ x: number; y?: number; z: number }>;
}

/**
 * Walking: velocity eases toward the input direction (momentum, weaker in the
 * air), then the move is resolved against whatever is solid here. Returns how
 * fast you're going and whether you're steering.
 */
export function walk(s: PlayerSim, keys: InputState, dt: number, env: WalkEnv, m: KordiMotion) {
  let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let iz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const steering = ix !== 0 || iz !== 0;
  if (steering) {
    const length = Math.hypot(ix, iz);
    ix /= length;
    iz /= length;
  }
  const accel = (s.airborne ? AIR_ACCEL : steering ? GROUND_ACCEL : GROUND_FRICTION) * dt;
  s.vx = approach(s.vx, ix * SPEED, accel);
  s.vz = approach(s.vz, iz * SPEED, accel);

  const { course, island, bounds } = env;
  const speed = Math.hypot(s.vx, s.vz);
  if (speed > 1e-3) {
    const nextX = THREE.MathUtils.clamp(s.pos.x + s.vx * dt, -bounds.x, bounds.x);
    const nextZ = THREE.MathUtils.clamp(s.pos.z + s.vz * dt, bounds.zMin, bounds.zMax);
    // solid steps / terrain: resolve each axis separately so you slide along a side
    const blocked = course
      ? (x: number, z: number) => courseBlocked(course, x, z, s.pos.y)
      : island
        ? (x: number, z: number) => terrainBlocked(island, x, z, s.pos.y)
        : null;
    if (!blocked || !blocked(nextX, s.pos.z)) s.pos.x = nextX;
    else s.vx = 0;
    if (!blocked || !blocked(s.pos.x, nextZ)) s.pos.z = nextZ;
    else s.vz = 0;
  }
  if (island) {
    const out = terrainDepenetrate(island, s.pos.x, s.pos.z, s.pos.y);
    s.pos.x = out.x;
    s.pos.z = out.z;
  }
  if (course) {
    // steps move and appear on their own: if one ended up inside Kordi, step out of it
    const out = courseDepenetrate(course, s.pos.x, s.pos.z, s.pos.y);
    s.pos.x = THREE.MathUtils.clamp(out.x, -bounds.x, bounds.x);
    s.pos.z = THREE.MathUtils.clamp(out.z, bounds.zMin, bounds.zMax);
  } else {
    pushAround(s, dt, env, m);
  }
  return { speed, steering };
}

/** Props you can't walk through, and a soft push away from other players (with a bump). */
function pushAround(s: PlayerSim, dt: number, env: WalkEnv, m: KordiMotion) {
  const pushed = resolveCircles(s.pos.x, s.pos.z, BODY_RADIUS, env.props);
  const nearbyPlayers: CircleCollider[] = [];
  for (const other of env.players) {
    if (Math.abs((other.y ?? 0) - s.pos.y) < 1.5) {
      nearbyPlayers.push({ x: other.x, z: other.z, radius: BODY_RADIUS });
    }
  }
  const shoved = resolveCircles(pushed.x, pushed.z, BODY_RADIUS, nearbyPlayers);
  const soft = 1 - Math.exp(-dt * 10); // soft, not a wall
  s.pos.x = THREE.MathUtils.lerp(pushed.x, shoved.x, soft);
  s.pos.z = THREE.MathUtils.lerp(pushed.z, shoved.z, soft);
  // Bump: running into someone bounces you back with a little hop. Every
  // client does this for its own player, so both sides of a collision
  // bounce — no server physics needed.
  if (shoved.normal && s.bumpCooldown === 0) {
    const closing = -(s.vx * shoved.normal.x + s.vz * shoved.normal.z);
    if (closing > 1) {
      const kick = closing * 1.4 + 1.5;
      s.vx += shoved.normal.x * kick;
      s.vz += shoved.normal.z * kick;
      if (!s.airborne) {
        s.airborne = true;
        s.jumped = true;
        s.vy = 3.2;
      }
      m.land = 0.5;
      s.bumpCooldown = 0.4;
    }
  }
  s.bumpCooldown = Math.max(0, s.bumpCooldown - dt);
  if (pushed.normal) {
    // stop pushing into the prop, keep sliding along it
    const into = s.vx * pushed.normal.x + s.vz * pushed.normal.z;
    if (into < 0) {
      s.vx -= into * pushed.normal.x;
      s.vz -= into * pushed.normal.z;
    }
  }
}

/** Turn toward where you're going; lean into acceleration, bank into turns, walk cycle. */
export function bodyLanguage(s: PlayerSim, m: KordiMotion, dt: number, speed: number) {
  const previousHeading = s.heading;
  if (speed > 0.3) {
    s.heading = lerpAngle(s.heading, Math.atan2(s.vx, s.vz), 1 - Math.exp(-dt * 12));
  }
  const forwardSpeed = s.vx * Math.sin(s.heading) + s.vz * Math.cos(s.heading);
  const forwardAccel = (forwardSpeed - s.lastForward) / Math.max(dt, 1e-3);
  s.lastForward = forwardSpeed;
  const turnRate = lerpAngle(0, s.heading - previousHeading, 1) / Math.max(dt, 1e-3);
  const ease = 1 - Math.exp(-dt * 8);
  m.lean = THREE.MathUtils.lerp(m.lean, THREE.MathUtils.clamp(forwardAccel / 20, -1, 1), ease);
  m.bank = THREE.MathUtils.lerp(m.bank, THREE.MathUtils.clamp((turnRate * speed) / 25, -1, 1), ease);
  m.amount = THREE.MathUtils.lerp(m.amount, Math.min(speed / SPEED, 1), 1 - Math.exp(-dt * 10));
  m.phase += dt * 11 * m.amount;
}

/** A landing this frame: how hard, and what on (island terrain, for drums). */
export interface Landing {
  impact: number;
  solid: Solid | null;
}

/**
 * Jumping, falling and landing against `ground`. Forgiving jumps: a buffered
 * press fires on landing, and you get a beat after walking off a ledge.
 * Trampolines and drums launch you back up. Returns the landing, if any.
 */
export function jumpAndFall(
  s: PlayerSim,
  m: KordiMotion,
  dt: number,
  ground: Ground,
  jump: { pressed: boolean; held: boolean; buffer: number },
  env: Pick<WalkEnv, "course" | "island">,
): Landing | null {
  const { course, island } = env;
  if (jump.pressed) s.jumpBuffer = jump.buffer;
  else s.jumpBuffer = Math.max(0, s.jumpBuffer - dt);
  s.sinceGrounded = s.airborne ? s.sinceGrounded + dt : 0;

  const canJump = !s.airborne || (s.sinceGrounded < COYOTE_TIME && !s.jumped);
  if (s.jumpBuffer > 0 && canJump) {
    s.airborne = true;
    s.jumped = true;
    s.springing = false;
    s.vy = JUMP_SPEED;
    s.jumpBuffer = 0;
  }

  let landing: Landing | null = null;
  if (s.airborne) {
    // let go of jump early and the rise is cut short (springs always go full height)
    const cut = s.vy > 0 && !jump.held && !s.springing ? JUMP_CUT_GRAVITY : 1;
    s.vy -= GRAVITY * cut * dt;
    const nextY = s.pos.y + s.vy * dt;
    const ceiling =
      s.vy <= 0
        ? null
        : course
          ? courseCeiling(course, s.pos.x, s.pos.z, s.pos.y, nextY)
          : island
            ? terrainCeiling(island, s.pos.x, s.pos.z, s.pos.y, nextY)
            : null;
    if (ceiling !== null) {
      s.pos.y = ceiling; // bonk: head hit an underside
      s.vy = 0;
    } else {
      s.pos.y = nextY;
    }
    if (s.vy < 0 && s.pos.y <= ground.height) {
      const impact = -s.vy;
      s.pos.y = ground.height; // landing re-strikes the key below
      s.airborne = false;
      s.jumped = false;
      s.springing = false;
      s.vy = 0;
      if (impact > HARD_LANDING) m.land = Math.min(1, (impact - HARD_LANDING) / 8 + 0.35); // squash
      const solid = island && ground.solid !== null ? island.solids[ground.solid] : null;
      landing = { impact, solid };
      // trampolines (course) and drums (island) fling you back up
      const boost =
        course && ground.platform !== null && course.platforms[ground.platform].behavior === "bounce"
          ? BOUNCE_BOOST
          : (solid?.bounce ?? 0);
      if (boost > 0) {
        s.airborne = true;
        s.jumped = true;
        s.springing = true;
        s.vy = JUMP_SPEED * boost;
        m.land = 0.8;
      }
    }
  } else if (s.pos.y - ground.height > FALL_THRESHOLD) {
    s.airborne = true; // walked off a ledge (coyote time starts now)
    s.vy = 0;
  } else {
    s.pos.y = THREE.MathUtils.lerp(s.pos.y, ground.height, 1 - Math.exp(-dt * 18));
    s.restY = ground.height;
  }
  return landing;
}
