import { CHORD_TEMPLATES } from "./chord-templates";
import { parseChordName } from "./chord-validator";
import { bassLabel, chordToneLabel } from "./note-names";

export interface ChordHint {
  /** the chord in root position, stacked upward from its root, near middle C */
  midi: number[];
  /** its tones spelled from the chord's root, root first ("Bb", "D", "F") */
  labels: string[];
}

/** The practice keyboard's range (C3–C6): a hint never falls off it. */
const LOWEST = 48;
const HIGHEST = 84;
/** Hints are centred on D4, just above middle C. */
const CENTRE = 62;

const ROOT_TOKEN = /^[A-G][#b]?/;

/**
 * The tones of a chord, to show a player who is stuck: a root-position voicing
 * (each template interval stacked above the last, so a 9th sits above the 7th)
 * placed so the chord is centred near middle C, and the note names spelled
 * from the chord's own root — so Bbmaj7 reads Bb · D · F · A, not A# · D · F · A.
 *
 * Pass the name as displayed (key-spelled, or via toDisplayChordName for
 * sharp-based stored names). Null if the name isn't a chord.
 */
export function getChordHint(chordName: string): ChordHint | null {
  const parsed = parseChordName(chordName);
  if (!parsed) return null;
  const template = CHORD_TEMPLATES[parsed.type];

  const stacked: number[] = [];
  for (const interval of template) {
    let next = interval;
    const previous = stacked[stacked.length - 1];
    while (previous !== undefined && next <= previous) next += 12;
    stacked.push(next);
  }
  const span = stacked[stacked.length - 1];

  let root = LOWEST + ((((parsed.rootIndex - LOWEST) % 12) + 12) % 12);
  let best = root;
  for (; root + span <= HIGHEST; root += 12) {
    if (Math.abs(root + span / 2 - CENTRE) < Math.abs(best + span / 2 - CENTRE)) best = root;
  }

  const rootName = chordName.match(ROOT_TOKEN)?.[0] ?? bassLabel(parsed.rootIndex);
  const labels = template.map((interval) => {
    const pc = (parsed.rootIndex + interval) % 12;
    return chordToneLabel(rootName, pc, template) ?? bassLabel(pc);
  });

  return { midi: stacked.map((interval) => best + interval), labels };
}
