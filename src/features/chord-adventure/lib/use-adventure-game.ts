"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActiveNote } from "@/entities/note";
import {
  ADVENTURE_DEATH_MS,
  ADVENTURE_INTRO_MS,
  ADVENTURE_MISS_COOLDOWN_MS,
  ADVENTURE_MISS_PENALTY,
  ADVENTURE_VICTORY_MS,
  adventureQueries,
  pickDifficulty,
  sceneFor,
  timeLimitFor,
  type AdventureClock,
  type AdventureRecordResult,
  type AdventureView,
} from "@/entities/chord-adventure";
import { useChordCheck } from "@/shared/lib/music/use-chord-check";
import { saveAdventureRecord } from "../api/save-adventure-record";
import { ChordDeck } from "./chord-deck";

const READY: AdventureView = { phase: "ready", stage: 1, scene: sceneFor(1), chord: null, defeated: 0 };

/**
 * Chord Adventure's flow: ready → (load chords) → intro → playing ⇄ victory →
 * dying → over. The player's only input is the piano: the right chord beats
 * the monster; a wrong one lets it lunge closer (time lost); running out of
 * time ends the run. Phase changes are React state (they change the screen);
 * the clock the renderer reads every frame is a ref.
 */
export function useAdventureGame({
  activeNotes,
  isAudioStarted,
  startAudio,
}: {
  activeNotes: ActiveNote[];
  isAudioStarted: boolean;
  startAudio: () => void;
}) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<AdventureView>(READY);
  const [result, setResult] = useState<AdventureRecordResult | null>(null);
  const clock = useRef<AdventureClock>({ phaseStartedAt: 0, limitMs: 1, penaltyMs: 0, lastMissAt: -Infinity, lastAnswerUsed: 0 });
  const deck = useRef<ChordDeck | null>(null);
  const runStartedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const viewRef = useRef(view);
  /** `fight`, for retrying itself after a pause (a callback can't name itself before it exists) */
  const retryFight = useRef<(stage: number, defeated: number) => void>(() => {});

  const save = useMutation({
    mutationFn: saveAdventureRecord,
    onSuccess: (saved) => {
      setResult(saved);
      if (saved.saved) void queryClient.invalidateQueries({ queryKey: adventureQueries.rankings().queryKey });
    },
  });
  const { mutate: submit, reset: resetSave } = save;

  const commit = useCallback((next: AdventureView) => {
    viewRef.current = next;
    clock.current.phaseStartedAt = performance.now();
    setView(next);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  /** Next monster: draw its chord and start its clock. */
  const fight = useCallback(
    (stage: number, defeated: number) => {
      const chord = deck.current?.draw(pickDifficulty(stage, Math.random())) ?? null;
      if (!chord) {
        // the deck ran dry (network hiccup): wait for a refill before starting the clock
        timer.current = setTimeout(() => retryFight.current(stage, defeated), 500);
        return;
      }
      clock.current.limitMs = timeLimitFor(stage);
      clock.current.penaltyMs = 0;
      clock.current.lastMissAt = -Infinity;
      commit({ phase: "playing", stage, scene: sceneFor(stage), chord: { id: chord.id, name: chord.name }, defeated });
    },
    [commit],
  );

  useEffect(() => {
    retryFight.current = fight;
  }, [fight]);

  const start = useCallback(async () => {
    if (!isAudioStarted) startAudio();
    clearTimeout(timer.current);
    setResult(null);
    resetSave();
    commit({ ...READY, phase: "loading" });
    deck.current = new ChordDeck(queryClient);
    await deck.current.load();
    runStartedAt.current = performance.now();
    commit({ ...READY, phase: "intro" });
    timer.current = setTimeout(() => fight(1, 0), ADVENTURE_INTRO_MS);
  }, [isAudioStarted, startAudio, resetSave, commit, queryClient, fight]);

  const die = useCallback(() => {
    const current = viewRef.current;
    if (current.phase !== "playing") return;
    commit({ ...current, phase: "dying" });
    timer.current = setTimeout(() => {
      commit({ ...viewRef.current, phase: "over" });
      submit({ defeated: current.defeated, durationMs: Math.round(performance.now() - runStartedAt.current) });
    }, ADVENTURE_DEATH_MS);
  }, [commit, submit]);

  // out of time? (checked often; the penalty from misses moves the deadline closer)
  useEffect(() => {
    if (view.phase !== "playing") return;
    const interval = setInterval(() => {
      const { phaseStartedAt, limitMs, penaltyMs } = clock.current;
      if (performance.now() - phaseStartedAt + penaltyMs >= limitMs) die();
    }, 50);
    return () => clearInterval(interval);
  }, [view.phase, die]);

  const onCorrect = useCallback(() => {
    const current = viewRef.current;
    if (current.phase !== "playing") return;
    const defeated = current.defeated + 1;
    const c = clock.current;
    c.lastAnswerUsed = Math.min(1, (performance.now() - c.phaseStartedAt + c.penaltyMs) / c.limitMs);
    commit({ ...current, phase: "victory", defeated });
    timer.current = setTimeout(() => fight(current.stage + 1, defeated), ADVENTURE_VICTORY_MS);
  }, [commit, fight]);

  const onIncorrect = useCallback(() => {
    if (viewRef.current.phase !== "playing") return;
    const now = performance.now();
    const c = clock.current;
    if (now - c.lastMissAt < ADVENTURE_MISS_COOLDOWN_MS) return;
    c.lastMissAt = now;
    c.penaltyMs += c.limitMs * ADVENTURE_MISS_PENALTY;
  }, []);

  const midiNotes = useMemo(() => activeNotes.map((n) => n.midi), [activeNotes]);
  useChordCheck({
    targetChordName: view.phase === "playing" ? (view.chord?.name ?? null) : null,
    midiNotes,
    enabled: view.phase === "playing",
    minNotesToCheck: 2,
    debounceMs: 150,
    // a wrong chord doesn't end the fight: try again (the monster lunges in, see onIncorrect)
    finalizeIncorrect: false,
    onCorrect,
    onIncorrect,
  });

  return { view, clock, start, result, saving: save.isPending, saveFailed: save.isError };
}
