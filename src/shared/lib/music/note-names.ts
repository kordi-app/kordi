import { NOTE_LABELS } from "./chord-templates";

// Display spellings follow chart convention. Identity everywhere else (DB rows,
// stored quiz names, pitch-class math) stays sharp-based NOTE_LABELS.
//
// Major-family roots prefer flats (Db, Eb, Ab, Bb) with F# kept sharp; minor/dim
// roots prefer C#/G# (C#m is standard where Dbm is not).
const MAJOR_ROOT_LABELS = [
  "C", "Db", "D", "Eb", "E", "F",
  "F#", "G", "Ab", "A", "Bb", "B",
] as const;
const MINOR_ROOT_LABELS = [
  "C", "C#", "D", "Eb", "E", "F",
  "F#", "G", "G#", "A", "Bb", "B",
] as const;
const FLAT_LABELS = [
  "C", "Db", "D", "Eb", "E", "F",
  "Gb", "G", "Ab", "A", "Bb", "B",
] as const;

// m7, m9, mMaj7, madd9, m6/9, … but not maj7/maj9/maj13
const MINOR_FAMILY = /^(m(?!aj)|dim)/;

/**
 * Chart-convention spelling for a chord suffix: the major 7th is written M, not
 * maj ("maj7" → "M7", "mMaj7" → "mM7", "dim(maj7)" → "dim(M7)", "+Maj7" → "+M7").
 * Display only — identity (DB rows, CHORD_TEMPLATES keys, answer matching) keeps
 * "maj", so this must not be fed back into rootLabel or the validator.
 */
export function displaySuffix(suffix: string): string {
  return suffix.replace(/maj/gi, "M");
}

/** Chart-convention spelling for a chord root, picked by chord quality. */
export function rootLabel(root: number, suffix: string): string {
  const labels = MINOR_FAMILY.test(suffix) ? MINOR_ROOT_LABELS : MAJOR_ROOT_LABELS;
  return labels[((root % 12) + 12) % 12];
}

/** Chart-convention spelling for a bare note (slash basses, note captions). */
export function bassLabel(pitchClass: number): string {
  return MAJOR_ROOT_LABELS[((pitchClass % 12) + 12) % 12];
}

/** Every accepted spelling → pitch class. */
export const NOTE_INDEX: Record<string, number> = Object.fromEntries([
  ...NOTE_LABELS.map((n, i) => [n, i] as const),
  ...FLAT_LABELS.map((n, i) => [n, i] as const),
]);

const ROOT_TOKEN = /^([A-G][#b]?)(.*)$/;
const NOTE_ONLY = /^[A-G][#b]?$/;

/**
 * Re-spell a stored (sharp-based) chord name for display: "A#m7" → "Bbm7",
 * "D#aug" → "Ebaug". Handles a trailing slash bass ("Em7/A#" → "Em7/Bb")
 * without breaking 6/9-style suffixes ("C6/9" has no bass).
 */
export function toDisplayChordName(name: string): string {
  let chord = name;
  let bass: string | null = null;

  const slash = name.lastIndexOf("/");
  if (slash > 0 && NOTE_ONLY.test(name.slice(slash + 1))) {
    chord = name.slice(0, slash);
    bass = name.slice(slash + 1);
  }

  const match = chord.match(ROOT_TOKEN);
  if (match && NOTE_INDEX[match[1]] !== undefined) {
    // rootLabel needs the raw suffix — MINOR_FAMILY keys off the stored "maj".
    chord = `${rootLabel(NOTE_INDEX[match[1]], match[2])}${displaySuffix(match[2])}`;
  }
  if (bass !== null && NOTE_INDEX[bass] !== undefined) {
    bass = bassLabel(NOTE_INDEX[bass]);
  }

  return bass === null ? chord : `${chord}/${bass}`;
}

// Keys on the sharp side of the circle of fifths (D, E, F#, G, A, B major and
// their relative minors) spell their notes with sharps; everything else flats.
const SHARP_SIDE_MAJORS = new Set([2, 4, 6, 7, 9, 11]);

/** Note spellings appropriate to a key signature (minor via relative major). */
export function keyLabels(
  root: number,
  mode: "major" | "minor",
): readonly string[] {
  const relativeMajor = mode === "major" ? root : (root + 3) % 12;
  return SHARP_SIDE_MAJORS.has(relativeMajor) ? NOTE_LABELS : FLAT_LABELS;
}
