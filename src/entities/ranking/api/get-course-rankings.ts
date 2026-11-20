import { publicApiClient, unwrap, type ApiEnvelope } from "@/shared/api";
import type { CourseRankingEntry, RankedCourse } from "../model/types";

/** All-time top times on a jump course (public). */
export function getCourseRankings(course: RankedCourse): Promise<CourseRankingEntry[]> {
  return publicApiClient
    .get("course-rankings", { searchParams: { course } })
    .json<ApiEnvelope<CourseRankingEntry[]>>()
    .then(unwrap);
}
