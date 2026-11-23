"use client";

import { useEffect, useMemo, useState } from "react";
import { useChordCheck } from "@/shared/lib/music/use-chord-check";
import type { ActiveNote } from "@/entities/note";
import { scoreForTimeLeft, type QuizChordItem } from "@/entities/chord-quiz";

const CHECK_COOLDOWN_MS = 600;

interface UseQuizChordCheckOptions {
  currentChord: QuizChordItem | null;
  /** the question's index (a repeated chord is still a new question) */
  questionIndex: number;
  activeNotes: ActiveNote[];
  /** remaining time right now (read when an answer lands, so the timer never re-renders this) */
  getTimeLeft: () => number;
  enabled: boolean;
  /** provisional score (instant feedback) and the notes that were judged */
  onCorrect: (score: number, notes: number[]) => void;
  onIncorrect: (notes: number[]) => void;
}

export function useQuizChordCheck({
  currentChord,
  questionIndex,
  activeNotes,
  getTimeLeft,
  enabled,
  onCorrect,
  onIncorrect,
}: UseQuizChordCheckOptions) {
  const midiNotes = useMemo(() => activeNotes.map((n) => n.midi), [activeNotes]);

  // a chord held from the previous answer is ignored during the cooldown; check
  // once more when it ends so a chord still held then counts (not every frame)
  const [checkTick, setCheckTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(() => setCheckTick((n) => n + 1), CHECK_COOLDOWN_MS + 20);
    return () => clearTimeout(id);
  }, [questionIndex, enabled]);

  useChordCheck({
    targetChordName: currentChord?.name ?? null,
    questionKey: questionIndex,
    midiNotes,
    enabled,
    minNotesToCheck: 2,
    // Wait for the hand to settle: without this, the 3rd key of a 4+ note
    // chord is judged as a wrong answer before the chord can be completed
    debounceMs: 150,
    finalizeIncorrect: true,
    cooldownMs: CHECK_COOLDOWN_MS,
    revalidateKey: checkTick,
    onCorrect: (notes) => onCorrect(scoreForTimeLeft(getTimeLeft()), notes),
    onIncorrect,
  });
}
