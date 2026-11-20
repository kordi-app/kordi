"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChordCheck } from "@/shared/lib/music/use-chord-check";
import type { ActiveNote } from "@/entities/note";
import type { DrillResult } from "@/entities/chord-practice";

const COOLDOWN_MS = 600;
const INCORRECT_FLASH_MS = 500;

interface UseChordValidatorOptions {
  activeNotes: ActiveNote[];
  targetChordName: string | null;
  /** changes with every new chord (so a repeated chord is still a fresh question) */
  questionKey?: unknown;
  enabled: boolean;
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function useChordValidator({
  activeNotes,
  targetChordName,
  questionKey,
  enabled,
  onCorrect,
  onIncorrect,
}: UseChordValidatorOptions) {
  const [feedbackState, setFeedbackState] = useState<DrillResult>(null);
  const midiNotes = useMemo(() => activeNotes.map((n) => n.midi), [activeNotes]);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Don't let a pending "incorrect" flash fire after unmount
  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

  useChordCheck({
    targetChordName,
    questionKey,
    midiNotes,
    enabled,
    debounceMs: 150,
    cooldownMs: COOLDOWN_MS,
    onCorrect: () => {
      setFeedbackState("correct");
      onCorrect();
    },
    onIncorrect: () => {
      setFeedbackState("incorrect");
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => {
        setFeedbackState((s) => (s === "incorrect" ? null : s));
      }, INCORRECT_FLASH_MS);
      onIncorrect();
    },
  });

  // Clear leftover feedback once the next chord's cooldown expires
  useEffect(() => {
    const timer = setTimeout(() => setFeedbackState(null), COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [targetChordName]);

  return { feedbackState };
}
