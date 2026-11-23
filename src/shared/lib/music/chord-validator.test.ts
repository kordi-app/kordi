import { describe, expect, it } from "vitest";
import { isPartialChord, validateChord } from "./chord-validator";

describe("validateChord", () => {
  it("accepts the chord in any inversion or octave", () => {
    expect(validateChord("C", [60, 64, 67])).toBe(true);
    expect(validateChord("C", [64, 67, 72])).toBe(true);
    expect(validateChord("C", [48, 64, 79])).toBe(true);
  });

  it("rejects a different chord", () => {
    expect(validateChord("C", [60, 63, 67])).toBe(false); // Cm
    expect(validateChord("Cm", [60, 64, 67])).toBe(false);
  });

  it("rejects nothing played", () => {
    expect(validateChord("C", [])).toBe(false);
  });
});

describe("isPartialChord", () => {
  it("treats part of the target as still forming", () => {
    expect(isPartialChord("C", [60, 64])).toBe(true);
  });

  it("does not treat a wrong note as forming", () => {
    expect(isPartialChord("C", [60, 61])).toBe(false);
  });
});
