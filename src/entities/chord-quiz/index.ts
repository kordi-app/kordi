// Client-safe exports only. For server-only APIs (getMyScores),
// import from "@/entities/chord-quiz/server" instead.
export type {
  QuizDifficulty,
  QuizChordItem,
  SaveScoreRequest,
  ScoreRecord,
  QuizPhase,
  QuizAnswerResult,
  QuizAnswer,
  QuizGameState,
} from "./model/types";
export { getTotalScore, getCorrectCount } from "./model/types";
export {
  QUIZ_QUESTIONS_PER_GAME,
  QUIZ_TIME_PER_QUESTION_MS,
  QUIZ_MAX_SCORE_PER_QUESTION,
  QUIZ_MAX_TOTAL_SCORE,
  scoreForTimeLeft,
} from "./model/rules";
export { quizQueries } from "./api/queries";
