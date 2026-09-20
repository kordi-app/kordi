import { CHORD_TEMPLATES, type ChordType } from "./chord-templates";
import { rootLabel, bassLabel, displaySuffix } from "./note-names";
import { toPitchClasses, pitchClassesEqual } from "./pitch-class";

// Detection priority, simple/common first. Kept explicit because plain object
// iteration hoists integer-like keys ("5", "6", "7", …) ahead of everything else,
// which silently scrambles the intended order.
const DETECTION_PRIORITY: ChordType[] = [
  // triads
  "", "m", "dim", "aug", "sus2", "sus4",
  // power chord
  "5",
  // 4-note
  "maj7", "7", "m7", "mMaj7", "dim7", "dim(maj7)", "m7b5",
  "+Maj7", "7#5", "7b5", "7sus4", "6", "m6", "add9", "madd9",
  // 5-note
  "maj9", "9", "m9", "m(maj9)", "6/9", "m6/9", "9sus4",
  "9#5", "9b5", "7#9", "7b9", "7#11", "maj7#11",
  // 6-note
  "maj9#11", "9#11", "11", "m11", "13sus4", "13b9", "13#9", "7alt",
  // 7-note
  "maj13#11", "maj13", "13#11", "13", "m13",
];

// Templates added later but missing from the priority list still get detected (last).
const DETECTION_ORDER: [ChordType, number[]][] = [
  ...DETECTION_PRIORITY,
  ...(Object.keys(CHORD_TEMPLATES) as ChordType[]).filter(
    (k) => !DETECTION_PRIORITY.includes(k),
  ),
].map((k) => [k, CHORD_TEMPLATES[k]]);

// Real voicings freely omit non-defining tones, so exact-template matching alone
// misreads tension chords (LH C + RH Bb·D is C9, not A#add9/C). Omittable degrees:
//  - perfect 5th (7): any 4+ note chord
//  - the 3rd (3/4): only when a 7th keeps the quality readable (shell voicings)
//    and the 5th is perfect — altered-fifth chords need their 3rd
//  - the 9th (2): 11th/13th chords, where it's a stacked lower tension
//  - the 11th (5): 13th chords only (in an 11th chord it's the defining top note)
// The root and the 7th are never omittable — naming a 9/11/13 without its 7th
// would announce a tone the player never voiced.
function omittableIntervals(template: number[]): number[] {
  if (template.length < 4) return [];
  const out: number[] = [];
  if (template.includes(7)) {
    out.push(7);
    if (template.includes(10) || template.includes(11)) {
      if (template.includes(4)) out.push(4);
      else if (template.includes(3)) out.push(3);
    }
  }
  if (template.length >= 6 && template.includes(2)) out.push(2);
  if (template.length >= 7 && template.includes(5)) out.push(5);
  return out;
}

// Every legal omission combination of every template, fewest omissions first so a
// closer-to-complete reading always wins (e.g. m7-no5 beats 7#9-no3-no5 for 1-b3-b7).
// Checked only when no full template matches, so they never override an exact match.
const REDUCED_ORDER: [ChordType, number[]][] = (() => {
  const variants: {
    suffix: ChordType;
    reduced: number[];
    omitted: number;
    priority: number;
  }[] = [];
  DETECTION_ORDER.forEach(([suffix, template], priority) => {
    const omittable = omittableIntervals(template);
    for (let mask = 1; mask < 1 << omittable.length; mask++) {
      const omit = omittable.filter((_, i) => mask & (1 << i));
      const reduced = template.filter((iv) => !omit.includes(iv));
      if (reduced.length < 3) continue;
      variants.push({ suffix, reduced, omitted: omit.length, priority });
    }
  });
  variants.sort((a, b) => a.omitted - b.omitted || a.priority - b.priority);
  return variants.map((v) => [v.suffix, v.reduced]);
})();

function matchRoots(pitchClasses: number[], template: number[]): number[] {
  if (pitchClasses.length !== template.length) return [];

  const roots: number[] = [];
  for (let root = 0; root < 12; root++) {
    const rotated = template
      .map((interval) => (interval + root) % 12)
      .sort((a, b) => a - b);
    if (pitchClassesEqual(rotated, pitchClasses)) {
      roots.push(root);
    }
  }
  return roots;
}

function collectCandidates(
  pitchClasses: number[],
  order: [ChordType, number[]][],
): { root: number; suffix: ChordType }[] {
  const candidates: { root: number; suffix: ChordType }[] = [];
  for (const [suffix, template] of order) {
    for (const root of matchRoots(pitchClasses, template)) {
      candidates.push({ root, suffix });
    }
  }
  return candidates;
}

export interface DetectedChord {
  /** Main display name */
  primary: string;
  /** Slash form shown as a small caption for casual (close-position) inversions */
  secondary: string | null;
}

export function detectChord(midiNotes: number[]): DetectedChord | null {
  if (midiNotes.length < 1) return null;

  const pitchClasses = toPitchClasses(midiNotes);
  const bass = Math.min(...midiNotes) % 12;

  const fullCandidates = collectCandidates(pitchClasses, DETECTION_ORDER);

  // The bass note decides between enharmonic sets (C6 vs Am7, Csus2 vs Gsus4, …)
  const rootedFull = fullCandidates.find((c) => c.root === bass);
  if (rootedFull) {
    return {
      primary: `${rootLabel(rootedFull.root, rootedFull.suffix)}${displaySuffix(rootedFull.suffix)}`,
      secondary: null,
    };
  }

  // Omitted-tone reading rooted at the bass (e.g. C-E-Bb → C7, C-Bb-D → C9)
  const reducedCandidates = collectCandidates(pitchClasses, REDUCED_ORDER);
  const rootedReduced = reducedCandidates.find((c) => c.root === bass);
  if (rootedReduced) {
    return {
      primary: `${rootLabel(rootedReduced.root, rootedReduced.suffix)}${displaySuffix(rootedReduced.suffix)}`,
      secondary: null,
    };
  }

  // Bass isn't any candidate's root → inversion.
  const best = fullCandidates[0] ?? reducedCandidates[0];
  if (!best) return null;

  const rootName = `${rootLabel(best.root, best.suffix)}${displaySuffix(best.suffix)}`;
  const slashName = `${rootName}/${bassLabel(bass)}`;

  // A bass isolated an octave+ below the rest reads as a deliberate bass line →
  // the slash chord IS the name. A close-position inversion (e.g. right-hand
  // A-D-F#) reads as plain D, with the slash form as an informative caption.
  const sorted = [...new Set(midiNotes)].sort((a, b) => a - b);
  const hasIsolatedBass = sorted.length >= 2 && sorted[1] - sorted[0] >= 12;

  return hasIsolatedBass
    ? { primary: slashName, secondary: null }
    : { primary: rootName, secondary: slashName };
}
