"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActiveNote } from "@/entities/note";
import {
  quizQueries,
  getCorrectCount,
  getTotalScore,
  QUIZ_TIME_PER_QUESTION_MS,
  type QuizAnswer,
  type QuizChordItem,
  type QuizDifficulty,
} from "@/entities/chord-quiz";
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

/** Questions fetched and waiting for the countdown to finish. */
interface PendingQuiz {
  difficulty: QuizDifficulty;
  chords: QuizChordItem[];
}

/**
 * Orchestrates the complete chord-quiz flow (difficulty select → countdown →
 * playing → result), hiding state/mutation/timer wiring from the page.
 *
 * Every transition is driven from an event handler (select, countdown done,
 * answer, retry) rather than effects watching state, so there are no
 * "already started / already saved" guard flags to keep in sync.
 */
export function useQuizOrchestrator({
  activeNotes,
  isAudioStarted,
  startAudio,
}: UseQuizOrchestratorArgs) {
  const queryClient = useQueryClient();
  const [isFetching, setIsFetching] = useState(false);
  const [pendingQuiz, setPendingQuiz] = useState<PendingQuiz | null>(null);

  const { state, startQuiz, answer, tick, reset } = useQuizGameState();
  const { feedbackState, showCorrect, showIncorrect, showTimeout } =
    useQuizFeedback();
  const scoreMutation = useMutation({ mutationFn: saveScore });

  const currentChord =
    state.phase === "playing" ? state.questions[state.currentIndex] : null;

  /** Fetches a fresh random question set and shows the countdown. */
  const loadQuiz = useCallback(
    async (difficulty: QuizDifficulty) => {
      setIsFetching(true);
      try {
        // staleTime 0 → every call draws a new random set from the server
        const chords = await queryClient.fetchQuery(
          quizQueries.chords(difficulty),
        );
        if (chords.length > 0) setPendingQuiz({ difficulty, chords });
      } catch {
        // stay on the select screen; the user can pick again
      } finally {
        setIsFetching(false);
      }
    },
    [queryClient],
  );

  /** the last question index answered — a timeout and an answer landing together count once */
  const answeredIndex = useRef(-1);

  const recordAnswer = useCallback(
    (next: QuizAnswer) => {
      if (state.phase !== "playing" || !state.difficulty) return;
      if (answeredIndex.current === state.currentIndex) return;
      answeredIndex.current = state.currentIndex;
      answer(next, state.currentIndex);

      const answers = [...state.answers, next];
      if (answers.length === state.questions.length) {
        scoreMutation.mutate({
          difficulty: state.difficulty,
          totalScore: getTotalScore(answers),
          correctCount: getCorrectCount(answers),
          totalCount: answers.length,
        });
      }
    },
    [state, answer, scoreMutation],
  );

  const handleTimeout = useCallback(() => {
    showTimeout();
    recordAnswer({ result: "timeout", score: 0 });
  }, [recordAnswer, showTimeout]);

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
      recordAnswer({ result: "correct", score });
    },
    [recordAnswer, showCorrect],
  );

  const handleIncorrect = useCallback(() => {
    showIncorrect();
    recordAnswer({ result: "incorrect", score: 0 });
  }, [recordAnswer, showIncorrect]);

  useQuizChordCheck({
    currentChord,
    questionIndex: state.currentIndex,
    activeNotes,
    timeLeft: state.timeLeft,
    enabled: state.phase === "playing",
    onCorrect: handleCorrect,
    onIncorrect: handleIncorrect,
  });

  const handleSelectDifficulty = useCallback(
    (difficulty: QuizDifficulty) => {
      if (isFetching) return;
      if (!isAudioStarted) startAudio();
      void loadQuiz(difficulty);
    },
    [isFetching, isAudioStarted, startAudio, loadQuiz],
  );

  const handleCountdownComplete = useCallback(() => {
    if (!pendingQuiz) return;
    answeredIndex.current = -1;
    startQuiz(pendingQuiz.difficulty, pendingQuiz.chords);
    setPendingQuiz(null);
  }, [pendingQuiz, startQuiz]);

  const handleRetry = useCallback(() => {
    const difficulty = state.difficulty;
    scoreMutation.reset();
    reset();
    if (difficulty) void loadQuiz(difficulty);
  }, [state.difficulty, scoreMutation, reset, loadQuiz]);

  const handleBackToSelect = useCallback(() => {
    scoreMutation.reset();
    setPendingQuiz(null);
    reset();
  }, [scoreMutation, reset]);

  return {
    // flow state
    state,
    currentChord,
    feedbackState,
    showCountdown: pendingQuiz !== null,
    isFetching,
    scoreMutation,
    // handlers
    handleSelectDifficulty,
    handleCountdownComplete,
    handleRetry,
    handleBackToSelect,
  };
}
