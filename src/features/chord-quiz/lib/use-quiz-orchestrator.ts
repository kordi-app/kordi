"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { ActiveNote } from "@/entities/note";
import { quizQueries, type QuizDifficulty } from "@/entities/chord-quiz";
import {
  useQuizGameState,
  QUIZ_TIME_PER_QUESTION_MS,
} from "./use-quiz-game-state";
import { useQuizFeedback } from "./use-quiz-feedback";
import { useQuizTimer } from "./use-quiz-timer";
import { useQuizChordCheck } from "./use-quiz-chord-check";
import { saveScore } from "../api/save-score";

interface UseQuizOrchestratorArgs {
  activeNotes: ActiveNote[];
  isAudioStarted: boolean;
  startAudio: () => void;
}

/**
 * Orchestrates the complete chord-quiz flow (difficulty select → countdown →
 * playing → result), hiding state/mutation/timer wiring from the page.
 */
export function useQuizOrchestrator({
  activeNotes,
  isAudioStarted,
  startAudio,
}: UseQuizOrchestratorArgs) {
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<QuizDifficulty | null>(null);
  const scoreSavedRef = useRef(false);

  const {
    state,
    startQuiz,
    answerCorrect,
    answerIncorrect,
    answerTimeout,
    tick,
    reset,
  } = useQuizGameState();

  const { feedbackState, showCorrect, showIncorrect, showTimeout } =
    useQuizFeedback();

  const { data: chords, isFetching } = useQuery({
    // Fallback key when null; gated by `enabled` so no network request fires.
    ...quizQueries.chords(selectedDifficulty ?? "EASY"),
    enabled: selectedDifficulty !== null,
  });

  const scoreMutation = useMutation({ mutationFn: saveScore });

  // The countdown is simply the "select" phase with everything needed to start.
  // startQuiz moves the machine to "playing", which ends it.
  const showCountdown =
    state.phase === "select" &&
    selectedDifficulty !== null &&
    chords !== undefined &&
    chords.length > 0;

  // Save score once quiz enters "result" phase
  useEffect(() => {
    if (state.phase !== "result" || !state.difficulty || scoreSavedRef.current) {
      return;
    }
    scoreSavedRef.current = true;
    scoreMutation.mutate({
      difficulty: state.difficulty,
      totalScore: state.totalScore,
      correctCount: state.answers.filter((a) => a === "correct").length,
      totalCount: state.questions.length,
    });
  }, [
    state.phase,
    state.difficulty,
    state.totalScore,
    state.answers,
    state.questions.length,
    scoreMutation,
  ]);

  const currentChord =
    state.phase === "playing" ? state.questions[state.currentIndex] : null;

  const handleTimeout = useCallback(() => {
    showTimeout();
    answerTimeout();
  }, [answerTimeout, showTimeout]);

  useQuizTimer({
    duration: QUIZ_TIME_PER_QUESTION_MS,
    enabled: state.phase === "playing",
    resetKey: state.currentIndex,
    onTick: tick,
    onTimeout: handleTimeout,
  });

  const handleCorrect = useCallback(
    (score: number) => {
      showCorrect();
      answerCorrect(score);
    },
    [answerCorrect, showCorrect],
  );

  const handleIncorrect = useCallback(() => {
    showIncorrect();
    answerIncorrect();
  }, [answerIncorrect, showIncorrect]);

  useQuizChordCheck({
    currentChord,
    activeNotes,
    timeLeft: state.timeLeft,
    enabled: state.phase === "playing",
    onCorrect: handleCorrect,
    onIncorrect: handleIncorrect,
  });

  const handleCountdownComplete = useCallback(() => {
    if (selectedDifficulty && chords) {
      startQuiz(selectedDifficulty, chords);
    }
  }, [selectedDifficulty, chords, startQuiz]);

  const handleSelectDifficulty = useCallback(
    (difficulty: QuizDifficulty) => {
      if (!isAudioStarted) startAudio();
      setSelectedDifficulty(difficulty);
    },
    [isAudioStarted, startAudio],
  );

  // reset() returns the machine to "select" with the difficulty still chosen and
  // the chords still cached, so the countdown restarts on its own.
  const handleRetry = useCallback(() => {
    scoreMutation.reset();
    scoreSavedRef.current = false;
    reset();
  }, [reset, scoreMutation]);

  const handleBackToSelect = useCallback(() => {
    scoreMutation.reset();
    scoreSavedRef.current = false;
    setSelectedDifficulty(null);
    reset();
  }, [reset, scoreMutation]);

  return {
    // flow state
    state,
    currentChord,
    feedbackState,
    showCountdown,
    isFetching,
    scoreMutation,
    // handlers
    handleSelectDifficulty,
    handleCountdownComplete,
    handleRetry,
    handleBackToSelect,
  };
}
