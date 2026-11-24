import type { ApiSchema } from "@/shared/api";

/** Today's review: cards due now (weakest first), topped up with often-missed chords. */
export type ReviewDeck = ApiSchema<"ReviewDeckResponse">;

/** One chord to review, with its record and schedule (Leitner box 1–5, lower = weaker). */
export type ReviewCard = ApiSchema<"ReviewCardResponse">;

/** How one chord went in review mode (first try). */
export type ReviewOutcome = ApiSchema<"ReviewOutcomeRequest">;

export type ReviewResult = ApiSchema<"ReviewResultResponse">;

/** Cards fetched for one review session. */
export const REVIEW_DECK_SIZE = 10;
