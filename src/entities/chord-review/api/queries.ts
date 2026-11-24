import { queryOptions } from "@tanstack/react-query";
import { getReviewDeck } from "./get-review-deck";

export const reviewQueries = {
  /** prefix for invalidating every review query (after a quiz or a review is saved) */
  all: () => ["review"] as const,
  deck: (limit: number) =>
    queryOptions({
      queryKey: ["review", "deck", limit] as const,
      queryFn: () => getReviewDeck(limit),
      // a quiz just finished elsewhere changes what is due
      staleTime: 0,
    }),
};
