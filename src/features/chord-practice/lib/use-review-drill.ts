"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActiveNote } from "@/entities/note";
import { reviewQueries, type ReviewOutcome } from "@/entities/chord-review";
import { postReviewResults } from "../api/post-review-results";
import {
  reviewDrillReducer,
  startReviewDrill,
  type ReviewDrillAction,
  type ReviewDrillState,
  type ReviewItem,
} from "../model/review-drill";
import { useChordValidator } from "./use-chord-validator";

/**
 * Today's review: drill a fixed deck of chords (no metronome — take your time),
 * judged by the same chord check as free practice. The step that plays the last
 * chord also hands the first-try results to the server.
 *
 * `state` is null until `start` is called with the deck.
 */
export function useReviewDrill(activeNotes: ActiveNote[]) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ReviewDrillState | null>(null);

  const save = useMutation({
    mutationFn: (outcomes: ReviewOutcome[]) => postReviewResults(outcomes),
    onSettled: () => queryClient.invalidateQueries({ queryKey: reviewQueries.all() }),
  });

  const step = (type: ReviewDrillAction["type"]) => {
    if (!state) return;
    const next = reviewDrillReducer(state, { type });
    setState(next);
    if (state.status === "playing" && next.status === "done" && next.outcomes.length > 0) {
      save.mutate(next.outcomes);
    }
  };

  const current = state?.status === "playing" ? (state.queue[0] ?? null) : null;

  const { feedbackState } = useChordValidator({
    activeNotes,
    targetChordName: current?.name ?? null,
    questionKey: state?.questionKey,
    enabled: current !== null,
    onCorrect: () => step("CORRECT"),
    onIncorrect: () => step("INCORRECT"),
  });

  const start = (items: ReviewItem[]) => {
    save.reset();
    setState(startReviewDrill(items));
  };

  const retrySave = () => {
    if (state && state.outcomes.length > 0) save.mutate(state.outcomes);
  };

  return {
    state,
    current,
    feedbackState,
    save,
    start,
    skip: () => step("SKIP"),
    retrySave,
    /** back to the deck screen */
    reset: () => setState(null),
  };
}
