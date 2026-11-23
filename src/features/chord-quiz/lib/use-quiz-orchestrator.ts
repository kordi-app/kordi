"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { HTTPError } from "ky";
import type { ActiveNote } from "@/entities/note";
import {
  toSubmission,
  type QuizAnswer,
  type QuizDifficulty,
  type QuizSession,
} from "@/entities/chord-quiz";
import { useQuizGameState } from "./use-quiz-game-state";
import { useQuizFeedback } from "./use-quiz-feedback";
import { useQuizTimer } from "./use-quiz-timer";
import { useQuizChordCheck } from "./use-quiz-chord-check";
import { startQuizSession, submitQuizResult } from "../api/quiz-session";
import { createValueStore } from "@/shared/lib/react/value-store";

/** the countdown display updates in these steps, not every frame */
const TIME_DISPLAY_STEP_MS = 100;

interface UseQuizOrchestratorArgs {
  activeNotes: ActiveNote[];
  isAudioStarted: boolean;
  startAudio: () => void;
}

/** A session opened on the server, waiting for the countdown to finish. */
interface PendingQuiz {
  difficulty: QuizDifficulty;
  session: QuizSession;
}

/**
 * Orchestrates the complete chord-quiz flow (difficulty select → countdown →
 * playing → result), hiding state/mutation/timer wiring from the page.
 *
 * The server owns the game: picking a difficulty opens a quiz session (questions
 * and rules come from it), each answer records the notes the player held and the
 * time it took, and the finished game is handed in for the server to judge. The
 * local check only drives instant feedback; the result screen and the saved
 * score are the server's.
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
  const [isFetching, setIsFetching] = useState(false);
  /** the last question set could not be loaded (network, server, or no questions) */
  const [loadFailed, setLoadFailed] = useState(false);
  const [pendingQuiz, setPendingQuiz] = useState<PendingQuiz | null>(null);

  const { state, startQuiz, answer, reset } = useQuizGameState();
  // The countdown changes every frame. Kept out of React state so only the
  // progress bar re-renders (10×/s via the store), not the page and keyboard;
  // the exact value is read from the ref when scoring an answer.
  const timeLeftRef = useRef(0);
  const [timeLeftStore] = useState(() => createValueStore(0));
  const tick = useCallback(
    (remaining: number) => {
      timeLeftRef.current = remaining;
      timeLeftStore.set(Math.ceil(remaining / TIME_DISPLAY_STEP_MS) * TIME_DISPLAY_STEP_MS);
    },
    [timeLeftStore],
  );
  const getTimeLeft = useCallback(() => timeLeftRef.current, []);
  const { feedbackState, showCorrect, showIncorrect, showTimeout } =
    useQuizFeedback();
  const resultMutation = useMutation({ mutationFn: submitQuizResult });

  const currentChord =
    state.phase === "playing" ? state.questions[state.currentIndex] : null;

  /** Opens a new server session (a fresh random question set) and shows the countdown. */
  const loadQuiz = useCallback(async (difficulty: QuizDifficulty) => {
    setIsFetching(true);
    setLoadFailed(false);
    try {
      const session = await startQuizSession(difficulty);
      if (session.questions.length > 0) setPendingQuiz({ difficulty, session });
      else setLoadFailed(true);
    } catch {
      // stay on the select screen with a message; the user can pick again
      setLoadFailed(true);
    } finally {
      setIsFetching(false);
    }
  }, []);

  /** the last question index answered — a timeout and an answer landing together count once */
  const answeredIndex = useRef(-1);

  /** Records an answer with the notes judged and the time it took on this question's clock. */
  const recordAnswer = useCallback(
    (next: Omit<QuizAnswer, "elapsedMs">) => {
      if (state.phase !== "playing" || !state.sessionId) return;
      if (answeredIndex.current === state.currentIndex) return;
      answeredIndex.current = state.currentIndex;
      const limit = state.timePerQuestionMs;
      // the timer pauses while the tab is hidden, so this is the time the question was on screen
      const elapsedMs =
        next.result === "timeout"
          ? limit
          : Math.min(limit, Math.max(0, Math.round(limit - timeLeftRef.current)));
      // the next question starts with a full clock (its first tick is a frame away)
      timeLeftRef.current = limit;
      const recorded: QuizAnswer = { ...next, elapsedMs };
      answer(recorded, state.currentIndex);

      const answers = [...state.answers, recorded];
      if (answers.length === state.questions.length) {
        resultMutation.mutate({ sessionId: state.sessionId, answers: toSubmission(answers) });
      }
    },
    [state, answer, resultMutation],
  );

  const handleTimeout = useCallback(() => {
    showTimeout();
    recordAnswer({ result: "timeout", score: 0, notes: [] });
  }, [recordAnswer, showTimeout]);

  useQuizTimer({
    duration: state.timePerQuestionMs,
    enabled: state.phase === "playing",
    resetKey: state.currentIndex,
    onTick: tick,
    onTimeout: handleTimeout,
  });

  const handleCorrect = useCallback(
    (score: number, notes: number[]) => {
      showCorrect();
      recordAnswer({ result: "correct", score, notes });
    },
    [recordAnswer, showCorrect],
  );

  const handleIncorrect = useCallback(
    (notes: number[]) => {
      showIncorrect();
      recordAnswer({ result: "incorrect", score: 0, notes });
    },
    [recordAnswer, showIncorrect],
  );

  useQuizChordCheck({
    currentChord,
    questionIndex: state.currentIndex,
    activeNotes,
    getTimeLeft,
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
    timeLeftRef.current = pendingQuiz.session.timePerQuestionMs;
    timeLeftStore.set(pendingQuiz.session.timePerQuestionMs);
    startQuiz(pendingQuiz.difficulty, pendingQuiz.session);
    setPendingQuiz(null);
  }, [pendingQuiz, startQuiz, timeLeftStore]);

  const handleRetry = useCallback(() => {
    const difficulty = state.difficulty;
    resultMutation.reset();
    reset();
    if (difficulty) void loadQuiz(difficulty);
  }, [state.difficulty, resultMutation, reset, loadQuiz]);

  /** Hands the same answers in again after a failed submit (the server answers a repeat with the same result). */
  const handleRetrySubmit = useCallback(() => {
    if (resultMutation.variables) resultMutation.mutate(resultMutation.variables);
  }, [resultMutation]);

  const handleBackToSelect = useCallback(() => {
    resultMutation.reset();
    setPendingQuiz(null);
    reset();
  }, [resultMutation, reset]);

  return {
    // flow state
    state,
    currentChord,
    feedbackState,
    timeLeft: timeLeftStore,
    showCountdown: pendingQuiz !== null,
    /** the server's countdown length, in whole seconds */
    countdownSeconds: pendingQuiz ? Math.round(pendingQuiz.session.countdownMs / 1000) : 0,
    isFetching,
    loadFailed,
    /** the server's verdict on the finished game (pending / error / data) */
    resultMutation,
    /**
     * Whether handing the game in again can help: not after the server rejected it
     * (4xx — the session is used up, expired or the answers broke the rules), only
     * after a network or server failure.
     */
    canRetrySubmit:
      resultMutation.isError &&
      !(
        resultMutation.error instanceof HTTPError &&
        resultMutation.error.response.status >= 400 &&
        resultMutation.error.response.status < 500
      ),
    // handlers
    handleSelectDifficulty,
    handleCountdownComplete,
    handleRetry,
    handleRetrySubmit,
    handleBackToSelect,
  };
}
