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
import { isPartialChord } from "@/shared/lib/music";
import { useChordCheck } from "@/shared/lib/music/use-chord-check";
import { saveAdventureRecord, startAdventureRun } from "../api/save-adventure-record";
import { ChordDeck } from "./chord-deck";

const READY: AdventureView = { phase: "ready", stage: 1, scene: sceneFor(1), chord: null, defeated: 0 };
/** Held keys are ignored this long after a new chord appears (so the last answer doesn't count twice). */
const CHECK_COOLDOWN_MS = 600;
/** Give up waiting for chords after this many empty draws (~10 s). */
const MAX_EMPTY_DRAWS = 20;

export type AdventureProblem = "chords" | "save";

/**
 * Chord Adventure's flow: ready → (load chords) → intro → playing ⇄ victory →
 * dying → over. The player's only input is the piano: the right chord beats
 * the monster; a wrong one lets it lunge closer (time lost); running out of
 * time ends the run. Phase changes are React state (they change the screen);
 * the clock the renderer reads every frame is a ref.
 *
 * Every timer belongs to a run: starting again, or leaving the page, retires
 * the old run, so its pending timers and late responses do nothing.
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
  const [problem, setProblem] = useState<AdventureProblem | null>(null);
  /** bumped when the check cooldown ends, so a chord held through it still counts */
  const [checkTick, setCheckTick] = useState(0);
  const clock = useRef<AdventureClock>({ phaseStartedAt: 0, limitMs: 1, penaltyMs: 0, lastMissAt: -Infinity, lastAnswerUsed: 0 });
  const deck = useRef<ChordDeck | null>(null);
  const viewRef = useRef(view);
  const run = useRef({ id: 0, serverId: null as string | null, emptyDraws: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const midiNotes = useMemo(() => activeNotes.map((n) => n.midi), [activeNotes]);
  const notesRef = useRef(midiNotes);

  useEffect(() => {
    notesRef.current = midiNotes;
  }, [midiNotes]);

  const save = useMutation({ mutationFn: saveAdventureRecord });
  const { mutate: submit, reset: resetSave } = save;

  const commit = useCallback((next: AdventureView) => {
    viewRef.current = next;
    clock.current.phaseStartedAt = performance.now();
    setView(next);
  }, []);

  /** Run `fn` after `ms`, only if this is still the same run (replaces any pending step). */
  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = run.current.id;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (run.current.id === id) fn();
    }, ms);
  }, []);

  // leaving the page retires the run
  useEffect(
    () => () => {
      run.current.id += 1;
      clearTimeout(timer.current);
    },
    [],
  );

  /** Next monster: draw its chord and start its clock (waiting a moment if the deck is refilling). */
  const fight = useCallback(
    function fight(stage: number, defeated: number) {
      const chord = deck.current?.draw(pickDifficulty(stage, Math.random())) ?? null;
      if (!chord) {
        if (++run.current.emptyDraws > MAX_EMPTY_DRAWS) {
          setProblem("chords");
          commit({ ...READY });
          return;
        }
        schedule(() => fight(stage, defeated), 500);
        return;
      }
      run.current.emptyDraws = 0;
      clock.current.limitMs = timeLimitFor(stage);
      clock.current.penaltyMs = 0;
      clock.current.lastMissAt = -Infinity;
      commit({ phase: "playing", stage, scene: sceneFor(stage), chord: { id: chord.id, name: chord.name }, defeated });
      schedule(() => setCheckTick((n) => n + 1), CHECK_COOLDOWN_MS + 20);
    },
    [commit, schedule],
  );

  const start = useCallback(async () => {
    if (!isAudioStarted) startAudio();
    const id = ++run.current.id;
    clearTimeout(timer.current);
    run.current.serverId = null;
    run.current.emptyDraws = 0;
    setResult(null);
    setProblem(null);
    resetSave();
    commit({ ...READY, phase: "loading" });
    deck.current = new ChordDeck(queryClient);
    const [, started] = await Promise.all([deck.current.load(), startAdventureRun().catch(() => null)]);
    if (run.current.id !== id) return; // restarted or left while loading
    if (deck.current.isEmpty) {
      setProblem("chords");
      commit({ ...READY });
      return;
    }
    run.current.serverId = started?.runId ?? null;
    commit({ ...READY, phase: "intro" });
    schedule(() => fight(1, 0), ADVENTURE_INTRO_MS);
  }, [isAudioStarted, startAudio, resetSave, commit, queryClient, schedule, fight]);

  const die = useCallback(() => {
    const current = viewRef.current;
    if (current.phase !== "playing") return;
    commit({ ...current, phase: "dying" });
    const id = run.current.id;
    schedule(() => {
      commit({ ...viewRef.current, phase: "over" });
      const runId = run.current.serverId;
      if (!runId) {
        setProblem("save");
        return;
      }
      submit(
        { runId, defeated: current.defeated },
        {
          onSuccess: (saved) => {
            if (run.current.id !== id) return; // a newer run started meanwhile
            setResult(saved);
            if (saved.saved) void queryClient.invalidateQueries({ queryKey: adventureQueries.rankings().queryKey });
          },
          onError: () => {
            if (run.current.id === id) setProblem("save");
          },
        },
      );
    }, ADVENTURE_DEATH_MS);
  }, [commit, schedule, submit, queryClient]);

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
    schedule(() => fight(current.stage + 1, defeated), ADVENTURE_VICTORY_MS);
  }, [commit, schedule, fight]);

  const onIncorrect = useCallback(() => {
    const current = viewRef.current;
    if (current.phase !== "playing" || !current.chord) return;
    // part of the right chord is a chord still being formed (or let go), not a wrong one
    if (isPartialChord(current.chord.name, notesRef.current)) return;
    const now = performance.now();
    const c = clock.current;
    if (now - c.lastMissAt < ADVENTURE_MISS_COOLDOWN_MS) return;
    c.lastMissAt = now;
    c.penaltyMs += c.limitMs * ADVENTURE_MISS_PENALTY;
  }, []);

  useChordCheck({
    targetChordName: view.phase === "playing" ? (view.chord?.name ?? null) : null,
    questionKey: view.stage,
    midiNotes,
    enabled: view.phase === "playing",
    minNotesToCheck: 2,
    debounceMs: 150,
    cooldownMs: CHECK_COOLDOWN_MS,
    // a wrong chord doesn't end the fight: try again (the monster lunges in, see onIncorrect)
    finalizeIncorrect: false,
    revalidateKey: checkTick,
    onCorrect,
    onIncorrect,
  });

  return { view, clock, start, result, problem, saving: save.isPending };
}
