import { beforeEach, describe, expect, it } from "vitest";
import {
  ABYSS_CATCH,
  ABYSS_FLOOR,
  ALTAR,
  CAVE_ARRIVAL,
  CAVE_CELL,
  CAVE_COLS,
  CAVE_EXIT,
  CAVE_ROWS,
  CAVE_SERVER_MIN_STAY_SECONDS,
  DAIS_STEPS,
  DAIS_TOP,
  ILLUSORY_ARRIVAL,
  ILLUSORY_WALL,
  REST_REACH,
  STAR_RESTS,
  caveCell,
  caveRuntime,
  cellX,
  cellZ,
  startCave,
  NECKLACE_READY_SECONDS,
  stepCave,
  type CaveStep,
} from "./cave";
import { CLIFF } from "./island";
import { BODY_RADIUS, groundAt } from "./physics";
import { PORTAL_RADIUS, REGIONS, arrivalPoint } from "./regions";
import { WORLD_CONTRACT } from "./world-contract";

/** What the server checks (world-contract.json, shared with the server) */
const SERVER_CAVE = WORLD_CONTRACT.cave;

const cave = REGIONS.cave;

/** One frame's circumstances: standing, crowned, without the necklace, long enough in (override any) */
const step = (over: Partial<CaveStep> = {}): CaveStep => ({
  grounded: true,
  crowned: true,
  hasNecklace: false,
  stayed: NECKLACE_READY_SECONDS,
  ...over,
});

const STEP_UP = 0.35;

describe("the cave's map", () => {
  it("is a closed grid: rock all round its edge", () => {
    for (let r = 0; r < CAVE_ROWS; r++) {
      for (let c = 0; c < CAVE_COLS; c++) {
        const edge = r === 0 || r === CAVE_ROWS - 1 || c === 0 || c === CAVE_COLS - 1;
        if (edge) expect(caveCell(r, c), `row ${r} col ${c}`).toBe("#");
      }
    }
  });

  it("puts you on solid floor, clear of the way out", () => {
    expect(groundAt(cave, CAVE_ARRIVAL.x, CAVE_ARRIVAL.z, 0).height).toBe(0);
    expect(arrivalPoint("cave", "hall")).toEqual(CAVE_ARRIVAL);
    expect(Math.hypot(CAVE_ARRIVAL.x - CAVE_EXIT.x, CAVE_ARRIVAL.z - CAVE_EXIT.z)).toBeGreaterThan(PORTAL_RADIUS + 1);
  });

  it("has nothing under the chasm but a long fall", () => {
    // the bridge's broken span (row 16, column 12)
    expect(groundAt(cave, cellX(12), cellZ(16), 0).height).toBe(ABYSS_FLOOR);
    expect(groundAt(cave, cellX(12), cellZ(15), 0).height).toBe(0);
    expect(ABYSS_FLOOR).toBeLessThan(ABYSS_CATCH);
  });

  /** Cells you can reach from the entrance, walking (and, if `jump`, hopping one abyss cell straight on) */
  function reachable(jump: boolean) {
    const open = (r: number, c: number) => ![" ", "#"].includes(caveCell(r, c));
    const start = { r: Math.round((CAVE_ARRIVAL.z - cellZ(0)) / CAVE_CELL), c: 10 };
    const seen = new Set([`${start.r},${start.c}`]);
    const queue = [start];
    while (queue.length) {
      const { r, c } = queue.shift()!;
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        let next = { r: r + dr, c: c + dc };
        if (jump && caveCell(next.r, next.c) === " ") next = { r: next.r + dr, c: next.c + dc };
        const key = `${next.r},${next.c}`;
        if (!open(next.r, next.c) || seen.has(key)) continue;
        seen.add(key);
        queue.push(next);
      }
    }
    return seen;
  }
  const cellOf = (p: { x: number; z: number }) =>
    `${Math.round((p.z - cellZ(0)) / CAVE_CELL)},${Math.round(p.x / CAVE_CELL + (CAVE_COLS - 1) / 2)}`;

  it("leads from the entrance to the altar, but only over the bridge's broken span", () => {
    expect(reachable(false).has(cellOf(ALTAR))).toBe(false);
    const all = reachable(true);
    expect(all.has(cellOf(ALTAR))).toBe(true);
    for (const rest of STAR_RESTS) expect(all.has(cellOf(rest))).toBe(true);
  });

  it("climbs the dais in steps you can walk up", () => {
    let below = 0;
    for (const step of DAIS_STEPS) {
      expect(step.top - below).toBeLessThanOrEqual(STEP_UP);
      below = step.top;
    }
    // standing at the pedestal's foot, you're on the top step
    expect(groundAt(cave, ALTAR.x, ALTAR.z + ALTAR.pedestal + BODY_RADIUS, DAIS_TOP).height).toBeCloseTo(DAIS_TOP);
  });
});

describe("the way in", () => {
  it("is a stretch of the cliff you walk up against", () => {
    expect(ILLUSORY_WALL.x).toBeGreaterThan(CLIFF.x0 + 2);
    expect(ILLUSORY_WALL.x).toBeLessThan(CLIFF.caveX0 - 2);
    // pressed up to the rock, you're inside the portal
    expect(Math.abs(CLIFF.front + BODY_RADIUS - ILLUSORY_WALL.z)).toBeLessThan(PORTAL_RADIUS);
    // and coming back out, you're clear of it
    expect(Math.abs(ILLUSORY_ARRIVAL.z - ILLUSORY_WALL.z)).toBeGreaterThan(PORTAL_RADIUS + 0.5);
    expect(arrivalPoint("hall", "cave")).toEqual(ILLUSORY_ARRIVAL);
  });

  it("is never drawn", () => {
    expect(REGIONS.hall.portals.find((p) => p.to === "cave")?.invisible).toBe(true);
  });
});

describe("stepping through the cave", () => {
  beforeEach(startCave);
  const onAltar = { x: ALTAR.x, y: DAIS_TOP, z: ALTAR.z + 1.1 };

  it("gives the necklace only in the crown's light, once", () => {
    expect(stepCave(onAltar.x, onAltar.y, onAltar.z, step({ crowned: false }))).toEqual([]);
    expect(stepCave(onAltar.x, onAltar.y, onAltar.z, step())).toEqual([{ kind: "necklace" }]);
    expect(stepCave(onAltar.x, onAltar.y, onAltar.z, step())).toEqual([]);
  });

  it("keeps it for whoever hasn't got it yet", () => {
    expect(stepCave(onAltar.x, onAltar.y, onAltar.z, step({ hasNecklace: true }))).toEqual([]);
  });

  it("waits until you've been here long enough for the server to believe it", () => {
    expect(stepCave(onAltar.x, onAltar.y, onAltar.z, step({ stayed: NECKLACE_READY_SECONDS - 1 }))).toEqual([]);
    expect(stepCave(onAltar.x, onAltar.y, onAltar.z, step())).toEqual([{ kind: "necklace" }]);
  });

  it("needs you up on the dais, not at its foot", () => {
    expect(stepCave(ALTAR.x, 0, ALTAR.z + 4.8, step())).toEqual([]);
  });

  it("brings you back from the abyss to the last star rest you woke", () => {
    expect(stepCave(0, ABYSS_CATCH - 1, -30, step({ grounded: false }))).toEqual([{ kind: "fell", to: CAVE_ARRIVAL }]);
    const rest = STAR_RESTS[1];
    expect(stepCave(rest.x, 0, rest.z, step({ crowned: false }))).toEqual([{ kind: "rest", index: 1 }]);
    expect(caveRuntime.rests[1]).toBe(true);
    expect(stepCave(rest.x, 0, rest.z, step({ crowned: false }))).toEqual([]); // already awake
    expect(stepCave(0, ABYSS_CATCH - 1, -30, step({ grounded: false }))).toEqual([
      { kind: "fell", to: { x: rest.x, z: rest.z + 1.2 } },
    ]);
  });
});

describe("matches the server", () => {
  it("altar and stay", () => {
    expect(ALTAR.x).toBe(SERVER_CAVE.altar.x);
    expect(ALTAR.z).toBe(SERVER_CAVE.altar.z);
    // wherever you can take it, the server believes you
    expect(DAIS_STEPS[DAIS_STEPS.length - 1].half * Math.SQRT2).toBeLessThanOrEqual(SERVER_CAVE.altar.reach);
    expect(DAIS_TOP - 0.15).toBeGreaterThanOrEqual(SERVER_CAVE.altar.minY);
    expect(CAVE_SERVER_MIN_STAY_SECONDS * 1000).toBe(SERVER_CAVE.minStayMs);
  });

  it("the checkpoint is the star rest past the chasm", () => {
    const { checkpoint } = SERVER_CAVE;
    const rest = STAR_RESTS.find((r) => Math.hypot(r.x - checkpoint.x, r.z - checkpoint.z) < 0.01);
    expect(rest).toBeDefined();
    // past the chasm: between the bridge and the altar
    expect(checkpoint.z).toBeLessThan(cellZ(13));
    expect(checkpoint.z).toBeGreaterThan(ALTAR.z);
  });

  it("star rests, their reach and where a fall puts you are what the server expects", () => {
    expect(STAR_RESTS).toEqual(SERVER_CAVE.rests);
    expect(REST_REACH).toBe(SERVER_CAVE.restReach);
    expect(CAVE_ARRIVAL).toEqual(SERVER_CAVE.arrival);
    STAR_RESTS.forEach((rest, i) => {
      startCave();
      stepCave(rest.x, 0, rest.z, step({ crowned: false }));
      expect(stepCave(0, ABYSS_CATCH - 1, 0, step({ grounded: false }))).toEqual([
        { kind: "fell", to: { x: SERVER_CAVE.rests[i].x, z: SERVER_CAVE.rests[i].z + SERVER_CAVE.respawnOffsetZ } },
      ]);
    });
  });
});
