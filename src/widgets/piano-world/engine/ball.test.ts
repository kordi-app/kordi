import { describe, expect, it } from "vitest";
import { adoptBall, applyBallNews, ballResting, newBall, stepBall, type BallWorld } from "./ball";

const flat: BallWorld = {
  ground: () => ({ height: 0, midi: null }),
  colliders: [],
  bounds: { x: 50, zMin: -50, zMax: 50 },
  player: null,
};

/** Roll a ball until it stops (or `limit` seconds), in frames of `dt`. */
function settle(ball: ReturnType<typeof newBall>, dt: number, limit = 30) {
  for (let t = 0; t < limit && !ballResting(ball); t += dt) stepBall(ball, dt, flat);
  return ball;
}

describe("note ball", () => {
  it("reports the kick on the step my Kordi kicks it, and only then", () => {
    const ball = newBall(0, 0);
    settle(ball, 1 / 60);
    const me = { x: 0, y: 0, z: -0.5, vx: 0, vz: 4 };
    expect(stepBall(ball, 1 / 60, { ...flat, player: me }).kicked).toBe(true);
    expect(stepBall(ball, 1 / 60, { ...flat, player: me }).kicked).toBe(false); // cooldown
    expect(ball.vz).toBeGreaterThan(0);
  });

  it("comes to a dead stop, so every screen agrees it's still", () => {
    const ball = newBall(0, 0);
    Object.assign(ball, { vx: 5, vz: 2 });
    settle(ball, 1 / 60);
    expect(ballResting(ball)).toBe(true);
    expect(ball.vx).toBe(0);
    expect(ball.vz).toBe(0);
  });

  it("catches up on an old kick to about where it'd be on the kicker's screen", () => {
    const kick = { x: 0, y: 0.6, z: 0, vx: 6, vy: 3, vz: -2 };
    const theirs = settle(Object.assign(newBall(0, 0), kick), 1 / 144);
    const mine = newBall(9, 9);
    mine.mine = true;
    adoptBall(mine, kick, 30, flat);

    expect(ballResting(mine)).toBe(true);
    expect(mine.mine).toBe(false);
    expect(Math.hypot(mine.x - theirs.x, mine.z - theirs.z)).toBeLessThan(0.3);
  });

  it("takes a resting ball where it was left", () => {
    const ball = newBall(0, 0);
    adoptBall(ball, { x: 4, y: 0.35, z: -3, vx: 0, vy: 0, vz: 0 }, 5, flat);
    expect([ball.x, ball.z]).toEqual([4, -3]);
  });

  describe("news in the server's order", () => {
    const mineKick = { x: 1, y: 0.6, z: 0, vx: 5, vy: 2, vz: 0 };
    const theirKick = { x: 1, y: 0.6, z: 0, vx: -5, vy: 2, vz: 0 };

    it("my kick taken last wins, even if theirs reached me after mine was sent", () => {
      // I kicked (mine), then their earlier kick reached me, then the server echoed mine
      const ball = Object.assign(newBall(0, 0), mineKick, { mine: true });
      applyBallNews(ball, theirKick, 0, false, flat);
      expect(ball.mine).toBe(false);
      applyBallNews(ball, mineKick, 0, true, flat);
      expect(ball.mine).toBe(true);
      expect(ball.vx).toBe(5);
    });

    it("their kick taken last wins over my echo that came first", () => {
      const ball = Object.assign(newBall(0, 0), mineKick, { mine: true });
      applyBallNews(ball, mineKick, 0, true, flat); // my echo: nothing changes
      expect(ball.vx).toBe(5);
      applyBallNews(ball, theirKick, 0, false, flat);
      expect(ball.mine).toBe(false);
      expect(ball.vx).toBe(-5);
    });

    it("my own rest report coming back changes nothing", () => {
      const ball = Object.assign(newBall(0, 0), { x: 4, y: 0.35, z: 2, vx: 0, vy: 0, vz: 0 });
      applyBallNews(ball, { x: 4, y: 0.35, z: 2, vx: 0, vy: 0, vz: 0 }, 0, true, flat);
      expect(ball.mine).toBe(false);
    });
  });
});
