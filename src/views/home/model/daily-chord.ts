import {
  CHORD_TEMPLATES,
  bassLabel,
  chordToneLabel,
  displaySuffix,
  rootLabel,
} from "@/shared/lib/music";

/** Chord qualities in the daily rotation, with their i18n key. */
const DAILY_QUALITIES = [
  { suffix: "", key: "major" },
  { suffix: "m", key: "minor" },
  { suffix: "7", key: "dominant7" },
  { suffix: "maj7", key: "major7" },
  { suffix: "m7", key: "minor7" },
  { suffix: "sus4", key: "sus4" },
  { suffix: "dim", key: "diminished" },
  { suffix: "m7b5", key: "halfDiminished" },
] as const;

export type DailyQualityKey = (typeof DAILY_QUALITIES)[number]["key"];

export interface ChordTone {
  /** Semitones above the keyboard's first C (0–23), root in the lower octave. */
  position: number;
  label: string;
}

export interface DailyChord {
  name: string;
  qualityKey: DailyQualityKey;
  tones: ChordTone[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * The chord of the day — the same for everyone on a given Korean calendar day.
 * Roots walk the circle of fifths while the quality cycles independently, so
 * consecutive days differ in both root and colour.
 */
export function getDailyChord(now: Date = new Date()): DailyChord {
  const day = Math.floor((now.getTime() + KST_OFFSET_MS) / DAY_MS);
  const root = (day * 7) % 12;
  const quality = DAILY_QUALITIES[day % DAILY_QUALITIES.length];
  const template = CHORD_TEMPLATES[quality.suffix];
  const rootName = rootLabel(root, quality.suffix);

  return {
    name: `${rootName}${displaySuffix(quality.suffix)}`,
    qualityKey: quality.key,
    tones: template.map((interval) => {
      const pitchClass = (root + interval) % 12;
      return {
        position: root + interval,
        label: chordToneLabel(rootName, pitchClass, template) ?? bassLabel(pitchClass),
      };
    }),
  };
}
