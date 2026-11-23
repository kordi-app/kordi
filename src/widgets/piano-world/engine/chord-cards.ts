import {
  CHORD_TEMPLATES,
  bassLabel,
  chordToneLabel,
  displaySuffix,
  rootLabel,
} from "@/shared/lib/music";

/** The draw-a-chord deck: each card's mood line is an i18n key under home.world.cards. */
const DECK = [
  { key: "cmaj7", root: 0, suffix: "maj7" },
  { key: "am7", root: 9, suffix: "m7" },
  { key: "dm7", root: 2, suffix: "m7" },
  { key: "g7", root: 7, suffix: "7" },
  { key: "fmaj7", root: 5, suffix: "maj7" },
  { key: "em7", root: 4, suffix: "m7" },
  { key: "bm7b5", root: 11, suffix: "m7b5" },
  { key: "csus4", root: 0, suffix: "sus4" },
] as const;

export type ChordCardKey = (typeof DECK)[number]["key"];

export interface ChordCard {
  key: ChordCardKey;
  name: string;
  /** semitones above the diagram's first C (0–23) */
  positions: number[];
  labels: string[];
  /** MIDI notes to play, voiced from C4 */
  midi: number[];
}

export const CHORD_CARD_COUNT = DECK.length;

export function chordCard(index: number): ChordCard {
  const { key, root, suffix } = DECK[index % DECK.length];
  const template = CHORD_TEMPLATES[suffix];
  const rootName = rootLabel(root, suffix);
  return {
    key,
    name: `${rootName}${displaySuffix(suffix)}`,
    positions: template.map((interval) => root + interval),
    labels: template.map((interval) => {
      const pc = (root + interval) % 12;
      return chordToneLabel(rootName, pc, template) ?? bassLabel(pc);
    }),
    midi: template.map((interval) => 60 + root + interval),
  };
}
