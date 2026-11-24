import { bffClient } from "@/shared/api";
import type { ReviewOutcome, ReviewResult } from "@/entities/chord-review";

/** Record how each chord went in review mode; the server moves it along its review schedule. */
export function postReviewResults(results: ReviewOutcome[]): Promise<ReviewResult> {
  return bffClient.post("review/results", { json: { results } }).json<ReviewResult>();
}
