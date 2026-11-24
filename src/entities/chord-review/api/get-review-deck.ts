import { bffClient } from "@/shared/api";
import type { ReviewDeck } from "../model/types";

export function getReviewDeck(limit: number): Promise<ReviewDeck> {
  return bffClient.get("review/deck", { searchParams: { limit } }).json<ReviewDeck>();
}
