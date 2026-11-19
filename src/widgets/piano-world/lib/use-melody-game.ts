"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MELODIES } from "../model/melodies";

const NEXT_SONG_DELAY_MS = 2800;

export interface MelodyProgress {
  song: number;
  step: number;
  done: boolean;
}

/**
 * The Grand Hall's follow-the-path game: step on the songs' notes in order.
 * Wrong notes are simply ignored; finishing celebrates and queues the next tune.
 */
export function useMelodyGame(onComplete: () => void) {
  const [progress, setProgress] = useState<MelodyProgress>({ song: 0, step: 0, done: false });
  const progressRef = useRef(progress);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const update = useCallback((next: MelodyProgress) => {
    progressRef.current = next;
    setProgress(next);
  }, []);

  const advance = useCallback(
    (midi: number) => {
      const current = progressRef.current;
      const notes = MELODIES[current.song].notes;
      if (current.done || notes[current.step] !== midi) return;
      const step = current.step + 1;
      if (step < notes.length) {
        update({ ...current, step });
        return;
      }
      update({ ...current, step, done: true });
      onComplete();
      timer.current = setTimeout(
        () => update({ song: (current.song + 1) % MELODIES.length, step: 0, done: false }),
        NEXT_SONG_DELAY_MS,
      );
    },
    [onComplete, update],
  );

  const melody = MELODIES[progress.song];
  return {
    progress,
    melody,
    /** the key to step on next; null between songs */
    target: progress.done ? null : melody.notes[progress.step],
    advance,
  };
}
