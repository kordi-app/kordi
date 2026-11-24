import { describe, expect, it } from "vitest";
import { getChordHint } from "./chord-hint";
import { validateChord } from "./chord-validator";

describe("getChordHint", () => {
  it("voices a triad in root position at middle C", () => {
    expect(getChordHint("C")).toEqual({ midi: [60, 64, 67], labels: ["C", "E", "G"] });
  });

  it("keeps the chord near middle C (G3, not G4)", () => {
    expect(getChordHint("G")?.midi).toEqual([55, 59, 62]);
  });

  it("spells tones from the chord's own root", () => {
    expect(getChordHint("Bbmaj7")?.labels).toEqual(["Bb", "D", "F", "A"]);
    expect(getChordHint("Ebm")?.labels).toEqual(["Eb", "Gb", "Bb"]);
    expect(getChordHint("E")?.labels).toEqual(["E", "G#", "B"]);
  });

  it("stacks tensions above the 7th and stays on the keyboard", () => {
    const hint = getChordHint("C13")!;
    expect(hint.labels).toEqual(["C", "E", "G", "Bb", "D", "F", "A"]);
    for (let i = 1; i < hint.midi.length; i++) expect(hint.midi[i]).toBeGreaterThan(hint.midi[i - 1]);
    expect(Math.min(...hint.midi)).toBeGreaterThanOrEqual(48);
    expect(Math.max(...hint.midi)).toBeLessThanOrEqual(84);
  });

  it("is an accepted answer to the chord it hints", () => {
    for (const name of ["C", "F#m", "Bb7", "Dm7", "Abmaj7", "Bdim", "C#m7b5", "Gmaj9"]) {
      expect(validateChord(name, getChordHint(name)!.midi)).toBe(true);
    }
  });

  it("returns null for a non-chord", () => {
    expect(getChordHint("H7")).toBeNull();
  });
});
