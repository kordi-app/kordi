import { beforeEach, describe, expect, it } from "vitest";
import { WORLD_CONTRACT } from "./world-contract";
import { GRAVITY, JUMP_SPEED, SPEED } from "./physics";
import {
  DREAM_ARRIVAL,
  DREAM_BOUNDS,
  ISLES,
  JELLY_CHAINS,
  JELLY_RADIUS,
  LOST_NOTES,
  NOTE_REACH,
  TEACUP,
  dreamRuntime,
  isle,
  startDream,
  stepDream,
} from "./dream-sea";

const JUMP_APEX = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
/** WorldLobby.MAX_Y */
const SERVER_MAX_Y = WORLD_CONTRACT.bounds.maxY;

interface Hop {
  x: number;
  z: number;
  r: number;
  top: number;
}

/** Can you jump from `a` onto `b`: low enough to clear, close enough to reach at a run? */
function reachable(a: Hop, b: Hop) {
  const rise = b.top - a.top;
  if (rise > JUMP_APEX - 0.2) return false;
  const air = (JUMP_SPEED + Math.sqrt(Math.max(0, JUMP_SPEED ** 2 - 2 * GRAVITY * rise))) / GRAVITY;
  const gap = Math.hypot(b.x - a.x, b.z - a.z) - a.r - b.r;
  return gap < SPEED * air * 0.6;
}

const asHop = (i: { x: number; z: number; r: number; top: number }): Hop => i;
const jellyHop = (j: { x: number; z: number; top: number }): Hop => ({ ...j, r: JELLY_RADIUS });
const sea = (x: number, z: number): Hop => ({ x, z, r: 0, top: 0 });

describe("the dream sea's layout", () => {
  it("the low islands are a jump up from the sea", () => {
    for (const thing of ["shell", "teacup"] as const) {
      const i = isle(thing);
      expect(reachable(sea(i.x, i.z + i.r + 0.3), asHop(i))).toBe(true);
    }
  });

  it("each jellyfish chain climbs from one place to the next", () => {
    const routes: [Hop, Hop][] = [
      [asHop(isle("teacup")), asHop(isle("tree"))],
      [asHop(isle("shell")), asHop(isle("moon"))],
      [asHop(isle("tree")), asHop(isle("summit"))],
    ];
    JELLY_CHAINS.forEach((chain, k) => {
      const [from, to] = routes[k];
      const path = [from, ...chain.map(jellyHop), to];
      path.slice(1).forEach((hop, i) => expect(reachable(path[i], hop), `chain ${k}, hop ${i}`).toBe(true));
    });
  });

  it("the teacup climbs: island → saucer → cup", () => {
    const i = isle("teacup");
    expect(TEACUP.saucer.top - i.top).toBeLessThan(JUMP_APEX - 0.2);
    expect(TEACUP.cup.top - TEACUP.saucer.top).toBeLessThan(JUMP_APEX - 0.2);
  });

  it("every note can be reached: standing, or with a jump", () => {
    for (const note of LOST_NOTES) {
      // the surface under the note
      const surface =
        note.thing === "teacup" ? TEACUP.cup.top : ISLES.find((i) => Math.hypot(note.x - i.x, note.z - i.z) < i.r)?.top ?? 0;
      const bodyCentre = surface + 0.95;
      expect(note.y - bodyCentre, note.thing).toBeLessThan(JUMP_APEX + NOTE_REACH - 0.2);
    }
  });

  it("stays inside the bounds and under the server's height limit", () => {
    for (const i of ISLES) {
      expect(Math.abs(i.x) + i.r).toBeLessThan(DREAM_BOUNDS.x);
      expect(i.z - i.r).toBeGreaterThan(DREAM_BOUNDS.zMin);
      expect(i.top + 3).toBeLessThan(SERVER_MAX_Y);
    }
    expect(DREAM_ARRIVAL.z).toBeLessThan(DREAM_BOUNDS.zMax);
  });
});

describe("the whale's lost song", () => {
  beforeEach(startDream);

  const take = (i: number) => {
    const n = LOST_NOTES[i];
    return stepDream(n.x, n.y - 0.95, n.z, i);
  };

  it("picks up a note within reach, once", () => {
    expect(take(0)).toEqual([{ kind: "note", index: 0, midi: LOST_NOTES[0].midi }]);
    expect(take(0)).toEqual([]);
  });

  it("the whale only comes for all five, on the summit", () => {
    const summit = isle("summit");
    expect(stepDream(summit.x, summit.top, summit.z, 1)).toEqual([]);
    LOST_NOTES.forEach((_, i) => take(i));
    expect(stepDream(summit.x, 0, summit.z, 2)).toEqual([]); // under it, on the sea
    expect(stepDream(summit.x, summit.top, summit.z, 3)).toEqual([{ kind: "whale" }]);
    expect(stepDream(summit.x, summit.top, summit.z, 4)).toEqual([]);
    expect(dreamRuntime.sungAt).toBe(3);
  });
});

describe("the server's whale check (WorldLobby.atWhaleSummit)", () => {
  /** WorldLobby.WHALE_SUMMIT_X/Z/REACH/MIN_Y */
  const SERVER = { x: 2, z: -38, reach: 5, minY: 6.5 };

  it("covers the summit you stand on to call the whale", () => {
    const summit = isle("summit");
    expect(Math.hypot(summit.x - SERVER.x, summit.z - SERVER.z)).toBeLessThan(0.01);
    expect(summit.top).toBeGreaterThan(SERVER.minY);
    expect(SERVER.reach).toBeGreaterThan(2.5); // SUMMIT_REACH, plus a step of lag
  });
});
