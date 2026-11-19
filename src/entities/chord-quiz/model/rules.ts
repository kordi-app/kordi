/**
 * Chord-quiz game rules. Must match the server's QuizRules
 * (server: com.kordi_api.quiz.QuizRules) — the server rejects scores above
 * these limits, so change both sides together.
 */
export const QUIZ_QUESTIONS_PER_GAME = 10;
export const QUIZ_TIME_PER_QUESTION_MS = 20_000;
export const QUIZ_POINTS_PER_SECOND = 10;
export const QUIZ_MAX_SCORE_PER_QUESTION =
  (QUIZ_TIME_PER_QUESTION_MS / 1000) * QUIZ_POINTS_PER_SECOND;
export const QUIZ_MAX_TOTAL_SCORE =
  QUIZ_MAX_SCORE_PER_QUESTION * QUIZ_QUESTIONS_PER_GAME;

/** Points for a correct answer given the time left on the clock. */
export function scoreForTimeLeft(timeLeftMs: number): number {
  return Math.floor((timeLeftMs / 1000) * QUIZ_POINTS_PER_SECOND);
}
