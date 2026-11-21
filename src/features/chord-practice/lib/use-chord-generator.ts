"use client";

import { useCallback, useMemo } from "react";
import {
  createChordDeck,
  generateChordPool,
  type ChordType,
  type GeneratedChord,
} from "@/shared/lib/music";
import { DIFFICULTY_CHORD_TYPES, type DrillSettings } from "@/entities/chord-practice";

function getChordTypes(settings: DrillSettings): ChordType[] {
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

  // a fresh deck whenever the pool changes (difficulty, chord types or key)
  const deck = useMemo(() => createChordDeck(pool), [pool]);

  const generateNext = useCallback(
    (previousName: string | null): GeneratedChord => deck.next(previousName),
    [deck]
  );

  return { generateNext, poolSize: pool.length };
}
