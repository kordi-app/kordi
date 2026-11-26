"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActiveNote } from "@/entities/note";
import {
  ADVENTURE_DEATH_MS,
  ADVENTURE_HURT_MS,
  ADVENTURE_INTRO_MS,
  ADVENTURE_LIVES,
  ADVENTURE_MISS_COOLDOWN_MS,
  ADVENTURE_VICTORY_MS,
  BOSS_STEP_GRACE_MS,
  BOSS_CHORDS,
  BOSS_TIME_FACTOR,
  adventureQueries,
  gradeFor,
  isBossStage,
  missPenaltyFor,
  pickDifficulty,
  sceneFor,
  scoreFor,
  timeLimitFor,
  warmUpBossProgression,
  warmUpChordsFor,
  type AdventureClock,
  type AdventureRecordResult,
  type AdventureView,
} from "@/entities/chord-adventure";
import type { QuizChordItem } from "@/entities/chord-quiz";
import { useChordCheck } from "@/shared/lib/music/use-chord-check";
import { saveAdventureRecord, startAdventureRun } from "../api/save-adventure-record";
import { ChordDeck } from "./chord-deck";

const READY: AdventureView = {
  phase: "ready",
  stage: 1,
  scene: sceneFor(1),
  chord: null,
  boss: null,
  defeated: 0,
  score: 0,
  combo: 0,
  lives: ADVENTURE_LIVES,
};
/** Held keys are ignored this long after a new chord appears (so the last answer doesn't count twice). */
const CHECK_COOLDOWN_MS = 600;
/** Give up waiting for chords after this many empty draws (~10 s). */
const MAX_EMPTY_DRAWS = 20;

export type AdventureProblem = "chords" | "save";

/**
 * Chord Adventure's flow: ready → (load chords) → intro → playing ⇄ victory,
 * playing → hurt → playing (a life lost), and finally dying → over. The
 * player's only input is the piano: the right chord beats the monster (a boss
 * takes its whole progression); a wrong one lets it lunge closer (time lost)
 * and breaks the combo; running out of time costs a life, and the last one
 * ends the run. Phase changes are React state (they change the screen);
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
  const clock = useRef<AdventureClock>({
    phaseStartedAt: 0,
    limitMs: 1,
    penaltyMs: 0,
    lastMissAt: -Infinity,
    lastAnswerUsed: 0,
    lastGain: 0,
    lastBossHitAt: -Infinity,
  });
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

  /** Change what's on screen without touching the clock (combo lost, a boss's next chord). */
  const show = useCallback((next: AdventureView) => {
    viewRef.current = next;
    setView(next);
  }, []);

  /** Move to a new phase: its clock starts now. */
  const commit = useCallback(
    (next: AdventureView) => {
      clock.current.phaseStartedAt = performance.now();
      show(next);
    },
    [show],
  );

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

  /** A new chord is up: check again once its cooldown ends, so one already held still counts. */
  const revalidateAfterCooldown = useCallback(() => schedule(() => setCheckTick((n) => n + 1), CHECK_COOLDOWN_MS + 20), [schedule]);

  /** One chord for the nth monster: the warm-up's, or the server's at a difficulty that fits the stage. */
  const drawChord = useCallback((stage: number): QuizChordItem | null => {
    const warmUp = warmUpChordsFor(stage);
    return warmUp ? (deck.current?.drawFrom(warmUp) ?? null) : (deck.current?.draw(pickDifficulty(stage, Math.random())) ?? null);
  }, []);

  /**
   * The nth monster's chords: one, or a boss's whole progression (a common one
   * in a white key during the warm-up, otherwise drawn like any chords). Null
   * while the deck is refilling.
   */
  const drawChords = useCallback(
    (stage: number): QuizChordItem[] | null => {
      if (!isBossStage(stage)) {
        const chord = drawChord(stage);
        return chord && [chord];
      }
      if (warmUpChordsFor(stage)) return deck.current?.named(warmUpBossProgression(Math.random())) ?? null;
      const chords: QuizChordItem[] = [];
      for (let i = 0; i < BOSS_CHORDS; i++) {
        const chord = drawChord(stage);
        if (!chord) return null;
        chords.push(chord);
      }
      return chords;
    },
    [drawChord],
  );

  /**
   * The nth monster (again, after a life is lost): draw its chord — a boss's
   * whole progression — and start its clock, waiting a moment if the deck is
   * refilling. Score, combo and lives carry over from the view.
   */
  const fight = useCallback(
    function fight(stage: number) {
      const chords = drawChords(stage);
      if (!chords) {
        if (++run.current.emptyDraws > MAX_EMPTY_DRAWS) {
          setProblem("chords");
          commit({ ...READY });
          return;
        }
        schedule(() => fight(stage), 500);
        return;
      }
      run.current.emptyDraws = 0;
      const boss = isBossStage(stage);
      const picked = chords.map((c) => ({ id: c.id, name: c.name }));
      clock.current.limitMs = timeLimitFor(stage) * (boss ? BOSS_TIME_FACTOR : 1);
      clock.current.penaltyMs = 0;
      clock.current.lastMissAt = -Infinity;
      clock.current.lastBossHitAt = -Infinity;
      commit({
        ...viewRef.current,
        phase: "playing",
        stage,
        scene: sceneFor(stage),
        chord: picked[0],
        boss: boss ? { chords: picked, index: 0 } : null,
      });
      revalidateAfterCooldown();
    },
    [commit, schedule, drawChords, revalidateAfterCooldown],
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
    schedule(() => fight(1), ADVENTURE_INTRO_MS);
  }, [isAudioStarted, startAudio, resetSave, commit, queryClient, schedule, fight]);

  const die = useCallback(() => {
    const current = viewRef.current;
    if (current.phase !== "playing") return;
    commit({ ...current, phase: "dying", lives: 0 });
    const id = run.current.id;
    schedule(() => {
      commit({ ...viewRef.current, phase: "over" });
      const runId = run.current.serverId;
      if (!runId) {
        setProblem("save");
        return;
      }
      submit(
        { runId, defeated: current.defeated, score: current.score },
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

  /** Out of time: lose a life and face the same monster with a new chord, or fall if it was the last. */
  const loseLife = useCallback(() => {
    const current = viewRef.current;
    if (current.phase !== "playing") return;
    if (current.lives <= 1) {
      die();
      return;
    }
    commit({ ...current, phase: "hurt", lives: current.lives - 1, combo: 0 });
    schedule(() => fight(current.stage), ADVENTURE_HURT_MS);
  }, [commit, schedule, fight, die]);

  // out of time? (checked often; the penalty from misses moves the deadline closer)
  useEffect(() => {
    if (view.phase !== "playing") return;
    const interval = setInterval(() => {
      const { phaseStartedAt, limitMs, penaltyMs } = clock.current;
      if (performance.now() - phaseStartedAt + penaltyMs >= limitMs) loseLife();
    }, 50);
    return () => clearInterval(interval);
  }, [view.phase, loseLife]);

  const onCorrect = useCallback(() => {
    const current = viewRef.current;
    if (current.phase !== "playing") return;
    const c = clock.current;
    const now = performance.now();
    // a boss short of its last chord: it flinches, and the next chord comes up (same clock)
    if (current.boss && current.boss.index < current.boss.chords.length - 1) {
      const index = current.boss.index + 1;
      c.lastBossHitAt = now;
      show({ ...current, chord: current.boss.chords[index], boss: { ...current.boss, index } });
      revalidateAfterCooldown();
      return;
    }
    c.lastAnswerUsed = Math.min(1, (now - c.phaseStartedAt + c.penaltyMs) / c.limitMs);
    const combo = current.combo + 1;
    const gain = scoreFor(gradeFor(c.lastAnswerUsed), combo, current.boss !== null);
    c.lastGain = gain;
    commit({ ...current, phase: "victory", defeated: current.defeated + 1, score: current.score + gain, combo });
    schedule(() => fight(current.stage + 1), ADVENTURE_VICTORY_MS);
  }, [commit, show, schedule, fight, revalidateAfterCooldown]);

  const onIncorrect = useCallback(() => {
    const current = viewRef.current;
    if (current.phase !== "playing" || !current.chord) return;
    const now = performance.now();
    const c = clock.current;
    if (now - c.lastMissAt < ADVENTURE_MISS_COOLDOWN_MS) return;
    // the hand is still moving between a boss's chords
    if (now - c.lastBossHitAt < BOSS_STEP_GRACE_MS) return;
    c.lastMissAt = now;
    c.penaltyMs += c.limitMs * missPenaltyFor(current.stage);
    if (current.combo > 0) show({ ...current, combo: 0 });
  }, [show]);

  useChordCheck({
    targetChordName: view.phase === "playing" ? (view.chord?.name ?? null) : null,
    // a boss's next chord, or the same monster after a lost life, is a new question
    questionKey: `${view.stage}-${view.boss?.index ?? 0}-${view.lives}`,
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
