"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  createChordDeck,
  createProgressionDeck,
  generateChordPool,
  progressionSequence,
  type ChordType,
  type GeneratedChord,
} from "@/shared/lib/music";
import { DIFFICULTY_CHORD_TYPES, type DrillChord, type DrillSettings } from "@/entities/chord-practice";

export function getChordTypes(settings: DrillSettings): ChordType[] {
  if (settings.difficulty === "custom") {
    return settings.customChordTypes;
  }
  return DIFFICULTY_CHORD_TYPES[settings.difficulty];
}

type Deck = { next: (previousName: string | null) => DrillChord };

export function useChordGenerator(settings: DrillSettings) {
  const isProgression = settings.chordSource === "progression";
  const chordTypes = getChordTypes(settings);

  const pool = useMemo(
    () => (isProgression ? null : generateChordPool(chordTypes, settings.keyFilter)),
    [isProgression, chordTypes, settings.keyFilter],
  );
  const sequence = useMemo(
    () => (isProgression ? progressionSequence(settings.progression, settings.progressionKey) : null),
    [isProgression, settings.progression, settings.progressionKey],
  );

  // the chord types in play: a voicing that makes another of them answers that one
  const types = useMemo(
    () => (sequence ? [...new Set(sequence.map((chord) => chord.type))] : chordTypes),
    [sequence, chordTypes],
  );

  // a fresh deck whenever the chords change (difficulty, types, key or progression). Kept in a
  // ref: a memo may be thrown away and recomputed, which would reshuffle (or rewind) mid-cycle.
  const source = sequence ?? pool;
  const deck = useRef<{ source: typeof source; deck: Deck } | null>(null);

  const makeDeck = useCallback((): Deck => {
    if (sequence) {
      const progression = createProgressionDeck(sequence);
      return { next: () => progression.next() };
    }
    return createChordDeck(pool as GeneratedChord[]);
  }, [sequence, pool]);

  const generateNext = useCallback(
    (previousName: string | null): DrillChord => {
      if (deck.current?.source !== source) deck.current = { source, deck: makeDeck() };
      return deck.current.deck.next(previousName);
    },
    [source, makeDeck],
  );

  /** Start over: a progression from its first chord, a random deck freshly shuffled. */
  const restart = useCallback(() => {
    deck.current = null;
  }, []);

  return { generateNext, restart, types };
}
