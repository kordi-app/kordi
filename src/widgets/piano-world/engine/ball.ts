import { BODY_RADIUS, resolveCircles, type CircleCollider } from "./physics";
import { WORLD_CONTRACT } from "./world-contract";

/**
 * The note ball: kick it and it bounces across the keys, sounding whatever it
 * lands on (and softly, whatever it rolls over). Plain sphere physics — no
 * engine needed for one ball.
 */
export const BALL_RADIUS = 0.35;
const BALL_GRAVITY = 18;
const BOUNCE = 0.58; // fraction of speed kept on each bounce
const WALL_BOUNCE = 0.6;
const ROLL_FRICTION = 1.1; // per second, while touching the ground
const AIR_DRAG = 0.15;
const MIN_BOUNCE_SPEED = 1.4; // slower than this and it just settles
const KICK_COOLDOWN = 0.25;
/** Rolling slower than this, a ball on the ground stops dead (so every screen agrees it's still). */
const REST_SPEED = 0.05;
/** Catching up on a ball kicked a while ago: in steps this long, for at most this long (it's still by then). */
const CATCH_UP_STEP = 1 / 60;
const CATCH_UP_MAX = 20;

export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** key it was last touching, for the roll-over notes */
  key: number | null;
  kickCooldown: number;
  /** I kicked it last and it hasn't stopped yet: I tell the channel where it comes to rest */
  mine: boolean;
}

export const newBall = (x: number, z: number): Ball => ({
  x,
  y: 1.5,
  z,
  vx: 0,
  vy: 0,
  vz: 0,
  key: null,
  kickCooldown: 0,
  mine: false,
});

/** Lying still on the ground. */
export const ballResting = (ball: Ball) => ball.vy === 0 && ball.vx === 0 && ball.vz === 0;

export interface BallWorld {
  /** surface height and the key there */
  ground: (x: number, z: number) => { height: number; midi: number | null };
  colliders: readonly CircleCollider[];
  bounds: { x: number; zMin: number; zMax: number };
  /** my Kordi, who kicks it (null: nobody, e.g. while catching up) */
  player: { x: number; y: number; z: number; vx: number; vz: number } | null;
}

/** What a step did: a note it made, and whether I just kicked it. */
export interface BallStep {
  note: BallNote | null;
  kicked: boolean;
}

/** A note the ball made this step: velocity 0–1. */
export interface BallNote {
  midi: number;
  velocity: number;
}

export function stepBall(ball: Ball, dt: number, world: BallWorld): BallStep {
  let note: BallNote | null = null;
  let kicked = false;
  ball.kickCooldown = Math.max(0, ball.kickCooldown - dt);

  // --- kicked by the player
  const p = world.player;
  const dx = p ? ball.x - p.x : Infinity;
  const dz = p ? ball.z - p.z : Infinity;
  const distance = Math.hypot(dx, dz);
  const reach = BODY_RADIUS + BALL_RADIUS;
  if (p && distance < reach && Math.abs(ball.y - BALL_RADIUS - p.y) < 1.2) {
    const nx = distance > 1e-4 ? dx / distance : 0;
    const nz = distance > 1e-4 ? dz / distance : 1;
    ball.x = p.x + nx * reach;
    ball.z = p.z + nz * reach;
    if (ball.kickCooldown === 0) {
      const playerSpeed = Math.hypot(p.vx, p.vz);
      const kick = Math.max(2.5, playerSpeed * 1.5);
      ball.vx = nx * kick + p.vx * 0.4;
      ball.vz = nz * kick + p.vz * 0.4;
      ball.vy = Math.max(ball.vy, 2.2 + playerSpeed * 0.5);
      ball.kickCooldown = KICK_COOLDOWN;
      kicked = true;
    }
  }

  // --- flight
  ball.vy -= BALL_GRAVITY * dt;
  const drag = 1 - AIR_DRAG * dt;
  ball.vx *= drag;
  ball.vz *= drag;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;

  // --- walls and props
  const { bounds } = world;
  if (Math.abs(ball.x) > bounds.x - BALL_RADIUS) {
    ball.x = Math.sign(ball.x) * (bounds.x - BALL_RADIUS);
    ball.vx = -ball.vx * WALL_BOUNCE;
  }
  if (ball.z < bounds.zMin + BALL_RADIUS || ball.z > bounds.zMax - BALL_RADIUS) {
    ball.z = Math.min(Math.max(ball.z, bounds.zMin + BALL_RADIUS), bounds.zMax - BALL_RADIUS);
    ball.vz = -ball.vz * WALL_BOUNCE;
  }
  const pushed = resolveCircles(ball.x, ball.z, BALL_RADIUS, world.colliders);
  if (pushed.normal) {
    ball.x = pushed.x;
    ball.z = pushed.z;
    const into = ball.vx * pushed.normal.x + ball.vz * pushed.normal.z;
    if (into < 0) {
      // reflect off the prop
      ball.vx -= (1 + WALL_BOUNCE) * into * pushed.normal.x;
      ball.vz -= (1 + WALL_BOUNCE) * into * pushed.normal.z;
    }
  }

  // --- ground: bounce, roll, sound
  const ground = world.ground(ball.x, ball.z);
  const floor = ground.height + BALL_RADIUS;
  if (ball.y <= floor) {
    ball.y = floor;
    const impact = -ball.vy;
    if (impact > MIN_BOUNCE_SPEED) {
      ball.vy = impact * BOUNCE;
      if (ground.midi !== null) note = { midi: ground.midi, velocity: Math.min(0.9, 0.25 + impact / 12) };
    } else {
      ball.vy = 0;
      const roll = Math.max(0, 1 - ROLL_FRICTION * dt);
      ball.vx *= roll;
      ball.vz *= roll;
      if (Math.hypot(ball.vx, ball.vz) < REST_SPEED) ball.vx = ball.vz = 0;
      // rolling onto a new key plays it softly — a glissando if you kick it along the keys
      if (ground.midi !== null && ground.midi !== ball.key && Math.hypot(ball.vx, ball.vz) > 1.2) {
        note = { midi: ground.midi, velocity: 0.22 };
      }
    }
    ball.key = ground.midi;
  }
  return { note, kicked };
}

/**
 * Take a ball's state from the channel (someone else kicked it, or it came to
 * rest on their screen), `ageSeconds` old: put it there and roll it on, silently,
 * to where it is by now. It's theirs now, not mine.
 */
export function adoptBall(ball: Ball, state: BallSnapshot, ageSeconds: number, world: BallWorld) {
  ball.x = state.x;
  ball.y = state.y;
  ball.z = state.z;
  ball.vx = state.vx;
  ball.vy = state.vy;
  ball.vz = state.vz;
  ball.mine = false;
  const still = { ...world, player: null };
  for (let t = Math.min(ageSeconds, CATCH_UP_MAX); t > 0 && !ballResting(ball); t -= CATCH_UP_STEP) {
    stepBall(ball, Math.min(CATCH_UP_STEP, t), still);
  }
}

/**
 * A ball's news from the channel, in the order the server took it (it sends
 * everyone's back to them too). Someone else's: take it. My own coming back:
 * nothing to do — unless someone else's kick got in between, in which case the
 * server took mine last and it's mine again (I'll report where it stops).
 */
export function applyBallNews(ball: Ball, state: BallSnapshot, ageSeconds: number, fromMe: boolean, world: BallWorld) {
  if (fromMe) {
    const kick = state.vx !== 0 || state.vy !== 0 || state.vz !== 0;
    if (!kick || ball.mine) return;
    adoptBall(ball, state, ageSeconds, world);
    ball.mine = true;
    return;
  }
  adoptBall(ball, state, ageSeconds, world);
}

/** Position and velocity: what the channel hears about a ball. */
export interface BallSnapshot {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

/**
 * Where the balls start in each region. Only the keyboard regions have any —
 * the ones the server keeps balls for (world-contract.json `balls.regions`), so
 * a new region is ball-free unless the contract says otherwise.
 */
export function ballSpawns(region: string, spawn: { x: number; z: number }): { x: number; z: number }[] {
  if (!(WORLD_CONTRACT.balls.regions as readonly string[]).includes(region)) return [];
  if (region === "hall") {
    return [
      { x: spawn.x + 3, z: spawn.z + 1.2 },
      { x: spawn.x - 4.5, z: spawn.z + 2 },
    ];
  }
  return [{ x: spawn.x + 3, z: spawn.z + 1.2 }];
}
