import { queryOptions } from "@tanstack/react-query";
import { getCourseRankings } from "./get-course-rankings";
import { getRankings } from "./get-rankings";
import type { RankedCourse, RankingDifficulty } from "../model/types";

export const rankingQueries = {
  list: (difficulty: RankingDifficulty) =>
    queryOptions({
      queryKey: ["ranking", difficulty],
      queryFn: () => getRankings(difficulty),
      staleTime: 30 * 1000,
    }),
  course: (course: RankedCourse) =>
    queryOptions({
      queryKey: ["ranking", "course", course],
      queryFn: () => getCourseRankings(course),
      staleTime: 30 * 1000,
    }),
};
