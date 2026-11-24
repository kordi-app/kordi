import * as THREE from "three";
import {
  BALL_RADIUS,
  applyBallNews,
  ballResting,
  newBall,
  stepBall,
  type Ball,
  type BallWorld,
} from "../../engine/ball";
import { BOUNDS } from "../../engine/layout";
import { groundAt, type CircleCollider } from "../../engine/physics";
import type { RegionDef, RegionId } from "../../engine/regions";
import type { WorldPresence } from "../world-types";
import type { FrameContext } from "./context";

export interface BallsFrame {
  balls: Ball[];
  /** the region the balls were set out for */
  region: RegionId | null;
  /** their meshes, by index (set by the renderer) */
  meshes: (THREE.Mesh | null)[];
  spin: { axis: THREE.Vector3; turn: THREE.Quaternion };
  /** what the balls roll in, refilled every frame */
  world: BallWorld & { region: RegionDef | null; player: NonNullable<BallWorld["player"]> };
}

export const createBallsFrame = (): BallsFrame => ({
  balls: [],
  region: null,
  meshes: [],
  spin: { axis: new THREE.Vector3(), turn: new THREE.Quaternion() },
  world: createBallWorld(),
});

/** A ball world whose ground reads the region it's given each frame (one closure, made once) */
function createBallWorld(): BallsFrame["world"] {
  const world: BallsFrame["world"] = {
    region: null,
    ground: (x, z) => {
      const g = groundAt(world.region!, x, z, 0);
      return { height: g.height, midi: g.midi };
    },
    colliders: [],
    bounds: BOUNDS,
    player: { x: 0, y: 0, z: 0, vx: 0, vz: 0 },
  };
  return world;
}

/**
 * Setting out the balls: only on coming into a region. They're the channel's,
 * so a warp within a region leaves them where they are (and the server's
 * welcome puts them where the channel left them).
 */
export function enterBalls(state: BallsFrame, region: RegionId, spawns: readonly { x: number; z: number }[]) {
  if (state.region === region) return;
  state.region = region;
  state.balls = spawns.map((spot) => newBall(spot.x, spot.z));
}

/**
 * The note balls, shared with the channel: take the channel's news (in the
 * server's order), roll them, tell the channel when I kick one and again where
 * it stops, sound the keys they hit, and move their meshes.
 */
export function stepBallsFrame(
  ctx: FrameContext,
  state: BallsFrame,
  solids: readonly CircleCollider[],
  { takeBallNews, sendBall }: Pick<WorldPresence, "takeBallNews" | "sendBall">,
) {
  const { s, dt, region, events, fx } = ctx;
  const { world } = state;
  world.region = region;
  world.colliders = solids;
  // the same edges you walk within (the island's are wider, the band rooms' narrower)
  world.bounds = region.bounds ?? BOUNDS;
  const me = world.player;
  me.x = s.pos.x;
  me.y = s.pos.y;
  me.z = s.pos.z;
  me.vx = s.vx;
  me.vz = s.vz;
  for (const { state: news, age, fromMe } of takeBallNews()) {
    const ball = state.balls[news.i];
    if (ball) applyBallNews(ball, news, age / 1000, fromMe, world);
  }
  state.balls.forEach((ball, i) => {
    const { note, kicked } = stepBall(ball, dt, world);
    if (kicked) {
      // mine only if the channel hears it (offline, it's just my own ball)
      ball.mine = sendBall({ i, x: ball.x, y: ball.y, z: ball.z, vx: ball.vx, vy: ball.vy, vz: ball.vz });
    } else if (ball.mine && ballResting(ball)) {
      ball.mine = false;
      sendBall({ i, x: ball.x, y: ball.y, z: ball.z, vx: 0, vy: 0, vz: 0 });
    }
    if (note) {
      events.onBallNote(note.midi, note.velocity);
      if (note.velocity > 0.3) fx?.notes(ball.x, ball.y - BALL_RADIUS, ball.z, region.theme.accent);
    }
    const mesh = state.meshes[i];
    if (mesh) {
      mesh.position.set(ball.x, ball.y, ball.z);
      // roll: spin about the horizontal axis perpendicular to travel
      const travel = Math.hypot(ball.vx, ball.vz);
      if (travel > 1e-3) {
        const { axis, turn } = state.spin;
        axis.set(ball.vz, 0, -ball.vx).normalize();
        turn.setFromAxisAngle(axis, (travel * dt) / BALL_RADIUS);
        mesh.quaternion.premultiply(turn);
      }
    }
  });
}
