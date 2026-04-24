"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { ActiveNote } from "@/entities/note";
import { quizQueries, type QuizDifficulty } from "@/entities/quiz";
import { useQuizGameState } from "./use-quiz-game-state";
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
  const [showCountdown, setShowCountdown] = useState(false);
  const quizStartedRef = useRef(false);
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
    ...quizQueries.chords(selectedDifficulty!),
    enabled: selectedDifficulty !== null,
  });

  const scoreMutation = useMutation({ mutationFn: saveScore });

  // Start countdown once chords are loaded and difficulty selected
  useEffect(() => {
    if (
      chords &&
      chords.length > 0 &&
      selectedDifficulty &&
      state.phase === "select" &&
      !quizStartedRef.current
    ) {
      quizStartedRef.current = true;
      setShowCountdown(true);
    }
  }, [chords, selectedDifficulty, state.phase]);

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
    duration: 20000,
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
    setShowCountdown(false);
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

  const handleRetry = useCallback(() => {
    scoreMutation.reset();
    scoreSavedRef.current = false;
    quizStartedRef.current = false;
    setShowCountdown(false);
    reset();
    if (selectedDifficulty) {
      const kept = selectedDifficulty;
      setSelectedDifficulty(null);
      setTimeout(() => setSelectedDifficulty(kept), 0);
    }
  }, [selectedDifficulty, reset, scoreMutation]);

  const handleBackToSelect = useCallback(() => {
    scoreMutation.reset();
    scoreSavedRef.current = false;
    quizStartedRef.current = false;
    setShowCountdown(false);
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
