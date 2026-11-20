"use client";

import { useMemo } from "react";
import { useChordCheck } from "@/shared/lib/music/use-chord-check";
import type { ActiveNote } from "@/entities/note";
import { scoreForTimeLeft, type QuizChordItem } from "@/entities/chord-quiz";

interface UseQuizChordCheckOptions {
  currentChord: QuizChordItem | null;
  /** the question's index (a repeated chord is still a new question) */
  questionIndex: number;
  activeNotes: ActiveNote[];
  timeLeft: number;
  enabled: boolean;
  onCorrect: (score: number) => void;
  onIncorrect: () => void;
}

export function useQuizChordCheck({
  currentChord,
  questionIndex,
  activeNotes,
  timeLeft,
  enabled,
  onCorrect,
  onIncorrect,
}: UseQuizChordCheckOptions) {
  const midiNotes = useMemo(() => activeNotes.map((n) => n.midi), [activeNotes]);

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
    // Timer ticks re-run validation so a chord held through the cooldown still registers
    revalidateKey: timeLeft,
    onCorrect: () => onCorrect(scoreForTimeLeft(timeLeft)),
    onIncorrect,
  });
}
