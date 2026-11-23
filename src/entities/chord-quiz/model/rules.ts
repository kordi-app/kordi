/**
 * Chord-quiz scoring used for the instant, provisional feedback while playing.
 * The server (com.kordi_api.quiz.QuizRules) owns the rules: the time limit,
 * countdown and maximum come with each quiz session, and the score that is
 * shown on the result screen and saved is the one the server computes.
 */
export const QUIZ_POINTS_PER_SECOND = 10;

/** Provisional points for a correct answer given the time left on the clock (same formula as the server). */
export function scoreForTimeLeft(timeLeftMs: number): number {
  return Math.floor((timeLeftMs / 1000) * QUIZ_POINTS_PER_SECOND);
}
