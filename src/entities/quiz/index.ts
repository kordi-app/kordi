// Client-safe exports only. For server-only APIs (getMyScores),
// import from "@/entities/quiz/server" instead.
export type {
  QuizDifficulty,
  QuizChordItem,
  SaveScoreRequest,
  ScoreRecord,
  QuizPhase,
  QuizGameState,
} from "./model/types";
export { quizQueries } from "./api/queries";
