"use client";

import { useState, useCallback, useRef } from "react";
import {
  playCorrectSound,
  playIncorrectSound,
  playTimeoutSound,
} from "@/shared/lib/audio";

type FeedbackType = "correct" | "incorrect" | "timeout" | null;

export function useQuizFeedback() {
  const [feedbackState, setFeedbackState] = useState<FeedbackType>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearFeedback = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedbackState(null);
  }, []);

  const showCorrect = useCallback(() => {
    clearFeedback();
    playCorrectSound();
    setFeedbackState("correct");
    timerRef.current = setTimeout(() => setFeedbackState(null), 300);
  }, [clearFeedback]);

  const showIncorrect = useCallback(() => {
    clearFeedback();
    playIncorrectSound();
    setFeedbackState("incorrect");
    timerRef.current = setTimeout(() => setFeedbackState(null), 500);
  }, [clearFeedback]);

  const showTimeout = useCallback(() => {
    clearFeedback();
    playTimeoutSound();
    setFeedbackState("timeout");
    timerRef.current = setTimeout(() => setFeedbackState(null), 500);
  }, [clearFeedback]);

  return { feedbackState, showCorrect, showIncorrect, showTimeout };
}
