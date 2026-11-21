import { CHORD_TEMPLATES, type ChordType } from "./chord-templates";
import { NOTE_INDEX } from "./note-names";
import { toPitchClasses } from "./pitch-class";

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

/**
 * Tensions a player may add to a seventh (or sixth) chord, as intervals above
 * the root — the colours a jazz voicing reaches for. A rootless right hand
 * (left hand on the root) is usually 3-5-7-9 or 3-7-9, so a Cmaj7 asked for
 * may be answered C + E G B D.
 */
const TENSIONS: Partial<Record<ChordType, number[]>> = {
  maj7: [2], // 9
  "7": [2, 9], // 9, 13
  m7: [2, 5], // 9, 11
  mMaj7: [2], // 9
  m7b5: [5], // 11
  "7sus4": [2], // 9
  "6": [2], // 9 (6/9)
  m6: [2], // 9
};

const PERFECT_FIFTH = 7;

/**
 * What the target asks for, relative to its root: the tones that must sound
 * (root, 3rd, 7th and any altered tone) and those that may (adding the
 * perfect 5th, which a four-or-more-note chord can drop, and the tensions).
 */
function chordRules(targetChordName: string) {
  const parsed = parseChordName(targetChordName);
  if (!parsed) return null;
  const template = CHORD_TEMPLATES[parsed.type];
  if (!template) return null;
  const fifthOptional = template.length >= 4 && template.includes(PERFECT_FIFTH);
  return {
    root: parsed.rootIndex,
    required: template.filter((interval) => !(fifthOptional && interval === PERFECT_FIFTH)),
    allowed: new Set([...template, ...(TENSIONS[parsed.type] ?? [])]),
  };
}

/** The played notes as intervals above `root` (pitch classes, deduplicated). */
const intervalsAbove = (root: number, midiNotes: number[]) =>
  toPitchClasses(midiNotes).map((pc) => (pc - root + 12) % 12);

/**
 * True while the played notes are part of the target but not yet enough of it —
 * a chord still being formed (or partly released), which shouldn't count as a
 * wrong answer.
 */
export function isPartialChord(targetChordName: string, playedMidiNotes: number[]): boolean {
  const rules = chordRules(targetChordName);
  if (!rules || playedMidiNotes.length === 0) return false;
  const played = intervalsAbove(rules.root, playedMidiNotes);
  return played.every((i) => rules.allowed.has(i)) && !rules.required.every((i) => played.includes(i));
}

/**
 * Whether the played notes make the target chord, in any octave or inversion:
 * every required tone is there, and nothing outside the chord and its
 * tensions. So a seventh chord may drop its 5th and add a 9th (or 11th/13th
 * where they fit) — LH root + RH rootless voicing counts. Triads are exact.
 */
export function validateChord(targetChordName: string, playedMidiNotes: number[]): boolean {
  if (playedMidiNotes.length === 0) return false;
  const rules = chordRules(targetChordName);
  if (!rules) return false;
  const played = intervalsAbove(rules.root, playedMidiNotes);
  return rules.required.every((i) => played.includes(i)) && played.every((i) => rules.allowed.has(i));
}
