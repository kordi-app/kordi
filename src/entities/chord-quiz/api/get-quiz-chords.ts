import { bffClient } from "@/shared/api";
import type { QuizChordItem, QuizDifficulty } from "../model/types";

export function getQuizChords(
  difficulty: QuizDifficulty,
): Promise<QuizChordItem[]> {
  return bffClient
    .get("quiz/chords", { searchParams: { difficulty } })
    .json<QuizChordItem[]>();
}
