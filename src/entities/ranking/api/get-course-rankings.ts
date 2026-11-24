import { bffClient, publicApiClient, unwrap, type ApiEnvelope } from "@/shared/api";
import type { CourseRankingEntry, RankedCourse, RankingScope } from "../model/types";

/** All-time top times on a jump course (public), or among me and my friends (via the BFF). */
export function getCourseRankings(
  course: RankedCourse,
  scope: RankingScope = "ALL",
): Promise<CourseRankingEntry[]> {
  if (scope === "FRIENDS") {
    return bffClient
      .get("course-rankings", { searchParams: { course, scope } })
      .json<CourseRankingEntry[]>();
  }
  return publicApiClient
    .get("course-rankings", { searchParams: { course } })
    .json<ApiEnvelope<CourseRankingEntry[]>>()
    .then(unwrap);
}
