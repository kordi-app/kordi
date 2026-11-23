"use client";

import { useReducer, useCallback } from "react";
import {
  type QuizAnswer,
  type QuizChordItem,
  type QuizDifficulty,
  type QuizGameState,
} from "@/entities/chord-quiz";

const INITIAL_STATE: QuizGameState = {
  phase: "select",
  difficulty: null,
  questions: [],
  currentIndex: 0,
  answers: [],
};

type Action =
  | {
      type: "START_QUIZ";
      difficulty: QuizDifficulty;
      questions: QuizChordItem[];
    }
  | { type: "ANSWER"; answer: QuizAnswer; questionIndex: number }
  | { type: "RESET" };

function reducer(state: QuizGameState, action: Action): QuizGameState {
  switch (action.type) {
    case "START_QUIZ":
      return {
        ...INITIAL_STATE,
        phase: "playing",
        difficulty: action.difficulty,
        questions: action.questions,
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
    (difficulty: QuizDifficulty, questions: QuizChordItem[]) => {
      dispatch({ type: "START_QUIZ", difficulty, questions });
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
