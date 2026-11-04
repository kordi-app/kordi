import { NOTE_LABELS, type ChordType } from "./chord-templates";
import { keyLabels } from "./note-names";

export interface KeySignature {
  name: string;
  root: number;
  mode: "major" | "minor";
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

// Diatonic chord qualities for each scale degree
const MAJOR_DIATONIC: ChordType[] = ["", "m", "m", "", "", "m", "dim"];
const MINOR_DIATONIC: ChordType[] = ["m", "dim", "", "m", "m", "", ""];

// 7th chord qualities for each scale degree
const MAJOR_DIATONIC_7TH: ChordType[] = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"];
const MINOR_DIATONIC_7TH: ChordType[] = ["m7", "m7b5", "maj7", "m7", "m7", "maj7", "7"];

export function rootNameToIndex(name: string): number {
  const idx = NOTE_LABELS.indexOf(name as (typeof NOTE_LABELS)[number]);
  if (idx === -1) throw new Error(`Invalid root: ${name}`);
  return idx;
}

export function indexToRootName(index: number): string {
  return NOTE_LABELS[index % 12];
}

// Key names use signature-appropriate spellings (Bb Major, not A# Major).
export const ALL_KEYS: KeySignature[] = [
  ...NOTE_LABELS.map((_, i) => ({
    name: `${keyLabels(i, "major")[i]} Major`,
    root: i,
    mode: "major" as const,
  })),
  ...NOTE_LABELS.map((_, i) => ({
    name: `${keyLabels(i, "minor")[i]} minor`,
    root: i,
    mode: "minor" as const,
  })),
];

/** Whether a pitch class belongs to the key's (natural) scale. */
export function isInKey(key: KeySignature, pitchClass: number): boolean {
  const scale = key.mode === "major" ? MAJOR_SCALE : MINOR_SCALE;
  return scale.includes((((pitchClass - key.root) % 12) + 12) % 12);
}

export interface DiatonicChord {
  root: number;
  rootName: string;
  type: ChordType;
  name: string;
}

export function getDiatonicChords(
  key: KeySignature,
  allowedTypes: ChordType[]
): DiatonicChord[] {
  const scale = key.mode === "major" ? MAJOR_SCALE : MINOR_SCALE;
  const triads = key.mode === "major" ? MAJOR_DIATONIC : MINOR_DIATONIC;
  const sevenths = key.mode === "major" ? MAJOR_DIATONIC_7TH : MINOR_DIATONIC_7TH;
  const labels = keyLabels(key.root, key.mode);

  const chords: DiatonicChord[] = [];

  for (let degree = 0; degree < 7; degree++) {
    const root = (key.root + scale[degree]) % 12;
    const rootName = labels[root];

    // Try triad first, then 7th
    for (const type of [triads[degree], sevenths[degree]]) {
      if (allowedTypes.includes(type)) {
        chords.push({
          root,
          rootName,
          type,
          name: `${rootName}${type}`,
        });
      }
    }
  }

  // Deduplicate by name
  const seen = new Set<string>();
  return chords.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
}
