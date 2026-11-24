export type {
  RankingEntry,
  RankingDifficulty,
  RankingScope,
  CourseRankingEntry,
  RankedCourse,
} from "./model/types";
export { getCourseRankings } from "./api/get-course-rankings";
export { getRankings } from "./api/get-rankings";
export { rankingQueries } from "./api/queries";
