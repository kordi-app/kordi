export interface RankingEntry {
  nickname: string;
  profileImageUrl: string | null;
  totalScore: number;
  correctCount: number;
  totalCount: number;
}

export type RankingDifficulty = "EASY" | "MEDIUM" | "HARD";

/** Jump courses in the home world (their region names). */
export type RankedCourse = "clouds" | "night";

export interface CourseRankingEntry {
  rank: number;
  nickname: string;
  profileImageUrl: string | null;
  timeMs: number;
}
