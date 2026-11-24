import { CHORD_TEMPLATES, type ChordType } from "./chord-templates";
import type { GeneratedChord } from "./chord-generator";
import { keyLabels } from "./note-names";

export type ProgressionId = "ii-V-I" | "I-V-vi-IV" | "I-vi-IV-V" | "canon" | "blues";

/** A key for progression practice: a major tonic (pitch class), or every key in turn. */
export type ProgressionKey = number | "rotate";

/** One step of a progression: semitones above the tonic, chord type, roman numeral. */
type Step = readonly [offset: number, type: ChordType, numeral: string];

const PROGRESSIONS: Record<ProgressionId, readonly Step[]> = {
  // the jazz cadence, in sevenths
  "ii-V-I": [[2, "m7", "ii7"], [7, "7", "V7"], [0, "maj7", "Imaj7"]],
  "I-V-vi-IV": [[0, "", "I"], [7, "", "V"], [9, "m", "vi"], [5, "", "IV"]],
  "I-vi-IV-V": [[0, "", "I"], [9, "m", "vi"], [5, "", "IV"], [7, "", "V"]],
  // Pachelbel's Canon
  canon: [
    [0, "", "I"], [7, "", "V"], [9, "m", "vi"], [4, "m", "iii"],
    [5, "", "IV"], [0, "", "I"], [5, "", "IV"], [7, "", "V"],
  ],
  // 12-bar blues, one chord a bar, with the V7 turnaround
  blues: [
    [0, "7", "I7"], [0, "7", "I7"], [0, "7", "I7"], [0, "7", "I7"],
    [5, "7", "IV7"], [5, "7", "IV7"], [0, "7", "I7"], [0, "7", "I7"],
    [7, "7", "V7"], [5, "7", "IV7"], [0, "7", "I7"], [7, "7", "V7"],
  ],
};

export const PROGRESSION_IDS = Object.keys(PROGRESSIONS) as ProgressionId[];

/** Keys round the cycle of fourths (C, F, Bb, Eb …), the way players practise a progression in all 12. */
export const KEY_CYCLE: readonly number[] = Array.from({ length: 12 }, (_, i) => (i * 5) % 12);

export interface ProgressionChord extends GeneratedChord {
  /** the chord's function in the key ("ii7", "V7", "I") */
  numeral: string;
  /** the key it is in, spelled by its signature ("Bb Major") */
  keyName: string;
}

/** The key's display name, by its signature: Bb Major, F# Major. */
export function majorKeyName(tonic: number): string {
  return `${keyLabels(tonic, "major")[((tonic % 12) + 12) % 12]} Major`;
}

/**
 * A progression in one major key, its chord roots spelled by the key's
 * signature (Bb7 in F, not A#7; F#m in A).
 */
export function buildProgression(id: ProgressionId, tonic: number): ProgressionChord[] {
  const labels = keyLabels(tonic, "major");
  const keyName = majorKeyName(tonic);
  return PROGRESSIONS[id].map(([offset, type, numeral]) => {
    const rootIndex = (tonic + offset) % 12;
    return {
      name: `${labels[rootIndex]}${type}`,
      rootIndex,
      type,
      pitchClasses: CHORD_TEMPLATES[type].map((i) => (i + rootIndex) % 12).sort((a, b) => a - b),
      numeral,
      keyName,
    };
  });
}

/** The whole sequence to loop: the progression in one key, or once in each key round the cycle of fourths. */
export function progressionSequence(id: ProgressionId, key: ProgressionKey): ProgressionChord[] {
  if (key !== "rotate") return buildProgression(id, key);
  return KEY_CYCLE.flatMap((tonic) => buildProgression(id, tonic));
}

/** Deals a sequence in order, round and round; restarts from the top on reset(). */
export function createProgressionDeck(sequence: readonly ProgressionChord[]) {
  if (sequence.length === 0) throw new Error("Progression is empty");
  let index = 0;
  return {
    next(): ProgressionChord {
      const chord = sequence[index % sequence.length];
      index++;
      return chord;
    },
    reset() {
      index = 0;
    },
  };
}
