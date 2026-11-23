import { bffClient } from "@/shared/api";
import type {
  QuizAnswerSubmission,
  QuizDifficulty,
  QuizResult,
  QuizSession,
} from "@/entities/chord-quiz";

/** Open a game: the server draws the questions and remembers them (and when it handed them out). */
export function startQuizSession(difficulty: QuizDifficulty): Promise<QuizSession> {
  return bffClient.post("quiz/sessions", { json: { difficulty } }).json<QuizSession>();
}

export interface SubmitQuizResultInput {
  sessionId: string;
  answers: QuizAnswerSubmission[];
}

/**
 * Hand in what was played; the server judges every answer, scores the game and records it.
 * Safe to retry with the same answers: a game already judged returns the same result.
 */
export function submitQuizResult({ sessionId, answers }: SubmitQuizResultInput): Promise<QuizResult> {
  return bffClient
    .post(`quiz/sessions/${encodeURIComponent(sessionId)}/result`, { json: { answers } })
    .json<QuizResult>();
}
