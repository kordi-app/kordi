import type { ApiSchema } from "@/shared/api";

export type QuizDifficulty = ApiSchema<"Difficulty">;

/** Server ChordType enum (MAJOR, MINOR_SEVENTH, ...), not a chord symbol suffix. */
export type QuizChordType = ApiSchema<"ChordType">;

export type QuizChordItem = ApiSchema<"QuizChordResponse">;

/** A game opened on the server: its questions and the rules it is played by. */
export type QuizSession = ApiSchema<"QuizSessionResponse">;

/** What the player did on one question — the server judges it (notes, time taken). */
export type QuizAnswerSubmission = ApiSchema<"QuizAnswerRequest">;

/** The server's verdict on a whole game: per-question results, total, best and rank. */
export type QuizResult = ApiSchema<"QuizResultResponse">;

export type QuizQuestionResult = ApiSchema<"QuizQuestionResult">;

export type ScoreRecord = ApiSchema<"ScoreResponse">;

export type QuizPhase = "select" | "playing" | "result";

export type QuizAnswerResult = "correct" | "incorrect" | "timeout";

/**
 * One answered question as the client saw it. `result` and `score` are the local,
 * instant-feedback judgement; the saved score is the server's (see QuizResult).
 */
export interface QuizAnswer {
  result: QuizAnswerResult;
  score: number;
  /** MIDI notes held when the local check fired ([] on a timeout) */
  notes: number[];
  /** ms from the question appearing to the answer (the time limit on a timeout) */
  elapsedMs: number;
}

export interface QuizGameState {
  phase: QuizPhase;
  difficulty: QuizDifficulty | null;
  /** the server session this game is played in */
  sessionId: string | null;
  /** per-question time limit, from the server */
  timePerQuestionMs: number;
  /** best possible total, from the server */
  maxTotalScore: number;
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

/** The answers in the shape the server judges (one per question, in order). */
export function toSubmission(answers: QuizAnswer[]): QuizAnswerSubmission[] {
  return answers.map(({ notes, elapsedMs }) => ({ notes, elapsedMs }));
}
