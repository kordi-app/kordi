import { CHORD_TEMPLATES, type ChordType } from "./chord-templates";
import { NOTE_INDEX } from "./note-names";
import { toPitchClasses } from "./pitch-class";

// Longest suffix first so "m7b5" wins over "7" / "m" / "" when matching
const CHORD_TYPES_LONGEST_FIRST = Object.keys(CHORD_TEMPLATES).toSorted(
  (a, b) => b.length - a.length
);

/** Other spellings of a chord suffix the server data uses (e.g. "C69" for C6/9). */
const SUFFIX_ALIASES: readonly [RegExp, string][] = [[/69$/, "6/9"]];

/** A chord symbol's root (pitch class) and type ("Bbm7" → 10, "m7"); null if it isn't one. */
export function parseChordName(name: string): { rootIndex: number; type: ChordType } | null {
  const direct = parseCanonical(name);
  if (direct) return direct;
  for (const [pattern, canonical] of SUFFIX_ALIASES) {
    if (pattern.test(name)) return parseCanonical(name.replace(pattern, canonical));
  }
  return null;
}

function parseCanonical(
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
 * Tones an 11th or 13th chord may leave out, the way it is really played: no
 * hand holds all seven notes of a 13th, so the 5th, 9th and (on a 13th) the
 * 11th are optional, and a dominant 11th usually drops its 3rd (it clashes
 * with the 11th). What remains — root, 3rd, 7th and the named tension — is the
 * sound of the chord.
 */
const OPTIONAL: Partial<Record<ChordType, number[]>> = {
  "11": [4, 7, 2],
  m11: [7, 2],
  "13": [7, 2, 5],
  maj13: [7, 2, 5],
  m13: [7, 2, 5],
};

/**
 * What the target asks for, relative to its root: the tones that must sound
 * (root, 3rd, 7th and any altered tone) and those that may (adding the
 * perfect 5th, which a four-or-more-note chord can drop, and the tensions).
 */
function chordRules(targetChordName: string) {
  const parsed = parseChordName(targetChordName);
  return parsed ? rulesFor(parsed.rootIndex, parsed.type) : null;
}

function rulesFor(root: number, type: ChordType) {
  const template = CHORD_TEMPLATES[type];
  if (!template) return null;
  // only a chord with a 7th may drop its 5th: on a 6th or add9 chord the 5th is what keeps
  // it from being another chord (C–E–A is Am/C, not C6)
  const hasSeventh = template.includes(10) || template.includes(11);
  const fifthOptional = hasSeventh && template.includes(PERFECT_FIFTH);
  const optional = OPTIONAL[type] ?? [];
  return {
    type,
    template,
    root,
    required: template.filter(
      (interval) => !(fifthOptional && interval === PERFECT_FIFTH) && !optional.includes(interval),
    ),
    allowed: new Set([...template, ...(TENSIONS[type] ?? [])]),
  };
}

/** How the last answer to a chord question went, for feedback UI (null: nothing to show). */
export type AnswerFeedback = "correct" | "incorrect" | "timeout" | null;

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
  // "still forming" means only the chord's skeleton so far (its required tones, plus the 5th):
  // not its optional tensions — on a 13th those cover the whole scale, and any diatonic chord
  // would pass as "forming" and never count as wrong
  const core = new Set([...rules.required, ...(rules.template.includes(PERFECT_FIFTH) ? [PERFECT_FIFTH] : [])]);
  return played.every((i) => core.has(i)) && !rules.required.every((i) => played.includes(i));
}

const ALL_TYPES = Object.keys(CHORD_TEMPLATES) as ChordType[];

/** Does `played` (intervals above the root) make a chord with these rules? */
const matches = (rules: NonNullable<ReturnType<typeof chordRules>>, played: number[]) =>
  rules.required.every((i) => played.includes(i)) && played.every((i) => rules.allowed.has(i));

/**
 * Whether the played notes make the target chord, in any octave or inversion:
 * every required tone is there, and nothing outside the chord and its
 * tensions. So a seventh chord may drop its 5th and add a 9th (or 11th/13th
 * where they fit) — LH root + RH rootless voicing counts — and an 11th or
 * 13th needs only its core (see OPTIONAL). Triads are exact.
 *
 * `rivals` are the chord types that could be asked instead (a drill's pool). If
 * the notes also make one of them that extends the target — Cmaj9 played for a
 * Cmaj7 — they answer that chord, not this one; otherwise a pool holding both
 * could never teach the difference. Defaults to every chord type (strict).
 */
export function validateChord(
  targetChordName: string,
  playedMidiNotes: number[],
  rivals: readonly string[] = ALL_TYPES,
): boolean {
  if (playedMidiNotes.length === 0) return false;
  const rules = chordRules(targetChordName);
  if (!rules) return false;
  const played = intervalsAbove(rules.root, playedMidiNotes);
  if (!matches(rules, played)) return false;
  const target = new Set(rules.template);
  for (const type of rivals as ChordType[]) {
    const template = CHORD_TEMPLATES[type];
    if (!template || type === rules.type) continue;
    const extendsTarget = template.length > target.size && [...target].every((i) => template.includes(i));
    if (!extendsTarget) continue;
    const rival = rulesFor(rules.root, type);
    if (rival && matches(rival, played)) return false;
  }
  return true;
}
