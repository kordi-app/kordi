import { describe, expect, it } from "vitest";
import {
  KEY_CYCLE,
  buildProgression,
  createProgressionDeck,
  majorKeyName,
  progressionSequence,
} from "./progressions";
import { validateChord } from "./chord-validator";

const names = (chords: { name: string }[]) => chords.map((c) => c.name);

describe("buildProgression", () => {
  it("builds ii–V–I in sevenths", () => {
    expect(names(buildProgression("ii-V-I", 0))).toEqual(["Dm7", "G7", "Cmaj7"]);
    expect(names(buildProgression("ii-V-I", 10))).toEqual(["Cm7", "F7", "Bbmaj7"]);
  });

  it("spells roots by the key signature (Bb, not A#; F#, not Gb)", () => {
    expect(names(buildProgression("I-V-vi-IV", 5))).toEqual(["F", "C", "Dm", "Bb"]);
    expect(names(buildProgression("I-V-vi-IV", 9))).toEqual(["A", "E", "F#m", "D"]);
    expect(names(buildProgression("I-vi-IV-V", 1))).toEqual(["Db", "Bbm", "Gb", "Ab"]);
    expect(names(buildProgression("I-vi-IV-V", 6))).toEqual(["F#", "D#m", "B", "C#"]);
  });

  it("builds the Canon and the 12-bar blues", () => {
    expect(names(buildProgression("canon", 2))).toEqual(["D", "A", "Bm", "F#m", "G", "D", "G", "A"]);
    expect(names(buildProgression("blues", 10))).toEqual([
      "Bb7", "Bb7", "Bb7", "Bb7", "Eb7", "Eb7", "Bb7", "Bb7", "F7", "Eb7", "Bb7", "F7",
    ]);
  });

  it("never spells a root with a sharp in a flat key", () => {
    for (const tonic of [5, 10, 3, 8, 1]) {
      for (const chord of buildProgression("canon", tonic)) expect(chord.name).not.toContain("#");
    }
  });

  it("gives pitch classes that make the chord", () => {
    for (const tonic of KEY_CYCLE) {
      for (const chord of buildProgression("ii-V-I", tonic)) {
        expect(validateChord(chord.name, chord.pitchClasses.map((pc) => 60 + pc))).toBe(true);
      }
    }
  });

  it("carries numerals and the key name", () => {
    const [ii] = buildProgression("ii-V-I", 3);
    expect(ii.numeral).toBe("ii7");
    expect(ii.keyName).toBe("Eb Major");
    expect(majorKeyName(6)).toBe("F# Major");
  });
});

describe("progressionSequence", () => {
  it("rotates through all 12 keys round the cycle of fourths", () => {
    const seq = progressionSequence("ii-V-I", "rotate");
    expect(seq).toHaveLength(36);
    expect(new Set(seq.map((c) => c.keyName)).size).toBe(12);
    expect(names(seq.slice(0, 9))).toEqual(["Dm7", "G7", "Cmaj7", "Gm7", "C7", "Fmaj7", "Cm7", "F7", "Bbmaj7"]);
  });
});

describe("createProgressionDeck", () => {
  it("deals in order, loops, and restarts on reset", () => {
    const deck = createProgressionDeck(buildProgression("ii-V-I", 0));
    expect([deck.next(), deck.next(), deck.next(), deck.next()].map((c) => c.name)).toEqual(["Dm7", "G7", "Cmaj7", "Dm7"]);
    deck.reset();
    expect(deck.next().name).toBe("Dm7");
  });
});
