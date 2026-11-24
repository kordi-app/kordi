import { queryOptions } from "@tanstack/react-query";
import { getCourseRankings } from "./get-course-rankings";
import { getRankings } from "./get-rankings";
import type { RankedCourse, RankingDifficulty, RankingScope } from "../model/types";

export const rankingQueries = {
  list: (difficulty: RankingDifficulty, scope: RankingScope = "ALL") =>
    queryOptions({
      queryKey: ["ranking", difficulty, scope],
      queryFn: () => getRankings(difficulty, scope),
      staleTime: 30 * 1000,
    }),
  course: (course: RankedCourse, scope: RankingScope = "ALL") =>
    queryOptions({
      queryKey: ["ranking", "course", course, scope],
      queryFn: () => getCourseRankings(course, scope),
      staleTime: 30 * 1000,
    }),
};
