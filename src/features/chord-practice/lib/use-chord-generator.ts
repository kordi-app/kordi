"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  createChordDeck,
  generateChordPool,
  type ChordType,
  type GeneratedChord,
} from "@/shared/lib/music";
import { DIFFICULTY_CHORD_TYPES, type DrillSettings } from "@/entities/chord-practice";

export function getChordTypes(settings: DrillSettings): ChordType[] {
  if (settings.difficulty === "custom") {
    return settings.customChordTypes;
  }
  return DIFFICULTY_CHORD_TYPES[settings.difficulty];
}

export function useChordGenerator(settings: DrillSettings) {
  const chordTypes = getChordTypes(settings);

  const pool = useMemo(
    () => generateChordPool(chordTypes, settings.keyFilter),
    [chordTypes, settings.keyFilter]
  );

  // a fresh deck whenever the pool changes (difficulty, chord types or key). Kept in a ref:
  // a memo may be thrown away and recomputed, which would reshuffle mid-cycle.
  const deck = useRef<{ pool: typeof pool; deck: ReturnType<typeof createChordDeck> } | null>(null);

  const generateNext = useCallback(
    (previousName: string | null): GeneratedChord => {
      if (deck.current?.pool !== pool) deck.current = { pool, deck: createChordDeck(pool) };
      return deck.current.deck.next(previousName);
    },
    [pool]
  );

  return { generateNext, poolSize: pool.length };
}
