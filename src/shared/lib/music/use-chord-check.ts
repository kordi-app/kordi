"use client";

import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { validateChord } from "./chord-validator";

/** Wrong answers only count once at least this many notes are pressed. */
const INCORRECT_MIN_NOTES = 3;

interface UseChordCheckOptions {
  targetChordName: string | null;
  midiNotes: number[];
  enabled: boolean;
  /** Delay after the last note change before validating. 0 = immediate. */
  debounceMs?: number;
  /** Grace period after the target changes, so keys held from the previous answer are ignored. */
  cooldownMs?: number;
  /** Minimum pressed notes required to attempt validation. */
  minNotesToCheck?: number;
  /** When true, a wrong answer also locks the question (one-shot mode). */
  finalizeIncorrect?: boolean;
  /** Extra dependency that re-triggers validation while notes are held (e.g. a timer tick). */
  revalidateKey?: unknown;
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function useChordCheck({
  targetChordName,
  midiNotes,
  enabled,
  debounceMs = 0,
  cooldownMs = 600,
  minNotesToCheck = 1,
  finalizeIncorrect = false,
  revalidateKey,
  onCorrect,
  onIncorrect,
}: UseChordCheckOptions) {
  const answeredRef = useRef(false);
  const lastChangeRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportCorrect = useEffectEvent(() => onCorrect());
  const reportIncorrect = useEffectEvent(() => onIncorrect());

  useEffect(() => {
    answeredRef.current = false;
    lastChangeRef.current = performance.now();
  }, [targetChordName]);

  useEffect(() => {
    if (!enabled || !targetChordName || answeredRef.current) return;
    if (midiNotes.length < minNotesToCheck) return;
    if (performance.now() - lastChangeRef.current < cooldownMs) return;

    const check = () => {
      if (validateChord(targetChordName, midiNotes)) {
        answeredRef.current = true;
        reportCorrect();
      } else if (midiNotes.length >= INCORRECT_MIN_NOTES) {
        if (finalizeIncorrect) answeredRef.current = true;
        reportIncorrect();
      }
    };

    if (debounceMs > 0) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(check, debounceMs);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    check();
  }, [
    midiNotes,
    targetChordName,
    enabled,
    debounceMs,
    cooldownMs,
    minNotesToCheck,
    finalizeIncorrect,
    revalidateKey,
  ]);

  const reset = useCallback(() => {
    answeredRef.current = false;
    lastChangeRef.current = 0;
  }, []);

  return { reset };
}
