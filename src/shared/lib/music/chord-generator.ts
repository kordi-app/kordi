import { CHORD_TEMPLATES, type ChordType } from "./chord-templates";
import { rootLabel } from "./note-names";
import { ALL_KEYS, getDiatonicChords } from "./music-theory";

export interface GeneratedChord {
  name: string;
  rootIndex: number;
  type: ChordType;
  pitchClasses: number[];
}

function buildPitchClasses(rootIndex: number, type: ChordType): number[] {
  const template = CHORD_TEMPLATES[type];
  return template.map((interval) => (interval + rootIndex) % 12).sort((a, b) => a - b);
}

export function generateChordPool(
  allowedTypes: ChordType[],
  keyFilter: string | null
): GeneratedChord[] {
  if (keyFilter) {
    const key = ALL_KEYS.find((k) => k.name === keyFilter);
    const diatonic = key ? getDiatonicChords(key, allowedTypes) : [];
    // none of the chosen chord types fits the key (say, only aug in a major key):
    // practise them in every key rather than deal from an empty deck
    if (diatonic.length > 0) {
      return diatonic.map((dc) => ({
        name: dc.name,
        rootIndex: dc.root,
        type: dc.type,
        pitchClasses: buildPitchClasses(dc.root, dc.type),
      }));
    }
  }

  // Any key: all 12 roots × allowed types
  const pool: GeneratedChord[] = [];
  for (let root = 0; root < 12; root++) {
    for (const type of allowedTypes) {
      pool.push({
        name: `${rootLabel(root, type)}${type}`,
        rootIndex: root,
        type,
        pitchClasses: buildPitchClasses(root, type),
      });
    }
  }
  return pool;
}

/**
 * Deals chords like a shuffled deck: every chord in the pool comes up once
 * before any repeats, then the deck is reshuffled — never the same chord twice
 * in a row, even across a reshuffle. (Plain random picks bunch up: in 20 draws
 * from 12 chords, a couple turn up three or four times and others never.)
 * `random` is injectable for tests.
 */
export function createChordDeck(pool: readonly GeneratedChord[], random: () => number = Math.random) {
  if (pool.length === 0) throw new Error("Chord pool is empty");
  let deck: GeneratedChord[] = [];

  const shuffle = () => {
    const cards = [...pool];
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  };

  return {
    next(previousName: string | null): GeneratedChord {
      if (pool.length === 1) return pool[0];
      if (deck.length === 0) {
        deck = shuffle();
        // the new deck's first card mustn't repeat the one just played
        if (deck[deck.length - 1].name === previousName) [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
      }
      return deck.pop()!;
    },
  };
}
