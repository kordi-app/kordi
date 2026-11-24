"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getChordHint, type ChordHint } from "@/shared/lib/music";

/** A chord left unanswered this long shows its tones. */
export const HINT_DELAY_MS = 6000;

const NONE = Symbol("no hint");

interface UseDrillHintOptions {
  /** the chord being asked for */
  chordName: string | null;
  /** changes with every new question (so a repeated chord starts without a hint) */
  questionKey: unknown;
  /** the drill is running (the wait only counts then) */
  active: boolean;
  /** the player wants hints */
  enabled: boolean;
}

/**
 * When to show the current chord's tones: after a wrong answer (reveal()) or
 * once the chord has waited HINT_DELAY_MS unanswered. The hint stays until
 * the question changes.
 */
export function useDrillHint({ chordName, questionKey, active, enabled }: UseDrillHintOptions) {
  const [shownFor, setShownFor] = useState<unknown>(NONE);

  useEffect(() => {
    if (!enabled || !active) return;
    const timer = setTimeout(() => setShownFor(questionKey), HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enabled, active, questionKey]);

  const reveal = useCallback(() => setShownFor(questionKey), [questionKey]);
  /** forget any hint (a new run restarts its question count) */
  const clear = useCallback(() => setShownFor(NONE), []);

  const showing = enabled && chordName !== null && shownFor === questionKey;
  const hint: ChordHint | null = useMemo(
    () => (showing && chordName ? getChordHint(chordName) : null),
    [showing, chordName],
  );

  return { hint, reveal, clear };
}
