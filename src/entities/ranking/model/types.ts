import type { ApiSchema } from "@/shared/api";

export type RankingEntry = ApiSchema<"RankingResponse">;

export type RankingDifficulty = ApiSchema<"Difficulty">;

/**
 * Jump courses in the home world (their region names). The server takes a plain
 * string here (validated against its Course enum), so the spec can't type it.
 */
export type RankedCourse = "clouds" | "night" | "ruins";

export type CourseRankingEntry = ApiSchema<"CourseRankingResponse">;
