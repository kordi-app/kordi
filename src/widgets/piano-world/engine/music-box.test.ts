import { beforeEach, describe, expect, it } from "vitest";
import { ballSpawns } from "./ball";
import {
  BALLERINA,
  COMB_BASE,
  CYLINDER,
  CYLINDER_PINS,
  MELODY,
  MUSICBOX_ARRIVAL,
  MUSICBOX_BOUNDS,
  MUSICBOX_HOME,
  MUSICBOX_SOLIDS,
  MUSICBOX_TERRAIN,
  TEETH,
  TOOTH_TOP,
  TUNE,
  musicBoxRuntime,
  nextTooth,
  startMusicBox,
  stepMusicBox,
  toothOf,
} from "./music-box";
import { groundAt } from "./physics";
import { REGIONS } from "./regions";
import { terrainBlocked } from "./terrain";

const box = REGIONS.musicbox;
/** Climbable without a jump (terrain.ts STEP_UP) */
const STEP_UP = 0.35;

describe("the music box's comb", () => {
  it("is a row of teeth, low notes long and high notes short, their tips in line", () => {
    for (let i = 1; i < TEETH.length; i++) {
      expect(TEETH[i].x).toBeGreaterThan(TEETH[i - 1].x);
      expect(TEETH[i].midi).toBeGreaterThan(TEETH[i - 1].midi);
      expect(TEETH[i].rootZ - TEETH[i].tipZ).toBeLessThan(TEETH[i - 1].rootZ - TEETH[i - 1].tipZ);
      expect(TEETH[i].tipZ).toBe(TEETH[0].tipZ);
    }
  });

  it("plays each tooth's note underfoot, and is a gentle step up: velvet → base → tooth", () => {
    expect(COMB_BASE.top).toBeLessThanOrEqual(STEP_UP);
    expect(TOOTH_TOP - COMB_BASE.top).toBeLessThanOrEqual(STEP_UP);
    TEETH.forEach((tooth, i) => {
      // from the velvet in front of the comb, onto the base…
      const base = groundAt(box, tooth.x, COMB_BASE.frontZ - 0.4, 0);
      expect(base.height).toBe(COMB_BASE.top);
      expect(MUSICBOX_TERRAIN.solids[base.solid!].sound).toBeUndefined();
      // …and on up onto the tooth
      const z = (tooth.tipZ + tooth.rootZ) / 2;
      const on = groundAt(box, tooth.x, z, COMB_BASE.top);
      expect(on.height).toBe(TOOTH_TOP);
      const solid = MUSICBOX_TERRAIN.solids[on.solid!];
      expect(toothOf(solid)).toBe(i);
      expect(solid.sound).toEqual({ voice: "crystal", midi: tooth.midi });
      expect(terrainBlocked(MUSICBOX_TERRAIN, tooth.x, z, TOOTH_TOP)).toBe(false);
    });
    expect(toothOf(MUSICBOX_SOLIDS[MUSICBOX_SOLIDS.length - 1])).toBeNull();
    expect(toothOf(null)).toBeNull();
  });

  it("keeps the cylinder and the ballerina's pedestal out of reach (decor, not ground)", () => {
    expect(terrainBlocked(MUSICBOX_TERRAIN, 0, CYLINDER.z, TOOTH_TOP)).toBe(true);
    expect(terrainBlocked(MUSICBOX_TERRAIN, MUSICBOX_BOUNDS.x - 1, CYLINDER.z, 0)).toBe(true);
    expect(terrainBlocked(MUSICBOX_TERRAIN, BALLERINA.x, BALLERINA.z, 0)).toBe(true);
  });

  it("is laid out inside the walls, with open velvet where you arrive and at the way out", () => {
    for (const spot of [MUSICBOX_ARRIVAL, MUSICBOX_HOME]) {
      expect(Math.abs(spot.x)).toBeLessThan(MUSICBOX_BOUNDS.x);
      expect(spot.z).toBeGreaterThan(MUSICBOX_BOUNDS.zMin);
      expect(spot.z).toBeLessThan(MUSICBOX_BOUNDS.zMax);
      expect(terrainBlocked(MUSICBOX_TERRAIN, spot.x, spot.z, 0)).toBe(false);
      expect(groundAt(box, spot.x, spot.z, 0).height).toBe(0);
    }
    expect(CYLINDER.z - CYLINDER.r).toBeGreaterThan(MUSICBOX_BOUNDS.zMin);
    expect(TEETH[TEETH.length - 1].x + 1).toBeLessThan(MUSICBOX_BOUNDS.x);
  });

  it("has no note balls", () => {
    expect(ballSpawns("musicbox", { x: 0, z: 0 })).toEqual([]);
  });
});

describe("the music box's tune", () => {
  it("is Twinkle Twinkle up high, as the cathedral's music box has always played it", () => {
    // (audio/sequencer.ts MUSIC_BOX is built from TUNE; these are the notes it had before it was)
    expect(TUNE.map(([tooth, beats]) => [TEETH[tooth].midi, beats])).toEqual([
      [84, 1], [84, 1], [91, 1], [91, 1], [93, 1], [93, 1], [91, 2],
      [89, 1], [89, 1], [88, 1], [88, 1], [86, 1], [86, 1], [84, 2],
    ]);
  });

  it("asks for its opening phrase", () => {
    expect(MELODY).toEqual(TUNE.slice(0, MELODY.length).map(([tooth]) => tooth));
    expect(MELODY.length).toBeGreaterThanOrEqual(5);
    expect(MELODY.length).toBeLessThan(TUNE.length);
  });

  it("has a pin on the cylinder for every note, over that note's tooth", () => {
    expect(CYLINDER_PINS.map((pin) => pin.x)).toEqual(TUNE.map(([tooth]) => TEETH[tooth].x));
    for (let i = 1; i < CYLINDER_PINS.length; i++) expect(CYLINDER_PINS[i].angle).toBeGreaterThan(CYLINDER_PINS[i - 1].angle);
    expect(CYLINDER_PINS[CYLINDER_PINS.length - 1].angle).toBeLessThan(Math.PI * 2);
  });
});

describe("stepping the tune back together", () => {
  beforeEach(startMusicBox);
  let clock = 0;
  /** Come onto a tooth from the base (or the air), then leave it again */
  const step = (tooth: number) => {
    const events = stepMusicBox(tooth, ++clock);
    stepMusicBox(null, ++clock);
    return events;
  };

  it("glows the next tooth, and moves on when you step it", () => {
    expect(nextTooth()).toBe(MELODY[0]);
    // not yet whole: "seconds since it was completed" must never read as positive (the renderer lights the box by it)
    expect(1000 - musicBoxRuntime.doneAt).toBeLessThan(0);
    expect(step(MELODY[0])).toEqual([{ kind: "step", progress: 1 }]);
    expect(nextTooth()).toBe(MELODY[1]);
  });

  it("completes when every tooth has been stepped in order", () => {
    MELODY.slice(0, -1).forEach((tooth, i) => expect(step(tooth)).toEqual([{ kind: "step", progress: i + 1 }]));
    expect(musicBoxRuntime.doneAt).toBe(Infinity);
    expect(step(MELODY[MELODY.length - 1])).toEqual([{ kind: "step", progress: MELODY.length }, { kind: "done" }]);
    expect(musicBoxRuntime.doneAt).toBe(clock - 1);
    expect(nextTooth()).toBeNull();
  });

  it("doesn't count standing on a tooth twice: a repeated note needs a second step", () => {
    // the tune opens with the same note twice
    expect(MELODY[0]).toBe(MELODY[1]);
    expect(stepMusicBox(MELODY[0], 1)).toHaveLength(1);
    expect(stepMusicBox(MELODY[0], 2)).toEqual([]);
    expect(stepMusicBox(MELODY[0], 3)).toEqual([]);
    expect(musicBoxRuntime.progress).toBe(1);
    // a hop on the spot: off it, and on again
    stepMusicBox(null, 4);
    expect(stepMusicBox(MELODY[0], 5)).toEqual([{ kind: "step", progress: 2 }]);
  });

  it("is not undone by a wrong tooth: walking across the teeth between two notes is fine", () => {
    step(MELODY[0]);
    step(MELODY[1]);
    const wrong = TEETH.findIndex((_, i) => i !== MELODY[2]);
    expect(step(wrong)).toEqual([]);
    expect(musicBoxRuntime.progress).toBe(2);
    // walking tooth to tooth (never touching the base) from the first note to the third
    for (let tooth = MELODY[1] + 1; tooth < MELODY[2]; tooth++) expect(stepMusicBox(tooth, ++clock)).toEqual([]);
    expect(stepMusicBox(MELODY[2], ++clock)).toEqual([{ kind: "step", progress: 3 }]);
  });

  it("stays whole once completed, and forgets again on the next visit", () => {
    MELODY.forEach(step);
    const doneAt = musicBoxRuntime.doneAt;
    expect(step(MELODY[0])).toEqual([]);
    expect(musicBoxRuntime.doneAt).toBe(doneAt);
    startMusicBox();
    expect(musicBoxRuntime.progress).toBe(0);
    expect(nextTooth()).toBe(MELODY[0]);
  });
});
