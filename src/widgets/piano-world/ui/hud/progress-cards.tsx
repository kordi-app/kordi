"use client";

import { useEffect, useState, type ReactNode } from "react";
import { midiToNoteName } from "@/shared/lib/music";
import { GOAL_INDEX } from "../../model/course";
import { formatTime, type CourseRun } from "../../model/course-record";
import type { PianoWorldCopy } from "../../model/copy";
import type { Melody } from "../../model/melodies";
import type { MelodyProgress } from "../../lib/use-melody-game";

/** Shared shape: title + value on top, a progress bar, a hint line. */
function ProgressCard({
  title,
  value,
  ratio,
  barClass,
  hint,
}: {
  title: ReactNode;
  value: ReactNode;
  ratio: number;
  barClass: string;
  hint: ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-5 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-border bg-card/90 px-4 py-3 shadow-sm md:top-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <div className="shrink-0">{value}</div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${barClass}`}
          style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function MelodyCard({
  melody,
  progress,
  copy,
}: {
  melody: Melody;
  progress: MelodyProgress;
  copy: PianoWorldCopy;
}) {
  const total = melody.notes.length;
  const next = progress.done ? null : melody.notes[progress.step];
  return (
    <ProgressCard
      title={copy.melodies[melody.key]}
      value={
        <span className="text-xs tabular-nums text-muted-foreground">
          {progress.done ? copy.melodyDone : `${progress.step} / ${total}`}
        </span>
      }
      ratio={progress.step / total}
      barClass="bg-warning"
      hint={
        next !== null
          ? `${copy.melodyNext} ${midiToNoteName(next)} · ${copy.melodyHint}`
          : copy.melodyNextSong
      }
    />
  );
}

export function CourseCard({ run, copy }: { run: CourseRun; copy: PianoWorldCopy }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (run.startedAt === null) return;
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, [run.startedAt]);

  const elapsed = run.startedAt !== null ? now - run.startedAt : (run.finishedMs ?? 0);
  const justFinished = run.finishedMs !== null && run.startedAt === null;

  return (
    <ProgressCard
      title={justFinished ? copy.courseDone : copy.courseTitle}
      value={<span className="text-lg font-semibold tabular-nums text-foreground">{formatTime(elapsed)}</span>}
      ratio={run.reached / GOAL_INDEX}
      barClass="bg-[#8f7cff]"
      hint={run.best !== null ? `${copy.courseBest} ${formatTime(run.best)}` : copy.courseHint}
    />
  );
}
