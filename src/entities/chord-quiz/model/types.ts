export type QuizDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface QuizChordItem {
  id: number;
  chordKey: string;
  chordType: string;
  name: string;
  notes: string;
  difficulty: QuizDifficulty;
}

export interface SaveScoreRequest {
  difficulty: QuizDifficulty;
  totalScore: number;
  correctCount: number;
  totalCount: number;
}

export interface ScoreRecord {
  id: number;
  difficulty: QuizDifficulty;
  totalScore: number;
  correctCount: number;
  totalCount: number;
  createdAt: string;
}

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
  timeLeft: number;
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
