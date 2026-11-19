import { CHORD_TEMPLATES, type ChordType } from "./chord-templates";
import { NOTE_INDEX } from "./note-names";
import { toPitchClasses, pitchClassesEqual } from "./pitch-class";

// Longest suffix first so "m7b5" wins over "7" / "m" / "" when matching
const CHORD_TYPES_LONGEST_FIRST = Object.keys(CHORD_TEMPLATES).toSorted(
  (a, b) => b.length - a.length
);

function parseChordName(
  name: string
): { rootIndex: number; type: ChordType } | null {
  for (const type of CHORD_TYPES_LONGEST_FIRST) {
    if (!name.endsWith(type) && type !== "") continue;

    const rootStr = type === "" ? name : name.slice(0, -type.length);
    const rootIndex = NOTE_INDEX[rootStr];

    if (rootIndex !== undefined) {
      return { rootIndex, type: type as ChordType };
    }
  }

  const rootIndex = NOTE_INDEX[name];
  if (rootIndex !== undefined) {
    return { rootIndex, type: "" as ChordType };
  }

  return null;
}

export function validateChord(
  targetChordName: string,
  playedMidiNotes: number[]
): boolean {
  if (playedMidiNotes.length === 0) return false;

  const parsed = parseChordName(targetChordName);
  if (!parsed) return false;

  const template = CHORD_TEMPLATES[parsed.type];
  if (!template) return false;

  const expected = template
    .map((interval) => (interval + parsed.rootIndex) % 12)
    .sort((a, b) => a - b);

  const played = toPitchClasses(playedMidiNotes);

  return pitchClassesEqual(expected, played);
}
