"use client";

import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { isPartialChord, validateChord } from "./chord-validator";

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
  /**
   * Identifies the question (e.g. its index). A new question starts fresh even when it
   * asks for the same chord as the last one — keying on the chord name alone would treat
   * a repeated chord as already answered.
   */
  questionKey?: unknown;
  /**
   * Chord types that could be asked instead (a drill's pool). A voicing that makes a
   * more-extended rival (Cmaj9 for Cmaj7) answers that one, not the target. Omit for strict.
   */
  rivals?: readonly string[];
  /** Extra dependency that re-triggers validation while notes are held (e.g. a timer tick). */
  revalidateKey?: unknown;
  /** Called with the notes that were judged (the ones held when the check fired). */
  onCorrect: (notes: number[]) => void;
  onIncorrect: (notes: number[]) => void;
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
  questionKey,
  rivals,
  onCorrect,
  onIncorrect,
}: UseChordCheckOptions) {
  const answeredRef = useRef(false);
  const lastChangeRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** which target+notes the pending debounced check is for */
  const pendingKeyRef = useRef<string | null>(null);
  const enabledRef = useRef(enabled);
  const reportCorrect = useEffectEvent((notes: number[]) => onCorrect(notes));
  const reportIncorrect = useEffectEvent((notes: number[]) => onIncorrect(notes));

  useEffect(() => {
    answeredRef.current = false;
    lastChangeRef.current = performance.now();
    // a check still pending for the previous question must not judge this one
    // (e.g. a chord finished just before a timeout would score the next question)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      pendingKeyRef.current = null;
    }
  }, [targetChordName, questionKey]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled && debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      pendingKeyRef.current = null;
    }
  }, [enabled]);

  // drop a pending check on unmount
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !targetChordName || answeredRef.current) return;
    if (midiNotes.length < minNotesToCheck) return;
    if (performance.now() - lastChangeRef.current < cooldownMs) return;

    const check = () => {
      if (validateChord(targetChordName, midiNotes, rivals)) {
        answeredRef.current = true;
        reportCorrect(midiNotes);
      } else if (midiNotes.length >= INCORRECT_MIN_NOTES && !isPartialChord(targetChordName, midiNotes)) {
        // part of the right chord is one still being formed — e.g. the left-hand root
        // and the first notes of a rolled right hand — not a wrong answer
        if (finalizeIncorrect) answeredRef.current = true;
        reportIncorrect(midiNotes);
      }
    };

    if (debounceMs > 0) {
      // Only a change of notes (or target) restarts the wait. A revalidation tick (e.g. a
      // timer that updates every frame) must not: it would keep pushing the check back
      // forever, and a correct chord would never register.
      const key = `${String(questionKey)}|${targetChordName}|${midiNotes.join(",")}`;
      if (debounceRef.current && pendingKeyRef.current === key) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      pendingKeyRef.current = key;
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        pendingKeyRef.current = null;
        if (enabledRef.current && !answeredRef.current) check();
      }, debounceMs);
      return;
    }
    check();
  }, [
    midiNotes,
    targetChordName,
    questionKey,
    enabled,
    debounceMs,
    cooldownMs,
    minNotesToCheck,
    finalizeIncorrect,
    revalidateKey,
    rivals,
  ]);

  const reset = useCallback(() => {
    answeredRef.current = false;
    lastChangeRef.current = 0;
  }, []);

  return { reset };
}
