"use client";

import { useReducer, useCallback } from "react";
import type { DrillState, DrillChord } from "@/entities/chord-practice";

export const INITIAL_STATE: DrillState = {
  status: "idle",
  currentChord: null,
  nextChord: null,
  score: 0,
  streak: 0,
  bestStreak: 0,
  totalAttempted: 0,
  totalCorrect: 0,
  wrongTries: 0,
  lastResult: null,
};

export type DrillAction =
  | { type: "START"; current: DrillChord; next: DrillChord }
  | { type: "STOP" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "MARK_CORRECT"; next: DrillChord }
  | { type: "MARK_INCORRECT" }
  | { type: "MARK_TIMEOUT"; next: DrillChord }
  | { type: "RESET" };

/** exported for tests */
export function drillReducer(state: DrillState, action: DrillAction): DrillState {
  switch (action.type) {
    case "START":
      return {
        ...INITIAL_STATE,
        status: "playing",
        currentChord: action.current,
        nextChord: action.next,
      };
    case "STOP":
      return { ...state, status: "idle" };
    case "PAUSE":
      return { ...state, status: "paused" };
    case "RESUME":
      return { ...state, status: "playing" };
    case "MARK_CORRECT": {
      const newStreak = state.streak + 1;
      return {
        ...state,
        score: state.score + 1,
        streak: newStreak,
        bestStreak: Math.max(state.bestStreak, newStreak),
        totalAttempted: state.totalAttempted + 1,
        totalCorrect: state.totalCorrect + 1,
        lastResult: "correct",
        currentChord: state.nextChord,
        nextChord: action.next,
      };
    }
    case "MARK_INCORRECT":
      return {
        ...state,
        streak: 0,
        wrongTries: state.wrongTries + 1,
        lastResult: "incorrect",
      };
    case "MARK_TIMEOUT":
      return {
        ...state,
        streak: 0,
        totalAttempted: state.totalAttempted + 1,
        lastResult: "timeout",
        currentChord: state.nextChord,
        nextChord: action.next,
      };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

export function useDrillState() {
  const [state, dispatch] = useReducer(drillReducer, INITIAL_STATE);

  const start = useCallback(
    (current: DrillChord, next: DrillChord) =>
      dispatch({ type: "START", current, next }),
    []
  );
  const stop = useCallback(() => dispatch({ type: "STOP" }), []);
  const pause = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const resume = useCallback(() => dispatch({ type: "RESUME" }), []);
  const markCorrect = useCallback(
    (next: DrillChord) => dispatch({ type: "MARK_CORRECT", next }),
    []
  );
  const markIncorrect = useCallback(
    () => dispatch({ type: "MARK_INCORRECT" }),
    []
  );
  const markTimeout = useCallback(
    (next: DrillChord) => dispatch({ type: "MARK_TIMEOUT", next }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    state,
    start,
    stop,
    pause,
    resume,
    markCorrect,
    markIncorrect,
    markTimeout,
    reset,
  };
}
