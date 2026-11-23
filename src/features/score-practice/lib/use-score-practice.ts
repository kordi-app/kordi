"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import type { ActiveNote } from "@/entities/note";
import type { ScoreTimeline } from "@/entities/score";
import { playNoteAt } from "@/shared/lib/audio";
import {
  PracticeEngine,
  type Hands,
  type PracticeMode,
  type PracticePosition,
  type PracticeView,
} from "../model/engine";

const IDLE: PracticeView = { status: "idle", cursor: 0, expected: [], stats: { hits: 0, misses: 0, wrong: 0 } };
const ACCOMPANIMENT_VELOCITY = 0.5;

const sameView = (a: PracticeView, b: PracticeView) =>
  a.status === b.status &&
  a.cursor === b.cursor &&
  a.stats.hits === b.stats.hits &&
  a.stats.misses === b.stats.misses &&
  a.stats.wrong === b.stats.wrong &&
  a.expected.join() === b.expected.join();

/**
 * Score practice: drives a PracticeEngine from the animation frame and feeds
 * it the keys you press. Changing the mode, hands or speed pauses (so the
 * engine never switches rules mid-phrase).
 */
export function useScorePractice(timeline: ScoreTimeline | null, activeNotes: ActiveNote[]) {
  const [mode, setModeState] = useState<PracticeMode>("wait");
  const [hands, setHandsState] = useState<Hands>("right");
  const [speed, setSpeedState] = useState(0.75);
  /** the view, tagged with the score it belongs to (a new score starts from IDLE) */
  const [state, setState] = useState<{ owner: ScoreTimeline | null; view: PracticeView }>({ owner: timeline, view: IDLE });
  const view = state.owner === timeline ? state.view : IDLE;
  const engine = useRef<PracticeEngine | null>(null);
  const owner = useRef(timeline);
  const viewRef = useRef(IDLE);
  const frame = useRef(0);
  const held = useRef(new Set<number>());

  const publish = useCallback((next: PracticeView) => {
    if (sameView(viewRef.current, next)) return;
    viewRef.current = next;
    setState({ owner: owner.current, view: next });
  }, []);

  // a new score: a new engine, back to the top
  useEffect(() => {
    cancelAnimationFrame(frame.current);
    engine.current = timeline
      ? new PracticeEngine(timeline, (midi, time, duration) => playNoteAt(midi, ACCOMPANIMENT_VELOCITY, time, duration))
      : null;
    owner.current = timeline;
    viewRef.current = IDLE;
    return () => {
      cancelAnimationFrame(frame.current);
      engine.current?.stop();
    };
  }, [timeline]);

  /** Tick the engine every frame while it runs. */
  const run = useCallback(() => {
    const step = () => {
      const e = engine.current;
      if (!e) return;
      publish(e.tick(Tone.now()));
      if (e.isRunning) frame.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(step);
  }, [publish]);

  const play = useCallback(() => {
    const e = engine.current;
    if (!e || e.isRunning) return;
    const now = Tone.now();
    e.configure({ mode, hands, speed }, now);
    const from = viewRef.current.status === "finished" ? 0 : viewRef.current.cursor;
    e.start(from, now);
    run();
  }, [mode, hands, speed, run]);

  const pause = useCallback(() => {
    engine.current?.stop();
    cancelAnimationFrame(frame.current);
    publish({ ...viewRef.current, status: "idle" });
  }, [publish]);

  const restart = useCallback(() => {
    engine.current?.reset();
    cancelAnimationFrame(frame.current);
    publish(IDLE);
  }, [publish]);

  const setMode = useCallback((m: PracticeMode) => { pause(); setModeState(m); }, [pause]);
  const setHands = useCallback((h: Hands) => { pause(); setHandsState(h); }, [pause]);
  const setSpeed = useCallback((s: number) => { pause(); setSpeedState(s); }, [pause]);

  // keys that just went down are presses (held keys aren't pressed again)
  useEffect(() => {
    const now = Tone.now();
    const current = new Set(activeNotes.map((n) => n.midi));
    for (const midi of current) if (!held.current.has(midi)) engine.current?.press(midi, now);
    held.current = current;
  }, [activeNotes]);

  /** Jump to a cursor step (a click on the sheet). */
  const seek = useCallback(
    (index: number) => {
      const e = engine.current;
      if (!e) return;
      const now = Tone.now();
      e.seek(index, now);
      publish(e.isRunning ? e.tick(now) : { ...viewRef.current, status: "idle", cursor: index, expected: [] });
    },
    [publish],
  );

  /** The playhead's exact place, read every frame by the sheet (null when stopped). */
  const getPosition = useCallback((): PracticePosition | null => {
    const e = engine.current;
    return e?.isRunning ? e.position(Tone.now()) : null;
  }, []);

  return { mode, setMode, hands, setHands, speed, setSpeed, view, play, pause, restart, seek, getPosition };
}
