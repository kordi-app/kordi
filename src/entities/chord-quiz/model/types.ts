import type { ApiSchema } from "@/shared/api";

export type QuizDifficulty = ApiSchema<"Difficulty">;

/** Server ChordType enum (MAJOR, MINOR_SEVENTH, ...), not a chord symbol suffix. */
export type QuizChordType = ApiSchema<"ChordType">;

export type QuizChordItem = ApiSchema<"QuizChordResponse">;

export type SaveScoreRequest = ApiSchema<"ScoreRequest">;

export type ScoreRecord = ApiSchema<"ScoreResponse">;

export type QuizPhase = "select" | "playing" | "result";

export type QuizAnswerResult = "correct" | "incorrect" | "timeout";

export interface QuizAnswer {
  result: QuizAnswerResult;
  score: number;
}

export interface QuizGameState {
  phase: QuizPhase;
  difficulty: QuizDifficulty | null;
  questions: QuizChordItem[];
  currentIndex: number;
  /** One entry per answered question, in order. */
  answers: QuizAnswer[];
}

/** Derived values — computed from `answers` rather than stored in state. */
export function getTotalScore(answers: QuizAnswer[]): number {
  return answers.reduce((sum, answer) => sum + answer.score, 0);
}

export function getCorrectCount(answers: QuizAnswer[]): number {
  return answers.filter((answer) => answer.result === "correct").length;
}
