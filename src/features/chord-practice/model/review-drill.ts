import type { ReviewOutcome } from "@/entities/chord-review";

/** A chord to play in review mode. */
export interface ReviewItem {
  chordId: number;
  /** chord symbol as the quiz spells it (judged by the same check) */
  name: string;
}

export interface ReviewDrillState {
  status: "playing" | "done";
  /** what is left to play; the head is the current chord */
  queue: ReviewItem[];
  /** cards dealt at the start (for progress) */
  total: number;
  /** first-try result per chord, in the order they were settled — what the server records */
  outcomes: ReviewOutcome[];
  /** chords already sent round again (a missed chord comes back once, at the end) */
  requeued: number[];
  /** a wrong try was made on the current chord */
  currentMissed: boolean;
  /** changes with every new question (a repeated chord is still a fresh question) */
  questionKey: number;
}

export type ReviewDrillAction =
  | { type: "CORRECT" }
  | { type: "INCORRECT" }
  | { type: "SKIP" };

export function startReviewDrill(items: ReviewItem[]): ReviewDrillState {
  return {
    status: items.length === 0 ? "done" : "playing",
    queue: items,
    total: items.length,
    outcomes: [],
    requeued: [],
    currentMissed: false,
    questionKey: 0,
  };
}

/** the outcome list with this chord's first result added (later tries don't change it) */
function settle(outcomes: ReviewOutcome[], chordId: number, correct: boolean): ReviewOutcome[] {
  return outcomes.some((o) => o.chordId === chordId)
    ? outcomes
    : [...outcomes, { chordId, correct }];
}

/** move past the current chord; a missed one goes to the back of the queue once more */
function advance(state: ReviewDrillState, missed: boolean): ReviewDrillState {
  const [current, ...rest] = state.queue;
  const again = missed && !state.requeued.includes(current.chordId);
  const queue = again ? [...rest, current] : rest;
  return {
    ...state,
    status: queue.length === 0 ? "done" : "playing",
    queue,
    requeued: again ? [...state.requeued, current.chordId] : state.requeued,
    currentMissed: false,
    questionKey: state.questionKey + 1,
  };
}

/**
 * Review mode: each chord is scored on its first try. A wrong try stays on the
 * chord until it is played (or skipped); a missed chord is dealt once more at the
 * end so the drill ends on the right voicing — without changing its recorded result.
 */
export function reviewDrillReducer(
  state: ReviewDrillState,
  action: ReviewDrillAction,
): ReviewDrillState {
  const current = state.queue[0];
  if (state.status !== "playing" || !current) return state;
  switch (action.type) {
    case "CORRECT": {
      const outcomes = settle(state.outcomes, current.chordId, !state.currentMissed);
      return advance({ ...state, outcomes }, state.currentMissed);
    }
    case "INCORRECT":
      return {
        ...state,
        outcomes: settle(state.outcomes, current.chordId, false),
        currentMissed: true,
      };
    case "SKIP":
      return advance(
        { ...state, outcomes: settle(state.outcomes, current.chordId, false) },
        true,
      );
    default:
      return state;
  }
}

/** chords right on the first try */
export function firstTryCorrect(state: ReviewDrillState): number {
  return state.outcomes.filter((o) => o.correct).length;
}
