"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { rankingQueries } from "@/entities/ranking";
import { midiToNoteName } from "@/shared/lib/music";
import { COURSES } from "../../model/course";
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
  footer,
}: {
  title: ReactNode;
  value: ReactNode;
  ratio: number;
  barClass: string;
  hint: ReactNode;
  footer?: ReactNode;
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
      {footer}
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

/** Fill a "{rank}" template. */
const withRank = (template: string, rank: number) => template.replace("{rank}", String(rank));

/** All-time top three, and where the run you just finished landed. */
function CourseRanking({ run, isGuest, copy }: { run: CourseRun; isGuest: boolean; copy: PianoWorldCopy }) {
  const { data: top } = useQuery(rankingQueries.course(run.course));
  const server = run.startedAt === null ? run.server : null;
  const result = server
    ? server.saved
      ? withRank(copy.courseRankSaved, server.rank)
      : isGuest
        ? withRank(copy.courseRankGuest, server.rank)
        : withRank(copy.courseRankMember, server.rank)
    : null;
  return (
    <div className="mt-2 border-t border-border pt-2">
      {result ? <p className="mb-1.5 text-xs font-medium text-foreground">{result}</p> : null}
      <p className="text-t1 font-medium text-muted-foreground">{copy.courseRankingTitle}</p>
      {top && top.length > 0 ? (
        <ol className="mt-1 space-y-0.5">
          {top.slice(0, 3).map((entry) => (
            <li key={entry.rank} className="flex items-baseline gap-2 text-xs text-foreground">
              <span className="w-3 tabular-nums text-muted-foreground">{entry.rank}</span>
              <span className="min-w-0 flex-1 truncate">{entry.nickname}</span>
              <span className="tabular-nums">{formatTime(entry.timeMs)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{copy.courseRankingEmpty}</p>
      )}
    </div>
  );
}

export function CourseCard({ run, isGuest, copy }: { run: CourseRun; isGuest: boolean; copy: PianoWorldCopy }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (run.startedAt === null) return;
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, [run.startedAt]);

  // `now` only ticks during a run: right after a start it can still predate it
  const elapsed = run.startedAt !== null ? Math.max(0, now - run.startedAt) : (run.finishedMs ?? 0);
  const justFinished = run.finishedMs !== null && run.startedAt === null;
  const night = run.course === "night";

  return (
    <ProgressCard
      title={justFinished ? copy.courseDone : night ? copy.nightTitle : copy.courseTitle}
      value={<span className="text-lg font-semibold tabular-nums text-foreground">{formatTime(elapsed)}</span>}
      ratio={run.reached / COURSES[run.course].goalIndex}
      barClass={night ? "bg-palette-yellow-300" : "bg-palette-purple-500"}
      hint={run.best !== null ? `${copy.courseBest} ${formatTime(run.best)}` : night ? copy.nightHint : copy.courseHint}
      footer={<CourseRanking run={run} isGuest={isGuest} copy={copy} />}
    />
  );
}
