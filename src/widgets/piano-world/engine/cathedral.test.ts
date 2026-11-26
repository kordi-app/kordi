import { describe, expect, it } from "vitest";
import { DWELL, LIGHT_POOLS, POOL_OF_MIDI, ROSETTE, createAmen, dwellAmen, playAmen, poolFor } from "./cathedral";
import { KEYS } from "./layout";

const C4 = 60;
const E4 = 64;
const G4 = 67;
const C5 = 72;

describe("the rose's phrase", () => {
  it("opens on C, E, G and C, in any octave", () => {
    const amen = createAmen();
    expect(playAmen(amen, C4, 1)).toEqual({ kind: "pane", midi: C4 });
    expect(playAmen(amen, E4 + 12, 2)).toEqual({ kind: "pane", midi: E4 + 12 });
    expect(playAmen(amen, G4 - 12, 3)).toEqual({ kind: "pane", midi: G4 - 12 });
    expect(playAmen(amen, C5, 4)).toEqual({ kind: "bloom" });
    expect(amen.progress).toBe(0);
    expect(amen.bloomAt).toBe(4);
  });

  it("starts over on a wrong note", () => {
    const amen = createAmen();
    playAmen(amen, C4, 1);
    playAmen(amen, E4, 2);
    expect(playAmen(amen, 65, 3)).toEqual({ kind: "miss" });
    expect(amen.progress).toBe(0);
  });

  it("takes a stray C as a fresh first pane", () => {
    const amen = createAmen();
    playAmen(amen, C4, 1);
    playAmen(amen, E4, 2);
    expect(playAmen(amen, C5, 3)).toEqual({ kind: "miss" });
    expect(amen.progress).toBe(1);
  });
});

describe("standing on a note", () => {
  it("counts a key only once it has been stood on for the dwell", () => {
    const amen = createAmen();
    expect(dwellAmen(amen, C4, 0)).toBeNull();
    expect(dwellAmen(amen, C4, DWELL / 2)).toBeNull();
    expect(dwellAmen(amen, C4, DWELL)).toEqual({ kind: "pane", midi: C4 });
    // and not again while you stay
    expect(dwellAmen(amen, C4, DWELL * 4)).toBeNull();
  });

  it("ignores the keys you only walk across", () => {
    const amen = createAmen();
    let t = 0;
    dwellAmen(amen, C4, t);
    dwellAmen(amen, C4, (t += DWELL));
    // C#, D, D# underfoot for a moment each on the way to E
    for (const midi of [61, 62, 63]) {
      dwellAmen(amen, midi, (t += 0.1));
      dwellAmen(amen, midi, (t += 0.1));
    }
    dwellAmen(amen, E4, (t += 0.1));
    expect(dwellAmen(amen, E4, (t += DWELL))).toEqual({ kind: "pane", midi: E4 });
    expect(amen.progress).toBe(2);
  });

  it("never plays in the air", () => {
    const amen = createAmen();
    dwellAmen(amen, null, 0);
    expect(dwellAmen(amen, null, 10)).toBeNull();
  });

  it("does not open by walking up the keyboard without stopping", () => {
    const amen = createAmen();
    let t = 0;
    for (let midi = C4; midi <= C5; midi += 1) {
      expect(dwellAmen(amen, midi, (t += 0.12))).toBeNull();
      expect(dwellAmen(amen, midi, (t += 0.12))).toBeNull();
    }
  });
});

describe("the windows' light", () => {
  it("has a pool for every key, near the key", () => {
    for (const key of KEYS) {
      const pool = LIGHT_POOLS[POOL_OF_MIDI.get(key.midi)!];
      expect(Math.abs(pool.x - key.x)).toBeLessThanOrEqual(3);
    }
  });

  it("clamps keys past either end to the end pools", () => {
    expect(poolFor(-1000)).toBe(0);
    expect(poolFor(1000)).toBe(LIGHT_POOLS.length - 1);
  });

  it("keeps the rosette clear of the pools", () => {
    const poolBack = LIGHT_POOLS[0].z - 2;
    expect(ROSETTE.z + ROSETTE.radius).toBeLessThan(poolBack);
  });
});
