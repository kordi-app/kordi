"use client";

import { useCallback, useRef } from "react";
import type { ActiveNote } from "@/entities/note";
import type { DrillSettings } from "@/entities/chord-practice";
import { useDrillState } from "../model/use-drill-state";
import { useMetronome } from "./use-metronome";
import { useChordGenerator } from "./use-chord-generator";
import { useChordValidator } from "./use-chord-validator";
import { useDrillHint } from "./use-drill-hint";

export function useDrillGame(
  settings: DrillSettings,
  activeNotes: ActiveNote[]
) {
  const isPractice = settings.gameMode === "practice";

  const {
    state,
    start: startDrill,
    stop: stopDrill,
    pause: pauseDrill,
    resume: resumeDrill,
    markCorrect,
    markIncorrect,
    markTimeout,
  } = useDrillState();

  // poolTypes: the chord types in play — a voicing that makes another of them answers that one
  const { generateNext, restart, types: poolTypes } = useChordGenerator(settings);
  const barCountRef = useRef(0);
  // Bar at which the current chord appeared — early correct answers move this
  // anchor so the next chord gets its full barsPerChord instead of inheriting
  // the previous chord's grid position (which skipped it via a false timeout)
  const chordStartBarRef = useRef(0);

  const handleBarComplete = useCallback(
    (barCount: number) => {
      if (state.status !== "playing") return;
      if (isPractice) return; // No timeout in practice mode

      barCountRef.current = barCount;
      if (settings.waitForMe) return; // the metronome keeps time, the chord waits to be played
      if (barCount - chordStartBarRef.current >= settings.barsPerChord) {
        chordStartBarRef.current = barCount;
        const next = generateNext(state.nextChord?.name ?? null);
        markTimeout({ ...next });
      }
    },
    [state.status, state.nextChord, settings.barsPerChord, settings.waitForMe, isPractice, generateNext, markTimeout]
  );

  const metronome = useMetronome({
    bpm: settings.bpm,
    timeSignature: settings.timeSignature,
    audioEnabled: !isPractice && settings.metronomeAudioEnabled,
    onBarComplete: handleBarComplete,
  });

  const handleCorrect = useCallback(() => {
    chordStartBarRef.current = barCountRef.current;
    const next = generateNext(state.nextChord?.name ?? null);
    markCorrect({ ...next });
  }, [generateNext, state.nextChord, markCorrect]);

  const { hint, reveal: revealHint, clear: clearHint } = useDrillHint({
    chordName: state.currentChord?.name ?? null,
    questionKey: state.totalAttempted,
    active: state.status === "playing",
    enabled: settings.showHints,
  });

  // a wrong chord breaks the streak and counts against accuracy, but stays on the same
  // question — now with its tones shown, if hints are on
  const handleIncorrect = useCallback(() => {
    markIncorrect();
    revealHint();
  }, [markIncorrect, revealHint]);

  const { feedbackState } = useChordValidator({
    activeNotes,
    targetChordName: state.currentChord?.name ?? null,
    questionKey: state.totalAttempted,
    rivals: poolTypes,
    enabled: state.status === "playing",
    onCorrect: handleCorrect,
    onIncorrect: handleIncorrect,
  });

  const start = useCallback(() => {
    restart();
    clearHint();
    const first = generateNext(null);
    const second = generateNext(first.name);
    startDrill({ ...first }, { ...second });
    barCountRef.current = 0;
    chordStartBarRef.current = 0;
    if (!isPractice) {
      metronome.start();
    }
  }, [restart, clearHint, generateNext, startDrill, metronome, isPractice]);

  const stop = useCallback(() => {
    metronome.stop();
    stopDrill();
  }, [metronome, stopDrill]);

  const pause = useCallback(() => {
    metronome.stop();
    pauseDrill();
  }, [metronome, pauseDrill]);

  const resume = useCallback(() => {
    // the metronome counts bars from 0 again: the current chord's bars start over with it
    barCountRef.current = 0;
    chordStartBarRef.current = 0;
    if (!isPractice) {
      metronome.start();
    }
    resumeDrill();
  }, [metronome, resumeDrill, isPractice]);

  return {
    state,
    feedbackState,
    /** the current chord's tones, while a hint is showing */
    hint,
    metronome: {
      currentBeat: metronome.currentBeat,
      beatsPerBar: metronome.beatsPerBar,
      isPlaying: metronome.isPlaying,
    },
    start,
    stop,
    pause,
    resume,
  };
}
