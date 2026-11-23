"use client";

import { useReducer, useCallback } from "react";
import {
  type QuizAnswer,
  type QuizDifficulty,
  type QuizGameState,
  type QuizSession,
} from "@/entities/chord-quiz";

const INITIAL_STATE: QuizGameState = {
  phase: "select",
  difficulty: null,
  sessionId: null,
  timePerQuestionMs: 0,
  maxTotalScore: 0,
  questions: [],
  currentIndex: 0,
  answers: [],
};

type Action =
  | { type: "START_QUIZ"; difficulty: QuizDifficulty; session: QuizSession }
  | { type: "ANSWER"; answer: QuizAnswer; questionIndex: number }
  | { type: "RESET" };

function reducer(state: QuizGameState, action: Action): QuizGameState {
  switch (action.type) {
    case "START_QUIZ":
      return {
        ...INITIAL_STATE,
        phase: "playing",
        difficulty: action.difficulty,
        sessionId: action.session.sessionId,
        timePerQuestionMs: action.session.timePerQuestionMs,
        maxTotalScore: action.session.maxTotalScore,
        questions: action.session.questions,
      };
    case "ANSWER": {
      // A timeout and a correct chord can land in the same frame — only the first counts
      if (state.phase !== "playing" || action.questionIndex !== state.currentIndex) return state;
      const answers = [...state.answers, action.answer];
      const isLast = answers.length >= state.questions.length;
      return {
        ...state,
        answers,
        currentIndex: isLast ? state.currentIndex : state.currentIndex + 1,
        phase: isLast ? "result" : "playing",
      };
    }
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

export function useQuizGameState() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const startQuiz = useCallback(
    (difficulty: QuizDifficulty, session: QuizSession) => {
      dispatch({ type: "START_QUIZ", difficulty, session });
    },
    [],
  );

  /** Answer question `questionIndex`; ignored if that question was already answered. */
  const answer = useCallback((answer: QuizAnswer, questionIndex: number) => {
    dispatch({ type: "ANSWER", answer, questionIndex });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return { state, startQuiz, answer, reset };
}
